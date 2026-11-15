// drum.js — армейский малый барабан: кадло, красные обручи, белые мембраны, верёвочная шнуровка зигзагом с кожаными
// стяжками, две палочки. Читается крупно (кувыркается у камеры) и мелко (белая мембрана + красные обручи на воде).
//   const drum = createDrum(stage, { scale: 1 });  stage.add(drum.group)   (или set.group.add(drum.group))
//   drum.pose({ pos, rot: [x, y, z], scale })                 положение корпуса
//   drum.tumble(age, { from, v, g, spin, rot0 })              баллистика с кувырком -> Vector3 (позиция); чистая функция age
//   drum.sticks(age, { v, spin })                             age < 0 — палочки лежат на барабане; иначе разлетаются от него
// Всё в координатах родителя group. Для переднего плана поверх персонажей: stage.fg(drum.group).
import * as THREE from 'three';
import { rng } from '../core/rng.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const DRUM = { r: .2, h: .3 };

export function createDrum(stage, { scale = 1, shell = 0x27458f, hoop = 0xb8242a, seed = 3 } = {}) {
  const R = DRUM.r, Hh = DRUM.h, group = new THREE.Group(), body = new THREE.Group(); group.add(body);
  const env = stage && stage.envTex;
  const mShell = new THREE.MeshStandardMaterial({ color: shell, roughness: .45, metalness: .1, envMap: env, envMapIntensity: .4 });
  const mHoop = new THREE.MeshStandardMaterial({ color: hoop, roughness: .55 });
  const mHead = new THREE.MeshStandardMaterial({ color: 0xf3ead8, roughness: .7 });
  const mRope = new THREE.MeshStandardMaterial({ color: 0xf1e6cc, roughness: .9 });
  const mTug = new THREE.MeshStandardMaterial({ color: 0x8a5a2c, roughness: .8 });
  const mBrass = new THREE.MeshStandardMaterial({ color: 0xd8b24a, roughness: .3, metalness: .9, envMap: env, envMapIntensity: .8 });
  const add = (geo, mat, x = 0, y = 0, z = 0, parent = body) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; };
  add(new THREE.CylinderGeometry(R, R, Hh, 40, 1, true), mShell);
  add(new THREE.CylinderGeometry(R * 1.005, R * 1.005, .05, 40, 1, true), mBrass);                    // латунный пояс с эмблемой
  for (const sy of [-1, 1]) {
    add(new THREE.CylinderGeometry(R * 1.07, R * 1.07, .045, 40), mHoop, 0, sy * (Hh / 2 + .012));
    const hd = add(new THREE.CircleGeometry(R * 1.0, 40), mHead, 0, sy * (Hh / 2 + .036)); hd.rotation.x = -sy * Math.PI / 2;
  }
  // шнуровка: зигзаг между обручами + кожаные стяжки на каждой паре
  const NZ = 10, up = V(0, 1, 0), q = new THREE.Quaternion();
  for (let i = 0; i < NZ * 2; i++) {
    const a0 = i / (NZ * 2) * 6.2832, a1 = (i + 1) / (NZ * 2) * 6.2832, top = i % 2 === 0;
    const A = V(Math.cos(a0) * R * 1.085, (top ? 1 : -1) * Hh / 2, Math.sin(a0) * R * 1.085), B = V(Math.cos(a1) * R * 1.085, (top ? -1 : 1) * Hh / 2, Math.sin(a1) * R * 1.085);
    const d = B.clone().sub(A), len = d.length(), m = add(new THREE.CylinderGeometry(.0065, .0065, len, 5), mRope); m.position.copy(A).lerp(B, .5); m.quaternion.copy(q.setFromUnitVectors(up, d.normalize()));
    if (top) { const t = add(new THREE.BoxGeometry(.034, .05, .012), mTug); t.position.set(Math.cos((a0 + a1) / 2 + .157) * R * 1.09, -Hh * .16, Math.sin((a0 + a1) / 2 + .157) * R * 1.09); t.lookAt(0, -Hh * .16, 0); }
  }
  // палочки: лежат крест-накрест на верхней мембране
  const stickGeo = () => { const g = new THREE.CylinderGeometry(.006, .011, .4, 8); return g; };
  const mStick = new THREE.MeshStandardMaterial({ color: 0xc89a5c, roughness: .6 });
  const REST = [{ p: V(-.03, Hh / 2 + .052, .02), r: [Math.PI / 2, 0, .5] }, { p: V(.03, Hh / 2 + .066, -.02), r: [Math.PI / 2, 0, -.6] }];
  const sticksArr = REST.map(() => { const s = new THREE.Group(); const m = new THREE.Mesh(stickGeo(), mStick); m.castShadow = true; s.add(m); const tip = new THREE.Mesh(new THREE.SphereGeometry(.013, 10, 8), mStick); tip.position.y = .2; s.add(tip); group.add(s); return s; });
  const rs = rng(seed), SV = REST.map((_, i) => ({ v: V((i ? 1 : -1) * (1.2 + rs()), 2.2 + rs() * 1.4, (rs() - .5) * 2.4), spin: V(7 + rs() * 8, 3 + rs() * 5, 9 + rs() * 8) }));
  const m4 = new THREE.Matrix4(), e = new THREE.Euler(), free = { pos: [V(0, 0, 0), V(0, 0, 0)], quat: [new THREE.Quaternion(), new THREE.Quaternion()], set: false };
  const attach = i => { const s = sticksArr[i]; s.position.copy(REST[i].p).multiplyScalar(body.scale.x).applyQuaternion(body.quaternion).add(body.position); s.quaternion.copy(body.quaternion).multiply(q.setFromEuler(e.set(...REST[i].r))); s.scale.copy(body.scale); };
  const drum = {
    group, body, stickObjs: sticksArr, radius: R, height: Hh,
    pose({ pos, rot = [0, 0, 0], scale: sc = scale } = {}) { if (pos) body.position.copy(pos.isVector3 ? pos : V(...pos)); body.rotation.set(...rot); body.scale.setScalar(sc); attach(0); attach(1); return drum; },
    // баллистика с кувырком: from — точка отрыва, v — скорость (м/с), g — тяжесть, spin — рад/с по осям, rot0 — начальный поворот
    tumble(age, { from, v = [0, 3, 3], g = 9.8, spin = [5, 2, 3.5], rot0 = [0, 0, 0], scale: sc = scale } = {}) {
      const a = Math.max(0, age), f = from.isVector3 ? from : V(...from), p = V(f.x + v[0] * a, f.y + v[1] * a - .5 * g * a * a, f.z + v[2] * a);
      drum.pose({ pos: p, rot: [rot0[0] + spin[0] * a, rot0[1] + spin[1] * a, rot0[2] + spin[2] * a], scale: sc }); return p;
    },
    // палочки: age < 0 — на барабане. Иначе летят от позы барабана в момент отрыва (её даёт at = { pos, rot }), g — тяжесть
    sticks(age, { at, g = 9.8, k = 1 } = {}) {
      if (age < 0) { attach(0); attach(1); return drum; }
      const keepP = body.position.clone(), keepQ = body.quaternion.clone();
      if (at) { body.position.copy(at.pos.isVector3 ? at.pos : V(...at.pos)); body.rotation.set(...(at.rot || [0, 0, 0])); }
      for (let i = 0; i < 2; i++) { attach(i); const s = sticksArr[i], sv = SV[i]; s.position.x += sv.v.x * k * age; s.position.y += sv.v.y * k * age - .5 * g * age * age; s.position.z += sv.v.z * k * age; s.quaternion.multiply(q.setFromEuler(e.set(sv.spin.x * age, sv.spin.y * age, sv.spin.z * age))); }
      body.position.copy(keepP); body.quaternion.copy(keepQ); return drum;
    },
  };
  drum.pose({ pos: V(0, 0, 0) });
  return drum;
}
