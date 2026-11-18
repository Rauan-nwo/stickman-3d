// ГОТОВО: L11 зал (ивенты Nvidia, Computex, «конференция за конференцией»). Владелец — рабочий A; ведущий и рабочий B импортируют только для чтения.
// staging/eventhall.js — L11 зал. Плейты: assets/bg_event_hall.png (WIDE — из зала на сцену: трибуна слева, экран, ряды кресел спинками
// к нам, проход по центру) и bg_event_hall_reverse.png (REV — со сцены в зал: кресла лицом к нам, помост с камерами, трибуна справа на переднем плане).
// API (всё в пикселях плейта 1920×1080; v = { cx, cy, k } — кадр, как в staging/common.js camView/toS):
//   EH.views                         — базовые кадры: wide, aisle, podium, screen, rev, revSeat, revPodium
//   EH.plate(ctx, v, which, blur, solo)  — which 'wide' | 'rev'; blur 0 | 4 | 10
//   EH.fsAt(y, which)                — масштаб фигуры (пикс. плейта на единицу) для ступней на полу у y; 'stage' — на сцене WIDE
//   EH.standing(ctx, C, v, t, T, o) — стоящий: o = { at:[x,y] ступни, which, f, view, keys, look, sp, L/R:{k,to}, held:{L,R}, solo } (chars_A.person)
//   EH.podium(ctx, C, v, t, T, o)    — оратор за трибуной WIDE (трибуна и микрофон — передний план): o как standing, at по умолчанию за трибуной
//   EH.seatedRev(ctx, C, v, t, T, o) — сидящий в первом ряду REV (кресло лицом к нам), ноги ниже края сцены закрыты сценой; o.seat — [x,y] сиденья
//   EH.stageFront(ctx, v, solo)      — край сцены REV поверх (после героев в зале)
//   EH.crowd(ctx, v, t, o)           — передний план: силуэты зрителей со спины (головы и плечи у нижнего края кадра) с поднятыми телефонами;
//                                      o = { n, phones 0..1, flashes: [t…], seed, y } — чистые силуэты (заливка + тёплый контровой край)
//   EH.screen(ctx, v, lines, k)      — надпись на большом экране WIDE (k 0..1 — проявление)
//   EH.flash(ctx, x, y, u)           — вспышка телефона/камеры (u 0..1 — время с момента вспышки / длина)
// Перспектива WIDE: горизонт y ≈ 453, высота камеры 1.66 м: человек 1.75 м -> fs(y) = .001226·(y − 453); на сцене (пол y ≈ 690) fs ≈ .29.
// Перспектива REV: первый ряд — ширина кресла 170 px = .55 м: fs ≈ .63 у сиденья y 845; пол зала под краем сцены (y ≈ 945) скрыт сценой.
// Свет: прожекторы над сценой — тёплый сверху (WIDE: со стороны сцены, контровой), бра по бокам.
import { clamp, lerp, E, ell } from 'engine';
import { W, H, toS, plate, img, blurred, lazy, polyMask, masked, cover, soft } from './common.js';
import { person, pose, drawP, handS, shadeOf } from '../chars_A.js';
import wideP from '../../assets/bg_event_hall.png';
import revP from '../../assets/bg_event_hall_reverse.png';

const PODIUM = [[493, 548], [560, 533], [663, 544], [663, 561], [642, 573], [628, 688], [646, 692], [646, 712], [514, 712], [514, 692], [537, 688], [518, 573], [497, 562]];
const MIC = [[561, 537], [573, 492], [598, 481], [617, 489], [612, 500], [592, 497], [581, 537]];
const STAGE_REV = (() => { const o = [[0, 1080], [0, 978]]; for (let x = 0; x <= 1920; x += 80) o.push([x, 944 + Math.pow((x - 960) / 960, 2) * 34]); o.push([1920, 1080]); return o; })();
const REV_PODIUM = [[1390, 655], [1470, 640], [1700, 668], [1705, 712], [1650, 742], [1610, 960], [1660, 990], [1650, 1025], [1430, 1025], [1420, 985], [1470, 960], [1440, 742], [1395, 712]];
export const CFG = {
  hor: 453, stageY: 690, podiumAt: [582, 682],
  light: { wide: [0, -1], rev: [.3, -1] },
  views: { wide: { cx: 960, cy: 560, k: 1.0 }, aisle: { cx: 960, cy: 640, k: 1.6 }, podium: { cx: 585, cy: 520, k: 3.4 }, screen: { cx: 965, cy: 420, k: 1.9 },
    rev: { cx: 960, cy: 600, k: 1.0 }, revSeat: { cx: 720, cy: 690, k: 2.0 }, revPodium: { cx: 1500, cy: 760, k: 1.6 } },
};
const I = { wide: img(wideP), rev: img(revP) };
export const A = lazy([I.wide, I.rev], () => ({ wide: I.wide, rev: I.rev, wideB4: blurred(I.wide, 4), wideB10: blurred(I.wide, 10), revB4: blurred(I.rev, 4), revB10: blurred(I.rev, 10),
  podium: masked(I.wide, polyMask([PODIUM, MIC])), stageRev: masked(I.rev, polyMask([STAGE_REV, REV_PODIUM])) }));
const fsAt = (y, which = 'wide') => which === 'stage' ? .29 * (1 + (y - 690) / 400) : which === 'rev' ? .63 * (1 + (y - 845) / 520) : .001226 * (y - 453);
function plateEH(ctx, v, which = 'wide', blur = 0, solo) { const a = A(); if (a && !solo) plate(ctx, a[which + (blur >= 8 ? 'B10' : blur ? 'B4' : '')] || a[which], cover(v)); }
function standing(ctx, C, v, t, T, o) {
  const L = o.light || CFG.light[o.which === 'rev' ? 'rev' : 'wide'];
  return person(ctx, C, v, t, T, { fs: fsAt(o.at[1], o.which) * (o.scale || 1), shade: shadeOf(L, '#ffc47a'), shDx: 0, ...o });
}
function podiumSpk(ctx, C, v, t, T, o = {}) {
  const at = o.at || CFG.podiumAt, a = A();
  const P = standing(ctx, C, v, t, T, { ...o, at, which: 'stage', shadow: false });
  if (a && !o.solo) plate(ctx, a.podium, cover(v));
  return P;
}
function seatedRev(ctx, C, v, t, T, o = {}) {
  const seat = o.seat || [710, 845], fs = fsAt(seat[1], 'rev') * (o.scale || 1);
  const P = pose(C, t, T, { at: seat, fs, pin: 'seat', f: o.f ?? 1, view: o.view === undefined ? null : o.view, stance: o.f && o.view ? (o.f > 0 ? 'sitR' : 'sitL') : 'sitR', keys: o.keys, look: o.look, lean: o.lean, sp: o.sp, seed: o.seed, shade: shadeOf(CFG.light.rev), L: o.L, R: o.R });
  drawP(ctx, P, v);
  return { P, hl: handS(P, v, 'L'), hr: handS(P, v, 'R'), s: fs * v.k };
}
function stageFront(ctx, v, solo) { const a = A(); if (a && !solo) plate(ctx, a.stageRev, cover(v)); }
// вспышка: центр (экран), u 0..1
function flash(ctx, x, y, u, r = 260) { if (u <= 0 || u >= 1) return; const k = 1 - u; ctx.save(); ctx.globalCompositeOperation = 'screen'; const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(255,255,255,${k})`); g.addColorStop(.25, `rgba(255,250,235,${.5 * k})`); g.addColorStop(1, 'rgba(255,240,220,0)'); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.strokeStyle = `rgba(255,255,255,${k})`; ctx.lineWidth = 4; for (let i = 0; i < 4; i++) { const an = i * Math.PI / 2 + .4; ctx.beginPath(); ctx.moveTo(x + Math.cos(an) * r * .1, y + Math.sin(an) * r * .1); ctx.lineTo(x + Math.cos(an) * r * .55, y + Math.sin(an) * r * .55); ctx.stroke(); } ctx.restore(); }
// силуэты зрителей со спины у нижнего края кадра (экранные координаты): головы, плечи, поднятые руки с телефонами
function crowd(ctx, v, t, o = {}) {
  const n = o.n ?? 7, ph = o.phones ?? 1, seed = o.seed || 0, y0 = o.y ?? H * .86, fl = o.flashes || [];
  const heads = [];
  soft(ctx, o.blur ?? 2, x => {
    for (let i = 0; i < n; i++) { const r = ((i * 7 + seed * 3) % 5) / 5, cx = (i + .5 + (r - .5) * .5) * W / n, cy = y0 + (r - .5) * 60, sz = 120 + r * 40;
      const up = ph * clamp(((i * 3 + seed) % 4) / 3 + .2) > .45, hx = cx + (r - .5) * 60, hy = cy - sz * 2.4 + Math.sin(t * 2 + i) * 6;
      x.fillStyle = '#0a0709';
      x.beginPath(); x.ellipse(cx, cy + sz * 1.2, sz * 1.35, sz * 1.1, 0, Math.PI, 0); x.lineTo(cx + sz * 1.35, H + 40); x.lineTo(cx - sz * 1.35, H + 40); x.closePath(); x.fill();
      x.beginPath(); x.arc(cx, cy, sz * .62, 0, Math.PI * 2); x.fill();
      if (up) { x.lineWidth = sz * .22; x.lineCap = 'round'; x.strokeStyle = '#0a0709'; x.beginPath(); x.moveTo(cx + sz * .7, cy + sz * .7); x.quadraticCurveTo(hx + sz * .6, cy, hx, hy + sz * .3); x.stroke();
        x.beginPath(); x.arc(hx, hy + sz * .3, sz * .17, 0, Math.PI * 2); x.fill(); heads.push([hx, hy, sz]); }
    }
  }, 1, 0);
  // экраны телефонов и контровой тёплый край (свет сцены)
  for (const [hx, hy, sz] of heads) { ctx.save(); ctx.translate(hx, hy); ctx.beginPath(); ctx.roundRect(-sz * .2, -sz * .4, sz * .4, sz * .7, sz * .06); ctx.fillStyle = '#16161c'; ctx.fill(); ctx.beginPath(); ctx.roundRect(-sz * .16, -sz * .35, sz * .32, sz * .58, sz * .04); ctx.fillStyle = 'rgba(170,215,255,.85)'; ctx.fill(); ctx.restore(); }
  fl.forEach((tf, k) => { const hd = heads[(k * 3) % Math.max(1, heads.length)]; if (hd) flash(ctx, hd[0], hd[1], (t - tf) / .3, hd[2] * 2.2); });
}
// надпись на экране зала WIDE (экран x 545–1385, y 240–605)
function screen(ctx, v, lines, k = 1) {
  if (k <= 0) return; const a = toS(v, [560, 255]), b = toS(v, [1370, 590]); ctx.save(); ctx.globalAlpha = clamp(k); ctx.beginPath(); ctx.rect(a[0], a[1], b[0] - a[0], b[1] - a[1]); ctx.clip();
  ctx.fillStyle = 'rgba(14,24,18,.92)'; ctx.fillRect(a[0], a[1], b[0] - a[0], b[1] - a[1]); const h = b[1] - a[1];
  lines.forEach((s, i) => { ctx.font = `900 ${Math.round(h * (i ? .1 : .2))}px Bahnschrift, 'Segoe UI', sans-serif`; ctx.fillStyle = i ? '#bfe8c8' : '#7dff9a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s, (a[0] + b[0]) / 2, a[1] + h * (.42 + i * .22)); });
  ctx.restore();
}
export const EH = { CFG, views: CFG.views, A, plate: plateEH, fsAt, standing, podium: podiumSpk, seatedRev, stageFront, crowd, screen, flash };
