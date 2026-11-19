// film/shots/ch03.js — постановка гл. 3 (владелец: ведущий). Ключ плана — 'глава|начало текста' (film/keys.js).
// Контракт рабочего — film/README.md, «Работа по главам». Рисовальщик плана: x => {...}, x = { ctx, s, t, d, T, cam, camAt, solo, API }.
import { clamp, lerp, E, gesture } from 'engine';
import { W, H, camView, toS, lerpView, cover } from '../staging/common.js';
import * as R from '../staging/restaurant.js';
import * as CAR from '../staging/car.js';
import * as OF from '../staging/office.js';
import * as KY from '../staging/kentucky.js';
import * as IN from '../staging/inserts.js';
import * as DT from '../staging/desktop.js';
import * as PR from '../props.js';
import { WA } from '../staging/washington.js';
import { NV } from '../staging/nvidia.js';
import { BJ } from '../staging/beijing.js';
import { silhouette } from '../staging/desk.js';
import * as B from '../props_B.js';
import * as PA from '../props_A.js';
import { official, aide, officer } from '../chars.js';
import { person } from '../chars_B.js';
import { jensen, noirShade } from 'engine';

const OFFICIAL = official(), JH = jensen(), OFF1 = officer(), OFF2 = officer(), ASSIST = aide();
for (const C of [JH]) C.spec.rig = { ...C.spec.rig, armLayer: 'front' };
import { inOutExpo, gauss, env, W_, W0, shake, whipPlates, focusBox, freezeFrame, candle, V, WHIP_DUR, wordAt, lineSpan } from './common.js';


// ---- Пекин/Вашингтон: точки плейтов и мелочи (ведущий) ----
const BJ_LAMP = [960, 225], BJ_BOX = [720, 790], BJ_SH = { L: [858, 650], R: [952, 650] }, WA_LOCK = [1120, 464], WA_DOOR = [1386, 120, 760];   // лампа над столом; коробка на столе (низ-центр); замок на двери; правая кромка двери: x, верх, низ
function bjOfficer(ctx, v, t, T, o) { let r = {}; silhouette(ctx, c => { r = BJ.seated(c, v, t, T, { ...o, solo: true, shade: false }); }, { col: '#160909', rim: 'rgba(255,140,100,.55)', rimDir: [0, -1] }); return r; }
// рука-силуэт поверх коробки: от плеча (точка плейта) к кисти в экранной точке P — кисть на замке видна (коробку рисуем после стола)
function reachArm(ctx, v, sh, P, k = 1) { if (k <= .02) return; const S0 = toS(v, sh), Q = [lerp(S0[0], P[0], k), lerp(S0[1], P[1], k)], w = 16 * .66 * v.k; ctx.save(); ctx.strokeStyle = '#160909'; ctx.lineCap = 'round'; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(S0[0], S0[1]); ctx.quadraticCurveTo((S0[0] + Q[0]) / 2, Math.max(S0[1], Q[1]) + 30 * v.k, Q[0], Q[1]); ctx.stroke(); ctx.fillStyle = '#160909'; ctx.beginPath(); ctx.arc(Q[0], Q[1], 12 * .66 * v.k, 0, 6.28); ctx.fill(); ctx.restore(); }
const lockPt = (v, jerk = 0) => { const P = toS(v, BJ_BOX), w = 230 * v.k; return [P[0], P[1] - w * .32 + w * .06 - 64 * w / 420 + jerk * w / 420]; };   // дужка замка на коробке (экран)
function hands(ctx, r) { if (r.hl) for (const P of [r.hl, r.hr]) { ctx.fillStyle = '#160909'; ctx.beginPath(); ctx.arc(P[0], P[1], 12 * r.s, 0, Math.PI * 2); ctx.fill(); } }   // кисти поверх стола (силуэтом)
function lampFlare(ctx, P, R, k) { if (k <= .01) return; ctx.save(); ctx.globalCompositeOperation = 'screen'; const g = ctx.createRadialGradient(P[0], P[1] + R * .15, 0, P[0], P[1] + R * .15, R); g.addColorStop(0, `rgba(255,200,120,${.6 * k})`); g.addColorStop(1, 'rgba(255,160,90,0)'); ctx.fillStyle = g; ctx.fillRect(P[0] - R, P[1] - R, 2 * R, 2 * R); ctx.restore(); }
// коробка с чипами под навесным замком: на столе (плейт BJ, низ-центр BJ_BOX) или в экранной точке at с масштабом sc
function lockBox(ctx, v, jerk, at = null, sc = 1) { const P = at || toS(v, BJ_BOX), w = (at ? 300 * sc : 230 * v.k); PR.nvBox(ctx, P[0], P[1], w, { lid: 0 });
  const L = [P[0], P[1] - w * .32]; ctx.save(); ctx.strokeStyle = '#2a2a30'; ctx.lineWidth = w * .035; ctx.beginPath(); ctx.moveTo(P[0] - w * .5, L[1] - w * .02); ctx.lineTo(P[0] + w * .5, L[1] - w * .02); ctx.stroke(); ctx.restore();   // цепь-ремень поперёк крышки
  PR.padlock(ctx, L[0], L[1] + w * .06, w / 420, { jerk }); }
function openFolder(ctx, v, P0) { const P = toS(v, P0), w = 300 * v.k; ctx.save(); ctx.translate(P[0], P[1]); ctx.scale(1, .5); ctx.fillStyle = '#7a1d18'; ctx.strokeStyle = '#141014'; ctx.lineWidth = 3 * v.k; ctx.fillRect(-w / 2, -w * .36, w, w * .72); ctx.strokeRect(-w / 2, -w * .36, w, w * .72); ctx.fillStyle = '#efe4c8'; ctx.fillRect(-w * .44, -w * .3, w * .88, w * .6); ctx.restore(); }
const jPic = glint => (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#3a3440'); g.addColorStop(1, '#16131a'); c.fillStyle = g; c.fillRect(0, 0, w, h);
  const s = h / 760; B.miniFig(c, B.CAST_MINI.J, w * .5, h * .2 + 712 * s, s, { view: 'front' });
  if (glint > .02) PR.brassKey(c, w * .62, h * .93, s * .5, -.3, glint); };   // у пояса — тот же латунный ключ (блик на «made»)
function redPencil(ctx, P, s) { ctx.save(); ctx.translate(P[0], P[1]); ctx.rotate(-.7); ctx.fillStyle = '#c8312b'; ctx.strokeStyle = '#141014'; ctx.lineWidth = 2 * s; ctx.fillRect(-4 * s, -70 * s, 8 * s, 70 * s); ctx.strokeRect(-4 * s, -70 * s, 8 * s, 70 * s); ctx.restore(); }
function clipping(c, w, h) { c.fillStyle = '#e9e2cf'; c.fillRect(0, 0, w, h); B.txt(c, 'HUANG TO CONGRESS', w * .06, h * .1, h * .08, { w: 800, max: w * .88 });
  c.save(); c.translate(w * .06, h * .2); const pw = w * .88, ph = h * .62; c.fillStyle = '#2a2a34'; c.fillRect(0, 0, pw, ph); c.beginPath(); c.rect(0, 0, pw, ph); c.clip();   // фигурка обрезана рамкой снимка (ноги не вылезают)
  c.fillStyle = '#d9d4c6'; c.beginPath(); c.ellipse(pw * .72, ph * .62, pw * .16, ph * .26, 0, Math.PI, 0); c.fill(); c.fillRect(pw * .54, ph * .62, pw * .36, ph * .2); c.fillRect(pw * .71, ph * .3, pw * .02, ph * .1);   // купол Капитолия
  const s = ph / 900; B.miniFig(c, B.CAST_MINI.J, pw * .32, ph * 1.4, s, { view: 'front', mouth: 'open' }); c.fillStyle = '#121216'; c.fillRect(pw * .3, ph * .55, pw * .02, ph * .45); c.beginPath(); c.ellipse(pw * .31, ph * .55, pw * .03, ph * .05, 0, 0, 6.28); c.fill(); c.restore();
  B.lines(c, w * .06, h * .88, w * .88, 2, h * .05); }
function pinHead(ctx, x, y, k) { if (k <= .05) return; ctx.save(); ctx.fillStyle = '#c8312b'; ctx.strokeStyle = '#141014'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 14 * Math.min(1, k), 0, 6.28); ctx.fill(); ctx.stroke(); ctx.restore(); }
function redArrow(ctx, a, b, k) { const x = lerp(a[0], b[0], k), y = lerp(a[1], b[1], k); ctx.save(); ctx.strokeStyle = '#d0302a'; ctx.fillStyle = '#d0302a'; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(x, y); ctx.stroke();
  if (k > .9) { const an = Math.atan2(b[1] - a[1], b[0] - a[0]); ctx.translate(x, y); ctx.rotate(an); ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-22, -20); ctx.lineTo(-22, 20); ctx.closePath(); ctx.fill(); } ctx.restore(); }
// отрывной календарь у двери (обратная точка WA): «SEP 2022» срывается на «October», под ним «OCT 2022»
function wallCal(ctx, v, t, to) { const P = toS(v, [1530, 600]), w = 150 * v.k, h = 190 * v.k, u = clamp((t - to) / .5);
  const page = (lbl, dx, dy, a, al) => { ctx.save(); ctx.globalAlpha = al; ctx.translate(P[0] + dx, P[1] + dy); ctx.rotate(a); ctx.fillStyle = '#f2ece0'; ctx.strokeStyle = '#141014'; ctx.lineWidth = 3 * v.k; ctx.fillRect(-w / 2, -h / 2, w, h); ctx.strokeRect(-w / 2, -h / 2, w, h); ctx.fillStyle = '#b4302a'; ctx.fillRect(-w / 2, -h / 2, w, h * .26); B.txt(ctx, lbl, 0, 0, h * .22, { align: 'center', w: 800, max: w * .9 }); ctx.restore(); };
  page('OCT 2022', 0, 0, 0, 1); if (u < 1) page('SEP 2022', 140 * v.k * u * u, 260 * v.k * u * u, .9 * u, 1 - u * u); }
function dust(ctx, P, R, u) { ctx.save(); ctx.fillStyle = `rgba(200,190,170,${(.35 * (1 - u)).toFixed(3)})`; for (let i = 0; i < 7; i++) { const a = -Math.PI * (.1 + .8 * i / 6); ctx.beginPath(); ctx.arc(P[0] + Math.cos(a) * R * (.4 + u), P[1] + Math.sin(a) * R * .5 * (.4 + u), R * .18 * (1 + u), 0, 6.28); ctx.fill(); } ctx.restore(); }

export const SHOTS = {
  // ---- Вашингтон: чиновник за столом (desk.js), телефон у уха — разговор с Дженсеном ----
  "3|OFFICIAL: Your best chips can't go": x => { const { ctx, t, T, cam, solo } = x, v = WA.view('cu', cam), tc = W_(x, "can't", .6);   // КРУПНО чиновник с трубкой; на «can't» свободная рука шлёпает штамп BLOCKED на лист с чипом
    const k = env(t, tc - .35, tc + .45, .22, .25);
    ctx.save(); shake(ctx, cam);
    WA.seated(ctx, v, t, T, { C: OFFICIAL, sp: 'OFFICIAL', solo, blur: 3, keys: [[0, 'neutral']], phone: 'L', phoneK: 1, look: [.15, .3], R: { k, to: [1010, 800 - 30 * (1 - k)] },
      deskTop: (c, vv) => { const P = toS(vv, [1010, 822]); PR.chipSheet(c, P[0], P[1], 150 * vv.k); if (t > tc) PR.stampMark(c, P[0] + 8 * vv.k, P[1] + 4 * vv.k, 120 * vv.k, 'BLOCKED', clamp((t - tc) / .12)); },
      heldR: k > .2 ? (c, P, s) => PR.rubberStamp(c, P[0], P[1] + 18 * s, 80 * s) : null });
    ctx.restore(); },
  '3|OFFICIAL: The ones they want': x => { const { ctx, t, T, cam, solo } = x, v = WA.view('revDoor', cam);   // ОБРАТНАЯ: чиновник стоит у двери с навесным замком, трубка у уха
    ctx.save(); shake(ctx, cam);
    WA.revPlate(ctx, v, 0, solo);
    WA.standing(ctx, v, t, T, { C: OFFICIAL, rev: true, at: 'door', sp: 'OFFICIAL', solo, view: 'threeQuarter', facing: -1, look: [-.3, 0], L: { k: 1, to: [1066, 456] }, heldL: (c, P, s) => PR.handsetHeld(c, P, s, -1) });
    WA.revFront(ctx, v, 0, solo);
    ctx.restore(); },
  '3|OFFICIAL: Absolutely not': x => { const { ctx, t, T, cam, solo } = x, v = WA.view('mid', cam);   // СРЕДНИЙ чиновник: качает головой, трубка у уха
    ctx.save(); shake(ctx, cam);
    WA.seated(ctx, v, t, T, { C: OFFICIAL, sp: 'OFFICIAL', solo, keys: [[0, 'neutral']], phone: 'L', phoneK: 1, look: [.5 * Math.sin(t * 9) * clamp(t / .3) * clamp((x.d - t) / .3), .1] });
    ctx.restore(); },
  '3|OFFICIAL: Still no': x => { const { ctx, t, T, cam, solo } = x, v = WA.view('xcu', cam);   // СВЕРХКРУПНО: глаза поверх очков, не моргает
    ctx.save(); shake(ctx, cam);
    WA.seated(ctx, v, t, T, { C: OFFICIAL, sp: 'OFFICIAL', solo, blur: 5, keys: [[0, 'neutral']], phone: 'L', phoneK: 1, look: [0, -.15], tilt: .04, seed: 99 });
    ctx.restore(); },
  // ---- Пекин / Вашингтон (ведущий): офицеры — безликие силуэты (desk.js silhouette), замок — тот же латунный, что на вашингтонской двери ----
  '2|So, it turned out, did Beijing': x => { const { ctx, t, T, cam, solo } = x, tb = W_(x, 'Beijing', 2.0);   // ОБЩИЙ: тёмно-красный пекинский кабинет наползает на вашингтонский; на «Beijing» рывок, лампа над столом вспыхивает
    const u = E.inOutCubic(clamp(t / Math.max(.4, tb - .05))), v = BJ.view('wide', cam, .2), vw = WA.view('wide', cam, .2);
    ctx.save(); shake(ctx, cam);
    if (u < 1) WA.widePlate(ctx, vw, 0, solo);
    ctx.save(); const xe = W * (1 - u); ctx.beginPath(); ctx.moveTo(xe + 120 * (1 - u), 0); ctx.lineTo(W + 10, 0); ctx.lineTo(W + 10, H); ctx.lineTo(xe - 120 * (1 - u), H); ctx.closePath(); ctx.clip();
    BJ.widePlate(ctx, v, 0, solo); bjOfficer(ctx, v, t, T, { C: OFF1, keys: [[0, 'neutral']] }); BJ.deskFront(ctx, v, 0, solo);
    if (!solo) lampFlare(ctx, toS(v, BJ_LAMP), 360 * v.k, .25 + .75 * gauss(t, tb + .05, .1));
    ctx.restore();
    if (u > 0 && u < 1 && !solo) { ctx.fillStyle = 'rgba(10,2,2,.55)'; ctx.fillRect(W * (1 - u) - 6, 0, 12, H); }
    ctx.restore(); },
  '2|AIDE: Get me Jensen Huang': x => { const { ctx, t, T, cam, solo } = x, v = WA.view('cu', cam), turn = E.inOutCubic(clamp((t - .55) / .45));   // КРУПНО помощник с трубкой у уха разворачивается к окну (холодный синий)
    ctx.save(); shake(ctx, cam);
    WA.seated(ctx, v, t, T, { C: ASSIST, sp: 'AIDE', solo, blur: 3, keys: [[0, 'neutral']], phone: 'L', phoneK: 1, view: turn > .5 ? 'threeQuarter' : 'front', facing: -1, look: [lerp(.1, -.7, turn), lerp(.1, -.35, turn)], tilt: -.04 * turn });
    if (!solo) { ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = `rgba(70,110,200,${(.1 * turn).toFixed(3)})`; ctx.fillRect(0, 0, W, H); ctx.restore(); }   // холодный свет окна — плавно, один раз (не мерцает)
    ctx.restore(); },
  '2|OFFICER: Find out who else calls': x => { const { ctx, t, T, cam, solo } = x, v = BJ.view('mid', cam, .2), put = E.inOutCubic(clamp((t - .15) / .8));   // ОБЩИЙ: силуэт кладёт одиночный портрет Дженсена в раскрытую папку на столе
    const P0 = [1080, 778], P1 = [830, 812], Pp = [lerp(P0[0], P1[0], put), lerp(P0[1], P1[1], put) - 26 * Math.sin(Math.PI * put)];
    ctx.save(); shake(ctx, cam); BJ.widePlate(ctx, v, 0, solo);
    const hold = put < 1 ? 1 : 1 - E.inOutCubic(clamp((t - .95) / .4));
    bjOfficer(ctx, v, t, T, { C: OFF1, sp: 'OFFICER', keys: [[0, 'neutral']], R: { k: .5 * hold, to: [1000, 700] } });
    BJ.deskFront(ctx, v, 0, solo);
    if (!solo) { openFolder(ctx, v, P1); const P = toS(v, Pp); ctx.save(); ctx.translate(P[0], P[1]); ctx.scale(1, .8); B.photo(ctx, 0, 0, 170 * v.k, -.06 + .1 * (1 - put), jPic(0)); ctx.restore(); reachArm(ctx, v, BJ_SH.R, [P[0] + 60 * v.k, P[1] - 30 * v.k], hold); }
    ctx.restore(); },
  '2|Because in October 2022, Washington': x => { const { ctx, t, cam, solo } = x, to = W_(x, 'October', 1.4), ts = W_(x, 'slammed', 3.2);   // ОБРАТНАЯ: дверь захлопывается; на «October» срывается лист «SEP 2022» — под ним «OCT 2022»; на «slammed» замок щёлкает, толчок; наезд до скважины
    const pin = E.inOutCubic(clamp((t - ts - .25) / 1.0)), v = lerpView(WA.view('rev', cam, .2), cover({ cx: WA_LOCK[0], cy: WA_LOCK[1] + 10, k: 3.4 }), pin);
    const kick = t > ts && t < ts + .25 ? 14 * Math.sin((t - ts) * 50) * (1 - (t - ts) / .25) : 0;
    ctx.save(); ctx.translate(kick, kick * .5);
    WA.revPlate(ctx, v, 0, solo);
    if (!solo) {
      const gap = 1 - E.inCubic(clamp(t / Math.max(.3, ts - .02)));   // щель приоткрытой двери сужается до нуля к «slammed»
      if (gap > 0) { const a = toS(v, [WA_DOOR[0], WA_DOOR[1]]), b = toS(v, [WA_DOOR[0], WA_DOOR[2]]); ctx.fillStyle = '#05070c'; ctx.fillRect(a[0] - 46 * gap * v.k, a[1], 46 * gap * v.k, b[1] - a[1]); }
      wallCal(ctx, v, t, to);
      const L = toS(v, WA_LOCK); PR.padlock(ctx, L[0], L[1], .3 * v.k, { open: t < ts ? 1 : 1 - clamp((t - ts) / .06), glint: gauss(t, ts + .08, .12) + .35 * pin });
      if (t > ts && t < ts + .5) dust(ctx, toS(v, [WA_DOOR[0] - 10, WA_DOOR[2]]), 60 * v.k, (t - ts) / .5);
    }
    ctx.restore(); },
  "3|So here was Beijing's problem": x => { const { ctx, t, T, cam, solo } = x, v = BJ.view('mid', cam, .2), tb = W_(x, 'buy', 1.9);   // ОБЩИЙ: на красном столе коробка с чипами под тем же латунным замком; рука дёргает замок — не поддаётся
    const reach = E.outCubic(clamp((t - tb + .5) / .4)), jerk = t > tb ? 10 * Math.abs(Math.sin((t - tb) * 18)) * Math.exp(-(t - tb) * 3) : 0;
    ctx.save(); shake(ctx, cam); BJ.widePlate(ctx, v, 0, solo);
    bjOfficer(ctx, v, t, T, { C: OFF1, keys: [[0, 'neutral']], lean: .08 * reach, L: { k: .6 * reach, to: [800, 700] } });
    BJ.deskFront(ctx, v, 0, solo); if (!solo) lockBox(ctx, v, jerk);
    reachArm(ctx, v, BJ_SH.L, lockPt(v, jerk), reach);
    ctx.restore(); },
  '3|But it could try to get close': x => { const { ctx, t, T, cam, solo } = x, v = BJ.view('mid', cam, .2), tm = W_(x, 'made', 2.4), slide = E.inOutCubic(clamp((t - .1) / .7)), circ = clamp((t - .9) / .9);   // СРЕДНИЙ двое: офицер подвигает фото Дженсена к коробке и обводит лицо красным; на «made» на фото у пояса блестит латунный ключ
    const PH = [lerp(1130, 980, slide), 808];
    ctx.save(); shake(ctx, cam); BJ.widePlate(ctx, v, 0, solo);
    silhouette(ctx, c => { BJ.standing(c, v, t, T, { C: OFF2, at: 'side', solo: true, shade: false, keys: [[0, 'neutral']], view: 'threeQuarter', facing: 1, look: [.6, .5] }); }, { col: '#1c0a0a', rim: 'rgba(255,140,100,.5)', rimDir: [1, -.4] });
    const pen = circ > 0 && circ < 1 ? [PH[0] + 30 * Math.cos(circ * 6.28), PH[1] - 18 + 12 * Math.sin(circ * 6.28)] : PH;
    bjOfficer(ctx, v, t, T, { C: OFF1, keys: [[0, 'neutral']], R: { k: .5, to: [1000, 700] } });
    BJ.deskFront(ctx, v, 0, solo);
    if (!solo) { lockBox(ctx, v, 0); const P = toS(v, PH); ctx.save(); ctx.translate(P[0], P[1]); ctx.scale(1, .8); B.photo(ctx, 0, 0, 150 * v.k, -.05, jPic(gauss(t, tm + .06, .18))); B.redCircle(ctx, 0, -130 * v.k * .2, 34 * v.k, 30 * v.k, circ, 4 * v.k); ctx.restore(); }
    if (!solo) { const P = toS(v, pen), Q = [P[0], P[1] - (circ > 0 && circ < 1 ? 40 : 10) * v.k]; reachArm(ctx, v, BJ_SH.R, Q, 1); if (circ > 0 && circ < 1) redPencil(ctx, Q, .66 * v.k); }
    ctx.restore(); },
  '3|the same man arguing with Washington': x => { const { ctx, t, cam, solo } = x, tb = W_(x, 'buy', 2.6), pin = E.outBack(clamp((t - .2) / .35)), arr = clamp((t - tb + .1) / .45);   // ВСТАВКА сверху: к фото Дженсена подкалывают вырезку (Дженсен у микрофона, за ним купол Капитолия); на «buy» красная стрелка от вырезки к коробке под замком
    if (solo) return; ctx.save(); shake(ctx, cam); BJ.widePlate(ctx, cover({ cx: 860, cy: 800, k: 3.2 * (1 + (cam.z - 1) * .5) }), 8, false);
    ctx.fillStyle = 'rgba(20,4,4,.35)'; ctx.fillRect(0, 0, W, H);
    B.photo(ctx, 640, 560, 380, -.05, jPic(0));
    B.sheet(ctx, lerp(1040, 1000, pin), lerp(380, 470, pin), 460, 330, .06, (c, w, h) => clipping(c, w, h));
    pinHead(ctx, 840, 420, pin);
    lockBox(ctx, null, 0, [1560, 900], 1.5);
    if (arr > 0) redArrow(ctx, [1150, 640], [1500, 820], arr);
    ctx.restore(); },
  "3|OFFICER: We can't buy his chips": x => { const { ctx, t, T, cam, solo } = x, v = BJ.view('mid', cam, .2), tap = t > .3 ? Math.max(0, Math.sin((t - .3) * 9)) : 0;   // СРЕДНИЙ офицер 1 стучит пальцем по замку на коробке
    ctx.save(); shake(ctx, cam); BJ.widePlate(ctx, v, 3, solo);
    const k = E.outCubic(clamp(t / .3)); bjOfficer(ctx, v, t, T, { C: OFF1, sp: 'OFFICER', keys: [[0, 'neutral']], lean: .08, L: { k: .6 * k, to: [800, 700] } });
    BJ.deskFront(ctx, v, 3, solo); if (!solo) lockBox(ctx, v, tap > .9 ? 2 : 0);
    const L = lockPt(v); reachArm(ctx, v, BJ_SH.L, [L[0] + 4 * v.k, L[1] + 14 * v.k - 18 * v.k * tap], k);
    ctx.restore(); },
  '3|OFFICER 2: Then become his customer': x => { const { ctx, t, T, cam, solo } = x, v = BJ.view('mid', cam, .2), tc = W_(x, 'customer', .95), card = E.outCubic(clamp((t - .05) / .35)), form = E.outBack(clamp((t - tc) / .3)), tap = t > tc + .3 ? Math.max(0, Math.sin((t - tc - .3) * 10)) : 0;   // СРЕДНИЙ офицер 2: чистая визитка на фото Дженсена; на «customer» рядом ложится бланк PURCHASE ORDER, палец стучит по пустой строке
    const PH = [980, 808], FO = [1150, 806];
    ctx.save(); shake(ctx, cam); BJ.widePlate(ctx, v, 0, solo);
    const r = bjOfficer(ctx, v, t, T, { C: OFF2, sp: 'OFFICER 2', keys: [[0, 'neutral']], R: { k: 1, to: form > .5 ? [FO[0] - 10, FO[1] - 6 - 10 * tap] : [PH[0], PH[1] - 8] } });
    BJ.deskFront(ctx, v, 0, solo);
    if (!solo) { lockBox(ctx, v, 0); const P = toS(v, PH); ctx.save(); ctx.translate(P[0], P[1]); ctx.scale(1, .8); B.photo(ctx, 0, 0, 150 * v.k, -.05, jPic(0));
      ctx.translate(0, lerp(-200, 10, card) * v.k); ctx.rotate(.08); ctx.fillStyle = '#f6f3ea'; ctx.strokeStyle = '#141014'; ctx.lineWidth = 2 * v.k; ctx.fillRect(-46 * v.k, -26 * v.k, 92 * v.k, 52 * v.k); ctx.strokeRect(-46 * v.k, -26 * v.k, 92 * v.k, 52 * v.k); ctx.restore();
      if (form > 0) { const F = toS(v, FO); ctx.save(); ctx.translate(F[0], F[1] + (1 - form) * 120 * v.k); ctx.scale(1, .55); PA.form(ctx, 0, 0, 230 * v.k, .04, { title: 'PURCHASE ORDER', field: 'BUYER:', value: '', u: 1, hi: tap }); ctx.restore(); } }
    if (!solo && r.hr) reachArm(ctx, v, BJ_SH.R, r.hr, 1);   // рука-силуэт видна до кисти на бланке (иначе точка «висит» над бумагами)
    hands(ctx, r);
    ctx.restore(); },
  // --- A --- (рабочий A: L11 зал гл. 2–3, L06 кабинет Nvidia, L17 склад; помощники и импорты — блок «--- A ---» после SHOTS)
  // ---------- L11 зал (staging/eventhall.js) ----------
  '2|In 2006, Jensen made his biggest bet': x => { const { ctx, t, T, cam, solo } = x, v = camView({ cx: 960, cy: 520, k: 1.25 }, cam, .25), tr = W_(x, 'released', 3.49);   // ОБЩИЙ: маленькая презентация 2006, зал полупустой, на экране слайд CUDA; на «released» слайд вспыхивает, Дженсен показывает на экран
    const g = gesture(t, tr, { lead: .2, rise: .3, hold: 1.2, fall: .4 });
    ctx.save(); shake(ctx, cam); A_EH.plate(ctx, v, 'wide', 0, solo);
    if (!solo) { A_scr(ctx, v, ['CUDA', 'PARALLEL COMPUTING ON THE GPU'], 1); A_screenFlash(ctx, v, gauss(t, tr + .05, .12) * .5); }
    A_EH.standing(ctx, A_JH, v, t, T, { at: [1240, 700], which: 'stage', f: -1, view: 'threeQuarter', keys: [[0, 'smile']], look: [-.3 - .4 * g.body, 0], solo, L: { k: g.hand, to: [1120, 520] } });
    if (!solo) A_heads(ctx, v, [[420, 770, 22], [1300, 772, 22], [1610, 800, 27]]);
    ctx.restore(); },
  '2|so scientists could put all those cooks': x => { const { ctx, t, cam, solo } = x, tm = W_(x, 'math', 3.28), tg = W_(x, 'games', 4.38), v = camView(A_EH.views.screen, cam, .1);   // ВСТАВКА экран: слайд меняется — маленькие повара из кухни → формулы; на «games» геймпад в углу
    if (solo) return; ctx.save(); shake(ctx, cam); A_EH.plate(ctx, v, 'wide', 0, false);
    A_onScreen(ctx, v, (c, w, h) => { const u = clamp((t - (tm - .3)) / .5);
      c.globalAlpha = 1 - u; for (let r = 0; r < 3; r++) for (let k = 0; k < 7; k++) { const cx = w * (.1 + k * .13), cy = h * (.25 + r * .27) - Math.abs(Math.sin(t * 6 + r + k)) * h * .03; A_cook(c, cx, cy, h * .09); }
      c.globalAlpha = u; ['Σ aᵢ·bᵢ', '∫ f(x) dx', 'E = mc²', '∇·E = ρ/ε₀', 'λ = h / p', 'F = ma'].forEach((s, i) => A_PA.label(c, s, w * (.2 + (i % 3) * .3), h * (.32 + Math.floor(i / 3) * .34), h * .1, '#bfffd0', { weight: 700, font: "'Cambria Math', Georgia, serif" }));
      c.globalAlpha = clamp((t - (tg - .3)) / .3); A_PA.gamepad(c, w * .86, h * .78, h * .0022, -.2); c.globalAlpha = 1; });
    ctx.restore(); },
  '2|INVESTOR: Who exactly is this for': x => { const { ctx, t, T, cam, solo } = x, v = camView({ cx: 560, cy: 650, k: 2.3 }, cam, .1), tt = W_(x, 'this', .98);   // ОБРАТНАЯ инвестор в первом ряду: скучает, на «this» подаётся вперёд и спрашивает
    const fwd = E.inOutCubic(clamp((t - (tt - .3)) / .3));
    ctx.save(); shake(ctx, cam); A_EH.plate(ctx, v, 'rev', 0, solo);
    A_EH.seatedRev(ctx, A_INV, v, t, T, { seat: [533, 846], sp: 'INVESTOR', keys: [[0, 'neutral']], look: [-.1, .1], lean: .06 * fwd - .04, tilt: .06 * (1 - fwd), seed: 4, solo });
    A_EH.stageFront(ctx, v, solo); ctx.restore(); },
  "2|JENSEN: People who don't know yet": x => { const { ctx, t, T, solo } = x, v = { cx: 1190, cy: 560, k: 2.3 };   // СРЕДНИЙ Дженсен (статично): улыбается, экран за ним гаснет
    A_EH.plate(ctx, v, 'wide', 0, solo);
    if (!solo) { A_scr(ctx, v, ['CUDA', 'PARALLEL COMPUTING ON THE GPU'], 1); A_screenDark(ctx, v, E.inOutCubic(clamp((t - .3) / .9)) * .85); }
    A_EH.standing(ctx, A_JH, v, t, T, { at: [1200, 700], which: 'stage', f: 1, view: null, sp: 'JENSEN', keys: [[0, 'smile']], look: [0, .05], solo }); },
  '2|For years it looked like an expensive ho': x => { const { ctx, t, cam, solo } = x, v = camView({ cx: 960, cy: 520, k: 1.2 }, cam, .25), th = W_(x, 'hobby', 1.46);   // ОБЩИЙ пустой зал: слайд CUDA зарастает пылью и паутиной; в углу листаются годы 2007…2011
    if (solo) return; ctx.save(); shake(ctx, cam); A_EH.plate(ctx, v, 'wide', 0, false);
    const dust = clamp(t / Math.max(.6, th)); A_scr(ctx, v, ['CUDA', 'PARALLEL COMPUTING ON THE GPU'], 1); A_screenDark(ctx, v, .35 + .3 * dust, '120,110,100'); A_cobwebs(ctx, v, dust);
    const yr = 2007 + Math.min(4, Math.floor(t / Math.max(.3, (x.d - .3) / 5))); A_PA.label(ctx, String(yr), W - 150, 90, 64, '#F2E8CC', { weight: 700 });
    ctx.restore(); },
  '2|When he talked about who should be allow': x => { const { ctx, t, T, cam, solo } = x, v = camView({ cx: 820, cy: 470, k: 1.6 }, cam, .2), ta = W_(x, 'allowed', 1.28);   // ОБЩИЙ Дженсен у трибуны; на экране очередь у турникета: на «allowed» первый проходит, перед вторым опускается планка (D16-C)
    ctx.save(); shake(ctx, cam); A_EH.plate(ctx, v, 'wide', 0, solo);
    if (!solo) A_onScreen(ctx, v, (c, w, h) => A_turnstile(c, w, h, t, ta));
    const P = A_EH.podium(ctx, A_JH, v, t, T, { f: 1, view: null, keys: [[0, 'neutral']], look: [.4, .05], solo });
    void P; ctx.restore(); },
  "3|Jensen didn't hide how he felt": x => { const { ctx, t, T, cam, solo } = x, v = camView({ cx: 960, cy: 520, k: 1.9 }, cam, .2), tf = W_(x, 'felt', 1.42);   // СРЕДНИЙ: луч прожектора находит Дженсена на тёмной сцене
    const bx = lerp(1350, 960, E.inOutCubic(clamp(t / Math.max(.5, tf - .1))));
    ctx.save(); shake(ctx, cam); A_EH.plate(ctx, v, 'wide', 0, solo);
    A_EH.standing(ctx, A_JH, v, t, T, { at: [960, 700], which: 'stage', f: 1, view: null, keys: [[0, 'neutral'], [tf - .1, 'smug']], look: [0, -.05], solo });
    if (!solo) A_spot(ctx, v, bx);
    ctx.restore(); },
  '3|On stage after stage': x => { const { ctx, t, T, cam, solo } = x, ts2 = W0(x, /^stage$/) ?? .76, th = W_(x, 'argued', 1.68);   // ОБЩИЙ сцена (отъезд): Дженсен у микрофона; баннер за спиной дважды сменяется — три разных ивента подряд
    const pull = E.inOutCubic(clamp(t / (x.d * .8))), v = camView(lerpView({ cx: 640, cy: 470, k: 2.6 }, { cx: 880, cy: 500, k: 1.35 }, pull), cam, .1);
    const evn = t < .76 ? 0 : t < th - .06 ? 1 : 2, names = [['TECH SUMMIT', 'KEYNOTE'], ['DEVELOPER CONFERENCE', 'KEYNOTE'], ['INDUSTRY EXPO', 'KEYNOTE']];
    ctx.save(); shake(ctx, cam); A_EH.plate(ctx, v, 'wide', 0, solo);
    if (!solo) A_scr(ctx, v, names[evn], 1);
    const g = gesture(t, th + .2, { lead: .2, rise: .3, hold: 1, fall: .4 });
    A_EH.podium(ctx, A_JH, v, t, T, { f: 1, view: null, keys: [[0, 'neutral']], look: [.2, .05], solo, R: { k: g.hand, to: [640, 470] } });
    void ts2; ctx.restore(); },
  '3|and handing the market to Chinese rivals': x => { const { ctx, t, cam, solo } = x, tc = W_(x, 'Chinese', 1.64), v = camView(A_EH.views.screen, cam, .1);   // ВСТАВКА экран: пирог рынка переезжает от зелёного чипа к безымянному красному
    if (solo) return; ctx.save(); shake(ctx, cam); A_EH.plate(ctx, v, 'wide', 0, false);
    const u = E.inOutCubic(clamp((t - .5) / Math.max(.4, tc - .3)));
    A_onScreen(ctx, v, (c, w, h) => A_pie(c, w, h, lerp(.85, .25, u)));
    ctx.restore(); },
  '3|Let American chips compete everywhere': x => { const { ctx, t, T, cam, solo } = x, v = camView({ cx: 660, cy: 470, k: 3.6 }, cam, .1), tc = W_(x, 'compete', .92), te = W_(x, 'everywhere', 1.4);   // КРУПНО Дженсен у микрофона (строку читает рассказчик, D17-C); на «compete» на экране печатается COMPETE; на «everywhere» экран зеленеет картой мира, вспышки из зала
    ctx.save(); shake(ctx, cam); A_EH.plate(ctx, v, 'wide', 0, solo);
    if (!solo) A_onScreen(ctx, v, (c, w, h) => { const m = E.outBack(clamp((t - te) / .3)); const n = Math.ceil(7 * clamp((t - tc) / .4)); if (n > 0) A_PA.label(c, 'COMPETE'.slice(0, n), w * .25, h * .4, h * .15, '#ffffff', { weight: 900, font: "Bahnschrift, 'Segoe UI', sans-serif" }); if (m > 0) A_globe(c, w * .25, h * .74, h * .14 * m); });   // всё — в видимой части экрана (крупный план срезает его правую половину); на «everywhere» — глобус, не полупрозрачные пятна
    A_EH.podium(ctx, A_JH, v, t, T, { f: 1, view: null, keys: [[0, 'smile']], look: [.3, .05], solo });
    if (!solo) { A_EH.flash(ctx, W * .82, H * .3, (t - te - .05) / .1, 300); A_EH.flash(ctx, W * .12, H * .55, (t - te - .45) / .1, 260); }   // вспышки камер — 3 кадра, не заливают кадр
    ctx.restore(); },
  "3|JENSEN: They're nanoseconds behind us": x => { const { ctx, t, T, cam, solo } = x, v = camView({ cx: 680, cy: 480, k: 2.8 }, cam, .1), tn = W_(x, 'nanoseconds', .14);   // СРЕДНИЙ Дженсен у микрофона; на «nanoseconds» на экране секундомер 0.000000001 s
    ctx.save(); shake(ctx, cam); A_EH.plate(ctx, v, 'wide', 0, solo);
    if (!solo) A_onScreen(ctx, v, (c, w, h) => { if (t < tn) return; c.fillStyle = '#0a140c'; c.fillRect(0, 0, w, h); A_stopwatch(c, w * .15, h * .5, h * .2, t - tn); A_PA.label(c, '0.000000001 s', w * .4, h * .5, h * .085, '#7dff9a', { weight: 900, font: "Bahnschrift, 'Segoe UI', sans-serif" }); });   // секундомер и число — в видимой части экрана
    A_EH.podium(ctx, A_JH, v, t, T, { f: 1, view: null, sp: 'JENSEN', keys: [[0, 'smug']], look: [.2, .05], solo });
    ctx.restore(); },
  // ---------- L06 кабинет Nvidia (staging/nvidia.js — NV) ----------
  '2|and every AI lab on Earth wanted Nvidia': x => { const { ctx, t, T, cam, solo } = x, tn = W_(x, 'Nvidia', 1.88);   // ОБРАТНАЯ: от двери кабинета вдоль коридора — очередь учёных в халатах до точки схода, бейджи разных лабораторий
    const pull = E.inOutCubic(clamp(t / (x.d * .7))), v = camView(lerpView({ cx: 700, cy: 380, k: 2.0 }, { cx: 900, cy: 520, k: 1.15 }, pull), cam, .1);
    ctx.save(); shake(ctx, cam); NV.revPlate(ctx, v, 0, solo);
    A_queue(ctx, v, t, T, solo, tn);
    NV.revFront(ctx, v, 0, solo); ctx.restore(); },
  '2|CUSTOMER: How soon can you deliver': x => { const { ctx, t, T, cam, solo } = x, v = camView({ cx: 590, cy: 600, k: 2.1 }, cam, .1), td = W_(x, 'deliver', .68);   // КРУПНО учёный перед столом стучит пальцем по часам
    const tap = Math.max(gauss(t, .25, .07), gauss(t, td, .07), gauss(t, td + .35, .07));
    ctx.save(); shake(ctx, cam); NV.widePlate(ctx, v, 4, solo);
    NV.standing(ctx, v, t, T, { C: A_SCI[0], at: 'front', sp: 'CUSTOMER', view: null, keys: [[0, 'neutral']], look: [.2, .05], solo, L: { k: 1, to: [545, 800] }, R: { k: 1, to: [585, 790 - 16 * (1 - tap)] },
      heldL: (c, h, s) => A_watch(c, h, s) });
    ctx.restore(); },
  '2|SALESMAN: How patient are you': x => { const { ctx, t, T, cam, solo } = x, v = camView({ cx: 970, cy: 600, k: 2.4 }, cam, .1), tp = W_(x, 'patient', .84);   // ВСТАВКА: продавец переворачивает песочные часы и ставит на стол — песок только начинает сыпаться
    const flip = E.inOutCubic(clamp((t - .1) / .5)), down = E.inOutCubic(clamp((t - .65) / .25)), hx = 1000, hy = lerp(630, 676, down);
    ctx.save(); shake(ctx, cam);
    NV.seated(ctx, v, t, T, { C: A_SALES, sp: 'SALESMAN', solo, blur: 3, keys: [[0, 'smug']], look: [.3, .5], R: { k: 1, to: [hx + 6, hy + 2] },
      heldR: (c, P, s) => { const g = toS(v, [hx, hy - 30]); A_PA.hourglass(c, g[0], g[1], 70 * v.k, Math.PI * flip, t < tp ? 1 : 1 - .06 * (t - tp)); } });
    ctx.restore(); },
  '2|and Jensen became the man with the key': x => { const { ctx, t, T, cam, solo } = x, tk = W_(x, 'key', 1.58);   // КРУПНО ключ на поясе Дженсена: пола кожанки, латунный ключ ловит свет; камера поднимается к лицу
    const up = E.inOutCubic(clamp((t - tk - .2) / Math.max(.35, x.d - tk - .25))), v = camView(lerpView({ cx: 1400, cy: 760, k: 3.0 }, { cx: 1385, cy: 600, k: 2.4 }, up), cam, .05);   // ключ в кадре до «key» (блик), потом камера поднимается к лицу
    ctx.save(); shake(ctx, cam); NV.widePlate(ctx, v, 3, solo);
    const P = A_person(ctx, A_JH, v, t, T, { at: [1380, 1052], fs: .66, f: -1, view: null, keys: [[0, 'smug']], look: [-.1, .05], shade: A_shadeOf([1, -.2], '#ffc47a'), solo });
    if (!solo) { const b = A_figS(P, v, [62, -318]), s = .66 * v.k; ctx.save(); ctx.strokeStyle = '#141014'; ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.moveTo(b[0], b[1]); ctx.lineTo(b[0], b[1] + 30 * s); ctx.stroke(); ctx.restore();
      PR.brassKey(ctx, b[0], b[1] + 30 * s, .4 * s, Math.PI / 2 + .1 * Math.sin(t * 2), gauss(t, tk + .05, .15)); }
    ctx.restore(); },
  '3|JENSEN: What about this one': x => { const { ctx, t, T, cam, solo } = x, v = camView({ cx: 950, cy: 500, k: 3.0 }, cam, .1);   // ВСТАВКА: Дженсен с трубкой у уха поднимает к трубке крошечный чип
    const up = E.outBack(clamp((t - .05) / .3));
    ctx.save(); shake(ctx, cam);
    NV.seated(ctx, v, t, T, { C: A_JH, sp: 'JENSEN', solo, blur: 5, keys: [[0, 'neutral']], look: [.4, -.1], phone: 'L', phoneK: 1, R: { k: up, to: [1000, 520] },
      heldR: up > .2 ? (c, P, s) => { PR.chip(c, P[0] - 4 * s, P[1] - 52 * s, .12 * s * 4, .2, .6); handDot(c, P, s); } : null });   // кисть-точка на нижнем крае чипа, поверх
    ctx.restore(); },
  "3|JENSEN: It's really slow": x => { const { ctx, t, T, cam, solo } = x, v = camView({ cx: 955, cy: 490, k: 3.4 }, cam, .1), tb = .9;   // КРУПНО Дженсен дует на чип
    const blow = env(t, tb, x.d + 1, .15);
    ctx.save(); shake(ctx, cam);
    NV.seated(ctx, v, t, T, { C: A_JH, sp: 'JENSEN', solo, blur: 5, keys: [[0, 'neutral']], look: [.3, .1], phone: 'L', phoneK: 1, R: { k: 1, to: [985, 512] }, mouthOverride: blow > .3 ? 'O' : null,
      heldR: (c, P, s) => { PR.chip(c, P[0] - 4 * s, P[1] - 52 * s, .12 * s * 4, .2, .6); handDot(c, P, s); if (blow > .1) { const m = toS(v, [945, 505]); c.save(); c.strokeStyle = `rgba(230,240,255,${.7 * blow})`; c.lineWidth = 3 * s; for (let i = 0; i < 3; i++) { const ph = ((t * 2.4 + i / 3) % 1); c.beginPath(); c.moveTo(m[0] + 20 * s + ph * 60 * s, m[1] + (i - 1) * 10 * s); c.lineTo(m[0] + 46 * s + ph * 60 * s, m[1] + (i - 1) * 12 * s); c.stroke(); } c.restore(); } } });
    ctx.restore(); },
  "3|China had been one of Nvidia's biggest m": x => { const { ctx, t, cam, solo } = x, tb = W_(x, 'biggest', 1.48), v = camView({ cx: 1430, cy: 650, k: 2.6 }, cam, .1);   // ВСТАВКА график продаж по регионам: столбик CHINA высокий и светится
    if (solo) return; ctx.save(); shake(ctx, cam); NV.widePlate(ctx, v, 4, false); A_easel(ctx, v, 1, gauss(t, tb + .1, .25) + .25 * clamp((t - tb) / .3)); ctx.restore(); },
  "3|ASSISTANT: Here's our China business": x => { const { ctx, t, T, cam, solo, s, d } = x, tw = s.whip?.t ?? d * .5, wu = inOutExpo((t - tw + .1) / WHIP_DUR);   // ОБЩИЙ: ассистентка поднимает график с пустым CHINA -> вип-пан -> Дженсен щурится, поправляет очки
    const g = gesture(t, tw + .5, { lead: .1, rise: .25, hold: 2, fall: .3 });
    whipPlates(ctx, t, tw,
      () => { const v = camView({ cx: 640, cy: 590, k: 2.0 }, { ...cam, dx: 0 }, .1); NV.widePlate(ctx, v, 3, solo);
        NV.standing(ctx, v, t, T, { C: A_ASS, at: 'front', sp: 'ASSISTANT', view: null, keys: [[0, 'neutral']], look: [.1, .05], solo, L: { k: 1, to: [470, 740] }, R: { k: 1, to: [650, 740] } });
        if (!solo) { const c = toS(v, [560, 700]); A_PA.regionChart(ctx, c[0], c[1], 220 * v.k, 0, 0, 'CHINA BUSINESS'); for (const q of [[470, 740], [650, 740]]) { const h = toS(v, q); A_ell(ctx, h[0], h[1], 12 * .66 * v.k, 12 * .66 * v.k, '#1A1216', null); } } },
      () => { const v = NV.view('cu', { ...cam, dx: 0 }); NV.seated(ctx, v, t, T, { C: A_JH, sp: 'JENSEN', solo, blur: 3, keys: [[0, 'neutral'], [tw + .2, 'smug']], look: [-.2, 0], R: { k: g.hand, to: [998, 468] } }); });
  },
  "3|ASSISTANT: That's the chart": x => { const { ctx, t, T, cam, solo } = x, v = camView({ cx: 1500, cy: 640, k: 2.3 }, cam, .1), tc = W_(x, 'chart', .44);   // ВСТАВКА тот же график: столбик CHINA пуст; ассистентка стучит пальцем по пустой оси
    const tap = Math.max(gauss(t, tc, .06), gauss(t, tc + .3, .06), gauss(t, tc + .6, .06));
    ctx.save(); shake(ctx, cam); NV.widePlate(ctx, v, 4, solo);
    if (!solo) A_easel(ctx, v, 0, 0);
    A_person(ctx, A_ASS, v, t, T, { at: [1680, 1052], fs: .66, f: -1, sp: 'ASSISTANT', keys: [[0, 'neutral']], look: [-.6, .3], shade: A_shadeOf([1, -.2], '#ffc47a'), solo, L: { k: 1, to: [1425 + 14 * (1 - tap), 742] } });
    ctx.restore(); },
  // ---------- L17 склад (staging/warehouse.js — WH) ----------
  '3|and Nvidia took a five-and-a-half-billio': x => { const { ctx, t, cam, solo } = x, tc = W_(x, 'charge', 1.92);   // СРЕДНИЙ поддоны зелёных коробок H20 стоят без движения; на «charge» на ближний поддон падает штамп $5.5B WRITE-OFF, толчок
    if (solo) return; const v = camView(A_WH.views.pallets, cam, .25);
    ctx.save(); shake(ctx, cam); A_WH.plate(ctx, v, 0, false); A_WH.labels(ctx, v, 'NVIDIA H20');
    const P = toS(v, [1700, 820]); A_PA.stampMark(ctx, P[0], P[1], 300 * v.k * .9, ['$5.5B', 'WRITE-OFF'], -.12, t - tc);
    ctx.restore(); },
};
export const OVER = {
  // СПЛИТ #84 (окна шаблона ядра закрыты целиком): слева Вашингтон — помощник подносит трубку к уху; справа Пекин — силуэт офицера, перед ним на столе портрет Дженсена
  '2|Washington picked up the phone': (ctx, s, t, d) => { const T = s.start + t, pw = W / 2;
    const pane = (i, fn) => { ctx.save(); ctx.beginPath(); ctx.rect(i * pw + 4, 0, pw - 8, H); ctx.clip(); ctx.translate(i * pw + pw / 2 - W / 2, 0); fn(); ctx.restore(); };
    pane(0, () => { const v = WA.view('mid', { z: 1 + .03 * t, dx: 0, dy: 0 }); WA.seated(ctx, v, t, T, { C: ASSIST, keys: [[0, 'neutral']], phone: 'L', phoneK: E.outCubic(clamp((t - .1) / .3)), view: 'front', look: [.1, .05] }); });
    pane(1, () => { const v = BJ.view('mid', { z: 1 + .03 * t, dx: 0, dy: 0 }, .2); BJ.widePlate(ctx, v, 0, false); bjOfficer(ctx, v, t, T, { C: OFF1, keys: [[0, 'neutral']] }); BJ.deskFront(ctx, v, 0, false);
      const P = toS(v, [960, 800]); ctx.save(); ctx.translate(P[0], P[1]); ctx.scale(1, .8); B.photo(ctx, 0, 0, 170 * v.k, -.04, jPic(0)); ctx.restore(); });
    ctx.fillStyle = '#000'; ctx.fillRect(pw - 4, 0, 8, H); },
  // СПЛИТ #94 «звонок»: слева чиновник у окна с трубкой (обратная точка, холодный синий); справа Дженсен за столом в кабинете Nvidia, трубка у уха — его вопрос
  '3|JENSEN: Which ones count as best': (ctx, s, t, d) => { const T = s.start + t, pw = W / 2;
    const pane = (i, fn) => { ctx.save(); ctx.beginPath(); ctx.rect(i * pw + 4, 0, pw - 8, H); ctx.clip(); ctx.translate(i * pw + pw / 2 - W / 2, 0); fn(); ctx.restore(); };
    pane(0, () => { const v = { cx: 330, cy: 470, k: 1.5 + .03 * t }; WA.revPlate(ctx, v, 0, false);
      person(ctx, v, t, T, { C: OFFICIAL, at: [420, 800], fs: .5, view: 'threeQuarter', facing: -1, light: [-1, -.2], shadow: true, keys: [[0, 'neutral']], look: [-.6, -.2], L: { k: 1, to: [458, 500] }, heldL: (c, P, sc) => PR.handsetHeld(c, P, sc, -1) });   // трубка у щеки, не на глазу
      WA.revFront(ctx, v, 0, false); });
    pane(1, () => { const v = NV.view('cu', { z: 1 + .03 * t, dx: 0, dy: 0 }); NV.seated(ctx, v, t, T, { C: JH, sp: 'JENSEN', blur: 3, keys: [[0, 'neutral']], phone: 'L', phoneK: 1, look: [.3, -.1] }); });
    ctx.fillStyle = '#000'; ctx.fillRect(pw - 4, 0, 8, H); },
};
export const SKIP_PROPS = { '2|Because in October 2022, Washington': /OCT 2022/, '3|OFFICER 2: Then become his customer': /PURCHASE ORDER/, '3|the same man arguing with Washington': /./, '3|But it could try to get close': /./, "3|OFFICIAL: Your best chips can't go": /BLOCKED/ };
export const RAIN = null;   // или s => true/false/undefined — переопределение дождя для планов главы

// --- A --- импорты и помощники рабочего A для его планов гл. 2–3 (имена с префиксом A_, чтобы не пересекаться с импортами ведущего)
import { EH as A_EH } from '../staging/eventhall.js';
import { plate as A_plate } from '../staging/common.js';
import { WH as A_WH } from '../staging/warehouse.js';
import * as A_PA from '../props_A.js';
import { person as A_person, figS as A_figS, shadeOf as A_shadeOf, investor as A_investor, scientist as A_scientist, salesman as A_salesman, assistant as A_assistant } from '../chars_A.js';
import { ell as A_ell, jensen as A_jensen } from 'engine';
const A_fix = C => { C.spec.rig = { ...C.spec.rig, plantLegs: .02, armLayer: 'front' }; return C; };
const A_JH = A_fix(A_jensen()), A_INV = A_investor(), A_SALES = A_salesman(), A_ASS = A_assistant(), A_SCI = [0, 1, 2, 3, 4, 5, 6, 7].map(A_scientist);
// экран зала WIDE (x 560–1370, y 255–590): рисовальщик fn(ctx, w, h) в координатах экрана
// трибуна и микрофон плейта WIDE — передний план: после любой картинки на экране рисуются заново (иначе экран ложится поверх трибуны и микрофон «просвечивает»)
const handDot = (c, P, s) => { c.fillStyle = '#141014'; c.beginPath(); c.arc(P[0], P[1], 12 * s, 0, Math.PI * 2); c.fill(); };   // правило хвата: кисть-точка поверх края предмета
// луч прожектора на сцене WIDE (плейт x = bx): сцена вокруг затемнена, светлое пятно на полу у ног и мягкий конус сверху (без мерцания)
function A_spot(ctx, v, bx) { const F = toS(v, [bx, 690]), T0 = toS(v, [bx, 120]), R = 260 * v.k; ctx.save();
  const g = ctx.createRadialGradient(F[0], F[1] - 140 * v.k, R * .35, F[0], F[1] - 140 * v.k, R * 1.6); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(4,6,10,.62)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'screen'; ctx.beginPath(); ctx.moveTo(T0[0] - 30 * v.k, T0[1]); ctx.lineTo(T0[0] + 30 * v.k, T0[1]); ctx.lineTo(F[0] + 150 * v.k, F[1]); ctx.lineTo(F[0] - 150 * v.k, F[1]); ctx.closePath();
  const c = ctx.createLinearGradient(0, T0[1], 0, F[1]); c.addColorStop(0, 'rgba(255,236,190,.22)'); c.addColorStop(1, 'rgba(255,236,190,.06)'); ctx.fillStyle = c; ctx.fill();
  ctx.fillStyle = 'rgba(255,230,180,.18)'; ctx.beginPath(); ctx.ellipse(F[0], F[1] + 4 * v.k, 150 * v.k, 26 * v.k, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
function A_podFront(ctx, v) { const a = A_EH.A(); if (a && a.podium) A_plate(ctx, a.podium, v); }
function A_scr(ctx, v, lines, k) { A_EH.screen(ctx, v, lines, k); A_podFront(ctx, v); }
function A_onScreen(ctx, v, fn) { const a = toS(v, [560, 255]), b = toS(v, [1370, 590]), w = b[0] - a[0], h = b[1] - a[1]; ctx.save(); ctx.beginPath(); ctx.rect(a[0], a[1], w, h); ctx.clip();
  ctx.fillStyle = 'rgba(14,24,18,.95)'; ctx.fillRect(a[0], a[1], w, h); ctx.translate(a[0], a[1]); fn(ctx, w, h); ctx.restore();  A_podFront(ctx, v); }
function A_screenFlash(ctx, v, k) { if (k <= .01) return; const a = toS(v, [560, 255]), b = toS(v, [1370, 590]); ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = `rgba(200,255,210,${k})`; ctx.fillRect(a[0], a[1], b[0] - a[0], b[1] - a[1]); ctx.restore();  A_podFront(ctx, v); }
function A_screenDark(ctx, v, k, rgb = '6,8,10') { if (k <= .01) return; const a = toS(v, [545, 240]), b = toS(v, [1385, 605]); ctx.save(); ctx.fillStyle = `rgba(${rgb},${k})`; ctx.fillRect(a[0], a[1], b[0] - a[0], b[1] - a[1]); ctx.restore();  A_podFront(ctx, v); }
// паутина по углам экрана: k 0..1 — разрослась
function A_cobwebs(ctx, v, k) { if (k <= .02) return; ctx.save(); ctx.strokeStyle = `rgba(230,230,220,${.55 * k})`; ctx.lineWidth = 1.5 * v.k;
  for (const [cx, cy, sx, sy] of [[560, 255, 1, 1], [1370, 255, -1, 1], [560, 590, 1, -1]]) { const c = toS(v, [cx, cy]), R = 150 * v.k * k;
    for (let i = 0; i <= 5; i++) { const an = (i / 5) * Math.PI / 2; ctx.beginPath(); ctx.moveTo(c[0], c[1]); ctx.lineTo(c[0] + sx * Math.cos(an) * R, c[1] + sy * Math.sin(an) * R); ctx.stroke(); }
    for (let r = 1; r <= 4; r++) { ctx.beginPath(); for (let i = 0; i <= 5; i++) { const an = (i / 5) * Math.PI / 2, rr = R * r / 4 * (i % 2 ? .9 : 1); const px = c[0] + sx * Math.cos(an) * rr, py = c[1] + sy * Math.sin(an) * rr; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke(); } }
  ctx.restore(); }
// редкие зрители в дальних рядах WIDE: голова и плечи над спинкой кресла (ниже верха спинки — закрыты креслом)
function A_heads(ctx, v, list) { for (const [x, y, r] of list) { const c = toS(v, [x, y - r * 1.2]), s = r * v.k; ctx.save(); const top = toS(v, [x, y])[1]; ctx.beginPath(); ctx.rect(0, 0, W, top); ctx.clip();
  ctx.fillStyle = '#0c0a0e'; ctx.beginPath(); ctx.arc(c[0], c[1], s, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(c[0], c[1] + s * 2, s * 1.8, s * 1.3, 0, Math.PI, 0); ctx.fill();
  ctx.strokeStyle = 'rgba(255,200,130,.45)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(c[0], c[1], s, Math.PI * 1.1, Math.PI * 1.7); ctx.stroke(); ctx.restore(); } }
// поварёнок на слайде (колпак, голова, фартук)
function A_cook(c, x, y, s) { c.fillStyle = '#F4F2EA'; c.strokeStyle = '#141014'; c.lineWidth = s * .08; c.beginPath(); c.arc(x, y, s * .38, 0, Math.PI * 2); c.fill(); c.stroke();
  c.beginPath(); c.ellipse(x, y - s * .55, s * .34, s * .26, 0, 0, Math.PI * 2); c.fill(); c.stroke(); c.fillRect(x - s * .22, y - s * .5, s * .44, s * .2);
  c.beginPath(); c.roundRect(x - s * .3, y + s * .38, s * .6, s * .5, s * .1); c.fill(); c.stroke(); c.fillStyle = '#141014'; c.beginPath(); c.arc(x - s * .12, y - s * .02, s * .05, 0, 6.283); c.arc(x + s * .12, y - s * .02, s * .05, 0, 6.283); c.fill(); }
// турникет на экране: первый проходит на «allowed», перед вторым опускается планка
function A_turnstile(c, w, h, t, ta) { const gx = w * .55, gy = h * .78, ink = '#141014';
  c.fillStyle = '#7a8a9a'; c.fillRect(gx - w * .03, gy - h * .34, w * .06, h * .34); c.strokeStyle = ink; c.lineWidth = 3; c.strokeRect(gx - w * .03, gy - h * .34, w * .06, h * .34);
  const p1 = lerp(w * .32, w * .78, E.inOutCubic(clamp((t - (ta - .45)) / .55))), down = E.outBack(clamp((t - ta - .15) / .25));
  const fig = (x, col) => { c.fillStyle = col; c.beginPath(); c.arc(x, gy - h * .5, h * .07, 0, 6.283); c.fill(); c.beginPath(); c.roundRect(x - h * .07, gy - h * .42, h * .14, h * .3, h * .06); c.fill(); c.fillRect(x - h * .05, gy - h * .14, h * .03, h * .14); c.fillRect(x + h * .02, gy - h * .14, h * .03, h * .14); };
  fig(p1, '#bfe8c8'); fig(w * .2, '#e8c8c8'); fig(w * .08, '#c8c8e8');
  c.save(); c.translate(gx, gy - h * .26); c.rotate(-Math.PI / 2 * (1 - down)); c.fillStyle = '#d0302a'; c.fillRect(-w * .22, -h * .025, w * .22, h * .05); c.restore();
  PA_label(c, 'ALLOWED', w * .78, h * .14, h * .08, '#7dff9a'); }
const PA_label = (c, s, x, y, sz, col) => A_PA.label(c, s, x, y, sz, col, { weight: 900, font: "Bahnschrift, 'Segoe UI', sans-serif" });
// пирог рынка: доля зелёного чипа g (остальное — красный безымянный)
function A_pie(c, w, h, g) { const cx = w * .5, cy = h * .52, r = h * .36; c.fillStyle = '#c8302a'; c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#4ade80'; c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * g); c.closePath(); c.fill(); c.strokeStyle = '#141014'; c.lineWidth = 4; c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.stroke();
  PA_label(c, 'MARKET', cx, h * .08, h * .08, '#e8f0e8'); A_chipIcon(c, w * .16, cy, h * .12, '#1f9a4c'); A_chipIcon(c, w * .84, cy, h * .12, '#a8201c'); }
function A_chipIcon(c, x, y, s, col) { c.fillStyle = col; c.fillRect(x - s, y - s, s * 2, s * 2); c.strokeStyle = '#141014'; c.lineWidth = s * .12; c.strokeRect(x - s, y - s, s * 2, s * 2); c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(x - s * .45, y - s * .45, s * .9, s * .9);
  for (let i = -2; i <= 2; i++) for (const sd of [-1, 1]) { c.fillStyle = '#c8c8b8'; c.fillRect(x + i * s * .36 - s * .06, y + sd * s - (sd > 0 ? 0 : s * .25), s * .12, s * .25); } }
// карта мира зеленеет (простые материки)
function A_worldMap(c, w, h, k) { c.save(); c.globalAlpha = k; c.fillStyle = '#0e2a18'; c.fillRect(0, 0, w, h); c.fillStyle = '#3ad070';
  for (const [x, y, rx, ry] of [[.22, .38, .12, .14], [.28, .68, .06, .14], [.5, .34, .08, .1], [.52, .62, .07, .14], [.7, .38, .16, .14], [.82, .72, .06, .06]]) { c.beginPath(); c.ellipse(w * x, h * y, w * rx, h * ry, 0, 0, 6.283); c.fill(); } c.restore(); }
function A_globe(c, x, y, r) { if (r <= 1) return; c.save(); c.fillStyle = '#2f7fb8'; c.strokeStyle = '#141014'; c.lineWidth = r * .07; c.beginPath(); c.arc(x, y, r, 0, 6.283); c.fill();   // глобус: океан, материки силуэтом, меридианы
  c.save(); c.clip(); c.fillStyle = '#4fc070'; for (const [dx, dy, rx, ry, a] of [[-.45, -.25, .32, .4, .3], [-.3, .45, .18, .3, -.2], [.25, -.3, .3, .22, 0], [.35, .2, .22, .35, .2]]) { c.beginPath(); c.ellipse(x + dx * r, y + dy * r, rx * r, ry * r, a, 0, 6.283); c.fill(); }
  c.strokeStyle = 'rgba(20,16,20,.55)'; c.lineWidth = r * .03; for (const k of [-.5, 0, .5]) { c.beginPath(); c.ellipse(x, y, r * Math.abs(Math.cos(k * 1.2)) * .9 + 1, r, 0, 0, 6.283); c.stroke(); c.beginPath(); c.moveTo(x - r, y + k * r); c.lineTo(x + r, y + k * r); c.stroke(); } c.restore();
  c.beginPath(); c.arc(x, y, r, 0, 6.283); c.lineWidth = r * .07; c.strokeStyle = '#141014'; c.stroke(); c.restore(); }
function A_stopwatch(c, x, y, r, u) { c.fillStyle = '#E8E4D8'; c.strokeStyle = '#141014'; c.lineWidth = r * .08; c.beginPath(); c.arc(x, y, r, 0, 6.283); c.fill(); c.stroke(); c.fillStyle = '#9aa0aa'; c.fillRect(x - r * .12, y - r * 1.3, r * .24, r * .3); c.strokeRect(x - r * .12, y - r * 1.3, r * .24, r * .3);
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; c.lineWidth = r * (i % 3 ? .025 : .05); c.beginPath(); c.moveTo(x + Math.cos(a) * r * .78, y + Math.sin(a) * r * .78); c.lineTo(x + Math.cos(a) * r * .92, y + Math.sin(a) * r * .92); c.strokeStyle = '#141014'; c.stroke(); }   // деления циферблата
  c.fillStyle = '#141014'; c.beginPath(); c.arc(x, y, r * .06, 0, 6.283); c.fill();
  const an = -Math.PI / 2 + u * 12; c.lineWidth = r * .06; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(an) * r * .8, y + Math.sin(an) * r * .8); c.strokeStyle = '#c8302a'; c.stroke(); }
// очередь учёных в коридоре (REV кабинета): от порога (y 600) к точке схода (740, 360); обрезка по проёму двери
function A_queue(ctx, v, t, T, solo, tn) {
  const door = [[515, 125], [876, 125], [876, 596], [515, 596]];
  ctx.save(); ctx.beginPath(); door.forEach((q, i) => { const P = toS(v, q); i ? ctx.lineTo(...P) : ctx.moveTo(...P); }); ctx.closePath(); ctx.clip();
  const ys = [392, 402, 414, 428, 446, 470, 502, 545, 598];
  for (let i = 0; i < ys.length; i++) { const y = ys[i], fs = .45 * (y - 360) / 238, xx = 740 - (y - 360) * .19 + (i % 2 ? 14 : -14) * fs / .45;
    A_person(ctx, A_SCI[i % A_SCI.length], v, t + i * .37, T, { at: [xx, y], fs, f: i % 2 ? -1 : 1, view: i > 5 ? null : 'threeQuarter', keys: [[0, i === ys.length - 1 && t > tn ? 'shock' : 'neutral']], look: [0, .05], shade: A_shadeOf([-.3, -1], '#ffc47a'), solo, seed: i }); }
  ctx.restore(); }
// часы на запястье (левая кисть), s — масштаб
function A_watch(c, h, s) { A_ell(c, h[0] + 6 * s, h[1] - 16 * s, 13 * s, 13 * s, '#E8E4D8', '#141014', 3 * s); c.strokeStyle = '#141014'; c.lineWidth = 2 * s; c.beginPath(); c.moveTo(h[0] + 6 * s, h[1] - 16 * s); c.lineTo(h[0] + 6 * s, h[1] - 25 * s); c.stroke(); c.fillStyle = '#3a2a1a'; c.fillRect(h[0] - 8 * s, h[1] - 20 * s, 4 * s, 8 * s); }
// мольберт с графиком по регионам в кабинете (пиксели плейта: доска 1440, 640, ширина 380; ножки до пола 1060)
function A_easel(ctx, v, china, glow) { const ink = '#141014', s = v.k;
  for (const [x0, x1] of [[1330, 1300], [1550, 1585], [1440, 1440]]) { const a = toS(v, [x0, 700]), b = toS(v, [x1, 1060]); ctx.strokeStyle = ink; ctx.lineWidth = 12 * s; ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke(); ctx.strokeStyle = '#6a4020'; ctx.lineWidth = 7 * s; ctx.stroke(); }
  const c = toS(v, [1440, 640]); A_PA.regionChart(ctx, c[0], c[1], 380 * s, china, glow); }

Object.assign(SKIP_PROPS, { "3|JENSEN: They're nanoseconds behind us": /0\.0000/, '3|Let American chips compete everywhere': /COMPETE/, '3|and Nvidia took a five-and-a-half-billio': /WRITE-OFF|\$5\.5B/, '2|so scientists could put all those cooks': /CUDA/ });
