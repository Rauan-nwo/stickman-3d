// film/shots.js — постановка планов гл. 0–1: номер плана -> рисовальщик. Время — только из шотлиста и голоса:
//   s.snap (рывок на ударном слове), s.ev (события «на «слово»»), s.whip (смена говорящего), w('слово') — время слова в этом плане
//   (words.json), рот — words.js. Камера — грамматика аниматика (cam: z, dx, sh — наезд/стоп/рывок/дрейф/толчок), здесь только база кадра.
// Действия героев: talk (рот на своих словах) · gesture на ударном слове · look · hold (бокал, папка, ключ, планшет) · photo (затвор)
// · idle (дыхание, моргание) · sit (садится) · walk (официант проходит). Перенос на гл. 2–10 — README.md, «Как добавить план».
import { clamp, lerp, E, gesture } from 'engine';
import { W, H, camView, toS, lerpView, cover } from './staging/common.js';
import * as R from './staging/restaurant.js';
import * as CAR from './staging/car.js';
import * as OF from './staging/office.js';
import * as KY from './staging/kentucky.js';
import * as IN from './staging/inserts.js';
import { wordAt, lineSpan } from './words.js';
import * as PR from './props.js';

const inOutExpo = k => (k <= 0 ? 0 : k >= 1 ? 1 : k < .5 ? Math.pow(2, 20 * k - 10) / 2 : (2 - Math.pow(2, -20 * k + 10)) / 2);
const gauss = (t, t0, w) => Math.exp(-Math.pow((t - t0) / w, 2));
const env = (t, t0, t1, rise = .3, fall = .3) => R.holdEnv(t, t0 + rise, t1, rise, fall);
// время слова в плане (локальное); нет слова — запасное значение
const W_ = (x, re, fb) => { const a = wordAt(re, x.s.start, x.s.end); return a == null ? fb : a - x.s.start; };
const shake = (ctx, cam) => ctx.translate(cam.sh, cam.sh * .5);
// вип со смазом между двумя рисовальщиками на РАЗНЫХ плейтах (как переход 'whip' аниматика): A уезжает влево, B въезжает справа
function whipPlates(ctx, t, tw, drawA, drawB) {
  const u = inOutExpo((t - (tw - .1)) / .22);
  if (u <= 0) return drawA(); if (u >= 1) return drawB();
  for (let g = 0; g < 4; g++) { ctx.save(); ctx.globalAlpha = g ? .25 : 1; ctx.translate(-W * (u - g * .05), 0); drawA(); ctx.restore(); }
  for (let g = 0; g < 4; g++) { ctx.save(); ctx.globalAlpha = g ? .25 : 1; ctx.translate(W * (1 - u + g * .05), 0); drawB(); ctx.restore(); }
}
// рамка фокуса объектива (POV): прямоугольник с уголками
function focusBox(ctx, x, y, w, h, lock = 0) {
  ctx.save(); ctx.strokeStyle = lock > .5 ? 'rgba(140,255,170,.95)' : 'rgba(255,255,255,.9)'; ctx.lineWidth = 4; const L = Math.min(w, h) * .25;
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const cx = x + sx * w / 2, cy = y + sy * h / 2; ctx.beginPath(); ctx.moveTo(cx, cy - sy * L); ctx.lineTo(cx, cy); ctx.lineTo(cx - sx * L, cy); ctx.stroke(); }
  ctx.restore();
}
// стоп-кадр снимка: белая рамка и лёгкое выцветание
function freezeFrame(ctx, u) { if (u <= 0) return; const k = clamp(u / .12); ctx.save(); ctx.fillStyle = `rgba(250,246,236,${.16 * k})`; ctx.fillRect(0, 0, W, H); ctx.lineWidth = 34 * k; ctx.strokeStyle = 'rgba(250,246,236,.95)'; ctx.strokeRect(17, 17, W - 34, H - 34); ctx.restore(); }

const V = {   // базовые кадры (центр в пикселях плейта, увеличение) — движение даёт cam
  rWide: { cx: 960, cy: 560, k: 1.0 }, rCuJ: { cx: 520, cy: 690, k: 1.72 }, rCuA: { cx: 1420, cy: 800, k: 1.5 }, rRev: { cx: 975, cy: 545, k: 1.0 },
  rPovA: { cx: 1440, cy: 700, k: 1.55 }, rPov2: cover({ cx: 960, cy: 690, k: 1.18 }),
};

export const SHOTS = {
  // ---------------- гл. 0 ----------------
  1: x => { const { ctx, t, T, cam, solo } = x, v = camView(V.rWide, cam, .6, .5);   // общий: двое за столом; агент с меню и объективом на переднем плане
    ctx.save(); shake(ctx, cam);
    R.wide(ctx, v, t, T, { solo, j: { keys: [[0, 'neutral']], at: 1.25 }, a: { keys: [[0, 'smug']] } });
    if (!solo) { const [fx, fy] = R.flame(v); candle(ctx, fx, fy, v.k, .35 + .65 * gauss(t, 1.15, .28) + .06 * Math.sin(t * 23));
      R.fgSpy(ctx, 1110 + (v.cx - 960) * -.3, 1045, 1.05, { glint: gauss(t, .75, .16) + .7 * gauss(t, x.s.snap ?? 1.5, .12), blur: 6 }); }
    ctx.restore(); },
  3: x => { const { ctx, t, T, cam, solo, s } = x, ts = Math.min(t, s.snap ?? 1.4), v = camView(V.rPovA, { ...cam, z: x.camAt(ts).z, dx: 0 });   // POV: Алиса садится; щелчок — стоп-кадр
    const u = E.outCubic(clamp(ts / 1.0));
    R.wide(ctx, v, ts, T - t + ts, { solo, j: { keys: [[0, 'neutral']] }, a: { keys: [[0, 'smug']], dx: lerp(46, 0, u), dy: lerp(-20, 0, u), lean: lerp(.1, 0, u), armsK: clamp((ts - .55) / .55) } });
    if (!solo) { const [fx, fy] = R.flame(v); candle(ctx, fx, fy, v.k, .4 + .05 * Math.sin(ts * 23)); const hd = toS(v, [1655, 560]); focusBox(ctx, hd[0] - 30, hd[1] + 40, 360, 460, t > (s.snap ?? 1.4) ? 1 : 0); x.API.viewfinder(ctx, t); freezeFrame(ctx, t - (s.snap ?? 1.4)); } },
  5: x => { const { ctx, t, T, cam, solo, s } = x, v = camView(V.rCuJ, cam), tj = s.snap ?? 2;   // крупно Дженсен: смеётся, на «jacket» — рука к лацкану
    ctx.save(); shake(ctx, cam);
    R.cu(ctx, v, t, T, { solo, who: 'J', keys: [[0, 'smug'], [.7, 'laugh', { talking: false }], [tj - .25, 'smug']], laugh: t > .7 && t < tj - .25, far: [-50, -585], farK: env(t, tj - .3, tj + .9, .28, .3) });
    if (!solo) R.flameBokeh(ctx);
    ctx.restore(); },
  6: x => { const { ctx, t, T, cam, solo } = x, v = camView(V.rRev, cam, .5);   // обратная: Алиса поправляет очки; агент за дальним столиком с меню
    ctx.save(); shake(ctx, cam);
    R.rev(ctx, v, t, T, { solo, at: Math.min(.8, x.d - .55), watcher: { glint: tt => gauss(tt, .45, .12) } });
    ctx.restore(); },
  8: x => { const { ctx, t, T, cam, solo, s } = x, v = camView(V.rCuA, cam), tc = s.snap ?? 1.6;   // средний Алиса: ящики падают по словам, бирка VIP на «customers», папка — к Дженсену
    const tOne = W_(x, 'one', .55), tBig = W_(x, 'biggest', 1.1), push = E.inOutCubic(clamp((t - (tc - .45)) / .6));
    ctx.save(); shake(ctx, cam);
    const fx = lerp(R.FOLDER.x0, R.FOLDER.x1, push);
    R.cu(ctx, v, t, T, { solo, who: 'A', keys: [[0, 'smug']], look: [-.6, .15], lean: .1 * push, pin: [fx + 52, 840], elbow: [fx + 150, 830],
      onTable: (c, vv) => R.folderOnTable(c, vv, push), over: (c, vv) => R.crates(c, vv, t, tOne, tBig, tc) });
    ctx.restore(); },
  9: x => { const { ctx, t, T, cam, solo, s, d } = x, tw = s.whip?.t ?? d * .5;   // тост: Дженсен поднимает бокал -> вип -> Алиса навстречу; бокалы встречаются: «дзынь»
    const al = lineSpan('ALICE', s.start, s.end), tClink = Math.max((al ? al[1] - s.start : tw + .8) + .12, d - .62);
    const holdJ = env(t, .05, tw + .5, .32), holdA = env(t, tw + .05, d + 1, .3);
    const cz = x.camAt(t);
    whipPlates(ctx, t, tw,
      () => { const v = camView(V.rCuJ, { ...cz, z: cz.z * .98 }); R.cu(ctx, v, t, T, { solo, who: 'J', keys: [[0, 'smug']], hold: holdJ, up: [84 + 150, -563 - 70], glass: {} }); if (!solo) R.flameBokeh(ctx); },
      () => { const v = camView(V.rRev, cz, .5); const r = R.rev(ctx, v, t, T, { solo, hold: holdA, glass: { slosh: t > tClink ? Math.sin((t - tClink) * 14) * Math.exp(-(t - tClink) * 3.2) * .16 : 0 } });
        if (!solo && r.hand) R.toastIn(ctx, v, t, tClink, r); });
  },
  10: x => { const { ctx, t, s } = x, ts = s.snap ?? .9;   // D02-A: перчатка с чипом под скатертью (со стороны Алисы)
    ctx.save(); shake(ctx, x.cam); const z = x.cam.z; ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
    IN.chipUnder(ctx, t, clamp((t - .05) / Math.max(.3, ts - .05)), gauss(t, ts, .1)); ctx.restore(); },
  12: x => { const { ctx, t, d, solo } = x, u = E.inOutCubic(clamp(t / (d * .85)));   // улица: проезд от окна ресторана к машине агентов (влево)
    const v = cover({ cx: lerp(1300, 640, u), cy: 600, k: 1.3 + .04 * u });
    IN.street(ctx, v, t, { solo }); },
  13: x => { const { ctx, t, T, cam, solo, s } = x, v = camView(CAR.views.both, cam, .5), tYear = W_(x, 'year', x.d - .3);   // салон: оба слушают, бобины крутятся, бирки месяцев до «year»
    ctx.save(); shake(ctx, cam);
    CAR.car(ctx, v, t, T, { solo, reelsAng: T * 3.2, tapes: Math.round(12 * clamp((t - .3) / Math.max(.4, tYear - .3))),
      a1: { keys: [[0, 'neutral']], press: env(t, .5, 2.4, .35), look: [.6, .25] }, a2: { keys: [[0, 'neutral']], look: [-.4, .45] } });
    ctx.restore(); },
  14: x => { const { ctx, t, T, cam, solo, s } = x, v = camView(CAR.views.a1, cam, .5), ta = s.snap ?? 1;   // крупно AGENT: «She's talking to an American.» — прижимает наушник
    ctx.save(); shake(ctx, cam);
    CAR.car(ctx, v, t, T, { solo, reelsAng: T * 3.2, a1: { keys: [[0, 'neutral']], pressNear: env(t, ta - .3, x.d + 1, .25), look: [.7, .1], tilt: -.06 * env(t, ta - .3, x.d + 1, .25) }, a2: { keys: [[0, 'neutral']], look: [-.5, .3] } });
    ctx.restore(); },
  15: x => { const { ctx, t, T, solo } = x, v = V.rPov2;   // POV снова: рамка скользит с Алисы, официант заслоняет объектив (гэг), рамка находит Дженсена
    R.wide(ctx, v, t, T, { solo, j: { keys: [[0, 'neutral'], [1.0, 'laugh', { talking: false }]], laugh: t > 1.0, at: .5 }, a: { keys: [[0, 'smug']], at: .35 } });
    if (!solo) { const [fx, fy] = R.flame(v); candle(ctx, fx, fy, v.k, .4 + .05 * Math.sin(t * 23));
      const u = E.inOutCubic(clamp((t - .2) / 1.1)), hA = toS(v, [1655, 560]), hJ = toS(v, [270, 560]), lock = t > 1.4 ? 1 : 0;
      focusBox(ctx, lerp(hA[0] - 20, hJ[0] + 30, u), lerp(hA[1] + 40, hJ[1] + 40, u), 300, 400, lock);
      R.fgWaiter(ctx, clamp((t - .38) / .75), { y: 1560, s: 1.32, blur: 10 });
      x.API.viewfinder(ctx, t); } },
  16: x => { const { ctx, t, s } = x, ts = s.snap ?? .72;   // вставка: снимки падают на столик агента, последний — на «jacket»
    ctx.save(); shake(ctx, x.cam); const z = x.cam.z; ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
    IN.photosDrop(ctx, t, [.06, Math.max(.3, ts - .32), ts]); ctx.restore(); },
  17: x => { const { ctx, t, T, cam, solo } = x, v = camView(V.rCuJ, cam);   // крупно Дженсен смеётся и откидывается; на переднем плане — край меню и объектив
    ctx.save(); shake(ctx, cam);
    R.cu(ctx, v, t, T, { solo, who: 'J', keys: [[0, 'smug'], [.18, 'laugh', { talking: false }]], laugh: t > .18, lean: -.07 * E.inOutCubic(clamp((t - .2) / .6)), table: 'tableB2', bg: 'plateB2' });
    if (!solo) R.fgMenu(ctx, 1720, 840, 600, { lens: -1, glint: .35 + .25 * Math.sin(t * 4), blur: 11, tilt: -.08 });
    ctx.restore(); },
  18: x => { const { ctx, t, T, cam, solo, s, d } = x, tw = s.whip?.t ?? d * .47;   // салон, вип-пан: AGENT 2 получает снимок, опускает наушники -> AGENT кладёт распечатку в папку и закрывает
    const wu = inOutExpo((t - tw + .1) / .22), a1s = lineSpan('AGENT', s.start, s.end), tClose = a1s ? a1s[1] - s.start + .15 : d - .5;
    const draw = (vv) => CAR.car(ctx, vv, t, T, { solo, reelsAng: T * 3.2,
      a2: { keys: [[0, 'neutral']], look: [-.3, .5], phones: E.inOutCubic(clamp((t - 1.05) / .35)), press: env(t, .85, 1.35, .2, .25),
        hold: { k: env(t, 0, d + 1, .2), at: [-150, -470] }, held: (c, P, sc) => CAR.tablet(c, P[0] - 70 * sc, P[1] - 40 * sc, 300 * sc, -.12, IN.snapPic, clamp((t - .12) / .5)) },
      a1: { keys: [[0, 'neutral']], look: [.5, .35], hold: { k: env(t, tw - .2, d + 1, .25), at: [170, -420] }, held: (c, P, sc) => CAR.subjectFolder(c, P[0] + 60 * sc, P[1] + 10 * sc, 320 * sc, .1, 1 - E.inOutCubic(clamp((t - tClose) / .3)), IN.snapPic) } });
    ctx.save(); shake(ctx, cam);
    const va = camView(CAR.views.a2, { ...cam, dx: 0 }), vb = camView(CAR.views.a1m, { ...cam, dx: 0 });
    const v = lerpView(va, vb, clamp(wu)); draw(v);
    if (wu > 0 && wu < 1) for (let g = 1; g <= 4; g++) { ctx.save(); ctx.globalAlpha = .2; draw(lerpView(va, vb, clamp(wu - g * .08))); ctx.restore(); }
    ctx.restore(); },

  // ---------------- гл. 1 ----------------
  19: x => { const { ctx, t, T, cam, solo, s } = x, v = camView(OF.views.wide, cam, .6), tb = s.snap ?? 1.8;   // кабинет: лампа щёлкает; «Mind the box» — рука к коробке
    const g = gesture(t, tb, { lead: .15, rise: .26, hold: .6, fall: .3, lagFrames: 3 }), lamp = t < .14 ? 0 : t < .2 ? 1 : t < .24 ? .25 : 1;
    ctx.save(); shake(ctx, cam);
    OF.office(ctx, v, t, T, { solo, lamp, box: {}, photo: IN.snapPic, host: { keys: [[0, 'neutral'], [.25, 'talk']], lean: .06 * g.body, look: [.7 * g.body, .35 * g.body], R: { k: g.hand, to: OF.boxTop(-60, 20) } } });
    if (!solo) OF.lampFlare(ctx, v, t > .14 ? gauss(t, .2, .09) : 0);
    ctx.restore(); },
  20: x => { const { ctx, t, T, cam, solo } = x, v = camView(OF.views.box, cam, .3);   // вставка: палец стучит по крышке «тук-тук», пыль
    const taps = [W_(x, /^it/, .1), W_(x, 'expensive', .7)], bump = Math.max(...taps.map(t0 => gauss(t, t0 + .04, .05))), dust = Math.max(...taps.map(t0 => (t > t0 && t < t0 + .7 ? (t - t0) / .7 : 0)));
    ctx.save(); shake(ctx, cam);
    OF.office(ctx, v, t, T, { solo, box: { dust }, photo: IN.snapPic, host: { keys: [[0, 'talk']], lean: .07, look: [.7, .45], R: { k: 1, to: OF.lidPt(-10, -26 * bump) } } });
    ctx.restore(); },
  21: x => { const { ctx, t, T, cam, solo, s } = x, v = camView(OF.views.key, cam, .3), tc = s.snap ?? 1.5;   // сверхкрупно: крышка приоткрывается, на «chips» — зелёный свет; ключ поднимается в свет лампы
    const lid = E.inOutCubic(clamp((t - .25) / (tc - .35))), glow = clamp((t - tc + .05) / .2), up = E.inOutCubic(clamp((t - (tc + .25)) / .9));
    const hand = up > 0 ? [lerp(OF.lidPt(0, 30)[0], 1262, up), lerp(OF.lidPt(0, 30)[1], 385, up)] : OF.boxTop(-30 + 10 * lid, 0 - 20 * lid);
    ctx.save(); shake(ctx, cam);
    OF.office(ctx, v, t, T, { solo, box: { lid, glow }, photo: IN.snapPic, host: { keys: [[0, 'talk']], lean: .07, look: [.6, .2 - .5 * up], R: { k: 1, to: hand }, key: up > 0 ? { s: .28, a: -.5 - .4 * up, glint: gauss(t, tc + 1.35, .18), dx: 6, dy: -4 } : null } });
    ctx.restore(); },
  22: x => { const { ctx, t, T, cam, solo, s } = x, v = camView(OF.views.tag, cam, .3), tm = (s.ev || []).find(e => e.p === 1)?.t ?? s.snap ?? 1.5;   // вставка: ценник $30,000 EACH на «Thirty», бирка SOURCE: NVIDIA на «maker's»
    ctx.save(); shake(ctx, cam);
    OF.office(ctx, v, t, T, { solo, box: { glow: .25 }, photo: IN.snapPic, tag: { k: clamp(t / .35), t, sub: t >= tm }, host: { keys: [[0, 'talk']], look: [.6, .25] } });
    ctx.restore(); },
  23: x => { const { ctx, t, T, cam, solo, s } = x, v = camView(OF.views.mid, cam, .4), tt = s.snap ?? .8;   // средний: кладёт ладонь на снимок «Дженсен + Алиса» под лампой
    const k = env(t, tt - .45, x.d + 1, .35);
    ctx.save(); shake(ctx, cam);
    OF.office(ctx, v, t, T, { solo, box: {}, photo: IN.snapPic, host: { keys: [[0, 'talk']], lean: -.05 * k, look: [-.6 * k, .45 * k], L: { k, to: [OF.CFG.photo[0] + 4, OF.CFG.photo[1] - 2] } } });
    ctx.restore(); },
  24: x => { const { ctx, t, T, cam, solo, s } = x, v = camView(OF.views.keycam, cam, .3), tt = s.snap ?? 1.2;   // сверхкрупно: ключ протянут прямо в объектив, блик на бородке
    const k = E.inOutCubic(clamp((t - .05) / (tt - .1)));
    ctx.save(); shake(ctx, cam);
    const r = OF.office(ctx, v, t, T, { solo, blur: true, box: {}, photo: IN.snapPic, host: { keys: [[0, 'talk']], look: [0, 0], R: { k: .55 + .45 * k, to: [1150 - 40 * k, 470 - 30 * k] } } });
    if (r.hr) { const cx = lerp(r.hr[0], W * .64, k), cy = lerp(r.hr[1], H * .6, k), sc = lerp(.42, 1.35, k);
      OF.handKey(ctx, cx, cy, sc, gauss(t, tt, .14) + .25 * k, r.s * lerp(1, 3.2, k)); }
    ctx.restore(); },
  29: x => { const { ctx, t, T, cam, solo } = x, v = camView(KY.views.dorm, cam, .5);   // спальня: юный Дженсен с сундуком выше себя
    ctx.save(); shake(ctx, cam);
    KY.dorm(ctx, v, t, T, { solo, keys: [[0, 'neutral']], look: [lerp(.5, -.2, E.inOutCubic(clamp(t / 1.2))), -.45] });
    ctx.restore(); },
  30: x => { const { ctx, t, cam, solo, s } = x, v = camView({ cx: 985, cy: 640, k: 2.05 }, cam, .3), tk = s.snap ?? .9;   // вставка: детская рука берёт швабру выше себя; брызги из ведра
    ctx.save(); shake(ctx, cam);
    KY.bathInsert(ctx, v, t, { solo, k: clamp((t - .15) / Math.max(.3, tk - .15)), splash: t / .55 });
    ctx.restore(); },
};

// свеча общего плана: тёплая вспышка (событие) поверх пламени
function candle(ctx, fx, fy, k, a) {
  if (a < .003) return; const r = 260 * k; ctx.save(); ctx.globalCompositeOperation = 'screen';
  const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, r); g.addColorStop(0, `rgba(255,190,110,${.55 * a})`); g.addColorStop(.35, `rgba(255,150,70,${.22 * a})`); g.addColorStop(1, 'rgba(255,140,60,0)');
  ctx.fillStyle = g; ctx.fillRect(fx - r, fy - r, r * 2, r * 2); ctx.restore();
}

// поверх шаблонов аниматика (план-шаблон остаётся как есть, сверху — вещь из нашего кадра)
export const OVER = {
  // папка разведки: на скрепку ложится только что сделанный снимок — Алиса за этим самым столом (связь с POV #3)
  4: (ctx, s, t) => { const u = clamp((t - .25) / .3); if (u <= 0) return; const fall = (1 - E.outBack(u, 1.3)) * -260;
    ctx.save(); ctx.translate(W * .7, H * .6 + fall); ctx.rotate(.07); polaroidAt(ctx, 0, 0, 380, 0); ctx.restore();
    ctx.save(); ctx.translate(W * .7 - 120, H * .6 - 150 + fall); ctx.rotate(.07); ctx.strokeStyle = '#B9BEC6'; ctx.lineWidth = 7; ctx.beginPath(); ctx.roundRect(-14, -40, 28, 110, 14); ctx.stroke(); ctx.beginPath(); ctx.roundRect(-6, -26, 12, 80, 6); ctx.stroke(); ctx.restore(); },
};
const polaroidAt = (ctx, x, y, w, a) => PR.polaroid(ctx, x, y, w, a, IN.snapPic, 1);

// вещи-подписи аниматика, которые в финале уже стоят в кадре (или дублируют подпись в нижней трети)
export const SKIP_PROPS = { 4: /SUBJECT/, 5: /JENSEN HUANG/, 6: /ALICE HUANG/, 8: /VIP/, 13: /JAN/, 18: /SUBJECT/, 22: /\$30,000|SOURCE/ };
// дождь аниматика только на улице (в салоне и в зале ресторана — только за стеклом, он уже нарисован)
export const RAIN = s => s.loc === 'L02-sg-street' ? /общий/.test(s.framing) : s.loc !== 'L01-restaurant';
