# make_assets.py (v2): дополнительные слои к плитам ../box_path_painted/assets/ (их не трогаем).
#   python make_assets.py
#   plate_port_v2.png, far_port_v2.jpg, far_container_v2.jpg — нарисованный дождь убран (его заменяет живой 2D-дождь):
#       светлые тонкие штрихи = пиксели светлее медианы окрестности на 4..60 при тёмной медиане -> медиана
#   plate_warehouse_v2.png + lamp_w.png — ближняя лампа вырезана в спрайт (качается), под ней залито соседним цветом
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
import numpy as np

D = Path(__file__).parent
SRC = D.parent / 'box_path_painted' / 'assets'
A = D / 'assets'; A.mkdir(exist_ok=True)
W, H = 1920, 1080

def lum(a): return a[..., 0] * .299 + a[..., 1] * .587 + a[..., 2] * .114

def derain(rgb, region=None, size=15, passes=2):
    for _ in range(passes - 1): rgb, _r = derain(rgb, region, size, 1)
    a = np.asarray(rgb, np.float32)
    med = np.asarray(rgb.filter(ImageFilter.MedianFilter(size)), np.float32)
    d = lum(a) - lum(med)
    m = (d > 3) & (d < 60) & (lum(med) < 120) & (a[..., 2] >= a[..., 0])
    if region is not None: m &= region
    mi = Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(.8))
    k = np.asarray(mi, np.float32)[..., None] / 255
    out = a * (1 - k) + med * k
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)), m.mean()

def poly(pts, blur=0):
    m = Image.new('L', (W, H), 0); ImageDraw.Draw(m).polygon(pts, fill=255)
    return m.filter(ImageFilter.GaussianBlur(blur)) if blur else m

# ---------- порт ----------
far = Image.open(SRC / 'far_port.jpg').convert('RGB')
sky = np.zeros((H, W), bool); sky[:700] = True
f2, r = derain(far, sky); f2.save(A / 'far_port_v2.jpg', quality=93); print('far_port rain px', round(r, 4))
pl = Image.open(SRC / 'plate_port.png').convert('RGBA')
rgb, al = pl.convert('RGB'), pl.getchannel('A')
reg = np.zeros((H, W), bool); reg[:720, :1640] = True        # небо над штабелями и сами штабели; угол контейнера справа не трогаем
p2, r = derain(rgb, reg); p2.putalpha(al); p2.save(A / 'plate_port_v2.png', optimize=True); print('plate_port rain px', round(r, 4))

# ---------- контейнер: дождь в проёме ----------
farc = Image.open(SRC / 'far_container.jpg').convert('RGB')
reg = np.zeros((H, W), bool); reg[250:760, 640:1400] = True; reg[350:650, 740:1110] = False   # кран не трогаем (светлые фермы)
c2, r = derain(farc, reg); c2.save(A / 'far_container_v2.jpg', quality=93); print('far_container rain px', round(r, 4))

# ---------- склад: ближняя лампа -> спрайт ----------
pw = Image.open(SRC / 'plate_warehouse.png').convert('RGBA')
LAMP = [(986, 0), (1040, 0), (1040, 40), (1046, 50), (1072, 66), (1086, 92), (1090, 122), (1062, 132), (1013, 136), (962, 132), (934, 122),
        (938, 92), (952, 66), (978, 50), (986, 40)]
m = poly(LAMP, 1.2)
spr = pw.copy(); spr.putalpha(m)
box = (920, 0, 1104, 144); spr.crop(box).save(A / 'lamp_w.png'); print('lamp bbox', box)
# дыра чуть шире лампы: заливка нормированной свёрткой по окрестности
hole = np.asarray(poly(LAMP).filter(ImageFilter.MaxFilter(9)), np.float32) / 255
a = np.asarray(pw.convert('RGB'), np.float32); keep = (hole < .5).astype(np.float32)
from scipy.ndimage import gaussian_filter
out = a.copy(); filled = keep.copy()
for rr in [4, 10, 24]:                                           # нормированная свёртка в float (без ступенек 8 бит)
    den = gaussian_filter(keep, rr)
    est = np.stack([gaussian_filter(a[..., c] * keep, rr) for c in range(3)], -1) / np.maximum(den, 1e-4)[..., None]
    take = (filled < .5) & (den > .05); out[take] = est[take]; filled[take] = 1
res = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)); res.putalpha(pw.getchannel('A'))
res.save(A / 'plate_warehouse_v2.png', optimize=True)

# ---------- контейнер: нарисованные створки -> прозрачно (их заменяют 3D-створки, которые закрываются) ----------
pc = Image.open(SRC / 'plate_container.png').convert('RGBA')
K = W / 1672
DOORS = [[(549, 229), (651, 287), (651, 634), (549, 657)], [(1124, 287), (1225, 227), (1225, 659), (1124, 634)]]
dm = Image.new('L', (W, H), 0); dd = ImageDraw.Draw(dm)
for p in DOORS: dd.polygon([(x * K, y * K) for x, y in p], fill=255)
al = np.asarray(pc.getchannel('A'), np.float32) * (1 - np.asarray(dm, np.float32) / 255)
pc.putalpha(Image.fromarray(al.astype(np.uint8))); pc.save(A / 'plate_container_v2.png', optimize=True)

# лист проверки: до/после дождя (кроп) и дыра под лампой
cs = Image.new('RGB', (1800, 900))
cs.paste(far.crop((300, 20, 900, 320)).resize((900, 450)), (0, 0)); cs.paste(f2.crop((300, 20, 900, 320)).resize((900, 450)), (900, 0))
cs.paste(farc.crop((700, 260, 1300, 560)).resize((900, 450)), (0, 450)); cs.paste(c2.crop((700, 260, 1300, 560)).resize((900, 450)), (900, 450))
cs.save(A / 'check_derain.jpg', quality=88)
res.convert('RGB').crop((800, 0, 1240, 300)).resize((880, 600)).save(A / 'check_lamp_hole.jpg', quality=88)
print('ok')
