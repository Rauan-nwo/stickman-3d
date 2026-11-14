// mineGallery.js — декорация B «светлая галерея»: торцевая стена из плит (в неё летит самородок), боковые стены,
// светлый свод, столб с фонарём, ящик «CANDLES», пень, бутылки. Напарник сидит на правом краю ящика.
// Средний цвет кадра эталона здесь ≈ RGB 137/95/62 (см. wiki/craft/staging-and-camera.md §6).
//
//   const gal = mineGallery(stage, { origin: [100, 0, 0] });   // origin разносит декорации в мире (и сдвигает мировой шум материалов)
//   gal.addCandle(u, v)        — свеча на кронштейне на торцевой стене (u — метры вдоль стены, v — высота)
//   gal.wall.hit(pos, dir)     — луч в торцевую стену -> точка попадания (мир)
//   gal.w(x, y, z)             — локальные координаты декорации -> мир
import * as THREE from 'three';
import { fbm3, vn3, rng } from '../core/rng.js';
import { smooth } from '../core/ease.js';
import { noise1 } from '../camera.js';
import { V, rockMaterial, ROCK, panelSheet, procMaterial, dirt, wood, stone, cyl, lantern, candleSconce, crate, stump, bottle, pot, glassMaterial } from './kit.js';
import { dustMotes } from '../vfx/dustMotes.js';

export function mineGallery(stage, { origin = [0, 0, 0], rock = ROCK.warmGallery, roofRock = ROCK.paleRoof } = {}) {
  const O = V(...origin);
  const setB = new THREE.Group(); setB.position.copy(O); stage.scene.add(setB);
  const rockB = rockMaterial(rock);
  const rockBceil = rockMaterial(roofRock);
  // end wall: a straight run through the hit point X (u = 3 m), nearer on the right; the camera ends up facing it 25 deg off-normal
  const XB = V(.09, 0, -4.39), EU = V(.819, 0, .574), EN = V(-EU.z, 0, EU.x), E0 = XB.clone().addScaledVector(EU, -3), EL = 5.9;   // EN points into the room
  const ROWS = [0, .42, .84, 1.26, 1.68, 2.12, 2.62, 3.3];
  const endDisp = (u, v) => {
    const k = v / 3.3;
    let d = .04 * (fbm3(u * .5 + 4, v * .7, 2.2, 3) - .5);
    d += .2 * smooth(1 - Math.abs(u - 2.2) / .3) * (.55 + .45 * Math.sin(v * 2.3 + 1));          // rounded buttress at the left edge of the final view
    d += .16 * smooth(1 - Math.abs(u - 1.1) / .5) * (.5 + .5 * Math.sin(v * 1.7));
    d += .24 * smooth(1 - Math.abs(u - 4.6) / .5) * (.6 + .4 * Math.cos(v * 2.1));
    d += .32 * smooth((k - .74) / .26) * (.6 + .4 * vn3(u * .9, 3, 1));                            // overhang near the roof
    return d;
  };
  const endSurf = (u, v) => E0.clone().addScaledVector(EU, u).add(V(0, v, 0));
  const endWall = panelSheet({ us: [-.5, .7, 1.85, 3.06, 4.2, 5.2, EL], vs: ROWS, seed: 4, mat: rockB, toward: V(0, 1.2, -2), relief: .04, bulge: .016, sub: 10, jit: .1, edgeP: .9, aoK: 2.6, surf: endSurf, disp: endDisp });
  setB.add(endWall);
  const sideDisp = sd => (u, v) => .09 * (fbm3(u * .5 + sd, v * .7, sd, 3) - .5) + .3 * smooth((v / 3.3 - .72) / .28);
  setB.add(panelSheet({ us: [-3.6, -2.4, -1.2, 0, 1.2, 2.4, 3.6], vs: ROWS, seed: 8, mat: rockB, toward: V(0, 1.2, 0), relief: .05, bulge: .02, sub: 8, jit: .1, edgeP: .9, aoK: 2.2, surf: (u, v) => V(2.35 + .15 * Math.sin(u * .9), v, u), disp: sideDisp(5) }));
  setB.add(panelSheet({ us: [-7, -5.8, -4.6, -3.4, -2.2, -1, .3, 1.6, 3.6], vs: ROWS, seed: 12, mat: rockB, toward: V(0, 1.2, -2), relief: .05, bulge: .02, sub: 8, jit: .1, edgeP: .9, aoK: 2.2, surf: (u, v) => V(-2.2 + .1 * Math.sin(u * .8), v, u), disp: sideDisp(9) }));
  setB.add(panelSheet({ us: [-3.2, -1.7, -.3, 1.1, 2.8], vs: [-7.4, -5.6, -4, -2.4, -.8, .9, 3.6], seed: 16, mat: rockBceil, toward: V(0, 1, -2), relief: .14, bulge: .03, sub: 6, jit: .22, edgeP: .9, surf: (u, v) => V(u, 3.02 - .05 * u, v) }));
  { // floor: dark packed dirt + pale rocks along the wall foot + one big rock in the foreground
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(8, 14), procMaterial({ color: 0xffffff, roughness: 1 }, dirt('.13,.13,.155', '.235,.235,.275', 2.2)));
    fl.rotation.x = -Math.PI / 2; fl.position.set(0, 0, -3); fl.receiveShadow = true; setB.add(fl);
    const r = rng(12);
    for (let i = 0; i < 46; i++) { const u = .6 + r() * 5.0, off = .12 + r() * r() * .9, p = endSurf(u, 0).addScaledVector(EN, off + endDisp(u, .1)); const s = .035 + r() * r() * .1; stone(setB, p.x, s * .5, p.z, s, i); }
    for (let i = 0; i < 12; i++) stone(setB, -.9 + r() * 2.6, .03, -3.6 + r() * 3.6, .03 + r() * .04, i + 50);
    stone(setB, .62, .13, -1.5, .23, 2, new THREE.MeshStandardMaterial({ color: 0xb09a80, roughness: .95, flatShading: false, emissive: 0x2e261e })); stone(setB, 1.6, .1, -2.3, .17, 1);
  }
  // timber: round post with a lantern at the left, a beam along the top of the end wall with pale stones on it
  const postB = procMaterial({ color: 0xffffff, roughness: .7 }, wood('vec3(9.,.5,9.)', '.50,.32,.13', '.90,.66,.32'));
  const beamB = procMaterial({ color: 0xffffff, roughness: .85 }, dirt('.62,.40,.20', '.84,.58,.31', .7));
  cyl(setB, .125, .14, 3.1, postB, -1.2, 1.55, -3.9, 18);
  { // a sloped ledge beam along the end wall (high at the far left, lower towards the right), with pale stones resting on it
    const ledge = (u0, h0, u1, h1, off, th, dp) => { const a = endSurf(u0, h0).addScaledVector(EN, off), b = endSurf(u1, h1).addScaledVector(EN, off), g = new THREE.Group(); g.position.copy(a).lerp(b, .5); g.rotation.y = Math.atan2(-EU.z, EU.x); setB.add(g);
      const m = new THREE.Mesh(new THREE.BoxGeometry(a.distanceTo(b), th, dp), beamB); m.rotation.z = Math.atan2(h1 - h0, u1 - u0); m.castShadow = m.receiveShadow = true; g.add(m); };
    ledge(.1, 3.4, 2.75, 2.62, .3, .18, .3); ledge(2.6, 2.5, 4.05, 2.16, .3, .18, .3); ledge(2.55, 2.7, 2.75, 2.42, .3, .18, .3);
    for (const [u, s, sd] of [[1.05, .08, 1], [2.25, .055, 2], [3.3, .045, 3]]) { const h = u < 2.7 ? 3.4 + (u - .1) * (2.62 - 3.4) / 2.65 : 2.5 + (u - 2.6) * (2.16 - 2.5) / 1.45; const p = endSurf(u, h + .09 + s * .6).addScaledVector(EN, .3); stone(setB, p.x, p.y, p.z, s, sd); }
  }
  const postLantern = lantern(setB, { pos: V(-1.06, 1.92, -3.72), light: { color: 0xffc68e, intensity: 2.4, distance: 5, decay: 1.7, pos: V(-.75, 1.95, -3.5) } });
  // buddy corner: stencilled crate (he sits on its right end), stump, bottles, a pot
  const SEAT = { x: -.57, y: .52, z: -3.5 };
  crate(setB, { x: -1.2, y: .26, z: -3.3, w: 1.0, h: .52, d: .82, ry: .1, lines: ['CANDLES', '40 LBS'] });
  stump(setB, { x: -.4, z: -3.14, r: .13, r1: .145, h: .21 });
  const glassM = glassMaterial(stage.envTex);
  for (const [dx, dz, h] of [[-.2, .24, .12], [-.06, .28, .13]]) bottle(setB, { x: -1.08 + dx, y: .52, z: -3.3 + dz, h, mat: glassM });
  pot(setB, { x: -1.42, y: .565, z: -3.05 });
  // a few floating dust motes
  const motes = dustMotes(setB, { n: 90, seed: 41, box: { x: [-1.3, 2.8], y: [.3, 2.2], z: [-.5, -5] } });
  // lights: soft ambient (roof is pale), a shadowed key from the upper left, warm sconces do the modelling
  const hemi = stage.both(new THREE.HemisphereLight(0xffd0b0, 0xdcdce8, .4)); setB.add(hemi);
  const key = stage.both(new THREE.DirectionalLight(0xfff6ee, .4)); key.position.set(-2.2, 5.5, 1.5); key.target.position.set(.4, 0, -4.2); setB.add(key, key.target);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: .5, far: 14 }); key.shadow.bias = -.0008; key.shadow.normalBias = .02; key.shadow.radius = 6;
  const fill = new THREE.PointLight(0xffb880, .55, 9, 1.4); fill.position.set(.9, 2.0, -1.9); setB.add(fill);
  setB.updateMatrixWorld(true);

  const w = (x, y, z) => V(x, y, z).add(O);                         // локальные -> мир
  const flames = [];
  // точка на торцевой стене (мир): луч по нормали к стене в параметрах (u, v); off — отступ от поверхности в комнату
  const onWall = (u, v, off = 0) => { const p = endSurf(u, v).addScaledVector(EN, .9).add(O); const h = new THREE.Raycaster(p, EN.clone().negate(), 0, 3).intersectObject(endWall, false)[0]; return (h ? h.point : p.addScaledVector(EN, -.9)).addScaledVector(EN, off); };
  return {
    name: 'mineGallery', group: setB, origin: O, w, flames, motes, postLantern,
    lights: { hemi, key, fill },
    wall: {
      mesh: endWall, U: EU.clone(), N: EN.clone(), E0: E0.clone(), length: EL, surf: endSurf, onWall,
      // координата u (метры вдоль стены) мировой точки
      uOf: p => p.clone().sub(O).sub(E0).dot(EU),
      // луч из pos по dir -> мировая точка попадания в стену (или null)
      hit(pos, dir, far = 40) { const h = new THREE.Raycaster(pos, dir, 0, far).intersectObject(endWall, false)[0]; return h ? h.point.clone() : null; },
    },
    addCandle(u, v) { const c = candleSconce(setB, { pos: onWall(u, v).sub(O), normal: EN, along: EU }); flames.push(c.flame); setB.updateMatrixWorld(true); return c; },
    seat: w(SEAT.x, SEAT.y, SEAT.z),                                  // точка сиденья напарника на ящике (мир)
    look: { bg: 0x1c110a, fogColor: 0x3a2414, fogDensity: .012, bloom: .3, exposure: 1, focus: 3, aperture: .006, maxblur: .013 },
    // эмбиент: пылинки и дрожание пламени свечей (фильм может добавить к rotation свой «порыв»)
    tick(t, st) {
      motes.tick(t, st);
      flames.forEach((f, i) => { f.scale.set(.04, .084 * (1 + .1 * noise1(70 + i, t * 9)), 1); f.material.rotation = .12 * noise1(80 + i, t * 6); });
    },
  };
}
