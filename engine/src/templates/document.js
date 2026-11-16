// templates/document.js: документ на столе (вид сверху) — тёмные доски, зелёное сукно, лампа сверху-слева, ночь справа.
//   documentShot(ctx, t, { title, fields, lines, highlight, stamp, slideIn, stampAt, hlAt, hlStep })
//     fields     [['TO', 'SECRETARY'], ...]  — шапка служебки
//     lines      ['текст', 'текст [[скрыто]] текст', ...] — [[...]] рисуется чёрной плашкой (вымарано)
//     highlight  [индексы строк] — янтарный маркер проходит по ним по очереди с hlAt через hlStep с
//     org, sign  строка над заголовком и подпись внизу (необязательно)
//     stamp      'TOP SECRET' | null — событие: штамп бьёт в stampAt (удар, толчок бумаги)
import { clamp, lerp, E } from '../core/ease.js';
import { rng } from '../core/rng.js';
import { NOIR, FONT, dims, camPush, kick, vignette, grain, motes, lampPool, coldShade, deskTexture, paperTexture, scratch, hashS } from './noir.js';

function redactedLine(ctx, s, x, y, size) {
  let cx = x;
  for (const part of s.split(/(\[\[.*?\]\])/)) {
    if (!part) continue;
    if (part.startsWith('[[')) { const w = ctx.measureText(part.slice(2, -2)).width; ctx.fillStyle = '#121014'; ctx.fillRect(cx, y - size * .78, w, size * .98); cx += w; ctx.fillStyle = '#231a14'; }
    else { ctx.fillText(part, cx, y); cx += ctx.measureText(part).width; }
  }
  return cx - x;
}
// штамп: двойная рамка, буквы с разрядкой, «непрокрасы» (дыры по шуму), рисуется в черновик
function stampLayer(text, seed) {
  const w = 660, h = 170, [c, x] = scratch('stamp', w, h), col = '#c22a24';
  x.strokeStyle = col; x.lineWidth = 9; x.strokeRect(8, 8, w - 16, h - 16); x.lineWidth = 4; x.strokeRect(24, 24, w - 48, h - 48);
  x.font = `900 92px ${FONT.label}`; x.letterSpacing = '10px'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = col; x.fillText(text, w / 2 + 5, h / 2 + 6);
  const r = rng(seed); x.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 900; i++) { x.globalAlpha = .25 + r() * .75; x.beginPath(); x.arc(r() * w, r() * h, .8 + r() * 3.2, 0, 6.283); x.fill(); }
  x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
  return c;
}

export function documentShot(ctx, t, o = {}) {
  const [W, H] = dims(ctx, o);
  const { title = 'MEMORANDUM', org = '', sign = '', fields = [], lines = [], highlight = [], stamp = 'TOP SECRET', dur = 3, slideIn = .7, stampAt = 1.0, hlAt = 1.45, hlStep = .42, size = 30, seed = hashS(title + lines.join()) } = o;
  const pw = 820, ph = 1060, px = W * .5, py = H * .56;
  ctx.save();
  // камера: наезд к первой выделенной строке
  const lh = size * 1.6, top = py - ph / 2, l0y = top + 330 + (fields.length) * lh;
  const hy = highlight.length ? l0y + highlight[0] * lh : py;
  camPush(ctx, W, H, t, { dur, from: 1.0, to: 1.12, fx: px, fy: Math.min(hy, H * .75), drift: 3, seed });
  const sk = kick(t, stampAt, 6); ctx.translate(sk * .3, sk * .5);
  // стол: доски + сукно, ручка, круг от кружки
  ctx.drawImage(deskTexture(W, H), -100, -100);
  ctx.fillStyle = 'rgba(4,6,16,.5)'; ctx.fillRect(W * .2 + 14, -20, W * .6, H + 60);
  ctx.fillStyle = NOIR.green; ctx.fillRect(W * .2, -40, W * .6, H + 80); ctx.lineWidth = 5; ctx.strokeStyle = NOIR.ink; ctx.strokeRect(W * .2, -40, W * .6, H + 80);
  ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(W * .2 + 16, -40, 4, H + 80); ctx.fillRect(W * .8 - 20, -40, 4, H + 80);
  ctx.strokeStyle = 'rgba(70,40,20,.55)'; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(W * .14, H * .74, 70, .3, 5.6); ctx.stroke();   // след кружки
  ctx.save(); ctx.translate(W * .87, H * .42); ctx.rotate(-.9);                                                                       // перьевая ручка
  ctx.fillStyle = 'rgba(4,6,16,.5)'; ctx.fillRect(-150 + 10, -10 + 14, 300, 22);
  ctx.fillStyle = '#121016'; ctx.strokeStyle = NOIR.ink; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(-150, -11, 260, 22, 10); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#c9a24a'; ctx.fillRect(40, -11, 14, 22); ctx.beginPath(); ctx.moveTo(110, -9); ctx.lineTo(150, 0); ctx.lineTo(110, 9); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(-140, -7, 170, 4); ctx.restore();
  // документ въезжает снизу-справа, поворот доводится; после штампа чуть вздрагивает
  const k = E.outCubic(clamp(t / slideIn)), rot = lerp(.22, -.025, k) + (t > stampAt ? -.006 * Math.exp(-(t - stampAt) * 8) * Math.sin((t - stampAt) * 40) : 0);
  const ox = lerp(W * .45, 0, k), oy = lerp(H * .7, 0, k);
  ctx.save(); ctx.translate(px + ox, py + oy); ctx.rotate(rot); ctx.translate(-pw / 2, -ph / 2);
  ctx.fillStyle = 'rgba(4,6,16,.55)'; ctx.fillRect(16, 22, pw, ph);                                          // жёсткая тень
  ctx.drawImage(paperTexture(pw, ph, seed % 97), 0, 0); ctx.lineWidth = 5; ctx.strokeStyle = NOIR.ink; ctx.strokeRect(0, 0, pw, ph);
  ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.fillRect(pw * .5 - 1, 0, 3, ph);                                     // сгиб
  // шапка
  ctx.fillStyle = '#231a14'; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'center';
  ctx.font = `bold 26px ${FONT.type}`; ctx.letterSpacing = '6px'; if (org) ctx.fillText(org, pw / 2, 90);
  ctx.font = `bold 60px ${FONT.type}`; ctx.letterSpacing = '10px'; ctx.fillText(title, pw / 2, 170); ctx.letterSpacing = '0px';
  ctx.fillRect(60, 200, pw - 120, 4); ctx.fillRect(60, 210, pw - 120, 1.5);
  ctx.textAlign = 'left'; ctx.font = `bold ${size}px ${FONT.type}`;
  fields.forEach(([a, b], i) => { const y = 270 + i * lh; ctx.fillText(a + ':', 70, y); ctx.fillText(b, 230, y); });
  // строки + маркер (multiply — как настоящий маркер по бумаге)
  lines.forEach((s, i) => {
    const y = 330 + (fields.length) * lh + i * lh, hi = highlight.indexOf(i);
    if (hi >= 0) {
      const hk = E.inOutSine(clamp((t - hlAt - hi * hlStep) / .38));
      if (hk > 0) {
        const w = redactedLine({ measureText: x => ctx.measureText(x), fillRect() {}, fillText() {} }, s, 0, 0, size);
        ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = 'rgba(247,190,60,.85)';
        ctx.beginPath(); ctx.moveTo(62, y - size * .85); ctx.lineTo(62 + (w + 18) * hk, y - size * .9); ctx.lineTo(62 + (w + 18) * hk, y + size * .25); ctx.lineTo(62, y + size * .3); ctx.closePath(); ctx.fill(); ctx.restore();
      }
    }
    ctx.fillStyle = '#231a14'; redactedLine(ctx, s, 70, y, size);
  });
  // подпись внизу
  if (sign) { ctx.font = `38px ${FONT.hand}`; ctx.fillStyle = '#1b2a5a'; ctx.fillText(sign, pw - 300, ph - 90); }
  // событие: штамп
  if (stamp && t >= stampAt - .1) {
    const sk2 = clamp((t - stampAt + .1) / .1), sc = lerp(1.9, 1, E.inCubic(sk2)), a = sk2 >= 1 ? .9 : .35 * sk2;
    const st = stampLayer(stamp, seed);
    ctx.save(); ctx.translate(pw * .6, ph - 210); ctx.rotate(-.14); ctx.scale(sc, sc); ctx.globalAlpha = a; ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(st, -st.width / 2, -st.height / 2); ctx.restore();
  }
  // cel-свет на бумаге: тёплый верх-лево, холодная тень низ-право
  const g = ctx.createLinearGradient(0, 0, pw, ph); g.addColorStop(0, 'rgba(255,212,138,.14)'); g.addColorStop(.55, 'rgba(255,212,138,0)'); g.addColorStop(1, 'rgba(20,32,70,.3)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, pw, ph);
  ctx.restore();
  lampPool(ctx, W * .3, H * .05, H * 1.1, 1.2); coldShade(ctx, W, H, .8);
  ctx.restore();
  motes(ctx, W, H, t, { n: 30, x0: 0, x1: W * .6, k: .22, seed });
  vignette(ctx, W, H, .62); grain(ctx, W, H, t, .08);
}
