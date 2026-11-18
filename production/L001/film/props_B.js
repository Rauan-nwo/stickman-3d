// film/props_B.js — реквизит гл. 7–10 (рабочий B): телевизор с выпусками, документы (список фирм, меморандум, сводка перехвата с плашкой,
// утёкшая папка, папка расшифровок, первая полоса), настольный календарь, экран пенсионного счёта, кружка, удостоверение, снимки.
// Контур туши, cel-тени, шрифты документов канала (NOIR_FONT). Все функции рисуют в текущем преобразовании ctx (пиксели экрана).
import { ell, clamp, lerp, E, NOIR_FONT as F, jensen, alice, noirShade, act } from 'engine';
const TAU = Math.PI * 2, INK = '#141014';
const lg = (x, x0, y0, x1, y1, st) => { const g = x.createLinearGradient(x0, y0, x1, y1); st.forEach(([o, c]) => g.addColorStop(o, c)); return g; };
const rr = (x, a, b, w, h, r) => { x.beginPath(); x.roundRect(a, b, w, h, r); };
export const txt = (x, s, a, b, size, { col = INK, font = F.type, w = 700, align = 'left', base = 'middle', max } = {}) => { x.font = `${w} ${Math.round(size)}px ${font}`; x.fillStyle = col; x.textAlign = align; x.textBaseline = base; max ? x.fillText(s, a, b, max) : x.fillText(s, a, b); };
const paperFill = (x, w, h) => lg(x, 0, 0, w, h, [[0, '#f6f0e0'], [1, '#e2d6b8']]);

// ---------- маленькие фигуры для картинок (ТВ, снимки): герой по грудь/по пояс в своём кадре ----------
const J = jensen(), AL = alice(); J.spec.shade = noirShade([-1, -.4]); AL.spec.shade = noirShade([1, -.4]);
// fig(C) в прямоугольнике: (cx, footY) — точка ступней, s — масштаб (пикс. на ед.), pose — поля позы
export function miniFig(x, C, cx, footY, s, pose = {}, t = 0) {
  const p = act(t, [[0, pose.emo || 'neutral']]); Object.assign(p, { view: 'threeQuarter', facing: 1, stance: 'stand', bob: 0, sq: 0, lean: 0, tilt: 0, blink: 0, ...pose });
  x.save(); x.translate(cx, footY); x.scale(s, s); C.draw(x, p); x.restore();
}
export const CAST_MINI = { J, AL };

// ---------- телевизор: корпус + экран (cx, cy — центр, w — ширина корпуса, a — поворот) ----------
// c = { scene(x, w, h, t), chyron, chyronK, ticker, breaking, bug, live, on (0..1 — включается) }
export function tv(ctx, cx, cy, w, a, t, c = {}) {
  const h = w * .6, sw = w * .9, sh = h * .84;
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(a); ctx.lineJoin = 'round';
  rr(ctx, -w / 2, -h / 2, w, h, w * .03); ctx.fillStyle = lg(ctx, 0, -h / 2, 0, h / 2, [[0, '#2c2e36'], [1, '#121318']]); ctx.fill(); ctx.lineWidth = Math.max(2, w * .012); ctx.strokeStyle = INK; ctx.stroke();
  ctx.save(); rr(ctx, -sw / 2, -sh / 2, sw, sh, w * .01); ctx.clip(); ctx.translate(-sw / 2, -sh / 2);
  tvScreen(ctx, sw, sh, t, c);
  ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = lg(ctx, 0, 0, sw, sh, [[0, 'rgba(160,200,255,.10)'], [.5, 'rgba(160,200,255,0)']]); ctx.fillRect(0, 0, sw, sh);
  ctx.restore();
  ctx.restore();
}
// экран ТВ без корпуса (в координатах экрана 0..sw, 0..sh)
export function tvScreen(ctx, sw, sh, t, c = {}) {
  const on = c.on ?? 1;
  ctx.fillStyle = '#05070c'; ctx.fillRect(0, 0, sw, sh);
  if (on > 0) {
    ctx.save(); if (on < 1) { ctx.translate(sw / 2, sh / 2); ctx.scale(1, Math.max(.02, E.outCubic(on))); ctx.translate(-sw / 2, -sh / 2); }
    if (c.scene) c.scene(ctx, sw, sh, t);
    if (c.breaking) { ctx.fillStyle = '#b3121b'; ctx.fillRect(0, sh * .06, sw * .42, sh * .1); txt(ctx, 'BREAKING NEWS', sw * .02, sh * .11, sh * .062, { col: '#fff', font: F.label, w: 800, max: sw * .38 }); }
    if (c.live) { ctx.fillStyle = '#b3121b'; rr(ctx, sw * .86, sh * .06, sw * .11, sh * .08, sh * .01); ctx.fill(); txt(ctx, 'LIVE', sw * .915, sh * .1, sh * .05, { col: '#fff', font: F.label, w: 800, align: 'center' }); }
    if (c.chyron) { const k = clamp(c.chyronK ?? 1); if (k > 0) { const y = sh * .68, bw = sw * .92 * E.outCubic(k);
      ctx.fillStyle = '#f1ece0'; ctx.fillRect(sw * .04, y, bw, sh * .14); ctx.fillStyle = '#b3121b'; ctx.fillRect(sw * .04, y, sw * .015, sh * .14);
      ctx.save(); ctx.beginPath(); ctx.rect(sw * .04, y, bw, sh * .14); ctx.clip(); txt(ctx, c.chyron, sw * .07, y + sh * .07, sh * (c.chyronSize || .066), { font: F.label, w: 800, max: sw * .86 }); ctx.restore(); } }
    if (c.ticker) { const tb = sh * (c.tickerBand || .14), y = sh - tb; ctx.fillStyle = '#0d1430'; ctx.fillRect(0, y, sw, tb); ctx.save(); ctx.beginPath(); ctx.rect(0, y, sw, tb); ctx.clip();
      const k = clamp(c.tickerK ?? 1), xx = lerp(sw, sw * .03, E.outCubic(k)) - (c.tickerRun || 0) * sw * .04; txt(ctx, c.ticker, xx, y + tb / 2, tb * .44, { col: '#ffd84a', font: F.label, w: 800 }); ctx.restore(); }
    if (c.bug) txt(ctx, c.bug, sw * .04, sh * .04 + sh * .03, sh * .05, { col: 'rgba(255,255,255,.75)', font: F.label, w: 800 });
    ctx.fillStyle = 'rgba(255,255,255,.04)'; for (let y = 0; y < sh; y += Math.max(2, sh / 160)) ctx.fillRect(0, y, sw, 1);   // строки развёртки
    ctx.restore();
    if (on < 1) { ctx.fillStyle = `rgba(230,240,255,${(1 - on) * .8})`; ctx.fillRect(0, sh / 2 - 2, sw, 4); }
  }
}
// студийные фоны выпусков
export function studioBg(x, w, h, hue = 'blue') {
  const g = lg(x, 0, 0, 0, h, hue === 'red' ? [[0, '#5a0c10'], [1, '#1a0406']] : [[0, '#12305a'], [1, '#050c1c']]); x.fillStyle = g; x.fillRect(0, 0, w, h);
  x.strokeStyle = hue === 'red' ? 'rgba(255,190,120,.12)' : 'rgba(140,200,255,.12)'; x.lineWidth = Math.max(1, w * .003);
  for (let i = 0; i < 12; i++) { x.beginPath(); x.moveTo(w * (i / 12), h * .62); x.lineTo(w * (i / 12) - w * .2, 0); x.stroke(); }
}
// трибуна с букетом микрофонов (по центру, низ кадра); col — цвет трибуны; who — рисовальщик за трибуной
export function podium(x, w, h, col = '#2a2f44', who, flags = false) {
  if (flags) for (const fx of [.14, .86]) { x.fillStyle = '#d8d0c0'; x.fillRect(w * fx - 2, h * .12, 4, h * .6); for (let k = 0; k < 6; k++) { x.fillStyle = k % 2 ? '#f2f0ea' : '#b3222c'; x.fillRect(w * fx + 2, h * (.14 + k * .03), w * .08, h * .03); } x.fillStyle = '#26366a'; x.fillRect(w * fx + 2, h * .14, w * .035, h * .09); }
  if (who) who(x, w, h);
  x.fillStyle = col; x.strokeStyle = INK; x.lineWidth = Math.max(2, w * .005); rr(x, w * .32, h * .6, w * .36, h * .45, w * .01); x.fill(); x.stroke();
  for (let i = 0; i < 5; i++) { const a = -.5 + i * .25; x.save(); x.translate(w * .5, h * .62); x.rotate(a); x.fillStyle = '#16161c'; x.fillRect(-w * .005, -h * .16, w * .01, h * .16); ell(x, 0, -h * .17, w * .016, h * .03, ['#d0302a', '#2a2a30', '#3a6ad0', '#2a2a30', '#e0c040'][i], INK, 1.5); x.restore(); }
}
// безликий силуэт по грудь (президент у микрофонов, «красная трибуна без лица»)
export function bust(x, cx, cy, s, col = '#0c0e16', rim = 'rgba(255,220,170,.5)') {
  x.fillStyle = col; x.beginPath(); x.ellipse(cx, cy, s * .2, s * .24, 0, 0, TAU); x.fill();
  x.beginPath(); x.moveTo(cx - s * .55, cy + s * .9); x.quadraticCurveTo(cx - s * .5, cy + s * .3, cx, cy + s * .3); x.quadraticCurveTo(cx + s * .5, cy + s * .3, cx + s * .55, cy + s * .9); x.fill();
  x.strokeStyle = rim; x.lineWidth = Math.max(1.5, s * .025); x.beginPath(); x.arc(cx, cy, s * .21, -1.2, .4); x.stroke();
}

// ---------- бумага ----------
// лист: центр (x, y), ширина w, высота h, поворот a; body(ctx, w, h) — содержимое в координатах листа (0,0 — левый верх)
export function sheet(ctx, x, y, w, h, a, body, { col, shadow = true } = {}) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.translate(-w / 2, -h / 2);
  if (shadow) { ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = w * .05; ctx.shadowOffsetY = w * .02; }
  ctx.fillStyle = col || paperFill(ctx, w, h); ctx.fillRect(0, 0, w, h); ctx.shadowColor = 'transparent';
  ctx.lineWidth = Math.max(1, w * .004); ctx.strokeStyle = 'rgba(60,40,30,.55)'; ctx.strokeRect(0, 0, w, h);
  if (body) body(ctx, w, h);
  ctx.restore();
}
// строки «текста» (серые полоски) — фон документа
export function lines(x, x0, y0, w, n, step, { col = 'rgba(40,30,25,.45)', th = .32 } = {}) {
  for (let i = 0; i < n; i++) { const lw = w * (.62 + .38 * ((i * 37 + 11) % 10) / 10); x.fillStyle = col; x.fillRect(x0, y0 + i * step, lw, step * th); }
}
// маркер по строке: k 0..1 — доля закраски
export function highlight(x, x0, y, w, h, k, col = 'rgba(255,226,60,.55)') { if (k <= 0) return; x.fillStyle = col; x.fillRect(x0, y - h / 2, w * E.outCubic(clamp(k)), h); }
// красный круг от руки: k 0..1
export function redCircle(x, cx, cy, rx, ry, k, lw = 6) { if (k <= 0) return; x.save(); x.strokeStyle = '#d0302a'; x.lineWidth = lw; x.lineCap = 'round'; x.beginPath(); x.ellipse(cx, cy, rx, ry, -.08, -2.2, -2.2 + TAU * 1.05 * clamp(k)); x.stroke(); x.restore(); }
// штамп: текст в рамке, удар u (0..; <0 — нет)
export function stamp(x, cx, cy, text, size, u, a = -.1, col = '#c8312b') {
  if (u < 0) return; const k = u < .14 ? lerp(1.8, 1, E.outCubic(u / .14)) : 1; x.save(); x.translate(cx, cy); x.rotate(a); x.scale(k, k); x.globalAlpha = clamp(u / .06) * .92;
  x.font = `900 ${Math.round(size)}px ${F.label}`; const w = x.measureText(text).width + size * .8; x.strokeStyle = col; x.lineWidth = size * .12; x.strokeRect(-w / 2, -size * .75, w, size * 1.5);
  txt(x, text, 0, size * .05, size, { col, font: F.label, w: 900, align: 'center' }); x.restore();
}

// список допущенных покупателей (Минторг) — #242; hi 0..1 — подсветка строки row
export function clearedList(x, w, h, hi, row = 4) {
  txt(x, 'U.S. COMMERCE · CLEARED BUYERS', w * .06, h * .07, w * .052, { w: 800 });
  x.fillStyle = INK; x.fillRect(w * .06, h * .11, w * .88, Math.max(1, h * .004));
  const names = ['A-TECH LTD', 'NORTHSTAR CO', 'BLUE RIVER INC', 'KUNLUN TRADING', 'HUAXIN DIGITAL', 'ORIENT LINK', 'JADE COMPUTE', 'SKYGATE LTD'];
  names.forEach((n, i) => { const y = h * (.17 + i * .095);
    if (i === row) highlight(x, w * .04, y, w * .92, h * .07, hi);
    txt(x, `${String(i + 1).padStart(2, '0')}  ${n}`, w * .07, y, w * .045); txt(x, 'CLEARED', w * .93, y, w * .036, { align: 'right', col: '#1f6a3a' }); });
}
// меморандум, страница: title, строки, выделенная строка (k), скрепка со снимком (pic)
export function memoPage(x, w, h, { title = 'MEMORANDUM', head = 'TOP SECRET', line, lineY = .58, k = 0, pic, picK = 1, page }) {
  txt(x, head, w / 2, h * .05, w * .04, { col: '#b3121f', font: F.label, w: 900, align: 'center' });
  txt(x, title, w * .08, h * .12, w * .05, { w: 800 }); x.fillStyle = INK; x.fillRect(w * .08, h * .155, w * .84, Math.max(1, h * .003));
  lines(x, w * .08, h * .2, w * .84, 7, h * .045);
  if (line) { highlight(x, w * .07, h * lineY, w * .86, h * .05, k); txt(x, line, w * .08, h * lineY, w * .037, { w: 700, max: w * .84 }); }
  lines(x, w * .08, h * (lineY + .06), w * .84, 6, h * .045);
  if (page) txt(x, page, w * .92, h * .96, w * .03, { align: 'right' });
  if (pic && picK > 0) { x.save(); x.translate(w * .72, h * .3); x.rotate(.06); const pw = w * .4, ph = pw * .72, d = (1 - E.outBack(clamp(picK))) * -h * .15;
    x.translate(0, d); x.fillStyle = '#f4efe2'; x.shadowColor = 'rgba(0,0,0,.4)'; x.shadowBlur = w * .02; x.fillRect(-pw / 2, -ph / 2, pw, ph + pw * .08); x.shadowColor = 'transparent';
    x.save(); x.beginPath(); x.rect(-pw * .45, -ph * .45, pw * .9, ph * .82); x.clip(); x.translate(-pw * .45, -ph * .45); pic(x, pw * .9, ph * .82); x.restore();
    x.strokeStyle = '#a8adb6'; x.lineWidth = Math.max(2, w * .008); rr(x, -pw * .32, -ph * .62, w * .035, ph * .3, w * .017); x.stroke(); x.restore(); }   // скрепка
}
// сводка перехвата с чёрной плашкой на имени: lift 0..1 — плашку отрывают вверх; name — что под ней
export function intercept(x, w, h, { lift = 0, name = 'JENSEN HUANG', ref = 'INTERCEPT SUMMARY', finger = null }) {
  txt(x, 'TOP SECRET // SI', w / 2, h * .05, w * .04, { col: '#b3121f', font: F.label, w: 900, align: 'center' });
  txt(x, ref, w * .08, h * .12, w * .05, { w: 800 }); x.fillStyle = INK; x.fillRect(w * .08, h * .155, w * .84, Math.max(1, h * .003));
  lines(x, w * .08, h * .2, w * .84, 5, h * .05);
  const y = h * .5; txt(x, 'CONTACT:', w * .08, y, w * .045, { w: 800 });
  txt(x, name, w * .36, y, w * .06, { w: 900 });
  if (lift < 1) { x.save(); const u = E.inCubic(clamp(lift)); x.translate(w * .62, y - u * h * .5); x.rotate(-.5 * u); x.fillStyle = '#0a0a0c'; x.fillRect(-w * .28, -h * .04, w * .56, h * .08); x.restore(); }
  lines(x, w * .08, h * .58, w * .84, 6, h * .05);
  txt(x, 'A U.S. PERSON — NAME UNMASKED ON REQUEST', w * .08, h * .9, w * .032, { col: 'rgba(40,30,25,.8)' });
}
// папка TOP SECRET (вид сверху): open 0..1, copy — полосы ксерокса и штамп COPY, inner(ctx, w, h) — что внутри
export function tsFolder(x, w, h, { open = 0, copy = false, label = 'TOP SECRET', inner }) {
  const k = clamp(open);
  x.fillStyle = '#c9ae72'; x.strokeStyle = INK; x.lineWidth = Math.max(2, w * .006); rr(x, 0, 0, w, h, w * .01); x.fill(); x.stroke();
  if (k > 0) { x.fillStyle = '#f4efe2'; x.fillRect(w * .04, h * .04, w * .92, h * .92); if (inner) { x.save(); x.translate(w * .04, h * .04); inner(x, w * .92, h * .92); x.restore(); } }
  if (k < 1) { x.save(); x.translate(0, 0); x.scale(1 - k, 1); x.fillStyle = '#d4b97c'; rr(x, 0, 0, w, h, w * .01); x.fill(); x.stroke();
    if (k < .5) { x.fillStyle = 'rgba(179,18,31,.9)'; x.fillRect(w * .18, h * .4, w * .64, h * .16); txt(x, label, w / 2, h * .48, h * .1, { col: '#fff', font: F.label, w: 900, align: 'center', max: w * .6 });
      if (copy) { x.fillStyle = 'rgba(30,30,30,.18)'; for (let i = 0; i < 9; i++) x.fillRect(0, h * (i * .11 + .02), w, h * .012); stamp(x, w * .7, h * .78, 'COPY', h * .09, 1, -.12, '#2a2a30'); } }
    x.restore(); }
}
// толстая папка TRANSCRIPTS с закладками JAN…DEC (вид спереди-сверху); close 0..1 — обложка падает и захлопывается
export function transcripts(x, w, h, close = 1) {
  const th = h * .22; x.fillStyle = '#efe6cf'; x.strokeStyle = INK; x.lineWidth = Math.max(2, w * .006); x.fillRect(w * .03, h * .3, w * .94, th); x.strokeRect(w * .03, h * .3, w * .94, th);
  for (let i = 0; i < 14; i++) { x.fillStyle = 'rgba(60,40,20,.25)'; x.fillRect(w * .03, h * .3 + i * th / 14, w * .94, 1); }
  const M = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  M.forEach((m, i) => { const tx = w * (.06 + i * .075); x.fillStyle = ['#c8312b', '#d9a43a', '#3a7ac8', '#3aa860'][i % 4]; x.fillRect(tx, h * .3 - h * .07, w * .06, h * .09); x.strokeRect(tx, h * .3 - h * .07, w * .06, h * .09); txt(x, m, tx + w * .03, h * .3 - h * .025, h * .045, { col: '#fff', font: F.label, w: 800, align: 'center' }); });
  const a = (1 - E.inCubic(clamp(close))) * -1.35; x.save(); x.translate(w * .03, h * .3); x.rotate(a); x.fillStyle = '#3a4a6a'; x.fillRect(0, -h * .02, w * .94, h * .26); x.strokeRect(0, -h * .02, w * .94, h * .26);
  if (a > -.6) { x.fillStyle = '#f4efe2'; x.fillRect(w * .3, h * .05, w * .34, h * .1); txt(x, 'TRANSCRIPTS', w * .47, h * .1, h * .06, { font: F.type, w: 900, align: 'center', max: w * .32 }); } x.restore();
}
// первая полоса газеты: шапка (стилизована, без логотипа), заголовок, снимок pic
export function frontPage(x, w, h, pic) {
  txt(x, 'The New York Times', w / 2, h * .07, w * .085, { font: "Georgia, 'Times New Roman', serif", w: 700, align: 'center', max: w * .9 });
  x.fillStyle = INK; x.fillRect(w * .04, h * .12, w * .92, Math.max(1, h * .004)); x.fillRect(w * .04, h * .135, w * .92, Math.max(1, h * .002));
  txt(x, 'U.S. SPIES SAW CHINESE AGENT', w / 2, h * .19, w * .062, { font: "Georgia, serif", w: 900, align: 'center', max: w * .9 });
  txt(x, 'CLOSE TO NVIDIA CHIEF', w / 2, h * .25, w * .062, { font: "Georgia, serif", w: 900, align: 'center', max: w * .9 });
  if (pic) { x.save(); x.beginPath(); x.rect(w * .06, h * .3, w * .56, h * .36); x.clip(); x.translate(w * .06, h * .3); pic(x, w * .56, h * .36); x.restore(); x.strokeStyle = INK; x.lineWidth = 2; x.strokeRect(w * .06, h * .3, w * .56, h * .36); }
  lines(x, w * .66, h * .3, w * .28, 14, h * .026, { th: .4 }); lines(x, w * .06, h * .7, w * .88, 9, h * .028, { th: .4 });
}
// настольный календарь (перекидной) у тикера: earn 0..1 — обводка даты EARNINGS, in5 0..1 — табличка IN 5 DAYS
export function deskCalendar(x, w, h, earn = 0, in5 = 0) {
  x.fillStyle = '#2a2a30'; x.beginPath(); x.moveTo(w * .1, h); x.lineTo(w * .2, h * .1); x.lineTo(w * .8, h * .1); x.lineTo(w * .9, h); x.closePath(); x.fill();
  x.fillStyle = '#f4f0e6'; x.fillRect(w * .16, h * .14, w * .68, h * .8); x.strokeStyle = INK; x.lineWidth = Math.max(2, w * .008); x.strokeRect(w * .16, h * .14, w * .68, h * .8);
  x.fillStyle = '#b3121f'; x.fillRect(w * .16, h * .14, w * .68, h * .14); txt(x, 'NOVEMBER 2026', w / 2, h * .21, h * .07, { col: '#fff', font: F.label, w: 800, align: 'center' });
  for (let r = 0; r < 5; r++) for (let c = 0; c < 7; c++) { const d = r * 7 + c - 6; if (d < 1 || d > 30) continue; const cx = w * (.2 + c * .088), cy = h * (.36 + r * .11);
    txt(x, String(d), cx + w * .03, cy, h * .05, { align: 'center', col: d === 17 ? '#b3121f' : INK }); }
  for (const r0 of [0, 1, 2]) for (let k = 1; k <= 1; k++) { }
  const ex = w * (.2 + 1 * .088) + w * .03, ey = h * (.36 + 3 * .11);   // 17 ноября — вторник
  redCircle(x, ex, ey, w * .05, h * .05, earn, Math.max(3, w * .012)); if (earn > .6) txt(x, 'EARNINGS', ex, ey + h * .075, h * .04, { col: '#b3121f', font: F.label, w: 900, align: 'center' });
  if (in5 > 0) { x.save(); x.translate(w / 2, h * 1.08); x.scale(1, E.outBack(clamp(in5))); x.fillStyle = '#121216'; x.fillRect(-w * .3, -h * .07, w * .6, h * .14); txt(x, 'IN 5 DAYS', 0, 0, h * .085, { col: '#ffd84a', font: F.label, w: 900, align: 'center' }); x.restore(); }
}
// экран пенсионного счёта: круговая диаграмма S&P 500, кусок NVDA (red 0..1 — краснеет, pop 0..1 — выдвигается), плашка (tag)
export function retirementScreen(x, w, h, { red = 0, pop = 0, tag = 0, tap = -1 }) {
  x.fillStyle = '#0c1a26'; x.fillRect(0, 0, w, h);
  txt(x, 'YOUR RETIREMENT ACCOUNT', w * .05, h * .1, h * .065, { col: '#e8f0f8', font: F.label, w: 800 });
  txt(x, 'S&P 500 INDEX FUND', w * .05, h * .18, h * .05, { col: '#8fb0cc', font: F.label, w: 700 });
  const cx = w * .36, cy = h * .58, R = h * .3, sl = [[.12, '#3a6ea8'], [.1, '#5a88b8'], [.09, '#7aa0c8'], [.11, '#46628a'], [.15, '#2f4f78'], [.19, '#557aa6'], [.16, '#6c8cb6']];
  const sum = sl.reduce((q, [f]) => q + f, 0); let a0 = -Math.PI / 2 + TAU * .08; for (const [f, c] of sl) { const a1 = a0 + TAU * .92 * f / sum; x.fillStyle = c; x.beginPath(); x.moveTo(cx, cy); x.arc(cx, cy, R, a0, a1); x.closePath(); x.fill(); x.strokeStyle = '#0c1a26'; x.lineWidth = 2; x.stroke(); a0 = a1; }   // остальной круг замкнут: 92 % без зазоров
  const n0 = -Math.PI / 2, n1 = -Math.PI / 2 + TAU * .08, mid = (n0 + n1) / 2, off = R * .18 * E.outBack(clamp(pop)), ox = Math.cos(mid) * off, oy = Math.sin(mid) * off;
  const col = `rgb(${Math.round(lerp(60, 220, red))},${Math.round(lerp(190, 50, red))},${Math.round(lerp(90, 50, red))})`;
  x.fillStyle = col; x.beginPath(); x.moveTo(cx + ox, cy + oy); x.arc(cx + ox, cy + oy, R * 1.04, n0, n1); x.closePath(); x.fill(); x.strokeStyle = '#fff'; x.lineWidth = 3; x.stroke();
  txt(x, 'NVDA', cx + ox + Math.cos(mid) * R * .62, cy + oy + Math.sin(mid) * R * .62, h * .045, { col: '#fff', font: F.label, w: 900, align: 'center' });
  if (red > .5) txt(x, '−14%', w * .7, h * .45, h * .12, { col: '#ff5a4a', font: F.label, w: 900, align: 'center' });
  txt(x, 'NVIDIA', w * .7, h * .32, h * .05, { col: '#8fb0cc', font: F.label, w: 700, align: 'center' });
  if (tag > 0) { x.save(); x.translate(w * .7, h * .7); const k = E.outBack(clamp(tag)); x.scale(k, k); x.fillStyle = '#efe4c8'; rr(x, -w * .18, -h * .07, w * .36, h * .14, 6); x.fill(); txt(x, '401(K) · IRA', 0, 0, h * .065, { font: F.type, w: 800, align: 'center' }); x.restore(); }
  if (tap >= 0 && tap < .25) { x.strokeStyle = `rgba(255,255,255,${1 - tap / .25})`; x.lineWidth = 4; x.beginPath(); x.arc(cx + ox + Math.cos(mid) * R * .6, cy + oy + Math.sin(mid) * R * .6, R * (.15 + tap), 0, TAU); x.stroke(); }
  return [cx + ox + Math.cos(mid) * R * .6, cy + oy + Math.sin(mid) * R * .6];
}
// стена тикеров / тикер NVDA (маленькая панель): price, chg
export function tickerPanel(x, w, h, chg = '−14%') {
  x.fillStyle = '#0a0a0e'; rr(x, 0, 0, w, h, h * .1); x.fill(); x.strokeStyle = INK; x.lineWidth = 3; x.stroke();
  txt(x, 'NVDA', w * .08, h * .5, h * .42, { col: '#e8e8ee', font: F.label, w: 900 }); txt(x, '▼ ' + chg, w * .92, h * .5, h * .42, { col: '#ff4a3a', font: F.label, w: 900, align: 'right' });
}
// кружка в кисти (ручка к кисти): (hx, hy) — кисть, s — пикс. на ед. фигуры, f — куда смотрит ручка (+1 — кисть слева от кружки), tremble — дрожь
export function mug(x, hx, hy, s, f = 1, tremble = 0, steam = 0, t = 0) {
  const j = tremble ? Math.sin(t * 70) * 4 * s * tremble : 0, w = 70 * s, h = 84 * s, cx = hx + f * (w * .5 + 14 * s) + j, top = hy - h * .55;
  x.save(); x.lineJoin = 'round'; x.strokeStyle = INK; x.lineWidth = 5 * s;
  x.beginPath(); x.ellipse(hx + f * 8 * s + j, hy, 16 * s, 22 * s, 0, 0, TAU); x.stroke();                 // ручка (кисть перекрывает её)
  rr(x, cx - w / 2, top, w, h, [4 * s, 4 * s, 14 * s, 14 * s]); x.fillStyle = lg(x, cx - w / 2, 0, cx + w / 2, 0, [[0, '#f2ead8'], [1, '#bfb39a']]); x.fill(); x.stroke();
  x.fillStyle = '#3a2416'; x.beginPath(); x.ellipse(cx, top + 4 * s, w * .42, 7 * s, 0, 0, TAU); x.fill();
  if (tremble > .2) { x.fillStyle = 'rgba(80,50,30,.9)'; x.beginPath(); x.ellipse(cx + j * 2, top + 4 * s, w * .2, 4 * s, 0, 0, TAU); x.fill(); }
  if (steam > 0) { x.strokeStyle = `rgba(240,240,240,${.35 * steam})`; x.lineWidth = 4 * s; for (const d of [-14, 10]) { x.beginPath(); x.moveTo(cx + d * s, top - 6 * s); x.bezierCurveTo(cx + d * s - 14 * s, top - 40 * s, cx + d * s + 14 * s, top - 60 * s, cx + d * s, top - 90 * s); x.stroke(); } }
  x.restore();
}
// удостоверение (раскрытое, кожаная обложка, жетон): центр, ширина
export function idBadge(x, cx, cy, w, a = 0) {
  const h = w * .66; x.save(); x.translate(cx, cy); x.rotate(a); x.lineJoin = 'round'; x.strokeStyle = INK; x.lineWidth = Math.max(2, w * .02);
  rr(x, -w / 2, -h / 2, w, h, w * .04); x.fillStyle = '#1e1a18'; x.fill(); x.stroke();
  rr(x, w * .04, -h * .42, w * .42, h * .84, w * .02); x.fillStyle = '#efe8d6'; x.fill();
  txt(x, 'FBI', w * .25, -h * .2, h * .2, { col: '#14306a', font: F.label, w: 900, align: 'center' }); x.fillStyle = '#c9c0b0'; x.fillRect(w * .1, h * .02, w * .14, h * .26); for (let i = 0; i < 3; i++) x.fillRect(w * .28, h * (.04 + i * .09), w * .14, h * .04);
  x.fillStyle = lg(x, -w * .3, -h * .3, -w * .1, h * .3, [[0, '#ffe08a'], [1, '#b8882a']]); x.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? w * .1 : w * .2, an = -Math.PI / 2 + i * Math.PI / 5; x.lineTo(-w * .24 + Math.cos(an) * r, Math.sin(an) * r); } x.closePath(); x.fill(); x.stroke();
  x.restore();
}
// мотылёк у лампы
export function moth(x, cx, cy, s, t) { const a = t * 9, px = cx + Math.cos(a) * 30 * s + Math.sin(a * 2.3) * 10 * s, py = cy + Math.sin(a * 1.3) * 20 * s, fl = .5 + .5 * Math.sin(t * 60);
  x.fillStyle = 'rgba(40,32,26,.9)'; for (const sd of [-1, 1]) { x.beginPath(); x.ellipse(px + sd * 6 * s, py, 7 * s, (3 + 5 * fl) * s, sd * .5, 0, TAU); x.fill(); } ell(x, px, py, 2.5 * s, 5 * s, '#1a1410', null); }
// снимок в руке (портрет гостя и т.п.): центр, ширина, pic(ctx, w, h)
export function photo(x, cx, cy, w, a, pic) {
  const h = w * 1.18; x.save(); x.translate(cx, cy); x.rotate(a); x.shadowColor = 'rgba(0,0,0,.5)'; x.shadowBlur = w * .06; x.fillStyle = '#f4efe2'; x.fillRect(-w / 2, -h / 2, w, h); x.shadowColor = 'transparent';
  x.save(); x.beginPath(); x.rect(-w * .44, -h * .44, w * .88, h * .74); x.clip(); x.translate(-w * .44, -h * .44); pic(x, w * .88, h * .74); x.restore();
  x.strokeStyle = 'rgba(60,40,30,.6)'; x.lineWidth = Math.max(1, w * .01); x.strokeRect(-w / 2, -h / 2, w, h); x.restore();
}
// вещи-подписи ядра (колонка «событие»: SOURCE…, имена, штампы) — в другом месте кадра, чтобы не закрывать лица:
// OVER[key] = plaquesAt(x, y, { skip }) и SKIP_PROPS[key] = /./ (ядро их не рисует). skip — что уже нарисовано в самом кадре.
export const plaquesAt = (x0, y0, { skip = null, dy = 112, maxW = 900 } = {}) => (ctx, s, t, d, API) => {
  if (!API || !API.evList) return; let k = 0;
  for (const e of API.evList(s, d)) for (const q of e.quotes.slice(0, 2)) { if (skip && skip.test(q)) continue; if (t >= e.t) { API.prop(ctx, q, e.kind, x0, y0 + k * dy, t - e.t, maxW); k++; } }
};
// рука-вставка из-за края кадра (по образцу office.js insertHand ведущего): рукав одежды героя толщиной ≈ кисть, манжета рубашки, кисть-точка.
// P — кисть (экран), from — откуда входит рукав (за краем кадра), r — радиус кисти (px); cols — [свет, середина, тень] ткани рукава; cuff — цвет манжеты или null
export function insertSleeve(ctx, P, from, r, cols, cuff = '#F4F2EE') {
  const k = r / 12, dx = P[0] - from[0], dy = P[1] - from[1], l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l, nx = -uy, ny = ux;
  const C = [P[0] - ux * r * 1.05, P[1] - uy * r * 1.05], w0 = 21 * k, w1 = 16 * k;
  ctx.save(); ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(from[0] + nx * w0, from[1] + ny * w0); ctx.lineTo(C[0] + nx * w1, C[1] + ny * w1); ctx.lineTo(C[0] - nx * w1, C[1] - ny * w1); ctx.lineTo(from[0] - nx * w0, from[1] - ny * w0); ctx.closePath();
  const g = ctx.createLinearGradient(C[0] + nx * w1, C[1] + ny * w1, C[0] - nx * w1, C[1] - ny * w1); g.addColorStop(0, cols[0]); g.addColorStop(.45, cols[1]); g.addColorStop(1, cols[2]);
  ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 3.5 * k; ctx.strokeStyle = INK; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(from[0] + nx * w0 * .45 + ux * 40 * k, from[1] + ny * w0 * .45 + uy * 40 * k); ctx.lineTo(C[0] + nx * w1 * .45 - ux * 8 * k, C[1] + ny * w1 * .45 - uy * 8 * k); ctx.lineWidth = 2.5 * k; ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.stroke();   // складка
  ctx.beginPath(); ctx.moveTo(from[0] + nx * w0 * .8, from[1] + ny * w0 * .8); ctx.lineTo(C[0] + nx * w1 * .8, C[1] + ny * w1 * .8); ctx.lineWidth = 3 * k; ctx.strokeStyle = 'rgba(255,220,170,.45)'; ctx.stroke();   // тёплый край ткани со стороны света
  if (cuff) { const c0 = [C[0] - ux * 13 * k, C[1] - uy * 13 * k], cw = w1 * .98;
    ctx.beginPath(); ctx.moveTo(c0[0] + nx * cw, c0[1] + ny * cw); ctx.lineTo(C[0] + ux * 4 * k + nx * cw * .9, C[1] + uy * 4 * k + ny * cw * .9); ctx.lineTo(C[0] + ux * 4 * k - nx * cw * .9, C[1] + uy * 4 * k - ny * cw * .9); ctx.lineTo(c0[0] - nx * cw, c0[1] - ny * cw); ctx.closePath();
    ctx.fillStyle = cuff; ctx.fill(); ctx.lineWidth = 3 * k; ctx.strokeStyle = INK; ctx.stroke(); }
  ell(ctx, P[0], P[1], r, r, INK, null);
  ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(255,214,150,.6)'; ctx.lineWidth = 3.2 * k; ctx.beginPath(); ctx.arc(P[0], P[1], r * .75, Math.PI * 1.05, Math.PI * 1.75); ctx.stroke();
  ctx.restore(); return P;
}
export const CLOTH = { jensen: ['#5A5560', '#2C2830', '#16131A'], officer: ['#4a2a26', '#2a1614', '#140909'], aide2: ['#8a8c94', '#5e6068', '#2e3036'], agent1: ['#6a6870', '#3c3a42', '#1c1b20'], analyst2: ['#4a4a52', '#26262c', '#0e0e12'] };
