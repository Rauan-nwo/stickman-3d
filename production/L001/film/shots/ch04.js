// film/shots/ch04.js — постановка гл. 4 (владелец: рабочий A). Ключ плана — 'глава|начало текста' (film/keys.js).
// Контракт рабочего — film/README.md, «Работа по главам». Рисовальщик плана: x => {...}, x = { ctx, s, t, d, T, cam, camAt, solo, API }.
// Локация — L09 Megaspeed (staging/megaspeed.js); все события стоят на своих словах (W_/W0 по words.json).
import { clamp, lerp, E, gesture } from 'engine';
import { W, H, camView, toS, lerpView, cover } from '../staging/common.js';
import * as PR from '../props.js';
import { inOutExpo, gauss, env, W_, W0, shake, whipPlates, focusBox, freezeFrame, candle, V, WHIP_DUR, wordAt, lineSpan } from './common.js';
import { camA, zoomAt, plaqueA } from '../staging/camA.js';
import * as MS from '../staging/megaspeed.js';
import * as PA from '../props_A.js';
import { alice } from 'engine';
import { clerk, staffer, renter, rep, courier, receptionist, guest, fan, person, shadeOf, handS } from '../chars_A.js';
import * as JK from '../staging/jokes_A.js';
import { ell } from 'engine';

const AL = alice(); AL.spec.rig = { ...AL.spec.rig, plantLegs: .02, armLayer: 'front' };
const CL = clerk(), ST = staffer(), RT = renter(), RP = rep(), CO = courier(), RC = receptionist();
const MV = MS.views;
const NB = guest(2), KID = fan();
const JK_person = (c, C, v, t, T, o) => person(c, C, v, t, T, { shade: shadeOf([0, -1], '#ffc47a'), shadow: false, ...o });
// фонарик в кисти: h — кисть (экран), a — направление луча, s — масштаб, on — горит
function flashlightA(c, h, a, s, on) { c.save(); c.translate(h[0], h[1]); c.rotate(a); PA.rrect(c, -10 * s, -12 * s, 80 * s, 24 * s, 6 * s, '#2b2f38', '#141014', 4 * s); PA.rrect(c, 66 * s, -18 * s, 26 * s, 36 * s, 5 * s, '#3c424e', '#141014', 4 * s); if (on) ell(c, 92 * s, 0, 5 * s, 15 * s, '#fff6da', null); c.restore(); }
// вип со смазом между двумя кадрами одного плейта: смаз делает ядро (smearInto), здесь — только переход кадра
const whipU = (t, tw) => clamp(inOutExpo((t - tw + .1) / WHIP_DUR));
// вывеска компании над дверью (R / R7): текст, свет 0..1
export const sign = (ctx, v, text, lit = 1, dx = 0, dy = 0, a = 0) => { const P = toS(v, [667 + dx, 186 + dy]); ctx.save(); ctx.translate(P[0], P[1]); ctx.rotate(a); PA.signBox(ctx, 0, 0, 330 * v.k, text, lit); ctx.restore(); };
// табличка на двери R: строки, свет
export const doorPlaque = (ctx, v, lines, o = {}) => { const [x, y, w] = MS.CFG.door.plaque, P = toS(v, [x + (o.dx || 0), y + (o.dy || 0)]); PA.plaque(ctx, P[0], P[1], w * v.k * (o.scale || 1), lines, { a: o.a || 0, lit: o.lit || 0 }); };
// коробки за стеклом серверной (O): n рядов растут к потолку (grow 0..1); стекло и рамы плейта — поверх
export function glassBoxes(ctx, v, grow, t) {
  const rows = Math.round(lerp(0, 9, clamp(grow))), cols = [[1640, 150], [1790, 150], [1940, 150]], mid = [[1440, 110]];
  for (let r = 0; r < rows; r++) for (const [x, w] of cols) { if (r < 2 && x < 1900) continue; const P = toS(v, [x, 780 - r * 82]); PA.carton(ctx, P[0], P[1], w * v.k * .98, 80 * v.k, { side: .12, dark: .05 }); }
  for (let r = 0; r < Math.max(0, rows - 3); r++) for (const [x, w] of mid) { const P = toS(v, [x, 735 - r * 72]); PA.carton(ctx, P[0], P[1], w * v.k, 70 * v.k, { side: .12, dark: .2 }); }
  void t;
}
// стекло серверной поверх коробок: бирюзовый тон, блик и рамы плейта
const GLASS = [[1090, 0], [1920, 0], [1920, 985], [1090, 688]];
const MULL = [[[1553, 0], [1583, 0], [1583, 885], [1553, 878]], [[1372, 28], [1389, 28], [1389, 822], [1372, 818]], [[1197, 150], [1217, 150], [1217, 752], [1197, 746]], [[1090, 686], [1920, 982], [1920, 1012], [1090, 714]]];
export function glassOver(ctx, v, a) {
  ctx.save(); ctx.beginPath(); GLASS.forEach((q, i) => { const P = toS(v, q); i ? ctx.lineTo(...P) : ctx.moveTo(...P); }); ctx.closePath(); ctx.clip();
  ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = 'rgb(175,215,222)'; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = 'rgba(40,90,110,.12)'; ctx.fillRect(0, 0, W, H);
  ctx.restore();
  if (!a) return; const pl = a.O; ctx.save(); ctx.beginPath(); for (const M of MULL) M.forEach((q, i) => { const P = toS(v, q); i ? ctx.lineTo(...P) : ctx.moveTo(...P); }); ctx.clip();
  ctx.drawImage(pl, W / 2 - v.cx * v.k, H / 2 - v.cy * v.k, W * v.k, H * v.k); ctx.restore();
}
// экран видеозвонка: покупатель в тёмной комнате (холст 1920×1080). o = { lean 0..1 — наклон к камере, case 0..1 — чемодан к камере }
function callScene(t, T, o) {
  return PA.offscreen('call', c => {
    // комната покупателя ночью: стена, окно с жалюзи на ночной город, книжная полка; покупатель по грудь (крупность веб-камеры)
    const g = c.createLinearGradient(0, 0, 0, 1080); g.addColorStop(0, '#3a2a2c'); g.addColorStop(1, '#1a1214'); c.fillStyle = g; c.fillRect(0, 0, 1920, 1080);
    const ink = '#141014', box = (x0, y0, x1, y1, f, lw = 8) => { c.fillStyle = f; c.fillRect(x0, y0, x1 - x0, y1 - y0); c.lineWidth = lw; c.strokeStyle = ink; c.strokeRect(x0, y0, x1 - x0, y1 - y0); };
    box(1230, 110, 1790, 720, '#14203a'); for (let i = 0; i < 26; i++) { c.fillStyle = i % 3 ? 'rgba(255,214,140,.7)' : 'rgba(140,200,255,.6)'; c.fillRect(1260 + (i * 97) % 500, 420 + (i * 53) % 260, 10, 14); }
    for (let y = 130; y < 700; y += 36) { c.fillStyle = '#b89a70'; c.fillRect(1240, y, 540, 14); c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(1240, y + 12, 540, 3); }
    box(1230, 110, 1790, 720, null, 10); box(1210, 718, 1810, 744, '#5a3a24', 6);
    box(110, 160, 560, 1000, '#4a2e1c'); for (const y of [360, 560, 760]) box(110, y, 560, y + 18, '#3a2214', 5);
    for (let r = 0; r < 4; r++) { let x = 130; for (let k = 0; k < 9 && x < 530; k++) { const w = 26 + (k * 17 + r * 11) % 22, h = 120 + (k * 29 + r * 7) % 60, y = 180 + r * 200 + (180 - h); box(x, y, x + w, 180 + r * 200 + 178, ['#7a2a24', '#2a4a6a', '#6a5a2a', '#3a5a3a'][(k + r) % 4], 4); x += w + 4; } }
    const z = 1 + .3 * (o.lean || 0), v = { cx: 960, cy: 590 - 30 * (o.lean || 0), k: 3.0 * z };
    const hold = clamp(o.case || 0);
    const P = person(c, RT, v, t, T, { at: [960, 1010], fs: .62, pin: 'feet', f: 1, view: null, sp: 'RENTER', keys: [[0, 'smug']], look: [0, .1], shade: shadeOf([-1, -.5], '#ffb070'), shadow: false,
      R: { k: hold, to: [1045, 770 + 220 * (1 - hold) / (3 * .62)] }, L: { k: hold, to: [875, 770 + 220 * (1 - hold) / (3 * .62)] } });
    void P; if (hold > .02) { const p = toS(v, [960, 790 - 40 * hold]), w = 210 * v.k * .62; c.save(); c.translate(p[0], p[1] + 220 * (1 - hold)); PA.rrect(c, -w / 2, -w * .42, w, w * .5, w * .04, '#3a2416', '#141014', w * .02); for (let r = 0; r < 2; r++) for (let k = 0; k < 4; k++) { const bx = -w * .44 + k * w * .22, by = -w * .38 + r * w * .22; PA.rrect(c, bx, by, w * .2, w * .19, w * .01, '#7aa86a', '#141014', w * .006); c.fillStyle = '#E8E0C0'; c.fillRect(bx + w * .075, by, w * .05, w * .19); } PA.rrect(c, -w / 2, w * .08, w, w * .06, w * .02, '#2a1a0e', '#141014', w * .015);
      if (o.tag > 0) { c.globalAlpha = clamp(o.tag); PA.hangTag(c, w * .3, -w * .42, w * .46, .14, 'CASH'); c.globalAlpha = 1; } c.restore();
      for (const q of [[875, 770], [1045, 770]]) { const h = toS(v, q); ell(c, h[0], h[1] + 220 * (1 - hold), 12 * .62 * v.k, 12 * .62 * v.k, '#141014', null); } }
    c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(0, 0, 1920, 70); c.fillStyle = '#ff4a3a'; c.beginPath(); c.arc(50, 35, 13, 0, 6.283); c.fill();
    PA.label(c, 'VIDEO CALL · ENCRYPTED', 80, 36, 30, '#e8e0d0', { align: 'left' }); PA.label(c, '00:0' + Math.floor(3 + T % 6), 1840, 36, 30, '#e8e0d0');
  });
}
// монитор с видеозвонком: полный кадр (стол Megaspeed размыт за ним)
function callMonitor(ctx, v, t, T, cam, o) {
  MS.room(ctx, v, 'O', 8);
  const buf = callScene(t, T, o), z = cam.z;
  ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
  PA.monitor(ctx, 960, 470, 1320, (c, w, h) => c.drawImage(buf, 0, 0, w, h), { glow: 0, glare: false });
  ctx.restore();
}

export const SHOTS = {
  // ---------- 7ROAD → MEGASPEED ----------
  '4|a small Singapore company called 7Road': x => { const { ctx, t, T, cam, solo } = x, v = camA({ cx: 900, cy: 470, k: 1.3 }, cam, 220, { t: 135, l: 495 }), t7 = W_(x, '7Road', 1.6), tS = W_(x, 'Singapore', .4);   // ОБРАТНАЯ: дверь 7ROAD; на «7Road» над дверью загорается вывеска; на «Singapore» вспыхивает окно
    ctx.save(); shake(ctx, cam); MS.room(ctx, v, 'R7', 0, solo);
    if (!solo) { const fl = gauss(t, tS + .1, .14); if (fl > .01) { const a = toS(v, [1000, 150]), b = toS(v, [1700, 600]); ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = `rgba(255,230,190,${.55 * fl})`; ctx.fillRect(a[0], a[1], b[0] - a[0], b[1] - a[1]); ctx.restore(); }
      const lit = t < t7 ? 0 : t < t7 + .06 ? 1 : t < t7 + .12 ? .25 : 1; sign(ctx, v, '7ROAD INTERNATIONAL', lit);
      plaqueA(ctx, 'MARCH 2023 · SINGAPORE', 700, 950, t - W_(x, 'March', 1.2)); }   // плашка внизу: место подписи ядра (верх) занимает вывеска
    ctx.restore(); },
  '4|got a new name: Megaspeed': x => { const { ctx, t, T, cam, solo } = x, v = camA({ cx: 667, cy: 300, k: 2.4 }, cam), tm = W_(x, 'Megaspeed', 1.58), tOff = Math.max(.35, tm - 1.0);   // ВСТАВКА вывеска: 7ROAD откручивается и падает, на её место въезжает MEGASPEED
    ctx.save(); shake(ctx, cam); MS.room(ctx, v, 'R7', 0, solo);
    if (!solo) { const u = clamp((t - tOff) / .45), ang = E.inCubic(clamp(u * 1.6)) * .9, fall = E.inCubic(clamp((u - .55) / .45)) * 700;
      if (u < 1) { const P = toS(v, [667 - 165, 186]); ctx.save(); ctx.translate(P[0], P[1] + fall * v.k * .5); ctx.rotate(ang); PA.signBox(ctx, 165 * v.k, 0, 330 * v.k, '7ROAD INTERNATIONAL', 1 - u * .8); ctx.restore(); }
      for (const sx of [-1, 1]) { const P = toS(v, [667 + sx * 150, 186]); ctx.fillStyle = '#0c0806'; ctx.beginPath(); ctx.arc(P[0], P[1], 5 * v.k, 0, 6.283); ctx.fill(); }
      const k = E.outBack(clamp((t - (tm - .45)) / .4)); if (k > 0) sign(ctx, v, 'MEGASPEED', t > tm ? 1 : .15, 0, -260 * (1 - k)); }
    ctx.restore(); },
  '4|Its new managing director': x => { const { ctx, t, T, cam, solo } = x, td = W_(x, 'director', .64), ta = W_(x, 'Alice', 1.72);   // ОБЩИЙ офис: Алиса у своего кресла, рука на спинке; на «director» наезд к табличке на столе
    const u = E.inOutCubic(clamp((t - td) / .55)), v = camA(lerpView(MV.oWide, { cx: 560, cy: 660, k: 1.32 }, u), cam);
    ctx.save(); shake(ctx, cam); MS.room(ctx, v, 'O', 0, solo);
    if (!solo) { const P = toS(v, [300, 724]); PA.deskPlate(ctx, P[0], P[1], 230 * v.k, 'MANAGING DIRECTOR', 'ALICE HUANG', { a: -.05 }); }
    const turn = E.inOutCubic(clamp((t - (ta - .5)) / .5));
    MS.stand(ctx, AL, v, t, T, { at: [760, 905], f: -1, keys: [[0, 'smug']], look: [lerp(.6, -.15, turn), lerp(-.3, .05, turn)], L: { k: 1, to: [655, 632] }, solo });
    ctx.restore(); },
  // ---------- регистрация: клерк и сотрудник ----------
  '4|CLERK: Previous business': x => { const { ctx, t, T, cam, solo } = x, v = camA({ cx: 900, cy: 600, k: 1.75 }, cam), tb = W_(x, 'business', .34);   // КРУПНО клерк: заносит ручку над формой, поле PREVIOUS BUSINESS
    const up = 1 - .35 * E.inOutCubic(clamp((t - tb) / .3));
    ctx.save(); shake(ctx, cam);
    MS.deskShot(ctx, v, t, T, { C: CL, bg: 'R', seat: [900, 820], fs: .55, sp: 'CLERK', look: [.05, .55], keys: [[0, 'neutral']], solo,
      deskTop: (c, vv, g) => { const P = toS(vv, g.on(40, .35)); c.save(); c.translate(P[0], P[1]); c.scale(1, .62); PA.form(c, 0, 0, 260 * g.fs * vv.k, -.04, { field: 'PREVIOUS BUSINESS:', hi: .6 }); c.restore(); },
      R: { k: 1, to: [g0(900, 820, .55, 70, -40 - 60 * up)[0], g0(900, 820, .55, 70, -40 - 60 * up)[1]] }, heldR: (c, h, s) => PA.penTool(c, h[0], h[1], s * 1.1, 2.1) });
    ctx.restore(); },
  '4|STAFFER: Video games': x => { const { ctx, t, T, cam, solo } = x, v = camA({ cx: 1000, cy: 650, k: 1.55 }, cam), tg = W_(x, 'games', .34);   // ВСТАВКА джойстик: сотрудник прячет геймпад в ящик стола и задвигает его
    const down = E.inOutCubic(clamp((t - (tg - .3)) / .3)), shut = E.inCubic(clamp((t - (tg + .2)) / .25)), open = clamp(down * 1.6) * (1 - shut), inDrawer = t > tg + .05;
    const seat = [960, 790], fs = .5, g = MS.deskGeo(seat, fs);
    ctx.save(); shake(ctx, cam);
    MS.deskShot(ctx, v, t, T, { C: ST, bg: 'O', seat, fs, sp: 'STAFFER', keys: [[0, 'nervous']], look: [lerp(.1, .5, down), lerp(-.1, .6, down)], light: [-1, -.3], solo,
      R: { k: 1 - shut * .9, to: inDrawer ? [seat[0] + 150 * fs, g.yf + 70 * fs] : [lerp(seat[0] + 40 * fs, seat[0] + 150 * fs, down), lerp(g.yb - 120 * fs, g.yf + 60 * fs, down)] },
      front: (c, vv, gg) => MS.drawer(c, vv, gg, 150, open, (cc, cx, top, w, s) => { if (inDrawer) PA.gamepad(cc, cx, top + 40 * s, s * .9, .2); }),
      heldR: !inDrawer ? (c, h, s) => PA.gamepad(c, h[0] + 30 * s, h[1] - 10 * s, s * 1.1, -.3) : null });
    ctx.restore(); },
  '4|CLERK: New business': x => { const { ctx, t, T, solo } = x, v = { cx: 880, cy: 610, k: 1.85 };   // КРУПНО клерк (статично): переворачивает страницу формы — поле NEW BUSINESS
    const flip = E.inOutCubic(clamp((t - .15) / .35));
    MS.deskShot(ctx, v, t, T, { C: CL, bg: 'R', seat: [900, 820], fs: .55, sp: 'CLERK', look: [.1, .6], keys: [[0, 'neutral']], solo,
      deskTop: (c, vv, g) => { const P = toS(vv, g.on(40, .35)), w = 260 * g.fs * vv.k; c.save(); c.translate(P[0], P[1]); c.scale(1, .62);
        PA.form(c, 0, 0, w, -.04, { field: 'NEW BUSINESS:', hi: flip > .9 ? .7 : 0 });
        if (flip < 1) { c.save(); c.translate(0, -w * .65); c.scale(1, 1 - flip * 2 > 0 ? 1 - flip * 2 : -(1 - flip * 2)); c.translate(0, w * .65); if (flip < .5) PA.form(c, 0, 0, w, -.04, { field: 'PREVIOUS BUSINESS:', value: 'VIDEO GAMES', u: 1 }); else { c.fillStyle = '#E8E2D2'; c.fillRect(-w / 2, -w * .65, w, w * 1.3); } c.restore(); }
        c.restore(); },
      R: { k: 1, to: lerpP(g0(900, 820, .55, 150, -10), g0(900, 820, .55, -60, -40), flip) } });
  },
  '4|STAFFER: Now, supercomputers': x => { const { ctx, t, T, cam, solo } = x, v = camA({ cx: 610, cy: 625, k: 1.15 }, cam), ts = W_(x, 'supercomputers', .64);   // ОБРАТНАЯ: сотрудник показывает за стекло на серверную
    const pt = gesture(t, ts - .1, { lead: .25, rise: .3, hold: 9, fall: .3 });
    ctx.save(); shake(ctx, cam); MS.room(ctx, v, 'R', 0, solo); if (!solo) sign(ctx, v, 'MEGASPEED', 1);
    MS.stand(ctx, ST, v, t, T, { at: [640, 915], f: -1, sp: 'STAFFER', light: 'R', keys: [[0, 'smile']], L: { k: .25 + .75 * pt.hand, to: [330, 470] }, look: [lerp(.2, -.7, pt.body), -.1], lean: -.04 * pt.body, solo });
    ctx.restore(); },
  '4|CLERK: Big change': x => { const { ctx, t, T, solo } = x, v = { cx: 1250, cy: 680, k: 1.45 };   // СРЕДНИЙ (статично): клерк и сотрудник у стекла; клерк поднимает бровь на гору коробок за стеклом
    MS.room(ctx, v, 'O', 0, solo);
    if (!solo) { glassBoxes(ctx, v, .55, t); glassOver(ctx, v, MS.A()); }
    MS.stand(ctx, ST, v, t, T, { at: [1000, 1035], f: 1, light: [1, -.2], keys: [[0, 'smile']], look: [.6, 0], solo, seed: 2 });
    MS.stand(ctx, CL, v, t, T, { at: [1240, 1010], f: 1, light: [1, -.2], sp: 'CLERK', keys: [[0, 'neutral'], [.12, 'shock'], [1.2, 'neutral']], look: [.7, -.25], tilt: -.04, solo,
      L: { k: 1, to: [1180, 760] }, held: { L: (c, h, s) => clipboardA(c, h, s) } });
    if (!solo) { const tc = W_(x, 'change', 1.0); if (t >= tc) PA.stampMark(ctx, 1500, 330, 420, 'APPROVED', -.12, t - tc); }   // штамп справа над коробками, не на лице клерка (место штампа ядра — её лицо)
  },
  '4|STAFFER: Bigger electricity bill': x => { const { ctx, t, cam, solo } = x, tb = W_(x, 'bill', .9), v = camA({ cx: 140, cy: 330, k: 2.2 }, cam);   // ВСТАВКА счётчик: на «bill» стрелка улетает вправо до упора, толчок
    ctx.save(); shake(ctx, cam); MS.room(ctx, v, 'O', 8, solo);
    if (!solo) { const u = t < tb ? .28 + .06 * t : .34 + .64 * E.outBack(clamp((t - tb) / .25)) + .02 * Math.sin(t * 40) * clamp(t - tb); const z = cam.z;
      ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(z, z); PA.meter(ctx, 0, -20, 300, Math.min(1.04, u), gauss(t, tb + .25, .3)); ctx.restore(); }
    ctx.restore(); },
  // ---------- серверная: «облачная» компания ----------
  "4|That's the perfect business": x => { const { ctx, t, cam, solo } = x, tp = W_(x, 'perfect', .34), tm = W_(x, 'mountains', 3.78), v = camA({ cx: 1430, cy: 560, k: 1.42 }, cam);   // СРЕДНИЙ серверная: на «perfect» наклейка CLOUD COMPUTING на стекле; к «mountains» коробки за стеклом до потолка
    ctx.save(); shake(ctx, cam); MS.room(ctx, v, 'O', 0, solo);
    if (!solo) { glassBoxes(ctx, v, .2 + .8 * E.inOutCubic(clamp((t - .3) / Math.max(.5, tm - .3))), t); glassOver(ctx, v, MS.A());
      const P = toS(v, [1290, 470]); PA.glassSticker(ctx, P[0], P[1], 300 * v.k, 'CLOUD COMPUTING', clamp((t - tp) / .2)); }
    ctx.restore(); },
  '4|and nobody asks why': x => { const { ctx, t, T, cam, solo } = x, v = camA({ cx: 900, cy: 560, k: 1.15 }, cam), tn = W_(x, 'nobody', .3);   // ОБЩИЙ от двери: курьер ввозит коробки, ресепшн, не поднимая глаз, штампует RECEIVED
    const hits = [tn, tn + .55, tn + 1.1].filter(q => q < x.d - .1), last = hits.filter(q => t >= q).pop(), lift = clamp(Math.min(...hits.map(q => Math.abs(t - q))) / .16);
    ctx.save(); shake(ctx, cam); MS.room(ctx, v, 'R', 0, solo); if (!solo) sign(ctx, v, 'MEGASPEED', 1);
    if (!solo) for (let i = 0; i < hits.length; i++) { const P = toS(v, [1200 + i * 14, 700 - i * 2]); ctx.save(); ctx.translate(P[0], P[1]); ctx.scale(1, .45); PA.sheet(ctx, 0, 0, 70 * v.k, .1 * i, []); if (last != null && t >= hits[i]) PA.stampMark(ctx, 0, 0, 60 * v.k, 'RECEIVED', -.15, t - hits[i]); ctx.restore(); }
    // курьер с тележкой в дверях (тележка чуть катится и встаёт)
    const roll = 1 - E.outCubic(clamp(t / .8)), fsC = MS.fsAt(770);
    if (!solo) { const P = toS(v, [700 + 40 * roll, 772]); PA.handTruck(ctx, P[0], P[1], fsC * v.k * .9, -.18 * roll - .02, 3); }
    MS.stand(ctx, CO, v, t, T, { at: [640 + 40 * roll, 770], f: 1, light: 'R', keys: [[0, 'neutral']], look: [.5, .2], lean: .06, R: { k: 1, to: [688 + 40 * roll, 660] }, solo });
    MS.stand(ctx, RC, v, t, T, { at: [1115, 905], f: 1, light: 'R', keys: [[0, 'neutral']], look: [.5, .7], R: { k: 1, to: [1205, 690 - 26 * lift] }, solo,
      held: { R: (c, h, s) => PA.stampTool(c, h[0], h[1] - 8 * s, s * 1.1) } });
    ctx.restore(); },
  // ---------- карта, клиенты ----------
  '4|Not one chip had to enter China': x => { const { ctx, t, cam, solo } = x, tn = Math.max(.12, W_(x, 'Not', 0) + .12), v = camA({ cx: 920, cy: 300, k: 2.4 }, cam);   // ВСТАВКА карта на стене офиса: на «Not» на Китай бьёт штамп NOT ONE CHIP, Китай темнеет; толчок
    ctx.save(); shake(ctx, cam); MS.room(ctx, v, 'R', 8, solo);
    if (!solo) { const z = Math.min(cam.z, 1.22); ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(z, z); PA.wallMap(ctx, 0, -20, 1040, { dark: clamp((t - tn) / .4) * .8 }); PA.stampMark(ctx, 180, -300, 480, 'NOT ONE CHIP', -.08, t - tn); ctx.restore(); }
    ctx.restore(); },
  '4|According to the Financial Times': x => { const { ctx, t, cam, solo } = x, ta = W_(x, 'Alibaba', 4.78), v = { cx: 330, cy: 600, k: 1.4 };   // ВСТАВКА монитор: список клиентов MEGASPEED; на «Alibaba» первая строка подсвечивается
    ctx.save(); shake(ctx, cam); MS.room(ctx, v, 'O', 8, solo);
    if (!solo) { const z = cam.z; ctx.save(); zoomAt(ctx, z, [960, 285], [960, 370]); PA.monitor(ctx, 960, 480, 1080, (c, w, h) => PA.clientList(c, w, h, clamp((t - ta) / .2))); ctx.restore(); }
    ctx.restore(); },
  // ---------- аренда: покупатель на видеосвязи и представитель ----------
  '4|RENTER: Can we buy your chips': x => { const { ctx, t, T, cam, solo } = x, tc = W_(x, 'chips', .9), tbuy = W_(x, 'buy', .5);   // КРУПНО покупатель на мониторе: подносит к веб-камере чемодан денег; на «buy» на чемодане бирка CASH
    if (solo) { ctx.fillStyle = '#000'; return; }
    ctx.save(); shake(ctx, cam); callMonitor(ctx, { cx: 960, cy: 540, k: 1 }, t, T, cam, { case: E.outBack(clamp((t - (tc - .45)) / .45)), tag: Math.max(0, (t - Math.max(tbuy, tc)) / .15) }); ctx.restore(); },
  '4|REP: No. You can borrow them': x => { const { ctx, t, T, cam, solo } = x, v = camA({ cx: 760, cy: 600, k: 1.7 }, cam), tb = W_(x, 'borrow', 1.08), tn = W_(x, 'No', 0);   // ОБРАТНАЯ представитель: на «No» качает головой; на «borrow» поднимает к камере ценник RENT · PER HOUR
    const shakeK = clamp((t - tn) / .1) * clamp((tn + .6 - t) / .15), up = E.inOutCubic(clamp((t - (tb - .35)) / .45)), tagHand = u => { const g = MS.deskGeo([760, 820], .55); return [760 + lerp(40, 110, u) * .55, lerp(g.yb + 30 * .55, g.yf - 4 * .55, u)]; };
    ctx.save(); shake(ctx, cam);
    MS.deskShot(ctx, v, t, T, { C: RP, bg: 'R', seat: [760, 820], fs: .55, sp: 'REP', keys: [[0, 'smug']], look: [.35 * Math.sin(t * 16) * shakeK, .05], solo,
      // ценник лежит на столе; на «borrow» кисть (на кольце нитки) пододвигает его к камере — правило хвата: кисть на конце нитки, ценник от кисти
      R: { k: 1, to: tagHand(up) },
      deskTop: (c, vv, g) => { const h = toS(vv, tagHand(up)), sc = .55 * vv.k; c.save(); c.translate(h[0], h[1]); c.scale(1, .62); PR.priceTag(c, 0, 0, 300 * sc, .05, 'RENT', 'PER HOUR'); c.restore();
        const P = toS(vv, g.on(-200, .25)); PA.monitor(c, P[0], P[1] - 60 * vv.k * g.fs * 2, 220 * g.fs * vv.k, (cc, w, hh) => { cc.fillStyle = '#1a2a3a'; cc.fillRect(0, 0, w, hh); }, { stand: true, glow: .1 }); } });
    ctx.restore(); },
  '4|RENTER: For how long': x => { const { ctx, t, T, cam, solo } = x, tl = W_(x, 'long', .32);   // ВСТАВКА монитор видеозвонка: покупатель наклоняется к веб-камере
    if (solo) return;
    ctx.save(); shake(ctx, cam); callMonitor(ctx, { cx: 960, cy: 540, k: 1 }, t, T, { ...cam, z: cam.z * 1.12 }, { lean: E.inOutCubic(clamp((t - .05) / Math.max(.3, tl + .2))) });
    plaqueA(ctx, 'HOW LONG?', 330, 170, t - tl, 'chalk'); ctx.restore(); },   // маркером над окном звонка — слева над полкой, не на лбу (место подписи ядра занято лицом)
  '4|REP: By the hour. Or the year.': x => { const { ctx, t, T, cam, solo } = x, v = camA({ cx: 700, cy: 600, k: 1.7 }, cam), th = W_(x, 'hour', .3), ty = W_(x, 'year', 1.66);   // ОБРАТНАЯ представитель: щёлкает таймером; на «year» табло 1 HR → 1 YR, за стеклом загораются ряды серверов
    const taps = [th, ty], last = taps.filter(q => t >= q - .05).pop(), press = Math.max(...taps.map(q => gauss(t, q, .07)));
    const seat = [760, 820], fs = .55, g = MS.deskGeo(seat, fs), tp = g.on(110, .42);
    ctx.save(); shake(ctx, cam);
    MS.deskShot(ctx, v, t, T, { C: RP, bg: 'R', seat, fs, sp: 'REP', keys: [[0, 'smug']], look: [.3, .4], solo,
      under: (c, vv) => { const n = clamp((t - ty) / .6); if (n <= 0) return; c.save(); c.globalCompositeOperation = 'screen'; for (let r = 0; r < 10; r++) { if (r / 10 > n) break; for (let k = 0; k < 6; k++) { const P = toS(vv, [40 + k * 70, 220 + r * 40]); c.fillStyle = k % 2 ? 'rgba(90,255,150,.85)' : 'rgba(110,220,255,.85)'; c.fillRect(P[0], P[1], 26 * vv.k, 6 * vv.k); } } c.restore(); },
      R: { k: 1, to: [tp[0], tp[1] - 40 * fs - 34 * fs * (1 - press)] },
      deskTop: (c, vv) => { const P = toS(vv, tp); PA.timerBox(c, P[0], P[1] - 20 * vv.k, 300 * fs * vv.k, t >= ty ? '1 YR' : '1 HR', gauss(t, ty + .05, .12), press); } });
    ctx.restore(); },
  // ---------- Алиса уходит с поста ----------
  '4|After eight months': x => { const { ctx, t, T, cam, solo } = x, ts = W_(x, 'stepped', 1.8), tb = W0(x, 'but') ?? 4.16, tr = W_(x, 'role', 5.88);   // ВСТАВКА табличка директора на двери: на «stepped» её откручивают — остаются две дырки; к «role» — Алиса в своём кресле, спиной, не двигается
    const pan = E.inOutCubic(clamp((t - tb) / .9)), v = camA(lerpView({ cx: 664, cy: 420, k: 3.0 }, { cx: 1270, cy: 620, k: 2.1 }, pan), cam);
    ctx.save(); shake(ctx, cam); MS.room(ctx, v, 'R', 0, solo);
    if (!solo) { const [px, py, w] = MS.CFG.door.plaque, u = clamp((t - ts) / .5);
      PA.screwHoles(ctx, ...toS(v, [px, py]), w * 1.55 * v.k);
      if (u < 1) { const ang = E.inCubic(clamp(u * 1.8)) * 1.2, fall = E.inCubic(clamp((u - .45) / .55)) * 500, P = toS(v, [px - w * .7, py]);
        ctx.save(); ctx.translate(P[0], P[1] + fall * v.k); ctx.rotate(ang); PA.plaque(ctx, w * .7 * v.k, 0, w * 1.55 * v.k, ['MANAGING DIRECTOR', 'ALICE HUANG'], { lit: .2 }); ctx.restore(); } }
    if (pan > .02) MS.inChairR(ctx, AL, v, t, T, { solo });
    void tr; ctx.restore(); },
  '4|CLERK: New title for Alice': x => { const { ctx, t, T, cam, solo, s, d } = x, tw = s.whip?.t ?? 1.68, tt = W_(x, 'title', .2), to = W_(x, 'office', 1.96);   // КРУПНО клерк с пустой табличкой → вип-пан → сотрудник кивает на то же кресло (Алиса в нём)
    const wu = whipU(t, tw), v = camA(lerpView({ cx: 520, cy: 560, k: 2.0 }, { cx: 1080, cy: 590, k: 1.85 }, wu), { ...cam, dx: 0 });
    const up = E.outBack(clamp((t - (tt - .25)) / .35)), nod = gauss(t, to + .15, .14) + .6 * gauss(t, to + .45, .12);
    ctx.save(); shake(ctx, cam); MS.room(ctx, v, 'R', 0, solo); if (!solo) sign(ctx, v, 'MEGASPEED', 1);
    MS.inChairR(ctx, AL, v, t, T, { solo });
    MS.stand(ctx, CL, v, t, T, { at: [520, 975], f: 1, light: 'R', sp: 'CLERK', keys: [[0, 'neutral']], look: [.2, .1], solo,
      R: { k: .4 + .6 * up, to: [585, 760 - 150 * up] }, L: { k: .4 + .6 * up, to: [455, 760 - 150 * up] },
      held: { R: (c, h, s) => { const hl = [h[0] - 130 * s * 1.2, h[1]]; PA.plaque(c, (h[0] + hl[0]) / 2, h[1] - 30 * s, 210 * s, [''], { screws: false }); } } });
    MS.stand(ctx, ST, v, t, T, { at: [990, 960], f: 1, light: 'R', sp: 'STAFFER', keys: [[0, 'smile']], look: [.7 + .2 * nod, .05 + .5 * nod], tilt: .08 * nod, solo, seed: 3,
      R: { k: .3 + .7 * clamp((t - to + .3) / .3), to: [1150, 700] } });
  },
  '4|Not the kind whose people': x => { const { ctx, t, T, cam, solo } = x, tp = W_(x, 'photos', 1.6), tb = W_(x, 'boss', 2.58);   // СРЕДНИЙ Алиса за столом: на столе пустая фоторамка; на «boss» рамка поворачивается к камере — пустая
    const seat = [840, 830], fs = .55, g = MS.deskGeo(seat, fs), fp = g.on(260, .55), push = E.inOutCubic(clamp(t / 3.2)), v = camA(lerpView({ cx: 840, cy: 640, k: 1.6 }, { cx: lerp(840, fp[0], .55), cy: lerp(640, fp[1], .5), k: 2.0 }, push), cam);
    ctx.save(); shake(ctx, cam);
    MS.deskShot(ctx, v, t, T, { C: AL, bg: 'R', seat, fs, keys: [[0, 'smug']], look: [lerp(.1, .55, clamp((t - tp) / .4)), .3], solo,
      deskTop: (c, vv) => { const P = toS(vv, fp); PA.photoFrame(c, P[0], P[1], 120 * vv.k * fs * 1.6, E.inOutCubic(clamp((t - (tb - .25)) / .45))); } });
    ctx.restore(); },
};
// кисть сидящего: точка стола относительно сиденья (ед. фигуры) -> пиксели плейта
function g0(sx, sy, fs, u, dv) { const g = MS.deskGeo([sx, sy], fs); return [sx + u * fs, g.yb + dv * fs]; }
const lerpP = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
function clipboardA(c, h, s) { c.save(); c.translate(h[0] + 10 * s, h[1] - 30 * s); c.rotate(-.1); PA.rrect(c, -50 * s, -66 * s, 100 * s, 132 * s, 6 * s, '#8a6a42', '#141014', 4 * s); PA.rrect(c, -42 * s, -54 * s, 84 * s, 110 * s, 3 * s, '#F2EEE2', null); for (let i = 0; i < 6; i++) { c.fillStyle = 'rgba(40,50,90,.6)'; c.fillRect(-32 * s, (-40 + i * 16) * s, (40 + (i % 3) * 12) * s, 3 * s); } c.restore(); }

export const OVER = {
  // D06-A: книга через окно соседа — плоская заставка с нашими героями поверх шаблона T-joke ядра
  '4|Imagine you': (ctx, s, t, d) => { const wt = (re, fb) => { const a = wordAt(re, s.start, s.end); return a == null ? fb : a - s.start; };   // книга с замком на подоконнике; на «allowed» защёлкивается замок; на «neighbor» сосед берёт её и ставит на свою полку; отъезд
    const ta = wt('allowed', .64), tn = wt('neighbor', 2.71), th = wt('house', 4.45), pull = E.inOutCubic(clamp((t - 2.2) / .9)), snap = 1 + .1 * E.outCubic(clamp((t - th) / .17));
    const v0 = lerpView({ cx: 1000, cy: 560, k: 1.9 }, { cx: 960, cy: 520, k: 1.0 }, pull), v = { ...v0, k: v0.k * snap };
    const grab = E.inOutCubic(clamp((t - tn) / .7)), bx = lerp(960, 880, grab), by = lerp(690, 470, grab), hand = t > tn - .35 ? (t < tn ? E.outCubic(clamp((t - tn + .35) / .35)) : 1) : 0;
    JK.house(ctx, v, t, c => { const P = JK_person(c, NB, v, t, s.start + t, { at: [1100, 1061], fs: .9, f: -1, keys: [[0, 'smile']], look: [-.6, .3], L: { k: hand, to: [bx + 20, by + 30] } });
      const b = toS(v, [bx, by]); JK.book(c, b[0], b[1], 120 * v.k, 0, { lock: clamp((t - ta) / .12) }); if (hand > .5) { const h = handS(P, v, 'L'); ell(c, h[0], h[1], 11 * .9 * v.k, 11 * .9 * v.k, NB.spec.colors.ink, null); } });
  },
  '4|and lets you read it through the window': (ctx, s, t, d) => { const wt = (re, fb) => { const a = wordAt(re, s.start, s.end); return a == null ? fb : a - s.start; };   // ребёнок светит фонариком в окно, сосед прижимает страницу к стеклу; на «fee» монета падает в банку PER PAGE
    const tw = wt('window', 1.1), tp = wt('page', 1.88), tf = wt('fee', 3.28), snap = 1 + .1 * E.outCubic(clamp((t - tp) / .17)), push = 1 + .06 * clamp(t / d);
    const v = { cx: 960, cy: 560, k: 1.12 * snap * push }, lit = E.outCubic(clamp((t - tw) / .25)), pg = E.outBack(clamp((t - .2) / .5));
    JK.house(ctx, v, t, c => { const P = JK_person(c, NB, v, t, s.start + t, { at: [960, 1110], fs: .85, f: 1, view: null, keys: [[0, 'smile']], look: [0, .1], L: { k: 1, to: [860, 470] }, R: { k: 1, to: [1060, 470] } });
      const b = toS(v, [960, lerp(560, 470, pg)]); JK.book(c, b[0], b[1], 150 * v.k, 0, { open: 1, lit }); for (const sd of ['L', 'R']) { const h = handS(P, v, sd); ell(c, h[0], h[1], 11 * .85 * v.k, 11 * .85 * v.k, NB.spec.colors.ink, null); } });
    const J = toS(v, [1210, 760]); JK.jar(ctx, J[0], J[1], 90 * v.k, t > tf + .35 ? 4 : 3);
    const cu = (t - tf) / .35; if (cu > 0 && cu < 1) { const c0 = toS(v, [1210, lerp(560, 740, cu * cu)]); ell(ctx, c0[0], c0[1], 14 * v.k, 6 * v.k + 4 * Math.abs(Math.sin(cu * 12)) * v.k, '#E8C04A', '#141014', 2); }
    // ребёнок на переднем плане (по грудь), фонарик в правой руке; луч — на страницу
    const K = JK_person(ctx, KID, v, t, s.start + t, { at: [430, 1330], fs: 1.05, f: 1, keys: [[0, 'smile']], look: [.7, -.4], R: { k: 1, to: [640, 900] } });
    const h = handS(K, v, 'R'), pgS = toS(v, [960, 470]);
    if (lit > .01) { ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = `rgba(255,245,190,${.32 * lit})`; ctx.beginPath(); ctx.moveTo(h[0] + 30 * v.k, h[1] - 20 * v.k); ctx.lineTo(pgS[0] - 120 * v.k, pgS[1] - 90 * v.k); ctx.lineTo(pgS[0] + 130 * v.k, pgS[1] + 110 * v.k); ctx.closePath(); ctx.fill(); ctx.restore(); }
    flashlightA(ctx, h, Math.atan2(pgS[1] - h[1], pgS[0] - h[0]), 1.05 * v.k, lit > .01); ell(ctx, h[0], h[1], 12 * 1.05 * v.k, 12 * 1.05 * v.k, KID.spec.colors.ink, null);
  },
};
export const SKIP_PROPS = {
  '4|a small Singapore company called 7Road': /7ROAD|MARCH/, '4|got a new name: Megaspeed': /MEGASPEED|7ROAD/, '4|Its new managing director': /MANAGING/,
  '4|CLERK: Previous business': /PREVIOUS/, '4|CLERK: New business': /NEW BUSINESS/, '4|CLERK: Big change': /APPROVED/, "4|That's the perfect business": /CLOUD/, '4|and nobody asks why': /RECEIVED/,
  '4|Not one chip had to enter China': /NOT ONE CHIP/, '4|According to the Financial Times': /ALIBABA|MEGASPEED/, '4|REP: No. You can borrow them': /RENT/, '4|RENTER: Can we buy your chips': /CASH/, '4|RENTER: For how long': /HOW LONG/, '4|REP: By the hour. Or the year.': /1 HR|1 YR/,
  '4|After eight months': /MANAGING/,
};
export const RAIN = s => (/L09|L10|L12/.test(s.loc) ? false : undefined);   // в офисе, баре и на таможне дождя поверх кадра нет (дождь нарисован за стеклом)
