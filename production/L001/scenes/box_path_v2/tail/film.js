// box_path_v2/tail/film.js: L001, хвост «пути коробки» — полностью 3D (декорация engine/src/sets/noirLogistics.js).
// Раньше хвост брали готовыми кадрами из ../../box_path/ (с 13.07 с). Теперь он свой, с той же камерой (те же ключи
// сплайна от T_SWAP, чуть плотнее по времени), но с событиями и доработанным крупным планом:
//   0.00–0.60  выход из темноты: фонарик инспектора (щелчок 0.30) высвечивает наклейку SERIAL на коробке крупно
//   1.20–2.70  отъезд; лампы прохода загораются ряд за рядом (с ближнего) с мерцанием, LED стоек оживают секциями
//   1.50–4.30  луч фонарика ведёт по штабелям запечатанных коробок (плёнка бликует), задерживается на наклейках
//   3.15       тёплый свет у коробки; 4.20 фонарик гаснет
// Коробки дата-центра — свои (dcBoxes: false в декорации): разные размеры, лента, чёрные стрепы, уголки, плёнка-стрейч,
// наклейки. Время фильма t: 0 = кадр 13.067 с старой версии box_path (бывший кадр 392).
import { THREE, V, clamp, seg, E, smooth } from 'engine';
import { noirLogistics, box, toon, pallet, edgeLines, NOIR } from 'engine/sets/noirLogistics.js';
import { lightCone } from 'engine/vfx/lightCone.js';
import { rng } from 'engine/core/rng.js';
import { serialLabelTex, sealTex } from '../props.js';

const T0 = 13.067;                                  // время box_path, которому соответствует t = 0
const DUR = 4.6;
// Catmull-Rom по ключам [t, [..vals]] — как в box_path/film.js
function spline(K, t) {
  let i = 0; while (i + 2 < K.length && t >= K[i + 1][0]) i++;
  const a = K[i], b = K[i + 1], k = clamp((t - a[0]) / (b[0] - a[0])), p0 = K[Math.max(0, i - 1)], p3 = K[Math.min(K.length - 1, i + 2)];
  const s = k * k * (3 - 2 * k) * .35 + k * .65;
  return a[1].map((_, j) => { const v0 = p0[1][j], v1 = a[1][j], v2 = b[1][j], v3 = p3[1][j];
    return .5 * ((2 * v1) + (-v0 + v2) * s + (2 * v0 - 5 * v1 + 4 * v2 - v3) * s * s + (-v0 + 3 * v1 - 3 * v2 + v3) * s * s * s); });
}
// ключи box_path от 11.8 с (время -> локальное). Прицел на крупном плане сдвинут на наклейку (z +.12), а не на пломбу
//            t                offset pos           aim                fov
const CAM = [
  [11.8 - T0,  [-6.0, .70, .5,    0.0, .45, 0,      40]],
  [13.15 - T0, [-.8, .45, .14,    0.0, .445, .17,   42]],
  [14.25 - T0, [-1.7, .65, .40,   0.0, .45, .09,    40]],
  [15.95 - T0, [-3.2, 1.25, 1.0,  0.4, .50, 0,      40]],
  [17.6 - T0,  [-4.6, 1.70, 1.3,  0.8, .55, -.1,    40]],
];

export default {
  fps: 30, size: [1920, 1080],
  options: { look: 'noir' },
  setup(stage) {
    stage.setVignette({ alpha: .5, color: '4,6,16', inner: .42, outer: 1.0, cy: .5 });
    const L = noirLogistics(stage, { dcBoxes: false });
    const { hero, heroBox, dcParts: P } = L;
    const DC = V(L.dcX, 0, 0);
    hero.position.copy(DC);
    L.forklift.group.position.set(0, 0, -1); L.truck.group.position.set(40, 0, -1);

    // ---------- коробка-герой: наклейки и пломбы движка -> свои, чёткие ----------
    heroBox.traverse(o => { if (o.isMesh && (o.geometry.type === 'CircleGeometry' || (o.geometry.type === 'PlaneGeometry' && o.geometry.parameters.width === .3))) o.visible = false; });
    const labelHi = serialLabelTex('4XG-2207-1193', { w: 2048, bg: '#f4eedc' });
    const labelMat = toon(0xffffff, { map: labelHi });
    const sealMat = toon(0xffffff, { map: sealTex(512), transparent: true, alphaTest: .5 });
    const addLabel = (parent, w, pos, ry, mat = labelMat) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * .633), mat); m.position.copy(pos); m.rotation.y = ry; parent.add(m);
      edgeLines(m, m.geometry, 2); return m;
    };
    const HW = .9, HH = .55, HD = .7;                                     // размеры serverBox по умолчанию
    addLabel(heroBox, .26, V(-HW / 2 - .009, HH * .55, .195), -Math.PI / 2);   // правее ленты (лента ±.045)
    addLabel(heroBox, .26, V(HW * .27, HH * .55, HD / 2 + .009), 0);
    for (const [pos, ry] of [[V(-HW / 2 - .012, HH * .5, 0), -Math.PI / 2], [V(0, HH * .5, HD / 2 + .012), 0]]) {
      const s = new THREE.Mesh(new THREE.PlaneGeometry(.1, .1), sealMat); s.position.copy(pos); s.rotation.y = ry; heroBox.add(s);
    }

    // ---------- штабели запечатанных коробок ----------
    const dc = P.group, R = rng(91);
    const labelLo = serialLabelTex('4XG-2207-0', { w: 1024, bg: '#f4eedc' }), loMat = toon(0xffffff, { map: labelLo });
    const fragTex = (() => { const c = document.createElement('canvas'); c.width = 512; c.height = 512; const x = c.getContext('2d');
      x.fillStyle = '#e8a23a'; x.fillRect(0, 0, 512, 512); x.fillStyle = '#141018';
      for (const cx of [170, 342]) { x.beginPath(); x.moveTo(cx, 70); x.lineTo(cx + 80, 190); x.lineTo(cx + 34, 190); x.lineTo(cx + 34, 330); x.lineTo(cx - 34, 330); x.lineTo(cx - 34, 190); x.lineTo(cx - 80, 190); x.closePath(); x.fill(); }
      x.fillRect(60, 370, 392, 18); x.font = "900 70px 'Arial Black', Arial"; x.fillText('THIS SIDE', 62, 470);
      x.strokeStyle = '#141018'; x.lineWidth = 28; x.strokeRect(14, 14, 484, 484);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; })();
    const fragMat = toon(0xffffff, { map: fragTex });
    // плёнка-стрейч: полупрозрачный блестящий чехол со складками; блик бежит по нему от фонаря
    const filmTex = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 512; const x = c.getContext('2d'), r = rng(4);
      x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(0, 0, 256, 512);
      for (let i = 0; i < 26; i++) { const y = r() * 512, a = .25 + r() * .6; x.strokeStyle = `rgba(255,255,255,${a.toFixed(2)})`; x.lineWidth = 2 + r() * 5; x.beginPath(); x.moveTo(0, y); x.bezierCurveTo(80, y + (r() - .5) * 60, 170, y + (r() - .5) * 60, 256, y + (r() - .5) * 40); x.stroke(); }
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })();
    const filmMat = new THREE.MeshPhongMaterial({ color: 0x7fa6c4, specular: 0xdff0ff, shininess: 60, map: filmTex, transparent: true, opacity: .14, depthWrite: false, side: THREE.FrontSide });
    const strapMat = toon(0x15171f), cornerMat = toon(0x8a8272), tapeG = toon(NOIR.tape), tapeT = toon(0xc9b48a);
    const cards = [NOIR.card, NOIR.cardDark, 0x9c7550, 0xb08a5e, 0x8e6a4c];
    const stacks = [];
    // [x, z, профиль]: сторона прохода — к z = 0, камера смотрит с -x
    const SPOTS = [[1.5, 1.2, 'tall'], [3.0, -1.2, 'crate'], [5.2, 1.25, 'mixed'], [-1.5, -1.3, 'crate'], [8, -1.2, 'tall'], [11, 1.2, 'crate'], [14, -1.2, 'mixed'], [17, 1.2, 'tall']];
    for (const [sx, sz, kind] of SPOTS) {
      const g = new THREE.Group(); g.position.set(sx, 0, sz); g.rotation.y = (R() - .5) * .12; dc.add(g);
      pallet(g, 1.2, 1.0); const face = -Math.sign(sz);                  // +1: грань к проходу смотрит в +z
      let y = .15; const items = [];
      const sizes = kind === 'crate' ? [[1.1, .78, .92], [.7, .42, .6]] : kind === 'tall' ? [[.95, .62, .8], [.95, .62, .8], [.9, .5, .78]] : [[1.05, .5, .9], [.8, .55, .66], [.55, .36, .5]];
      sizes.forEach(([w, h, d], k) => {
        const dx = (R() - .5) * .08, dz = (R() - .5) * .06, ry = (R() - .5) * .1;
        box(g, w, h, d, cards[(R() * cards.length) | 0], dx, y + h / 2, dz, { px: 2.5, ry });
        const tm = R() < .6 ? tapeG : tapeT;                                // лента: зелёная пломбовая или обычная
        box(g, w + .01, .07, d + .01, tm, dx, y + h - .02, dz, { ink: false, ry });
        box(g, .08, h + .012, d + .012, tm, dx, y + h / 2, dz, { ink: false, ry });
        items.push({ w, h, d, y, dx, dz, ry }); y += h + .005;
      });
      const top = y, bw = Math.max(...sizes.map(s => s[0])) + .04, bd = Math.max(...sizes.map(s => s[2])) + .04;
      // стрепы: два чёрных ремня вертикально через весь штабель с паллетом
      for (const ox of [-bw * .28, bw * .28]) {
        box(g, .045, top + .02, bd + .02, strapMat, ox, top / 2, 0, { px: 1.5 });
        box(g, .045, .02, bd + .02, strapMat, ox, top + .005, 0, { ink: false });
      }
      // уголки-защита по вертикальным рёбрам со стороны прохода и камеры
      for (const [cx, cz] of [[-bw / 2, face * bd / 2], [bw / 2, face * bd / 2], [-bw / 2, -face * bd / 2]]) box(g, .05, top - .17, .05, cornerMat, cx, .15 + (top - .15) / 2, cz, { px: 1.5 });
      // плёнка-стрейч на нижние ярусы
      const fh = Math.min(top - .1, 1.25), fm = new THREE.Mesh(new THREE.BoxGeometry(bw + .03, fh, bd + .03), filmMat); fm.position.set(0, .12 + fh / 2, 0); fm.renderOrder = 3; g.add(fm);
      edgeLines(fm, fm.geometry, 1.5);
      // наклейки: серийник на грани к проходу и к камере, на части — «верх»
      items.forEach((it, k) => {
        const ly = it.y + it.h * .55;
        if (it.h > .4) addLabel(g, .26, V(it.dx + it.w * .22, ly, it.dz + face * (it.d / 2 + .006)), face > 0 ? 0 : Math.PI, loMat);
        if (k === 0 || R() < .5) addLabel(g, .22, V(it.dx - it.w / 2 - .006, ly, it.dz + face * it.d * .2), -Math.PI / 2, loMat);
        if (R() < .45) { const m = new THREE.Mesh(new THREE.PlaneGeometry(.16, .16), fragMat); m.position.set(it.dx - it.w * .25, it.y + it.h * .5, it.dz + face * (it.d / 2 + .006)); m.rotation.y = face > 0 ? 0 : Math.PI; g.add(m); edgeLines(m, m.geometry, 1.5); }
      });
      stacks.push({ g, x: sx, z: sz, top });
    }

    // ---------- свет: ряды ламп, LED по секциям, тёплое пятно ----------
    // ряд i горит с ON[i] (локальное время), первые кадры после включения — мерцание
    const ON = [-1, -1, 1.2, 1.5, 1.8, 2.1, 2.4, 2.7];                     // полосы 0,1 позади камеры — горят сразу
    const stripCol = P.strips.map(s => s.material.color.clone());
    const lightBase = P.stripLights.map(l => l.intensity);
    const flickOn = (t, t0) => { if (t0 < 0) return 1; const d = t - t0; if (d < 0) return 0; if (d > .3) return 1; return [1, 0, 0, 1, 1, .15, 1, 1, 0, 1][Math.min(9, Math.floor(d * 30))]; };
    const rackX = P.racks.map(r => r.position.x);
    const warmBase = P.warm.intensity;
    // фонарик инспектора: за камерой слева, свет-конус + видимый луч в дымке
    const torch = new THREE.SpotLight(0xffe2b0, 0, 24, .13, .45, 1.2);
    torch.castShadow = true; torch.shadow.mapSize.set(1024, 1024); torch.shadow.bias = -.0006; torch.shadow.camera.near = .3;
    const torchPos = DC.clone().add(V(-5.6, 1.55, -.9)); torch.position.copy(torchPos); L.group.add(torch, torch.target);
    const beam = new THREE.Group(); L.group.add(beam);
    const cone = lightCone(beam, { top: V(0, 0, 0), floorY: -1, r0: .004, r1: Math.tan(.13), color: [1, .9, .7], aTop: .1, aBottom: .2 });
    // куда светит (локально к DC): наклейка героя -> штабели справа -> через проход -> вдаль
    const AIM = [[0, [-.46, .45, .19]], [1.2, [-.46, .45, .19]], [1.75, [1.0, 1.0, 1.0]], [2.35, [4.7, .9, .8]], [2.75, [4.7, .9, .8]], [3.3, [2.5, .8, -.8]], [3.8, [7.5, 1.0, -.75]], [4.6, [10.5, .7, .8]]];
    const aimAt = t => { let i = 0; while (i + 1 < AIM.length - 1 && t >= AIM[i + 1][0]) i++; const [a, pa] = AIM[i], [b, pb] = AIM[i + 1]; const k = E.inOutSine(clamp((t - a) / (b - a))); return V(...pa.map((v, j) => v + (pb[j] - v) * k)).add(DC); };
    const torchK = t => { if (t < .3) return 0; const d = t - .3; const blink = d < .2 ? [1, 0, 1, 1, .3, 1][Math.floor(d * 30)] ?? 1 : 1; return blink * (1 - smooth(seg(t, 4.15, 4.25))); };

    const camera = t => {
      const c = spline(CAM, t), p = DC;
      c[0] = Math.min(c[0], -.8);
      return { pos: [p.x + c[0], p.y + c[1], p.z + c[2]], target: [p.x + c[3], p.y + c[4], p.z + c[5]], fov: c[6], roll: 0 };
    };
    return {
      duration: DUR,
      scenes: [{
        id: 'tail', from: 0, to: DUR, set: L, camera,
        update(t, f) {
          f.look.fogDensity = .03;
          // из темноты (как у box_path: тёмный провал до 13.2, рассвет до 13.65)
          f.look.dark = (1 - smooth(seg(t, 13.2 - T0, 13.65 - T0))) * .97; f.look.darkColor = '3,5,12';
          // ряды ламп
          let lit = 0;
          P.strips.forEach((s, i) => { const k = flickOn(t, ON[i]); s.material.color.copy(stripCol[i]).multiplyScalar(.08 + .92 * k); if (i >= 2) lit += k; });
          P.stripLights.forEach((l, j) => { const i = j * 2; l.intensity = lightBase[j] * (.5 * flickOn(t, ON[i]) + .5 * flickOn(t, ON[Math.min(7, i + 1)])) * 1.25; });
          // LED стоек: секция включается вместе с ближайшей полосой
          P.racks.forEach((r, i) => { const row = clamp(Math.round((rackX[i] + 10) / 4), 0, 7); r.visible = flickOn(t, ON[row]) > .5 || ON[row] < 0 && t > .2; });
          // общий свет: темно, пока ряды не загорелись
          L.hemi.intensity = .14 + .76 * (lit / 6);
          P.warm.intensity = warmBase * (.15 + .85 * flickOn(t, 3.15));
          // фонарик
          const k = torchK(t), tg = aimAt(t); torch.intensity = 7 * k; torch.target.position.copy(tg); torch.target.updateMatrixWorld();
          const dir = tg.clone().sub(torchPos), len = dir.length(); dir.normalize();
          beam.position.copy(torchPos); beam.quaternion.setFromUnitVectors(V(0, -1, 0), dir); beam.scale.setScalar(len * 1.15); cone.setAlpha(k * (1 - .5 * (lit / 6)));
        },
      }],
    };
  },
};
