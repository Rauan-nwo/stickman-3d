// nugget.js: золотой самородок — комковатая икосфера с плоским шейдингом граней и свечением.
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { fbm3 } from '../core/rng.js';

export function nuggetGeo(r, seed, det = 3, fq = 1.7, amp = .8, flat = .8) {
  const g = new THREE.IcosahedronGeometry(r, det), p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n = v.clone().normalize(); v.multiplyScalar(1.02 - amp * .5 + amp * fbm3(n.x * fq + seed, n.y * fq, n.z * fq, 3)); v.y *= flat; p.setXYZ(i, v.x, v.y, v.z); }
  g.deleteAttribute('normal'); g.deleteAttribute('uv'); const m = mergeVertices(g, 1e-5); m.computeVertexNormals(); return m;
}
// яркое золото для мелкого самородка в руке и тусклое, «литое» — для крупного в полёте
export const goldBright = envTex => new THREE.MeshStandardMaterial({ color: 0xeaa91c, metalness: .85, roughness: .3, envMap: envTex, envMapIntensity: 1.1, emissive: 0x7a4a00, emissiveIntensity: .8 });
export const goldDeep = envTex => new THREE.MeshStandardMaterial({ color: 0xb8922a, metalness: .85, roughness: .38, envMap: envTex, envMapIntensity: .95, emissive: 0x2a1c00, emissiveIntensity: .25 });
// самородок на слое FG (поверх персонажей). opts: r, seed, det, fq, amp, flat, mat
export function createNugget(stage, { r = .021, seed = 2, det = 3, fq = 1.7, amp = .8, flat = .8, mat } = {}) {
  return stage.fg(new THREE.Mesh(nuggetGeo(r, seed, det, fq, amp, flat), mat || goldBright(stage.envTex)));
}
