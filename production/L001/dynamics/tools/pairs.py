"""pairs.py <video> <out.jpg> <offsets comma> t1 t2 ... : for each time, frames at t+off/30 in a row."""
import sys, subprocess, numpy as np, cv2
src, out, offs = sys.argv[1], sys.argv[2], [int(x) for x in sys.argv[3].split(',')]
ts = [float(x) for x in sys.argv[4:]]
tw, th = 192, 108
rows = []
for t in ts:
    t0 = t + min(offs) / 30
    n = max(offs) - min(offs) + 1
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', f'{max(0, t0):.3f}', '-i', src, '-frames:v', str(n), '-vf', f'scale={tw}:{th}', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-'], capture_output=True).stdout
    fr = np.frombuffer(raw, np.uint8).reshape(-1, th, tw, 3)
    cells = []
    for o in offs:
        k = o - min(offs)
        c = fr[k].copy() if k < len(fr) else np.zeros((th, tw, 3), np.uint8)
        cv2.rectangle(c, (0, 0), (tw - 1, th - 1), (60, 60, 60), 1)
        cells.append(c)
    row = np.hstack(cells)
    lab = np.full((th, 70, 3), 25, np.uint8)
    cv2.putText(lab, f'{t:.2f}', (3, 55), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1)
    rows.append(np.hstack([lab, row]))
PER = int(__import__('os').environ.get('PER', '1000'))
cols = [rows[i:i + PER] for i in range(0, len(rows), PER)]
for c in cols:
    while len(c) < len(cols[0]): c.append(np.zeros_like(rows[0]))
img = np.hstack([np.vstack(c + [np.zeros((th, 8, 3), np.uint8)[:0]]) if False else np.vstack(c) for c in cols])
cv2.imwrite(out, img, [cv2.IMWRITE_JPEG_QUALITY, 80])
print(out, len(rows))
