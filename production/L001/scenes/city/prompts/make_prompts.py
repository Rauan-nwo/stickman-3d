# -*- coding: utf-8 -*-
"""Промпты рисованных плит для 3D-пролётов над городом (L001, сцена city).
Запуск: python make_prompts.py -> prompts/*.txt + prompts/jobs_<a|b|c>.json (пути от папки сцены)."""
import json, os
os.chdir(os.path.dirname(os.path.abspath(__file__)) + '/..')

# блок STYLE — дословно из production/L001/prompts/make_prompts_v2.py
STYLE = ("STYLE: hand-painted 2D animation background, like a high-end animated series or a modern cartoon film — cel-shaded flat "
         "colour fills with 2–3 tone steps of soft shading, clean simple shapes, smooth gradients, NO photographic textures, NO "
         "realistic fabric weave or reflections, NO film grain noise. Clean slightly-rounded forms that match flat 2D stick figures "
         "with thick dark outlines. Dark ink outlines on all shapes. {mood}\n\n")
NOIR = ("Keep a cinematic NOIR mood: deep navy and teal shadows, warm amber practical lights, a few neon accents, soft glow around "
        "lights, gentle haze, subtle vignette.")
COLD = ("Mood: cold NOIR — deep steel-blue and slate shadows, cold moonlight, only a few small warm lights, gentle haze, "
        "subtle vignette. NO rain anywhere.")
NEON = ("Keep a cinematic NOIR mood: deep navy and teal shadows, warm amber windows, saturated neon accents (teal, pink, amber), "
        "soft glow around lights, gentle haze. NO rain, dry clear night.")
REF_WORLD = ("REFERENCE: the attached image is the approved background of this series. Match its painted style exactly — same "
             "outline weight, same flat cel fills, same haze — so this plate looks like the same animated world. Do NOT copy its "
             "content or layout. No signage with readable letters, no logos, no people, no silhouettes of people.\n\n")
REF_SAME = ("REFERENCE: the attached image shows THIS SAME PLACE. Keep the same architecture, materials, colours, outline weight and "
            "painted style, so a viewer reads it as the same place. No readable letters, no logos, no people.\n\n")
HEAD = "Background element for a 2D-animated documentary, 16:9 landscape. NO characters, NO people, NO text.\n\n"
KEY = ("CUT-OUT (important — this element will be cut out automatically and placed into a 3D camera flight): paint the "
       "{what} on a perfectly FLAT, uniform, solid pure {key} background (exact colour {hexc}) that fills everything that is "
       "not the element — no sky, no ground, no gradient, no glow or haze bleeding onto the {key} area, no shadow on it. "
       "Keep a clean thick dark ink outline around the whole silhouette. Leave a margin of {key} around the element on all "
       "sides. Do not use {key} anywhere inside the element.\n\n")
G = dict(key='GREEN', hexc='#00FF00')
M = dict(key='MAGENTA', hexc='#FF00FF')

R = 'refs/bg_restaurant_v2.png'
JOBS = {'a': [], 'b': [], 'c': []}
def job(lane, name, mood, ref_line, ref, body, key=None, what=''):
    p = f'prompts/{name}.txt'
    txt = HEAD + STYLE.format(mood=mood) + ref_line + (KEY.format(what=what, **key) if key else '') + 'CONTENT: ' + body + '\n'
    open(p, 'w', encoding='utf-8').write(txt)
    JOBS[lane].append({'out': f'raw/{name}.png', 'promptFile': p, 'refs': [ref], 'refMode': 'material'})

# ---------- Сингапур ----------
job('a', 'sg_backdrop', NOIR + ' Light rain.', REF_WORLD, R,
    "A very WIDE panoramic far backdrop: night sky over a distant modern city skyline across a bay, seen from far away and slightly "
    "above. The skyline sits in the LOWER THIRD of the frame as a long band of distant towers with tiny warm and cool lit windows "
    "and a few teal and pink rooftop accents, hazy and soft, getting fainter toward the edges. NO famous landmarks, no Ferris wheel, "
    "no lotus building, no hotel with a roof deck (those are added separately). Below the skyline a thin dark band of trees and a "
    "line of warm waterfront lamps, then the bottom 10% is dark bay water with long painted reflection streaks. The upper two thirds "
    "is a dark navy-teal rainy night sky with soft layered painted clouds, faint diagonal rain streaks, a soft city glow near the "
    "horizon. Flat even composition (no foreground objects) so it can be used as a distant layer.")
job('b', 'sg_mbs', NOIR, REF_WORLD, R,
    "an iconic resort hotel like the one in the reference: three tall slender slab towers standing side by side, joined on top by "
    "one long boat-shaped sky deck that overhangs at both ends, with a row of small warm lights along the deck; the towers have "
    "dense grids of lit windows (mostly warm amber, some cool white, some dark), slightly leaning legs; next to its base on the "
    "left a smaller lotus-shaped white museum with petal fingers glowing warm from inside; a short strip of dark trees and a low "
    "waterfront promenade under both. Night lighting, seen from the side at eye level from far away, centred, filling about 80% "
    "of the frame height.", key=G, what='hotel, museum and their short base strip')
job('c', 'sg_wheel', NOIR, REF_WORLD, R,
    "a giant observation Ferris wheel at night, front view, its rim lined with glowing magenta-pink lights, thin spokes, small "
    "capsule cabins, standing on a slim dark support frame with a low dark terminal building and a strip of dark trees at the "
    "bottom. Centred, filling about 85% of the frame height.", key=G, what='Ferris wheel with its base')
job('a', 'sg_facade', NOIR + ' Rain.', REF_SAME, 'refs/bg_singapore_street.png',
    "FRONT ELEVATION (camera straight-on, at the height of the first floor, no perspective convergence) of the SAME restaurant "
    "as in the reference: the shophouse front with the red tiled awning roof, the big lit restaurant window with red curtains, "
    "a small round table with a white cloth, a glowing candle, a red flower vase and two wine glasses inside, two brass lanterns "
    "on the pillars, potted palms on both sides; the cream-coloured shophouse upper floor with tall shuttered windows glowing "
    "amber above it, and neighbouring shophouse arches at the left and right edges. The restaurant window is in the CENTRE of "
    "the frame and fills about 40% of the frame width. Bottom 15%: wet dark sidewalk with long warm reflection streaks. Above "
    "the cornice line of the upper floor (top 12% of the frame): a perfectly flat solid pure GREEN (#00FF00) area, no sky, so "
    "the roofline can be cut out.")
# ---------- Вашингтон ----------
job('b', 'dc_backdrop', COLD, REF_WORLD, 'refs/bg_washington_cold.png',
    "A very WIDE panoramic far backdrop: a clear cold night sky with a small bright full moon in the upper right third, a few "
    "thin painted cloud wisps, faint stars. In the LOWER THIRD: a long low band of a distant classical city — low stone office "
    "blocks with a few warm lit windows, dark rounded tree crowns, a slender obelisk far away on the left — all hazy steel-blue "
    "and getting fainter with distance. NO domed capitol building (it is added separately). Flat even composition, no "
    "foreground objects, so it can be used as a distant layer.")
job('c', 'dc_capitol', COLD, REF_WORLD, 'refs/bg_washington_cold.png',
    "a grand white neoclassical capitol building at night like the one in the reference window: a tall ribbed cast-iron dome on "
    "a ring of columns (drum) with a small statue on top, a wide central portico with columns, long symmetric side wings with "
    "rows of columns, floodlit warm-white from below so it glows against the cold blue night, cool blue shading on the shadow "
    "sides, a row of dark rounded trees along its base. Seen from the front at a slight high angle from far away, centred, "
    "filling about 85% of the frame width.", key=G, what='capitol building with its tree strip')
job('a', 'dc_window', COLD, REF_SAME, 'refs/bg_washington_cold.png',
    "FRONT ELEVATION from OUTSIDE (camera straight-on, hovering at the window height, no perspective convergence) of a stately "
    "dark stone government office building at night: a grid of tall dark windows with stone frames and cornices, cold blue "
    "moonlight on the stone. Exactly ONE window in the CENTRE of the frame is lit: through half-open horizontal blinds we see "
    "the warm glow of a green-shaded brass banker's lamp on a dark desk and the top of a maroon leather chair (the same office "
    "as the reference, seen from the street side); the lit window fills about 30% of the frame width and casts a soft warm "
    "light on the stone sill. All other windows are dark or very faintly lit cool blue.")
# ---------- Тайбэй ----------
job('b', 'tp_backdrop', NEON, REF_WORLD, R,
    "A very WIDE panoramic far backdrop: dry clear night sky over a distant dense Asian city at the foot of dark rounded "
    "mountains. In the LOWER THIRD: a long band of distant mid-rise towers with warm lit windows and a few small neon accents "
    "(teal, pink, amber) and a soft colourful glow; behind them the dark layered mountain ridges; upper part a navy sky with "
    "a few soft painted clouds lit from below by the city glow. NO very tall skyscraper (added separately). Flat even "
    "composition, no foreground objects, no readable letters, so it can be used as a distant layer.")
job('c', 'tp_101', NEON, REF_WORLD, 'refs/bg_event_hall.png',
    "a single supertall pagoda-like skyscraper at night like Taipei 101: a tall square tower made of eight stacked flaring "
    "segments, each segment slightly wider at the top, glowing teal-green and warm white lights along the segment edges, a "
    "thinner base block with lit windows, a slim spire on top, a few small dark lower buildings at its foot. Front view from "
    "far away, centred, filling about 90% of the frame height.", key=M, what='tower with the low buildings at its foot')
job('a', 'tp_hall', NEON, REF_SAME, 'refs/bg_event_hall.png',
    "FRONT ELEVATION from OUTSIDE (camera straight-on at about third-floor height, no perspective convergence) of a large modern "
    "exhibition and convention hall at night — the building whose inside is shown in the reference: a long low facade with a "
    "glass curtain wall glowing warm amber inside, dark steel frame, a wide canopy over the entrance, green accent light strips. "
    "Across the upper middle of the facade hangs ONE huge BLANK glowing banner (cream-white, completely empty, no letters, no "
    "logo) filling about 55% of the frame width. Wide plaza in the bottom 15% with a few street lamps. Above the roof line "
    "(top 15% of the frame): a perfectly flat solid pure GREEN (#00FF00) area, no sky, so the roof line can be cut out.")
# ---------- финал ----------
job('b', 'fin_backdrop', NOIR + ' NO rain, dry clear night.', REF_WORLD, R,
    "A very WIDE panoramic far backdrop: a vast night city seen from high above at the edge — in the LOWER 40% an endless sea of "
    "distant office towers and blocks receding to the horizon, thousands of tiny warm amber and cool white lit windows, some "
    "blocks darker, soft teal haze layers between the rows; upper part a deep navy night sky with long soft painted clouds and "
    "a faint warm city glow at the horizon. No famous landmarks, no readable letters. Flat even composition, no foreground objects.")

for k, v in JOBS.items():
    json.dump(v, open(f'prompts/jobs_{k}.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print({k: [j['out'] for j in v] for k, v in JOBS.items()})
