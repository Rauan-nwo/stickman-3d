#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
audition.py — «машинное прослушивание» кандидатов на каждый класс звука и выбор лучшего.

  C:/dev/tools/earshot/.venv/Scripts/python.exe sound/tools/audition.py [--classes snap,stamp] [--rec sound/lib/ledger.json]

Кандидаты класса: наш синтез (synth.py, 3 варианта), банк earshot (MIT: рендер кодом), записи CC0 из lib/rec (если в ledger
у записи стоит класс). Каждый кандидат слушается earshot.match(описание, альтернативы): z — насколько описание выделяется
среди словаря earshot (≥3 уверенно, 2–3 правдоподобно), margin — отрыв от альтернатив (чем меньше путаницы, тем лучше).
Результат: sound/lib/audition.json (все оценки) и sound/palette_auto.json (лучший кандидат класса, если он не синтез —
путь к файлу; синтез остаётся по умолчанию в render.py). Файлы банка/синтеза — sound/lib/cand/<класс>/.
"""
import argparse, json, sys, warnings
from pathlib import Path
import numpy as np
import soundfile as sf

warnings.filterwarnings('ignore')
HERE = Path(__file__).resolve().parent.parent; L = HERE.parent
sys.path.insert(0, str(HERE))
import synth  # noqa: E402

# класс: (описание, альтернативы-путаницы, кандидаты банка earshot [(id, dur, apex)], длительность синтеза)
SPEC = {
    'snap': ('a short fast tight whoosh of a quick camera zoom', ['a door slam', 'a gunshot', 'a click'],
             [('swish/flick', .32, .11), ('swish/blade', .37, .06), ('whoosh_fast/tight', .4, .16), ('swish/zing', .4, .065)], None),
    'whoosh.whip': ('a fast whip pan whoosh transition', ['wind blowing', 'a car passing', 'a jet plane'],
                    [('whoosh_fast/whip', .6, .12), ('whoosh_fast/crisp', .6, .13), ('swish/cane', .5, .07), ('whoosh_fast/sleeve', .6, .16)], None),
    'whoosh.air': ('a soft airy whoosh of a camera flying through the air', ['wind blowing', 'an explosion', 'a car passing'],
                   [('whoosh_big/gust', 1.2, .5), ('whoosh_big/swell', 1.2, .43), ('whoosh_big/cape', 1.2, .46)], None),
    'whoosh.zoomin': ('a reverse whoosh sucking in quickly', ['a gunshot', 'wind blowing', 'a vacuum cleaner'],
                      [('whoosh_fast/reverse', .5, .29), ('reverse_swell/short', .65, None), ('reverse_swell/cymbal', .9, None)], None),
    'hit.punch': ('a punchy low cinematic hit', ['a door slam', 'a gunshot', 'a kick drum'],
                  [('cut_hit/punch', .3, None), ('cut_hit/kick', .33, None), ('pro_impact/short', .5, None), ('impact/punch', .6, None), ('sub_drop/punch', .5, None)], None),
    'hit.card': ('a deep soft cinematic boom', ['thunder', 'a door slam', 'a kick drum'],
                 [('cut_hit/sub', .6, None), ('sub_drop/long', .9, None), ('pro_sub_drop/soft', .8, None), ('pro_impact/deep', 1.0, None), ('cut_hit/rumble', 1.0, None)], None),
    'sting.title': ('a dramatic cinematic title hit with a deep boom', ['thunder', 'an explosion', 'a gong'],
                    [('impact/deep', 3.0, None), ('impact/classic', 3.0, None), ('pro_impact/deep', 2.5, None), ('pro_logo_sting/swell_sting', 2.5, None)], None),
    'sting.chapter': ('a dark cinematic piano chord hit with a low boom', ['a gong', 'thunder', 'an organ'],
                      [('logo_sting/soft_bloom', 2.0, None), ('pro_logo_sting/sweep_hit', 2.0, None), ('pro_logo_sting/swell_sting', 2.0, None), ('impact/swell', 2.5, None), ('pro_impact/swell', 2.0, None)], None),
    'riser.title': ('a tense cinematic riser building up', ['a siren', 'a jet plane', 'wind blowing'],
                    [('riser/tension', 1.6, None), ('riser/build', 1.6, None), ('riser/dark', 1.0, None), ('pro_riser/roll', 1.6, None), ('riser/swell', 1.6, None)], None),
    'shutter': ('a mechanical film camera shutter click', ['a gunshot', 'a stapler', 'a keyboard key press'],
                [('shutter/film', .28, None), ('shutter/mirror', .33, None), ('shutter/dslr', .24, None), ('shutter/snap', .14, None)], None),
    'type.run': ('an old mechanical typewriter typing', ['a keyboard typing', 'a clock ticking', 'rain'],
                 [('typing_key/thock', .2, None), ('typing_key/crisp', .2, None), ('pro_typing_run/soft', .5, None), ('pro_typing_run/tick', .5, None)], .4),
    'glint': ('a tiny bright glass ting sparkle', ['a bell', 'a phone notification', 'a triangle'],
              [('shimmer/m0', .6, None), ('pro_shimmer/m1', .6, None), ('notify/mid_tine', .4, None), ('mallet/glock', .5, None), ('pro_click/tink', .2, None)], None),
    'tablet.ping': ('a soft notification chime', ['a doorbell', 'a phone ringing', 'a bell'],
                    [('pro_notify/ding_1930', .5, None), ('notify/m2', .5, None), ('notify/mid_wood', .5, None)], None),
    'tag.pop': ('a small paper label popping onto a board', ['a balloon pop', 'a gunshot', 'a click'],
                [('pop/0', .2, None), ('pro_pop/thup', .25, None), ('ui_pop/soft', .2, None), ('swipe/paper', .3, .1)], None),
    'ui.slide': ('a soft quick swoosh', ['wind blowing', 'a whip crack', 'paper rustling'],
                 [('swipe/glide', .4, .12), ('swipe/paper', .4, .12), ('swish/soft', .5, .11)], None),
    'box.tap': ('a finger tapping on a cardboard box', ['a door knock', 'a drum', 'footsteps'],
                [('knock/desk', .22, None), ('tap/knuckle', .2, None), ('tap/table', .2, None), ('pro_tap/knock', .2, None)], None),
    'switch.click': ('a desk lamp switch click', ['a gunshot', 'a keyboard key press', 'a stapler'],
                     [('toggle/latch', .15, None), ('toggle/on', .15, None), ('toggle/rocker', .15, None), ('fit/snap/switch_flip', .18, None)], None),
    'stamp': ('a rubber stamp slammed onto paper on a wooden desk', ['a door slam', 'a gunshot', 'a book dropped'],
              [('knock/desk', .22, None), ('tap/table', .25, None), ('impact/punch', .4, None), ('cut_hit/punch', .3, None)], None),
    'phone.ring': ('an old telephone bell ringing', ['a bicycle bell', 'an alarm clock', 'a doorbell'], [], .9),
    'glass.clink': ('two wine glasses clinking in a toast', ['a bell', 'a spoon on a cup', 'a triangle'], [('fit/bell/small_bell', .8, None)], None),
    'marker.write': ('a marker pen writing on paper', ['paper rustling', 'scratching', 'a pencil writing'], [], 1.0),
    'paper.slide': ('a sheet of paper sliding across a desk', ['wind blowing', 'cloth rustling', 'sandpaper'], [('swipe/paper', .6, .3), ('swipe/velvet', .6, .3)], .6),
    'photo.drop': ('a photograph dropping onto a table', ['a book dropped', 'a slap', 'a door knock'], [('swipe/paper', .3, .1), ('tap/table', .2, None)], None),
    'key.jingle': ('keys jingling', ['coins jingling', 'a bell', 'chains rattling'], [], None),
    'af.beep': ('a camera autofocus beep', ['a microwave beep', 'a phone notification', 'an alarm'], [('hover_tick/ping', .1, None), ('pro_notify/ding_2296', .3, None)], None),
    'water.splash': ('a mop splashing into a bucket of water', ['rain', 'a toilet flush', 'pouring water'], [('drip/drop', .3, None)], None),
    'string.pull': ('a string being pulled tight with friction', ['a violin', 'a zipper', 'scratching'], [('pro_zip/arc', .4, None), ('pro_zip/down_warm', .4, None)], .45),
    'pin.pop': ('a small pop of a pin dropping onto a map', ['a balloon pop', 'a click', 'a water drop'], [('pop/2', .25, None), ('drip/bloop', .3, None), ('pro_pop/boop', .25, None)], None),
}


def save(p, y):
    p.parent.mkdir(parents=True, exist_ok=True); sf.write(str(p), np.asarray(y, np.float32), synth.SR, subtype='PCM_24')


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--classes', default=None); ap.add_argument('--rec', default=None)
    a = ap.parse_args()
    from earshot import api
    classes = a.classes.split(',') if a.classes else list(SPEC)
    rec = {}
    if a.rec and Path(a.rec).exists():
        led = json.load(open(a.rec, encoding='utf-8'))
        for e in (led if isinstance(led, list) else led.get('files', [])):
            for c in (e.get('classes') or ([e['class']] if e.get('class') else [])):
                rec.setdefault(c, []).append(e)
    out = json.load(open(HERE / 'lib/audition.json', encoding='utf-8')) if (HERE / 'lib/audition.json').exists() else {}
    for c in classes:
        desc, alts, bank, sdur = SPEC[c]; cands = []
        for k in (1, 2, 3):
            p = HERE / f'lib/cand/{c}/syn_{k}.wav'; save(p, synth.make(c, k, sdur)); cands.append(('syn', f'syn_{k}', p))
        for bid, dur, apex in bank:
            p = HERE / f'lib/cand/{c}/bank_{bid.replace("/", "_")}.wav'
            try: api.sfx_render(bid, str(p), dur=dur, apex=apex); cands.append(('bank', bid, p))
            except Exception as e: print('bank skip', bid, e)
        for p in sorted((HERE / f'lib/cand/{c}').glob('layer_*.wav')):   # составные (tools/layers.py)
            cands.append(('layer', p.stem, p))
        for p in sorted((HERE / f'lib/cand/{c}').glob('rec_*.wav')):     # записи CC0, положенные кандидатами
            cands.append(('rec', p.stem, p))
        for e in rec.get(c, []):
            pp = Path(e['path']); pp = pp if pp.is_absolute() else (HERE / pp if (HERE / pp).exists() else L / pp)
            cands.append(('rec', e.get('id'), pp))
        res = []
        for kind, name, p in cands:
            try:
                r = api.match(str(p), desc, alts=alts)
                q = (r.get('queries') or [r])[0] if isinstance(r, dict) else r
                z = q.get('z') if isinstance(q, dict) else None
                res.append({'kind': kind, 'name': name, 'path': str(p.relative_to(L)).replace('\\', '/'), 'z': z,
                            'verdict': q.get('verdict') if isinstance(q, dict) else None, 'margin': q.get('margin') if isinstance(q, dict) else None,
                            'summary': r.get('summary') if isinstance(r, dict) else str(r)[:200]})
            except Exception as ex:
                res.append({'kind': kind, 'name': name, 'path': str(p), 'error': str(ex)[:200]})
        res.sort(key=lambda x: -(x.get('z') or -99))
        out[c] = {'desc': desc, 'alts': alts, 'ranked': res}
        print(c, ' | '.join(f"{x['kind']}:{x['name']} z={x.get('z')}" for x in res[:4]), flush=True)
        json.dump(out, open(HERE / 'lib/audition.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
