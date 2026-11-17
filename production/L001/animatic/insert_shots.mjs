// insert_shots.mjs: вставка новых планов в shotlist.md, когда сценарий уже изменился (shotlist_tool apply требует,
// чтобы шотлист сходился со старым сценарием — здесь не требуется). Правки по СТАРЫМ номерам:
//   { after: N, row: {text, loc, framing, dur, event, camera} }  — новый план после N (в той же главе)
//   { n: N, set: {text?, …} }                                     — поправить поля плана N
// Перенумерация, карта старый→новый в tmp/renumber.json, перенос номеров в conf.js / film.js (shotlist_tool remap).
//   node production/L001/animatic/insert_shots.mjs <ops.mjs>
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
const D = dirname(fileURLToPath(import.meta.url)), SL = join(D, '..', 'shotlist.md');
const ROW = /^\| (\d+) \| ([\d:.]+) \| (.*?) \| (\S+) \| (.*?) \| ([\d.]+) \| (.*?) \| (.*?) \|$/;
const { default: ops } = await import(pathToFileURL(resolve(process.argv[2])).href);
const lines = readFileSync(SL, 'utf8').split(/\r?\n/);
const rows = []; let ch = null;
lines.forEach((l, i) => { const h = l.match(/^### Гл\. (\d+)\./); if (h) ch = +h[1]; const m = l.match(ROW);
  if (m && ch != null && /^\d+:\d/.test(m[2])) rows.push({ li: i, n: +m[1], st: m[2], text: m[3], loc: m[4], framing: m[5], dur: m[6], event: m[7], camera: m[8], ch }); });
const out = [];
for (const r of rows) {
  for (const o of ops.filter(o => o.n === r.n && o.set)) Object.assign(r, o.set);
  out.push(r);
  const chain = key => { for (const o of ops.filter(o => o.after === key)) { out.push({ ...o.row, st: r.st, ch: r.ch, isNew: true, tag: o.tag }); if (o.tag) chain(o.tag); } };
  chain(r.n);           // after: N — после старого плана; after: 'tag' — после только что вставленного
}
const map = {}; const added = {};
out.forEach((r, i) => { r.newN = i + 1; if (r.isNew) added[r.tag || 'new' + i] = i + 1; else map[r.n] = i + 1; });
const fmtRow = r => `| ${r.newN} | ${r.st} | ${r.text} | ${r.loc} | ${r.framing} | ${(+r.dur).toFixed(1)} | ${r.event} | ${r.camera} |`;
const res = []; let i = 0; const byCh = {}; out.forEach(r => (byCh[r.ch] ||= []).push(r));
while (i < lines.length) {
  const h = lines[i].match(/^### Гл\. (\d+)\./); res.push(lines[i]); i++;
  if (h) { while (i < lines.length && !ROW.test(lines[i])) { res.push(lines[i]); i++; }
    while (i < lines.length && ROW.test(lines[i])) i++; for (const r of byCh[+h[1]] || []) res.push(fmtRow(r)); }
}
writeFileSync(SL, res.join('\n'));
mkdirSync(join(D, 'tmp'), { recursive: true }); writeFileSync(join(D, 'tmp', 'renumber.json'), JSON.stringify(map));
execFileSync('node', [join(D, 'shotlist_tool.mjs'), 'remap', join(D, 'tmp', 'renumber.json')], { stdio: 'inherit' });
console.log(`было ${rows.length}, стало ${out.length}; новые: ${JSON.stringify(added)}`);
