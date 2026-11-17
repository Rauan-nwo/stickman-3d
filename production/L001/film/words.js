// film/words.js — слова голоса на шкале фильма (animatic/words.json пишет make_timing.mjs из lines json).
// Перетайминг под новый голос: node animatic/make_timing.mjs --lines out/lines_fish.json -> пересборка фильма; здесь ничего не меняется.
// Все времена — секунды фильма (абсолютные). Рот героя двигается только на его собственных словах.
import WJ from '../animatic/words.json';
import { talkMouth } from 'engine';

export const WORDS = WJ.words;
const norm = w => w.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9$%]/g, '');
const BY = {}; for (const w of WORDS) (BY[w.sp] ||= []).push(w);

// говорит ли sp в момент T (pad — захват краёв слова, чтобы рот не щёлкал между словами одной фразы)
export function speaking(sp, T, pad = .06) { const a = BY[sp]; if (!a) return false; for (const w of a) { if (T < w.s - pad) return false; if (T <= w.e + pad) return true; } return false; }
// первое слово re (строка или RegExp) в окне [t0, t1] (секунды фильма) -> время начала или null
export function wordAt(re, t0, t1, sp = null) {
  const k = typeof re === 'string' ? norm(re) : null;
  for (const w of WORDS) { if (w.s < t0 - 1e-3) continue; if (w.s > t1) break; if (sp && w.sp !== sp) continue; if (k ? norm(w.w) === k : re.test(w.w)) return w.s; }
  return null;
}
// интервал реплики sp в окне [t0, t1]: [начало первого слова, конец последнего] или null
export function lineSpan(sp, t0, t1) { const a = (BY[sp] || []).filter(w => w.s >= t0 - .05 && w.s <= t1); return a.length ? [a[0].s, a[a.length - 1].e] : null; }
// рот: липфлап только на своих словах, иначе rest (teeth* -> open: зубы на лонгах не используем)
const TALK = ['open', 'O', 'smile', 'flat', 'open', 'smileS'];
export function mouth(sp, T, rest, seed = 0) {
  if (!sp || !speaking(sp, T)) return rest;
  const m = talkMouth(T, TALK, seed).mouth; return m === 'teeth' || m === 'teethOpen' ? 'open' : m;
}
