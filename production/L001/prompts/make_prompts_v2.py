# -*- coding: utf-8 -*-
"""Промпты фонов L001, партия 2 (по shotlist.md). Запуск: python make_prompts_v2.py -> prompts/*.txt + jobs3.json"""
import json, os
os.chdir(os.path.dirname(os.path.abspath(__file__)) + '/..')

HEAD = "Background plate for a 2D-animated documentary, 16:9 landscape, 1920x1080 or larger. NO characters, NO people, NO text.\n\n"
STYLE = ("STYLE: hand-painted 2D animation background, like a high-end animated series or a modern cartoon film — cel-shaded flat "
         "colour fills with 2–3 tone steps of soft shading, clean simple shapes, smooth gradients, NO photographic textures, NO "
         "realistic fabric weave or reflections, NO film grain noise. Clean slightly-rounded forms that match flat 2D stick figures "
         "with thick dark outlines. Dark ink outlines on all shapes. {mood}\n\n")
NOIR = ("Keep a cinematic NOIR mood: deep navy and teal shadows, warm amber practical lights, a few neon accents, soft glow around "
        "lights, gentle haze, subtle vignette.")
COLD = ("Mood: cold NOIR — deep steel-blue and slate shadows, cold moonlight through blinds, only one small warm lamp, gentle haze, "
        "subtle vignette. NO rain anywhere.")
RED = ("Mood: dark crimson NOIR — near-black shadows, deep red and maroon walls, one hanging lamp casting a warm pool on the desk, "
       "gentle haze, strong vignette. NO rain.")
WARM = ("Mood: warm nostalgic DAYTIME version of the same painted world — golden afternoon sunlight, cream, orange and soft teal "
        "palette, long soft shadows, light haze, gentle vignette. NO rain, NO night.")
REF_WORLD = ("REFERENCE: the attached image is the approved background of this series. Match its painted style exactly — same "
             "outline weight, same flat cel fills, same haze — so this plate looks like the same animated world. Do NOT copy its "
             "content or layout. No signage with readable letters, no logos, no people, no silhouettes of people.\n\n")
REF_SAME = ("REFERENCE: the attached image shows THIS SAME ROOM. Keep the same furniture, materials, colours, outline weight and "
            "painted style, so a viewer reads it as the same place. No readable letters, no logos, no people.\n\n")
REF_REVERSE = ("REFERENCE: the attached image shows THIS SAME ROOM seen from the opposite direction. Now show the REVERSE ANGLE "
               "(the other side of the room, as if the camera turned around 180 degrees). Same materials, furniture style, colours, "
               "outline weight and painted style, so cutting between the two reads as one place. No readable letters, no logos, "
               "no people.\n\n")
R = 'refs/bg_restaurant_v2.png'
J = []
def job(name, mood, ref_line, ref, framing):
    p = f'prompts/{name}.txt'
    open(p, 'w', encoding='utf-8').write(HEAD + STYLE.format(mood=mood) + ref_line + 'FRAMING: ' + framing + '\n')
    J.append({'out': f'raw/{name}.png', 'promptFile': p, 'refs': [ref], 'refMode': 'material'})

# --- новые места ---
job('bg_beijing_office', RED, REF_WORLD, R,
    "WIDE-MEDIUM shot of a dim government office in Beijing at night. Centre: a heavy dark-wood desk under one hanging lamp, a single "
    "closed folder and an empty photo frame on the desk, an empty high-backed chair behind it with space for a seated figure (torso "
    "above desk). Heavy red curtains, lacquered wood panels, a tall window with a faint city glow. Camera at seated eye level, centred.")
job('bg_car_interior', NOIR, REF_WORLD, 'raw/bg_singapore_street.png',
    "MEDIUM shot from the back seat of a parked dark sedan at night: two empty front seats (space for two seated agents, seen from "
    "behind/three-quarter), dashboard glow, a reel-to-reel tape recorder on the centre console, rain drops on the windshield. Through "
    "the side window on the right: a lit restaurant window with red curtains and a candle across the wet street (as in the reference). ")
job('bg_dorm_room', WARM, REF_WORLD, 'raw/bg_kentucky_dorm.png',
    "WIDE shot of a 1970s rural boarding-school dorm room: two iron bunk beds, a small barbell on the worn wooden floor, a shelf with "
    "a few books, a window with farmland and a red barn in afternoon sun, a hanging bulb. Free floor space in the centre for two "
    "standing figures. Camera at standing eye level.")
job('bg_event_hall', NOIR, REF_WORLD, R,
    "WIDE shot of a tech conference hall seen from the audience: a stage with a lectern and a huge blank glowing screen, amber "
    "spotlights and green accent strips, rows of empty chairs in the foreground, haze in the spotlight beams. No logos, no text.")
job('bg_customs_gate', NOIR, REF_WORLD, 'raw/bg_singapore_street.png',
    "WIDE shot of a port customs checkpoint at night: a booth with a counter window and a desk lamp inside, a red-and-white barrier "
    "arm across a dry road, sodium street lamps, stacked containers and a gantry crane behind. Road space in front for a truck and a "
    "standing officer. NO rain, dry asphalt.")
job('bg_newsroom', NOIR, REF_WORLD, R,
    "WIDE shot of a newspaper newsroom at night: desks with glowing monitors and paper stacks, amber desk lamps, Venetian blinds, "
    "a wall-mounted TV in a hallway on the right (blank glowing screen), space between desks for standing figures.")
job('bg_front_door', NOIR, REF_WORLD, R,
    "MEDIUM-WIDE shot of a suburban house front porch at night: a wooden front door with a small window, a glowing porch light, two "
    "steps, a mailbox, a quiet dark lawn, trees. Space on the porch for two standing figures. NO rain.")
job('bg_desk_topdown', NOIR, REF_WORLD, R,
    "STRAIGHT TOP-DOWN view (camera looking straight down) of a dark wooden desk with a green leather inlay, the centre left EMPTY "
    "for props (papers and photos will be added later), a warm pool of lamp light from the upper-left corner, edges falling into "
    "shadow, a pen and a coffee ring near the edges only.")
# --- тёплые версии гл. 2 ---
job('bg_diner_day', WARM, REF_SAME, 'raw/bg_diner_booth.png',
    "The SAME diner booth as the reference, same layout and camera, but in warm late-afternoon daylight: sunny street and parking lot "
    "outside the window, no rain, soft orange and cream light on the table.")
job('bg_kentucky_day', WARM, REF_SAME, 'raw/bg_kentucky_dorm.png',
    "The SAME 1970s boarding-school bathroom as the reference, same layout and camera, but in warm morning daylight: sunny farm "
    "fields in the window, no rain, golden light on the tiles; mop and bucket in the centre.")
# --- перекраска и без дождя ---
job('bg_washington_cold', COLD, REF_SAME, 'raw/bg_washington_office.png',
    "The SAME Washington office as the reference, same layout and camera (desk, green lamp, beige phone, folders, chair, window "
    "with Capitol dome, flag), but recoloured cold blue: clear cold night outside, NO rain; the green lamp is the only warm light.")
job('bg_nvidia_office_dry', NOIR, REF_SAME, 'raw/bg_nvidia_ceo_office.png',
    "The SAME CEO office as the reference, same layout and camera, but the night outside the windows is clear and DRY — NO rain "
    "streaks, calm campus lights and palm trees.")
job('bg_taipei_bar_dry', NOIR, REF_SAME, 'raw/bg_taipei_bar.png',
    "The SAME bar as the reference, same layout and camera, but the window shows a clear dry night over Taipei with neon — NO rain.")
# --- обратные точки ---
job('bg_washington_reverse', COLD, REF_REVERSE, 'raw/bg_washington_office.png',
    "REVERSE ANGLE of the Washington office: a heavy wooden door with a brass padlock and chain, a whiteboard on the wall (blank), "
    "closed blinds with cold moonlight stripes, a coat stand, the edge of the desk in the near foreground. Space for a standing official.")
job('bg_nvidia_office_reverse', NOIR, REF_REVERSE, 'raw/bg_nvidia_ceo_office.png',
    "REVERSE ANGLE of the CEO office: the door open to a long dim corridor, a floor-to-ceiling dark window over the campus at night "
    "on one side, the back of the leather chair and desk edge in the near foreground. Space for a standing figure by the door.")
job('bg_megaspeed_reverse', NOIR, REF_REVERSE, 'raw/bg_megaspeed_office.png',
    "REVERSE ANGLE of the office: seen from the server-room glass toward the desk and the office door with a blank nameplate, a "
    "window showing a different district of Singapore (shophouses and towers, NOT Marina Bay Sands), rain on the glass.")
job('bg_event_hall_reverse', NOIR, REF_REVERSE, 'raw/bg_event_hall.png',
    "REVERSE ANGLE from the stage into the audience: rows of seats in shadow, a press riser with tripods at the back, bright camera "
    "flash stars, spotlight beams toward the camera, haze. NO people drawn (crowd will be added later).")

json.dump(J[:-1], open('prompts/jobs3.json', 'w'), indent=1)           # всё, кроме зависящего от зала
json.dump(J[-1:], open('prompts/jobs4.json', 'w'), indent=1)           # обратная зала — после самого зала
print(len(J), 'prompts')
