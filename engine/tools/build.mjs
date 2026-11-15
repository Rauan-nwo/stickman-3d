#!/usr/bin/env node
// build.mjs: фильм -> одна самодостаточная HTML-страница (three.js и движок внутри, без сети и CDN).
//   node tools/build.mjs <папка фильма | film.js> [--out file.html] [--no-minify]
// В film.js движок импортируется как 'engine':  import { mineShaft, miner, Actor } from 'engine';
// JSON импортируется напрямую:                  import words from './words.json';
import { build } from 'esbuild';
import { writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { ENGINE, parseArgs, filmPaths, isMain } from './lib.mjs';

export async function buildFilm(arg, { out, minify = true } = {}) {
  const p = filmPaths(arg), html = out ? resolve(out) : p.html;
  const entry = `import film from ${JSON.stringify(p.film.replace(/\\/g, '/'))};\nimport { runFilm } from 'engine';\nrunFilm(film);\n`;
  const r = await build({
    stdin: { contents: entry, resolveDir: p.dir, sourcefile: 'entry.js', loader: 'js' },
    bundle: true, format: 'iife', minify, write: false, target: 'chrome120', legalComments: 'none',
    alias: { engine: join(ENGINE, 'src') }, nodePaths: [join(ENGINE, 'node_modules')], loader: { '.json': 'json', '.png': 'dataurl', '.jpg': 'dataurl' },
    logLevel: 'warning',
  });
  const js = r.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
  writeFileSync(html, `<!doctype html><html><head><meta charset="utf-8"><title>${p.name}</title>
<style>html,body{margin:0;background:#000;display:grid;place-items:center;height:100vh}canvas{height:100vh;width:auto}</style></head>
<body><canvas id="c" width="720" height="1280"></canvas><script>${js}</script></body></html>`);
  return { html, kb: Math.round(js.length / 1024), ...p };
}

if (isMain(import.meta.url)) {
  const { pos, opt } = parseArgs();
  if (!pos[0]) { console.error('usage: node tools/build.mjs <папка фильма | film.js> [--out file.html] [--no-minify]'); process.exit(1); }
  const r = await buildFilm(pos[0], { out: opt.out === true ? undefined : opt.out, minify: !opt['no-minify'] });
  console.log(`${r.html}  ${r.kb} KB`);
}
