#!/usr/bin/env node
// charsheet.mjs — лист новых героев L002 на утверждение (чистый 2D, без 3D).
//   node production/L002/film/tools/charsheet.mjs [--out production/L002/film/out]
// Каждый герой: анфас (улыбка), анфас (говорит), 3/4 (нейтрально), крупно голова со светом нуара; Grok — три выражения.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = dirname(fileURLToPath(import.meta.url)), FILM = resolve(HERE, '..'), ROOT = resolve(FILM, '..', '..', '..'), ENGINE = join(ROOT, 'engine');
const req = createRequire(join(ENGINE, 'package.json')); const { build } = req('esbuild'); const { chromium } = req('playwright-core');   // зависимости — из engine/node_modules
const outArg = process.argv.indexOf('--out'); const out = resolve(outArg > 0 ? process.argv[outArg + 1] : join(FILM, 'out')); mkdirSync(out, { recursive: true });

const code = `
import * as C from ${JSON.stringify(join(FILM, 'chars_L2.js').replace(/\\/g, '/'))};
import { jensen, moneyman, feel, noirShade } from 'engine';
const ROWS = [['Илон Маск', C.musk], ['Дарио Амодеи', C.dario], ['Даниэла Амодеи', C.daniela], ['Сэм Бэнкман-Фрид', C.sbf], ['Бэнкман-Фрид в тюрьме', C.sbfPrison], ['Сэм Альтман', C.altman], ['Дженсен (L001, камео)', jensen]];
const POSES = [['анфас, улыбка', { ...feel('smile', .4) }], ['говорит', { ...feel('talk', .22) }], ['3/4, нейтрально', { ...feel('neutral', .4), view: 'threeQuarter', facing: 1 }], ['3/4, ухмылка', { ...feel('smile', .4), view: 'threeQuarter', facing: -1 }]];
function label(x, s, px, py, size, col, align = 'left') { x.font = '700 ' + size + 'px Arial'; x.textAlign = align; x.lineWidth = 6; x.strokeStyle = 'rgba(0,0,0,.7)'; x.strokeText(s, px, py); x.fillStyle = col; x.fillText(s, px, py); }
window.draw = (canvas) => {
  const CW = 380, CH = 470, LEFT = 260, TOP = 70, HEADW = 360;
  const W = LEFT + POSES.length * CW + HEADW + 30, H = TOP + ROWS.length * CH + 420;
  canvas.width = W; canvas.height = H; const x = canvas.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1d1a22'); g.addColorStop(1, '#0e0c12'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  label(x, 'L002 — новые герои (на утверждение)', 20, 46, 34, '#FFE9B8');
  POSES.forEach(([n], i) => label(x, n, LEFT + i * CW + CW / 2, TOP + 6, 24, '#d9c79a', 'center'));
  label(x, 'свет нуара', LEFT + POSES.length * CW + HEADW / 2, TOP + 6, 24, '#d9c79a', 'center');
  ROWS.forEach(([name, mk], r) => {
    const y0 = TOP + 20 + r * CH; if (r % 2) { x.fillStyle = 'rgba(255,255,255,.03)'; x.fillRect(0, y0, W, CH); }
    label(x, name, 16, y0 + CH / 2, 26, '#FFE9B8');
    const ch = mk(); ch.spec.rig = { ...ch.spec.rig, plantLegs: .02 }; const S = ch.spec, pin = S.pins.feet || [0, 0], k = (CH - 40) / 1080;
    POSES.forEach(([, pose], i) => { x.save(); x.translate(LEFT + i * CW + CW / 2, y0 + CH - 14); x.scale(k, k); x.translate(-pin[0], -pin[1]); ch.draw(x, { stance: 'stand', ...pose }); x.restore(); });
    const lit = mk(); lit.spec.shade = noirShade([1, .4]); const L = lit.spec; const cx = LEFT + POSES.length * CW + HEADW / 2, cy = y0 + CH / 2 + 10, kk = .95;
    x.save(); x.beginPath(); x.rect(cx - HEADW / 2 + 10, y0 + 8, HEADW - 20, CH - 16); x.clip(); x.fillStyle = '#2a2018'; x.fillRect(cx - HEADW / 2, y0, HEADW, CH);
    x.translate(cx, cy); x.scale(kk, kk); x.translate(-L.head.x, -L.head.y + 60); lit.draw(x, { stance: 'stand', ...feel('smile', .4), view: 'threeQuarter', facing: -1 }); x.restore();
  });
  const gy = TOP + 20 + ROWS.length * CH + 30; label(x, 'Grok (персонаж-кубик)', 16, gy + 180, 26, '#FFE9B8');
  [['ухмылка', 'grin', 0], ['говорит', 'grin', 1], ['ехидно', 'smug', 0], ['неловко', 'worried', 0]].forEach(([n, e, tk], i) => {
    const cx = LEFT + i * CW + CW / 2; x.save(); x.translate(cx, gy + 210); C.grokDraw(x, 110, { expr: e, talk: tk, t: .4 }); x.restore(); label(x, n, cx, gy + 390, 22, '#d9c79a', 'center');
  });
  return [W, H];
};
window.shadeCheck = (canvas) => {
  const LIGHTS = [['свет слева, 3/4', [-1, .4], { view: 'threeQuarter', facing: 1 }], ['свет справа, 3/4', [1, .4], { view: 'threeQuarter', facing: -1 }], ['свет справа, анфас', [1, .45], {}], ['свет сверху-слева, говорит', [-.7, -.6], { view: 'threeQuarter', facing: 1 }]];
  const CW = 420, CH = 440, LEFT = 230, TOP = 60; const W = LEFT + LIGHTS.length * CW, H = TOP + ROWS.length * CH;
  canvas.width = W; canvas.height = H; const x = canvas.getContext('2d'); x.fillStyle = '#16131a'; x.fillRect(0, 0, W, H);
  LIGHTS.forEach(([n], i) => label(x, n, LEFT + i * CW + CW / 2, 40, 22, '#d9c79a', 'center'));
  ROWS.forEach(([name, mk], r) => { const y0 = TOP + r * CH; label(x, name, 12, y0 + CH / 2, 22, '#FFE9B8');
    LIGHTS.forEach(([, dir, view], i) => { const c = mk(); c.spec.shade = noirShade(dir); const L = c.spec, cx = LEFT + i * CW + CW / 2, cy = y0 + CH / 2 + 30;
      x.save(); x.beginPath(); x.rect(cx - CW / 2 + 8, y0 + 6, CW - 16, CH - 12); x.clip(); x.fillStyle = '#2b2219'; x.fillRect(cx - CW / 2, y0, CW, CH);
      x.translate(cx, cy); x.scale(.82, .82); x.translate(-L.head.x, -L.head.y + 40); c.draw(x, { stance: 'stand', ...feel(i === 3 ? 'talk' : 'smile', .3), ...view }); x.restore(); }); });
  return [W, H];
};`;
const r = await build({ stdin: { contents: code, resolveDir: FILM, loader: 'js' }, bundle: true, format: 'iife', write: false, target: 'chrome120',
  alias: { engine: join(ENGINE, 'src') }, nodePaths: [join(ENGINE, 'node_modules')], logLevel: 'error' });
const html = join(out, 'charsheet.html');
writeFileSync(html, `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#111"><canvas id="c"></canvas><script>${r.outputFiles[0].text}</script>`);
let browser; try { browser = await chromium.launch({ channel: 'chrome' }); } catch { browser = await chromium.launch(); }
const page = await browser.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.goto(pathToFileURL(html).href);
const [data, size] = await page.evaluate(() => { const c = document.getElementById('c'); const s = window.draw(c); return [c.toDataURL('image/jpeg', .92).split(',')[1], s]; });
const [d2] = await page.evaluate(() => { const c = document.getElementById('c'); window.shadeCheck(c); return [c.toDataURL('image/jpeg', .92).split(',')[1]]; });
writeFileSync(join(out, 'L002_shadecheck.jpg'), Buffer.from(d2, 'base64'));
const file = join(out, 'L002_charsheet.jpg'); writeFileSync(file, Buffer.from(data, 'base64')); console.log(file, size.join('x'));
if (errs.length) { console.error('ошибки страницы:', errs); process.exitCode = 1; }
await browser.close();
