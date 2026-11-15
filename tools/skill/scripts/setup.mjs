#!/usr/bin/env node
// setup.mjs: развернуть проект «Стикман 3D» из скилла.
//   node <папка скилла>/scripts/setup.mjs <путь к новой папке проекта>
// Копирует движок и шаблоны, создаёт production/ и raw/_secrets/, ставит зависимости движка и проверяет окружение.
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync, spawnSync } from 'node:child_process';

const SKILL = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const target = resolve(process.argv[2] || 'stickman3d-project');
if (existsSync(join(target, 'engine', 'README.md'))) { console.log('Проект уже есть:', target); process.exit(0); }
mkdirSync(target, { recursive: true });
cpSync(join(SKILL, 'assets', 'engine'), join(target, 'engine'), { recursive: true });
cpSync(join(SKILL, 'assets', 'templates'), join(target, 'templates'), { recursive: true });
cpSync(join(SKILL, 'assets', 'example-V002'), join(target, 'production', 'example-V002'), { recursive: true });
for (const d of ['production', 'raw/_secrets', 'raw/research']) mkdirSync(join(target, d), { recursive: true });
writeFileSync(join(target, '.gitignore'), ['raw/_secrets/', '.env', 'node_modules/', 'engine/out/', 'production/**/out/',
  '*.mp4', '*.mov', '*.wav', '*.mp3', '*.m4a', ''].join('\n'));
console.log('Скопировано в', target);

const has = (cmd, args = ['--version']) => spawnSync(cmd, args, { shell: true, stdio: 'ignore' }).status === 0;
const report = [
  ['Node >= 18', Number(process.versions.node.split('.')[0]) >= 18, 'поставь Node.js 18 или новее'],
  ['ffmpeg', has('ffmpeg', ['-version']), 'поставь ffmpeg и добавь в PATH'],
  ['Python', has('python') || has('python3'), 'поставь Python 3.10+'],
  ['edge-tts (черновой голос)', has('python', ['-m', 'edge_tts', '--version']) || has('python3', ['-m', 'edge_tts', '--version']), 'pip install edge-tts'],
];
console.log('\nСтавлю зависимости движка (three, esbuild, playwright-core)…');
try { execSync('npm install --no-audit --no-fund', { cwd: join(target, 'engine'), stdio: 'inherit' }); report.push(['npm install', true, '']); }
catch { report.push(['npm install', false, 'запусти вручную: cd engine && npm install']); }
console.log('\nПроверка окружения:');
for (const [name, ok, hint] of report) console.log(`  ${ok ? 'OK ' : 'НЕТ'}  ${name}${ok ? '' : '  -> ' + hint}`);
console.log(`
Нужен ещё установленный Chrome (рендер идёт в нём на видеокарте).
Проверка движка:  cd "${target}" && node engine/tools/make.mjs engine/films/demo --min-dur 4 --max-dur 5 --max-epm 200
Новый ролик:      node engine/tools/new-film.mjs V001 --title "Why Something Works"
Ключ ElevenLabs (если нужен платный голос) положи в raw/_secrets/voice-api-key.txt — он не попадает в git.`);
