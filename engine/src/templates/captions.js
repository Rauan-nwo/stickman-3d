// templates/captions.js: плашка «имя — роль» и крупная цифра.
//   lowerThird(ctx, t, { name, role, x, y, at, out, point })   — плашка тушью с янтарными линейками выезжает слева,
//        роль набивается на пишмашинке; point: [x, y] — тонкая выноска к герою (как подписи у конкурента)
//   bigNumber(ctx, t, { from, to, label, at, countDur, strike })  — число отсчитывает от from к to
//        (в логарифме, если разница больше 20 раз: $33 MILLION -> $3 BILLION; 95% -> 0% — линейно);
//        событие: приземление — удар с отскоком, красная черта под числом, толчок камеры, старое значение зачёркнуто
import { clamp, lerp, E, spring } from '../core/ease.js';
import { NOIR, FONT, dims, camPush, kick, vignette, grain, motes, lampPool, coldShade, writeLine, wobble, partial, marker, hashS } from './noir.js';

export function lowerThird(ctx, t, o = {}) {
  const [W, H] = dims(ctx, o);
  const { name = '', role = '', x = 110, y = H - 210, at = 0, out = null, point = null, accent = NOIR.amber, nameSize = 50, roleSize = 28 } = o;
  const ti = t - at; if (ti <= 0) return;
  const kin = E.outCubic(clamp(ti / .55)), kout = out == null ? 0 : E.inCubic(clamp((t - out) / .4));
  if (kout >= 1) return;
  ctx.save();
  ctx.font = `700 ${nameSize}px ${FONT.label}`; ctx.letterSpacing = '5px';
  const nw = ctx.measureText(name.toUpperCase()).width;
  ctx.font = `bold ${roleSize}px ${FONT.type}`; ctx.letterSpacing = '3px';
  const rw = ctx.measureText(role.toUpperCase()).width;
  const pw = Math.max(nw, rw) + 120, ph = nameSize + roleSize + 62, dx = -60 * (1 - kin) - 80 * kout, slant = 34;
  ctx.globalAlpha = (1 - kout);
  ctx.translate(x + dx, y);
  // выноска к герою: тонкая линия тушью с кремовой серединой и точкой на конце
  if (point) {
    const pk = E.outCubic(clamp((ti - .35) / .45)), sx = pw - slant * .5, sy = 0, ex = point[0] - x - dx, ey = point[1] - y;
    if (pk > 0) {
      const px = lerp(sx, ex, pk), py = lerp(sy, ey, pk);
      ctx.lineCap = 'round'; ctx.strokeStyle = NOIR.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(px, py); ctx.stroke();
      ctx.strokeStyle = NOIR.cream; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.fillStyle = NOIR.cream; ctx.strokeStyle = NOIR.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(px, py, 7 * pk, 0, 6.283); ctx.fill(); ctx.stroke();
    }
  }
  // плашка открывается шторкой слева
  ctx.save(); ctx.beginPath(); ctx.rect(-20, -20, (pw + 40) * kin, ph + 60); ctx.clip();
  const plate = () => { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(pw, 0); ctx.lineTo(pw - slant, ph); ctx.lineTo(0, ph); ctx.closePath(); };
  ctx.save(); ctx.translate(10, 12); plate(); ctx.fillStyle = 'rgba(2,3,10,.55)'; ctx.fill(); ctx.restore();     // жёсткая тень
  plate(); const g = ctx.createLinearGradient(0, 0, 0, ph); g.addColorStop(0, '#1a2034'); g.addColorStop(1, '#0c0f1c'); ctx.fillStyle = g; ctx.fill();
  ctx.lineWidth = 4; ctx.strokeStyle = NOIR.ink; ctx.stroke();
  ctx.fillStyle = accent; ctx.fillRect(0, 0, 12, ph);                                                       // янтарный корешок
  ctx.fillStyle = 'rgba(255,212,138,.12)'; ctx.fillRect(12, 0, pw - 12, 3);                                 // свет лампы по верхней кромке
  // имя: кремовое, контур тушью
  ctx.textBaseline = 'alphabetic'; ctx.font = `700 ${nameSize}px ${FONT.label}`; ctx.letterSpacing = '5px';
  ctx.lineJoin = 'round'; ctx.lineWidth = 6; ctx.strokeStyle = NOIR.ink; ctx.strokeText(name.toUpperCase(), 44, 22 + nameSize * .8);
  ctx.fillStyle = NOIR.cream; ctx.fillText(name.toUpperCase(), 44, 22 + nameSize * .8);
  // янтарная линейка дорисовывается, роль набивается
  const lk = E.outCubic(clamp((ti - .25) / .5));
  ctx.fillStyle = accent; ctx.fillRect(44, 34 + nameSize * .8, (pw - 44 - slant - 30) * lk, 3);
  ctx.font = `bold ${roleSize}px ${FONT.type}`; ctx.letterSpacing = '3px';
  writeLine(ctx, role.toUpperCase(), 46, 50 + nameSize * .8 + roleSize * .8, (ti - .4) * 30, { fill: accent });
  ctx.restore();
  ctx.restore();
}

// "$33 MILLION" -> { pre: '$', num: 33, unit: 'MILLION', mult: 1e6, dec: 0 }
const UNITS = { THOUSAND: 1e3, K: 1e3, MILLION: 1e6, M: 1e6, BILLION: 1e9, B: 1e9, TRILLION: 1e12, T: 1e12 };
function parseNum(s) {
  const m = String(s).trim().match(/^([^\d\-]*)(-?[\d.,]+)\s*(.*)$/); if (!m) return { pre: '', num: 0, unit: String(s), mult: 1, dec: 0, value: 0 };
  const raw = m[2].replace(/,/g, ''), num = parseFloat(raw), unit = m[3].trim(), mult = UNITS[unit.toUpperCase()] || 1, dec = (raw.split('.')[1] || '').length;
  return { pre: m[1], num, unit, mult, dec, value: num * mult, comma: m[2].includes(',') };
}
const fmt = (v, dec, comma) => { const s = v.toFixed(dec); if (!comma) return s; const [a, b] = s.split('.'); return a.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (b ? '.' + b : ''); };

export function bigNumber(ctx, t, o = {}) {
  const [W, H] = dims(ctx, o);
  const { from = '0', to = '100', label = '', sub = '', dur = 3, at = .5, countDur = 1.3, size = 300, strike = true, seed = hashS(String(to)) } = o;
  const A = parseNum(from), B = parseNum(to), tLand = at + countDur;
  const k = E.inOutCubic(clamp((t - at) / countDur));
  const log = A.value > 0 && B.value > 0 && Math.max(A.value / B.value, B.value / A.value) > 20;
  const v = k >= 1 ? B.value : log ? Math.exp(lerp(Math.log(A.value), Math.log(B.value), k)) : lerp(A.value, B.value, k);
  // какие единицы показывать: крупнейшая из встречающихся, в которую число уже «доросло»
  const units = [A, B].filter(p => p.mult > 1).sort((a, b) => b.mult - a.mult);
  const U = k >= 1 ? B : (units.find(u => v >= u.mult) || units[units.length - 1] || B);
  const shown = v / U.mult, dec = k >= 1 ? B.dec : k <= 0 ? A.dec : shown < 10 && U.mult > 1 ? 1 : 0;
  const main = (U.pre || B.pre) + fmt(k <= 0 ? A.num : k >= 1 ? B.num : shown, dec, B.comma || A.comma) + (U.mult > 1 ? '' : U.unit);
  const unit = U.mult > 1 ? U.unit.toUpperCase() : '';
  ctx.save();
  // фон: тёмная стена под лампой (тёмно-синие тени, янтарное пятно), шов панелей как на фонах-кабинетах
  ctx.save(); camPush(ctx, W, H, t, { dur, to: 1.04, drift: 4, seed, shake: 0 });
  ctx.fillStyle = '#0c1020'; ctx.fillRect(-80, -80, W + 160, H + 160);
  const wall = ctx.createLinearGradient(0, 0, 0, H); wall.addColorStop(0, '#1a1c2c'); wall.addColorStop(.62, '#121628'); wall.addColorStop(.63, '#2a1a14'); wall.addColorStop(1, '#170d09');
  ctx.fillStyle = wall; ctx.fillRect(-80, -80, W + 160, H + 160);
  ctx.fillStyle = NOIR.ink; ctx.fillRect(-80, H * .625, W + 160, 8);
  for (let xx = -40; xx < W + 80; xx += 320) { ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(xx, H * .63, 6, H); ctx.fillStyle = 'rgba(255,190,120,.05)'; ctx.fillRect(xx + 6, H * .63, 3, H); }
  lampPool(ctx, W * .5, H * .2, H * .95, 1.15); coldShade(ctx, W, H, .8);
  ctx.restore();
  motes(ctx, W, H, t, { n: 30, x0: W * .2, x1: W * .8, y1: H * .7, k: .25, seed });
  const pop = spring(t, tLand, 7, 16) * .1, sh = kick(t, tLand, 9);
  camPush(ctx, W, H, t, { dur, from: 1, to: 1.06, drift: 3, seed: 3 }); ctx.translate(sh, sh * .5);
  const cx = W / 2, cy = H * .5;
  // метка сверху: пишмашинка, янтарь
  if (label) { ctx.font = `bold 40px ${FONT.type}`; ctx.letterSpacing = '8px'; ctx.textBaseline = 'middle'; writeLine(ctx, label.toUpperCase(), cx + 4, cy - size * .98, t * 34, { align: 'center', fill: NOIR.amber }); ctx.letterSpacing = '0px'; }
  // число: кремовое, толстый контур тушью, жёсткая синяя тень (как вывески на фонах)
  ctx.save(); ctx.translate(cx, cy); ctx.scale(1 + pop, 1 + pop);
  ctx.font = `800 ${size}px ${FONT.display}`; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
  const blur = k > 0 && k < 1 ? Math.sin(k * Math.PI) : 0;                                                     // смаз отсчёта
  if (blur > .05) { ctx.globalAlpha = .25 * blur; ctx.fillStyle = NOIR.cream; ctx.fillText(main, 0, -22 * blur); ctx.fillText(main, 0, 22 * blur); ctx.globalAlpha = 1; }
  ctx.fillStyle = 'rgba(16,26,62,.95)'; ctx.fillText(main, 12, 14);
  ctx.lineJoin = 'round'; ctx.lineWidth = 14; ctx.strokeStyle = NOIR.ink; ctx.strokeText(main, 0, 0);
  const fill = ctx.createLinearGradient(0, -size * .45, 0, size * .45); fill.addColorStop(0, '#fff3d6'); fill.addColorStop(.55, NOIR.cream); fill.addColorStop(.56, '#d9c9a4'); fill.addColorStop(1, '#cdb88f');
  ctx.fillStyle = fill; ctx.fillText(main, 0, 0);
  const mw = ctx.measureText(main).width;
  if (unit) {
    ctx.font = `700 ${size * .3}px ${FONT.label}`; ctx.letterSpacing = `${size * .05}px`;
    ctx.lineWidth = 8; ctx.strokeStyle = NOIR.ink; ctx.strokeText(unit, size * .025, size * .62); ctx.fillStyle = NOIR.amber; ctx.fillText(unit, size * .025, size * .62); ctx.letterSpacing = '0px';
  }
  ctx.restore();
  // событие: красная черта маркером под числом + старое значение маленьким, зачёркнутым
  const lk = E.outCubic(clamp((t - tLand - .05) / .3));
  if (lk > 0) {
    const yU = cy + size * (unit ? .86 : .56), pts = wobble([[cx - mw * .52, yU + 6], [cx + mw * .52, yU - 6]], 3, seed, 12); marker(ctx, partial(pts, lk), { w: 14 });
    if (strike) {
      const sk = E.outCubic(clamp((t - tLand - .25) / .35)), fy = cy - size * .74;
      ctx.globalAlpha = sk; ctx.font = `bold 44px ${FONT.type}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(241,230,204,.7)';
      const ft = String(from).toUpperCase(), fw = ctx.measureText(ft).width; ctx.fillText(ft, cx, fy); ctx.globalAlpha = 1;
      marker(ctx, partial(wobble([[cx - fw / 2 - 12, fy + 4], [cx + fw / 2 + 12, fy - 3]], 2, seed + 1, 10), E.outCubic(clamp((t - tLand - .45) / .25))), { w: 6 });
    }
  }
  if (sub) { ctx.font = `bold 32px ${FONT.type}`; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(241,230,204,.75)'; ctx.globalAlpha = E.outCubic(clamp((t - tLand - .3) / .4)); ctx.fillText(sub, cx, cy + size * 1.1); ctx.globalAlpha = 1; }
  // вспышка лампы при ударе
  const fl = Math.exp(-Math.max(0, t - tLand) * 9) * (t >= tLand ? 1 : 0);
  ctx.restore();
  if (fl > .01) { ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = `rgba(255,200,120,${(.18 * fl).toFixed(3)})`; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  vignette(ctx, W, H, .65); grain(ctx, W, H, t, .08);
}
