// make_timing.mjs: шотлист L002 + черновой голос -> timing.json и план склейки звука для аниматика.
//   node production/L002/animatic/make_timing.mjs [--lines out/lines_fish.json] [--out animatic/timing.json]
//   русская версия со своим таймингом:  --lines out/lines_fish_ru.json --out animatic/timing_ru.json  (-> words_ru.json)
// Пишет timing.json и words.json (слова голоса на шкале фильма: кто, что, когда — для рта героев в film/).
// Старт плана = начало первого слова его «текста» (поиск последовательно по словам lines_draft.json).
// Путь коробки (7 планов 3D-boxpath в гл. 6) идёт по готовому видео box_path_v2 (S1..S6 + 3D-хвост): фразы голоса сдвигаются
// тишиной так, чтобы каждая начиналась на своём подплане; S4 — без голоса (пауза из шотлиста). Последний план — 2 с музыки.
// Титр главы (T-title): перед его первым словом вставляется TITLE_PAUSE с тишины — титр читается до начала закадра.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const D = dirname(fileURLToPath(import.meta.url)), L = join(D, '..');
const norm = w => w.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]/g, '');
const md = readFileSync(join(L, 'shotlist.md'), 'utf8').split(/\r?\n/);
// источник голоса: --lines <json>, иначе финальный Fish, если он есть (out/lines_fish.json + out/voice_fish_en.mp3), иначе черновой edge-tts
const LA = process.argv.indexOf('--lines'), LINES_FILE = LA > 0 ? process.argv[LA + 1] : (existsSync(join(L, 'out/lines_fish.json')) ? 'out/lines_fish.json' : 'out/lines_draft.json');
const OA = process.argv.indexOf('--out'), OUT_FILE = OA > 0 ? process.argv[OA + 1] : 'animatic/timing.json';   // путь от production/L002
const AUDIO_FILE = /fish_ru/.test(LINES_FILE) ? 'out/voice_fish_ru.mp3' : /fish/.test(LINES_FILE) ? 'out/voice_fish_en.mp3' : 'out/voice_draft.mp3';
let lines = JSON.parse(readFileSync(join(L, LINES_FILE), 'utf8')), LINES_REF = LINES_FILE;
// ---- другой язык (строки без слов, например out/lines_fish_ru.json): планы и события привязаны к английским словам, поэтому
// каждое английское слово переносится на русскую строку — в ту же долю длины строки; число или имя — на место своего
// русского слова в тексте (по позиции в строке). Дальше всё считается как обычно, но на шкале русского голоса.
if (!lines[0].words) {
  const en = JSON.parse(readFileSync(join(L, 'out/lines_fish.json'), 'utf8'));
  if (en.length !== lines.length) throw new Error(`строк ${lines.length}, в английской дорожке ${en.length}`);
  const NAMES = { nvidia: 'нвидиа', nvidias: 'нвидиа', jensen: 'дженсен', jensens: 'дженсен', huang: 'хуанг', alice: 'алис', megaspeed: 'мегаспид', megaspeeds: 'мегаспид', beijing: 'пекин', beijings: 'пекин',
    washington: 'вашингтон', china: 'кита', chinas: 'кита', chinese: 'китайск', singapore: 'сингапур', malaysia: 'малайзи', malaysian: 'малайзи', indonesia: 'индонези', taiwan: 'тайван', taiwanese: 'тайваньск',
    taipei: 'тайбэ', kentucky: 'кентукки', america: 'америк', american: 'америк', dennys: 'деннис', alibaba: 'алибаб', aivres: 'айврес', inspur: 'инспур', cotton: 'коттон', lutnick: 'лютник', rubio: 'рубио', trump: 'трамп',
    fbi: 'фбр', cnn: 'си-эн-эн', bloomberg: 'блумберг', axios: 'аксиос', deepseek: 'дипсик', chatgpt: 'чатджипити', microsoft: 'майкрософт', computex: 'компьютекс', commerce: 'торговл', alaska: 'аляск', california: 'калифорни',
    billion: 'миллиард', million: 'миллион', trillion: 'триллион', percent: 'процент', lobsters: 'лобстер', october: 'октябр', november: 'ноябр', december: 'декабр', april: 'апрел', august: 'август', march: 'март', june: 'июн',
    january: 'январ', may: 'ма', senator: 'сенатор', president: 'президент', kress: 'кресс', colette: 'колетт', malachowsky: 'малаховски', priem: 'прим', oneida: 'онайда', ceo: 'генеральн' };
  let hit = 0, all = 0;
  lines = lines.map((r, i) => {
    const e = en[i], ed = Math.max(.01, e.end - e.start), rd = r.end - r.start, txt = r.text.toLowerCase(); let last = 0, from = 0;
    const words = e.words.map(w => {
      let a = (w.s - e.start) / ed, b = (w.e - e.start) / ed; const k = NAMES[norm(w.w)]; all++;
      const at = k ? txt.indexOf(k, from) : /^\d/.test(w.w) ? txt.search(/\d/) : -1;
      if (at >= 0 && Math.abs(at / txt.length - a) < .45) { const len = b - a; a = at / txt.length; b = Math.min(1, a + len); from = at + 1; hit++; }
      a = Math.max(last, Math.min(a, 1)); b = Math.max(a, Math.min(b, 1)); last = a;
      return { w: w.w, s: +(r.start + a * rd).toFixed(3), e: +(r.start + b * rd).toFixed(3) };
    });
    return { ...r, textEn: e.text, words };
  });
  LINES_REF = LINES_FILE.replace(/\.json$/, '_sync.json');
  writeFileSync(join(L, LINES_REF), JSON.stringify(lines));
  console.log(`язык: строки ${LINES_FILE} без слов — английские слова перенесены на русскую шкалу (${hit} из ${all} — по своему русскому слову), ${LINES_REF}`);
}

// ---- шотлист
const shots = []; let ch = null, chTitle = '';
for (const s of md) {
  const h = s.match(/^### Гл\. (\d+)\. (.+?) —/); if (h) { ch = +h[1]; chTitle = h[2]; continue; }
  const m = s.match(/^\| (\d+) \| ([\d:.]+) \| (.*?) \| (\S+) \| (.*?) \| ([\d.]+) \| (.*?) \| (.*?) \|$/);
  if (m && ch != null) shots.push({ n: +m[1], ch, chTitle, listStart: m[2], text: m[3], loc: m[4], framing: m[5], listDur: +m[6], event: m[7], camera: m[8] });
}
const nums = shots.map(s => s.n); if (nums.some((n, i) => n !== i + 1)) throw new Error('номера планов не по порядку');
const LAST = shots[shots.length - 1].n;

// ---- слова голоса
const words = [];
// edge-tts склеивает «in 1997», «October 29, 2026» в одно слово — делим, время у частей общее
lines.forEach((l, li) => l.words.forEach(w => w.w.split(/\s+/).forEach((part, pi) => { const k = norm(part); if (k) words.push({ k, w: part, s: w.s, e: w.e, li, sub: pi > 0 }); })));
const voiceEnd = lines[lines.length - 1].end;

const toks = txt => txt.replace(/…/g, ' ').replace(/^—.*$/, '').replace(/^[A-Z][A-Z0-9 ]{1,20}:\s*/, '').split(/\s+/).map(norm).filter(Boolean);
let p = 0; const problems = [];
for (const s of shots) {
  const tk = toks(s.text); s.toks = tk; const spk = /^[A-Z][A-Z0-9 ]{1,20}:/.test(s.text);  // реплика — с начала строки голоса
  if (!tk.length) { s.wi = null; continue; }
  let found = -1;
  for (const n of [Math.min(4, tk.length), 3, 2, 1]) {
    if (n > tk.length) continue;
    for (let i = p; i < Math.min(words.length, p + 80); i++) if ((!spk || i === 0 || words[i - 1].li !== words[i].li) && tk.slice(0, n).every((t, j) => words[i + j] && words[i + j].k === t)) { found = i; break; }
    if (found >= 0) { if (n < Math.min(3, tk.length)) problems.push(`#${s.n}: совпало только ${n} слов(а) из "${s.text}"`); break; }
  }
  if (found < 0) { problems.push(`#${s.n}: НЕ НАЙДЕН "${s.text}"`); s.wi = null; continue; }
  if (found - p > 60) problems.push(`#${s.n}: пропущено ${found - p} слов`);
  s.wi = found; p = found + 1;
}

// ---- сдвиги звука (вставки тишины) и времена
const TITLE_GAP = 1.6;
// путь коробки (гл. 6): подпланы идут ПО ГОЛОСУ — каждый начинается на первом слове своей фразы, а кусок готового видео
// box_path_v2 растягивается под длину плана в film (s.box.from..to). Голос внутри фразы не останавливается.
const BOX = shots.filter(s => s.ch === 6 && s.loc === '3D-boxpath').map(s => s.n).slice(0, 6), TITLE_PAUSE = 1.2, MIN = { line: 1.5, card: 1.8, any: 1.3 };
const BOXSEG = [[0, 2.1], [2.1, 4.1], [4.1, 6.3], [8.2, 10.5], [10.5, 13.3], [13.3, 17.9]];   // S1, S2, S3, S5, S6, 3D-хвост (S4 «кран несёт» без голоса убран)
// ---- где в голос можно вставить тишину (правило 2026-11-18: речь не рвётся)
//   · только на стыке строк: строки синтезированы отдельно, между ними тишина 0.15–0.2 с — режем в её середине;
//   · никогда внутри строки (ни между словами, ни на запятой, ни между предложениями одной строки);
//   · никогда внутри сцены ведущего: HOST записан одним дублем на сцену и играет как записан.
// Если тишину вставить нельзя, план просто начинается на своём слове (короткий план — повод слить его с соседом в шотлисте).
const lineOf = k => words[k].li, isHost = li => lines[li].speaker === 'HOST';
const canInsert = k => k > 0 && lineOf(k) !== lineOf(k - 1) && !(isHost(lineOf(k)) && isHost(lineOf(k - 1))) && lines[lineOf(k)].start - lines[lineOf(k - 1)].end >= .1;
const inserts = [], denied = []; let shift = 0;
const insertBefore = (wi, need, why, must) => {        // тишина в середине естественной паузы перед словом wi
  if (!(need > 0)) return 0;
  if (!canInsert(wi)) { if (must) throw new Error(`нельзя вставить тишину (${why}) перед «${words[wi].w}» (строка ${lineOf(wi) + 1}): это середина фразы или дубль ведущего`); denied.push({ wi, need, why }); return 0; }
  const prevE = lines[lineOf(wi - 1)].end, nextS = lines[lineOf(wi)].start, at = (prevE + nextS) / 2;   // середина настоящей тишины между строками записи
  inserts.push({ at: +at.toFixed(3), dur: +need.toFixed(3), gap: +(nextS - prevE).toFixed(3), why, before: `${lineOf(wi) + 1}: ${words[wi].w}` }); shift += need; return need;
};
const minPrev = (s, wi, mid) => {   // добор длины предыдущего плана тишиной перед словом wi — только если там стык строк
  const pv = shots[shots.indexOf(s) - 1];
  if (!pv || pv.start == null) return;
  const need = /^[A-Z][A-Z0-9 ]{1,20}:/.test(pv.text) ? MIN.line : pv.loc === 'T-card' ? (pv.toks.length <= 3 ? MIN.line : MIN.card) : pv.loc === '3D-city' ? MIN.card : MIN.any;
  const t0 = mid ? ((wi > 0 ? words[wi - 1].e : 0) + words[wi].s) / 2 + shift : words[wi].s + shift;
  if (t0 - pv.start < need) insertBefore(wi, need - (t0 - pv.start), 'мин. длина плана #' + pv.n);
};
for (const s of shots) {
  const bi = BOX.indexOf(s.n);
  if (bi >= 0) {
    if (s.wi == null) throw new Error(`#${s.n}: подплан пути коробки без голоса — убрать из шотлиста (голос внутри фразы не останавливается)`);
    if (bi === 0) minPrev(s, s.wi);
    s.start = words[s.wi].s + shift; s.box = { from: BOXSEG[bi][0], to: BOXSEG[bi][1] }; continue;
  }
  // хвост без голоса после последней реплики (каскад #347, отъезд над Сингапуром #348): первый — через 0.4 с после голоса,
  // следующие — подряд по своей длине из шотлиста
  const ti = shots.indexOf(s), tail = shots.findIndex((x, k) => shots.slice(k).every(y => y.wi == null && /^—/.test(y.text)));
  if (tail >= 0 && ti >= tail) { s.start = ti === tail ? voiceEnd + shift + .4 : shots[ti - 1].start + shots[ti - 1].listDur; continue; }
  if (s.n === 1) { s.start = 0; continue; }
  if (s.wi == null && /^—/.test(s.text)) {   // план без голоса (музыка): тишина длиной listDur перед следующей строкой
    const nx = shots.slice(shots.indexOf(s) + 1).find(x => x.wi != null); minPrev(s, nx.wi, true); const prevE = nx.wi > 0 ? words[nx.wi - 1].e : 0;
    s.start = (prevE + words[nx.wi].s) / 2 + shift; insertBefore(nx.wi, s.listDur, 'план без голоса #' + s.n, true); continue;
  }
  if (s.wi == null) { console.log('MISSING', s.n, s.text, problems.slice(-3)); process.exit(1); }
  // короткие планы: реплика ≥ 1.5 с, карточка ≥ 1.8 с (из 1–3 слов ≥ 1.5 с), пролёт 3D-city ≥ 1.8 с, прочее ≥ 1.3 с —
  // недостающее добирается тишиной перед первым словом этого плана, ЕСЛИ это стык строк (иначе план остаётся коротким)
  minPrev(s, s.wi, s.loc === 'T-title');
  if (s.loc === 'T-title') {               // тишина перед закадром: титр стоит с середины паузы
    const prevE = s.wi > 0 ? words[s.wi - 1].e : 0, at = (prevE + words[s.wi].s) / 2;
    s.start = at + shift; insertBefore(s.wi, TITLE_PAUSE, 'титр главы', true); continue;
  }
  // название ролика встаёт в паузу, не под голос (shot_for_shot, правка 6): тишина перед «But first,»
  if (/^But first,/.test(s.text)) insertBefore(s.wi, TITLE_GAP, 'название ролика', true);
  s.start = words[s.wi].s + shift;
}
const total = shots[shots.length - 1].start + (shots[shots.length - 1].listDur || 2.0);
shots.forEach((s, i) => { s.end = i + 1 < shots.length ? shots[i + 1].start : total; s.dur = s.end - s.start; });
// текст, который реально звучит на плане (слова от его первого до первого слова следующего плана с текстом)
for (let i = 0; i < shots.length; i++) {
  const s = shots[i]; if (s.wi == null) { s.spoken = ''; continue; }
  let j = i + 1; while (j < shots.length && shots[j].wi == null) j++;
  const to = j < shots.length ? shots[j].wi : words.length;
  s.spoken = words.slice(s.wi, to).map(w => w.w).join(' ');
}
// сдвиг слова по вставкам (для субтитров/проверки)
const shiftAt = t => inserts.filter(x => x.at <= t).reduce((a, x) => a + x.dur, 0);
// ---- проверка «речь не рвётся» (сборка падает): 1) каждая вставка — на стыке строк, не в дубле ведущего, в настоящей тишине;
// 2) внутри каждой строки паузы между словами на шкале фильма те же, что в записи (до 1 мс).
{
  const errs = [];
  for (const x of inserts) {
    let k = words.findIndex(w => w.s >= x.at); if (k < 0) k = words.length - 1;
    const inLine = lineOf(k) === lineOf(k - 1), host = isHost(lineOf(k)) && isHost(lineOf(k - 1)), gap = words[k].s - words[k - 1].e;
    if (inLine) errs.push(`тишина ${x.dur} с ВНУТРИ строки ${lineOf(k) + 1}: «${words[k - 1].w} | ${words[k].w}» (естественная пауза ${gap.toFixed(2)} с)`);
    else if (host) errs.push(`тишина ${x.dur} с внутри дубля ведущего: строки ${lineOf(k)}–${lineOf(k) + 1}`);
    else if (!(x.at > lines[lineOf(k - 1)].end && x.at < lines[lineOf(k)].start)) errs.push(`тишина ${x.dur} с не в паузе между строками ${lineOf(k)} и ${lineOf(k) + 1} (запись: ${lines[lineOf(k - 1)].end}–${lines[lineOf(k)].start}, вставка на ${x.at})`);
    else if (gap < .1) errs.push(`тишина ${x.dur} с там, где пауза между строками всего ${gap.toFixed(2)} с: строка ${lineOf(k) + 1}`);
  }
  for (let k = 1; k < words.length; k++) if (lineOf(k) === lineOf(k - 1) || (isHost(lineOf(k)) && isHost(lineOf(k - 1)))) {
    const raw = words[k].s - words[k - 1].e, film = (words[k].s + shiftAt(words[k].s)) - (words[k - 1].e + shiftAt(words[k - 1].e));
    if (Math.abs(film - raw) > .001) errs.push(`пауза «${words[k - 1].w} | ${words[k].w}» (строка ${lineOf(k) + 1}): в записи ${raw.toFixed(3)} с, в фильме ${film.toFixed(3)} с`);
  }
  console.log(`речь: вставок тишины ${inserts.length} (все на стыках строк), отказано во вставке внутри фраз: ${denied.length}; нарушений: ${errs.length}`);
  if (errs.length) { errs.forEach(e => console.log('  !! ' + e)); console.log('СБОРКА ОСТАНОВЛЕНА: речь рвётся'); process.exit(1); }
}
// грамматика камеры: рывок на ударном слове «…» из колонки «камера»; вип-пан — на первом слове второго говорящего
const absW = k => words[k].s + shiftAt(words[k].s);
for (let i = 0; i < shots.length; i++) {
  const s = shots[i]; if (s.wi == null) continue;
  let j = i + 1; while (j < shots.length && shots[j].wi == null) j++;
  const to = j < shots.length ? shots[j].wi : words.length;
  const m = s.camera.match(/«([^»]+)»/);
  if (m && /рывок/.test(s.camera)) {
    const key = norm(m[1]); let k = -1;
    for (let q = s.wi; q < to; q++) if (words[q].k === key) { k = q; break; }
    let t = k >= 0 ? absW(k) - s.start : s.dur * .55;
    if (t < s.dur * .3) {   // слово слишком рано — рывку нужна остановка перед ним: берём ударное слово во второй половине фразы
      for (let q = s.wi; q < to; q++) if (words[q].w.replace(/[^A-Za-z0-9$%]/g, '').length >= 4 && absW(q) - s.start >= s.dur * .4 && absW(q) - s.start <= s.dur - .3) { k = q; t = absW(q) - s.start; break; }
    }
    s.snap = +Math.min(Math.max(t, .25), s.dur - .2).toFixed(3);
    if (k >= 0) s.snapWord = words[k].w.replace(/^[^A-Za-z0-9$]+|[^A-Za-z0-9%]+$/g, '');
    // второй и следующие рывки: «рывок на «A» и «B»» — каждое следующее ударное слово, не раньше 0.45 с после предыдущего
    const more = [...s.camera.matchAll(/ и «([^»]+)»/g)].map(x => norm(x[1].split(/\s+/)[0])); let prevT = s.snap;
    for (const key2 of more) { for (let q = s.wi; q < to; q++) if (words[q].k === key2) { const t2 = absW(q) - s.start;
      if (t2 > prevT + .45 && t2 < s.dur - .2) { (s.snaps ||= []).push({ t: +t2.toFixed(3), w: words[q].w.replace(/^[^A-Za-z0-9$]+|[^A-Za-z0-9%]+$/g, '') }); prevT = t2; break; } } }
  } else if (/рывок на событии/.test(s.camera)) s.snap = +(s.dur * .55).toFixed(3);
  // события по словам: часть колонки «событие» вида «на «слово» …» встаёт на время этого слова
  s.ev = [];
  s.event.split(/;\s*/).forEach((part, pi) => {
    const m2 = part.match(/(?:^|\s)на «([^»]+)»/); if (!m2) return;
    const key = norm(m2[1].split(/\s+/)[0]); let k = -1;
    for (let q = s.wi; q < to; q++) if (words[q].k === key) { k = q; break; }
    if (k >= 0) s.ev.push({ p: pi, t: +(absW(k) - s.start).toFixed(3) });
  });
  if (/вип-пан/.test(s.camera)) {
    const sp0 = lines[words[s.wi].li].speaker;
    for (let q = s.wi + 1; q < to; q++) if (lines[words[q].li].speaker !== sp0) {
      s.whip = { t: +(absW(q) - s.start).toFixed(3), from: sp0, to: lines[words[q].li].speaker }; break;
    }
  }
  // удары камеры по словам (колонка «камера»): «удары по словам» — на каждом ударном слове фразы (не чаще 0.3 с; удар может совпасть с событием — тогда он даёт движение камеры, а не лишнее событие);
  // «удары ×N» — на N самых ударных словах (длинные, числа, имена), не чаще 0.6 с. Не ближе 0.35 с к рывку, вип-пану и событиям
  // плана — каждый удар отдельное событие. Рисует core.js (beatXf): перекадровка всего кадра, без изменения яркости
  const bm = !/статично/.test(s.camera) && s.camera.match(/удары (по словам|×(\d+))/);
  if (bm) {
    const STOP = new Set('the and was are him her his hers who one but for its our you has had not all can did get got how out say see she too two way why yes any off own that this with from they them their there then than have were what when where which while your into been just also only some more most like over very about after before because could would should every those these other'.split(' '));
    const busy = (bm[2] ? [s.snap, ...(s.snaps || []).map(x => x.t), ...s.ev.map(e => e.t), s.whip && s.whip.t] : [s.snap, s.whip && s.whip.t]).filter(x => x != null);
    const cand = [];
    for (let q = s.wi; q < to; q++) {
      const w = words[q].w.replace(/^[^A-Za-z0-9$]+|[^A-Za-z0-9%]+$/g, ''), t = absW(q) - s.start;
      if (t < .25 || t > s.dur - .3 || (w.length < (bm[2] ? 4 : 3) && !/\d/.test(w)) || STOP.has(w.toLowerCase())) continue;
      cand.push({ t, w, sc: w.length + (/\d|\$/.test(w) ? 4 : 0) + (/^[A-Z]/.test(w) && q > s.wi ? 2 : 0) });
    }
    const N = bm[2] ? +bm[2] : 99, gap = bm[2] ? .6 : .3, near = bm[2] ? .35 : .15, pick = [];
    for (const c of bm[2] ? [...cand].sort((a, b) => b.sc - a.sc) : cand) {
      if (pick.length >= N) break;
      if (busy.some(x => Math.abs(x - c.t) < near) || pick.some(p => Math.abs(p.t - c.t) < gap)) continue;
      pick.push(c);
    }
    if (pick.length) s.beats = pick.sort((a, b) => a.t - b.t).map(p => ({ t: +p.t.toFixed(3), w: p.w }));
  }
}

const out = {
  fps: 30, voiceDuration: voiceEnd, total: +total.toFixed(3), inserts, linesFile: LINES_REF, audioFile: AUDIO_FILE,
  note: 'start/end — секунды аниматика (голос со вставленными паузами inserts: at — время в voice_draft.mp3, dur — тишина)',
  shots: shots.map(s => ({ n: s.n, ch: s.ch, chTitle: s.chTitle, start: +s.start.toFixed(3), end: +s.end.toFixed(3), dur: +s.dur.toFixed(3),
    listDur: s.listDur, loc: s.loc, framing: s.framing, text: s.text, spoken: s.spoken, event: s.event, camera: s.camera, ...(s.box ? { box: s.box } : {}), ...(s.snap != null ? { snap: s.snap, snapWord: s.snapWord } : {}), ...(s.snaps ? { snaps: s.snaps } : {}), ...(s.beats ? { beats: s.beats } : {}), ...(s.whip ? { whip: s.whip } : {}), ...(s.ev && s.ev.length ? { ev: s.ev } : {}) })),
};
writeFileSync(join(L, OUT_FILE), JSON.stringify(out, null, 1));
// слова на шкале фильма (секунды фильма): рот героя двигается только на своих словах (film/words.js)
const wordsOut = { lines: LINES_REF, total: out.total, words: lines.flatMap((l, li) => l.words.map(w => ({ w: w.w, s: +(w.s + shiftAt(w.s)).toFixed(3), e: +(w.e + shiftAt(w.s)).toFixed(3), sp: l.speaker, line: li + 1 }))) };
writeFileSync(join(L, OUT_FILE.replace(/timing/, 'words')), JSON.stringify(wordsOut));

// ---- отчёт
const r = x => x.toFixed(1);
console.log('voice', r(voiceEnd), 'total', r(total), 'inserts', JSON.stringify(inserts));
problems.forEach(x => console.log('!', x));
const chs = [...new Set(shots.map(s => s.ch))];
console.log('ch | shots | sec | shots/min | avg | min(#) | max(#) | <1s | >8s');
for (const c of chs) {
  const a = shots.filter(s => s.ch === c), d = a[a.length - 1].end - a[0].start;
  const mn = a.reduce((x, y) => (y.dur < x.dur ? y : x)), mx = a.reduce((x, y) => (y.dur > x.dur ? y : x));
  console.log(`${c} | ${a.length} | ${r(d)} | ${r(a.length / d * 60)} | ${(d / a.length).toFixed(2)} | ${mn.dur.toFixed(2)} (#${mn.n}) | ${r(mx.dur)} (#${mx.n}) | ${a.filter(s => s.dur < 1).map(s => s.n).join(',')} | ${a.filter(s => s.dur > 8).map(s => s.n).join(',')}`);
}
const so = [...shots].sort((a, b) => a.dur - b.dur);
console.log('shortest', so.slice(0, 12).map(s => `#${s.n} ${s.dur.toFixed(2)}`).join(', '));
console.log('longest', so.slice(-12).reverse().map(s => `#${s.n} ${s.dur.toFixed(2)}`).join(', '));
console.log('<1s:', shots.filter(s => s.dur < 1).length, ' >8s:', shots.filter(s => s.dur > 8).length);
