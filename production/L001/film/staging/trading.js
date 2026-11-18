// staging/trading.js — L19 трейдерский стол (assets/bg_trading_desk.png; владелец: рабочий B, гл. 9).
// Стена красных тикеров, ряд мониторов с падающими графиками, два красных кресла на колёсах. Аналитики сидят в креслах ЛИЦОМ ДРУГ К ДРУГУ:
// аналитик 1 — в левом кресле (спинка слева от него, смотрит вправо), аналитик 2 — в правом (смотрит влево); бёдра на сиденье, ступни на полу.
// Кресла плейта — за ними (спинка), поэтому герои рисуются поверх плейта без масок. Свет — подвесные лампы сверху, красный отсвет экранов.
import { clamp, lerp, E } from 'engine';
import { W, H, toS, plate, img, lazy, blurred, cover } from './common.js';
import { person, analyst1, analyst2 } from '../chars_B.js';
import tradePlate from '../../assets/bg_trading_desk.png';

export const CFG = {
  an1: { at: [612, 838], fs: .74, light: [-.2, -1] }, an2: { at: [1250, 838], fs: .74, light: [.2, -1] },
  views: { wide: { cx: 960, cy: 540, k: 1.0 }, a1: { cx: 690, cy: 560, k: 2.0 }, a2: { cx: 1320, cy: 580, k: 1.6 }, desk: { cx: 960, cy: 640, k: 2.3 }, mon: { cx: 1330, cy: 570, k: 3.6 } },
};
const I = { plate: img(tradePlate) };
export const A = lazy([I.plate], () => ({ plate: I.plate, b3: blurred(I.plate, 3), b6: blurred(I.plate, 6) }));
export const CAST = { AN1: analyst1(), AN2: analyst2() };
export const views = CFG.views;
export const view = (name, cam, drift = .3) => { const b = CFG.views[name], k = b.k * (1 + ((cam?.z ?? 1) - 1) * .55), lim = 70 / k;
  return cover({ cx: b.cx + clamp((cam?.dx || 0) * W * drift, -lim, lim), cy: b.cy + clamp((cam?.dy || 0) * H * drift, -lim, lim), k }); };
// красный отсвет экранов на сцене
function redGlow(ctx) { ctx.save(); ctx.globalCompositeOperation = 'screen'; const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(255,40,30,.06)'); g.addColorStop(1, 'rgba(255,40,30,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore(); }
// кадр: o = { blur, an1: {...person}, an2: {...}, solo }
export function desk(ctx, v, t, T, o = {}) {
  const a = A(); if (!a) return {};
  if (!o.solo) plate(ctx, o.blur >= 5 ? a.b6 : o.blur >= 2 ? a.b3 : a.plate, v);
  const out = {};
  if (o.an2) out.an2 = person(ctx, v, t, T, { C: CAST.AN2, ...CFG.an2, pin: 'seat', stance: 'sitL', view: 'threeQuarter', facing: -1, sp: 'ANALYST 2', shadow: !o.solo, shadowW: 170, seed: 6, keys: [[0, 'neutral']], ...o.an2 });
  if (o.an1) out.an1 = person(ctx, v, t, T, { C: CAST.AN1, ...CFG.an1, pin: 'seat', stance: 'sitR', view: 'threeQuarter', facing: 1, sp: 'ANALYST', shadow: !o.solo, shadowW: 170, seed: 2, keys: [[0, 'neutral']], ...o.an1 });
  if (!o.solo) redGlow(ctx);
  return out;
}
