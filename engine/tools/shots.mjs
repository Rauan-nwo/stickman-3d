#!/usr/bin/env node
// shots.mjs: кадры фильма по списку времён -> листы по N кадров (с подписью) + полноразмерные кадры; печатает ошибки страницы.
//   node tools/shots.mjs film.html outdir --times 0,0.5,1.2 | --words words.json:spec1,spec2 | --every 0.5 [--from a --to b] [--cols 6] [--tw 360] [--full] [--labels a|b|c]
import { writeFileSync, mkdirSync, rmSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';
const args = process.argv.slice(2), opt = n => { const i = args.indexOf(n); return i < 0 ? undefined : (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true); };
const [pagePath, outDir] = args; mkdirSync(outDir, { recursive: true });
let browser; try { browser = await chromium.launch({ channel: 'chrome' }); } catch { browser = await chromium.launch(); }
const page = await browser.newPage(); const errors = [];
page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(pathToFileURL(resolve(pagePath)).href + '?render');
const info = await page.evaluate(() => ({ FRAMES: window.FRAMES, FPS: window.FPS }));
if (!info.FRAMES) { console.error('страница не запустилась', errors); await browser.close(); process.exit(1); }
let times = [], labels = [];
if (opt('--times')) times = String(opt('--times')).split(',').map(Number);
else { const ev = Number(opt('--every') || .5), a = Number(opt('--from') || 0), b = Number(opt('--to') || info.FRAMES / info.FPS); for (let t = a; t < b - 1e-6; t += ev) times.push(t); }
if (opt('--labels')) labels = String(opt('--labels')).split('|');
const cols = Number(opt('--cols') || 6), tw = Number(opt('--tw') || 360), per = Number(opt('--per') || cols * 3), full = !!opt('--full'), name = opt('--name') || 'sheet';
const tmp = join(outDir, '_tmp'); rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true });
for (let i = 0; i < times.length; i++) {
  const f = Math.min(info.FRAMES - 1, Math.max(0, Math.round(times[i] * info.FPS)));
  const b64 = await page.evaluate(([f, fps, label, full]) => {
    window.draw(f); const src = document.querySelector('canvas'); if (full) return src.toDataURL('image/jpeg', .93).split(',')[1];
    const c = document.createElement('canvas'); c.width = src.width; c.height = src.height; const x = c.getContext('2d'); x.drawImage(src, 0, 0);
    x.strokeStyle = 'rgba(255,0,0,.5)'; x.lineWidth = 2; x.strokeRect(24, 845, 672, 110);
    const s = 45; x.fillStyle = 'rgba(0,0,0,.7)'; x.fillRect(0, 0, src.width, s * 1.3); x.fillStyle = '#fff'; x.font = `700 ${Math.round(s * .78)}px monospace`; x.textBaseline = 'middle'; x.fillText((f / fps).toFixed(2) + ' f' + f + (label ? ' ' + label : ''), 8, s * .66);
    return c.toDataURL('image/jpeg', .9).split(',')[1];
  }, [f, info.FPS, labels[i] || '', full]);
  writeFileSync(full ? join(outDir, `${name}-${String(f).padStart(4, '0')}.jpg`) : join(tmp, `f${String(i).padStart(4, '0')}.jpg`), Buffer.from(b64, 'base64'));
}
if (!full) for (let k = 0; k * per < times.length; k++) {
  const n = Math.min(per, times.length - k * per), rows = Math.ceil(n / cols), out = join(outDir, `${name}_${String(k).padStart(2, '0')}.jpg`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-start_number', String(k * per), '-i', join(tmp, 'f%04d.jpg'), '-frames:v', String(n), '-vf', `scale=${tw}:-2,tile=${cols}x${rows}`, '-frames:v', '1', '-q:v', '3', out]);
  console.log(out);
}
rmSync(tmp, { recursive: true, force: true });
if (errors.length) console.log('ОШИБКИ СТРАНИЦЫ:\n' + [...new Set(errors)].slice(0, 12).join('\n'));
await browser.close();
