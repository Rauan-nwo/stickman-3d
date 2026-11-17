// staging/desktop.js — T-desk «их стол сверху» (#25, #26; bg_desk_restaurant_top). Читается без слов через КАРТОЧКИ МЕСТ:
//   у места Дженсена (слева) — сложенная карточка «JENSEN HUANG» (кожанку на стуле убрали — сверху не читалась);
//   напротив (справа) — пустой стул и ПУСТАЯ карточка;
//   #25: на «China» с края кадра тянется красная нить с биркой «BEIJING» и завязывается на пустой карточке;
//   #26: ближе на пустую карточку и стул: на «seat» на неё падает красный штамп «RESERVED» (толчок камеры), нить натягивается.
// Шрифты — документов канала (NOIR_FONT: пишмашинка для карточек, Bahnschrift для штампа).
import { clamp, lerp, E, NOIR_FONT as F } from 'engine';
import { W, H, toS, plate, img, lazy, cover } from './common.js';
import topPlate from '../../assets/bg_desk_restaurant_top.png';

export const CFG = {
  cardJ: [668, 790], cardE: [1232, 790],             // карточки мест: центр (пиксели плейта), у края стола перед тарелкой
  card: [300, 104],                                  // размер лицевой стороны (пиксели плейта)
  backJ: { x: 292, y0: 430, y1: 770 },               // спинка стула Дженсена (вид сверху: вертикальная дуга слева)
  threadFrom: [1990, 300],                           // нить входит из-за правого края
  views: { top: { cx: 960, cy: 560, k: 1.04 }, card: { cx: 1420, cy: 650, k: 1.75 } },   // #26: карточка Дженсена целиком вне кадра (без обрывков текста)
};
const I = { top: img(topPlate) };
const A = lazy([I.top], () => ({ top: I.top }));
const lg = (x, x0, y0, x1, y1, st) => { const g = x.createLinearGradient(x0, y0, x1, y1); st.forEach(([o, c]) => g.addColorStop(o, c)); return g; };
const INK = '#141014';
const P = (x, pts) => { x.beginPath(); pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.closePath(); };

// кожанка Дженсена брошена на его стул (вид сверху): ворот у спинки, корпус лежит на сиденье, рукава свисают через подлокотники.
// Узнаётся по силуэту: плечи, два рукава с обшлагами, косая молния, лацканы-косуха с кнопками, блеск кожи. Пиксели плейта.
function jacket(x) {
  const X0 = 318, X1 = 486, Y0 = 486, Y1 = 714, cy = (Y0 + Y1) / 2;          // корпус: от спинки (X0) к краю сиденья (X1)
  x.save(); x.translate(400, 600); x.scale(1.18, 1.18); x.translate(-400, -600); x.lineJoin = 'round'; x.lineCap = 'round';
  const leather = lg(x, X0, Y0, X1, Y1, [[0, '#3c3842'], [.45, '#1f1c24'], [1, '#0e0d11']]);
  // рукава (под корпусом): от плеча через подлокотник наружу, обшлаг
  for (const s of [-1, 1]) {
    const sh = [X0 + 34, s > 0 ? Y1 - 16 : Y0 + 16], el = [X0 + 120, cy + s * 168], cuff = [X0 + 70, cy + s * 236];
    x.beginPath(); x.moveTo(sh[0], sh[1]); x.quadraticCurveTo(el[0], el[1], cuff[0], cuff[1]); x.lineWidth = 64; x.strokeStyle = INK; x.stroke();
    x.lineWidth = 52; x.strokeStyle = '#26232b'; x.stroke();
    x.lineWidth = 8; x.strokeStyle = 'rgba(255,255,255,.16)'; x.beginPath(); x.moveTo(sh[0] + 6, sh[1] + s * 4); x.quadraticCurveTo(el[0] - 14, el[1] - s * 10, cuff[0] + 6, cuff[1] - s * 14); x.stroke();
    x.save(); x.translate(cuff[0], cuff[1]); x.rotate(s > 0 ? .5 : -.5); x.beginPath(); x.roundRect(-30, -14, 60, 28, 8); x.fillStyle = '#0b0a0d'; x.fill(); x.lineWidth = 5; x.strokeStyle = INK; x.stroke();
    x.beginPath(); x.moveTo(-20, 0); x.lineTo(20, 0); x.lineWidth = 3; x.strokeStyle = '#B9BDC5'; x.stroke(); x.restore();   // молния на обшлаге
  }
  // корпус
  x.beginPath(); x.moveTo(X0 + 10, Y0 + 30); x.quadraticCurveTo(X0, Y0, X0 + 40, Y0 - 4); x.lineTo(X1 - 20, Y0 + 6); x.quadraticCurveTo(X1, Y0 + 10, X1, Y0 + 40);
  x.lineTo(X1, Y1 - 40); x.quadraticCurveTo(X1, Y1 - 10, X1 - 20, Y1 - 6); x.lineTo(X0 + 40, Y1 + 4); x.quadraticCurveTo(X0, Y1, X0 + 10, Y1 - 30); x.closePath();
  x.fillStyle = leather; x.fill(); x.lineWidth = 8; x.strokeStyle = INK; x.stroke();
  // нижняя резинка
  x.beginPath(); x.roundRect(X1 - 30, Y0 + 10, 30, Y1 - Y0 - 20, 8); x.fillStyle = '#0a090c'; x.fill(); x.lineWidth = 4; x.stroke();
  // футболка в распахе + косая молния
  x.beginPath(); x.moveTo(X0 + 46, cy - 10); x.lineTo(X1 - 30, cy - 26); x.lineTo(X1 - 30, cy + 2); x.lineTo(X0 + 46, cy + 12); x.closePath(); x.fillStyle = '#2c2b33'; x.fill();
  x.beginPath(); x.moveTo(X0 + 46, cy - 10); x.lineTo(X1 - 30, cy - 26); x.lineWidth = 5; x.strokeStyle = '#C9CDD4'; x.stroke();
  for (let k = 0; k < 10; k++) { const u = k / 9, px = lerp(X0 + 50, X1 - 34, u), py = lerp(cy - 10, cy - 26, u); x.beginPath(); x.moveTo(px, py - 5); x.lineTo(px, py + 5); x.lineWidth = 2; x.strokeStyle = 'rgba(220,224,232,.8)'; x.stroke(); }
  // ворот и лацканы-косуха с кнопками
  x.beginPath(); x.moveTo(X0 + 4, cy - 70); x.quadraticCurveTo(X0 - 22, cy, X0 + 4, cy + 70); x.lineTo(X0 + 34, cy + 50); x.lineTo(X0 + 34, cy - 50); x.closePath(); x.fillStyle = '#2b2830'; x.fill(); x.lineWidth = 6; x.strokeStyle = INK; x.stroke();
  for (const s of [-1, 1]) { x.beginPath(); x.moveTo(X0 + 34, cy + s * 10); x.lineTo(X0 + 110, cy + s * 74); x.lineTo(X0 + 64, cy + s * 96); x.lineTo(X0 + 30, cy + s * 50); x.closePath(); x.fillStyle = '#25222a'; x.fill(); x.lineWidth = 5; x.stroke();
    x.beginPath(); x.arc(X0 + 78, cy + s * 76, 7, 0, Math.PI * 2); x.fillStyle = '#C9CDD4'; x.fill(); x.lineWidth = 2.5; x.stroke(); }
  // блики кожи
  x.beginPath(); x.moveTo(X0 + 60, Y0 + 22); x.quadraticCurveTo(X0 + 110, Y0 + 12, X1 - 50, Y0 + 20); x.lineWidth = 10; x.strokeStyle = 'rgba(255,255,255,.22)'; x.stroke();
  x.beginPath(); x.moveTo(X0 + 70, Y1 - 22); x.lineTo(X1 - 60, Y1 - 24); x.lineWidth = 6; x.strokeStyle = 'rgba(255,255,255,.12)'; x.stroke();
  x.restore();
}
// сложенная карточка места (вид сверху чуть наклонно): лицевая сторона + узкая полоска задней половины сверху; name — текст или ''
function placeCard(x, c, name, stamp = null) {
  const [w, h] = CFG.card, [cx, cy] = c;
  x.save(); x.translate(cx, cy);
  x.fillStyle = 'rgba(40,20,10,.35)'; x.filter = 'blur(6px)'; x.fillRect(-w / 2 + 10, -h / 2 + 14, w, h); x.filter = 'none';   // тень
  x.beginPath(); x.rect(-w / 2, -h / 2 - 26, w, 26); x.fillStyle = '#d9cfba'; x.fill(); x.lineWidth = 5; x.strokeStyle = INK; x.stroke();   // задняя половина
  x.beginPath(); x.rect(-w / 2, -h / 2, w, h); x.fillStyle = lg(x, 0, -h / 2, 0, h / 2, [[0, '#FBF6EA'], [1, '#EDE4CF']]); x.fill(); x.lineWidth = 6; x.stroke();
  x.beginPath(); x.moveTo(-w / 2 + 14, -h / 2 + 12); x.lineTo(w / 2 - 14, -h / 2 + 12); x.lineWidth = 2; x.strokeStyle = 'rgba(160,120,60,.6)'; x.stroke();   // золотая кромка
  x.beginPath(); x.moveTo(-w / 2 + 14, h / 2 - 12); x.lineTo(w / 2 - 14, h / 2 - 12); x.stroke();
  if (name) { x.fillStyle = '#1c140c'; x.font = `bold 36px ${F.type}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(name, 0, 4, w - 30); }
  if (stamp) {                                                                     // штамп RESERVED: удар с увеличения, лёгкий наклон
    const u = stamp.u, k = u < .12 ? lerp(1.8, 1, E.outCubic(u / .12)) : 1;
    x.save(); x.rotate(-.12); x.scale(k, k); x.globalAlpha = clamp(u / .05) * .92;
    x.strokeStyle = '#C8231F'; x.lineWidth = 7; x.strokeRect(-w / 2 + 22, -h / 2 + 16, w - 44, h - 32);
    x.fillStyle = '#C8231F'; x.font = `900 46px ${F.label}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('RESERVED', 0, 3, w - 64); x.restore();
  }
  x.restore();
}
// красная нить от края кадра до пустой карточки: k 0..1 — протянута, taut 0..1 — натянута; узел и бирка BEIJING
function thread(x, k, taut, t) {
  if (k <= 0) return; const A0 = CFG.threadFrom, [w, h] = CFG.card, B = [CFG.cardE[0] + w / 2 - 30, CFG.cardE[1] - h / 2 - 20];
  const sag = (1 - Math.min(1, taut)) * 80 - (taut > 1 ? (taut - 1) * 40 : 0), end = [lerp(A0[0], B[0], k), lerp(A0[1], B[1], k)];
  const M = [(A0[0] + end[0]) / 2, (A0[1] + end[1]) / 2 + sag * Math.sin(Math.PI * Math.min(1, k))];
  x.save(); x.lineCap = 'round'; x.shadowColor = 'rgba(0,0,0,.45)'; x.shadowBlur = 6; x.shadowOffsetY = 5;
  x.beginPath(); x.moveTo(A0[0], A0[1]); x.quadraticCurveTo(M[0], M[1], end[0], end[1]); x.lineWidth = 7; x.strokeStyle = '#B81B24'; x.stroke(); x.restore();
  if (k >= 1) { x.save(); x.translate(B[0], B[1]); x.strokeStyle = '#B81B24'; x.lineWidth = 6; x.lineCap = 'round';     // узел на уголке карточки
    x.beginPath(); x.ellipse(0, 0, 13, 9, .5, 0, Math.PI * 2); x.stroke(); x.beginPath(); x.moveTo(6, 6); x.lineTo(26, 30); x.moveTo(-2, 8); x.lineTo(4, 38); x.stroke(); x.restore(); }
  // бирка BEIJING на нити (в трети от края)
  const u = Math.min(.5, k * .6), tp = [lerp(A0[0], end[0], u / Math.max(.01, k)), lerp(A0[1], end[1], u / Math.max(.01, k)) + sag * .7 * Math.sin(Math.PI * Math.min(1, k)) * .8];
  x.save(); x.translate(tp[0], tp[1]); x.rotate(.14 + (1 - taut) * .1 * Math.sin(t * 5));
  x.beginPath(); x.moveTo(0, 0); x.lineTo(0, 22); x.lineWidth = 4; x.strokeStyle = '#B81B24'; x.stroke();
  x.beginPath(); x.roundRect(-104, 22, 208, 66, 8); x.fillStyle = '#F2E8CC'; x.fill(); x.lineWidth = 4; x.strokeStyle = '#3a2a18'; x.stroke();
  x.beginPath(); x.arc(-84, 55, 6, 0, Math.PI * 2); x.fillStyle = '#3a2a18'; x.fill();
  x.fillStyle = '#B3121F'; x.font = `900 38px ${F.label}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('BEIJING', 10, 57, 170); x.restore();
}
// кадр. o = { thread: k, taut, stamp: u (с момента удара, с) | null, base: 'top'|'card' }
export function desktop(ctx, cam, t, o = {}) {
  const a = A(); if (!a) return; const b = CFG.views[o.base || 'top'];
  const v = cover({ cx: b.cx, cy: b.cy, k: b.k * (1 + (cam.z - 1) * .6) });   // без дрейфа: стол — композиция, всё должно остаться в кадре
  plate(ctx, a.top, v);
  ctx.save(); ctx.translate(W / 2 - v.cx * v.k, H / 2 - v.cy * v.k); ctx.scale(v.k, v.k);   // дальше — в пикселях плейта
  // кожанка на стуле убрана: сверху в этом масштабе она не читалась как куртка (замечание Рауана) — чьё место, говорит карточка
  placeCard(ctx, CFG.cardJ, 'JENSEN HUANG');
  placeCard(ctx, CFG.cardE, '', o.stamp != null && o.stamp >= 0 ? { u: o.stamp } : null);
  thread(ctx, o.thread || 0, o.taut || 0, t);
  ctx.restore();
}
