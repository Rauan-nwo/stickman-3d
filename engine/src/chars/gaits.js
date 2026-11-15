// gaits.js: походки и виды. Походка — чистая функция фазы (0..1 = полный цикл из двух шагов), которая возвращает позу
// в «системе тела» (вперёд / вбок / вверх), а rigPose() проецирует её на плоский рисунок для нужного вида:
//
//   import { gait } from 'engine/chars/gaits.js';
//   hero.draw(gait(hero.char, 'march', t * 1.9, { view: 'side', facing: 1 }));
//
// Виды: 'front' | 'threeQuarter' | 'side' | 'back'; facing: +1 — идёт/смотрит вправо, -1 — влево.
// Походки (GAITS):
//   stand      стоит, дышит                              walk       обычный шаг
//   march      строевой: колено высоко, нога бьёт вниз, руки прямые (opt.musket — ружьё на плече, левая рука под прикладом)
//   skip       вприпрыжку                                crab       боком, по-крабьи (тело развёрнуто поперёк движения)
//   backwards  задом наперёд, оглядываясь                tiptoe     на цыпочках, крадучись
//   kneesTogether  семенит, сжав колени («ищет туалет») stumble    идёт и спотыкается (один раз за цикл)
//   wobble     показная походка на ватных ногах          run        бег (opt.panic — руки вверх)
//   flail      барахтается в воздухе                     fall       падает звездой (маленькая фигурка вдали)
// Поза тела R: { legs:[{ f, s, up, knee, L }], arms:[{ f, out, down, bend, sag, L, hand } | null], bob, sway, pitch, roll,
//   tilt, nod, sq, hatDy, hatLag, face:{...} }; индекс 0 — правая конечность героя, 1 — левая. Единицы — как у стандартной
//   фигуры (умножаются на spec.u).
import { clamp, lerp, smooth, E } from '../core/ease.js';
import { musket2D } from './presetsArmy.js';

const TAU = Math.PI * 2, PI = Math.PI, fract = v => v - Math.floor(v), sin = Math.sin, cos = Math.cos;
export const VIEW_NAMES = ['front', 'threeQuarter', 'side', 'back'];
const PSI = { front: 0, threeQuarter: .7, side: 1.42, back: PI };            // поворот тела от «лицом к камере», рад
const PERSP = .1;                                                           // ближняя к камере ступня ниже на экране

export function rigOf(S) {
  const r = S.rig, u = S.u ?? 1, groundY = r.groundY ?? (S.pins && S.pins.feet ? S.pins.feet[1] : 0), cx = r.cx ?? (S.pins && S.pins.feet ? S.pins.feet[0] : S.body.x);
  return { u, cx, hipY: r.hipY, hipX: r.hipX ?? 38 * u, groundY, legL: r.legL ?? Math.abs(groundY - r.hipY) * 1.012, sh: r.sh, armL: r.armL, footL: r.footL ?? 30 * u, hand: S.hand.r, limbW: S.limbW };
}

// поза тела -> поза Stickman для вида
export function rigPose(S, R, { view = 'front', facing = 1 } = {}) {
  const g = rigOf(S), u = g.u, psi = (view === 'back' ? PI : PSI[view] * facing), sp = sin(psi), cp = cos(psi), flat = Math.abs(sp) < .3;
  const P = { view, facing, bob: -(R.bob || 0) * u, sq: R.sq || 0, lean: (R.pitch || 0) * sp + (R.roll || 0) * cp, dx: ((R.sway || 0) * cp + (R.surge || 0) * sp) * u,
    tilt: (R.tilt || 0) * cp + (R.nod || 0) * sp, hatDy: R.hatDy || 0, hatLag: R.hatLag || 0 };
  if (R.dy) P.dy = -R.dy * u;
  // ноги: дальняя рисуется первой
  const legs = [0, 1].map(i => {
    const L = R.legs[i], sd = i ? 1 : -1, hs = sd * g.hipX, f = (L.f || 0) * u, s = hs + sd * (L.s || 0) * u, up = (L.up || 0) * u;
    const depthHip = -hs * sp, a = [g.cx + hs * cp, g.hipY], c = f * cp - s * sp;
    const b = [g.cx + f * sp + s * cp, g.groundY - up + c * PERSP + (flat ? 0 : (depthHip > 0 ? 3 : -3) * u)];
    const out = Math.sign(a[0] - g.cx) || sd, kn = L.knee ?? 'fwd';
    const bend = flat ? (kn === 'in' ? out : -out) : -Math.sign(sp);        // колено: наружу (спереди/сзади) или вперёд (сбоку)
    // ступня: короткий толстый штрих; носок вперёд (сбоку) или наружу-вниз (спереди); на весу носок провисает
    const droop = clamp(up / (70 * u)), fl = g.footL, toe = [fl * (sp + out * cp * cp * .55 * (flat ? 1 : .4)), fl * (cp > 0 ? .42 * cp : .16 * cp) + fl * .55 * droop * (L.toe ?? 1)];
    return { depth: depthHip, limbs: [
      { layer: 'back', hip: true, a, b, L: (L.L ?? 1) * g.legL, bend: L.bend ?? bend, sag: L.sag ?? .5, min: 1.0 },
      { layer: 'back', pts: [b, [b[0] + toe[0], b[1] + toe[1]]], w: g.limbW * 1.25 },
    ] };
  }).sort((p, q) => p.depth - q.depth);
  P.legs = legs.flatMap(l => l.limbs);
  // руки
  P.hands = [];
  P.arms = [0, 1].map(i => {
    const A = R.arms && R.arms[i], sd = i ? 1 : -1, sh = g.sh[i], shx = g.cx + (sh[0] - g.cx) * cp * (flat ? 1 : 1), depth = -(sh[0] - g.cx) * sp;
    if (A === null) { P.hands.push(null); return null; }
    const f = ((A && A.f) || 0) * u, o = ((A && A.out) ?? -15) * u, dn = ((A && A.down) ?? 215) * u;
    const from = [shx - (flat ? 0 : sp * 8 * u), sh[1]], to = [from[0] + f * sp + sd * o * cp, from[1] + dn + (f * cp) * .06];
    // локоть: bend = +1 — наружу (спереди/сзади) или назад (сбоку), -1 — наоборот; при поднятой руке дуга зеркалится
    const flip = dn < -20 * u ? -1 : 1, base = flat ? -(Math.sign(shx - g.cx) || sd) * flip : Math.sign(sp) * flip;
    P.hands.push(to);
    return { from, to, L: (A && A.L ? A.L : 1) * g.armL, bend: ((A && A.bend) ?? 1) * base, sag: A && A.sag,
      hand: A && A.hand != null ? A.hand : g.hand, layer: flat ? (view === 'back' ? 'mid' : S.rig.armLayer || 'front') : depth > 0 ? 'front' : 'behind' };
  });
  P.psi = psi;
  return P;
}

// один шаг ноги: q — фаза ноги; опора (доля duty) — ступня едет назад по земле, перенос — летит вперёд по дуге
const stepCycle = (q, duty = .5) => { q = fract(q); if (q < duty) return { k: 1 - 2 * q / duty, up: 0, s: -1 }; const s = (q - duty) / (1 - duty); return { k: -1 + 2 * smooth(s), up: sin(PI * s), s }; };
const REST = { f: 0, out: -15, down: 215 };

export const GAITS = {
  stand(ph) { const b = sin(ph * TAU); return { legs: [{}, {}], arms: [REST, REST], bob: 2 + 2 * b }; },
  walk(ph, o = {}) {
    const S = o.stride ?? 150, H = o.lift ?? 55, c = [stepCycle(ph, .56), stepCycle(ph + .5, .56)];
    return { legs: c.map(q => ({ f: q.k * S / 2, up: q.up * H })), arms: [{ f: -c[0].k * 70, out: -8, down: 208 }, { f: -c[1].k * 70, out: -8, down: 208 }],
      bob: 9 * sin(ph * TAU * 2 - PI / 2) * .5 + 4, roll: .025 * sin(ph * TAU), pitch: .05, tilt: -.02 * sin(ph * TAU) };
  },
  // строевой шаг: колено высоко, пауза наверху, удар вниз; корпус и голова неподвижны, руки прямые
  march(ph, o = {}) {
    const S = o.stride ?? 120, H = o.lift ?? 165, leg = q => { q = fract(q); if (q < .5) return { f: (1 - 4 * q) * S / 2, up: 0 };
      const s = (q - .5) * 2, up = E.outCubic(clamp(s / .4)) * (1 - E.inCubic(clamp((s - .74) / .26))); return { f: lerp(-S / 2, S / 2, smooth(clamp(s / .8))), up: up * H, toe: .25 }; };
    const hit = fract(ph * 2), sw = cos(ph * TAU) * 118, arm = f => ({ f, out: -4, down: Math.sqrt(Math.max(0, 242 * 242 - f * f)), sag: 0 });
    const R = { legs: [leg(ph), leg(ph + .5)], arms: [arm(-sw), arm(sw)], bob: 4 - 11 * Math.exp(-hit * 7), hatDy: 5 * Math.exp(-hit * 9) };
    if (o.musket) { R.arms[1] = { f: 34, out: 28, down: 172, sag: .9 }; R.musket = true; }
    return R;
  },
  // вприпрыжку: два подскока за цикл, колено вверх, руки машут широко
  skip(ph) {
    const hop = Math.pow(Math.abs(sin(ph * TAU)), .8), c = [stepCycle(ph + .12, .42), stepCycle(ph + .62, .42)], a = sin(ph * TAU);
    return { legs: c.map(q => ({ f: q.k * 55 + 20, up: q.up * 150 + hop * 28 })), arms: [{ f: -a * 190, out: 30, down: 150 - 60 * Math.abs(a) }, { f: a * 190, out: 30, down: 150 - 60 * Math.abs(a) }],
      bob: 16 + 58 * hop, roll: .07 * a, tilt: .09 * a, pitch: .04, hatDy: -14 * hop, face: { mouth: 'smileS', eyes: 'closed' } };
  },
  // боком по-крабьи: ведущая нога шагает в сторону, вторая приставляется; присед, руки «клешнями»
  crab(ph) {
    const w = q => smooth(1 - Math.abs(fract(q) * 2 - 1)), lift = q => Math.max(0, sin(fract(q) * TAU)) * 46, a = sin(ph * TAU);
    return { legs: [{ s: 22 + 105 * w(ph + .5), up: lift(ph + .75), knee: 'out' }, { s: 22 + 105 * w(ph), up: lift(ph + .25), knee: 'out' }],
      arms: [{ out: 140, down: -104 + 26 * a }, { out: 140, down: -104 - 26 * a }], bob: -34 + 10 * Math.abs(a), sway: 14 * a, roll: .05 * a, tilt: -.06 * a,
      face: { eyes: 'dot', mouth: 'flatS', look: [.8, 0] } };
  },
  // задом наперёд: шаг назад, корпус откинут, руки в стороны для равновесия
  backwards(ph) {
    const c = [stepCycle(1 - ph, .56), stepCycle(1.5 - ph, .56)], a = sin(ph * TAU);
    return { legs: c.map(q => ({ f: q.k * 55, up: q.up * 66 })), arms: [{ f: -20, out: 96 + 22 * a, down: 138 }, { f: -20, out: 96 - 22 * a, down: 138 }],
      bob: 4 + 6 * Math.abs(a), pitch: -.1, roll: .05 * a, tilt: .05 * a, face: { mouth: 'o', look: [.9 * (a > 0 ? 1 : -1), .2] } };
  },
  // на цыпочках: вытянулся вверх, шажки мелкие и высокие, кисти перед грудью
  tiptoe(ph) {
    const c = [stepCycle(ph * 2, .5), stepCycle(ph * 2 + .5, .5)], a = sin(ph * TAU * 2);
    return { legs: c.map(q => ({ f: q.k * 34 + 10, up: q.up * 96 + 6, toe: 1.6 })), arms: [{ f: 78, out: -22, down: 66 + 14 * a }, { f: 78, out: -22, down: 66 - 14 * a }],
      bob: 30 + 8 * Math.abs(a), pitch: .14, nod: .06, face: { mouth: 'flatS', eyes: 'dot', look: [.7, 0] } };
  },
  // семенит, сжав колени: ступни врозь, колени внутрь, руки прижаты к животу, корпус ходит ходуном
  kneesTogether(ph) {
    const c = [stepCycle(ph * 2, .55), stepCycle(ph * 2 + .5, .55)], a = sin(ph * TAU * 2);
    return { legs: c.map(q => ({ f: q.k * 22 + 4, s: 46, up: q.up * 30, knee: 'in', L: 1.1 })), arms: [{ f: 34, out: -72, down: 196 }, { f: 34, out: -72, down: 204 }],
      bob: -30 + 6 * Math.abs(a), roll: .06 * a, sway: 10 * a, pitch: .12, tilt: -.05 * a, sq: .03, face: { mouth: 'wavy', eyes: 'dot', brows: [8, .6], sweat: .9 } };
  },
  // идёт и спотыкается: на 0.52–0.86 цикла летит носом вперёд, руки мельницей
  stumble(ph) {
    const w = GAITS.walk(ph), k = smooth(clamp((fract(ph) - .5) / .12)) * (1 - smooth(clamp((fract(ph) - .78) / .16))), a = fract(ph) * TAU * 3;
    w.pitch = .05 + .5 * k; w.bob = w.bob - 26 * k; w.surge = 30 * k;
    w.arms = w.arms.map((A, i) => ({ f: lerp(A.f, 150 + 60 * sin(a + i * PI), k), out: lerp(A.out, 60, k), down: lerp(A.down, -40 + 130 * cos(a + i * PI), k) }));
    w.legs[0].up = Math.max(w.legs[0].up, 120 * k); w.legs[0].f = lerp(w.legs[0].f, -150, k);
    w.hatDy = -22 * k; w.face = k > .2 ? { eyes: 'wide', mouth: 'O' } : {};
    return w;
  },
  // показная походка «на ватных ногах»: колени гуляют, корпус заваливается, руки болтаются с опозданием
  wobble(ph) {
    const c = [stepCycle(ph, .6), stepCycle(ph + .5, .6)], a = sin(ph * TAU), b = sin(ph * TAU * 2);
    return { legs: c.map((q, i) => ({ f: q.k * 62, s: 26 + 34 * sin(ph * TAU + i * PI), up: q.up * 88, L: 1.14, sag: .9, knee: sin(ph * TAU * 2 + i * 2) > 0 ? 'in' : 'out' })),
      arms: [{ f: 96 * sin(ph * TAU - 1), out: 46 + 40 * b, down: 170, L: 1.08, sag: .9 }, { f: -96 * sin(ph * TAU - 1), out: 46 - 40 * b, down: 170, L: 1.08, sag: .9 }],
      bob: -12 + 14 * b, roll: .15 * a, sway: 34 * a, tilt: -.14 * a, pitch: .05 * b, hatLag: .5 * a };
  },
  // бег: фаза полёта, корпус вперёд, локти работают; panic — руки над головой
  run(ph, o = {}) {
    const c = [stepCycle(ph, .36), stepCycle(ph + .5, .36)], hop = Math.abs(sin(ph * TAU)), a = sin(ph * TAU);
    const arms = o.panic ? [{ out: 96 + 36 * a, down: -272 - 30 * a, f: 20, L: 1.1 }, { out: 96 - 36 * a, down: -272 + 30 * a, f: 20, L: 1.1 }]
      : [{ f: -a * 150, out: 26, down: 96 + 40 * a }, { f: a * 150, out: 26, down: 96 - 40 * a }];
    return { legs: c.map(q => ({ f: q.k * 108, up: q.up * 170 + hop * 26, L: 1.12, sag: .8 })), arms, bob: 8 + 44 * hop, pitch: o.panic ? .08 : .2, roll: .05 * a, tilt: .04 * a, hatDy: -16 * hop,
      face: o.panic ? { eyes: 'wideS', mouth: 'O', brows: [22, .3] } : {} };
  },
  // в воздухе: руки и ноги машут вразнобой (поворот всей фигуры — pose.rot, его задаёт фильм или толпа)
  flail(ph) {
    const t = ph * TAU;
    return { legs: [0, 1].map(i => ({ f: 90 * sin(t + i * PI), s: 46 + 44 * sin(t * 2 + i * 1.7), up: 70 + 60 * sin(t + i * 2.4 + 1), L: 1.0, sag: .55 })),
      arms: [0, 1].map(i => ({ out: 196 + 40 * cos(t * 2 + i * 2), down: -120 + 150 * sin(t + i * PI + .6), f: 60 * cos(t + i), L: 1.12 })),
      bob: 0, roll: .1 * sin(t), tilt: .1 * sin(t * 2), hatDy: -30 + 12 * sin(t * 2), face: { eyes: 'wideS', mouth: 'O', brows: [24, .3] } };
  },
  // падает звездой (читается и при 10 px высоты)
  fall(ph) {
    const t = ph * TAU;
    return { legs: [0, 1].map(i => ({ s: 120 + 20 * sin(t + i * PI), up: 70 + 30 * sin(t * 2 + i), L: 1.0, knee: 'out' })),
      arms: [0, 1].map(i => ({ out: 200 + 20 * sin(t + i), down: -150 + 40 * sin(t * 2 + i * PI), L: 1.05 })), bob: 0, hatDy: -46, face: { eyes: 'wideS', mouth: 'O' } };
  },
};
export const GAIT_NAMES = Object.keys(GAITS);
export const SHUFFLES = ['skip', 'crab', 'backwards', 'tiptoe', 'kneesTogether', 'stumble'];
// походки, у которых тело развёрнуто не по ходу движения: поправка к курсу для выбора вида (crowd.js)
export const GAIT_YAW = { crab: Math.PI / 2, backwards: Math.PI };

// поза Stickman для походки. opt: view, facing, musket, panic, face (false — не трогать лицо), over — правки поверх
export function gait(char, name, phase, opt = {}) {
  const S = char.spec || char, R = (GAITS[name] || GAITS.walk)(phase, opt), P = rigPose(S, R, opt);
  if (R.face && opt.face !== false) Object.assign(P, R.face);
  if (R.musket) {                                                            // ружьё на левом плече: приклад в кисти, ствол вверх
    const h = P.hands[1], sp = Math.sin(P.psi), cp = Math.cos(P.psi), u = S.u ?? 1;
    if (h) { const a = [h[0] + 4 * cp * u, h[1] + 26 * u], ang = -PI / 2 + .07 * cp - .14 * sp;
      P.held = [{ layer: Math.abs(sp) < .3 ? 'behind' : sp > 0 ? 'behind' : 'mid', draw: x => musket2D(x, a, ang, 640 * u, S.colors.ink) }]; }
  }
  return opt.over ? { ...P, ...opt.over } : P;
}
