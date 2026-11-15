// V002 «Why Soldiers Never March Across Bridges» — 63 с, 720x1280 @ 30 fps. Постановка — beatsheet.md.
// Всё время берётся из слов озвучки (words.json): c('строка:слово'). Фильм = список планов (shot): у каждого начало по слову,
// камера, update (мир), chars (2D-герои и толпы), over (2D поверх). Между планами внутри фразы — переброс камеры (in/out),
// на началах фраз — жёсткая склейка. Хук (строка 1) — один план, одна непрерывная камера.
//   node engine/tools/build.mjs production/V002 && node engine/tools/render.mjs production/V002/out/film.html production/V002/out/raw.mp4
import { THREE, V, Actor, timeline, look, keyed, handheld, shake, E, seg, smooth, clamp, lerp, hash, rng, blobShadow } from 'engine';
import { gorgeBridge } from 'engine/sets/gorgeBridge.js';
import { swingTree } from 'engine/sets/swingTree.js';
import { createDrum } from 'engine/props/drum.js';
import { waterSplash, multiSplash, floatBob } from 'engine/vfx/waterSplash.js';
import { fallingPebble, boltPop, splinters } from 'engine/vfx/debris.js';
import { chalkCounter, spyglassThrough, lensZoom } from 'engine/vfx/overlay2d.js';
import { captain, colonel, general, aide, soldierRed, soldierBlue, drummer, kid, drum2D, shoe2D, musket2D, spyglass2D } from 'engine/chars/presetsArmy.js';
import { gait, SHUFFLES } from 'engine/chars/gaits.js';
import { ACT, face, blinkUnison } from 'engine/chars/actions.js';
import { Crowd } from 'engine/chars/crowd.js';
import { bootsRow, boot2D, bigHand } from 'engine/chars/closeups.js';
import { drawHat } from 'engine/chars/stickman.js';
import words from './words.json';

const TAU = Math.PI * 2, PI = Math.PI, fract = v => v - Math.floor(v), UP = new THREE.Vector3(0, 1, 0);
const pl = (K, t) => { if (t <= K[0][0]) return K[0][1]; for (let i = 1; i < K.length; i++) if (t <= K[i][0]) return lerp(K[i - 1][1], K[i][1], (t - K[i - 1][0]) / (K[i][0] - K[i - 1][0])); return K[K.length - 1][1]; };
const hopH = q => { q = fract(q); const g = .28; if (q < g) return 0; const s = (q - g) / (1 - g); return 4 * s * (1 - s); };
const hatGap = q => Math.max(0, hopH(q - .13) * 1.2 - hopH(q));

export default {
  fps: 30, size: [720, 1280],
  setup(stage) {
    const { W, H, camera } = stage;
    const tl = timeline(words), c = (s, off = 0) => tl.t(s, off), DUR = tl.duration;
    const g = gorgeBridge(stage), sw = swingTree(stage, { origin: [0, 0, 0] }), B = g.bridge, cam = (n, o) => g.cam(n, o), A = g.anchors;
    const RT = g.spots.general.y;

    // ---------- сетка шагов: темп = средний интервал слов «Left, right, left, right»; финальная сетка отсчитана от «forty-first» ----------
    // рот героя двигается ТОЛЬКО на словах, помеченных в words.json как voice: "char" (его реплика); смена каждые 3–4 кадра,
    // в паузах между словами и пока говорит рассказчик — rest (рот закрыт)
    const WORDS = Array.isArray(words) ? words : words.words;
    const charMouth = (t, line, set, rest) => { for (const w of WORDS) if (w.voice === 'char' && w.line === line && t >= w.start - .02 && t < w.end + .02) return set[Math.floor(t * 30 / 3.5) % set.length]; return rest; };
    const BEAT = (c('8:right#2') - c('8:Left')) / 3, T41 = c('17:forty-first'), TB = c('17:bucks'), T12 = c('12');
    const stepPh = t => (t < T12 ? (t - c('8:right#2')) / BEAT : (t - T41) / BEAT);       // целое значение = удар сапога

    // ---------- точки мира ----------
    const deckP = (s, v = 0, lift = 0) => (s >= 0 && s <= 40 ? B.deckPoint(s / 40, v, lift).pos : g.w(-20 + s, lift, v * 2.3));
    const dk = (s, y, z) => [-20 + s, y, z];
    const headOf = a => a.pos.clone().add(V(0, -a.char.spec.head.y * a.unit, 0));
    const vwOf = (p, heading) => { let rel = Math.atan2(camera.position.x - p.x, camera.position.z - p.z) - heading; rel -= Math.round(rel / TAU) * TAU; const ar = Math.abs(rel); return { view: ar < .42 ? 'front' : ar < 1.0 ? 'threeQuarter' : ar < 2.15 ? 'side' : 'back', facing: rel > 0 ? -1 : 1 }; };
    // камера на голову: голова (центр) попадает в экранную точку (sx, sy); from — направление от головы к камере
    function headShot(head, from, dist, fov = 44, sy = 470, sx = 360) {
      const fr = V(...from).normalize(), pxm = (H / 2 / Math.tan(fov * PI / 360)) / dist, right = new THREE.Vector3().crossVectors(fr.clone().negate(), UP).normalize(), upv = new THREE.Vector3().crossVectors(right, fr.clone().negate());
      const off = upv.multiplyScalar((sy - H / 2) / pxm).add(right.multiplyScalar((W / 2 - sx) / pxm)), p = head.clone().addScaledVector(fr, dist).add(off);
      return look(p.toArray(), head.clone().add(off).toArray(), fov);
    }
    const pan = (s, yaw, pitch) => { const p = V(...s.pos), d = V(...s.target).sub(p); d.applyAxisAngle(UP, yaw); const r = new THREE.Vector3().crossVectors(d, UP).normalize(); d.applyAxisAngle(r, pitch); return { ...s, target: p.add(d).toArray() }; };

    // ---------- герои ----------
    // все герои перекрываются декорацией попиксельно (occlude): цепи, подвески, пилоны и настил перед ними их закрывают
    const OC = { occlude: true, bias: .18 };
    const cap = new Actor(stage, captain(), OC), col = new Actor(stage, colonel(), OC), gen = new Actor(stage, general(), OC), ad = new Actor(stage, aide(), OC);
    const off = new Actor(stage, soldierBlue(4), OC), kidA = new Actor(stage, kid(), { pin: [0, -215], ...OC });
    // настил из отдельных досок со щелями: под досками лежит невидимая сплошная «мембрана», которая пишется только в глубину
    // для перекрытия персонажей — снизу и сбоку-снизу фигуры не просвечивают сквозь щели и не рисуются поверх досок
    { const NM = 80, pos = new Float32Array((NM + 1) * 6), idx = []; for (let i = 0; i < NM; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setIndex(idx);
      const mem = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, side: THREE.DoubleSide })); mem.frustumCulled = false; g.group.add(mem);
      const set0 = B.setMotion.bind(B);
      B.setMotion = m => { set0(m); for (let i = 0; i <= NM; i++) for (let k = 0; k < 2; k++) { const q = B.deckPoint(i / NM, k ? 1.02 : -1.02, -.05).pos; pos[(i * 2 + k) * 3] = q.x - g.origin.x; pos[(i * 2 + k) * 3 + 1] = q.y - g.origin.y; pos[(i * 2 + k) * 3 + 2] = q.z - g.origin.z; } geo.attributes.position.needsUpdate = true; return B; };
      B.setMotion(); }
    const redCh = soldierRed(), U = redCh.spec.unit;
    const blobs = []; for (let i = 0; i < 6; i++) { const b = blobShadow(g.group, { size: [.7, .3], opacity: .32 }); b.visible = false; blobs.push(b); }
    let nBlob = 0; const blob = (p, k = 1) => { const b = blobs[nBlob++]; if (!b) return; b.visible = true; b.position.set(p.x, p.y + .015, p.z); b.scale.set(.7 * k, .3 * k, 1); };

    // ---------- красные на настиле ----------
    const ROWS = 26, NR = ROWS * 4;
    const R = {};                                                    // состояние красных на этот кадр (ставит план)
    const redFront = t => pl([[c('8'), 2.2], [c('8:Left'), 6.6], [c('9'), 9], [c('10'), 15.5], [c('11'), 18.5], [T12, 22.5]], t);
    const rdel = i => .22 * Math.abs((R.front - 1.6 - (i >> 2) * 1.15) / 40 - .55) + .1 * hash(i * 3.3);
    const rvel = i => [(hash(i * 1.9) - .5) * 9, 12 + 9 * hash(i * 7.7), (hash(i * 5.1) < .5 ? -1 : 1) * (1.5 + 6 * hash(i * 2.3))];
    const GF = 15;
    const launch = (i, s, v) => g.w(-20 + clamp(s, 0, 40), 1.2 + 3 * Math.sin(PI * clamp(s / 40)), v * 2.3);
    const bph = (t, s) => stepPh(t) / 2 - s * .03;
    const redPosOf = (i, t, out) => {
      const row = i >> 2, file = i & 3, s = R.front - 1.6 - row * 1.15, v = (file - 1.5) * .42;
      if (t >= R.fallT) { const a = t - R.fallT + 1.5 * hash(i * 4.1); return out.set(-7 + 27 * hash(i * 1.7), Math.max(-61, 6 - 20 * a - 12 * a * a), 2 + 8 * hash(i * 9.3)); }
      const a = t - R.buckT - rdel(i);
      if (a > 0) { const p = launch(i, s, v), q = rvel(i); return out.set(p.x + q[0] * a, p.y + q[1] * a - .5 * GF * a * a, p.z + q[2] * a); }
      out.copy(deckP(s, v)); out.y += R.hop * hopH(bph(t, s)) + (R.jump && R.jump(i, t) || 0); return out;
    };
    const red = new Crowd(stage, {
      count: NR, shadow: { parent: g.group }, haze: .35, maxNear: 70,
      clips: [{ char: redCh, gait: 'march', opt: { musket: true } },
        { char: drummer(), pose: (ch, ph, vw) => ACT.drumming(ch, 0, { phase: ph, ...vw }) },
        { char: redCh, pose: (ch, ph, vw) => { const P = ACT.bounce(ch, ph * .5, { period: .5, amp: 150, lift: false, face: 'grin', ...vw }); P.hatDy = -hatGap(ph) * 60; return P; } },
        { char: redCh, gait: 'flail', over: { hatOff: true } },
        { char: redCh, gait: 'fall', over: { hatOff: true } }],
      clip: 0, pos: redPosOf, heading: PI / 2,
      state(i, t, m) {
        const s = R.front - 1.6 - (i >> 2) * 1.15;
        if (t >= R.fallT) { m.air = true; m.clip = 4; m.noTop = true; m.ground = -300; m.rot = t * (2 + 4 * hash(i * 2.1)) * (i % 2 ? 1 : -1); m.phase = t * 1.5 + i * .37; m.hide = m.pos.y <= -60.5; return; }
        const a = t - R.buckT - rdel(i);
        if (a > 0) { m.air = true; m.clip = 3; m.ground = -300; m.rot = a * (3 + 5 * hash(i * 2.1)) * (i % 2 ? 1 : -1); m.phase = t * 1.6 + i * .37; return; }
        if (R.hideRow != null && (i >> 2) === R.hideRow && (i & 3) >= 2) { m.hide = true; return; }
        if (R.hop > .04) { m.clip = 2; m.phase = bph(t, s); } else { m.clip = (i === 0 || i === 3) ? 1 : 0; m.phase = (R.phase ? R.phase(t) : stepPh(t) / 2); }
        const hero = R.hero && R.hero(i, t), gapU = R.hop > .04 ? hatGap(bph(t, s)) * R.hop / U * .8 : 0;
        if (hero || gapU > 1) m.pose = (p, mm) => { let q = hero ? hero(p, mm) || p : p; if (gapU > 1) q = { ...q, hatDy: -Math.min(300, gapU), hatLag: Math.min(1.5, gapU / 80) }; return q; };
      },
    });
    // шляпы и барабаны, отлетевшие от строя: свой бросок, рисуются поверх толпы
    const NHAT = 64;
    function flyers2D(ctx, t) {
      if (t >= R.fallT) return;
      const pxs = stage.pxs(), items = [];
      for (let i = 0; i < NHAT; i++) {
        const k = (i * 5) % NR, row = k >> 2, s = R.front - 1.6 - row * 1.15, a = t - R.buckT - rdel(k) - .03; if (a <= 0) continue;
        const p = launch(k, s, ((k & 3) - 1.5) * .42), q = rvel(k), isDrum = i % 13 === 5;
        p.x += q[0] * .7 * a + (hash(i * 6.6) - .5) * 4 * a; p.y += 1.5 + (q[1] * 1.12 + 2) * a - .5 * (GF - 3) * a * a; p.z += q[2] * 1.2 * a;
        const [x, y, d] = stage.project(p); if (d < .5) continue; const sc = pxs / d * U;
        items.push({ p, d, draw: c2 => { c2.save(); c2.translate(x, y); c2.rotate(a * (4 + 6 * hash(i * 1.3)) * (i % 2 ? 1 : -1)); c2.scale(sc, sc);
          if (isDrum) drum2D(c2, { x: 0, y: 0, s: 1.25, tilt: .5, col: '#D8402F', hoop: '#F2C530' }); else drawHat(c2, redCh.spec, {}, {}); c2.restore(); } });
      }
      // перекрытие декорацией — пачками по глубине (от дальних к ближним): шляпа за цепью остаётся за цепью
      items.sort((q1, q2) => q2.d - q1.d); const NBIN = 8;
      for (let b0 = 0; b0 < items.length; b0 += Math.ceil(items.length / NBIN) || 1) { const grp = items.slice(b0, b0 + (Math.ceil(items.length / NBIN) || 1)); if (!grp.length) break;
        stage.drawOccluded(grp[grp.length >> 1].p, c2 => { for (const it of grp) it.draw(c2); }, 0); }
    }

    // ---------- синие ----------
    const NB = 150, M = {};
    // на мосту синие идут четырьмя дорожками с шагом ~1.3 м (в дорожке никто никого не обгоняет): фигуры не слипаются в кучу
    const sh = []; { const r = rng(41); for (let i = 0; i < NB; i++) { const lane = i % 4, j = Math.floor(i / 4); sh.push({ s: -10 + j * 1.3 + lane * .33 + (r() - .5) * .45, z: (lane - 1.5) * .5 + (r() - .5) * .1, v: [.95, .82, 1.04, .9][lane], w: 1 + r() * 2 }); } }
    const NMESS = 27, PAIR = [12, 13], SPIN = 4;                       // суматоха в трубе: 27 солдат на сетке 1.6 м, двое сталкиваются, один крутится
    const messS = (i, t) => { const s0 = 10.2 + (i % 9) * 1.6 + .4 * (hash(i * 3.3) - .5), w = .8 + .5 * hash(i * 1.9);
      if (i === PAIR[0] || i === PAIR[1]) { const sd = i === PAIR[0] ? -1 : 1, u = fract((t - M.t1) / 1.3), d = .34 + 1.25 * Math.abs(Math.sin(PI * u)); return 10.2 + 3.5 * 1.6 + sd * d; }
      return i === SPIN ? s0 : s0 + .52 * Math.sin(t * 2.1 * w + i * 2.4); };
    const messV = (i, t) => { const v0 = [-.68, 0, .68][Math.floor(i / 9) % 3] + .1 * (hash(i * 7.1) - .5); return (i === PAIR[0] || i === PAIR[1] || i === SPIN) ? v0 : v0 + .17 * Math.sin(t * 2.7 * (.8 + .5 * hash(i * 2.2)) + i); };
    const lurch = (t, row) => .34 * Math.max(0, Math.sin(TAU * (t - M.t0 - row * .12) / 1.05)) * smooth(seg(t, M.t0, M.t0 + .2));
    const HB = 37, HA = 38;                                           // «ищет туалет» и тот, кто расспрашивает соседей
    const blue = new Crowd(stage, {
      count: NB, shadow: { parent: g.group }, haze: .35, maxNear: 70, seed: 4,
      clips: [...SHUFFLES.map((gt, k) => ({ char: soldierBlue(k), gait: gt })),
        { char: soldierBlue(0), gait: 'stand' }, { char: soldierBlue(2), gait: 'stand' }, { char: soldierBlue(4), gait: 'stand' },
        { char: soldierBlue(1), gait: 'walk' }, { char: soldierBlue(3), gait: 'stumble' }, { char: soldierBlue(5), gait: 'walk' }, { char: soldierBlue(2), gait: 'run', opt: { panic: true } }],
      clip: 0, heading: PI / 2,
      pos(i, t, out) {
        if (M.mode === 'mess' && i < NMESS) return out.copy(deckP(messS(i, t), messV(i, t)));
        if (M.mode === 'shuffle' || M.mode === 'mess') { const q = sh[i]; let s = M.s0 + q.s + q.v * (t - M.t0), v = q.z + .05 * Math.sin(t * q.w + i);
          if (M.mode === 'mess') s = s > 20 ? s + 14 : s - 16;                    // остальные — за кадром трубы
          if (i === HB && M.heroS != null) { s = M.heroS; v = .55; } else if (i === HA && M.heroS != null) { s = M.heroS - 1.25; v = -.05; }
          else if (M.heroS != null && Math.abs(s - M.heroS + .4) < 1.9 && v > -.45) s += s > M.heroS - .4 ? 2.4 : -2.4;      // вокруг героя плана свободно: лицо ничем не перекрыто
          return out.copy(deckP(s, v)); }
        const row = Math.floor(i / 5), f = i % 5; let x = -23.5 - (row + (M.rowOff || 0)) * .95 + (M.adv || 0), z = (f - 2) * .86;
        if (M.listen && i === 3) x += .6 * E.outBack(seg(t, M.listen, M.listen + .22));
        // колонна без барабана: ряды в шахматном порядке с шагом 1.3 м; задний ряд налетает на передний (зазор не меньше 0.9 м), тот отлетает вперёд
        if (M.mode === 'bump') { x = -24.4 - row * 1.3 + lurch(t, row); z = (f - 2) * 1.0 + (row % 2 ? .5 : 0); }
        return out.set(x, 0, z);
      },
      state(i, t, m) {
        const o = blue.offsets[i];
        if (M.mode === 'shuffle' && M.heroS != null && i !== HB && i !== HA && (m.pos.distanceTo(camera.position) < 2.6 || m.pos.x > -20 + M.heroS + .7)) m.hide = true;      // никого вплотную к объективу
        if (M.mode === 'shuffle') { m.clip = i === HB ? 4 : i === HA ? 9 : Math.floor(hash(i * 5.3 + 2) * 6); m.phase = t * 1.25 + o;
          if (i === HA && M.heroS != null) m.pose = p => ({ ...p, ...face('question'), turn: .2, mouth: 'o', look: [1, 0], tilt: .08 * Math.sin(t * 6) }); }
        else if (M.mode === 'mess') { m.phase = t * 1.5 + o; m.clip = Math.floor(hash(i * 5.3 + 2) * 6);
          if (i < NMESS) { const e = .03, vx = (messS(i, t + e) - messS(i, t - e)), vz = (messV(i, t + e) - messV(i, t - e)) * 2.3; m.heading = Math.atan2(vx, vz); m.clip = [10, 5, 12, 0, 3, 10, 12][i % 7];
            if (i === SPIN) { m.heading = t * 7; m.clip = 12; m.phase = t * 2; }
            if (i === PAIR[0] || i === PAIR[1]) { const sd = i === PAIR[0] ? -1 : 1, u = fract((t - M.t1) / 1.3), away = u < .5; m.heading = (sd < 0 ? 1 : -1) * PI / 2; m.clip = away ? 10 : 12; m.rot = away ? sd * -.5 * Math.exp(-u * 7) * Math.cos(u * 22) - sd * .25 * Math.exp(-u * 5) : 0; m.pos.y += away ? .35 * Math.sin(PI * clamp(u / .28)) : 0; } } }
        else if (M.mode === 'bump') { const row = Math.floor(i / 5), d = lurch(t, row), hit = lurch(t, row + 1) - d;            // hit > 0: сзади налетели
          m.clip = 9 + (i % 2) * 2; m.phase = t * 1.5 + o; m.rot = -.1 * d / .34;
          const F = hit > .12 ? [face('yanked'), { eyes: 'closed', mouth: 'wavy', brows: [14, .5] }, face('annoyed'), { eyes: 'wide', mouth: 'O' }][i % 4]
            : [face('annoyed'), face('confused'), face('calm'), face('question'), { eyes: 'dot', mouth: 'flatS' }, { eyes: 'lid', mouth: 'smirkS', look: [-1, 0] }, face('worried')][(i * 3 + row) % 7];
          m.pose = (p, mm) => ({ ...p, ...F, hatLag: 1.6 * (d / .34) - 1.2 * Math.max(0, hit) / .34, hatDy: -22 * Math.max(0, hit) / .34 }); }
        else if (M.mode === 'march') { m.clip = 9 + (i % 2) * 2; m.phase = t < M.breakT ? t * 1.58 : t * (1.1 + .8 * hash(i * 1.3)) + o; if (t >= M.breakT) { m.clip = Math.floor(hash(i * 5.3 + 2) * 6); } }
        else { m.clip = 6 + i % 3; m.phase = t * .5 + o;
          if (M.listen) m.pose = (p, mm) => { const f = i % 5, row = Math.floor(i / 5); if (row === 0 && f === 3) { const P = ACT.raiseHand(mm.c.char, t - M.listen, { view: mm.vw, facing: mm.fc }), a = P.arms[1]; if (a) { a.to = [a.to[0] + 120, a.to[1] - 30]; a.hand = 36; a.L *= 1.1; } return P; }
            const q = ACT.confused(mm.c.char, t, { seed: i, view: mm.vw, facing: mm.fc }); q.blink = fract(t * .9 + hash(i * 7.7)) < .12; return q; }; }
      },
    });

    // ---------- красные в долине ----------
    const VR = 24, VF = 64, valAdv = t => 1.3 * Math.max(0, t - c('7'));
    const val = new Crowd(stage, {
      count: VR * VF, shadow: { parent: g.group }, haze: .5, maxNear: 26,
      clips: [{ char: redCh, gait: 'march', opt: { musket: true } }, { char: drummer(), pose: (ch, ph, vw) => ACT.drumming(ch, 0, { phase: ph, ...vw }) }],
      clip: i => (i < VF && i % 9 === 4 ? 1 : 0), heading: PI / 2,
      phase: (i, t) => (t - c('7:land')) / (BEAT * 2),
      pos: (i, t, out) => out.copy(g.valleyRow(Math.floor(i / VF), i % VF)).add(V(valAdv(t), 0, 0)),
      state(i, t, m) { if (i < VF) m.pose = p => ({ ...p, blink: blinkUnison(t, { period: .75, dur: .12, at: c('7:finest') + .35 }) }); },
    });

    // ---------- пропсы и эффекты ----------
    const drum = createDrum(stage); g.group.add(drum.group);
    const splash = waterSplash(g.group, { pos: g.spots.splash, scale: 1.5 });
    const pebble = fallingPebble(g.group, { pos: V(.62, .12, 2.42), v: [0, 1.6, 1.6], g: 34, size: .13 });
    const boltAt = [3, 6, 11, 14].map(i => ({ i, side: 1 })), bolts = boltPop(g.group, { envTex: stage.envTex, size: 2.6, points: boltAt.map((b, k) => ({ pos: B.hangerTop(b.i, b.side), dir: [0, 1, b.side * .8], t0: c('16:forty') + k * BEAT })) });
    const chips = splinters(g.group, { pos: V(0, 0, 0), n: 80, spread: [15, 2] });
    const T_TOP = c('17:into'), fallPts = []; for (let i = 0; i < NR; i++) fallPts.push({ pos: V(-7 + 27 * hash(i * 1.7), -60, 2 + 8 * hash(i * 9.3)), t0: T_TOP - 1.5 * hash(i * 4.1) + 1.65, size: 1.3, life: 1.2 });
    const drops = multiSplash(g.group, { points: fallPts, grow: 2.4 });

    // ---------- движение моста ----------
    const wave = (t, amp, o = {}) => ({ amp, wavelength: 26, phase: PI * stepPh(t) + 1.2, standing: .35, sway: amp * .2 * Math.sin(PI * stepPh(t) * .5), chainLag: .5, ...o });
    const buck = t => { const a = t - TB; return a < 0 ? wave(t, 1.0) : { ...wave(t, 1.0 * Math.exp(-a * 2)), buck: 8 * Math.exp(-a * 1.5) * Math.sin(clamp(a * 5) * PI / 2) * Math.cos(a * 5), buckAt: .55, twist: .2 * Math.sin(a * 9) * Math.exp(-a * 1.5) }; };

    // ---------- сброс мира на кадр ----------
    function reset(t) {
      drum.group.visible = false; drum.body.scale.setScalar(1); splash.setAge(-1); pebble.setAge(-1); bolts.setTime(-1); chips.setAge(-1); drops.setTime(-1e3);
      for (const cr of [red, blue, val]) { cr.shadow.visible = false; cr.shadow.material.opacity = .34; } for (const b of blobs) b.visible = false; nBlob = 0;
      Object.assign(R, { front: 30, hop: 0, buckT: 1e9, fallT: 1e9, hero: null, phase: null, jump: null, hideRow: null });
      for (const k in M) delete M[k]; Object.assign(M, { mode: 'column', t0: 0, s0: 0, rowOff: 0 });
    }

    // ---------- планы ----------
    const shots = [];
    const shot = (id, from, o) => shots.push({ id, from, ...o });
    const smear = (ctx, k, dx, dy) => { if (k < .03) return; const s = stage.snapshot(); ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); for (let i = 1; i <= 7; i++) { ctx.globalAlpha = .34; ctx.drawImage(s, dx * k * i * 22, dy * k * i * 22); ctx.drawImage(s, -dx * k * i * 9, -dy * k * i * 9); } ctx.restore(); };
    const drawGen = (pose, crowd, t) => { if (crowd) crowd.drawWith(t, [[gen, pose]]); else gen.draw(pose); };
    const sabre = P => { const h = P.hands && P.hands[0]; if (h) P.held = [...(P.held || []), { layer: 'front', draw: x => { x.lineCap = 'round'; x.strokeStyle = '#2C1826'; x.lineWidth = 20; x.beginPath(); x.moveTo(h[0], h[1]); x.lineTo(h[0] - 150, h[1] - 350); x.stroke(); x.strokeStyle = '#E8EDF2'; x.lineWidth = 10; x.stroke(); x.strokeStyle = '#F2C530'; x.lineWidth = 16; x.beginPath(); x.moveTo(h[0] - 34, h[1] - 16); x.lineTo(h[0] + 40, h[1] - 28); x.stroke(); } }]; return P; };

    // ============================== 1. ХУК: один проезд ==============================
    const T_THROW = c('1:threw') + .05, T_SPLASH = c('1:river') + .12, T_HZ = T_SPLASH + .62, T_RACK = T_HZ + .42, T_FACE = T_HZ - .1, SP = g.spots.splash, GD = 58;
    const capHook = g.spots.captainHook.clone(), DSC = 1.5;
    const throwT = t => (t < T_FACE ? Math.min(.99, t - T_THROW + .23) : 1.0 + (t - T_FACE));
    // барабан над головой: замах идёт уже в кадре 0 (назад-вверх), на T_THROW — бросок
    const held = t => { const k = E.inCubic(seg(t, -.05, T_THROW)); return capHook.clone().add(V(.1 * k, 2.86 + .1 * Math.sin(k * PI), lerp(.22, .5, k))); };
    const D0 = held(T_THROW), DT = T_SPLASH - T_THROW;
    const dv = [(SP.x - D0.x) / DT, (SP.y - D0.y + .5 * GD * DT * DT) / DT, (SP.z - D0.z) / DT];
    const drumPos = t => { const a = clamp(t - T_THROW, 0, DT); return [D0.x + dv[0] * a, D0.y + dv[1] * a - .5 * GD * a * a, D0.z + dv[2] * a]; };
    const faceCam = (fov, dist) => headShot(capHook.clone().add(V(0, 1.56, 0)), [1, .02, .05], dist, fov, 470);
    const hookCam = t => {
      const sky = headShot(held(0), [.92, -.4, -.05], 2.7, 50, 330);
      const HZ = o => ({ ...cam('hookHorizon', o), pos: [-3.15, 2.5, 1.95] });      // горизонт поверх кивера капитана (он не в фокусе)
      const k = keyed([[0, sky], [T_THROW, headShot(D0, [.92, -.4, -.05], 2.5, 50, 350), E.linear], [T_THROW + .34, look([-3.5, 1.75, 5.3], [-5.4, 1.3, 2.4], 50), E.inOutCubic], [c('1:into'), look([-4.1, .7, 6.6], [-5.0, -6, 6.9], 50), E.inOutSine],
        [c('1:river') + .05, cam('hookDive'), E.inOutCubic], [T_SPLASH + .42, cam('hookDive', { fov: 45 }), E.linear], [T_HZ, HZ({ fov: 26 }), E.inOutExpo], [T_RACK, HZ({ fov: 24.5 }), E.linear],
        [T_RACK + .42, faceCam(44, 2.5), E.inOutSine], [c('2'), faceCam(42, 2.3), E.linear]])(t);
      if (t > T_RACK && t < T_RACK + .42) {                      // к лицу: камера опускается и наклоняется (позиция и направление — напрямую, без облёта вокруг далёкой цели)
        const a = HZ({ fov: 24.5 }), b = faceCam(44, 2.5), q = E.inOutSine(seg(t, T_RACK, T_RACK + .42)), pa = V(...a.pos), pb = V(...b.pos);
        const da = V(...a.target).sub(pa).normalize(), db = V(...b.target).sub(pb).normalize(), pos = pa.lerp(pb, q), dir = da.lerp(db, q).normalize();
        return { pos: pos.toArray(), target: pos.clone().addScaledVector(dir, 2.5).toArray(), fov: lerp(a.fov, b.fov, q), roll: 0 }; }
      const t0 = T_THROW + .06, t1 = T_SPLASH;
      const zoom = smooth(seg(t, c('1:into') - .1, c('1:into') + .2)) * (1 - smooth(seg(t, T_SPLASH - .08, T_SPLASH + .08)));
      if (t > t0 && t < t1 + .1) { const p = drumPos(t), w = smooth(seg(t, t0, t0 + .22)) * (1 - smooth(seg(t, t1 - .15, t1 + .1))); return { ...k, fov: lerp(k.fov, 22, zoom), target: k.target.map((v, i) => lerp(v, p[i], w)) }; }
      return k;
    };
    shot('hook', 0, {
      camera: t => shake(T_SPLASH, .7, 3.5)(hookCam(t), t), hh: 0,
      update(t, f) {
        g.enemyDust.set(.3 + t * .012, t);
        drum.group.visible = true;
        if (t < T_THROW) drum.pose({ pos: held(t), rot: [.45 + 1.6 * (t - T_THROW), .3, .25], scale: DSC });
        else if (t < T_SPLASH) drum.tumble(t - T_THROW, { from: D0, v: dv, g: GD, spin: [9, 4, 6], rot0: [.45, .3, .25], scale: lerp(DSC, 3.2, smooth(seg(t, c('1:into') - .15, c('1:river')))) });
        else { drum.body.scale.setScalar(2.4); floatBob(drum.body, t - T_SPLASH, { pos: SP, speed: 1.5 }); }
        const ts = T_THROW + .3; drum.sticks(t - ts, { at: { pos: V(...drumPos(ts)), rot: [.45 + 9 * .3, .3 + 4 * .3, .25 + 6 * .3] }, g: 30 });
        splash.setAge(t - T_SPLASH);
        const tH = T_SPLASH + .5, rk = smooth(seg(t, T_RACK, T_RACK + .35)); f.look.focus = t < c('1:into') ? camera.position.distanceTo(V(...drumPos(t))) : t < tH ? 40 : lerp(300, 2.4, rk);
        f.look.aperture = t < c('1:into') ? .003 : lerp(.00004, .012, rk);
        cap.at(capHook); blob(capHook);
      },
      chars(t) { const P = ACT.throwDrum(cap.char, throwT(t), { view: 'front', drum: false }); if (t >= T_FACE) Object.assign(P, face('smirk')); P.blink = t > c('1:them') && t < c('1:them') + .1;
        if (t < T_THROW + .05) { const xf = cap.xf(), dl = cap.toLocal(t < T_THROW ? held(t) : V(...drumPos(t)), xf);          // руки тянутся к 3D-барабану над кивером
          P.arms.forEach((a, i) => { if (!a) return; a.to = [dl[0] + (i ? 1 : -1) * 170, dl[1] + 40]; a.L = Math.hypot(a.to[0] - a.from[0], a.to[1] - a.from[1]) * 1.03; a.layer = 'front'; a.bend = (i ? 1 : -1) * .6; });
          Object.assign(P, { eyes: 'lid', mouth: t < T_THROW - .05 ? 'flatS' : 'o', look: [0, -.6], brows: [6, -.4] }); }
        const bl = t > T_SPLASH + .3 ? 10 * (1 - smooth(seg(t, T_RACK, T_RACK + .32))) : 0;                        // пока в фокусе горизонт, капитан размыт
        if (bl > .4) cap.with(x => { x.filter = `blur(${bl.toFixed(1)}px)`; cap.char.draw(x, P); }); else cap.draw(P); },
    });

    // ============================== 2. Полковник ==============================
    const CAP = g.spots.captain.clone(), NBD = V(.755, .03, .656).normalize(), LEFT = V(-.656, 0, .755), COL = CAP.clone().addScaledVector(LEFT, 1.6);
    const capHead = CAP.clone().add(V(0, 1.56, 0)), colHead = COL.clone().add(V(0, 1.62, 0)), T_GRAB = c('2:colonel'), T_YANK = c('2:collar');
    const bankActors = (t, mode) => {
      cap.at(CAP); col.at(COL); blob(CAP); blob(COL, 1.1);
      const a = t - T_GRAB, y = t - T_YANK, reach = E.outBack(seg(t, T_GRAB - .04, T_GRAB + .12), 1.3), yank = y > 0 ? E.outBack(seg(y, 0, .18), 2.2) : 0, b = cap.char.spec.body;
      // капитан: на хватке вздрагивает, на «collar» его рывком тянут к полковнику; его руки отстают и висят с дальней стороны
      let pc, collar;
      if (a < 0) { pc = ACT.dustHands(cap.char, t - c('2') + 1.2, {}); collar = [b.x - b.rx * .42, b.y - b.ry * .95]; }
      else { pc = ACT.yanked(cap.char, y > 0 ? .012 + y : .012 * reach, { dir: -1 }); const ex = -300 * yank; pc.dx = (pc.dx || 0) + ex; collar = [pc.collar[0] + ex + 14, pc.collar[1] - 22];
        Object.assign(pc, face('annoyed'), { brows: [4, -.3], blink: a < .12, headDx: (pc.headDx || 0) * .5 });          // его дёргают, а он невозмутим: лёгкая досада, он знает, что делает
        pc.arms.forEach((ar, i) => { if (ar) { ar.to = [ar.from[0] + 50 + 110 * yank * (1 - .5 * seg(y, .2, .6)) + (i ? 50 : 0), ar.from[1] + 205 - 40 * yank]; ar.L = 262; ar.bend = 1; } }); }
      // полковник: одна рука, кисть — на воротнике у шеи капитана (экранная точка воротника -> координаты фигуры полковника).
      // Пока говорит рассказчик, рот сжат (зубы), лицо багровеет; кричит только на своих словах
      const lineOn = mode === 'point', pg = lineOn ? ACT.pointDown(col.char, t, { dir: 1, rage: 1 }) : ACT.grab(col.char, Math.max(a, -.01), { dir: 1, reach: 300, rage: seg(t, T_GRAB, c('2:That')) });
      if (a < 0) pg.dx = (pg.dx || 0) - 700 * (1 - E.outExpo(seg(t, T_GRAB - .16, T_GRAB)));
      if (!lineOn) { pg.dx = (pg.dx || 0) - 30 * yank; const xc = cap.xf(), xg = col.xf(), tgt = [(xc.x + collar[0] * xc.s - xg.x) / xg.s - (pg.dx || 0), (xc.y + collar[1] * xc.s - xg.y) / xg.s - (pg.dy || 0)];
        const ar = pg.arms[1], rest = [ar.from[0] + 60, ar.from[1] + 160], k = clamp(reach, 0, 1.08);
        ar.to = [lerp(rest[0], tgt[0], k), lerp(rest[1], tgt[1], k)]; ar.L = Math.max(250, Math.hypot(ar.to[0] - ar.from[0], ar.to[1] - ar.from[1]) * 1.03); ar.layer = 'front'; ar.hand = 36; ar.sag = .12; ar.bend = -1; pg.hands[1] = ar.to;
        const o = pg.arms[0]; if (o) { o.to = [o.from[0] - 40, o.from[1] + 170]; o.hand = 30; } }
      pg.mouth = charMouth(t, 2, ['roar', 'teethOpen', 'open', 'roar'], 'teeth');
      col.draw(pg, { only: 'base' }); cap.draw(pc); col.draw(pg, { only: 'front' });
    };
    shot('grab', c('2'), {
      camera: keyed([[c('2'), headShot(capHead, NBD.toArray(), 4.6, 44, 500, 400)], [c('2') + .3, headShot(capHead, NBD.toArray(), 3.25, 44, 475, 480), E.linear], [T_GRAB + .45, headShot(capHead, NBD.toArray(), 2.9, 44, 470, 500), E.linear], [T_YANK, headShot(capHead, NBD.toArray(), 2.85, 44, 470, 500), E.linear],
        [T_YANK + .2, headShot(capHead.clone().lerp(colHead, .55), NBD.toArray(), 3.3, 44, 480), E.outCubic], [c('2:That'), headShot(capHead.clone().lerp(colHead, .55), NBD.toArray(), 3.1, 44, 480), E.linear],
        [c('2:That') + .3, headShot(colHead, NBD.toArray(), 2.5, 44, 470, 330), E.inOutSine], [c('2:drum') + .12, headShot(colHead, NBD.toArray(), 2.4, 44, 470, 330), E.linear]]),
      mods: [shake(T_YANK, 1.3, 7, 24)], out: [-.5, -.9],
      update(t, f) { g.enemyDust.set(.1, t); M.rowOff = 6; f.look.aperture = .004; },
      chars: t => bankActors(t, t >= c('2:That') ? 'point' : 'grab'),
    });
    shot('gorgeLook', c('2:drum') + .12, {
      camera: keyed([[c('2:drum') + .12, look([-10, -8, 8.2], [-3.4, -60, 11], 46)], [c('2:six'), look([-10, -9, 8.2], [-3.2, -60, 11.4], 36), E.outCubic]]), in: [.5, .9], out: [-1.2, .5],
      update(t, f) { splash.setAge(.5 + (t - c('2:drum')) * .8); drum.group.visible = true; drum.body.scale.setScalar(3); drum.sticks(-1); floatBob(drum.body, t, { pos: V(SP.x + .5, SP.y, SP.z + 3), speed: 1.2 }); f.look.focus = 60; f.look.aperture = .00004; },
    });
    shot('column', c('2:six'), {
      camera: keyed([[c('2:six'), look([-20.6, 3.5, 5.6], [-27.6, .9, .2], 44)], [c('2:six') + .3, look([-21.3, 3.3, 5.1], [-27.4, .95, .2], 42), E.outCubic], [c('2:in'), look([-21.5, 3.25, 5.0], [-27.4, .95, .2], 42), E.linear]]), in: [1.2, -.3], out: [.9, 0],
      update(t, f) { M.mode = 'bump'; M.t0 = c('2:six') - .15; blue.update(t); f.look.focus = 7; f.look.aperture = .0006; },
      chars(t, f) { blue.draw(t);
        const a = t - c('2:hundred'), p = V(-25.6 + a * .5, Math.max(.08, 1.5 + 1.2 * a - 9 * a * a), 1.0); if (a > 0) { const [x, y, d] = stage.project(p), s = stage.pxs() / d * U; f.ctx.save(); f.ctx.translate(x, y); f.ctx.scale(s, s); musket2D(f.ctx, [0, 0], -PI / 2 + Math.min(1.45, a * 5), 640); f.ctx.restore(); } },
    });
    shot('roar', c('2:in'), {
      camera: keyed([[c('2:in'), headShot(colHead, [.9, 0, .45], 1.5, 44, 430)], [c('2:in') + .14, headShot(colHead, [.9, -.05, .45], .98, 44, 400), E.outExpo], [c('3'), headShot(colHead, [.9, -.05, .45], .9, 44, 400), E.linear]]), in: [-.9, 0],
      mods: [shake(c('2:step'), .7, 5, 26)],
      update(t, f) { f.look.aperture = .006; },
      chars(t) { col.at(COL); const P = ACT.pointDown(col.char, t, { dir: 1, rage: 1 }); P.held = null; P.mouth = charMouth(t, 2, ['roar', 'teethOpen', 'open', 'roar'], 'teeth'); col.draw(P); },
    });

    // ============================== 3. «Но в ногу — последнее, что ему нужно» ==============================
    shot('eyes', c('3'), {
      camera: keyed([[c('3'), headShot(capHead, [.85, 0, .52], 1.25, 44, 400)], [c('3:last'), headShot(capHead, [.85, 0, .52], .95, 44, 400), E.inOutSine]]),
      update(t, f) { f.look.aperture = .008; g.enemyDust.set(.12, t); },
      chars(t) { cap.at(CAP); const k = smooth(seg(t, c('3:in'), c('3:in') + .18)); cap.draw({ ...face('glance'), look: [k, .05], lid: [0, 1.5 * k], turn: .12 * k, mouth: 'smirkS', blink: t > c('3:step') + .1 && t < c('3:step') + .2, tilt: -.03 * k }); },
    });
    shot('chain', c('3:last'), {
      camera: keyed([[c('3:last'), cam('chainLink')], [c('3:thing') + .1, cam('pylonTop'), E.inOutSine], [c('3:wants') + .4, look([-19.2, 8.6, 4.9], [6, -2, -.6], 48), E.inOutCubic], [c('4'), look([-18.6, 8.4, 4.7], [6, -2, -.6], 46), E.linear]]), in: [.9, .3],
      update(t, f) { g.focusOn(f.look, t < c('3:thing') - .1 ? 'chainLink' : 'pylonTop'); if (t > c('3:wants')) { f.look.focus = 20; f.look.aperture = .0002; } B.setMotion({ amp: .03, wavelength: 30, phase: t * 5, chainGain: 1.5 }); },
    });

    // ============================== 4. Ущелье, мост, приказ ==============================
    shot('est', c('4'), {
      camera: keyed([[c('4'), cam('establishing')], [c('4:chain'), cam('establishingLow'), E.linear]]), hh: .05,
      update(t, f) { g.focusOn(f.look, 'establishing'); g.enemyDust.set(.14, t); M.rowOff = 1; blue.update(t); },
      chars: t => blue.draw(t),
    });
    shot('plank', c('4:chain'), {
      camera: keyed([[c('4:chain'), look([-2.2, 2.6, 6.4], [-.3, 1.0, 2.6], 60)], [c('4:chain') + .28, look([-1.5, 1.85, 4.5], [-.3, 1.05, 2.6], 42), E.outExpo], [c('4:gorge'), look([-1.4, 1.8, 4.35], [-.3, 1.05, 2.6], 40), E.linear]]), in: [0, .5], out: [0, -1.1],
      update(t, f) { f.look.focus = 2.2; f.look.aperture = .005; B.setMotion({ amp: .02, wavelength: 20, phase: t * 6 }); },
    });
    shot('down', c('4:gorge'), {
      camera: t => { const k = seg(t, c('4:gorge'), c('4:he')); return look([.6, 1.15, 2.5], [.62, lerp(-14, -60, k), lerp(5.6, 3.3, k)], lerp(58, 50, k)); }, in: [0, 1.0], hh: .5,
      update(t, f) { const p = pebble.setAge(t - c('4:gorge') - .06); f.look.focus = Math.max(1.4, 1.25 - p.y); f.look.aperture = .0012; },
    });
    const GATE = g.spots.captainGate.clone();
    shot('gate', c('4:he'), {
      camera: keyed([[c('4:he'), look([-25.2, .5, .8], [-21.6, 1.75, 0], 46)], [c('4:cross'), look([-24.3, .5, .7], [-21.6, 1.55, 0], 46), E.outCubic]]),
      update(t, f) { M.rowOff = 5.2; blue.update(t); f.look.focus = 4.5; f.look.aperture = .0012; },
      chars(t) { cap.at(GATE); blob(GATE); blue.drawWith(t, [[cap, ACT.order(cap.char, t - c('4:orders') + .1, { ...vwOf(GATE, -PI / 2), talk: false })]]); },
    });
    shot('wobble', c('4:cross'), {
      camera: keyed([[c('4:cross'), look([-24.9, 1.2, 1.5], [-21.9, 1.15, .1], 42)], [c('4:a#3'), look([-24.5, 1.2, 1.2], [-21.9, 1.15, -.1], 42), E.linear]]), in: [.6, 0], out: [-.9, 0],
      update(t, f) { f.look.aperture = .003; },
      chars(t) { const a = Math.min(t, c('4:marched')) - c('4:cross'), hold = t - c('4:marched'), z = .5 - .75 * a, p = V(GATE.x, 0, z); cap.at(p); blob(p);
        let P = gait(cap.char, 'wobble', a * 1.5 + .1, { view: 'threeQuarter', facing: 1 }); Object.assign(P, face('smirk'), { hatLag: 1.2 * Math.sin(a * 9.4), hatDy: -14 * Math.abs(Math.sin(a * 9.4)) });
        if (hold > 0) { P = ACT.order(cap.char, hold + .02, { view: 'front', talk: false }); Object.assign(P, face('smirk'), { hatLag: 1.5 * Math.exp(-hold * 9) * Math.cos(hold * 30) }); }      // «вот так»: замер с поднятой рукой
        cap.draw(P); },
    });
    shot('faces', c('4:a#3'), {
      camera: keyed([[c('4:a#3'), look([-21.0, 1.5, -1.9], [-23.5, 1.2, -1.3], 44)], [c('4:a#3') + .5, look([-20.6, 1.5, .5], [-23.5, 1.25, .95], 44), E.outCubic], [c('5'), look([-20.7, 1.5, .55], [-23.5, 1.27, .98], 44), E.linear]]), in: [.9, 0],
      update(t, f) { M.listen = c('4:a#3') + .15; blue.update(t); f.look.focus = 1.9; f.look.aperture = .003; },
      chars: t => blue.draw(t),
    });

    // ============================== 5. Вразнобой ==============================
    const SHUF_T0 = c('5');
    shot('shuffle', c('5'), {
      camera: keyed([[c('5'), look([-9.2, 1.6, 8.6], [-8.0, 1.0, 0], 42)], [c('5:six'), look([-5.4, 1.6, 8.6], [-4.4, 1.0, 0], 42), E.linear]]), out: [0, .7],      // ровный проезд вдоль настила
      update(t, f) { M.mode = 'shuffle'; M.t0 = SHUF_T0; blue.update(t); f.look.focus = 5.6; f.look.aperture = .0012; },
      chars: t => blue.draw(t),
    });
    shot('crane', c('5:six'), {
      camera: keyed([[c('5:six'), look([-9, 5, 9], [0, .8, 0], 46)], [c('5:looking'), cam('deckCrane'), E.outCubic]]), in: [0, -.6], out: [.7, 0],
      update(t, f) { M.mode = 'shuffle'; M.t0 = SHUF_T0; blue.update(t); g.focusOn(f.look, 'deckCrane'); },
      chars: t => blue.draw(t),
    });
    const heroS = t => 21 + 1.0 * (t - c('5:looking'));
    shot('bathroom', c('5:looking'), {
      camera: t => { const s = heroS(t), k = seg(t, c('5:looking'), c('6')); return look(dk(s + lerp(3.9, 3.4, k), 1.3, .15), dk(s - .4, 1.02, 1.0), 44); }, in: [-.7, 0],
      update(t, f) { M.mode = 'shuffle'; M.t0 = SHUF_T0; M.heroS = heroS(t); blue.update(t); f.look.focus = 3.6; f.look.aperture = .0025; },
      chars: t => blue.draw(t),
    });

    // ============================== 6. Генерал на гребне, труба ==============================
    const GEN = g.spots.general.clone(), ADJ = GEN.clone().add(V(-.95, 0, .46)), genHead = GEN.clone().add(V(0, 1.65, 0)), T_SPY = c("6:That's"), GH = Math.atan2(63, 88);
    const genEye = S => [S.head.x + S.face.eyes[0].x, S.head.y + S.face.eyes[0].y];
    // труба объективом на зрителя: латунное кольцо, деревянная оправа, тёмное стекло с бликом (центр — глаз)
    const lensFront = (x, ex, ey) => { const ring = (r, fill) => { x.beginPath(); x.arc(ex, ey, r, 0, TAU); x.fillStyle = fill; x.fill(); x.lineWidth = 7; x.strokeStyle = '#2C1826'; x.stroke(); };
      ring(52, '#E0B23C'); ring(41, '#6B4A2A'); const gl = x.createRadialGradient(ex - 10, ey - 12, 3, ex, ey, 31); gl.addColorStop(0, '#4A6690'); gl.addColorStop(.6, '#141C2C'); gl.addColorStop(1, '#0A0808'); ring(31, gl);
      x.beginPath(); x.arc(ex, ey, 22, -2.5, -1.8); x.lineWidth = 6; x.lineCap = 'round'; x.strokeStyle = 'rgba(255,255,255,.5)'; x.stroke(); };
    const ridgeChars = (t, mode) => {
      gen.at(GEN); ad.at(ADJ); blob(GEN, 1.2); blob(ADJ);
      const vg = vwOf(GEN, GH), va = vwOf(ADJ, GH);
      let pg, pa;
      if (mode === 'spy') { pg = ACT.spyglass(gen.char, t - c('6') + .25, { view: 'side', facing: 1, aim: -.12 }); pa = { ...ACT.smileAt(ad.char, t, { dir: 1, ...va }) }; }
      else if (mode === 'face') { const k = smooth(seg(t, c('6:general'), c('6:general') + .2)); pg = ACT.spyglass(gen.char, .5, { view: 'threeQuarter', facing: -1, len: 1 - .5 * k }); Object.assign(pg, { eyes: 'lid', mouth: k > .5 ? 'smirk' : 'smirkS', stache: 10 * k, tilt: -.06 * k }); pa = ACT.smileAt(ad.char, t, { dir: -1, ...va }); }
      else {                                                   // хохочет: труба опущена, но зажата в кулаке; перед «That's not an army» поднимает её к глазу объективом на камеру
        const raise = E.inOutCubic(seg(t, T_SPY - .52, T_SPY - .22)), S = gen.char.spec;
        pg = raise > 0 ? Object.assign(gait(gen.char, 'stand', t, { view: 'front' }), face('laughCry'), { t, tears: .5 * (1 - raise), mouth: 'laugh', bob: -8 * Math.abs(Math.sin(t * 16)) }) : ACT.laughCry(gen.char, t, { view: 'front' });
        const a = pg.arms[0], eye = genEye(S), low = [a.from[0] - 150, a.from[1] + 130 + 12 * Math.sin(t * 16)], hand = [lerp(low[0], eye[0] - 6, raise), lerp(low[1], eye[1] + 66, raise)];
        a.to = hand; a.L = Math.max(a.L, Math.hypot(hand[0] - a.from[0], hand[1] - a.from[1]) * 1.04); a.layer = 'front'; a.bend = .6; pg.hands[0] = hand;
        const ang = lerp(PI - .95 + .1 * Math.sin(t * 16), -PI / 2, raise), len = 310 * (1 - .9 * raise);
        pg.held = [{ layer: 'front', draw: x => { if (raise < .9) spyglass2D(x, { x: hand[0] - Math.cos(ang) * len * .3, y: hand[1] - Math.sin(ang) * len * .3, ang, len }); else lensFront(x, eye[0], eye[1]); } }];
        pa = { ...ACT.laughCry(ad.char, t + .2, va), tears: 0 }; }
      const list = (mode === 'spy' ? [[gen, pg]] : [[gen, pg], [ad, pa]]).sort((p, q) => q[0].xf().d - p[0].xf().d); for (const [ac, p] of list) ac.draw(p);
    };
    const ridgeWorld = (t, f, name) => { g.focusOn(f.look, name); B.setMotion(); M.mode = 'shuffle'; M.t0 = SHUF_T0; M.s0 = 6; blue.update(t); g.enemyDust.set(null); };
    shot('ridge', c('6'), {
      camera: keyed([[c('6'), look([-68.2, RT + 3.2, -93.2], [-43, RT - 5, -72.8], 46)], [c('6:the#2'), look([-65.3, RT + 1.75, -89.7], [-43, RT - 3.2, -72.8], 40), E.linear]]), out: [-1.0, 0],
      update(t, f) { ridgeWorld(t, f, 'ridge'); },
      chars(t) { blue.draw(t); ridgeChars(t, 'spy'); },
    });
    shot('genFace', c('6:the#2'), {
      camera: keyed([[c('6:the#2'), headShot(genHead, [.5, .02, .86], 2.5, 42, 490)], [c('6:the#2') + .25, headShot(genHead, [.64, .02, .77], 2.0, 42, 470), E.outCubic], [c('6:crying'), headShot(genHead, [.66, .02, .75], 1.94, 42, 470), E.linear]]), in: [1.0, 0],
      update(t, f) { ridgeWorld(t, f, 'ridgeFace'); f.look.focus = 2; f.look.aperture = .004; },
      chars: t => ridgeChars(t, 'face'),
    });
    shot('laugh', c('6:crying'), {
      camera: keyed([[c('6:crying'), headShot(genHead.clone().lerp(ADJ.clone().add(V(0, 1.6, 0)), .45), [.66, 0, .75], 3.45, 44, 500)], [T_SPY - .3, headShot(genHead.clone().lerp(ADJ.clone().add(V(0, 1.6, 0)), .45), [.66, 0, .75], 3.3, 44, 500), E.linear],
        [T_SPY, headShot(genHead, [.66, 0, .75], 1.7, 44, 520), E.inCubic]]),
      mods: [(s, t) => ({ ...s, pos: [s.pos[0], s.pos[1] + .03 * Math.sin(t * TAU * 2.6), s.pos[2]] })],
      update(t, f) { ridgeWorld(t, f, 'ridgeFace'); f.look.focus = 3.2; f.look.aperture = .003; },
      chars: t => ridgeChars(t, 'laugh'),
      over(t, f) { const k = seg(t, T_SPY - .3, T_SPY + .3); if (k <= 0) return; const xf = gen.xf(), e = genEye(gen.char.spec); spyglassThrough(f.ctx, stage, k, { cx: xf.x + e[0] * xf.s, cy: xf.y + e[1] * xf.s, r0: 31 * xf.s }); },
    });
    shot('spy', T_SPY, {
      camera: t => { const k = seg(t, T_SPY, c('7')); return look(A.spyglass.pos, [lerp(-5.5, -1.5, k), .9, 0], A.spyglass.fov * lensZoom(seg(t, T_SPY - .3, T_SPY + .3))); }, hh: .1, cut: 'soft',
      // в трубе — сами синие: мечутся по настилу во все стороны, спотыкаются, один крутится на месте, двое сталкиваются и отлетают
      update(t, f) { g.focusOn(f.look, 'spyglass'); M.mode = 'mess'; M.t0 = SHUF_T0; M.s0 = 4; M.t1 = c('6:bag') - .65; B.setMotion(); blue.update(t); blue.shadow.material.opacity = .5; g.shadowFit(V(0, 0, 0), 70); },
      chars: t => blue.draw(t),
      over(t, f) { spyglassThrough(f.ctx, stage, seg(t, T_SPY - .3, T_SPY + .3), {}); },
    });

    // ============================== 7. Лучшая марширующая армия ==============================
    shot('valley', c('7'), {
      camera: keyed([[c('7'), look([-119, 1.3, -44], [-140, 1.6, -18], 50)], [c('7:finest'), look([-113, 10.5, -50], [-142, 0, -12], 50), E.inOutSine]]), out: [.9, 0],
      update(t, f) { f.look.focus = 30; f.look.aperture = .0001; val.update(t); },
      chars(t) { val.draw(t); },
    });
    shot('row', c('7:finest'), {
      // камера стоит перед строем под ~45° к ряду: соседние головы не налезают друг на друга, лица видны в 3/4
      camera: t => { const k = .82 * E.outCubic(seg(t, c('7:finest'), c('7:finest') + .7)) + .18 * seg(t, c('7:finest'), c('7:two')), ax = valAdv(t), z0 = lerp(-34.5, -29.6, k); return look([-125.2 + ax, 1.5, z0 - 2.9], [-128 + ax, 1.22, z0 + .5], 40); }, in: [-.9, 0], out: [0, -.8],
      update(t, f) { val.update(t); f.look.focus = 4.4; f.look.aperture = .0012; },
      chars: t => val.draw(t),
    });
    const T_LAND = c('7:land'), bootPh = t => (t < T_LAND ? lerp(.02, .76, seg(t, c('7:two'), T_LAND)) : Math.min(.995, .76 + (t - T_LAND) * .3));
    shot('boots', c('7:two'), {
      camera: t => cam('valleyBoots'), in: [0, .8], hh: .1, mods: [shake(T_LAND, 1.8, 4.5, 26)],
      update(t, f) { g.focusOn(f.look, 'valleyBoots'); },
      chars(t, f) { bootsRow(f.ctx, { W, H, phase: bootPh(t), mode: 'unison', n: 7, ground: .74, horizon: .49, lift: 190 }); },
    });

    // ============================== 8. На мост, ровными рядами. Левой, правой ==============================
    const genOnDeck = (t, pose) => { const p = deckP(R.front, 0); gen.at(p); return p; };
    const genMarch = t => sabre(Object.assign(gait(gen.char, 'march', stepPh(t) / 2, vwOf(gen.pos, PI / 2)), { mouth: 'smirk', eyes: 'lid' }));
    shot('enter', c('8'), {
      camera: t => { const s = redFront(t), k = seg(t, c('8'), c('8:in')); return look(dk(s + lerp(4.4, 9.5, k), 1.55, .25), dk(s - 1, 1.3, 0), 44); },
      update(t, f) { R.front = redFront(t); B.setMotion(wave(t, .015)); red.update(t); genOnDeck(t); blob(gen.pos, 1.2); f.look.focus = 5.5; f.look.aperture = .0012; },
      chars: t => drawGen(genMarch(t), red, t),
    });
    shot('top', c('8:in'), {
      camera: t => { const s = redFront(c('8:in') + .7), k = E.outCubic(seg(t, c('8:in'), c('8:in') + .45)); return look(dk(s - 12, lerp(12, 16, k), 0), dk(s - 7, 0, 0), 50); }, in: [0, -.8], hh: .05,
      update(t, f) { R.front = redFront(t); B.setMotion(wave(t, .015)); red.update(t); f.look.focus = 17; f.look.aperture = .0001; },
      chars: t => red.draw(t),
    });
    const STEPW = ['8:Left', '8:right', '8:left#2', '8:right#2'].map(s => c(s)), PRE = .07;
    const stepShotPh = (t, k) => { const a = t - STEPW[k]; return a < 0 ? .76 + a / (PRE * 3.2) * .26 : .76 + a / (BEAT * 2) * .9; };
    for (const k of [0, 1]) shot('step' + k, STEPW[k] - PRE, {
      camera: t => { const s = redFront(STEPW[k]) - 4; return look(dk(s + 1.6, .2, k ? -1.3 : 1.3), dk(s - 2, .33, k ? -.2 : .2), 44); }, hh: .05, mods: [shake(STEPW[k], 1.5, 7, 28)],
      update(t, f) { const a = t - STEPW[k]; B.setMotion({ dips: a > 0 ? [{ u: (redFront(STEPW[k]) - 4.6) / 40, depth: .05 * Math.exp(-a * 7) * Math.cos(a * 30), width: 1.2 }] : [] }); f.look.focus = 2; f.look.aperture = .004; },
      chars(t, f) { const x = f.ctx; x.save(); if (k) { x.translate(W, 0); x.scale(-1, 1); } bootsRow(x, { W, H, phase: stepShotPh(t, k), mode: 'unison', n: 5, ground: .76, horizon: .5, lift: 170, seed: 3 + k }); x.restore(); },
    });
    shot('step2', STEPW[2] - PRE, {
      camera: t => { const s = redFront(STEPW[2]) - 5; return look(dk(s + 1.7, .8, 7.6), dk(s + 1.1, .95, 0), 36); }, mods: [shake(STEPW[2], 1.2, 7, 28)],
      update(t, f) { R.front = redFront(STEPW[2]); R.phase = tt => .5 + (tt - STEPW[2]) / (BEAT * 2) * (tt < STEPW[2] ? 1.2 : 1); const a = t - STEPW[2]; B.setMotion({ amp: a > 0 ? .04 * Math.exp(-a * 6) * Math.cos(a * 28) : 0, wavelength: 60 }); red.update(t); f.look.focus = 5.6; f.look.aperture = .0012; },
      chars: t => red.draw(t),
    });
    shot('step3', STEPW[3] - PRE, {
      camera: t => { const a = t - STEPW[3]; return look([-14.2, 4.4, 4.5], [-15.3, 5.3, 2.9], lerp(40, 37, seg(a, 0, .5))); }, mods: [shake(STEPW[3], 1.3, 6, 30)],
      update(t, f) { const a = t - STEPW[3]; g.focusOn(f.look, 'chainLink'); B.setMotion({ amp: a > 0 ? .1 * Math.exp(-a * 5) * Math.cos(a * 34) : 0, wavelength: 9, chainGain: 2.2, sway: a > 0 ? .1 * Math.exp(-a * 4) * Math.sin(a * 30) : 0 }); },
    });

    // ============================== 9–11. Мост начинает пружинить ==============================
    const amp9 = t => pl([[c('9'), .05], [c('9:bounce'), .16], [c('10'), .26], [c('11'), .5], [T12, .75]], t);
    const hop9 = t => pl([[c('9:bounce') - .3, 0], [c('9:bounce'), .1], [c('10'), .2], [c('11'), .45], [c('11:knees'), .8], [T12, .95]], t);
    const redWorld = (t, o = {}) => { R.front = o.front ?? redFront(t); R.hop = o.hop ?? hop9(t); B.setMotion(wave(t, o.amp ?? amp9(t))); red.update(t); genOnDeck(t); blob(gen.pos, 1.2); };
    const genBounce = (t, hold) => { const q = bph(t, R.front), P = hold ? ACT.holdHat(gen.char, t, vwOf(gen.pos, PI / 2)) : Object.assign(ACT.bounce(gen.char, q * .5, { period: .5, amp: 150, lift: false, ...vwOf(gen.pos, PI / 2) }), face('worried')); gen.pos.y += R.hop * hopH(q); return P; };
    shot('wave', c('9'), {
      camera: keyed([[c('9'), look([4, 2.4, 15], [-12, 1.1, 0], 40)], [c('9:the'), look([3, 2.2, 13.5], [-11.5, 1.1, 0], 36), E.outCubic], [c('9:bounce'), look([2.6, 2.1, 12.6], [-11, 1.1, 0], 34), E.linear]]), out: [0, -.6],
      update(t, f) { redWorld(t, { hop: 0, amp: lerp(.08, .22, seg(t, c('9'), c('9:bounce'))) }); g.focusOn(f.look, 'sideWide'); },
      chars: t => drawGen(genMarch(t), red, t),
    });
    shot('bounce', c('9:bounce'), {
      camera: t => { const s = redFront(t) - 1.6 - 4 * 1.15; return look(dk(s + .9, 1.1, 5.2), dk(s + .1, 1.45, .9), 42); }, in: [0, .6], out: [-.8, 0],
      update(t, f) { redWorld(t, { hop: .28, amp: .22 }); f.look.focus = 3.5; f.look.aperture = .003; },
      chars: t => red.draw(t),
    });
    shot('love', c('9:soldiers'), {
      camera: t => { const s = redFront(t) - 1.6 - 2.5 * 1.15; return look(dk(s + 2.7, 1.45, 3.9), dk(s - .1, 1.2, .8), 42); }, in: [.8, 0],
      update(t, f) { redWorld(t, { hop: .14, amp: .2 }); f.look.focus = 4; f.look.aperture = .0025;
        R.jump = (i, tt) => (i === 15 ? .55 * hopH((tt - c('9:love')) / .5 + .28) : 0);
        R.hero = (i, tt) => (i === 7 || i === 11 ? (p, mm) => ({ ...p, ...ACT.smileAt(mm.c.char, tt - c('9:soldiers'), { dir: i === 7 ? -mm.fc : mm.fc, view: mm.vw, facing: mm.fc }), eyes: 'closed', mouth: 'grin', blush: .5 }) : i === 15 ? (p, mm) => ({ ...ACT.bounce(mm.c.char, tt - c('9:love') + .14, { period: .5, amp: 150, lift: false, face: 'delight', view: mm.vw, facing: mm.fc }) }) : null); },
      chars: t => red.draw(t),
    });
    shot('whistle', c('10'), {
      camera: t => { const s = redFront(c('10')) - 1.6 - 4 * 1.15, k = E.outCubic(seg(t, c('10'), c('10') + .3)); return headShot(V(-20 + s, 1.56, .63 * 2.3), [.5, .06, .86], lerp(2.2, 1.85, k), 40, 430, 340); }, hh: .04,
      update(t, f) { redWorld(t, { hop: .0, amp: .1, front: redFront(c('10')) }); R.hideRow = 3; f.look.focus = 2; f.look.aperture = .004;      // строй шагает на месте: камера держит свистуна
        R.hero = (i, tt) => (i === 19 || i === 23 ? (p, mm) => ACT.whistle(mm.c.char, tt + i, { gait: 'march', phase: stepPh(tt) / 2, musket: true, view: mm.vw, facing: mm.fc }) : null); },
      chars: t => red.draw(t),
    });
    shot('stomp', c('10:stomp'), {
      camera: t => { const s = redFront(c('10:stomp')) - 5; return look(dk(s + 1.6, .2, 1.3), dk(s - 2, .36, .2), 44); }, hh: .04, in: [0, .9],
      mods: [0, 1].map(k => shake(c('10:stomp') + .1 + k * BEAT * 2, 1.8, 16, 28)),
      update(t, f) { B.setMotion({ amp: .05, wavelength: 26, phase: 0 }); f.look.focus = 2; f.look.aperture = .004; },
      // два удара «сильнее»: после удара сапоги четверть секунды стоят (пыль оседает), потом рывком вверх и снова вниз
      chars(t, f) { const P = BEAT * 2, u = (((t - c('10:stomp') - .1) % P) + P) % P, q = u < .27 ? .76 + .12 * u / .27 : .76 * (u - .27) / (P - .27);
        bootsRow(f.ctx, { W, H, phase: q, mode: 'unison', n: 5, ground: .76, horizon: .5, lift: 290, seed: 9 }); },
    });
    shot('under', c('11'), {
      camera: keyed([[c('11'), cam('underBridge')], [c('11:bouncing'), cam('underBridge', { fov: 44 }), E.inOutSine]]), hh: .3,
      update(t, f) { redWorld(t, {}); g.focusOn(f.look, 'underBridge'); },
      chars: t => drawGen(genBounce(t, true), red, t),
    });
    shot('knees', c('11:bouncing'), {
      camera: t => { const s = redFront(t); return look(dk(s + 4.6, 1.5, 2.2), dk(s - 1.2, 1.55, 0), 46); }, in: [0, -.8],
      update(t, f) { redWorld(t, {}); f.look.focus = 5; f.look.aperture = .0015; },
      chars: t => drawGen(genBounce(t, true), red, t),
    });

    // ============================== 12. Табличка ==============================
    const OFF = g.spots.signOfficer.clone();
    const signWorld = (t, f) => { g.sign.show(true); M.mode = 'march'; M.breakT = c('12:break'); M.rowOff = 2.6; M.adv = 0; blue.update(t); };
    shot('sign', c('12'), {
      camera: keyed([[c('12'), cam('sign', { fov: 60 })], [c('12') + .3, cam('sign'), E.outExpo], [c('12:real'), cam('sign', { fov: 36 }), E.linear]]),
      update(t, f) { signWorld(t, f); g.focusOn(f.look, 'sign'); },
    });
    shot('signWide', c('12:real'), {
      camera: keyed([[c('12:real'), cam('sign', { fov: 36 })], [c('12:real') + .45, look([-29.2, 2.7, 5.9], [-24.6, 1.25, .9], 46), E.outCubic], [c('12:break'), look([-28.8, 2.6, 5.6], [-24.6, 1.25, .9], 44), E.linear]]), out: [.8, 0],
      update(t, f) { signWorld(t, f); g.focusOn(f.look, 'signWide'); },
      chars(t) { off.at(OFF); blob(OFF); blue.drawWith(t, [[off, ACT.order(off.char, t - c('12:order') + .15, { view: 'front', talk: false })]]); },
    });
    shot('breakStep', c('12:break'), {
      camera: keyed([[c('12:break'), look([-22.6, 2.3, 4.2], [-29.5, .9, 0], 46)], [c('13'), look([-22.9, 2.0, 3.9], [-29.5, 1.0, 0], 44), E.outCubic]]), in: [-.8, 0],
      update(t, f) { signWorld(t, f); f.look.focus = 6; f.look.aperture = .0008; },
      chars: t => blue.draw(t),
    });

    // ============================== 13. Качели ==============================
    const PUSH = [c('13:Tiny'), c('13:always'), c('13:at'), c('13:moment'), c('13:moment') + (c('13:moment') - c('13:at'))], P0 = (PUSH[0] - c('13')) / 4, T_OVER = c('13:over');
    const AMP = [.17, .42, .6, .78, .94, 1.12];
    function swingAng(t) {
      if (t < PUSH[0]) return -AMP[0] * Math.cos(TAU * (t - PUSH[0]) / P0);
      let n = 0; while (n + 1 < PUSH.length && t >= PUSH[n + 1]) n++;
      const per = n + 1 < PUSH.length ? PUSH[n + 1] - PUSH[n] : PUSH[n] - PUSH[n - 1], q = (t - PUSH[n]) / per, a0 = AMP[n], a1 = AMP[n + 1] + (n + 1 >= PUSH.length - 0 ? 0 : 0);
      const amp = lerp(a0, a1, smooth(clamp(q * 2))) + .75 * smooth(seg(t, T_OVER - .2, T_OVER + .5));
      return -amp * Math.cos(TAU * q);
    }
    const pushK = t => { let k = 0; for (const p of PUSH) k = Math.max(k, 1 - Math.abs(t - p + .02) / .2); return clamp(k); };
    const swingChars = (t, f, view, hand) => {
      const ang = swingAng(t); const sp = sw.swing.seatPoint(); kidA.at(sp.pos);
      const P = ACT.swing(kidA.char, ang, { view, facing: 1 }); if (view === 'side') P.rot = -ang * .75; if (t > T_OVER + .05) P.legs = P.legs;
      kidA.draw(P);
      if (hand) { const [kx, ky, kd] = stage.project(sp.pos.clone().add(V(0, .32, 0))), k = pushK(t), enter = smooth(seg(t, c('13:pushed') - .2, c('13:pushed') + .6)), tiny = t >= PUSH[0] - .2;
        const rx = 470, ry = lerp(1500, 1040, enter), s = .8, wig = t < PUSH[0] - .2 ? 14 * Math.sin(t * 7) : 0;
        bigHand(f.ctx, { x: lerp(rx, kx + 6, k), y: lerp(ry + wig, ky + 20, k), s: s * lerp(1, .8, k), rot: lerp(-.16, -.04, k), pose: 'point', press: k }); }
    };
    const shoes = (t, f) => { const a = t - T_OVER - .12; if (a <= 0) return; const [x0, y0] = stage.project(sw.swing.pivotPos.clone().add(V(0, .4, -1.2)));
      for (const sd of [-1, 1]) { const k = a / .7, x = lerp(x0 + sd * 20, W / 2 + sd * (230 + 260 * k), E.outCubic(clamp(k))), y = lerp(y0, 250, clamp(k * 1.3)) + 1500 * Math.max(0, k - .35) ** 2 - 260 * Math.sin(clamp(k) * PI) * .3; shoe2D(f.ctx, x, y, 1 + 9 * k, sd * (a * 9) + sd); } };
    shot('swing', c('13'), {
      set: sw, camera: keyed([[c('13'), sw.cam('pov', { fov: 58 })], [c('13:kid'), sw.cam('pov', { fov: 46 }), E.outCubic], [PUSH[1], sw.cam('pov', { fov: 42 }), E.inOutSine]]),
      update(t, f) { sw.swing.setAngle(swingAng(t)); f.look.aperture = .0012; f.look.focus = 3.6; },
      chars: (t, f) => swingChars(t, f, 'back', true),
    });
    shot('swingSide', PUSH[1], {
      set: sw, camera: t => look([9.5, 1.4, -1.15], [0, 1.9, -1.15], 40),
      update(t, f) { sw.swing.setAngle(swingAng(t)); f.look.focus = 6.6; },
      chars(t, f) { swingChars(t, f, 'side', false); const [kx, ky] = stage.project(sw.swing.seatPoint().pos.clone().add(V(0, .3, .25))), k = E.outCubic(pushK(t)); bigHand(f.ctx, { x: lerp(-160, kx - 40, k), y: ky + 10, s: .62, rot: PI / 2, pose: 'point', press: k }); },
    });
    const T_ARC = c('14') - .34, T_UP = Math.min(c('13:soon'), T_ARC - .85);
    shot('swingPov', T_UP, {
      set: sw, camera: keyed([[T_UP, sw.cam('pov', { fov: 52 })], [T_UP + .12, sw.cam('pov', { fov: 52 }), E.linear], [T_ARC - .15, sw.cam('povUp', { fov: 60 }), E.inOutSine], [T_ARC, sw.cam('povUp', { fov: 58 }), E.linear]]),
      update(t, f) { sw.swing.setAngle(swingAng(t)); f.look.focus = 4; },
      chars: (t, f) => swingChars(t, f, 'back', false),
      over: shoes,
    });
    // склейка по форме: дуга качелей (размах 0.82 рад) ложится на экране туда же, где висит дуга цепи моста в следующем плане
    const ARC = .82, arcAng = t => ARC * Math.sin(PI * (seg(t, T_ARC, c('14') + .12) - .5)), SZ0 = sw.swing.pivotPos.z, PY0 = sw.swing.pivotPos.y;
    shot('swingArc', T_ARC, {
      set: sw, camera: t => look([8.27, .95, SZ0], [0, .78, SZ0], 40), hh: 0,
      update(t, f) { sw.swing.setAngle(arcAng(t)); f.look.focus = 8.3; f.look.aperture = .0003; },
      chars(t, f) { const ang = arcAng(t), sp = sw.swing.seatPoint(); kidA.at(sp.pos); const P = ACT.swing(kidA.char, ang, { view: 'side', facing: 1 }); P.rot = -ang * .75; kidA.draw(P); },
      under(t, f) { const x = f.ctx, a1 = arcAng(t); x.save(); x.lineCap = 'round'; x.lineWidth = 9;                    // след дуги за сиденьем
        for (let j = 0; j < 40; j++) { const a = lerp(-ARC, a1, j / 40), b = lerp(-ARC, a1, (j + 1) / 40), p = stage.project(V(0, PY0 - Math.cos(a) * 2.75, SZ0 - Math.sin(a) * 2.75)), q = stage.project(V(0, PY0 - Math.cos(b) * 2.75, SZ0 - Math.sin(b) * 2.75));
          x.strokeStyle = `rgba(255,255,255,${(.1 + .5 * j / 40).toFixed(3)})`; x.beginPath(); x.moveTo(p[0], p[1]); x.lineTo(q[0], q[1]); x.stroke(); } x.restore(); },
    });

    // ============================== 14. Мост тоже качается ==============================
    const FAR = z => look([0, 5, z], [0, 1.5, 0], 30), swayM = t => ({ amp: 2.6 * Math.sin((t - c('14')) * TAU / .95), wavelength: 80, standing: 1, phase: 0, chainLag: 0, sway: 1.2 * Math.sin((t - c('14')) * TAU / .9) });
    shot('sway', c('14'), {
      camera: keyed([[c('14'), FAR(118)], [c('14:and'), FAR(104), E.inOutSine], [c('14:two'), FAR(100), E.linear]]), hh: .15, cut: 'dissolve',
      update(t, f) { B.setMotion(swayM(t)); f.look.focus = 110; f.look.aperture = .00003; },
    });
    // (b) «two thousand boots landing together»: крупно ряд сапог — все опускаются в одном кадре; затем тот же шаг сбоку.
    // (c) «one giant push»: на общий шаг настил глубоко проседает и отдаёт выше прежнего; на следующем шаге — ещё сильнее.
    const T_ONE = c('14:one'), STEP2 = BEAT * 2, stepPh2 = t => (t - T_ONE) / STEP2;         // целое = общий шаг
    const kick = (a, A) => (a < 0 ? 0 : -A * smooth(a / .07) * Math.exp(-a * 1.1) * Math.cos(TAU * a / STEP2));     // отклик настила на толчок: период = период шага
    const pushM = t => { const y = kick(t - T_ONE, 2.3) + kick(t - T_ONE - STEP2, 1.5), pre = t < T_ONE ? .1 * Math.exp(-fract(stepPh2(t)) * 5) : 0;
      return { buck: y - pre * 2, buckAt: .5, amp: pre, wavelength: 80, standing: 1, phase: PI, chainLag: .3 }; };
    const sideCam = (z, y, fov) => look([3, 3.2, z], [3, y, 0], fov);
    shot('boots2000', c('14:two') - PRE, {
      camera: t => look(dk(21.6, .2, 1.3), dk(18, .33, .2), 44), hh: .04, mods: [shake(c('14:two'), 2.0, 3.6, 28)],
      update(t, f) { const a = t - c('14:two'); B.setMotion({ dips: a > 0 ? [{ u: .5, depth: .08 * Math.exp(-a * 6) * Math.cos(a * 26), width: 2 }] : [] }); f.look.focus = 2; f.look.aperture = .004; },
      // удар ровно на слове «two» (там же звук шага), четверть секунды стоят, потом весь ряд снова поднимает ногу
      chars(t, f) { const a = t - c('14:two'), q = a < 0 ? .76 + a / (PRE * 3.2) * .26 : a < .48 ? .76 + .1 * a / .48 : lerp(.0, .3, seg(a, .48, .67)); bootsRow(f.ctx, { W, H, phase: q, mode: 'unison', n: 7, ground: .76, horizon: .5, lift: 210, seed: 5 }); },
    });
    shot('rows', c('14:landing') - .1, {
      camera: keyed([[c('14:landing') - .1, sideCam(30, 1.6, 40)], [c('14:landing') + .3, sideCam(24, 1.5, 38), E.outCubic], [T_ONE, sideCam(23.4, 1.5, 38), E.linear]]), in: [-.7, 0], hh: .05,
      update(t, f) { R.front = 36; R.phase = tt => stepPh2(tt) / 2; B.setMotion(pushM(t)); red.update(t); f.look.focus = 24; f.look.aperture = .0001; },
      chars: t => red.draw(t),
    });
    shot('giant', T_ONE, {
      camera: keyed([[T_ONE, sideCam(23.4, 1.5, 38)], [T_ONE + .18, look([21, 4.2, 30], [-2, -.2, 0], 42), E.outExpo], [c('15'), look([20.4, 4.1, 29.2], [-2, -.1, 0], 42), E.linear]]), mods: [shake(T_ONE, 2.4, 5.5, 24), shake(T_ONE + STEP2, 3.0, 5, 24)], hh: .05,
      update(t, f) { R.front = 36; R.phase = tt => stepPh2(tt) / 2; const m = pushM(t); B.setMotion(m); R.hop = clamp(Math.max(0, m.buck) * .28, 0, .8); red.update(t); f.look.focus = 36; f.look.aperture = .00006; },
      chars: t => red.draw(t),
    });

    // ============================== 15. Как дождь ==============================
    // синие сапоги опускаются кто когда (крупно, вразнобой), затем вид сбоку: настил ровный
    shot('rain', c('15'), {
      camera: t => look(dk(21.6, .2, 1.3), dk(18, .33, .2), 44), hh: .04,
      update(t, f) { f.look.focus = 2; f.look.aperture = .004; },
      chars(t, f) { bootsRow(f.ctx, { W, H, phase: 3 + (t - c('15')) * 1.0, mode: 'rain', n: 7, ground: .76, horizon: .5, lift: 120, seed: 4, colors: { leg: '#F4F0E6' } }); },
    });
    shot('flat', c('15:so'), {
      camera: keyed([[c('15:so'), sideCam(27, 1.5, 40)], [c('15:so') + .3, sideCam(23.5, 1.4, 38), E.outCubic], [c('15:never'), sideCam(23.2, 1.4, 38), E.linear]]), in: [-.7, 0], hh: .05,
      update(t, f) { M.mode = 'shuffle'; M.t0 = c('15'); M.s0 = 5; blue.update(t); f.look.focus = 24; f.look.aperture = .0001; },
      chars: t => blue.draw(t),
    });
    const birdAt = () => B.chainPoint(1, .24);
    const bird = (ctx, x, y, s, t) => { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; const ink = '#2C1826', blink = fract(t * .7) < .08, tw = Math.sin(t * 9) > .93 ? -6 : 0;
      ctx.strokeStyle = ink; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-8, 30); ctx.lineTo(-8, 46); ctx.moveTo(8, 30); ctx.lineTo(8, 46); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-34, 8); ctx.lineTo(-74, 22 + tw); ctx.lineTo(-36, 24); ctx.closePath(); ctx.fillStyle = '#C96A2B'; ctx.fill(); ctx.lineWidth = 6; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, 0, 40, 34, -.15, 0, TAU); ctx.fillStyle = '#F2A23A'; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(-6, 8, 22, 15, .3, 0, TAU); ctx.fillStyle = '#C96A2B'; ctx.fill(); ctx.lineWidth = 4; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(36, -12); ctx.lineTo(60, -4); ctx.lineTo(36, 6); ctx.closePath(); ctx.fillStyle = '#F2C530'; ctx.fill(); ctx.lineWidth = 5; ctx.stroke();
      if (blink) { ctx.beginPath(); ctx.moveTo(12, -12); ctx.lineTo(26, -12); ctx.lineWidth = 5; ctx.stroke(); } else { ctx.beginPath(); ctx.arc(19, -12, 6, 0, TAU); ctx.fillStyle = ink; ctx.fill(); }
      ctx.restore(); };
    shot('bird', c('15:never'), {
      camera: t => { const p = birdAt(), k = E.outCubic(seg(t, c('15:never'), c('15:never') + .4)); return look([p.x + 1.5, p.y - .25, p.z + lerp(3.6, 2.7, k)], [p.x - .3, p.y + .12, p.z - .5], 38); }, in: [0, .8], hh: .05,
      update(t, f) { M.mode = 'shuffle'; M.t0 = c('15'); M.s0 = 5; blue.update(t); f.look.focus = 3; f.look.aperture = .003; },
      chars(t, f) { blue.draw(t); const [x, y, d] = stage.project(birdAt().add(V(0, .17, 0))); bird(f.ctx, x, y, stage.pxs() / d * .003, t); },
    });

    // ============================== 16. Сорок идеальных толчков ==============================
    const front16 = t => pl([[c('16'), 31], [T41, 37]], t);
    const world16 = (t, a, hop) => { R.front = front16(t); R.hop = hop; B.setMotion(wave(t, a, { chainGain: lerp(1, 1.7, seg(t, c('16:forty'), T41)) })); red.update(t); genOnDeck(t); blob(gen.pos, 1.2); };
    const medals = (t, f) => { const [x, y, d] = stage.project(gen.pos.clone().add(V(.1, 1.2, 0))), s = stage.pxs() / d * .002, q = fract(stepPh(t)); f.ctx.save(); f.ctx.strokeStyle = '#FFF3B0'; f.ctx.lineCap = 'round'; f.ctx.lineWidth = 9 * s; f.ctx.globalAlpha = clamp(1.2 - q * 2.2);
      for (let i = 0; i < 7; i++) { const an = -2.6 + i * .45, r0 = (70 + 60 * q) * s, r1 = (110 + 110 * q) * s; f.ctx.beginPath(); f.ctx.moveTo(x + Math.cos(an) * r0, y + Math.sin(an) * r0 * .8); f.ctx.lineTo(x + Math.cos(an) * r1, y + Math.sin(an) * r1 * .8); f.ctx.stroke(); } f.ctx.restore(); };
    shot('heave', c('16'), {
      camera: t => { const s = front16(t), k = seg(t, c('16'), c('16:gives')); return look(dk(s + lerp(4.2, 3.2, k), .55, .5), dk(s - .5, 1.5, 0), 48); },
      update(t, f) { world16(t, lerp(.5, .75, seg(t, c('16'), c('16:forty'))), .5); f.look.focus = 4; f.look.aperture = .0015; },
      chars: t => drawGen(genBounce(t, true), red, t), over: medals,
    });
    const chalk = (t, f, upto) => chalkCounter(f.ctx, stage, { t, items: [38, 39, 40, 41].slice(0, upto).map((n, i) => ({ text: n, t0: T41 + (i - 3) * BEAT - .03, x: i === 3 ? 520 : 105 + i * 172, y: i === 3 ? 520 : 330 - i * 10, size: i === 3 ? 170 : 84, seed: n, underline: i === 3, dur: .2 })) });
    shot('forty', c('16:forty'), {
      camera: keyed([[c('16:forty'), look([17, 3.4, 19], [5, 1.7, 0], 40)], [c('16:forty') + .35, look([15.5, 3.2, 16], [5.5, 1.8, 0], 38), E.outCubic], [T41, look([15.2, 3.2, 15.6], [5.5, 1.8, 0], 38), E.linear]]), in: [.6, 0],
      update(t, f) { world16(t, lerp(.75, 1.0, seg(t, c('16:forty'), T41)), .7); bolts.setOrigins(boltAt.map(b => B.hangerTop(b.i, b.side))); bolts.setTime(t); f.look.focus = 30; f.look.aperture = .0001; },
      chars: t => drawGen(genBounce(t, true), red, t),
      over: (t, f) => chalk(t, f, 3),
    });

    // ============================== 17. Сорок первый ==============================
    const T_CUT41 = Math.min(T41 - .09, c('17')) - .17, T_STOMP = T41 + .5;      // сапог 41 висит всю паузу перед «And on the forty-first», потом медленно идёт вниз
    shot('boot41', T_CUT41, {
      camera: keyed([[T_CUT41, look(dk(19.6, .22, 1.7), dk(18, .3, .1), 44)], [TB, look(dk(19.45, .2, 1.55), dk(18, .3, .1), 42), E.linear]]), hh: .1, mods: [shake(T_STOMP, 1.8, 2.6, 20)],
      update(t, f) { const a = t - T_STOMP; B.setMotion({ ...wave(T_CUT41 + (t - T_CUT41) * .25, .25), dips: a > 0 ? [{ u: .455, depth: .5 * (1 - Math.exp(-a * 5)), width: 3 }] : [] }); f.look.focus = 2; f.look.aperture = .004; },
      chars(t, f) { const k = seg(t, T41 - .1, T_STOMP), a = t - T_STOMP, lift = 620 * (1 - E.inCubic(k)); boot2D(f.ctx, { x: 330, y: 940 + (a > 0 ? 26 * (1 - Math.exp(-a * 5)) : 0), s: 1.75, lift, tilt: -.1 * (1 - k), squash: a > 0 ? .14 * Math.exp(-a * 6) * Math.cos(a * 16) : 0, legLen: 2400, lw: 9 });
        if (a > 0) { const x = f.ctx; x.save(); x.strokeStyle = 'rgba(60,36,20,.9)'; x.lineWidth = 5; x.lineCap = 'round'; const g2 = Math.min(1, a * 3); for (let i = 0; i < 9; i++) { const an = PI + i / 8 * PI, r0 = 260, r1 = 260 + (90 + 60 * hash(i)) * g2; x.beginPath(); x.moveTo(350 + Math.cos(an) * r0, 960 + Math.sin(an) * 60); x.lineTo(350 + Math.cos(an) * r1 * 1.1, 960 + Math.sin(an) * 60 - 30 * g2 * hash(i * 3)); x.stroke(); } x.restore(); } },
      over: (t, f) => chalk(t, f, 4),
    });
    const T_THROWS = c('17:throws');
    shot('buck', TB, {
      camera: keyed([[TB, look([4, 2.2, 40], [3, 2.2, 0], 44)], [TB + .3, look([4, 2.2, 42], [3, 5.5, 0], 46), E.outCubic], [T_THROWS, look([4, 2.2, 42], [3, 8, 0], 46), E.inOutSine], [T_THROWS + .3, look([4, 2.0, 40], [3, 20, 0], 48), E.inOutCubic], [T_TOP, look([4, 2.0, 40], [3, 24, 0], 48), E.linear]]),
      mods: [shake(TB, 2.6, 4, 24)],
      update(t, f) { R.front = 37; R.buckT = TB + .05; R.hop = t < TB + .05 ? .7 : 0; B.setMotion(buck(t)); red.update(t); chips.setAge(t - TB - .05, B.deckPoint(.55, 0).pos); f.look.focus = 42; f.look.aperture = .00003;
        const a = t - TB - .12; gen.at(a > 0 ? V(17 + 2 * a, 5 + 17 * a - .5 * GF * a * a, 1.5 * a) : deckP(37, 0)); },
      chars(t, f) { const a = t - TB - .12; drawGen(a > 0 ? { ...gait(gen.char, 'flail', t * 1.6, { view: 'front' }), ...face('terrified'), rot: a * 4, hatOff: true, dy: 500 } : ACT.holdHat(gen.char, t, { view: 'side', facing: 1, face: 'terrified' }), red, t); flyers2D(f.ctx, t); },
    });
    const FC = V(22.6, 0, 6.0), FL = V(23.0, 0, 7.05), T_END = c('17:gorge');
    shot('top', T_TOP, {
      camera: keyed([[T_TOP, look([17, 16, 8.6], [7, -60, 6], 52)], [DUR, look([16.6, 15, 8.4], [6.5, -60, 6], 49), E.outCubic]]), in: [0, -.9], hh: .2,
      update(t, f) { R.front = 37; R.buckT = TB + .05; R.fallT = T_TOP - .2; B.setMotion({ ...wave(t, .25), twist: .1 * Math.sin(t * 7) }); red.update(t); drops.setTime(t); g.focusOn(f.look, 'topDown');
        drum.group.visible = true; drum.sticks(-1); drum.body.scale.setScalar(5); floatBob(drum.body, t - T_TOP + 3, { pos: V(2, -60, -1), speed: 1.4 }); },
      chars(t, f) { red.draw(t); },
    });
    shot('farBank', T_END, {
      camera: keyed([[T_END, headShot(FC.clone().lerp(FL, .5).add(V(0, 1.6, 0)), [-1, .06, .3], 3.9, 44, 500)], [DUR, headShot(FC.clone().lerp(FL, .5).add(V(0, 1.6, 0)), [-1, .06, .3], 3.2, 44, 500), E.outCubic]]),
      update(t, f) { B.setMotion({ ...wave(t, .2), twist: .1 * Math.sin(t * 7) }); f.look.aperture = .002; },
      chars(t, f) { cap.at(FC); col.at(FL); blob(FC); blob(FL, 1.1);
        col.draw(ACT.jawDrop(col.char, t - T_END + .05, { view: 'front' })); cap.draw({ ...ACT.dustHands(cap.char, 1.3 + t - T_END, { view: 'front' }), ...face('smirk') }); },
    });

    // ---------- сборка сцен ----------
    shots.sort((a, b) => a.from - b.from);
    // переброс камеры (in/out) на стыке планов — не чаще одного в секунду: лишние стыки становятся обычной склейкой
    { let last = T_HZ; for (let i = 1; i < shots.length; i++) { const a = shots[i - 1], b = shots[i]; if (!a.out && !b.in) continue; if (b.from - last >= 1) last = b.from; else { delete a.out; delete b.in; } } }
    const scenes = shots.map((s, i) => {
      const to = shots[i + 1] ? shots[i + 1].from : DUR, hh = s.hh ?? .1, hm = hh ? handheld(i + 3, hh, .7) : null, WD = .1;
      const whipK = t => { let k = 0, d = null; if (s.in && t - s.from < WD) { k = 1 - E.outCubic((t - s.from) / WD); d = s.in; } if (s.out && to - t < WD) { k = E.inCubic(1 - (to - t) / WD); d = s.out; } return [k, d]; };
      return {
        id: s.id, from: s.from, to, set: s.set || g,
        camera(t) { let st = s.camera(t); for (const m of s.mods || []) st = m(st, t); if (hm) st = hm(st, t); const [k, d] = whipK(t); if (k > 0) st = pan(st, d[0] * k, d[1] * k); return st; },
        update(t, f) { reset(t); if (s.update) s.update(t, f); else { f.look.focus = camera.position.distanceTo(V(...f.cam.target)); } },
        under: s.under, chars: s.chars,
        over(t, f) { if (s.over) s.over(t, f); const [k, d] = whipK(t); if (k > 0) smear(f.ctx, k, d[0], -d[1]); },
      };
    });
    return { duration: DUR, scenes, transitions: [{ at: c('14'), type: 'dissolve', dur: .3 }] };
  },
};
