// film/shots/ch08.js — постановка гл. 8 (владелец: рабочий B). Ключ плана — 'глава|начало текста' (film/keys.js).
// Контракт рабочего — film/README.md, «Работа по главам». Рисовальщик плана: x => {...}, x = { ctx, s, t, d, T, cam, camAt, solo, API }.
import { clamp, lerp, E, gesture } from 'engine';
import { W, H, camView, toS, lerpView, cover, plate, img, lazy, blurred } from '../staging/common.js';
import * as R from '../staging/restaurant.js';
import * as CAR from '../staging/car.js';
import * as OF from '../staging/office.js';
import * as KY from '../staging/kentucky.js';
import * as IN from '../staging/inserts.js';
import * as DT from '../staging/desktop.js';
import * as PR from '../props.js';
import { inOutExpo, gauss, env, W_, W0, shake, whipPlates, focusBox, freezeFrame, candle, V, WHIP_DUR, wordAt, lineSpan } from './common.js';
import * as NR from '../staging/newsroom.js';
import * as CR from '../staging/closed_room.js';
import * as B from '../props_B.js';
import { mouth } from '../words.js';
import { WA } from '../staging/washington.js';
import { BJ } from '../staging/beijing.js';
import { silhouette } from '../staging/desk.js';
import { official, officer } from '../chars.js';
import deskTopPlate from '../../assets/bg_desk_topdown.png';

const RUBIO = official({ hair: 'dark', tie: ['#1e3a6e', '#142a52'] });
const DTI = { p: img(deskTopPlate) }, DTA = lazy([DTI.p], () => ({ p: DTI.p, b3: blurred(DTI.p, 3) }));
const up = (t, t0, d = .3) => E.outCubic(clamp((t - t0) / d));
const zoomIn = (ctx, cam) => { const z = cam.z; ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2); };
// снимок с Computex (гл. 5): Дженсен и Алиса на фоне синего задника COMPUTEX
export const computexPic = (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#1e3c78'); g.addColorStop(1, '#0a1430'); x.fillStyle = g; x.fillRect(0, 0, w, h);
  B.txt(x, 'COMPUTEX', w * .5, h * .14, h * .14, { col: 'rgba(200,220,255,.5)', font: "'Arial Black', Impact, sans-serif", w: 900, align: 'center' });
  const s = h / 1100; B.miniFig(x, B.CAST_MINI.J, w * .36, h * .32 + 712 * s, s, { view: 'threeQuarter', facing: 1, emo: 'smug' }); B.miniFig(x, B.CAST_MINI.AL, w * .64, h * .34 + 712 * s, s, { view: 'threeQuarter', facing: -1 }); };
// снимок наружного наблюдения: ужин через мокрое стекло (тот самый кадр гл. 1), дождевые потёки
export const surveilPic = (x, w, h) => { IN.snapPic(x, w, h); x.strokeStyle = 'rgba(200,220,255,.28)'; x.lineWidth = Math.max(1, w * .004);
  for (let i = 0; i < 26; i++) { const a = (i * 97) % w, b = (i * 53) % h; x.beginPath(); x.moveTo(a, b); x.lineTo(a - w * .01, b + h * .12); x.stroke(); }
  x.fillStyle = 'rgba(20,30,50,.18)'; x.fillRect(0, 0, w, h); };
// стол сверху (вставки с бумагами): плейт стола и камера
function deskTop(ctx, cam, blur = 0) { const a = DTA(); if (!a) return; const v = cover({ cx: 960 + cam.dx * 200, cy: 560, k: 1.02 * (1 + (cam.z - 1) * .6) }); plate(ctx, blur ? a.b3 : a.p, v); return v; }

// кадр Дженсена у стены микрофонов (Тайбэй) — приколот к меморандуму
export const jensenMicsPic = (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#2a2030'); g.addColorStop(1, '#0c0a10'); x.fillStyle = g; x.fillRect(0, 0, w, h);
  const s = h / 1000; B.miniFig(x, B.CAST_MINI.J, w * .5, h * .3 + 712 * s, s, { view: 'front', mouth: 'open' });
  for (let i = 0; i < 7; i++) { x.save(); x.translate(w * .5, h * 1.02); x.rotate(-.6 + i * .2); x.fillStyle = '#121216'; x.fillRect(-w * .01, -h * .42, w * .02, h * .42); x.fillStyle = ['#d0302a', '#2a2a30', '#3a6ad0', '#e0c040', '#2a2a30', '#ffffff', '#d0302a'][i]; x.beginPath(); x.ellipse(0, -h * .44, w * .035, h * .05, 0, 0, Math.PI * 2); x.fill(); x.restore(); } };
// Air Force One: иллюминатор на стене кабинета-салона; wing 0..1 — в нём крыло с надписью
export function porthole(ctx, v, P, r, wing) {
  const S = toS(v, P), R = r * v.k; ctx.save(); ctx.translate(S[0], S[1]);
  ctx.fillStyle = '#d8dce4'; ctx.beginPath(); ctx.ellipse(0, 0, R * 1.18, R * 1.4, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#141014'; ctx.lineWidth = 3 * v.k; ctx.stroke();
  ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, R, R * 1.22, 0, 0, Math.PI * 2); ctx.clip();
  const g = ctx.createLinearGradient(0, -R * 1.2, 0, R * 1.2); g.addColorStop(0, '#2a3e6a'); g.addColorStop(1, '#8a9ab8'); ctx.fillStyle = g; ctx.fillRect(-R * 1.3, -R * 1.3, R * 2.6, R * 2.6);
  if (wing > 0) { const dx = lerp(R * 2.2, 0, E.outCubic(wing)); ctx.fillStyle = '#e8ecf2'; ctx.beginPath(); ctx.moveTo(-R * 1.4 + dx, R * .35); ctx.lineTo(R * 1.4 + dx, -R * .05); ctx.lineTo(R * 1.4 + dx, R * .3); ctx.lineTo(-R * 1.4 + dx, R * .7); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#2a3a5a'; ctx.lineWidth = 2 * v.k; ctx.stroke();
    ctx.save(); ctx.translate(dx, R * .32); ctx.rotate(-.13); B.txt(ctx, 'UNITED STATES OF AMERICA', 0, 0, R * .17, { col: '#1e3a6e', font: "Georgia, serif", w: 700, align: 'center' }); ctx.restore(); }
  ctx.restore(); ctx.lineWidth = 6 * v.k; ctx.strokeStyle = '#9aa2b0'; ctx.beginPath(); ctx.ellipse(0, 0, R, R * 1.22, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
}
// здание МГБ без вывески (тёмно-красная ночь) и линии по карте: abroad 0..1 — по миру, home 0..1 — по Китаю
export function mssBuilding(ctx, t, cam, abroad, home) {
  ctx.save(); const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1a0406'); g.addColorStop(1, '#3a0a0c'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const z = cam.z; ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
  if (abroad > 0 || home > 0) {   // карта мира еле видна: материки пятнами
    ctx.globalAlpha = .35 * Math.max(abroad, home); ctx.fillStyle = '#5a1a1c';
    for (const [x, y, rx, ry] of [[420, 330, 230, 120], [560, 640, 120, 200], [960, 300, 110, 90], [1010, 560, 130, 170], [1380, 340, 330, 150], [1600, 700, 120, 80]]) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, .2, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1; }
  const bx = 960, by = 900; ctx.fillStyle = '#0c0204'; ctx.fillRect(bx - 330, by - 520, 660, 520); ctx.fillRect(bx - 400, by - 300, 800, 300); ctx.fillRect(bx - 90, by - 600, 180, 90);
  ctx.strokeStyle = 'rgba(255,120,90,.45)'; ctx.lineWidth = 3; ctx.strokeRect(bx - 330, by - 520, 660, 520);
  for (let r = 0; r < 9; r++) for (let c = 0; c < 12; c++) { const on = ((r * 7 + c * 13) % 9) < 2; ctx.fillStyle = on ? 'rgba(255,170,110,.75)' : 'rgba(80,20,20,.6)'; ctx.fillRect(bx - 300 + c * 50, by - 490 + r * 52, 26, 30); }
  ctx.fillStyle = '#2a0a0a'; ctx.fillRect(bx - 120, by - 40, 240, 40); ctx.fillStyle = '#1a0606'; ctx.fillRect(bx - 160, by - 330, 320, 40);   // пустое место под вывеску
  const from = [bx, by - 560], ends = [[300, 260], [420, 380], [560, 700], [980, 260], [1050, 600], [1700, 320], [1650, 720], [180, 520]], homes = [[1300, 300], [1420, 400], [1340, 460], [1480, 330], [1260, 420]];
  const ray = (list, k, col) => { if (k <= 0) return; ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.setLineDash([10, 8]); for (const [x, y] of list) { ctx.beginPath(); ctx.moveTo(from[0], from[1]); ctx.lineTo(lerp(from[0], x, k), lerp(from[1], y, k)); ctx.stroke(); if (k > .95) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill(); } } ctx.setLineDash([]); };
  ray(ends, E.outCubic(abroad), 'rgba(255,90,70,.85)'); ray(homes, E.outCubic(home), 'rgba(255,200,120,.9)');
  ctx.restore();
}
export const SHOTS = {
  // ---------------- L05 Пекин: здание МГБ; L04: салон борта №1 ----------------
  '8|The Ministry of State Security': x => { const { ctx, t, cam, solo } = x, ta = W_(x, 'abroad', 4.5), th = W_(x, 'home', 5.38);   // силуэт здания без вывески; на «abroad» линии по карте мира, на «home» — по Китаю
    if (solo) return; mssBuilding(ctx, t, cam, clamp((t - ta) / .6), clamp((t - th) / .5)); },
  '8|CNN reported that Rubio briefed': x => { const { ctx, t, T, cam, solo } = x, v = WA.view('mid', cam), ta = W_(x, 'Air', 3.4);   // салон борта №1: госсекретарь за столом с папкой; на «Air» в иллюминаторе крыло UNITED STATES OF AMERICA
    ctx.save(); shake(ctx, cam);
    if (!solo) { WA.widePlate(ctx, v, 0, solo); porthole(ctx, v, [1330, 520], 70, clamp((t - ta + .1) / .45)); porthole(ctx, v, [520, 520], 70, 0); }
    WA.seated(ctx, v, t, T, { C: RUBIO, solo, noPlate: true, keys: [[0, 'neutral']], look: [.35, .35], R: { k: 1, to: [1010, 812] },
      deskTop: (c, vv) => { const P = toS(vv, [1000, 818]); c.save(); c.translate(P[0], P[1]); c.scale(1, .45); c.translate(-105 * vv.k, -80 * vv.k); B.tsFolder(c, 210 * vv.k, 160 * vv.k, { open: 0 }); c.restore(); } });
    ctx.restore(); },

  // ---------------- L18 закрытая комната ----------------
  '8|and to nudge Jensen': x => { const { ctx, t, T, cam, solo } = x, tl = W_(x, 'lobbying', 1.8), tj = W_(x, 'Jensen', .3);   // вставка: вторая страница меморандума на сукне, скрепкой приколот кадр Дженсена у микрофонов; маркер ведёт по строке
    if (solo) return; ctx.save(); shake(ctx, cam); const a = CR.A(); if (a) plate(ctx, a.b3, cover({ cx: 965, cy: 690, k: 2.6 * cam.z }));
    ctx.translate(W / 2, H / 2); ctx.scale(1.3, 1.3); ctx.translate(-W / 2, -H * .42);
    B.sheet(ctx, 960, 560, 640, 860, -.03, (c, w, h) => B.memoPage(c, w, h, { title: 'MEMORANDUM — p. 2', line: '…to nudge Jensen to keep lobbying for looser rules', lineY: .62, k: clamp((t - tj) / Math.max(.4, tl - tj + .3)), pic: jensenMicsPic, picK: clamp((t - .1) / .35), page: '2' }));
    ctx.restore(); },
  '8|Officials asked for the name': x => { const { ctx, t, T, cam, solo } = x, v = CR.view('mid', cam, .3), tu = W_(x, 'unmasked', 1.5);   // двое над сводкой; на «unmasked» левый тянет чёрную плашку вверх
    const reach = env(t, tu - .35, x.d + 1, .3), lift = E.inOutCubic(clamp((t - tu) / .5)), P0 = CR.onTable(0, .05);
    ctx.save(); shake(ctx, cam);
    CR.room(ctx, v, t, T, { solo, a1: { keys: [[0, 'neutral']], look: [.4, .6], lean: .06 * reach, R: { k: 1, to: [lerp(720, P0[0] + 30, reach), lerp(676, P0[1] - 6 - 30 * lift, reach)] } }, a2: { keys: [[0, 'neutral']], look: [-.45, .6] },
      onTable: (c, vv) => { const P = toS(vv, P0); c.save(); c.translate(P[0], P[1]); c.scale(1, .5); B.sheet(c, 0, 0, 300 * vv.k, 380 * vv.k, .05, (cc, w, h) => B.intercept(cc, w, h, { lift: lift * .9 })); c.restore(); } });
    ctx.restore(); },
  '8|It was Jensen Huang': x => { const { ctx, t, cam, solo } = x, tj = W_(x, 'Jensen', .34);   // вставка: на «Jensen» чёрная плашка срывается — под ней JENSEN HUANG
    if (solo) return; ctx.save(); shake(ctx, cam); const a = CR.A(); if (a) plate(ctx, a.b3, cover({ cx: 965, cy: 690, k: 2.6 * cam.z }));
    ctx.translate(W / 2, H / 2); ctx.scale(1.25, 1.25); ctx.translate(-W / 2, -H / 2);
    B.sheet(ctx, 960, 600, 760, 980, .02, (c, w, h) => B.intercept(c, w, h, { lift: E.inCubic(clamp((t - tj + .05) / .22)) }));
    ctx.restore(); },
  '8|AIDE: Who gets a copy': x => { const { ctx, t, T, cam, solo } = x, v = CR.view('wide', cam, .3), tc = W_(x, 'copy', .45);   // общий: комната без окон, красная лампа CLASSIFIED; копии 1 of 6 … 6 of 6 разъезжаются по шести местам
    ctx.save(); shake(ctx, cam);
    CR.room(ctx, v, t, T, { solo, a1: { keys: [[0, 'neutral']], look: [.5, .5] }, a2: { keys: [[0, 'neutral']], look: [-.5, .4] },
      onTable: (c, vv) => { for (let i = 0; i < 6; i++) { const u = E.outCubic(clamp((t - tc + .25 - i * .09) / .35)), ang = -2.6 + i * (5.2 / 5), P = CR.onTable(ang, lerp(.05, .78, u)), S = toS(vv, P);
        c.save(); c.translate(S[0], S[1]); c.scale(1, .45); c.rotate(ang * .3); B.sheet(c, 0, 0, 70 * vv.k, 90 * vv.k, 0, (cc, w, h) => { cc.fillStyle = '#b3121f'; cc.fillRect(w * .1, h * .1, w * .8, h * .14); B.txt(cc, `${i + 1} OF 6`, w / 2, h * .6, h * .18, { align: 'center', w: 900 }); }, { col: '#d9c49a' }); c.restore(); } } });
    ctx.restore(); },
  '8|AIDE 2: Only the top clearances': x => { const { ctx, t, T, cam, solo, s, d } = x, tw = s.whip?.t ?? d * .5, wu = inOutExpo((t - tw + .1) / WHIP_DUR);   // крупно AIDE 2 прижимает папку к груди -> вип-пан -> AIDE понижает голос, наклоняется
    const v = lerpView(CR.view('a2', { ...cam, dx: 0 }), CR.view('a1', { ...cam, dx: 0 }), clamp(wu)), hug = env(t, .1, d + 1, .3), lean = env(t, tw + .1, d + 1, .4);
    const S2 = CR.CFG.seat.A2, fy = S2[1] - 255 * CR.CFG.fs;
    ctx.save(); shake(ctx, cam);
    CR.room(ctx, v, t, T, { solo, blur: 3, a2: { keys: [[0, 'neutral']], look: [-.5, .2], L: { k: 1, to: [lerp(S2[0] - 52, S2[0] - 34, hug), lerp(676, fy + 20, hug)] }, R: { k: 1, to: [lerp(S2[0] + 52, S2[0] + 34, hug), lerp(676, fy + 26, hug)] },
        under: (c, r) => { if (hug < .05) return; const P = toS(v, [S2[0], fy]); c.save(); c.translate(P[0], P[1]); c.rotate(-.08); c.fillStyle = '#c9ae72'; c.strokeStyle = '#141014'; c.lineWidth = 3 * v.k; const w = 120 * v.k * CR.CFG.fs / .62, h = 150 * v.k * CR.CFG.fs / .62; c.beginPath(); c.roundRect(-w / 2, -h / 2 + (1 - hug) * 60 * v.k, w, h, 4); c.fill(); c.stroke(); c.fillStyle = '#b3121f'; c.fillRect(-w * .35, -h * .1 + (1 - hug) * 60 * v.k, w * .7, h * .14); c.restore(); } },
      a1: { keys: [[0, 'neutral']], look: [.5, .3], lean: .1 * lean, tilt: .06 * lean } });
    ctx.restore(); },
  "8|AIDE 2: He's in it": x => { const { ctx, t, cam, solo } = x, tp = W_(x, 'in', .3);   // вставка: палец AIDE 2 на строке JENSEN HUANG (рука — от её кресла, сверху справа)
    if (solo) return; ctx.save(); shake(ctx, cam); const a = CR.A(); if (a) plate(ctx, a.b3, cover({ cx: 1050, cy: 690, k: 2.6 * cam.z }));
    B.sheet(ctx, 900, 560, 760, 980, .02, (c, w, h) => B.intercept(c, w, h, { lift: 1 }));
    const k = E.outCubic(clamp((t - tp + .3) / .35)), hx = lerp(1560, 1050, k), hy = lerp(-60, 515, k);
    ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = '#141014'; ctx.lineWidth = 46; ctx.beginPath(); ctx.moveTo(1980, -120); ctx.quadraticCurveTo(1650, 250, hx, hy); ctx.stroke();
    const sx = lerp(1980, hx, .62), sy = lerp(-120, hy, .62) - 30; ctx.strokeStyle = '#141014'; ctx.lineWidth = 132; ctx.beginPath(); ctx.moveTo(2100, -260); ctx.lineTo(sx, sy); ctx.stroke(); ctx.strokeStyle = '#7a7c84'; ctx.lineWidth = 120; ctx.stroke(); ctx.strokeStyle = 'rgba(255,255,255,.16)'; ctx.lineWidth = 16; ctx.beginPath(); ctx.moveTo(2080, -290); ctx.lineTo(sx - 20, sy - 40); ctx.stroke();  ctx.strokeStyle = 'rgba(255,214,150,.25)'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(1960, -130); ctx.quadraticCurveTo(1640, 230, hx + 10, hy - 18); ctx.stroke();
    ctx.fillStyle = '#141014'; ctx.beginPath(); ctx.arc(hx, hy, 34, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    ctx.restore(); },
  // ---------------- L02 салон: бобины ----------------
  '8|It was built on electronic surveillance': x => { const { ctx, t, T, cam, solo } = x, v = camView({ cx: 830, cy: 620, k: 1.9 }, cam, .3), ta = W_(x, 'Alice', 2);   // крупно бобины и бирка LINE 2; AGENT 2 снимает наушники
    ctx.save(); shake(ctx, cam);
    CAR.car(ctx, v, t, T, { solo, reelsAng: T * 3.2, a1: { keys: [[0, 'neutral']], look: [.6, .3] }, a2: { keys: [[0, 'neutral']], look: [-.4, .5], phones: E.inOutCubic(clamp((t - ta + .1) / .4)), press: env(t, ta - .4, ta + .1, .2, .25) } });
    if (!solo) { const P = toS(v, [709, 811]); ctx.save(); ctx.translate(P[0] + 20 * v.k, P[1] - 50 * v.k); ctx.rotate(-.12); ctx.fillStyle = '#efe4c8'; ctx.strokeStyle = '#3a2a18'; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(-60 * v.k, -18 * v.k, 120 * v.k, 36 * v.k, 4); ctx.fill(); ctx.stroke(); B.txt(ctx, 'LINE 2', 0, 1, 22 * v.k, { align: 'center', w: 900 }); ctx.restore(); }
    ctx.restore(); },

  // ---------------- L13 редакция ----------------
  "8|The president has said he hadn't heard": x => { const { ctx, t, T, cam, solo } = x, v = NR.view('tv', cam, .1), th = W_(x, 'heard', 1.4);   // ТВ крупно: президент у микрофонов (силуэт); на «heard» подпись
    ctx.save(); shake(ctx, cam); NR.room(ctx, v, t, T, { solo, blur: 6, tvBezel: true, tv: { scene: NR.scenePresident, bug: 'NEWS', live: true, chyron: "PRESIDENT: HADN'T HEARD ABOUT IT", chyronK: up(t, th, .35) } }); ctx.restore(); },
  '8|Then, on October 29, 2026': x => { const { ctx, t, d, cam, solo } = x, to = W_(x, 'October', .7), tb = W_(x, 'broke', d - .9);   // печать: полоса выходит из машины; бирка OCT 29, 2026; на «broke» полоса срывается в камеру
    if (solo) return; ctx.save(); shake(ctx, cam);
    const a = NR.A(); if (a) { plate(ctx, a.b6, { cx: 700, cy: 560, k: 1.3 }); ctx.fillStyle = 'rgba(6,6,10,.55)'; ctx.fillRect(0, 0, W, H); }
    const run = t < tb ? t * 60 : tb * 60, tear = E.inCubic(clamp((t - tb) / .45));
    for (const [y, r] of [[250, 70], [880, 80]]) { for (let i = 0; i < 2; i++) { const g = ctx.createLinearGradient(0, y - r, 0, y + r); g.addColorStop(0, '#5a5e68'); g.addColorStop(.5, '#c8ccd4'); g.addColorStop(1, '#2a2c32'); ctx.fillStyle = g; ctx.fillRect(0, y - r, W, 2 * r); }
      ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 3; for (let k = 0; k < 24; k++) { const xx = ((k * 90 - run * 3) % W + W) % W; ctx.beginPath(); ctx.moveTo(xx, y - r); ctx.lineTo(xx, y + r); ctx.stroke(); } }
    const pw = 620, ph = 820, px = lerp(1500, 960, E.outCubic(clamp(t / Math.max(.5, to + .4)))), py = 560;
    ctx.save(); ctx.translate(px, py); const sc = 1 + 2.2 * tear; ctx.translate(0, -120 * tear); ctx.scale(sc, sc); ctx.rotate(-.04 + .12 * tear);
    B.sheet(ctx, 0, 0, pw, ph, 0, (c, w, h) => B.frontPage(c, w, h, computexPic)); ctx.restore();
    const kt = up(t, to, .35); if (kt > 0) { ctx.save(); ctx.translate(lerp(W + 200, 1450, kt), 330); ctx.rotate(.05); ctx.fillStyle = '#efe4c8'; ctx.strokeStyle = '#3a2a18'; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(-190, -45, 380, 90, 8); ctx.fill(); ctx.stroke(); B.txt(ctx, 'OCT 29, 2026', 0, 2, 50, { align: 'center', w: 800 }); ctx.restore(); }
    ctx.restore(); },
  '8|China called it a smear': x => { const { ctx, t, T, cam, solo } = x, v = NR.view('tvCol', cam, .2), ts = W_(x, 'smear', .8);   // двое журналистов спиной у ТВ; на экране красная трибуна без лица, на «smear» плашка
    ctx.save(); shake(ctx, cam); NR.room(ctx, v, t, T, { solo, blur: 3, tv: { scene: NR.sceneBeijing, bug: 'NEWS', chyron: 'BEIJING: "A SMEAR"', chyronK: up(t, ts, .3), chyronSize: .09 }, backs: [{ look: [.2, -.6] }, { look: [-.2, -.6] }] }); ctx.restore(); },
  '8|Jensen said his contacts': x => { const { ctx, t, T, cam, solo } = x, v = NR.view('wide', cam, .3);   // общий редакция: на ТВ включается Дженсен; репортёр и редактор оборачиваются к экрану
    const on = clamp((t - .25) / .25), turn = up(t, .45, .4);
    ctx.save(); shake(ctx, cam);
    NR.room(ctx, v, t, T, { solo, tv: { scene: NR.sceneJensen, on, bug: 'NEWS', live: true }, rep: { look: [lerp(.2, .7, turn), lerp(.2, -.5, turn)], keys: [[0, 'neutral']] }, ed: { facing: 1, look: [lerp(-.3, .3, turn), lerp(.3, -.8, turn)], keys: [[0, 'neutral']] } });
    ctx.restore(); },
  '8|JENSEN: Completely normal': x => { const { ctx, t, T, cam, solo } = x, v = NR.view('tv', cam, .1);   // ТВ крупно: Дженсен в кожанке, цитата в плашке, строка новостей бежит
    ctx.save(); shake(ctx, cam);
    NR.room(ctx, v, t, T, { solo, blur: 6, tvBezel: true, tv: { scene: (c, w, h) => { c.save(); NR.sceneJensenTalk(c, w, h, t, T); c.restore(); }, bug: 'NEWS', chyron: '"COMPLETELY NORMAL AND NOT UNUSUAL"', chyronK: up(t, .15, .35), chyronSize: .058, ticker: 'NVIDIA CEO RESPONDS · TIES TO ALICE HUANG "ABOUT BUSINESS" · ', tickerRun: t } });
    ctx.restore(); },
  '8|In early November, the Times got hold': x => { const { ctx, t, T, cam, solo } = x, v = NR.view('ed', cam, .2), tm = W_(x, "memo's", 2.3);   // утёкшая папка (TOP SECRET, полосы ксерокса, COPY) — редактор раскрывает её в руках
    const op = E.inOutCubic(clamp((t - (tm - .35)) / .45)), FW = 330;
    ctx.save(); shake(ctx, cam);
    NR.room(ctx, v, t, T, { solo, blur: 3, ed: { keys: [[0, 'neutral']], look: [0, .55], tilt: .04, L: { k: 1, to: [1505 - FW * .3 * .6 + 0, 735] }, R: { k: 1, to: [1505 + FW * .3 * .6, 735] },
      under: (c, r) => { const P = toS(v, [1505, 700]), s = v.k * .6; c.save(); c.translate(P[0] - FW * s / 2, P[1] - FW * .78 * s / 2); B.tsFolder(c, FW * s, FW * .78 * s, { open: op, copy: true, inner: (cc, w, h) => B.memoPage(cc, w, h, { head: 'TOP SECRET', title: 'MEMORANDUM' }) }); c.restore(); } } });
    ctx.restore(); },
  '8|REPORTER: Beyond business': x => { const { ctx, t, T, cam, solo, s, d } = x, tw = s.whip?.t ?? d * .5, wu = inOutExpo((t - tw + .1) / WHIP_DUR);   // крупно репортёр: брови ползут вверх -> вип-пан -> редактор переворачивает страницу
    const va = NR.view('rep', { ...cam, dx: 0 }), vb = NR.view('ed', { ...cam, dx: 0 }), v = lerpView(va, vb, clamp(wu)), flip = E.inOutCubic(clamp((t - tw - .45) / .4)), FW = 330;
    ctx.save(); shake(ctx, cam);
    NR.room(ctx, v, t, T, { solo, blur: 3,
      rep: { keys: [[0, 'neutral'], [.35, 'nervous']], brows: t > .35 ? [lerp(0, 30, up(t, .35, .5)), .1] : null, look: [.6, 0] },
      ed: { keys: [[0, 'neutral']], look: [-.4, .3], L: { k: 1, to: [1505 - 60, 735] }, R: { k: 1, to: [1505 + 60 - 120 * Math.sin(Math.PI * flip) * .5, 735 - 40 * Math.sin(Math.PI * flip)] },
        under: (c) => { const P = toS(v, [1505, 700]), sc = v.k * .6; c.save(); c.translate(P[0] - FW * sc / 2, P[1] - FW * .78 * sc / 2); B.tsFolder(c, FW * sc, FW * .78 * sc, { open: 1, inner: (cc, w, h) => { B.memoPage(cc, w, h, { title: 'MEMORANDUM', line: '…BEYOND BUSINESS…', lineY: .4, k: 1 });
          if (flip > 0 && flip < 1) { cc.save(); cc.translate(w, 0); cc.scale(-Math.cos(Math.PI * flip), 1); cc.translate(-w, 0); cc.fillStyle = '#ece4d0'; cc.fillRect(w * .02, 0, w * .96, h); B.lines(cc, w * .1, h * .1, w * .8, 14, h * .06); cc.restore(); } } }); c.restore(); } } });
    ctx.restore(); },
  '8|That left one question': x => { const { ctx, t, cam, solo } = x, ta = W_(x, 'answer', 2.4);   // страница переворачивается: под ней снимок наблюдения — ужин через мокрое стекло; лампа гаснет, снимок в свете окна (OVER)
    if (solo) return; ctx.save(); shake(ctx, cam); const v = deskTop(ctx, cam);
    const flip = E.inOutCubic(clamp((t - .2) / .7)), cx = 960, cy = 560, w = 760, h = 560;
    B.sheet(ctx, cx, cy, w, h, -.02, (c, ww, hh) => { c.save(); c.translate(ww * .08, hh * .1); IN.snapPic && surveilPic(c, ww * .84, hh * .72); c.restore(); B.txt(c, 'SURVEILLANCE · SINGAPORE', ww * .08, hh * .9, hh * .045, { w: 800 }); });
    if (flip < 1) { ctx.save(); ctx.translate(cx - w / 2, cy); ctx.scale(Math.cos(Math.PI * flip) >= 0 ? Math.cos(Math.PI * flip) : Math.cos(Math.PI * flip), 1); ctx.translate(-(cx - w / 2), -cy);
      if (Math.cos(Math.PI * flip) > 0) B.sheet(ctx, cx, cy, w, h, -.02, (c, ww, hh) => B.memoPage(c, ww, hh, { title: 'MEMORANDUM', page: '1' })); else B.sheet(ctx, cx, cy, w, h, -.02, (c, ww, hh) => B.lines(c, ww * .1, hh * .1, ww * .8, 14, hh * .06)); ctx.restore(); }
    ctx.restore(); },
};
export const OVER = {
  '8|CNN reported that Rubio briefed': B.plaquesAt(560, 110, { skip: /UNITED STATES/ }),
  '8|That left one question': (ctx, s, t, d) => { const t0 = d * .6 - .2; if (t < t0 + .2) return;   // ядро гасит лампу на 0.6 длины плана (core lampOff)   // лампа ядра погасла: снимок остаётся в холодном свете окна
    const k = clamp((t - t0 - .2) / .3); ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = .55 * k; ctx.fillStyle = 'rgba(110,150,210,1)';
    ctx.beginPath(); ctx.moveTo(560, 250); ctx.lineTo(1420, 300); ctx.lineTo(1380, 860); ctx.lineTo(540, 820); ctx.closePath(); ctx.filter = 'blur(30px)'; ctx.fill(); ctx.restore();
    ctx.save(); ctx.globalAlpha = .85 * k; ctx.translate(960, 560); ctx.rotate(-.02); ctx.translate(-380 + 60.8, -280 + 56); surveilPic(ctx, 638.4, 403.2); ctx.fillStyle = 'rgba(60,90,150,.25)'; ctx.fillRect(0, 0, 638.4, 403.2); ctx.restore(); },
};
export const SKIP_PROPS = { '8|It was built on electronic surveillance': /LINE 2/, '8|It was Jensen Huang': /JENSEN HUANG/, '8|AIDE: Who gets a copy': /CLASSIFIED/, '8|CNN reported that Rubio briefed': /./, "8|The president has said he hadn't heard": /PRESIDENT/, '8|Then, on October 29, 2026': /OCT 29/, '8|China called it a smear': /SMEAR/, '8|JENSEN: Completely normal': /COMPLETELY/, '8|In early November, the Times got hold': /COPY|TOP SECRET/ };
export const RAIN = null;   // или s => true/false/undefined — переопределение дождя для планов главы
