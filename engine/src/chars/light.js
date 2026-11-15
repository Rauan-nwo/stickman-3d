// light.js: НЕОБЯЗАТЕЛЬНЫЙ свет сцены на плоском герое (канал лонгов). По умолчанию выключен: без light герой рисуется
// как раньше — чисто белая голова, сцена его не трогает (шортсы V001/V002 не меняются).
//
//   new Actor(stage, char, { light: { ... } })   или   actor.draw(pose, { light: { ... } })
//   light = {
//     ambient: { color: '#3a4a6a', k: .18 },                       // общий тон: multiply по всей фигуре (k — сила 0..1)
//     key:  { dir: [1, -.3], color: '#5a3a3a', k: .45, width: 60, soft: 40, cel: false },   // форма: тень на стороне ОТ света; cel — два тона, чёткая граница
//     rim:  [{ dir: [1, -.2], color: '#ffc27a', k: .7, width: 10, inset: 11, below: -586 }],   // below — только ниже этой y фигуры  // контровые края со стороны света: краска цвета источника внутри контура (на белой голове — тёплый/холодный ободок)
//     shadow: { dx: -14, dy: 6, blur: 9, k: .45, color: 'rgb(8,3,6)' }, // падающая тень силуэта на то, что за героем
//     stripes: { color: '#7fb8ff', k: .2, angle: -.4, period: 60, duty: .45 },  // полосы света сквозь жалюзи (period — в единицах фигуры)
//   }
// dir — направление НА источник в экранных координатах (x вправо, y вниз). width / soft — в единицах рисунка фигуры
// (масштабируются вместе с ней), для силуэта ~1000 ед. Тонкие части (ноги-палки) свет почти не получают: полосы
// гасятся маской из размытого силуэта, иначе палка целиком становится «краем».
const cache = new Map();
function buf(i, W, H) { let c = cache.get(i); if (!c || c.width !== W || c.height !== H) { c = document.createElement('canvas'); c.width = W; c.height = H; cache.set(i, c); } const x = c.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.filter = 'none'; x.clearRect(0, 0, W, H); return [c, x]; }
const norm = d => { const l = Math.hypot(d[0], d[1]) || 1; return [d[0] / l, d[1] / l]; };

// полоса силуэта со стороны dir шириной w px, размытая на soft px, залитая color; масштаб «толщины» — mask
function band(A, W, H, dir, w, soft, color, thick, inset = 0) {
  // точки фигуры, у которых сдвиг на inset к свету ещё внутри, а на inset + w — уже снаружи: полоса у края со стороны dir,
  // отступившая внутрь на inset (чтобы не высветлять чернильный контур)
  const [c, x] = buf('band', W, H), [dx, dy] = norm(dir);
  x.drawImage(A, -dx * inset, -dy * inset); x.globalCompositeOperation = 'source-in'; x.fillStyle = color; x.fillRect(0, 0, W, H);
  x.globalCompositeOperation = 'destination-out'; x.filter = soft > .5 ? `blur(${soft}px)` : 'none'; x.drawImage(A, -dx * (inset + w), -dy * (inset + w)); x.filter = 'none';
  x.globalCompositeOperation = 'destination-in'; x.drawImage(A, 0, 0);                                    // только внутри фигуры
  if (thick) { x.filter = `blur(${thick}px)`; x.drawImage(A, 0, 0); x.drawImage(A, 0, 0); x.filter = 'none'; }   // гасим на тонких частях
  return c;
}

// нарисовать героя со светом: draw(ctx) рисует фигуру в экранных координатах; s — пикселей на единицу рисунка
export function drawLit(ctx, W, H, s, draw, L) {
  const [A, ax] = buf('fig', W, H);
  draw(ax);
  const [S, sx] = buf('sil', W, H); sx.drawImage(A, 0, 0);                       // исходный силуэт (маска и источник полос)
  const thick = Math.max(2, 9 * s);
  if (L.shadow) {
    const sh = L.shadow, [c, x] = buf('sh', W, H);
    x.drawImage(S, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = sh.color || 'rgb(8,3,6)'; x.fillRect(0, 0, W, H);
    ctx.save(); ctx.filter = `blur(${sh.blur ?? 9}px)`; ctx.globalAlpha = sh.k ?? .45; ctx.drawImage(c, sh.dx ?? -14, sh.dy ?? 6); ctx.restore();
  }
  if (L.ambient && L.ambient.k > 0) { ax.save(); ax.globalCompositeOperation = 'source-atop'; ax.globalAlpha = L.ambient.k; ax.fillStyle = L.ambient.color; ax.fillRect(0, 0, W, H); ax.restore(); }
  if (L.key && L.key.k > 0) {                                                     // тень формы: на стороне от света
    const k = L.key, b = band(S, W, H, [-k.dir[0], -k.dir[1]], (k.width ?? 60) * s, k.cel ? 0 : (k.soft ?? 40) * s, k.color || '#2a1a2a', k.cel ? 0 : thick);   // cel: ступенчатая тень с чёткой границей
    ax.save(); ax.globalCompositeOperation = 'multiply'; ax.globalAlpha = k.k; ax.drawImage(b, 0, 0); ax.restore();
  }
  for (const r of L.rim || []) {                                                  // контровые края
    if (!(r.k > 0)) continue;
    const b = band(S, W, H, r.dir, (r.width ?? 10) * s, (r.soft ?? 2) * s, r.color || '#ffc27a', thick, (r.inset ?? 11) * s);
    if (r.clipY != null) b.getContext('2d').clearRect(0, 0, W, r.clipY);          // край только ниже линии (например, ниже шеи — без «пластика» на волосах и шляпе)
    ax.save(); ax.globalCompositeOperation = 'source-atop'; ax.globalAlpha = r.k; ax.drawImage(b, 0, 0); ax.restore();
  }
  // multiply/screen по прозрачному фону могут «запачкать» альфу — обрезаем по исходному силуэту
  if (L.stripes && L.stripes.k > 0) {                                             // полосы света сквозь жалюзи: наклонные полосы цвета источника
    const st = L.stripes, per = (st.period ?? 60) * s;
    ax.save(); ax.globalCompositeOperation = 'source-atop'; ax.globalAlpha = st.k; ax.fillStyle = st.color || '#7fb8ff';
    ax.translate(st.cx ?? W / 2, st.cy ?? H / 2); ax.rotate(st.angle ?? -.4);
    for (let y = -H * 1.5 + (st.phase ?? 0) * per; y < H * 1.5; y += per) ax.fillRect(-W * 1.5, y, W * 3, per * (st.duty ?? .45));
    ax.restore();
  }
  ax.save(); ax.globalCompositeOperation = 'destination-in'; ax.drawImage(S, 0, 0); ax.restore();
  ctx.drawImage(A, 0, 0);
}
