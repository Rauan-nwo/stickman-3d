// shots.js: раскладки четырёх пролётов над городом (L001 #6, #75, #136, #272) на наборе engine/src/sets/noirCity.js.
// Каждая функция строит свой город и возвращает { set, camera, update(t, f), over(t, f), dur }.
// Ось полёта — к −z. Метры. A — карта ассетов (data-URL плит из ./assets, см. make_assets.py).
import { THREE, V, clamp, seg, smooth } from 'engine';
import { noirCity, cityGrid, flight, rain2D, NC } from 'engine/sets/noirCity.js';

const gauss = (x, z, cx, cz, r) => Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (2 * r * r));
const lamp = (x, y, z, c, s) => [x, y, z, c, s];

// ================================================================================================
// #6 Сингапур: ночь, дождь. Над заливом между отелем с палубой и колесом обозрения, вниз по бульвару к окну
// ресторана с красными шторами (тот же ресторан, что на bg_singapore_street). Конец — близко к окну.
// ================================================================================================
export function singapore(stage, A, dur) {
  const C = noirCity(stage, {
    fog: .00055, fogStart: 60, haze: .5, hazeH: 40, fogHi: 0x0d1c33, fogLo: 0x1d3c4e,
    skyTop: 0x060b1a, skyMid: 0x0e2036, skyLow: 0x1e3c50, clouds: .7, warmK: 1.3,
  });
  const ZF = -400;                                        // фасад ресторана (передняя грань), смотрит в +z
  C.makeGround({ water: [-6000, -30, 6000, 6000], city: [-1400, -3000, 1400, -30], grid: [0, ZF + 8, 76, 76], streetW: [18, 16],
    wetWater: .8, wetStreet: .5, streak: .06, lampK: .5 });
  const avoid = (x, z, hx, hz) => (z - hz < ZF + 8 && z + hz > ZF - 40 && Math.abs(x) < 160 + hx)                        // ряд шопхаусов с рестораном
    || Math.hypot(x + 210, z + 110) < 130 + Math.max(hx, hz) || Math.hypot(x - 195, z + 125) < 60 + Math.max(hx, hz);  // отель, колесо
  const g = cityGrid({ x0: -1400, x1: 1400, z0: -1300, z1: -40, grid: [0, ZF + 8, 76, 76], streetW: [18, 16], seed: 11, avoid,
    heightAt: (x, z) => { const d = Math.abs(x); const shop = d < 260 && z > ZF - 120 ? 16 : 0;
      return shop || (20 + 70 * gauss(x, z, -420, -700, 380) + 55 * gauss(x, z, 520, -900, 420) + 20 * Math.min(1, d / 600)); },
    styleAt: (x, z, h, r) => (h < 24 ? 2 : h > 70 ? (r() < .3 ? 1 : 0) : (r() < .2 ? 1 : 0)),
    palette: NC.walls, lit: [.25, .6] });
  // шопхаусы вдоль бульвара: низкие, кремовые, шторы-окна (стиль 2)
  for (const s of g.specs) if (s.h < 24 && Math.abs(s.x) < 300 && s.z > ZF - 120 && s.style === 2) { s.color = NC.cream[(s.seed * 4) | 0]; s.cell = [3.4, 3.8]; s.lit = .6; s.warm = .92; s.shop = true; }
  // ряд с рестораном (за фасадом-плитой), соседи слева и справа
  const row = [];
  const FW = 34;                                           // ширина плиты фасада, м
  row.push({ x: 0, z: ZF - 12, w: FW - .6, d: 24, h: 13.2, color: NC.cream[0], style: 3, seed: .2, cell: [0, 0] });
  for (const sx of [-1, 1]) for (let k = 0; k < 6; k++) {
    const w = 14 + (k * 7 % 5), x = sx * (FW / 2 + 1 + k * 15.5 + w / 2 - 7);
    row.push({ x, z: ZF - 12, w: 14.6, d: 24, h: 12 + ((k * 5) % 4), color: NC.cream[(k + (sx > 0 ? 1 : 2)) % 4], style: 2, cell: [3.6, 4.2], lit: .7, warm: .95, seed: .3 + k * .07 + (sx > 0 ? .5 : 0), gf: 4.6, top: 1.6, shop: true });
  }
  C.buildings([...g.specs, ...row]);
  // деревья вдоль бульвара (тёмные круглые кроны, как на bg_singapore_street)
  const trees = [];
  for (let z = -60; z > ZF + 30; z -= 19) for (const x of [-11, 11]) trees.push({ x: x + Math.sin(z * .7) * 1.2, z, y: 1.5, w: 10, d: 10, h: 8 + Math.abs(Math.sin(z)) * 2, color: 0x1a3a34, style: -1, seed: Math.abs(Math.sin(z * 3.1)) });
  for (let x = -1300; x < 1300; x += 30) trees.push({ x: x + Math.sin(x) * 5, z: -48, y: 1, w: 12, d: 10, h: 9, color: 0x183630, style: -1, seed: Math.abs(Math.sin(x)) });
  C.buildings(trees, { blob: true, inkPx: 2.8 });
  // фонари: кварталы + бульвар + набережная
  const L = [...g.lamps.map(l => lamp(l[0], l[1], l[2], NC.warmHot, 1))];
  for (let z = -40; z > ZF + 10; z -= 22) for (const x of [-12.5, 12.5]) L.push(lamp(x, 5.5, z, NC.warmHot, 1.1));
  for (let x = -1400; x < 1400; x += 24) L.push(lamp(x, 4.5, -36, NC.warmHot, 1.2));
  C.lamps(L, { k: 1100 });
  // плиты: задник, отель с лотосом, колесо, фасад
  if (A.sg_backdrop) C.backdrop(A.sg_backdrop.url, { center: V(0, 0, 300), R: 3400, span: 110, y0: -820, stretch: 1.35, fogK: .12, boost: .35, fadeTop: .05, crop: A.sg_backdrop.crop });
  if (A.sg_mbs) C.card(A.sg_mbs.url, { pos: V(-210, -4, -110), height: 150, aspect: A.sg_mbs.aspect, boost: .4, fogK: .7, bb: 'pitch', pitchK: .5 });
  if (A.sg_wheel) C.card(A.sg_wheel.url, { pos: V(195, -4, -125), height: 150, aspect: A.sg_wheel.aspect, boost: .45, fogK: .7, bb: 'pitch', pitchK: .5 });
  if (A.sg_facade) C.facade(A.sg_facade.url, { pos: V(0, 0, ZF + .4), width: FW, aspect: A.sg_facade.aspect, y0: -FW / A.sg_facade.aspect * A.sg_facade.ground, boost: .25, fogK: .6 });
  C.hazeSheets([{ z: -260, alpha: .28, h: 30 }, { z: -800, alpha: .35, h: 50 }, { z: -1500, alpha: .4, h: 70, width: 4000 }]);
  const wy = A.sg_facade && A.sg_facade.winY ? A.sg_facade.winY * FW : 5.4;
  const camera = flight([
    { p: [0, 135, 330], at: [0, 40, -260], fov: 42 },
    { p: [0, 92, 120], at: [0, 22, -330], fov: 41 },
    { p: [0, 46, -130], at: [0, 9, ZF], fov: 40 },
    { p: [0, 19, -335], at: [0, wy + .2, ZF], fov: 40 },
    { p: [0, wy + .6, ZF + 24], at: [0, wy, ZF], fov: 40 },
  ], { dur, accel: .22, decel: .42 });
  return {
    set: C, camera,
    update(t, f) { },
    over(t, f) { rain2D(f.ctx, t, { alpha: .95, n: 420, seed: 6 }); },
  };
}

// ================================================================================================
// #75 Вашингтон: холодный синий, ясная ночь, без дождя. Над Капитолием к окну кабинета с зелёной лампой.
// ================================================================================================
export function washington(stage, A, dur) {
  const C = noirCity(stage, {
    fog: .0005, fogStart: 80, haze: .4, hazeH: 35, fogHi: 0x0b1830, fogLo: 0x1a2f4a,
    skyTop: 0x050a1a, skyMid: 0x0c1a36, skyLow: 0x1a3050, clouds: .35, warmK: 1.15,
    shadowK: [.4, .5, .78], midK: [.72, .8, .98], lightK: [1.05, 1.1, 1.2], roofK: [.6, .7, .95],
    warm: 0xffc070, cool: 0x9fc4ff, street: 0x40301c, streetK: .35,
    grade: { sat: .9, tint: [.94, .99, 1.08], lift: [.004, .008, .024], contrast: 1.06 },
  });
  const ZF = -760;
  C.makeGround({ water: [-38, -250, 38, 90], city: [-2000, -4000, 2000, 2000], grid: [0, ZF + 9, 84, 84], streetW: [20, 18],
    lawn: [-160, -560, 160, 140], wetWater: .7, waterCol: 0x0a1626, wetStreet: .12, streak: .04, lampK: .4, asphalt: 0x1a2232, grass: 0x101c22 });
  const avoid = (x, z, hx, hz) => (Math.abs(x) < 170 + hx && z + hz > -560 && z - hz < 140) || (z - hz < ZF + 9 && z + hz > ZF - 50 && Math.abs(x) < 220 + hx);
  const g = cityGrid({ x0: -1800, x1: 1800, z0: -2800, z1: 900, grid: [0, ZF + 9, 84, 84], streetW: [20, 18], seed: 21, avoid,
    heightAt: (x, z) => 22 + 14 * Math.min(1, Math.abs(x) / 500) + 40 * gauss(x, z, 900, -1600, 500),
    styleAt: () => 2, palette: NC.stone, lit: [.08, .28], warm: [.5, .8], cells: [[3.6, 4.2], [4, 4.4]], tiers: false });
  // вдоль Молла: деревья (круглые кроны)
  const trees = [];
  for (let z = 120; z > -540; z -= 16) for (const x of [-150, -120, 120, 150]) trees.push({ x: x + Math.sin(z) * 3, z, w: 13, d: 13, h: 12 + (Math.abs(z * 7) % 5), color: 0x1c3238, style: -1, seed: (z * .013) % 1 });
  for (let x = -110; x <= 110; x += 18) for (const z of [-560, 150]) trees.push({ x, z, w: 13, d: 13, h: 12, color: 0x1c3238, style: -1, seed: x * .01 % 1 });
  C.buildings(trees, { blob: true, inkPx: 2.8 });
  // ряд с кабинетом: классические каменные блоки, плита фасада в центре
  const FW = 40, row = [{ x: 0, z: ZF - 15, w: FW - .6, d: 30, h: 26, color: NC.stone[0], style: 3, seed: .4, cell: [0, 0] }];
  for (const sx of [-1, 1]) for (let k = 0; k < 4; k++) row.push({ x: sx * (FW / 2 + 22 + k * 42), z: ZF - 15, w: 40, d: 30, h: 26 + (k % 2) * 4, color: NC.stone[(k + 1) % 4], style: 2, cell: [4.2, 4.6], lit: .1, warm: .6, seed: .1 + k * .13 + (sx > 0 ? .5 : 0), gf: 5, top: 2.5 });
  C.buildings([...g.specs, ...row]);
  const L = g.lamps.map(l => lamp(l[0], l[1], l[2], 0xffe2b0, .9));
  for (let z = 140; z > -560; z -= 30) for (const x of [-100, 100]) L.push(lamp(x, 4, z, 0xfff0d0, .9));
  C.lamps(L, { k: 1000 });
  if (A.dc_backdrop) C.backdrop(A.dc_backdrop.url, { center: V(0, 0, 400), R: 3600, span: 100, y0: -330, stretch: 1.8, fogK: .1, boost: .5, fadeTop: .04, crop: A.dc_backdrop.crop });
  if (A.dc_capitol) C.card(A.dc_capitol.url, { pos: V(-20, -4, -330), height: 150, aspect: A.dc_capitol.aspect, boost: .15, fogK: .5, pitchK: .7, bb: 'pitch' });
  if (A.dc_window) C.facade(A.dc_window.url, { pos: V(0, 0, ZF + .4), width: FW, aspect: A.dc_window.aspect, y0: -FW / A.dc_window.aspect * A.dc_window.ground, boost: .3, fogK: .6 });
  C.hazeSheets([{ z: -200, alpha: .2, h: 25 }, { z: -1200, alpha: .3, h: 50, width: 4000 }], {});
  const winY = A.dc_window && A.dc_window.winY ? A.dc_window.winY * FW : 14;
  const camera = flight([
    { p: [40, 150, 400], at: [-20, 50, -330], fov: 42 },
    { p: [20, 185, -90], at: [-10, 40, -420], fov: 41 },
    { p: [8, 120, -430], at: [0, winY, ZF], fov: 40 },
    { p: [0, winY + 2, ZF + 30], at: [0, winY, ZF], fov: 40 },
  ], { dur, accel: .22, decel: .45 });
  return { set: C, camera, update() {}, over() {} };
}

// ================================================================================================
// #136 Тайбэй: неон, сухо. К выставочному залу с большим пустым баннером, справа вдали — башня 101.
// ================================================================================================
export function taipei(stage, A, dur) {
  const C = noirCity(stage, {
    fog: .0005, fogStart: 60, haze: .45, hazeH: 40, fogHi: 0x0d1830, fogLo: 0x1f2f4a,
    skyTop: 0x060a1a, skyMid: 0x101a36, skyLow: 0x2a2a48, clouds: .5, warmK: 1.3,
  });
  const ZF = -520;
  C.makeGround({ water: [0, 0, 0, 0], grid: [0, ZF + 10, 80, 80], streetW: [22, 20], wetStreet: .18, streak: .05, lampK: .5 });
  const avoid = (x, z, hx, hz) => (z - hz < ZF + 10 && z + hz > ZF - 120 && Math.abs(x) < 110 + hx) || Math.hypot(x - 420, z + 1500) < 110 + Math.max(hx, hz);
  const g = cityGrid({ x0: -1500, x1: 1500, z0: -2600, z1: 700, grid: [0, ZF + 10, 80, 80], streetW: [22, 20], seed: 31, avoid,
    heightAt: (x, z) => 30 + 60 * gauss(x, z, 420, -1500, 600) + 25 * Math.min(1, Math.abs(x) / 300),
    palette: [...NC.walls, 0x3a3048, 0x2c3a3a], lit: [.3, .65], warm: [.6, .9] });
  C.buildings(g.specs);
  // неон: вертикальные вывески на углах зданий у бульвара (пустые светящиеся полосы, без букв)
  const signs = [], r = (i => () => ((i = (i * 16807) % 2147483647) / 2147483647))(5);
  for (const s of g.specs) {
    if (s.y || s.h < 18 || Math.abs(s.x) > 260 || s.z < ZF - 40 || r() < .4) continue;
    const side = Math.sign(s.x) || 1, c = NC.neon[(r() * NC.neon.length) | 0];
    const hgt = Math.min(s.h * .6, 14 + r() * 16);
    signs.push({ x: s.x - side * (s.w / 2 + .6), z: s.z + s.d / 2 - 1.5 - r() * 4, y: 5 + r() * (s.h - hgt - 6), w: 1, d: 2.6, h: hgt, color: c, style: -1, seed: r(), wob: 0 });
  }
  // пустые светящиеся щиты на крышах и горизонтальные полосы на фасадах (без букв)
  for (const s of g.specs) {
    if (s.y || s.h < 14 || Math.abs(s.x) > 340 || s.z < ZF - 60) continue;
    const q = r(), c = NC.neon[(r() * NC.neon.length) | 0];
    if (q < .22) signs.push({ x: s.x, z: s.z + s.d * .3, y: s.h + 1.5, w: s.w * .7, d: .7, h: 5 + r() * 4, color: c, style: -1, seed: r(), wob: 0 });
    else if (q < .45) signs.push({ x: s.x, z: s.z + s.d / 2 + .5, y: 4.4 + ((r() * 3) | 0) * 3.6, w: s.w * (.5 + r() * .4), d: .5, h: 1.1, color: c, style: -1, seed: r(), wob: 0 });
  }
  const neonMesh = C.buildings(signs, { inkPx: 2.4 });
  // светящиеся вывески = отдельный «излучающий» материал поверх (просто сделать цвет ярким)
  if (neonMesh) { neonMesh.material = new THREE.MeshBasicMaterial({ color: 0xffffff }); const cA = neonMesh.geometry.getAttribute('aColor');
    for (let i = 0; i < signs.length; i++) neonMesh.setColorAt(i, new THREE.Color(signs[i].color).multiplyScalar(signs[i].h > 3 && signs[i].d < 1 && signs[i].w > 3 ? .8 : 1.25)); neonMesh.instanceColor.needsUpdate = true; }
  // зал: блок за плитой фасада
  const FW = 72;
  C.buildings([{ x: 0, z: ZF - 45, w: FW - .6, d: 90, h: 24, color: 0x2a3446, style: 3, seed: .7, cell: [0, 0] }]);
  const L = g.lamps.map(l => lamp(l[0], l[1], l[2], NC.warmHot, 1));
  for (const s of signs) if (s.w < 2) L.push(lamp(s.x, s.y + s.h / 2, s.z, s.color, 1.4));
  C.lamps(L, { k: 1100 });
  if (A.tp_backdrop) C.backdrop(A.tp_backdrop.url, { center: V(0, 0, 400), R: 3600, span: 100, y0: -150, fogK: .15, boost: .45, crop: A.tp_backdrop.crop });
  if (A.tp_101) C.card(A.tp_101.url, { pos: V(420, -10, -1500), height: 600, aspect: A.tp_101.aspect * .72, boost: .4, fogK: .4, pitchK: .3, bb: 'pitch' });
  if (A.tp_hall) C.facade(A.tp_hall.url, { pos: V(0, 0, ZF + .4), width: FW, aspect: A.tp_hall.aspect, y0: -FW / A.tp_hall.aspect * A.tp_hall.ground, boost: .3, fogK: .6 });
  C.hazeSheets([{ z: -250, alpha: .22, h: 30 }, { z: -1000, alpha: .32, h: 60, width: 4000 }]);
  const bannerY = A.tp_hall && A.tp_hall.banner ? A.tp_hall.banner[1] * FW : 16;
  // надпись на пустом баннере: простая вывеска тушью (единственный текст в кадре)
  if (A.tp_hall && A.tp_hall.banner) {
    const [bx, by, bw, bh] = A.tp_hall.banner;                      // доли ширины плиты: центр x, центр y над тротуаром, ширина, высота
    const cv = document.createElement('canvas'); cv.width = 2048; cv.height = 360; const x = cv.getContext('2d');
    x.font = '900 250px "Arial Black", Impact, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.lineJoin = 'round'; x.lineWidth = 22; x.strokeStyle = 'rgba(12,16,30,1)'; x.fillStyle = '#1c2a44';
    x.strokeText('COMPUTEX', 1024, 190); x.fillText('COMPUTEX', 1024, 190);
    x.fillStyle = '#2f6fb0'; x.fillText('COMPUTEX', 1024, 182);
    const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(bw * FW * .82, bw * FW * .82 * 360 / 2048), new THREE.MeshBasicMaterial({ map: tx, transparent: true, depthWrite: false, toneMapped: false }));
    m.position.set((bx - .5) * FW, by * FW, ZF + .6); m.renderOrder = 4; C.group.add(m);
  }
  const camera = flight([
    { p: [-30, 110, 360], at: [30, 50, -600], fov: 42 },
    { p: [-8, 62, -10], at: [0, 24, ZF], fov: 41 },
    { p: [0, bannerY - 1, ZF + 70], at: [0, bannerY - 2, ZF], fov: 40 },
  ], { dur, accel: .2, decel: .45 });
  return { set: C, camera, update() {}, over() {} };
}

// ================================================================================================
// #272 финал: камера поднимается и отъезжает над ночным городом; окна офисов по одному гаснут.
// ================================================================================================
export function final(stage, A, dur) {
  const C = noirCity(stage, {
    fog: .00045, fogStart: 80, haze: .5, hazeH: 45, fogHi: 0x0b1830, fogLo: 0x1a3448,
    skyTop: 0x050a18, skyMid: 0x0c1a32, skyLow: 0x1a3550, clouds: .6, warmK: 1.3,
  });
  C.makeGround({ water: [0, 0, 0, 0], grid: [0, 0, 76, 76], streetW: [16, 16], wetStreet: .15, streak: .05, lampK: .45 });
  const hero = { x: 0, z: -95, w: 46, d: 34, h: 205, color: 0x2c3c58, style: 0, cell: [3.4, 3.7], lit: .62, warm: .8, seed: .51, gf: 5, top: 2 };
  const avoid = (x, z, hx, hz) => (Math.abs(x) < 30 + hx && Math.abs(z + 95) < 22 + hz) || (Math.abs(x) < 70 + hx && z + hz > -70 && z < 700);
  const g = cityGrid({ x0: -1800, x1: 1800, z0: -2800, z1: 900, seed: 41, avoid,
    heightAt: (x, z) => 26 + 95 * gauss(x, z, 0, -300, 420) + 30 * gauss(x, z, -700, -900, 400), lit: [.3, .6] });
  C.buildings([hero, { ...hero, y: 205, w: 30, d: 22, h: 24, seed: .52, top: 1.5 }, ...g.specs]);
  C.lamps(g.lamps.map(l => lamp(l[0], l[1], l[2], NC.warmHot, 1)), { k: 1000 });
  if (A.fin_backdrop) C.backdrop(A.fin_backdrop.url, { center: V(0, 0, 500), R: 3800, span: 104, y0: -260, fogK: .15, boost: .35, crop: A.fin_backdrop.crop });
  C.hazeSheets([{ z: -400, alpha: .22, h: 35 }, { z: -1100, alpha: .3, h: 60, width: 4000 }]);
  const camera = flight([
    { p: [14, 176, 6], at: [0, 160, -78], fov: 38 },
    { p: [18, 205, 170], at: [0, 120, -140], fov: 41 },
    { p: [20, 300, 600], at: [0, 70, -700], fov: 44 },
  ], { dur, accel: .3, decel: .35 });
  return {
    set: C, camera,
    update(t, f) { const k = t / dur; C.BU.uOffShare.value = .5; C.BU.uOff.value = .02 + .75 * k; C.BU.uEmK.value = 1 - .15 * smooth(k); },
    over() {},
  };
}
