// staging/desktop.js — T-desk «их стол сверху» (#25, #26; bg_desk_restaurant_top): читается без слов.
//   стул Дженсена (слева) — на спинке висит его чёрная кожанка; стул напротив (справа) — ПУСТОЙ;
//   на «China» с правого края тянется красная нить с биркой BEIJING и ложится к пустому стулу (D14-A);
//   #26: мел обводит этот пустой стул от руки (круг замыкается на «seat»), нить натягивается; телефон экраном вниз жужжит.
import { clamp, lerp, E } from 'engine';
import { W, H, toS, plate, img, lazy, cover } from './common.js';
import topPlate from '../../assets/bg_desk_restaurant_top.png';

export const CFG = {
  chairJ: [400, 600], chairE: [1505, 600],            // центры стульев (пиксели плейта): Дженсен слева, пустой справа
  jacket: [355, 600],                                 // кожанка на спинке его стула
  phone: [560, 815, -.35],                            // телефон у его тарелки: центр, поворот
  threadFrom: [1960, 250],                            // нить входит из-за правого края
  circle: [1520, 600, 235, 290],                      // мел вокруг пустого стула
  views: { top: { cx: 960, cy: 540, k: 1.04 }, chair: { cx: 1380, cy: 600, k: 1.55 } },
};
const I = { top: img(topPlate) };
const A = lazy([I.top], () => ({ top: I.top }));
const lg = (x, x0, y0, x1, y1, st) => { const g = x.createLinearGradient(x0, y0, x1, y1); st.forEach(([o, c]) => g.addColorStop(o, c)); return g; };

// кожанка на спинке стула (вид сверху): плечи и ворот, молния, блик
function jacket(ctx, P, s) {
  ctx.save(); ctx.translate(P[0], P[1]); ctx.scale(s, s); ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(-60, -150); ctx.quadraticCurveTo(-95, -60, -70, 40); ctx.lineTo(-40, 150); ctx.lineTo(40, 150); ctx.lineTo(70, 40); ctx.quadraticCurveTo(95, -60, 60, -150); ctx.quadraticCurveTo(0, -175, -60, -150); ctx.closePath();
  ctx.fillStyle = lg(ctx, -90, 0, 90, 0, [[0, '#3a3640'], [.5, '#1a181e'], [1, '#0c0b0f']]); ctx.fill(); ctx.lineWidth = 7; ctx.strokeStyle = '#0a090c'; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-30, -150); ctx.lineTo(0, -100); ctx.lineTo(30, -150); ctx.lineWidth = 6; ctx.stroke();             // ворот
  ctx.beginPath(); ctx.moveTo(8, -110); ctx.lineTo(14, 150); ctx.lineWidth = 4; ctx.strokeStyle = '#B9BDC5'; ctx.stroke();            // молния
  ctx.beginPath(); ctx.moveTo(-60, -100); ctx.quadraticCurveTo(-75, -20, -55, 60); ctx.lineWidth = 10; ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.stroke();
  ctx.restore();
}
// телефон экраном вниз: корпус, камеры на крышке, свечение экрана из-под краёв; buzz 0..1 — вибрация с дугами
function phone(ctx, P, a, s, buzz, t) {
  const dx = buzz > 0 ? Math.sin(t * 95) * 4 * s * buzz : 0;
  ctx.save(); ctx.translate(P[0] + dx, P[1]); ctx.rotate(a); ctx.scale(s, s);
  ctx.save(); ctx.globalCompositeOperation = 'screen'; const g = ctx.createRadialGradient(0, 0, 40, 0, 0, 170); g.addColorStop(0, `rgba(140,200,255,${.35 + .3 * buzz})`); g.addColorStop(1, 'rgba(140,200,255,0)'); ctx.fillStyle = g; ctx.fillRect(-180, -220, 360, 440); ctx.restore();
  ctx.beginPath(); ctx.roundRect(-70, -140, 140, 280, 26); ctx.fillStyle = lg(ctx, -70, 0, 70, 0, [[0, '#2c2c34'], [.5, '#1b1b21'], [1, '#101014']]); ctx.fill(); ctx.lineWidth = 7; ctx.strokeStyle = '#08080a'; ctx.stroke();
  ctx.beginPath(); ctx.roundRect(-52, -122, 58, 58, 14); ctx.fillStyle = '#0d0d11'; ctx.fill(); ctx.lineWidth = 4; ctx.stroke();        // блок камер
  for (const [cx, cy] of [[-36, -106], [-10, -106], [-36, -80]]) { ctx.beginPath(); ctx.arc(cx, cy, 9, 0, Math.PI * 2); ctx.fillStyle = '#26364a'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#000'; ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(-48, 60); ctx.lineTo(-48, 120); ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.stroke();
  ctx.restore();
  if (buzz > .02) {                                                                               // дуги вибрации по бокам
    ctx.save(); ctx.translate(P[0], P[1]); ctx.rotate(a); ctx.strokeStyle = `rgba(255,255,255,${.75 * buzz})`; ctx.lineWidth = 5 * s; ctx.lineCap = 'round';
    for (const sd of [-1, 1]) for (const r of [100, 125]) { const ph = (t * 6 + r / 50) % 1; ctx.globalAlpha = 1 - ph * .6; ctx.beginPath(); ctx.arc(0, 0, (r + 14 * ph) * s, sd > 0 ? -.45 : Math.PI - .45, sd > 0 ? .45 : Math.PI + .45); ctx.stroke(); }
    ctx.restore();
  }
}
// красная нить: от края к стулу; k 0..1 — сколько протянуто; taut 0..1 — натянута (провис уходит)
function thread(ctx, v, k, taut) {
  if (k <= 0) return; const A0 = toS(v, CFG.threadFrom), B = toS(v, [CFG.chairE[0] + 40, CFG.chairE[1] - 150]);
  const sag = (1 - taut) * 70 * v.k, M = [(A0[0] + B[0]) / 2, (A0[1] + B[1]) / 2 + sag], end = [lerp(A0[0], B[0], k), lerp(A0[1], B[1], k) + Math.sin(Math.PI * k) * sag];
  ctx.save(); ctx.strokeStyle = '#C0202A'; ctx.lineWidth = 5 * v.k; ctx.lineCap = 'round'; ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 4;
  ctx.beginPath(); ctx.moveTo(A0[0], A0[1]); if (k >= 1) ctx.quadraticCurveTo(M[0], M[1], B[0], B[1]); else ctx.lineTo(end[0], end[1]); ctx.stroke(); ctx.restore();
  const tagP = k >= 1 ? [lerp(A0[0], B[0], .35), lerp(A0[1], B[1], .35) + sag * .9] : [lerp(A0[0], end[0], .5), lerp(A0[1], end[1], .5)];
  ctx.save(); ctx.translate(tagP[0], tagP[1] + 16 * v.k); ctx.rotate(.08); const w = 190 * v.k, h = 64 * v.k;          // бирка BEIJING на нити
  ctx.fillStyle = '#F2E8CC'; ctx.strokeStyle = '#3a2a18'; ctx.lineWidth = 3 * v.k; ctx.beginPath(); ctx.roundRect(-w / 2, 0, w, h, 6 * v.k); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#B3121F'; ctx.font = `900 ${Math.round(34 * v.k)}px Bahnschrift, 'Arial Black', sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('BEIJING', 0, h / 2 + 2 * v.k);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -16 * v.k); ctx.strokeStyle = '#C0202A'; ctx.lineWidth = 4 * v.k; ctx.stroke(); ctx.restore();
}
// мел от руки вокруг пустого стула: неровный штрих с перехлёстом в конце, k 0..1
function chalk(ctx, v, k) {
  if (k <= 0) return; const [cx, cy, rx, ry] = CFG.circle, n = 90, m = Math.ceil(n * Math.min(1, k) * 1.08);
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const [w, col] of [[16, 'rgba(255,255,255,.18)'], [9, 'rgba(250,248,240,.92)']]) {
    ctx.beginPath();
    for (let i = 0; i <= m; i++) { const a = -2.3 + i / n * Math.PI * 2, wob = 1 + .025 * Math.sin(i * .21 + 1) + .012 * Math.sin(i * .53), P = toS(v, [cx + Math.cos(a) * rx * wob, cy + Math.sin(a) * ry * wob]); i ? ctx.lineTo(P[0], P[1]) : ctx.moveTo(P[0], P[1]); }
    ctx.lineWidth = w * v.k; ctx.strokeStyle = col; ctx.stroke();
  }
  ctx.restore();
}
// кадр. o = { thread: k, taut, chalk: k, buzz, base: 'top'|'chair' }
export function desktop(ctx, cam, t, o = {}) {
  const a = A(); if (!a) return; const b = CFG.views[o.base || 'top'];
  const v = cover({ cx: b.cx + cam.dx * W * .5, cy: b.cy + cam.dy * H * .5, k: b.k * (1 + (cam.z - 1) * .6) });
  plate(ctx, a.top, v);
  const s = v.k; jacket(ctx, toS(v, CFG.jacket), s * .95);
  phone(ctx, toS(v, CFG.phone), CFG.phone[2], s * .75, o.buzz || 0, t);
  chalk(ctx, v, o.chalk || 0);
  thread(ctx, v, o.thread || 0, o.taut || 0);
}
