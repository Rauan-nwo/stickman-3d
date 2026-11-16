// monitor.js: картинка 3D-игры конца 90-х на экране ЭЛТ-монитора: полигональный каньон летит навстречу, впереди
// угловатый корабль; на слове «hit» — взрыв из плоских осколков; на «trick inside» сетка треугольников вспыхивает
// вся разом (намёк на то, что чип считает тысячи треугольников одновременно). Рисуется в 320×240 и растягивается
// без сглаживания (пиксели), поверх — строки развёртки.
import { clamp, E } from 'engine';

const hash = (i, s = 1) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };
let low = null;
export function gameFrame(t, { hit = .45, wire = 1.45 } = {}) {
  const w = 320, h = 240;
  if (!low) { low = document.createElement('canvas'); low.width = w; low.height = h; }
  const x = low.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
  // небо
  const sky = x.createLinearGradient(0, 0, 0, h * .5); sky.addColorStop(0, '#1b1446'); sky.addColorStop(.7, '#7a2e5c'); sky.addColorStop(1, '#f08a3a');
  x.fillStyle = sky; x.fillRect(0, 0, w, h);
  x.fillStyle = '#ffd27a'; x.beginPath(); x.arc(w * .5, h * .5, 26, Math.PI, 0); x.fill();
  // полигональная земля: сетка, бегущая на камеру; высота — «каньон» по краям
  const hz = h * .5, f = 160, camY = 2.2, speed = 9, off = (t * speed) % 2;
  const rows = 22, cols = 16, quads = [];
  const height = (gx, gz) => { const e = Math.abs(gx) - 2.4; return e > 0 ? e * e * .55 + hash(Math.floor(gx) * 7 + Math.floor(gz + t * speed) * 13, 2) * .8 : 0; };
  const pr = (gx, y, gz) => [w / 2 + gx / gz * f, hz + (camY - y) / gz * f];
  for (let r = rows; r >= 1; r--) for (let c = -cols / 2; c < cols / 2; c++) {
    const z0 = r * 2 - off + .4, z1 = (r - 1) * 2 - off + .4; if (z1 < .5) continue;
    const a = pr(c, height(c, r), z0), b = pr(c + 1, height(c + 1, r), z0), d = pr(c + 1, height(c + 1, r - 1), z1), e = pr(c, height(c, r - 1), z1);
    quads.push([a, b, d, e, r, c]);
  }
  for (const [a, b, d, e, r, c] of quads) for (const [tri, k] of [[[a, b, d], 0], [[a, d, e], 1]]) {
    const lit = .35 + .5 * hash(r * 31 + c * 7 + k, 4) - r * .012, edge = Math.abs(c + .5) > 2.4;
    const col = edge ? [120 * lit + 40, 70 * lit + 20, 90 * lit + 30] : [40 * lit + 20, 110 * lit + 30, 90 * lit + 40];
    x.fillStyle = `rgb(${col.map(Math.round)})`; x.beginPath(); x.moveTo(...tri[0]); x.lineTo(...tri[1]); x.lineTo(...tri[2]); x.closePath(); x.fill();
  }
  // все треугольники разом — сетка вспыхивает
  const wk = clamp((t - wire) / .25) * (1 - clamp((t - wire - 1.2) / .6) * .4);
  if (wk > 0) { x.strokeStyle = `rgba(140,255,170,${.75 * wk})`; x.lineWidth = 1;
    for (const [a, b, d, e] of quads) { x.beginPath(); x.moveTo(...a); x.lineTo(...b); x.lineTo(...d); x.lineTo(...e); x.closePath(); x.moveTo(...a); x.lineTo(...d); x.stroke(); } }
  // корабль противника и взрыв
  const sx = w * .5 + Math.sin(t * 2.1) * 30, sy = h * .36 + Math.cos(t * 1.7) * 8;
  if (t < hit) {
    x.fillStyle = '#c8c8d8'; x.beginPath(); x.moveTo(sx, sy - 9); x.lineTo(sx + 22, sy + 6); x.lineTo(sx, sy + 2); x.lineTo(sx - 22, sy + 6); x.closePath(); x.fill();
    x.fillStyle = '#6a6a88'; x.beginPath(); x.moveTo(sx, sy - 9); x.lineTo(sx, sy + 2); x.lineTo(sx - 22, sy + 6); x.closePath(); x.fill();
    // трассеры игрока
    for (let i = 0; i < 3; i++) { const u = ((t * 3 + i / 3) % 1); x.fillStyle = '#ffef8a'; x.fillRect(w / 2 - 40 + (sx - w / 2 + 40) * u, h - (h - sy) * u, 3, 3); x.fillRect(w / 2 + 40 + (sx - w / 2 - 40) * u, h - (h - sy) * u, 3, 3); }
  } else {
    const u = t - hit, ex = w * .5 + Math.sin(hit * 2.1) * 30, ey = h * .36 + Math.cos(hit * 1.7) * 8;
    const R = 14 + E.outCubic(clamp(u / .5)) * 74, fade = 1 - clamp((u - .4) / 1.2);
    if (fade > 0) {
      x.fillStyle = `rgba(255,${Math.round(150 + 80 * fade)},60,${fade})`; x.beginPath();
      for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, rr = R * (i % 2 ? .45 : 1); x.lineTo(ex + Math.cos(a) * rr, ey + Math.sin(a) * rr); } x.closePath(); x.fill();
      x.fillStyle = `rgba(255,250,210,${fade})`; x.beginPath(); x.arc(ex, ey, R * .35, 0, Math.PI * 2); x.fill();
      for (let i = 0; i < 14; i++) { const a = hash(i, 9) * Math.PI * 2, v = 50 + hash(i, 5) * 110, px = ex + Math.cos(a) * v * u, py = ey + Math.sin(a) * v * u + 40 * u * u, s = 5 + hash(i, 3) * 6;
        x.fillStyle = i % 2 ? '#c8c8d8' : '#ff9a3a'; x.beginPath(); x.moveTo(px, py - s); x.lineTo(px + s, py + s * .6); x.lineTo(px - s * .8, py + s * .4); x.closePath(); x.fill(); }
    }
  }
  // прицел и полоска HUD без текста
  x.strokeStyle = 'rgba(160,255,180,.9)'; x.lineWidth = 1; x.strokeRect(w / 2 - 6, h * .62 - 6, 12, 12);
  x.fillStyle = 'rgba(160,255,180,.85)'; for (let i = 0; i < 7; i++) x.fillRect(10 + i * 9, h - 16, 6, 7);
  return low;
}
export function flashAt(t, hit) { const u = t - hit; return u < 0 ? 0 : Math.exp(-u * 5) * (u < .05 ? u / .05 : 1); }
