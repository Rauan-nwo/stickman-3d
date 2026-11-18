// box_path/film.js: L001, глава 6 «Трубопровод» — тип C (полностью 3D). Один непрерывный проезд камеры за коробкой:
// склад -> погрузчик -> контейнер на тягаче (док) -> дорога в порт под кранами -> внутрь контейнера ->
// (через темноту у самой коробки) -> проход дата-центра, где коробка стоит нераспакованной.
// Камера всегда считается от коробки: pos = box + offset(t), target = box + aim(t) (Catmull-Rom по ключам),
// поэтому движение непрерывно и в момент переноса коробки в дата-центр (кадр в темноте, 13.15 с).
// Декорация: engine/src/sets/noirLogistics.js. 1920x1080, 30 fps, 18 с.
import { THREE, V, clamp, seg, E, smooth } from 'engine';
import { noirLogistics } from 'engine/sets/noirLogistics.js';
import { sealTex } from '../box_path_v2/props.js';   // пломба как в box_path_v2: диск, кольцо тушью, серп тени, блик (L001 #226, замечание координатора)

const T_SWAP = 13.15;
// Catmull-Rom по ключам [t, [..vals]]
function spline(K, t) {
  let i = 0; while (i + 2 < K.length && t >= K[i + 1][0]) i++;
  const a = K[i], b = K[i + 1], k = clamp((t - a[0]) / (b[0] - a[0])), p0 = K[Math.max(0, i - 1)], p3 = K[Math.min(K.length - 1, i + 2)];
  const s = k * k * (3 - 2 * k) * .35 + k * .65;                                // мягкий старт/стоп на ключах
  return a[1].map((_, j) => { const v0 = p0[1][j], v1 = a[1][j], v2 = b[1][j], v3 = p3[1][j];
    return .5 * ((2 * v1) + (-v0 + v2) * s + (2 * v0 - 5 * v1 + 4 * v2 - v3) * s * s + (-v0 + 3 * v1 - 3 * v2 + v3) * s * s * s); });
}
//            t      offset pos           aim               fov
const CAM = [
  [0.0,  [5.5, 5.0, 9.5,   -1.5, 1.0, -3.5,  42]],
  [1.6,  [2.8, 1.5, 4.0,    0.0, .55, 0,     38]],
  [3.0,  [0.2, 1.4, 4.2,    1.0, .50, 0,     38]],
  [4.6,  [-1.6, 1.0, 5.6,   1.4, .50, -.4,   40]],
  [6.4,  [-3.0, 1.3, 3.6,   1.6, .50, -.3,   42]],
  [8.6,  [-6.0, 2.4, 11,    5.0, 1.0, -3,    44]],
  [10.6, [-7.0, 1.2, 9.0,   8.0, 9.0, -14,   52]],
  [11.8, [-6.0, .70, .5,    0.0, .45, 0,     40]],
  [T_SWAP, [-.8, .45, 0,    0.0, .43, 0,     42]],
  [14.3, [-1.7, .65, .35,   0.0, .45, 0,     40]],
  [16.2, [-3.2, 1.25, 1.0,  0.4, .50, 0,     40]],
  [18.0, [-4.6, 1.70, 1.3,  0.8, .55, -.1,   40]],
];

export default {
  fps: 30, size: [1920, 1080],
  options: { look: 'noir' },
  setup(stage, o) {
    stage.setVignette({ alpha: .5, color: '4,6,16', inner: .42, outer: 1.0, cy: .5 });
    const L = noirLogistics(stage);
    const { hero, forklift: F, truck: TR } = L;
    // стойки ДЦ не работают (шотлист гл. 6: «стойки ДЦ тёмные, никаких мигающих огней») — гасим аддитивные планки огоньков набора (только в этой сцене)
    L.group.traverse(m => { if (m.isMesh && m.material && m.material.blending === THREE.AdditiveBlending && m.geometry.type === 'PlaneGeometry' && Math.abs((m.geometry.parameters || {}).width - .54) < 1e-6) m.visible = false; });
    // пломба героя: вместо плоского светящегося лаймового круга набора — нарисованная пломба box_path_v2 (только в этой сцене; набор не меняется)
    { const st = sealTex(); (L.group || hero).traverse(m => { if (m.isMesh && m.geometry && m.geometry.type === 'CircleGeometry' && Math.abs((m.geometry.parameters || {}).radius - .075) < 1e-6) m.material = new THREE.MeshBasicMaterial({ map: st, transparent: true, alphaTest: .5, toneMapped: false, fog: false }); }); }
    const Z = -1, TRUCK0 = 6.9, BOXL = .63, BED = TR.bed;
    // путь: погрузчик и коробка, тягач
    function pose(t) {
      let fx, cy, bx, by, tx = TRUCK0;
      if (t < 1.0) { fx = -12.5 + 3.2 * E.outCubic(seg(t, 0, 1.0)); cy = 0; }
      else if (t < 1.6) { fx = -9.3; cy = .25 * E.inOutSine(seg(t, 1.0, 1.6)); }
      else if (t < 4.4) { fx = -9.3 + 14.0 * E.inOutCubic(seg(t, 1.6, 4.4)); cy = .25 + (1.37 - .25) * E.inOutSine(seg(t, 3.3, 4.4)); }
      else if (t < 5.4) { fx = 4.7 + (TRUCK0 + BOXL - 1.3 - 4.7) * E.inOutSine(seg(t, 4.4, 5.4)); cy = 1.37; }
      else if (t < 5.8) { fx = TRUCK0 + BOXL - 1.3; cy = 1.37 - .07 * smooth(seg(t, 5.4, 5.8)); }
      else { fx = TRUCK0 + BOXL - 1.3 - 3.0 * E.inOutSine(seg(t, 5.8, 6.6)); cy = 1.30; }
      if (t >= 6.6) tx = TRUCK0 + 44 * E.inOutCubic(seg(t, 6.6, 11.2));
      if (t < 5.4) { bx = fx + 1.3; by = cy; }
      else { bx = tx + BOXL; by = t < 5.8 ? Math.max(BED, cy) : BED; }
      return { fx, cy, tx, box: t >= T_SWAP ? V(L.dcX, 0, 0) : V(bx, by, Z) };
    }
    const camera = t => {
      const p = pose(t).box, c = spline(CAM, t);
      if (t > 12) c[0] = Math.min(c[0], -.8);                                       // не влетать в коробку (сплайн перелетает ключ)
      return { pos: [p.x + c[0], p.y + c[1], p.z + c[2]], target: [p.x + c[3], p.y + c[4], p.z + c[5]], fov: c[6], roll: 0 };
    };
    // дождь (2D) снаружи — как на рисованных фонах
    const W = 1920, H = 1080, RN = 320, rain = [];
    { let s = 9; const r = () => (s = (s * 16807) % 2147483647) / 2147483647; for (let i = 0; i < RN; i++) rain.push([r() * W * 1.2, r() * H, 18 + r() * 34, .08 + r() * .14, .8 + r() * .5]); }
    return {
      duration: 18,
      scenes: [{
        id: 'box_path', from: 0, to: 18, set: L, camera,
        update(t, f) {
          const p = pose(t);
          F.group.position.set(p.fx, 0, Z); F.carriage.position.y = p.cy;
          TR.group.position.set(p.tx, 0, Z);
          hero.position.copy(p.box);
          const out = t > 6.2 && t < T_SWAP, dc = t >= T_SWAP;
          f.look.fogDensity = dc ? .03 : out ? .009 + .019 * (1 - smooth(seg(t, 6.2, 7.6))) : .028;
          // через темноту у самой коробки — коробка переезжает в дата-центр
          f.look.dark = smooth(seg(t, 12.75, 13.1)) * (1 - smooth(seg(t, 13.2, 13.65)));
          f.look.darkColor = '3,5,12';
        },
        over(t, f) {
          const a = clamp(smooth(seg(t, 6.4, 7.4)) * (1 - smooth(seg(t, 11.9, 12.6))));
          if (a < .01) return;
          const x = f.ctx; x.save(); x.lineCap = 'round';
          for (const [x0, y0, len, al, sp] of rain) {
            const y = (y0 + t * 1500 * sp) % (H + 60) - 30, xx = (((x0 - t * 260 * sp) % (W * 1.2)) + W * 1.2) % (W * 1.2);
            x.strokeStyle = `rgba(170,200,235,${(al * a).toFixed(3)})`; x.lineWidth = 1.6;
            x.beginPath(); x.moveTo(xx, y); x.lineTo(xx - len * .22, y + len); x.stroke();
          }
          x.restore();
        },
      }],
    };
  },
};
