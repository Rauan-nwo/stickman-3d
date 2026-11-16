// make_timing.mjs: шотлист L001 + черновой голос -> timing.json и план склейки звука для аниматика.
//   node production/L001/animatic/make_timing.mjs
// Старт плана = начало первого слова его «текста» (поиск последовательно по словам lines_draft.json).
// Путь коробки (7 планов 3D-boxpath в гл. 6) идёт по готовому видео box_path_v2 (S1..S6 + 3D-хвост): фразы голоса сдвигаются
// тишиной так, чтобы каждая начиналась на своём подплане; S4 — без голоса (пауза из шотлиста). Последний план — 2 с музыки.
// Титр главы (T-title): перед его первым словом вставляется TITLE_PAUSE с тишины — титр читается до начала закадра.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const D = dirname(fileURLToPath(import.meta.url)), L = join(D, '..');
const md = readFileSync(join(L, 'shotlist.md'), 'utf8').split(/\r?\n/);
const lines = JSON.parse(readFileSync(join(L, 'out', 'lines_draft.json'), 'utf8'));

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
const norm = w => w.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]/g, '');
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
const BOX = shots.filter(s => s.ch === 6 && s.loc === '3D-boxpath').map(s => s.n).slice(0, 7), AFTER_BOX = BOX[6] + 1, TITLE_PAUSE = 1.2, MIN = { line: 1.5, card: 1.8, any: 1.3 }, SEG = [0, 2.1, 4.1, 6.3, 8.2, 10.5, 13.3], BOX_END = 17.9, LEAD = .15;
const inserts = []; let shift = 0, boxStart = null;
const insertBefore = (wi, need) => {        // тишина в середине паузы перед словом wi
  const prevE = wi > 0 ? words[wi - 1].e : 0, at = (prevE + words[wi].s) / 2;
  inserts.push({ at: +at.toFixed(3), dur: +need.toFixed(3) }); shift += need;
};
const minPrev = (s, wi, mid) => {   // добор длины предыдущего плана тишиной перед словом wi
  const pv = shots[shots.indexOf(s) - 1];
  if (!pv || pv.start == null || pv.box) return;
  const need = /^[A-Z][A-Z0-9 ]{1,20}:/.test(pv.text) ? MIN.line : pv.loc === 'T-card' ? (pv.toks.length <= 3 ? MIN.line : MIN.card) : pv.loc === '3D-city' ? MIN.card : MIN.any;
  const t0 = mid ? ((wi > 0 ? words[wi - 1].e : 0) + words[wi].s) / 2 + shift : words[wi].s + shift;
  if (t0 - pv.start < need) insertBefore(wi, need - (t0 - pv.start));
};
for (const s of shots) {
  const bi = BOX.indexOf(s.n);
  if (bi >= 0) {
    if (bi === 0) { boxStart = words[s.wi].s + shift; s.start = boxStart; s.box = { from: 0, to: SEG[1] }; continue; }
    s.start = boxStart + SEG[bi]; s.box = { from: SEG[bi], to: SEG[bi + 1] ?? BOX_END };
    if (s.wi != null) { const want = s.start + LEAD, act = words[s.wi].s + shift; if (act < want) insertBefore(s.wi, want - act); }
    continue;
  }
  if (s.n === LAST) { s.start = voiceEnd + shift + .4; continue; }
  if (s.n === 1) { s.start = 0; continue; }
  if (s.wi == null && /^—/.test(s.text)) {   // план без голоса (музыка): тишина длиной listDur перед следующей фразой
    const nx = shots.slice(shots.indexOf(s) + 1).find(x => x.wi != null); minPrev(s, nx.wi, true); const prevE = nx.wi > 0 ? words[nx.wi - 1].e : 0;
    s.start = (prevE + words[nx.wi].s) / 2 + shift; insertBefore(nx.wi, s.listDur); continue;
  }
  if (s.wi == null) { console.log('MISSING', s.n, s.text, problems.slice(-3)); process.exit(1); }
  // короткие планы: реплика ≥ 1.5 с, карточка ≥ 1.8 с (из 1–3 слов ≥ 1.5 с), пролёт 3D-city ≥ 1.8 с, прочее ≥ 1.3 с —
  // недостающее добирается тишиной перед первым словом этого плана (смена говорящего успевает прочитаться)
  minPrev(s, s.wi, s.loc === 'T-title');
  if (s.loc === 'T-title') {               // тишина перед закадром: титр стоит с середины паузы
    const prevE = s.wi > 0 ? words[s.wi - 1].e : 0, at = (prevE + words[s.wi].s) / 2;
    s.start = at + shift; insertBefore(s.wi, TITLE_PAUSE); continue;
  }
  let st = words[s.wi].s + shift;
  if (boxStart != null && s.n === AFTER_BOX && st < boxStart + BOX_END + .25) { insertBefore(s.wi, boxStart + BOX_END + .25 - st); st = words[s.wi].s + shift - .25; }
  s.start = st;
}
const total = shots[shots.length - 1].start + 2.0;
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

const out = {
  fps: 30, voiceDuration: voiceEnd, total: +total.toFixed(3), inserts,
  note: 'start/end — секунды аниматика (голос со вставленными паузами inserts: at — время в voice_draft.mp3, dur — тишина)',
  shots: shots.map(s => ({ n: s.n, ch: s.ch, chTitle: s.chTitle, start: +s.start.toFixed(3), end: +s.end.toFixed(3), dur: +s.dur.toFixed(3),
    listDur: s.listDur, loc: s.loc, framing: s.framing, text: s.text, spoken: s.spoken, event: s.event, camera: s.camera, ...(s.box ? { box: s.box } : {}) })),
};
writeFileSync(join(D, 'timing.json'), JSON.stringify(out, null, 1));

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
