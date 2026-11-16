// shots.js: четыре пролёта над ночным городом (L001 #6, #85, #153/#227, #298) — 2.5D «мультиплан» на наборе
// engine/src/sets/noirCity.js. Весь город — рисованные слои: плиты GPT (задник, достопримечательности, фасад-цель,
// растянутые тайлами из своих же модулей) и ряды домов paintedRow() в той же манере (заливка, тушь, окна). Между
// слоями — туман глубины, дымка, отражения в воде/мокром асфальте, свечение огней; камера — сплайн с разгоном и
// торможением. Ось полёта — к −z, метры. Размер каждого ряда берётся из coverage() по пути камеры: края не в кадре.
// Каждая функция: (stage, A, dur) -> { set, camera, update(t, f), over(t, f) }.
import { THREE, V } from 'engine';
import { noirCity, flight, rain2D, paintedRow, coverage, NC } from 'engine/sets/noirCity.js';

const gauss = (x, c, r) => Math.exp(-((x - c) ** 2) / (2 * r * r));

// ряд домов на глубине z: покрытие и плотность — по камере; lamps копятся в L
function row(C, cam, dur, z, o, L) {
  const cv = coverage(cam, dur, z, { margin: o.margin ?? .12, maxPpm: o.maxPpm ?? 26 });
  const R = paintedRow(C, { z, x0: cv.x0, x1: cv.x1, ppm: cv.ppm * (o.ppmK ?? 1.1), ...o });
  if (L) L.push(...R.lamps);
  return R;
}
// задник-панорама: линия горизонта картинки (доля снизу hf) — на высоте hy; дуга шире кадра на запас
function sky(C, url, { z0 = 0, R = 3200, span = 84, hy = 0, hf = .42, stretch = 1, boost = .35, fogK = .1, fadeTop = .03 } = {}) {
  const h = R * span * Math.PI / 180 / (16 / 9) / stretch;
  return C.backdrop(url, { center: V(0, 0, z0), R, span, y0: hy - hf * h, stretch, boost, fogK, fadeTop, fadeBot: 0 });
}
// фасад-плита: картинка шириной wM метров; (fx, fy) — доли картинки, которые встают в (x=0, y над землёй)
function plate(C, P, { z, wM, ground = 0, boost = .25, fogK = .6, x = 0, renderOrder = 1 }) {
  const hM = wM / P.aspect;
  return C.card(P.url, { pos: V(x, -ground * hM, z), height: hM, aspect: P.aspect, bb: false, boost, fogK, renderOrder });
}

// ================================================================================================
// #6 Сингапур: ночь, дождь. Над заливом (слева отель с палубой, справа колесо) вперёд-вниз к набережной шопхаусов —
// к окну ресторана с красными шторами и свечой. Конец — окно близко, склейка в общий план ресторана.
// ================================================================================================
export function singapore(stage, A, dur) {
  const C = noirCity(stage, {
    fog: .00042, fogStart: 70, haze: .45, hazeH: 40, fogHi: 0x0d1c33, fogLo: 0x1d3c4e,
    skyTop: 0x060b1a, skyMid: 0x0e2036, skyLow: 0x1e3c50, clouds: .6, bloom: .55,
  });
  const ZF = -300, S = A.sg_street;
  const wM = S ? S.aspect * (856 / S.ppm) : 72, Hs = wM / (S ? S.aspect : 4), winY = S ? S.winY * Hs : 4.2;
  const cam = flight([
    { p: [0, 66, 140], at: [0, 30, -700], fov: 42 },
    { p: [0, 34, -60], at: [0, 12, ZF - 60], fov: 41 },
    { p: [0, 12, -220], at: [0, winY + 1.2, ZF], fov: 40 },
    { p: [0, winY + .4, ZF + 21], at: [0, winY, ZF], fov: 40 },
  ], { dur, accel: .18, decel: .5 });
  C.makeGround({ water: [-8000, ZF + 1.2, 8000, 8000], city: [-8000, -8000, 8000, ZF], grid: [0, ZF - 20, 70, 70], streetW: [14, 14],
    wetWater: .95, wetStreet: .5, streak: .12, lampK: .6, waterCol: 0x123448 });
  const L = [];
  sky(C, A.sg_backdrop.url, { z0: 300, hy: 0, hf: .41, R: 3200 });
  // дальние кварталы (за набережной): башни с огнями на крышах, как силуэт на задникe
  const towerPal = [0x22384e, 0x26405a, 0x1e3346, 0x2a4660, 0x203a50];
  row(C, cam, dur, ZF - 900, { seed: 5, heightAt: x => 70 + 70 * gauss(x, -350, 300) + 60 * gauss(x, 420, 260), w: [24, 46], palette: towerPal, lit: .42, neon: [0x47e0e0, 0xff4fa8], neonShare: .35, fogK: 1, maxPpm: 8 }, L);
  if (A.sg_mbs) C.card(A.sg_mbs.url, { pos: V(-250, -6, ZF - 430), height: 190, aspect: A.sg_mbs.aspect, bb: false, boost: .45, fogK: .8 });
  if (A.sg_wheel) C.card(A.sg_wheel.url, { pos: V(240, -6, ZF - 380), height: 150, aspect: A.sg_wheel.aspect, bb: false, boost: .5, fogK: .8 });
  row(C, cam, dur, ZF - 330, { seed: 6, heightAt: x => 48 + 30 * gauss(x, -120, 160), w: [20, 38], palette: towerPal, lit: .5, neon: [0x47e0e0, 0xff4fa8, 0xffb24a], neonShare: .3, keep: [[-360, -150], [170, 320]] }, L);
  row(C, cam, dur, ZF - 120, { seed: 7, heightAt: x => 34 + 14 * Math.min(1, Math.abs(x) / 200), w: [16, 30], palette: towerPal, lit: .55, neon: [0x47e0e0, 0xff4fa8], neonShare: .2 }, L);
  // набережная: тайлы шопхаусов по краям от плиты (кремовые, низкие)
  row(C, cam, dur, ZF - 1.5, { seed: 8, heightAt: () => 15, w: [11, 16], step: [1, 1], palette: NC.cream, lit: .7, cell: [3.4, 4.2], abut: [-wM / 2 + .4, wM / 2 - .4], haze: .35 }, L);
  if (S) plate(C, S, { z: ZF, wM, ground: S.ground, x: -(S.cx - .5) * wM, boost: .3, fogK: .55 });
  // фонари набережной и лампы фасада (свечение + отражение в воде)
  for (let x = -600; x <= 600; x += 16) if (Math.abs(x) > 9) L.push([x, 4.2, ZF + 6, NC.warmHot, .9]);
  // фонари плиты (x исходника sg_facade -> метры от центра ресторана x=836; 49.2 px/м): у окна, бра, под арками тайлов
  const m = X => (X - 836) / 49.18, lan = [[512, 6.7, 1.3], [1162, 6.7, 1.3], [620, 5.2, .8], [1048, 5.2, .8], [1478, 7, 1.1]];
  for (let j = 0; j < 3; j++) lan.push([1630 + j * 374 + 84 + 138, 7, 1.1], [335 - (j + 1) * 374 + 236, 7, 1.1]);
  for (const [X, y, s] of lan) L.push([m(X), y, ZF + .8, 0xffc070, s]);
  C.lamps(L, { k: 1100 });
  C.hazeSheets([{ z: ZF - 60, alpha: .3, h: 25 }, { z: ZF - 400, alpha: .35, h: 45, width: 4000 }, { z: ZF - 1000, alpha: .45, h: 80, width: 6000 }]);
  return { set: C, camera: cam, update() {}, over(t, f) { rain2D(f.ctx, t, { alpha: .9, n: 460, seed: 6 }); } };
}

// ================================================================================================
// #85 Вашингтон: холодный синий, ясная ночь, без дождя. Над Моллом к Капитолию, над куполом — к каменному фасаду и
// единственному горящему окну с зелёной лампой (= bg_washington_cold изнутри).
// ================================================================================================
export function washington(stage, A, dur) {
  const C = noirCity(stage, {
    fog: .0004, fogStart: 90, haze: .35, hazeH: 35, fogHi: 0x0b1830, fogLo: 0x1a2f4a,
    skyTop: 0x050a1a, skyMid: 0x0c1a36, skyLow: 0x1a3050, clouds: .3, bloom: .5,
    grade: { sat: .9, tint: [.94, .99, 1.08], lift: [.004, .008, .024], contrast: 1.06 },
  });
  const ZF = -720, W = A.dc_wall, wM = W ? 4547 / W.ppm : 63, hM = wM / (W ? W.aspect : 2.2), winY = W ? W.winY * hM : 21;
  const cam = flight([
    { p: [20, 40, 120], at: [-6, 34, -330], fov: 42 },
    { p: [8, 112, -240], at: [0, 46, -640], fov: 41 },
    { p: [2, 58, -575], at: [0, winY + 1.5, ZF], fov: 40 },
    { p: [0, winY + .3, ZF + 22], at: [0, winY, ZF], fov: 40 },
  ], { dur, accel: .2, decel: .45 });
  C.makeGround({ water: [-26, -270, 26, 200], city: [-8000, -8000, 8000, 8000], grid: [0, ZF + 10, 70, 70], streetW: [16, 14],
    lawn: [-150, -300, 150, 900], wetWater: .7, waterCol: 0x0a1626, wetStreet: .1, streak: .03, lampK: .35, asphalt: 0x182030, grass: 0x1a2c30 });
  const L = [];
  sky(C, A.dc_backdrop.url, { z0: 300, hy: 0, hf: .17, R: 3400 });
  const stone = [0x2a3652, 0x26324c, 0x2e3a56, 0x223048];
  const camAt = z => { let best = 1e9, y = 0; for (let i = 0; i <= 80; i++) { const q = cam(dur * i / 80); const d = Math.abs(q.pos[2] - z); if (d < best) { best = d; y = q.pos[1]; } } return y; };
  row(C, cam, dur, ZF - 260, { kind: 'stone', seed: 21, heightAt: x => 34 + 14 * gauss(x, 300, 200), w: [30, 60], palette: stone, lit: .12, maxPpm: 10 }, L);
  row(C, cam, dur, ZF - 80, { kind: 'stone', seed: 22, heightAt: () => 38, w: [34, 56], palette: stone, lit: .1 }, L);
  // ряд с кабинетом: каменные соседи по краям плиты
  row(C, cam, dur, ZF - 1, { kind: 'stone', seed: 23, heightAt: () => 27, w: [36, 48], step: [1, 1], palette: stone, lit: .08, abut: [-wM / 2 + .4, wM / 2 - .4], haze: .3 }, L);
  if (W) plate(C, W, { z: ZF, wM, ground: 0, x: -(W.cx - .5) * wM, boost: .35, fogK: .5 });
  // между Капитолием и кабинетом — плотные низкие кварталы (ниже камеры в момент пролёта)
  [-400, -460, -520, -580, -640].forEach((z, i) => { const cy = camAt(z) - 14;
    row(C, cam, dur, z, { kind: 'stone', seed: 24 + i, heightAt: x => Math.min(cy, 18 + i * 2 + Math.min(12, Math.abs(x) * .04)), w: [26, 48], palette: stone, lit: .1 }, L); });
  if (A.dc_capitol) C.card(A.dc_capitol.url, { pos: V(-6, -5, -330), height: 82, aspect: A.dc_capitol.aspect, bb: false, boost: .2, fogK: .45 });
  // Молл: ряды крон по сторонам газона, за ними — каменные корпуса
  for (const [z, sd] of [[-270, 31], [-200, 32], [-130, 33], [-60, 34], [10, 35], [70, 36]]) {
    row(C, cam, dur, z, { kind: 'trees', seed: sd, heightAt: () => 13, w: [9, 13], step: [.75, .9], palette: [0x1c3238, 0x1a2e36, 0x203840], keep: [[-95, 95]], haze: .25, crown: 10 }, L);
    row(C, cam, dur, z + 30, { kind: 'trees', seed: sd + 40, heightAt: () => 11, w: [8, 11], step: [.8, .95], palette: [0x1e363c, 0x1a3038, 0x22403e], keep: [[-36, 36]], haze: .2, crown: 9 }, L);
    row(C, cam, dur, z - 30, { kind: 'stone', seed: sd + 10, heightAt: () => 24, w: [40, 70], palette: stone, lit: .12, keep: [[-150, 150]] }, L);
  }
  for (let z = 120; z > -300; z -= 24) for (const x of [-100, 100]) L.push([x, 4, z, 0xfff0d0, .8]);
  C.lamps(L, { k: 1000 });
  C.hazeSheets([{ z: -200, alpha: .18, h: 22 }, { z: ZF - 150, alpha: .25, h: 40, width: 4000 }, { z: -1400, alpha: .3, h: 60, width: 6000 }]);
  return { set: C, camera: cam, update() {}, over() {} };
}

// ================================================================================================
// #153/#227 Тайбэй: неон, сухо. Над бульваром между неоновыми кварталами к выставочному залу с большим светящимся
// баннером; справа вдали — Taipei 101.
// ================================================================================================
export function taipei(stage, A, dur) {
  const C = noirCity(stage, {
    fog: .00045, fogStart: 60, haze: .4, hazeH: 40, fogHi: 0x0d1830, fogLo: 0x1f2f4a,
    skyTop: 0x060a1a, skyMid: 0x101a36, skyLow: 0x2a2a48, clouds: .4, bloom: .6,
  });
  const ZF = -520, Hh = A.tp_hall, FW = 72, hM = FW / (Hh ? Hh.aspect : 2.15);
  const bn = Hh && Hh.banner ? Hh.banner : [.5, .58, .52, .22], bY = bn[1] * hM;
  const cam = flight([
    { p: [-18, 115, 400], at: [30, 46, -800], fov: 42 },
    { p: [-6, 62, 20], at: [0, 24, ZF], fov: 41 },
    { p: [0, bY + .5, ZF + 44], at: [0, bY, ZF], fov: 40 },
  ], { dur, accel: .18, decel: .5 });
  C.makeGround({ water: [0, 0, 0, 0], grid: [0, ZF + 12, 80, 80], streetW: [26, 20], wetStreet: .2, streak: .05, lampK: .5 });
  const L = [], neon = [0x47e0e0, 0xff4fa8, 0xffb24a, 0x7cff7a, 0x6a8cff];
  const pal = [0x2a3446, 0x30304a, 0x26384a, 0x3a3048, 0x2c3a3a, 0x283244];
  sky(C, A.tp_backdrop.url, { z0: 400, hy: 0, hf: .14, R: 3400 });
  if (A.tp_101) C.card(A.tp_101.url, { pos: V(520, -10, -1700), height: 560, aspect: A.tp_101.aspect, bb: false, boost: .45, fogK: .45 });
  row(C, cam, dur, -1200, { seed: 31, heightAt: x => 60 + 50 * gauss(x, -200, 300), w: [26, 50], palette: pal, lit: .45, neon, neonShare: .4, keep: [[440, 600]], maxPpm: 8 }, L);
  row(C, cam, dur, ZF - 200, { seed: 32, heightAt: x => 46 + 30 * gauss(x, -150, 120), w: [22, 40], palette: pal, lit: .5, neon, neonShare: .35, signs: .4 }, L);
  // соседи зала
  row(C, cam, dur, ZF - 1, { seed: 33, heightAt: () => 34, w: [18, 30], palette: pal, lit: .55, neon, neonShare: .4, signs: .5, abut: [-FW / 2 + .4, FW / 2 - .4] }, L);
  if (Hh) plate(C, Hh, { z: ZF, wM: FW, ground: Hh.ground, boost: .35, fogK: .5 });
  // бульвар: ряды неоновых кварталов с проёмом посередине (камера летит над проёмом)
  const camAt = z => { let best = 1e9, y = 0; for (let i = 0; i <= 60; i++) { const s = cam(dur * i / 60); const d = Math.abs(s.pos[2] - z); if (d < best) { best = d; y = s.pos[1]; } } return y; };
  for (const [z, s] of [[-400, 34], [-280, 35], [-160, 36], [-40, 37], [80, 38], [200, 39], [320, 40]]) {
    const cy = camAt(z) - 6;
    row(C, cam, dur, z, { seed: s, heightAt: x => Math.min(cy, 16 + Math.max(0, Math.abs(x) - 34) * .9), w: [16, 28], palette: pal, lit: .5, neon, neonShare: .3, signs: .45, keep: [[-30, 30]] }, L);
  }
  for (let z = 360; z > ZF + 6; z -= 22) for (const x of [-14, 14]) L.push([x, 5, z, NC.warmHot, .9]);
  C.lamps(L, { k: 1100 });
  // надпись на пустом баннере (единственный текст в кадре)
  {
    const cv = document.createElement('canvas'); cv.width = 2048; cv.height = 400; const x = cv.getContext('2d');
    x.font = '900 230px "Arial Black", Impact, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.lineJoin = 'round'; x.lineWidth = 20; x.strokeStyle = 'rgba(12,16,30,1)'; x.fillStyle = '#1c2a44';
    x.strokeText('COMPUTEX', 1024, 210); x.fillText('COMPUTEX', 1024, 210); x.fillStyle = '#2a64a8'; x.fillText('COMPUTEX', 1024, 200);
    x.font = '700 64px "Arial Black", sans-serif'; x.fillStyle = '#3a3a52'; x.fillText('TAIPEI', 1024, 345);
    const wB = bn[2] * FW * .8;
    const tx = new THREE.CanvasTexture(cv);
    tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8; tx.userData.ready = true;
    C.card(tx, { pos: V((bn[0] - .5) * FW, bY - wB * 400 / 2048 / 2, ZF + .5), height: wB * 400 / 2048, aspect: 2048 / 400, bb: false, boost: 0, fogK: .5, renderOrder: 3, depthWrite: false });
  }
  C.hazeSheets([{ z: -100, alpha: .15, h: 22 }, { z: ZF - 100, alpha: .25, h: 35, width: 4000 }, { z: -1500, alpha: .35, h: 70, width: 6000 }]);
  return { set: C, camera: cam, update() {}, over() {} };
}

// ================================================================================================
// #298 финал: от окна офисной башни камера поднимается и отъезжает над ночным городом; окна офисов гаснут по одному.
// ================================================================================================
export function final(stage, A, dur) {
  const C = noirCity(stage, {
    fog: .00062, fogStart: 120, haze: .6, hazeH: 55, fogHi: 0x0e1e38, fogLo: 0x1d3c52,
    skyTop: 0x050a18, skyMid: 0x0c1a32, skyLow: 0x1a3550, clouds: .5, bloom: .5,
  });
  const cam = flight([
    { p: [6, 66, 8], at: [0, 62, -60], fov: 38 },
    { p: [10, 118, 170], at: [0, 72, -200], fov: 40 },
    { p: [12, 230, 520], at: [0, 55, -850], fov: 43 },
    { p: [14, 300, 780], at: [0, 45, -950], fov: 44 },
  ], { dur, accel: .25, decel: .3 });
  C.makeGround({ water: [0, 0, 0, 0], grid: [0, 0, 76, 76], streetW: [16, 16], wetStreet: .15, streak: .05, lampK: .45 });
  const L = [], pal = [0x26384e, 0x2c3c58, 0x22344a, 0x30425a, 0x283a50], neon = [0x47e0e0, 0xff4fa8];
  sky(C, A.fin_backdrop.url, { z0: 500, hy: 120, hf: .418, R: 3600, stretch: .8 });
  const zs = [-1500, -1100, -800, -560, -380, -220, -60];
  const rows = [];
  zs.forEach((z, i) => rows.push(row(C, cam, dur, z, { seed: 41 + i, heightAt: x => (z === -60 ? 70 + 60 * gauss(x, 0, 30) : 50 + 60 * gauss(x, -150 + i * 40, 250) + (z === -560 ? 150 * gauss(x, -240, 16) + 110 * gauss(x, 260, 14) : 0) + (z === -1100 ? 170 * gauss(x, 60, 20) : 0)),
    w: z === -60 ? [34, 46] : [22, 44], palette: pal, lit: .55, neon, neonShare: .25, spireH: 160, dynamic: z > -600, maxPpm: z === -60 ? 30 : 18 }, L)));
  // ряды позади начальной точки: ниже камеры в момент, когда она над ними
  const camAt = z => { let best = 1e9, y = 0; for (let i = 0; i <= 80; i++) { const s = cam(dur * i / 80); const d = Math.abs(s.pos[2] - z); if (d < best) { best = d; y = s.pos[1]; } } return y; };
  for (const [z, s] of [[70, 51], [170, 52], [290, 53], [420, 54], [560, 55], [690, 56]]) { const cy = camAt(z) - 18; rows.push(row(C, cam, dur, z, { seed: s, heightAt: x => Math.min(cy, 34 + Math.abs(x) * .08), w: [22, 40], palette: [0x1e2e44, 0x22324a, 0x1a2a40], lit: .32, neon, neonShare: .15, dynamic: true }, L)); }
  C.lamps(L, { k: 1000 });
  C.hazeSheets([{ z: -400, alpha: .2, h: 35 }, { z: -1000, alpha: .3, h: 60, width: 5000 }, { z: -1700, alpha: .4, h: 90, width: 7000 }]);
  // окна гаснут по одному: берём горящие окна, видимые в кадре в момент гашения, по одному каждые ~dt
  const offs = [];
  {
    const T0 = .35, T1 = dur - .3, n = 40, P = new THREE.Vector3(), cm = new THREE.PerspectiveCamera(40, 16 / 9, .1, 1e5);
    let k = 0; const cand = [];
    rows.forEach((R, ri) => R.wins.forEach((w, wi) => cand.push([ri, wi, ((wi * 2654435761) >>> 0) / 4294967296])));
    cand.sort((a, b) => a[2] - b[2]);
    for (let i = 0; i < n; i++) {
      const t = T0 + (T1 - T0) * i / (n - 1), s = cam(t);
      cm.fov = s.fov; cm.position.set(...s.pos); cm.lookAt(...s.target); cm.updateProjectionMatrix(); cm.updateMatrixWorld();
      for (; k < cand.length; k++) {
        const [ri, wi] = cand[k], w = rows[ri].wins[wi], z = rows[ri].meshes[0].position.z;
        P.set(w.cx, w.cy, z).project(cm); const px = P.x, py = P.y, pz = P.z;
        P.set(w.cx + w.w / rows[ri].ppm, w.cy, z).project(cm); const size = Math.abs(P.x - px) * 960;   // ширина окна на экране, px
        if (!(Math.abs(px) < .7 && Math.abs(py) < .65 && pz < 1 && size > 6)) continue;
        // не закрыто ли окно домом из более близкого ряда: луч камера -> окно на плоскости каждого ближнего ряда
        const cp = cm.position, hid = rows.some(R2 => { const z2 = R2.meshes[0].position.z; if (z2 <= z || z2 >= cp.z) return false;
          const k2 = (z2 - cp.z) / (z - cp.z), x2 = cp.x + (w.cx - cp.x) * k2, y2 = cp.y + (w.cy - cp.y) * k2;
          return R2.blds.some(b => x2 >= b.x - 1 && x2 <= b.x + b.w + 1 && y2 <= b.h + 2); });
        if (!hid) { offs.push([t, ri, wi]); cand.splice(k, 1); k = 0; break; }
      }
    }
  }
  return {
    set: C, camera: cam,
    update(t) { rows.forEach((R, ri) => R.setOff(offs.filter(o => o[1] === ri && o[0] <= t).map(o => o[2]))); },
    over() {},
  };
}
