// film/shots/ch06.js — постановка гл. 6 (владелец: рабочий A). Ключ плана — 'глава|начало текста' (film/keys.js).
// Контракт рабочего — film/README.md, «Работа по главам». Рисовальщик плана: x => {...}, x = { ctx, s, t, d, T, cam, camAt, solo, API }.
// Локации: L12 таможня (staging/customs.js), L09 Megaspeed (табло арендаторов), L04 Вашингтон (WA, ведущего), L06 Nvidia (NV, ведущего),
// L02 салон агентов (CAR, ведущего). 3D (путь коробки, дата-центр) — clips3d/ch06.js, нативные сцены.
import { clamp, lerp, E, gesture } from 'engine';
import { W, H, camView, toS, lerpView, cover } from '../staging/common.js';
import * as CAR from '../staging/car.js';
import * as IN from '../staging/inserts.js';
import * as PR from '../props.js';
import { inOutExpo, gauss, env, W_, W0, shake, whipPlates, focusBox, freezeFrame, candle, V, WHIP_DUR, wordAt, lineSpan } from './common.js';
import * as CU from '../staging/customs.js';
import * as PA from '../props_A.js';
import { WA } from '../staging/washington.js';
import { NV } from '../staging/nvidia.js';
import { official } from '../chars.js';
import { jensen } from 'engine';
import { aivresRep, customs, driver, smuggler, raider, person, shadeOf, pose, drawP, handS } from '../chars_A.js';
import { bodyPt } from '../staging/desk.js';

const CS = customs(), CS2 = customs(), DR = driver(), SM = smuggler(), RD = [0, 1, 2].map(raider), AV = aivresRep();
const CLERK = official({ name: 'blacklist', hair: 'bald', suit: ['#5a6070', '#343a48', '#1a1e28'], tie: ['#22304e', '#141c30'] });
const JH = jensen(); JH.spec.rig = { ...JH.spec.rig, armLayer: 'front' };
const whipU = (t, tw) => clamp(inOutExpo((t - tw + .1) / WHIP_DUR));
const SRC = { cx: 960, cy: 540, k: 1 };                                   // «вид 1:1»: координаты плейта = экран (для собранных кадров)

// ---------- кабина грузовика сбоку с водителем в окне ----------
// водитель целиком через обрезку: используем pose/drawP напрямую
function driverInCab(ctx, t, T, o) {
  const [cx, cy, w] = o.cab || [-60, 1590, 1452], h = w * 1.1, win = [cx + w * PA.CAB_WIN[0], cy - h + h * PA.CAB_WIN[1], w * PA.CAB_WIN[2], h * PA.CAB_WIN[3]];
  CU.gate(ctx, o.bg || { cx: 1300, cy: 640, k: 2.2 }, 8, o.solo);
  if (!o.solo) PA.cabSide(ctx, cx, cy, w, 'back');
  const s = 1.4 * w / 1452, seat = [win[0] + win[2] * .69, win[1] + win[3] + 189 * s];
  const P = pose(DR, t, T, { at: seat, fs: s, pin: 'seat', f: 1, view: 'threeQuarter', sp: 'DRIVER', keys: o.keys || [[0, 'smile']], look: o.look || [.6, 0], seed: 3, shade: shadeOf([1, -.6], '#ffc070'), R: o.R, L: { k: 1, to: [seat[0] + 30 * s, seat[1] - 90 * s] } });
  ctx.save(); ctx.beginPath(); ctx.rect(...win); ctx.clip(); drawP(ctx, P, SRC, 'base'); ctx.restore();
  if (!o.solo) PA.cabSide(ctx, cx, cy, w, 'front');
  ctx.save(); ctx.beginPath(); ctx.rect(...win); ctx.rect(win[0] + win[2] - 4, 0, W, win[1] + win[3]); ctx.clip(); drawP(ctx, P, SRC, 'front'); ctx.restore();
  const hr = handS(P, SRC, 'R'); if (o.heldR) o.heldR(ctx, hr, s);
  return { win, s, seat, hr };
}

export const SHOTS = {
  // ---------- Вашингтон: чёрный список ----------
  '6|that the United States had put': x => { const { ctx, t, T, cam, solo } = x, v = WA.view('cu', cam), tu = W_(x, 'United', .62), tb = W_(x, 'blacklist', 2.26);   // ВСТАВКА: на «United» папка INSPUR GROUP ложится на стол; на «blacklist» чиновник бьёт штамп BLACKLIST, толчок
    const drop = E.outBack(clamp((t - tu) / .3)), k = env(t, tb - .35, tb + .45, .22, .25);
    ctx.save(); shake(ctx, cam);
    WA.seated(ctx, v, t, T, { C: CLERK, solo, blur: 3, keys: [[0, 'neutral']], look: [.1, .5], R: { k, to: [1000, 800 - 30 * (1 - k)] },
      deskTop: (c, vv) => { if (drop <= 0) return; const P = toS(vv, [995, 800 - 120 * (1 - drop)]); folder(c, P[0], P[1], 150 * vv.k, 'INSPUR GROUP'); if (t > tb) PR.stampMark(c, P[0] + 6 * vv.k, P[1] + 2 * vv.k, 110 * vv.k, 'BLACKLIST', clamp((t - tb) / .12)); },
      heldR: k > .2 ? (c, P, s) => PR.rubberStamp(c, P[0], P[1] + 18 * s, 80 * s) : null });
    ctx.restore(); },
  "6|CLERK: Inspur? You're blacklisted": x => { const { ctx, t, T, cam, solo } = x, v = WA.view('mid', cam), tb = W_(x, 'blacklisted', 1.2);   // СРЕДНИЙ: палец чиновника ведёт по странице папки чёрного списка до строки INSPUR; на «blacklisted» штамп BLACKLISTED
    const run = E.inOutCubic(clamp(t / Math.max(.4, tb - .5))), k = env(t, tb - .3, tb + .5, .2, .25);
    ctx.save(); shake(ctx, cam);
    WA.seated(ctx, v, t, T, { C: CLERK, sp: 'CLERK', solo, keys: [[0, 'neutral']], look: [-.1, .55], L: { k: 1, to: [880, lerp(800, 822, run)] }, R: { k, to: [990, 800 - 30 * (1 - k)] },
      deskTop: (c, vv) => { const P = toS(vv, [905, 818]); binder(c, P[0], P[1], 230 * vv.k, run); const Q = toS(vv, [1010, 826]); folder(c, Q[0], Q[1], 150 * vv.k, 'INSPUR GROUP'); if (t > tb) PR.stampMark(c, Q[0], Q[1], 120 * vv.k, 'BLACKLISTED', clamp((t - tb) / .12)); },
      heldR: k > .2 ? (c, P, s) => PR.rubberStamp(c, P[0], P[1] + 18 * s, 80 * s) : null });
    ctx.restore(); },
  "6|REP: I'm Aivres. California": x => { const { ctx, t, T, cam, solo } = x, v = camView({ cx: 1060, cy: 560, k: 2.5 }, cam, .1), tc = W_(x, 'California', .98);   // ОБРАТНАЯ: представитель у двери, на груди бейдж AIVRES · CALIFORNIA криво поверх старого — торчит INSP…; на «California» хлопает по бейджу
    const pat = env(t, tc - .25, tc + .35, .18, .25);
    ctx.save(); shake(ctx, cam);
    WA.revPlate(ctx, v, 0, solo);
    const r = WA.standing(ctx, v, t, T, { C: AV, rev: true, at: 'door', sp: 'REP', solo, view: null, keys: [[0, 'smile']], look: [0, 0], R: { k: pat, to: [1040, 540] } });
    if (!solo) { const q = bodyPt(AV.spec, r.p, [36, -470]), c = toS(v, [1060 + q[0] * .5, 790 + q[1] * .5]); repBadge(ctx, c[0], c[1], 120 * r.s, t); }
    WA.revFront(ctx, v, 0, solo);
    ctx.restore(); },
  '6|CLERK: Then welcome, Aivres': x => { const { ctx, t, T, cam, solo } = x, v = WA.view('cu', cam), ta = W_(x, 'Aivres', 1.02);   // КРУПНО чиновник: сверяет список — строки AIVRES нет; на «Aivres» штамп APPROVED
    const k = env(t, ta - .3, ta + .5, .2, .25);
    ctx.save(); shake(ctx, cam);
    WA.seated(ctx, v, t, T, { C: CLERK, sp: 'CLERK', solo, blur: 3, keys: [[0, 'neutral']], look: [-.05, .5], L: { k: 1, to: [880, lerp(806, 826, clamp(t / .9))] }, R: { k, to: [1000, 800 - 30 * (1 - k)] },
      deskTop: (c, vv) => { const P = toS(vv, [900, 818]); listSheet(c, P[0], P[1], 170 * vv.k); const Q = toS(vv, [1010, 824]); PA.sheet(c, Q[0], Q[1], 120 * vv.k, -.05, ['AIVRES · CA'], { h: 70 * vv.k }); if (t > ta) PR.stampMark(c, Q[0], Q[1], 110 * vv.k, 'APPROVED', clamp((t - ta) / .12)); },
      heldR: k > .2 ? (c, P, s) => PR.rubberStamp(c, P[0], P[1] + 18 * s, 80 * s) : null });
    ctx.restore(); },
  // ---------- таможня: грузовик с накладной ----------
  '6|CUSTOMS: Destination, please': x => { const { ctx, t, T, cam, solo } = x, v = camView(CU.views.wide, cam, .25), tp = W_(x, 'please', .96);   // ОБЩИЙ пост: грузовик подъезжает к шлагбауму; таможенник в окне будки
    const y = lerp(1180, 800, E.outCubic(clamp(t / Math.max(.4, tp))));
    ctx.save(); shake(ctx, cam); CU.gate(ctx, v, 0, solo); CU.arm(ctx, v, 0, solo);
    CU.officer(ctx, CS, v, t, T, { solo, f: -1, look: [-.6, .1] });
    CU.truckAt(ctx, v, y, { solo, lights: 1 });
    ctx.restore(); },
  '6|DRIVER: Malaysia, sir': x => { const { ctx, t, T, solo } = x;   // КРУПНО водитель (статично): протягивает накладную в окно будки
    const out = E.outBack(clamp((t - .1) / .4));
    driverInCab(ctx, t, T, { solo, R: { k: 1, to: [lerp(1000, 1250, out), lerp(640, 520, out)] }, look: [.7, -.05], keys: [[0, 'smile']],
      heldR: (c, h, s) => PA.waybill(c, h[0] + 80 * s, h[1] - 70 * s, 200 * s, .12) }); },
  '6|CUSTOMS: Final destination': x => { const { ctx, t, T, cam, solo, s } = x, tw = s.whip?.t ?? 1.36, td = W_(x, 'destination', .32), tm = W_(x, 'Malaysia', 1.74);   // СРЕДНИЙ таможенник листает накладную -> вип-пан -> водитель широко улыбается; на «Malaysia» на накладную падает штамп MALAYSIA
    const page = E.inOutCubic(clamp((t - td) / .4));
    whipPlates(ctx, t, tw,
      () => { const v = camView(CU.views.booth, { ...cam, dx: 0 }, .1); CU.gate(ctx, v, 0, solo);
        const r = CU.officer(ctx, CS, v, t, T, { solo, f: -1, look: [-.2, .6], view: null, L: { k: 1, to: [1470, 668] }, R: { k: 1, to: [1535, 664] } });
        if (!solo) { const P = toS(v, [1500, 672]); ctx.save(); ctx.translate(P[0], P[1]); ctx.scale(1, .5); PA.waybill(ctx, 0, 0, 170 * v.k * .45, 0, { page }); ctx.restore(); } void r; },
      () => { driverInCab(ctx, t, T, { solo, cab: [-160, 1640, 1500], keys: [[0, 'laugh']], look: [.5, -.05], R: { k: 1, to: [1260, 500] },
        heldR: (c, h, sc) => PA.waybill(c, h[0] + 80 * sc, h[1] - 70 * sc, 220 * sc, .1, { stamps: [{ text: 'MALAYSIA', u: t > tm ? clamp((t - tm) / .5) + .01 : 0, y: 40 * sc }] }) }); });
  },
  '6|CUSTOMS: Enjoy your stay': x => { const { ctx, t, T, cam, solo } = x, v = camView(CU.views.stamp, cam, .1), te = Math.max(.12, W_(x, 'Enjoy', 0) + .12);   // ВСТАВКА штамп: удар штампом по накладной на стойке, толчок; шлагбаум поднимается
    const k = env(t, te - .22, te + .25, .16, .2), up = E.inOutCubic(clamp((t - te - .2) / .9));
    ctx.save(); shake(ctx, cam); CU.gate(ctx, v, 0, solo); CU.arm(ctx, v, up, solo);
    CU.officer(ctx, CS, v, t, T, { solo, f: -1, view: null, look: [-.1, .7], R: { k: 1, to: [1450, 668 - 40 * (1 - k)] }, L: { k: 1, to: [1520, 670] },
      heldR: (c, h, s) => PR.rubberStamp(c, h[0], h[1] + 18 * s, 80 * s) });
    if (!solo) { const P = toS(v, [1420, 672]); ctx.save(); ctx.translate(P[0], P[1]); ctx.scale(1, .5); PA.waybill(ctx, 0, 0, 80 * v.k, -.05, { stamps: [{ text: 'CLEARED', u: t > te ? .3 + clamp((t - te) / .5) : 0, y: 10 * v.k }] }); ctx.restore(); }
    ctx.restore(); },
  // ---------- табло арендаторов ----------
  '6|all flowing to one company': x => { const { ctx, t, cam, solo } = x, tf = W_(x, 'flowing', .16), tn = W_(x, 'never', 2.48);   // ВСТАВКА табло арендаторов в фойе: стрелки со всех строк стекают вниз к одной; на «never» внизу тусклая строка MEGASPEED · 12F
    if (solo) return; const z = cam.z, down = E.inOutCubic(clamp(t / (x.d * .8)));
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1a1410'); g.addColorStop(1, '#0a0806'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.fillStyle = 'rgba(255,200,130,.12)'; ctx.beginPath(); ctx.ellipse(W / 2, 0, 900, 500, 0, 0, 6.283); ctx.fill(); ctx.restore();
    const rows = [['40F', null], ['38F', null], ['36F', null], ['33F', null], ['30F', null], ['27F', null], ['24F', null], ['21F', null], ['18F', null], ['15F', null], ['12F', 'MEGASPEED']];
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2 - lerp(-80, 520, down));
    PA.tenantBoard(ctx, W / 2, 900, 900, rows, clamp((t - tf) / 2), t > tn ? (t < tn + .08 ? 1 : t < tn + .14 ? .3 : 1) : 0);
    ctx.restore(); },
  // ---------- Nvidia: «мы пересчитали» ----------
  '6|Jensen later said Nvidia': x => { const { ctx, t, T, cam, solo } = x, v = NV.view('cu', cam), td = W_(x, 'deployments', 2.5), to = W_(x, 'one', 4.27);   // КРУПНО Дженсен жмёт счётчик-кликер, иконки чипов отмечаются одна за другой; на «one» последний щелчок
    const clicks = [td, ...[0, 1, 2, 3, 4].map(i => lerp(td + .35, to - .25, i / 4)), to], n = clicks.filter(q => t >= q).length, press = Math.max(...clicks.map(q => gauss(t, q, .05)));
    ctx.save(); shake(ctx, cam);
    NV.seated(ctx, v, t, T, { C: JH, sp: 'JENSEN', solo, blur: 3, keys: [[0, 'neutral']], look: [.15, .35], R: { k: 1, to: [985, 640] },
      deskTop: (c, vv) => { const P = toS(vv, [905, 688]); chipChecks(c, P[0], P[1], 140 * vv.k, n, clicks.length); },
      heldR: (c, P, s) => tally(c, P[0], P[1] - 4 * s, 34 * s, press, n) });
    ctx.restore(); },
  // ---------- таможня: контрабандисты ----------
  "6|That's what made it so hard": x => { const { ctx, t, T, cam, solo } = x, v = camView({ cx: 1340, cy: 640, k: 1.55 }, cam, .25), tc = W_(x, 'catch', 1.48);   // ОБЩИЙ пост: контрабандист с раздутым чемоданом у стойки; на «catch» озирается
    const look = t < tc ? .5 : Math.sin((t - tc) * 11) * .8;
    ctx.save(); shake(ctx, cam); CU.gate(ctx, v, 0, solo); CU.arm(ctx, v, 0, solo);
    CU.officer(ctx, CS, v, t, T, { solo, f: -1, look: [-.5, .2] });
    if (!solo) { const P = toS(v, [1180, 796]); PA.suitcase(ctx, P[0], P[1], 120 * v.k, t); }
    CU.standAt(ctx, SM, v, t, T, { at: [1265, 796], f: 1, keys: [[0, 'nervous']], look: [look, .05], solo, L: { k: 1, to: [1205, 735] } });
    ctx.restore(); },
  '6|Ordinary smugglers sweat': x => { const { ctx, t, T, cam, solo } = x, v = camView({ cx: 1310, cy: 610, k: 3.3 }, cam, .1), ts = W_(x, 'sweat', .72), tc = W_(x, 'caught', 2.74);   // КРУПНО контрабандист потеет: на «sweat» капля падает на накладную; на «caught» чемодан лопается, рука таможенника ложится на плечо
    const grab = E.outBack(clamp((t - tc + .05) / .25)), burst = clamp((t - tc) / .5);
    ctx.save(); shake(ctx, cam); CU.gate(ctx, v, 4, solo);
    const r = CU.officer(ctx, CS, v, t, T, { solo, f: -1, look: [-.6, .2], at: [1470, 770], out: 'L', L: { k: grab, to: [1335, 640] } });
    const P = CU.standAt(ctx, SM, v, t, T, { at: [1290, 800], f: 1, keys: [[0, 'nervous'], [tc + .05, 'shock']], look: [lerp(-.2, .5, grab), .1], solo, shadow: false,
      R: { k: 1, to: [1330, 700] }, held: { R: (c, h, s) => PA.waybill(c, h[0] + 20 * s, h[1] - 40 * s, 120 * s, .15) } });
    if (!solo) { for (let i = 0; i < 4; i++) { const ph = ((t * .9 + i * .27) % 1), q = toS(v, [1262 + i * 16, 560 + ph * 30]); PA.drop(ctx, q[0], q[1], 9 * (1 - ph * .5)); }
      const u = (t - ts) / .5; if (u > 0 && u < 1) { const q = toS(v, [1300, lerp(565, 680, u * u)]); PA.drop(ctx, q[0], q[1], 16); }
      if (t > ts + .5) { const q = toS(v, [1338, 690]); ctx.save(); ctx.fillStyle = 'rgba(80,120,160,.35)'; ctx.beginPath(); ctx.ellipse(q[0], q[1], 14 * v.k * .3, 9 * v.k * .3, 0, 0, 6.283); ctx.fill(); ctx.restore(); }
      const S = toS(v, [1395, 668]); PA.suitcase(ctx, S[0], S[1], 120 * v.k * .6, t, burst); }
    void P; ctx.restore(); },
  '6|In 2023, Hong Kong customs found': x => { const { ctx, t, cam, solo } = x, ts = W_(x, 'seventy', 2.72);   // ВСТАВКА ящик с живыми лобстерами, среди них видеокарты; на «seventy» бирка 70 GPUs
    if (solo) return; const z = cam.z; CU.gate(ctx, { cx: 1300, cy: 700, k: 1.6 }, 8);
    ctx.save(); ctx.translate(W / 2, H / 2 + 120); ctx.scale(z, z);
    PA.crate(ctx, 0, 330, 1000, 360, { lid: 1, d: 420, inside: (c, w, d) => { c.fillStyle = '#3a4a52'; c.fillRect(0, 0, w + 200, d); c.fillStyle = 'rgba(220,240,250,.25)'; for (let i = 0; i < 40; i++) { c.beginPath(); c.arc((i * 97) % (w + 160), (i * 53) % d, 14, 0, 6.283); c.fill(); }
      PA.gpu(c, w * .3, d * .35, 230, .3); PA.gpu(c, w * .7, d * .6, 230, -.4); PA.gpu(c, w * .55, d * .25, 200, .1);
      PA.lobster(c, w * .2, d * .7, .7, -1.2, t); PA.lobster(c, w * .62, d * .45, .75, 1.4, t + 1); PA.lobster(c, w * .9, d * .3, .6, 2.6, t + 2); } });
    const sw = t > ts ? Math.sin((t - ts) * 8) * Math.exp(-(t - ts) * 2) * .3 : 0, k = E.outBack(clamp((t - ts) / .3));
    if (k > 0) PA.hangTag(ctx, 300, 30 - 200 * (1 - k), 300, sw, '70 GPUs');
    ctx.restore(); },
  '6|packed among live lobsters': x => { const { ctx, t, cam, solo } = x, tl = W_(x, 'lobsters', 1.0);   // СВЕРХКРУПНО: на «lobsters» крышка ящика открывается — лобстер клешнёй сжимает видеокарту
    if (solo) return; const z = cam.z, op = E.inOutCubic(clamp((t - (tl - .2)) / .4));
    ctx.fillStyle = '#2a3a42'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = 'rgba(220,240,250,.22)'; for (let i = 0; i < 80; i++) { ctx.beginPath(); ctx.arc((i * 211) % W, (i * 137) % H, 26, 0, 6.283); ctx.fill(); }
    ctx.save(); ctx.translate(W / 2, H / 2 + 80); ctx.scale(z, z);
    PA.gpu(ctx, 260, -330, 520, -.5); PA.lobster(ctx, -60, 60, 2.2, .35, t, .15);
    ctx.restore();
    ctx.save(); const g = ctx.createRadialGradient(W / 2, H * .3, 0, W / 2, H * .3, 900 * op + 1); g.addColorStop(0, `rgba(255,240,200,${.25 * op})`); g.addColorStop(1, 'rgba(255,240,200,0)'); ctx.fillStyle = g; ctx.globalCompositeOperation = 'screen'; ctx.fillRect(0, 0, W, H); ctx.restore();
    if (op < 1) { ctx.save(); ctx.translate(0, -H * 1.05 * op); ctx.fillStyle = '#8a6038'; ctx.fillRect(-20, -20, W + 40, H + 40); for (let i = 1; i < 6; i++) PA.inkLine(ctx, [[0, i * H / 6], [W, i * H / 6 + 10]], 6, '#3a2410'); ctx.fillStyle = 'rgba(255,240,200,.85)'; ctx.fillRect(0, H + 10, W, 14); ctx.restore(); } },
  '6|Another ring, broken up': x => { const { ctx, t, T, cam, solo } = x, v = camView({ cx: 1150, cy: 650, k: 1.35 }, cam, .25);   // ОБЩИЙ рейд таможни: таможенники в жилетах выносят ящики
    const lift = E.outCubic(clamp(t / .6));
    ctx.save(); shake(ctx, cam); CU.gate(ctx, v, 0, solo); CU.arm(ctx, v, 0, solo);
    if (!solo) for (const [x0, y0, n] of [[1350, 800, 3], [1460, 805, 2], [1240, 812, 2]]) for (let i = 0; i < n; i++) { const P = toS(v, [x0, y0 - i * .55 * CU.mAt(y0) * .9]); PA.crate(ctx, P[0], P[1], .9 * CU.mAt(y0) * v.k, .55 * CU.mAt(y0) * v.k, { d: 30 * v.k, label: 'SEIZED' }); }
    const y = 900, cr = CU.mAt(y);
    CU.standAt(ctx, RD[0], v, t, T, { at: [900, y], f: 1, keys: [[0, 'neutral']], look: [.5, .2], solo, R: { k: 1, to: [990, y - 300 * .9 * CU.fsAt(y) - 40 * lift] } });
    if (!solo) { const P = toS(v, [1040, y - 300 * .9 * CU.fsAt(y) + 70 - 40 * lift]); PA.crate(ctx, P[0], P[1], 1.0 * cr * v.k, .55 * cr * v.k, { d: 30 * v.k }); }
    CU.standAt(ctx, RD[1], v, t, T, { at: [1180, y + 6], f: -1, keys: [[0, 'neutral']], look: [-.5, .2], solo, L: { k: 1, to: [1090, y - 300 * .9 * CU.fsAt(y) - 40 * lift] } });
    CU.standAt(ctx, RD[2], v, t, T, { at: [700, 820], f: 1, keys: [[0, 'neutral']], look: [.6, 0], solo, R: { k: 1, to: [760, 700] }, held: { R: (c, h, s) => clipboardB(c, h, s) } });
    ctx.restore(); },
  '6|Prosecutors charged one Chinese': x => { const { ctx, t, T, cam, solo } = x, v = camView({ cx: 1000, cy: 700, k: 2.0 }, cam, .1), tp = Math.min(1.0, x.d * .45);   // ВСТАВКА задержание: таможенник вскрывает ящик ломом — внутри сервер
    const pry = E.inOutCubic(clamp(t / tp)), pop = clamp((t - tp) / .3), y = 900;
    ctx.save(); shake(ctx, cam); CU.gate(ctx, v, 4, solo);
    if (!solo) { const P = toS(v, [900, y]), m = CU.mAt(y) * v.k; PA.crate(ctx, P[0], P[1], 1.2 * m, .6 * m, { lid: pop, d: .5 * m, label: 'SEIZED', inside: (c, w, d) => { if (pop > 0) PA.serverTop(c, w, d); } }); }
    const tip = toS(v, [960 - 30 * pry, y - .6 * CU.mAt(y) - 12]);
    CU.standAt(ctx, RD[0], v, t, T, { at: [1080, y + 10], f: -1, keys: [[0, 'neutral']], look: [-.6, .5], lean: -.08 - .06 * pry, solo,
      L: { k: 1, to: [1000, y - .6 * CU.mAt(y) - 40 + 20 * pry] }, R: { k: 1, to: [1030, y - .6 * CU.mAt(y) - 70 + 30 * pry] }, held: { L: (c, h, s) => PA.crowbar(c, tip[0], tip[1], s * 1.4, Math.atan2(h[1] - tip[1], h[0] - tip[0])) } });
    ctx.restore(); },
  '6|over nine hundred and seventeen': x => { const { ctx, t, T, cam, solo } = x, v = camView({ cx: 900, cy: 640, k: 1.25 }, cam, .25), tn = W_(x, 'nine', .5), ts = W_(x, 'smuggled', 1.64);   // ОБЩИЙ ряды изъятых серверов: на «nine» бирка 917 SERVERS SEIZED; на «smuggled» штамп SEIZED на ящик
    ctx.save(); shake(ctx, cam); CU.gate(ctx, v, 0, solo); CU.arm(ctx, v, 0, solo);
    if (!solo) { for (let r = 0; r < 6; r++) { const y = 690 + r * 42, m = CU.mAt(y); for (let c = -3; c <= 3; c++) { const P = toS(v, [CU.laneX(y, -.03) - 20 + c * 1.25 * m, y]); PA.crate(ctx, P[0], P[1], 1.05 * m * v.k, .55 * m * v.k, { d: .25 * m * v.k }); } }
      const fy = 940, fm = CU.mAt(fy), F = toS(v, [820, fy]); PA.crate(ctx, F[0], F[1], 1.2 * fm * v.k, .62 * fm * v.k, { d: .3 * fm * v.k });
      PA.stampMark(ctx, F[0], F[1] - .3 * fm * v.k, .8 * fm * v.k, 'SEIZED', -.1, t - ts);
      const k = E.outBack(clamp((t - tn) / .3)); if (k > 0) PA.hangTag(ctx, F[0] + .35 * fm * v.k, F[1] - .62 * fm * v.k - 200 * (1 - k), 330, Math.sin(t * 3) * .05, '917 SERVERS SEIZED'); }
    ctx.restore(); },
  '6|This operation never had to sweat': x => { const { ctx, t, T, cam, solo } = x, v = camView({ cx: 1080, cy: 640, k: 1.5 }, cam, .3);   // СРЕДНИЙ: за спиной задержанного контрабандиста спокойно проезжает грузовик под поднятым шлагбаумом
    const y = lerp(860, 690, E.inOutSine(clamp(t / x.d)));
    ctx.save(); shake(ctx, cam); CU.gate(ctx, v, 0, solo); CU.arm(ctx, v, 1, solo);
    CU.truckAt(ctx, v, y, { solo, lights: 1 });
    if (!solo) { const P = toS(v, [1205, 800]); PA.suitcase(ctx, P[0], P[1], 120 * v.k, t, 1); }
    const sm = CU.standAt(ctx, SM, v, t, T, { at: [1270, 802], f: 1, keys: [[0, 'nervous']], look: [-.4, .1], solo });
    CU.standAt(ctx, CS2, v, t, T, { at: [1360, 806], f: -1, view: 'threeQuarter', keys: [[0, 'neutral']], look: [-.5, .1], solo, L: { k: 1, to: [1290, 655] } });
    void sm; ctx.restore(); },
  // ---------- салон агентов ----------
  '6|But in the eyes of American intelligence': x => { const { ctx, t, T, cam, solo } = x, v = camView(CAR.views.a2, cam, .3), ta = W_(x, 'American', .72);   // СРЕДНИЙ салон: на накладную в руке AGENT 2 ложится снимок «Дженсен + Алиса»; накладная уходит в тень
    const land = E.outBack(clamp((t - (ta - .3)) / .3));
    ctx.save(); shake(ctx, cam);
    CAR.car(ctx, v, t, T, { solo, reelsAng: T * 3.2,
      a2: { keys: [[0, 'neutral']], look: [-.3, .5], hold: { k: 1, at: [-150, -470] }, held: (c, P, sc) => { PA.waybill(c, P[0] - 120 * sc, P[1] - 40 * sc, 230 * sc, -.12);
        if (land > 0) PR.polaroid(c, P[0] - 115 * sc, P[1] - 60 * sc - 160 * sc * (1 - land), 260 * sc, -.05, IN.snapPic, 1);
        if (t > ta) { c.save(); c.globalAlpha = .35 * clamp((t - ta) / .5); c.fillStyle = '#000'; c.fillRect(P[0] - 240 * sc, P[1] + 30 * sc, 240 * sc, 120 * sc); c.restore(); } } },
      a1: { keys: [[0, 'neutral']], look: [.5, .35] } });
    ctx.restore(); },
  '6|the chips were never the real prize': x => { const { ctx, t, cam, solo } = x, tc = W_(x, 'chips', .06), tp = W_(x, 'prize', 1.2);   // ВСТАВКА снимок на накладной: камера въезжает в снимок; на «chips» накладная съезжает вниз из кадра; на «prize» остаётся лицо на снимке
    if (solo) return; const z = cam.z * lerp(1, 1.8, E.inOutCubic(clamp(t / (tp + .3)))), slide = E.inCubic(clamp((t - tc) / .7));
    CAR.car(ctx, { cx: 820, cy: 760, k: 2.6 }, t, t, { solo: false, reelsAng: t * 3.2, a1: { hidden: true }, a2: { hidden: true } });
    ctx.save(); ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(0, 0, W, H); ctx.restore();
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
    PA.waybill(ctx, 1020, 560 + 900 * slide, 560, .08);
    PR.polaroid(ctx, 900, 500, 760, -.05, IN.snapPic, 1);
    ctx.restore(); },
};
// ---------- мелкий реквизит главы ----------
function folder(c, x, y, w, label) { c.save(); c.translate(x, y); c.scale(1, .55); PA.rrect(c, -w / 2, -w * .36, w, w * .72, w * .03, '#C9A060', '#141014', w * .02); PA.rrect(c, -w * .42, -w * .46, w * .3, w * .12, w * .02, '#C9A060', '#141014', w * .02); PA.label(c, label, 0, 0, w * .11, '#1c140c', { weight: 900 }); c.restore(); }
function binder(c, x, y, w, run) { c.save(); c.translate(x, y); c.scale(1, .55); PA.rrect(c, -w / 2, -w * .62, w, w * 1.24, w * .02, '#F4EFE2', '#141014', w * .015); PA.label(c, 'TRADE BLACKLIST', 0, -w * .5, w * .08, '#1c140c', { weight: 900 });
  for (let i = 0; i < 9; i++) { const yy = -w * .36 + i * w * .1; c.fillStyle = 'rgba(40,40,60,.4)'; c.fillRect(-w * .4, yy, w * (.5 + (i % 3) * .1), w * .02); }
  const yi = -w * .36 + 6 * w * .1; PA.label(c, 'INSPUR', -w * .4, yi + w * .01, w * .09, '#1c140c', { weight: 900, align: 'left' }); if (run > .8) { c.strokeStyle = '#c8302a'; c.lineWidth = w * .02; c.beginPath(); c.ellipse(-w * .22, yi, w * .24, w * .07, 0, 0, 6.283); c.stroke(); } c.restore(); }
function listSheet(c, x, y, w) { c.save(); c.translate(x, y); c.scale(1, .55); PA.rrect(c, -w / 2, -w * .62, w, w * 1.24, w * .02, '#F4EFE2', '#141014', w * .015); PA.label(c, 'BLACKLIST', 0, -w * .5, w * .09, '#1c140c', { weight: 900 });
  ['HUAWEI', 'INSPUR', 'SMIC', '...'].forEach((s, i) => PA.label(c, s, -w * .38, -w * .3 + i * w * .14, w * .085, '#2a2018', { weight: 800, align: 'left' })); c.restore(); }
// бейдж Aivres поверх старого: из-под края торчит «INSP…»
function repBadge(c, x, y, w, t) { c.save(); c.translate(x, y); PA.rrect(c, -w / 2 - w * .08, -w * .3, w, w * .62, w * .05, '#F2EEE2', '#141014', w * .025); PA.label(c, 'INSP', -w * .25, w * .22, w * .2, '#1c140c', { weight: 900 });
  c.rotate(-.12); PA.rrect(c, -w / 2, -w * .42, w, w * .6, w * .05, '#F8F6EE', '#141014', w * .025); c.fillStyle = '#2a6a9a'; c.fillRect(-w / 2 + w * .04, -w * .38, w * .92, w * .18);
  PA.label(c, 'AIVRES', 0, -w * .29, w * .14, '#ffffff', { weight: 900, font: "Bahnschrift, 'Segoe UI', sans-serif" }); PA.label(c, 'CALIFORNIA', 0, -w * .04, w * .12, '#1c140c', { weight: 900, maxW: w * .9 }); c.restore(); void t; }
function clipboardB(c, h, s) { c.save(); c.translate(h[0] + 10 * s, h[1] - 30 * s); c.rotate(-.1); PA.rrect(c, -50 * s, -66 * s, 100 * s, 132 * s, 6 * s, '#8a6a42', '#141014', 4 * s); PA.rrect(c, -42 * s, -54 * s, 84 * s, 110 * s, 3 * s, '#F2EEE2', null); c.restore(); }
// кликер-счётчик в кисти: w — ширина, press — нажатие, n — счёт
function tally(c, x, y, w, press, n) { c.save(); c.translate(x, y); PA.rrect(c, -w / 2, -w * .55, w, w * 1.1, w * .3, '#b8bec8', '#141014', w * .06); PA.rrect(c, -w * .3, -w * .3, w * .6, w * .28, w * .05, '#1a1a1e', null);
  PA.label(c, String(n).padStart(3, '0'), 0, -w * .16, w * .2, '#9dffb5', { weight: 900 }); PA.rrect(c, w * .3, -w * .9 + press * w * .15, w * .26, w * .4, w * .08, '#c8302a', '#141014', w * .05); c.restore(); }
// лист иконок чипов на столе: n отмечено галочкой
function chipChecks(c, x, y, w, n, N) { c.save(); c.translate(x, y); c.scale(1, .55); PA.rrect(c, -w / 2, -w * .6, w, w * 1.2, w * .02, '#F4EFE2', '#141014', w * .02);
  for (let i = 0; i < N; i++) { const cx = -w * .3 + (i % 3) * w * .3, cy = -w * .36 + Math.floor(i / 3) * w * .34; c.fillStyle = '#1f9a4c'; c.fillRect(cx - w * .09, cy - w * .09, w * .18, w * .18); c.strokeStyle = '#141014'; c.lineWidth = w * .015; c.strokeRect(cx - w * .09, cy - w * .09, w * .18, w * .18);
    if (i < n) PA.inkLine(c, [[cx - w * .08, cy], [cx - w * .02, cy + w * .07], [cx + w * .1, cy - w * .1]], w * .04, '#c8302a'); } c.restore(); }

export const OVER = {
  // #204 поверх шаблона T-number: бок коробки из пути коробки (серийник тот же), на «two» трафарет NEARLY $2 BILLION, на «Nvidia's» рывок-отъезд — одна коробка в стене таких же
  '6|One count put the haul': (ctx, s, t, d) => { const wt = (re, fb) => { const a = wordAt(re, s.start, s.end); return a == null ? fb : a - s.start; };
    const t2 = wt('two', 1.58), tn = wt("Nvidia's", 3.08), spray = clamp((t - t2) / .45), pull = E.outExpo(clamp((t - tn) / .4)), z = lerp(8.2 + .3 * clamp(t / tn), 1, pull);
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#10141c'); g.addColorStop(1, '#06080c'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(z, z);
    const cw = 230, ch = 190;
    for (let r = -4; r <= 4; r++) for (let c = -6; c <= 6; c++) { const hero = !r && !c; if (z > 4 && !hero && Math.abs(r) + Math.abs(c) > 2) continue;
      boxFace(ctx, c * cw, r * ch, cw - 10, ch - 10, hero ? spray : 0, hero ? 0 : 1 + (r * 7 + c * 3 + 40) % 9); }
    ctx.restore();
    const vg = ctx.createRadialGradient(W / 2, H / 2, H * .3, W / 2, H / 2, H * .95); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(0,0,0,${.35 + .25 * pull})`); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  },
};
export const SKIP_PROPS = {
  '6|that the United States had put': /INSPUR|BLACKLIST/, "6|CLERK: Inspur? You're blacklisted": /BLACKLISTED|INSPUR/, "6|REP: I'm Aivres. California": /AIVRES|INSP/,
  '6|CUSTOMS: Final destination': /MALAYSIA/, '6|all flowing to one company': /MEGASPEED/, '6|In 2023, Hong Kong customs found': /70 GPU/, '6|over nine hundred and seventeen': /917|SEIZED/, '6|One count put the haul': /NEARLY|$2 BILLION/,
};
export const RAIN = s => (/L09|L10|L12/.test(s.loc) ? false : undefined);   // в офисе, баре и на таможне дождя поверх кадра нет

// бок коробки пути коробки (картон, зелёная полоса, белая бирка SN 4XG-2207-1193); stencil 0..1 — трафарет NEARLY $2 BILLION проявляется слева направо
function boxFace(c, x, y, w, h, stencil = 0, n = 0) {
  c.save(); c.translate(x, y);
  const g = c.createLinearGradient(0, -h / 2, 0, h / 2); g.addColorStop(0, '#CDA06A'); g.addColorStop(1, '#A87C4A'); c.fillStyle = g; c.fillRect(-w / 2, -h / 2, w, h);
  c.fillStyle = '#3ea85a'; c.fillRect(-w * .1, -h / 2, w * .2, h); c.strokeStyle = '#141014'; c.lineWidth = 3; c.strokeRect(-w / 2, -h / 2, w, h);
  c.fillStyle = '#F4F1E8'; c.fillRect(w * .16, -h * .3, w * .28, h * .2); c.strokeRect(w * .16, -h * .3, w * .28, h * .2);
  c.fillStyle = '#141014'; c.font = `800 ${Math.round(h * .045)}px 'Courier New', monospace`; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText('SN 4XG-2207-' + String(1193 + n * 17).padStart(4, '0'), w * .18, -h * .25, w * .25);
  for (let i = 0; i < 18; i++) c.fillRect(w * .18 + i * w * .013, -h * .19, i % 3 ? w * .005 : w * .008, h * .06);
  c.fillStyle = 'rgba(0,0,0,.1)'; c.fillRect(-w / 2, h * .38, w, h * .12);
  if (stencil > 0) { c.save(); c.beginPath(); c.rect(-w / 2, -h / 2, w * stencil, h); c.clip(); c.fillStyle = 'rgba(245,240,225,.95)'; c.textAlign = 'center';
    c.font = `900 ${Math.round(h * .12)}px Stencil, 'Bahnschrift', 'Arial Black', sans-serif`; c.fillText('NEARLY', -w * .02, h * .08); c.font = `900 ${Math.round(h * .17)}px Stencil, 'Bahnschrift', 'Arial Black', sans-serif`; c.fillText('$2 BILLION', -w * .02, h * .26, w * .9);
    c.globalAlpha = .25; c.filter = 'blur(2px)'; c.fillText('$2 BILLION', -w * .02, h * .26, w * .9); c.restore(); }
  c.restore();
}
