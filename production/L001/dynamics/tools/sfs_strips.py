# shot_for_shot.md: полосы кадров конкурента. Запуск: python sfs_strips.py <video_1080.webm> <comp_cuts_final.txt> <words.json> <out_dir>
# frame strips per competitor shot: all frames if <=60 frames, else every 3rd; 8 cols, max 64 tiles per sheet
import subprocess, os, sys, json, io, bisect
from PIL import Image, ImageDraw, ImageFont
V, CUT, WORDS, OUT = sys.argv[1:5]; os.makedirs(OUT, exist_ok=True)
TW, TH, LB, COLS, MAXT = 240, 135, 18, 8, 64
c = [int(x) for x in open(CUT).read().split()]; NF = 35637
b = [0] + c + [NF]
W = json.load(open(WORDS, encoding='utf-8')); ws = [w[0] for w in W]
F = ImageFont.truetype(r'C:\Windows\Fonts\arial.ttf', 13); FB = ImageFont.truetype(r'C:\Windows\Fonts\arialbd.ttf', 16)
def word_at(t):
    i = bisect.bisect_right(ws, t) - 1
    if i < 0: return ''
    s, e, w = W[i]
    return w if t <= e + 0.05 else ('(' + w + ')' if t - e < 0.6 else '·')
shots = []
for i in range(len(b) - 1):
    s, e = b[i], b[i + 1]; n = e - s
    step = 1 if n <= 60 else 3
    shots.append((i + 1, s, e, list(range(s, e, step))))
need = {}
for sh in shots:
    for f in sh[3]: need[f] = sh
def save(sh, tiles):
    num, s, e, fl = sh
    parts = [tiles[k:k + MAXT] for k in range(0, len(tiles), MAXT)]
    for pi, part in enumerate(parts):
        rows = (len(part) + COLS - 1) // COLS
        im = Image.new('RGB', (COLS * TW, 26 + rows * (TH + LB)), (12, 12, 14)); d = ImageDraw.Draw(im)
        d.text((6, 4), f'his #{num}  {s/30:.2f}-{e/30:.2f}s  ({(e-s)/30:.2f}s, {e-s} fr)  step {1 if e-s<=60 else 3}  part {pi+1}/{len(parts)}', font=FB, fill=(255, 220, 90))
        for k, (f, t) in enumerate(part):
            x, y = (k % COLS) * TW, 26 + (k // COLS) * (TH + LB)
            im.paste(t, (x, y)); d.text((x + 3, y + TH + 1), f'{f/30:.2f} +{f-s} {word_at(f/30)}', font=F, fill=(230, 230, 230))
        suf = '' if len(parts) == 1 else chr(97 + pi)
        p = os.path.join(OUT, f'his{num:03d}{suf}.jpg'); q = 70
        while True:
            buf = io.BytesIO(); im.save(buf, 'JPEG', quality=q)
            if buf.tell() <= 150_000 or q <= 30: break
            q -= 6
        open(p, 'wb').write(buf.getvalue())
proc = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', V, '-vf', f'scale={TW}:{TH}', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
FS = TW * TH * 3; cur = None; tiles = []
for f in range(NF):
    raw = proc.stdout.read(FS)
    if len(raw) < FS: break
    sh = need.get(f)
    if sh is None: continue
    if cur is not sh:
        if cur: save(cur, tiles)
        cur, tiles = sh, []
    tiles.append((f, Image.frombytes('RGB', (TW, TH), raw)))
    if f % 3000 == 0: print(f, flush=True)
if cur: save(cur, tiles)
print('done')
