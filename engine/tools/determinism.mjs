#!/usr/bin/env node
// determinism.mjs: кадр обязан зависеть только от своего номера. Рисует набор кадров по порядку, в обратном порядке
// и после перезагрузки страницы и сравнивает пиксели всех трёх проходов.
//   node tools/determinism.mjs film.html [--frames 0,8,24,60,110] [--set k=v] [--noise 200]
// Видеокарта не битово повторяема: между запусками единичные пиксели могут уйти на 1–2 уровня (замечено ещё в hook2).
// Поэтому считается сумма абсолютных отличий по кадру: до --noise (по умолчанию 200 уровней на 2.7 млн значений) — шум
// видеокарты, больше — состояние между кадрами (ошибка в фильме: часы, Math.random(), накопление).
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';
import { parseArgs, num } from './lib.mjs';

const { pos, opt } = parseArgs(process.argv.slice(2), ['set']);
if (!pos[0]) { console.error('usage: node tools/determinism.mjs film.html [--frames 0,8,24] [--set k=v] [--noise 200]'); process.exit(2); }
const url = pathToFileURL(resolve(pos[0])).href + '?render' + (opt.set || []).map(s => '&' + s).join('');
// подпись кадра: суммы каналов по блокам 8x8 (их разница между проходами = сумма отличий пикселей с точностью до взаимного гашения)
const run = async (order) => {
  let b; try { b = await chromium.launch({ channel: 'chrome' }); } catch { b = await chromium.launch(); }
  const p = await b.newPage(); await p.goto(url);
  const n = await p.evaluate(() => window.FRAMES);
  const out = {};
  for (const f of order(n)) out[f] = await p.evaluate(f => {
    window.draw(f); const c = document.querySelector('canvas'), W = c.width, H = c.height, d = c.getContext('2d').getImageData(0, 0, W, H).data;
    const bw = Math.ceil(W / 8), bh = Math.ceil(H / 8), s = new Array(bw * bh).fill(0);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4; s[(y >> 3) * bw + (x >> 3)] += d[i] + d[i + 1] + d[i + 2]; }
    return s;
  }, f);
  await b.close(); return out;
};
const pick = n => (typeof opt.frames === 'string' ? opt.frames.split(',').map(Number) : [...new Set([0, 1, 2, ...Array.from({ length: 14 }, (_, i) => Math.round((i + 1) * (n - 1) / 14))])]).filter(f => f < n);
const a = await run(pick), b = await run(n => [...pick(n)].reverse()), c = await run(pick);
const diff = (x, y) => { let s = 0, k = 0; for (let i = 0; i < x.length; i++) { const d = Math.abs(x[i] - y[i]); if (d) { s += d; k++; } } return [s, k]; };
const FR = Object.keys(a).map(Number), noise = num(opt.noise, 200); let exact = 0, noisy = 0, bad = 0;
for (const f of FR) {
  const [s1, k1] = diff(a[f], b[f]), [s2, k2] = diff(a[f], c[f]), worst = Math.max(s1, s2);
  if (!worst) { exact++; continue; }
  if (worst <= noise) noisy++; else bad++;
  console.log(`кадр ${f}: обратный порядок — отличий ${s1} ур. в ${k1} блоках; перезагрузка — ${s2} ур. в ${k2} блоках${worst > noise ? '   <-- НЕ ШУМ' : ''}`);
}
console.log(bad ? `НЕ ДЕТЕРМИНИРОВАНО: ${bad} из ${FR.length} кадров отличаются больше порога ${noise}`
  : `детерминировано: ${FR.length} кадров (${FR.join(',')}); совпали точно ${exact}, в пределах шума видеокарты ${noisy} (порог ${noise} ур. на кадр)`);
process.exit(bad ? 1 : 0);
