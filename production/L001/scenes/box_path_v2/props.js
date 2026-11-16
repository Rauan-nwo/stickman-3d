// props.js: 3D-предметы, которые должны выглядеть нарисованными поверх рисованной плиты.
//   paintMat — заливка ровно тремя тонами (тень / полутон / свет) по направлению света ИЗ ПЛИТЫ, тона сняты с
//              нарисованных коробок и паллет на фонах и домножены на «грейд» сцены; туман сцены = дымка плиты;
//              необязательный цветной край (rim) от второго источника (лампа, проём двери)
//   контур    — те же обратная оболочка и линии рёбер, что в engine/src/sets/noirLogistics.js (толщина в пикселях)
//   hero()    — коробка с сервером: картон, лента цвета Nvidia крест-накрест, светящаяся пломба, наклейка с серийником,
//               на паллете. Начало координат — низ паллета.
//   craneHook() — крюк крана с тросом и четырьмя стропами к углам паллета (сцена порта)
import { THREE } from 'engine';
import { inkMat, hullGeo, edgeLines } from 'engine/sets/noirLogistics.js';
import { glowTex } from 'engine/core/textures.js';

const C = h => new THREE.Color(h);
// базовые тона (sRGB), сняты с нарисованных коробок/паллет bg_warehouse и bg_datacenter
export const TONES = {
  card: ['#7a4f34', '#b87e4c', '#d9a46c'],
  pallet: ['#5e3a22', '#a2652f', '#cc8a46'],
  strap: ['#3a5a10', '#64961a', '#86c426'],          // зелёный Nvidia, «нарисованный» (не светится)
  label: ['#7d786e', '#cfc6b2', '#f2e9d6'],
  steel: ['#12161f', '#2a3140', '#46506a'],
  yellow: ['#5a3c14', '#b07a22', '#e0a838'],
};
const toneCache = new Map();
// grade: { shadow:[r,g,b], mid:[..], light:[..] } — множители сцены; L — направление НА свет (мир); rim: { dir, color, k }
export function paintMat(name, grade, L, rim = null, map = null) {
  const t = (Array.isArray(name) ? name : TONES[name]).map((h, i) => C(h).multiply(new THREE.Color(...[grade.shadow, grade.mid, grade.light][i])));
  const m = new THREE.ShaderMaterial({
    fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      c0: { value: t[0] }, c1: { value: t[1] }, c2: { value: t[2] }, L: { value: new THREE.Vector3(...L).normalize() },
      R: { value: new THREE.Vector3(...(rim ? rim.dir : [0, 1, 0])).normalize() }, rc: { value: C(rim ? rim.color : '#000') }, rk: { value: rim ? rim.k : 0 },
      map: { value: map }, useMap: { value: map ? 1 : 0 },
    }]),
    vertexShader: `varying vec3 vN; varying vec2 vUv;
      #include <fog_pars_vertex>
      void main(){ vN = normalize(mat3(modelMatrix) * normal); vUv = uv; vec4 mvPosition = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
      }`,
    fragmentShader: `uniform vec3 c0, c1, c2, L, R, rc; uniform float rk, useMap; uniform sampler2D map; varying vec3 vN; varying vec2 vUv;
      #include <fog_pars_fragment>
      void main(){ vec3 n = normalize(vN); float d = dot(n, L);
        vec3 col = mix(c0, c1, smoothstep(-.22, -.16, d)); col = mix(col, c2, smoothstep(.42, .48, d));
        col = mix(col, rc, rk * smoothstep(.5, .56, dot(n, R)));
        if (useMap > .5) col *= texture2D(map, vUv).rgb;
        gl_FragColor = vec4(col, 1.);
        #include <fog_fragment>
      }`,
  });
  return m;
}

// меш + контур (обратная оболочка) + линии рёбер — как inked() в noirLogistics, но с нашим материалом
function inked(parent, geo, mat, px = 3.5, edges = true) {
  const m = new THREE.Mesh(geo, mat); parent.add(m);
  if (px) { m.add(new THREE.Mesh(hullGeo(geo), inkMat(px))); if (edges) edgeLines(m, geo, Math.max(1.5, px * .55)); }
  return m;
}
const boxG = (w, h, d) => new THREE.BoxGeometry(w, h, d);

// v3: наклейка с серийником для крупного плана — 2048 px по ширине (на крупном плане наклейка ~1200 px экрана):
//     зелёная полоса «под Nvidia» (без логотипа), SERIAL, моноширинный номер, штрихкод, мелкий текст; рамка тушью.
//     Плоские заливки без градиентов — тон и cel-свет даёт материал. bg — цвет бумаги (белый: тон даёт материал)
export function serialLabelTex(sn = '4XG-2207-1193', { w = 2048, bg = '#ffffff' } = {}) {
  const h = Math.round(w * .633), k = w / 2048, c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  x.scale(k, k); const W = 2048, H = 1296, ink = '#141018';
  x.fillStyle = bg; x.fillRect(0, 0, W, H);
  // зелёная полоса: основной тон + тёмный клин-тень справа + тонкая штриховка
  x.fillStyle = '#76b900'; x.fillRect(0, 0, W, 300);
  x.fillStyle = '#5a8f00'; x.beginPath(); x.moveTo(1380, 0); x.lineTo(W, 0); x.lineTo(W, 300); x.lineTo(1300, 300); x.closePath(); x.fill();
  x.strokeStyle = 'rgba(20,16,24,.22)'; x.lineWidth = 8; for (let i = 0; i < 14; i++) { x.beginPath(); x.moveTo(1420 + i * 46, 0); x.lineTo(1340 + i * 46, 300); x.stroke(); }
  x.fillStyle = ink; x.fillRect(0, 300, W, 16);
  x.font = "900 170px 'Arial Black', Impact, Arial"; x.fillText('SERIAL', 90, 225);
  // знак-чип (не логотип): квадрат с выводами
  x.save(); x.translate(1760, 150); x.fillStyle = ink; x.fillRect(-92, -92, 184, 184);
  for (let i = -3; i <= 3; i++) { x.fillRect(i * 26 - 6, -122, 12, 30); x.fillRect(i * 26 - 6, 92, 12, 30); x.fillRect(-122, i * 26 - 6, 30, 12); x.fillRect(92, i * 26 - 6, 30, 12); }
  x.fillStyle = '#76b900'; x.fillRect(-50, -50, 100, 100); x.restore();
  // номер
  x.fillStyle = ink; x.font = "bold 92px Consolas, 'Courier New', monospace"; x.fillText('S/N', 90, 450);
  x.font = "bold 210px Consolas, 'Courier New', monospace"; const tw = x.measureText(sn).width;
  x.save(); x.translate(90, 650); x.scale(Math.min(1, (W - 180) / tw), 1); x.fillText(sn, 0, 0); x.restore();
  // штрихкод (детерминированный)
  let xx = 90, i = 0; while (xx < W - 100) { const r = Math.abs(Math.sin(i * 12.9898 + sn.length * 3.1) * 43758.5) % 1, bw = 8 + Math.floor(r * 4) * 8; if (i % 2 === 0) x.fillRect(xx, 720, bw, 330); xx += bw + (i % 2 ? 0 : 6); i++; }
  x.font = "bold 62px Consolas, 'Courier New', monospace"; x.fillText('PN 900-2G422-0000  QTY 1  ESD', 90, 1160);
  // рамка тушью
  x.strokeStyle = ink; x.lineWidth = 40; x.strokeRect(20, 20, W - 40, H - 40);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 16; return t;
}
// пломба: зелёный диск, тёмный серп тени, блик, кольцо тушью — чёткий «нарисованный» кружок вместо светящейся кляксы
export function sealTex(size = 512) {
  const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d'), R = size / 2;
  x.clearRect(0, 0, size, size);
  x.fillStyle = '#141018'; x.beginPath(); x.arc(R, R, R, 0, 7); x.fill();
  x.fillStyle = '#7cc414'; x.beginPath(); x.arc(R, R, R * .84, 0, 7); x.fill();
  x.save(); x.beginPath(); x.arc(R, R, R * .84, 0, 7); x.clip(); x.fillStyle = '#4c8400'; x.beginPath(); x.arc(R - R * .28, R - R * .28, R * .9, 0, 7); x.rect(size, 0, -size, size); x.fill('evenodd'); x.restore();
  x.strokeStyle = '#141018'; x.lineWidth = R * .07; x.beginPath(); x.arc(R, R, R * .56, 0, 7); x.stroke();
  x.fillStyle = '#e8ffc0'; x.beginPath(); x.ellipse(R - R * .32, R - R * .36, R * .16, R * .09, -.7, 0, 7); x.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 16; return t;
}
const labelTex = sn => serialLabelTex(sn);

// коробка на паллете. o: { grade, L, rim, px }
export function hero({ grade, L, rim = null, px = 3.5, sn = '4XG-2207-1193' }) {
  const g = new THREE.Group();
  const M = n => paintMat(n, grade, L, rim);
  const PW = 1.2, PD = 1.0, PH = .14, BW = .92, BH = .62, BD = .76, BY = PH;
  const pm = M('pallet');
  inked(g, boxG(PW, .035, PD), pm, px * .8).position.set(0, PH - .0175, 0);                    // верхний настил
  inked(g, boxG(PW, .022, PD), pm, px * .8, false).position.set(0, .011, 0);                  // нижний настил
  for (const x of [-PW / 2 + .07, 0, PW / 2 - .07]) inked(g, boxG(.14, PH - .057, PD), pm, px * .8).position.set(x, .022 + (PH - .057) / 2, 0);   // шашки — между ними тёмные проёмы
  const dark = new THREE.Mesh(boxG(PW - .02, PH - .06, PD - .04), new THREE.MeshBasicMaterial({ color: 0x0c0a10, fog: true })); dark.position.set(0, .022 + (PH - .057) / 2, 0); g.add(dark);
  inked(g, boxG(BW, BH, BD), M('card'), px).position.set(0, BY + BH / 2, 0);
  const sm = M('strap'), sw = .1;
  const s1 = new THREE.Mesh(boxG(sw, BH + .012, BD + .012), sm); s1.position.set(0, BY + BH / 2 + .001, 0); g.add(s1);
  const s2 = new THREE.Mesh(boxG(BW + .012, BH + .01, sw), sm); s2.position.set(0, BY + BH / 2, 0); g.add(s2);
  for (const s of [s1, s2]) edgeLines(s, s.geometry, 1.5);
  // наклейка спереди справа и сбоку
  const lm = paintMat('label', grade, L, rim, labelTex(sn));
  const la = new THREE.Mesh(new THREE.PlaneGeometry(.26, .165), lm); la.position.set(BW * .27, BY + BH * .58, BD / 2 + .004); g.add(la);
  const lb = new THREE.Mesh(new THREE.PlaneGeometry(.26, .165), lm); lb.rotation.y = Math.PI / 2; lb.position.set(BW / 2 + .004, BY + BH * .58, -BD * .22); g.add(lb);
  // пломба на ленте спереди: светится, с ореолом
  // v3: пломба — плоская текстура (диск, серп тени, блик, кольцо тушью), чуть ярче ленты; без радиального градиента
  const seal = new THREE.Mesh(new THREE.PlaneGeometry(.15, .15), new THREE.MeshBasicMaterial({ map: sealTex(), color: new THREE.Color(1.25, 1.25, 1.25), transparent: true, alphaTest: .5, toneMapped: false, fog: false }));
  seal.position.set(0, BY + BH * .52, BD / 2 + .009); g.add(seal);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: C('#8be02a'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: .55, fog: false }));
  glow.position.copy(seal.position).add(new THREE.Vector3(0, 0, .03)); glow.scale.setScalar(.42); g.add(glow);
  g.userData = { PW, PD, PH, top: BY + BH, sealGlow: glow, seal };
  return g;
}

// крюк крана: трос сверху, обойма, крюк, четыре стропы к углам паллета. update(hookPos) — точка крюка в мире.
export function craneHook({ grade, L, px = 3.5 }) {
  const g = new THREE.Group();
  const steel = paintMat('steel', grade, L), yel = paintMat('yellow', grade, L);
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(.022, .022, 1, 8), steel); g.add(cable);
  const cableInk = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, 1, 8), new THREE.MeshBasicMaterial({ color: 0x0a0c16, side: THREE.BackSide })); g.add(cableInk);
  const block = new THREE.Group(); g.add(block);
  inked(block, boxG(.36, .42, .26), yel, px).position.set(0, .34, 0);
  inked(block, new THREE.CylinderGeometry(.13, .13, .28, 20).rotateX(Math.PI / 2), steel, px).position.set(0, .5, 0);
  const hk = inked(block, new THREE.TorusGeometry(.09, .03, 10, 20, Math.PI * 1.45), steel, px * .8, false); hk.rotation.z = -Math.PI * .22; hk.position.set(0, .04, 0);
  inked(block, boxG(.05, .12, .05), steel, px * .7).position.set(0, .14, 0);
  const slings = []; for (let i = 0; i < 4; i++) { const s = new THREE.Mesh(new THREE.CylinderGeometry(.014, .014, 1, 6), steel); const k = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, 1, 6), new THREE.MeshBasicMaterial({ color: 0x0a0c16, side: THREE.BackSide })); g.add(s, k); slings.push([s, k]); }
  const up = new THREE.Vector3(0, 1, 0), tmp = new THREE.Vector3();
  const stretch = (m, a, b) => { tmp.subVectors(b, a); const L2 = tmp.length(); m.position.copy(a).addScaledVector(tmp, .5); m.scale.set(1, L2, 1); m.quaternion.setFromUnitVectors(up, tmp.normalize()); };
  function update(hook, corners, slack = 0) {
    block.position.copy(hook);
    const top = hook.clone().add(new THREE.Vector3(0, .65, 0)), sky = hook.clone().add(new THREE.Vector3(0, 40, 0));
    stretch(cable, top, sky); stretch(cableInk, top, sky);
    corners.forEach((c, i) => { const a = hook.clone().add(new THREE.Vector3(0, .04, 0)), b = c.clone(); if (slack) b.y += 0; stretch(slings[i][0], a, b); stretch(slings[i][1], a, b); });
  }
  return { group: g, update };
}

// ======================= v2 =======================
// предмет любого цвета в «рисованных» трёх тонах: тень / полутон / свет из одного базового цвета
export const tonesOf = (hex, k = [.5, 1, 1.28]) => k.map(s => '#' + C(hex).multiplyScalar(s).getHexString());
export function paintRGB(hex, grade, L, rim = null) { return paintMat(tonesOf(hex), grade, L, rim); }
// перекрасить готовую модель движка (MeshToonMaterial -> 3 тона плиты); светящиеся MeshBasic и контур не трогаем
export function repaint(root, grade, L, rim = null) {
  const cache = new Map();
  root.traverse(o => {
    if (!o.isMesh || !o.material || !o.material.isMeshToonMaterial) return;
    const hex = o.material.color.getHex(); if (!cache.has(hex)) cache.set(hex, paintRGB(hex, grade, L, rim));
    o.material = cache.get(hex); o.castShadow = false; o.receiveShadow = false;
  });
  return root;
}
// надписи в стиле рисованного мира: бумажная наклейка с контуром и штамп
export function tagTex(kind) {
  const c = document.createElement('canvas'), x = c.getContext('2d');
  if (kind === 'malaysia') {
    c.width = 640; c.height = 400;
    x.fillStyle = '#f1e6cc'; x.fillRect(0, 0, 640, 400);
    x.fillStyle = '#c8392b'; x.fillRect(0, 0, 640, 70);
    x.fillStyle = '#f1e6cc'; x.font = "bold 46px 'Arial Black', Arial"; x.fillText('SHIP TO', 26, 52);
    x.fillStyle = '#141018'; x.font = "900 112px 'Arial Black', Impact, Arial"; x.textBaseline = 'alphabetic';
    const w = x.measureText('MALAYSIA').width; x.save(); x.translate(320, 215); x.scale(Math.min(1, 590 / w), 1); x.fillText('MALAYSIA', -w / 2, 0); x.restore();
    x.font = 'bold 40px Consolas, monospace'; x.fillText('PEN-0422  ->  KUL', 30, 290);
    for (let i = 0; i < 52; i++) { const r = Math.abs(Math.sin(i * 7.31 + 2) * 9999.1) % 1; x.fillRect(30 + i * 11, 318, r > .5 ? 6 : 3, 58); }
    x.strokeStyle = '#141018'; x.lineWidth = 16; x.strokeRect(8, 8, 624, 384);
  } else {                                                  // штамп INSPECTED: красная краска, двойная рамка, потёртости
    c.width = 760; c.height = 260;
    x.strokeStyle = '#c52a22'; x.fillStyle = '#c52a22'; x.lineWidth = 18; x.strokeRect(14, 14, 732, 232); x.lineWidth = 6; x.strokeRect(36, 36, 688, 188);
    x.font = "900 128px 'Arial Black', Impact, Arial"; const w = x.measureText('INSPECTED').width;
    x.save(); x.translate(380, 178); x.scale(Math.min(1, 640 / w), 1); x.fillText('INSPECTED', -w / 2, 0); x.restore();
    x.globalCompositeOperation = 'destination-out';
    let s = 5; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 260; i++) { x.globalAlpha = .35 + r() * .6; x.beginPath(); x.ellipse(r() * 760, r() * 260, 2 + r() * 9, 1 + r() * 4, r() * 3, 0, 7); x.fill(); }
    x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
// наклейка/штамп на передней грани коробки hero(): plane в системе коробки (перед +z). Тон и свет — как у коробки.
export function addTag(heroG, kind, grade, L, rim = null) {
  const BW = .92, BH = .62, BD = .76, BY = .14;
  const isTag = kind === 'malaysia';
  const mat = isTag ? paintMat('label', grade, L, rim, tagTex(kind))
    : new THREE.MeshBasicMaterial({ map: tagTex(kind), transparent: true, depthWrite: false, fog: false, toneMapped: false, opacity: .95, color: new THREE.Color(1.15, .95, .9) });
  if (isTag) mat.side = THREE.FrontSide;
  const w = isTag ? .32 : .5, h = isTag ? .2 : .171;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  if (isTag) { m.position.set(-BW * .27, BY + BH * .66, BD / 2 + .006); edgeLines(m, m.geometry, 1.5); }
  else { m.position.set(-BW * .17, BY + BH * .25, BD / 2 + .008); m.rotation.z = .1; }
  const holder = new THREE.Group(); holder.add(m); heroG.add(holder);
  return { mesh: m, base: m.position.clone(), rot: m.rotation.z };
}
// створка двери контейнера (вид изнутри): плоская панель с филёнками, тона сняты с нарисованных дверей. Ось — у петли.
export function doorLeaf(wid, hgt, side, grade, L) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 512; const x = c.getContext('2d');
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, 256, 512);
  x.fillStyle = '#b9c4c8'; for (const [y0, y1] of [[34, 170], [190, 330], [350, 478]]) x.fillRect(34, y0, 188, y1 - y0);
  x.strokeStyle = '#2a3036'; x.lineWidth = 7; for (const [y0, y1] of [[34, 170], [190, 330], [350, 478]]) x.strokeRect(34, y0, 188, y1 - y0);
  x.fillStyle = '#2a3036'; for (const y of [60, 256, 450]) x.fillRect(side > 0 ? 238 : 4, y - 22, 14, 44);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const geo = new THREE.BoxGeometry(wid, hgt, .05); geo.translate(side * wid / 2, hgt / 2, 0);
  const mat = paintMat(['#0c2128', '#173e47', '#23565f'], grade, L, null, t);
  const g = new THREE.Group(); inked(g, geo, mat, 3.5);
  return g;
}
// круги на лужах: n колец на полу, каждое расходится и гаснет за период; позиции — детерминированно из seed
export function ripples(n, area, seed = 3, color = '#9fd0f0') {
  const g = new THREE.Group(); let s = seed; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const items = [];
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(new THREE.RingGeometry(.86, 1, 40), new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false, fog: false, toneMapped: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
    m.rotation.x = -Math.PI / 2; m.renderOrder = 2; g.add(m);
    items.push({ m, x: area[0] + r() * (area[1] - area[0]), z: area[2] + r() * (area[3] - area[2]), ph: r(), per: .7 + r() * .5, R: .12 + r() * .16 });
  }
  function update(t, k = 1) {
    for (const it of items) {
      const p = ((t / it.per + it.ph) % 1), cyc = Math.floor(t / it.per + it.ph);
      const j = Math.abs(Math.sin(cyc * 91.7 + it.ph * 13)) * .5;      // каждое новое кольцо чуть сдвинуто
      it.m.position.set(it.x + j - .25, .008, it.z + (j - .25) * 1.3); it.m.scale.setScalar(.02 + it.R * p);
      it.m.material.opacity = .45 * k * Math.pow(1 - p, 1.6);
    }
  }
  return { group: g, update };
}
