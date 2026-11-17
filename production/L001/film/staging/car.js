// staging/car.js — L02 салон машины агентов (bg_car_interior, камера с заднего сиденья).
// Агенты сидят на передних креслах и наклонились к магнитофону в центре: головы выглядывают из-за подголовников к середине.
// Слои: плейт -> агенты целиком (с руками и предметами) -> кресла (полигоны CFG.seats: спинки и подголовники ближе к камере, чем агенты).
// AGENT (agent1) — водитель слева, лицом вправо; AGENT 2 (agent2) — пассажир справа, лицом влево. Свет — приборная панель и плафон.
import { act, blinkAt, shoulder, restHand, arcHand, gesture, elbowIK, ell, clamp, lerp, E } from 'engine';
import { agent1, agent2 } from '../chars.js';
import { reel, tapeBox, tablet, subjectFolder } from '../props.js';
import { mouth } from '../words.js';
import { W, H, toS, plate, img, masked, polyMask, lazy, fig, toPlate, figXf } from './common.js';
import { noirShade } from 'engine';
import carPlate from '../../assets/bg_car_interior.png';

export const CFG = {
  fs: .78,                                                      // пикселей плейта на единицу фигуры
  seat: { A1: [300, 755], A2: [1032, 762] },                     // сиденья (скрыты спинками)
  lean: { A1: .22, A2: -.22 },
  light: { A1: [1, -.45], A2: [-1, -.45] },
  // кресла ближе к камере, чем агенты: спинка + подголовник (полигоны по контуру плейта)
  seats: [
    [[0, 330], [60, 322], [180, 328], [240, 355], [262, 400], [266, 500], [262, 600], [250, 630], [300, 642], [345, 662], [375, 700], [395, 780], [425, 880], [450, 970], [470, 1080], [0, 1080]],
    [[1112, 612], [1115, 430], [1130, 388], [1170, 378], [1390, 378], [1420, 392], [1432, 430], [1432, 612], [1415, 640], [1490, 648], [1515, 662], [1528, 720], [1532, 1080], [935, 1080], [952, 960], [978, 860], [1008, 770], [1040, 695], [1075, 655], [1118, 640]],
  ],
  reels: [[709, 811, 57], [846, 811, 57]],                       // центры и радиус нарисованных катушек (эллипс .62 по высоте)
  tapes: [826, 598, 250],                                       // коробка плёнок на панели: низ-центр, ширина
  views: { both: { cx: 690, cy: 560, k: 1.25 }, a1: { cx: 470, cy: 500, k: 2.0 }, a2: { cx: 1010, cy: 520, k: 1.75 }, a1m: { cx: 480, cy: 520, k: 1.75 } },
};

const I = { plate: img(carPlate) };
export const A = lazy([I.plate], () => ({ plate: I.plate, seats: masked(I.plate, polyMask(CFG.seats)) }));
const A1 = agent1(), A2 = agent2();
A1.spec.shade = noirShade(CFG.light.A1, { warm: '#ffb86a' }); A2.spec.shade = noirShade(CFG.light.A2, { warm: '#ffb86a' });
export const CAST = { A1, A2 };

// поза агента: o = { keys, sp, phones (0..1), press (0..1: дальняя рука прижимает наушник), hold: { k, at: [x,y] фигуры } — ближняя рука держит предмет }
function agentPose(C, t, T, f, o) {
  const S = C.spec, p = act(t, o.keys || [[0, 'neutral']]);
  Object.assign(p, { blink: blinkAt(t + (f > 0 ? 0 : 1.3), f > 0 ? 3 : 4), view: 'threeQuarter', facing: f, stance: f > 0 ? 'sitR' : 'sitL', look: o.look || [.5 * f, .1] });
  p.bob = (p.bob || 0) * .3; p.sq = (p.sq || 0) * .3; p.lean = (p.lean || 0) * .3 + o.lean; p.tilt = (p.tilt || 0) * .6 + (o.tilt || 0);
  if (p.mouth === 'teeth' || p.mouth === 'teethOpen') p.mouth = 'open';
  p.mouth = mouth(o.sp, T, p.mouth, f > 0 ? 3 : 4);
  p.phones = o.phones || 0; p.nearCup = (o.pressNear || 0) > .02;
  const near = f > 0 ? 1 : 0, far = 1 - near, shN = shoulder(S, f), shF = shoulder(S, -f);
  const arms = [];
  // дальняя рука: к чашке наушника (на ухе — у края головы со стороны затылка)
  const cup = [-f * 120, S.head.y + 10 + 150 * (o.phones || 0)];
  arms[far] = { to: arcHand(shF, restHand(S, -f), cup, o.press || 0), w: 11 };
  if (o.pressNear > .001) arms[near] = { to: arcHand(shN, restHand(S, f), [f * 112, S.head.y + 14], o.pressNear), w: 11 };
  else arms[near] = o.hold ? { to: arcHand(shN, restHand(S, f), o.hold.at, o.hold.k), w: 11 } : { to: [restHand(S, f)[0] + f * 20, restHand(S, f)[1] - 40], w: 11 };
  p.arms = arms;
  return p;
}
// кадр салона: o = { a1: {...}, a2: {...}, props: { reelsAng, tapes, tablet: {k, pic}, folder: {open, pic} }, solo }
export function car(ctx, v, t, T, o = {}) {
  const a = A(); if (!a) return;
  if (!o.solo) plate(ctx, a.plate, v);
  if (!o.solo) {
    for (const [x, y, r] of CFG.reels) { const P = toS(v, [x, y]); ctx.save(); ctx.translate(P[0], P[1]); ctx.scale(1, .62); reel(ctx, 0, 0, r * v.k, (o.reelsAng || 0) * (x < 800 ? 1 : 1.13)); ctx.restore(); }
    if (o.tapes != null) { const [x, y, w] = CFG.tapes, P = toS(v, [x, y]); tapeBox(ctx, P[0], P[1], w * v.k, o.tapes); }
  }
  const items = [[A1, 1, 'A1', o.a1 || {}], [A2, -1, 'A2', o.a2 || {}]];
  const drawn = [];
  for (const [C, f, k, m] of items) {
    if (m.hidden) continue;
    const p = agentPose(C, t, T, f, { ...m, lean: CFG.lean[k] + (m.lean || 0), sp: k === 'A1' ? 'AGENT' : 'AGENT 2' });
    fig(ctx, C, p, v, CFG.seat[k], CFG.fs, 'seat', { only: 'base' });
    drawn.push([C, f, k, m, p]);
  }
  for (const [C, f, k, m, p] of drawn) {
    fig(ctx, C, p, v, CFG.seat[k], CFG.fs, 'seat', { only: 'front' });
    if (m.held && (!m.hold || m.hold.k > .3)) { const near = f > 0 ? 1 : 0, h = p.arms[near].to, P = toS(v, toPlate(C.spec, CFG.seat[k], CFG.fs, bodyPt(C.spec, p, h))); m.held(ctx, P, CFG.fs * v.k); ell(ctx, P[0], P[1], 12 * CFG.fs * v.k, 12 * CFG.fs * v.k, C.spec.colors.ink, null); }
  }
  if (!o.solo) plate(ctx, a.seats, v);                                   // спинки и подголовники ближе агентов: закрывают всё, что за ними
}
// точка «до корпуса» -> фигура после наклона корпуса (кисть с предметом)
function bodyPt(S, p, q) { let [x, y] = q; const hy = S.rig.hipY, lean = p.lean || 0, hipDy = (p.bob || 0) + (p.sq || 0) * 60 * (S.u ?? 1); y -= hy; x *= 1 + (p.sq || 0) * .6; y *= 1 - (p.sq || 0); const c = Math.cos(lean), s = Math.sin(lean); return [x * c - y * s, x * s + y * c + hy + hipDy]; }
export const views = CFG.views;
export { tablet, subjectFolder };
