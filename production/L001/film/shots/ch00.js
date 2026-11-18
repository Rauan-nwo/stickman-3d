// film/shots/ch00.js — постановка гл. 0 (владелец: ведущий). Ключ плана — 'глава|начало текста' (film/keys.js).
// Контракт рабочего — film/README.md, «Работа по главам». Рисовальщик плана: x => {...}, x = { ctx, s, t, d, T, cam, camAt, solo, API }.
import { clamp, lerp, E, gesture } from 'engine';
import { W, H, camView, toS, lerpView, cover } from '../staging/common.js';
import * as R from '../staging/restaurant.js';
import * as CAR from '../staging/car.js';
import * as OF from '../staging/office.js';
import * as KY from '../staging/kentucky.js';
import * as IN from '../staging/inserts.js';
import * as DT from '../staging/desktop.js';
import * as PR from '../props.js';
import { inOutExpo, gauss, env, W_, W0, shake, whipPlates, focusBox, freezeFrame, candle, V, WHIP_DUR, wordAt, lineSpan } from './common.js';

const polaroidAt = (ctx, x, y, w, a) => PR.polaroid(ctx, x, y, w, a, IN.snapPic, 1);

export const SHOTS = {
  '0|Picture this.': x => { const { ctx, t, T, cam, solo } = x, v = camView(V.rWide, cam, .3, .3);   // общий: двое за столом; агент с меню и объективом за дальним столиком справа (D01 #1)
    ctx.save(); shake(ctx, cam);
    R.wide(ctx, v, t, T, { solo, glint: tt => gauss(tt, .75, .16) + .8 * gauss(tt, x.s.snap ?? 1.5, .12), j: { keys: [[0, 'neutral']], at: 1.25 }, a: { keys: [[0, 'smug']] } });
    if (!solo) { const [fx, fy] = R.flame(v); candle(ctx, fx, fy, v.k, .35 + .65 * gauss(t, 1.15, .28) + .02 * Math.sin(t * 2.8));
    }
    ctx.restore(); },
  '0|sits down to dinner': x => { const { ctx, t, T, cam, solo, s } = x, ts = Math.min(t, s.snap ?? 1.4), v = camView(V.rPovA, { ...cam, z: x.camAt(ts).z, dx: 0 });   // POV: Алиса садится; щелчок — стоп-кадр
    const u = E.outCubic(clamp(ts / 1.0));
    R.wide(ctx, v, ts, T - t + ts, { solo, j: { keys: [[0, 'neutral']] }, a: { keys: [[0, 'smug']], dx: lerp(46, 0, u), dy: lerp(-20, 0, u), lean: lerp(.1, 0, u), armsK: clamp((ts - .55) / .55) } });
    if (!solo) { const [fx, fy] = R.flame(v); candle(ctx, fx, fy, v.k, .4 + .02 * Math.sin(ts * 2.8)); const hd = toS(v, [1655, 560]); focusBox(ctx, hd[0] - 30, hd[1] + 40, 360, 460, t > (s.snap ?? 1.4) ? 1 : 0); x.API.viewfinder(ctx, t); freezeFrame(ctx, t - (s.snap ?? 1.4)); } },
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
    if (!solo) { const [fx, fy] = R.flame(v); candle(ctx, fx, fy, v.k, .4 + .02 * Math.sin(t * 2.8));
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
    if (!solo) R.fgMenu(ctx, 1720, 840, 600, { lens: -1, glint: .35 + .08 * Math.sin(t * 2.8), blur: 11, tilt: -.08 });
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
  // ---- сцена ведущего: у каждого плана своя крупность; КАЖДОЕ событие стоит на своём слове (W_/W0 по words.json), а не на доле плана:
  //      если шотлист склеит соседние фразы в один план, план сыграет и следующие события (стук, свет из коробки, бирка SOURCE, ключ к объективу) ----
};
export const OVER = {
  '0|American intelligence believes': (ctx, s, t) => { const u = clamp((t - .25) / .3); if (u <= 0) return; const fall = (1 - E.outBack(u, 1.3)) * -260;
    ctx.save(); ctx.translate(W * .7, H * .6 + fall); ctx.rotate(.07); polaroidAt(ctx, 0, 0, 380, 0); ctx.restore();
    ctx.save(); ctx.translate(W * .7 - 120, H * .6 - 150 + fall); ctx.rotate(.07); ctx.strokeStyle = '#B9BEC6'; ctx.lineWidth = 7; ctx.beginPath(); ctx.roundRect(-14, -40, 28, 110, 14); ctx.stroke(); ctx.beginPath(); ctx.roundRect(-6, -26, 12, 80, 6); ctx.stroke(); ctx.restore(); },
};
export const SKIP_PROPS = { '0|American intelligence believes': /SUBJECT/, "0|He's Jensen Huang": /JENSEN HUANG/, "0|She's Alice Huang": /ALICE HUANG/, '0|Her company is one of': /VIP/, '0|American intelligence has been tapping': /JAN/, '0|AGENT 2: Do we warn him': /SUBJECT/ };
export const RAIN = null;   // или s => true/false/undefined — переопределение дождя для планов главы
