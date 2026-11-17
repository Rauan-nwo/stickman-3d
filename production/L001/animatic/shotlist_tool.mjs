// shotlist_tool.mjs: проверка и правка шотлиста L001.
//   node shotlist_tool.mjs check                 — текст планов против script.md слово в слово, карточки, крупности подряд
//   node shotlist_tool.mjs apply <ops.mjs>       — правки по СТАРЫМ номерам (set / split / insert / del), перенумерация,
//                                                  карта старый→новый в tmp/renumber.json и перенос номеров в conf.js / film.js
//   node shotlist_tool.mjs remap <map.json>      — только перенос номеров в conf.js / film.js по карте {старый: новый}
//   node shotlist_tool.mjs sync                  — старт и длительность планов из timing.json (черновой голос), шапки глав,
//                                                  итоги и раздел «Проверка»
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const D = dirname(fileURLToPath(import.meta.url)), L = join(D, '..');
const SL = join(L, 'shotlist.md'), SC = join(L, 'script.md');
const ROW = /^\| (\d+) \| ([\d:.]+) \| (.*?) \| (\S+) \| (.*?) \| ([\d.]+) \| (.*?) \| (.*?) \|$/;
const fmt = t => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;

// ---- сценарий: поток токенов (реплика = токен «NAME:» + слова), границы строк
function scriptStream() {
  const md = readFileSync(SC, 'utf8'); const body = md.slice(md.indexOf('<!-- SCRIPT START -->'), md.indexOf('<!-- SCRIPT END -->'));
  const toks = []; let ch = null;
  for (const raw of body.split(/\r?\n/)) {
    const s = raw.trim(); const h = s.match(/^## (\d+)\./); if (h) { ch = +h[1]; continue; }
    if (!s || s.startsWith('[SCENE') || s.startsWith('<!--') || s.startsWith('#')) continue;
    s.split(/\s+/).forEach((w, i) => toks.push({ w, ch, lineStart: i === 0 }));
  }
  return toks;
}
// ---- шотлист
function parse() {
  const lines = readFileSync(SL, 'utf8').split(/\r?\n/); const shots = []; let ch = null;
  lines.forEach((s, i) => {
    const h = s.match(/^### Гл\. (\d+)\./); if (h) ch = +h[1];
    const m = s.match(ROW); if (m && ch != null) shots.push({ li: i, n: +m[1], start: m[2], text: m[3], loc: m[4], framing: m[5], dur: +m[6], event: m[7], camera: m[8], ch });
  });
  return { lines, shots };
}
const rowOf = s => `| ${s.n} | ${s.start} | ${s.text} | ${s.loc} | ${s.framing} | ${(+s.dur).toFixed(1)} | ${s.event} | ${s.camera} |`;
const textToks = t => (/^—/.test(t) ? [] : t.replace(/\s*…\s*$/, '').split(/\s+/).filter(Boolean));
const truncated = t => /…\s*$/.test(t);
// позиции планов в потоке сценария: каждый план начинается там, где кончился предыдущий
function locate(shots, toks) {
  const errs = []; let p = 0;
  for (const s of shots) {
    const tk = textToks(s.text); if (!tk.length) { s.pos = null; continue; }
    if (!tk.every((w, j) => toks[p + j] && toks[p + j].w === w)) errs.push(`#${s.n}: текст «${s.text}» не совпадает со сценарием в позиции ${p}: «${toks.slice(p, p + tk.length).map(x => x.w).join(' ')}»`);
    if (toks[p] && toks[p].ch !== s.ch) errs.push(`#${s.n}: глава плана ${s.ch}, в сценарии — ${toks[p].ch}`);
    s.pos = p;
    if (!truncated(s.text)) p += tk.length;           // полный текст — следующий план сразу после него
    else {                                              // обрезанный — следующий план ищется дальше (проверяется им самим)
      const nx = shots[shots.indexOf(s) + 1 + shots.slice(shots.indexOf(s) + 1).findIndex(x => textToks(x.text).length)];
      const nt = nx ? textToks(nx.text) : null; let q = p + tk.length;
      if (nt) { while (q < toks.length && !nt.every((w, j) => toks[q + j] && toks[q + j].w === w)) q++; }
      else q = toks.length;
      if (q - p <= tk.length) errs.push(`#${s.n}: текст с «…», но кусок закадра не длиннее начала`);
      p = q;
    }
    s.end = p;
  }
  if (p !== toks.length) errs.push(`после последнего плана осталось ${toks.length - p} слов сценария`);
  return errs;
}
const chunkOf = (s, toks) => (s.pos == null ? '' : toks.slice(s.pos, s.end).map(x => x.w).join(' '));
function headText(chunk) {           // колонка «текст (начало…)»: до ~50 знаков по словам + « …»
  if (chunk.length <= 52) return chunk;
  const w = chunk.split(' '); let o = '';
  for (const x of w) { if ((o + ' ' + x).trim().length > 50) break; o = (o + ' ' + x).trim(); }
  return o + ' …';
}
const sizeKey = s => /^T-(joke|desk)/.test(s.loc) ? s.loc + '|' + s.framing.split(' ')[0] : s.loc.startsWith('T-') ? s.loc : s.loc.startsWith('3D-') ? s.loc + '|' + s.framing : (s.framing.split(' ')[0]);
const norm = s => s.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

function check(verbose = true) {
  const { shots } = parse(), toks = scriptStream(), errs = locate(shots, toks);
  shots.forEach((s, i) => { if (s.n !== i + 1) errs.push(`номер #${s.n} на месте ${i + 1}`); });
  const rep = [];
  shots.forEach((s, i) => { if (i && sizeKey(s) === sizeKey(shots[i - 1])) rep.push(`#${shots[i - 1].n}→#${s.n} (${sizeKey(s)})`); });
  const cardBad = [];
  for (const s of shots.filter(s => s.loc === 'T-card')) {
    const q = (s.event.match(/«([^»]+)»/) || [])[1]; if (!q || !norm(chunkOf(s, toks)).includes(norm(q))) cardBad.push(`#${s.n} «${q}»`);
  }
  const noEv = shots.filter(s => !s.event.trim() || !s.camera.trim()).map(s => '#' + s.n);
  if (verbose) {
    console.log(`планов ${shots.length}; слов сценария ${toks.length}`);
    console.log('текст против сценария:', errs.length ? '\n  ' + errs.join('\n  ') : 'расхождений нет');
    console.log('одинаковые крупности подряд:', rep.length ? rep.join(', ') : 0);
    console.log('карточки не из закадра своего плана:', cardBad.length ? cardBad.join(', ') : 0);
    console.log('планы без события или камеры:', noEv.length ? noEv.join(', ') : 0);
  }
  return { shots, toks, errs, rep, cardBad, noEv };
}

async function apply(opsFile) {
  const { lines, shots } = parse(), toks = scriptStream(); const e0 = locate(shots, toks);
  if (e0.length) { console.log('шотлист до правок не сходится со сценарием:\n' + e0.join('\n')); process.exit(1); }
  const { default: ops } = await import(pathToFileURL(resolve(opsFile)).href);
  const byN = new Map(shots.map(s => [s.n, s]));
  // set: поля плана; split: новые планы внутри куска старого, по фразе начала; ins: новый план без голоса после; del
  for (const o of ops) {
    const s = byN.get(o.n); if (!s) throw new Error('нет плана ' + o.n);
    if (o.set) Object.assign(s, o.set);
    if (o.keepFirst === false) s.keep = false;
    if (o.del) s.del = true;
    if (o.split) s.split = o.split;
    if (o.after) s.after = o.after;
  }
  const out = []; const map = {};
  for (const s of shots) {
    if (s.del) { map[s.n] = null; continue; }
    const pieces = [s];
    if (s.split) {
      const chunk = toks.slice(s.pos, s.end).map(x => x.w); let from = 0;
      for (const sp of s.split) {
        const at = sp.from.split(/\s+/); let k = -1;
        for (let i = from + 1; i < chunk.length; i++) if (at.every((w, j) => chunk[i + j] === w)) { k = i; break; }
        if (k < 0) throw new Error(`#${s.n}: не найдено «${sp.from}» в куске «${chunk.join(' ')}»`);
        pieces.push({ ...s, ...sp.row, keep: sp.keep, k, split: null, after: null, src: s.n }); from = k;
      }
      const ks = [0, ...pieces.slice(1).map(p => p.k), chunk.length];
      pieces.forEach((p, i) => { p.text = headText(chunk.slice(ks[i], ks[i + 1]).join(' ')); });
    }
    if (s.after) for (const a of s.after) pieces.push({ ...s, ...a, text: '— (без голоса, музыка)', split: null, after: null, src: s.n });
    const km = pieces.findIndex(p => p.keep); pieces.forEach((p, i) => { p.orig = s.n; p.isMap = i === (km >= 0 ? km : 0); delete p.keep; out.push(p); });
  }
  out.forEach((s, i) => { if (s.isMap) map[s.orig] = i + 1; s.newN = i + 1; });
  // переписать таблицы глав: строки планов удаляются и вставляются по главам
  const res = []; let i = 0;
  const byCh = {}; out.forEach(s => (byCh[s.ch] ||= []).push(s));
  while (i < lines.length) {
    const h = lines[i].match(/^### Гл\. (\d+)\./);
    res.push(lines[i]); i++;
    if (h) {
      while (i < lines.length && !ROW.test(lines[i])) { res.push(lines[i]); i++; }
      while (i < lines.length && ROW.test(lines[i])) i++;
      for (const s of byCh[+h[1]] || []) res.push(rowOf({ ...s, n: s.newN }));
    }
  }
  writeFileSync(SL, res.join('\n'));
  mkdirSync(join(D, 'tmp'), { recursive: true });
  writeFileSync(join(D, 'tmp', 'renumber.json'), JSON.stringify(map));
  remapCode(map);
  console.log(`было ${shots.length}, стало ${out.length}; удалено ${Object.values(map).filter(v => v === null).length}, новых ${out.filter(s => s.src).length}`);
  check();
}
// номера планов в conf.js и film.js (ключи объектов и сравнения s.n === N)
function remapCode(map) {
  const m = n => { const v = map[n]; if (v === undefined) throw new Error('нет в карте ' + n); return v; };
  const conf = join(D, 'conf.js');
  let c = readFileSync(conf, 'utf8');
  c = c.replace(/^(\s*)(\d+)(: (?:d =>|\[\[|'))/gm, (_, sp, n, rest) => sp + m(+n) + rest);
  c = c.replace(/(YEAR = \{)([^}]*)\}/, (_, a, b) => a + b.replace(/(\d+):/g, (__, n) => m(+n) + ':') + '}');
  writeFileSync(conf, c);
  for (const film of [join(D, 'film.js'), join(D, 'core.js')].filter(existsSync)) {   // после выноса кода в core.js номера живут там
  let f = readFileSync(film, 'utf8');
  f = f.replace(/(const PROP_AT = \{)([\s\S]*?)\};/, (_, a, b) => a + b.replace(/(\d+): \[/g, (__, n) => m(+n) + ': [') + '};');
  f = f.replace(/(const PL = \{)([\s\S]*?)\}\[s\.n\]/, (_, a, b) => a + b.replace(/(\d+): \['/g, (__, n) => m(+n) + ": ['") + '}[s.n]');
  f = f.replace(/s\.n === (\d+)/g, (_, n) => 's.n === ' + m(+n));
  f = f.replace(/!\[([\d, ]+)\]\.includes\(s\.n\)/, (_, l) => '![' + l.split(',').map(x => m(+x.trim())).join(', ') + '].includes(s.n)');
  writeFileSync(film, f);
  }
}

function sync() {
  const tm = JSON.parse(readFileSync(join(D, 'timing.json'), 'utf8'));
  const { lines, shots, toks, errs, rep, cardBad, noEv } = { ...parse(), ...check(false) };
  if (tm.shots.length !== shots.length) throw new Error('timing.json не от этого шотлиста — сначала make_timing');
  const T = new Map(tm.shots.map(s => [s.n, s]));
  // план без голоса: в колонке «с» остаётся заданная длина тишины (make_timing читает её как listDur), иначе длина растёт с каждым циклом
  for (const s of shots) { const t = T.get(s.n); s.start = fmt(t.start); if (!/^—/.test(s.text)) s.dur = t.dur; s.t0 = t.start; s.t1 = t.end;
    if (t.snapWord && /«[^»]+»/.test(s.camera)) s.camera = s.camera.replace(/«[^»]+»/, `«${t.snapWord}»`);   // ударное слово — как в черновом голосе
    lines[s.li] = rowOf(s); }
  const chs = [...new Set(shots.map(s => s.ch))];
  const st = {};
  for (const c of chs) {
    const a = shots.filter(s => s.ch === c), d = a[a.length - 1].t1 - a[0].t0, cards = a.filter(s => s.loc === 'T-card').length;
    st[c] = { a, d, n: a.length, pm: a.length / d * 60, cards, cpm: cards / d * 60, avg: d / a.length, start: a[0].t0,
      rep: rep.filter(r => a.some(s => r.endsWith('#' + s.n + ' (' + sizeKey(s) + ')'))).length, max: Math.max(...a.map(s => s.dur)) };
  }
  for (let i = 0; i < lines.length; i++) {
    const h = lines[i].match(/^### Гл\. (\d+)\. (.+?) — /);
    if (h) { const x = st[+h[1]]; lines[i] = `### Гл. ${h[1]}. ${h[2]} — ${fmt(x.start)}, ${x.n} планов, ${x.d.toFixed(1)} с, ${x.pm.toFixed(1)} пл/мин, карточек ${x.cards}`; }
  }
  const total = tm.total, N = shots.length, cardsAll = shots.filter(s => s.loc === 'T-card').length;
  // таблица глав в «Итогах»
  const t1 = lines.findIndex(l => l.startsWith('| Глава | старт | планов |'));
  if (t1 >= 0) { let j = t1 + 2; for (const c of chs) { const x = st[c]; lines[j] = `| ${c}. ${titleOf(lines, c)} | ${fmt(x.start)} | ${x.n} | ${x.d.toFixed(0)} | ${x.pm.toFixed(1)} | ${x.cards} |`; j++; } }
  // таблица «Проверка»
  const t2 = lines.findIndex(l => l.startsWith('| Глава | планов | длит.'));
  if (t2 >= 0) {
    const hdr = '| Глава | планов | длит., с | планов/мин | карточек | карточек/мин | повторов крупности подряд | сред. план, с | макс. план, с | итог |';
    const body = chs.map(c => { const x = st[c];
      const okk = x.max <= 8 && !x.rep ? 'OK' : 'нет';
      return `| ${c}. ${titleOf(lines, c)} | ${x.n} | ${x.d.toFixed(1)} | ${x.pm.toFixed(1)} | ${x.cards} | ${x.cpm.toFixed(1)} | ${x.rep} | ${x.avg.toFixed(1)} | ${x.max.toFixed(1)} | ${okk} |`; });
    body.push(`| **Итого** | **${N}** | **${total.toFixed(1)} (${fmt(total)})** | **${(N / total * 60).toFixed(1)}** | **${cardsAll}** | **${(cardsAll / total * 60).toFixed(1)}** | **${rep.length}** | **${(total / N).toFixed(1)}** | **${Math.max(...shots.map(s => s.dur)).toFixed(1)}** | |`);
    let j = t2 + 2; while (lines[j] && lines[j].startsWith('|')) j++;
    lines.splice(t2, j - t2, hdr, '|---|---|---|---|---|---|---|---|---|---|', ...body);
  }
  writeFileSync(SL, lines.join('\n'));
  console.log(`sync: ${N} планов, ${fmt(total)}, карточек ${cardsAll}, повторов ${rep.length}, текст: ${errs.length ? errs.length + ' ошибок' : 'ок'}, карточки: ${cardBad.length}, без события: ${noEv.length}`);
  console.log('>8 с:', shots.filter(s => s.dur > 8).map(s => `#${s.n} ${s.dur.toFixed(1)}`).join(', ') || 'нет');
}
function titleOf(lines, c) { for (const l of lines) { const h = l.match(/^### Гл\. (\d+)\. (.+?) — /); if (h && +h[1] === c) return h[2]; } return ''; }

const [cmd, arg] = process.argv.slice(2);
if (cmd === 'check') { const r = check(); if (r.errs.length || r.rep.length || r.cardBad.length) process.exitCode = 1; }
else if (cmd === 'apply') await apply(arg);
else if (cmd === 'sync') sync();
else if (cmd === 'remap') { remapCode(JSON.parse(readFileSync(arg, 'utf8'))); console.log('remap ok'); }
else console.log('check | apply <ops.mjs> | sync');
