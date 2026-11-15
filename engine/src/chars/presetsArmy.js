// presetsArmy.js: состав V002 «Why Soldiers Never March Across Bridges» в формате presets.js (spec для Stickman).
//   captain()            синий мундир с белыми ремнями крест-накрест, высокий кивер с латунной бляхой и султаном; прищур и ухмылка
//   colonel()            синий мундир с золотыми эполетами, двууголка, большие усы
//   soldierBlue(v)       синий мундир, кивер; v = 0..5 — шесть разных лиц и пропорций (BLUE_VARIANTS)
//   general()            вражеский генерал: красный мундир, большая двууголка с плюмажем, медали, пышные усы
//   aide()               адъютант в красном, круглая шапочка
//   soldierRed()         красный мундир, чёрный кивер — лица нарочно одинаковые
//   drummer()            красный солдат с барабаном на ремне (рисуется позой drumming из actions.js)
//   kid()                ребёнок в кепке (качели)
// Все фигуры — в общих единицах: начало на земле между ступнями, y вверх отрицательный, 1 ед. = spec.unit м (~2 мм).
// Шляпы (shako, bicorne, pillbox, cap) и мундир (uniform) знают виды: 'front' | 'threeQuarter' | 'side' | 'back'.
// Вид сверху для толпы: spec.top(ctx, phase) — шляпа, плечи, кисти (crowd.js). 2D-предметы: drum2D, sticks2D, spyglass2D,
// musket2D, shoe2D, note2D.
import { Stickman, CLOTHES, HATS, ell, line } from './stickman.js';

const TAU = Math.PI * 2;
export const A = {
  ink: '#2C1826', head: '#FCFAFB', headSh: '#D9D0DD', hand: '#3B2333', mouth: '#2B1520',
  blue: '#3565C2', blueLt: '#5C8BE0', blueDk: '#1E3E86', navy: '#232F52',
  red: '#D8402F', redLt: '#F06A52', redDk: '#96231B',
  white: '#F7F3EA', whiteSh: '#CFC7B8', brass: '#F2C530', brassDk: '#A97D12', gold: '#F5CE4A',
  black: '#2A2228', blackLt: '#4A404A', blackDk: '#141014', leather: '#6B4A2A', leatherDk: '#4B321C', pack: '#8A6A44',
  hairBrown: '#3B2519', hairBlack: '#241B20', hairGinger: '#B4622A', hairGrey: '#8D8790', hairBlond: '#C9A24E',
};
const FACE_COLORS = { mouthIn: '#5B1E28', tongue: '#E8737F', teeth: '#FFFFFF' };
const lin = (x, x0, x1, stops) => { const g = x.createLinearGradient(x0, 0, x1, 0); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; };

// =====================================================================================================
// шляпы (координаты — в радиусах головы, центр головы = 0,0; VW = { view, facing } | null)
// =====================================================================================================
// кивер: высокий цилиндр, чуть шире кверху, козырёк, латунная бляха, помпон или султан (o.plume = { h, col, tip })
HATS.shako = (x, H, S, VW, p = {}) => {
  const r = H.ry, o = S.hat, ink = S.colors.ink, view = VW ? VW.view : 'front', fc = VW ? VW.facing : 1;
  x.save(); x.scale(r, r); const lw = S.lw / r;
  const y0 = -.7, yT = -(o.h ?? 1.58) - .1, wb = .86, wt = .95, off = view === 'threeQuarter' ? fc * .34 : view === 'side' ? fc * .7 : 0;
  // султан / помпон: сидит спереди у верхнего края; сзади виден только над тульёй
  const plume = () => {
    const px = view === 'back' ? 0 : off * .85, pl = o.plume, sway = (p.hatLag || 0) * .25 + (p.plumeSway || 0);
    x.save(); x.translate(px, yT + .03); x.rotate(sway);
    if (pl && pl.h) {
      x.beginPath(); x.moveTo(-.07, 0); x.bezierCurveTo(-.26, -pl.h * .45, -.2, -pl.h * .95, .02, -pl.h); x.bezierCurveTo(.24, -pl.h * .9, .22, -pl.h * .4, .07, 0); x.closePath();
      const g = x.createLinearGradient(0, -pl.h, 0, 0); g.addColorStop(0, pl.tip || pl.col); g.addColorStop(.34, pl.tip || pl.col); g.addColorStop(.36, pl.col); g.addColorStop(1, pl.col);
      x.fillStyle = g; x.fill(); x.lineWidth = lw; x.strokeStyle = ink; x.stroke();
      x.lineWidth = lw * .45; x.strokeStyle = 'rgba(44,24,38,.35)'; x.beginPath(); x.moveTo(0, -.06); x.quadraticCurveTo(-.03, -pl.h * .5, .02, -pl.h * .9); x.stroke();
    } else ell(x, 0, -.13, .17, .17, (pl && pl.col) || o.pom || '#fff', ink, lw);
    x.restore();
  };
  if (view === 'back') plume();
  // тулья
  x.beginPath(); x.moveTo(-wb, y0); x.lineTo(-wt, yT); x.quadraticCurveTo(0, yT - .09, wt, yT); x.lineTo(wb, y0); x.quadraticCurveTo(0, y0 + .1, -wb, y0); x.closePath();
  x.fillStyle = lin(x, -wt, wt, [[0, o.lt], [.5, o.col], [1, o.dk]]); x.fill();
  x.save(); x.clip();
  x.fillStyle = o.band || 'rgba(0,0,0,.35)'; x.beginPath(); x.moveTo(-1, y0 - .17); x.quadraticCurveTo(0, y0 - .07, 1, y0 - .17); x.lineTo(1, y0 + .2); x.lineTo(-1, y0 + .2); x.closePath(); x.fill();   // нижний околыш
  if (o.trim) { x.fillStyle = o.trim; x.beginPath(); x.moveTo(-1, yT - .1); x.lineTo(1, yT - .1); x.lineTo(1, yT + .1); x.quadraticCurveTo(0, yT + .03, -1, yT + .1); x.closePath(); x.fill(); }       // верхний кант
  x.fillStyle = 'rgba(255,255,255,.13)'; x.beginPath(); x.ellipse(-wt * .55, (y0 + yT) / 2, .09, (y0 - yT) * .36, 0, 0, TAU); x.fill();                                                       // блик
  if (view !== 'back' && o.plate !== false) {                                                    // бляха
    const prx = view === 'side' ? .09 : view === 'threeQuarter' ? .17 : .21, px = view === 'side' ? fc * .82 : off * 1.2, py = (y0 + yT) / 2 - .04;
    ell(x, px, py, prx, .25, o.plate || A.brass, ink, lw * .65); ell(x, px - prx * .25, py - .07, prx * .35, .09, 'rgba(255,255,255,.55)', null); ell(x, px, py + .03, prx * .32, .07, A.brassDk, null);
  }
  x.restore();
  x.beginPath(); x.moveTo(-wb, y0); x.lineTo(-wt, yT); x.quadraticCurveTo(0, yT - .09, wt, yT); x.lineTo(wb, y0); x.quadraticCurveTo(0, y0 + .1, -wb, y0); x.closePath(); x.lineWidth = lw; x.strokeStyle = ink; x.stroke();
  // козырёк
  if (view !== 'back') {
    x.beginPath();
    if (view === 'side') { x.moveTo(fc * .5, y0 + .0); x.quadraticCurveTo(fc * 1.05, y0 - .04, fc * 1.36, y0 + .17); x.quadraticCurveTo(fc * .95, y0 + .2, fc * .52, y0 + .1); }
    else { const c = off * .9, wl = .74 - Math.max(0, -off) * .5, wr = .74 - Math.max(0, off) * .5; x.moveTo(c - wl, y0 + .03); x.quadraticCurveTo(c, y0 + .14, c + wr, y0 + .03); x.quadraticCurveTo(c + wr * .75, y0 + .27, c, y0 + .28); x.quadraticCurveTo(c - wl * .75, y0 + .27, c - wl, y0 + .03); }
    x.closePath(); x.fillStyle = o.visor || '#1B1418'; x.fill(); x.lineWidth = lw; x.strokeStyle = ink; x.stroke();
    if (view !== 'side') { x.beginPath(); x.moveTo(off * .9 - .34, y0 + .18); x.quadraticCurveTo(off * .9, y0 + .23, off * .9 + .34, y0 + .18); x.lineWidth = lw * .45; x.strokeStyle = 'rgba(255,255,255,.4)'; x.stroke(); }
  }
  if (view !== 'back') plume();
  x.restore();
};
// двууголка поперёк головы: широкий «полумесяц», кокарда, золотой галун; o.plume — белая опушка по верхнему краю (генерал)
HATS.bicorne = (x, H, S, VW, p = {}) => {
  const r = H.ry, o = S.hat, ink = S.colors.ink, view = VW ? VW.view : 'front', fc = VW ? VW.facing : 1, k = (H.rx / H.ry) * (o.w ?? 1), hh = o.h ?? 1;
  x.save(); x.scale(r, r); const lw = S.lw / r;
  const side = view === 'side', kx = side ? .46 : view === 'threeQuarter' ? .84 : 1, sh = side ? fc * .12 : view === 'threeQuarter' ? fc * .12 : 0;
  x.translate(sh, 0);
  const tip = 1.74 * k * kx, top = -(.78 + 1.0 * hh), yl = -.44, path = () => {
    x.beginPath(); x.moveTo(-tip, yl); x.bezierCurveTo(-tip * .8, top * .7, -tip * .42, top, 0, top); x.bezierCurveTo(tip * .42, top, tip * .8, top * .7, tip, yl);
    x.quadraticCurveTo(0, -1.0, -tip, yl); x.closePath();
  };
  if (o.plume) {                                                                                 // опушка из перьев за шляпой
    const n = side ? 4 : 9, sway = (p.hatLag || 0) * .1;
    for (let i = 0; i < n; i++) {
      const u = n === 1 ? .5 : i / (n - 1), a = lerp(-1, 1, u), px = a * tip * .74, py = top * (1 - .34 * a * a) - .04 + sway * a;
      ell(x, px, py, .2 + .05 * Math.cos(a * 3), .2, o.plume, ink, lw * .8);
    }
  }
  path(); x.fillStyle = lin(x, -tip, tip, [[0, o.lt], [.45, o.col], [1, o.dk]]); x.fill();
  x.save(); x.clip();
  if (o.trim) { x.lineWidth = .075; x.strokeStyle = o.trim; x.beginPath(); x.moveTo(-tip, yl + .02); x.bezierCurveTo(-tip * .8, top * .7 + .07, -tip * .42, top + .075, 0, top + .075); x.bezierCurveTo(tip * .42, top + .075, tip * .8, top * .7 + .07, tip, yl + .02); x.stroke(); }
  x.fillStyle = 'rgba(255,255,255,.1)'; x.beginPath(); x.ellipse(-tip * .45, top * .62, tip * .2, .12, -.5, 0, TAU); x.fill();
  x.restore();
  path(); x.lineWidth = lw; x.strokeStyle = ink; x.stroke();
  if (view !== 'back') {                                                                         // кокарда с петлицей
    const cx = side ? fc * tip * .55 : view === 'threeQuarter' ? fc * .3 : 0, cy = top * .6 - .02, cr = side ? .1 : .19;
    line(x, [[cx, cy], [cx, top + .12]], lw * .9, o.trim || A.gold);
    ell(x, cx, cy, cr, .19, o.cockade || '#fff', ink, lw * .7); ell(x, cx, cy, cr * .55, .105, o.cockade2 || A.red, null); ell(x, cx, cy, cr * .22, .04, o.cockade3 || A.blue, null);
  }
  x.restore();
};
// круглая шапочка адъютанта: низкий цилиндр с галуном
HATS.pillbox = (x, H, S, VW) => {
  const r = H.ry, o = S.hat, ink = S.colors.ink, view = VW ? VW.view : 'front', fc = VW ? VW.facing : 1;
  x.save(); x.scale(r, r); const lw = S.lw / r, y0 = -.6, yT = -1.2, wb = .84, wt = .8;
  x.rotate(view === 'back' ? 0 : -.1 * (view === 'front' ? 1 : fc));
  const path = () => { x.beginPath(); x.moveTo(-wb, y0); x.lineTo(-wt, yT); x.quadraticCurveTo(0, yT - .12, wt, yT); x.lineTo(wb, y0); x.quadraticCurveTo(0, y0 + .1, -wb, y0); x.closePath(); };
  path(); x.fillStyle = lin(x, -wb, wb, [[0, o.lt], [.5, o.col], [1, o.dk]]); x.fill();
  x.save(); x.clip(); x.fillStyle = o.trim || A.gold; x.beginPath(); x.moveTo(-1, y0 - .26); x.quadraticCurveTo(0, y0 - .16, 1, y0 - .26); x.lineTo(1, y0 - .12); x.quadraticCurveTo(0, y0 - .02, -1, y0 - .12); x.closePath(); x.fill(); x.restore();
  path(); x.lineWidth = lw; x.strokeStyle = ink; x.stroke();
  ell(x, 0, yT - .1, .09, .07, o.trim || A.gold, ink, lw * .6);
  x.restore();
};
// кепка ребёнка: купол с пуговкой и короткий козырёк
HATS.cap = (x, H, S, VW) => {
  const r = H.ry, o = S.hat, ink = S.colors.ink, view = VW ? VW.view : 'front', fc = VW ? VW.facing : 1;
  x.save(); x.scale(r, r); const lw = S.lw / r, y0 = -.5;
  const off = view === 'threeQuarter' ? fc * .3 : view === 'side' ? fc * .6 : 0;
  if (view !== 'back') {                                                                         // козырёк
    x.beginPath();
    if (view === 'side') { x.moveTo(fc * .6, y0 - .08); x.quadraticCurveTo(fc * 1.2, y0 - .1, fc * 1.52, y0 + .1); x.quadraticCurveTo(fc * 1.0, y0 + .16, fc * .6, y0 + .08); }
    else { x.moveTo(off - .72, y0 - .02); x.quadraticCurveTo(off, y0 + .1, off + .72, y0 - .02); x.quadraticCurveTo(off + .6, y0 + .36, off, y0 + .38); x.quadraticCurveTo(off - .6, y0 + .36, off - .72, y0 - .02); }
    x.closePath(); x.fillStyle = o.dk; x.fill(); x.lineWidth = lw; x.strokeStyle = ink; x.stroke();
  }
  const path = () => { x.beginPath(); x.moveTo(-.96, y0); x.bezierCurveTo(-1.02, -1.02, -.6, -1.34, 0, -1.34); x.bezierCurveTo(.6, -1.34, 1.02, -1.02, .96, y0); x.quadraticCurveTo(0, y0 + .12, -.96, y0); x.closePath(); };
  path(); x.fillStyle = lin(x, -1, 1, [[0, o.lt], [.5, o.col], [1, o.dk]]); x.fill();
  x.save(); x.clip(); x.lineWidth = lw * .5; x.strokeStyle = 'rgba(44,24,38,.4)'; x.beginPath(); for (const q of [-.5, 0, .5]) { x.moveTo(off * .4, -1.34); x.quadraticCurveTo(q * 1.5 + off, -.95, q * 1.9 + off, y0 + .1); } x.stroke(); x.restore();
  path(); x.lineWidth = lw; x.strokeStyle = ink; x.stroke();
  ell(x, off * .4, -1.36, .09, .07, o.dk, ink, lw * .6);
  x.restore();
};
const lerp = (a, b, t) => a + (b - a) * t;

// =====================================================================================================
// мундир: слой внутри контура тела; знает вид. o = { belts, plate, buttons, pack, sash, trousers, shade }
// =====================================================================================================
export const uniform = (o = {}) => (x, B, S, VW) => {
  const view = VW ? VW.view : 'front', fc = VW ? VW.facing : 1, { cx, cy, rx, ry } = B, ink = S.colors.ink, back = view === 'back';
  const top = cy - ry, bot = cy + ry, hem = bot - (o.hem ?? 40), sx = view === 'side' ? fc * rx * .3 : view === 'threeQuarter' ? fc * rx * .18 : 0;
  // мягкая тень слева направо
  x.fillStyle = lin(x, cx - rx, cx + rx, [[0, 'rgba(255,255,255,.14)'], [.45, 'rgba(0,0,0,0)'], [1, o.shade || 'rgba(10,10,40,.34)']]); x.fillRect(cx - rx, top, rx * 2, ry * 2);
  // ранец на спине со скаткой
  if (back && o.pack) {
    const w = rx * 1.2, h = ry * .95, px = cx - w / 2, py = cy - ry * .56;
    x.beginPath(); x.roundRect(px, py, w, h, 14); x.fillStyle = o.pack; x.fill(); x.lineWidth = 5; x.strokeStyle = ink; x.stroke();
    x.beginPath(); x.roundRect(px - 8, py - 26, w + 16, 36, 18); x.fillStyle = '#B8B2A6'; x.fill(); x.stroke();
    line(x, [[px + w * .3, py - 26], [px + w * .3, py + 10]], 4, ink); line(x, [[px + w * .7, py - 26], [px + w * .7, py + 10]], 4, ink);
    line(x, [[px + 12, py + h * .55], [px + w - 12, py + h * .55]], 3.5, 'rgba(44,24,38,.5)');
  }
  // ремни крест-накрест
  if (o.belts) {
    const w = o.beltW ?? 27, band = (x0, y0, x1, y1) => {
      const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy), nx = -dy / l * w / 2, ny = dx / l * w / 2;
      x.beginPath(); x.moveTo(x0 + nx, y0 + ny); x.lineTo(x1 + nx, y1 + ny); x.lineTo(x1 - nx, y1 - ny); x.lineTo(x0 - nx, y0 - ny); x.closePath();
      x.fillStyle = o.belts; x.fill(); x.lineWidth = 4.2; x.strokeStyle = ink; x.stroke();
    };
    if (view === 'side') band(cx - fc * rx * .75, top + 4, cx + fc * rx * 1.0, hem - 6);
    else if (!(back && o.pack)) { band(cx - rx * .98 + sx, top + 2, cx + rx * .8 + sx, hem - 4); band(cx + rx * .98 + sx, top + 2, cx - rx * .8 + sx, hem - 4); }
    else { band(cx - rx * 1.0, top + 2, cx - rx * .42, cy - ry * .5); band(cx + rx * 1.0, top + 2, cx + rx * .42, cy - ry * .5); }
    if (!back && view !== 'side' && o.plate !== false) { const py = top + (hem - top) * .52; ell(x, cx + sx * 1.05, py, 17, 21, o.plate || A.brass, ink, 4); ell(x, cx + sx * 1.05 - 4, py - 6, 5, 7, 'rgba(255,255,255,.6)', null); }
  }
  // перевязь-лента через плечо (офицеры)
  if (o.sash && !back) {
    const w = 30; x.beginPath();
    if (view === 'side') { x.moveTo(cx - fc * rx * .7 - w / 2, top); x.lineTo(cx - fc * rx * .7 + w / 2, top); x.lineTo(cx + fc * rx + w / 2, hem); x.lineTo(cx + fc * rx - w / 2, hem); }
    else { x.moveTo(cx + rx * .95 + sx, top); x.lineTo(cx + rx * .95 + sx - w * 1.5, top); x.lineTo(cx - rx * .9 + sx - w * .2, hem); x.lineTo(cx - rx * .9 + sx + w * 1.2, hem); }
    x.closePath(); x.fillStyle = o.sash; x.fill(); x.lineWidth = 4; x.strokeStyle = ink; x.stroke();
  }
  // пуговицы
  if (o.buttons && !back) {
    const bx = view === 'side' ? cx + fc * rx * .62 : cx + sx * 1.6, ys = o.buttonsY || [-.52, -.2, .12, .44];
    for (const q of ys) { const by = cy + q * ry; ell(x, bx, by, 8.5, 8.5, o.buttons, ink, 3.2); ell(x, bx - 2.4, by - 2.8, 2.6, 2.6, 'rgba(255,255,255,.6)', null); }
    if (view === 'front' && o.buttons2) for (const q of ys) { const by = cy + q * ry; ell(x, cx - 34, by, 8.5, 8.5, o.buttons, ink, 3.2); ell(x, cx + 34, by, 8.5, 8.5, o.buttons, ink, 3.2); }
  }
  // низ: штаны и линия полы мундира
  x.fillStyle = o.trousers || A.white; x.fillRect(cx - rx, hem, rx * 2, bot - hem + 8);
  x.fillStyle = 'rgba(0,0,0,.14)'; x.fillRect(cx + rx * .25, hem, rx, bot - hem + 8);
  line(x, [[cx - rx, hem], [cx + rx, hem]], 5, ink);
  if (o.belt) { x.fillStyle = o.belt; x.fillRect(cx - rx, hem - 20, rx * 2, 18); line(x, [[cx - rx, hem - 20], [cx + rx, hem - 20]], 4, ink); if (!back && view !== 'side') { x.beginPath(); x.roundRect(cx + sx - 15, hem - 25, 30, 27, 5); x.fillStyle = A.brass; x.fill(); x.lineWidth = 3.5; x.strokeStyle = ink; x.stroke(); } }
};
// эполеты с бахромой поверх контура (офицеры)
export const epaulettes = ({ col = A.gold, dk = A.brassDk } = {}) => (x, B, S, VW) => {
  const view = VW ? VW.view : 'front', fc = VW ? VW.facing : 1, ink = S.colors.ink, y = B.cy - B.ry * .66;
  const one = (px, k) => {
    x.save(); x.translate(px, y); x.scale(k, 1);
    x.strokeStyle = dk; x.lineWidth = 5; x.lineCap = 'round'; x.beginPath(); for (let q = -3; q <= 3; q++) { x.moveTo(q * 9, 6); x.lineTo(q * 10.5, 30); } x.stroke();
    x.beginPath(); x.ellipse(0, 0, 40, 15, 0, 0, TAU); x.fillStyle = col; x.fill(); x.lineWidth = 4.2; x.strokeStyle = ink; x.stroke();
    ell(x, -10, -4, 12, 4, 'rgba(255,255,255,.5)', null); x.restore();
  };
  if (view === 'side') one(B.cx - fc * B.rx * .2, .62);
  else { const s = view === 'threeQuarter' ? fc * B.rx * .1 : 0; one(B.cx - B.rx * .8 + s, 1); one(B.cx + B.rx * .8 + s, 1); }
};
// медали на груди (генерал): ленточки и кружки
export const medals = ({ at = [[18, -52], [50, -46], [34, -6]], cols = ['#3F7FD6', '#F2C530', '#FFFFFF'] } = {}) => (x, B, S, VW) => {
  const view = VW ? VW.view : 'front', fc = VW ? VW.facing : 1, ink = S.colors.ink; if (view === 'back') return;
  const k = view === 'side' ? .45 : view === 'threeQuarter' ? .8 : 1, sx = view === 'side' ? fc * B.rx * .5 : view === 'threeQuarter' ? fc * B.rx * .22 : 0;
  at.forEach(([mx, my], i) => {
    const px = B.cx + mx * k * (view === 'side' ? fc : 1) + sx, py = B.cy + my;
    x.beginPath(); x.rect(px - 7 * k, py - 20, 14 * k, 18); x.fillStyle = cols[i % cols.length]; x.fill(); x.lineWidth = 3; x.strokeStyle = ink; x.stroke();
    ell(x, px, py + 8, 11 * Math.max(.6, k), 11, A.gold, ink, 3.2); ell(x, px - 3 * k, py + 5, 3.2, 3.2, 'rgba(255,255,255,.7)', null);
  });
};

// =====================================================================================================
// вид сверху для толпы: фигура лежит в плоскости земли, «вперёд» — вверх по рисунку. Единицы те же.
// =====================================================================================================
export function topView(x, S, phase = 0, { marching = true } = {}) {
  const T = S.topView || {}, ink = S.colors.ink, r = S.head.rx, sw = Math.sin(phase * TAU), lw = S.lw * 1.25;
  x.save(); x.lineCap = 'round'; x.lineJoin = 'round';
  if (marching) for (const sd of [-1, 1]) line(x, [[sd * 46, sd * sw * 20], [sd * 46, sd * sw * 20 - 78 * sd * sw - 40 * (sd * sw > 0 ? 1 : -.4)]], S.limbW * 1.5, ink);   // ступни
  ell(x, 0, 10, S.body.rx * 1.95, S.body.rx * .95, T.coat || S.body.fill, ink, lw);                                           // плечи
  if (T.belts) { line(x, [[-S.body.rx * 1.6, -30], [S.body.rx * 1.6, 50]], 30, T.belts); line(x, [[S.body.rx * 1.6, -30], [-S.body.rx * 1.6, 50]], 30, T.belts); }
  for (const sd of [-1, 1]) ell(x, sd * S.body.rx * 1.95, 6 - sd * sw * 60, S.hand.r * 1.15, S.hand.r * 1.15, S.hand.fill, null);
  ell(x, 0, 0, r, r, S.head.fill, ink, lw);                                                                                    // голова
  if (T.hat === 'bicorne') {
    x.beginPath(); x.moveTo(-r * 1.75, 10); x.quadraticCurveTo(0, -r * 1.05, r * 1.75, 10); x.quadraticCurveTo(0, r * .7, -r * 1.75, 10); x.closePath();
    x.fillStyle = T.hatCol; x.fill(); x.lineWidth = lw; x.strokeStyle = ink; x.stroke();
    if (T.trim) line(x, [[-r * 1.5, 6], [0, -r * .34], [r * 1.5, 6]], 9, T.trim);
    if (T.plume) for (let i = -3; i <= 3; i++) ell(x, i * r * .34, 14 + Math.abs(i) * 5, r * .2, r * .2, T.plume, ink, lw * .6);
  } else if (T.hat !== 'none') {
    x.beginPath(); x.moveTo(-r * .62, -r * .52); x.quadraticCurveTo(0, -r * 1.42, r * .62, -r * .52); x.closePath(); x.fillStyle = '#1B1418'; x.fill(); x.lineWidth = lw; x.strokeStyle = ink; x.stroke();   // козырёк
    ell(x, 0, 0, r * .93, r * .93, T.hatCol || '#222', ink, lw); ell(x, -r * .2, -r * .22, r * .5, r * .42, 'rgba(255,255,255,.12)', null);
    if (T.trim) { x.beginPath(); x.arc(0, 0, r * .78, 0, TAU); x.lineWidth = 9; x.strokeStyle = T.trim; x.stroke(); }
    ell(x, 0, -r * .5, r * .26, r * .26, T.plume || '#fff', ink, lw * .7);
  }
  if (T.drum) { ell(x, 0, -S.body.rx * 1.25, 100, 78, '#EFE3C8', ink, lw); x.beginPath(); x.arc(0, -S.body.rx * 1.25, 88, 0, TAU); x.lineWidth = 12; x.strokeStyle = T.drum; x.stroke(); }
  x.restore();
}

// =====================================================================================================
// общий каркас: размеры -> spec
// =====================================================================================================
// D = { r (rx головы), ry, headY, bx, by (центр тела), rx, ry2 (полувысота тела), shX, shY, hipX }
function build(name, D, o) {
  const r = D.r, hr = D.ry ?? D.r, hipY = D.by + D.ry2 - 10, ink = o.ink || A.ink;
  const leg = sd => [{ layer: 'back', hip: true, a: [sd * D.hipX, hipY], b: [sd * (D.hipX + 6), -4], L: -hipY * 1.012, bend: -sd, sag: .5, min: 1 }, { layer: 'back', pts: [[sd * (D.hipX + 6), -4], [sd * (D.hipX + 26), 6]], w: (o.limbW || 13) * 1.25 }];
  const spec = {
    name, unit: o.unit ?? .00202, u: o.u ?? 1, lw: o.lw ?? 9.5, limbW: o.limbW ?? 13,
    pins: { feet: [0, 0], chest: [0, D.by], head: [0, D.headY] },
    colors: { ink, hand: A.hand, mouth: A.mouth, hair: o.hair || A.hairBrown, stache: o.stache || o.hair || A.hairBrown, ...FACE_COLORS },
    head: { x: 0, y: D.headY, rx: r, ry: hr, pivot: hr * .8, fill: A.head, shade: A.headSh, grad: [-r * .15, -hr * .25, r * .55, r * 1.02, .8], back: o.back, ...(o.head || {}) },
    body: { x: 0, y: D.by, rx: D.rx, ry: D.ry2, n: o.n ?? 3.0, topK: o.topK ?? .82, views: true, fillLR: o.coat, inside: o.inside, outside: o.outside || [] },
    hat: o.hat,
    face: o.face,
    rig: { hipY, hipX: D.hipX, groundY: 0, legL: -hipY * 1.012, sh: [[-D.shX, D.shY], [D.shX, D.shY]], armL: o.armL ?? 250, sag: .5, armLayer: 'front', footL: o.footL ?? 30 },
    hand: { r: o.hand ?? 24, fill: A.hand },
    stance: 'stand',
    stances: { stand: { arms: 'auto', limbs: [...leg(-1), ...leg(1)] } },
    topView: o.topView,
    ...(o.over || {}),
  };
  const ch = new Stickman(spec);
  ch.top = (x, phase, opt) => topView(x, spec, phase, opt);
  return ch;
}
const SOLDIER = { r: 140, headY: -772, by: -546, rx: 104, ry2: 130, shX: 92, shY: -622, hipX: 40 };
// лицо «как у шахтёра»: маленькие глаза высоко, маленький рот под ними
const faceSmall = (r, o = {}) => ({
  mr: r, fs: 1.05, restEye: o.eye || 'dot', restMouth: o.mouth || 'flatS', brows: !!o.brows, moustache: !!o.moustache, glasses: o.glasses, stacheK: o.stacheK, browCol: o.browCol,
  eyes: [-1, 1].map(sd => ({ x: sd * r * (o.gap ?? .3) - r * .02, y: -r * (o.ey ?? .16), rx: r * (o.erx ?? .064), ry: r * (o.ery ?? .094), lw: r * .055, tilt: 0 })),
  mouth: [-.02 * r, (o.my ?? .2) * r], mouthBig: [-3, r * (o.mby ?? .36)], ms: o.ms ?? .98,
});

// ---------- капитан (герой): синий мундир, белые ремни, высокий кивер с бляхой и белым султаном ----------
export function captain(over = {}) {
  const D = SOLDIER;
  return build('captain', D, {
    coat: [A.blueLt, A.blue, A.blueDk], hair: A.hairBrown,
    inside: [uniform({ belts: A.white, plate: A.brass, trousers: A.white, pack: A.pack, buttons: false })],
    outside: [epaulettes({ col: A.white, dk: '#B9B2A2' })],
    hat: { type: 'shako', col: A.navy, lt: '#3A4A78', dk: '#141B33', band: '#11162B', trim: A.gold, plate: A.brass, h: 1.86, plume: { h: .78, col: '#FFFFFF', tip: A.red } },
    face: faceSmall(D.r, { eye: 'lid', mouth: 'smirkS', gap: .3 }),
    topView: { coat: A.blue, belts: A.white, hatCol: A.navy, trim: A.gold, plume: '#fff' },
    over,
  });
}
// ---------- полковник: синий мундир, золотые эполеты, двууголка, большие усы; багровеет от ярости ----------
export function colonel(over = {}) {
  const D = { r: 148, ry: 132, headY: -800, by: -556, rx: 120, ry2: 156, shX: 104, shY: -650, hipX: 44 };
  return build('colonel', D, {
    coat: [A.blueLt, A.blue, A.blueDk], hair: '#5A3A22', stache: '#4A2E1A', n: 3.2, topK: .88, armL: 255, hand: 26,
    inside: [uniform({ sash: A.gold, buttons: A.brass, buttons2: true, trousers: A.white, belt: A.white, buttonsY: [-.5, -.22, .06, .34] })],
    outside: [epaulettes({})],
    hat: { type: 'bicorne', col: A.navy, lt: '#3A4A78', dk: '#141B33', trim: A.gold, cockade: '#fff', cockade2: A.red, cockade3: A.blue, h: .92 },
    face: { mr: 132, fs: 1.02, restEye: 'dot', restMouth: 'frown', brows: true, moustache: true, stacheK: 1.12,
      eyes: [{ x: -50, y: -24, rx: 9.5, ry: 12.5, lw: 6.5, tilt: 0 }, { x: 50, y: -24, rx: 9.5, ry: 12.5, lw: 6.5, tilt: 0 }], mouth: [0, 50], mouthBig: [0, 56], ms: 1 },
    topView: { coat: A.blue, hat: 'bicorne', hatCol: A.navy, trim: A.gold },
    over,
  });
}
// ---------- синие солдаты: шесть лиц и пропорций, чтобы толпа не выглядела клонами ----------
export const BLUE_VARIANTS = [
  { },                                                                                                        // 0 обычный
  { dims: { r: 128, headY: -800, by: -566, rx: 92, ry2: 142, shX: 82, shY: -648 }, unit: .00212, face: { eye: 'lid', mouth: 'flatS', brows: true }, hair: A.hairBlack },   // 1 длинный и худой
  { dims: { r: 152, headY: -742, by: -516, rx: 124, ry2: 122, shX: 108, shY: -590 }, unit: .00188, face: { mouth: 'smileS', gap: .34 }, hair: A.hairBlond },               // 2 низкий и круглый
  { face: { glasses: { r: 27, lw: 5, dy: 1 }, mouth: 'oSmall', erx: .05, ery: .07 }, hair: A.hairGinger },                                                                // 3 в очках
  { dims: { r: 144, headY: -776, by: -548, rx: 110, ry2: 132, shX: 96, shY: -624 }, face: { brows: true, moustache: true, stacheK: .62, mouth: 'flatS', mby: .33, ms: .8 }, hair: A.hairGrey },   // 4 усатый ветеран
  { dims: { r: 134, headY: -760, by: -540, rx: 98, ry2: 126, shX: 86, shY: -612 }, unit: .00194, face: { eye: 'wide', erx: .05, ery: .066, mouth: 'o', gap: .32 }, hair: A.hairBrown },           // 5 лопоухий новобранец
];
export function soldierBlue(v = 0, over = {}) {
  const V = BLUE_VARIANTS[((v % BLUE_VARIANTS.length) + BLUE_VARIANTS.length) % BLUE_VARIANTS.length], D = { ...SOLDIER, ...(V.dims || {}) };
  const ch = build('soldierBlue', D, {
    coat: [A.blueLt, A.blue, A.blueDk], hair: V.hair || A.hairBrown, unit: V.unit,
    inside: [uniform({ belts: A.white, plate: A.brass, trousers: A.white, pack: A.pack })],
    hat: { type: 'shako', col: A.navy, lt: '#3A4A78', dk: '#141B33', band: '#11162B', trim: A.white, plate: A.brass, plume: { col: '#FFFFFF' } },
    face: faceSmall(D.r, { mouth: 'o', ...(V.face || {}) }),
    topView: { coat: A.blue, belts: A.white, hatCol: A.navy, trim: A.white, plume: '#fff' },
    over,
  });
  ch.spec.variant = v; return ch;
}
// ---------- вражеский генерал: красный мундир, большая двууголка с белой опушкой, медали, пышные усы ----------
export function general(over = {}) {
  const D = { r: 152, ry: 138, headY: -818, by: -562, rx: 128, ry2: 164, shX: 110, shY: -662, hipX: 46 };
  return build('general', D, {
    coat: [A.redLt, A.red, A.redDk], hair: '#C9C2B8', stache: '#D9D2C6', n: 3.3, topK: .9, armL: 262, hand: 27,
    inside: [uniform({ sash: A.white, buttons: A.gold, trousers: A.white, belt: A.gold, shade: 'rgba(60,0,0,.36)', buttonsY: [-.5, -.22, .06, .34] })],
    outside: [epaulettes({}), medals({})],
    hat: { type: 'bicorne', col: A.black, lt: A.blackLt, dk: A.blackDk, trim: A.gold, plume: '#FFFFFF', cockade: A.gold, cockade2: A.red, cockade3: '#fff', w: 1.08, h: 1.08 },
    face: { mr: 138, fs: 1.05, restEye: 'dot', restMouth: 'smirk', brows: true, moustache: true, stacheK: 1.42, browCol: '#B9B0A4',
      eyes: [{ x: -52, y: -26, rx: 10, ry: 13, lw: 6.5, tilt: 0 }, { x: 52, y: -26, rx: 10, ry: 13, lw: 6.5, tilt: 0 }], mouth: [0, 54], mouthBig: [0, 62], ms: 1.02 },
    topView: { coat: A.red, hat: 'bicorne', hatCol: A.black, trim: A.gold, plume: '#fff' },
    over,
  });
}
// ---------- адъютант: тонкий, в красном, круглая шапочка набекрень ----------
export function aide(over = {}) {
  const D = { r: 126, headY: -790, by: -566, rx: 86, ry2: 138, shX: 78, shY: -650, hipX: 34 };
  return build('aide', D, {
    coat: [A.redLt, A.red, A.redDk], hair: A.hairBlack, armL: 240, hand: 22,
    inside: [uniform({ buttons: A.gold, trousers: A.navy, belt: A.white, shade: 'rgba(60,0,0,.36)' })],
    hat: { type: 'pillbox', col: A.red, lt: A.redLt, dk: A.redDk, trim: A.gold },
    face: faceSmall(126, { eye: 'dot', mouth: 'smileS', brows: true, gap: .3 }),
    topView: { coat: A.red, hatCol: A.red, trim: A.gold, plume: A.gold },
    over,
  });
}
// ---------- красные солдаты: одно лицо на всех, каменное ----------
const redCoat = () => uniform({ belts: A.white, plate: A.brass, trousers: '#3A3F52', pack: '#5E5148', shade: 'rgba(60,0,0,.36)' });
const redHat = () => ({ type: 'shako', col: A.black, lt: A.blackLt, dk: A.blackDk, band: '#0E0A0C', trim: A.gold, plate: A.brass, plume: { col: A.red } });
export function soldierRed(over = {}) {
  const D = SOLDIER;
  return build('soldierRed', D, {
    coat: [A.redLt, A.red, A.redDk], hair: A.hairBlack,
    inside: [redCoat()], hat: redHat(),
    face: faceSmall(D.r, { eye: 'dot', mouth: 'flatS', gap: .3 }),
    topView: { coat: A.red, belts: A.white, hatCol: A.black, trim: A.gold, plume: A.red },
    over,
  });
}
// ---------- барабанщик: красный солдат; барабан и палочки добавляет поза drumming (actions.js) ----------
export function drummer(over = {}) {
  const D = SOLDIER;
  return build('drummer', D, {
    coat: [A.redLt, A.red, A.redDk], hair: A.hairBlack,
    inside: [uniform({ belts: false, trousers: '#3A3F52', pack: false, shade: 'rgba(60,0,0,.36)', buttons: A.gold }),
      (x, B, S, VW) => { const view = VW ? VW.view : 'front', fc = VW ? VW.facing : 1, w = 30;                 // ремень барабана через плечо
        const x0 = view === 'side' ? B.cx - fc * B.rx * .5 : B.cx + B.rx * .9, x1 = view === 'side' ? B.cx + fc * B.rx : B.cx - B.rx * .9;
        x.beginPath(); x.moveTo(x0 - w / 2, B.cy - B.ry); x.lineTo(x0 + w / 2, B.cy - B.ry); x.lineTo(x1 + w / 2, B.cy + B.ry - 40); x.lineTo(x1 - w / 2, B.cy + B.ry - 40); x.closePath(); x.fillStyle = A.white; x.fill(); x.lineWidth = 4.2; x.strokeStyle = S.colors.ink; x.stroke(); }],
    outside: [epaulettes({ col: A.white, dk: '#B9B2A2' })],
    hat: { ...redHat(), plume: { h: .5, col: '#fff', tip: A.red } },
    face: faceSmall(D.r, { eye: 'dot', mouth: 'flatS', gap: .3 }),
    topView: { coat: A.red, hatCol: A.black, trim: A.gold, plume: '#fff', drum: A.red },
    over,
  });
}
// ---------- ребёнок на качелях: кепка, полосатая кофта, шорты; маленький (около 0.6 роста взрослого) ----------
export function kid(over = {}) {
  const D = { r: 118, headY: -468, by: -298, rx: 80, ry2: 88, shX: 70, shY: -350, hipX: 30 };
  const stripes = (x, B) => { x.fillStyle = '#FFFFFF'; for (let k = 0; k < 6; k++) x.fillRect(B.cx - B.rx, B.cy - B.ry + 14 + k * 30, B.rx * 2, 13); };
  const ch = build('kid', D, {
    coat: ['#F6B33A', '#EE9A1E', '#C97A10'], hair: A.hairGinger, armL: 170, hand: 19, lw: 8.5, limbW: 11.5, footL: 24,
    inside: [stripes, uniform({ trousers: '#3E6FB8', hem: 34, shade: 'rgba(90,40,0,.3)' })],
    hat: { type: 'cap', col: '#D8402F', lt: '#F06A52', dk: '#96231B' },
    face: { ...faceSmall(118, { eye: 'dot', mouth: 'smileS', gap: .32, erx: .07, ery: .1 }), mouthBig: [-2, 38], ms: .9 },
    topView: { coat: '#EE9A1E', hatCol: '#D8402F', plume: '#96231B' },
    over,
  });
  return ch;
}

export const ARMY = { captain, colonel, soldierBlue, general, aide, soldierRed, drummer, kid };

// =====================================================================================================
// 2D-предметы (в координатах фигуры)
// =====================================================================================================
// барабан с верёвочной шнуровкой. (x, y) — центр, s — масштаб (1 = ширина 210 ед.), rot; tilt 0..1 — насколько видна кожа
export function drum2D(x, { x: dx = 0, y: dy = 0, s = 1, rot = 0, tilt = .5, col = '#2F5FB8', hoop = '#D8402F', ink = A.ink } = {}) {
  const w = 105, h = 62, ry = 14 + 34 * tilt;
  x.save(); x.translate(dx, dy); x.rotate(rot); x.scale(s, s); x.lineJoin = 'round'; x.lineCap = 'round';
  const wall = () => { x.beginPath(); x.moveTo(-w, -h); x.lineTo(-w, h); x.ellipse(0, h, w, ry, 0, Math.PI, 0, true); x.lineTo(w, -h); x.ellipse(0, -h, w, ry, 0, 0, Math.PI, false); x.closePath(); };
  wall(); x.fillStyle = lin(x, -w, w, [[0, '#5C8BE0'], [.45, col], [1, '#1E3E86']]); x.fill();
  x.save(); x.clip(); x.lineWidth = 5; x.strokeStyle = '#F7F3EA'; x.beginPath();                               // шнуровка зигзагом
  for (let k = 0; k < 7; k++) { const a0 = Math.PI * (k / 7), a1 = Math.PI * ((k + .5) / 7), a2 = Math.PI * ((k + 1) / 7); x.moveTo(-Math.cos(a0) * w, -h + Math.sin(a0) * ry); x.lineTo(-Math.cos(a1) * w, h + Math.sin(a1) * ry); x.lineTo(-Math.cos(a2) * w, -h + Math.sin(a2) * ry); }
  x.stroke(); x.restore();
  wall(); x.lineWidth = 8; x.strokeStyle = ink; x.stroke();
  for (const yy of [-h, h]) { x.beginPath(); x.ellipse(0, yy, w, ry, 0, 0, Math.PI); x.lineWidth = 15; x.strokeStyle = ink; x.stroke(); x.lineWidth = 8; x.strokeStyle = hoop; x.stroke(); }
  x.beginPath(); x.ellipse(0, -h, w, ry, 0, 0, TAU); x.fillStyle = '#F3E9D2'; x.fill(); x.lineWidth = 8; x.strokeStyle = ink; x.stroke();
  x.beginPath(); x.ellipse(0, -h, w - 9, Math.max(1, ry - 7), 0, 0, TAU); x.lineWidth = 7; x.strokeStyle = hoop; x.stroke();
  ell(x, -w * .3, -h - ry * .2, w * .34, ry * .3, 'rgba(255,255,255,.55)', null);
  x.restore();
}
// барабанная палочка от кисти a к точке b
export function stick2D(x, a, b, ink = A.ink) { line(x, [a, b], 13, ink); line(x, [a, b], 7, '#D9B982'); ell(x, b[0], b[1], 8, 8, '#D9B982', ink, 3.5); }
// подзорная труба: от глаза a вдоль направления ang, три колена. len — полная длина
export function spyglass2D(x, { x: sx, y: sy, ang = 0, len = 300, k = 1, ink = A.ink } = {}) {
  x.save(); x.translate(sx, sy); x.rotate(ang); x.lineJoin = 'round';
  const seg = [[0, .36, 22], [.36, .7, 28], [.7, 1, 35]];
  for (const [a, b, w] of seg) {
    const x0 = a * len * k, x1 = b * len * k; x.beginPath(); x.rect(x0, -w, x1 - x0, w * 2);
    const g = x.createLinearGradient(0, -w, 0, w); g.addColorStop(0, '#FFE27A'); g.addColorStop(.4, A.brass); g.addColorStop(1, A.brassDk); x.fillStyle = g; x.fill(); x.lineWidth = 7; x.strokeStyle = ink; x.stroke();
  }
  for (const b of [.36, .7, 1]) { x.beginPath(); x.rect(b * len * k - 9, -(b === 1 ? 40 : b > .5 ? 33 : 27), 18, (b === 1 ? 40 : b > .5 ? 33 : 27) * 2); x.fillStyle = '#6B4A2A'; x.fill(); x.lineWidth = 6; x.strokeStyle = ink; x.stroke(); }
  x.restore();
}
// ружьё со штыком на плече: a — приклад в кисти, ang — направление ствола (рад, -PI/2 = вверх)
export function musket2D(x, a, ang = -Math.PI / 2, len = 640, ink = A.ink) {
  x.save(); x.translate(a[0], a[1]); x.rotate(ang); x.lineCap = 'round'; x.lineJoin = 'round';
  x.beginPath(); x.moveTo(-44, -14); x.lineTo(-52, 22); x.lineTo(40, 15); x.lineTo(len * .45, 9); x.lineTo(len * .45, -9); x.lineTo(30, -12); x.closePath(); x.fillStyle = '#8A5A32'; x.fill(); x.lineWidth = 6; x.strokeStyle = ink; x.stroke();
  line(x, [[len * .2, 0], [len * .8, 0]], 15, ink); line(x, [[len * .2, 0], [len * .8, 0]], 8, '#8E8E9A');
  line(x, [[len * .8, -2], [len, -5]], 9, ink); line(x, [[len * .8, -2], [len, -5]], 4, '#E9EDF5');
  x.restore();
}
// ботинок ребёнка (слетает с ноги)
export function shoe2D(x, px, py, s = 1, rot = 0, ink = A.ink) {
  x.save(); x.translate(px, py); x.rotate(rot); x.scale(s, s);
  x.beginPath(); x.moveTo(-20, -16); x.lineTo(-20, 12); x.lineTo(34, 12); x.quadraticCurveTo(38, -4, 14, -6); x.lineTo(4, -16); x.closePath(); x.fillStyle = '#7A4A2A'; x.fill(); x.lineWidth = 6; x.lineJoin = 'round'; x.strokeStyle = ink; x.stroke();
  line(x, [[-20, 13], [34, 13]], 6, '#EFE6D6'); x.restore();
}
// нота свиста
export function note2D(x, px, py, s = 1, ink = A.ink) {
  x.save(); x.translate(px, py); x.scale(s, s); ell(x, 0, 0, 13, 10, ink, null, 0, -.4); line(x, [[11, -3], [11, -52]], 6, ink); line(x, [[11, -52], [28, -44], [30, -30]], 6, ink); x.restore();
}
