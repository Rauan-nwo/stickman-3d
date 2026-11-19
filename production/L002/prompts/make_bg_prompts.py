# -*- coding: utf-8 -*-
"""make_bg_prompts.py — промпты фонов L002 (GPT Image через скилл gpt-image) + пачка jobs_bg.json.
  python -X utf8 production/L002/prompts/make_bg_prompts.py
Стиль — блок STYLE из production/longform/style-test/bg_prompt_v2.txt (как в L001), референс материала —
refs/bg_restaurant_v2.png (утверждённый фон серии), -RefMode material. Оригиналы -> assets/raw/, затем увеличение до 1920×1080."""
import json, os

D = os.path.dirname(os.path.abspath(__file__))
HEAD = "Background plate for a 2D-animated documentary, 16:9 landscape, 1920x1080 or larger. NO characters, NO people, NO text.\n\n"
STYLE = ("STYLE: hand-painted 2D animation background, like a high-end animated series or a modern cartoon film — cel-shaded flat colour "
         "fills with 2–3 tone steps of soft shading, clean simple shapes, smooth gradients, NO photographic textures, NO realistic fabric weave "
         "or reflections, NO film grain noise. Clean slightly-rounded forms that match flat 2D stick figures with thick dark outlines. "
         "Dark ink outlines on all shapes. Mood: {mood}\n\n")
REF = ("REFERENCE: the attached image is the approved background of this series. Match its painted style exactly — same outline weight, "
       "same flat cel fills, same haze — so this plate looks like the same animated world. Do NOT copy its content or layout. No signage with "
       "readable letters, no logos, no brand marks, no people, no silhouettes of people. Screens and boards are blank or show only abstract "
       "shapes (text is added later).\n\n")
NIGHT = "NOIR night — deep navy and teal shadows, warm amber practical lights, a few neon accents, soft glow around lights, gentle haze, subtle vignette. NO rain."
WARM = "warm nostalgic DAYTIME flashback — soft golden sunlight, cream and honey tones, gentle haze, subtle vignette; still the same painted world. NO rain."
COLD = "cold corporate — steel-blue and slate shadows, cool white light, one or two warm accents, gentle haze, subtle vignette. NO rain."
STAGE = "broadcast stage — deep indigo and violet shadows, bright cool stage spotlights with soft glow, warm gold accents, gentle haze. NO rain."

P = [
    ("bg_nasdaq_stage", STAGE, "WIDE shot of a stock exchange broadcast studio in New York: a small raised stage with a lectern and a large brass bell on a stand, a huge curved video wall behind (blank glowing blue panels with abstract stripes, no text), confetti falling, camera cranes at the sides. Space at the lectern for two standing figures."),
    ("bg_trading_floor", COLD + " Morning light from tall windows.", "MEDIUM shot of a modern trading floor: rows of desks with multiple glowing monitors (abstract green and red lines, no text), a long blank ticker band glowing above, coffee cups, chairs. Space in the foreground for two standing traders."),
    ("bg_starbase_office", "dusk — orange and violet sky, deep navy shadows inside, warm desk lamp, gentle haze. NO rain.", "MEDIUM shot of a minimalist executive office on the Texas coast: a large floor-to-ceiling window showing a tall stainless-steel rocket on a launch tower at dusk by the sea, a low black desk with a phone face-down, a black leather chair, concrete walls. Space by the window for one standing figure."),
    ("bg_mit_stage_2014", WARM, "WIDE shot of a university lecture hall stage in 2014: a wooden lectern with a microphone, a large blank projector screen, a few rows of audience seats in the foreground (empty), soft daylight through high windows. Space at the lectern for one standing speaker and a student in the front row."),
    ("bg_openai_2015_office", WARM, "MEDIUM-WIDE shot of a small 2015 startup office in a converted loft: brick walls, a big whiteboard (blank), a few desks with laptops, a worn sofa, a kitchen counter, plants, warm afternoon sun. Space in the centre for two standing figures shaking hands."),
    ("bg_openai_2020_night", NIGHT, "the same kind of small loft startup office as a 2020 night scene: desks, a whiteboard (blank), cardboard boxes on a desk being packed, one desk lamp on, city lights through the windows. Space for three standing figures holding boxes."),
    ("bg_anthropic_2021_tiny", WARM, "MEDIUM shot of a tiny brand-new office in 2021: bare white walls, a single folding table with seven mismatched chairs, one coffee machine on a counter, a blank hand-painted wooden sign board on the wall, a window with soft daylight. Space for two standing figures."),
    ("bg_anthropic_office", NIGHT + " Warm wood and plants.", "MEDIUM-WIDE shot of a modern San Francisco tech office at night: warm wood, plants, glass meeting rooms, a big wall-mounted chart board (blank, abstract rising bars only), a window with the city skyline and a bridge in the distance. Space for two standing founders."),
    ("bg_xai_office_night", NIGHT + " Monitors give a cold blue glow.", "WIDE shot of an open-plan engineering office at night: long rows of desks with many glowing monitors (abstract code-like stripes, no letters), empty drink cans, cables, dark ceiling. Space at a front desk for two seated engineers."),
    ("bg_tv_studio_2023", STAGE, "MEDIUM shot of a late-night talk-show set: a host desk, a guest sofa, a fake night-city backdrop, studio lights. Space on the sofa for one seated guest."),
    ("bg_courtroom", COLD + " Warm wood.", "WIDE shot of a federal courtroom: the judge's raised bench, a round seal shape on the wall (no text), a clerk's table, wooden railings, tall windows. Space in front of the clerk's table for two standing figures."),
    ("bg_bahamas_office_2022", WARM + " Tropical.", "MEDIUM shot of a cluttered crypto-company office in the Bahamas in 2022: a beanbag chair, a desk with six monitors (abstract charts), messy papers, a palm tree and turquoise sea through the window, bright sun. Space for one figure on the beanbag and one standing assistant."),
    ("bg_prison_tv_room", "cold institutional — pale green walls, harsh flat fluorescent light, grey shadows, one TV glow, gentle haze. NO rain.", "MEDIUM shot of a federal prison common room: metal tables with attached stools, a TV mounted high on the wall (blank glowing screen), a barred window, painted cinder-block walls. Space for three seated inmates watching TV."),
    ("bg_colossus_exterior", NIGHT + " Sodium orange lights, steam.", "WIDE shot at night of a huge former factory turned into a data centre in Memphis: a long windowless industrial building, a row of large gas turbine units with exhaust stacks and heat shimmer beside it, power lines, a chain-link fence in the foreground with space in front of it for two standing neighbours."),
    ("bg_colossus_interior", NIGHT + " Cold green server lights.", "WIDE shot down an endless aisle inside a giant AI data centre: tall black server racks on both sides with rows of small green lights, cable trays overhead, a polished floor reflecting the lights, vanishing point in the centre. Space in the aisle for one walking figure."),
    ("bg_spacex_boardroom", COLD + " Night window.", "MEDIUM shot of a corporate boardroom at night: a long glass table, black chairs, small rocket models on a shelf, a window with dark sky and launch-site lights far away. Space at the table for two figures."),
    ("bg_meeting_room", COLD + " Bright daylight.", "MEDIUM-WIDE shot of a neutral bright meeting room: a long white table, chairs pushed in, a glass wall, plants, a blank screen. Space along the table for a line of four standing figures."),
    ("bg_dealbook_stage", STAGE, "MEDIUM shot of a conference interview stage: two armchairs facing each other with a small table and water glasses, a large blank backdrop with abstract shapes, the audience only as dark simple shapes along the bottom edge. Space in both armchairs."),
    ("bg_cnbc_set", STAGE + " Morning news.", "MEDIUM shot of a morning business TV news set: two tall stools, a glossy desk, wall screens with abstract blue charts and a city skyline image, bright studio lights. Space on the stools for two seated guests."),
    ("bg_altman_window", NIGHT, "MEDIUM shot of a quiet executive office at night in San Francisco: a big window with the city and a bridge lit up, a simple desk with a laptop, a single floor lamp. Space at the window for one standing figure."),
    ("bg_empty_stadium", NIGHT + " Floodlights.", "WIDE shot of a gigantic brand-new sports stadium at night, completely empty stands, bright floodlights, a perfect green field, a huge blank scoreboard. Space in the middle of the field for a small team."),
    ("bg_gold_rush_town", WARM + " Old West.", "WIDE shot of an 1849 gold-rush town: a dusty street, tents and wooden shacks, a river with miners' pans, a wooden stall stacked with shovels and pickaxes for rent, hills. Space for several small figures."),
    ("bg_boxing_gym", NIGHT, "MEDIUM shot of an old boxing gym at night: a ring with ropes, a heavy punching bag, a worn wooden floor, a single hanging lamp. Space in the ring for two figures."),
]
jobs = []
for name, mood, frame in P:
    with open(os.path.join(D, name + '.txt'), 'w', encoding='utf-8') as f: f.write(HEAD + STYLE.format(mood=mood) + REF + "FRAMING: " + frame)
    jobs.append({'out': f'assets/raw/{name}.png', 'promptFile': f'prompts/{name}.txt', 'refs': ['refs/bg_restaurant_v2.png'], 'refMode': 'material'})
json.dump(jobs, open(os.path.join(D, 'jobs_bg.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(jobs), 'фонов')
