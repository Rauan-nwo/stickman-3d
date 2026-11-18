// film.js: сцена-метафора «повара» (L001, гл. 2, шотлист 303: #62 монитор, #63 один повар, #64 кухня; 2.204 + 4.964 + 6.512 =
// 13.68 с). Требования — production/L001/compare_scenes.md, раздел «3D-кухня». Внутреннее время: 0 = 162.127 с черновой
// озвучки (lines_draft.json, «The chip was a hit.»); ролик начинается с off = 1.365 («And the trick…»).
//   #62  1.365–3.569  монитор 90-х: взрыв в 3D-игре, на «changed» сетка треугольников вспыхивает разом; камера проваливается
//                     сквозь экран → видеокарта сверху → чип → кристалл; ячейки кристалла теплеют
//   #63  3.569–8.533  из ячеек кристалла раскрывается кухня («представьте»): ОДИН большой повар у своей плиты бросает блины
//                     на тарелки строго по одной; длинный стол с гостями и пустыми тарелками; метка ORDINARY PROCESSOR, счётчик
//   #64  8.533–15.045 C1 отъезд от одного маленького повара к тысячам (метка NVIDIA CHIP) · C2 ряды, синхронные подбросы
//                     блинов на «one tiny job» · C2b на «at exactly the same moment» все блины в воздухе в одном кадре, камера
//                     поднимается — сетка поваров читается как квадрат кристалла с выводами · C3 банкетный стол: на «moment»
//                     блины падают сразу на ВСЕ тарелки, гости ликуют, 1000 / 1000
// Параметры: --set shot=monitor|one|grid|sync|chip|feast — один план; --set solo=k|w — герои одни на чёрном/белом;
//   --set off=0 — с «The chip was a hit.» в начале; --set at=…,dur=… — перетайминг под голос финала (см. sh ниже).
import { THREE, V, look, keyed, E, clamp, lerp } from 'engine';
import { makeHall } from './hall.js';
import { makeBanquet } from './banquet.js';
import { pan, pancake } from './chef.js';
import { imagineFrame, tag } from './overlay.js';
import { gameFrame, flashAt } from './monitor.js';
import { drawBoard, pcbTransform, dieCover, DIE } from './pcb.js';
import plateKitchen from './assets/plate_kitchen.png';
import plateCrt from './assets/plate_crt.png';
import geo from './assets/geo.json';

const T = { A: 0, B: 3.569, C1: 8.533, C2: 10.75, C2b: 12.75, C3: 13.85, END: 15.045 };
const W = 1920, H = 1080;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const INK = '#141014';
function img(url) { const i = new Image(); i.src = url; i.style.display = 'none'; document.body.appendChild(i); return i; }

export default {
  fps: 30, size: [W, H],
  options: { shot: 'all', off: 1.365 },
  setup(stage, o) {
    stage.renderer.toneMapping = THREE.NoToneMapping;
    const solo = o.solo, OFF = +o.off;
    const HIT = OFF > .5 ? OFF + .1 : .45, WIRE = 2.15;
    const I = { k: img(plateKitchen), crt: img(plateCrt) };
    const blankSet = (bg = 0x05040a) => ({ group: new THREE.Group(), look: { bloom: 0, dof: false, fogDensity: 0, vignette: 0, bg: solo === 'w' ? 0xffffff : bg } });
    const setK = blankSet(), setA = blankSet();
    stage.add(setK.group, setA.group);
    const buf = document.createElement('canvas'); buf.width = W; buf.height = H;

    // ---------- #63 и финал: камера стоит на месте (поворот и зум) → рисованная плита — экранный слой ----------
    const G = geo.kitchen, FOV0 = G.fov0, camPos = [0, G.camY, 0];
    const pxs0 = (H / 2) / Math.tan(THREE.MathUtils.degToRad(FOV0 / 2)), ax = -(G.vp[0] - W / 2) / pxs0, ay = (G.vp[1] - H / 2) / pxs0;
    const lookK = (fov, dx = 0, dy = 0) => look(camPos, [camPos[0] + ax + dx, camPos[1] + ay + dy, -1], fov);
    const BQ = makeBanquet(stage, o, G);
    const plateDraw = () => {
      if (solo) return; const ctx = stage.ctx, im = I.k; if (!im.complete || !im.naturalWidth) return;
      const k = Math.tan(THREE.MathUtils.degToRad(FOV0 / 2)) / Math.tan(THREE.MathUtils.degToRad(stage.camera.fov / 2));
      const [sx, sy] = stage.project(V(0, G.camY, -2000));
      ctx.drawImage(im, sx - G.vp[0] * k, sy - G.vp[1] * k, W * k, H * k);
    };
    // броски: повар подбрасывает блин в сковороде и швыряет его на очередную тарелку — строго по одной
    const throws = []; for (let i = 0; i < 7; i++) { const at = T.B + .55 + i * .62, fd = .42 + i * .03; throws.push({ i, at, land: at + fd, fd }); }
    const servedB = (i, t) => { const th = throws[i]; return th ? seg(t, th.land, th.land + .35) : 0; };
    const FEAST0 = 13.82, servedC3 = (i, t) => seg(t, FEAST0, FEAST0 + .6);      // падение .21 с → касание ~14.03 («moment»)
    const CH = G.chefAt, ST = { x: CH[0] + .62, z: CH[1] + .05, w: .34, d: .26, h: .86 };   // своя плита повара справа от него
    function chefPose(t, stun = 0) {
      let th = null; for (const x of throws) if (t >= x.at - .26 && t < x.at + .36) th = x;
      let hand = [190, -560], ang = -.05, lean = 0, food = true, fy = 0, spin = 0, look = [.8, .2], mouth = 'smile', bob = 0, tilt = 0;
      if (th) {
        const u = t - th.at;
        if (u < 0) {                                                    // подброс в сковороде + замах вниз-назад
          const k = seg(u, -.26, 0), hop = Math.sin(k * Math.PI);
          hand = [190 - 60 * E.inOutSine(k), -560 + 50 * E.inOutSine(k)]; ang = -.05 + .3 * k; lean = -.07 * k; fy = -hop * 120; spin = k; look = [.6, -.4 * hop]; bob = 8 * k;
        } else {                                                        // рывок вперёд-вверх, блин улетает
          const k = E.outCubic(seg(u, 0, .09)), r = E.inOutSine(seg(u, .14, .36));
          hand = [130 + 150 * k - 20 * r, -510 - 150 * k + 90 * r]; ang = .25 - .7 * k + .45 * r; lean = .1 * k * (1 - r); food = u > .3; look = [.95, -.15]; mouth = 'open'; tilt = .06 * k * (1 - r);
        }
      } else { hand = [190 + Math.sin(t * 24) * 10, -560 + Math.cos(t * 24) * 8]; fy = -Math.abs(Math.sin(t * 12)) * 30; }
      if (stun) { hand = [170, -470]; ang = .4; food = false; look = [.95, -.05]; lean = -.05 * stun; mouth = 'O'; }
      return { hand, ang, lean, food, fy, spin, look, mouth, bob, tilt };
    }
    const panWorld = fp => { const L = 120, r = 92, cx = fp.hand[0] + Math.cos(fp.ang) * (L + r * .9), cy = fp.hand[1] + Math.sin(fp.ang) * (L + r * .9) * .55; return V(CH[0] + cx * G.unit, -cy * G.unit, CH[1]); };
    function stoveDraw() {                                              // чугунная плита повара (cel: 3 тона + контур)
      const ctx = stage.ctx, P = (x, y, z) => stage.project(V(x, y, z)), { x, z, w, d, h } = ST;
      const q = (pts, fill, lw = 4) => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.lineJoin = 'round'; ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.stroke(); };
      q([P(x - w, h, z + d), P(x + w, h, z + d), P(x + w, 0, z + d), P(x - w, 0, z + d)], '#2b2429');
      q([P(x + w, h, z - d), P(x + w, h, z + d), P(x + w, 0, z + d), P(x + w, 0, z - d)], '#1d181c');
      q([P(x - w, h, z - d), P(x + w, h, z - d), P(x + w, h, z + d), P(x - w, h, z + d)], '#5a4c4a');
      const a = P(x - w * .75, h * .72, z + d), b = P(x + w * .75, h * .15, z + d); ctx.lineWidth = 4; ctx.strokeStyle = '#141014'; ctx.strokeRect(a[0], a[1], b[0] - a[0], b[1] - a[1]);
      const hb = P(x - w * .55, h * .62, z + d), he = P(x + w * .55, h * .62, z + d); ctx.lineWidth = 7; ctx.strokeStyle = '#c9a25a'; ctx.beginPath(); ctx.moveTo(hb[0], hb[1]); ctx.lineTo(he[0], he[1]); ctx.stroke();
      for (const kx of [-.6, -.2, .2, .6]) { const p = P(x + w * kx, h * .86, z + d); ctx.beginPath(); ctx.arc(p[0], p[1], 9, 0, Math.PI * 2); ctx.fillStyle = '#d9a24a'; ctx.fill(); ctx.lineWidth = 3; ctx.stroke(); }
      const fc = P(x - .05, h + .01, z), r = 80;                       // синий огонь конфорки
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(fc[0], fc[1], 0, fc[0], fc[1], r);
      g.addColorStop(0, 'rgba(255,190,90,.6)'); g.addColorStop(.45, 'rgba(70,130,255,.45)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(fc[0], fc[1], r, r * .32, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    function contact(p, rx, ry, a) {
      const [x, y, d] = stage.project(p), r = rx * stage.pxs() / d, ctx = stage.ctx;
      ctx.save(); ctx.translate(x, y); ctx.scale(1, ry / rx); const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
      g.addColorStop(0, `rgba(6,2,4,${a})`); g.addColorStop(.6, `rgba(6,2,4,${a * .5})`); g.addColorStop(1, 'rgba(6,2,4,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    function drawChef(t, stun = 0) {
      const C = BQ.C, fp = chefPose(t, stun);
      const p = { view: 'threeQuarter', facing: 1, mouth: fp.mouth, look: fp.look, lean: fp.lean, tilt: fp.tilt, bob: fp.bob, blink: 0, sweat: stun ? 0 : .9, t, stache: stun ? 0 : 20, eyes: stun ? 'wide' : 'dot' };
      p.arms = [{ to: [-118, -395], w: 12 }, { to: fp.hand, w: 12 }];
      if (!solo) contact(V(CH[0], 0, CH[1]), .5, .12, .55);
      C.draw(p, { only: 'base' });
      if (!solo) stoveDraw();                                           // плита перед ногами повара, рука и сковорода — поверх
      C.draw(p, { only: 'front' });
      C.with(x => { pan(x, fp.hand, fp.ang, { open: .55, food: fp.food ? (xx, cx, cy, ry) => pancake(xx, cx, cy - 4 + fp.fy, 70, ry * .85, fp.spin) : null }); x.beginPath(); x.arc(fp.hand[0], fp.hand[1], 14, 0, Math.PI * 2); x.fillStyle = INK; x.fill(); });
      for (const th of throws) { const u = t - th.at; if (u > 0 && u < .24) C.with(x => { x.save(); x.globalAlpha = .8 * (1 - u / .24); x.strokeStyle = '#f1e6cc'; x.lineWidth = 9; x.lineCap = 'round';   // дуги скорости
        for (const r of [330, 400, 470]) { x.beginPath(); x.arc(60, -420, r, -1.3, -.45); x.stroke(); } x.restore(); }); }
    }
    function flying(t) {                                                 // блин по дуге от сковороды к своей тарелке
      const ctx = stage.ctx;
      for (const th of throws) {
        const u = (t - th.at) / th.fd; if (u <= 0 || u >= 1) continue;
        const a = panWorld(chefPose(th.at + .02)), pl = BQ.plates[th.i], b = BQ.W3(pl.u, pl.v, G.table.h + .02), hgt = .7 + th.i * .06;
        const at = v => V(lerp(a.x, b.x, v), lerp(a.y, b.y, v) + 4 * v * (1 - v) * hgt, lerp(a.z, b.z, v));
        const s = stage.project(at(u)), ppm = stage.pxs() / s[2];
        ctx.save(); ctx.globalAlpha = .5; ctx.strokeStyle = '#ffd27a'; ctx.lineWidth = ppm * .06; ctx.lineCap = 'round'; ctx.beginPath();
        for (let k = 0; k <= 8; k++) { const q = stage.project(at(Math.max(0, u - k * .03))); k ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }
        ctx.stroke(); ctx.restore();
        pancake(ctx, s[0], s[1], ppm * .16, ppm * .07, u * 2, INK, 3.5);
      }
    }
    const nServed = (t, f) => { let n = 0; for (let i = 0; i < BQ.N; i++) if (f(i, t) > .3) n++; return n; };

    // ---------- #64: зал с тысячами поваров ----------
    const hall = makeHall(stage, o, { flipsAt: [9.4, 10.18, 10.96, 11.74, 12.86], bigAt: 12.86 });
    const ZC = hall.Z1 / 2;
    const camC1 = keyed([
      [T.C1, look([0, 1.5, 1.75], [0, 1.2, 0], 30)],
      [T.C1 + .7, look([0, 1.75, 2.9], [0, 1.1, -.4], 34), E.inOutSine],
      [10.0, look([0, 5.2, 8.5], [0, .9, -6], 44), E.inOutSine],
      [T.C2, look([0, 13, 17], [0, 0, -22], 48), E.outSine],
    ]);
    const camC2 = keyed([[T.C2, look([-2.4, 3.4, 5.2], [1.2, .9, -7], 44)], [T.C2b, look([-2.0, 3.2, 4.4], [1.2, .9, -7], 44), E.inOutSine]]);
    const camC2b = keyed([[T.C2b, look([0, 3.6, 5.5], [0, 1.3, -6], 46)], [13.22, look([0, 5.5, 8], [0, 1.4, -8], 50), E.inOutSine],
      [13.6, look([0, 118, 30], [0, 0, ZC + 2], 52), E.inCubic], [T.C3, look([0, 108, 27], [0, 0, ZC + 2], 52), E.outSine]]);
    const camB = keyed([[T.B, lookK(FOV0 - 1.5)], [T.C1, lookK(FOV0 - 5, -.01, -.015), E.inOutSine]]);
    const camC3 = keyed([[T.C3, lookK(FOV0 - .5, .02, 0)], [T.END, lookK(FOV0 - 2.5, .03, 0), E.inOutSine]]);
    const camA = () => look([0, 0, 5], [0, 0, 0], 40);

    // ---------- #62: монитор → провал в экран → плата → кристалл ----------
    const S = geo.crt.screen;
    const DIVE = { screen: 2.35, full: 2.82, die: 3.35 };             // наезд в экран; экран заполнил кадр; кристалл заполнил кадр
    const pcbK = t => t < DIVE.full ? .55 : Math.exp(lerp(Math.log(.55), Math.log(12.4), E.inOutSine(seg(t, DIVE.full, DIVE.die)))) * (1 + .08 * seg(t, DIVE.die, T.B + .5));
    function pcbLayer(ctx, t) { ctx.save(); pcbTransform(ctx, W, H, pcbK(t)); drawBoard(ctx, t, seg(t, DIVE.full + .25, T.B - .05)); ctx.restore(); }
    function monitorShot(t) {
      const ctx = stage.ctx, sc = [(S[0] + S[2]) / 2, (S[1] + S[3]) / 2], sw = S[2] - S[0], sh = S[3] - S[1];
      const kFill = Math.max(W / sw, H / sh) * 1.08;
      const k = lerp(1, 1.22, E.inOutSine(seg(t, HIT - .1, DIVE.screen))) * Math.exp(Math.log(kFill / 1.22) * E.inCubic(seg(t, DIVE.screen, DIVE.full)));
      ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(k, k); ctx.translate(-lerp(W / 2, sc[0], seg(k, 1, 1.5)), -lerp(H / 2, sc[1], seg(k, 1, 1.5)));
      if (I.crt.complete && I.crt.naturalWidth) ctx.drawImage(I.crt, 0, 0, W, H);
      ctx.save(); ctx.beginPath(); ctx.roundRect(S[0], S[1], sw, sh, 30); ctx.clip();
      const g = gameFrame(t, { hit: HIT, wire: WIRE });
      ctx.imageSmoothingEnabled = false; ctx.drawImage(g, S[0], S[1], sw, sh); ctx.imageSmoothingEnabled = true;
      // на экране сквозь игру проступает видеокарта (камера проходит «внутрь»)
      const pa = seg(t, DIVE.screen + .2, DIVE.full);
      if (pa > 0) { ctx.save(); ctx.globalAlpha = pa; ctx.translate(S[0], S[1]); ctx.scale(sw / W, sh / H); pcbLayer(ctx, t); ctx.restore(); }
      ctx.fillStyle = 'rgba(0,0,0,.22)'; for (let y = S[1]; y < S[3]; y += 4) ctx.fillRect(S[0], y, sw, 1.5);
      const gl = ctx.createRadialGradient(sc[0], sc[1], 10, sc[0], sc[1], sw * .7); gl.addColorStop(0, 'rgba(255,255,255,.06)'); gl.addColorStop(1, 'rgba(0,0,20,.45)');
      ctx.fillStyle = gl; ctx.fillRect(S[0], S[1], sw, sh);
      ctx.restore();
      const fl = flashAt(t, HIT);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const rg = ctx.createRadialGradient(sc[0], sc[1], 40, sc[0], sc[1], 900); rg.addColorStop(0, `rgba(255,150,60,${.32 * fl})`); rg.addColorStop(.5, `rgba(120,140,255,${.05 + .1 * fl})`); rg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H); ctx.restore();
      ctx.restore();
      if (t >= DIVE.full) pcbLayer(ctx, t);                              // дальше — уже «внутри»: плата и чип на весь кадр
      const v = ctx.createRadialGradient(W / 2, H / 2, H * .45, W / 2, H / 2, H * 1.05); v.addColorStop(0, 'rgba(5,4,10,0)'); v.addColorStop(1, 'rgba(5,4,10,.65)'); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    }

    const label = (t, word, sub, at, pulse = 0) => tag(stage.ctx, W, H, t, { word, sub, at, pulse });
    const scenes = [
      { id: 'monitor', from: T.A, to: T.B, set: setA, camera: camA, chars(t) { if (!solo) monitorShot(t); } },
      { id: 'one', from: T.B, to: T.C1, set: setK, camera: camB,
        under() { plateDraw(); },
        chars(t) {
          BQ.drawTable(t, servedB);
          drawChef(t); flying(t);
          if (solo) return;
          dieCover(stage.ctx, W, H, pcbK(t), seg(t, T.B, T.B + .55), buf);   // кухня вырастает из ячеек кристалла
          imagineFrame(stage.ctx, W, H, t, { draw: seg(t, T.B + .3, T.B + 1.0) });
          label(t, 'ORDINARY PROCESSOR', `plates: ${nServed(t, servedB)} / 1000`, T.B + .7);
        } },
      { id: 'grid', from: T.C1, to: T.C2, set: hall.set, camera: camC1,
        update() { hall.setFog(1); }, under() { hall.chipOutline(stage.ctx, .9); hall.pools(stage.ctx); },
        chars(t) { hall.draw(t); if (solo) return; imagineFrame(stage.ctx, W, H, t); label(t, 'NVIDIA CHIP', 'thousands of cooks', 10.15); } },
      { id: 'sync', from: T.C2, to: T.C2b, set: hall.set, camera: camC2,
        update() { hall.setFog(1); }, under() { hall.pools(stage.ctx); },
        chars(t) { hall.draw(t); if (solo) return; imagineFrame(stage.ctx, W, H, t); label(t, 'NVIDIA CHIP', 'one pancake each', T.C2); } },
      { id: 'chip', from: T.C2b, to: T.C3, set: hall.set, camera: camC2b,
        look: { fogDensity: 0 },
        update(t, f) { const m = lerp(1, .06, E.inCubic(seg(t, 13.22, 13.6))); hall.setFog(m); f.look.fogDensity = solo ? 0 : .03 * m; },
        under(t) { hall.chipOutline(stage.ctx, 1); hall.pools(stage.ctx); },
        chars(t) { hall.draw(t); if (solo) return; imagineFrame(stage.ctx, W, H, t); label(t, 'NVIDIA CHIP', 'all at once', T.C2b); } },
      { id: 'feast', from: T.C3, to: T.END, set: setK, camera: camC3,
        under() { plateDraw(); },
        chars(t) {
          BQ.drawTable(t, servedC3, { cheerAt: 14.03, fall: 2.2 });
          drawChef(t, seg(t, 14.1, 14.3));
          if (solo) return;
          const fl = t > 14.0 ? Math.exp(-(t - 14.0) * 3) : 0;
          if (fl > .01) { const c = stage.ctx; c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = `rgba(255,190,110,${.42 * fl})`; c.fillRect(0, 0, W, H); c.restore(); }
          imagineFrame(stage.ctx, W, H, t);
          const n = Math.round(1000 * E.outCubic(seg(t, 13.98, 14.12)));
          label(t, 'NVIDIA CHIP', `plates: ${n} / 1000`, T.C3, t > 14.03 ? Math.exp(-(t - 14.03) * 5) : 0);
        } },
    ];
    // --set at=<changed>,<An>,<Nvidia's>,<one>,<at>,<moment> --set dur=<с>: перетайминг под текущий голос (финал L001, clips3d/ch02.js).
    // Время ролика (0 = «And the trick…») -> внутреннее время сцены кусочно-линейно по якорям: слова черновика -> слова голоса,
    // стыки планов (An = B, Nvidia's = C1) совпадают с монтажными склейками кадр в кадр. Без at — как было (время черновика).
    const SCN = [OFF, 2.33, T.B, T.C1, 12.19, 13.12, 14.14, T.END];                 // якоря во внутреннем времени (слова lines_draft)
    const AT = o.at ? [0, ...String(o.at).split(',').map(Number), +o.dur || (T.END - OFF)] : SCN.map(x => x - OFF);
    const pl = (x, A, B) => { if (x <= A[0]) return B[0] + (x - A[0]); for (let i = 1; i < A.length; i++) if (x <= A[i]) return B[i - 1] + (B[i] - B[i - 1]) * (x - A[i - 1]) / (A[i] - A[i - 1]); return B[B.length - 1] + (x - A[A.length - 1]); };
    const warp = u => pl(u, AT, SCN), unwarp = t => pl(t, SCN, AT);
    const sh = s => { const w = fn => fn && ((t, f) => fn(warp(t), f)); return { ...s, from: Math.max(0, unwarp(s.from)), to: unwarp(s.to), camera: w(s.camera), under: w(s.under), chars: w(s.chars), update: w(s.update) }; };
    const pick = (o.shot === 'all' ? scenes : scenes.filter(s => s.id === o.shot)).map(sh);
    if (o.shot !== 'all') { const s = pick[0]; return { duration: s.to, frames: Math.round(s.to * 30), scenes: [{ ...s, from: 0 }] }; }
    return { duration: AT[AT.length - 1], scenes: pick };
  },
};
