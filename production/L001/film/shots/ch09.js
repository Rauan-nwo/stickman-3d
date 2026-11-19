// film/shots/ch09.js — постановка гл. 9 (владелец: рабочий B). Ключ плана — 'глава|начало текста' (film/keys.js).
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
import { inOutExpo, gauss, env, W_, W0, shake, whipPlates, focusBox, freezeFrame, candle, V, WHIP_DUR, wordAt, lineSpan } from './common.js';
import * as NR from '../staging/newsroom.js';
import * as PO from '../staging/porch.js';
import * as TD from '../staging/trading.js';
import * as B from '../props_B.js';
import * as MS from '../staging/megaspeed.js';
import * as PA from '../props_A.js';
import * as CU from '../staging/customs.js';
import { customs } from '../chars_A.js';
import { person, boardMember, spokesman, aide2, fieldAgent2, guest } from '../chars_B.js';
import { WA } from '../staging/washington.js';
import { NV } from '../staging/nvidia.js';
import { silhouette } from '../staging/desk.js';
import { official } from '../chars.js';
import { jensen, NOIR_FONT as F, ell } from 'engine';
import { plate, img, lazy, blurred, canvas } from '../staging/common.js';
import noCarPlate from '../../assets/bg_street_no_car.png';

import * as DNS from '../staging/dennys.js';   // L07 Denny's — общий конфиг (табличка [118, 440, 190])
const DN = { plaque: DNS.CFG.plaque }, DNA = () => { const a = DNS.A(); return a && { p: a.day }; }, holes = DNS.holes, screwsOut = (c, v, u) => DNS.screws(c, v, u, 'out');
const AN2_SEAT = [1350, 828];   // аналитик 2 — в кресле плейта (бёдра на подушке, спина к спинке); было [1250, 838] — «сидел» в воздухе перед креслом
const IMM = customs(), JH = jensen(), BOARD = boardMember(), SPOKES = spokesman(), KRESS = aide2(), FBI = fieldAgent2();
JH.spec.rig = { ...JH.spec.rig, armLayer: 'front', plantLegs: .02 };
const CONG15 = official({ hair: 'grey', glasses: false, tie: ['#2f5a8a', '#22446a'], suit: ['#5a5650', '#3a3632', '#1c1a18'] }), CONG = official({ hair: 'dark', tie: ['#8a1a24', '#6a121a'], suit: ['#4a5060', '#2e3240', '#16181e'] });
const SI = { nocar: img(noCarPlate) }, SA = lazy([SI.nocar], () => ({ nocar: SI.nocar }));
const up = (t, t0, d = .3) => E.outCubic(clamp((t - t0) / d));
let MEM = null; const memBuf = () => (MEM ||= canvas());
// ноутбук: (x, y) — середина низа клавиатуры (экран), w — ширина; screen(ctx, w, h) — содержимое экрана
function laptop(ctx, x, y, w, screen) { const h = w * .62; ctx.save(); ctx.translate(x, y); ctx.lineJoin = 'round'; ctx.strokeStyle = '#141014'; ctx.lineWidth = Math.max(2, w * .012);
  ctx.fillStyle = '#2a2a32'; ctx.beginPath(); ctx.moveTo(-w * .55, 0); ctx.lineTo(-w * .5, -w * .08); ctx.lineTo(w * .5, -w * .08); ctx.lineTo(w * .55, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#1a1a20'; ctx.beginPath(); ctx.roundRect(-w * .5, -w * .08 - h, w, h, w * .02); ctx.fill(); ctx.stroke();
  ctx.save(); ctx.beginPath(); ctx.rect(-w * .46, -w * .08 - h * .95, w * .92, h * .88); ctx.clip(); ctx.translate(-w * .46, -w * .08 - h * .95); screen(ctx, w * .92, h * .88); ctx.restore(); ctx.restore(); }
// письмо сотрудникам на экране: date 0..1 — впечатывается дата, to 0..1 — строка «To: ALL STAFF», sent 0..1 — кнопка SEND -> SENT
function letterScreen(x, w, h, { date = 1, to = 1, sent = 0, cursor = null } = {}) {
  x.fillStyle = '#eef1f6'; x.fillRect(0, 0, w, h); x.fillStyle = '#2f5a8a'; x.fillRect(0, 0, w, h * .1); B.txt(x, 'NEW MESSAGE', w * .03, h * .05, h * .05, { col: '#fff', font: F.label, w: 800 });
  const ty = (s, k, y, size, o = {}) => B.txt(x, s.slice(0, Math.ceil(s.length * clamp(k))), w * .05, y, size, o);
  ty('To: ALL STAFF', to, h * .2, h * .055, { w: 800 }); ty('Date: Nov 8', date, h * .29, h * .055, { w: 800 });
  B.lines(x, w * .05, h * .38, w * .85, 7, h * .065, { col: 'rgba(30,40,60,.4)' });
  const bx = w * .72, by = h * .86; x.fillStyle = sent > .5 ? '#3aa860' : '#2f5a8a'; x.beginPath(); x.roundRect(bx, by - h * .05, w * .22, h * .1, 6); x.fill(); B.txt(x, sent > .5 ? 'SENT ✓' : 'SEND', bx + w * .11, by, h * .055, { col: '#fff', font: F.label, w: 900, align: 'center' });
  if (cursor != null) { const cx = lerp(w * .4, bx + w * .12, cursor), cy = lerp(h * .6, by + h * .01, cursor); x.fillStyle = '#fff'; x.strokeStyle = '#000'; x.lineWidth = 2; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx, cy + h * .08); x.lineTo(cx + h * .025, cy + h * .06); x.lineTo(cx + h * .05, cy + h * .06); x.closePath(); x.fill(); x.stroke(); }
}
// снимок гостя (портрет из окна): гость по грудь
const guestPic = (x, w, h) => { x.fillStyle = '#3a2a22'; x.fillRect(0, 0, w, h); x.fillStyle = 'rgba(255,200,130,.25)'; x.fillRect(0, 0, w, h * .5); const s = h / 1050; B.miniFig(x, PO.CAST.GU, w * .5, h * .28 + 712 * s, s, { view: 'front', emo: 'smug' }); };
// снимок силуэта с подписью (2015, конгрессмен): красный круг k
const spyPic = k => (x, w, h) => { x.fillStyle = '#2a2a30'; x.fillRect(0, 0, w, h); B.bust(x, w * .5, h * .38, h * .6, '#0a0a0e', 'rgba(255,220,170,.4)'); B.redCircle(x, w * .5, h * .42, w * .3, h * .36, k, Math.max(3, w * .02)); };
// рука-рукав из-за края кадра (контекст — герой прошлого/соседнего плана): от точки E (экран, за краем) к кисти H; col — рукав
function sleeveArm(ctx, Ep, Hp, r, col) { const mx = lerp(Ep[0], Hp[0], .72), my = lerp(Ep[1], Hp[1], .72); ctx.save(); ctx.lineCap = 'round';
  ctx.strokeStyle = '#141014'; ctx.lineWidth = r * 1.35; ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(Hp[0], Hp[1]); ctx.stroke();
  ctx.lineWidth = r * 3.4; ctx.beginPath(); ctx.moveTo(Ep[0], Ep[1]); ctx.lineTo(mx, my); ctx.stroke(); ctx.strokeStyle = col; ctx.lineWidth = r * 3.0; ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.15)'; ctx.lineWidth = r * .5; ctx.beginPath(); ctx.moveTo(Ep[0], Ep[1] - r); ctx.lineTo(mx, my - r); ctx.stroke();
  ctx.fillStyle = '#141014'; ctx.beginPath(); ctx.arc(Hp[0], Hp[1], r, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }

export const SHOTS = {
  // ---------------- L07 Denny's (свой локальный конфиг на плейте bg_diner_day): табличка на стене над левой кабинкой ----------------
  "9|In San Jose, the Denny's where Nvidia": x => { const { ctx, t, cam, solo } = x, tp = W_(x, 'plaque', 3.36), v = camView({ cx: 330, cy: 470, k: 2.2 }, cam, .1);   // крупно: на «plaque» табличку откручивают — винты выходят, табличка уходит вниз; на стене две дырки
    if (solo) return; const a = DNA(); if (!a) return; ctx.save(); shake(ctx, cam); plate(ctx, a.p, v);
    const u = clamp((t - tp + .2) / .9), out = E.inCubic(clamp((u - .45) / .55)), swing = E.outBack(clamp((u - .2) / .3)) * .35 * (1 - out);
    holes(ctx, v, u > .2 ? 1 : 0);
    if (out < 1) { const P = toS(v, [DN.plaque[0], DN.plaque[1] + 260 * out]); ctx.save(); ctx.translate(P[0] - DN.plaque[2] * .45 * v.k, P[1] - 18 * v.k); ctx.rotate(swing); ctx.translate(DN.plaque[2] * .45 * v.k, 18 * v.k);
      PA.plaque(ctx, 0, 0, DN.plaque[2] * v.k, ['THE BOOTH THAT LAUNCHED', 'A $1 TRILLION COMPANY'], { lit: .3, screws: false }); ctx.restore(); }
    screwsOut(ctx, v, clamp((t - tp + .2) / .5));
    ctx.restore(); },
  '9|A day later': x => { const { ctx, t, cam, solo } = x, tb = W_(x, 'back', 2.14), v = camView({ cx: 330, cy: 470, k: 2.2 }, cam, .1);   // вставка: на «back» табличку прикручивают обратно, толчок; плашка A DAY LATER (ядро)
    if (solo) return; const a = DNA(); if (!a) return; ctx.save(); shake(ctx, cam); plate(ctx, a.p, v);
    const inn = E.outCubic(clamp((t - tb + .6) / .45)), kick = t > tb && t < tb + .25 ? 10 * Math.sin((t - tb) * 60) * (1 - (t - tb) / .25) : 0;
    holes(ctx, v, inn < 1 ? 1 : 0);
    if (inn > 0) { const P = toS(v, [DN.plaque[0], DN.plaque[1] + 300 * (1 - inn)]); ctx.save(); ctx.translate(P[0] + kick, P[1]); PA.plaque(ctx, 0, 0, DN.plaque[2] * v.k, ['THE BOOTH THAT LAUNCHED', 'A $1 TRILLION COMPANY'], { lit: .3, screws: t > tb }); ctx.restore(); }
    ctx.restore(); },

  // ---------------- L09 Megaspeed (плейты и реквизит рабочего A, только чтение) ----------------
  '9|Megaspeed now says she left': x => { const { ctx, t, cam, solo } = x, ta = W_(x, 'August', 2.38);   // вставка: на столе заявление MEGASPEED STATEMENT; на «August» печатается LEFT: AUGUST 2025
    if (solo) return; ctx.save(); shake(ctx, cam); MS.room(ctx, cover({ cx: 330, cy: 680, k: 2.2 }), 'O', 8, false); ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(0, 0, W, H);
    const z = 1 + (cam.z - 1) * .5; ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
    B.sheet(ctx, W / 2, H / 2 + 50, 640, 830, -.03, (c, w, h) => { B.txt(c, 'MEGASPEED STATEMENT', w * .08, h * .08, w * .05, { w: 900 }); c.fillStyle = '#141014'; c.fillRect(w * .08, h * .11, w * .84, 3); B.lines(c, w * .08, h * .16, w * .84, 6, h * .04);
      const s = 'LEFT: AUGUST 2025', k = clamp((t - ta + .15) / .5); B.txt(c, s.slice(0, Math.ceil(s.length * k)), w * .08, h * .45, w * .06, { w: 900, col: '#b3121f' }); B.lines(c, w * .08, h * .52, w * .84, 6, h * .04); });
    ctx.restore(); },
  '9|Where she is now, nobody will say': x => { const { ctx, t, T, cam, solo, d } = x, v = camView({ cx: 330, cy: 640, k: 1.9 }, cam, .2);   // средний: директорский стол Megaspeed — кресло пустое, на столе четыре дырки от винтов таблички; в конце наплыв на стул ресторана
    if (solo) return; ctx.save(); shake(ctx, cam); MS.room(ctx, v, 'O', 0, false);
    const P = toS(v, [300, 724]), w = 200 * v.k; ctx.save(); ctx.strokeStyle = 'rgba(255,225,170,.4)'; ctx.lineWidth = 2; ctx.strokeRect(P[0] - w / 2, P[1] - w * .16, w, w * .28); ctx.fillStyle = 'rgba(255,225,170,.06)'; ctx.fillRect(P[0] - w / 2, P[1] - w * .16, w, w * .28);
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) { const hx = P[0] + sx * w * .42, hy = P[1] - w * .02 + sy * w * .08; ctx.fillStyle = '#0c0806'; ctx.beginPath(); ctx.arc(hx, hy, 4.5 * v.k, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(255,220,160,.35)'; ctx.beginPath(); ctx.arc(hx + 1.5 * v.k, hy + 1.5 * v.k, 2 * v.k, 0, Math.PI * 2); ctx.fill(); } ctx.restore();
    const xf = clamp((t - (d - .5)) / .5); if (xf > 0) { const a = R.A(); if (a) { ctx.globalAlpha = xf; plate(ctx, a.plate, cover({ cx: 1640, cy: 820, k: 2.0 })); ctx.globalAlpha = 1; } }
    ctx.restore(); },

  // ---------------- L14 крыльцо: защитный брифинг ----------------
  '9|When American spies find a foreign': x => { const { ctx, t, T, cam, solo } = x, v = PO.view('wide', cam, .3), tf = W_(x, 'foreign', 1.5), tt = W_(x, 'tool', 4.3);   // общий крыльцо: в окне хозяин и гость смеются; на «foreign» красный круг вокруг гостя; на «tool» агент заносит костяшки над дверью
    const knock = env(t, tt - .25, x.d + 1, .3);
    ctx.save(); shake(ctx, cam);
    PO.porch(ctx, v, t, T, { solo, win: { laugh: true, circle: clamp((t - tf) / .5) }, a1: { look: [.6, -.1], R: { k: knock, to: [1125, 470] } }, a2: { look: [-.6, 0] } });
    ctx.restore(); },
  '9|Agents quietly explain who': x => { const { ctx, t, T, cam, solo, d } = x, v = PO.view('mid', cam, .3), tw = W_(x, 'works', 2.2);   // средний: стук, дверь открывается — мужчина в тапках с кружкой
    const k1 = .25, k2 = .55, knock = t < k2 + .2 ? clamp(Math.abs(Math.sin((t - .05) * Math.PI / .3))) : 0, open = E.inOutCubic(clamp((t - .9) / .5));
    ctx.save(); shake(ctx, cam);
    PO.porch(ctx, v, t, T, { solo, open, home: open > .3 ? { look: [0, .1], keys: [[0, 'neutral'], [1.4, 'nervous']] } : null, a1: { look: [.6, -.1], R: { k: t < 1 ? 1 : 1 - up(t, 1, .3), to: [1125, 470 + 16 * knock] } }, a2: { look: [-.6, .1] } });
    ctx.restore(); },
  '9|AGENT: Got a minute?': x => { const { ctx, t, T, cam, solo, s, d } = x, tw = s.whip?.t ?? d * .5, wu = inOutExpo((t - tw + .1) / WHIP_DUR);   // крупно AGENT показывает удостоверение -> вип-пан -> хозяин: кружка дрожит
    const v = lerpView(PO.view('a1', { ...cam, dx: 0 }), PO.view('home', { ...cam, dx: 0 }), clamp(wu)), show = env(t, .05, d + 1, .3);
    ctx.save(); shake(ctx, cam);
    PO.porch(ctx, v, t, T, { solo, blur: 3, open: 1, home: { look: [-.4, .1], keys: [[0, 'nervous']], tremble: t > tw ? 1 : .3, R: { k: 1, to: [1290, 440] } },
      a1: { look: [.5, 0], R: { k: show, to: [1100, 520] }, heldR: show > .3 ? (c, P, sc) => B.idBadge(c, P[0] + 70 * sc, P[1] - 20 * sc, 150 * sc, -.08) : null } });
    ctx.restore(); },
  '9|AGENT: No. Your new friend is': x => { const { ctx, t, T, cam, solo } = x, tf = W_(x, 'friend', 1.62);   // вставка: агент протягивает фото — на нём тот самый гость из окна
    if (solo) return; ctx.save(); shake(ctx, cam); const v = PO.view('home', cam, .1);
    PO.porch(ctx, v, t, T, { blur: 6, open: 1, home: { look: [-.2, .2], keys: [[0, 'nervous']], tremble: .6, R: { k: 1, to: [1290, 440] } } });
    const k = E.outCubic(clamp((t - .1) / .5)), Hp = [lerp(700, 700, k), lerp(1250, 880, k)];
    ctx.save(); const sc = 1 + .08 * gauss(t, tf, .2); B.photo(ctx, Hp[0] + 220, Hp[1] - 160, 420 * sc, -.06, guestPic); ctx.restore();
    B.insertSleeve(ctx, [Hp[0] + 34, Hp[1] + 30], [Hp[0] - 40, H + 140], 36, B.CLOTH.agent1);   // снизу, от ближнего края   // рукав пиджака агента 1, манжета рубашки; кисть держит нижний край снимка
    ctx.restore(); },
  '9|Jensen never got that knock': x => { const { ctx, t, T, cam, solo } = x, v = camView({ cx: 1300, cy: 470, k: 1.6 }, cam, .2);   // та же плита, дом Дженсена: на почтовом ящике HUANG, за стеклом кожанка; фонарь горит, никто не стучит, мотылёк у лампы
    ctx.save(); shake(ctx, cam); PO.porch(ctx, v, t, T, { solo, huang: true, moth: true }); ctx.restore(); },
  // ---------------- L04: конгрессмен 2015 и агент; конгрессмен у двери ----------------
  '9|about a suspected Chinese spy': x => { const { ctx, t, T, cam, solo } = x, v = WA.view('mid', cam), ts = W_(x, 'spy', 1.54), tc = W_(x, 'circle', 2.44);   // средний: агент ФБР кладёт на стол фото силуэта с плашкой; на «circle» вокруг силуэта красный круг. Агент стоит ЗА столом на полу: низ корпуса у линии столешницы (было at y 880 — ноги стояли на стопке книг, замечание Рауана)
    const put = E.outCubic(clamp((t - ts + .4) / .4));
    ctx.save(); shake(ctx, cam); WA.widePlate(ctx, v, 0, solo);
    ctx.save(); { const yc = toS(v, [0, 764])[1]; ctx.beginPath(); ctx.rect(0, 0, W, yc); ctx.clip(); }   // агент стоит ЗА столом: ниже столешницы и стопки книг его не видно
    const r = person(ctx, v, t, T, { C: FBI, at: [1255, 955], fs: .6, view: 'threeQuarter', facing: -1, light: [-1, .1], keys: [[0, 'neutral']], look: [-.6, .5], lean: -.08 * (1 - put * .5), L: { k: 1 - put * .6, to: [1060, 800] } }); ctx.restore();
    WA.seated(ctx, v, t, T, { C: CONG15, solo, noPlate: true, keys: [[0, 'neutral'], [ts + .3, 'nervous']], look: [.2, .6],
      deskTop: (c, vv) => { const P = toS(vv, [lerp(1080, 1010, put), lerp(770, 812, put)]); c.save(); c.translate(P[0], P[1]); c.scale(1, lerp(.8, .5, put)); B.photo(c, 0, 0, 150 * vv.k, .08, spyPic(clamp((t - tc) / .5))); c.restore(); } });
    ctx.restore(); },
  "9|CONGRESSMAN: We'd like a closed-door": x => { const { ctx, t, T, cam, solo } = x, v = WA.view('revDoor', cam, .2), tb = W_(x, 'briefing', 1.2);   // крупно конгрессмен закрывает дверь с табличкой CLOSED BRIEFING
    const cl = E.inOutCubic(clamp((t - tb + .4) / .45));
    ctx.save(); shake(ctx, cam); WA.revPlate(ctx, v, 0, solo);
    if (!solo) { const a = toS(v, [1150, 330]); ctx.save(); ctx.translate(a[0], a[1]); ctx.rotate(-.02); ctx.fillStyle = '#efe4c8'; ctx.strokeStyle = '#141014'; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(0, 0, 150 * v.k, 44 * v.k, 4); ctx.fill(); ctx.stroke(); B.txt(ctx, 'CLOSED BRIEFING', 75 * v.k, 22 * v.k, 15 * v.k, { align: 'center', w: 900, col: '#b3121f' }); ctx.restore(); }
    WA.standing(ctx, v, t, T, { C: CONG, rev: true, at: 'door', dx: -110, sp: 'CONGRESSMAN', solo, view: 'threeQuarter', facing: 1, look: [-.3, 0], R: { k: 1, to: [lerp(1040, 1110, cl), 520] } });
    if (!solo && cl > 0) { ctx.fillStyle = `rgba(0,0,0,${.25 * cl})`; ctx.fillRect(0, 0, W, H); }
    WA.revFront(ctx, v, 0, solo);
    ctx.restore(); },
  // ---------------- L01 ресторан: повтор хука, пустой стол ----------------
  '9|Nobody told the man at the table': x => { const { ctx, t, T, cam, solo, s } = x, tt = W_(x, 'table', 1.58), ts = Math.min(t, tt + .05), v = camView({ cx: 470, cy: 690, k: 1.55 }, { ...cam, z: x.camAt(ts).z, dx: 0 });   // POV из-за меню: рамка фокуса на Дженсене, он смеётся и поднимает руку; щелчок — кадр застывает снимком
    R.wide(ctx, v, ts, T - t + ts, { solo, j: { keys: [[0, 'smug'], [.2, 'laugh', { talking: false }]], laugh: ts > .2, at: .45 }, a: { keys: [[0, 'smug']] } });
    if (!solo) { const [fx, fy] = R.flame(v); candle(ctx, fx, fy, v.k, .4 + .02 * Math.sin(ts * 2.8)); const hd = toS(v, [270, 560]); focusBox(ctx, hd[0], hd[1] + 40, 360, 460, t > .6 ? 1 : 0); x.API.viewfinder(ctx, t); freezeFrame(ctx, t - tt); } },
  '9|Go back to that dinner in Singapore': x => { const { ctx, t, T, cam, solo } = x, v = camView(V.rWide, cam, .3, .3), td = W_(x, 'dinner', .6);   // общий: пустой стол; на «dinner» свечи разгораются (снимки D26-B — переход ядра)
    if (solo) return; const a = R.A(); if (!a) return; ctx.save(); shake(ctx, cam); plate(ctx, a.plate, v); const [fx, fy] = R.flame(v); candle(ctx, fx, fy, v.k, .3 + .7 * up(t, td, .4) + .02 * Math.sin(t * 2.8)); ctx.restore(); },
  '9|The candles. The toast to good partners': x => { const { ctx, t, T, cam, solo } = x, tp = W_(x, 'partners', 2.04), v = camView(V.rRev, cam, .5);   // повтор тоста гл. 1 выцветшим цветом, как память: бокалы встречаются над свечой
    const b = memBuf(), bx = b.getContext('2d'); bx.setTransform(1, 0, 0, 1, 0, 0); bx.clearRect(0, 0, W, H); if (solo) { bx.fillStyle = '#000'; }
    const hold = env(t, .1, x.d + 1, .3), tCl = Math.max(.7, tp - .1);
    const r = R.rev(bx, v, t, -100, { solo, hold, glass: { slosh: t > tCl ? Math.sin((t - tCl) * 14) * Math.exp(-(t - tCl) * 3.2) * .16 : 0 } }); if (!solo && r.hand) R.toastIn(bx, v, t, tCl, r);
    ctx.save(); ctx.filter = solo ? 'none' : 'sepia(.55) saturate(.55) brightness(.92) contrast(.95)'; ctx.drawImage(b, 0, 0); ctx.restore();
    if (!solo) { ctx.save(); const g = ctx.createRadialGradient(W / 2, H / 2, H * .3, W / 2, H / 2, H * .9); g.addColorStop(0, 'rgba(255,240,210,0)'); g.addColorStop(1, 'rgba(255,240,210,.28)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore(); } },
  '9|Both chairs are empty now': x => { const { ctx, t, T, cam, solo } = x, v = camView({ cx: 960, cy: 700, k: 1.3 }, cam, .3), te = W_(x, 'empty', .7);   // та же ось, людей нет: два бокала там, где их держали; салфетка соскальзывает со стула
    if (solo) return; const a = R.A(); if (!a) return; ctx.save(); shake(ctx, cam); plate(ctx, a.plate, v);
    const sl = E.inCubic(clamp((t - te) / .6)), N = toS(v, [1590 + 30 * sl, 870 + 150 * sl]); ctx.save(); ctx.translate(N[0], N[1]); ctx.rotate(.2 + 1.2 * sl); ctx.fillStyle = '#f4efe2'; ctx.strokeStyle = '#141014'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-40 * v.k, -10 * v.k); ctx.lineTo(40 * v.k, -18 * v.k); ctx.lineTo(46 * v.k, 30 * v.k); ctx.lineTo(-30 * v.k, 36 * v.k); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    const [fx, fy] = R.flame(v); candle(ctx, fx, fy, v.k, .3 + .02 * Math.sin(t * 2.8)); ctx.restore(); },
  '9|America watched that table': x => { const { ctx, t, cam, solo, d } = x;   // отъезд на улицу: машины агентов нет, на мокром асфальте сухой прямоугольник
    if (solo) return; const a = SA(); if (!a) return; const u = E.inOutCubic(clamp(t / (d * .9))), v = cover({ cx: lerp(1250, 900, u), cy: lerp(600, 560, u), k: lerp(1.9, 1.05, u) });
    plate(ctx, a.nocar, v); const P0 = toS(v, [40, 688]), P1 = toS(v, [525, 724]); ctx.save(); ctx.fillStyle = '#26303c'; ctx.beginPath(); ctx.roundRect(P0[0], P0[1], P1[0] - P0[0], P1[1] - P0[1], 10 * v.k); ctx.fill(); ctx.restore(); },
  // ---------------- L06 кабинет Nvidia: письмо, совет, новый CEO, пресс-секретарь ----------------
  '9|On November 8, Jensen wrote a letter': x => { const { ctx, t, T, cam, solo } = x, v = camView({ cx: 1180, cy: 620, k: 1.25 }, cam, .3), tn = W_(x, 'November', .08), ts = W_(x, 'staff', 2.54);   // обратная: силуэт Дженсена у тёмного окна; на ноутбуке письмо — дата Nov 8, To: ALL STAFF
    ctx.save(); shake(ctx, cam); NV.revPlate(ctx, v, 0, solo);
    silhouette(ctx, c => person(c, v, t, T, { C: JH, at: [1700, 760], fs: .46, view: 'side', facing: 1, light: [1, 0], keys: [[0, 'neutral']], look: [1, -.1], blinkOff: true }), { col: '#0a0c14', rim: 'rgba(170,200,255,.55)', rimDir: [1, -.2] });
    NV.revFront(ctx, v, 0, solo);
    if (!solo) { const P = toS(v, [1330, 905]); laptop(ctx, P[0], P[1], 300 * v.k, (c, w, h) => letterScreen(c, w, h, { date: clamp((t - tn) / .4), to: clamp((t - ts + .2) / .4) })); }
    ctx.restore(); },
  '9|In it, he admitted he had been': x => { const { ctx, t, cam, solo } = x, ta = W_(x, 'admitted', .64);   // вставка: экран ноутбука с письмом; на «admitted» курсор жмёт SEND -> SENT
    if (solo) return; ctx.save(); shake(ctx, cam); NV.revPlate(ctx, cover({ cx: 1330, cy: 860, k: 3 }), 6, false); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(0, 0, W, H);
    const z = 1 + (cam.z - 1) * .5; ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
    laptop(ctx, W / 2, H * .95, 1300, (c, w, h) => letterScreen(c, w, h, { sent: clamp((t - ta) / .1), cursor: clamp((t - ta + .5) / .45) }));
    ctx.restore(); },
  '9|JENSEN: I was unfaithful': x => { const { ctx, t, T, cam, solo } = x, v = NV.view('cu', cam), tw = W_(x, 'wife', 1.22);   // крупно Дженсен: опускает глаза, лампа тускнеет
    const down = up(t, 0, .35);
    ctx.save(); shake(ctx, cam);
    NV.seated(ctx, v, t, T, { C: JH, sp: 'JENSEN', solo, blur: 3, keys: [[0, 'nervous']], rest: 'flat', look: [0, lerp(.1, .85, down)], tilt: .06 * down, lean: .04 * down });
    if (!solo) { ctx.fillStyle = `rgba(0,0,4,${.35 * up(t, tw - .3, .8)})`; ctx.fillRect(0, 0, W, H); }
    ctx.restore(); },
  "9|Then everything moved at once": x => { const { ctx, t, T, cam, solo } = x, v = NV.view('wide', cam, .3), tb = W_(x, "We're", 1.2);   // средний: член совета кладёт папку на стол Дженсена (кресло пустое)
    const put = env(t, .2, tb + .4, .4, .35), lay = clamp((t - .6) / .1);
    ctx.save(); shake(ctx, cam); NV.widePlate(ctx, v, 0, solo);
    if (!solo) { const P = toS(v, [1120, 702]); if (lay > 0) { ctx.save(); ctx.translate(P[0], P[1]); ctx.scale(1, .45); ctx.fillStyle = '#2a3658'; ctx.strokeStyle = '#141014'; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(-70 * v.k, -50 * v.k, 140 * v.k, 100 * v.k, 4); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#efe4c8'; ctx.fillRect(-40 * v.k, -20 * v.k, 80 * v.k, 30 * v.k); ctx.restore(); } }
    NV.standing(ctx, v, t, T, { C: BOARD, at: 'frontR', dx: -40, sp: 'BOARD', solo, view: 'threeQuarter', facing: -1, look: [-.5, .3], R: { k: put, to: [1140, 700] },
      heldR: put > .3 && lay <= 0 ? (c, P, s) => { c.fillStyle = '#2a3658'; c.strokeStyle = '#141014'; c.lineWidth = 3; c.beginPath(); c.roundRect(P[0] - 140 * s, P[1] - 50 * s, 150 * s, 110 * s, 4); c.fill(); c.stroke(); } : null });
    ctx.restore(); },
  '9|Chief financial officer Colette Kress': x => { const { ctx, t, T, cam, solo } = x, v = NV.view('revDoor', cam, .2);   // средний: в дверях кабинета силуэт; подпись COLETTE KRESS · INTERIM CEO (ядро)
    const step = E.outCubic(clamp(t / .9));
    ctx.save(); shake(ctx, cam); NV.revPlate(ctx, v, 0, solo);
    silhouette(ctx, c => person(c, v, t, T, { C: KRESS, at: [lerp(500, 540, step), lerp(640, 652, step)], fs: .4, view: 'front', facing: 1, light: [-1, .2], keys: [[0, 'neutral']], blinkOff: true }), { col: '#0c0a10', rim: 'rgba(255,200,140,.6)', rimDir: [0, -1] });
    if (!solo) { ctx.save(); ctx.beginPath(); [[383, 668], [392, 600], [404, 560], [400, 515], [440, 510], [445, 552], [470, 550], [512, 565], [548, 604], [558, 631], [530, 653], [440, 676]].forEach((q, i) => { const P = toS(v, q); i ? ctx.lineTo(P[0], P[1]) : ctx.moveTo(P[0], P[1]); }); ctx.closePath(); ctx.clip(); NV.revPlate(ctx, v, 0, solo); ctx.restore(); }   // абажур настольной лампы — передний план поверх ног силуэта (ноги стояли на абажуре)
    NV.revFront(ctx, v, 0, solo);
    ctx.restore(); },
  '9|SPOKESMAN: None at all': x => { const { ctx, t, T, cam, solo, d } = x, v = NV.view('front', cam, .2);   // средний: пресс-секретарь Nvidia в кабинете с зелёной полосой опускает телефон
    const down = up(t, d - .6, .4);
    ctx.save(); shake(ctx, cam); NV.widePlate(ctx, v, 0, solo);
    NV.standing(ctx, v, t, T, { C: SPOKES, at: 'front', dx: 60, sp: 'SPOKESMAN', solo, view: 'threeQuarter', facing: 1, look: [.3, 0], L: { k: 1 - down, to: [556, 612] }, heldL: down < .6 ? (c, P, s) => PR.handsetHeld(c, P, s, -1) : null });
    ctx.restore(); },
  // ---------------- L13 редакция ----------------
  '9|President Trump said the FBI': x => { const { ctx, t, T, cam, solo } = x, v = camView({ cx: 1530, cy: 430, k: 3.4 }, cam, .15), tf = W_(x, 'FBI', 1.04);   // средний: ТВ над столами — экстренный выпуск; на «FBI» бегущая строка
    ctx.save(); shake(ctx, cam); NR.room(ctx, v, t, T, { solo, tv: { scene: NR.sceneWhiteHouse, breaking: true, ticker: 'TRUMP: FBI IS LOOKING INTO IT', tickerBand: .19, tickerK: up(t, tf, .35), tickerRun: 0 } }); ctx.restore(); },
  '9|REPORTER: Any reason given': x => { const { ctx, t, T, cam, solo } = x, v = NR.view('rep', cam, .2);   // крупно репортёр говорит в трубку
    ctx.save(); shake(ctx, cam); NR.room(ctx, v, t, T, { solo, blur: 3, rep: { handset: 'L', look: [.5, .1], keys: [[0, 'neutral']] } }); ctx.restore(); },
  "9|When China's DeepSeek released": x => { const { ctx, t, T, cam, solo } = x, v = NR.view('tv', cam, .1), td = W_(x, 'DeepSeek', .6), tc = W_(x, 'cheap', 1.72);   // ТВ крупно: выпуск о DeepSeek; плашка DEEPSEEK · JAN 2025, ценник CHEAP AI MODEL
    ctx.save(); shake(ctx, cam); NR.room(ctx, v, t, T, { solo, blur: 6, tvBezel: true, tv: { scene: NR.sceneDeepSeek(clamp((t - tc) / .4)), bug: 'NEWS', chyron: 'DEEPSEEK · JAN 2025', chyronK: up(t, td, .35), chyronSize: .08 } }); ctx.restore(); },
  '9|CNN later reported that US intelligence': x => { const { ctx, t, T, cam, solo } = x, v = NR.view('tv', cam, .1), ts = W_(x, 'sure', 2.94), tr = W_(x, 'risk', 5.64);   // ТВ крупно: экстренный выпуск; на «sure» бегущая строка; на «risk» плашка SOURCES: A RISK
    ctx.save(); shake(ctx, cam); NR.room(ctx, v, t, T, { solo, blur: 6, tvBezel: true, tv: { scene: NR.sceneAlice, breaking: true, ticker: "US INTEL ISN'T SURE SHE SPIED · SOURCE: CNN · ", tickerK: up(t, ts, .35), tickerRun: Math.max(0, t - ts - .35), chyron: t >= tr ? 'SOURCES: A RISK' : null, chyronK: up(t, tr, .3), chyronSize: .09 } }); ctx.restore(); },
  // ---------------- L19 трейдеры ----------------
  '9|And its next earnings report': x => { const { ctx, t, cam, solo } = x, te = W_(x, 'earnings', .44), tf = W_(x, 'five', 1.86);   // вставка: настольный календарь у тикера NVDA; на «earnings» обводится дата EARNINGS; на «five» — IN 5 DAYS
    if (solo) return; ctx.save(); shake(ctx, cam); const a = TD.A(); if (a) plate(ctx, a.b6, cover({ cx: 960, cy: 620, k: 2.4 * (1 + (cam.z - 1) * .5) }));
    ctx.save(); ctx.translate(380, 160); B.deskCalendar(ctx, 720, 620, clamp((t - te) / .45), clamp((t - tf) / .3)); ctx.restore();
    ctx.save(); ctx.translate(1180, 300); B.tickerPanel(ctx, 600, 150); ctx.restore(); ctx.restore(); },
  '9|ANALYST: What did the affair cost': x => { const { ctx, t, T, cam, solo } = x, v = TD.view('a1', cam, .2);   // крупно аналитик 1: стена красных тикеров
    ctx.save(); shake(ctx, cam); TD.desk(ctx, v, t, T, { solo, blur: 3, an1: { look: [.6, -.05] }, an2: { at: AN2_SEAT, look: [-.6, 0] } }); ctx.restore(); },
  '9|ANALYST 2: About fourteen percent': x => { const { ctx, t, T, cam, solo, s, d } = x, tw = s.whip?.t ?? d * .6, wu = inOutExpo((t - tw + .1) / WHIP_DUR);   // средний: аналитик 2 разворачивается на стуле -> вип-пан -> аналитик 1 моргает
    const v = lerpView(TD.view('a2', { ...cam, dx: 0 }), TD.view('a1', { ...cam, dx: 0 }), clamp(wu)), sw = E.inOutCubic(clamp(t / .45)), bl = gauss(t, tw + .35, .06) > .5;
    ctx.save(); shake(ctx, cam); TD.desk(ctx, v, t, T, { solo, blur: 3, an2: { at: AN2_SEAT, view: sw < .5 ? 'back' : 'threeQuarter', look: [-.6, 0] }, an1: { look: [.6, 0], eyes: bl ? 'closed' : undefined, blinkOff: true } }); ctx.restore(); },
  '9|ANALYST 2: Of your retirement fund': x => { const { ctx, t, cam, solo } = x, tr = W_(x, 'retirement', .25);   // вставка монитор: YOUR RETIREMENT ACCOUNT — S&P 500; кусок NVDA краснеет −14 %, палец стучит по нему
    if (solo) return; ctx.save(); shake(ctx, cam); const a = TD.A(); if (a) plate(ctx, a.b6, cover({ cx: 1330, cy: 560, k: 2.6 }));
    let P = [0, 0]; B.tv(ctx, W / 2, H * .48, 1500 * (1 + (cam.z - 1) * .5), 0, t, { scene: (c, w, h) => { P = B.retirementScreen(c, w, h, { red: clamp((t - tr) / .35), tap: t - tr - .55 }); } });
    const tap = Math.max(0, Math.sin(clamp((t - tr - .45) / .2) * Math.PI)), z = 1 + (cam.z - 1) * .5, Hp = [W / 2 + (806 - W / 2) * z + 18, H * .48 + (447 - H * .48) * z + 22 - 30 * (1 - tap)];
    B.insertSleeve(ctx, Hp, [Hp[0] + 520, -60], 30, B.CLOTH.analyst2);   // сверху, от ближнего края   // рукав чёрного пиджака аналитика 2
    ctx.restore(); },
  '9|the index behind millions': x => { const { ctx, t, cam, solo } = x, tr = W_(x, 'retirement', 1.56);   // крупно экран пенсионного счёта: на «retirement» плашка 401(K) · IRA, кусок NVDA подсвечен
    if (solo) return; ctx.save(); shake(ctx, cam); const a = TD.A(); if (a) plate(ctx, a.b6, cover({ cx: 1330, cy: 560, k: 2.6 }));
    const z = 1.25 * (1 + (cam.z - 1) * .5); B.tv(ctx, W / 2, H * .5, 1500 * z, 0, t, { scene: (c, w, h) => B.retirementScreen(c, w, h, { red: 1, pop: up(t, .2, .4), tag: clamp((t - tr) / .3) }) });
    ctx.restore(); },

};
export const OVER = {
  // триптих «всё сразу»: папка совета на столе Дженсена | закрытая дверь CLOSED BRIEFING | пограничник ставит штамп DENIED (окна шаблона ядра закрыты целиком)
  '9|IMMIGRATION: Alice Huang?': (ctx, s, t, d) => { const T = s.start + t, x = { s }, td = W_(x, 'denied', d * .6), n = 3, pw = W / n;
    const pane = (i, fn) => { ctx.save(); ctx.beginPath(); ctx.rect(i * pw + 4, 0, pw - 8, H); ctx.clip(); ctx.translate(i * pw + pw / 2 - W / 2, 0); fn(); ctx.restore(); };
    pane(0, () => { const v = cover({ cx: 1310, cy: 640, k: 1.5 }); NV.widePlate(ctx, v, 0, false);
      const P = toS(v, [1120, 702]); ctx.save(); ctx.translate(P[0], P[1]); ctx.scale(1, .45); ctx.fillStyle = '#2a3658'; ctx.strokeStyle = '#141014'; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(-70 * v.k, -50 * v.k, 140 * v.k, 100 * v.k, 4); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#efe4c8'; ctx.fillRect(-40 * v.k, -20 * v.k, 80 * v.k, 30 * v.k); ctx.restore();
      NV.standing(ctx, v, t, T, { C: BOARD, at: 'frontR', dx: 40, view: 'threeQuarter', facing: -1, look: [-.5, .3] }); });
    pane(1, () => { const v = WA.view('revDoor', { z: 1, dx: 0, dy: 0 }); WA.revPlate(ctx, v, 0, false);
      const a = toS(v, [1150, 330]); ctx.save(); ctx.translate(a[0], a[1]); ctx.fillStyle = '#efe4c8'; ctx.strokeStyle = '#141014'; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(0, 0, 150 * v.k, 44 * v.k, 4); ctx.fill(); ctx.stroke(); B.txt(ctx, 'CLOSED BRIEFING', 75 * v.k, 22 * v.k, 15 * v.k, { align: 'center', w: 900, col: '#b3121f' }); ctx.restore();
      WA.revFront(ctx, v, 0, false); });
    pane(2, () => { const v = cover(CU.views.booth), k = env(t, td - .3, d + 1, .2, .2); CU.gate(ctx, v, 0, false);
      const r = CU.officer(ctx, IMM, v, t, T, { sp: 'IMMIGRATION', keys: [[0, 'neutral']], look: [-.3, .5], R: { k, to: [1430, 640] }, out: 'R' });
      const P = toS(v, [1420, 660]); ctx.save(); ctx.translate(P[0], P[1]); ctx.scale(1, .6); B.sheet(ctx, 0, 0, 120 * v.k, 160 * v.k, .1, (c, w, h) => { c.fillStyle = '#1e2a4a'; c.fillRect(0, 0, w, h * .18); B.txt(c, 'PASSPORT', w / 2, h * .09, h * .08, { col: '#e8d08a', font: F.label, w: 800, align: 'center' }); B.stamp(c, w / 2, h * .55, 'DENIED', h * .14, t - td, -.15); }); ctx.restore(); });
    ctx.fillStyle = '#000'; ctx.fillRect(pw - 4, 0, 8, H); ctx.fillRect(2 * pw - 4, 0, 8, H); },

  '9|about a suspected Chinese spy': B.plaquesAt(1120, 985),   // плашка у фото на столе (была слева вверху — поверх волос конгрессмена)
  '9|Chief financial officer Colette Kress': B.plaquesAt(1380, 130),
};
export const SKIP_PROPS = { "9|In San Jose, the Denny's where Nvidia": /BOOTH/, '9|IMMIGRATION: Alice Huang?': /./, '9|Where she is now, nobody will say': /MANAGING/, '9|Megaspeed now says she left': /./, '9|about a suspected Chinese spy': /./, "9|CONGRESSMAN: We'd like a closed-door": /CLOSED/, '9|Jensen never got that knock': /HUANG/, '9|On November 8, Jensen wrote a letter': /./, '9|In it, he admitted he had been': /./,
  '9|Chief financial officer Colette Kress': /./, '9|President Trump said the FBI': /./, "9|When China's DeepSeek released": /./, '9|CNN later reported that US intelligence': /./, '9|And its next earnings report': /./, '9|ANALYST 2: Of your retirement fund': /./, '9|the index behind millions': /./ };
export const RAIN = s => (/L09|L10|L12/.test(s.loc) ? false : undefined);   // офис Megaspeed, бар, таможня — в помещении дождя поверх кадра нет (как в гл. 4–6; была штриховка «////» в офисе)
