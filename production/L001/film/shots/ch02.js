// film/shots/ch02.js — постановка гл. 2 (владелец: ведущий). Ключ плана — 'глава|начало текста' (film/keys.js).
// Контракт рабочего — film/README.md, «Работа по главам». Рисовальщик плана: x => {...}, x = { ctx, s, t, d, T, cam, camAt, solo, API }.
import { clamp, lerp, E, gesture } from 'engine';
import { W, H, camView, toS, lerpView, cover, plate } from '../staging/common.js';
import * as R from '../staging/restaurant.js';
import * as CAR from '../staging/car.js';
import * as OF from '../staging/office.js';
import * as KY from '../staging/kentucky.js';
import * as IN from '../staging/inserts.js';
import * as DT from '../staging/desktop.js';
import * as PR from '../props.js';
import { inOutExpo, gauss, env, W_, W0, shake, whipPlates, focusBox, freezeFrame, candle, V, WHIP_DUR, wordAt, lineSpan } from './common.js';

// фон вставки/плана: плейт, при b — статично размытый (без мерцания)
const plateK = (ctx, im, v, b = 0) => { if (!b) return plate(ctx, im, v); ctx.save(); ctx.filter = `blur(${b}px)`; plate(ctx, im, v); ctx.restore(); };

export const SHOTS = {
  // ---- L08 Кентукки (ведущий): санузел, ряд кабинок, спальня соседа; staging/kentucky.js ----
  '2|The older boys were sent out to do farm work': x => { const { ctx, t, T, cam, solo } = x, v = camView({ cx: 900, cy: 560, k: 1.15 }, cam, .25), tl = W_(x, 'work', 1.8);   // ОБЩИЙ санузел: в окне колонна старших с вилами уходит в поле, последний — брат в клетчатой рубашке оглядывается; впереди маленький Дженсен у ведра
    ctx.save(); shake(ctx, cam);
    if (!solo) { const a = KY.A(); if (a) plateK(ctx, a.bath, v); KY.boysInWindow(ctx, v, t, tl); }
    KY.boyByBucket(ctx, v, t, T, { solo, look: [-.35, -.55], keys: [[0, 'neutral'], [tl + .2, 'nervous']], facing: -1, handTo: [906, 690] });
    ctx.restore(); },
  '2|Jensen, one of the youngest, got the bathrooms': x => { const { ctx, t, T, cam, solo } = x, v = camView({ cx: 880, cy: 560, k: 2.0 }, cam, .2), tg = W_(x, 'bathrooms', 2.2);   // КРУПНО юный Дженсен смотрит вверх на швабру выше себя, сглатывает
    ctx.save(); shake(ctx, cam);
    KY.bathMid(ctx, v, t, T, { solo, drop: -5, grab: 99, look: [.45, -.8], keys: [[0, 'neutral'], [tg - .1, 'nervous']] });
    ctx.restore(); },
  '2|Every bathroom in the dorm': x => { const { ctx, t, T, cam, solo } = x, v = camView({ cx: 1180, cy: 560, k: 1.2 }, cam, .2);   // ОБЩИЙ: ряд кабинок до горизонта, двери хлопают по очереди; Дженсен со шваброй у ближней
    ctx.save(); shake(ctx, cam);
    if (!solo) { const a = KY.A(); if (a) plateK(ctx, a.bath, v); KY.stallRow(ctx, v, t, 7, .05, .17); }
    KY.bathMid(ctx, v, t, T, { solo, noPlate: true, drop: 99, grab: 99, look: [.6, -.2], keys: [[0, 'neutral']] });
    ctx.restore(); },
  '2|Every single day': x => { const { ctx, t, T, cam, solo } = x, v = camView({ cx: 860, cy: 600, k: 1.5 }, cam, .2), te = W_(x, 'Every', .05), td = W_(x, 'day', 1.0);   // СРЕДНИЙ: Дженсен со шваброй у кабинки, над ним отрывной календарь: MON…SUN слетают по одному, на «day» падает SUN
    ctx.save(); shake(ctx, cam);
    KY.bathMid(ctx, v, t, T, { solo, drop: 99, grab: 99, look: [-.3, -.6], keys: [[0, 'neutral'], [td, 'nervous']] });
    if (!solo) KY.dayPad(ctx, toS(v, [640, 420]), 120 * v.k, t, te, td);
    ctx.restore(); },
  '2|His roommate was seventeen': x => { const { ctx, t, T, cam, solo } = x, v = camView({ cx: 760, cy: 560, k: 1.15 }, cam, .25), ts = W_(x, 'seventeen', 1.0), sit = E.inOutCubic(clamp((t - ts + .4) / .5));   // ОБЩИЙ спальня: огромный подросток с перевязанной рукой садится на койку, койка прогибается
    ctx.save(); shake(ctx, cam);
    KY.roommateBed(ctx, v, t, T, { solo, sit, tSit: ts + .1, keys: [[0, 'neutral']], look: [.6, .15] });
    ctx.restore(); },
  "2|and he couldn't read": x => { const { ctx, t, cam, solo } = x, tf = W_(x, 'read', .55), flip = E.inOutCubic(clamp((t - tf) / .45));   // ВСТАВКА: книга вверх ногами в больших руках; маленькая рука переворачивает её
    if (solo) return; ctx.save(); shake(ctx, cam); const a = KY.A(); if (a) plateK(ctx, a.dorm, cover({ cx: 500, cy: 700, k: 3 }), 8);
    ctx.fillStyle = 'rgba(30,20,12,.3)'; ctx.fillRect(0, 0, W, H);
    const C = [960, 520], bw = 640;
    KY.book(ctx, C, bw, Math.PI * (1 - flip));
    KY.insertArm(ctx, [380, H + 120], [C[0] - bw * .44, C[1] + 170], 1.6, 'big'); KY.insertArm(ctx, [1540, H + 120], [C[0] + bw * .44, C[1] + 170], 1.6, 'big');
    const kid = env(t, tf - .35, tf + .55, .3, .3); if (kid > .01) KY.insertArm(ctx, [W + 80, C[1] - 260], [lerp(W + 80, C[0] + bw * .34, kid), lerp(C[1] - 260, C[1] - 150 + 120 * flip, kid)], 1.3, 'kid');
    ctx.restore(); },
  '2|ROOMMATE: You teach me to read': x => { const { ctx, t, T, cam, solo, s, d } = x, tw = s.whip?.t ?? d * .55;   // КРУПНО сосед протягивает книгу -> вип-пан -> юный Дженсен показывает на штангу в углу
    ctx.save(); shake(ctx, cam);
    const vA = camView({ cx: 600, cy: 650, k: 1.6 }, cam, .15), vB = camView({ cx: 1080, cy: 620, k: 1.6 }, cam, .15);
    whipPlates(ctx, t, tw,
      () => { const r = KY.roommateBed(ctx, vA, t, T, { solo, sit: 1, tSit: -9, keys: [[0, 'neutral']], look: [.7, 0], R: { k: E.outCubic(clamp(t / .4)), to: [700, 600] } }); if (!solo && r.hr) KY.book(ctx, [r.hr[0] + 40 * vA.k, r.hr[1] - 10 * vA.k], 150 * vA.k, -.1); },
      () => { KY.dorm(ctx, vB, t, T, { solo, noTrunk: true, look: [.7, .3], point: KY.CFG.barbell, pointK: E.outBack(clamp((t - tw - .1) / .3)), keys: [[0, 'neutral']] }); });
    ctx.restore(); },
  '2|ROOMMATE: Deal': x => { const { ctx, t, cam, solo } = x, sh = t > .3 ? Math.sin((t - .3) * 7) * 18 * clamp((x.d - t) / .4) : 0;   // ВСТАВКА рукопожатие: огромная рука в бинте и маленькая жмут друг другу руки над книгой — сделка
    if (solo) return; ctx.save(); shake(ctx, cam); const a = KY.A(); if (a) plateK(ctx, a.dorm, cover({ cx: 500, cy: 700, k: 3 }), 8);
    ctx.fillStyle = 'rgba(30,20,12,.3)'; ctx.fillRect(0, 0, W, H);
    KY.book(ctx, [960, 800], 520, .05);
    const meet = E.outCubic(clamp(t / .3)), P = [960, 470 + sh];
    KY.insertArm(ctx, [-80, 760], [lerp(400, P[0] - 26, meet), P[1]], 1.9, 'big'); KY.insertArm(ctx, [W + 80, 700], [lerp(1500, P[0] + 26, meet), P[1] + 4], 1.6, 'kid');
    ctx.restore(); },
  // --- B --- (рабочий B: Denny's, стол сверху, кухня Denny's, крыльцо родственников; рисовальщики — shots/ch02_B.js)
  '2|To pay for it, according to biographer': x => B2.s36(x),   // стол сверху: вещи родителей с ценниками, штампы SOLD по словам; плашка источника — ядро
  '2|AUNT: Oneida Baptist Institute': x => B2.s37(x),   // крыльцо: тётя с брошюрой VERY STRICT, мальчики на чемоданах -> вип-пан -> дядя кивает, хлопает по чемодану
  '2|and the family had chosen it by mistake': x => B2.s40(x),   // улыбки застывают; на «mistake» брошюра крупно: FOR TROUBLED BOYS
  '2|At fifteen he took the night shift': x => B2.s52(x),   // подросток в фартуке у мойки; на «night» часы 2:00 AM; растёт и качается стопка тарелок
  '2|He started at the sink': x => B2.s53(x),   // башня тарелок выше головы; на «busboy» бейдж BUSBOY и поднос
  '2|In 1993 he walked back into one': x => B2.s54(x),   // колокольчик, входит Дженсен-1993, официантка протягивает меню
  '2|In a booth in San Jose': x => B2.s55(x),   // трое садятся в кабинку; на стекле SAN JOSE
  '2|planned a company that would build chips': x => B2.s56(x),   // столик сверху: квадрат-чип на салфетке, каркасный куб, «3D»
  '2|WAITRESS: What can I get you': x => B2.s57(x),   // официантка щёлкает ручкой -> вип-пан -> Дженсен стучит по салфетке с кубом
  '2|WAITRESS: Coffee': x => B2.s58(x),   // вставка: кофе льётся в кружку рядом с салфеткой
  '2|Thirty years later': x => B2.s59(x),   // над кабинкой привинчивают табличку (та же, что в гл. 9)
  '2|CHRIS: How long can we last': x => B2.s62(x),   // кабинка ночью 1997: пустые кружки, банка PAYROLL, Крис вертит чашку
  '2|JENSEN: One month': x => B2.s63(x),   // вставка: банка PAYROLL, одна тонкая пачка
  '2|CHRIS: And if the chip flops': x => B2.s64(x),   // Крис поднимает бровь -> вип-пан -> Дженсен отодвигает тарелку блинов на троих
};
export const OVER = {
};
export const SKIP_PROPS = { '2|Every single day': /MON|TUE|WED|THU|FRI|SAT|SUN/, /* --- B --- */ '2|In a booth in San Jose': /SAN JOSE/, '2|Thirty years later': /BOOTH/, '2|He started at the sink': /BUSBOY/, '2|At fifteen he took the night shift': /2:00/, '2|JENSEN: One month': /PAYROLL/, '2|CHRIS: How long can we last': /PAYROLL|1997/, '2|AUNT: Oneida Baptist Institute': /VERY STRICT/, '2|and the family had chosen it by mistake': /TROUBLED/, '2|planned a company that would build chips': /3D/, };
export const RAIN = null;   // или s => true/false/undefined — переопределение дождя для планов главы
import * as B2 from './ch02_B.js';   // --- B --- рисовальщики рабочего B
