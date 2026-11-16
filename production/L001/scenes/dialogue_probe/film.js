// dialogue_probe/film.js — проба «набора диалога» (review_before_build.md, п. 3.2): тост гл. 1, 14 с, 6 планов.
//   1  0.0–2.4   общий план (фон v3), наезд; событие — Дженсен приподнимает руку со стола, свеча вспыхивает
//   2  2.4–4.6   крупно Дженсен: увеличенный кусок того же фона с размытием, скатерть справа резкая; «To the next shipment.»
//   3  4.6–6.8   обратная точка, крупно Алиса: новый фон «от окна в зал» (assets/plate_reverse.png); «To good partners.»
//   4  6.8–8.8   вставка: два бокала, звон, искра
//   5  8.8–11.2  через плечо Алисы (вид со спины, размыта) на Дженсена в 3/4; Дженсен смеётся
//   6  11.2–14   общий план, медленнее
// Проверка непрозрачности: --set solo=k|w --set vig=0 (как в style-test/v3).
// Координаты фона общего плана: v3 — пиксели исходника 1672×941 (src), 2D-планы — пиксели плиты 1920×1080.
import { THREE, V, Actor, act, blinkAt, keyed, look, E, jensen, alice, noirShade, unUpper, shoulder, arcHand, gesture, restHand, elbowIK, elbowArm, clamp, seg, lerp, ell } from 'engine';
import plateV2 from '../../../longform/style-test/assets/plate_v2.png';
import farV2 from '../../../longform/style-test/assets/far_v2.jpg';
import maskWindow from '../../../longform/style-test/assets/mask_window_v2.png';
import maskCloth from '../../../longform/style-test/assets/mask_cloth_v2.png';
import plateRev from './assets/plate_reverse.png';
import maskRev from './assets/mask_rev_cloth.png';

const SW = 1672, SH = 941, D = 10, FAR = 18, FOV = 40;
const PH = 2 * D * Math.tan(THREE.MathUtils.degToRad(FOV / 2)), PW = PH * 16 / 9;
const src = (u, v, z = -D) => { const k = -z / D; return V((u / SW - .5) * PW * k, (.5 - v / SH) * PH * k, z); };
const P19 = (u, v) => [u * 1920 / SW, v * 1080 / SH];              // пиксели исходника -> пиксели плиты 1920
const UNIT = .0059, FIGPX = UNIT * 1920 / PW;                       // пикселей плиты на единицу фигуры на общем плане (~.875)
const ARMW = 11, TOP = 752;                                         // TOP — линия столешницы (пиксели исходника)
const SEAT = [[252, 905], [1430, 905]];
// тайминг
const CUT = [0, 2.4, 4.6, 6.8, 8.8, 11.2, 14];
const J_LINE = [2.75, 4.15], A_LINE = [4.95, 6.2], CLINK = 7.55;

function img(url) { const i = new Image(); i.src = url; i.style.display = 'none'; document.body.appendChild(i); return i; }
function masked(plate, mask, invert) {
  const c = document.createElement('canvas'); c.width = plate.naturalWidth || plate.width; c.height = plate.naturalHeight || plate.height; const x = c.getContext('2d');
  x.drawImage(plate, 0, 0);
  if (mask) { x.globalCompositeOperation = invert ? 'destination-out' : 'destination-in'; x.drawImage(mask, 0, 0, c.width, c.height); }
  return c;
}
// размытая копия плиты (глубина резкости 2D-планов); края не темнеют — под картинкой её же растянутая копия
function blurred(im, r, pad = true) {
  const W = im.naturalWidth || im.width, H = im.naturalHeight || im.height, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  x.filter = `blur(${r}px)`;
  if (pad) x.drawImage(im, -r * 3, -r * 3, W + r * 6, H + r * 6);
  x.drawImage(im, 0, 0); return c;
}
const fixMouth = p => { if (p.mouth === 'teeth' || p.mouth === 'teethOpen') p.mouth = 'open'; return p; };
const ease = (t, a, b, f = E.inOutSine) => f(clamp((t - a) / (b - a)));

export default {
  fps: 30, size: [1920, 1080],
  options: { look: 'v4' },
  setup(stage, o) {
    stage.renderer.toneMapping = THREE.NoToneMapping;
    stage.setVignette({ alpha: .32, color: '6,4,10', inner: .45, outer: 1.05, cy: .5 });
    const solo = o.solo, W = stage.W, H = stage.H;
    const I = { plate: img(plateV2), far: img(farV2), win: img(maskWindow), cloth: img(maskCloth), rev: img(plateRev), revM: img(maskRev) };
    const mat = () => new THREE.MeshBasicMaterial({ transparent: true, fog: false, toneMapped: false, depthWrite: false });
    const near = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), mat()); near.position.set(0, 0, -D);
    const far = new THREE.Mesh(new THREE.PlaneGeometry(PW * FAR / D, PH * FAR / D), mat()); far.position.set(0, 0, -FAR); far.renderOrder = -1;
    const group = new THREE.Group(); group.add(far, near); stage.add(group);
    const empty = new THREE.Group(); stage.add(empty);
    const tex = c => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; return t; };
    const A = {};                                                     // подготовленные канвасы (один раз, когда картинки загрузились)
    const LOOK = { bloom: 0, dof: false, fogDensity: 0, vignette: solo || o.vig === '0' ? 0 : 1, bg: solo === 'w' ? 0xffffff : 0x05040a };
    let ready = false;
    const prep = () => {
      if (ready || !Object.values(I).every(i => i.complete && i.naturalWidth)) return ready;
      near.material.map = tex(masked(I.plate, I.win, true)); near.material.needsUpdate = true;
      far.material.map = tex(masked(I.far, null, false)); far.material.needsUpdate = true;
      A.cloth = masked(I.plate, I.cloth, false);                       // скатерть общего плана (резкая)
      A.plateB4 = blurred(I.plate, 4); A.plateB2 = blurred(I.plate, 2.2);
      A.clothB = blurred(masked(I.plate, I.cloth, false), .8, false);  // скатерть на крупном плане: почти резкая (та же глубина, что и герой)
      A.revB = blurred(I.rev, 3.2); A.revB9 = blurred(I.rev, 8); A.revFG = blurred(masked(I.rev, I.revM, false), 1.6, false);
      return (ready = true);
    };
    const set = { group, look: LOOK, tick() { if (solo) { group.visible = false; return; } prep(); } };
    const set2D = { group: empty, look: LOOK, tick() { prep(); } };
    const plateRect = () => { const [x0, y0] = stage.project(V(-PW / 2, PH / 2, -D)), [x1, y1] = stage.project(V(PW / 2, -PH / 2, -D)); return [x0, y0, x1 - x0, y1 - y0]; };
    function contact(p, rxm, rym, a = .5) {
      const [x, y, d] = stage.project(p), r = rxm * stage.pxs() / d, ctx = stage.ctx;
      ctx.save(); ctx.translate(x, y); ctx.scale(1, rym / rxm);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r); g.addColorStop(0, `rgba(6,2,4,${a})`); g.addColorStop(.6, `rgba(6,2,4,${a * .5})`); g.addColorStop(1, 'rgba(6,2,4,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    // тёплая вспышка свечи (событие общего плана): мягкое пятно поверх пламени и стола, k 0..1
    function candleFlare(cx, cy, r, k) {
      if (k < .003 || solo) return; const ctx = stage.ctx; ctx.save(); ctx.globalCompositeOperation = 'screen';
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, `rgba(255,190,110,${.55 * k})`); g.addColorStop(.35, `rgba(255,150,70,${.22 * k})`); g.addColorStop(1, 'rgba(255,140,60,0)');
      ctx.fillStyle = g; ctx.fillRect(cx - r, cy - r, r * 2, r * 2); ctx.restore();
    }

    // ============ общий план (как v3): Actor на фоне-плоскости, руки на столешнице ============
    const J = new Actor(stage, jensen(), { pin: 'seat', unit: UNIT, light: solo ? null : { shadow: { dx: -24, dy: 10, blur: 12, k: .4 } } }).at(src(...SEAT[0]));
    const Al = new Actor(stage, alice(), { pin: 'seat', unit: UNIT, light: solo ? null : { shadow: { dx: 24, dy: 10, blur: 12, k: .4 } } }).at(src(...SEAT[1]));
    J.char.spec.shade = noirShade([1, .45]); Al.char.spec.shade = noirShade([-1, .45]);
    for (const X of [J, Al]) X.char.spec.rig = { ...X.char.spec.rig, armLayer: 'front' };
    function wideChars(t, { jAt, aAt, jFace, aFace }) {
      const pj = fixMouth(act(t, jFace)), pa = fixMouth(act(t, aFace));
      Object.assign(pj, { blink: blinkAt(t, 1), view: 'threeQuarter', facing: 1, stance: 'sitR', look: [.6, 0] });
      Object.assign(pa, { blink: blinkAt(t, 2), view: 'threeQuarter', facing: -1, stance: 'sitL', look: [-.6, 0] });
      const cast = [{ A: J, p: pj, f: 1, near: 1, pin: [446, 742], elbow: [378, 750], at: jAt }, { A: Al, p: pa, f: -1, near: 0, pin: [1236, 742], elbow: [1304, 750], at: aAt }];
      const shadows = [];
      for (const c of cast) {
        const S = c.A.char.spec, p = c.p, g = c.at == null ? { hand: 0, body: 0 } : gesture(t, c.at, { lead: .12, rise: .24, hold: .5, fall: .32, lagFrames: 3 });
        p.bob = (p.bob || 0) * .35; p.sq = (p.sq || 0) * .35; p.lean = (p.lean || 0) * .5 + c.f * .045 * g.body; p.tilt = (p.tilt || 0) + c.f * .04 * g.body;
        const arms = [], loc = pt => unUpper(S, p, c.A.toLocal(src(pt[0], pt[1])));
        const q = loc(c.pin), ev = loc(c.elbow), sdN = c.near ? 1 : -1, sh = shoulder(S, sdN);
        if (g.hand > .001) {
          const up = [sh[0] + c.f * 175, sh[1] - 60], hand = arcHand(sh, q, up, g.hand);
          const Lr = Math.hypot(ev[0] - sh[0], ev[1] - sh[1]) + Math.hypot(q[0] - ev[0], q[1] - ev[1]), ik = elbowIK(sh, hand, Lr, sdN).e, m = Math.min(1, g.hand);
          arms[c.near] = { to: hand, via: [ev[0] + (ik[0] - ev[0]) * m, ev[1] + (ik[1] - ev[1]) * m], w: ARMW };
          if (g.hand < .5) shadows.push([c.A, ev, q, 1 - g.hand * 2]);
        } else { arms[c.near] = { to: q, via: ev, w: ARMW }; shadows.push([c.A, ev, q, 1]); }
        const fa = 1 - c.near; arms[fa] = { to: restHand(S, fa ? 1 : -1), w: ARMW };
        p.arms = arms;
      }
      J.draw(pj, { only: 'base' }); Al.draw(pa, { only: 'base' });
      if (A.cloth && !solo) { const [x, y, w, h] = plateRect(), yTop = y + TOP / SH * h, ctx = stage.ctx;
        ctx.save(); ctx.beginPath(); ctx.rect(0, yTop, W, H); ctx.clip(); ctx.drawImage(A.cloth, x, y, w, h); ctx.restore(); }
      if (!solo) { const ctx = stage.ctx, [x0, y0, w, h] = plateRect(), sx = u => x0 + u / SW * w, sy = v => y0 + v / SH * h;
        ctx.save(); ctx.beginPath(); ctx.ellipse(sx(840), sy(723), 510 / SW * w, 53 / SH * h, 0, 0, Math.PI * 2); ctx.clip();
        for (const [X, ev, q, k] of shadows) {
          const xf = X.xf(), toS = pt => [xf.x + (pt[0] - X.pin[0]) * xf.s + 6, xf.y + (pt[1] - X.pin[1]) * xf.s + 8], e = toS(ev), hnd = toS(q);
          ctx.filter = 'blur(6px)'; ctx.globalAlpha = .45 * k; ctx.strokeStyle = 'rgb(40,14,10)'; ctx.lineCap = 'round'; ctx.lineWidth = ARMW * xf.s * 1.8;
          ctx.beginPath(); ctx.moveTo(e[0], e[1]); ctx.lineTo(hnd[0], hnd[1]); ctx.stroke();
          ctx.fillStyle = 'rgb(40,14,10)'; ctx.beginPath(); ctx.ellipse(hnd[0], hnd[1], 22 * xf.s, 9 * xf.s, 0, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore(); }
      J.draw(pj, { only: 'front' }); Al.draw(pa, { only: 'front' });
    }
    const wideUnder = () => { if (solo) return; contact(src(...SEAT[0]), .9, .16, .55); contact(src(...SEAT[1]), .9, .16, .55); };
    const flame = () => { const [x0, y0, w, h] = plateRect(); return [x0 + 912 / 1920 * w, y0 + 748 / 1080 * h, w / 1920]; };

    // ============ 2D-планы: «камера» = (cx, cy, k) в пикселях плиты; фон — размытая плита со своим (меньшим) ходом ============
    const ctx = stage.ctx;
    const cover = v => ({ ...v, cx: clamp(v.cx, 960 / v.k, 1920 - 960 / v.k), cy: clamp(v.cy, 540 / v.k, 1080 - 540 / v.k) });
    const toS = (v, P) => [(P[0] - v.cx) * v.k + W / 2, (P[1] - v.cy) * v.k + H / 2];
    const plate2D = (im, v) => { if (solo || !im) return; ctx.drawImage(im, W / 2 - v.cx * v.k, H / 2 - v.cy * v.k, 1920 * v.k, 1080 * v.k); };
    // фигура в координатах плиты: seat — точка сиденья (пиксели плиты), fs — пикселей плиты на единицу фигуры
    function drawFig(C, p, v, seatP, fs, opt) {
      const [x, y] = toS(v, seatP), s = fs * v.k, pin = C.spec.pins.seat;
      ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.translate(-pin[0], -pin[1]); C.draw(ctx, p, opt); ctx.restore();
    }
    const figLoc = (S, p, seatP, fs, P) => unUpper(S, p, [(P[0] - seatP[0]) / fs + S.pins.seat[0], (P[1] - seatP[1]) / fs + S.pins.seat[1]]);
    // тень предплечья на столешнице (экранные точки), клип — path()
    function armShadow(e, hnd, k, s, clip) {
      if (solo || k < .01) return; ctx.save(); clip(); ctx.clip();
      ctx.filter = `blur(${(6 * s / FIGPX).toFixed(1)}px)`; ctx.globalAlpha = .45 * k; ctx.strokeStyle = 'rgb(40,14,10)'; ctx.lineCap = 'round'; ctx.lineWidth = ARMW * s * 1.8;
      ctx.beginPath(); ctx.moveTo(e[0] + 6 * s, e[1] + 8 * s); ctx.lineTo(hnd[0] + 6 * s, hnd[1] + 8 * s); ctx.stroke();
      ctx.fillStyle = 'rgb(40,14,10)'; ctx.beginPath(); ctx.ellipse(hnd[0] + 6 * s, hnd[1] + 8 * s, 22 * s, 9 * s, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    // мягкое тёплое пятно-боке свечи вне кадра (сторона света)
    function bokeh(x, y, r, a) { if (solo) return; ctx.save(); ctx.globalCompositeOperation = 'screen'; const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(255,180,100,${a})`); g.addColorStop(.5, `rgba(255,150,70,${a * .4})`); g.addColorStop(1, 'rgba(255,140,60,0)'); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore(); }

    // крупные планы: свои экземпляры героев (у Алисы серп без «укуса» прядей — cutY)
    const JC = jensen(), AC = alice(), AB = alice();
    JC.spec.shade = noirShade([1, .45]); AC.spec.shade = noirShade([-1, .45], { cutY: -40 }); AB.spec.shade = noirShade([-1, .45], { cutY: -40 });
    for (const C of [JC, AC, AB]) C.spec.rig = { ...C.spec.rig, armLayer: 'front' };
    const seatJ = [P19(...SEAT[0])[0] - 40, P19(...SEAT[0])[1]], pinJ = P19(452, 731), elbJ = P19(374, 750), TOP19 = TOP * 1080 / SH;
    const tableTop = v => { const c = toS(v, P19(840, 723)); ctx.beginPath(); ctx.ellipse(c[0], c[1], 510 * 1920 / SW * v.k, 53 * 1080 / SH * v.k, 0, 0, Math.PI * 2); };
    // Дженсен на крупных планах: поза + руки (ближняя на столе, жест к ударному слову), рисование по слоям вокруг скатерти
    function jensenCU(t, v, { face, at, view = 'threeQuarter', lookAt = [.6, 0], lean = 0 }) {
      const S = JC.spec, p = fixMouth(act(t, face)); Object.assign(p, { blink: blinkAt(t, 1), view, facing: 1, stance: 'sitR', look: lookAt });
      const g = at == null ? { hand: 0, body: 0 } : gesture(t, at, { lead: .12, rise: .26, hold: .55, fall: .34, lagFrames: 3 });
      p.bob = (p.bob || 0) * .35; p.sq = (p.sq || 0) * .35; p.lean = (p.lean || 0) * .5 + .045 * g.body + lean; p.tilt = (p.tilt || 0) + .04 * g.body;
      const q = figLoc(S, p, seatJ, FIGPX, pinJ), ev = figLoc(S, p, seatJ, FIGPX, elbJ), sh = shoulder(S, 1), arms = []; let shk = 1, hand = q, elbow = ev;
      if (g.hand > .001) {
        const up = [sh[0] + 175, sh[1] - 60]; hand = arcHand(sh, q, up, g.hand);
        const Lr = Math.hypot(ev[0] - sh[0], ev[1] - sh[1]) + Math.hypot(q[0] - ev[0], q[1] - ev[1]), ik = elbowIK(sh, hand, Lr, 1).e, m = Math.min(1, g.hand);
        elbow = [ev[0] + (ik[0] - ev[0]) * m, ev[1] + (ik[1] - ev[1]) * m]; shk = clamp(1 - g.hand * 2);
      }
      arms[1] = { to: hand, via: elbow, w: ARMW }; arms[0] = { to: restHand(S, -1), w: ARMW }; p.arms = arms;
      drawFig(JC, p, v, seatJ, FIGPX, { only: 'base' });
      if (!solo && A.clothB) plate2D(A.clothB, v);       // скатерть целиком резкая: торс сидящего сбоку её не касается, ступеньки на линии столешницы нет
      // тень предплечья: точки «до корпуса» -> экран (как в общем плане — от приклеенных точек стола)
      armShadow(toS(v, elbJ), toS(v, pinJ), shk, FIGPX * v.k, () => tableTop(v));
      drawFig(JC, p, v, seatJ, FIGPX, { only: 'front' });
      return p;
    }

    // ---------- план 2: крупно Дженсен ----------
    const v2 = t => { const k = ease(t, CUT[1], CUT[2], E.outCubic); return cover({ cx: lerp(520, 528, k), cy: lerp(752, 744, k), k: lerp(1.84, 1.95, k) }); };
    const shot2 = {
      id: 'cu_jensen', from: CUT[1], to: CUT[2], set: set2D, camera: () => look([0, 0, 0], [0, 0, -1], FOV),
      under(t) { plate2D(A.plateB4, v2(t)); },
      chars(t) {
        const v = v2(t);
        jensenCU(t, v, { face: [[0, 'smug'], [J_LINE[0], 'talk'], [J_LINE[1], 'smug']], at: 3.62 });
        bokeh(W + 60, H - 40, 520, .32);                                       // свеча справа внизу, вне кадра
      },
    };

    // ---------- план 3: обратная точка, крупно Алиса ----------
    const FS_A = 1.62, seatA = [1250, 1100];                                // пикселей плиты на единицу фигуры; сиденье (пиксели обратной плиты)
    const REV_EDGE = [[0, 968], [40, 958], [120, 955], [160, 945], [240, 938], [360, 929], [600, 928], [960, 931], [1200, 949], [1340, 958], [1420, 970], [1500, 985], [1560, 998], [1640, 1012], [1640, 1080], [0, 1080]];
    const v3 = t => { const k = ease(t, CUT[2], CUT[3], E.outCubic); return cover({ cx: lerp(960, 990, k), cy: lerp(540, 552, k), k: lerp(1.0, 1.05, k) }); };
    const pinA = [1000, 1025], elbA = [1085, 958], pinA2 = [1412, 1035], elbA2 = [1352, 972];
    const shot3 = {
      id: 'cu_alice_reverse', from: CUT[2], to: CUT[3], set: set2D, camera: () => look([0, 0, 0], [0, 0, -1], FOV),
      under(t) { plate2D(A.revB, v3(t)); },
      chars(t) {
        const v = v3(t), S = AC.spec, p = fixMouth(act(t, [[0, 'smug'], [A_LINE[0], 'talk'], [A_LINE[1], 'smug']]));
        Object.assign(p, { blink: blinkAt(t, 2), view: 'threeQuarter', facing: -1, stance: 'sitL', look: [-.6, 0] });
        // событие: в конце реплики дальней рукой поправляет очки (кисть к дужке у виска), держит ~.5 с
        const g = gesture(t, 6.2, { lead: .14, rise: .3, hold: .45, fall: .3, lagFrames: 3 });
        p.bob = (p.bob || 0) * .35; p.sq = (p.sq || 0) * .35; p.lean = (p.lean || 0) * .5 - .03 * g.body; p.tilt = (p.tilt || 0) - .03 * g.body;
        const q = figLoc(S, p, seatA, FS_A, pinA), ev = figLoc(S, p, seatA, FS_A, elbA), q2 = figLoc(S, p, seatA, FS_A, pinA2), ev2 = figLoc(S, p, seatA, FS_A, elbA2);
        const sh2 = shoulder(S, 1), temple = [S.head.x + 122, S.head.y - 6];
        let hand2 = q2, el2 = ev2;
        if (g.hand > .001) {
          hand2 = arcHand(sh2, q2, temple, g.hand);
          const Lr = Math.hypot(ev2[0] - sh2[0], ev2[1] - sh2[1]) + Math.hypot(q2[0] - ev2[0], q2[1] - ev2[1]), ik = elbowIK(sh2, hand2, Lr, 1).e, m = Math.min(1, g.hand);
          el2 = [ev2[0] + (ik[0] - ev2[0]) * m, ev2[1] + (ik[1] - ev2[1]) * m];
        }
        p.arms = [{ to: q, via: ev, w: ARMW }, { to: hand2, via: el2, w: ARMW }];
        drawFig(AC, p, v, seatA, FS_A, { only: 'base' });
        plate2D(A.revFG, v);                                                   // край нашего стола и свеча — перед героиней
        const clip = () => { ctx.beginPath(); REV_EDGE.forEach(([x, y], i) => { const s = toS(v, [x, y + 6]); i ? ctx.lineTo(...s) : ctx.moveTo(...s); }); ctx.closePath(); };
        armShadow(toS(v, elbA), toS(v, pinA), 1, FS_A * v.k, clip);
        armShadow(toS(v, elbA2), toS(v, pinA2), clamp(1 - g.hand * 2), FS_A * v.k, clip);
        drawFig(AC, p, v, seatA, FS_A, { only: 'front' });
      },
    };

    // ---------- план 4: вставка — бокалы ----------
    function wineGlass(x, y, g, a, ink, wine, slosh) {               // (x, y) — кисть на ножке, g — пикселей на единицу, a — наклон
      ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.scale(g, g); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      const bowl = () => { ctx.beginPath(); ctx.moveTo(-52, -196); ctx.bezierCurveTo(-74, -130, -64, -60, -8, -36); ctx.lineTo(8, -36); ctx.bezierCurveTo(64, -60, 74, -130, 52, -196); ctx.closePath(); };
      // ножка и основание
      ctx.fillStyle = 'rgba(205,230,245,.35)'; ctx.strokeStyle = ink; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.ellipse(0, 84, 58, 13, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-6, -38); ctx.lineTo(-5, 76); ctx.lineTo(5, 76); ctx.lineTo(6, -38); ctx.closePath(); ctx.fill(); ctx.stroke();
      // чаша: стекло + вино (поверхность остаётся горизонтальной в мире, качается от удара)
      bowl(); ctx.fillStyle = 'rgba(190,220,240,.16)'; ctx.fill();
      ctx.save(); bowl(); ctx.clip(); ctx.rotate(-a + slosh);
      const gr = ctx.createLinearGradient(0, -120, 0, -30); gr.addColorStop(0, wine[0]); gr.addColorStop(1, wine[1]);
      ctx.fillStyle = gr; ctx.fillRect(-140, -112, 280, 200);
      ctx.fillStyle = 'rgba(255,170,150,.35)'; ctx.beginPath(); ctx.ellipse(0, -112, 70, 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      bowl(); ctx.lineWidth = 6.5; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, -196, 52, 9, 0, 0, Math.PI * 2); ctx.lineWidth = 4.5; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(-40, -170); ctx.quadraticCurveTo(-56, -120, -36, -78); ctx.stroke();
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.beginPath(); ctx.moveTo(38, -176); ctx.lineTo(44, -150); ctx.stroke();
      ctx.restore();
    }
    const G4 = 1.85, TILT = .2, TAU = Math.PI * 2;
    const rimIn = (side, a) => { const ux = 52 * -side, uy = -196; return [ux * Math.cos(a) - uy * Math.sin(a), ux * Math.sin(a) + uy * Math.cos(a)].map(q => q * G4); };
    const v4 = t => { const k = ease(t, CUT[3], CUT[4], E.outCubic); return cover({ cx: lerp(880, 900, k), cy: lerp(600, 592, k), k: lerp(2.6, 2.72, k) }); };
    const shot4 = {
      id: 'insert_glasses', from: CUT[3], to: CUT[4], set: set2D, camera: () => look([0, 0, 0], [0, 0, -1], FOV),
      under(t) { plate2D(A.revB9, v4(t)); },
      chars(t) {
        // подход: бокалы поднимаются и сходятся с ускорением к удару, после — отскок с перелётом и мелкая дрожь
        const rise = ease(t, CUT[3], CLINK - .15, E.outCubic), app = t < CLINK ? E.inCubic(clamp((t - (CUT[3] + .1)) / (CLINK - CUT[3] - .1))) : 1;
        const rec = t < CLINK ? 0 : E.outBack(clamp((t - CLINK) / .3)), jit = t < CLINK ? 0 : Math.sin((t - CLINK) * 38) * Math.exp(-(t - CLINK) * 9) * .03;
        const gap = lerp(170, 0, app) + 22 * rec, aL = TILT + jit, aR = -TILT - jit, y = lerp(980, 700, rise) - 8 * rec;
        const rl = rimIn(-1, aL), rr = rimIn(1, aR);                               // внутренние точки края чаш
        const xL = W / 2 - rl[0] - gap / 2 - 1, xR = W / 2 - rr[0] + gap / 2 + 1;
        const slosh = t < CLINK ? 0 : Math.sin((t - CLINK) * 14) * Math.exp(-(t - CLINK) * 3.2) * .16;
        const s = G4, inkJ = '#141014', inkA = '#1A1216';
        // руки: от плеча за краем кадра, локоть вниз; кисть-точка на ножке
        const arm = (sx, hx, hy, side, ink) => { ctx.save(); ctx.scale(s, s); elbowArm(ctx, [sx / s, (H + 330) / s], [hx / s, hy / s], 720, side, undefined, ARMW, ink, null, { dir: [-side, .45] }, { ink }); ctx.restore(); };
        wineGlass(xL, y, s, aL, inkJ, ['#8e1a2c', '#4d0812'], slosh); wineGlass(xR, y, s, aR, inkA, ['#8e1a2c', '#4d0812'], -slosh);
        arm(-260, xL, y + 4, 1, inkJ); arm(W + 260, xR, y + 4, -1, inkA);   // рука ближе к камере, чем основание бокала
        for (const [hx, ink] of [[xL, inkJ], [xR, inkA]]) ell(ctx, hx, y + 4, 12 * s, 12 * s, ink, null);
        // событие: блик-звёздочка и искры в точке касания краёв
        const d = t - CLINK;
        if (d > -.02 && d < .55 && !solo) {
          const cx = W / 2, cy = y + (rl[1] + rr[1]) / 2 + 4, k = d < .05 ? clamp((d + .02) / .07) : Math.pow(1 - (d - .05) / .5, 2), R = 120 * (.6 + .4 * clamp(d / .1));
          ctx.save(); ctx.globalCompositeOperation = 'screen';
          const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.4); g.addColorStop(0, `rgba(255,248,220,${.9 * k})`); g.addColorStop(.25, `rgba(255,220,150,${.4 * k})`); g.addColorStop(1, 'rgba(255,200,120,0)');
          ctx.fillStyle = g; ctx.fillRect(cx - R * 1.5, cy - R * 1.5, R * 3, R * 3);
          ctx.fillStyle = `rgba(255,252,235,${k})`;
          for (let i = 0; i < 4; i++) { ctx.save(); ctx.translate(cx, cy); ctx.rotate(i * Math.PI / 2 + .3); ctx.beginPath(); ctx.moveTo(0, -R); ctx.quadraticCurveTo(4, -6, R * .12, 0); ctx.quadraticCurveTo(4, 6, 0, R * .0); ctx.lineTo(-R * .12, 0); ctx.quadraticCurveTo(-4, -6, 0, -R); ctx.fill(); ctx.restore(); }
          for (let i = 0; i < 9; i++) { const an = -Math.PI / 2 + (i / 8 - .5) * 2.6, sp = 380 + 140 * ((i * 37) % 5) / 5, dd = Math.max(0, d);
            const px = cx + Math.cos(an) * sp * dd, py = cy + Math.sin(an) * sp * dd + 900 * dd * dd, r = 5 * (1 - clamp(dd / .5));
            if (r > .3) { ctx.beginPath(); ctx.arc(px, py, r, 0, TAU); ctx.fillStyle = `rgba(255,236,190,${clamp(1.4 - dd * 2.6)})`; ctx.fill(); } }
          ctx.restore();
        }
      },
    };

    // ---------- план 5: через плечо Алисы на Дженсена (3/4) ----------
    const v5 = t => { const k = ease(t, CUT[4], CUT[5]); return cover({ cx: lerp(640, 660, k), cy: lerp(720, 712, k), k: lerp(1.5, 1.55, k) }); };
    let fgBuf = null;
    const shot5 = {
      id: 'ots_jensen', from: CUT[4], to: CUT[5], set: set2D, camera: () => look([0, 0, 0], [0, 0, -1], FOV),
      under(t) { plate2D(A.plateB2, v5(t)); },
      chars(t) {
        const v = v5(t);
        jensenCU(t, v, { face: [[0, 'smug'], [9.35, 'laugh'], [10.55, 'smug']], at: null, lean: -.03 * ease(t, 9.35, 9.7) * (1 - ease(t, 10.5, 10.9)) });
        // передний план: Алиса со спины (вид 'back'), ближе к камере, размыта и темнее; движется быстрее фона (параллакс)
        const S = AB.spec, k = ease(t, CUT[4], CUT[5]), p = act(t, [[0, 'neutral']]);
        Object.assign(p, { view: 'back', facing: -1, stance: 'sitL', bob: 0, sq: 0, lean: -.04, tilt: .05 });
        p.arms = [{ to: [-40, S.rig.hipY - 40], w: ARMW, layer: 'behind' }, { to: restHand(S, 1), w: ARMW, layer: 'behind' }];
        if (!fgBuf) { fgBuf = document.createElement('canvas'); fgBuf.width = W; fgBuf.height = H; }
        const fx = fgBuf.getContext('2d'); fx.setTransform(1, 0, 0, 1, 0, 0); fx.clearRect(0, 0, W, H);
        const s = 2.0, x = lerp(1820, 1785, k), y = 720 + 412 * s;                  // y — сиденье (голова на ~760)
        fx.save(); fx.translate(x, y); fx.scale(s, s); fx.translate(0, 300); AB.draw(fx, p); fx.restore();
        if (!solo) { fx.globalCompositeOperation = 'source-atop'; fx.fillStyle = 'rgba(8,6,14,.3)'; fx.fillRect(0, 0, W, H); fx.globalCompositeOperation = 'source-over'; }
        ctx.save(); ctx.filter = solo ? 'none' : 'blur(7px)'; ctx.drawImage(fgBuf, 0, 0); ctx.restore();
      },
    };

    // ---------- планы 1 и 6: общий ----------
    const cam1 = keyed([[CUT[0], look([0, 0, 0], [0, 0, -1], FOV)], [CUT[1], look([.04, .01, -.34], [.04, .01, -1.34], FOV), E.inOutSine]]);
    const cam6 = keyed([[CUT[5], look([.03, .01, -.12], [.03, .01, -1.12], FOV)], [CUT[6], look([.07, .03, -.3], [.07, .03, -1.3], FOV), E.outCubic]]);
    const shot1 = {
      id: 'wide_in', from: CUT[0], to: CUT[1], set, camera: cam1, under: wideUnder,
      chars(t) {
        wideChars(t, { jAt: 1.25, aAt: null, jFace: [[0, 'neutral']], aFace: [[0, 'smug']] });
        const [fx, fy, sc] = flame(), k = Math.exp(-Math.pow((t - 1.15) / .28, 2)); candleFlare(fx, fy, 260 * sc, .35 + .65 * k + .06 * Math.sin(t * 23));
      },
    };
    const shot6 = {
      id: 'wide_out', from: CUT[5], to: CUT[6], set, camera: cam6, under: wideUnder,
      chars(t) {
        wideChars(t, { jAt: null, aAt: 12.4, jFace: [[0, 'smug']], aFace: [[0, 'smug']] });
        const [fx, fy, sc] = flame(); candleFlare(fx, fy, 260 * sc, .35 + .06 * Math.sin(t * 23) + .04 * Math.sin(t * 7.1));
      },
    };
    return { duration: CUT[6], scenes: [shot1, shot2, shot3, shot4, shot5, shot6] };
  },
};
