# assemble_full.py — склейка картинки глав в film/out/full.mp4 без перекодирования, кадр в кадр со шкалой звука.
#   python -I production/L001/film/tools/assemble_full.py [--chapters ch0_1,ch2_3,ch4_6,ch7_8,ch9_10] [--timing animatic/timing.json] [--out full]
# Между главами final.mjs теряет 1–3 кадра (F1 главы < F0 следующей); master_full.py сводит звук по НЕПРЕРЫВНОЙ шкале, поэтому
# дыры закрываются повтором последнего кадра главы (короткая вставка теми же настройками x264, потом concat -c copy).
import json, subprocess, sys, argparse
from pathlib import Path
L = Path(__file__).resolve().parents[2]; O = L / 'film' / 'out'
ap = argparse.ArgumentParser(); ap.add_argument('--chapters', default='ch0_1,ch2_3,ch4_6,ch7_8,ch9_10')
ap.add_argument('--timing', default='animatic/timing.json'); ap.add_argument('--out', default='full'); ap.add_argument('--suffix', default='')
a = ap.parse_args(); chs = a.chapters.split(',')
total = round(json.load(open(L / a.timing, encoding='utf-8'))['total'] * 30)
fr = [json.load(open(O / f'{c}{a.suffix}.frames.json', encoding='utf-8')) for c in chs]
tmp = O / 'tmp' / 'assemble'; tmp.mkdir(parents=True, exist_ok=True); parts = []
def nframes(p): return int(subprocess.run(['ffprobe', '-v', 'error', '-count_packets', '-select_streams', 'v', '-show_entries', 'stream=nb_read_packets', '-of', 'csv=p=0', str(p)], capture_output=True, text=True).stdout.strip())
for i, (c, f) in enumerate(zip(chs, fr)):
    v = O / f'{c}{a.suffix}.mp4'; n = nframes(v); assert n == f['F1'] - f['F0'], (c, n, f)
    if i == 0: assert f['F0'] == 0, f
    nxt = fr[i + 1]['F0'] if i + 1 < len(fr) else total; gap = nxt - f['F1']; assert 0 <= gap <= 5, (c, gap)
    parts.append(v); print(f'{c}: кадры {f["F0"]}–{f["F1"] - 1}, дыра до следующей главы {gap}')
    if gap:
        png = tmp / f'{c}_last.png'; pad = tmp / f'{c}_pad{gap}.mp4'
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-sseof', '-0.2', '-i', str(v), '-update', '1', '-q:v', '1', str(png)], check=True)
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-loop', '1', '-framerate', '30', '-i', str(png), '-frames:v', str(gap), '-c:v', 'libx264', '-preset', 'slow', '-crf', '16',
                        '-pix_fmt', 'yuv420p', '-r', '30', str(pad)], check=True); parts.append(pad)
lst = tmp / 'list.txt'; lst.write_text(''.join(f"file '{p.as_posix()}'\n" for p in parts), encoding='utf-8')
out = O / f'{a.out}.mp4'
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', str(lst), '-map', '0:v', '-c', 'copy', '-movflags', '+faststart', str(out)], check=True)
n = nframes(out); print(f'-> {out} · кадров {n} из {total}', 'OK' if n == total else 'НЕ СХОДИТСЯ'); sys.exit(0 if n == total else 1)
