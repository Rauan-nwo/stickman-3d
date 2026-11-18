// film/props_A.js — реквизит гл. 4–6 (рабочий A). Контур туши, cel-тени, без фототекстур — как props.js.
// Все функции рисуют в текущем преобразовании ctx; размеры — в пикселях того места, где рисуем (обычно экран).
// Надписи — шрифтом документов (NOIR_FONT.type).
import { ell, NOIR_FONT } from 'engine';
const TAU = Math.PI * 2, INK = '#141014', clamp01 = v => Math.max(0, Math.min(1, v));
const TYPE = NOIR_FONT.type, LABEL = NOIR_FONT.label;
const lg = (x, x0, y0, x1, y1, st) => { const g = x.createLinearGradient(x0, y0, x1, y1); st.forEach(([o, c]) => g.addColorStop(o, c)); return g; };
const rg = (x, cx, cy, r0, r1, st) => { const g = x.createRadialGradient(cx, cy, r0, cx, cy, r1); st.forEach(([o, c]) => g.addColorStop(o, c)); return g; };
const line = (x, pts, w, col) => { x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) p.length === 4 ? x.quadraticCurveTo(...p) : x.lineTo(...p); x.lineWidth = w; x.lineCap = 'round'; x.lineJoin = 'round'; x.strokeStyle = col; x.stroke(); };
const rrect = (x, l, t, w, h, r, fill, stroke, lw) => { x.beginPath(); x.roundRect(l, t, w, h, r); if (fill) { x.fillStyle = fill; x.fill(); } if (stroke) { x.lineWidth = lw; x.strokeStyle = stroke; x.stroke(); } };
const text = (x, s, px, py, size, col, { weight = 700, font = TYPE, align = 'center', base = 'middle', maxW } = {}) => { x.font = `${weight} ${Math.round(size)}px ${font}`; x.fillStyle = col; x.textAlign = align; x.textBaseline = base; maxW ? x.fillText(s, px, py, maxW) : x.fillText(s, px, py); };
const shadowOn = (x, b, dy = 0) => { x.shadowColor = 'rgba(0,0,0,.5)'; x.shadowBlur = b; x.shadowOffsetY = dy; };
const shadowOff = x => { x.shadowColor = 'transparent'; x.shadowBlur = 0; x.shadowOffsetY = 0; };

// ---------- таблички ----------
// латунная табличка на двери/стене: центр (x, y), ширина w; lit 0..1 — подсветка; screws: true — винты по краям
export function plaque(ctx, x, y, w, lines, { lit = 0, screws = true, col = '#C9A04A', a = 0, ink = '#2a1a0a' } = {}) {
  const h = w * (lines.length > 1 ? .36 : .28); ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  shadowOn(ctx, w * .04, w * .015); rrect(ctx, -w / 2, -h / 2, w, h, w * .03, lg(ctx, 0, -h / 2, 0, h / 2, [[0, '#F0D68A'], [.5, col], [1, '#8A6420']]), INK, Math.max(2, w * .012)); shadowOff(ctx);
  line(ctx, [[-w * .44, -h * .32], [w * .44, -h * .32]], Math.max(1, w * .008), 'rgba(255,250,220,.6)');
  lines.forEach((s, i) => text(ctx, s, 0, (i - (lines.length - 1) / 2) * h * .36, h * (lines.length > 1 ? .26 : .42), ink, { weight: 800, maxW: w * .86 }));
  if (screws) for (const sx of [-1, 1]) { ell(ctx, sx * w * .45, 0, w * .022, w * .022, '#8a7a5a', INK, Math.max(1, w * .006)); line(ctx, [[sx * w * .45 - w * .014, -w * .01], [sx * w * .45 + w * .014, w * .01]], Math.max(1, w * .005), INK); }
  if (lit > .01) { ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = rg(ctx, 0, 0, 0, w * .8, [[0, `rgba(255,220,140,${.5 * lit})`], [1, 'rgba(255,200,120,0)']]); ctx.fillRect(-w, -w, w * 2, w * 2); }
  ctx.restore(); return h;
}
// две дырки от винтов на месте снятой таблички
export function screwHoles(ctx, x, y, w) { for (const sx of [-1, 1]) { ell(ctx, x + sx * w * .45, y, w * .02, w * .02, '#0c0806', null); ell(ctx, x + sx * w * .45 + w * .006, y + w * .006, w * .012, w * .012, 'rgba(255,220,160,.25)', null); }
  ctx.save(); ctx.globalAlpha = .18; rrect(ctx, x - w / 2, y - w * .14, w, w * .28, w * .03, null, '#e8c890', 2); ctx.restore(); }
// настольная табличка-призма: низ-центр (x, y), ширина w
export function deskPlate(ctx, x, y, w, l1, l2, { a = 0 } = {}) {
  const h = w * .26; ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  shadowOn(ctx, w * .05, w * .02); ctx.beginPath(); ctx.moveTo(-w / 2, 0); ctx.lineTo(-w / 2 + w * .03, -h); ctx.lineTo(w / 2 - w * .03, -h); ctx.lineTo(w / 2, 0); ctx.closePath();
  ctx.fillStyle = lg(ctx, 0, -h, 0, 0, [[0, '#3a2a20'], [1, '#160e0a']]); ctx.fill(); shadowOff(ctx); ctx.lineWidth = Math.max(2, w * .01); ctx.strokeStyle = INK; ctx.stroke();
  rrect(ctx, -w * .44, -h * .86, w * .88, h * .72, w * .01, lg(ctx, 0, -h, 0, 0, [[0, '#F0D68A'], [1, '#A47A2A']]), null);
  text(ctx, l1, 0, -h * .64, h * .2, '#2a1a0a', { weight: 800, maxW: w * .84 }); text(ctx, l2, 0, -h * .36, h * .27, '#1a0e04', { weight: 900, maxW: w * .84 });
  ctx.restore();
}

// ---------- бумаги ----------
// бланк регистрации: центр (x, y), ширина w, поворот a; field — подпись поля, value — что вписано (u 0..1 — сколько написано)
export function form(ctx, x, y, w, a, { title = 'COMPANY REGISTRATION', field, value = '', u = 1, hi = 0 } = {}) {
  const h = w * 1.3; ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  shadowOn(ctx, w * .05, w * .02); rrect(ctx, -w / 2, -h / 2, w, h, w * .01, '#F4EFE2', null); shadowOff(ctx); rrect(ctx, -w / 2, -h / 2, w, h, w * .01, null, 'rgba(60,40,30,.6)', Math.max(1.5, w * .006));
  text(ctx, title, 0, -h * .42, w * .055, '#2a2018', { weight: 800, maxW: w * .9 });
  for (let i = 0; i < 4; i++) { const yy = -h * .3 + i * h * .07; ctx.fillStyle = 'rgba(40,40,60,.35)'; ctx.fillRect(-w * .4, yy, w * (.35 + (i % 2) * .3), w * .012); }
  const fy = h * .02; if (hi > .01) { ctx.fillStyle = `rgba(255,214,90,${.55 * hi})`; ctx.fillRect(-w * .44, fy - w * .07, w * .88, w * .22); }
  text(ctx, field, -w * .4, fy, w * .07, '#1c140c', { weight: 800, align: 'left', maxW: w * .8 });
  line(ctx, [[-w * .4, fy + w * .11], [w * .4, fy + w * .11]], Math.max(1.5, w * .006), '#2a2018');
  if (value && u > 0) { const n = Math.max(0, Math.round(value.length * clamp01(u))); text(ctx, value.slice(0, n), -w * .36, fy + w * .075, w * .075, '#1d3a8a', { weight: 700, font: NOIR_FONT.hand, align: 'left' }); }
  for (let i = 0; i < 5; i++) { const yy = h * .2 + i * h * .055; ctx.fillStyle = 'rgba(40,40,60,.3)'; ctx.fillRect(-w * .4, yy, w * (.5 + (i % 3) * .12), w * .011); }
  ctx.restore();
}
// лист заказа (держит бухгалтер): центр, ширина, поворот; lines — строки сверху вниз
export function sheet(ctx, x, y, w, a, lines, { h = w * 1.25, col = '#F4EFE2', bold = 0 } = {}) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a); shadowOn(ctx, w * .05, w * .02); rrect(ctx, -w / 2, -h / 2, w, h, w * .01, col, null); shadowOff(ctx); rrect(ctx, -w / 2, -h / 2, w, h, w * .01, null, 'rgba(60,40,30,.55)', Math.max(1.5, w * .006));
  for (let i = 0; i < 26; i++) ell(ctx, -w * .46, -h / 2 + (i + .5) * h / 26, w * .012, w * .012, 'rgba(60,40,30,.35)', null);   // перфорация ленты
  lines.forEach((s, i) => text(ctx, s, 0, -h * .38 + i * w * .12, w * (i === bold ? .085 : .062), i === bold ? '#1c140c' : '#3a2a20', { weight: i === bold ? 900 : 700, maxW: w * .84 }));
  for (let i = 0; i < 6; i++) { ctx.fillStyle = 'rgba(40,40,60,.28)'; ctx.fillRect(-w * .36, h * .08 + i * h * .06, w * (.5 + (i % 3) * .1), w * .012); }
  ctx.restore();
}
// стопка бумаг: низ-центр, ширина, высота стопки
export function paperStack(ctx, x, y, w, h, seed = 0) {
  const n = Math.max(3, Math.round(h / (w * .045)));
  for (let i = 0; i < n; i++) { const yy = y - i * h / n, dx = Math.sin(i * 2.3 + seed) * w * .05, a = Math.sin(i * 1.7 + seed) * .04;
    ctx.save(); ctx.translate(x + dx, yy); ctx.rotate(a); rrect(ctx, -w / 2, -h / n, w, h / n, 1, i % 2 ? '#EEE8DA' : '#F6F1E6', 'rgba(60,40,30,.5)', 1.5); ctx.restore(); }
}
// накладная (waybill): центр, ширина, поворот; stamps — [{ text, col, u (0..1 появление) }]; page — перелистывание 0..1
export function waybill(ctx, x, y, w, a, { stamps = [], page = 0, no = '4XG-2207-1193', check = 0, hi = 0 } = {}) {
  const h = w * 1.35; ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  shadowOn(ctx, w * .05, w * .02); rrect(ctx, -w / 2, -h / 2, w, h, w * .015, '#EFE6CC', null); shadowOff(ctx); rrect(ctx, -w / 2, -h / 2, w, h, w * .015, null, '#5a4630', Math.max(1.5, w * .008));
  rrect(ctx, -w / 2, -h / 2, w, h * .12, w * .015, '#C9A04A', null); text(ctx, 'WAYBILL', 0, -h * .44, w * .09, '#1c140c', { weight: 900 });
  text(ctx, 'NO. ' + no, 0, -h * .32, w * .07, '#1c140c', { weight: 800, maxW: w * .9 });
  if (hi > .01) { ctx.fillStyle = `rgba(255,214,90,${.55 * hi})`; ctx.fillRect(-w * .46, -h * .37, w * .92, w * .1); }
  for (let i = 0; i < 7; i++) { ctx.fillStyle = 'rgba(40,40,60,.33)'; ctx.fillRect(-w * .4, -h * .2 + i * h * .065, w * (.45 + (i % 3) * .13), w * .014); }
  stamps.forEach((st, i) => { if (st.u <= 0) return; const k = st.u < .2 ? 1 + 1.4 * (1 - st.u / .2) : 1; ctx.save(); ctx.translate(st.x ?? 0, st.y ?? (h * (.15 + i * .14))); ctx.rotate(st.a ?? -.12 + i * .1); ctx.scale(k, k); ctx.globalAlpha = Math.min(1, st.u * 5) * .9;
    rrect(ctx, -w * .38, -w * .09, w * .76, w * .18, w * .02, null, st.col || '#c8302a', w * .02); text(ctx, st.text, 0, 0, w * .1, st.col || '#c8302a', { weight: 900, font: LABEL, maxW: w * .7 }); ctx.restore(); });
  if (check > 0) { ctx.save(); ctx.globalAlpha = clamp01(check * 3); line(ctx, [[w * .18, -h * .3], [w * .26, -h * .22], [w * .26 + (w * .2) * clamp01(check * 2 - .3), -h * .22 - w * .3 * clamp01(check * 2 - .3)]], w * .03, '#1e9a4a'); ctx.restore(); }
  if (page > 0) { const pw = w * (1 - page); ctx.save(); ctx.beginPath(); ctx.moveTo(w / 2 - pw, -h / 2); ctx.lineTo(w / 2, -h / 2); ctx.lineTo(w / 2, h / 2); ctx.lineTo(w / 2 - pw, h / 2); ctx.closePath(); ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.fill(); ctx.restore();
    ctx.save(); const fx = w / 2 - 2 * pw * (1 - page); rrect(ctx, Math.min(fx, w / 2), -h / 2, Math.abs(w / 2 - fx), h, 0, '#F6EED8', '#5a4630', 1.5); ctx.restore(); }
  ctx.restore();
}
// штамп-печать в руке: (x, y) — кисть, s — масштаб (рукоять ~70 ед.)
export function stampTool(ctx, x, y, s, a = 0) { ctx.save(); ctx.translate(x, y); ctx.rotate(a); rrect(ctx, -10 * s, -6 * s, 20 * s, 44 * s, 6 * s, '#5a2a18', INK, 3 * s); rrect(ctx, -26 * s, 36 * s, 52 * s, 16 * s, 3 * s, '#2a2a30', INK, 3 * s); rrect(ctx, -28 * s, 50 * s, 56 * s, 7 * s, 2 * s, '#b0282a', null); ell(ctx, 0, -10 * s, 14 * s, 14 * s, '#7a3a20', INK, 3 * s); ctx.restore(); }
// оттиск штампа: центр, ширина, текст, поворот, u — время с удара (с)
export function stampMark(ctx, x, y, w, s, a, u, col = '#c8302a') {
  if (u < 0) return; const k = u < .12 ? 1 + 1.6 * (1 - u / .12) : 1; ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.scale(k, k); ctx.globalAlpha = Math.min(1, u / .05) * .92;
  const lines = Array.isArray(s) ? s : [s], h = w * (.22 + .12 * (lines.length - 1));
  rrect(ctx, -w / 2, -h / 2, w, h, w * .03, null, col, w * .028); rrect(ctx, -w / 2 + w * .03, -h / 2 + w * .03, w - w * .06, h - w * .06, w * .02, null, col, w * .01);
  lines.forEach((l, i) => text(ctx, l, 0, (i - (lines.length - 1) / 2) * w * .13, w * (lines.length > 1 ? .095 : .13), col, { weight: 900, font: LABEL, maxW: w * .9 }));
  ctx.restore();
}

// ---------- офис Megaspeed ----------
export function gamepad(ctx, x, y, s, a = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  ctx.beginPath(); ctx.moveTo(-60 * s, -20 * s); ctx.quadraticCurveTo(0, -34 * s, 60 * s, -20 * s); ctx.quadraticCurveTo(96 * s, 30 * s, 70 * s, 40 * s); ctx.quadraticCurveTo(46 * s, 46 * s, 30 * s, 16 * s); ctx.lineTo(-30 * s, 16 * s);
  ctx.quadraticCurveTo(-46 * s, 46 * s, -70 * s, 40 * s); ctx.quadraticCurveTo(-96 * s, 30 * s, -60 * s, -20 * s); ctx.closePath(); ctx.fillStyle = lg(ctx, 0, -30 * s, 0, 40 * s, [[0, '#E6E2D8'], [1, '#9A968C']]); ctx.fill(); ctx.lineWidth = 4 * s; ctx.strokeStyle = INK; ctx.stroke();
  ctx.fillStyle = '#2a2a30'; ctx.fillRect(-52 * s, -8 * s, 26 * s, 8 * s); ctx.fillRect(-43 * s, -17 * s, 8 * s, 26 * s);
  for (const [bx, by, c] of [[40, -12, '#d0302a'], [52, -2, '#2a8a4a'], [40, 8, '#2a5aa8'], [28, -2, '#d9b24a']]) ell(ctx, bx * s, by * s, 5.5 * s, 5.5 * s, c, INK, 1.5 * s);
  ctx.restore();
}
// счётчик электричества: центр, радиус, стрелка 0..1 (0 — влево, 1 — до упора вправо)
export function meter(ctx, x, y, r, k, glow = 0) {
  ctx.save(); ctx.translate(x, y); shadowOn(ctx, r * .2, r * .05);
  rrect(ctx, -r * 1.25, -r * 1.25, r * 2.5, r * 2.9, r * .15, lg(ctx, 0, -r, 0, r * 1.6, [[0, '#5a6068'], [1, '#2a2e34']]), INK, r * .04); shadowOff(ctx);
  ell(ctx, 0, 0, r, r, '#F2EEDF', INK, r * .05);
  for (let i = 0; i <= 10; i++) { const an = Math.PI * (1.15 + .7 * i / 10), r0 = r * (i % 5 ? .78 : .7); line(ctx, [[Math.cos(an) * r0, Math.sin(an) * r0], [Math.cos(an) * r * .88, Math.sin(an) * r * .88]], r * (i % 5 ? .025 : .04), i > 7 ? '#c8302a' : INK); }
  ctx.save(); ctx.globalAlpha = .9; ctx.beginPath(); ctx.arc(0, 0, r * .84, Math.PI * 1.71, Math.PI * 1.85); ctx.lineWidth = r * .08; ctx.strokeStyle = '#c8302a'; ctx.stroke(); ctx.restore();
  text(ctx, 'kWh', 0, r * .35, r * .2, '#2a2018', { weight: 800 });
  rrect(ctx, -r * .5, r * .5, r, r * .22, r * .03, '#1c1a1e', INK, r * .02);
  const dig = String(Math.floor(48213 + k * 99999)).padStart(6, '0'); text(ctx, dig, 0, r * .61, r * .16, '#e8e0c8', { weight: 800 });
  const an = Math.PI * (1.15 + .72 * k); line(ctx, [[0, 0], [Math.cos(an) * r * .8, Math.sin(an) * r * .8]], r * .05, '#c8302a'); ell(ctx, 0, 0, r * .09, r * .09, INK, null);
  ctx.save(); ctx.globalAlpha = .25; ctx.beginPath(); ctx.ellipse(-r * .3, -r * .45, r * .45, r * .18, -.5, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill(); ctx.restore();
  if (glow > .01) { ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = rg(ctx, 0, 0, 0, r * 2, [[0, `rgba(255,120,80,${.35 * glow})`], [1, 'rgba(255,90,60,0)']]); ctx.fillRect(-r * 2, -r * 2, r * 4, r * 4); }
  ctx.restore();
}
// картонная коробка (вид спереди-сбоку): низ-центр (x, y), ширина w, высота h; label — бирка на боку
export function carton(ctx, x, y, w, h, { tape = '#C9B07A', side = .28, label = null, dark = 0 } = {}) {
  const d = w * side; ctx.save(); ctx.translate(x - w / 2, y);
  ctx.beginPath(); ctx.moveTo(w, 0); ctx.lineTo(w + d, -d * .5); ctx.lineTo(w + d, -h - d * .5); ctx.lineTo(w, -h); ctx.closePath(); ctx.fillStyle = '#9A7448'; ctx.fill(); ctx.lineWidth = Math.max(1.5, w * .012); ctx.strokeStyle = INK; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -h); ctx.lineTo(d, -h - d * .5); ctx.lineTo(w + d, -h - d * .5); ctx.lineTo(w, -h); ctx.closePath(); ctx.fillStyle = '#D8B47E'; ctx.fill(); ctx.stroke();
  rrect(ctx, 0, -h, w, h, 0, lg(ctx, 0, -h, 0, 0, [[0, '#C89A62'], [1, '#A47A48']]), INK, Math.max(1.5, w * .012));
  ctx.fillStyle = tape; ctx.fillRect(w * .44, -h, w * .12, h * .35); ctx.beginPath(); ctx.moveTo(w * .44 + d * .5, -h - d * .25); ctx.lineTo(w * .56 + d * .5, -h - d * .25); ctx.lineTo(w * .56, -h); ctx.lineTo(w * .44, -h); ctx.fill();
  if (label) { rrect(ctx, w * .12, -h * .62, w * .5, h * .26, 2, '#F2EEE2', INK, 1.5); text(ctx, label, w * .37, -h * .49, h * .1, '#1c140c', { weight: 800, maxW: w * .46 }); }
  if (dark > 0) { ctx.globalAlpha = dark; ctx.fillStyle = '#04070c'; ctx.fillRect(-2, -h - d, w + d + 4, h + d + 4); }
  ctx.restore();
}
// наклейка на стекле серверной: центр, ширина
export function glassSticker(ctx, x, y, w, s, k = 1) {
  if (k <= 0) return; const u = Math.min(1, k), sc = u < 1 ? .6 + .4 * u : 1; ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); ctx.globalAlpha = u;
  const h = w * .32; rrect(ctx, -w / 2, -h / 2, w, h, h * .2, 'rgba(240,250,255,.92)', '#2a7a9a', w * .012);
  ctx.beginPath(); const cx = -w * .34, cy = 0; ctx.arc(cx - h * .12, cy + h * .04, h * .16, Math.PI * .5, Math.PI * 1.5); ctx.arc(cx + h * .02, cy - h * .1, h * .2, Math.PI, 0); ctx.arc(cx + h * .2, cy + h * .04, h * .14, Math.PI * 1.5, Math.PI * .5); ctx.closePath(); ctx.fillStyle = '#4ab4dc'; ctx.fill();
  text(ctx, s, w * .1, 0, h * .3, '#1a4a6a', { weight: 900, font: LABEL, maxW: w * .66 }); ctx.restore();
}
// тележка-рохля с коробками (курьер): (x, y) — колёса, s — масштаб, tilt — наклон ручки, n — коробок
export function handTruck(ctx, x, y, s, tilt, n = 3) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(tilt);
  for (let i = 0; i < n; i++) carton(ctx, 10 * s, -8 * s - i * 70 * s, 120 * s, 68 * s, { side: .2 });
  line(ctx, [[-56 * s, 0], [-56 * s, -n * 70 * s - 50 * s], [-30 * s, -n * 70 * s - 70 * s]], 9 * s, '#2a2a30'); line(ctx, [[-56 * s, 0], [70 * s, 0]], 10 * s, '#2a2a30');
  ell(ctx, -40 * s, 6 * s, 20 * s, 20 * s, '#1a1a1e', INK, 3 * s); ell(ctx, -40 * s, 6 * s, 7 * s, 7 * s, '#8a8f98', null);
  ctx.restore();
}
// карта на стене: Китай сверху, Малайзия снизу; dark — Китай темнеет; pins — сколько пинов (0..2)
export function wallMap(ctx, x, y, w, { dark = 0, pins = 2 } = {}) {
  const h = w * .75; ctx.save(); ctx.translate(x, y); shadowOn(ctx, w * .04, w * .02);
  rrect(ctx, -w / 2 - w * .03, -h / 2 - w * .03, w + w * .06, h + w * .06, w * .01, '#3a2414', INK, w * .006); shadowOff(ctx);
  rrect(ctx, -w / 2, -h / 2, w, h, 0, '#5a8aa0', null);
  ctx.save(); ctx.beginPath(); ctx.rect(-w / 2, -h / 2, w, h); ctx.clip(); ctx.scale(w / 1000, h / 750);
  const land = (pts, col) => { ctx.beginPath(); pts.forEach(([a, b], i) => (i ? ctx.lineTo(a - 500, b - 375) : ctx.moveTo(a - 500, b - 375))); ctx.closePath(); ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = '#2a2018'; ctx.stroke(); };
  const china = [[60, 0], [940, 0], [960, 140], [880, 230], [800, 330], [700, 360], [600, 330], [520, 360], [440, 330], [360, 300], [260, 300], [160, 240], [80, 160]];
  land(china, `rgb(${Math.round(226 - 140 * dark)},${Math.round(200 - 130 * dark)},${Math.round(150 - 100 * dark)})`);
  land([[420, 360], [520, 380], [560, 470], [540, 560], [470, 520], [430, 440]], '#D8C08A');                                // Индокитай
  land([[470, 560], [520, 580], [560, 660], [600, 700], [560, 720], [500, 650], [470, 600]], '#E8C86A');                     // Малайзия (полуостров)
  land([[660, 600], [780, 580], [860, 640], [820, 700], [700, 700]], '#E8C86A');                                              // Борнео (Малайзия)
  ctx.font = `800 40px ${TYPE}`; ctx.textAlign = 'center'; ctx.fillStyle = dark > .5 ? '#c8c0b0' : '#2a2018'; ctx.fillText('CHINA', 260 - 500, 120 - 375);
  ctx.fillStyle = '#2a2018'; ctx.font = `800 30px ${TYPE}`; ctx.fillText('MALAYSIA', 640 - 500, 760 - 375 - 20);
  if (pins > 0) for (const [px, py] of [[560, 640], [760, 640]].slice(0, pins)) { ell(ctx, px - 500, py - 375, 16, 16, '#c8302a', INK, 3); line(ctx, [[px - 500, py - 375 + 14], [px - 500, py - 375 + 40]], 4, INK); }
  ctx.restore(); ctx.restore();
}
// монитор: центр (x, y), ширина w; screen(ctx, w, h) рисует содержимое экрана в его координатах (0..w, 0..h)
export function monitor(ctx, x, y, w, screen, { stand = true, glow = .25 } = {}) {
  const h = w * .6, b = w * .035; ctx.save(); ctx.translate(x, y);
  if (stand) { rrect(ctx, -w * .06, h / 2, w * .12, w * .12, 3, '#1a1a20', INK, w * .006); rrect(ctx, -w * .2, h / 2 + w * .11, w * .4, w * .03, w * .01, '#1a1a20', INK, w * .006); }
  shadowOn(ctx, w * .04, w * .01); rrect(ctx, -w / 2 - b, -h / 2 - b, w + b * 2, h + b * 2, w * .02, '#16161c', INK, w * .006); shadowOff(ctx);
  ctx.save(); ctx.beginPath(); ctx.rect(-w / 2, -h / 2, w, h); ctx.clip(); ctx.translate(-w / 2, -h / 2); screen(ctx, w, h); ctx.restore();
  ctx.save(); ctx.globalAlpha = .08; ctx.beginPath(); ctx.moveTo(-w / 2, -h / 2); ctx.lineTo(-w * .1, -h / 2); ctx.lineTo(-w * .4, h / 2); ctx.lineTo(-w / 2, h / 2); ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill(); ctx.restore();
  if (glow > 0) { ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = rg(ctx, 0, 0, w * .3, w * .9, [[0, `rgba(120,220,230,${glow * .3})`], [1, 'rgba(80,200,220,0)']]); ctx.fillRect(-w, -w, w * 2, w * 2); }
  ctx.restore();
}
// экран: список клиентов (первая строка — ALIBABA, остальные закрыты: в источнике названы не все)
export function clientList(ctx, w, h, hi = 0) {
  ctx.fillStyle = '#0d1a22'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#1d3a4a'; ctx.fillRect(0, 0, w, h * .14);
  text(ctx, 'MEGASPEED · CLIENTS', w * .05, h * .07, h * .07, '#bfe8f0', { weight: 800, align: 'left' });
  for (let i = 0; i < 6; i++) { const y = h * (.24 + i * .12);
    if (i === 0) { if (hi > 0) { ctx.fillStyle = `rgba(255,214,90,${.85 * hi})`; ctx.fillRect(w * .03, y - h * .05, w * .94, h * .1); } text(ctx, 'ALIBABA', w * .08, y, h * .07, hi > .5 ? '#1c140c' : '#e8f4f6', { weight: 900, align: 'left' }); text(ctx, '#1', w * .9, y, h * .06, hi > .5 ? '#1c140c' : '#8ab8c8', { weight: 800 }); }
    else { ctx.fillStyle = 'rgba(140,190,205,.35)'; ctx.fillRect(w * .08, y - h * .022, w * (.38 + (i % 3) * .12), h * .044); text(ctx, '#' + (i + 1), w * .9, y, h * .06, '#5a8a9a', { weight: 800 }); }
    ctx.fillStyle = 'rgba(140,190,205,.15)'; ctx.fillRect(w * .03, y + h * .055, w * .94, 2); }
}
// открытый чемодан с пачками денег: центр, ширина
export function cashCase(ctx, x, y, w, a = 0) {
  const h = w * .55; ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  rrect(ctx, -w / 2, -h * 1.05, w, h, w * .04, lg(ctx, 0, -h, 0, 0, [[0, '#4a3020'], [1, '#2a1a10']]), INK, w * .015);       // крышка
  rrect(ctx, -w / 2, 0, w, h * .7, w * .04, '#3a2416', INK, w * .015);
  for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) { const bx = -w * .42 + c * w * .21, by = h * .08 + r * h * .28; rrect(ctx, bx, by, w * .19, h * .24, w * .01, '#7aa86a', INK, w * .006); ctx.fillStyle = '#E8E0C0'; ctx.fillRect(bx + w * .07, by, w * .05, h * .24); }
  rrect(ctx, -w * .08, -h * 1.12, w * .16, h * .08, w * .02, '#8a7a5a', INK, w * .01);
  ctx.restore();
}
// таймер аренды: центр, ширина; label — что на табло; flash 0..1 — вспышка смены
export function timerBox(ctx, x, y, w, label, flash = 0, press = 0) {
  const h = w * .5; ctx.save(); ctx.translate(x, y); shadowOn(ctx, w * .06, w * .03);
  rrect(ctx, -w / 2, -h / 2, w, h, w * .06, lg(ctx, 0, -h / 2, 0, h / 2, [[0, '#4a4e58'], [1, '#22252c']]), INK, w * .02); shadowOff(ctx);
  rrect(ctx, -w * .42, -h * .3, w * .84, h * .55, w * .03, '#0a140c', INK, w * .01);
  text(ctx, label, 0, -h * .02, h * .36, flash > .01 ? '#ffffff' : '#7dff9a', { weight: 900, font: LABEL });
  rrect(ctx, -w * .12, -h / 2 - h * .2 + press * h * .12, w * .24, h * .22, w * .03, '#c8302a', INK, w * .015);
  if (flash > .01) { ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = rg(ctx, 0, 0, 0, w, [[0, `rgba(140,255,170,${.5 * flash})`], [1, 'rgba(100,255,150,0)']]); ctx.fillRect(-w, -w, w * 2, w * 2); }
  ctx.restore();
}
// фоторамка на столе: низ-центр, ширина; turn — поворот к камере (0 — тыльной стороной, 1 — лицом); pic(ctx, w, h) — что в рамке (null — пустая)
export function photoFrame(ctx, x, y, w, turn, pic = null) {
  const h = w * 1.2, sx = Math.max(.06, Math.abs(Math.cos(Math.PI * (1 - turn) * .5 + Math.PI * .5 * 0))), face = turn > .5; ctx.save(); ctx.translate(x, y - h / 2);
  const kx = Math.max(.08, Math.abs(Math.cos((1 - turn) * Math.PI))); ctx.scale(kx, 1);
  shadowOn(ctx, w * .05, w * .02); rrect(ctx, -w / 2, -h / 2, w, h, w * .03, face ? lg(ctx, 0, -h / 2, 0, h / 2, [[0, '#C9A04A'], [1, '#7a5418']]) : '#3a2414', INK, w * .03); shadowOff(ctx);
  if (face) { ctx.save(); ctx.beginPath(); ctx.rect(-w * .38, -h * .4, w * .76, h * .8); ctx.clip(); ctx.translate(-w * .38, -h * .4); if (pic) pic(ctx, w * .76, h * .8); else { ctx.fillStyle = '#EFE9DC'; ctx.fillRect(0, 0, w * .76, h * .8); ctx.globalAlpha = .25; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(w * .3, 0); ctx.lineTo(0, h * .4); ctx.fill(); } ctx.restore(); }
  else { line(ctx, [[0, -h * .1], [0, h * .5]], w * .05, '#2a1a10'); rrect(ctx, -w * .3, -h * .3, w * .6, h * .5, w * .02, null, 'rgba(0,0,0,.4)', w * .02); }
  ctx.restore(); void sx;
}
// принтер с непрерывной лентой: низ-центр, ширина; flow — сколько ленты вытекло (0..1+), t — время (движение ленты)
export function printer(ctx, x, y, w, flow, t) {
  const h = w * .4; ctx.save(); ctx.translate(x, y);
  // лента: из щели вперёд и вниз до пола, складками
  const L = w * 2.6 * flow, step = w * .16;
  ctx.save(); ctx.beginPath(); let yy = -h * .55, xx = 0; ctx.moveTo(-w * .32, yy);
  const pts = []; for (let s = 0; s < L; s += step) { const k = s / step; pts.push([Math.sin(k * 1.3 + t * 3) * w * .03, yy + s]); }
  ctx.restore();
  rrect(ctx, -w * .34, -h * .55, w * .68, Math.min(L, w * 3), 2, '#F4EFE2', 'rgba(60,40,30,.5)', 2);
  for (let s = step; s < Math.min(L, w * 3); s += step) { line(ctx, [[-w * .34, -h * .55 + s], [w * .34, -h * .55 + s]], 1.5, 'rgba(60,40,30,.4)'); for (const sx of [-1, 1]) ell(ctx, sx * w * .31, -h * .55 + s - step * .5, w * .01, w * .01, 'rgba(60,40,30,.4)', null); ctx.fillStyle = 'rgba(40,40,60,.3)'; ctx.fillRect(-w * .25, -h * .55 + s - step * .6, w * (.3 + (Math.floor(s / step) % 3) * .1), w * .012); }
  rrect(ctx, -w / 2, -h, w, h, w * .05, lg(ctx, 0, -h, 0, 0, [[0, '#d8d4c8'], [1, '#8a867a']]), INK, w * .012);
  rrect(ctx, -w * .38, -h * .62, w * .76, h * .1, 2, '#1a1a1e', null); rrect(ctx, w * .3, -h * .9, w * .1, h * .12, 2, '#2a8a4a', null); void xx; void pts;
  ctx.restore();
}
// планшет с двумя столбиками 2023 / 2024 и подписью ×90: центр, ширина; grow 0..1
export function tabletChart(ctx, x, y, w, grow) {
  const h = w * .66; ctx.save(); ctx.translate(x, y); shadowOn(ctx, w * .05, w * .02); rrect(ctx, -w / 2, -h / 2, w, h, w * .05, '#16161c', INK, w * .01); shadowOff(ctx);
  rrect(ctx, -w * .44, -h * .42, w * .88, h * .84, w * .02, '#0e1820', null);
  const base = h * .3; line(ctx, [[-w * .36, base], [w * .36, base]], 3, '#5a7a8a');
  rrect(ctx, -w * .26, base - h * .03, w * .14, h * .03, 1, '#7dd6f0', null); text(ctx, '2023', -w * .19, base + h * .07, h * .07, '#bfe8f0', { weight: 800 });
  const bh = h * .62 * grow; rrect(ctx, w * .06, base - bh, w * .16, bh, 2, '#4ade80', null); text(ctx, '2024', w * .14, base + h * .07, h * .07, '#bfe8f0', { weight: 800 });
  if (grow > .8) text(ctx, '×90', -w * .12, -h * .2, h * .2, '#ffffff', { weight: 900, font: LABEL });
  ctx.restore();
}
// бирка на ящике (нитка из точки крепления, качание a)
export function hangTag(ctx, x, y, w, a, s) { ctx.save(); ctx.translate(x, y); ctx.rotate(a); line(ctx, [[0, 0], [0, w * .3]], w * .015, '#3a2a18'); ctx.translate(0, w * .3);
  const h = w * .5; shadowOn(ctx, w * .05, w * .02); ctx.beginPath(); ctx.moveTo(-w / 2, -h * .2); ctx.lineTo(-w * .3, -h / 2); ctx.lineTo(w * .3, -h / 2); ctx.lineTo(w / 2, -h * .2); ctx.lineTo(w / 2, h / 2); ctx.lineTo(-w / 2, h / 2); ctx.closePath(); ctx.fillStyle = '#F2E8CC'; ctx.fill(); shadowOff(ctx); ctx.lineWidth = w * .015; ctx.strokeStyle = '#3a2a18'; ctx.stroke();
  ell(ctx, 0, -h * .3, w * .04, w * .04, '#3a2a18', null); text(ctx, s, 0, h * .12, w * .14, '#1c140c', { weight: 900, maxW: w * .9 }); ctx.restore(); }
// табло арендаторов в фойе: центр, ширина; rows — [этаж, текст | null — закрашено]; arrows 0..1, last — яркость последней строки
export function tenantBoard(ctx, x, y, w, rows, arrows = 0, last = 0) {
  const rh = w * .085, h = rh * (rows.length + 1.6); ctx.save(); ctx.translate(x, y - h / 2);
  shadowOn(ctx, w * .04, w * .02); rrect(ctx, -w / 2 - w * .03, -w * .03, w + w * .06, h + w * .06, w * .02, '#3a2a18', INK, w * .006); shadowOff(ctx);
  rrect(ctx, -w / 2, 0, w, h, w * .01, '#0d0d10', null); text(ctx, 'DIRECTORY', 0, rh * .7, rh * .5, '#C9A04A', { weight: 900 });
  rows.forEach(([fl, s], i) => { const yy = rh * (1.8 + i), isLast = i === rows.length - 1;
    ctx.globalAlpha = isLast ? .35 + .65 * last : 1; text(ctx, fl, -w * .4, yy, rh * .42, '#d8d0c0', { weight: 800, align: 'left' });
    if (s) text(ctx, s, -w * .2, yy, rh * .42, isLast ? '#f0e6c8' : '#d8d0c0', { weight: 800, align: 'left', maxW: w * .6 }); else { ctx.fillStyle = 'rgba(216,208,192,.35)'; ctx.fillRect(-w * .2, yy - rh * .14, w * (.35 + (i % 3) * .1), rh * .28); }
    ctx.globalAlpha = 1;
    if (!isLast && arrows > 0) { const k = clamp01(arrows * 1.4 - i * .06); if (k > 0) { ctx.save(); ctx.globalAlpha = k; line(ctx, [[w * .38, yy], [w * .44, yy], [w * .44, yy + (rh * (rows.length - 1 - i)) * k]], rh * .06, '#e8c060'); ctx.restore(); } } });
  if (arrows > .7) { const yy = rh * (1.8 + rows.length - 1); line(ctx, [[w * .44, yy], [w * .3, yy]], rh * .07, '#e8c060'); ctx.fillStyle = '#e8c060'; ctx.beginPath(); ctx.moveTo(w * .28, yy); ctx.lineTo(w * .32, yy - rh * .12); ctx.lineTo(w * .32, yy + rh * .12); ctx.fill(); }
  ctx.restore();
}

// ---------- бар Тайбэя ----------
export function whisky(ctx, x, y, s) { ctx.save(); ctx.translate(x, y); rrect(ctx, -22 * s, -46 * s, 44 * s, 50 * s, 5 * s, 'rgba(220,235,245,.35)', INK, 3 * s); rrect(ctx, -19 * s, -22 * s, 38 * s, 24 * s, 3 * s, 'rgba(230,140,40,.85)', null); rrect(ctx, -12 * s, -34 * s, 14 * s, 13 * s, 2 * s, 'rgba(240,250,255,.8)', null); line(ctx, [[-16 * s, -40 * s], [-16 * s, -4 * s]], 3 * s, 'rgba(255,255,255,.5)'); ctx.restore(); }
export function camera(ctx, x, y, s, a = 0, flash = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  rrect(ctx, -60 * s, -36 * s, 120 * s, 76 * s, 10 * s, '#1c1c22', INK, 4 * s); rrect(ctx, -40 * s, -54 * s, 40 * s, 20 * s, 4 * s, '#2a2a30', INK, 3 * s);
  ell(ctx, 18 * s, 4 * s, 30 * s, 30 * s, '#2a2a30', INK, 4 * s); ell(ctx, 18 * s, 4 * s, 18 * s, 18 * s, '#3a5a7a', INK, 2 * s); ell(ctx, 12 * s, -2 * s, 6 * s, 6 * s, 'rgba(255,255,255,.5)', null);
  rrect(ctx, -50 * s, -28 * s, 26 * s, 12 * s, 2 * s, flash > .01 ? '#ffffff' : '#c8c8d0', null);
  if (flash > .01) { ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = rg(ctx, -37 * s, -22 * s, 0, 220 * s, [[0, `rgba(255,255,255,${flash})`], [1, 'rgba(255,255,255,0)']]); ctx.fillRect(-300 * s, -300 * s, 600 * s, 600 * s); }
  ctx.restore();
}
export function phone(ctx, x, y, s, a = 0, screen = null, flash = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a); rrect(ctx, -26 * s, -50 * s, 52 * s, 100 * s, 8 * s, '#16161c', INK, 3 * s);
  ctx.save(); ctx.beginPath(); ctx.rect(-22 * s, -44 * s, 44 * s, 88 * s); ctx.clip(); if (screen) { ctx.translate(-22 * s, -44 * s); screen(ctx, 44 * s, 88 * s); } else { ctx.fillStyle = '#3a6a8a'; ctx.fillRect(-22 * s, -44 * s, 44 * s, 88 * s); } ctx.restore();
  if (flash > .01) { ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = rg(ctx, 0, 0, 0, 160 * s, [[0, `rgba(255,255,255,${flash})`], [1, 'rgba(255,255,255,0)']]); ctx.fillRect(-200 * s, -200 * s, 400 * s, 400 * s); }
  ctx.restore();
}
export function laptop(ctx, x, y, s, a = 0, sign = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a); rrect(ctx, -90 * s, -60 * s, 180 * s, 120 * s, 10 * s, lg(ctx, 0, -60 * s, 0, 60 * s, [[0, '#9aa0aa'], [1, '#5a606a']]), INK, 4 * s);
  ell(ctx, 0, 0, 16 * s, 16 * s, 'rgba(255,255,255,.25)', null);
  if (sign > 0) { ctx.save(); ctx.beginPath(); const n = 30, L = Math.round(n * Math.min(1, sign)); for (let i = 0; i <= L; i++) { const u = i / n, px = (-60 + 120 * u) * s, py = (20 + Math.sin(u * 14) * 14 - u * 30) * s; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.lineWidth = 9 * s; ctx.strokeStyle = '#141014'; ctx.lineCap = 'round'; ctx.stroke(); ctx.restore(); }
  ctx.restore();
}
export function marker(ctx, x, y, s, a = 0) { ctx.save(); ctx.translate(x, y); ctx.rotate(a); rrect(ctx, -6 * s, -8 * s, 12 * s, 70 * s, 5 * s, '#141014', INK, 2 * s); rrect(ctx, -6 * s, -8 * s, 12 * s, 16 * s, 3 * s, '#c8302a', null); ctx.restore(); }
export function badge(ctx, x, y, w, l1, l2, a = 0) { const h = w * .62; ctx.save(); ctx.translate(x, y); ctx.rotate(a); line(ctx, [[-w * .3, -h * 1.4], [0, -h / 2], [w * .3, -h * 1.4]], w * .05, '#2a8a4a'); rrect(ctx, -w / 2, -h / 2, w, h, w * .06, '#F2EEE2', INK, w * .03); ctx.fillStyle = '#2a8a4a'; ctx.fillRect(-w / 2 + w * .04, -h / 2 + w * .04, w * .92, h * .26);
  text(ctx, l1, 0, -h * .24, h * .16, '#ffffff', { weight: 900, font: LABEL, maxW: w * .86 }); text(ctx, l2, 0, h * .14, h * .2, '#1c140c', { weight: 900, maxW: w * .9 }); ctx.restore(); }

// ---------- таможня ----------
// грузовик сзади (едет от камеры к шлагбауму): низ-центр задних колёс (x, y), ширина кузова w
export function truckRear(ctx, x, y, w, { lights = 1, door = 'MAERSK' } = {}) {
  const h = w * 1.05, ink = INK; ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = 'rgba(4,6,10,.55)'; ctx.beginPath(); ctx.ellipse(0, 0, w * .62, w * .06, 0, 0, TAU); ctx.fill();
  rrect(ctx, -w * .38, -w * .1, w * .76, w * .1, 3, '#16161a', null);
  for (const sx of [-1, 1]) { rrect(ctx, sx * w * .36 - w * .09, -w * .14, w * .18, w * .14, w * .03, '#141418', ink, 3); }
  rrect(ctx, -w / 2, -h - w * .08, w, h, w * .015, lg(ctx, -w / 2, 0, w / 2, 0, [[0, '#4a6a8a'], [.5, '#3a5a78'], [1, '#22364a']]), ink, Math.max(2, w * .008));
  line(ctx, [[0, -h - w * .08], [0, -w * .08]], Math.max(2, w * .008), ink);
  for (const sx of [-.26, .26]) for (const k of [.2, .5, .8]) line(ctx, [[sx * w, -w * .08 - h * k], [sx * w, -w * .08 - h * k + w * .02]], w * .012, '#8a9aa8');
  for (const sx of [-1, 1]) line(ctx, [[sx * w * .06, -h * .9], [sx * w * .06, -h * .2]], w * .012, '#9aa6b4');
  rrect(ctx, -w * .2, -h * .6, w * .4, w * .1, 3, '#E8E0C8', ink, 2); text(ctx, 'MY ' + '2207', 0, -h * .6 + w * .05, w * .06, '#1c140c', { weight: 900 });
  for (const sx of [-1, 1]) { rrect(ctx, sx * w * .44 - w * .05, -w * .2, w * .1, w * .07, 3, lights > 0 ? '#ff3a2a' : '#5a1a14', ink, 2); }
  if (lights > 0) { ctx.globalCompositeOperation = 'screen'; for (const sx of [-1, 1]) { ctx.fillStyle = rg(ctx, sx * w * .44, -w * .17, 0, w * .25, [[0, `rgba(255,60,40,${.5 * lights})`], [1, 'rgba(255,40,30,0)']]); ctx.fillRect(sx * w * .44 - w * .3, -w * .5, w * .6, w * .6); } }
  ctx.restore(); void door;
}
// кабина грузовика сбоку (водительская дверь с окном): лево-низ (x, y), ширина w; окно — [l, t, w, h] в долях — для обрезки водителя
export const CAB_WIN = [.18, .1, .62, .34];
export function cabSide(ctx, x, y, w, layer = 'back') {
  const h = w * 1.1; ctx.save(); ctx.translate(x, y);
  if (layer === 'back') { rrect(ctx, 0, -h, w, h, w * .06, lg(ctx, 0, -h, 0, 0, [[0, '#e0e4ea'], [1, '#9aa4b0']]), INK, w * .01);
    rrect(ctx, w * CAB_WIN[0], -h + h * CAB_WIN[1], w * CAB_WIN[2], h * CAB_WIN[3], w * .03, '#1a2230', INK, w * .01); return ctx.restore(); }
  // передний слой: рама окна поверх водителя и дверь ниже окна
  ctx.beginPath(); ctx.rect(0, -h, w, h); ctx.rect(w * CAB_WIN[0], -h + h * CAB_WIN[1], w * CAB_WIN[2], h * CAB_WIN[3]); ctx.fillStyle = lg(ctx, 0, -h, 0, 0, [[0, '#e8ecf2'], [1, '#a4aeba']]); ctx.fill('evenodd');
  rrect(ctx, 0, -h, w, h, w * .06, null, INK, w * .01); rrect(ctx, w * CAB_WIN[0], -h + h * CAB_WIN[1], w * CAB_WIN[2], h * CAB_WIN[3], w * .03, null, INK, w * .012);
  line(ctx, [[w * .1, -h * .45], [w * .9, -h * .45]], w * .008, 'rgba(0,0,0,.35)'); rrect(ctx, w * .66, -h * .4, w * .14, w * .03, 3, '#5a606a', INK, 2);
  rrect(ctx, w * .3, -h * .3, w * .4, h * .07, 3, '#2a5a8a', null); text(ctx, 'LOGISTICS', w * .5, -h * .265, h * .045, '#ffffff', { weight: 900, font: LABEL });
  ctx.restore();
}
// шлагбаум: ось (x, y), длина L, угол up 0..1 (0 — закрыт, 1 — поднят), толщина th
export function barrierArm(ctx, x, y, L, up, th) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 2 * .92 * up); ctx.translate(-L, 0);
  rrect(ctx, 0, -th / 2, L, th, th * .3, '#F2EEE2', INK, Math.max(2, th * .12));
  ctx.save(); ctx.beginPath(); ctx.rect(0, -th / 2, L, th); ctx.clip(); ctx.fillStyle = '#d0302a'; for (let s = 0; s < L; s += th * 3) { ctx.beginPath(); ctx.moveTo(s, th); ctx.lineTo(s + th * 1.5, -th); ctx.lineTo(s + th * 3, -th); ctx.lineTo(s + th * 1.5, th); ctx.fill(); } ctx.restore();
  rrect(ctx, 0, -th / 2, L, th, th * .3, null, INK, Math.max(2, th * .12));
  ctx.restore();
}
// раздутый чемодан: низ-центр, ширина; bulge 0..1 — дышит; burst 0..1 — шов лопнул, наружу сыплются видеокарты
export function suitcase(ctx, x, y, w, t, burst = 0) {
  const b = 1 + .04 * Math.sin(t * 9), h = w * .72 * b; ctx.save(); ctx.translate(x, y);
  rrect(ctx, -w * .12, -h - w * .1, w * .24, w * .09, w * .03, null, INK, w * .03);
  ctx.beginPath(); ctx.moveTo(-w / 2, -h * .1); ctx.quadraticCurveTo(-w * .56 * b, -h * .5, -w / 2, -h); ctx.quadraticCurveTo(0, -h * 1.08, w / 2, -h); ctx.quadraticCurveTo(w * .56 * b, -h * .5, w / 2, -h * .1); ctx.quadraticCurveTo(0, 0, -w / 2, -h * .1); ctx.closePath();
  ctx.fillStyle = lg(ctx, 0, -h, 0, 0, [[0, '#8a5a32'], [1, '#4a2e18']]); ctx.fill(); ctx.lineWidth = w * .02; ctx.strokeStyle = INK; ctx.stroke();
  for (const sx of [-1, 1]) line(ctx, [[sx * w * .3, -h * .98], [sx * w * .3, -h * .06]], w * .03, '#2a1a0e');
  if (burst <= 0) line(ctx, [[-w * .5, -h * .55], [w * .5, -h * .55]], w * .012, 'rgba(0,0,0,.45)');
  else { const u = clamp01(burst); ctx.beginPath(); ctx.moveTo(-w * .48, -h * .55); for (let i = 1; i <= 10; i++) ctx.lineTo(-w * .48 + i * w * .096, -h * .55 + (i % 2 ? -1 : 1) * w * .05 * u); ctx.lineWidth = w * .04; ctx.strokeStyle = '#0c0806'; ctx.stroke();
    for (let i = 0; i < 6; i++) { const ang = -1.2 + i * .45, r = w * (.2 + .5 * u) * (1 + (i % 2) * .3); gpu(ctx, Math.cos(ang) * r, -h * .55 + Math.sin(ang) * r * .5 + w * .5 * u * u, w * .22, ang * .6); } }
  ctx.restore();
}
// видеокарта (плата с кулерами): центр, ширина, поворот
export function gpu(ctx, x, y, w, a = 0) {
  const h = w * .42; ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  rrect(ctx, -w / 2, -h / 2, w, h, w * .04, lg(ctx, 0, -h / 2, 0, h / 2, [[0, '#3a3e48'], [1, '#1a1c22']]), INK, Math.max(1.5, w * .02));
  for (const sx of [-.24, .24]) { ell(ctx, sx * w, 0, h * .36, h * .36, '#121216', INK, Math.max(1, w * .012)); for (let k = 0; k < 5; k++) line(ctx, [[sx * w, 0], [sx * w + Math.cos(k * 1.26) * h * .3, Math.sin(k * 1.26) * h * .3]], Math.max(1, w * .015), '#4a4e58'); }
  ctx.fillStyle = '#4ade80'; ctx.fillRect(-w * .48, h * .3, w * .96, h * .08); ctx.fillStyle = '#C9A04A'; ctx.fillRect(-w * .3, h / 2, w * .5, h * .1);
  ctx.restore();
}
// лобстер (сверху-спереди): центр, длина s (~ 1 = 200 px), поворот; claw — сжимает ли клешня карту (gpu рисуется снаружи)
export function lobster(ctx, x, y, s, a = 0, t = 0, clawOpen = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a); const red = '#c8302a', dk = '#7a1410';
  for (let i = 0; i < 6; i++) { const yy = 20 * s + i * 22 * s, ww = (46 - i * 5) * s; ctx.beginPath(); ctx.ellipse(0, yy, ww, 14 * s, 0, 0, TAU); ctx.fillStyle = i % 2 ? red : '#b02420'; ctx.fill(); ctx.lineWidth = 3 * s; ctx.strokeStyle = INK; ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(-30 * s, 150 * s); ctx.lineTo(0, 175 * s); ctx.lineTo(30 * s, 150 * s); ctx.closePath(); ctx.fillStyle = dk; ctx.fill(); ctx.stroke();
  for (let i = 0; i < 4; i++) for (const sd of [-1, 1]) line(ctx, [[sd * 30 * s, -10 * s + i * 18 * s], [sd * (70 + Math.sin(t * 6 + i) * 6) * s, i * 22 * s], [sd * 84 * s, 18 * s + i * 22 * s]], 5 * s, dk);
  ctx.beginPath(); ctx.ellipse(0, -30 * s, 40 * s, 56 * s, 0, 0, TAU); ctx.fillStyle = lg(ctx, -40 * s, -80 * s, 40 * s, 20 * s, [[0, '#e8503a'], [1, dk]]); ctx.fill(); ctx.lineWidth = 4 * s; ctx.strokeStyle = INK; ctx.stroke();
  for (const sd of [-1, 1]) { line(ctx, [[sd * 10 * s, -80 * s], [sd * (60 + Math.sin(t * 4 + sd) * 10) * s, -190 * s], [sd * 90 * s, -230 * s]], 3 * s, dk); ell(ctx, sd * 16 * s, -76 * s, 7 * s, 7 * s, INK, null); }
  for (const sd of [-1, 1]) { const op = sd > 0 ? clawOpen : .2 + .1 * Math.sin(t * 5);
    line(ctx, [[sd * 30 * s, -50 * s], [sd * 70 * s, -90 * s], [sd * 80 * s, -130 * s]], 14 * s, red); line(ctx, [[sd * 30 * s, -50 * s], [sd * 70 * s, -90 * s], [sd * 80 * s, -130 * s]], 3 * s, INK);
    ctx.save(); ctx.translate(sd * 80 * s, -140 * s); ctx.rotate(sd * -.3); ctx.beginPath(); ctx.ellipse(0, -20 * s, 30 * s, 44 * s, 0, 0, TAU); ctx.fillStyle = red; ctx.fill(); ctx.lineWidth = 4 * s; ctx.strokeStyle = INK; ctx.stroke();
    ctx.save(); ctx.rotate(-sd * op * .5); ctx.beginPath(); ctx.ellipse(sd * 14 * s, -74 * s, 12 * s, 34 * s, sd * .2, 0, TAU); ctx.fillStyle = red; ctx.fill(); ctx.stroke(); ctx.restore();
    ctx.beginPath(); ctx.ellipse(-sd * 12 * s, -74 * s, 11 * s, 32 * s, -sd * .2, 0, TAU); ctx.fillStyle = '#b02420'; ctx.fill(); ctx.stroke(); ctx.restore(); }
  ctx.restore();
}
// деревянный ящик (сверху-спереди открыт): низ-центр, ширина, глубина; lid 0..1 — крышка открыта; inside(ctx, w, d) — содержимое
export function crate(ctx, x, y, w, h, { lid = 0, inside = null, d = w * .35, label = null } = {}) {
  ctx.save(); ctx.translate(x - w / 2, y);
  rrect(ctx, 0, -h, w, h, 3, lg(ctx, 0, -h, 0, 0, [[0, '#B08050'], [1, '#7a5430']]), INK, Math.max(2, w * .01));
  for (let i = 1; i < 4; i++) line(ctx, [[0, -h * i / 4], [w, -h * i / 4]], Math.max(1.5, w * .006), 'rgba(40,24,10,.55)');
  line(ctx, [[0, -h], [w, 0]], w * .025, '#8a6038'); line(ctx, [[0, -h], [w, 0]], Math.max(1.5, w * .006), INK);
  if (label) { rrect(ctx, w * .55, -h * .62, w * .36, h * .3, 2, '#F2EEE2', INK, 1.5); text(ctx, label, w * .73, -h * .47, h * .1, '#1c140c', { weight: 900, maxW: w * .32 }); }
  // верх: открытый проём (вид немного сверху)
  ctx.beginPath(); ctx.moveTo(0, -h); ctx.lineTo(d * .4, -h - d); ctx.lineTo(w + d * .4, -h - d); ctx.lineTo(w, -h); ctx.closePath(); ctx.fillStyle = '#2a1a0e'; ctx.fill(); ctx.lineWidth = Math.max(2, w * .01); ctx.strokeStyle = INK; ctx.stroke();
  if (inside) { ctx.save(); ctx.beginPath(); ctx.moveTo(0, -h); ctx.lineTo(d * .4, -h - d); ctx.lineTo(w + d * .4, -h - d); ctx.lineTo(w, -h); ctx.closePath(); ctx.clip(); ctx.translate(0, -h - d); inside(ctx, w, d); ctx.restore(); }
  if (lid < 1) { const k = 1 - clamp01(lid); ctx.save(); ctx.translate(0, -h); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(d * .4, -d * k); ctx.lineTo(w + d * .4, -d * k); ctx.lineTo(w, 0); ctx.closePath(); ctx.fillStyle = '#C49460'; ctx.fill(); ctx.stroke();
    for (let i = 1; i < 3; i++) line(ctx, [[w * i / 3, 0], [w * i / 3 + d * .4, -d * k]], 1.5, 'rgba(40,24,10,.5)'); ctx.restore(); }
  else { ctx.save(); ctx.translate(0, -h - d); ctx.beginPath(); ctx.moveTo(d * .4, 0); ctx.lineTo(d * .2, -d * .9); ctx.lineTo(w + d * .2, -d * .9); ctx.lineTo(w + d * .4, 0); ctx.closePath(); ctx.fillStyle = '#C49460'; ctx.fill(); ctx.stroke(); ctx.restore(); }
  ctx.restore();
}
// серверный блок в ящике (видно сверху): прямоугольник с решёткой и огоньками (огней нет — не работает)
export function serverTop(ctx, w, d) { ctx.fillStyle = '#2a2e36'; ctx.fillRect(w * .08, d * .15, w * .84, d * .7); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(w * .08, d * .15, w * .84, d * .7); for (let i = 0; i < 8; i++) line(ctx, [[w * (.14 + i * .1), d * .25], [w * (.14 + i * .1), d * .75]], 2, '#4a505a'); }
// лом
export function crowbar(ctx, x, y, s, a) { ctx.save(); ctx.translate(x, y); ctx.rotate(a); line(ctx, [[0, 0], [150 * s, 0], [170 * s, -16 * s]], 9 * s, INK); line(ctx, [[0, 0], [150 * s, 0], [170 * s, -16 * s]], 5 * s, '#c8302a'); line(ctx, [[0, 0], [-14 * s, 12 * s]], 9 * s, INK); ctx.restore(); }
// капля пота
export function drop(ctx, x, y, r) { ctx.save(); ctx.translate(x, y); ctx.beginPath(); ctx.moveTo(0, -r * 1.6); ctx.quadraticCurveTo(r, 0, 0, r); ctx.quadraticCurveTo(-r, 0, 0, -r * 1.6); ctx.fillStyle = 'rgba(170,220,250,.95)'; ctx.fill(); ctx.lineWidth = Math.max(1, r * .18); ctx.strokeStyle = '#2a5a7a'; ctx.stroke(); ell(ctx, -r * .3, -r * .2, r * .25, r * .25, '#fff', null); ctx.restore(); }
export { text as label, rrect, line as inkLine, lg, rg, shadowOn, shadowOff };
// ручка в кисти: (x, y) — кисть, s — масштаб (ручка ~80 ед.), a — направление стержня
export function penTool(ctx, x, y, s, a) { ctx.save(); ctx.translate(x, y); ctx.rotate(a); rrect(ctx, -8 * s, -6 * s, 74 * s, 12 * s, 5 * s, '#1d2a55', INK, 3 * s); ctx.beginPath(); ctx.moveTo(-8 * s, -5 * s); ctx.lineTo(-24 * s, 0); ctx.lineTo(-8 * s, 5 * s); ctx.closePath(); ctx.fillStyle = '#d9c38a'; ctx.fill(); ctx.stroke(); line(ctx, [[40 * s, -6 * s], [62 * s, -10 * s]], 3 * s, '#C9A04A'); ctx.restore(); }
// световой короб над дверью (вывеска компании): центр, ширина, текст, lit 0..1
export function signBox(ctx, x, y, w, s, lit = 1) {
  const h = w * .2; ctx.save(); ctx.translate(x, y); shadowOn(ctx, w * .03, w * .01); rrect(ctx, -w / 2, -h / 2, w, h, w * .02, '#141216', INK, w * .01); shadowOff(ctx);
  if (lit > .01) { ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = rg(ctx, 0, 0, 0, w * .7, [[0, `rgba(255,214,140,${.45 * lit})`], [1, 'rgba(255,200,120,0)']]); ctx.fillRect(-w, -w * .6, w * 2, w * 1.2); ctx.restore(); }
  text(ctx, s, 0, 0, h * .55, lit > .5 ? '#FFE6B0' : `rgba(150,130,100,${.5 + .5 * lit})`, { weight: 900, font: LABEL, maxW: w * .9 });
  if (lit > .5) { ctx.save(); ctx.globalAlpha = .4 * lit; ctx.shadowColor = '#ffcf80'; ctx.shadowBlur = h * .5; text(ctx, s, 0, 0, h * .55, '#FFE6B0', { weight: 900, font: LABEL, maxW: w * .9 }); ctx.restore(); }
  ctx.restore();
}
// холст вне экрана 1920×1080 (сцена видеозвонка, снимок, кадр галереи): fn(ctx) рисует; возвращает холст
const OFF = new Map();
export function offscreen(key, fn, w = 1920, h = 1080) { let c = OFF.get(key); if (!c) { c = document.createElement('canvas'); c.width = w; c.height = h; OFF.set(key, c); } const x = c.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.filter = 'none'; x.clearRect(0, 0, w, h); fn(x); return c; }
// песочные часы: центр, высота h, поворот a; top 0..1 — сколько песка вверху (сыплется вниз)
export function hourglass(ctx, x, y, h, a = 0, top = 1) {
  const w = h * .55; ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  rrect(ctx, -w / 2, -h / 2, w, h * .08, h * .02, '#6a4020', INK, h * .02); rrect(ctx, -w / 2, h / 2 - h * .08, w, h * .08, h * .02, '#6a4020', INK, h * .02);
  for (const sx of [-1, 1]) line(ctx, [[sx * w * .42, -h * .42], [sx * w * .42, h * .42]], h * .03, '#4a2a12');
  const bulb = sy => { ctx.beginPath(); ctx.moveTo(-w * .34, sy * h * .42); ctx.quadraticCurveTo(-w * .34, sy * h * .08, -w * .04, 0); ctx.lineTo(w * .04, 0); ctx.quadraticCurveTo(w * .34, sy * h * .08, w * .34, sy * h * .42); ctx.closePath(); };
  ctx.save(); bulb(-1); ctx.clip(); ctx.fillStyle = '#E8C46A'; const tt = h * .4 * clamp01(top); ctx.fillRect(-w, -tt * .9 - h * .02, w * 2, tt); ctx.restore();
  ctx.save(); bulb(1); ctx.clip(); ctx.fillStyle = '#E8C46A'; const bb = h * .4 * (1 - clamp01(top)); ctx.beginPath(); ctx.moveTo(-w, h * .42); ctx.lineTo(w, h * .42); ctx.lineTo(w, h * .42 - bb); ctx.lineTo(0, h * .42 - bb * 1.4); ctx.lineTo(-w, h * .42 - bb); ctx.fill(); ctx.restore();
  if (top > .02 && top < .98) line(ctx, [[0, 0], [0, h * .4]], h * .012, '#E8C46A');
  for (const sy of [-1, 1]) { bulb(sy); ctx.fillStyle = 'rgba(200,230,240,.18)'; ctx.fill(); ctx.lineWidth = h * .018; ctx.strokeStyle = INK; ctx.stroke(); }
  line(ctx, [[-w * .22, -h * .32], [-w * .16, -h * .18]], h * .02, 'rgba(255,255,255,.6)');
  ctx.restore();
}
// график по регионам на доске-мольберте: центр доски, ширина; china — высота столбика CHINA 0..1, glow
export function regionChart(ctx, x, y, w, china = 1, glow = 0, title = 'SALES BY REGION') {
  const h = w * .72; ctx.save(); ctx.translate(x, y);
  shadowOn(ctx, w * .03, w * .015); rrect(ctx, -w / 2, -h / 2, w, h, w * .02, '#F4F2EA', INK, w * .012); shadowOff(ctx);
  text(ctx, title, 0, -h * .4, h * .07, '#1c140c', { weight: 900 });
  const base = h * .36, bw = w * .14, regs = [['US', .55], ['CHINA', china], ['TAIWAN', .42], ['OTHER', .3]];
  line(ctx, [[-w * .42, base], [w * .42, base]], w * .008, INK); line(ctx, [[-w * .42, base], [-w * .42, -h * .3]], w * .008, INK);
  regs.forEach(([r, v], i) => { const cx = -w * .3 + i * w * .2, bh = h * .6 * v;
    if (bh > 1) { rrect(ctx, cx - bw / 2, base - bh, bw, bh, 2, r === 'CHINA' ? '#4ade80' : '#7a8a9a', INK, w * .006);
      if (r === 'CHINA' && glow > .01) { ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = rg(ctx, cx, base - bh / 2, 0, w * .3, [[0, `rgba(120,255,160,${.6 * glow})`], [1, 'rgba(100,255,150,0)']]); ctx.fillRect(cx - w * .3, base - bh - w * .2, w * .6, bh + w * .4); ctx.restore(); } }
    else { ctx.save(); ctx.setLineDash([w * .015, w * .012]); rrect(ctx, cx - bw / 2, base - h * .05, bw, h * .05, 2, null, '#9a8a7a', w * .004); ctx.restore(); }
    text(ctx, r, cx, base + h * .07, h * .055, '#1c140c', { weight: 800 }); });
  ctx.restore();
}
