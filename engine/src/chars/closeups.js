// closeups.js: крупные 2D-слои, которые рисуются поверх кадра или в слое персонажей (экранные координаты, пиксели):
//   bootsRow(ctx, opt)   — сверхкрупный план ряда сапог у земли: поднимаются и бьют разом ('unison') или вразнобой ('rain')
//   boot2D(ctx, opt)     — один сапог (для своей расстановки, например по проекциям точек настила)
//   bigHand(ctx, opt)    — большая рука зрителя из-за нижнего края: 'point' — толкает одним пальцем, 'flat' — давит ладонью
//   marble2D(ctx, ...)   — стеклянный шарик (гэг «bag of spilled marbles»)
// Всё — чистые функции параметров: фаза задаётся снаружи (t * темп), случайность — hash(i).
import { clamp, lerp, seg, smooth, E } from '../core/ease.js';
import { hash } from '../core/rng.js';

const TAU = Math.PI * 2, INK = '#2C1826', fract = v => v - Math.floor(v);

// ---------- сапог в профиль, носок вправо. (x, y) — середина подошвы на земле, s — пикселей на единицу (сапог ~190 ед. в длину) ----------
// lift — высота над землёй (в единицах сапога), tilt — наклон носка, squash — сжатие при ударе, leg — цвет штанины, lw — контур
export function boot2D(x, { x: px, y: py, s = 1, lift = 0, tilt = 0, squash = 0, boot = '#2A2228', sole = '#141014', leg = '#3A3F52', cuff = null, ink = INK, lw = 9, legLen = 900, flip = 1 } = {}) {
  x.save(); x.translate(px, py - lift * s); x.scale(s * flip, s); x.rotate(tilt); x.scale(1 + squash * .5, 1 - squash); x.lineJoin = 'round'; x.lineCap = 'round';
  // штанина уходит вверх за кадр
  x.beginPath(); x.moveTo(-74, -168); x.lineTo(-66, -legLen); x.lineTo(26, -legLen); x.lineTo(24, -168); x.closePath();
  const gl = x.createLinearGradient(-74, 0, 26, 0); gl.addColorStop(0, leg); gl.addColorStop(1, 'rgba(0,0,0,.28)'); x.fillStyle = leg; x.fill(); x.fillStyle = gl; x.fill(); x.lineWidth = lw; x.strokeStyle = ink; x.stroke();
  // голенище и головка
  x.beginPath(); x.moveTo(-84, -196); x.lineTo(34, -196); x.bezierCurveTo(30, -120, 34, -86, 60, -74); x.bezierCurveTo(100, -64, 122, -44, 120, -16); x.lineTo(-92, -16); x.bezierCurveTo(-86, -70, -90, -130, -84, -196); x.closePath();
  const g = x.createLinearGradient(-90, 0, 120, 0); g.addColorStop(0, '#4A404A'); g.addColorStop(.35, boot); g.addColorStop(1, '#17121A'); x.fillStyle = g; x.fill(); x.lineWidth = lw; x.strokeStyle = ink; x.stroke();
  if (cuff) { x.beginPath(); x.rect(-88, -206, 126, 30); x.fillStyle = cuff; x.fill(); x.stroke(); }
  x.beginPath(); x.moveTo(-58, -170); x.quadraticCurveTo(-64, -110, -62, -50); x.lineWidth = lw * .8; x.strokeStyle = 'rgba(255,255,255,.2)'; x.stroke();          // блик
  x.beginPath(); x.moveTo(64, -58); x.quadraticCurveTo(96, -50, 104, -32); x.stroke();
  // подошва и каблук
  x.beginPath(); x.moveTo(-98, -18); x.lineTo(126, -18); x.quadraticCurveTo(132, -6, 124, 0); x.lineTo(-20, 0); x.lineTo(-22, -6); x.lineTo(-40, -6); x.lineTo(-42, 0); x.lineTo(-96, 0); x.closePath();
  x.fillStyle = sole; x.fill(); x.lineWidth = lw; x.strokeStyle = ink; x.stroke();
  x.restore();
}
// кольцо пыли от удара: age 0..1
function dustRing(x, px, py, r, age, col = '214,190,150') {
  if (age <= 0 || age >= 1) return; const k = E.outCubic(age), a = (1 - age) * .75;
  x.save(); x.translate(px, py); x.scale(1, .26);
  x.beginPath(); x.arc(0, 0, r * (.35 + 1.25 * k), 0, TAU); x.lineWidth = r * .34 * (1 - .6 * age); x.strokeStyle = `rgba(${col},${a.toFixed(3)})`; x.stroke();
  x.restore();
  for (let j = 0; j < 7; j++) {                                              // клубки по кольцу
    const an = j / 7 * TAU + hash(j * 3.1 + px) * 1.2, rr = r * (.4 + 1.2 * k), bx = px + Math.cos(an) * rr, by = py + Math.sin(an) * rr * .26 - r * .22 * k * (1 - age);
    x.beginPath(); x.arc(bx, by, r * (.12 + .16 * k), 0, TAU); x.fillStyle = `rgba(${col},${(a * .8).toFixed(3)})`; x.fill();
  }
}
// фаза одного сапога -> { lift 0..1, tilt, squash, hitAge (0..1 после удара, иначе -1) }: подъём, пауза наверху, удар вниз
export function stompCycle(ph) {
  const q = fract(ph), T_UP = .5, T_HOLD = .66, T_HIT = .76;
  const lift = q < T_UP ? E.outCubic(q / T_UP) : q < T_HOLD ? 1 : q < T_HIT ? 1 - E.inCubic((q - T_HOLD) / (T_HIT - T_HOLD)) : 0;
  const after = q >= T_HIT ? (q - T_HIT) / (1 - T_HIT) : -1;
  return { lift, tilt: q < T_HIT ? -.09 * lift : 0, squash: after >= 0 ? .16 * Math.exp(-after * 9) * Math.cos(after * 22) : 0, hitAge: after };
}
// ряд сапог у самой земли. Камера у земли смотрит вдоль ряда: ближний сапог крупный слева, дальние мельче и выше.
// opt: W, H, phase (циклы: 1 = один удар), mode: 'unison' | 'rain', n, ground (доля высоты кадра под ближним сапогом),
//      horizon (доля высоты, куда сходится ряд), size (длина ближнего сапога в долях ширины), lift (высота подъёма, ед. сапога),
//      seed, colors { boot, sole, leg, cuff, dust }, pebbles: true
export function bootsRow(x, { W = 720, H = 1280, phase = 0, mode = 'unison', n = 6, ground = .8, horizon = .5, size = .5, lift = 150, seed = 1, colors = {}, pebbles = true, x0 = .22, spread = 1.05 } = {}) {
  const boots = [];
  for (let i = 0; i < n; i++) {
    const k = 1 / (1 + i * .5), gy = lerp(horizon, ground, k) * H, bx = (x0 + (1 - k) * spread * 1.15) * W, s = size * W / 220 * k;
    const ph = mode === 'rain' ? phase * (.8 + .5 * hash(i * 7.3 + seed)) + hash(i * 3.7 + seed * 1.3) : phase;
    boots.push({ i, k, gy, bx, s, c: stompCycle(ph), n: Math.floor(ph) });
  }
  x.save(); x.lineJoin = 'round'; x.lineCap = 'round';
  for (let j = n - 1; j >= 0; j--) {                                         // дальние первыми
    const b = boots[j], c = b.c;
    // тень-пятно: сжимается, когда сапог поднят
    x.beginPath(); x.ellipse(b.bx + 10 * b.s, b.gy + 4 * b.s, 120 * b.s * (1 - .45 * c.lift), 20 * b.s * (1 - .45 * c.lift), 0, 0, TAU); x.fillStyle = `rgba(30,20,20,${(.34 - .16 * c.lift).toFixed(3)})`; x.fill();
    if (c.hitAge >= 0) dustRing(x, b.bx + 10 * b.s, b.gy, 150 * b.s, c.hitAge * 1.6, colors.dust);
    boot2D(x, { x: b.bx, y: b.gy, s: b.s, lift: c.lift * lift, tilt: c.tilt, squash: c.squash, lw: Math.max(3, 9 * Math.min(1, .5 + b.k * .6)) / 1, legLen: 2400, ...colors });
    if (pebbles && c.hitAge >= 0 && c.hitAge < .7) for (let q = 0; q < 4; q++) {                       // камешки подпрыгивают
      const a = c.hitAge / .7, sd = hash(q * 5.1 + b.i * 2.3 + b.n) - .5, hx = b.bx + (sd * 420 + 20) * b.s, hy = b.gy - (4 * a * (1 - a)) * (60 + 70 * hash(q + b.i)) * b.s;
      x.beginPath(); x.ellipse(hx, hy - 6 * b.s, 9 * b.s, 7 * b.s, sd * 3 + a * 4, 0, TAU); x.fillStyle = '#B9A283'; x.fill(); x.lineWidth = 3.2 * b.s; x.strokeStyle = INK; x.stroke();
    }
  }
  x.restore();
  return boots;
}

// ---------- большая рука зрителя ----------
// (x, y) — кончик указательного пальца ('point') или центр ладони ('flat'); рука уходит вниз за кадр. s — пикселей на единицу
// (ладонь ~230 ед. в ширину), rot — поворот вокруг этой точки, press 0..1 — нажим (палец/ладонь чуть плющится),
// morph 0..1 — переход point -> flat (остальные пальцы разгибаются), skin / sleeve / cuff — цвета
export function bigHand(x, { x: px, y: py, s = 1, rot = 0, pose = 'point', press = 0, morph = null, skin = '#FCFAFB', shade = '#D9D0DD', sleeve = '#3E6FB8', cuff = '#F7F3EA', ink = INK, lw = 11, armLen = 1600 } = {}) {
  const m = morph == null ? (pose === 'flat' ? 1 : 0) : clamp(morph);
  x.save(); x.translate(px, py); x.rotate(rot); x.scale(s, s); x.lineJoin = 'round'; x.lineCap = 'round';
  const cap = (x0, y0, x1, y1, w, fill) => { x.beginPath(); const a = Math.atan2(y1 - y0, x1 - x0), nx = -Math.sin(a) * w / 2, ny = Math.cos(a) * w / 2;
    x.moveTo(x0 + nx, y0 + ny); x.lineTo(x1 + nx, y1 + ny); x.arc(x1, y1, w / 2, a + Math.PI / 2, a - Math.PI / 2, true); x.lineTo(x0 - nx, y0 - ny); x.arc(x0, y0, w / 2, a - Math.PI / 2, a + Math.PI / 2, true); x.closePath();
    x.fillStyle = fill; x.fill(); x.lineWidth = lw; x.strokeStyle = ink; x.stroke(); };
  // раскладка: указательный палец — ось x = 0; ладонь правее и ниже. В позе flat точка привязки переезжает в центр ладони.
  const ox = lerp(0, -88, m), oy = lerp(0, -330, m); x.translate(ox, oy);
  const palmTop = 232 - 26 * press, fl = [lerp(40, 236, m), lerp(46, 252, m), lerp(40, 214, m)];                 // длины трёх остальных пальцев
  const g = x.createLinearGradient(-60, 0, 230, 0); g.addColorStop(0, skin); g.addColorStop(.62, skin); g.addColorStop(1, shade);
  // рукав и манжета
  x.beginPath(); x.moveTo(-30, 520); x.lineTo(-56, armLen); x.lineTo(256, armLen); x.lineTo(214, 520); x.closePath(); x.fillStyle = sleeve; x.fill(); x.lineWidth = lw; x.strokeStyle = ink; x.stroke();
  x.beginPath(); x.roundRect(-44, 486, 272, 70, 22); x.fillStyle = cuff; x.fill(); x.stroke();
  // большой палец (слева, прижат; в позе flat отставлен)
  cap(lerp(-22, -30, m), 400, lerp(-64, -128, m), lerp(300, 318, m), 62, g);
  // ладонь / тыльная сторона
  x.beginPath(); x.roundRect(-40, palmTop - 6, 236, 300 + 26 * press, 60); x.fillStyle = g; x.fill(); x.lineWidth = lw; x.strokeStyle = ink; x.stroke();
  // три пальца: согнуты (костяшки) или вытянуты
  [66, 126, 180].forEach((fx, i) => cap(fx, palmTop + 30, fx + lerp(0, (i - .5) * 8, m), palmTop + 30 - fl[i], 56 - i * 3, g));
  // указательный
  cap(0, palmTop + 40, 0, 31 + 14 * press * (1 - m) - lerp(0, -36, m), 62, g);
  // стыки пальцев с ладонью закрываем заливкой, оставляя складки
  x.beginPath(); x.roundRect(-32, palmTop + 22, 222, 110, 40); x.fillStyle = g; x.fill();
  x.lineWidth = lw * .55; x.strokeStyle = 'rgba(44,24,38,.45)'; x.beginPath(); for (const fx of [34, 97, 154]) { x.moveTo(fx, palmTop + 2); x.lineTo(fx, palmTop + 44); } x.stroke();
  if (m < .5) { x.beginPath(); x.moveTo(-17, 26 + 14 * press); x.quadraticCurveTo(0, 12 + 14 * press, 17, 26 + 14 * press); x.lineWidth = lw * .5; x.stroke(); }     // ноготь
  x.restore();
}

// ---------- стеклянный шарик: (cx, cy) — центр, r — радиус в пикселях, roll — угол качения (рад) ----------
export function marble2D(x, cx, cy, r, roll = 0, { col = '#3565C2', lt = '#8FB6F2', dk = '#1E3E86', swirl = '#F7F3EA', ink = INK, lw = null } = {}) {
  x.save(); x.translate(cx, cy);
  const g = x.createRadialGradient(-r * .3, -r * .35, r * .1, 0, 0, r); g.addColorStop(0, lt); g.addColorStop(.55, col); g.addColorStop(1, dk);
  x.beginPath(); x.arc(0, 0, r, 0, TAU); x.fillStyle = g; x.fill();
  x.save(); x.clip(); x.rotate(roll);                                         // завиток внутри крутится вместе с шариком
  x.beginPath(); x.moveTo(-r * .75, -r * .1); x.bezierCurveTo(-r * .3, -r * .75, r * .3, r * .55, r * .78, r * .05); x.bezierCurveTo(r * .3, r * .95, -r * .3, -r * .3, -r * .75, -r * .1); x.closePath(); x.fillStyle = swirl; x.globalAlpha = .82; x.fill();
  x.beginPath(); x.arc(r * .42, -r * .5, r * .16, 0, TAU); x.arc(-r * .5, r * .48, r * .12, 0, TAU); x.fillStyle = '#F2C530'; x.fill();
  x.restore();
  x.beginPath(); x.arc(0, 0, r, 0, TAU); x.lineWidth = lw ?? Math.max(1.2, r * .13); x.strokeStyle = ink; x.stroke();
  x.beginPath(); x.ellipse(-r * .36, -r * .42, r * .26, r * .15, -.7, 0, TAU); x.fillStyle = 'rgba(255,255,255,.85)'; x.fill();      // блик не крутится
  x.restore();
}
