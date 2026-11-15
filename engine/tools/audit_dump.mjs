#!/usr/bin/env node
// audit_dump.mjs film.html frame out.png [--legacy] — картинка проверки толпы для одного кадра: красное — лишнее, зелёное — пропавшее
import { writeFileSync } from 'node:fs'; import { resolve } from 'node:path'; import { pathToFileURL } from 'node:url'; import { chromium } from 'playwright-core';
const [html, frame, out] = process.argv.slice(2), legacy = process.argv.includes('--legacy');
let b; try { b = await chromium.launch({ channel: 'chrome' }); } catch { b = await chromium.launch(); }
const p = await b.newPage(); await p.addInitScript(l => { globalThis.__CROWD_AUDIT = []; globalThis.__CROWD_AUDIT_DUMP = 1; if (l) globalThis.__CROWD_LEGACY = 1; }, legacy);
await p.goto(pathToFileURL(resolve(html)).href + '?render');
const r = await p.evaluate(f => { window.draw(f); return [globalThis.__CROWD_AUDIT, globalThis.__CROWD_AUDIT_IMG]; }, +frame);
console.log(JSON.stringify(r[0])); (r[1] || []).forEach((u, i) => writeFileSync(out.replace('.png', `_${i}.png`), Buffer.from(u.split(',')[1], 'base64')));
await b.close();
