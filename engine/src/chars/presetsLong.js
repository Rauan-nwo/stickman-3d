// presetsLong.js: герои канала лонгов «Stickman Noir» (16:9). Тот же Stickman, что и в шортсах, но детальнее:
// второй тон на одежде, блики, мелкие аксессуары. Голова по-прежнему чисто белая и не освещается сценой.
//   jensen     — Дженсен Хуанг: чёрная кожанка поверх чёрной футболки, серебристая стрижка, прямоугольные очки, ухмылка
//   alice      — «Алиса»: чёрное каре, тёмные очки, красный жакет
//   detective  — кандидат в ведущие №1: федора, плащ-тренч, красный галстук, щетина
//   moneyman   — кандидат №2: котелок, зелёный жилет, золотые часы на цепочке, монокль, усы
//   reporter   — кандидат №3: светлая шляпа с карточкой PRESS и карандашом, горчичный жилет, блокнот в кармане, веснушки
// Единицы: начало — земля между ступнями, фигура ~1000 ед. (как richGuy / expert). pins: feet, chest, seat (стойки sitR / sitL —
// сидит лицом вправо / влево; seat — точка на сиденье под корпусом).
// Причёска, очки и шляпа рисуются одной функцией из HATS (тип 'L_<имя>'): лицо — без сдвига «шляпы» (испуг, подмигивание),
// шляпа — со сдвигом. Существующие герои и движок не меняются: здесь только новые записи в HATS.
import { Stickman, HATS, ell, line } from './stickman.js';

const TAU = Math.PI * 2;
const VIEWS = { threeQuarter: { turn: .3, comp: .86 }, side: { turn: .5, comp: .6 }, back: { turn: 0, comp: 1 } };   // как в stickman.js
const FACE_COLORS = { mouthIn: '#5B1E28', tongue: '#E8737F', teeth: '#FFFFFF' };
export const LONG = { headY: -712, by: -455, rx: 104, ry: 150, hipY: -320, seatY: -300 };

// ---------- помощники рисования ----------
const poly = (x, pts, fill, stroke, lw) => { x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) p.length === 4 ? x.quadraticCurveTo(p[0], p[1], p[2], p[3]) : x.lineTo(p[0], p[1]); x.closePath(); if (fill) { x.fillStyle = fill; x.fill(); } if (stroke) { x.lineWidth = lw; x.strokeStyle = stroke; x.lineJoin = 'round'; x.stroke(); } };
const path = (x, pts, w, col, alpha = 1) => { x.save(); x.globalAlpha = alpha; x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) p.length === 4 ? x.quadraticCurveTo(p[0], p[1], p[2], p[3]) : x.lineTo(p[0], p[1]); x.lineWidth = w; x.lineCap = 'round'; x.lineJoin = 'round'; x.strokeStyle = col; x.stroke(); x.restore(); };
const rgrad = (x, cx, cy, r0, r1, stops) => { const g = x.createRadialGradient(cx, cy, r0, cx, cy, r1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; };
const lgrad = (x, x0, y0, x1, y1, stops) => { const g = x.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; };
// одежда: fn в координатах тела (центр тела = 0,0; ширина нормирована к rx = 104)
const cloth = fn => (x, B, S, VW) => { x.save(); x.translate(B.cx, B.cy); x.scale(B.rx / LONG.rx, 1); fn(x, S, VW); x.restore(); };

// геометрия лица в координатах головы (как drawHead): сдвиг в 3/4 и центры глаз
function faceGeo(S, VW, p) {
  const h = S.head, f = S.face, r = f.mr || h.ry, v = VW && VIEWS[VW.view];
  const vfx = v ? VW.facing * v.turn * r : 0, fx = (p.turn || 0) * r, ecx = (f.eyes[0].x + f.eyes[1].x) / 2, comp = v ? v.comp : 1;
  return { vfx, fx, off: fx + vfx, back: !!VW && VW.view === 'back', side: !!VW && VW.view === 'side', facing: VW ? VW.facing : 0,
    eyes: f.eyes.map((e, i) => ({ x: (e.x - ecx) * comp + ecx + (i ? fx * .8 : fx) + vfx, y: e.y })) };
}
// тип шляпы: face(x, H, S, G, p) — причёска/очки без сдвига шляпы; hat(x, H, S, G, p) — сама шляпа
function overlay(face, hat) {
  return (x, H, S, VW, p = {}) => {
    const fs = S.face.fs ?? 1, hd = (p.hatDy || 0) * fs + (p.hatLag || 0) * -10 * fs, hr = (p.hatLag || 0) * .06 - (p.hatTip || 0) * .16 + (p.hatRot || 0), hx = (p.hatDx || 0) * fs;
    const G = faceGeo(S, VW, p);
    if (face) { x.save(); x.rotate(-hr); x.translate(-hx, -hd); face(x, H, S, G, p); x.restore(); }
    if (hat) hat(x, H, S, G, p);
  };
}
// очки: прямоугольные (rect) или тёмные (shades)
function glasses(x, G, S, { w = 70, h = 46, r = 10, lw = 6, frame, lens, glint = 'rgba(255,255,255,.75)', dy = 2, shades = false }) {
  const ink = frame || S.colors.ink; if (S.shade) glint = 'rgba(255,255,255,.4)';          // лонги со светом: блики мягче
  // вид сбоку (G.side): глаза сближены (comp .6), две линзы полной ширины налезали друг на друга — дальняя линза
  // сжата в перспективе и сдвинута наружу; анфас и 3/4 рисуются как прежде (wl = w, сдвига нет)
  const farI = G.facing > 0 ? 0 : 1, wl = i => (G.side && i === farI ? w * .5 : w), ox = i => (G.side && i === farI ? -G.facing * w * .12 : 0);
  for (const [i, e0] of G.eyes.entries()) {
    const w = wl(i), e = { x: e0.x + ox(i), y: e0.y };
    x.beginPath(); x.roundRect(e.x - w / 2, e.y + dy - h / 2, w, h, shades ? [r, r, r * 2.2, r * 2.2] : r);
    x.fillStyle = shades ? lgrad(x, 0, e.y - h / 2, 0, e.y + h / 2, [[0, '#3A3442'], [.45, '#16121A'], [1, '#08060A']]) : lens || 'rgba(175,205,225,.22)'; x.fill();
    x.lineWidth = lw; x.strokeStyle = ink; x.stroke();
    path(x, [[e.x - w * .3, e.y + dy - h * .05], [e.x - w * .1, e.y + dy - h * .32]], shades ? 6 : 4, glint);
    if (shades) path(x, [[e.x - w * .08, e.y + dy + h * .02], [e.x + w * .02, e.y + dy - h * .12]], 4, 'rgba(255,255,255,.4)');
  }
  const a = { x: G.eyes[0].x + ox(0), y: G.eyes[0].y, w: wl(0) }, b = { x: G.eyes[1].x + ox(1), y: G.eyes[1].y, w: wl(1) };
  path(x, [[a.x + a.w / 2, a.y + dy - h * .12], [(a.x + b.x) / 2, a.y + dy - h * .32, b.x - b.w / 2, b.y + dy - h * .12]], lw * .8, ink);
  // дужки к краю головы
  const R = S.head.rx;
  if (G.facing >= 0) path(x, [[a.x - a.w / 2, a.y + dy - h * .15], [-R + 6, a.y + dy - h * .3]], lw * .7, ink);
  if (G.facing <= 0) path(x, [[b.x + b.w / 2, b.y + dy - h * .15], [R - 6, b.y + dy - h * .3]], lw * .7, ink);
}

// спина одежды (вид 'back'): шов по центру, нижняя резинка (если band), блик
function backSeam(x, seam, band, sheen) {
  path(x, [[0, -150], [0, 160]], 3, seam);
  if (band) { poly(x, [[-110, 118], [110, 118], [110, 160], [-110, 160]], band, null); path(x, [[-110, 118], [110, 118]], 4, seam); }
  path(x, [[-92, -60], [-98, 0, -88, 70]], 9, sheen);
}

// ---------- общий каркас фигуры ----------
function figure({ name, armStyle = 'elbow', legStyle = 'natural', ink = '#1C1418', body, hat, face, colors = {}, shoe = '#1A1416', head = {}, rx = LONG.rx, ry = LONG.ry, hand = ink }) {
  const by = LONG.by, hipY = LONG.hipY, L = LONG;
  // стоя: у натуральных ног (legStyle 'natural') колени почти прямые, чуть наружу; у палочек — прежняя дуга
  const leg = sd => [{ layer: 'back', hip: true, a: [sd * 30, hipY], b: [sd * 38, -10], L: legStyle === 'natural' ? 314 : 320, bend: sd, sag: 1, min: 1 }, { layer: 'back', pts: [[sd * 36, -9], [sd * 62, -7]], w: 22, col: shoe }];
  // сидит лицом в сторону f: дальняя нога за телом, ближняя бедром поверх «колен» корпуса
  const sit = f => ({ arms: 'auto', limbs: [
    { layer: 'back', pts: [[-f * 14, hipY + 8], [f * 118, hipY + 20]] }, { layer: 'back', pts: [[f * 118, hipY + 20], [f * 128, -12]] }, { layer: 'back', pts: [[f * 126, -11], [f * 154, -9]], w: 22, col: shoe },
    { layer: 'mid', pts: [[f * 16, hipY + 4], [f * 152, hipY + 16]] }, { layer: 'mid', pts: [[f * 152, hipY + 16], [f * 164, -6]] }, { layer: 'mid', pts: [[f * 162, -5], [f * 192, -3]], w: 22, col: shoe },
  ] });
  return new Stickman({
    name, armStyle, legStyle, limbLook: 'tube', unit: .00202, u: .96, lw: 7.5, limbW: 11,                      // armStyle 'elbow' — руки с локтем (arms.js), 'hose' — резиновые, как в шортсах
    pins: { feet: [0, 0], chest: [0, by], seat: [0, L.seatY], head: [0, L.headY] },
    colors: { ink, hand, mouth: '#2B1520', hair: colors.hair || '#3B2519', stache: colors.stache || '#3B2519', ...FACE_COLORS, ...colors },
    head: { x: 0, y: L.headY, rx: 134, ry: 126, pivot: 110, fill: '#FFFFFF', shade: '#E4DED8', grad: [-38, -42, 30, 146, .72], ...head },
    body: { x: 0, y: by, rx, ry, n: 3.0, topK: .86, ...body },
    hat,
    face: { mr: 126, fs: .95, restEye: 'dot', restMouth: 'smile', brows: true,
      eyes: [{ x: -46, y: -18, rx: 8.5, ry: 11.5, lw: 6, tilt: 0 }, { x: 46, y: -18, rx: 8.5, ry: 11.5, lw: 6, tilt: 0 }],
      mouth: [0, 52], mouthBig: [0, 54], ms: .92, ...face },
    rig: { hipY, sh: [[-84, by - 108], [84, by - 108]], armL: 228, sag: 1, armLayer: 'mid', hipX: 30, groundY: -8, legL: 314 },
    hand: { r: 12, fill: hand, plain: true },
    stance: 'stand',
    stances: { stand: { arms: 'auto', limbs: [...leg(-1), ...leg(1)] }, sitR: sit(1), sitL: sit(-1) },
  });
}

// =====================================================================================================
// Дженсен
// =====================================================================================================
HATS.L_jensen = overlay((x, H, S, G) => {
  // серебристая короткая стрижка, зачёсанная назад: объём над макушкой, линия роста над бровями
  const o = G.off * .55, ink = S.colors.ink;
  const cap = [[-133, -22], [-150, -112, -82, -166], [0, -190, 72, -170], [142, -140, 134, -30], [126, -62], [112, -84, 84, -96],
    [o + 66, -90, o + 44, -110], [o + 18, -96, o - 6, -116], [o - 34, -104, o - 66, -110], [-100, -94, -126, -60]];
  poly(x, cap, lgrad(x, -130, -180, 120, -40, [[0, '#F1F3F6'], [.5, '#C6CBD2'], [1, '#8A9099']]), ink, S.lw);
  x.save(); x.beginPath(); x.moveTo(cap[0][0], cap[0][1]); for (const p of cap.slice(1)) p.length === 4 ? x.quadraticCurveTo(...p) : x.lineTo(...p); x.closePath(); x.clip();
  for (const [a, b] of [[o + 44, -108], [o - 6, -114]]) path(x, [[a, b], [a - 14, b - 40, a - 54, b - 70]], 3.5, 'rgba(90,96,106,.4)');   // зачёс назад
  path(x, [[-84, -136], [-30, -168, 40, -164]], 8, 'rgba(255,255,255,.8)');                                                       // блик
  x.restore();
  for (const sd of [-1, 1]) poly(x, [[sd * 131, -30], [sd * 124, -46], [sd * 116, 8], [sd * 128, 12]], '#A9AEB6', null);           // виски
  if (!G.back) glasses(x, G, S, { w: 74, h: 46, r: 9, lw: 6.5, frame: '#141114' });
}, null);
export function jensen(over = {}) {
  const lea = '#16131A';
  return figure({
    name: 'jensen', ink: '#141014', shoe: '#0E0C0F', colors: { hair: '#B9BEC6' },
    hat: { type: 'L_jensen' },
    face: { restMouth: 'smile', browCol: '#7E848D', eyes: [{ x: -48, y: -16, rx: 8.5, ry: 11.5, lw: 6, tilt: 0 }, { x: 48, y: -16, rx: 8.5, ry: 11.5, lw: 6, tilt: 0 }] },
    body: {
      fillRadial: { at: [-46, -80], r0: 10, to: [-6, -10], r1: 200, stops: [[0, '#5A5560'], [.32, '#2C2830'], [1, lea]] },
      inside: [cloth((x, S, VW) => {
        const ink = S.colors.ink;
        if (VW && VW.view === 'back') { backSeam(x, ink, '#0E0C10', 'rgba(255,255,255,.16)'); return; }                  // спина куртки
        poly(x, [[-34, -150], [26, -150], [24, 160], [-30, 160]], '#24232A', null);                                    // чёрная футболка в распахе
        path(x, [[-30, -142], [-2, -122, 24, -142]], 4, '#3D3C45');                                                       // ворот футболки
        path(x, [[-10, -110], [-6, -60]], 2.5, 'rgba(255,255,255,.08)');
        // косая молния и планка куртки
        path(x, [[26, -150], [24, 160]], 4.5, ink); path(x, [[31, -146], [29, 158]], 3, '#B9BDC5');
        for (let y = -136; y < 150; y += 11) path(x, [[27, y], [33, y + 2]], 2, 'rgba(210,214,222,.7)');
        // лацканы-«косуха» с кнопками
        poly(x, [[-34, -150], [-84, -138], [-62, -78], [-36, -70]], '#24202A', ink, 4);
        poly(x, [[26, -150], [86, -140], [70, -84], [30, -96]], '#24202A', ink, 4);
        path(x, [[-80, -134], [-62, -84]], 3, 'rgba(255,255,255,.28)'); path(x, [[82, -136], [70, -92]], 3, 'rgba(255,255,255,.22)');
        ell(x, -60, -86, 5, 5, '#C9CDD4', ink, 2); ell(x, 70, -92, 5, 5, '#C9CDD4', ink, 2);
        // карманы на молнии, нижняя резинка, блеск кожи
        path(x, [[-84, 20], [-50, 52]], 4, '#B9BDC5'); path(x, [[60, 26], [86, 0]], 4, '#B9BDC5');
        poly(x, [[-110, 118], [110, 118], [110, 160], [-110, 160]], '#0E0C10', null); path(x, [[-110, 118], [110, 118]], 4, ink);
        for (let k = -100; k <= 100; k += 14) path(x, [[k, 124], [k, 150]], 1.6, 'rgba(255,255,255,.07)');
        path(x, [[-92, -60], [-98, 0, -88, 70]], 9, 'rgba(255,255,255,.16)'); path(x, [[-74, -96], [-82, -70]], 6, 'rgba(255,255,255,.32)');
        path(x, [[86, -40], [94, 20, 84, 80]], 6, 'rgba(255,255,255,.08)');
      })],
    },
    ...over,
  });
}

// =====================================================================================================
// Алиса
// =====================================================================================================
HATS.L_alice = overlay((x, H, S, G) => {
  if (G.back) {                                                                                   // со спины: каре закрывает затылок до линии подбородка
    poly(x, [[-150, 88], [-166, -40, -136, -120], [-90, -170, 0, -168], [90, -170, 136, -120], [166, -40, 150, 88], [0, 112, -150, 88]],
      lgrad(x, -150, -170, 150, 90, [[0, '#2C2834'], [.5, '#151217'], [1, '#08070A']]), S.colors.ink, S.lw);
    path(x, [[-104, -136], [-40, -164, 30, -158]], 9, 'rgba(120,120,170,.45)');
    for (let k = -2; k <= 2; k++) path(x, [[k * 40, -150], [k * 52, -20, k * 58, 80]], 2.5, 'rgba(0,0,0,.5)');   // пряди
    return;
  }
  for (const sd of [-1, 1]) { x.beginPath(); x.arc(sd * 128 + G.off * .2, 52, 11, 0, TAU); x.lineWidth = 5; x.strokeStyle = '#E7B83C'; x.stroke(); }  // серьги-кольца
  glasses(x, G, S, { w: 78, h: 44, r: 12, lw: 6, shades: true, frame: '#0F0C10' });
  // каре: шапка волос с ровной чёлкой, по бокам до подбородка, кончики внутрь
  const o = G.off * .5, ink = S.colors.ink;
  const bob = [[-150, 88], [-166, -40, -136, -120], [-90, -170, 0, -168], [90, -170, 136, -120], [166, -40, 150, 88], [140, 98, 116, 90],
    [120, 20, 122, -40], [118, -78], [o + 60, -80], [o, -76], [o - 60, -80], [-118, -78], [-122, -40, -120, 20], [-140, 98, -150, 88]];
  poly(x, bob, lgrad(x, -150, -170, 150, 90, [[0, '#2C2834'], [.5, '#151217'], [1, '#08070A']]), ink, S.lw);
  path(x, [[-104, -136], [-40, -164, 30, -158]], 9, 'rgba(120,120,170,.45)');                    // блик
  path(x, [[-142, -50], [-146, 0, -134, 60]], 5, 'rgba(120,120,170,.3)');
  for (let k = -3; k <= 3; k++) path(x, [[o + k * 34, -80], [o + k * 30, -118]], 2.5, 'rgba(0,0,0,.55)');  // пряди чёлки
}, null);
export function alice(over = {}) {
  return figure({
    name: 'alice', ink: '#1A1216', shoe: '#B3121F', rx: 98, colors: { hair: '#141015', mouth: '#A3172A', mouthIn: '#6B1222' },
    hat: { type: 'L_alice' },
    face: { restMouth: 'smirkS', browCol: '#141015' },
    body: {
      topK: .8,
      fillRadial: { at: [-44, -76], r0: 12, to: [-8, -10], r1: 200, stops: [[0, '#F25A62'], [.42, '#CC2232'], [1, '#7A0C17']] },
      inside: [cloth((x, S, VW) => {
        const ink = S.colors.ink;
        if (VW && VW.view === 'back') { backSeam(x, 'rgba(60,0,8,.55)', null, 'rgba(255,220,220,.22)'); return; }       // спина жакета
        poly(x, [[-36, -150], [36, -150], [0, -60]], '#FFF7F2', null);                                                   // белая блузка
        poly(x, [[-36, -150], [-12, -150], [-6, -112], [-26, -120]], '#F1E4DE', ink, 3); poly(x, [[36, -150], [12, -150], [6, -112], [26, -120]], '#F1E4DE', ink, 3);
        ell(x, 0, -96, 6, 6, '#E7B83C', ink, 2);                                                                          // кулон
        poly(x, [[-36, -150], [-78, -134], [-40, -40], [0, -60]], '#A3141F', ink, 4); poly(x, [[36, -150], [78, -134], [40, -40], [0, -60]], '#A3141F', ink, 4);
        path(x, [[-70, -128], [-40, -52]], 3, 'rgba(255,190,190,.45)');
        path(x, [[0, -60], [0, 150]], 2.5, 'rgba(60,0,8,.55)');
        for (const y of [-20, 40]) ell(x, 14, y, 7, 7, '#E7B83C', ink, 2.5);
        path(x, [[-104, 70], [-60, 80, 0, 80]], 3, 'rgba(60,0,8,.45)');                                                  // талия
        path(x, [[-86, -70], [-96, -10, -84, 50]], 9, 'rgba(255,220,220,.22)');
      })],
    },
    ...over,
  });
}

// =====================================================================================================
// Ведущий №1: детектив
// =====================================================================================================
function fedora(x, S, G, { col, dk, lt, band, bandHi, tilt = -.06 }) {
  const ink = S.colors.ink, lw = S.lw, o = G.off * .25;
  x.save(); x.translate(o, 0); x.rotate(tilt);
  // поля: задняя часть, тулья, передний край
  poly(x, [[-196, -82], [-170, -110, 0, -116], [170, -110, 196, -82], [150, -66, 0, -70], [-150, -66, -196, -82]], lgrad(x, -196, 0, 196, 0, [[0, lt], [.5, col], [1, dk]]), ink, lw);
  poly(x, [[-116, -96], [-128, -170, -92, -214], [-40, -196, 0, -222], [40, -196, 92, -214], [128, -170, 116, -96], [0, -84, -116, -96]], lgrad(x, -120, 0, 120, 0, [[0, lt], [.55, col], [1, dk]]), ink, lw);
  path(x, [[0, -214], [-6, -170, 4, -140]], 4, 'rgba(0,0,0,.35)');                                                         // залом
  poly(x, [[-118, -98], [-121, -128], [0, -118, 121, -128], [118, -98], [0, -86, -118, -98]], band, null);
  path(x, [[-118, -114], [0, -104, 118, -114]], 2.5, bandHi);
  path(x, [[-96, -186], [-60, -205]], 6, 'rgba(255,255,255,.28)');
  path(x, [[-176, -86], [-120, -100]], 4, 'rgba(255,255,255,.22)');
  x.restore();
}
HATS.L_detective = overlay((x, H, S, G) => {
  if (G.back) return;
  x.save(); x.fillStyle = 'rgba(70,60,66,.32)';                                                                            // щетина
  for (let i = 0; i < 46; i++) { const a = .25 + (i * .618 % 1) * 2.64, r = 96 + (i * 7 % 22); ell(x, Math.cos(a) * r * .95 + G.off * .9, Math.sin(a) * r * .8 + 24, 2.4, 2.4, x.fillStyle, null); }
  x.restore();
}, (x, H, S, G) => fedora(x, S, G, { col: '#3D3D46', dk: '#1E1E25', lt: '#5C5C68', band: '#121116', bandHi: 'rgba(255,255,255,.18)' }));
export function detective(over = {}) {
  return figure({
    name: 'detective', ink: '#1C1418', shoe: '#3A2418', colors: { hair: '#2A2024' },
    hat: { type: 'L_detective' },
    face: { restEye: 'lid', restMouth: 'smirkS', browCol: '#2A2024', eyes: [{ x: -46, y: -14, rx: 8.5, ry: 11.5, lw: 6.5, tilt: 2 }, { x: 46, y: -14, rx: 8.5, ry: 11.5, lw: 6.5, tilt: -2 }] },
    body: {
      fillRadial: { at: [-44, -76], r0: 12, to: [-8, -10], r1: 205, stops: [[0, '#E6CB94'], [.45, '#C7A266'], [1, '#86663A']] },
      inside: [cloth((x, S) => {
        const ink = S.colors.ink;
        poly(x, [[-34, -150], [34, -150], [0, -40]], '#F4F1EA', null);                                                    // рубашка
        poly(x, [[-9, -140], [9, -140], [12, -122], [-12, -122]], '#9E1F2A', ink, 2.5);                                    // узел
        poly(x, [[-12, -122], [12, -122], [8, -50], [0, -38], [-8, -50]], '#B82A35', ink, 2.5);                            // галстук
        path(x, [[-4, -116], [-2, -60]], 3, 'rgba(255,255,255,.25)');
        // широкие лацканы
        poly(x, [[-34, -150], [-92, -132], [-72, -100], [-50, -26], [0, -40]], '#B08A50', ink, 4); poly(x, [[34, -150], [92, -132], [72, -100], [50, -26], [0, -40]], '#B08A50', ink, 4);
        path(x, [[-84, -126], [-54, -38]], 3, 'rgba(255,240,200,.5)');
        // двубортные пуговицы, пояс с пряжкой, кокетка
        for (const [px, py] of [[-28, -4], [28, -4], [-30, 44], [30, 44]]) { ell(x, px, py, 7.5, 7.5, '#4A3220', ink, 2.5); ell(x, px - 2, py - 2, 2.5, 2.5, 'rgba(255,255,255,.4)', null); }
        poly(x, [[-110, 70], [110, 70], [110, 98], [-110, 98]], '#9A7642', null); path(x, [[-110, 70], [110, 70]], 3.5, ink); path(x, [[-110, 98], [110, 98]], 3.5, ink);
        x.beginPath(); x.roundRect(-18, 66, 36, 36, 5); x.lineWidth = 5; x.strokeStyle = '#D9B24A'; x.stroke(); path(x, [[0, 70], [0, 98]], 3, '#D9B24A');
        path(x, [[40, -140], [96, -110]], 3, 'rgba(70,45,15,.6)');                                                       // штормовая кокетка
        path(x, [[0, 100], [0, 150]], 3, 'rgba(70,45,15,.5)');
        path(x, [[-90, -60], [-100, 0, -90, 60]], 10, 'rgba(255,245,210,.25)');
      })],
      outside: [cloth((x, S) => {                                                                                       // поднятый воротник
        const ink = S.colors.ink;
        poly(x, [[-34, -150], [-58, -196], [-96, -172], [-88, -134]], '#B08A50', ink, 4); poly(x, [[34, -150], [58, -196], [96, -172], [88, -134]], '#A27D46', ink, 4);
        path(x, [[-56, -186], [-86, -168]], 3, 'rgba(255,240,200,.5)');
      })],
    },
    ...over,
  });
}

// =====================================================================================================
// Ведущий №2: денежный человек
// =====================================================================================================
HATS.L_money = overlay((x, H, S, G) => {
  if (G.back) return;
  const e = G.eyes[1], ink = S.colors.ink;                                                                               // монокль на правом глазу
  ell(x, e.x, e.y + 2, 30, 30, 'rgba(220,235,245,.2)', null); x.beginPath(); x.arc(e.x, e.y + 2, 30, 0, TAU); x.lineWidth = 7; x.strokeStyle = ink; x.stroke(); x.lineWidth = 3.5; x.strokeStyle = '#E8C04A'; x.stroke();
  path(x, [[e.x - 16, e.y - 12], [e.x - 4, e.y - 22]], 4, S.shade ? 'rgba(255,255,255,.4)' : 'rgba(255,255,255,.8)');
  x.setLineDash([5, 5]); path(x, [[e.x + 22, e.y + 22], [e.x + 60, e.y + 80, e.x + 40, e.y + 140]], 3, '#E8C04A'); x.setLineDash([]);
}, (x, H, S, G) => {
  const ink = S.colors.ink, lw = S.lw, o = G.off * .25;
  x.save(); x.translate(o, 0); x.rotate(.05);
  poly(x, [[-122, -96], [-132, -200, -70, -238], [0, -244, 70, -238], [132, -200, 122, -96]], lgrad(x, -130, 0, 130, 0, [[0, '#3E3A40'], [.5, '#1E1B20'], [1, '#0B0A0C']]), ink, lw);
  poly(x, [[-123, -98], [-126, -132], [0, -124, 126, -132], [123, -98], [0, -90, -123, -98]], '#1F4A33', null);
  path(x, [[-124, -126], [0, -118, 124, -126]], 2.5, 'rgba(200,255,220,.25)');
  poly(x, [[-172, -110], [-166, -80, 0, -76], [166, -80, 172, -110], [140, -94, 0, -96], [-140, -94, -172, -110]], '#1E1B20', ink, lw);
  ell(x, -62, -214, 9, 5, 'rgba(255,255,255,.2)', null);                                    // один маленький блик на освещённой стороне
  x.restore();
});
export function moneyman(over = {}) {
  return figure({
    name: 'moneyman', legStyle: 'hose', /* ведущий оставляет фирменные ноги-палочки (решение Рауана) */ ink: '#1C1418', shoe: '#2A1A12', colors: { hair: '#3B2519', stache: '#4A2E1C' },
    hat: { type: 'L_money' },
    face: { restMouth: 'smile', moustache: true, stacheK: 1.05, browCol: '#3B2519' },
    body: {
      fillRadial: { at: [-44, -76], r0: 12, to: [-8, -10], r1: 205, stops: [[0, '#4FA274'], [.42, '#2C6E4A'], [1, '#143A26']] },
      inside: [cloth((x, S) => {
        const ink = S.colors.ink;
        for (let k = -100; k <= 100; k += 16) path(x, [[k, -150], [k, 150]], 1.6, 'rgba(255,255,255,.07)');           // полоска жилета
        poly(x, [[-46, -150], [46, -150], [0, -30]], '#FBF8F2', null);                                                    // рубашка
        path(x, [[-46, -150], [0, -30], [46, -150]], 4, ink);
        poly(x, [[-6, -136], [-34, -150], [-34, -118]], '#C9262F', ink, 2.5); poly(x, [[6, -136], [34, -150], [34, -118]], '#C9262F', ink, 2.5);   // бабочка
        ell(x, 0, -134, 7, 7, '#A11B24', ink, 2.5);
        for (let k = 0; k < 4; k++) { ell(x, 0, -10 + k * 36, 7.5, 7.5, '#E8C04A', ink, 2.5); ell(x, -2, -12 + k * 36, 2.5, 2.5, 'rgba(255,255,255,.7)', null); }
        path(x, [[-80, 34], [-44, 34]], 4, 'rgba(0,30,15,.7)'); path(x, [[44, 34], [80, 34]], 4, 'rgba(0,30,15,.7)');      // кармашки
        poly(x, [[-110, 112], [0, 132], [110, 112], [110, 160], [-110, 160]], '#3E3A44', null);                           // брюки под мысами жилета
        path(x, [[-110, 112], [0, 134], [110, 112]], 4, ink);
        x.setLineDash([6, 4]); path(x, [[6, -10], [40, 30, 66, 30]], 3.5, '#E8C04A'); x.setLineDash([]);                // цепочка к часам
        path(x, [[-86, -60], [-96, 0, -86, 60]], 9, 'rgba(220,255,230,.18)');
      })],
      outside: [cloth((x, S) => {                                                                                       // карманные часы, наполовину из кармана
        const ink = S.colors.ink;
        ell(x, 66, 24, 19, 19, '#E8C04A', ink, 3.5); ell(x, 66, 24, 13, 13, '#FFFBEA', ink, 2);
        path(x, [[66, 24], [66, 15]], 2.5, ink); path(x, [[66, 24], [72, 27]], 2.5, ink); ell(x, 66, 3, 4, 4, '#E8C04A', ink, 2);
        path(x, [[56, 14], [60, 10]], 2.5, S.shade ? 'rgba(255,255,255,.4)' : 'rgba(255,255,255,.8)');
        path(x, [[44, 34], [88, 34]], 5, '#1C4A31');
      })],
    },
    ...over,
  });
}

// =====================================================================================================
// Ведущий №3: репортёр
// =====================================================================================================
HATS.L_reporter = overlay((x, H, S, G) => {
  if (G.back) return;
  for (const sd of [-1, 1]) for (let i = 0; i < 4; i++) ell(x, G.eyes[sd < 0 ? 0 : 1].x + sd * (6 + i * 9) - 10 + i * 4, 30 + (i % 2) * 9, 3.6, 3.2, 'rgba(206,120,72,.75)', null);   // веснушки
  for (const sd of [-1, 1]) poly(x, [[sd * 128, -60], [sd * 150, -40], [sd * 136, -30], [sd * 152, -10], [sd * 126, 0]], '#C8642A', S.colors.ink, 3.5);   // рыжие вихры из-под шляпы
}, (x, H, S, G) => {
  fedora(x, S, G, { col: '#A7ADB5', dk: '#6E747D', lt: '#C8CDD3', band: '#26222A', bandHi: 'rgba(255,255,255,.2)', tilt: .07 });
  const o = G.off * .25, ink = S.colors.ink;
  x.save(); x.translate(o, 0); x.rotate(.07);
  x.save(); x.translate(-74, -128); x.rotate(-.18);                                                                      // карточка PRESS за лентой
  x.beginPath(); x.roundRect(-34, -30, 68, 42, 4); x.fillStyle = '#FFFDF4'; x.fill(); x.lineWidth = 3.5; x.strokeStyle = ink; x.stroke();
  x.fillStyle = '#B3121F'; x.font = '900 19px Arial Black, Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('PRESS', 0, -10);
  path(x, [[-24, 2], [24, 2]], 2.5, 'rgba(0,0,0,.35)');
  x.restore();
  x.save(); x.translate(80, -122); x.rotate(.5);                                                                         // карандаш за лентой
  poly(x, [[-8, -60], [8, -60], [8, 30], [-8, 30]], '#F2C230', ink, 3); poly(x, [[-8, 30], [8, 30], [0, 50]], '#EAD2A6', ink, 3); ell(x, 0, 46, 3, 4, ink, null);
  poly(x, [[-8, -72], [8, -72], [8, -60], [-8, -60]], '#E58A9A', ink, 3); path(x, [[-3, -54], [-3, 24]], 2.5, 'rgba(255,255,255,.5)');
  x.restore(); x.restore();
});
export function reporter(over = {}) {
  return figure({
    name: 'reporter', ink: '#1C1418', shoe: '#5A3418', colors: { hair: '#C8642A' },
    hat: { type: 'L_reporter' },
    face: { restMouth: 'smile', browCol: '#B4561F', eyes: [{ x: -44, y: -16, rx: 9.5, ry: 13, lw: 6, tilt: 0 }, { x: 44, y: -16, rx: 9.5, ry: 13, lw: 6, tilt: 0 }] },
    body: {
      fillRadial: { at: [-44, -76], r0: 12, to: [-8, -10], r1: 205, stops: [[0, '#F4C766'], [.42, '#D69D32'], [1, '#93641A']] },
      inside: [cloth((x, S) => {
        const ink = S.colors.ink;
        for (let k = -2; k <= 2; k++) for (let j = -1; j <= 2; j++) { const cx = k * 52 + (j % 2 ? 26 : 0), cy = j * 52 + 10; poly(x, [[cx, cy - 26], [cx + 26, cy], [cx, cy + 26], [cx - 26, cy]], null, 'rgba(120,70,10,.35)', 2.5); }   // аргайл
        poly(x, [[-50, -150], [50, -150], [0, -50]], '#BFD8EE', null);                                                    // голубая рубашка
        poly(x, [[-50, -150], [-16, -150], [-10, -112], [-36, -118]], '#D6E8F6', ink, 3); poly(x, [[50, -150], [16, -150], [10, -112], [36, -118]], '#D6E8F6', ink, 3);
        poly(x, [[-6, -128], [-32, -142], [-32, -110]], '#2F8C8C', ink, 2.5); poly(x, [[6, -128], [32, -142], [32, -110]], '#2F8C8C', ink, 2.5); ell(x, 0, -127, 7, 7, '#226B6B', ink, 2.5);
        path(x, [[-50, -150], [0, -50], [50, -150]], 9, '#B98222'); path(x, [[-50, -150], [0, -50], [50, -150]], 3, ink);     // вязаная кромка выреза
        poly(x, [[-110, 116], [110, 116], [110, 160], [-110, 160]], '#B98222', null); path(x, [[-110, 116], [110, 116]], 3.5, ink);
        for (let k = -104; k <= 104; k += 9) path(x, [[k, 120], [k, 150]], 2, 'rgba(110,62,0,.45)');
        path(x, [[-86, -50], [-96, 0, -86, 60]], 10, 'rgba(255,245,210,.25)');
      })],
      outside: [cloth((x, S) => {                                                                                       // блокнот на пружине в кармане
        const ink = S.colors.ink;
        x.save(); x.translate(-56, 30); x.rotate(-.12);
        poly(x, [[-24, -44], [24, -44], [24, 20], [-24, 20]], '#FFFDF4', ink, 3);
        for (let y = -30; y < 18; y += 10) path(x, [[-16, y], [16, y]], 2, 'rgba(60,110,190,.55)');
        for (let k = -18; k <= 18; k += 9) { x.beginPath(); x.arc(k, -46, 4, Math.PI, TAU); x.lineWidth = 2.5; x.strokeStyle = '#8A8F98'; x.stroke(); }
        x.restore();
        poly(x, [[-88, 4], [-24, 4], [-24, 50], [-88, 50]], '#C88E2A', ink, 3.5);                                         // карман поверх
        path(x, [[-84, 12], [-28, 12]], 2, 'rgba(110,62,0,.5)');
      })],
    },
    ...over,
  });
}

export const LONG_PRESETS = { jensen, alice, detective, moneyman, reporter };
export const HOSTS = ['detective', 'moneyman', 'reporter'];

// Стиль «Стикман Нуар» (утверждён 2026-11-16): свет на героях лонгов одной функцией.
// dir — направление на источник света в плоскости кадра ([+1, .45] — свет справа и ниже, свеча на столе;
// [-1, -.55] — лампа сзади-слева). Тень головы — cel-серп с чётким краем (ложится и на волосы/шляпу),
// тёплый свет только на лице и краю волос (мягко), на одежде тёплого света нет (давал полосы).
// Использование: actor.char.spec.shade = noirShade([1, .45]);
// cutY (необязательно): для крупных планов с каре — пряди у щёк не выкусывают дыру в серпе (см. headShade в stickman.js)
export const noirShade = (dir, { warm = '#ffc47a', cutY } = {}) => ({
  dir, body: { k: 0 },
  head: { k: .42, color: '#55507e', shiftU: 52, after: true, glow: { color: warm, k: .3 }, ...(cutY != null ? { cutY } : {}) },
});
