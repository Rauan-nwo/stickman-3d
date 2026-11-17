// film/render.mjs — рендер глав финала L001: кусками (не больше 2 параллельных Chrome — память машины), склейка,
// черновой голос со вставленными паузами (timing.inserts), mux; контактный лист глав (кадр на план, 60 % длины).
//   node production/L001/film/render.mjs --ch 0,1 [--jobs 2] [--voice out/voice_draft.mp3] [--name ch0_1] [--sheet-only]
// Перед этим: node production/L001/animatic/make_timing.mjs [--lines out/lines_fish.json] ; node engine/tools/build.mjs production/L001/film
import { spawn, execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const D = dirname(fileURLToPath(import.meta.url)), L = resolve(D, '..'), ROOT = resolve(D, '../../..'), OUT = join(D, 'out'), TMP = join(OUT, 'tmp');
const args = process.argv.slice(2), arg = (k, d) => { const i = args.indexOf(k); return i < 0 ? d : args[i + 1]; }, has = k => args.includes(k);
const JOBS = Math.min(2, +arg('--jobs', 2)), CH = arg('--ch', '0,1').split(',').map(Number), NAME = arg('--name', 'ch' + CH.join('_')), VOICE = join(L, arg('--voice', 'out/voice_draft.mp3'));
const timing = JSON.parse(readFileSync(join(L, 'animatic/timing.json'), 'utf8')), FPS = 30;
const shots = timing.shots.filter(s => CH.includes(s.ch)), T0 = shots[0].start, T1 = shots[shots.length - 1].end;
const F0 = Math.round(T0 * FPS), F1 = Math.round(T1 * FPS);
const html = join(OUT, 'film.html'), render = join(ROOT, 'engine/tools/render.mjs');
mkdirSync(TMP, { recursive: true });
const run = (a) => new Promise((ok, no) => { const p = spawn('node', a, { stdio: ['ignore', 'ignore', 'inherit'] }); p.on('close', c => (c ? no(new Error('render ' + c)) : ok())); });

async function video() {
  const n = Math.max(JOBS, Math.ceil((F1 - F0) / 600)), step = Math.ceil((F1 - F0) / n), todo = [], t0 = Date.now();
  for (let i = 0; i < n; i++) { const a = F0 + i * step, b = Math.min(F1, a + step); if (a < b) todo.push({ i, a, b, out: join(TMP, `${NAME}_${i}.mp4`) }); }
  let k = 0; await Promise.all(Array.from({ length: JOBS }, async () => { while (k < todo.length) { const c = todo[k++];
    await run([render, html, c.out, '--set', `f0=${c.a}`, '--set', `f1=${c.b}`]); console.log('part', c.i, `${c.a}-${c.b}`, ((Date.now() - t0) / 1000).toFixed(0), 's'); } }));
  const list = join(TMP, `${NAME}_parts.txt`); writeFileSync(list, todo.map(c => `file '${c.out.replace(/\\/g, '/')}'`).join('\n'));
  const v = join(TMP, `${NAME}_video.mp4`); execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', v]);
  return v;
}
// голос: дорожка голоса + тишина в точках inserts (как в аниматике), затем вырезка [T0, T1]
function audio() {
  const a = join(TMP, `${NAME}_voice.wav`), f = [], lbl = []; let prev = 0;
  timing.inserts.forEach((x, i) => { f.push(`[0:a]atrim=${prev}:${x.at},asetpts=PTS-STARTPTS[v${i}]`, `aevalsrc=0:d=${x.dur}:s=24000[s${i}]`); lbl.push(`[v${i}]`, `[s${i}]`); prev = x.at; });
  f.push(`[0:a]atrim=start=${prev},asetpts=PTS-STARTPTS[vl]`); lbl.push('[vl]');
  f.push(`${lbl.join('')}concat=n=${lbl.length}:v=0:a=1,aresample=48000,apad,atrim=${T0}:${T1},asetpts=PTS-STARTPTS[out]`);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', VOICE, '-filter_complex', f.join(';'), '-map', '[out]', '-ac', '1', a]);
  return a;
}
async function sheet() {           // контактный лист: кадр на план (60 % длины)
  const frames = shots.map(s => Math.min(Math.round((s.start + s.dur * .6) * FPS), Math.round(s.end * FPS) - 1));
  const sd = join(TMP, `${NAME}_sheet`); rmSync(sd, { recursive: true, force: true }); mkdirSync(sd, { recursive: true });
  await run([render, html, join(sd, 's'), '--stills', frames.join(',')]);
  const cols = 5, list = frames.map(f => join(sd, `s-${String(f).padStart(4, '0')}.jpg`));
  const py = `from PIL import Image, ImageDraw, ImageFont\nimport json,sys\nfs=json.loads(sys.argv[1]); lab=json.loads(sys.argv[2]); cols=${cols}; w,h=480,270\nrows=(len(fs)+cols-1)//cols; c=Image.new('RGB',(cols*w,rows*(h+26)),(12,12,16)); d=ImageDraw.Draw(c); f=ImageFont.truetype('arialbd.ttf',17)\nfor i,(p,l) in enumerate(zip(fs,lab)):\n  x,y=(i%cols)*w,(i//cols)*(h+26); c.paste(Image.open(p).resize((w-4,h-4)),(x+2,y+24)); d.text((x+4,y+3),l,fill=(255,212,138),font=f)\nc.save(sys.argv[3],quality=90)`;
  const lab = shots.map(s => `#${s.n} ${Math.floor(s.start / 60)}:${(s.start % 60).toFixed(1).padStart(4, '0')} ${s.framing}`.slice(0, 48));
  execFileSync('python', ['-c', py, JSON.stringify(list), JSON.stringify(lab), join(OUT, `sheet_${NAME}.jpg`)]);
  console.log('sheet', join(OUT, `sheet_${NAME}.jpg`));
}

if (!existsSync(html)) { console.error('нет', html, '— сначала node engine/tools/build.mjs production/L001/film'); process.exit(1); }
console.log(`главы ${CH} · кадры ${F0}–${F1} (${((F1 - F0) / FPS).toFixed(1)} с) · ${JOBS} потока`);
if (!has('--sheet-only')) { const v = await video(), a = audio(), out = join(OUT, `${NAME}.mp4`);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', v, '-i', a, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', out]);
  console.log('готово', out); }
await sheet();
