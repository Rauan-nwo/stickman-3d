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
// #298 финал: ночной американский техкампус. Ближний стеклянный корпус с флагом, в единственном горящем окне —
// человек за столом; второй силуэт входит и подтаскивает стул рядом («who's going to warn them?»). Потом камера
// поднимается и отъезжает над кампусом и городом, окна офисов гаснут по одному. Конец: кампус с главным корпусом в
// центре, разная высота крыш, небо с облаками и одна башня-доминанта на горизонте (плиты fin_near, fin_mid, fin_sky).
// ================================================================================================
export function final(stage, A, dur) {
  const C = noirCity(stage, {
    fog: .00048, fogStart: 140, haze: .5, hazeH: 50, fogHi: 0x0e1e38, fogLo: 0x1d3c52,
    skyTop: 0x050a18, skyMid: 0x0c1a32, skyLow: 0x1a3550, clouds: .5, bloom: .55,
    grade: { sat: .95, tint: [.95, 1, 1.06], lift: [.005, .01, .024], contrast: 1.05 },
  });
  const N = A.fin_near, M = A.fin_mid, NZ = -40, NW = 48, hN = NW / (N ? N.aspect : 2), gN = N ? N.ground : .1;
  const wn = N && N.win ? N.win : [.38, .4, .62, .57];                       // окно: доли картинки [x0, y0, x1, y1] (y сверху)
  const wx0 = (wn[0] - .5) * NW, wx1 = (wn[2] - .5) * NW, wy1 = (1 - wn[1] - gN) * hN, wy0 = (1 - wn[3] - gN) * hN;
  const wcx = (wx0 + wx1) / 2, wcy = (wy0 + wy1) / 2, wW = wx1 - wx0, wH = wy1 - wy0;
  const camD = wW / .36 / (2 * Math.tan(19 * Math.PI / 180) * 16 / 9);      // окно ~36% ширины кадра в начале
  const path = flight([
    { p: [wcx, wcy + .3, NZ + camD], at: [wcx, wcy, NZ], fov: 38 },
    { p: [wcx + 1.5, wcy + 4, NZ + camD + 14], at: [wcx, wcy + 1, NZ], fov: 38 },
    { p: [wcx + 3, 30, NZ + camD + 60], at: [0, 28, -300], fov: 41 },
    { p: [6, 55, 130], at: [0, 48, -700], fov: 43 },
    { p: [8, 60, 175], at: [0, 52, -720], fov: 44 },
  ], { dur, accel: .01, decel: .01 });
  // время -> путь: ~1.6 с камера почти стоит у окна (сцена со стулом), потом подъём и отъезд с торможением в конце
  const sm = x => { x = Math.min(1, Math.max(0, x)); return x * x * x * (x * (6 * x - 15) + 10); };
  let Lp = 0; { let q = path(0).pos; for (let i = 1; i <= 200; i++) { const r = path(dur * i / 200).pos; Lp += Math.hypot(r[0] - q[0], r[1] - q[1], r[2] - q[2]); q = r; } }
  const a1 = 4 / Lp, T1 = 1.45 / dur, warp = u => a1 * sm(u / T1) + (1 - a1) * sm((u - T1 * .85) / (1 - T1 * .85));
  const cam = t => path(dur * warp(t / dur));
  C.makeGround({ water: [-8000, -8000, 8000, -1150], waterCol: 0x0c1c2e, grid: [0, NZ + 12, 70, 70], streetW: [14, 12],
    lawn: [-600, -370, 600, 600], grass: 0x142428, wetWater: .7, wetStreet: .12, streak: .04, lampK: .45 });
  const L = [], glass = [0x1e3148, 0x223852, 0x1a2c42, 0x26405a, 0x203448], neon = [0x47e0e0];
  if (A.fin_sky) sky(C, A.fin_sky.url, { z0: 500, hy: -560, hf: .19, R: 3600, stretch: .9, boost: .4 });
  // кампус (плита) и его соседи
  const MW = 380, MZ = -310;
  row(C, cam, dur, -1100, { seed: 61, heightAt: x => 40 + 25 * gauss(x, -500, 300), w: [28, 50], palette: glass, lit: .4, neon, neonShare: .1, maxPpm: 6, haze: .6 }, L);
  if (M) {
    row(C, cam, dur, MZ - 1, { seed: 62, heightAt: () => 38, w: [30, 60], palette: glass, lit: .35, abut: [-MW / 2 + .5, MW / 2 - .5], dynamic: true, haze: .5 }, L);
    plate(C, M, { z: MZ, wM: MW, ground: M.ground || 0, boost: .4, fogK: .55 });
  }
  // низкие корпуса и деревья между кампусом и ближним зданием (окна гаснут)
  const rows = [];
  const camAt = z => { let best = 1e9, y = 0; for (let i = 0; i <= 80; i++) { const s = cam(dur * i / 80); const d = Math.abs(s.pos[2] - z); if (d < best) { best = d; y = s.pos[1]; } } return y; };
  for (const [z, sd, h] of [[-250, 63, 12], [-190, 64, 11], [-130, 65, 10], [-80, 66, 9], [30, 68, 10], [70, 70, 10], [110, 69, 9]])
    row(C, cam, dur, z, { kind: 'trees', seed: sd, heightAt: () => h, w: [7, 12], step: [.7, .9], palette: [0x18302f, 0x1a3436, 0x16282c, 0x1c3a38], haze: .2, crown: 8, keep: [[-9, 9]] }, L);
  for (let z = -60; z > MZ + 10; z -= 18) for (const x of [-11, 11]) L.push([x, 3, z, 0xffe2b0, .6]);
  // ближний корпус: плита + стеклянные соседи вплотную
  rows.push(row(C, cam, dur, NZ - 1, { seed: 67, heightAt: () => hN * (1 - gN) * 1.05, w: [24, 34], step: [1, 1], palette: glass, lit: .55, cell: [3.2, 3.9], abut: [-NW / 2 + .4, NW / 2 - .4], dynamic: true, haze: .3, maxPpm: 30 }, L));
  if (N) plate(C, N, { z: NZ, wM: NW, ground: gN, boost: .35, fogK: .4, renderOrder: 1 });
  // ряды позади начальной точки: ниже камеры, когда она над ними
  for (const [z, s] of [[70, 71]]) { const cy = camAt(z) - 20; rows.push(row(C, cam, dur, z, { seed: s, heightAt: () => Math.min(cy, 16), w: [26, 50], palette: glass, lit: .4, dynamic: true, haze: .3 }, L)); }
  for (let x = -300; x <= 300; x += 26) L.push([x, 3.5, NZ + 10, 0xfff0d0, .7]);
  C.lamps(L, { k: 1000 });
  C.hazeSheets([{ z: -330, alpha: .18, h: 25 }, { z: -800, alpha: .3, h: 50, width: 5000 }, { z: -1500, alpha: .38, h: 80, width: 7000 }]);

  // ----- силуэты в окне: человек за столом и второй, который подтаскивает стул (2D, тёмные формы) -----
  const deskV = N && N.desk ? N.desk : .7;                                    // линия столешницы, доля высоты окна сверху
  const CW = 1024, CH = Math.round(CW * wH / wW), sil = document.createElement('canvas'); sil.width = CW; sil.height = CH;
  const sx = sil.getContext('2d'), stex = new THREE.CanvasTexture(sil); stex.colorSpace = THREE.SRGBColorSpace; stex.userData.ready = true;
  C.card(stex, { pos: V(wcx, wy0, NZ + .06), height: wH, aspect: wW / wH, bb: false, boost: 0, fogK: .4, renderOrder: 2, depthWrite: false });
  const ease = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
  let lastT = -1;
  function drawSil(t) {
    const tq = Math.round(t * 30) / 30; if (tq === lastT) return; lastT = tq;
    const g = sx, H = CH, W = CW, dy = H * deskV;
    g.clearRect(0, 0, W, H); g.save();
    g.beginPath(); g.rect(0, 0, W, dy); g.clip();                              // всё ниже столешницы скрыто столом
    const ink = 'rgba(9,12,24,.94)', u = H / 100;
    // 1) сидящий у монитора (смотрит влево, на монитор)
    const breathe = Math.sin(t * 2.2) * .4 * u;
    g.fillStyle = ink;
    const sxp = W * .5;
    g.beginPath(); g.roundRect(sxp - 13 * u, dy - 34 * u + breathe, 26 * u, 40 * u, 9 * u); g.fill();         // корпус
    g.beginPath(); g.arc(sxp - 2 * u, dy - 43 * u + breathe, 8.5 * u, 0, Math.PI * 2); g.fill();             // голова
    g.beginPath(); g.moveTo(sxp - 8 * u, dy - 20 * u); g.lineTo(sxp - 26 * u, dy - 3 * u); g.lineWidth = 6 * u; g.lineCap = 'round'; g.strokeStyle = ink; g.stroke();  // рука к клавиатуре
    g.fillRect(sxp - 5 * u, dy - 40 * u + breathe, 7 * u, 8 * u);                                               // шея
    // 2) второй входит справа и тянет за собой кресло; потом садится в него рядом с первым (лицом к нему)
    const k1 = ease((t - .1) / 1.0), k2 = ease((t - 1.05) / .45);
    const chX = W * (1.12 - .48 * k1);                                         // спинка кресла: от правого края к x = .64 W
    const walk = Math.abs(Math.sin(t * 8)) * (1 - k1) * 2 * u, sit = 17 * u * k2;
    const vx = chX + 26 * u * (1 - k2) - 12 * u * k2;                          // стоит справа от кресла -> сидит в нём
    const by = dy - 54 * u + sit - walk;
    g.beginPath(); g.roundRect(vx - 12 * u, by, 24 * u, 62 * u, 10 * u); g.fill();                              // корпус
    g.fillRect(vx - 4 * u - 3 * u * k2, by - 8 * u, 7 * u, 10 * u);                                           // шея
    g.beginPath(); g.arc(vx - 2 * u - 4 * u * k2, by - 12 * u, 8.5 * u, 0, Math.PI * 2); g.fill();               // голова (повёрнута к первому)
    g.beginPath(); g.moveTo(vx - 6 * u, by + 12 * u); g.lineTo(chX + 4 * u * (1 - k2) - 30 * u * k2, dy - 22 * u + 10 * u * k2); g.lineWidth = 6 * u; g.lineCap = 'round'; g.stroke();  // рука: на спинке -> на столе
    g.beginPath(); g.roundRect(chX - 3 * u, dy - 30 * u, 14 * u, 34 * u, 6 * u); g.fill();                   // спинка кресла (за спиной у второго)
    g.fillRect(chX + 2 * u, dy - 3 * u, 4 * u, 6 * u);
    g.restore();
    // тёплая подсветка контуров со стороны монитора — чтобы силуэты читались как люди в комнате, а не дыры
    stex.needsUpdate = true;
  }
  // ----- окна гаснут по одному (после того как стул подвинули) -----
  const offs = [];
  {
    const T0 = 1.7, T1 = dur - .25, n = 28, P = new THREE.Vector3(), cm = new THREE.PerspectiveCamera(40, 16 / 9, .1, 1e5);
    const cand = [];
    rows.forEach((R, ri) => R.wins.forEach((w, wi) => cand.push([ri, wi, ((wi * 2654435761 + ri * 97) >>> 0) / 4294967296])));
    cand.sort((a, b) => a[2] - b[2]);
    for (let i = 0; i < n; i++) {
      const t = T0 + (T1 - T0) * i / (n - 1), s = cam(t);
      cm.fov = s.fov; cm.position.set(...s.pos); cm.lookAt(...s.target); cm.updateProjectionMatrix(); cm.updateMatrixWorld();
      for (let k = 0; k < cand.length; k++) {
        const [ri, wi] = cand[k], w = rows[ri].wins[wi], z = rows[ri].meshes[0].position.z;
        P.set(w.cx, w.cy, z).project(cm); const px = P.x, py = P.y, pz = P.z;
        P.set(w.cx + w.w / rows[ri].ppm, w.cy, z).project(cm); const size = Math.abs(P.x - px) * 960;
        if (!(Math.abs(px) < .75 && Math.abs(py) < .7 && pz < 1 && size > 4)) continue;
        const cp = cm.position, hid = rows.some(R2 => { const z2 = R2.meshes[0].position.z; if (z2 <= z || z2 >= cp.z) return false;
          const k2 = (z2 - cp.z) / (z - cp.z), x2 = cp.x + (w.cx - cp.x) * k2, y2 = cp.y + (w.cy - cp.y) * k2;
          return R2.blds.some(b => x2 >= b.x - 1 && x2 <= b.x + b.w + 1 && y2 <= b.h + 2); });
        if (!hid) { offs.push([t, ri, wi]); cand.splice(k, 1); break; }
      }
    }
  }
  return {
    set: C, camera: cam,
    update(t) { drawSil(t); rows.forEach((R, ri) => R.setOff(offs.filter(o => o[1] === ri && o[0] <= t).map(o => o[2]))); },
    over() {},
  };
}

// ================================================================================================
// #2 (и #79) башни компаний: ночной город из небоскрёбов без имён и логотипов; камера поднимается и наклоняется
// вверх, зелёная башня (полоса цвета NVIDIA, без логотипа) вырастает из города выше всех. --set one=1 — в конце на
// короне загорается «#1».
// ================================================================================================
export function towers(stage, A, dur, o = {}) {
  const C = noirCity(stage, {
    fog: .0004, fogStart: 120, haze: .45, hazeH: 60, fogHi: 0x0d1a33, fogLo: 0x1c3850,
    skyTop: 0x050a18, skyMid: 0x0c1830, skyLow: 0x1a3048, clouds: .5, bloom: .6,
  });
  const GZ = -560, Tg = A.tw_green, Hg = 420, Wg = Tg ? Hg * Tg.aspect : 80;
  const cam = flight([
    { p: [0, 22, 130], at: [0, 70, -600], fov: 42 },
    { p: [0, 78, 30], at: [0, 190, GZ], fov: 43 },
    { p: [0, 135, -40], at: [0, 268, GZ], fov: 44 },
  ], { dur, accel: .3, decel: .45 });
  C.makeGround({ water: [0, 0, 0, 0], grid: [0, 0, 80, 80], streetW: [18, 16], wetStreet: .3, streak: .06, lampK: .5 });
  const L = [], neon = [0x47e0e0, 0xff4fa8, 0x6a8cff, 0xffb24a];
  const corp = [0x22344c, 0x2a3048, 0x1e3046, 0x2c3a52, 0x30304a, 0x243a48];
  if (A.fin_backdrop) sky(C, A.fin_backdrop.url, { z0: 300, hy: 60, hf: .418, R: 3600, stretch: .85, boost: .35 });
  row(C, cam, dur, -1300, { seed: 81, heightAt: x => 90 + 50 * gauss(x, -400, 300), w: [30, 55], palette: corp, lit: .45, neon, neonShare: .3, spireH: 120, maxPpm: 6 }, L);
  row(C, cam, dur, -900, { seed: 82, heightAt: x => 120 + 40 * gauss(x, 300, 200), w: [28, 50], palette: corp, lit: .5, neon, neonShare: .3, spireH: 150, keep: [[-45, 45]] }, L);
  // зелёная башня: поднимается из-за домов (низ под землёй закрыт землёй и рядами)
  let gt = null;
  if (Tg) gt = C.card(Tg.url, { pos: V(0, 0, GZ), height: Hg, aspect: Tg.aspect, bb: false, boost: .55, fogK: .35, renderOrder: 1 });
  row(C, cam, dur, GZ + 120, { seed: 83, heightAt: x => 110 + 30 * gauss(x, -200, 150) + 25 * gauss(x, 220, 120), w: [26, 46], palette: corp, lit: .5, neon, neonShare: .3, spireH: 135 }, L);
  row(C, cam, dur, GZ + 260, { seed: 84, heightAt: x => 85 + 40 * Math.min(1, Math.abs(x) / 200), w: [24, 40], palette: corp, lit: .55, neon, neonShare: .25, spireH: 120, keep: [[-30, 30]] }, L);
  row(C, cam, dur, GZ + 400, { seed: 85, heightAt: x => Math.min(95, 20 + Math.max(0, Math.abs(x) - 24) * 1.1), w: [20, 34], palette: corp, lit: .5, neon, neonShare: .2, keep: [[-24, 24]] }, L);
  row(C, cam, dur, GZ + 520, { seed: 86, heightAt: x => Math.min(80, 16 + Math.max(0, Math.abs(x) - 24) * 1.1), w: [20, 34], palette: corp, lit: .5, neon, neonShare: .2, keep: [[-24, 24]] }, L);
  for (let z = 300; z > GZ + 100; z -= 24) for (const x of [-12, 12]) L.push([x, 5, z, NC.warmHot, .9]);
  C.lamps(L, { k: 1100 });
  C.hazeSheets([{ z: GZ + 200, alpha: .2, h: 40 }, { z: -1100, alpha: .3, h: 70, width: 5000 }]);
  // рост: верх башни от уровня соседей (~120 м) до Hg; кривая — за 70% длительности, мягко
  const sm = x => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
  const rise = t => 130 + (Hg - 130) * sm((t / dur - .08) / .72);
  // корона-сияние и «#1»
  const glow = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 256; const g = cv.getContext('2d');
    const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, 'rgba(190,255,120,.9)'); gr.addColorStop(.35, 'rgba(118,185,0,.45)'); gr.addColorStop(1, 'rgba(118,185,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.userData.ready = true;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    m.renderOrder = 6; C.group.add(m); return m; })();
  let one = null;
  if (o.one) { const cv = document.createElement('canvas'); cv.width = 512; cv.height = 300; const g = cv.getContext('2d');
    g.font = '900 230px "Arial Black", Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = '#9cff3a'; g.shadowBlur = 40; g.fillStyle = '#eaffd0'; g.fillText('#1', 256, 160); g.shadowBlur = 0;
    g.lineWidth = 10; g.strokeStyle = 'rgba(10,30,5,.9)'; g.strokeText('#1', 256, 160); g.fillText('#1', 256, 160);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.userData.ready = true;
    one = new THREE.Mesh(new THREE.PlaneGeometry(1, 300 / 512), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false }));
    one.renderOrder = 7; C.group.add(one); }
  const crownY = () => (gt ? gt.position.y + Hg * (Tg.crown ?? .9) : 300);
  function update(t) {
    if (gt) gt.position.y = rise(t) - Hg;
    const k = sm((t / dur - .55) / .35);
    glow.position.set(0, crownY(), GZ + 2); glow.scale.setScalar(Wg * (1.2 + .4 * k)); glow.material.opacity = .25 + .55 * k;
    if (one) { const t0 = dur - Math.min(.9, dur * .3), q = Math.min(1, Math.max(0, (t - t0) / .25)), pop = q < 1 ? 1.25 - .25 * q : 1;
      one.visible = q > 0; one.position.set(0, crownY() - Wg * .05, GZ + 3); one.scale.setScalar(Wg * 1.05 * pop); one.material.opacity = q; }
  }
  return { set: C, camera: cam, update, over() {} };
}

// ================================================================================================
// #300 Аляска: сумерки, аэродром у заснеженных гор; правительственный борт (без надписей и герба) с трапом; маленький
// силуэт в кожанке поднимается по трапу; камера наезжает к трапу.
// ================================================================================================
export function alaska(stage, A, dur) {
  const C = noirCity(stage, {
    fog: .00035, fogStart: 150, haze: .35, hazeH: 40, fogHi: 0x1a2440, fogLo: 0x3a4a68,
    skyTop: 0x0c1028, skyMid: 0x1c2448, skyLow: 0x40506e, clouds: .3, bloom: .5,
    grade: { sat: .92, tint: [.97, .99, 1.07], lift: [.008, .01, .03], contrast: 1.05 },
  });
  const J = A.ak_jet, JZ = -150, JW = 76, JH = J ? JW / J.aspect : 20, jx = 0;
  const st = J && J.stairs ? J.stairs : [.22, .97, .3, .45];              // трап: низ (x, y) и верх-дверь (x, y), доли картинки, y сверху
  const sx0 = jx + (st[0] - .5) * JW, sy0 = (1 - st[1]) * JH, sx1 = jx + (st[2] - .5) * JW, sy1 = (1 - st[3]) * JH;
  const cx = (sx0 + sx1) / 2;
  const cam = flight([
    { p: [cx + 40, 7, JZ + 150], at: [jx - 6, 17, JZ], fov: 40 },
    { p: [cx + 16, 6.5, JZ + 90], at: [cx + 3, 12.5, JZ], fov: 40 },
    { p: [cx + 6, 6, JZ + 52], at: [cx + 1, 9.5, JZ], fov: 40 },
  ], { dur, accel: .25, decel: .5 });
  C.makeGround({ water: [0, 0, 0, 0], grid: [0, 0, 400, 400], streetW: [0, 0], lawn: [-8000, -8000, 8000, 8000], grass: 0x4e5c80,
    asphalt: 0x262e40, wetStreet: .3, streak: .04, lampK: .4, lamp: 0xffc070 });
  const L = [];
  if (A.ak_backdrop) sky(C, A.ak_backdrop.url, { z0: 300, hy: 0, hf: .27, R: 3400, stretch: .95, boost: .3 });
  if (A.ak_terminal) { const T = A.ak_terminal, cw = .963, wT = 170, hT = wT / (T.aspect * cw);   // края с обрезками забора отрезаны
    C.card(T.url, { pos: V(150, -(T.ground || 0) * hT, -470), height: hT, aspect: T.aspect * cw, bb: false, boost: .35, fogK: .55, crop: [.021, 0, cw, 1] }); }
  // перрон: тёмная полоса асфальта под бортом (горизонтальная плоскость поверх снега)
  { const ac = document.createElement('canvas'); ac.width = 512; ac.height = 128; const ax = ac.getContext('2d'); const ag = ax.createLinearGradient(0, 0, 0, 128);
    ag.addColorStop(0, 'rgba(28,34,50,0)'); ag.addColorStop(.25, 'rgba(28,34,50,.6)'); ag.addColorStop(.75, 'rgba(28,34,50,.6)'); ag.addColorStop(1, 'rgba(28,34,50,0)'); ax.fillStyle = ag; ax.fillRect(0, 0, 512, 128);
    const at = new THREE.CanvasTexture(ac); at.colorSpace = THREE.SRGBColorSpace;
    const g = new THREE.Mesh(new THREE.PlaneGeometry(900, 160), new THREE.MeshBasicMaterial({ map: at, transparent: true, depthWrite: false }));
    g.rotation.x = -Math.PI / 2; g.position.set(0, .05, JZ + 10); g.renderOrder = 1; C.group.add(g);
    const sh = document.createElement('canvas'); sh.width = 512; sh.height = 128; const x = sh.getContext('2d');
    const gr = x.createRadialGradient(256, 64, 10, 256, 64, 250); gr.addColorStop(0, 'rgba(0,0,8,.55)'); gr.addColorStop(1, 'rgba(0,0,8,0)');
    x.setTransform(1, 0, 0, .25, 0, 48); x.fillStyle = gr; x.fillRect(0, 0, 512, 512);
    const t = new THREE.CanvasTexture(sh); const m = new THREE.Mesh(new THREE.PlaneGeometry(JW * 1.1, 26), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(jx, .1, JZ + 2); m.renderOrder = 2; C.group.add(m); }
  if (J) C.card(J.url, { pos: V(jx, -.1, JZ), height: JH, aspect: J.aspect, bb: false, boost: .5, fogK: .4, renderOrder: 3, tint: [.6, .66, .86] });
  L.push([sx1 - .5, sy1 + 1.2, JZ + .6, 0xffc070, 1.1]);   // свет из открытой двери
  // огни: синие рулёжные в перспективе, жёлтые прожекторы перрона
  for (let z = 400; z > -1600; z -= 30) for (const x of [-60, 60]) L.push([x + (z < JZ ? 0 : 0), .6, z, 0x5a8cff, .7]);
  for (let x = -400; x <= 400; x += 80) L.push([x, 18, JZ - 60, 0xffd59a, 1.4]);
  for (let x = -300; x <= 300; x += 9) L.push([x, .4, JZ + 45, 0xffe0a0, .55], [x + 4.5, .4, JZ + 70, 0x5a8cff, .6]);   // кромка рулёжки на переднем плане
  C.lamps(L, { k: 900 });
  C.hazeSheets([{ z: -500, alpha: .2, h: 25, color: 0x5a6c90 }, { z: -1200, alpha: .3, h: 60, width: 5000, color: 0x4a5a80 }]);
  // силуэт на трапе (2D): поднимается от низа к двери, шаги
  const SW = 6, SH = 8, sc = document.createElement('canvas'); sc.width = 256; sc.height = 340; const sg = sc.getContext('2d');
  const stx = new THREE.CanvasTexture(sc); stx.colorSpace = THREE.SRGBColorSpace; stx.userData.ready = true;
  const man = C.card(stx, { pos: V(0, 0, JZ + .4), height: 4.2, aspect: 256 / 340, bb: false, boost: 0, fogK: .3, renderOrder: 4, depthWrite: false });
  let lastQ = -1;
  function drawMan(t) {
    const k = Math.min(1, Math.max(0, (t - dur * .15) / (dur * .65))), q = Math.round(t * 30);
    const kin = Math.min(1, Math.max(0, (t - dur * .82) / (dur * .12)));        // у двери: шаг внутрь и растворяется в проёме
    const x = sx0 + (sx1 - sx0) * k + kin * 1.2, y = sy0 + (sy1 - sy0) * k;
    man.position.set(x, y, JZ + .4); man.material.uniforms.uOpacity.value = 1 - kin;
    if (q === lastQ) return; lastQ = q;
    const g = sg, u = 3.4, cx = 128, ph = t * 7, st = k > 0 && k < 1 ? Math.sin(ph) : 0;
    g.clearRect(0, 0, 256, 340); const ink = 'rgba(8,10,20,.97)'; g.fillStyle = ink; g.strokeStyle = ink; g.lineCap = 'round'; g.lineJoin = 'round';
    // ноги (брюки): шаг вверх по ступеням — колено поднимается
    g.lineWidth = 7.5 * u;
    const hip = [cx, 56 * u], kneeA = [cx + 6 * u + 4 * u * st, 74 * u - 6 * u * Math.max(0, st)], footA = [cx + 4 * u + 6 * u * st, 96 * u - 8 * u * Math.max(0, st)];
    const kneeB = [cx - 3 * u - 3 * u * st, 76 * u + 4 * u * Math.min(0, st)], footB = [cx - 7 * u - 4 * u * st, 97 * u];
    for (const [kn, ft] of [[kneeB, footB], [kneeA, footA]]) { g.beginPath(); g.moveTo(...hip); g.lineTo(...kn); g.lineTo(...ft); g.stroke(); }
    // корпус в кожанке (чуть наклонён вперёд-вправо — вверх по трапу)
    g.beginPath(); g.moveTo(cx - 11 * u, 58 * u); g.lineTo(cx - 9 * u, 22 * u); g.quadraticCurveTo(cx, 16 * u, cx + 10 * u, 21 * u); g.lineTo(cx + 13 * u, 58 * u); g.closePath(); g.fill();
    // рука на поручне
    g.lineWidth = 6 * u; g.beginPath(); g.moveTo(cx + 7 * u, 26 * u); g.lineTo(cx + 15 * u, 40 * u); g.lineTo(cx + 22 * u, 36 * u); g.stroke();
    // шея и голова
    g.fillRect(cx - 2 * u, 12 * u, 6 * u, 8 * u); g.beginPath(); g.arc(cx + 2 * u, 9 * u, 7.5 * u, 0, Math.PI * 2); g.fill();
    stx.needsUpdate = true;
  }
  // снег 2D: редкие медленные хлопья
  const flakes = []; { let s = 7; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647); for (let i = 0; i < 160; i++) flakes.push([r() * 1920, r() * 1080, .6 + r() * 1.8, .3 + r() * .7, r() * 6.28]); }
  function snow(ctx, t) { ctx.save(); for (const [x0, y0, rr, sp, ph] of flakes) { const y = (y0 + t * 70 * sp) % 1100 - 10, x = x0 + Math.sin(t * .8 + ph) * 14 - t * 12 * sp;
      ctx.globalAlpha = .25 + .35 * sp; ctx.fillStyle = '#e8f0ff'; ctx.beginPath(); ctx.arc(((x % 1920) + 1920) % 1920, y, rr, 0, 6.283); ctx.fill(); } ctx.restore(); }
  return { set: C, camera: cam, update(t) { drawMan(t); }, over(t, f) { snow(f.ctx, t); } };
}
