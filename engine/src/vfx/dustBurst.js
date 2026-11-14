// dustBurst.js: лёгкая пыль от удара — дымка, уплывающая вдоль стены, и мелкие осколки. Не взрыв: негромкая «точка» в действии.
// pos — точка удара; normal — от стены; along — вдоль стены (дымку сносит в сторону -along); up — вверх.
import * as THREE from 'three';
import { rng } from '../core/rng.js';
import { smooth } from '../core/ease.js';
import { sprite } from '../core/particles.js';
import { softTex } from '../core/textures.js';
import { STONES } from '../sets/kit.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

export function dustBurst(parent, { pos, normal, along, up = V(0, 1, 0), nHaze = 9, nChips = 24, seeds = [21, 31], hazeColor = [.86, .7, .56], chipColor = 0xe6d8c6 }) {
  const HAZE = (() => { const r = rng(seeds[0]), a = []; for (let i = 0; i < nHaze; i++) { const s = sprite(parent, softTex(), { blending: THREE.NormalBlending, color: new THREE.Color(...hazeColor) }); a.push({ s, v: along.clone().multiplyScalar(-(.5 + r() * .7)).add(V(0, (r() - .4) * .16, 0)).addScaledVector(normal, .1 + r() * .2), sc: .14 + r() * .16, d: r() * .08, o: .08 + r() * .08 }); } return a; })();
  const chips = (() => { const r = rng(seeds[1]), arr = [], m = new THREE.MeshStandardMaterial({ color: chipColor, roughness: 1, flatShading: true, emissive: 0x4a4038 });
    for (let i = 0; i < nChips; i++) { const c = new THREE.Mesh(STONES[i % 4], m); c.scale.set(.007 + r() * .01, .003 + r() * .003, .006 + r() * .009); const a = r() * 6.28, sp = r() * 1.2;
      const d = normal.clone().multiplyScalar(.08 + r() * .22).addScaledVector(along, -(.4 + r() * 1.2) + Math.cos(a) * .4).addScaledVector(up, .3 + Math.sin(a) * .7); c.userData = { v: d.multiplyScalar(.9 + r() * 1.3), spin: V(r(), r(), r()).multiplyScalar(14) }; c.visible = false; parent.add(c); arr.push(c); }
    return arr; })();
  for (const d of HAZE) d.s.visible = false;
  return {
    haze: HAZE, chips,
    // age — секунды после удара
    setAge(age) {
      for (const d of HAZE) { const a = age - d.d; d.s.visible = a > 0; if (!d.s.visible) continue; const k = (1 - Math.exp(-2.2 * a)) / 2.2; d.s.position.copy(pos).addScaledVector(d.v, k).addScaledVector(along, -.22); d.s.scale.setScalar(d.sc * (.5 + 2.6 * (1 - Math.exp(-3 * a)))); d.s.material.opacity = d.o * smooth(a / .08) * Math.exp(-a * 1.5); }
      for (const ch of chips) { ch.visible = age > 0 && age < 1.2; if (!ch.visible) continue; const k = 1.6, p = pos.clone().addScaledVector(ch.userData.v, (1 - Math.exp(-k * age)) / k); p.y -= 2.4 * age * age; ch.position.copy(p); ch.rotation.set(ch.userData.spin.x * age, ch.userData.spin.y * age, 0); }
    },
  };
}
