#!/usr/bin/env node
// new-film.mjs: заготовка нового ролика в production/V<NNN>/.
//   node engine/tools/new-film.mjs V002 [--title "How Something Worked"] [--force]
// Создаёт: film.js (рабочая заготовка из двух сцен), narration.txt (текст для озвучки, строка = фраза),
// words.json (ОЦЕНКА таймкодов по тексту — её заменит voice.py), script.md и beatsheet.md (из templates/ проекта).
// Заготовка собирается и рендерится без правок:  node engine/tools/make.mjs production/V002 --min-dur 2 --max-epm 200 --min-epm 10
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ENGINE, REPO, parseArgs } from './lib.mjs';

const { pos, opt } = parseArgs();
const id = (pos[0] || '').toUpperCase();
if (!/^V\d{3}$/.test(id)) { console.error('usage: node engine/tools/new-film.mjs V<NNN> [--title "..."] [--force]   (номер из трёх цифр: V002)'); process.exit(2); }
const dir = join(REPO, 'production', id);
if (existsSync(join(dir, 'film.js')) && !opt.force) { console.error(`${dir} уже есть (film.js на месте). Номер ролика не переиспользуется; для перезаписи заготовки — --force`); process.exit(1); }
mkdirSync(dir, { recursive: true });
const title = typeof opt.title === 'string' ? opt.title : 'How … Worked';
const tpl = n => readFileSync(join(ENGINE, 'tools', 'templates', n), 'utf8');

// текст по умолчанию — две фразы, чтобы заготовка показывала обе декорации и склейку
const lines = ['He salted the mine with a shotgun full of gold.', '"Completely insane," says the rich guy.'];
writeFileSync(join(dir, 'narration.txt'), `# ${id} — текст для озвучки. Одна строка = одна фраза или реплика; номер строки = line в метках cue('2:gold').\n# Строки с # не читаются. После правки: node engine/tools/make.mjs production/${id}\n${lines.join('\n')}\n`);
// оценка таймкодов: ~228 слов/мин (темп эталона), слово длится пропорционально числу букв, пауза между фразами 0.25 с
const words = []; let t = .09;
lines.forEach((line, li) => {
  for (const tok of line.split(/\s+/)) {
    const w = tok.replace(/^["'“(]+|["'”).,!?;:…]+$/g, ''), d = Math.max(.08, .045 * w.length + .05);
    words.push({ word: w, start: +t.toFixed(3), end: +(t + d).toFixed(3), line: li + 1, text: tok, estimated: true }); t += d + .02;
  }
  t += .25;
});
writeFileSync(join(dir, 'words.json'), JSON.stringify(words, null, 1) + '\n');
writeFileSync(join(dir, 'film.js'), tpl('film.js').replaceAll('V000', id));
for (const [name, fallback] of [['script.md', `# ${id} — сценарий\n\n**Название:** ${title}\n\n## Текст по битам\n\n## Текст целиком (для озвучки)\n`], ['beatsheet.md', `# ${id} — постановка по словам\n\n## Сцены\n`]]) {
  const src = join(REPO, 'templates', name), out = join(dir, name);
  if (existsSync(out) && !opt.force) continue;
  writeFileSync(out, (existsSync(src) ? readFileSync(src, 'utf8') : fallback).replaceAll('V000', id).replace('How … Worked', title));
}
console.log(`создано: ${dir}
  film.js        заготовка: штрек (шахтёр говорит строку 1) -> склейка -> галерея (богач и напарник)
  narration.txt  текст для озвучки (${lines.length} фразы)
  words.json     оценка таймкодов; настоящие даст озвучка
  script.md, beatsheet.md
дальше:
  node engine/tools/make.mjs production/${id} --min-dur 2 --max-dur 62 --min-epm 10 --max-epm 200     # голос -> рендер -> субтитры -> звук -> проверка
  готовый файл: production/${id}/out/final.mp4`);
