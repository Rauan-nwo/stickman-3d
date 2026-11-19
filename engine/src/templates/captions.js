// templates/captions.js: плашка «имя — роль» и крупная цифра.
//   lowerThird(ctx, t, { name, role, x, y, at, out, point })   — плашка тушью с янтарными линейками выезжает слева,
//        роль набивается на пишмашинке; point: [x, y] — тонкая выноска к герою (как подписи у конкурента)
//   bigNumber(ctx, t, { from, to, label, at, countDur, strike, tickHz })  — число отсчитывает от from к to (tickHz — смена цифр N раз/с)
//        (в логарифме, если разница больше 20 раз: $33 MILLION -> $3 BILLION; 95% -> 0% — линейно);
//        событие: приземление — удар с отскоком, красная черта под числом, толчок камеры, старое значение зачёркнуто
//        '1 MONTH' — с пробелом (без from не считается); не-число ('ONE MONTH') — текстом, впечатывается в at;
//        длинная надпись ужимается до maxW (по умолчанию 86 % ширины);
//        style: 'ticker' (или само, если to вида 'NVDA −13%') — символ, изменение красным со стрелкой вниз, график обрывается
import { clamp, lerp, E, spring } from '../core/ease.js';
import { rng } from '../core/rng.js';
import { NOIR, FONT, dims, camPush, kick, vignette, grain, motes, lampPool, coldShade, writeLine, wobble, partial, polyline, marker, hashS, scratchCPU } from './noir.js';

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

// "$33 MILLION" -> { pre: '$', num: 33, sep: ' ', unit: 'MILLION', mult: 1e6, dec: 0 };  "ONE MONTH" -> { text: true }
const UNITS = { THOUSAND: 1e3, K: 1e3, MILLION: 1e6, M: 1e6, BILLION: 1e9, B: 1e9, TRILLION: 1e12, T: 1e12 };
function parseNum(s) {
  const str = String(s).trim().replace(/−/g, '-'), m = str.match(/^([^\d\-]*)(-?[\d.,]+)(\s*)(.*)$/);
  // текст, а не число: нет цифр, буквы перед числом ('NVDA -13%') или цифры в хвосте
  if (!m || /[A-Za-z]/.test(m[1]) || /\d/.test(m[4])) return { text: true, pre: '', num: 0, sep: '', unit: '', mult: 1, dec: 0, value: 0 };
  const raw = m[2].replace(/,/g, ''), num = parseFloat(raw), unit = m[4].trim(), mult = UNITS[unit.toUpperCase()] || 1, dec = (raw.split('.')[1] || '').length;
  return { pre: m[1], num, sep: m[3] ? ' ' : '', unit, mult, dec, value: num * mult, comma: m[2].includes(','), word: mult === 1 && /[A-Za-z]/.test(unit) };
}
const fmt = (v, dec, comma) => { const s = v.toFixed(dec); if (!comma) return s; const [a, b] = s.split('.'); return a.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (b ? '.' + b : ''); };
// 'NVDA -13%' / 'NVDA −13%' / 'TSM +4.2%' -> тикер
const TICKER = /^([A-Z][A-Z.]{0,5})\s+([+\-−])\s*([\d.,]+\s*%?)$/;

// фон цифры: тёмная стена под лампой (тёмно-синие тени, янтарное пятно), шов панелей как на фонах-кабинетах
function numberWall(ctx, W, H, t, dur, seed) {
  ctx.save(); camPush(ctx, W, H, t, { dur, to: 1.04, drift: 4, seed, shake: 0 });
  ctx.fillStyle = '#0c1020'; ctx.fillRect(-80, -80, W + 160, H + 160);
  const wall = ctx.createLinearGradient(0, 0, 0, H); wall.addColorStop(0, '#1a1c2c'); wall.addColorStop(.62, '#121628'); wall.addColorStop(.63, '#2a1a14'); wall.addColorStop(1, '#170d09');
  ctx.fillStyle = wall; ctx.fillRect(-80, -80, W + 160, H + 160);
  ctx.fillStyle = NOIR.ink; ctx.fillRect(-80, H * .625, W + 160, 8);
  for (let xx = -40; xx < W + 80; xx += 320) { ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(xx, H * .63, 6, H); ctx.fillStyle = 'rgba(255,190,120,.05)'; ctx.fillRect(xx + 6, H * .63, 3, H); }
  lampPool(ctx, W * .5, H * .2, H * .95, 1.15); coldShade(ctx, W, H, .8);
  ctx.restore();
  motes(ctx, W, H, t, { n: 30, x0: W * .2, x1: W * .8, y1: H * .7, k: .25, seed });
}
// крупная надпись: кремовая, толстый контур тушью, жёсткая синяя тень (как вывески на фонах)
function poster(ctx, text, size, blur = 0) {
  ctx.font = `800 ${size}px ${FONT.display}`; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
  if (blur > .05) { ctx.globalAlpha = .25 * blur; ctx.fillStyle = NOIR.cream; ctx.fillText(text, 0, -22 * blur); ctx.fillText(text, 0, 22 * blur); ctx.globalAlpha = 1; }
  ctx.fillStyle = 'rgba(16,26,62,.95)'; ctx.fillText(text, size * .04, size * .0467);
  ctx.lineJoin = 'round'; ctx.lineWidth = size * .0467; ctx.strokeStyle = NOIR.ink; ctx.strokeText(text, 0, 0);
  const fill = ctx.createLinearGradient(0, -size * .45, 0, size * .45); fill.addColorStop(0, '#fff3d6'); fill.addColorStop(.55, NOIR.cream); fill.addColorStop(.56, '#d9c9a4'); fill.addColorStop(1, '#cdb88f');
  ctx.fillStyle = fill; ctx.fillText(text, 0, 0);
  return ctx.measureText(text).width;
}

export function bigNumber(ctx, t, o = {}) {
  const [W, H] = dims(ctx, o);
  const { to = '100', label = '', sub = '', dur = 3, at = .5, size: size0 = 300, strike = true, maxW = W * .86, seed = hashS(String(to)) } = o;
  const from = o.from ?? '0', A = parseNum(from), B = parseNum(to);
  const ticker = o.style === 'ticker' || (o.style == null && TICKER.test(String(to).trim()));
  // отсчёт — только число к числу; '1 MONTH' без from не считается (0 MONTH -> 1 MONTH нелепо), текст — никогда
  const counting = !ticker && !A.text && !B.text && (o.from != null || !B.word);
  const countDur = counting ? (o.countDur ?? 1.3) : (o.countDur ?? .12), tLand = at + countDur;
  // tickHz — счётчик меняет цифры не каждый кадр, а N раз в секунду (как механический табло): крупные цифры, сменяясь каждый кадр,
  //   давали «пилу» яркости всего кадра (ворота мерцания L001). По умолчанию — как раньше (каждый кадр).
  const tq = o.tickHz && counting && t > at && t < tLand ? at + Math.floor((t - at) * o.tickHz) / o.tickHz : t;
  const k = E.inOutCubic(clamp((tq - at) / countDur));
  let main, unit = '';
  if (counting) {
    const log = A.value > 0 && B.value > 0 && Math.max(A.value / B.value, B.value / A.value) > 20;
    const v = k >= 1 ? B.value : log ? Math.exp(lerp(Math.log(A.value), Math.log(B.value), k)) : lerp(A.value, B.value, k);
    // какие единицы показывать: крупнейшая из встречающихся, в которую число уже «доросло»
    //   по ходу счёта — стандартная лестница MILLION/BILLION/TRILLION (или M/B/T, если так написано в to); ниже миллиона — просто число
    //   с запятыми. Раньше '$0' -> '$50 BILLION' начинался с «$0 BILLION» (единица цели при нуле) — нелепо.
    const big = A.mult > 1 || B.mult > 1, abbr = big && (B.mult > 1 ? B : A).unit.length <= 1;
    const std = !big ? [] : (abbr ? [['T', 1e12], ['B', 1e9], ['M', 1e6]] : [['TRILLION', 1e12], ['BILLION', 1e9], ['MILLION', 1e6]]).map(([unit, mult]) => ({ pre: B.pre || A.pre, unit, mult, sep: ' ' }));
    const units = [A, B].filter(p => p.mult > 1).concat(std).sort((a, b) => b.mult - a.mult);
    const plain = { pre: B.pre || A.pre, unit: '', mult: 1, sep: '' };
    const U = k >= 1 ? B : k <= 0 ? A : (units.find(u => v >= u.mult) || (big ? plain : units[units.length - 1] || B));
    const shown = v / U.mult, dec = k >= 1 ? B.dec : k <= 0 ? A.dec : shown < 10 && U.mult > 1 ? 1 : 0;
    main = (U.pre || B.pre) + fmt(k <= 0 ? A.num : k >= 1 ? B.num : shown, dec, B.comma || A.comma || U === plain) + (U.mult > 1 ? '' : U.sep + U.unit);
    unit = U.mult > 1 ? U.unit.toUpperCase() : '';
  } else {                                                                     // текстом: до удара — from (если задан), после — to
    const fin = B.text ? String(to) : B.pre + fmt(B.num, B.dec, B.comma) + (B.mult > 1 ? '' : B.sep + B.unit);
    unit = !B.text && B.mult > 1 ? B.unit.toUpperCase() : '';
    main = t < tLand ? (o.from != null ? String(from) : '') : fin;
    if (t < tLand && o.from == null) unit = '';
  }
  ctx.save();
  numberWall(ctx, W, H, t, dur, seed);
  // передний план (надписи, маркер) — на программном холсте: крупный текст не зависит от истории GPU
  const out = ctx, [layer, lx] = scratchCPU('bignum', W, H); ctx = lx;
  const pop = spring(t, tLand, 7, 16) * .1, sh = kick(t, tLand, 9);
  camPush(ctx, W, H, t, { dur, from: 1, to: 1.06, drift: 3, seed: 3 }); ctx.translate(sh, sh * .5);
  const cx = W / 2, cy = H * .5;
  // метка сверху: пишмашинка, янтарь
  if (label) { ctx.font = `bold 40px ${FONT.type}`; ctx.letterSpacing = '8px'; ctx.textBaseline = 'middle'; writeLine(ctx, label.toUpperCase(), cx + 4, cy - size0 * .98, t * 34, { align: 'center', fill: NOIR.amber }); ctx.letterSpacing = '0px'; }
  let mw = 0, yU = cy + size0 * (unit ? .86 : .56);
  if (ticker) mw = drawTicker(ctx, t, String(to).trim(), cx, cy, size0, at, tLand, seed);
  else if (main) {
    // число: не шире maxW — длинная надпись ('ONE MONTH', '1 MONTH') уменьшается, чтобы влезть
    ctx.save(); ctx.font = `800 ${size0}px ${FONT.display}`; const fit = Math.min(1, maxW / Math.max(1, ctx.measureText(main).width)), size = size0 * fit; ctx.restore();
    ctx.save(); ctx.translate(cx, cy); ctx.scale(1 + pop, 1 + pop);
    if (!counting && t >= tLand) { const sc = lerp(1.35, 1, E.outCubic(clamp((t - tLand) / .12))); ctx.scale(sc, sc); }   // текст «впечатывается»
    mw = poster(ctx, main, size, counting && k > 0 && k < 1 ? Math.sin(k * Math.PI) : 0);
    if (unit) {
      ctx.font = `700 ${size0 * .3}px ${FONT.label}`; ctx.letterSpacing = `${size0 * .05}px`;
      ctx.lineWidth = 8; ctx.strokeStyle = NOIR.ink; ctx.strokeText(unit, size0 * .025, size0 * .62); ctx.fillStyle = NOIR.amber; ctx.fillText(unit, size0 * .025, size0 * .62); ctx.letterSpacing = '0px';
    }
    ctx.restore();
    if (fit < 1 && !unit) yU = cy + size * .56;
  }
  // событие: красная черта маркером под числом + старое значение маленьким, зачёркнутым
  const lk = E.outCubic(clamp((t - tLand - .05) / .3));
  if (lk > 0 && !ticker) {
    const pts = wobble([[cx - mw * .52, yU + 6], [cx + mw * .52, yU - 6]], 3, seed, 12); marker(ctx, partial(pts, lk), { w: 14 });
    if (strike && counting) {
      const sk = E.outCubic(clamp((t - tLand - .25) / .35)), fy = cy - size0 * .74;
      ctx.globalAlpha = sk; ctx.font = `bold 44px ${FONT.type}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(241,230,204,.7)';
      const ft = String(from).toUpperCase(), fw = ctx.measureText(ft).width; ctx.fillText(ft, cx, fy); ctx.globalAlpha = 1;
      marker(ctx, partial(wobble([[cx - fw / 2 - 12, fy + 4], [cx + fw / 2 + 12, fy - 3]], 2, seed + 1, 10), E.outCubic(clamp((t - tLand - .45) / .25))), { w: 6 });
    }
  }
  if (sub) { ctx.font = `bold 32px ${FONT.type}`; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(241,230,204,.75)'; ctx.globalAlpha = E.outCubic(clamp((t - tLand - .3) / .4)); ctx.fillText(sub, cx, cy + size0 * 1.1); ctx.globalAlpha = 1; }
  // вспышка лампы при ударе
  const fl = Math.exp(-Math.max(0, t - tLand) * 9) * (t >= tLand ? 1 : 0);
  ctx = out; ctx.drawImage(layer, 0, 0);
  ctx.restore();
  if (fl > .01) { ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = `rgba(255,200,120,${(.18 * fl).toFixed(3)})`; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  vignette(ctx, W, H, .65); grain(ctx, W, H, t, .08);
}

// тикер: 'NVDA' кремом + изменение красным (или зелёным) со стрелкой; событие в at — стрелка падает с отскоком,
// изменение впечатывается, за надписью рисуется рваный график цены, обрывающийся вниз (вверх для +)
function drawTicker(ctx, t, text, cx, cy, size, at, tLand, seed) {
  const m = text.match(TICKER), sym = m ? m[1] : text, down = m ? m[2] !== '+' : true, chg = m ? (down ? '−' : '+') + m[3].replace(/\s+/g, '') : '';
  const col = down ? NOIR.redHi : '#6fcf7a', colRGB = down ? NOIR.redRGB : '90,190,110';
  const r = rng(seed), pts = [], gx0 = cx - 760, gx1 = cx + 760, base = cy + size * .62;
  for (let i = 0; i <= 40; i++) { const u = i / 40, fall = u > .72 ? (u - .72) / .28 : 0; pts.push([lerp(gx0, gx1, u), base - 90 + (r() - .5) * 46 + Math.sin(u * 9) * 18 + (down ? 1 : -1) * fall * fall * 230]); }
  const gk = clamp((t - at + .9) / 1.1);
  if (gk > 0) {
    const pp = partial(pts, E.inOutSine(gk));
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    polyline(ctx, pp); ctx.strokeStyle = 'rgba(11,9,16,.85)'; ctx.lineWidth = 12; ctx.stroke();
    polyline(ctx, pp); ctx.strokeStyle = `rgba(${colRGB},.75)`; ctx.lineWidth = 6; ctx.stroke(); ctx.restore();
  }
  ctx.save(); ctx.font = `700 ${size * .8}px ${FONT.label}`; ctx.letterSpacing = `${size * .03}px`; const sw = ctx.measureText(sym).width; ctx.letterSpacing = '0px';
  ctx.font = `800 ${size * .62}px ${FONT.display}`; const cw = ctx.measureText(chg).width; ctx.restore();
  const aw = size * .42, gap = size * .12, total = sw + gap + aw + gap * .6 + cw, x0 = cx - total / 2;
  ctx.save(); ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  ctx.font = `700 ${size * .8}px ${FONT.label}`; ctx.letterSpacing = `${size * .03}px`;
  ctx.fillStyle = 'rgba(16,26,62,.95)'; ctx.fillText(sym, x0 + 12, cy + 14);
  ctx.lineJoin = 'round'; ctx.lineWidth = 14; ctx.strokeStyle = NOIR.ink; ctx.strokeText(sym, x0, cy); ctx.fillStyle = NOIR.cream; ctx.fillText(sym, x0, cy); ctx.letterSpacing = '0px';
  // стрелка: треугольник падает сверху (для + — вылетает снизу) в at, с отскоком
  const ak = clamp((t - at) / .35), ay = cy - (1 - E.outBack(ak, 2.4)) * size * .9 * (down ? 1 : -1), ax = x0 + sw + gap + aw / 2;
  if (ak > 0) {
    ctx.save(); ctx.translate(ax, ay); if (!down) ctx.scale(1, -1); ctx.globalAlpha = clamp(ak * 3);
    const tri = () => { ctx.beginPath(); ctx.moveTo(-aw / 2, -aw * .42); ctx.lineTo(aw / 2, -aw * .42); ctx.lineTo(0, aw * .48); ctx.closePath(); };
    ctx.save(); ctx.translate(10, 12); tri(); ctx.fillStyle = 'rgba(16,26,62,.95)'; ctx.fill(); ctx.restore();
    tri(); ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 10; ctx.lineJoin = 'round'; ctx.strokeStyle = NOIR.ink; ctx.stroke();
    ctx.restore();
  }
  if (t >= tLand) {
    ctx.save(); ctx.translate(x0 + sw + gap + aw + gap * .6 + cw / 2, cy); const sc = lerp(1.35, 1, E.outCubic(clamp((t - tLand) / .12))); ctx.scale(sc, sc);
    ctx.font = `800 ${size * .62}px ${FONT.display}`; ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(16,26,62,.95)'; ctx.fillText(chg, 10, 12);
    ctx.lineWidth = 12; ctx.strokeStyle = NOIR.ink; ctx.strokeText(chg, 0, 0); ctx.fillStyle = col; ctx.fillText(chg, 0, 0); ctx.restore();
  }
  ctx.restore();
  return total;
}
