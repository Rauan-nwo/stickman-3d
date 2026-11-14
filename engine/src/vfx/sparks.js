// sparks.js: искорки. sparkles — мерцающие пылинки в конусе лампы; sparkBurst — сноп искр (фитиль, удар).
import * as THREE from 'three';
import { points } from '../core/particles.js';
import { rng } from '../core/rng.js';

// мерцающие точки в конусе: nTop из них держатся прямо под абажуром. tick(t, stage) каждый кадр.
export function sparkles(parent, { top, coneR = .63, n = 46, nTop = 18, seed = 11, color = [1.5, 1.35, 1.05] }) {
  const r = rng(seed);
  return points(parent, n, [
    ['position', 3, (i, a, o) => { const up = i < nTop, k = up ? .1 + r() * .14 : .3 + r() * .65, rr = Math.sqrt(r()) * (.1 + (coneR - .1) * k) * .85, an = r() * 6.283; a[o] = top.x + Math.cos(an) * rr; a[o + 1] = top.y * (1 - k); a[o + 2] = top.z + Math.sin(an) * rr; }],
    ['aSeed', 1, (i, a, o) => { a[o] = r(); }],
  ], `uniform float u_time, u_px; attribute float aSeed; varying float vA;
  void main(){ vec3 p = position; float s = aSeed*6.2831; p += vec3(sin(u_time*.7 + s)*.03, -u_time*.05*(.5+aSeed), cos(u_time*.6 + s*2.3)*.03);
    vA = .45 + .55*sin(u_time*5. + s*5.); vec4 mv = modelViewMatrix*vec4(p,1.); gl_PointSize = clamp(.011*u_px/(-mv.z), 2.5, 9.); gl_Position = projectionMatrix*mv; }`,
  `varying float vA; void main(){ float d = length(gl_PointCoord-.5); if (d > .5) discard; gl_FragColor = vec4(vec3(${color.map(c => c.toFixed(3)).join(',')})*vA*smoothstep(.5,.15,d), 1.); }`);
}

// сноп искр из точки: баллистика с гравитацией, каждая искра живёт до life секунд. setAge(age, stage): age — секунды от вспышки
// (age < 0 — не видно). loop > 0 — непрерывный фонтан (фитиль): искра перезапускается раз в loop секунд.
export function sparkBurst(parent, { pos, n = 60, seed = 7, dir = [0, 1, 0], spread = .9, speed = [1.2, 3.2], gravity = 5, life = .6, size = .02, loop = 0, color = [1.6, 1.2, .5] }) {
  const r = rng(seed), d = new THREE.Vector3(...dir).normalize();
  const tExpr = loop > 0 ? `mod(u_time + aSeed*${loop.toFixed(3)}, ${loop.toFixed(3)})` : 'u_time';
  const pt = points(parent, n, [
    ['position', 3, (i, a, o) => { a[o] = pos.x; a[o + 1] = pos.y; a[o + 2] = pos.z; }],
    ['aVel', 3, (i, a, o) => { const v = new THREE.Vector3(r() - .5, r() - .5, r() - .5).normalize().multiplyScalar(spread).add(d).normalize().multiplyScalar(speed[0] + r() * (speed[1] - speed[0])); a[o] = v.x; a[o + 1] = v.y; a[o + 2] = v.z; }],
    ['aSeed', 1, (i, a, o) => { a[o] = r(); }],
  ], `uniform float u_time, u_px; attribute vec3 aVel; attribute float aSeed; varying float vA;
  void main(){ float life = ${life.toFixed(3)} * (.55 + .45*aSeed); float t = ${tExpr};
    float k = clamp(t/life, 0., 1.); vec3 p = position + aVel*t*(1. - .35*k) + vec3(0., -.5*${gravity.toFixed(2)}*t*t, 0.);
    vA = (t < 0. || t > life) ? 0. : (1. - k*k); vec4 mv = modelViewMatrix*vec4(p,1.); gl_PointSize = clamp(${size.toFixed(4)}*u_px/(-mv.z)*(1. - .5*k), 1.5, 14.); gl_Position = projectionMatrix*mv; }`,
  `varying float vA; void main(){ float d = length(gl_PointCoord-.5); if (d > .5 || vA <= 0.) discard; gl_FragColor = vec4(vec3(${color.map(c => c.toFixed(3)).join(',')})*vA*smoothstep(.5,.1,d), 1.); }`);
  pt.setAge = (age, stage) => { pt.visible = loop > 0 ? age >= 0 : (age >= 0 && age <= life); pt.tick(Math.max(0, age), stage); };
  pt.setPos = p => { const a = pt.geometry.attributes.position; for (let i = 0; i < n; i++) a.setXYZ(i, p.x, p.y, p.z); a.needsUpdate = true; };
  pt.visible = false;
  return pt;
}
