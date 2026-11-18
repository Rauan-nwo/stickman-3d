// ГОТОВО: L09 Megaspeed — офис (общий), обратная точка (дверь, табличка, стол у окна), 7ROAD-вариант обратной, стол на переднем плане. Владелец — рабочий A.
// staging/megaspeed.js — L09 офис Megaspeed (гл. 4–5, у рабочего B — гл. 7 «затихла»).
//   O  — bg_megaspeed_office: стол с мониторами слева (кресло спинкой к нам), окно на Марина-Бэй, стеклянная стена серверной справа.
//   R  — bg_megaspeed_reverse: от стекла серверной к двери с пустой табличкой и столу у окна (другой район); R7 — то же + постер 7Road и полка с трофеями.
// Перспектива одна на оба плейта (комната зеркальная): горизонт y ≈ 330, человек 1.75 м: fs(y) = .00104·(y − 330) пикселей плейта на единицу
// фигуры (ступни у y). Свет: настенные бра и лампа стола — тёплый, с той стороны, где лампа; у стекла серверной — холодный бирюзовый.
// Сидящие крупно — за 2D-столом на переднем плане (deskShot): кресла плейтов стоят спинкой к камере, сидящий лицом к нам на них невозможен.
// Тогда фон — размытый плейт, за героем — офисное кресло (chairBack), стол — передний план: столешница, кромка, передняя панель (ящик).
import { chairBack, ell, clamp, lerp, E } from 'engine';
import { W, H, toS, plate, img, blurred, lazy, polyMask, masked, fig, contact, figXf, cover } from './common.js';
import { pose, drawP, handS, person, shadeOf } from '../chars_A.js';
import oPlate from '../../assets/bg_megaspeed_office.png';
import rPlate from '../../assets/bg_megaspeed_reverse.png';
import r7Plate from '../../assets/bg_megaspeed_reverse_7road.png';

export const fsAt = y => .00104 * (y - 330);
export const CFG = {
  light: { O: [-1, -.4], R: [1, -.35], glass: [1, -.2] },
  door: { plaque: [664, 406, 104], frame: [552, 318, 782, 715] },                  // табличка на двери (центр, ширина) и проём двери (R/R7)
  chairR: [[1188, 640], [1206, 622], [1262, 614], [1300, 628], [1338, 690], [1350, 760], [1344, 820], [1300, 838], [1236, 830], [1214, 782], [1196, 712]],   // спинка кресла R (перед сидящим со спины)
  seatR: [1290, 846],                                                              // сиденье кресла R (сидящий со спины, pin seat)
  views: {
    oWide: { cx: 860, cy: 600, k: 1.12 }, oPlate: { cx: 470, cy: 720, k: 1.75 }, oGlass: { cx: 1420, cy: 560, k: 1.45 }, oDesk: { cx: 330, cy: 640, k: 1.6 },
    rWide: { cx: 860, cy: 560, k: 1.1 }, rDoor: { cx: 664, cy: 470, k: 1.7 }, rPlaque: { cx: 664, cy: 406, k: 5.2 }, rGlass: { cx: 560, cy: 560, k: 1.35 },
    rChair: { cx: 1290, cy: 640, k: 2.0 }, rWall: { cx: 920, cy: 260, k: 3.2 },
  },
};
const I = { O: img(oPlate), R: img(rPlate), R7: img(r7Plate) };
export const A = lazy([I.O, I.R, I.R7], () => ({ O: I.O, R: I.R, R7: I.R7, OB4: blurred(I.O, 4), RB4: blurred(I.R, 4), R7B4: blurred(I.R7, 4), OB10: blurred(I.O, 10), RB10: blurred(I.R, 10),
  chairR: masked(I.R, polyMask([CFG.chairR])) }));
export const views = CFG.views;
export function room(ctx, v, which = 'O', blur = 0, solo = false) { const a = A(); if (!a || solo) return; v = cover(v); plate(ctx, a[which + (blur >= 8 ? 'B10' : blur ? 'B4' : '')] || a[which], v); }

// стоящий в комнате: ступни at (пиксели плейта), масштаб — по перспективе; light — 'O' | 'R' | 'glass' | [dx, dy]
export function stand(ctx, C, v, t, T, o) {
  const L = Array.isArray(o.light) ? o.light : CFG.light[o.light || 'O'];
  return person(ctx, C, v, t, T, { fs: fsAt(o.at[1]) * (o.scale || 1), shade: shadeOf(L, o.warm), shDx: L[0] > 0 ? -.3 : .3, ...o });
}

// ---------- стол на переднем плане (крупные сидящие) ----------
// geo: seat [x, y] (пиксели плейта, pin 'seat' героя), fs; столешница: задняя кромка ниже сиденья на 125 ед., глубина 110 ед.
export function deskGeo(seat, fs) { const yb = seat[1] - 165 * fs, yf = yb + 120 * fs; return { seat, fs, yb, yf, x0: seat[0] - 1600 * fs, x1: seat[0] + 1600 * fs, hand: sd => [seat[0] + sd * 66 * fs, yb + 38 * fs], elbow: sd => [seat[0] + sd * 150 * fs, yb + 90 * fs], on: (u, w) => [seat[0] + u * fs, lerp(yb, yf, w)] }; }
function deskSlab(ctx, v, g, o = {}) {
  const P = q => toS(v, q), s = g.fs * v.k, a = P([g.x0, g.yb]), b = P([g.x1, g.yb]), c = P([g.x1 + 60 * g.fs, g.yf]), d = P([g.x0 - 60 * g.fs, g.yf]);
  const lit = o.lightX ?? 1;
  ctx.save(); ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.lineTo(...c); ctx.lineTo(...d); ctx.closePath();
  const gr = ctx.createLinearGradient(a[0], 0, b[0], 0); gr.addColorStop(0, lit > 0 ? '#7a4c22' : '#c8904a'); gr.addColorStop(.5, '#a8743a'); gr.addColorStop(1, lit > 0 ? '#d29a52' : '#7a4c22');
  ctx.fillStyle = gr; ctx.fill();
  // мягкое пятно света лампы на столешнице
  const lp = P([g.seat[0] + lit * 520 * g.fs, (g.yb + g.yf) / 2]); const rg = ctx.createRadialGradient(lp[0], lp[1], 0, lp[0], lp[1], 600 * s); rg.addColorStop(0, 'rgba(255,214,140,.35)'); rg.addColorStop(1, 'rgba(255,200,120,0)');
  ctx.save(); ctx.clip(); ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H); for (let i = 1; i < 4; i++) { const y = lerp(a[1], d[1], i / 4); ctx.strokeStyle = 'rgba(90,50,20,.25)'; ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y + 6 * s); ctx.stroke(); } ctx.restore();
  ctx.lineWidth = 6 * s; ctx.strokeStyle = '#1C1418'; ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke();
  // кромка и передняя панель до низа кадра
  const e = 26 * s; ctx.beginPath(); ctx.moveTo(d[0], d[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(c[0], c[1] + e); ctx.lineTo(d[0], d[1] + e); ctx.closePath(); ctx.fillStyle = '#6a3e1a'; ctx.fill();
  ctx.fillStyle = '#4a2a12'; ctx.fillRect(d[0], d[1] + e, c[0] - d[0], H * 2);
  ctx.strokeStyle = '#1C1418'; ctx.lineWidth = 6 * s; ctx.beginPath(); ctx.moveTo(d[0], d[1]); ctx.lineTo(c[0], c[1]); ctx.stroke(); ctx.beginPath(); ctx.moveTo(d[0], d[1] + e); ctx.lineTo(c[0], c[1] + e); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,220,160,.45)'; ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.moveTo(d[0], d[1] + 3 * s); ctx.lineTo(c[0], c[1] + 3 * s); ctx.stroke();
  ctx.restore();
  return { front: (u, dy = 0) => P([g.seat[0] + u * g.fs, g.yf + dy * g.fs]), e: e / s };
}
// ящик стола: выдвигается из передней панели (u — сдвиг 0..1), центр по x — u0 (ед. фигуры от сиденья), content(ctx, cx, top, w, s) — что лежит внутри
export function drawer(ctx, v, g, u0, open, content) {
  const s = g.fs * v.k, f = toS(v, [g.seat[0] + u0 * g.fs, g.yf]), w = 300 * s, h = 90 * s, top = f[1] + 50 * s, dy = open * 70 * s;
  ctx.save(); ctx.lineJoin = 'round';
  if (open > .02) { ctx.fillStyle = '#2a160a'; ctx.fillRect(f[0] - w / 2, top - 2 * s, w, h); if (content) content(ctx, f[0], top - 2 * s + dy * .3, w, s);   // проём и что внутри
    ctx.beginPath(); ctx.moveTo(f[0] - w / 2, top + dy); ctx.lineTo(f[0] - w / 2 - 20 * s * open, top - dy * .2); ctx.lineTo(f[0] + w / 2 + 20 * s * open, top - dy * .2); ctx.lineTo(f[0] + w / 2, top + dy); ctx.closePath(); ctx.fillStyle = '#3a2210'; ctx.fill(); ctx.lineWidth = 4 * s; ctx.strokeStyle = '#1C1418'; ctx.stroke(); }
  ctx.beginPath(); ctx.roundRect(f[0] - w / 2, top + dy, w, h, 6 * s); ctx.fillStyle = '#5a3418'; ctx.fill(); ctx.lineWidth = 5 * s; ctx.strokeStyle = '#1C1418'; ctx.stroke();
  ctx.beginPath(); ctx.roundRect(f[0] - 40 * s, top + dy + h * .4, 80 * s, 14 * s, 6 * s); ctx.fillStyle = '#C9A04A'; ctx.fill(); ctx.lineWidth = 3 * s; ctx.stroke();
  ctx.restore();
}
// сидящий за столом переднего плана. o = { C, bg: 'O'|'R'|'R7', blur, seat, fs, sp, keys, look, lean, view, f, seed,
//   L/R: { k, to: [x,y] плейта } (кисть со стола к точке), heldL/heldR(ctx, h, s), deskTop(ctx, v, g, D) — предметы на столешнице (под руками),
//   front(ctx, v, g, D) — поверх стола (ящик), over(ctx, v, g) — поверх всего, chair: цвета, light: [dx,dy], solo }
export function deskShot(ctx, v, t, T, o) {
  const a = A(); if (!a) return {};
  const g = deskGeo(o.seat, o.fs), L = o.light || [1, -.3], C = o.C;
  if (!o.solo) plate(ctx, a[(o.bg || 'R') + 'B4'] || a[o.bg], v);
  if (o.under && !o.solo) o.under(ctx, v, g);
  if (!o.solo) { const f = figXf(C, v, g.seat, g.fs, 'seat'); ctx.save(); ctx.translate(f.x, f.y); ctx.scale(f.s, f.s); ctx.translate(-f.P[0], -f.P[1]);
    chairBack(ctx, { seatY: f.P[1], w: 440, h: 520, light: L[0] > 0 ? 1 : -1, legs: 0, col: o.chair || { frame: '#1e1a1e', velvet: '#8a2228', shade: '#5e161a', hi: 'rgba(255,170,140,.3)', wood: '#141014' } }); ctx.restore(); }
  const onDesk = sd => { const m = o[sd > 0 ? 'R' : 'L']; return !(m && m.k > .3); };
  const P = pose(C, t, T, { at: g.seat, fs: g.fs, pin: 'seat', f: o.f ?? 1, view: o.view === undefined ? null : o.view, keys: o.keys, look: o.look, lean: o.lean, tilt: o.tilt, sp: o.sp, seed: o.seed, shade: shadeOf(L, o.warm),
    L: o.L && o.L.k > .001 ? o.L : { k: 1, to: g.hand(-1) }, R: o.R && o.R.k > .001 ? o.R : { k: 1, to: g.hand(1) } });
  // на столе: кисть лежит в точке стола (локоть — к краю)
  drawP(ctx, P, v, 'base');
  let D = {};
  if (!o.solo) { D = deskSlab(ctx, v, g, { lightX: L[0] > 0 ? 1 : -1 }); if (o.front) o.front(ctx, v, g, D); if (o.deskTop) o.deskTop(ctx, v, g, D);
    for (const sd of [-1, 1]) if (onDesk(sd)) { const h = handS(P, v, sd > 0 ? 'R' : 'L'), s = g.fs * v.k; ctx.save(); ctx.filter = `blur(${(5 * s).toFixed(1)}px)`; ctx.fillStyle = 'rgba(30,12,6,.45)'; ctx.beginPath(); ctx.ellipse(h[0] + 6 * s, h[1] + 10 * s, 26 * s, 10 * s, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); } }
  drawP(ctx, P, v, 'front');
  const out = { P, g, D, hl: handS(P, v, 'L'), hr: handS(P, v, 'R'), s: g.fs * v.k };
  if (o.heldL) o.heldL(ctx, out.hl, out.s); if (o.heldR) o.heldR(ctx, out.hr, out.s);
  for (const k of ['heldL', 'heldR']) if (o[k]) { const h = k === 'heldL' ? out.hl : out.hr; ell(ctx, h[0], h[1], 12 * out.s, 12 * out.s, C.spec.colors.ink, null); }
  if (o.over && !o.solo) o.over(ctx, v, g);
  return out;
}
// сидящий в кресле R спиной к камере (силуэт «в кресле за стеклом» #147): спинка кресла плейта поверх героя
export function inChairR(ctx, C, v, t, T, o = {}) {
  const a = A(); if (!a) return;
  const P = pose(C, t, T, { at: CFG.seatR, fs: fsAt(CFG.seatR[1] + 60) * .95, pin: 'seat', f: 1, view: 'back', stance: 'sitR', keys: o.keys || [[0, 'neutral']], look: [0, 0], shade: shadeOf(CFG.light.R) });
  drawP(ctx, P, v);
  if (!o.solo) plate(ctx, a.chairR, v);
}
export { lerp, clamp, E };
