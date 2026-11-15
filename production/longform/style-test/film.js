// film.js: стилевой тест «Stickman Noir» — плоские герои на ИИ-фоне (16:9, 1920x1080).
//   shot=seated (по умолчанию) — 5 с: Дженсен и Алиса за столиком, по очереди говорят, медленный наезд с параллаксом окна
//   shot=host                  — стоп-кадр: три кандидата в ведущие в том же ресторане (интро)
//   plate=raw | soft           — фон как есть / фон, подтянутый к плоским героям (make_assets.py)
//   fx=on | off                — контактные тени + тёплый контровой край на героях
// Фон — 3D-плоскость на 10 м (ближний слой с дырами окон) + тот же кадр на 18 м за окнами (горизонт двигается медленнее).
// Герои стоят на якорях в плоскости фона — они прибиты к стульям и не плывут при наезде. Скатерть поверх ног — маска фона.
import { THREE, V, Actor, act, blinkAt, keyed, look, E } from 'engine';
import { jensen, alice, detective, moneyman, reporter } from '../../../engine/src/chars/presetsLong.js';
import plateRaw from './assets/plate_raw.jpg';
import plateSoft from './assets/plate_soft.jpg';
import maskWindow from './assets/mask_window.png';
import maskCloth from './assets/mask_cloth.png';

const SW = 1672, SH = 941, D = 10, FAR = 18, FOV = 40;
const PH = 2 * D * Math.tan(THREE.MathUtils.degToRad(FOV / 2)), PW = PH * 16 / 9;
const src = (u, v, z = -D) => { const k = -z / D; return V((u / SW - .5) * PW * k, (.5 - v / SH) * PH * k, z); };   // пиксель фона -> мир

function img(url) { const i = new Image(); i.src = url; i.style.display = 'none'; document.body.appendChild(i); return i; }   // в DOM: страница ждёт загрузку
const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
function masked(plate, mask, invert, blur = 0) {
  const c = canvas(SW, SH), x = c.getContext('2d');
  if (blur) x.filter = `blur(${blur}px)`; x.drawImage(plate, 0, 0); x.filter = 'none';
  if (mask) { x.globalCompositeOperation = invert ? 'destination-out' : 'destination-in'; x.drawImage(mask, 0, 0); }
  return c;
}

export default {
  fps: 30, size: [1920, 1080],
  options: { shot: 'seated', plate: 'soft', fx: 'on' },
  setup(stage, o) {
    stage.renderer.toneMapping = THREE.NoToneMapping;                         // фон — готовая картинка: без тон-маппинга
    stage.setVignette({ alpha: .38, color: '6,4,10', inner: .42, outer: 1.05, cy: .5 });
    const host = o.shot === 'host', fx = o.fx !== 'off';
    const I = { plate: img(o.plate === 'raw' ? plateRaw : plateSoft), win: img(maskWindow), cloth: img(maskCloth) };
    const mat = () => new THREE.MeshBasicMaterial({ transparent: true, fog: false, toneMapped: false, depthWrite: false });
    const near = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), mat()); near.position.set(0, 0, -D);
    const far = new THREE.Mesh(new THREE.PlaneGeometry(PW * FAR / D, PH * FAR / D), mat()); far.position.set(0, 0, -FAR); far.renderOrder = -1;
    const group = new THREE.Group(); group.add(far, near); stage.add(group);
    let ready = false, clothC = null;
    const tex = c => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
    const set = {
      group, look: { bloom: 0, dof: false, fogDensity: 0, vignette: 1, bg: 0x05040a },
      tick() {
        if (ready || !Object.values(I).every(i => i.complete && i.naturalWidth)) return;
        const blur = host ? 2.2 : 0;                                         // интро: фон чуть в расфокусе, ведущие резкие
        near.material.map = tex(masked(I.plate, host ? null : I.win, true, blur)); near.material.needsUpdate = true;
        far.material.map = tex(masked(I.plate, null, false, blur)); far.material.needsUpdate = true; far.visible = !host;
        clothC = masked(I.plate, I.cloth, false); ready = true;
      },
    };
    // экранный прямоугольник плоскости фона (для 2D-наложения скатерти)
    const plateRect = () => { const [x0, y0] = stage.project(V(-PW / 2, PH / 2, -D)), [x1, y1] = stage.project(V(PW / 2, -PH / 2, -D)); return [x0, y0, x1 - x0, y1 - y0]; };

    // ---------- герои с эффектами: рисуем во внеэкранный слой, добавляем тень и контровой край ----------
    const W = stage.W, H = stage.H, A = canvas(W, H), R = canvas(W, H), ax = A.getContext('2d'), rx = R.getContext('2d');
    function drawFx(actor, pose, { light = [1, -.3], shadow = [-16, 6], rim = .5 } = {}) {
      const xf = actor.xf(), ctx = stage.ctx;
      ax.setTransform(1, 0, 0, 1, 0, 0); ax.clearRect(0, 0, W, H);
      ax.save(); ax.translate(xf.x, xf.y); ax.rotate(xf.rot); ax.scale(xf.s, xf.s); ax.translate(-actor.pin[0], -actor.pin[1]); actor.char.draw(ax, pose); ax.restore();
      if (fx) {
        // падающая тень от свечи на спинку стула и пол: силуэт, размыт, сдвинут от света
        rx.setTransform(1, 0, 0, 1, 0, 0); rx.globalCompositeOperation = 'source-over'; rx.clearRect(0, 0, W, H); rx.drawImage(A, 0, 0);
        rx.globalCompositeOperation = 'source-in'; rx.fillStyle = 'rgb(8,3,6)'; rx.fillRect(0, 0, W, H); rx.globalCompositeOperation = 'source-over';
        ctx.save(); ctx.filter = 'blur(9px)'; ctx.globalAlpha = .5; ctx.drawImage(R, shadow[0], shadow[1]); ctx.restore();
        // контровой край: полоса силуэта со стороны света, тёплая, только по краю
        rx.clearRect(0, 0, W, H); rx.drawImage(A, 0, 0); rx.globalCompositeOperation = 'source-in'; rx.fillStyle = 'rgb(255,196,120)'; rx.fillRect(0, 0, W, H);
        rx.globalCompositeOperation = 'destination-out'; rx.drawImage(A, -light[0] * 4, -light[1] * 4);
        rx.globalCompositeOperation = 'destination-in'; rx.filter = 'blur(5px)'; rx.drawImage(A, 0, 0); rx.drawImage(A, 0, 0); rx.filter = 'none'; rx.globalCompositeOperation = 'source-over';   // тонкие ноги и руки края почти не получают
        ax.save(); ax.globalCompositeOperation = 'source-atop'; ax.globalAlpha = rim; ax.filter = 'blur(1.2px)'; ax.drawImage(R, 0, 0); ax.restore();
      }
      ctx.drawImage(A, 0, 0);
      return xf;
    }
    // мягкое контактное пятно (сиденье, пол) в экранных координатах
    function contact(p, rxm, rym, a = .55) {
      const [x, y, d] = stage.project(p), k = stage.pxs() / d, ctx = stage.ctx, r = rxm * k;
      ctx.save(); ctx.translate(x, y); ctx.scale(1, rym / rxm);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r); g.addColorStop(0, `rgba(6,2,4,${a})`); g.addColorStop(.6, `rgba(6,2,4,${a * .5})`); g.addColorStop(1, 'rgba(6,2,4,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }

    if (!host) {
      // ---------- сидят: якорь — точка сиденья на стуле (пиксели фона), масштаб подобран по высоте сиденья ----------
      const unit = +(o.unit || .00455);
      const J = new Actor(stage, jensen(), { pin: 'seat', unit }).at(src(+(o.jx || 492), +(o.jy || 622)));
      const Al = new Actor(stage, alice(), { pin: 'seat', unit }).at(src(+(o.ax || 1182), +(o.ay || 622)));
      const lineJ = [.25, 2.35], lineA = [2.6, 4.7];
      const cam = keyed([[0, look([0, 0, 0], [0, 0, -1], FOV)], [5, look([.1, -.04, -.62], [.1, -.04, -1.62], FOV), E.inOutSine]]);
      return {
        duration: 5,
        scenes: [{
          id: 'seated', from: 0, to: 5, set, camera: cam,
          under() { if (fx) { contact(src(492, 626), .55, .12, .5); contact(src(1182, 626), .55, .12, .5); contact(src(640, 800), .32, .05, .55); contact(src(1036, 800), .32, .05, .55); } },
          chars(t) {
            const pj = act(t, [[0, 'neutral'], [lineJ[0], 'talk'], [lineJ[1], 'smug'], [4.75, 'laugh']]);
            const pa = act(t, [[0, 'smug'], [lineA[0], 'talk'], [lineA[1], 'neutral']]);
            for (const [p, s] of [[pj, 1], [pa, 2]]) { p.blink = blinkAt(t, s); p.view = 'threeQuarter'; if (p.mouth === 'teeth' || p.mouth === 'teethOpen') p.mouth = 'open'; }   // «решётка» — нервный рот, в беседе не нужен
            pj.facing = 1; pj.stance = 'sitR'; pa.facing = -1; pa.stance = 'sitL';
            pa.dx = (pa.dx || 0); pj.look = [.6, 0]; pa.look = [-.6, 0];
            if (fx) { drawFx(J, pj, { light: [1, -.2], shadow: [-18, 6], rim: .4 }); drawFx(Al, pa, { light: [-1, -.2], shadow: [18, 6], rim: .4 }); }
            else { J.draw(pj); Al.draw(pa); }
            if (clothC) { const [x, y, w, h] = plateRect(); stage.ctx.drawImage(clothC, x, y, w, h); }   // скатерть закрывает колени
          },
        }],
      };
    }
    // ---------- интро: три кандидата в ведущие стоят перед столиком ----------
    const unitH = +(o.unit || .0039);
    const hosts = [[detective(), 470, 'smug', 1, '1 · детектив'], [moneyman(), 836, 'neutral', 0, '2 · денежный человек'], [reporter(), 1205, 'talk', -1, '3 · репортёр']]
      .map(([ch, u, emo, f, name]) => ({ a: new Actor(stage, ch, { pin: 'feet', unit: unitH }).at(src(u, 905)), emo, f, name, u }));
    return {
      duration: 1,
      scenes: [{
        id: 'host', from: 0, to: 1, set, camera: () => look([0, 0, 0], [0, 0, -1], FOV),
        under() { if (fx) for (const h of hosts) contact(src(h.u, 905), .5, .07, .6); },
        chars(t) {
          for (const h of hosts) {
            const p = act(.3, [[0, h.emo]]); if (p.mouth === 'teeth' || p.mouth === 'teethOpen') p.mouth = 'open'; if (h.f) { p.view = 'threeQuarter'; p.facing = h.f; }
            if (fx) drawFx(h.a, p, { light: [0, -1], shadow: [0, 0], rim: .45 }); else h.a.draw(p);
          }
          const x = stage.ctx; x.save(); x.font = '700 30px Arial'; x.textAlign = 'center';
          for (const h of hosts) { const [sx] = stage.project(src(h.u, 905)); x.lineWidth = 6; x.strokeStyle = 'rgba(0,0,0,.8)'; x.strokeText(h.name, sx, 1060); x.fillStyle = '#F2D27A'; x.fillText(h.name, sx, 1060); }
          x.restore();
        },
      }],
    };
  },
};
