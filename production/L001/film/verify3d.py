# -*- coding: utf-8 -*-
"""film/verify3d.py — проверка вклейки нативных 3D-планов в финал (после final.mjs).

  python production/L001/film/verify3d.py [out/ch0_1.mp4]

Для каждого кадра каждого 3D-плана (out/<имя>.frames.json):
  · PSNR(выход, эталон) в yuv420p, как считает ffmpeg psnr — эталон = тот же кадр PNG без потерь, снятый из браузера до кодирования
    (out/tmp/ref), переведённый в yuv420p тем же swscale: потери кодирования. (В RGB предел задаёт сама субдискретизация 4:2:0 —
    ~36 дБ на неоновых тонких деталях — она одинакова для любой доставки в yuv420p, поэтому мерить её как дефект вклейки нельзя.)
  · 1:1: эталон попиксельно равен нативному кадру сцены (кроме подписей и названия ролика поверх) — без масштаба и сдвига;
  · порядок: с соседним нативным кадром эталон совпадает хуже, чем со своим (нет пропущенных и повторённых кадров).
По всему ролику: пары соседних кадров с нулевой разницей (повтор кадра) — где они и почему.
"""
import json, os, subprocess, sys
import numpy as np
from PIL import Image
for _s in (sys.stdout, sys.stderr):
    try: _s.reconfigure(encoding='utf-8')
    except Exception: pass
D = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(D, 'out'); TMP = os.path.join(OUT, 'tmp')
VID = sys.argv[1] if len(sys.argv) > 1 else os.path.join(OUT, 'ch0_1.mp4')
META = json.load(open(VID.replace('.mp4', '.frames.json'), encoding='utf-8'))
REFD = os.path.join(TMP, 'ref_' + os.path.basename(VID)[:-4])          # эталон кадров этого рендера (final.mjs --name)
W, H = 1920, 1080

def decode(a, b, w=W, h=H, gray=False):
    """кадры a..b-1 (номера внутри файла) -> массив"""
    pf = 'gray' if gray else 'rgb24'; ch = 1 if gray else 3
    vf = f"select='between(n\\,{a}\\,{b - 1})'" + ('' if (w, h) == (W, H) else f',scale={w}:{h}')
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', VID, '-vf', vf, '-vsync', '0', '-f', 'rawvideo', '-pix_fmt', pf, '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, h, w, ch) if not gray else np.frombuffer(raw, np.uint8).reshape(-1, h, w)

def psnr(a, b, mask=None):
    d = (a.astype(np.float32) - b.astype(np.float32)) ** 2
    if mask is not None: d = d[mask]
    m = d.mean() if d.size else 0
    return 99.0 if m <= 1e-9 else 10 * np.log10(255 ** 2 / m)

F0 = META['F0']; ok_all = True; rows = []
def yuv_out(a, b):
    """кадры a..b-1 выхода как yuv420p (без перевода в RGB): список (Y, U, V)"""
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', VID, '-vf', f"select='between(n\,{a}\,{b - 1})'", '-vsync', '0', '-f', 'rawvideo', '-pix_fmt', 'yuv420p', '-'], capture_output=True, check=True).stdout
    return split(raw)
def yuv_png(F, N):
    """эталон PNG без потерь -> yuv420p тем же swscale, что в final.mjs (png -> libx264 yuv420p)"""
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-framerate', '30', '-start_number', str(F), '-i', os.path.join(REFD, 'F%05d.png'), '-frames:v', str(N), '-f', 'rawvideo', '-pix_fmt', 'yuv420p', '-'], capture_output=True, check=True).stdout
    return split(raw)
def split(raw):
    n = W * H * 3 // 2; out = []
    for k in range(len(raw) // n):
        b = np.frombuffer(raw, np.uint8, n, k * n); out.append((b[:W * H].reshape(H, W), b[W * H:W * H * 5 // 4].reshape(H // 2, W // 2), b[W * H * 5 // 4:].reshape(H // 2, W // 2)))
    return out
def psnr_yuv(a, b):                                       # как ffmpeg psnr: MSE по Y, U, V с весами 4:1:1
    m = [((x.astype(np.float32) - y.astype(np.float32)) ** 2).mean() for x, y in zip(a, b)]
    mse = (4 * m[0] + m[1] + m[2]) / 6
    return 99.0 if mse <= 1e-9 else 10 * np.log10(255 ** 2 / mse)

for sh in META['shots3d']:
    n, F, N = sh['n'], sh['F'], sh['N']
    natp = [os.path.join(TMP, 'c3d', str(n), f'f-{k:04d}.png') for k in range(N)]
    refp = [os.path.join(REFD, f'F{F + k:05d}.png') for k in range(N)]
    out, ref_y = yuv_out(F - F0, F - F0 + N), yuv_png(F, N)
    if len(out) != N: print(f'#{n}: в выходе {len(out)} кадров вместо {N}'); ok_all = False
    pe = [psnr_yuv(out[k], ref_y[k]) for k in range(min(N, len(out)))]
    # кадр лёг 1:1 и по порядку: эталон (снят из браузера без потерь) совпадает с нативным кадром k попиксельно (кроме подписей поверх);
    # с соседним нативным кадром совпадает меньше — иначе кадр сдвинут; если соседние нативные кадры сами одинаковы — это стоп-кадр сцены, не повтор
    share, order_bad, still = [], [], 0
    nat = [np.asarray(Image.open(q).convert('RGB')) for q in natp]
    for k in range(N):
        ref = np.asarray(Image.open(refp[k]).convert('RGB')); same = (ref == nat[k]).all(axis=2); share.append(same.mean())
        for j in (k - 1, k + 1):
            if 0 <= j < N:
                if (nat[j] == nat[k]).all(): still += 1; continue
                if ((ref == nat[j]).all(axis=2)).mean() >= same.mean(): order_bad.append(k)
    good = min(pe) > 40 and not order_bad and len(out) == N
    ok_all &= good
    rows.append((n, N, min(pe), float(np.mean(pe)), min(share), float(np.mean(share)), order_bad))
    print(f"#{n}: {N} кадров (кадры фильма {F}–{F + N - 1}) · PSNR выход/эталон (yuv420p) мин {min(pe):.1f} ср {np.mean(pe):.1f} дБ · "
          f"пикселей 1:1 с нативным кадром мин {min(share) * 100:.1f}% ср {np.mean(share) * 100:.1f}% (остальное — подписи поверх) · "
          f"сдвиг кадров: {order_bad or 'нет'} · одинаковых соседних кадров в самой сцене: {still // 2} -> {'OK' if good else 'ПЛОХО'}")

# повторы кадров по всему ролику: нулевая разница соседних кадров (на 480×270)
g = decode(0, 10 ** 6, 480, 270, gray=True).astype(np.int16)
diff = np.abs(np.diff(g, axis=0)).mean(axis=(1, 2))
zero = np.where(diff == 0)[0]
in3d = [z for z in zero for sh in META['shots3d'] if sh['F'] - F0 <= z < sh['F'] - F0 + sh['N'] - 1]
print(f'всего кадров {len(g)}; пар соседних кадров без единой разницы: {len(zero)}; из них внутри 3D-планов: {len(in3d)}')
if len(zero):
    runs = []; s = zero[0]; p = zero[0]
    for z in list(zero[1:]) + [None]:
        if z is not None and z == p + 1: p = z; continue
        runs.append((s, p)); s = p = z
    print('нулевые пары (кадр файла, с):', ', '.join(f'{a}–{b + 1} ({(a + F0) / 30:.2f}–{(b + F0 + 1) / 30:.2f} с)' for a, b in runs[:40]))
json.dump({'rows': [list(map(lambda v: v if not isinstance(v, np.generic) else v.item(), r)) for r in rows], 'zero_pairs': zero.tolist(), 'zero_in_3d': in3d}, open(os.path.join(OUT, 'verify3d.json'), 'w'), ensure_ascii=False, default=float)
print('ИТОГ:', 'OK' if ok_all and not in3d else 'ЕСТЬ ПРОБЛЕМЫ')
