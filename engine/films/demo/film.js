// demo — дымовой тест движка, 4–5 с: обе декорации, три героя, одна склейка, речь по словам из words.json.
//   строка 1 narration.txt — реплика шахтёра (штрек): рот меняется, пока звучат слова, затем ухмылка и подмигивание
//   строка 2 — реплика богача (галерея): хохочет с подпрыгиванием; напарник на ящике жуёт и моргает
// Собрать и проверить целиком:  node engine/tools/make.mjs engine/films/demo --min-dur 4 --max-dur 5 --max-epm 200
import {
  V, mineShaft, mineGallery, miner, buddy, richGuy, MINER, Actor, drawActors, blobShadow, timeline,
  look, keyed, withMods, handheld, creep, shake, act, talk, blinkAt, E, seg, smooth, lerp,
} from 'engine';
import words from './words.json';

export default {
  fps: 30, size: [720, 1280],
  setup(stage) {
    const tl = timeline(words, { fps: 30 });
    const L1 = tl.line(1), L2 = tl.line(2);
    const T_CUT = L2.from - .1;                                   // склейка — на начале второй реплики
    const END = L2.to + 1.1;                                     // хвост: богач дохохатывает

    // ---------- сцена 1: штрек, шахтёр говорит ----------
    const shaft = mineShaft(stage);
    blobShadow(shaft.group, { pos: V(.16, .156, .2), size: [.7, .2], rot: -.5 });
    const hero = new Actor(stage, miner(), { pin: 'chest' }).at(V(0, -MINER.bodyY * .00202, 0));
    const wide = look([0, 1.1, 3.74], [0, 1.25, 0], 50), mid = look([-.5, 1.42, 1.95], [.02, 1.5, 0], 50);
    const camA = withMods(keyed([[0, wide], [L1.from + .1, wide, E.linear], [L1.from + .5, mid, E.outCubic], [T_CUT, look([-.56, 1.43, 1.8], [.02, 1.5, 0], 50), E.linear]]), handheld(3, .3, .8));

    // ---------- сцена 2: галерея, богач хохочет, напарник сидит на ящике ----------
    const gal = mineGallery(stage, { origin: [100, 0, 0] });
    gal.addCandle(2.6, 1.25);
    const RICH = gal.w(.42, 0, -2.5);
    blobShadow(gal.group, { pos: V(.42, .012, -2.5), size: [.95, .34], opacity: .45 });
    const rich = new Actor(stage, richGuy(), { pin: 'feet', occlude: true }).at(RICH);
    const pal = new Actor(stage, buddy(), { pin: 'seat', occlude: true }).at(gal.seat);
    const b0 = look(gal.w(.3, 1.22, 1.5).toArray(), gal.w(.2, 1.12, -2.5).toArray(), 50), b1 = look(gal.w(.36, 1.3, .15).toArray(), gal.w(.38, 1.34, -2.5).toArray(), 50);
    const T_LAUGH = tl.t('2:insane');
    const b2 = look(gal.w(.33, 1.52, -1.02).toArray(), gal.w(.42, 1.4, -2.5).toArray(), 50);          // резкий наезд на лицо на слове «insane!»
    const camB = withMods(keyed([[T_CUT, b0], [T_CUT + .45, b1, E.outCubic], [T_LAUGH, look(gal.w(.36, 1.3, .1).toArray(), gal.w(.38, 1.34, -2.5).toArray(), 50), E.linear],
      [T_LAUGH + .3, b2, E.outCubic], [END, look(gal.w(.34, 1.52, -1.1).toArray(), gal.w(.42, 1.4, -2.5).toArray(), 50), E.linear]]), handheld(9, .25, .9), shake(T_LAUGH + .3, .7, 7, 22));

    return {
      duration: END,
      scenes: [{
        id: 'shaft', from: 0, to: T_CUT, set: shaft,
        camera: camA,
        update(t, f) {
          const k = smooth(seg(t, L1.from + .1, L1.from + .5));
          f.look.focus = stage.camera.position.distanceTo(hero.pos); f.look.aperture = lerp(.0012, .005, k);
          shaft.lamp.cone.setAlpha(1 - .35 * k);
          f.look.grade = { sat: .92 };                               // чуть приглушить насыщенность окружения (эталон менее насыщен)
        },
        chars(t) {
          // эмоции по словам: говорит строку 1, на последнем слове — самодовольная ухмылка, затем подмигивание
          const pose = act(t, [[0, 'neutral'], [L1.from - .05, 'talk', { talking: false }], [tl.t('1:$') + .05, 'smug'], [L1.to + .25, 'wink']]);
          const sp = talk(t, tl, { line: 1, rest: pose.mouth, seed: 1 });
          if (sp.speaking) pose.mouth = sp.mouth;
          pose.blink = pose.name !== 'wink' && blinkAt(t, 1);
          hero.draw(pose);
        },
      }, {
        id: 'gallery', from: T_CUT, to: END, set: gal,
        camera: camB,
        update(t, f) { f.look.focus = stage.camera.position.distanceTo(RICH); f.look.aperture = .004; f.look.grade = { sat: .86, tint: [1, 1, 1.05] }; },
        chars(t) {
          const rp = act(t, [[T_CUT - 1, 'laugh', { talking: false }]]);
          const sp = talk(t, tl, { line: 2, set: ['laugh', 'laughBig', 'laugh', 'open'], rest: 'laugh', seed: 2 });
          rp.mouth = sp.mouth;
          drawActors([
            [pal, { dy: Math.sin(t * 2) * 1.2, look: [.55, -.1], chew: .5 + .5 * Math.sin(t * 11), blink: blinkAt(t, 5) }],
            [rich, rp],
          ]);
        },
      }],
      transitions: [{ at: T_CUT, type: 'cut' }],
    };
  },
};
