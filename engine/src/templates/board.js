// templates/board.js: доска расследования — пробка в деревянной раме на тёмной стене, лампа сверху-слева.
//   board(ctx, t, { items, strings, circle, focus })
//     items   [{ id, kind: 'photo'|'note'|'label', x, y, w, h, rot, title, lines, draw(ctx, w, h, t) }]
//             x, y — центр в пикселях кадра; photo.draw — свой рисунок в окне снимка (голова героя и т.п.),
//             без draw — силуэт-заглушка; note.lines — строки текста; label.title — надпись на полоске
//     strings [{ from: id, to: id, t0, t1 }]  — красная нитка натягивается от кнопки к кнопке
//             [{ from: id, loose: true, len, angle, sway, freq, t0, t1 }] — свободная нитка: висит от кнопки from
//             (или от точки at: [x, y]), второй конец не привязан и чуть качается; angle — наклон от вертикали (рад),
//             sway — размах качания (рад); с t0 нитка «разматывается» за t0..t1
//     circle  { id, t0, dur, pad }            — событие: красный маркер обводит предмет
//     focus   [x, y] | id                     — куда наезжает камера (по умолчанию — на обведённый предмет)
import { clamp, lerp, E } from '../core/ease.js';
import { NOIR, FONT, dims, camPush, vignette, grain, motes, lampPool, coldShade, corkTexture, paperTexture, pushPin, partial, polyline, marker, scribbleEllipse, rrect, hashS } from './noir.js';

// кнопка: по центру верхней кромки (у полоски-надписи — на самой кромке, чтобы не закрывать буквы); it.pin — сдвиг
const pinOf = it => [it.x + (it.pin?.[0] ?? 0), it.y - it.h / 2 + (it.kind === 'label' ? 4 : 14) + (it.pin?.[1] ?? 0)];

function silhouette(ctx, w, h) {
  ctx.fillStyle = '#121a30'; ctx.beginPath(); ctx.arc(w / 2, h * .42, w * .2, 0, 6.283); ctx.fill();
  ctx.beginPath(); ctx.ellipse(w / 2, h * 1.02, w * .42, h * .36, 0, Math.PI, 0); ctx.fill();
}
function drawItem(ctx, it, t) {
  const { w, h } = it;
  ctx.save(); ctx.translate(it.x, it.y); ctx.rotate(it.rot || 0); ctx.translate(-w / 2, -h / 2);
  ctx.fillStyle = 'rgba(4,6,16,.55)'; ctx.fillRect(12, 16, w, h);                                       // жёсткая тень (свет сверху-слева)
  if (it.kind === 'photo') {
    const m = w * .07, ih = h - m - w * .2;
    ctx.drawImage(paperTexture(Math.round(w), Math.round(h), hashS(it.id)), 0, 0); ctx.lineWidth = 4; ctx.strokeStyle = NOIR.ink; ctx.strokeRect(0, 0, w, h);
    ctx.save(); ctx.translate(m, m); ctx.beginPath(); ctx.rect(0, 0, w - 2 * m, ih); ctx.clip();
    const g = ctx.createLinearGradient(0, 0, 0, ih); g.addColorStop(0, '#2c3c5e'); g.addColorStop(1, '#141c30'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, ih);
    if (it.draw) it.draw(ctx, w - 2 * m, ih, t); else silhouette(ctx, w - 2 * m, ih);
    ctx.fillStyle = 'rgba(255,212,138,.1)'; ctx.fillRect(0, 0, w, ih * .35);                               // блик лампы на глянце
    ctx.restore(); ctx.lineWidth = 3; ctx.strokeStyle = NOIR.ink; ctx.strokeRect(m, m, w - 2 * m, ih);
    if (it.title) { ctx.font = `bold ${Math.round(w * .085)}px ${FONT.hand}`; ctx.fillStyle = '#2a1e18'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(it.title, w / 2, h - w * .1); }
  } else if (it.kind === 'note') {
    ctx.drawImage(paperTexture(Math.round(w), Math.round(h), hashS(it.id)), 0, 0); ctx.lineWidth = 4; ctx.strokeStyle = NOIR.ink; ctx.strokeRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(70,90,140,.35)'; ctx.lineWidth = 2; for (let y = 64; y < h - 10; y += 34) { ctx.beginPath(); ctx.moveTo(14, y); ctx.lineTo(w - 14, y); ctx.stroke(); }
    ctx.font = `bold ${it.size || 26}px ${FONT.type}`; ctx.fillStyle = '#231a14'; ctx.textBaseline = 'alphabetic';
    if (it.title) { ctx.font = `bold ${(it.size || 26) * 1.1}px ${FONT.type}`; ctx.fillText(it.title, 18, 46); ctx.font = `bold ${it.size || 26}px ${FONT.type}`; }
    (it.lines || []).forEach((ln, i) => ctx.fillText(ln, 18, 92 + i * 34));
  } else {                                                                                                  // полоска-надпись
    ctx.fillStyle = it.color || NOIR.paper; ctx.fillRect(0, 0, w, h); ctx.lineWidth = 4; ctx.strokeStyle = NOIR.ink; ctx.strokeRect(0, 0, w, h);
    ctx.font = `bold ${it.size || Math.round(h * .5)}px ${FONT.type}`; ctx.letterSpacing = '4px'; ctx.fillStyle = it.ink || '#1d1512'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(it.title || '', w / 2 + 2, h / 2 + 2); ctx.letterSpacing = '0px';
  }
  // cel: тёплый свет с верх-левой кромки, холодная тень к низ-правой
  const sh = ctx.createLinearGradient(0, 0, w, h); sh.addColorStop(0, 'rgba(255,212,138,.12)'); sh.addColorStop(.6, 'rgba(255,212,138,0)'); sh.addColorStop(.6, 'rgba(20,32,70,.0)'); sh.addColorStop(1, 'rgba(20,32,70,.28)');
  ctx.fillStyle = sh; ctx.fillRect(0, 0, w, h);
  ctx.restore();
}
// нитка: провисающая кривая от кнопки к кнопке, дорисовывается от начала
function stringPts(a, b) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]), sag = L * .08, pts = [];
  for (let i = 0; i <= 40; i++) { const k = i / 40; pts.push([lerp(a[0], b[0], k), lerp(a[1], b[1], k) + Math.sin(k * Math.PI) * sag]); }
  return pts;
}
// свободная нитка: висит от кнопки, второй конец свободен; угол от вертикали тает к концу (тяжесть), чуть качается
function loosePts(a, t, s, k) {
  const n = 30, len = (s.len ?? 300) * k, ang = s.angle ?? .35, sway = s.sway ?? .07, w = 6.283 * (s.freq ?? .45), ph = s.phase ?? 0, pts = [[a[0], a[1]]];
  let x = a[0], y = a[1];
  for (let i = 1; i <= n; i++) {
    const u = i / n, th = ang * (1 - .75 * u) + sway * Math.sin(w * t + ph - u * 1.9) * (.35 + .65 * u);
    x += Math.sin(th) * len / n; y += Math.cos(th) * len / n; pts.push([x, y]);
  }
  return pts;
}
function drawString(ctx, pts) {
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.save(); ctx.translate(8, 12); polyline(ctx, pts); ctx.strokeStyle = 'rgba(4,6,16,.45)'; ctx.lineWidth = 5; ctx.stroke(); ctx.restore();
  polyline(ctx, pts); ctx.strokeStyle = '#4a0c0a'; ctx.lineWidth = 7; ctx.stroke();
  polyline(ctx, pts); ctx.strokeStyle = NOIR.red; ctx.lineWidth = 4.5; ctx.stroke();
  ctx.translate(-1, -1.2); polyline(ctx, pts); ctx.strokeStyle = 'rgba(255,150,130,.55)'; ctx.lineWidth = 1.4; ctx.stroke();
  ctx.restore();
}

export function board(ctx, t, o = {}) {
  const [W, H] = dims(ctx, o);
  const { items = [], strings = [], circle = null, dur = 3, frame = [150, 70, W - 300, H - 140], seed = 4 } = o;
  const byId = Object.fromEntries(items.map(i => [i.id, i]));
  const ft = o.focus ?? circle?.id, fp = Array.isArray(ft) ? ft : byId[ft] ? [byId[ft].x, byId[ft].y] : [W / 2, H / 2];
  ctx.save();
  camPush(ctx, W, H, t, { dur, from: 1.0, to: 1.14, fx: fp[0], fy: fp[1], drift: 3, seed });
  // стена: тёмные деревянные панели (как в кабинетах на фонах)
  ctx.fillStyle = '#1f130d'; ctx.fillRect(-100, -100, W + 200, H + 200);
  for (let x = -100; x < W + 100; x += 140) { ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(x, -100, 6, H + 200); ctx.fillStyle = 'rgba(255,190,120,.04)'; ctx.fillRect(x + 6, -100, 3, H + 200); }
  // рама и пробка
  const [bx, by, bw, bh] = frame;
  ctx.fillStyle = 'rgba(4,6,16,.6)'; ctx.fillRect(bx + 18, by + 22, bw, bh);
  ctx.fillStyle = '#4a2a18'; ctx.fillRect(bx - 26, by - 26, bw + 52, bh + 52); ctx.lineWidth = 5; ctx.strokeStyle = NOIR.ink; ctx.strokeRect(bx - 26, by - 26, bw + 52, bh + 52);
  ctx.fillStyle = '#6a4026'; ctx.fillRect(bx - 26, by - 26, bw + 52, 10); ctx.fillRect(bx - 26, by - 26, 10, bh + 52);   // освещённые кромки рамы
  ctx.drawImage(corkTexture(Math.round(bw), Math.round(bh), seed), bx, by); ctx.lineWidth = 4; ctx.strokeRect(bx, by, bw, bh);
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(bx, by, bw, 14); ctx.fillRect(bx, by, 12, bh);                       // тень рамы на пробке
  for (const it of items) drawItem(ctx, it, t);
  // нитки
  for (const s of strings) {
    if (s.loose || s.to == null) {                                        // свободная нитка: привязана одним концом
      const A = byId[s.from], a = A ? pinOf(A) : s.at; if (!a) continue;
      const k = s.t0 == null ? 1 : E.outCubic(clamp((t - s.t0) / ((s.t1 ?? s.t0 + .5) - s.t0))); if (k <= 0) continue;
      const pts = loosePts(a, t, s, k), tip = pts[pts.length - 1];
      drawString(ctx, pts);
      ctx.fillStyle = '#4a0c0a'; ctx.beginPath(); ctx.arc(tip[0], tip[1], 5.5, 0, 6.283); ctx.fill();   // узелок на конце
      ctx.fillStyle = NOIR.red; ctx.beginPath(); ctx.arc(tip[0] - .8, tip[1] - .8, 3.6, 0, 6.283); ctx.fill();
      continue;
    }
    const A = byId[s.from], B = byId[s.to]; if (!A || !B) continue;
    const k = E.inOutSine(clamp((t - s.t0) / ((s.t1 ?? s.t0 + .7) - s.t0))); if (k <= 0) continue;
    const pts = partial(stringPts(pinOf(A), pinOf(B)), k), tip = pts[pts.length - 1];
    drawString(ctx, pts);
    if (k < 1) { ctx.fillStyle = NOIR.red; ctx.beginPath(); ctx.arc(tip[0], tip[1], 5, 0, 6.283); ctx.fill(); }
  }
  for (const it of items) if (it.pinned !== false) pushPin(ctx, ...pinOf(it), { color: it.pinColor || NOIR.red });
  // событие: красная обводка маркером
  if (circle && byId[circle.id]) {
    const it = byId[circle.id], k = E.inOutCubic(clamp((t - circle.t0) / (circle.dur || .7))), pad = circle.pad ?? 40;
    if (k > 0) marker(ctx, partial(scribbleEllipse(it.x, it.y, it.w / 2 + pad, it.h / 2 + pad, { seed: 7 }), k), { w: 10 });
  }
  lampPool(ctx, W * .3, -H * .05, H * 1.15, 1.25); coldShade(ctx, W, H, .75);
  ctx.restore();
  motes(ctx, W, H, t, { n: 34, x0: 0, x1: W * .7, k: .28, seed });
  vignette(ctx, W, H, .62); grain(ctx, W, H, t, .08);
}
