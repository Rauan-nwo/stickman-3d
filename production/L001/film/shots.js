// film/shots.js — постановка планов гл. 0–1: ключ 'глава|начало текста плана' (keys.js — номера планов в шотлисте меняются) -> рисовальщик. Время — только из шотлиста и голоса:
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
import * as DT from './staging/desktop.js';
import { wordAt, lineSpan } from './words.js';
import { WHIP_DUR } from '../animatic/core.js';
import * as PR from './props.js';

const inOutExpo = k => (k <= 0 ? 0 : k >= 1 ? 1 : k < .5 ? Math.pow(2, 20 * k - 10) / 2 : (2 - Math.pow(2, -20 * k + 10)) / 2);
const gauss = (t, t0, w) => Math.exp(-Math.pow((t - t0) / w, 2));
const env = (t, t0, t1, rise = .3, fall = .3) => R.holdEnv(t, t0 + rise, t1, rise, fall);
// время слова в плане (локальное); нет слова — запасное значение
const W_ = (x, re, fb) => { const a = wordAt(re, x.s.start, x.s.end); return a == null ? fb : a - x.s.start; };
const shake = (ctx, cam) => ctx.translate(cam.sh, cam.sh * .5);
// вип со смазом между двумя рисовальщиками на РАЗНЫХ плейтах (как переход 'whip' аниматика): A уезжает влево, B въезжает справа
function whipPlates(ctx, t, tw, drawA, drawB) {   // смаз делает ядро (core.js shot → smearInto) по всему кадру — здесь только лента без копий
  const u = inOutExpo((t - (tw - .1)) / WHIP_DUR);
  if (u <= 0) return drawA(); if (u >= 1) return drawB();
  ctx.save(); ctx.translate(-W * u, 0); drawA(); ctx.restore();
  ctx.save(); ctx.translate(W * (1 - u), 0); drawB(); ctx.restore();
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
  rWide: { cx: 960, cy: 560, k: 1.0 }, rCuJ: { cx: 430, cy: 690, k: 1.72 }, rCuA: { cx: 1420, cy: 800, k: 1.5 }, rRev: { cx: 975, cy: 545, k: 1.0 },
  rPovA: { cx: 1440, cy: 700, k: 1.55 }, rPov2: cover({ cx: 960, cy: 690, k: 1.18 }),
};

export const SHOTS = {
  // ---------------- гл. 0 ----------------
  '0|Picture this.': x => { const { ctx, t, T, cam, solo } = x, v = camView(V.rWide, cam, .3, .3);   // общий: двое за столом; агент за дальним столиком справа (D01 #1); агент с меню и объективом на переднем плане
    ctx.save(); shake(ctx, cam);
    R.wide(ctx, v, t, T, { solo, glint: tt => gauss(tt, .75, .16) + .8 * gauss(tt, x.s.snap ?? 1.5, .12), j: { keys: [[0, 'neutral']], at: 1.25 }, a: { keys: [[0, 'smug']] } });
    if (!solo) { const [fx, fy] = R.flame(v); candle(ctx, fx, fy, v.k, .35 + .65 * gauss(t, 1.15, .28) + .06 * Math.sin(t * 23));
    }
    ctx.restore(); },
  '0|sits down to dinner': x => { const { ctx, t, T, cam, solo, s } = x, ts = Math.min(t, s.snap ?? 1.4), v = camView(V.rPovA, { ...cam, z: x.camAt(ts).z, dx: 0 });   // POV: Алиса садится; щелчок — стоп-кадр
    const u = E.outCubic(clamp(ts / 1.0));
    R.wide(ctx, v, ts, T - t + ts, { solo, j: { keys: [[0, 'neutral']] }, a: { keys: [[0, 'smug']], dx: lerp(46, 0, u), dy: lerp(-20, 0, u), lean: lerp(.1, 0, u), armsK: clamp((ts - .55) / .55) } });
    if (!solo) { const [fx, fy] = R.flame(v); candle(ctx, fx, fy, v.k, .4 + .05 * Math.sin(ts * 23)); const hd = toS(v, [1655, 560]); focusBox(ctx, hd[0] - 30, hd[1] + 40, 360, 460, t > (s.snap ?? 1.4) ? 1 : 0); x.API.viewfinder(ctx, t); freezeFrame(ctx, t - (s.snap ?? 1.4)); } },
  "0|He's Jensen Huang": x => { const { ctx, t, T, cam, solo, s } = x, v = camView(V.rCuJ, cam), tj = s.snap ?? 2;   // крупно Дженсен: смеётся, на «jacket» — рука к лацкану
    ctx.save(); shake(ctx, cam);
    R.cu(ctx, v, t, T, { solo, who: 'J', keys: [[0, 'smug'], [.7, 'laugh', { talking: false }], [tj - .25, 'smug']], laugh: t > .7 && t < tj - .25, far: [-50, -585], farK: env(t, tj - .3, tj + .9, .28, .3) });
    if (!solo) R.flameBokeh(ctx);
    ctx.restore(); },
  "0|She's Alice Huang": x => { const { ctx, t, T, cam, solo } = x, v = camView(V.rRev, cam, .5);   // обратная: Алиса поправляет очки; агент за дальним столиком с меню
    ctx.save(); shake(ctx, cam);
    R.rev(ctx, v, t, T, { solo, at: Math.min(.8, x.d - .55), watcher: { glint: tt => gauss(tt, .45, .12) } });
    ctx.restore(); },
  '0|Her company is one of': x => { const { ctx, t, T, cam, solo, s } = x, v = camView(V.rCuA, cam), tc = s.snap ?? 1.6;   // средний Алиса: ящики падают по словам, бирка VIP на «customers», папка — к Дженсену
    const tOne = W_(x, 'one', .55), tBig = W_(x, 'biggest', 1.1), push = E.inOutCubic(clamp((t - (tc - .45)) / .6));
    ctx.save(); shake(ctx, cam);
    const fx = lerp(R.FOLDER.x0, R.FOLDER.x1, push);
    R.cu(ctx, v, t, T, { solo, who: 'A', keys: [[0, 'smug']], look: [-.6, .15], lean: .1 * push, pin: [fx + 52, 840], elbow: [fx + 150, 830],
      onTable: (c, vv) => R.folderOnTable(c, vv, push), over: (c, vv) => R.crates(c, vv, t, tOne, tBig, tc) });
    ctx.restore(); },
  '0|JENSEN: To the next shipment': x => { const { ctx, t, T, cam, solo, s, d } = x, tw = s.whip?.t ?? d * .5;   // тост: Дженсен поднимает бокал -> вип -> Алиса навстречу; бокалы встречаются: «дзынь»
    const al = lineSpan('ALICE', s.start, s.end), tClink = Math.max((al ? al[1] - s.start : tw + .8) + .12, d - .62);
    const holdJ = env(t, .05, tw + .5, .32), holdA = env(t, tw + .05, d + 1, .3);
    const cz = x.camAt(t);
    whipPlates(ctx, t, tw,
      () => { const v = camView(V.rCuJ, { ...cz, z: cz.z * .98 }); R.cu(ctx, v, t, T, { solo, who: 'J', keys: [[0, 'smug']], hold: holdJ, up: [84 + 150, -563 - 70], glass: {} }); if (!solo) R.flameBokeh(ctx); },
      () => { const v = camView(V.rRev, cz, .5); const r = R.rev(ctx, v, t, T, { solo, hold: holdA, glass: { slosh: t > tClink ? Math.sin((t - tClink) * 14) * Math.exp(-(t - tClink) * 3.2) * .16 : 0 } });
        if (!solo && r.hand) R.toastIn(ctx, v, t, tClink, r); });
  },
  '0|Her company buys his chips': x => { const { ctx, t, s } = x, ts = s.snap ?? .9;   // D02-A: перчатка с чипом под скатертью (со стороны Алисы)
    ctx.save(); shake(ctx, x.cam); const z = x.cam.z; ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
    IN.chipUnder(ctx, t, clamp((t - .05) / Math.max(.3, ts - .05)), gauss(t, ts, .1)); ctx.restore(); },
  '0|And across the street': x => { const { ctx, t, d, solo } = x, u = E.inOutCubic(clamp(t / (d * .85)));   // улица: проезд от окна ресторана к машине агентов (влево)
    const v = cover({ cx: lerp(1300, 640, u), cy: 600, k: 1.3 + .04 * u });
    IN.street(ctx, v, t, { solo }); },
  '0|American intelligence has been tapping': x => { const { ctx, t, T, cam, solo, s } = x, v = camView(CAR.views.both, cam, .5), tYear = W_(x, 'year', x.d - .3);   // салон: оба слушают, бобины крутятся, бирки месяцев до «year»
    ctx.save(); shake(ctx, cam);
    CAR.car(ctx, v, t, T, { solo, reelsAng: T * 3.2, tapes: Math.round(12 * clamp((t - .3) / Math.max(.4, tYear - .3))),
      a1: { keys: [[0, 'neutral']], press: env(t, .5, 2.4, .35), look: [.6, .25] }, a2: { keys: [[0, 'neutral']], look: [-.4, .45] } });
    ctx.restore(); },
  "0|AGENT: She's talking": x => { const { ctx, t, T, cam, solo, s } = x, v = camView(CAR.views.a1, cam, .5), ta = s.snap ?? 1;   // крупно AGENT: «She's talking to an American.» — прижимает наушник
    ctx.save(); shake(ctx, cam);
    CAR.car(ctx, v, t, T, { solo, reelsAng: T * 3.2, a1: { keys: [[0, 'neutral']], pressNear: env(t, ta - .3, x.d + 1, .25), look: [.7, .1], tilt: -.06 * env(t, ta - .3, x.d + 1, .25) }, a2: { keys: [[0, 'neutral']], look: [-.5, .3] } });
    ctx.restore(); },
  '0|AGENT 2: Which American': x => { const { ctx, t, T, solo } = x, v = V.rPov2;   // POV снова: рамка скользит с Алисы, официант заслоняет объектив (гэг), рамка находит Дженсена
    R.wide(ctx, v, t, T, { solo, j: { keys: [[0, 'neutral'], [1.0, 'laugh', { talking: false }]], laugh: t > 1.0, at: .5 }, a: { keys: [[0, 'smug']], at: .35 } });
    if (!solo) { const [fx, fy] = R.flame(v); candle(ctx, fx, fy, v.k, .4 + .05 * Math.sin(t * 23));
      const u = E.inOutCubic(clamp((t - .2) / 1.1)), hA = toS(v, [1655, 560]), hJ = toS(v, [270, 560]), lock = t > 1.4 ? 1 : 0;
      focusBox(ctx, lerp(hA[0] - 20, hJ[0] + 30, u), lerp(hA[1] + 40, hJ[1] + 40, u), 300, 400, lock);
      R.fgWaiter(ctx, clamp((t - .38) / .75), { y: 1560, s: 1.32, blur: 10 });
      x.API.viewfinder(ctx, t); } },
  '0|AGENT: The one in the jacket': x => { const { ctx, t, s } = x, ts = s.snap ?? .72;   // вставка: снимки падают на столик агента, последний — на «jacket»
    ctx.save(); shake(ctx, x.cam); const z = x.cam.z; ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
    IN.photosDrop(ctx, t, [.06, Math.max(.3, ts - .32), ts]); ctx.restore(); },
  '0|Jensen has no idea': x => { const { ctx, t, T, cam, solo } = x, v = camView(V.rCuJ, cam);   // крупно Дженсен смеётся и откидывается; на переднем плане — край меню и объектив
    ctx.save(); shake(ctx, cam);
    R.cu(ctx, v, t, T, { solo, who: 'J', keys: [[0, 'smug'], [.18, 'laugh', { talking: false }]], laugh: t > .18, lean: -.07 * E.inOutCubic(clamp((t - .2) / .6)), table: 'tableB2', bg: 'plateB2' });
    if (!solo) R.fgMenu(ctx, 1720, 840, 600, { lens: -1, glint: .35 + .25 * Math.sin(t * 4), blur: 11, tilt: -.08 });
    ctx.restore(); },
  '0|AGENT 2: Do we warn him': x => { const { ctx, t, T, cam, solo, s, d } = x, tw = s.whip?.t ?? d * .47;   // салон, вип-пан: AGENT 2 получает снимок, опускает наушники -> AGENT кладёт распечатку в папку и закрывает
    const wu = inOutExpo((t - tw + .1) / WHIP_DUR), a1s = lineSpan('AGENT', s.start, s.end), tClose = a1s ? a1s[1] - s.start + .15 : d - .5;
    const draw = (vv) => CAR.car(ctx, vv, t, T, { solo, reelsAng: T * 3.2,
      a2: { keys: [[0, 'neutral']], look: [-.3, .5], phones: E.inOutCubic(clamp((t - 1.05) / .35)), press: env(t, .85, 1.35, .2, .25),
        hold: { k: env(t, 0, d + 1, .2), at: [-150, -470] }, held: (c, P, sc) => CAR.tablet(c, P[0] - 110 * sc, P[1] - 20 * sc, 300 * sc, -.12, IN.snapPic, clamp((t - .12) / .5)) },
      a1: { keys: [[0, 'neutral']], look: [.5, .35], hold: { k: env(t, tw - .2, d + 1, .25), at: [170, -420] }, held: (c, P, sc) => CAR.subjectFolder(c, P[0] + 125 * sc, P[1] - 10 * sc, 320 * sc, .1, 1 - E.inOutCubic(clamp((t - tClose) / .3)), IN.snapPic) } });
    ctx.save(); shake(ctx, cam);
    const va = camView(CAR.views.a2, { ...cam, dx: 0 }), vb = camView(CAR.views.a1m, { ...cam, dx: 0 });
    draw(lerpView(va, vb, clamp(wu)));   // смаз — в ядре (smearInto), без копий-призраков
    ctx.restore(); },

  // ---------------- гл. 1 ----------------
  '1|HOST: Evening.': x => { const { ctx, t, T, cam, solo } = x, v = camView(OF.views.wide, cam, .6);   // кабинет: на «Evening» лампа щёлкает и мигает дважды; ведущий приподнимает котелок
    const lamp = t < .1 ? 0 : t < .16 ? 1 : t < .22 ? .2 : t < .28 ? 1 : t < .34 ? .35 : 1, tip = gesture(t, .55, { lead: .15, rise: .28, hold: .3, fall: .3, lagFrames: 3 });
    ctx.save(); shake(ctx, cam);
    OF.office(ctx, v, t, T, { solo, lamp, box: {}, photo: IN.snapPic, host: { keys: [[0, 'neutral']], tilt: -.05 * tip.body, hatTip: clamp(tip.hand) * 1.1, R: { k: tip.hand, to: [1149, 362] } } });
    if (!solo) OF.lampFlare(ctx, v, t > .1 ? gauss(t, .16, .07) + .7 * gauss(t, .28, .07) : 0);
    ctx.restore(); },
  '1|Mind the box,': x => { const { ctx, t, T, cam, solo, s } = x, v = camView(OF.views.box, cam, .06), tb = s.snap ?? .6;   // крупно: на «box» ладонь ложится на крышку коробки (короткий удар вниз)
    const k = E.outCubic(clamp((t - (tb - .3)) / .3)), press = gauss(t, tb + .03, .05);
    ctx.save(); shake(ctx, cam);
    OF.office(ctx, v, t, T, { solo, box: {}, photo: IN.snapPic, host: { keys: [[0, 'talk']], lean: .07 * k, look: [.7 * k, .45 * k], R: { k, to: OF.lidPt(-62, -30 * (1 - k) + 5 * press) } } });
    ctx.restore(); },
  "1|it's expensive.": x => { const { ctx, t, T, cam, solo } = x, v = camView(OF.views.box, cam, .06);   // вставка: палец стучит по крышке «тук-тук», пыль
    const taps = [W_(x, /^it/, .1), W_(x, 'expensive', .45)], bump = Math.max(...taps.map(t0 => gauss(t, t0 + .04, .05))), dust = Math.max(...taps.map(t0 => (t > t0 && t < t0 + .7 ? (t - t0) / .7 : 0)));
    ctx.save(); shake(ctx, cam);
    OF.office(ctx, v, t, T, { solo, box: { dust }, photo: IN.snapPic, host: { keys: [[0, 'talk']], lean: .07, look: [.7, .45], R: { k: 1, to: OF.lidPt(-62, -24 * bump) } } });
    ctx.restore(); },
  '1|HOST: Inside,': x => { const { ctx, t, T, cam, solo } = x, v = camView(OF.views.key, cam, .06);   // сверхкрупно: на «Inside» ведущий поднимает латунный ключ рядом с коробкой в свет лампы
    const up = E.inOutCubic(clamp((t - .05) / .7));
    ctx.save(); shake(ctx, cam);
    OF.office(ctx, v, t, T, { solo, box: {}, photo: IN.snapPic, host: { keys: [[0, 'talk']], lean: .04, look: [.5 - .9 * up, .3 - .7 * up],
      R: { k: .35 + .65 * up, to: [1186, lerp(470, 405, up)] }, key: { a: lerp(-1.2, -2.3, up), glint: .5 * gauss(t, .95, .15) } } });
    ctx.restore(); },
  '1|the most wanted chips on Earth.': x => { const { ctx, t, T, cam, solo, s } = x, v = camView(OF.views.glow, cam, .06);   // крупно: на «wanted» крышка приоткрывается, из щели — мягкий зелёный свет; на «Earth» блик на ключе (ключ поднят рядом)
    const tw = (s.ev || [])[0]?.t ?? .3, te = s.snap ?? 1.3, lid = .16 * E.inOutCubic(clamp((t - tw) / .45)), glow = .5 * clamp((t - tw - .1) / .4) * (.9 + .1 * Math.sin(t * 9));
    ctx.save(); shake(ctx, cam);
    OF.office(ctx, v, t, T, { solo, box: { lid, glow }, photo: IN.snapPic, host: { keys: [[0, 'talk']], lean: .04, look: [.6, .35], R: { k: 1, to: [1186, 405] }, key: { a: -2.3, glint: gauss(t, te + .05, .14) } } });
    ctx.restore(); },
  '1|HOST: Thirty grand apiece,': x => { const { ctx, t, T, cam, solo } = x, v = camView(OF.views.tag, cam, .06);   // вставка: на «Thirty» на коробку садится ценник $30,000 EACH
    ctx.save(); shake(ctx, cam);
    OF.office(ctx, v, t, T, { solo, box: { lid: .16, glow: .3 }, photo: IN.snapPic, tag: { k: clamp(t / .35), t, sub: false }, host: { keys: [[0, 'talk']], look: [.6, .25] } });
    ctx.restore(); },
  "1|by the maker's own count.": x => { const { ctx, t, T, cam, solo, s } = x, v = camView(OF.views.src, cam, .06), tm = (s.ev || [])[0]?.t ?? s.snap ?? .8;   // сверхкрупно: на «maker's» под ценой на ценнике встаёт строка SOURCE: NVIDIA (щелчок — ценник вздрагивает)
    ctx.save(); shake(ctx, cam);
    OF.office(ctx, v, t, T, { solo, blur: true, box: { lid: .16, glow: .3 }, photo: IN.snapPic, tag: { k: 1, t: t >= tm ? t - tm : 9, sub: t >= tm }, host: { keys: [[0, 'talk']], look: [.6, .25] } });
    ctx.restore(); },
  '1|HOST: And the man at that table': x => { const { ctx, t, T, cam, solo, s } = x, v = camView(OF.views.mid, cam, .4), tt = s.snap ?? .7;   // средний: кладёт ладонь на снимок «Дженсен + Алиса» под лампой
    const k = env(t, tt - .45, x.d + 1, .35);
    ctx.save(); shake(ctx, cam);
    OF.office(ctx, v, t, T, { solo, box: { lid: .16, glow: .3 }, tag: { k: 1, t: 9, sub: true }, photo: IN.snapPic, host: { keys: [[0, 'talk']], lean: -.05 * k, look: [-.6 * k, .45 * k], L: { k, to: [OF.CFG.photo[0] + 4, OF.CFG.photo[1] - 2] } } });
    ctx.restore(); },
  '1|held the key': x => { const { ctx, t, T, cam, solo, s } = x, v = camView(OF.views.keycam, cam, .06), tt = s.snap ?? .5;   // сверхкрупно: на «key» ключ протянут прямо в объектив, блик на бородке
    const k = E.inOutCubic(clamp((t - .05) / Math.max(.25, tt - .05)));
    ctx.save(); shake(ctx, cam);
    const r = OF.office(ctx, v, t, T, { solo, blur: true, box: { lid: .16, glow: .3 }, tag: { k: 1, t: 9, sub: true }, photo: IN.snapPic, host: { keys: [[0, 'talk']], look: [0, 0], R: { k: .55 + .45 * k, to: [1150 + 25 * k, 470 - 10 * k] }, key: null } });
    if (r.hr) OF.keyGrip(ctx, r.hr, r.s * lerp(1, 3.6, k), lerp(-1.6, -.9, k), gauss(t, tt + .05, .14) + .25 * k);   // хват на его же кисти; кисть с ключом крупнее — ближе к объективу
    ctx.restore(); },
  '1|to every one of them.': x => { const { ctx, t, T, cam, solo, s } = x, v = camView(OF.views.photo, cam, .06);   // вставка: на «every» ладонь ведущего пододвигает снимок «Дженсен + Алиса» под лампу; на «them» на снимок ложится блик ключа
    const te = (s.ev || [])[0]?.t ?? .5, tm = s.snap ?? 1.2, sl = E.outCubic(clamp((t - te) / .35)), dx = 46 * (1 - sl);
    ctx.save(); shake(ctx, cam);
    OF.office(ctx, v, t, T, { solo, box: { lid: .16, glow: .3 }, photo: IN.snapPic, photoDx: dx, photoGlint: gauss(t, tm + .06, .2), host: { keys: [[0, 'talk']], lean: -.05, look: [-.6, .45], L: { k: 1, to: [OF.CFG.photo[0] + dx + 30, OF.CFG.photo[1] - 2] } } });
    ctx.restore(); },
  '1|His first job in America': x => { const { ctx, t, T, cam, solo } = x, v = camView(KY.views.dorm, cam, .5);   // спальня: юный Дженсен с сундуком выше себя
    ctx.save(); shake(ctx, cam);
    KY.dorm(ctx, v, t, T, { solo, keys: [[0, 'neutral']], look: [lerp(.5, -.2, E.inOutCubic(clamp(t / 1.2))), -.45] });
    ctx.restore(); },
  '1|So how did China get someone': x => { const { ctx, t, cam, s } = x, tc = (s.ev || [])[0]?.t ?? x.d * .4;   // их стол сверху: карточка «JENSEN HUANG», его кожанка на стуле; напротив — пустой стул и пустая карточка; на «China» нить BEIJING завязывается на пустой карточке
    DT.desktop(ctx, cam, t, { base: 'top', thread: E.outCubic(clamp((t - tc + .05) / .45)), taut: 0 }); },
  '1|into the seat next to him': x => { const { ctx, t, cam, s } = x, ts = s.snap ?? x.d * .3, u = t - ts;   // ближе: пустая карточка и стул; на «seat» штамп RESERVED с толчком камеры, нить натягивается
    const kick = u > 0 && u < .3 ? 12 * Math.sin(u * 60) * (1 - u / .3) : 0;
    ctx.save(); ctx.translate(kick, kick * .6);
    DT.desktop(ctx, cam, t, { base: 'card', thread: 1, taut: u < 0 ? 0 : E.outBack(clamp(u / .3)), stamp: u });
    ctx.restore(); },
  '1|scrubbing toilets': x => { const { ctx, t, T, cam, solo, s } = x, v = camView(KY.views.bath, cam, .3, .5), tk = s.snap ?? .9;   // санузел, средний: юный Дженсен роняет швабру выше себя в ведро (брызги), на «Kentucky» берёт её
    ctx.save(); shake(ctx, cam);
    KY.bathMid(ctx, v, t, T, { solo, drop: Math.min(.45, tk - .35), grab: tk });
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
  '0|American intelligence believes': (ctx, s, t) => { const u = clamp((t - .25) / .3); if (u <= 0) return; const fall = (1 - E.outBack(u, 1.3)) * -260;
    ctx.save(); ctx.translate(W * .7, H * .6 + fall); ctx.rotate(.07); polaroidAt(ctx, 0, 0, 380, 0); ctx.restore();
    ctx.save(); ctx.translate(W * .7 - 120, H * .6 - 150 + fall); ctx.rotate(.07); ctx.strokeStyle = '#B9BEC6'; ctx.lineWidth = 7; ctx.beginPath(); ctx.roundRect(-14, -40, 28, 110, 14); ctx.stroke(); ctx.beginPath(); ctx.roundRect(-6, -26, 12, 80, 6); ctx.stroke(); ctx.restore(); },
};
const polaroidAt = (ctx, x, y, w, a) => PR.polaroid(ctx, x, y, w, a, IN.snapPic, 1);

// вещи-подписи аниматика, которые в финале уже стоят в кадре (или дублируют подпись в нижней трети)
export const SKIP_PROPS = { '1|So how did China get someone': /BEIJING|JENSEN/, '1|into the seat next to him': /BEIJING|RESERVED/, '0|American intelligence believes': /SUBJECT/,
  "0|He's Jensen Huang": /JENSEN HUANG/, "0|She's Alice Huang": /ALICE HUANG/, '0|Her company is one of': /VIP/, '0|American intelligence has been tapping': /JAN/, '0|AGENT 2: Do we warn him': /SUBJECT/,
  '1|HOST: Thirty grand apiece,': /\$30,000/, "1|by the maker's own count.": /SOURCE/ };
// дождь аниматика только на улице (в салоне и в зале ресторана — только за стеклом, он уже нарисован)
export const RAIN = s => s.loc === 'L02-sg-street' ? /общий/.test(s.framing) : s.loc !== 'L01-restaurant';
