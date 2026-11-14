// kit — проверочный фильм конструктора (без звука, 3.4 с): декорация, собранная в самом фильме из kit.js
// (тоннель из плит, рамы крепи, рельсы, бочка, ящик, фонарь, лампа с конусом), эксперт за бочкой (перекрытие декорацией),
// искры фитиля, взрыв с тряской, вспышка, пылевая завеса и растворение в галерею.
//   node engine/tools/build.mjs engine/films/kit && node engine/tools/render.mjs engine/out/kit/film.html engine/out/kit/sheet.jpg --sheet 0.3
import {
  THREE, V, kit, mineGallery, expert, buddy, Actor, drawActors, blobShadow,
  look, keyed, withMods, handheld, feel, act, blinkAt, explosion, sparkBurst, screenShake, E, seg, smooth,
} from 'engine';

const T_FUSE = .35, T_BOOM = 1.45, T_MIX = 2.5;

export default {
  fps: 30, size: [720, 1280], duration: 3.4,
  setup(stage) {
    // ---------- декорация из конструктора: тоннель ----------
    const g = new THREE.Group(); stage.add(g);
    const rock = kit.rockMaterial(kit.ROCK.darkShaft);
    kit.rockTunnel(g, { z0: -9, z1: 4, width: 4.2, height: 3.3, mat: rock, seed: 3 });
    const post = kit.woodMat('vec3(9.,.5,9.)', '.30,.17,.07', '.60,.37,.17'), beam = kit.woodMat('vec3(.5,9.,9.)', '.36,.20,.08', '.70,.42,.18');
    for (const z of [-1.4, -3.4, -5.4, -7.4]) kit.timberFrame(g, { x: 0, z, half: 1.75, top: 2.7, r: .11, postMat: post, capMat: beam });
    kit.rails(g, { envTex: stage.envTex, pts: [V(0, 0, 5), V(0, 0, 0), V(0, 0, -5), V(0, 0, -10)], segs: 80 });
    kit.barrel(g, { x: .95, z: -1.0, r: .3, h: .8 });
    kit.crate(g, { x: -1.35, y: .26, z: -1.6, w: .9, h: .52, d: .7, ry: .3, lines: ['DYNAMITE', 'KEEP DRY'] });
    kit.lantern(g, { pos: V(-1.6, 2.2, -3.4), light: { color: 0xffc68e, intensity: 2.2, distance: 6, decay: 1.7, pos: V(-1.3, 2.1, -3.2) } });
    kit.stones(g, { n: 24, seed: 9, place: r => [(r() - .5) * 3.6, .03, 1 - r() * 8, .03 + r() * .07] });
    const lamp = kit.hangingLamp(g, { pos: V(0, 2.75, -.4), envTex: stage.envTex, both: stage.both, spot: { intensity: 16 } }).addCone().addSparks();
    g.add(new THREE.HemisphereLight(0xffc8a4, 0x40241a, .25));
    const warm = new THREE.PointLight(0xffc49c, 3.5, 12, 2); warm.position.set(0, 2.3, .4); g.add(warm);
    const tunnel = { group: g, look: { bg: 0x120a05, fogColor: 0x24130a, fogDensity: .03, bloom: .25, aperture: .0025, maxblur: .012 }, tick: (t, st) => lamp.sparks.tick(t, st) };

    // эксперт стоит ЗА бочкой: бочка должна закрывать его ноги (occlude)
    const who = new Actor(stage, expert(), { pin: 'feet', occlude: true }).at(V(.72, 0, -1.55));
    blobShadow(g, { pos: V(.72, .012, -1.55), size: [.9, .32], opacity: .4 });
    const FUSE = V(-.9, .62, -1.35);
    const fuse = sparkBurst(g, { pos: FUSE, n: 70, seed: 4, loop: .32, life: .3, speed: [.5, 1.6], gravity: 3, size: .016 });
    const boom = explosion(g, { pos: V(-.9, .5, -1.6), scale: 1.25, dir: [.35, .3, 1], seed: 8, curtain: .6 });
    const c0 = look([.25, 1.35, 3.1], [.2, 1.15, -1.4], 50), c1 = look([.3, 1.3, 2.2], [.3, 1.2, -1.5], 50);
    const camA = withMods(keyed([[0, c0], [T_BOOM, c1, E.inOutSine], [T_MIX + .4, look([.3, 1.3, 2.5], [.3, 1.2, -1.5], 50), E.outCubic]]), handheld(4, .3, .8), screenShake(T_BOOM, { deg: 1.6 }));

    // ---------- вторая сцена: галерея из готового набора ----------
    const gal = mineGallery(stage, { origin: [100, 0, 0] }); gal.addCandle(2.6, 1.25);
    const pal = new Actor(stage, buddy(), { pin: 'seat', occlude: true }).at(gal.seat);
    const camB = withMods(keyed([[T_MIX - .3, look(gal.w(.2, 1.1, .6).toArray(), gal.w(-.3, 1.0, -3.4).toArray(), 55)], [3.4, look(gal.w(.1, 1.05, -.2).toArray(), gal.w(-.4, .95, -3.4).toArray(), 55), E.outCubic]]), handheld(9, .25, .9));

    return {
      scenes: [{
        id: 'tunnel', from: 0, to: T_MIX, set: tunnel,
        camera: camA,
        update(t, f) {
          fuse.setAge(t < T_BOOM ? t - T_FUSE : -1, stage); boom.setAge(t - T_BOOM);
          f.look.focus = stage.camera.position.distanceTo(who.pos);
          f.look.grade = { sat: .9 };
        },
        chars(t) {
          const p = act(t, [[0, 'smug'], [T_FUSE + .25, 'nervous'], [T_BOOM - .05, 'shock']]);
          p.blink = blinkAt(t, 3);
          who.draw(p);
        },
        over(t, f) { boom.flash2D(f.ctx, stage, t - T_BOOM); boom.veil2D(f.ctx, stage, smooth(seg(t, T_BOOM + .35, T_MIX - .1)), t); },   // пыль закрывает кадр вместе с героем
      }, {
        id: 'gallery', from: T_MIX, to: 3.4, set: gal,
        camera: camB,
        update(t, f) { f.look.focus = stage.camera.position.distanceTo(gal.seat); },
        chars(t) { pal.draw({ ...feel('nervous', t), stance: 'sit', dy: Math.sin(t * 2) * 1.2 }); },
        over(t, f) { boom.veil2D(f.ctx, stage, 1 - smooth(seg(t, T_MIX - .1, T_MIX + .55)), t); },                                          // ...и рассеивается уже в галерее
      }],
      transitions: [{ at: T_MIX, type: 'dissolve', dur: .3 }],
    };
  },
};
