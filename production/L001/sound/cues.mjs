// sound/cues.mjs — монтажный лист звука L001 (cue sheet) из шотлиста, тайминга и слов голоса.
// Источник событий — ТЕ ЖЕ правила, по которым рисует картинку animatic/core.js (грамматика камеры, события «на «слово»»,
// слоты событий, вещи-подписи, переходы TRANS, шаблоны карточек/документов/карт/досок/цифр, титры глав и ролика), плюс
// ручная постановка звука для планов с настоящими героями (cues_manual.mjs: время — по формулам film/shots.js).
// Секунд в коде нет: всё считается из animatic/timing.json и animatic/words.json; перетайминг — просто перезапуск.
//
//   node production/L001/sound/cues.mjs [--ch 0,1] [--cut-all]   -> sound/cues.json (все главы) + sound/CUES.md (таблица по --ch)
//
// Запись звука (cue): t — секунда фильма, в которую звук должен «попасть» (кадр события); align — какая точка звука
// ставится на t: onset (атака удара), apex (пик свиста), end (конец райзера), span (звук длится dur с t);
// snd — класс звука (палитра — sound/palette.py), gain — поправка к уровню класса (дБ), pan −1…1, vis — чем проверять по картинке.
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TRANS, LOWER, YEAR, DOCS, MAPS, BOARDS, NUMBERS } from '../animatic/conf.js';
import { MANUAL, BED_OVERRIDE, setTiming } from './cues_manual.mjs';
import { EXTRA } from './cues_extra.mjs';

const HERE = dirname(fileURLToPath(import.meta.url)), L = join(HERE, '..');
const argv0 = process.argv.slice(2), arg0 = (k, d) => { const i = argv0.indexOf(k); return i >= 0 ? argv0[i + 1] : d; };
// другой язык: --timing animatic/timing_ru.json --words animatic/words_ru.json --out cues_ru.json (планы и события те же, своё время)
const timing = JSON.parse(readFileSync(join(L, arg0('--timing', 'animatic/timing.json')), 'utf8'));
const WORDS = JSON.parse(readFileSync(join(L, arg0('--words', 'animatic/words.json')), 'utf8')).words;
const OUT_JSON = arg0('--out', 'cues.json'), OUT_MD = OUT_JSON === 'cues.json' ? 'CUES.md' : OUT_JSON.replace(/[.]json$/, '.md').replace(/^cues/, 'CUES');
setTiming(timing);
const FPS = timing.fps || 30, WHIP_DUR = .18;
// SKIP_PROPS берём из film/shots.js текстом (сам модуль тянет движок и canvas) — вещи, которые финал рисует сам
const SKIP_PROPS = (() => {   // ключи — номер плана или 'глава|начало текста' (film/keys.js); постановка — film/shots/chNN.js (или старый film/shots.js)
  const dir = join(L, 'film/shots'), files = existsSync(dir) ? readdirSync(dir).filter(f => /^ch\d+\.js$/.test(f)).map(f => join(dir, f)) : [join(L, 'film/shots.js')];
  const tbl = {};
  for (const f of files) { if (!existsSync(f)) continue; const m = readFileSync(f, 'utf8').match(/export const SKIP_PROPS = (\{[\s\S]*?\});/); if (m) Object.assign(tbl, new Function(`return ${m[1]}`)()); }
  const out = {};
  for (const key of Object.keys(tbl)) {
    if (/^\d+$/.test(key)) { out[key] = tbl[key]; continue; }
    const i = key.indexOf('|'), ch = +key.slice(0, i), pre = key.slice(i + 1), hit = timing.shots.filter(x => x.ch === ch && x.text.startsWith(pre));
    if (hit.length === 1) out[hit[0].n] = tbl[key]; else console.warn(`SKIP_PROPS: ключ «${key}» — планов ${hit.length}`);
  }
  return out; })();

const args = process.argv.slice(2), arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const CH = arg('--ch', '0,1').split(',').map(Number);
const CUT_ALL = !args.includes('--no-cut-all');   // 19.11: по умолчанию ВКЛ (Рауан: «переходы — везде»); тихий свист −8 дБ к whoosh.cut   // звук и на склейках внутри одной сцены (по умолчанию они немые: их держит подложка)

// ---------- слова ----------
const norm = w => w.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9$%]/g, '');
export function wordAt(re, t0, t1, sp = null) {
  const k = typeof re === 'string' ? norm(re) : null;
  for (const w of WORDS) { if (w.s < t0 - 1e-3) continue; if (w.s > t1) break; if (sp && w.sp !== sp) continue; if (k ? norm(w.w) === k : re.test(w.w)) return w.s; }
  return null;
}
export function lineSpan(sp, t0, t1) { const a = WORDS.filter(w => w.sp === sp && w.s >= t0 - .05 && w.s <= t1); return a.length ? [a[0].s, a[a.length - 1].e] : null; }

// ---------- грамматика картинки (копия правил core.js) ----------
const TECH = /^(начало|конец)\s*—|перемотк|серия из \d+ вспышек|вип-пан со смазом|на ~75|^стоп\b/;
const cleanEv = x => x.replace(/\s*\((?:D\d\d-[A-C][^)]*|[^)]*\bD\d\d-[A-C][^)]*)\)/g, '').replace(/^D\d\d-[A-C]:\s*/, '').trim();
const CAPS = /«([^»]*[A-Z0-9$%·:][^»]*)»/g;
function evList(s) {
  const d = s.dur, out = [];
  if (/^T-(card|title)$/.test(s.loc) || s.box) return out;
  const parts = s.event.split(/;\s*/).map((x, i) => ({ x: cleanEv(x), i })).filter(p => p.x && !TECH.test(p.x));
  const byP = new Map((s.ev || []).map(e => [e.p, e.t]));
  const t1 = s.snap != null ? s.snap + .35 : Math.max(.45, d * .42), slots = [t1, d * .78];
  const timed = parts.filter(p => byP.has(p.i)).map(p => ({ ...p, t: byP.get(p.i), timed: true }));
  for (const p of parts.filter(p => !byP.has(p.i))) {
    while (slots.length && timed.some(q => Math.abs(q.t - slots[0]) < .5)) slots.shift();
    if (!slots.length) break; timed.push({ ...p, t: slots.shift(), timed: false });
  }
  const seen = new Set();
  for (const p of timed.sort((a, b) => a.t - b.t)) {
    if (p.t > d - .15 || seen.has(p.x)) continue; seen.add(p.x);
    const quotes = [...p.x.matchAll(CAPS)].map(m => m[1]).filter(q => /[A-Z]{2,}|\$|\d%|\d{4}|^[A-Z][a-z]+\.? \d/.test(q) && !/^[a-z]/.test(q));
    const kind = /штамп|печать|трафарет/.test(p.x) ? 'stamp' : /мелом|маркером|пишет|дописыва|печатается|впечатыва/.test(p.x) ? 'chalk' : 'plaque';
    out.push({ t: p.t, x: p.x, quotes, kind, timed: p.timed });
  }
  return out;
}
const confText = s => { try { const c = s.loc === 'T-number' ? NUMBERS[s.n] : s.loc === 'T-doc' ? DOCS[s.n] : s.loc === 'T-map' ? MAPS[s.n] : s.loc === 'T-board' ? BOARDS[s.n] : null;
  return c ? JSON.stringify(c(s.dur)).toUpperCase() : ''; } catch { return ''; } };
function camKind(s) {
  const c = s.camera.toLowerCase();
  return /вип-пан/.test(c) ? 'whip' : /статично/.test(c) ? 'static' : /панорам|проезд|пролёт|подъём|опускани|прокрутк|поворот|наклон|проход/.test(c) ? 'pan' : /рывок/.test(c) ? 'snap' : 'push';
}

// ---------- ключевые слова события -> фоли (для планов без ручной постановки; время — время события по core) ----------
// [регэксп по тексту части события, класс звука, поправка к времени (с), опции { dur, not }]; до двух разных фоли на часть.
// Слова — с границами (B: не буква перед словом), глагол — рядом с предметом: «экран гаснет», а не «бейдж загорается красным».
// Затвор и вспышку ставит правило 4 (вспышка на картинке), бирки/штампы — вещи-подписи; здесь их нет, чтобы не двоилось.
const B = '(?<![а-яё])';
const FOLEY = [
  [/снимк\w* пада|фото\w* пада|полароид|кладёт снимок|снимок ложится|кладёт .{0,15}снимок/, 'photo.drop', .12],
  [/звонит|звонок телефона|телефон звонит/, 'phone.ring', 0, { dur: 1.6 }],
  [/(снимает|кладёт|бросает|берёт) трубку/, 'phone.pickup', 0],
  [/папк\w*.{0,25}захлоп|захлопыва\w* папк/, 'folder.close', 0],
  [/двер\w*.{0,25}(хлоп|захлоп)|(хлоп|захлоп)\w*.{0,15}двер|дверца.{0,15}захлоп/, 'door.slam', 0],
  [/стук в дверь|стучит в дверь|стучат в дверь/, 'knock', 0],
  [/(палец|пальцем|костяшк).{0,15}стучит|стучит (пальцем|по)|тук-тук/, 'box.tap', 0],
  [/открывает двер|дверь открыва|звенит колокольчик/, 'door.open', 0],
  [/садятся в .{0,10}машину|дверь машины|захлопывает дверцу машины/, 'car.door', 0],
  [/бокал|дзынь|чокаю/, 'glass.clink', 0],
  [/(ставят|ставит|выносят|грузят|опускают|ставит на пол).{0,25}(ящик|коробк)|(ящик|коробк)\w*.{0,15}(ставят|падает|ложится)|стопк\w* короб/, 'box.set', .08, { not: /штамп|наклейк|ценник/ }],
  [/крышк\w* (ящика|коробки)? ?(приоткрыва|открыва)|открывает (ящик|коробку|крышку)/, 'box.lid', 0, { dur: .6 }],
  [/(ключ.{0,30}(блест|ловит свет|блик))|((блест|блик).{0,30}ключ)/, 'glint', 0],
  [new RegExp(B + 'ключ'), 'key.jingle', 0, { not: /блест|блик|ловит свет/ }],
  [/замок щёлкает|защёлкива|дёргает замок/, 'lock.click', 0],
  [/аплодис|аплодиру|хлопают в ладоши/, 'applause', 0, { dur: 2.5 }],
  [/(толп|зал)\w*.{0,15}(ахает|охает|шумит)|ахает/, 'crowd.react', 0, { dur: 1.5 }],
  [/клавиат|печатает на|курсор|«SEND»/, 'keyboard', 0, { dur: 1.0 }],
  [/факс/, 'fax', 0, { dur: 1.5 }],
  [/монет\w* пада|касс|купюр|пачк\w* денег/, 'cash', 0],
  [/нит[ьк]\w* натягива|натягивает\w* нит|красн\w* нит/, 'string.pull', 0, { dur: .45 }],
  [/булавк|кнопк\w* в проб|прикалыва/, 'pin.push', 0],
  [/самолётик|самолёт (летит|взлета|садится)|иллюминат/, 'plane.by', 0, { dur: 2.0 }],
  [new RegExp(B + '(кран|контейнер)\w*.{0,20}(подним|опуска|ставит|грузит)'), 'crane.clank', 0],
  [/(лампа|свет|вывеска|табличка|экран|прожектор|телевизор|ТВ)\w*.{0,20}(загора|гаснет|щёлка|включа|выключа)|(загора|гаснет|включа|выключа)\w*.{0,20}(лампа|свет|вывеска|табличка|экран|прожектор)|выключател/, 'switch.click', 0],
  [/лампа (мигает|вздрагивает)|свет мигает/, 'lamp.flicker', .1],
  [/зелён\w* свет|свет из (коробки|щели)/, 'chip.glow', .1],
  [/ладонь.{0,20}(ложится|хлопает|опускается на|накрывает)/, 'photo.pat', 0],
  [/(садится|клеит|наклеива|прилепля)\w*.{0,20}(ценник|наклейк)|(ценник|наклейк)\w*.{0,20}(садится|клеит|прилип|ложится)/, 'tag.slap', .2],
  [/(швабр|ведр|лужу|вод)\w*.{0,25}(падает|плюх|брызг)|(падает|роняет|бросает|плюхается)\w*.{0,25}(ведр|вод|лужу)|брызг|всплеск/, 'water.splash', 0],
  [/льёт|наливает/, 'pour', 0, { dur: 1.2 }],
  [/тарелк|посуд|мойк/, 'dishes', 0, { not: /часы|показывают/ }],
  [/страниц\w* перевора|переворачивает страниц|(срывается|отрывается|отрывной) лист|листок/, 'page.turn', 0, { not: /штамп/ }],
  [/папк\w* (скользит|ложится|раскрыва)|раскрывает папк|бланк|распечат|конверт/, 'paper.handle', 0],
  [/роняет ручку|ручка падает/, 'pen.drop', .1],
  [/таймер/, 'timer.click', 0],
  [new RegExp(B + 'пот' + '(?![а-яё])|капл\w* (пота|падает)|капает'), 'drip', .1],
  [/чемодан\w* (лопается|трещит|скрипит)|сундук/, 'case.creak', 0],
  [/наушник/, 'headphone', 0],
  [/(садится|садятся) (на|за|в кабинк|в кресл)|откидывается|разворачивается на стуле|койка прогибается/, 'chair.creak', 0, { not: /стрелк/ }],
  [/рукопожат|пожимает/, 'cloth.rustle', 0],
  [/облачко\w* пыли|пыль (слетает|сходит)|облачком/, 'dust.puff', 0],
  [/красн\w* крест|зачёркива|перечёрк/, 'marker.cross', 0],
  [/обвод|рисуется красн\w* круг/, 'marker.circle', 0, { dur: .7 }],
  [/подчёркива/, 'marker.line', 0, { dur: .35 }],
  [/тикер|табло\w* (щёлка|переворач|меня)|щёлкает «/, 'flip.board', 0, { dur: .6 }],
  // --- проход по звуку 19.11 (Рауан: «смех, стук, надписи, печать — везде, где не хватает») ---
  [/смеются|хохочут|смех за столом/, 'laugh.group', 0],
  [/смеётся|хохочет|рассмеялся/, 'laugh.man', 0, { not: /не смеётся/ }],
  [/щёлкает ручкой|щёлкает авторучк/, 'pen.click', 0],
  [/(вписывает|пишет|пишется|расписывается|выводит|рисует (на|маркер|ручк)|ручка вписывает)/, 'marker.write', 0, { dur: .6, not: /пишмашин/ }],
  [/(печатается|впечатывается|набивается|печатает «)/, 'type.run', 0, { dur: .6 }],
  [/штампует|ставит штамп|штамп [A-Z]/, 'stamp', .1],
  [/принтер|выходит из печати|лента бумаги/, 'printer', 0, { dur: 1.4 }],
  [/(откручива|привинчива|прикручива|отвинчива)/, 'screw.turn', 0, { dur: .5 }],
  [/кивает на|хлопает по/, 'photo.pat', 0, { not: /ладонь/ }],
  [/песочн\w* час/, 'box.set', 0],
  [/(погрузчик|тележк)\w*.{0,20}(везёт|тормозит|ввозит)|ввозит/, 'cart.roll', 0, { dur: 1.0 }],
  [/стропы|кран поднимает/, 'crane.clank', 0],
  [/фонар\w* (ведёт|светит|щёлка)|светит фонар/, 'switch.click', 0],
];

// ---------- подложка (амбиенс) по месту ----------
export function bedOf(s) {
  const f = s.framing, L0 = s.loc;
  const ov = BED_OVERRIDE.find(([m]) => m(s)); if (ov) return ov[1];
  if (L0 === 'T-title') return 'title';
  if (L0 === 'T-desk' && /ресторан/.test(f)) return 'restaurant';
  if (L0.startsWith('T-')) return '_prev';
  if (L0 === 'L01-restaurant') return 'restaurant';
  if (L0 === 'L02-sg-street') return /салон|агент/.test(f) ? 'car' : 'street';
  if (L0 === 'L03-host-office') return 'office';
  if (L0 === '3D-city') return 'city';
  if (L0 === '3D-boxpath' || L0 === 'L17-warehouse') return 'warehouse';
  if (L0 === '3D-phone-desk' || L0 === 'L04-washington') return 'washington';
  if (L0 === '3D-datacenter') return 'datacenter';
  if (L0 === '3D-kitchen') return 'kitchen';
  if (L0 === '3D-conveyor') return 'factory';
  if (L0 === '3D-hq-corridor') return 'corridor';
  if (L0 === 'L05-beijing') return 'beijing';
  if (L0 === 'L06-nvidia-office') return 'nvidia';
  if (L0 === 'L07-dennys') return 'diner';
  if (L0 === 'L08-kentucky') return /санузел|ведр|швабр/.test(f + s.event) ? 'bathroom' : /у школы|ворот|двор|улиц/.test(f) ? 'kentucky_ext' : 'dorm';
  if (L0 === 'L09-megaspeed') return 'megaspeed';
  if (L0 === 'L10-taipei-bar') return 'bar';
  if (L0 === 'L11-event-hall') return 'hall';
  if (L0 === 'L12-customs') return 'port';
  if (L0 === 'L13-newsroom') return 'newsroom';
  if (L0 === 'L14-front-door') return 'night_ext';
  if (L0 === 'L15-relatives') return 'porch';
  if (L0 === 'L16-dennys-kitchen') return 'dishpit';
  if (L0 === 'L18-closed-room') return 'closed_room';
  if (L0 === 'L19-trading-desk') return 'trading';
  return 'room';
}

const isPlace = loc => !/^T-/.test(loc) || loc === 'T-desk';   // T-desk — вид сверху на настоящее место (стол ресторана), а не графика

// ---------- генерация ----------
const cues = [], beds = [], marks = [], manualHits = [], extraHits = [];
const shots = timing.shots;
let prevBed = 'room';
// vt — кадр события на картинке (по нему сверка), t — точка звука; они расходятся там, где звук намеренно сдвинут (пик свиста после склейки, удар штампа на приземлении)
const add = (s, o) => cues.push({ shot: s.n, ch: s.ch, loc: s.loc, gain: 0, pan: 0, align: 'onset', ...o, t: +o.t.toFixed(4), vt: +(o.vt ?? o.t).toFixed(4) });

shots.forEach((s, i) => {
  const T = s.start, d = s.dur, kind = camKind(s), pv = shots[i - 1], tr = TRANS[s.n];
  const mm_ = MANUAL.filter(x => x.m(s));
  if (mm_.length > 1) console.warn(`план ${s.n}: ${mm_.length} ручных постановок совпало — беру первую`);
  const man = mm_.length ? mm_[0].f(s, { T, d, wordAt, lineSpan, W: (re, fb) => { const a = wordAt(re, s.start, s.end); return a == null ? fb : a - s.start; } }) : null;
  if (man) manualHits.push(s.n);
  const drop = new Set(man?.replace || []);

  // подложка
  let bed = bedOf(s), bedGain = 0;
  if (bed === '_prev') { bed = prevBed; bedGain = -6; } else if (bed !== 'title') prevBed = bed;
  beds.push({ shot: s.n, ch: s.ch, start: T, end: s.end, bed, gain: bedGain, loc: s.loc });

  // 1) склейка / переход в начале плана
  if (pv && !drop.has('cut')) {
    const what = `склейка #${pv.n}→#${s.n}`;
    if (tr === 'whip') add(s, { t: T + .1, vt: T, snd: 'whoosh.whip', align: 'apex', pan: 0, sweep: [.5, -.5], kind: 'transition', what: `${what}: вип-переход`, vis: 'motion' });
    else if (tr === 'zoom') { add(s, { t: T, snd: 'whoosh.zoomin', align: 'end', kind: 'transition', what: `${what}: наезд-удар (140→100 %)`, vis: 'cut' });
      add(s, { t: T, snd: 'hit.punch', kind: 'transition', what: `${what}: удар на склейке`, vis: 'cut' }); }
    else if (tr === 'wipe') add(s, { t: T + .135, vt: T, snd: 'whoosh.wipe', align: 'apex', sweep: [.6, -.6], kind: 'transition', what: `${what}: шторка`, vis: 'motion' });
    else if (tr === 'white') { add(s, { t: T, snd: 'riser.white', align: 'end', kind: 'transition', what: `${what}: засвет в белое`, vis: 'flash' });
      add(s, { t: T, snd: 'hit.bloom', kind: 'transition', what: `${what}: выход из белого`, vis: 'flash' }); }
    else if (tr === 'flash') add(s, { t: T, snd: 'flash.pop', kind: 'transition', what: `${what}: вспышка`, vis: 'flash' });
    else if (tr === 'rewind') add(s, { t: T, snd: 'tape.rewind', align: 'span', dur: .45, kind: 'transition', what: `${what}: перемотка`, vis: 'cut' });
    else if (tr === 'snaps') [0, 1, 2].forEach(k => add(s, { t: T + k * .12 + .25, snd: 'whoosh.photo', align: 'apex', sweep: [.6, -.6], kind: 'transition', what: `${what}: снимок ${k + 1} пролетает`, vis: 'motion' }));
    else if (s.loc === 'T-title') { /* титр главы — свой звук ниже */ }
    else if (s.loc === 'T-card') add(s, { t: T, snd: 'hit.card', kind: 'transition', what: `${what}: чёрная карточка`, vis: 'cut' });
    else if (/^T-(doc|map|board|number|split|joke)$/.test(s.loc) && !/^T-/.test(pv.loc)) add(s, { t: T, snd: 'hit.soft', kind: 'transition', what: `${what}: в шаблон ${s.loc}`, vis: 'cut' });
    else if (s.loc.startsWith('3D-') && !pv.loc.startsWith('3D-')) add(s, { t: T + 1 / FPS, vt: T, snd: 'whoosh.air', align: 'apex', kind: 'transition', what: `${what}: в 3D`, vis: 'cut' });
    else if (isPlace(s.loc) && isPlace(pv.loc) && bedOf(s) !== bedOf(pv)) add(s, { t: T + 1 / FPS, vt: T, snd: 'whoosh.cut', align: 'apex', kind: 'transition', what: `${what}: смена места`, vis: 'cut' });
    else if (!/^T-/.test(s.loc) && /^T-(doc|card|map|board|number|split|joke|desk)$/.test(pv.loc)) add(s, { t: T + 1 / FPS, vt: T, snd: 'whoosh.cut', gain: -3, align: 'apex', kind: 'transition', what: `${what}: из вставки обратно в сцену`, vis: 'cut' });
    else if (CUT_ALL) add(s, { t: T + 1 / FPS, vt: T, snd: 'whoosh.cut', gain: -8, align: 'apex', kind: 'transition', what: `${what}: склейка внутри сцены (--cut-all)`, vis: 'cut' });
    if (tr === 'speed') add(s, { t: T + (s.snap ?? d * .4) + .1, snd: 'whoosh.speed', align: 'apex', kind: 'transition', what: 'линии скорости', vis: 'motion' });
  }
  // засвет в конце плана перед белым переходом — райзер ставится выше (end на склейке)

  // 2) камера: рывок, вип-пан, проезд, толчок
  const snapT = s.snap != null && kind !== 'static' && !/^T-(card|title)$/.test(s.loc) ? s.snap : null;
  if (snapT != null && !drop.has('snap')) {
    const soft = /^T-(map|board|doc)$/.test(s.loc);
    add(s, { t: T + snapT, snd: soft ? 'snap.soft' : 'snap', align: 'apex', kind: 'camera', what: `рывок на «${s.snapWord}»`, vis: 'motion' });
  }
  if (s.whip && !drop.has('whip')) add(s, { t: T + s.whip.t - .1 + WHIP_DUR / 2, snd: 'whoosh.whip', align: 'apex', sweep: [.5, -.5], kind: 'camera', what: `вип-пан ${s.whip.from} → ${s.whip.to}`, vis: 'motion' });
  if (kind === 'pan' && !drop.has('pan') && (s.loc.startsWith('3D-') || /проезд|пролёт|подъём/.test(s.camera))) add(s, { t: T + .1, snd: 'air.move', align: 'span', dur: Math.max(.8, d * .85 - .1), gain: -3, kind: 'camera', what: `движение камеры: ${s.camera}`, vis: 'formula' });
  if (/толчок|встряска/.test(s.camera.toLowerCase()) && !drop.has('kick')) add(s, { t: T + (s.snap ?? d * .4), snd: 'hit.kick', kind: 'camera', what: 'толчок камеры', vis: 'motion' });

  // 3) события «на слово» и в слотах: вещи-подписи (штамп / маркер / бирка) + фоли по словам + толчок камеры
  const ev = evList(s), ct = confText(s);
  for (const e of ev) {
    const props = e.quotes.slice(0, 2).filter(q => q !== YEAR[s.n] && (e.kind === 'stamp' || (s.loc !== 'T-number' && !ct.includes(q.toUpperCase()))));   // SKIP_PROPS — только «ядро не рисует, рисует постановка»; звук вещи остаётся (раньше выкидывался вместе с рисунком — немые штампы/таблички в планах с героями, проход по звуку 19.11)
    if (!drop.has('props')) props.forEach((q, k) => {
      const t0 = T + e.t + (k && props.length > 1 ? .45 : 0);
      if (e.kind === 'stamp') add(s, { t: t0 + .1, vt: t0, snd: 'stamp', kind: 'event', what: `штамп «${q}»`, vis: 'appear' });
      else if (e.kind === 'chalk') add(s, { t: t0, snd: 'marker.write', align: 'span', dur: .5, kind: 'event', what: `пишется «${q}»`, vis: 'appear' });
      else add(s, { t: t0, snd: 'tag.pop', kind: 'event', what: `бирка/плашка «${q}»`, vis: 'appear' });
    });
    let hit = 0;   // до двух разных фоли на часть события; бирки/таблички не дублируют вещь-подпись
    if (!drop.has('foley')) for (const [re, snd, off, o = {}] of FOLEY) if (re.test(e.x) && !(o.not && o.not.test(e.x)) && hit < 2 && !(props.length && /^(tag|paper|flip|stamp)/.test(snd))) {
      add(s, { t: T + e.t + off + hit * .05, snd, align: o.dur ? 'span' : 'onset', dur: o.dur, kind: 'foley', what: e.x.slice(0, 80), vis: e.timed ? 'formula' : 'slot', approx: !e.timed });
      hit++;
    }
    const afterSnap = snapT != null && e.t - snapT > -.1 && e.t - snapT < .5;   // толчок сразу после рывка — часть рывка
    if (!hit && !props.length && !/^T-/.test(s.loc) && !drop.has('shake') && !afterSnap) add(s, { t: T + e.t, snd: 'hit.event', gain: -4, kind: 'event', what: `толчок камеры: ${e.x.slice(0, 60)}`, vis: 'motion' });
  }

  // 4) вспышка фотоаппарата (как в core: по словам события)
  const fl = /вспышк|щелч|затвор|flash|фотограф|селфи/i.test(s.event + s.framing) && !/фоторамк|без вспыш/.test(s.event);
  if (fl && !drop.has('flash')) {   // картинка вспыхивает; звук затвора — только если это фотоаппарат, иначе — щелчок
    const tf = T + (s.snap ?? d * .45), cam = /затвор|фотограф|вспышк|селфи|flash/i.test(s.event + s.framing);
    add(s, { t: tf, snd: cam ? 'shutter' : 'clip.snap', gain: cam ? 0 : -4, kind: 'event', what: cam ? 'щелчок затвора' : 'щелчок', vis: 'flash' });
    add(s, { t: tf, snd: 'flash.pop', gain: cam ? -6 : -12, kind: 'event', what: 'вспышка', vis: 'flash' }); }
  if (/серия из \d+ вспышек/.test(s.event)) for (let k = 0; k < 6; k++) add(s, { t: T + d * (.1 + .14 * k), snd: 'shutter', gain: -6 - k, pan: (k % 3 - 1) * .4, kind: 'event', what: `вспышка серии ${k + 1}`, vis: 'flash' });

  // 5) шаблоны
  if (s.loc === 'T-card' && !drop.has('card')) {
    const q = (s.event.match(/«([^»]+)»/) || [])[1] || s.spoken, len = q.length, cps = Math.max(15, len / Math.max(.3, d * .6 - .2)), cpsE = Math.max(cps, len / Math.max(.05, d * .6 - .2));
    const tw = len / cpsE, last = (q.match(/([A-Za-z']+)[^A-Za-z']*$/) || [])[1];
    add(s, { t: T + .2, snd: 'marker.write', align: 'span', dur: tw, kind: 'template', what: `карточка пишется маркером: «${q}»`, vis: 'formula' });
    if (last) add(s, { t: T + .2 + tw + .25, snd: 'marker.line', align: 'span', dur: .35, kind: 'template', what: `подчёркивание «${last}»`, vis: 'formula' });
  }
  if (s.loc === 'T-title') {
    const label = `CHAPTER ${s.ch}`, fast = d < 1.5;
    add(s, { t: T, snd: 'sting.chapter', kind: 'title', what: `титр главы ${s.ch}: «${s.chTitle}»`, vis: 'cut' });
    add(s, { t: T + .03, snd: 'type.run', align: 'span', n: label.replace(/ /g, '').length, dur: fast ? .15 : label.length / 26, gain: -3, kind: 'title', what: `пишмашинка «${label}»`, vis: 'formula' });
    add(s, { t: T + d * .55, snd: 'shimmer.sweep', align: 'span', dur: Math.min(.9, d * .4), gain: -4, kind: 'title', what: 'блик лампы по названию', vis: 'formula' });
    marks.push({ t: T, kind: 'chapter', ch: s.ch, title: s.chTitle });
  }
  if (s.loc === 'T-doc' && DOCS[s.n] && !drop.has('doc')) {
    const o = DOCS[s.n](d), slideIn = o.slideIn ?? .7, stampAt = o.stampAt ?? 1.0, hlAt = o.hlAt ?? 1.45, hlStep = o.hlStep ?? .42;
    add(s, slideIn > .05 ? { t: T, snd: 'paper.slide', align: 'span', dur: slideIn, kind: 'template', what: 'документ въезжает на стол', vis: 'motion' } : { t: T, snd: 'paper.place', gain: -4, kind: 'template', what: 'документ на столе', vis: 'cut' });
    if (o.stamp !== null && (o.stamp ?? 'TOP SECRET')) add(s, { t: T + stampAt, snd: 'stamp', kind: 'template', what: `штамп документа «${o.stamp ?? 'TOP SECRET'}»`, vis: 'appear' });
    (o.highlight || []).forEach((li, k) => add(s, { t: T + hlAt + k * hlStep, snd: 'marker.hl', align: 'span', dur: .38, gain: -2, kind: 'template', what: `маркер по строке ${li + 1}`, vis: 'formula' }));
  }
  if (s.loc === 'T-map' && MAPS[s.n]) {
    const o = MAPS[s.n](d);
    (o.pins || []).forEach(p => add(s, { t: T + (p.t0 ?? 0), snd: 'pin.pop', kind: 'template', what: `булавка «${p.label}»`, vis: 'appear' }));
    (o.routes || []).forEach(r => { add(s, { t: T + r.t0, snd: r.plane ? 'plane.by' : 'map.route', align: 'span', dur: r.t1 - r.t0, gain: -2, kind: 'template', what: r.plane ? 'самолётик по маршруту' : 'маршрут рисуется', vis: 'formula' });
      if (r.stop != null && r.stop < 1) add(s, { t: T + r.t1, snd: 'hit.x', kind: 'template', what: 'красный крест на маршруте', vis: 'appear' }); });
    if (o.border) add(s, { t: T + o.border.t0, snd: 'alarm.hit', kind: 'template', what: `граница ${o.border.id} вспыхивает`, vis: 'flash' });
  }
  if (s.loc === 'T-board' && BOARDS[s.n]) {
    const o = BOARDS[s.n](d);
    (o.strings || []).forEach(r => r.t0 != null && add(s, { t: T + r.t0, snd: 'string.pull', align: 'span', dur: (r.t1 ?? r.t0 + .5) - r.t0, kind: 'template', what: 'нитка натягивается', vis: 'formula' }));
    if (o.circle) add(s, { t: T + o.circle.t0, snd: 'marker.circle', align: 'span', dur: o.circle.dur || .7, kind: 'template', what: 'маркер обводит', vis: 'formula' });
  }
  if (s.loc === 'T-number' && NUMBERS[s.n]) {
    const o = NUMBERS[s.n](d), tEnd = s.snap ?? d * .5; let at = o.at ?? .5, cd = o.countDur;
    if (cd != null) { at = Math.min(at, Math.max(0, tEnd - .6)); cd = Math.max(.3, tEnd - at); }
    const counting = /\d/.test(o.from || '') && /\d/.test(o.to || '') && o.from !== o.to;
    if (counting) add(s, { t: T + at, snd: 'ticker.run', align: 'span', dur: cd, kind: 'template', what: `счётчик ${o.from} → ${o.to}`, vis: 'formula' });
    add(s, { t: T + at + (counting ? cd : 0), snd: 'hit.number', kind: 'template', what: `цифра встала: ${o.to}`, vis: 'appear' });
  }
  if (LOWER[s.n]) LOWER[s.n].forEach(([nm, role, at]) => add(s, { t: T + at * d, snd: 'ui.slide', gain: -3, kind: 'caption', what: `подпись «${nm} — ${role}»`, vis: 'appear' }));
  if (YEAR[s.n] && !drop.has('year')) add(s, { t: T + .02, snd: 'type.run', align: 'span', n: YEAR[s.n].replace(/ /g, '').length, dur: .38, gain: -2, kind: 'caption', what: `подпись «${YEAR[s.n]}» печатается`, vis: 'formula' });
  if (/титр ролика/.test(s.framing)) {
    const tt = T + d - 1.75;
    add(s, { t: tt, snd: 'riser.title', align: 'end', kind: 'title', what: 'подъём к названию ролика', vis: 'formula' });
    add(s, { t: tt, snd: 'sting.title', kind: 'title', what: 'название ролика встаёт', vis: 'appear' });
    marks.push({ t: tt, kind: 'video_title' });
  }

  // 6) ручная постановка (герои): добавочные звуки по формулам shots.js
  if (man) for (const c of man.cues) add(s, { kind: 'foley', vis: 'formula', ...c, t: T + c.t, vt: c.vt != null ? T + c.vt : undefined });
  // добавочный звук (cues_extra.mjs): ключ 'глава|начало текста'
  for (const [key, list] of EXTRA) { const k = key.indexOf('|'); if (+key.slice(0, k) !== s.ch || !s.text.startsWith(key.slice(k + 1))) continue;
    extraHits.push(key);
    for (const c of list) { const { w, dt = 0, fb, f, ...o } = c; let t;
      if (w) { const a = wordAt(w, s.start - .05, s.end + .05); t = a != null ? a + dt : fb != null ? T + fb * d : null; if (a == null) console.warn(`EXTRA ${key}: слова «${w}» нет${fb != null ? ' — доля ' + fb : ' — пропущено'}`); }
      else t = T + (f != null ? f * d : (c.t ?? 0));
      if (t != null) add(s, { kind: 'foley', vis: 'formula', what: `доп.: ${o.snd}`, ...o, t: Math.min(Math.max(t, T), s.end - .02) }); } }
});

// ---------- прорежение: ближе 70 мс к более важному звуку — рывок/толчок тише ----------
const PRIO = { title: 5, template: 4, event: 4, foley: 4, transition: 3, caption: 3, camera: 2 };
cues.sort((a, b) => a.t - b.t);
for (const c of cues) if (/^(snap|snap\.soft|hit\.event|hit\.kick)$/.test(c.snd)) {
  const near = cues.find(o => o !== c && Math.abs(o.t - c.t) < .07 && (PRIO[o.kind] || 0) > (PRIO[c.kind] || 0) && !/^(snap|hit\.event)/.test(o.snd));
  if (near) { c.gain = (c.gain || 0) - 6; c.ducked = near.snd; }
}
cues.forEach((c, i) => { c.id = `c${String(i + 1).padStart(4, '0')}`; c.frame = Math.round(c.t * FPS); });

// подложки: слить соседние планы с одной подложкой
const segs = [];
for (const b of beds) { const l = segs[segs.length - 1]; if (l && l.bed === b.bed && l.gain === b.gain && Math.abs(l.end - b.start) < 1e-3) { l.end = b.end; l.shots.push(b.shot); } else segs.push({ ...b, shots: [b.shot] }); }
// главы
const chapters = [];
for (const s of shots) { const c = chapters[s.ch] ||= { ch: s.ch, title: s.chTitle, start: s.start, end: s.end }; c.end = s.end; }

writeFileSync(join(HERE, OUT_JSON), JSON.stringify({ note: 'sound/cues.mjs — не править руками; правки — в cues_manual.mjs', fps: FPS, total: timing.total, chapters, marks, beds: segs, cues }, null, 1));

// ---------- CUES.md: таблица для выбранных глав ----------
const sel = cues.filter(c => CH.includes(c.ch)), mm = t => `${Math.floor(t / 60)}:${(t % 60).toFixed(2).padStart(5, '0')}`;
const byKind = {}; for (const c of cues) byKind[c.kind] = (byKind[c.kind] || 0) + 1;
const perCh = chapters.map(c => { const n = cues.filter(x => x.ch === c.ch).length; return `| ${c.ch} | ${c.title} | ${mm(c.start)}–${mm(c.end)} | ${n} | ${(n / ((c.end - c.start) / 60)).toFixed(1)} |`; });
const md = [
  '# L001 — монтажный лист звука (cue sheet)', '',
  'Сгенерирован `node production/L001/sound/cues.mjs` из `animatic/timing.json`, `animatic/words.json`, `animatic/conf.js` и ручной постановки `cues_manual.mjs`. Не править руками.', '',
  `Всего звуков: **${cues.length}**; по типам: ${Object.entries(byKind).map(([k, v]) => `${k} ${v}`).join(', ')}. Подложек (сегментов амбиенса): ${segs.length}.`, '',
  '## По главам', '', '| гл. | название | время | звуков | в минуту |', '|---|---|---|---|---|', ...perCh, '',
  `## Подложки, главы ${CH.join(', ')}`, '', '| планы | время | подложка | дБ |', '|---|---|---|---|',
  ...segs.filter(b => CH.includes(b.ch)).map(b => `| ${b.shots[0]}–${b.shots[b.shots.length - 1]} | ${mm(b.start)}–${mm(b.end)} | ${b.bed} | ${b.gain} |`), '',
  `## Звуки, главы ${CH.join(', ')}`, '', '| id | план | кадр | время | звук | точка | что в кадре | правило |', '|---|---|---|---|---|---|---|---|',
  ...sel.map(c => `| ${c.id} | ${c.shot} | ${c.frame} | ${mm(c.t)} | ${c.snd}${c.gain ? ` (${c.gain > 0 ? '+' : ''}${c.gain})` : ''} | ${c.align}${c.dur ? ` ${c.dur.toFixed(2)} с` : ''} | ${(c.what || '').replace(/\|/g, '/')} | ${c.kind}${c.approx ? ' ≈слот' : ''} |`),
];
writeFileSync(join(HERE, OUT_MD), md.join('\n') + '\n');
console.log(`manual: ${manualHits.length} планов (${manualHits.join(',')}); cues: ${cues.length} (${Object.entries(byKind).map(([k, v]) => `${k} ${v}`).join(', ')}), beds: ${segs.length}, chapters: ${chapters.length}; ch ${CH}: ${sel.length}`);
