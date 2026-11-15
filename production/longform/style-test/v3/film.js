// v3/film.js: стилевой тест «Stickman Noir», раунд 3.
//   shot=seated (по умолчанию) — 5 с: Дженсен и Алиса за столиком. Руки с локтем (presetsLong: armStyle 'elbow'),
//                                кисти приклеены к скатерти, пока корпус качается; у каждого один жест на ударном слове.
//   shot=host                  — интро ведущего moneyman: своя «декорация» — окно и шторы из того же фона,
//                                ниже подоконника нарисованы стенная панель и пол; стоит на полу, контактная тень.
//   light=on | off             — свет на героях (cel-тень формы в два тона, тёплый край от свечи, холодный край
//                                от окна только на корпусе — ниже шеи)
// Правила рук и слоёв: wiki/craft/layering-and-motion.md (разделы 1 и 2б).
import { THREE, V, Actor, act, blinkAt, keyed, look, E, jensen, alice, moneyman, unUpper, shoulder, arcHand, gesture, restHand, elbowIK } from 'engine';
import plateV2 from '../assets/plate_v2.png';
import farV2 from '../assets/far_v2.jpg';
import maskWindow from '../assets/mask_window_v2.png';
import maskCloth from '../assets/mask_cloth_v2.png';

const SW = 1672, SH = 941, D = 10, FAR = 18, FOV = 40;
const PH = 2 * D * Math.tan(THREE.MathUtils.degToRad(FOV / 2)), PW = PH * 16 / 9;
const src = (u, v, z = -D) => { const k = -z / D; return V((u / SW - .5) * PW * k, (.5 - v / SH) * PH * k, z); };

function img(url) { const i = new Image(); i.src = url; i.style.display = 'none'; document.body.appendChild(i); return i; }
function masked(plate, mask, invert) {
  const c = document.createElement('canvas'); c.width = plate.naturalWidth; c.height = plate.naturalHeight; const x = c.getContext('2d');
  x.drawImage(plate, 0, 0);
  if (mask) { x.globalCompositeOperation = invert ? 'destination-out' : 'destination-in'; x.drawImage(mask, 0, 0, c.width, c.height); }
  return c;
}
const CANDLE = '#ffb35c', WINDOW = '#7fd3ef', NECK = -586, BRIM = -775;   // BRIM: выше — макушка, волосы, шляпа: краёв там нет (иначе «пластик»)                // NECK — низ головы в единицах фигуры
const seatedLight = f => ({
  ambient: { color: '#9aa3c4', k: .06 },
  key: { dir: [f, .35], color: '#55507e', k: .38, width: 62, cel: true },                    // два тона, чёткая граница
  rim: [{ dir: [f, .3], color: CANDLE, k: .7, width: 13, soft: 2, inset: 16, below: BRIM }, { dir: [-f * .5, -1], color: WINDOW, k: .3, width: 8, soft: 2, inset: 16, below: NECK }],
  shadow: { dx: -f * 24, dy: 10, blur: 12, k: .45 },
});
const hostLight = {
  ambient: { color: '#9aa3c4', k: .06 },
  key: { dir: [-.8, -.4], color: '#55507e', k: .38, width: 62, cel: true },
  rim: [{ dir: [-1, -.3], color: CANDLE, k: .6, width: 12, soft: 2, inset: 16, below: BRIM }, { dir: [1, -.4], color: WINDOW, k: .4, width: 8, soft: 2, inset: 16, below: NECK }],
  shadow: null,
};

export default {
  fps: 30, size: [1920, 1080],
  options: { shot: 'seated', light: 'on', look: 'v4' },   // look: subtle (лёгкий объём по частям, по умолчанию) | old (сильный свет раунда 3) | flat
  setup(stage, o) {
    stage.renderer.toneMapping = THREE.NoToneMapping;
    stage.setVignette({ alpha: .32, color: '6,4,10', inner: .45, outer: 1.05, cy: .5 });
    const host = o.shot === 'host', lit = o.light !== 'off';
    const I = { plate: img(plateV2), far: img(farV2), win: img(maskWindow), cloth: img(maskCloth) };
    const mat = () => new THREE.MeshBasicMaterial({ transparent: true, fog: false, toneMapped: false, depthWrite: false });
    const near = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), mat()); near.position.set(0, 0, -D);
    const far = new THREE.Mesh(new THREE.PlaneGeometry(PW * FAR / D, PH * FAR / D), mat()); far.position.set(0, 0, -FAR); far.renderOrder = -1;
    const group = new THREE.Group(); group.add(far, near); stage.add(group);
    let ready = false, clothC = null;
    const tex = c => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; return t; };
    const set = {
      group, look: { bloom: 0, dof: false, fogDensity: 0, vignette: o.solo || o.vig === '0' ? 0 : 1, bg: o.solo === 'w' ? 0xffffff : 0x05040a },
      tick() {
        if (o.solo) { group.visible = false; return; }                         // проверка непрозрачности: герои одни на чёрном
        if (ready || !Object.values(I).every(i => i.complete && i.naturalWidth)) return;
        near.material.map = tex(masked(I.plate, host ? null : I.win, true)); near.material.needsUpdate = true;   // интро: фон целиком (камера близко — параллакс окна не нужен)
        far.material.map = tex(masked(I.far, null, false)); far.material.needsUpdate = true; far.visible = !host;   // за окнами только город
        clothC = masked(I.plate, I.cloth, false); ready = true;
      },
    };
    const plateRect = () => { const [x0, y0] = stage.project(V(-PW / 2, PH / 2, -D)), [x1, y1] = stage.project(V(PW / 2, -PH / 2, -D)); return [x0, y0, x1 - x0, y1 - y0]; };
    function contact(p, rxm, rym, a = .5) {
      const [x, y, d] = stage.project(p), r = rxm * stage.pxs() / d, ctx = stage.ctx;
      ctx.save(); ctx.translate(x, y); ctx.scale(1, rym / rxm);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r); g.addColorStop(0, `rgba(6,2,4,${a})`); g.addColorStop(.6, `rgba(6,2,4,${a * .5})`); g.addColorStop(1, 'rgba(6,2,4,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    const fixMouth = p => { if (p.mouth === 'teeth' || p.mouth === 'teethOpen') p.mouth = 'open'; return p; };

    if (!host) {
      const unit = +(o.unit || .0059), ARMW = 11;
      // свет одной стороны на кадр (свеча на столе), отдельно на каждую часть (голова, тело, руки):
      //   r5 (по умолчанию) — тень тела и головы как в раунде 3 (cel, multiply), тёплый край ~70 % от раунда 3, руки — тёплый край;
      //   r4 — мягкая тень головы 13 %, край 8 %;  old — свет раунда 3 (по силуэту целиком, с артефактами);  flat — без света
      const mode = !lit ? 'flat' : o.look || 'v4';
      // v4 (по умолчанию, финальный вид): как раунд 1 — без тени формы на теле, тёплый край по контуру тела со стороны свечи,
      // блеск одежды; добавка — мягкий серый объём на белой голове (дальняя сторона и под волосами) и очень мягкий тёплый край
      const V4 = f => ({ dir: [f, .45], body: { k: 0 }   /* тёплый свет только на лице и волосах: на одежде давал полосы и «вымытый» низ */,
        head: { k: .42, color: '#55507e', shiftU: 52, after: true, glow: { color: '#ffc47a', k: .3 } } });   // голова: серп тени ~30 % на дальней от свечи стороне
      const SHADE = f => mode === 'v4' ? V4(f) : mode === 'r4'
        ? { dir: [f, .3], body: { k: .4, color: '#55507e', shiftU: 62, soft: 0, op: 'multiply' }, head: { k: .13, shift: .35, soft: .3 }, rim: { color: '#ffc27a', k: .08 } }
        : { dir: [f, .3], body: { k: .4, color: '#55507e', shiftU: 62, soft: 0, op: 'multiply' }, head: { k: .4, color: '#55507e', shiftU: 56, softU: 0, soft: .1, op: 'multiply' },
            rim: { color: '#ffc27a', k: .5, wU: 17, softU: 1.5 } };
      const lt = f => mode === 'old' ? seatedLight(f) : mode === 'flat' || o.solo ? null : { shadow: { dx: -f * 24, dy: 10, blur: 12, k: .4 } };
      // посадка ближе к столу; ближняя рука на столешнице у края, дальняя — на бедре сбоку (видна, руки не перекрещиваются)
      const SEAT = [[252, 905], [1430, 905]], TOP = 752;   // сидят СБОКУ от стола: свес скатерти не заходит на торс                  // TOP — линия столешницы у боков стола (пиксели фона)
      const J = new Actor(stage, jensen(), { pin: 'seat', unit, light: lt(1) }).at(src(...SEAT[0]));
      const Al = new Actor(stage, alice(), { pin: 'seat', unit, light: lt(-1) }).at(src(...SEAT[1]));
      if (mode === 'r4' || mode === 'r5' || mode === 'v4') { J.char.spec.shade = SHADE(1); Al.char.spec.shade = SHADE(-1); }
    if (o.limbs === 'plain') for (const A of [J, Al]) delete A.char.spec.limbLook;   // сравнение: руки и ноги раунда 5 (без «трубки»)
      for (const A of [J, Al]) A.char.spec.rig = { ...A.char.spec.rig, armLayer: 'front' };       // руки отдельным проходом поверх стола
      const cast = [
        { A: J, f: 1, near: 1, pin: [446, 742], elbow: [378, 750], talk: [.25, 2.35], at: 1.05 },
        { A: Al, f: -1, near: 0, pin: [1236, 742], elbow: [1304, 750], talk: [2.6, 4.7], at: 3.45 },
      ];
      const cam = keyed([[0, look([0, 0, 0], [0, 0, -1], FOV)], [5, look([.08, .03, -.62], [.08, .03, -1.62], FOV), E.inOutSine]]);
      return {
        duration: 5,
        scenes: [{
          id: 'seated', from: 0, to: 5, set, camera: cam,
          under() { if (o.solo) return; contact(src(...SEAT[0]), .9, .16, .55); contact(src(...SEAT[1]), .9, .16, .55); },
          chars(t) {
            const pj = fixMouth(act(t, [[0, 'neutral'], [.25, 'talk'], [2.35, 'smug'], [4.75, 'laugh']]));
            const pa = fixMouth(act(t, [[0, 'smug'], [2.6, 'talk'], [4.7, 'neutral']]));
            Object.assign(pj, { blink: blinkAt(t, 1), view: 'threeQuarter', facing: 1, stance: 'sitR', look: [.6, 0] });
            Object.assign(pa, { blink: blinkAt(t, 2), view: 'threeQuarter', facing: -1, stance: 'sitL', look: [-.6, 0] });
            const shadows = [];
            for (const [c, p] of [[cast[0], pj], [cast[1], pa]]) {
              const S = c.A.char.spec, g = gesture(t, c.at, { lead: .12, rise: .24, hold: .5, fall: .32, lagFrames: 3 });
              p.bob = (p.bob || 0) * .35; p.sq = (p.sq || 0) * .35;
              p.lean = (p.lean || 0) * .5 + c.f * .045 * g.body;                                    // корпус (плечо) ведёт жест
              p.tilt = (p.tilt || 0) + c.f * .04 * g.body;
              const arms = [];
              const loc = pt => unUpper(S, p, c.A.toLocal(src(pt[0], pt[1])));
              const q = loc(c.pin), ev = loc(c.elbow), sdN = c.near ? 1 : -1, sh = shoulder(S, sdN);
              if (g.hand > .001) {                                                                      // жест: кисть по дуге вперёд-вверх, локоть отрывается от стола
                const up = [sh[0] + c.f * 175, sh[1] - 60], hand = arcHand(sh, q, up, g.hand);
                const Lr = Math.hypot(ev[0] - sh[0], ev[1] - sh[1]) + Math.hypot(q[0] - ev[0], q[1] - ev[1]), ik = elbowIK(sh, hand, Lr, sdN).e, m = Math.min(1, g.hand);
                arms[c.near] = { to: hand, via: [ev[0] + (ik[0] - ev[0]) * m, ev[1] + (ik[1] - ev[1]) * m], w: ARMW };
                if (g.hand < .5) shadows.push([c.A, ev, q, 1 - g.hand * 2]);
              } else { arms[c.near] = { to: q, via: ev, w: ARMW }; shadows.push([c.A, ev, q, 1]); }
              const far = 1 - c.near; arms[far] = { to: restHand(S, far ? 1 : -1), w: ARMW };          // дальняя рука на бедре сбоку
              p.arms = arms;
            }
            J.draw(pj, { only: 'base' }); Al.draw(pa, { only: 'base' });
            // скатерть закрывает только то, что НИЖЕ линии столешницы (колени, низ корпуса под столом): горизонтальный срез
            // на уровне столешницы, а не вертикальный край свеса через торс. Торс выше столешницы виден целиком.
            if (clothC && !o.solo) { const [x, y, w, h] = plateRect(), yTop = y + TOP / SH * h, c = stage.ctx;
              c.save(); c.beginPath(); c.rect(0, yTop, stage.W, stage.H); c.clip(); c.drawImage(clothC, x, y, w, h); c.restore(); }
            // тень предплечья и кисти на столешнице (только внутри эллипса столешницы)
            { const ctx = stage.ctx, [x0, y0, w, h] = plateRect(), sx = u => x0 + u / SW * w, sy = v => y0 + v / SH * h;
              ctx.save(); ctx.beginPath(); ctx.ellipse(sx(840), sy(723), 510 / SW * w, 53 / SH * h, 0, 0, Math.PI * 2); ctx.clip();
              for (const [A, ev, q, k] of shadows) {
                const xf = A.xf(), toS = pt => [xf.x + (pt[0] - A.pin[0]) * xf.s + 6, xf.y + (pt[1] - A.pin[1]) * xf.s + 8];
                const e = toS(ev), hnd = toS(q);
                ctx.filter = 'blur(6px)'; ctx.globalAlpha = .45 * k; ctx.strokeStyle = 'rgb(40,14,10)'; ctx.lineCap = 'round'; ctx.lineWidth = ARMW * xf.s * 1.8;
                ctx.beginPath(); ctx.moveTo(e[0], e[1]); ctx.lineTo(hnd[0], hnd[1]); ctx.stroke();
                ctx.fillStyle = 'rgb(40,14,10)'; ctx.beginPath(); ctx.ellipse(hnd[0], hnd[1], 22 * xf.s, 9 * xf.s, 0, 0, Math.PI * 2); ctx.fill();
              }
              ctx.restore(); }
            J.draw(pj, { only: 'front' }); Al.draw(pa, { only: 'front' });
          },
        }],
      };
    }
    // ---------- интро ведущего: окно и шторы фона, ниже — нарисованные стенная панель и пол ----------
    const C0 = src(850, 380), dz = D * 1160 / SW;                            // кадр: x 270..1430, y 54..706 пикселей фона
    const camH = look([C0.x, C0.y, -D + dz], [C0.x, C0.y, -D + dz - 1], FOV);
    const unitH = +(o.unit || .0047), feet = src(850, 672);
    const M = new Actor(stage, moneyman(), { pin: 'feet', unit: unitH, light: lit ? hostLight : null }).at(feet);
    function room() {
      const ctx = stage.ctx, W = stage.W, H = stage.H, ink = '#1C1418';
      const sy = v => stage.project(src(850, v))[1];
      const ySill = sy(476), yFloor = sy(590);                 // подоконник закрывает стол, бокалы и цветы фона
      // подоконник и стенная панель под окном (тёмное дерево, cel: два тона + контур)
      ctx.save(); ctx.lineJoin = 'round';
      ctx.fillStyle = '#4a2c24'; ctx.fillRect(0, ySill, W, yFloor - ySill);
      ctx.fillStyle = '#3a221d'; ctx.fillRect(0, ySill + (yFloor - ySill) * .55, W, (yFloor - ySill) * .45);
      ctx.fillStyle = '#6b4232'; ctx.fillRect(0, ySill - 16, W, 26);
      ctx.lineWidth = 4; ctx.strokeStyle = ink; ctx.strokeRect(-10, ySill - 16, W + 20, 26); ctx.beginPath(); ctx.moveTo(0, yFloor); ctx.lineTo(W, yFloor); ctx.stroke();
      ctx.fillStyle = 'rgba(255,200,140,.25)'; ctx.fillRect(0, ySill - 14, W, 5);
      for (let i = 0; i < 6; i++) { const x0 = 40 + i * (W - 80) / 6; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(20,10,8,.8)'; ctx.strokeRect(x0 + 14, ySill + 30, (W - 80) / 6 - 28, yFloor - ySill - 52); }
      // пол: доски к точке схода, отражение окна (холодное) и тёплое пятно бра
      ctx.fillStyle = '#2b1915'; ctx.fillRect(0, yFloor, W, H - yFloor);
      ctx.strokeStyle = 'rgba(10,4,3,.75)'; ctx.lineWidth = 3;
      for (let i = -12; i <= 12; i++) { ctx.beginPath(); ctx.moveTo(W / 2 + i * 70, yFloor); ctx.lineTo(W / 2 + i * 260, H); ctx.stroke(); }
      const g = ctx.createRadialGradient(W / 2, yFloor + 30, 10, W / 2, yFloor + 30, 700); g.addColorStop(0, 'rgba(120,200,230,.18)'); g.addColorStop(1, 'rgba(120,200,230,0)');
      ctx.fillStyle = g; ctx.fillRect(0, yFloor, W, H - yFloor);
      ctx.lineWidth = 4; ctx.strokeStyle = ink; ctx.beginPath(); ctx.moveTo(0, yFloor); ctx.lineTo(W, yFloor); ctx.stroke();
      ctx.restore();
      contact(feet, .55, .07, .7);
    }
    return {
      duration: 1,
      scenes: [{
        id: 'host', from: 0, to: 1, set, camera: () => camH,
        under() { room(); },
        chars() {
          const S = M.char.spec, p = fixMouth(act(.22, [[0, 'talk']]));
          // левая рука в покое у бедра, правая держит карманные часы (кисть на часах на жилете)
          p.arms = [{ to: restHand(S, -1) }, { to: [66, S.body.y + 24] }];
          p.mouth = 'smile'; p.lean = 0; p.bob = 0;
          M.draw(p);
        },
      }],
    };
  },
};
