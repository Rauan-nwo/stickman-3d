// templates/cards.js: чёрная карточка с рукописной фразой и титул главы.
//   blackCard(ctx, t, { text, at, cps, size, underline, upper })   — фраза пишется буква за буквой маркером, чуть дрейфует;
//        событие: красное подчёркивание слова underline после того, как фраза дописана
//   chapterTitle(ctx, t, { label, title, at })                      — «CHAPTER 3» на пишмашинке, линейки расходятся,
//        название буквами снизу; событие: луч лампы проходит по названию
import { clamp, lerp, E, smooth } from '../core/ease.js';
import { NOIR, FONT, dims, camPush, vignette, grain, motes, writeLine, wrap, wobble, partial, marker, scratch, hashS } from './noir.js';

// фон карточки: почти чёрный с холодной глубиной и тёплым пятном сверху (как свет лампы за кадром)
function cardBg(ctx, W, H, t, { warm = .5 } = {}) {
  ctx.fillStyle = '#06060a'; ctx.fillRect(-80, -80, W + 160, H + 160);
  let g = ctx.createRadialGradient(W * .5, H * .52, 0, W * .5, H * .52, W * .62);
  g.addColorStop(0, 'rgba(34,44,74,.42)'); g.addColorStop(1, 'rgba(34,44,74,0)'); ctx.fillStyle = g; ctx.fillRect(-80, -80, W + 160, H + 160);
  g = ctx.createRadialGradient(W * .5, -H * .1, 0, W * .5, -H * .1, H * .9);
  g.addColorStop(0, `rgba(${NOIR.amberRGB},${(.16 * warm).toFixed(3)})`); g.addColorStop(1, `rgba(${NOIR.amberRGB},0)`); ctx.fillStyle = g; ctx.fillRect(-80, -80, W + 160, H + 160);
}

export function blackCard(ctx, t, o = {}) {
  const [W, H] = dims(ctx, o);
  const { text = '', dur = 3, at = .3, cps = 15, size = 84, font = FONT.hand, color = NOIR.cream, underline = null, upper = false,
    x = W / 2, y = H / 2, maxW = W * .72, lh = 1.25, bg = true, seed = hashS(text) } = o;
  const str = upper ? text.toUpperCase() : text;
  ctx.save();
  if (bg) { ctx.save(); camPush(ctx, W, H, t, { dur, to: 1.03, drift: 3, seed }); cardBg(ctx, W, H, t); ctx.restore(); motes(ctx, W, H, t, { n: 26, k: .22, seed }); }
  camPush(ctx, W, H, t, { dur, from: 1, to: 1.075, drift: 4, seed: seed % 7 });
  ctx.font = `${size}px ${font}`; ctx.textBaseline = 'middle';
  const lines = wrap(ctx, str, maxW), n = Math.max(0, (t - at) * cps);
  let used = 0, uPos = null;
  lines.forEach((ln, i) => {
    const ly = y + (i - (lines.length - 1) / 2) * size * lh, k = n - used;
    const ink = writeLine(ctx, ln, x, ly + Math.sin(t * .9 + i) * 1.5, k, { align: 'center', fill: color, glow: 'rgba(255,214,150,.18)' });
    if (underline) { const j = ln.indexOf(underline); if (j >= 0) { const a = ctx.measureText(ln.slice(0, j)).width, b = ctx.measureText(ln.slice(0, j + underline.length)).width; uPos = [ink.x0 + a, ink.x0 + b, ly + size * .48]; } }
    used += ln.length + 1;
  });
  // событие: красный маркер под словом, когда фраза дописана
  if (uPos) {
    const t0 = at + str.length / cps + .25, k = E.outCubic(clamp((t - t0) / .35));
    if (k > 0) { const [a, b, uy] = uPos, pts = wobble([[a - 10, uy + 4], [b + 14, uy - 4]], 3, seed, 10); marker(ctx, partial(pts, k), { w: size * .085 }); }
  }
  ctx.restore();
  vignette(ctx, W, H, .7); grain(ctx, W, H, t, .09);
}

export function chapterTitle(ctx, t, o = {}) {
  const [W, H] = dims(ctx, o);
  const { label = 'CHAPTER 1', title = '', dur = 3, at = .15, size = 132, font = FONT.display, sweepAt = 1.75, seed = hashS(title) } = o;
  ctx.save();
  ctx.save(); camPush(ctx, W, H, t, { dur, to: 1.03, drift: 3, seed }); cardBg(ctx, W, H, t, { warm: 1 });
  // конус света сверху: висящая лампа над названием
  const cone = ctx.createLinearGradient(0, -H * .1, 0, H * .8); cone.addColorStop(0, `rgba(${NOIR.lampRGB},.14)`); cone.addColorStop(1, `rgba(${NOIR.lampRGB},0)`);
  ctx.fillStyle = cone; ctx.beginPath(); ctx.moveTo(W * .44, -20); ctx.lineTo(W * .56, -20); ctx.lineTo(W * .82, H * .9); ctx.lineTo(W * .18, H * .9); ctx.closePath(); ctx.fill();
  ctx.restore();
  motes(ctx, W, H, t, { n: 46, x0: W * .22, x1: W * .78, k: .3, seed });
  camPush(ctx, W, H, t, { dur, from: 1, to: 1.06, drift: 3, seed: 2 });
  const cy = H * .5;
  // метка главы: пишмашинка, буквы набиваются, янтарные линейки расходятся от центра
  ctx.font = `bold 34px ${FONT.type}`; ctx.letterSpacing = '12px'; ctx.textBaseline = 'middle';
  const lw = ctx.measureText(label).width, nL = (t - at) * 26;
  writeLine(ctx, label, W / 2 + 6, cy - size * .82, nL, { align: 'center', fill: NOIR.amber });
  ctx.letterSpacing = '0px';
  const rk = E.outCubic(clamp((t - at - .1) / .8)), gap = lw / 2 + 40, len = 260 * rk;
  ctx.strokeStyle = NOIR.amber; ctx.lineWidth = 3; ctx.lineCap = 'round';
  for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(W / 2 + sd * gap, cy - size * .82); ctx.lineTo(W / 2 + sd * (gap + len), cy - size * .82); ctx.stroke(); }
  // название: буквы поднимаются и проявляются по очереди (кремовые, контур тушью, жёсткая синяя тень)
  const [c, x] = scratch('chapter', W, H);
  x.font = `600 ${size}px ${font}`; x.textBaseline = 'middle'; x.letterSpacing = '4px';
  const tw = x.measureText(title).width; let px = W / 2 - tw / 2;
  for (let i = 0; i < title.length; i++) {
    const ch = title[i], cw = x.measureText(ch).width, k = E.outCubic(clamp((t - at - .45 - i * .045) / .5));
    if (k > 0) {
      x.globalAlpha = k; const yy = cy + 34 * (1 - k);
      x.fillStyle = 'rgba(20,32,70,.9)'; x.fillText(ch, px + 6, yy + 7);                          // cel-тень
      x.lineJoin = 'round'; x.lineWidth = 8; x.strokeStyle = NOIR.ink; x.strokeText(ch, px, yy);
      x.fillStyle = NOIR.cream; x.fillText(ch, px, yy);
    }
    px += cw;                                                                    // measureText уже включает letterSpacing
  }
  x.globalAlpha = 1;
  // событие: тёплый блик лампы проходит по буквам слева направо
  const sk = clamp((t - sweepAt) / .9);
  if (sk > 0 && sk < 1) {
    const sx = lerp(W / 2 - tw / 2 - 200, W / 2 + tw / 2 + 200, E.inOutSine(sk)), g = x.createLinearGradient(sx - 140, 0, sx + 140, 0);
    g.addColorStop(0, 'rgba(255,190,90,0)'); g.addColorStop(.5, 'rgba(255,200,110,.85)'); g.addColorStop(1, 'rgba(255,190,90,0)');
    x.globalCompositeOperation = 'source-atop'; x.fillStyle = g; x.fillRect(0, 0, W, H); x.globalCompositeOperation = 'source-over';
  }
  ctx.drawImage(c, 0, 0);
  // тонкая линейка под названием дорисовывается после букв
  const uk = E.inOutCubic(clamp((t - at - .45 - title.length * .045) / .6));
  if (uk > 0) { ctx.strokeStyle = 'rgba(242,169,78,.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(W / 2 - tw * .3 * uk, cy + size * .62); ctx.lineTo(W / 2 + tw * .3 * uk, cy + size * .62); ctx.stroke(); }
  ctx.restore();
  vignette(ctx, W, H, .7); grain(ctx, W, H, t, .09);
}
