// film/lint_shots.mjs — имена из общих модулей, использованные в shots/chNN.js без импорта.
// esbuild такое пропускает: ошибка «X is not defined» всплыла бы только в браузере, посреди рендера. Вызывается из check.mjs.
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const D = dirname(fileURLToPath(import.meta.url));
// имена, экспортируемые общими модулями (shots/common.js, staging/*, props.js, engine) — список дополняется вместе с common.js
export const SHARED = ['inOutExpo', 'gauss', 'env', 'W_', 'W0', 'shake', 'whipPlates', 'focusBox', 'freezeFrame', 'candle', 'V', 'WHIP_DUR', 'wordAt', 'lineSpan', 'polaroidAt',
  'clamp', 'lerp', 'E', 'gesture', 'W', 'H', 'camView', 'toS', 'lerpView', 'cover', 'R', 'CAR', 'OF', 'KY', 'IN', 'DT', 'PR'];
const esc = s => s.replace(/[$]/g, '\\$');

// убрать строки, шаблоны и комментарии, чтобы имя в тексте подписи не считалось использованием
function strip(code) {
  let out = '', i = 0;
  while (i < code.length) {
    const c = code[i], n = code[i + 1];
    if (c === '/' && n === '/') { while (i < code.length && code[i] !== '\n') i++; continue; }
    if (c === '/' && n === '*') { i = code.indexOf('*/', i + 2); i = i < 0 ? code.length : i + 2; continue; }
    if (c === "'" || c === '"' || c === '`') { const q = c; i++; while (i < code.length && code[i] !== q) i += code[i] === '\\' ? 2 : 1; i++; out += "''"; continue; }
    out += c; i++;
  }
  return out;
}

export function lintShots() {
  const problems = [];
  for (const f of readdirSync(join(D, 'shots')).filter(f => /^ch\d\d\.js$/.test(f))) {
    const code = readFileSync(join(D, 'shots', f), 'utf8').split(String.fromCharCode(13)).join('');
    const imports = (code.match(/^import[^;]*;/gm) || []).join(' ');
    const locals = (code.match(/^(?:const|let|function)\s+[\w$]+/gm) || []).map(x => x.split(/\s+/).pop());
    const body = strip(code.replace(/^import[^;]*;/gm, ''));
    for (const n of SHARED) {
      const used = new RegExp(`(?<![\\w.$])${esc(n)}\\s*[(.\\[]`).test(body);
      const known = new RegExp(`(?<![\\w$])${esc(n)}(?![\\w$])`).test(imports) || locals.includes(n);
      if (used && !known) problems.push(`${f}: ${n}`);
    }
  }
  return problems;
}
