// ease.js: чистые функции времени. Всё, что двигается в кадре, считается из t (секунды) — без часов и состояния.
export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const seg = (t, a, b) => clamp((t - a) / (b - a));            // 0..1 внутри отрезка [a, b]
export const smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };
export const E = {
  linear: t => t,
  inOutCubic: t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outCubic: t => 1 - Math.pow(1 - t, 3),
  inCubic: t => t * t * t,
  inOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,
  inOutExpo: t => (t === 0 ? 0 : t === 1 ? 1 : t < .5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2),
  outExpo: t => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inExpo: t => (t === 0 ? 0 : Math.pow(2, 10 * t - 10)),
  inOutQuint: t => (t < .5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2),
  // «сигнатура канала» для персонажей: перелёт ~10 % (см. wiki/craft/skill-motion-manim.md)
  outBack: (t, s = 1.9) => { t = clamp(t); return 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2); },
  smooth,
};
// затухающая пружина после момента t0 (0 до него): для «тейков», догоняющей шляпы, отдачи
export const spring = (t, t0, k = 6, w = 18) => (t < t0 ? 0 : Math.exp(-k * (t - t0)) * Math.sin(w * (t - t0)));
// значение по ключам [[t, v, ease?], ...]; v — число или массив чисел; ease формирует отрезок, который КОНЧАЕТСЯ на ключе
export function keys(ks, t) {
  if (t <= ks[0][0]) return ks[0][1];
  for (let i = 1; i < ks.length; i++) if (t <= ks[i][0]) {
    const [t0, a] = ks[i - 1], [t1, b, e] = ks[i], k = (e || E.inOutCubic)(seg(t, t0, t1));
    return Array.isArray(a) ? a.map((x, j) => lerp(x, b[j], k)) : lerp(a, b, k);
  }
  return ks[ks.length - 1][1];
}
// ступенчатый выбор: последний ключ, чьё время <= t
export function step(ks, t) { let i = 0; while (i + 1 < ks.length && t >= ks[i + 1][0]) i++; return ks[i]; }
