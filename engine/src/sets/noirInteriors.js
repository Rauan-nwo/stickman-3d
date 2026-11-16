// noirInteriors.js: «рисованный» 3D для сцен «Стикман Нуар» (интерьеры и предметы крупно) — общий набор для лонгов.
// Цель — чтобы 3D выглядел тем же миром, что рисованные фоны GPT (production/L001/assets/backgrounds_sheet2.jpg):
//   paint(color, o)     cel-заливка 3 тонами + низкочастотная «мазковая» вариация цвета в мировых координатах (не плывёт
//                       при движении камеры) + мягкий вертикальный градиент (низ темнее, как на фонах)
//   inkHull(px)         контур-оболочка: толщина в пикселях экрана, слегка «дышит» по поверхности (рука художника),
//                       толще на ближнем плане; рёбра внутри формы — тонкие линии (edges), силуэт — толстый (hull)
//   rbox / rcyl / lathe / extrude   скруглённые и скошенные формы (фаски) с контуром и линиями по «рёбрам» фаски
//   platePlane          рисованная плита GPT как плоскость в глубине (2.5D), по желанию с размытием
//   glow / hazeCard / lampLight      свечение ламп под bloom, слои дымки, тёплый свет с конусом
//   noirLook(o)         вид кадра: туман-дымка, bloom, грейд в тёмно-синий/бирюзу, без тон-маппинга
// Всё детерминировано (rng с зерном). Существующие декорации (noirLogistics) не меняются — отсюда только импорт.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { glowTex, softTex, canvasTex } from '../core/textures.js';
import { lightCone } from '../vfx/lightCone.js';

export const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const INK = 0x0b0d17;
const RES = { value: new THREE.Vector2(1920, 1080) };
export const setRes = (w, h) => { RES.value.set(w, h); for (const m of _lineM.values()) m.resolution.set(w, h); };

// ---------------------------------------------------------------------------------------------------
// шум (GLSL): value noise + fbm, общий для заливок и контура
// ---------------------------------------------------------------------------------------------------
const NOISE = `
float nh31(vec3 p){ p = fract(p * .1031); p += dot(p, p.yzx + 33.33); return fract((p.x + p.y) * p.z); }
float nvn(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(mix(nh31(i), nh31(i + vec3(1,0,0)), f.x), mix(nh31(i + vec3(0,1,0)), nh31(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(nh31(i + vec3(0,0,1)), nh31(i + vec3(1,0,1)), f.x), mix(nh31(i + vec3(0,1,1)), nh31(i + vec3(1,1,1)), f.x), f.y), f.z); }
float nfbm(vec3 p){ return .55 * nvn(p) + .3 * nvn(p * 2.03 + 7.1) + .15 * nvn(p * 4.1 + 3.3); }`;

// три тона: тень / полутон / свет; узкие мягкие переходы (как 2–3 тона на фонах)
let _cel;
export function celGrad() {
  if (_cel) return _cel;
  const v = [72, 72, 72, 72, 72, 150, 150, 150, 150, 150, 150, 238, 255, 255, 255, 255];
  _cel = new THREE.DataTexture(new Uint8Array(v.flatMap(x => [x, x, x, 255])), v.length, 1, THREE.RGBAFormat);
  _cel.minFilter = _cel.magFilter = THREE.LinearFilter; _cel.generateMipmaps = false; _cel.needsUpdate = true;
  return _cel;
}

// «рисованный» материал. o: amp (сила пятен, .12), freq (1/м, 1.6), cool (оттенок в пятнах, [r,g,b] множитель),
// coolAmt, vert ([y0, y1, k] — ниже y0 темнее на k), emissive, map, transparent ... (остальное — в MeshToonMaterial)
export function paint(color, o = {}) {
  const { amp = .12, freq = 1.6, cool = [.86, .92, 1.08], coolAmt = .35, vert = null, ...rest } = o;
  const m = new THREE.MeshToonMaterial({ color, gradientMap: celGrad(), ...rest });
  const U = { uAmp: { value: amp }, uFreq: { value: freq }, uCool: { value: new THREE.Vector3(...cool) }, uCoolAmt: { value: coolAmt },
    uVert: { value: new THREE.Vector3(...(vert || [0, 1, 0])) } };
  m.userData.paint = U;
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vPW;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        { vec4 pw = vec4(transformed, 1.);
          #ifdef USE_INSTANCING
            pw = instanceMatrix * pw;
          #endif
          vPW = (modelMatrix * pw).xyz; }`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vPW; uniform float uAmp, uFreq, uCoolAmt; uniform vec3 uCool, uVert;' + NOISE)
      .replace('#include <color_fragment>', `#include <color_fragment>
        { float n = nfbm(vPW * uFreq), n2 = nvn(vPW * uFreq * .37 + 11.7);
          diffuseColor.rgb *= 1. + uAmp * (n - .5) * 2.;
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * uCool, uCoolAmt * smoothstep(.35, .75, n2));
          diffuseColor.rgb *= 1. - uVert.z * (1. - smoothstep(uVert.x, uVert.y, vPW.y)); }`);
  };
  m.customProgramCacheKey = () => 'paint' + (rest.map ? 'm' : '') + (rest.transparent ? 't' : '');
  return m;
}
// светится (лампы, экраны, LED): не освещается, k > 1 ловит bloom
export const emit = (hex, k = 1.6, o = {}) => new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(k), ...o });

// контур-оболочка: px — толщина в пикселях на 1080p; wob — «дыхание» толщины по поверхности (0..1)
const _hull = new Map();
export function inkHull(px = 4, { color = INK, wob = .35 } = {}) {
  const key = `${px}:${color}:${wob}`; if (_hull.has(key)) return _hull.get(key);
  const m = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide });
  m.onBeforeCompile = sh => {
    sh.uniforms.uPx = { value: px }; sh.uniforms.uRes = RES; sh.uniforms.uWob = { value: wob };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uPx, uWob; uniform vec2 uRes;' + NOISE)
      .replace('#include <project_vertex>', `#include <project_vertex>
      { vec3 hn = normal; vec3 wp = position;
        #ifdef USE_INSTANCING
          hn = mat3(instanceMatrix) * hn; wp = (instanceMatrix * vec4(position, 1.)).xyz;
        #endif
        wp = (modelMatrix * vec4(wp, 1.)).xyz;
        vec3 nv = normalize(normalMatrix * hn);
        vec2 sd = (projectionMatrix * vec4(nv, 0.)).xy * uRes; float L = length(sd);
        if (L > 1e-5) { sd /= L; float w = gl_Position.w;
          float k = uPx * (uRes.y / 1080.) * mix(1.15, .45, smoothstep(1.5, 30., w)) * min(1., w / .25);
          k *= 1. + uWob * (nvn(wp * 7.) - .5) * 1.6;
          gl_Position.xy += sd * k * 2. / uRes * w; } }`);
  };
  m.customProgramCacheKey = () => 'inkHull';
  _hull.set(key, m); return m;
}
const _hullGeo = new WeakMap();
export function hullGeo(geo) {
  if (_hullGeo.has(geo)) return _hullGeo.get(geo);
  let g = new THREE.BufferGeometry(); g.setAttribute('position', geo.getAttribute('position').clone()); if (geo.index) g.setIndex(geo.index.clone());
  g = mergeVertices(g, 1e-4); g.computeVertexNormals(); _hullGeo.set(geo, g); return g;
}
// тонкие линии туши по рёбрам (порог угла настраивается — у фасок рёбра между сегментами не рисуются)
const _lineM = new Map();
export function inkLine(px = 1.8, color = INK) {
  const key = px + ':' + color; if (_lineM.has(key)) return _lineM.get(key);
  const m = new LineMaterial({ color, linewidth: px * RES.value.y / 1080, worldUnits: false });
  m.fog = true; m.resolution.copy(RES.value); m.polygonOffset = true; m.polygonOffsetFactor = -2; m.polygonOffsetUnits = -8;
  _lineM.set(key, m); return m;
}
export function edges(parent, geo, px = 1.8, thr = 30, color = INK) {
  const a = new THREE.EdgesGeometry(geo, thr).getAttribute('position').array;
  if (!a.length) return null;
  const g = new LineSegmentsGeometry(); g.setPositions(a);
  const l = new LineSegments2(g, inkLine(px, color)); parent.add(l); return l;
}
// меш + оболочка + (по желанию) линии рёбер. o: px (силуэт), edge (px линий, 0 — без), thr, cast, receive, wob, ink:false
export function inked(parent, geo, mat, o = {}) {
  const m = new THREE.Mesh(geo, typeof mat === 'number' ? paint(mat) : mat); m.castShadow = o.cast ?? true; m.receiveShadow = o.receive ?? true; parent.add(m);
  if (o.ink !== false) { const h = new THREE.Mesh(hullGeo(geo), inkHull(o.px ?? 4, { wob: o.wob ?? .35 })); h.castShadow = false; h.receiveShadow = false; h.userData.noDepth = false; m.add(h); m.userData.hull = h; }
  if (o.edge !== 0 && o.ink !== false) { const eg = o.edgeGeo || geo; const l = edges(m, eg, o.edge ?? 1.8, o.thr ?? 30); if (l && o.edgeGeo) l.userData.inset = true; }
  return m;
}
const at = (m, x, y, z, o) => { m.position.set(x, y, z); if (o.rx) m.rotation.x = o.rx; if (o.ry) m.rotation.y = o.ry; if (o.rz) m.rotation.z = o.rz; return m; };
// скруглённый ящик: r — радиус фаски; линии по «середине» фаски (ребро вписанного ящика), силуэт — оболочка
const _g = new Map(); const memo = (k, f) => (_g.has(k) ? _g.get(k) : (_g.set(k, f()), _g.get(k)));
export function rbox(parent, w, h, d, mat, x = 0, y = 0, z = 0, o = {}) {
  const r = Math.min(o.r ?? .02, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3), s = .293 * r;
  const geo = memo(`rb${w},${h},${d},${r}`, () => new RoundedBoxGeometry(w, h, d, o.seg ?? 3, r));
  const eg = memo(`rbe${w},${h},${d},${r}`, () => new THREE.BoxGeometry(w - 2 * s, h - 2 * s, d - 2 * s));
  return at(inked(parent, geo, mat, { ...o, edgeGeo: eg, thr: 30 }), x, y, z, o);
}
export function rcyl(parent, r0, r1, h, mat, x = 0, y = 0, z = 0, o = {}) {
  const geo = memo(`cy${r0},${r1},${h},${o.seg || 28}`, () => new THREE.CylinderGeometry(r0, r1, h, o.seg || 28, 1, !!o.open));
  return at(inked(parent, geo, mat, { thr: 40, ...o }), x, y, z, o);
}
// тело вращения по профилю [[r, y], ...] (снизу вверх)
export function lathe(parent, prof, mat, x = 0, y = 0, z = 0, o = {}) {
  const geo = new THREE.LatheGeometry(prof.map(([r, yy]) => new THREE.Vector2(r, yy)), o.seg || 32);
  return at(inked(parent, geo, mat, { thr: 38, ...o }), x, y, z, o);
}
// выдавленный профиль (THREE.Shape в плоскости xy, глубина по z, по центру) со скосом
export function extrude(parent, shape, depth, mat, x = 0, y = 0, z = 0, o = {}) {
  const bev = o.bevel ?? .01;
  const geo = new THREE.ExtrudeGeometry(shape, { depth: depth - 2 * bev, bevelEnabled: bev > 0, bevelThickness: bev, bevelSize: bev, bevelSegments: 3, curveSegments: o.curve || 18 });
  geo.translate(0, 0, -(depth - 2 * bev) / 2); geo.computeVertexNormals();
  return at(inked(parent, geo, mat, { thr: 40, ...o }), x, y, z, o);
}
// скруглённый прямоугольник как Shape (для профилей)
export function roundRectShape(w, h, r, x0 = -w / 2, y0 = -h / 2) {
  const s = new THREE.Shape(); s.moveTo(x0 + r, y0); s.lineTo(x0 + w - r, y0); s.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + r); s.lineTo(x0 + w, y0 + h - r);
  s.quadraticCurveTo(x0 + w, y0 + h, x0 + w - r, y0 + h); s.lineTo(x0 + r, y0 + h); s.quadraticCurveTo(x0, y0 + h, x0, y0 + h - r); s.lineTo(x0, y0 + r); s.quadraticCurveTo(x0, y0, x0 + r, y0); return s;
}
// плоская «наклейка» без контура (полоса, лента, табличка), чуть над поверхностью — без z-fighting
export function decal(parent, w, h, mat, x, y, z, o = {}) {
  const m = new THREE.Mesh(memo(`pl${w},${h}`, () => new THREE.PlaneGeometry(w, h)), typeof mat === 'number' ? paint(mat, { amp: .05 }) : mat);
  m.receiveShadow = o.receive ?? true; m.renderOrder = o.order ?? 0; at(m, x, y, z, o); parent.add(m);
  if (o.ink) edges(m, m.geometry, o.ink, 10);
  return m;
}

// ---------------------------------------------------------------------------------------------------
// свет, свечение, дымка
// ---------------------------------------------------------------------------------------------------
// мягкое свечение-спрайт (под bloom): color — THREE.Color или hex, size в метрах
export function glow(parent, pos, { size = .6, color = 0xffc070, opacity = .6 } = {}) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex(), color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity, fog: false }));
  sp.position.copy(pos); sp.scale.setScalar(size); parent.add(sp); return sp;
}
// слой дымки: большая мягкая плоскость лицом к камере (аддитивно, очень слабо). Даёт «воздух» между планами
export function hazeCard(parent, pos, { w = 6, h = 3, color = 0x24406a, opacity = .08, ry = 0 } = {}) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: softTex(), color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  m.position.copy(pos); m.rotation.y = ry; parent.add(m); return m;
}
// тёплая лампа: точечный свет + свечение + (по желанию) конус в дымке. Возвращает { light, glow, cone, set(k) }
export function lampLight(parent, pos, { color = 0xffb060, intensity = 6, dist = 4, decay = 1.6, glowSize = .5, glowOp = .7, cone = null, shadow = false } = {}) {
  const L = new THREE.PointLight(color, intensity, dist, decay); L.position.copy(pos); parent.add(L);
  if (shadow) { L.castShadow = true; L.shadow.mapSize.set(1024, 1024); L.shadow.bias = -.002; L.shadow.normalBias = .02; L.shadow.camera.near = .05; }
  const g = glow(parent, pos, { size: glowSize, color, opacity: glowOp });
  const c = cone ? lightCone(parent, { top: pos.clone().add(V(0, -.01, 0)), floorY: cone.floorY ?? 0, r0: cone.r0 ?? .05, r1: cone.r1 ?? .5, color: cone.color || [1, .78, .48], aTop: cone.a ?? .12, aBottom: (cone.a ?? .12) * 1.2 }) : null;
  const base = intensity;
  return { light: L, glow: g, cone: c, set(k) { L.intensity = base * k; g.material.opacity = glowOp * k; if (c) c.setAlpha(k); } };
}

// ---------------------------------------------------------------------------------------------------
// рисованная плита (GPT) как плоскость в 3D
// ---------------------------------------------------------------------------------------------------
// url — импорт картинки (dataurl). o: blur (px), crop [x, y, w, h] в пикселях картинки. Возвращает { mesh, ready() }
export function platePlane(parent, url, w, h, pos, o = {}) {
  const img = new Image(); img.src = url; img.style.display = 'none'; document.body.appendChild(img);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false, toneMapped: false, depthWrite: o.depthWrite ?? true, transparent: !!o.transparent });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.copy(pos); if (o.ry) m.rotation.y = o.ry; m.renderOrder = o.order ?? -5; parent.add(m);
  let ok = false;
  const ready = () => {
    if (ok) return true; if (!img.complete || !img.naturalWidth) return false;
    const [cx, cy, cw, ch] = o.crop || [0, 0, img.naturalWidth, img.naturalHeight];
    const c = document.createElement('canvas'); c.width = cw; c.height = ch; const x = c.getContext('2d');
    if (o.blur) { x.filter = `blur(${o.blur}px)`; x.drawImage(img, cx - o.blur * 3, cy - o.blur * 3, cw + o.blur * 6, ch + o.blur * 6, 0, 0, cw, ch); x.filter = 'none'; x.globalAlpha = 1; }
    x.filter = o.blur ? `blur(${o.blur}px)` : 'none'; x.drawImage(img, cx, cy, cw, ch, 0, 0, cw, ch); x.filter = 'none';
    if (o.tint) { x.globalCompositeOperation = 'multiply'; x.fillStyle = o.tint; x.fillRect(0, 0, cw, ch); x.globalCompositeOperation = 'source-over'; }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
    mat.map = t; mat.needsUpdate = true; return (ok = true);
  };
  ready();
  return { mesh: m, mat, img, ready };
}

// ---------------------------------------------------------------------------------------------------
// вид кадра и камера
// ---------------------------------------------------------------------------------------------------
export function noirLook(o = {}) {
  return {
    bg: 0x070b16, fogColor: 0x0d1a30, fogDensity: .05, exposure: 1,
    bloom: .55, bloomRadius: .55, bloomThreshold: .82, dof: false, vignette: 1, near: .02, far: 200,
    grade: { sat: .9, tint: [.94, .99, 1.07], lift: [.012, .018, .036], contrast: 1.05 },
    ...o,
  };
}
// плавная камера: Catmull-Rom по ключам [t, [x, y, z, tx, ty, tz, fov]] с мягким разгоном/торможением на концах
// ease(u) — своя кривая хода (по умолчанию smootherstep); 'glide' — почти ровный ход с мягкими концами
export const GLIDE = u => .3 * u * u * u * (u * (u * 6 - 15) + 10) + .7 * (u < .2 ? u * u / .4 : u > .8 ? .8 - (1 - u) * (1 - u) / .4 : u - .1) / .8;
export function camSpline(K, t, ease) {
  const t0 = K[0][0], t1 = K[K.length - 1][0], u = Math.min(1, Math.max(0, (t - t0) / (t1 - t0)));
  const e = ease ? ease(u) : u * u * u * (u * (u * 6 - 15) + 10);  // smootherstep: нет рывка на старте и в конце
  const tt = t0 + (t1 - t0) * e;
  let i = 0; while (i + 2 < K.length && tt >= K[i + 1][0]) i++;
  const a = K[i], b = K[i + 1], k = Math.min(1, Math.max(0, (tt - a[0]) / (b[0] - a[0]))), p0 = K[Math.max(0, i - 1)], p3 = K[Math.min(K.length - 1, i + 2)];
  const v = a[1].map((_, j) => { const v0 = p0[1][j], v1 = a[1][j], v2 = b[1][j], v3 = p3[1][j];
    return .5 * ((2 * v1) + (-v0 + v2) * k + (2 * v0 - 5 * v1 + 4 * v2 - v3) * k * k + (-v0 + 3 * v1 - 3 * v2 + v3) * k * k * k); });
  return { pos: v.slice(0, 3), target: v.slice(3, 6), fov: v[6], roll: v[7] || 0 };
}
// канвас-текстура с рисунком fn(ctx, w, h)
export const tex = (w, h, fn) => canvasTex(w, h, fn);
export { glowTex, softTex };

// ---------------------------------------------------------------------------------------------------
// 2D поверх кадра: точки 3D -> экран, мягкая контактная тень, «вибрация» (дуги звонка)
// ---------------------------------------------------------------------------------------------------
// дуги-вибрация вокруг точки (экранные пиксели): n дуг с одной стороны, side -1/1; k — сила 0..1
export function vibeMarks(ctx, x, y, side, k, { r = 34, n = 3, gap = 16, lw = 5, ink = '#0b0d17', fill = '#f3ead2', span = .9, rot = 0 } = {}) {
  if (k < .02) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const R = r + i * gap, a0 = side > 0 ? -span / 2 : Math.PI - span / 2, a1 = a0 + span, al = Math.min(1, k * 1.6 - i * .25);
    if (al <= 0) continue; ctx.globalAlpha = al;
    ctx.beginPath(); ctx.arc(0, 0, R, a0, a1); ctx.lineWidth = lw + 4; ctx.strokeStyle = ink; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, R, a0, a1); ctx.lineWidth = lw; ctx.strokeStyle = fill; ctx.stroke();
  }
  ctx.restore();
}
