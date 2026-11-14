// mineShaft.js — декорация A «тёмный штрек»: камера под висячей лампой, рельсы уходят в штрек слева, справа стойка с бурами.
// Герой стоит в начале координат лицом к +z (на шпале, y = 0.156), конус лампы падает на него сверху.
// Средний цвет кадра эталона здесь ≈ RGB 78/57/42 (см. wiki/craft/staging-and-camera.md §6).
//
//   const shaft = mineShaft(stage);            // { group, look, tick, lamp, plank, lights, stand }
//   сцена: { set: shaft, camera, ... }         // фильм-раннер сам включает группу и применяет shaft.look
import * as THREE from 'three';
import { fbm3, vn3, rng } from '../core/rng.js';
import { V, rockMaterial, ROCK, panelSheet, procMaterial, dirt, wood, woodMat, timberFrame, lantern, rails, rodRack, chalkMark, debris, stones, stone, paleStone, darkStone, hangingLamp, box } from './kit.js';

export function mineShaft(stage, { rock = ROCK.darkShaft } = {}) {
  const setA = new THREE.Group(); stage.scene.add(setA);
  const rockA = rockMaterial(rock);
  const dispA = (sd) => (u, v) => .5 * (fbm3(u * .42 + sd, v * 1.3, sd * 1.7, 3) - .5) + .16 * (vn3(u * 1.3, v * 1.3, sd) - .5);
  {
    const HT = 4.6, lean = v => 1.5 * Math.pow(Math.max(0, v) / HT, 2.4), yy = v => v * (1 - .1 * (v / HT) * (v / HT));
    const INSIDE = V(0, 1.5, 0);
    // back wall (bowl in plan, leans forward into the roof), with a hole for the drift on the left
    setA.add(panelSheet({ us: [-4.6, -3.3, -2.05, -.5, .55, 1.6, 2.6, 3.5, 4.6], vs: [0, .95, 1.9, 2.85, 3.7, HT], seed: 5, mat: rockA, toward: INSIDE, relief: .05, bulge: .035, sub: 8, edgeP: .5, jit: .16, aoK: 2.6,
      surf: (u, v) => V(u, yy(v), -4.75 + .12 * u * u + lean(v)), disp: dispA(3), skip: (u, v) => u > -2.05 && u < -.5 && v < 2.85 }));
    // right wall and left wall
    setA.add(panelSheet({ us: [-5, -3.8, -2.7, -1.6, -.5, .6, 1.8, 3, 4.2, 5.4], vs: [0, .95, 1.9, 2.85, 3.7, HT], seed: 9, mat: rockA, toward: INSIDE, relief: .05, bulge: .035, sub: 8, edgeP: .5, jit: .16, aoK: 2.6,
      surf: (u, v) => V(2.35 + .12 * Math.sin(u * .8 + 1) - lean(v), yy(v), u), disp: dispA(7) }));
    setA.add(panelSheet({ us: [-5, -3.6, -2.4, -1.2, 0, 1.2, 2.4, 3.6, 5.4], vs: [0, .95, 1.9, 2.85, 3.7, HT], seed: 13, mat: rockA, toward: INSIDE, relief: .05, bulge: .035, sub: 8, edgeP: .5, jit: .16, aoK: 2.6,
      surf: (u, v) => V(-2.95 + .12 * Math.sin(u * .7) + lean(v), yy(v), u), disp: dispA(11) }));
    // roof
    setA.add(panelSheet({ us: [-4.6, -3.2, -1.9, -.7, .5, 1.7, 3, 4.6], vs: [-5, -3.6, -2.3, -1, .3, 1.6, 3, 5.4], seed: 17, mat: rockA, toward: INSIDE, relief: .06, bulge: .04, sub: 8, edgeP: .5, jit: .16, aoK: 2.6,
      surf: (u, v) => V(u, 4.0 - .045 * u * u, v), disp: dispA(15) }));
    // floor: packed dirt
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(14, 26), procMaterial({ color: 0xffffff, roughness: 1 }, dirt('.27,.185,.13', '.50,.37,.27', 1.6)));
    fl.rotation.x = -Math.PI / 2; fl.position.set(0, 0, -6); fl.receiveShadow = true; setA.add(fl);
    // the drift behind the hole: a dark box
    const drift = new THREE.Mesh(new THREE.BoxGeometry(1.75, 2.9, 10), new THREE.MeshStandardMaterial({ color: 0x24130a, roughness: 1, side: THREE.BackSide }));
    drift.position.set(-1.28, 1.45, -9.3); setA.add(drift);
  }
  const woodPost = woodMat('vec3(9.,.5,9.)', '.30,.17,.07', '.60,.37,.17');
  const woodBeamX = woodMat('vec3(.5,9.,9.)', '.36,.20,.08', '.70,.42,.18');
  const woodBeamZ = woodMat('vec3(9.,9.,.5)', '.36,.20,.08', '.70,.42,.18');
  const paleWood = procMaterial({ color: 0xffffff, roughness: .8 }, wood('vec3(9.,.5,9.)', '.42,.34,.25', '.74,.64,.50'));
  // timber: drift frames (round posts + round cap), plank beam behind the miner
  timberFrame(setA, { x: -1.28, z: -4.18, half: .82, top: 2.72, r: .13, postMat: woodPost, capMat: woodBeamX });
  for (const [z, s] of [[-5.7, .95], [-7.2, .92], [-8.7, .9], [-10.2, .9]]) timberFrame(setA, { x: -1.28, z, half: .7 * s, top: 2.5 * s, r: .1, postMat: woodPost, capMat: woodBeamX });
  // plank beam behind the head (lit by the lamp)
  const plank = box(setA, 3.9, .2, .26, procMaterial({ color: 0xffffff, roughness: .85 }, wood('vec3(.5,9.,9.)', '.24,.13,.055', '.46,.27,.115')), -1.32, 2.38, -1.55);
  // lantern hanging in the drift (red body, bright glass)
  const driftLantern = lantern(setA, { pos: V(-1.72, 1.86, -8.5), body: { color: 0xa3261c, roughness: .5, metalness: .2 }, top: [.05, .08, .07, .12], bottom: [.085, .085, .05, -.12],
    glass: [.06, .18, 12], glow: [2.4, 2.0, 1.5], hang: { type: 'wire', len: .5, y: .4 }, light: { color: 0xffa860, intensity: .7, distance: 4.5, decay: 1.6, pos: V(-1.6, 1.8, -8.3) } });
  // rails + sleepers along a path that bends left into the drift; one sleeper sits under the hero's feet (z = -0.17)
  const track = rails(setA, { envTex: stage.envTex, pts: [V(0, 0, 7), V(0, 0, 3), V(0, 0, -2.9), V(-.25, 0, -3.7), V(-.9, 0, -4.5), V(-1.28, 0, -5.4), V(-1.28, 0, -13)] });
  // right-hand side: rack of drill rods (seen in the close-ups), the chalk mark, splintered timber debris, stones
  rodRack(setA, { x: 1.74, postMat: paleWood, beamMat: woodBeamZ });
  chalkMark(setA, { pos: V(1.98, 1.78, -.7), ry: -Math.PI / 2 });
  const rs = debris(setA, { x: 1.55, z: -3.3, n: 16, seed: 33 });
  const dk = darkStone();
  stones(setA, { n: 30, r: rs, place: r => { const sd = r() < .6 ? 1 : -1; return [sd * (.8 + r() * 1.3), .03, 1.6 - r() * 5.4, .035 + r() * .07]; }, mat: r => (r() < .5 ? dk : paleStone) });
  stone(setA, 1.2, .08, .95, .13, 2); stone(setA, 1.5, .06, .3, .1, 3); stone(setA, 2.0, .07, -3.0, .14, 1);
  // hanging lamp: shade + bright disc, real spot light with soft shadows, warm bounce lights
  const LAMP = V(0, 2.84, .12);
  const lamp = hangingLamp(setA, { pos: LAMP, envTex: stage.envTex, both: stage.both });
  const bounce = new THREE.PointLight(0xffc49c, 4.2, 13, 2); bounce.position.set(0, 2.45, .35); setA.add(bounce);          // spill of the lamp onto roof, beam and near walls
  const fgFill = new THREE.PointLight(0xffb078, .8, 8, 1.3); fgFill.layers.set(stage.FG); fgFill.position.set(-.6, 1.6, 1.8); setA.add(fgFill);   // lights only FG props
  const warmR = new THREE.PointLight(0xffb888, .9, 5, 1.6); warmR.position.set(1.3, 1.9, -.2); setA.add(warmR);
  const roofGlow = new THREE.PointLight(0xffbe92, 3.6, 9, 2); roofGlow.position.set(-.7, 3.2, -1.9); setA.add(roofGlow);
  const hemi = stage.both(new THREE.HemisphereLight(0xffc8a4, 0x40241a, .075)); setA.add(hemi);
  lamp.addCone(); lamp.addSparks();
  setA.updateMatrixWorld(true);
  return {
    name: 'mineShaft', group: setA, lamp, plank, track, driftLantern,
    lights: { spot: lamp.spot, bounce, fgFill, warmR, roofGlow, hemi },
    // вид по умолчанию для сцен в этой декорации (фильм может переопределить в scene.look или в update)
    look: { bg: 0x120a05, fogColor: 0x24130a, fogDensity: .028, bloom: .2, exposure: 1, focus: 3.7, aperture: .0012, maxblur: .012 },
    stand: V(0, .156, .0),                                        // куда ставить героя (верх шпалы)
    tick(t, st) { lamp.sparks.tick(t, st); },
  };
}
