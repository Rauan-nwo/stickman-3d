// lib.mjs: общие помощники инструментов (пути, аргументы, запуск ffmpeg/python). Только node — работает из PowerShell и Git Bash.
import { spawnSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { resolve, dirname, basename, relative, join, sep, isAbsolute } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ENGINE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const REPO = resolve(ENGINE, '..');
export const FONTS = join(ENGINE, 'fonts');

// аргументы: позиционные + --ключ значение | --флаг. Повторяющийся ключ собирается в массив (multi).
export function parseArgs(argv = process.argv.slice(2), multi = []) {
  const pos = [], opt = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const k = a.slice(2), nx = argv[i + 1], v = nx !== undefined && !(nx.startsWith('--') && isNaN(Number(nx))) ? argv[++i] : true;
      if (multi.includes(k)) (opt[k] = opt[k] || []).push(v); else opt[k] = v;
    } else pos.push(a);
  }
  return { pos, opt };
}
export const num = (v, d) => (v === undefined || v === true ? d : Number(v));

// папка фильма: принимает путь к папке или к film.js. Сборки движковых фильмов идут в engine/out/<имя>/, остальных — в <фильм>/out/
export function filmPaths(arg) {
  let dir = resolve(arg); if (existsSync(dir) && statSync(dir).isFile()) dir = dirname(dir);
  if (!existsSync(join(dir, 'film.js'))) throw new Error(`нет film.js в ${dir}`);
  const rel = relative(ENGINE, dir), inEngine = !rel.startsWith('..') && !isAbsolute(rel);
  const out = inEngine ? join(ENGINE, 'out', basename(dir)) : join(dir, 'out');
  mkdirSync(out, { recursive: true });
  return { dir, film: join(dir, 'film.js'), out, name: basename(dir), html: join(out, 'film.html') };
}
export function run(cmd, args, { cwd, quiet = false, allowFail = false, input } = {}) {
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8', maxBuffer: 1 << 28, input, windowsHide: true });
  if (r.error) throw new Error(`не удалось запустить ${cmd}: ${r.error.message}`);
  if (r.status !== 0 && !allowFail) { if (!quiet) process.stderr.write((r.stderr || '') + (r.stdout || '')); throw new Error(`${cmd} завершился с кодом ${r.status}`); }
  return r;
}
export const ffmpeg = (args, o) => run('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...args], o);
// как ffmpeg, но возвращает stderr (для фильтров, которые печатают измерения)
export const ffmpegInfo = (args, o) => run('ffmpeg', ['-hide_banner', '-nostats', ...args], { ...o, allowFail: true }).stderr || '';
export function probe(file) {
  const r = run('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type,codec_name,width,height,r_frame_rate,pix_fmt,color_range,nb_frames,sample_rate,channels:format=duration', '-of', 'json', file]);
  const j = JSON.parse(r.stdout), v = j.streams.find(s => s.codec_type === 'video'), a = j.streams.find(s => s.codec_type === 'audio');
  const [n, d] = v ? v.r_frame_rate.split('/').map(Number) : [0, 1];
  return { duration: Number(j.format.duration), video: v, audio: a, fps: v ? n / d : 0, frames: v ? Number(v.nb_frames) : 0 };
}
// путь для фильтров ffmpeg (subtitles=...): относительный от cwd, прямые слэши, без буквы диска и двоеточий
export const relPath = (from, to) => relative(from, to).split(sep).join('/');
// python: для edge-tts нужен venv скилла handdraw; можно переопределить переменной STICK_PY
export function python(needEdgeTts = false) {
  const cands = [process.env.STICK_PY, needEdgeTts && 'C:/Users/velar/.claude/skills/handdraw-skill/.venv/Scripts/python.exe', 'python', 'python3', 'py'].filter(Boolean);
  for (const c of cands) {
    if (c.includes('/') && !existsSync(c)) continue;
    const r = spawnSync(c, ['-c', needEdgeTts ? 'import edge_tts' : 'import sys'], { encoding: 'utf8', windowsHide: true });
    if (!r.error && r.status === 0) return c;
  }
  return null;
}
// запущен ли модуль как скрипт (а не импортирован)
export const isMain = url => !!process.argv[1] && pathToFileURL(resolve(process.argv[1])).href.toLowerCase() === url.toLowerCase();
export const ms = t0 => Math.round(performance.now() - t0);

// кадры видео потоком (async-итератор буферов w*h*3 RGB, либо w*h в оттенках серого). w/h не заданы — исходный размер.
export async function* frames(file, { w, h, n, skip = 0, gray = false } = {}) {
  if (!w || !h) { const p = probe(file); w = p.video.width; h = p.video.height; }
  const size = w * h * (gray ? 1 : 3);
  const vf = ['setpts=PTS-STARTPTS', skip ? `select=gte(n\,${skip})` : null, `scale=${w}:${h}`].filter(Boolean).join(',');
  const p = spawn('ffmpeg', ['-loglevel', 'error', '-i', file, '-vf', vf, '-fps_mode', 'passthrough', ...(n ? ['-frames:v', String(n)] : []), '-f', 'rawvideo', '-pix_fmt', gray ? 'gray' : 'rgb24', '-'], { stdio: ['ignore', 'pipe', 'inherit'], windowsHide: true });
  let parts = [], have = 0;
  for await (const chunk of p.stdout) {
    parts.push(chunk); have += chunk.length;
    if (have < size) continue;
    let buf = parts.length === 1 ? parts[0] : Buffer.concat(parts, have), off = 0;
    while (buf.length - off >= size) { yield buf.subarray(off, off + size); off += size; }
    const rest = buf.subarray(off); parts = rest.length ? [rest] : []; have = rest.length;
  }
}
// средняя абсолютная разница двух буферов одинаковой длины
export function mad(a, b) { let s = 0; for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; s += d < 0 ? -d : d; } return s / a.length; }
