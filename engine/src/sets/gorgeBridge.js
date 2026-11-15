// gorgeBridge.js — мир V002: глубокое ущелье с рекой, цепной мост, два берега, гребень над ближним берегом, долина, горизонт.
// Единицы — метры. Ось x — вдоль моста (ближний берег x < 0, дальний x > 0), ось z — вдоль ущелья (река течёт к +z), y — вверх.
// Настил моста на y = 0, вода на y = -60. Солнце с юго-востока: стена ближнего берега и южный склон гребня освещены.
//
//   const g = gorgeBridge(stage, { origin: [0, 0, 0] });
//   g.bridge.setMotion({ amp, wavelength, phase, sway, standing, buck, buckAt, twist, dips, chainGain, chainLag })
//   g.bridge.deckPoint(u, v, lift) -> { pos, normal, tangent, binormal }      u — доля пролёта 0..1, v — поперёк -1..1
//   g.bridge.chainPoint(side, u) / hangerTop(i, side) / plankAt(u)
//   g.enemyDust.set(progress, t)        пыль вражеской армии на горизонте (0 — у горизонта, 1 — в долине у гребня)
//   g.sign.show(true)                   вариант D: табличка «ALL TROOPS MUST BREAK STEP» на пилоне
//   g.anchors.<имя> = { pos, target, fov, focus, aperture, note },  g.cam('sideWide', { fov: 40 }) -> состояние камеры
//   g.spots.<имя>   = точки для персонажей (мир),  g.column(row, file) / g.valleyRow(row, file) — места в строю
//   g.river = { y, flow, point(s, w) },  g.ground(x, z),  g.shadowFit(center, radius),  g.w(x, y, z)
// Каждый кадр tick() возвращает мир в покой (мост неподвижен, таблички и пыли нет); сцена включает нужное в update().
import * as THREE from 'three';
import { NOISE } from '../core/noise.js';
import { rng, fbm3 } from '../core/rng.js';
import { clamp, lerp, smooth } from '../core/ease.js';
import { noise1, hash01, look as camLook } from '../camera.js';
import { canvasTex, softTex } from '../core/textures.js';
import { sprite } from '../core/particles.js';
import { V, DAY, g3, skyDome, sunRig, terrainMaterial, gridGeo, blockGeo, coniferGeo, foliageMat, bushGeo, scatter, rocks, paleRock, banner, clothMaterial } from './outdoor.js';

export const GORGE = { span: 40, depth: 60, deckHalf: 2.3, chainZ: 2.9, pylonX: 20.6, chainTop: 10.25, chainLow: 1.3 };
const L = GORGE.span, HALF = L / 2, DEPTH = GORGE.depth, DHW = GORGE.deckHalf, CZ = GORGE.chainZ, PX = GORGE.pylonX, YT = GORGE.chainTop, YL = GORGE.chainLow;

// ---------- форма местности (локальные координаты декорации) ----------
const terrace = (h, step, k) => { const t = h / step, i = Math.floor(t), f = t - i, f3 = f * f * f, g = f3 / (f3 + (1 - f) ** 3); return (i + lerp(f, g, k)) * step; };
const cx = s => { const k = clamp((Math.abs(s) - 45) / 260); return Math.sign(s) * 75 * k * k; };                 // ось ущелья: прямая у моста, дальше уходит вбок
const wTop = (side, s) => 19.5 + 2.6 * smooth((Math.abs(s) - 9) / 25) * noise1(side * 7 + 3, s * .035);
const wBot = (side, s) => 8.6 + 1.4 * noise1(side * 7 + 5, s * .05);
const BAND = 7;                                                                                                // толщина пласта (м)
// координата пласта: целые значения — границы пластов (по ним же идут крупные линии материала)
function bandQ(side, s, y) { const q = (y + 2.2 * noise1(side * 11 + 1, s * .014) + .7 * Math.sin(s * .05 + side)) / BAND; return q + .15 * Math.sin(q * 2.3 + side) + .06 * Math.sin(q * 5.1 + 1); }
function strata(side, s, y) {                                                                                  // выступ пласта (м внутрь ущелья): «нос» снизу, покатый верх
  const q2 = bandQ(side, s, y), i = Math.floor(q2), f = q2 - i, a = .7 + 3.6 * Math.pow(hash01(side * 131 + 17, i), 1.6);
  const nose = f < .22 ? Math.sin(Math.PI / 2 * f / .22) : 1 - .85 * Math.pow((f - .22) / .78, 1.3);
  return a * nose * (.6 + .4 * (.5 + .5 * noise1(side * 13 + i, s * .03)));
}
const buttress = (side, s, y) => 1.6 * noise1(side * 17 + 2, s * .03) + 2.8 * (fbm3(s * .07, y * .06, side * 3.1 + 1, 3) - .5);
function wallX(side, s, y) {                                                                                   // расстояние стены от оси ущелья на высоте y
  const h = clamp((y + DEPTH) / DEPTH), wb = wBot(side, s), hw = wb + (wTop(side, s) - wb) * (.18 * h + .82 * Math.pow(h, 2.4));
  return Math.max(5.5, hw - (strata(side, s, y) + buttress(side, s, y)) * smooth(-y / 4));
}
function ridgeH(x, z) {                                                                                        // отрог-гребень над ближним берегом (север)
  const zc = -106 + 9 * Math.sin((x + 60) * .012), halfW = 42 + 7 * noise1(21, x * .01);
  let k = Math.min((1 - Math.abs(z - zc) / halfW) * 1.3, (-44 - x) / 26, (x + 360) / 70);
  if (k <= 0) return 0;
  k += .1 * (fbm3(x * .03, z * .03, 4.2, 3) - .5);
  const top = 27 + 7 * smooth((-x - 120) / 90) * (.5 + .5 * noise1(23, x * .012));
  return terrace(top * smooth(clamp(k) / .6), 6.4, .78);
}
const mesa = (x, z, mx, mz, r, hgt, seed) => {
  const a = Math.atan2(z - mz, x - mx), d = Math.hypot(x - mx, z - mz) / (r * (1 + 1.1 * (fbm3(Math.cos(a) * 1.7 + seed, Math.sin(a) * 1.7, .5, 3) - .5))), k = 1 - d + .12 * (fbm3(x * .05, z * .05, seed, 3) - .5);
  return k <= 0 ? 0 : terrace(hgt * smooth(k / .5), 6.4, .8);
};
function groundW(x, z) {                                                                                       // ближний берег: долина, гребень, холмы
  let h = ridgeH(x, z);
  h += 24 * smooth((z - 125) / 150) * (.5 + .5 * fbm3(x * .008, z * .008, 2.2, 3));
  h += 20 * smooth((-z - 200) / 170) * (.45 + .55 * fbm3(x * .007, z * .007, 5.1, 3));
  h += .3 * (fbm3(x * .05, z * .05, 7.7, 3) - .5) * smooth((-x - 30) / 30);
  return h;
}
function groundE(x, z) {                                                                                       // дальний берег: пологий подъём, останцы, холмы с лесом
  let h = 3 * smooth((x - 50) / 140) + 30 * smooth((x - 130) / 220) * fbm3(x * .006, z * .006, 9.3, 3);
  h += mesa(x, z, 88, -60, 36, 20.5, 3.3) + mesa(x, z, 122, 74, 46, 14, 8.1) + mesa(x, z, 64, 118, 28, 13.6, 5.7);
  h += .3 * (fbm3(x * .05, z * .05, 3.7, 3) - .5) * smooth((x - 30) / 30);
  return h;
}

// дерево для экземпляров: смещение волокон у каждого экземпляра своё (атрибут aOff)
function instWood(a, b, stretch, rough = .86) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: rough });
  const glsl = `vec3 woodC(vec3 p){ float g = fbm3(p*${stretch}); float rings = smoothstep(.35,.65, fract(g*7.)); vec3 c = mix(${g3(a)}, ${g3(b)}, g); c *= .8 + .28*rings; return c; }`;
  m.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aOff; varying vec3 vPP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvPP = transformed + aOff;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vPP;\n' + NOISE + glsl).replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= woodC(vPP);');
  };
  m.customProgramCacheKey = () => 'instWood' + a + b + stretch;
  return m;
}
function instanced(parent, geo, mat, n, seed) {
  const r = rng(seed), off = new Float32Array(n * 3); for (let i = 0; i < n * 3; i++) off[i] = r() * 40;
  geo.setAttribute('aOff', new THREE.InstancedBufferAttribute(off, 3));
  const im = new THREE.InstancedMesh(geo, mat, n); im.castShadow = im.receiveShadow = true; im.frustumCulled = false; parent.add(im); return im;
}

export function gorgeBridge(stage, { origin = [0, 0, 0], pal = DAY } = {}) {
  const O = V(...origin), group = new THREE.Group(); group.position.copy(O); stage.scene.add(group);
  const time = { value: 0 }, w = (x, y, z) => V(x, y, z).add(O);

  // =================================================================================================
  // небо, свет
  // =================================================================================================
  const sky = skyDome(group, { pal }), rig = sunRig(group, stage, { pal });

  // =================================================================================================
  // берега: одна сетка на берег — дно, стена ущелья с пластами, бровка, плато до горизонта
  // =================================================================================================
  const S = (() => { const o = [0]; let s = 0, st = 1.4; while (s < 900) { st = s < 70 ? 1.4 : s < 240 ? 2.7 : Math.min(st * 1.16, 90); s += st; o.push(s); } return [...o.slice(1).reverse().map(v => -v), ...o]; })();
  const rowsFor = side => {
    const rows = [{ bed: 0 }, { bed: .55 }];
    for (let y = -60.9; y < -.5; y += .62) rows.push({ y });
    rows.push({ y: -.22, dx: .14 }, { y: -.04, dx: .5 });
    let a = 1.3, st = 1.2; const fine = side < 0 ? 345 : 150;
    while (a < 1900) { rows.push({ a }); st = a < 12 ? 1.6 : a < fine ? 2.7 : Math.min(st * 1.17, 160); a += st; }
    return rows;
  };
  const roadFn = `float roadMask(vec3 p){ float ax = abs(p.x); if (ax < 19.) return 0.; float zc = p.x < -40. ? 3.*sin((p.x + 40.)*.008) : 0.;
    return (1. - smoothstep(2.3 + .4*sin(p.x*.09), 3.9, abs(p.z - zc)))*(1. - smoothstep(500., 800., ax)); }`;
  const rockMat = terrainMaterial({ roadFn, wet: .35, wetY: -60.6 }).setOrigin(O);
  const G = (side, x, z) => (side < 0 ? groundW(x, z) : groundE(x, z));
  function bank(side) {
    const rows = rowsFor(side);
    const geo = gridGeo(S.length, rows.length, (i, j) => {
      const s = S[i], r = rows[j], c = cx(s);
      if (r.bed != null) { const X = r.bed * (wBot(side, s) - .4); return { p: V(c + side * X, -63.4 + r.bed * 2.2, s), loc: [s, -62 + r.bed, 0], ao: .6 }; }
      if (r.y != null) {
        const X = wallX(side, s, r.y) + (r.dx || 0), d0 = strata(side, s, r.y); let occ = 0;
        for (const k of [.8, 1.7, 2.8, 4.2]) occ = Math.max(occ, (strata(side, s, r.y + k) - d0) / Math.pow(k, .7));
        return { p: V(c + side * X, r.y, s), loc: [s, bandQ(side, s, r.y) * BAND, side < 0 ? -.6 : -.5], ao: (1 - .4 * smooth((occ - .1))) * lerp(.6, 1, smooth((r.y + DEPTH) / 42)) };
      }
      const x = c + side * (wTop(side, s) + .5 + r.a), y = G(side, x, s) * smooth(r.a / 10);
      const gb = side < 0 ? -.6 + .1 * smooth((y - 3) / 12) + .8 * smooth((s - 120) / 60) + .75 * smooth((-s - 195) / 60) : -.5 + .62 * smooth((r.a - 70) / 90);
      return { p: V(x, y, s), loc: [(x + s) * .7071, y * (BAND / 6.4), gb], ao: 1 };
    }, side > 0);
    const m = new THREE.Mesh(geo, rockMat); m.castShadow = m.receiveShadow = true; m.frustumCulled = false; group.add(m); return m;
  }
  const bankW = bank(-1), bankE = bank(1);
  const ground = (x, z) => { const c = cx(z); return x < c ? groundW(x, z) * smooth((c - wTop(-1, z) - .5 - x) / 10) : groundE(x, z) * smooth((x - c - wTop(1, z) - .5) / 10); };

  // дальний план: силуэты гор в дымке (свой цвет, туман на них не действует)
  {
    const hz = new THREE.Color(pal.haze), mk = (R, hgt, seed, tone, n = 96) => {
      const pos = [], idx = [], r = rng(seed);
      for (let i = 0; i <= n; i++) { const a = i / n * 6.2832, c = Math.cos(a), sn = Math.sin(a), hh = hgt * (.35 + .65 * fbm3(c * 2.2 + seed, sn * 2.2, seed * .7, 4)) * (.8 + .4 * r()); pos.push(c * R, -40, sn * R, c * R, hh, sn * R); }
      for (let i = 0; i < n; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
      const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: new THREE.Color(tone).lerp(hz, .0), fog: false, side: THREE.DoubleSide })); m.frustumCulled = false; group.add(m);
    };
    mk(1500, 150, 3, new THREE.Color(0x8fb0cf).lerp(hz, .45)); mk(1150, 95, 7, new THREE.Color(0x7f9fbd).lerp(hz, .25));
  }

  // =================================================================================================
  // река
  // =================================================================================================
  const RIVER = { y: -DEPTH, flow: 6 };
  {
    const idxS = S.filter((_, i) => i % 2 === 0), pos = [], fl = [], idx = [];
    idxS.forEach((s, i) => { for (const wv of [-13, 13]) { pos.push(cx(s) + wv, RIVER.y, s); fl.push(wv, s); } if (i) { const a = (i - 1) * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aFlow', new THREE.Float32BufferAttribute(fl, 2)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .3, metalness: 0 });
    m.onBeforeCompile = sh => {
      sh.uniforms.u_time = time;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec2 aFlow; varying vec2 vFlow;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvFlow = aFlow;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec2 vFlow; uniform float u_time;\n${NOISE}
vec3 waterC(vec2 f){ float w = f.x, s = f.y - u_time*${RIVER.flow.toFixed(1)};
  float n1 = fbm3(vec3(w*.22, s*.06, u_time*.12)), n2 = fbm3(vec3(w*.6 + 3., s*.2, u_time*.3 + 5.));
  float edge = smoothstep(3.5, 8.6, abs(w));
  vec3 c = mix(${g3(0x1b6a78)}, ${g3(0x4fb0a6)}, clamp(edge*.75 + .9*(n1 - .4), 0., 1.));
  float streak = smoothstep(.54, .68, fbm3(vec3(w*1.3, s*.045, 2. + u_time*.05)));
  c = mix(c, ${g3(0x9bd8cf)}, streak*.55);
  float foam = smoothstep(.6, .8, n2*.75 + edge*.42 + .25*streak);
  return mix(c, vec3(.93, .97, .98), foam); }`).replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= waterC(vFlow);');
    };
    m.customProgramCacheKey = () => 'gorgeWater';
    const mesh = new THREE.Mesh(g, m); mesh.receiveShadow = true; mesh.frustumCulled = false; group.add(mesh); RIVER.mesh = mesh;
  }
  RIVER.point = (s, wv = 0) => w(cx(s) + wv, RIVER.y, s);

  // =================================================================================================
  // камни, ёлки, кусты
  // =================================================================================================
  {
    const r = rng(404), list = [];
    for (let i = 0; i < 150; i++) {                                                  // валуны у воды
      const side = r() < .5 ? -1 : 1, s = (r() - .5) * 520, sz = .7 + r() * r() * 3, X = wallX(side, s, -60) - r() * 2.4 + .4;
      list.push({ p: [cx(s) + side * X, -60 + sz * .12, s], s: [sz, sz * (.6 + r() * .4), sz * (.8 + r() * .5)], ry: r() * 6.28, rx: r() * .6, c: [.78 + r() * .16, .72 + r() * .14, .66 + r() * .14] });
    }
    for (let i = 0; i < 12; i++) { const s = (r() - .5) * 300, sz = .8 + r() * 1.6; list.push({ p: [cx(s) + (r() - .5) * 9, -60 + sz * .1, s], s: [sz, sz * .55, sz], ry: r() * 6.28, c: [.8, .76, .72] }); }
    for (let i = 0; i < 260; i++) {                                                  // светлые камни на берегах
      const side = r() < .5 ? -1 : 1, s = (r() - .5) * 170, a = 1.5 + r() * r() * 70, x = cx(s) + side * (wTop(side, s) + .5 + a);
      if (Math.abs(s) < 4.6 && a < 60) continue;
      const big = r() < .06, sz = big ? .7 + r() * 1.3 : .07 + r() * r() * .4;
      list.push({ p: [x, ground(x, s) + sz * .25, s], s: [sz, sz * (.55 + r() * .4), sz * (.8 + r() * .4)], ry: r() * 6.28, rx: r() * .5, c: [.86 + r() * .12, .84 + r() * .1, .8 + r() * .1] });
    }
    rocks(group, list, paleRock());
    // ёлки
    const pines = [], gA = coniferGeo(1, 6), gB = coniferGeo(2, 5), fm = foliageMat();
    const tree = (x, z, hmin, hmax, far = 0) => {
      const y = ground(x, z), slope = Math.abs(ground(x + 1.5, z) - ground(x - 1.5, z)) + Math.abs(ground(x, z + 1.5) - ground(x, z - 1.5));
      if (slope > 2.4) return; const h = hmin + r() * (hmax - hmin), t = .85 + r() * .3;
      pines.push({ p: [x, y - .2, z], s: [h * (.85 + r() * .3), h, h * (.85 + r() * .3)], ry: r() * 6.28, c: [t, t, t * (1 + far * .1)] });
    };
    for (let i = 0; i < 620; i++) { const x = 30 + Math.pow(r(), .8) * 520, z = (r() - .5) * 760; if (x < cx(z) + wTop(1, z) + 7 || (Math.abs(z) < 7 && x < 150)) continue; if (x < 70 && r() < .6) continue; tree(x, z, 7, 15); }
    for (let i = 0; i < 380; i++) { const x = -30 - r() * 600, z = 128 + Math.pow(r(), .7) * 330; if (x > cx(z) - wTop(-1, z) - 7) continue; tree(x, z, 7, 14); }
    for (let i = 0; i < 260; i++) { const x = -30 - r() * 600, z = -205 - Math.pow(r(), .7) * 300; if (x > cx(z) - wTop(-1, z) - 7) continue; tree(x, z, 7, 14); }
    for (let i = 0; i < 46; i++) { const x = -75 - r() * 270, z = -106 + (r() - .5) * 78; if (r() < .5 && ridgeH(x, z) > 24) continue; tree(x, z, 3.5, 7); }      // на уступах гребня
    for (let i = 0; i < 26; i++) { const side = r() < .5 ? -1 : 1, s = (r() < .5 ? -1 : 1) * (26 + r() * 150), x = cx(s) + side * (wTop(side, s) + 3 + r() * 16); if (side < 0 && s < -50 && x < -40) continue; tree(x, s, 5, 10); }
    scatter(group, gA, fm, pines.filter((_, i) => i % 2 === 0)); scatter(group, gB, fm, pines.filter((_, i) => i % 2 === 1));
    // кусты (жёлто-зелёные «кляксы») у бровок и на уступах стен
    const bushes = [];
    for (let i = 0; i < 70; i++) {
      const side = r() < .5 ? -1 : 1, s = (r() - .5) * 240; let p;
      if (r() < .45) { const y = -4 - r() * 38, X = wallX(side, s, y); p = [cx(s) + side * (X + .25), y - .1, s]; }
      else { const a = 1 + r() * 30, x = cx(s) + side * (wTop(side, s) + .5 + a); if (Math.abs(s) < 5.5) continue; p = [x, ground(x, s) - .05, s]; }
      const sz = .7 + r() * 1.1; bushes.push({ p, s: [sz, sz * (.7 + r() * .3), sz], ry: r() * 6.28, c: [.8 + r() * .3, .95 + r() * .15, .6 + r() * .3] });
    }
    scatter(group, bushGeo(3), new THREE.MeshStandardMaterial({ color: 0x9fc83c, roughness: .9 }), bushes);
  }

  // =================================================================================================
  // мост
  // =================================================================================================
  const bridge = (() => {
    const bg = new THREE.Group(); group.add(bg);
    const stone = terrainMaterial({ rockD: 0x9a8672, rockL: 0xdccbb2, rockB: 0xb7a48d, band: .35, rowH: .56, blockW0: 1.5, blockW1: 1.3, wave: 0, drop: 0, dropRow: 0, lineW: .024, line: .6, bevelW: .05, bevel: .5, tilt: .1, ao: .2, aoW: .1, speck: .22, stain: .25, ground: 0, rough: .9 }).setOrigin(O);
    const iron = new THREE.MeshStandardMaterial({ color: 0x2c2b2e, roughness: .5, metalness: .75, envMap: stage.envTex, envMapIntensity: .7 });
    const blk = (wd, h, d, x, y, z) => { const m = new THREE.Mesh(blockGeo(wd, h, d, { uOff: x * 1.3 + z, vOff: y }), stone); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; bg.add(m); return m; };
    for (const sx of [-1, 1]) {
      blk(4.6, 9.4, 8.6, sx * 19.9, -4.79, 0);                                      // устой: кладка под концом настила
      blk(4.6, 7, 7.2, sx * 19.9, -12.9, 0);
      for (const sz of [-1, 1]) {
        const x = sx * PX, z = sz * 3.1;
        blk(1.95, 1.3, 1.95, x, .56, z); blk(1.5, 8.2, 1.5, x, 5.31, z); blk(1.85, .38, 1.85, x, 9.6, z); blk(1.3, .34, 1.3, x, 9.96, z);
        const sad = new THREE.Mesh(new THREE.BoxGeometry(.7, .12, .5), iron); sad.position.set(x, 10.17, sz * CZ); sad.castShadow = true; bg.add(sad);
        blk(2.5, 1.5, 1.8, sx * (PX + 10.6), .5, sz * CZ);                           // якорный блок оттяжки
      }
      blk(1.25, 1.05, 4.9, sx * PX, 7.85, 0); blk(1.6, .26, 8.1, sx * PX, 8.5, 0); blk(1.0, .5, 1.1, sx * PX, 8.86, 0);
    }
    // --- форма цепи в покое ---
    const yc = x => YL + (YT - YL) * (x / PX) ** 2;
    const PITCH = .44, main = [], stays = [];
    { let acc = PITCH / 2, px = -PX, py = YT; const N = 4000; for (let i = 1; i <= N; i++) { const x = -PX + 2 * PX * i / N, y = yc(x); acc += Math.hypot(x - px, y - py); px = x; py = y; if (acc >= PITCH) { acc -= PITCH; main.push(x); } } }
    for (const sx of [-1, 1]) { const a = V(sx * PX, YT, 0), b = V(sx * (PX + 10.6), 1.0, 0), n = Math.floor(a.distanceTo(b) / PITCH); for (let i = 0; i <= n; i++) stays.push(a.clone().lerp(b, (i + .5) / (n + 1)).add(V(0, -.25 * Math.sin(Math.PI * (i + .5) / (n + 1)), 0))); }
    const linkGeo = (() => { const g = new THREE.TorusGeometry(.105, .034, 8, 18), p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setX(i, p.getX(i) + Math.sign(p.getX(i)) * .15); g.computeVertexNormals(); return g; })();
    const NL = (main.length + stays.length) * 2, links = new THREE.InstancedMesh(linkGeo, iron, NL); links.castShadow = true; links.frustumCulled = false; bg.add(links);
    // --- настил ---
    const NP = 100, PW = .33, PT = .07, HN = 19;
    const plankMat = instWood(0x7c5a3c, 0xcaa474, 'vec3(6.,6.,.45)'), beamMat = instWood(0x5e4129, 0xa27b4e, 'vec3(.5,6.,6.)');
    const planks = instanced(bg, new THREE.BoxGeometry(PW, PT, DHW * 2), plankMat, NP, 5);
    const transoms = instanced(bg, new THREE.BoxGeometry(.2, .22, 6.3), instWood(0x5e4129, 0xa27b4e, 'vec3(6.,6.,.45)'), HN + 2, 6);
    const stringers = instanced(bg, new THREE.BoxGeometry(1, .12, .15), beamMat, (HN + 1) * 3, 7);
    const kerbs = instanced(bg, new THREE.BoxGeometry(1, .1, .12), beamMat, (HN + 1) * 2, 8);
    const hangers = new THREE.InstancedMesh(new THREE.CylinderGeometry(.026, .026, 1, 6), iron, HN * 2); hangers.castShadow = true; hangers.frustumCulled = false; bg.add(hangers);
    const pre = (() => { const r = rng(91), a = [], col = new THREE.Color(); for (let k = 0; k < NP; k++) { a.push({ dz: (r() - .5) * .12, dy: (r() - .5) * .008, yaw: (r() - .5) * .018, sx: .94 + r() * .08 }); const t = .82 + r() * .3; planks.setColorAt(k, col.setRGB(t, t * (.97 + r() * .05), t * (.94 + r() * .08))); } planks.instanceColor.needsUpdate = true; return a; })();

    // --- движение ---
    const REST = { amp: 0, wavelength: 20, phase: 0, sway: 0, standing: 0, buck: 0, buckAt: .5, twist: 0, dips: [], chainGain: 1, chainLag: 0 };
    let M = { ...REST };
    const dispY = (u, lag = 0) => {
      u = clamp(u); const env = Math.pow(Math.sin(Math.PI * u), .6), k = 2 * Math.PI * L / M.wavelength, ph = M.phase - lag;
      let y = M.amp * env * ((1 - M.standing) * Math.sin(k * u - ph) + M.standing * Math.sin(k * u) * Math.cos(ph));
      if (M.buck) { const p = Math.log(.5) / Math.log(clamp(M.buckAt, .05, .95)); y += M.buck * Math.pow(Math.sin(Math.PI * Math.pow(u, p)), 1.6); }
      for (const d of M.dips) { const dx = (u - d.u) * L / (d.width || .5); y -= d.depth * Math.exp(-dx * dx) * Math.min(1, env * 3); }
      return y;
    };
    const swayZ = u => M.sway * Math.sin(Math.PI * clamp(u));
    const rollAt = u => M.twist * Math.sin(2 * Math.PI * clamp(u)) + swayZ(u) * .05;
    const T = V(0, 0, 0), N = V(0, 0, 0), B = V(0, 0, 0), P = V(0, 0, 0), m4 = new THREE.Matrix4(), q = new THREE.Vector3();
    // локальная система настила в точке u: T — вдоль пролёта, N — нормаль, B — поперёк; P — точка на оси (верх досок)
    function frame(u) {
      const e = .002, sl = (dispY(u + e) - dispY(u - e)) / (2 * e * L), tl = Math.hypot(1, sl), ro = rollAt(u), cr = Math.cos(ro), sr = Math.sin(ro);
      T.set(1 / tl, sl / tl, 0); N.set(-sl / tl * cr, cr / tl, -sr); B.set(-sl / tl * sr, sr / tl, cr);
      P.set(-HALF + u * L, dispY(u), swayZ(u));
    }
    const deckLocal = (u, v = 0, lift = 0, out = new THREE.Vector3()) => { frame(u); return out.copy(P).addScaledVector(B, v * DHW).addScaledVector(N, lift); };
    const chainLocal = (side, x, out = new THREE.Vector3()) => { const u = (x + HALF) / L; return out.set(x, yc(x) + M.chainGain * dispY(u, M.chainLag), side * CZ + .5 * swayZ(u)); };
    const X = V(0, 0, 0), Y = V(0, 0, 0), Z = V(0, 0, 0), a3 = V(0, 0, 0), b3 = V(0, 0, 0), c3 = V(0, 0, 0);
    const beam = (im, i, a, b, upRef) => {                       // брус единичной длины от a до b
      X.copy(b).sub(a); const len = X.length(); X.multiplyScalar(1 / len); Z.crossVectors(X, upRef).normalize(); Y.crossVectors(Z, X);
      m4.makeBasis(q.copy(X).multiplyScalar(len), Y, Z); m4.setPosition((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2); im.setMatrixAt(i, m4);
    };
    const pts = [];
    function update() {
      for (let k = 0; k < NP; k++) {                                                // доски
        const p = pre[k]; frame((k + .5) / NP);
        const c = Math.cos(p.yaw), s = Math.sin(p.yaw);
        X.copy(T).multiplyScalar(c).addScaledVector(B, s).multiplyScalar(p.sx); Z.copy(B).multiplyScalar(c).addScaledVector(T, -s); Y.copy(N);
        m4.makeBasis(X, Y, Z); m4.setPosition(P.x + N.x * (-PT / 2 + p.dy) + B.x * p.dz, P.y + N.y * (-PT / 2 + p.dy) + B.y * p.dz, P.z + N.z * (-PT / 2 + p.dy) + B.z * p.dz); planks.setMatrixAt(k, m4);
      }
      for (let i = 0; i <= HN + 1; i++) {                                           // поперечины, продольные балки, отбойные брусья, подвески
        const u = i / (HN + 1); frame(u); m4.makeBasis(T, N, B); m4.setPosition(P.x - N.x * .3, P.y - N.y * .3, P.z - N.z * .3); transoms.setMatrixAt(i, m4);
        if (i <= HN) {
          const u1 = (i + 1) / (HN + 1); let k = 0;
          for (const v of [-.66, 0, .66]) { deckLocal(u, v, -.13, a3); deckLocal(u1, v, -.13, b3); frame((u + u1) / 2); beam(stringers, i * 3 + k++, a3, b3, c3.copy(N)); }
          k = 0; for (const v of [-.94, .94]) { deckLocal(u, v, .05, a3); deckLocal(u1, v, .05, b3); frame((u + u1) / 2); beam(kerbs, i * 2 + k++, a3, b3, c3.copy(N)); }
        }
        if (i >= 1 && i <= HN) for (const side of [-1, 1]) { deckLocal(u, side * CZ / DHW, -.3, a3); chainLocal(side, P.x, b3); Y.copy(b3).sub(a3); const len = Y.length(); Y.multiplyScalar(1 / len); X.set(1, 0, 0); Z.crossVectors(X, Y).normalize(); X.crossVectors(Y, Z); m4.makeBasis(X, q.copy(Y).multiplyScalar(len), Z); m4.setPosition((a3.x + b3.x) / 2, (a3.y + b3.y) / 2, (a3.z + b3.z) / 2); hangers.setMatrixAt((i - 1) * 2 + (side > 0 ? 1 : 0), m4); }
      }
      let n = 0;                                                                      // цепи: звенья через одно повёрнуты на 90°
      for (const side of [-1, 1]) {
        pts.length = 0;
        const half = stays.length / 2;
        for (let i = half - 1; i >= 0; i--) pts.push(a3.copy(stays[i]).setZ(side * CZ).clone());
        for (const x of main) pts.push(chainLocal(side, x, new THREE.Vector3()));
        for (let i = half; i < stays.length; i++) pts.push(a3.copy(stays[i]).setZ(side * CZ).clone());
        for (let i = 0; i < pts.length; i++) {
          const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
          X.copy(b).sub(a).normalize(); Z.set(0, 0, 1); Y.crossVectors(Z, X).normalize(); Z.crossVectors(X, Y);
          if (i % 2) m4.makeBasis(X, Z, q.copy(Y).negate()); else m4.makeBasis(X, Y, Z);
          m4.setPosition(pts[i]); links.setMatrixAt(n++, m4);
        }
      }
      for (const im of [planks, transoms, stringers, kerbs, hangers, links]) im.instanceMatrix.needsUpdate = true;
    }
    update();
    return {
      group: bg, span: L, halfWidth: DHW, planks: NP, hangers: HN, REST,
      get motion() { return M; },
      // движение настила на этот кадр (чистая функция параметров): amp — размах волны (м), wavelength — длина волны (м),
      // phase — фаза (рад, фильм задаёт 2π·f·t), standing 0..1 — бегущая или стоячая волна, sway — боковое смещение середины (м),
      // buck — горб на весь пролёт (м), buckAt — где вершина горба (0..1), twist — скручивание (рад),
      // dips: [{ u, depth, width }] — местные прогибы под сапогами, chainGain / chainLag — как цепь следует за настилом
      setMotion(m = {}) { M = { ...REST, ...m }; update(); return this; },
      deckPoint(u, v = 0, lift = 0) { frame(u); const pos = P.clone().addScaledVector(B, v * DHW).addScaledVector(N, lift).add(O); return { pos, normal: N.clone(), tangent: T.clone(), binormal: B.clone() }; },
      deckY: u => dispY(u),
      chainPoint: (side, u) => chainLocal(side, clamp(u, -.015, 1.015) * L - HALF).add(O),
      hangerTop: (i, side) => chainLocal(side, -HALF + (i + 1) / (HN + 1) * L).add(O),
      hangerU: i => (i + 1) / (HN + 1),
      plankAt: u => clamp(Math.floor(u * NP), 0, NP - 1), plankU: k => (k + .5) / NP,
      materials: { stone, iron, plankMat },
    };
  })();

  // =================================================================================================
  // табличка (вариант D)
  // =================================================================================================
  const sign = (() => {
    const g = new THREE.Group(); g.position.set(-PX - .8, 2.35, 3.1); g.rotation.y = -Math.PI / 2; g.visible = false; group.add(g);
    const tex = canvasTex(1024, 640, (x) => {
      x.fillStyle = '#cdae78'; x.fillRect(0, 0, 1024, 640);
      const r = rng(5); for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(${r() < .5 ? '110,78,40' : '238,214,168'},${.05 + r() * .09})`; x.fillRect(r() * 1024, r() * 640, 30 + r() * 220, 1 + r() * 2.5); }
      x.strokeStyle = 'rgba(70,44,20,.55)'; x.lineWidth = 4; for (const y of [160, 320, 480]) { x.beginPath(); x.moveTo(0, y + (r() - .5) * 6); x.lineTo(1024, y + (r() - .5) * 6); x.stroke(); }
      x.strokeStyle = '#4a2f18'; x.lineWidth = 12; x.strokeRect(22, 22, 980, 596);
      x.fillStyle = '#3b2412'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.font = '700 150px Georgia, "Times New Roman", serif'; x.fillText('ALL TROOPS', 512, 150);
      x.font = '700 112px Georgia, "Times New Roman", serif'; x.fillText('MUST', 512, 316);
      x.font = '700 150px Georgia, "Times New Roman", serif'; x.fillText('BREAK STEP', 512, 486);
      x.fillStyle = '#2a2622'; for (const [a, b] of [[60, 60], [964, 60], [60, 580], [964, 580]]) { x.beginPath(); x.arc(a, b, 11, 0, 6.3); x.fill(); }
    });
    const board = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.19, .06), [1, 1, 1, 1, 0, 1].map(k => new THREE.MeshStandardMaterial(k ? { color: 0x8a6a45, roughness: .85 } : { map: tex, roughness: .8 })));
    board.castShadow = board.receiveShadow = true; g.add(board);
    const im = new THREE.MeshStandardMaterial({ color: 0x2a2826, roughness: .5, metalness: .7 });
    for (const sx of [-.87, .87]) { const st = new THREE.Mesh(new THREE.BoxGeometry(.07, 1.35, .05), im); st.position.set(sx, 0, .02); st.castShadow = true; g.add(st); }
    return { group: g, center: w(-PX - .84, 2.35, 3.1), show(on = true) { g.visible = !!on; } };
  })();

  // =================================================================================================
  // знамёна на гребне
  // =================================================================================================
  const RT = ground(-63, -88);                                                         // высота площадки генерала
  const banners = [[-61.2, -92.4, .5, 0], [-62.6, -96.3, .9, 2.1], [-66.8, -85.6, .2, 4.2], [-70.5, -89.5, 1.2, 1.3]].map(([x, z, ry, sd]) => banner(group, time, { pos: V(x, ground(x, z) - .1, z), ry, seed: sd }));

  // =================================================================================================
  // вражеская армия на горизонте: пыль, знамёна, блики
  // =================================================================================================
  const enemyDust = (() => {
    const g = new THREE.Group(); g.visible = false; group.add(g);
    const r = rng(77), hz = new THREE.Color(pal.haze), dustC = new THREE.Color(0xdcc29a), redC = new THREE.Color(0xb3211f);
    const puffs = []; for (let i = 0; i < 22; i++) { const s = sprite(g, softTex(), { blending: THREE.NormalBlending, fog: false, color: dustC.clone() }); puffs.push({ s, x: r() * 2 - 1, y: r(), z: r() * 2 - 1, sc: .55 + r() * .8, ph: r() * 6.28, sp: .2 + r() * .3 }); }
    const tex = canvasTex(256, 16, (x) => { x.fillStyle = '#7a1f1c'; x.fillRect(0, 0, 256, 16); for (let i = 0; i < 64; i++) { x.fillStyle = i % 2 ? '#c4302b' : '#3a1512'; x.fillRect(i * 4, 0, 2, 9); x.fillStyle = '#e8e2d6'; x.fillRect(i * 4, 0, 2, 2); } });
    tex.wrapS = THREE.RepeatWrapping; tex.repeat.set(3, 1);
    const troopM = new THREE.MeshBasicMaterial({ map: tex, fog: false }), troops = new THREE.Mesh(new THREE.BoxGeometry(7, 2.3, 120), troopM); troops.position.y = 1.15; g.add(troops);
    const flags = []; for (let i = 0; i < 9; i++) { const z = (i - 4) * 12 + (r() - .5) * 5, f = banner(g, time, { pos: V(14 + (r() - .5) * 16, 0, z), h: 11 + r() * 3, w: 5.5, ch: 3.6, ry: -.4 + r() * .8, seed: i * 1.7 }); f.cloth.material = clothMaterial(time, { color: 0xc41f1f, w: 5.5, seed: i * 1.7, amp: 3.4, speed: 4.5 }); f.cloth.material.fog = false; f.pole.material = new THREE.MeshBasicMaterial({ color: 0x40302a, fog: false }); f.pole.scale.set(4, 1, 4); f.cloth.castShadow = f.pole.castShadow = false; flags.push(f); }
    const glints = []; for (let i = 0; i < 16; i++) { const s = sprite(g, softTex(), { fog: false, color: new THREE.Color(1.6, 1.5, 1.25) }); s.position.set(18 + (r() - .5) * 8, 2.6 + r() * 1.6, (r() - .5) * 112); glints.push({ s, f: 2.2 + r() * 3.5, ph: r() * 6.28, sc: 2.2 + r() * 2.2 }); }
    const P0 = V(-760, 0, 4), P1 = V(-300, 0, 3);
    return {
      group: g, from: w(P0.x, 0, P0.z), to: w(P1.x, 0, P1.z),
      // progress 0..1 — от горизонта к долине; t — время (клубы, полотнища, блики); null — спрятать
      set(progress = 0, t = time.value) {
        g.visible = progress != null; if (!g.visible) return;
        const p = clamp(progress); g.position.copy(P0).lerp(P1, p);
        const dist = Math.abs(g.position.x) + 20, fogK = 1 - Math.exp(-((.0022 * dist) ** 2)), hzK = fogK * .55;
        for (const d of puffs) {
          const k = .5 + .5 * Math.sin(t * d.sp + d.ph), up = d.y * d.y;
          d.s.position.set(20 + d.x * 26 - up * 30, 4 + up * 34 + k * 2.5, d.z * 66); d.s.scale.setScalar((26 + up * 30) * d.sc * (1 + .08 * k));
          d.s.material.opacity = (.85 - .45 * up) * (.85 + .15 * k); d.s.material.color.copy(dustC).lerp(hz, hzK * .8);
        }
        troopM.color.setRGB(1, 1, 1).lerp(hz, hzK);
        for (const f of flags) { f.cloth.material.color.copy(redC).lerp(hz, hzK * .45); }
        for (const q of glints) { const a = Math.pow(Math.max(0, Math.sin(t * q.f + q.ph)), 10); q.s.material.opacity = a; q.s.scale.setScalar(q.sc * (.6 + .6 * a) * (1 + dist / 500)); }
      },
    };
  })();

  // =================================================================================================
  // точки для персонажей и ракурсы камеры (мир)
  // =================================================================================================
  const HOOK_U = .36, deckRest = (u, v, lift = 0) => w(-HALF + u * L, lift, v * DHW);
  const spots = {
    captainHook: deckRest(HOOK_U, .8),                              // капитан на краю настила, бросает барабан в сторону +z
    drumStart: deckRest(HOOK_U, .84, 2.45),                         // барабан в поднятых руках
    splash: RIVER.point(9, -3.6),                                   // куда падает барабан
    captain: w(-25.2, 0, 3.6), colonel: w(-26.6, 0, 4.3),           // диалог у входа на мост (ближний берег)
    captainGate: w(-21.8, 0, 0),                                    // капитан у входа, рука поднята
    farCaptain: w(22.6, 0, 6.4), farColonel: w(23.9, 0, 7.5),       // двое на дальнем берегу в финале
    general: w(-63, RT, -88), adjutant: w(-64.6, RT, -86.4),        // гребень
    signOfficer: w(-24.5, 0, 1.2),
    horizon: w(-560, 14, 4),                                        // где искать вражескую пыль
  };
  // колонна на ближнем берегу: ряд 0 — у моста; file 0..4 поперёк дороги
  const column = (row, file, files = 5) => w(-23.5 - row * .95, 0, (file - (files - 1) / 2) * .86);
  // ровные ряды в долине за гребнем: фронт смотрит на мост (на +x); ряд тянется вдоль z
  const valleyRow = (row, file) => w(-128 - row * 1.5, 0, -34 + file * 1.05);
  const A = (pos, target, fov = 50, focus = null, aperture = .00012, note = '') => ({ pos, target, fov, focus: focus ?? V(...pos).distanceTo(V(...target)), aperture, note });
  const o3 = (x, y, z) => [x + O.x, y + O.y, z + O.z], sp = v => [v.x, v.y, v.z];
  const anchors = {
    hookSky: A(o3(-5.25, .75, 2.75), o3(-5.62, 2.5, 1.95), 50, 1.8, .004, 'хук: снизу на барабан в поднятых руках, за ним небо'),
    hookEdge: A(o3(-3.7, 1.45, 1.1), o3(-5.4, 1.2, 3.4), 50, 2.8, .002, 'хук: барабан кувыркается мимо цепи и края настила'),
    hookDive: A(o3(-4.6, -20, 7.5), sp(spots.splash), 50, 40, .00005, 'хук: нырок за барабаном, всплеск далеко внизу'),
    hookHorizon: A(o3(-3.2, 2.1, 1.9), sp(spots.horizon), 38, 300, .00003, 'хук: переброс вверх по скале к горизонту — пыль, знамёна, блики'),
    hookFace: A(o3(-3.55, 1.62, 1.92), o3(-5.6, 1.6, 1.86), 44, 2.05, .012, 'хук: лицо капитана крупно, пыль врага размыта за спиной (в створе пилона)'),
    nearBank: A(o3(-22.1, 1.5, 7.2), o3(-25.9, 1.38, 3.9), 44, 5, .0016, 'диалог капитана и полковника у входа на мост'),
    column: A(o3(-21.2, 2.6, 4.6), o3(-40, .9, 0), 46, 14, .0006, 'переброс на строй: колонна на дороге ближнего берега'),
    chainLink: A(o3(-14.6, 4.6, 4.3), o3(-15.4, 5.35, 2.9), 40, 1.6, .006, 'звено цепи крупно; дальше — вверх по цепи к пилону'),
    pylonTop: A(o3(-16.5, 6.6, 6.2), o3(-20.6, 9.4, 2.9), 44, 6, .001, 'конец проезда по цепи: верх пилона'),
    establishing: A(o3(66, 50, 84), o3(-6, -12, 0), 44, 125, .00002, 'общий план сверху: ущелье, мост, армия на берегу; кран вниз к establishingLow'),
    establishingLow: A(o3(50, 19, 62), o3(-5, -3, 0), 44, 82, .00002, 'конец крана'),
    plankClose: A(o3(-1.2, 1.25, 3.7), o3(-.2, .1, 2.2), 42, 2.1, .006, 'резкий наезд: звено цепи и доски крупно'),
    deckDown: A(o3(.62, 1.15, .4), o3(.6, -60, .5), 52, 1.3, .0025, 'вниз сквозь щели настила: камешек падает в пропасть'),
    bridgeEntrance: A(o3(-27.5, .8, .6), o3(-21.5, 2.6, 0), 46, 6, .0012, 'низкий ракурс: капитан у входа на мост, рука поднята'),
    entranceBack: A(o3(-16.5, 1.5, 0), o3(-24, 1.3, 0), 48, 6, .0012, 'камера пятится по настилу перед входящим строем'),
    deckSide: A(o3(-6, 1.35, 6.4), o3(-4.2, 1.0, 0), 46, 6.5, .0012, 'проезд сбоку вдоль настила (камера висит над ущельем)'),
    deckMid: A(o3(-2.6, 1.5, .5), o3(4, 1.25, 0), 48, 5, .0015, 'средний план на настиле вдоль пролёта'),
    deckTop: A(o3(-.5, 24, 0), o3(0, 0, 0), 50, 24, .0001, 'вид сверху: сетка шляп на настиле'),
    deckCrane: A(o3(-13, 12, 13), o3(3, .5, 0), 46, 22, .0002, 'кран вверх: весь настил в фигурках'),
    sideWide: A(o3(31, 4.6, 34), o3(-3, 1.4, 0), 42, 47, .00008, 'общий сбоку (3/4 с дальнего берега): волна по настилу, за мостом гребень'),
    sideFlat: A(o3(0, 2.2, 62), o3(0, 1.8, 0), 38, 62, .00006, 'строго сбоку из-над ущелья: профиль пролёта, дуга моста'),
    underBridge: A(o3(5, -19, 15), o3(-1, .5, 0), 50, 25, .0002, 'из-под моста: весь пролёт идёт волной'),
    ridge: A(o3(-66.4, RT + 1.95, -91.6), o3(0, 0, 0), 40, 5, .002, 'наезд со спины генерала: гребень, знамёна, мост внизу'),
    ridgeFace: A(o3(-60.2, RT + 1.5, -84.9), o3(-63, RT + 1.5, -88), 40, 4.2, .003, 'лицо генерала (облёт), за ним знамёна и долина'),
    spyglass: A(o3(-62.4, RT + 1.55, -87.2), o3(-2, .9, 0), 6.2, 108, .00002, 'вид в подзорную трубу на мост'),
    valley: A(o3(-58.5, RT + 3.4, -90.5), o3(-165, 0, 4), 50, 120, .00003, 'кран вверх из-за спины генерала: ряды в долине до горизонта'),
    valleyRow: A(o3(-127.2, 1.45, -36.5), o3(-128.2, 1.3, 20), 40, 6, .0012, 'проезд вдоль ряда: одинаковые лица'),
    valleyBoots: A(o3(-126.4, .13, -8), o3(-128, .16, -6.2), 40, 2.2, .006, 'у земли: ряд сапог поднимается и бьёт разом'),
    farBank: A(o3(26.6, 1.7, 9.6), o3(8, -1.5, 1), 46, 5, .0012, 'из-за спин двоих на дальнем берегу: мост и ущелье'),
    topDown: A(o3(20, 15, 8.2), o3(6, -60, 6), 50, 60, .00004, 'финал, вид сверху: фигурки падают к реке, дальний берег в кадре'),
    riverSurface: A(o3(2.2, -58.9, 31), o3(-1, -55, 0), 50, 9, .0006, 'у воды: барабан плывёт, мост высоко над головой'),
    sign: A(o3(-27.4, 2.05, 4.6), sp(sign.center), 40, 6, .0015, 'вариант D: наезд на табличку'),
    signWide: A(o3(-31.5, 1.7, 5.2), o3(-21.5, 2.0, 1.2), 46, 9, .0008, 'вариант D: отъезд — офицер перед колонной, табличка, мост'),
  };

  // =================================================================================================
  // кадр
  // =================================================================================================
  const tmp = V(0, 0, 0), fw = V(0, 0, 0);
  const shadowFit = (center, radius) => rig.fit(center, radius);
  const set = {
    name: 'gorgeBridge', group, origin: O, w, ground: (x, z) => ground(x - O.x, z - O.z) + O.y, wallX, axisX: cx,
    bridge, sign, enemyDust, banners, river: RIVER, sky, sun: rig, anchors, spots, column, valleyRow, shadowFit, time, GORGE,
    cam: (name, over = {}) => { const a = anchors[name]; if (!a) throw new Error(`gorgeBridge: нет ракурса '${name}' (есть: ${Object.keys(anchors).join(', ')})`); return { ...camLook(a.pos, a.target, a.fov), ...over }; },
    // применить глубину резкости ракурса: в update сцены  g.focusOn(f.look, 'nearBank')
    focusOn(lk, name, k = 1) { const a = anchors[name]; lk.focus = a.focus; lk.aperture = a.aperture * k; return lk; },
    look: { bg: pal.horizon, fogColor: pal.haze, fogDensity: .0022, exposure: 1, bloom: .1, bloomRadius: .4, bloomThreshold: .97, dof: true, focus: 40, aperture: .00008, maxblur: .006, vignette: .3, near: .12, far: 3200 },
    tick(t, st, f) {
      time.value = t; sky.follow(st.camera);
      bridge.setMotion(); sign.show(false); enemyDust.set(null);                     // покой: сцена включает нужное в update()
      const cam = st.camera, d = f && f.cam ? tmp.set(...f.cam.target).distanceTo(cam.position) : 40;
      cam.getWorldDirection(fw); rig.fit(tmp.copy(cam.position).addScaledVector(fw, Math.min(d, 240) * .85), clamp(d * 1.5, 34, 300));
    },
  };
  group.updateMatrixWorld(true);
  return set;
}
