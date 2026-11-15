# make_assets.py: слои 2.5D для пути коробки (рисованные фоны GPT -> assets/).
#   python make_assets.py
# Фон увеличивается 1672x941 -> 1920x1080 (Lanczos). Маски рисуются полигонами в координатах исходника (1672x941),
# как в production/longform/style-test/make_assets.py.
#   plate_<n>.png     - основная плита (проецируется на пол/стены). Под передним планом дыра залита соседним цветом;
#                       если есть дальний слой — на его месте альфа 0
#   fg_<n>[_k].png    - передний план: плита с маской в альфе (край растушёван на 1.5 px)
#   far_<n>.jpg       - дальний план: всё вне маски залито соседним цветом (нормированная свёртка)
#   check_<n>.jpg     - лист проверки: маски поверх плиты, залитая плита, дальний слой
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
import numpy as np

D = Path(__file__).parent
A = D / 'assets'; A.mkdir(exist_ok=True)
SW, SH, W, H = 1672, 941, 1920, 1080
K = W / SW

def poly_mask(polys, blur=1.5):
    m = Image.new('L', (W, H), 0); d = ImageDraw.Draw(m)
    for p in polys:
        if len(p) == 2: d.rectangle([p[0][0] * K, p[0][1] * K, p[1][0] * K, p[1][1] * K], fill=255)
        else: d.polygon([(x * K, y * K) for x, y in p], fill=255)
    return m.filter(ImageFilter.GaussianBlur(blur)) if blur else m

def fill_outside(p, keep):
    """Пиксели вне keep (0..1) заливаются цветом ближайших пикселей внутри keep (многомасштабная нормированная свёртка)."""
    out = p.copy(); filled = keep.copy()
    for r in [3, 8, 20, 50, 120, 300]:
        den = np.asarray(Image.fromarray((keep * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r)), np.float32)[..., None] / 255
        num = np.stack([np.asarray(Image.fromarray(np.clip(p[..., c] * keep, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r)), np.float32) for c in range(3)], -1)
        est = num / np.maximum(den, 1e-3)
        take = (filled < .5) & (den[..., 0] > .02)
        out[take] = est[take]; filled[take] = 1
    return keep[..., None] * p + (1 - keep[..., None]) * out

def arr(m): return np.asarray(m, np.float32) / 255
def shrink(m, px):   # маска без мягкого края, чуть меньше (чтобы в заливку не попал контур предмета)
    return arr(m.point(lambda v: 255 if v > 127 else 0).filter(ImageFilter.MinFilter(px)))

def build(name, fgs=(), far=None, far_cut=(), shift=None):
    src = Image.open(D / 'raw' / f'bg_{name}.png').convert('RGB').resize((W, H), Image.LANCZOS)
    p = np.asarray(src, np.float32)
    hole = np.zeros((H, W), np.float32)
    sheet = [src.copy()]
    for k, polys in enumerate(fgs):
        m = poly_mask(polys)
        rgba = np.dstack([p, np.asarray(m, np.float32)]).astype(np.uint8)
        Image.fromarray(rgba, 'RGBA').save(A / f'fg_{name}{"_" + str(k) if len(fgs) > 1 else ""}.png', optimize=True)
        grow = arr(m.filter(ImageFilter.MaxFilter(9)))          # дыра чуть шире предмета: в заливку не попадёт его контур
        hole = np.maximum(hole, grow)
    base = fill_outside(p, (hole < .5).astype(np.float32)) if hole.max() > 0 else p
    if shift:   # дыра у края кадра заполняется копией соседнего пролёта стеллажа (сдвиг на S px исходника), шов растушёван
        for (x0, x1), S in shift:
            S = int(S * K); xa, xb = int(x0 * K), int(x1 * K)
            src_cols = np.clip(np.arange(xa, xb) + S, 0, W - 1)
            m = hole[:, xa:xb][..., None]
            base[:, xa:xb] = m * p[:, src_cols] + (1 - m) * base[:, xa:xb]
    alpha = np.full((H, W), 255, np.float32)
    if far:
        mf = poly_mask(far, blur=0)
        cut = hole.copy()                                         # передний план не попадает в дальний слой
        if far_cut: cut = np.maximum(cut, arr(poly_mask(far_cut, blur=0).filter(ImageFilter.MaxFilter(31)).filter(ImageFilter.GaussianBlur(10))))
        mf = Image.fromarray((arr(mf) * (1 - cut) * 255).astype(np.uint8))
        fm = arr(mf.filter(ImageFilter.GaussianBlur(2.5)))       # мягкий стык ближнего и дальнего: плита смешивается, а не режется
        keep = shrink(mf, 5)
        if far_cut: keep = keep * (1 - arr(poly_mask(far_cut, blur=0).filter(ImageFilter.MaxFilter(41))))   # головы фонарей и ближний ореол — не в дальний слой
        keep = keep * (1 - arr(Image.fromarray((hole * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(15))))
        farp = fill_outside(p, keep)
        Image.fromarray(np.clip(farp, 0, 255).astype(np.uint8)).save(A / f'far_{name}.jpg', quality=92)
        alpha = (1 - fm) * 255                                   # основная плита прозрачна там, где дальний слой
        sheet.append(Image.fromarray(np.clip(farp, 0, 255).astype(np.uint8)))
    Image.fromarray(np.dstack([np.clip(base, 0, 255), alpha]).astype(np.uint8), 'RGBA').save(A / f'plate_{name}.png', optimize=True)
    # лист проверки
    over = np.asarray(src, np.float32).copy()
    over[hole > .5] = over[hole > .5] * .4 + np.array([255, 0, 200]) * .6
    if far: over[alpha < 128] = over[alpha < 128] * .4 + np.array([0, 200, 255]) * .6
    tiles = [Image.fromarray(over.astype(np.uint8)), Image.fromarray(np.clip(base, 0, 255).astype(np.uint8))] + sheet[1:]
    cs = Image.new('RGB', (960 * len(tiles), 540))
    for i, t in enumerate(tiles): cs.paste(t.resize((960, 540)), (960 * i, 0))
    cs.save(A / f'check_{name}.jpg', quality=85)
    print(name, 'ok')

# ---------- 1. склад: передний план — ближняя стойка с коробкой и паллетом слева ----------
build('warehouse', fgs=[[[(0, 0), (257, 0), (257, 810), (273, 814), (277, 886), (238, 941), (0, 941)]]], shift=[((0, 300), 262)])

# ---------- 2. порт: передний план — угол контейнера справа; дальний — небо, краны, судно, вода ----------
NEAR_TOP = [(0, 238), (210, 292), (213, 331), (266, 327), (356, 329), (470, 370), (553, 390), (560, 430), (577, 431), (716, 451),
            (720, 470), (746, 471), (871, 478), (874, 500), (941, 504), (958, 519), (962, 563), (1065, 559), (1330, 560), (1445, 557), (1672, 557)]
far_port = [[(0, 0), (1672, 0)] + NEAR_TOP[::-1]]
# фонари и кнехты остаются в ближнем слое: вырезаются из маски дальнего (far_cut)
POLES = [[(224, 95), (254, 600)], [(183, 40), (215, 26), (314, 60), (302, 127), (250, 130), (188, 106)],
         [(551, 268), (569, 590)], [(527, 250), (555, 234), (602, 255), (592, 294), (538, 287)],
         [(722, 368), (736, 592)], [(706, 355), (730, 344), (758, 360), (750, 388), (710, 382)],
         [(863, 442), (874, 590)], [(853, 432), (886, 459)],
         [(1343, 578), (1404, 632)], [(1183, 570), (1220, 607)], [(1098, 563), (1127, 590)], [(1058, 560), (1082, 582)]]
build('port', fgs=[[[(1438, 60), (1462, 28), (1492, 0), (1672, 0), (1672, 941), (1440, 941)]]], far=far_port, far_cut=POLES)

# ---------- 3. контейнер: передний план — стропы и храповик слева вверху; дальний — порт в проёме дверей ----------
build('container',
      fgs=[[[(0, 0), (338, 0), (322, 50), (292, 96), (250, 118), (208, 160), (198, 245), (195, 405), (184, 440), (182, 500), (162, 530),
             (118, 528), (102, 492), (98, 425), (78, 445), (40, 485), (0, 515)]]],
      far=[[(574, 225), (1208, 225), (1206, 240), (1133, 290), (1129, 636), (1152, 651), (604, 651), (645, 633), (646, 292), (566, 236)]])

# ---------- 4. дата-центр: передний план — ближняя стойка слева и штабель коробок справа ----------
build('datacenter', fgs=[[[(0, 0), (270, 0), (276, 941), (0, 941)]],
                         [[(1366, 568), (1420, 451), (1490, 436), (1565, 403), (1672, 395), (1672, 823), (1547, 823), (1346, 741), (1344, 690)]]],
      shift=[((0, 300), 290)])
