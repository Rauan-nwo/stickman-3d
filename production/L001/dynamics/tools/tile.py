"""tile.py <video> <t_start> <nframes> <out.jpg> [crop x,y,w,h in 0..1] [cols] [label]
Extract consecutive frames at native fps and tile them with frame index and
mean abs diff to previous frame (in the crop)."""
import sys, subprocess, numpy as np, cv2
src, t, n, out = sys.argv[1], float(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
crop = [float(v) for v in sys.argv[5].split(',')] if len(sys.argv) > 5 and sys.argv[5] != '-' else [0, 0, 1, 1]
cols = int(sys.argv[6]) if len(sys.argv) > 6 else 5
label = sys.argv[7] if len(sys.argv) > 7 else ''
W, H = 640, 360
cmd = ['ffmpeg', '-v', 'error', '-ss', f'{t:.3f}', '-i', src, '-frames:v', str(n), '-vf', f'scale={W}:{H}', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-']
raw = subprocess.run(cmd, capture_output=True).stdout
fr = np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3)
x, y, w, h = int(crop[0] * W), int(crop[1] * H), int(crop[2] * W), int(crop[3] * H)
tw = 320; th = int(tw * h / w)
tiles = []; prev = None
for i, f in enumerate(fr):
    c = f[y:y + h, x:x + w]
    g = cv2.cvtColor(c, cv2.COLOR_BGR2GRAY).astype(np.int16)
    d = 0 if prev is None else np.abs(g - prev).mean()
    prev = g
    tl = cv2.resize(c, (tw, th), interpolation=cv2.INTER_AREA)
    tl = cv2.copyMakeBorder(tl, 0, 22, 0, 0, cv2.BORDER_CONSTANT, value=(20, 20, 20))
    col = (90, 220, 255) if d > 0.8 else (160, 160, 160)
    cv2.putText(tl, f'f{i} t={t + i / 30:.2f} d={d:.1f}', (4, th + 16), cv2.FONT_HERSHEY_SIMPLEX, 0.45, col, 1, cv2.LINE_AA)
    tiles.append(tl)
while len(tiles) % cols:
    tiles.append(np.zeros_like(tiles[0]))
rows = [np.hstack(tiles[i:i + cols]) for i in range(0, len(tiles), cols)]
img = np.vstack(rows)
if label:
    bar = np.full((28, img.shape[1], 3), 30, np.uint8)
    cv2.putText(bar, label, (6, 20), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1, cv2.LINE_AA)
    img = np.vstack([bar, img])
cv2.imwrite(out, img, [cv2.IMWRITE_JPEG_QUALITY, 85])
print(out, len(fr))
