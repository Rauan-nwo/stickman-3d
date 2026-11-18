// film/clips3d/ch02.js — 3D-планы гл. 2 с нативной сценой (владелец: ведущий); формат записи — film/clips3d.js.
// Без импортов: этот файл читает и node (final.mjs).
// setFn({ words, t0 }) — параметры сцены из голоса (final.mjs): t0 — начало дубля на шкале фильма, с.
// Кухня: якоря перетайминга — слова «changed», «An», «Nvidia's», «one» (tiny job), «at» (exactly), «moment» (scenes/kitchen sh()).
const kitchenAt = ({ words, t0 }) => {
  const seq = ['changed', 'An', "Nvidia's", 'one', 'at', 'moment'];
  let i = words.findIndex(w => w.s >= t0 - .05); const out = [];
  for (const k of seq) { while (i < words.length && words[i].w.replace(/[^\w']/g, '') !== k) i++; if (i >= words.length) throw new Error('кухня: нет слова ' + k); out.push((words[i].s - t0).toFixed(3)); i++; }
  return { at: out.join(',') };
};
const KITCHEN = { scene: 'kitchen', set: {}, group: 'kitchen', setFn: kitchenAt };   // один дубль на три плана: монитор -> один повар -> кухня
export default {
  '2|The chip was a hit': { scene: 'box_path', set: {}, from: 0 },                    // склад (3D-версия пути коробки): стеллажи, погрузчик увозит коробку — не повтор кадров #11 (box_path_v2)
  '2|And the trick inside it changed': KITCHEN,
  '2|An ordinary processor is like one': KITCHEN,
  "2|Nvidia's chip is like a kitchen": KITCHEN,
  '2|ChatGPT itself was trained': { scene: 'dc_inspection', set: { shot: '180', torch: '0' }, dur: true, from: 0 },   // двери DATA HALL -> ряды стоек (без фонаря)
  '2|In October 2025, Nvidia became the first': { scene: 'city', set: { shot: 'towers', one: '1' }, dur: true, from: 0 },   // город башен: зелёная башня Nvidia — первая, «#1» на короне ($5T — подпись ядра)
};
