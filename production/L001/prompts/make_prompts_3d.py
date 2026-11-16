# -*- coding: utf-8 -*-
"""Plates for the 3D scenes (desk3d, conveyor). Run: python make_prompts_3d.py -> scenes/*/prompts/*.txt + prompts/jobs_3d.json"""
import json, os, importlib.util
os.chdir(os.path.dirname(os.path.abspath(__file__)) + '/..')
# make_prompts_v2 writes files on import; only reuse its constants via exec of the header part
src = open('prompts/make_prompts_v2.py', encoding='utf-8').read().split(chr(10) + 'R = ')[0]
ns = {}; exec(src.replace("os.chdir(os.path.dirname(os.path.abspath(__file__)) + '/..')", ''), ns)
HEAD, STYLE, NOIR, COLD = ns['HEAD'], ns['STYLE'], ns['NOIR'], ns['COLD']
REF2 = ("REFERENCE: two images are attached. The FIRST is the approved background of this series — match its painted style exactly "
        "(same outline weight, flat cel fills, haze). The SECOND shows THIS SAME ROOM: keep its wall panelling, window, blinds, "
        "colours and mood so a viewer reads it as the same place. No readable letters, no logos, no people.\n\n")
REF1 = ("REFERENCE: the attached image is the approved background of this series. Match its painted style exactly — same "
        "outline weight, same flat cel fills, same haze — so this plate looks like the same animated world. Do NOT copy its "
        "content or layout. No signage with readable letters, no logos, no people, no silhouettes of people.\n\n")
R = 'refs/bg_restaurant_v2.png'
J = []
def job(scene, name, mood, ref_line, refs, framing):
    os.makedirs(f'scenes/{scene}/prompts', exist_ok=True)
    p = f'scenes/{scene}/prompts/{name}.txt'
    open(p, 'w', encoding='utf-8').write(HEAD + STYLE.format(mood=mood) + ref_line + 'FRAMING: ' + framing + '\n')
    J.append({'out': f'scenes/{scene}/raw/{name}.png', 'promptFile': p, 'refs': refs, 'refMode': 'material'})

job('desk3d', 'plate_wall', COLD, REF2, [R, 'assets/bg_washington_cold.png'],
    "The back wall of the SAME Washington office as the second reference, but EMPTY and seen CLOSER: NO desk, NO chair, NO lamp, "
    "NO telephone, NO folders, NO furniture in front of the wall at all. Centre: the tall window with half-lowered Venetian blinds "
    "(slats across the upper half), through the lower half the night city with the lit Capitol dome right of centre and a small moon; "
    "cold blue stripes of moonlight from the blinds falling on the wall beside the window. Left edge: dark bookshelf with books and a "
    "trailing plant; right: the US flag on a pole and a cold wall sconce. The BOTTOM QUARTER of the frame is plain dark wood wall "
    "panelling with nothing in front of it (a desk will be composited there later). Camera at seated eye level, straight on.")
job('conveyor', 'plate_lab', NOIR, REF1, [R],
    "WIDE, STRAIGHT-ON SIDE VIEW of the back wall of a night-time chip test lab / clean factory floor (flat frontal composition, no "
    "strong perspective): tall tinted glass clean-room windows with teal light behind them, metal equipment cabinets with small green "
    "and teal indicator lights, pipes and cable trays near the ceiling, two warm amber hanging work lamps with soft cones of light in "
    "haze, a green accent light strip along the wall. The BOTTOM THIRD of the frame is a plain dark floor and low wall with nothing on "
    "it (a 3D conveyor belt will be composited in front later). Even, calm composition that can be panned sideways. No text, no logos.")
json.dump(J, open('prompts/jobs_3d.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('ok', len(J))
