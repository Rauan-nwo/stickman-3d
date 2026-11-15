// actions.js: лица и действия состава V002. Каждое действие — чистая функция (герой, время в секундах, параметры) -> поза
// Stickman; лицо — таблица FACE. Действия строятся на «системе тела» gaits.js, поэтому работают в любом виде:
//   hero.draw(ACT.throwDrum(hero.char, t - t0, { view: 'threeQuarter', facing: 1 }))
//
// Лица (FACE): calm, smirk, glance, order, yanked, annoyed, stone, smile, grin, whistle, scared, terrified, fury, furyPurple,
//   jawDrop, laughCry, worried, confused, question, delight, wow.  face('fury', { ...правки })
// Действия (ACT), у всех opt: { view, facing }:
//   throwDrum(t, { drum })      две руки над головой держат барабан -> бросок на 0.23 с -> с 1.0 с отряхивает руки
//   dustHands(t)                только отряхивание
//   yanked(t, { dir })          схватили за воротник и дёрнули в сторону dir (+1 вправо): корпус летит, голова и кивер отстают
//   grab(t, { dir, reach, rage }) рука хватает (вылетает на reach единиц) и тянет к себе; rage 0..1 — от красного к багровому
//   pointDown(t, { dir })       тычет пальцем вниз и кричит
//   raiseHand(t, { side })      рука вверх с вопросом
//   order(t)                    капитан с поднятой рукой
//   spyglass(t)                 подзорная труба к глазу (выдвигается за 0.3 с)
//   laughCry(t)                 хохот со слезами: подпрыгивает, хлопает себя по колену, слёзы фонтаном
//   whistle(t, { gait, phase }) свистит (губы трубочкой, ноты); поверх походки или стоя
//   bounce(t, { period, amp, hold }) подпрыгивает на пружинящем настиле: ступни отрываются, шляпа отстаёт; hold — держит шляпу
//   holdHat(t)                  держит шляпу рукой, пот
//   jawDrop(t)                  челюсть отвисает
//   confused(t), scared(t), smileAt(t, { dir })
//   drumming(t, { phase, bpm }) барабанщик: строевой шаг + барабан на ремне + палочки в такт
//   swing(ang, { shoes })       ребёнок на качелях: ang — угол качелей (рад, + вперёд); руки на верёвках, корпус и ноги следуют
// Вспомогательное: blinkUnison(t) — весь ряд моргает разом; beatAt(phase) — удары палочек; withFace(pose, name).
import { clamp, lerp, seg, smooth, E, spring, keys } from '../core/ease.js';
import { hash } from '../core/rng.js';
import { EMO, talkMouth } from './stickman.js';
import { rigPose, rigOf, GAITS, gait } from './gaits.js';
import { drum2D, stick2D, spyglass2D, note2D } from './presetsArmy.js';

const TAU = Math.PI * 2, PI = Math.PI, sin = Math.sin, cos = Math.cos, fract = v => v - Math.floor(v);

export const FACE = {
  calm: { eyes: 'lid', mouth: 'smirkS' },
  smirk: { eyes: 'lid', mouth: 'smirk', browR: [14, 0], stache: 8 },
  glance: { eyes: 'lid', mouth: 'smirkS', look: [1, .1], lid: [0, 1.5] },
  order: { eyes: 'lid', mouth: 'open' },
  yanked: { eyes: 'wide', mouth: 'O', brows: [20, .2] },
  annoyed: { eyes: 'lid', mouth: 'flatS', lid: [1.5, -1.5] },
  stone: { eyes: 'dot', mouth: 'flatS' },
  smile: { eyes: 'dot', mouth: 'smileS' },
  grin: { eyes: 'closed', mouth: 'grin', blush: .5 },
  whistle: { eyes: 'closed', mouth: 'whistle', brows: [10, 0] },
  scared: { eyes: 'wideS', mouth: 'wavy', brows: [20, .5], sweat: 1 },
  terrified: { eyes: 'wideS', mouth: 'teethOpen', brows: [26, .5], sweat: 1, stache: -8 },
  fury: { eyes: 'dot', mouth: 'roar', brows: [-8, -.95], stache: 12, flush: { color: '#E8503C', k: .62 } },
  furyPurple: { eyes: 'dot', mouth: 'roar', brows: [-8, -.95], stache: 12, flush: { color: '#9A46B4', k: .78 } },
  jawDrop: { eyes: 'wide', mouth: 'jawDrop', brows: [26, .2], stache: -10 },
  laughCry: { eyes: 'shut', mouth: 'laughBig', tears: 1, blush: .9, brows: [14, .25], stache: 14 },
  worried: { eyes: 'dot', mouth: 'wavy', brows: [10, .6], sweat: 1, stache: -6 },
  confused: { eyes: 'dot', mouth: 'o', brows: [12, .3] },
  question: { eyes: 'dot', mouth: 'o', brows: [18, .1] },
  delight: { eyes: 'closed', mouth: 'laughBig', blush: .8 },
  wow: { eyes: 'wide', mouth: 'laugh', blush: .6 },
};
export const FACES = Object.keys(FACE);
export const face = (name, over = {}) => ({ ...(FACE[name] || FACE.stone), ...over });
export const withFace = (pose, name, over) => Object.assign(pose, face(name, over));
// таблицу EMO движка дополняем армейскими лицами, чтобы act(t, [[t, 'fury'], ...]) понимал их имена
for (const k of FACES) if (!EMO[k]) EMO[k] = { ...FACE[k], body: () => ({ hL: [-15, 215], hR: [-15, 215], bL: 1, bR: 1 }) };

// весь ряд моргает разом: раз в period секунд, длится dur
export const blinkUnison = (t, { period = 1.4, dur = .13, at = .5 } = {}) => { const q = ((t - at) % period + period) % period; return q < dur; };
// палочка барабанщика: 0 — лежит на коже (удар), 1 — занесена. Удары приходятся на целые значения фазы.
export const beatAt = ph => { const q = fract(ph); return q < .78 ? E.outCubic(q / .78) : 1 - E.inCubic((q - .78) / .22); };

const V = o => ({ view: o.view || 'front', facing: o.facing ?? 1 });
const STAND = [{}, {}], REST = { f: 0, out: -15, down: 215 }, HIP = { f: 0, out: 10, down: 150 };
const mix = (a, b, k) => ({ f: lerp(a.f || 0, b.f || 0, k), out: lerp(a.out ?? -15, b.out ?? -15, k), down: lerp(a.down ?? 215, b.down ?? 215, k), L: lerp(a.L || 1, b.L || 1, k), hand: b.hand, sag: b.sag, bend: b.bend });
// рот речи/смеха: меняется каждые 3–4 кадра
const flap = (t, set, seed = 0) => talkMouth(t, set, seed).mouth;

export const ACT = {
  // ---------- бросок барабана: 0–0.23 замах над головой, 0.23 — бросок, 0.4–1.0 — выпрямляется, с 1.0 — отряхивает руки ----------
  throwDrum(ch, t, o = {}) {
    const S = ch.spec, u = S.u ?? 1, T = .23;
    const f = keys([[0, -50], [.2, -96, E.inOutSine], [.36, 250, E.outCubic], [.7, 190], [1.0, 118]], t);
    const dn = keys([[0, -326], [.2, -344, E.inOutSine], [.36, -10, E.outCubic], [.7, 70], [1.0, 108]], t);
    const out = keys([[0, 26], [.36, 6], [1.0, -58]], t);
    const dust = t > 1.0 ? sin((t - 1.0) * TAU * 3.2) : 0, dk = smooth(seg(t, 1.0, 1.12)) * (1 - smooth(seg(t, 2.0, 2.3)));
    const R = { legs: [{ s: 14 }, { s: 14, up: 30 * Math.sin(PI * seg(t, .2, .5)), f: 30 * seg(t, .2, .5) * (1 - seg(t, .7, 1)) }],
      arms: [{ f, out, down: dn + 36 * dust * dk, L: 1.16 }, { f, out, down: dn - 36 * dust * dk, L: 1.16 }],
      pitch: keys([[0, -.14], [.2, -.24, E.inOutSine], [.36, .32, E.outCubic], [.7, .12], [1.0, 0]], t), sq: keys([[0, -.03], [.2, -.06], [.3, .07], [.6, 0]], t),
      bob: keys([[0, 8], [.2, 14], [.34, -18], [.8, 0]], t), hatLag: spring(t, T, 5, 16) * 1.4, tilt: 0 };
    const P = rigPose(S, R, V(o));
    Object.assign(P, t < .2 ? face('calm') : t < .5 ? { eyes: 'lid', mouth: 'o' } : t < 1.0 ? face('calm') : face('smirk'));
    if (t < T + .02 && o.drum !== false && P.hands[0] && P.hands[1]) {
      const h0 = P.hands[0], h1 = P.hands[1], mx = (h0[0] + h1[0]) / 2, my = (h0[1] + h1[1]) / 2, sp = Math.sin(P.psi);
      P.held = [{ layer: 'mid', draw: x => drum2D(x, { x: mx + sp * 10 * u, y: my - 58 * u, s: .92 * u, rot: P.lean * 1.3 + (o.view === 'side' ? .0 : 0), tilt: .25, ...(o.drumStyle || {}) }) }];
    }
    return P;
  },
  dustHands(ch, t, o = {}) { return ACT.throwDrum(ch, 1.12 + t, o); },

  // ---------- схватили за воротник и дёрнули: dir — в какую сторону экрана тянут ----------
  yanked(ch, t, o = {}) {
    const S = ch.spec, dir = o.dir ?? 1, k = E.outBack(seg(t, 0, .16), 2.4), late = smooth(seg(t, .12, .5)), sh = sin(t * 46) * Math.exp(-t * 2.2) * (t > 0 ? 1 : 0);
    const R = { legs: [{ s: 10, up: dir > 0 ? 54 * k : 6 * k }, { s: 10, up: dir > 0 ? 6 * k : 54 * k }],
      arms: [{ out: lerp(-15, 120, k) + 20 * sh, down: lerp(215, 120, k) }, { out: lerp(-15, 120, k) - 20 * sh, down: lerp(215, 150, k) }],
      sway: dir * (92 * k + 8 * sh), roll: dir * .2 * k, bob: 30 * k + 5 * sh, tilt: -dir * .3 * k * (1 - .55 * late) };
    const P = rigPose(S, R, V(o));
    P.headDx = -dir * 26 * k * (1 - late); P.hatDx = -dir * 44 * k * (1 - .35 * late); P.hatRot = -dir * .34 * k * (1 - .3 * late); P.hatDy = -8 * k;
    Object.assign(P, t < .55 ? face('yanked') : face('annoyed'));
    const b = S.body; P.collar = [b.x + dir * b.rx * .55 + P.dx, b.y - b.ry * .78 + P.bob];        // точка воротника для руки полковника
    return P;
  },
  // ---------- рука хватает: вылет на reach, затем тянет к себе; вторая рука — кулак ----------
  grab(ch, t, o = {}) {
    const S = ch.spec, dir = o.dir ?? 1, reach = o.reach ?? 330, i = dir > 0 ? 1 : 0;
    const ext = E.outBack(seg(t, 0, .1), 2.2) * (1 - .42 * smooth(seg(t, .12, .32))), sh = sin(t * 46) * Math.exp(-t * 2.4), rage = clamp(o.rage ?? seg(t, .1, 1.2));
    const arms = [0, 1].map(j => j === i ? { out: lerp(40, reach, ext) + 10 * sh, down: lerp(160, -24, clamp(ext * 1.4)), L: 1.0, hand: S.hand.r * 1.35 } : { out: 46, down: 168 + 8 * sh, hand: S.hand.r * 1.15 });
    const R = { legs: STAND, arms, roll: dir * (.05 + .1 * ext), sway: dir * 24 * ext, bob: 6 * ext, tilt: dir * .06 };
    const P = rigPose(S, R, V(o));
    Object.assign(P, face('fury'), { flush: { color: lerpColor('#E8503C', '#9A46B4', rage), k: lerp(.45, .8, rage) }, mouth: flap(t, ['roar', 'teethOpen', 'roar', 'teeth'], 5) });
    P.grip = P.hands[i];
    return P;
  },
  // ---------- тычет пальцем вниз (в ущелье) и кричит ----------
  pointDown(ch, t, o = {}) {
    const S = ch.spec, u = S.u ?? 1, dir = o.dir ?? 1, i = dir > 0 ? 1 : 0, jab = Math.abs(sin(t * TAU * 2.6)), rage = clamp(o.rage ?? .6);
    const arms = [0, 1].map(j => j === i ? { out: 150 + 22 * jab, down: 150 + 46 * jab, L: 1.05, sag: .25 } : HIP);
    const R = { legs: STAND, arms, roll: dir * (.1 + .04 * jab), bob: -4 * jab, tilt: dir * .08, sway: dir * 10 };
    const P = rigPose(S, R, V(o)), h = P.hands[i], a = P.arms[i];
    if (h && a) { const dx = h[0] - a.from[0], dy = h[1] - a.from[1], l = Math.hypot(dx, dy) || 1;                     // указательный палец
      P.held = [{ layer: 'front', draw: x => { x.lineCap = 'round'; x.lineWidth = 15 * u; x.strokeStyle = S.hand.fill; x.beginPath(); x.moveTo(h[0], h[1]); x.lineTo(h[0] + dx / l * 44 * u, h[1] + dy / l * 44 * u); x.stroke(); } }]; }
    Object.assign(P, face('fury'), { flush: { color: lerpColor('#E8503C', '#9A46B4', rage), k: lerp(.45, .8, rage) }, mouth: flap(t, ['roar', 'teethOpen', 'roar', 'teeth'], 9) });
    return P;
  },
  // ---------- рука вверх с вопросом ----------
  raiseHand(ch, t, o = {}) {
    const i = (o.side ?? 1) > 0 ? 1 : 0, k = E.outBack(seg(t, 0, .25)), w = sin(t * 9) * 14;
    const R = { legs: STAND, arms: [0, 1].map(j => j === i ? { out: lerp(-15, 36, k) + w, down: lerp(215, -296, k), L: 1.1 } : REST), bob: 6 * k + 3 * sin(t * 9), tilt: (i ? 1 : -1) * .06 * k, roll: (i ? -1 : 1) * .03 * k };
    return Object.assign(rigPose(ch.spec, R, V(o)), face('question'));
  },
  // ---------- капитан командует: рука поднята ----------
  order(ch, t, o = {}) {
    const k = E.outBack(seg(t, 0, .22)), w = sin(t * 5) * 8;
    const R = { legs: STAND, arms: [HIP, { out: lerp(-15, 110, k) + w, down: lerp(215, -236, k), L: 1.08 }], bob: 4 * k, roll: -.03 * k, tilt: .04 };
    return Object.assign(rigPose(ch.spec, R, V(o)), face('order'), { mouth: o.talk === false ? 'smirkS' : flap(t, ['open', 'O', 'smile', 'flat'], 3) });
  },
  // ---------- подзорная труба к глазу; труба выдвигается ----------
  spyglass(ch, t, o = {}) {
    const S = ch.spec, u = S.u ?? 1, vw = { view: o.view || 'side', facing: o.facing ?? 1 }, fc = vw.facing, k = E.outCubic(seg(t, 0, .3)), h = S.head;
    const side = vw.view === 'side', aim = (o.aim ?? .1), ang = fc > 0 ? aim : PI - aim, len = (side ? 330 : 240) * u * (.45 + .55 * k) * (o.len ?? 1);
    const eye = [h.x + fc * h.rx * (side ? .58 : .42), h.y - h.ry * .26];
    const g = rigOf(S), sh = g.sh[1][1];                                                    // руки тянутся к трубе
    const R = { legs: [{ s: 10 }, { s: 10, f: 20 }], arms: [{ f: lerp(0, 230, k), out: -20, down: lerp(215, eye[1] - sh + 40 * u, k) / u, L: 1.1 }, { f: lerp(0, 120, k), out: -20, down: lerp(215, eye[1] - sh + 26 * u, k) / u, L: 1.05 }],
      pitch: .1 * k, bob: 2 * sin(t * 3), nod: .04 * k };
    const P = rigPose(S, R, vw);
    P.held = [{ layer: 'front', draw: x => { if (k > .05) spyglass2D(x, { x: eye[0], y: eye[1], ang: ang + P.lean * .6, len, ink: S.colors.ink }); } }];
    return Object.assign(P, { eyes: 'closed', mouth: 'smirk', stache: 8, brows: [6, 0] });
  },
  // ---------- хохот со слезами: подпрыгивает, хлопает по колену ----------
  laughCry(ch, t, o = {}) {
    const c = Math.abs(sin(t * TAU * 2.6)), slap = Math.abs(sin(t * TAU * 1.3)), sl = Math.pow(slap, 3);
    const R = { legs: [{ up: 120, f: 70, s: 6, L: 1.04 }, { s: 12 }], arms: [{ f: 70, out: -6, down: 250 - 120 * (1 - sl), L: 1.05 }, { f: 40, out: -60, down: 190 }],
      bob: 26 * c, sq: .07 * (1 - c) - .03, tilt: -.14 + .06 * sin(t * TAU * 2.6), pitch: -.1 + .22 * sl, roll: -.04, hatLag: sin(t * TAU * 2.6) * .8 };
    const P = rigPose(ch.spec, R, V(o));
    return Object.assign(P, face('laughCry'), { t, mouth: flap(t, ['laugh', 'laughBig', 'laugh', 'laughBig', 'open'], 5), tears: clamp(o.tears ?? 1) });
  },
  // ---------- свист: поверх походки (opt.gait + opt.phase) или стоя ----------
  whistle(ch, t, o = {}) {
    const S = ch.spec, u = S.u ?? 1, P = o.gait ? gait(ch, o.gait, o.phase ?? t, { ...o, face: false }) : rigPose(S, { legs: STAND, arms: [REST, REST], bob: 4 * Math.abs(sin(t * TAU)), roll: .04 * sin(t * TAU) }, V(o));
    Object.assign(P, face('whistle'), { tilt: (P.tilt || 0) + .07 * sin(t * TAU) });
    if (o.notes !== false) { const h = S.head, fc = (o.view && o.view !== 'front' && o.view !== 'back') ? (o.facing ?? 1) : 1;
      P.held = [...(P.held || []), { layer: 'front', draw: x => { for (let j = 0; j < 2; j++) { const q = fract(t * .9 + j * .5), a = Math.min(1, q * 5) * (1 - q);
        x.globalAlpha = clamp(a * 2.2); note2D(x, h.x + fc * (h.rx * (.7 + .9 * q)) + 14 * sin(q * 9 + j) * u, h.y + h.ry * .3 - 190 * q * u, (.8 + .3 * q) * u, S.colors.ink); x.globalAlpha = 1; } } }]; }
    return P;
  },
  // ---------- на пружинящем настиле: period — время одного подскока, amp — высота (ед. фигуры), hold — держит шляпу ----------
  // возвращает позу; высота подскока в pose.air (ед. фигуры) и уже учтена в pose.dy, если opt.lift !== false
  bounce(ch, t, o = {}) {
    const S = ch.spec, u = S.u ?? 1, period = o.period ?? .5, amp = o.amp ?? 120, g = .28;                                   // g — доля периода на настиле
    const hAt = tt => { const q = fract(tt / period); return q < g ? 0 : 4 * ((q - g) / (1 - g)) * (1 - (q - g) / (1 - g)); };
    const q = fract(t / period), h = hAt(t), hl = hAt(t - .07), crouch = q < g ? sin(PI * q / g) : 0, v = hAt(t + .01) - hAt(t - .01);
    const armUp = clamp(hl * 1.1), a = clamp(amp / 160);
    const arms = [{ out: lerp(-15, 150, armUp * a), down: lerp(215, 40 - 150 * a, armUp) }, { out: lerp(-15, 150, armUp * a), down: lerp(215, 60 - 150 * a, armUp) }];
    if (o.hold) arms[0] = holdArm(S);
    const R = { legs: [{ s: 8 + 26 * h * a, up: 18 * h, toe: 1.8, L: 1 + .07 * h }, { s: 8 + 26 * h * a, up: 30 * h, toe: 1.8, L: 1 + .07 * h }], arms,
      bob: -30 * crouch * a, sq: .09 * crouch * a - .05 * clamp(v * 30) * a, hatDy: o.hold ? 0 : -(hl - h) * amp * .55 - 26 * h * a, hatLag: (hl - h) * 2 };
    const P = rigPose(S, R, V(o)); P.air = h * amp; if (o.lift !== false) P.dy = (P.dy || 0) - h * amp * u;
    return o.face ? Object.assign(P, face(o.face)) : P;
  },
  // ---------- держит шляпу рукой, потеет ----------
  holdHat(ch, t, o = {}) {
    const S = ch.spec, sh = sin(t * 34) * 4;
    const R = { legs: [{ s: 26 }, { s: 26 }], arms: [holdArm(S), { out: 150 + 20 * sin(t * 7), down: 60 + 30 * sin(t * 9) }], bob: -8, sway: sh, roll: .04 * sin(t * 6), sq: .03 };
    return Object.assign(rigPose(S, R, V(o)), face(o.face || 'worried'), { t });
  },
  // ---------- челюсть отвисла ----------
  jawDrop(ch, t, o = {}) {
    const k = E.outBack(seg(t, 0, .18));
    const R = { legs: STAND, arms: [{ out: -4, down: 222 }, { out: -4, down: 222 }], pitch: -.05 * k, bob: 5 * k, hatDy: -40 * spring(t, 0, 5, 18) - 6 * k };
    return Object.assign(rigPose(ch.spec, R, V(o)), face('jawDrop'), { mouthDy: -14 * (1 - k) });
  },
  confused(ch, t, o = {}) {
    const a = sin(t * TAU * .8 + (o.seed || 0));
    return Object.assign(rigPose(ch.spec, { legs: STAND, arms: [REST, REST], bob: 2 + 2 * sin(t * 3), tilt: .06 * a }, V(o)), face('confused'), { turn: .16 * a, look: [a, 0] });
  },
  scared(ch, t, o = {}) {
    const sh = sin(t * 40) * 5;
    return Object.assign(rigPose(ch.spec, { legs: [{ s: 4, knee: 'in', L: 1.06 }, { s: 4, knee: 'in', L: 1.06 }], arms: [{ out: 60, down: -150 + sh, L: 1.05 }, { out: 60, down: -150 - sh, L: 1.05 }], bob: -18, sway: sh, sq: .04 }, V(o)), face(o.face || 'scared'), { t, hatDy: -18 });
  },
  // переглядывается с соседом и улыбается
  smileAt(ch, t, o = {}) {
    const dir = o.dir ?? 1, k = smooth(seg(t, 0, .25));
    return Object.assign(rigPose(ch.spec, { legs: STAND, arms: [REST, REST], bob: 5 * Math.abs(sin(t * TAU * 1.2)), tilt: dir * .08 * k }, V(o)), face('smile'), { turn: dir * .2 * k, look: [dir, 0] });
  },
  // ---------- барабанщик: строевой шаг + барабан + палочки. phase — фаза марша (удары на каждый шаг и между шагами) ----------
  drumming(ch, t, o = {}) {
    const S = ch.spec, u = S.u ?? 1, vw = V(o), ph = o.phase ?? t * 1.9, b = S.body;
    const hitL = beatAt(ph * 2), hitR = beatAt(ph * 2 + .5), R = (o.gait === false ? { legs: STAND, bob: 0 } : GAITS.march(ph));
    R.arms = [{ f: 96, out: -34, down: 64 - 54 * hitR, sag: .7 }, { f: 96, out: -34, down: 64 - 54 * hitL, sag: .7 }];
    const P = rigPose(S, R, vw), sp = Math.sin(P.psi), cp = Math.cos(P.psi), back = vw.view === 'back';
    const dx = b.x + sp * (b.rx + 66 * u) + 14 * cp * u, dy = b.y + b.ry * .5 + (P.bob || 0), tilt = Math.abs(sp) > .3 ? .34 : .5;
    const drum = x => drum2D(x, { x: dx, y: dy, s: .86 * u * (Math.abs(sp) > .3 ? .9 : 1), rot: -.16 * sp + .05 * cp, tilt, col: '#D8402F', hoop: '#F2C530' });
    const top = dy - 62 * .86 * u, sticks = x => [0, 1].forEach(i => { const h = P.hands[i]; if (!h) return; const sd = (i ? 1 : -1) * (back ? -1 : 1), hit = i ? hitL : hitR;
      stick2D(x, h, [dx + sd * 26 * cp * u + sp * (i ? 30 : -24) * u, top - 6 * u - 74 * hit * u], S.colors.ink); });
    P.held = back ? [{ layer: 'behind', draw: drum }] : [{ layer: 'front', draw: x => { drum(x); sticks(x); } }];
    return Object.assign(P, face(o.face || 'stone'));
  },
  // ---------- ребёнок на качелях: ang — угол качелей (+ вперёд, от толкающего); вид 'back' — как видит толкающий ----------
  swing(ch, ang, o = {}) {
    const S = ch.spec, vw = { view: o.view || 'back', facing: o.facing ?? 1 }, k = clamp(ang / .9, -1, 1), fwd = Math.max(0, k), bk = Math.max(0, -k), rope = o.rope ?? 96;
    const g = rigOf(S), shX = Math.abs(g.sh[1][0] - g.cx);
    const R = { legs: [0, 1].map(i => ({ f: 96 + 110 * fwd - 60 * bk, s: 4, up: 96 + 96 * fwd - 50 * bk + (i ? 10 : 0), L: 1.02, toe: 1 - 1.2 * fwd })),
      arms: [0, 1].map(() => ({ out: rope - shX, down: -150 - 30 * fwd, f: 10, L: 1.1 })), pitch: -.5 * k, bob: 0, sq: vw.view === 'back' || vw.view === 'front' ? .1 * Math.abs(k) : 0, tilt: 0, nod: -.2 * k, hatDy: -10 * bk };
    const P = rigPose(S, R, vw);
    if (o.shoes) P.shoesOff = o.shoes;
    return Object.assign(P, face(Math.abs(k) > .6 ? 'delight' : 'wow'));
  },
};
export const ACTIONS = Object.keys(ACT);
// рука на шляпе: цель — макушка шляпы над головой
function holdArm(S) { const g = rigOf(S), u = g.u, h = S.head, shX = Math.abs(g.sh[0][0] - g.cx); return { out: -(shX - 34 * u) / u, down: (h.y - h.ry * 1.42 - g.sh[0][1]) / u, L: 1.3, f: 10 }; }
function lerpColor(a, b, k) { const p = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)), A = p(a), B = p(b); return '#' + A.map((v, i) => Math.round(lerp(v, B[i], k)).toString(16).padStart(2, '0')).join(''); }
