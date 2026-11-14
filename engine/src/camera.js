// camera.js: pure camera helpers (time in -> camera state out). A camera state is { pos, target, fov, roll }.
// Ported (subset, TS -> JS) from anidoodle engine/src/three-core/camera.ts
// (C:\dev\tools\anim-skills\anidoodle\skills\anidoodle\engine\src\three-core\camera.ts), Apache-2.0.
// Changes: plain JS, time in seconds instead of frames, keyframed `keyed()` move, `shake()` mod added;
// engine additions below the anidoodle block: yaw/pitch spline path, pushIn / pullBack / whip / track / orbit.
import * as THREE from 'three';
import { clamp, seg, E, lerp } from './core/ease.js';

const D2R = Math.PI / 180;
export { clamp, seg, E };
const v = a => new THREE.Vector3(a[0], a[1], a[2]);
const arr = p => [p.x, p.y, p.z];
const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

export const look = (pos, target, fov = 35, roll = 0) => ({ pos: [...pos], target: [...target], fov, roll });
export const withMods = (move, ...mods) => t => mods.reduce((s, m) => m(s, t), move(t));

export const place = (cam, s) => {
  cam.position.set(...s.pos); cam.up.set(0, 1, 0); cam.lookAt(...s.target);
  if (s.roll) cam.rotateZ(s.roll * D2R);
  cam.fov = s.fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld(true);
  return cam;
};

// anidoodle: "a push is eased in log(distance)". Interpolate two states: target linearly, the camera's
// offset from the target in direction (slerp) and in log-distance, fov linearly.
export function blend(a, b, t) {
  const ta = v(a.target), tb = v(b.target), da = v(a.pos).sub(ta), db = v(b.pos).sub(tb);
  const la = da.length(), lb = db.length();
  const q = new THREE.Quaternion().setFromUnitVectors(da.clone().normalize(), db.clone().normalize());
  const dir = da.clone().normalize().applyQuaternion(new THREE.Quaternion().slerp(q, t));
  const L = Math.exp(Math.log(la) + (Math.log(lb) - Math.log(la)) * t);
  const target = ta.lerp(tb, t);
  return { pos: arr(target.clone().add(dir.multiplyScalar(L))), target: arr(target), fov: a.fov + (b.fov - a.fov) * t, roll: a.roll + (b.roll - a.roll) * t };
}
// keyed: [[time, state, ease?], ...] -> move. The ease on key i shapes the segment that ENDS at key i.
export const keyed = keys => t => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) {
    const [t0, s0] = keys[i - 1], [t1, s1, e] = keys[i];
    return blend(s0, s1, (e || E.inOutCubic)(seg(t, t0, t1)));
  }
  return keys[keys.length - 1][1];
};

// ---- seeded smooth noise (anidoodle)
export const hash01 = (seed, i) => {
  let h = Math.imul((seed | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(i | 0, 0xc2b2ae35);
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d); h ^= h >>> 15; h = Math.imul(h, 0x846ca68b); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};
export const noise1 = (seed, x) => {
  const i = Math.floor(x), t = x - i, s = t * t * t * (t * (t * 6 - 15) + 10);
  const a = hash01(seed, i) * 2 - 1, b = hash01(seed, i + 1) * 2 - 1;
  return a + (b - a) * s;
};
const axes = s => {
  const fwd = v(s.target).sub(v(s.pos)).normalize(), right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();
  return { fwd, right, up: new THREE.Vector3().crossVectors(right, fwd) };
};
// handheld (anidoodle): aim wander + sway + roll, seeded smooth noise; amount 1 ~ 0.5 deg
export const handheld = (seed, amount = 1, freq = .6) => (s, t) => {
  const x = t * freq, n = k => noise1(seed * 31 + k, x + k * .37) * .7 + noise1(seed * 31 + k + 9, x * 2.3) * .3;
  const { right, up } = axes(s), dist = v(s.target).sub(v(s.pos)).length(), aim = Math.tan(.5 * amount * D2R) * dist, sway = .004 * amount * dist;
  const dt = right.clone().multiplyScalar(n(1) * aim).add(up.clone().multiplyScalar(n(2) * aim));
  const dp = right.clone().multiplyScalar(n(3) * sway).add(up.clone().multiplyScalar(n(4) * sway));
  return { pos: arr(v(s.pos).add(dp)), target: arr(v(s.target).add(dt).add(dp)), fov: s.fov, roll: s.roll + n(5) * .35 * amount };
};
// impact shake: decaying high-frequency aim jolt starting at t0 (deg)
export const shake = (t0, deg = 1.2, decay = 7, freq = 22, seed = 5) => (s, t) => {
  if (t < t0) return s;
  const a = deg * Math.exp(-(t - t0) * decay), x = (t - t0) * freq;
  const { right, up } = axes(s), dist = v(s.target).sub(v(s.pos)).length(), k = Math.tan(a * D2R) * dist;
  const dt = right.clone().multiplyScalar(noise1(seed, x) * k).add(up.clone().multiplyScalar(noise1(seed + 1, x) * k));
  return { ...s, target: arr(v(s.target).add(dt)), roll: s.roll + noise1(seed + 2, x) * a * .6 };
};
// rack focus in dioptres (anidoodle)
export const rackFocus = (t, t0, t1, a, b, e = E.inOutCubic) => 1 / (1 / a + (1 / b - 1 / a) * e(seg(t, t0, t1)));
export { lerp3 };

// =====================================================================================================
// Engine additions (not from anidoodle)
// =====================================================================================================
// view direction from yaw (rad, + = right, 0 = looking down -z) and pitch (rad, + = up)
export const fwdOf = (yaw, pitch) => new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
// splineState: keys [[t, [x, y, z], yaw, pitch], ...] smoothed with a Catmull-Rom on every channel -> { pos: [x,y,z], yaw, pitch }.
// Good for "the camera flies after an object": position and aim are keyed separately and never overshoot much.
export function splineState(K, t) {
  let i = 0; while (i + 2 < K.length && t >= K[i + 1][0]) i++;
  const a = K[i], b = K[i + 1], k = clamp((t - a[0]) / (b[0] - a[0]));
  const p0 = K[Math.max(0, i - 1)], p3 = K[Math.min(K.length - 1, i + 2)];
  const cr = (v0, v1, v2, v3, s) => .5 * ((2 * v1) + (-v0 + v2) * s + (2 * v0 - 5 * v1 + 4 * v2 - v3) * s * s + (-v0 + 3 * v1 - 3 * v2 + v3) * s * s * s);
  const ch = f => cr(f(p0), f(a), f(b), f(p3), k);
  return { pos: [ch(q => q[1][0]), ch(q => q[1][1]), ch(q => q[1][2])], yaw: ch(q => q[2]), pitch: ch(q => q[3]) };
}
// camera state from a position (Vector3 or array) + yaw/pitch
export function aimState(pos, yaw, pitch, fov = 50, roll = 0) {
  const p = Array.isArray(pos) ? v(pos) : pos, tgt = p.clone().add(fwdOf(yaw, pitch));
  return { pos: p.toArray(), target: tgt.toArray(), fov, roll };
}
// pushIn / pullBack: from state a to state b between t0 and t1 (log-distance blend, so it brakes naturally)
export const pushIn = (a, b, t0, t1, e = E.outCubic) => t => blend(a, b, e(seg(t, t0, t1)));
export const pullBack = (a, b, t0, t1, e = E.inOutCubic) => t => blend(a, b, e(seg(t, t0, t1)));
// slow push on a speaker: keeps the target, shortens the distance by `amount` (0.15 = 15 % closer) over [t0, t1]
export const creep = (s, amount, t0, t1, e = E.inOutSine) => t => {
  const k = 1 - amount * e(seg(t, t0, t1)), p = v(s.pos).sub(v(s.target)).multiplyScalar(k).add(v(s.target));
  return { ...s, pos: arr(p) };
};
// whip: fast pan from a to b starting at t0 (4-12 frames), accelerating then braking hard
export const whip = (a, b, t0, dur = .2, e = E.inOutExpo) => t => blend(a, b, e(seg(t, t0, t0 + dur)));
// track: follow a moving point. targetFn(t) -> [x,y,z]; the camera sits at target + offset(t) (array or function)
export const track = (targetFn, offset, fov = 50, lag = 0) => t => {
  const tg = targetFn(t - lag), o = typeof offset === 'function' ? offset(t) : offset;
  return { pos: [tg[0] + o[0], tg[1] + o[1], tg[2] + o[2]], target: [...tg], fov, roll: 0 };
};
// orbit around a target: angle in degrees from +z (0 = in front), elevation in degrees, radius in metres
export const orbit = (target, angKeys, elev = 5, radius = 3, fov = 50) => t => {
  const a = (typeof angKeys === 'function' ? angKeys(t) : angKeys) * D2R, e = elev * D2R;
  return { pos: [target[0] + Math.sin(a) * Math.cos(e) * radius, target[1] + Math.sin(e) * radius, target[2] + Math.cos(a) * Math.cos(e) * radius], target: [...target], fov, roll: 0 };
};
// sequence of moves: [[tStart, move], ...] — the move whose start is the latest one <= t is used
export const sequence = parts => t => { let i = 0; while (i + 1 < parts.length && t >= parts[i + 1][0]) i++; return parts[i][1](t); };
export { lerp };
