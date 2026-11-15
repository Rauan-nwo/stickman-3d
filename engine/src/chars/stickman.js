// stickman.js: ОДИН параметрический плоский человечек. Рисуется вектором на 2D-канвас (см. billboard.js), сцена его
// не освещает. Герой = spec (форма, одежда, шляпа, лицо) + pose (что он делает в этот момент). Готовые spec — presets.js.
//
// Порядок слоёв внутри фигуры:  ноги ('back') → тело с одеждой → конечности 'mid' + предметы 'mid' → голова (ухо, волосы,
// лицо, шляпа) → предметы 'front' → руки 'front' + кисти.
//
// spec:
//   colors { ink, hand, mouth, tongue, teeth, hair, ... }, lw (контур), limbW (толщина палок), u (масштаб: 1 = фигура ~1000 ед.)
//   head  { x, y, rx, ry, fill, shade, grad:[gx, gy, r0, r1, stop], pivot (ось наклона ниже центра), ear, hair }
//   body  { x, y, rx, ry, n, topK, fill | fillLR:[c0,c1,c2] | fillRadial, inside:[fn], outside:[fn] }   fn(ctx, B, spec)
//   hat   { type: 'wideBrim' | 'beanie' | 'topHat' | 'bowler' | 'none', ...цвета }
//   face  { eyes:[{x,y,rx,ry,lw,tilt,blink}], restEye, mouth:[x,y], mr, mouthBig:[x,y], ms, brows, moustache, glasses, fs }
//   rig   { hipY, sh:[[x,y],[x,y]], armL, sag, armLayer }
//   stances { stand: { limbs:[...], arms:'auto' }, sit: { limbs:[...], props:[...] } }, stance: 'stand'
// pose (все поля необязательны):
//   dx, dy          сдвиг всей фигуры;  bob (подъём корпуса, ноги пружинят), sq (сжатие), lean (наклон корпуса)
//   tilt            наклон головы;  turn (поворот лица в 3/4, в радиусах головы)
//   eyes            'rest' | 'dot' | 'lid' | 'closed' | 'wide' | 'flat' или [левый, правый];  lid:[tiltL, tiltR], look:[x,y], blink, squint
//   brows [подъём, угол] (угол + = тревога), browL, browR;  mouth (см. MOUTHS), mouthAt:[mx,my], chew, open
//   stache, blush, sweat, hatDy, hatLag, hatTip
//   hL, hR          цель кисти [наружу, вниз] от плеча (ед. стандартной фигуры), bL/bR — сторона сгиба локтя
//   arms            [{ to:[x,y], L, bend, hand }, ...] — явные цели кистей в координатах фигуры (например, проекция 3D-ружья)
//   limbs           полный явный список конечностей (заменяет стойку);  held:[{ layer:'mid'|'front', draw(ctx) }] — 2D-предметы
//   view            'front' (по умолчанию) | 'back' | 'side' | 'threeQuarter';  facing: +1 — смотрит вправо, -1 — влево
//                   (лицо съезжает к краю головы, сзади — волосы; шляпа и одежда получают вид 4-м аргументом; см. gaits.js)
//   legs            явные ноги [{ layer, hip, a, b, L, bend, ... }] вместо ног стойки (руки стойки остаются) — их пишет gaits.js
//   rot             поворот всей фигуры вокруг центра тела (полёт, падение);  headDx, headDy — сдвиг головы
//   tears           0..1 фонтаны слёз;  flush: { color, k } — заливка головы цветом (ярость);  eyes ещё: 'shut' (> <), 'wideS' (ужас)
import { clamp, lerp, seg, E, spring } from '../core/ease.js';
import { hash } from '../core/rng.js';

const TAU = Math.PI * 2;

// =====================================================================================================
// примитивы
// =====================================================================================================
export function ell(x, cx, cy, rx, ry, fill, stroke, lw, rot = 0) {
  x.beginPath(); x.ellipse(cx, cy, Math.max(.1, rx), Math.max(.1, ry), rot, 0, TAU);
  if (fill) { x.fillStyle = fill; x.fill(); }
  if (stroke) { x.lineWidth = lw; x.strokeStyle = stroke; x.stroke(); }
}
// ломаная; ровно три точки = квадратичная кривая (средняя — управляющая)
export function line(x, pts, w, col) {
  x.lineWidth = w; x.lineCap = 'round'; x.lineJoin = 'round'; x.strokeStyle = col; x.beginPath();
  x.moveTo(pts[0][0], pts[0][1]);
  if (pts.length === 3) x.quadraticCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1]);
  else for (const p of pts.slice(1)) x.lineTo(p[0], p[1]);
  x.stroke();
}
// «резиновая» конечность: дуга от a к b длиной ~L, выгиб в сторону dir (+1/-1); sag — сила выгиба
export function hose(x, a, b, L, dir, w, col, sag = .5) {
  const dx = b[0] - a[0], dy = b[1] - a[1], c = Math.hypot(dx, dy) || 1;
  const h = c < L ? Math.sqrt(1.5 * c * (L - c)) * sag : 0;
  const mx = (a[0] + b[0]) / 2 - dy / c * h * dir, my = (a[1] + b[1]) / 2 + dx / c * h * dir;
  x.lineWidth = w; x.lineCap = 'round'; x.strokeStyle = col;
  x.beginPath(); x.moveTo(a[0], a[1]); x.quadraticCurveTo(mx, my, b[0], b[1]); x.stroke();
}
// тело-«капля»: суперэллипс, сверху чуть уже (topK)
export function beanPath(x, cx, cy, rx, ry, n = 2.8, topK = .92, cont = false) {
  if (!cont) x.beginPath();
  for (let i = 0; i <= 72; i++) {
    const a = i / 72 * TAU, c = Math.cos(a), s = Math.sin(a);
    const w = rx * (s < 0 ? lerp(1, topK, -s) : 1);
    const px = cx + w * Math.sign(c) * Math.pow(Math.abs(c), 2 / n), py = cy + ry * Math.sign(s) * Math.pow(Math.abs(s), 2 / n);
    i ? x.lineTo(px, py) : x.moveTo(px, py);
  }
  x.closePath();
}
// рука с локтем (двухзвенная IK): плечо и предплечье по L/2, длина постоянна. Кисть дальше вытянутой руки — рука прямая,
// кисть встаёт на предел. Локоть: из двух решений выбирается то, что ниже и снаружи от тела (side: -1 левая, +1 правая);
// elbow: +1 / -1 — принудительно по часовой / против. Сгиб — угол со скруглением (а не дуга). Возвращает точку кисти.
export function elbowIK(a, b, L, side, elbow) {
  let dx = b[0] - a[0], dy = b[1] - a[1], c = Math.hypot(dx, dy) || 1e-6; const h2 = L / 2;
  if (c >= L * .999) { const k = L * .999 / c; return { b: [a[0] + dx * k, a[1] + dy * k], e: [a[0] + dx * k / 2, a[1] + dy * k / 2] }; }
  const m = [a[0] + dx / 2, a[1] + dy / 2], hh = Math.sqrt(Math.max(0, h2 * h2 - c * c / 4)), px = -dy / c, py = dx / c;
  const e1 = [m[0] + px * hh, m[1] + py * hh], e2 = [m[0] - px * hh, m[1] - py * hh];
  let e;
  if (elbow) e = elbow > 0 ? e1 : e2;
  else { const sc = q => (q[1] - m[1]) * .8 + side * (q[0] - m[0]); e = sc(e1) >= sc(e2) ? e1 : e2; }   // вниз и наружу
  return { b: [b[0], b[1]], e };
}
export function elbowArm(x, a, b, L, side, elbow, w, col, via, shade) {
  const r = via ? { b: [b[0], b[1]], e: via } : elbowIK(a, b, L, side, elbow), e = r.e;
  x.lineWidth = w; x.lineCap = 'round'; x.lineJoin = 'round'; x.strokeStyle = col; x.beginPath(); x.moveTo(a[0], a[1]);
  const ang = Math.abs(Math.atan2((e[0] - a[0]) * (r.b[1] - e[1]) - (e[1] - a[1]) * (r.b[0] - e[0]), (e[0] - a[0]) * (r.b[0] - e[0]) + (e[1] - a[1]) * (r.b[1] - e[1])));
  if (ang > .05) x.arcTo(e[0], e[1], r.b[0], r.b[1], w * 1.6); else x.lineTo(e[0], e[1]);
  x.lineTo(r.b[0], r.b[1]); x.stroke();
  if (shade && shade.dir) {                                                   // объём руки: темнее с дальней от света стороны, тёплый край с ближней
    const d = Math.hypot(shade.dir[0], shade.dir[1]) || 1, lx = shade.dir[0] / d, ly = shade.dir[1] / d, A = shade.arm || {};
    for (const [p, q] of [[a, e], [e, r.b]]) {
      const sx = q[0] - p[0], sy = q[1] - p[1], sl = Math.hypot(sx, sy); if (sl < w) continue;
      let nx = -sy / sl, ny = sx / sl; if (nx * lx + ny * ly < 0) { nx = -nx; ny = -ny; }   // нормаль к свету
      const cut = Math.min(w * .45, sl * .3), ux = sx / sl * cut, uy = sy / sl * cut;
      const seg = (o, ww, c, k) => { x.save(); x.globalAlpha = k; x.lineWidth = ww; x.lineCap = 'round'; x.strokeStyle = c; x.beginPath(); x.moveTo(p[0] + ux + nx * o, p[1] + uy + ny * o); x.lineTo(q[0] - ux + nx * o, q[1] - uy + ny * o); x.stroke(); x.restore(); };
      if (shade.rim && shade.rim.k > 0) seg(w * .24, w * .22, shade.rim.color, (A.rimK ?? shade.rim.k) * .9);
    }
  }
  return r.b;
}
export function drawHand(x, p, r, col, ink, shine = true) {
  ell(x, p[0], p[1], r, r, col, ink, r * .2);
  if (shine) { x.beginPath(); x.arc(p[0], p[1], r * .68, Math.PI * 1.08, Math.PI * 1.55); x.lineWidth = r * .09; x.lineCap = 'round'; x.strokeStyle = 'rgba(255,235,245,.28)'; x.stroke(); }
}

// =====================================================================================================
// одежда: слои внутри контура тела (обрезаются по «капле») и поверх контура. B = { cx, cy, rx, ry }
// =====================================================================================================
export const CLOTHES = {
  // клетка: тёмные и светлые линии с шагом step
  plaid: ({ dark, light, step = 46 }) => (x, B) => {
    const K = Math.ceil(Math.max(B.rx, B.ry) / step);
    x.strokeStyle = dark; x.lineWidth = 4.5; x.globalAlpha = .8; x.beginPath();
    for (let k = -K; k <= K; k++) { x.moveTo(B.cx + k * step + 6, B.cy - B.ry); x.lineTo(B.cx + k * step + 6, B.cy + B.ry); }
    for (let k = -K; k <= K; k++) { x.moveTo(B.cx - B.rx, B.cy + k * step - 4); x.lineTo(B.cx + B.rx, B.cy + k * step - 4); }
    x.stroke();
    x.strokeStyle = light; x.lineWidth = 2.2; x.globalAlpha = .55; x.beginPath();
    for (let k = -K; k <= K; k++) { x.moveTo(B.cx + k * step + 27, B.cy - B.ry); x.lineTo(B.cx + k * step + 27, B.cy + B.ry); }
    for (let k = -K; k <= K; k++) { x.moveTo(B.cx - B.rx, B.cy + k * step + 18); x.lineTo(B.cx + B.rx, B.cy + k * step + 18); }
    x.stroke(); x.globalAlpha = 1;
  },
  // мягкая тень слева направо (объём)
  shadeLR: (c0, c1, c2) => (x, B) => {
    const gs = x.createLinearGradient(B.cx - B.rx, 0, B.cx + B.rx, 0); gs.addColorStop(0, c0); gs.addColorStop(.5, c1); gs.addColorStop(1, c2);
    x.fillStyle = gs; x.fillRect(B.cx - B.rx, B.cy - B.ry, B.rx * 2, B.ry * 2);
  },
  // пояс/штаны внизу тела: h — высота от низа, over — запас под контур
  band: ({ h, over = 6, fill }) => (x, B, S) => {
    x.fillStyle = fill; x.fillRect(B.cx - B.rx, B.cy + B.ry - h, B.rx * 2, h + over);
    line(x, [[B.cx - B.rx, B.cy + B.ry - h], [B.cx + B.rx, B.cy + B.ry - h]], 5, S.colors.ink);
  },
  pocket: ({ x: px, y: py, w, h, r = 8, fill, button }) => (x, B, S) => {
    x.beginPath(); x.roundRect(B.cx + px, B.cy + py, w, h, r); x.fillStyle = fill; x.fill(); x.lineWidth = 4.5; x.strokeStyle = S.colors.ink; x.stroke();
    if (button) ell(x, B.cx + button[0], B.cy + button[1], button[2], button[2], '#fff', S.colors.ink, 3);
  },
  // подтяжки со строчкой; bottom — высота пояса, до которого они доходят
  suspenders: ({ x: sxx = 52, w = 26, bottom = 44, fill, stitch }) => (x, B, S) => {
    for (const sx of [-1, 1]) {
      const x0 = B.cx + sx * sxx;
      x.fillStyle = fill; x.fillRect(x0 - w / 2, B.cy - B.ry, w, B.ry * 2 - bottom);
      line(x, [[x0 - w / 2, B.cy - B.ry], [x0 - w / 2, B.cy + B.ry - bottom]], 4.5, S.colors.ink); line(x, [[x0 + w / 2, B.cy - B.ry], [x0 + w / 2, B.cy + B.ry - bottom]], 4.5, S.colors.ink);
      x.setLineDash([10, 9]); line(x, [[x0, B.cy - B.ry + 4], [x0, B.cy + B.ry - (bottom + 8)]], 2.6, stitch); x.setLineDash([]);
    }
  },
  // пуговицы-кружки в абсолютных координатах относительно центра тела: [[x, y], ...]
  dots: ({ at, r, fill, lw = 4, shine = false }) => (x, B, S) => {
    for (const [px, py] of at) { ell(x, B.cx + px, B.cy + py, r, r, fill, lw ? S.colors.ink : null, lw); if (shine) ell(x, B.cx + px - r * .28, B.cy + py - r * .33, r * .28, r * .28, 'rgba(255,255,255,.5)', null); }
  },
  // произвольный многоугольник / линия / круг в координатах фигуры
  poly: ({ pts, fill, stroke, lw = 3.5 }) => (x) => { x.fillStyle = fill; x.strokeStyle = stroke; x.lineWidth = lw; x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) x.lineTo(p[0], p[1]); x.closePath(); if (fill) x.fill(); if (stroke) x.stroke(); },
  stroke: ({ pts, w, col }) => (x, B, S) => line(x, pts, w, col || S.colors.ink),
  disc: ({ at, rx, ry = rx, fill, stroke, lw }) => (x) => ell(x, at[0], at[1], rx, ry, fill, stroke, lw),
  // костюм: вырез рубашки, лацканы, линия застёжки, кармашек
  lapels: ({ shirt = '#FFFFFF', line: lc = 'rgba(42,28,34,.75)', pocket = true }) => (x, B, S) => {
    const by = B.cy, k = B.rx / 112, ink = S.colors.ink;
    x.beginPath(); x.moveTo(B.cx - 34 * k, by - 160 * k); x.lineTo(B.cx, by - 75 * k); x.lineTo(B.cx + 34 * k, by - 160 * k); x.closePath(); x.fillStyle = shirt; x.fill();
    line(x, [[B.cx - 34 * k, by - 160 * k], [B.cx - 8 * k, by - 90 * k], [B.cx, by - 75 * k]], 3.5, ink); line(x, [[B.cx + 34 * k, by - 160 * k], [B.cx + 8 * k, by - 90 * k], [B.cx, by - 75 * k]], 3.5, ink);
    line(x, [[B.cx - 60 * k, by - 150 * k], [B.cx - 30 * k, by - 70 * k], [B.cx - 14 * k, by - 20 * k]], 3.5, lc);
    line(x, [[B.cx + 60 * k, by - 150 * k], [B.cx + 30 * k, by - 70 * k], [B.cx + 14 * k, by - 20 * k]], 3.5, lc);
    line(x, [[B.cx, by - 75 * k], [B.cx, by + B.ry]], 2.5, 'rgba(42,28,34,.35)');
    if (pocket) line(x, [[B.cx - 78 * k, by + 70 * k], [B.cx - 38 * k, by + 70 * k]], 3, 'rgba(42,28,34,.6)');
  },
  // роза в петлице
  rose: ({ at, col = '#D9262F', dark = '#97121D', leaf = '#3E8A3A' }) => (x, B, S) => {
    x.save(); x.translate(B.cx + at[0], B.cy + at[1]);
    for (const a of [-.9, .5]) { x.save(); x.rotate(a); x.beginPath(); x.ellipse(0, 22, 7, 14, 0, 0, TAU); x.fillStyle = leaf; x.fill(); x.lineWidth = 3; x.strokeStyle = S.colors.ink; x.stroke(); x.restore(); }
    const gr = x.createRadialGradient(-5, -6, 2, 0, 0, 20); gr.addColorStop(0, '#F2555C'); gr.addColorStop(1, col);
    ell(x, 0, 0, 19, 18, gr, S.colors.ink, 3.5);
    x.beginPath(); for (let k = 0; k < 26; k++) { const a = k * .55, r = 2 + k * .55; x[k ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r * .9); }
    x.lineWidth = 2.5; x.strokeStyle = dark; x.stroke(); x.restore();
  },
};

// =====================================================================================================
// шляпы (в координатах головы: центр головы = 0,0)
// =====================================================================================================
export const HATS = {
  none() {},
  // широкополая шляпа шахтёра с кокардой-фонарём; размеры сняты с эталона в радиусах головы
  wideBrim(x, H, S) {
    const r = H.ry, o = S.hat, lwPx = S.lw;
    x.save(); x.scale(r, r); const lw = lwPx / r, ink = S.colors.ink;
    const gb = x.createLinearGradient(-1.6, 0, 1.6, 0); gb.addColorStop(0, o.lt); gb.addColorStop(.5, o.col); gb.addColorStop(1, o.dk);
    x.beginPath(); x.ellipse(0, -.92, 1.58, .42, 0, 0, TAU); x.fillStyle = gb; x.fill(); x.lineWidth = lw; x.strokeStyle = ink; x.stroke();
    // crown: rounded dome sitting inside the brim
    x.beginPath(); x.moveTo(-.9, -.98);
    x.bezierCurveTo(-.9, -1.3, -.82, -1.52, -.62, -1.56); x.quadraticCurveTo(0, -1.63, .62, -1.58);
    x.bezierCurveTo(.84, -1.54, .9, -1.3, .9, -.98); x.quadraticCurveTo(0, -.68, -.9, -.98); x.closePath();
    const gc = x.createLinearGradient(-.9, 0, .9, 0); gc.addColorStop(0, o.lt); gc.addColorStop(.45, o.col); gc.addColorStop(1, o.dk);
    x.fillStyle = gc; x.fill(); x.lineWidth = lw; x.strokeStyle = ink; x.stroke();
    x.beginPath(); x.moveTo(-.88, -1.06); x.quadraticCurveTo(0, -.78, .88, -1.06); x.lineWidth = lw * .5; x.strokeStyle = 'rgba(58,34,20,.7)'; x.stroke();
    // cream highlights: crown top and both brim ends (tapered strokes)
    const hi = (a, c, b, w) => { x.beginPath(); x.moveTo(a[0], a[1]); x.quadraticCurveTo(c[0], c[1] - w, b[0], b[1]); x.quadraticCurveTo(c[0], c[1] + w, a[0], a[1]); x.fillStyle = o.hi; x.fill(); };
    hi([-.7, -1.36], [-.02, -1.5], [.72, -1.38], .035); hi([-1.47, -.98], [-1.2, -1.07], [-.92, -1.05], .045); hi([.94, -1.03], [1.22, -1.03], [1.5, -.93], .045);
    if (o.badge !== false) {                                       // lamp badge
      const gold = o.badge || '#F2C530';
      x.beginPath(); x.roundRect(-.15, -1.0, .24, .14, .03); x.fillStyle = gold; x.fill(); x.lineWidth = lw * .6; x.strokeStyle = ink; x.stroke();
      ell(x, -.03, -1.17, .185, .185, gold, ink, lw * .65);
      const gg = x.createRadialGradient(-.08, -1.22, .02, -.03, -1.17, .18); gg.addColorStop(0, '#FFE27A'); gg.addColorStop(1, 'rgba(210,150,20,0)'); x.fillStyle = gg; x.beginPath(); x.arc(-.03, -1.17, .17, 0, TAU); x.fill();
      ell(x, -.03, -1.17, .08, .08, '#F4F1EC', ink, lw * .5);
    }
    x.restore();
  },
  // вязаная шапка с отворотом (координаты для головы r = 100)
  beanie(x, H, S) {
    const o = S.hat, k = H.ry / 100, ink = S.colors.ink, LWB = S.lw;
    x.save(); if (k !== 1) x.scale(k, k);
    const lw = LWB / k;
    x.beginPath(); x.moveTo(-90, -46); x.bezierCurveTo(-88, -100, -40, -114, 0, -112); x.bezierCurveTo(44, -112, 88, -98, 92, -46); x.closePath();
    const gb = x.createLinearGradient(-92, 0, 92, 0); gb.addColorStop(0, o.lt); gb.addColorStop(.6, o.col); gb.addColorStop(1, o.dk);
    x.fillStyle = gb; x.fill(); x.lineWidth = lw; x.strokeStyle = ink; x.stroke();
    x.save(); x.clip(); x.strokeStyle = o.rib || 'rgba(110,62,0,.5)'; x.lineWidth = 3.2; x.beginPath();
    for (let q = -8; q <= 8; q++) { x.moveTo(q * 11.5, -46); x.quadraticCurveTo(q * 9.5, -86, q * 4.5, -112); } x.stroke(); x.restore();
    x.beginPath(); x.moveTo(-96, -48); x.quadraticCurveTo(0, -60, 97, -47); x.lineTo(95, -20); x.quadraticCurveTo(0, -32, -94, -19); x.closePath();
    x.fillStyle = o.col; x.fill(); x.lineWidth = lw; x.strokeStyle = ink; x.stroke();
    x.save(); x.clip(); x.strokeStyle = o.rib2 || 'rgba(110,62,0,.55)'; x.lineWidth = 3.2; x.beginPath();
    for (let q = -9; q <= 9; q++) { x.moveTo(q * 10.5, -62); x.lineTo(q * 10.5, -14); } x.stroke(); x.restore();
    x.restore();
  },
  // цилиндр с лентой (координаты для головы 140 x 122)
  topHat(x, H, S) {
    const o = S.hat, k = H.ry / 122, by = -100, LW = S.lw / k, ink = S.colors.ink;
    x.save(); if (k !== 1) x.scale(k, k);
    const g = x.createLinearGradient(-110, 0, 110, 0); g.addColorStop(0, o.lt); g.addColorStop(.55, o.col); g.addColorStop(1, o.dk);
    x.beginPath(); x.moveTo(-96, by - 6); x.lineTo(-106, by - 158); x.quadraticCurveTo(0, by - 172, 106, by - 158); x.lineTo(96, by - 6); x.closePath();
    x.fillStyle = g; x.fill(); x.lineWidth = LW; x.strokeStyle = ink; x.stroke();
    x.beginPath(); x.moveTo(-97, by - 8); x.lineTo(-99, by - 36); x.quadraticCurveTo(0, by - 42, 99, by - 36); x.lineTo(97, by - 8); x.closePath();
    x.fillStyle = o.band; x.fill(); line(x, [[-98, by - 22], [0, by - 27], [98, by - 22]], 2, 'rgba(255,255,255,.25)');
    x.beginPath(); x.moveTo(-160, by - 14); x.quadraticCurveTo(-150, by + 12, 0, by + 14); x.quadraticCurveTo(150, by + 12, 160, by - 14);
    x.quadraticCurveTo(140, by - 4, 0, by - 6); x.quadraticCurveTo(-140, by - 4, -160, by - 14); x.closePath();
    const gb = x.createLinearGradient(-160, 0, 160, 0); gb.addColorStop(0, o.lt); gb.addColorStop(1, o.dk);
    x.fillStyle = gb; x.fill(); x.lineWidth = LW; x.strokeStyle = o.rim || o.band; x.stroke();
    x.restore();
  },
  // котелок: круглая тулья, узкие загнутые поля, лента
  bowler(x, H, S) {
    const o = S.hat, k = H.ry / 122, by = -92, LW = S.lw / k, ink = S.colors.ink;
    x.save(); if (k !== 1) x.scale(k, k);
    const g = x.createLinearGradient(-110, 0, 110, 0); g.addColorStop(0, o.lt); g.addColorStop(.5, o.col); g.addColorStop(1, o.dk);
    x.beginPath(); x.moveTo(-104, by - 4); x.bezierCurveTo(-112, by - 96, -66, by - 142, 0, by - 144); x.bezierCurveTo(66, by - 142, 112, by - 96, 104, by - 4); x.closePath();
    x.fillStyle = g; x.fill(); x.lineWidth = LW; x.strokeStyle = ink; x.stroke();
    x.beginPath(); x.moveTo(-105, by - 6); x.lineTo(-108, by - 34); x.quadraticCurveTo(0, by - 42, 108, by - 34); x.lineTo(105, by - 6); x.closePath();
    x.fillStyle = o.band; x.fill();
    line(x, [[-74, by - 104], [-40, by - 128], [0, by - 132]], 5, 'rgba(255,255,255,.22)');                 // блик на тулье
    x.beginPath(); x.moveTo(-150, by - 20); x.quadraticCurveTo(-146, by + 10, 0, by + 14); x.quadraticCurveTo(146, by + 10, 150, by - 20);
    x.quadraticCurveTo(128, by - 2, 0, by - 4); x.quadraticCurveTo(-128, by - 2, -150, by - 20); x.closePath();
    x.fillStyle = o.col; x.fill(); x.lineWidth = LW; x.strokeStyle = ink; x.stroke();
    x.restore();
  },
};

// =====================================================================================================
// лицо
// =====================================================================================================
// глаз. kind: dot | lid (тяжёлое веко — «обычный» взгляд эталона) | closed (дуга ∩: смех, подмигивание) | wide | flat (моргание)
function eye(x, kind, cx, cy, rx, ry, look, tilt, lw, ink, sd = 1) {
  const lx = (look?.[0] || 0) * rx * .35, ly = (look?.[1] || 0) * ry * .25;
  if (kind === 'shut') { line(x, [[cx - sd * rx * 1.7, cy - ry * 1.0], [cx + sd * rx * 1.5, cy]], lw, ink); line(x, [[cx + sd * rx * 1.5, cy], [cx - sd * rx * 1.7, cy + ry * 1.0]], lw, ink); return; }   // зажмурен: > <
  if (kind === 'wideS') { ell(x, cx, cy - ry * .2, rx * 2.9, ry * 2.6, '#FFFFFF', ink, lw * .75); ell(x, cx + lx * 2.6, cy - ry * .2 + ly * 2, rx * .55, ry * .45, ink, null); return; }   // ужас: белок больше, зрачок-точка
  if (kind === 'closed') { line(x, [[cx - rx * 1.7, cy + ry * .25], [cx, cy - ry * 1.15], [cx + rx * 1.7, cy + ry * .25]], lw, ink); return; }
  if (kind === 'flat') { line(x, [[cx - rx * 1.9, cy], [cx + rx * 1.9, cy + rx * .1]], lw, ink); return; }
  if (kind === 'dot') { ell(x, cx + lx, cy + ly, rx, ry, ink, null); return; }
  if (kind === 'wide') { ell(x, cx, cy - ry * .2, rx * 2.5, ry * 2.25, '#FFFFFF', ink, lw * .75); ell(x, cx + lx * 2.2, cy + ly * 1.6, rx * .9, ry * .75, ink, null); return; }
  const ly0 = cy - ry * .8;
  x.save(); x.beginPath(); x.rect(cx - rx * 3, ly0, rx * 6, ry * 4); x.clip();
  ell(x, cx + lx, cy + ly, rx, ry, ink, null); x.restore();
  line(x, [[cx - rx * 2.1, ly0 - tilt], [cx + rx * 2.1, ly0 + tilt]], lw, ink);
}
function brow(x, sx, ex, ey, lift, ang, k, col) {
  const y = ey - 42 * k - lift * k, d = ang * 16 * k;
  line(x, [[ex - sx * 20 * k, y - d], [ex - sx * 2 * k, y - 9 * k - d * .3], [ex + sx * 20 * k, y + d * .3]], 7.5 * k, col);
}
// рты. Маленькие (спокойное лицо, общий план) масштабируются радиусом r; большие (речь, смех, оскал) — масштабом s.
export const SMALL_MOUTHS = ['o', 'oSmall', 'flatS', 'smirkS', 'smileS', 'chew'];
export const BIG_MOUTHS = ['flat', 'smile', 'smirk', 'O', 'open', 'laugh', 'laughBig', 'teeth', 'teethOpen'];
export const MOUTHS = [...BIG_MOUTHS, ...SMALL_MOUTHS];
// дополнительные большие рты (армия V002): оскал-улыбка, крик с двумя рядами зубов, отвисшая челюсть, свист, дуга вниз, волна
export const EXTRA_MOUTHS = ['grin', 'roar', 'jawDrop', 'whistle', 'frown', 'wavy'];
function smallMouth(x, m, r, cx, cy, C, p) {
  switch (m) {
    case 'o': ell(x, cx, cy, r * .075, r * .05, C.mouth, null, 0, -.25); break;
    case 'oSmall': ell(x, cx, cy, r * .055, r * .04, C.mouth, null, 0, -.2); break;
    case 'flatS': line(x, [[cx - r * .1, cy], [cx + r * .08, cy - r * .01]], r * .05, C.ink); break;
    case 'smirkS': line(x, [[cx - r * .11, cy + r * .055], [cx + r * .0, cy + r * .06], [cx + r * .11, cy - r * .055]], r * .06, C.ink); break;
    case 'smileS': line(x, [[cx - r * .17, cy - r * .07], [cx - r * .02, cy + r * .13], [cx + r * .17, cy - r * .02]], r * .06, C.ink); break;
    case 'chew': { const c = p.chew || 0; ell(x, cx + c * .03 * r, cy + c * .02 * r, .055 * r, (.04 + c * .015) * r, C.mouth, null); break; }
  }
}
function bigMouth(x, m, C, lw) {
  const y = 0;
  const dark = (draw, tongue) => {
    x.beginPath(); draw(); x.closePath(); x.fillStyle = C.mouthIn || '#5B1E28'; x.fill();
    if (tongue) { x.save(); x.clip(); ell(x, tongue[0], tongue[1], tongue[2], tongue[3], C.tongue || '#E8737F', null); x.restore(); x.beginPath(); draw(); x.closePath(); }
    x.lineWidth = lw; x.strokeStyle = C.ink; x.lineJoin = 'round'; x.stroke();
  };
  switch (m) {
    case 'flat': line(x, [[-20, y], [20, y]], 6, C.ink); break;
    case 'smile': line(x, [[-30, y - 6], [0, y + 14], [30, y - 6]], 6, C.ink); break;
    case 'smirk': line(x, [[-24, y + 4], [6, y + 6], [32, y - 10]], 6, C.ink); break;
    case 'O': ell(x, 0, y + 6, 17, 22, C.mouthIn || '#5B1E28', C.ink, lw); ell(x, 0, y + 18, 9, 5, C.tongue || '#E8737F', null); break;
    case 'open': dark(() => { x.moveTo(-26, y - 2); x.quadraticCurveTo(0, y + 2, 26, y - 2); x.quadraticCurveTo(24, y + 26, 0, y + 28); x.quadraticCurveTo(-24, y + 26, -26, y - 2); }, [0, y + 26, 16, 10]); break;
    case 'laugh': dark(() => { x.moveTo(-40, y - 6); x.lineTo(40, y - 6); x.quadraticCurveTo(40, y + 40, 0, y + 42); x.quadraticCurveTo(-40, y + 40, -40, y - 6); }, [4, y + 40, 24, 16]); break;
    case 'laughBig': dark(() => { x.moveTo(-46, y - 8); x.lineTo(46, y - 8); x.quadraticCurveTo(46, y + 54, 0, y + 56); x.quadraticCurveTo(-46, y + 54, -46, y - 8); }, [4, y + 54, 28, 20]); break;
    case 'teeth': case 'teethOpen': {                                                         // нервный оскал «решёткой»
      const h = m === 'teeth' ? 30 : 40, w = 76, x0 = -w / 2, y0 = y - 8;
      x.beginPath(); x.roundRect(x0, y0, w, h, 10); x.fillStyle = C.teeth || '#FFFFFF'; x.fill();
      x.save(); x.clip(); x.lineWidth = 3.5; x.strokeStyle = C.ink; x.beginPath();
      x.moveTo(x0, y0 + h / 2); x.lineTo(x0 + w, y0 + h / 2);
      for (let k = 1; k < 5; k++) { x.moveTo(x0 + k * w / 5, y0); x.lineTo(x0 + k * w / 5, y0 + h); }
      x.stroke(); x.restore();
      x.beginPath(); x.roundRect(x0, y0, w, h, 10); x.lineWidth = lw; x.strokeStyle = C.ink; x.stroke(); break;
    }
    case 'grin': {                                                                            // широкая улыбка с зубами (эталон: «to buy»)
      const path = () => { x.beginPath(); x.moveTo(-46, y - 10); x.quadraticCurveTo(0, y + 8, 46, y - 10); x.quadraticCurveTo(30, y + 34, 0, y + 36); x.quadraticCurveTo(-30, y + 34, -46, y - 10); x.closePath(); };
      path(); x.fillStyle = C.teeth || '#FFFFFF'; x.fill(); x.save(); x.clip(); x.lineWidth = 3.2; x.strokeStyle = C.ink; x.beginPath();
      x.moveTo(-46, y + 12); x.quadraticCurveTo(0, y + 24, 46, y + 12); for (let k = -2; k <= 2; k++) { x.moveTo(k * 15, y - 12); x.lineTo(k * 14, y + 38); }
      x.stroke(); x.restore(); path(); x.lineWidth = lw; x.strokeStyle = C.ink; x.lineJoin = 'round'; x.stroke(); break;
    }
    case 'roar': {                                                                            // крик: тёмная пасть, ряды зубов сверху и снизу
      const path = () => { x.beginPath(); x.moveTo(-50, y - 14); x.quadraticCurveTo(0, y - 24, 50, y - 14); x.quadraticCurveTo(56, y + 48, 0, y + 54); x.quadraticCurveTo(-56, y + 48, -50, y - 14); x.closePath(); };
      path(); x.fillStyle = C.mouthIn || '#5B1E28'; x.fill(); x.save(); x.clip();
      ell(x, 2, y + 50, 26, 16, C.tongue || '#E8737F', null);
      x.fillStyle = C.teeth || '#FFFFFF'; x.beginPath(); x.moveTo(-60, y - 30); x.lineTo(60, y - 30); x.lineTo(60, y - 2); x.quadraticCurveTo(0, y + 6, -60, y - 2); x.closePath(); x.fill();
      x.lineWidth = 3.2; x.strokeStyle = C.ink; x.beginPath(); x.moveTo(-60, y - 2); x.quadraticCurveTo(0, y + 6, 60, y - 2); for (let k = -3; k <= 3; k++) { x.moveTo(k * 14, y - 26); x.lineTo(k * 14, y + 3); } x.stroke();
      x.restore(); path(); x.lineWidth = lw; x.strokeStyle = C.ink; x.lineJoin = 'round'; x.stroke(); break;
    }
    case 'jawDrop': {                                                                         // челюсть отвисла ниже подбородка
      const path = () => { x.beginPath(); x.moveTo(-30, y - 8); x.quadraticCurveTo(0, y - 14, 30, y - 8); x.bezierCurveTo(42, y + 40, 46, y + 118, 0, y + 124); x.bezierCurveTo(-46, y + 118, -42, y + 40, -30, y - 8); x.closePath(); };
      path(); x.fillStyle = C.mouthIn || '#5B1E28'; x.fill(); x.save(); x.clip();
      ell(x, 0, y + 116, 26, 22, C.tongue || '#E8737F', null);
      x.fillStyle = C.teeth || '#FFFFFF'; x.fillRect(-40, y - 20, 80, 22); x.lineWidth = 3; x.strokeStyle = C.ink; x.beginPath(); x.moveTo(-40, y + 2); x.lineTo(40, y + 2); for (let k = -1; k <= 1; k++) { x.moveTo(k * 14, y - 16); x.lineTo(k * 14, y + 2); } x.stroke();
      x.restore(); path(); x.lineWidth = lw; x.strokeStyle = C.ink; x.lineJoin = 'round'; x.stroke(); break;
    }
    case 'whistle': {                                                                         // губы трубочкой
      ell(x, 0, y + 6, 11, 13, C.mouthIn || '#5B1E28', C.ink, lw * .8);
      line(x, [[-22, y - 8], [-15, y + 4], [-22, y + 18]], 4.5, C.ink); line(x, [[22, y - 8], [15, y + 4], [22, y + 18]], 4.5, C.ink); break;
    }
    case 'frown': line(x, [[-30, y + 14], [0, y - 8], [30, y + 14]], 6, C.ink); break;
    case 'wavy': { x.beginPath(); x.moveTo(-32, y + 4); x.bezierCurveTo(-22, y - 12, -12, y - 12, -2, y + 3); x.bezierCurveTo(8, y + 16, 20, y + 16, 32, y - 2); x.lineWidth = 6; x.lineCap = 'round'; x.strokeStyle = C.ink; x.stroke(); break; }
  }
}
const OPEN_MOUTHS = ['O', 'open', 'laugh', 'laughBig', 'teethOpen', 'roar', 'jawDrop'];
function moustache(x, lift, open, C) {
  const y0 = 22 + open * 2, e = lift;                                  // концы усов поднимаются вместе с lift
  x.fillStyle = C.stache; x.strokeStyle = C.ink; x.lineWidth = 3.5; x.lineJoin = 'round';
  for (const s of [-1, 1]) {
    x.beginPath(); x.moveTo(0, y0 - 6);
    x.bezierCurveTo(s * 22, y0 - 16, s * 52, y0 - 8, s * 66, y0 - 4 - e * .6);
    x.bezierCurveTo(s * 80, y0 - 10 - e, s * 84, y0 - 24 - e, s * 74, y0 - 28 - e);
    x.bezierCurveTo(s * 66, y0 - 30 - e, s * 63, y0 - 20 - e, s * 70, y0 - 18 - e);
    x.bezierCurveTo(s * 72, y0 - 6 - e * .6, s * 50, y0 + 14, s * 22, y0 + 12);
    x.bezierCurveTo(s * 10, y0 + 11, s * 4, y0 + 6, 0, y0 + 2);
    x.closePath(); x.fill(); x.stroke();
  }
  x.fillStyle = 'rgba(255,255,255,.18)';
  for (const s of [-1, 1]) { x.beginPath(); x.ellipse(s * 30, y0 - 5, 16, 4, s * -.15, 0, TAU); x.fill(); }
}
function sweatDrop(x, px, py, k, ink) {
  if (k < .05) return; x.save(); x.translate(px, py); x.scale(k, k);
  x.beginPath(); x.moveTo(0, -26); x.bezierCurveTo(14, -4, 16, 6, 0, 12); x.bezierCurveTo(-16, 6, -14, -4, 0, -26);
  x.fillStyle = '#A8DBF5'; x.fill(); x.lineWidth = 3.5; x.strokeStyle = ink; x.stroke();
  ell(x, -4, 2, 3, 5, 'rgba(255,255,255,.8)', null); x.restore();
}

// =====================================================================================================
// НЕОБЯЗАТЕЛЬНЫЙ объём (лонги): spec.shade = { dir:[x,y] на свет, body:{...}, head:{...}, rim: null | { color, k } }.
// Часть: { k, color, shift (доля радиуса), shiftU (единицы рисунка — важнее shift), soft (доля радиуса; 0 — чёткая граница),
// op: 'source-over' | 'multiply' }. На каждую часть своя тень формы на стороне от света: часть минус она же, сдвинутая к свету,
// (размытая) и обрезанная по самой части — граница повторяет форму (круг головы, «капля» тела), а не прямой срез.
// Непрозрачно; конечности рисуются поверх и свет на тело не бросают.
function shadePart(x, pathFn, R, Sh, part) {
  const P = { ...Sh, ...(Sh[part] || {}) }, d = Math.hypot(Sh.dir[0], Sh.dir[1]) || 1, dx = Sh.dir[0] / d, dy = Sh.dir[1] / d, m = x.getTransform(), sc = Math.hypot(m.a, m.b) || 1;
  const band = (sx, sy, fill, k, blur, op) => {
    x.save(); pathFn(); x.clip();
    x.beginPath(); x.rect(-R * 6, -R * 6, R * 12, R * 12); x.translate(sx, sy); pathFn(true); x.translate(-sx, -sy);
    if (blur > 0) x.filter = `blur(${Math.max(.5, blur * sc).toFixed(2)}px)`;
    x.globalCompositeOperation = op || 'source-over'; x.globalAlpha = k; x.fillStyle = fill; x.fill('evenodd'); x.restore();
  };
  const sh = P.shiftU ?? R * (P.shift ?? .35);
  if ((P.k ?? .13) > 0) band(dx * sh, dy * sh, P.color || 'rgb(30,16,40)', P.k ?? .13, R * (P.soft ?? .3), P.op);   // тень на дальней от света стороне
  if (Sh.rim && Sh.rim.k > 0) { const w = Sh.rim.wU ?? R * .08; band(-dx * w, -dy * w, Sh.rim.color, Sh.rim.k, Sh.rim.softU ?? R * .05); }   // тёплый край со стороны света (под контуром — половина толщины линии)
}

// фигура
// =====================================================================================================
function limbsFor(S, p) {
  if (p.limbs) return p.limbs;
  const st = S.stances[p.stance || S.stance] || {}, out = p.legs ? [...p.legs] : [...(st.limbs || [])], rig = S.rig, u = S.u ?? 1;
  if (st.arms === 'auto' || p.arms) {
    for (const i of [0, 1]) {
      const sd = i ? 1 : -1, sh = rig.sh[i], A = p.arms && p.arms[i];
      if (A === null) continue;
      const H = i ? p.hR : p.hL, B = (i ? p.bR : p.bL) ?? 1;
      const to = A && A.to ? A.to : H ? [sh[0] + sd * H[0] * u, sh[1] + H[1] * u] : [sh[0] + sd * -15 * u, sh[1] + 215 * u];
      out.push({ a: A && A.from ? A.from : sh, b: to, L: (A && A.L) ?? rig.armL, bend: (A && A.bend) ?? -B * sd, sag: (A && A.sag) ?? rig.sag, w: A && A.w, layer: (A && A.layer) || rig.armLayer || 'front', hand: A && A.hand !== undefined ? A.hand : S.hand.r, ...(S.armStyle === 'elbow' ? { ik: true, side: sd, elbow: A && A.elbow, via: A && A.via } : {}) });
    }
  }
  return out;
}
function drawLimbs(x, limbs, layer, S, hipDy) {
  const ink = S.colors.ink; let any = false;
  for (const L of limbs) {
    if ((L.layer || 'back') !== layer) continue; any = true;
    const w = L.w ?? S.limbW, col = L.col || ink;
    if (L.pts) line(x, L.hip && hipDy ? [[L.pts[0][0], L.pts[0][1] + hipDy], ...L.pts.slice(1)] : L.pts, w, col);
    else if (L.ik) { const r = elbowArm(x, L.a, L.b, L.L, L.side, L.elbow, w, col, L.via, S.shade); L.b = r; }   // via — локоть в заданной точке (предплечье лежит на столе)        // лонги: рука с локтем (spec.armStyle = 'elbow')
    else if (S.legStyle === 'natural' && layer === 'back') {                                   // лонги: нога бедро + голень с коленом (IK, длина постоянна)
      const a = L.hip && hipDy ? [L.a[0], L.a[1] + hipDy] : L.a; elbowArm(x, a, L.b, L.L, 0, Math.sign(L.bend ?? 1) || 1, w, col);
    }
    else { const a = L.hip && hipDy ? [L.a[0], L.a[1] + hipDy] : L.a; hose(x, a, L.b, Math.max(L.L, Math.hypot(L.b[0] - a[0], L.b[1] - a[1]) * (L.min ?? 1.04)), L.bend ?? 1, w, col, L.sag ?? .5); }
  }
  if (any) for (const L of limbs) if ((L.layer || 'back') === layer && L.hand && !L.pts) {
    const h = typeof L.hand === 'number' ? { r: L.hand } : L.hand;
    if (S.hand.plain) ell(x, L.b[0], L.b[1], h.r, h.r, S.hand.fill, null); else drawHand(x, L.b, h.r, S.hand.fill, ink, S.hand.shine !== false);
  }
}
// VW = { view, facing } для видов 'side' | 'threeQuarter' | 'back'; null — анфас (прежний рисунок без изменений)
function drawBody(x, S, VW) {
  const b = S.body, rx = VW ? b.rx * (VW.view === 'side' ? b.sideK ?? .88 : VW.view === 'threeQuarter' ? b.tqK ?? .96 : 1) : b.rx;
  const B = { cx: b.x, cy: b.y, rx, ry: b.ry }, ink = S.colors.ink;
  beanPath(x, b.x, b.y, rx, b.ry, b.n, b.topK);
  if (b.fillLR) { const g = x.createLinearGradient(b.x - rx, 0, b.x + rx, 0); g.addColorStop(0, b.fillLR[0]); g.addColorStop(.5, b.fillLR[1]); g.addColorStop(1, b.fillLR[2]); x.fillStyle = g; }
  else if (b.fillRadial) { const q = b.fillRadial, g = x.createRadialGradient(b.x + q.at[0], b.y + q.at[1], q.r0, b.x + q.to[0], b.y + q.to[1], q.r1); q.stops.forEach(([o, c]) => g.addColorStop(o, c)); x.fillStyle = g; }
  else x.fillStyle = b.fill;
  x.fill();
  // одежда получает вид 4-м аргументом. Герой, который видов не знает (нет b.views): сбоку и в 3/4 рисунок съезжает
  // в сторону взгляда, сзади остаются только слои внутри контура (без пуговиц и значков поверх)
  const shift = VW && !b.views && VW.view !== 'back' ? VW.facing * rx * (VW.view === 'side' ? .34 : .16) : 0;
  const outside = VW && !b.views && VW.view === 'back' ? [] : b.outside || [];
  if (b.inside && b.inside.length) { x.save(); x.clip(); if (shift) x.translate(shift, 0); for (const fn of b.inside) fn(x, B, S, VW); x.restore(); beanPath(x, b.x, b.y, rx, b.ry, b.n, b.topK); }
  if (S.shade) { shadePart(x, sub => { if (!sub) x.beginPath(); beanPath(x, b.x, b.y, rx, b.ry, b.n, b.topK, sub); }, Math.max(rx, b.ry), S.shade, 'body'); beanPath(x, b.x, b.y, rx, b.ry, b.n, b.topK); }
  x.lineWidth = S.lw; x.strokeStyle = ink; x.stroke();
  if (shift) { x.save(); x.translate(shift, 0); }
  for (const fn of outside) fn(x, B, S, VW);
  if (shift) x.restore();
}
// виды головы: сдвиг лица к краю (в радиусах), сжатие расстояния между глазами, доля головы под волосами на затылке
const VIEWS = { threeQuarter: { turn: .3, comp: .86, hair: .2 }, side: { turn: .5, comp: .6, hair: .4 }, back: { turn: 0, comp: 1, hair: 1 } };
// волосы на затылке (как у эталона: сбоку — «шлем» на задней части головы, сзади — полоса с фестонами под шляпой)
function viewHair(x, S, VW) {
  const h = S.head, C = S.colors, r = h.rx, ry = h.ry, fc = VW.facing, o = h.back || {};
  if (h.back === false) return;
  if (VW.view !== 'back' && !globalThis.__CROWD_LEGACY) return;                 // «шлем» волос на затылке — только в виде со спины: в 3/4 и в профиль он читался как чёрная клякса поверх лица
  x.save(); x.beginPath(); x.ellipse(0, 0, h.rx - 3, h.ry - 3, 0, 0, TAU); x.clip(); x.fillStyle = o.col || C.hair || C.ink; x.beginPath();
  if (VW.view === 'back') {
    const y0 = ry * (o.y ?? .08), n = o.n ?? 4, w = r * 2.3 / n;
    x.moveTo(-r * 1.2, -ry * 1.2); x.lineTo(r * 1.2, -ry * 1.2); x.lineTo(r * 1.15, y0);
    for (let k = 0; k < n; k++) { const xa = r * 1.15 - (k + 1) * w; x.quadraticCurveTo(xa + w / 2, y0 + ry * .24, xa, y0); }
    x.closePath();
  } else {
    const xb = -fc * r * (1 - 2 * (o[VW.view] ?? VIEWS[VW.view].hair));
    x.moveTo(xb + fc * r * .16, -ry * 1.1); x.quadraticCurveTo(xb - fc * r * .03, -ry * .4, xb, ry * .06);
    x.quadraticCurveTo(xb + fc * r * .17, ry * .17, xb + fc * r * .1, ry * .34);
    x.quadraticCurveTo(xb - fc * r * .1, ry * .4, xb - fc * r * .2, ry * 1.1);
    x.lineTo(-fc * r * 1.3, ry * 1.1); x.lineTo(-fc * r * 1.3, -ry * 1.1); x.closePath();
  }
  x.fill(); x.restore();
  ell(x, 0, 0, h.rx, h.ry, null, C.ink, S.lw);
}
// фонтаны слёз из внешних уголков глаз (хохот до слёз): капли летят по дуге, k — сила 0..1
function tearJets(x, f, off, t, k, fs, ink) {
  for (const sd of [-1, 1]) {
    const e = f.eyes[sd < 0 ? 0 : 1], ox = e.x + off + sd * e.rx * 2.4, oy = e.y + e.ry * .3;
    for (let j = 0; j < 5; j++) {
      const ph = ((t * 2.3 + j / 5 + (sd > 0 ? .1 : 0)) % 1 + 1) % 1, px = ox + sd * (20 + 120 * ph) * fs * k, py = oy + (-95 * ph + 190 * ph * ph) * fs * k;
      const a = Math.atan2(-95 + 380 * ph, sd * 120);
      x.save(); x.translate(px, py); x.rotate(a - Math.PI / 2); const q = (.5 + .5 * k) * fs * (1 - .35 * ph); x.scale(q, q);
      x.beginPath(); x.moveTo(0, -22); x.bezierCurveTo(11, -4, 13, 6, 0, 11); x.bezierCurveTo(-13, 6, -11, -4, 0, -22); x.fillStyle = '#A8DBF5'; x.fill(); x.lineWidth = 3.2; x.strokeStyle = ink; x.stroke(); x.restore();
    }
  }
}
function drawHead(x, S, p, VW) {
  const h = S.head, f = S.face, C = S.colors, ink = C.ink, LW = S.lw, back = !!VW && VW.view === 'back';
  x.save(); x.translate(h.x + (p.headDx || 0), h.y + (h.pivot || 0) + (p.headDy || 0)); x.rotate(p.tilt || 0); if (h.pivot) x.translate(0, -h.pivot);
  if (h.ear && !back) ell(x, h.ear.x, h.ear.y, h.ear.rx, h.ear.ry, h.fill, ink, LW);
  const g = x.createRadialGradient(h.grad[0], h.grad[1], h.grad[2], 0, 0, h.grad[3]);
  g.addColorStop(0, h.fill); g.addColorStop(h.grad[4], h.fill); g.addColorStop(1, h.shade);
  ell(x, 0, 0, h.rx, h.ry, g, ink, LW);
  if (p.flush && p.flush.k > .01) { x.save(); x.beginPath(); x.ellipse(0, 0, h.rx, h.ry, 0, 0, TAU); x.clip(); x.globalAlpha = clamp(p.flush.k); x.fillStyle = p.flush.color || '#E0483C'; x.fillRect(-h.rx, -h.ry, h.rx * 2, h.ry * 2); x.restore(); ell(x, 0, 0, h.rx, h.ry, null, ink, LW); }
  if (S.shade) { shadePart(x, sub => { if (!sub) x.beginPath(); x.moveTo(h.rx, 0); x.ellipse(0, 0, h.rx, h.ry, 0, 0, TAU); }, Math.max(h.rx, h.ry), S.shade, 'head'); ell(x, 0, 0, h.rx, h.ry, null, ink, LW); }
  if (h.ear && !back) { const e = h.ear; ell(x, e.x - 2, e.y, e.rx - 4, e.ry - 4, h.fill, null); x.beginPath(); x.arc(e.x + 1, e.y, 9, Math.PI * .9, Math.PI * 1.9); x.lineWidth = 4; x.strokeStyle = e.line || '#A99A94'; x.stroke(); }
  if (h.hair && !back) {
    x.save(); x.beginPath(); const ins = h.hair.inset ?? 4; if (h.rx === h.ry) x.arc(0, 0, h.rx - ins, 0, TAU); else x.ellipse(0, 0, h.rx - ins, h.ry - ins, 0, 0, TAU); x.clip();
    if (h.hair.fringe) { const t = h.hair.fringe; x.beginPath(); x.moveTo(t[0][0], t[0][1]); for (const q of t.slice(1)) x.lineTo(q[0], q[1]); x.closePath(); x.fillStyle = C.hair; x.fill(); }
    if (h.hair.sideburns) for (const sd of [-1, 1]) { const s = h.hair.sideburns; x.beginPath(); x.ellipse(sd * s[0], s[1], s[2], s[3], sd * .5, 0, TAU); x.fillStyle = C.hair; x.fill(); }
    x.restore();
    ell(x, 0, 0, h.rx, h.ry, null, ink, LW);
  }
  if (VW) viewHair(x, S, VW);
  const fs = f.fs ?? 1;
  // вид сбоку и в 3/4: лицо съезжает к краю головы на vfx, глаза сближаются (comp); анфас — vfx = 0, глаза на месте
  const vfx = VW ? VW.facing * VIEWS[VW.view].turn * (f.mr || h.ry) : 0, ecx = (f.eyes[0].x + f.eyes[1].x) / 2;
  const ex = e => (VW ? (e.x - ecx) * VIEWS[VW.view].comp + ecx : e.x);
  if (!back) {
  if (p.blush > .02) for (const sd of [-1, 1]) { const bx = sd * 82 * fs + (f.cx || 0) + vfx, by = 18 * fs, gb = x.createRadialGradient(bx, by, 2, bx, by, 28 * fs); gb.addColorStop(0, 'rgba(242,120,135,' + (.55 * p.blush) + ')'); gb.addColorStop(1, 'rgba(242,120,135,0)'); x.fillStyle = gb; x.beginPath(); x.ellipse(bx, by, 30 * fs, 20 * fs, 0, 0, TAU); x.fill(); }
  // глаза
  const kinds = Array.isArray(p.eyes) ? p.eyes : [p.eyes || 'rest', p.eyes || 'rest'], look = p.look || f.look || [0, 0];
  const fx = (p.turn || 0) * (f.mr || h.ry), sq = clamp(p.squint || 0);
  f.eyes.forEach((e, i) => {
    let kind = kinds[i] === 'rest' ? (f.restEye || 'dot') : kinds[i];
    const cx = ex(e) + (i ? fx * .8 : fx) + vfx, cy = i ? e.y + Math.abs(fx) * .12 : e.y;
    if (p.blink && kind !== 'closed') { if (e.blink) line(x, e.blink, e.lw, ink); else eye(x, 'flat', cx, cy, e.rx, e.ry, look, 0, e.lw, ink); return; }
    if (sq > .6 && kind !== 'closed') { eye(x, 'flat', cx, cy, e.rx, e.ry, look, 0, e.lw, ink); return; }
    let tilt = p.lid ? p.lid[i] : (e.tilt ?? 0);
    if (!p.lid && !f.brows && kind === 'lid') { const b = (i ? p.browR : p.browL) || p.brows; if (b) tilt = (e.tilt ?? 0) + (i ? 1 : -1) * b[1] * e.rx * 1.3; }
    eye(x, kind, cx, cy, e.rx, e.ry, look, tilt, e.lw, ink, i ? 1 : -1);
  });
  if (p.tears > .02) tearJets(x, f, fx + vfx, p.t || 0, clamp(p.tears), fs, ink);
  if (f.glasses) { const gl = f.glasses; x.lineWidth = gl.lw; x.strokeStyle = gl.col || ink; for (const e of f.eyes) { x.beginPath(); x.arc(ex(e) + fx + vfx, e.y + (gl.dy || 0), gl.r, 0, TAU); x.fillStyle = gl.fill || 'rgba(200,225,240,.28)'; x.fill(); x.stroke(); }
    x.beginPath(); x.moveTo(ex(f.eyes[0]) + gl.r + fx + vfx, f.eyes[0].y + (gl.dy || 0)); x.quadraticCurveTo((f.eyes[0].x + f.eyes[1].x) / 2 + fx + vfx, f.eyes[0].y + (gl.dy || 0) - gl.r * .35, ex(f.eyes[1]) - gl.r + fx + vfx, f.eyes[1].y + (gl.dy || 0)); x.stroke(); }
  if (f.brows) { const bL = p.browL || p.brows || [0, 0], bR = p.browR || p.brows || [0, 0], bc = f.browCol || C.hair; brow(x, -1, ex(f.eyes[0]) + fx + vfx, f.eyes[0].y, bL[0], bL[1], fs, bc); brow(x, 1, ex(f.eyes[1]) + fx + vfx, f.eyes[1].y, bR[0], bR[1], fs, bc); }
  // рот
  const m = p.mouth || f.restMouth || 'smirkS';
  if (SMALL_MOUTHS.includes(m)) {
    const mr = f.mr || h.ry;
    smallMouth(x, m, mr, (p.mouthAt ? p.mouthAt[0] * mr : f.mouth[0]) + fx + vfx * 1.1, p.mouthAt ? p.mouthAt[1] * mr : f.mouth[1], C, p);
  } else {
    const ms = f.ms ?? 1; x.save(); x.translate(f.mouthBig[0] + fx + vfx * 1.1, f.mouthBig[1] + (p.mouthDy || 0)); x.scale(ms, ms); bigMouth(x, m, C, LW / ms * (f.mouthLw ?? 1)); x.restore();
  }
  if (f.moustache) { const ms = f.ms ?? 1, mk = f.stacheK ?? 1; x.save(); x.translate(f.mouthBig[0] + fx + vfx * 1.1, f.mouthBig[1] - 50 * ms); x.scale(ms * mk, ms * mk); moustache(x, p.stache || 0, OPEN_MOUTHS.includes(m) ? 1 : 0, C); x.restore(); }
  if (p.sweat > .05) sweatDrop(x, (VW ? -VW.facing : 1) * h.rx * .86, -h.ry * .25 + (((p.t || 0) * 40) % 30) * fs, p.sweat * fs, ink);
  }
  // шляпа: подлетает от испуга (hatDy), догоняет голову после «тейка» (hatLag), приподнимается при подмигивании (hatTip)
  // + hatDx / hatRot: шляпа съезжает набок (рывок за воротник), hatOff — шляпы нет (слетела). Шляпа получает вид и позу.
  const hd = (p.hatDy || 0) * fs + (p.hatLag || 0) * -10 * fs, hr = (p.hatLag || 0) * .06 - (p.hatTip || 0) * .16 + (p.hatRot || 0), hx = (p.hatDx || 0) * fs;
  if (!p.hatOff) { if (hd || hr || hx) { x.save(); x.translate(hx, hd); x.rotate(hr); HATS[S.hat.type](x, h, S, VW, p); x.restore(); } else HATS[S.hat.type](x, h, S, VW, p); }
  x.restore();
}
// шляпа отдельно от героя (слетела и летит): начало координат — центр головы
export function drawHat(x, S, { view, facing = 1 } = {}, p = {}) { x.save(); x.lineCap = 'round'; x.lineJoin = 'round'; HATS[S.hat.type](x, S.head, S, view && view !== 'front' ? { view, facing } : null, p); x.restore(); }

// only: 'base' (всё, кроме переднего слоя) | 'front' (предметы и руки переднего слоя) | undefined (всё)
export function drawStickman(x, S, p = {}, { only } = {}) {
  const base = only !== 'front', front = only !== 'base', u = S.u ?? 1;
  const VW = p.view && p.view !== 'front' ? { view: p.view, facing: p.facing ?? 1 } : null;
  const limbs = limbsFor(S, p), st = S.stances[p.stance || S.stance] || {};
  const held = [...(p.limbs ? [] : st.props || []), ...(p.held || [])];
  x.save(); x.translate(p.dx || 0, p.dy || 0); x.lineCap = 'round'; x.lineJoin = 'round';
  if (p.rot) { const py = p.rotY ?? S.body.y; x.translate(0, py); x.rotate(p.rot); x.translate(0, -py); }
  const sq = p.sq || 0, bob = p.bob || 0, lean = p.lean || 0, upper = sq || bob || lean, hipDy = bob + sq * 60 * u;
  if (base && S.shadow) { x.fillStyle = 'rgba(30,20,20,.18)'; x.beginPath(); x.ellipse(0, S.shadow.y, S.shadow.rx * (1 + bob / (300 * u)), S.shadow.ry, 0, 0, TAU); x.fill(); }
  if (base) drawLimbs(x, limbs, 'back', S, hipDy);
  if (upper) { x.save(); x.translate(0, S.rig.hipY + hipDy); x.rotate(lean); x.scale(1 + sq * .6, 1 - sq); x.translate(0, -S.rig.hipY); }
  if (base) {
    drawLimbs(x, limbs, 'behind', S, 0);                           // за телом, но вместе с корпусом: дальняя рука в виде сбоку
    for (const h of held) if (h.layer === 'behind') h.draw(x, S, p);
    drawBody(x, S, VW);
    drawLimbs(x, limbs, 'mid', S, 0);
    for (const h of held) if ((h.layer || 'front') === 'mid') h.draw(x, S, p);
    drawHead(x, S, p, VW);
  }
  if (front) {
    for (const h of held) if ((h.layer || 'front') === 'front') h.draw(x, S, p);
    drawLimbs(x, limbs, 'front', S, 0);
  }
  if (upper) x.restore();
  x.restore();
}

// =====================================================================================================
// игра: эмоции, речь, моргание, переходы между позами
// =====================================================================================================
// липфлап: форма рта меняется каждые 3–4 кадра (не липсинк), подряд одна и та же форма не идёт
export function talkMouth(t, set, seed = 0, fps = 30) {
  const fi = Math.max(0, Math.floor(t * fps + 1e-6));
  let k = 0, start = 0;
  while (true) { const len = hash(k * 3.1 + seed) < .5 ? 3 : 4; if (start + len > fi) break; start += len; k++; }
  const pick = j => Math.floor(hash(j * 7.3 + seed * 1.7 + 11) * set.length);
  let name = null;                                                 // идём от начала: форма не повторяет предыдущую (в наборе бывают дубли)
  for (let j = 0; j <= k; j++) { let i = pick(j), n = 0; while (set[i] === name && n++ < set.length) i = (i + 1) % set.length; name = set[i]; }
  return { mouth: name, syl: k, open: OPEN_MOUTHS.includes(name) ? 1 : 0 };
}
export const TALK_SET = ['open', 'O', 'smile', 'flat', 'open', 'teethOpen'];
// речь по таймкодам слов: пока идёт слово — липфлап, в паузах — рот покоя.
// words — timeline (core/timeline.js) или массив [{start, end}]; line — номер строки narration.txt (реплика героя)
export function talk(t, words, { set = TALK_SET, rest = 'flat', seed = 0, fps = 30, line, pad = .03 } = {}) {
  const speaking = typeof words.speaking === 'function' ? words.speaking(t, { line, pad })
    : words.some(w => (line == null || w.line === line) && t >= w.start - pad && t < w.end + pad);
  if (!speaking) return { mouth: rest, open: 0, speaking: false };
  return { ...talkMouth(t, set, seed, fps), speaking: true };
}
// моргание: раз в 2–5 с (зерно разносит героев по фазе), длится 4 кадра
export function blinkAt(t, seed = 0, fps = 30) {
  let k = 0, at = .6 + 1.4 * hash(seed * 9.7 + 3);
  while (at <= t) { if (t < at + 4 / fps) return true; at += 2 + 3 * hash(k * 5.3 + seed * 2.1 + 1); k++; }
  return false;
}

// таблица эмоций: лицо + манера двигаться. body(t) возвращает числовые поля позы (ед. стандартной фигуры; масштаб — spec.u).
const REST = { hL: [-15, 215], hR: [-15, 215], bL: 1, bR: 1 };
const HIP = { hL: [10, 150], hR: [10, 150], bL: 1, bR: 1 };                // рука на поясе: локоть наружу
export const EMO = {
  neutral: { eyes: 'rest', mouth: 'smile', brows: [0, 0], stache: 0, body: t => ({ bob: -3 * Math.abs(Math.sin(t * 2.2)), ...REST }) },
  talk: {
    eyes: 'rest', mouth: 'open', brows: [4, 0], stache: 0, talk: TALK_SET,
    body: t => { const g = Math.sin(t * TAU * .9), g2 = Math.sin(t * TAU * 1.7 + 1);
      return { bob: -4 * Math.abs(Math.sin(t * TAU * 1.8)), lean: .02 * g, tilt: .05 * g2, hL: [-15, 215], hR: [lerp(150, 185, (g + 1) / 2), lerp(120, 30, (g + 1) / 2)], bL: 1, bR: 1 }; },
  },
  laugh: {
    eyes: 'closed', mouth: 'laugh', brows: [14, .25], stache: 14, blush: .9, talk: ['laugh', 'laughBig', 'laugh', 'laughBig', 'open'],
    body: t => { const c = Math.abs(Math.sin(t * TAU * 2.6));                    // ~5 «ха» в секунду, цикл ~11 кадров
      return { bob: -26 * c, sq: .07 * (1 - c) - .03, tilt: -.12 + .05 * Math.sin(t * TAU * 2.6), lean: -.04, hL: [12, 150], hR: [-40, 150 + 18 * c], bL: 1, bR: 1 }; },
  },
  nervous: {
    eyes: 'dot', mouth: 'teeth', brows: [6, .55], stache: -4, sweat: 1, talk: ['teeth', 'teethOpen', 'teeth', 'flat'],
    body: t => { const tr = Math.sin(t * TAU * 11) * 2.5, side = Math.sin(t * TAU * .8) > 0 ? 1 : -1;
      return { bob: 0, sq: .03, lean: .01 * Math.sin(t * TAU * 11), tilt: -.04, look: [.75 * side, .1], dx: tr, hL: [-72, 175 + 6 * Math.sin(t * TAU * 6)], hR: [-72, 170 + 6 * Math.sin(t * TAU * 6 + 1)], bL: 1, bR: 1 }; },
  },
  shock: { eyes: 'wide', mouth: 'O', brows: [26, .2], stache: -8, hatDy: -38, sweat: .5, body: () => ({ bob: -6, sq: -.07, tilt: 0, lean: -.03, hL: [70, -170], hR: [70, -170], bL: 1, bR: 1 }) },
  smug: { eyes: 'lid', mouth: 'smirk', browL: [2, -.25], browR: [18, .05], stache: 8, look: [.35, 0], body: t => { const s = Math.sin(t * TAU * .6); return { bob: -3 * Math.abs(s), tilt: .1 + .02 * s, lean: -.05, ...HIP }; } },
  wink: { eyes: ['closed', 'rest'], mouth: 'smile', browL: [-4, -.2], browR: [16, 0], stache: 10, blush: .5, body: t => ({ bob: -4 * Math.abs(Math.sin(t * TAU * 1.2)), tilt: -.1, lean: .02, hL: [10, 150], hR: [45, -265], bL: 1, bR: 1, hatTip: 1 }) },
};
export const EMOTIONS = Object.keys(EMO);
const NUM = ['bob', 'sq', 'lean', 'tilt', 'hatDy', 'dx', 'dy', 'stache', 'blush', 'sweat', 'hatTip', 'turn'];

// поза одной эмоции в момент t. over — правки поверх; over.talking = false глушит липфлап
export function feel(name, t, over = {}) {
  const e = EMO[name] || EMO.neutral, b = e.body ? e.body(t) : {};
  const p = { name, t, eyes: e.eyes, mouth: e.mouth, brows: e.brows || [0, 0], browL: e.browL, browR: e.browR,
    stache: e.stache || 0, blush: e.blush || 0, sweat: e.sweat || 0, hatDy: e.hatDy || 0, look: e.look || [0, 0],
    bob: 0, sq: 0, lean: 0, tilt: 0, dx: 0, hatTip: 0, ...b, ...over };
  if ((p.talking ?? !!e.talk) && e.talk) { const m = talkMouth(t, e.talk, name.length); p.mouth = m.mouth; p.open = m.open; p.syl = m.syl; }
  return p;
}
// смешать две позы: числа и массивы чисел интерполируются (k может вылетать за 1 — перелёт), остальное берётся из b
export function tweenPose(a, b, k) {
  const out = { ...b };
  for (const f of Object.keys(b)) {
    const va = a[f], vb = b[f];
    if (typeof vb === 'number' && typeof va === 'number') out[f] = lerp(va, vb, k);
    else if (Array.isArray(vb) && Array.isArray(va) && va.length === vb.length && vb.every(q => typeof q === 'number') && va.every(q => typeof q === 'number')) out[f] = vb.map((q, j) => lerp(va[j], q, k));
  }
  return out;
}
// сыгранная смена эмоций: keys = [[t, 'emotion', over?], ...]. Перед сменой — прищур и присед (упреждение 2–3 кадра),
// лицо меняется под прищуром, затем «тейк» (пружина) и осадка всех числовых полей с перелётом ~10 % за ~10 кадров.
export function act(t, keys, o = {}) {
  let i = 0; while (i + 1 < keys.length && t >= keys[i + 1][0]) i++;
  const [tc, name, over] = keys[i], age = t - tc;
  let cur = feel(name, t, over);
  const tn = i + 1 < keys.length ? keys[i + 1][0] : Infinity;
  let squint = 0;
  if (tn - t < .07) squint = 1 - (tn - t) / .07;
  if (i > 0 && age < .1) squint = Math.max(squint, 1 - age / .1);
  if (i > 0 && age < .45) {
    const prev = feel(keys[i - 1][1], t, keys[i - 1][2]), k = E.outBack(seg(age, 0, .35));
    for (const f of NUM) cur[f] = lerp(prev[f] || 0, cur[f] || 0, k);
    for (const f of ['hL', 'hR', 'look']) if (prev[f] && cur[f]) cur[f] = [0, 1].map(j => lerp(prev[f][j], cur[f][j], k));
  }
  const take = (t0, amt) => -.12 * amt * spring(t, t0, 7, 20);       // растяжение-сжатие после смены
  const pre = tn - t < .1 ? .06 * (1 - (tn - t) / .1) : 0;             // присед перед следующей сменой
  cur.sq += (i > 0 ? take(tc, o.take ?? 1) : 0) + pre;
  cur.squint = squint;
  cur.hatLag = i > 0 ? spring(t, tc + .03, 5, 16) : 0;                 // шляпа догоняет голову
  return cur;
}
// переходы между произвольными позами: keys = [[t, pose], ...]; новая поза набирается за dur с перелётом
export function poseSeq(t, keys, { dur = .27, ease = E.outBack } = {}) {
  let i = 0; while (i + 1 < keys.length && t >= keys[i + 1][0]) i++;
  if (i === 0) return keys[0][1];
  const prev = i > 1 ? poseSeq(keys[i][0], keys.slice(0, i), { dur, ease }) : keys[0][1];
  return tweenPose(prev, keys[i][1], ease(seg(t, keys[i][0], keys[i][0] + dur)));
}

export class Stickman {
  constructor(spec) { this.spec = spec; }
  draw(ctx, pose, opt) { drawStickman(ctx, this.spec, pose, opt); }
  // стандартная игра: act(t, keys) с подстановкой таймкодов речи
  act(t, keys, o) { return act(t, keys, o); }
}
