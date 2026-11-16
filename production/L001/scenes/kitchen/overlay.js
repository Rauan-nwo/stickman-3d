// overlay.js: рамка «представьте» (метафора отделена от истории) и плашки CPU / GPU в стиле чёрной карточки.
import { NOIR, NOIR_FONT, clamp, E } from 'engine';

const hash = (i, s = 1) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };
const HAND = "'Ink Free', 'Segoe Print', cursive";

// мягкая тёплая виньетка «сна» + меловая рамка со скруглёнными углами (рисуется линией, чуть дрожит)
export function imagineFrame(ctx, W, H, t, { k = 1, seed = 3, draw = 1 } = {}) {
  if (k <= 0) return;
  ctx.save();
  const g = ctx.createRadialGradient(W / 2, H / 2, H * .42, W / 2, H / 2, H * 1.02);
  g.addColorStop(0, 'rgba(10,6,12,0)'); g.addColorStop(.7, `rgba(10,6,12,${.38 * k})`); g.addColorStop(1, `rgba(6,3,8,${.85 * k})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // меловая рамка: точки по периметру с дрожанием (детерминированно)
  const m = 30, r = 46, pts = [];
  const per = (x0, y0, x1, y1, n) => { for (let i = 0; i < n; i++) pts.push([x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n]); };
  const arc = (cx, cy, a0) => { for (let i = 0; i < 8; i++) { const a = a0 + i / 8 * Math.PI / 2; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } };
  per(m + r, m, W - m - r, m, 40); arc(W - m - r, m + r, -Math.PI / 2); per(W - m, m + r, W - m, H - m - r, 24); arc(W - m - r, H - m - r, 0);
  per(W - m - r, H - m, m + r, H - m, 40); arc(m + r, H - m - r, Math.PI / 2); per(m, H - m - r, m, m + r, 24); arc(m + r, m + r, Math.PI);
  const n = Math.floor(pts.length * clamp(draw));
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const [lw, a] of [[5, .12], [2.4, .5]]) {
    ctx.beginPath();
    for (let i = 0; i <= n && i < pts.length; i++) { const [x, y] = pts[i], j = Math.floor(t * 8); const dx = (hash(i, seed + j) - .5) * 2.2, dy = (hash(i + 99, seed + j) - .5) * 2.2; i ? ctx.lineTo(x + dx, y + dy) : ctx.moveTo(x + dx, y + dy); }
    ctx.strokeStyle = `rgba(241,230,204,${a * k})`; ctx.lineWidth = lw; ctx.stroke();
  }
  ctx.restore();
}

// плашка в углу: чёрная карточка, крупное слово мелом и подпись-счётчик
export function tag(ctx, W, H, t, { word, sub = '', at = 0, x = 64, y = 60, accent = NOIR.amber, pulse = 0, WS = 88, SS = 58 }) {
  const k = E.outCubic(clamp((t - at) / .3)); if (k <= 0) return;
  ctx.save(); ctx.globalAlpha = k; ctx.translate(x, y + (1 - k) * -12);
  ctx.font = `bold ${WS}px ${HAND}`; const w1 = ctx.measureText(word).width; ctx.font = `bold ${SS}px ${HAND}`; const w2 = sub ? ctx.measureText(sub).width : 0;
  const w = Math.max(w1, w2) + 70, h = sub ? WS + SS + 64 : WS + 40;
  ctx.fillStyle = 'rgba(11,9,16,.86)'; ctx.beginPath(); ctx.roundRect(0, 0, w, h, 10); ctx.fill();
  ctx.strokeStyle = 'rgba(241,230,204,.35)'; ctx.lineWidth = 2; ctx.stroke();
  const s = 1 + pulse * .06; ctx.save(); ctx.translate(35, WS * .5 + 24); ctx.scale(s, s);
  ctx.font = `bold ${WS}px ${HAND}`; ctx.textBaseline = 'middle'; ctx.fillStyle = NOIR.cream; ctx.shadowColor = 'rgba(255,214,150,.35)'; ctx.shadowBlur = 8; ctx.fillText(word, 0, 0); ctx.restore();
  if (sub) { const sp = 1 + pulse * .12; ctx.save(); ctx.translate(35, WS + 30 + SS * .5); ctx.scale(sp, sp); ctx.font = `bold ${SS}px ${HAND}`; ctx.textBaseline = 'middle'; ctx.fillStyle = accent; ctx.shadowColor = 'rgba(255,190,90,.4)'; ctx.shadowBlur = 10; ctx.fillText(sub, 0, 0); ctx.restore(); }
  ctx.restore();
}
