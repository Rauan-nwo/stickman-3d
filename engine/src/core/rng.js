// rng.js: вся случайность движка — с фиксированным зерном. Math.random() и часы в кадре запрещены.
export function rng(seed) {                                            // mulberry32
  let a = seed | 0;
  return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
// решётчатый шум для геометрии (JS-двойник GLSL-шума из noise.js; значения другие, характер тот же)
export function h3(x, y, z) { let n = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(z | 0, 1440662683); n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967295; }
export function vn3(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z); let u = x - xi, v = y - yi, w = z - zi;
  u = u * u * (3 - 2 * u); v = v * v * (3 - 2 * v); w = w * w * (3 - 2 * w);
  const L = (a, b, t) => a + (b - a) * t;
  return L(L(L(h3(xi, yi, zi), h3(xi + 1, yi, zi), u), L(h3(xi, yi + 1, zi), h3(xi + 1, yi + 1, zi), u), v),
           L(L(h3(xi, yi, zi + 1), h3(xi + 1, yi, zi + 1), u), L(h3(xi, yi + 1, zi + 1), h3(xi + 1, yi + 1, zi + 1), u), v), w);
}
export const fbm3 = (x, y, z, o = 4) => { let s = 0, a = .5; for (let i = 0; i < o; i++) { s += a * vn3(x, y, z); x *= 2.03; y *= 2.03; z *= 2.03; a *= .5; } return s; };
// дешёвый хеш 0..1 от целого (для липфлапа и морганий)
export const hash = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
export { hash01, noise1 } from '../camera.js';
