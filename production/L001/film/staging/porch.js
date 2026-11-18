// staging/porch.js — L14 крыльцо (assets/bg_front_door.png; вариант «HUANG» — bg_front_door_huang.png; владелец: рабочий B, гл. 9).
// Ночь, фонарь над крыльцом справа от двери. Агенты (agent1/agent2 из chars.js) стоят на настиле крыльца перед кадками — ближе к камере,
// чем кадки, поэтому рисуются поверх них; ступни на досках, контактная тень. Хозяин (homeowner, chars_B) — на пороге открытой двери.
// Дверь открывается внутрь: в проёме тёплая прихожая, полотно сжимается к петлям слева (ручка справа). В окне слева — хозяин и гость
// за кухонным столом (крошечные, обрезаны рамой окна; ниже подоконника их нет). Свет — фонарь справа-сверху: noirShade [1, -.6].
import { clamp, lerp, E, NOIR_FONT as F } from 'engine';
import { W, H, toS, plate, img, lazy, blurred, cover, canvas } from './common.js';
import { person, homeowner, guest, fieldAgent1, fieldAgent2 } from '../chars_B.js';
import { agent1, agent2 } from '../chars.js';
import { mug, moth, txt, redCircle } from '../props_B.js';
import doorPlate from '../../assets/bg_front_door.png';
import huangPlate from '../../assets/bg_front_door_huang.png';

export const CFG = {
  door: [1103, 250, 1337, 740],                       // полотно двери (x0, y0, x1, y1)
  a1: { at: [1015, 792], fs: .53, light: [1, -.6] }, a2: { at: [1440, 796], fs: .53, light: [.4, -.8] },
  home: { at: [1222, 742], fs: .5, light: [.8, -.5] },
  win: { clip: [802, 304, 903, 538], home: [828, 545], guest: [884, 545], fs: .15 },   // проём окна между шторами; сидящие за столом
  lamp: [1462, 300], mailPlate: [1464, 492],
  views: { wide: { cx: 960, cy: 540, k: 1.0 }, mid: { cx: 1225, cy: 520, k: 1.5 }, a1: { cx: 1030, cy: 470, k: 2.2 }, home: { cx: 1225, cy: 470, k: 2.2 }, win: { cx: 870, cy: 430, k: 2.6 } },
};
const I = { plate: img(doorPlate), huang: img(huangPlate) };
export const A = lazy([I.plate, I.huang], () => ({ plate: I.plate, huang: I.huang, b3: blurred(I.plate, 3), b6: blurred(I.plate, 6) }));
export const CAST = { A1: fieldAgent1(), A2: fieldAgent2(), HO: homeowner(), GU: guest(), HOw: homeowner(), GUw: guest() };
export const views = CFG.views;
export const view = (name, cam, drift = .3) => { const b = CFG.views[name], k = b.k * (1 + ((cam?.z ?? 1) - 1) * .55), lim = 70 / k;
  return cover({ cx: b.cx + clamp((cam?.dx || 0) * W * drift, -lim, lim), cy: b.cy + clamp((cam?.dy || 0) * H * drift, -lim, lim), k }); };

// открытая дверь: o 0..1. Прихожая (тёплый свет, вешалка) + полотно двери, сжатое к петлям слева
function doorway(ctx, v, a, o, src) {
  const [x0, y0, x1, y1] = CFG.door, P0 = toS(v, [x0, y0]), P1 = toS(v, [x1, y1]), w = P1[0] - P0[0], h = P1[1] - P0[1];
  ctx.save(); const g = ctx.createLinearGradient(P0[0], P0[1], P0[0], P1[1]); g.addColorStop(0, '#5a3a22'); g.addColorStop(.7, '#c88a48'); g.addColorStop(1, '#6a4428'); ctx.fillStyle = g; ctx.fillRect(P0[0], P0[1], w, h);
  const lg2 = ctx.createRadialGradient(P0[0] + w * .6, P0[1] + h * .1, 0, P0[0] + w * .6, P0[1] + h * .1, h * .5); lg2.addColorStop(0, 'rgba(255,220,150,.3)'); lg2.addColorStop(1, 'rgba(255,220,150,0)'); ctx.fillStyle = lg2; ctx.fillRect(P0[0], P0[1], w, h);               // свет прихожей
  ctx.fillStyle = '#3a2416'; ctx.fillRect(P0[0] + w * .7, P0[1] + h * .3, w * .2, h * .02); ctx.fillRect(P0[0], P0[1] + h * .86, w, h * .14);                            // вешалка, пол прихожей
  const lw = w * lerp(1, .18, E.inOutCubic(o));                                                                                                                   // полотно к петлям
  ctx.drawImage(src, x0, y0, x1 - x0, y1 - y0, P0[0], P0[1], lw, h); ctx.fillStyle = `rgba(0,0,0,${.35 * o})`; ctx.fillRect(P0[0], P0[1], lw, h); ctx.restore();
}
// кадр крыльца: o = { blur, huang, open 0..1, win: { laugh, circle 0..1 }, a1, a2, home: { mug: {tremble, steam} }, moth, solo, under(ctx, v) }
export function porch(ctx, v, t, T, o = {}) {
  const a = A(); if (!a) return {};
  if (!o.solo) plate(ctx, o.huang ? a.huang : o.blur >= 5 ? a.b6 : o.blur >= 2 ? a.b3 : a.plate, v);
  if (!o.solo && o.huang) { const P = toS(v, CFG.mailPlate); ctx.save(); ctx.translate(P[0], P[1]); txt(ctx, 'HUANG', 0, 0, 13 * v.k, { col: '#2a1c10', font: F.label, w: 900, align: 'center' }); ctx.restore(); }
  if (o.win && !o.solo) { const [cx0, cy0, cx1, cy1] = CFG.win.clip, A0 = toS(v, [cx0, cy0]), A1 = toS(v, [cx1, cy1]); ctx.save(); ctx.beginPath(); ctx.rect(A0[0], A0[1], A1[0] - A0[0], A1[1] - A0[1]); ctx.clip();
    const lk = [[0, o.win.laugh ? 'laugh' : 'neutral', { talking: false }]];
    person(ctx, v, t, T, { C: CAST.HOw, at: CFG.win.home, fs: CFG.win.fs, pin: 'seat', stance: 'sitR', view: 'threeQuarter', facing: 1, keys: lk, laugh: true, light: [-1, -.3], seed: 2, lean: .04 * Math.sin(t * 7) });
    person(ctx, v, t, T, { C: CAST.GUw, at: CFG.win.guest, fs: CFG.win.fs, pin: 'seat', stance: 'sitL', view: 'threeQuarter', facing: -1, keys: lk, laugh: true, light: [-1, -.3], seed: 5, lean: -.04 * Math.sin(t * 7 + 1) });
    ctx.fillStyle = '#2a1c14'; const mx = toS(v, [852, 417]); ctx.fillRect(A0[0], mx[1] - 2 * v.k, A1[0] - A0[0], 4 * v.k); ctx.fillRect(mx[0] - 2 * v.k, A0[1], 4 * v.k, A1[1] - A0[1]);   // переплёт окна поверх
    ctx.restore();
    if (o.win.circle > 0) { const G = toS(v, [CFG.win.guest[0], CFG.win.guest[1] - 412 * CFG.win.fs]); redCircle(ctx, G[0], G[1], 30 * v.k, 34 * v.k, o.win.circle, 4 * v.k); } }
  if (!o.solo && o.open > 0) doorway(ctx, v, a, o.open, o.huang ? a.huang : a.plate);
  const out = {};
  if (o.home) { const m = o.home; out.home = person(ctx, v, t, T, { C: CAST.HO, ...CFG.home, sp: 'CITIZEN', view: 'front', facing: -1, shadow: !o.solo, seed: 4, keys: [[0, 'neutral']], R: { k: 1, to: [CFG.home.at[0] + 70, CFG.home.at[1] - 300] }, ...m,
    heldR: (c, P, s) => mug(c, P[0], P[1], s, 1, m.tremble || 0, m.steam ?? .6, t) }); }
  if (o.under) o.under(ctx, v);
  if (o.a1) out.a1 = person(ctx, v, t, T, { C: CAST.A1, ...CFG.a1, sp: 'AGENT', view: 'threeQuarter', facing: 1, shadow: !o.solo, seed: 3, keys: [[0, 'neutral']], ...o.a1 });
  if (o.a2) out.a2 = person(ctx, v, t, T, { C: CAST.A2, ...CFG.a2, sp: 'AGENT 2', view: 'threeQuarter', facing: -1, shadow: !o.solo, seed: 6, keys: [[0, 'neutral']], ...o.a2 });
  if (o.moth && !o.solo) moth(ctx, ...toS(v, [CFG.lamp[0] - 10, CFG.lamp[1] + 10]), 1.4 * v.k, t);
  return out;
}
