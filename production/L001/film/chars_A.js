// film/chars_A.js — герои гл. 4–6 (рабочий A) на каркасе presetsLong (руки с локтем, ноги с коленом, трубка-конечность,
// кисти-точки); движок не меняется — новые записи HATS (причёски, фуражки) и вызовы пресетов с правками одежды.
//   Megaspeed:  clerk (клерк регистратуры: каре с заколкой, очки, серый кардиган), staffer (сотрудник: лохматый, худи),
//               renter (покупатель в окне видеозвонка: зачёс назад, чёрная рубашка, золотая цепь), rep (представитель:
//               пробор, синий костюм, гарнитура), accountant (бухгалтер 1: козырёк-визор, жилет, нарукавники),
//               accountant2 (бухгалтер 2: пучок, очки на цепочке, кардиган), banker / banker2 (банкиры: тёмная тройка
//               в полоску / лысина с венчиком, усы, серый костюм), courier (курьер: кепка, коричневая форма),
//               receptionist (ресепшн: хвост, бирюзовая блузка)
//   Ивенты:     fan (фанат: кепка козырьком назад, футболка с чипом), fan2 (фанатка: длинные волосы, худи), photographer
//               (фотограф: шапка-бини, жилет с карманами), guest(i) (гости вечеринки и толпа: 4 варианта одежды)
//   Трубопровод: aivresRep (представитель Aivres: пробор, костюм, бейдж), customs (таможенник; в гл. 9 — пограничник
//               у рабочего B: фуражка с кокардой, форменная рубашка с погонами), driver (водитель грузовика: бейсболка,
//               светоотражающий жилет), smuggler (контрабандист: кепка-восьмиклинка, щетина, раздутый плащ),
//               raider(i) (таможенники рейда: жилеты CUSTOMS)
// Плюс общий помощник постановки person() — поза, руки к точкам плейта, рот на своих словах, предмет в кисти, контактная тень.
import { detective, alice, reporter, HATS, ell, act, blinkAt, shoulder, restHand, arcHand, unUpper, noirShade } from 'engine';
import { mouth } from './words.js';
import { toS, fig, contact } from './staging/common.js';

const TAU = Math.PI * 2, RX = 104;
const VIEWS = { threeQuarter: .3, side: .5, back: 0 };
const poly = (x, pts, fill, stroke, lw) => { x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) p.length === 4 ? x.quadraticCurveTo(p[0], p[1], p[2], p[3]) : x.lineTo(p[0], p[1]); x.closePath(); if (fill) { x.fillStyle = fill; x.fill(); } if (stroke) { x.lineWidth = lw; x.strokeStyle = stroke; x.lineJoin = 'round'; x.stroke(); } };
const path = (x, pts, w, col) => { x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) p.length === 4 ? x.quadraticCurveTo(p[0], p[1], p[2], p[3]) : x.lineTo(p[0], p[1]); x.lineWidth = w; x.lineCap = 'round'; x.lineJoin = 'round'; x.strokeStyle = col; x.stroke(); };
const lgrad = (x, x0, y0, x1, y1, stops) => { const g = x.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; };
const cloth = fn => (x, B, S, VW) => { x.save(); x.translate(B.cx, B.cy); x.scale(B.rx / RX, 1); fn(x, S, VW); x.restore(); };
const offOf = (VW, p) => (VW && VIEWS[VW.view] != null ? VW.facing * VIEWS[VW.view] * 126 : 0) + ((p && p.turn) || 0) * 126;
const isBack = VW => !!VW && VW.view === 'back';
const capPath = (x, cap) => { x.beginPath(); x.moveTo(cap[0][0], cap[0][1]); for (const q of cap.slice(1)) q.length === 4 ? x.quadraticCurveTo(...q) : x.lineTo(...q); x.closePath(); };
// цвет: смешать hex с чёрным (f<1) или белым (f>1)
export function tone(hex, f) { const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.round(f <= 1 ? v * f : v + (255 - v) * (f - 1))); return '#' + c.map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join(''); }
const radial = base => ({ at: [-44, -76], r0: 12, to: [-8, -10], r1: 205, stops: [[0, tone(base, 1.35)], [.45, base], [1, tone(base, .5)]] });

// ---------------- причёски и головные уборы ----------------
// короткая стрижка-шапочка (как L_inspector): кромка над лбом сдвигается за поворотом головы
function shortHair(x, S, VW, p, { light, mid, dark, fringe = false, messy = false }) {
  const ink = S.colors.ink, o = offOf(VW, p) * .5;
  if (isBack(VW)) { poly(x, [[-134, 10], [-152, -110, -80, -166], [0, -186, 80, -166], [152, -110, 134, 10], [0, 40, -134, 10]], lgrad(x, -130, -180, 130, 20, [[0, light], [.5, mid], [1, dark]]), ink, S.lw); return; }
  const cap = fringe
    ? [[-133, -30], [-142, -110, -80, -142], [0, -158, 80, -142], [142, -110, 133, -30], [120, -58], [o + 96, -60, o + 66, -78], [o + 44, -62, o + 16, -84], [o - 14, -62, o - 46, -82], [o - 80, -64, -110, -56]]
    : [[-133, -26], [-142, -108, -82, -142], [0, -156, 80, -140], [142, -106, 133, -30], [122, -64], [110, -86, o + 60, -96], [o + 30, -98, o - 14, -88], [o - 34, -104], [o - 66, -98, -100, -92], [-118, -84, -126, -58]];
  if (messy) { cap[1] = [-150, -120, -96, -158]; cap[2] = [-40, -196, 10, -172]; cap.splice(3, 0, [50, -204, 70, -164], [130, -170, 150, -110]); }
  poly(x, cap, lgrad(x, -130, -160, 120, -40, [[0, light], [.5, mid], [1, dark]]), ink, S.lw);
  x.save(); capPath(x, cap); x.clip();
  for (const [a, b] of [[o + 40, -100], [o - 20, -96], [o - 70, -96], [o + 90, -90]]) path(x, [[a, b], [a - 10, b - 30, a - 40, b - 52]], 3.5, 'rgba(0,0,0,.35)');
  if (!fringe) path(x, [[o - 34, -104], [o - 40, -130, o - 30, -150]], 4, 'rgba(0,0,0,.45)');
  x.restore();
  path(x, [[-80, -126], [-30, -148, 30, -146]], 6, 'rgba(255,255,255,.2)');
  for (const sd of [-1, 1]) poly(x, [[sd * 131, -30], [sd * 124, -46], [sd * 116, 8], [sd * 128, 12]], dark, null);
}
// длинные волосы (каре/до плеч): кольцо вокруг лица, как у L_alice — лицо открыто, чёлка над бровями
function longHair(x, S, VW, p, { light, mid, dark, len = 88 }) {
  const ink = S.colors.ink, o = offOf(VW, p) * .5, fill = lgrad(x, -150, -170, 150, len, [[0, light], [.5, mid], [1, dark]]);
  if (isBack(VW)) { poly(x, [[-150, len], [-166, -40, -136, -120], [-90, -170, 0, -168], [90, -170, 136, -120], [166, -40, 150, len], [0, len + 24, -150, len]], fill, ink, S.lw); return; }
  poly(x, [[-150, len], [-166, -40, -136, -120], [-90, -170, 0, -168], [90, -170, 136, -120], [166, -40, 150, len], [140, len + 10, 116, len + 2],
    [120, 20, 122, -40], [118, -78], [o + 60, -84], [o, -74], [o - 60, -84], [-118, -78], [-122, -40, -120, 20], [-140, len + 10, -150, len]], fill, ink, S.lw);
  path(x, [[-104, -136], [-40, -164, 30, -158]], 9, 'rgba(255,255,255,.22)');
  for (let k = -3; k <= 3; k++) path(x, [[o + k * 34, -80], [o + k * 30, -118]], 2.5, 'rgba(0,0,0,.45)');
}
const bun = (x, S, VW, p, c, at = [0, -168], r = 46) => { const o = offOf(VW, p) * .35; ell(x, at[0] + o, at[1], r, r * .85, lgrad(x, -r, at[1] - r, r, at[1] + r, [[0, c.light], [.5, c.mid], [1, c.dark]]), S.colors.ink, S.lw); path(x, [[at[0] + o - r * .5, at[1] - r * .3], [at[0] + o, at[1] - r * .7]], 5, 'rgba(255,255,255,.25)'); };
// очки: прямоугольные (rect) или круглые
function specs(x, S, VW, p, { round = false, frame = '#141014', chain = false } = {}) {
  if (isBack(VW)) return; const comp = VW ? (VW.view === 'side' ? .6 : .86) : 1, o = offOf(VW, p);
  const ecx = (S.face.eyes[0].x + S.face.eyes[1].x) / 2, Ep = S.face.eyes.map(e => [(e.x - ecx) * comp + ecx + o, e.y + 2]);
  for (const [ex, ey] of Ep) { x.beginPath(); if (round) x.ellipse(ex, ey, 31, 31, 0, 0, TAU); else x.roundRect(ex - 36, ey - 24, 72, 46, 9);
    x.fillStyle = 'rgba(190,215,235,.16)'; x.fill(); x.lineWidth = 6; x.strokeStyle = frame; x.stroke(); path(x, [[ex - 20, ey - 12], [ex - 6, ey - 20]], 3.5, 'rgba(255,255,255,.4)'); }
  path(x, [[Ep[0][0] + (round ? 31 : 36), Ep[0][1] - 4], [(Ep[0][0] + Ep[1][0]) / 2, Ep[0][1] - 14, Ep[1][0] - (round ? 31 : 36), Ep[1][1] - 4]], 4.5, frame);
  if (chain) path(x, [[Ep[0][0] - 36, Ep[0][1]], [-140, 60, -110, 140]], 2.5, '#D9B24A');
}
// фуражка с кокардой (таможенник) / кепка с козырьком (курьер, водитель): козырёк смотрит по направлению лица
function peakCap(x, S, VW, p, { crown, band, peak = '#101014', badge = null, flat = false }) {
  const ink = S.colors.ink, o = offOf(VW, p) * .45;
  if (flat) poly(x, [[-140, -70], [-150, -150, -40, -176], [70, -184, 150, -128], [146, -70], [0, -84, -140, -70]], lgrad(x, -140, -180, 140, -70, [[0, tone(crown, 1.3)], [.5, crown], [1, tone(crown, .55)]]), ink, S.lw);
  else poly(x, [[-130, -84], [-170, -150, -100, -196], [0, -214, 100, -196], [170, -150, 130, -84], [0, -96, -130, -84]], lgrad(x, -150, -210, 150, -80, [[0, tone(crown, 1.3)], [.5, crown], [1, tone(crown, .55)]]), ink, S.lw);
  if (band) { poly(x, [[-132, -86], [-134, -118], [0, -128, 134, -118], [132, -86], [0, -98, -132, -86]], band, ink, 3); }
  if (!isBack(VW)) { const f = VW ? VW.facing : 0; poly(x, [[-110 + o, -86], [-90 + o + f * 30, -46, 0 + o + f * 60, -40], [90 + o + f * 80, -46, 120 + o + f * 30, -86], [0 + o, -78, -110 + o, -86]], peak, ink, 4);
    path(x, [[-80 + o, -70], [0 + o + f * 40, -56]], 3, 'rgba(255,255,255,.25)');
    if (badge) { ell(x, o * 1.1, -136, 18, 20, badge, ink, 3); ell(x, o * 1.1 - 5, -142, 5, 5, 'rgba(255,255,255,.6)', null); } }
  path(x, [[-110, -170], [-60, -196]], 6, 'rgba(255,255,255,.2)');
}
HATS.L_A_clerk = (x, H, S, VW, p) => { const c = { light: '#5a4438', mid: '#33241c', dark: '#160f0b' }; longHair(x, S, VW, p, { ...c, len: 30 }); if (!isBack(VW)) { x.save(); x.translate(110, -110); x.rotate(-.5); x.fillStyle = '#C9A04A'; x.fillRect(-16, -5, 32, 10); x.restore(); } specs(x, S, VW, p, { frame: '#5a2a2a' }); };
HATS.L_A_staffer = (x, H, S, VW, p) => shortHair(x, S, VW, p, { light: '#3a3440', mid: '#1c1820', dark: '#0b090c', messy: true });
HATS.L_A_renter = (x, H, S, VW, p) => shortHair(x, S, VW, p, { light: '#4c4850', mid: '#1a181e', dark: '#060507' });
HATS.L_A_rep = (x, H, S, VW, p) => { shortHair(x, S, VW, p, { light: '#4a3a30', mid: '#261c16', dark: '#0e0a08' });
  if (!isBack(VW)) { const f = VW ? VW.facing : 1; path(x, [[f * 128, -60], [f * 150, 10, f * 70, 70]], 5, '#141014'); ell(x, f * 132, -20, 16, 26, '#2a2c34', '#141014', 3); ell(x, f * 64, 72, 9, 7, '#2a2c34', null); } };
HATS.L_A_acct = (x, H, S, VW, p) => { shortHair(x, S, VW, p, { light: '#6a6058', mid: '#3c342e', dark: '#1a1612' });
  if (!isBack(VW)) { const o = offOf(VW, p) * .45, f = VW ? VW.facing : 0; path(x, [[-136, -78], [0, -100, 136, -78]], 12, '#141014');
    poly(x, [[-104 + o, -88], [-80 + o + f * 30, -34, o + f * 60, -28], [80 + o + f * 80, -34, 110 + o + f * 30, -88], [o, -100, -104 + o, -88]], 'rgba(60,190,120,.72)', '#141014', 4); } };
HATS.L_A_acct2 = (x, H, S, VW, p) => { const c = { light: '#7a7068', mid: '#4c443e', dark: '#24201c' }; shortHair(x, S, VW, p, c); bun(x, S, VW, p, c, [0, -176], 50); specs(x, S, VW, p, { round: true, frame: '#2a2026', chain: true }); };
HATS.L_A_banker = (x, H, S, VW, p) => shortHair(x, S, VW, p, { light: '#7c8088', mid: '#4a4e56', dark: '#22252a' });
HATS.L_A_banker2 = (x, H, S, VW, p) => { if (isBack(VW)) { poly(x, [[-134, 10], [-150, -60], [-120, -60, -100, 0], [100, 0], [120, -60, 150, -60], [134, 10], [0, 40, -134, 10]], '#4a4048', S.colors.ink, S.lw); return; }
  for (const sd of [-1, 1]) poly(x, [[sd * 134, 14], [sd * 146, -50, sd * 126, -86], [sd * 100, -70], [sd * 112, -30, sd * 110, 14]], lgrad(x, -140, -80, 140, 20, [[0, '#6a6068'], [1, '#2a2228']]), S.colors.ink, S.lw);
  path(x, [[-60, -134], [-20, -146]], 8, 'rgba(255,255,255,.55)'); specs(x, S, VW, p, { round: true, frame: '#8a6a2a' }); };
HATS.L_A_courier = (x, H, S, VW, p) => peakCap(x, S, VW, p, { crown: '#7a5530', band: null, peak: '#4a3018', flat: true });
HATS.L_A_recep = (x, H, S, VW, p) => { const c = { light: '#3a2c30', mid: '#1c1418', dark: '#0a0608' }; shortHair(x, S, VW, p, c);
  const o = offOf(VW, p) * .3, f = VW && VW.facing ? -VW.facing : -1; poly(x, [[f * 110 + o, -110], [f * 190 + o, -60, f * 170 + o, 60], [f * 130 + o, 30], [f * 140 + o, -40, f * 90 + o, -90]], lgrad(x, -150, -120, 150, 60, [[0, c.light], [1, c.dark]]), S.colors.ink, S.lw); };
HATS.L_A_fan = (x, H, S, VW, p) => { shortHair(x, S, VW, p, { light: '#3a3038', mid: '#1c161a', dark: '#0a0708' });
  poly(x, [[-130, -96], [-150, -170, -60, -190], [60, -196, 130, -150], [136, -96], [0, -110, -130, -96]], lgrad(x, -140, -190, 140, -90, [[0, '#e85a4a'], [1, '#8a1e18']]), S.colors.ink, S.lw);
  const f = VW ? VW.facing : 1; poly(x, [[-f * 120, -100], [-f * 200, -96], [-f * 196, -112], [-f * 124, -122]], '#5a1410', S.colors.ink, 3.5); };
HATS.L_A_fan2 = (x, H, S, VW, p) => longHair(x, S, VW, p, { light: '#8a5a3a', mid: '#5a3420', dark: '#2a160c', len: 130 });
HATS.L_A_photo = (x, H, S, VW, p) => { shortHair(x, S, VW, p, { light: '#4a3a32', mid: '#2a201a', dark: '#100c0a' });
  poly(x, [[-134, -90], [-146, -170, -70, -204], [0, -214, 70, -204], [146, -170, 134, -90], [0, -104, -134, -90]], lgrad(x, -140, -210, 140, -90, [[0, '#5a6a4a'], [1, '#26301e']]), S.colors.ink, S.lw);
  path(x, [[-134, -100], [0, -116, 134, -100]], 14, '#3a4630'); path(x, [[-134, -100], [0, -116, 134, -100]], 3, 'rgba(255,255,255,.15)'); };
HATS.L_A_guest = (x, H, S, VW, p) => shortHair(x, S, VW, p, { light: '#4a4448', mid: '#24202a', dark: '#0a090c', fringe: true });
HATS.L_A_guestF = (x, H, S, VW, p) => longHair(x, S, VW, p, { light: '#3a2a2e', mid: '#1a1216', dark: '#080506', len: 70 });
HATS.L_A_aivres = (x, H, S, VW, p) => shortHair(x, S, VW, p, { light: '#5a5450', mid: '#2e2a28', dark: '#121010' });
HATS.L_A_customs = (x, H, S, VW, p) => { shortHair(x, S, VW, p, { light: '#3a3436', mid: '#1c1a1c', dark: '#0a090a' }); peakCap(x, S, VW, p, { crown: '#e9e4d6', band: '#1d2a4a', peak: '#101018', badge: '#D9B24A' }); };
HATS.L_A_driver = (x, H, S, VW, p) => { shortHair(x, S, VW, p, { light: '#4a3a30', mid: '#261c16', dark: '#0e0a08' }); peakCap(x, S, VW, p, { crown: '#2a5a8a', band: null, peak: '#1a3a5a', flat: true }); };
HATS.L_A_smuggler = (x, H, S, VW, p) => {
  if (!isBack(VW)) { x.save(); x.fillStyle = 'rgba(70,60,66,.34)'; for (let i = 0; i < 52; i++) { const a = .25 + (i * .618 % 1) * 2.64, r = 96 + (i * 7 % 22); ell(x, Math.cos(a) * r * .95 + offOf(VW, p) * .9, Math.sin(a) * r * .8 + 24, 2.5, 2.5, x.fillStyle, null); } x.restore(); }
  shortHair(x, S, VW, p, { light: '#4a3a30', mid: '#261c16', dark: '#0e0a08' });
  const o = offOf(VW, p) * .3; poly(x, [[-150, -84], [-160, -170, -40, -196], [80, -204, 160, -150], [-0 + o + 190, -96], [0, -112, -150, -84]], lgrad(x, -150, -200, 190, -90, [[0, '#8a7a5a'], [.5, '#5a4c34'], [1, '#2a2218']]), S.colors.ink, S.lw);
  path(x, [[-90, -170], [60, -186]], 3, 'rgba(0,0,0,.35)'); };

// ---------------- одежда ----------------
function shirtTie(x, ink, shirt, tie, knot = tone(tie, .7)) {
  poly(x, [[-34, -150], [34, -150], [0, -40]], shirt, null);
  if (!tie) return; poly(x, [[-9, -140], [9, -140], [11, -124], [-11, -124]], knot, ink, 2.5); poly(x, [[-11, -124], [11, -124], [8, -50], [0, -38], [-8, -50]], tie, ink, 2.5); path(x, [[-3, -118], [-2, -60]], 2.5, 'rgba(255,255,255,.2)');
}
const lapels = (x, ink, col, hi) => { poly(x, [[-34, -150], [-84, -136], [-60, -92], [-30, 0], [0, -40]], col, ink, 4); poly(x, [[34, -150], [84, -136], [60, -92], [30, 0], [0, -40]], col, ink, 4); path(x, [[-78, -130], [-50, -42]], 3, hi); };
export const OUTFIT = {
  suit: ({ lapel, shirt = '#F2EFE8', tie, stripe = null, badge = null }) => cloth((x, S, VW) => {
    const ink = S.colors.ink; if (isBack(VW)) { path(x, [[0, -150], [0, 160]], 3, 'rgba(0,0,0,.45)'); return; }
    if (stripe) for (let k = -96; k <= 96; k += 24) path(x, [[k, -120], [k, 160]], 1.6, stripe);
    shirtTie(x, ink, shirt, tie); lapels(x, ink, lapel, 'rgba(255,255,255,.22)');
    for (const py of [24, 74]) ell(x, 0, py, 6.5, 6.5, '#121218', ink, 2.5);
    path(x, [[0, -40], [0, 160]], 2.5, 'rgba(0,0,0,.4)'); path(x, [[-88, 44], [-46, 44]], 4, 'rgba(0,0,0,.45)'); path(x, [[46, 44], [88, 44]], 4, 'rgba(0,0,0,.45)');
    if (badge) { x.save(); x.translate(56, -66); x.rotate(badge.a || .05); x.beginPath(); x.roundRect(-30, -20, 60, 40, 4); x.fillStyle = '#F2EEE2'; x.fill(); x.lineWidth = 3; x.strokeStyle = ink; x.stroke(); x.fillStyle = badge.col || '#2a6a9a'; x.fillRect(-26, -16, 52, 11); x.fillStyle = 'rgba(20,16,24,.6)'; x.fillRect(-20, 2, 40, 5); x.fillRect(-20, 10, 28, 4); x.restore(); }
    path(x, [[-90, -60], [-100, 0, -90, 60]], 10, 'rgba(210,220,240,.12)');
  }),
  vest: ({ shirt, vest, tie, garters = null }) => cloth((x, S, VW) => {    // рубашка с жилетом (бухгалтер)
    const ink = S.colors.ink; if (isBack(VW)) return;
    poly(x, [[-110, -150], [110, -150], [110, 160], [-110, 160]], shirt, null);
    shirtTie(x, ink, shirt, tie);
    poly(x, [[-34, -150], [-110, -120], [-110, 150], [-6, 150], [0, -40]], vest, ink, 4); poly(x, [[34, -150], [110, -120], [110, 150], [6, 150], [0, -40]], vest, ink, 4);
    for (const py of [-10, 30, 70, 110]) ell(x, -10, py, 5.5, 5.5, '#D9B24A', ink, 2);
    path(x, [[-100, -100], [-90, 0, -96, 120]], 8, 'rgba(255,255,255,.12)');
  }),
  cardigan: ({ blouse, knit, beads = false }) => cloth((x, S, VW) => {
    const ink = S.colors.ink; if (isBack(VW)) return;
    poly(x, [[-40, -150], [40, -150], [26, 160], [-26, 160]], blouse, null); path(x, [[-40, -150], [0, -120, 40, -150]], 4, tone(blouse, .7));
    if (beads) for (let i = 0; i < 9; i++) ell(x, -40 + i * 10, -130 + Math.sin(i / 8 * Math.PI) * 26, 5, 5, '#EDE6D2', ink, 1.5);
    poly(x, [[-40, -150], [-96, -134], [-110, 160], [-22, 160]], knit, ink, 4); poly(x, [[40, -150], [96, -134], [110, 160], [22, 160]], knit, ink, 4);
    for (const py of [-60, -10, 40, 90]) ell(x, -30, py, 6, 6, tone(knit, .55), ink, 2);
    for (let k = -100; k <= 100; k += 12) path(x, [[k, 130], [k, 158]], 2, 'rgba(0,0,0,.18)');
  }),
  hoodie: ({ col, print = null }) => cloth((x, S, VW) => {
    const ink = S.colors.ink;
    if (isBack(VW)) { poly(x, [[-70, -150], [-80, -100, 0, -80], [80, -100, 70, -150]], tone(col, .75), ink, 4); return; }
    path(x, [[-60, -150], [0, -112, 60, -150]], 16, tone(col, .7)); path(x, [[-60, -150], [0, -112, 60, -150]], 4, ink);
    path(x, [[-14, -122], [-18, -50]], 4, '#EDE6D2'); path(x, [[14, -122], [18, -54]], 4, '#EDE6D2');
    poly(x, [[-70, 40], [70, 40], [84, 110], [-84, 110]], tone(col, .85), ink, 3.5);
    if (print) print(x, ink);
    poly(x, [[-110, 130], [110, 130], [110, 160], [-110, 160]], tone(col, .7), null);
    path(x, [[-90, -60], [-100, 0, -90, 60]], 10, 'rgba(255,255,255,.12)');
  }),
  uniform: ({ shirt, epaulet, tie = null, patch = null }) => cloth((x, S, VW) => {     // форменная рубашка: погоны, карманы, нашивка
    const ink = S.colors.ink; if (isBack(VW)) { for (const sd of [-1, 1]) poly(x, [[sd * 60, -146], [sd * 100, -134], [sd * 100, -118], [sd * 60, -128]], epaulet, ink, 2.5); return; }
    path(x, [[-40, -150], [0, -118, 40, -150]], 6, tone(shirt, .7));
    if (tie) shirtTie(x, ink, shirt, tie);
    for (const sd of [-1, 1]) { poly(x, [[sd * 52, -146], [sd * 100, -132], [sd * 100, -116], [sd * 52, -128]], epaulet, ink, 2.5); ell(x, sd * 92, -126, 4, 4, '#D9B24A', null);
      poly(x, [[sd * 30, -70], [sd * 86, -70], [sd * 86, -10], [sd * 30, -10]], null, tone(shirt, .6), 3); path(x, [[sd * 30, -58], [sd * 86, -58]], 3, tone(shirt, .6)); }
    if (patch) { x.save(); x.translate(-58, -40); ell(x, 0, 0, 20, 20, patch, ink, 2.5); ell(x, 0, 0, 9, 9, '#D9B24A', null); x.restore(); ell(x, 58, -96, 12, 15, '#D9B24A', ink, 2.5); }
    for (const py of [-90, -30, 30, 90]) ell(x, 0, py, 4.5, 4.5, tone(shirt, .6), null); path(x, [[0, -150], [0, 160]], 2.5, tone(shirt, .7));
    path(x, [[-92, -60], [-100, 0, -92, 60]], 9, 'rgba(255,255,255,.2)');
  }),
  hivis: ({ shirt, vest = '#E8C430', text = null }) => cloth((x, S, VW) => {             // светоотражающий жилет поверх футболки
    const ink = S.colors.ink;
    poly(x, [[-110, -150], [110, -150], [110, 160], [-110, 160]], shirt, null);
    if (!isBack(VW)) path(x, [[-36, -150], [0, -126, 36, -150]], 5, tone(shirt, .6));
    poly(x, [[-40, -150], [-104, -128], [-110, 160], [-14, 160], [-18, -60]], vest, ink, 4); poly(x, [[40, -150], [104, -128], [110, 160], [14, 160], [18, -60]], vest, ink, 4);
    if (isBack(VW)) poly(x, [[-104, -128], [104, -128], [110, 160], [-110, 160]], vest, ink, 4);
    for (const y of [40, 90]) { path(x, [[-108, y], [-16, y]], 12, '#D9DDE4'); path(x, [[16, y], [108, y]], 12, '#D9DDE4'); }
    if (text) { x.save(); x.fillStyle = '#141014'; x.font = "900 26px 'Courier New', monospace"; x.textAlign = 'center'; x.fillText(text, isBack(VW) ? 0 : -60, -20); x.restore(); }
    path(x, [[-96, -110], [-104, 0, -96, 120]], 8, 'rgba(255,255,255,.25)');
  }),
  photog: ({ shirt, vest }) => cloth((x, S, VW) => {                                     // жилет фотографа с карманами
    const ink = S.colors.ink; poly(x, [[-110, -150], [110, -150], [110, 160], [-110, 160]], shirt, null); if (isBack(VW)) return;
    poly(x, [[-40, -150], [-104, -128], [-110, 160], [-12, 160], [-16, -60]], vest, ink, 4); poly(x, [[40, -150], [104, -128], [110, 160], [12, 160], [16, -60]], vest, ink, 4);
    for (const [cx, cy] of [[-62, -40], [62, -40], [-62, 60], [62, 60]]) { poly(x, [[cx - 30, cy - 26], [cx + 30, cy - 26], [cx + 30, cy + 26], [cx - 30, cy + 26]], tone(vest, .85), ink, 3); path(x, [[cx - 30, cy - 14], [cx + 30, cy - 14]], 3, ink); }
    path(x, [[-56, -150], [40, 60]], 7, '#141014');                                       // ремень камеры
  }),
  tee: ({ col, print = null }) => cloth((x, S, VW) => { const ink = S.colors.ink; if (isBack(VW)) return; path(x, [[-40, -150], [0, -124, 40, -150]], 6, tone(col, .6)); if (print) print(x, ink); path(x, [[-90, -60], [-100, 0, -90, 60]], 10, 'rgba(255,255,255,.14)'); }),
  coat: ({ col }) => cloth((x, S, VW) => {                                              // раздутый плащ: пояс, двубортные пуговицы, оттопыренные карманы
    const ink = S.colors.ink; if (isBack(VW)) return;
    poly(x, [[-34, -150], [34, -150], [0, -60]], '#D8D2C4', null);
    poly(x, [[-34, -150], [-96, -130], [-70, -90], [-40, -20], [0, -60]], tone(col, .85), ink, 4); poly(x, [[34, -150], [96, -130], [70, -90], [40, -20], [0, -60]], tone(col, .8), ink, 4);
    for (const [px, py] of [[-28, 0], [28, 0], [-30, 50], [30, 50]]) ell(x, px, py, 7, 7, tone(col, .45), ink, 2.5);
    poly(x, [[-112, 74], [112, 74], [112, 100], [-112, 100]], tone(col, .7), ink, 3); x.beginPath(); x.roundRect(-16, 70, 32, 34, 5); x.lineWidth = 5; x.strokeStyle = '#8a7a5a'; x.stroke();
    for (const sd of [-1, 1]) { x.beginPath(); x.ellipse(sd * 70, 128, 34, 22, 0, 0, TAU); x.fillStyle = tone(col, .9); x.fill(); x.lineWidth = 3.5; x.strokeStyle = ink; x.stroke(); }
    path(x, [[-90, -60], [-100, 0, -90, 60]], 10, 'rgba(255,255,255,.14)');
  }),
  blouse: ({ col, collar = '#FFF7F2' }) => cloth((x, S, VW) => { const ink = S.colors.ink; if (isBack(VW)) return;
    poly(x, [[-36, -150], [-12, -150], [-6, -112], [-26, -120]], collar, ink, 3); poly(x, [[36, -150], [12, -150], [6, -112], [26, -120]], collar, ink, 3);
    for (const py of [-80, -30, 20, 70]) ell(x, 0, py, 5, 5, collar, ink, 1.5); path(x, [[0, -150], [0, 160]], 2.5, tone(col, .6)); path(x, [[-86, -70], [-96, -10, -84, 50]], 9, 'rgba(255,255,255,.2)'); }),
};
const chipPrint = (x, ink) => { x.save(); x.translate(0, -30); x.beginPath(); x.roundRect(-34, -34, 68, 68, 8); x.fillStyle = '#1e7a46'; x.fill(); x.lineWidth = 4; x.strokeStyle = ink; x.stroke(); x.fillStyle = '#9dffb5'; x.fillRect(-16, -16, 32, 32); for (let i = -2; i <= 2; i++) for (const sd of [-1, 1]) { path(x, [[i * 12, sd * 34], [i * 12, sd * 46]], 4, '#cfd6c8'); path(x, [[sd * 34, i * 12], [sd * 46, i * 12]], 4, '#cfd6c8'); } x.restore(); };

// ---------------- герои ----------------
const finish = c => { c.spec.rig = { ...c.spec.rig, plantLegs: .02, armLayer: 'front' }; return c; };
const man = (name, hat, base, inside, o = {}) => finish(detective({ name, hat: { type: hat }, colors: { hair: o.hair || '#2A2024', stache: o.hair || '#2A2024' }, shoe: o.shoe || '#141012',
  face: { restEye: o.eye || 'dot', restMouth: o.rest || 'flatS', browCol: o.hair || '#2A2024', moustache: !!o.stache, stacheK: o.stache || 0, eyes: o.eyes || [{ x: -46, y: -14, rx: 8.5, ry: 11.5, lw: 6.5, tilt: 0 }, { x: 46, y: -14, rx: 8.5, ry: 11.5, lw: 6.5, tilt: 0 }] },
  body: { fillRadial: radial(base), inside: [inside], ...(o.rx ? { rx: o.rx } : {}) }, ...(o.rx ? { rx: o.rx } : {}) }));
const woman = (name, hat, base, inside, o = {}) => finish(alice({ name, hat: { type: hat }, colors: { hair: o.hair || '#141015', mouth: o.lip || '#A3172A', mouthIn: '#6B1222' }, shoe: o.shoe || '#2a1418',
  face: { restMouth: o.rest || 'smile', browCol: o.hair || '#141015' }, body: { topK: .8, fillRadial: radial(base), inside: [inside] } }));

export const clerk = () => woman('clerk', 'L_A_clerk', '#6a6a72', OUTFIT.cardigan({ blouse: '#E9E2D2', knit: '#5a5a62', beads: true }), { hair: '#33241c', rest: 'flatS', shoe: '#2a2026' });
export const staffer = () => man('staffer', 'L_A_staffer', '#3d6a5a', OUTFIT.hoodie({ col: '#3d6a5a' }), { hair: '#1c1820', rest: 'smile', shoe: '#e8e4dc' });
export const renter = () => man('renter', 'L_A_renter', '#26222a', cloth((x, S, VW) => { const ink = S.colors.ink; if (isBack(VW)) return; poly(x, [[-34, -150], [34, -150], [0, -70]], '#2e2a34', ink, 3); path(x, [[-30, -146], [0, -90, 30, -146]], 4, '#D9B24A'); for (const py of [-50, 0, 50]) ell(x, 0, py, 5, 5, '#3a3640', ink, 2); path(x, [[-90, -60], [-100, 0, -90, 60]], 10, 'rgba(255,255,255,.12)'); }), { hair: '#1a181e', rest: 'smirkS' });
export const rep = () => man('rep', 'L_A_rep', '#2c3c62', OUTFIT.suit({ lapel: '#22304e', tie: '#3f6ea8' }), { hair: '#261c16', rest: 'smile' });
export const accountant = () => man('accountant', 'L_A_acct', '#d8d2c2', OUTFIT.vest({ shirt: '#ECE6D8', vest: '#5a4a3a', tie: '#7a1b28' }), { hair: '#3c342e', rest: 'flat', stache: .6 });
export const accountant2 = () => woman('accountant2', 'L_A_acct2', '#7a5a6a', OUTFIT.cardigan({ blouse: '#F2EEE2', knit: '#7a5a6a' }), { hair: '#4c443e', rest: 'flatS' });
export const banker = () => man('banker', 'L_A_banker', '#2a2c34', OUTFIT.suit({ lapel: '#1e2028', tie: '#8a1e28', stripe: 'rgba(220,220,235,.18)' }), { hair: '#4a4e56', rest: 'smirkS', eye: 'lid' });
export const banker2 = () => man('banker2', 'L_A_banker2', '#5a5e66', OUTFIT.suit({ lapel: '#44484f', tie: '#2a5a3a' }), { hair: '#2a2228', rest: 'flat', stache: .9 });
export const courier = () => man('courier', 'L_A_courier', '#7a5530', OUTFIT.uniform({ shirt: '#8a6a40', epaulet: '#4a3018' }), { hair: '#261c16', rest: 'smile', shoe: '#2a1c10' });
export const receptionist = () => woman('receptionist', 'L_A_recep', '#2a8a8c', OUTFIT.blouse({ col: '#2a8a8c' }), { hair: '#1c1418', rest: 'flatS' });
export const fan = () => man('fan', 'L_A_fan', '#2a2a30', OUTFIT.tee({ col: '#2a2a30', print: chipPrint }), { hair: '#1c161a', rest: 'smile', shoe: '#e8e4dc' });
export const fan2 = () => woman('fan2', 'L_A_fan2', '#7a3a8a', OUTFIT.hoodie({ col: '#7a3a8a' }), { hair: '#5a3420', rest: 'smile', shoe: '#e8e4dc' });
export const photographer = () => man('photographer', 'L_A_photo', '#3a3a34', OUTFIT.photog({ shirt: '#2a2a2e', vest: '#5a6a4a' }), { hair: '#2a201a', rest: 'smile' });
const GUESTS = [['#4a2a5a', 'L_A_guest', 'suit'], ['#8a6a3a', 'L_A_guestF', 'blouse'], ['#2a4a6a', 'L_A_guest', 'tee'], ['#6a2a2a', 'L_A_guestF', 'blouse']];
export const guest = i => { const [c, h, k] = GUESTS[i % GUESTS.length]; const inside = k === 'suit' ? OUTFIT.suit({ lapel: tone(c, .8), tie: '#141014' }) : k === 'tee' ? OUTFIT.tee({ col: c }) : OUTFIT.blouse({ col: c });
  return h === 'L_A_guestF' ? woman('guest' + i, h, c, inside, { rest: 'smile' }) : man('guest' + i, h, c, inside, { rest: 'smile' }); };
export const aivresRep = () => man('aivres', 'L_A_aivres', '#3a3e46', OUTFIT.suit({ lapel: '#2c3038', tie: '#5a6a7a' }), { hair: '#2e2a28', rest: 'smile' });
export const customs = () => man('customs', 'L_A_customs', '#e2dccc', OUTFIT.uniform({ shirt: '#e8e2d2', epaulet: '#1d2a4a', tie: '#1d2a4a', patch: '#1d2a4a' }), { hair: '#1c1a1c', rest: 'flat', eye: 'lid', stache: .5 });
export const driver = () => man('driver', 'L_A_driver', '#3a4a5a', OUTFIT.hivis({ shirt: '#3a4a5a' }), { hair: '#261c16', rest: 'smile', shoe: '#2a1c10' });
export const smuggler = () => man('smuggler', 'L_A_smuggler', '#6a5a40', OUTFIT.coat({ col: '#6a5a40' }), { hair: '#261c16', rest: 'flatS', rx: 122 });
export const raider = i => man('raider' + i, 'L_A_customs', '#2a3a5a', OUTFIT.hivis({ shirt: '#2a3a5a', vest: i % 2 ? '#E8C430' : '#D8B428', text: 'CUSTOMS' }), { hair: '#1c1a1c', rest: 'flat' });

// ---------------- постановка героя (общий помощник глав 4–6) ----------------
// точка «до корпуса» -> фигура после наклона корпуса (как restaurant.js unLoc)
export function unLoc(S, p, q) {
  let [x, y] = q; const u = S.u ?? 1, sq = p.sq || 0, bob = p.bob || 0, lean = p.lean || 0, hy = S.rig.hipY, hipDy = bob + sq * 60 * u;
  y -= hy; x *= 1 + sq * .6; y *= 1 - sq; const c = Math.cos(lean), s = Math.sin(lean); [x, y] = [x * c - y * s, x * s + y * c];
  return [x + (p.dx || 0), y + hy + hipDy + (p.dy || 0)];
}
// точка плейта -> координаты фигуры до корпуса (с учётом наклона)
const plate2fig = (S, p, at, fs, P, pin) => { const q = S.pins[pin]; return unUpper(S, p, [(P[0] - at[0]) / fs + q[0], (P[1] - at[1]) / fs + q[1]]); };
const fig2plate = (S, at, fs, q, pin) => { const P = S.pins[pin]; return [at[0] + (q[0] - P[0]) * fs, at[1] + (q[1] - P[1]) * fs]; };
// поза героя. o = { at: [x,y] плейта (ступни или сиденье), fs, pin: 'feet'|'seat', f: ±1 (куда смотрит), view: 'threeQuarter'|'side'|'back'|null (анфас),
//   keys, look, lean, tilt, sp (имя говорящего — рот только на его словах), seed, stance, mouthRest,
//   R / L: { to: [x,y] плейта, k 0..1 } — правая (+x фигуры) / левая рука к точке; Rf / Lf: { to: [x,y] фигуры, k } — то же в координатах фигуры }
export function pose(C, t, T, o) {
  const S = C.spec, p = act(t, o.keys || [[0, 'neutral']]);
  Object.assign(p, { blink: blinkAt(t + (o.seed || 0) * 1.3, 3 + (o.seed || 0) % 4), view: o.view === undefined ? 'threeQuarter' : o.view, facing: o.f || 1, stance: o.stance || 'stand', look: o.look || [.5 * (o.f || 1), .05] });
  if (!o.view && o.view !== undefined) delete p.view;
  p.bob = (p.bob || 0) * .35; p.sq = (p.sq || 0) * .35; p.lean = (p.lean || 0) * .4 + (o.lean || 0); p.tilt = (p.tilt || 0) * .6 + (o.tilt || 0);
  if (p.mouth === 'teeth' || p.mouth === 'teethOpen') p.mouth = 'open';
  if (o.mouthRest) p.mouth = o.mouthRest;
  p.mouth = mouth(o.sp || null, T, p.mouth, o.seed || 0);
  if (o.hatDy != null) p.hatDy = o.hatDy;
  const arm = (sd, A, Af) => {
    const sh = shoulder(S, sd), rest = restHand(S, sd);
    if (Af && Af.k > .001) return arcHand(sh, rest, Af.to, Math.min(1, Af.k));
    if (A && A.k > .001) return arcHand(sh, rest, plate2fig(S, p, o.at, o.fs, A.to, o.pin || 'feet'), Math.min(1, A.k));
    return [rest[0] + sd * 6, rest[1]];
  };
  const hL = arm(-1, o.L, o.Lf), hR = arm(1, o.R, o.Rf);
  p.arms = [{ to: hL, w: 11, ...(o.Lvia ? { via: o.Lvia } : {}) }, { to: hR, w: 11, ...(o.Rvia ? { via: o.Rvia } : {}) }];
  return { C, p, at: o.at, fs: o.fs, pin: o.pin || 'feet', hands: { L: hL, R: hR }, shade: o.shade };
}
// нарисовать героя (only: 'base' — без передних рук, 'front' — только руки спереди); light — направление noirShade
export function drawP(ctx, P, v, only) { if (P.shade) P.C.spec.shade = P.shade; return fig(ctx, P.C, P.p, v, P.at, P.fs, P.pin, only ? { only } : undefined); }
// кисть героя на экране (side 'L'|'R'), s — пикселей экрана на единицу фигуры
export function handS(P, v, side) { return toS(v, fig2plate(P.C.spec, P.at, P.fs, unLoc(P.C.spec, P.p, P.hands[side]), P.pin)); }
export function figS(P, v, q) { return toS(v, fig2plate(P.C.spec, P.at, P.fs, unLoc(P.C.spec, P.p, q), P.pin)); }
// стоящий герой целиком: контактная тень (от света dx) + фигура; held: { R: (ctx, h, s) => ..., L: ... } — предмет в кисти поверх
export function person(ctx, C, v, t, T, o) {
  const P = pose(C, t, T, o), s = o.fs * v.k;
  if (!o.solo && (o.pin || 'feet') === 'feet' && o.shadow !== false) { const F = toS(v, o.at); contact(ctx, F[0], F[1] + 2 * s, 150 * s, 24 * s, .55, o.shDx || 0); }
  if (o.under) for (const sd of ['L', 'R']) if (o.under[sd]) o.under[sd](ctx, handS(P, v, sd), s);
  drawP(ctx, P, v);
  if (o.held) for (const sd of ['L', 'R']) if (o.held[sd]) { const h = handS(P, v, sd); o.held[sd](ctx, h, s); ell(ctx, h[0], h[1], 12 * s, 12 * s, C.spec.colors.ink, null); }
  return P;
}
// свет стиля для героев локации: dir — на источник
export const shadeOf = (dir, warm = '#ffc47a') => noirShade(dir, { warm });

// ---------------- гл. 2–3 (по просьбе ведущего): учёные в халатах, продавец, инвестор, ассистент ----------------
// лабораторный халат поверх рубашки: белые полы, карман с ручками, бейдж лаборатории (цвет без логотипа)
OUTFIT.labcoat = ({ shirt = '#6a8ab0', tie = null, badge = '#2a8a8c' }) => cloth((x, S, VW) => {
  const ink = S.colors.ink; if (isBack(VW)) { path(x, [[0, -150], [0, 160]], 3, 'rgba(0,0,0,.25)'); return; }
  poly(x, [[-34, -150], [34, -150], [0, -60]], shirt, null); if (tie) shirtTie(x, ink, shirt, tie);
  poly(x, [[-34, -150], [-96, -132], [-110, 160], [-8, 160], [-6, -50]], '#F6F4EE', ink, 4); poly(x, [[34, -150], [96, -132], [110, 160], [8, 160], [6, -50]], '#ECE9E0', ink, 4);
  poly(x, [[-34, -150], [-64, -150], [-46, -92], [-14, -70]], '#FFFFFF', ink, 3); poly(x, [[34, -150], [64, -150], [46, -92], [14, -70]], '#F2EFE8', ink, 3);
  poly(x, [[-88, -40], [-44, -40], [-44, 6], [-88, 6]], null, 'rgba(0,0,0,.3)', 3); path(x, [[-80, -48], [-80, -30]], 4, '#2a4a8a'); path(x, [[-70, -50], [-70, -30]], 4, '#c8302a');
  x.save(); x.translate(64, -40); x.beginPath(); x.roundRect(-22, -14, 44, 56, 5); x.fillStyle = '#F2EEE2'; x.fill(); x.lineWidth = 3; x.strokeStyle = ink; x.stroke(); x.fillStyle = badge; x.fillRect(-18, -10, 36, 14); ell(x, 0, 18, 8, 8, '#9aa2ae', ink, 2); x.restore();
  for (const py of [20, 80]) ell(x, -8, py, 5, 5, '#d8d4c8', ink, 2);
  path(x, [[-96, -40], [-104, 20, -96, 100]], 9, 'rgba(255,255,255,.35)');
});
HATS.L_A_sci = (x, H, S, VW, p) => { shortHair(x, S, VW, p, { light: '#6a5a4a', mid: '#3e3226', dark: '#1a140e' }); specs(x, S, VW, p, { round: true, frame: '#2a2026' }); };
HATS.L_A_sci2 = (x, H, S, VW, p) => { const c = { light: '#2a2228', mid: '#141016', dark: '#060406' }; shortHair(x, S, VW, p, c); bun(x, S, VW, p, c, [0, -170], 44); };
HATS.L_A_sales = (x, H, S, VW, p) => shortHair(x, S, VW, p, { light: '#7a6a5a', mid: '#4a3a2a', dark: '#1e160e' });
HATS.L_A_investor = (x, H, S, VW, p) => { if (isBack(VW)) { poly(x, [[-134, 10], [-150, -60], [-120, -60, -100, 0], [100, 0], [120, -60, 150, -60], [134, 10], [0, 40, -134, 10]], '#c8c8cc', S.colors.ink, S.lw); return; }
  for (const sd of [-1, 1]) poly(x, [[sd * 134, 14], [sd * 146, -50, sd * 126, -86], [sd * 100, -70], [sd * 112, -30, sd * 110, 14]], lgrad(x, -140, -80, 140, 20, [[0, '#e8e8ec'], [1, '#9a9aa2']]), S.colors.ink, S.lw);
  path(x, [[-60, -134], [-20, -146]], 8, 'rgba(255,255,255,.55)'); };
const SCI = [['#6a8ab0', '#2a8a8c', 'L_A_sci', 0], ['#8a6a8a', '#c8302a', 'L_A_sci2', 1], ['#5a7a5a', '#d9b24a', 'L_A_sci', 0], ['#8a7a5a', '#2a5aa8', 'L_A_sci2', 1]];
export const scientist = i => { const [sh, bd, h, f] = SCI[i % SCI.length], inside = OUTFIT.labcoat({ shirt: sh, badge: bd, tie: i % 3 ? null : '#2a3a5a' });
  return f ? woman('scientist' + i, h, '#F2F0EA', inside, { rest: 'flatS' }) : man('scientist' + i, h, '#F2F0EA', inside, { rest: 'flatS', hair: '#3e3226' }); };
export const salesman = () => man('salesman', 'L_A_sales', '#3a4a3a', OUTFIT.suit({ lapel: '#2c3a2c', tie: '#76b900' }), { hair: '#4a3a2a', rest: 'smirkS', eye: 'lid' });
export const investor = () => man('investor', 'L_A_investor', '#4a3e34', OUTFIT.suit({ lapel: '#3a3028', tie: '#8a6a2a', stripe: 'rgba(230,220,200,.15)' }), { hair: '#9a9aa2', rest: 'flat', stache: .8, eye: 'lid' });
export const assistant = () => woman('assistant', 'L_A_recep', '#3a4a6a', OUTFIT.blouse({ col: '#3a4a6a' }), { hair: '#1c1418', rest: 'flatS' });
