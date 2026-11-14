#!/usr/bin/env node
// make.mjs: весь конвейер одной командой — голос -> сборка -> рендер -> субтитры -> звук -> проверка.
//
//   node engine/tools/make.mjs <папка фильма>  [--no-voice] [--voice en-US-GuyNeural] [--rate +35%]
//        [--set gun=2d ...] [--music m.wav --music-gain -18 --duck 10] [--sfx f.wav@1.94:-3 ...] [--bed -30 | --no-bed]
//        [--no-qa] [любые пороги qa.mjs: --min-dur 3 --max-dur 6 --min-epm 20 --max-epm 200 ...]
//
// Что откуда берётся (всё лежит в папке фильма):
//   narration.txt  -> voice.mp3 + words.json (edge-tts; запускается, если voice.mp3 нет или текст новее)
//   film.js        -> out/film.html -> out/raw.mp4
//   words.json     -> out/captions.ass   (или captions.json с ручными репликами: [[кадр, "текст"], ..., ["end", кадр]])
//   всё вместе     -> out/final.mp4 -> таблица QA
//   make.json      (необязательно) — постоянные настройки фильма: { "voice": false, "captions": {...}, "audio": {...}, "qa": {...}, "set": {...} }
// У фильмов из engine/films/ папка сборки — engine/out/<имя>/.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ENGINE, parseArgs, filmPaths, run, python, ms, probe } from './lib.mjs';
import { buildFilm } from './build.mjs';
import { assemble } from './assemble.mjs';
import { qa } from './qa.mjs';

const { pos, opt } = parseArgs(process.argv.slice(2), ['sfx', 'set']);
if (!pos[0]) { console.error('usage: node engine/tools/make.mjs <папка фильма> [--no-voice] [--set k=v] [--music f.wav] [--sfx f.wav@t] [--no-qa] [пороги qa]'); process.exit(2); }
const p = filmPaths(pos[0]);
const cfg = existsSync(join(p.dir, 'make.json')) ? JSON.parse(readFileSync(join(p.dir, 'make.json'), 'utf8')) : {};
const step = (n, s) => console.log(`\n[${n}] ${s}`);
const T0 = performance.now();

// ---------- 1. голос ----------
const narr = join(p.dir, 'narration.txt'), mp3 = join(p.dir, 'voice.mp3'), wj = join(p.dir, 'words.json');
if (!opt['no-voice'] && cfg.voice !== false && existsSync(narr) && (!existsSync(mp3) || statSync(narr).mtimeMs > statSync(mp3).mtimeMs || opt.voice || opt.rate)) {
  step(1, 'голос: narration.txt -> voice.mp3 + words.json (edge-tts)');
  const py = python(true);
  if (!py) console.log('  нет python с edge-tts (задайте STICK_PY) — пропуск, остаются прежние words.json');
  else {
    const r = run(py, [join(ENGINE, 'tools', 'voice.py'), p.dir, ...(typeof opt.voice === 'string' ? ['--voice', opt.voice] : cfg.voiceName ? ['--voice', cfg.voiceName] : []), ...(typeof opt.rate === 'string' ? ['--rate', opt.rate] : cfg.rate ? ['--rate', cfg.rate] : [])], { allowFail: true });
    process.stdout.write((r.stdout || '').replace(/^/gm, '  ') + (r.stderr || '').replace(/^/gm, '  '));
    if (r.status !== 0) console.log('  edge-tts не ответил — фильм собирается по прежним words.json, звука не будет');
  }
} else step(1, 'голос: ' + (existsSync(mp3) ? 'voice.mp3 актуален' : 'пропущен'));

// ---------- 2. сборка страницы ----------
step(2, 'сборка: film.js -> ' + p.html);
const b = await buildFilm(p.dir); console.log(`  ${b.kb} КБ`);

// ---------- 3. рендер ----------
const raw = join(p.out, 'raw.mp4'), sets = [...Object.entries(cfg.set || {}).map(([k, v]) => `${k}=${v}`), ...(opt.set || [])];
step(3, 'рендер: ' + raw + (sets.length ? `  (${sets.join(', ')})` : ''));
const t3 = performance.now();
const rr = run(process.execPath, [join(ENGINE, 'tools', 'render.mjs'), p.html, raw, ...sets.flatMap(s => ['--set', s])], { allowFail: true });
process.stdout.write((rr.stdout || '').replace(/^/gm, '  ')); if (rr.status !== 0) { process.stderr.write(rr.stderr || ''); console.error('рендер не удался'); process.exit(1); }
console.log(`  с запуском браузера: ${ms(t3)} мс`);

// ---------- 4. субтитры ----------
const ass = join(p.out, 'captions.ass'), cues = join(p.dir, (cfg.captions && cfg.captions.cues) || 'captions.json'), cap = cfg.captions || {};
const py = python(false); let haveAss = false;
if (cfg.captions !== false && py && (existsSync(cues) || existsSync(wj))) {
  step(4, 'субтитры: ' + (existsSync(cues) ? 'ручные реплики ' + cues : 'words.json') + ' -> ' + ass);
  const extra = Object.entries(cap).filter(([k]) => k !== 'cues').flatMap(([k, v]) => ['--' + k, String(v)]);
  const r = run(py, [join(ENGINE, 'tools', 'captions.py'), ...(existsSync(cues) ? ['--cues', cues] : [wj]), ass, ...extra]);
  process.stdout.write((r.stdout || '').replace(/^/gm, '  ')); haveAss = true;
} else step(4, 'субтитры: пропущены');

// ---------- 5. звук и финальный файл ----------
const final = join(p.out, 'final.mp4'), au = { ...(cfg.audio || {}) };
for (const k of ['music', 'music-gain', 'duck', 'music-start', 'voice-gain', 'voice-start', 'lufs', 'tp', 'no-loudnorm', 'bed']) if (opt[k] !== undefined) au[k] = opt[k];
if (opt.sfx) au.sfx = [...(au.sfx || []), ...opt.sfx];
if (au.voice === undefined && existsSync(mp3)) au.voice = mp3; else if (au.voice && !existsSync(au.voice)) { console.log('  нет файла голоса ' + au.voice + ' — без него'); delete au.voice; }
if (au.loudnorm === false) au['no-loudnorm'] = true;
if (opt['no-bed'] || au.bed === false) delete au.bed; else if (au.bed === undefined && au.voice && !au['no-loudnorm']) au.bed = -30;   // «воздух», чтобы в паузах голоса не было цифровой тишины
step(5, 'звук и сборка: ' + final);
const ar = assemble({ video: raw, out: final, ass: haveAss ? ass : undefined, ...au });
console.log(`  ${ar.duration} с, ${ar.frames} кадров` + (ar.final ? `; громкость ${ar.final.I} LUFS, пик ${ar.final.TP} dBFS` : '; БЕЗ ЗВУКА'));

// ---------- 6. проверка ----------
let ok = true;
if (!opt['no-qa'] && cfg.qa !== false) {
  step(6, 'проверка (qa.mjs)');
  const r = await qa(final, { ...(cfg.qa || {}), ...opt, ass: haveAss ? ass : undefined });
  const w = [Math.max(...r.rows.map(x => x.name.length)), Math.max(...r.rows.map(x => x.value.length))];
  for (const x of r.rows) console.log(`  ${x.ok ? 'OK  ' : 'FAIL'}  ${x.name.padEnd(w[0])}  ${x.value.padEnd(w[1])}  норма: ${x.norm}`);
  ok = r.ok; console.log(ok ? '  QA: всё в норме' : `  QA: не прошло проверок: ${r.rows.filter(x => !x.ok).length}`);
}
const t = JSON.parse(readFileSync(raw.replace(/\.mp4$/, '.time.json'), 'utf8'));
console.log(`\nготово за ${(ms(T0) / 1000).toFixed(1)} с: ${final}\nрендер ${t.msPerFrame} мс/кадр (draw ${t.drawMedianMs} мс), ${probe(final).frames} кадров`);
process.exit(ok ? 0 : 1);
