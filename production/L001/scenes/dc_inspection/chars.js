// dc_inspection/chars.js — герои сцены осмотра дата-центра (пресеты сцены, движок не меняется):
//   inspector — инспектор Минторга США: вариант detective (тот же каркас, руки с локтем, ноги с коленом), без шляпы —
//               короткая тёмная стрижка, щетина, тёмно-синий костюм, белая рубашка, тёмно-красный галстук, бейдж на кармане
//   guide     — гид дата-центра: вариант reporter без шляпы — чёрная стрижка с чёлкой, графитовое поло с бирюзовым
//               кантом, шнурок-лента на шее с пропуском
// Оба: plantLegs .02 (ноги стоят), свет — noirShade(dir) из фильма. Рисунок причёски — свой тип в HATS (новые ключи).
import { detective, reporter, HATS, ell } from 'engine';

const TAU = Math.PI * 2, RX = 104;
const VIEWS = { threeQuarter: .3, side: .5, back: 0 };
const poly = (x, pts, fill, stroke, lw) => { x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) p.length === 4 ? x.quadraticCurveTo(p[0], p[1], p[2], p[3]) : x.lineTo(p[0], p[1]); x.closePath(); if (fill) { x.fillStyle = fill; x.fill(); } if (stroke) { x.lineWidth = lw; x.strokeStyle = stroke; x.lineJoin = 'round'; x.stroke(); } };
const path = (x, pts, w, col) => { x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) p.length === 4 ? x.quadraticCurveTo(p[0], p[1], p[2], p[3]) : x.lineTo(p[0], p[1]); x.lineWidth = w; x.lineCap = 'round'; x.lineJoin = 'round'; x.strokeStyle = col; x.stroke(); };
const lgrad = (x, x0, y0, x1, y1, stops) => { const g = x.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; };
const cloth = fn => (x, B, S, VW) => { x.save(); x.translate(B.cx, B.cy); x.scale(B.rx / RX, 1); fn(x, S, VW); x.restore(); };
const offOf = (S, VW, p) => (VW && VIEWS[VW.view] != null ? VW.facing * VIEWS[VW.view] * 126 : 0) + (p && p.turn || 0) * 126;

// короткая стрижка-шапочка: кромка над лбом сдвигается за поворотом головы
function shortHair(x, S, VW, p, { light, mid, dark, fringe = false }) {
  const ink = S.colors.ink, o = offOf(S, VW, p) * .5, back = VW && VW.view === 'back';
  if (back) { poly(x, [[-134, 10], [-152, -110, -80, -166], [0, -186, 80, -166], [152, -110, 134, 10], [0, 40, -134, 10]], lgrad(x, -130, -180, 130, 20, [[0, light], [.5, mid], [1, dark]]), ink, S.lw); return; }
  // шапочка волос по форме головы (ry 126): поверх макушки на 14-20 ед., кромка над лбом — неровная, с пробором
  const cap = fringe
    ? [[-133, -30], [-142, -110, -80, -142], [0, -158, 80, -142], [142, -110, 133, -30], [120, -58], [o + 96, -60, o + 66, -78], [o + 44, -62, o + 16, -84], [o - 14, -62, o - 46, -82], [o - 80, -64, -110, -56]]
    : [[-133, -26], [-142, -108, -82, -142], [0, -156, 80, -140], [142, -106, 133, -30], [122, -64], [110, -86, o + 60, -96], [o + 30, -98, o - 14, -88], [o - 34, -104], [o - 66, -98, -100, -92], [-118, -84, -126, -58]];
  poly(x, cap, lgrad(x, -130, -160, 120, -40, [[0, light], [.5, mid], [1, dark]]), ink, S.lw);
  x.save(); x.beginPath(); x.moveTo(cap[0][0], cap[0][1]); for (const q of cap.slice(1)) q.length === 4 ? x.quadraticCurveTo(...q) : x.lineTo(...q); x.closePath(); x.clip();
  for (const [a, b] of [[o + 40, -100], [o - 20, -96], [o - 70, -96], [o + 90, -90]]) path(x, [[a, b], [a - 10, b - 30, a - 40, b - 52]], 3.5, 'rgba(0,0,0,.35)');   // пряди
  if (!fringe) path(x, [[o - 34, -104], [o - 40, -130, o - 30, -150]], 4, 'rgba(0,0,0,.45)');                                                // пробор
  x.restore();
  path(x, [[-80, -126], [-30, -148, 30, -146]], 6, 'rgba(255,255,255,.2)');
  for (const sd of [-1, 1]) poly(x, [[sd * 131, -30], [sd * 124, -46], [sd * 116, 8], [sd * 128, 12]], dark, null);                // виски
}

HATS.L_inspector = (x, H, S, VW, p) => {
  if (!(VW && VW.view === 'back')) {                                                                  // щетина
    x.save(); x.fillStyle = 'rgba(70,60,66,.3)';
    for (let i = 0; i < 46; i++) { const a = .25 + (i * .618 % 1) * 2.64, r = 96 + (i * 7 % 22); ell(x, Math.cos(a) * r * .95 + offOf(S, VW, p) * .9, Math.sin(a) * r * .8 + 24, 2.4, 2.4, x.fillStyle, null); }
    x.restore();
  }
  shortHair(x, S, VW, p, { light: '#5a4c48', mid: '#33282a', dark: '#1a1416' });
};
HATS.L_guide = (x, H, S, VW, p) => shortHair(x, S, VW, p, { light: '#3a3640', mid: '#1c1a20', dark: '#0b0a0d', fringe: true });

export function inspector() {
  const c = detective({
    name: 'inspector', hat: { type: 'L_inspector' }, colors: { hair: '#2A2024' }, shoe: '#18120F',
    face: { restEye: 'lid', restMouth: 'flat', browCol: '#2A2024', eyes: [{ x: -46, y: -14, rx: 8.5, ry: 11.5, lw: 6.5, tilt: 2 }, { x: 46, y: -14, rx: 8.5, ry: 11.5, lw: 6.5, tilt: -2 }] },
    body: {
      fillRadial: { at: [-44, -76], r0: 12, to: [-8, -10], r1: 205, stops: [[0, '#5d7099'], [.45, '#34456a'], [1, '#1a2340']] },
      inside: [cloth((x, S, VW) => {
        const ink = S.colors.ink;
        if (VW && VW.view === 'back') { path(x, [[0, -150], [0, 160]], 3, 'rgba(0,0,0,.4)'); return; }
        poly(x, [[-34, -150], [34, -150], [0, -40]], '#F4F1EA', null);                                     // рубашка
        poly(x, [[-9, -140], [9, -140], [12, -122], [-12, -122]], '#5E1520', ink, 2.5);                       // узел
        poly(x, [[-12, -122], [12, -122], [8, -50], [0, -38], [-8, -50]], '#7A1B28', ink, 2.5);               // галстук
        path(x, [[-4, -116], [-2, -60]], 3, 'rgba(255,255,255,.18)');
        poly(x, [[-34, -150], [-84, -136], [-60, -90], [-30, 0], [0, -40]], '#2c3b5e', ink, 4);               // лацканы
        poly(x, [[34, -150], [84, -136], [60, -90], [30, 0], [0, -40]], '#2c3b5e', ink, 4);
        path(x, [[-78, -130], [-50, -40]], 3, 'rgba(200,215,255,.3)');
        for (const py of [24, 74]) { ell(x, 0, py, 7, 7, '#141826', ink, 2.5); }
        path(x, [[0, -40], [0, 160]], 2.5, 'rgba(0,0,0,.35)');
        path(x, [[-88, 40], [-44, 40]], 4, 'rgba(0,0,0,.4)'); path(x, [[44, 40], [88, 40]], 4, 'rgba(0,0,0,.4)');   // карманы
        path(x, [[-90, -60], [-100, 0, -90, 60]], 10, 'rgba(200,215,255,.16)');
      })],
      outside: [cloth((x, S, VW) => {                                                                   // бейдж на нагрудном кармане
        if (VW && VW.view === 'back') return; const ink = S.colors.ink;
        x.save(); x.translate(56, -70); x.rotate(.06);
        x.beginPath(); x.roundRect(-20, -26, 40, 52, 4); x.fillStyle = '#EDE6D2'; x.fill(); x.lineWidth = 3; x.strokeStyle = ink; x.stroke();
        x.fillStyle = '#2c4a8a'; x.fillRect(-16, -22, 32, 12); ell(x, 0, 6, 9, 9, '#C9A04A', ink, 2); x.restore();
      })],
    },
  });
  c.spec.rig = { ...c.spec.rig, plantLegs: .02 };
  return c;
}

export function guide() {
  const c = reporter({
    name: 'guide', hat: { type: 'L_guide' }, colors: { hair: '#141015' }, shoe: '#16181E',
    face: { restMouth: 'smile', browCol: '#141015', eyes: [{ x: -44, y: -16, rx: 9, ry: 12.5, lw: 6, tilt: 0 }, { x: 44, y: -16, rx: 9, ry: 12.5, lw: 6, tilt: 0 }] },
    body: {
      fillRadial: { at: [-44, -76], r0: 12, to: [-8, -10], r1: 205, stops: [[0, '#5c6672'], [.45, '#363d47'], [1, '#1b1f26']] },
      inside: [cloth((x, S, VW) => {
        const ink = S.colors.ink;
        if (VW && VW.view === 'back') { path(x, [[-60, -150], [0, -140, 60, -150]], 9, '#c43a3a'); return; }
        poly(x, [[-40, -150], [-10, -150], [-4, -110], [-28, -116]], '#2a8a8c', ink, 3); poly(x, [[40, -150], [10, -150], [4, -110], [28, -116]], '#2a8a8c', ink, 3);   // воротник поло
        poly(x, [[-10, -150], [10, -150], [8, -80], [-8, -80]], '#2c323b', ink, 2.5);                        // планка
        for (const y of [-126, -100]) ell(x, 0, y, 4.5, 4.5, '#C9CDD4', ink, 1.5);
        poly(x, [[-110, 120], [110, 120], [110, 160], [-110, 160]], '#22272f', null); path(x, [[-110, 120], [110, 120]], 3.5, '#2a8a8c');
        // шнурок-лента: от шеи вниз к пропуску
        path(x, [[-44, -150], [-30, -60, -6, 6]], 9, '#c43a3a'); path(x, [[44, -150], [30, -60, 6, 6]], 9, '#c43a3a');
        path(x, [[-44, -150], [-30, -60, -6, 6]], 2, 'rgba(255,255,255,.35)');
        path(x, [[-86, -50], [-96, 0, -86, 60]], 10, 'rgba(220,235,255,.14)');
      })],
      outside: [cloth((x, S, VW) => {                                                                   // пропуск на ленте
        if (VW && VW.view === 'back') return; const ink = S.colors.ink;
        x.save(); x.translate(0, 34); x.rotate(-.04);
        poly(x, [[-6, -30], [6, -30], [6, -18], [-6, -18]], '#8a8f98', ink, 2);
        x.beginPath(); x.roundRect(-30, -20, 60, 80, 6); x.fillStyle = '#F2EEE2'; x.fill(); x.lineWidth = 3.5; x.strokeStyle = ink; x.stroke();
        x.fillStyle = '#2a8a8c'; x.fillRect(-26, -16, 52, 16); ell(x, 0, 22, 12, 12, '#9aa2ae', ink, 2); x.fillStyle = 'rgba(20,16,24,.5)'; x.fillRect(-18, 42, 36, 5);
        x.restore();
      })],
    },
  });
  c.spec.rig = { ...c.spec.rig, plantLegs: .02 };
  return c;
}

// 2D-реквизит в координатах фигуры
// фонарик: ручка от кисти h по направлению dir (единичный, экранный), on — светится ли линза
export function flashlight(x, h, dir, on, ink = '#141014') {
  const a = Math.atan2(dir[1], dir[0]);
  x.save(); x.translate(h[0], h[1]); x.rotate(a);
  x.beginPath(); x.roundRect(-34, -11, 74, 22, 6); x.fillStyle = '#2b2f38'; x.fill(); x.lineWidth = 5; x.strokeStyle = ink; x.stroke();
  x.beginPath(); x.roundRect(36, -17, 26, 34, 5); x.fillStyle = '#3c424e'; x.fill(); x.stroke();
  path(x, [[-26, -5], [30, -5]], 3, 'rgba(255,255,255,.22)');
  if (on) { x.beginPath(); x.ellipse(62, 0, 5, 15, 0, 0, TAU); x.fillStyle = '#fff6da'; x.fill(); }
  else { x.beginPath(); x.ellipse(62, 0, 4, 14, 0, 0, TAU); x.fillStyle = '#8a8f98'; x.fill(); }
  x.restore();
}
// планшет-клипборд: центр c, поворот a; page — сколько строк «записано» (0..1)
export function clipboard(x, c, a, page = .5, ink = '#141014') {
  x.save(); x.translate(c[0], c[1]); x.rotate(a);
  x.beginPath(); x.roundRect(-62, -84, 124, 168, 8); x.fillStyle = '#8a6a42'; x.fill(); x.lineWidth = 5.5; x.strokeStyle = ink; x.stroke();
  x.beginPath(); x.roundRect(-52, -66, 104, 140, 3); x.fillStyle = '#F2EEE2'; x.fill(); x.lineWidth = 3; x.stroke();
  const n = 7; for (let i = 0; i < n; i++) { const k = Math.min(1, Math.max(0, page * n - i)); if (k <= 0) break; path(x, [[-40, -44 + i * 16], [-40 + 78 * k, -44 + i * 16]], 3, 'rgba(40,50,90,.7)'); }
  x.beginPath(); x.roundRect(-26, -92, 52, 22, 5); x.fillStyle = '#b8bec8'; x.fill(); x.lineWidth = 4; x.stroke();
  x.restore();
}
export function pen(x, h, a, ink = '#141014') {
  x.save(); x.translate(h[0], h[1]); x.rotate(a);
  x.beginPath(); x.roundRect(-6, -6, 66, 12, 5); x.fillStyle = '#1d2a55'; x.fill(); x.lineWidth = 4; x.strokeStyle = ink; x.stroke();
  x.beginPath(); x.moveTo(-6, -5); x.lineTo(-20, 0); x.lineTo(-6, 5); x.closePath(); x.fillStyle = '#d9c38a'; x.fill(); x.stroke();
  x.restore();
}
