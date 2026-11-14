// glowTrail.js: световой шлейф за летящим предметом и слабые кольца-искажения вокруг него.
// Оба рисуются 2D в экранных координатах ПОД предметом (сам предмет идёт следующим, FG-проходом).
// x, y — экранная позиция предмета, w — его ширина в пикселях, H — высота кадра.
export function glowTrail(ctx, { x, y, w, H, alpha = 1, discs = [] }) {
  if (alpha <= 0) return;
  const y0 = y + w * .2, hb = yy => w * .42 + Math.max(0, yy - y0) * .2;
  ctx.save(); ctx.globalAlpha = alpha; ctx.filter = 'blur(7px)';
  const g = ctx.createLinearGradient(0, y0, 0, H + 40); g.addColorStop(0, 'rgba(255,214,120,.95)'); g.addColorStop(.12, 'rgba(250,170,62,.86)'); g.addColorStop(.5, 'rgba(238,140,44,.78)'); g.addColorStop(1, 'rgba(214,112,34,.7)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - hb(y0), y0); ctx.lineTo(x - hb(H + 40), H + 40); ctx.lineTo(x + hb(H + 40), H + 40); ctx.lineTo(x + hb(y0), y0); ctx.closePath(); ctx.fill();
  ctx.filter = 'blur(5px)'; ctx.globalCompositeOperation = 'lighter';
  const g2 = ctx.createLinearGradient(0, y0, 0, y0 + 330); g2.addColorStop(0, 'rgba(255,246,205,.95)'); g2.addColorStop(.35, 'rgba(255,214,130,.5)'); g2.addColorStop(1, 'rgba(255,170,60,0)');
  ctx.fillStyle = g2; ctx.beginPath(); ctx.moveTo(x - w * .2, y0 - 6); ctx.lineTo(x - w * .34, y0 + 330); ctx.lineTo(x + w * .34, y0 + 330); ctx.lineTo(x + w * .2, y0 - 6); ctx.closePath(); ctx.fill();
  ctx.restore();
  // яркие диски, сползающие по шлейфу к объективу; discs = фазы 0..1 (null = пропустить)
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.filter = 'blur(2px)';
  discs.forEach((ph, i) => {
    if (ph == null) return;
    const yy = y + w * .7 + ph * ph * 520, r = 12 + 9 * ph; if (yy > H + 30) return;
    const gg = ctx.createRadialGradient(x + (i ? 6 : -4), yy, 0, x, yy, r * 1.6); gg.addColorStop(0, 'rgba(255,240,170,.95)'); gg.addColorStop(.6, 'rgba(255,214,110,.75)'); gg.addColorStop(1, 'rgba(255,190,80,0)');
    ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(x, yy, r * 1.6, 0, 6.3); ctx.fill();
  });
  ctx.restore();
}

// расходящиеся кольца: ks — возрасты колец 0..1
export function shockRings(ctx, { x, y, w, ks, color = '#F2E2D0' }) {
  ctx.save(); ctx.filter = 'blur(3px)';
  for (const k of ks) {
    const r = w * 1.05 + k * 120, cy = y + w * .3 + k * 60;
    ctx.globalAlpha = (1 - k) * .26; ctx.strokeStyle = color; ctx.lineWidth = 9 + k * 8; ctx.beginPath(); ctx.arc(x, cy, r, 0, 6.3); ctx.stroke();
    ctx.globalAlpha = (1 - k) * .05; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, cy, r, 0, 6.3); ctx.fill();
  }
  ctx.restore();
}
