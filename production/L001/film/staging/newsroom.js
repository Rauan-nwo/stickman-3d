// staging/newsroom.js — L13 редакция (assets/bg_newsroom.png; владелец: рабочий B, гл. 7–9).
// Ночная редакция: столы с мониторами и лампами, справа на стене ТВ (экран — четырёхугольник в перспективе, TV.screen).
// Герои стоят на свободном полу между столами (ступни на полу, контактная тень, ноги не дёргаются — plantLegs):
//   репортёр (reporter из presetsLong) — у среднего прохода, редактор (editor, chars_B) — перед правым столом под ТВ;
//   двое журналистов спиной к нам — под ТВ (#286). Свет — подвесные лампы сверху (noirShade [±.5, -1]), холодный отсвет мониторов.
// ТВ: содержимое выпуска (props_B.tvScreen) рисуется в буфер и кладётся аффинно на четырёхугольник экрана — на общем и на крупном плане
// один и тот же телевизор; корпус на крупном — свой чёткий контур поверх размытого плейта.
import { clamp, lerp, E, reporter } from 'engine';
import { W, H, toS, plate, img, lazy, blurred, canvas, cover } from './common.js';
import { person, editor } from '../chars_B.js';
import { tvScreen } from '../props_B.js';
import newsPlate from '../../assets/bg_newsroom.png';

export const CFG = {
  TV: { screen: [[1488, 323], [1614, 307], [1620, 400], [1497, 410]], bezel: [[1472, 316], [1632, 292], [1638, 418], [1486, 428]] },
  rep: { at: [1000, 968], fs: .6, light: [.55, -1] },          // репортёр: проход между столами
  ed: { at: [1505, 992], fs: .6, light: [-.35, -1] },          // редактор: перед правым столом, под ТВ
  backs: [{ at: [1440, 1000], fs: .5 }, { at: [1700, 1004], fs: .51 }],   // двое у ТВ спиной к нам (#286)
  views: {
    wide: { cx: 960, cy: 540, k: 1.0 },
    tv: { cx: 1556, cy: 362, k: 6.2 },                          // ТВ крупно
    tvMid: { cx: 1480, cy: 470, k: 2.3 },                      // ТВ над столами
    tvCol: { cx: 1565, cy: 500, k: 1.5 },                      // ТВ и двое под ним
    rep: { cx: 1010, cy: 600, k: 2.2 },                         // репортёр крупно (по грудь)
    ed: { cx: 1505, cy: 625, k: 2.2 },                          // редактор крупно
  },
};
const I = { plate: img(newsPlate) };
export const A = lazy([I.plate], () => ({ plate: I.plate, b3: blurred(I.plate, 3), b6: blurred(I.plate, 6) }));
export const CAST = { REP: reporter(), ED: editor() };
CAST.REP.spec.rig = { ...CAST.REP.spec.rig, plantLegs: .02, armLayer: 'front' };
export const views = CFG.views;
export const view = (name, cam, drift = .3) => { const b = CFG.views[name], k = b.k * (1 + ((cam?.z ?? 1) - 1) * .55), lim = 70 / k;
  return cover({ cx: b.cx + clamp((cam?.dx || 0) * W * drift, -lim, lim), cy: b.cy + clamp((cam?.dy || 0) * H * drift, -lim, lim), k }); };

// ---------- ТВ на четырёхугольнике экрана ----------
const SW = 840, SH = 600; let TVB = null;
export function tvOn(ctx, v, t, c, { bezel = false } = {}) {
  if (!TVB) TVB = canvas(SW, SH); const x = TVB.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, SW, SH);
  tvScreen(x, SW, SH, t, c);
  const [p0, p1, p2, p3] = CFG.TV.screen.map(P => toS(v, P));
  if (bezel) { const B = CFG.TV.bezel.map(P => toS(v, P)); ctx.save(); ctx.beginPath(); B.forEach((q, i) => (i ? ctx.lineTo(...q) : ctx.moveTo(...q))); ctx.closePath();
    ctx.fillStyle = '#1b2230'; ctx.fill(); ctx.lineWidth = Math.max(2, 2.2 * v.k); ctx.strokeStyle = '#0a0b10'; ctx.stroke(); ctx.restore(); }
  ctx.save(); ctx.beginPath(); [p0, p1, p2, p3].forEach((q, i) => (i ? ctx.lineTo(...q) : ctx.moveTo(...q))); ctx.closePath(); ctx.clip();
  // аффинно: (0,0) -> p0, (SW,0) -> p1, (0,SH) -> p3 (нижний правый угол почти совпадает — экран почти параллелограмм)
  ctx.setTransform((p1[0] - p0[0]) / SW, (p1[1] - p0[1]) / SW, (p3[0] - p0[0]) / SH, (p3[1] - p0[1]) / SH, p0[0], p0[1]);
  ctx.drawImage(TVB, 0, 0); ctx.setTransform(1, 0, 0, 1, 0, 0);
  const g = ctx.createLinearGradient(p0[0], p0[1], p2[0], p2[1]); g.addColorStop(0, 'rgba(170,210,255,.12)'); g.addColorStop(.45, 'rgba(170,210,255,0)'); ctx.fillStyle = g; ctx.globalCompositeOperation = 'screen'; ctx.fillRect(0, 0, W, H);
  ctx.restore();
  // свет экрана на стене вокруг (холодный)
  const c0 = toS(v, [1555, 362]), r = 260 * v.k; ctx.save(); ctx.globalCompositeOperation = 'screen'; const gg = ctx.createRadialGradient(c0[0], c0[1], 0, c0[0], c0[1], r);
  gg.addColorStop(0, 'rgba(120,170,255,.10)'); gg.addColorStop(1, 'rgba(120,170,255,0)'); ctx.fillStyle = gg; ctx.fillRect(c0[0] - r, c0[1] - r, 2 * r, 2 * r); ctx.restore();
}
// кадр редакции: o = { blur 0|3|6, tv: содержимое ТВ (props_B.tvScreen) или null, tvBezel, rep: {...person}, ed: {...}, backs: [poseA, poseB], solo }
export function room(ctx, v, t, T, o = {}) {
  const a = A(); if (!a) return {};
  if (!o.solo) plate(ctx, o.blur >= 5 ? a.b6 : o.blur >= 2 ? a.b3 : a.plate, v);
  if (!o.solo && o.tv) tvOn(ctx, v, t, o.tv, { bezel: o.tvBezel });
  const out = {};
  if (o.backs) o.backs.forEach((m, i) => { if (m) out['b' + i] = person(ctx, v, t, T, { C: i ? CAST.REP : CAST.ED, ...CFG.backs[i], light: [-.9, -.5], view: 'back', facing: i ? -1 : 1, shadow: !o.solo, seed: 7 + i, ...m }); });
  if (o.ed) out.ed = person(ctx, v, t, T, { C: CAST.ED, ...CFG.ed, sp: 'EDITOR', facing: -1, shadow: !o.solo, seed: 5, ...o.ed });
  if (o.rep) out.rep = person(ctx, v, t, T, { C: CAST.REP, ...CFG.rep, sp: 'REPORTER', facing: 1, shadow: !o.solo, seed: 4, ...o.rep });
  return out;
}

// ---------- выпуски на ТВ (сцены экрана для props_B.tvScreen: scene(x, w, h, t)) ----------
import { studioBg, podium, bust, miniFig, CAST_MINI, txt } from '../props_B.js';
import { NOIR_FONT as F } from 'engine';
// Дженсен по грудь в студии (#287–288): s — масштаб фигуры, смех/спокойно
export const sceneJensen = (x, w, h, t) => { studioBg(x, w, h); const s = h / 900; miniFig(x, CAST_MINI.J, w * .5, h * .37 + 712 * s, s, { view: 'front', look: [0, .1], mouth: 'smile' }, t); };
// президент у микрофонов: безликий силуэт за трибуной, флаги (#284)
export const scenePresident = (x, w, h) => { studioBg(x, w, h); podium(x, w, h, '#2a2f44', (c, ww, hh) => bust(c, ww * .5, hh * .36, hh * .55), true); };
// Пекин: красная трибуна без узнаваемого лица (#286)
export const sceneBeijing = (x, w, h) => { studioBg(x, w, h, 'red'); podium(x, w, h, '#8a1a1e', (c, ww, hh) => bust(c, ww * .5, hh * .36, hh * .55, '#1a0606', 'rgba(255,140,100,.45)')); };
// DeepSeek: ноутбук с окном чата и ценник CHEAP AI MODEL (#324); tag 0..1
export const sceneDeepSeek = tag => (x, w, h) => { studioBg(x, w, h); x.save(); x.translate(w * .5, h * .5);
  x.fillStyle = '#16161c'; x.strokeStyle = '#000'; x.lineWidth = 4; x.beginPath(); x.roundRect(-w * .24, -h * .26, w * .48, h * .36, 10); x.fill(); x.stroke();
  x.fillStyle = '#e8eef8'; x.fillRect(-w * .22, -h * .23, w * .44, h * .3); x.fillStyle = '#3a6ad0'; x.fillRect(-w * .22, -h * .23, w * .44, h * .05);
  txt(x, 'AI CHAT', -w * .2, -h * .205, h * .035, { col: '#fff', font: F.label, w: 800 });
  for (let i = 0; i < 3; i++) { x.fillStyle = i % 2 ? '#cfe0ff' : '#d8d8de'; x.beginPath(); x.roundRect(i % 2 ? -w * .02 : -w * .2, -h * .15 + i * h * .065, w * .2, h * .045, 8); x.fill(); }
  x.fillStyle = '#26262e'; x.beginPath(); x.moveTo(-w * .3, h * .1); x.lineTo(w * .3, h * .1); x.lineTo(w * .26, h * .16); x.lineTo(-w * .26, h * .16); x.closePath(); x.fill(); x.stroke();
  if (tag > 0) { const k = Math.min(1, tag * 1.4); x.save(); x.translate(w * .2, -h * .3); x.rotate(.08 + .1 * Math.sin(tag * 9) * (1 - Math.min(1, tag))); x.scale(k, k);
    x.fillStyle = '#efe4c8'; x.beginPath(); x.roundRect(-w * .2, -h * .09, w * .4, h * .18, 8); x.fill(); x.lineWidth = 4; x.stroke(); txt(x, 'CHEAP AI MODEL', 0, 0, h * .075, { font: F.type, w: 900, align: 'center', max: w * .37 }); x.restore(); }
  x.restore(); };
// экстренный выпуск: силуэт Белого дома (#314)
export const sceneWhiteHouse = (x, w, h) => { studioBg(x, w, h); x.fillStyle = '#e8ecf4'; const y = h * .62; x.fillRect(w * .22, y - h * .18, w * .56, h * .18); x.beginPath(); x.moveTo(w * .4, y - h * .18); x.lineTo(w * .5, y - h * .3); x.lineTo(w * .6, y - h * .18); x.closePath(); x.fill();
  x.fillStyle = '#9aa4b8'; for (let i = 0; i < 8; i++) x.fillRect(w * (.4 + i * .028), y - h * .16, w * .008, h * .16); x.fillStyle = '#c8cdd8'; x.fillRect(w * .18, y, w * .64, h * .03); };
// Алиса на снимке-заставке со знаком вопроса (#334)
export const sceneAlice = (x, w, h, t) => { studioBg(x, w, h); x.fillStyle = '#f4efe2'; x.fillRect(w * .3, h * .1, w * .4, h * .52); x.save(); x.beginPath(); x.rect(w * .32, h * .12, w * .36, h * .44); x.clip(); x.fillStyle = '#2a3040'; x.fillRect(0, 0, w, h);
  const s = h / 1300; miniFig(x, CAST_MINI.AL, w * .5, h * .27 + 712 * s, s, { view: 'front', look: [0, 0] }, t); x.restore();
  txt(x, '?', w * .78, h * .36, h * .3, { col: '#ffd84a', font: F.display, w: 900, align: 'center' }); };
// Дженсен говорит в эфире (#288): рот — только на его словах (words.js)
import { mouth as mouthOf } from '../words.js';
export const sceneJensenTalk = (x, w, h, t, T) => { studioBg(x, w, h); const s = h / 900; miniFig(x, CAST_MINI.J, w * .5, h * .37 + 712 * s, s, { view: 'front', look: [0, .1], mouth: mouthOf('JENSEN', T, 'smile', 1) }, t); };
