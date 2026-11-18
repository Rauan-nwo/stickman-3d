// film/props.js — 2D-реквизит финала L001 (контур туши, cel-тени, без фототекстур — как герои «Стикман Нуар»).
// Все функции рисуют в текущем преобразовании ctx: координаты — пиксели плейта (или единицы фигуры, если вызваны из held).
const TAU = Math.PI * 2, INK = '#141014', clamp01 = v => Math.max(0, Math.min(1, v));
const lg = (x, x0, y0, x1, y1, st) => { const g = x.createLinearGradient(x0, y0, x1, y1); st.forEach(([o, c]) => g.addColorStop(o, c)); return g; };
const rg = (x, cx, cy, r0, r1, st) => { const g = x.createRadialGradient(cx, cy, r0, cx, cy, r1); st.forEach(([o, c]) => g.addColorStop(o, c)); return g; };
const pathL = (x, pts, w, col) => { x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) p.length === 4 ? x.quadraticCurveTo(...p) : x.lineTo(...p); x.lineWidth = w; x.lineCap = 'round'; x.lineJoin = 'round'; x.strokeStyle = col; x.stroke(); };

// бокал вина (рисунок пробы scenes/dialogue_probe — тот же, что утверждён в тосте): (x, y) — кисть на ножке, g — масштаб, a — наклон
export function wineGlass(ctx, x, y, g, a, ink = INK, wine = ['#8e1a2c', '#4d0812'], slosh = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.scale(g, g); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const bowl = () => { ctx.beginPath(); ctx.moveTo(-52, -196); ctx.bezierCurveTo(-74, -130, -64, -60, -8, -36); ctx.lineTo(8, -36); ctx.bezierCurveTo(64, -60, 74, -130, 52, -196); ctx.closePath(); };
  ctx.fillStyle = 'rgba(205,230,245,.35)'; ctx.strokeStyle = ink; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.ellipse(0, 84, 58, 13, 0, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-6, -38); ctx.lineTo(-5, 76); ctx.lineTo(5, 76); ctx.lineTo(6, -38); ctx.closePath(); ctx.fill(); ctx.stroke();
  bowl(); ctx.fillStyle = 'rgba(190,220,240,.16)'; ctx.fill();
  ctx.save(); bowl(); ctx.clip(); ctx.rotate(-a + slosh);
  ctx.fillStyle = lg(ctx, 0, -120, 0, -30, [[0, wine[0]], [1, wine[1]]]); ctx.fillRect(-140, -112, 280, 200);
  ctx.fillStyle = 'rgba(255,170,150,.35)'; ctx.beginPath(); ctx.ellipse(0, -112, 70, 7, 0, 0, TAU); ctx.fill();
  ctx.restore();
  bowl(); ctx.lineWidth = 6.5; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(0, -196, 52, 9, 0, 0, TAU); ctx.lineWidth = 4.5; ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(-40, -170); ctx.quadraticCurveTo(-56, -120, -36, -78); ctx.stroke();
  ctx.restore();
}
// искра-звёздочка удара бокалов (k 0..1 — яркость, R — радиус)
export function clinkSpark(ctx, cx, cy, R, k, u) {
  if (k <= .01) return; ctx.save(); ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = rg(ctx, cx, cy, 0, R * 1.4, [[0, `rgba(255,248,220,${.9 * k})`], [.25, `rgba(255,220,150,${.4 * k})`], [1, 'rgba(255,200,120,0)']]); ctx.fillRect(cx - R * 1.5, cy - R * 1.5, R * 3, R * 3);
  ctx.fillStyle = `rgba(255,252,235,${k})`;
  for (let i = 0; i < 4; i++) { ctx.save(); ctx.translate(cx, cy); ctx.rotate(i * Math.PI / 2 + .3); ctx.beginPath(); ctx.moveTo(0, -R); ctx.quadraticCurveTo(4, -6, R * .12, 0); ctx.lineTo(-R * .12, 0); ctx.quadraticCurveTo(-4, -6, 0, -R); ctx.fill(); ctx.restore(); }
  for (let i = 0; i < 9; i++) { const an = -Math.PI / 2 + (i / 8 - .5) * 2.6, sp = 380 + 140 * ((i * 37) % 5) / 5, px = cx + Math.cos(an) * sp * u, py = cy + Math.sin(an) * sp * u + 900 * u * u, r = 5 * (1 - Math.min(1, u / .5));
    if (r > .3) { ctx.beginPath(); ctx.arc(px, py, r, 0, TAU); ctx.fillStyle = `rgba(255,236,190,${Math.max(0, Math.min(1, 1.4 - u * 2.6))})`; ctx.fill(); } }
  ctx.restore();
}

// раскрытое меню (кожа, золотая кромка) с объективом, торчащим вбок; центр (cx, cy), ширина w; lens: +1 вправо, -1 влево; glint 0..1
export function menuLens(ctx, cx, cy, w, { lens = 1, glint = 0, tilt = -.04 } = {}) {
  const h = w * 1.28;
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(tilt); ctx.lineJoin = 'round';
  // объектив (позади меню, выходит из-за края)
  const lx = lens * w * .5, ly = -h * .08, L = w * .62, R = w * .15;
  ctx.save(); ctx.translate(lx - lens * w * .12, ly);
  ctx.beginPath(); ctx.roundRect(lens > 0 ? 0 : -L, -R, L, R * 2, R * .25); ctx.fillStyle = lg(ctx, 0, -R, 0, R, [[0, '#4a4d58'], [.4, '#1d1e25'], [1, '#08080b']]); ctx.fill(); ctx.lineWidth = w * .022; ctx.strokeStyle = INK; ctx.stroke();
  for (const q of [.35, .6]) { ctx.beginPath(); ctx.moveTo(lens * L * q, -R); ctx.lineTo(lens * L * q, R); ctx.lineWidth = w * .012; ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.stroke(); }
  ctx.beginPath(); ctx.ellipse(lens * L, 0, R * .32, R * 1.06, 0, 0, TAU); ctx.fillStyle = '#0b0b10'; ctx.fill(); ctx.lineWidth = w * .02; ctx.strokeStyle = INK; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(lens * L, 0, R * .22, R * .78, 0, 0, TAU); ctx.fillStyle = rg(ctx, lens * L - R * .05, -R * .2, 0, R, [[0, '#6aa0c8'], [.5, '#1d3550'], [1, '#05070c']]); ctx.fill();
  if (glint > .01) { ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = rg(ctx, lens * L, -R * .25, 0, R * 2.4 * (.6 + .4 * glint), [[0, `rgba(255,255,240,${glint})`], [.3, `rgba(255,230,180,${.5 * glint})`], [1, 'rgba(255,220,160,0)']]);
    ctx.fillRect(lens * L - R * 3, -R * 3, R * 6, R * 6); ctx.globalCompositeOperation = 'source-over'; }
  ctx.restore();
  // меню: обложка
  ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, w * .04); ctx.fillStyle = lg(ctx, -w / 2, 0, w / 2, 0, [[0, '#5a1a1e'], [.5, '#3c1014'], [1, '#22080b']]); ctx.fill();
  ctx.lineWidth = w * .03; ctx.strokeStyle = INK; ctx.stroke();
  ctx.beginPath(); ctx.roundRect(-w * .4, -h * .42, w * .8, h * .84, w * .02); ctx.lineWidth = w * .012; ctx.strokeStyle = '#C9A04A'; ctx.stroke();
  ctx.fillStyle = '#D9B24A'; ctx.font = `700 ${Math.round(w * .11)}px Georgia, serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('MENU', 0, -h * .18);
  pathL(ctx, [[-w * .3, h * .02], [w * .3, h * .02]], w * .01, 'rgba(217,178,74,.6)');
  pathL(ctx, [[-w * .44, -h * .44], [-w * .44, h * .3]], w * .03, 'rgba(255,200,180,.18)');
  ctx.restore();
}

// полароид «Дженсен + Алиса»: центр (x, y), ширина w, поворот a; mini — рисовальщик картинки (ctx, w, h) или null
export function polaroid(ctx, x, y, w, a, mini, dev = 1) {        // горизонтальный снимок: картинка 16:10, широкое поле снизу
  const pw = w * .9, ph = pw / 1.6, h = ph + w * .2;
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = w * .08; ctx.shadowOffsetY = w * .03;
  ctx.fillStyle = '#F4EFE2'; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, w * .015); ctx.fill(); ctx.shadowColor = 'transparent';
  ctx.lineWidth = w * .012; ctx.strokeStyle = 'rgba(60,40,30,.6)'; ctx.stroke();
  ctx.save(); ctx.beginPath(); ctx.rect(-pw / 2, -h / 2 + w * .05, pw, ph); ctx.clip(); ctx.translate(-pw / 2, -h / 2 + w * .05);
  if (mini) mini(ctx, pw, ph); ctx.fillStyle = `rgba(30,24,40,${1 - dev})`; ctx.fillRect(0, 0, pw, ph);
  ctx.restore();
  ctx.restore();
}

// ящик NVIDIA-стиля без логотипа: чёрный с зелёной полосой (x, y — низ-центр), ширина w; label — бирка на ящике
export function greenCrate(ctx, x, y, w, { label = null, side = 1 } = {}) {
  const h = w * .62, d = w * .22;
  ctx.save(); ctx.translate(x, y); ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(-w / 2, -h); ctx.lineTo(-w / 2 + side * d, -h - d * .6); ctx.lineTo(w / 2 + side * d, -h - d * .6); ctx.lineTo(w / 2, -h); ctx.closePath();
  ctx.fillStyle = '#2a2b31'; ctx.fill(); ctx.lineWidth = w * .02; ctx.strokeStyle = INK; ctx.stroke();                       // крышка
  ctx.beginPath(); ctx.moveTo(side > 0 ? w / 2 : -w / 2, 0); ctx.lineTo(side > 0 ? w / 2 + d : -w / 2 - d, -d * .6); ctx.lineTo(side > 0 ? w / 2 + d : -w / 2 - d, -h - d * .6); ctx.lineTo(side > 0 ? w / 2 : -w / 2, -h); ctx.closePath();
  ctx.fillStyle = '#0c0c10'; ctx.fill(); ctx.stroke();                                                                          // бок в тени
  ctx.beginPath(); ctx.rect(-w / 2, -h, w, h); ctx.fillStyle = lg(ctx, -w / 2, 0, w / 2, 0, [[0, '#26272d'], [1, '#16161b']]); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#76b900'; ctx.fillRect(-w / 2 + w * .01, -h * .58, w * .98, h * .16);                                         // зелёная полоса
  ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(-w / 2 + w * .01, -h * .58, w * .98, h * .03);
  pathL(ctx, [[-w * .46, -h * .92], [-w * .46, -h * .1]], w * .012, 'rgba(255,255,255,.12)');
  if (label) { ctx.save(); ctx.translate(w * .1, -h * .25); ctx.rotate(.06); ctx.fillStyle = '#F2C230'; ctx.beginPath(); ctx.roundRect(-w * .3, -h * .1, w * .6, h * .2, w * .015); ctx.fill(); ctx.lineWidth = w * .012; ctx.strokeStyle = INK; ctx.stroke();
    ctx.fillStyle = '#141014'; ctx.font = `800 ${Math.round(w * .075)}px Bahnschrift, 'Arial Black', sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, 0, 2, w * .56); ctx.restore(); }
  ctx.restore();
}
// папка заказа (лежит на столе, перспектива сплющена): центр, ширина
export function orderFolder(ctx, x, y, w, a = 0, title = 'PURCHASE ORDER') {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.scale(1, .42);
  ctx.beginPath(); ctx.roundRect(-w / 2, -w * .36, w, w * .72, w * .03); ctx.fillStyle = '#D9C38A'; ctx.fill(); ctx.lineWidth = w * .03; ctx.strokeStyle = INK; ctx.stroke();
  ctx.fillStyle = '#F4EFE2'; ctx.fillRect(-w * .36, -w * .22, w * .72, w * .12);
  ctx.fillStyle = '#141014'; ctx.font = `700 ${Math.round(w * .075)}px 'Courier New', monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(title, 0, -w * .16, w * .68);
  ctx.fillStyle = '#76b900'; ctx.fillRect(-w * .36, w * .02, w * .72, w * .05);
  ctx.restore();
}
// коробка Nvidia (без логотипа: «зелёная полоса» + надпись), низ-центр (x, y), ширина w; lid 0..1 приоткрыта; glow 0..1 — свет изнутри
export function nvBox(ctx, x, y, w, { lid = 0, glow = 0, dust = 0 } = {}) {
  const h = w * .45, d = w * .32;
  ctx.save(); ctx.translate(x, y); ctx.lineJoin = 'round';
  // корпус
  ctx.beginPath(); ctx.moveTo(-w / 2, 0); ctx.lineTo(w / 2, 0); ctx.lineTo(w / 2 + d * .5, -d * .5); ctx.lineTo(w / 2 + d * .5, -h - d * .5); ctx.lineTo(-w / 2 + d * .5, -h - d * .5); ctx.lineTo(-w / 2, -h); ctx.closePath();
  ctx.fillStyle = '#121216'; ctx.fill(); ctx.lineWidth = w * .016; ctx.strokeStyle = INK; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2 + d * .5, -d * .5); ctx.lineTo(w / 2 + d * .5, -h - d * .5); ctx.lineTo(w / 2, -h); ctx.closePath(); ctx.fillStyle = '#08080b'; ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.rect(-w / 2, -h, w, h); ctx.fillStyle = lg(ctx, -w / 2, 0, w / 2, 0, [[0, '#2a2a31'], [1, '#17171c']]); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#76b900'; ctx.fillRect(-w / 2 + w * .008, -h * .42, w * .984, h * .2);
  ctx.fillStyle = '#F1F1F1'; ctx.font = `800 ${Math.round(w * .085)}px Bahnschrift, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('NVIDIA', 0, -h * .72);
  pathL(ctx, [[-w * .47, -h * .95], [-w * .47, -h * .1]], w * .01, 'rgba(255,255,255,.12)');
  // свет изнутри из щели
  if (glow > .01) { ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = rg(ctx, d * .25, -h - d * .6, 0, w * .75, [[0, `rgba(120,255,150,${.45 * glow * Math.min(1, lid * 3)})`], [.4, `rgba(80,230,120,${.18 * glow * Math.min(1, lid * 3)})`], [1, 'rgba(60,200,100,0)']]); ctx.fillRect(-w, -h - w * 1.2, w * 2, w * 1.4); ctx.restore(); }
  // крышка: петля по задней кромке, приоткрывается
  const L = clamp01(lid);
  ctx.save(); ctx.translate(0, -h - d * .5);
  const topFace = () => { ctx.beginPath(); ctx.moveTo(-w / 2 + d * .5, 0); ctx.lineTo(w / 2 + d * .5, 0); ctx.lineTo(w / 2, d * .5); ctx.lineTo(-w / 2, d * .5); ctx.closePath(); };
  if (L > .02) {                                                       // открытый проём: тёмное нутро, на «chips» — зелёный свет изнутри
    topFace(); ctx.fillStyle = '#060608'; ctx.fill();
    if (glow > .01) { ctx.save(); topFace(); ctx.clip(); ctx.fillStyle = rg(ctx, d * .25, d * .45, 0, w * .5, [[0, `rgba(150,255,180,${.8 * glow})`], [.5, `rgba(60,200,110,${.45 * glow})`], [1, `rgba(20,90,50,${.25 * glow})`]]); ctx.fillRect(-w, -w, w * 2, w * 2); ctx.restore(); }
    topFace(); ctx.lineWidth = w * .016; ctx.strokeStyle = INK; ctx.stroke();
  }
  // крышка на петле по задней кромке: передний край поднимается вверх и уходит к задней кромке (высота стоящей крышки ~ глубина d)
  const fx = d * .5 * L, fy = d * .5 * (1 - L) - L * d * 1.05;
  ctx.beginPath(); ctx.moveTo(-w / 2 + d * .5, 0); ctx.lineTo(w / 2 + d * .5, 0); ctx.lineTo(w / 2 + fx, fy); ctx.lineTo(-w / 2 + fx, fy); ctx.closePath();
  ctx.fillStyle = L > .02 ? lg(ctx, 0, fy, 0, 0, [[0, '#2e2e36'], [1, '#18181d']]) : '#3c3c46'; ctx.fill(); ctx.lineWidth = w * .016; ctx.strokeStyle = INK; ctx.stroke();
  ctx.restore();
  // пыль с крышки
  if (dust > 0 && dust < 1) for (let i = 0; i < 14; i++) { const a = -Math.PI * (.15 + .7 * ((i * .618) % 1)), r = w * (.1 + .5 * dust) * (.6 + .4 * ((i * .37) % 1));
    ctx.fillStyle = `rgba(236,222,196,${.9 * (1 - dust)})`; ctx.beginPath(); ctx.arc(Math.cos(a) * r + (i - 7) * w * .03, -h - d * .5 + Math.sin(a) * r * .7, w * .016 * (1 + i % 3), 0, TAU); ctx.fill(); }
  ctx.restore();
}
// латунный ключ: (x, y) — середина головки; s — масштаб (длина ~ 300*s), a — поворот; glint 0..1
export function brassKey(ctx, x, y, s, a, glint = 0) {   // длина рисунка 334 ед.: головка-кольцо (r 62), стержень толщиной 40, бородка с двумя зубцами
  ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.scale(s, s); ctx.lineJoin = 'round';
  const gold = lg(ctx, 0, -62, 0, 78, [[0, '#F7DC8A'], [.45, '#D2A244'], [1, '#7E5618']]), OUT = '#2e1c06';
  const shape = () => { ctx.beginPath();                                             // стержень + бородка одним контуром
    ctx.moveTo(52, -20); ctx.lineTo(262, -20); ctx.quadraticCurveTo(272, -20, 272, -10); ctx.lineTo(272, 78); ctx.lineTo(250, 78); ctx.lineTo(250, 52); ctx.lineTo(236, 52); ctx.lineTo(236, 78); ctx.lineTo(206, 78); ctx.lineTo(206, 20); ctx.lineTo(52, 20); ctx.closePath(); };
  shape(); ctx.lineWidth = 12; ctx.strokeStyle = OUT; ctx.stroke(); ctx.fillStyle = gold; ctx.fill();
  ctx.beginPath(); ctx.arc(0, 0, 62, 0, TAU); ctx.lineWidth = 12; ctx.strokeStyle = OUT; ctx.stroke();                       // головка-кольцо
  ctx.beginPath(); ctx.arc(0, 0, 62, 0, TAU); ctx.arc(0, 0, 27, 0, TAU, true); ctx.fillStyle = gold; ctx.fill('evenodd');
  ctx.beginPath(); ctx.arc(0, 0, 27, 0, TAU); ctx.lineWidth = 8; ctx.strokeStyle = OUT; ctx.stroke();
  for (const cx of [72, 92]) { ctx.beginPath(); ctx.moveTo(cx, -20); ctx.lineTo(cx, 20); ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(70,44,10,.7)'; ctx.stroke(); }   // поясок у головки
  pathL(ctx, [[-36, -38], [-10, -52]], 9, 'rgba(255,250,220,.8)'); pathL(ctx, [[104, -10], [256, -10]], 6, 'rgba(255,250,220,.5)'); pathL(ctx, [[212, 30], [212, 68]], 5, 'rgba(255,250,220,.35)');
  if (glint > .01) { ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = rg(ctx, 250, 40, 0, 100, [[0, `rgba(255,255,235,${glint})`], [.35, `rgba(255,230,160,${.45 * glint})`], [1, 'rgba(255,220,150,0)']]); ctx.fillRect(150, -60, 200, 200);
    ctx.fillStyle = `rgba(255,255,245,${glint})`; for (let i = 0; i < 4; i++) { ctx.save(); ctx.translate(250, 40); ctx.rotate(i * Math.PI / 2 + .4); ctx.beginPath(); ctx.moveTo(0, -70 * glint); ctx.lineTo(6, 0); ctx.lineTo(-6, 0); ctx.closePath(); ctx.fill(); ctx.restore(); } }
  ctx.restore();
}
// бумажный ценник на нитке: (x, y) — точка крепления нитки, w — ширина, a — поворот
export function priceTag(ctx, x, y, w, a, text, sub = null) {
  ctx.save(); ctx.translate(x, y); pathL(ctx, [[0, 0], [w * .1, w * .25]], w * .012, '#3a2a18'); ctx.translate(w * .1, w * .25); ctx.rotate(a);
  const h = w * .42; ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = w * .05; ctx.shadowOffsetY = w * .02;
  ctx.beginPath(); ctx.moveTo(-w * .08, 0); ctx.lineTo(w * .06, -h / 2); ctx.lineTo(w * .92, -h / 2); ctx.lineTo(w * .92, h / 2); ctx.lineTo(w * .06, h / 2); ctx.closePath();
  ctx.fillStyle = '#F2E8CC'; ctx.fill(); ctx.shadowColor = 'transparent'; ctx.lineWidth = w * .012; ctx.strokeStyle = '#3a2a18'; ctx.stroke();
  ctx.beginPath(); ctx.arc(w * .04, 0, w * .025, 0, TAU); ctx.fillStyle = '#3a2a18'; ctx.fill();
  ctx.fillStyle = '#1c140c'; ctx.font = `800 ${Math.round(w * .13)}px 'Courier New', monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, w * .5, sub ? -h * .14 : 0, w * .8);
  if (sub) { ctx.font = `700 ${Math.round(w * .075)}px 'Courier New', monospace`; ctx.fillStyle = '#5a3a18'; ctx.fillText(sub, w * .5, h * .24, w * .8); }
  ctx.restore();
}
// чип: кристалл с выводами, зелёное свечение; центр, размер s (ширина ~ 200*s)
export function chip(ctx, x, y, s, a = 0, glow = 1) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  if (glow > .01) { ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = rg(ctx, 0, 0, 0, 420 * s, [[0, `rgba(110,255,150,${.6 * glow})`], [.35, `rgba(80,230,120,${.25 * glow})`], [1, 'rgba(60,200,100,0)']]); ctx.fillRect(-450 * s, -450 * s, 900 * s, 900 * s); ctx.restore(); }
  ctx.scale(s, s); ctx.fillStyle = '#C9A54A'; ctx.strokeStyle = INK; ctx.lineWidth = 4;
  for (let i = -3; i <= 3; i++) { ctx.fillRect(i * 22 - 4, -80, 8, 20); ctx.fillRect(i * 22 - 4, 60, 8, 20); ctx.fillRect(-100, i * 17 - 4, 20, 8); ctx.fillRect(80, i * 17 - 4, 20, 8); }
  ctx.fillStyle = '#1f9a4c'; ctx.beginPath(); ctx.roundRect(-82, -62, 164, 124, 10); ctx.fill(); ctx.lineWidth = 6; ctx.stroke();
  ctx.fillStyle = lg(ctx, -40, -30, 40, 30, [[0, '#b8ffd0'], [1, '#4fd987']]); ctx.beginPath(); ctx.roundRect(-42, -32, 84, 64, 6); ctx.fill(); ctx.lineWidth = 4; ctx.stroke();
  pathL(ctx, [[-70, -50], [-30, -50]], 5, 'rgba(255,255,255,.5)');
  ctx.restore();
}
// большая «кисть-точка» в чёрной кожаной перчатке (D02-A): центр, радиус r; манжета рукава уходит в направлении dir (рад)
export function gloveDot(ctx, x, y, r, dir, light = [-.6, -.8]) {
  ctx.save(); ctx.translate(x, y);
  // рукав: тёмная ткань + полоска белой манжеты рубашки
  ctx.save(); ctx.rotate(dir);
  ctx.beginPath(); ctx.moveTo(r * .7, -r * .82); ctx.lineTo(r * 10, -r * 1.35); ctx.lineTo(r * 10, r * 1.35); ctx.lineTo(r * .7, r * .82); ctx.closePath();   // рукав пиджака, расширяется к локтю
  ctx.fillStyle = lg(ctx, 0, -r * 1.3, 0, r * 1.3, [[0, '#3a3a46'], [.45, '#1c1c24'], [1, '#0a0a0e']]); ctx.fill(); ctx.lineWidth = r * .1; ctx.strokeStyle = INK; ctx.stroke();
  pathL(ctx, [[r * 2.2, -r * .7], [r * 9, -r * 1.1]], r * .1, 'rgba(255,255,255,.14)'); pathL(ctx, [[r * 3.4, r * .2], [r * 4.6, r * .9]], r * .07, 'rgba(0,0,0,.5)');   // блик и складка
  ctx.beginPath(); ctx.roundRect(r * .55, -r * .86, r * .38, r * 1.72, r * .12); ctx.fillStyle = '#EDE8DC'; ctx.fill(); ctx.stroke();                  // манжета рубашки
  ctx.restore();
  // перчатка-точка с блеском кожи и cel-тенью
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fillStyle = '#121216'; ctx.fill();
  ctx.save(); ctx.clip(); ctx.beginPath(); ctx.arc(-light[0] * r * .45, -light[1] * r * .45, r * 1.05, 0, TAU); ctx.rect(-r * 2, -r * 2, r * 4, r * 4); ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fill('evenodd'); ctx.restore();
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.lineWidth = r * .1; ctx.strokeStyle = INK; ctx.stroke();
  pathL(ctx, [[light[0] * r * .55 - r * .1, light[1] * r * .55], [light[0] * r * .2, light[1] * r * .75]], r * .14, 'rgba(255,255,255,.45)');
  pathL(ctx, [[-r * .2, r * .4], [r * .3, r * .55]], r * .05, 'rgba(255,255,255,.12)');                  // шов
  ctx.restore();
}
// катушки магнитофона поверх нарисованных: центр, радиус, угол
export function reel(ctx, x, y, r, ang) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fillStyle = lg(ctx, -r, -r, r, r, [[0, '#DCD6CB'], [1, '#9C958A']]); ctx.fill(); ctx.lineWidth = r * .07; ctx.strokeStyle = INK; ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, r * .62, 0, TAU); ctx.fillStyle = '#3a2a22'; ctx.fill();                       // плёнка
  for (let i = 0; i < 3; i++) { ctx.save(); ctx.rotate(i * TAU / 3); ctx.beginPath(); ctx.moveTo(-r * .2, -r * .22); ctx.lineTo(r * .2, -r * .22); ctx.lineTo(r * .32, -r * .58); ctx.lineTo(-r * .32, -r * .58); ctx.closePath(); ctx.fillStyle = '#B9B2A6'; ctx.fill(); ctx.lineWidth = r * .04; ctx.strokeStyle = INK; ctx.stroke(); ctx.restore(); }
  ctx.beginPath(); ctx.arc(0, 0, r * .16, 0, TAU); ctx.fillStyle = '#5a5248'; ctx.fill(); ctx.lineWidth = r * .04; ctx.stroke();
  ctx.restore();
}
// коробка плёнок с бирками месяцев (вид спереди): (x, y) — низ-центр, ширина w; n — сколько бирок видно (0..12)
export function tapeBox(ctx, x, y, w, n = 12) {
  const M = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'], h = w * .36;
  ctx.save(); ctx.translate(x, y); ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.rect(-w / 2, -h, w, h); ctx.fillStyle = lg(ctx, 0, -h, 0, 0, [[0, '#9a7448'], [1, '#6a4a28']]); ctx.fill(); ctx.lineWidth = w * .01; ctx.strokeStyle = INK; ctx.stroke();
  const cw = (w * .94) / 12;
  for (let i = 0; i < 12; i++) { const cx = -w * .47 + cw * (i + .5);
    ctx.fillStyle = i % 2 ? '#2a2630' : '#33303a'; ctx.fillRect(cx - cw * .44, -h * 1.32, cw * .88, h * 1.1); ctx.lineWidth = w * .004; ctx.strokeStyle = INK; ctx.strokeRect(cx - cw * .44, -h * 1.32, cw * .88, h * 1.1);
    if (i < n) { ctx.fillStyle = '#F2E8CC'; ctx.fillRect(cx - cw * .38, -h * 1.22, cw * .76, h * .5);
      ctx.save(); ctx.translate(cx, -h * .97); ctx.rotate(-Math.PI / 2); ctx.fillStyle = '#1c140c'; ctx.font = `800 ${Math.round(cw * .52)}px 'Courier New', monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(M[i], 0, 0, h * .46); ctx.restore(); } }
  ctx.restore();
}
// планшет: центр, ширина, поворот; pic — рисовальщик картинки (ctx, w, h); k 0..1 — картинка «приходит» (проявляется сверху вниз)
export function tablet(ctx, x, y, w, a, pic, k = 1) {
  const h = w * .7;
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, w * .06); ctx.fillStyle = '#121216'; ctx.fill(); ctx.lineWidth = w * .02; ctx.strokeStyle = INK; ctx.stroke();
  ctx.fillStyle = '#0d1a26'; ctx.fillRect(-w * .44, -h * .4, w * .88, h * .8);
  if (k > 0) { ctx.save(); ctx.beginPath(); ctx.rect(-w * .44, -h * .4, w * .88, h * .8 * Math.min(1, k)); ctx.clip(); ctx.translate(-w * .44, -h * .4); pic && pic(ctx, w * .88, h * .8); ctx.restore(); }
  if (k > 0 && k < 1) { ctx.fillStyle = '#7fe0a8'; ctx.fillRect(-w * .44, -h * .4 + h * .8 * k - 2, w * .88, 4); }
  ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = 'rgba(120,180,255,.10)'; ctx.fillRect(-w * .44, -h * .4, w * .88, h * .8);
  ctx.restore();
}
// папка «SUBJECT: ALICE HUANG» (стоя, вид спереди): центр, ширина, open 0..1 (1 — открыта, видна распечатка)
export function subjectFolder(ctx, x, y, w, a, open, pic) {
  const h = w * .78;
  ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, w * .02); ctx.fillStyle = '#C9AE72'; ctx.fill(); ctx.lineWidth = w * .015; ctx.strokeStyle = INK; ctx.stroke();
  if (open > .01) { ctx.save(); ctx.translate(-w / 2, 0); ctx.scale(-Math.max(.02, open), 1); ctx.beginPath(); ctx.roundRect(0, -h / 2, w, h, w * .02); ctx.fillStyle = '#B89A5C'; ctx.fill(); ctx.stroke(); ctx.restore();
    ctx.fillStyle = '#F4EFE2'; ctx.fillRect(-w * .42, -h * .4, w * .84, h * .8); if (pic) { ctx.save(); ctx.translate(-w * .36, -h * .34); pic(ctx, w * .72, h * .5); ctx.restore(); } }
  else { ctx.fillStyle = '#F4EFE2'; ctx.fillRect(-w * .3, -h * .3, w * .6, h * .16); ctx.fillStyle = '#141014'; ctx.font = `700 ${Math.round(w * .05)}px 'Courier New', monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('SUBJECT: ALICE HUANG', 0, -h * .22, w * .56);
    ctx.fillStyle = '#B3121F'; ctx.font = `900 ${Math.round(w * .07)}px Bahnschrift, sans-serif`; ctx.save(); ctx.rotate(-.12); ctx.fillText('CLASSIFIED', 0, h * .12); ctx.restore(); }
  ctx.restore();
}
// чемодан-сундук стоймя: (x, y) — низ-центр, w×h
export function trunk(ctx, x, y, w, h) {
  ctx.save(); ctx.translate(x, y); ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.roundRect(-w / 2, -h, w, h, w * .06); ctx.fillStyle = lg(ctx, -w / 2, 0, w / 2, 0, [[0, '#9A6A3A'], [.6, '#7A4E28'], [1, '#5A3418']]); ctx.fill(); ctx.lineWidth = w * .03; ctx.strokeStyle = INK; ctx.stroke();
  for (const q of [.22, .78]) { ctx.fillStyle = '#4A2E18'; ctx.fillRect(-w / 2, -h * q - w * .05, w, w * .1); ctx.strokeRect(-w / 2, -h * q - w * .05, w, w * .1); ctx.fillStyle = '#D9B24A'; ctx.fillRect(-w * .06, -h * q - w * .07, w * .12, w * .14); ctx.strokeRect(-w * .06, -h * q - w * .07, w * .12, w * .14); }
  for (const [cx, cy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { ctx.fillStyle = '#C9A04A'; ctx.beginPath(); ctx.arc(cx * w * .42, -h / 2 + cy * h * .46, w * .05, 0, TAU); ctx.fill(); ctx.stroke(); }
  ctx.beginPath(); ctx.roundRect(w * .5 - w * .02, -h * .58, w * .1, h * .16, w * .04); ctx.lineWidth = w * .035; ctx.strokeStyle = '#2E1A0C'; ctx.stroke();     // ручка сбоку
  pathL(ctx, [[-w * .4, -h * .9], [-w * .4, -h * .1]], w * .03, 'rgba(255,230,190,.25)');
  ctx.restore();
}
// поднос официанта с бокалами (в координатах фигуры, центр на кисти)
export function tray(ctx, x, y, w) {
  ctx.save(); ctx.translate(x, y);
  for (const gx of [-w * .25, w * .05, w * .3]) { ctx.save(); ctx.translate(gx, -6); ctx.scale(.5, .5); ctx.beginPath(); ctx.moveTo(-30, -150); ctx.bezierCurveTo(-44, -90, -36, -50, -4, -36); ctx.lineTo(4, -36); ctx.bezierCurveTo(36, -50, 44, -90, 30, -150); ctx.closePath();
    ctx.fillStyle = 'rgba(200,225,240,.5)'; ctx.fill(); ctx.lineWidth = 8; ctx.strokeStyle = INK; ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, -36); ctx.lineTo(0, 0); ctx.stroke(); ctx.restore(); }
  ctx.beginPath(); ctx.ellipse(0, 0, w / 2, w * .08, 0, 0, TAU); ctx.fillStyle = lg(ctx, -w / 2, 0, w / 2, 0, [[0, '#E6E6EA'], [1, '#9A9AA4']]); ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.stroke();
  ctx.restore();
}
