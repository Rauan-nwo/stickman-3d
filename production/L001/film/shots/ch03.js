// film/shots/ch03.js — постановка гл. 3 (владелец: ведущий). Ключ плана — 'глава|начало текста' (film/keys.js).
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
import { WA } from '../staging/washington.js';
import { NV } from '../staging/nvidia.js';
import { BJ } from '../staging/beijing.js';
import { silhouette } from '../staging/desk.js';
import { official, aide, officer } from '../chars.js';
import { jensen, noirShade } from 'engine';

const OFFICIAL = official(), JH = jensen(), OFF1 = officer(), OFF2 = officer(), ASSIST = aide();
for (const C of [JH]) C.spec.rig = { ...C.spec.rig, armLayer: 'front' };
import { inOutExpo, gauss, env, W_, W0, shake, whipPlates, focusBox, freezeFrame, candle, V, WHIP_DUR, wordAt, lineSpan } from './common.js';

export const SHOTS = {
  // ---- Вашингтон: чиновник за столом (desk.js), телефон у уха — разговор с Дженсеном ----
  "3|OFFICIAL: Your best chips can't go": x => { const { ctx, t, T, cam, solo } = x, v = WA.view('cu', cam), tc = W_(x, "can't", .6);   // КРУПНО чиновник с трубкой; на «can't» свободная рука шлёпает штамп BLOCKED на лист с чипом
    const k = env(t, tc - .35, tc + .45, .22, .25);
    ctx.save(); shake(ctx, cam);
    WA.seated(ctx, v, t, T, { C: OFFICIAL, sp: 'OFFICIAL', solo, blur: 3, keys: [[0, 'neutral']], phone: 'L', phoneK: 1, look: [.15, .3], R: { k, to: [1010, 800 - 30 * (1 - k)] },
      deskTop: (c, vv) => { const P = toS(vv, [1010, 822]); PR.chipSheet(c, P[0], P[1], 150 * vv.k); if (t > tc) PR.stampMark(c, P[0] + 8 * vv.k, P[1] + 4 * vv.k, 120 * vv.k, 'BLOCKED', clamp((t - tc) / .12)); },
      heldR: k > .2 ? (c, P, s) => PR.rubberStamp(c, P[0], P[1] + 18 * s, 80 * s) : null });
    ctx.restore(); },
  '3|OFFICIAL: The ones they want': x => { const { ctx, t, T, cam, solo } = x, v = WA.view('revDoor', cam);   // ОБРАТНАЯ: чиновник стоит у двери с навесным замком, трубка у уха
    ctx.save(); shake(ctx, cam);
    WA.revPlate(ctx, v, 0, solo);
    WA.standing(ctx, v, t, T, { C: OFFICIAL, rev: true, at: 'door', sp: 'OFFICIAL', solo, view: 'threeQuarter', facing: -1, look: [-.3, 0], L: { k: 1, to: [1018, 420] }, heldL: (c, P, s) => PR.handsetHeld(c, P, s, -1) });
    WA.revFront(ctx, v, 0, solo);
    ctx.restore(); },
  '3|OFFICIAL: Absolutely not': x => { const { ctx, t, T, cam, solo } = x, v = WA.view('mid', cam);   // СРЕДНИЙ чиновник: качает головой, трубка у уха
    ctx.save(); shake(ctx, cam);
    WA.seated(ctx, v, t, T, { C: OFFICIAL, sp: 'OFFICIAL', solo, keys: [[0, 'neutral']], phone: 'L', phoneK: 1, look: [.5 * Math.sin(t * 9) * clamp(t / .3) * clamp((x.d - t) / .3), .1] });
    ctx.restore(); },
  '3|OFFICIAL: Still no': x => { const { ctx, t, T, cam, solo } = x, v = WA.view('xcu', cam);   // СВЕРХКРУПНО: глаза поверх очков, не моргает
    ctx.save(); shake(ctx, cam);
    WA.seated(ctx, v, t, T, { C: OFFICIAL, sp: 'OFFICIAL', solo, blur: 5, keys: [[0, 'neutral']], phone: 'L', phoneK: 1, look: [0, -.15], tilt: .04, seed: 99 });
    ctx.restore(); },
};
export const OVER = {
};
export const SKIP_PROPS = { "3|OFFICIAL: Your best chips can't go": /BLOCKED/ };
export const RAIN = null;   // или s => true/false/undefined — переопределение дождя для планов главы
