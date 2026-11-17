# -*- coding: utf-8 -*-
"""Плиты двух новых пролётов: towers (#2 / #79 — зелёная башня выше всех) и alaska (#300 — борт на Аляске).
Запуск: python prompts/make_prompts_d03.py -> prompts/<name>.txt + prompts/jobs_<lane>.json (лейны d3a, d3b, d3c)."""
import json, os
os.chdir(os.path.dirname(os.path.abspath(__file__)) + '/..')
src = open('prompts/make_prompts.py', encoding='utf-8').read().split("R = 'refs/bg_restaurant_v2.png'")[0]
ns = {'__file__': os.path.abspath('prompts/make_prompts.py')}; exec(src, ns)
os.chdir(os.path.dirname(os.path.abspath('prompts/make_prompts.py')) + '/..')
STYLE, REF_WORLD, HEAD, KEY = ns['STYLE'], ns['REF_WORLD'], ns['HEAD'], ns['KEY']
G, M = ns['G'], ns['M']
NOIR = ns['NOIR']
COLD = ("Mood: cold dusk NOIR — deep blue-violet and slate shadows, snow lit cold blue, the last thin warm orange glow low on the "
        "horizon, small warm amber lights, gentle haze, subtle vignette. Dry, no falling snow painted.")
GREEN_TOP = ("Above the roof line the WHOLE area up to the top edge is a perfectly flat, uniform, solid pure GREEN (#00FF00) — no "
             "sky, no glow bleeding onto it — so the roof line can be cut out. Do not use green anywhere else.")
LANES = {'d3a': [], 'd3b': [], 'd3c': []}
def job(lane, name, mood, ref, body, key=None, what='', extra=''):
    p = f'prompts/{name}.txt'
    txt = HEAD + STYLE.format(mood=mood) + REF_WORLD + (KEY.format(what=what, **key) if key else '') + 'CONTENT: ' + body + extra + '\n'
    open(p, 'w', encoding='utf-8').write(txt)
    LANES[lane].append({'out': f'raw/{name}.png', 'promptFile': p, 'refs': [ref], 'refMode': 'material'})

job('d3a', 'tw_green', NOIR, 'refs/bg_event_hall.png',
    "ONE single very tall, slender modern corporate skyscraper at night, straight front view at mid height, centred, filling about "
    "94% of the frame height and only about 20% of the frame width. Dark charcoal-black glass facade with a dense grid of small "
    "windows, many lit warm and some cool; ONE bold continuous vertical glowing stripe of vivid lime-green (#76B900) running the "
    "full height up the centre of the facade, and thin green-lit edges on both corners. The top steps in twice into a slim crown "
    "with a soft green halo glow and one thin antenna spire with a small red light. A short dark base with a lit lobby at the "
    "bottom. NO logo, NO letters, NO numbers anywhere.", key=M, what='skyscraper')
job('d3b', 'ak_jet', COLD, 'refs/bg_washington_cold.png',
    "A large four-engine wide-body jumbo jet parked, seen exactly from the LEFT SIDE (nose pointing to the LEFT), at eye level, "
    "filling about 92% of the frame width. Presidential-style livery: pale sky-blue upper fuselage and tail, white middle band, "
    "darker royal-blue lower fuselage, a thin gold cheat line; the cockpit windows and a row of small passenger windows lit warm. "
    "NO text, NO letters, NO numbers, NO seal, NO flag, NO emblem anywhere. A white mobile boarding stair truck stands at the "
    "FORWARD door (near the nose): the stairs rise diagonally from the ground on the LEFT up to the open forward door on the "
    "RIGHT, with railings; the open door glows warm. Landing gear and engines clearly drawn. A thin strip of snowy tarmac under "
    "the wheels only.", key=G, what='jet, stair truck and the thin tarmac strip under them')
job('d3c', 'ak_backdrop', COLD, 'refs/bg_washington_cold.png',
    "A very WIDE panoramic far backdrop at dusk in Alaska: a long range of jagged snow-covered mountains across the middle of the "
    "frame, their snow lit cold blue with a faint warm rim from the last light; above them a deep blue-violet dusk sky with soft "
    "layered painted clouds and a few stars; a thin warm orange glow along the horizon behind the peaks. At the foot of the "
    "mountains, far away: a flat snowy airfield with long rows of tiny blue taxiway lights and amber apron lights, a distant "
    "control tower with a lit cab, low hangars with snow on their roofs. The horizon line (foot of the mountains) is at about 62% "
    "from the top. The bottom 25% is flat snowy ground fading into haze. No aircraft, no foreground objects.")
job('d3a', 'ak_terminal', COLD, 'refs/bg_washington_cold.png',
    "FRONT ELEVATION (straight-on, no perspective) of a long row of small-airport buildings at dusk: on the left a big arched "
    "aircraft hangar with thick snow on its curved roof and a wide open door glowing warm inside; a low terminal building with a "
    "row of warm lit windows and snow on the flat roof; a small slender control tower with a lit glass cab; tall light poles with "
    "warm lamps; snow banks along the bottom. The buildings fill the lower 60% of the frame. NO letters, NO signs with text. "
    + GREEN_TOP)
for lane, jobs in LANES.items():
    json.dump(jobs, open(f'prompts/jobs_{lane}.json', 'w', encoding='utf-8'), indent=1)
    print(lane, [j['out'] for j in jobs])
