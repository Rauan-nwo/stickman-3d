// kit.js: процедурный конструктор декораций. Мир эталона собран из простых фигур с процедурными материалами
// (см. wiki/craft/style-bible.md): гладкие крупные формы, мелкая тёмная крапинка, тонкие линии по рёбрам «плит».
// Все строители детерминированы (rng с зерном) и ничего не знают о конкретном ролике.
import * as THREE from 'three';
import { NOISE } from '../core/noise.js';
import { rng, vn3, fbm3 } from '../core/rng.js';
import { clamp, lerp, smooth } from '../core/ease.js';
import { canvasTex, glowTex, softTex } from '../core/textures.js';
import { lightCone } from '../vfx/lightCone.js';
import { sparkles } from '../vfx/sparks.js';
import { points, sprite } from '../core/particles.js';

export const V = (x, y, z) => new THREE.Vector3(x, y, z);

// =====================================================================================================
// материалы
// =====================================================================================================
// procColor(p) умножает альбедо; p — мировая позиция, либо позиция в координатах объекта (local = true).
// ВАЖНО: ключ кэша программ обязателен — иначе three.js отдаст материалу чужой шейдер.
export function procMaterial(params, glsl, local = false) {
  const m = new THREE.MeshStandardMaterial(params);
  m.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vPP;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPP = ' + (local ? 'transformed' : '(modelMatrix * vec4(transformed, 1.0)).xyz') + ';');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vPP;\n' + NOISE + glsl)
      .replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= procColor(vPP);');
  };
  m.customProgramCacheKey = () => glsl + local;
  return m;
}
// дерево: stretch — 'vec3(sx,sy,sz)', малое число = волокна вдоль этой оси; a/b — тёмный и светлый тон 'r,g,b'
export const wood = (stretch, a = '.33,.19,.09', b = '.62,.40,.20', k = 1.) => `
vec3 procColor(vec3 p){ float g = fbm3(p*${stretch}); float rings = smoothstep(.35,.65, fract(g*7.)); vec3 c = mix(vec3(${a}), vec3(${b}), g); c *= .82 + .26*rings; return c*${k.toFixed(2)}; }`;
export const dirt = (a, b, sc = 2.) => `
vec3 procColor(vec3 p){ p *= ${sc.toFixed(2)}; float n = fbm3(p*.9); vec3 c = mix(vec3(${a}), vec3(${b}), smoothstep(.25,.75,n)); c *= .85 + .3*fbm3(p*3.1);
  c *= 1. - .25*smoothstep(.72,.8, vn3(p*37.)); return c; }`;
export const ENGRAVE = `
vec3 procColor(vec3 p){ float a = vn3(p*1100.), b = vn3(p*520.+3.), c = vn3(p*210.+9.);
  return vec3(.50,.50,.56) * (1. + .75*smoothstep(.70,.80,a)) * (1. - .38*smoothstep(.66,.76,b)) * (.86 + .28*c); }`;
export const woodMat = (stretch, a, b, rough = .85, k = 1.) => procMaterial({ color: 0xffffff, roughness: rough }, wood(stretch, a, b, k));

// камень: гладкие крупные формы + мелкая тёмная крапинка + тонкие тёмные линии по краям плит (см. panelSheet)
// o: dark, light ('r,g,b'), speck, cell, line, lineW, ao, aoW, blotch, smudge, smudgeF, strata, footDark, footH, rough
export function rockMaterial(o) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: o.rough ?? .96, metalness: 0, vertexColors: true });
  const glsl = `
float speckL(vec2 p, float cell, float dens){ vec2 g = p/cell; vec2 i = floor(g), f = fract(g); float h = h21(i); if (h > dens) return 0.;
  vec2 c = vec2(.3) + .4*vec2(h21(i+3.1), h21(i+7.7)); vec2 d = f - c; float a = h21(i+13.3)*3.1416; d = mat2(cos(a),-sin(a),sin(a),cos(a))*d;
  d.x *= .34 + .4*h21(i+5.); float r = .12 + .2*h21(i+9.1); return smoothstep(r, r*.5, length(d)); }
vec3 rockColor(vec3 loc, vec4 pan, vec4 edge){
  vec2 p = loc.xy;
  float n = fbm3(vec3(p*${(o.blotch ?? .8).toFixed(2)}, loc.z*3.)), n2 = fbm3(vec3(p*2.9, 4.));
  vec3 c = mix(vec3(${o.dark}), vec3(${o.light}), smoothstep(.28,.72,n));
  c *= .84 + .32*n2;
  c *= 1. - ${(o.smudge ?? 0).toFixed(2)}*smoothstep(.46,.76, fbm3(vec3(p*${(o.smudgeF ?? .6).toFixed(2)}, loc.z*5. + 11.)));
  c *= 1. - ${(o.strata ?? 0).toFixed(2)}*smoothstep(.48,.72, fbm3(vec3(p.x*.7, p.y*5.5, 3.)));
  c *= 1. - ${(o.footDark ?? 0).toFixed(2)}*(1. - smoothstep(.0, ${(o.footH ?? .9).toFixed(2)}, p.y + .25*(n2 - .5)));
  float sp = max(speckL(p, ${(o.cell ?? .016).toFixed(4)}, .52), .75*speckL(p + 3.3, ${((o.cell ?? .016) * .55).toFixed(4)}, .36));
  c *= 1. - ${(o.speck ?? .45).toFixed(2)}*sp;
  vec4 d = vec4(pan.x*pan.z, (1.-pan.x)*pan.z, pan.y*pan.w, (1.-pan.y)*pan.w);
  vec4 fw = fwidth(d);
  float lw = ${(o.lineW ?? .004).toFixed(4)};
  vec4 l = (1. - smoothstep(vec4(lw*.35), vec4(lw) + fw*1.2, d)) * edge;
  c *= 1. - ${(o.line ?? .75).toFixed(2)}*max(max(l.x,l.y), max(l.z,l.w));
  vec4 ao = (1. - smoothstep(vec4(0.), vec4(${(o.aoW ?? .14).toFixed(3)}), d)) * (.35 + .65*edge);
  c *= 1. - ${(o.ao ?? .2).toFixed(2)}*max(max(ao.x,ao.y), max(ao.z,ao.w));
  return c;
}`;
  m.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 aPanel; attribute vec4 aEdge; attribute vec3 aLoc; varying vec4 vPanel; varying vec4 vEdge; varying vec3 vLoc;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPanel = aPanel; vEdge = aEdge; vLoc = aLoc;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec4 vPanel; varying vec4 vEdge; varying vec3 vLoc;\n' + NOISE + glsl)
      .replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= rockColor(vLoc, vPanel, vEdge);');
  };
  m.customProgramCacheKey = () => 'rock' + JSON.stringify(o);
  return m;
}
// готовые палитры камня
export const ROCK = {
  darkShaft: { dark: '.25,.14,.09', light: '.55,.32,.19', speck: .22, cell: .03, line: .9, lineW: .014, ao: .34, aoW: .24, blotch: .5, smudge: .4, smudgeF: .5, strata: .42 },
  warmGallery: { dark: '.34,.20,.14', light: '.78,.52,.35', speck: .5, cell: .0125, line: .75, lineW: .0035, ao: .28, aoW: .12, blotch: .7, smudge: .5, smudgeF: .7, footDark: .5, footH: .8 },
  paleRoof: { dark: '.52,.44,.42', light: '.80,.71,.68', speck: .3, cell: .02, line: .6, lineW: .006, ao: .25, aoW: .2, blotch: .6 },
};

// =====================================================================================================
// геометрия
// =====================================================================================================
// Лист «подушек»-плит на параметрической поверхности: углы общие (C0), внутри плиты нормали гладкие, между плитами — излом;
// у каждой плиты флаги рёбер для тёмных линий. us/vs — границы плит в метрах вдоль параметров поверхности.
// o: us, vs, surf(u,v)->Vector3, toward (точка, в сторону которой смотрит лицевая сторона), mat, seed, jit, relief, bulge,
//    sub (разбиение плиты), edgeP (доля рёбер с линией), skip(u,v) (дырки), disp(u,v) (крупный рельеф), aoK
export function panelSheet(o) {
  const { us, vs, surf, toward, mat, seed = 1, jit = .14, relief = 0, bulge = .03, sub = 6, edgeP = 1, skip, disp, aoK = 0 } = o;
  const r = rng(seed * 977 + 3), nu = us.length - 1, nv = vs.length - 1;
  const N = (u, v) => { const e = .02, a = surf(u + e, v).sub(surf(u - e, v)), b = surf(u, v + e).sub(surf(u, v - e)); const n = a.cross(b).normalize(); if (n.dot(toward.clone().sub(surf(u, v))) < 0) n.negate(); return n; };
  const cu = [], cv = [], cr = [];
  for (let j = 0; j <= nv; j++) { cu[j] = []; cv[j] = []; cr[j] = [];
    for (let i = 0; i <= nu; i++) {
      const du = i > 0 && i < nu ? Math.min(us[i] - us[i - 1], us[i + 1] - us[i]) : 0, dv = j > 0 && j < nv ? Math.min(vs[j] - vs[j - 1], vs[j + 1] - vs[j]) : 0;
      cu[j][i] = us[i] + (r() - .5) * 2 * jit * du; cv[j][i] = vs[j] + (r() - .5) * 2 * jit * dv; cr[j][i] = (r() - .5) * 2 * relief;
    } }
  const eV = [], eH = [];
  for (let j = 0; j < nv; j++) { eV[j] = []; for (let i = 0; i <= nu; i++) eV[j][i] = r() < edgeP ? .6 + .4 * r() : 0; }
  for (let j = 0; j <= nv; j++) { eH[j] = []; for (let i = 0; i < nu; i++) eH[j][i] = r() < edgeP ? .6 + .4 * r() : 0; }
  const pos = [], pan = [], edg = [], loc = [], col = [], idx = [];
  const D = (u, v) => disp ? disp(u, v) : 0;
  let base = 0;
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const pr = r(), pb = bulge * (.3 + 1.2 * r()) * (r() < .2 ? -.6 : 1), tint = .92 + .16 * r();
    if (skip && skip((us[i] + us[i + 1]) / 2, (vs[j] + vs[j + 1]) / 2)) continue;
    const w = us[i + 1] - us[i], h = vs[j + 1] - vs[j], e = [eV[j][i], eV[j][i + 1], eH[j][i], eH[j + 1][i]];
    for (let b = 0; b <= sub; b++) for (let a = 0; a <= sub; a++) {
      const s = a / sub, t = b / sub;
      const u = lerp(lerp(cu[j][i], cu[j][i + 1], s), lerp(cu[j + 1][i], cu[j + 1][i + 1], s), t);
      const v = lerp(lerp(cv[j][i], cv[j][i + 1], s), lerp(cv[j + 1][i], cv[j + 1][i + 1], s), t);
      const rl = lerp(lerp(cr[j][i], cr[j][i + 1], s), lerp(cr[j + 1][i], cr[j + 1][i + 1], s), t);
      const win = Math.pow(4 * s * (1 - s), .6) * Math.pow(4 * t * (1 - t), .6);
      const p = surf(u, v).addScaledVector(N(u, v), rl + pb * win + D(u, v));
      pos.push(p.x, p.y, p.z); pan.push(s, t, w, h); edg.push(...e); loc.push(u, v, pr);
      let ao = 1; if (aoK) { const q = .3; ao = clamp(1 + aoK * (D(u, v) - (D(u + q, v) + D(u - q, v) + D(u, v + q) + D(u, v - q)) / 4), .45, 1.2); }
      col.push(ao * tint, ao * tint, ao * tint);
    }
    for (let b = 0; b < sub; b++) for (let a = 0; a < sub; a++) { const k = base + b * (sub + 1) + a; idx.push(k, k + 1, k + sub + 2, k, k + sub + 2, k + sub + 1); }
    base += (sub + 1) ** 2;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aPanel', new THREE.Float32BufferAttribute(pan, 4));
  g.setAttribute('aEdge', new THREE.Float32BufferAttribute(edg, 4)); g.setAttribute('aLoc', new THREE.Float32BufferAttribute(loc, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
  const n0 = new THREE.Vector3().fromBufferAttribute(g.attributes.normal, Math.floor(pos.length / 6)), q = Math.floor(pos.length / 6) * 3;
  if (n0.dot(N(loc[q], loc[q + 1])) < 0) { for (let k = 0; k < idx.length; k += 3) { const t = idx[k + 1]; idx[k + 1] = idx[k + 2]; idx[k + 2] = t; } g.setIndex(idx); g.computeVertexNormals(); }
  const m = new THREE.Mesh(g, mat); m.receiveShadow = true; return m;
}
// границы плит: от a до b с шагом ~step, со случайной неровностью (чтобы сетка не читалась как кафель)
export function panelEdges(a, b, step, seed = 1, wobble = .18) {
  const n = Math.max(1, Math.round((b - a) / step)), r = rng(seed * 131 + 7), out = [a];
  for (let i = 1; i < n; i++) out.push(a + (b - a) * (i + (r() - .5) * 2 * wobble) / n);
  out.push(b); return out;
}
// стена из плит вдоль отрезка a -> b на полу (Vector3, y игнорируется), высота h.
// inside — точка внутри помещения (куда смотрит стена). lean — завал верха внутрь (м), bow — прогиб в плане (м).
export function rockWall(parent, { a, b, h = 3.3, inside, mat, panel = 1.2, row = .9, seed = 1, lean = 0, bow = 0, rough = .09, sub = 8, edgeP = .8, jit = .12, aoK = 2.4, skip }) {
  const A = V(a.x, 0, a.z), B = V(b.x, 0, b.z), L = A.distanceTo(B), U = B.clone().sub(A).multiplyScalar(1 / L);
  let Nn = V(-U.z, 0, U.x); if (Nn.dot(inside.clone().sub(A)) < 0) Nn.negate();
  const surf = (u, v) => A.clone().addScaledVector(U, u).addScaledVector(Nn, bow * Math.sin(Math.PI * clamp(u / L)) + lean * Math.pow(Math.max(0, v) / h, 2.2)).add(V(0, v, 0));
  const disp = (u, v) => rough * (fbm3(u * .5 + seed, v * .7, seed * 1.3, 3) - .5) * 2;
  const m = panelSheet({ us: panelEdges(0, L, panel, seed), vs: panelEdges(0, h, row, seed + 5, .08), seed, mat, toward: inside, relief: .04, bulge: .02, sub, edgeP, jit, aoK, surf, disp, skip });
  parent.add(m); return { mesh: m, surf, U, N: Nn, A, L, h };
}
// тоннель вдоль оси z: две стены, свод и пол. x0 — центр, width/height — просвет. Возвращает части и материал пола.
export function rockTunnel(parent, { z0 = -10, z1 = 4, x0 = 0, width = 4.4, height = 3.4, mat, roofMat, floorGlsl, seed = 1, lean = .9, panel = 1.25 }) {
  const inside = V(x0, height * .45, (z0 + z1) / 2), hw = width / 2, parts = {};
  parts.left = rockWall(parent, { a: V(x0 - hw, 0, z0), b: V(x0 - hw, 0, z1), h: height, inside, mat, seed: seed + 1, lean, panel });
  parts.right = rockWall(parent, { a: V(x0 + hw, 0, z1), b: V(x0 + hw, 0, z0), h: height, inside, mat, seed: seed + 2, lean, panel });
  parts.back = rockWall(parent, { a: V(x0 - hw - .3, 0, z0), b: V(x0 + hw + .3, 0, z0), h: height, inside, mat, seed: seed + 3, lean: lean * .6, panel });
  const roof = panelSheet({ us: panelEdges(x0 - hw - .2, x0 + hw + .2, panel, seed + 4), vs: panelEdges(z0 - .2, z1, panel * 1.15, seed + 6), seed: seed + 4, mat: roofMat || mat, toward: inside, relief: .06, bulge: .04, sub: 8, edgeP: .6, jit: .16,
    surf: (u, v) => V(u, height - .1 - .5 * lean * Math.pow((u - x0) / hw, 2), v), disp: (u, v) => .25 * (fbm3(u * .42 + seed, v * .5, seed * 1.7, 3) - .5) });
  parent.add(roof); parts.roof = roof;
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(width + 6, z1 - z0 + 8), procMaterial({ color: 0xffffff, roughness: 1 }, floorGlsl || dirt('.27,.185,.13', '.50,.37,.27', 1.6)));
  fl.rotation.x = -Math.PI / 2; fl.position.set(x0, 0, (z0 + z1) / 2); fl.receiveShadow = true; parent.add(fl); parts.floor = fl;
  return parts;
}

export { points, sprite };
export const box = (parent, w, h, d, mat, x, y, z, ry = 0, rz = 0, rx = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = m.receiveShadow = true; parent.add(m); return m; };
export const cyl = (parent, r0, r1, h, mat, x, y, z, seg = 14) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, seg), mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m; };

// ---------- камни ----------
export function stoneGeo(seed) {
  const g = new THREE.DodecahedronGeometry(1, 1), p = g.attributes.position, v = new THREE.Vector3(), r = rng(seed);
  const ax = [0, 0, 0, 0, 0, 0].map(() => .75 + r() * .5);
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const k = .78 + .4 * vn3(v.x * 1.7 + seed, v.y * 1.7, v.z * 1.7); p.setXYZ(i, v.x * k * ax[0], v.y * k * .72, v.z * k * ax[2]); }
  g.computeVertexNormals(); return g;
}
export const STONES = [stoneGeo(1), stoneGeo(2), stoneGeo(3), stoneGeo(4)];
export const paleStone = new THREE.MeshStandardMaterial({ color: 0xcfc6ba, roughness: .95, flatShading: true });
export const darkStone = () => new THREE.MeshStandardMaterial({ color: 0x8a7663, roughness: 1, flatShading: true });
export const stone = (parent, x, y, z, s, seed, mat = paleStone) => { const m = new THREE.Mesh(STONES[seed % 4], mat); m.position.set(x, y, z); m.scale.setScalar(s); m.rotation.set(seed * 1.3, seed * 2.1, seed * .7); m.castShadow = m.receiveShadow = true; parent.add(m); return m; };
// россыпь камней: place(r, i) -> [x, y, z, size] | null
export function stones(parent, { n = 20, seed = 1, r = rng(seed), place, mat, seedOffset = 0 }) {
  const out = [];
  for (let i = 0; i < n; i++) { const p = place(r, i); if (p) out.push(stone(parent, p[0], p[1], p[2], p[3], i + seedOffset, typeof mat === 'function' ? mat(r, i) : mat)); }
  return out;
}

// =====================================================================================================
// готовые предметы
// =====================================================================================================
// рама крепи: две круглые стойки + круглая перекладина (+ пара камешков сверху)
export function timberFrame(parent, { x = 0, z = 0, half = .8, top = 2.6, r = .12, postMat, capMat, pebbles = true }) {
  const posts = [-1, 1].map(sx => cyl(parent, r, r * 1.08, top, postMat, x + sx * half, top / 2, z));
  const cap = cyl(parent, r * 1.05, r * 1.05, half * 2 + .55, capMat, x, top + r * .7, z); cap.rotation.z = Math.PI / 2;
  if (pebbles) { stone(parent, x - half * .5, top + r * 1.9, z, .06, 1); stone(parent, x + half * .6, top + r * 1.9, z, .05, 2); }
  return { posts, cap };
}
// рельсы и шпалы вдоль кривой. pts — точки Vector3 (CatmullRom, centripetal); half — половина колеи
export function rails(parent, { pts, envTex, segs = 150, half = .345, steel, sleeper = {}, seed = 3 }) {
  const path = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const LEN = path.getLength(), NSEG = segs, d = new THREE.Object3D();
  steel = steel || new THREE.MeshStandardMaterial({ color: 0x8a90a0, roughness: .3, metalness: .95, envMap: envTex, envMapIntensity: .3 });
  const steelDk = new THREE.MeshStandardMaterial({ color: 0x23232a, roughness: .6, metalness: .6 });
  const parts = [[.078, .05, .262, steel], [.03, .075, .2, steelDk], [.12, .022, .161, steelDk]].map(([w, h, y, mt]) => { const im = new THREE.InstancedMesh(new THREE.BoxGeometry(w, h, LEN / NSEG * 1.12), mt, NSEG * 2); im.castShadow = im.receiveShadow = true; parent.add(im); return [im, y]; });
  for (let i = 0; i < NSEG; i++) {
    const u = (i + .5) / NSEG, p = path.getPointAt(u), tg = path.getTangentAt(u), nx = V(tg.z, 0, -tg.x);
    for (const sx of [-1, 1]) for (const [im, y] of parts) { d.position.copy(p).addScaledVector(nx, sx * half); d.position.y = y; d.rotation.set(0, Math.atan2(tg.x, tg.z), 0); d.updateMatrix(); im.setMatrixAt(i * 2 + (sx > 0 ? 1 : 0), d.matrix); }
  }
  const { step = .95, first = .52, size = [1.27, .15, .3], mat = procMaterial({ color: 0xffffff, roughness: .95 }, wood('vec3(.6,6.,6.)', '.03,.022,.02', '.075,.058,.052')) } = sleeper;
  const NS = Math.floor(LEN / step), sl = new THREE.InstancedMesh(new THREE.BoxGeometry(...size), mat, NS), r = rng(seed);
  for (let i = 0; i < NS; i++) { const u = clamp((first + i * step) / LEN, 0, 1); const p = path.getPointAt(u), tg = path.getTangentAt(u);
    d.position.set(p.x, size[1] / 2, p.z); d.rotation.set(0, Math.atan2(tg.x, tg.z) + (r() - .5) * .04, 0); d.updateMatrix(); sl.setMatrixAt(i, d.matrix); }
  sl.castShadow = sl.receiveShadow = true; parent.add(sl);
  return { path, steel, rails: parts.map(p => p[0]), sleepers: sl, top: size[1] };
}
// висячая лампа: абажур + яркий диск + шнур; по желанию — прожектор с мягкими тенями, видимый конус и искорки в нём.
// Конус рисуется обычным альфа-смешением и по построению лежит ПОЗАДИ персонажей (они рисуются слоем выше).
export function hangingLamp(parent, { pos, envTex, r = .2, cord = 1.4, spot = {}, cone = {}, sparks = {}, both = l => l }) {
  const shadeM = new THREE.MeshStandardMaterial({ color: 0x4a4038, roughness: .35, metalness: .85, envMap: envTex, envMapIntensity: 1.0, side: THREE.DoubleSide });
  const shade = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), shadeM); shade.scale.y = .78; shade.position.copy(pos); parent.add(shade);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r, .012, 8, 40), shadeM); rim.rotation.x = Math.PI / 2; rim.position.copy(pos); parent.add(rim);
  const bulb = new THREE.Mesh(new THREE.CircleGeometry(r * .925, 36), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.12, 1.1, 1.08) })); bulb.rotation.x = Math.PI / 2; bulb.position.copy(pos).add(V(0, -.004, 0)); parent.add(bulb);
  cyl(parent, .008, .008, cord, shadeM, pos.x, pos.y + cord / 2 + .15, pos.z, 6);
  const out = { pos, shade, rim, bulb };
  if (spot) {
    const { color = 0xffe9cc, intensity = 19, distance = 9, angle = .325, penumbra = .1, decay = 1.7, floorY = 0, shadow = true } = spot;
    const s = both(new THREE.SpotLight(color, intensity, distance, angle, penumbra, decay)); s.position.copy(pos).add(V(0, -.05, 0)); s.target.position.set(pos.x, floorY, pos.z); parent.add(s, s.target);
    if (shadow) { s.castShadow = true; s.shadow.mapSize.set(2048, 2048); s.shadow.camera.near = .5; s.shadow.camera.far = 6; s.shadow.bias = -.0006; s.shadow.radius = 5; }
    out.spot = s;
  }
  out.addCone = () => { if (cone) { out.cone = lightCone(parent, { top: pos, r0: .07, r1: .63, ...cone }); out.coneMat = out.cone.material; } return out; };
  out.addSparks = () => { if (sparks) out.sparks = sparkles(parent, { top: pos, coneR: (cone && cone.r1) || .63, ...sparks }); return out; };
  return out;
}
// фонарь «летучая мышь»: красный корпус, светящееся стекло, подвес (проволока или крюк), тёплый точечный свет
export function lantern(parent, { pos, body = { color: 0xb3221b, roughness: .4, metalness: .3 }, top = [.04, .07, .06, .1], bottom = [.075, .075, .04, -.1],
  glass = [.055, .15, 14], glow = [2.2, 1.6, .9], hang = { type: 'hook' }, light = { color: 0xffc68e, intensity: 2.4, distance: 5, decay: 1.7, pos: null } }) {
  const lant = new THREE.Group(); lant.position.copy(pos); parent.add(lant);
  const red = new THREE.MeshStandardMaterial(body);
  const blk = hang.type === 'hook' ? new THREE.MeshStandardMaterial({ color: 0x15110f, roughness: .6 }) : null;
  cyl(lant, top[0], top[1], top[2], red, 0, top[3], 0); cyl(lant, bottom[0], bottom[1], bottom[2], red, 0, bottom[3], 0);
  const gl = new THREE.Mesh(new THREE.CylinderGeometry(glass[0], glass[0], glass[1], glass[2]), new THREE.MeshBasicMaterial({ color: new THREE.Color(...glow) })); lant.add(gl);
  if (hang.type === 'wire') cyl(lant, .006, .006, hang.len ?? .5, new THREE.MeshStandardMaterial({ color: 0x111111 }), 0, hang.y ?? .4, 0);
  else { box(lant, .3, .014, .014, blk, -.1, .28, 0, 0, .5); box(lant, .014, .16, .014, blk, 0, .2, 0); }
  let L = null;
  if (light) { L = new THREE.PointLight(light.color, light.intensity, light.distance, light.decay); L.position.copy(light.pos || pos.clone().add(V(.2, 0, .2))); parent.add(L); }
  return { group: lant, glass: gl, light: L };
}
// свеча на кованом кронштейне. pos — точка на стене, normal — от стены в комнату, along — вдоль стены.
// Свет: широкое тёплое пятно + маленькое яркое ядро у пламени (отдельный теневой свет даёт пересвет — не делаем).
let _flameTex;
const flameTex = () => _flameTex || (_flameTex = canvasTex(64, 128, (x) => {
  const g = x.createRadialGradient(32, 86, 2, 32, 84, 42); g.addColorStop(0, 'rgba(255,255,240,1)'); g.addColorStop(.5, 'rgba(255,222,130,.97)'); g.addColorStop(1, 'rgba(255,150,40,0)');
  x.fillStyle = g; x.beginPath(); x.moveTo(32, 2); x.bezierCurveTo(46, 50, 56, 84, 32, 122); x.bezierCurveTo(8, 84, 18, 50, 32, 2); x.fill();
}));
export function candleSconce(parent, { pos, normal, along, pool = { color: 0xffdca4, intensity: 2.2, distance: 7, decay: 2 }, core = { color: 0xfff1b4, intensity: .2, distance: 1.3, decay: 2 } }) {
  const g = new THREE.Group(); g.position.copy(pos); parent.add(g);
  const iron = new THREE.MeshStandardMaterial({ color: 0x14110f, roughness: .7, metalness: .4 });
  const c0 = normal.clone().multiplyScalar(.06);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(.11, .012, .014), iron); arm.position.copy(c0).addScaledVector(along, .03); arm.rotation.y = Math.atan2(-along.z, along.x); g.add(arm);
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(.021, .017, .022, 12), iron); cup.position.copy(c0).add(V(0, .014, 0)); g.add(cup);
  const hook = new THREE.Mesh(new THREE.TorusGeometry(.017, .0045, 6, 14, Math.PI * 1.25), iron); hook.position.copy(c0).addScaledVector(along, .05).add(V(0, .04, 0)); hook.rotation.y = Math.atan2(-along.z, along.x); hook.rotation.z = .4; g.add(hook);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(.004, .004, .045, 6), iron); stem.position.copy(c0).addScaledVector(along, .034).add(V(0, .022, 0)); g.add(stem);
  const wax = new THREE.Mesh(new THREE.CylinderGeometry(.0135, .015, .062, 12), new THREE.MeshStandardMaterial({ color: 0xf6f1e8, roughness: .6, emissive: 0x8a6a40, emissiveIntensity: .55 }));
  wax.position.copy(c0).add(V(0, .055, 0)); g.add(wax);
  for (const m of [arm, cup, hook, stem, wax]) m.castShadow = true;
  const fl = sprite(g, flameTex(), { blending: THREE.NormalBlending }); fl.material.color = new THREE.Color(1.5, 1.4, 1.1); fl.scale.set(.04, .084, 1); fl.position.copy(wax.position).add(V(0, .06, 0));
  const gl2 = sprite(g, glowTex()); gl2.material.opacity = .05; gl2.scale.setScalar(.1); gl2.position.copy(fl.position);
  const L = new THREE.PointLight(pool.color, pool.intensity, pool.distance, pool.decay); L.position.copy(fl.position).addScaledVector(normal, .8).add(V(0, .1, 0)); g.add(L);
  const Ln = new THREE.PointLight(core.color, core.intensity, core.distance, core.decay); Ln.position.copy(fl.position).addScaledVector(normal, .16).add(V(0, .05, 0)); g.add(Ln);
  return { group: g, flame: fl, glow: gl2, lights: [L, Ln] };
}
// ящик с трафаретной надписью (lines = ['CANDLES', '40 LBS'] или null). Надпись — на грани +z.
export function crate(parent, { x, y, z, w = 1, h = .52, d = .82, ry = 0, lines = null, mat }) {
  mat = mat || procMaterial({ color: 0xffffff, roughness: .85 }, wood('vec3(9.,.6,.6)', '.62,.49,.30', '.80,.66,.43'));
  const c = box(parent, w, h, d, mat, x, y, z, ry);
  const e = new THREE.LineSegments(new THREE.EdgesGeometry(c.geometry), new THREE.LineBasicMaterial({ color: 0x3a2412, transparent: true, opacity: .7 })); c.add(e);
  for (const yy of [-.17, .17]) { const s = new THREE.Mesh(new THREE.BoxGeometry(w * 1.004, .008, d * 1.004), new THREE.MeshBasicMaterial({ color: 0x3f2a14 })); s.position.y = yy * h; c.add(s); }
  if (lines) {
    const tex = canvasTex(256, 128, (x) => { x.fillStyle = 'rgba(40,24,10,.82)'; x.font = '700 30px Georgia,serif'; x.fillText(lines[0], 14, 44); x.font = '700 17px Georgia,serif'; x.fillText(lines[1] || '', 16, 84); x.fillRect(12, 96, 150, 3); });
    const l = new THREE.Mesh(new THREE.PlaneGeometry(.34, .17), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, map: tex })); l.position.set(.12, .0, d / 2 + .003); c.add(l);
  }
  return c;
}
// пень с годовыми кольцами
export function stump(parent, { x, z, r = .13, r1 = r * 1.115, h = .21, mat }) {
  mat = mat || procMaterial({ color: 0xffffff, roughness: .95 }, wood('vec3(9.,.5,9.)', '.10,.06,.035', '.24,.15,.08'));
  const s = cyl(parent, r, r1, h, mat, x, h / 2, z, 20);
  const top = new THREE.Mesh(new THREE.CircleGeometry(r, 24), new THREE.MeshStandardMaterial({ roughness: .9, map: canvasTex(128, 128, (c) => { c.fillStyle = '#e0a45a'; c.fillRect(0, 0, 128, 128); c.strokeStyle = 'rgba(140,84,30,.6)'; c.lineWidth = 2; for (let i = 1; i < 6; i++) { c.beginPath(); c.ellipse(62, 66, i * 10, i * 9.4, .3, 0, 6.3); c.stroke(); } }) }));
  top.rotation.x = -Math.PI / 2; top.position.set(x, h + .0005, z); top.receiveShadow = true; parent.add(top);
  return { body: s, top };
}
// бутылка (полупрозрачное стекло) и котелок
export function bottle(parent, { x, y, z, h = .12, mat, envTex }) {
  mat = mat || glassMaterial(envTex);
  const b = cyl(parent, .034, .038, h, mat, x, y + h / 2, z, 12); cyl(parent, .016, .02, .045, mat, b.position.x, y + h + .02, b.position.z, 10); return b;
}
export const glassMaterial = envTex => new THREE.MeshStandardMaterial({ color: 0xdfe6ea, roughness: .15, metalness: .1, transparent: true, opacity: .62, envMap: envTex, envMapIntensity: 1.2 });
export const pot = (parent, { x, y, z }) => cyl(parent, .07, .06, .09, new THREE.MeshStandardMaterial({ color: 0x1b1b1d, roughness: .5, metalness: .5 }), x, y, z, 14);
// бочка: клёпки (сегменты токарного профиля) + железные обручи
export function barrel(parent, { x, y = 0, z, r = .3, h = .8, mat, hoopMat, lid = true }) {
  mat = mat || procMaterial({ color: 0xffffff, roughness: .8 }, wood('vec3(9.,.5,9.)', '.36,.22,.10', '.66,.44,.22'));
  hoopMat = hoopMat || new THREE.MeshStandardMaterial({ color: 0x2a2624, roughness: .55, metalness: .7 });
  const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
  const prof = []; for (let i = 0; i <= 10; i++) { const k = i / 10; prof.push(new THREE.Vector2(r * (.82 + .18 * Math.sin(Math.PI * k)), h * k)); }
  const body = new THREE.Mesh(new THREE.LatheGeometry(prof, 18), mat); body.castShadow = body.receiveShadow = true; g.add(body);
  const st = new THREE.LineSegments(new THREE.EdgesGeometry(body.geometry, 18), new THREE.LineBasicMaterial({ color: 0x2e1c0e, transparent: true, opacity: .55 })); g.add(st);
  for (const k of [.12, .36, .64, .88]) { const rr = r * (.82 + .18 * Math.sin(Math.PI * k)) + .004; const hp = new THREE.Mesh(new THREE.CylinderGeometry(rr, rr, .035, 24, 1, true), hoopMat); hp.position.y = h * k; hp.castShadow = true; g.add(hp); }
  if (lid) { const t = new THREE.Mesh(new THREE.CircleGeometry(r * .82, 24), mat); t.rotation.x = -Math.PI / 2; t.position.y = h - .02; t.receiveShadow = true; g.add(t); }
  return g;
}
// стойка с бурами (тонкие тёмные прутья на двух перекладинах между столбами)
export function rodRack(parent, { x = 1.74, zs = [-1.55, .55, 2.6], postMat, beamMat, n = 25, z0 = -1.3, step = .155, seed = 21 }) {
  const rodM = new THREE.MeshStandardMaterial({ color: 0x1c1816, roughness: .55, metalness: .5 }), ferr = new THREE.MeshStandardMaterial({ color: 0xa9a399, roughness: .6 });
  for (const z of zs) cyl(parent, .075, .085, 2.5, postMat, x + .04, 1.25, z);
  box(parent, .1, .11, 4.6, beamMat, x, 1.06, .5); box(parent, .12, .12, 4.6, beamMat, x + .02, 2.1, .5);
  const r = rng(seed);
  for (let i = 0; i < n; i++) { const z = z0 + i * step + (r() - .5) * .05, len = 1.25 + r() * .55, top = 2.12 + r() * .15; const rod = cyl(parent, .013, .013, len, rodM, x - .08 + r() * .04, top - len / 2, z, 6); rod.rotation.x = (r() - .5) * .05; cyl(parent, .02, .02, .06, ferr, rod.position.x, top - len - .01, z, 6); }
}
// меловая метка на стене (плоскость с прозрачной текстурой): draw(ctx2d) рисует её на канвасе 256x128
export function chalkMark(parent, { pos, ry = 0, w = .42, h = .2, text = "'07" }) {
  const tag = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, map: canvasTex(256, 128, (x) => { x.strokeStyle = 'rgba(235,215,190,.62)'; x.lineWidth = 3; x.beginPath(); x.moveTo(40, 12); x.lineTo(40, 100); x.moveTo(30, 12); x.lineTo(50, 12); x.stroke(); x.fillStyle = 'rgba(235,215,190,.62)'; x.font = 'italic 54px Georgia,serif'; x.fillText(text, 78, 78); }) }));
  tag.position.copy(pos); tag.rotation.y = ry; parent.add(tag); return tag;
}
// обломки: пучок расщеплённых палок веером вокруг точки
export function debris(parent, { x, z, n = 16, seed = 33, mat, rs }) {
  mat = mat || procMaterial({ color: 0xffffff, roughness: .9 }, wood('vec3(9.,9.,.5)', '.40,.26,.13', '.72,.52,.30'));
  rs = rs || rng(seed);
  for (let i = 0; i < n; i++) { const a = rs() * 6.283, len = .45 + rs() * .5, s = new THREE.Mesh(new THREE.CylinderGeometry(.006, .022, len, 5), mat); s.rotation.set(Math.PI / 2 - .08 - rs() * .1, 0, 0); const g = new THREE.Group(); g.add(s); s.position.z = len / 2 + .05; g.rotation.y = a; g.position.set(x + (rs() - .5) * .3, .035, z + (rs() - .5) * .3); s.castShadow = true; parent.add(g); }
  return rs;
}
export { smooth, softTex, glowTex, canvasTex };
