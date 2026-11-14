// dustMotes.js: медленные пылинки в воздухе помещения (эмбиент-слой: 10–20 % от основного движения).
import { points } from '../core/particles.js';
import { rng } from '../core/rng.js';

// box: { x: [от, размах], y: [...], z: [...] } в координатах parent. tick(t, stage) каждый кадр.
export function dustMotes(parent, { n = 90, seed = 41, box = { x: [-1.3, 2.8], y: [.3, 2.2], z: [-.5, -5] }, color = [1.3, 1.15, .85], size = .012 } = {}) {
  const r = rng(seed);
  return points(parent, n, [
    ['position', 3, (i, a, o) => { a[o] = box.x[0] + r() * box.x[1]; a[o + 1] = box.y[0] + r() * box.y[1]; a[o + 2] = box.z[0] + r() * box.z[1]; }],
    ['aSeed', 1, (i, a, o) => { a[o] = r(); }],
  ], `uniform float u_time, u_px; attribute float aSeed; varying float vA;
  void main(){ vec3 p = position; float s = aSeed*6.2831; p += vec3(sin(u_time*.35 + s)*.08, sin(u_time*.22 + s*1.7)*.05, cos(u_time*.28 + s*2.3)*.08);
    vA = .35 + .5*sin(u_time*2.5 + s*3.); vec4 mv = modelViewMatrix*vec4(p,1.); gl_PointSize = clamp(${size.toFixed(4)}*u_px/(-mv.z), 2., 7.); gl_Position = projectionMatrix*mv; }`,
  `varying float vA; void main(){ float d = length(gl_PointCoord-.5); if (d > .5) discard; gl_FragColor = vec4(vec3(${color.map(c => c.toFixed(3)).join(',')})*vA*smoothstep(.5,.15,d), 1.); }`);
}
