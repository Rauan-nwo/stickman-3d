// presets.js: четыре героя эталона V001 как spec для Stickman (см. stickman.js). Размеры и цвета шахтёра и напарника
// сняты с кадров эталона в полном размере; богач перенесён из теста clawd; эксперт собран по описанию из style-bible.
//   const m = miner();  m.draw(ctx, pose)  или через Actor (billboard.js)
// spec.unit — метров на единицу рисунка; spec.pins — точки привязки к 3D-якорю (feet / chest / seat).
import { Stickman, CLOTHES } from './stickman.js';
import { sandwich } from './props2d.js';

export const C = {
  ink: '#2C1826', head: '#FCFAFB', headSh: '#D9D0DD',
  plaid: '#DE4B2F', plaidDk: '#A52C1F', plaidLt: '#F08A6C', plaidSh: 'rgba(90,10,10,.42)',
  susp: '#DDBB6E', suspDk: '#8E6C24', gold: '#F2C530', goldDk: '#A97D12', khaki: '#8C7651',
  hat: '#86603A', hatDk: '#6B4A2A', hatLt: '#9C7445', hatHi: '#FFF4E0',
  hand: '#3B2333',
  teal: '#489584', tealDk: '#2E6E63', tealLt: '#5BAA98', beanie: '#D9981F', beanieDk: '#A8720F', beanieLt: '#EAB643',
  hair: '#241B20', collar: '#CB3A2B', bread: '#EADAB2', crust: '#B4854E', lettuce: '#74B82F', pants: '#6E5936',
  skinB: '#FDEDDA', skinBsh: '#E9CDB4', mouth: '#2B1520',
};
const FACE_COLORS = { mouthIn: '#5B1E28', tongue: '#E8737F', teeth: '#FFFFFF' };

// ---------- шахтёр-мошенник: коричневая шляпа с кокардой-фонарём, красная клетчатая рубаха, подтяжки ----------
// Единицы: начало — точка на земле между ступнями, y вверх отрицательный, ~1010 ед. до верха шляпы (1 ед. = 2.02 мм).
export const MINER = { headY: -777, headR: 146, bodyY: -551, rx: 109, ry: 131, shL: [-96, -628], shR: [96, -628] };
export function miner(over = {}) {
  const r = MINER.headR, by = MINER.bodyY, ry = MINER.ry;
  return new Stickman({
    name: 'miner', unit: .00202, u: 1, lw: 9.5, limbW: 13,
    pins: { feet: [0, 0], chest: [0, MINER.bodyY] },
    colors: { ink: C.ink, hand: C.hand, mouth: C.mouth, hair: '#3B2519', ...FACE_COLORS },
    head: { x: 0, y: MINER.headY, rx: r, ry: r, fill: C.head, shade: C.headSh, grad: [-r * .15, -r * .25, r * .55, r * 1.02, .8] },
    body: {
      x: 0, y: by, rx: MINER.rx, ry, n: 3.0, topK: .8, fill: C.plaid,
      inside: [
        CLOTHES.plaid({ dark: C.plaidDk, light: C.plaidLt, step: 46 }),
        CLOTHES.shadeLR('rgba(255,220,180,.10)', 'rgba(0,0,0,0)', C.plaidSh),
        CLOTHES.band({ h: 44, over: 6, fill: C.khaki }),                                    // пояс штанов
        CLOTHES.pocket({ x: -30, y: -88, w: 30, h: 52, r: 8, fill: '#8E5B36', button: [9, -70, 6.5] }),
        CLOTHES.suspenders({ x: 52, w: 26, bottom: 44, fill: C.susp, stitch: C.suspDk }),
      ],
      outside: [CLOTHES.dots({ at: [[-52, ry - 44], [52, ry - 44]], r: 11, fill: C.gold, lw: 4 })],
    },
    hat: { type: 'wideBrim', col: C.hat, dk: C.hatDk, lt: C.hatLt, hi: C.hatHi, badge: C.gold },
    face: {
      mr: r, fs: 1.1, restEye: 'lid', restMouth: 'smirkS', brows: false,
      eyes: [{ x: -r * .35, y: -r * .34, rx: r * .062, ry: r * .092, lw: r * .055, tilt: 0 }, { x: r * .25, y: -r * .34, rx: r * .062, ry: r * .092, lw: r * .055, tilt: 0 }],
      mouth: [-.02 * r, .06 * r], mouthBig: [-8, 30], ms: 1.05,
    },
    rig: { hipY: -430, sh: [MINER.shL, MINER.shR], armL: 250, sag: .5, armLayer: 'front' },
    hand: { r: 25, fill: C.hand },
    stance: 'stand',
    stances: { stand: { arms: 'auto', limbs: [                      // длинные тонкие ноги, ступни — короткие штрихи вниз-влево (замер)
      { layer: 'back', hip: true, pts: [[-46, -430], [-66, -105], [-70, -62]] }, { layer: 'back', pts: [[-70, -62], [-94, -30]] },
      { layer: 'back', hip: true, pts: [[38, -430], [56, -80], [57, -40]] }, { layer: 'back', pts: [[57, -40], [36, 16]] },
    ] } },
    ...over,
  });
}

// ---------- напарник: жёлтая вязаная шапка, бирюзовая кофта, чёлка; в V001 сидит на ящике с бутербродом, в 3/4 вправо ----------
// Единицы: начало — центр головы, радиус головы 100 (1 ед. = 2.606 мм). seat — точка сиденья, feet — земля под стоящим.
export const BUDDY = { seatY: 262, footY: 404, top: -112, standY: 432 };
export function buddy(over = {}) {
  const bx = -14, by = 172, rx = 97, ry = 82;
  return new Stickman({
    name: 'buddy', unit: .002606, u: .7, lw: 9, limbW: 13,
    pins: { seat: [0, BUDDY.seatY], feet: [-14, BUDDY.standY], head: [0, 0] },
    colors: { ink: C.ink, hand: C.hand, mouth: C.mouth, hair: C.hair, ...FACE_COLORS },
    head: { x: 0, y: 0, rx: 100, ry: 100, fill: C.skinB, shade: C.skinBsh, grad: [-20, -20, 50, 104, .82], ear: { x: 62, y: 70, rx: 17, ry: 19 },
      hair: { fringe: [[-104, -60], [-100, 30], [-88, 22], [-80, 30], [-66, 16], [-58, 24], [-46, -2], [-34, 6], [-22, -8], [-8, 0], [6, -10], [22, -3], [36, -12], [52, -4], [66, -12], [80, -6], [96, -14], [104, -60]] } },
    body: {
      x: bx, y: by, rx, ry, n: 2.7, topK: .86, fillLR: [C.tealLt, C.teal, C.tealDk],
      inside: [CLOTHES.band({ h: 20, over: 10, fill: C.pants })],
      outside: [
        CLOTHES.poly({ pts: [[8, 100], [34, 104], [20, 124]], fill: C.collar, stroke: C.ink, lw: 3.5 }),       // красный воротник
        CLOTHES.poly({ pts: [[40, 98], [64, 94], [58, 114]], fill: C.collar, stroke: C.ink, lw: 3.5 }),
        CLOTHES.stroke({ pts: [[17, 122], [17, 150]], w: 3, col: 'rgba(20,60,55,.6)' }), CLOTHES.disc({ at: [17, 138], rx: 5, fill: '#D8EDE6', stroke: 'rgba(20,60,55,.7)', lw: 2 }),
      ],
    },
    hat: { type: 'beanie', col: C.beanie, dk: C.beanieDk, lt: C.beanieLt },
    face: {
      mr: 100, fs: .72, restEye: 'lid', restMouth: 'chew', brows: false, look: [.5, 0],
      eyes: [{ x: 10, y: 12, rx: 7, ry: 9.5, lw: 7, tilt: 1, blink: [[-8, 12], [26, 13]] }, { x: 47, y: 15, rx: 6.5, ry: 9.5, lw: 7, tilt: 2, blink: [[34, 15], [62, 17]] }],
      mouth: [18, 50], mouthBig: [27, 42], ms: .62, cx: 28,
    },
    rig: { hipY: by + ry - 6, sh: [[bx - 78, by - 50], [bx + 78, by - 50]], armL: 165, sag: .5, armLayer: 'front' },
    hand: { r: 17, fill: C.hand },
    stance: 'sit',
    stances: {
      // сидит: дальняя нога за телом, ближняя нога и рука с бутербродом — перед телом
      sit: { limbs: [
        { layer: 'back', pts: [[52, 256], [60, 322], [66, 384]] }, { layer: 'back', pts: [[66, 384], [98, 388]] },
        { layer: 'mid', pts: [[-36, 262], [6, 268], [22, 280]] }, { layer: 'mid', pts: [[22, 280], [26, 340], [24, 398]] }, { layer: 'mid', pts: [[24, 398], [50, 406]] },
        { layer: 'mid', pts: [[-58, 118], [-92, 150], [-90, 192]] }, { layer: 'mid', pts: [[-90, 192], [-70, 212], [-30, 212]] },
      ], props: [{ layer: 'mid', draw: x => sandwich(x, 2, 210, C) }] },
      stand: { arms: 'auto', limbs: [
        { layer: 'back', hip: true, a: [bx - 34, by + ry - 6], b: [bx - 40, BUDDY.standY - 4], L: 190, bend: -1, sag: .35 }, { layer: 'back', pts: [[bx - 40, BUDDY.standY - 4], [bx - 62, BUDDY.standY]] },
        { layer: 'back', hip: true, a: [bx + 34, by + ry - 6], b: [bx + 40, BUDDY.standY - 4], L: 190, bend: 1, sag: .35 }, { layer: 'back', pts: [[bx + 40, BUDDY.standY - 4], [bx + 62, BUDDY.standY]] },
      ] },
    },
    ...over,
  });
}

// ---------- богач: белый цилиндр, белый костюм с красной розой, усы-«руль» ----------
// Единицы: начало — земля между ступнями, фигура ~1000 ед. (перенос из anim-tests/clawd/src/stick/stick.js).
export function richGuy(over = {}) {
  const hipY = -330, by = -470, ink = '#2A1C22';
  const leg = sd => [{ layer: 'back', hip: true, a: [sd * 34, hipY], b: [sd * 42, -6], L: 330, bend: sd, sag: 1, min: 1 }, { layer: 'back', pts: [[sd * 42, -6], [sd * 64, -4]] }];
  return new Stickman({
    name: 'richGuy', unit: .00202, u: 1, lw: 7, limbW: 11,
    pins: { feet: [0, 0], chest: [0, by] },
    colors: { ink, hand: ink, mouth: '#2B1520', hair: '#3B2519', stache: '#3B2519', ...FACE_COLORS },
    head: { x: 0, y: -732, rx: 140, ry: 122, pivot: 112, fill: '#FFFFFF', shade: '#E2DDD5', grad: [-40, -40, 30, 150, .7], hair: { sideburns: [114, -82, 36, 28], inset: 3 } },
    body: {
      x: 0, y: by, rx: 112, ry: 158, n: 3.2, topK: .9,
      fillRadial: { at: [-50, -70], r0: 20, to: [-10, 0], r1: 210, stops: [[0, '#FFFFFF'], [.55, '#F7F4EC'], [1, '#CFC6B4']] },
      inside: [CLOTHES.lapels({ shirt: '#FFFFFF' })],
      outside: [CLOTHES.dots({ at: [-30, 30].flatMap(bx => [0, 1, 2].map(k => [bx, -30 + k * 50])), r: 9, fill: '#231A1F', lw: 0, shine: true }), CLOTHES.rose({ at: [48, -108] })],
    },
    hat: { type: 'topHat', col: '#F6F1E0', dk: '#CDBF9E', lt: '#FFFDF6', band: '#221A20' },
    face: {
      mr: 122, fs: 1, restEye: 'dot', restMouth: 'smile', brows: true, moustache: true,
      eyes: [{ x: -48, y: -18, rx: 9, ry: 12, lw: 6, tilt: 0 }, { x: 48, y: -18, rx: 9, ry: 12, lw: 6, tilt: 0 }],
      mouth: [0, 46], mouthBig: [0, 50], ms: 1,
    },
    rig: { hipY, sh: [[-92, by - 115], [92, by - 115]], armL: 235, sag: 1, armLayer: 'mid' },
    hand: { r: 11, fill: ink, plain: true },
    stance: 'stand',
    stances: { stand: { arms: 'auto', limbs: [...leg(-1), ...leg(1)] } },
    ...over,
  });
}

// ---------- эксперт: чёрный котелок, круглые очки, бордовый сюртук ----------
export function expert(over = {}) {
  const hipY = -320, by = -455, ink = '#2A1C22';
  const leg = sd => [{ layer: 'back', hip: true, a: [sd * 30, hipY], b: [sd * 38, -6], L: 320, bend: sd, sag: 1, min: 1 }, { layer: 'back', pts: [[sd * 38, -6], [sd * 60, -4]] }];
  return new Stickman({
    name: 'expert', unit: .00202, u: .96, lw: 7, limbW: 11,
    pins: { feet: [0, 0], chest: [0, by] },
    colors: { ink, hand: ink, mouth: '#2B1520', hair: '#6E6A70', stache: '#6E6A70', ...FACE_COLORS },
    head: { x: 0, y: -708, rx: 128, ry: 122, pivot: 108, fill: '#FFFFFF', shade: '#E0DAD6', grad: [-36, -40, 30, 140, .72], hair: { sideburns: [104, -70, 30, 34], inset: 3 } },
    body: {
      x: 0, y: by, rx: 100, ry: 150, n: 3.0, topK: .86,
      fillRadial: { at: [-44, -70], r0: 20, to: [-10, 0], r1: 200, stops: [[0, '#A23A4C'], [.5, '#7E2233'], [1, '#541420']] },
      inside: [
        CLOTHES.lapels({ shirt: '#E9E4DA', line: 'rgba(30,8,14,.85)', pocket: false }),
        CLOTHES.poly({ pts: [[-13, by - 148], [0, by - 136], [13, by - 148], [13, by - 124], [0, by - 136], [-13, by - 124]], fill: '#22181C', stroke: ink, lw: 2.5 }),   // бабочка
      ],
      outside: [CLOTHES.dots({ at: [[12, -26], [12, 22], [12, 70]], r: 8, fill: '#D9B24A', lw: 2.5 })],
    },
    hat: { type: 'bowler', col: '#2B2228', dk: '#141014', lt: '#4A404A', band: '#0F0B0E' },
    face: {
      mr: 122, fs: .95, restEye: 'dot', restMouth: 'flat', brows: true, glasses: { r: 30, lw: 5, dy: 2 },
      eyes: [{ x: -44, y: -20, rx: 8, ry: 11, lw: 6, tilt: 0 }, { x: 44, y: -20, rx: 8, ry: 11, lw: 6, tilt: 0 }],
      mouth: [0, 50], mouthBig: [0, 52], ms: .92,
    },
    rig: { hipY, sh: [[-84, by - 108], [84, by - 108]], armL: 228, sag: 1, armLayer: 'mid' },
    hand: { r: 11, fill: ink, plain: true },
    stance: 'stand',
    stances: { stand: { arms: 'auto', limbs: [...leg(-1), ...leg(1)] } },
    ...over,
  });
}

export const PRESETS = { miner, buddy, richGuy, expert };
