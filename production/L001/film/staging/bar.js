// ГОТОВО: L10 бар Тайбэя — гости у стойки, табуреты переднего плана (маски), групповой снимок. Владелец — рабочий A.
// staging/bar.js — L10 бар Тайбэя (гл. 5, вечеринка Computex). Плейт bg_taipei_bar_dry (дождя в окне нет).
// Гости стоят у стойки, ступни на полу у её основания (y ≈ 1045); стойка — им по пояс (верх y ≈ 630); табуреты ближе к камере,
// чем гости: спинка с сиденьем, ножки и кольцо-подножка — полигоны (STOOLS), рисуются поверх героев.
// Свет — латунная лампа на стойке (780, 450): тёплый, на каждого героя со стороны лампы.
import { clamp, lerp, E, ell } from 'engine';
import { W, H, toS, plate, img, blurred, lazy, polyMask, masked } from './common.js';
import { person, figS, shadeOf } from '../chars_A.js';
import barPlate from '../../assets/bg_taipei_bar_dry.png';

const ring = (cx, cy, rx, ry, w) => { const o = [], n = 28; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; o.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } for (let i = n; i >= 0; i--) { const a = i / n * Math.PI * 2; o.push([cx + Math.cos(a) * (rx - w), cy + Math.sin(a) * (ry - w * .4)]); } return o; };
export const CFG = {
  lamp: [780, 450], floor: 1045, fs: .77,
  STOOLS: [
    [[150, 560], [230, 555], [330, 565], [395, 590], [440, 660], [445, 725], [540, 735], [590, 760], [595, 800], [580, 835], [220, 835], [180, 760]],
    [[245, 845], [270, 845], [248, 1080], [222, 1080]], [[345, 845], [368, 845], [378, 1080], [355, 1080]], [[548, 840], [572, 840], [588, 1080], [562, 1080]], ring(405, 990, 148, 26, 18),
    [[1500, 580], [1560, 560], [1700, 555], [1780, 565], [1785, 610], [1760, 730], [1745, 830], [1350, 835], [1340, 790], [1345, 755], [1420, 730], [1490, 725], [1498, 660]],
    [[1385, 845], [1410, 845], [1400, 1080], [1374, 1080]], [[1468, 845], [1492, 845], [1505, 1080], [1480, 1080]], [[1655, 845], [1680, 845], [1690, 1080], [1665, 1080]], ring(1530, 990, 148, 26, 18),
  ],
  views: { wide: { cx: 960, cy: 540, k: 1.0 }, group: { cx: 960, cy: 590, k: 1.18 }, pair: { cx: 980, cy: 520, k: 1.9 }, left: { cx: 560, cy: 520, k: 1.9 } },
};
const I = { plate: img(barPlate) };
export const A = lazy([I.plate], () => ({ plate: I.plate, B4: blurred(I.plate, 4), B10: blurred(I.plate, 10), stools: masked(I.plate, polyMask(CFG.STOOLS)) }));
export const views = CFG.views;
export function bar(ctx, v, blur = 0, solo) { const a = A(); if (a && !solo) plate(ctx, blur >= 8 ? a.B10 : blur ? a.B4 : a.plate, v); }
export function stools(ctx, v, solo) { const a = A(); if (a && !solo) plate(ctx, a.stools, v); }
// гость у стойки: x — где стоит (ступни на полу), dz — ближе к камере (+) / дальше (−) в пикселях пола
export function guestAt(ctx, C, v, t, T, x, o = {}) {
  const fy = CFG.floor + (o.dz || 0), fs = CFG.fs * (1 + (o.dz || 0) / 900), L = CFG.lamp, dir = [L[0] - x > 0 ? 1 : -1, -.5];
  return person(ctx, C, v, t, T, { at: [x, fy], fs, shade: shadeOf(dir, '#ffb468'), shDx: -dir[0] * .3, ...o });
}
// бейдж на груди героя (MEGASPEED у Алисы): в преобразовании позы
export function chestBadge(ctx, P, v, l1, l2, k = 1) { const c = figS(P, v, [42 * P.p.facing, -500]), s = P.fs * v.k; const draw = P.C.spec;
  void draw; ctx.save(); ctx.translate(c[0], c[1]); ctx.scale(k, k); ctx.beginPath(); ctx.roundRect(-58 * s, -36 * s, 116 * s, 72 * s, 7 * s); ctx.fillStyle = '#F2EEE2'; ctx.fill(); ctx.lineWidth = 4 * s; ctx.strokeStyle = '#141014'; ctx.stroke();
  ctx.fillStyle = '#2a8a4a'; ctx.fillRect(-52 * s, -30 * s, 104 * s, 20 * s); ctx.fillStyle = '#fff'; ctx.font = `900 ${Math.round(14 * s)}px Bahnschrift, 'Segoe UI', sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(l1, 0, -20 * s);
  ctx.fillStyle = '#141014'; ctx.font = `900 ${Math.round(17 * s)}px 'Courier New', monospace`; ctx.fillText(l2, 0, 12 * s, 104 * s); ctx.restore(); }
export { clamp, lerp, E, ell };
