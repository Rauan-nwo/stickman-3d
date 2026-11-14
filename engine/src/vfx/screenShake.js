// screenShake.js: тряска на удар/выстрел/взрыв. Норма из шпаргалки тайминга: 9–12 кадров, 2–3 затухающих колебания, ±10–15 px.
import { shake, noise1 } from '../camera.js';

// модификатор камеры: withMods(move, screenShake(T_HIT)) — затухающий рывок прицела в градусах
export const screenShake = (t0, { deg = 1.1, decay = 8, freq = 24, seed = 5 } = {}) => shake(t0, deg, decay, freq, seed);

// сдвиг 2D-слоя в пикселях (для титров и плоских вставок): [dx, dy]
export function shakeOffset(t, t0, { px = 13, dur = .36, osc = 3, seed = 5 } = {}) {
  const a = t - t0; if (a < 0 || a > dur) return [0, 0];
  const k = 1 - a / dur, x = a / dur * osc * 2;
  return [noise1(seed, x) * px * k, noise1(seed + 1, x) * px * k];
}
