// ГОТОВО: T-joke гл. 4–5 — книга через окно соседа (D06-A, #139–140) и пекарня с мешками муки (D07-A, #184). Владелец — рабочий A.
// staging/jokes_A.js — плоские заставки-аналогии: рисованный фасад ночью (плоские заливки, контур туши), наши герои целиком или по пояс в окне.
// Координаты — «сцена» 1920×1080 (как плейт), кадр v = { cx, cy, k } (toS из common.js). Рисуются поверх шаблона ядра (OVER главы).
import { clamp, lerp, E, ell } from 'engine';
import { W, H, toS } from './common.js';
import { pose, drawP, handS, person, shadeOf } from '../chars_A.js';
import * as PA from '../props_A.js';

const INK = '#141014';
const rect = (ctx, v, x0, y0, x1, y1, fill, lw = 8) => { const a = toS(v, [x0, y0]), b = toS(v, [x1, y1]); ctx.beginPath(); ctx.rect(a[0], a[1], b[0] - a[0], b[1] - a[1]); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (lw) { ctx.lineWidth = lw * v.k * .5; ctx.strokeStyle = INK; ctx.stroke(); } };
const WIN = [620, 230, 1300, 760];                      // окно соседа (сцена)
// фасад ночью: стена, кирпичи, окно с тёплым светом и полкой; inside(ctx) — что в комнате (до рамы)
export function house(ctx, v, t, inside) {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1a2034'); g.addColorStop(1, '#0c0f1a'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  rect(ctx, v, -400, 120, 2320, 1300, '#3a2a2a', 0);
  ctx.save(); ctx.globalAlpha = .35; for (let r = 0; r < 26; r++) for (let c = -2; c < 30; c++) { const x = c * 90 + (r % 2) * 45, y = 120 + r * 44; rect(ctx, v, x, y, x + 86, y + 40, null, 3); } ctx.restore();
  const [x0, y0, x1, y1] = WIN;
  rect(ctx, v, x0, y0, x1, y1, '#e8a85a', 0);
  const a = toS(v, [x0, y0]), b = toS(v, [x1, y1]); const rg = ctx.createRadialGradient((a[0] + b[0]) / 2, a[1], 0, (a[0] + b[0]) / 2, a[1], (b[0] - a[0])); rg.addColorStop(0, 'rgba(255,230,170,.9)'); rg.addColorStop(1, 'rgba(160,90,40,.0)'); ctx.fillStyle = rg; ctx.fillRect(a[0], a[1], b[0] - a[0], b[1] - a[1]);
  rect(ctx, v, x0 + 20, y0 + 300, x1 - 20, y0 + 318, '#6a4020', 4);                        // полка в комнате
  ctx.save(); ctx.beginPath(); ctx.rect(a[0], a[1], b[0] - a[0], b[1] - a[1]); ctx.clip(); if (inside) inside(ctx); ctx.restore();
  rect(ctx, v, x0, y0, x1, y1, null, 22); rect(ctx, v, (x0 + x1) / 2 - 8, y0, (x0 + x1) / 2 + 8, y1, '#2a1a12', 6);
  rect(ctx, v, x0 - 40, y1, x1 + 40, y1 + 40, '#5a4030', 8);                                  // подоконник снаружи
  ctx.save(); ctx.globalAlpha = .12; ctx.fillStyle = '#fff'; const p = toS(v, [x0 + 40, y0 + 20]), q = toS(v, [x0 + 200, y0 + 20]), r2 = toS(v, [x0 + 40, y0 + 320]); ctx.beginPath(); ctx.moveTo(...p); ctx.lineTo(...q); ctx.lineTo(...r2); ctx.fill(); ctx.restore();   // блик стекла
}
// книга: центр, ширина, поворот; lock 0..1 — замок защёлкнут; open — раскрыта (страница к стеклу)
export function book(ctx, x, y, w, a = 0, { lock = 0, open = 0, lit = 0 } = {}) {
  const h = w * 1.35; ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  if (open > .5) { PA.rrect(ctx, -w, -h / 2, w * 2, h, w * .04, '#F4EFE2', INK, w * .04); PA.inkLine(ctx, [[0, -h / 2], [0, h / 2]], w * .03, '#8a7a5a');
    for (let i = 0; i < 9; i++) for (const sd of [-1, 1]) { ctx.fillStyle = 'rgba(40,40,60,.45)'; ctx.fillRect(sd > 0 ? w * .12 : -w * .88, -h * .38 + i * h * .085, w * (.6 + (i % 3) * .08), w * .035); }
    if (lit > .01) { ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = `rgba(255,250,200,${.6 * lit})`; ctx.beginPath(); ctx.ellipse(w * .4, 0, w * .8, h * .5, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore(); return; }
  PA.rrect(ctx, -w / 2, -h / 2, w, h, w * .06, '#b0282a', INK, w * .05); PA.rrect(ctx, -w / 2, -h / 2, w * .12, h, w * .02, '#7a1418', null);
  PA.rrect(ctx, -w * .28, -h * .3, w * .66, h * .2, w * .03, '#E8C86A', null); PA.inkLine(ctx, [[-w * .2, -h * .2], [w * .3, -h * .2]], w * .03, '#7a1418');
  if (lock > 0) { const k = lock < 1 ? 1 + (1 - lock) * .4 : 1, sh = (1 - Math.min(1, lock * 1.4)) * w * .25;   // навесной замок на ремешке через обложку
    PA.rrect(ctx, -w * .56, h * .02, w * 1.12, w * .14, w * .03, '#3a2a1a', INK, w * .03);
    ctx.save(); ctx.translate(w * .1, h * .1); ctx.scale(k, k); ctx.lineWidth = w * .07; ctx.strokeStyle = '#9aa0aa'; ctx.beginPath(); ctx.arc(0, -w * .1 - sh, w * .16, Math.PI, 0); ctx.stroke(); ctx.lineWidth = w * .02; ctx.strokeStyle = INK; ctx.stroke();
    PA.rrect(ctx, -w * .24, -w * .1, w * .48, w * .38, w * .05, '#D9B24A', INK, w * .03); ell(ctx, 0, w * .06, w * .05, w * .05, INK, null); ctx.restore(); }
  ctx.restore();
}
// банка для монет с надписью PER PAGE: низ-центр, ширина; coins — сколько монет внутри
export function jar(ctx, x, y, w, coins = 1) {
  const h = w * 1.2; ctx.save(); ctx.translate(x, y);
  for (let i = 0; i < coins; i++) { ell(ctx, (i % 3 - 1) * w * .22, -w * .1 - Math.floor(i / 3) * w * .1, w * .14, w * .06, '#E8C04A', INK, w * .02); }
  ctx.beginPath(); ctx.moveTo(-w / 2, -h); ctx.lineTo(-w * .46, -w * .05); ctx.quadraticCurveTo(0, w * .05, w * .46, -w * .05); ctx.lineTo(w / 2, -h); ctx.fillStyle = 'rgba(200,230,240,.25)'; ctx.fill(); ctx.lineWidth = w * .035; ctx.strokeStyle = INK; ctx.stroke();
  PA.rrect(ctx, -w * .42, -h * .62, w * .84, h * .3, w * .03, '#F2E8CC', INK, w * .02); PA.label(ctx, 'PER PAGE', 0, -h * .47, w * .14, '#1c140c', { weight: 900 });
  ctx.restore();
}
// мешок муки: низ-центр, ширина
export function sack(ctx, x, y, w, a = 0) {
  const h = w * 1.15; ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  ctx.beginPath(); ctx.moveTo(-w * .46, 0); ctx.quadraticCurveTo(-w * .58, -h * .5, -w * .38, -h * .9); ctx.lineTo(-w * .2, -h); ctx.lineTo(w * .2, -h); ctx.lineTo(w * .38, -h * .9); ctx.quadraticCurveTo(w * .58, -h * .5, w * .46, 0); ctx.closePath();
  ctx.fillStyle = PA.lg(ctx, -w / 2, 0, w / 2, 0, [[0, '#F2EAD6'], [1, '#C8BCA0']]); ctx.fill(); ctx.lineWidth = w * .04; ctx.strokeStyle = INK; ctx.stroke();
  PA.inkLine(ctx, [[-w * .22, -h * .92], [w * .22, -h * .92]], w * .04, '#8a6a42'); PA.label(ctx, 'FLOUR', 0, -h * .45, w * .2, '#5a3a18', { weight: 900 });
  ctx.restore();
}
// пекарня: фасад, вывеска, крошечная дверь; n — мешков (растёт), crowd — соседи заглядывают (0..1)
export function bakery(ctx, v, t, T, n, o = {}) {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1a2034'); g.addColorStop(1, '#0c0f1a'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  rect(ctx, v, -400, 960, 2320, 1400, '#2a2a30', 0);                                               // тротуар
  rect(ctx, v, 560, 260, 1360, 960, '#c89a6a', 8); rect(ctx, v, 520, 200, 1400, 270, '#7a2a24', 8);  // фасад, карниз
  rect(ctx, v, 700, 300, 1220, 380, '#141014', 6); { const p = toS(v, [960, 340]); PA.label(ctx, 'CORNER BAKERY', p[0], p[1], 46 * v.k, '#F2D48A', { weight: 900 }); }
  rect(ctx, v, 880, 700, 1040, 960, '#5a3620', 8); { const p = toS(v, [1015, 840]); ell(ctx, p[0], p[1], 8 * v.k, 8 * v.k, '#D9B24A', INK, 2); }   // крошечная дверь
  rect(ctx, v, 620, 460, 830, 660, '#e8b870', 8); rect(ctx, v, 1090, 460, 1300, 660, '#e8b870', 8);
  // мешки: ряды пирамидой от двери вверх до крыши
  let k = 0; for (let r = 0; r < 8 && k < n; r++) { const cnt = Math.max(1, 7 - Math.floor(r * .6)); for (let c = 0; c < cnt && k < n; c++, k++) { const x = 960 + (c - (cnt - 1) / 2) * 110, y = 965 - r * 92, P = toS(v, [x, y]); sack(ctx, P[0], P[1], 120 * v.k, Math.sin(k * 1.7) * .06); } }
  if (o.peek) for (const [C, x, f] of o.peek || []) person(ctx, C, v, t, T, { at: [x, 1000], fs: .52, f, keys: [[0, 'shock']], look: [f * .6, -.3 * o.crowd], shade: shadeOf([0, -1], '#ffc47a'), lean: f * .14 * o.crowd, solo: false });
}
export const window_ = WIN;
export { clamp, lerp, E };
