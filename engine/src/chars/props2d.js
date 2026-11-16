// props2d.js: плоские предметы в руках персонажа (рисуются в координатах фигуры, тем же контуром, что и герой).
// Передаются в позу: pose.held = [{ layer: 'front', draw: ctx => gun2D(ctx, {...}) }]
import { line } from './stickman.js';

const TAU = Math.PI * 2;

// двустволка сбоку (общий план). g: { x, y, ang (направление стволов, рад), stock (доворот ложа вокруг шарнира), sc }
// Локальные оси: +x вдоль стволов к дулу, начало — шарнир у переднего края коробки. На крупных планах — 3D (props/shotgun.js).
export function gun2D(x, g) {
  x.save(); x.translate(g.x, g.y); x.rotate(g.ang); x.scale(g.sc || 1, g.sc || 1); x.lineJoin = 'round'; x.lineCap = 'round';
  // stock + receiver (rotated by g.stock about the hinge)
  x.save(); x.rotate(g.stock || 0);
  // stock: pale tan in the lamp light, soft gradient, darker butt plate
  x.beginPath(); x.moveTo(-118, -17); x.bezierCurveTo(-190, -14, -300, -4, -395, 8); x.lineTo(-386, 120);
  x.bezierCurveTo(-320, 78, -230, 34, -150, 22); x.lineTo(-112, 20); x.closePath();
  const gs = x.createLinearGradient(-395, 0, -110, 0); gs.addColorStop(0, '#8D755A'); gs.addColorStop(.5, '#A48B6C'); gs.addColorStop(1, '#8F7556');
  x.fillStyle = gs; x.fill();
  const gs2 = x.createLinearGradient(0, -20, 0, 110); gs2.addColorStop(0, 'rgba(255,240,215,.22)'); gs2.addColorStop(.5, 'rgba(0,0,0,0)'); gs2.addColorStop(1, 'rgba(40,20,10,.3)');
  x.fillStyle = gs2; x.fill(); x.lineWidth = 2.5; x.strokeStyle = 'rgba(60,40,28,.55)'; x.stroke();
  x.beginPath(); x.moveTo(-395, 8); x.lineTo(-386, 120); x.lineWidth = 7; x.strokeStyle = '#5E4A3A'; x.stroke();
  // trigger guard + trigger
  x.beginPath(); x.ellipse(-78, 30, 38, 26, 0, 0, Math.PI); x.lineWidth = 5; x.strokeStyle = '#8A8A96'; x.stroke();
  line(x, [[-84, 22], [-92, 44]], 5, '#77777F');
  // receiver: grey steel block with lock plate, hammer and a few dark details
  x.beginPath(); x.moveTo(-128, -18); x.lineTo(-30, -22); x.lineTo(6, -20); x.lineTo(8, 22); x.lineTo(-60, 26); x.bezierCurveTo(-100, 26, -120, 24, -130, 18); x.closePath();
  const gr = x.createLinearGradient(0, -24, 0, 28); gr.addColorStop(0, '#B4B4BF'); gr.addColorStop(.45, '#8E8E9A'); gr.addColorStop(1, '#5E5E68');
  x.fillStyle = gr; x.fill(); x.lineWidth = 2.5; x.strokeStyle = '#3A3840'; x.stroke();
  x.fillStyle = '#4C4A52'; x.beginPath(); x.ellipse(-52, 4, 9, 9, 0, 0, TAU); x.fill(); x.beginPath(); x.ellipse(-12, 6, 5, 5, 0, 0, TAU); x.fill();
  // hammer spur
  x.beginPath(); x.moveTo(-70, -20); x.quadraticCurveTo(-92, -36, -112, -34); x.quadraticCurveTo(-96, -24, -88, -18); x.closePath(); x.fillStyle = '#6E6E78'; x.fill(); x.lineWidth = 2; x.strokeStyle = '#3A3840'; x.stroke();
  x.restore();
  // forend (dark wood) under the barrels
  x.beginPath(); x.roundRect(14, 4, 170, 19, 8); x.fillStyle = '#4A2F22'; x.fill();
  // barrels: black with a cold highlight along the top
  x.beginPath(); x.moveTo(2, -15); x.lineTo(536, -11); x.lineTo(538, 9); x.lineTo(2, 15); x.closePath();
  const gbr = x.createLinearGradient(0, -15, 0, 15); gbr.addColorStop(0, '#3B3F52'); gbr.addColorStop(.3, '#15131A'); gbr.addColorStop(.62, '#2A2B36'); gbr.addColorStop(1, '#0C0A0E');
  x.fillStyle = gbr; x.fill();
  line(x, [[30, -11], [520, -8]], 2.6, 'rgba(120,135,175,.75)');
  line(x, [[536, -11], [538, 9]], 4, '#3A3D4C');
  x.restore();
}
// точка на ружье (локальные координаты ружья) -> координаты фигуры: для кистей на цевье и у коробки
export const gun2DPoint = (g, lx, ly) => { const c = Math.cos(g.ang), s = Math.sin(g.ang); return [g.x + lx * c - ly * s, g.y + lx * s + ly * c]; };

// бутерброд напарника: хлеб с коркой, из-под него листья салата. (sx, sy) — центр ломтя
export function sandwich(x, sx, sy, C = { lettuce: '#74B82F', bread: '#EADAB2', crust: '#B4854E' }) {
  x.fillStyle = C.lettuce; x.strokeStyle = '#3E7D1A'; x.lineWidth = 2.5;
  for (const [lx, ly, lr] of [[-33, 20, 8], [-27, 31, 7], [35, 22, 8], [30, 32, 7]]) { x.beginPath(); x.arc(sx + lx, sy + ly, lr, 0, TAU); x.fill(); x.stroke(); }
  x.beginPath(); x.moveTo(sx - 31, sy - 28); x.quadraticCurveTo(sx - 36, sy - 40, sx - 20, sy - 38); x.lineTo(sx + 22, sy - 40); x.quadraticCurveTo(sx + 36, sy - 40, sx + 31, sy - 26);
  x.lineTo(sx + 30, sy + 20); x.quadraticCurveTo(sx + 2, sy + 40, sx - 30, sy + 22); x.closePath();
  x.fillStyle = C.bread; x.fill(); x.lineWidth = 6; x.strokeStyle = C.crust; x.stroke();
  x.fillStyle = 'rgba(190,160,110,.35)'; for (let k = 0; k < 16; k++) { const a = k * 2.4, d = 5 + (k * 7) % 22; x.fillRect(sx + Math.cos(a) * d - 1.2, sy - 2 + Math.sin(a) * d - 1.2, 2.4, 2.4); }
}
// золотой самородок в пальцах: плоский овал (блик рисуется отдельно: vfx/muzzleFlash.js glint)
export function nugget2D(x, cx, cy, col = '#F2C530') { x.fillStyle = col; x.beginPath(); x.ellipse(cx, cy, 10, 8, .5, 0, 6.3); x.fill(); }

// спинка стула за сидящим героем (канал лонгов, «Стикман Нуар»): красный бархат в деревянной раме, cel-тени, контур туши.
// Рисуется в координатах фигуры (ед. фигуры; начало — как у героя), ДО героя: actor.with(ctx => chairBack(ctx, {...})) или в
// своём преобразовании. Посадка: бёдра на подушке — seatY = точка сиденья героя (pins.seat[1], у presetsLong -300).
// o: { x = 0, seatY = -300, w = 400 (ширина спинки), h = 430 (от сиденья до верха), light = 1 (свет справа; -1 слева),
//      seat = true (подушка сиденья), legs = 300 (длина ножек до пола; 0 — без ножек), back = false (вид сзади: спинка ПЕРЕД героем),
//      col: { frame, velvet, shade, hi, ink }, lw = 7.5 }
export function chairBack(x, o = {}) {
  const { x: cx = 0, seatY: y0 = -300, w = 400, h = 430, light = 1, seat = true, legs = 300, back = false, lw = 7.5 } = o;
  const C = { frame: '#4A1518', velvet: '#8E2329', shade: '#6A161C', hi: 'rgba(255,170,140,.32)', ink: '#1C1418', wood: '#3A1F18', ...(o.col || {}) };
  const L = cx - w / 2, R = cx + w / 2, top = y0 - h;
  const outline = (ins = 0) => {                                                   // спинка: арка сверху, чуть сужается к сиденью
    x.beginPath(); x.moveTo(L + 14 + ins, y0 + 30); x.lineTo(L + ins, top + w * .26);
    x.bezierCurveTo(L + ins, top + ins * .6, cx - w * .18, top + ins, cx, top + ins);
    x.bezierCurveTo(cx + w * .18, top + ins, R - ins, top + ins * .6, R - ins, top + w * .26);
    x.lineTo(R - 14 - ins, y0 + 30); x.closePath();
  };
  x.save(); x.lineJoin = 'round'; x.lineCap = 'round';
  if (legs > 0 && !back) for (const sx of [-1, 1]) {                               // ножки (задние, тёмное дерево)
    x.beginPath(); x.moveTo(cx + sx * (w / 2 - 34), y0 + 40); x.lineTo(cx + sx * (w / 2 - 22), y0 + legs); x.lineWidth = 22; x.strokeStyle = C.ink; x.stroke();
    x.lineWidth = 13; x.strokeStyle = C.wood; x.stroke();
  }
  outline(); x.fillStyle = C.frame; x.fill();                                      // рама
  if (!back) {
    x.save(); outline(26); x.clip();                                               // бархат с cel-тенью на дальней от света стороне
    x.fillStyle = C.velvet; x.fillRect(L - 50, top - 50, w + 100, h + 120);
    x.beginPath(); x.ellipse(cx + light * w * .26, top + h * .38, w * .62, h * .78, 0, 0, Math.PI * 2); x.rect(L - 60, top - 60, w + 120, h + 140);
    x.fillStyle = C.shade; x.fill('evenodd');
    x.restore();
    outline(26); x.lineWidth = lw * .6; x.strokeStyle = C.ink; x.stroke();
    x.beginPath(); x.moveTo(cx - light * w * .05, top + 14); x.quadraticCurveTo(cx + light * w * .3, top + 18, cx + light * (w / 2 - 12), top + w * .24);
    x.lineWidth = 10; x.strokeStyle = C.hi; x.stroke();                            // блик рамы со стороны света
  } else {
    x.save(); outline(); x.clip(); x.beginPath(); x.ellipse(cx + light * w * .3, top + h * .4, w * .6, h * .8, 0, 0, Math.PI * 2); x.rect(L - 60, top - 60, w + 120, h + 140);
    x.fillStyle = 'rgba(0,0,0,.28)'; x.fill('evenodd'); x.restore();
  }
  outline(); x.lineWidth = lw; x.strokeStyle = C.ink; x.stroke();
  if (seat && !back) {                                                             // подушка сиденья под бёдрами
    x.beginPath(); x.roundRect(L - 6, y0 - 12, w + 12, 66, 26); x.fillStyle = C.velvet; x.fill();
    x.save(); x.clip(); x.fillStyle = C.shade; x.fillRect(L - 10, y0 + 22, w + 20, 40); x.restore();
    x.lineWidth = lw; x.strokeStyle = C.ink; x.stroke();
  }
  x.restore();
}
