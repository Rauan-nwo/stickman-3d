// sheet.js: контактные листы персонажей (tools/charsheet.mjs). Чистый 2D, без three.js:
//   charSheet(canvas)          — все пресеты x все эмоции + все формы рта
//   talkStrip(canvas, words)   — покадровая лента: рот героя следует таймкодам слов; возвращает сводку проверки
import { PRESETS } from './presets.js';
import { EMOTIONS, BIG_MOUTHS, SMALL_MOUTHS, feel, talk, TALK_SET, blinkAt } from './stickman.js';
import { timeline } from '../core/timeline.js';

const BG = '#7b5d44', BG2 = '#6a4e39', INK = '#fff';
const label = (x, s, px, py, size = 22, col = INK, align = 'left') => { x.font = `700 ${size}px Montserrat, Arial, sans-serif`; x.textAlign = align; x.textBaseline = 'alphabetic'; x.lineWidth = 5; x.strokeStyle = 'rgba(20,10,6,.85)'; x.strokeText(s, px, py); x.fillStyle = col; x.fillText(s, px, py); };
// фигура целиком в ячейке: ступни на нижней линии. Сидящий напарник рисуется стоя.
function figure(x, ch, pose, cx, ground, k) {
  const S = ch.spec, pin = S.pins.feet || [0, 0];
  x.save(); x.translate(cx, ground); x.scale(k, k); x.translate(-pin[0], -pin[1]); ch.draw(x, { stance: 'stand', ...pose }); x.restore();
}
// только голова, центр головы в (cx, cy)
function head(x, ch, pose, cx, cy, k, w, h) {
  const S = ch.spec;
  x.save(); x.beginPath(); x.rect(cx - w / 2, cy - h / 2, w, h); x.clip();
  x.translate(cx, cy); x.scale(k, k); x.translate(-S.head.x, -S.head.y + S.head.ry * .25); ch.draw(x, { stance: 'stand', ...pose }); x.restore();
}

export function charSheet(canvas) {
  const names = Object.keys(PRESETS), chars = names.map(n => PRESETS[n]());
  const CW = 330, CH = 520, LEFT = 150, TOP = 70, MW = 220, MH = 250;
  const cols = EMOTIONS.length, mouthRows = 2;
  const W = LEFT + cols * CW + 20, H = TOP + names.length * CH + 60 + mouthRows * (MH + 34) + 30;
  canvas.width = W; canvas.height = H; const x = canvas.getContext('2d');
  x.fillStyle = BG; x.fillRect(0, 0, W, H);
  EMOTIONS.forEach((e, i) => label(x, e, LEFT + i * CW + CW / 2, 46, 30, '#FFE9B8', 'center'));
  chars.forEach((ch, r) => {
    const y0 = TOP + r * CH;
    x.fillStyle = r % 2 ? BG2 : BG; x.fillRect(0, y0, W, CH);
    label(x, names[r], 16, y0 + 40, 28, '#FFE9B8');
    const tall = ch.spec.name === 'buddy' ? 560 : 1060, k = (CH - 70) / tall;
    EMOTIONS.forEach((e, i) => {
      const t = { laugh: .29, nervous: .2, talk: .22, wink: .3 }[e] ?? .4;       // показательный момент каждой эмоции
      figure(x, ch, feel(e, t), LEFT + i * CW + CW / 2, y0 + CH - 22, k);
    });
  });
  // все формы рта: большие — на богаче и эксперте, маленькие — на шахтёре и напарнике
  let y = TOP + names.length * CH + 44;
  label(x, 'рты: большие (речь, смех, оскал)', 16, y - 8, 26, '#FFE9B8');
  BIG_MOUTHS.forEach((m, i) => { const cx = 20 + i * (MW + 6) + MW / 2, ch = chars[i % 2 ? 3 : 2]; x.fillStyle = BG2; x.fillRect(cx - MW / 2, y, MW, MH); head(x, ch, { eyes: 'rest', mouth: m, brows: [4, 0] }, cx, y + MH / 2, .62, MW, MH); label(x, m, cx, y + MH - 10, 22, INK, 'center'); });
  y += MH + 44;
  label(x, 'рты: маленькие (спокойное лицо, общий план)', 16, y - 8, 26, '#FFE9B8');
  SMALL_MOUTHS.forEach((m, i) => { const cx = 20 + i * (MW + 6) + MW / 2, ch = chars[m === 'chew' ? 1 : i % 2 ? 1 : 0]; x.fillStyle = BG2; x.fillRect(cx - MW / 2, y, MW, MH); head(x, ch, { eyes: 'rest', mouth: m, chew: .6 }, cx, y + MH / 2, ch.spec.name === 'buddy' ? .9 : .62, MW, MH); label(x, m, cx, y + MH - 10, 22, INK, 'center'); });
  return { width: W, height: H, presets: names, emotions: EMOTIONS, mouths: [...BIG_MOUTHS, ...SMALL_MOUTHS] };
}

// лента: по кадру на ячейку; зелёная полоса — идёт слово (подпись — само слово), серая — пауза
export function talkStrip(canvas, words, { fps = 30, preset = 'richGuy', tail = .5, cols = 15 } = {}) {
  const tl = timeline(words, { fps }), ch = PRESETS[preset](), N = Math.ceil((tl.duration + tail) * fps);
  const CW = 150, CH = 190, rows = Math.ceil(N / cols), W = cols * CW, H = rows * CH + 50;
  canvas.width = W; canvas.height = H; const x = canvas.getContext('2d');
  x.fillStyle = BG; x.fillRect(0, 0, W, H);
  label(x, `липфлап по words.json: ${preset}, ${N} кадров @ ${fps} fps; зелёное — звучит слово, рот меняется каждые 3–4 кадра; в паузе рот закрыт`, 10, 30, 20, '#FFE9B8');
  const seq = [];
  for (let f = 0; f < N; f++) {
    const t = f / fps, sp = talk(t, tl, { rest: 'flat', seed: 3, fps }), w = tl.wordAt(t), cx = (f % cols) * CW + CW / 2, y0 = 50 + Math.floor(f / cols) * CH;
    seq.push({ f, speaking: sp.speaking, mouth: sp.mouth, word: w ? w.word : null });
    x.fillStyle = sp.speaking ? '#3f7a3a' : '#5a5148'; x.fillRect(cx - CW / 2 + 2, y0 + 2, CW - 4, CH - 4);
    head(x, ch, { eyes: 'rest', mouth: sp.mouth, brows: [sp.speaking ? 4 : 0, 0], blink: blinkAt(t, 2, fps) }, cx, y0 + CH / 2 - 12, .42, CW - 4, CH - 30);
    label(x, String(f), cx - CW / 2 + 8, y0 + 22, 16); if (w) label(x, w.text || w.word, cx, y0 + CH - 10, 18, '#FFF', 'center');
  }
  // проверка: в паузах рот покоя; в речи — формы из набора, каждая держится 3–4 кадра (обрезается границей слова)
  const bad = seq.filter(s => (s.speaking ? !TALK_SET.includes(s.mouth) : s.mouth !== 'flat')).length;
  const runs = []; let run = 0;
  for (let i = 0; i < seq.length; i++) { if (!seq[i].speaking) { run = 0; continue; } run++; const nx = seq[i + 1]; if (!nx || !nx.speaking || nx.mouth !== seq[i].mouth) { runs.push({ len: run, cut: !nx || !nx.speaking }); run = 0; } }
  const full = runs.filter(r => !r.cut && r.len >= 3), longest = Math.max(0, ...runs.map(r => r.len));
  return { frames: N, speakingFrames: seq.filter(s => s.speaking).length, wrongMouthFrames: bad, mouthSwaps: runs.length, holdFrames: { min: Math.min(...full.map(r => r.len)), max: longest }, words: tl.words.length };
}
