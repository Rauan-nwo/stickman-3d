# make_assets.py: ассеты пробы диалога (обратная точка ресторана).
#   raw/bg_reverse.png (GPT Image, 1672x941) -> assets/plate_reverse.png (1920x1080, Lanczos)
#   assets/mask_rev_cloth.png — передний план обратной точки: край скатерти нашего стола + свеча (закрывает героя ниже столешницы)
from pathlib import Path
from PIL import Image, ImageDraw
D = Path(__file__).parent
raw = Image.open(D / 'raw' / 'bg_reverse.png').convert('RGB')
raw.resize((1920, 1080), Image.LANCZOS).save(D / 'assets' / 'plate_reverse.png', optimize=True)
# край скатерти: ломаная по замерам столбцов картинки (переход тёмный пол -> светлая скатерть); справа скатерть уходит под стул
edge = [(0, 968), (40, 958), (120, 955), (160, 945), (240, 938), (360, 929), (600, 928), (960, 931), (1200, 949), (1340, 958), (1420, 970), (1500, 985), (1560, 998), (1640, 1012)]
m = Image.new('L', (1920, 1080), 0); d = ImageDraw.Draw(m)
d.polygon(edge + [(1640, 1080), (0, 1080)], fill=255)
d.rounded_rectangle((203, 820, 434, 1062), radius=26, fill=255)      # свеча в стакане
Image.merge('LA', (m, m)).save(D / 'assets' / 'mask_rev_cloth.png')
print('ok')
