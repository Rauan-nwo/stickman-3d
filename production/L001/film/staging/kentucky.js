// staging/kentucky.js — L08 Кентукки: спальня интерната (bg_dorm_room) и санузел (bg_kentucky_day).
// Юный Дженсен (9 лет) стоит на досках в пятне солнца из окна, рядом стоймя сундук выше него; свет — окно сверху по центру.
// Вставка «ведро и швабра»: детская рука в полосатом рукаве входит слева и берёт нарисованную швабру за черенок.
import { act, blinkAt, shoulder, restHand, arcHand, elbowArm, ell, noirShade, clamp, lerp, E } from 'engine';
import { youngJensen } from '../chars.js';
import { trunk } from '../props.js';
import { W, H, toS, plate, img, lazy, fig, contact } from './common.js';
import dormPlate from '../../assets/bg_dorm_room.png';
import bathPlate from '../assets/bath_nomop.png';                 // санузел без нарисованной швабры (make_plates.py): швабру играет 2D-швабра
import { polyMask, masked } from './common.js';

export const CFG = {
  dorm: { feet: [760, 958], fs: .58, trunk: [985, 962, 440, 1000], light: [.45, -.9] },   // сундук: низ-центр x, y, ширина и высота в ед. фигуры
  bath: { grab: [912, 700], sleeve: [760, 820] },                                         // кисть на черенке швабры; откуда входит рука
  views: { dorm: { cx: 900, cy: 600, k: 1.12 }, bath: { cx: 905, cy: 640, k: 1.25 } },
  // санузел, средний план (#30): мальчик у ведра на плитке, швабра выше него падает в ведро; ведро — передний план для головки швабры
  bathMid: { feet: [822, 905], fs: .55, light: [-.45, -.9],
    bucket: [[903, 672], [1097, 672], [1085, 830], [1070, 862], [925, 862], [912, 830]],          // корпус ведра (без отжима): швабра внутри — за ним
    mop: { len: 640, head: 105, x: [992, 950], bottom: 742, lift: 120 } },                         // швабра: длина, головка, низ/верх по x, низ в ведре, подъём до падения
};
const I = { dorm: img(dormPlate), bath: img(bathPlate) };
export const A = lazy([I.dorm, I.bath], () => ({ dorm: I.dorm, bath: I.bath, bucket: masked(I.bath, polyMask([CFG.bathMid.bucket])) }));
const YJ = youngJensen(); YJ.spec.shade = noirShade(CFG.dorm.light, { warm: '#ffd89a' });
export const CAST = { YJ };

// спальня: o = { look, grip (0..1 — рука на ручке сундука), keys }
export function dorm(ctx, v, t, T, o = {}) {
  const a = A(), c = CFG.dorm; if (!a) return;
  if (!o.solo) plate(ctx, a.dorm, v);
  const F = toS(v, c.feet), s = c.fs * v.k, [tx, ty, tw, th] = c.trunk, TP = toS(v, [tx, ty]);
  if (!o.solo) { contact(ctx, F[0], F[1] + 3 * s, 140 * s, 20 * s, .55, .2); contact(ctx, TP[0], TP[1] + 2 * s, tw * .62 * s, 22 * s, .55, .2); }
  if (!o.solo && !o.noTrunk) trunk(ctx, TP[0], TP[1], tw * s, th * s);
  const S = YJ.spec, p = act(t, o.keys || [[0, 'neutral']]);
  Object.assign(p, { blink: blinkAt(t, 6), view: 'threeQuarter', facing: 1, stance: 'stand', look: o.look || [.4, -.3] });
  p.bob = (p.bob || 0) * .4; p.sq = (p.sq || 0) * .4; p.lean = (p.lean || 0) * .4 + .03; p.tilt = (p.tilt || 0) * .5;
  // правая рука держит боковую ручку сундука (сундук справа; ручка — на его левом боку, на уровне кисти)
  const shR = shoulder(S, 1), handle = [(TP[0] - tw * .5 * s - F[0]) / s + 10, -(th * .5)];
  const toFigD = P => [(P[0] - c.feet[0]) / c.fs, (P[1] - c.feet[1]) / c.fs];
  p.arms = [{ to: restHand(S, -1), w: 11 }, { to: o.point ? arcHand(shR, restHand(S, 1), toFigD(o.point), clamp(o.pointK ?? 1)) : arcHand(shR, restHand(S, 1), [Math.min(handle[0], shR[0] + 200), Math.max(-430, Math.min(-300, handle[1]))], o.grip ?? 1), w: 11 }];   // point — показывает рукой на точку плейта
  fig(ctx, YJ, p, v, c.feet, c.fs, 'feet');
}
// санузел-вставка: детская рука хватает швабру; k 0..1 — подход кисти; splash 0..1 — брызги из ведра
export function bathInsert(ctx, v, t, o = {}) {
  const a = A(), c = CFG.bath; if (!a) return;
  if (!o.solo) plate(ctx, a.bath, v);
  if (o.splash > 0 && o.splash < 1 && !o.solo) {                      // брызги из ведра (швабру только что бросили)
    const u = o.splash; for (let i = 0; i < 12; i++) { const an = -Math.PI / 2 + ((i * .618) % 1 - .5) * 1.8, sp = 260 + 90 * ((i * 37) % 5) / 5;
      const P = toS(v, [1010 + Math.cos(an) * sp * u, 640 + Math.sin(an) * sp * u + 700 * u * u]); ctx.fillStyle = `rgba(190,225,240,${.85 * (1 - u)})`; ctx.beginPath(); ctx.ellipse(P[0], P[1], 7 * v.k, 10 * v.k, an, 0, Math.PI * 2); ctx.fill(); } }
  const k = clamp(o.k ?? 1), sh = toS(v, c.sleeve), g = toS(v, c.grab), h = [lerp(sh[0] + 60 * v.k, g[0], E.outCubic(k)), lerp(sh[1] + 40 * v.k, g[1], E.outCubic(k))];
  const s = .58 * v.k * 1.25, ink = YJ.spec.colors.ink;
  ctx.save(); ctx.translate(sh[0], sh[1]); ctx.scale(s, s);
  const L = Math.hypot(h[0] - sh[0], h[1] - sh[1]) / s * 1.08;
  elbowArm(ctx, [0, 0], [(h[0] - sh[0]) / s, (h[1] - sh[1]) / s], Math.max(L, 200), -1, undefined, 15, ink, null, YJ.spec.shade, { ink });
  ctx.restore();
  ctx.save(); ctx.translate(sh[0], sh[1]); ctx.rotate(Math.atan2(h[1] - sh[1], h[0] - sh[0])); ctx.fillStyle = '#E9DFC8'; ctx.strokeStyle = ink; ctx.lineWidth = 6 * s;   // рукав футболки в полоску: входит из-за кадра
  ctx.beginPath(); ctx.roundRect(-900 * s, -40 * s, 930 * s, 80 * s, 22 * s); ctx.fill(); ctx.stroke(); ctx.fillStyle = 'rgba(46,92,160,.8)'; for (let q = -880; q < 0; q += 60) ctx.fillRect(q * s, -38 * s, 22 * s, 76 * s); ctx.restore();
  ell(ctx, h[0], h[1], 15 * s, 15 * s, ink, null);
}
export const views = CFG.views;

// ---------- санузел, средний план: юный Дженсен, швабра выше него падает в ведро (брызги), он берёт её ----------
// o = { drop: момент падения (с), grab: момент «берёт» (с) }
const YB = youngJensen(); YB.spec.shade = noirShade(CFG.bathMid.light, { warm: '#ffd89a' });
function mop(ctx, v, lift, tilt) {
  const m = CFG.bathMid.mop, b = [m.x[0], m.bottom - lift], top = [m.x[1] + tilt, m.bottom - lift - m.len];
  const B = toS(v, b), T = toS(v, top), s = v.k, ink = '#1C1418';
  ctx.save(); ctx.lineCap = 'round';
  ctx.strokeStyle = ink; ctx.lineWidth = 15 * s; ctx.beginPath(); ctx.moveTo(B[0], B[1]); ctx.lineTo(T[0], T[1]); ctx.stroke();       // черенок
  ctx.strokeStyle = '#B5723A'; ctx.lineWidth = 9 * s; ctx.stroke(); ctx.strokeStyle = 'rgba(255,225,170,.5)'; ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.moveTo(B[0] - 2 * s, B[1]); ctx.lineTo(T[0] - 2 * s, T[1]); ctx.stroke();
  for (let i = -5; i <= 5; i++) { ctx.strokeStyle = ink; ctx.lineWidth = 9 * s; ctx.beginPath(); ctx.moveTo(B[0], B[1] - 6 * s); ctx.quadraticCurveTo(B[0] + i * 7 * s, B[1] + 50 * s, B[0] + i * 8 * s, B[1] + m.head * s);   // головка: верёвки
    ctx.stroke(); ctx.strokeStyle = '#EDE6D2'; ctx.lineWidth = 5 * s; ctx.stroke(); }
  ctx.restore();
  return (y) => { const k = (b[1] - y) / (b[1] - top[1]); return [lerp(b[0], top[0], k), y]; };   // точка черенка на высоте y (пиксели плейта)
}
export function bathMid(ctx, v, t, T, o = {}) {
  const a = A(), c = CFG.bathMid; if (!a) return;
  if (!o.solo && !o.noPlate) plate(ctx, a.bath, v);
  const fall = E.inCubic(clamp((t - (o.drop - .14)) / .14)), lift = c.mop.lift * (1 - fall);          // падение 4 кадра, с ускорением
  const F = toS(v, c.feet), s = c.fs * v.k;
  if (!o.solo) contact(ctx, F[0], F[1] + 3 * s, 130 * s, 20 * s, .5, .25);
  const handleAt = mop(ctx, v, lift, 0);
  if (!o.solo) plate(ctx, a.bucket, v);                                                                  // ведро перед головкой швабры
  // брызги из ведра на падении
  const u = (t - o.drop) / .5;
  if (u > 0 && u < 1 && !o.solo) for (let i = 0; i < 14; i++) { const an = -Math.PI / 2 + ((i * .618) % 1 - .5) * 2, sp = 280 + 110 * ((i * 37) % 5) / 5;
    const P = toS(v, [960 + Math.cos(an) * sp * u, 676 + Math.sin(an) * sp * u + 900 * u * u]); ctx.fillStyle = `rgba(200,232,245,${.9 * (1 - u)})`; ctx.beginPath(); ctx.ellipse(P[0], P[1], 6 * v.k, 9 * v.k, an, 0, Math.PI * 2); ctx.fill(); }
  // мальчик: до падения держит швабру над ведром (правая рука на черенке), отпускает; на «Kentucky» тянется вверх и берёт черенок выше головы
  const S = YB.spec, p = act(t, o.keys || [[0, 'neutral'], [o.drop + .05, 'shock'], [o.drop + .5, 'neutral']]);
  Object.assign(p, { blink: blinkAt(t, 6), view: 'threeQuarter', facing: 1, stance: 'stand' });
  p.bob = (p.bob || 0) * .3; p.sq = (p.sq || 0) * .3; p.lean = (p.lean || 0) * .3; p.tilt = (p.tilt || 0) * .4; p.hatDy = 0; p.look = o.look || [.5, t < o.grab ? .2 : -.6];
  const toFig = P => [(P[0] - c.feet[0]) / c.fs, (P[1] - c.feet[1]) / c.fs];
  const shR = shoulder(S, 1), hold = toFig(handleAt(c.feet[1] - 470 * c.fs - lift)), grabP = toFig(handleAt(c.feet[1] - 620 * c.fs));
  let kR, toR;
  if (t < o.drop) { kR = 1; toR = hold; }                                                                 // держит
  else if (t < o.grab - .3) { kR = 1 - E.inOutCubic(clamp((t - o.drop) / .3)); toR = hold; }             // отпустил — рука опускается
  else { kR = E.outBack(clamp((t - (o.grab - .3)) / .3)); toR = grabP; }                                  // тянется вверх и берёт
  p.arms = [{ to: restHand(S, -1), w: 11 }, { to: arcHand(shR, restHand(S, 1), toR, kR), w: 11 }];
  fig(ctx, YB, p, v, c.feet, c.fs, 'feet');
}

// ================= гл. 2: санузел (окно, ряд кабинок, отрывной календарь), спальня (сосед), вставки книги и рукопожатия =================
import { roommate } from '../chars.js';
CFG.bathWin = [702, 196, 1190, 426];                 // стекло окна санузла (плейт bath): x0, y0, x1, y1; линия поля ~ y 380
CFG.stalls = [1250, 40, 1920, 1000];                 // кадр кабинок справа (плейт bath) — источник для «ряда до горизонта»
CFG.roomBed = { seat: [420, 706], fs: .86, light: [.45, -.9], sag: [400, 712, 190] };   // нижняя койка слева (bg_dorm_room): сиденье, масштаб, прогиб (x, y, ширина)
CFG.barbell = [1270, 770];                           // штанга на полу спальни
const RM = roommate(); RM.spec.shade = noirShade(CFG.roomBed.light, { warm: '#ffd89a' });
export const CAST2 = { RM };
const INK = '#1C1418';

// мальчики идут в поле за окном (крошечные силуэты с вилами), последний — брат в клетчатой рубашке оглядывается на look (с)
export function boysInWindow(ctx, v, t, look) {
  const [x0, y0, x1, y1] = CFG.bathWin, A0 = toS(v, [x0, y0]), A1 = toS(v, [x1, y1]), s = v.k;
  ctx.save(); ctx.beginPath(); ctx.rect(A0[0], A0[1], A1[0] - A0[0], A1[1] - A0[1]); ctx.clip();
  for (let i = 0; i < 6; i++) {
    const x = x0 - 60 + 80 * t - i * 84, y = 418 - i * 1.5, P = toS(v, [x, y]), h = (i === 5 ? 56 : 62) * s, ph = t * 7 + i;
    const brother = i === 5, turn = brother ? clamp((t - look) / .25) : 0;
    ctx.strokeStyle = '#2a2a24'; ctx.lineWidth = 3 * s; ctx.lineCap = 'round';
    for (const sg of [-1, 1]) { ctx.beginPath(); ctx.moveTo(P[0], P[1] - h * .45); ctx.lineTo(P[0] + sg * Math.sin(ph) * h * .18, P[1]); ctx.stroke(); }   // ноги-шаги
    ctx.fillStyle = brother ? '#b4302a' : '#5a5a4c'; ctx.beginPath(); ctx.roundRect(P[0] - h * .16, P[1] - h * .82, h * .32, h * .4, 3 * s); ctx.fill();
    if (brother) { ctx.strokeStyle = 'rgba(255,230,200,.7)'; ctx.lineWidth = 1.2 * s; for (const q of [-.08, .06]) { ctx.beginPath(); ctx.moveTo(P[0] + q * h, P[1] - h * .82); ctx.lineTo(P[0] + q * h, P[1] - h * .42); ctx.stroke(); } }   // клетка
    ctx.fillStyle = brother && turn > .5 ? '#f2e8d6' : '#2a2a24'; ctx.beginPath(); ctx.arc(P[0], P[1] - h * .95, h * .14, 0, 6.28); ctx.fill();
    if (brother && turn > .5) { ctx.strokeStyle = INK; ctx.lineWidth = 1.5 * s; ctx.stroke(); }
    ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.moveTo(P[0] + h * .1, P[1] - h * .7); ctx.lineTo(P[0] + h * .55, P[1] - h * 1.25); ctx.stroke();   // вилы на плече
    for (const q of [-.06, 0, .06]) { ctx.beginPath(); ctx.moveTo(P[0] + h * (.55 + q), P[1] - h * (1.25 + q * .3)); ctx.lineTo(P[0] + h * (.62 + q), P[1] - h * 1.42); ctx.stroke(); }
  }
  ctx.restore();
}
// юный Дженсен стоит на плитке у ведра плейта (санузел), смотрит look; o = { keys, look, hold: швабра в руке (lift) }
export function boyByBucket(ctx, v, t, T, o = {}) {
  const c = CFG.bathMid, S = YB.spec, F = toS(v, c.feet), s = c.fs * v.k;
  if (!o.solo) contact(ctx, F[0], F[1] + 3 * s, 130 * s, 20 * s, .5, .25);
  const p = act(t, o.keys || [[0, 'neutral']]); Object.assign(p, { blink: blinkAt(t, 6), view: 'threeQuarter', facing: o.facing ?? 1, stance: 'stand', look: o.look || [.4, 0] });
  p.bob = (p.bob || 0) * .3; p.sq = (p.sq || 0) * .3; p.lean = (p.lean || 0) * .3; p.tilt = (p.tilt || 0) * .4;
  const toFig = P => [(P[0] - c.feet[0]) / c.fs, (P[1] - c.feet[1]) / c.fs], shR = shoulder(S, 1);
  p.arms = [{ to: restHand(S, -1), w: 11 }, { to: o.handTo ? arcHand(shR, restHand(S, 1), toFig(o.handTo), 1) : restHand(S, 1), w: 11 }];
  fig(ctx, YB, p, v, c.feet, c.fs, 'feet');
}
// «каждый санузел»: кабинки справа повторяются, уменьшаясь к окну (ряд до горизонта); двери хлопают по очереди от дальней к ближней
export function stallRow(ctx, v, t, n = 7, t0 = .05, dt = .16) {
  const a = A(); if (!a) return; const [sx0, sy0, sx1, sy1] = CFG.stalls, VP = toS(v, [940, 330]);
  for (let i = n - 1; i >= 1; i--) {
    const k = Math.pow(.6, i), D0 = toS(v, [sx0, sy0]), D1 = toS(v, [sx1, sy1]);
    const x0 = VP[0] + (D0[0] - VP[0]) * k, y0 = VP[1] + (D0[1] - VP[1]) * k, w = (D1[0] - D0[0]) * k, h = (D1[1] - D0[1]) * k;
    const ts = t0 + (n - 1 - i) * dt, u = (t - ts) / .2, j = u > 0 && u < 1 ? Math.sin(u * 30) * (1 - u) * 6 * k * v.k : 0;
    ctx.drawImage(stallDark(a, i), x0 + j, y0, w, h);                                                       // дальние — темнее (воздух); затемнение только внутри копии, без прямоугольника
  }
}
// копия кабинок с мягкими краями слева и сверху (без шва-прямоугольника у копий)
let SF = null; function stallSoft(a) { if (SF) return SF; const [sx0, sy0, sx1, sy1] = CFG.stalls, w = sx1 - sx0, h = sy1 - sy0; SF = document.createElement('canvas'); SF.width = w; SF.height = h; const x = SF.getContext('2d'); x.drawImage(a.bath, sx0, sy0, w, h, 0, 0, w, h);
  x.globalCompositeOperation = 'destination-in'; let g = x.createLinearGradient(0, 0, w * .3, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,1)'); x.fillStyle = g; x.fillRect(0, 0, w, h);
  g = x.createLinearGradient(0, 0, 0, h * .15); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,1)'); x.fillStyle = g; x.fillRect(0, 0, w, h);
  g = x.createLinearGradient(0, h * .82, 0, h); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); return SF; }   // и снизу: шов по полу не виден
const SD = {}; function stallDark(a, i) { if (SD[i]) return SD[i]; const src = stallSoft(a), c = document.createElement('canvas'); c.width = src.width; c.height = src.height; const x = c.getContext('2d');
  x.drawImage(src, 0, 0); x.globalCompositeOperation = 'source-atop'; x.fillStyle = `rgba(30,24,20,${(.18 + .1 * i).toFixed(2)})`; x.fillRect(0, 0, c.width, c.height); return (SD[i] = c); }
// отрывной календарь на стене: дни MON..SUN срываются по одному с tA до tB; на tB падает SUN
export function dayPad(ctx, P, w, t, tA, tB) {
  const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'], h = w * 1.2, n = days.length;
  const idx = t < tA ? 0 : Math.min(n - 1, Math.floor((t - tA) / Math.max(.05, (tB - tA)) * (n - 1)));
  const page = (lbl, dx, dy, a, al) => { ctx.save(); ctx.globalAlpha = al; ctx.translate(P[0] + dx, P[1] + dy); ctx.rotate(a); ctx.fillStyle = '#f4efe2'; ctx.strokeStyle = INK; ctx.lineWidth = w * .03; ctx.fillRect(-w / 2, -h / 2, w, h); ctx.strokeRect(-w / 2, -h / 2, w, h);
    ctx.fillStyle = '#b4302a'; ctx.fillRect(-w / 2, -h / 2, w, h * .22); ctx.fillStyle = INK; ctx.font = `900 ${Math.round(w * .32)}px 'Courier New', monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(lbl, 0, h * .08); ctx.restore(); };
  if (idx + 1 < n) page(days[idx + 1], 0, 0, 0, 1); else page(days[n - 1], 0, 0, 0, 1);
  const seg = (tB - tA) / (n - 1), u = idx < n - 1 ? ((t - tA) - idx * seg) / seg : 1;
  if (t >= tA && idx < n - 1) page(days[idx], w * 1.4 * u * u, w * 2.6 * u * u, 1.2 * u, 1 - u); else if (t < tA) page(days[0], 0, 0, 0, 1);
  if (t >= tB) { const u2 = clamp((t - tB) / .35); page('SUN', 0, w * 3 * u2 * u2, .3 * u2, 1 - u2 * .2); }
}
// сосед садится на нижнюю койку, койка прогибается. o = { sit 0..1, keys, look, R: {k, to} — правая кисть к точке плейта, book (кисть держит книгу) }
export function roommateBed(ctx, v, t, T, o = {}) {
  const a = A(), c = CFG.roomBed; if (!a) return {};
  if (!o.solo) plate(ctx, a.dorm, v);
  const sit = clamp(o.sit ?? 1), bounce = sit >= 1 ? Math.sin(Math.min(1, (t - (o.tSit ?? 0)) * 3) * Math.PI) * 6 * Math.exp(-(t - (o.tSit ?? 0)) * 2) : 0, sag = 22 * sit + bounce;
  if (!o.solo) { const P = toS(v, [c.sag[0], c.sag[1]]), w = c.sag[2] * v.k; ctx.save(); ctx.fillStyle = 'rgba(40,20,10,.35)'; ctx.beginPath(); ctx.ellipse(P[0], P[1] + sag * .3 * v.k, w * .6, sag * .8 * v.k + 1, 0, 0, Math.PI); ctx.fill(); ctx.restore(); }   // прогиб матраса
  const seat = [c.seat[0], c.seat[1] + sag * .6 - 60 * (1 - sit)], S = RM.spec;
  const p = act(t, o.keys || [[0, 'neutral']]); Object.assign(p, { blink: blinkAt(t, 4), view: 'threeQuarter', facing: 1, stance: 'sitR', look: o.look || [.5, .1] }); if (p.mouth === 'smile' || !p.mouth) p.mouth = 'flat';   // хмурый, не улыбается
  p.bob = (p.bob || 0) * .3; p.sq = (p.sq || 0) * .3; p.lean = (p.lean || 0) * .3 + .05; p.tilt = (p.tilt || 0) * .4;
  const toFig = P => [(P[0] - seat[0]) / c.fs, (P[1] - seat[1]) / c.fs], shR = shoulder(S, 1), shL = shoulder(S, -1);
  const R = o.R && o.R.k > .001 ? arcHand(shR, restHand(S, 1), toFig(o.R.to), o.R.k) : restHand(S, 1);
  p.arms = [{ to: restHand(S, -1), w: 13 }, { to: R, w: 13 }];
  fig(ctx, RM, p, v, seat, c.fs, 'seat');
  if (!o.solo) { const F = toS(v, [seat[0] + 70, 905]); contact(ctx, F[0], F[1], 160 * c.fs * v.k, 20 * c.fs * v.k, .5, .2); }
  const hp = q => toS(v, [seat[0] + (q[0] - S.pins.seat[0]) * c.fs, seat[1] + (q[1] - S.pins.seat[1]) * c.fs]);
  const out = { hl: hp(p.arms[0].to), hr: hp(R), s: c.fs * v.k };
  bandage(ctx, out.hl, out.s);
  return out;
}
// бинт на запястье (левая кисть соседа): белая манжета-повязка у кисти
export function bandage(ctx, P, s) { ctx.save(); ctx.translate(P[0], P[1] - 22 * s); ctx.fillStyle = '#f4f1ea'; ctx.strokeStyle = INK; ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.roundRect(-15 * s, -12 * s, 30 * s, 22 * s, 5 * s); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(120,110,100,.6)'; ctx.lineWidth = 1.5 * s; for (const q of [-4, 3]) { ctx.beginPath(); ctx.moveTo(-14 * s, q * s); ctx.lineTo(14 * s, q * s + 3 * s); ctx.stroke(); } ctx.restore(); }
// книга (обложка «A B C»): центр, ширина, поворот a (рад) — вверх ногами = π
export function book(ctx, P, w, a) { const h = w * .72; ctx.save(); ctx.translate(P[0], P[1]); ctx.rotate(a);
  ctx.fillStyle = '#2f5f8a'; ctx.strokeStyle = INK; ctx.lineWidth = w * .025; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, w * .03); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#f2e8d0'; ctx.fillRect(-w * .44, -h * .3, w * .88, h * .6); ctx.strokeRect(-w * .44, -h * .3, w * .88, h * .6);
  ctx.fillStyle = INK; ctx.font = `900 ${Math.round(h * .32)}px Georgia, serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('A B C', 0, h * .02);
  ctx.restore(); }   // (жёлтый кружок-«наклейка» убран: читался как пустая фигура)
// рука во вставке: рукав от края кадра к кисти. kind: 'kid' — полосатая футболка Дженсена; 'big' — голое плечо соседа с тату и бинтом
export function insertArm(ctx, from, P, s, kind) { const dx = P[0] - from[0], dy = P[1] - from[1], l = Math.hypot(dx, dy) || 1, a = Math.atan2(dy, dx), r = (kind === 'big' ? 26 : 15) * s;
  ctx.save(); ctx.translate(from[0], from[1]); ctx.rotate(a); ctx.lineJoin = 'round';
  if (kind === 'kid') { ctx.fillStyle = '#E9DFC8'; ctx.strokeStyle = INK; ctx.lineWidth = 5 * s; ctx.beginPath(); ctx.roundRect(-40 * s, -r * 1.5, l - r * 1.2 + 40 * s, r * 3, r * .8); ctx.fill(); ctx.stroke(); ctx.save(); ctx.clip(); ctx.fillStyle = 'rgba(46,92,160,.8)'; for (let q = -40; q < l / s; q += 50) ctx.fillRect(q * s, -r * 1.5, 18 * s, r * 3); ctx.restore(); }
  else { ctx.fillStyle = '#E8D2B8'; ctx.strokeStyle = INK; ctx.lineWidth = 5 * s; ctx.beginPath(); ctx.roundRect(-40 * s, -r * 1.1, l - r * .8 + 40 * s, r * 2.2, r); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(30,40,70,.85)'; ctx.lineWidth = 4 * s; ctx.beginPath(); ctx.moveTo(l * .25, -r * .5); ctx.quadraticCurveTo(l * .32, r * .6, l * .4, -r * .2); ctx.quadraticCurveTo(l * .46, -r * .8, l * .52, r * .3); ctx.stroke(); }   // тату
  ctx.restore();
  ell(ctx, P[0], P[1], r, r, INK, null);
  if (kind === 'big') bandage(ctx, [P[0] - Math.cos(a) * r * 1.6, P[1] - Math.sin(a) * r * 1.6 + 22 * s], s * 1.6);
}

// ======================= кампус Oneida снаружи (гл. 2: #35 ворота, #51 Huang Hall) =======================
// Плейты: assets/bg_oneida_gate.png (raw/bg_oneida_gate_a.png, GPT Image, промпт prompts/bg_oneida_gate.txt),
// assets/bg_huang_hall.png (raw/bg_huang_hall.png, промпт prompts/bg_huang_hall.txt). Тёплый день; солнце сзади-справа.
import { NOIR_FONT } from 'engine';
import { person, brother } from '../chars_B.js';
import gatePlate from '../assets/bg_oneida_gate.png';
import hallPlate from '../assets/bg_huang_hall.png';
const IC = { gate: img(gatePlate), hall: img(hallPlate) };
export const AC = lazy([IC.gate, IC.hall], () => ({ gate: IC.gate, hall: IC.hall }));
CFG.gate = { board: [993, 152, 600, 128], kids: [[905, 968], [1035, 962]], fs: .36, cases: [[838, 972], [1104, 966]], light: [.5, -.8] };
const GJ = youngJensen(), GB = brother(); GJ.spec.rig = { ...GJ.spec.rig, plantLegs: .02 }; GB.spec.rig = { ...GB.spec.rig, plantLegs: .02 };
// чемодан стоит на земле: низ-центр P, s — масштаб (как у чемоданов на крыльце родственников, ch02_B)
function caseOnGround(ctx, P, s) { ctx.save(); ctx.translate(P[0], P[1]); ctx.fillStyle = '#7a4a24'; ctx.strokeStyle = INK; ctx.lineWidth = 4 * s; ctx.beginPath(); ctx.roundRect(-110 * s, -150 * s, 220 * s, 150 * s, 10 * s); ctx.fill(); ctx.stroke();
  ctx.lineWidth = 7 * s; ctx.beginPath(); ctx.roundRect(-34 * s, -178 * s, 68 * s, 30 * s, 10 * s); ctx.stroke();                                  // ручка сверху
  ctx.fillStyle = '#c9a54a'; ctx.fillRect(-90 * s, -98 * s, 16 * s, 14 * s); ctx.fillRect(74 * s, -98 * s, 16 * s, 14 * s); ctx.strokeStyle = '#3a2412'; ctx.lineWidth = 8 * s; ctx.beginPath(); ctx.moveTo(-110 * s, -56 * s); ctx.lineTo(110 * s, -56 * s); ctx.stroke(); ctx.restore(); }
// #35: ворота школы; два мальчика с чемоданами спиной-вполоборота смотрят на школу; sign 0..1 — надпись проступает на пустой доске
export function gate(ctx, v, t, T, o = {}) {
  const a = AC(), c = CFG.gate; if (!a) return;
  if (!o.solo) { plate(ctx, a.gate, v);
    const [bx, by, bw, bh] = c.board, u = clamp(o.sign ?? 0);
    if (u > 0) { const P = toS(v, [bx, by]), s = v.k; ctx.save(); ctx.beginPath(); ctx.rect(P[0] - bw / 2 * s, P[1] - bh / 2 * s, bw * s * u, bh * s); ctx.clip();          // буквы «пишутся» слева направо
      ctx.fillStyle = '#3a2414'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `700 ${Math.round(44 * s)}px ${NOIR_FONT.display}`; ctx.fillText('ONEIDA BAPTIST', P[0], P[1] - 24 * s, bw * .86 * s);
      ctx.font = `700 ${Math.round(36 * s)}px ${NOIR_FONT.display}`; ctx.fillText('INSTITUTE', P[0], P[1] + 28 * s, bw * .7 * s); ctx.restore(); }
    for (const P of c.cases) { const Q = toS(v, P); contact(ctx, Q[0] + 12 * v.k, Q[1] + 2 * v.k, 95 * v.k * c.fs / .36 * .55, 12 * v.k, .45, -.3); caseOnGround(ctx, Q, c.fs * .9 * v.k); } }
  const look = o.look || [.1, -.6];
  c.kids.forEach((P, i) => person(ctx, v, t, T, { C: i ? GB : GJ, at: P, fs: i ? c.fs * 1.12 : c.fs, pin: 'feet', stance: 'stand', view: 'threeQuarter', facing: i ? -1 : 1, light: c.light, shadow: !o.solo, shadowW: 120,
    keys: [[0, i ? 'smile' : (o.emo || 'neutral')]], look: i ? [-.3, -.3] : look, seed: 5 + i }));
}


// #51: новый корпус Huang Hall. sign 0..1 — над дверью загорается надпись на пустой каменной полосе (тёплый свет, один раз, без мерцания)
CFG.hall = { band: [982, 440, 430, 58] };
export function hall(ctx, v, o = {}) {
  const a = AC(); if (!a || o.solo) return; plate(ctx, a.hall, v);
  const [bx, by, bw, bh] = CFG.hall.band, u = clamp(o.sign ?? 0); if (u <= 0) return;
  const P = toS(v, [bx, by]), s = v.k;
  ctx.save(); ctx.globalCompositeOperation = 'screen'; const g = ctx.createRadialGradient(P[0], P[1], 0, P[0], P[1], bw * .62 * s); g.addColorStop(0, `rgba(255,214,140,${(.35 * u).toFixed(3)})`); g.addColorStop(1, 'rgba(255,200,120,0)'); ctx.fillStyle = g; ctx.fillRect(P[0] - bw * s, P[1] - bw * .7 * s, bw * 2 * s, bw * 1.4 * s); ctx.restore();
  ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `700 ${Math.round(42 * s)}px ${NOIR_FONT.display}`;
  ctx.shadowColor = `rgba(255,190,90,${(.9 * u).toFixed(3)})`; ctx.shadowBlur = 14 * s * u; ctx.fillStyle = `rgb(${Math.round(lerp(120, 255, u))},${Math.round(lerp(100, 236, u))},${Math.round(lerp(80, 190, u))})`;
  ctx.fillText('H U A N G   H A L L', P[0], P[1] + 2 * s, bw * .9 * s); ctx.restore();
}
// чек на $2,000,000 (плоская вставка поверх кадра, не в руке): x, y — центр, w — ширина, a — наклон
export function cheque(ctx, x, y, w, a) { const h = w * .42; ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(-w / 2 + 10, -h / 2 + 12, w, h);
  ctx.fillStyle = '#eef0dc'; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(2, w * .006); ctx.fillRect(-w / 2, -h / 2, w, h); ctx.strokeRect(-w / 2, -h / 2, w, h);
  ctx.strokeStyle = '#5f8a62'; ctx.lineWidth = w * .008; ctx.strokeRect(-w / 2 + w * .02, -h / 2 + w * .02, w - w * .04, h - w * .04);
  const T = (str, tx, ty, sz, al = 'left', col = '#1e2a22', wt = 700) => { ctx.font = `${wt} ${Math.round(sz)}px ${NOIR_FONT.type}`; ctx.fillStyle = col; ctx.textAlign = al; ctx.textBaseline = 'middle'; ctx.fillText(str, tx, ty); };
  T('PAY TO THE', -w * .44, -h * .2, w * .03); T('ORDER OF', -w * .44, -h * .08, w * .03);
  T('ONEIDA BAPTIST', -w * .2, -h * .2, w * .036, 'left', '#141014'); T('INSTITUTE', -w * .2, -h * .08, w * .036, 'left', '#141014');   // получатель в две строки — не налезает на сумму
  ctx.strokeStyle = '#1e2a22'; ctx.lineWidth = w * .003; ctx.beginPath(); ctx.moveTo(-w * .21, -h * .0); ctx.lineTo(w * .12, -h * .0); ctx.stroke();
  ctx.strokeStyle = INK; ctx.lineWidth = w * .006; ctx.strokeRect(w * .16, -h * .25, w * .3, h * .28); T('$2,000,000', w * .31, -h * .11, w * .04, 'center', '#141014', 800);
  T('TWO MILLION AND 00/100 DOLLARS', -w * .44, h * .14, w * .03);
  ctx.beginPath(); ctx.moveTo(w * .1, h * .36); ctx.lineTo(w * .44, h * .36); ctx.stroke();
  ctx.restore(); }
