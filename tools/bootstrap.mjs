#!/usr/bin/env node
// bootstrap.mjs: довести машину до рабочего состояния и проверить, что ролик собирается.
//   node tools/bootstrap.mjs [--with-earshot] [--no-test]
// Делает: проверку программ -> npm install движка -> edge-tts -> установку скилла -> пробный рендер с автопроверкой.
// Ничего не ставит молча в систему: недостающие программы называет вместе с командой установки (их ставят install.ps1 / install.sh).
import { existsSync, cpSync, rmSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { homedir, platform } from 'node:os';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const run = (cmd, a, opt = {}) => spawnSync(cmd, a, { cwd: ROOT, shell: true, encoding: 'utf8', ...opt });
const ok = (cmd, a = ['--version']) => run(cmd, a, { stdio: 'ignore' }).status === 0;
const py = ok('python') ? 'python' : ok('python3') ? 'python3' : null;
const win = platform() === 'win32', mac = platform() === 'darwin';
const hint = (w, m, l) => (win ? w : mac ? m : l);
const rows = []; let fatal = false;
const row = (name, good, how = '') => { rows.push([name, good, how]); if (!good && how.startsWith('!')) fatal = true; };

row('Node.js 18+', Number(process.versions.node.split('.')[0]) >= 18, '!' + hint('winget install OpenJS.NodeJS.LTS', 'brew install node', 'sudo apt install nodejs npm'));
row('ffmpeg', ok('ffmpeg', ['-version']), '!' + hint('winget install Gyan.FFmpeg', 'brew install ffmpeg', 'sudo apt install ffmpeg'));
row('Python 3.10+', !!py, '!' + hint('winget install Python.Python.3.12', 'brew install python', 'sudo apt install python3 python3-pip'));
const chrome = win ? ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].some(existsSync)
  : mac ? existsSync('/Applications/Google Chrome.app') : ok('google-chrome') || ok('chromium') || ok('chromium-browser');
row('Chrome', chrome, hint('winget install Google.Chrome', 'brew install --cask google-chrome', 'поставь Chrome или: cd engine && npx playwright-core install chromium'));

if (!fatal) {
  console.log('• зависимости движка (npm install)…');
  row('npm install в engine/', run('npm', ['install', '--no-audit', '--no-fund'], { cwd: join(ROOT, 'engine'), stdio: 'inherit' }).status === 0, 'cd engine && npm install');
  if (!chrome) { console.log('• Chrome не найден — ставлю встроенный Chromium…'); run('npx', ['playwright-core', 'install', 'chromium'], { cwd: join(ROOT, 'engine'), stdio: 'inherit' }); }
  if (!ok(py, ['-m', 'edge_tts', '--version'])) { console.log('• edge-tts (бесплатный черновой голос)…'); run(py, ['-m', 'pip', 'install', '--quiet', 'edge-tts', 'numpy'], { stdio: 'inherit' }); }
  row('edge-tts', ok(py, ['-m', 'edge_tts', '--version']), `${py} -m pip install edge-tts`);
  console.log('• скилл stickman-3d…');
  const packed = run(py, ['tools/pack_skill.py'], { stdio: 'inherit' }).status === 0;
  row('скилл в ~/.claude/skills/stickman-3d', packed && existsSync(join(homedir(), '.claude', 'skills', 'stickman-3d', 'SKILL.md')), `${py} tools/pack_skill.py`);
  for (const d of ['raw/_secrets', 'raw/research', 'raw/analytics']) mkdirSync(join(ROOT, d), { recursive: true });
  row('ключ ElevenLabs (необязателен)', existsSync(join(ROOT, 'raw', '_secrets', 'voice-api-key.txt')), 'для платных голосов и генерации звуков положи ключ в raw/_secrets/voice-api-key.txt');
  if (args.includes('--with-earshot')) {
    const dst = join(ROOT, 'vendor', 'earshot');
    if (!existsSync(dst)) run('git', ['clone', '--depth', '1', 'https://github.com/Leonxlnx/earshot', dst], { stdio: 'inherit' });
    row('earshot (машинная проверка звука)', existsSync(join(dst, 'README.md')), 'дальше — установка по vendor/earshot/README.md (свой venv, CPU-версия torch)');
  }
  if (!args.includes('--no-test')) {
    console.log('• пробный ролик (голос → рендер → субтитры → звук → автопроверка)…');
    const t = run('node', ['engine/tools/make.mjs', 'engine/films/demo', '--min-dur', '4', '--max-dur', '5', '--max-epm', '200'], { stdio: 'inherit' });
    row('пробный ролик engine/out/demo/final.mp4', t.status === 0 && existsSync(join(ROOT, 'engine', 'out', 'demo', 'final.mp4')), 'node engine/tools/make.mjs engine/films/demo --min-dur 4 --max-dur 5 --max-epm 200');
  }
}
console.log('\nИтог:');
for (const [name, good, how] of rows) console.log(`  ${good ? 'OK ' : 'НЕТ'}  ${name}${good ? '' : '   -> ' + how.replace(/^!/, '')}`);
const bad = rows.filter(r => !r[1] && !r[0].includes('необязателен'));
console.log(bad.length ? `\nНе готово: ${bad.length}. Выполни команды после стрелок и запусти bootstrap снова.` : '\nВсё готово. В Claude Code: «сделай ролик в стиле стикман 3д» или «продолжаем V002».');
process.exit(bad.length ? 1 : 0);
