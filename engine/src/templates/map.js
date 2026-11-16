// templates/map.js: нуарная карта — тёмно-синее море, суша умброй с cel-тенью и контуром тушью, лампа сверху.
//   noirMap(ctx, t, { view, labels, pins, routes, border, focus })
//     view   { c: [lon, lat], span: градусов долготы на ширину кадра }      (по умолчанию ЮВА: [110, 10], 72)
//     labels [{ text, at: [lon, lat], size }]                               — подписи стран (впечатаны в карту)
//     pins   [{ id, label, at: [lon, lat] | 'singapore', t0, side: 1|-1 }]  — булавки выскакивают в t0
//     routes [{ from, to, t0, t1, bend, stop: 0..1, color }]               — пунктир бежит от from к to за t0..t1;
//            stop < 1 — маршрут обрывается на этой доле (у границы), в t1 там ставится красный крест
//     border { id: 'china', t0 }                                            — событие: граница вспыхивает красным
//     focus  [lon, lat] — куда наезжает камера
import { clamp, lerp, E } from '../core/ease.js';
import { NOIR, FONT, dims, camPush, kick, vignette, grain, lampPool, coldShade, cached, partial, polyline, wobble, marker, hashS } from './noir.js';
import { LAND, REGIONS, BORDERS, PLACES } from './mapData.js';

const merc = lat => Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)) * 180 / Math.PI;
export function mapProjection(W, H, view = {}) {
  const c = view.c || [110, 10], span = view.span || 72, s = W / span, mc = merc(c[1]);
  return ([lon, lat]) => [W / 2 + (lon - c[0]) * s, H / 2 - (merc(lat) - mc) * s];
}
const place = p => (typeof p === 'string' ? PLACES[p] : p);

function landPath(ctx, P, pts, dx = 0, dy = 0) { pts.forEach((q, i) => { const [x, y] = P(q); i ? ctx.lineTo(x + dx, y + dy) : ctx.moveTo(x + dx, y + dy); }); ctx.closePath(); }

// статичная карта (кэш по виду и подписям): море, сетка, береговые «водные линии», суша cel, Китай, подписи
function baseMap(W, H, view, labels, region) {
  const key = 'map' + W + 'x' + H + JSON.stringify(view) + JSON.stringify(labels) + region, pad = 120;
  return cached(key, W + pad * 2, H + pad * 2, (x) => {
    x.translate(pad, pad);
    const P = mapProjection(W, H, view);
    const sea = x.createLinearGradient(0, -pad, 0, H + pad); sea.addColorStop(0, '#132241'); sea.addColorStop(1, '#0b1428');
    x.fillStyle = sea; x.fillRect(-pad, -pad, W + pad * 2, H + pad * 2);
    // сетка широт и долгот
    x.strokeStyle = 'rgba(127,184,255,.11)'; x.lineWidth = 2; x.setLineDash([3, 9]);
    for (let lon = 60; lon <= 160; lon += 10) { x.beginPath(); const [a] = P([lon, 0]); x.moveTo(a, -pad); x.lineTo(a, H + pad); x.stroke(); }
    for (let lat = -30; lat <= 50; lat += 10) { x.beginPath(); const [, b] = P([0, lat]); x.moveTo(-pad, b); x.lineTo(W + pad, b); x.stroke(); }
    x.setLineDash([]);
    const all = Object.values(LAND);
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
      x.save(); x.beginPath(); landPath(x, P, LAND.mainland); x.clip(); paint(REGIONS[region], '#5e2a25', '#3a1714'); x.restore();
    }
    x.lineJoin = 'round'; x.strokeStyle = NOIR.ink; x.lineWidth = 4;
    for (const pts of all) { x.beginPath(); landPath(x, P, pts); x.stroke(); }
    // подписи стран: кремовые, разрядка, пишмашинка
    for (const L of labels || []) {
      const [lx, ly] = P(place(L.at)); x.font = `bold ${L.size || 34}px ${FONT.type}`; x.letterSpacing = `${(L.size || 34) * .35}px`; x.textAlign = 'center'; x.textBaseline = 'middle';
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
function pinLabel(ctx, x, y, text, k, side = 1) {
  if (k <= 0 || !text) return;
  ctx.save(); ctx.globalAlpha = clamp(k * 1.4); ctx.font = `bold 28px ${FONT.type}`; ctx.letterSpacing = '3px'; ctx.textBaseline = 'middle';
  const w = ctx.measureText(text).width + 30, h = 44, bx = side > 0 ? x + 30 : x - 30 - w, by = y - 70;
  const cw = w * E.outCubic(k);
  ctx.beginPath(); ctx.rect(bx + (side > 0 ? 0 : w - cw), by - 4, cw, h + 20); ctx.clip();
  ctx.fillStyle = 'rgba(2,4,12,.5)'; ctx.fillRect(bx + 7, by + 8, w, h);
  ctx.fillStyle = '#0e1222'; ctx.fillRect(bx, by, w, h); ctx.lineWidth = 3; ctx.strokeStyle = NOIR.ink; ctx.strokeRect(bx, by, w, h);
  ctx.fillStyle = NOIR.amber; ctx.fillRect(side > 0 ? bx : bx + w - 6, by, 6, h);
  ctx.fillStyle = NOIR.cream; ctx.fillText(text, bx + 17, by + h / 2 + 1);
  ctx.restore();
}
function routePts(P, r) {
  const a = P(place(r.from)), b = P(place(r.to)), mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1], bend = r.bend ?? .18;
  const cx = mx - dy * bend, cy = my + dx * bend, pts = [];
  for (let i = 0; i <= 60; i++) { const k = i / 60, u = 1 - k; pts.push([u * u * a[0] + 2 * u * k * cx + k * k * b[0], u * u * a[1] + 2 * u * k * cy + k * k * b[1]]); }
  return pts;
}

export function noirMap(ctx, t, o = {}) {
  const [W, H] = dims(ctx, o);
  const { view = { c: [110, 10], span: 72 }, labels = [], pins = [], routes = [], border = null, dur = 3, focus = null, zoom = 1.12, region = border?.id || null, seed = 9 } = o;
  const P = mapProjection(W, H, view), [fx, fy] = focus ? P(place(focus)) : [W / 2, H / 2];
  const hit = border ? border.t0 : 99;
  ctx.save();
  camPush(ctx, W, H, t, { dur, from: 1.0, to: zoom, fx, fy, drift: 3, seed });
  ctx.translate(kick(t, hit, 7), kick(t, hit + .01, 4));
  ctx.drawImage(baseMap(W, H, view, labels, region), -120, -120);
  lampPool(ctx, W * .42, H * .18, H * 1.05, 1.1); coldShade(ctx, W, H, .55);
  // граница: красный пунктир тушью дорисовывается, затем мягко пульсирует
  if (border && BORDERS[border.id]) {
    const bk = E.outCubic(clamp((t - border.t0) / .5));
    if (bk > 0) {
      const pts = partial(BORDERS[border.id].map(P), bk);
      ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      polyline(ctx, pts); ctx.strokeStyle = `rgba(${NOIR.redRGB},${(.3 + .15 * Math.sin((t - border.t0) * 7)).toFixed(3)})`; ctx.lineWidth = 22; ctx.stroke();
      polyline(ctx, pts); ctx.strokeStyle = NOIR.ink; ctx.lineWidth = 10; ctx.stroke();
      polyline(ctx, pts); ctx.strokeStyle = NOIR.redHi; ctx.lineWidth = 6; ctx.setLineDash([16, 10]); ctx.stroke();
      ctx.restore();
    }
  }
  // маршруты: янтарный пунктир «бежит» (смещение штрихов), конец — точка-голова
  for (const r of routes) {
    const k = E.inOutSine(clamp((t - r.t0) / (r.t1 - r.t0))), stop = r.stop ?? 1;
    if (k <= 0) continue;
    const pts = partial(routePts(P, r), k * stop), head = pts[pts.length - 1], col = r.color || NOIR.amber;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    polyline(ctx, pts); ctx.strokeStyle = 'rgba(11,9,16,.85)'; ctx.lineWidth = 11; ctx.setLineDash([20, 14]); ctx.lineDashOffset = -t * 36; ctx.stroke();
    polyline(ctx, pts); ctx.strokeStyle = col; ctx.lineWidth = 5.5; ctx.stroke();
    ctx.setLineDash([]);
    if (k < 1) { ctx.fillStyle = col; ctx.strokeStyle = NOIR.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(head[0], head[1], 9, 0, 6.283); ctx.fill(); ctx.stroke(); }
    ctx.restore();
    // обрыв у границы: красный крест маркером
    if (stop < 1) {
      const xk = clamp((t - r.t1) / .3), [hx, hy] = head, s = 30;
      if (xk > 0) {
        marker(ctx, partial(wobble([[hx - s, hy - s], [hx + s, hy + s]], 2, 3, 8), E.outCubic(clamp(xk * 2))), { w: 11 });
        marker(ctx, partial(wobble([[hx + s, hy - s], [hx - s, hy + s]], 2, 4, 8), E.outCubic(clamp(xk * 2 - 1))), { w: 11 });
      }
    }
  }
  for (const p of pins) { const [x, y] = P(place(p.at)), k = clamp((t - (p.t0 ?? 0)) / .35); mapPin(ctx, x, y, k, p.color); pinLabel(ctx, x, y, p.label, clamp((t - (p.t0 ?? 0) - .15) / .35), p.side ?? 1); }
  ctx.restore();
  vignette(ctx, W, H, .6); grain(ctx, W, H, t, .08);
}
