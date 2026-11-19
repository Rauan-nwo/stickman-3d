// film/chars.js — новые герои финала L001 (гл. 0–1). Пресеты собраны на каркасе presetsLong (руки с локтем, ноги с коленом,
// трубка-конечность, кисти-точки); движок не меняется — здесь только новые записи в HATS и вызовы пресетов с правками.
//   agent1     — AGENT (в машине, водитель): тёмно-угольный костюм, узкий чёрный галстук, короткая тёмная стрижка, щетина
//                (причёска инспектора из scenes/dc_inspection), наушники
//   agent2     — AGENT 2 (в машине, пассажир): тёмно-синий костюм, голубой галстук в полоску, чёрная чёлка, круглые очки, наушники
//   watcher    — агент в зале ресторана (D01-C): федора и тренч детектива; лицо всегда за раскрытым меню с объективом
//   waiter     — официант (гэг D01): белый пиджак, чёрная бабочка, прилизанные волосы на пробор, тонкие усы, поднос
//   youngJensen — Дженсен в 9 лет (гл. 1, Кентукки): чёрные волосы с чёлкой, без очков, полосатая футболка
// Перчатка (D02-A) и детская рука — не фигуры, а крупные «кисти-точки» в props.js (кисти в стиле — точки).
// Наушники: поле позы p.phones (0 — на ушах, 1 — опущены на шею).
import { detective, jensen, HATS, ell } from 'engine';
import '../scenes/dc_inspection/chars.js';            // регистрирует HATS.L_inspector / HATS.L_guide (стрижки агентов)

const TAU = Math.PI * 2, RX = 104;
const VIEWS = { threeQuarter: .3, side: .5, back: 0 };
const poly = (x, pts, fill, stroke, lw) => { x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) p.length === 4 ? x.quadraticCurveTo(p[0], p[1], p[2], p[3]) : x.lineTo(p[0], p[1]); x.closePath(); if (fill) { x.fillStyle = fill; x.fill(); } if (stroke) { x.lineWidth = lw; x.strokeStyle = stroke; x.lineJoin = 'round'; x.stroke(); } };
const path = (x, pts, w, col) => { x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) p.length === 4 ? x.quadraticCurveTo(p[0], p[1], p[2], p[3]) : x.lineTo(p[0], p[1]); x.lineWidth = w; x.lineCap = 'round'; x.lineJoin = 'round'; x.strokeStyle = col; x.stroke(); };
const lgrad = (x, x0, y0, x1, y1, stops) => { const g = x.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; };
const cloth = fn => (x, B, S, VW) => { x.save(); x.translate(B.cx, B.cy); x.scale(B.rx / RX, 1); fn(x, S, VW); x.restore(); };
const offOf = (VW, p) => (VW && VIEWS[VW.view] != null ? VW.facing * VIEWS[VW.view] * 126 : 0) + ((p && p.turn) || 0) * 126;
const isBack = VW => !!VW && VW.view === 'back';

// ---------- наушники (поверх причёски): p.phones 0 — на ушах, 1 — опущены на шею ----------
function headphones(x, S, VW, p) {
  const k = Math.max(0, Math.min(1, (p && p.phones) || 0)), ink = S.colors.ink, o = offOf(VW, p) * .3, f = VW ? VW.facing : 0;
  const cupY = 4 + 156 * k, cupX = 140 - 34 * k;
  const cup = (cx, w) => { x.beginPath(); x.ellipse(cx, cupY, w, 50, 0, 0, TAU); x.fillStyle = lgrad(x, cx - w, cupY - 50, cx + w, cupY + 50, [[0, '#3a3d47'], [.5, '#1c1d24'], [1, '#0c0c10']]); x.fill(); x.lineWidth = 6; x.strokeStyle = ink; x.stroke();
    x.beginPath(); x.ellipse(cx - w * .25, cupY - 20, w * .25, 9, -.4, 0, TAU); x.fillStyle = 'rgba(255,255,255,.22)'; x.fill(); };
  if (k < .5) {                                                          // дуга над макушкой
    const top = -196 + 40 * k * 2;
    path(x, [[-cupX + o, cupY - 30], [o * 1.4, top - 30, cupX + o, cupY - 30]], 17, ink); path(x, [[-cupX + o, cupY - 30], [o * 1.4, top - 30, cupX + o, cupY - 30]], 9, '#2c2f38');
    path(x, [[-cupX * .6 + o, -150], [o, top - 10]], 3, 'rgba(255,255,255,.2)');
  } else {                                                               // дуга за шеей
    path(x, [[-cupX, cupY + 10], [0, cupY + 70, cupX, cupY + 10]], 15, ink);
  }
  if (!VW || isBack(VW)) { cup(-cupX + o, 36); cup(cupX + o, 36); return; }
  cup(-f * cupX + o * .6, 36);                                           // дальнее от лица ухо — чашка целиком
  if (k > .5) cup(f * cupX * .82 + o, 30);
  else if (p && p.nearCup) cup(f * 128 + o * .4, 22);                    // прижатая ладонью чашка у лица — узкая, по краю головы           // опущенные — вторая чашка у шеи; прижатая ладонью — видна у лица
}

// ---------- причёски ----------
function capPath(x, cap) { x.beginPath(); x.moveTo(cap[0][0], cap[0][1]); for (const q of cap.slice(1)) q.length === 4 ? x.quadraticCurveTo(...q) : x.lineTo(...q); x.closePath(); }
// гладкая причёска на пробор (официант, юный Дженсен): кромка над лбом сдвигается за поворотом головы
function sleekHair(x, S, VW, p, { light, mid, dark, fringe = false, gloss = .35 }) {
  const ink = S.colors.ink, o = offOf(VW, p) * .5;
  if (isBack(VW)) { poly(x, [[-134, 10], [-152, -110, -80, -166], [0, -186, 80, -166], [152, -110, 134, 10], [0, 40, -134, 10]], lgrad(x, -130, -180, 130, 20, [[0, light], [.5, mid], [1, dark]]), ink, S.lw); return; }
  const cap = fringe
    ? [[-134, -24], [-146, -116, -80, -150], [0, -166, 84, -148], [146, -112, 134, -24], [124, -50], [o + 92, -46, o + 60, -66], [o + 30, -48, o, -70], [o - 30, -48, o - 62, -66], [o - 96, -48, -124, -50]]
    : [[-134, -26], [-144, -110, -82, -146], [0, -162, 84, -146], [144, -110, 134, -26], [124, -64], [110, -90, o + 30, -96], [o - 20, -112], [o - 60, -100, -110, -88], [-126, -60]];
  capPath(x, cap); x.fillStyle = lgrad(x, -130, -160, 120, -40, [[0, light], [.5, mid], [1, dark]]); x.fill(); x.lineWidth = S.lw; x.strokeStyle = ink; x.lineJoin = 'round'; x.stroke();
  x.save(); capPath(x, cap); x.clip();
  if (!fringe) path(x, [[o - 20, -112], [o - 30, -140, o - 22, -160]], 4, 'rgba(0,0,0,.5)');           // пробор
  for (const [a, b] of [[o + 50, -96], [o - 70, -98], [o + 100, -86]]) path(x, [[a, b], [a + (a > o ? 14 : -14), b - 30, a + (a > o ? 40 : -40), b - 46]], 3, 'rgba(0,0,0,.35)');
  x.restore();
  path(x, [[-84, -128], [-34, -152, 30, -150]], 7, `rgba(255,255,255,${gloss})`);                     // блеск
  for (const sd of [-1, 1]) poly(x, [[sd * 131, -30], [sd * 124, -46], [sd * 116, 8], [sd * 128, 12]], dark, null);
}
// круглые очки в тонкой оправе (agent2)
function roundGlasses(x, S, VW, p) {
  if (isBack(VW)) return; const ink = S.colors.ink, comp = VW ? (VW.view === 'side' ? .6 : .86) : 1, o = offOf(VW, p);
  const ecx = (S.face.eyes[0].x + S.face.eyes[1].x) / 2, E = S.face.eyes.map(e => [(e.x - ecx) * comp + ecx + o, e.y + 2]);
  for (const [i, [ex, ey]] of E.entries()) { const r = VW && VW.view === 'side' && (VW.facing > 0 ? i === 0 : i === 1) ? 20 : 33;
    x.beginPath(); x.ellipse(ex, ey, r, 33, 0, 0, TAU); x.fillStyle = 'rgba(190,215,235,.18)'; x.fill(); x.lineWidth = 5; x.strokeStyle = ink; x.stroke();
    path(x, [[ex - r * .45, ey - 6], [ex - r * .15, ey - 22]], 3.5, 'rgba(255,255,255,.4)'); }
  path(x, [[E[0][0] + 30, E[0][1] - 6], [(E[0][0] + E[1][0]) / 2, E[0][1] - 18, E[1][0] - 30, E[1][1] - 6]], 4.5, ink);
  const R = S.head.rx;
  if (!VW || VW.facing >= 0) path(x, [[E[0][0] - 33, E[0][1] - 4], [-R + 6, E[0][1] - 14]], 4, ink);
  if (!VW || VW.facing <= 0) path(x, [[E[1][0] + 33, E[1][1] - 4], [R - 6, E[1][1] - 14]], 4, ink);
}

HATS.L_agent1 = (x, H, S, VW, p) => { HATS.L_inspector(x, H, S, VW, p); headphones(x, S, VW, p); };
HATS.L_agent2 = (x, H, S, VW, p) => { HATS.L_guide(x, H, S, VW, p); roundGlasses(x, S, VW, p); headphones(x, S, VW, p); };
HATS.L_waiter = (x, H, S, VW, p) => sleekHair(x, S, VW, p, { light: '#4a4650', mid: '#1c1a22', dark: '#08070a', gloss: .45 });
HATS.L_young = (x, H, S, VW, p) => sleekHair(x, S, VW, p, { light: '#3a3640', mid: '#1a181e', dark: '#0a090c', fringe: true, gloss: .3 });

// ---------- костюм агента: пиджак, рубашка, галстук; цвета — параметры ----------
const suit = ({ lapel, lapelHi, tie, tieKnot, tieHi, stripe }) => cloth((x, S, VW) => {
  const ink = S.colors.ink;
  if (isBack(VW)) { path(x, [[0, -150], [0, 160]], 3, 'rgba(0,0,0,.45)'); return; }
  poly(x, [[-34, -150], [34, -150], [0, -40]], '#F2EFE8', null);                                         // рубашка
  poly(x, [[-9, -140], [9, -140], [11, -124], [-11, -124]], tieKnot, ink, 2.5);
  poly(x, [[-11, -124], [11, -124], [8, -50], [0, -38], [-8, -50]], tie, ink, 2.5);                      // узкий галстук
  if (stripe) for (const y of [-110, -90, -70]) path(x, [[-9, y + 6], [9, y - 6]], 3, stripe);
  path(x, [[-3, -118], [-2, -60]], 2.5, tieHi);
  poly(x, [[-34, -150], [-84, -136], [-60, -92], [-30, 0], [0, -40]], lapel, ink, 4);                   // лацканы
  poly(x, [[34, -150], [84, -136], [60, -92], [30, 0], [0, -40]], lapel, ink, 4);
  path(x, [[-78, -130], [-50, -42]], 3, lapelHi);
  for (const py of [24, 74]) ell(x, 0, py, 6.5, 6.5, '#121218', ink, 2.5);
  path(x, [[0, -40], [0, 160]], 2.5, 'rgba(0,0,0,.4)');
  path(x, [[-88, 44], [-46, 44]], 4, 'rgba(0,0,0,.45)'); path(x, [[46, 44], [88, 44]], 4, 'rgba(0,0,0,.45)');
  path(x, [[-90, -60], [-100, 0, -90, 60]], 10, 'rgba(210,220,240,.12)');
});

export function agent1() {
  const c = detective({
    name: 'agent1', hat: { type: 'L_agent1' }, colors: { hair: '#2A2024' }, shoe: '#121010',
    face: { restEye: 'lid', restMouth: 'flat', browCol: '#2A2024', eyes: [{ x: -46, y: -14, rx: 8.5, ry: 11.5, lw: 6.5, tilt: 3 }, { x: 46, y: -14, rx: 8.5, ry: 11.5, lw: 6.5, tilt: -3 }] },
    body: { fillRadial: { at: [-44, -76], r0: 12, to: [-8, -10], r1: 205, stops: [[0, '#6a6870'], [.45, '#3c3a42'], [1, '#1c1b20']] },
      inside: [suit({ lapel: '#35333b', lapelHi: 'rgba(220,220,235,.25)', tie: '#121116', tieKnot: '#0c0b0e', tieHi: 'rgba(255,255,255,.15)' })] },
  });
  c.spec.rig = { ...c.spec.rig, plantLegs: .02, armLayer: 'front' };
  return c;
}
export function agent2() {
  const c = detective({
    name: 'agent2', hat: { type: 'L_agent2' }, colors: { hair: '#141015' }, shoe: '#16181E',
    face: { restEye: 'dot', restMouth: 'flatS', browCol: '#141015', eyes: [{ x: -44, y: -16, rx: 9, ry: 12, lw: 6, tilt: 0 }, { x: 44, y: -16, rx: 9, ry: 12, lw: 6, tilt: 0 }] },
    body: { fillRadial: { at: [-44, -76], r0: 12, to: [-8, -10], r1: 205, stops: [[0, '#4d5f8c'], [.45, '#2a3658'], [1, '#141a2e']] },
      inside: [suit({ lapel: '#25304e', lapelHi: 'rgba(200,215,255,.3)', tie: '#5d8fc9', tieKnot: '#3f6ea8', tieHi: 'rgba(255,255,255,.3)', stripe: 'rgba(20,30,60,.6)' })] },
  });
  c.spec.rig = { ...c.spec.rig, plantLegs: .02, armLayer: 'front' };
  return c;
}
// агент в зале: детектив как есть (федора, тренч) — лицо всегда за меню
export function watcher() {
  const c = detective({ name: 'watcher' });
  c.spec.rig = { ...c.spec.rig, plantLegs: .02, armLayer: 'front' };
  return c;
}
export function waiter() {
  const c = detective({
    name: 'waiter', hat: { type: 'L_waiter' }, colors: { hair: '#141015', stache: '#141015' }, shoe: '#0E0C0F',
    face: { restEye: 'dot', restMouth: 'smile', moustache: true, stacheK: .7, browCol: '#141015' },
    body: {
      fillRadial: { at: [-44, -76], r0: 12, to: [-8, -10], r1: 205, stops: [[0, '#FFFFFF'], [.5, '#ECE7DE'], [1, '#B4ADA2']] },
      inside: [cloth((x, S, VW) => {
        const ink = S.colors.ink;
        if (isBack(VW)) { path(x, [[0, -150], [0, 160]], 3, 'rgba(0,0,0,.2)'); return; }
        poly(x, [[-30, -150], [30, -150], [0, -60]], '#FFFFFF', null);
        poly(x, [[-6, -136], [-36, -152], [-36, -118]], '#121116', ink, 2.5); poly(x, [[6, -136], [36, -152], [36, -118]], '#121116', ink, 2.5); ell(x, 0, -135, 7, 7, '#0a090c', ink, 2.5);   // бабочка
        poly(x, [[-30, -150], [-80, -136], [-56, -90], [-26, -20], [0, -60]], '#F4F0E8', ink, 4); poly(x, [[30, -150], [80, -136], [56, -90], [26, -20], [0, -60]], '#F4F0E8', ink, 4);
        for (const py of [-6, 40, 86]) { ell(x, 0, py, 7, 7, '#D9B24A', ink, 2.5); ell(x, -2, py - 2, 2.5, 2.5, 'rgba(255,255,255,.6)', null); }
        path(x, [[-88, 30], [-50, 30]], 4, 'rgba(0,0,0,.25)');
        x.save(); x.translate(56, -70); poly(x, [[-16, -6], [16, -6], [12, 6], [-12, 6]], '#B3121F', null); x.restore();   // платок в кармане
      })],
    },
  });
  c.spec.rig = { ...c.spec.rig, plantLegs: .02, armLayer: 'front' };
  return c;
}
export function youngJensen() {
  const c = jensen({
    name: 'youngJensen', hat: { type: 'L_young' }, colors: { hair: '#141015' }, shoe: '#5A3A22',
    face: { restMouth: 'smile', browCol: '#141015', eyes: [{ x: -46, y: -10, rx: 9.5, ry: 13, lw: 6, tilt: 0 }, { x: 46, y: -10, rx: 9.5, ry: 13, lw: 6, tilt: 0 }] },
    body: {
      fillRadial: { at: [-44, -76], r0: 12, to: [-8, -10], r1: 200, stops: [[0, '#F7F1E2'], [.5, '#E4DAC4'], [1, '#A99C80']] },
      inside: [cloth((x, S, VW) => {
        const ink = S.colors.ink;
        for (let y = -120; y < 160; y += 46) { x.fillStyle = 'rgba(46,92,160,.75)'; x.fillRect(-120, y, 240, 18); }   // полосатая футболка
        if (isBack(VW)) return;
        path(x, [[-34, -146], [0, -122, 34, -146]], 6, '#2E5CA0');
        path(x, [[-86, -60], [-96, 0, -86, 60]], 9, 'rgba(255,255,255,.25)');
      })],
    },
  });
  c.spec.rig = { ...c.spec.rig, plantLegs: .02, armLayer: 'front' };
  return c;
}

// =====================================================================================================
// Общие для глав 2–9 (владелец — ведущий; рабочие импортируют, не правят)
// =====================================================================================================
// official — чиновник Вашингтона (OFFICIAL гл. 3 и 7, клерк чёрного списка гл. 6; Минторг, Минюст, конгрессмен — варианты):
//   седая стрижка на пробор, круглые очки, костюм; o = { suit: [свет, тень, низ], tie: [галстук, узел], hair: 'grey'|'dark'|'brown'|'bald', glasses, moustache }
HATS.L_official_grey = (x, H, S, VW, p) => { sleekHair(x, S, VW, p, { light: '#E4E6EA', mid: '#A9AEB6', dark: '#6D727B', gloss: .5 }); if (S.glasses !== false) roundGlasses(x, S, VW, p); };
HATS.L_official_dark = (x, H, S, VW, p) => { sleekHair(x, S, VW, p, { light: '#5a4c48', mid: '#33282a', dark: '#1a1416', gloss: .3 }); if (S.glasses) roundGlasses(x, S, VW, p); };
HATS.L_official_brown = (x, H, S, VW, p) => { sleekHair(x, S, VW, p, { light: '#a8774a', mid: '#6e4626', dark: '#3a2212', gloss: .35 }); if (S.glasses) roundGlasses(x, S, VW, p); };   // каштановый зачёс (чиновник гл. 3/7 — не путать с седым Дженсеном в очках)
HATS.L_official_bald = (x, H, S, VW, p) => { if (!isBack(VW)) for (const sd of [-1, 1]) poly(x, [[sd * 131, -40], [sd * 122, -66], [sd * 112, 4], [sd * 128, 12]], '#8d8f95', null); if (S.glasses !== false) roundGlasses(x, S, VW, p); };
export function official(o = {}) {
  const [l, m, d] = o.suit || ['#5e6472', '#383d49', '#1b1e26'], [tie, knot] = o.tie || ['#7A1B28', '#5E1520'];
  const c = detective({
    name: o.name || 'official', hat: { type: 'L_official_' + (o.hair || 'grey') }, colors: { hair: '#A9AEB6', ...(o.moustache ? { stache: o.stache || '#4a2e18' } : {}) }, shoe: '#121010',
    face: { restEye: 'dot', restMouth: 'flat', browCol: o.hair === 'dark' ? '#2A2024' : o.hair === 'brown' ? '#4a2e18' : '#8d9097', ...(o.moustache ? { moustache: true, stacheK: .8 } : {}), eyes: [{ x: -44, y: -16, rx: 8.5, ry: 11, lw: 6, tilt: 0 }, { x: 44, y: -16, rx: 8.5, ry: 11, lw: 6, tilt: 0 }] },
    body: { fillRadial: { at: [-44, -76], r0: 12, to: [-8, -10], r1: 205, stops: [[0, l], [.45, m], [1, d]] },
      inside: [suit({ lapel: m, lapelHi: 'rgba(220,225,240,.25)', tie, tieKnot: knot, tieHi: 'rgba(255,255,255,.2)' })] },
  });
  c.spec.glasses = o.glasses; c.spec.rig = { ...c.spec.rig, plantLegs: .02, armLayer: 'front' };
  return c;
}
// aide — помощник (AIDE гл. 2 и 8): молодой, тёмные волосы, рубашка с закатанными рукавами (светлый корпус) и узкий тёмный галстук
export function aide() {
  const c = detective({
    name: 'aide', hat: { type: 'L_official_dark' }, colors: { hair: '#2A2024' }, shoe: '#121010',
    face: { restEye: 'dot', restMouth: 'flatS', browCol: '#2A2024' },
    body: { fillRadial: { at: [-44, -76], r0: 12, to: [-8, -10], r1: 205, stops: [[0, '#F4F6FA'], [.5, '#D6DCE6'], [1, '#97A0B0']] },
      inside: [cloth((x, S, VW) => { if (isBack(VW)) return; const ink = S.colors.ink;
        poly(x, [[-9, -140], [9, -140], [11, -124], [-11, -124]], '#1e2433', ink, 2.5); poly(x, [[-11, -124], [11, -124], [8, -40], [0, -28], [-8, -40]], '#2b3550', ink, 2.5);
        path(x, [[-34, -150], [0, -128], [34, -150]], 5, ink); for (const py of [-20, 40, 100]) ell(x, 22, py, 5, 5, '#e8ebf0', ink, 2);
        path(x, [[-90, -60], [-100, 0, -90, 60]], 10, 'rgba(255,255,255,.35)'); })] },
  });
  c.spec.rig = { ...c.spec.rig, plantLegs: .02, armLayer: 'front' };
  return c;
}
// officer — пекинский офицер: рисуется ТОЛЬКО силуэтом без лица (staging/desk.js silhouette), поэтому важен контур: фуражка и китель
HATS.L_officer = (x, H, S, VW, p) => { const ink = S.colors.ink, o = offOf(VW, p) * .2;
  poly(x, [[-150 + o, -96], [-128 + o, -150], [0 + o, -196], [130 + o, -150], [152 + o, -96], [0 + o, -84]], '#2a1414', ink, S.lw);      // тулья фуражки
  poly(x, [[-160 + o, -96], [160 + o, -96], [180 + o, -70], [-60 + o, -60]], '#140909', ink, S.lw); };                                   // козырёк
export function officer() {
  const c = detective({ name: 'officer', hat: { type: 'L_officer' }, colors: { hair: '#140909' },
    body: { fillRadial: { at: [-44, -76], r0: 12, to: [-8, -10], r1: 205, stops: [[0, '#4a2a26'], [.5, '#2a1614'], [1, '#140909']] }, inside: [] } });
  c.spec.rig = { ...c.spec.rig, plantLegs: .02, armLayer: 'front' };
  return c;
}

// ROOMMATE (гл. 2, Кентукки): 17 лет, огромный рядом с 9-летним Дженсеном (ставится крупнее — fs ×1.35), бритая голова-ёжик,
// тёмно-серая майка, татуировки на груди и плечах (чернильные завитки), шрам на щеке; бинт на руке рисует постановка (кисть-точка)
export function roommate() {
  const c = jensen({
    name: 'roommate', hat: { type: 'L_inspector' }, colors: { hair: '#5a3a24' }, shoe: '#2a2420',
    face: { restMouth: 'flat', browCol: '#2a211c', eyes: [{ x: -44, y: -6, rx: 8, ry: 9, lw: 6, tilt: 0 }, { x: 44, y: -6, rx: 8, ry: 9, lw: 6, tilt: 0 }] },
    body: {
      fillRadial: { at: [-44, -76], r0: 12, to: [-8, -10], r1: 205, stops: [[0, '#6a6a70'], [.5, '#47474e'], [1, '#26262c']] },
      inside: [cloth((x, S, VW) => {
        const ink = S.colors.ink;
        if (isBack(VW)) return;
        poly(x, [[-60, -160], [-20, -160], [-34, -110]], '#E8D2B8', ink, 3); poly(x, [[60, -160], [20, -160], [34, -110]], '#E8D2B8', ink, 3);   // голые плечи у лямок майки
        for (const sx of [-1, 1]) { path(x, [[sx * 52, -150], [sx * 70, -130, sx * 54, -112], [sx * 40, -100, sx * 58, -88]], 4, 'rgba(30,40,70,.9)'); }   // тату на плечах
      })],
    },
  });
  c.spec.rig = { ...c.spec.rig, plantLegs: .02, armLayer: 'front' };
  return c;
}
