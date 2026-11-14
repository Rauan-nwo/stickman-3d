#!/usr/bin/env node
// charsheet.mjs: контактные листы персонажей (без 3D).
//   node tools/charsheet.mjs [--out engine/out] [--words films/demo/words.json] [--preset richGuy]
// Пишет: char_sheet.jpg (все пресеты x все эмоции + все формы рта) и talk_strip.jpg (рот по кадрам следует words.json),
// печатает сводку проверки липфлапа.
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';
import { ENGINE, parseArgs } from './lib.mjs';

const { opt } = parseArgs();
const out = resolve(typeof opt.out === 'string' ? opt.out : join(ENGINE, 'out')); mkdirSync(out, { recursive: true });
const words = JSON.parse(readFileSync(resolve(typeof opt.words === 'string' ? opt.words : join(ENGINE, 'films', 'demo', 'words.json')), 'utf8'));
const r = await build({ stdin: { contents: `import * as S from './src/chars/sheet.js'; window.SHEET = S;`, resolveDir: ENGINE, loader: 'js' }, bundle: true, format: 'iife', write: false, target: 'chrome120', logLevel: 'warning' });
const html = join(out, 'charsheet.html');
const font = readFileSync(join(ENGINE, 'fonts', 'Montserrat-ExtraBold.ttf')).toString('base64');
writeFileSync(html, `<!doctype html><meta charset="utf-8"><style>@font-face{font-family:Montserrat;font-weight:700;src:url(data:font/ttf;base64,${font})}body{margin:0;background:#222}</style><canvas id="c"></canvas><script>${r.outputFiles[0].text.replace(/<\/script/gi, '<\\/script')}</script>`);
let browser; try { browser = await chromium.launch({ channel: 'chrome' }); } catch { browser = await chromium.launch(); }
const page = await browser.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.goto(pathToFileURL(html).href);
await page.evaluate(() => document.fonts.load('700 20px Montserrat'));
const shot = async (fn, arg, file) => {
  const [info, data] = await page.evaluate(([fn, arg]) => { const c = document.getElementById('c'); const info = window.SHEET[fn](c, ...arg); return [info, c.toDataURL('image/jpeg', .9).split(',')[1]]; }, [fn, arg]);
  writeFileSync(join(out, file), Buffer.from(data, 'base64')); return info;
};
const a = await shot('charSheet', [], 'char_sheet.jpg');
console.log(`${join(out, 'char_sheet.jpg')}  ${a.width}x${a.height}: ${a.presets.length} героя x ${a.emotions.length} эмоций (${a.emotions.join(', ')}), ${a.mouths.length} форм рта`);
const b = await shot('talkStrip', [words, { preset: typeof opt.preset === 'string' ? opt.preset : 'richGuy' }], 'talk_strip.jpg');
console.log(`${join(out, 'talk_strip.jpg')}  ${b.frames} кадров, слов ${b.words}: рот не по правилу в ${b.wrongMouthFrames} кадрах из ${b.frames}; в речи ${b.speakingFrames} кадров, смен формы ${b.mouthSwaps}, форма держится ${b.holdFrames.min}–${b.holdFrames.max} кадра`);
if (errs.length) { console.error('ошибки страницы:', errs); process.exitCode = 1; }
if (b.wrongMouthFrames > 0 || b.holdFrames.max > 4) { console.error('липфлап не прошёл проверку'); process.exitCode = 1; }
await browser.close();
