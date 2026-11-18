#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
synth.py — процедурные звуки L001 (кодом, лицензия не нужна: результат — наш).

Каждая функция возвращает моно float32 при SR = 48000 и детерминирована по seed (варианты одного класса = разные seed).
Здесь всё, что синтез делает не хуже записей (по опыту V002 и earshot): свисты, райзеры, низкие удары, клики, тики,
пишмашинка, маркер, бумажные шлепки (запасной вариант), звонок старого телефона (два колокола + молоточек 20 Гц),
титры и стинги (низкий удар + нуарный аккорд + хвост), подложки-запаски (тон комнаты, гул, дождь, ветер).
Записи из lib/rec имеют приоритет там, где синтез звучит пластиково (вода, голоса, ткань, скрипы) — см. palette.py.

  python sound/synth.py --demo out/synth_demo     # отрендерить по одному варианту каждого класса (для прослушивания)
"""
import numpy as np
import warnings
from scipy import signal
warnings.filterwarnings('ignore', message='NOLA')

SR = 48000
F32 = np.float32


def rng(seed):
    return np.random.default_rng(int(seed) & 0xFFFFFFFF)


def tvec(dur):
    return np.arange(int(round(dur * SR))) / SR


def addp(*xs):
    """сложить массивы разной длины (короткие дополняются нулями)"""
    n = max(len(x) for x in xs); y = np.zeros(n)
    for x in xs: y[:len(x)] += x
    return y


def norm(x, peak=0.9):
    m = np.max(np.abs(x)) if len(x) else 0
    return (x * (peak / m)).astype(F32) if m > 0 else x.astype(F32)


def lp(x, f, order=2):
    return signal.sosfilt(signal.butter(order, min(f, SR * .45), 'low', fs=SR, output='sos'), x)


def hp(x, f, order=2):
    return signal.sosfilt(signal.butter(order, f, 'high', fs=SR, output='sos'), x)


def bp(x, f1, f2, order=2):
    return signal.sosfilt(signal.butter(order, [f1, min(f2, SR * .45)], 'band', fs=SR, output='sos'), x)


def peak_eq(x, f, q, gain_db):
    """RBJ peaking biquad"""
    A, w = 10 ** (gain_db / 40), 2 * np.pi * f / SR
    al = np.sin(w) / (2 * q)
    b = [1 + al * A, -2 * np.cos(w), 1 - al * A]; a = [1 + al / A, -2 * np.cos(w), 1 - al / A]
    return signal.lfilter(np.array(b) / a[0], np.array(a) / a[0], x)


def env_ar(n, a, r, peak_at=None, curve=3.0):
    """атака-спад: a, r — секунды; пик в peak_at (с) или в a"""
    t = np.arange(n) / SR; p = a if peak_at is None else peak_at
    up = np.clip(t / max(p, 1e-4), 0, 1) ** curve
    dn = np.exp(-np.clip(t - p, 0, None) / max(r, 1e-4))
    return np.where(t < p, up, dn)


def decay(n, tau):
    return np.exp(-np.arange(n) / SR / tau)


def noise(n, seed, color='white'):
    g = rng(seed).standard_normal(n)
    if color == 'pink':
        b, a = [0.049922035, -0.095993537, 0.050612699, -0.004408786], [1, -2.494956002, 2.017265875, -0.522189400]
        g = signal.lfilter(b, a, g)
    elif color == 'brown':
        g = np.cumsum(g); g = hp(g, 20)
    return g / (np.std(g) + 1e-9)


def stft_shape(n, seed, fc, bw_oct, amp, nfft=1024, hop=256):
    """шум, у которого в каждый момент свой спектр: полоса с центром fc(t) Гц шириной bw_oct октав, громкость amp(t)"""
    x = noise(n + nfft, seed)
    f, tt, Z = signal.stft(x, fs=SR, nperseg=nfft, noverlap=nfft - hop, boundary=None, padded=True)
    tt = np.clip(tt, 0, n / SR - 1e-6)
    fcs, bws, amps = fc(tt), np.broadcast_to(bw_oct(tt) if callable(bw_oct) else bw_oct, tt.shape), amp(tt)
    lf = np.log2(np.maximum(f, 20))[:, None]
    G = np.exp(-0.5 * ((lf - np.log2(fcs)[None, :]) / bws[None, :]) ** 2) * amps[None, :]
    _, y = signal.istft(Z * G, fs=SR, nperseg=nfft, noverlap=nfft - hop, boundary=None)
    return y[:n]


# ---------------- свисты, райзеры ----------------
def whoosh(dur=0.45, apex=None, f0=500, f1=3200, f2=None, bw=1.1, seed=1, rise=2.2, fall=2.0, flutter=0.0, body=0.0):
    """свист: полоса шума едет f0 -> f1 к пику apex и f1 -> f2 после; громкость растёт к пику (rise) и спадает (fall).
    body — доля низкого «тела» (0..1) для тяжёлых пролётов."""
    n = int(dur * SR); apex = dur * .62 if apex is None else apex; f2 = f1 * .55 if f2 is None else f2
    def fc(t):
        k = np.clip(t / apex, 0, 1); j = np.clip((t - apex) / max(dur - apex, 1e-3), 0, 1)
        return np.where(t < apex, f0 * (f1 / f0) ** (k ** 1.4), f1 * (f2 / f1) ** j)
    def amp(t):
        a = np.where(t < apex, np.clip(t / apex, 0, 1) ** rise, np.clip(1 - (t - apex) / max(dur - apex, 1e-3), 0, 1) ** fall)
        if flutter: a = a * (1 - flutter * .5 * (1 + np.sin(2 * np.pi * 23 * t)))
        return a
    y = stft_shape(n, seed, fc, bw, amp)
    if body:
        t = tvec(dur); e = np.interp(t, [0, apex * .7, apex, dur], [0, .6, 1, 0]) ** 2
        y = y + body * lp(noise(n, seed + 7, 'brown'), 180) * e * np.std(y) * 2.5
    return norm(y)


def snap(seed=1, dur=0.24):
    """рывок камеры: короткий тугой свист с пиком в 0.16 с + едва слышный толчок на пике"""
    r = rng(seed); apex = .16
    w = whoosh(dur, apex, f0=600 + 300 * r.random(), f1=2600 + 1400 * r.random(), f2=1500, bw=.9, seed=seed, rise=3.0, fall=1.4)
    t = tvec(dur); th = np.sin(2 * np.pi * (70 + 40 * np.exp(-30 * np.clip(t - apex, 0, None))) * (t - apex)) * env_ar(len(t), .0, .05, peak_at=apex, curve=1)
    return norm(w + .35 * th * (t >= apex))


def riser(dur=1.0, seed=1, f0=300, f1=6000, tone=0.35, shimmer=0.0):
    """нарастание к точке (конец звука = точка попадания): шум вверх по частоте + тон, растущий по высоте, обрыв в конце"""
    n = int(dur * SR); t = tvec(dur)
    y = stft_shape(n, seed, lambda tt: f0 * (f1 / f0) ** (tt / dur), .9, lambda tt: (tt / dur) ** 2.4)
    if tone:
        ph = 2 * np.pi * np.cumsum(110 * 2 ** (2.2 * t / dur)) / SR
        y = y + tone * np.std(y) * 3 * (np.sin(ph) + .4 * np.sin(2.01 * ph)) * (t / dur) ** 2 * (1 + .3 * np.sin(2 * np.pi * (4 + 10 * t / dur) * t))
    if shimmer:
        for k, f in enumerate([2637, 3136, 3951, 4699]):
            y = y + shimmer * np.std(y) * np.sin(2 * np.pi * f * t + k) * (t / dur) ** 3 * (1 + np.sin(2 * np.pi * (7 + k) * t)) * .5
    y[-int(.006 * SR):] *= np.linspace(1, 0, int(.006 * SR))
    return norm(y)


def reverse_swell(dur=0.5, seed=1):
    """«обратная тарелка»: яркий шум нарастает и обрывается"""
    n = int(dur * SR); t = tvec(dur)
    y = hp(noise(n, seed), 3000) * (t / dur) ** 3
    y[-int(.004 * SR):] *= np.linspace(1, 0, int(.004 * SR))
    return norm(y)


# ---------------- удары ----------------
def thump(dur=0.5, f0=90, f1=42, tau=0.16, click=0.25, seed=1, noise_lp=900, noise_amt=0.3):
    """низкий удар: синус с падением частоты + щелчок атаки + немного шума"""
    t = tvec(dur); n = len(t)
    f = f1 + (f0 - f1) * np.exp(-t / .04)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * decay(n, tau)
    y = y + noise_amt * lp(noise(n, seed), noise_lp) * decay(n, .03)
    if click: y = y + click * hp(noise(n, seed + 1), 2000) * decay(n, .004)
    y[:24] *= np.linspace(0, 1, 24)
    return norm(y)


def boom(dur=2.4, seed=1, sub=1.0, tau=0.6):
    """большой удар (кино): суб-спад 55 -> 30 Гц, плотная середина, длинный хвост"""
    t = tvec(dur); n = len(t)
    f = 30 + 26 * np.exp(-t / .09)
    y = sub * np.sin(2 * np.pi * np.cumsum(f) / SR) * decay(n, tau)
    mid = lp(noise(n, seed, 'pink'), 700) * decay(n, .18) * .9 + hp(noise(n, seed + 3), 2500) * decay(n, .012) * .5
    y = y + mid * .6
    y[:24] *= np.linspace(0, 1, 24)
    return norm(lp(y, 9000))


def bell_partials(t, f, parts, taus, amps):
    return sum(a * np.sin(2 * np.pi * f * p * t) * np.exp(-t / tau) for p, tau, a in zip(parts, taus, amps))


def chord_hit(dur=3.0, root=65.41, seed=1, kind='minor9', bright=0.35):
    """нуарный аккорд-удар: «рояль + низкие струны» аддитивно; root — Гц (C2 = 65.41)"""
    t = tvec(dur); r = rng(seed)
    iv = {'minor9': [0, 7, 12, 15, 19, 26], 'dim': [0, 6, 12, 15, 18], 'sus': [0, 7, 12, 17, 19]}[kind]
    y = np.zeros(len(t))
    for k, s in enumerate(iv):
        f = root * 2 ** (s / 12) * (1 + .002 * r.standard_normal())
        y += (1 / (1 + .35 * k)) * bell_partials(t, f, [1, 2.0, 3.01, 4.03, 5.1], [1.6, .9, .5, .3, .2], [1, .45 * bright * 2, .25 * bright * 2, .12, .06])
    # мягкая атака молоточка
    y += .3 * lp(noise(len(t), seed), 3000) * decay(len(t), .01)
    y[:48] *= np.linspace(0, 1, 48)
    return norm(lp(y, 7000))


def sting(kind='chapter', seed=1):
    """титр главы — удар + аккорд + хвост; титр ролика — больше и ниже"""
    if kind == 'title':
        b = boom(3.6, seed, sub=1.0, tau=.9); c = chord_hit(3.6, 49.0, seed + 5, 'minor9', .25)   # G1
        y = .9 * b + .55 * c
    else:
        b = thump(2.4, 70, 38, .45, .2, seed); c = chord_hit(2.4, 65.41 * 2 ** ((seed % 5) / 12), seed + 2, 'minor9', .4)
        y = .55 * b + .7 * c
    return norm(y)


def glint(seed=1, dur=0.6):
    """блик: короткий стеклянный «тинь» высоко"""
    t = tvec(dur); r = rng(seed); f = 4200 + 1800 * r.random()
    y = bell_partials(t, f, [1, 1.51, 2.24], [.18, .1, .06], [1, .5, .25]) + .15 * hp(noise(len(t), seed), 6000) * decay(len(t), .02)
    y[:24] *= np.linspace(0, 1, 24)
    return norm(y)


def shimmer(dur=0.9, seed=1):
    """блик лампы по названию: стеклянная мерцающая полоса, нарастает и гаснет"""
    t = tvec(dur); r = rng(seed); y = np.zeros(len(t))
    for k in range(7):
        f = 2000 * 2 ** (r.random() * 2); y += np.sin(2 * np.pi * f * t + k) * (1 + np.sin(2 * np.pi * (5 + 3 * k) * t)) * .5
    y += .4 * hp(noise(len(t), seed), 5000)
    return norm(y * np.sin(np.pi * t / dur) ** 1.5)


# ---------------- клики, тики, пишмашинка ----------------
def click(seed=1, f=3000, tau=0.004, body_f=0, body_tau=0.02, dur=0.08):
    t = tvec(dur); n = len(t); r = rng(seed)
    y = bp(noise(n, seed), f * .6, f * 1.8) * decay(n, tau)
    if body_f: y = y + .6 * np.sin(2 * np.pi * body_f * (1 + .05 * r.standard_normal()) * t) * decay(n, body_tau)
    return norm(y)


def switch_click(seed=1):
    a = click(seed, 2500, .003, 900, .015, .1); b = click(seed + 1, 3500, .002, 1400, .01, .1)
    y = np.zeros(int(.12 * SR)); y[:len(a)] += a; o = int(.018 * SR); y[o:o + len(b)] += .7 * b[:len(y) - o]
    return norm(y)


def typekey(seed=1):
    """одна клавиша механической пишмашинки: щелчок + металлический звон рычага + стук по валику"""
    r = rng(seed); t = tvec(.09); n = len(t)
    y = .9 * bp(noise(n, seed), 1800, 6000) * decay(n, .003)
    y += .5 * bell_partials(t, 2400 + 500 * r.random(), [1, 2.7], [.012, .006], [1, .4])
    o = int((.008 + .004 * r.random()) * SR); thk = np.sin(2 * np.pi * (180 + 40 * r.random()) * t) * decay(n, .012)
    y[o:] += .8 * thk[:n - o]
    return norm(y, .9)


def type_bell(seed=1):
    t = tvec(1.0)
    return norm(bell_partials(t, 2093, [1, 2.76, 5.4], [.35, .15, .06], [1, .4, .2]) + .1 * hp(noise(len(t), seed), 4000) * decay(len(t), .01))


def type_run(n_keys=9, dur=0.35, seed=1, bell=False):
    out = np.zeros(int((dur + .15) * SR)); r = rng(seed)
    for k in range(n_keys):
        tk = dur * k / max(1, n_keys - 1) + .012 * r.standard_normal(); o = max(0, int(tk * SR))
        key = typekey(seed * 31 + k) * (.75 + .25 * r.random()); out[o:o + len(key)] += key[:len(out) - o]
    if bell:
        b = type_bell(seed); o = int(dur * SR); out = np.r_[out, np.zeros(len(b))]; out[o:o + len(b)] += .6 * b
    return norm(out)


def tick_run(n=12, dur=1.0, seed=1, f=2500, accel=True):
    """счётчик/табло: щелчки чаще в середине (ускорение-торможение)"""
    out = np.zeros(int((dur + .1) * SR)); u = np.linspace(0, 1, n)
    times = dur * (0.5 - 0.5 * np.cos(np.pi * u)) if accel else dur * u
    for k, tk in enumerate(times):
        c = click(seed + k, f * (1 + .1 * (k % 3)), .003, 600, .01, .05); o = int(tk * SR); out[o:o + len(c)] += c[:len(out) - o]
    return norm(out)


def beep(f=2700, dur=0.05, n=2, gap=0.065, seed=1):
    t = tvec(dur); one = np.sin(2 * np.pi * f * t) * np.sin(np.pi * t / dur) ** .3
    out = np.zeros(int((gap * (n - 1) + dur + .02) * SR))
    for k in range(n): o = int(k * gap * SR); out[o:o + len(one)] += one
    return norm(out, .8)


def chime(seed=1):
    t = tvec(.5); y = np.zeros(len(t))
    for k, f in enumerate([1318.5, 1975.5]):
        o = int(k * .09 * SR); y[o:] += np.sin(2 * np.pi * f * t[:len(t) - o]) * decay(len(t) - o, .12)
    return norm(y, .8)


def pin_pop(seed=1):
    t = tvec(.15); f = 300 + 700 * np.exp(-t / .02)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * decay(len(t), .03) + .4 * click(seed, 3000, .002, 0, .01, .15)
    return norm(y)


# ---------------- маркер, бумага, нитка ----------------
def marker(dur=1.0, seed=1, strokes_per_s=7, bright=1.0):
    """фломастер по бумаге: писк-трение отдельными штрихами"""
    n = int(dur * SR); t = tvec(dur); r = rng(seed)
    y = bp(noise(n, seed), 1800 * bright, 7000) + .3 * bp(noise(n, seed + 1), 600, 1800)
    am = np.zeros(n); k = 0.0
    while k < dur:
        L = (.6 + .8 * r.random()) / strokes_per_s; a, b = int(k * SR), int(min(dur, k + L) * SR)
        if b > a: am[a:b] = np.sin(np.linspace(0, np.pi, b - a)) ** .7 * (.6 + .4 * r.random())
        k += L + .015 * r.random()
    squeak = np.sin(2 * np.pi * np.cumsum(2400 + 500 * np.sin(2 * np.pi * 3 * t)) / SR) * .12
    return norm((y + squeak) * am)


def paper(dur=0.5, seed=1, kind='slide'):
    """бумага: slide — скольжение по столу; slap — шлепок листа/снимка; flick — щелчок бирки"""
    n = int(dur * SR); t = tvec(dur)
    if kind == 'slide':
        y = bp(noise(n, seed, 'pink'), 300, 5000) * np.sin(np.pi * np.clip(t / dur, 0, 1)) ** .8
        crk = (rng(seed).random(n) > .9993) * rng(seed + 1).standard_normal(n) * 4; y = y + bp(crk, 2000, 8000)
    elif kind == 'slap':
        y = hp(noise(n, seed), 400) * decay(n, .035) + .5 * lp(noise(n, seed + 2), 300) * decay(n, .02)
        pre = int(.06 * SR); y = np.r_[bp(noise(pre, seed + 3), 800, 4000) * np.linspace(0, .25, pre) ** 2, y][:n]
    else:
        y = bp(noise(n, seed), 1200, 9000) * decay(n, .012) + .5 * np.sin(2 * np.pi * np.cumsum(500 - 300 * t / dur) / SR) * decay(n, .025)
    y[:16] *= np.linspace(0, 1, 16)
    return norm(y)


def stamp_synth(seed=1):
    """резиновый штамп: глухой удар дерева о стол + шлепок бумаги"""
    a = thump(.35, 160, 70, .06, .5, seed, 2500, .5); b = paper(.25, seed + 4, 'slap')
    y = np.zeros(int(.4 * SR)); y[:len(a)] += a; y[:len(b)] += .6 * b
    return norm(y)


def string_pull(dur=0.45, seed=1, taut=False):
    """нитка тянется (трение, писк) или натягивается (короткий «тинь» щипка)"""
    if taut:
        n = int(.5 * SR); r = rng(seed); p = int(SR / (170 + 30 * r.random())); buf = r.uniform(-1, 1, p); y = np.zeros(n)
        for i in range(n): y[i] = buf[i % p]; buf[i % p] = .5 * (buf[i % p] + buf[(i + 1) % p]) * .996
        return norm(hp(y, 150) * decay(n, .12))
    n = int(dur * SR); t = tvec(dur)
    y = bp(noise(n, seed), 1500, 5000) * (1 + .8 * np.sign(np.sin(2 * np.pi * 38 * t))) * np.sin(np.pi * t / dur)
    return norm(y)


# ---------------- телефон, лампа, мотор ----------------
def phone_ring(dur=0.9, seed=1):
    """старый телефонный звонок: два колокола, молоточек 20 Гц (американский звонок W.E. 500)"""
    t = tvec(dur + .6); n = len(t); y = np.zeros(n); r = rng(seed)
    bells = [(1180, [1, 2.32, 3.86, 5.1]), (1420, [1, 2.4, 3.7, 5.3])]
    k = 0
    while k / 20 < dur:
        f, parts = bells[k % 2]; o = int(k / 20 * SR); tt = t[:n - o]
        y[o:] += (.8 + .2 * r.random()) * bell_partials(tt, f, parts, [.5, .25, .12, .07], [1, .6, .35, .2])
        y[o:o + 200] += .3 * r.standard_normal(min(200, n - o))
        k += 1
    return norm(lp(y, 9000))


def hum(dur=3.0, f=120, harm=(1, .5, .25, .12), noise_amt=.15, seed=1):
    t = tvec(dur); y = sum(a * np.sin(2 * np.pi * f * (k + 1) * t + k) for k, a in enumerate(harm))
    y = y * (1 + .05 * np.sin(2 * np.pi * .7 * t)) + noise_amt * bp(noise(len(t), seed), 200, 4000)
    return norm(y, .5)


def motor(dur=3.0, seed=1, f0=320, f1=420):
    t = tvec(dur); f = f0 + (f1 - f0) * np.sin(np.pi * t / dur)
    ph = 2 * np.pi * np.cumsum(f) / SR
    y = np.sin(ph) + .5 * np.sin(2 * ph) + .25 * np.sin(3.01 * ph) + .4 * bp(noise(len(t), seed), 300, 3000)
    return norm(y * np.sin(np.pi * t / dur) ** .5, .6)


def servo(dur=1.0, seed=1):
    t = tvec(dur); y = bp(noise(len(t), seed), 1500, 5000) * (1 + .6 * np.sin(2 * np.pi * 45 * t)) + .4 * np.sin(2 * np.pi * 620 * t)
    return norm(y * np.sin(np.pi * t / dur) ** .4, .6)


def tape_reels(dur=3.0, seed=1):
    t = tvec(dur); ph = 2 * np.pi * np.cumsum(50 * (1 + .01 * np.sin(2 * np.pi * 6 * t))) / SR
    y = .5 * np.sin(ph) + .3 * np.sin(3 * ph) + .6 * bp(noise(len(t), seed, 'pink'), 2000, 9000) + .4 * lp(noise(len(t), seed + 1), 200)
    y *= (1 + .15 * np.sin(2 * np.pi * 3.2 * t))
    return norm(y, .5)


def chip_glow(dur=1.0, seed=1):
    """зелёный свет / чип: электрический подъём с мерцанием"""
    t = tvec(dur); f = 180 * 2 ** (1.2 * np.clip(t / (dur * .4), 0, 1))
    ph = 2 * np.pi * np.cumsum(f) / SR
    y = (np.sin(ph) + .5 * np.sin(2 * ph + 3 * np.sin(2 * np.pi * 7 * t))) * env_ar(len(t), .0, dur * .45, peak_at=dur * .35, curve=1.5)
    y += .25 * hp(noise(len(t), seed), 4000) * (rng(seed).random(len(t)) > .995) * 6 * decay(len(t), dur * .5)
    return norm(y)


def thunder(dur=3.5, seed=1):
    t = tvec(dur); e = env_ar(len(t), .0, 1.2, peak_at=.35, curve=1.2)
    y = lp(noise(len(t), seed, 'brown'), 160) * e * (1 + .5 * np.sin(2 * np.pi * 1.7 * t)) + .3 * lp(noise(len(t), seed + 1), 600) * e
    return norm(y)


def air(dur=2.0, seed=1, f=900):
    """движение камеры: мягкий широкий воздух, наплыв и спад"""
    n = int(dur * SR)
    y = stft_shape(n, seed, lambda tt: f * (1 + .6 * np.sin(np.pi * tt / dur)), 1.3, lambda tt: np.sin(np.pi * np.clip(tt / dur, 0, 1)) ** 1.5)
    return norm(y)


# ---------------- фоли-запаски (если нет записи) ----------------
def knock(seed=1, f=380, n_hits=1, gap=0.12):
    out = np.zeros(int((gap * n_hits + .25) * SR))
    for k in range(n_hits):
        t = tvec(.2); y = np.sin(2 * np.pi * f * t) * decay(len(t), .025) + .7 * lp(noise(len(t), seed + k), 2500) * decay(len(t), .008)
        o = int(k * gap * SR); out[o:o + len(y)] += y
    return norm(out)


def box_tap(seed=1):
    t = tvec(.15); y = np.sin(2 * np.pi * 170 * t) * decay(len(t), .03) + .8 * lp(noise(len(t), seed), 1800) * decay(len(t), .01)
    return norm(y)


def glass_clink(seed=1):
    t = tvec(1.6); r = rng(seed); f = 2350 + 200 * r.random()
    y = bell_partials(t, f, [1, 1.33, 2.42, 3.25], [.9, .6, .35, .2], [1, .7, .45, .3]) + .3 * hp(noise(len(t), seed), 5000) * decay(len(t), .004)
    return norm(y * (1 + .1 * np.sin(2 * np.pi * 5 * t)))


def key_jingle(seed=1, dur=0.35):
    out = np.zeros(int((dur + .4) * SR)); r = rng(seed)
    for k in range(5):
        t = tvec(.35); f = 3500 + 4000 * r.random()
        y = bell_partials(t, f, [1, 1.58, 2.3], [.08, .05, .03], [1, .5, .3]); o = int(dur * r.random() * SR); out[o:o + len(y)] += y * (.5 + .5 * r.random())
    return norm(out)


def shutter_synth(seed=1):
    a = click(seed, 2800, .004, 700, .02, .08); b = click(seed + 1, 2200, .006, 500, .03, .1)
    y = np.zeros(int(.2 * SR)); y[:len(a)] += a; o = int(.045 * SR); y[o:o + len(b)] += .8 * b
    y += .15 * bp(noise(len(y), seed + 2), 800, 4000) * decay(len(y), .05)
    return norm(y)


def flash_pop(seed=1):
    t = tvec(.3); y = hp(noise(len(t), seed), 1800) * decay(len(t), .03) + .4 * np.sin(2 * np.pi * np.cumsum(5000 + 3000 * t) / SR) * decay(len(t), .05)
    return norm(y)


def splash_synth(seed=1):
    t = tvec(.8); n = len(t); r = rng(seed)
    y = bp(noise(n, seed), 400, 6000) * env_ar(n, .0, .12, peak_at=.01, curve=1)
    for k in range(25):
        o = int((.02 + .5 * r.random()) * SR); tt = tvec(.04); f = 600 + 1800 * r.random()
        b = np.sin(2 * np.pi * np.cumsum(f * (1 + 4 * tt / .04)) / SR) * decay(len(tt), .01); y[o:o + len(b)] += .3 * b[:n - o]
    return norm(y)


def cloth(dur=0.5, seed=1):
    n = int(dur * SR); t = tvec(dur); r = rng(seed)
    am = np.abs(lp(r.standard_normal(n), 25)); am /= am.max() + 1e-9
    return norm(bp(noise(n, seed, 'pink'), 300, 5000) * am * np.sin(np.pi * t / dur))


def creak(dur=0.5, seed=1, f=55):
    t = tvec(dur); r = rng(seed); fr = f * (1 + .4 * np.sin(2 * np.pi * (1 + r.random()) * t))
    pulses = (np.diff(np.floor(np.cumsum(fr) / SR), prepend=0) > 0).astype(float)
    y = peak_eq(peak_eq(signal.lfilter([1], [1, -.97], pulses), 900, 4, 12), 2200, 5, 9)
    return norm(hp(y, 200) * np.sin(np.pi * t / dur) ** .5)


# ---------------- подложки-запаски ----------------
def room_tone(dur=10.0, seed=1, tilt=260):
    return norm(.7 * lp(noise(int(dur * SR), seed, 'brown'), tilt) + .3 * lp(noise(int(dur * SR), seed + 1, 'pink'), 1500), .3)


def rain_synth(dur=10.0, seed=1, density=900, bright=6000):
    n = int(dur * SR); r = rng(seed)
    bed = bp(noise(n, seed, 'pink'), 400, bright)
    drops = (r.random(n) < density / SR) * r.uniform(.3, 1, n)
    drops = signal.lfilter([1], [1, -.6], drops); drops = bp(drops, 1500, 9000)
    return norm(.6 * bed / np.std(bed) + .8 * drops / (np.std(drops) + 1e-9), .4)


def wind(dur=10.0, seed=1):
    n = int(dur * SR); t = tvec(dur); r = rng(seed)
    g = np.abs(lp(r.standard_normal(n), 0.4)); g = .4 + g / (g.max() + 1e-9)
    return norm(bp(noise(n, seed, 'pink'), 150, 1500) * g, .35)


GEN = {   # имя -> (функция(seed) -> массив); длительные (span) получают dur
    'snap': lambda s, d=None: snap(s),
    'snap.soft': lambda s, d=None: snap(s, .2),
    'whoosh.whip': lambda s, d=None: whoosh(.42, .22, 400, 3600, 1800, 1.0, s, 2.2, 1.6, flutter=.15, body=.3),
    'whoosh.wipe': lambda s, d=None: whoosh(.5, .27, 500, 3000, 1500, 1.1, s),
    'whoosh.air': lambda s, d=None: whoosh(.8, .45, 250, 1600, 700, 1.3, s, 2.0, 1.8, body=.4),
    'whoosh.small': lambda s, d=None: whoosh(.35, .2, 700, 3200, 1800, .9, s),
    'whoosh.cut': lambda s, d=None: whoosh(.38, .2, 500, 2600, 1300, 1.0, s, 2.5, 1.8, body=.25),
    'whoosh.photo': lambda s, d=None: whoosh(.3, .18, 900, 4000, 2500, .8, s),
    'whoosh.speed': lambda s, d=None: whoosh(.5, .2, 600, 5000, 2500, 1.0, s, flutter=.3),
    'whoosh.through': lambda s, d=None: whoosh(.9, .5, 200, 2400, 900, 1.3, s, body=.6),
    'whoosh.zoomin': lambda s, d=None: whoosh(.32, .315, 400, 4200, 4200, 1.0, s, 3.0, 4.0, body=.3),
    'body.pass': lambda s, d=None: lp(whoosh(.55, .3, 300, 1400, 700, 1.2, s), 1800),
    'riser.white': lambda s, d=None: riser(.45, s, 800, 9000, .15, .6),
    'riser.title': lambda s, d=None: riser(1.6, s, 200, 7000, .45, .4),
    'riser.tower': lambda s, d=1.3: riser(d or 1.3, s, 120, 2500, .6, 0),
    'air.move': lambda s, d=2.0: air(d or 2.0, s),
    'hit.punch': lambda s, d=None: thump(.45, 120, 48, .12, .5, s, 1500, .5),
    'hit.card': lambda s, d=None: thump(.8, 75, 38, .28, .15, s, 600, .35),
    'hit.soft': lambda s, d=None: thump(.3, 110, 60, .06, .2, s, 1200, .4),
    'hit.event': lambda s, d=None: thump(.25, 90, 55, .05, .1, s, 800, .3),
    'hit.kick': lambda s, d=None: thump(.35, 100, 50, .08, .3, s, 1000, .4),
    'hit.bloom': lambda s, d=None: thump(1.2, 60, 35, .35, 0, s, 400, .25),
    'hit.reveal': lambda s, d=None: norm(.8 * boom(2.0, s, 1, .5) + .5 * chord_hit(2.0, 98, s, 'sus', .5)),
    'hit.number': lambda s, d=None: thump(.5, 130, 50, .12, .6, s, 2500, .5),
    'hit.x': lambda s, d=None: thump(.4, 140, 60, .08, .6, s, 3000, .6),
    'alarm.hit': lambda s, d=None: norm(thump(.8, 90, 40, .25, .3, s) + .5 * np.sin(2 * np.pi * 466 * tvec(.8)) * decay(int(.8 * SR), .2) + .5 * np.sin(2 * np.pi * 494 * tvec(.8)) * decay(int(.8 * SR), .2)),
    'sting.chapter': lambda s, d=None: sting('chapter', s),
    'sting.title': lambda s, d=None: sting('title', s),
    'shimmer.sweep': lambda s, d=.9: shimmer(d or .9, s),
    'glint': lambda s, d=None: glint(s),
    'type.run': lambda s, d=.35, n=9: type_run(n, d or .35, s),
    'tape.clack': lambda s, d=1.0, n=12: tick_run(n, d or 1.0, s, 1200, accel=False),
    'ticker.run': lambda s, d=1.0, n=None: tick_run(max(6, int((d or 1) * 18)), d or 1.0, s, 3000),
    'flip.board': lambda s, d=.6, n=None: tick_run(10, d or .6, s, 1800),
    'af.beep': lambda s, d=None: beep(2700, .045, 2, .07, s),
    'tablet.ping': lambda s, d=None: chime(s),
    'switch.click': lambda s, d=None: switch_click(s),
    'lamp.flicker': lambda s, d=None: norm(addp(hum(.12, 120, (1, .6, .3, .2), .3, s), np.zeros(int(.1 * SR)), np.r_[np.zeros(int(.16 * SR)), hum(.1, 120, (1, .6, .3, .2), .3, s + 1)])),
    'timer.click': lambda s, d=None: switch_click(s),
    'lock.click': lambda s, d=None: switch_click(s),
    'clip.snap': lambda s, d=None: click(s, 4000, .003, 2400, .01, .08),
    'tag.tick': lambda s, d=None: click(s, 3000, .003, 0, .01, .06),
    'glasses.tick': lambda s, d=None: click(s, 3500, .002, 1800, .006, .05),
    'pin.pop': lambda s, d=None: pin_pop(s),
    'pin.push': lambda s, d=None: click(s, 2000, .004, 300, .02, .1),
    'ui.slide': lambda s, d=None: whoosh(.4, .12, 1200, 4000, 2500, .8, s, 1.5, 2.5),
    'marker.write': lambda s, d=1.0: marker(d or 1.0, s),
    'marker.line': lambda s, d=.35: marker(d or .35, s, 3),
    'marker.hl': lambda s, d=.38: marker(d or .38, s, 3, .7),
    'marker.circle': lambda s, d=.7: marker(d or .7, s, 2),
    'marker.cross': lambda s, d=None: marker(.35, s, 6),
    'map.route': lambda s, d=1.0: norm(marker(d or 1.0, s, 12, .8) * .6),
    'plane.by': lambda s, d=2.0: whoosh(d or 2.0, (d or 2.0) * .55, 300, 1800, 600, 1.4, s, 1.5, 1.5),
    'paper.slide': lambda s, d=.6: paper(d or .6, s, 'slide'),
    'paper.place': lambda s, d=None: paper(.25, s, 'slap'),
    'paper.handle': lambda s, d=None: paper(.4, s, 'slide'),
    'page.turn': lambda s, d=None: paper(.45, s, 'slide'),
    'photo.drop': lambda s, d=None: paper(.3, s, 'slap'),
    'photo.pat': lambda s, d=None: paper(.25, s, 'slap'),
    'folder.close': lambda s, d=None: norm(paper(.3, s, 'slap') + .5 * thump(.3, 140, 80, .04, .3, s)),
    'tag.pop': lambda s, d=None: paper(.18, s, 'flick'),
    'tag.slap': lambda s, d=None: paper(.2, s, 'slap'),
    'stamp': lambda s, d=None: stamp_synth(s),
    'string.pull': lambda s, d=.45: string_pull(d or .45, s),
    'string.taut': lambda s, d=None: string_pull(.5, s, True),
    'phone.ring': lambda s, d=.9: phone_ring(d or .9, s),
    'phone.pickup': lambda s, d=None: knock(s, 300, 2, .08),
    'lamp.buzz': lambda s, d=3.0: hum(d or 3.0, 120, (1, .6, .3, .2), .1, s),
    'motor.hum': lambda s, d=3.0: motor(d or 3.0, s),
    'servo': lambda s, d=1.0: servo(d or 1.0, s),
    'tape.reels': lambda s, d=3.0: tape_reels(d or 3.0, s),
    'chip.pulse': lambda s, d=None: chip_glow(.7, s),
    'chip.glow': lambda s, d=None: chip_glow(1.2, s),
    'thunder.far': lambda s, d=None: thunder(3.5, s),
    'dust.puff': lambda s, d=None: lp(paper(.2, s, 'slide'), 1500),
    'shutter': lambda s, d=None: shutter_synth(s),
    'flash.pop': lambda s, d=None: flash_pop(s),
    'glass.clink': lambda s, d=None: glass_clink(s),
    'glass.lift': lambda s, d=None: click(s, 5000, .002, 3100, .03, .1),
    'key.jingle': lambda s, d=None: key_jingle(s),
    'box.tap': lambda s, d=None: box_tap(s),
    'box.pat': lambda s, d=None: norm(addp(thump(.3, 130, 70, .05, .1, s, 900, .5), .5 * paper(.2, s, 'slap'))),
    'box.set': lambda s, d=None: thump(.3, 150, 90, .05, .4, s, 2000, .6),
    'crate.set': lambda s, d=None: thump(.35, 140, 85, .06, .5, s, 2500, .7),
    'box.lid': lambda s, d=.8: cloth(d or .8, s),
    'cloth.rustle': lambda s, d=None: cloth(.45, s),
    'cloth.slide': lambda s, d=.8: cloth(d or .8, s),
    'headphone': lambda s, d=None: cloth(.25, s),
    'chair.scrape': lambda s, d=.8: creak(d or .8, s, 90),
    'chair.creak': lambda s, d=None: creak(.5, s),
    'case.creak': lambda s, d=None: creak(.4, s),
    'wood.knock': lambda s, d=None: knock(s),
    'knock': lambda s, d=None: knock(s, 300, 3, .16),
    'door.slam': lambda s, d=None: thump(.7, 90, 45, .18, .6, s, 2500, .8),
    'door.open': lambda s, d=None: creak(.6, s, 40),
    'water.splash': lambda s, d=None: splash_synth(s),
    'drip': lambda s, d=None: pin_pop(s),
    'pen.drop': lambda s, d=None: knock(s, 1200, 2, .09),
    'cash': lambda s, d=None: key_jingle(s, .2),
    'fax': lambda s, d=1.5: motor(d or 1.5, s, 900, 1100),
    'keyboard': lambda s, d=1.0: type_run(max(4, int((d or 1) * 9)), d or 1.0, s),
    'applause': lambda s, d=2.5: rain_synth(d or 2.5, s, 400, 5000),
    'crowd.react': lambda s, d=1.5: lp(noise(int((d or 1.5) * SR), s, 'pink'), 1200) * np.sin(np.pi * tvec(d or 1.5) / (d or 1.5)),
    'crane.clank': lambda s, d=None: norm(addp(knock(s, 220, 2, .2), .3 * key_jingle(s))),
    'pour': lambda s, d=1.2: rain_synth(d or 1.2, s, 3000, 4000),
    'dishes': lambda s, d=None: key_jingle(s, .3),
    'case.creak2': lambda s, d=None: creak(.4, s),
}


def make(name, seed=1, dur=None, n=None):
    g = GEN[name]
    try:
        y = g(seed, dur, n) if n is not None else g(seed, dur)
    except TypeError:
        y = g(seed, dur) if dur is not None else g(seed)
    y = np.asarray(y, dtype=np.float64)
    if dur and len(y) < int(dur * SR) and name in ('air.move', 'lamp.buzz', 'motor.hum', 'tape.reels', 'servo'):
        y = np.r_[y, np.zeros(int(dur * SR) - len(y))]
    return y.astype(F32)


if __name__ == '__main__':
    import argparse, os, wave
    ap = argparse.ArgumentParser(); ap.add_argument('--demo', default=None); a = ap.parse_args()
    if a.demo:
        os.makedirs(a.demo, exist_ok=True)
        for k in GEN:
            y = make(k, 1, 1.0)
            with wave.open(os.path.join(a.demo, k + '.wav'), 'wb') as w:
                w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(y, -1, 1) * 32767).astype('<i2').tobytes())
        print(len(GEN), 'sounds ->', a.demo)
