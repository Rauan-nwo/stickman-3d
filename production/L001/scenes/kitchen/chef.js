// chef.js: повар «Стикман Нуар» для сцены-метафоры «повара» (L001, гл. 2) и гости банкета.
// Строится на пресете лонгов (jensen(over) → общий каркас figure: руки с локтем, ноги с коленом, трубки-конечности),
// поверх — свои HATS (колпак, причёски гостей) и одежда. Движок не меняется: здесь только новые записи HATS.
import { jensen, HATS } from 'engine';

const TAU = Math.PI * 2;
const poly = (x, pts, fill, stroke, lw) => { x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) p.length === 4 ? x.quadraticCurveTo(p[0], p[1], p[2], p[3]) : x.lineTo(p[0], p[1]); x.closePath(); if (fill) { x.fillStyle = fill; x.fill(); } if (stroke) { x.lineWidth = lw; x.strokeStyle = stroke; x.lineJoin = 'round'; x.stroke(); } };
const path = (x, pts, w, col) => { x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) p.length === 4 ? x.quadraticCurveTo(p[0], p[1], p[2], p[3]) : x.lineTo(p[0], p[1]); x.lineWidth = w; x.lineCap = 'round'; x.lineJoin = 'round'; x.strokeStyle = col; x.stroke(); };
const ell = (x, cx, cy, rx, ry, fill, stroke, lw, rot = 0) => { x.beginPath(); x.ellipse(cx, cy, Math.max(.1, rx), Math.max(.1, ry), rot, 0, TAU); if (fill) { x.fillStyle = fill; x.fill(); } if (stroke) { x.lineWidth = lw; x.strokeStyle = stroke; x.stroke(); } };
const lgrad = (x, x0, y0, x1, y1, stops) => { const g = x.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; };
const cloth = fn => (x, B, S, VW) => { x.save(); x.translate(B.cx, B.cy); x.scale(B.rx / 104, 1); fn(x, S, VW); x.restore(); };

// ---------- колпак (toque): околыш + пышный верх со складками; сдвиг в 3/4 как у причёсок ----------
HATS.K_toque = (x, H, S, VW) => {
  const ink = S.colors.ink, lw = S.lw, o = VW && VW.view !== 'back' ? (VW.facing || 0) * (VW.view === 'side' ? .5 : .3) * 40 : 0;
  x.save(); x.translate(o * .4, 0);
  // пышный верх: три «облака» поверх цилиндра
  const top = [[-118, -150], [-150, -214, -128, -268], [-112, -318, -54, -312], [-24, -350, 26, -330], [70, -350, 104, -306], [152, -284, 132, -214], [124, -170, 118, -150]];
  poly(x, top, lgrad(x, -140, -330, 140, -160, [[0, '#FFFFFF'], [.55, '#F1EEE8'], [1, '#C9C3BA']]), ink, lw);
  for (const k of [-60, 0, 60]) path(x, [[k * .9, -158], [k * 1.05, -240, k * 1.15, -300]], 3.5, 'rgba(120,110,105,.45)');   // складки
  path(x, [[-104, -230], [-96, -290, -46, -300]], 9, 'rgba(255,255,255,.9)');
  // околыш
  poly(x, [[-122, -96], [-126, -156], [0, -168, 126, -156], [122, -96], [0, -84, -122, -96]], lgrad(x, -126, 0, 126, 0, [[0, '#FFFFFF'], [.6, '#ECE8E1'], [1, '#C4BEB4']]), ink, lw);
  path(x, [[-118, -124], [0, -134, 118, -124]], 3, 'rgba(120,110,105,.35)');
  x.restore();
};

// куртка повара: двубортная, белая с холодной тенью, красный шейный платок; низ — фартук
const jacket = cloth((x, S, VW) => {
  const ink = S.colors.ink;
  if (VW && VW.view === 'back') { path(x, [[0, -150], [0, 160]], 3, 'rgba(90,90,110,.5)'); return; }
  const f = VW ? (VW.facing || 0) * (VW.view === 'side' ? 30 : 16) : 0;
  poly(x, [[-30 + f, -152], [30 + f, -152], [16 + f, -112], [0 + f, -98], [-16 + f, -112]], '#C8312B', ink, 4);                // платок
  path(x, [[-18 + f, -140], [6 + f, -130]], 3, 'rgba(255,255,255,.35)');
  path(x, [[24 + f, -110], [30 + f, 70]], 3.5, 'rgba(110,105,120,.55)');                                                       // запах двубортной куртки
  for (const yy of [-70, -22, 26]) for (const xx of [-8, 54]) ell(x, xx + f, yy, 7, 7, '#2A2228', ink, 2);                     // пуговицы
  poly(x, [[-104, 64], [104, 64], [108, 160], [-108, 160]], '#E9E5DD', ink, 4);                                                 // фартук
  path(x, [[-100, 76], [100, 76]], 3, 'rgba(110,105,120,.4)');
  path(x, [[-86, -60], [-96, 0, -86, 50]], 10, 'rgba(255,255,255,.6)');                                                        // блик
});
export function chef({ stache = true } = {}) {
  return jensen({
    name: 'chef', ink: '#141014', shoe: '#120E10', colors: { hair: '#3B2519', stache: '#3B2519' },
    hat: { type: 'K_toque' },
    face: { restMouth: 'smile', moustache: stache, stacheK: .9, browCol: '#3B2519', eyes: [{ x: -46, y: -16, rx: 8.5, ry: 11.5, lw: 6, tilt: 0 }, { x: 46, y: -16, rx: 8.5, ry: 11.5, lw: 6, tilt: 0 }] },
    body: { fillRadial: { at: [-46, -80], r0: 10, to: [-6, -10], r1: 200, stops: [[0, '#FFFFFF'], [.45, '#E8E4DC'], [1, '#A9A3B4']] }, inside: [jacket] },
  });
}

// ---------- гости банкета: несколько причёсок и цветов одежды ----------
const HAIR = {
  K_short: (x, H, S, VW, p, col) => { const ink = S.colors.ink, o = VW && VW.view !== 'back' ? (VW.facing || 0) * 30 : 0;
    poly(x, [[-134, -20], [-150, -120, -70, -170], [10, -188, 90, -160], [146, -120, 134, -20], [120, -64], [o + 60, -96, o - 10, -92], [-90, -96, -120, -62]], col, ink, S.lw); },
  K_bun: (x, H, S, VW, p, col) => { const ink = S.colors.ink;
    ell(x, 10, -176, 52, 44, col, ink, S.lw);
    poly(x, [[-136, -10], [-150, -120, -70, -168], [10, -184, 90, -160], [150, -120, 136, -10], [118, -70], [40, -104, -40, -100], [-118, -70]], col, ink, S.lw); },
  K_bald: (x, H, S, VW, p, col) => { const ink = S.colors.ink; for (const sd of [-1, 1]) poly(x, [[sd * 134, -10], [sd * 140, -70], [sd * 120, -78], [sd * 112, 0]], col, ink, S.lw * .8); },
};
for (const [k, fn] of Object.entries(HAIR)) HATS[k] = (x, H, S, VW, p) => { if (VW && VW.view === 'back' && k === 'K_bald') return; fn(x, H, S, VW, p, S.colors.hair); };
const coat = (c0, c1, c2, lap) => cloth((x, S, VW) => {
  const ink = S.colors.ink; if (VW && VW.view === 'back') return;
  const f = VW ? (VW.facing || 0) * 16 : 0;
  poly(x, [[-30 + f, -150], [30 + f, -150], [0 + f, -40]], '#EEE8DC', null);
  poly(x, [[-8 + f, -140], [8 + f, -140], [6 + f, -60], [0 + f, -48], [-6 + f, -60]], lap, ink, 2.5);
  poly(x, [[-30 + f, -150], [-80, -132], [-50, -30], [0 + f, -40]], c1, ink, 4); poly(x, [[30 + f, -150], [80, -132], [50, -30], [0 + f, -40]], c1, ink, 4);
  path(x, [[-88, -60], [-98, 0, -88, 60]], 9, 'rgba(255,255,255,.18)');
});
const GUESTS = [
  { hair: 'K_short', hc: '#2A1E18', b: ['#7A3A3A', '#5A2626', '#3A1616'], tie: '#D9B24A' },
  { hair: 'K_bun', hc: '#5A3A22', b: ['#2F5866', '#24414C', '#162A32'], tie: '#C8312B' },
  { hair: 'K_bald', hc: '#6A6A70', b: ['#6B5A3A', '#4E4128', '#30281A'], tie: '#2F5866' },
  { hair: 'K_short', hc: '#9A9AA2', b: ['#3A3F5C', '#2A2E46', '#181B2C'], tie: '#C8312B' },
  { hair: 'K_bun', hc: '#1C1418', b: ['#8A5A33', '#6A4226', '#3E2616'], tie: '#24493a' },
  { hair: 'K_short', hc: '#7A4A26', b: ['#4A5A3A', '#36422A', '#202818'], tie: '#D9B24A' },
];
export function guest(i) {
  const g = GUESTS[i % GUESTS.length];
  return jensen({
    name: 'guest' + i, ink: '#141014', shoe: '#120E10', colors: { hair: g.hc },
    hat: { type: g.hair },
    face: { restMouth: 'flat', browCol: g.hc, eyes: [{ x: -46, y: -16, rx: 8.5, ry: 11.5, lw: 6, tilt: 0 }, { x: 46, y: -16, rx: 8.5, ry: 11.5, lw: 6, tilt: 0 }] },
    body: { fillRadial: { at: [-46, -80], r0: 10, to: [-6, -10], r1: 200, stops: [[0, g.b[0]], [.45, g.b[1]], [1, g.b[2]]] }, inside: [coat(...g.b, g.tie)] },
  });
}

// ---------- сковорода и еда (координаты фигуры) ----------
// hand — кисть на ручке; ang — направление ручки от кисти к сковороде; open — насколько видно дно (0 — ребром, 1 — сверху)
export function pan(x, hand, ang, { open = .45, r = 92, ink = '#141014', food = null } = {}) {
  const L = 120, cx = hand[0] + Math.cos(ang) * (L + r * .9), cy = hand[1] + Math.sin(ang) * (L + r * .9) * .55;
  path(x, [hand, [hand[0] + Math.cos(ang) * (L + 10), hand[1] + Math.sin(ang) * (L + 10) * .55]], 18, ink);                     // ручка
  path(x, [hand, [hand[0] + Math.cos(ang) * (L + 10), hand[1] + Math.sin(ang) * (L + 10) * .55]], 9, '#3A3238');
  const ry = r * (.18 + .5 * open);
  ell(x, cx, cy + 10, r, ry + 4, '#1E1A20', ink, 7);                                                                            // борт снаружи
  ell(x, cx, cy, r * .86, ry * .82, '#3D3742', null);                                                                            // дно
  ell(x, cx, cy + 4, r * .97, ry + 1, null, 'rgba(190,180,200,.75)', 4);                                                           // стальной блик по борту — сковорода читается на тёмном полу
  path(x, [[cx - r * .55, cy - ry * .45], [cx - r * .1, cy - ry * .75]], 6, 'rgba(255,255,255,.22)');
  if (food) food(x, cx, cy, ry);
  return [cx, cy];
}
// омлет/блин: золотой эллипс с поджаристым краем; spin — фаза переворота (0..1 → ry сжимается и раскрывается)
export function omelette(x, cx, cy, rx, ry, spin = 0, ink = '#141014', lw = 5) {
  const k = Math.abs(Math.cos(spin * Math.PI)), side = Math.cos(spin * Math.PI) < 0;
  ell(x, cx, cy, rx, Math.max(Math.min(4, ry), ry * k), side ? '#D9952E' : '#F6C845', lw > .4 ? ink : null, lw);
  if (k > .3) { ell(x, cx - rx * .2, cy - ry * k * .2, rx * .45, ry * k * .3, side ? 'rgba(160,80,20,.5)' : 'rgba(255,240,170,.8)', null); ell(x, cx + rx * .35, cy + ry * k * .1, rx * .12, ry * k * .14, side ? 'rgba(110,50,10,.5)' : '#E9A93A', null); }
}
// блин (рифма с блинами Denny's): румяный круг с тёмной кромкой, светлой серединой и кусочком масла; spin — переворот
export function pancake(x, cx, cy, rx, ry, spin = 0, ink = '#141014', lw = 5, butter = false) {
  const k = Math.max(.3, Math.abs(Math.cos(spin * Math.PI))), side = Math.cos(spin * Math.PI) < 0, h = Math.max(Math.min(4, ry), ry * k);
  ell(x, cx, cy + Math.max(1, ry * .12), rx, h, '#9A5520', null);                                                                   // толщина (ребро)
  ell(x, cx, cy, rx, h, side ? '#C9802F' : '#E6A752', lw > .4 ? ink : null, lw);
  if (k > .3) {
    ell(x, cx - rx * .12, cy - h * .08, rx * .62, h * .6, side ? 'rgba(150,80,25,.45)' : 'rgba(255,214,140,.75)', null);
    for (const [a, b] of [[.35, .2], [-.4, .25], [.1, -.35]]) ell(x, cx + rx * a, cy + h * b, rx * .07, h * .07, 'rgba(120,60,20,.45)', null);
    if (butter && !side) { x.save(); x.translate(cx, cy - h * .15); x.beginPath(); x.rect(-rx * .16, -h * .2, rx * .32, h * .36); x.fillStyle = '#FFF2B0'; x.fill(); if (lw > .4) { x.lineWidth = lw * .5; x.strokeStyle = ink; x.stroke(); } x.restore(); }
  }
}

// ---------- ОДИН дизайн повара на весь ролик ----------
// Тот же повар нужен в других планах (слайд CUDA #66, узлы нейросети #71). Импорт из другой сцены:
//   import { cook, drawCook } from '../kitchen/chef.js';
//   const C = cook();                         // Stickman: белая куртка, красный платок, колпак, усы
//   drawCook(ctx, C, { t, flip: 0..1 | -1, scale, x, y });   // повар со сковородой и блином, ступни в (x, y), scale — px на единицу фигуры (~1050 ед. рост)
export function cook() { return chef({ stache: true }); }
export function drawCook(ctx, C, { t = 0, flip = -1, scale = .2, x = 0, y = 0, big = 1 } = {}) {
  let hand = [-120, -508], ang = Math.PI + .08, open = .5, fy = 0, spin = 0, mouth = 'smile', lk = [0, .1];
  const sg = (v, a, b) => Math.min(1, Math.max(0, (v - a) / (b - a)));
  if (flip < 0) hand = [-120 + Math.sin(t * 7) * 6, -508 + Math.cos(t * 7) * 4];
  else {
    const u = flip, dip = -Math.sin(sg(u, 0, .2) * Math.PI), kick = u < .2 ? 0 : Math.sin(sg(u, .2, .4) * Math.PI), fl = sg(u, .24, .86);
    hand = [-120 - kick * 10, -508 + dip * -22 - kick * 46]; ang = Math.PI + .08 - kick * .28; open = .5 - kick * .15;
    if (fl > 0 && fl < 1) { fy = -4 * fl * (1 - fl) * 420 * big; spin = fl * 2; mouth = 'O'; lk = [0, -.8]; }
  }
  const p = { view: 'front', mouth, look: lk, blink: 0, arms: [{ to: hand, w: 11 }, { to: [112, -392], w: 11 }] };
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
  C.draw(ctx, p);
  pan(ctx, hand, ang, { open, food: (xx, cx, cy, ry) => pancake(xx, cx, cy + fy, 78, ry, spin) });
  ell(ctx, hand[0], hand[1], 13, 13, '#141014');
  ctx.restore();
}
