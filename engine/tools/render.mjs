#!/usr/bin/env node
// render.mjs: покадровый рендер страницы фильма в MP4, кадры или контактный лист (Chrome на видеокарте через Playwright).
//
// Страница обязана дать:  window.draw(frame)  window.FRAMES  window.FPS
// и по желанию:           window.CUES = [секунды, ...]  (жёсткие склейки)
// Загружается с ?render, чтобы не запускать цикл предпросмотра.
//
//   node tools/render.mjs film.html out.mp4                    полный рендер (H.264, crf 18)
//   node tools/render.mjs film.html shot --stills 0,150,2.5s   -> shot-0000.jpg shot-0150.jpg ...  (кадры или секунды)
//   node tools/render.mjs film.html sheet.jpg --sheet [0.5]    кадр каждые N секунд одной картинкой
//   --set gun=2d            параметр фильма (def.options), можно несколько раз
//   --png                   кадры без потерь (--stills): shot-0000.png
// Полный рендер пишет рядом <out>.cues.json и <out>.time.json и печатает скорость (мс на кадр).
// Нужны: node >= 18, ffmpeg в PATH, установленный Chrome (или `npx playwright install chromium`).
import { spawn, execFileSync } from 'node:child_process';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { resolve, join, parse, format } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const args = process.argv.slice(2);
const [pagePath, outArg] = args;
const opt = name => { const i = args.indexOf(name); return i < 0 ? undefined : (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true); };
const sets = args.map((a, i) => (a === '--set' ? args[i + 1] : null)).filter(Boolean);
if (!pagePath || !outArg) { console.error('usage: node render.mjs film.html <out> [--stills f1,f2] [--sheet [seconds]] [--set key=value] [--png]'); process.exit(1); }

let browser;
try { browser = await chromium.launch({ channel: 'chrome' }); } catch { browser = await chromium.launch(); }
const page = await browser.newPage();
const errors = [], warns = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') warns.push(m.text()); });
await page.goto(pathToFileURL(resolve(pagePath)).href + '?render' + sets.map(s => '&' + s).join(''));
const info = await page.evaluate(() => {
  const c = document.querySelector('canvas');
  return { FRAMES: window.FRAMES, FPS: window.FPS, CUES: window.CUES, GL: window.GL_INFO, w: c?.width, h: c?.height, hasDraw: typeof window.draw === 'function' };
});
if (!info.hasDraw || !info.FRAMES || !info.FPS) { console.error('страница должна определить window.draw(frame), window.FRAMES и window.FPS', errors); await browser.close(); process.exit(1); }
const stillsOrSheet = opt('--stills') || opt('--sheet');
if (!stillsOrSheet && (info.w % 2 || info.h % 2)) { console.error(`канвас ${info.w}x${info.h}: H.264 требует чётные размеры`); await browser.close(); process.exit(1); }
const out = !stillsOrSheet && !parse(outArg).ext ? outArg + '.mp4' : outArg;
const sidecar = ext => { const p = parse(out); return format({ dir: p.dir, name: p.ext ? p.name : p.base, ext }); };

const png = !!opt('--png');
const grab = f => page.evaluate(([f, png]) => { window.draw(f); const c = document.querySelector('canvas'); return (png ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.93)).split(',')[1]; }, [f, png]);
const jpg = async f => Buffer.from(await grab(f), 'base64');
// для контактных листов: штамп времени ставится в браузере (в сборках ffmpeg часто нет drawtext)
const stamped = async (f, fps) => Buffer.from(await page.evaluate(([f, fps]) => {
  window.draw(f); const src = document.querySelector('canvas'), c = document.createElement('canvas');
  c.width = src.width; c.height = src.height; const x = c.getContext('2d'); x.drawImage(src, 0, 0);
  const s = Math.round(src.width / 16); x.fillStyle = 'rgba(0,0,0,.65)'; x.fillRect(0, 0, s * 4.4, s * 1.3);
  x.fillStyle = '#fff'; x.font = `700 ${Math.round(s * .8)}px monospace`; x.textBaseline = 'middle'; x.fillText((f / fps).toFixed(2) + 's f' + f, s * .25, s * .66);
  return c.toDataURL('image/jpeg', .9).split(',')[1];
}, [f, fps]), 'base64');

let code = 0;
if (opt('--stills')) {
  for (const f of String(opt('--stills')).split(',').map(v => v.trim().endsWith('s') ? Math.round(parseFloat(v) * info.FPS) : Number(v))) {
    const file = `${out}-${String(f).padStart(4, '0')}.${png ? 'png' : 'jpg'}`; writeFileSync(file, await jpg(f)); console.log(file);
  }
} else if (opt('--sheet')) {
  const every = opt('--sheet') === true ? 1 : Number(opt('--sheet'));
  // шаг в секундах; кадр рядом со склейкой сдвигается за неё
  const near = t => (info.CUES || []).find(c => Math.abs(t - c) < Math.min(.2, every / 3));
  const frames = []; for (let t = every / 2; t * info.FPS < info.FRAMES; t += every) { const c = near(t); frames.push(Math.min(info.FRAMES - 1, Math.round((c !== undefined ? c + Math.min(.25, every / 2) : t) * info.FPS))); }
  const dir = mkdtempSync(join(tmpdir(), 'sheet-'));
  for (let i = 0; i < frames.length; i++) writeFileSync(join(dir, `f${String(i).padStart(4, '0')}.jpg`), await stamped(frames[i], info.FPS));
  const cols = Math.ceil(Math.sqrt(frames.length * 1.6)), rows = Math.ceil(frames.length / cols), tw = 360;
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', join(dir, 'f%04d.jpg'), '-vf', `scale=${tw}:-2,tile=${cols}x${rows}`, '-frames:v', '1', '-q:v', '3', out]);
  rmSync(dir, { recursive: true });
  console.log(`контактный лист: ${frames.length} кадров (каждые ${every} с) -> ${out}`);
} else {
  const t0 = performance.now();
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(info.FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  let ffDone = false, ffCode = null; const closed = new Promise(r => ff.on('close', c => { ffDone = true; ffCode = c; r(); }));
  ff.on('error', e => { console.error('ffmpeg не запустился:', e.message); process.exit(1); });
  ff.stdin.on('error', () => {});
  for (let f = 0; f < info.FRAMES; f++) {
    if (ffDone) break;
    if (!ff.stdin.write(await jpg(f))) await Promise.race([new Promise(r => ff.stdin.once('drain', r)), closed]);
    if (f % (info.FPS * 5) === 0 && f) console.log(`кадр ${f}/${info.FRAMES}`);
  }
  ff.stdin.end();
  await closed;
  if (ffCode !== 0) { console.error(`ffmpeg завершился с кодом ${ffCode}; ${out} неполный`); await browser.close(); process.exit(1); }
  const total = performance.now() - t0;
  const perf = (await page.evaluate(() => window.__perf || [])).filter(v => v != null);
  const sorted = [...perf].sort((a, b) => a - b), med = sorted.length ? sorted[sorted.length >> 1] : 0, first = perf[0] || 0;
  const stat = { frames: info.FRAMES, fps: info.FPS, totalMs: Math.round(total), msPerFrame: +(total / info.FRAMES).toFixed(1), drawMedianMs: +med.toFixed(1), firstFrameMs: Math.round(first), gpu: info.GL };
  console.log(`рендер: ${info.FRAMES} кадров @ ${info.FPS} fps -> ${out}`);
  console.log(`скорость: ${stat.totalMs} мс всего, ${stat.msPerFrame} мс/кадр (рисование + JPEG + ffmpeg); JS-часть draw(): медиана ${stat.drawMedianMs} мс (работа видеокарты идёт позже и входит в общее время), первый кадр ${stat.firstFrameMs} мс (компиляция шейдеров); GPU: ${info.GL}`);
  writeFileSync(sidecar('.time.json'), JSON.stringify(stat));
  if (Array.isArray(info.CUES)) writeFileSync(sidecar('.cues.json'), JSON.stringify(info.CUES));
}
if (warns.length) console.error('console.error на странице:', [...new Set(warns)].slice(0, 8));
if (errors.length) { console.error('ошибки страницы:', errors); code = 1; }
await browser.close();
process.exit(code);
