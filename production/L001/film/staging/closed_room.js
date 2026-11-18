// staging/closed_room.js — L18 закрытая комната (assets/bg_closed_room.png; владелец: рабочий B, гл. 8).
// Комната без окон: круглый стол с зелёным сукном под одной лампой, четыре кресла, флаг, дверь-сейф с красной лампой над ней.
// Помощники сидят в дальних креслах лицом к нам: AIDE (aide из chars.js, ведущий) — слева, AIDE 2 (aide2 из chars_B) — справа.
// Слои: плейт -> помощники -> стол (столешница и передняя кромка) и ближние кресла (маска CFG.front — они ближе к камере) -> руки на сукне.
// Свет — лампа над столом (сверху-по центру): noirShade [±.35, -1].
import { clamp, lerp, E, NOIR_FONT as F } from 'engine';
import { W, H, toS, plate, img, lazy, blurred, masked, polyMask, cover } from './common.js';
import { person, aide2 } from '../chars_B.js';
import { aide } from '../chars.js';
import roomPlate from '../../assets/bg_closed_room.png';

export const CFG = {
  seat: { A1: [668, 650], A2: [1262, 650] }, fs: .62,
  light: { A1: [.5, -1], A2: [-.5, -1] },
  table: { c: [965, 692], rx: 372, ry: 74 },                   // сукно (эллипс): предметы на столе — внутри
  // ближе к камере, чем сидящие: столешница с кромкой и тумбой + два передних кресла
  front: [
    [[592, 690], [640, 655], [760, 636], [965, 628], [1170, 636], [1290, 655], [1338, 690], [1330, 735], [1290, 762], [1110, 790], [1100, 990], [830, 990], [820, 790], [640, 762], [600, 735]],
    [[362, 640], [400, 606], [470, 598], [560, 606], [598, 646], [612, 700], [640, 768], [760, 784], [778, 850], [760, 884], [640, 945], [600, 1080], [440, 1080], [420, 900], [380, 760]],
    [[1558, 640], [1520, 606], [1450, 598], [1360, 606], [1322, 646], [1308, 700], [1280, 768], [1162, 784], [1146, 850], [1164, 884], [1290, 945], [1330, 1080], [1490, 1080], [1505, 900], [1545, 760]],
  ],
  lampSign: [1548, 152],
  views: { wide: { cx: 960, cy: 540, k: 1.0 }, mid: { cx: 965, cy: 560, k: 1.45 }, a1: { cx: 690, cy: 520, k: 2.2 }, a2: { cx: 1240, cy: 520, k: 2.2 }, table: { cx: 965, cy: 690, k: 2.4 } },
};
const I = { plate: img(roomPlate) };
export const A = lazy([I.plate], () => { const fg = masked(I.plate, polyMask(CFG.front)); return { plate: I.plate, b3: blurred(I.plate, 3), fg, fgB3: blurred(fg, 3, false) }; });
export const CAST = { A1: aide(), A2: aide2() };
for (const C of Object.values(CAST)) C.spec.rig = { ...C.spec.rig, plantLegs: .02, armLayer: 'front' };
export const views = CFG.views;
export const view = (name, cam, drift = .3) => { const b = CFG.views[name], k = b.k * (1 + ((cam?.z ?? 1) - 1) * .55), lim = 70 / k;
  return cover({ cx: b.cx + clamp((cam?.dx || 0) * W * drift, -lim, lim), cy: b.cy + clamp((cam?.dy || 0) * H * drift, -lim, lim), k }); };
// точка на сукне по углу (0 — к нам) и доле радиуса
export const onTable = (ang, r = .75) => [CFG.table.c[0] + Math.sin(ang) * CFG.table.rx * r, CFG.table.c[1] + Math.cos(ang) * CFG.table.ry * r];

// табличка под красной лампой: «CLASSIFIED — IN USE», горит
function lampSign(ctx, v, t) {
  const P = toS(v, CFG.lampSign), s = v.k; ctx.save(); ctx.translate(P[0], P[1]);
  ctx.fillStyle = '#1a0606'; ctx.strokeStyle = '#000'; ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.roundRect(-82 * s, -12 * s, 164 * s, 24 * s, 3 * s); ctx.fill(); ctx.stroke();
  ctx.shadowColor = 'rgba(255,60,50,.9)'; ctx.shadowBlur = 10 * s; ctx.font = `800 ${Math.round(15 * s)}px ${F.label}`; ctx.fillStyle = `rgba(255,${90 + 20 * Math.sin(t * 2)},80,1)`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('CLASSIFIED — IN USE', 0, 1 * s); ctx.restore();
}
// кадр комнаты: o = { blur, a1: {...person}, a2: {...}, onTable(ctx, v) — предметы на сукне (поверх стола, под руками), solo }
export function room(ctx, v, t, T, o = {}) {
  const a = A(); if (!a) return {};
  if (!o.solo) { plate(ctx, o.blur ? a.b3 : a.plate, v); lampSign(ctx, v, t); }
  const cast = [];
  for (const [k, sp, f] of [['A1', 'AIDE', 1], ['A2', 'AIDE 2', -1]]) { let m = o[k.toLowerCase()]; if (!m) continue; const S0 = CFG.seat[k];
    m = { L: { k: 1, to: [S0[0] - 52, 676] }, R: { k: 1, to: [S0[0] + 52, 676] }, ...m };   // кисти лежат на сукне (у ближней к ним кромки), если сцена не задала иное
    cast.push([k, person(ctx, v, t, T, { C: CAST[k], at: CFG.seat[k], fs: CFG.fs, pin: 'seat', stance: f > 0 ? 'sitR' : 'sitL', view: 'front', facing: f, sp, light: CFG.light[k], seed: f > 0 ? 3 : 6, ...m, only: 'base' }), m, f, sp]); }
  if (!o.solo) plate(ctx, o.blur ? a.fgB3 : a.fg, v);
  if (!o.solo && o.onTable) o.onTable(ctx, v);
  const out = {};
  for (const [k, , m, f, sp] of cast) out[k] = person(ctx, v, t, T, { C: CAST[k], at: CFG.seat[k], fs: CFG.fs, pin: 'seat', stance: f > 0 ? 'sitR' : 'sitL', view: 'front', facing: f, sp, light: CFG.light[k], seed: f > 0 ? 3 : 6, ...m, only: 'front' });
  return out;
}
