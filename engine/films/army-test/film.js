// army-test — проверочный фильм состава и толпы V002 (16 с, без звука): ровная земля с туманом.
//   0.0–2.5   200 красных идут строем на камеру и мимо, барабанщики впереди      2.5–4.3  то же сбоку
//   4.3–5.6   сверху                                                               5.6–7.0  со спины
//   7.0–9.6   150 синих бредут вразнобой; на 8.3–9.0 — гэг «шарики»                9.6–11.2 сапоги крупно: разом, потом «дождём»
//   11.2–12.4 бросок барабана    12.4–13.4 полковник хватает за воротник           13.4–14.4 хохот генерала со слезами
//   14.4–16.4 десять красных подпрыгивают всё выше и улетают в небо
// Параметры: ?red=1000&blue=150 — размер толп (замер скорости):  node tools/render.mjs film.html out.mp4 --set red=1000
//   node engine/tools/build.mjs engine/films/army-test && node engine/tools/render.mjs engine/out/army-test/film.html engine/out/army-test/raw.mp4
import { THREE, V, Actor, drawActors, look, keyed, withMods, handheld, E, seg, smooth, clamp, lerp, hash } from 'engine';
import { captain, colonel, general, aide, soldierRed, soldierBlue, drummer } from 'engine/chars/presetsArmy.js';
import { SHUFFLES } from 'engine/chars/gaits.js';
import { ACT } from 'engine/chars/actions.js';
import { Crowd } from 'engine/chars/crowd.js';
import { bootsRow } from 'engine/chars/closeups.js';

export default {
  fps: 30, size: [720, 1280], duration: 16.4,
  options: { red: 200, blue: 150 },
  setup(stage, options) {
    const NR = +options.red, NB = +options.blue;
    // ---------- земля и небо ----------
    const g = new THREE.Group(); stage.add(g);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshStandardMaterial({ color: 0xc9a56c, roughness: 1 })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; g.add(ground);
    g.add(new THREE.HemisphereLight(0xcfe4ff, 0x9a7a4a, 1.5)); const sun = new THREE.DirectionalLight(0xfff0d8, 2.2); sun.position.set(6, 10, 4); g.add(sun);
    const field = { group: g, look: { bg: 0xa9cdee, fogColor: 0xbdd3e6, fogDensity: .018, bloom: 0, dof: false, exposure: 1, far: 400, vignette: .6 } };

    // ---------- красные: строй 8 в ряд, барабанщики в первом ряду; все в одной фазе ----------
    const COLS = 8, DX = 1.15, DZ = 1.5, SPEED = 1.5, RATE = 1.9;
    const red = new Crowd(stage, {
      count: NR, rate: RATE, offset: 0, shadow: {}, haze: .55,
      clips: [{ char: soldierRed(), gait: 'march', opt: { musket: true } }, { char: drummer(), pose: (ch, ph, vw) => ACT.drumming(ch, 0, { phase: ph, ...vw }) }],
      clip: i => (i < COLS && (i % 2 === 1) ? 1 : 0),
      pos: (i, t, out) => out.set((i % COLS - (COLS - 1) / 2) * DX, 0, -Math.floor(i / COLS) * DZ + SPEED * t),
      heading: 0,
    });
    // ---------- синие: шесть лиц x шесть походок, фазы вразнобой, идут в +X ----------
    const blue = new Crowd(stage, {
      count: NB, rate: 1.25, offset: 'random', shadow: {}, haze: .55,
      clips: SHUFFLES.map((gt, k) => ({ char: soldierBlue(k), gait: gt })),
      clip: i => Math.floor(hash(i * 5.3 + 2) * 6),
      pos: (i, t, out) => { const r = Math.floor(i / 10), c = i % 10, sp = .5 + .5 * hash(i * 1.7); return out.set(-9 + c * 1.5 + (hash(i * 9.1) - .5) * 1.1 + sp * (t - 7), 0, -r * 1.25 + (hash(i * 4.3) - .5) * .9); },
      heading: Math.PI / 2,
      marbles: (i, t) => { const a = 8.3 + hash(i * 2.9) * .12; return smooth(seg(t, a, a + .1)) * (1 - smooth(seg(t, 8.95, 9.05))); },
      state: (i, t, m) => { if (m.marble > .5) m.pos.x += (t - 8.3) * 1.4 * hash(i * 6.1); },
    });
    // ---------- десять красных на «настиле»: подпрыгивают всё выше, потом улетают ----------
    const T_J = 14.4, T_FLY = 15.5;
    const jump = new Crowd(stage, {
      count: 10, shadow: {},
      clips: [{ char: soldierRed(), pose: (ch, ph, vw) => ACT.bounce(ch, ph * .5, { period: .5, amp: 150, lift: false, face: 'grin', ...vw }) },
        { char: soldierRed(), gait: 'flail' }],
      phase: (i, t) => (t - T_J) / .5 + (t > T_FLY ? i * .37 : 0),
      clip: (i, t) => (t > T_FLY ? 1 : 0),
      pos: (i, t, out) => {
        const x = (i - 4.5) * 1.0, per = .5, q = ((t - T_J) / per) % 1, n = Math.floor((t - T_J) / per), amp = .12 + .14 * n, h = q < .28 ? 0 : 4 * ((q - .28) / .72) * (1 - (q - .28) / .72);
        if (t <= T_FLY) return out.set(x, h * amp, 0);
        const a = t - T_FLY, vx = (hash(i * 3.3) - .5) * 5, vy = 9 + 4 * hash(i * 7.7);
        return out.set(x + vx * a, 1.1 + vy * a - 4.9 * a * a, -a * 2 * hash(i * 1.3));
      },
      heading: Math.PI,                                                       // лицом к камере (камера смотрит в -Z из +Z... см. camJ)
      state: (i, t, m) => { if (t > T_FLY) { m.air = true; m.rot = (t - T_FLY) * (3 + 5 * hash(i * 2.1)) * (i % 2 ? 1 : -1); m.ground = 0; } else m.ground = 0; },
    });
    // ---------- герои ----------
    const cap = new Actor(stage, captain()).at(V(60, 0, 0)), col = new Actor(stage, colonel()).at(V(61.35, 0, 0));
    const gen = new Actor(stage, general()).at(V(80, 0, 0)), ad = new Actor(stage, aide()).at(V(81.4, 0, -.5));

    const cam = (ks, hh = .25) => withMods(keyed(ks), handheld(3, hh, .7));
    return {
      scenes: [
        { id: 'red-front', from: 0, to: 2.5, set: field, camera: cam([[0, look([.3, 1.25, 9.5], [0, 1.2, 0], 50)], [2.5, look([.3, 1.25, 8.6], [0, 1.2, 0], 50), E.linear]]), props: [red.shadow], update: t => red.update(t), chars: t => red.draw(t) },
        { id: 'red-side', from: 2.5, to: 4.3, set: field, camera: cam([[2.5, look([11, 1.5, -1], [0, 1.1, 0], 46)], [4.3, look([11, 1.5, 3], [0, 1.1, 2], 46), E.linear]]), props: [red.shadow], update: t => red.update(t), chars: t => red.draw(t) },
        { id: 'red-top', from: 4.3, to: 5.6, set: field, camera: cam([[4.3, look([0, 19, 1.5], [0, 0, 1.2], 50)], [5.6, look([0, 16, 3.5], [0, 0, 3.2], 50), E.linear]], .1), props: [red.shadow], update: t => red.update(t), chars: t => red.draw(t) },
        { id: 'red-back', from: 5.6, to: 7.0, set: field, camera: cam([[5.6, look([-1.2, 2.2, -43 + 1.5 * 5.6], [.5, 1.2, 10], 50)], [7.0, look([-1.2, 2.6, -43 + 1.5 * 7], [.5, 1.2, 12], 50), E.linear]]), props: [red.shadow], update: t => red.update(t), chars: t => red.draw(t) },
        { id: 'blue', from: 7.0, to: 9.6, set: field, camera: cam([[7.0, look([0, 1.7, 8.5], [0, 1.1, 0], 50)], [9.6, look([1.6, 1.7, 7.6], [1.6, 1.1, 0], 50), E.linear]]), props: [blue.shadow], update: t => blue.update(t), chars: t => blue.draw(t) },
        { id: 'boots', from: 9.6, to: 11.2, set: field, camera: cam([[9.6, look([200, .12, 3], [203, .2, 0], 50)], [11.2, look([200, .12, 3], [203, .2, 0], 50)]], .05),
          over(t, f) { const k = seg(t, 10.2, 10.3), ph = (t - 9.6) * 2.4; bootsRow(f.ctx, { W: 720, H: 1280, phase: ph + .2, mode: t < 10.4 ? 'unison' : 'rain', ground: .78, horizon: .5 }); } },
        { id: 'throw', from: 11.2, to: 12.4, set: field, camera: cam([[11.2, look([60.3, .9, 3.0], [60, 1.45, 0], 50)], [12.4, look([60.2, 1.4, 2.5], [60, 1.5, 0], 50), E.outCubic]]),
          chars: t => cap.draw(ACT.throwDrum(cap.char, (t - 11.2) * 1.35, { view: 'threeQuarter', facing: -1 })) },
        { id: 'grab', from: 12.4, to: 13.4, set: field, camera: cam([[12.4, look([60.7, 1.5, 3.4], [60.7, 1.45, 0], 50)], [13.4, look([60.7, 1.5, 2.9], [60.7, 1.45, 0], 50), E.outCubic]]),
          chars(t) { const a = t - 12.55, pc = a < 0 ? ACT.dustHands(cap.char, t) : ACT.yanked(cap.char, a - .08, { dir: 1 }), pg = ACT.grab(col.char, Math.max(a, -.01), { dir: -1, reach: 400 }); drawActors([[cap, pc], [col, pg]]); } },
        { id: 'laugh', from: 13.4, to: 14.4, set: field, camera: cam([[13.4, look([80.6, 1.4, 3.6], [80.6, 1.4, 0], 50)], [14.4, look([80.6, 1.4, 3.2], [80.6, 1.4, 0], 50), E.linear]]),
          chars(t) { drawActors([[ad, { ...ACT.laughCry(ad.char, t + .2), tears: 0 }], [gen, ACT.laughCry(gen.char, t)]]); } },
        { id: 'jump', from: T_J, to: 16.4, set: field, camera: cam([[T_J, look([0, 1.3, -9.5], [0, 1.4, 0], 50)], [T_FLY, look([0, 1.3, -9.5], [0, 1.9, 0], 50)], [16.4, look([0, 1.3, -9.5], [0, 6.5, 0], 50), E.outCubic]]), props: [jump.shadow], update: t => jump.update(t), chars: t => jump.draw(t) },
      ],
      crowds: { red, blue, jump },
    };
  },
};
