# -*- coding: utf-8 -*-
"""Плиты финала #298 (подъём над американским техкампусом). Запуск: python prompts/make_prompts_fin.py
-> prompts/fin_*.txt + prompts/jobs_fin_<near|mid|sky>.json (по одной задаче — три параллельных прогона gpt-image.ps1)."""
import json, os
os.chdir(os.path.dirname(os.path.abspath(__file__)) + '/..')
src = open('prompts/make_prompts.py', encoding='utf-8').read().split("R = 'refs/bg_restaurant_v2.png'")[0]
ns = {'__file__': os.path.abspath('prompts/make_prompts.py')}; exec(src, ns); os.chdir(os.path.dirname(os.path.abspath('prompts/make_prompts.py')) + '/..')                                   # STYLE, REF_WORLD, HEAD — те же блоки, что у остальных плит
STYLE, REF_WORLD, HEAD = ns['STYLE'], ns['REF_WORLD'], ns['HEAD']
MOOD = ("Keep a cinematic NOIR mood: deep navy and steel-blue shadows, cool teal glass reflections, warm amber light only in a "
        "few office windows, soft glow around lights, gentle haze, subtle vignette. Dry clear night, NO rain.")
REF = 'refs/bg_washington_cold.png'
GREEN = ("Above the roof line the WHOLE area up to the top edge is a perfectly flat, uniform, solid pure GREEN (#00FF00) — no sky, "
         "no glow or haze bleeding onto it — so the roof line can be cut out. Do not use green anywhere else.")
JOB = {
 'fin_near': "FRONT ELEVATION from outside (camera straight-on at second-floor height, no perspective convergence, flat facade "
   "filling the full frame width) of a modern American tech-company office building at night: four storeys, a glass curtain wall "
   "in a dark steel grid, most panes dark with faint teal reflections, a few dim offices. EXACTLY ONE big window in the CENTRE of "
   "the second floor is brightly lit warm amber: one single wide pane WITHOUT mullions, about 24% of the frame width and 17% of the "
   "frame height; inside it an open-plan office seen straight-on: a plain warm wall, a long desk across the lower part with one "
   "glowing computer monitor and a small desk lamp on the LEFT half of the desk, the RIGHT half of the desk empty; NO people, NO "
   "chairs, NO plants in that window. Slim dark roof parapet with small rooftop units. In front of the building at the far left: a "
   "tall flagpole with an American flag hanging softly, lit from below by a small spotlight. Bottom 12%: a paved plaza, a low "
   "hedge, two small ground lights. " + GREEN + " The green area is the top 18% of the frame.",
 'fin_mid': "A WIDE panoramic front view, seen from slightly above, of an American technology company campus at night: a row of "
   "very DIFFERENT buildings with clearly varied rooftops and heights — on the left a long low building with a sawtooth roof; "
   "a stepped glass office block with a dark roof garden; in the CENTRE the tallest one, a sleek glass headquarters with a slim "
   "glowing crown of light on its roof; a round low building with a lit inner ring; a parking structure with lit levels on the "
   "right. Glass walls mostly dark blue-teal with scattered warm lit offices, rooftop units, two small red aircraft lights. Dark "
   "round trees and small path lamps between the buildings along the bottom. The buildings fill the lower 70% of the frame. "
   + GREEN,
 'fin_sky': "A very WIDE panoramic far backdrop: a dramatic night sky with large soft layered painted clouds lit faintly from below "
   "by city glow, a thin crescent moon high on the left, over a distant American city near a bay. The horizon is at about 60% from "
   "the top. ONE hero skyscraper slightly right of centre rises well above everything else: tall, slender, glass, with a lit crown "
   "at the top and a thin spire with a red light. Around it a band of distant towers of varied heights with tiny warm and cool lit "
   "windows, hazy and softer toward the edges. Below the skyline: dark low hills with tiny lights and a sliver of dark bay water "
   "with soft reflections in the bottom 15%. No foreground objects.",
}
for name, body in JOB.items():
    p = f'prompts/{name}.txt'
    open(p, 'w', encoding='utf-8').write(HEAD + STYLE.format(mood=MOOD) + REF_WORLD + 'CONTENT: ' + body + '\n')
    json.dump([{'out': f'raw/{name}.png', 'promptFile': p, 'refs': [REF], 'refMode': 'material'}],
              open(f'prompts/jobs_{name}.json', 'w', encoding='utf-8'), indent=1)
    print(p)
