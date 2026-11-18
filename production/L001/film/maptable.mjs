// film/maptable.mjs — таблица «план текущего шотлиста -> ключ постановки» (для QA.md): node production/L001/film/maptable.mjs --ch 0,1
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { matchKey } from './keys.js';
import { CLIPS3D_KEYS } from './clips3d.js';
const D = dirname(fileURLToPath(import.meta.url)), timing = JSON.parse(readFileSync(join(D, '../animatic/timing.json'), 'utf8'));
const a = process.argv.indexOf('--ch'), CH = (a > 0 ? process.argv[a + 1] : '0,1').split(',').map(Number);
import { allKeys } from './shots/keys_src.mjs';
const rows = allKeys('SHOTS').map(r => [r.key, r.note]);
const of = {}; for (const [k, c] of rows) for (const s of matchKey(k, timing.shots)) of[s.n] = [k, c];
for (const k of Object.keys(CLIPS3D_KEYS)) for (const s of matchKey(k, timing.shots)) of[s.n] = [k, `нативная 3D-сцена ${CLIPS3D_KEYS[k].scene}`];
console.log('| # | план (шотлист) | текст | ключ постановки | что играет в финале |\n|---|---|---|---|---|');
for (const s of timing.shots.filter(s => CH.includes(s.ch))) { const m = of[s.n];
  console.log(`| ${s.n} | ${s.framing} | ${s.text.slice(0, 34)} | ${m ? '`' + m[0] + '`' : '— (шаблон аниматика)'} | ${m ? m[1].slice(0, 150) : s.loc} |`); }
