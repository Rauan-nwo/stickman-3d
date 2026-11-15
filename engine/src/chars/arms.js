// arms.js: помощники «естественных» рук для героев с локтем (spec.armStyle = 'elbow', канал лонгов).
// Правила — wiki/craft/layering-and-motion.md, раздел 2б: два звена и локоть, длина постоянна, локоть вниз/наружу,
// в покое кисть у бедра; кисть идёт по дуге от плеча, плечо (корпус) ведёт, кисть отстаёт на 2–4 кадра, в конце
// перелёт и возврат; жест чуть раньше ударного слова и держится ~0.5 с; руки не зеркальны; опёртая кисть приклеена.
import { E, clamp, lerp, seg } from '../core/ease.js';

// точка в координатах фигуры -> координаты ДО преобразования корпуса (dx/dy, bob, sq, lean): так кисть, «приклеенная»
// к предмету, остаётся на месте, пока корпус качается (руки рисуются внутри преобразования корпуса)
export function unUpper(S, p, q) {
  let x = q[0] - (p.dx || 0), y = q[1] - (p.dy || 0);
  const u = S.u ?? 1, sq = p.sq || 0, bob = p.bob || 0, lean = p.lean || 0;
  if (!(sq || bob || lean)) return [x, y];
  const hy = S.rig.hipY, hipDy = bob + sq * 60 * u;
  y -= hy + hipDy;
  const c = Math.cos(-lean), s = Math.sin(-lean); [x, y] = [x * c - y * s, x * s + y * c];
  return [x / (1 + sq * .6), y / (1 - sq) + hy];
}
// покой: рука висит вдоль тела с лёгким сгибом, кисть у бедра. side: -1 левая (экран), +1 правая
export const restHand = (S, side) => [side * (S.body.rx + 10), S.rig.hipY - 34];
export const shoulder = (S, side) => S.rig.sh[side < 0 ? 0 : 1];
// кисть по дуге вокруг плеча: интерполяция угла и расстояния (а не прямой между точками)
export function arcHand(sh, a, b, k) {
  const ra = Math.hypot(a[0] - sh[0], a[1] - sh[1]), rb = Math.hypot(b[0] - sh[0], b[1] - sh[1]);
  let aa = Math.atan2(a[1] - sh[1], a[0] - sh[0]), ab = Math.atan2(b[1] - sh[1], b[0] - sh[0]);
  if (ab - aa > Math.PI) ab -= Math.PI * 2; if (aa - ab > Math.PI) ab += Math.PI * 2;
  const an = lerp(aa, ab, k), r = lerp(ra, rb, k);
  return [sh[0] + Math.cos(an) * r, sh[1] + Math.sin(an) * r];
}
// огибающая жеста 0..1(+перелёт): старт за lead с до ударного слова at, подъём rise с перелётом, удержание hold, возврат fall
export function gestureEnv(t, at, { lead = .12, rise = .24, hold = .5, fall = .32 } = {}) {
  const t0 = at - lead, t1 = t0 + rise, t2 = t1 + hold, t3 = t2 + fall;
  if (t <= t0 || t >= t3) return 0;
  if (t < t1) return E.outBack(seg(t, t0, t1));
  if (t < t2) return 1;
  return 1 - E.inOutCubic(seg(t, t2, t3));
}
// жест одной рукой: плечо (корпус) ведёт сразу, кисть отстаёт на lag кадров.
// Возвращает { hand: k кисти 0..1+, body: k корпуса 0..1 } — body идёт в lean/tilt, hand — в arcHand(from, to, hand)
export function gesture(t, at, o = {}) {
  const lag = (o.lagFrames ?? 3) / (o.fps ?? 30);
  return { hand: gestureEnv(t - lag, at, o), body: clamp(gestureEnv(t, at, o)) };
}
