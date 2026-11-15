// v2/film.js: стилевой тест «Stickman Noir», раунд 2 — рисованный фон (bg_restaurant_v2.png, средний план стола)
// + НЕОБЯЗАТЕЛЬНЫЙ свет сцены на героях (engine/src/chars/light.js: тёплый край от свечи, холодный от окна, тень формы).
//   shot=seated (по умолчанию) — 5 с: Дженсен (левый стул) и Алиса (правый) по очереди говорят, медленный наезд
//   shot=host                  — стоп-кадр: ведущий moneyman перед тем же фоном, тот же свет
//   light=on | off             — свет на героях (off — чисто белые головы, как в шортсах)
// Фон — плоскость на 10 м с вырезанными стёклами + тот же кадр на 18 м за окнами (горизонт отстаёт при наезде).
// Фон апскейлен 1672 -> 1920 Lanczos в make_assets.py. Координаты якорей — в пикселях исходника 1672x941.
import { THREE, V, Actor, act, blinkAt, keyed, look, E, jensen, alice, moneyman } from 'engine';
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
// свет: dir — направление на источник (экран). Свеча на столе, окно позади-сверху, бра по краям.
const CANDLE = '#ffb35c', WINDOW = '#7fd3ef';
const seatedLight = f => ({                                    // f = +1 — свеча справа от героя, -1 — слева
  ambient: { color: '#9aa3c4', k: .07 },
  key: { dir: [f, .35], color: '#4a4a78', k: .45, width: 70, soft: 55 },
  rim: [{ dir: [f, .3], color: CANDLE, k: .75, width: 14, soft: 4, inset: 16 }, { dir: [-f * .5, -1], color: WINDOW, k: .3, width: 9, soft: 3, inset: 16 }],
  shadow: { dx: -f * 24, dy: 10, blur: 12, k: .45 },
});
const hostLight = {
  ambient: { color: '#9aa3c4', k: .07 },
  key: { dir: [-.7, -.5], color: '#3e2c4a', k: .45, width: 70, soft: 55 },
  rim: [{ dir: [-1, -.4], color: CANDLE, k: .6, width: 8, soft: 3 }, { dir: [1, -.6], color: WINDOW, k: .55, width: 8, soft: 2 }, { dir: [0, 1], color: CANDLE, k: .35, width: 6, soft: 3 }],
  shadow: { dx: 16, dy: 10, blur: 14, k: .4 },
};

export default {
  fps: 30, size: [1920, 1080],
  options: { shot: 'seated', light: 'on' },
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
      group, look: { bloom: 0, dof: false, fogDensity: 0, vignette: 1, bg: 0x05040a },
      tick() {
        if (ready || !Object.values(I).every(i => i.complete && i.naturalWidth)) return;
        near.material.map = tex(masked(I.plate, host ? null : I.win, true)); near.material.needsUpdate = true;
        far.material.map = tex(masked(I.far, null, false));                  // за окнами — только город, предметы стёрты far.material.needsUpdate = true; far.visible = !host;
        clothC = masked(I.plate, I.cloth, false); ready = true;
      },
    };
    const plateRect = () => { const [x0, y0] = stage.project(V(-PW / 2, PH / 2, -D)), [x1, y1] = stage.project(V(PW / 2, -PH / 2, -D)); return [x0, y0, x1 - x0, y1 - y0]; };
    function contact(p, rxm, rym, a = .5) {                     // мягкое контактное пятно
      const [x, y, d] = stage.project(p), r = rxm * stage.pxs() / d, ctx = stage.ctx;
      ctx.save(); ctx.translate(x, y); ctx.scale(1, rym / rxm);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r); g.addColorStop(0, `rgba(6,2,4,${a})`); g.addColorStop(.6, `rgba(6,2,4,${a * .5})`); g.addColorStop(1, 'rgba(6,2,4,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    const unit = +(o.unit || .0059);
    const only = L => { if (!L || !o.parts) return L; const k = o.parts.split(','), r = {}; for (const n of k) if (L[n]) r[n] = L[n]; return r; };   // отладка: --set parts=rim,key
    const fixMouth = p => { if (p.mouth === 'teeth' || p.mouth === 'teethOpen') p.mouth = 'open'; return p; };

    if (!host) {
      const J = new Actor(stage, jensen(), { pin: 'seat', unit, light: lit ? only(seatedLight(1)) : null }).at(src(+(o.jx || 262), +(o.jy || 905)));
      const Al = new Actor(stage, alice(), { pin: 'seat', unit, light: lit ? seatedLight(-1) : null }).at(src(+(o.ax || 1420), +(o.ay || 905)));
      for (const A of [J, Al]) A.char.spec.rig = { ...A.char.spec.rig, armLayer: 'front' };       // руки — отдельным проходом поверх стола
      const cam = keyed([[0, look([0, 0, 0], [0, 0, -1], FOV)], [5, look([.08, .03, -.62], [.08, .03, -1.62], FOV), E.inOutSine]]);
      return {
        duration: 5,
        scenes: [{
          id: 'seated', from: 0, to: 5, set, camera: cam,
          under() { contact(src(262, 905), .9, .16, .55); contact(src(1420, 905), .9, .16, .55); },
          chars(t) {
            const pj = fixMouth(act(t, [[0, 'neutral'], [.25, 'talk'], [2.35, 'smug'], [4.75, 'laugh']]));
            const pa = fixMouth(act(t, [[0, 'smug'], [2.6, 'talk'], [4.7, 'neutral']]));
            Object.assign(pj, { blink: blinkAt(t, 1), view: 'threeQuarter', facing: 1, stance: 'sitR', look: [.6, 0] });
            Object.assign(pa, { blink: blinkAt(t, 2), view: 'threeQuarter', facing: -1, stance: 'sitL', look: [-.6, 0] });
            // руки: ближняя к столу лежит НА скатерти (рисуется поверх стола), в речи поднимается в жест; дальняя — от эмоции
            // (на колене / на поясе, всегда выше края стола). Правило: кисть никогда не прячется за декорацией.
            const hands = [];
            for (const [A, p, i, u, v, t0, t1] of [[J, pj, 1, 405, 728, .25, 2.35], [Al, pa, 0, 1255, 728, 2.6, 4.7]]) {
              const rest = A.toLocal(src(u, v)), on = t >= t0 && t < t1 ? Math.max(0, Math.sin((t - t0) * Math.PI * 2 * .8)) ** 1.5 : 0;
              const sd = i ? 1 : -1, lift = on * (.4 + .6 * Math.abs(Math.sin(t * 7.3)));                   // жест: вверх и чуть к собеседнику
              const arms = [undefined, undefined]; arms[i] = { to: [rest[0] + sd * 40 * lift, rest[1] - 150 * lift] };
              if (A === J) { const r2 = A.toLocal(src(u - 48, v + 12)); arms[0] = { to: r2, bend: 1 }; hands.push([u - 48, v + 12, 1]); }   // у Дженсена дальняя рука на чёрной куртке не видна — обе кисти на столе
              p.arms = arms; p.bob = (p.bob || 0) * .3; p.sq = (p.sq || 0) * .3; p.lean = (p.lean || 0) * .5;   // корпус качается меньше — кисти не отрываются от стола
              hands.push([u, v, 1 - Math.min(1, lift * 2)]);
            }
            J.draw(pj, { only: 'base' }); Al.draw(pa, { only: 'base' });
            if (clothC) { const [x, y, w, h] = plateRect(); stage.ctx.drawImage(clothC, x, y, w, h); }   // край стола закрывает колени
            for (const [u, v, k] of hands) if (k > .02) contact(src(u + 4, v + 6), .2, .06, .55 * k);       // тень кисти на скатерти
            J.draw(pj, { only: 'front' }); Al.draw(pa, { only: 'front' });
          },
        }],
      };
    }
    const M = new Actor(stage, moneyman(), { pin: 'feet', unit: unit * 1.5, light: lit ? hostLight : null }).at(src(600, 1185));   // по пояс, ноги за кадром; свеча справа видна
    return {
      duration: 1,
      scenes: [{
        id: 'host', from: 0, to: 1, set, camera: () => look([0, 0, 0], [0, 0, -1], FOV),
        chars() { const p = fixMouth(act(.22, [[0, 'talk']])); M.draw(p); },
      }],
    };
  },
};
