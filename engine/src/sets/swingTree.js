// swingTree.js — маленькая солнечная вставка: трава, одно дерево, верёвочные качели, небо. Вид «от тебя» из-за спины толкающего.
// Качели качаются вдоль оси z: +угол — от камеры (к -z), -угол — на камеру. Ось подвеса — ветка на высоте pivotY.
//   const sw = swingTree(stage, { origin: [0, 0, 600] });
//   sw.swing.setAngle(rad)          угол качелей на этот кадр (чистая функция: фильм считает его из t)
//   sw.swing.seatPoint()            -> { pos, up, angle }  сиденье (мир) — сюда сажают ребёнка
//   sw.anchors.pov / povUp / side   ракурсы;  sw.cam(name, over)
import * as THREE from 'three';
import { rng, fbm3 } from '../core/rng.js';
import { look as camLook } from '../camera.js';
import { V, DAY, skyDome, sunRig, terrainMaterial, gridGeo, coniferGeo, foliageMat, bushGeo, scatter } from './outdoor.js';
import { woodMat } from './kit.js';

export function swingTree(stage, { origin = [0, 0, 0], pal = DAY } = {}) {
  const O = V(...origin), group = new THREE.Group(); group.position.copy(O); stage.scene.add(group);
  const w = (x, y, z) => V(x, y, z).add(O), time = { value: 0 };
  const sky = skyDome(group, { pal }), rig = sunRig(group, stage, { pal, mapSize: 2048 });
  // луг: пологие холмы, вдали выше
  const H = (x, z) => { const d = Math.hypot(x, z + 3); return 1.4 * (fbm3(x * .03, z * .03, 2.5, 3) - .5) * Math.min(1, d / 14) + 14 * Math.pow(Math.max(0, d - 45) / 120, 1.5); };
  const N = 90, span = 420, cc = i => { const k = i / (N - 1) * 2 - 1; return Math.sign(k) * Math.pow(Math.abs(k), 2.2) * span; };
  const mat = terrainMaterial({ grass: 1.6, sandD: 0x8f9a4e, sandL: 0xb3b765, grassD: 0x6b9434, grassL: 0x9cc24c, flat0: .2, flat1: .4 }).setOrigin(O);
  const meadow = new THREE.Mesh(gridGeo(N, N, (i, j) => { const x = cc(i), z = cc(j); return { p: V(x, H(x, z), z), loc: [x, 0, 0] }; }), mat); meadow.receiveShadow = true; meadow.frustumCulled = false; group.add(meadow);
  { const r = rng(9), list = [], fl = [];
    for (let i = 0; i < 160; i++) { const a = r() * 6.28, d = 38 + r() * 240, x = Math.cos(a) * d, z = Math.sin(a) * d - 3, h = 7 + r() * 8, t = .85 + r() * .3; list.push({ p: [x, H(x, z) - .2, z], s: [h * .9, h, h * .9], ry: r() * 6.28, c: [t, t, t] }); }
    scatter(group, coniferGeo(4, 6), foliageMat(), list);
    for (let i = 0; i < 26; i++) { const a = r() * 6.28, d = 5 + r() * 22, x = Math.cos(a) * d, z = Math.sin(a) * d - 3, s = .5 + r() * .7; fl.push({ p: [x, H(x, z) - .05, z], s: [s, s * .7, s], ry: r() * 6.28, c: [.85 + r() * .3, 1, .7 + r() * .3] }); }
    scatter(group, bushGeo(5), new THREE.MeshStandardMaterial({ color: 0x8fbf3e, roughness: .9 }), fl); }
  // дерево: ствол, ветка над качелями, крона из шаров
  const bark = woodMat('vec3(9.,.6,9.)', '.20,.13,.08', '.42,.29,.18'), TX = -2.3, TZ = -1.2, PY = 3.5;
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.27, .42, 5.2, 14), bark); trunk.position.set(TX, 2.6, TZ); trunk.castShadow = trunk.receiveShadow = true; group.add(trunk);
  const branch = new THREE.Mesh(new THREE.CylinderGeometry(.1, .17, 3.9, 10), bark); branch.rotation.z = Math.PI / 2 - .06; branch.position.set(TX + 1.9, PY + .08, TZ + .05); branch.castShadow = true; group.add(branch);
  { const r = rng(21), list = []; for (let i = 0; i < 16; i++) { const a = r() * 6.28, d = r() * 2.2, s = 1.7 + r() * 1.5; list.push({ p: [TX + .4 + Math.cos(a) * d, 5.2 + r() * 2.4, TZ + Math.sin(a) * d * .9], s: [s, s * .85, s], ry: r() * 6.28, c: [.8 + r() * .35, .95 + r() * .1, .75 + r() * .3] }); }
    scatter(group, bushGeo(8, 7), new THREE.MeshStandardMaterial({ color: 0x5f9a36, roughness: .95 }), list); }
  // качели
  const SX = 0, SZ = TZ + .05, LEN = 2.75, HW = .3;
  const pivot = new THREE.Group(); pivot.position.set(SX, PY, SZ); group.add(pivot);
  const ropeM = new THREE.MeshStandardMaterial({ color: 0xd9c7a0, roughness: .9 });
  for (const sx of [-1, 1]) { const rp = new THREE.Mesh(new THREE.CylinderGeometry(.016, .016, LEN, 6), ropeM); rp.position.set(sx * HW, -LEN / 2, 0); rp.castShadow = true; pivot.add(rp); }
  const seat = new THREE.Mesh(new THREE.BoxGeometry(HW * 2 + .16, .045, .24), woodMat('vec3(.6,8.,8.)', '.50,.33,.17', '.80,.60,.36')); seat.position.set(0, -LEN, 0); seat.castShadow = true; pivot.add(seat);
  let ang = 0;
  const swing = {
    pivot, seat, length: LEN, pivotPos: w(SX, PY, SZ),
    setAngle(a) { ang = a; pivot.rotation.x = a; pivot.updateMatrixWorld(true); return swing; },
    seatPoint() { return { pos: w(SX, PY - Math.cos(ang) * LEN + .03, SZ - Math.sin(ang) * LEN), up: V(0, Math.cos(ang), Math.sin(ang)), angle: ang }; },
  };
  const A = (pos, target, fov, note) => ({ pos: pos.toArray(), target: target.toArray(), fov, focus: pos.distanceTo(target), aperture: .0012, note });
  const anchors = {
    pov: A(w(.12, 1.52, 2.25), w(0, 1.25, SZ), 56, 'вид «от тебя»: качели перед камерой, рука входит снизу'),
    povUp: A(w(.12, 1.52, 2.25), w(0, 4.6, SZ - 1.8), 56, 'камера задирается: качели уходят за верх кадра'),
    side: A(w(6.2, 1.6, SZ + .4), w(0, 2.0, SZ), 44, 'сбоку: дуга качелей (склейка по форме с дугой моста)'),
  };
  const set = {
    name: 'swingTree', group, origin: O, w, swing, anchors, sky, sun: rig, hand: w(.1, 1.05, 1.35),
    cam: (name, over = {}) => ({ ...camLook(anchors[name].pos, anchors[name].target, anchors[name].fov), ...over }),
    look: { bg: pal.horizon, fogColor: pal.haze, fogDensity: .003, exposure: 1, bloom: .1, bloomRadius: .4, bloomThreshold: .97, dof: true, focus: 3.5, aperture: .0012, maxblur: .006, vignette: .3, near: .08, far: 3000 },
    tick(t, st) { time.value = t; sky.follow(st.camera); swing.setAngle(0); rig.fit(w(0, 1.5, SZ), 16); },
  };
  group.updateMatrixWorld(true);
  return set;
}
