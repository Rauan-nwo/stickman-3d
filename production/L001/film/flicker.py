# film/flicker.py — ворота мерцания (QA.md §9). Мерцание = смена яркости всего кадра кадр-к-кадру («пила»), от которой «болят глаза».
#   python flicker.py <video.mp4> [<frames.json>] [<отчёт.txt>]
# Без frames.json — окна по 5 с. С frames.json (final.mjs пишет поле all: [{n, F, N}]) — по каждому плану, без 3 кадров у склеек.
# Порог (ТЗ владельца): в статичных/медленных планах медиана |Δяркости| < 0.3 и «пила» < 1/с, кроме намеренных событий.
# Провал ворот (код 1) — УСТОЙЧИВАЯ пила: в любом окне 3 с больше 9 мелких (|Δ| 0.3–8) смен знака, или ≥ 45 кадров подряд с ≥ 4 сменами/с.
#   Было (дыхание света в core.js): окно 3 с — до 30 смен, пила подряд 619 кадров. После правки: 7 и 19 — короткие события.
# По планам — справка: «~» = пила ≥ 1/с или медиана ≥ 0.3 в плане; это события (вспышка, щелчок лампы, штамп) или крупное движение
#   (официант через объектив, наезд) — смотреть глазом и перечислить в QA как намеренные.
# Намеренные события (щелчок лампы, вспышки камер) дают отдельные пики — они видны в столбце max и проверяются глазом.
# Выход: код 1, если хоть один план не прошёл порог. Основа — замер координатора (scratchpad/flicker.py).
import json, subprocess, sys
import numpy as np

V = sys.argv[1]; FJ = sys.argv[2] if len(sys.argv) > 2 else None; REP = sys.argv[3] if len(sys.argv) > 3 else None
W, H, FPS, MED, FLIPS = 192, 108, 30, 0.3, 1.0
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', V, '-vf', f'scale={W}:{H},format=gray', '-f', 'rawvideo', '-'], capture_output=True).stdout
f = np.frombuffer(raw, np.uint8).reshape(-1, H, W).astype(np.float32)
m = f.mean(axis=(1, 2)); d = np.diff(m)
flip = np.zeros(len(d), bool)
flip[1:] = (np.sign(d[1:]) != np.sign(d[:-1])) & (np.abs(d[1:]) > .3) & (np.abs(d[:-1]) > .3)

if FJ:
    J = json.load(open(FJ, encoding='utf-8')); F0 = J['F0']
    segs = [(f"#{s['n']}", s['F'] - F0, s['F'] - F0 + s['N']) for s in J.get('all', [])]
else:
    segs = []
if not segs:
    segs = [(f'{a // FPS}-{a // FPS + 5}s', a, a + 5 * FPS) for a in range(0, len(f), 5 * FPS)]

out = [f'{V}: кадров {len(f)}, средняя яркость {m.mean():.1f}',
       f'весь ролик: |Δ| медиана {np.median(np.abs(d)):.2f}, p90 {np.percentile(np.abs(d), 90):.2f}, «пила» {int(flip.sum())} кадров',
       f'порог плана: медиана |Δ| < {MED}, «пила» < {FLIPS}/с', '']
bad = 0
for name, a, b in segs:
    a2, b2 = max(0, a + 3), min(len(d), b - 3)        # без кадров у склеек и вшитых переходов
    if b2 - a2 < 6: continue
    seg = np.abs(d[a2:b2]); med = float(np.median(seg)); fl = flip[a2:b2].sum() / ((b2 - a2) / FPS)
    tag = '  ~ ' if (fl >= FLIPS or med >= MED) else '  ok'
    out.append(f"{tag} {name:>8}  кадры {a}-{b}  |Δ| мед {med:.2f}  max {seg.max():.1f}  пила {fl:.1f}/с")
small = flip & (np.abs(d) < 8) & (np.abs(np.roll(d, 1)) < 8)
c3 = np.convolve(small, np.ones(90), 'valid') if len(small) >= 90 else np.array([small.sum()])
c1 = np.convolve(small, np.ones(30), 'same'); run = best = 0
for x in c1 >= 4: run = run + 1 if x else 0; best = max(best, run)
bad = int(c3.max() > 9 or best >= 45)
out.append(''); out.append(f'устойчивая пила: окно 3 с — макс {int(c3.max())} смен (порог 9), подряд с ≥4/с — {best} кадров (порог 45)')
out.append('ИТОГ: ' + ('мерцания нет (планы «~» — проверить глазом: события/движение)' if not bad else 'МЕРЦАНИЕ: устойчивая пила яркости'))
txt = '\n'.join(out); print(txt)
if REP: open(REP, 'w', encoding='utf-8').write(txt + '\n')
sys.exit(1 if bad else 0)
