#!/usr/bin/env node
// audit.mjs: автоматическая проверка слоя толпы на КАЖДОМ кадре фильма (см. crowdAudit в src/chars/crowd.js).
//   node tools/audit.mjs film.html [--legacy] [--out audit.json] [--thr 40] [--step 1]
// Для каждого вызова отрисовки толпы сравниваются силуэты «как нарисовал конвейер» и «каждый участник целиком, вектором,
// от дальних к ближним» (половинный размер, допуск 3 px). Считаются: missing — пиксели фигур, которых нет на кадре
// (обрезано краем ячейки атласа или прямоугольника), extra — пиксели, которых быть не должно (вторая копия, сдвинутая
// половина), order — участники из атласа, оказавшиеся ближе «векторных» ближних (нарушение порядка слоёв).
// --legacy включает прежний конвейер толпы (узкая ячейка, перспективная интерполяция, смешение атласов) — цифры «до».
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';
import { parseArgs, num } from './lib.mjs';
const { pos, opt } = parseArgs();
const thr = num(opt.thr, 40), step = num(opt.step, 1);
let b; try { b = await chromium.launch({ channel: 'chrome' }); } catch { b = await chromium.launch(); }
const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.addInitScript(legacy => { globalThis.__CROWD_AUDIT = []; if (legacy) globalThis.__CROWD_LEGACY = 1; }, !!opt.legacy);
await p.goto(pathToFileURL(resolve(pos[0])).href + '?render');
const N = await p.evaluate(() => window.FRAMES);
const rows = []; let calls = 0;
for (let f = 0; f < N; f += step) {
  const a = await p.evaluate(f => { globalThis.__CROWD_AUDIT.length = 0; window.draw(f); return globalThis.__CROWD_AUDIT.slice(); }, f);
  calls += a.length; if (!a.length) continue;
  rows.push({ f, missing: a.reduce((s, x) => s + x.missing, 0), extra: a.reduce((s, x) => s + x.extra, 0), order: a.reduce((s, x) => s + x.order, 0), n: a.reduce((s, x) => s + x.n, 0), near: a.reduce((s, x) => s + x.near, 0) });
}
await b.close();
const bad = k => rows.filter(r => r[k] > (k === 'order' ? 0 : thr));
const sum = k => rows.reduce((s, r) => s + r[k], 0), top = k => [...rows].sort((x, y) => y[k] - x[k]).slice(0, 6).filter(r => r[k] > 0).map(r => `${r.f}:${r[k]}`).join(' ');
const res = { film: pos[0], legacy: !!opt.legacy, frames: N, crowdFrames: rows.length, calls, thr,
  clipFrames: bad('missing').length, dupFrames: bad('extra').length, orderFrames: bad('order').length,
  missingPx: sum('missing'), extraPx: sum('extra'), orderMembers: sum('order'), worstMissing: top('missing'), worstExtra: top('extra'), worstOrder: top('order'), errors: errs.slice(0, 5) };
console.log(JSON.stringify(res, null, 1));
if (opt.out) writeFileSync(resolve(opt.out), JSON.stringify({ ...res, rows }, null, 0));
