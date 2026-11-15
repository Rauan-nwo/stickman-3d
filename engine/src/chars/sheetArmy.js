// sheetArmy.js: контактные листы состава V002 (tools/armysheet.mjs). Чистый 2D.
//   armySheet(canvas)     — каждый герой x нужные ему лица и действия + шесть синих солдат + виды + рука и сапоги
//   gaitStrips(canvas)    — каждая походка x каждый вид, 12 фаз
//   actionStrips(canvas)  — каждое действие лентой из 12 кадров
import { captain, colonel, soldierBlue, general, aide, soldierRed, drummer, kid, BLUE_VARIANTS, shoe2D } from './presetsArmy.js';
import { gait, GAIT_NAMES, VIEW_NAMES } from './gaits.js';
import { ACT, face, FACE } from './actions.js';
import { bootsRow, bigHand, marble2D } from './closeups.js';

const BG = '#7b5d44', BG2 = '#6a4e39';
const label = (x, s, px, py, size = 22, col = '#fff', align = 'left') => { x.font = `700 ${size}px Montserrat, Arial, sans-serif`; x.textAlign = align; x.textBaseline = 'alphabetic'; x.lineWidth = 5; x.strokeStyle = 'rgba(20,10,6,.85)'; x.strokeText(s, px, py); x.fillStyle = col; x.fillText(s, px, py); };
const fig = (x, ch, pose, cx, ground, k) => { x.save(); x.translate(cx, ground); x.scale(k, k); ch.draw(x, pose); x.restore(); };
const st = (ch, f, o = {}) => ({ ...gait(ch, 'stand', .2, o), ...face(f), t: .3 });

export function armySheet(canvas) {
  const cap = captain(), col = colonel(), gen = general(), ad = aide(), red = soldierRed(), dr = drummer(), kd = kid(), b0 = soldierBlue(0);
  const rows = [
    ['captain', cap, [['calm', st(cap, 'calm')], ['smirk', st(cap, 'smirk')], ['glance', st(cap, 'glance')], ['order', ACT.order(cap, .5)], ['yanked', ACT.yanked(cap, .14)], ['annoyed', ACT.yanked(cap, .8)], ['dust hands', ACT.dustHands(cap, .2)], ['3/4', st(cap, 'calm', { view: 'threeQuarter' })], ['side', st(cap, 'calm', { view: 'side' })], ['back', st(cap, 'calm', { view: 'back' })]]],
    ['colonel', col, [['rest', st(col, 'stone', {})], ['fury', st(col, 'fury')], ['purple', st(col, 'furyPurple')], ['grab', ACT.grab(col, .3, { rage: .4 })], ['point down', ACT.pointDown(col, .1)], ['jaw drop', ACT.jawDrop(col, .6)], ['3/4', st(col, 'fury', { view: 'threeQuarter' })], ['side', st(col, 'fury', { view: 'side' })], ['back', st(col, 'stone', { view: 'back' })]]],
    ['general', gen, [['smirk', st(gen, 'smirk')], ['laugh-cry', ACT.laughCry(gen, .29)], ['worried', ACT.holdHat(gen, .2)], ['terrified', ACT.scared(gen, .2, { face: 'terrified' })], ['spyglass', ACT.spyglass(gen, .6, { view: 'side' })], ['spyglass 3/4', ACT.spyglass(gen, .6, { view: 'threeQuarter' })], ['side', st(gen, 'smirk', { view: 'side', facing: -1 })], ['back', st(gen, 'smirk', { view: 'back' })]]],
    ['aide / drummer', ad, [['neutral', st(ad, 'smile')], ['laugh', { ...ACT.laughCry(ad, .29), tears: 0 }], ['scared', ACT.scared(ad, .2)], ['side', st(ad, 'smile', { view: 'side' })], ['drummer', ACT.drumming(dr, 0, { phase: .1 }), dr], ['drum 3/4', ACT.drumming(dr, 0, { phase: .35, view: 'threeQuarter' }), dr], ['drum side', ACT.drumming(dr, 0, { phase: .6, view: 'side' }), dr], ['drum back', ACT.drumming(dr, 0, { phase: .1, view: 'back' }), dr], ['scared', ACT.drumming(dr, 0, { phase: .1, face: 'scared' }), dr]]],
    ['soldierRed', red, [['stone', st(red, 'stone')], ['smile', ACT.smileAt(red, .5)], ['grin', st(red, 'grin')], ['whistle', ACT.whistle(red, .4)], ['scared', ACT.scared(red, .2)], ['bounce', ACT.bounce(red, .3, { amp: 140 })], ['march', gait(red, 'march', .8, { musket: true })], ['3/4', gait(red, 'march', .8, { musket: true, view: 'threeQuarter' })], ['side', gait(red, 'march', .8, { musket: true, view: 'side' })], ['back', gait(red, 'march', .8, { musket: true, view: 'back' })]]],
    ['soldierBlue x6', b0, [...BLUE_VARIANTS.map((_, v) => ['v' + v, v === 3 ? ACT.raiseHand(soldierBlue(v), .5) : v === 1 ? ACT.confused(soldierBlue(v), .3) : st(soldierBlue(v), ['confused', 'stone', 'smile', 'question', 'stone', 'confused'][v]), soldierBlue(v)]), ['blink', { ...st(b0, 'confused'), blink: true }], ['worried', gait(b0, 'kneesTogether', .3)], ['side', st(soldierBlue(4), 'stone', { view: 'side' }), soldierBlue(4)], ['back', st(b0, 'stone', { view: 'back' })]]],
    ['kid', kd, [['delight', st(kd, 'delight')], ['wow', st(kd, 'wow')], ['swing back view', ACT.swing(kd, .5, { view: 'back' })], ['swing side +', ACT.swing(kd, .8, { view: 'side' })], ['swing side -', ACT.swing(kd, -.7, { view: 'side' })], ['swing front', ACT.swing(kd, .3, { view: 'front' })]]],
  ];
  const CW = 250, CH = 400, LEFT = 20, TOP = 20, W = LEFT + 10 * CW + 20, H = TOP + rows.length * CH + 470;
  canvas.width = W; canvas.height = H; const x = canvas.getContext('2d'); x.fillStyle = BG; x.fillRect(0, 0, W, H);
  rows.forEach(([name, ch, cells], r) => {
    const y0 = TOP + r * CH; x.fillStyle = r % 2 ? BG2 : BG; x.fillRect(0, y0, W, CH); label(x, name, 12, y0 + 30, 26, '#FFE9B8');
    cells.forEach(([lab, pose, other], i) => { const c = other || ch, k = (CH - 76) / (name === 'kid' ? 900 : 1290); fig(x, c, pose, LEFT + i * CW + CW / 2, y0 + CH - 34, k); label(x, lab, LEFT + i * CW + CW / 2, y0 + CH - 8, 18, '#fff', 'center'); });
  });
  const y0 = TOP + rows.length * CH; label(x, 'bigHand: point / press / morph / flat      bootsRow: unison (3 phases), rain      marble, shoe', 12, y0 + 30, 22, '#FFE9B8');
  [['point', 0, 0], ['point', 0, 1], ['point', .5, 0], ['flat', 1, .6]].forEach(([pose, morph, press], i) => { x.save(); x.beginPath(); x.rect(20 + i * 230, y0 + 44, 220, 410); x.clip(); bigHand(x, { x: 80 + i * 230 + (pose === 'flat' ? 50 : 0), y: y0 + (pose === 'flat' ? 200 : 80), s: .42, rot: -.08, pose, morph, press }); x.restore(); });
  [[.3, 'unison'], [.62, 'unison'], [.8, 'unison'], [.8, 'rain']].forEach(([ph, mode], i) => { x.save(); x.translate(960 + i * 300, y0 + 44); x.beginPath(); x.rect(0, 0, 290, 410); x.clip(); x.fillStyle = '#B79668'; x.fillRect(0, 0, 290, 410); x.fillStyle = '#8FB6E8'; x.fillRect(0, 0, 290, 150); bootsRow(x, { W: 290, H: 410, phase: ph, mode, ground: .86, horizon: .5 }); x.restore(); });
  marble2D(x, 2250, y0 + 150, 70, .8); marble2D(x, 2400, y0 + 190, 30, 2); shoe2D(x, 2280, y0 + 330, 1.6, -.3);
  return { width: W, height: H, rows: rows.map(r => r[0]), faces: Object.keys(FACE) };
}
export function gaitStrips(canvas) {
  const N = 12, CW = 118, CH = 190, LEFT = 190, red = soldierRed(), names = GAIT_NAMES.filter(g => g !== 'stand');
  canvas.width = LEFT + 2 * N * CW + 10; canvas.height = 40 + names.length * 2 * CH;
  const x = canvas.getContext('2d'); x.fillStyle = BG; x.fillRect(0, 0, canvas.width, canvas.height);
  label(x, 'gaits x views, 12 phases: front | threeQuarter  /  side | back', 12, 28, 22, '#FFE9B8');
  names.forEach((g, gi) => {
    const ch = g === 'march' ? red : soldierBlue(gi % 6);
    VIEW_NAMES.forEach((view, vi) => {
      const col = vi === 0 || vi === 2 ? 0 : 1, row = vi < 2 ? 0 : 1, y0 = 40 + (gi * 2 + row) * CH, xx = LEFT + col * N * CW;
      x.fillStyle = (gi + col) % 2 ? BG2 : BG; x.fillRect(xx, y0, N * CW, CH);
      if (vi === 0) label(x, g, 10, y0 + 40, 22, '#FFE9B8'); label(x, view, xx + 6, y0 + 18, 14);
      for (let p = 0; p < N; p++) { const pose = gait(ch, g, p / N, { view, facing: 1, musket: g === 'march', panic: g === 'run' && view === 'front' }); if (g === 'flail') pose.rot = p / N * 2; fig(x, ch, pose, xx + p * CW + CW / 2, y0 + CH - 14, (CH - 30) / 1290); }
    });
  });
  return { width: canvas.width, height: canvas.height, gaits: names, views: VIEW_NAMES };
}
export function actionStrips(canvas) {
  const cap = captain(), col = colonel(), gen = general(), red = soldierRed(), dr = drummer(), kd = kid(), b = soldierBlue(3), N = 12, CW = 190, CH = 300;
  const rows = [
    ['throwDrum 3/4 (0-1.1 s)', cap, i => ACT.throwDrum(cap, i * .1, { view: 'threeQuarter' })], ['throwDrum side (0-0.55 s)', cap, i => ACT.throwDrum(cap, i * .05, { view: 'side' })], ['dustHands', cap, i => ACT.dustHands(cap, i * .06)],
    ['yanked', cap, i => ACT.yanked(cap, i * .06 - .06, { dir: -1 })], ['grab', col, i => ACT.grab(col, i * .05 - .05, { dir: 1 })], ['pointDown', col, i => ACT.pointDown(col, i * .05, { dir: -1 })],
    ['raiseHand', b, i => ACT.raiseHand(b, i * .05)], ['order', cap, i => ACT.order(cap, i * .05)], ['spyglass', gen, i => ACT.spyglass(gen, i * .04, { view: 'side' })], ['laughCry', gen, i => ACT.laughCry(gen, i / 30 * 2)],
    ['whistle', red, i => ACT.whistle(red, i * .09, { gait: 'march', phase: i / 12, view: 'threeQuarter', musket: true })], ['bounce', red, i => ACT.bounce(red, i * .05, { period: .55, amp: 170, face: 'grin' })],
    ['bounce + holdHat', gen, i => ACT.bounce(gen, i * .05, { period: .55, amp: 200, hold: true, face: 'worried' })], ['jawDrop', col, i => ACT.jawDrop(col, i * .04 - .04)],
    ['drumming', dr, i => ACT.drumming(dr, 0, { phase: i / 12, view: 'threeQuarter' })], ['kid swing (side)', kd, i => ({ ...ACT.swing(kd, Math.sin(i / 12 * 6.283) * .9, { view: 'side' }), rot: -Math.sin(i / 12 * 6.283) * .5, rotY: -700 })],
    ['kid swing (back)', kd, i => ACT.swing(kd, Math.sin(i / 12 * 6.283) * .9, { view: 'back' })], ['blink in unison', red, i => ({ ...gait(red, 'stand', 0), blink: i === 5 || i === 6 })],
  ];
  canvas.width = N * CW + 20; canvas.height = rows.length * CH + 10; const x = canvas.getContext('2d'); x.fillStyle = BG; x.fillRect(0, 0, canvas.width, canvas.height);
  rows.forEach(([name, ch, fn], r) => { const y0 = r * CH + 5; x.fillStyle = r % 2 ? BG2 : BG; x.fillRect(0, y0, canvas.width, CH);
    for (let i = 0; i < N; i++) fig(x, ch, fn(i), 10 + i * CW + CW / 2, y0 + CH - 16, (CH - 50) / (ch === kd ? 1000 : 1560)); label(x, name, 12, y0 + 26, 22, '#FFE9B8'); });
  return { width: canvas.width, height: canvas.height, actions: rows.map(r => r[0]) };
}
