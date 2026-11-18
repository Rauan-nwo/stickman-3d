// film/shots/ch01.js — постановка гл. 1 (владелец: ведущий). Ключ плана — 'глава|начало текста' (film/keys.js).
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

export const SHOTS = {
  '1|HOST: Evening.': x => { const { ctx, t, T, cam, solo } = x, v = camView(OF.views.wide, cam, .6);   // ОБЩИЙ кабинет: на «Evening» лампа щёлкает и мигает дважды; ведущий приподнимает котелок
    const lamp = t < .1 ? 0 : t < .16 ? 1 : t < .22 ? .2 : t < .28 ? 1 : t < .34 ? .35 : 1, tip = gesture(t, .55, { lead: .15, rise: .28, hold: .3, fall: .3, lagFrames: 3 });
    ctx.save(); shake(ctx, cam);
    OF.office(ctx, v, t, T, { solo, lamp, box: {}, photo: IN.snapPic, host: { keys: [[0, 'neutral']], tilt: -.05 * tip.body, hatTip: clamp(tip.hand) * 1.1, R: { k: tip.hand, to: [1149, 362] } } });
    if (!solo) OF.lampFlare(ctx, v, t > .1 ? gauss(t, .16, .07) + .7 * gauss(t, .28, .07) : 0);
    ctx.restore(); },
  '1|Mind the box,': x => { const { ctx, t, T, cam, solo, s } = x, v = camView(OF.views.hand, cam, .06), tb = W_(x, 'box', s.snap ?? .6);   // КРУПНО рука на коробке: на «box» ладонь с размаху ложится на крышку (чёрточки удара); если в плане есть «it's expensive» — дальше стучит
    const k = E.inCubic(clamp((t - (tb - .28)) / .28)), at = OF.lidPt(-58, 2), more = [W0(x, /^it/), W0(x, 'expensive')].filter(q => q != null && q > tb + .2);
    const hits = [tb, ...more], last = hits.filter(q => t >= q).pop(), lift = t < tb + .15 || !more.length ? 0 : clamp(Math.min(...more.map(q => Math.abs(t - q))) / .13);
    const dust = Math.max(0, ...more.map(q => (t > q && t < q + .7 ? (t - q) / .7 : 0)));
    ctx.save(); shake(ctx, cam);
    OF.office(ctx, v, t, T, { solo, box: { dust }, photo: IN.snapPic, tap: last != null ? { at, u: t - last } : null, host: { keys: [[0, 'talk']], lean: .09 * k, look: [.7, .45], R: { k: .45 + .55 * k, to: [at[0], at[1] - 46 * (1 - k) - 26 * lift] } } });
    ctx.restore(); },
  "1|it's expensive.": x => { const { ctx, t, T, cam, solo } = x, v = camView(OF.views.box, cam, .06);   // ВСТАВКА коробка: палец стучит по крышке «тук-тук» на «it's» и «expensive», с крышки слетает пыль
    const taps = [W_(x, /^it/, .1), W_(x, 'expensive', .45)], at = OF.lidPt(-58, 2), last = taps.filter(q => t >= q).pop();
    const lift = clamp(Math.min(...taps.map(t0 => Math.abs(t - t0))) / .13);   // 0 — кисть на крышке (удар), 1 — приподнята
    const dust = Math.max(...taps.map(t0 => (t > t0 && t < t0 + .7 ? (t - t0) / .7 : 0)));
    ctx.save(); shake(ctx, cam);
    OF.office(ctx, v, t, T, { solo, box: { dust }, photo: IN.snapPic, tap: last != null ? { at, u: t - last } : null, host: { keys: [[0, 'talk']], lean: .08, look: [.7, .45], R: { k: 1, to: [at[0], at[1] - 26 * lift] } } });
    ctx.restore(); },
  '1|HOST: Inside,': x => { const { ctx, t, T, cam, solo } = x, v = camView(OF.views.xkey, cam, .06), ti = W_(x, 'Inside', 0);   // СВЕРХКРУПНО ключ: на «Inside» кисть ведущего поднимает латунный ключ к объективу, в свет лампы; ключ — треть кадра
    const up = E.outCubic(clamp((t - ti - .02) / .6)), tw = W0(x, 'wanted'), tc = W0(x, 'chips'), te = W0(x, 'Earth'), op = tw == null ? 0 : E.outCubic(clamp((t - tw) / .3));   // «wanted» в этом же плане — коробка внизу приоткрывается
    ctx.save(); shake(ctx, cam);
    const r = OF.office(ctx, v, t, T, { solo, blur: true, box: { lid: .2 * op, glow: .7 * op }, spill: op * (.75 + .25 * Math.sin(t * 11)) + (tc == null ? 0 : .6 * gauss(t, tc + .05, .12)), photo: IN.snapPic, host: { keys: [[0, 'talk']], lean: .03, look: [.75, -.1 - .3 * up], noR: true } });
    if (r.sr) OF.bigKey(ctx, [...r.sr, r.s], toS(v, [1215, lerp(560, 365, up)]), lerp(120, 172, up), lerp(-.25, -.62, up), gauss(t, te != null ? te + .05 : ti + .85, .16), solo ? 0 : up);
    ctx.restore(); },
  '1|HOST: Thirty grand apiece,': x => { const { ctx, t, T, cam, solo } = x, v = camView(OF.views.tag, cam, .06), t0 = W_(x, 'Thirty', 0), tm = W0(x, "maker's");   // ВСТАВКА ценник: на «Thirty» на коробку садится ценник $30,000 EACH (коробка во весь кадр)
    ctx.save(); shake(ctx, cam);
    OF.office(ctx, v, t, T, { solo, blur: true, box: { lid: .2, glow: .45 }, spill: .35, photo: IN.snapPic, tag: { k: clamp((t - t0) / .3), t: tm != null && t >= tm ? t - tm : t - t0, sub: tm != null && t >= tm }, host: false });   // «maker's» в этом же плане — строка SOURCE встаёт здесь
    ctx.restore(); },
  "1|by the maker's own count.": x => { const { ctx, t, T, cam, solo, s } = x, v = camView(OF.views.src, cam, .06), tm = W_(x, "maker's", (s.ev || [])[0]?.t ?? s.snap ?? .8);   // СВЕРХКРУПНО бирка: ценник во весь кадр; на «maker's» под ценой встаёт строка SOURCE: NVIDIA, ценник вздрагивает
    ctx.save(); shake(ctx, cam);
    OF.office(ctx, v, t, T, { solo, blur: true, box: { lid: .2, glow: .45 }, photo: IN.snapPic, tag: { k: 1, t: t >= tm ? t - tm : 9, sub: t >= tm }, host: false });
    ctx.restore(); },
  '1|HOST: And the man at that table': x => { const { ctx, t, T, cam, solo, s } = x, v = camView(OF.views.mid, cam, .4), tt = W_(x, 'table', s.snap ?? .7), tk = W0(x, 'key');   // СРЕДНИЙ ведущий: на «table» кладёт ладонь на снимок под лампой; ключ в опущенной правой руке; если «key» в этом же плане — выбрасывает ключ к объективу
    const k = env(t, tt - .45, x.d + 1, .35), kk = tk == null ? 0 : E.outCubic(clamp((t - (tk - .3)) / .35));
    ctx.save(); shake(ctx, cam);
    const r = OF.office(ctx, v, t, T, { solo, box: { lid: .2, glow: .45 }, spill: .25, tag: { k: 1, t: 9, sub: true }, photo: IN.snapPic, host: { keys: [[0, 'talk']], lean: -.05 * k, look: [-.6 * k * (1 - kk), .45 * k * (1 - kk)], L: { k, to: [OF.CFG.photo[0] + 4, OF.CFG.photo[1] - 2] }, key: kk > 0 ? null : { a: 1.35 }, noR: kk > 0 } });
    if (kk > 0 && r.sr) OF.bigKey(ctx, [...r.sr, r.s], toS(v, [lerp(1130, 1250, kk), lerp(640, 430, kk)]), lerp(12 * r.s, 150, kk), lerp(1.35, -.95, kk), gauss(t, tk + .06, .15) + .2 * kk, 0);
    ctx.restore(); },
  '1|to every one of them.': x => { const { ctx, t, T, cam, solo, s } = x, v = camView(OF.views.photo, cam, .06);   // ВСТАВКА снимок: на «every» ладонь ведущего пододвигает снимок «Дженсен + Алиса» под лампу; на «them» на снимок ложится блик ключа
    const te = W_(x, 'every', (s.ev || [])[0]?.t ?? .5), tm = W_(x, 'them', s.snap ?? 1.2), sl = E.outCubic(clamp((t - te) / .35)), dx = 46 * (1 - sl);
    ctx.save(); shake(ctx, cam);
    OF.office(ctx, v, t, T, { solo, box: { lid: .2, glow: .45 }, photo: IN.snapPic, photoDx: dx, photoGlint: gauss(t, tm + .06, .2), host: { keys: [[0, 'talk']], lean: -.05, look: [-.6, .45], L: { k: 1, to: [OF.CFG.photo[0] + dx + 30, OF.CFG.photo[1] - 2] } } });
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
export const OVER = {
};
export const SKIP_PROPS = { '1|So how did China get someone': /BEIJING|JENSEN/, '1|into the seat next to him': /BEIJING|RESERVED/, '1|HOST: Thirty grand apiece,': /\$30,000/, "1|by the maker's own count.": /SOURCE/ };
export const RAIN = null;   // или s => true/false/undefined — переопределение дождя для планов главы
