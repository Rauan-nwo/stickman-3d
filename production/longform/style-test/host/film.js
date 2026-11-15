// host/film.js: интро ведущего канала лонгов — moneyman в своём кабинете (bg_host_office.png, апскейл 1920 Lanczos).
// 4 с: стоит на полу перед столом (стол позади корпуса, ступни на досках, контактная тень), смотрит в камеру,
// приподнимает котелок, говорит реплику с одним жестом к доске расследования, лёгкий наезд.
// Свет: зелёная лампа на столе сзади-слева (тёплый край и ступенчатая тень формы), полосы холодного неона из жалюзи.
// Руки — с локтем (presetsLong: armStyle 'elbow'), помощники arms.js. Правила: wiki/craft/layering-and-motion.md.
import { THREE, V, Actor, act, blinkAt, keyed, look, E, clamp, moneyman, shoulder, arcHand, gesture, gestureEnv, restHand, talkMouth } from 'engine';
import plate from '../assets/plate_office.png';

const SW = 1672, SH = 941, D = 10, FOV = 40;
const PH = 2 * D * Math.tan(THREE.MathUtils.degToRad(FOV / 2)), PW = PH * 16 / 9;
const src = (u, v) => V((u / SW - .5) * PW, (.5 - v / SH) * PH, -D);
const LAMP = '#f3d488', NEON = '#7fb8ff', BRIM = -775, NECK = -586;
const light = {                                                              // свет по декорации: он стоит ВНЕ пятна жалюзи
  ambient: { color: '#9aa3c4', k: .05 },
  key: { dir: [-1, -.55], color: '#4f4a72', k: .4, width: 62, cel: true },            // лампа сзади-слева: непрозрачная cel-тень справа
  rim: [{ dir: [-1, -.6], color: LAMP, k: .7, width: 12, soft: 1, inset: 16 },          // тёплый край лампы: левый/задний край головы и котелка
        { dir: [-1, .1], color: NEON, k: .18, width: 7, soft: 1, inset: 16, below: NECK }],   // окно: слабый холодный край только слева по корпусу
};
const TALK = ['open', 'O', 'smile', 'flat', 'open', 'smileS'];

export default {
  fps: 30, size: [1920, 1080],
  options: { light: 'on', look: 'v4' },   // look: subtle (по умолчанию) | old | flat
  setup(stage, o) {
    stage.renderer.toneMapping = THREE.NoToneMapping;
    stage.setVignette({ alpha: .3, color: '6,4,10', inner: .45, outer: 1.05, cy: .5 });
    const im = new Image(); im.src = plate; im.style.display = 'none'; document.body.appendChild(im);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), new THREE.MeshBasicMaterial({ fog: false, toneMapped: false })); mesh.position.set(0, 0, -D);
    const group = new THREE.Group(); group.add(mesh); stage.add(group);
    let ready = false;
    const set = {
      group, look: { bloom: 0, dof: false, fogDensity: 0, vignette: 1, bg: 0x05040a },
      tick() { if (ready || !(im.complete && im.naturalWidth)) return; const t = new THREE.Texture(im); t.colorSpace = THREE.SRGBColorSpace; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; t.needsUpdate = true; mesh.material.map = t; mesh.material.needsUpdate = true; ready = true; },
    };
    const FEET = [960, 880];                                                    // ступни на досках пола, стол (основание y 678) позади
    const mode = o.light === 'off' ? 'flat' : o.look || 'v4';
    // свет кадра один — зелёная лампа сзади-слева, отдельно на голову, тело и руки (руки поверх, свет на тело не бросают):
    //   r5 (по умолчанию) — тень головы и тела как в раунде 3 (cel, multiply), тёплый край ~70 % от раунда 3; r4 — мягкая голова, край 8 %; old — раунд 3
    const M = new Actor(stage, moneyman(), { pin: 'feet', unit: +(o.unit || .0051), light: mode === 'old' ? light : null }).at(src(...FEET));
    if (mode === 'r4') M.char.spec.shade = { dir: [-1, -.55], body: { k: .4, color: '#4f4a72', shiftU: 62, soft: 0, op: 'multiply' }, head: { k: .13, shift: .35, soft: .3 }, rim: { color: '#f3d488', k: .08 } };
    if (mode === 'v4') M.char.spec.shade = { dir: [-1, -.55], body: { k: 0 },   // вид раунда 1 + мягкий объём головы
      head: { k: .42, color: '#4f4a72', shiftU: 52, after: true, glow: { color: '#f3d488', k: .28 } } };
    if (mode === 'r5') M.char.spec.shade = { dir: [-1, -.55], body: { k: .4, color: '#4f4a72', shiftU: 62, soft: 0, op: 'multiply' },
      head: { k: .4, color: '#4f4a72', shiftU: 56, soft: .1, op: 'multiply' }, rim: { color: '#f3d488', k: .45, wU: 17, softU: 1.5 } };
    M.char.spec.rig = { ...M.char.spec.rig, armL: 270, armLayer: 'front' };
    if (o.limbs === 'plain') for (const A of [M]) delete A.char.spec.limbLook;   // сравнение: руки и ноги раунда 5 (без «трубки»)   // руки поверх головы и шляпы: кисть на полях котелка                       // ведущий стоя: рука достаёт до полей шляпы
    function contact(p, rx, ry, a) {
      const [x, y, d] = stage.project(p), r = rx * stage.pxs() / d, ctx = stage.ctx;
      ctx.save(); ctx.translate(x, y); ctx.scale(1, ry / rx);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r); g.addColorStop(0, `rgba(6,2,4,${a})`); g.addColorStop(.6, `rgba(6,2,4,${a * .5})`); g.addColorStop(1, 'rgba(6,2,4,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    const cam = keyed([[0, look([0, 0, 0], [0, 0, -1], FOV)], [4, look([.05, .06, -.38], [.05, .06, -1.38], FOV), E.inOutSine]]);
    return {
      duration: 4,
      scenes: [{
        id: 'host', from: 0, to: 4, set, camera: cam,
        under() {                                                                   // тень от лампы сзади-слева падает вперёд-вправо
          contact(src(FEET[0], FEET[1] + 4), .45, .06, .6);
          const [x, y] = stage.project(src(FEET[0], FEET[1] + 4)), ctx = stage.ctx, k = stage.pxs() / D;
          ctx.save(); ctx.translate(x, y); ctx.rotate(.32); ctx.filter = 'blur(10px)'; ctx.fillStyle = 'rgba(8,3,4,.42)';
          ctx.beginPath(); ctx.ellipse(.42 * k, .06 * k, .5 * k, .07 * k, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        },
        chars(t) {
          const S = M.char.spec, p = act(t, [[0, 'neutral'], [1.3, 'talk'], [3.55, 'smug']]);
          p.bob = (p.bob || 0) * .4; p.sq = (p.sq || 0) * .4; p.lean = (p.lean || 0) * .5; p.blink = blinkAt(t, 3);
          // 1) приподнимает котелок правой рукой (0.4–1.25 с): плечо ведёт, кисть отстаёт на 3 кадра, шляпа следует за кистью
          const tip = gesture(t, .55, { lead: .15, rise: .3, hold: .35, fall: .35, lagFrames: 3 });
          const shR = shoulder(S, 1), brim = [126, -800];
          const handR = arcHand(shR, restHand(S, 1), brim, tip.hand);
          p.hatTip = clamp(tip.hand) * 1.1; p.hatDy = -14 * clamp(tip.hand); p.tilt = (p.tilt || 0) - .05 * tip.body;
          // 2) жест левой рукой к доске расследования на ударном слове (2.3 с), держит ~0.5 с
          const g = gesture(t, 2.3, { lead: .12, rise: .26, hold: .55, fall: .34, lagFrames: 3 });
          const shL = shoulder(S, -1), board = [shL[0] - 205, shL[1] - 95];
          const handL = arcHand(shL, restHand(S, -1), board, g.hand);
          p.lean += -.03 * g.body; p.look = [-.7 * g.body, -.3 * g.body];
          p.arms = [{ to: handL, w: 11 }, { to: handR, w: 11 }];
          // речь: рот по слогам 1.3–3.5 с (короткая пауза на 2.1 с перед ударным словом), иначе улыбка
          const speaking = (t > 1.3 && t < 2.08) || (t > 2.2 && t < 3.5);
          p.mouth = speaking ? talkMouth(t, TALK, 5).mouth : (t < 1.3 ? 'smile' : 'smirk');
          if (p.mouth === 'teeth' || p.mouth === 'teethOpen') p.mouth = 'open';
          M.draw(p);
        },
      }],
    };
  },
};
