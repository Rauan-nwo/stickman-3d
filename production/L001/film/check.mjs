// film/check.mjs — сверка постановки с текущим шотлистом (после каждого перетайминга и перенумерации):
//   node production/L001/film/check.mjs [--ch 0,1]
// 1) каждый ключ 'глава|начало текста' (shots.js SHOTS / OVER / SKIP_PROPS, clips3d.js) находит ровно один план;
// 2) в заданных главах у каждого плана с героями или реквизитом (локации L…, T-desk) есть постановка, у 3D-планов — нативная сцена.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { matchKey } from './keys.js';
import { CLIPS3D_KEYS } from './clips3d.js';
const D = dirname(fileURLToPath(import.meta.url)), timing = JSON.parse(readFileSync(join(D, '../animatic/timing.json'), 'utf8'));
const a = process.argv.indexOf('--ch'), CH = (a > 0 ? process.argv[a + 1] : '0,1').split(',').map(Number);
const src = readFileSync(join(D, 'shots.js'), 'utf8');
const keysOf = name => { const i = src.indexOf(`export const ${name} = {`), j = src.indexOf('\n};', i) < 0 ? src.length : src.indexOf('\n};', i); return [...src.slice(i, j + 1).matchAll(/['"](\d+\|[^'"\n]*?(?:'[^'"\n]*?)?)['"]\s*:/g)].map(m => m[1]); };
const tables = { SHOTS: keysOf('SHOTS'), OVER: keysOf('OVER'), SKIP_PROPS: keysOf('SKIP_PROPS'), CLIPS3D: Object.keys(CLIPS3D_KEYS) };
let bad = 0; const staged = new Set(), clip = new Set();
for (const [name, keys] of Object.entries(tables)) for (const k of keys) { const m = matchKey(k, timing.shots);
  if (m.length !== 1) { bad++; console.log(`! ${name} «${k}»: планов ${m.length}${m.length ? ' (#' + m.map(s => s.n).join(', #') + ')' : ''}`); }
  else { if (name === 'SHOTS') staged.add(m[0].n); if (name === 'CLIPS3D') clip.add(m[0].n); } }
for (const s of timing.shots.filter(s => CH.includes(s.ch))) {
  if ((/^L\d/.test(s.loc) || s.loc === 'T-desk') && !staged.has(s.n)) { bad++; console.log(`! #${s.n} ${s.loc} «${s.framing}» — нет постановки (будет заглушка аниматика): ${s.text}`); }
  if (s.loc.startsWith('3D-') && !clip.has(s.n)) { bad++; console.log(`! #${s.n} ${s.loc} «${s.framing}» — нет нативной 3D-сцены (будет прокси аниматика)`); }
}
console.log(`ключей: постановка ${tables.SHOTS.length}, поверх ${tables.OVER.length}, без табличек ${tables.SKIP_PROPS.length}, 3D ${tables.CLIPS3D.length}; главы ${CH}: планов ${timing.shots.filter(s => CH.includes(s.ch)).length}; проблем ${bad}`);
process.exit(bad ? 1 : 0);
