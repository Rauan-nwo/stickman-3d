// templates/map.js: нуарная карта — тёмно-синее море, суша умброй с cel-тенью и контуром тушью, лампа сверху.
//   noirMap(ctx, t, { view, labels, pins, routes, border, highlight, focus })
//     view      { c: [lon, lat], span: градусов долготы на ширину кадра } | 'sea' | 'pacific'
//               (по умолчанию ЮВА: [110, 10], 72; 'pacific' — Тихий океан: Китай и Тайвань слева, США справа)
//     labels    [{ text, at: [lon, lat], size, color }]                      — подписи стран (впечатаны в карту)
//     pins      [{ id, label, at: [lon, lat] | 'singapore', t0, side: 1|-1, dy }] — булавки выскакивают в t0 (dy — сдвиг подписи)
//     routes    [{ from, to, t0, t1, bend, stop: 0..1, color, plane, arrow, both }] — пунктир бежит от from к to за t0..t1;
//               stop < 1 — маршрут обрывается на этой доле (у границы), в t1 там ставится красный крест;
//               plane: true — самолётик летит по голове маршрута; arrow: true — стрелка на конце; both: true — на обоих
//     border    { id: 'china', t0 }                                         — событие: граница вспыхивает красным
//     highlight ['usa', 'china', 'taiwan']                                  — страны тонируются и обводятся тушью
//     focus     [lon, lat] — куда наезжает камера
// Долготы можно писать как удобно (-120 или 240): каждый контур разворачивается вокруг центра вида, маршруты через
// линию перемены дат идут коротким путём над Тихим океаном.
import { clamp, lerp, E } from '../core/ease.js';
import { NOIR, FONT, dims, camPush, kick, vignette, grain, lampPool, coldShade, cached, partial, polyline, wobble, marker, hashS } from './noir.js';
import { LAND, REGIONS, BORDERS, PLACES, REGION_TINT, MAP_VIEWS } from './mapData.js';

const merc = lat => Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)) * 180 / Math.PI;
const viewOf = v => (typeof v === 'string' ? MAP_VIEWS[v] : v) || MAP_VIEWS.sea;
export function mapProjection(W, H, view = {}) {
  const v = viewOf(view), c = v.c || [110, 10], span = v.span || 72, s = W / span, mc = merc(c[1]);
  return ([lon, lat]) => [W / 2 + (lon - c[0]) * s, H / 2 - (merc(lat) - mc) * s];
}
// долгота, ближайшая к ref (с точностью до 360°)
const near = (lon, ref) => lon + 360 * Math.round((ref - lon) / 360);
// контур без разрывов: первая точка — ближайшая к центру вида, каждая следующая — ближайшая к предыдущей
function unwrap(pts, c0) { let prev = c0; return pts.map(([lon, lat]) => { prev = near(lon, prev); return [prev, lat]; }); }
const place = p => (typeof p === 'string' ? PLACES[p] : p);

function landPath(ctx, P, pts, dx = 0, dy = 0) { pts.forEach((q, i) => { const [x, y] = P(q); i ? ctx.lineTo(x + dx, y + dy) : ctx.moveTo(x + dx, y + dy); }); ctx.closePath(); }

// статичная карта (кэш по виду и подписям): море, сетка, береговые «водные линии», суша cel, Китай, подписи
function baseMap(W, H, view, labels, region, highlight) {
  const key = 'map' + W + 'x' + H + JSON.stringify(view) + JSON.stringify(labels) + region + (highlight || []).join(), pad = 120;
  return cached(key, W + pad * 2, H + pad * 2, (x) => {
    x.translate(pad, pad);
    const v = viewOf(view), c0 = (v.c || [110, 10])[0], P = mapProjection(W, H, v), U = pts => unwrap(pts, c0);
    const sea = x.createLinearGradient(0, -pad, 0, H + pad); sea.addColorStop(0, '#132241'); sea.addColorStop(1, '#0b1428');
    x.fillStyle = sea; x.fillRect(-pad, -pad, W + pad * 2, H + pad * 2);
    // сетка широт и долгот (каждые 10°)
    x.strokeStyle = 'rgba(127,184,255,.11)'; x.lineWidth = 2; x.setLineDash([3, 9]);
    for (let lon = Math.floor((c0 - 200) / 10) * 10; lon <= c0 + 200; lon += 10) { x.beginPath(); const [a] = P([lon, 0]); x.moveTo(a, -pad); x.lineTo(a, H + pad); x.stroke(); }
    for (let lat = -70; lat <= 80; lat += 10) { x.beginPath(); const [, b] = P([0, lat]); x.moveTo(-pad, b); x.lineTo(W + pad, b); x.stroke(); }
    x.setLineDash([]);
    const all = Object.values(LAND).filter(p => p.length).map(U);
    // «водные линии» вдоль берегов (как на старых картах): широкие полупрозрачные обводки
    for (const [w, a] of [[46, .035], [28, .05], [14, .07]]) { x.lineJoin = 'round'; x.strokeStyle = `rgba(127,184,255,${a})`; x.lineWidth = w; for (const pts of all) { x.beginPath(); landPath(x, P, pts); x.stroke(); } }
    // суша: cel в два тона — освещённая (лампа сверху-слева) и теневая полоса по нижне-правому берегу
    const paint = (pts, lit, shade) => {
      x.save(); x.beginPath(); landPath(x, P, pts); x.clip();
      x.fillStyle = shade; x.fillRect(-pad, -pad, W + pad * 2, H + pad * 2);
      x.beginPath(); landPath(x, P, pts, -7, -9); x.fillStyle = lit; x.fill();
      x.restore();
    };
    for (const pts of all) paint(pts, '#5b4a32', '#33291d');
    if (region && REGIONS[region]) {                                    // выделенная страна — тёмно-красная
      x.save(); x.beginPath(); landPath(x, P, U(LAND.mainland)); x.clip(); paint(U(REGIONS[region]), '#5e2a25', '#3a1714'); x.restore();
    }
    // highlight: несколько стран своим тоном, обрезка по суше, тонкий контур тушью по границе страны
    for (const id of highlight || []) {
      const R = REGIONS[id]; if (!R) continue;
      const [lit, shade] = REGION_TINT[id] || ['#6b5636', '#3d3122'], pts = U(R);
      x.save(); x.beginPath(); for (const L of all) landPath(x, P, L); x.clip(); paint(pts, lit, shade);
      x.lineJoin = 'round'; x.strokeStyle = 'rgba(11,9,16,.8)'; x.lineWidth = 2.5; x.setLineDash([10, 6]); x.beginPath(); landPath(x, P, pts); x.stroke(); x.setLineDash([]); x.restore();
    }
    x.lineJoin = 'round'; x.strokeStyle = NOIR.ink; x.lineWidth = 4;
    for (const pts of all) { x.beginPath(); landPath(x, P, pts); x.stroke(); }
    // подписи стран: кремовые, разрядка, пишмашинка
    for (const L of labels || []) {
      const q = place(L.at), [lx, ly] = P([near(q[0], c0), q[1]]); x.font = `bold ${L.size || 34}px ${FONT.type}`; x.letterSpacing = `${(L.size || 34) * .35}px`; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.lineWidth = 6; x.strokeStyle = 'rgba(11,9,16,.85)'; x.strokeText(L.text, lx, ly); x.fillStyle = L.color || 'rgba(241,230,204,.82)'; x.fillText(L.text, lx, ly);
    }
    x.letterSpacing = '0px';
  });
}

function mapPin(ctx, x, y, k, color = NOIR.red) {
  if (k <= 0) return;
  ctx.save(); ctx.translate(x, y); const s = E.outBack(k, 2.2); ctx.scale(s, s);
  ctx.fillStyle = 'rgba(2,4,12,.5)'; ctx.beginPath(); ctx.ellipse(12, 2, 16, 6, 0, 0, 6.283); ctx.fill();          // тень на «земле»
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(-8, -18, -22, -30, -22, -46); ctx.arc(0, -46, 22, Math.PI, 0); ctx.bezierCurveTo(22, -30, 8, -18, 0, 0); ctx.closePath();
  ctx.fillStyle = color; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = NOIR.ink; ctx.stroke();
  ctx.save(); ctx.clip(); ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.arc(10, -40, 24, 0, 6.283); ctx.fill(); ctx.restore();   // cel-тень справа
  ctx.fillStyle = NOIR.cream; ctx.strokeStyle = NOIR.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, -46, 8, 0, 6.283); ctx.fill(); ctx.stroke();
  ctx.restore();
}
function pinLabel(ctx, x, y, text, k, side = 1, dy = 0) {
  if (k <= 0 || !text) return;
  ctx.save(); ctx.globalAlpha = clamp(k * 1.4); ctx.font = `bold 28px ${FONT.type}`; ctx.letterSpacing = '3px'; ctx.textBaseline = 'middle';
  const w = ctx.measureText(text).width + 30, h = 44, bx = side > 0 ? x + 30 : x - 30 - w, by = y - 70 + dy;
  const cw = w * E.outCubic(k);
  ctx.beginPath(); ctx.rect(bx + (side > 0 ? 0 : w - cw), by - 4, cw, h + 20); ctx.clip();
  ctx.fillStyle = 'rgba(2,4,12,.5)'; ctx.fillRect(bx + 7, by + 8, w, h);
  ctx.fillStyle = '#0e1222'; ctx.fillRect(bx, by, w, h); ctx.lineWidth = 3; ctx.strokeStyle = NOIR.ink; ctx.strokeRect(bx, by, w, h);
  ctx.fillStyle = NOIR.amber; ctx.fillRect(side > 0 ? bx : bx + w - 6, by, 6, h);
  ctx.fillStyle = NOIR.cream; ctx.fillText(text, bx + 17, by + h / 2 + 1);
  ctx.restore();
}
function routePts(P, r, c0) {
  const A = place(r.from), B = place(r.to), la = near(A[0], c0), lb = near(B[0], la);   // конец маршрута — коротким путём от начала
  const a = P([la, A[1]]), b = P([lb, B[1]]), mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1], bend = r.bend ?? .18;
  const cx = mx - dy * bend, cy = my + dx * bend, pts = [];
  for (let i = 0; i <= 60; i++) { const k = i / 60, u = 1 - k; pts.push([u * u * a[0] + 2 * u * k * cx + k * k * b[0], u * u * a[1] + 2 * u * k * cy + k * k * b[1]]); }
  return pts;
}
// самолётик сверху: кремовый силуэт с контуром тушью и жёсткой тенью, нос по направлению маршрута
function plane(ctx, x, y, ang, s = 1) {
  const body = () => {
    ctx.beginPath(); ctx.moveTo(30, 0); ctx.quadraticCurveTo(26, -5, 16, -5); ctx.lineTo(4, -5); ctx.lineTo(-6, -30); ctx.lineTo(-14, -30); ctx.lineTo(-8, -5); ctx.lineTo(-20, -5);
    ctx.lineTo(-27, -15); ctx.lineTo(-32, -15); ctx.lineTo(-28, 0); ctx.lineTo(-32, 15); ctx.lineTo(-27, 15); ctx.lineTo(-20, 5); ctx.lineTo(-8, 5); ctx.lineTo(-14, 30); ctx.lineTo(-6, 30);
    ctx.lineTo(4, 5); ctx.lineTo(16, 5); ctx.quadraticCurveTo(26, 5, 30, 0); ctx.closePath();
  };
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.save(); ctx.translate(10, 14); ctx.rotate(ang); body(); ctx.fillStyle = 'rgba(2,4,12,.5)'; ctx.fill(); ctx.restore();
  ctx.rotate(ang); body(); ctx.fillStyle = NOIR.cream; ctx.fill(); ctx.lineWidth = 3.5; ctx.lineJoin = 'round'; ctx.strokeStyle = NOIR.ink; ctx.stroke();
  ctx.fillStyle = 'rgba(20,32,70,.35)'; ctx.fillRect(-20, 0, 40, 5);                                                       // cel-тень по нижней половине
  ctx.restore();
}
function arrowHead(ctx, tip, from, col) {
  const ang = Math.atan2(tip[1] - from[1], tip[0] - from[0]);
  ctx.save(); ctx.translate(tip[0], tip[1]); ctx.rotate(ang);
  ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-20, -13); ctx.lineTo(-14, 0); ctx.lineTo(-20, 13); ctx.closePath();
  ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.strokeStyle = NOIR.ink; ctx.stroke(); ctx.restore();
}

export function noirMap(ctx, t, o = {}) {
  const [W, H] = dims(ctx, o);
  const { labels = [], pins = [], routes = [], border = null, highlight = null, dur = 3, focus = null, zoom = 1.12, region = border?.id || null, seed = 9 } = o;
  const view = viewOf(o.view || { c: [110, 10], span: 72 }), c0 = (view.c || [110, 10])[0];
  const P = mapProjection(W, H, view), PP = q => { const p = place(q); return P([near(p[0], c0), p[1]]); };
  const [fx, fy] = focus ? PP(focus) : [W / 2, H / 2];
  const hit = border ? border.t0 : 99;
  ctx.save();
  camPush(ctx, W, H, t, { dur, from: 1.0, to: zoom, fx, fy, drift: 3, seed });
  ctx.translate(kick(t, hit, 7), kick(t, hit + .01, 4));
  ctx.drawImage(baseMap(W, H, view, labels, region, highlight), -120, -120);
  lampPool(ctx, W * .42, H * .18, H * 1.05, 1.1); coldShade(ctx, W, H, .55);
  // граница: красный пунктир тушью дорисовывается, затем мягко пульсирует
  if (border && BORDERS[border.id]) {
    const bk = E.outCubic(clamp((t - border.t0) / .5));
    if (bk > 0) {
      const pts = partial(unwrap(BORDERS[border.id], c0).map(P), bk);
      ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      polyline(ctx, pts); ctx.strokeStyle = `rgba(${NOIR.redRGB},${(.3 + .15 * Math.sin((t - border.t0) * 7)).toFixed(3)})`; ctx.lineWidth = 22; ctx.stroke();
      polyline(ctx, pts); ctx.strokeStyle = NOIR.ink; ctx.lineWidth = 10; ctx.stroke();
      polyline(ctx, pts); ctx.strokeStyle = NOIR.redHi; ctx.lineWidth = 6; ctx.setLineDash([16, 10]); ctx.stroke();
      ctx.restore();
    }
  }
  // маршруты: янтарный пунктир «бежит» (смещение штрихов), конец — точка-голова или самолётик
  const planes = [];
  for (const r of routes) {
    const k = E.inOutSine(clamp((t - r.t0) / (r.t1 - r.t0))), stop = r.stop ?? 1;
    if (k <= 0) continue;
    const full = routePts(P, r, c0), pts = partial(full, k * stop), head = pts[pts.length - 1], col = r.color || NOIR.amber;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    polyline(ctx, pts); ctx.strokeStyle = 'rgba(11,9,16,.85)'; ctx.lineWidth = 11; ctx.setLineDash([20, 14]); ctx.lineDashOffset = -t * 36; ctx.stroke();
    polyline(ctx, pts); ctx.strokeStyle = col; ctx.lineWidth = 5.5; ctx.stroke();
    ctx.setLineDash([]);
    if (k < 1 && !r.plane) { ctx.fillStyle = col; ctx.strokeStyle = NOIR.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(head[0], head[1], 9, 0, 6.283); ctx.fill(); ctx.stroke(); }
    ctx.restore();
    // стрелки на концах (появляются, когда маршрут дорисован)
    if (k >= 1 && stop >= 1) { if (r.arrow || r.both) arrowHead(ctx, full[full.length - 1], full[full.length - 4], col); if (r.both) arrowHead(ctx, full[0], full[3], col); }
    // самолётик: летит по голове маршрута, после прилёта ещё 0.3 с стоит и тает
    if (r.plane) {
      const fade = 1 - clamp((t - r.t1) / .3);
      if (fade > 0) { const i = Math.max(1, pts.length - 1), a = pts[Math.max(0, i - 2)], ang = Math.atan2(head[1] - a[1], head[0] - a[0]); planes.push([head[0], head[1], pts.length > 2 ? ang : Math.atan2(full[2][1] - full[0][1], full[2][0] - full[0][0]), fade, r.planeSize || 1]); }
    }
    // обрыв у границы: красный крест маркером
    if (stop < 1) {
      const xk = clamp((t - r.t1) / .3), [hx, hy] = head, s = 30;
      if (xk > 0) {
        marker(ctx, partial(wobble([[hx - s, hy - s], [hx + s, hy + s]], 2, 3, 8), E.outCubic(clamp(xk * 2))), { w: 11 });
        marker(ctx, partial(wobble([[hx + s, hy - s], [hx - s, hy + s]], 2, 4, 8), E.outCubic(clamp(xk * 2 - 1))), { w: 11 });
      }
    }
  }
  for (const p of pins) { const [x, y] = PP(p.at), k = clamp((t - (p.t0 ?? 0)) / .35); mapPin(ctx, x, y, k, p.color); pinLabel(ctx, x, y, p.label, clamp((t - (p.t0 ?? 0) - .15) / .35), p.side ?? 1, p.dy ?? 0); }
  for (const [x, y, ang, a, s] of planes) { ctx.save(); ctx.globalAlpha = a; plane(ctx, x, y, ang, s); ctx.restore(); }   // самолёты поверх булавок
  ctx.restore();
  vignette(ctx, W, H, .6); grain(ctx, W, H, t, .08);
}
