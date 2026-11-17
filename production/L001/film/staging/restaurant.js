// staging/restaurant.js — L01 ресторан: постановка по утверждённой пробе scenes/dialogue_probe (общий, крупные, обратная точка).
// Все точки — пиксели плейта 1920×1080 (проба считала в пикселях исходника 1672×941: здесь уже пересчитано ×1.1483 / ×1.1477).
//   общий план (plate_v2): герои сидят на НАРИСОВАННЫХ стульях плейта; скатерть (mask_cloth_v2) закрывает всё ниже кромки стола;
//   крупные с этого плейта: свой нарисованный стул chairBack за спиной, стол — тем же размытием, что фон;
//   обратная точка (plate_reverse): Алиса крупно на своём стуле, край стола и свеча (mask_rev_cloth) — перед ней.
// Свет: свеча на столе — Дженсену справа [1, .45], Алисе слева [-1, .45] (noirShade).
import { jensen, alice, noirShade, act, blinkAt, shoulder, restHand, arcHand, gesture, elbowIK, elbowArm, ell, clamp, lerp, E } from 'engine';
import { watcher, waiter } from '../chars.js';
import { wineGlass, menuLens, orderFolder, greenCrate, clinkSpark } from '../props.js';
import { mouth } from '../words.js';
import { W, H, toS, plate, img, masked, blurred, polyMask, lazy, fig, chair, loc, toPlate, armShadow, bokeh, soft, figXf } from './common.js';
import plateV2 from '../assets/plate_v2_far.png';                     // plate_v2 + дальний столик в проёме справа (make_plates.py, D01 #1)
import maskCloth from '../../../longform/style-test/assets/mask_cloth_v2.png';
import plateRevU from '../../scenes/dialogue_probe/assets/plate_reverse.png';
import maskRevU from '../../scenes/dialogue_probe/assets/mask_rev_cloth.png';

// ================= конфиг постановки (точки плейта) =================
export const CFG = {
  wide: {
    figPx: .8754,                                         // пикселей плейта на единицу фигуры (UNIT .0059 пробы)
    seat: { J: [270.0, 945.0], A: [1655.1, 940.0] },      // сиденья нарисованных стульев (бёдра на подушке)
    pin: { J: [482.3, 837.8], A: [1460.1, 838.1] },       // кисть ближней руки на столешнице
    elbow: { J: [395.0, 826.4], A: [1535.1, 828.1] },     // локоть у края стола
    top: 863.1,                                           // линия столешницы: ниже — скатерть перед героями
    table: [964.6, 829.8, 585.6, 60.8],                   // столешница-эллипс (тени рук клипуются по ней)
    shadow: { dx: 24, dy: 10, blur: 12, k: .4 },          // падающая тень силуэта (свеча между ними)
    light: { J: [1, .45], A: [-1, .45] },
    flame: [912, 748],
    // D01 #1: агент за дальним столиком в проёме справа (плейт plate_v2_far): сидит за столом, меню у лица, объектив на нашу пару
    far: { seat: [1838, 590], fs: .14, cloth: [[1798, 556], [1806, 552], [1838, 549], [1870, 552], [1878, 558], [1880, 596], [1874, 602], [1802, 602], [1796, 596]] },
  },
  cu: {                                                   // крупные с плейта общего плана: свой стул, сиденье — центр спинки
    seat: { J: [244.0, 965.0], A: [1676.6, 960.1] }, pin: { J: [496.1, 836.7], A: [1433.0, 836.7] }, elbow: { J: [392.0, 826.0], A: [1537.0, 826.0] },
    chairW: 470,
  },
  rev: {                                                  // обратная точка (plate_reverse): Алиса
    fs: 1.62, seat: [1200, 1100], pin: [950, 1025], elbow: [1035, 958], pin2: [1362, 1035], elbow2: [1302, 972],
    edge: [[0, 968], [40, 958], [120, 955], [160, 945], [240, 938], [360, 929], [600, 928], [960, 931], [1200, 949], [1340, 958], [1420, 970], [1500, 985], [1560, 998], [1640, 1012], [1640, 1080], [0, 1080]],
    chairCol: { velvet: '#6E1A20', shade: '#4E1116', frame: '#3A1013' },
    // дальний столик слева (агент в зале с меню): скатерть закрывает его ниже столешницы
    far: { seat: [326, 652], fs: .42, cloth: [[222, 600], [262, 590], [330, 587], [400, 592], [430, 604], [432, 700], [420, 738], [228, 738], [220, 700]] },
  },
};
const ARMW = 11;
const bounce = u => { const n = 7.5625, d = 2.75; if (u < 1 / d) return n * u * u; if (u < 2 / d) return n * (u -= 1.5 / d) * u + .75; if (u < 2.5 / d) return n * (u -= 2.25 / d) * u + .9375; return n * (u -= 2.625 / d) * u + .984375; };
const fixM = p => { if (p.mouth === 'teeth' || p.mouth === 'teethOpen') p.mouth = 'open'; return p; };

// ================= ассеты =================
const I = { plate: img(plateV2), cloth: img(maskCloth), rev: img(plateRevU), revM: img(maskRevU) };
export const A = lazy(Object.values(I), () => {
  const tm = document.createElement('canvas'); tm.width = W; tm.height = H; const tx = tm.getContext('2d');
  tx.drawImage(I.cloth, 0, 0, W, H); tx.fillStyle = '#fff'; const [ex, ey, rx, ry] = CFG.wide.table; tx.beginPath(); tx.ellipse(ex, ey, rx, ry, 0, 0, Math.PI * 2); tx.fill();
  const table = masked(I.plate, tm);
  const farM = polyMask([CFG.rev.far.cloth]);
  return {
    plate: I.plate, cloth: masked(I.plate, I.cloth), clothB2: blurred(masked(I.plate, I.cloth), 2.2, false), plateB4: blurred(I.plate, 4), plateB2: blurred(I.plate, 2.2), plateB6: blurred(I.plate, 6),
    tableB4: blurred(table, 4, false), tableB2: blurred(table, 2.2, false),
    farCloth: masked(I.plate, polyMask([CFG.wide.far.cloth])), farClothB4: blurred(masked(I.plate, polyMask([CFG.wide.far.cloth])), 4, false),
    rev: I.rev, revB: blurred(I.rev, 3.2), revB9: blurred(I.rev, 8), revFG: blurred(masked(I.rev, I.revM), 1.6, false), revFar: blurred(masked(I.rev, farM), 3.2, false),
  };
});

// ================= герои =================
const J = jensen(), Al = alice(), JC = jensen(), AC = alice(), AR = alice(), WT = watcher(), WA = waiter();
J.spec.shade = noirShade(CFG.wide.light.J); Al.spec.shade = noirShade(CFG.wide.light.A); Al.spec.shade.head.glow.k = .12;
JC.spec.shade = noirShade([1, .45]); AC.spec.shade = noirShade([-1, .45], { cutY: -40 }); AC.spec.shade.head.glow.k = .12;
AR.spec.shade = noirShade([-1, .45], { cutY: -40 }); AR.spec.shade.head.glow.k = .12;
WT.spec.shade = noirShade([1, -.2]); WA.spec.shade = noirShade([1, .3]);
for (const C of [J, Al, JC, AC, AR]) C.spec.rig = { ...C.spec.rig, armLayer: 'front' };
export const CAST = { J, Al, JC, AC, AR, WT, WA };

// ================= руки сидящего у стола =================
// ближняя к столу рука лежит на столешнице (кисть pin, локоть elbow); жест/бокал поднимают её по дуге; дальняя — в покое или к точке
// o: { f: +1 лицом вправо | -1 влево, anchor, fs, pin, elbow, g: {hand, body} — подъём ближней, up — куда (коорд. фигуры),
//      far: [x,y] фигуры | null, farK 0..1 }
function tableArms(S, p, o) {
  const near = o.f > 0 ? 1 : 0, sdN = o.f > 0 ? 1 : -1, sh = shoulder(S, sdN);
  const q = loc(S, p, o.anchor, o.fs, o.pin), ev = loc(S, p, o.anchor, o.fs, o.elbow), arms = [];
  let hand = q, elbow = ev, shk = 1;
  const gh = o.g ? o.g.hand : 0;
  if (gh > .001) {
    const up = o.up || [sh[0] + o.f * 175, sh[1] - 60]; hand = arcHand(sh, q, up, gh);
    const Lr = Math.hypot(ev[0] - sh[0], ev[1] - sh[1]) + Math.hypot(q[0] - ev[0], q[1] - ev[1]), ik = elbowIK(sh, hand, Lr, sdN).e, m = Math.min(1, gh);
    elbow = [ev[0] + (ik[0] - ev[0]) * m, ev[1] + (ik[1] - ev[1]) * m]; shk = clamp(1 - gh * 2);
  }
  arms[near] = { to: hand, via: elbow, w: ARMW };
  const fa = 1 - near, rest = restHand(S, fa ? 1 : -1);
  if (o.far && (o.farK ?? 1) > .001) { const shF = shoulder(S, fa ? 1 : -1); arms[fa] = { to: arcHand(shF, rest, o.far, o.farK ?? 1), w: ARMW }; }
  else arms[fa] = { to: rest, w: ARMW };
  p.arms = arms;
  return { hand, shk };
}
// поза сидящего: эмоции по ключам (лицо), рот — только на своих словах (words.js), моргание, лёгкое дыхание, жест корпусом
function seatedPose(t, T, { keys, sp, seed, f, stance, view = 'threeQuarter', look, g, lean = 0, laugh = false }) {
  const p = fixM(act(t, keys));
  Object.assign(p, { blink: blinkAt(t + seed * 1.7, seed), view, facing: f, stance, look: look || [.6 * f, 0] });
  p.bob = (p.bob || 0) * .35; p.sq = (p.sq || 0) * .35;
  p.lean = (p.lean || 0) * .5 + f * .045 * (g ? g.body : 0) + lean; p.tilt = (p.tilt || 0) + f * .04 * (g ? g.body : 0);
  if (!laugh) p.mouth = mouth(sp, T, p.mouth, seed);              // смех — без липфлапа (рот открыт и неподвижен)
  return p;
}
// огибающая «держит предмет»: поднимает к t0 за rise, держит до t1, опускает за fall
export const holdEnv = (t, t0, t1, rise = .32, fall = .3) => t < t0 - rise ? 0 : t < t0 ? E.outBack(clamp((t - (t0 - rise)) / rise)) : t < t1 ? 1 : t < t1 + fall ? 1 - E.inOutCubic(clamp((t - t1) / fall)) : 0;
const G = (t, at, o) => (at == null ? { hand: 0, body: 0 } : gesture(t, at, { lead: .12, rise: .26, hold: .55, fall: .34, lagFrames: 3, ...o }));

// ================= общий план =================
// o: { j: {keys, at, sp, look}, a: {...}, solo, blurBg, freezeT }
export function wide(ctx, v, t, T, o = {}) {
  const a = A(), c = CFG.wide; if (!a) return;
  if (!o.solo) plate(ctx, o.blur ? a.plateB2 : a.plate, v);
  if (!o.solo && !o.noAgent) farAgent(ctx, v, t, o.blur ? 2.2 : 0, o.glint);
  const cast = [
    { C: J, f: 1, k: 'J', st: 'sitR', seed: 1, sp: 'JENSEN', ...(o.j || {}) },
    { C: Al, f: -1, k: 'A', st: 'sitL', seed: 2, sp: 'ALICE', ...(o.a || {}) },
  ];
  const shadows = [], poses = [];
  for (const m of cast) {
    const g = m.hold != null ? { hand: m.hold, body: m.hold * .4 } : G(t, m.at);
    const anchor = [c.seat[m.k][0] + (m.dx || 0), c.seat[m.k][1] + (m.dy || 0)];
    const p = seatedPose(t, T, { keys: m.keys || [[0, m.f > 0 ? 'neutral' : 'smug']], sp: m.sp, seed: m.seed, f: m.f, stance: m.st, look: m.look, g, lean: m.lean || 0, laugh: m.laugh });
    const r = tableArms(m.C.spec, p, { f: m.f, anchor, fs: c.figPx, pin: c.pin[m.k], elbow: c.elbow[m.k], g, up: m.up, far: m.far, farK: m.farK });
    if (m.armsK != null && m.armsK < 1) {   // руки ещё не на столе (садится): ближняя кисть от бедра к столешнице
      const S = m.C.spec, near = m.f > 0 ? 1 : 0, rest = restHand(S, m.f), sh = shoulder(S, m.f);
      p.arms[near] = { to: arcHand(sh, rest, p.arms[near].to, m.armsK), w: ARMW }; r.shk = m.armsK;
    }
    poses.push([m, p, anchor]); shadows.push([m, anchor, r.shk]);
  }
  const L = o.solo ? null : { shadow: { ...c.shadow, dx: c.shadow.dx * v.k, dy: c.shadow.dy * v.k } };
  for (const [m, p, an] of poses) fig(ctx, m.C, p, v, an, c.figPx, 'seat', { only: 'base' }, L && { shadow: { ...L.shadow, dx: L.shadow.dx * -m.f } });
  if (!o.solo) {
    const yTop = toS(v, [0, c.top])[1];
    ctx.save(); ctx.beginPath(); ctx.rect(0, yTop, W, H); ctx.clip(); plate(ctx, o.blur ? a.clothB2 : a.cloth, v); ctx.restore();
    const [ex, ey, rx, ry] = c.table, cc = toS(v, [ex, ey]);
    for (const [m, an, k] of shadows) armShadow(ctx, toS(v, c.elbow[m.k]), toS(v, c.pin[m.k]), k, c.figPx * v.k, () => { ctx.beginPath(); ctx.ellipse(cc[0], cc[1], rx * v.k, ry * v.k, 0, 0, Math.PI * 2); });
  }
  for (const [m, p, an] of poses) fig(ctx, m.C, p, v, an, c.figPx, 'seat', { only: 'front' });
  if (o.held) for (const [m, p, an] of poses) if (o.held[m.k]) o.held[m.k](ctx, m, p, an);
}
export const flame = v => toS(v, CFG.wide.flame);

// ================= крупно с плейта общего плана (Дженсен слева / Алиса справа) =================
// o: { who: 'J'|'A', keys, at (жест ближней рукой), hold (0..1 подъём ближней с предметом), up, far, farK, lean, laugh, look, table: 'tableB4'|'tableB2', glass }
export function cu(ctx, v, t, T, o) {
  const a = A(); if (!a) return {};
  const isJ = o.who !== 'A', C = isJ ? JC : AC, S = C.spec, f = isJ ? 1 : -1, c = CFG.cu, k = isJ ? 'J' : 'A', seat = c.seat[k];
  const g = o.hold != null ? { hand: o.hold, body: o.hold * .5 } : G(t, o.at);
  const p = seatedPose(t, T, { keys: o.keys, sp: isJ ? 'JENSEN' : 'ALICE', seed: isJ ? 1 : 2, f, stance: isJ ? 'sitR' : 'sitL', look: o.look, g, lean: o.lean || 0, laugh: o.laugh });
  const pin = o.pin || c.pin[k], elb = o.elbow || c.elbow[k];
  const r = tableArms(S, p, { f, anchor: seat, fs: CFG.wide.figPx, pin, elbow: elb, g, up: o.up, far: o.far, farK: o.farK });
  if (!o.solo) plate(ctx, a[o.bg || 'plateB4'], v);
  if (!o.solo) farAgent(ctx, v, t, o.bg === 'plateB2' ? 2.2 : 4, o.glint);
  if (!o.solo) chair(ctx, C, v, seat, CFG.wide.figPx, { w: c.chairW, light: f, ...(isJ ? {} : { col: CFG.rev.chairCol }) });
  if (o.under) o.under(ctx, v);
  fig(ctx, C, p, v, seat, CFG.wide.figPx, 'seat', { only: 'base' });
  if (!o.solo) {
    plate(ctx, a[o.table || 'tableB4'], v);
    const [ex, ey, rx, ry] = CFG.wide.table, cc = toS(v, [ex, ey]);
    armShadow(ctx, toS(v, elb), toS(v, pin), r.shk, CFG.wide.figPx * v.k, () => { ctx.beginPath(); ctx.ellipse(cc[0], cc[1], rx * v.k, ry * v.k, 0, 0, Math.PI * 2); });
    if (o.onTable) o.onTable(ctx, v);
  }
  fig(ctx, C, p, v, seat, CFG.wide.figPx, 'seat', { only: 'front' });
  if (o.over && !o.solo) o.over(ctx, v);
  const handS = toS(v, toPlate(S, seat, CFG.wide.figPx, unLoc(S, p, r.hand)));
  if (o.glass && g.hand > .02) glassInHand(ctx, handS, CFG.wide.figPx * v.k, f, o.glass);
  return { p, hand: handS, s: CFG.wide.figPx * v.k };
}
// кисть (координаты фигуры до корпуса) -> координаты фигуры после корпуса (для предмета в кисти)
function unLoc(S, p, q) {
  let [x, y] = q; const u = S.u ?? 1, sq = p.sq || 0, bob = p.bob || 0, lean = p.lean || 0, hy = S.rig.hipY, hipDy = bob + sq * 60 * u;
  y -= hy; x *= 1 + sq * .6; y *= 1 - sq; const c = Math.cos(lean), s = Math.sin(lean); [x, y] = [x * c - y * s, x * s + y * c];
  return [x + (p.dx || 0), y + hy + hipDy + (p.dy || 0)];
}
// бокал в кисти: ножка в кисти, s — пикселей экрана на единицу фигуры (бокал ~217 ед. — как нарисованные на столе)
function glassInHand(ctx, h, s, f, o = {}) { wineGlass(ctx, h[0], h[1] + 4 * s, .78 * s, (o.tilt ?? .08) * f, '#141014', undefined, o.slosh || 0); ell(ctx, h[0], h[1] + 4 * s, 12 * s, 12 * s, '#141014', null); }

// ================= обратная точка: Алиса крупно =================
// o: { keys, at (поправляет очки — время), hold (бокал), glass, watcher: {glint}, solo, bg: 'revB' }
export function rev(ctx, v, t, T, o = {}) {
  const a = A(), c = CFG.rev; if (!a) return {};
  if (!o.solo) plate(ctx, a[o.bg || 'revB'], v);
  if (o.watcher && !o.solo) farWatcher(ctx, v, t, o.watcher);
  const S = AR.spec, gl = o.at != null ? gesture(t, o.at, { lead: .14, rise: .3, hold: .45, fall: .3, lagFrames: 3 }) : { hand: 0, body: 0 };
  const hold = o.hold || 0;
  const p = seatedPose(t, T, { keys: o.keys || [[0, 'smug']], sp: 'ALICE', seed: 2, f: -1, stance: 'sitL', look: o.look || [-.6, 0], g: { body: -gl.body * .7 + 0, hand: 0 } });
  p.lean += -.03 * gl.body + .03 * hold;
  const q = loc(S, p, c.seat, c.fs, c.pin), ev = loc(S, p, c.seat, c.fs, c.elbow), q2 = loc(S, p, c.seat, c.fs, c.pin2), ev2 = loc(S, p, c.seat, c.fs, c.elbow2);
  // дальняя (правая) рука: поправляет очки — кисть к дужке у виска
  const sh2 = shoulder(S, 1), temple = [S.head.x + 122, S.head.y - 6]; let hand2 = q2, el2 = ev2;
  if (gl.hand > .001) { hand2 = arcHand(sh2, q2, temple, gl.hand); const Lr = Math.hypot(ev2[0] - sh2[0], ev2[1] - sh2[1]) + Math.hypot(q2[0] - ev2[0], q2[1] - ev2[1]), ik = elbowIK(sh2, hand2, Lr, 1).e, m = Math.min(1, gl.hand); el2 = [ev2[0] + (ik[0] - ev2[0]) * m, ev2[1] + (ik[1] - ev2[1]) * m]; }
  // ближняя (левая) рука: со стола — с бокалом навстречу
  const sh = shoulder(S, -1); let hand = q, el = ev;
  if (hold > .001) { const up = o.up || [sh[0] - 190, sh[1] - 70]; hand = arcHand(sh, q, up, hold); const Lr = Math.hypot(ev[0] - sh[0], ev[1] - sh[1]) + Math.hypot(q[0] - ev[0], q[1] - ev[1]), ik = elbowIK(sh, hand, Lr, -1).e, m = Math.min(1, hold); el = [ev[0] + (ik[0] - ev[0]) * m, ev[1] + (ik[1] - ev[1]) * m]; }
  p.arms = [{ to: hand, via: el, w: ARMW }, { to: hand2, via: el2, w: ARMW }];
  if (!o.solo) chair(ctx, AR, v, c.seat, c.fs, { w: 420, light: -1, legs: 0, col: c.chairCol });
  fig(ctx, AR, p, v, c.seat, c.fs, 'seat', { only: 'base' });
  if (!o.solo) {
    plate(ctx, a.revFG, v);
    const clip = () => { ctx.beginPath(); c.edge.forEach(([x, y], i) => { const s = toS(v, [x, y + 6]); i ? ctx.lineTo(...s) : ctx.moveTo(...s); }); ctx.closePath(); };
    armShadow(ctx, toS(v, c.elbow), toS(v, c.pin), clamp(1 - hold * 2), c.fs * v.k, clip);
    armShadow(ctx, toS(v, c.elbow2), toS(v, c.pin2), clamp(1 - gl.hand * 2), c.fs * v.k, clip);
  }
  fig(ctx, AR, p, v, c.seat, c.fs, 'seat', { only: 'front' });
  const handS = toS(v, toPlate(S, c.seat, c.fs, unLoc(S, p, hand)));
  if (o.glass && hold > .02) glassInHand(ctx, handS, c.fs * v.k, -1, o.glass);
  return { p, hand: handS, s: c.fs * v.k };
}
// агент в зале за дальним столиком слева (размыт, как фон): меню у лица, объектив смотрит на наш стол
function farWatcher(ctx, v, t, o) {
  const a = A(), c = CFG.rev.far, S = WT.spec;
  soft(ctx, 2.6 * v.k, x => {
    const p = act(t, [[0, 'neutral']]); Object.assign(p, { view: 'front', stance: 'sitR', bob: 0, sq: 0, lean: 0, tilt: 0, blink: false });
    const sh = S.rig.sh, hy = S.head.y;
    p.arms = [{ to: [-130, hy + 250], w: 12 }, { to: [130, hy + 250], w: 12 }];
    const f = figXf(WT, v, c.seat, c.fs, 'seat');
    x.save(); x.translate(f.x, f.y); x.scale(f.s, f.s); x.translate(-f.P[0], -f.P[1]);
    WT.draw(x, p, { only: 'base' });
    menuLens(x, 0, hy + 120, 330, { lens: 1, glint: o.glint ? o.glint(t) : 0, tilt: .03 });
    for (const sd of [-1, 1]) ell(x, sd * 130, hy + 250, 13, 13, S.colors.ink, null);
    x.restore();
  }, 1, .12);
  plate(ctx, a.revFar, v);                                           // его стол перед ним (та же резкость, что фон)
}

// ================= передний план: меню агента с объективом (размыто) =================
// (x, y) — экранные пиксели центра меню, w — ширина (экран), lens: куда смотрит объектив; glint 0..1
export function fgMenu(ctx, x, y, w, { lens = -1, glint = 0, blur = 7, tilt = -.1 } = {}) {
  soft(ctx, blur, c => { menuLens(c, x, y, w, { lens, glint, tilt });
    const hy = y + w * .55; c.fillStyle = '#18161c'; c.beginPath(); c.arc(x - w * .38, hy, w * .07, 0, Math.PI * 2); c.arc(x + w * .36, hy + w * .02, w * .07, 0, Math.PI * 2); c.fill(); }, 1, .2);
}
// агент в зале со спины на переднем плане (общий план): федора и плечи, меню поднято к лицу, объектив выглядывает влево.
// (x, y) — экранный центр головы, s — пикселей экрана на единицу фигуры; glint 0..1
export function fgSpy(ctx, x, y, s, { glint = 0, blur = 6 } = {}) {
  const S = WT.spec;
  soft(ctx, blur, c => {
    const p = act(0, [[0, 'neutral']]); Object.assign(p, { view: 'back', facing: 1, stance: 'stand', bob: 0, sq: 0, lean: -.04, tilt: .03, blink: false });
    p.arms = [{ to: [-200, S.head.y + 150], w: 12, layer: 'behind' }, { to: [150, S.head.y + 170], w: 12, layer: 'behind' }];
    c.save(); c.translate(x, y); c.scale(s, s); c.translate(-S.head.x, -S.head.y);
    menuLens(c, -175, S.head.y + 40, 380, { lens: -1, glint, tilt: -.12 });
    WT.draw(c, p);
    c.restore();
  }, 1, .3);
}
// официант на переднем плане (POV-гэг): проходит слева направо крупно и размыто; u 0..1 — путь
export function fgWaiter(ctx, u, { y = 1500, s = 1.25, blur = 9 } = {}) {
  const x = lerp(-420, W + 420, u), S = WA.spec;
  soft(ctx, blur, c => {
    const p = act(u * 2, [[0, 'neutral']]); Object.assign(p, { view: 'threeQuarter', facing: 1, stance: 'stand', bob: -6 * Math.abs(Math.sin(u * 18)), sq: 0, lean: .05, tilt: 0, blink: false });
    const sh = shoulder(S, -1); p.arms = [{ to: [sh[0] - 40, sh[1] - 200], w: 11 }, { to: restHand(S, 1), w: 11 }];
    c.save(); c.translate(x, y); c.scale(s, s); WA.draw(c, p); c.translate(sh[0] - 40, sh[1] - 212); c.restore();
    c.save(); c.translate(x + (sh[0] - 40) * s, y + (sh[1] - 212) * s); c.scale(s, s); trayAt(c); c.restore();
  }, 1, .28);
}
function trayAt(c) { c.beginPath(); c.ellipse(0, 0, 170, 22, 0, 0, Math.PI * 2); c.fillStyle = '#C9CBD2'; c.fill(); c.lineWidth = 7; c.strokeStyle = '#141014'; c.stroke();
  for (const gx of [-90, 0, 80]) { c.save(); c.translate(gx, -8); c.scale(.42, .42); wineGlassMini(c); c.restore(); } }
function wineGlassMini(c) { c.beginPath(); c.moveTo(-52, -196); c.bezierCurveTo(-74, -130, -64, -60, -8, -36); c.lineTo(8, -36); c.bezierCurveTo(64, -60, 74, -130, 52, -196); c.closePath(); c.fillStyle = 'rgba(200,225,240,.5)'; c.fill(); c.lineWidth = 9; c.strokeStyle = '#141014'; c.stroke(); c.beginPath(); c.moveTo(0, -36); c.lineTo(0, 10); c.stroke(); }

// ================= реквизит у Алисы (план 8): ящики и бирка VIP, папка заказа =================
export function crates(ctx, v, t, tA, tB, tTag) {   // ящики ставят на пол: короткий удар с отскоком, не падение с неба
  const drop = (t0, x, y, w, label) => { if (t < t0) return; const u = clamp((t - t0) / .18), b = u < 1 ? (1 - bounce(u)) * 90 : 0; const P = toS(v, [x, y - b]); greenCrate(ctx, P[0], P[1], w * v.k, { label, side: -1 }); };
  drop(tA, 1268, 1086, 230, null);                                       // два ящика на полу у её стула (ближе к камере, чем стол)
  drop(tB, 1508, 1086, 244, t >= tTag ? 'VIP CUSTOMER' : null);
}
export const FOLDER = { x0: 1362, x1: 1327, y: 846, w: 200 };
export function folderOnTable(ctx, v, u) { const P = toS(v, [lerp(FOLDER.x0, FOLDER.x1, E.inOutCubic(clamp(u))), FOLDER.y]); orderFolder(ctx, P[0], P[1], FOLDER.w * v.k, -.03); }
export { wineGlass };

// свеча справа внизу вне кадра крупного плана Дженсена — тёплое боке (как в пробе)
export const flameBokeh = ctx => bokeh(ctx, W + 60, H - 40, 520, .32);
// тост на обратной точке: бокал Дженсена входит слева (рука из-за кадра) навстречу бокалу Алисы; удар в tClink — искра и отскок
export function toastIn(ctx, v, t, tClink, r) {
  const g = .78 * r.s, ap = clamp((t - (tClink - .5)) / .5); if (ap <= 0) return;
  const rec = t < tClink ? 0 : E.outBack(clamp((t - tClink) / .3)), jit = t < tClink ? 0 : Math.sin((t - tClink) * 38) * Math.exp(-(t - tClink) * 9) * .03;
  const rimA = [r.hand[0] - 52 * g * Math.cos(.08), r.hand[1] + 4 * r.s - 196 * g];          // ближний край чаши Алисы
  const xJ = lerp(-200, rimA[0] - 52 * g - 2, E.inCubic(ap)) - 18 * r.s * rec, yJ = r.hand[1] + 4 * r.s - 6 * r.s * rec;
  const slosh = t < tClink ? 0 : Math.sin((t - tClink) * 14) * Math.exp(-(t - tClink) * 3.2) * .16;
  wineGlass(ctx, xJ, yJ, g, -.08 - jit, '#141014', undefined, slosh);
  // рука Дженсена из-за левого края: рукав его кожанки (читается, чья рука — продолжение тоста с прошлой точки), кисть-точка на ножке
  const s = r.s, ex = xJ - 150 * s, ey = yJ + 230 * s;
  ctx.save(); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-120, H + 120); ctx.lineTo(ex, ey); ctx.lineWidth = 70 * s; ctx.strokeStyle = '#141014'; ctx.stroke();
  ctx.lineWidth = 58 * s; ctx.strokeStyle = '#23202a'; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-100, H + 100); ctx.lineTo(ex + 10 * s, ey - 16 * s); ctx.lineWidth = 8 * s; ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(xJ, yJ + 4 * s); ctx.lineWidth = ARMW * s; ctx.strokeStyle = '#141014'; ctx.stroke();
  ctx.restore();
  ell(ctx, xJ, yJ + 4 * r.s, 12 * r.s, 12 * r.s, '#141014', null);
  const dc = t - tClink; if (dc > -.02 && dc < .55) clinkSpark(ctx, rimA[0] - 2, rimA[1] + 8 * r.s, 120 * r.s / .875 * .55, dc < .05 ? clamp((dc + .02) / .07) : Math.pow(1 - (dc - .05) / .5, 2), Math.max(0, dc));
}

// агент за дальним столиком (общий и крупные с этого плейта): федора, меню у лица, объектив смотрит влево — на нашу пару.
// Нижняя половина за его скатертью (маска farCloth); размытие — как у фона плана. glint(t) 0..1 — блик объектива.
export function farAgent(ctx, v, t, blur = 0, glint) {
  const a = A(), c = CFG.wide.far, S = WT.spec, [sx] = toS(v, c.seat); if (sx < -60 || sx > W + 60) return;
  const g = glint ? glint(t) : .15 + .1 * Math.max(0, Math.sin(t * 2.3));
  const draw = x => { const p = act(t, [[0, 'neutral']]); Object.assign(p, { view: 'front', stance: 'sitR', bob: 0, sq: 0, lean: 0, tilt: 0, blink: false });
    const hy = S.head.y; p.arms = [{ to: [-130, hy + 250], w: 12 }, { to: [130, hy + 250], w: 12 }];
    const f = figXf(WT, v, c.seat, c.fs, 'seat'); x.save(); x.translate(f.x, f.y); x.scale(f.s, f.s); x.translate(-f.P[0], -f.P[1]);
    WT.draw(x, p, { only: 'base' }); menuLens(x, 0, hy + 120, 330, { lens: -1, glint: g, tilt: -.03 }); for (const sd of [-1, 1]) ell(x, sd * 130, hy + 250, 13, 13, S.colors.ink, null); x.restore(); };
  if (blur > .3) soft(ctx, blur * v.k / 1.6, draw, 1, .05); else draw(ctx);
  plate(ctx, blur > 2.5 ? a.farClothB4 : a.farCloth, v);
}
