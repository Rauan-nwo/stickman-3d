// V000 — заготовка фильма. Собирается и рендерится как есть:
//   node engine/tools/make.mjs production/V000 --min-dur 2 --max-dur 62 --min-epm 10 --max-epm 200
// Дальше: правьте narration.txt (одна строка = одна фраза), перезапускайте make — время сцен возьмётся из words.json.
// Как устроен фильм и что есть в движке — engine/README.md.
import {
  V, mineShaft, mineGallery, miner, buddy, richGuy, MINER, Actor, drawActors, blobShadow, timeline,
  look, keyed, withMods, handheld, shake, act, talk, blinkAt, E, seg, smooth, lerp,
} from 'engine';
import words from './words.json';

export default {
  fps: 30, size: [720, 1280],
  setup(stage) {
    // ---------- время: всё привязано к словам озвучки ----------
    const tl = timeline(words, { fps: 30 });
    const last = tl.lines[tl.lines.length - 1];
    const L1 = tl.line(1), two = tl.lines.length > 1, L2 = two ? tl.line(2) : null;
    const T_CUT = two ? L2.from - .1 : Infinity;                  // склейка = начало второй фразы (склейка всегда на начале фразы)
    const END = tl.line(last).to + .8;

    // ---------- сцена 1: тёмный штрек, шахтёр говорит первую фразу ----------
    const shaft = mineShaft(stage);
    blobShadow(shaft.group, { pos: V(.16, .156, .2), size: [.7, .2], rot: -.5 });
    const hero = new Actor(stage, miner(), { pin: 'chest' }).at(V(0, -MINER.bodyY * .00202, 0));
    const wide = look([0, 1.1, 3.74], [0, 1.25, 0], 50), mid = look([-.5, 1.42, 1.95], [.02, 1.5, 0], 50);
    // ключи камеры: [время, состояние, easing отрезка, который кончается на этом ключе]
    const camA = withMods(keyed([[0, wide], [L1.from + .1, wide, E.linear], [L1.from + .5, mid, E.outCubic], [Math.min(T_CUT, END), look([-.56, 1.43, 1.8], [.02, 1.5, 0], 50), E.linear]]), handheld(3, .3, .8));

    const scenes = [{
      id: 'shaft', from: 0, to: two ? T_CUT : END, set: shaft,
      camera: camA,
      update(t, f) {                                              // до рендера 3D: фокус, свет, позы пропсов
        const k = smooth(seg(t, L1.from + .1, L1.from + .5));
        f.look.focus = stage.camera.position.distanceTo(hero.pos); f.look.aperture = lerp(.0012, .005, k);
        shaft.lamp.cone.setAlpha(1 - .35 * k);
      },
      chars(t) {                                                  // 2D-герои поверх окружения
        const pose = act(t, [[0, 'neutral'], [L1.from - .05, 'talk', { talking: false }], [L1.to + .05, 'smug']]);
        const sp = talk(t, tl, { line: 1, rest: pose.mouth, seed: 1 });   // рот меняется, пока звучат слова строки 1
        if (sp.speaking) pose.mouth = sp.mouth;
        pose.blink = blinkAt(t, 1);
        hero.draw(pose);
      },
    }];

    // ---------- сцена 2: светлая галерея, богач отвечает, напарник сидит на ящике ----------
    if (two) {
      const gal = mineGallery(stage, { origin: [100, 0, 0] });    // декорации разнесены в мире, видна только активная
      gal.addCandle(2.6, 1.25);
      const RICH = gal.w(.42, 0, -2.5);
      blobShadow(gal.group, { pos: V(.42, .012, -2.5), size: [.95, .34], opacity: .45 });
      const rich = new Actor(stage, richGuy(), { pin: 'feet', occlude: true }).at(RICH);
      const pal = new Actor(stage, buddy(), { pin: 'seat', occlude: true }).at(gal.seat);
      const b0 = look(gal.w(.3, 1.22, 1.5).toArray(), gal.w(.2, 1.12, -2.5).toArray(), 50), b1 = look(gal.w(.36, 1.3, .15).toArray(), gal.w(.38, 1.34, -2.5).toArray(), 50);
      const camB = withMods(keyed([[T_CUT, b0], [T_CUT + .45, b1, E.outCubic], [END, look(gal.w(.37, 1.31, -.05).toArray(), gal.w(.38, 1.34, -2.5).toArray(), 50), E.linear]]), handheld(9, .25, .9), shake(L2.to - .25, .6, 7, 22));
      scenes.push({
        id: 'gallery', from: T_CUT, to: END, set: gal,
        camera: camB,
        update(t, f) { f.look.focus = stage.camera.position.distanceTo(RICH); f.look.aperture = .004; },
        chars(t) {
          const said = t > tl.line(last).to + .1;
          const rp = act(t, [[T_CUT - 1, 'talk', { talking: false }], [tl.line(last).to + .1, 'laugh']]);
          if (!said) { const lineNow = (tl.wordAt(t) || {}).line; const sp = talk(t, tl, { line: lineNow, rest: 'flat', seed: 2 }); rp.mouth = sp.mouth; }
          drawActors([
            [pal, { dy: Math.sin(t * 2) * 1.2, look: [.55, -.1], chew: .5 + .5 * Math.sin(t * 11), blink: blinkAt(t, 5) }],
            [rich, rp],
          ]);
        },
      });
    }
    return { duration: END, scenes, transitions: two ? [{ at: T_CUT, type: 'cut' }] : [] };
  },
};
