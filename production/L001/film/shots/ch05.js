// film/shots/ch05.js — постановка гл. 5 (владелец: рабочий A). Ключ плана — 'глава|начало текста' (film/keys.js).
// Контракт рабочего — film/README.md, «Работа по главам». Рисовальщик плана: x => {...}, x = { ctx, s, t, d, T, cam, camAt, solo, API }.
// Локации: L10 бар Тайбэя (staging/bar.js), L09 Megaspeed (staging/megaspeed.js); L11 зал — staging ведущего (когда будет готов).
import { clamp, lerp, E, gesture, ell } from 'engine';
import { W, H, camView, toS, lerpView, cover, soft } from '../staging/common.js';
import * as PR from '../props.js';
import { inOutExpo, gauss, env, W_, W0, shake, whipPlates, focusBox, freezeFrame, candle, V, WHIP_DUR, wordAt, lineSpan } from './common.js';
import * as MS from '../staging/megaspeed.js';
import * as BR from '../staging/bar.js';
import * as PA from '../props_A.js';
import { alice, jensen } from 'engine';
import { accountant, accountant2, banker, banker2, photographer, guest, fan, fan2, person, shadeOf, drawP } from '../chars_A.js';
import { EH } from '../staging/eventhall.js';
import * as JK from '../staging/jokes_A.js';
import { glassBoxes, glassOver, sign } from './ch04.js';

const fixArms = C => { C.spec.rig = { ...C.spec.rig, plantLegs: .02, armLayer: 'front' }; return C; };
const JH = fixArms(jensen()), AL = fixArms(alice()), PH = photographer(), G = [0, 1, 2, 3].map(guest);
const FN = fan(), F2 = fan2(), Q = [4, 5, 6].map(guest);
const AC = accountant(), A2 = accountant2(), BK = banker(), B2 = banker2();
const whipU = (t, tw) => clamp(inOutExpo((t - tw + .1) / WHIP_DUR));

// ---------- бар: гости, Дженсен с виски, Алиса с бейджем MEGASPEED ----------
// o = { pose: 'party' | 'photo', t0 — момент позы (стоп-кадр: время замирает), sp — кто говорит (CROWD — все), raise 0..1 — бокалы вверх, aliceFwd 0..1, solo }
function barScene(ctx, v, t, T, o = {}) {
  const photo = o.pose === 'photo', tt = o.freeze != null ? Math.min(t, o.freeze) : t, TT = T - t + tt, sp = o.sp || null, r = o.raise ?? (photo ? 1 : 0);
  BR.bar(ctx, v, o.blur || 0, o.solo);
  const glass = (c, h, s) => PA.whisky(c, h[0], h[1] + 8 * s, s * 1.1);
  const front = photo ? null : 'threeQuarter';
  const cast = [
    [G[2], 470, { f: 1, look: photo ? [0, 0] : [.6, 0], dz: -14, seed: 4 }],
    [G[0], 690, { f: 1, look: photo ? [0, 0] : [.7, .05], seed: 1, R: { k: .35 + .65 * r, to: [740, 760 - 90 * r] }, held: { R: glass } }],
    [G[3], 1460, { f: -1, look: photo ? [0, 0] : [-.6, 0], dz: -14, seed: 6 }],
    [G[1], 1270, { f: -1, look: photo ? [0, 0] : [-.7, .05], seed: 3, L: { k: .35 + .65 * r, to: [1220, 760 - 90 * r] }, held: { L: glass } }],
  ];
  for (const [C, x, m] of cast) BR.guestAt(ctx, C, v, tt, TT, x, { view: front, keys: [[0, photo ? 'smile' : 'laugh']], sp: sp === 'CROWD' ? 'CROWD' : null, solo: o.solo, ...m });
  const jr = o.jRaise ?? r;
  BR.guestAt(ctx, JH, v, tt, TT, 900, { view: front, f: 1, keys: [[0, o.jKeys || (photo ? 'smile' : 'laugh')]], look: photo ? [0, 0] : [.3, 0], sp: o.jsp || (sp === 'CROWD' ? 'CROWD' : null), seed: 2, solo: o.solo,
    R: { k: .35 + .65 * jr, to: [960, 780 - 120 * jr] }, held: { R: glass }, L: o.jWave ? { k: o.jWave, to: [760, 640] } : undefined });
  if (o.alice !== false) { const fw = o.aliceFwd ?? 1, ax = lerp(1135, 1075, fw), adz = lerp(-40, 0, fw);
    const P = BR.guestAt(ctx, AL, v, tt, TT, ax, { dz: adz, view: front, f: -1, keys: [[0, 'smug']], look: photo ? [0, 0] : [-.5, 0], sp: sp === 'CROWD' ? 'CROWD' : null, seed: 5, solo: o.solo });
    if (!o.solo) BR.chestBadge(ctx, P, v, 'MEGASPEED', 'ALICE HUANG', 1.1); }
  BR.stools(ctx, v, o.solo);
}
// снимок вечеринки (как на отпечатке): холст 1920×1080 — тот же стоп-кадр, что в #168
const SHOT_T = 1.4;
function partyPhoto(T) { return PA.offscreen('party', c => barScene(c, BR.views.group, SHOT_T, T, { pose: 'photo', freeze: SHOT_T })); }
const snapPic = (T) => (c, w, h) => { const im = partyPhoto(T); c.drawImage(im, 0, 0, w, h); c.fillStyle = 'rgba(255,230,190,.06)'; c.fillRect(0, 0, w, h); };
const chipSticker = (c, x, y, w) => { c.save(); c.translate(x, y); c.fillStyle = '#1f9a4c'; c.fillRect(-w, -w, w * 2, w * 2); c.strokeStyle = '#141014'; c.lineWidth = w * .15; c.strokeRect(-w, -w, w * 2, w * 2); c.fillStyle = '#9dffb5'; c.fillRect(-w * .45, -w * .45, w * .9, w * .9); c.restore(); };
const flashW = (ctx, u) => { if (u <= 0 || u > 1) return; ctx.save(); ctx.fillStyle = `rgba(255,255,255,${(1 - u) * .95})`; ctx.fillRect(0, 0, W, H); ctx.restore(); };

export const SHOTS = {
  '5|That same month, at a party': x => { const { ctx, t, T, cam, solo } = x, v = camView(BR.views.wide, cam, .3), tp = W_(x, 'party', 1.32);   // ОБЩИЙ бар: Дженсен с виски среди гостей; на «party» поднимает бокал
    ctx.save(); shake(ctx, cam); barScene(ctx, v, t, T, { pose: 'party', raise: .2, jRaise: E.outBack(clamp((t - (tp - .3)) / .35)), alice: false, solo }); ctx.restore(); },
  '5|a camera flashed': x => { const { ctx, t, T, cam, solo } = x, tf = W_(x, 'flashed', .44), ts = W_(x, 'standing', 2.17);   // ВСТАВКА фото в рамке: вспышка -> отпечаток в такой же рамке, что пустая на столе Алисы; наезд на Алису рядом с Дженсеном
    if (t < tf + .06) { const v = camView(BR.views.group, cam, .2); barScene(ctx, v, t, T, { pose: 'photo', solo }); flashW(ctx, (t - tf) / .3); return; }
    if (solo) return;
    const push = E.inOutCubic(clamp((t - (ts - .4)) / 1.2)), z = cam.z;
    BR.bar(ctx, { cx: 960, cy: 540, k: 1.4 }, 10);
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(z * lerp(1, 1.9, push), z * lerp(1, 1.9, push)); ctx.translate(lerp(0, -150, push), lerp(0, 40, push));
    PA.photoFrame(ctx, 0, 330, 640, 1, (c, w, h) => { c.save(); c.translate(w / 2, h / 2); c.scale(h / 1080 * 1.05, h / 1080 * 1.05); c.drawImage(partyPhoto(T), -960 - 120, -540); c.restore(); });
    ctx.restore();
    ctx.save(); ctx.fillStyle = '#F2E8CC'; ctx.globalAlpha = clamp((t - tf - .4) / .3) * (1 - push); PA.label(ctx, 'COMPUTEX PARTY · JUNE 2024', W / 2, H - 70, 40, '#F2E8CC'); ctx.restore();
    flashW(ctx, (t - tf) / .3); },
  '5|PHOTOGRAPHER: Everyone, squeeze in': x => { const { ctx, t, T, cam, solo, s } = x, tw = s.whip?.t ?? 1.5, tf = W_(x, 'front', 2.36);   // КРУПНО фотограф машет «сдвиньтесь» -> вип-пан -> Дженсен подталкивает гостей; на «front» Алиса выходит вперёд
    const wu = whipU(t, tw), v = camView(lerpView({ cx: 600, cy: 560, k: 1.9 }, { cx: 1000, cy: 560, k: 1.85 }, wu), { ...cam, dx: 0 }, .1);
    const fwd = E.inOutCubic(clamp((t - (tf - .25)) / .3)), wave = clamp(t / .2) * (1 - clamp((t - tw) / .3));
    ctx.save(); shake(ctx, cam);
    barScene(ctx, v, t, T, { pose: 'party', raise: .2, aliceFwd: fwd, jsp: 'JENSEN', jKeys: 'talk', jRaise: .3, jWave: env(t, tw + .1, x.d + 1, .3) * (1 - fwd * .5), solo });
    person(ctx, PH, v, t, T, { at: [520, 1060], fs: BR.CFG.fs * 1.02, f: 1, sp: 'PHOTOGRAPHER', keys: [[0, 'talk']], look: [.6, 0], shade: shadeOf([1, -.5], '#ffb468'), solo,
      L: { k: .5 + .5 * wave, to: [430 + 30 * Math.sin(t * 14) * wave, 640] }, R: { k: 1, to: [610, 760] }, held: { R: (c, h, sc) => PA.camera(c, h[0] + 30 * sc, h[1] - 10 * sc, sc * 1.1, 0) } });
    BR.stools(ctx, v, solo);
    ctx.restore(); },
  '5|PHOTOGRAPHER: Say "GPU"': x => { const { ctx, t, T, cam, solo } = x, v = camView({ cx: 990, cy: 520, k: 2.0 }, cam, .1);   // POV видоискатель фотографа: Дженсен и Алиса рядом в рамке
    barScene(ctx, v, t, T, { pose: 'photo', solo });
    if (!solo) { const a = toS(v, [900, 500]), b = toS(v, [1075, 500]); focusBox(ctx, (a[0] + b[0]) / 2, a[1] - 40, 520, 560, t > (x.s.snap ?? .25) ? 1 : 0); x.API.viewfinder(ctx, t); } },
  '5|CROWD: GPU! GPU!': x => { const { ctx, t, T, solo } = x, tf = W_(x, 'GPU', 0) + .05 + 1.27;   // ОБЩИЙ (статично): все кричат «GPU!»; вспышка — и ровно тот же стоп-кадр, что на отпечатке
    const fz = t >= tf, v = BR.views.group;
    if (!fz) barScene(ctx, v, t, T, { pose: 'photo', sp: 'CROWD', solo });
    else if (!solo) { ctx.drawImage(partyPhoto(T), 0, 0); freezeFrame(ctx, t - tf); }
    else barScene(ctx, v, SHOT_T, T, { pose: 'photo', freeze: SHOT_T, solo });
    flashW(ctx, (t - tf) / .3); },
  '5|A company later posted the picture': x => { const { ctx, t, T, cam, solo } = x, to = W_(x, 'online', 1.62);   // ВСТАВКА фото в ленте: снимок появляется в ленте на экране телефона, лента пролистывается дальше
    if (solo) return; const z = cam.z, inU = E.outCubic(clamp((t - .2) / .5)), sc = E.inOutCubic(clamp((t - to) / .6));
    BR.bar(ctx, { cx: 960, cy: 540, k: 1.2 }, 10);
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(z, z);
    PA.phone(ctx, 0, 20, 9.4, 0, (c, w, h) => { c.fillStyle = '#f2f0ec'; c.fillRect(0, 0, w, h); c.fillStyle = '#2a3a5a'; c.fillRect(0, 0, w, h * .07);
      const y0 = h * .1 + (1 - inU) * h * .8 - sc * h * .62;
      for (let i = -1; i < 3; i++) { const yy = y0 + i * h * .52; c.fillStyle = '#ddd8d0'; c.fillRect(w * .05, yy, w * .9, h * .48); c.fillStyle = '#9aa0aa'; c.beginPath(); c.arc(w * .12, yy + h * .03, w * .04, 0, 6.283); c.fill(); c.fillStyle = 'rgba(40,40,60,.4)'; c.fillRect(w * .2, yy + h * .02, w * .4, h * .015);
        if (i === 0) c.drawImage(partyPhoto(T), w * .05, yy + h * .06, w * .9, w * .9 * 9 / 16); else { c.fillStyle = i % 2 ? '#8a7a9a' : '#6a8a7a'; c.fillRect(w * .05, yy + h * .06, w * .9, w * .9 * 9 / 16); }
        for (let k = 0; k < 3; k++) { c.fillStyle = 'rgba(40,40,60,.3)'; c.fillRect(w * .08, yy + h * .36 + k * h * .03, w * (.5 + k * .1), h * .012); } } });
    ctx.restore(); },
  '5|To everyone in that room': x => { const { ctx, t, T, cam, solo } = x, tn = W_(x, 'night', 4.02);   // СВЕРХУ галерея: снимок сжимается в сетку из десятков снимков той ночи; на «night» сетка заполняет кадр
    if (solo) return; const u = E.inOutCubic(clamp((t - .3) / Math.max(1, tn - .3))), n = Math.round(lerp(3, 9, u)), cw = W / n, ch = cw * 9 / 16, z = cam.z;
    ctx.fillStyle = '#0c0a0e'; ctx.fillRect(0, 0, W, H); const a = BR.A(); if (!a) return;
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
    const rows = Math.ceil(H / ch) + 2, c0 = Math.floor(n / 2), r0 = Math.floor(rows / 2);
    for (let r = 0; r < rows; r++) for (let c = 0; c < n; c++) { const px = W / 2 + (c - c0 - .5) * cw, py = H / 2 + (r - r0 - .5) * ch, cx = 400 + ((c * 7 + r * 13) % 11) * 110, cy = 420 + ((c * 5 + r * 3) % 5) * 60;
      ctx.save(); ctx.beginPath(); ctx.rect(px + 3, py + 3, cw - 6, ch - 6); ctx.clip();
      if (c === c0 && r === r0) ctx.drawImage(partyPhoto(T), px + 3, py + 3, cw - 6, ch - 6);
      else { ctx.drawImage(a.B4, cx - 480, cy - 270, 960, 540, px, py, cw, ch); ctx.fillStyle = 'rgba(14,10,14,.85)'; for (let k = 0; k < 2 + ((c + r) % 3); k++) { const hx = px + cw * (.25 + k * .22), hy = py + ch * .45; ctx.beginPath(); ctx.arc(hx, hy, ch * .1, 0, 6.283); ctx.fill(); ctx.beginPath(); ctx.ellipse(hx, hy + ch * .32, ch * .13, ch * .2, 0, 0, 6.283); ctx.fill(); }
        ctx.fillStyle = 'rgba(255,240,220,.08)'; ctx.fillRect(px, py, cw, ch); }
      ctx.restore(); }
    ctx.restore(); },
  // ---------- L11 зал (staging/eventhall.js) ----------
  '5|Jensen Huang is not hard to meet': x => { const { ctx, t, T, cam, solo } = x, v = camView({ cx: 960, cy: 585, k: 1.75 }, cam, .25), th = W_(x, 'hard', 1.18);   // СРЕДНИЙ Дженсен у ступеней сцены машет «заходите» (в плейте нет дверей — проход зала)
    const wave = clamp(t / .3), beck = Math.sin(t * 9) * .5 + .5;
    ctx.save(); shake(ctx, cam); EH.plate(ctx, v, 'wide', 0, solo);
    EH.standing(ctx, JH, v, t, T, { at: [960, 835], f: 1, view: null, keys: [[0, 'smile'], [th - .1, 'laugh']], look: [0, .05], solo, R: { k: wave, to: [1010 + 20 * beck, 690 - 30 * beck] } });
    ctx.restore(); },
  '5|He shakes every hand': x => { const { ctx, t, T, cam, solo } = x, v = camView({ cx: 960, cy: 610, k: 1.3 }, cam, .25), th = W_(x, 'hand', .56), ts = W_(x, 'selfie', 2.24), tc = W_(x, 'customers', 3.64);   // ОБЩИЙ зал: очередь к Дженсену; на «hand» рукопожатие; на «selfie» вспышка телефона; на «customers» рукопожатие двумя руками, бейдж CUSTOMER
    const shk = env(t, th - .25, ts - .5, .25, .3), sel = env(t, ts - .4, tc - .45, .3, .3), two = env(t, tc - .3, x.d + 1, .3), bob = Math.sin(t * 22) * 6;
    ctx.save(); shake(ctx, cam); EH.plate(ctx, v, 'wide', 0, solo);
    EH.standing(ctx, Q[1], v, t, T, { at: [1150, 846], view: 'back', f: 1, solo, seed: 2, R: { k: sel, to: [1185, 650] }, held: sel > .3 ? { R: (c, h, s) => PA.phone(c, h[0], h[1] - 30 * s, s * 1.4, 0, null, gauss(t, ts + .05, .06)) } : null });
    EH.standing(ctx, JH, v, t, T, { at: [960, 835], f: 1, view: null, keys: [[0, 'smile'], [ts - .3, 'laugh'], [tc - .3, 'smile']], look: [lerp(-.3, .4, sel) - .4 * two, .1], solo,
      L: { k: Math.max(shk, two), to: two > .1 ? [815, 722 + bob * two] : [880, 728 + bob * shk] }, R: { k: two * .9, to: [872, 732 + bob * two] } });
    EH.standing(ctx, Q[0], v, t, T, { at: [815, 842], view: 'back', f: 1, solo, seed: 1, R: { k: shk, to: [880, 728 + bob * shk] } });
    const P = EH.standing(ctx, Q[2], v, t, T, { at: [680, 836], f: 1, keys: [[0, 'smile']], look: [.6, 0], solo, seed: 3, R: { k: two, to: [800, 722 + bob * two] } });
    if (!solo) { BR.chestBadge(ctx, P, v, 'NVIDIA EVENT', 'CUSTOMER', 1.3); EH.crowd(ctx, v, t, { n: 6, phones: 1, flashes: [ts + .05], seed: 1, y: H * .9 }); }
    ctx.restore(); },
  '5|FAN: Can I get a selfie': x => { const { ctx, t, T, cam, solo } = x, v = camView({ cx: 960, cy: 545, k: 2.2 }, cam, .1), ts = W_(x, 'selfie', .44);   // КРУПНО фанат поднимает телефон
    const up = E.outBack(clamp((t - (ts - .35)) / .35));
    ctx.save(); shake(ctx, cam); EH.plate(ctx, v, 'wide', 4, solo);
    EH.standing(ctx, FN, v, t, T, { at: [960, 1000], f: 1, view: null, sp: 'FAN', keys: [[0, 'smile']], look: [.2, -.1], solo, R: { k: .3 + .7 * up, to: [1110, 560] }, held: { R: (c, h, s) => PA.phone(c, h[0], h[1] - 40 * s, s * 1.8, -.1) } });
    ctx.restore(); },
  '5|JENSEN: Of course': x => { const { ctx, t, T, cam, solo } = x, tc = W_(x, 'course', .25);   // ВСТАВКА селфи: экран телефона — Дженсен в кожанке и фанат в кадре, вспышка
    if (solo) return; const z = cam.z, fz = Math.min(t, tc + .05);
    EH.plate(ctx, { cx: 960, cy: 560, k: 1.3 }, 'wide', 10);
    const pic = PA.offscreen('selfie', c => { const vv = { cx: 960, cy: 700, k: 2.2 }; EH.plate(c, vv, 'wide', 4);
      EH.standing(c, FN, vv, fz, T - t + fz, { at: [880, 1000], f: 1, view: null, keys: [[0, 'laugh']], look: [0, 0], shadow: false });
      EH.standing(c, JH, vv, fz, T - t + fz, { at: [1050, 1000], f: -1, view: null, sp: 'JENSEN', keys: [[0, 'smile']], look: [0, 0], shadow: false }); });
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(z, z); PA.phone(ctx, 0, 0, 10, 0, (c, w, h) => { c.fillStyle = '#000'; c.fillRect(0, 0, w, h); c.drawImage(pic, 480, 0, 960, 1080, 0, h * .06, w, h * .88); }); ctx.restore();
    const u = (t - tc) / .3; if (u > 0 && u < 1) { ctx.fillStyle = `rgba(255,255,255,${(1 - u) * .9})`; ctx.fillRect(0, 0, W, H); } },
  '5|FAN 2: Can you sign my laptop': x => { const { ctx, t, T, solo } = x, v = { cx: 960, cy: 545, k: 2.2 };   // КРУПНО фанат 2 (статично) протягивает ноутбук и маркер
    const out = E.outBack(clamp((t - .1) / .4)), hlP = [865, 810 - 30 * out], hrP = [1055, 805 - 30 * out];
    EH.plate(ctx, v, 'wide', 4, solo);
    EH.standing(ctx, F2, v, t, T, { at: [960, 1000], f: 1, view: null, sp: 'FAN 2', keys: [[0, 'smile']], look: [0, 0], solo, R: { k: .4 + .6 * out, to: hrP }, L: { k: .4 + .6 * out, to: hlP } });
    if (!solo) { const hl = toS(v, hlP), hr = toS(v, hrP), s = EH.fsAt(1000) * v.k;
      PA.laptop(ctx, (hl[0] + hr[0]) / 2, (hl[1] + hr[1]) / 2 - 40 * s, s * 2.6 * (.85 + .15 * out), 0); PA.marker(ctx, hr[0] + 20 * s, hr[1] - 60 * s, s * 1.6, .5);
      for (const h of [hl, hr]) ell(ctx, h[0], h[1], 12 * s, 12 * s, F2.spec.colors.ink, null); } },
  '5|JENSEN: Only if it has our chip': x => { const { ctx, t, T, cam, solo } = x, v = camView({ cx: 590, cy: 535, k: 4.2 }, cam, .1), tc = W_(x, 'chip', 1.08);   // ВСТАВКА ноутбук на трибуне: Дженсен расписывается маркером на крышке
    const sign = clamp((t - .25) / Math.max(.4, tc - .15)), hx = lerp(570, 615, sign) + Math.sin(sign * 40) * 3, hy = 551 + Math.sin(sign * 28) * 2;
    ctx.save(); shake(ctx, cam); EH.plate(ctx, v, 'wide', 0, solo);
    const P = EH.podium(ctx, JH, v, t, T, { at: [538, 682], f: 1, view: null, sp: 'JENSEN', keys: [[0, 'smile']], look: [.1, .6], solo, R: { k: 1, to: [hx, hy] }, L: { k: 1, to: [560, 556] } });
    if (!solo) { const L = toS(v, [592, 552]); ctx.save(); ctx.translate(L[0], L[1]); ctx.scale(1, .5); PA.laptop(ctx, 0, 0, .29 * v.k * 1.5, 0, sign); chipSticker(ctx, -60 * .29 * v.k * 1.5, -25 * .29 * v.k * 1.5, 18 * .29 * v.k * 1.5); ctx.restore(); }
    drawP(ctx, P, v, 'front'); if (!solo) { const h = toS(v, [hx, hy]), s = .29 * v.k; PA.marker(ctx, h[0], h[1] - 6 * s, s * 1.3, .5); ell(ctx, h[0], h[1], 12 * s, 12 * s, JH.spec.colors.ink, null); }
    ctx.restore(); },
  '5|In early 2024, she turned up': x => { const { ctx, t, T, cam, solo } = x, tm = W_(x, 'Megaspeed', 5.1);   // ОБРАТНАЯ зал: Алиса с бейджем в первом ряду; на «Megaspeed» бейдж крупно, по сцене проходит Дженсен в кожанке
    const push = E.inOutCubic(clamp((t - (tm - .6)) / .6)), v = camView(lerpView({ cx: 900, cy: 660, k: 1.25 }, { cx: 712, cy: 700, k: 3.0 }, push), cam, .15);
    ctx.save(); shake(ctx, cam); EH.plate(ctx, v, 'rev', 0, solo);
    EH.seatedRev(ctx, Q[0], v, t, T, { seat: [372, 850], keys: [[0, 'smile']], look: [0, -.1], seed: 1, solo });
    EH.seatedRev(ctx, Q[2], v, t, T, { seat: [541, 848], keys: [[0, 'smile']], look: [0, -.1], seed: 3, solo });
    const r = EH.seatedRev(ctx, AL, v, t, T, { seat: [712, 846], keys: [[0, 'smug']], look: [lerp(.1, -.05, push), -.15], seed: 5, solo, L: { k: .6, to: [690, 870] }, R: { k: .6, to: [735, 870] } });
    EH.stageFront(ctx, v, solo);
    if (!solo) { BR.chestBadge(ctx, r.P, v, 'NVIDIA EVENT', 'MEGASPEED', 1.15);
      const u = (t - (tm - .9)) / 1.6; if (u > 0 && u < 1) soft(ctx, 14, c => { EH.standing(c, JH, { cx: 960, cy: 540, k: 1 }, t, T, { at: [lerp(2400, -500, u), 2050], which: 'rev', f: -1, view: 'threeQuarter', keys: [[0, 'smile']], shadow: false }); }, 1, .35); }
    ctx.restore(); },
  '5|the giant computer show': x => { const { ctx, t, T, cam, solo } = x, v = camView({ cx: 960, cy: 545, k: 1.5 }, cam, .25), tj = W_(x, 'Jensen', 1.4);   // ОБЩИЙ из зала (вместо обратной): Дженсен на сцене, на экране COMPUTEX 2024; на переднем плане поднятые телефоны и вспышки
    const up = E.outBack(clamp((t - (tj - .2)) / .35));
    ctx.save(); shake(ctx, cam); EH.plate(ctx, v, 'wide', 0, solo);
    if (!solo) EH.screen(ctx, v, ['COMPUTEX 2024', 'TAIPEI'], clamp(t / .3));
    EH.standing(ctx, JH, v, t, T, { at: [960, 700], which: 'stage', f: 1, view: null, keys: [[0, 'smile'], [tj, 'laugh']], look: [0, -.05], solo, R: { k: up, to: [1040, 470] }, L: { k: up, to: [880, 470] } });
    if (!solo) EH.crowd(ctx, v, t, { n: 7, phones: 1, flashes: [.3, tj, 2.6], seed: 2, y: H * .88 });
    ctx.restore(); },
  // ---------- бухгалтерия Megaspeed ----------
  '5|ACCOUNTANT: Another order from Malaysia': x => { const { ctx, t, T, cam, solo } = x, v = camView({ cx: 900, cy: 600, k: 1.7 }, cam, .15), tm = W_(x, 'Malaysia', 1.0);   // КРУПНО бухгалтер 1: отрывает лист заказа и показывает — PURCHASE ORDER · FROM: MEGASPEED (MALAYSIA) · SERVERS
    const up = E.outBack(clamp((t - (tm - .6)) / .4)), seat = [900, 830], fs = .55, g = MS.deskGeo(seat, fs);
    ctx.save(); shake(ctx, cam);
    MS.deskShot(ctx, v, t, T, { C: AC, bg: 'O', seat, fs, sp: 'ACCOUNTANT', keys: [[0, 'neutral']], look: [lerp(-.4, .1, up), lerp(.5, .1, up)], light: [-1, -.3], solo,
      R: { k: 1, to: [lerp(seat[0] + 40 * fs, seat[0] + 330 * fs, up), lerp(g.yb + 20 * fs, g.yb - 40 * fs, up)] }, L: { k: 1, to: [lerp(seat[0] - 200 * fs, seat[0] + 160 * fs, up), lerp(g.yb + 30 * fs, g.yb - 60 * fs, up)] },
      deskTop: (c, vv) => { const P = toS(vv, g.on(-300, .3)); PA.printer(c, P[0], P[1], 260 * fs * vv.k, .3, t); },
      over: (c, vv) => { if (up < .05) return; const a = toS(vv, [seat[0] + 250 * fs * up, g.yb - 120 * fs * up + 20 * fs]); PA.sheet(c, a[0], a[1], 300 * fs * vv.k * (.7 + .3 * up), .06, ['PURCHASE ORDER', 'FROM: MEGASPEED', '(MALAYSIA)', 'SERVERS'], { h: 330 * fs * vv.k }); } });
    ctx.restore(); },
  "5|ACCOUNTANT 2: Didn't they order": x => { const { ctx, t, T, cam, solo } = x, v = camView({ cx: 960, cy: 620, k: 1.7 }, cam, .25), seat = [960, 840], fs = .55, g = MS.deskGeo(seat, fs);   // ОБРАТНАЯ бухгалтер 2: завалена бумагой, поднимает голову
    const lift = E.outCubic(clamp((t - .05) / .35));
    ctx.save(); shake(ctx, cam);
    MS.deskShot(ctx, v, t, T, { C: A2, bg: 'R', seat, fs, sp: 'ACCOUNTANT 2', keys: [[0, 'neutral']], look: [.1, lerp(.9, .1, lift)], tilt: lerp(.12, 0, lift), lean: lerp(.08, 0, lift), solo,
      deskTop: (c, vv) => { for (const [u, hgt, sd] of [[-230, 230, 1], [-120, 150, 2], [150, 190, 3], [260, 260, 4], [40, 70, 5]]) { const P = toS(vv, g.on(u, .7)); PA.paperStack(c, P[0], P[1], 140 * fs * vv.k, hgt * fs * vv.k, sd); } } });
    ctx.restore(); },
  '5|ACCOUNTANT: That was the small one': x => { const { ctx, t, cam, solo } = x;   // ВСТАВКА принтер: лента бумаги стекает со стола на пол (камера опускается за лентой)
    if (solo) return; const down = E.inOutCubic(clamp(t / x.d)), z = cam.z;
    MS.room(ctx, { cx: 700, cy: 720, k: 1.5 }, 'O', 8);
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2 - down * 260);
    ctx.fillStyle = '#8a5a2a'; ctx.fillRect(0, 560, W, 70); ctx.fillStyle = '#4a2a12'; ctx.fillRect(0, 630, W, 900); ctx.strokeStyle = '#1C1418'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(0, 630); ctx.lineTo(W, 630); ctx.stroke();
    PA.printer(ctx, 900, 590, 520, .7 + t * .5, t);
    for (let i = 0; i < 9; i++) PA.sheet(ctx, 760 + (i % 3) * 120 + Math.sin(i) * 30, 1260 - i * 22, 240, Math.sin(i * 2.1) * .5, [], { h: 120 });
    ctx.restore(); },
  // ---------- банкиры у стекла серверной ----------
  '5|BANKER: Last year, a small firm': x => { const { ctx, t, T, cam, solo, s } = x, tw = s.whip?.t ?? 2.0, wu = whipU(t, tw);   // СРЕДНИЙ банкиры у стекла -> вип-пан -> банкир 2 поворачивает голову
    const v = camView(lerpView({ cx: 1150, cy: 560, k: 1.75 }, { cx: 1420, cy: 560, k: 1.85 }, wu), { ...cam, dx: 0 }, .1), turn = E.inOutCubic(clamp((t - tw) / .3));
    ctx.save(); shake(ctx, cam); MS.room(ctx, v, 'O', 0, solo);
    if (!solo) { glassBoxes(ctx, v, 1, t); glassOver(ctx, v, MS.A()); }
    MS.stand(ctx, BK, v, t, T, { at: [1130, 1020], f: 1, light: [1, -.2], sp: 'BANKER', keys: [[0, 'neutral']], look: [.7, -.15], solo, seed: 1 });
    MS.stand(ctx, B2, v, t, T, { at: [1440, 1050], f: lerp(1, -1, turn) > 0 ? 1 : -1, light: [1, -.2], sp: 'BANKER 2', keys: [[0, 'neutral']], look: [lerp(.7, -.4, turn), -.1], solo, seed: 2 });
    ctx.restore(); },
  '5|BANKER: Ninety times bigger': x => { const { ctx, t, cam, solo } = x, tb = W_(x, 'bigger', .7);   // ВСТАВКА планшет банкира: столбики 2023 и 2024, подпись ×90
    if (solo) return; const z = cam.z; MS.room(ctx, { cx: 1450, cy: 560, k: 1.5 }, 'O', 8);
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(z, z); PA.tabletChart(ctx, 0, 20, 1180, E.outBack(clamp((t - .1) / Math.max(.3, tb - .1)))); ctx.restore(); },
  '5|BANKER 2: Did they sell a hit game': x => { const { ctx, t, T, cam, solo } = x, v = camView({ cx: 1430, cy: 500, k: 2.2 }, cam, .1), td = (x.s.snap ?? .86);   // КРУПНО банкир 2: роняет ручку
    const fall = clamp((t - td) / .45);
    ctx.save(); shake(ctx, cam); MS.room(ctx, v, 'O', 4, solo);
    const P = MS.stand(ctx, B2, v, t, T, { at: [1440, 1050], f: -1, light: [1, -.2], sp: 'BANKER 2', keys: [[0, 'neutral'], [td, 'shock']], look: [-.2, 0], solo,
      R: { k: 1, to: [1470, 735] }, held: fall <= 0 ? { R: (c, h, s) => PA.penTool(c, h[0], h[1] - 4 * s, s * 1.2, -1.2) } : null });
    if (fall > 0 && !solo) { const h = toS(v, [1470, 735]), s = MS.fsAt(1050) * v.k; PA.penTool(ctx, h[0] + 30 * s * fall, h[1] + 900 * fall * fall * s, s * 1.2, -1.2 + fall * 5); }
    void P; ctx.restore(); },
  '5|pledging the whole business as collateral': x => { const { ctx, t, cam, solo } = x, tc = W_(x, 'collateral', 1.24), v = camView({ cx: 667, cy: 270, k: 2.4 }, cam, .1);   // ВСТАВКА вывеска MEGASPEED над дверью: на «collateral» штамп COLLATERAL: ENTIRE BUSINESS, толчок
    ctx.save(); shake(ctx, cam); MS.room(ctx, v, 'R', 0, solo);
    if (!solo) { sign(ctx, v, 'MEGASPEED', 1); const P = toS(v, [690, 330]); PA.stampMark(ctx, P[0], P[1], 320 * v.k, ['COLLATERAL:', 'ENTIRE BUSINESS'], -.1, t - tc); }
    ctx.restore(); },
  '5|So where was all that hardware': x => { const { ctx, t, cam, solo } = x, tf = W_(x, 'from', 1.5), v = camView({ cx: 1700, cy: 560, k: 1.6 }, cam, .1);   // ВСТАВКА ящик в серверной с биркой FROM: ________; на «from» бирка качается
    ctx.save(); shake(ctx, cam); MS.room(ctx, v, 'O', 8, solo);
    if (!solo) { const z = cam.z; ctx.save(); ctx.translate(W / 2, H / 2 + 60); ctx.scale(z, z); PA.carton(ctx, 0, 420, 900, 640, { side: .18 }); const sw = Math.sin((t - tf) * 9) * Math.exp(-(t - tf) * 2.5) * .45 * (t > tf ? 1 : 0) + .04 * Math.sin(t * 2);
      PA.hangTag(ctx, -120, -240, 360, sw, 'FROM: ______'); ctx.restore(); }
    ctx.restore(); },
};
export const OVER = {
  // D07-A: пекарня — мешки муки растут до крыши и заваливают дверь, соседи заглядывают (поверх шаблона T-joke ядра)
  '5|If a corner bakery': (ctx, s, t, d) => { const wt = (re, fb) => { const a = wordAt(re, s.start, s.end); return a == null ? fb : a - s.start; };
    const tn = wt('neighbors', 2.56), tf = wt('flour', 4.2), pull = E.inOutCubic(clamp(t / 3.3)), snap = 1 + .1 * E.outCubic(clamp((t - tf) / .17));
    const v0 = lerpView({ cx: 960, cy: 820, k: 1.9 }, { cx: 960, cy: 600, k: 1.0 }, pull), v = { ...v0, k: v0.k * snap };
    const n = Math.max(1, Math.round(lerp(1, 34, Math.pow(clamp((t - .6) / Math.max(.5, tf - .6)), 1.6))));
    JK.bakery(ctx, v, t, s.start + t, n, { crowd: E.outBack(clamp((t - tn) / .4)), peek: [[Q[1], 350, 1], [Q[0], 1570, -1]] });
  },
};
export const SKIP_PROPS = {
  '5|a camera flashed': /COMPUTEX/, '5|PHOTOGRAPHER: Everyone, squeeze in': /MEGASPEED/, '5|ACCOUNTANT: Another order from Malaysia': /PURCHASE/, '5|pledging the whole business as collateral': /COLLATERAL/,
  '5|So where was all that hardware': /FROM/, '5|the giant computer show': /COMPUTEX/, '5|He shakes every hand': /CUSTOMER/, '5|In early 2024, she turned up': /MEGASPEED/, '5|BANKER: Ninety times bigger': /2023|2024|×90/,
};
export const RAIN = s => (/L09|L10|L12/.test(s.loc) ? false : undefined);   // в офисе, баре и на таможне дождя поверх кадра нет
