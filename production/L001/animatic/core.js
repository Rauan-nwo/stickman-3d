// animatic/core.js: общее ядро аниматика и финального фильма L001 (animatic/film.js, film/film.js).
// Было телом animatic/film.js; вынесено без изменений поведения, добавлены только хуки HK (по умолчанию — пусто = аниматик как был).
// HK.final — финальный рендер: без заметок о действии, меток 3D/шаблонов, янтарных колец; HK.plate(s) -> функция-рисовальщик
// плана вместо заглушки; HK.rain(s) -> false глушит дождь; HK.skipProp(s, q) -> true не рисует вещь-подпись «q» (она уже в кадре);
// HK.noAmbient(s) -> true без дыхания света и пыли (нативные 3D-кадры финала); HK.flash(s) -> false/true переопределяет вспышку; HK.over(s) -> рисовальщик поверх плана (до подписей); HK.shotOk(s) — фильтр планов (рендер одной главы).
// Ниже — исходное описание аниматика.
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
import p_bg_relatives_porch from './tmp/bg_relatives_porch.jpg';
import p_bg_dennys_dishpit from './tmp/bg_dennys_dishpit.jpg';
import p_bg_blocked_warehouse from './tmp/bg_blocked_warehouse.jpg';
import p_bg_closed_room from './tmp/bg_closed_room.jpg';
import p_bg_trading_desk from './tmp/bg_trading_desk.jpg';
import p_bg_desk_restaurant_top from './tmp/bg_desk_restaurant_top.jpg';
import p_bg_desk_dennys_top from './tmp/bg_desk_dennys_top.jpg';
import p_bg_diner_night_1997 from './tmp/bg_diner_night_1997.jpg';
import p_bg_street_no_car from './tmp/bg_street_no_car.jpg';
import p_bg_front_door_huang from './tmp/bg_front_door_huang.jpg';
import p_bg_megaspeed_reverse_7road from './tmp/bg_megaspeed_reverse_7road.jpg';
import CLIPF, { CLIP_FPS } from './clipframes.js';

const W = 1920, H = 1080, FPS = 30;
const URLS = { restaurant: p_restaurant, restaurant_reverse: p_restaurant_reverse, host_office: p_host_office, bg_singapore_street: p_bg_singapore_street,
  bg_car_interior: p_bg_car_interior, bg_washington_cold: p_bg_washington_cold, bg_washington_reverse: p_bg_washington_reverse, bg_beijing_office: p_bg_beijing_office,
  bg_nvidia_office_dry: p_bg_nvidia_office_dry, bg_nvidia_office_reverse: p_bg_nvidia_office_reverse, bg_diner_day: p_bg_diner_day, bg_kentucky_day: p_bg_kentucky_day,
  bg_dorm_room: p_bg_dorm_room, bg_megaspeed_office: p_bg_megaspeed_office, bg_megaspeed_reverse: p_bg_megaspeed_reverse, bg_taipei_bar_dry: p_bg_taipei_bar_dry,
  bg_event_hall: p_bg_event_hall, bg_event_hall_reverse: p_bg_event_hall_reverse, bg_customs_gate: p_bg_customs_gate, bg_newsroom: p_bg_newsroom,
  bg_front_door: p_bg_front_door, bg_desk_topdown: p_bg_desk_topdown,
  bg_relatives_porch: p_bg_relatives_porch, bg_dennys_dishpit: p_bg_dennys_dishpit, bg_blocked_warehouse: p_bg_blocked_warehouse, bg_closed_room: p_bg_closed_room, bg_trading_desk: p_bg_trading_desk, bg_desk_restaurant_top: p_bg_desk_restaurant_top, bg_desk_dennys_top: p_bg_desk_dennys_top, bg_diner_night_1997: p_bg_diner_night_1997, bg_street_no_car: p_bg_street_no_car, bg_front_door_huang: p_bg_front_door_huang, bg_megaspeed_reverse_7road: p_bg_megaspeed_reverse_7road };

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
  bg_relatives_porch: { a: [.32, .62], b: [.66, .62], prop: [.5, .6] }, bg_dennys_dishpit: { a: [.4, .6], b: [.7, .6], prop: [.45, .62] },
  bg_blocked_warehouse: { a: [.3, .62], b: [.7, .62], prop: [.5, .6] }, bg_closed_room: { a: [.35, .58], b: [.65, .58], prop: [.5, .62] },
  bg_trading_desk: { a: [.3, .6], b: [.68, .6], prop: [.5, .55] }, bg_diner_night_1997: { a: [.12, .62], b: [.88, .62], prop: [.5, .78] },
  bg_street_no_car: { a: [.2, .68], b: [.73, .64], prop: [.73, .7] }, bg_front_door_huang: { a: [.63, .55], b: [.45, .62], prop: [.76, .3] },
  bg_megaspeed_reverse_7road: { a: [.72, .6], b: [.36, .55], prop: [.38, .42] },
  bg_desk_restaurant_top: { a: [.5, .5], b: [.5, .5], prop: [.5, .5] }, bg_desk_dennys_top: { a: [.5, .5], b: [.5, .5], prop: [.5, .5] },
  box: { a: [.4, .6], b: [.62, .6], prop: [.5, .55] },
};
// вставки: [x, y] точка на плейте, третьим — другой плейт той же локации (табличка на двери — на обратном плейте и т. п.)
const PROP_AT = { 21: [.6, .42], 44: [.8, .32], 87: [.6, .42], 105: [.52, .66], 122: [.38, .42, 'bg_megaspeed_reverse'], 129: [.82, .56], 145: [.38, .42, 'bg_megaspeed_reverse'], 157: [.52, .55],
  125: [.3, .62, 'bg_megaspeed_office'], 134: [.33, .4, 'bg_megaspeed_office'], 142: [.33, .5, 'bg_megaspeed_office'], 178: [.33, .5, 'bg_megaspeed_office'], 183: [.2, .6, 'bg_megaspeed_reverse'], 205: [.6, .4, 'bg_megaspeed_reverse'],
  167: [.5, .55], 174: [.25, .62], 202: [.72, .62], 231: [.4, .3, 'bg_washington_reverse'], 276: [.6, .42], 281: [.3, .7], 288: [.3, .7], 325: [.66, .62], 340: [.88, .36], 69: [.55, .32] };
const LOCP = { 'L01-restaurant': ['restaurant', 'restaurant_reverse'], 'L02-sg-street': ['bg_singapore_street'], 'L03-host-office': ['host_office'],
  'L04-washington': ['bg_washington_cold', 'bg_washington_reverse'], 'L05-beijing': ['bg_beijing_office'], 'L06-nvidia-office': ['bg_nvidia_office_dry', 'bg_nvidia_office_reverse'],
  'L07-dennys': ['bg_diner_day'], 'L08-kentucky': ['bg_kentucky_day'], 'L09-megaspeed': ['bg_megaspeed_office', 'bg_megaspeed_reverse'],
  'L10-taipei-bar': ['bg_taipei_bar_dry'], 'L11-event-hall': ['bg_event_hall', 'bg_event_hall_reverse'], 'L12-customs': ['bg_customs_gate'],
  'L13-newsroom': ['bg_newsroom'], 'L14-front-door': ['bg_front_door'],
  'L15-relatives': ['bg_relatives_porch'], 'L16-dennys-kitchen': ['bg_dennys_dishpit'], 'L17-warehouse': ['bg_blocked_warehouse'], 'L18-closed-room': ['bg_closed_room'], 'L19-trading-desk': ['bg_trading_desk'] };
// новые плейты, которых ещё нет: [чем заменить в аниматике, подпись]
const NEWP = {};   // все плейты L15–L19 нарисованы (assets/bg_*.png) — заглушек плейтов нет
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
const ZOOM = { ws: 1.12, rev: 1.12, ms: 1.6, cu: 1.95, xcu: 2.6, ins: 2.3, pov: 2.2, top: 1.04 };
const FIG_H = { ws: 170, rev: 190, ms: 300, cu: 420, xcu: 520, ins: 0, pov: 200, top: 0 };
const speakerOf = s => (s.text.match(/^([A-Z][A-Z0-9 ]{1,20}):/) || [])[1] || null;
const nameOf = s => { const rest = s.framing.replace(/^(\S+)\s*/, ''); for (const [re, n] of NAMES) if (re.test(rest)) return n; return null; };

// движение камеры из колонки шотлиста -> функция t -> { z, dx, dy, rot, sh }
const outExpo = k => (k >= 1 ? 1 : k <= 0 ? 0 : 1 - Math.pow(2, -10 * k)), outCubic = k => 1 - Math.pow(1 - clamp(k), 3);
const inOutExpo = k => (k <= 0 ? 0 : k >= 1 ? 1 : k < .5 ? Math.pow(2, 20 * k - 10) / 2 : (2 - Math.pow(2, -20 * k + 10)) / 2);
const outBack = k => { const c1 = 1.9, c3 = c1 + 1; k = clamp(k); return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };
const SNAP_Z = .13, SNAP_T = 5 / 30, WHIP_DUR = .18;   // WHIP_DUR — длина вип-пана внутри плана (с): ~5–6 кадров
// грамматика камеры (колонка «камера»): «статично» — настоящая остановка; «рывок на «слово»» — наезд с торможением, остановка,
// рывок-зум 13 % за 5 кадров на ударном слове (s.snap из make_timing); «вип-пан» — остановка, вип со смазом на втором говорящем;
// панорама/проезд/подъём/… — плавный проход с остановкой на последних 15 %
// Denny's: ночь начинается с плана «When its make-or-break chip finally shipped in 1997»
const NIGHT_1997 = (timing.shots.find(x => /^When its make-or-break/.test(x.text)) || { start: 1e9 }).start;
// финал — последние 75 с гл. 9 (от «Nobody has charged…» до конца), по времени, а не по номеру плана
const FINALE_FROM = Math.max(...timing.shots.filter(x => x.ch === 9).map(x => x.end)) - 75;
// какие планы берут готовую 3D-сцену (scenes/*/out/*.mp4 через prep_clips.py): [клип, с, по (с), скорость (необяз.)]
function CLIP_OF(s) {
  const f = s.framing;
  if (s.loc === '3D-kitchen') return /монитор/.test(f) ? ['kitchen', 0, 2.204] : /один повар/.test(f) ? ['kitchen', 2.204, 7.168] : ['kitchen', 7.168, 13.65];
  if (s.loc === '3D-city' && /\$5T/.test(f)) return ['city_towers_5t', 0, 5.8];
  if (s.loc === '3D-city' && /башен/.test(f)) return ['city_towers', 0, 2.2];
  if (s.loc === '3D-city' && /Аляск/.test(f)) return ['city_alaska', 0, 3.6];
  if (s.loc === '3D-city') return /Вашингтон/.test(f) ? ['city_washington', 0, 4.9] : /Тайбэ/.test(f) ? (s.dur < 2.5 ? ['city_taipei', 3.3 - s.dur, 3.3] : ['city_taipei', 0, 3.3])
    : /отъезд над городом/.test(f) ? ['city_final', 0, 4.4] : /Сингапур/.test(f) ? ['city_singapore', 0, 3] : null;
  if (s.loc === '3D-phone-desk') return /папка/.test(f) ? ['desk3d', 3.6, 6] : ['desk3d', 0, 6, 1];
  if (s.loc === '3D-conveyor') return ['conveyor', 0, 99, 1];                       // сцена перерендерена с --set dur = длина плана (animatic/tmp/conv/), 1:1
  if (s.loc === '3D-hq-corridor') return ['hq', 0, 6.7];
  if (s.loc === '3D-datacenter') return /пролёт ДЦ|суперкомпьютер|ворота/.test(f) ? ['dc', 0, 6] : /пустые стойки/.test(f) ? ['dc', 6, 9.5] : /коробки в плёнке/.test(f) ? ['dc', 7.5, 9.5]
    : /крошечный инспектор/.test(f) ? ['dc', 9.5, 11.5] : /крупно инспектор/.test(f) ? ['dc', 11.5, 13.1] : /гид/.test(f) ? ['dc', 13.1, 14.7] : /наклейка/.test(f) ? ['dc', 16.1, 17.7]
    : /табличка нового арендатора/.test(f) ? ['dc', 3.8, 6] : null;
  if (s.loc === 'L01-restaurant' && /бокал/.test(f) && /вип-пан/.test(f)) return ['probe', 2.4, 6.8];      // тост: Дженсен -> Алиса (dialogue_probe)
  if (s.loc === 'L01-restaurant' && /вставка бокалы/.test(f)) return ['probe', 6.8, 8.8];
  return null;
}
function camOf(s, d) {
  const c = s.camera.toLowerCase();
  const kind = /вип-пан/.test(c) ? 'whip' : /статично/.test(c) ? 'static' : /панорам|проезд|пролёт|подъём|опускани|прокрутк|поворот|наклон|проход/.test(c) ? 'pan' : /рывок/.test(c) ? 'snap' : 'push';
  const settle = Math.min(1, Math.max(.4, d * .4)), pull = /отъезд/.test(c), kick = /толчок|встряска/.test(c);
  let dx = 0, dy = 0;
  if (kind === 'pan') {
    dx = /влево/.test(c) ? -.08 : /подъём|опускани|прокрутк|наклон/.test(c) ? 0 : .08;
    if (/подъём|прокрутка вверх/.test(c)) dy = -.06; if (/опускани|наклон вниз|прокрутка вниз/.test(c)) dy = .06;
  }
  const ts = s.snap ?? d * .4;
  // хук и финал — пики энергии: вместо мёртвой остановки камера ползёт (0.25 %/кадр), рывок на этом фоне всё равно читается
  // между наездом и рывком камера не мертва: ползёт 0.1 %/кадр (3 %/с), как у конкурента; в хуке и финале — 0.25 %/кадр
  const hot = s.ch === 0 || s.ch === 1 || s.ch === 4 || s.ch === 10 || (s.ch === 9 && s.start >= FINALE_FROM);
  const peak = s.ch <= 1 || s.ch === 10 || (s.ch === 9 && s.start >= FINALE_FROM), slowMin = [[240, 300], [540, 600], [660, 720]].some(([a, b]) => s.start < b && s.start + d > a);   // ведущий и финал — пики; минуты 4, 9, 11 по замеру — плотнее
  const creep = kind === 'static' ? 0 : peak || slowMin ? .13 : hot ? .085 : .06, drift = kind === 'static' ? 0 : peak || slowMin ? .08 : hot ? .055 : .04, dir = s.n % 2 ? 1 : -1;   // зум %/с /100, сдвиг доля ширины/с
  return t => {
    let z = 1, ox = 0, oy = 0;
    if (kind === 'pan') { const k = ease(t / (d * .85)); z = 1 + .06 * k; ox = dx * (k - .5) * (hot ? 2.6 : 2); oy = dy * (k - .5) * (hot ? 2.6 : 2); }
    else if (kind !== 'static') { const k = outCubic(t / settle), u = Math.max(0, t - settle); z = (pull ? lerp(1.12, 1, k) : lerp(1, 1.1, k)) * (1 + creep * u); ox = dir * drift * u; oy = -.25 * drift * u; }
    const sz = s.snap != null && kind !== 'static' ? 1 + SNAP_Z * outExpo((t - s.snap) / SNAP_T) : 1;
    const sh = kick && t > ts && t < ts + .35 ? 14 * Math.sin((t - ts) * 60) * (1 - (t - ts) / .35) : 0;
    return { z: z * sz, snapZ: sz, dx: ox, dy: oy, rot: 0, sh, kind };
  };
}

export { WHIP_DUR };
export const OPTIONS = { debug: '1', f0: '0', f1: '', sheet: '0' };
export { FPS, W, H, timing, CLIP_OF, sizeOf, camOf, ZOOM, SPOTS, LOCP, PROP_AT, speakerOf, nameOf, clamp, lerp, ease, outExpo, outCubic, inOutExpo, outBack };
export function animatic(stage, opt, HK = {}) {
  {
    const debug = opt.debug !== '0' && opt.debug !== 'false';
    const I = {}; for (const k in URLS) I[k] = img(URLS[k]);
    const BOX = BOXF.map(img);
    const CLIPI = {}; for (const k in CLIPF) CLIPI[k] = CLIPF[k].map(img);
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
    const LBL = [];
    function figure(ctx, x, y, h, label, speaking) {         // полупрозрачный силуэт с табличкой
      if (h <= 0) return; h = Math.min(h, 560); ctx.save();
      const r = h * .14; ctx.globalAlpha = .55; ctx.fillStyle = '#0a0c14'; ctx.strokeStyle = speaking ? '#ffd48a' : '#f1e6cc'; ctx.lineWidth = Math.max(2, h / 90);
      ctx.beginPath(); ctx.arc(x, y - h * .36, r, 0, 6.283); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.roundRect(x - h * .2, y - h * .2, h * .4, h * .55, h * .12); ctx.fill(); ctx.stroke();
      ctx.globalAlpha = .85; ctx.font = `700 ${Math.round(clamp(h / 9, 22, 34))}px Bahnschrift, 'Segoe UI', sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const txt = label + (speaking ? ' — speaks' : ''), tw = ctx.measureText(txt).width + 28; let ly = Math.min(H - 70, y + h * .45);
      const lx = clamp(x, tw / 2 + 10, W - tw / 2 - 10), hit = yy => LBL.some(b => Math.abs(b[0] - lx) < (b[2] + tw) / 2 + 6 && Math.abs(b[1] - yy) < 48);
      for (let k = 0; k < 6 && hit(ly); k++) ly += ly > H - 160 ? -50 : 50;   // подписи не налезают друг на друга
      LBL.push([lx, ly, tw]);
      ctx.fillStyle = 'rgba(8,8,14,.78)'; ctx.beginPath(); ctx.roundRect(lx - tw / 2, ly - 22, tw, 44, 8); ctx.fill();
      ctx.fillStyle = speaking ? '#ffd48a' : '#f1e6cc'; ctx.fillText(txt, lx, ly + 1); ctx.restore();
    }
    function eventMark(ctx, x, y, t, d) {                  // событие плана: янтарное кольцо-импульс
      if (HK.final) return;
      const k = (t - Math.min(d * .4, 1.2)) / .6; if (k < 0 || k > 1) return;
      ctx.save(); ctx.globalAlpha = .8 * (1 - k); ctx.strokeStyle = '#f2a94e'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(x, y, 30 + 110 * k, 0, 6.283); ctx.stroke(); ctx.restore();
    }
    function tag3d(ctx, text) {
      if (HK.final) return;
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
      if (!/^T-(card|title)$/.test(s.loc)) for (const t0 of eventTimes(s, d)) { const u = t - t0; if (u > 0 && u < .25) cam.sh += 9 * Math.sin(u * 55) * (1 - u / .25); }   // толчок камеры на появлении
      const settleDur = Math.min(1.2, Math.max(.4, d * .35));            // шаблон доезжает и стоит, дальше — рывок
      const sZ = /^T-(map|board|doc)$/.test(s.loc) ? 1 + (cam.snapZ - 1) * .4 : cam.snapZ;   // на картах и документах рывок мягче: подписи у краёв не срезаются
      const tZ = sZ * (/^T-(doc|number|board|map|split|joke)$/.test(s.loc) && cam.kind !== 'static' ? Math.min(/^T-(board|map)$/.test(s.loc) ? 1.2 : 1.12, cam.z / cam.snapZ) : 1);
      const snapWrap = f => { ctx.save(); if (tZ !== 1) { ctx.translate(W / 2, H / 2); ctx.scale(tZ, tZ); ctx.translate(-W / 2, -H / 2); } f(); ctx.restore(); };
      ctx.save();
      if (/^T-(map|board|doc|split|desk|number)$/.test(s.loc) && cam.sh) ctx.translate(cam.sh, cam.sh * .5);   // толчок на событии шаблона
      const custT = /^T-desk$/.test(s.loc) && HK.plate && HK.plate(s);
      if (custT) custT(ctx, s, t, d, sz, cam, sp, API); else switch (s.loc) {
        case 'T-card': {
          const q = (s.event.match(/«([^»]+)»/) || [])[1] || s.spoken, len = q.length;
          const size = len > 60 ? 64 : len > 40 ? 76 : 96, cps = Math.max(15, len / Math.max(.3, d * .6 - .2));   // дописана к 60% плана
          const last = (q.match(/([A-Za-z']+)[^A-Za-z']*$/) || [])[1];
          T.blackCard(ctx, t, { text: q, dur: 1e6, doneBy: (d * .6) / 1e6, at: .2, cps, size, underline: last });   // карточка стоит: без наезда
          break;
        }
        case 'T-title': T.chapterTitle(ctx, t, { label: `CHAPTER ${s.ch}`, title: s.chTitle, dur: d, at: .03, sweepAt: d * .55 }); break;
        case 'T-number': { const o = NUMBERS[s.n](d); const tEnd = s.snap ?? d * .5; if (o.countDur != null) { o.at = Math.min(o.at, Math.max(0, tEnd - .6)); o.countDur = Math.max(.3, tEnd - o.at); } snapWrap(() => T.bigNumber(ctx, t, { dur: settleDur, ...o })); break; }   // отсчёт кончается ровно на произнесённом числе (рывок)
        case 'T-map': snapWrap(() => T.map(ctx, t, { dur: d, ...MAPS[s.n](d) })); break;          // рывок на ударном слове — и на карте
        case 'T-board': snapWrap(() => T.board(ctx, t, { dur: d, ...BOARDS[s.n](d) })); break;
        case 'T-doc': snapWrap(() => T.document(ctx, t, { dur: settleDur, ...DOCS[s.n](d) })); break;
        case 'T-joke': snapWrap(() => joke(ctx, s, t, d)); break;
        case 'T-desk': { const v = plateView(1.04 * cam.z, [.5 + cam.dx, .5 + cam.dy]); drawImg(ctx, /ресторан/.test(s.framing) ? I.bg_desk_restaurant_top : /салфетк|Denny/.test(s.framing) ? I.bg_desk_dennys_top : I.bg_desk_topdown, v); deskProps(ctx, s, t, d); tag3d(ctx, 'T-DESK: ' + s.framing.replace(/^сверху /, '')); break; }
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
        default: { const cust = HK.plate && HK.plate(s); if (cust) { cust(ctx, s, t, d, sz, cam, sp, API); break; } const cl = CLIP_OF(s); if (cl) drawClip(ctx, cl, t, d, cam); else if (s.loc.startsWith('3D-')) threeD(ctx, s, t, d, sz, cam, sp); else plate(ctx, s, t, d, sz, cam, sp); }
      }
      ctx.restore();
      if (!/^T-(card|title|number|doc|map|board)$/.test(s.loc) && !s.box && !(HK.noAmbient && HK.noAmbient(s))) ambient(ctx, s, t);
      events(ctx, s, t, d, cam);
      const ovl = HK.over && HK.over(s); if (ovl) ovl(ctx, s, t, d, API);
      if (/титр ролика/.test(s.framing)) videoTitle(ctx, t, d);
      // подписи
      const lt = LOWER[s.n]; if (lt) lt.forEach(([name, role, at], i) => T.lowerThird(ctx, t, { name, role, at: at * d, out: lt[i + 1] ? lt[i + 1][2] * d - .1 : null }));
      if (YEAR[s.n]) { ctx.save(); ctx.font = `bold 64px 'Courier New', monospace`; ctx.fillStyle = 'rgba(241,230,204,.9)'; ctx.globalAlpha = clamp(t / .4); ctx.fillText(YEAR[s.n], 90, 140); ctx.restore(); }
    }
    // переходы (conf.js TRANS) + засвет перед титром главы
    const IDX = new Map(timing.shots.map((x, i) => [x.n, i]));
    const prevOf = s => timing.shots[IDX.get(s.n) - 1], nextOf = s => timing.shots[IDX.get(s.n) + 1];
    // ---------- смаз движения всего кадра (вип-пан, наезд-удар) ----------
    // Кадр (фон и герои вместе) рисуется один раз в буфер; смаз — среднее N сдвинутых (или увеличенных) копий этого ОДНОГО кадра,
    // N так велико, что шаг ≤ 6 px: ни дискретных «призраков», ни полупрозрачных героев — результат непрозрачен (накопление на чёрном).
    const SMB = {};
    function sbuf(k) { let c = SMB[k]; if (!c) { c = document.createElement('canvas'); c.width = W; c.height = H; SMB[k] = c; }
      const x = c.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.filter = 'none'; x.clearRect(0, 0, W, H); return [c, x]; }
    function smearInto(ctx, src, len, zoom = 0) {          // len — длина горизонтального смаза (px); zoom — разброс масштаба (радиальный смаз)
      const N = Math.max(2, Math.min(48, Math.ceil(Math.max(len, zoom * W) / 6))), [a, ax] = sbuf('acc');
      ax.fillStyle = '#000'; ax.fillRect(0, 0, W, H); ax.drawImage(src, 0, 0);
      for (let i = 0; i < N; i++) { const k = i / (N - 1) - .5; ax.globalAlpha = 1 / (i + 2);           // бегущее среднее: каждая копия весит одинаково
        if (zoom) { const z = 1 + zoom * (k + .5); ax.setTransform(z, 0, 0, z, W / 2 * (1 - z), H / 2 * (1 - z)); ax.drawImage(src, 0, 0); ax.setTransform(1, 0, 0, 1, 0, 0); }
        else { const o = Math.round(k * len); ax.drawImage(src, o, 0);                                   // край кадра продлевается крайним столбцом
          if (o > 0) ax.drawImage(src, 0, 0, 1, H, 0, 0, o, H); else if (o < 0) ax.drawImage(src, W - 1, 0, 1, H, W + o, 0, -o, H); } }   // (иначе у края оставался резкий кадр)
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.drawImage(a, 0, 0); ctx.restore();
    }
    // длина смаза вип-пана по фазе u 0..1: пик в середине (~16 % ширины кадра), не меньше 6 % — шов между кадрами всегда под смазом
    const whipLen = u => W * (.06 + .1 * Math.sin(Math.PI * clamp(u)));
    // вип-пан внутри плана (s.whip — смена говорящего): фаза, как у плана (plate/HK.plate), WHIP_DUR ≈ 5–6 кадров
    const whipU = (s, t) => (s.whip ? inOutExpo((t - s.whip.t + .1) / WHIP_DUR) : null);
    function shot(ctx, s, t) {
      LBL.length = 0;
      const d = s.dur, tr = TRANS[s.n], pv = prevOf(s), wu = whipU(s, t);
      if (tr === 'zoom' && t < .3) {           // наезд-удар со смазом: кадр влетает из 140 % к 100 % за 9 кадров; смаз — радиальный, сплошной
        const u = outExpo(t / .3), z = lerp(1.4, 1, u), [b, bx] = sbuf('zoomSrc');
        bx.save(); bx.translate(W / 2, H / 2); bx.scale(z, z); bx.translate(-W / 2, -H / 2); content(bx, s, t); bx.restore();
        smearInto(ctx, b, 0, .18 * (1 - u));
      } else if ((tr === 'wipe' || tr === 'whip') && pv && t < (tr === 'whip' ? .2 : .27)) {
        const u = inOutExpo(t / (tr === 'whip' ? .2 : .27));                // вип-переход — 6 кадров
        if (tr === 'wipe') {
          ctx.save(); content(ctx, pv, pv.dur - .001); ctx.restore();
          ctx.save(); ctx.beginPath(); ctx.rect(W * (1 - u), 0, W, H); ctx.clip(); ctx.translate(W * (1 - u), 0); content(ctx, s, t); ctx.restore();
          ctx.fillStyle = '#f2a94e'; ctx.fillRect(W * (1 - u) - 6, 0, 12, H);
        } else {
          // уходящий и входящий кадры — одной широкой лентой, панорама по ней, смаз всего кадра (шов всегда под смазом)
          const [a, ax] = sbuf('whA'), [b, bx] = sbuf('whB'), [st, sx] = sbuf('whS');
          content(ax, pv, pv.dur - .001); content(bx, s, t); sx.drawImage(a, -W * u, 0); sx.drawImage(b, W * (1 - u), 0);
          smearInto(ctx, st, whipLen(u));
        }
      } else if (wu != null && wu > 0 && wu < 1) { const [b, bx] = sbuf('whSrc'); content(bx, s, t); smearInto(ctx, b, whipLen(wu)); }   // вип-пан внутри плана
      else content(ctx, s, t);
      const nx = nextOf(s);
      if (nx && TRANS[nx.n] === 'white' && t > d - .25) { ctx.fillStyle = `rgba(255,252,240,${clamp((t - (d - .25)) / .25)})`; ctx.fillRect(0, 0, W, H); }
      if (tr === 'white' && t < .3) { ctx.fillStyle = `rgba(255,252,240,${1 - clamp(t / .3)})`; ctx.fillRect(0, 0, W, H); }
      if (tr === 'flash' && t < .2) { ctx.fillStyle = `rgba(255,255,255,${.95 * (1 - t / .2)})`; ctx.fillRect(0, 0, W, H); }
      if (tr === 'rewind' && t < .45) rewindFx(ctx, t);
      if (tr === 'snaps' && t < .9) snapsBack(ctx, t);
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
        const x = (((i * .6180339 + t * .012 * sp) % 1) * W + Math.sin(t * .7 * sp + ph) * 20), y = ((((i * (HK.final ? .7548776 : .381966)) - t * .02 * sp) % 1 + 1) % 1) * H;   // финал: шаг .7549 — пылинки не выстраиваются в диагональ (.618 + .382 = 1)
        ctx.fillStyle = `rgba(255,214,150,${(.18 + .25 * Math.abs(Math.sin(t * 1.3 * sp + ph))).toFixed(3)})`; ctx.beginPath(); ctx.arc(x, y, 1.5 + (i % 4), 0, 6.283); ctx.fill(); }
      ctx.restore();
      if ((/L01|L02|L09/.test(s.loc) || /дожд/.test(s.event)) && !(HK.rain && HK.rain(s) === false)) {
        ctx.save(); ctx.strokeStyle = 'rgba(200,220,255,.22)'; ctx.lineWidth = 2;
        for (let i = 0; i < 110; i++) { const x = ((i * 97.13 + t * 260) % (W + 200)) - 100, y = ((i * 53.7 + t * 1400) % (H + 100)) - 50;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 10, y + 42); ctx.stroke(); }
        ctx.restore();
      }
    }
    // события плана (колонка «событие»): части через «;». Часть «на «слово» …» встаёт на время слова (make_timing → s.ev),
    // остальные — в свободные слоты (после рывка и на ~78 %). Текст в «КАПСЕ» — вещь в кадре: табличка, бирка, мел или штамп
    // (держится до конца плана); прочее — короткая заметка о действии внизу справа, одна за раз. Технические пометки не показываем.
    const TECH = /^(начало|конец)\s*—|перемотк|серия из \d+ вспышек|вип-пан со смазом|на ~75|^стоп\b/;
    const cleanEv = x => x.replace(/\s*\((?:D\d\d-[A-C][^)]*|[^)]*\bD\d\d-[A-C][^)]*)\)/g, '').replace(/^D\d\d-[A-C]:\s*/, '').trim();
    const CAPS = /«([^»]*[A-Z0-9$%·:][^»]*)»/g;
    const evCache = new Map();
    function evList(s, d) {
      if (evCache.has(s)) return evCache.get(s);
      const out = [];
      if (!/^T-(card|title)$/.test(s.loc) && !s.box) {
        const parts = s.event.split(/;\s*/).map((x, i) => ({ x: cleanEv(x), i })).filter(p => p.x && !TECH.test(p.x));
        const byP = new Map((s.ev || []).map(e => [e.p, e.t]));
        const t1 = s.snap != null ? s.snap + .35 : Math.max(.45, d * .42), slots = [t1, d * .78];
        const timed = parts.filter(p => byP.has(p.i)).map(p => ({ ...p, t: byP.get(p.i) }));
        for (const p of parts.filter(p => !byP.has(p.i))) {
          while (slots.length && timed.some(q => Math.abs(q.t - slots[0]) < .5)) slots.shift();
          if (!slots.length) break; timed.push({ ...p, t: slots.shift() });
        }
        const seen = new Set();
        for (const p of timed.sort((a, b) => a.t - b.t)) {
          if (p.t > d - .15 || seen.has(p.x)) continue; seen.add(p.x);
          const quotes = [...p.x.matchAll(CAPS)].map(m => m[1]).filter(q => /[A-Z]{2,}|\$|\d%|\d{4}|^[A-Z][a-z]+\.? \d/.test(q) && !/^[a-z]/.test(q));
          const kind = /штамп|печать|трафарет/.test(p.x) ? 'stamp' : /мелом|маркером|пишет|дописыва|печатается|впечатыва/.test(p.x) ? 'chalk' : 'plaque';
          const note = p.x.replace(/^на «[^»]+»\s*[—:-]?\s*/, '');
          out.push({ t: p.t, note: note.charAt(0).toUpperCase() + note.slice(1), quotes, kind });
        }
      }
      evCache.set(s, out); return out;
    }
    function eventTimes(s, d) {
      const a = evList(s, d).map(e => e.t);
      if (s.whip && s.whip.t + .35 < d - .15 && !a.some(x => Math.abs(x - s.whip.t - .35) < .4)) a.push(s.whip.t + .35);
      return a;
    }
    const confText = s => { try { const c = s.loc === 'T-number' ? NUMBERS[s.n] : s.loc === 'T-doc' ? DOCS[s.n] : s.loc === 'T-map' ? MAPS[s.n] : s.loc === 'T-board' ? BOARDS[s.n] : null;
      return c ? JSON.stringify(c(s.dur)).toUpperCase() : ''; } catch { return ''; } };
    function events(ctx, s, t, d, cam) {
      const ev = evList(s, d); if (!ev.length && !s.event) return;
      const ct = confText(s), props = [];
      for (const e of ev) for (const q of e.quotes.slice(0, 2)) if (q !== YEAR[s.n] && (e.kind === 'stamp' || (s.loc !== 'T-number' && !ct.includes(q.toUpperCase())))) props.push({ e, q });   // год уже стоит подписью YEAR — не дублируем   // у цифры своя подпись: только штампы
      // вещи в кадре: стопкой сверху по центру, каждая со своего слова до конца плана
      const shown = props.filter(p => t >= p.e.t && !(HK.skipProp && HK.skipProp(s, p.q)));
      shown.forEach((p, k) => { const sib = p.e.quotes.length > 1 && props.filter(x => x.e === p.e).length > 1;
        if (sib && p.q === p.e.quotes[0] && t > p.e.t + .45) return;           // «SEND» → «SENT»: второе сменяет первое
        if (sib && p.q !== p.e.quotes[0] && t <= p.e.t + .45) return;
        const onClip = !!CLIP_OF(s), wallB = s.loc === 'L04-washington' && /вставка доска/.test(s.framing), px = wallB ? W * .8 : s.loc === 'T-doc' ? W * .835 : s.loc === 'T-number' ? W * .8 : onClip ? W * .2 : W / 2, py = wallB ? H * .45 : s.loc === 'T-number' ? H * .4 : onClip ? H * .12 : H * .2;   // на цифре — справа от числа; на готовой 3D-сцене — в углу
        prop(ctx, p.q, p.e.kind, px, py + (k % 4) * 104, t - p.e.t, /^T-(doc|number)$/.test(s.loc) ? 560 : onClip ? 700 : W - 120); });   // у документа — на правом поле, не на шапке   // на цифре — под числом, не на шапке
      // заметка о действии: одна, текущая
      let cur = null; for (const e of ev) if (t >= e.t) cur = e;
      if (cur && !HK.final && opt.sheet !== '1' && !(/титр ролика/.test(s.framing) && t > d - 1.9)) note(ctx, cur.note, t - cur.t);   // под названием ролика заметок нет
      const fl = /вспышк|щелч|затвор|flash|фотограф|селфи/i.test(s.event + s.framing) && !/фоторамк|без вспыш/.test(s.event);
      const flh = HK.flash ? HK.flash(s) : null;
      if (flh ?? fl) flash(ctx, W * .62, H * .38, t, s.snap ?? d * .45);
      if (/серия из \d+ вспышек/.test(s.event) && /фотограф|пресс|толп|зал|телефон|селфи|бар/.test(s.event + s.framing)) for (let i = 0; i < 6; i++) flash(ctx, W * (.15 + ((i * .37) % .7)), H * (.25 + ((i * .53) % .5)), t, d * (.1 + .14 * i), .6);
    }
    function wrap(ctx, text, maxW) { const w = text.split(' '), out = []; let line = '';
      for (const x of w) { const tt = line ? line + ' ' + x : x; if (ctx.measureText(tt).width > maxW && line) { out.push(line); line = x; } else line = tt; }
      if (line) out.push(line); return out; }
    function note(ctx, text, u) {            // маленькая заметка о действии внизу справа, появляется с перелётом
      const k = u >= .2 ? 1 : outBack(u / .2);
      ctx.save(); ctx.font = "600 26px 'Segoe UI', sans-serif"; let lines = wrap(ctx, text, 560);
      if (lines.length > 2) { lines = lines.slice(0, 2); lines[1] = lines[1].replace(/\s*\S*$/, '') + '…'; }
      const w = Math.max(...lines.map(l => ctx.measureText(l).width)) + 36, h = 18 + lines.length * 34, x = W - 36 - w, y = H - 46 - h;
      ctx.translate(x + w, y + h); ctx.scale(k, k); ctx.translate(-w, -h);
      ctx.fillStyle = 'rgba(14,10,8,.82)'; ctx.strokeStyle = '#f2a94e'; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(0, 0, w, h, 12); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#f6e7c8'; ctx.textBaseline = 'top'; lines.forEach((l, i) => ctx.fillText(l, 18, 10 + i * 34)); ctx.restore();
    }
    function prop(ctx, q, kind, x, y, u, maxW = W - 120) {     // вещь в кадре: штамп (красный, с ударом), мел/маркер (рукописно), табличка/бирка (бумага)
      ctx.save(); ctx.translate(x, y);
      if (kind === 'stamp') {
        const k = u < .17 ? lerp(1.7, 1, outCubic(u / .17)) : 1; ctx.rotate(-.09); ctx.scale(k, k); ctx.globalAlpha = clamp(u / .08);
        ctx.font = "900 64px Bahnschrift, 'Arial Black', sans-serif"; const w = Math.min(maxW, ctx.measureText(q).width + 50);
        ctx.strokeStyle = '#d0302a'; ctx.lineWidth = 8; ctx.strokeRect(-w / 2, -48, w, 96); ctx.fillStyle = '#d0302a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(q, 0, 4, w - 30);
      } else if (kind === 'chalk') {
        const n = Math.ceil(q.length * clamp(u / .5)); ctx.rotate(-.03); ctx.font = "700 60px 'Segoe Print', 'Comic Sans MS', cursive"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(0,0,0,.45)'; const w = ctx.measureText(q).width + 40; ctx.beginPath(); ctx.roundRect(-w / 2, -44, w, 88, 10); ctx.fill();
        ctx.fillStyle = '#f7f3ea'; ctx.fillText(q.slice(0, n), 0, 2, W - 160);
      } else {
        const k = u >= .2 ? 1 : outBack(u / .2); ctx.scale(k, k); ctx.font = "700 40px 'Courier New', monospace"; const w = Math.min(maxW, ctx.measureText(q).width + 56);
        ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 16; ctx.fillStyle = '#efe4c8'; ctx.beginPath(); ctx.roundRect(-w / 2, -40, w, 80, 6); ctx.fill(); ctx.shadowBlur = 0;
        ctx.strokeStyle = '#3a2a18'; ctx.lineWidth = 3; ctx.stroke(); ctx.fillStyle = '#1c140c'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(q, 0, 3, w - 30);
      }
      ctx.restore();
    }
    function flash(ctx, x, y, t, t0, k = 1) {
      const u = (t - t0) / (3 / 30); if (u < 0 || u > 1) return;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(x, y, 0, x, y, 900); g.addColorStop(0, `rgba(255,255,255,${.95 * k * (1 - u)})`); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.fillStyle = `rgba(255,255,255,${.35 * k * (1 - u)})`; ctx.fillRect(0, 0, W, H); ctx.restore();
    }
    function snapsBack(ctx, t) {              // D26-B: три наших снимка (письмо, объектив, тост) падают на стол и улетают назад
      ['LETTER · NOV 8', "AGENT'S LENS", 'THE TOAST'].forEach((lab, i) => {
        const u = (t - i * .12) / .5; if (u < 0 || u > 1) return; const x = lerp(W * 1.1, -W * .2, inOutExpo(u)), y = H * (.32 + i * .16);
        for (let g = 0; g < 4; g++) { ctx.save(); ctx.globalAlpha = g ? .2 : 1; ctx.translate(x + g * 60, y); ctx.rotate((i - 1) * .12);
          ctx.fillStyle = '#f4efe2'; ctx.fillRect(-170, -120, 340, 240); ctx.fillStyle = '#2a2230'; ctx.fillRect(-150, -100, 300, 160);
          ctx.fillStyle = '#1c140c'; ctx.font = "700 24px 'Courier New', monospace"; ctx.textAlign = 'center'; ctx.fillText(lab, 0, 95); ctx.restore(); }
      });
    }

    function videoTitle(ctx, t, d) {      // название ролика поверх плана: полоса снизу, буквы проявляются
      const k = clamp((t - (d - 1.75)) / .5), title = "How China Got a Seat at Jensen Huang's Table";   // встаёт в паузу после «Washington»
      ctx.save(); const g = ctx.createLinearGradient(0, H * .45, 0, H); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${.85 * k})`);
      ctx.fillStyle = g; ctx.fillRect(0, H * .45, W, H * .55);
      ctx.globalAlpha = k; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#f1e6cc';
      ctx.font = "600 78px Georgia, 'Times New Roman', serif"; ctx.shadowColor = '#000'; ctx.shadowBlur = 18;
      ctx.fillText(title, W / 2, H * .8); ctx.restore();
    }
    function deskProps(ctx, s, t, d) {
      ctx.save(); ctx.strokeStyle = '#f1e6cc'; ctx.lineWidth = 6;
      if (/ресторан/.test(s.framing)) {
        if (/мелом/.test(s.framing)) { ctx.save(); ctx.strokeStyle = '#f4f1e8'; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(1380, 560, 170, -1.6, -1.6 + 6.283 * clamp(t / Math.max(.4, (s.snap ?? d * .5))), false); ctx.stroke(); ctx.restore(); }
        const vib = t > d * .4 ? Math.sin(t * 90) * 6 : 0; ctx.fillStyle = '#111'; ctx.beginPath(); ctx.roundRect(900 + vib, 640, 140, 260, 20); ctx.fill(); ctx.stroke();
      } else if (/вещи родителей/.test(s.framing)) {        // вещи родителей с ценниками; штамп SOLD — по словам (s.ev)
        const parts = s.event.split(/;\s*/), st = (s.ev || []).filter(e => /продан/.test(parts[e.p] || '')).map(e => e.t);
        const items = [['RADIO', 620, 330], ['SEWING MACHINE', 960, 300], ['BICYCLE', 1300, 340], ['ARMCHAIR', 640, 690], ['TABLE LAMP', 960, 720], ['WALL CLOCK', 1290, 690]];
        items.forEach(([nm, x, y], i) => {
          ctx.save(); ctx.translate(x, y); ctx.fillStyle = '#d9c9a3'; ctx.strokeStyle = '#3a2a18'; ctx.lineWidth = 5;
          if (i === 2) { ctx.beginPath(); ctx.arc(-70, 30, 55, 0, 6.283); ctx.arc(70, 30, 55, 0, 6.283); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-70, 30); ctx.lineTo(0, -30); ctx.lineTo(70, 30); ctx.stroke(); }
          else if (i === 5) { ctx.beginPath(); ctx.arc(0, 0, 80, 0, 6.283); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -55); ctx.moveTo(0, 0); ctx.lineTo(40, 0); ctx.stroke(); }
          else { ctx.beginPath(); ctx.roundRect(-110, -70, 220, 140, 14); ctx.fill(); ctx.stroke(); }
          ctx.fillStyle = '#1c140c'; ctx.font = "700 22px 'Courier New', monospace"; ctx.textAlign = 'center'; ctx.fillText(nm, 0, 110);
          ctx.fillStyle = '#f4efe2'; ctx.fillRect(60, -100, 90, 44); ctx.strokeRect(60, -100, 90, 44); ctx.fillStyle = '#1c140c'; ctx.fillText('$', 105, -70);
          const tS = st.length ? st[Math.min(st.length - 1, Math.floor(i * st.length / items.length))] : 1e9, u = t - tS;
          if (u > 0) { const k = u < .17 ? lerp(1.8, 1, u / .17) : 1; ctx.rotate(-.15); ctx.scale(k, k); ctx.strokeStyle = '#d0302a'; ctx.lineWidth = 6; ctx.strokeRect(-95, -30, 190, 60);
            ctx.fillStyle = '#d0302a'; ctx.font = "900 40px Bahnschrift, sans-serif"; ctx.fillText('SOLD', 0, 15); }
          ctx.restore();
        });
      } else if (/салфетк|Denny/.test(s.framing)) {
        ctx.strokeStyle = '#2b3a66'; ctx.lineWidth = 5;
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
      const fe = s.framing + ' ' + s.event;
      if (s.loc === 'L07-dennys' && s.ch === 2 && s.start >= NIGHT_1997) key = 'bg_diner_night_1997';          // 1993 и табличка 2023 — дневной Denny's; ночь — только с бита 1997
      if (s.loc === 'L02-sg-street' && sz === 'ws' && /машин\S* агентов нет|сухой прямоугольник|без машины/.test(fe)) key = 'bg_street_no_car';
      if (s.loc === 'L14-front-door' && /дом Дженсена|«HUANG»/.test(fe)) key = 'bg_front_door_huang';
      if (s.loc === 'L09-megaspeed' && /7ROAD|7Road/.test(fe)) key = 'bg_megaspeed_reverse_7road';
      if (s.loc === 'L16-dennys-kitchen' && /2:00 AM|ночн/.test(fe)) tint = 'rgba(45,55,105,1)';                     // ночная смена: тот же плейт в ночном свете
      if (sz === 'top') { key = 'bg_desk_topdown'; if (s.loc === 'L05-beijing') tint = 'rgba(200,90,80,1)'; }
      if (sz === 'ins' && PROP_AT[s.n] && PROP_AT[s.n][2]) key = /7ROAD|7Road/.test(s.framing + ' ' + s.event) ? 'bg_megaspeed_reverse_7road' : PROP_AT[s.n][2];
      const name = sp || nameOf(s), sizeK = sz === 'rev' && /^обратная (\S+)/.test(s.framing) && nameOf(s) ? 'ms' : sz;
      let focus = sz === 'ins' ? (PROP_AT[s.n] || SPOTS[key].prop) : name ? spotFor(key, name.split(' · ')[0]) : [.5, .5];
      const lensPov = sz === 'pov' && s.loc === 'L01-restaurant';      // объектив агента в зале: смотрит на их стол, а не в окно
      if (sz === 'pov') focus = lensPov ? [.5, .64] : [.89, .38];
      let wu = null, WA, WB;
      if (s.whip) { WA = spotFor(key, s.whip.from); WB = spotFor(key, s.whip.to); wu = inOutExpo((t - s.whip.t + .1) / WHIP_DUR); focus = [lerp(WA[0], WB[0], wu), lerp(WA[1], WB[1], wu)]; }
      const baseZ = ZOOM[sz] * (s.whip && sz === 'ws' ? 1.5 : 1);
      const center = f => (sz === 'ws' || sz === 'rev' || sz === 'top') && !s.whip ? [.5 + cam.dx, .5 + cam.dy] : [clamp(f[0] + cam.dx), clamp(f[1] + cam.dy)];
      const v = plateView(baseZ * cam.z, center(focus));
      ctx.save(); ctx.translate(cam.sh, cam.sh * .5);
      const blur = sz === 'cu' || sz === 'xcu' || sz === 'ms';
      drawImg(ctx, blur && !flip ? blurOf(key) : I[key], v, flip, tint);
      // смаз вип-пана — в shot(): весь кадр (фон и герои) смазывается одним проходом, без копий-призраков
      if (blur && flip) { ctx.filter = 'none'; }
      if (sz === 'top' && s.loc === 'L05-beijing') chess(ctx, t, d);
      ctx.restore();
      // герои
      const fh = FIG_H[sizeK], people = s.whip ? [s.whip.from, s.whip.to] : lensPov ? ['JENSEN', 'ALICE'] : sz === 'pov' ? ['JENSEN'] : sz === 'ins' || sz === 'top' ? [] : name ? name.split(' · ') : [];
      const empty = /пуст/.test(s.framing);
      if (!empty) people.forEach((nm, i) => {
        const p = lensPov ? [W * (i ? .7 : .3), H * .6] : sz === 'pov' ? [W / 2, H * .5] : toScreen(v, s.whip ? spotFor(key, nm) : people.length > 1 ? (i === 2 ? [(SPOTS[key].a[0] + SPOTS[key].b[0]) / 2, (SPOTS[key].a[1] + SPOTS[key].b[1]) / 2] : SPOTS[key][i % 2 ? 'b' : 'a']) : (flip ? [1 - focus[0], focus[1]] : spotFor(key, nm)));
        const isSp = s.whip ? nm === (t < s.whip.t ? s.whip.from : s.whip.to) : !!sp && (sp === nm || (sp === 'JENSEN' && /JENSEN/.test(nm)));
        figure(ctx, p[0], p[1] + fh * .15, fh, lensPov ? nm + ' (in the lens)' : sz === 'pov' ? (s.loc === 'L02-sg-street' ? 'JENSEN (in the window)' : 'JENSEN (in the viewfinder)') : nm, sz !== 'pov' && (isSp || (people.length === 1 && !!sp && !nameOf(s))));
      });
      const mk = sz === 'ins' ? toScreen(v, focus) : people.length ? toScreen(v, spotFor(key, people[0])) : [W / 2, H / 2];
      void mk;
      if (sz === 'pov') viewfinder(ctx, t);
      if (lensPov) tag3d(ctx, "AGENT'S LENS from behind the menu: Jensen + Alice at their table");
      if (sz === 'ins' && /край стола/.test(s.framing)) chipUnderTable(ctx, t, s.snap ?? d * .5);
      if (s.loc === 'L03-host-office') hostProps(ctx, s, t, d, sz);
      if (sz === 'ins' && /монитор|экран|планшет|график|селфи|ноутбук/.test(s.framing)) screen(ctx, t);
      if (sz === 'ins' && /вставка доска/.test(s.framing) && s.loc === 'L04-washington') whiteboard(ctx, t);
      if (sz === 'ins' && /ящик стола/.test(s.framing)) drawer(ctx, t, s.snap ?? d * .5);
      if (sz === 'ins' && /шахмат|ворот/.test(s.framing) && s.loc === 'L05-beijing') { ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(1.25, 1.25); ctx.translate(-W / 2, -H / 2); chess(ctx, t, d); ctx.restore(); }
      if (/галерея/.test(s.framing)) gallery(ctx, t, s.snap ?? d * .7);
      if (sz === 'ws' && /объектив/.test(s.event) && s.loc === 'L01-restaurant' && !/пуст/.test(s.framing)) figure(ctx, W * .62, H * .5, 120, 'AGENT (menu + lens)', false);
      if (sz === 'ins' && /снимк/.test(s.framing)) {   // снимки падают стопкой (заглушка)
        const n = Math.min(4, Math.floor(t / Math.max(.3, d * .15)) + 1);
        for (let i = 0; i < n; i++) { ctx.save(); ctx.translate(W * (.38 + i * .07), H * (.42 + i * .05)); ctx.rotate((i % 2 ? 1 : -1) * .08 * (i + 1));
          ctx.fillStyle = '#f4efe2'; ctx.fillRect(-190, -150, 380, 300); ctx.fillStyle = '#2a2230'; ctx.fillRect(-170, -130, 340, 220);
          ctx.fillStyle = '#e8c9a0'; ctx.beginPath(); ctx.arc(-60, -30, 40, 0, 6.283); ctx.arc(70, -25, 40, 0, 6.283); ctx.fill(); ctx.restore(); }
      }
      if (flip) tag3d(ctx, 'REVERSE (mirrored plate — no reverse plate)');
      else if (NEWP[s.loc]) tag3d(ctx, NEWP[s.loc][1]);
    }
    function drawClip(ctx, [key, from, to, rate0], t, d, cam) {      // готовая 3D-сцена: время ±25 % под длину плана, иначе обрезка / стоп-кадр
      const fr = CLIPI[key], rate = rate0 ?? clamp((to - from) / d, .8, 1.25), pos = Math.min(from + t * rate, to - 1 / CLIP_FPS);
      const im = fr[clamp(Math.floor(pos * CLIP_FPS), 0, fr.length - 1)];
      drawImg(ctx, ok(im) ? im : null, cam && cam.kind !== 'static' ? plateView(Math.min(1.25, cam.z), [.5 + cam.dx, .5 + cam.dy]) : { Z: 1, l: 0, tp: 0 });
    }
    function chipUnderTable(ctx, t, tSnap) {   // заглушка D02-A: под краем скатерти рука в чёрной перчатке со стороны Алисы просовывает светящийся чип
      const k = clamp((t - .15) / Math.max(.4, tSnap - .15)), x = lerp(W * 1.02, W * .5, outCubic(k)), y = H * .64;
      ctx.save(); ctx.fillStyle = '#0b0a0e'; ctx.fillRect(0, 0, W, H);
      const g = ctx.createRadialGradient(x - 210, y, 0, x - 210, y, 420); g.addColorStop(0, 'rgba(80,255,140,.55)'); g.addColorStop(1, 'rgba(80,255,140,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#3a1f1f'; ctx.fillRect(W * .08, H * .52, 34, H * .5); ctx.fillRect(W * .86, H * .52, 34, H * .5);           // ножки стола
      ctx.save(); ctx.translate(x - 230, y - 6); ctx.rotate(-.06); ctx.fillStyle = '#c9a54a';                                       // чип: кристалл с выводами
      for (let i = -3; i <= 3; i++) { ctx.fillRect(i * 22 - 4, -78, 8, 18); ctx.fillRect(i * 22 - 4, 60, 8, 18); ctx.fillRect(-98, i * 18 - 4, 18, 8); ctx.fillRect(80, i * 18 - 4, 18, 8); }
      ctx.fillStyle = '#1f9a4c'; ctx.strokeStyle = '#d8ffe4'; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(-80, -60, 160, 120, 10); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#7dffb0'; ctx.fillRect(-40, -30, 80, 60); ctx.restore();
      ctx.fillStyle = '#121216'; ctx.strokeStyle = '#3c3c46'; ctx.lineWidth = 3;                                                   // рука в чёрной перчатке
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.roundRect(x - 190, y - 70 + i * 34, 120, 26, 13); ctx.fill(); ctx.stroke(); }
      ctx.beginPath(); ctx.ellipse(x - 30, y - 10, 110, 80, 0, 0, 6.283); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.roundRect(x - 120, y + 40, 90, 34, 17); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#2a2a33'; ctx.fillRect(x + 60, y - 70, W, 130);                                                              // манжета уходит за кадр
      ctx.fillStyle = '#efe7d6'; ctx.fillRect(0, 0, W, H * .36); ctx.beginPath(); ctx.moveTo(0, H * .36);                         // край скатерти с фестонами
      for (let i = 0; i < 24; i++) ctx.quadraticCurveTo(W * (i + .5) / 24, H * .36 + 26, W * (i + 1) / 24, H * .36);
      ctx.lineTo(W, 0); ctx.lineTo(0, 0); ctx.fill();
      const g2 = ctx.createRadialGradient(x - 210, H * .34, 0, x - 210, H * .34, 300); g2.addColorStop(0, 'rgba(90,255,140,.45)'); g2.addColorStop(1, 'rgba(90,255,140,0)');
      ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H * .42); ctx.restore();
      tag3d(ctx, "D02-A placeholder: gloved hand (Alice's side, no face) slides a glowing chip under the tablecloth");
    }
    function hostProps(ctx, s, t, d, sz) {      // кабинет ведущего: коробка Nvidia и латунный ключ, которых нет на плейте
      const f = s.framing + ' ' + s.event;
      if (/коробк/.test(s.framing) || (sz === 'ws' && /коробк/.test(f))) {
        const bx = sz === 'ins' ? W * .5 : W * .56, by = sz === 'ins' ? H * .58 : H * .52, sc = sz === 'ins' ? 1 : .32, tap = /стучит/.test(f) && Math.sin(t * 22) > .6 ? 4 : 0;
        ctx.save(); ctx.translate(bx, by + tap); ctx.scale(sc, sc); ctx.fillStyle = '#121214'; ctx.strokeStyle = '#3a3a40'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.roundRect(-330, -170, 660, 340, 14); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#76b900'; ctx.fillRect(-330, -30, 660, 60);
        ctx.fillStyle = '#f1f1f1'; ctx.font = "800 64px Bahnschrift, sans-serif"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('NVIDIA', 0, -95); ctx.restore();
      }
      if (/ключ/.test(f) && sz !== 'ws') {
        const big = sz === 'xcu' || /ключ к камере/.test(s.framing), kx = big ? W * .52 : W * .58, ky = big ? H * .48 - Math.min(1, t / .8) * 60 : H * .55, sc = big ? 1.6 : .7;
        ctx.save(); ctx.translate(kx, ky); ctx.scale(sc, sc); ctx.rotate(-.5 + .08 * Math.sin(t * 2)); ctx.fillStyle = '#d4a548'; ctx.strokeStyle = '#7a5418'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.arc(-120, 0, 52, 0, 6.283); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#2a1a0a'; ctx.beginPath(); ctx.arc(-120, 0, 20, 0, 6.283); ctx.fill();
        ctx.fillStyle = '#d4a548'; ctx.fillRect(-70, -12, 220, 24); ctx.strokeRect(-70, -12, 220, 24); ctx.fillRect(110, 12, 20, 34); ctx.fillRect(140, 12, 14, 24);
        const gl = .5 + .5 * Math.sin(t * 5); ctx.fillStyle = `rgba(255,250,220,${.5 * gl})`; ctx.beginPath(); ctx.arc(-138, -22, 10, 0, 6.283); ctx.fill(); ctx.restore();
      }
    }
    function screen(ctx, t) {                    // экран/монитор/планшет крупно: рамка; на нём — вещи из колонки «событие»
      ctx.save(); ctx.fillStyle = '#0d0f14'; ctx.strokeStyle = '#2e3340'; ctx.lineWidth = 14; ctx.beginPath(); ctx.roundRect(W * .2, H * .1, W * .6, H * .62, 22); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(80,160,220,.16)'; ctx.fillRect(W * .2 + 20, H * .1 + 20, W * .6 - 40, H * .62 - 40); ctx.restore();
    }
    function drawer(ctx, t, tS) {           // ящик стола выдвигается к камере, в нём зелёная коробочка с чипом; на ударном слове крышка открывается
      const k = outCubic(clamp(t / Math.max(.4, tS))), y = lerp(H * .62, H * .5, k);
      ctx.save(); ctx.fillStyle = '#3b2416'; ctx.strokeStyle = '#1c0f08'; ctx.lineWidth = 8; ctx.fillRect(W * .2, y, W * .6, H * .42); ctx.strokeRect(W * .2, y, W * .6, H * .42);
      ctx.fillStyle = '#2a170d'; ctx.fillRect(W * .23, y + 30, W * .54, H * .34); ctx.fillStyle = '#c9a54a'; ctx.fillRect(W * .46, y - 22, W * .08, 18);
      ctx.fillStyle = '#121214'; ctx.fillRect(W * .38, y + 70, W * .24, H * .2); ctx.fillStyle = '#76b900'; ctx.fillRect(W * .38, y + 70 + H * .08, W * .24, 22);
      if (t > tS) { const g = ctx.createRadialGradient(W / 2, y + 120, 0, W / 2, y + 120, 260); g.addColorStop(0, 'rgba(90,255,140,.5)'); g.addColorStop(1, 'rgba(90,255,140,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
      ctx.restore();
    }
    function whiteboard(ctx, t) {                // D08-B: доска с датами вставкой (без общего плана исписанной стены)
      ctx.save(); ctx.fillStyle = '#eef0ea'; ctx.strokeStyle = '#8b8f96'; ctx.lineWidth = 12; ctx.fillRect(W * .12, H * .12, W * .5, H * .62); ctx.strokeRect(W * .12, H * .12, W * .5, H * .62);
      ctx.fillStyle = '#1d3f8a'; ctx.font = "700 64px 'Segoe Print', 'Comic Sans MS', cursive"; ctx.fillText('APR: BLOCKED', W * .16, H * .3); ctx.fillText('AUG: 15%', W * .16, H * .48);
      ctx.fillStyle = '#c03a2b'; ctx.fillRect(W * .16, H * .52, W * .4, 8); ctx.restore();
    }
    function gallery(ctx, t, tEnd) {             // снимок сжимается в сетку галереи той ночи
      const k = outCubic(clamp(t / Math.max(.5, tEnd))), n = Math.round(lerp(1, 8, k)), cw = W / n, ch = H / n;
      ctx.save(); ctx.fillStyle = '#100c0a'; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const h = ((i * 7 + j * 13) % 9) / 9; ctx.fillStyle = '#f4efe2'; ctx.fillRect(i * cw + 6, j * ch + 6, cw - 12, ch - 12);
        ctx.fillStyle = `rgb(${40 + 60 * h | 0},${30 + 30 * h | 0},${30 + 20 * h | 0})`; ctx.fillRect(i * cw + 12, j * ch + 12, cw - 24, ch * .72); }
      ctx.restore();
    }
    function chess(ctx, t, d) {
      const s0 = 70, x0 = 960 - s0 * 4, y0 = 540 - s0 * 4;
      for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { ctx.fillStyle = (i + j) % 2 ? 'rgba(20,10,10,.85)' : 'rgba(230,210,180,.85)'; ctx.fillRect(x0 + i * s0, y0 + j * s0, s0, s0); }
      const k = ease((t - d * .3) / (d * .5)); ctx.fillStyle = '#f1e6cc'; ctx.strokeStyle = '#000'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(x0 + s0 * 7.5, y0 + s0 * .5, 24, 0, 6.283); ctx.fill(); ctx.stroke();                      // фигура-чип
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(lerp(x0 + s0 * 1.5, x0 + s0 * 4.5, k), lerp(y0 + s0 * 6.5, y0 + s0 * 3.5, k), 28, 0, 6.283); ctx.fill(); ctx.stroke();   // «Белый дом»
    }
    function towers(ctx, t, d, cam) {   // D03-B, заглушка 3D-города: башни-компании без названий, зелёная NVIDIA обгоняет всех
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#070a16'); g.addColorStop(1, '#1b2340'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.save(); ctx.translate(W / 2, H); ctx.scale(cam.z, cam.z); ctx.translate(-W / 2, -H + (1 - ease(t / d)) * 120);
      const rise = outBack(clamp((t - .15) / Math.max(.4, d * .55)));
      for (let i = 0; i < 13; i++) { const x = 80 + i * 140, h = 220 + ((i * 97) % 5) * 70, nv = i === 6, hh = nv ? lerp(260, 780, rise) : h;
        ctx.fillStyle = nv ? '#2f8f4e' : '#2a3150'; ctx.strokeStyle = nv ? '#9dffb5' : '#4a5378'; ctx.lineWidth = 3;
        ctx.fillRect(x, H - hh, 110, hh); ctx.strokeRect(x, H - hh, 110, hh);
        ctx.fillStyle = nv ? 'rgba(200,255,210,.6)' : 'rgba(255,214,150,.35)';
        for (let y = H - hh + 20; y < H - 20; y += 38) for (const wx of [18, 62]) if (((x + y + wx) * 7) % 5 > 1) ctx.fillRect(x + wx, y, 28, 16);
        if (nv && rise > .9) { ctx.fillStyle = '#eaffea'; ctx.font = "900 72px Bahnschrift, sans-serif"; ctx.textAlign = 'center'; ctx.fillText('#1', x + 55, H - hh - 30); } }
      ctx.restore();
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
        const z = s.box ? Math.min(1.2, cam.z) : (ZOOM[sz] || 1.04) * cam.z;
        const v = plateView(z, s.box ? [.5 + cam.dx, .5 + cam.dy] : [focus[0] + cam.dx, focus[1] + cam.dy]);
        ctx.save(); ctx.translate(cam.sh, 0); drawImg(ctx, ok(fr) ? fr : null, v); ctx.restore();
        if (name && !s.box) { const p = toScreen(v, spotFor('box', name)); figure(ctx, p[0], p[1], FIG_H[sz] || 200, name, !!sp); }
        if (!s.box) eventMark(ctx, W / 2, H / 2, t, d);
        tag3d(ctx, `3D: ${what}` + (s.box ? `  (box_path_v2 ${s.box.from.toFixed(1)}–${s.box.to.toFixed(1)} s)` : ''));
        return;
      }
      if (s.loc === '3D-kitchen') { kitchen(ctx, s, t, d); tag3d(ctx, '3D: ' + what); return; }
      if (s.loc === '3D-conveyor') { conveyor(ctx, t, d); tag3d(ctx, '3D: ' + what); return; }
      const f3 = s.framing + ' ' + s.event;
      if (/башен/.test(s.framing)) { towers(ctx, t, d, cam); tag3d(ctx, '3D (placeholder): ' + what); return; }
      const PL = /Аляск/.test(f3) ? ['bg_washington_cold', [.62, .28], 1.3, 1.9] : /Сингапур/.test(f3) && !/отъезд над/.test(f3) ? ['bg_singapore_street', [.6, .45], 1.25, 1.6] : /Вашингтон|Капитол/.test(f3) && /пролёт/.test(f3) ? ['bg_washington_cold', [.62, .28], 1.5, 2.1]
        : /Тайбэ/.test(f3) ? ['bg_taipei_bar_dry', [.13, .28], 1.8, 2.4] : /отъезд над городом/.test(f3) ? ['bg_singapore_street', [.5, .4], 1.6, 1.05]
        : s.loc === '3D-phone-desk' ? ['bg_washington_cold', [.37, .7], 2.0, 2.3] : s.loc === '3D-hq-corridor' ? ['bg_nvidia_office_reverse', [.27, .42], 1.5, 2.6] : null;
      const [key, c, z0, z1] = PL || ['bg_desk_topdown', [.5, .5], 1.04, 1.1];
      const v = plateView(lerp(z0, z1, ease(t / d)), c);
      const sh = s.loc === '3D-phone-desk' && t > d * .2 ? Math.sin(t * 70) * 5 : 0;
      ctx.save(); ctx.translate(sh, 0); drawImg(ctx, I[key], v); ctx.restore();
      if (s.loc === '3D-phone-desk') eventMark(ctx, W / 2, H / 2, t, d);
      tag3d(ctx, '3D: ' + what);
    }

    // для HK.plate: рисовальщики и данные ядра
    const API = { I, CLIPI, plateView, drawImg, toScreen, blurOf, viewfinder, flash, prop, evList, eventTimes, chipUnderTable, hostProps, deskProps, drawClip, opt, stage };

    // ---------- сцены ----------
    const f0 = +opt.f0 || 0, total = timing.total, fEnd = opt.f1 ? Math.min(+opt.f1, Math.round(total * FPS)) : Math.round(total * FPS);
    const T0 = f0 / FPS, T1 = fEnd / FPS;
    const scenes = timing.shots.filter(s => s.end > T0 + 1e-6 && s.start < T1 - 1e-6).map(s => ({
      id: 's' + s.n, from: s.start - T0, to: s.end - T0, look: { bloom: 0, dof: false, fogDensity: 0, vignette: 0, bg: 0x000000 },
      over: (t, f) => { f.ctx.save(); shot(f.ctx, s, t - (s.start - T0)); f.ctx.restore(); },
    }));
    return { duration: T1 - T0, frames: fEnd - f0, scenes };
  }
}
