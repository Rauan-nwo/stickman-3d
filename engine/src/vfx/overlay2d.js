// overlay2d.js: 2D-графика поверх кадра (слой [4], вызывать в over сцены).
//   chalkCounter(ctx, stage, { items: [{ text, t0, x, y, size, rot }], t })  — рукописные меловые числа «38 39 40 41»:
//       каждое число пишется штрихами за dur секунд после своего t0 (единственная графика на кадре, как «10 FT» в эталоне)
//   spyglassMask(ctx, stage, { r, cx, cy, open })   — круглый кадр подзорной трубы: тёмное поле, кромка линзы, блик
//   spyglassThrough(ctx, stage, k, { cx, cy, r0, r }) — пролёт «сквозь линзу»: k 0..0.5 — тёмная линза растёт из точки (cx, cy)
//       и закрывает кадр (уходящая сцена), k 0.5..1 — круг раскрывается до r (приходящая сцена)
import { rng } from '../core/rng.js';
import { clamp, smooth, E } from '../core/ease.js';

// цифры одним-двумя штрихами в клетке 0..1 x 0..1.5 (y вниз), рука с наклоном
const G = {
  0: [[[.5, .05], [.2, .25], [.12, .75], [.3, 1.35], [.6, 1.42], [.85, 1.0], [.86, .45], [.66, .08], [.42, .1]]],
  1: [[[.2, .45], [.55, .06], [.5, 1.44]]],
  2: [[[.14, .38], [.3, .1], [.62, .06], [.82, .32], [.66, .7], [.12, 1.42], [.9, 1.36]]],
  3: [[[.16, .2], [.5, .05], [.8, .28], [.5, .68], [.84, .98], [.6, 1.4], [.14, 1.26]]],
  4: [[[.62, .06], [.1, .98], [.92, .94]], [[.66, .5], [.62, 1.45]]],
  5: [[[.82, .08], [.26, .1], [.18, .66], [.56, .58], [.86, .9], [.66, 1.38], [.14, 1.3]]],
  6: [[[.76, .08], [.36, .4], [.16, .95], [.36, 1.4], [.72, 1.3], [.8, .92], [.5, .72], [.2, .96]]],
  7: [[[.12, .12], [.88, .08], [.4, 1.45]], [[.3, .74], [.78, .7]]],
  8: [[[.52, .68], [.22, .36], [.5, .05], [.8, .34], [.52, .68], [.16, 1.08], [.5, 1.42], [.84, 1.06], [.52, .68]]],
  9: [[[.82, .42], [.52, .7], [.2, .42], [.5, .06], [.82, .36], [.74, 1.0], [.4, 1.44]]],
  '-': [[[.2, .78], [.8, .74]]],
};
const strokeLen = s => { let l = 0; for (let i = 1; i < s.length; i++) l += Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]); return l; };
// точка на ломаной со сглаживанием Catmull-Rom
function along(s, d) {
  let i = 1; while (i < s.length - 1) { const l = Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]); if (d <= l) break; d -= l; i++; }
  const a = s[i - 1], b = s[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, k = clamp(d / l), p0 = s[Math.max(0, i - 2)], p3 = s[Math.min(s.length - 1, i + 1)];
  const cr = (v0, v1, v2, v3) => .5 * ((2 * v1) + (-v0 + v2) * k + (2 * v0 - 5 * v1 + 4 * v2 - v3) * k * k + (-v0 + 3 * v1 - 3 * v2 + v3) * k * k * k);
  return [cr(p0[0], a[0], b[0], p3[0]), cr(p0[1], a[1], b[1], p3[1])];
}
export function chalkCounter(ctx, stage, { items, t, dur = .22, color = '250,246,236', underline = false } = {}) {
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const it of items) {
    const age = t - it.t0; if (age < 0) continue;
    const size = it.size || 120, chars = String(it.text).split(''), adv = size * .82, W = adv * chars.length, k = clamp(age / (it.dur || dur)), fade = it.hold ? 1 - smooth((age - it.hold) / .25) : 1;
    if (fade <= 0) continue;
    ctx.save(); ctx.translate(it.x, it.y); ctx.rotate(it.rot ?? -.07); ctx.transform(1, 0, -.16, 1, 0, 0); ctx.translate(-W / 2, -size * .75);
    const strokes = []; chars.forEach((c, ci) => (G[c] || []).forEach(s => strokes.push({ s, ox: ci * adv, len: strokeLen(s) })));
    if (underline || it.underline) strokes.push({ s: [[-.1, 1.72], [chars.length * .82 + .05, 1.64]], ox: 0, len: chars.length * .82 + .15 });
    const total = strokes.reduce((a, s) => a + s.len, 0); let budget = total * E.outCubic(k);
    const r = rng((it.seed || 1) * 131 + chars.length);
    for (const st of strokes) {
      const draw = Math.min(st.len, budget); budget -= draw; if (draw <= 0) { for (let j = 0; j < 3; j++) r(); continue; }
      // мел: три полупрозрачных прохода со смещением + «крошка» — линия неровная, местами рвётся
      for (let pass = 0; pass < 3; pass++) {
        const jx = (r() - .5) * size * .02, jy = (r() - .5) * size * .02;
        ctx.strokeStyle = `rgba(${color},${(.5 * fade).toFixed(3)})`; ctx.lineWidth = size * (.06 - pass * .012); ctx.beginPath();
        const n = Math.max(2, Math.ceil(draw * 26));
        for (let j = 0; j <= n; j++) { const p = along(st.s, draw * j / n); const x = st.ox + p[0] * size * .7 + jx, y = p[1] * size * .62 + jy; if (j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
        ctx.stroke();
      }
      const rr = rng(Math.round(st.len * 977) + (it.seed || 1)); ctx.fillStyle = `rgba(${color},${(.55 * fade).toFixed(3)})`;
      for (let j = 0; j < 26 * draw; j++) { const p = along(st.s, draw * rr()); ctx.fillRect(st.ox + p[0] * size * .7 + (rr() - .5) * size * .1, p[1] * size * .62 + (rr() - .5) * size * .1, 1.6, 1.6); }
    }
    ctx.restore();
  }
  ctx.restore();
}

export function spyglassMask(ctx, stage, { r, cx, cy, open = 1, color = '10,8,8', edge = 1 } = {}) {
  const { W, H } = stage; cx = cx ?? W / 2; cy = cy ?? H * .46; const R = (r ?? W * .46) * open;
  ctx.save();
  ctx.fillStyle = `rgb(${color})`; ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.arc(cx, cy, Math.max(.01, R), 0, Math.PI * 2, true); ctx.fill('evenodd');
  if (R > 2) {
    const g = ctx.createRadialGradient(cx, cy, R * .62, cx, cy, R); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.8, 'rgba(8,10,20,.22)'); g.addColorStop(.965, 'rgba(6,6,12,.78)'); g.addColorStop(1, `rgba(${color},1)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.3); ctx.fill();
    ctx.lineWidth = Math.max(2, R * .012); ctx.strokeStyle = `rgba(150,190,255,${(.3 * edge).toFixed(3)})`; ctx.beginPath(); ctx.arc(cx, cy, R * .972, 0, 6.3); ctx.stroke();      // холодная кромка линзы
    ctx.strokeStyle = `rgba(255,214,150,${(.2 * edge).toFixed(3)})`; ctx.beginPath(); ctx.arc(cx, cy, R * .988, 0, 6.3); ctx.stroke();
    ctx.lineWidth = R * .035; ctx.lineCap = 'round'; ctx.strokeStyle = `rgba(255,255,255,${(.1 * edge).toFixed(3)})`; ctx.beginPath(); ctx.arc(cx, cy, R * .9, -2.5, -1.9); ctx.stroke();   // блик на стекле
    ctx.lineWidth = Math.max(3, R * .03); ctx.strokeStyle = 'rgba(196,150,62,.9)'; ctx.beginPath(); ctx.arc(cx, cy, R * 1.016, 0, 6.3); ctx.stroke();                                 // латунное кольцо
  }
  ctx.restore();
}
export function spyglassThrough(ctx, stage, k, { cx, cy, r0 = 26, r, color = '10,8,8' } = {}) {
  const { W, H } = stage; k = clamp(k);
  if (k < .5) {                                                   // линза летит на камеру: тёмный диск с бликом вырастает из (cx, cy)
    const a = E.inCubic(k / .5), x = (cx ?? W / 2) + (W / 2 - (cx ?? W / 2)) * a, y = (cy ?? H / 2) + (H * .46 - (cy ?? H / 2)) * a, R = r0 + (Math.hypot(W, H) * .75 - r0) * a;
    ctx.save(); const g = ctx.createRadialGradient(x - R * .25, y - R * .3, R * .05, x, y, R); g.addColorStop(0, 'rgba(60,84,120,.95)'); g.addColorStop(.5, 'rgba(18,22,34,.97)'); g.addColorStop(1, `rgba(${color},1)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R, 0, 6.3); ctx.fill();
    ctx.lineWidth = Math.max(3, R * .05); ctx.strokeStyle = 'rgba(196,150,62,.95)'; ctx.beginPath(); ctx.arc(x, y, R, 0, 6.3); ctx.stroke();
    ctx.lineWidth = R * .05; ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.beginPath(); ctx.arc(x, y, R * .8, -2.5, -1.8); ctx.stroke(); ctx.restore();
  } else spyglassMask(ctx, stage, { r, open: E.outBack((k - .5) / .5, 1.2), color });
}
// во сколько раз «приближает» труба на этапе раскрытия: множитель fov для камеры приходящей сцены (1.6 -> 1)
export const lensZoom = k => 1 + .6 * (1 - E.outCubic(clamp((k - .5) / .5)));
