"""strip.py out.jpg tw "video|t0|n|step|crop|label" ...  -> rows of frames (native 30 fps, every <step> frame)"""
import sys, subprocess, numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont
out, tw = sys.argv[1], int(sys.argv[2])
font = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 15); fsm = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 12)
rows = []; maxw = 0
for spec in sys.argv[3:]:
    src, t0, n, step, crop, label = spec.split('|')
    t0, n, step = float(t0), int(n), int(step)
    cx, cy, cw, ch = [float(v) for v in crop.split(',')] if crop != '-' else (0, 0, 1, 1)
    W, H = 960, 540
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', f'{t0:.3f}', '-i', src, '-frames:v', str((n - 1) * step + 1), '-vf', f'scale={W}:{H}', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True).stdout
    fr = np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3)
    x, y, w, h = int(cx * W), int(cy * H), int(cw * W), int(ch * H)
    th = int(tw * h / w)
    cells = []
    for k in range(n):
        i = k * step
        if i >= len(fr): break
        im = Image.fromarray(np.ascontiguousarray(fr[i, y:y + h, x:x + w])).resize((tw, th), Image.LANCZOS)
        c = Image.new('RGB', (tw + 4, th + 18), (24, 24, 24)); c.paste(im, (2, 0))
        ImageDraw.Draw(c).text((4, th + 1), f'+{i}f  {t0 + i / 30:.2f}s', fill=(200, 200, 200), font=fsm)
        cells.append(c)
    row = Image.new('RGB', (sum(c.width for c in cells), cells[0].height + 24), (24, 24, 24))
    ImageDraw.Draw(row).text((4, 2), label, fill=(255, 220, 120), font=font)
    xx = 0
    for c in cells: row.paste(c, (xx, 24)); xx += c.width
    rows.append(row); maxw = max(maxw, row.width)
img = Image.new('RGB', (maxw, sum(r.height + 6 for r in rows)), (24, 24, 24))
yy = 0
for r in rows: img.paste(r, (0, yy)); yy += r.height + 6
img.save(out, quality=85); print(out, img.size)
