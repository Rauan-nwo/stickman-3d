#!/usr/bin/env node
// rhythm.mjs: профиль покадровой разницы (та же метрика, что в qa.mjs) по полсекундам — где движение не затихает и где пусто.
//   node tools/rhythm.mjs video.mp4 [--thr 9]
import { resolve } from 'node:path';
import { parseArgs, num } from './lib.mjs';
import { visualEvents } from './qa.mjs';
const { pos, opt } = parseArgs(); const thr = num(opt.thr, 9);
const v = await visualEvents(resolve(pos[0]), { thr });
const d = v.diffs, ch = x => (x > thr * 3 ? '#' : x > thr ? '+' : x > thr / 2 ? '-' : x > 1 ? '.' : ' ');
for (let s = 0; s * 30 < d.length; s++) console.log(String(s).padStart(3) + ' |' + d.slice(s * 30, s * 30 + 30).map(ch).join('') + '|');
const marks = [0, ...v.events.flatMap(e => [e.from, e.to]), v.frames]; let L = [];
for (let i = 0; i + 1 < marks.length; i++) if (marks[i + 1] - marks[i] > 75) L.push(`${(marks[i] / 30).toFixed(2)}–${(marks[i + 1] / 30).toFixed(2)} (${((marks[i + 1] - marks[i]) / 30).toFixed(2)} с)`);
console.log(`событий ${v.count} = ${(v.count / v.frames * 1800).toFixed(1)} в минуту; окна дольше 2.5 с: ${L.join(', ') || 'нет'}`);
