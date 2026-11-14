#!/usr/bin/env node
// assemble.mjs: сырой рендер + субтитры + голос (+ музыка и шумы с дакингом) -> финальный MP4, −14 LUFS, yuv420p.
//
//   node tools/assemble.mjs --video raw.mp4 --out final.mp4 [--ass captions.ass]
//        [--voice voice.mp3] [--voice-start 0] [--voice-ss 0] [--voice-gain 0]
//        [--music bed.wav] [--music-gain -18] [--duck 10] [--music-start 0]        музыка зациклена на всю длину, под голосом приглушается
//        [--sfx shot.wav@1.94:-3] [--sfx hit.wav@3.12] ...                           шум: файл@секунда[:усиление дБ], можно много
//        [--bed -30]                                                                 синтетический «воздух помещения» (дБ), чтобы не было цифровой тишины
//        [--lufs -14] [--tp -1.5] [--no-loudnorm]
//
// Звук: голос + приглушённая под голос музыка + шумы -> loudnorm в два прохода (замер, затем линейная нормализация) ->
// подмешивается «воздух» -> контрольный замер ebur128 и точная доводка усилением с лимитером.
// Видео: диапазон pc -> tv, субтитры вжигаются libass (шрифты из engine/fonts — путь относительный, без буквы диска).
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { ENGINE, parseArgs, num, ffmpeg, ffmpegInfo, probe, relPath, isMain } from './lib.mjs';

// интегральная громкость и пик (ebur128)
export function loudness(file) {
  const s = ffmpegInfo(['-i', file, '-map', '0:a:0', '-af', 'ebur128=peak=true', '-f', 'null', '-']);
  const tail = s.slice(s.lastIndexOf('Summary:'));
  const I = Number((tail.match(/I:\s+(-?[\d.]+) LUFS/) || [])[1]), LRA = Number((tail.match(/LRA:\s+(-?[\d.]+) LU/) || [])[1]), TP = Number((tail.match(/Peak:\s+(-?[\d.]+) dBFS/) || [])[1]);
  return { I, LRA, TP };
}

export function assemble(o) {
  const video = resolve(o.video), out = resolve(o.out);
  if (!existsSync(video)) throw new Error('нет видео: ' + video);
  const pv = probe(video), dur = pv.frames ? pv.frames / pv.fps : pv.duration;
  const tmp = mkdtempSync(join(tmpdir(), 'asm-'));
  const target = num(o.lufs, -14), tp = num(o.tp, -1.5);
  const report = { duration: +dur.toFixed(3), frames: pv.frames, target };
  try {
    // ---------- 1. сведение: голос + музыка (дакинг) + шумы ----------
    const ins = [], fc = [], mix = [];
    const add = f => { ins.push('-i', resolve(f)); return ins.length / 2 - 1; };
    const SR = 'aresample=48000,aformat=channel_layouts=stereo';
    let voiceLabel = null;
    if (o.voice) {
      if (!existsSync(resolve(o.voice))) throw new Error('нет голоса: ' + o.voice);
      const i = add(o.voice), ss = num(o['voice-ss'], 0), d = Math.round(num(o['voice-start'], 0) * 1000);
      fc.push(`[${i}:a]${ss > 0 ? `atrim=start=${ss},asetpts=PTS-STARTPTS,` : ''}${SR},adelay=${d}|${d},volume=${num(o['voice-gain'], 0)}dB,apad=whole_dur=${dur}[vo]`);
      voiceLabel = 'vo';
    }
    if (o.music) {
      if (!existsSync(resolve(o.music))) throw new Error('нет музыки: ' + o.music);
      const i = add(o.music), d = Math.round(num(o['music-start'], 0) * 1000), duck = num(o.duck, 10);
      fc.push(`[${i}:a]${SR},aloop=loop=-1:size=2000000000,adelay=${d}|${d},atrim=0:${dur},volume=${num(o['music-gain'], -18)}dB[mu]`);
      if (voiceLabel && duck > 0) {                               // музыка приглушается, пока звучит голос
        fc.push(`[vo]asplit=2[vo1][vsc]`, `[mu][vsc]sidechaincompress=threshold=0.02:ratio=${duck}:attack=15:release=350:makeup=1[mud]`);
        voiceLabel = 'vo1'; mix.push('mud');
      } else mix.push('mu');
    }
    if (voiceLabel) mix.unshift(voiceLabel);
    for (const [k, spec] of (o.sfx || []).entries()) {
      const m = String(spec).match(/^(.*)@([\d.]+)(?::(-?[\d.]+))?$/); if (!m) throw new Error(`--sfx: нужен вид файл@секунда[:дБ], получено '${spec}'`);
      const sf = process.platform === 'win32' ? m[1].replace(/^\/([a-zA-Z])\//, '$1:/') : m[1];   // Git Bash не переводит путь внутри «файл@время»
      if (!existsSync(resolve(sf))) throw new Error('нет шума: ' + sf);
      const i = add(sf), d = Math.round(Number(m[2]) * 1000);
      fc.push(`[${i}:a]${SR},adelay=${d}|${d},volume=${m[3] ?? 0}dB[sfx${k}]`); mix.push(`sfx${k}`);
    }
    const mixWav = join(tmp, 'mix.wav'); let cur = null;
    if (mix.length) {
      fc.push(`${mix.map(l => `[${l}]`).join('')}amix=inputs=${mix.length}:normalize=0:duration=longest,atrim=0:${dur},apad=whole_dur=${dur}[a]`);
      ffmpeg([...ins, '-filter_complex', fc.join(';'), '-map', '[a]', '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s24le', mixWav]);
      cur = mixWav; report.mix = loudness(cur);
      // ---------- 2. loudnorm в два прохода ----------
      if (!o['no-loudnorm']) {
        const ln = `loudnorm=I=${target}:TP=${tp}:LRA=11`;
        const s = ffmpegInfo(['-i', cur, '-af', ln + ':print_format=json', '-f', 'null', '-']);
        const j = JSON.parse(s.slice(s.lastIndexOf('{'), s.lastIndexOf('}') + 1));
        report.pass1 = { I: +j.input_i, TP: +j.input_tp, LRA: +j.input_lra };
        if (isFinite(+j.input_i) && isFinite(+j.input_thresh)) {   // слишком короткий или пустой звук измерить нельзя — тогда только доводка усилением
          const norm = join(tmp, 'norm.wav');
          ffmpeg(['-i', cur, '-af', `${ln}:measured_I=${j.input_i}:measured_TP=${j.input_tp}:measured_LRA=${j.input_lra}:measured_thresh=${j.input_thresh}:offset=${j.target_offset}:linear=true`, '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s24le', norm]);
          cur = norm;
        }
      }
    }
    // ---------- 3. «воздух помещения»: тихий коричневый шум, чтобы в паузах не было цифровой тишины ----------
    if (o.bed !== undefined && o.bed !== false) {
      const g = num(o.bed, -30), bed = join(tmp, 'bed.wav'), withBed = join(tmp, 'bed_mix.wav');
      ffmpeg(['-f', 'lavfi', '-i', `anoisesrc=color=brown:seed=7:sample_rate=48000:duration=${dur}:amplitude=1`, '-af', `highpass=f=50,lowpass=f=1800,tremolo=f=.13:d=.25,aformat=channel_layouts=stereo,volume=${g + 12}dB`, '-c:a', 'pcm_s24le', bed]);
      if (cur) { ffmpeg(['-i', cur, '-i', bed, '-filter_complex', `[0:a][1:a]amix=inputs=2:normalize=0:duration=first[a]`, '-map', '[a]', '-c:a', 'pcm_s24le', withBed]); cur = withBed; } else cur = bed;
    }
    // ---------- 4. контроль и доводка: точное усиление + лимитер ----------
    if (cur && !o['no-loudnorm'] && mix.length) {
      for (let k = 0; k < 3; k++) {
        const m = loudness(cur); report.final = m;
        const diff = target - m.I;
        if (!isFinite(m.I) || (Math.abs(diff) <= .3 && m.TP <= tp + .3)) break;
        const fix = join(tmp, `fix${k}.wav`);
        ffmpeg(['-i', cur, '-af', `volume=${diff.toFixed(2)}dB,alimiter=limit=${Math.pow(10, tp / 20).toFixed(3)}:level=disabled:attack=3:release=60`, '-ar', '48000', '-c:a', 'pcm_s24le', fix]);
        cur = fix;
      }
      report.final = loudness(cur);
    } else if (cur) report.final = loudness(cur);
    // ---------- 5. видео: диапазон, субтитры, сборка ----------
    const vf = [];
    if (pv.video.color_range === 'pc' || /^yuvj/.test(pv.video.pix_fmt)) vf.push('scale=in_range=pc:out_range=tv');
    if (o.ass) { if (!existsSync(resolve(o.ass))) throw new Error('нет субтитров: ' + o.ass); vf.push(`subtitles=${relPath(ENGINE, resolve(o.ass))}:fontsdir=fonts`); }
    vf.push('format=yuv420p');
    const a = ['-i', video];
    if (cur) a.push('-i', cur);
    a.push('-filter_complex', `[0:v]${vf.join(',')}[v]`, '-map', '[v]');
    if (cur) a.push('-map', '1:a', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000');
    a.push('-c:v', 'libx264', '-crf', String(num(o.crf, 18)), '-pix_fmt', 'yuv420p', '-t', dur.toFixed(4), '-movflags', '+faststart', out);
    ffmpeg(a, { cwd: ENGINE });
    report.out = out; report.audio = !!cur;
    return report;
  } finally { rmSync(tmp, { recursive: true, force: true }); }
}

if (isMain(import.meta.url)) {
  const { opt } = parseArgs(process.argv.slice(2), ['sfx']);
  if (!opt.video || !opt.out) { console.error('usage: node tools/assemble.mjs --video raw.mp4 --out final.mp4 [--ass captions.ass] [--voice voice.mp3] [--music m.wav --music-gain -18 --duck 10] [--sfx f.wav@1.9:-3] [--bed -30] [--lufs -14]'); process.exit(1); }
  const r = assemble(opt);
  const f = r.final;
  console.log(`assemble: ${r.out}  ${r.duration} с, ${r.frames} кадров` + (f ? `, громкость ${f.I} LUFS (цель ${r.target}), пик ${f.TP} dBFS, LRA ${f.LRA}` : ', БЕЗ ЗВУКА'));
}
