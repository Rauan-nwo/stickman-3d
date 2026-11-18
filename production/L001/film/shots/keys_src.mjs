// film/shots/keys_src.mjs — ключи постановки из исходников глав (для check.mjs / maptable.mjs: модули глав импортируют 'engine', node их не грузит)
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const D = dirname(fileURLToPath(import.meta.url));
export const chapterFiles = () => readdirSync(D).filter(f => /^ch\d\d\.js$/.test(f)).sort();
// таблица name (SHOTS | OVER | SKIP_PROPS) одной главы -> [[ключ, комментарий-описание], ...]
export function keysOf(file, name) {
  const src = readFileSync(join(D, file), 'utf8').split(String.fromCharCode(13)).join(''), i = src.indexOf(`export const ${name} = {`); if (i < 0) return [];
  const j = name === 'SKIP_PROPS' ? src.indexOf('};', i) : src.indexOf('\n};', i), body = src.slice(i, j + 1), out = [];
  for (const m of body.matchAll(/(['"])(\d+\|(?:(?!\1).)*?)\1\s*:/g)) {           // ключ 'глава|текст' перед двоеточием
    const eol = body.indexOf('\n', m.index), line = body.slice(m.index, eol < 0 ? body.length : eol), c = line.match(/\/\/ (.*)$/);
    out.push([m[2], c ? c[1].trim() : '']);
  }
  return out;
}
export const allKeys = name => chapterFiles().flatMap(f => keysOf(f, name).map(([k, c]) => ({ file: f, key: k, note: c })));
