// banquet.js: «один гениальный повар» (#63) и «все тарелки разом» (#64, финал). Рисованная плита (фронтальный вид зала) +
// длинный банкетный стол, нарисованный проекцией: стол идёт по диагонали от повара вправо-вглубь, тарелки в ряд вдоль
// ближней к гостям половины, гости сидят за дальней кромкой лицом к камере (видны все, не прячутся друг за другом).
// Камера не сдвигается, только зум/поворот, поэтому плита — экранный слой без расхождений.
// Порядок рисования — срезами стола от дальнего к ближнему: гость (корпус) → кусок стола → тарелка → вилка → руки гостя.
import { V, Actor, noirShade, unUpper, shoulder, act, blinkAt, clamp, lerp, E } from 'engine';
import { chef, guest, pancake } from './chef.js';

const INK = '#141014', TAU = Math.PI * 2;
const seg = (t, a, b) => clamp((t - a) / (b - a));

export function makeBanquet(stage, o, G) {
  // G.table: { x, z, ang, len, w2, h, dz }; G.chefAt [x, z]; G.unit
  const T = G.table, ca = Math.cos(T.ang), sa = Math.sin(T.ang), H = T.h;
  const W3 = (u, v, y) => V(T.x + u * ca + v * sa, y, T.z - u * sa + v * ca);          // u — вдоль стола (вглубь), v — поперёк (+ к камере)
  const P3 = p => stage.project(p), Puv = (u, v, y) => P3(W3(u, v, y));
  const N = Math.floor((T.len - .4) / T.dz);
  const plates = []; for (let k = 0; k < N; k++) plates.push({ u: .45 + k * T.dz, v: -.1 });
  const SEATV = -(T.w2 + .22);
  const guests = plates.map((pl, k) => {
    const A = new Actor(stage, guest(k * 7 + 3), { pin: 'seat', unit: G.unit });
    A.at(W3(pl.u, SEATV, .47)); A.char.spec.shade = noirShade([.4, -1]); A.char.spec.rig = { ...A.char.spec.rig, armLayer: 'front' };
    return A;
  });
  const C = new Actor(stage, chef(), { pin: 'feet', unit: G.unit }).at(V(G.chefAt[0], 0, G.chefAt[1]));
  C.char.spec.shade = noirShade([-.6, -.8]); C.char.spec.rig = { ...C.char.spec.rig, armLayer: 'front', plantLegs: .02 };

  const dist = p => { const c = stage.camera.position; return Math.hypot(p.x - c.x, p.y - c.y, p.z - c.z); };
  const fogK = d => clamp((d - 7) / 22) * .8;
  const mix = (c, k, f = [22, 24, 40]) => `rgb(${c.map((v, i) => Math.round(v + (f[i] - v) * k)).join(',')})`;
  function poly(ctx, pts, fill, lw = 0) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const q of pts.slice(1)) ctx.lineTo(q[0], q[1]); ctx.closePath(); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (lw) { ctx.lineJoin = 'round'; ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.stroke(); } }
  function edge(ctx, a, b, lw, col = INK) { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineWidth = lw; ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.stroke(); }
  // кусок стола [ua, ub] (ua < ub): столешница, ближняя к камере скатерть до пола, контуры только по длинным кромкам
  function tableSlice(ctx, ua, ub, first) {
    const d = dist(W3((ua + ub) / 2, 0, H)), k = fogK(d), lw = clamp(stage.pxs() / d * .0075, .7, 4.5);
    const top = [Puv(ua, -T.w2, H), Puv(ub, -T.w2, H), Puv(ub, T.w2, H), Puv(ua, T.w2, H)];
    const side = [Puv(ua, T.w2, H), Puv(ub, T.w2, H), Puv(ub, T.w2, 0), Puv(ua, T.w2, 0)];
    poly(ctx, side, mix([168, 132, 102], k));
    ctx.save(); ctx.globalAlpha = .4 * (1 - k);                                              // складки скатерти
    for (let u = Math.ceil(ua / .35) * .35; u < ub; u += .35) edge(ctx, Puv(u, T.w2, H - .05), Puv(u + .02, T.w2, .02), lw * .6, '#6e5040');
    ctx.restore();
    poly(ctx, top, mix([240, 228, 198], k));
    edge(ctx, Puv(ua, -T.w2, H), Puv(ub, -T.w2, H), lw); edge(ctx, Puv(ua, T.w2, H), Puv(ub, T.w2, H), lw); edge(ctx, Puv(ua, T.w2, 0), Puv(ub, T.w2, 0), lw);
    edge(ctx, Puv(ua, T.w2, H - .07), Puv(ub, T.w2, H - .07), lw * .6, 'rgba(110,70,50,.55)');
    if (first) {                                                                              // торец стола (виден слева)
      const f = [Puv(0, -T.w2, H), Puv(0, T.w2, H), Puv(0, T.w2, 0), Puv(0, -T.w2, 0)];
      poly(ctx, f, mix([140, 108, 84], k), lw);
    }
  }
  // тарелка; served 0..1 — блин падает и шлёпается (сплющивание + брызги), затем пар; fall — высота падения (м)
  function plate(ctx, pl, served, t, fall = .0) {
    const c = Puv(pl.u, pl.v, H + .004), d = dist(W3(pl.u, pl.v, H)), ppm = stage.pxs() / d, k = fogK(d), r = .2 * ppm;
    const ry = Math.max(1, Math.abs(Puv(pl.u, pl.v + .2, H)[1] - c[1]));
    if (r < .8) return;
    const lw = clamp(ppm * .006, .5, 3.5);
    ctx.beginPath(); ctx.ellipse(c[0] + r * .05, c[1] + ry * .3, r * 1.02, ry * 1.02, 0, 0, TAU); ctx.fillStyle = 'rgba(60,30,20,.25)'; ctx.fill();
    ctx.beginPath(); ctx.ellipse(c[0], c[1], r, ry, 0, 0, TAU); ctx.fillStyle = mix([252, 250, 244], k); ctx.fill(); if (lw > .6) { ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.stroke(); }
    ctx.beginPath(); ctx.ellipse(c[0], c[1], r * .64, ry * .64, 0, 0, TAU); ctx.lineWidth = Math.max(.4, lw * .5); ctx.strokeStyle = mix([196, 192, 186], k); ctx.stroke();
    if (served <= 0) return;
    const land = .35;                                                                         // доля served до касания
    if (served < land && fall > 0) {                                                          // падение сверху — рисуется последним проходом (поверх гостей)
      const y = H + fall * (1 - E.inCubic(served / land)), q = Puv(pl.u, pl.v, y);
      falling.push(() => { pancake(ctx, q[0], q[1], r * .75, ry * .9, served * 2, INK, clamp(r * .06, 0, 4));
        ctx.save(); ctx.strokeStyle = 'rgba(255,230,170,.55)'; ctx.lineWidth = Math.max(1, r * .06); ctx.lineCap = 'round';
        for (const j of [-.4, 0, .4]) { ctx.beginPath(); ctx.moveTo(q[0] + j * r, q[1] - r * .9); ctx.lineTo(q[0] + j * r, q[1] - r * 2.4); ctx.stroke(); } ctx.restore(); });
      return;
    }
    const s = fall > 0 ? seg(served, land, 1) : served;
    const sq = 1 + .35 * Math.sin(Math.min(1, s * 2.2) * Math.PI) * (1 - s);                  // шлёп: сплющился и вернулся
    ctx.save(); ctx.translate(c[0], c[1] - ry * .08); ctx.scale(sq, 1 / sq);
    pancake(ctx, 0, 0, r * .66, ry * .66, 0, INK, clamp(r * .05, 0, 3.5), r > 10);
    ctx.restore();
    const sp = seg(s, 0, .5);                                                                 // брызги-штрихи при касании
    if (sp > 0 && sp < 1 && r > 4) { ctx.save(); ctx.strokeStyle = `rgba(255,236,190,${1 - sp})`; ctx.lineWidth = Math.max(1, r * .07); ctx.lineCap = 'round';
      for (let i = 0; i < 7; i++) { const a = Math.PI + i / 6 * Math.PI, r0 = r * (.7 + sp * .5), r1 = r * (.95 + sp * .8); ctx.beginPath(); ctx.moveTo(c[0] + Math.cos(a) * r0, c[1] + Math.sin(a) * r0 * .7); ctx.lineTo(c[0] + Math.cos(a) * r1, c[1] + Math.sin(a) * r1 * .7); ctx.stroke(); }
      ctx.restore(); }
    const gl = Math.sin(seg(s, 0, .6) * Math.PI);
    if (gl > .02) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const R = r * 1.8, g = ctx.createRadialGradient(c[0], c[1], 0, c[0], c[1], R); g.addColorStop(0, `rgba(255,220,140,${.85 * gl})`); g.addColorStop(1, 'rgba(255,200,120,0)'); ctx.fillStyle = g; ctx.fillRect(c[0] - R, c[1] - R, R * 2, R * 2); ctx.restore(); }
    if (r > 7) { ctx.save(); ctx.globalAlpha = .5 * clamp(s * 2) * (1 - k); ctx.strokeStyle = '#f4ead8'; ctx.lineWidth = Math.max(1.2, r * .06); ctx.lineCap = 'round';   // пар
      for (const j of [-1, 0, 1]) { ctx.beginPath(); const x0 = c[0] + j * r * .3, y0 = c[1] - ry * 1.2; for (let i = 0; i <= 8; i++) { const yy = y0 - i * r * .12, xx = x0 + Math.sin(t * 5 + i * .7 + j * 2) * r * .08; i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.stroke(); }
      ctx.restore(); }
  }
  // ---------- гость: оба предплечья на столешнице, вилка в ближней к повару руке ----------
  function guestPose(i, t, served, cheer) {
    const A = guests[i], S = A.char.spec, pl = plates[i];
    const bored = served <= 0 && !cheer;
    const p = act(t + i * .37, [[0, bored ? 'neutral' : 'happy']]);
    Object.assign(p, { view: 'threeQuarter', facing: -1, stance: 'stand', blink: blinkAt(t + i * .9, 2 + (i % 3)) });
    p.mouth = bored ? (i % 3 === 0 ? 'flatS' : 'flat') : cheer ? 'open' : 'smile';
    p.eyes = bored ? 'lid' : 'dot'; p.lid = bored ? [.35, .35] : undefined;
    p.look = [-.7, bored ? .15 : 0]; p.tilt = bored ? -.06 + Math.sin(t * 1.3 + i) * .03 : 0;
    p.bob = cheer ? -Math.abs(Math.sin((t + i * .13) * 9)) * 22 : 0;
    const xf = A.xf(), loc = w => unUpper(S, p, A.toLocal(w, xf));
    const tap = bored ? Math.max(0, Math.sin((t + i * .29) * 11)) * 16 : 0;
    const handL = loc(W3(pl.u - .17, -T.w2 + .07, H + .015)), handR = loc(W3(pl.u + .17, -T.w2 + .07, H + .015));
    const sh0 = shoulder(S, -1), up = [sh0[0] - 140, sh0[1] - 200 + Math.sin((t + i * .2) * 14) * 10];
    const fork = cheer ? up : [handL[0], handL[1] - tap];
    p.arms = [{ to: fork, w: 11 }, { to: handR, w: 11 }];
    return { p, fork };
  }
  const forkDraw = (ctx, h) => { ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = INK; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(h[0], h[1] + 10); ctx.lineTo(h[0] - 6, h[1] - 80); ctx.stroke(); ctx.strokeStyle = '#cfd3da'; ctx.lineWidth = 4; ctx.stroke();
    for (const dx of [-8, 0, 8]) { ctx.beginPath(); ctx.moveTo(h[0] - 6 + dx * .6, h[1] - 78); ctx.lineTo(h[0] - 7 + dx, h[1] - 106); ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.stroke(); } ctx.restore(); };

  // served(i, t) 0..1; cheerAt — время ликования; fall — высота падения блинов (финал)
  const falling = [];
  function drawTable(t, served, { cheerAt = null, fall = 0 } = {}) {
    const ctx = stage.ctx; falling.length = 0;
    for (let i = N - 1; i >= 0; i--) {
      const pl = plates[i], ua = i === 0 ? 0 : pl.u - T.dz / 2, ub = i === N - 1 ? T.len : pl.u + T.dz / 2;
      const sv = served(i, t), cheer = cheerAt != null && t > cheerAt + .12;
      const d = dist(W3(pl.u, 0, H));
      if (d > 30) { tableSlice(ctx, ua, ub, false); plate(ctx, pl, sv, t, fall); continue; }
      const gp = guestPose(i, t, sv, cheer);
      guests[i].draw(gp.p, { only: 'base' });
      tableSlice(ctx, ua, ub, i === 0);
      plate(ctx, pl, sv, t, fall);
      guests[i].with(c => forkDraw(c, gp.fork));                       // вилка до руки: кулак поверх черенка
      guests[i].draw(gp.p, { only: 'front' });
    }
    for (const f of falling) f();
  }
  return { plates, guests, C, N, W3, Puv, drawTable, plate };
}
