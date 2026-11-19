// staging/camA.js — камера ядра В ПОЛНУЮ СИЛУ для планов рабочего A (гл. 4–6), по замечанию координатора об энергии:
// наезд/рывок/«биты» слов (cam.z) — целиком (zk 1.0), дрейф ядра (cam.dx/dy) — целиком, без доли drift; ограничение только по правилу
// кадрирования: сдвиг не больше lim пикселей экрана и кадр не выходит за плейт (cover).
// keep — что обязано остаться в кадре (координаты плейта): t — верх (макушка), b — низ (бейдж, бирка), l / r — края (второй герой);
// поля экрана mt/mb/ml/mr. Поля по умолчанию учитывают удар камеры ядра на слове (×1.10 от центра со сдвигом 3.5 % ширины):
// сверху/снизу 70, по бокам 180. mt 290 — макушка ниже подписи ядра (вещь-подпись стоит по центру на y = H·0.2).
// Если t и b (или l и r) не помещаются при полном наезде — наезд ограничивается ровно настолько, насколько нужно.
import { W, H, cover } from './common.js';
import { clamp } from 'engine';
export const camA = (b, cam, lim = 220, keep) => {
  let k = b.k * cam.z; const q = keep || {}, mt = q.mt ?? 70, mb = q.mb ?? 70, ml = q.ml ?? 180, mr = q.mr ?? 180;
  if (q.t != null && q.b != null) k = Math.min(k, (H - mt - mb) / (q.b - q.t));
  if (q.l != null && q.r != null) k = Math.min(k, (W - ml - mr) / (q.r - q.l));
  k = Math.max(1, k); const L = lim / k;
  let cx = b.cx + clamp((cam.dx || 0) * W, -L, L), cy = b.cy + clamp((cam.dy || 0) * H, -L, L);
  if (q.t != null) cy = Math.min(cy, q.t + (H / 2 - mt) / k);
  if (q.b != null) cy = Math.max(cy, q.b - (H / 2 - mb) / k);
  if (q.l != null) cx = Math.min(cx, q.l + (W / 2 - ml) / k);
  if (q.r != null) cx = Math.max(cx, q.r - (W / 2 - mr) / k);
  return cover({ cx, cy, k });
};
// наезд вставки в точку: src (экран при z = 1) уходит к dst по мере наезда — важная строка/предмет не уезжает за край
export const zoomAt = (ctx, z, src, dst = src, zFull = 1.8) => { const u = clamp((z - 1) / (zFull - 1)), x = src[0] + (dst[0] - src[0]) * u, y = src[1] + (dst[1] - src[1]) * u;
  ctx.translate(x, y); ctx.scale(z, z); ctx.translate(-src[0], -src[1]); };
// вещь-подпись как у ядра (бумажная плашка Courier / маркер), но в своём месте кадра — когда место ядра (центр, y = H·0.2) занято лицом
export function plaqueA(ctx, q, x, y, u, kind = 'tag') {
  if (u < 0) return; ctx.save(); ctx.translate(x, y);
  if (kind === 'chalk') {
    const n = Math.ceil(q.length * clamp(u / .5)); ctx.rotate(-.03); ctx.font = "700 60px 'Segoe Print', 'Comic Sans MS', cursive"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(0,0,0,.45)'; const w = ctx.measureText(q).width + 40; ctx.beginPath(); ctx.roundRect(-w / 2, -44, w, 88, 10); ctx.fill();
    ctx.fillStyle = '#f7f3ea'; ctx.fillText(q.slice(0, n), 0, 2);
  } else {
    const k = u >= .2 ? 1 : 1 + 2.70158 * Math.pow(u / .2 - 1, 3) + 1.70158 * Math.pow(u / .2 - 1, 2); ctx.scale(k, k); ctx.font = "700 40px 'Courier New', monospace"; const w = ctx.measureText(q).width + 56;
    ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 16; ctx.fillStyle = '#efe4c8'; ctx.beginPath(); ctx.roundRect(-w / 2, -40, w, 80, 6); ctx.fill(); ctx.shadowBlur = 0;
    ctx.strokeStyle = '#3a2a18'; ctx.lineWidth = 3; ctx.stroke(); ctx.fillStyle = '#1c140c'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(q, 0, 3, w - 30);
  }
  ctx.restore();
}
