// film/chars_B.js — новые герои гл. 7–10 (рабочий B). Каркас presetsLong (руки с локтем, ноги с коленом, кисти-точки), движок не меняется:
// здесь только новые записи в HATS и вызовы пресетов с правками. Все — plantLegs .02 (ступни стоят), свет — noirShade(dir) в постановке.
//   editor      — редактор (L13): седой венчик вокруг лысины, очки для чтения, белая рубашка, красные подтяжки, ослабленный галстук
//   homeowner   — хозяин дома (L14): взъерошенные русые волосы, щетина, серо-синий кардиган поверх белой футболки, клетчатые тапки; кружка — props_B
//   guest       — его гость (силуэт в окне, он же на фото): гладко зачёсанные чёрные волосы, тёмный костюм без галстука
//   spokesman   — пресс-секретарь Nvidia: тёмная аккуратная стрижка, графитовый костюм, зелёный галстук, бейдж на шнурке
//   analyst1    — аналитик 1 (L19): тёмные кудри, голубая рубашка, ослабленный синий галстук
//   analyst2    — аналитик 2 (L19): тёмный хвост, чёрный пиджак, белый топ, гарнитура
//   boardMember — член совета Nvidia: серебристое каре, синий пиджак, жемчуг
//   aide1/aide2 — помощники в закрытой комнате (L18, AIDE / AIDE 2): мужчина — тёмно-синий костюм, красный галстук, пробор;
//                 женщина — серый костюм, светлый пучок. (Если ведущий заведёт общих помощников в chars.js — заменить.)
import { detective, HATS, ell } from 'engine';

const TAU = Math.PI * 2, RX = 104;
const VIEWS = { threeQuarter: .3, side: .5, back: 0 };
const poly = (x, pts, fill, stroke, lw) => { x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) p.length === 4 ? x.quadraticCurveTo(p[0], p[1], p[2], p[3]) : x.lineTo(p[0], p[1]); x.closePath(); if (fill) { x.fillStyle = fill; x.fill(); } if (stroke) { x.lineWidth = lw; x.strokeStyle = stroke; x.lineJoin = 'round'; x.stroke(); } };
const path = (x, pts, w, col) => { x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) p.length === 4 ? x.quadraticCurveTo(p[0], p[1], p[2], p[3]) : x.lineTo(p[0], p[1]); x.lineWidth = w; x.lineCap = 'round'; x.lineJoin = 'round'; x.strokeStyle = col; x.stroke(); };
const lgrad = (x, x0, y0, x1, y1, stops) => { const g = x.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; };
const cloth = fn => (x, B, S, VW) => { x.save(); x.translate(B.cx, B.cy); x.scale(B.rx / RX, 1); fn(x, S, VW); x.restore(); };
const offOf = (VW, p) => (VW && VIEWS[VW.view] != null ? VW.facing * VIEWS[VW.view] * 126 : 0) + ((p && p.turn) || 0) * 126;
const isBack = VW => !!VW && VW.view === 'back';
const capPath = (x, cap) => { x.beginPath(); x.moveTo(cap[0][0], cap[0][1]); for (const q of cap.slice(1)) q.length === 4 ? x.quadraticCurveTo(...q) : x.lineTo(...q); x.closePath(); };

// ---------- причёски ----------
// style: 'part' — короткая с пробором; 'messy' — взъерошенная; 'curly' — кудри; 'bun' — гладкая с пучком на затылке; 'pony' — хвост;
//        'bob' — каре до скул; 'fringeBald' — венчик вокруг лысины
function hair(x, S, VW, p, st) {
  const ink = S.colors.ink, o = offOf(VW, p) * .5, f = VW ? VW.facing : 0, g = (a, b) => lgrad(x, -130, -170, 120, -20, [[0, st.light], [.5, st.mid], [1, st.dark]]);
  if (st.style === 'fringeBald') {                                            // венчик: только над ушами и на затылке
    for (const sd of [-1, 1]) poly(x, [[sd * 136, -10], [sd * 146, -70, sd * 118, -104], [sd * 96, -84], [sd * 112, -50, sd * 116, 10]], g(), ink, S.lw * .8);
    if (isBack(VW)) poly(x, [[-136, -10], [-120, -70, 0, -76], [120, -70, 136, -10], [0, 20, -136, -10]], g(), ink, S.lw * .8);
    path(x, [[-60, -112], [-20, -122, 30, -118]], 7, 'rgba(255,255,255,.35)');   // блик лысины
    return;
  }
  if (st.style === 'bun' || st.style === 'pony') {                            // пучок/хвост за головой (со стороны затылка)
    const bx = isBack(VW) ? 0 : -f * 120 - (f ? 0 : 0), by = st.style === 'bun' ? -150 : -110;
    if (st.style === 'bun') { x.beginPath(); x.ellipse(isBack(VW) ? 0 : -f * 110, isBack(VW) ? -150 : -160, 58, 50, 0, 0, TAU); x.fillStyle = g(); x.fill(); x.lineWidth = S.lw; x.strokeStyle = ink; x.stroke(); }
    else poly(x, [[bx, by], [bx - f * 60 - 20, by + 60, bx - f * 40, by + 190], [bx - f * 10 + 20, by + 120, bx + 20, by + 10]], g(), ink, S.lw);
  }
  if (isBack(VW)) { poly(x, [[-136, 10], [-154, -112, -80, -168], [0, -188, 80, -168], [154, -112, 136, 10], [0, 40, -136, 10]], g(), ink, S.lw); return; }
  let cap;
  if (st.style === 'messy' || st.style === 'curly') {
    const j = st.style === 'curly' ? 16 : 22;
    cap = [[-136, -20], [-160, -100, -112, -150], [-90, -184, -40, -170], [0, -200, 40, -172], [96, -186, 112, -146], [160, -104, 136, -20],
      [124, -60], [o + 96, -70 + j, o + 70, -86], [o + 44, -66 + j * .4, o + 20, -92], [o - 10, -70, o - 40, -90], [o - 70, -68, o - 96, -86], [-124, -58]];
  } else if (st.style === 'bob') {
    cap = [[-150, 60], [-176, -96, -96, -158], [0, -184, 96, -158], [176, -96, 150, 60], [118, 66], [128, -20, 110, -64], [o + 60, -80, o + 10, -96], [o - 40, -82, o - 100, -66], [-128, -20, -118, 66]];
  } else {                                                                       // part / bun / pony — гладко, пробор
    cap = [[-134, -24], [-146, -112, -80, -152], [0, -168, 84, -150], [146, -112, 134, -24], [124, -60], [112, -88, o + 34, -98], [o - 16, -114], [o - 58, -100, -110, -88], [-126, -58]];
  }
  capPath(x, cap); x.fillStyle = g(); x.fill(); x.lineWidth = S.lw; x.strokeStyle = ink; x.lineJoin = 'round'; x.stroke();
  x.save(); capPath(x, cap); x.clip();
  if (st.style === 'curly') for (let i = 0; i < 9; i++) { const a = -150 + i * 34, b = -150 + ((i * 37) % 3) * 16; x.beginPath(); x.arc(a, b, 16, 0, TAU); x.lineWidth = 3.5; x.strokeStyle = 'rgba(0,0,0,.35)'; x.stroke(); }
  else for (const [a, b] of [[o + 50, -96], [o - 70, -98], [o + 100, -86]]) path(x, [[a, b], [a + (a > o ? 14 : -14), b - 30, a + (a > o ? 40 : -40), b - 46]], 3, 'rgba(0,0,0,.35)');
  x.restore();
  path(x, [[-84, -128], [-34, -152, 30, -150]], 7, `rgba(255,255,255,${st.gloss ?? .3})`);
}
// очки: прямоугольные для чтения (полуоправа) — у редактора
function readers(x, S, VW, p) {
  if (isBack(VW)) return; const ink = S.colors.ink, comp = VW ? (VW.view === 'side' ? .6 : .86) : 1, o = offOf(VW, p);
  const ecx = (S.face.eyes[0].x + S.face.eyes[1].x) / 2, E = S.face.eyes.map(e => [(e.x - ecx) * comp + ecx + o, e.y + 8]);
  for (const [ex, ey] of E) { x.beginPath(); x.roundRect(ex - 34, ey - 16, 68, 34, [4, 4, 14, 14]); x.fillStyle = 'rgba(190,215,235,.16)'; x.fill(); x.lineWidth = 5; x.strokeStyle = ink; x.stroke(); path(x, [[ex - 18, ey - 6], [ex - 8, ey - 12]], 3, 'rgba(255,255,255,.35)'); }
  path(x, [[E[0][0] + 34, E[0][1] - 6], [(E[0][0] + E[1][0]) / 2, E[0][1] - 14, E[1][0] - 34, E[1][1] - 6]], 4.5, ink);
}
// гарнитура (аналитик 2): дуга над головой и микрофон к щеке
function headset(x, S, VW, p) {
  const ink = S.colors.ink, f = VW ? VW.facing : 1, o = offOf(VW, p) * .3;
  path(x, [[-140 + o, 0], [o, -230, 140 + o, 0]], 12, ink);
  if (isBack(VW)) return;
  const cx = -f * 132 + o * .6; x.beginPath(); x.ellipse(cx, 6, 26, 40, 0, 0, TAU); x.fillStyle = '#26262e'; x.fill(); x.lineWidth = 5; x.strokeStyle = ink; x.stroke();
  path(x, [[cx, 30], [cx + f * 40, 90, cx + f * 120, 92]], 6, ink); ell(x, cx + f * 124, 92, 12, 10, '#3a3a44', ink, 3);
}
const H = (st, extra) => (x, Hd, S, VW, p) => { hair(x, S, VW, p, st); if (extra) extra(x, S, VW, p); };
HATS.LB_editor = H({ style: 'fringeBald', light: '#e8e6e2', mid: '#b8b5b0', dark: '#7c7a78' }, readers);
HATS.LB_home = H({ style: 'messy', light: '#8a6a48', mid: '#5c4128', dark: '#2e2014', gloss: .2 });
HATS.LB_guest = H({ style: 'part', light: '#3c3a44', mid: '#16141a', dark: '#060508', gloss: .45 });
HATS.LB_spokes = H({ style: 'part', light: '#4a4038', mid: '#2a221c', dark: '#100c0a' });
HATS.LB_an1 = H({ style: 'curly', light: '#4a3a30', mid: '#241a14', dark: '#0e0a08', gloss: .15 });
HATS.LB_an2 = H({ style: 'pony', light: '#3a3036', mid: '#1a1418', dark: '#08060a' }, headset);
HATS.LB_board = H({ style: 'bob', light: '#f2f2f4', mid: '#c4c6cc', dark: '#8a8c94', gloss: .5 });
HATS.LB_aide1 = H({ style: 'part', light: '#7a5a3a', mid: '#4a3220', dark: '#20140c' });
HATS.LB_aide2 = H({ style: 'bun', light: '#f1d9a0', mid: '#cfae6c', dark: '#8c6d36', gloss: .45 });

// ---------- одежда ----------
// костюм: пиджак, рубашка, галстук (tie: null — без галстука, ворот расстёгнут)
const suit = ({ lapel, lapelHi = 'rgba(220,220,235,.25)', tie, tieKnot, shirt = '#F2EFE8', badge, pearls }) => cloth((x, S, VW) => {
  const ink = S.colors.ink;
  if (isBack(VW)) { path(x, [[0, -150], [0, 160]], 3, 'rgba(0,0,0,.45)'); return; }
  poly(x, [[-34, -150], [34, -150], [0, -40]], shirt, null);
  if (tie) { poly(x, [[-9, -140], [9, -140], [11, -124], [-11, -124]], tieKnot || tie, ink, 2.5); poly(x, [[-11, -124], [11, -124], [8, -50], [0, -38], [-8, -50]], tie, ink, 2.5); path(x, [[-3, -118], [-2, -60]], 2.5, 'rgba(255,255,255,.18)'); }
  else path(x, [[-20, -148], [0, -120], [20, -148]], 3, 'rgba(0,0,0,.35)');
  if (pearls) for (let i = -4; i <= 4; i++) ell(x, i * 8, -128 + Math.abs(i) * -2.2 + 8, 5, 5, '#f4efe4', 'rgba(0,0,0,.3)', 1.5);
  poly(x, [[-34, -150], [-84, -136], [-60, -92], [-30, 0], [0, -40]], lapel, ink, 4);
  poly(x, [[34, -150], [84, -136], [60, -92], [30, 0], [0, -40]], lapel, ink, 4);
  path(x, [[-78, -130], [-50, -42]], 3, lapelHi);
  for (const py of [24, 74]) ell(x, 0, py, 6.5, 6.5, '#121218', ink, 2.5);
  path(x, [[0, -40], [0, 160]], 2.5, 'rgba(0,0,0,.4)');
  if (badge) { path(x, [[-30, -150], [-20, -30]], 4, badge); path(x, [[30, -150], [20, -30]], 4, badge); x.save(); x.translate(0, -12); x.beginPath(); x.roundRect(-24, -4, 48, 62, 5); x.fillStyle = '#f2f2ee'; x.fill(); x.lineWidth = 3; x.strokeStyle = ink; x.stroke(); x.fillStyle = badge; x.fillRect(-24, -4, 48, 14); x.restore(); }
  path(x, [[-90, -60], [-100, 0, -90, 60]], 10, 'rgba(210,220,240,.12)');
});
// рубашка с подтяжками (редактор)
const shirtBraces = cloth((x, S, VW) => {
  const ink = S.colors.ink;
  for (const sd of [-1, 1]) path(x, [[sd * 52, -150], [sd * 46, 160]], 13, '#9e2630');
  if (isBack(VW)) { path(x, [[-52, -150], [0, -40], [52, -150]], 13, '#9e2630'); return; }
  poly(x, [[-30, -152], [-6, -152], [0, -126], [-24, -132]], '#ffffff', ink, 3); poly(x, [[30, -152], [6, -152], [0, -126], [24, -132]], '#ffffff', ink, 3);
  poly(x, [[-10, -126], [10, -126], [12, -112], [-12, -112]], '#5a1820', ink, 2.5); poly(x, [[-12, -112], [12, -112], [16, -40], [4, -30], [-6, -42]], '#6e1e28', ink, 2.5);   // ослабленный, сбит набок
  for (const py of [-80, -20, 40, 100]) ell(x, -2, py, 4.5, 4.5, '#e8e4dc', 'rgba(0,0,0,.35)', 1.5);
  path(x, [[-80, -60], [-90, 0, -80, 60]], 9, 'rgba(255,255,255,.4)');
});
// кардиган поверх футболки (хозяин дома)
const cardigan = cloth((x, S, VW) => {
  const ink = S.colors.ink;
  if (isBack(VW)) { path(x, [[0, -150], [0, 160]], 3, 'rgba(0,0,0,.35)'); return; }
  poly(x, [[-44, -150], [44, -150], [36, 160], [-36, 160]], '#ECE8DE', null);
  path(x, [[-34, -146], [0, -122, 34, -146]], 5, '#cfc8b8');
  poly(x, [[-44, -150], [-110, -120], [-110, 160], [-36, 160]], null, ink, 4); poly(x, [[44, -150], [110, -120], [110, 160], [36, 160]], null, ink, 4);
  for (const py of [-40, 20, 80]) ell(x, 40, py, 6, 6, '#2e3a48', ink, 2);
  for (let k = -100; k <= -50; k += 10) path(x, [[k, -100], [k, 150]], 1.6, 'rgba(255,255,255,.07)');
  poly(x, [[-104, 60], [-56, 60], [-56, 110], [-104, 110]], null, 'rgba(0,0,0,.35)', 3);
});
// рубашка с ослабленным галстуком (аналитик 1)
const shirtTie = (tie) => cloth((x, S, VW) => {
  const ink = S.colors.ink;
  if (isBack(VW)) { path(x, [[0, -150], [0, 160]], 3, 'rgba(0,0,0,.3)'); return; }
  poly(x, [[-30, -152], [-6, -152], [0, -126], [-24, -132]], '#dbe8f6', ink, 3); poly(x, [[30, -152], [6, -152], [0, -126], [24, -132]], '#dbe8f6', ink, 3);
  poly(x, [[-10, -120], [10, -120], [12, -106], [-12, -106]], tie, ink, 2.5); poly(x, [[-12, -106], [12, -106], [10, -30], [0, -18], [-10, -30]], tie, ink, 2.5);
  for (const py of [-60, 0, 60, 120]) ell(x, 0, py, 4.5, 4.5, '#f4f4f4', 'rgba(0,0,0,.35)', 1.5);
  path(x, [[-80, -60], [-90, 0, -80, 60]], 9, 'rgba(255,255,255,.35)');
});
const rad = (c0, c1, c2) => ({ at: [-44, -76], r0: 12, to: [-8, -10], r1: 205, stops: [[0, c0], [.45, c1], [1, c2]] });
function make(name, hat, o) {
  const c = detective({ name, hat: { type: hat }, colors: { hair: o.hair || '#2A2024', stache: o.stache || o.hair || '#2A2024' }, shoe: o.shoe || '#121010',
    face: { restEye: o.eye || 'dot', restMouth: o.mouth || 'flat', browCol: o.brow || o.hair || '#2A2024', moustache: !!o.moustache, stacheK: o.stacheK || .8 },
    body: { fillRadial: rad(...o.body), inside: [o.inside] } });
  c.spec.rig = { ...c.spec.rig, plantLegs: .02, armLayer: 'front' };
  return c;
}
export const editor = () => make('editor', 'LB_editor', { hair: '#8c8a86', stache: '#9a9894', moustache: true, stacheK: .9, eye: 'lid', mouth: 'flat', body: ['#ffffff', '#e8e4dc', '#a8a296'], inside: shirtBraces, shoe: '#2a1c14' });
export const homeowner = () => make('homeowner', 'LB_home', { hair: '#5c4128', eye: 'dot', mouth: 'smile', body: ['#7d8fa8', '#56667e', '#2c3648'], inside: cardigan, shoe: '#8c3a3a' });
export const guest = () => make('guest', 'LB_guest', { hair: '#16141a', eye: 'lid', mouth: 'smirk', body: ['#55555e', '#2e2e36', '#121218'], inside: suit({ lapel: '#2c2c34', tie: null }) });
export const spokesman = () => make('spokesman', 'LB_spokes', { hair: '#2a221c', eye: 'dot', mouth: 'flat', body: ['#5c5c64', '#34343c', '#18181e'], inside: suit({ lapel: '#2e2e36', tie: '#5fa82c', tieKnot: '#4a8a20', badge: '#76b900' }) });
export const analyst1 = () => make('analyst1', 'LB_an1', { hair: '#241a14', eye: 'dot', mouth: 'flat', body: ['#cfe0f2', '#9fb8d6', '#5e7896'], inside: shirtTie('#2a3f6e'), shoe: '#2a1c14' });
export const analyst2 = () => make('analyst2', 'LB_an2', { hair: '#1a1418', eye: 'lid', mouth: 'flat', body: ['#4a4a52', '#26262c', '#0e0e12'], inside: suit({ lapel: '#202026', tie: null, shirt: '#f4f2ee' }) });
export const boardMember = () => make('boardMember', 'LB_board', { hair: '#c4c6cc', eye: 'lid', mouth: 'flat', body: ['#4d5f8c', '#2a3658', '#141a2e'], inside: suit({ lapel: '#25304e', tie: null, shirt: '#eef0f4', pearls: true }) });
export const aide1 = () => make('aide1', 'LB_aide1', { hair: '#4a3220', eye: 'dot', mouth: 'flat', body: ['#4d5f8c', '#2a3658', '#141a2e'], inside: suit({ lapel: '#25304e', tie: '#b3222c', tieKnot: '#8a1820' }) });
export const aide2 = () => make('aide2', 'LB_aide2', { hair: '#cfae6c', brow: '#8c6d36', eye: 'lid', mouth: 'flat', body: ['#8a8c94', '#5e6068', '#2e3036'], inside: suit({ lapel: '#4e5058', tie: null, shirt: '#f4f2ee' }) });

// ---------- постановка героя в координатах плейта (общий помощник глав 7–10) ----------
// o = { C, at:[x,y] плейта (ступни или сиденье), fs, pin: 'feet'|'seat', stance: 'stand'|'sitR'|'sitL', view, facing, sp, keys, look, lean, tilt, seed,
//       light:[dx,dy] (noirShade), L/R: { k 0..1, to:[x,y] плейта } — кисть уходит от покоя к точке по дуге, handset: 'L'|'R' (+ handsetK) — трубка у уха,
//       heldL/heldR: (ctx, P экран, s) — предмет в кисти (рисуется ПЕРЕД кистью-точкой: кисть перекрывает его край), shadow: true — контактная тень,
//       mouth: принудительный рот, blinkOff, only: 'base'|'front' }
import { act, blinkAt, shoulder, restHand, arcHand, noirShade, clamp } from 'engine';
import { toS, fig, loc, toPlate, contact } from './staging/common.js';
import { mouth as mouthOf } from './words.js';
import { handsetAt } from './staging/desk.js';
export function bodyPt(S, p, q) { let [x, y] = q; const hy = S.rig.hipY, lean = p.lean || 0, hipDy = (p.bob || 0) + (p.sq || 0) * 60 * (S.u ?? 1); y -= hy; x *= 1 + (p.sq || 0) * .6; y *= 1 - (p.sq || 0); const c = Math.cos(lean), s = Math.sin(lean); return [x * c - y * s + (p.dx || 0), x * s + y * c + hy + hipDy + (p.dy || 0)]; }
const shadeCache = new Map();
export function person(ctx, v, t, T, o) {
  const C = o.C, S = C.spec, pin = o.pin || 'feet', seed = o.seed ?? 3;
  const key = (o.light || [-1, -.5]).join(','); if (!shadeCache.has(key)) shadeCache.set(key, noirShade(o.light || [-1, -.5], { warm: o.warm || '#ffc47a' })); S.shade = shadeCache.get(key);
  const p = act(t, o.keys || [[0, 'neutral']]);
  if (p.mouth === 'teeth' || p.mouth === 'teethOpen') p.mouth = 'open';
  Object.assign(p, { blink: o.blinkOff ? 0 : blinkAt(t + seed * .7, seed), view: o.view || 'threeQuarter', facing: o.facing ?? 1, stance: o.stance || (pin === 'seat' ? 'sitR' : 'stand'), look: o.look || p.look || [0, 0] });
  p.bob = (p.bob || 0) * .3; p.sq = (p.sq || 0) * .3; p.lean = (p.lean || 0) * .35 + (o.lean || 0); p.tilt = (p.tilt || 0) * .5 + (o.tilt || 0);
  if (o.turn) p.turn = o.turn;
  p.mouth = o.mouth || (o.laugh ? p.mouth : mouthOf(o.sp, T, o.rest || (p.mouth === 'O' ? 'O' : p.mouth), seed));
  if (o.eyes) p.eyes = o.eyes; if (o.brows) p.brows = o.brows;
  const hand = (side, m) => {
    const rest = restHand(S, side), sh = shoulder(S, side);
    if (o.handset === (side < 0 ? 'L' : 'R')) { const k = clamp(o.handsetK ?? 1); return arcHand(sh, rest, [side * S.head.rx * .95 + side * 18, S.head.y + 70], k); }
    if (!m || !(m.k > .001)) return m && m.rest ? m.rest : rest;
    const to = m.fig || loc(S, p, o.at, o.fs, m.to, pin);
    return arcHand(sh, m.rest || rest, to, m.k);
  };
  const hl = hand(-1, o.L), hr = hand(1, o.R);
  p.arms = [{ to: hl, w: 11 }, { to: hr, w: 11 }];
  if (o.shadow && o.only !== 'front') { const F = toS(v, pin === 'feet' ? o.at : [o.at[0] + (p.facing || 1) * 140 * o.fs, o.at[1] + 300 * o.fs]), s = o.fs * v.k; contact(ctx, F[0], F[1] + 3 * s, (o.shadowW || 150) * s, 22 * s, .55, -(o.light || [-1])[0] * .3); }
  if (o.only !== 'front') fig(ctx, C, p, v, o.at, o.fs, pin, { only: 'base' });
  const sP = q => toS(v, toPlate(S, o.at, o.fs, bodyPt(S, p, q), pin));
  const out = { p, hl: sP(hl), hr: sP(hr), s: o.fs * v.k, head: sP([S.head.x || 0, S.head.y]) };
  if (o.only === 'base') return out;
  if (o.under) o.under(ctx, out);
  fig(ctx, C, p, v, o.at, o.fs, pin, { only: 'front' });
  if (o.handset) { const side = o.handset === 'L' ? -1 : 1, P0 = toS(v, toPlate(S, o.at, o.fs, [0, 0], pin)), P1 = toS(v, toPlate(S, o.at, o.fs, [1, 0], pin)), sc = P1[0] - P0[0];
    if ((o.handsetK ?? 1) > .55) { ctx.save(); ctx.translate(P0[0], P0[1]); ctx.scale(sc, sc); const q = S.pins[pin]; ctx.translate(-q[0], -q[1]); ctx.translate(0, S.rig.hipY); ctx.rotate(p.lean || 0); ctx.translate(0, -S.rig.hipY); handsetAt(ctx, S, side, S.colors.ink); ctx.restore();
      const hp = side < 0 ? out.hl : out.hr; ctx.fillStyle = S.colors.ink; ctx.beginPath(); ctx.arc(hp[0], hp[1], 12 * out.s, 0, Math.PI * 2); ctx.fill(); } }
  if (o.heldL) { o.heldL(ctx, out.hl, out.s); ctx.fillStyle = S.colors.ink; ctx.beginPath(); ctx.arc(out.hl[0], out.hl[1], 12 * out.s, 0, Math.PI * 2); ctx.fill(); }
  if (o.heldR) { o.heldR(ctx, out.hr, out.s); ctx.fillStyle = S.colors.ink; ctx.beginPath(); ctx.arc(out.hr[0], out.hr[1], 12 * out.s, 0, Math.PI * 2); ctx.fill(); }
  return out;
}
