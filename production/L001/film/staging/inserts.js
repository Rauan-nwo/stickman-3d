// staging/inserts.js — вставки и мелкие планы гл. 0: улица (машина агентов и окно ресторана), рука в перчатке с чипом (D02-A),
// снимки на столике агента, снимок той ночи (полароид, планшет, папка).
import { jensen, alice, noirShade, act, blinkAt, clamp, lerp, E } from 'engine';
import { chip, gloveDot, polaroid, menuLens } from '../props.js';
import { W, H, toS, plate, img, lazy, fig, canvas, polyMask, masked, soft } from './common.js';
import { A as RA, wide } from './restaurant.js';
import streetPlate from '../../assets/bg_singapore_street.png';

// ---------- снимок «Дженсен + Алиса» той ночи: общий план ресторана, отрендеренный один раз ----------
let SNAP = null;
export function snapshot() {
  if (SNAP) return SNAP; if (!RA()) return null;
  const c = canvas(), x = c.getContext('2d');
  wide(x, { cx: 960, cy: 620, k: 1.1 }, .9, -100, { j: { keys: [[0, 'laugh', { talking: false }]], laugh: true }, a: { keys: [[0, 'smug']] } });
  return (SNAP = c);
}
// картинка в рамку w×h (кадр по центру, без искажения)
export const snapPic = (x, w, h) => { const s = snapshot(); if (!s) { x.fillStyle = '#2a2230'; x.fillRect(0, 0, w, h); return; } const r = w / h, sw = Math.min(W, H * r), sh = sw / r; x.drawImage(s, (W - sw) / 2, (H - sh) / 2, sw, sh, 0, 0, w, h); x.fillStyle = 'rgba(255,220,170,.08)'; x.fillRect(0, 0, w, h); };

// ---------- улица под дождём ----------
const SI = { street: img(streetPlate) };
const SA = lazy([SI.street], () => ({ street: SI.street, cloth: masked(SI.street, polyMask([[[1212, 600], [1250, 594], [1380, 594], [1428, 600], [1430, 648], [1210, 648]]])) }));
const tJ = jensen(), tA = alice(); tJ.spec.shade = noirShade([1, .45]); tA.spec.shade = noirShade([-1, .45]);
export const STREET = { window: { J: [1196, 640], A: [1446, 640], fs: .17 }, car: [[300, 596], [352, 600]] };
export function street(ctx, v, t, o = {}) {
  const a = SA(); if (!a) return;
  if (!o.solo) plate(ctx, a.street, v);
  // в окне ресторана — двое за тем самым столом (крошечные, видны сквозь дождь)
  const w = STREET.window;
  for (const [C, P, f, st, seed] of [[tJ, w.J, 1, 'sitR', 1], [tA, w.A, -1, 'sitL', 2]]) {
    const p = act(t, [[0, f > 0 ? 'neutral' : 'smug']]); Object.assign(p, { blink: blinkAt(t, seed), view: 'threeQuarter', facing: f, stance: st, bob: 0, sq: 0, lean: f * .03 * Math.sin(t * 1.4 + seed), tilt: 0 });
    fig(ctx, C, p, v, P, w.fs, 'seat');
  }
  if (!o.solo) plate(ctx, a.cloth, v);
  // в припаркованной машине: два силуэта голов в окнах и тёплый отсвет магнитофона
  if (!o.solo) for (const [i, [x, y]] of STREET.car.entries()) { const P = toS(v, [x, y]), r = 15 * v.k;
    ctx.save(); ctx.fillStyle = 'rgba(8,8,14,.92)'; ctx.beginPath(); ctx.arc(P[0], P[1] - r * .4, r, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(P[0] - r * 1.3, P[1] + r * .2, r * 2.6, r * 1.2);
    ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = `rgba(255,170,90,${.18 + .06 * Math.sin(t * 3 + i)})`; ctx.beginPath(); ctx.arc(P[0] + r * .8, P[1] + r * .4, r * 1.6, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
}

// ---------- D02-A: под столом рука в чёрной перчатке со стороны Алисы просовывает светящийся чип ----------
// k 0..1+ — проход руки (перелёт на ударном слове), pulse — вспышка свечения чипа
export function chipUnder(ctx, t, k, pulse, o = {}) {
  const ra = RA(); if (!ra) return;
  // фон: зал из-под стола — обратная точка ресторана, сильно размытая и затемнённая (пол, ножки стульев)
  ctx.save(); ctx.filter = 'blur(6px) brightness(.38) saturate(.8)'; ctx.drawImage(ra.revB9, -60, -260, W + 120, H + 360); ctx.restore();
  const x = lerp(W + 260, W * .56, E.outBack(clamp(k), 1.2)), y = H * .66, gl = .75 + .25 * Math.sin(t * 9) + .6 * pulse;
  // пол и ножки
  ctx.save(); const fl = ctx.createLinearGradient(0, H * .78, 0, H); fl.addColorStop(0, 'rgba(10,20,26,0)'); fl.addColorStop(1, 'rgba(10,20,26,.85)'); ctx.fillStyle = fl; ctx.fillRect(0, H * .78, W, H * .22); ctx.restore();
  ctx.fillStyle = '#1a0d10'; ctx.strokeStyle = '#0a0608'; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.roundRect(W * .2, H * .36, 70, H * .7, 20); ctx.fill(); ctx.stroke();                                         // ножка-тумба стола
  ctx.beginPath(); ctx.ellipse(W * .2 + 35, H * .98, 180, 26, 0, 0, Math.PI * 2); ctx.fill();
  // чип в кисти (кисть-точка в перчатке, манжета уходит вправо — со стороны Алисы)
  chip(ctx, x - 205, y - 8, .9, -.08, gl);
  gloveDot(ctx, x, y, 92, -.3, [-.7, -.7]);
  // скатерть сверху: свес с фестонами, сквозь ткань пробивается зелёный свет чипа
  ctx.save(); ctx.fillStyle = '#EDE3D2'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W, 0); ctx.lineTo(W, H * .34);
  for (let i = 24; i > 0; i--) ctx.quadraticCurveTo(W * (i - .5) / 24, H * .34 + 30, W * (i - 1) / 24, H * .34);
  ctx.closePath(); ctx.fill(); ctx.lineWidth = 7; ctx.strokeStyle = '#141014'; ctx.stroke();
  ctx.clip(); for (let i = 0; i < 9; i++) { const fx = W * (i + .5) / 9; ctx.fillStyle = 'rgba(90,60,50,.16)'; ctx.beginPath(); ctx.moveTo(fx - 40, 0); ctx.lineTo(fx + 10, H * .36); ctx.lineTo(fx + 50, H * .36); ctx.closePath(); ctx.fill(); }
  const g = ctx.createLinearGradient(0, H * .05, 0, H * .38); g.addColorStop(0, 'rgba(40,20,20,.35)'); g.addColorStop(1, 'rgba(40,20,20,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H * .4);
  ctx.globalCompositeOperation = 'screen'; const gg = ctx.createRadialGradient(x - 205, H * .34, 0, x - 150, H * .34, 380); gg.addColorStop(0, `rgba(90,255,140,${.42 * Math.min(1.4, gl)})`); gg.addColorStop(1, 'rgba(90,255,140,0)'); ctx.fillStyle = gg; ctx.fillRect(0, 0, W, H * .42);
  ctx.restore();
}

// ---------- снимки падают на столик агента (рядом с его меню) ----------
export function photosDrop(ctx, t, times, o = {}) {
  const ra = RA(); if (!ra) return;
  ctx.drawImage(ra.revB9, 0, -120, W, H + 120);                         // зал позади — далеко и размыто
  ctx.save(); const tb = ctx.createLinearGradient(0, H * .42, 0, H); tb.addColorStop(0, '#d9c3a8'); tb.addColorStop(.5, '#e9d8bf'); tb.addColorStop(1, '#c9ae90');   // его скатерть крупно
  ctx.fillStyle = tb; ctx.beginPath(); ctx.moveTo(-40, H * .5); ctx.quadraticCurveTo(W * .5, H * .4, W + 40, H * .5); ctx.lineTo(W + 40, H + 10); ctx.lineTo(-40, H + 10); ctx.closePath(); ctx.fill(); ctx.lineWidth = 7; ctx.strokeStyle = '#141014'; ctx.stroke();
  const glow = ctx.createRadialGradient(W * .86, H * .5, 0, W * .86, H * .5, 600); glow.addColorStop(0, 'rgba(255,190,110,.35)'); glow.addColorStop(1, 'rgba(255,170,90,0)'); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H); ctx.restore();
  // меню лежит слева, объектив на нём
  ctx.save(); ctx.translate(W * .2, H * .72); ctx.scale(1, .55); ctx.rotate(-.2); menuLens(ctx, 0, 0, 420, { lens: 1, glint: .2, tilt: 0 }); ctx.restore();
  // снимки: падают по одному, последний — на ударном слове
  const spots = [[W * .52, H * .66, -.16], [W * .58, H * .63, .1], [W * .5, H * .6, .2], [W * .6, H * .7, -.05]];
  times.forEach((t0, i) => { if (t < t0) return; const u = clamp((t - t0) / .22), [x, y, a] = spots[i % spots.length], fall = (1 - E.outBack(u, 1.4)) * 420, sc = lerp(1.25, 1, u);
    ctx.save(); ctx.translate(x, y - fall); ctx.scale(sc, sc * lerp(.9, .74, u)); polaroid(ctx, 0, 0, 460, a, snapPic, 1); ctx.restore(); });
}
