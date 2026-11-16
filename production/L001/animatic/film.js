// animatic/film.js: полный аниматик L001 (все планы шотлиста, 1920x1080, 30 к/с) — проверка ритма до дорогой покадровой анимации.
// Тайминг — timing.json (make_timing.mjs: старт плана = первое слово его текста в черновом голосе).
// План = фон с кадрированием по крупности + движение камеры из шотлиста + метка события; герои — полупрозрачные
// таблички-силуэты «JENSEN — speaks»; шаблоны (карточки, титры, цифры, карты, доски, документы, подписи) — настоящие.
// Параметры (--set): debug=0 — без отладочной полосы; f0, f1 — диапазон кадров (рендер кусками).
// Перед сборкой: pwsh prep_assets.ps1 (JPG-плейты и кадры пути коробки в tmp/, модуль boxframes.js).
import { templates as T } from 'engine';
import timing from './timing.json';
import BOXF from './boxframes.js';
import { NUMBERS, MAPS, BOARDS, DOCS, LOWER, YEAR, SPLITS, TRANS } from './conf.js';
import p_restaurant from './tmp/restaurant.jpg';
import p_restaurant_reverse from './tmp/restaurant_reverse.jpg';
import p_host_office from './tmp/host_office.jpg';
import p_bg_singapore_street from './tmp/bg_singapore_street.jpg';
import p_bg_car_interior from './tmp/bg_car_interior.jpg';
import p_bg_washington_cold from './tmp/bg_washington_cold.jpg';
import p_bg_washington_reverse from './tmp/bg_washington_reverse.jpg';
import p_bg_beijing_office from './tmp/bg_beijing_office.jpg';
import p_bg_nvidia_office_dry from './tmp/bg_nvidia_office_dry.jpg';
import p_bg_nvidia_office_reverse from './tmp/bg_nvidia_office_reverse.jpg';
import p_bg_diner_day from './tmp/bg_diner_day.jpg';
import p_bg_kentucky_day from './tmp/bg_kentucky_day.jpg';
import p_bg_dorm_room from './tmp/bg_dorm_room.jpg';
import p_bg_megaspeed_office from './tmp/bg_megaspeed_office.jpg';
import p_bg_megaspeed_reverse from './tmp/bg_megaspeed_reverse.jpg';
import p_bg_taipei_bar_dry from './tmp/bg_taipei_bar_dry.jpg';
import p_bg_event_hall from './tmp/bg_event_hall.jpg';
import p_bg_event_hall_reverse from './tmp/bg_event_hall_reverse.jpg';
import p_bg_customs_gate from './tmp/bg_customs_gate.jpg';
import p_bg_newsroom from './tmp/bg_newsroom.jpg';
import p_bg_front_door from './tmp/bg_front_door.jpg';
import p_bg_desk_topdown from './tmp/bg_desk_topdown.jpg';

const W = 1920, H = 1080, FPS = 30;
const URLS = { restaurant: p_restaurant, restaurant_reverse: p_restaurant_reverse, host_office: p_host_office, bg_singapore_street: p_bg_singapore_street,
  bg_car_interior: p_bg_car_interior, bg_washington_cold: p_bg_washington_cold, bg_washington_reverse: p_bg_washington_reverse, bg_beijing_office: p_bg_beijing_office,
  bg_nvidia_office_dry: p_bg_nvidia_office_dry, bg_nvidia_office_reverse: p_bg_nvidia_office_reverse, bg_diner_day: p_bg_diner_day, bg_kentucky_day: p_bg_kentucky_day,
  bg_dorm_room: p_bg_dorm_room, bg_megaspeed_office: p_bg_megaspeed_office, bg_megaspeed_reverse: p_bg_megaspeed_reverse, bg_taipei_bar_dry: p_bg_taipei_bar_dry,
  bg_event_hall: p_bg_event_hall, bg_event_hall_reverse: p_bg_event_hall_reverse, bg_customs_gate: p_bg_customs_gate, bg_newsroom: p_bg_newsroom,
  bg_front_door: p_bg_front_door, bg_desk_topdown: p_bg_desk_topdown };

// точки героев на плейтах (доли кадра): a, b — два места для людей, prop — предмет для вставок
const SPOTS = {
  restaurant: { a: [.13, .66], b: [.87, .66], prop: [.48, .72] },
  restaurant_reverse: { a: [.56, .74], b: [.2, .66], prop: [.17, .86] },
  host_office: { a: [.6, .5], b: [.4, .55], prop: [.5, .5] },
  bg_singapore_street: { a: [.2, .68], b: [.73, .64], prop: [.73, .6] },
  bg_car_interior: { a: [.3, .58], b: [.7, .58], prop: [.48, .8] },
  bg_washington_cold: { a: [.5, .55], b: [.22, .62], prop: [.37, .72] },
  bg_washington_reverse: { a: [.62, .55], b: [.3, .6], prop: [.6, .42] },
  bg_beijing_office: { a: [.5, .55], b: [.25, .62], prop: [.68, .76] },
  bg_nvidia_office_dry: { a: [.5, .52], b: [.25, .62], prop: [.52, .66] },
  bg_nvidia_office_reverse: { a: [.25, .5], b: [.72, .52], prop: [.68, .84] },
  bg_diner_day: { a: [.12, .62], b: [.88, .62], prop: [.5, .78] },
  bg_kentucky_day: { a: [.55, .6], b: [.3, .62], prop: [.52, .68] },
  bg_dorm_room: { a: [.22, .6], b: [.8, .6], prop: [.62, .76] },
  bg_megaspeed_office: { a: [.28, .62], b: [.62, .62], prop: [.82, .56] },
  bg_megaspeed_reverse: { a: [.72, .6], b: [.36, .55], prop: [.36, .42] },
  bg_taipei_bar_dry: { a: [.25, .6], b: [.72, .6], prop: [.5, .55] },
  bg_event_hall: { a: [.52, .55], b: [.3, .85], prop: [.55, .32] },
  bg_event_hall_reverse: { a: [.35, .78], b: [.78, .75], prop: [.5, .45] },
  bg_customs_gate: { a: [.68, .58], b: [.35, .66], prop: [.72, .62] },
  bg_newsroom: { a: [.3, .66], b: [.66, .62], prop: [.9, .26] },
  bg_front_door: { a: [.63, .55], b: [.45, .62], prop: [.76, .3] },
  bg_desk_topdown: { a: [.5, .5], b: [.5, .5], prop: [.55, .5] },
  box: { a: [.4, .6], b: [.62, .6], prop: [.5, .55] },
};
const PROP_AT = { 20: [.6, .42], 36: [.8, .32], 74: [.6, .42], 90: [.52, .66], 105: [.36, .42], 112: [.82, .56], 127: [.36, .42], 139: [.52, .55],
  149: [.5, .55], 156: [.25, .62], 180: [.72, .62], 205: [.48, .3], 239: [.6, .42], 241: [.3, .7], 248: [.3, .7], 271: [.66, .62], 281: [.88, .36], 57: [.55, .32] };
const LOCP = { 'L01-restaurant': ['restaurant', 'restaurant_reverse'], 'L02-sg-street': ['bg_singapore_street'], 'L03-host-office': ['host_office'],
  'L04-washington': ['bg_washington_cold', 'bg_washington_reverse'], 'L05-beijing': ['bg_beijing_office'], 'L06-nvidia-office': ['bg_nvidia_office_dry', 'bg_nvidia_office_reverse'],
  'L07-dennys': ['bg_diner_day'], 'L08-kentucky': ['bg_kentucky_day'], 'L09-megaspeed': ['bg_megaspeed_office', 'bg_megaspeed_reverse'],
  'L10-taipei-bar': ['bg_taipei_bar_dry'], 'L11-event-hall': ['bg_event_hall', 'bg_event_hall_reverse'], 'L12-customs': ['bg_customs_gate'],
  'L13-newsroom': ['bg_newsroom'], 'L14-front-door': ['bg_front_door'] };
// новые плейты, которых ещё нет: [чем заменить в аниматике, подпись]
const NEWP = { 'L15-relatives': ['bg_dorm_room', "NEW PLATE L15: relatives' porch (placeholder)"], 'L16-dennys-kitchen': ['bg_diner_day', "NEW PLATE L16: Denny's dish pit (placeholder)"],
  'L17-warehouse': ['bg_megaspeed_reverse', 'NEW PLATE L17: Nvidia warehouse, blocked H20 pallets (placeholder)'],
  'L18-closed-room': ['bg_washington_reverse', 'NEW PLATE L18: windowless closed room, round table (placeholder)'], 'L19-trading-desk': ['bg_newsroom', 'NEW PLATE L19: trading desk, red tickers (placeholder)'] };
const NAMES = [[/пуст/, null], [/юный Дженсен/, 'YOUNG JENSEN'], [/Дженсен-1993/, 'JENSEN (1993)'], [/Дженсен на ТВ/, 'JENSEN (on TV)'], [/силуэт/, 'JENSEN (silhouette)'],
  [/Дженсен/, 'JENSEN'], [/Алис/, 'ALICE'], [/ведущ/, 'HOST'], [/агенты у двери/, 'AGENT · AGENT 2'], [/агенты/, 'AGENT · AGENT 2'], [/агент 2/, 'AGENT 2'], [/агент/, 'AGENT'],
  [/тётя/, 'AUNT'], [/дядя/, 'UNCLE'], [/сосед/, 'ROOMMATE'], [/официантка/, 'WAITRESS'], [/Крис/, 'CHRIS'], [/трое/, 'JENSEN · CHRIS · CURTIS'],
  [/двое за столом/, 'JENSEN · ALICE'], [/инвестор/, 'INVESTOR'], [/учёный/, 'CUSTOMER'], [/продавец/, 'SALESMAN'], [/очередь/, 'SCIENTISTS'],
  [/помощник 2/, 'AIDE 2'], [/помощник 1/, 'AIDE'], [/помощник/, 'AIDE'], [/сенатор/, 'SENATOR'], [/Минторга/, 'COMMERCE'], [/Минюста/, 'JUSTICE'],
  [/конгрессмен/, 'CONGRESSMAN'], [/чиновник/, 'OFFICIAL'], [/двое офицеров/, 'OFFICER · OFFICER 2'], [/офицер 2/, 'OFFICER 2'], [/офицер/, 'OFFICER'],
  [/клерк/, 'CLERK'], [/сотрудник/, 'STAFFER'], [/покупатель/, 'RENTER'], [/представитель/, 'REP'], [/фанат 2/, 'FAN 2'], [/фанат/, 'FAN'],
  [/фотограф/, 'PHOTOGRAPHER'], [/толп/, 'CROWD'], [/бухгалтер 2/, 'ACCOUNTANT 2'], [/бухгалтер/, 'ACCOUNTANT'], [/банкиры/, 'BANKER · BANKER 2'],
  [/банкир 2/, 'BANKER 2'], [/банкир 1/, 'BANKER'], [/водитель/, 'DRIVER'], [/таможенник/, 'CUSTOMS'], [/инспектор/, 'INSPECTOR'], [/гид/, 'GUIDE'],
  [/редактор/, 'EDITOR'], [/репортёр/, 'REPORTER'], [/хозяин/, 'CITIZEN'], [/член совета/, 'BOARD'], [/пограничник/, 'IMMIGRATION'],
  [/пресс-секретарь/, 'SPOKESMAN'], [/аналитик 2/, 'ANALYST 2'], [/аналитик/, 'ANALYST'], [/ассистент/, 'ASSISTANT']];

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k;
const ease = k => .5 - .5 * Math.cos(Math.PI * clamp(k));
const img = url => { const i = new Image(); i.src = url; i.style.display = 'none'; document.body.appendChild(i); return i; };
const ok = i => i && i.complete && i.naturalWidth > 0;

const sizeOf = f => /^сверхкрупно/.test(f) ? 'xcu' : /^крупно/.test(f) ? 'cu' : /^средний/.test(f) ? 'ms' : /^вставка/.test(f) ? 'ins'
  : /^обратная/.test(f) ? 'rev' : /^сверху/.test(f) ? 'top' : /^POV/.test(f) ? 'pov' : 'ws';
const ZOOM = { ws: 1.04, rev: 1.04, ms: 1.6, cu: 1.95, xcu: 2.6, ins: 2.3, pov: 2.2, top: 1.04 };
const FIG_H = { ws: 170, rev: 190, ms: 300, cu: 420, xcu: 520, ins: 0, pov: 200, top: 0 };
const speakerOf = s => (s.text.match(/^([A-Z][A-Z0-9 ]{1,20}):/) || [])[1] || null;
const nameOf = s => { const rest = s.framing.replace(/^(\S+)\s*/, ''); for (const [re, n] of NAMES) if (re.test(rest)) return n; return null; };

// движение камеры из колонки шотлиста -> функция t -> { z, dx, dy, rot, sh }
const outExpo = k => (k >= 1 ? 1 : k <= 0 ? 0 : 1 - Math.pow(2, -10 * k)), outCubic = k => 1 - Math.pow(1 - clamp(k), 3);
const inOutExpo = k => (k <= 0 ? 0 : k >= 1 ? 1 : k < .5 ? Math.pow(2, 20 * k - 10) / 2 : (2 - Math.pow(2, -20 * k + 10)) / 2);
const outBack = k => { const c1 = 1.9, c3 = c1 + 1; k = clamp(k); return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };
const SNAP_Z = .13, SNAP_T = 5 / 30;
// грамматика камеры (колонка «камера»): «статично» — настоящая остановка; «рывок на «слово»» — наезд с торможением, остановка,
// рывок-зум 13 % за 5 кадров на ударном слове (s.snap из make_timing); «вип-пан» — остановка, вип со смазом на втором говорящем;
// панорама/проезд/подъём/… — плавный проход с остановкой на последних 15 %
function camOf(s, d) {
  const c = s.camera.toLowerCase();
  const kind = /вип-пан/.test(c) ? 'whip' : /статично/.test(c) ? 'static' : /панорам|проезд|пролёт|подъём|опускани|прокрутк|поворот|наклон|проход/.test(c) ? 'pan' : /рывок/.test(c) ? 'snap' : 'push';
  const settle = Math.min(.8, Math.max(.3, d * .35)), pull = /отъезд/.test(c), kick = /толчок|встряска/.test(c);
  let dx = 0, dy = 0;
  if (kind === 'pan') {
    dx = /влево/.test(c) ? -.08 : /подъём|опускани|прокрутк|наклон/.test(c) ? 0 : .08;
    if (/подъём|прокрутка вверх/.test(c)) dy = -.06; if (/опускани|наклон вниз|прокрутка вниз/.test(c)) dy = .06;
  }
  const ts = s.snap ?? d * .4;
  // хук и финал — пики энергии: вместо мёртвой остановки камера ползёт (0.25 %/кадр), рывок на этом фоне всё равно читается
  const hot = s.ch === 0 || s.ch === 1 || s.ch === 10 || (s.ch === 9 && s.n >= 270), creep = hot && kind !== 'static' ? .075 : 0;
  return t => {
    let z = 1, ox = 0, oy = 0;
    if (kind === 'pan') { const k = ease(t / (d * .85)); z = 1 + .03 * k; ox = dx * (k - .5) * (hot ? 1.8 : 1); oy = dy * (k - .5) * (hot ? 1.8 : 1); }
    else if (kind !== 'static') { const k = outCubic(t / settle); z = (pull ? lerp(1.08, 1, k) : lerp(1, 1.03, k)) * (1 + creep * Math.max(0, t - settle)); ox = hot ? .02 * Math.sin(t * 1.3) : 0; }
    const sz = s.snap != null && kind !== 'static' ? 1 + SNAP_Z * outExpo((t - s.snap) / SNAP_T) : 1;
    const sh = kick && t > ts && t < ts + .35 ? 14 * Math.sin((t - ts) * 60) * (1 - (t - ts) / .35) : 0;
    return { z: z * sz, snapZ: sz, dx: ox, dy: oy, rot: 0, sh, kind };
  };
}

export default {
  fps: FPS, size: [W, H],
  options: { debug: '1', f0: '0', f1: '', sheet: '0' },
  setup(stage, opt) {
    const debug = opt.debug !== '0' && opt.debug !== 'false';
    const I = {}; for (const k in URLS) I[k] = img(URLS[k]);
    const BOX = BOXF.map(img);
    const blurred = {};
    const blurOf = k => { if (blurred[k]) return blurred[k]; const im = I[k]; if (!ok(im)) return im;
      const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); x.filter = 'blur(3px)'; x.drawImage(im, -6, -6, W + 12, H + 12); return (blurred[k] = c); };

    // кто где сидит: имя -> точка (a/b) в пределах плейта, по порядку первого появления
    const seat = {};
    const spotFor = (plate, name) => { const m = (seat[plate] ||= {}); if (!(name in m)) m[name] = Object.keys(m).length % 2 ? 'b' : 'a'; return SPOTS[plate]?.[m[name]] || [.5, .55]; };

    // ---------- рисование ----------
    function plateView(Z, c) { const vw = W / Z, vh = H / Z; return { Z, l: clamp(c[0] * W - vw / 2, 0, W - vw), tp: clamp(c[1] * H - vh / 2, 0, H - vh) }; }
    function drawImg(ctx, im, v, flip = false, tint = null) {
      if (!im || (im.tagName === 'IMG' && !ok(im))) { ctx.fillStyle = '#10141f'; ctx.fillRect(0, 0, W, H); return; }
      const sx = (im.naturalWidth || im.width) / W;
      ctx.save(); if (flip) { ctx.translate(W, 0); ctx.scale(-1, 1); }
      ctx.drawImage(im, v.l * sx, v.tp * sx, W / v.Z * sx, H / v.Z * sx, 0, 0, W, H); ctx.restore();
      if (tint) { ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = tint; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    }
    const toScreen = (v, p) => [(p[0] * W - v.l) * v.Z, (p[1] * H - v.tp) * v.Z];
    function figure(ctx, x, y, h, label, speaking) {         // полупрозрачный силуэт с табличкой
      if (h <= 0) return; h = Math.min(h, 560); ctx.save();
      const r = h * .14; ctx.globalAlpha = .55; ctx.fillStyle = '#0a0c14'; ctx.strokeStyle = speaking ? '#ffd48a' : '#f1e6cc'; ctx.lineWidth = Math.max(2, h / 90);
      ctx.beginPath(); ctx.arc(x, y - h * .36, r, 0, 6.283); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.roundRect(x - h * .2, y - h * .2, h * .4, h * .55, h * .12); ctx.fill(); ctx.stroke();
      ctx.globalAlpha = .85; ctx.font = `700 ${Math.round(clamp(h / 9, 22, 34))}px Bahnschrift, 'Segoe UI', sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const txt = label + (speaking ? ' — speaks' : ''), tw = ctx.measureText(txt).width + 28, ly = Math.min(H - 70, y + h * .45);
      ctx.fillStyle = 'rgba(8,8,14,.78)'; ctx.beginPath(); ctx.roundRect(x - tw / 2, ly - 22, tw, 44, 8); ctx.fill();
      ctx.fillStyle = speaking ? '#ffd48a' : '#f1e6cc'; ctx.fillText(txt, x, ly + 1); ctx.restore();
    }
    function eventMark(ctx, x, y, t, d) {                  // событие плана: янтарное кольцо-импульс
      const k = (t - Math.min(d * .4, 1.2)) / .6; if (k < 0 || k > 1) return;
      ctx.save(); ctx.globalAlpha = .8 * (1 - k); ctx.strokeStyle = '#f2a94e'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(x, y, 30 + 110 * k, 0, 6.283); ctx.stroke(); ctx.restore();
    }
    function tag3d(ctx, text) {
      ctx.save(); ctx.font = `700 34px Bahnschrift, 'Segoe UI', sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const tw = ctx.measureText(text).width + 50; ctx.fillStyle = 'rgba(10,10,18,.8)'; ctx.beginPath(); ctx.roundRect(W / 2 - tw / 2, 40, tw, 62, 31); ctx.fill();
      ctx.strokeStyle = '#7fb8ff'; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = '#cfe4ff'; ctx.fillText(text, W / 2, 72); ctx.restore();
    }
    function viewfinder(ctx, t) {
      ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 5; const m = 120, L = 90;
      for (const [x, y, sx, sy] of [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]]) { ctx.beginPath(); ctx.moveTo(x, y + sy * L); ctx.lineTo(x, y); ctx.lineTo(x + sx * L, y); ctx.stroke(); }
      ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(W / 2 - 40, H / 2); ctx.lineTo(W / 2 + 40, H / 2); ctx.moveTo(W / 2, H / 2 - 40); ctx.lineTo(W / 2, H / 2 + 40); ctx.stroke();
      if (Math.floor(t * 2) % 2 === 0) { ctx.fillStyle = '#e33'; ctx.beginPath(); ctx.arc(m + 30, m + 40, 12, 0, 6.283); ctx.fill(); }
      ctx.fillStyle = '#fff'; ctx.font = `700 30px 'Courier New', monospace`; ctx.fillText('REC', m + 52, m + 51); ctx.restore();
    }
    function sheetLabel(ctx, s) {          // для контактных листов: крупная подпись, читается в миниатюре
      const mm = Math.floor(s.start / 60), ss = (s.start % 60).toFixed(1).padStart(4, '0');
      ctx.save(); ctx.fillStyle = 'rgba(0,0,0,.72)'; ctx.fillRect(0, 0, W, 190); ctx.textBaseline = 'middle';
      ctx.font = "700 84px 'Segoe UI', sans-serif"; ctx.fillStyle = '#ffd48a'; ctx.fillText(`#${s.n}  ${mm}:${ss}  ${s.dur.toFixed(1)}s`, 30, 56);
      ctx.font = "600 60px 'Segoe UI', sans-serif"; ctx.fillStyle = '#fff'; ctx.fillText(s.framing.slice(0, 44), 30, 140); ctx.restore();
    }
    function debugStrip(ctx, s) {
      if (!debug) return;
      const mm = Math.floor(s.start / 60), ss = (s.start % 60).toFixed(1).padStart(4, '0');
      const l1 = `CH ${s.ch} · #${s.n} · ${s.framing}`, l2 = `${mm}:${ss} · ${s.dur.toFixed(1)} s · ${s.loc}`, l3 = s.event.length > 95 ? s.event.slice(0, 94) + '…' : s.event;
      ctx.save(); ctx.font = `600 22px 'Segoe UI', sans-serif`; ctx.textBaseline = 'middle';
      const w = Math.max(ctx.measureText(l1).width, ctx.measureText(l2).width, ctx.measureText(l3).width) + 30;
      ctx.fillStyle = 'rgba(0,0,0,.62)'; ctx.fillRect(16, H - 112, w, 98);
      ctx.fillStyle = '#ffd48a'; ctx.fillText(l1, 30, H - 90); ctx.fillStyle = '#ddd'; ctx.fillText(l2, 30, H - 62); ctx.fillStyle = '#9fb3c8'; ctx.fillText(l3, 30, H - 34);
      ctx.restore();
    }

    // нарисованные заглушки 3D и шуток
    function kitchen(ctx, s, t, d) {
      ctx.fillStyle = '#141018'; ctx.fillRect(0, 0, W, H);
      const g = ctx.createRadialGradient(W / 2, H * .2, 0, W / 2, H * .2, H); g.addColorStop(0, 'rgba(242,169,78,.35)'); g.addColorStop(1, 'rgba(242,169,78,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.save(); ctx.strokeStyle = '#f1e6cc'; ctx.fillStyle = 'rgba(241,230,204,.15)'; ctx.lineWidth = 4;
      const mon = /монитор/.test(s.framing), one = /один повар/.test(s.framing), many = !mon && !one;
      if (mon) {
        ctx.fillStyle = '#222'; ctx.fillRect(560, 220, 800, 560); ctx.fillStyle = '#123'; ctx.fillRect(600, 260, 720, 480);
        const k = clamp((t - d * .35) / .6); ctx.fillStyle = `rgba(255,${180 - 80 * k},60,${k})`; ctx.beginPath();
        for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283, r = (i % 2 ? 90 : 210) * k; ctx.lineTo(960 + Math.cos(a) * r, 500 + Math.sin(a) * r); } ctx.fill();
      } else {
        const n = one ? 1 : Math.round(lerp(4, 30, ease(t / d))), cell = W / (n + 1);
        for (let j = 0; j < (one ? 1 : Math.ceil(n * .5)); j++) for (let i = 0; i < n; i++) {
          const x = cell * (i + 1), y = one ? 640 : 300 + j * cell * 1.1, h = one ? 360 : cell * .9; if (y > H + h) continue;
          ctx.beginPath(); ctx.arc(x, y - h * .38, h * .12, 0, 6.283); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, y - h * .26); ctx.lineTo(x, y + h * .1); ctx.stroke();
          const fl = many ? Math.sin(t * 8 + i * .7 + j) * h * .1 : 0; ctx.beginPath(); ctx.ellipse(x + h * .22, y - h * .12 + fl, h * .14, h * .04, 0, 0, 6.283); ctx.stroke();
        }
        if (one) for (let p = 0; p < Math.floor(t * 1.5); p++) { ctx.beginPath(); ctx.ellipse(1250 + p * 110, 760, 46, 14, 0, 0, 6.283); ctx.stroke(); }
      }
      ctx.restore();
    }
    function conveyor(ctx, t, d) {
      ctx.fillStyle = '#0f1420'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#2a2f3a'; ctx.fillRect(0, 560, W, 160); ctx.fillStyle = '#1a1e26';
      for (let x = -((t * 300) % 80); x < W; x += 80) ctx.fillRect(x, 560, 6, 160);
      for (let i = 0; i < 7; i++) {
        const x = ((i * 330 + t * 300) % (W + 300)) - 150, sz = 200 - i * 22; ctx.fillStyle = '#3c6b4a'; ctx.strokeStyle = '#f1e6cc'; ctx.lineWidth = 4;
        ctx.fillRect(x - sz / 2, 560 - sz, sz, sz * .9); ctx.strokeRect(x - sz / 2, 560 - sz, sz, sz * .9);
        if (x > W * .5) { ctx.save(); ctx.translate(x, 560 - sz / 2); ctx.rotate(-.15); ctx.strokeStyle = '#c8312b'; ctx.fillStyle = '#c8312b'; ctx.lineWidth = 6;
          ctx.strokeRect(-sz * .45, -sz * .18, sz * .9, sz * .36); ctx.font = `900 ${Math.round(sz * .26)}px Bahnschrift, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('STOP', 0, 2); ctx.restore(); }
      }
    }
    function joke(ctx, s, t, d) {
      ctx.fillStyle = '#1b2238'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#e8dbbb'; ctx.strokeStyle = '#0b0910'; ctx.lineWidth = 8;
      if (/пекарн/.test(s.framing)) {
        ctx.fillStyle = '#5a3622'; ctx.fillRect(760, 260, 400, 640); ctx.strokeRect(760, 260, 400, 640);
        const n = Math.floor(lerp(2, 14, ease(t / d)));
        for (let i = 0; i < n; i++) { ctx.fillStyle = '#e8dbbb'; const x = 700 + (i % 5) * 110, y = 840 - Math.floor(i / 5) * 120; ctx.beginPath(); ctx.roundRect(x, y, 100, 110, 20); ctx.fill(); ctx.stroke(); }
        ctx.fillStyle = `rgba(255,255,255,${.4 * ease(t / d)})`; ctx.beginPath(); ctx.arc(960, 600, 400 * ease(t / d), 0, 6.283); ctx.fill();
      } else {
        ctx.fillStyle = '#0d1322'; ctx.fillRect(560, 200, 800, 560); ctx.strokeRect(560, 200, 800, 560);
        ctx.fillStyle = '#ffd48a'; ctx.fillRect(600, 240, 720, 480);
        ctx.fillStyle = '#c8312b'; ctx.fillRect(880, 360, 160, 220); ctx.strokeRect(880, 360, 160, 220);
        if (/ребён/.test(s.framing)) { ctx.fillStyle = 'rgba(255,240,170,.5)'; ctx.beginPath(); ctx.moveTo(320, 820); ctx.lineTo(880, 380); ctx.lineTo(1040, 580); ctx.fill();
          ctx.strokeStyle = '#e8dbbb'; ctx.beginPath(); ctx.arc(300, 760, 50, 0, 6.283); ctx.stroke(); }
      }
      tag3d(ctx, 'T-JOKE (flat): ' + s.event.slice(0, 60));
    }

    // ---------- один план ----------
    function content(ctx, s, t) {
      const d = s.dur, sz = sizeOf(s.framing), cam = camOf(s, d)(t), sp = speakerOf(s);
      const settleDur = Math.min(1.2, Math.max(.4, d * .35));            // шаблон доезжает и стоит, дальше — рывок
      const snapWrap = f => { ctx.save(); if (cam.snapZ !== 1) { ctx.translate(W / 2, H / 2); ctx.scale(cam.snapZ, cam.snapZ); ctx.translate(-W / 2, -H / 2); } f(); ctx.restore(); };
      ctx.save();
      switch (s.loc) {
        case 'T-card': {
          const q = (s.event.match(/«([^»]+)»/) || [])[1] || s.spoken, len = q.length;
          const size = len > 60 ? 64 : len > 40 ? 76 : 96, cps = Math.max(15, len / Math.max(.3, d * .6 - .2));   // дописана к 60% плана
          const last = (q.match(/([A-Za-z']+)[^A-Za-z']*$/) || [])[1];
          T.blackCard(ctx, t, { text: q, dur: 1e6, doneBy: (d * .6) / 1e6, at: .2, cps, size, underline: last });   // карточка стоит: без наезда
          break;
        }
        case 'T-title': T.chapterTitle(ctx, t, { label: `CHAPTER ${s.ch}`, title: s.chTitle, dur: d, at: .03, sweepAt: d * .55 }); break;
        case 'T-number': { const o = NUMBERS[s.n](d); if (o.countDur != null && o.at + o.countDur > d * .5) o.countDur = Math.max(.3, d * .5 - o.at); snapWrap(() => T.bigNumber(ctx, t, { dur: settleDur, ...o })); break; }   // отсчёт кончается к половине плана
        case 'T-map': T.map(ctx, t, { dur: d, ...MAPS[s.n](d) }); break;
        case 'T-board': T.board(ctx, t, { dur: d, ...BOARDS[s.n](d) }); break;
        case 'T-doc': snapWrap(() => T.document(ctx, t, { dur: settleDur, ...DOCS[s.n](d) })); break;
        case 'T-joke': snapWrap(() => joke(ctx, s, t, d)); break;
        case 'T-desk': { const v = plateView(1.04 * cam.z, [.5 + cam.dx, .5 + cam.dy]); drawImg(ctx, I.bg_desk_topdown, v); deskProps(ctx, s, t, d); tag3d(ctx, 'T-DESK: ' + s.framing.replace(/^сверху /, '')); break; }
        case 'T-split': {                 // окна из SPLITS (conf.js): [плейт, центр, подпись героя] слева направо
          const P = (SPLITS[s.n] || (() => ({ panes: [['bg_washington_cold', [.37, .66], 'AIDE'], ['bg_beijing_office', [.6, .66], 'OFFICER']], tag: 'WASHINGTON | BEIJING' })))(d);
          const n = P.panes.length, pw = W / n;
          P.panes.forEach(([key, c, who], i) => {
            ctx.save(); ctx.beginPath(); ctx.rect(i * pw + 4, 0, pw - 8, H); ctx.clip(); ctx.translate(i * pw + pw / 2 - W / 2, 0);
            drawImg(ctx, I[key], plateView(1.6 * cam.z, c)); ctx.restore();
            if (who) figure(ctx, i * pw + pw / 2, H * .62, n > 2 ? 200 : 260, who, false);
          });
          ctx.fillStyle = '#000'; for (let i = 1; i < n; i++) ctx.fillRect(i * pw - 4, 0, 8, H);
          tag3d(ctx, 'T-SPLIT: ' + P.tag); break;
        }
        default: if (s.loc.startsWith('3D-')) threeD(ctx, s, t, d, sz, cam, sp); else plate(ctx, s, t, d, sz, cam, sp);
      }
      ctx.restore();
      if (!/^T-(card|title|number|doc|map|board)$/.test(s.loc) && !s.box) ambient(ctx, s, t);
      events(ctx, s, t, d, cam);
      if (/титр ролика/.test(s.framing)) videoTitle(ctx, t, d);
      // подписи
      const lt = LOWER[s.n]; if (lt) lt.forEach(([name, role, at], i) => T.lowerThird(ctx, t, { name, role, at: at * d, out: lt[i + 1] ? lt[i + 1][2] * d - .1 : null }));
      if (YEAR[s.n]) { ctx.save(); ctx.font = `bold 64px 'Courier New', monospace`; ctx.fillStyle = 'rgba(241,230,204,.9)'; ctx.globalAlpha = clamp(t / .4); ctx.fillText(YEAR[s.n], 90, 140); ctx.restore(); }
    }
    // переходы (conf.js TRANS) + засвет перед титром главы
    const IDX = new Map(timing.shots.map((x, i) => [x.n, i]));
    const prevOf = s => timing.shots[IDX.get(s.n) - 1], nextOf = s => timing.shots[IDX.get(s.n) + 1];
    function shot(ctx, s, t) {
      const d = s.dur, tr = TRANS[s.n], pv = prevOf(s);
      if ((tr === 'wipe' || tr === 'whip') && pv && t < .27) {
        const u = inOutExpo(t / .27);
        if (tr === 'wipe') {
          ctx.save(); content(ctx, pv, pv.dur - .001); ctx.restore();
          ctx.save(); ctx.beginPath(); ctx.rect(W * (1 - u), 0, W, H); ctx.clip(); ctx.translate(W * (1 - u), 0); content(ctx, s, t); ctx.restore();
          ctx.fillStyle = '#f2a94e'; ctx.fillRect(W * (1 - u) - 6, 0, 12, H);
        } else {
          for (let g = 0; g < 4; g++) { ctx.save(); ctx.globalAlpha = g ? .25 : 1; ctx.translate(-W * (u - g * .05), 0); content(ctx, pv, pv.dur - .001); ctx.restore(); }
          for (let g = 0; g < 4; g++) { ctx.save(); ctx.globalAlpha = g ? .25 : 1; ctx.translate(W * (1 - u + g * .05), 0); content(ctx, s, t); ctx.restore(); }
        }
      } else content(ctx, s, t);
      const nx = nextOf(s);
      if (nx && TRANS[nx.n] === 'white' && t > d - .25) { ctx.fillStyle = `rgba(255,252,240,${clamp((t - (d - .25)) / .25)})`; ctx.fillRect(0, 0, W, H); }
      if (tr === 'white' && t < .3) { ctx.fillStyle = `rgba(255,252,240,${1 - clamp(t / .3)})`; ctx.fillRect(0, 0, W, H); }
      if (tr === 'flash' && t < .2) { ctx.fillStyle = `rgba(255,255,255,${.95 * (1 - t / .2)})`; ctx.fillRect(0, 0, W, H); }
      if (tr === 'rewind' && t < .45) rewindFx(ctx, t);
      if (tr === 'speed') speedLines(ctx, t, s.snap ?? d * .4);
      debugStrip(ctx, s);
      if (opt.sheet === '1') sheetLabel(ctx, s);
    }
    function rewindFx(ctx, t) {
      let k = Math.floor(t * 30) * 7919 + 7; const r = () => (k = (k * 16807) % 2147483647) / 2147483647;
      ctx.save(); for (let i = 0; i < 14; i++) { const y = r() * H, h = 8 + r() * 40, sx = (r() - .5) * 160;
        ctx.drawImage(ctx.canvas, 0, y, W, h, sx, y, W, h); ctx.fillStyle = `rgba(255,255,255,${.08 + r() * .15})`; ctx.fillRect(0, y, W, 3); }
      ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.font = "700 72px 'Courier New', monospace"; ctx.fillText('◀◀', 90, 150); ctx.restore();
    }
    function speedLines(ctx, t, t0) {
      const u = (t - t0) / .45; if (u < 0 || u > 1) return;
      ctx.save(); ctx.strokeStyle = `rgba(255,240,200,${.7 * (1 - u)})`; ctx.lineWidth = 6;
      for (let i = 0; i < 64; i++) { const a = i / 64 * 6.283 + i * .37, r0 = 260 + 500 * u + (i % 5) * 40, r1 = r0 + 260 + (i % 3) * 120;
        ctx.beginPath(); ctx.moveTo(W / 2 + Math.cos(a) * r0, H / 2 + Math.sin(a) * r0); ctx.lineTo(W / 2 + Math.cos(a) * r1, H / 2 + Math.sin(a) * r1); ctx.stroke(); }
      ctx.restore();
    }
    // жизнь в кадре: дыхание света, пыль, дождь (заглушки тоже не стоят мёртвыми)
    function ambient(ctx, s, t) {
      const n = (Math.sin(t * 14.5) + Math.sin(t * 23.2 + 1.3) + Math.sin(t * 37 + 2.1)) / 3;
      ctx.save();
      if (n > 0) { ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = `rgba(255,190,120,${(.05 * n).toFixed(3)})`; }
      else { ctx.globalCompositeOperation = 'multiply'; const c = Math.round(255 + 40 * n); ctx.fillStyle = `rgb(${c},${c},${c})`; }
      ctx.fillRect(0, 0, W, H); ctx.restore();
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      for (let i = 0; i < 46; i++) { const sp = .3 + ((i * 37) % 70) / 100, ph = i * 1.7;
        const x = (((i * .6180339 + t * .012 * sp) % 1) * W + Math.sin(t * .7 * sp + ph) * 20), y = ((((i * .381966) - t * .02 * sp) % 1 + 1) % 1) * H;
        ctx.fillStyle = `rgba(255,214,150,${(.18 + .25 * Math.abs(Math.sin(t * 1.3 * sp + ph))).toFixed(3)})`; ctx.beginPath(); ctx.arc(x, y, 1.5 + (i % 4), 0, 6.283); ctx.fill(); }
      ctx.restore();
      if (/L01|L02|L09/.test(s.loc) || /дожд/.test(s.event)) {
        ctx.save(); ctx.strokeStyle = 'rgba(200,220,255,.22)'; ctx.lineWidth = 2;
        for (let i = 0; i < 110; i++) { const x = ((i * 97.13 + t * 260) % (W + 200)) - 100, y = ((i * 53.7 + t * 1400) % (H + 100)) - 50;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 10, y + 42); ctx.stroke(); }
        ctx.restore();
      }
    }
    // события плана: появление с перелётом + толчок, вспышки, серия вспышек в толпе
    const evText = (s, k) => { const parts = s.event.split(/[;→]/).map(x => x.trim().replace(/^\(|\)$/g, '')).filter(x => x && !/^на ~75/.test(x));
      const p = parts[Math.min(k, parts.length - 1)] || s.framing; return p.length > 38 ? p.slice(0, 37) + '…' : p; };
    function eventTimes(s, d) {
      if (/^T-(card|title)$/.test(s.loc) || s.box) return [];
      const dense = s.ch === 0 || s.ch === 10 || (s.ch === 9 && s.n >= 270), quiet = [5, 8, 9].includes(s.ch);
      const a = []; const t1 = s.snap != null ? s.snap + .35 : Math.max(.45, d * .42); if (t1 < d - .15) a.push(t1);
      if ((d >= 4.5 || (dense && d >= 2) || (quiet && d >= 3.2)) && d * .82 - (a[0] ?? 0) > .45) a.push(d * .82);
      if (s.whip && s.whip.t + .35 < d - .15 && !a.some(x => Math.abs(x - s.whip.t - .35) < .4)) a.push(s.whip.t + .35);
      return a;
    }
    function events(ctx, s, t, d, cam) {
      const ts = eventTimes(s, d), isT = /^T-/.test(s.loc);
      ts.forEach((t0, k) => { if (!isT) sticker(ctx, k ? W * .66 : W * .36, k ? H * .2 : H * .14, evText(s, k), t, t0); });
      const fl = /вспышк|щелч|снимк|фото|flash/i.test(s.event + s.framing) && !/фоторамк/.test(s.event);
      if (fl) flash(ctx, W * .62, H * .38, t, s.snap ?? d * .45);
      if (/серия из 6 вспышек/.test(s.event)) for (let i = 0; i < 6; i++) flash(ctx, W * (.15 + ((i * .37) % .7)), H * (.25 + ((i * .53) % .5)), t, d * (.1 + .14 * i), .6);
    }
    function sticker(ctx, x, y, text, t, t0) {
      const u = (t - t0) / (6 / 30); if (u < 0) return;
      const k = u >= 1 ? 1 : outBack(u), kk = t - t0 < .3 ? 10 * Math.sin((t - t0) * 60) * (1 - (t - t0) / .3) : 0;
      ctx.save(); ctx.translate(x + kk, y); ctx.scale(k, k); ctx.font = "700 40px 'Segoe UI', sans-serif";
      const w = Math.min(760, ctx.measureText(text).width + 60);
      ctx.fillStyle = 'rgba(242,169,78,.94)'; ctx.strokeStyle = '#120c08'; ctx.lineWidth = 5; ctx.beginPath(); ctx.roundRect(-w / 2, -58, w, 116, 18); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#120c08'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 0, 2, w - 30); ctx.restore();
    }
    function flash(ctx, x, y, t, t0, k = 1) {
      const u = (t - t0) / (3 / 30); if (u < 0 || u > 1) return;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(x, y, 0, x, y, 900); g.addColorStop(0, `rgba(255,255,255,${.95 * k * (1 - u)})`); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.fillStyle = `rgba(255,255,255,${.35 * k * (1 - u)})`; ctx.fillRect(0, 0, W, H); ctx.restore();
    }

    function videoTitle(ctx, t, d) {      // название ролика поверх плана: полоса снизу, буквы проявляются
      const k = clamp((t - .3) / .8), title = "How China Got a Seat at Jensen Huang's Table";
      ctx.save(); const g = ctx.createLinearGradient(0, H * .45, 0, H); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${.85 * k})`);
      ctx.fillStyle = g; ctx.fillRect(0, H * .45, W, H * .55);
      ctx.globalAlpha = k; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#f1e6cc';
      ctx.font = "600 78px Georgia, 'Times New Roman', serif"; ctx.shadowColor = '#000'; ctx.shadowBlur = 18;
      ctx.fillText(title, W / 2, H * .8); ctx.restore();
    }
    function deskProps(ctx, s, t, d) {
      ctx.save(); ctx.strokeStyle = '#f1e6cc'; ctx.lineWidth = 6;
      if (/ресторан/.test(s.framing)) {
        for (const x of [820, 1100]) { ctx.fillStyle = 'rgba(200,220,255,.25)'; ctx.beginPath(); ctx.arc(x, 470, 80, 0, 6.283); ctx.fill(); ctx.stroke(); }
        const vib = t > d * .4 ? Math.sin(t * 90) * 6 : 0; ctx.fillStyle = '#111'; ctx.beginPath(); ctx.roundRect(900 + vib, 640, 140, 260, 20); ctx.fill(); ctx.stroke();
      } else if (/салфетк|Denny/.test(s.framing)) {
        ctx.fillStyle = '#f4efe2'; ctx.beginPath(); ctx.roundRect(660, 300, 600, 480, 12); ctx.fill(); ctx.strokeStyle = '#2b3a66'; ctx.lineWidth = 5;
        const k = ease(t / (d * .8)), segs = [[760, 400, 1160, 400], [1160, 400, 1160, 680], [1160, 680, 760, 680], [760, 680, 760, 400], [860, 480, 1060, 480], [860, 480, 860, 600], [860, 600, 1060, 600], [1060, 480, 1060, 600]];
        segs.slice(0, Math.ceil(k * segs.length)).forEach(([a, b, c, e]) => { ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, e); ctx.stroke(); });
      }
      ctx.restore();
    }
    function plate(ctx, s, t, d, sz, cam, sp) {
      const P = LOCP[s.loc] || ['bg_desk_topdown'];
      let key = P[0], flip = false, tint = null;
      if (sz === 'rev') { if (P[1]) key = P[1]; else flip = true; }
      if (s.loc === 'L02-sg-street' && sz !== 'ws') key = 'bg_car_interior';
      if (s.loc === 'L08-kentucky' && !/санузел|кабин|ведро|швабр/.test(s.framing + ' ' + s.event)) key = 'bg_dorm_room';
      if (NEWP[s.loc]) key = NEWP[s.loc][0];
      if (sz === 'top') { key = 'bg_desk_topdown'; if (s.loc === 'L05-beijing') tint = 'rgba(200,90,80,1)'; }
      const name = sp || nameOf(s), sizeK = sz === 'rev' && /^обратная (\S+)/.test(s.framing) && nameOf(s) ? 'ms' : sz;
      let focus = sz === 'ins' ? (PROP_AT[s.n] || SPOTS[key].prop) : name ? spotFor(key, name.split(' · ')[0]) : [.5, .5];
      if (sz === 'pov') focus = [.89, .38];
      let wu = null, WA, WB;
      if (s.whip) { WA = spotFor(key, s.whip.from); WB = spotFor(key, s.whip.to); wu = inOutExpo((t - s.whip.t + .1) / .22); focus = [lerp(WA[0], WB[0], wu), lerp(WA[1], WB[1], wu)]; }
      const baseZ = ZOOM[sz] * (s.whip && sz === 'ws' ? 1.5 : 1);
      const center = f => (sz === 'ws' || sz === 'rev' || sz === 'top') && !s.whip ? [.5 + cam.dx, .5 + cam.dy] : [clamp(f[0] + cam.dx), clamp(f[1] + cam.dy)];
      const v = plateView(baseZ * cam.z, center(focus));
      ctx.save(); ctx.translate(cam.sh, cam.sh * .5);
      const blur = sz === 'cu' || sz === 'xcu' || sz === 'ms';
      drawImg(ctx, blur && !flip ? blurOf(key) : I[key], v, flip, tint);
      if (wu != null && wu > 0 && wu < 1) for (let g = 1; g <= 5; g++) {           // смаз вип-пана: копии кадра позади по пути
        const ug = clamp(wu - g * .07), fg = [lerp(WA[0], WB[0], ug), lerp(WA[1], WB[1], ug)];
        ctx.save(); ctx.globalAlpha = .22; drawImg(ctx, blur && !flip ? blurOf(key) : I[key], plateView(baseZ * cam.z, center(fg)), flip, tint); ctx.restore();
      }
      if (blur && flip) { ctx.filter = 'none'; }
      if (sz === 'top' && s.loc === 'L05-beijing') chess(ctx, t, d);
      ctx.restore();
      // герои
      const fh = FIG_H[sizeK], people = s.whip ? [s.whip.from, s.whip.to] : sz === 'pov' ? ['JENSEN'] : sz === 'ins' || sz === 'top' ? [] : name ? name.split(' · ') : [];
      const empty = /пуст/.test(s.framing);
      if (!empty) people.forEach((nm, i) => {
        const p = sz === 'pov' ? [W / 2, H * .5] : toScreen(v, s.whip ? spotFor(key, nm) : people.length > 1 ? SPOTS[key][i % 2 ? 'b' : 'a'] : (flip ? [1 - focus[0], focus[1]] : spotFor(key, nm)));
        const isSp = s.whip ? nm === (t < s.whip.t ? s.whip.from : s.whip.to) : !!sp && (sp === nm || (sp === 'JENSEN' && /JENSEN/.test(nm)));
        figure(ctx, p[0], p[1] + fh * .15, fh, sz === 'pov' ? 'JENSEN (in the window)' : nm, sz !== 'pov' && (isSp || (people.length === 1 && !!sp && !nameOf(s))));
      });
      const mk = sz === 'ins' ? toScreen(v, focus) : people.length ? toScreen(v, spotFor(key, people[0])) : [W / 2, H / 2];
      void mk;
      if (sz === 'pov') viewfinder(ctx, t);
      if (sz === 'ins' && /край стола/.test(s.framing)) {      // чип под скатертью (заглушка): рука в перчатке, зелёное свечение
        const k = clamp((t - .2) / Math.max(.4, (s.snap ?? d * .5) - .2)), x = lerp(W * .15, W * .55, outCubic(k));
        ctx.save(); ctx.fillStyle = '#e9e2d0'; ctx.fillRect(0, 0, W, H * .42);
        const g = ctx.createRadialGradient(x + 160, H * .62, 0, x + 160, H * .62, 360); g.addColorStop(0, 'rgba(90,255,140,.75)'); g.addColorStop(1, 'rgba(90,255,140,0)');
        ctx.fillStyle = g; ctx.fillRect(0, H * .3, W, H * .7); ctx.fillStyle = '#0d0d10'; ctx.beginPath(); ctx.roundRect(x - 260, H * .55, 300, 120, 50); ctx.fill();
        ctx.fillStyle = '#2fd36a'; ctx.strokeStyle = '#eaffea'; ctx.lineWidth = 4; ctx.fillRect(x + 60, H * .56, 200, 110); ctx.strokeRect(x + 60, H * .56, 200, 110); ctx.restore();
        tag3d(ctx, 'GLOVED HAND (Alice side, no face) slides a glowing chip under the tablecloth');
      }
      if (sz === 'ws' && /объектив/.test(s.event) && s.loc === 'L01-restaurant') figure(ctx, W * .62, H * .5, 120, 'AGENT (menu + lens)', false);
      if (sz === 'ins' && /снимк/.test(s.framing)) {   // снимки падают стопкой (заглушка)
        const n = Math.min(4, Math.floor(t / Math.max(.3, d * .15)) + 1);
        for (let i = 0; i < n; i++) { ctx.save(); ctx.translate(W * (.38 + i * .07), H * (.42 + i * .05)); ctx.rotate((i % 2 ? 1 : -1) * .08 * (i + 1));
          ctx.fillStyle = '#f4efe2'; ctx.fillRect(-190, -150, 380, 300); ctx.fillStyle = '#2a2230'; ctx.fillRect(-170, -130, 340, 220);
          ctx.fillStyle = '#e8c9a0'; ctx.beginPath(); ctx.arc(-60, -30, 40, 0, 6.283); ctx.arc(70, -25, 40, 0, 6.283); ctx.fill(); ctx.restore(); }
      }
      if (flip) tag3d(ctx, 'REVERSE (mirrored plate — no reverse plate)');
      else if (NEWP[s.loc]) tag3d(ctx, NEWP[s.loc][1]);
    }
    function chess(ctx, t, d) {
      const s0 = 70, x0 = 960 - s0 * 4, y0 = 540 - s0 * 4;
      for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { ctx.fillStyle = (i + j) % 2 ? 'rgba(20,10,10,.85)' : 'rgba(230,210,180,.85)'; ctx.fillRect(x0 + i * s0, y0 + j * s0, s0, s0); }
      const k = ease((t - d * .3) / (d * .5)); ctx.fillStyle = '#f1e6cc'; ctx.strokeStyle = '#000'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(x0 + s0 * 7.5, y0 + s0 * .5, 24, 0, 6.283); ctx.fill(); ctx.stroke();                      // фигура-чип
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(lerp(x0 + s0 * 1.5, x0 + s0 * 4.5, k), lerp(y0 + s0 * 6.5, y0 + s0 * 3.5, k), 28, 0, 6.283); ctx.fill(); ctx.stroke();   // «Белый дом»
    }
    function threeD(ctx, s, t, d, sz, cam, sp) {
      const what = s.framing.replace(/^3D\s*/, '') || s.loc;
      if (s.loc === '3D-boxpath' || s.loc === '3D-datacenter') {
        let ts;
        if (s.box) ts = Math.min(s.box.from + t, s.box.to - .07);
        else if (s.loc === '3D-boxpath' && /серийник/.test(s.framing)) ts = Math.min(10.6 + t * .4, 13.2);   // вставка серийника — кадры S6
        else if (s.loc === '3D-boxpath') ts = Math.min(t * .75, 4.0);         // гл. 1: склад из S1–S2
        else ts = Math.min(15.4 + t * .35, 17.8);                              // ДЦ: кадры 3D-хвоста
        const fr = BOX[clamp(Math.floor(ts * 15), 0, BOX.length - 1)];
        const name = sp || nameOf(s), focus = sz === 'ins' ? SPOTS.box.prop : name ? spotFor('box', name) : [.5, .5];
        const z = s.box ? 1 : (ZOOM[sz] || 1.04) * cam.z;
        const v = plateView(z, s.box ? [.5, .5] : [focus[0] + cam.dx, focus[1] + cam.dy]);
        ctx.save(); ctx.translate(cam.sh, 0); drawImg(ctx, ok(fr) ? fr : null, v); ctx.restore();
        if (name && !s.box) { const p = toScreen(v, spotFor('box', name)); figure(ctx, p[0], p[1], FIG_H[sz] || 200, name, !!sp); }
        if (!s.box) eventMark(ctx, W / 2, H / 2, t, d);
        tag3d(ctx, `3D: ${what}` + (s.box ? `  (box_path_v2 ${s.box.from.toFixed(1)}–${s.box.to.toFixed(1)} s)` : ''));
        return;
      }
      if (s.loc === '3D-kitchen') { kitchen(ctx, s, t, d); tag3d(ctx, '3D: ' + what); return; }
      if (s.loc === '3D-conveyor') { conveyor(ctx, t, d); tag3d(ctx, '3D: ' + what); return; }
      const f3 = s.framing + ' ' + s.event;
      const PL = /Сингапур/.test(f3) && !/отъезд над/.test(f3) ? ['bg_singapore_street', [.6, .45], 1.25, 1.6] : /Вашингтон|Капитол/.test(f3) && /пролёт/.test(f3) ? ['bg_washington_cold', [.62, .28], 1.5, 2.1]
        : /Тайбэ/.test(f3) ? ['bg_taipei_bar_dry', [.13, .28], 1.8, 2.4] : /отъезд над городом/.test(f3) ? ['bg_singapore_street', [.5, .4], 1.6, 1.05]
        : s.loc === '3D-phone-desk' ? ['bg_washington_cold', [.37, .7], 2.0, 2.3] : s.loc === '3D-hq-corridor' ? ['bg_nvidia_office_reverse', [.27, .42], 1.5, 2.6] : null;
      const [key, c, z0, z1] = PL || ['bg_desk_topdown', [.5, .5], 1.04, 1.1];
      const v = plateView(lerp(z0, z1, ease(t / d)), c);
      const sh = s.loc === '3D-phone-desk' && t > d * .2 ? Math.sin(t * 70) * 5 : 0;
      ctx.save(); ctx.translate(sh, 0); drawImg(ctx, I[key], v); ctx.restore();
      if (s.loc === '3D-phone-desk') eventMark(ctx, W / 2, H / 2, t, d);
      tag3d(ctx, '3D: ' + what);
    }

    // ---------- сцены ----------
    const f0 = +opt.f0 || 0, total = timing.total, fEnd = opt.f1 ? Math.min(+opt.f1, Math.round(total * FPS)) : Math.round(total * FPS);
    const T0 = f0 / FPS, T1 = fEnd / FPS;
    const scenes = timing.shots.filter(s => s.end > T0 + 1e-6 && s.start < T1 - 1e-6).map(s => ({
      id: 's' + s.n, from: s.start - T0, to: s.end - T0, look: { bloom: 0, dof: false, fogDensity: 0, vignette: 0, bg: 0x000000 },
      over: (t, f) => { f.ctx.save(); shot(f.ctx, s, t - (s.start - T0)); f.ctx.restore(); },
    }));
    return { duration: T1 - T0, frames: fEnd - f0, scenes };
  },
};
