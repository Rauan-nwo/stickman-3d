// film/shots/ch10.js — постановка гл. 10 (владелец: рабочий B). Ключ плана — 'глава|начало текста' (film/keys.js).
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
import * as B from '../props_B.js';
import { plate, contact } from '../staging/common.js';
import { ell } from 'engine';

// ---------- сейф кабинета ведущего (плейт: открытая дверца x 1440–1632, внутри полки с золотом 1632–1700) ----------
const SAFE = { door: [1440, 160, 192, 395], to: 260, handle: [1535, 410], photo: [1652, 300] };
// закрытый сейф: полотно дверцы растянуто до правого края проёма (тот же рисунок), ручка-штурвал поверх (turn — поворот), снимок на дверце
function safeClosed(ctx, v, turn = 0, photo = true) {
  const a = OF.A(); if (!a) return; const [x0, y0, w0, h0] = SAFE.door, P0 = toS(v, [x0, y0]), P1 = toS(v, [x0 + SAFE.to, y0 + h0]);
  ctx.drawImage(a.plate, x0, y0, w0, h0, P0[0], P0[1], P1[0] - P0[0], P1[1] - P0[1]);
  const hx = x0 + (SAFE.handle[0] - x0) * SAFE.to / w0, C = toS(v, [hx, SAFE.handle[1]]), r = 50 * v.k;
  ctx.save(); ctx.translate(C[0], C[1]); ctx.fillStyle = '#2a3038'; ctx.strokeStyle = '#141014'; ctx.lineWidth = 4 * v.k; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.rotate(turn * 1.3); ctx.strokeStyle = '#c9a54a'; ctx.lineWidth = 9 * v.k; ctx.lineCap = 'round'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(i * 2.09) * r * .95, Math.sin(i * 2.09) * r * .95); ctx.stroke(); }
  ell(ctx, 0, 0, r * .25, r * .25, '#c9a54a', '#141014', 3 * v.k); ctx.restore();
  if (photo) { const P = toS(v, SAFE.photo); PR.polaroid(ctx, P[0], P[1], 92 * v.k, .08, IN.snapPic, 1); }
}
// кадр кабинета, ведущий у закрытого сейфа (ступни 1360, 800): тот же рисовальщик ведущего, кадр сдвинут на 280 px плейта
function atSafe(ctx, v, t, T, o = {}) {
  const a = OF.A(); if (!a) return {}; const DX = 280;
  if (!o.solo) { plate(ctx, a.plate, v); safeClosed(ctx, v, o.turn || 0); const F = toS(v, [1080 + DX, 800]), s = .55 * v.k; contact(ctx, F[0], F[1] + 2 * s, 150 * s, 22 * s, .6); }
  const h = { ...o.host }; if (h.L) h.L = { ...h.L, to: [h.L.to[0] - DX, h.L.to[1]] }; if (h.R) h.R = { ...h.R, to: [h.R.to[0] - DX, h.R.to[1]] };
  const r = OF.office(ctx, { cx: v.cx - DX, cy: v.cy, k: v.k }, t, T, { solo: true, host: h });
  if (o.watch != null && o.watch >= 0 && r.hl) pocketWatch(ctx, r.hl, r.s, o.watch);
  return r;
}
// карманные часы в кисти: lid 0..1 — крышка откинулась (щелчок)
function pocketWatch(ctx, P, s, lid) { const R = 22 * s; ctx.save(); ctx.translate(P[0] + 18 * s, P[1] - 14 * s);
  ell(ctx, 0, 0, R, R, '#e8c04a', '#141014', 3 * s); ell(ctx, 0, 0, R * .78, R * .78, '#fffbea', '#141014', 2 * s); ctx.strokeStyle = '#141014'; ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -R * .6); ctx.moveTo(0, 0); ctx.lineTo(R * .4, R * .1); ctx.stroke();
  ctx.save(); ctx.translate(0, -R); ctx.rotate(-2.6 * E.outBack(clamp(lid))); ctx.translate(0, R); ctx.scale(1, Math.max(.15, 1 - .7 * clamp(lid))); if (lid < 1) ell(ctx, 0, 0, R, R, '#d9b23a', '#141014', 3 * s); ctx.restore();
  ell(ctx, P[0] - P[0], -R - 4 * s, 4 * s, 4 * s, '#e8c04a', '#141014', 2 * s); ctx.restore(); ell(ctx, P[0], P[1], 12 * s, 12 * s, '#1C1418', null); }
// вставка: внутренность сейфа — стальные стенки, полка, золото справа, снимок «Дженсен + Алиса» прислонён к стенке
function safeInside(ctx, t) {
  const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#3a4048'); g.addColorStop(1, '#16191e'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#22262c'; ctx.beginPath(); ctx.moveTo(240, 160); ctx.lineTo(1680, 160); ctx.lineTo(1480, 300); ctx.lineTo(440, 300); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#2c3138'; ctx.fillRect(440, 300, 1040, 460); ctx.strokeStyle = '#0c0d10'; ctx.lineWidth = 6; ctx.strokeRect(440, 300, 1040, 460);
  ctx.fillStyle = '#4a4f58'; ctx.beginPath(); ctx.moveTo(240, 900); ctx.lineTo(1680, 900); ctx.lineTo(1480, 760); ctx.lineTo(440, 760); ctx.closePath(); ctx.fill(); ctx.stroke();
  for (let i = 0; i < 3; i++) { ctx.save(); ctx.translate(1250 + i * 70, 720 - i * 18); ctx.fillStyle = '#e8b830'; ctx.strokeStyle = '#6a4a10'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-60, 30); ctx.lineTo(60, 30); ctx.lineTo(44, -14); ctx.lineTo(-44, -14); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); }
  PR.polaroid(ctx, 760, 560, 420, -.06, IN.snapPic, 1);
  ctx.save(); ctx.globalCompositeOperation = 'screen'; const L = ctx.createRadialGradient(300, 200, 0, 300, 200, 1300); L.addColorStop(0, 'rgba(255,214,140,.28)'); L.addColorStop(1, 'rgba(255,200,120,0)'); ctx.fillStyle = L; ctx.fillRect(0, 0, W, H); ctx.restore();
}
// дверца сейфа захлопывается слева: cl 0..1
function safeDoor(ctx, cl) { const w = W * cl; ctx.save(); const g = ctx.createLinearGradient(0, 0, w, 0); g.addColorStop(0, '#20252c'); g.addColorStop(1, '#3a414a'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, H);
  ctx.strokeStyle = '#0c0d10'; ctx.lineWidth = 10; ctx.strokeRect(5, 5, w - 10, H - 10); ctx.fillStyle = '#5a616a'; for (let i = 0; i < 6; i++) for (const yy of [60, H - 60]) { ctx.beginPath(); ctx.arc(w - 60 - i * w / 7, yy, 12, 0, Math.PI * 2); ctx.fill(); }
  if (cl > .6) { ell(ctx, w - W * .5, H / 2, 150, 150, '#2a3038', '#c9a54a', 10); } ctx.restore(); }

export const SHOTS = {
  '10|HOST: Some keys are': x => { const { ctx, t, T, cam, solo } = x, v = camView({ cx: 1090, cy: 400, k: 2.3 }, cam, .1), tk = W_(x, 'keys', .32);   // крупно ведущий вертит латунный ключ в пальцах
    const tw = Math.sin(t * 7) * .9;
    ctx.save(); shake(ctx, cam);
    OF.office(ctx, v, t, T, { solo, blur: true, box: { lid: .2, glow: .3 }, photo: IN.snapPic, host: { keys: [[0, 'talk']], look: [.35, .35], tilt: .04, R: { k: 1, to: [1185, 380] }, key: { a: -1.6 + tw, glint: gauss(t, tk + .1, .15) } } });
    ctx.restore(); },
  '10|too heavy to carry': x => { const { ctx, t, T, cam, solo } = x, v = camView(OF.views.xkey, cam, .06), th = W_(x, 'heavy', .25);   // сверхкрупно ключ в ладони: на «heavy» ладонь опускается под тяжестью, блик; на «carry» лампа мигает (ядро)
    const sag = E.outBack(clamp((t - th) / .35));
    ctx.save(); shake(ctx, cam);
    const r = OF.office(ctx, v, t, T, { solo, blur: true, box: { lid: .2, glow: .3 }, photo: IN.snapPic, host: { keys: [[0, 'talk']], lean: .03, look: [.6, .2 + .3 * sag], noR: true } });
    if (r.sr) OF.bigKey(ctx, [...r.sr, r.s], toS(v, [1215, lerp(420, 520, sag)]), 160, lerp(-.5, -.2, sag), gauss(t, th + .1, .16), solo ? 0 : 1);
    ctx.restore(); },
  '10|HOST: So this one goes in the safe': x => { const { ctx, t, cam, solo, d } = x, to = W_(x, 'one', .52), ts = W_(x, 'safe', 1.34);   // вставка: ключ ложится в сейф рядом со снимком «Дженсен + Алиса» (D13-B); на «safe» дверца захлопывается — щелчок, толчок
    if (solo) return; ctx.save(); shake(ctx, cam); const z = 1 + (cam.z - 1) * .5; ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
    safeInside(ctx, t);
    const lay = E.inOutCubic(clamp((t - to + .35) / .45)), K = [lerp(1150, 1080, lay), lerp(300, 690, lay)];
    if (t < ts - .15) { if (lay < 1) OF.bigKey(ctx, [-200, -100, 1], [K[0], K[1] - 30], 70, lerp(-1, -.15, lay), 0, 1); else PR.brassKey(ctx, 1010, 700, .55, -.12, gauss(t, to + .5, .2)); }
    else PR.brassKey(ctx, 1010, 700, .55, -.12, 0);
    const cl = E.inCubic(clamp((t - (ts - .15)) / .15)); if (cl > 0) safeDoor(ctx, cl);
    ctx.restore(); },
  '10|HOST: The question is who opens it next': x => { const { ctx, t, T, cam, solo } = x, v = camView({ cx: 1470, cy: 450, k: 1.75 }, cam, .15), tq = W_(x, 'question', .26), tp = W_(x, 'opens', 1.5);   // средний ведущий у закрытого сейфа: на «question» щёлкает крышка карманных часов; на «opens» ручка сейфа сама проворачивается
    const w = env(t, tq - .2, x.d + 1, .3), turn = E.outBack(clamp((t - tp) / .35));
    ctx.save(); shake(ctx, cam);
    atSafe(ctx, v, t, T, { solo, turn, host: { keys: [[0, 'talk']], look: [.5, .2], L: { k: w, to: [1340, 560] } }, watch: w > .4 ? clamp((t - tq) / .2) : -1 });
    ctx.restore(); },
  '10|— (без голоса': x => { const { ctx, t, T, cam, solo } = x, v = camView(OF.views.wide, cam, .5);   // общий кабинет: ведущий у закрытого сейфа, снимок «Дженсен + Алиса» на дверце; каскад отыгрышей и лампа гаснет — ядро
    ctx.save(); shake(ctx, cam);
    atSafe(ctx, v, t, T, { solo, turn: 1, host: { keys: [[0, 'neutral']], look: [.4, .1], tilt: -.04 } });
    ctx.restore(); },

};
export const OVER = {
};
export const SKIP_PROPS = {};
export const RAIN = null;   // или s => true/false/undefined — переопределение дождя для планов главы
