// film/shots/ch07.js — постановка гл. 7 (владелец: рабочий B). Ключ плана — 'глава|начало текста' (film/keys.js).
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
import { person } from '../chars_B.js';
import * as B from '../props_B.js';
import * as MS from '../staging/megaspeed.js';
import * as PA from '../props_A.js';
import { EH } from '../staging/eventhall.js';
import { drawP, guest as guestA } from '../chars_A.js';
import warehousePlate from '../../assets/bg_blocked_warehouse.png';
import { mouth } from '../words.js';
import { WA } from '../staging/washington.js';
import { NV } from '../staging/nvidia.js';
import { BJ } from '../staging/beijing.js';
import { silhouette } from '../staging/desk.js';
import { official, officer } from '../chars.js';
import { jensen, alice, NOIR_FONT as F, ell } from 'engine';
import { plate, img, lazy, blurred } from '../staging/common.js';
import barPlate from '../../assets/bg_taipei_bar_dry.png';
import streetPlate from '../../assets/bg_singapore_street.png';

const fixArms = C => { C.spec.rig = { ...C.spec.rig, plantLegs: .02, armLayer: 'front' }; return C; };
const JH7 = fixArms(jensen()), PRESS = [0, 1, 2, 3, 4].map(i => fixArms(guestA(i + 2)));
const WHI = { p: img(warehousePlate) }, WHA = lazy([WHI.p], () => ({ p: WHI.p }));
const OFFICIAL = official(), SENATOR = official({ hair: 'dark', tie: ['#24407a', '#18305e'] }), COMMERCE = official({ hair: 'bald', tie: ['#2f6a3a', '#22502c'], suit: ['#6a6458', '#463f36', '#221e18'] }), JUSTICE = official({ hair: 'grey', glasses: true, tie: ['#4a2a6a', '#361e50'], suit: ['#3e4250', '#262a36', '#121418'] });
const JH = jensen(), OFF1 = officer(), OFF2 = officer(); JH.spec.rig = { ...JH.spec.rig, armLayer: 'front', plantLegs: .02 };
const PI = { bar: img(barPlate), street: img(streetPlate) }, PAa = lazy([PI.bar, PI.street], () => ({ bar: blurred(PI.bar, 6), street: PI.street, streetB: blurred(PI.street, 2) }));
const up = (t, t0, d = .3) => E.outCubic(clamp((t - t0) / d));
// надпись маркером на доске (пиксели плейта): k 0..1 — сколько букв написано
function marker(ctx, v, s, P, size, k = 1, col = '#1d3f8a', a = -.03) { if (k <= 0) return; const S = toS(v, P); ctx.save(); ctx.translate(S[0], S[1]); ctx.rotate(a); B.txt(ctx, s.slice(0, Math.ceil(s.length * clamp(k))), 0, 0, size * v.k, { col, font: F.hand, w: 700 }); ctx.restore(); }
function strike(ctx, v, P0, P1, k, col = '#c03a2b', w = 6) { if (k <= 0) return; const a = toS(v, P0), b = toS(v, P1); ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = w * v.k; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(lerp(a[0], b[0], clamp(k)), lerp(a[1], b[1], clamp(k))); ctx.stroke(); ctx.restore(); }
// календарь-перекидник на столе: месяц крупно; flip 0..1 — верхний лист перелистывается на next
export function monthCal(ctx, x, y, w, month, next = null, flip = 0) {
  const h = w * .9; ctx.save(); ctx.translate(x, y); ctx.lineJoin = 'round';
  ctx.fillStyle = '#2a2a30'; ctx.beginPath(); ctx.moveTo(-w * .5, 0); ctx.lineTo(-w * .4, -h); ctx.lineTo(w * .4, -h); ctx.lineTo(w * .5, 0); ctx.closePath(); ctx.fill();
  const page = (m, sc = 1) => { ctx.save(); ctx.translate(0, -h); ctx.scale(1, sc); ctx.fillStyle = '#f4f0e6'; ctx.fillRect(-w * .42, 0, w * .84, h * .92); ctx.strokeStyle = '#141014'; ctx.lineWidth = Math.max(2, w * .02); ctx.strokeRect(-w * .42, 0, w * .84, h * .92);
    ctx.fillStyle = '#b3121f'; ctx.fillRect(-w * .42, 0, w * .84, h * .22); B.txt(ctx, '2025', 0, h * .11, h * .14, { col: '#fff', font: F.label, w: 800, align: 'center' }); B.txt(ctx, m, 0, h * .55, h * .36, { font: F.label, w: 900, align: 'center' }); ctx.restore(); };
  if (next && flip > 0) { page(next); if (flip < 1) page(month, Math.cos(Math.PI / 2 * E.inCubic(flip))); } else page(month);
  ctx.fillStyle = '#9aa0aa'; for (let i = -2; i <= 2; i++) ctx.fillRect(i * w * .14 - w * .02, -h - w * .05, w * .04, w * .1);
  ctx.restore();
}
// пустое здание по адресу в Пекине: dark 0..1 — окна гаснут, табличка на двери пустая
function emptyBuilding(ctx, cam, dark) {
  ctx.save(); const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#12060a'); g.addColorStop(1, '#2a0c10'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const z = cam.z; ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
  ctx.fillStyle = '#1a0a0c'; ctx.fillRect(560, 160, 800, 820); ctx.strokeStyle = 'rgba(255,140,110,.35)'; ctx.lineWidth = 3; ctx.strokeRect(560, 160, 800, 820);
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) { const lit = ((r * 5 + c * 3) % 4) < 2, k = lit ? 1 - dark : 0; ctx.fillStyle = `rgba(${Math.round(60 + 195 * k)},${Math.round(22 + 150 * k)},${Math.round(20 + 90 * k)},1)`; ctx.fillRect(600 + c * 95, 200 + r * 82, 50, 46); }
  ctx.fillStyle = '#0c0406'; ctx.fillRect(880, 830, 160, 150); ctx.fillStyle = '#d9cdb0'; ctx.fillRect(1060, 870, 80, 34); ctx.strokeStyle = '#141014'; ctx.lineWidth = 3; ctx.strokeRect(1060, 870, 80, 34);   // дверь и пустая табличка
  ctx.fillStyle = '#0a0406'; ctx.fillRect(0, 980, W, 100); ctx.restore();
}
// шахматная доска на столе (вид сверху-сбоку): cx, cy — центр (экран), w — сторона, sq — сжатие по вертикали (1 — строго сверху)
function board(ctx, cx, cy, w, sq = .5, a = 0) { ctx.save(); ctx.translate(cx, cy); ctx.scale(1, sq); ctx.rotate(a); const s = w / 8;
  ctx.fillStyle = '#3a1a10'; ctx.fillRect(-w / 2 - s * .3, -w / 2 - s * .3, w + s * .6, w + s * .6);
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { ctx.fillStyle = (i + j) % 2 ? '#2a1210' : '#e6d2b0'; ctx.fillRect(-w / 2 + i * s, -w / 2 + j * s, s, s); } ctx.restore(); }
// фигура на доске: P — основание (экран), s — масштаб; kind: 'pawn' | 'chip' | 'jensen' | 'house' | 'bubble' | 'chair'
function piece(ctx, P, s, kind, o = {}) {
  ctx.save(); ctx.translate(P[0], P[1]); ctx.scale(s, s); ctx.lineJoin = 'round'; ctx.strokeStyle = '#141014'; ctx.lineWidth = 4;
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(6, 4, 46, 14, 0, 0, Math.PI * 2); ctx.fill();
  const base = col => { ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(0, 0, 40, 12, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillRect(-34, -16, 68, 16); ctx.strokeRect(-34, -16, 68, 16); };
  if (kind === 'pawn') { base('#e6d2b0'); ctx.beginPath(); ctx.moveTo(-22, -16); ctx.quadraticCurveTo(-10, -60, -8, -80); ctx.lineTo(8, -80); ctx.quadraticCurveTo(10, -60, 22, -16); ctx.closePath(); ctx.fill(); ctx.stroke(); ell(ctx, 0, -96, 22, 22, '#e6d2b0', '#141014', 4); }
  if (kind === 'chip') { base('#1a1a20'); ctx.fillStyle = '#1a1a20'; ctx.fillRect(-6, -60, 12, 44); ctx.save(); ctx.translate(0, -100); ctx.fillStyle = '#1f9a4c'; ctx.beginPath(); ctx.roundRect(-46, -36, 92, 72, 6); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#c9a54a'; for (let i = -3; i <= 3; i++) { ctx.fillRect(i * 12 - 3, -44, 6, 8); ctx.fillRect(i * 12 - 3, 36, 6, 8); } ctx.fillStyle = '#7dffb0'; ctx.fillRect(-18, -14, 36, 28);
    ctx.restore(); ctx.save(); ctx.translate(50, -150); ctx.rotate(.2); ctx.fillStyle = '#efe4c8'; ctx.beginPath(); ctx.roundRect(-34, -16, 68, 32, 4); ctx.fill(); ctx.stroke(); B.txt(ctx, '$$$', 0, 1, 22, { align: 'center', w: 900 }); ctx.restore(); }
  if (kind === 'jensen') { base('#141014'); ctx.fillStyle = '#1e1b22'; ctx.beginPath(); ctx.moveTo(-26, -16); ctx.lineTo(-20, -74); ctx.lineTo(20, -74); ctx.lineTo(26, -16); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.beginPath(); ctx.moveTo(-12, -70); ctx.lineTo(-14, -24); ctx.stroke(); ctx.strokeStyle = '#141014';
    ell(ctx, 0, -96, 22, 22, '#ffffff', '#141014', 4); ctx.fillStyle = '#c6cbd2'; ctx.beginPath(); ctx.arc(0, -100, 22, Math.PI * 1.05, Math.PI * 1.95); ctx.fill(); ctx.fillStyle = '#141014'; ctx.fillRect(-14, -98, 12, 6); ctx.fillRect(2, -98, 12, 6); }
  if (kind === 'house') { base('#f2f0ea'); ctx.fillStyle = '#f2f0ea'; ctx.fillRect(-30, -70, 60, 54); ctx.strokeRect(-30, -70, 60, 54); ctx.beginPath(); ctx.moveTo(-36, -70); ctx.lineTo(0, -98); ctx.lineTo(36, -70); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#9aa4b8'; for (let i = -2; i <= 2; i++) ctx.fillRect(i * 11 - 3, -64, 6, 44); }
  if (kind === 'bubble') { const k = o.k ?? 1; ctx.scale(k, k); base('#e6d2b0'); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(0, -76, 46, 34, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-10, -44); ctx.lineTo(-18, -22); ctx.lineTo(4, -44); ctx.fill(); ctx.fillStyle = '#141014'; for (const d of [-16, 0, 16]) { ctx.beginPath(); ctx.arc(d, -76, 5, 0, Math.PI * 2); ctx.fill(); } }
  if (kind === 'chair') { ctx.fillStyle = '#8a2a20'; ctx.fillRect(-26, -40, 52, 10); ctx.strokeRect(-26, -40, 52, 10); ctx.fillRect(-26, -90, 10, 50); ctx.strokeRect(-26, -90, 10, 50); for (const lx of [-24, 18]) { ctx.fillRect(lx, -30, 6, 30); ctx.strokeRect(lx, -30, 6, 30); } }
  ctx.restore();
}
// воротца «CHINA · $50B» с навесным замком: open 0..1 (дужка поднята)
function gate(ctx, P, s, open) { ctx.save(); ctx.translate(P[0], P[1]); ctx.scale(s, s); ctx.lineJoin = 'round'; ctx.strokeStyle = '#141014'; ctx.lineWidth = 5;
  ctx.fillStyle = '#8a1a1e'; ctx.fillRect(-150, -150, 20, 150); ctx.strokeRect(-150, -150, 20, 150); ctx.fillRect(130, -150, 20, 150); ctx.strokeRect(130, -150, 20, 150);
  ctx.fillStyle = '#c9a54a'; for (let i = 0; i < 7; i++) { ctx.fillRect(-120 + i * 36, -128, 8, 110); } ctx.fillRect(-130, -132, 260, 10); ctx.fillRect(-130, -30, 260, 10);
  ctx.fillStyle = '#efe4c8'; ctx.beginPath(); ctx.roundRect(-90, -200, 180, 40, 4); ctx.fill(); ctx.stroke(); B.txt(ctx, 'CHINA · $50B', 0, -180, 26, { align: 'center', w: 900 });
  ctx.translate(0, -70); ctx.strokeStyle = '#8a8f98'; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(0, -16 - 18 * open, 18, Math.PI, 0); ctx.lineTo(18, -16 * (1 - open)); ctx.stroke();
  ctx.fillStyle = '#c9a54a'; ctx.strokeStyle = '#141014'; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(-26, -16, 52, 44, 6); ctx.fill(); ctx.stroke(); ell(ctx, 0, 4, 5, 5, '#141014', null); ctx.restore(); }
// рука-рукав из-за края кадра (контекст — герой прошлого/соседнего плана): от точки E (экран, за краем) к кисти H; col — рукав
function sleeveArm(ctx, Ep, Hp, r, col) { const mx = lerp(Ep[0], Hp[0], .72), my = lerp(Ep[1], Hp[1], .72); ctx.save(); ctx.lineCap = 'round';
  ctx.strokeStyle = '#141014'; ctx.lineWidth = r * 1.35; ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(Hp[0], Hp[1]); ctx.stroke();
  ctx.lineWidth = r * 3.4; ctx.beginPath(); ctx.moveTo(Ep[0], Ep[1]); ctx.lineTo(mx, my); ctx.stroke(); ctx.strokeStyle = col; ctx.lineWidth = r * 3.0; ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.15)'; ctx.lineWidth = r * .5; ctx.beginPath(); ctx.moveTo(Ep[0], Ep[1] - r); ctx.lineTo(mx, my - r); ctx.stroke();
  ctx.fillStyle = '#141014'; ctx.beginPath(); ctx.arc(Hp[0], Hp[1], r, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
// кадр ТВ-хроники: улица ночью, машина; двое садятся в неё (на «car» пригибаются за крышу, дверь хлопает)
function streetFootage(ctx, t, tc, cam) {
  const a = PAa(); if (!a) return; const v = cover({ cx: 300, cy: 600, k: 3.2 * (1 + (cam.z - 1) * .4) }); plate(ctx, a.streetB, v);
  const duck = E.inCubic(clamp((t - tc + .35) / .35)), body = [[35, 680], [48, 607], [100, 600], [145, 572], [225, 562], [300, 567], [395, 607], [470, 625], [520, 650], [525, 690], [500, 700], [35, 700]];
  for (const [i, C, x0, f] of [[0, B.CAST_MINI.AL, 250, 1], [1, B.CAST_MINI.J, 305, -1]]) { const P = toS(v, [x0, 690 + 160 * duck]), s = .21 * v.k;
    if (duck >= 1) continue; ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, toS(v, [0, 700])[1]); ctx.clip(); B.miniFig(ctx, C, P[0], P[1], s, { view: 'threeQuarter', facing: f }); ctx.restore(); }
  ctx.save(); ctx.beginPath(); body.forEach((q, i) => { const S = toS(v, q); i ? ctx.lineTo(...S) : ctx.moveTo(...S); }); ctx.closePath(); ctx.clip(); plate(ctx, a.streetB, v); ctx.restore();   // кузов машины — перед ними
  const slam = t - tc; if (slam > 0 && slam < .25) { ctx.fillStyle = `rgba(255,255,255,${.25 * (1 - slam / .25)})`; ctx.fillRect(0, 0, W, H); }
}
// «телевизионный» вид кадра: зерно, строки, тон
function tvLook(ctx, t, bug) { ctx.save(); ctx.globalCompositeOperation = 'saturation'; ctx.fillStyle = 'rgba(120,120,120,.55)'; ctx.fillRect(0, 0, W, H); ctx.restore();
  ctx.save(); ctx.fillStyle = 'rgba(255,255,255,.05)'; for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1); let k = Math.floor(t * 30) * 7919 + 3; const r = () => (k = (k * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 900; i++) { ctx.fillStyle = `rgba(${r() > .5 ? 255 : 0},${r() > .5 ? 255 : 0},${r() > .5 ? 255 : 0},.08)`; ctx.fillRect(r() * W, r() * H, 3, 3); }
  if (bug) B.txt(ctx, bug, 70, 80, 40, { col: 'rgba(255,255,255,.8)', font: F.label, w: 800 }); ctx.restore(); }

// шахматная доска на пекинском столе (пиксели плейта: центр 1060, 846): фигурки, стул (chair 0..1 — офицер 2 ставит), hand — кисть офицера 2 (экран)
function chessOnDesk(ctx, v, t, o = {}) {
  const P = toS(v, [1060, 846]), w = 250 * v.k; board(ctx, P[0], P[1], w, .32);
  const at = (dx, dy) => [P[0] + dx * w, P[1] + dy * w * .32];
  piece(ctx, at(-.3, .2), .55 * v.k * .5, 'pawn'); piece(ctx, at(.32, -.1), .55 * v.k * .5, 'house'); piece(ctx, at(.12, .05), .55 * v.k * .5, 'jensen');
  if (o.chair > 0) { const c = at(.2, .25), from = o.hand || [c[0], c[1] - 200 * v.k]; piece(ctx, [lerp(from[0], c[0], o.chair), lerp(from[1] + 10 * v.k, c[1], o.chair)], .5 * v.k * .5, 'chair'); }
}
// офицер 2 стоит за столом справа от кресла (ноги скрыты столом): place 0..1 — тянется к доске
function B2stand(c, v, t, T, place) {
  const at = [1185, 832], fs = .62, P = [1110, 830];
  const r = person(c, v, t, T, { C: OFF2, at, fs, pin: 'feet', view: 'threeQuarter', facing: -1, sp: 'OFFICER 2', light: [.2, -1], keys: [[0, 'neutral']], lean: -.12 * place, R: { k: place, to: P } });
  return r;
}
// печать на стене (в раме плейта): SENATE — синяя с орлом-звездой, JUSTICE — весы
function seal(ctx, v, Pp, kind) { const P = toS(v, Pp), r = 70 * v.k; ctx.save(); ctx.translate(P[0], P[1]); ctx.lineWidth = 4 * v.k; ctx.strokeStyle = '#c9a54a';
  ctx.fillStyle = kind === 'SENATE' ? '#1e2f5e' : '#2a1e3e'; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, r * .78, 0, Math.PI * 2); ctx.stroke();
  if (kind === 'SENATE') { ctx.fillStyle = '#e8d08a'; ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .2 : r * .45; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); }
  else { ctx.strokeStyle = '#e8d08a'; ctx.lineWidth = 4 * v.k; ctx.beginPath(); ctx.moveTo(0, -r * .5); ctx.lineTo(0, r * .45); ctx.moveTo(-r * .45, -r * .3); ctx.lineTo(r * .45, -r * .3); ctx.stroke(); for (const sd of [-1, 1]) { ctx.beginPath(); ctx.arc(sd * r * .45, -r * .05, r * .18, 0, Math.PI); ctx.stroke(); } }
  B.txt(ctx, kind === 'SENATE' ? 'U.S. SENATE' : 'DEPT. OF JUSTICE', 0, r * .62, r * .15, { col: '#e8d08a', font: F.label, w: 800, align: 'center' }); ctx.restore(); }
// папка MEGASPEED с жёлтым ярлыком и обрывком красной нити (вид спереди; sq — сжатие, когда лежит на столе)
function megaFolder(ctx, x, y, w, sq = 1, a = 0) { const h = w * .72; ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.scale(1, sq); ctx.lineJoin = 'round';
  ctx.fillStyle = '#c9ae72'; ctx.strokeStyle = '#141014'; ctx.lineWidth = Math.max(2, w * .02); ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, w * .02); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#f2c230'; ctx.fillRect(-w * .36, -h * .3, w * .72, h * .26); ctx.strokeRect(-w * .36, -h * .3, w * .72, h * .26); B.txt(ctx, 'MEGASPEED', 0, -h * .17, h * .16, { align: 'center', w: 900, max: w * .68 });
  ctx.strokeStyle = '#c8231f'; ctx.lineWidth = Math.max(2, w * .025); ctx.beginPath(); ctx.moveTo(w * .4, h * .1); ctx.quadraticCurveTo(w * .6, h * .2, w * .58, h * .5); ctx.stroke(); ctx.restore(); }
// табличка с именем на столе
function plaque(ctx, x, y, w, s) { ctx.save(); ctx.translate(x, y); ctx.fillStyle = '#2a1c12'; ctx.strokeStyle = '#141014'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-w / 2, 0); ctx.lineTo(-w * .46, -w * .2); ctx.lineTo(w * .46, -w * .2); ctx.lineTo(w / 2, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#c9a54a'; ctx.fillRect(-w * .4, -w * .17, w * .8, w * .12); B.txt(ctx, s, 0, -w * .11, w * .08, { align: 'center', w: 900, max: w * .76 }); ctx.restore(); }
// матовое стекло на верхней филёнке двери обратной точки с надписью
function frosted(ctx, v, s) { const a = toS(v, [1120, 110]), b = toS(v, [1300, 330]); ctx.save(); ctx.fillStyle = 'rgba(200,215,230,.82)'; ctx.fillRect(a[0], a[1], b[0] - a[0], b[1] - a[1]); ctx.strokeStyle = '#141014'; ctx.lineWidth = 4 * v.k; ctx.strokeRect(a[0], a[1], b[0] - a[0], b[1] - a[1]);
  const words = s.split(' '); words.forEach((wd, i) => B.txt(ctx, wd, (a[0] + b[0]) / 2, a[1] + (b[1] - a[1]) * (.3 + i * .22), 22 * v.k, { col: '#1e2a3a', font: F.label, w: 800, align: 'center' })); ctx.restore(); }
export const SHOTS = {
  // ---------------- L11 зал (staging/eventhall.js рабочего A, только чтение) ----------------
  '7|Through every twist, Jensen made': x => { const { ctx, t, T, cam, solo, d } = x, v = camView({ cx: 760, cy: 500, k: 2.5 }, cam, .2), tl = W_(x, 'loudly', 2.6);   // средний: Дженсен у микрофонов в той же позе; баннер за ним щёлкает APR 2025 -> AUG 2025 -> DEC 2025; на «loudly» вспышки
    const m = t < d * .3 ? 'APR 2025' : t < d * .58 ? 'AUG 2025' : 'DEC 2025', sw = [d * .3, d * .58].some(q => t > q && t < q + .08);
    ctx.save(); shake(ctx, cam); EH.plate(ctx, v, 'wide', 0, solo);
    if (!solo) EH.screen(ctx, v, [m, 'EXPORT RULES'], sw ? .3 : 1);
    const P = EH.podium(ctx, JH7, v, t, T, { f: 1, view: null, keys: [[0, 'neutral']], look: [.2, -.05], solo, R: { k: env(t, tl - .3, d + 1, .25), to: [700, 470] } });
    if (P) drawP(ctx, P, v, 'front');
    ctx.restore(); },
  '7|he told reporters exactly': x => { const { ctx, t, T, cam, solo, d } = x, v = camView({ cx: 900, cy: 700, k: 1.3 }, cam, .25);   // обратная: со сцены в зал — ряды прессы, поднятые телефоны, вспышки по залу
    ctx.save(); shake(ctx, cam); EH.plate(ctx, v, 'rev', 0, solo);
    const seats = [[372, 850], [541, 848], [712, 846], [1060, 846], [1230, 848]];
    seats.forEach((st, i) => { const up = clamp((t - .1 - i * .12) / .3); EH.seatedRev(ctx, PRESS[i], v, t, T, { seat: st, keys: [[0, 'neutral']], look: [0, -.2], seed: i + 1, solo, R: { k: up, to: [st[0] + 30, st[1] - 260] },
      held: up > .4 ? { R: (c, h, s) => PA.phone(c, h[0], h[1] - 30 * s, s * 1.4, 0, null, 0) } : null }); });
    EH.stageFront(ctx, v, solo);
    ctx.restore(); },
  '7|JENSEN: The export control was a failure': x => { const { ctx, t, T, cam, solo } = x, tf = W_(x, 'failure', 1.2), ts = Math.min(t, tf + .05), v = camView({ cx: 585, cy: 470, k: 3.2 }, { ...cam, z: x.camAt(ts).z }, .1);   // крупно Дженсен у букета микрофонов, на заднике COMPUTEX; на «failure» вспышка и стоп-кадр
    ctx.save(); EH.plate(ctx, v, 'wide', 4, solo); if (!solo) EH.screen(ctx, v, ['COMPUTEX', 'TAIPEI · MAY 2025'], 1);
    const P = EH.podium(ctx, JH7, v, ts, T - t + ts, { f: 1, view: null, sp: 'JENSEN', keys: [[0, 'neutral']], look: [.15, .1], solo, R: { k: env(ts, .2, 9, .3), to: [640, 520] } });
    if (P) drawP(ctx, P, v, 'front');
    if (!solo) { for (let i = 0; i < 7; i++) { const b = toS(v, [585 + (i - 3) * 14, 640]), tp = toS(v, [585 + (i - 3) * 9, 588 - (i % 2) * 8]); ctx.strokeStyle = '#121216'; ctx.lineWidth = 3 * v.k; ctx.beginPath(); ctx.moveTo(b[0], b[1]); ctx.lineTo(tp[0], tp[1]); ctx.stroke();
        ell(ctx, tp[0], tp[1], 6 * v.k, 8 * v.k, ['#d0302a', '#2a2a30', '#3a6ad0', '#e0c040', '#2a2a30', '#ffffff', '#d0302a'][i], '#141014', 1.5 * v.k); }
      freezeFrame(ctx, t - tf - .05); }
    ctx.restore(); },
  // ---------------- L17 склад (свой локальный конфиг на плейте bg_blocked_warehouse) ----------------
  '7|and Nvidia wrote off billions': x => { const { ctx, t, cam, solo } = x, tw = W_(x, 'wrote', .76);   // средний: поддоны зелёных коробок NVIDIA H20 за лентой; на «wrote» на ближнюю коробку падает штамп WRITTEN OFF
    if (solo) return; const a = WHA(); if (!a) return; const v = camView({ cx: 1500, cy: 640, k: 1.55 }, cam, .25);
    ctx.save(); shake(ctx, cam); plate(ctx, a.p, v);
    for (const [bx, by, w] of [[1760, 760, 150], [1790, 880, 160], [1720, 1000, 170]]) { const P = toS(v, [bx, by]); B.txt(ctx, 'NVIDIA H20', P[0], P[1], 18 * v.k, { col: '#141014', font: F.label, w: 900, align: 'center' }); }
    const P = toS(v, [1690, 790]); B.stamp(ctx, P[0], P[1], 'WRITTEN OFF', 30 * v.k, t - tw, -.12);
    ctx.restore(); },

  // ---------------- L09 Megaspeed (плейты и реквизит рабочего A, только чтение) ----------------
  '7|Then Megaspeed suddenly went quiet': x => { const { ctx, t, T, cam, solo } = x, v = camView(MS.views.oWide, cam, .3), ts = W_(x, 'stopped', 2.26);   // общий: из факса ползёт бланк PURCHASE ORDER — NVIDIA и застревает; лампочка телефона мигает без ответа; свет в серверной гаснет
    if (solo) return; ctx.save(); shake(ctx, cam); MS.room(ctx, v, 'O', 0, false);
    const flow = Math.min(t, ts) / Math.max(.5, ts) * .55, P = toS(v, [610, 676]); PA.printer(ctx, P[0], P[1], 150 * v.k, flow, Math.min(t, ts));
    const ph = toS(v, [250, 700]); PR.deskPhone(ctx, ph[0], ph[1], 110 * v.k); if (Math.sin(t * 12) > 0) { ctx.fillStyle = '#ff3a2a'; ctx.shadowColor = '#ff3a2a'; ctx.shadowBlur = 14; ctx.beginPath(); ctx.arc(ph[0] + 38 * v.k, ph[1] - 30 * v.k, 6 * v.k, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; }
    const off = E.inOutCubic(clamp((t - ts) / .35)); if (off > 0) { ctx.save(); ctx.beginPath(); for (const [i, q] of [[1100, 60], [1920, 0], [1920, 1000], [1100, 820]].entries()) { const S = toS(v, q); i ? ctx.lineTo(...S) : ctx.moveTo(...S); } ctx.closePath(); ctx.clip(); ctx.fillStyle = `rgba(2,6,10,${.72 * off})`; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    ctx.restore(); },
  '7|and Singapore police opened a case': x => { const { ctx, t, cam, solo } = x, v = camView(MS.views.oGlass, cam, .3);   // средний: по стеклу серверной и коробкам проходит красно-синий отсвет мигалки с улицы
    if (solo) return; ctx.save(); shake(ctx, cam); MS.room(ctx, v, 'O', 0, false);
    for (const [col, ph] of [['255,40,40', 0], ['40,90,255', Math.PI]]) { const k = Math.max(0, Math.sin(t * 2.2 + ph)), x0 = W * (.55 + .4 * Math.sin(t * 1.4 + ph)); ctx.save(); ctx.globalCompositeOperation = 'screen'; const g = ctx.createRadialGradient(x0, H * 1.05, 0, x0, H * 1.05, W * .7); g.addColorStop(0, `rgba(${col},${.95 * k})`); g.addColorStop(1, `rgba(${col},0)`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    ctx.restore(); },

  // ---------------- L04 Вашингтон: доска, штамп, ладонь ----------------
  '7|Because Washington could not': x => { const { ctx, t, T, cam, solo, s } = x, v = camView({ cx: 760, cy: 470, k: 1.45 }, cam, .2);   // чиновник у белой доски: ALLOWED зачёркнуто -> BLOCKED; на «mind» маркер тянется к ALLOWED; на «blocked» двойное подчёркивание
    const tc = W_(x, 'could', .54), tm = W_(x, 'mind', 1.66), tb = (s.ev || []).find(e => e.p === 3)?.t ?? W_(x, /^blocked/, 5.2);
    const wr = clamp((t - tc) / .5), back = env(t, tm - .15, tm + .6, .25, .3), u2 = clamp((t - tb) / .35), wB = t < tc ? 0 : wr < 1 ? 1 : 0, uB = t >= tb && u2 < 1 ? 1 : 0;
    const hand = back > .02 ? [lerp(700, 600, back), 245] : wB ? [lerp(580, 760, wr), 325] : uB ? [lerp(580, 760, u2), 355] : null;   // пишет ЛЕВОЙ рукой (ближней к доске), стоит правее надписей — рука не идёт через лицо
    ctx.save(); shake(ctx, cam);
    WA.revPlate(ctx, v, 0, solo);
    if (!solo) { marker(ctx, v, 'ALLOWED', [545, 245], 46); strike(ctx, v, [540, 242], [700, 238], clamp((t - tc) / .2)); marker(ctx, v, 'BLOCKED', [570, 325], 46, wr, '#c03a2b');
      strike(ctx, v, [570, 355], [740, 353], clamp((t - tb) / .18)); strike(ctx, v, [574, 367], [744, 365], clamp((t - tb - .18) / .18)); }
    WA.standing(ctx, v, t, T, { C: OFFICIAL, rev: true, at: 'board', dx: 200, solo, view: 'threeQuarter', facing: -1, look: [-.5, -.3], L: { k: hand ? 1 : 0, to: hand || [700, 500] } });
    WA.revFront(ctx, v, 0, solo);
    ctx.restore(); },
  '7|In December, the president went further': x => { const { ctx, t, T, cam, solo } = x, v = cover({ cx: 790, cy: 330, k: 2.3 * (1 + (cam.z - 1) * .5) }), td = W_(x, /^twenty/, 3.98);   // вставка: на доске места нет (APR: BLOCKED, AUG: 15%); на «twenty-five» мелом прямо на стене DEC: 25%
    if (solo) return; ctx.save(); shake(ctx, cam); WA.revPlate(ctx, v, 0, solo);
    marker(ctx, v, 'APR: BLOCKED', [535, 225], 34, 1, '#c03a2b'); marker(ctx, v, 'AUG: 15%', [535, 290], 34); marker(ctx, v, 'ALLOWED?', [535, 350], 28, 1, '#1d3f8a'); marker(ctx, v, '→ 15% CUT', [535, 410], 28, 1, '#1d3f8a'); marker(ctx, v, 'BLOCKED!', [760, 380], 26, 1, '#c03a2b', .1); marker(ctx, v, 'TBD', [800, 440], 26, 1, '#1d3f8a', -.1);
    marker(ctx, v, 'DEC:', [950, 250], 26, clamp((t - td + .1) / .25), '#f4f1e8', -.05); marker(ctx, v, '25%', [950, 300], 30, clamp((t - td + .1 - .2) / .25), '#f4f1e8', -.05);
    ctx.restore(); },
  '7|OFFICIAL: China chip: blocked.': x => { const { ctx, t, T, cam, solo } = x, v = WA.view('cu', cam), tb = W_(x, /^blocked/, 1.3);   // крупно чиновник: лист с чипом — к камере на «China»; на «blocked» штамп BLOCKED, удар
    const lift = 1 - E.inOutCubic(clamp((t - (tb - .55)) / .3)), k = env(t, tb - .3, tb + .5, .2, .25);
    ctx.save(); shake(ctx, cam);
    WA.seated(ctx, v, t, T, { C: OFFICIAL, sp: 'OFFICIAL', solo, blur: 3, keys: [[0, 'neutral']], look: [0, lift > .5 ? 0 : .4], L: { k: lift, to: [900, 690] }, R: { k, to: [1000, 800 - 30 * (1 - k)] },
      deskTop: (c, vv) => { if (lift > .4) return; const P = toS(vv, [1000, 822]); PR.chipSheet(c, P[0], P[1], 150 * vv.k); if (t > tb) PR.stampMark(c, P[0] + 8 * vv.k, P[1] + 4 * vv.k, 120 * vv.k, 'BLOCKED', clamp((t - tb) / .12)); },
      heldL: lift > .4 ? (c, P, s) => { c.save(); c.translate(P[0] + 60 * s, P[1] - 40 * s); c.scale(1, 1 / .55); PR.chipSheet(c, 0, 0, 230 * s, .05); c.restore(); } : null,
      heldR: k > .2 ? (c, P, s) => PR.rubberStamp(c, P[0], P[1] + 18 * s, 80 * s) : null });
    ctx.restore(); },
  '7|OFFICIAL: Now allowed.': x => { const { ctx, t, T, cam, solo, d } = x, v = camView({ cx: 760, cy: 470, k: 1.45 }, cam, .2), tf = W_(x, 'Fifteen', 1.54), tp = W_(x, 'please', 2.36);   // обратная: на «Fifteen» дописывает 15% поверх; на «please» раскрытая ладонь к камере
    const wr = clamp((t - tf) / .45), palm = E.outBack(clamp((t - tp + .2) / .35));
    ctx.save(); shake(ctx, cam);
    WA.revPlate(ctx, v, 0, solo);
    if (!solo) { marker(ctx, v, 'ALLOWED', [545, 245], 46); strike(ctx, v, [540, 242], [700, 238], 1); marker(ctx, v, 'BLOCKED', [570, 325], 46, 1, '#c03a2b'); strike(ctx, v, [570, 355], [740, 353], 1); strike(ctx, v, [574, 367], [744, 365], 1); marker(ctx, v, '15%', [600, 420], 60, wr, '#1d3f8a', -.08); }
    const r = WA.standing(ctx, v, t, T, { C: OFFICIAL, rev: true, at: 'board', dx: 200, sp: 'OFFICIAL', solo, view: 'threeQuarter', facing: -1, look: palm > .1 ? [-.1, .1] : [-.5, -.3], L: { k: wr > 0 && wr < 1 ? 1 : 0, to: [lerp(600, 700, wr), 420] }, R: { k: palm, to: [1000, 600] } });
    WA.revFront(ctx, v, 0, solo);
    ctx.restore(); },
  // ---------------- L06 Nvidia: ящик стола, календарь ----------------
  '7|JENSEN: Understood. Blocked.': x => { const { ctx, t, T, cam, solo } = x, tb = W_(x, 'Blocked', .98);   // вставка: зелёная коробочка чипа ложится в ящик стола; на столе календарь APR
    if (solo) return; ctx.save(); shake(ctx, cam); const v = cover({ cx: 1000, cy: 760, k: 2.4 * (1 + (cam.z - 1) * .5) }); NV.widePlate(ctx, v, 3, solo);
    const dk = E.outCubic(clamp(t / .4)), dy = 380 + 40 * dk;
    ctx.fillStyle = '#3b2416'; ctx.strokeStyle = '#141014'; ctx.lineWidth = 8; ctx.fillRect(560, dy, 800, 520); ctx.strokeRect(560, dy, 800, 520); ctx.fillStyle = '#1e120a'; ctx.fillRect(600, dy + 40, 720, 440); ctx.fillStyle = '#c9a54a'; ctx.fillRect(900, dy + 470, 120, 22);
    monthCal(ctx, 1640, 520, 300, 'APR');
    const drop = E.inOutCubic(clamp((t - .15) / Math.max(.4, tb - .25))), bx = 960, by = lerp(120, dy + 300, drop);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, by > dy + 40 ? dy + 480 : H); ctx.clip(); PR.nvBox(ctx, bx, by, 300, { lid: 0, glow: .3 }); ctx.restore();
    if (drop < 1) sleeveArm(ctx, [lerp(1300, 1250, drop), -200], [bx + 120, by - 150], 26, '#26232c');
    ctx.restore(); },
  '7|JENSEN: Wait. Understood?': x => { const { ctx, t, T, cam, solo } = x, v = NV.view('cu', cam), tu = W_(x, 'Understood', .74);   // крупно Дженсен: достаёт ту же коробочку обратно; календарь на столе — уже AUG
    const k = E.outCubic(clamp((t - .1) / .45));
    ctx.save(); shake(ctx, cam);
    NV.seated(ctx, v, t, T, { C: JH, sp: 'JENSEN', solo, blur: 3, keys: [[0, 'neutral'], [tu, 'nervous']], look: [.2, -.1], R: { k, to: [1040, lerp(690, 600, k)] },
      deskTop: (c, vv) => { const P = toS(vv, [1210, 690]); monthCal(c, P[0], P[1], 120 * vv.k, 'AUG'); },
      heldR: (c, P, s) => PR.nvBox(c, P[0] + 46 * s, P[1] + 30 * s, 120 * s, { lid: 0, glow: .25 }) });
    ctx.restore(); },
  '7|JENSEN: Does anyone have a calendar': x => { const { ctx, t, T, cam, solo } = x, v = camView({ cx: 900, cy: 600, k: 1.35 }, cam, .2), tc = W_(x, 'calendar', 1.2);   // обратная: Дженсен у стола; календарь сам перелистывается AUG -> DEC
    const fl = clamp((t - tc + .45) / .9), m = ['AUG', 'SEP', 'OCT', 'NOV', 'DEC'], i = Math.min(3, Math.floor(fl * 4)), f = fl * 4 - i;
    ctx.save(); shake(ctx, cam);
    NV.revPlate(ctx, v, 0, solo);
    NV.standing(ctx, v, t, T, { C: JH, rev: true, at: 'room', sp: 'JENSEN', solo, view: 'threeQuarter', facing: 1, look: [.6, .4], keys: [[0, 'nervous']], R: { k: env(t, .2, x.d, .3), to: [930, 560] } });
    NV.revFront(ctx, v, 0, solo);
    if (!solo) { const P = toS(v, [1150, 905]); monthCal(ctx, P[0], P[1], 130 * v.k, fl >= 1 ? 'DEC' : m[i], fl >= 1 ? null : m[i + 1], fl >= 1 ? 0 : f); }
    ctx.restore(); },
  // ---------------- L13 редакция ----------------
  '7|Later, when the New York Times': x => { const { ctx, t, T, cam, solo } = x, v = NR.view('rep', cam, .2), tc = W_(x, 'cleared', 3.02);   // крупно репортёр сверяет список допущенных фирм; на «cleared» строка подсвечивается
    const LW = 260, LH = 330, at = NR.CFG.rep.at, fs = NR.CFG.rep.fs, P0 = [at[0] + 40, at[1] - 470 * fs];
    ctx.save(); shake(ctx, cam);
    NR.room(ctx, v, t, T, { solo, blur: 3, rep: { keys: [[0, 'neutral']], look: [.3, .7], tilt: .04, L: { k: 1, to: [P0[0] - LW * fs * .42, P0[1] + LH * fs * .35] }, R: { k: 1, to: [P0[0] + LW * fs * .42, P0[1] + LH * fs * .35] },
      under: (c) => { const P = toS(v, P0), sc = v.k * fs; B.sheet(c, P[0], P[1], LW * sc, LH * sc, -.03, (cc, w, h) => B.clearedList(cc, w, h, clamp((t - tc) / .4))); } } });
    ctx.restore(); },
  // ---------------- L05 Пекин ----------------
  '7|its Beijing address was an empty': x => { const { ctx, t, cam, solo } = x, te = W_(x, 'empty', 1.4);   // общий: здание по адресу; на «empty» окна гаснут, табличка на двери пустая
    if (solo) return; emptyBuilding(ctx, cam, clamp((t - te + .1) / .35)); },
  '7|Now look at it from Beijing': x => { const { ctx, t, T, cam, solo } = x, v = BJ.view('wide', cam, .3);   // общий пекинский кабинет: офицер садится к шахматной доске (безликий силуэт)
    const sit = E.inOutCubic(clamp(t / .7));
    ctx.save(); shake(ctx, cam); BJ.widePlate(ctx, v, 0, solo);
    let r = {}; silhouette(ctx, c => { r = BJ.seated(c, v, t, T, { C: OFF1, solo: true, shade: false, keys: [[0, 'neutral']], dy: 0, lean: .15 * (1 - sit) }); c.translate(0, 0); }, { col: '#160909', rim: 'rgba(255,140,100,.55)', rimDir: [0, -1] });
    BJ.deskFront(ctx, v, 0, solo); chessOnDesk(ctx, v, t, {}); if (r.hl) for (const P of [r.hl, r.hr]) { ctx.fillStyle = '#160909'; ctx.beginPath(); ctx.arc(P[0], P[1], 12 * r.s, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore(); },
  '7|One chip is valuable': x => { const { ctx, t, cam, solo } = x, tv = W_(x, 'valuable', .84);   // вставка: на краю доски фигура-чип (зелёная плата на подставке пешки) с ценником $$$
    if (solo) return; ctx.save(); shake(ctx, cam); const v = cover({ cx: 1060, cy: 830, k: 3.4 * (1 + (cam.z - 1) * .5) }); BJ.widePlate(ctx, v, 6, solo);
    board(ctx, W / 2, H * .62, 1400, .42); for (const [px, py] of [[-.35, .1], [-.15, .2], [.1, .05]]) piece(ctx, [W / 2 + px * 1400, H * .62 + py * 600], 1.3, 'pawn');
    piece(ctx, [W / 2 + .38 * 1400 * .9, H * .62 + .08 * 600], 1.9 + .15 * gauss(t, tv, .15), 'chip');
    ctx.restore(); },
  '7|But one conversation between': x => { const { ctx, t, cam, solo, d } = x, tc = W_(x, 'conversation', .3);   // сверху: рука ставит фигурку Дженсена рядом с фигуркой Белого дома; на «conversation» между ними встаёт облачко «…»
    if (solo) return; ctx.save(); shake(ctx, cam); ctx.fillStyle = '#1a0606'; ctx.fillRect(0, 0, W, H); ctx.translate(W / 2, H / 2); ctx.rotate(.04 * t); ctx.translate(-W / 2, -H / 2);
    board(ctx, W / 2, H / 2, 960, 1);
    const pl = E.outCubic(clamp((t - .05) / .5)), jP = [W / 2 - 90, lerp(H / 2 - 520, H / 2 + 80, pl)];
    piece(ctx, [W / 2 + 230, H / 2 + 80], 2.6, 'house'); piece(ctx, jP, 2.6, 'jensen'); piece(ctx, [W / 2 + 80, H / 2 + 20], 2.3, 'bubble', { k: E.outBack(clamp((t - tc) / .3)) });
    if (pl < 1) sleeveArm(ctx, [W / 2 - 300, -260], [jP[0], jP[1] - 270], 40, '#3a1414');
    ctx.restore(); },
  '7|could open or close an entire': x => { const { ctx, t, cam, solo } = x, to = W_(x, 'open', .3), tc = W_(x, 'close', 1.1);   // вставка: воротца CHINA · $50B с навесным замком; замок щёлкает — открылся, закрылся
    if (solo) return; ctx.save(); shake(ctx, cam); const v = cover({ cx: 1060, cy: 830, k: 3.4 * (1 + (cam.z - 1) * .5) }); BJ.widePlate(ctx, v, 6, solo);
    board(ctx, W / 2, H * .7, 1400, .42); const op = t < tc ? E.outBack(clamp((t - to) / .2)) : 1 - E.inCubic(clamp((t - tc) / .12)); gate(ctx, [W / 2, H * .68], 2.6, op);
    ctx.restore(); },
  '7|OFFICER: A chip, or a conversation': x => { const { ctx, t, T, cam, solo, s, d } = x, tw = s.whip?.t ?? d * .5, wu = inOutExpo((t - tw + .1) / WHIP_DUR);   // крупно офицер 1 поднимает фигуру-чип -> вип-пан -> офицер 2 ставит рядом с фигуркой Дженсена крошечный пустой стул
    const v = lerpView(BJ.view('cu', { ...cam, dx: 0 }), cover({ cx: 1150, cy: 640, k: 2.0 }), clamp(wu)), lift = env(t, .15, tw + .2, .3), place = E.outCubic(clamp((t - tw - .3) / .5));
    ctx.save(); shake(ctx, cam); BJ.widePlate(ctx, v, 3, solo);
    let r1 = {}, r2 = {};
    silhouette(ctx, c => { r1 = BJ.seated(c, v, t, T, { C: OFF1, solo: true, shade: false, sp: 'OFFICER', keys: [[0, 'neutral']], R: { k: lift, to: [960, 640] } }); }, { col: '#160909', rim: 'rgba(255,140,100,.55)', rimDir: [0, -1] });
    silhouette(ctx, c => { r2 = B2stand(c, v, t, T, place); }, { col: '#1c0a0a', rim: 'rgba(255,140,100,.5)', rimDir: [-1, -.4] });
    BJ.deskFront(ctx, v, 3, solo); chessOnDesk(ctx, v, t, { chair: place, hand: r2.hl });
    if (r1.hr && lift > .2) piece(ctx, [r1.hr[0] + 6 * r1.s, r1.hr[1] - 6 * r1.s], .7 * r1.s / .66 * 1.0, 'chip');
    for (const r of [r1, r2]) if (r.hl) for (const P of [r.hl, r.hr]) { ctx.fillStyle = '#160909'; ctx.beginPath(); ctx.arc(P[0], P[1], 12 * r.s, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore(); },
  // ---------------- L06 Nvidia: папка заказов ----------------
  '7|Nvidia later said it had cut': x => { const { ctx, t, cam, solo } = x, tc = W_(x, 'cut', 1.46);   // вставка: на столе Nvidia папка MEGASPEED · ORDERS; на «cut» штамп ACCOUNT CLOSED, толчок
    if (solo) return; ctx.save(); shake(ctx, cam); const v = cover({ cx: 1000, cy: 700, k: 2.6 * (1 + (cam.z - 1) * .5) }); NV.widePlate(ctx, v, 3, solo);
    ctx.save(); ctx.translate(W / 2, H * .6); ctx.scale(1, .62); ctx.rotate(-.04); ctx.fillStyle = '#c9ae72'; ctx.strokeStyle = '#141014'; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(-460, -330, 920, 660, 10); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#efe4c8'; ctx.fillRect(-300, -200, 600, 120); ctx.strokeRect(-300, -200, 600, 120); B.txt(ctx, 'MEGASPEED · ORDERS', 0, -140, 56, { align: 'center', w: 900 }); B.lines(ctx, -300, 0, 600, 5, 50); B.stamp(ctx, 40, 120, 'ACCOUNT CLOSED', 84, t - tc, -.12); ctx.restore();
    ctx.restore(); },
  // ---------------- L04: сенатор -> Минторг (вип-пан), Минюст ----------------
  '7|SENATOR: Look into Megaspeed': x => { const { ctx, t, T, cam, solo, s, d } = x, tw = s.whip?.t ?? d * .6;   // крупно сенатор кладёт папку MEGASPEED с обрывком красной нити, печать Сената -> вип-пан -> Минторг у матовой двери; папка уходит вправо
    const put = E.outCubic(clamp((t - .1) / .45));
    whipPlates(ctx, t, tw,
      () => { const v = WA.view('cu', cam); WA.widePlate(ctx, v, 3, solo); if (!solo) seal(ctx, v, [495, 275], 'SENATE');
        WA.seated(ctx, v, t, T, { C: SENATOR, sp: 'SENATOR', solo, noPlate: true, blur: 3, keys: [[0, 'neutral']], look: [0, .4], R: { k: 1 - put * .7, to: [1010, 790] },
          deskTop: (c, vv) => { const P = toS(vv, [lerp(1060, 990, put), lerp(760, 820, put)]); megaFolder(c, P[0], P[1], 170 * vv.k, .5); const N = toS(vv, [760, 838]); plaque(c, N[0], N[1], 150 * vv.k, 'SEN. T. COTTON'); } }); },
      () => { const v = WA.view('revDoor', cam, .2); WA.revPlate(ctx, v, 0, solo); if (!solo) frosted(ctx, v, 'DEPARTMENT OF COMMERCE');
        const out = E.inCubic(clamp((t - d + .55) / .45));
        WA.standing(ctx, v, t, T, { C: COMMERCE, rev: true, at: 'door', dx: 120, sp: 'COMMERCE', solo, view: 'threeQuarter', facing: -1, look: [-.3, .1], R: { k: 1, to: [lerp(1150, 1500, out), 600] },
          heldR: (c, P, sc) => megaFolder(c, P[0] + 40 * sc, P[1], 200 * sc, 1, -.1) });
        WA.revFront(ctx, v, 0, solo); });
  },
  "7|JUSTICE: We'll take it from here": x => { const { ctx, t, T, cam, solo } = x, v = WA.view('revDoor', cam, .2);   // обратная: Минюст у двери на цепи, печать с весами; папка входит слева — он забирает её под мышку
    const inn = E.outCubic(clamp(t / .35)), tuck = E.inOutCubic(clamp((t - .45) / .4));
    ctx.save(); shake(ctx, cam); WA.revPlate(ctx, v, 0, solo); if (!solo) seal(ctx, v, [1570, 280], 'JUSTICE');
    const fx = lerp(500, 880, inn);   // папка въезжает слева, он принимает её левой рукой и забирает под мышку
    WA.standing(ctx, v, t, T, { C: JUSTICE, rev: true, at: 'door', dx: 30, sp: 'JUSTICE', solo, view: 'threeQuarter', facing: -1, look: [-.4, .1], L: { k: inn >= 1 ? 1 : E.outCubic(inn), to: [lerp(fx, 1010, tuck), lerp(560, 600, tuck)] },
      heldL: inn >= 1 ? (c, P, sc) => megaFolder(c, P[0] - 40 * sc * (1 - tuck), P[1] - 10 * sc, 200 * sc, 1, lerp(-.1, 1.2, tuck)) : null });
    if (!solo && inn < 1) { const P = toS(v, [fx - 20, 550]); megaFolder(ctx, P[0], P[1], 200 * .5 * v.k, 1, -.1); }
    WA.revFront(ctx, v, 0, solo);
    ctx.restore(); },
  // ---------------- L02: агенты в салоне, папка расшифровок; хроника Тайбэя ----------------
  '7|And by then, the people listening': x => { const { ctx, t, T, cam, solo } = x, v = camView(CAR.views.both, cam, .5);   // те же агенты в наушниках, крутятся бобины, по стеклу дождь
    ctx.save(); shake(ctx, cam);
    CAR.car(ctx, v, t, T, { solo, reelsAng: T * 3.2, tapes: 12, a1: { keys: [[0, 'neutral']], press: env(t, .4, 2.2, .3), look: [.6, .25] }, a2: { keys: [[0, 'neutral']], look: [-.4, .45] } });
    ctx.restore(); },
  '7|had put everything in writing': x => { const { ctx, t, T, cam, solo } = x, tw = W_(x, 'writing', 1.4);   // вставка: толстая папка TRANSCRIPTS с закладками JAN…DEC захлопывается на пассажирском сиденье
    if (solo) return; ctx.save(); shake(ctx, cam); const a = CAR.A(); if (a) plate(ctx, a.plate, cover({ cx: 1150, cy: 900, k: 2.4 * (1 + (cam.z - 1) * .5) }));
    ctx.fillStyle = 'rgba(10,10,16,.35)'; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate(W / 2 - 560, H * .3); B.transcripts(ctx, 1120, 760, clamp((t - tw + .25) / .25)); ctx.restore();
    ctx.restore(); },
  '7|Footage aired later by a Taiwanese': x => { const { ctx, t, cam, solo, s } = x;   // вставка: монитор в баре — на экране кадр ТВ: улица, машина
    if (solo) return; const a = PAa(); if (!a) return; ctx.save(); shake(ctx, cam); plate(ctx, a.bar, cover({ cx: 960, cy: 540, k: 1.3 }));
    const z = 1 + (cam.z - 1) * .6; B.tv(ctx, W / 2, H * .5, 1280 * z, -.01, t, { scene: (c, w, h) => { c.save(); c.scale(w / W, h / H); streetFootage(c, 0, 9, { z: 1 }); tvLook(c, t, 'TV'); c.restore(); }, chyron: 'TAIPEI · GROUP DINNER', chyronK: up(t, .3) });
    ctx.restore(); },
  '7|leaving a group dinner in Taipei': x => { const { ctx, t, cam, solo } = x, tc = W_(x, 'car', 3.7);   // кадр ТВ-хроники: двое садятся в одну машину, дверь хлопает
    if (solo) return; ctx.save(); streetFootage(ctx, t, tc, cam); tvLook(ctx, t, 'TV'); ctx.restore(); },

};
export const OVER = {
  // сплит «звонок 25 %»: слева чиновник у окна с трубкой — на «cut» пишет 25% на стекле; справа Дженсен с трубкой поднимает чип выше на «Stronger» (окна шаблона ядра закрыты целиком)
  '7|OFFICIAL: Stronger chip allowed': (ctx, s, t, d) => { const T = s.start + t, x = { s }, tS = W_(x, 'Stronger', .1), tc = W_(x, 'cut', d - .5), n = 2, pw = W / n;
    const pane = (i, fn) => { ctx.save(); ctx.beginPath(); ctx.rect(i * pw + 4, 0, pw - 8, H); ctx.clip(); ctx.translate(i * pw + pw / 2 - W / 2, 0); fn(); ctx.restore(); };
    pane(0, () => { const v = { cx: 330, cy: 470, k: 1.5 + .03 * t }; WA.revPlate(ctx, v, 0, false);
      marker(ctx, v, '25%', [150, 380], 64, clamp((t - tc + .1) / .4), '#d0302a', -.06);
      person(ctx, v, t, T, { C: OFFICIAL, at: [420, 800], fs: .5, view: 'threeQuarter', facing: -1, sp: 'OFFICIAL', light: [-1, -.2], shadow: true, keys: [[0, 'neutral']], look: [-.6, -.2],
        L: { k: 1, to: [400, 430] }, heldL: (c, P, sc) => PR.handsetHeld(c, P, sc, -1), R: { k: env(t, tc - .3, d + 1, .25), to: [250, 390] } }); WA.revFront(ctx, v, 0, false); });
    pane(1, () => { const v = NV.view('cu', { z: 1 + .03 * t, dx: 0, dy: 0 }), k = E.outBack(clamp((t - tS) / .35));
      NV.seated(ctx, v, t, T, { C: JH, sp: 'JENSEN', blur: 3, keys: [[0, 'neutral']], phone: 'L', phoneK: 1, look: [.3, -.2 * k], R: { k: .6 + .4 * k, to: [1050, lerp(600, 470, k)] }, heldR: (c, P, sc) => PR.chip(c, P[0] + 10 * sc, P[1] - 50 * sc, 1.1 * sc, 0, .8 + .4 * k) }); });
    ctx.fillStyle = '#000'; ctx.fillRect(pw - 4, 0, 8, H); },

  '7|Later, when the New York Times': B.plaquesAt(1460, 120),
  '7|Footage aired later by a Taiwanese': B.plaquesAt(520, 70),
};
export const SKIP_PROPS = { '7|and Nvidia wrote off billions': /./, '7|JENSEN: The export control was a failure': /COMPUTEX/, '7|Through every twist, Jensen made': /APR|AUG|DEC/, '7|OFFICIAL: Stronger chip allowed': /./, '7|Because Washington could not': /./, '7|In December, the president went further': /./, '7|OFFICIAL: China chip: blocked.': /BLOCKED/, '7|OFFICIAL: Now allowed.': /15%/,
  '7|Later, when the New York Times': /./, '7|One chip is valuable': /\$\$\$/, '7|could open or close an entire': /CHINA/, '7|Nvidia later said it had cut': /ACCOUNT CLOSED|MEGASPEED/, '7|SENATOR: Look into Megaspeed': /./,
  '7|had put everything in writing': /TRANSCRIPTS/, '7|Footage aired later by a Taiwanese': /./ };
export const RAIN = null;   // или s => true/false/undefined — переопределение дождя для планов главы
