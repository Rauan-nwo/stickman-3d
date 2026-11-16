# -*- coding: utf-8 -*-
"""Фоны L001, партия 3 — под правки compare_scenes.md («Что нужно нарисовать»). Запуск: python make_prompts_v3.py
Текст (HUANG, 7ROAD и т. п.) на фоны не рисуем — это накладки кодом."""
import json, os
D = os.path.dirname(os.path.abspath(__file__)); os.chdir(D + '/..')
src = open(os.path.join(D, 'make_prompts_v2.py'), encoding='utf-8').read()
exec(src.split('J = []')[0])   # константы стиля из партии 2
J = []
def job(name, mood, ref_line, ref, framing):
    p = f'prompts/{name}.txt'
    open(p, 'w', encoding='utf-8').write(HEAD + STYLE.format(mood=mood) + ref_line + 'FRAMING: ' + framing + '\n')
    J.append({'out': f'raw/{name}.png', 'promptFile': p, 'refs': [ref], 'refMode': 'material'})
DUSK = WARM.replace('golden afternoon sunlight', 'warm sunset light').replace('NO rain, NO night.', 'NO rain.')

# --- новые места ---
job('bg_relatives_porch', DUSK, REF_WORLD, 'raw/bg_dorm_room.png',
    "MEDIUM-WIDE shot of a modest 1970s American family house porch at warm sunset: wooden porch with a bench, a screen door, "
    "a small table with a lemonade jug, a mailbox, a lawn and a tree. Free space on the porch for two adults and two small boys "
    "with suitcases standing. Nostalgic, warm, cozy.")
job('bg_dennys_dishpit', WARM, REF_WORLD, 'raw/bg_diner_day.png',
    "MEDIUM shot of a 1970s diner kitchen dish pit in warm afternoon light: a big steel sink with steam, a tall leaning tower of "
    "dirty plates, a rubber apron on a hook, tiles, a small window with sun. Free space in front of the sink for a standing teenager.")
job('bg_blocked_warehouse', COLD, REF_WORLD, R,
    "WIDE shot of a cold blue tech warehouse at night: tall shelves of identical boxes with a green stripe (no logos), a section "
    "fenced off with red-and-white barrier tape, hanging cold lamps, a pallet jack, a concrete floor. Space for a standing figure "
    "with a clipboard.")
job('bg_closed_room', COLD, REF_WORLD, 'raw/bg_washington_cold.png',
    "MEDIUM-WIDE shot of a windowless secure briefing room in Washington: a round dark table with a green felt top and four "
    "leather chairs, one thick folder on the table, a red light above a heavy steel door, wood panelling, a single hanging lamp. "
    "Space for two seated aides.")
job('bg_trading_desk', NOIR, REF_WORLD, 'raw/bg_newsroom.png',
    "MEDIUM-WIDE shot of a trading desk at night: a long desk with six glowing monitors showing red downward charts (no "
    "readable text or numbers), a wall of red ticker screens behind, two empty office chairs, a coffee cup, amber desk lamp.")
job('bg_desk_restaurant_top', NOIR, REF_SAME, R,
    "STRAIGHT TOP-DOWN view (camera looking straight down) of the SAME restaurant table as the reference: a round table with a "
    "cream tablecloth, a candle in a glass in the centre, a small vase with red flowers, two wine glasses, two plates, the tops of "
    "two red velvet chairs on opposite sides. Warm candle light, dark floor around.")
job('bg_desk_dennys_top', WARM, REF_SAME, 'raw/bg_diner_day.png',
    "STRAIGHT TOP-DOWN view (camera looking straight down) of the SAME diner table as the reference: red-and-cream plastic "
    "tabletop, three coffee mugs, a ketchup bottle, a plate of pancakes, an empty paper napkin in the centre (clean, for a drawing "
    "to be added later), warm afternoon light.")
# --- варианты существующих ---
job('bg_diner_night_1997', NOIR, REF_SAME, 'raw/bg_diner_booth.png',
    "The SAME diner booth as the reference, same layout and camera, at night with rain on the window, slightly older and more worn "
    "(1997 mood): a crumpled napkin, two coffee mugs, a calculator on the table.")
job('bg_street_no_car', NOIR, REF_SAME, 'raw/bg_singapore_street.png',
    "The SAME rainy Singapore street as the reference, same layout and camera, but the parked car on the left is GONE: in its "
    "place a dry rectangle on the wet asphalt where a car stood, rain falling around it.")
job('bg_front_door_huang', NOIR, REF_SAME, 'raw/bg_front_door.png',
    "The SAME house porch as the reference, same layout and camera, but upscale and calm: a leather jacket hangs on a coat hook "
    "visible through the door's glass panel, a soft green light glows in a side window, the mailbox has a blank name plate.")
job('bg_megaspeed_reverse_7road', NOIR, REF_SAME, 'raw/bg_megaspeed_reverse.png',
    "The SAME office as the reference, same layout and camera, earlier era: the door has a blank sign plate (no text) and a cute "
    "cartoon game mascot poster on the wall (a round creature, no text), a few gaming figurines on a shelf.")

json.dump(J, open('prompts/jobs6.json', 'w'), indent=1)
print(len(J), 'prompts')
