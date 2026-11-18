#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
render.py — сборка звука L001 по монтажному листу: голос + музыка + эффекты + подложки -> стемы и мастер.

  python sound/render.py --name ch0_1 [--t0 0] [--t1 72.87 | --frames film/out/ch0_1.frames.json] [--video film/out/ch0_1.mp4]
  (запуск из production/L001; питон — C:/dev/tools/sound-venv: numpy, scipy, soundfile, pyloudnorm, pedalboard)

Входы: sound/cues.json (node sound/cues.mjs), animatic/timing.json (вставки пауз в голос), animatic/words.json (где говорят),
out/voice_fish_en.mp3 (голос), sound/palette_rec.json (какие записи заменяют синтез), sound/music_plan.json (музыка).
Выход: sound/out/<name>/{voice,music,sfx,amb,mix}.wav (48 кГц, 24 бит, стерео) + report.json; с --video — <video>_sound.mp4.

Микс (числа — в MIX ниже, обоснование — wiki/craft/sound-design-longform.md):
  голос: срез ниже 80 Гц, мягкая компрессия, −16 LUFS до мастера (сухой, без реверберации);
  музыка: по громкости = голос, под речью −20 дБ (+ ещё −3 дБ в полосе 1–4 кГц), в паузах −11 дБ; опускание начинается
          за 120 мс ДО фразы (взгляд вперёд по словам), подъём 0.45 с;
  эффекты: уровень класса относительно голоса (пик 50 мс), под речью −3 дБ, кроме «главных» (штамп, стинги, дзынь…);
          реверберация места действия только у звуков мира (фоли), графика и переходы — сухие;
  подложки: по месту, смена на склейке с перекрытием 80 мс, никогда не тише −60 дБ (цифровой тишины нет);
  мастер: −14 LUFS, true peak ≤ −1 dBTP (лимитер с 4-кратной передискретизацией и взглядом вперёд 2 мс).
"""
import argparse, hashlib, json, os, subprocess, sys
from pathlib import Path
import numpy as np
from scipy import signal
import soundfile as sf
import pyloudnorm as pyln
from pedalboard import Pedalboard, Reverb, HighpassFilter, Compressor, LowpassFilter

HERE = Path(__file__).resolve().parent
L = HERE.parent
sys.path.insert(0, str(HERE))
import synth  # noqa: E402

SR = 48000
METER = pyln.Meter(SR)

MIX = {
    'voice_lufs': -16.0,
    'music_speech_db': -20.0, 'music_pause_db': -12.0, 'music_carve_db': -3.0,
    'music_attack': .08, 'music_release': .35, 'music_lookahead': .12,
    'sfx_duck_db': -4.0, 'sfx_trim_db': -4.0, 'amb_duck_db': -1.5, 'amb_trim_db': 4.0, 'peak_cap_db': 11.0,
    'target_lufs': -14.0, 'ceiling_dbtp': -1.0,
    'amb_floor_db': -60.0, 'bed_xfade': .08,
}

# уровень класса: пик 50-мс RMS (для span — средний RMS) относительно медианного уровня голоса в речи (дБ)
# bus: sfx | amb; dieg: True — звук мира (получает реверберацию места); feat: не приглушается голосом; vary: случайная высота ±
LEVEL = {
    # переходы и камера
    'whoosh.whip': -8, 'whoosh.wipe': -9, 'whoosh.air': -12, 'whoosh.zoomin': -9, 'whoosh.photo': -12, 'whoosh.speed': -10,
    'whoosh.small': -14, 'whoosh.cut': -15, 'whoosh.through': -8, 'body.pass': -14,
    'hit.punch': -9, 'riser.white': -10, 'hit.bloom': -8, 'flash.pop': -10, 'tape.rewind': -8, 'hit.card': -8, 'hit.soft': -12,
    'snap': -13, 'snap.soft': -16, 'air.move': -26, 'hit.kick': -10, 'hit.event': -17,
    # шаблоны и подписи
    'stamp': -6, 'marker.write': -22, 'marker.line': -18, 'marker.hl': -20, 'marker.circle': -20, 'marker.cross': -18,
    'paper.slide': -20, 'paper.place': -14, 'pin.pop': -12, 'map.route': -24, 'plane.by': -16, 'hit.x': -8, 'alarm.hit': -6,
    'string.pull': -18, 'string.taut': -14, 'ticker.run': -16, 'flip.board': -16, 'hit.number': -8, 'ui.slide': -16, 'type.run': -14,
    # титры
    'sting.chapter': -3, 'sting.title': 1, 'riser.title': -6, 'shimmer.sweep': -16, 'hit.reveal': -2, 'riser.tower': -12, 'glint': -20,
    # фоли
    'shutter': -10, 'af.beep': -16, 'photo.drop': -10, 'clip.snap': -14, 'cloth.rustle': -20, 'glasses.tick': -18, 'crate.set': -10,
    'tag.pop': -12, 'tag.slap': -12, 'tag.tick': -16, 'glass.lift': -20, 'glass.clink': -9, 'cloth.slide': -18, 'chip.pulse': -10,
    'chip.glow': -10, 'motor.hum': -24, 'thunder.far': -14, 'tape.reels': -26, 'tape.clack': -20, 'headphone': -18, 'servo': -24,
    'chair.scrape': -18, 'chair.creak': -18, 'case.creak': -18, 'tablet.ping': -14, 'folder.close': -12, 'switch.click': -10,
    'lamp.buzz': -32, 'lamp.flicker': -20, 'box.tap': -9, 'box.pat': -9, 'box.set': -10, 'dust.puff': -24, 'box.lid': -18, 'key.jingle': -14, 'photo.pat': -12,
    'phone.ring': -9, 'phone.pickup': -10, 'water.splash': -12, 'wood.knock': -14, 'knock': -8, 'door.slam': -6, 'door.open': -14,
    'lock.click': -10, 'timer.click': -10, 'pin.push': -14, 'page.turn': -16, 'paper.handle': -18, 'pen.drop': -12, 'drip': -18,
    'cash': -12, 'fax': -16, 'keyboard': -18, 'applause': -10, 'crowd.react': -14, 'crane.clank': -12, 'pour': -16, 'dishes': -14,
}
FEATURED = {'stamp', 'sting.chapter', 'sting.title', 'riser.title', 'hit.reveal', 'glass.clink', 'water.splash', 'hit.punch',
            'door.slam', 'alarm.hit', 'hit.number', 'hit.card', 'shutter'}
NONDIEG = {'snap', 'snap.soft', 'whoosh.cut', 'whoosh.whip', 'whoosh.wipe', 'whoosh.air', 'whoosh.zoomin', 'whoosh.photo', 'whoosh.speed', 'whoosh.through',
           'hit.punch', 'riser.white', 'hit.bloom', 'hit.card', 'hit.soft', 'hit.event', 'hit.kick', 'air.move', 'sting.chapter', 'sting.title',
           'riser.title', 'shimmer.sweep', 'hit.reveal', 'riser.tower', 'glint', 'ui.slide', 'hit.number', 'hit.x', 'alarm.hit', 'pin.pop',
           'ticker.run', 'type.run', 'marker.write', 'marker.line', 'marker.hl', 'marker.circle', 'map.route', 'tape.rewind', 'flash.pop'}
WIDE = {'sting.title', 'sting.chapter', 'hit.reveal', 'hit.card', 'hit.bloom', 'riser.title'}   # широкое стерео: хвост расходится по сторонам (как удар титра у конкурента)
# плотность (--density): full — всё из листа; mid (по умолчанию) — без декоративной «жизни кадра» и без рывков-свистов,
# прижатых к более важному звуку (≈ 50–60 звуков в минуту, только смысловые события); lean — ещё и без переходов-свистов на смене места,
# бликов, мелкого фоли (≈ 45 в минуту). Подложка: full +3 дБ, mid 0, lean −2 (к уровням BEDS).
MID_SKIP = {'cloth.rustle', 'cloth.slide', 'headphone', 'dust.puff', 'glasses.tick', 'glass.lift', 'servo', 'lamp.flicker', 'tape.clack', 'air.move',
            'hit.event', 'tag.tick', 'clip.snap', 'glint', 'body.pass', 'string.taut', 'whoosh.small', 'chair.creak', 'chair.scrape', 'page.turn', 'paper.handle', 'hit.kick'}
AMB_BY_DENSITY = {'full': 3.0, 'mid': 0.0, 'lean': -2.0}
LEAN_SKIP = {'cloth.rustle', 'cloth.slide', 'headphone', 'dust.puff', 'glasses.tick', 'glass.lift', 'servo', 'lamp.buzz', 'lamp.flicker', 'tape.clack',
             'air.move', 'hit.event', 'chair.creak', 'chair.scrape', 'tag.tick', 'clip.snap', 'whoosh.cut', 'glint', 'motor.hum', 'box.lid', 'af.beep',
             'thunder.far', 'whoosh.small', 'body.pass', 'string.taut', 'riser.tower', 'ui.slide', 'type.run'}
VARY = {'snap', 'snap.soft', 'whoosh.cut', 'whoosh.whip', 'whoosh.air', 'whoosh.small', 'photo.drop', 'tag.pop', 'paper.place', 'hit.event', 'box.tap',
        'pin.pop', 'crate.set', 'stamp', 'shutter', 'key.jingle'}

# реверберация места для звуков мира: room_size, damping, wet
ROOM = {'restaurant': (.45, .5, .14), 'car': (.1, .8, .04), 'street': (.3, .3, .08), 'office': (.35, .5, .12), 'city': (.8, .4, .10),
        'warehouse': (.85, .3, .22), 'washington': (.6, .5, .14), 'dorm': (.3, .6, .10), 'bathroom': (.55, .1, .25), 'kentucky_ext': (.2, .4, .05),
        'title': (.5, .5, .1), 'room': (.3, .5, .1), 'beijing': (.45, .5, .12), 'nvidia': (.45, .5, .12), 'diner': (.4, .5, .12), 'dishpit': (.35, .3, .15),
        'megaspeed': (.35, .5, .12), 'bar': (.45, .5, .14), 'hall': (.8, .4, .2), 'port': (.3, .3, .08), 'newsroom': (.45, .5, .12), 'night_ext': (.2, .4, .05),
        'porch': (.2, .4, .05), 'closed_room': (.3, .6, .1), 'trading': (.45, .5, .12), 'datacenter': (.75, .3, .2), 'kitchen': (.4, .3, .15),
        'factory': (.8, .3, .2), 'corridor': (.6, .4, .18)}

# подложки: слои [(источник, уровень дБ к голосу)]; источник 'rec:<класс подложки>' (palette_rec.json) или 'syn:<генератор>'
BEDS = {
    'restaurant': [('rec:amb.restaurant', -29), ('rec:amb.cutlery', -36), ('rec:amb.rain_window', -33), ('syn:room', -42)],
    'street': [('rec:amb.rain_street', -24), ('rec:amb.wet_tyres', -30), ('syn:room', -44)],
    'car': [('rec:amb.rain_car', -27), ('syn:room', -42)],
    'office': [('rec:amb.office_tone', -36), ('rec:amb.clock', -33), ('rec:amb.rain_window', -40)],
    'city': [('rec:amb.wet_tyres', -34), ('syn:wind', -32)],
    'warehouse': [('rec:amb.warehouse', -30), ('rec:amb.fluor', -40)],
    'washington': [('rec:amb.hvac', -33), ('syn:room', -40), ('rec:amb.clock', -40)],
    'dorm': [('rec:amb.office_tone', -38), ('rec:amb.birds', -38)],
    'bathroom': [('rec:amb.drip', -32), ('syn:room', -38)],
    'kentucky_ext': [('rec:amb.birds', -30), ('syn:wind', -36)],
    'beijing': [('rec:amb.hvac', -36), ('rec:amb.office_tone', -40)],
    'nvidia': [('rec:amb.office_tone', -33), ('rec:amb.hvac', -38)],
    'diner': [('rec:amb.diner', -29), ('syn:room', -42)],
    'dishpit': [('rec:amb.dishpit', -29), ('syn:room', -42)],
    'megaspeed': [('rec:amb.office_tone', -34), ('rec:amb.rain_window', -36)],
    'bar': [('rec:amb.bar', -29), ('syn:room', -42)],
    'hall': [('rec:amb.hall', -27), ('syn:room', -42)],
    'port': [('rec:amb.port', -27), ('rec:amb.rain_street', -32), ('rec:amb.trucks', -36)],
    'newsroom': [('rec:amb.newsroom', -30), ('syn:room', -42)],
    'night_ext': [('rec:amb.night', -31), ('syn:wind', -38)],
    'porch': [('rec:amb.night', -31), ('syn:wind', -38)],
    'closed_room': [('rec:amb.office_tone', -40), ('syn:room', -42)],
    'trading': [('rec:amb.trading', -30), ('syn:room', -42)],
    'datacenter': [('rec:amb.servers', -27), ('syn:hum60', -38)],
    'kitchen': [('rec:amb.dishpit', -32), ('syn:room', -42)],
    'factory': [('rec:amb.warehouse', -28), ('syn:hum60', -36)],
    'corridor': [('rec:amb.hvac', -33), ('syn:room', -40)],
    'title': [('syn:room', -46)],
    'room': [('syn:room', -38)],
}
SYN_BED = {'room': lambda d, s: synth.room_tone(d, s), 'wind': lambda d, s: synth.wind(d, s), 'rain': lambda d, s: synth.rain_synth(d, s),
           'hum60': lambda d, s: synth.hum(d, 60, (1, .4, .3, .1), .2, s), 'hvac': lambda d, s: synth.hum(d, 60, (.3, .2, .1, .05), .8, s)}
# если записи нет — синтетическая замена подложки
REC_FALLBACK = {'amb.rain_window': 'rain', 'amb.rain_street': 'rain', 'amb.rain_car': 'rain', 'amb.hvac': 'hvac', 'amb.warehouse': 'hum60',
                'amb.city_night': 'wind', 'amb.servers': 'hvac', 'amb.office': 'hvac', 'amb.port': 'rain', 'amb.night': 'wind'}   # нет записи и нет замены — слой молчит


def db(x): return 20 * np.log10(np.maximum(x, 1e-12))
def lin(d): return 10 ** (d / 20)


def load_audio(path, sr=SR, mono=False):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-f', 'f32le', '-acodec', 'pcm_f32le', '-ac', '1' if mono else '2', '-ar', str(sr), 'pipe:1'],
                         capture_output=True, check=True).stdout
    x = np.frombuffer(raw, '<f4').astype(np.float32)
    return x if mono else x.reshape(-1, 2)


def rms_win(x, win=.05):
    n = int(win * SR); x2 = x.astype(np.float64) ** 2
    c = np.cumsum(np.r_[0, x2]); r = np.sqrt(np.maximum(c[n:] - c[:-n], 0) / n)
    return r


def to_stereo(m): return np.stack([m, m], axis=1)


def pan_st(m, p0, p1=None):
    p1 = p0 if p1 is None else p1
    p = np.linspace(p0, p1, len(m)) if p1 != p0 else np.full(len(m), p0)
    a = (p + 1) * np.pi / 4
    return np.stack([m * np.cos(a), m * np.sin(a)], axis=1) * np.sqrt(2)


# ---------------- голос на шкале фильма ----------------
def voice_track(timing, voice_path, t0, t1):
    v = load_audio(voice_path, mono=True)
    parts, prev = [], 0
    for x in timing['inserts']:
        a = int(round(x['at'] * SR)); parts += [v[int(round(prev * SR)):a], np.zeros(int(round(x['dur'] * SR)), np.float32)]; prev = x['at']
    parts.append(v[int(round(prev * SR)):])
    full = np.concatenate(parts)
    n0, n1 = int(round(t0 * SR)), int(round(t1 * SR))
    if len(full) < n1: full = np.r_[full, np.zeros(n1 - len(full), np.float32)]
    return full[n0:n1]


def process_voice(v, gain_db=None):
    """срез 80 Гц, компрессия; уровень — к voice_lufs по этому окну или постоянным gain_db (одним на весь фильм: главы без скачков)"""
    pb = Pedalboard([HighpassFilter(80), Compressor(threshold_db=-24, ratio=2.5, attack_ms=6, release_ms=120)])
    y = pb(v.reshape(1, -1), SR).ravel()
    if gain_db is None: gain_db = MIX['voice_lufs'] - METER.integrated_loudness(to_stereo(y))
    return (y * lin(gain_db)).astype(np.float32)


def speech_mask(words, t0, n, pre=.05, post=.08, bridge=.25):
    m = np.zeros(n, bool)
    iv = sorted((w['s'] - pre - t0, w['e'] + post - t0) for w in words if w['e'] > t0 and w['s'] < t0 + n / SR)
    merged = []
    for a, b in iv:
        if merged and a - merged[-1][1] < bridge: merged[-1][1] = max(merged[-1][1], b)
        else: merged.append([a, b])
    for a, b in merged: m[max(0, int(a * SR)):min(n, int(b * SR))] = True
    return m, merged


def envelope_mask(v, thr_db=-38, pre=.05, post=.1, bridge=.25):
    """речь по огибающей голоса (когда нет слов с таймкодами): RMS 20 мс выше порога относительно медианы речи"""
    r = rms_win(v, .02); ref = np.median(r[r > 1e-4]) if (r > 1e-4).any() else 1e-3
    on = np.r_[r, np.zeros(len(v) - len(r))] > ref * lin(thr_db + 20)
    idx = np.flatnonzero(np.diff(np.r_[0, on.astype(int), 0])); iv = [(a / SR - pre, b / SR + post) for a, b in zip(idx[::2], idx[1::2]) if (b - a) / SR > .04]
    merged = []
    for a, b in iv:
        if merged and a - merged[-1][1] < bridge: merged[-1][1] = max(merged[-1][1], b)
        else: merged.append([a, b])
    m = np.zeros(len(v), bool)
    for a, b in merged: m[max(0, int(a * SR)):min(len(v), int(b * SR))] = True
    return m, merged


def smooth_gain(target_db, attack, release, lookahead):
    """огибающая усиления: опускание начинается за lookahead до речи (target_db уже со сдвигом), подъём медленный"""
    ctrl = 1000; k = SR // ctrl
    tg = target_db[::k].astype(np.float64)
    la = int(lookahead * ctrl)
    if la > 0:   # взгляд вперёд: минимум на [t, t+la]
        tg = np.minimum.reduce([np.r_[tg[i:], np.full(i, tg[-1])] for i in range(0, la + 1, 5)])
    g = np.empty_like(tg); g[0] = tg[0]
    aa, ar = np.exp(-1 / (attack * ctrl)), np.exp(-1 / (release * ctrl))
    for i in range(1, len(tg)):
        c = aa if tg[i] < g[i - 1] else ar
        g[i] = c * g[i - 1] + (1 - c) * tg[i]
    return np.repeat(g, k)[:len(target_db)] if len(np.repeat(g, k)) >= len(target_db) else np.r_[np.repeat(g, k), np.full(len(target_db) - len(g) * k, g[-1])]


# ---------------- звуки ----------------
class Bank:
    def __init__(self, rec_map):
        self.rec = rec_map; self.cache = {}

    def get(self, snd, seed, dur=None, n=None):
        """моно-звук класса: запись (если есть в palette_rec.json) или синтез"""
        key = (snd, seed, round(dur or 0, 3), n)
        if key in self.cache: return self.cache[key]
        src = self.rec.get(snd)
        if snd in ('type.run', 'keyboard') and self.rec.get('type.key' if snd == 'type.run' else 'key.press') and not src:
            keys = self.rec['type.key' if snd == 'type.run' else 'key.press']; r = np.random.default_rng(seed); nk = n or max(3, int((dur or .4) * 12))
            y = np.zeros(int(((dur or .4) + .4) * SR))
            for k in range(nk):   # записанные удары клавиш, расставленные по времени набора
                ks = load_audio(L / keys[int(r.integers(len(keys)))]['path'], mono=True).astype(np.float64)[:int(.35 * SR)]
                o = max(0, int(((dur or .4) * k / max(1, nk - 1) + .01 * r.standard_normal()) * SR)); y[o:o + len(ks)] += ks[:len(y) - o] * (.75 + .25 * r.random())
            y = fade_edges(y, .002, .03); self.cache[key] = y; return y
        if src:
            pick = src[seed % len(src)]
            y = load_audio(L / pick['path'], mono=True).astype(np.float64)
            if pick.get('trim'): a, b = pick['trim']; y = y[int(a * SR):int(b * SR)]
            y = y * lin(pick.get('gain_db', 0))
            if dur and (pick.get('loop') or snd in LOOPABLE) and len(y) < dur * SR: y = np.tile(y, int(np.ceil(dur * SR / len(y))))
            if dur and pick.get('span', True) and len(y) > dur * SR and snd in SPAN_TRIM: y = y[:int(dur * SR)]
        else:
            y = synth.make(snd, seed, dur, n).astype(np.float64)
        if dur and snd in SPAN_TRIM and len(y) > int(dur * SR) + int(.25 * SR): y = y[:int(dur * SR) + int(.25 * SR)]
        y = fade_edges(y, .003, .02)
        self.cache[key] = y
        return y


LOOPABLE = {'lamp.buzz', 'tape.reels', 'motor.hum', 'marker.write', 'map.route', 'keyboard'}   # запись короче нужного — повторяется
SPAN_TRIM = {'cloth.rustle', 'marker.cross', 'marker.write', 'marker.line', 'marker.hl', 'marker.circle', 'map.route', 'paper.slide', 'cloth.slide', 'box.lid', 'tape.reels',
             'motor.hum', 'servo', 'lamp.buzz', 'air.move', 'phone.ring', 'string.pull', 'chair.scrape', 'ticker.run', 'tape.clack', 'type.run', 'keyboard'}


def fade_edges(y, a, b):
    y = y.copy(); na, nb = min(len(y) // 4, int(a * SR)), min(len(y) // 4, int(b * SR))
    if na: y[:na] *= np.linspace(0, 1, na)
    if nb: y[-nb:] *= np.linspace(1, 0, nb)
    return y


def anchor(y, align):
    """сэмпл звука, который ставится на время события"""
    if align in ('span',): return 0
    if align == 'end': return len(y)
    env = np.abs(y);
    if align == 'apex':
        r = rms_win(y, .02); return int(np.argmax(r) + .01 * SR) if len(r) else 0
    thr = .1 * env.max()   # onset: первый сэмпл выше 10 % пика
    i = int(np.argmax(env > thr)); return i


def level_ref(y, span):
    r = rms_win(y, .05)
    if not len(r): return 1e-6
    return float(np.sqrt(np.mean(y ** 2))) if span else float(r.max())


def vary(y, seed):
    r = np.random.default_rng(seed); st = r.uniform(-1.2, 1.2)
    up, down = int(round(1000 * 2 ** (st / 12))), 1000
    g = np.gcd(up, down); return signal.resample_poly(y, down // g, up // g)


def reverb_of(bed):
    rs, dp, wet = ROOM.get(bed, ROOM['room'])
    return Pedalboard([Reverb(room_size=rs, damping=dp, wet_level=wet, dry_level=1.0, width=.8)])


def render_sfx(cues, bank, t0, n, vref, bed_at, mask, density='mid'):
    out = np.zeros((n, 2), np.float32); placed = []
    wide = Pedalboard([Reverb(room_size=.75, damping=.4, wet_level=.2, dry_level=1.0, width=1.0)])
    for c in cues:
        t = c['t'] - t0
        if t < -3 or t > n / SR + .5: continue
        snd = c['snd']
        if density == 'lean' and (snd in LEAN_SKIP or c.get('ducked')): continue
        if density == 'mid' and (snd in MID_SKIP or (c.get('ducked') and snd.startswith('snap'))): continue
        snd = c['snd']; seed = int(hashlib.md5(c['id'].encode()).hexdigest()[:6], 16) % 997 + 1
        y = bank.get(snd, seed % 7 + 1, c.get('dur'), c.get('n'))
        if snd in VARY: y = vary(y, seed)
        span = c.get('align') == 'span'
        lv = LEVEL.get(snd, -14) + c.get('gain', 0) + MIX['sfx_trim_db']
        y = y * (vref * lin(lv) / max(level_ref(y, span), 1e-9))
        pk = float(np.abs(y).max())   # короткий щелчок с тем же RMS даёт огромный пик: пик не выше +peak_cap_db к уровню голоса
        if pk > vref * lin(MIX['peak_cap_db'] + min(0, c.get('gain', 0))): y = y * (vref * lin(MIX['peak_cap_db'] + min(0, c.get('gain', 0))) / pk)
        bed = bed_at(c['t'])
        if snd not in NONDIEG:
            y2 = reverb_of(bed)(np.r_[y, np.zeros(int(.8 * SR))].astype(np.float32).reshape(1, -1), SR).ravel(); y = y2
        a = anchor(y, c.get('align', 'onset'))
        start = int(round(t * SR)) - a
        sw = c.get('sweep')
        if snd in WIDE: st = wide(np.stack([np.r_[y, np.zeros(SR)]] * 2).astype(np.float32), SR).T.astype(np.float64)
        else: st = pan_st(y, sw[0], sw[1]) if sw else pan_st(y, c.get('pan', 0))
        if snd not in FEATURED:   # под речью тише
            seg = mask[max(0, start):max(0, start) + len(y)]
            if seg.any() and start >= 0:
                m = np.zeros(len(st)); m[:len(seg)] = seg[:len(st)]
                k = int(.01 * SR); m = np.convolve(m, np.ones(k) / k, 'same')            # 10 мс сглаживание
                st = st * (1 + (lin(MIX['sfx_duck_db']) - 1) * m)[:, None]
        a0, a1 = max(0, start), min(n, start + len(st))
        if a1 > a0: out[a0:a1] += st[a0 - start:a1 - start].astype(np.float32)
        placed.append({'id': c['id'], 'snd': snd, 't': c['t'], 'sample': start + a, 'anchor_s': a / SR, 'len': len(y) / SR, 'lvl': lv,
                       'src': 'rec' if bank.rec.get(snd) else 'syn'})
    return out, placed


# ---------------- подложки ----------------
def render_amb(beds, rec_map, t0, n, vref, mask):
    out = np.zeros((n, 2), np.float32); cache = {}; xf = MIX['bed_xfade']
    def layer(src, dur, seed):
        kind, name = src.split(':', 1)
        if kind == 'rec' and rec_map.get(name):
            key = name
            if key not in cache:
                pick = rec_map[name][0]; y = load_audio(L / pick['path'], mono=False).astype(np.float64)
                if pick.get('trim'): a, b = pick['trim']; y = y[int(a * SR):int(b * SR)]
                cache[key] = y
            y = cache[key]
        else:
            fb = name if kind == 'syn' else REC_FALLBACK.get(name)
            if not fb: return None
            key = ('syn', fb)
            if key not in cache: cache[key] = to_stereo(SYN_BED[fb](30.0, 11))
            y = cache[key]
        need = int(dur * SR)
        if len(y) < need:   # петля с перекрытием 0.5 с
            o = int(.5 * SR); reps = [y]
            while sum(len(r) for r in reps) - o * (len(reps) - 1) < need: reps.append(y)
            z = reps[0]
            for r in reps[1:]:
                w = np.linspace(0, 1, o)[:, None]; z = np.r_[z[:-o], z[-o:] * (1 - w) + r[:o] * w, r[o:]]
            y = z
        off = (seed * 7919) % max(1, len(y) - need) if len(y) > need else 0
        return y[off:off + need]
    for b in beds:
        a, e = b['start'] - t0 - xf / 2, b['end'] - t0 + xf / 2
        if e < 0 or a > n / SR: continue
        a, e = max(a, 0), min(e, n / SR); dur = e - a
        if dur <= 0: continue
        seg = np.zeros((int(dur * SR), 2))
        for li, (src, lv) in enumerate(BEDS.get(b['bed'], BEDS['room'])):
            y = layer(src, dur, b['shots'][0] * 13 + li)
            if y is None: continue
            r = np.sqrt(np.mean(y ** 2)) + 1e-12
            seg[:len(y)] += y[:len(seg)] * (vref * lin(lv + b.get('gain', 0) + MIX['amb_trim_db']) / r)
        k = min(int(xf * SR), len(seg) // 2)
        if k: w = np.linspace(0, 1, k)[:, None]; seg[:k] *= np.sin(w * np.pi / 2); seg[-k:] *= np.cos(w * np.pi / 2)
        i0 = int(a * SR); out[i0:i0 + len(seg)] += seg[:n - i0].astype(np.float32)
    g = np.where(mask, lin(MIX['amb_duck_db']), 1.0); g = signal.lfilter([.001], [1, -.999], g - 1) + 1
    out *= g[:, None].astype(np.float32)
    floor = vref * lin(MIX['amb_floor_db'] + 20)   # пол: не тише −60 dBFS ориентировочно
    out += to_stereo(synth.room_tone(n / SR + .01, 99)[:n] * floor / .3).astype(np.float32)
    return out


# ---------------- музыка ----------------
def render_music(plan, t0, n, mask, voice_lufs, marks):
    out = np.zeros((n, 2), np.float32); info = []
    for seg in plan.get('segments', []):
        src = load_audio(HERE / seg['file'], mono=False).astype(np.float64)
        a, b = seg['src_in'], seg['src_out']; y = src[int(a * SR):int(b * SR)]
        if seg.get('loop_to') and seg['film_out'] - seg['film_in'] > len(y) / SR:   # дошли до конца петли — повторяем [la, lb] по тактам
            la, lb = seg['loop_to']; body = src[int(la * SR):int(lb * SR)]
            need = int((seg['film_out'] - seg['film_in']) * SR); xo = int(.04 * SR); z = y
            while len(z) < need: w = np.linspace(0, 1, xo)[:, None]; z = np.r_[z[:-xo], z[-xo:] * (1 - w) + body[:xo] * w, body[xo:]]
            y = z[:need]
        y = y[:int((seg['film_out'] - seg['film_in']) * SR)]
        fi, fo = int(seg.get('fade_in', .05) * SR), int(seg.get('fade_out', .3) * SR)
        if fi: y[:fi] *= np.linspace(0, 1, fi)[:, None]
        if fo: y[-fo:] *= np.linspace(1, 0, fo)[:, None]
        Lm = METER.integrated_loudness(y) if len(y) > SR else -30
        y = y * lin(voice_lufs - Lm + seg.get('gain_db', 0))
        i0 = int(round((seg['film_in'] - t0) * SR)); a0 = max(0, i0); j0 = a0 - i0; Lc = min(len(y) - j0, n - a0)   # часть отрезка внутри окна
        if Lc > 0: out[a0:a0 + Lc] += y[j0:j0 + Lc].astype(np.float32)
        info.append({**seg, 'lufs_src': round(Lm, 1)})
    if not plan.get('segments'): return out, info, None
    # сайдчейн: под речью music_speech_db, в паузах music_pause_db; подъёмы в точках плана (стинги)
    tdb = np.where(mask, MIX['music_speech_db'], MIX['music_pause_db']).astype(np.float64)
    for h in plan.get('holds', []):   # участки, где музыка стоит на заданном уровне (титр ролика, стинги, тишина)
        i0, i1 = int((h['t0'] - t0) * SR), int((h['t1'] - t0) * SR); tdb[max(0, i0):max(0, min(n, i1))] = h['db']
    g = smooth_gain(tdb, MIX['music_attack'], MIX['music_release'], MIX['music_lookahead'])
    # вырез 1–4 кГц под речью: полоса музыки гасится ещё на music_carve_db
    sos_lo = signal.butter(4, 1000, 'low', fs=SR, output='sos'); sos_hi = signal.butter(4, 4000, 'high', fs=SR, output='sos')
    cm = smooth_gain(np.where(mask, MIX['music_carve_db'], 0.0), .05, .3, .1)
    y = np.empty_like(out); blk, pad = 60 * SR, SR                      # кусками по 60 с (память на целый фильм)
    for a0 in range(0, n, blk):
        p0, p1 = max(0, a0 - pad), min(n, a0 + blk + pad); seg = out[p0:p1].astype(np.float64)
        lo = signal.sosfiltfilt(sos_lo, seg, axis=0); hi = signal.sosfiltfilt(sos_hi, seg, axis=0); mid = seg - lo - hi
        sl = slice(a0 - p0, a0 - p0 + min(blk, n - a0)); gs = slice(a0, a0 + min(blk, n - a0))
        y[gs] = ((lo[sl] + hi[sl] + mid[sl] * lin(cm[gs])[:, None]) * lin(g[gs])[:, None]).astype(np.float32)
    return y, info, g


# ---------------- мастер ----------------
def true_peak_limit(x, ceiling_db, look=.002, release=.08):
    """лимитер по истинному пику: пик считается на 4-кратной передискретизации (кусками по 20 с), усиление — на исходной частоте;
    взгляд вперёд look, отпуск release (экспонента), атака сглажена окном Ханна. Всё векторно — годится для целого фильма."""
    from scipy.ndimage import minimum_filter1d
    up, lim, n = 4, lin(ceiling_db), len(x)
    gb = np.ones(n, np.float64); blk, ov = 20 * SR, 2048
    for a in range(0, n, blk):
        a0, b0 = max(0, a - ov), min(n, a + blk + ov)
        xu = signal.resample_poly(x[a0:b0].astype(np.float64), up, 1, axis=0)
        pk = np.abs(xu).max(axis=1)[:(b0 - a0) * up].reshape(-1, up).max(axis=1)
        need = np.minimum(1.0, lim / np.maximum(pk, 1e-9))
        gb[a:min(n, a + blk)] = need[a - a0:a - a0 + min(n, a + blk) - a]
    la = max(2, int(look * SR)) // 2 * 2
    gmin = minimum_filter1d(gb, size=la + 1, origin=-(la // 2), mode='nearest')      # минимум на [i, i + la]
    # отпуск: снижение r = 1 − g держится и спадает экспонентой: r[i] = max(rmin[i], ar · r[i−1]) — через накопленный максимум
    r = 1.0 - gmin; k = np.arange(n) * (1.0 / (release * SR))
    with np.errstate(divide='ignore'):
        r = np.exp(np.maximum.accumulate(np.log(r) + k) - k)
    g = 1.0 - r
    kern = np.hanning(la + 1); kern /= kern.sum(); g = np.minimum(g, np.convolve(g, kern, 'same'))   # сглаженная атака, но не выше нужного
    return (x * g[:, None]).astype(np.float32), float(db(1 - g.min() + 1e-12))


def ebur128(x):
    raw = np.ascontiguousarray(x, '<f4').tobytes()
    err = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', 'pipe:0', '-af', 'ebur128=peak=true', '-f', 'null', '-'],
                         input=raw, capture_output=True).stderr.decode('utf-8', 'replace')
    import re
    tail = err[err.rfind('Summary:'):]
    g = lambda p: float(re.search(p, tail).group(1))
    return {'I': g(r'I:\s+(-?[\d.]+) LUFS'), 'LRA': g(r'LRA:\s+(-?[\d.]+) LU'), 'TP': g(r'Peak:\s+(-?[\d.]+) dBFS')}


def master(stems):
    mix = sum(stems.values())
    gain = 0.0
    for it in range(4):
        L0 = METER.integrated_loudness(mix * lin(gain))
        gain += MIX['target_lufs'] - L0
        y, gr = true_peak_limit(mix * lin(gain), MIX['ceiling_dbtp'] - .3)
        m = ebur128(y)
        if abs(m['I'] - MIX['target_lufs']) < .15 and m['TP'] <= MIX['ceiling_dbtp']: break
        gain += MIX['target_lufs'] - m['I']
    return y, gain, m


def write(path, x):
    sf.write(str(path), x, SR, subtype='PCM_24')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--name', default='ch0_1'); ap.add_argument('--t0', type=float, default=None); ap.add_argument('--t1', type=float, default=None)
    ap.add_argument('--frames', default=None); ap.add_argument('--video', default=None); ap.add_argument('--voice', default='out/voice_fish_en.mp3')
    ap.add_argument('--no-music', action='store_true'); ap.add_argument('--lean', action='store_true', help='= --density lean')
    ap.add_argument('--density', default='mid', choices=['full', 'mid', 'lean'])
    ap.add_argument('--voice-gain-db', type=float, default=None, help='постоянное усиление голоса (master_full.py считает его один раз на весь фильм)')
    ap.add_argument('--premaster', action='store_true', help='без мастера: стемы и premix.wav в единицах голоса −16 LUFS (сборку фильма делает master_full.py)')
    ap.add_argument('--music-plan', default=str(HERE / 'music_plan.json'))
    ap.add_argument('--timing', default='animatic/timing.json'); ap.add_argument('--words', default='animatic/words.json'); ap.add_argument('--cues', default=str(HERE / 'cues.json'))
    ap.add_argument('--voice-wav', default=None, help='готовый голос на шкале фильма (напр. русский из ru_fit.py); речь ищется по огибающей')
    ap.add_argument('--suffix', default='_sound', help='хвост имени видео: <видео><suffix>.mp4')
    ap.add_argument('--tail-fade', type=float, default=.4, help='спад в конце куска, с (0 — без спада)')
    a = ap.parse_args()
    os.chdir(L)
    timing = json.load(open(a.timing, encoding='utf-8'))
    words = json.load(open(a.words, encoding='utf-8'))['words']
    C = json.load(open(a.cues, encoding='utf-8'))
    if a.voice == 'out/voice_fish_en.mp3' and timing.get('audioFile'): a.voice = timing['audioFile']   # голос, по которому сделан тайминг
    t0, t1 = a.t0, a.t1
    if a.frames:
        fr = json.load(open(a.frames)); t0 = fr['F0'] / 30 if t0 is None else t0; t1 = fr['F1'] / 30 if t1 is None else t1
    t0 = t0 or 0.0; t1 = t1 or timing['total']; n = int(round((t1 - t0) * SR))
    rec_map = json.load(open(HERE / 'palette_rec.json', encoding='utf-8')) if (HERE / 'palette_rec.json').exists() else {}
    plan = {} if a.no_music or not Path(a.music_plan).exists() else json.load(open(a.music_plan, encoding='utf-8'))
    od = HERE / 'out' / a.name; od.mkdir(parents=True, exist_ok=True)

    if a.voice_wav:
        vw = load_audio(a.voice_wav, mono=True); vw = np.r_[vw, np.zeros(max(0, n - len(vw)), np.float32)][:n]
        v = process_voice(vw, a.voice_gain_db); mask, phrases = envelope_mask(v)
    else:
        v = process_voice(voice_track(timing, a.voice, t0, t1), a.voice_gain_db); mask, phrases = speech_mask(words, t0, n)
        em, _ = envelope_mask(v); mask = mask | em   # слова + огибающая голоса: дакинг не промахнётся, если слова смещены
    vr = rms_win(v, .05); act = vr[mask[:len(vr)]] if mask.any() else vr
    vref = float(np.median(act[act > 1e-4])) if len(act) else .05
    beds = C['beds']
    def bed_at(t):
        for b in beds:
            if b['start'] <= t < b['end']: return b['bed']
        return 'room'
    bank = Bank(rec_map)
    density = 'lean' if a.lean else a.density; MIX['amb_trim_db'] = AMB_BY_DENSITY[density]
    sfx, placed = render_sfx(C['cues'], bank, t0, n, vref, bed_at, mask, density=density)
    amb = render_amb(beds, rec_map, t0, n, vref, mask)
    music, minfo, mg = render_music(plan, t0, n, mask, MIX['voice_lufs'], C.get('marks', []))
    stems = {'voice': to_stereo(v), 'music': music, 'sfx': sfx, 'amb': amb}
    if a.tail_fade > 0:   # спад в конце куска (пилот кончается по границе фразы)
        k = int(a.tail_fade * SR); w = np.cos(np.linspace(0, np.pi / 2, k))[:, None].astype(np.float32)
        for x in stems.values(): x[-k:] *= w
    if a.premaster:
        for k, x in stems.items(): sf.write(str(od / f'{k}.wav'), x.astype(np.float32), SR, subtype='FLOAT')
        sf.write(str(od / 'premix.wav'), sum(stems.values()).astype(np.float32), SR, subtype='FLOAT')
        json.dump({'name': a.name, 't0': t0, 't1': t1, 'density': density, 'vref_dbfs': round(float(db(vref)), 1), 'cues_placed': len(placed),
                   'from_recordings': sum(p['src'] == 'rec' for p in placed), 'placed': placed, 'music': minfo,
                   'phrases': [[round(p0 + t0, 3), round(p1 + t0, 3)] for p0, p1 in phrases]}, open(od / 'report.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        print(json.dumps({'premaster': a.name, 'cues_placed': len(placed), 'from_recordings': sum(p['src'] == 'rec' for p in placed)})); return
    mix, gain, meas = master(stems)
    for k, x in stems.items(): write(od / f'{k}.wav', (x * lin(gain)).astype(np.float32))
    write(od / 'mix.wav', mix)
    rep = {'name': a.name, 't0': t0, 't1': t1, 'master_gain_db': round(gain, 2), 'ebur128': meas, 'vref_dbfs': round(float(db(vref)), 1),
           'stem_lufs': {k: round(METER.integrated_loudness(x * lin(gain)), 1) if np.abs(x).max() > 0 else None for k, x in stems.items()},
           'density': density, 'cues_placed': len(placed), 'from_recordings': sum(p['src'] == 'rec' for p in placed), 'music': minfo, 'mix': MIX, 'placed': placed,
           'phrases': [[round(p0 + t0, 3), round(p1 + t0, 3)] for p0, p1 in phrases]}
    json.dump(rep, open(od / 'report.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(json.dumps({k: rep[k] for k in ('master_gain_db', 'ebur128', 'vref_dbfs', 'stem_lufs', 'cues_placed', 'from_recordings')}, ensure_ascii=False))
    if a.video:
        outv = Path(a.video).with_name(Path(a.video).stem + a.suffix + '.mp4')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', a.video, '-i', str(od / 'mix.wav'), '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
                        '-c:a', 'aac', '-b:a', '320k', '-ar', '48000', '-shortest', str(outv)], check=True)
        print('->', outv)


if __name__ == '__main__':
    main()
