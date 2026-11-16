// check.mjs: самопроверка аниматика — карточки против закадра, полнота планов, ритм по главам, видео (длина, чёрные кадры).
//   node production/L001/animatic/check.mjs [--video]
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const D = dirname(fileURLToPath(import.meta.url)), tm = JSON.parse(readFileSync(join(D, 'timing.json'), 'utf8')), S = tm.shots;
const norm = s => s.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
let bad = 0;
// 1. планы: все 277, по порядку, без дыр и наложений
S.forEach((s, i) => { if (s.n !== i + 1) { console.log('порядок', s.n); bad++; } if (i && Math.abs(S[i - 1].end - s.start) > 1e-6) { console.log('дыра', s.n); bad++; } if (s.dur <= 0) { console.log('длина<=0', s.n); bad++; } });
console.log(`планов ${S.length}, итог ${tm.total.toFixed(2)} с (голос ${tm.voiceDuration.toFixed(2)} с + паузы ${tm.inserts.reduce((a, x) => a + x.dur, 0).toFixed(2)} с вставок + хвост)`);
// 2. карточки: фраза есть в закадре своего плана
for (const s of S.filter(s => s.loc === 'T-card')) {
  const q = (s.event.match(/«([^»]+)»/) || [])[1];
  if (!q) { console.log(`#${s.n} карточка без цитаты в шотлисте`); bad++; continue; }
  if (!norm(s.spoken).includes(norm(q))) { console.log(`#${s.n} карточка «${q}» НЕ совпадает с закадром: "${s.spoken}"`); bad++; }
}
console.log('карточек', S.filter(s => s.loc === 'T-card').length, 'проверено');
// 3. ритм по главам
const fmt = t => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;
console.log('\n| Гл. | старт | планов | с | склеек/мин | сред., с | мин (#) | макс (#) | <1 с | >8 с |\n|---|---|---|---|---|---|---|---|---|---|');
for (const c of [...new Set(S.map(s => s.ch))]) {
  const a = S.filter(s => s.ch === c), d = a[a.length - 1].end - a[0].start;
  const mn = a.reduce((x, y) => (y.dur < x.dur ? y : x)), mx = a.reduce((x, y) => (y.dur > x.dur ? y : x));
  console.log(`| ${c}. ${a[0].chTitle} | ${fmt(a[0].start)} | ${a.length} | ${d.toFixed(1)} | ${(a.length / d * 60).toFixed(1)} | ${(d / a.length).toFixed(2)} | ${mn.dur.toFixed(2)} (#${mn.n}) | ${mx.dur.toFixed(2)} (#${mx.n}) | ${a.filter(s => s.dur < 1).map(s => '#' + s.n).join(' ')} | ${a.filter(s => s.dur > 8).map(s => '#' + s.n).join(' ')} |`);
}
const L = [...S].sort((a, b) => b.dur - a.dur)[0];
console.log(`\nвсего склеек/мин ${(S.length / tm.total * 60).toFixed(1)}; самый длинный отрезок без склейки — #${L.n} ${L.dur.toFixed(2)} с (${fmt(L.start)}), самый короткий — #${[...S].sort((a, b) => a.dur - b.dur)[0].n}`);
console.log('<1 с:', S.filter(s => s.dur < 1).map(s => `#${s.n} ${s.dur.toFixed(2)}`).join(', '));
console.log('1–1.3 с:', S.filter(s => s.dur >= 1 && s.dur < 1.3).map(s => `#${s.n} ${s.dur.toFixed(2)}`).join(', '));
console.log('>8 с:', S.filter(s => s.dur > 8).map(s => `#${s.n} ${s.dur.toFixed(2)}`).join(', '));
console.log('6–8 с:', S.filter(s => s.dur > 6 && s.dur <= 8).map(s => `#${s.n} ${s.dur.toFixed(1)}`).join(', '));
// карточки короче 1.8 с: успевает ли глаз прочитать
console.log('карточки < 1.8 с:', S.filter(s => s.loc === 'T-card' && s.dur < 1.8).map(s => `#${s.n} ${s.dur.toFixed(2)}`).join(', '));
console.log('титры глав:', S.filter(s => s.loc === 'T-title').map(s => `#${s.n} ${s.dur.toFixed(2)}`).join(', '));
// длина против шотлиста
const dev = S.map(s => ({ n: s.n, k: s.dur / s.listDur })).filter(x => x.k > 1.8 || x.k < .55);
console.log('сильно отличаются от шотлиста (×):', dev.map(x => `#${x.n} ×${x.k.toFixed(2)}`).join(', '));
// 4. видео
if (process.argv.includes('--video')) for (const f of ['animatic.mp4', 'animatic_nodebug.mp4']) {
  const p = join(D, 'out', f); if (!existsSync(p)) continue;
  const dur = +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p]).toString().trim();
  const nf = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v', '-count_packets', '-show_entries', 'stream=nb_read_packets', '-of', 'csv=p=0', p]).toString().trim();
  const bd = spawnSync('ffmpeg', ['-v', 'info', '-i', p, '-vf', 'blackdetect=d=0.1:pix_th=0.06', '-an', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 1 << 26 }).stderr.split(/\r?\n/).filter(l => l.includes('black_start'));
  console.log(`${f}: чёрные участки >0.1 с:`, bd.length ? bd.map(l => l.replace(/.*black_start/, 'black_start')).join(' | ') : 'нет');
  const aud = +execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=duration', '-of', 'csv=p=0', p]).toString().trim();
  console.log(`${f}: аудио ${aud.toFixed(2)} с`);
  console.log(`${f}: ${dur.toFixed(2)} с, кадров ${nf} (ожидалось ${Math.round(tm.total * 30)})`);
}
if (bad) console.log('\nПРОБЛЕМ:', bad);
