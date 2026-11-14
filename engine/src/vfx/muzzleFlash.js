// muzzleFlash.js: вспышка выстрела — плоская звезда с мягким ореолом, рисуется 2D поверх кадра (слой [4]).
// Растянутая на весь кадр (R ~ 1300) она же служит «склейкой на вспышке».
import { rng } from '../core/rng.js';

const cache = new Map();
const rays = (seed, n) => { const k = seed + ':' + n; if (!cache.has(k)) { const r = rng(seed), a = []; for (let i = 0; i < n; i++) a.push(i % 2 ? .3 + r() * .16 : .78 + r() * .3); cache.set(k, a); } return cache.get(k); };

export function muzzleFlash(ctx, cx, cy, R, alpha = 1, { seed = 5, n = 14, rot = .35 } = {}) {
  const F = rays(seed, n);
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(cx, cy);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 1.5); g.addColorStop(0, 'rgba(255,246,200,.75)'); g.addColorStop(1, 'rgba(255,190,80,0)'); ctx.fillStyle = g; ctx.fillRect(-R * 1.5, -R * 1.5, R * 3, R * 3);
  ctx.beginPath(); for (let i = 0; i < n; i++) { const a = i / n * 6.283 + rot, rr = F[i] * R; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath();
  const g2 = ctx.createRadialGradient(0, 0, 0, 0, 0, R); g2.addColorStop(0, '#FFFDF0'); g2.addColorStop(.55, '#FFF0B4'); g2.addColorStop(1, '#FFD978'); ctx.fillStyle = g2; ctx.fill();
  ctx.restore();
}

// четырёхлучевой блик (золото, стекло)
export function glint(ctx, cx, cy, r, col = '#fff') {
  ctx.save(); ctx.translate(cx, cy); ctx.fillStyle = col; ctx.beginPath();
  for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283, rr = i % 2 ? r * .16 : r; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  ctx.closePath(); ctx.fill(); ctx.restore();
}
