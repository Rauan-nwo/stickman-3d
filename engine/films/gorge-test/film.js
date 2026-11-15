// gorge-test — проверочный фильм мира V002 (без звука, ~21 с): обходит все ракурсы теми движениями камеры, что нужны
// постановке. Персонажей нет: на их местах столбики-заглушки (синие и красные).
//   node engine/tools/build.mjs engine/films/gorge-test
//   node engine/tools/render.mjs engine/out/gorge-test/film.html engine/out/gorge-test/raw.mp4
//   --set mode=look : слайд-шоу ракурсов, кадр i = ракурс i (для look_*.jpg; см. tools в ROUNDS.md)
import { THREE, V, look, keyed, withMods, handheld, shake, sequence, E, seg, clamp, lerp, smooth, rng } from 'engine';
import { gorgeBridge } from '../../src/sets/gorgeBridge.js';
import { swingTree } from '../../src/sets/swingTree.js';
import { createDrum } from '../../src/props/drum.js';
import { waterSplash, multiSplash, floatBob } from '../../src/vfx/waterSplash.js';
import { dustRings } from '../../src/vfx/dustRings.js';
import { fallingPebble, boltPop, splinters } from '../../src/vfx/debris.js';
import { chalkCounter, spyglassMask, spyglassThrough, lensZoom } from '../../src/vfx/overlay2d.js';

export default {
  fps: 30, size: [720, 1280],
  options: { mode: 'film' },
  setup(stage, options) {
    const g = gorgeBridge(stage), sw = swingTree(stage, { origin: [0, 0, 0] });
    const B = g.bridge, cam = (n, o) => g.cam(n, o);
    // ---------- заглушки персонажей ----------
    const postGeo = new THREE.BoxGeometry(.3, 1.7, .16); postGeo.translate(0, .85, 0);
    const mk = (n, c) => { const im = new THREE.InstancedMesh(postGeo, new THREE.MeshStandardMaterial({ color: c, roughness: .8 }), n); im.castShadow = true; im.frustumCulled = false; g.group.add(im); return im; };
    const d = new THREE.Object3D(), put = (im, i, p, rot = 0, s = 1) => { d.position.copy(p).sub(g.origin); d.rotation.set(0, 0, rot); d.scale.setScalar(s); d.updateMatrix(); im.setMatrixAt(i, d.matrix); };
    const fixedBlue = ['captainHook', 'captain', 'colonel', 'captainGate', 'farCaptain', 'farColonel'], blue = mk(fixedBlue.length + 190, 0x2f55a8);
    fixedBlue.forEach((k, i) => put(blue, i, g.spots[k]));
    for (let r = 0; r < 38; r++) for (let f = 0; f < 5; f++) put(blue, fixedBlue.length + r * 5 + f, g.column(r + 3, f));
    const red = mk(2 + 16 * 70, 0xb5262a); put(red, 0, g.spots.general); put(red, 1, g.spots.adjutant);
    for (let r = 0; r < 16; r++) for (let f = 0; f < 70; f++) put(red, 2 + r * 70 + f, g.valleyRow(r, f));
    // красный строй на настиле: 30 рядов по 4, стоит на deckPoint (вместе с волной); после рывка летит
    const ROWS = 30, deck = mk(ROWS * 4, 0xb5262a), rr = rng(12), fly = []; for (let i = 0; i < ROWS * 4; i++) fly.push({ v: V((rr() - .5) * 7, 9 + rr() * 9, (rr() < .5 ? -1 : 1) * (2 + rr() * 6)), spin: (rr() - .5) * 9 });
    const T_BUCK = 19.45;
    function deckArmy(t, on) {
      deck.visible = on; if (!on) return;
      for (let r = 0; r < ROWS; r++) for (let f = 0; f < 4; f++) {
        const i = r * 4 + f, u = .08 + r * .029, dp = B.deckPoint(u, (f - 1.5) * .42), a = t - T_BUCK - .05 - Math.abs(u - .5) * .25;
        if (a > 0) { const q = fly[i]; dp.pos.x += q.v.x * a; dp.pos.y += q.v.y * a - 4.9 * a * a; dp.pos.z += q.v.z * a; put(deck, i, dp.pos, q.spin * a); }
        else put(deck, i, dp.pos, Math.atan2(-dp.normal.x, dp.normal.y));
      }
      deck.instanceMatrix.needsUpdate = true;
    }
    // ---------- пропсы и эффекты ----------
    const drum = createDrum(stage); g.group.add(drum.group);
    const local = p => p.clone().sub(g.origin);
    const splash = waterSplash(g.group, { pos: local(g.spots.splash), scale: 1.3 });
    const pebble = fallingPebble(g.group, { pos: local(B.deckPoint(.515, .18, .04).pos), v: [.25, .2, .1], g: 30, size: .07 });
    const bootPts = []; for (let f = 0; f < 26; f++) for (const dz of [-.12, .12]) bootPts.push(local(g.valleyRow(0, 22 + f)).add(V(.25, 0, dz)));
    const rings = dustRings(g.group, { points: bootPts, size: .34 });
    const boltAt = [3, 6, 11, 14].map(i => ({ i, side: i % 2 ? 1 : -1 })), bolts = boltPop(g.group, { envTex: stage.envTex, size: 2.2, points: boltAt.map((b, k) => ({ pos: local(B.hangerTop(b.i, b.side)), dir: [0, 1, b.side * .8], t0: 18.75 + k * .2 })) });
    const chips = splinters(g.group, { pos: V(0, 0, 0), n: 70, spread: [14, 2] });
    const rs = rng(31), rain = []; for (let i = 0; i < 90; i++) rain.push({ pos: local(g.river.point(-6 + rs() * 26, (rs() - .5) * 13)), t0: 20.25 + rs() * 1.1, size: .9 + rs() * .9, life: 1.1 });
    const drops = multiSplash(g.group, { points: rain, grow: 2.2 });
    const fallers = mk(60, 0xb5262a), fs = rng(8), FALL = []; for (let i = 0; i < 60; i++) FALL.push({ x: -8 + fs() * 26, z: (fs() - .5) * 10 + 4, t0: 19.6 + fs() * 1.2, spin: (fs() - .5) * 8 });

    // ---------- движение моста ----------
    const F = 2.1;                                                         // частота шага, Гц
    const wave = (t, amp) => ({ amp, wavelength: 26, phase: 2 * Math.PI * F * t, standing: .35, sway: amp * .25 * Math.sin(2 * Math.PI * F * .5 * t), chainLag: .5 });
    const buck = t => { const a = t - T_BUCK; return a < 0 ? wave(t, lerp(.5, .9, seg(t, 18.6, T_BUCK))) : { ...wave(t, .9 * Math.exp(-a * 2)), buck: 7.5 * Math.exp(-a * 1.6) * Math.sin(clamp(a * 5) * Math.PI / 2) * Math.cos(a * 5.2), buckAt: .55, twist: .18 * Math.sin(a * 9) * Math.exp(-a * 1.5) }; };

    // ---------- камера ----------
    const T = { est: 3.3, chain: 5.0, plank: 6.2, down: 6.9, ridge: 8.2, spy: 9.0, valley: 9.9, boots: 11.0, gate: 11.8, side: 12.6, under: 15.0, sign: 16.0, swing: 16.8, buck: 18.6, top: 20.0, end: 21.4 };
    const D0 = g.spots.drumStart, T_THROW = .23, T_SPLASH = 1.75, DT = T_SPLASH - T_THROW, GD = 58, sp = g.spots.splash;
    const dv = [(sp.x - D0.x) / DT, (sp.y - D0.y + .5 * GD * DT * DT) / DT, (sp.z - D0.z) / DT];
    const drumPos = t => { const a = clamp(t - T_THROW, 0, DT); return [D0.x + dv[0] * a, D0.y + dv[1] * a - .5 * GD * a * a, D0.z + dv[2] * a]; };
    const hookCam = t => {
      const k = keyed([[0, cam('hookSky')], [.55, cam('hookEdge'), E.inOutCubic], [1.0, look([-3.9, 1.1, 2.9], [-5.0, -3, 5], 50), E.inOutSine], [1.6, cam('hookDive'), E.inOutCubic], [1.95, cam('hookDive', { fov: 46 })], [2.3, cam('hookHorizon'), E.inOutExpo], [2.62, cam('hookHorizon', { fov: 36 })], [2.95, cam('hookFace'), E.inOutCubic], [3.3, cam('hookFace', { fov: 42 })]])(t);
      if (t > .3 && t < 1.6) { const p = drumPos(t), w = smooth(seg(t, .3, .55)) * (1 - smooth(seg(t, 1.3, 1.6))); k.target = k.target.map((v, i) => lerp(v, p[i], w)); }   // трекинг: барабан в центре кадра
      return k;
    };
    const SWT = [17.0, 17.4, 17.8, 18.2], swingAng = t => { let a = .12 * Math.sin((t - 16.8) * 7.85); SWT.forEach((p, i) => { if (t >= p) a = (.3 + i * .38) * Math.sin((t - p) * 7.85); }); return a; };

    const film = {
      duration: T.end,
      scenes: [
        { id: 'hook', from: 0, to: T.est, set: g, camera: withMods(hookCam, shake(T_SPLASH, .5)),
          update(t, f) {
            g.enemyDust.set(.05 + t * .01, t);
            if (t < T_THROW) drum.pose({ pos: local(D0).add(V(0, .12 * Math.sin(t * 9), 0)), rot: [.5, t, .3] }); else if (t < T_SPLASH) drum.tumble(t - T_THROW, { from: local(D0), v: dv, g: GD, spin: [9, 4, 6], rot0: [.5, T_THROW, .3] }); else floatBob(drum.body, t - T_SPLASH, { pos: local(sp), speed: 1.5 });
            drum.sticks(t - .5, { at: { pos: local(V(...drumPos(.5))), rot: [.5 + 9 * .27, T_THROW + 4 * .27, .3 + 6 * .27] }, g: 30 });
            splash.setAge(t - T_SPLASH);
            f.look.focus = t < 1.3 ? 2 : t < 2.0 ? 40 : t < 2.7 ? 300 : 2.05; f.look.aperture = t < 1.3 ? .003 : t < 2.7 ? .00004 : lerp(.00004, .012, smooth(seg(t, 2.7, 3.0)));
          } },
        { id: 'establishing', from: T.est, to: T.chain, set: g, camera: keyed([[T.est, cam('establishing')], [T.chain, cam('establishingLow'), E.inOutSine]]), update(t, f) { g.focusOn(f.look, 'establishing'); g.enemyDust.set(.1, t); } },
        { id: 'chain', from: T.chain, to: T.down, set: g, camera: sequence([[T.chain, withMods(keyed([[T.chain, cam('chainLink')], [T.chain + .35, cam('chainLink')], [T.plank, cam('pylonTop'), E.inOutCubic]]), handheld(3, .4))], [T.plank, keyed([[T.plank, cam('plankClose', { fov: 56 })], [T.plank + .3, cam('plankClose'), E.outExpo], [T.down, cam('plankClose', { fov: 40 })]])]]),
          update(t, f) { g.focusOn(f.look, t < T.plank ? (t < T.chain + .6 ? 'chainLink' : 'pylonTop') : 'plankClose'); } },
        { id: 'down', from: T.down, to: T.ridge, set: g, camera: withMods(t => cam('deckDown', { roll: 0 }), handheld(5, .5)),
          update(t, f) { const p = pebble.setAge(t - T.down - .25); f.look.focus = Math.max(1.2, 1.15 - p.y); f.look.aperture = .0012; } },
        { id: 'ridge', from: T.ridge, to: T.spy, set: g, camera: keyed([[T.ridge, look([-69.5, g.anchors.ridge.pos[1] + .9, -95], [0, 0, 0], 44)], [T.spy - .15, cam('ridge'), E.outCubic], [T.spy, cam('ridge', { fov: 34 })]]),
          update(t, f) { g.focusOn(f.look, 'ridge'); g.bridge.setMotion(wave(t, .03)); deckArmy(t, true); }, over(t, f) { spyglassThrough(f.ctx, stage, seg(t, T.spy - .3, T.spy + .3), { cx: 392, cy: 560 }); } },
        { id: 'spyglass', from: T.spy, to: T.valley, set: g, camera: withMods(t => cam('spyglass', { fov: g.anchors.spyglass.fov * lensZoom(seg(t, T.spy - .3, T.spy + .3)) }), handheld(7, .12, 1.2)),
          update(t, f) { g.focusOn(f.look, 'spyglass'); g.bridge.setMotion(wave(t, .03)); deckArmy(t, true); g.shadowFit(V(0, 0, 0), 70); }, over(t, f) { spyglassThrough(f.ctx, stage, seg(t, T.spy - .3, T.spy + .3), {}); } },
        { id: 'valley', from: T.valley, to: T.boots, set: g, camera: keyed([[T.valley, look([-61.2, g.anchors.valley.pos[1] - 2.3, -89.6], [-150, 8, -20], 46)], [T.boots, cam('valley'), E.inOutSine]]), update(t, f) { g.focusOn(f.look, 'valley'); } },
        { id: 'boots', from: T.boots, to: T.gate, set: g, camera: withMods(t => cam('valleyBoots'), shake(T.boots + .3, .9)), update(t, f) { g.focusOn(f.look, 'valleyBoots'); rings.setAge(t - T.boots - .3, stage.camera); } },
        { id: 'gate', from: T.gate, to: T.side, set: g, camera: keyed([[T.gate, cam('bridgeEntrance')], [T.side, cam('entranceBack'), E.inOutCubic]]), update(t, f) { g.focusOn(f.look, 'bridgeEntrance'); } },
        { id: 'side', from: T.side, to: T.under, set: g, camera: withMods(keyed([[T.side, cam('sideWide')], [T.under, cam('sideWide', { fov: 36 }), E.inOutSine]]), handheld(2, .2)),
          update(t, f) { g.focusOn(f.look, 'sideWide'); g.bridge.setMotion(wave(t, .5 * E.inCubic(seg(t, T.side, T.under - .2)))); deckArmy(t, true); } },
        { id: 'under', from: T.under, to: T.sign, set: g, camera: withMods(t => cam('underBridge'), handheld(4, .3)), update(t, f) { g.focusOn(f.look, 'underBridge'); g.bridge.setMotion(wave(t, .5)); deckArmy(t, true); } },
        { id: 'sign', from: T.sign, to: T.swing, set: g, camera: keyed([[T.sign, cam('signWide')], [T.sign + .35, cam('sign'), E.outExpo], [T.swing, cam('sign', { fov: 36 })]]), update(t, f) { g.sign.show(true); g.focusOn(f.look, 'sign'); } },
        { id: 'swing', from: T.swing, to: T.buck, set: sw, camera: keyed([[T.swing, sw.cam('pov')], [18.0, sw.cam('pov')], [T.buck, sw.cam('povUp'), E.inOutSine]]), update(t) { sw.swing.setAngle(swingAng(t)); } },
        { id: 'buck', from: T.buck, to: T.top, set: g, camera: withMods(keyed([[T.buck, cam('sideFlat')], [T_BUCK, cam('sideFlat', { fov: 36 })], [T.top, look([0, 6, 66], [0, 7, 0], 44), E.outCubic]]), shake(T_BUCK, 1.4)),
          update(t, f) {
            g.focusOn(f.look, 'sideFlat'); g.bridge.setMotion(buck(t)); deckArmy(t, true);
            bolts.setOrigins(boltAt.map(b => local(B.hangerTop(b.i, b.side)))); bolts.setTime(t); chips.setAge(t - T_BUCK, local(B.deckPoint(.55, 0).pos));
          },
          over(t, f) { chalkCounter(f.ctx, stage, { t, items: [38, 39, 40, 41].map((n, i) => ({ text: n, t0: 18.62 + i * .27, x: 120 + i * 158, y: 330 - i * 14, size: i === 3 ? 100 : 78, seed: n, underline: i === 3 })) }); } },
        { id: 'top', from: T.top, to: T.end, set: g, camera: withMods(t => cam('topDown'), handheld(6, .3)),
          update(t, f) {
            g.focusOn(f.look, 'topDown'); drops.setTime(t); floatBob(drum.body, t - 16, { pos: local(g.river.point(-22, 1.5)), speed: 1.6 }); drum.body.scale.setScalar(2.2); drum.sticks(-1);
            FALL.forEach((q, i) => { const a = t - q.t0, y = Math.max(-61, 4 - 30 * Math.max(0, a) * Math.max(0, a) * .5 - 14 * Math.max(0, a)); put(fallers, i, V(q.x, a < 0 ? -200 : y, q.z).add(g.origin), q.spin * a); }); fallers.instanceMatrix.needsUpdate = true;
          } },
      ],
    };
    for (const s of film.scenes) { const u = s.update; s.update = (t, f) => { deckArmy(t, false); drum.group.visible = s.id === 'hook' || s.id === 'top'; fallers.visible = s.id === 'top'; drum.body.scale.setScalar(1); splash.setAge(-1); pebble.setAge(-1); rings.setAge(-1); bolts.setTime(-1); chips.setAge(-1); drops.setTime(-1); if (u) u(t, f); }; }   // эффекты не помнят прошлый кадр: всё гасится и включается заново

    if (String(options.mode) !== 'look') return film;
    // ---------- режим look: кадр i = ракурс i ----------
    const gn = Object.keys(g.anchors), sn = Object.keys(sw.anchors), N = gn.length + sn.length, at = t => clamp(Math.round(t * 30), 0, N - 1);
    return {
      duration: N / 30,
      scenes: [
        { id: 'look', from: 0, to: gn.length / 30, set: g, camera: t => cam(gn[at(t)]),
          update(t, f) {
            const n = gn[at(t)]; g.focusOn(f.look, n); g.enemyDust.set(n.startsWith('hook') ? .1 : .85, 1.3); g.sign.show(n.startsWith('sign'));
            const onDeck = ['sideWide', 'sideFlat', 'underBridge', 'deckTop', 'deckCrane', 'spyglass', 'ridge', 'topDown'].includes(n);
            deckArmy(0, onDeck); if (onDeck) { g.bridge.setMotion({ amp: .45, wavelength: 26, phase: 1.1, standing: .35 }); deckArmy(0, true); }
            drum.group.visible = n === 'hookSky' || n === 'riverSurface'; fallers.visible = false;
            if (n === 'hookSky') drum.pose({ pos: local(D0), rot: [.5, .3, .3] }); else { floatBob(drum.body, 1, { pos: local(g.river.point(24, .5)), speed: 1 }); drum.sticks(-1); }
            splash.setAge(n === 'hookDive' ? .5 : -1); if (n === 'valleyBoots') rings.setAge(.2, stage.camera); else rings.setAge(-1);
          } },
        { id: 'lookSwing', from: gn.length / 30, to: N / 30, set: sw, camera: t => sw.cam(sn[at(t) - gn.length]), update() { sw.swing.setAngle(.55); } },
      ],
    };
  },
};
