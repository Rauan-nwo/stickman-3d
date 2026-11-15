// dustRings.js: ряды пылевых колец из-под сапог, выстреливающие разом («two thousand boots land as one»).
//   const d = dustRings(parent, { points: [Vector3, ...] });   d.setAge(age, camera)   — все кольца одного возраста
// Кольцо — плоский мягкий «бублик» на земле + низкий клуб, повёрнутый к камере; растёт и тает за life секунд.
import * as THREE from 'three';
import { clamp, smooth } from '../core/ease.js';
import { canvasTex, softTex } from '../core/textures.js';

let _ring;
const ringTex = () => _ring || (_ring = canvasTex(128, 128, (x) => { const g = x.createRadialGradient(64, 64, 20, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.55, 'rgba(255,255,255,.9)'); g.addColorStop(.8, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); }));

export function dustRings(parent, { points, size = .5, life = .8, color = 0xe2cba4, puff = true, lift = .03 } = {}) {
  const n = points.length, g = new THREE.Group(); g.visible = false; parent.add(g);
  const flat = new THREE.InstancedMesh(new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: ringTex(), color, transparent: true, depthWrite: false }), n); flat.frustumCulled = false; g.add(flat);
  const puffs = puff ? new THREE.InstancedMesh(new THREE.PlaneGeometry(2, 1), new THREE.MeshBasicMaterial({ map: softTex(), color, transparent: true, depthWrite: false, side: THREE.DoubleSide }), n) : null;
  if (puffs) { puffs.frustumCulled = false; g.add(puffs); }
  const d = new THREE.Object3D(), wp = new THREE.Vector3();
  return {
    group: g, life,
    setAge(age, camera) {
      g.visible = age >= 0 && age < life; if (!g.visible) return;
      const k = clamp(age / life), s = size * (.35 + 1.9 * (1 - Math.pow(1 - k, 2.4)));
      for (let i = 0; i < n; i++) {
        const p = points[i]; d.position.set(p.x, p.y + lift, p.z); d.rotation.set(0, i * 1.7, 0); d.scale.setScalar(s); d.updateMatrix(); flat.setMatrixAt(i, d.matrix);
        if (puffs) { const yaw = camera ? Math.atan2(camera.position.x - p.x - g.getWorldPosition(wp).x, camera.position.z - p.z - wp.z) : 0; d.position.y = p.y + lift + s * .28; d.rotation.set(0, yaw, 0); d.scale.set(s * .9, s * .6 * (1 + k), 1); d.updateMatrix(); puffs.setMatrixAt(i, d.matrix); }
      }
      flat.instanceMatrix.needsUpdate = true; flat.material.opacity = .7 * smooth(age / .04) * (1 - k);
      if (puffs) { puffs.instanceMatrix.needsUpdate = true; puffs.material.opacity = .4 * smooth(age / .05) * (1 - k); }
    },
  };
}
