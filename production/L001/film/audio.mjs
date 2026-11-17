// film/audio.mjs — звук финала (общий для render.mjs и final.mjs), всё считается из timing.json / words.json:
//   voiceTrack — голос + тишина в точках timing.inserts, вырезка [T0, T1];
//   mixFinal   — голос + тихая подложка (дождь в Сингапуре: ресторан, улица, салон; тон комнаты в кабинете и остальных местах)
//                + «удар» под название ролика (низкий бум + короткий нарастающий шум), спад звука в конце;
//                цифровой тишины нет нигде (подложка всегда ≥ −50 dBFS). Полный проход музыки и шумов — позже, отдельно.
//   pilotEnd   — конец экспорта по границе фразы: последнее слово последнего плана + 0.6 с хвоста (не дальше конца главы).
import { execFileSync } from 'node:child_process';

export function voiceTrack(timing, voice, T0, T1, out) {
  const f = [], lbl = []; let prev = 0;
  timing.inserts.forEach((x, i) => { f.push(`[0:a]atrim=${prev}:${x.at},asetpts=PTS-STARTPTS[v${i}]`, `aevalsrc=0:d=${x.dur}:s=48000[s${i}]`); lbl.push(`[v${i}]`, `[s${i}]`); prev = x.at; });
  f.push(`[0:a]atrim=start=${prev},asetpts=PTS-STARTPTS[vl]`); lbl.push('[vl]');
  const norm = lbl.map((l, i) => `${l}aresample=48000,aformat=channel_layouts=mono[n${i}]`);   // голос и тишина к одним параметрам до склейки
  f.push(...norm, `${lbl.map((_, i) => `[n${i}]`).join('')}concat=n=${lbl.length}:v=0:a=1,apad,atrim=${T0}:${T1},asetpts=PTS-STARTPTS[out]`);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', voice, '-filter_complex', f.join(';'), '-map', '[out]', '-ac', '1', out]);
  return out;
}
// голос по умолчанию — тот, по которому сделан тайминг (words.json.lines)
export const defaultVoice = linesFile => (/fish/.test(linesFile || '') ? 'out/voice_fish_en.mp3' : 'out/voice_draft.mp3');

// конец экспорта главы (секунды фильма): конец последнего слова, начатого до конца главы, + tail; не дальше конца главы
export function pilotEnd(shots, words, tail = .6) {
  const last = shots[shots.length - 1], chEnd = last.end;
  const w = words.filter(x => x.s < chEnd - .05 && x.s >= shots[0].start);
  return Math.min(chEnd, (w.length ? Math.max(...w.map(x => x.e)) : chEnd) + tail);
}

// подложка по месту действия: [имя, усиление дБ] — дождь в Сингапуре громче на улице, глуше в зале; тон комнаты везде остальном
const BED = s => s.loc === 'L02-sg-street' ? (/общий/.test(s.framing) ? ['rain', -30] : ['rain', -37])
  : s.loc === 'L01-restaurant' || (s.loc === 'T-desk' && /ресторан/.test(s.framing)) ? ['rain', -41]
  : s.ch === 0 ? ['rain', -43] : ['room', -44];
const lin = db => Math.pow(10, db / 20).toFixed(5);

// голос (wav) + подложка + удар под название -> out (wav 48 кГц моно); T0, T1 — секунды фильма; fadeOut — спад в конце (с)
export function mixFinal({ timing, shots, voiceWav, T0, T1, out, fadeOut = .4 }) {
  const D = (T1 - T0).toFixed(3), rel = t => Math.max(0, t - T0);
  // громкость подложек по времени: кусочно по планам (смена — на склейке, с коротким сглаживанием через lowpass на огибающей нет нужды)
  const piece = kind => shots.map(s => { const [k, db] = BED(s); return k === kind ? `between(t,${rel(s.start).toFixed(3)},${rel(s.end).toFixed(3)})*${lin(db)}` : null; }).filter(Boolean).join('+') || '0';
  // название ролика: встаёт за 1.75 с до конца плана «… + титр ролика» (core.js videoTitle) — бум на появлении, шум-нарастание до него
  const tShot = shots.find(s => /титр ролика/.test(s.framing)), stings = [];
  if (tShot) { const tb = rel(tShot.end - 1.75); stings.push({ boom: tb, riserFrom: Math.max(0, tb - .55) }); }
  const f = [
    `anoisesrc=d=${D}:c=pink:r=48000:a=0.5:s=7,highpass=f=450,lowpass=f=6500,volume=18,volume='${piece('rain')}':eval=frame[rain]`,
    `anoisesrc=d=${D}:c=brown:r=48000:a=0.5:s=11,highpass=f=35,lowpass=f=260,volume=16,volume='${piece('room')}':eval=frame[room]`,
  ];
  const mix = ['[0:a]', '[rain]', '[room]'];
  stings.forEach((g, i) => {
    f.push(`aevalsrc='0.25*sin(2*PI*(38+46*exp(-7*t))*t)*exp(-1.6*t)':s=48000:d=2.4,adelay=${Math.round(g.boom * 1000)}:all=1[boom${i}]`);
    f.push(`anoisesrc=d=0.6:c=white:r=48000:a=0.5:s=5,highpass=f=1800,afade=t=in:d=0.55:curve=exp,afade=t=out:st=0.52:d=0.08,volume=0.08,adelay=${Math.round(g.riserFrom * 1000)}:all=1[ris${i}]`);
    mix.push(`[boom${i}]`, `[ris${i}]`);
  });
  f.push(`${mix.join('')}amix=inputs=${mix.length}:normalize=0:duration=first,afade=t=out:st=${(T1 - T0 - fadeOut).toFixed(3)}:d=${fadeOut},alimiter=limit=0.95[out]`);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', voiceWav, '-filter_complex', f.join(';'), '-map', '[out]', '-ac', '1', '-ar', '48000', out]);
  return out;
}
