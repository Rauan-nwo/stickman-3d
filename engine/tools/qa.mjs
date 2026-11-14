#!/usr/bin/env node
// qa.mjs: автопроверка финального MP4. Печатает таблицу и завершается с кодом 1, если хоть одна проверка не прошла.
//
//   node tools/qa.mjs final.mp4 [--ass captions.ass]
//     формат        --w 720 --h 1280 --fps 30
//     длительность  --min-dur 58 --max-dur 62            (секунды)
//     громкость     --lufs -14 --lufs-tol 1              (интегральная, LUFS)
//     тишина        --silence-db -40 --silence-min 0.3   (нет участков тише порога дольше N секунд)
//     события       --min-epm 45 --max-epm 60            (зрительных событий в минуту)
//                   --event-thr 9 --event-gap 3 --event-split 45   (порог разницы; склейка соседних всплесков и деление долгого движения, кадры)
//     статика       --max-static 3.6                     (самое длинное окно без события, с)
//     субтитры      --caption-margin 24 --caption-y 845-955   (поля по бокам и допустимая зона по высоте, px)
//
// «Зрительное событие» — всплеск покадровой разницы (склейка, наезд, переброс, резкое действие): кадры уменьшаются до
// 180x320, считается средняя абсолютная разница соседних кадров; кадры выше порога, идущие подряд (с разрывом не больше
// event-gap), — одно событие; непрерывное движение дольше event-split кадров считается по событию на каждые event-split.
// Откалибровано по эталону V001: 59 событий за 61 с = 58 в минуту (ручной счёт — ~56), самое длинное окно без события 3.5 с.
// Субтитры проверяются тем же рендером, что вжигает их в ролик: .ass рисуется libass на чёрном кадре, берётся рамка текста.
import { existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { ENGINE, parseArgs, num, ffmpegInfo, probe, frames, mad, relPath, isMain } from './lib.mjs';
import { loudness } from './assemble.mjs';

// покадровая разница (180x320 RGB) -> события и окна без событий
export async function visualEvents(file, { thr = 9, gap = 3, split = 45 } = {}) {
  const d = []; let prev = null;
  for await (const f of frames(file, { w: 180, h: 320 })) { if (prev) d.push(mad(prev, f)); prev = f; }
  const ev = []; let last = -1e9;
  d.forEach((x, i) => { if (x > thr) { const fr = i + 1; if (fr - last > gap) ev.push({ from: fr, to: fr, peak: x }); else { const e = ev[ev.length - 1]; e.to = fr; e.peak = Math.max(e.peak, x); } last = fr; } });
  for (const e of ev) e.n = Math.max(1, Math.ceil((e.to - e.from + 1) / split));   // долгое непрерывное движение = событие на каждые split кадров
  return { diffs: d, events: ev, count: ev.reduce((s, e) => s + e.n, 0), frames: d.length + 1 };
}
export function captionBoxes(ass, { W = 720, H = 1280, fps = 30, dur }) {
  const s = ffmpegInfo(['-f', 'lavfi', '-i', `color=black:s=${W}x${H}:r=${fps}:d=${dur}`, '-vf', `subtitles=${relPath(ENGINE, resolve(ass))}:fontsdir=fonts,bbox=min_val=24`, '-f', 'null', '-'], { cwd: ENGINE });
  const out = [];
  for (const m of s.matchAll(/n:(\d+)[^\n]*?x1:(\d+) x2:(\d+) y1:(\d+) y2:(\d+)/g)) out.push({ n: +m[1], x1: +m[2], x2: +m[3], y1: +m[4], y2: +m[5] });
  return out;
}

export async function qa(file, o = {}) {
  const p = probe(file), rows = [], add = (name, value, norm, ok) => rows.push({ name, value, norm, ok });
  const W = num(o.w, 720), H = num(o.h, 1280), FPS = num(o.fps, 30), dur = p.frames ? p.frames / p.fps : p.duration;
  add('Формат', `${p.video.width}x${p.video.height} @ ${p.fps} fps, ${p.video.codec_name} ${p.video.pix_fmt}`, `${W}x${H} @ ${FPS}, h264 yuv420p`, p.video.width === W && p.video.height === H && Math.abs(p.fps - FPS) < .01 && p.video.codec_name === 'h264' && p.video.pix_fmt === 'yuv420p');
  const minD = num(o['min-dur'], 58), maxD = num(o['max-dur'], 62);
  add("Длительность", `${dur.toFixed(2)} с${p.frames ? ` (${p.frames} кадров)` : ""}`, `${minD}–${maxD} с`, dur >= minD && dur <= maxD);
  // звук
  const tgt = num(o.lufs, -14), tol = num(o['lufs-tol'], 1);
  if (!p.audio) { add('Громкость', 'нет звуковой дорожки', `${tgt} ±${tol} LUFS`, false); add('Тишина', '—', 'нет', false); }
  else {
    const l = loudness(file);
    add('Громкость', `${l.I} LUFS, пик ${l.TP} dBFS, LRA ${l.LRA}`, `${tgt} ±${tol} LUFS`, Math.abs(l.I - tgt) <= tol);
    const sdb = num(o['silence-db'], -40), smin = num(o['silence-min'], .3);
    const s = ffmpegInfo(['-i', file, '-map', '0:a:0', '-af', `silencedetect=noise=${sdb}dB:d=${smin}`, '-f', 'null', '-']);
    const sil = [...s.matchAll(/silence_start: (-?[\d.]+)/g)].map(m => Math.max(0, +m[1])), durs = [...s.matchAll(/silence_duration: ([\d.]+)/g)].map(m => +m[1]);
    add('Тишина', sil.length ? sil.map((t, i) => `${t.toFixed(2)} с${durs[i] ? ` (${durs[i].toFixed(2)} с)` : ''}`).slice(0, 6).join(', ') + (sil.length > 6 ? ` … всего ${sil.length}` : '') : 'нет', `нет участков < ${sdb} дБ дольше ${smin} с`, sil.length === 0);
  }
  // события и статика
  const thr = num(o['event-thr'], 9), gap = num(o['event-gap'], 3), split = num(o['event-split'], 45);
  const v = await visualEvents(file, { thr, gap, split });
  const epm = v.count / dur * 60, minE = num(o['min-epm'], 45), maxE = num(o['max-epm'], 60);
  add('Зрительные события', `${v.count} за ${dur.toFixed(1)} с = ${epm.toFixed(1)} в минуту`, `${minE}–${maxE} в минуту`, epm >= minE && epm <= maxE);
  const marks = [0, ...v.events.flatMap(e => [e.from, e.to]), v.frames]; let longest = 0, at = 0;
  for (let i = 0; i + 1 < marks.length; i++) if (marks[i + 1] - marks[i] > longest) { longest = marks[i + 1] - marks[i]; at = marks[i]; }
  const maxS = num(o['max-static'], 3.6);
  add('Самое длинное окно без события', `${(longest / p.fps).toFixed(2)} с (с ${(at / p.fps).toFixed(2)} с)`, `≤ ${maxS} с`, longest / p.fps <= maxS);
  let frozen = 0, run = 0; for (const x of v.diffs) { run = x < .02 ? run + 1 : 0; frozen = Math.max(frozen, run); }
  add('Застывшая картинка', `${frozen} кадров подряд без изменений`, `< ${Math.round(p.fps)} кадров`, frozen < p.fps);
  // субтитры
  const ass = o.ass && o.ass !== true ? o.ass : [join(dirname(resolve(file)), 'captions.ass')].find(existsSync);
  if (!ass) add('Субтитры в кадре', 'нет .ass (передайте --ass)', 'в зоне', false);
  else {
    const m = num(o['caption-margin'], 24), [y0, y1] = String(o['caption-y'] || '845-955').split('-').map(Number);
    const bx = captionBoxes(ass, { W, H, fps: FPS, dur }), bad = bx.filter(b => b.x1 < m || b.x2 > W - m || b.y1 < y0 || b.y2 > y1);
    const x1 = Math.min(...bx.map(b => b.x1)), x2 = Math.max(...bx.map(b => b.x2)), ya = Math.min(...bx.map(b => b.y1)), yb = Math.max(...bx.map(b => b.y2));
    add('Субтитры в кадре', bx.length ? `x ${x1}–${x2}, y ${ya}–${yb}, кадров с текстом ${bx.length}${bad.length ? `, вне зоны ${bad.length} (первый — кадр ${bad[0].n})` : ''}` : 'текста нет', `x ${m}–${W - m}, y ${y0}–${y1}`, bx.length > 0 && bad.length === 0);
  }
  return { rows, ok: rows.every(r => r.ok), events: v.events, epm };
}

if (isMain(import.meta.url)) {
  const { pos, opt } = parseArgs();
  if (!pos[0]) { console.error('usage: node tools/qa.mjs final.mp4 [--ass captions.ass] [--min-dur 58 --max-dur 62] [--min-epm 45 --max-epm 60] [--max-static 3.6] ...'); process.exit(2); }
  const r = await qa(resolve(pos[0]), opt);
  const w = [Math.max(...r.rows.map(x => x.name.length)), Math.max(...r.rows.map(x => x.value.length))];
  console.log(`QA ${pos[0]}`);
  for (const x of r.rows) console.log(`  ${x.ok ? 'OK  ' : 'FAIL'}  ${x.name.padEnd(w[0])}  ${x.value.padEnd(w[1])}  норма: ${x.norm}`);
  if (opt.events) console.log('  события (кадры): ' + r.events.map(e => (e.from === e.to ? e.from : `${e.from}-${e.to}`) + (e.n > 1 ? `(x${e.n})` : '')).join(' '));
  console.log(r.ok ? 'QA: всё в норме' : `QA: не прошло проверок: ${r.rows.filter(x => !x.ok).length}`);
  process.exit(r.ok ? 0 : 1);
}
