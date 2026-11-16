# -*- coding: utf-8 -*-
"""Промпты плит для сцены «повара» (L001, гл. 2). Запуск: python make_prompts.py -> prompts/*.txt + jobs.json"""
import json, os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
HEAD = "Background plate for a 2D-animated documentary, 16:9 landscape, 1920x1080 or larger. NO characters, NO people, NO text.\n\n"
STYLE = ("STYLE: hand-painted 2D animation background, like a high-end animated series or a modern cartoon film — cel-shaded flat "
         "colour fills with 2–3 tone steps of soft shading, clean simple shapes, smooth gradients, NO photographic textures, NO "
         "realistic fabric weave or reflections, NO film grain noise. Clean slightly-rounded forms that match flat 2D stick figures "
         "with thick dark outlines. Dark ink outlines on all shapes. {mood}\n\n")
NOIR = ("Keep a cinematic NOIR mood: deep navy and teal shadows, warm amber practical lights, a few neon accents, soft glow around "
        "lights, gentle haze, subtle vignette.")
REF_WORLD = ("REFERENCE: the attached image is the approved background of this series. Match its painted style exactly — same "
             "outline weight, same flat cel fills, same haze — so this plate looks like the same animated world. Do NOT copy its "
             "content or layout. No signage with readable letters, no logos, no people, no silhouettes of people.\n\n")
R = 'refs/bg_restaurant_v2.png'
J = []
def job(name, framing):
    p = f'prompts/{name}.txt'
    open(p, 'w', encoding='utf-8').write(HEAD + STYLE.format(mood=NOIR) + REF_WORLD + 'FRAMING: ' + framing + '\n')
    J.append({'out': f'raw/{name}.png', 'promptFile': p, 'refs': [R], 'refMode': 'material'})

job('bg_kitchen_one',
    "WIDE shot of a warm old restaurant kitchen at night that opens straight into a long, empty banquet hall. Camera at standing "
    "eye level (about 1.6 m), looking straight ahead, strict ONE-POINT PERSPECTIVE with the vanishing point at about 60% of the "
    "frame width from the left and 42% of the height from the top; the horizon is level. LEFT THIRD: a big black cast-iron "
    "cooking range against the left wall with two small blue-and-orange gas flames, a copper range hood with a warm lamp under it, "
    "copper pots and ladles hanging on a rail, white subway tiles glowing in warm amber light, a shelf with jars. In front of the "
    "range, in the lower-left, keep a clear area of floor for a standing cook. CENTRE and RIGHT: the floor is large black-and-cream "
    "checkered tiles drawn as clean flat squares, receding straight to the vanishing point; the hall walls are dark navy wood "
    "panelling with small brass wall sconces receding in perspective; at the very far end a tall arched doorway with warm light and "
    "haze. A single straight row of warm pendant lamps hangs from the dark ceiling along the hall's centre line, receding toward the "
    "vanishing point. Keep the whole floor of the hall EMPTY: no tables, no chairs, no plates, no objects (a long banquet table "
    "will be composited later under the row of lamps). Warm amber light pools on the floor under each lamp, deep navy shadows "
    "between them.")
job('bg_crt_desk',
    "MEDIUM shot of a 1997 teenager's computer desk at night, front view, camera at seated eye level looking straight at the "
    "screen. A chunky beige CRT computer monitor stands in the centre of the frame, large: its screen is about 40% of the frame "
    "width, its front faces the camera squarely (not angled). The screen is plain dark glass — flat dark navy with only a faint "
    "curved glass highlight near one corner, NO image on it (an image will be composited later). Around it: a beige keyboard, a "
    "black joystick, a soda can, a small stack of game boxes without readable text, a small amber desk lamp on the left giving a "
    "warm pool of light, a corkboard with a few blank pinned cards on the wall, and on the right a window with a blue night "
    "city haze. Deep navy shadows, warm amber lamp, gentle haze.")
json.dump(J, open('jobs.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(J), 'jobs')
