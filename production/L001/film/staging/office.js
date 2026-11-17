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
  views: { wide: { cx: 960, cy: 540, k: 1.02 }, box: { cx: 1285, cy: 480, k: 3.0 }, key: { cx: 1290, cy: 430, k: 3.1 }, tag: { cx: 1285, cy: 480, k: 2.8 }, mid: { cx: 1010, cy: 470, k: 1.85 }, keycam: { cx: 1080, cy: 420, k: 2.3 } },
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
    if (o.photo) { const [x, y, w] = CFG.photo, P = toS(v, [x, y]); ctx.save(); ctx.translate(P[0], P[1]); ctx.scale(1, .42); polaroid(ctx, 0, 0, w * v.k, -.12, o.photo === true ? null : o.photo, 1); ctx.restore(); }
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
  p.arms = [{ to: L, w: 11 }, { to: R, w: 11 }];
  p.hatTip = h.hatTip || 0;
  fig(ctx, M, p, v, CFG.feet, CFG.fs, 'feet');
  const handS = q => toS(v, toPlate(S, CFG.feet, CFG.fs, bodyPt(S, p, q), 'feet'));
  const hr = handS(R), hl = handS(L);
  for (const q of [hr, hl]) handRim(ctx, q, CFG.fs * v.k);
  if (h.key) { brassKey(ctx, hr[0] + (h.key.dx || 0) * v.k, hr[1] + (h.key.dy || 0) * v.k, (h.key.s || .18) * v.k, h.key.a ?? -.6, h.key.glint || 0); ell(ctx, hr[0], hr[1], 12 * CFG.fs * v.k, 12 * CFG.fs * v.k, S.colors.ink, null); }
  return { p, hr, hl, s: CFG.fs * v.k };
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
// ценник на коробке: k 0..1 — прилёт и качание; sub — показана ли бирка SOURCE
function tagOn(ctx, v, o) {
  if (o.k <= 0) return; const [x, y, w] = CFG.box, top = [x - w * .5 + 18, y - w * .45 + 4];
  const P = toS(v, top), u = clamp(o.k), drop = (1 - E.outBack(clamp(u * 1.6))) * 120 * v.k, sw = Math.sin(o.t * 7) * Math.exp(-o.t * 3) * .25;
  priceTag(ctx, P[0], P[1] - drop, 96 * v.k, .15 + sw, '$30,000 EACH', o.sub ? 'SOURCE: NVIDIA' : null);
}
export const views = CFG.views;
export const holdK = (t, t0, t1, rise = .3, fall = .3) => t < t0 ? 0 : t < t0 + rise ? E.outBack(clamp((t - t0) / rise)) : t < t1 ? 1 : t < t1 + fall ? 1 - E.inOutCubic(clamp((t - t1) / fall)) : 0;

// ключ в кисти крупно (рука тянется к объективу): (x, y) — кисть на экране, sc — рост ключа, s — пикселей на единицу (кисть-точка)
export function handKey(ctx, x, y, sc, glint, s) { brassKey(ctx, x + 10 * sc, y - 6 * sc, 1.25 * sc, -.35, glint); ell(ctx, x, y, 12 * s, 12 * s, M.spec.colors.ink, null); }
