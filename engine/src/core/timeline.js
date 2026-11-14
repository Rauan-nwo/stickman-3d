// timeline.js: привязка картинки к СЛОВАМ озвучки. Время берётся из words.json (tools/voice.py), а не ставится руками:
// при смене голоса или темпа постановка сдвигается сама.
//
//   const tl = timeline(words, { fps: 30 });
//   tl.cue('1:shotgun')      -> номер кадра, где начинается слово «shotgun» в строке 1 narration.txt
//   tl.t('2:gold#2')         -> то же в секундах; #2 — второе вхождение слова в строке
//   tl.t('gold')             -> первое «gold» во всём тексте;  tl.t('3')  -> начало строки 3;  tl.t('3:$') -> конец строки 3
//   tl.end('1:mine')         -> конец слова;  tl.line(2) -> { from, to, words }
//   tl.speaking(t, { line }) -> идёт ли сейчас слово (для липфлапа);  tl.wordAt(t) -> текущее слово или null
const norm = s => String(s).toLowerCase().replace(/[^a-z0-9а-яё']/gi, '');

export function timeline(words, { fps = 30 } = {}) {
  const W = (Array.isArray(words) ? words : (words && words.words) || []).map((w, i) => ({ ...w, i, line: w.line ?? 1, key: norm(w.word) }));
  const lines = [...new Set(W.map(w => w.line))];
  const inLine = n => W.filter(w => w.line === n);
  function find(spec) {
    const s = String(spec).trim(), m = s.match(/^(\d+)(?::(.*))?$/);
    let pool = W, word = s;
    if (m) { pool = inLine(+m[1]); word = m[2] ?? '^'; if (!pool.length) throw new Error(`timeline: в words.json нет строки ${m[1]} (метка '${spec}')`); }
    if (word === '^') return pool[0];
    if (word === '$') return pool[pool.length - 1];
    const [name, nth] = word.split('#'), hits = pool.filter(w => w.key === norm(name)), hit = hits[(+nth || 1) - 1];
    if (!hit) throw new Error(`timeline: метка '${spec}' не найдена. Слова${m ? ' строки ' + m[1] : ''}: ${pool.map(w => w.word).join(' ')}`);
    return hit;
  }
  const t = (spec, off = 0) => (spec === '$' ? duration : find(spec).start) + off;
  const duration = W.length ? W[W.length - 1].end : 0;
  return {
    words: W, lines, fps, duration, find, t,
    cue: (spec, off = 0) => Math.round(t(spec, off) * fps),
    end: (spec, off = 0) => (String(spec).match(/^\d+$/) ? find(spec + ':$') : find(spec)).end + off,
    line(n) { const p = inLine(n); if (!p.length) throw new Error(`timeline: нет строки ${n}`); return { from: p[0].start, to: p[p.length - 1].end, words: p }; },
    wordAt(time, { line } = {}) { for (const w of W) if ((line == null || w.line === line) && time >= w.start && time < w.end) return w; return null; },
    // pad растягивает «окно речи» (с): рот открывается чуть раньше слова и не захлопывается в микропаузах
    speaking(time, { line, pad = .03, gap = .12 } = {}) {
      const p = line == null ? W : inLine(line);
      for (let k = 0; k < p.length; k++) {
        const a = p[k].start - pad, n = p[k + 1], b = n && n.start - p[k].end < gap ? n.start : p[k].end + pad;
        if (time >= a && time < b) return true;
      }
      return false;
    },
  };
}
