// outdoor.js: конструктор экстерьеров (дополнение к kit.js). Вид эталона на улице: синее небо градиентом, тёплый песчаник
// крупными гладкими формами с резкими изломами, мелкая тёмная крапинка и тонкие линии по «блокам», сильное солнце
// с мягкими тенями, простые ёлки, светлые камни, лёгкая дымка с расстоянием.
//   skyDome(parent)                      — купол неба (градиент + ореол солнца), всегда вокруг камеры
//   sunRig(parent, stage)                — солнце с тенями + заполняющий свет неба; .fit(center, radius) — куда смотрит карта теней
//   terrainMaterial(o)                   — скала-песчаник (блоки, линии, крапинка, фаски) + песок/трава на пологих местах
//   gridGeo(nu, nv, f)                   — сетка по функции f(i, j) -> { p, loc, ao }
//   coniferGeo / scatter / rocks / bushGeo / banner — растительность, камни, знамя на древке
// Всё детерминировано (rng с зерном), время приходит снаружи (uniform u_time), часов нет.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { NOISE } from '../core/noise.js';
import { rng } from '../core/rng.js';
import { clamp } from '../core/ease.js';
import { canvasTex } from '../core/textures.js';
import { STONES } from './kit.js';

export const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const lin = hex => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
export const g3 = hex => `vec3(${lin(hex).map(v => v.toFixed(4)).join(',')})`;
const F = (x, d = 3) => Number(x).toFixed(d);

// палитра солнечного дня (sRGB; подобрана по кадрам эталона 335–470, 570–640, 1362–1386, 1645–1675)
export const DAY = {
  zenith: 0x4a6cab, mid: 0x5d86bb, horizon: 0x7eacd8, haze: 0xa4c0d8,
  sunDir: [.46, .72, .52], sunColor: 0xfff1dc, sunI: 3.1, skyFill: 0xc2d6ff, groundFill: 0xdcb48c, hemiI: 1.15,
  bounceDir: [-.55, .22, -.6], bounceColor: 0xffd6ac, bounceI: .55,           // отсвет от освещённой земли: поднимает теневые стороны скал
};

// =====================================================================================================
// небо и свет
// =====================================================================================================
export function skyDome(parent, { pal = DAY, radius = 900 } = {}) {
  const u = { zen: { value: new THREE.Color(pal.zenith) }, mid: { value: new THREE.Color(pal.mid) }, hor: { value: new THREE.Color(pal.horizon) }, haze: { value: new THREE.Color(pal.haze) },
    sunDir: { value: V(...pal.sunDir).normalize() }, sunCol: { value: new THREE.Color(pal.sunColor) } };
  const m = new THREE.Mesh(new THREE.SphereGeometry(radius, 40, 20), new THREE.ShaderMaterial({ uniforms: u, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vD; void main(){ vD = position; vec4 p = projectionMatrix*modelViewMatrix*vec4(position, 1.); gl_Position = p.xyww; }',
    fragmentShader: `uniform vec3 zen, mid, hor, haze, sunDir, sunCol; varying vec3 vD;
    void main(){ vec3 d = normalize(vD); float h = d.y, t = clamp(h, 0., 1.);
      vec3 c = mix(hor, mid, smoothstep(0., .30, t)); c = mix(c, zen, smoothstep(.22, .9, t));
      c = mix(c, haze, smoothstep(.09, -.015, h));
      float s = max(dot(d, sunDir), 0.);
      c += sunCol*(.07*pow(s, 6.) + .35*pow(s, 120.) + 5.*smoothstep(.99945, .9998, s));
      gl_FragColor = vec4(c, 1.); }` }));
  m.frustumCulled = false; m.renderOrder = -10; parent.add(m);
  m.follow = cam => { m.position.copy(cam.position); if (m.parent) m.parent.worldToLocal(m.position); };
  return m;
}

// солнце (тени) + небо (заполнение). fit(center, radius): карта теней накрывает квадрат 2R вокруг точки center (мир).
export function sunRig(parent, stage, { pal = DAY, mapSize = 4096, soft = .1 } = {}) {
  const dir = V(...pal.sunDir).normalize();
  const sun = stage.both(new THREE.DirectionalLight(pal.sunColor, pal.sunI)); parent.add(sun, sun.target);
  sun.castShadow = true; sun.shadow.mapSize.set(mapSize, mapSize);
  const hemi = stage.both(new THREE.HemisphereLight(pal.skyFill, pal.groundFill, pal.hemiI)); parent.add(hemi);
  const bounce = stage.both(new THREE.DirectionalLight(pal.bounceColor, pal.bounceI)); bounce.position.set(...pal.bounceDir).multiplyScalar(100); parent.add(bounce, bounce.target);
  const right = new THREE.Vector3().crossVectors(V(0, 1, 0), dir).normalize(), up = new THREE.Vector3().crossVectors(dir, right).normalize();
  const c = new THREE.Vector3(), o = new THREE.Vector3();
  function fit(center, radius) {
    const r = Math.max(4, radius), texel = 2 * r / mapSize, D = .8 * r + 110;
    // центр привязан к сетке текселей: при движении камеры тени не «плывут»
    const a = Math.round(center.dot(right) / texel) * texel, b = Math.round(center.dot(up) / texel) * texel, d = center.dot(dir);
    c.set(0, 0, 0).addScaledVector(right, a).addScaledVector(up, b).addScaledVector(dir, d);
    parent.getWorldPosition(o); c.sub(o);
    sun.target.position.copy(c); sun.position.copy(c).addScaledVector(dir, D);
    const sc = sun.shadow.camera; sc.left = -r; sc.right = r; sc.top = r; sc.bottom = -r; sc.near = 1; sc.far = 2 * D; sc.updateProjectionMatrix();
    sun.shadow.bias = -.035 / (sc.far - sc.near); sun.shadow.normalBias = Math.max(.012, texel * 1.6); sun.shadow.radius = clamp(soft / texel, 1.2, 5);
    sun.updateMatrixWorld(true); sun.target.updateMatrixWorld(true);
  }
  fit(V(0, 0, 0), 60);
  return { sun, hemi, bounce, dir, fit };
}

// =====================================================================================================
// материал местности: песчаник блоками + песок/трава
// =====================================================================================================
export const SANDSTONE = {
  rockD: 0xc4966a, rockL: 0xecc592, rockB: 0xd6a07e, band: .5,            // тёмный, светлый тон, цвет «полосатых» пластов и их доля
  rowH: 7, blockW0: 1.1, blockW1: 1.9,                                    // крупные блоки: высота пласта (м) и ширина в высотах
  sub: 3.3, subW0: 1.3, subW1: 2.2,                                       // мелкие блоки: во сколько раз ниже пласта, ширина в высотах
  jit: .3, warp: 1, drop: .2, dropRow: .12,                               // неровность стыков, кривизна линий, доля пропущенных линий
  line: .62, lineW: .075, subLine: .55, subLineW: .05, ao: .2, aoW: .55,   // линии: крупные видны издалека, мелкие — только вблизи
  tilt: .26, bevel: .6, bevelW: .5, subTilt: .12, subBevel: .4, subBevelW: .13, speck: .3, stain: .2,
  ground: 1, flat0: .78, flat1: .93,                                     // где склон пологий — песок/трава
  sandD: 0xbd9670, sandL: 0xe0be94, road: 0xe6cda4, grassD: 0x708738, grassL: 0x96a550, grass: 0,   // grass: общий сдвиг «травянистости»
  wet: 0, wetY: -1e4, rough: .95,
  roadFn: 'float roadMask(vec3 p){ return 0.; }',                         // GLSL: маска дороги в координатах декорации
};
export function terrainMaterial(o = {}) {
  const P = { ...SANDSTONE, ...o };
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: P.rough, metalness: 0, vertexColors: true });
  const uO = { value: new THREE.Vector3() };
  const glsl = `
uniform vec3 uO;
float speckL(vec2 p, float cell, float dens){ vec2 g = p/cell; vec2 i = floor(g), f = fract(g); float h = h21(i); if (h > dens) return 0.;
  vec2 c = vec2(.3) + .4*vec2(h21(i+3.1), h21(i+7.7)); vec2 d = f - c; float a = h21(i+13.3)*3.1416; d = mat2(cos(a),-sin(a),sin(a),cos(a))*d;
  d.x *= .34 + .4*h21(i+5.); float r = .12 + .2*h21(i+9.1); return smoothstep(r, r*.5, length(d)); }
float lineM(float d, float lw, float fw){ return (1. - smoothstep(lw*.5 - fw*.6, lw*.5 + fw*.6, d)) * clamp(lw/(fw*.9), 0., 1.); }
${P.roadFn}
// один уровень блоков: d = расстояния (м) до нижней, верхней, левой, правой границы; k = есть ли линия на границе; id блока
void blocks(vec2 uv, float H, float W0, float W1, float remap, out vec4 d, out vec4 k, out vec2 cid){
  float q = uv.y/H, q2 = q + remap*(.16*sin(q*2.3) + .07*sin(q*5.1 + 1.)), D = 1. + remap*(.368*cos(q*2.3) + .357*cos(q*5.1 + 1.));
  float row = floor(q2), fr = q2 - row, mq = H/D;
  float W = H*(W0 + W1*h21(vec2(row, 1.7)));
  float x = uv.x/W + 7.*h21(vec2(row, 9.3)), c = floor(x), f = x - c;
  float j0 = ${F(P.jit)}*(h21(vec2(row, c)) - .5), j1 = ${F(P.jit)}*(h21(vec2(row, c + 1.)) - .5);
  if (f < j0) { c -= 1.; f += 1.; j1 = j0; j0 = ${F(P.jit)}*(h21(vec2(row, c)) - .5); }
  else if (f > 1. + j1) { c += 1.; f -= 1.; j0 = j1; j1 = ${F(P.jit)}*(h21(vec2(row, c + 1.)) - .5); }
  float seg = floor(uv.x/(H*5.) + 3.*h21(vec2(row, 4.4)));
  d = vec4(fr*mq, (1. - fr)*mq, (f - j0)*W, (1. + j1 - f)*W);
  k = vec4(step(${F(P.dropRow)}, h21(vec2(row, seg) + 5.3)), step(${F(P.dropRow)}, h21(vec2(row + 1., seg) + 5.3)), step(${F(P.drop)}, h21(vec2(row, c) + 3.1)), step(${F(P.drop)}, h21(vec2(row, c + 1.) + 3.1)));
  cid = vec2(row, c);
}
float lines4(vec4 d, vec4 k, float lw, float fw){ return max(max(lineM(d.x, lw, fw)*k.x, lineM(d.y, lw, fw)*k.y), max(lineM(d.z, lw, fw)*k.z, lineM(d.w, lw, fw)*k.w)); }
vec3 bevel4(vec4 d, vec4 k, float bw, vec3 T){ vec4 e = k*(1. - smoothstep(vec4(0.), vec4(bw), d)); return vec3(0., e.y - e.x, 0.) + T*(e.w - e.z); }
vec3 rockC(vec3 loc, vec3 p, vec3 wn, float fw, out vec3 tilt){
  float u = loc.x, v = loc.y;
  vec2 wq = loc.xy + ${F(P.warp)}*(2.6*vec2(vn3(vec3(loc.xy*.09, 1.)) - .5, .35*(vn3(vec3(loc.xy*.09, 7.)) - .5)) + .5*vec2(vn3(vec3(loc.xy*.41, 3.)) - .5, vn3(vec3(loc.xy*.41, 5.)) - .5));
  vec4 d1, k1, d2, k2; vec2 c1, c2;
  blocks(vec2(wq.x, v), ${F(P.rowH)}, ${F(P.blockW0)}, ${F(P.blockW1)}, 0., d1, k1, c1);
  blocks(wq + 31.7, ${F(P.rowH / P.sub)}, ${F(P.subW0)}, ${F(P.subW1)}, 1., d2, k2, c2);
  k2 *= step(.3, h21(c1 + 41.));                                           // часть крупных блоков остаётся гладкой, без мелкой сетки
  float n = fbm3(vec3(u*.045, v*.07, 1.3)), n2 = fbm3(vec3(u*.33, v*.5, 4.));
  vec3 col = mix(${g3(P.rockD)}, ${g3(P.rockL)}, smoothstep(.3, .7, n));
  col = mix(col, ${g3(P.rockB)}, ${F(P.band)}*smoothstep(.45, .8, h21(vec2(c1.x, 3.3))));
  col *= .92 + .16*n2;
  col *= (.93 + .14*h21(c1 + 17.))*(.965 + .07*h21(c2 + 9.));
  col *= 1. - ${F(P.stain)}*smoothstep(.5, .78, fbm3(vec3(u*.3, v*.035, 5.)));
  float sp = max(speckL(loc.xy, .05, .5)*clamp(2. - fw/.02, 0., 1.), .8*speckL(loc.xy + 3.3, .2, .34)*clamp(2. - fw/.08, 0., 1.));
  col *= 1. - ${F(P.speck)}*sp;
  float near = clamp(1.5 - fw/${F(P.subLineW * 1.1)}, 0., 1.);                // мелкая сетка гаснет с расстоянием
  col *= 1. - ${F(P.line)}*lines4(d1, k1, ${F(P.lineW)}, fw);
  col *= 1. - ${F(P.subLine)}*near*lines4(d2, k2, ${F(P.subLineW)}, fw);
  vec4 dd = d1 + (1. - k1)*99.; float dmin = min(min(dd.x, dd.y), min(dd.z, dd.w));
  col *= 1. - ${F(P.ao)}*(1. - smoothstep(0., ${F(P.aoW)}, dmin));
  vec3 dpx = dFdx(p), dpy = dFdy(p), r1 = cross(dpy, wn), r2 = cross(wn, dpx); float det = dot(dpx, r1);
  vec3 gu = abs(det) > 1e-12 ? (r1*dFdx(u) + r2*dFdy(u))/det : vec3(0.); float gl = length(gu); vec3 T = gl > 1e-6 ? gu/gl : vec3(0.);
  tilt = (vec3(h21(c1 + 11.), h21(c1 + 23.), h21(c1 + 31.)) - .5)*${F(P.tilt)} + ${F(P.bevel)}*bevel4(d1, k1, ${F(P.bevelW)}, T)*clamp(1.6 - fw/${F(P.bevelW * .6)}, 0., 1.);
  tilt += near*((vec3(h21(c2 + 11.), h21(c2 + 23.), h21(c2 + 31.)) - .5)*${F(P.subTilt)} + ${F(P.subBevel)}*bevel4(d2, k2, ${F(P.subBevelW)}, T));
  return col;
}
vec3 groundC(vec3 p, float gb, float px){
  vec2 q = p.xz;
  float n = fbm3(vec3(q*.05, 1.)), n2 = fbm3(vec3(q*.7, 2.));
  vec3 c = mix(${g3(P.sandD)}, ${g3(P.sandL)}, smoothstep(.3, .7, n)); c *= .9 + .2*n2;
  c *= 1. - .16*smoothstep(.66, .8, vn3(vec3(q*61., 5.)))*clamp(2. - px/.018, 0., 1.);
  c *= 1. + .12*smoothstep(.72, .86, vn3(vec3(q*19. + 40., 8.)))*clamp(2. - px/.02, 0., 1.);
  c *= 1. - .06*smoothstep(.55, .8, vn3(vec3(q*4.3, 7.)))*clamp(2. - px/.12, 0., 1.);
  float rd = roadMask(p); c = mix(c, ${g3(P.road)}*(.94 + .12*n2), rd*.8);
  float g = smoothstep(.5, .6, fbm3(vec3(q*.03, 9.))*.8 + .35*fbm3(vec3(q*.21, 3.)) + (gb + ${F(P.grass)})*.5)*(1. - rd);
  vec3 gr = mix(${g3(P.grassD)}, ${g3(P.grassL)}, smoothstep(.3, .7, fbm3(vec3(q*.4, 4.)))); gr *= .88 + .24*vn3(vec3(q*6., 6.))*clamp(2. - px/.08, 0., 1.);
  return mix(c, gr, g);
}
vec3 terrainColor(vec3 loc, vec3 wp, vec3 wn, out vec3 tilt){
  vec3 p = wp - uO; float fw = max(fwidth(loc.x), fwidth(loc.y)), px = max(fwidth(p.x), fwidth(p.z));
  vec3 rc = rockC(loc, p, wn, fw, tilt);
  rc *= 1. - ${F(P.wet)}*(1. - smoothstep(${F(P.wetY, 1)}, ${F(P.wetY + 3, 1)}, p.y));
  float gk = ${F(P.ground)}*smoothstep(${F(P.flat0)}, ${F(P.flat1)}, wn.y + .06*(fbm3(vec3(p.xz*.5, 2.)) - .5));
  tilt *= 1. - gk;
  return mix(rc, groundC(p, loc.z, px), gk);
}`;
  m.onBeforeCompile = sh => {
    sh.uniforms.uO = uO;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 aLoc; varying vec3 vLoc; varying vec3 vWP; varying vec3 vWN;')
      .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nvWN = normalize(mat3(modelMatrix)*objectNormal);')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLoc = aLoc; vWP = (modelMatrix*vec4(transformed, 1.)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLoc; varying vec3 vWP; varying vec3 vWN;\n' + NOISE + glsl)
      .replace('#include <color_fragment>', '#include <color_fragment>\n vec3 tiltW; diffuseColor.rgb *= terrainColor(vLoc, vWP, normalize(vWN), tiltW);')
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n normal = normalize(normal + mat3(viewMatrix)*tiltW);');
  };
  m.customProgramCacheKey = () => 'terrain' + JSON.stringify(P);
  m.setOrigin = v => { uO.value.copy(v); return m; };
  return m;
}

// сетка nu x nv по функции f(i, j) -> { p: Vector3, loc: [u, v, g], ao }. flip меняет сторону (нормали считаются по обходу).
export function gridGeo(nu, nv, f, flip = false) {
  const pos = new Float32Array(nu * nv * 3), loc = new Float32Array(nu * nv * 3), col = new Float32Array(nu * nv * 3), idx = [];
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const k = (j * nu + i) * 3, s = f(i, j), a = s.ao ?? 1;
    pos[k] = s.p.x; pos[k + 1] = s.p.y; pos[k + 2] = s.p.z; loc[k] = s.loc[0]; loc[k + 1] = s.loc[1]; loc[k + 2] = s.loc[2] || 0; col[k] = col[k + 1] = col[k + 2] = a;
  }
  for (let j = 0; j < nv - 1; j++) for (let i = 0; i < nu - 1; i++) { const a = j * nu + i, b = a + 1, c = a + nu, d = c + 1; if (flip) idx.push(a, b, c, b, d, c); else idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aLoc', new THREE.BufferAttribute(loc, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(idx); g.computeVertexNormals(); return g;
}
// коробка из камня/кладки под terrainMaterial: aLoc = (вдоль грани, высота), цвет вершин = 1
export function blockGeo(w, h, d, { uOff = 0, vOff = 0 } = {}) {
  const g = new THREE.BoxGeometry(w, h, d).toNonIndexed(), p = g.attributes.position, n = g.attributes.normal, loc = new Float32Array(p.count * 3), col = new Float32Array(p.count * 3).fill(1);
  for (let i = 0; i < p.count; i++) {
    const nx = Math.abs(n.getX(i)), nz = Math.abs(n.getZ(i));
    loc[i * 3] = (nx > .5 ? p.getZ(i) : nz > .5 ? p.getX(i) : p.getX(i) + p.getZ(i)) + uOff; loc[i * 3 + 1] = (nx > .5 || nz > .5 ? p.getY(i) : p.getZ(i) * .5) + vOff;
  }
  g.setAttribute('aLoc', new THREE.BufferAttribute(loc, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); return g;
}

// =====================================================================================================
// растительность и камни
// =====================================================================================================
const paint = (g, fn) => { const p = g.attributes.position, c = new Float32Array(p.count * 3); for (let i = 0; i < p.count; i++) { const v = fn(p.getX(i), p.getY(i), p.getZ(i)); c[i * 3] = v[0]; c[i * 3 + 1] = v[1]; c[i * 3 + 2] = v[2]; } g.setAttribute('color', new THREE.BufferAttribute(c, 3)); return g; };
const mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
// ёлка высотой 1 (масштабируется экземпляром): ствол + ярусы конусов с зубчатым краем; тёмная у ствола, светлее к кончикам
export function coniferGeo(seed = 1, tiers = 6, { dark = 0x2a443f, light = 0x6f9080, trunk = 0x4a3524 } = {}) {
  const r = rng(seed * 13 + 5), parts = [], dk = lin(dark), lt = lin(light), tk = lin(trunk);
  const t = new THREE.CylinderGeometry(.014, .028, .26, 6); t.translate(0, .13, 0); parts.push(paint(t, () => tk));
  for (let i = 0; i < tiers; i++) {
    const k = i / (tiers - 1), y0 = .13 + k * .6, rad = .225 * (1 - k * .8) * (.9 + .2 * r()), h = .3 * (1 - k * .3);
    const c = new THREE.ConeGeometry(rad, h, 10, 2, true), p = c.attributes.position;
    for (let v = 0; v < p.count; v++) { const y = p.getY(v); if (y < -h / 2 + 1e-4) { const a = Math.atan2(p.getZ(v), p.getX(v)), j = Math.round(a / 6.2832 * 10) % 2 ? 1 : 0; p.setXYZ(v, p.getX(v) * (j ? 1.12 : .86), y - (j ? .035 : -.01) * (1 - k * .4), p.getZ(v) * (j ? 1.12 : .86)); } }
    c.computeVertexNormals(); c.rotateY(r() * 6.28); c.translate((r() - .5) * .012, y0 + h / 2, (r() - .5) * .012);
    parts.push(paint(c, (x, y) => mix3(lt, dk, clamp((y - y0) / h * 1.25))));
  }
  return mergeGeometries(parts.map(g => { g.deleteAttribute('uv'); return g; }));
}
export const foliageMat = (o = {}) => new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 1, side: THREE.DoubleSide, ...o });
// куст: слипшиеся шары
export function bushGeo(seed = 1, n = 6) {
  const r = rng(seed * 7 + 2), parts = [];
  for (let i = 0; i < n; i++) { const s = new THREE.IcosahedronGeometry(.3 + r() * .25, 2), a = r() * 6.28, d = r() * .45; s.scale(1, .8, 1); s.translate(Math.cos(a) * d, .22 + r() * .2, Math.sin(a) * d); s.deleteAttribute('uv'); parts.push(s); }
  return mergeGeometries(parts);
}
// экземпляры: list = [{ p: Vector3 | [x,y,z], s: число | [sx,sy,sz], ry, rx, rz, c: hex | [r,g,b] }]
export function scatter(parent, geo, mat, list, { cast = true, receive = false } = {}) {
  const im = new THREE.InstancedMesh(geo, mat, list.length), d = new THREE.Object3D(), col = new THREE.Color();
  list.forEach((it, i) => {
    const p = it.p; d.position.set(p.x ?? p[0], p.y ?? p[1], p.z ?? p[2]); d.rotation.set(it.rx || 0, it.ry || 0, it.rz || 0);
    if (Array.isArray(it.s)) d.scale.set(...it.s); else d.scale.setScalar(it.s ?? 1);
    d.updateMatrix(); im.setMatrixAt(i, d.matrix);
    if (it.c != null) im.setColorAt(i, Array.isArray(it.c) ? col.setRGB(...it.c) : col.set(it.c));
  });
  im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
  im.castShadow = cast; im.receiveShadow = receive; im.frustumCulled = false; parent.add(im); return im;
}
// россыпь светлых гранёных камней (четыре формы из kit.STONES): list как у scatter, форма = i % 4
export const paleRock = () => new THREE.MeshStandardMaterial({ color: 0xe6d9c8, roughness: .95, flatShading: true });
export function rocks(parent, list, mat = paleRock()) {
  return [0, 1, 2, 3].map(k => scatter(parent, STONES[k], mat, list.filter((_, i) => i % 4 === k), { receive: true }));
}

// знамя на древке: полотнище колышется в вершинном шейдере от общего uniform времени time = { value: t }
let _flagTex;
const flagTex = () => _flagTex || (_flagTex = canvasTex(128, 96, (x) => { x.fillStyle = '#fff'; x.fillRect(0, 0, 128, 96); x.strokeStyle = '#f2d27a'; x.lineWidth = 7; x.strokeRect(8, 8, 112, 80); x.fillStyle = '#f2d27a'; x.beginPath(); x.arc(64, 48, 15, 0, 6.3); x.fill(); }));
export function clothMaterial(time, { color = 0xc2262b, w = 1.5, speed = 5.5, seed = 0, amp = 1, map = flagTex() } = {}) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: .85, side: THREE.DoubleSide, map });
  m.onBeforeCompile = sh => {
    sh.uniforms.u_time = time;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float u_time; varying float vFold;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
      float kk = clamp(transformed.x/${F(w)}, 0., 1.), ph = u_time*${F(speed)} - kk*6.5 + ${F(seed)};
      transformed.z += ${F(amp)}*kk*(.17*sin(ph) + .06*sin(ph*2.3 + 1.)); transformed.y += ${F(amp)}*(kk*.05*sin(ph*1.3) - kk*kk*.1); vFold = kk*sin(ph + .9);`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vFold;')
      .replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= 1. + .3*vFold;');
  };
  m.customProgramCacheKey = () => 'cloth' + [w, speed, seed, amp].join();
  return m;
}
export function banner(parent, time, { pos, h = 4.4, w = 1.5, ch = 1.05, color = 0xc2262b, ry = 0, seed = 0, poleMat } = {}) {
  const g = new THREE.Group(); g.position.copy(pos); g.rotation.y = ry; parent.add(g);
  poleMat = poleMat || new THREE.MeshStandardMaterial({ color: 0x5a3d24, roughness: .8 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.028, .036, h, 8), poleMat); pole.position.y = h / 2; pole.castShadow = true; g.add(pole);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(.05, .2, 8), new THREE.MeshStandardMaterial({ color: 0xd9b64c, roughness: .35, metalness: .8 })); tip.position.y = h + .1; g.add(tip);
  const geo = new THREE.PlaneGeometry(w, ch, 16, 6); geo.translate(w / 2, 0, 0);
  const cloth = new THREE.Mesh(geo, clothMaterial(time, { color, w, seed })); cloth.position.set(.03, h - ch / 2 - .08, 0); cloth.castShadow = true; g.add(cloth);
  return { group: g, cloth, pole };
}
