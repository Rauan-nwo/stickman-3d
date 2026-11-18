// ГОТОВО: L17 склад (bg_blocked_warehouse) — поддоны зелёных коробок H20 за красно-белой лентой. Владелец — рабочий A (по просьбе ведущего; конфиг взят из локального в shots/ch07.js рабочего B).
// staging/warehouse.js — общий конфиг L17 для гл. 3 (A) и гл. 7 (B). API: WH.A() — плейт; WH.plate(ctx, v, blur, solo); WH.views; WH.boxes — точки подписей коробок
// (низ-центр подписи и ширина, пиксели плейта); WH.labels(ctx, v, text) — трафарет на коробках (NOIR_FONT.label). Свет — холодная лампа под потолком.
import { NOIR_FONT } from 'engine';
import { W, H, toS, plate, img, lazy, blurred, cover } from './common.js';
import warehousePlate from '../../assets/bg_blocked_warehouse.png';

const I = { p: img(warehousePlate) };
export const A = lazy([I.p], () => ({ p: I.p, pB4: blurred(I.p, 4) }));
export const WH = {
  A,
  views: { pallets: { cx: 1500, cy: 640, k: 1.55 }, near: { cx: 1640, cy: 820, k: 2.0 }, wide: { cx: 960, cy: 540, k: 1.0 } },
  boxes: [[1760, 760, 150], [1790, 880, 160], [1720, 1000, 170]],
  plate(ctx, v, blur = 0, solo = false) { const a = A(); if (a && !solo) plate(ctx, blur ? a.pB4 : a.p, cover(v)); },
  labels(ctx, v, text = 'NVIDIA H20') { ctx.save(); ctx.fillStyle = '#141014'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const [bx, by, w] of WH.boxes) { const P = toS(v, [bx, by]); ctx.font = `900 ${Math.round(18 * v.k)}px ${NOIR_FONT.label}`; ctx.fillText(text, P[0], P[1], w * v.k * .9); } ctx.restore(); },
};
export { W, H };
