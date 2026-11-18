// staging/desk.js — общая «кабинетная» локация: кресло за столом, стол на переднем плане; плюс стоящие в комнате и обратная точка.
// Один модуль на все кабинеты (Вашингтон L04, Nvidia L06, Пекин L05; у рабочих — Megaspeed L09, закрытая комната L18):
// конфиг локации описывает плейт и точки, deskLocation(cfg) отдаёт рисовальщики. Правила посадки — как в ресторане (QA.md):
//   сидящий — по центру кресла плейта, торс выше столешницы виден (~70 % корпуса), всё ниже задней кромки стола закрыто маской стола;
//   кисти лежат НА столешнице (ближе к передней кромке), с тенью; руки — передний слой поверх маски; ноги скрыты столом;
//   стоящий — ступни на полу, контактная тень, ноги не дёргаются (plantLegs).
// cfg = {
//   plate, rev?                     — url плейтов (общий и обратная точка)
//   sit: { seat:[x,y], fs, light:[dx,dy], deskBack:y, hands:{L:[x,y],R:[x,y]}, mask:[[x,y]…] }   — кресло и стол общего плана
//   stand?: { name: { feet:[x,y], fs, light } }                                                    — точки стоящих на общем плане
//   revStand?: { name: { feet:[x,y], fs, light } }, revMask?: [[x,y]…]                             — обратная точка: стоящие и передний план (стол со спинкой кресла)
//   views: { name: {cx, cy, k, plate?: 'rev'|'wide', blur?: px} }
// }
import { act, blinkAt, shoulder, restHand, arcHand, gesture, ell, clamp, lerp, E, noirShade } from 'engine';
import { W, H, toS, plate, img, masked, blurred, polyMask, lazy, fig, inFig, toPlate, contact, cover } from './common.js';
import { mouth } from '../words.js';

// точка «до корпуса» -> фигура после наклона корпуса (кисть с предметом)
export function bodyPt(S, p, q) { let [x, y] = q; const hy = S.rig.hipY, lean = p.lean || 0, hipDy = (p.bob || 0) + (p.sq || 0) * 60 * (S.u ?? 1); y -= hy; x *= 1 + (p.sq || 0) * .6; y *= 1 - (p.sq || 0); const c = Math.cos(lean), s = Math.sin(lean); return [x * c - y * s, x * s + y * c + hy + hipDy]; }
// поза: эмоции по ключам, рот только на словах sp, моргание, лёгкое дыхание
function pose(C, t, T, o, seed) {
  const p = act(t, o.keys || [[0, 'neutral']]); if (p.mouth === 'teeth' || p.mouth === 'teethOpen') p.mouth = 'open';
  Object.assign(p, { blink: blinkAt(t + seed, seed), view: o.view || 'front', facing: o.facing ?? 1, look: o.look || [0, 0] });
  p.bob = (p.bob || 0) * .3; p.sq = (p.sq || 0) * .3; p.lean = (p.lean || 0) * .4 + (o.lean || 0); p.tilt = (p.tilt || 0) * .6 + (o.tilt || 0);
  p.mouth = o.laugh ? p.mouth : mouth(o.sp, T, o.rest || p.mouth, seed); if (o.mouthOverride) p.mouth = o.mouthOverride;
  return p;
}
// мобильный телефон у уха (в координатах фигуры): чёрная пластина вдоль щеки, экран слабо светится; кисть держит его снизу
export function handsetAt(x, S, side, ink = '#141014') {
  const h = S.head, cx = side * (h.rx * .98), cy = h.y + 30;
  x.save(); x.translate(cx, cy); x.rotate(side * .18); x.lineJoin = 'round';
  x.beginPath(); x.roundRect(-30, -78, 60, 156, 14); x.fillStyle = '#16161c'; x.fill(); x.lineWidth = 8; x.strokeStyle = ink; x.stroke();
  x.beginPath(); x.roundRect(-20, -66, 40, 132, 8); x.fillStyle = 'rgba(120,170,230,.28)'; x.fill();
  x.beginPath(); x.moveTo(-side * 18, -60); x.lineTo(-side * 18, 40); x.lineWidth = 4; x.strokeStyle = 'rgba(255,255,255,.25)'; x.stroke();
  x.restore();
  return [cx, cy + 70];
}
export function deskLocation(cfg) {
  const I = { plate: img(cfg.plate), ...(cfg.rev ? { rev: img(cfg.rev) } : {}) };
  const A = lazy(Object.values(I), () => {
    const a = { plate: I.plate, plateB3: blurred(I.plate, 3), plateB6: blurred(I.plate, 6), desk: masked(I.plate, polyMask([cfg.sit.mask])) };
    a.deskB3 = blurred(a.desk, 3, false); a.deskB6 = blurred(a.desk, 6, false);
    if (I.rev) { a.rev = I.rev; a.revB3 = blurred(I.rev, 3); if (cfg.revMask) { a.revFG = masked(I.rev, polyMask([cfg.revMask])); a.revFGB3 = blurred(a.revFG, 3, false); } }
    return a;
  });
  const blurKey = (base, b) => (b >= 5 ? base + 'B6' : b >= 2 ? base + 'B3' : base);
  // кадр по имени вида + движение камеры (z, dx, dy — как camView), без выхода за плейт
  const view = (name, cam = { z: 1, dx: 0, dy: 0 }, drift = .25) => { const b = cfg.views[name]; const k = b.k * (1 + (cam.z - 1) * .55), lim = 70 / k;
    return cover({ cx: b.cx + clamp(cam.dx * W * drift, -lim, lim), cy: b.cy + clamp(cam.dy * H * drift, -lim, lim), k }); };

  // сидящий за столом. o = { C, sp, keys, look, lean, tilt, view, facing, seed,
  //   L/R: { k 0..1, to:[x,y] плейта } — кисть уходит со столешницы к точке (жест, предмет); phone: 'L'|'R' + phoneK — трубка у уха;
  //   heldL/heldR: (ctx, P экран, s) — предмет в кисти; blur — размытие плейта (крупные), solo }
  function seated(ctx, v, t, T, o = {}) {
    const a = A(); if (!a) return {}; const c = cfg.sit, C = o.C, S = C.spec, blur = o.blur || 0;
    if (o.shade !== false && c.light) S.shade = noirShade(c.light);                    // свет точки (лампа на столе) — на героя
    if (!o.solo && !o.noPlate) plate(ctx, a[blurKey('plate', blur)], v);
    const p = pose(C, t, T, o, o.seed ?? 3), toFig = P => [(P[0] - c.seat[0]) / c.fs + S.pins.seat[0], (P[1] - c.seat[1]) / c.fs + S.pins.seat[1]];
    const handFor = (side, key) => { const sh = shoulder(S, side), desk = toFig(c.hands[key]), m = o[key] || {}, ph = o.phone === key ? clamp(o.phoneK ?? 1) : 0;
      if (ph > .001) return { to: arcHand(sh, desk, [side * S.head.rx * .98, S.head.y + 100], ph), ph };
      return { to: m.k > .001 ? arcHand(sh, desk, toFig(m.to), m.k) : desk, ph: 0, onDesk: !(m.k > .3) }; };
    const hl = handFor(-1, 'L'), hr = handFor(1, 'R');
    p.arms = [{ to: hl.to, w: 11 }, { to: hr.to, w: 11 }];
    fig(ctx, C, p, v, c.seat, c.fs, 'seat', { only: 'base' });
    if (!o.solo) plate(ctx, a[blurKey('desk', blur)], v);
    if (o.deskTop && !o.solo) o.deskTop(ctx, v);                                  // предметы на столешнице (лист, телефон) — под руками
    // тени кистей на столешнице (только лежащих)
    if (!o.solo) for (const [hh, key] of [[hl, 'L'], [hr, 'R']]) if (hh.onDesk) { const P = toS(v, c.hands[key]), s = c.fs * v.k;
      ctx.save(); ctx.filter = `blur(${(5 * s).toFixed(1)}px)`; ctx.fillStyle = 'rgba(20,8,6,.45)'; ctx.beginPath(); ctx.ellipse(P[0] + 6 * s, P[1] + 8 * s, 24 * s, 10 * s, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    fig(ctx, C, p, v, c.seat, c.fs, 'seat', { only: 'front' });
    // трубка у уха: поверх головы, в преобразовании фигуры
    const sP = (q) => toS(v, toPlate(S, c.seat, c.fs, bodyPt(S, p, q)));
    if (o.phone && (o.phoneK ?? 1) > .55) inFig(ctx, C, v, c.seat, c.fs, 'seat', x => {          // трубка у уха — в преобразовании фигуры, с наклоном корпуса
      x.translate(0, S.rig.hipY); x.rotate(p.lean || 0); x.translate(0, -S.rig.hipY); handsetAt(x, S, o.phone === 'L' ? -1 : 1, S.colors.ink); });
    const out = { p, hl: sP(hl.to), hr: sP(hr.to), s: c.fs * v.k };
    if (o.heldL) o.heldL(ctx, out.hl, out.s); if (o.heldR) o.heldR(ctx, out.hr, out.s);
    return out;
  }
  // стоящий: o = { C, at: имя точки в cfg.stand | cfg.revStand (o.rev), sp, keys, look, view, facing, L/R: {k, to}, heldL/heldR, dx (сдвиг ступней, пикс. плейта) }
  function standing(ctx, v, t, T, o = {}) {
    const pt = (o.rev ? cfg.revStand : cfg.stand)[o.at], C = o.C, S = C.spec;
    if (o.shade !== false && pt.light) S.shade = noirShade(pt.light);
    const feet = [pt.feet[0] + (o.dx || 0), pt.feet[1] + (o.dy || 0)];
    const p = pose(C, t, T, o, o.seed ?? 5), toFig = P => [(P[0] - feet[0]) / pt.fs, (P[1] - feet[1]) / pt.fs];
    const arm = (side, key) => { const m = o[key] || {}; return m.k > .001 ? arcHand(shoulder(S, side), restHand(S, side), toFig(m.to), m.k) : restHand(S, side); };
    p.arms = [{ to: arm(-1, 'L'), w: 11 }, { to: arm(1, 'R'), w: 11 }];
    if (!o.solo) { const F = toS(v, feet), s = pt.fs * v.k; contact(ctx, F[0], F[1] + 3 * s, 140 * s, 20 * s, .55, (pt.light || [0])[0] < 0 ? .3 : -.3); }
    fig(ctx, C, p, v, feet, pt.fs, 'feet');
    const sP = q => toS(v, [feet[0] + bodyPt(S, p, q)[0] * pt.fs, feet[1] + bodyPt(S, p, q)[1] * pt.fs]);
    const out = { p, hl: sP(p.arms[0].to), hr: sP(p.arms[1].to), s: pt.fs * v.k };
    if (o.heldL) o.heldL(ctx, out.hl, out.s); if (o.heldR) o.heldR(ctx, out.hr, out.s);
    return out;
  }
  // плейт обратной точки (и её передний план после героев: revFront)
  const revPlate = (ctx, v, blur = 0, solo) => { const a = A(); if (a && !solo) plate(ctx, a[blurKey('rev', blur)] || a.rev, v); };
  const revFront = (ctx, v, blur = 0, solo) => { const a = A(); if (a && a.revFG && !solo) plate(ctx, blur >= 2 ? a.revFGB3 : a.revFG, v); };
  const widePlate = (ctx, v, blur = 0, solo) => { const a = A(); if (a && !solo) plate(ctx, a[blurKey('plate', blur)], v); };
  const deskFront = (ctx, v, blur = 0, solo) => { const a = A(); if (a && !solo) plate(ctx, a[blurKey('desk', blur)], v); };
  return { cfg, A, view, seated, standing, revPlate, revFront, widePlate, deskFront };
}

// силуэт без лица (пекинские офицеры, «тень у окна»): fn(ctx) рисует героя; поверх — сплошная заливка цвета col и контровой край света rim
let sb = null, sr = null;
export function silhouette(ctx, fn, { col = '#160909', rim = 'rgba(255,120,90,.55)', rimDir = [-1, -.3], rimW = 5 } = {}) {
  if (!sb) { sb = document.createElement('canvas'); sb.width = W; sb.height = H; }
  const x = sb.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.filter = 'none'; x.clearRect(0, 0, W, H);
  fn(x); x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, W, H);
  // контровой край: копия, сдвинутая к свету, вычитается — остаётся полоска со стороны света
  ctx.save(); ctx.drawImage(sb, 0, 0); ctx.restore();
  if (!sr) { sr = document.createElement('canvas'); sr.width = W; sr.height = H; }
  const y = sr, yx = y.getContext('2d'); yx.setTransform(1, 0, 0, 1, 0, 0); yx.globalCompositeOperation = 'source-over'; yx.clearRect(0, 0, W, H);
  yx.drawImage(sb, 0, 0); yx.globalCompositeOperation = 'source-in'; yx.fillStyle = rim; yx.fillRect(0, 0, W, H);
  yx.globalCompositeOperation = 'destination-out'; yx.drawImage(sb, -rimDir[0] * rimW, -rimDir[1] * rimW);
  ctx.drawImage(y, 0, 0);
}
