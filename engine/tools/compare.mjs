#!/usr/bin/env node
// compare.mjs: эталон против нашего ролика — видео бок о бок, контактный лист, пары кадров в полном размере и метрики.
//
//   node tools/compare.mjs --ref ref.mp4 --ours ours.mp4 --out dir
//        [--frames 111]            сколько кадров сравнивать (по умолчанию — длина нашего ролика)
//        [--ref-skip 0] [--ours-skip 0]   с какого кадра начинать в каждом файле
//        [--pairs 8,24,40]         пары в полном размере: <out>/pair_fNNN.jpg (эталон слева)
//        [--shots "A общий:0-17,A наезд:18-29"]   планы для таблицы яркости и цвета (по умолчанию — весь ролик одним планом)
//        [--mad-size 180x320|full] размер кадров для MAD (full — попиксельно в исходном размере: проверка регрессии)
//        [--no-video] [--no-sheet] [--sheet-fps 6]
// Пишет: compare.mp4, compare_sheet.jpg, pair_fNNN.jpg, metrics.txt, metrics.json.
// MAD — средняя абсолютная разница каналов RGB (0 = кадры совпали, 255 = максимум). SSIM считает ffmpeg.
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { parseArgs, num, ffmpeg, ffmpegInfo, probe, frames, isMain } from './lib.mjs';

const stats = buf => { let r = 0, g = 0, b = 0, sat = 0; const n = buf.length / 3; for (let i = 0; i < buf.length; i += 3) { const R = buf[i], G = buf[i + 1], B = buf[i + 2]; r += R; g += G; b += B; sat += Math.max(R, G, B) - Math.min(R, G, B); } return { r: r / n, g: g / n, b: b / n, y: (.299 * r + .587 * g + .114 * b) / n, sat: sat / n }; };

export async function compare(o) {
  const ref = resolve(o.ref), ours = resolve(o.ours), out = resolve(o.out || 'compare'); mkdirSync(out, { recursive: true });
  const po = probe(ours), pr = probe(ref), rs = num(o['ref-skip'], 0), os = num(o['ours-skip'], 0);
  const N = num(o.frames, Math.min(po.frames - os, pr.frames - rs));
  const full = o['mad-size'] === 'full', [w, h] = full ? [po.video.width, po.video.height] : String(o['mad-size'] || '180x320').split('x').map(Number);
  // ---------- метрики по кадрам ----------
  const A = frames(ref, { w, h, n: N, skip: rs }), B = frames(ours, { w, h, n: N, skip: os });
  const madF = [], sr = [], so = [], dr = [], dO = []; let pa = null, pb = null;
  while (true) {
    const [a, b] = await Promise.all([A.next(), B.next()]); if (a.done || b.done) break;
    let s = 0; const x = a.value, y = b.value; for (let i = 0; i < x.length; i++) { const d = x[i] - y[i]; s += d < 0 ? -d : d; } madF.push(s / x.length);
    sr.push(stats(x)); so.push(stats(y));
    if (pa) { let u = 0, v = 0; for (let i = 0; i < x.length; i++) { const d1 = x[i] - pa[i], d2 = y[i] - pb[i]; u += d1 < 0 ? -d1 : d1; v += d2 < 0 ? -d2 : d2; } dr.push(u / x.length); dO.push(v / x.length); }
    pa = Buffer.from(x); pb = Buffer.from(y);
  }
  const n = madF.length, mean = a => a.reduce((s, v) => s + v, 0) / Math.max(1, a.length);
  const cuts = d => { const med = [...d].sort((a, b) => a - b)[d.length >> 1] || 0; return d.map((x, i) => [i + 1, +x.toFixed(1)]).filter(([, x]) => x > Math.max(18, 3.5 * med)); };
  const shots = o.shots ? String(o.shots).split(',').map(s => { const m = s.match(/^(.*):(\d+)-(\d+)$/); return { name: m[1].trim(), a: +m[2], b: +m[3] }; }) : [{ name: 'весь ролик', a: 0, b: n - 1 }];
  const avg = (arr, a, b, k) => mean(arr.slice(a, b + 1).map(s => s[k]));
  const table = shots.map(s => ({ name: s.name, from: s.a, to: s.b, mad: +mean(madF.slice(s.a, s.b + 1)).toFixed(2), madMax: +Math.max(...madF.slice(s.a, s.b + 1)).toFixed(2),
    ours: { y: +avg(so, s.a, s.b, 'y').toFixed(1), sat: +avg(so, s.a, s.b, 'sat').toFixed(1), rgb: ['r', 'g', 'b'].map(k => Math.round(avg(so, s.a, s.b, k))) },
    ref: { y: +avg(sr, s.a, s.b, 'y').toFixed(1), sat: +avg(sr, s.a, s.b, 'sat').toFixed(1), rgb: ['r', 'g', 'b'].map(k => Math.round(avg(sr, s.a, s.b, k))) } }));
  const tr = (i, k) => `[${i}:v]setpts=PTS-STARTPTS${k ? `,select=gte(n\\,${k}),setpts=N/FRAME_RATE/TB` : ''}`;
  // ---------- SSIM (ffmpeg) ----------
  const ss = ffmpegInfo(['-i', ours, '-i', ref, '-filter_complex', `${tr(0, os)},trim=end_frame=${n},scale=${pr.video.width}:${pr.video.height}[o];${tr(1, rs)},trim=end_frame=${n}[r];[o][r]ssim`, '-frames:v', String(n), '-f', 'null', '-']);
  const sm = ss.match(/SSIM Y:([\d.]+).*?All:([\d.]+)/);
  const worst = madF.indexOf(Math.max(...madF));
  const res = { ref, ours, frames: n, madSize: `${w}x${h}`, mad: { mean: +mean(madF).toFixed(4), max: +Math.max(...madF).toFixed(4), maxFrame: worst, perFrame: madF.map(v => +v.toFixed(3)) }, ssim: sm ? { Y: +sm[1], All: +sm[2] } : null,
    cuts: { ours: cuts(dO), ref: cuts(dr) }, moving: { ours: dO.map((x, i) => (x > 12 ? i + 1 : 0)).filter(Boolean), ref: dr.map((x, i) => (x > 12 ? i + 1 : 0)).filter(Boolean) }, shots: table };
  // ---------- файлы ----------
  if (!o['no-video']) {
    const cmp = join(out, 'compare.mp4');
    ffmpeg(['-i', ref, '-i', ours, '-filter_complex', `${tr(0, rs)},trim=end_frame=${n},scale=${po.video.width}:${po.video.height},setsar=1[a];${tr(1, os)},trim=end_frame=${n},setsar=1[b];[a][b]hstack=2[v]`, '-map', '[v]', ...(po.audio ? ['-map', '1:a', '-c:a', 'aac', '-b:a', '160k'] : []), '-frames:v', String(n), '-c:v', 'libx264', '-crf', '20', '-pix_fmt', 'yuv420p', cmp]);
    if (!o['no-sheet']) { const fps = num(o['sheet-fps'], 6), cnt = Math.ceil(n / po.fps * fps), cols = Math.min(8, Math.max(2, Math.ceil(Math.sqrt(cnt * 1.5)))), rows = Math.ceil(cnt / cols);
      ffmpeg(['-i', cmp, '-vf', `fps=${fps},scale=480:-2,tile=${cols}x${rows}:padding=4:color=black`, '-frames:v', '1', '-q:v', '3', join(out, 'compare_sheet.jpg')]); }
  }
  for (const f of (o.pairs ? String(o.pairs).split(',').map(Number) : [])) {
    ffmpeg(['-i', ref, '-i', ours, '-filter_complex', `[0:v]setpts=PTS-STARTPTS,select=eq(n\\,${f + rs}),scale=${po.video.width}:${po.video.height},setsar=1[a];[1:v]setpts=PTS-STARTPTS,select=eq(n\\,${f + os}),setsar=1[b];[a][b]hstack=2`, '-frames:v', '1', '-q:v', '2', join(out, `pair_f${String(f).padStart(3, '0')}.jpg`)]);
  }
  const L = [];
  L.push(`эталон: ${ref}`, `наш:    ${ours}`, `кадров: ${n}, MAD по кадрам ${w}x${h}`);
  L.push(`MAD: среднее ${res.mad.mean}, максимум ${res.mad.max} (кадр ${worst})`);
  if (res.ssim) L.push(`SSIM: Y ${res.ssim.Y}, All ${res.ssim.All}`);
  L.push(`жёсткие склейки (кадр, разница)  наш: ${JSON.stringify(res.cuts.ours)}  эталон: ${JSON.stringify(res.cuts.ref)}`);
  L.push(`кадры с разницей > 12  наш: ${res.moving.ours.join(' ')}`, `                       эталон: ${res.moving.ref.join(' ')}`);
  L.push('', `${'план'.padEnd(26)} ${'кадры'.padEnd(9)} ${'MAD'.padStart(6)} ${'макс'.padStart(6)} ${'Y наш'.padStart(6)} ${'Y эт.'.padStart(6)} ${'Sat н'.padStart(6)} ${'Sat э'.padStart(6)}  ${'RGB наш'.padEnd(13)} ${'RGB эталон'.padEnd(13)}`);
  for (const s of table) L.push(`${s.name.padEnd(26)} ${`${s.from}-${s.to}`.padEnd(9)} ${String(s.mad).padStart(6)} ${String(s.madMax).padStart(6)} ${String(s.ours.y).padStart(6)} ${String(s.ref.y).padStart(6)} ${String(s.ours.sat).padStart(6)} ${String(s.ref.sat).padStart(6)}  ${s.ours.rgb.join(' ').padEnd(13)} ${s.ref.rgb.join(' ').padEnd(13)}`);
  writeFileSync(join(out, 'metrics.txt'), L.join('\n') + '\n'); writeFileSync(join(out, 'metrics.json'), JSON.stringify(res));
  return { ...res, text: L.join('\n'), out };
}

if (isMain(import.meta.url)) {
  const { opt } = parseArgs();
  if (!opt.ref || !opt.ours) { console.error('usage: node tools/compare.mjs --ref ref.mp4 --ours ours.mp4 --out dir [--frames N] [--ref-skip K] [--pairs 8,24] [--shots "имя:a-b,..."] [--mad-size full]'); process.exit(1); }
  const r = await compare(opt);
  console.log(r.text); console.log(`-> ${r.out}`);
}
