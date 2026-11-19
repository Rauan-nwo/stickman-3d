// sound/cues_manual.mjs — звук планов с настоящими героями и нативных 3D-сцен (пилот, гл. 0–1).
// План находится НЕ по номеру (номера меняются при вставке планов), а по главе + месту + крупности (framing) — m(s).
// Время каждого звука — по той же формуле, по которой film/shots.js двигает героя/предмет (s.snap, s.whip, s.ev, слово голоса),
// поэтому после перетайминга звук переезжает вместе с картинкой. t — секунды от начала плана.
// replace — какие общие правила cues.mjs для плана отключить (их заменяет ручная постановка):
//   'foley' (фоли по словам события), 'shake' (толчок камеры без вещи), 'props' (штамп/бирка из события), 'snap' (рывок),
//   'flash', 'pan', 'cut', 'year', 'doc', 'card', 'whip', 'kick'.
// 3D-планы рисуются нативной сценой со своей камерой: время событий в них снято с картинки (vis.py) и записано долями плана.

let TIMING = null; export const setTiming = t => { TIMING = t; };
const F = (ch, loc, re) => s => s.ch === ch && s.loc === loc && re.test(s.framing);

// дубль desk3d (вашингтонский стол, планы «+ титр ролика» и «папка со снимком» одним дублем): телефон звонит очередями
// по 0.9 с каждые 2 с от 0.41 с дубля (снято с картинки: дрожь трубки и «волны» звонка).
const DESK_START = () => (TIMING.shots.find(x => x.loc === '3D-phone-desk') || { start: 0 }).start;
const RINGS = (s) => { const off = s.start - DESK_START();
  return [0, 1, 2, 3].map(k => .41 + 2 * k - off).filter(t => t > -.85 && t < s.dur - .05)
    .map((t, k) => ({ t: Math.max(0, t), snd: 'phone.ring', align: 'span', dur: Math.min(.9 + Math.min(0, t), s.dur - Math.max(0, t)), what: `звонит дисковый телефон, трубка дрожит`, vis: 'formula' })); };

export const BED_OVERRIDE = [
  [F(1, 'L08-kentucky', /у школы/), 'dorm'],          // постановка — спальня с сундуком
  [F(1, 'L08-kentucky', /ведро и швабра/), 'bathroom'],
];

export const MANUAL = [
  // ---------- гл. 0 ----------
  { m: F(0, 'L01-restaurant', /^общий двое за столом/), f: (s, h) => ({ replace: ['foley', 'shake'], cues: [
    { t: .75, snd: 'glint', gain: -6, pan: .5, what: 'блик объектива агента за дальним столиком' },
  ] }) },
  { m: F(0, '3D-city', /башен/), f: (s, h) => ({ replace: ['snap', 'pan', 'shake', 'props', 'foley'], cues: [   // нативная 3D: подъём, башня растёт, «#1»
    { t: .05, snd: 'air.move', align: 'span', dur: s.dur * .9, gain: -4, what: 'подъём камеры над городом' },
    { t: .27 * s.dur, snd: 'riser.tower', align: 'span', dur: .443 * s.dur, what: 'зелёная башня NVIDIA растёт выше всех' },
    { t: .713 * s.dur, snd: 'hit.reveal', what: '«#1» загорается на шпиле (снято с картинки)', vis: 'appear' },
    { t: .713 * s.dur, snd: 'glint', gain: -4, what: 'свечение «#1»' },
  ] }) },
  { m: F(0, 'L01-restaurant', /^POV объектив агента/), f: (s, h) => { const ts = s.snap ?? 1.4; return { replace: ['snap', 'flash', 'foley', 'shake'], cues: [
    { t: .12, snd: 'chair.scrape', align: 'span', dur: .8, gain: -4, pan: .4, what: 'Алиса садится (стул)' },
    { t: ts - .14, snd: 'af.beep', gain: -2, what: 'рамка фокуса захватывает Алису' },
    { t: ts, snd: 'shutter', what: 'щелчок затвора, кадр застывает снимком', vis: 'flash' },
  ] }; } },
  { m: F(0, 'T-doc', /папка разведки/), f: (s, h) => ({ replace: ['foley', 'shake'], cues: [   // OVER[4]: снимок падает на скрепку
    { t: .44, snd: 'photo.drop', what: 'снимок Алисы ложится на папку' },
    { t: .56, snd: 'clip.snap', gain: -4, what: 'скрепка прижимает снимок' },
    ...((s.ev || []).filter(e => e.p === 2).map(e => ({ t: e.t, snd: 'hit.event', gain: 2, what: 'толчок документа на «believes»', vis: 'motion' }))),
  ] }) },
  { m: F(0, 'L01-restaurant', /^крупно Дженсен$/), f: (s, h) => { const tj = s.snap ?? 2; return { replace: ['foley', 'shake'], cues: [
    { t: tj - .3, snd: 'cloth.rustle', gain: -6, what: 'рука к лацкану кожанки' },
    { t: tj + .3, snd: 'glint', gain: -8, what: 'блик на кожанке' },
  ] }; } },
  { m: F(0, 'L01-restaurant', /^обратная Алиса/), f: (s, h) => ({ replace: ['foley', 'shake'], cues: [
    { t: .45, snd: 'glint', gain: -8, pan: .5, what: 'блик объектива агента за дальним столиком' },
    { t: Math.min(.8, s.dur - .55), snd: 'glasses.tick', gain: -6, what: 'Алиса поправляет очки' },
  ] }) },
  { m: F(0, 'L01-restaurant', /^средний Алиса/), f: (s, h) => { const tc = s.snap ?? 1.6, tOne = h.W('one', .55), tBig = h.W('biggest', 1.1); return { replace: ['foley', 'shake', 'props'], cues: [
    { t: tOne + .06, vt: tOne, snd: 'box.set', pan: -.2, what: 'первый ящик ставят у её стула (box.set: хвост записи crate.set со скрипом + гитара + зал давали AST «Hoot/Owl» 0.15, 19.11)', vis: 'appear' },
    { t: tBig + .06, vt: tBig, snd: 'crate.set', gain: -1, pan: .3, what: 'второй ящик', vis: 'appear' },
    { t: tc, snd: 'paper.place', gain: -4, what: 'бирка «VIP CUSTOMER» (бумага: tag.pop и tag.slap в сумме с ящиками и нотой гитары давали AST «Owl» 0.10–0.16, проверка 19.11)', vis: 'appear' },
    { t: tc - .45, snd: 'paper.slide', align: 'span', dur: .6, gain: -5, what: 'папка с заказом едет к Дженсену' },
  ] }; } },
  { m: F(0, 'L01-restaurant', /бокал/), f: (s, h) => { const tw = s.whip?.t ?? s.dur * .5, al = h.lineSpan('ALICE', s.start, s.end), tClink = Math.max((al ? al[1] - s.start : tw + .8) + .12, s.dur - .62);
    return { replace: ['foley', 'shake'], cues: [
      { t: .15, snd: 'glass.lift', gain: -8, what: 'Дженсен поднимает бокал' },
      { t: tClink, snd: 'glass.clink', what: 'бокалы встречаются — «дзынь», искра', vis: 'formula' },
    ] }; } },
  { m: F(0, 'L01-restaurant', /край стола снизу/), f: (s, h) => { const ts = s.snap ?? .9; return { replace: ['foley', 'shake'], cues: [
    { t: .05, snd: 'cloth.slide', align: 'span', dur: Math.max(.3, ts - .05), gain: -4, sweep: [.6, .1], what: 'рука в перчатке просовывает чип из-под скатерти' },
    { t: ts, snd: 'chip.pulse', what: 'чип вспыхивает зелёным сквозь ткань', vis: 'formula' },
  ] }; } },
  { m: F(0, '3D-boxpath', /склад/), f: (s, h) => ({ replace: ['foley', 'shake'], cues: [
    { t: .35, snd: 'motor.hum', align: 'span', dur: s.dur * .7, gain: -8, what: 'электропогрузчик едет к камере' },
    { t: 2.1 + 1 / 30, vt: 2.1, snd: 'whoosh.cut', align: 'apex', what: 'склейка внутри 3D-сцены: коробка крупно (сцена идёт в своём темпе, 63-й кадр)', vis: 'cut' },
  ] }) },
  { m: F(0, 'L02-sg-street', /^общий улица/), f: (s, h) => ({ replace: ['foley', 'shake'], cues: [
    { t: .35, snd: 'thunder.far', gain: -6, what: 'проезд к машине под дождём (далёкий гром)' },
  ] }) },
  { m: s => s.ch === 0 && s.loc === 'L02-sg-street' && /^средний агенты в салоне$/.test(s.framing), f: (s, h) => { const tYear = h.W('year', s.dur - .3); return { replace: ['foley', 'shake', 'props'], cues: [
    { t: 0, snd: 'tape.reels', align: 'span', dur: s.dur, gain: -4, what: 'крутятся бобины магнитофона' },
    { t: .3, snd: 'tape.clack', align: 'span', n: 12, dur: Math.max(.4, tYear - .3), gain: -6, what: 'кассеты с бирками JAN…DEC встают в ряд' },
    { t: .5, snd: 'headphone', gain: -6, what: 'агент прижимает наушник' },
  ] }; } },
  { m: F(0, 'L02-sg-street', /^крупно агент 1/), f: (s, h) => { const ta = s.snap ?? 1; return { replace: ['foley', 'shake'], cues: [
    { t: 0, snd: 'tape.reels', align: 'span', dur: s.dur, gain: -8, what: 'бобины (за кадром)' },
    { t: ta - .3, snd: 'headphone', gain: -4, what: 'прижимает наушник' },
  ] }; } },
  { m: F(0, 'L01-restaurant', /^POV объектив из-за меню/), f: (s, h) => ({ replace: ['foley', 'shake', 'snap'], cues: [
    { t: .2, snd: 'servo', align: 'span', dur: 1.1, gain: -8, what: 'рамка фокуса скользит с Алисы' },
    { t: .76, snd: 'body.pass', align: 'apex', gain: -4, sweep: [-.6, .6], what: 'официант проходит перед объективом' },
    { t: 1.4, snd: 'af.beep', gain: -2, what: 'рамка нашла Дженсена' },
  ] }) },
  { m: F(0, 'L01-restaurant', /снимки на столике/), f: (s, h) => { const ts = s.snap ?? .72, times = [.06, Math.max(.3, ts - .32), ts]; return { replace: ['foley', 'shake'], cues:
    times.map((t0, k) => ({ t: t0 + .12, vt: t0, snd: 'photo.drop', gain: k === 2 ? 0 : -3, pan: [-.1, .15, 0][k], what: `снимок ${k + 1} падает на столик агента`, vis: 'appear' })) }; } },
  { m: F(0, 'L01-restaurant', /^крупно Дженсен смеётся/), f: (s, h) => ({ replace: ['foley', 'shake'], cues: [
    { t: .3, snd: 'chair.creak', gain: -5, what: 'Дженсен откидывается на спинку' },
  ] }) },
  { m: F(0, 'L02-sg-street', /вип-пан/), f: (s, h) => { const a1 = h.lineSpan('AGENT', s.start, s.end), tClose = a1 ? a1[1] - s.start + .15 : s.dur - .5; return { replace: ['foley', 'shake', 'props'], cues: [
    { t: 0, snd: 'tape.reels', align: 'span', dur: s.dur, gain: -8, what: 'бобины' },
    { t: .12, snd: 'tablet.ping', gain: -4, what: 'на планшет приходит снимок' },
    { t: 1.05, snd: 'headphone', gain: -4, what: 'агент 2 опускает наушники' },
    { t: tClose + .25, snd: 'folder.close', what: 'агент закрывает папку «SUBJECT: ALICE HUANG»', vis: 'formula' },
  ] }; } },
  // ---------- гл. 1 (кабинет ведущего): времена — по формулам film/shots.js (ключи '1|HOST: Evening.' … '1|to every one of them.') ----------
  { m: F(1, 'L03-host-office', /^общий кабинет/), f: (s, h) => ({ replace: ['foley', 'shake'], cues: [   // лампа: вкл .10, мигает .16–.22 и .28–.34
    { t: .1, snd: 'switch.click', what: 'лампа щёлкает и загорается', vis: 'flash' },
    { t: .16, snd: 'lamp.flicker', gain: -8, what: 'свет мигает дважды' },
    { t: .12, snd: 'lamp.buzz', align: 'span', dur: Math.max(.5, s.dur - .12), gain: -6, what: 'гудит нить лампы' },
    { t: .5, snd: 'cloth.rustle', gain: -8, what: 'ведущий приподнимает котелок' },
  ] }) },
  { m: F(1, 'L03-host-office', /рука на коробке/), f: (s, h) => { const tb = h.W(/^box/i, s.snap ?? .6); return { replace: ['foley', 'shake'], cues: [
    { t: tb + .02, snd: 'box.pat', what: 'ладонь ложится на крышку коробки NVIDIA', vis: 'formula' },
    { t: tb, snd: 'lamp.flicker', gain: -12, what: 'лампа вздрагивает (кадр темнеет)' },
  ] }; } },
  { m: F(1, 'L03-host-office', /вставка коробка Nvidia/), f: (s, h) => { const taps = [h.W(/^it/, .1), h.W('expensive', .45)]; return { replace: ['foley', 'shake'], cues: [
    ...taps.map((t0, k) => ({ t: t0 + .04, snd: 'box.tap', gain: k ? 0 : -1, what: `палец стучит по крышке (${k + 1})`, vis: 'formula' })),
    ...taps.map(t0 => ({ t: t0 + .08, snd: 'dust.puff', gain: -10, what: 'с крышки слетает пыль' })),
  ] }; } },
  // гл. 1, планы с ключом и коробкой: время — по словам, как в film/shots.js (W_ / W0): «Inside», «wanted», «chips», «Earth», «Thirty», «maker's», «table», «key»
  { m: F(1, 'L03-host-office', /ключ/), f: (s, h) => { const w = re => { const a = h.wordAt(re, s.start, s.end); return a == null ? null : a - s.start; };
    const ti = w(/^inside/i), tw = w(/^wanted/i), tc = w(/^chips/i), te = w(/^earth/i), tt = w(/^table/i), tk = w(/^key/i), cs = [];
    if (ti != null) cs.push({ t: ti + .1, snd: 'key.jingle', gain: -3, what: 'латунный ключ поднимается к объективу, в свет лампы' });
    if (tw != null) cs.push({ t: tw, snd: 'box.lid', align: 'span', dur: .45, gain: -4, what: 'крышка коробки приоткрывается' }, { t: tw + .1, snd: 'chip.glow', what: 'из щели бьёт зелёный свет', vis: 'formula' });
    if (tc != null) cs.push({ t: tc + .05, snd: 'chip.pulse', gain: -4, what: 'зелёный свет вспыхивает на «chips»' });
    if (te != null) cs.push({ t: te + .05, snd: 'glint', gain: -4, what: 'блик на ключе' });
    if (tt != null) cs.push({ t: tt - .1, snd: 'photo.pat', what: 'ладонь ложится на снимок', vis: 'formula' });
    if (tk != null) cs.push({ t: Math.max(.05, tk - .12), snd: 'whoosh.small', align: 'apex', gain: -6, what: 'ключ выброшен прямо в объектив' }, { t: tk + .06, snd: 'glint', gain: -2, what: 'блик на бородке ключа' });
    return { replace: ['foley', 'shake'], cues: cs }; } },
  { m: F(1, 'L03-host-office', /ценник на коробке/), f: (s, h) => ({ replace: ['foley', 'shake', 'props'], cues: [
    { t: h.W(/^thirty/i, 0) + .3, snd: 'tag.slap', gain: -2, what: 'ценник «$30,000 EACH» садится на коробку', vis: 'formula' },
  ] }) },
  { m: F(1, 'L03-host-office', /бирка источника/), f: (s, h) => { const tm = h.W(/^maker/i, (s.ev || [])[0]?.t ?? s.snap ?? .8); return { replace: ['foley', 'shake', 'props'], cues: [
    { t: tm, snd: 'tag.pop', what: 'на ценнике встаёт строка «SOURCE: NVIDIA», ценник вздрагивает', vis: 'appear' },
  ] }; } },
  { m: F(1, 'L03-host-office', /снимок под лампой/), f: (s, h) => { const te = (s.ev || [])[0]?.t ?? .5, tm = s.snap ?? 1.2; return { replace: ['foley', 'shake'], cues: [
    { t: te, snd: 'paper.slide', align: 'span', dur: .35, gain: -2, what: 'ладонь пододвигает снимок «Дженсен + Алиса» под лампу' },
    { t: tm + .04, snd: 'glint', gain: -6, what: 'блик ключа на снимке' },
  ] }; } },
  { m: F(1, 'T-desk', /сверху стол ресторана/), f: (s, h) => { const tc = (s.ev || [])[0]?.t ?? s.dur * .4; return { replace: ['foley', 'shake', 'props'], cues: [
    { t: tc - .05, snd: 'string.pull', align: 'span', dur: .45, what: 'красная нить BEIJING тянется к пустой карточке', vis: 'formula' },
    { t: tc + .4, snd: 'tag.tick', gain: -4, what: 'нить завязывается на карточке' },
  ] }; } },
  { m: F(1, 'T-desk', /карточка у пустого стула/), f: (s, h) => { const ts = s.snap ?? s.dur * .3; return { replace: ['foley', 'shake', 'props'], cues: [
    { t: ts + .06, vt: ts, snd: 'stamp', what: 'штамп «RESERVED» на пустую карточку', vis: 'appear' },
    { t: ts + .05, snd: 'string.taut', gain: -4, what: 'нить BEIJING натягивается' },
  ] }; } },
  { m: F(1, '3D-phone-desk', /титр ролика/), f: (s, h) => ({ replace: ['snap', 'foley', 'shake'], cues: RINGS(s) }) },
  // событий «рамка находит лицо» и «пролёт сквозь снимок» в нативном рендере нет — только звонок и медленный наезд
  { m: F(1, '3D-phone-desk', /папка/), f: (s, h) => ({ replace: ['snap', 'foley', 'shake', 'props', 'cut'], cues: RINGS(s) }) },
  { m: F(1, 'L08-kentucky', /у школы/), f: (s, h) => ({ replace: ['foley', 'shake'], cues: [] }) },   // спальня у сундука; плашки KENTUCKY в кадре нет (слот занят)
  { m: F(1, 'L08-kentucky', /ведро и швабра/), f: (s, h) => { const tk = s.snap ?? .9, drop = Math.min(.45, tk - .35); return { replace: ['foley', 'shake'], cues: [
    { t: drop, snd: 'water.splash', what: 'швабра падает в ведро, брызги', vis: 'formula' },
    { t: tk, snd: 'wood.knock', gain: -6, what: 'детская рука берёт швабру' },
  ] }; } },
];
