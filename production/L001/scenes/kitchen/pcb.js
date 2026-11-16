// pcb.js: «провал» сквозь экран (#62): видеокарта сверху → чип → кристалл с сеткой ячеек. Из ячеек кристалла потом
// вырастает кухня (film.js: ячейки становятся окнами, через которые видна кухня, и раскрываются).
import { clamp, lerp, E } from 'engine';

export const DIE = { cx: 960, cy: 540, s: 168, n: 12 };          // кристалл в «мировых» пикселях платы, n×n ячеек
const INK = '#0b0910';
const hash = (i, s = 1) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };

// k — масштаб вокруг центра кристалла (1 — вся плата в кадре)
export function pcbTransform(ctx, W, H, k) { ctx.translate(W / 2, H / 2); ctx.scale(k, k); ctx.translate(-DIE.cx, -DIE.cy); }

export function drawBoard(ctx, t, glow = 0) {
  // плата
  ctx.fillStyle = '#16382a'; ctx.fillRect(-200, 60, 2320, 960);
  ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.strokeRect(-200, 60, 2320, 960);
  ctx.fillStyle = '#1d4a36'; ctx.fillRect(-200, 60, 2320, 24);
  // дорожки: золотистые линии от чипа к памяти и разъёму
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (let i = 0; i < 40; i++) {
    const side = i % 4, o = (Math.floor(i / 4) - 4.5) * 26, a = .35 + .3 * hash(i, 2);
    ctx.strokeStyle = `rgba(214,178,80,${a})`; ctx.lineWidth = 4; ctx.beginPath();
    if (side === 0) { ctx.moveTo(DIE.cx + o, DIE.cy - 190); ctx.lineTo(DIE.cx + o, DIE.cy - 250 - hash(i) * 60); ctx.lineTo(DIE.cx + o * 2.2, 130); }
    if (side === 1) { ctx.moveTo(DIE.cx + o, DIE.cy + 190); ctx.lineTo(DIE.cx + o, DIE.cy + 260); ctx.lineTo(DIE.cx + o * 3, 1000); }
    if (side === 2) { ctx.moveTo(DIE.cx - 190, DIE.cy + o); ctx.lineTo(DIE.cx - 270, DIE.cy + o); ctx.lineTo(420, DIE.cy + o * 2.4); }
    if (side === 3) { ctx.moveTo(DIE.cx + 190, DIE.cy + o); ctx.lineTo(DIE.cx + 280, DIE.cy + o); ctx.lineTo(1500, DIE.cy + o * 2.4); }
    ctx.stroke();
  }
  ctx.restore();
  // чипы памяти и конденсаторы
  for (const [x, y] of [[300, 300], [300, 700], [1620, 300], [1620, 700], [600, 160], [1320, 160]]) {
    ctx.fillStyle = '#121014'; ctx.fillRect(x - 90, y - 55, 180, 110); ctx.strokeStyle = INK; ctx.lineWidth = 5; ctx.strokeRect(x - 90, y - 55, 180, 110);
    ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(x - 80, y - 48, 160, 14);
    for (let i = 0; i < 8; i++) { ctx.fillStyle = '#c9b16a'; ctx.fillRect(x - 84 + i * 22, y + 55, 10, 14); ctx.fillRect(x - 84 + i * 22, y - 69, 10, 14); }
  }
  for (let i = 0; i < 18; i++) { const x = 480 + hash(i, 7) * 960, y = 820 + hash(i, 8) * 140; ctx.fillStyle = '#2a2a30'; ctx.beginPath(); ctx.arc(x, y, 16, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.stroke(); ctx.fillStyle = '#8a8a96'; ctx.beginPath(); ctx.arc(x - 4, y - 4, 6, 0, Math.PI * 2); ctx.fill(); }
  // разъём снизу
  for (let i = 0; i < 46; i++) { ctx.fillStyle = '#d9b24a'; ctx.fillRect(360 + i * 26, 1000, 16, 40); }
  // корпус чипа и выводы
  const P = 190;
  ctx.fillStyle = '#0f2a20'; ctx.fillRect(DIE.cx - P, DIE.cy - P, P * 2, P * 2); ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.strokeRect(DIE.cx - P, DIE.cy - P, P * 2, P * 2);
  for (let i = 0; i < 20; i++) { const o = -P + 12 + i * (P * 2 - 24) / 19; ctx.fillStyle = '#d9b24a';
    ctx.fillRect(DIE.cx + o - 4, DIE.cy - P - 16, 8, 16); ctx.fillRect(DIE.cx + o - 4, DIE.cy + P, 8, 16); ctx.fillRect(DIE.cx - P - 16, DIE.cy + o - 4, 16, 8); ctx.fillRect(DIE.cx + P, DIE.cy + o - 4, 16, 8); }
  drawDie(ctx, t, glow);
}

// кристалл: сетка ячеек; glow 0..1 — ячейки теплеют (в них «загорается» кухня)
export function drawDie(ctx, t, glow = 0, { holes = null } = {}) {
  const s = DIE.s, x0 = DIE.cx - s / 2, y0 = DIE.cy - s / 2, c = s / DIE.n;
  const g = ctx.createLinearGradient(x0, y0, x0 + s, y0 + s); g.addColorStop(0, '#5d6c8a'); g.addColorStop(.5, '#36405c'); g.addColorStop(1, '#262c44');
  ctx.fillStyle = g; ctx.fillRect(x0, y0, s, s);
  for (let i = 0; i < DIE.n; i++) for (let j = 0; j < DIE.n; j++) {
    const h = hash(i * 31 + j, 3), w = glow * clamp(glow * 2.2 - h * 1.2);
    ctx.fillStyle = `rgba(${Math.round(70 + 185 * w)},${Math.round(90 + 110 * w)},${Math.round(130 - 40 * w)},${.55 + .45 * w})`;
    ctx.fillRect(x0 + i * c + c * .12, y0 + j * c + c * .12, c * .76, c * .76);
  }
  ctx.strokeStyle = 'rgba(140,255,190,.5)'; ctx.lineWidth = .8;
  for (let i = 0; i <= DIE.n; i++) { ctx.beginPath(); ctx.moveTo(x0 + i * c, y0); ctx.lineTo(x0 + i * c, y0 + s); ctx.moveTo(x0, y0 + i * c); ctx.lineTo(x0 + s, y0 + i * c); ctx.stroke(); }
  ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.strokeRect(x0, y0, s, s);
}

// крышка из кристалла с «окнами»: ячейки раскрываются от центра (u 0..1), сквозь них видна кухня (уже нарисованная)
export function dieCover(ctx, W, H, k, u, buf) {
  if (u >= 1) return;
  const b = buf.getContext('2d'); b.setTransform(1, 0, 0, 1, 0, 0); b.globalCompositeOperation = 'source-over'; b.clearRect(0, 0, W, H);
  b.save(); pcbTransform(b, W, H, k); drawDie(b, 0, 1); b.restore();
  b.save(); pcbTransform(b, W, H, k); b.globalCompositeOperation = 'destination-out';
  const s = DIE.s, x0 = DIE.cx - s / 2, y0 = DIE.cy - s / 2, c = s / DIE.n, m = (DIE.n - 1) / 2;
  for (let i = 0; i < DIE.n; i++) for (let j = 0; j < DIE.n; j++) {
    const d = Math.hypot(i - m, j - m) / (m * 1.42), g = E.outCubic(clamp((u - d * .45) / .55)), hs = c * (.38 + .7 * g);
    b.fillRect(x0 + (i + .5) * c - hs, y0 + (j + .5) * c - hs, hs * 2, hs * 2);
  }
  b.restore();
  // за пределами кристалла (если он меньше кадра) — тоже открыто
  ctx.save(); ctx.globalAlpha = 1 - E.inCubic(clamp((u - .75) / .25)); ctx.drawImage(buf, 0, 0); ctx.restore();
}
