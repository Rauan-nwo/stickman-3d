// film/final.mjs — финальная сборка глав без потерь качества:
//   1) 3D-планы (clips3d.js): нативный рендер сцены кадр в кадр, 1920×1080, 30 к/с, PNG без потерь -> out/tmp/c3d/<план>/f-NNNN.png;
//   2) фильм (film.html) снимается кадрами PNG прямо из браузера; 3D-планы в нём — эти PNG 1:1 (без масштаба, без смены частоты),
//      поверх — подписи, титры, переходы фильма; кадры идут в ffmpeg трубой -> ОДНО кодирование x264 crf 16, preset slow, yuv420p;
//   3) куски (не больше 2 браузеров параллельно) склеиваются без перекодирования, голос сводится (-c:v copy);
//   4) кадры 3D-планов ещё и сохраняются PNG (out/tmp/ref/) — эталон для verify3d.py.
//   node production/L001/film/final.mjs --ch 0,1 [--jobs 2] [--voice out/voice_fish_en.mp3] [--name ch0_1] [--skip-3d] [--only-3d] [--audio-only] [--entry ch2_3]
// Перед этим: make_timing.mjs, node engine/tools/build.mjs production/L001/film и сцены (final.mjs собирает сцены сам).
import { spawn, execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, readdirSync, renameSync, copyFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '../../../engine/node_modules/playwright-core/index.mjs';
import { clips3d, frame0, frames, pad4 } from './clips3d.js';
import { voiceTrack, defaultVoice, pilotEnd, mixFinal } from './audio.mjs';
import { acquire, lockNamed } from './slots.mjs';                                      // не больше 2 браузерных рендеров на машине (все агенты)

const D = dirname(fileURLToPath(import.meta.url)), L = resolve(D, '..'), ROOT = resolve(D, '../../..'), OUT = join(D, 'out'), TMP = join(OUT, 'tmp');
const args = process.argv.slice(2), arg = (k, d) => { const i = args.indexOf(k); return i < 0 ? d : args[i + 1]; }, has = k => args.includes(k);
const timing = JSON.parse(readFileSync(join(L, 'animatic/timing.json'), 'utf8')), words = JSON.parse(readFileSync(join(L, 'animatic/words.json'), 'utf8'));
const CLIPS3D = clips3d(timing.shots);
const JOBS = Math.min(2, +arg('--jobs', 2)), CH = arg('--ch', '0,1').split(',').map(Number), NAME = arg('--name', 'ch' + CH.join('_'));
const VOICE = join(L, arg('--voice', defaultVoice(words.lines)));
const shots = timing.shots.filter(s => CH.includes(s.ch)), F0 = frame0(shots[0]), FCH = frame0(shots[shots.length - 1]) + frames(shots[shots.length - 1]);
// конец экспорта: по границе фразы (последнее слово главы + 0.6 с), а не на чужой реплике следующей главы; --full-chapter — до конца главы
// финал фильма (последний план всего фильма в экспорте — немой план-каскад #347 и уход в чёрное) — всегда до конца главы, без обрезки по слову
const FILM_END = shots.some(s => s.n === Math.max(...timing.shots.map(q => q.n)));
// FILM_F — кадров на странице фильма (core animatic: fEnd = round(total·FPS)); конец главы по ceil у последнего плана бывает на кадр дальше
const FILM_F = Math.round(timing.total * 30), FCH1 = Math.min(FCH, FILM_F);
const F1 = has('--full-chapter') || FILM_END ? FCH1 : Math.min(FCH1, Math.ceil(pilotEnd(shots, words.words) * 30 - 1e-6));
const FADE = Math.round(.4 * 30);                          // спад картинки в чёрное на последних 0.4 с (в браузере, до кодирования)
// --entry <имя>: собранные только главы рабочего (entries/<имя>/out/film.html); иначе — весь фильм (out/film.html)
const ENTRY = arg('--entry', null), HTML = ENTRY ? join(D, 'entries', ENTRY, 'out', 'film.html') : join(OUT, 'film.html');
const C3D = join(TMP, 'c3d'), REF = join(TMP, `ref_${NAME}`), RENDER = join(ROOT, 'engine/tools/render.mjs'), BUILD = join(ROOT, 'engine/tools/build.mjs');
mkdirSync(C3D, { recursive: true }); mkdirSync(REF, { recursive: true });
const run = (a, quiet = true) => new Promise((ok, no) => { const p = spawn('node', a, { stdio: ['ignore', quiet ? 'ignore' : 'inherit', 'inherit'] }); p.on('close', c => (c ? no(new Error(a.join(' ') + ' -> ' + c)) : ok())); });
const t00 = Date.now(), el = () => ((Date.now() - t00) / 1000).toFixed(0) + ' с';

// ---------- 1) нативные 3D-кадры ----------
async function native3d() {
  const todo = shots.filter(s => CLIPS3D[s.n]);
  const built = new Set();
  for (const s of todo) {
    const c = CLIPS3D[s.n], N = frames(s), set = { ...c.set };
    let from = c.from || 0;
    if (c.dur) set.dur = (N / 30).toFixed(6);
    if (c.group) {                                       // один дубль на группу: длина = сумма кадров её планов, отрезки подряд
      const g = timing.shots.filter(x => CLIPS3D[x.n] && CLIPS3D[x.n].group === c.group);
      set.dur = (g.reduce((a, x) => a + frames(x), 0) / 30).toFixed(6);
      from = g.slice(0, g.indexOf(g.find(x => x.n === s.n))).reduce((a, x) => a + frames(x), 0);
    }
    // setFn: параметры сцены из голоса (слова words.json) — якоря перетайминга; t0 — начало дубля (кадр 0 сцены) на шкале фильма, с
    if (typeof c.setFn === 'function') Object.assign(set, c.setFn({ words: words.words, t0: (frame0(s) - from) / 30 }));
    const dir = join(C3D, String(s.n)), meta = JSON.stringify({ scene: c.scene, set, from, N });
    if (existsSync(join(dir, 'meta.json')) && readFileSync(join(dir, 'meta.json'), 'utf8') === meta && readdirSync(dir).filter(f => f.endsWith('.png')).length === N) { console.log(`3D #${s.n}: готово (${N} кадров)`); continue; }
    rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
    const sceneDir = join(L, 'scenes', c.scene), html = join(sceneDir, 'out', 'film.html');
    const sceneLock = await lockNamed(`scene_${c.scene}`);                  // сцену может собирать/рендерить другой агент
    try {
    if (!built.has(c.scene)) { await run([BUILD, sceneDir]); built.add(c.scene); }
    const list = Array.from({ length: N }, (_, i) => from + i);
    const sets = Object.entries(set).flatMap(([k, v]) => ['--set', `${k}=${v}`]);
    const rel = await acquire(`${NAME} 3D #${s.n}`); try { await run([RENDER, html, join(dir, 'src'), '--stills', list.join(','), '--png', ...sets]); } finally { rel(); }
    list.forEach((f, i) => renameSync(join(dir, `src-${pad4(f)}.png`), join(dir, `f-${pad4(i)}.png`)));
    } finally { sceneLock(); }
    writeFileSync(join(dir, 'meta.json'), meta);
    console.log(`3D #${s.n}: ${c.scene} ${JSON.stringify(set)} кадры ${from}–${from + N - 1} (${N}) · ${el()}`);
  }
}

// ---------- 2) фильм: кадры PNG из браузера -> x264 (одно кодирование) ----------
const is3d = F => shots.some(s => CLIPS3D[s.n] && F >= frame0(s) && F < frame0(s) + frames(s));
async function chunk(a, b, out) {
  let browser; try { browser = await chromium.launch({ channel: 'chrome', args: ['--allow-file-access-from-files'] }); } catch { browser = await chromium.launch({ args: ['--allow-file-access-from-files'] }); }
  const page = await browser.newPage(), errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto(pathToFileURL(HTML).href + `?render&f0=${a}&f1=${b}&c3d=${encodeURIComponent(C3D.replace(/\\/g, '/'))}`, { timeout: 180000 });   // страница 150+ МБ: под нагрузкой грузится дольше 30 с
  const n = await page.evaluate(() => window.FRAMES);
  if (n !== b - a) throw new Error(`кусок ${a}-${b}: FRAMES ${n}`);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-r', '30', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const closed = new Promise(r => ff.on('close', r)); ff.stdin.on('error', () => {});
  for (let i = 0; i < n; i++) {
    const fade = Math.max(0, (a + i - (F1 - FADE) + 1) / FADE);
    const b64 = await page.evaluate(async ([i, fade]) => { if (window.__prep3d) await window.__prep3d(i); window.draw(i); const c = document.querySelector('canvas');
      if (fade > 0) { const x = c.getContext('2d'); x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = Math.min(1, fade); x.fillStyle = '#000'; x.fillRect(0, 0, c.width, c.height); x.restore(); }
      return c.toDataURL('image/png').split(',')[1]; }, [i, fade]);
    const buf = Buffer.from(b64, 'base64');
    if (is3d(a + i)) writeFileSync(join(REF, `F${String(a + i).padStart(5, '0')}.png`), buf);
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  }
  ff.stdin.end(); const code = await closed; await browser.close();
  if (code !== 0) throw new Error('ffmpeg ' + code);
  if (errs.length) console.error('ошибки страницы', a, b, [...new Set(errs)].slice(0, 5));
}
async function video() {
  const n = JOBS * 2, step = Math.ceil((F1 - F0) / n), todo = [];
  for (let i = 0; i < n; i++) { const a = F0 + i * step, b = Math.min(F1, a + step); if (a < b) todo.push({ i, a, b, out: join(TMP, `${NAME}_final_${i}.mp4`) }); }
  let k = 0; await Promise.all(Array.from({ length: JOBS }, async () => { while (k < todo.length) { const c = todo[k++]; const rel = await acquire(`${NAME} кусок ${c.i}`); try { await chunk(c.a, c.b, c.out); } finally { rel(); } console.log(`кусок ${c.i} ${c.a}-${c.b} · ${el()}`); } }));
  const list = join(TMP, `${NAME}_final_parts.txt`); writeFileSync(list, todo.map(c => `file '${c.out.replace(/\\/g, '/')}'`).join('\n'));
  const v = join(TMP, `${NAME}_final_video.mp4`); execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', v]);
  return v;
}

console.log(`главы ${CH} · кадры ${F0}–${F1} (конец главы ${FCH}) (${((F1 - F0) / 30).toFixed(2)} с) · голос ${VOICE.replace(L, '')}`);
if (!has('--skip-3d')) await native3d();
if (has('--only-3d')) process.exit(0);
mkdirSync(REF, { recursive: true });
if (!has('--audio-only')) for (const f of readdirSync(REF)) rmSync(join(REF, f));   // эталон кадров для verify3d.py — только при новом видео
const v = has('--audio-only') ? join(TMP, `${NAME}_final_video.mp4`) : await video(), vw = voiceTrack(timing, VOICE, F0 / 30, F1 / 30, join(TMP, `${NAME}_final_voice.wav`)), out = join(OUT, `${NAME}.mp4`);
const a = mixFinal({ timing, shots, voiceWav: vw, T0: F0 / 30, T1: F1 / 30, out: join(TMP, `${NAME}_final_mix.wav`) });
// дорожки отдельно для звукового прохода (production/L001/sound/ сводит свою смесь на видео -> out/<имя>_sound.mp4):
//   <имя>_voice.wav — только голос (без спада), <имя>_tempbed.wav — только временная подложка и удар под название (со спадом)
copyFileSync(vw, join(OUT, `${NAME}_voice.wav`));
execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', `anullsrc=r=48000:cl=mono:d=${((F1 - F0) / 30).toFixed(3)}`, join(TMP, `${NAME}_null.wav`)]);
mixFinal({ timing, shots, voiceWav: join(TMP, `${NAME}_null.wav`), T0: F0 / 30, T1: F1 / 30, out: join(OUT, `${NAME}_tempbed.wav`) });
execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', v, '-i', a, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out]);
writeFileSync(join(OUT, `${NAME}.frames.json`), JSON.stringify({ F0, F1, shots3d: shots.filter(s => CLIPS3D[s.n]).map(s => ({ n: s.n, F: frame0(s), N: frames(s) })), all: shots.map(s => ({ n: s.n, F: frame0(s), N: frames(s) })) }));
// ворота мерцания (QA.md §9): по каждому плану — медиана |Δяркости| кадр-к-кадру и «пила» в секунду; отчёт out/<имя>_flicker.txt
try { execFileSync('python', [join(D, 'flicker.py'), out, join(OUT, `${NAME}.frames.json`), join(OUT, `${NAME}_flicker.txt`)], { stdio: 'inherit', env: { ...process.env, PYTHONIOENCODING: 'utf-8' } }); }
catch { console.log('!! ворота мерцания НЕ пройдены — см.', join(OUT, `${NAME}_flicker.txt`)); }
console.log('готово', out, el());
