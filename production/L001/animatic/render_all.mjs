// render_all.mjs: рендер аниматика кусками параллельно -> склейка -> голос со вставленными паузами -> mux; контактные листы.
//   node production/L001/animatic/render_all.mjs [--nodebug] [--sheets] [--jobs 4]
// Перед этим: node make_timing.mjs, pwsh prep_assets.ps1, node engine/tools/build.mjs production/L001/animatic
import { spawn, execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, rmSync, copyFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const D = dirname(fileURLToPath(import.meta.url)), ROOT = resolve(D, '../../..'), OUT = join(D, 'out'), TMP = join(D, 'tmp');
const args = process.argv.slice(2), has = a => args.includes(a), JOBS = has('--jobs') ? +args[args.indexOf('--jobs') + 1] : 4;
const timing = JSON.parse(readFileSync(join(D, 'timing.json'), 'utf8')), FPS = 30, FR = Math.round(timing.total * FPS);
const html = join(OUT, 'film.html'), render = join(ROOT, 'engine/tools/render.mjs');
const run = (cmd, a) => new Promise((ok, no) => { const p = spawn(cmd, a, { stdio: ['ignore', 'ignore', 'inherit'] }); p.on('close', c => (c ? no(new Error(cmd + ' ' + c)) : ok())); });

async function video(debug) {
  const tag = debug ? 'dbg' : 'clean', parts = [], t0 = Date.now(), n = JOBS * 2, step = Math.ceil(FR / n);
  const todo = []; for (let i = 0; i < n; i++) { const f0 = i * step, f1 = Math.min(FR, f0 + step); if (f0 < f1) todo.push({ i, f0, f1, out: join(TMP, `part_${tag}_${i}.mp4`) }); }
  let k = 0; await Promise.all(Array.from({ length: JOBS }, async () => { while (k < todo.length) { const c = todo[k++];
    await run('node', [render, html, c.out, '--set', `f0=${c.f0}`, '--set', `f1=${c.f1}`, '--set', `debug=${debug ? 1 : 0}`]); console.log(tag, 'part', c.i, 'done', ((Date.now() - t0) / 1000).toFixed(0), 's'); } }));
  const list = join(TMP, `parts_${tag}.txt`); writeFileSync(list, todo.map(c => `file '${c.out.replace(/\\/g, '/')}'`).join('\n'));
  const v = join(TMP, `video_${tag}.mp4`); execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', v]);
  return { v, sec: (Date.now() - t0) / 1000 };
}
function audio() {     // voice_draft.mp3 + тишина в точках inserts, хвост до конца плана 277
  const a = join(TMP, 'voice_animatic.wav'); const ins = timing.inserts; const f = []; let prev = 0, lbl = [];
  ins.forEach((x, i) => { f.push(`[0:a]atrim=${prev}:${x.at},asetpts=PTS-STARTPTS[v${i}]`, `aevalsrc=0:d=${x.dur}:s=24000[s${i}]`); lbl.push(`[v${i}]`, `[s${i}]`); prev = x.at; });
  f.push(`[0:a]atrim=start=${prev},asetpts=PTS-STARTPTS[vl]`); lbl.push('[vl]');
  f.push(`${lbl.join('')}concat=n=${lbl.length}:v=0:a=1,aresample=48000,apad[out]`);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', join(ROOT, 'production/L001/out/voice_draft.mp3'), '-filter_complex', f.join(';'), '-map', '[out]', '-t', String(FR / FPS), '-ac', '1', a]);
  return a;
}
function mux(v, a, out) { execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', v, '-i', a, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', out]); }

async function sheets() {      // один кадр на план (60% длины), подпись крупно — опция sheet=1
  const frames = timing.shots.map(s => Math.min(Math.round((s.start + s.dur * .6) * FPS), Math.round(s.end * FPS) - 1));
  const sd = join(TMP, 'sheet'); rmSync(sd, { recursive: true, force: true }); mkdirSync(sd, { recursive: true });
  await run('node', [render, html, join(sd, 's'), '--stills', frames.join(','), '--set', 'debug=0', '--set', 'sheet=1']);
  for (const ch of [...new Set(timing.shots.map(s => s.ch))]) {
    const cd = join(sd, 'ch' + ch); mkdirSync(cd, { recursive: true });
    const sh = timing.shots.filter(s => s.ch === ch);
    sh.forEach((s, i) => copyFileSync(join(sd, `s-${String(frames[s.n - 1]).padStart(4, '0')}.jpg`), join(cd, `c${String(i).padStart(3, '0')}.jpg`)));
    const cols = sh.length <= 4 ? sh.length : sh.length <= 12 ? 4 : 6, rows = Math.ceil(sh.length / cols);
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', join(cd, 'c%03d.jpg'), '-vf', `scale=480:270,pad=488:278:4:4:black,tile=${cols}x${rows}`, '-frames:v', '1', '-q:v', '3', join(OUT, `sheet_ch${ch}.jpg`)]);
  }
  console.log('sheets done');
}

if (has('--sheets')) await sheets();
if (!has('--sheets-only')) {
  const a = audio(); console.log('audio', a);
  const r1 = await video(true); mux(r1.v, a, join(OUT, 'animatic.mp4')); console.log('animatic.mp4', r1.sec.toFixed(0), 's');
  if (has('--nodebug')) { const r2 = await video(false); mux(r2.v, a, join(OUT, 'animatic_nodebug.mp4')); console.log('animatic_nodebug.mp4', r2.sec.toFixed(0), 's'); }
}
