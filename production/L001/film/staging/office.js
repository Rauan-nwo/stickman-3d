// staging/office.js — L03 кабинет ведущего (plate_office — тот же плейт, что в эталоне host/film.js).
// Ведущий (moneyman, ноги-палочки) стоит перед столом, ступни на досках у основания стола, контактная тень + тень от лампы
// вперёд-вправо (лампа сзади-слева). Свет на герое — как в эталоне host/film.js (look v4: серп на голове, тёплый край от лампы).
// Вставки гл. 1 — это тот же кадр крупнее: коробка Nvidia на столе справа от него, снимок «Дженсен + Алиса» под лампой,
// ключ в его правой руке. Поэтому руки, коробка и ключ везде стоят в одних и тех же точках.
import { moneyman, act, blinkAt, shoulder, restHand, arcHand, gesture, ell, clamp, lerp, E } from 'engine';
import { nvBox, brassKey, priceTag, polaroid } from '../props.js';
import { mouth } from '../words.js';
import { W, H, toS, plate, img, blurred, lazy, fig, toPlate, contact } from './common.js';
import officePlate from '../../../longform/style-test/assets/plate_office.png';

export const CFG = {
  feet: [1080, 800], fs: .55,                 // ступни (пиксели плейта) у основания стола; пикселей плейта на единицу фигуры
  box: [1300, 541, 160],                      // коробка на столе: низ-центр, ширина
  photo: [905, 556, 92],                      // снимок на столе под лампой: центр, ширина
  lamp: [735, 410],                           // абажур лампы (вспышка включения)
  shade: { dir: [-1, -.55], body: { k: 0 }, head: { k: .42, color: '#4f4a72', shiftU: 52, after: true, glow: { color: '#f3d488', k: .28 } } },
  views: { wide: { cx: 960, cy: 540, k: 1.02 }, box: { cx: 1285, cy: 480, k: 3.0 }, key: { cx: 1215, cy: 428, k: 4.4 }, tag: { cx: 1330, cy: 500, k: 5 }, mid: { cx: 1010, cy: 470, k: 1.85 }, hand: { cx: 1292, cy: 466, k: 4.6 }, xkey: { cx: 1150, cy: 400, k: 2.6 }, glow: { cx: 1235, cy: 440, k: 3.3 }, src: { cx: 1300, cy: 524, k: 8 }, photo: { cx: 928, cy: 548, k: 5 }, keycam: { cx: 1080, cy: 420, k: 2.3 } },
};
const I = { plate: img(officePlate) };
export const A = lazy([I.plate], () => ({ plate: I.plate, plateB3: blurred(I.plate, 3) }));
const M = moneyman(); M.spec.shade = CFG.shade; M.spec.rig = { ...M.spec.rig, armL: 270, armLayer: 'front' };
export const CAST = { M };
const TALKKEYS = [[0, 'neutral']];

// точка плейта -> координаты фигуры ведущего (pin feet)
const figPt = P => { const q = M.spec.pins.feet; return [(P[0] - CFG.feet[0]) / CFG.fs + q[0], (P[1] - CFG.feet[1]) / CFG.fs + q[1]]; };
// середина крышки (верхняя грань коробки) — куда кладут кисть
export const lidPt = (dx = 0, dy = 0) => [CFG.box[0] + CFG.box[2] * .32 * .25 + dx, CFG.box[1] - CFG.box[2] * .45 - CFG.box[2] * .32 * .25 + dy];
export const boxTop = (dx = 0, dy = 0) => [CFG.box[0] + dx, CFG.box[1] - CFG.box[2] * .45 - CFG.box[2] * .16 + dy];

// кадр кабинета. o = { blur, lamp (0..1 горит), box: {lid, glow, dust}, photo: true, tag: {k, sub}, solo,
//   host: { keys, lean, look, R: {k, to: [x,y] плейта} — правая рука (к коробке), L: {k, to} — левая, key: {s, a, glint} — ключ в правой кисти } }
export function office(ctx, v, t, T, o = {}) {
  const a = A(); if (!a) return {};
  if (!o.solo) {
    plate(ctx, o.blur ? a.plateB3 : a.plate, v);
    if (o.photo) { const [x0, y, w] = CFG.photo, x = x0 + (o.photoDx || 0), P = toS(v, [x, y]); ctx.save(); ctx.translate(P[0], P[1]); ctx.scale(1, .42); polaroid(ctx, 0, 0, w * v.k, -.12, o.photo === true ? null : o.photo, 1); ctx.restore(); }
    if (o.photo && o.photoGlint > .01) sparkle(ctx, toS(v, [CFG.photo[0] + (o.photoDx || 0) + 8, CFG.photo[1] - 4]), 38 * v.k, o.photoGlint);   // блик ключа на снимке
    if (o.box) { const [x, y, w] = CFG.box, P = toS(v, [x, y]); nvBox(ctx, P[0], P[1], w * v.k, o.box); }
    if (o.tag) tagOn(ctx, v, o.tag);
    // тени: контакт под ступнями и тень от лампы вперёд-вправо
    const F = toS(v, CFG.feet), s = CFG.fs * v.k;
    contact(ctx, F[0], F[1] + 2 * s, 150 * s, 22 * s, .6);
    ctx.save(); ctx.translate(F[0], F[1] + 4 * s); ctx.rotate(.32); ctx.filter = `blur(${(10 * v.k).toFixed(1)}px)`; ctx.fillStyle = 'rgba(8,3,4,.42)';
    ctx.beginPath(); ctx.ellipse(380 * s, 30 * s, 420 * s, 60 * s, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  let res = {};
  if (o.host !== false) res = host(ctx, v, t, T, o.host || {});
  if (!o.solo && o.spill > .01) greenSpill(ctx, v, o.spill);
  if (!o.solo && o.tap && o.tap.u > 0 && o.tap.u < .22) impact(ctx, toS(v, o.tap.at), 26 * v.k, o.tap.u / .22);
  if (!o.solo) lampState(ctx, v, o.lamp ?? 1, t);
  return res;
}
function host(ctx, v, t, T, h) {
  const S = M.spec, p = act(t, h.keys || TALKKEYS);
  p.bob = (p.bob || 0) * .4; p.sq = (p.sq || 0) * .4; p.lean = (p.lean || 0) * .5 + (h.lean || 0); p.tilt = (p.tilt || 0) * .7 + (h.tilt || 0);
  p.blink = blinkAt(t, 3); p.look = h.look || p.look || [0, 0];
  if (p.mouth === 'teeth' || p.mouth === 'teethOpen') p.mouth = 'open';
  p.mouth = mouth('HOST', T, h.rest || 'smile', 5);
  const shR = shoulder(S, 1), shL = shoulder(S, -1);
  const R = h.R && h.R.k > .001 ? arcHand(shR, restHand(S, 1), figPt(h.R.to), h.R.k) : restHand(S, 1);
  const L = h.L && h.L.k > .001 ? arcHand(shL, restHand(S, -1), figPt(h.L.to), h.L.k) : restHand(S, -1);
  p.arms = [{ to: L, w: 11 }, h.noR ? null : { to: R, w: 11 }];              // noR — правая рука идёт к объективу (bigKey рисует её в перспективе)
  p.hatTip = h.hatTip || 0;
  fig(ctx, M, p, v, CFG.feet, CFG.fs, 'feet');
  const handS = q => toS(v, toPlate(S, CFG.feet, CFG.fs, bodyPt(S, p, q), 'feet'));
  const hr = handS(R), hl = handS(L);
  for (const q of h.noR ? [hl] : [hr, hl]) handRim(ctx, q, CFG.fs * v.k);
  if (h.key) keyGrip(ctx, hr, CFG.fs * v.k, h.key.a ?? -1.9, h.key.glint || 0);
  return { p, hr, hl, sr: handS(shR), s: CFG.fs * v.k };
}
// кисть-точка на тёмном столе почти не видна: мягкая светлая линия по стороне лампы (как на трубке руки)
function handRim(ctx, q, s) { ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(255,214,150,.6)'; ctx.lineWidth = 3.2 * s; ctx.beginPath(); ctx.arc(q[0], q[1], 9 * s, Math.PI * 1.05, Math.PI * 1.75); ctx.stroke(); ctx.restore(); }
function bodyPt(S, p, q) { let [x, y] = q; const hy = S.rig.hipY, lean = p.lean || 0, hipDy = (p.bob || 0) + (p.sq || 0) * 60 * (S.u ?? 1); y -= hy; x *= 1 + (p.sq || 0) * .6; y *= 1 - (p.sq || 0); const c = Math.cos(lean), s = Math.sin(lean); return [x * c - y * s, x * s + y * c + hy + hipDy]; }
// лампа: до включения кабинет в полутьме, щелчок — две вспышки и ровный свет
function lampState(ctx, v, k, t) {
  if (k >= 1) return; const d = 1 - k;
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = `rgba(${Math.round(255 - 170 * d)},${Math.round(255 - 165 * d)},${Math.round(255 - 140 * d)},1)`; ctx.fillRect(0, 0, W, H); ctx.restore();
}
export function lampFlare(ctx, v, k) { if (k <= .01) return; const P = toS(v, CFG.lamp); ctx.save(); ctx.globalCompositeOperation = 'screen'; const r = 420 * v.k, g = ctx.createRadialGradient(P[0], P[1] + 40 * v.k, 0, P[0], P[1] + 40 * v.k, r);
  g.addColorStop(0, `rgba(255,240,170,${.6 * k})`); g.addColorStop(.4, `rgba(220,255,170,${.22 * k})`); g.addColorStop(1, 'rgba(200,255,160,0)'); ctx.fillStyle = g; ctx.fillRect(P[0] - r, P[1] - r, r * 2, r * 2); ctx.restore(); }
// зелёный свет из щели коробки: яркая линия в щели, мягкий свет вверх — на лицо и жилет ведущего (screen), без «плиты»
function greenSpill(ctx, v, k) {
  const [x, y, w] = CFG.box, top = y - w * .45, P = toS(v, [x + w * .08, top - w * .1]), R = 300 * v.k;
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  const cy = P[1] - R * .42, g = ctx.createRadialGradient(P[0], cy, 0, P[0], cy, R);                                                              // мягкое пятно НАД щелью, без жёсткой границы
  g.addColorStop(0, `rgba(120,255,160,${.42 * k})`); g.addColorStop(.4, `rgba(70,220,120,${.2 * k})`); g.addColorStop(1, 'rgba(40,160,90,0)');
  ctx.fillStyle = g; ctx.fillRect(P[0] - R, cy - R, R * 2, R * 2);
  const a = toS(v, [x - w / 2 + 4, top + 1]), b = toS(v, [x + w / 2 - 4, top + 1]);                                                             // яркая щель по переднему краю крышки
  ctx.strokeStyle = `rgba(190,255,205,${.95 * k})`; ctx.lineWidth = 3.2 * v.k; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
  ctx.strokeStyle = `rgba(110,255,150,${.5 * k})`; ctx.lineWidth = 9 * v.k; ctx.stroke();
  ctx.restore();
}
// удар кисти о крышку: три короткие чёрточки над точкой удара (u 0..1)
function impact(ctx, P, R, u) {
  ctx.save(); ctx.strokeStyle = `rgba(255,240,205,${.95 * (1 - u)})`; ctx.lineWidth = Math.max(2, R * .16); ctx.lineCap = 'round';
  for (const an of [-2.3, -1.57, -.85]) { const r0 = R * (.9 + .8 * u), r1 = r0 + R * .7; ctx.beginPath(); ctx.moveTo(P[0] + Math.cos(an) * r0, P[1] + Math.sin(an) * r0); ctx.lineTo(P[0] + Math.cos(an) * r1, P[1] + Math.sin(an) * r1); ctx.stroke(); }
  ctx.restore();
}
// ключ сверхкрупно: кисть ведущего у объектива (радиус R px экрана) держит ключ за головку (правило хвата: кисть перед головкой, стержень от кисти),
// рука — от ЕГО плеча sr (экран), расширяется к кисти (перспектива). a — направление ключа, glint 0..1, warm 0..1 — тёплый свет лампы слева
export function bigKey(ctx, sr, hand, R, a, glint = 0, warm = 0) {
  const s = R / 12, w0 = 11 * (sr[2] || 1), w1 = R * .95, mx = (sr[0] + hand[0]) / 2, my = (sr[1] + hand[1]) / 2 + Math.hypot(hand[0] - sr[0], hand[1] - sr[1]) * .22, N = 18, L = [], Rr = [];
  for (let i = 0; i <= N; i++) { const u = i / N, x = (1 - u) * (1 - u) * sr[0] + 2 * u * (1 - u) * mx + u * u * hand[0], y = (1 - u) * (1 - u) * sr[1] + 2 * u * (1 - u) * my + u * u * hand[1];
    const dx = 2 * (1 - u) * (mx - sr[0]) + 2 * u * (hand[0] - mx), dy = 2 * (1 - u) * (my - sr[1]) + 2 * u * (hand[1] - my), l = Math.hypot(dx, dy) || 1, w = (w0 + (w1 - w0) * u * u) / 2;
    L.push([x - dy / l * w, y + dx / l * w]); Rr.push([x + dy / l * w, y - dx / l * w]); }
  ctx.save(); ctx.beginPath(); L.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); Rr.reverse().forEach(q => ctx.lineTo(q[0], q[1])); ctx.closePath(); ctx.fillStyle = M.spec.colors.ink; ctx.fill();
  ctx.beginPath(); Rr.reverse().forEach((q, i) => { const x = q[0] * .86 + L[i][0] * .14, y = q[1] * .86 + L[i][1] * .14; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.strokeStyle = 'rgba(255,214,150,.32)'; ctx.lineWidth = Math.max(2, R * .05); ctx.lineCap = 'round'; ctx.stroke(); ctx.restore();
  if (warm > .01) { ctx.save(); ctx.globalCompositeOperation = 'screen'; const g = ctx.createRadialGradient(hand[0] - R * 2.4, hand[1] - R * 1.6, 0, hand[0] - R * 2.4, hand[1] - R * 1.6, R * 6); g.addColorStop(0, `rgba(255,214,130,${.3 * warm})`); g.addColorStop(1, 'rgba(255,190,100,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  keyGrip(ctx, hand, s, a, glint);
}
// блик-звёздочка (отсвет латунного ключа): центр P (экран), радиус R, k 0..1
function sparkle(ctx, P, R, k) { ctx.save(); ctx.globalCompositeOperation = 'screen'; const g = ctx.createRadialGradient(P[0], P[1], 0, P[0], P[1], R);
  g.addColorStop(0, `rgba(255,246,210,${.9 * k})`); g.addColorStop(.3, `rgba(255,214,130,${.4 * k})`); g.addColorStop(1, 'rgba(255,200,110,0)'); ctx.fillStyle = g; ctx.fillRect(P[0] - R, P[1] - R, R * 2, R * 2);
  ctx.fillStyle = `rgba(255,252,235,${k})`; for (let i = 0; i < 4; i++) { ctx.save(); ctx.translate(P[0], P[1]); ctx.rotate(i * Math.PI / 2 + .35); ctx.beginPath(); ctx.moveTo(0, -R * .8 * k); ctx.lineTo(R * .05, 0); ctx.lineTo(-R * .05, 0); ctx.closePath(); ctx.fill(); ctx.restore(); }
  ctx.restore(); }
// ценник на коробке: k 0..1 — прилёт и качание; sub — показана ли бирка SOURCE
function tagOn(ctx, v, o) {
  if (o.k <= 0) return; const [x, y, w] = CFG.box, top = [x - w * .5 + 14, y - w * .45 * .45];   // ценник висит у полосы, логотип NVIDIA открыт
  const P = toS(v, top), u = clamp(o.k), drop = (1 - E.outBack(clamp(u * 1.6))) * 120 * v.k, sw = Math.sin(o.t * 7) * Math.exp(-o.t * 3) * .25;
  priceTag(ctx, P[0], P[1] - drop, 96 * v.k, .15 + sw, '$30,000 EACH', o.sub ? 'SOURCE: NVIDIA' : null);
}
export const views = CFG.views;
export const holdK = (t, t0, t1, rise = .3, fall = .3) => t < t0 ? 0 : t < t0 + rise ? E.outBack(clamp((t - t0) / rise)) : t < t1 ? 1 : t < t1 + fall ? 1 - E.inOutCubic(clamp((t - t1) / fall)) : 0;

// ключ в кисти крупно (рука тянется к объективу): (x, y) — кисть на экране, sc — рост ключа, s — пикселей на единицу (кисть-точка)
// ХВАТ ключа кистью-точкой (правило для предметов в руке): ключ длиной ~1.8 диаметра кисти; кисть ПЕРЕД головкой ключа и перекрывает
// её нижний край; стержень уходит от кисти по направлению a (рад). h — кисть (экран), s — пикселей экрана на единицу фигуры.
const KEY_LEN = 334;                                                         // длина рисунка brassKey в его единицах (головка + стержень + бородка)
export function keyGrip(ctx, h, s, a, glint = 0) {
  const r = 12 * s, ks = 2 * 2 * r / KEY_LEN, bow = 62 * ks;                 // кисть радиус r; ключ = 2 диаметра кисти
  brassKey(ctx, h[0] + Math.cos(a) * r * 1.15, h[1] + Math.sin(a) * r * 1.15, ks, a, glint);   // кисть перекрывает только нижний край кольца-головки: кольцо видно
  ell(ctx, h[0], h[1], r, r, M.spec.colors.ink, null); handRim(ctx, h, s);
}
// ключ к объективу: кисть и ключ растут вместе (рука приближается к камере), хват тот же
export function handKey(ctx, x, y, sc, glint, s) { keyGrip(ctx, [x, y], s * sc, -1.25, glint); }
