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
  if (isBack(VW)) { poly(x, [[-134, 70], [-160, -112, -80, -168], [0, -190, 80, -168], [160, -112, 134, 70], [0, 118, -134, 70]], g(), ink, S.lw); return; }   // затылок: волосы до шеи (иначе белая полоса читалась улыбкой)
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
  if (o.pose) Object.assign(p, o.pose);   // поправки позы (dy — сдвиг фигуры: садится и т.п.)
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
// агенты у двери (гл. 9): те же люди, что в машине (agent1/agent2 из chars.js — стрижки инспектора и гида), но без наушников
import '../scenes/dc_inspection/chars.js';
export const fieldAgent1 = () => make('fieldAgent1', 'L_inspector', { hair: '#2A2024', eye: 'lid', mouth: 'flat', body: ['#6a6870', '#3c3a42', '#1c1b20'], inside: suit({ lapel: '#35333b', tie: '#121116', tieKnot: '#0c0b0e' }) });
export const fieldAgent2 = () => make('fieldAgent2', 'L_guide', { hair: '#141015', eye: 'dot', mouth: 'flat', body: ['#4d5f8c', '#2a3658', '#141a2e'], inside: suit({ lapel: '#25304e', tie: '#5d8fc9', tieKnot: '#3f6ea8' }) });

// ======================= гл. 2 (рабочий B): Denny's, кухня, родственники =======================
// очки в прямоугольной оправе (Дженсен 1993/1997, Крис, Кёртис)
function rectGlasses(x, S, VW, p) {
  if (isBack(VW)) return; const ink = S.colors.ink, comp = VW ? (VW.view === 'side' ? .6 : .86) : 1, o = offOf(VW, p);
  const ecx = (S.face.eyes[0].x + S.face.eyes[1].x) / 2, E2 = S.face.eyes.map(e => [(e.x - ecx) * comp + ecx + o, e.y + 2]);
  for (const [ex, ey] of E2) { x.beginPath(); x.roundRect(ex - 36, ey - 22, 72, 44, 9); x.fillStyle = 'rgba(175,205,225,.18)'; x.fill(); x.lineWidth = 6; x.strokeStyle = ink; x.stroke(); path(x, [[ex - 20, ey - 8], [ex - 8, ey - 16]], 3.5, 'rgba(255,255,255,.35)'); }
  path(x, [[E2[0][0] + 36, E2[0][1] - 6], [(E2[0][0] + E2[1][0]) / 2, E2[0][1] - 16, E2[1][0] - 36, E2[1][1] - 6]], 5, ink);
}
// борода (Крис): короткая, по линии челюсти — от висков к подбородку, внутри контура головы; рот открыт (внутренний край ниже рта),
// над ртом — узкие усы. Прежняя (тёмный серп на пол-лица, закрывал рот) — замечание Рауана 2026-11-19.
function beard(x, S, VW, p) { if (isBack(VW)) return; const o = offOf(VW, p), h = S.head, rx = h.rx, ry = h.ry, ix = o * .25, y0 = 26, ic = [ix, 0, rx - 22, ry - 34];
  x.save(); x.beginPath(); x.ellipse(0, 0, rx - 3, ry - 3, 0, 0, Math.PI * 2); x.clip();
  // полоса вдоль челюсти: низ головы (ниже y0) минус внутренний эллипс — бакенбарды ~27 ед. (сверху сходят на нет), подбородок ~34; почти симметрично и в 3/4; рот внутри чистой зоны
  const g = x.createLinearGradient(0, y0, 0, y0 + 18); g.addColorStop(0, 'rgba(94,65,40,0)'); g.addColorStop(1, 'rgba(94,65,40,1)');
  x.beginPath(); x.rect(-rx - 6, y0, rx * 2 + 12, ry + 12); x.ellipse(ic[0], ic[1], ic[2], ic[3], 0, 0, Math.PI * 2); x.fillStyle = g; x.fill('evenodd');
  x.beginPath(); x.ellipse(ic[0], ic[1], ic[2], ic[3], 0, Math.PI * .18, Math.PI * .82); x.lineWidth = 3; x.strokeStyle = 'rgba(40,24,14,.45)'; x.stroke();   // мягкий внутренний край у подбородка
  for (let i = 0; i < 9; i++) { const a = Math.PI * (.2 + i * .075), px = ic[0] + Math.cos(a) * (rx - 10), py = Math.sin(a) * (ry - 14); x.fillStyle = 'rgba(30,18,10,.35)'; x.beginPath(); x.arc(px, py, 3, 0, Math.PI * 2); x.fill(); }   // ворс
  x.restore();
  x.beginPath(); x.moveTo(-34 + o, 40); x.quadraticCurveTo(-14 + o, 28, o, 34); x.quadraticCurveTo(14 + o, 28, 34 + o, 40); x.quadraticCurveTo(o, 44, -34 + o, 40); x.closePath();   // усы над ртом
  x.fillStyle = '#5e4128'; x.fill(); x.lineWidth = 2.5; x.strokeStyle = 'rgba(40,24,14,.6)'; x.stroke(); }
const both = (...fns) => (x, S, VW, p) => fns.forEach(f => f(x, S, VW, p));
HATS.LB_j93 = H({ style: 'part', light: '#3c3a44', mid: '#16141a', dark: '#060508', gloss: .4 }, rectGlasses);
HATS.LB_teen = H({ style: 'messy', light: '#3a3640', mid: '#1a181e', dark: '#0a090c', gloss: .25 });
HATS.LB_chris = H({ style: 'part', light: '#7a5434', mid: '#4a3220', dark: '#20140c' }, both(beard, rectGlasses));
HATS.LB_curtis = H({ style: 'messy', light: '#a08a64', mid: '#6e5a3c', dark: '#3a2c18' }, rectGlasses);
HATS.LB_waitress = H({ style: 'bun', light: '#c8642a', mid: '#9a4a1c', dark: '#5a2a0c', gloss: .35 });
HATS.LB_aunt = H({ style: 'bob', light: '#7a5434', mid: '#4a3220', dark: '#20140c', gloss: .3 });
HATS.LB_uncle = H({ style: 'fringeBald', light: '#8a7a6a', mid: '#5a4a3a', dark: '#2a2018' });
HATS.LB_kid = H({ style: 'part', light: '#3a3640', mid: '#1a181e', dark: '#0a090c', gloss: .3 });
// одежда
const polo = (col, collar) => cloth((x, S, VW) => { const ink = S.colors.ink; if (isBack(VW)) { path(x, [[0, -150], [0, 160]], 3, 'rgba(0,0,0,.3)'); return; }
  poly(x, [[-34, -152], [-4, -152], [0, -120], [-26, -128]], collar, ink, 3); poly(x, [[34, -152], [4, -152], [0, -120], [26, -128]], collar, ink, 3);
  path(x, [[0, -122], [0, -70]], 3, 'rgba(0,0,0,.4)'); for (const py of [-108, -84]) ell(x, 0, py, 4, 4, '#f4f4f4', ink, 1.5); path(x, [[-80, -60], [-90, 0, -80, 60]], 9, 'rgba(255,255,255,.25)'); });
const apron = (shirt, stripe) => cloth((x, S, VW) => { const ink = S.colors.ink; if (stripe) for (let y = -150; y < 160; y += 40) { x.fillStyle = stripe; x.fillRect(-120, y, 240, 12); }
  if (isBack(VW)) { path(x, [[-60, -40], [60, -40]], 6, '#f4f2ee'); return; }
  poly(x, [[-62, -120], [62, -120], [72, 160], [-72, 160]], '#f6f3ec', ink, 3.5); path(x, [[-62, -120], [-30, -150]], 5, '#f6f3ec'); path(x, [[62, -120], [30, -150]], 5, '#f6f3ec');
  poly(x, [[-40, 20], [40, 20], [40, 70], [-40, 70]], null, 'rgba(0,0,0,.3)', 3); });
const dress = (col, apronOn) => cloth((x, S, VW) => { const ink = S.colors.ink; if (isBack(VW)) return; poly(x, [[-30, -152], [30, -152], [0, -110]], '#f4f2ee', ink, 3);
  if (apronOn) { poly(x, [[-70, -20], [70, -20], [80, 160], [-80, 160]], '#f6f3ec', ink, 3.5); path(x, [[-70, -20], [70, -20]], 6, '#f6f3ec'); }
  for (let i = 0; i < 6; i++) ell(x, -70 + (i * 37) % 140, -100 + i * 40, 7, 7, 'rgba(255,255,255,.35)', null); });
const plaid = (a, b) => cloth((x, S, VW) => { for (let k = -120; k < 120; k += 36) { x.fillStyle = a; x.fillRect(k, -160, 12, 320); x.fillRect(-120, k, 240, 12); } if (isBack(VW)) return;
  poly(x, [[-30, -152], [-4, -152], [0, -124], [-24, -130]], b, S.colors.ink, 3); poly(x, [[30, -152], [4, -152], [0, -124], [24, -130]], b, S.colors.ink, 3); });
const knit = (col) => cloth((x, S, VW) => { for (let k = -100; k <= 100; k += 14) path(x, [[k, -150], [k, 150]], 1.6, 'rgba(0,0,0,.12)'); if (isBack(VW)) return; path(x, [[-40, -150], [0, -112], [40, -150]], 8, col); });
export const jensen93 = () => make('jensen93', 'LB_j93', { hair: '#16141a', eye: 'dot', mouth: 'smile', body: ['#5f8a74', '#3a6050', '#1c3428'], inside: polo('#4a7a62', '#6a9a82') });
export const jensen97 = () => make('jensen97', 'LB_j93', { hair: '#16141a', eye: 'dot', mouth: 'flat', body: ['#4a4a5a', '#2c2c38', '#14141c'], inside: knit('#5a5a6a') });
export const teenJensen = () => make('teenJensen', 'LB_teen', { hair: '#1a181e', eye: 'dot', mouth: 'flat', body: ['#f4f0e6', '#d8d0c0', '#a89c88'], inside: apron('#e8e2d4', 'rgba(46,92,160,.55)'), shoe: '#2a1c14' });
export const chris = () => make('chris', 'LB_chris', { hair: '#4a3220', eye: 'dot', mouth: 'flat', body: ['#9a6a4a', '#6a4a30', '#3a2818'], inside: plaid('rgba(40,24,14,.35)', '#c8a070') });
export const curtis = () => make('curtis', 'LB_curtis', { hair: '#6e5a3c', eye: 'dot', mouth: 'smile', body: ['#6a7a9a', '#4a5a7a', '#24304a'], inside: knit('#8a9aba') });
export const waitress = () => make('waitress', 'LB_waitress', { hair: '#9a4a1c', brow: '#5a2a0c', eye: 'lid', mouth: 'smile', body: ['#f0b040', '#d08a20', '#8a5a10'], inside: dress('#d08a20', true), shoe: '#2a1c14' });
export const aunt = () => make('aunt', 'LB_aunt', { hair: '#4a3220', eye: 'dot', mouth: 'smile', body: ['#e8a0a8', '#c87080', '#8a4050'], inside: dress('#c87080', false), shoe: '#5a3418' });
export const uncle = () => make('uncle', 'LB_uncle', { hair: '#5a4a3a', stache: '#4a3a2a', moustache: true, eye: 'dot', mouth: 'smile', body: ['#b08a5a', '#8a6a40', '#4a3820'], inside: knit('#6a5030'), shoe: '#3a2418' });
export const brother = () => make('brother', 'LB_kid', { hair: '#1a181e', eye: 'dot', mouth: 'smile', body: ['#c86a5a', '#a04a3a', '#5a2418'], inside: plaid('rgba(30,10,8,.4)', '#e8d0b0'), shoe: '#3a2418' });
