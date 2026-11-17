// film/audio.mjs — дорожка голоса на шкале фильма: голос + тишина в точках timing.inserts, вырезка [T0, T1] (общая для render.mjs и final.mjs)
import { execFileSync } from 'node:child_process';

export function voiceTrack(timing, voice, T0, T1, out) {
  const f = [], lbl = []; let prev = 0;
  timing.inserts.forEach((x, i) => { f.push(`[0:a]atrim=${prev}:${x.at},asetpts=PTS-STARTPTS[v${i}]`, `aevalsrc=0:d=${x.dur}:s=48000[s${i}]`); lbl.push(`[v${i}]`, `[s${i}]`); prev = x.at; });
  f.push(`[0:a]atrim=start=${prev},asetpts=PTS-STARTPTS[vl]`); lbl.push('[vl]');
  // все куски — к 48 кГц моно до склейки (у голоса и тишины должны совпадать параметры)
  const norm = lbl.map((l, i) => `${l}aresample=48000,aformat=channel_layouts=mono[n${i}]`);
  f.push(...norm, `${lbl.map((_, i) => `[n${i}]`).join('')}concat=n=${lbl.length}:v=0:a=1,apad,atrim=${T0}:${T1},asetpts=PTS-STARTPTS[out]`);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', voice, '-filter_complex', f.join(';'), '-map', '[out]', '-ac', '1', out]);
  return out;
}
// голос по умолчанию — тот, по которому сделан тайминг (words.json.lines)
export const defaultVoice = linesFile => (/fish/.test(linesFile || '') ? 'out/voice_fish_en.mp3' : 'out/voice_draft.mp3');
