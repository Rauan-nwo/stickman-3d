// film/shots/ch02_B.js — постановка части гл. 2 (рабочий B по просьбе ведущего): Denny's (L07), стол сверху (#56, #36), кухня Denny's (L16),
// крыльцо родственников (L15). Ключи — в shots/ch02.js блоком «// --- B ---» в конце SHOTS; здесь только рисовальщики (x => {...}).
import { clamp, lerp, E, NOIR_FONT as F, ell } from 'engine';
import { gait } from 'engine/chars/gaits.js';
import { W, H, camView, toS, lerpView, cover, plate, img, lazy, blurred, contact } from '../staging/common.js';
import { inOutExpo, gauss, env, W_, W0, shake, WHIP_DUR } from './common.js';
import * as DN from '../staging/dennys.js';
import * as B from '../props_B.js';
import * as PR from '../props.js';
import { person, jensen93, jensen97, teenJensen, chris, curtis, waitress, aunt, uncle, brother } from '../chars_B.js';
import { youngJensen } from '../chars.js';
import dennysTop from '../../assets/bg_desk_dennys_top.png';
import deskTop from '../../assets/bg_desk_topdown.png';
import dishPlate from '../../assets/bg_dennys_dishpit.png';
import porchPlate from '../../assets/bg_relatives_porch.png';

const J93 = jensen93(), J97 = jensen97(), TJ = teenJensen(), CH = chris(), CU = curtis(), WT = waitress(), AU = aunt(), UN = uncle(), BR = brother(), YJ = youngJensen();
YJ.spec.rig = { ...YJ.spec.rig, plantLegs: .02, armLayer: 'front' };
const I = { top: img(dennysTop), desk: img(deskTop), dish: img(dishPlate), porch: img(porchPlate) };
const A = lazy(Object.values(I), () => ({ ...I, dishB: blurred(I.dish, 4), porchB: blurred(I.porch, 4), deskB: blurred(I.desk, 2) }));
const up = (t, t0, d = .3) => E.outCubic(clamp((t - t0) / d));
const WAIT_CLOTH = ['#f0b040', '#d08a20', '#8a5a10'];

// ---------- реквизит Denny's ----------
// салфетка с квадратом-чипом и каркасным кубом (экран): P — центр, s — масштаб; sq 0..1 — квадрат нарисован, cube 0..1 — куб вырос, lab — подпись 3D
function napkin(ctx, P, s, sq = 1, cube = 1, lab = 1, flat = .55) {
  ctx.save(); ctx.translate(P[0], P[1]); ctx.scale(s, s * flat); ctx.fillStyle = '#f8f6ee'; ctx.strokeStyle = 'rgba(60,40,30,.5)'; ctx.lineWidth = 2; ctx.fillRect(-90, -90, 180, 180); ctx.strokeRect(-90, -90, 180, 180);
  ctx.strokeStyle = '#2b3a66'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  const seg = [[-36, -10, 26, -10], [26, -10, 26, 52], [26, 52, -36, 52], [-36, 52, -36, -10]], n = sq * 4;
  seg.forEach(([a, b, c, d], i) => { const k = clamp(n - i); if (k <= 0) return; ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(lerp(a, c, k), lerp(b, d, k)); ctx.stroke(); });
  if (cube > 0) { const o = 30 * cube; ctx.beginPath(); for (const [a, b] of [[-36, -10], [26, -10], [26, 52], [-36, 52]]) { ctx.moveTo(a, b); ctx.lineTo(a + o, b - o); } ctx.moveTo(-36 + o, -10 - o); ctx.lineTo(26 + o, -10 - o); ctx.lineTo(26 + o, 52 - o); ctx.stroke(); }
  if (lab > 0) { ctx.globalAlpha = clamp(lab); B.txt(ctx, '3D', 58, 66, 34, { col: '#2b3a66', font: F.hand, w: 700 }); }
  ctx.restore();
}
// кружка (экран: низ-центр), пустая или с кофе
function mugAt(ctx, P, s, full = 0, rot = 0) { ctx.save(); ctx.translate(P[0], P[1]); ctx.rotate(rot); ctx.lineJoin = 'round'; ctx.strokeStyle = '#141014'; ctx.lineWidth = 4 * s;
  ctx.beginPath(); ctx.ellipse(34 * s, -34 * s, 14 * s, 20 * s, 0, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = '#f4efe2'; ctx.beginPath(); ctx.roundRect(-30 * s, -76 * s, 60 * s, 76 * s, [3 * s, 3 * s, 12 * s, 12 * s]); ctx.fill(); ctx.stroke();
  ctx.fillStyle = full > 0 ? '#3a2416' : '#c8bca4'; ctx.beginPath(); ctx.ellipse(0, -72 * s, 26 * s, 6 * s, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
// банка PAYROLL: one — одна тонкая пачка на дне
function payroll(ctx, P, s) { ctx.save(); ctx.translate(P[0], P[1]); ctx.lineJoin = 'round'; ctx.strokeStyle = '#141014'; ctx.lineWidth = 4 * s;
  ctx.fillStyle = 'rgba(200,225,235,.35)'; ctx.beginPath(); ctx.roundRect(-60 * s, -170 * s, 120 * s, 170 * s, 14 * s); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#9aa0aa'; ctx.fillRect(-64 * s, -186 * s, 128 * s, 20 * s); ctx.strokeRect(-64 * s, -186 * s, 128 * s, 20 * s);
  ctx.fillStyle = '#f4efe2'; ctx.fillRect(-52 * s, -130 * s, 104 * s, 40 * s); ctx.strokeRect(-52 * s, -130 * s, 104 * s, 40 * s); B.txt(ctx, 'PAYROLL', 0, -110 * s, 20 * s, { align: 'center', w: 900 });
  ctx.fillStyle = '#6aa060'; ctx.fillRect(-36 * s, -16 * s, 72 * s, 9 * s); ctx.strokeStyle = '#2a4a24'; ctx.lineWidth = 2 * s; ctx.strokeRect(-36 * s, -16 * s, 72 * s, 9 * s);
  ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(-48 * s, -160 * s, 10 * s, 140 * s); ctx.restore(); }
// тарелка блинов (экран: центр)
function pancakes(ctx, P, s) { ctx.save(); ctx.translate(P[0], P[1]); ctx.scale(1, .5); ctx.fillStyle = '#f4f2ea'; ctx.strokeStyle = '#141014'; ctx.lineWidth = 4 * s; ctx.beginPath(); ctx.arc(0, 0, 90 * s, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#d08a3a'; ctx.beginPath(); ctx.arc(-6 * s, -10 * s, 52 * s, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#f6e08a'; ctx.fillRect(-18 * s, -30 * s, 22 * s, 16 * s); ctx.restore(); }
// меню (закрытое, красное)
function menu(ctx, P, s, a = 0) { ctx.save(); ctx.translate(P[0], P[1]); ctx.rotate(a); ctx.fillStyle = '#b3222c'; ctx.strokeStyle = '#141014'; ctx.lineWidth = 4 * s; ctx.beginPath(); ctx.roundRect(-55 * s, -80 * s, 110 * s, 160 * s, 6 * s); ctx.fill(); ctx.stroke(); B.txt(ctx, 'MENU', 0, -30 * s, 22 * s, { col: '#f6e0a0', font: F.label, w: 900, align: 'center' }); ctx.restore(); }
// колокольчик над дверью (вне плейта — висит у верхнего края кадра слева): swing — качание
function bell(ctx, P, s, sw) { ctx.save(); ctx.translate(P[0], P[1]); ctx.strokeStyle = '#3a2a18'; ctx.lineWidth = 5 * s; ctx.beginPath(); ctx.moveTo(-60 * s, -60 * s); ctx.lineTo(0, -60 * s); ctx.lineTo(0, -20 * s); ctx.stroke(); ctx.rotate(sw);
  ctx.fillStyle = '#d9b24a'; ctx.strokeStyle = '#141014'; ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.moveTo(-26 * s, 30 * s); ctx.quadraticCurveTo(-24 * s, -22 * s, 0, -22 * s); ctx.quadraticCurveTo(24 * s, -22 * s, 26 * s, 30 * s); ctx.closePath(); ctx.fill(); ctx.stroke(); ell(ctx, 0, 34 * s, 7 * s, 7 * s, '#8a6a20', '#141014', 2 * s); ctx.restore();
  if (Math.abs(sw) > .15) { ctx.strokeStyle = 'rgba(255,240,200,.8)'; ctx.lineWidth = 3; for (const d of [-1, 1]) { ctx.beginPath(); ctx.arc(P[0], P[1], 54 * s, d > 0 ? -.4 : Math.PI - .2, d > 0 ? .3 : Math.PI + .5); ctx.stroke(); } } }
// надпись на стекле окна
function glassText(ctx, v, s, Pp) { const P = toS(v, Pp); ctx.save(); ctx.translate(P[0], P[1]); B.txt(ctx, s, 0, 0, 46 * v.k, { col: 'rgba(255,250,235,.85)', font: F.display, w: 700, align: 'center' }); ctx.restore(); }

// ---------- L07 Denny's: шоты ----------
export const s54 = x => { const { ctx, t, T, cam, solo, s } = x, v = DN.view('wide', cam, .3), ti = W_(x, 'into', 1.86);   // зал: звенит колокольчик, входит взрослый Дженсен, официантка протягивает ему меню
  const enter = E.outCubic(clamp(t / 1.3)), take = up(t, ti - .2, .35);
  ctx.save(); shake(ctx, cam);
  const r = DN.booth(ctx, v, t, T, { solo, aisle: {
    R: { C: WT, keys: [[0, 'neutral']], look: [-.6, .2], L: { k: 1 - take, to: [lerp(1260, 1060, take), 980] }, heldL: take < .6 ? (c, P, sc) => menu(c, [P[0] - 20 * sc, P[1] - 40 * sc], sc, -.2) : null },
    L: { C: J93, at: [lerp(-260, 330, enter), 1480 + 14 * Math.abs(Math.sin(t * 7)) * (1 - enter)], keys: [[0, 'smile']], look: [.6, .1], R: { k: take, to: [980, 980] }, heldR: take >= .6 ? (c, P, sc) => menu(c, [P[0] + 20 * sc, P[1] - 40 * sc], sc, .15) : null } } });
  if (!solo) bell(ctx, [1780, 70], 1.2, .5 * Math.sin(t * 14) * Math.exp(-t * 2.5) * clamp(t / .05));
  ctx.restore(); };
export const s55 = x => { const { ctx, t, T, cam, solo } = x, v = DN.view('wide', cam, .3);   // трое садятся в кабинку; на стекле SAN JOSE; подписи по очереди (ядро)
  const sit = q => ({ dy: -110 * (1 - E.outBack(clamp((t - q) / .45))) });
  ctx.save(); shake(ctx, cam);
  DN.booth(ctx, v, t, T, { solo, under: (c, vv) => glassText(c, vv, 'SAN JOSE', [960, 120]), seated: { L1: { C: J93, keys: [[0, 'smile']], look: [.5, 0], pose: sit(.1) }, L2: { C: CU, keys: [[0, 'smile']], look: [.6, .1], pose: sit(.35) }, R1: { C: CH, keys: [[0, 'neutral']], look: [-.6, 0], pose: sit(.6) } } });   // кружки — нарисованные на плейте
  ctx.restore(); };
export const s57 = x => { const { ctx, t, T, cam, solo, s, d } = x, tw = s.whip?.t ?? d * .45, wu = inOutExpo((t - tw + .1) / WHIP_DUR);   // официантка щёлкает ручкой над блокнотом -> вип-пан -> Дженсен стучит пальцем по салфетке с кубом
  const v = lerpView(DN.view('aisleR', { ...cam, dx: 0 }), DN.view('L1', { ...cam, dx: 0 }), clamp(wu)), click = gauss(t, .45, .05) > .5, tap = Math.abs(Math.sin(Math.max(0, t - tw - .2) * 10)) * (t > tw + .2 ? 1 : 0);
  ctx.save(); shake(ctx, cam);
  DN.booth(ctx, v, t, T, { solo, blur: true, seated: { L1: { C: J93, keys: [[0, 'smile']], look: [.6, .4], R: { k: 1, to: [575, 825 - 22 * tap] } }, L2: { C: CU, look: [.5, .3] }, R1: { C: CH, look: [-.5, .3] } },
    onTable: (c, vv) => { napkin(c, toS(vv, [575, 835]), vv.k * .8); mugAt(c, toS(vv, [1260, 830]), vv.k * .9, 0); },
    aisle: { R: { C: WT, keys: [[0, 'neutral']], look: [-.4, .5], L: { k: 1, to: [1520, 1010] }, R: { k: 1, to: [1580, 975 - (click ? 8 : 0)] },
      heldL: (c, P, sc) => { c.fillStyle = '#f8f6ee'; c.strokeStyle = '#141014'; c.lineWidth = 3 * sc; c.beginPath(); c.roundRect(P[0] - 10 * sc, P[1] - 90 * sc, 80 * sc, 100 * sc, 4 * sc); c.fill(); c.stroke(); },
      heldR: (c, P, sc) => { c.strokeStyle = '#2a4a8a'; c.lineWidth = 9 * sc; c.lineCap = 'round'; c.beginPath(); c.moveTo(P[0], P[1]); c.lineTo(P[0] + 26 * sc, P[1] - 60 * sc); c.stroke(); if (click) { c.strokeStyle = 'rgba(255,240,200,.9)'; c.lineWidth = 3; c.beginPath(); c.arc(P[0] + 30 * sc, P[1] - 66 * sc, 16 * sc, -2, -.6); c.stroke(); } } } } });
  ctx.restore(); };
export const s58 = x => { const { ctx, t, T, cam, solo } = x, tm = W_(x, 'menu', .66);   // вставка: официантка, не глядя, льёт кофе в кружку рядом с салфеткой с кубом
  if (solo) return; const a = DN.A(); if (!a) return; ctx.save(); shake(ctx, cam); const v = cover({ cx: 1100, cy: 800, k: 2.6 * (1 + (cam.z - 1) * .5) }); plate(ctx, a.dayB, v);
  napkin(ctx, toS(v, [880, 880]), v.k * .9); const M = toS(v, [1180, 900]); mugAt(ctx, M, v.k * 1.1, clamp((t - .4) / .6));
  const tilt = E.outCubic(clamp(t / .35)), P = [M[0] + 150, M[1] - 330];   // кофейник: стекло, чёрная ручка, носик над кружкой
  ctx.save(); ctx.translate(P[0], P[1]); ctx.rotate(-.9 * tilt); ctx.fillStyle = 'rgba(200,225,235,.45)'; ctx.strokeStyle = '#141014'; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(0, 40, 90, 100, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#3a2416'; ctx.beginPath(); ctx.ellipse(0, 70, 80, 60, 0, 0, Math.PI); ctx.fill(); ctx.fillStyle = '#1a1a1e'; ctx.fillRect(-60, -80, 120, 30); ctx.strokeRect(-60, -80, 120, 30); ctx.lineWidth = 16; ctx.beginPath(); ctx.moveTo(80, -40); ctx.quadraticCurveTo(150, 0, 85, 80); ctx.stroke(); ctx.restore();
  if (tilt > .7) { ctx.strokeStyle = '#3a2416'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(P[0] - 110, P[1] + 40); ctx.quadraticCurveTo(M[0] - 10, P[1] + 120, M[0], M[1] - 80); ctx.stroke(); }
  B.insertSleeve(ctx, [P[0] + 130, P[1] - 20], [W + 90, P[1] + 30], 30, WAIT_CLOTH);   // рукав формы официантки
  ctx.restore(); };
export const s59 = x => { const { ctx, t, cam, solo } = x, tp = W_(x, 'plaque', 1.2), v = DN.view('plaque', cam, .1);   // на «plaque» над той же кабинкой привинчивают табличку; на «trillion-dollar» плашка 2023 (ядро)
  if (solo) return; const a = DN.A(); if (!a) return; ctx.save(); shake(ctx, cam); plate(ctx, a.day, v);
  const inn = E.outCubic(clamp((t - tp + .5) / .5)); if (inn > 0) DN.plaque(ctx, v, { dy: 300 * (1 - inn), screwsOn: t > tp + .4 }); DN.screws(ctx, v, clamp((t - tp) / .4), 'in');
  ctx.restore(); };
export const s62 = x => { const { ctx, t, T, cam, solo } = x, v = DN.view('wide', cam, .3);   // кабинка ночью, 1997: гора пустых кружек, почти пустая банка PAYROLL; Крис вертит пустую чашку
  ctx.save(); shake(ctx, cam);
  DN.booth(ctx, v, t, T, { solo, night: true, under: (c, vv) => glassText(c, vv, '1997', [960, 120]),
    seated: { L1: { C: J97, keys: [[0, 'neutral']], look: [.5, .3] }, L2: { C: CU, keys: [[0, 'neutral']], look: [.4, .4] }, R1: { C: CH, sp: 'CHRIS', keys: [[0, 'neutral']], look: [-.5, .3], R: { k: 1, to: [1400, 900] } } },
    onTable: (c, vv) => { for (const [px, py] of [[560, 840], [690, 900], [800, 830], [1130, 830], [1240, 900], [1350, 850]]) mugAt(c, toS(vv, [px, py]), vv.k * 1.25, 0, 0);   // гора пустых кружек — стоят на столешнице
      payroll(c, toS(vv, [960, 920]), vv.k * 1.1); mugAt(c, toS(vv, [1420, 940]), vv.k * 1.25, 0, .25 * Math.sin(t * 3)); } });
  ctx.restore(); };
export const s63 = x => { const { ctx, t, cam, solo } = x;   // вставка: банка PAYROLL — на дне одна тонкая пачка
  if (solo) return; const a = DN.A(); if (!a) return; ctx.save(); shake(ctx, cam); plate(ctx, a.nightB, cover({ cx: 960, cy: 820, k: 2.4 })); payroll(ctx, [W / 2, H * .9], 3.6 * (1 + (cam.z - 1) * .5)); ctx.restore(); };
export const s64 = x => { const { ctx, t, T, cam, solo, s, d } = x, tw = s.whip?.t ?? d * .5, wu = inOutExpo((t - tw + .1) / WHIP_DUR);   // крупно Крис поднимает бровь -> вип-пан -> Дженсен отодвигает единственную тарелку блинов на троих
  const v = lerpView(DN.view('R1', { ...cam, dx: 0 }), DN.view('L1', { ...cam, dx: 0 }), clamp(wu)), push = E.inOutCubic(clamp((t - tw - .25) / .6)), brow = up(t, .3, .25);
  ctx.save(); shake(ctx, cam);
  DN.booth(ctx, v, t, T, { solo, night: true, blur: true,
    seated: { L1: { C: J97, sp: 'JENSEN', keys: [[0, 'neutral']], look: [.6, .3], R: { k: 1, to: [lerp(578, 718, push), 836] } } /* кисть на левом краю тарелки, двигает её */, L2: { C: CU, look: [.4, .3] }, R1: { C: CH, sp: 'CHRIS', keys: [[0, 'neutral']], look: [-.5, 0], brows: [lerp(0, 34, brow), -.2] } },
    onTable: (c, vv) => { pancakes(c, toS(vv, [lerp(640, 780, push), 838]), vv.k * .8); for (const [px, py] of [[1150, 800], [1250, 830]]) mugAt(c, toS(vv, [px, py]), vv.k * .8, 0); } });
  ctx.restore(); };
// ---------- T-desk: стол Denny's сверху (#56), вещи родителей (#36) ----------
export const s56 = x => { const { ctx, t, cam, solo } = x, t3 = W_(x, '3D', 2.36);   // столик Denny's сверху: рука рисует на салфетке квадрат-чип, из него вырастает каркасный куб, рядом «3D»
  if (solo) return; const a = A(); if (!a) return; const v = cover({ cx: 960, cy: 540, k: 1.04 * (1 + (cam.z - 1) * .5) }); ctx.save(); shake(ctx, cam); plate(ctx, a.top, v);
  const sq = clamp((t - .2) / 1.0), cube = clamp((t - 1.3) / .7), P = toS(v, [960, 500]); napkin(ctx, P, v.k * 1.7, sq, cube, clamp((t - t3) / .2), 1);
  const pen = sq < 1 ? (() => { const n = sq * 4, i = Math.min(3, Math.floor(n)), k = n - i, pts = [[-36, -10], [26, -10], [26, 52], [-36, 52], [-36, -10]]; return [lerp(pts[i][0], pts[i + 1][0], k), lerp(pts[i][1], pts[i + 1][1], k)]; })() : [26 + 30 * cube, -10 - 30 * cube];
  const Tp = [P[0] + pen[0] * 1.7 * v.k, P[1] + pen[1] * 1.7 * v.k], Hd = [Tp[0] + 32, Tp[1] + 10];          // кончик ручки — на линии рисунка; кисть чуть выше по ручке
  B.insertSleeve(ctx, Hd, [Hd[0] + 170, H + 140], 18, ['#5f8a74', '#3a6050', '#1c3428']);                      // рука Дженсена-1993: зелёное поло, белая манжета, снизу справа
  ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = '#141014'; ctx.lineWidth = 18; ctx.beginPath(); ctx.moveTo(Tp[0], Tp[1]); ctx.lineTo(Tp[0] + 150, Tp[1] + 46); ctx.stroke();   // ручка поверх руки: тёмный корпус,
  ctx.strokeStyle = '#c9a54a'; ctx.lineWidth = 12; ctx.stroke(); ctx.strokeStyle = '#d8d4c8'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(Tp[0], Tp[1]); ctx.lineTo(Tp[0] + 14, Tp[1] + 4); ctx.stroke();   // светлый наконечник
  ctx.fillStyle = '#141014'; ctx.beginPath(); ctx.arc(Hd[0], Hd[1], 15, 0, Math.PI * 2); ctx.fill(); ctx.restore();                                  // кисть-точка поверх ручки
  ctx.restore(); };
// вещь родителей сверху (рисунок в стиле: контур туши, плоские заливки): kind 0..5
function belonging(ctx, kind, s) { ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = '#141014'; ctx.lineWidth = 5 * s; const f = (c) => { ctx.fillStyle = c; ctx.fill(); ctx.stroke(); };
  if (kind === 0) { ctx.beginPath(); ctx.roundRect(-110 * s, -70 * s, 220 * s, 140 * s, 16 * s); f('#8a5a34'); ctx.beginPath(); ctx.arc(-45 * s, 0, 45 * s, 0, Math.PI * 2); f('#d8c8a0'); for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(-80 * s, k * 20 * s); ctx.lineTo(-10 * s, k * 20 * s); ctx.stroke(); } ctx.beginPath(); ctx.arc(55 * s, -20 * s, 18 * s, 0, Math.PI * 2); f('#f2c230'); ctx.beginPath(); ctx.arc(55 * s, 30 * s, 12 * s, 0, Math.PI * 2); f('#3a2a18'); }   // радио
  if (kind === 1) { ctx.beginPath(); ctx.moveTo(-110 * s, 50 * s); ctx.lineTo(110 * s, 50 * s); ctx.lineTo(110 * s, 20 * s); ctx.lineTo(-110 * s, 20 * s); ctx.closePath(); f('#2a2a30'); ctx.beginPath(); ctx.moveTo(-90 * s, 20 * s); ctx.lineTo(-90 * s, -60 * s); ctx.lineTo(80 * s, -60 * s); ctx.lineTo(80 * s, 0); ctx.lineTo(50 * s, 0); ctx.lineTo(50 * s, -30 * s); ctx.lineTo(-60 * s, -30 * s); ctx.lineTo(-60 * s, 20 * s); ctx.closePath(); f('#1e1e24'); ctx.beginPath(); ctx.arc(-90 * s, -20 * s, 22 * s, 0, Math.PI * 2); f('#c9a54a'); }   // швейная машинка
  if (kind === 2) { for (const sx of [-1, 1]) { ctx.beginPath(); ctx.arc(sx * 70 * s, 20 * s, 48 * s, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(sx * 70 * s, 20 * s, 6 * s, 0, Math.PI * 2); f('#141014'); } ctx.strokeStyle = '#b3222c'; ctx.lineWidth = 8 * s; ctx.beginPath(); ctx.moveTo(-70 * s, 20 * s); ctx.lineTo(-10 * s, -40 * s); ctx.lineTo(50 * s, -40 * s); ctx.lineTo(70 * s, 20 * s); ctx.moveTo(-10 * s, -40 * s); ctx.lineTo(10 * s, 20 * s); ctx.lineTo(50 * s, -40 * s); ctx.stroke(); }   // велосипед
  if (kind === 3) { ctx.beginPath(); ctx.roundRect(-100 * s, -80 * s, 200 * s, 160 * s, 30 * s); f('#6a8a5a'); ctx.beginPath(); ctx.roundRect(-70 * s, -40 * s, 140 * s, 100 * s, 20 * s); f('#7a9a6a'); }   // кресло (сверху)
  if (kind === 4) { ctx.beginPath(); ctx.arc(0, 0, 70 * s, 0, Math.PI * 2); f('#f2d48a'); ctx.beginPath(); ctx.arc(0, 0, 18 * s, 0, Math.PI * 2); f('#c9a54a'); }   // лампа (абажур сверху)
  if (kind === 5) { ctx.beginPath(); ctx.arc(0, 0, 70 * s, 0, Math.PI * 2); f('#f4efe2'); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -48 * s); ctx.moveTo(0, 0); ctx.lineTo(34 * s, 0); ctx.stroke(); }   // часы
}
export const s36 = x => { const { ctx, t, d, cam, solo, s } = x;   // стол сверху: вещи родителей с ценниками; штампы SOLD — по словам (s.ev, части «продан»); плашка источника — ядро
  if (solo) return; const a = A(); if (!a) return; const v = cover({ cx: 960, cy: 540, k: 1.04 * (1 + (cam.z - 1) * .5) }); ctx.save(); shake(ctx, cam); plate(ctx, a.deskB, v);
  const parts = s.event.split(/;\s*/), st = (s.ev || []).filter(e => /продан/.test(parts[e.p] || '')).map(e => e.t);
  const items = [['RADIO', 620, 380], ['SEWING MACHINE', 960, 360], ['BICYCLE', 1300, 390], ['ARMCHAIR', 640, 720], ['TABLE LAMP', 960, 740], ['WALL CLOCK', 1290, 720]];
  items.forEach(([nm, x0, y0], i) => { const P = toS(v, [x0, y0]), sc = v.k * .95; ctx.save(); ctx.translate(P[0], P[1]); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(8 * sc, 14 * sc, 120 * sc, 90 * sc, 0, 0, Math.PI * 2); ctx.fill(); belonging(ctx, i, sc);
    ctx.save(); ctx.translate(95 * sc, -85 * sc); ctx.rotate(.12); ctx.fillStyle = '#f4efe2'; ctx.strokeStyle = '#3a2a18'; ctx.lineWidth = 3 * sc; ctx.beginPath(); ctx.roundRect(-34 * sc, -16 * sc, 68 * sc, 32 * sc, 4 * sc); ctx.fill(); ctx.stroke(); B.txt(ctx, '$', 0, 1 * sc, 20 * sc, { align: 'center', w: 900 }); ctx.restore();
    B.txt(ctx, nm, 0, 108 * sc, 16 * sc, { col: '#f1e6cc', align: 'center', w: 800 });
    const tS = st.length ? st[Math.min(st.length - 1, Math.floor(i * st.length / items.length))] : 1e9; B.stamp(ctx, 0, 0, 'SOLD', 40 * sc, t - tS, -.15); ctx.restore(); });
  ctx.restore(); };

// ---------- L16 кухня Denny's (bg_dennys_dishpit): подросток-Дженсен у мойки ----------
const DP = { feet: [1060, 985], fs: .9, light: [.5, -1], stack: [1430, 520], clock: [810, 150] };
function dishpit(ctx, v, t, T, o) {
  const a = A(); if (!a) return; if (!o.solo) plate(ctx, o.blur ? a.dishB : a.dish, v);
  if (!o.solo && o.night) { ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = 'rgba(70,80,140,1)'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  if (!o.solo && o.clock != null) { const P = toS(v, DP.clock), r = 54 * v.k; ctx.save(); ctx.translate(P[0], P[1]); ell(ctx, 0, 0, r, r, '#f4f0e6', '#141014', 5 * v.k); ctx.strokeStyle = '#141014'; ctx.lineWidth = 5 * v.k; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(-Math.PI / 2 + 2 * Math.PI / 12 * 2) * r * .5, Math.sin(-Math.PI / 2 + 2 * Math.PI / 12 * 2) * r * .5); ctx.moveTo(0, 0); ctx.lineTo(0, -r * .78); ctx.stroke();
    if (o.clock > 0) { ctx.globalAlpha = clamp(o.clock); ctx.fillStyle = '#141014'; ctx.beginPath(); ctx.roundRect(-r * 1.1, r * 1.15, r * 2.2, r * .6, 6); ctx.fill(); B.txt(ctx, '2:00 AM', 0, r * 1.45, r * .4, { col: '#ff6a4a', font: F.label, w: 900, align: 'center' }); } ctx.restore(); }
  if (!o.solo && o.stack > 0) { const P = toS(v, DP.stack), n = Math.round(o.stack), sw = o.sway || 0; for (let i = 0; i < n; i++) { ctx.save(); ctx.translate(P[0] + Math.sin(i * .9) * 4 * v.k + sw * i * 1.4 * v.k, P[1] - (i * 13 + 10) * v.k);
      ctx.fillStyle = '#f4efe2'; ctx.strokeStyle = '#141014'; ctx.lineWidth = 2.5 * v.k; ctx.beginPath(); ctx.ellipse(0, 0, 70 * v.k, 11 * v.k, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillStyle = 'rgba(200,120,60,.5)'; ctx.fillRect(-30 * v.k, -3 * v.k, 26 * v.k, 4 * v.k); ctx.restore(); } }
  if (!o.solo) { const F0 = toS(v, DP.feet), s = DP.fs * v.k; contact(ctx, F0[0], F0[1] + 3 * s, 150 * s, 22 * s, .5, -.15); }
  return person(ctx, v, t, T, { C: TJ, at: DP.feet, fs: DP.fs, view: o.view || 'back', facing: 1, light: DP.light, keys: [[0, 'neutral']], look: o.look || [.5, .4], R: { k: 1, to: [1140, 600 + 10 * Math.sin(t * 9)] }, L: { k: 1, to: [1000, 610] }, ...(o.p || {}) });
}
export const s52 = x => { const { ctx, t, T, cam, solo } = x, v = camView({ cx: 1040, cy: 520, k: 1.25 }, cam, .3), tn = W_(x, 'night', .8), tw = W_(x, 'washing', 2.2);   // подросток в фартуке у мойки; на «night» часы 2:00 AM; на «washing» растёт и качается стопка тарелок
  ctx.save(); shake(ctx, cam); dishpit(ctx, v, t, T, { solo, night: t > tn, clock: clamp((t - tn) / .25), stack: 2 + 14 * clamp((t - tw) / .8), sway: Math.sin(t * 5) * clamp((t - tw) / .8), look: [.5, .3] }); ctx.restore(); };
export const s53 = x => { const { ctx, t, T, cam, solo } = x, v = camView({ cx: 1260, cy: 430, k: 1.5 }, cam, .2), ts = W_(x, 'sink', .3), tb = W_(x, 'busboy', 2.34);   // на «sink» башня тарелок выше головы; на «busboy» бейдж BUSBOY на фартук, в руках поднос (ночь)
  const tray = up(t, tb - .2, .35), turn = t > tb - .35;
  ctx.save(); shake(ctx, cam);
  const r = dishpit(ctx, v, t, T, { solo, night: true, clock: 1, view: turn ? 'threeQuarter' : 'back', stack: 16 + 30 * clamp((t - ts) / 1.2), sway: Math.sin(t * 4) * .8, look: [.4, -.6],
    p: tray > .05 ? { R: { k: 1, to: [1125, 640] }, L: { k: 1, to: [995, 645] }, under: (c, o) => { if (tb != null && t > tb) { const P = [o.head[0] - 20 * o.s, o.head[1] + 330 * o.s]; c.save(); c.translate(P[0], P[1]); c.fillStyle = '#f2c230'; c.strokeStyle = '#141014'; c.lineWidth = 3; c.beginPath(); c.roundRect(-46 * o.s, -16 * o.s, 92 * o.s, 32 * o.s, 4); c.fill(); c.stroke(); B.txt(c, 'BUSBOY', 0, 0, 18 * o.s, { align: 'center', w: 900 }); c.restore(); } } } : null });
  if (r && tray > .05) { const P = [(r.hl[0] + r.hr[0]) / 2, (r.hl[1] + r.hr[1]) / 2 - 4 * r.s], hw = Math.max(70 * r.s, Math.abs(r.hr[0] - r.hl[0]) / 2 + 6 * r.s);   // поднос: края — на кистях
    ctx.save(); ctx.fillStyle = '#7a7e88'; ctx.strokeStyle = '#141014'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(P[0], P[1], hw, 18 * r.s, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#141014'; for (const Q of [r.hl, r.hr]) { ctx.beginPath(); ctx.arc(Q[0], Q[1], 12 * r.s, 0, Math.PI * 2); ctx.fill(); } ctx.restore(); }   // правило хвата: кисти-точки поверх края подноса
  ctx.restore(); };

// ---------- L15 крыльцо родственников (bg_relatives_porch) ----------
const RP = { aunt: { at: [835, 690], fs: .5 },   // тётя сидит НА скамье (сиденье y≈688, высота сиденья ≈90 px плейта) — масштаб под скамью
   uncle: { at: [1330, 905], fs: .7 }, kids: [[360, 1000], [560, 1010]], kfs: .48, case: [[360, 1000], [560, 1010]], light: [.6, -.8] };
function suitcase(ctx, P, s) { ctx.save(); ctx.translate(P[0], P[1]); ctx.fillStyle = '#7a4a24'; ctx.strokeStyle = '#141014'; ctx.lineWidth = 4 * s; ctx.beginPath(); ctx.roundRect(-110 * s, -120 * s, 220 * s, 120 * s, 10 * s); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#c9a54a'; ctx.fillRect(-90 * s, -70 * s, 16 * s, 14 * s); ctx.fillRect(74 * s, -70 * s, 16 * s, 14 * s); ctx.strokeStyle = '#3a2412'; ctx.lineWidth = 8 * s; ctx.beginPath(); ctx.moveTo(-110 * s, -40 * s); ctx.lineTo(110 * s, -40 * s); ctx.stroke(); ctx.restore(); }
// брошюра в руке тёти: белое здание, VERY STRICT; line — строка FOR TROUBLED BOYS
function brochure(ctx, P, w, a, line = 0) { ctx.save(); ctx.translate(P[0], P[1]); ctx.rotate(a); const h = w * 1.3; ctx.fillStyle = '#f4efe2'; ctx.strokeStyle = '#141014'; ctx.lineWidth = Math.max(2, w * .015); ctx.fillRect(-w / 2, -h / 2, w, h); ctx.strokeRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = '#8ac0e0'; ctx.fillRect(-w * .42, -h * .44, w * .84, h * .38); ctx.fillStyle = '#ffffff'; ctx.fillRect(-w * .25, -h * .3, w * .5, h * .22); ctx.strokeRect(-w * .25, -h * .3, w * .5, h * .22);
  ctx.beginPath(); ctx.moveTo(-w * .3, -h * .3); ctx.lineTo(0, -h * .4); ctx.lineTo(w * .3, -h * .3); ctx.closePath(); ctx.fill(); ctx.stroke();
  B.txt(ctx, 'ONEIDA', 0, h * .02, w * .1, { align: 'center', w: 900 }); B.txt(ctx, 'VERY STRICT', 0, h * .14, w * .12, { align: 'center', w: 900, col: '#b3121f', font: F.label });
  if (line > 0) { B.highlight(ctx, -w * .44, h * .3, w * .88, h * .07, line); } B.txt(ctx, 'FOR TROUBLED BOYS', 0, h * .3, w * .08, { align: 'center', w: 800 }); ctx.restore(); }
function porch(ctx, v, t, T, o) {
  const a = A(); if (!a) return {}; if (!o.solo) plate(ctx, o.blur ? a.porchB : a.porch, v);
  if (!o.solo) for (const P of RP.case) suitcase(ctx, toS(v, P), .75 * v.k);
  const out = {};
  out.aunt = person(ctx, v, t, T, { C: AU, at: RP.aunt.at, fs: RP.aunt.fs, pin: 'seat', stance: 'sitL', view: 'threeQuarter', facing: -1, sp: 'AUNT', light: RP.light, keys: [[0, 'smile']], look: [-.2, .4], ...(o.aunt || {}),
    L: { k: 1, to: [828, 600] }, R: { k: 1, to: [880, 604] }, heldR: (c, P, s) => brochure(c, [P[0] - 40 * s, P[1] - 60 * s], 150 * s, -.1, o.line || 0) });
  RP.kids.forEach((P, i) => { out['k' + i] = person(ctx, v, t, T, { C: i ? BR : YJ, at: [P[0], P[1] - 120 * .75], fs: RP.kfs, pin: 'seat', stance: 'sitR', view: 'threeQuarter', facing: 1, light: RP.light, keys: [[0, o.kidsEmo || 'smile']], look: [.6, -.2], seed: 4 + i }); });
  out.uncle = person(ctx, v, t, T, { C: UN, at: RP.uncle.at, fs: RP.uncle.fs, view: 'threeQuarter', facing: -1, sp: 'UNCLE', light: RP.light, keys: [[0, 'smile']], shadow: !o.solo, look: [-.5, .2], ...(o.uncle || {}) });
  return out;
}
export const s37 = x => { const { ctx, t, T, cam, solo, s, d } = x, tw = s.whip?.t ?? d * .6, wu = inOutExpo((t - tw + .1) / WHIP_DUR);   // тётя читает брошюру (белое здание, VERY STRICT); мальчики на чемоданах -> вип-пан -> дядя кивает, хлопает по чемодану
  const v = lerpView(cover({ cx: 720, cy: 640, k: 1.45 }), cover({ cx: 1180, cy: 560, k: 1.5 }), clamp(wu)), pat = Math.abs(Math.sin(Math.max(0, t - tw - .2) * 8)) * (t > tw + .2 ? 1 : 0);
  ctx.save(); shake(ctx, cam);
  porch(ctx, v, t, T, { solo, uncle: { tilt: .06 * Math.sin(Math.max(0, t - tw) * 9), R: { k: t > tw ? 1 : 0, to: [560 + 90, 1000 - 120 * .75 - 20 * pat] } } });
  ctx.restore(); };
export const s40 = x => { const { ctx, t, T, cam, solo } = x, tm = W_(x, 'mistake', 1.44);   // улыбки застывают; на «mistake» рывок к брошюре: строка FOR TROUBLED BOYS; рука дяди замирает над чемоданом
  ctx.save(); shake(ctx, cam);
  if (t < tm) porch(ctx, camView({ cx: 960, cy: 600, k: 1.25 }, cam, .2), t, T, { solo, aunt: { keys: [[0, 'smile'], [.5, 'nervous']] }, uncle: { keys: [[0, 'smile'], [.5, 'nervous']], R: { k: 1, to: [650, 830] } }, kidsEmo: 'neutral' });
  else { const a = A(); if (a && !solo) { plate(ctx, a.porchB, cover({ cx: 800, cy: 620, k: 2.6 })); brochure(ctx, [W / 2, H / 2 + 30], 620, -.05, clamp((t - tm) / .35)); } }
  ctx.restore(); };
