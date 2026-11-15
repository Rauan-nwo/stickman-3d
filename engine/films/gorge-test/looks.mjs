// looks.mjs: кадры всех ракурсов в полном размере (look_<имя>.jpg) + контактный лист.
//   node engine/films/gorge-test/looks.mjs [папка вывода]      (сначала: node engine/tools/build.mjs engine/films/gorge-test)
import { readFileSync, renameSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url)), ENGINE = resolve(here, '../..');
const out = resolve(process.argv[2] || join(ENGINE, 'out/gorge-test')); mkdirSync(out, { recursive: true });
const names = f => [...readFileSync(join(ENGINE, 'src/sets', f), 'utf8').matchAll(/^\s{4}(\w+): A\(/gm)].map(m => m[1]);
const all = [...names('gorgeBridge.js'), ...names('swingTree.js')];
execFileSync(process.execPath, [join(ENGINE, 'tools/render.mjs'), join(ENGINE, 'out/gorge-test/film.html'), join(out, 'tmp'), '--stills', all.map((_, i) => i).join(','), '--set', 'mode=look'], { stdio: 'inherit' });
all.forEach((n, i) => renameSync(join(out, `tmp-${String(i).padStart(4, '0')}.jpg`), join(out, `look_${String(i).padStart(2, '0')}_${n}.jpg`)));
const cols = 9, rows = Math.ceil(all.length / cols), inputs = all.flatMap((n, i) => ['-i', join(out, `look_${String(i).padStart(2, '0')}_${n}.jpg`)]);
const pad = cols * rows - all.length, lay = all.map((_, i) => `[${i}:v]scale=300:-2[v${i}]`).join(';');
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', `${lay};${all.map((_, i) => `[v${i}]`).join('')}xstack=inputs=${all.length}:layout=${all.map((_, i) => `${(i % cols) * 300}_${Math.floor(i / cols) * 534}`).join('|')}:fill=black`, '-frames:v', '1', '-q:v', '3', join(out, 'look_sheet.jpg')]);
console.log(`${all.length} ракурсов -> ${out}\\look_*.jpg, look_sheet.jpg (${cols}x${rows}, пустых ${pad})`);
