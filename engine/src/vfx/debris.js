// debris.js: мелкие летящие предметы — баллистика с вращением, чистые функции возраста.
//   fallingPebble(parent, { pos, v, size })     камешек: .setAge(age) -> Vector3 (за ним можно вести камеру), .posAt(age)
//   boltPop(parent, { points: [{ pos, dir, t0 }] }) болты, вылетающие из цепи: .setTime(t) / .setAge(age), .setOrigins([Vector3])
//   splinters(parent, { pos, n, spread })       щепки и пыль, когда мост «взбрыкивает»: .setAge(age, origin)
import * as THREE from 'three';
import { rng } from '../core/rng.js';
import { clamp, smooth } from '../core/ease.js';
import { sprite } from '../core/particles.js';
import { softTex } from '../core/textures.js';
import { STONES } from '../sets/kit.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const arr = p => (p.isVector3 ? p : V(...p));

export function fallingPebble(parent, { pos, v = [0, 0, 0], g = 9.8, size = .05, seed = 1, color = 0xd8cdbd, drag = 0 } = {}) {
  const m = new THREE.Mesh(STONES[seed % 4], new THREE.MeshStandardMaterial({ color, roughness: .95, flatShading: true })); m.scale.set(size, size * .7, size * .85); m.castShadow = true; m.visible = false; parent.add(m);
  const p0 = arr(pos), r = rng(seed * 7 + 1), spin = [4 + r() * 6, 3 + r() * 5, 2 + r() * 6];
  m.posAt = age => { const a = Math.max(0, age), k = drag ? (1 - Math.exp(-drag * a)) / drag : a; return V(p0.x + v[0] * k, p0.y + v[1] * k - .5 * g * a * a, p0.z + v[2] * k); };
  m.setAge = age => { m.visible = age >= 0; const p = m.posAt(age); m.position.copy(p); m.rotation.set(spin[0] * age, spin[1] * age, spin[2] * age); return p; };
  return m;
}

export function boltPop(parent, { points, envTex, size = 1, g = 9.8, seed = 4, speed = [3, 6] } = {}) {
  const grp = new THREE.Group(); parent.add(grp);
  const iron = new THREE.MeshStandardMaterial({ color: 0x3a3838, roughness: .4, metalness: .85, envMap: envTex, envMapIntensity: .8 }), r = rng(seed);
  const items = points.map(pt => {
    const b = new THREE.Group(), head = new THREE.Mesh(new THREE.CylinderGeometry(.034 * size, .034 * size, .026 * size, 6), iron), sh = new THREE.Mesh(new THREE.CylinderGeometry(.015 * size, .015 * size, .1 * size, 8), iron);
    head.position.y = .055 * size; b.add(head, sh); head.castShadow = sh.castShadow = true; b.visible = false; grp.add(b);
    const d = arr(pt.dir || [0, 1, 0]).clone().normalize().add(V(r() - .5, r() * .4, r() - .5).multiplyScalar(.35)).normalize().multiplyScalar(speed[0] + r() * (speed[1] - speed[0]));
    const fl = sprite(grp, softTex(), { color: new THREE.Color(1.6, 1.3, .8) }); fl.position.copy(arr(pt.pos)); fl.visible = false;
    return { b, fl, p: arr(pt.pos).clone(), v: d, t0: pt.t0 || 0, spin: [10 + r() * 14, 6 + r() * 10, 8 + r() * 12] };
  });
  const api = {
    group: grp, items,
    setTime(t) {
      for (const it of items) {
        const a = t - it.t0; it.b.visible = a >= 0 && a < 4; it.fl.visible = a >= 0 && a < .12; if (a < 0) continue;
        it.b.position.set(it.p.x + it.v.x * a, it.p.y + it.v.y * a - .5 * g * a * a, it.p.z + it.v.z * a); it.b.rotation.set(it.spin[0] * a, it.spin[1] * a, it.spin[2] * a);
        it.fl.scale.setScalar((.12 + a * 3) * size); it.fl.material.opacity = 1 - a / .12;
      }
    },
    setAge(age) { api.setTime(age); },
    // перенести точки вылета (цепь движется): pts = [Vector3, ...] в координатах parent
    setOrigins(pts) { pts.forEach((p, i) => { if (items[i]) { items[i].p.copy(p); items[i].fl.position.copy(p); } }); },
  };
  return api;
}

export function splinters(parent, { pos, n = 40, seed = 9, spread = [6, 1.6], up = [4, 11], life = 2.4, g = 9.8, nDust = 8, color = [0x7c5a3c, 0xcaa474] } = {}) {
  const grp = new THREE.Group(); grp.visible = false; parent.add(grp);
  const r = rng(seed), p0 = arr(pos), im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, .035, .09), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .85 }), n); im.castShadow = true; im.frustumCulled = false; grp.add(im);
  const c = new THREE.Color(), ca = new THREE.Color(color[0]), cb = new THREE.Color(color[1]);
  const S = []; for (let i = 0; i < n; i++) { S.push({ o: V((r() - .5) * spread[0] * 2, 0, (r() - .5) * spread[1] * 2), v: V((r() - .5) * 5, up[0] + r() * (up[1] - up[0]), (r() - .5) * 7), spin: V(r() * 12, r() * 12, r() * 12), len: .18 + r() * r() * .9 }); im.setColorAt(i, c.copy(ca).lerp(cb, r())); }
  const dust = []; for (let i = 0; i < nDust; i++) { const s = sprite(grp, softTex(), { blending: THREE.NormalBlending, color: new THREE.Color(.88, .78, .62) }); dust.push({ s, o: V((r() - .5) * spread[0] * 2, .2, (r() - .5) * spread[1] * 2), v: V((r() - .5) * 1.5, .8 + r() * 1.6, (r() - .5) * 1.5), sc: 1 + r() * 1.4 }); }
  const d = new THREE.Object3D();
  return {
    group: grp,
    // age — секунды после рывка; origin — точка разлёта (по умолчанию pos), в координатах parent
    setAge(age, origin) {
      grp.visible = age >= 0 && age < life; if (!grp.visible) return; const b = origin || p0;
      for (let i = 0; i < n; i++) { const s = S[i]; d.position.set(b.x + s.o.x + s.v.x * age, b.y + s.o.y + s.v.y * age - .5 * g * age * age, b.z + s.o.z + s.v.z * age); d.rotation.set(s.spin.x * age, s.spin.y * age, s.spin.z * age); d.scale.set(s.len, 1, 1); d.updateMatrix(); im.setMatrixAt(i, d.matrix); }
      im.instanceMatrix.needsUpdate = true;
      for (const q of dust) { q.s.position.set(b.x + q.o.x + q.v.x * age, b.y + q.o.y + q.v.y * age, b.z + q.o.z + q.v.z * age); q.s.scale.setScalar(q.sc * (.6 + 2.2 * smooth(age / .8))); q.s.material.opacity = .45 * smooth(age / .05) * (1 - clamp(age / (life * .8))); }
    },
  };
}
