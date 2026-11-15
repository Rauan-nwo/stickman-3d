// waterSplash.js: вода. Всё — чистые функции возраста/времени.
//   waterSplash(parent, { pos, scale })        большой всплеск: столб брызг + расходящиеся кольца + пена; .setAge(age)
//   multiSplash(parent, { points: [{ pos, t0, size, normal }] })   много мелких всплесков/кругов (и «дождь шагов» на настиле); .setTime(t)
//   floatBob(obj, t, { pos, dir, speed, amp }) предмет качается на воде и плывёт по течению -> Vector3
import * as THREE from 'three';
import { rng } from '../core/rng.js';
import { clamp, smooth } from '../core/ease.js';
import { sprite } from '../core/particles.js';
import { softTex } from '../core/textures.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
let _ring;
const ringGeo = () => _ring || (_ring = new THREE.RingGeometry(.86, 1, 48).rotateX(-Math.PI / 2));

export function waterSplash(parent, { pos, scale = 1, seed = 5, nDrops = 34, nRings = 4, life = 2.6, color = 0xf4fbff } = {}) {
  const g = new THREE.Group(); g.position.copy(pos); g.visible = false; parent.add(g);
  const r = rng(seed), rings = [], drops = [];
  for (let i = 0; i < nRings; i++) { const m = new THREE.Mesh(ringGeo(), new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false, fog: false })); m.position.y = .04 + i * .01; g.add(m); rings.push(m); }
  const foam = new THREE.Mesh(new THREE.CircleGeometry(1, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false, fog: false })); foam.position.y = .03; g.add(foam);
  for (let i = 0; i < nDrops; i++) { const a = r() * 6.283, out = r() * r(), s = sprite(g, softTex(), { blending: THREE.NormalBlending, color: new THREE.Color(color), fog: false }); drops.push({ s, v: V(Math.cos(a) * out * 3.2, 5 + r() * 7 * (1 - out * .6), Math.sin(a) * out * 3.2).multiplyScalar(scale), sc: (.35 + r() * .6) * scale, d: r() * .12 }); }
  return {
    group: g, life,
    // age — секунды после удара о воду
    setAge(age) {
      g.visible = age >= 0 && age < life; if (!g.visible) return;
      rings.forEach((m, i) => { const a = age - i * .22, k = clamp(a / (life - i * .22)); m.visible = a > 0; m.scale.setScalar(scale * (.6 + 7.5 * (1 - Math.pow(1 - k, 2.2)))); m.material.opacity = .85 * (1 - k) * smooth(a / .06); });
      const kf = clamp(age / life); foam.scale.setScalar(scale * (.5 + 2.4 * smooth(age / .5))); foam.material.opacity = .8 * (1 - smooth((kf - .15) / .6));
      for (const d of drops) { const a = age - d.d; d.s.visible = a > 0; if (!d.s.visible) continue; const y = d.v.y * a - 9 * a * a; d.s.visible = y > -.2; d.s.position.set(d.v.x * a, y, d.v.z * a); d.s.scale.setScalar(d.sc * (1 + a * 1.2)); d.s.material.opacity = .9 * (1 - clamp(a / 1.4)); }
    },
  };
}

// много мелких кругов: у каждого своё время начала t0. Яркость кольца = его «прозрачность» (аддитивное смешение).
export function multiSplash(parent, { points, life = .9, grow = 1.6, color = 0xeaf6ff, lift = .03 } = {}) {
  const n = points.length, im = new THREE.InstancedMesh(ringGeo(), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }), n);
  im.frustumCulled = false; parent.add(im);
  const d = new THREE.Object3D(), c = new THREE.Color(), base = new THREE.Color(color), up = V(0, 1, 0);
  for (let i = 0; i < n; i++) im.setColorAt(i, c.setRGB(0, 0, 0));
  im.setTime = t => {
    for (let i = 0; i < n; i++) {
      const p = points[i], a = t - p.t0, k = a / (p.life || life), on = a >= 0 && k < 1, s = (p.size || .4) * (.25 + grow * (1 - Math.pow(1 - clamp(k), 2)));
      d.position.copy(p.pos); if (p.normal) { d.quaternion.setFromUnitVectors(up, p.normal); d.position.addScaledVector(p.normal, lift); } else { d.quaternion.identity(); d.position.y += lift; }
      d.scale.setScalar(on ? s : 1e-4); d.updateMatrix(); im.setMatrixAt(i, d.matrix);
      im.setColorAt(i, on ? c.copy(base).multiplyScalar(.75 * (1 - k)) : c.setRGB(0, 0, 0));
    }
    im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true;
  };
  im.setTime(-1);
  return im;
}

// предмет на воде: плывёт по течению из pos, покачивается и чуть поворачивается
export function floatBob(obj, t, { pos, dir = [0, 0, 1], speed = 1.2, amp = .05, sink = .08, tilt = .18, seed = 0 } = {}) {
  const p = V(pos.x + dir[0] * speed * t, pos.y - sink + amp * Math.sin(t * 2.6 + seed), pos.z + dir[2] * speed * t);
  obj.position.copy(p); obj.rotation.set(Math.PI / 2 + tilt * Math.sin(t * 1.9 + seed), .4 * t + seed, tilt * Math.cos(t * 2.3 + seed * 2));
  return p;
}
