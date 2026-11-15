#!/usr/bin/env node
// castsheet.mjs: лист героев лонгов (presetsLong.js): каждый пресет x 5 эмоций анфас + вид 3/4.
//   node production/longform/style-test/castsheet.mjs   -> production/longform/style-test/out/cast_sheet.jpg

import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
const HERE = dirname(fileURLToPath(import.meta.url)), ENGINE = join(HERE, '..', '..', '..', 'engine'), OUT = join(HERE, 'out');
mkdirSync(OUT, { recursive: true });
const req = createRequire(join(ENGINE, 'package.json')), { chromium } = req('playwright-core'), { build } = req('esbuild');
const src = `
import { LONG_PRESETS } from './src/chars/presetsLong.js';
import { feel } from './src/chars/stickman.js';
window.sheet = (c) => {
  const names = Object.keys(LONG_PRESETS), cols = [['neutral', .4], ['talk', .22], ['laugh', .29], ['smug', .4], ['shock', .4], ['3/4 talk', .22]];
  const CW = 330, CH = 470, LEFT = 190, TOP = 74, W = LEFT + cols.length * CW + 20, H = TOP + names.length * CH + 20;
  c.width = W; c.height = H; const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#22283A'); g.addColorStop(1, '#141824'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  const label = (s, px, py, size, col, al = 'left') => { x.font = '700 ' + size + 'px Montserrat, Arial'; x.textAlign = al; x.lineWidth = 5; x.strokeStyle = 'rgba(0,0,0,.8)'; x.strokeText(s, px, py); x.fillStyle = col; x.fillText(s, px, py); };
  cols.forEach(([n], i) => label(n, LEFT + i * CW + CW / 2, 48, 30, '#F2D27A', 'center'));
  names.forEach((n, r) => {
    const ch = LONG_PRESETS[n](), y0 = TOP + r * CH;
    if (r % 2) { x.fillStyle = 'rgba(255,255,255,.035)'; x.fillRect(0, y0, W, CH); }
    label(n, 16, y0 + 44, 30, '#F2D27A');
    if (['detective', 'moneyman', 'reporter'].includes(n)) label('host?', 16, y0 + 80, 22, '#9FB4D8');
    const k = (CH - 40) / 1120;
    cols.forEach(([e, t], i) => {
      const emo = e.startsWith('3/4') ? 'talk' : e, p = feel(emo, t);
      if (e.startsWith('3/4')) { p.view = 'threeQuarter'; p.facing = 1; }
      x.save(); x.translate(LEFT + i * CW + CW / 2, y0 + CH - 18); x.scale(k, k);
      x.fillStyle = 'rgba(0,0,0,.35)'; x.beginPath(); x.ellipse(0, 0, 150, 22, 0, 0, Math.PI * 2); x.fill();
      ch.draw(x, { stance: 'stand', ...p }); x.restore();
    });
  });
  return [W, H];
};`;
const r = await build({ stdin: { contents: src, resolveDir: ENGINE, loader: 'js' }, bundle: true, format: 'iife', write: false, target: 'chrome120', logLevel: 'warning' });
const font = readFileSync(join(ENGINE, 'fonts', 'Montserrat-ExtraBold.ttf')).toString('base64');
const html = join(OUT, 'castsheet.html');
writeFileSync(html, `<!doctype html><meta charset="utf-8"><style>@font-face{font-family:Montserrat;font-weight:700;src:url(data:font/ttf;base64,${font})}</style><canvas id="c"></canvas><script>${r.outputFiles[0].text.replace(/<\/script/gi, '<\/script')}</script>`);
let browser; try { browser = await chromium.launch({ channel: 'chrome' }); } catch { browser = await chromium.launch(); }
const page = await browser.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.goto(pathToFileURL(html).href); await page.evaluate(() => document.fonts.load('700 20px Montserrat'));
const [wh, data] = await page.evaluate(() => { const c = document.getElementById('c'); const wh = window.sheet(c); return [wh, c.toDataURL('image/jpeg', .92).split(',')[1]]; });
writeFileSync(join(OUT, 'cast_sheet.jpg'), Buffer.from(data, 'base64'));
console.log(join(OUT, 'cast_sheet.jpg'), wh.join('x')); if (errs.length) { console.error(errs); process.exitCode = 1; }
await browser.close();
