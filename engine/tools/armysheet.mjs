#!/usr/bin/env node
// armysheet.mjs: контактные листы состава V002 (без 3D) -> engine/out/army-test/{army_sheet,gait_strips,action_strips}.jpg
//   node tools/armysheet.mjs [--out dir]
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';
import { ENGINE, parseArgs } from './lib.mjs';

const { opt } = parseArgs();
const out = resolve(typeof opt.out === 'string' ? opt.out : join(ENGINE, 'out', 'army-test')); mkdirSync(out, { recursive: true });
const r = await build({ stdin: { contents: `import * as S from './src/chars/sheetArmy.js'; window.SHEET = S;`, resolveDir: ENGINE, loader: 'js' }, bundle: true, format: 'iife', write: false, target: 'chrome120', logLevel: 'warning', nodePaths: [join(ENGINE, 'node_modules')] });
const html = join(out, 'armysheet.html'), font = readFileSync(join(ENGINE, 'fonts', 'Montserrat-ExtraBold.ttf')).toString('base64');
writeFileSync(html, `<!doctype html><meta charset="utf-8"><style>@font-face{font-family:Montserrat;font-weight:700;src:url(data:font/ttf;base64,${font})}body{margin:0;background:#222}</style><canvas id="c"></canvas><script>${r.outputFiles[0].text.replace(/<\/script/gi, '<\\/script')}</script>`);
let browser; try { browser = await chromium.launch({ channel: 'chrome' }); } catch { browser = await chromium.launch(); }
const page = await browser.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.goto(pathToFileURL(html).href); await page.evaluate(() => document.fonts.load('700 20px Montserrat'));
for (const [fn, file] of [['armySheet', 'army_sheet.jpg'], ['gaitStrips', 'gait_strips.jpg'], ['actionStrips', 'action_strips.jpg']]) {
  try {
    const [info, data] = await page.evaluate(fn => { const c = document.getElementById('c'); const info = window.SHEET[fn](c); return [info, c.toDataURL('image/jpeg', .9).split(',')[1]]; }, fn);
    writeFileSync(join(out, file), Buffer.from(data, 'base64')); console.log(join(out, file), `${info.width}x${info.height}`);
  } catch (e) { console.error(fn, 'не нарисован:', String(e.message).split('\n').slice(0, 4).join(' | ')); process.exitCode = 1; }
}
if (errs.length) { console.error('ошибки страницы:', errs); process.exitCode = 1; }
await browser.close();
