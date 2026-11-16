// noirLogistics.js: декорация «Стикман Нуар» для полностью 3D-сцен (тип C) — путь коробки с чипами.
// Вид подогнан под рисованные фоны GPT (wiki/craft/stickman-noir.md): cel-заливки 3 тонами (MeshToonMaterial
// + ступенчатый градиент), тёмный контур постоянной толщины в пикселях (обратная оболочка), ночь в тёмно-синих
// и бирюзовых тенях, тёплые янтарные лампы со свечением и конусами, дымка-туман.
//
//   const L = noirLogistics(stage)          -> { group, look, tick, hero, forklift, truck, zones, lights, ... }
//   Зоны (мировые координаты, метры; ось движения коробки — +x):
//     warehouse  x -20..6.3, z -12..6 (передней стены нет — камера снаружи), ворота дока в правой стене (x 6.3, z -1)
//     road/port  x 6..110: дорога по z = -1, штабели контейнеров, портальные краны, причал и вода (z < -22), город вдали
//     dc         x 285..320: проход дата-центра вдоль x, стойки по |z| 1.8..2.8, коробки не распакованы
//   Подвижные части отдаёт наружу, двигает их фильм: hero (паллет + коробка, origin — низ паллета),
//   forklift.group / forklift.carriage (вилы, local y), truck.group (origin — задний край контейнера на уровне земли).
// Всё детерминировано (rng с зерном), часов нет.
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { canvasTex, glowTex } from '../core/textures.js';
import { lightCone } from '../vfx/lightCone.js';
import { rng } from '../core/rng.js';

export const V = (x, y, z) => new THREE.Vector3(x, y, z);

// палитра (sRGB) — сведена с bg_restaurant_v2 / фонами L001
export const NOIR = {
  ink: 0x0a0c16,                                      // контур
  skyTop: 0x060a18, skyMid: 0x0f1c34, skyLow: 0x1e3550, glow: 0x3a4a5a,
  haze: 0x0d1d38,                                     // туман
  amber: 0xffb055, amberHot: 0xffd59a, teal: 0x47c6c9, green: 0x76b900,
  concrete: 0x3c4658, wall: 0x2b3a50, wallDark: 0x1d2738, roof: 0x141b28,
  card: 0xa27a58, cardDark: 0x7d5e48, tape: 0x5f8f1a, pallet: 0x8a6a46,
  rackUp: 0x35587a, rackBeam: 0xc0652e,
  asphalt: 0x252c3a, quay: 0x3a4250, water: 0x0d1a2c,
  crane: 0xa23c32, craneLight: 0xc9c2b4,
  cont: [0x7e3a32, 0x2a5a62, 0x2c3f62, 0x9a7a3a, 0x4f5a6a, 0x5e3a56, 0x3a5c48],
  rack: 0x161b26, dcFloor: 0x2a3444, dcWall: 0x1b2433,
};

// ---------------------------------------------------------------------------------------------------
// материалы: cel-заливка и контур
// ---------------------------------------------------------------------------------------------------
let _grad;
// три ступени света: тень / полутон / свет (как 2–3 тона на рисованном фоне)
export const toonGrad = () => {
  if (_grad) return _grad;
  const v = [58, 58, 58, 58, 140, 140, 140, 140, 255, 255, 255, 255];        // 3 тона; линейная выборка даёт мягкий переход между ними
  _grad = new THREE.DataTexture(new Uint8Array(v.flatMap(x => [x, x, x, 255])), v.length, 1, THREE.RGBAFormat);
  _grad.minFilter = _grad.magFilter = THREE.LinearFilter; _grad.generateMipmaps = false; _grad.needsUpdate = true;
  return _grad;
};
const _toon = new Map();
export function toon(color, o = {}) {
  const key = color + JSON.stringify(o, (k, v) => (v && v.isTexture ? v.uuid : v));
  if (!o.map && _toon.has(key)) return _toon.get(key);
  const m = new THREE.MeshToonMaterial({ color, gradientMap: toonGrad(), ...o });
  if (!o.map) _toon.set(key, m);
  return m;
}
// светящееся (лампы, окна, светодиоды): не освещается, яркость > 1 ловит bloom
export const glowMat = (hex, k = 1.6) => new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(k) });

const RES = { value: new THREE.Vector2(1920, 1080) };
const _ink = new Map();
// контур: обратная оболочка, сдвиг по сглаженной нормали в экранных пикселях (на дальнем плане тоньше, тонет в тумане)
export function inkMat(px = 3, color = NOIR.ink) {
  const key = px + ':' + color; if (_ink.has(key)) return _ink.get(key);
  const m = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide });
  m.onBeforeCompile = sh => {
    sh.uniforms.uPx = { value: px }; sh.uniforms.uRes = RES;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uPx; uniform vec2 uRes;')
      .replace('#include <project_vertex>', `#include <project_vertex>
      { vec3 hn = normal;
        #ifdef USE_INSTANCING
          hn = mat3(instanceMatrix) * hn;
        #endif
        vec3 nv = normalize(normalMatrix * hn);
        vec2 sd = (projectionMatrix * vec4(nv, 0.)).xy * uRes; float L = length(sd);
        if (L > 1e-5) { sd /= L; float w = gl_Position.w; float k = uPx * mix(1., .4, smoothstep(10., 70., w)) * min(1., w / .6);
          gl_Position.xy += sd * k * 2. / uRes * w; } }`);
  };
  m.customProgramCacheKey = () => 'ink';
  _ink.set(key, m); return m;
}
const _hull = new WeakMap();
// геометрия оболочки: вершины склеены, нормали сглажены (на углах ящика — диагональ, без разрывов контура)
export function hullGeo(geo) {
  if (_hull.has(geo)) return _hull.get(geo);
  let g = new THREE.BufferGeometry(); g.setAttribute('position', geo.getAttribute('position').clone()); if (geo.index) g.setIndex(geo.index.clone());
  g = mergeVertices(g, 1e-4); g.computeVertexNormals(); _hull.set(geo, g); return g;
}
// линии по рёбрам (изломы > 25°): толстые экранные линии цвета туши — как контуры предметов на рисованном фоне
const _lineM = new Map(), _edges = new WeakMap();
export function lineMat(px = 2) {
  if (_lineM.has(px)) return _lineM.get(px);
  const m = new LineMaterial({ color: NOIR.ink, linewidth: px, worldUnits: false });
  m.fog = true; m.resolution.copy(RES.value); m.polygonOffset = true; m.polygonOffsetFactor = -2; m.polygonOffsetUnits = -6;
  _lineM.set(px, m); return m;
}
const edgePos = geo => { if (!_edges.has(geo)) _edges.set(geo, new THREE.EdgesGeometry(geo, 25).getAttribute('position').array); return _edges.get(geo); };
export function edgeLines(parent, geo, px = 2, mats = null) {
  let a = edgePos(geo);
  if (mats) { const out = new Float32Array(a.length * mats.length), v = new THREE.Vector3(); mats.forEach((M, k) => { for (let i = 0; i < a.length; i += 3) { v.set(a[i], a[i + 1], a[i + 2]).applyMatrix4(M); out.set([v.x, v.y, v.z], k * a.length + i); } }); a = out; }
  const g = new LineSegmentsGeometry(); g.setPositions(a);
  const l = new LineSegments2(g, lineMat(px)); l.frustumCulled = !!mats ? false : true; parent.add(l); return l;
}
// меш + контур + линии рёбер. o: { px, edge (px линий рёбер), cast, receive, ink: false, edges: false }
export function inked(parent, geo, mat, o = {}) {
  const m = new THREE.Mesh(geo, mat); m.castShadow = o.cast ?? true; m.receiveShadow = o.receive ?? true; parent.add(m);
  if (o.ink !== false) { const h = new THREE.Mesh(hullGeo(geo), inkMat(o.px ?? 3.5)); h.castShadow = false; h.receiveShadow = false; m.add(h);
    if (o.edges !== false) edgeLines(m, geo, o.edge ?? EDGE(o.px ?? 3.5)); }
  return m;
}
const EDGE = px => Math.max(1.5, Math.round(px * .6 * 2) / 2);
const _geos = new Map();
const boxGeo = (w, h, d) => { const k = `${w},${h},${d}`; if (!_geos.has(k)) _geos.set(k, new THREE.BoxGeometry(w, h, d)); return _geos.get(k); };
export function box(parent, w, h, d, mat, x, y, z, o = {}) {
  const m = inked(parent, o.geo || boxGeo(w, h, d), typeof mat === 'number' ? toon(mat) : mat, o); m.position.set(x, y, z);
  if (o.ry) m.rotation.y = o.ry; if (o.rx) m.rotation.x = o.rx; if (o.rz) m.rotation.z = o.rz; return m;
}
export function cyl(parent, r0, r1, h, mat, x, y, z, o = {}) {
  const k = `c${r0},${r1},${h},${o.seg || 16}`; if (!_geos.has(k)) _geos.set(k, new THREE.CylinderGeometry(r0, r1, h, o.seg || 16));
  const m = inked(parent, _geos.get(k), typeof mat === 'number' ? toon(mat) : mat, o); m.position.set(x, y, z);
  if (o.rx) m.rotation.x = o.rx; if (o.rz) m.rotation.z = o.rz; return m;
}
// много одинаковых предметов: InstancedMesh + контур тем же набором матриц; colors — по экземпляру
export function instanced(parent, geo, mat, mats, o = {}) {
  const n = mats.length, im = new THREE.InstancedMesh(geo, mat, n);
  mats.forEach((M, i) => im.setMatrixAt(i, M)); im.castShadow = o.cast ?? true; im.receiveShadow = true;
  if (o.colors) o.colors.forEach((c, i) => im.setColorAt(i, new THREE.Color(c)));
  parent.add(im);
  if (o.ink !== false) { const h = new THREE.InstancedMesh(hullGeo(geo), inkMat(o.px ?? 3), n); mats.forEach((M, i) => h.setMatrixAt(i, M)); parent.add(h);
    if (o.edges !== false) edgeLines(parent, geo, o.edge ?? EDGE(o.px ?? 3), mats); }
  return im;
}
const TRS = (x, y, z, ry = 0, s = [1, 1, 1]) => new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), V(...s));

// ---------------------------------------------------------------------------------------------------
// текстуры (рисованные: ровные заливки, линии, без фотофактуры)
// ---------------------------------------------------------------------------------------------------
const rep = (t, x, y) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(x, y); return t; };
const stripes = (n, a, b) => canvasTex(256, 64, (x, w, h) => { for (let i = 0; i < n; i++) { x.fillStyle = i % 2 ? a : b; x.fillRect(i * w / n, 0, w / n + 1, h); } });
const concreteTex = () => canvasTex(1024, 1024, (x, w, h) => {
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, h);
  const r = rng(7); for (let i = 0; i < 24; i++) { x.fillStyle = `rgba(30,40,60,${.04 + r() * .05})`; x.beginPath(); x.ellipse(r() * w, r() * h, 60 + r() * 160, 30 + r() * 90, r() * 3, 0, 7); x.fill(); }
  x.strokeStyle = 'rgba(20,24,36,.55)'; x.lineWidth = 3; for (let i = 0; i <= 4; i++) { x.beginPath(); x.moveTo(i * w / 4, 0); x.lineTo(i * w / 4, h); x.stroke(); x.beginPath(); x.moveTo(0, i * h / 4); x.lineTo(w, i * h / 4); x.stroke(); }
});
const serialTex = (sn) => canvasTex(512, 320, (x, w, h) => {
  x.fillStyle = '#f2ead8'; x.fillRect(0, 0, w, h); x.strokeStyle = '#1a1a1a'; x.lineWidth = 10; x.strokeRect(5, 5, w - 10, h - 10);
  x.fillStyle = '#76b900'; x.fillRect(26, 26, 120, 120);
  x.fillStyle = '#111'; x.font = 'bold 54px Arial'; x.fillText('SN', 170, 80); x.font = 'bold 44px Consolas, monospace'; x.fillText(sn, 170, 134);
  for (let i = 0; i < 46; i++) { const r = Math.abs(Math.sin(i * 12.9898 + sn.length) * 43758.5) % 1; x.fillRect(30 + i * 10, 175, r > .5 ? 6 : 3, 100); }
});
const ledTex = (seed, cols = ['#5fe0d0', '#76b900', '#4aa3ff']) => canvasTex(256, 512, (x, w, h) => {
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, h);
  const r = rng(seed);
  for (let u = 0; u < 20; u++) { const y = 10 + u * 25; x.fillStyle = '#c9cfd9'; x.fillRect(10, y, w - 20, 21); x.fillStyle = '#9aa2b0';
    for (let k = 0; k < 14; k++) x.fillRect(20 + k * 12, y + 4, 7, 13); }
});
const ledDots = (seed, cols = ['#5fe0d0', '#9be03a', '#5aa8ff']) => canvasTex(256, 512, (x, w, h) => {
  x.fillStyle = '#000'; x.fillRect(0, 0, w, h); const r = rng(seed);
  for (let u = 0; u < 20; u++) { const y = 10 + u * 25; for (let k = 0; k < 4; k++) if (r() > .3) { x.fillStyle = cols[(r() * cols.length) | 0]; x.fillRect(196 + k * 12, y + 7, 7, 7); } }
});
const windowsTex = (seed, cols = 6, rows = 18) => canvasTex(256, 512, (x, w, h) => {
  x.fillStyle = '#000'; x.fillRect(0, 0, w, h); const r = rng(seed);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) if (r() > .45) { x.fillStyle = r() > .85 ? '#7fe0e8' : '#ffc070'; x.fillRect(14 + i * (w - 20) / cols, 12 + j * (h - 16) / rows, (w - 20) / cols * .55, (h - 16) / rows * .5); }
});

// ---------------------------------------------------------------------------------------------------
// небо: градиент + полосы облаков, свечение города у горизонта
// ---------------------------------------------------------------------------------------------------
export function noirSky(parent, radius = 600) {
  const C = h => new THREE.Color(h);
  const m = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 16), new THREE.ShaderMaterial({
    uniforms: { top: { value: C(NOIR.skyTop) }, mid: { value: C(NOIR.skyMid) }, low: { value: C(NOIR.skyLow) }, glow: { value: C(NOIR.glow) } },
    side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vD; void main(){ vD = position; vec4 p = projectionMatrix*modelViewMatrix*vec4(position,1.); gl_Position = p.xyww; }',
    fragmentShader: `uniform vec3 top, mid, low, glow; varying vec3 vD;
      void main(){ vec3 d = normalize(vD); float h = d.y;
        vec3 c = mix(low, mid, smoothstep(0., .18, h)); c = mix(c, top, smoothstep(.15, .6, h));
        c = mix(c, glow, .55*smoothstep(.08, 0., h)*smoothstep(-.05, .0, h));
        float a = atan(d.z, d.x); float band = sin(a*3. + h*9.)*.5 + sin(a*7.1 - h*15.)*.3;
        float cl = smoothstep(.25, .6, band) * smoothstep(.03, .12, h) * smoothstep(.45, .2, h);
        c = mix(c, mid*1.35, cl*.55);
        gl_FragColor = vec4(c, 1.); }`,
  }));
  m.frustumCulled = false; m.renderOrder = -10; parent.add(m);
  m.follow = cam => m.position.copy(cam.position);
  return m;
}

// лампа со свечением (спрайт) и, по желанию, конусом света в дымке и точечным светом
function lamp(parent, pos, { color = NOIR.amber, glow = 1.2, cone = null, light = 30, dist = 14, size = .35, shade = true } = {}) {
  if (shade) { const s = cyl(parent, size * .25, size, size * .5, 0x2a2f3a, pos.x, pos.y + size * .25, pos.z, { seg: 20, px: 2.5 }); }
  const bulb = new THREE.Mesh(new THREE.CircleGeometry(size * .92, 24), glowMat(NOIR.amberHot, 1.5)); bulb.rotation.x = Math.PI / 2; bulb.position.copy(pos).add(V(0, -.005, 0)); parent.add(bulb);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: .55 * glow, fog: false }));
  sp.position.copy(pos).add(V(0, -.1, 0)); sp.scale.setScalar(size * 6 * glow); parent.add(sp);
  let L = null;
  if (light) { L = new THREE.PointLight(color, light, dist, 1.6); L.position.copy(pos).add(V(0, -.3, 0)); parent.add(L); }
  if (cone) lightCone(parent, { top: pos.clone().add(V(0, -.02, 0)), floorY: cone.floorY ?? 0, r0: size * .8, r1: cone.r1 ?? 2.4, color: [1, .74, .42], aTop: cone.a ?? .16, aBottom: (cone.a ?? .16) * 1.3 });
  return { bulb, sprite: sp, light: L };
}

// ---------------------------------------------------------------------------------------------------
// предметы
// ---------------------------------------------------------------------------------------------------
// коробка с сервером: картон, зелёная лента-пломба крест-накрест, наклейка с серийником на +z и -x
export function serverBox(parent, { w = .9, h = .55, d = .7, sn = '4XG-2207-1193', label = true, color = NOIR.card } = {}) {
  const g = new THREE.Group(); parent.add(g);
  box(g, w, h, d, color, 0, h / 2, 0, { px: 3 });
  const tape = toon(NOIR.tape), t = .09;
  box(g, w + .012, h + .012, t, tape, 0, h / 2, 0, { ink: false });
  box(g, t, h + .014, d + .014, tape, 0, h / 2, 0, { ink: false });
  if (label) {
    const tex = serialTex(sn), lm = toon(0xcfc8b8, { map: tex });
    const a = new THREE.Mesh(new THREE.PlaneGeometry(.3, .19), lm); a.position.set(w * .27, h * .55, d / 2 + .004); g.add(a);
    const b = new THREE.Mesh(new THREE.PlaneGeometry(.3, .19), lm); b.rotation.y = -Math.PI / 2; b.position.set(-w / 2 - .004, h * .55, d * .22); g.add(b);
    // зелёная пломба-печать на стыке ленты сверху и спереди
    const seal = glowMat(NOIR.green, 1.25);
    const s1 = new THREE.Mesh(new THREE.CircleGeometry(.075, 24), seal); s1.position.set(0, h * .5, d / 2 + .01); g.add(s1);
    const s2 = new THREE.Mesh(new THREE.CircleGeometry(.075, 24), seal); s2.rotation.y = -Math.PI / 2; s2.position.set(-w / 2 - .01, h * .5, 0); g.add(s2);
  }
  return g;
}
export function pallet(parent, w = 1.2, d = 1.0) {
  const g = new THREE.Group(); parent.add(g);
  const m = toon(NOIR.pallet);
  box(g, w, .03, d, m, 0, .135, 0, { px: 2 }); for (const x of [-w / 2 + .06, 0, w / 2 - .06]) box(g, .1, .1, d, m, x, .07, 0, { px: 2 });
  box(g, w, .02, d, m, 0, .01, 0, { px: 2, ink: false });
  return g;
}
// погрузчик: смотрит в +x, вилы впереди; carriage.position.y — подъём вил (0 — у пола)
export function forklift(parent) {
  const g = new THREE.Group(); parent.add(g);
  const Y = toon(0xc99a2e), D = toon(0x1c2230), M = toon(0x3c4352);
  box(g, 1.5, .7, 1.1, Y, -.2, .7, 0); box(g, .55, .5, 1.0, D, -.85, .85, 0);          // корпус, противовес
  box(g, .6, .35, .9, Y, -.35, 1.2, 0);                                                    // сиденье/капот
  for (const x of [-.7, .3]) for (const z of [-.5, .5]) cyl(g, .28, .28, .22, D, x, .28, z, { rx: Math.PI / 2, seg: 18 });
  for (const z of [-.42, .42]) for (const x of [-.75, .35]) box(g, .06, 1.25, .06, D, x, 1.75, z, { px: 2 });   // каркас
  box(g, 1.2, .06, .95, D, -.2, 2.38, 0, { px: 2 });
  for (const z of [-.35, .35]) box(g, .1, 2.7, .1, M, .62, 1.35, z, { px: 2 });             // мачта
  const car = new THREE.Group(); car.position.set(.7, 0, 0); g.add(car);
  box(car, .08, .6, .9, M, 0, .4, 0, { px: 2 });
  for (const z of [-.3, .3]) box(car, 1.15, .05, .12, M, .6, .08, z, { px: 2 });
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(.07, 12, 8), glowMat(0xff9a2a, 2)); beacon.position.set(-.5, 2.48, 0); g.add(beacon);
  return { group: g, carriage: car, beacon };
}
// контейнер 40' (12 x 2.6 x 2.44), открыт с торца -x: полые стенки, двери распахнуты. origin — задний край на полу контейнера
export function openContainer(parent, color = NOIR.cont[1]) {
  const g = new THREE.Group(); parent.add(g);
  const tex = rep(stripes(24, '#ffffff', '#c9c9c9'), 6, 1), wall = toon(color, { map: tex });
  const L = 12, H = 2.6, W = 2.44, t = .05;
  box(g, L, t, W, toon(0x3a3028), L / 2, 0, 0);                            // пол
  box(g, L, t, W, wall, L / 2, H, 0);                                       // крыша
  box(g, L, H, t, wall, L / 2, H / 2, W / 2); box(g, L, H, t, wall, L / 2, H / 2, -W / 2);
  box(g, t, H, W, wall, L, H / 2, 0);                                       // передняя стенка
  const inner = toon(0x0e131e);                                             // тёмная обшивка внутри (свет без теней пробивал бы стенки)
  const pl = (w, h, x, y, z, ry, rx = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), inner); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); m.receiveShadow = true; g.add(m); };
  pl(L - .1, H - .1, L / 2, H / 2, W / 2 - .04, Math.PI); pl(L - .1, H - .1, L / 2, H / 2, -W / 2 + .04, 0);
  pl(W - .1, H - .1, L - .04, H / 2, 0, -Math.PI / 2); pl(L - .1, W - .1, L / 2, H - .04, 0, 0, Math.PI / 2);
  const doorM = toon(color, { map: rep(stripes(8, '#ffffff', '#c9c9c9'), 1, 1) });
  const doors = [];
  for (const s of [1, -1]) { const p = new THREE.Group(); p.position.set(0, 0, s * W / 2); p.rotation.y = s * 2.62; g.add(p); box(p, .06, H, W / 2, doorM, 0, H / 2, -s * W / 4); doors.push(p); }
  return { group: g, doors, L, H, W };
}
// тягач с полуприцепом и контейнером: origin — задний край контейнера, на земле; едет в +x
export function truck(parent) {
  const g = new THREE.Group(); parent.add(g);
  const D = toon(0x161b26), cab = toon(0x3b5d7a);
  const BED = 1.3;
  box(g, 12.4, .25, 2.2, D, 6.2, 1.1, 0);                                  // рама
  for (const x of [1.0, 2.3, 3.6]) for (const z of [-.95, .95]) cyl(g, .5, .5, .35, D, x, .5, z, { rx: Math.PI / 2, seg: 20 });
  const c = openContainer(g); c.group.position.set(0, BED + .02, 0);
  // тягач
  box(g, 3.2, .4, 2.3, D, 13.8, .9, 0); box(g, 2.1, 2.2, 2.4, cab, 14.4, 2.2, 0); box(g, .9, 1.1, 2.4, cab, 15.7, 1.65, 0);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(2.1, .9), glowMat(0x2c4f66, 1)); glass.rotation.y = Math.PI / 2; glass.position.set(15.46, 2.65, 0); g.add(glass);
  for (const x of [12.8, 15.4]) for (const z of [-1.0, 1.0]) cyl(g, .5, .5, .35, D, x, .5, z, { rx: Math.PI / 2, seg: 20 });
  const hl = glowMat(NOIR.amberHot, 2.2); for (const z of [-.9, .9]) { const h = new THREE.Mesh(new THREE.CircleGeometry(.14, 16), hl); h.rotation.y = Math.PI / 2; h.position.set(16.16, 1.35, z); g.add(h); }
  const tl = glowMat(0xff3a2a, 2); for (const z of [-1.0, 1.0]) { const h = new THREE.Mesh(new THREE.PlaneGeometry(.1, .25), tl); h.rotation.y = -Math.PI / 2; h.position.set(-.06, 1.05, z); g.add(h); }
  return { group: g, container: c, bed: BED + .02 + .025 };
}
// стеллаж: синие стойки, оранжевые балки, на полках картонные коробки (часть с зелёной лентой)
function palletRack(parent, x0, z0, bays, levels, seed, o = {}) {
  const bw = 2.7, depth = 1.1, lh = 1.75, up = toon(NOIR.rackUp), beam = toon(NOIR.rackBeam);
  const r = rng(seed), boxes = [], cols = [];
  for (let b = 0; b <= bays; b++) for (const dz of [-depth / 2, depth / 2]) box(parent, .09, levels * lh + .3, .09, up, x0 + b * bw, (levels * lh + .3) / 2, z0 + dz, { px: 2.5 });
  for (let l = 1; l <= levels; l++) for (let b = 0; b < bays; b++) for (const dz of [-depth / 2, depth / 2]) box(parent, bw, .12, .07, beam, x0 + b * bw + bw / 2, l * lh - .9, z0 + dz, { px: 2.5 });
  for (let l = 0; l < levels; l++) for (let b = 0; b < bays; b++) {
    const y0 = l === 0 ? 0 : (l * lh - .84);
    for (let k = 0; k < 2; k++) { if (r() < .12) continue;
      const cx = x0 + b * bw + .7 + k * 1.3, n = 1 + ((r() * 3) | 0);
      for (let s = 0; s < n; s++) { const w = .8 + r() * .3, h = .45 + r() * .2; boxes.push(TRS(cx + (r() - .5) * .1, y0 + .15 + s * .52 + h / 2, z0 + (r() - .5) * .1, (r() - .5) * .15, [w, h, .85])); cols.push(r() < .25 ? 0x9c7550 : r() < .5 ? NOIR.cardDark : NOIR.card); }
      boxes.push(TRS(cx, y0 + .07, z0, 0, [1.2, .14, 1.0])); cols.push(NOIR.pallet);
    }
  }
  return { boxes, cols };
}
// портальный кран STS: ноги по z, стрела над водой (в -z)
function stsCrane(parent, x, zLand, zSea) {
  const g = new THREE.Group(); g.position.set(x, 0, 0); parent.add(g);
  const R = toon(NOIR.crane), W = toon(NOIR.craneLight), H = 30, span = zLand - zSea;
  for (const z of [zLand, zSea]) for (const dx of [-7, 7]) box(g, .9, H, .9, R, dx, H / 2, z, { px: 2.5 });
  for (const z of [zLand, zSea]) box(g, 15, 1.2, 1, R, 0, H - .6, z, { px: 2.5 });
  for (const dx of [-7, 7]) { box(g, .8, .8, span, R, dx, H, (zLand + zSea) / 2, { px: 2.5 }); box(g, .6, .6, span, R, dx, 9, (zLand + zSea) / 2, { px: 2.5 }); }
  for (const dx of [-3.5, 3.5]) box(g, 1, 1.4, span + 45, W, dx, H + 4, (zLand + 5 + zSea - 40) / 2, { px: 2.5 });   // стрела: от машинного отделения далеко над водой
  box(g, 8, 4, 6, W, 0, H + 7, zLand + 2, { px: 2.5 });                                // машинное отделение
  for (const dx of [-3.5, 3.5]) box(g, .5, 12, .5, R, dx, H + 8, zLand - 2, { px: 2.5, rz: 0, rx: -.35 });
  const tip = new THREE.Mesh(new THREE.SphereGeometry(.35, 10, 8), glowMat(0xff4030, 2.4)); tip.position.set(0, H + 5, zSea - 40); g.add(tip);
  const t2 = tip.clone(); t2.position.set(0, H + 10, zLand + 2); g.add(t2);
  return g;
}

// ---------------------------------------------------------------------------------------------------
// декорация целиком
// ---------------------------------------------------------------------------------------------------
// dcBoxes: false — без штабелей нераспакованных коробок в дата-центре (фильм ставит свои); по умолчанию как раньше
export function noirLogistics(stage, { origin = V(0, 0, 0), dcX = 300, dcBoxes = true } = {}) {
  const group = new THREE.Group(); group.position.copy(origin); stage.add(group);
  RES.value.set(stage.W, stage.H);
  const lights = [];
  const sky = noirSky(group);
  const hemi = new THREE.HemisphereLight(0x3f64a8, 0x14182a, 1.05); group.add(hemi);
  const moon = new THREE.DirectionalLight(0x8fb0e8, 1.1); moon.castShadow = true; moon.shadow.mapSize.set(2048, 2048);
  moon.shadow.bias = -.0008; moon.shadow.normalBias = .03; group.add(moon, moon.target);
  const moonDir = V(-.45, .8, .4).normalize();
  function fitMoon(c, r) { moon.target.position.copy(c); moon.position.copy(c).addScaledVector(moonDir, 60); const s = moon.shadow.camera; s.left = -r; s.right = r; s.top = r; s.bottom = -r; s.near = 1; s.far = 140; s.updateProjectionMatrix(); }
  fitMoon(V(0, 0, 0), 20);

  // ================= склад =================
  const wh = new THREE.Group(); group.add(wh);
  const ctex = rep(concreteTex(), 4, 3);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(27, 18), toon(NOIR.concrete, { map: ctex })); floor.rotation.x = -Math.PI / 2; floor.position.set(-7, 0, -3); floor.receiveShadow = true; wh.add(floor);
  // разметка проезда (жёлтые полосы) к воротам
  const lane = toon(0xc9a23a);
  for (const z of [-2.4, .4]) { const s = new THREE.Mesh(new THREE.PlaneGeometry(20, .1), lane); s.rotation.x = -Math.PI / 2; s.position.set(-4, .006, z); s.receiveShadow = true; wh.add(s); }
  const wallTex = (n, rx) => toon(NOIR.wall, { map: rep(stripes(n, '#ffffff', '#cfd3dc'), rx, 1) });
  box(wh, 27, 9, .3, wallTex(32, 6), -7, 4.5, -12.15);                    // задняя стена
  box(wh, .3, 9, 18, wallTex(32, 4), -20.5, 4.5, -3);                      // левая
  // правая стена с проёмом дока (z -2.7..0.7, h 3.8)
  box(wh, .3, 9, 9.3, wallTex(32, 2), 6.45, 4.5, -7.35); box(wh, .3, 5.2, 3.4, wallTex(16, 1), 6.45, 6.4, -1);   // передняя часть правой стены срезана (камера снаружи)
  box(wh, .5, .5, 3.6, toon(0x2a2f3a), 6.45, 3.85, -1, { px: 3 });         // перемычка-рулонная дверь
  // окна под крышей (лунный свет)
  for (let i = 0; i < 6; i++) { const wm = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.1), glowMat(0x2f5f88, 1)); wm.position.set(-18 + i * 4.2, 7.4, -11.98); wh.add(wm); }
  // фермы крыши
  for (let i = 0; i < 7; i++) box(wh, .25, .45, 18, toon(NOIR.roof), -19 + i * 4.2, 8.6, -3, { px: 2.5 });
  // стеллажи: два ряда вдоль задней стены
  const R1 = palletRack(wh, -19.5, -9.6, 8, 4, 11), R2 = palletRack(wh, -19.5, -5.6, 6, 4, 12);
  instanced(wh, boxGeo(1, 1, 1), toon(0xffffff), [...R1.boxes, ...R2.boxes], { colors: [...R1.cols, ...R2.cols], px: 2.5 });
  // штабели на полу у проезда
  const fl = [], fc = [], r = rng(31);
  for (const [x, z] of [[-14, 1.6], [-12.6, 1.6], [-3, -4], [-1.6, -4], [2, 2.2], [-17, -2.8]]) { fl.push(TRS(x, .07, z, 0, [1.2, .14, 1])); fc.push(NOIR.pallet); for (let s = 0; s < 2 + (r() * 2 | 0); s++) { fl.push(TRS(x, .15 + s * .56 + .27, z, (r() - .5) * .2, [.9, .54, .72])); fc.push(r() < .5 ? NOIR.card : NOIR.cardDark); } }
  instanced(wh, boxGeo(1, 1, 1), toon(0xffffff), fl, { colors: fc, px: 3 });
  // лампы
  for (const [x, z] of [[-15, -3], [-9, -1.5], [-3, -2], [2.5, -1.5]]) lights.push(lamp(wh, V(x, 6.6, z), { cone: { r1: 2.6, a: .12 }, light: 24, dist: 11, size: .45 }));
  for (const x of [-15, -9, -3, 2.5]) box(wh, .03, 2, .03, toon(0x111111), x, 7.85, x === -9 || x === 2.5 ? -1.5 : x === -3 ? -2 : -3, { ink: false });
  // фонарь над воротами снаружи + пятно
  lights.push(lamp(group, V(7.0, 4.6, -1), { light: 30, dist: 10, size: .3, glow: 1.3 }));

  // ================= дорога и порт =================
  const port = new THREE.Group(); group.add(port);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(130, 70), toon(NOIR.asphalt)); ground.rotation.x = -Math.PI / 2; ground.position.set(60, -.01, 5); ground.receiveShadow = true; port.add(ground);
  const quay = new THREE.Mesh(new THREE.PlaneGeometry(110, 6), toon(NOIR.quay)); quay.rotation.x = -Math.PI / 2; quay.position.set(65, .005, -21); quay.receiveShadow = true; port.add(quay);
  box(port, 110, 1.5, .5, toon(0x2b313d), 65, -.75, -24.2, { px: 2 });   // кромка причала
  for (let i = 0; i < 18; i++) { const s = new THREE.Mesh(new THREE.PlaneGeometry(2.4, .14), toon(0xb9b39c)); s.rotation.x = -Math.PI / 2; s.position.set(10 + i * 5, .008, 1.4); port.add(s); }
  const edge = new THREE.Mesh(new THREE.PlaneGeometry(100, .12), toon(0xc9a23a)); edge.rotation.x = -Math.PI / 2; edge.position.set(60, .008, -3.4); port.add(edge);
  // вода с отражениями огней
  const water = new THREE.Mesh(new THREE.PlaneGeometry(500, 300), toon(NOIR.water)); water.rotation.x = -Math.PI / 2; water.position.set(60, -1.2, -175); port.add(water);
  const refl = new THREE.MeshBasicMaterial({ map: softTex2(), color: new THREE.Color(NOIR.amber).multiplyScalar(.5), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: true });
  const rr = rng(5);
  for (let i = 0; i < 40; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(.8 + rr() * 2, 6 + rr() * 14), refl); m.rotation.x = -Math.PI / 2; m.position.set(-20 + rr() * 170, -1.15, -40 - rr() * 100); port.add(m); }
  // штабели контейнеров
  const cm = [], cc = [], rc = rng(21);
  const stack = (x0, z0, nx, nz, maxH, rot = 0) => { for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) { const h = 1 + (rc() * maxH | 0); for (let k = 0; k < h; k++) { cm.push(TRS(x0 + i * 6.3, k * 2.6 + 1.3, z0 - j * 2.55, rot, [6.06, 2.59, 2.44])); cc.push(NOIR.cont[(rc() * NOIR.cont.length) | 0]); } } };
  stack(24, -7, 3, 4, 4); stack(48, -7, 2, 3, 3); stack(66, -7, 4, 4, 4); stack(96, -7, 3, 4, 3);
  const ctex2 = rep(stripes(30, '#ffffff', '#bfc3c9'), 1, 1);
  instanced(port, boxGeo(1, 1, 1), toon(0xffffff, { map: ctex2 }), cm, { colors: cc, px: 2.5 });
  // краны
  for (const x of [44, 62, 82]) stsCrane(port, x, -19, -32);
  // судно у причала
  const ship = new THREE.Group(); ship.position.set(70, 0, -37); port.add(ship);
  box(ship, 120, 9, 18, toon(0x1d2433), 0, 2, 0, { px: 3 }); box(ship, 14, 14, 16, toon(0xc9c2b4), 52, 13, 0, { px: 3 });
  const sm = [], sc = [], rs = rng(77);
  for (let i = 0; i < 15; i++) for (let j = 0; j < 6; j++) { const h = 1 + (rs() * 4 | 0); for (let k = 0; k < h; k++) { sm.push(TRS(-50 + i * 6.3, 6.5 + k * 2.6 + 1.3, -6.5 + j * 2.6, 0, [6.06, 2.59, 2.44])); sc.push(NOIR.cont[(rs() * NOIR.cont.length) | 0]); } }
  instanced(ship, boxGeo(1, 1, 1), toon(0xffffff, { map: ctex2 }), sm, { colors: sc, px: 2 });
  // фонарные мачты
  for (const [x, z] of [[14, -4.2], [30, -4.2], [44, -4.2], [58, -4.2], [74, -4.2], [90, -4.2]]) {
    box(port, .25, 12, .25, toon(0x2a3040), x, 6, z, { px: 2 }); box(port, 1.6, .3, .8, toon(0x2a3040), x, 12.1, z, { px: 2 });
    lights.push(lamp(port, V(x, 11.9, z), { shade: false, light: 90, dist: 24, size: .5, glow: 2.2, cone: { r1: 6, a: .1 } }));
  }
  // город вдали за водой: силуэты с окнами
  const city = new THREE.Group(); port.add(city); const rcity = rng(99);
  for (let i = 0; i < 26; i++) { const w = 8 + rcity() * 14, h = 20 + rcity() * 70, x = -60 + i * 9 + rcity() * 4, z = -140 - rcity() * 30;
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 8), [toon(0x1c2a40), toon(0x1c2a40), toon(0x1c2a40), toon(0x1c2a40), new THREE.MeshBasicMaterial({ map: windowsTex(i), color: 0xffffff }), toon(0x1c2a40)]);
    b.position.set(x, h / 2 - 1, z); city.add(b); }

  // ================= дата-центр =================
  const dc = new THREE.Group(); dc.position.set(dcX, 0, 0); group.add(dc);
  const tiles = canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.strokeStyle = 'rgba(10,14,24,.6)'; x.lineWidth = 4; x.strokeRect(2, 2, w - 4, h - 4); x.fillStyle = 'rgba(10,14,24,.25)'; for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) if ((i + j) % 2) x.fillRect(40 + i * 22, 40 + j * 22, 8, 8); });
  const dfl = new THREE.Mesh(new THREE.PlaneGeometry(40, 10), toon(NOIR.dcFloor, { map: rep(tiles, 66, 16.5) })); dfl.rotation.x = -Math.PI / 2; dfl.position.set(2, 0, 0); dfl.receiveShadow = true; dc.add(dfl);
  box(dc, 40, .2, 10, toon(NOIR.dcWall), 2, 3.6, 0, { ink: false });                // потолок
  box(dc, 40, 3.6, .2, toon(NOIR.dcWall), 2, 1.8, -4.4, { px: 2 }); box(dc, 40, 3.6, .2, toon(NOIR.dcWall), 2, 1.8, 4.4, { px: 2 });
  box(dc, .2, 3.6, 10, toon(NOIR.dcWall), 21, 1.8, 0, { px: 2 }); box(dc, .2, 3.6, 10, toon(NOIR.dcWall), -16, 1.8, 0, { px: 2 });
  const ledT = [ledDots(1), ledDots(2), ledDots(3)];
  const face = toon(NOIR.rack, { map: ledTex(4) });
  const leds = ledT.map(t => new THREE.MeshBasicMaterial({ map: t, color: new THREE.Color(1.6, 1.6, 1.6), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  const racks = [];
  for (const s of [1, -1]) for (let i = 0; i < 26; i++) {
    const x = -12 + i * .66, z = s * 2.3;
    box(dc, .62, 2.2, 1.0, toon(NOIR.rack), x, 1.1, z, { px: 2.5 });
    const f = new THREE.Mesh(new THREE.PlaneGeometry(.54, 2.05), face); f.rotation.y = s > 0 ? Math.PI : 0; f.position.set(x, 1.1, z - s * .505); dc.add(f);
    const l = new THREE.Mesh(new THREE.PlaneGeometry(.54, 2.05), leds[(i + (s > 0 ? 0 : 1)) % 3]); l.rotation.y = f.rotation.y; l.position.set(x, 1.1, z - s * .51); dc.add(l); racks.push(l);
  }
  // кабельные лотки и световые полосы
  for (const z of [-1.6, 1.6]) box(dc, 34, .08, .4, toon(0x3a4252), 4, 3.0, z, { px: 2 });
  const strips = [], stripLights = [];
  for (let i = 0; i < 8; i++) { const st = new THREE.Mesh(new THREE.PlaneGeometry(1.6, .22), glowMat(0x7fe6f0, 1.6)); st.rotation.x = Math.PI / 2; st.position.set(-10 + i * 4, 3.48, 0); dc.add(st); strips.push(st);
    if (i % 2 === 0) { const L = new THREE.PointLight(NOIR.teal, 14, 9, 1.6); L.position.set(-10 + i * 4, 3.0, 0); dc.add(L); stripLights.push(L); } }
  const warm = new THREE.PointLight(NOIR.amber, 20, 7, 1.6); warm.position.set(-1.2, 2.4, 1.3); dc.add(warm);   // тёплое пятно у коробки
  const exitL = new THREE.Mesh(new THREE.PlaneGeometry(.6, .25), glowMat(0x7ce05a, 1.8)); exitL.rotation.y = -Math.PI / 2; exitL.position.set(20.88, 2.9, 0); dc.add(exitL);
  // нераспакованные коробки вдоль прохода (ящики с лентой)
  if (dcBoxes) {
  const ub = [], uc = [], ru = rng(55);
  for (const [x, z, n] of [[1.5, 1.2, 3], [3.0, -1.2, 2], [5.2, 1.25, 4], [-2.8, -1.25, 2], [8, -1.2, 3], [11, 1.2, 3]]) { ub.push(TRS(x, .07, z, 0, [1.2, .14, 1])); uc.push(NOIR.pallet); for (let k = 0; k < n; k++) { ub.push(TRS(x + (ru() - .5) * .08, .15 + k * .56 + .275, z, (ru() - .5) * .1, [.9, .55, .7])); uc.push(NOIR.card); } }
  instanced(dc, boxGeo(1, 1, 1), toon(0xffffff), ub, { colors: uc, px: 2.5 });
  const tapeB = [], tapeC = [];
  for (const M of ub) { const p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3(); M.decompose(p, q, s); if (s.y > .3) { tapeB.push(new THREE.Matrix4().compose(p, q, V(.912, .562, .09))); tapeB.push(new THREE.Matrix4().compose(p, q, V(.09, .565, .714))); } }
  instanced(dc, boxGeo(1, 1, 1), toon(NOIR.tape), tapeB, { ink: false });
  }

  // ================= подвижные части =================
  const hero = new THREE.Group(); group.add(hero);
  pallet(hero); const heroBox = serverBox(hero); heroBox.position.y = .15;
  const fork = forklift(group);
  const tr = truck(group);

  const look = {
    bg: NOIR.skyMid, fogColor: NOIR.haze, fogDensity: .028, exposure: 1,
    bloom: .6, bloomRadius: .5, bloomThreshold: .86, dof: false, vignette: 1, far: 900,
    grade: { sat: .92, tint: [.95, .99, 1.06], lift: [.008, .013, .03], contrast: 1.06 },
  };
  function tick(t, st) {
    sky.follow(st.camera);
    st.renderer.toneMapping = THREE.NoToneMapping;
    const hp = hero.getWorldPosition(new THREE.Vector3()), inDC = hp.x > dcX - 40;
    moon.intensity = inDC ? 0 : .9; hemi.intensity = inDC ? .85 : 1.05;
    fitMoon(hp, inDC ? 10 : 22);
    for (let i = 0; i < racks.length; i++) racks[i].material = leds[(i + Math.floor(t * 3 + i * .37)) % 3];
  }
  return { group, look, tick, hero, heroBox, forklift: fork, truck: tr, moon, hemi, lights, dcX,
    zones: { warehouse: V(-7, 0, -3), dock: V(6.45, 0, -1), port: V(55, 0, -1), dc: V(dcX, 0, 0) },
    // части дата-центра для фильма (свет рядами, LED по стойкам): strips — световые полосы, stripLights — их точечный свет
    dcParts: { group: dc, strips, stripLights, racks, warm, exitL } };
}
let _soft2;
function softTex2() { return _soft2 || (_soft2 = canvasTex(64, 256, (x, w, h) => { const g = x.createLinearGradient(0, 0, w, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); const v = x.getImageData(0, 0, w, h); for (let j = 0; j < h; j++) { const a = Math.sin(j / h * Math.PI) * (.5 + .5 * Math.sin(j * .7)); for (let i = 0; i < w; i++) v.data[(j * w + i) * 4 + 3] *= a; } x.putImageData(v, 0, 0); })); }
