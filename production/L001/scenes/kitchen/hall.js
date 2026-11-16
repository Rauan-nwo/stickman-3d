// hall.js: «кухня с тысячами поваров» — сетка одинаковых поваров у маленьких плит, все подбрасывают омлет в один миг.
// Пол — three.js (клетка, туман); повара, плиты, лампы — 2D-проекцией по глубине (дальние первыми: ближний всегда
// перекрывает дальнего). Все повара в одной позе в каждый кадр: поза рисуется один раз вектором во внеэкранные слои
// нескольких размеров (и с подмесом тумана), затем штампуется тысячи раз. Ближние (крупнее ~220 px) — вектором.
import { THREE, V, look, keyed, E, clamp, lerp, noirShade } from 'engine';
import { cook, pan, pancake } from './chef.js';

const UNIT = .0017;                               // м на единицу фигуры (фигура с колпаком ~1.8 м)
export const GRID = { cols: 81, rows: 81, sx: 1.6, sz: 1.6 };   // квадрат: сверху читается как кристалл чипа
const STOVE = { h: .74, w: .36, z0: .12, z1: .5, dx: -.26 }; // плита перед поваром: полуширина, ближняя/дальняя кромка от повара (+z к камере)
const FOG = [26, 28, 44], DENS = .03;
const INK = '#141014';
const seg = (t, a, b) => clamp((t - a) / (b - a));

// поза в цикле подброса: u ∈ [0,1] (−1 — покой). big — подброс выше (финальный «в один миг»)
export function flipPose(u, t, big = 1) {
  let hand = [-120, -508], ang = Math.PI + .08, open = .5, fy = 0, spin = 0, lean = 0, look = [0, .1], mouth = 'smile';
  if (u < 0) { hand = [-120 + Math.sin(t * 7) * 6, -508 + Math.cos(t * 7) * 4]; }        // покой: лёгкое покачивание сковороды
  else {
    const dip = Math.sin(clamp(u / .2) * Math.PI) * -1, kick = u < .2 ? 0 : Math.sin(seg(u, .2, .4) * Math.PI);
    hand = [-120 - kick * 10, -508 + dip * -22 - kick * 46]; ang = Math.PI + .08 - kick * .28; open = .5 - kick * .15;
    const fl = seg(u, .24, .86);                                                       // полёт омлета
    if (fl > 0 && fl < 1) { fy = -4 * fl * (1 - fl) * 420 * big; spin = fl * 2; }
    lean = -kick * .03; look = fl > 0 && fl < 1 ? [0, -.8] : [0, .1]; mouth = fl > .1 && fl < .9 ? 'O' : 'smile';
    if (u > .86) { const c = seg(u, .86, 1); hand = [-120, -508 + Math.sin(c * Math.PI) * 14]; }   // поймал — сковорода проседает
  }
  return { hand, ang, open, fy, spin, lean, look, mouth };
}

export function makeHall(stage, o, { flipsAt, bigAt = null, shade = [.25, -1] } = {}) {
  const C = cook(); C.spec.shade = noirShade(shade);
  C.spec.rig = { ...C.spec.rig, armLayer: 'front', plantLegs: .02 };
  // ---------- пол ----------
  const tc = document.createElement('canvas'); tc.width = tc.height = 256; { const x = tc.getContext('2d');
    x.fillStyle = '#b4a081'; x.fillRect(0, 0, 256, 256); x.fillStyle = '#2b2531'; x.fillRect(0, 0, 128, 128); x.fillRect(128, 128, 128, 128);
    x.strokeStyle = 'rgba(15,10,14,.8)'; x.lineWidth = 3; x.strokeRect(0, 0, 256, 256); x.beginPath(); x.moveTo(128, 0); x.lineTo(128, 256); x.moveTo(0, 128); x.lineTo(256, 128); x.stroke(); }
  const tex = new THREE.CanvasTexture(tc); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(220, 220); tex.anisotropy = 16;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshBasicMaterial({ map: tex, color: 0x9c8f86 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(.8, 0, -80);
  const group = new THREE.Group(); group.add(floor); stage.add(group);
  const fogHex = (FOG[0] << 16) | (FOG[1] << 8) | FOG[2];
  const set = { group, look: { bloom: 0, dof: false, fogDensity: o.solo ? 0 : DENS, fogColor: fogHex, bg: o.solo === 'w' ? 0xffffff : o.solo ? 0 : fogHex, vignette: 0, far: 400 } };
  if (o.solo) floor.visible = false;                                  // проверка непрозрачности: повара одни на чёрном/белом

  // ---------- кадры позы (один раз за кадр) ----------
  const S0 = .26, CW = 360, CH = 400, AX = 180, AY = 372;                // опорный масштаб: px на единицу фигуры; якорь — ступни
  const mk = () => { const c = document.createElement('canvas'); c.width = CW; c.height = CH; return c; };
  const LV = 6, MIPS = 4;
  const layers = { base: [], front: [] };
  for (const k of ['base', 'front']) for (let m = 0; m < MIPS; m++) { layers[k][m] = []; for (let f = 0; f < LV; f++) { const c = document.createElement('canvas'); c.width = Math.ceil(CW / 2 ** m); c.height = Math.ceil(CH / 2 ** m); layers[k][m][f] = c; } }
  const master = { base: mk(), front: mk() };
  function poseAt(t) {
    let u = -1, big = 1;
    for (const a of flipsAt) { const isBig = bigAt != null && Math.abs(a - bigAt) < 1e-3, dur = isBig ? 1.05 : .78; if (t >= a && t < a + dur) { u = (t - a) / dur; big = isBig ? 1.55 : 1; } }
    return flipPose(u, t, big);
  }
  function drawCook(x, fp, only) {                                    // вектор в координатах фигуры
    const p = { view: 'front', mouth: fp.mouth, look: fp.look, lean: fp.lean, blink: 0 };
    p.arms = [{ to: fp.hand, w: 11 }, { to: [112, -392], w: 11 }];
    if (only !== 'front') C.draw(x, p, { only: 'base' });
    if (only !== 'base') {
      C.draw(x, p, { only: 'front' });
      const food = (xx, cx, cy, ry) => pancake(xx, cx, cy + fp.fy, 96, Math.max(ry, 50), fp.spin, INK, 7);
      pan(x, fp.hand, fp.ang, { open: fp.open, food });
      ell(x, fp.hand[0], fp.hand[1], 13, 13, INK);                     // кисть поверх ручки
    }
  }
  function ell(x, cx, cy, rx, ry, fill) { x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); x.fillStyle = fill; x.fill(); }
  function buildSprites(fp) {
    for (const k of ['base', 'front']) {
      const c = master[k], x = c.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, CW, CH);
      x.save(); x.translate(AX, AY); x.scale(S0, S0); drawCook(x, fp, k); x.restore();
      let src = c;
      for (let m = 0; m < MIPS; m++) {
        const w = layers[k][m][0].width, h = layers[k][m][0].height;
        for (let f = 0; f < LV; f++) {
          const d = layers[k][m][f], y = d.getContext('2d'); y.setTransform(1, 0, 0, 1, 0, 0); y.globalCompositeOperation = 'source-over'; y.globalAlpha = 1; y.clearRect(0, 0, w, h);
          y.imageSmoothingQuality = 'high'; y.drawImage(src, 0, 0, w, h);
          if (f) { y.globalCompositeOperation = 'source-atop'; y.globalAlpha = f / LV; y.fillStyle = `rgb(${FOG})`; y.fillRect(0, 0, w, h); }
        }
        src = layers[k][m][0];
      }
    }
  }
  // ---------- 2D-проекция ----------
  const P = (x, y, z) => stage.project(V(x, y, z));
  let fogMul = 1;
  const fogK = d => 1 - Math.exp(-DENS * fogMul * d * 1.1);
  const mix = (c, k) => `rgb(${c.map((v, i) => Math.round(v + (FOG[i] - v) * k)).join(',')})`;
  function quad(ctx, pts, fill, lw) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const q of pts.slice(1)) ctx.lineTo(q[0], q[1]); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); if (lw > .3) { ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.stroke(); } }
  function stove(ctx, cx, cz, cam, ppm, k, t) {
    cx += STOVE.dx;                                                   // плита под сковородой (сковорода в левой руке)
    const { h, w, z0, z1 } = STOVE, zb = cz + z0, zf = cz + z1, lw = clamp(ppm * .006, 0, 3.5) * (1 - k * .8);
    const tb = [P(cx - w, h, zb), P(cx + w, h, zb), P(cx + w, h, zf), P(cx - w, h, zf)];
    const fr = [P(cx - w, h, zf), P(cx + w, h, zf), P(cx + w, 0, zf), P(cx - w, 0, zf)];
    if (cam.x < cx - w) quad(ctx, [P(cx - w, h, zb), P(cx - w, h, zf), P(cx - w, 0, zf), P(cx - w, 0, zb)], mix([34, 28, 32], k), lw);
    if (cam.x > cx + w) quad(ctx, [P(cx + w, h, zb), P(cx + w, h, zf), P(cx + w, 0, zf), P(cx + w, 0, zb)], mix([34, 28, 32], k), lw);
    quad(ctx, fr, mix([52, 44, 48], k), lw);
    quad(ctx, tb, mix([96, 84, 82], k), lw);
    if (ppm > 14) for (const bx of [-.16, .16]) {                      // две конфорки на столешнице
      const c = P(cx + bx, h, (zb + zf) / 2), rx = .11 * ppm, ry = Math.abs(P(cx + bx, h, (zb + zf) / 2 + .11)[1] - c[1]);
      ctx.beginPath(); ctx.ellipse(c[0], c[1], rx, Math.max(.5, ry), 0, 0, Math.PI * 2); ctx.fillStyle = mix([30, 24, 28], k); ctx.fill();
      if (lw > .3) { ctx.lineWidth = lw * .7; ctx.strokeStyle = mix([150, 130, 120], k); ctx.stroke(); }
    }
    { const a = P(cx - w, h, zf), b = P(cx + w, h, zf); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineWidth = Math.max(.6, lw * 1.2); ctx.strokeStyle = mix([200, 160, 110], k); ctx.stroke(); }   // тёплый блик на кромке
    if (ppm > 40) {                                                    // детали только вблизи: дверца духовки, ручки, конфорка с огнём
      const a = P(cx - w * .7, h * .78, zf), b = P(cx + w * .7, h * .2, zf);
      ctx.strokeStyle = `rgba(20,14,18,${.8 * (1 - k)})`; ctx.lineWidth = lw; ctx.strokeRect(a[0], a[1], b[0] - a[0], b[1] - a[1]);
      const hb = P(cx - w * .5, h * .7, zf), he = P(cx + w * .5, h * .7, zf); ctx.beginPath(); ctx.moveTo(hb[0], hb[1]); ctx.lineTo(he[0], he[1]); ctx.lineWidth = lw * 1.6; ctx.strokeStyle = mix([200, 170, 120], k); ctx.stroke();
      for (const kx of [-.6, -.3, .3, .6]) { const q = P(cx + w * kx, h * .9, zf); ctx.beginPath(); ctx.arc(q[0], q[1], ppm * .025, 0, Math.PI * 2); ctx.fillStyle = mix([230, 160, 70], k); ctx.fill(); }
      const fc = P(cx - .1, h, (zb + zf) / 2 - .05), r = ppm * .16;     // огонь под сковородой
      const fl = .75 + .25 * Math.sin(t * 31 + cx * 3 + cz);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(fc[0], fc[1], 0, fc[0], fc[1], r * 1.4);
      g.addColorStop(0, `rgba(255,170,70,${.55 * fl * (1 - k)})`); g.addColorStop(.5, `rgba(80,140,255,${.35 * fl * (1 - k)})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(fc[0], fc[1], r * 1.4, r * .5, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
  }
  function lamp(ctx, x, z, ppm, k) {
    const top = P(x, 9, z), a = P(x, 3.5, z), b = P(x, 3.2, z); if (a[2] < .5) return;
    const lw = clamp(ppm * .005, .4, 3);
    ctx.strokeStyle = mix([20, 16, 20], k); ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(top[0], top[1]); ctx.lineTo(a[0], a[1]); ctx.stroke();
    const wt = .12 * ppm, wb = .34 * ppm;
    quad(ctx, [[a[0] - wt, a[1]], [a[0] + wt, a[1]], [b[0] + wb, b[1]], [b[0] - wb, b[1]]], mix([46, 70, 62], k), lw);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; const r = .7 * ppm, g = ctx.createRadialGradient(b[0], b[1], 0, b[0], b[1], r);
    g.addColorStop(0, `rgba(255,214,140,${.9 * (1 - k * .7)})`); g.addColorStop(.25, `rgba(255,180,90,${.35 * (1 - k * .7)})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(b[0] - r, b[1] - r, r * 2, r * 2); ctx.restore();
    ctx.beginPath(); ctx.ellipse(b[0], b[1], wb * .8, wb * .18, 0, 0, Math.PI * 2); ctx.fillStyle = `rgba(255,236,190,${1 - k * .6})`; ctx.fill();
  }
  const lamps = []; for (let i = 0; i < GRID.cols; i += 2) for (let j = 0; j < GRID.rows; j += 2) lamps.push([(i - (GRID.cols - 1) / 2) * GRID.sx + GRID.sx / 2, -j * GRID.sz - GRID.sz / 2]);
  function pools(ctx) {                                                // тёплые пятна света на полу под лампами
    if (o.solo) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const [x, z] of lamps) {
      const c = P(x, 0, z); if (c[2] < .5 || c[0] < -400 || c[0] > stage.W + 400 || c[1] > stage.H + 300) continue;
      const ppm = stage.pxs() / c[2], k = fogK(c[2]); if (k > .93) continue;
      const rx = 1.5 * ppm, ry = Math.abs(P(x, 0, z + 1.5)[1] - c[1]) || rx * .4;
      ctx.save(); ctx.translate(c[0], c[1]); ctx.scale(1, ry / rx);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx); g.addColorStop(0, `rgba(255,170,80,${.32 * (1 - k)})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    ctx.restore();
  }
  // ---------- контур кристалла: рамка вокруг сетки и выводы по краям (виден сверху) ----------
  const GX = (GRID.cols - 1) / 2 * GRID.sx, Z0 = 0, Z1 = -(GRID.rows - 1) * GRID.sz;
  function chipOutline(ctx, a = 1) {
    if (o.solo || a <= 0) return;
    const fq = (pts, fill, stroke, lw) => { const q = pts.map(([x, z]) => P(x, .01, z)); if (q.some(v => v[2] < .5)) return; ctx.beginPath(); q.forEach((v, i) => (i ? ctx.lineTo(v[0], v[1]) : ctx.moveTo(v[0], v[1]))); ctx.closePath(); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.stroke(); } };
    const m1 = 2.2, m2 = 5.5, L = 9, x0 = -GX - m1, x1 = GX + m1, z0 = Z0 + m1, z1 = Z1 - m1;
    ctx.save(); ctx.globalAlpha = a;
    const pk = 'rgba(20,40,32,.92)';                                  // корпус чипа — кольцо вокруг кристалла (пол под поварами не трогаем)
    fq([[x0 - m2, z0 + m2], [x1 + m2, z0 + m2], [x1 + m2, z0], [x0 - m2, z0]], pk); fq([[x0 - m2, z1], [x1 + m2, z1], [x1 + m2, z1 - m2], [x0 - m2, z1 - m2]], pk);
    fq([[x0 - m2, z0], [x0, z0], [x0, z1], [x0 - m2, z1]], pk); fq([[x1, z0], [x1 + m2, z0], [x1 + m2, z1], [x1, z1]], pk);
    fq([[x0 - m2, z0 + m2], [x1 + m2, z0 + m2], [x1 + m2, z1 - m2], [x0 - m2, z1 - m2]], null, '#0b0910', 4);
    const n = 28, gold = '#d9b24a';
    for (let i = 0; i < n; i++) {                                    // выводы по четырём сторонам
      const u = (i + .5) / n, px = lerp(x0, x1, u), pz = lerp(z0, z1, u), w = (x1 - x0) / n * .28;
      fq([[px - w, z0 + m2], [px + w, z0 + m2], [px + w, z0 + m2 + L], [px - w, z0 + m2 + L]], gold, '#0b0910', 2);
      fq([[px - w, z1 - m2], [px + w, z1 - m2], [px + w, z1 - m2 - L], [px - w, z1 - m2 - L]], gold, '#0b0910', 2);
      fq([[x0 - m2, pz - w], [x0 - m2, pz + w], [x0 - m2 - L, pz + w], [x0 - m2 - L, pz - w]], gold, '#0b0910', 2);
      fq([[x1 + m2, pz - w], [x1 + m2, pz + w], [x1 + m2 + L, pz + w], [x1 + m2 + L, pz - w]], gold, '#0b0910', 2);
    }
    ctx.restore();
    // светящаяся граница кристалла поверх пола (под поварами)
    ctx.save(); ctx.globalAlpha = a; ctx.globalCompositeOperation = 'lighter';
    fq([[x0, z0], [x1, z0], [x1, z1], [x0, z1]], null, 'rgba(120,255,170,.55)', 5);
    ctx.restore();
  }
  // ---------- кадр ----------
  function draw(t) {
    const ctx = stage.ctx, cam = stage.camera.position, fp = poseAt(t);
    buildSprites(fp);
    const items = [];
    for (let j = GRID.rows - 1; j >= 0; j--) for (let i = 0; i < GRID.cols; i++) items.push([-j * GRID.sz, 0, (i - (GRID.cols - 1) / 2) * GRID.sx]);
    for (const [x, z] of lamps) items.push([z, 1, x]);
    items.sort((a, b) => a[0] - b[0] || a[1] - b[1]);                  // дальние первыми; в одном ряду — повар, затем лампы над проходом
    let n = 0;
    for (const [z, kind, x] of items) {
      const f = P(x, 0, z); if (f[2] < .4) continue;
      const ppm = stage.pxs() / f[2];
      if (f[0] < -ppm * 2 || f[0] > stage.W + ppm * 2 || f[1] < -ppm * 4 || f[1] > stage.H + ppm * 4) continue;
      const k = fogK(f[2]); if (k > .975) continue;
      if (kind === 1) { lamp(ctx, x, z, ppm, k); continue; }
      n++;
      const s = ppm * UNIT;                                            // px на единицу фигуры
      const hpx = s * 1050, lv = Math.min(LV - 1, Math.round(k * LV));
      if (hpx > 230) {
        ctx.save(); ctx.translate(f[0], f[1]); ctx.scale(s, s); drawCook(ctx, fp, 'base'); ctx.restore();
        stove(ctx, x, z, cam, ppm, k, t);
        ctx.save(); ctx.translate(f[0], f[1]); ctx.scale(s, s); drawCook(ctx, fp, 'front'); ctx.restore();
      } else {
        const sc = s / S0; let m = 0; while (m + 1 < MIPS && sc < .5 ** (m + 1) * 1.05) m++;
        const w = CW * sc, h = CH * sc, x0 = f[0] - AX * sc, y0 = f[1] - AY * sc;
        if (h > 2.5) ctx.drawImage(layers.base[m][lv], x0, y0, w, h);
        stove(ctx, x, z, cam, ppm, k, t);
        if (h > 2.5) ctx.drawImage(layers.front[m][lv], x0, y0, w, h);
        if (fp.fy < -60 && hpx < 70) {                                 // издали блин в воздухе — тёплая точка (поле блинов читается)
          const bx = f[0] + (-120 - 203) * s, by = f[1] + (-515 + fp.fy) * s, r = Math.max(1.6, 70 * s);
          ctx.fillStyle = `rgba(255,${190 - k * 60 | 0},90,${1 - k * .6})`; ctx.beginPath(); ctx.ellipse(bx, by, r * 1.3, r, 0, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
    return n;
  }
  return { set, draw, pools, poseAt, chipOutline, setFog: m => { fogMul = m; }, GX, Z1 };
}
