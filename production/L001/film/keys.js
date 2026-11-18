// film/keys.js — привязка постановки к плану НЕ по номеру (шотлист перенумеровывают: 341 → 342 → 351 → 352…), а по главе и началу текста,
// который звучит на плане: ключ 'глава|начало текста' — как в колонке «текст» шотлиста, с именем говорящего («HOST: Evening.»).
// byText(table, shots) -> { номер плана: значение } для текущего timing.json. Ключ без плана и ключ на два плана — ошибки (film/check.mjs).
export function matchKey(key, shots) {
  const i = key.indexOf('|'), ch = +key.slice(0, i), pre = key.slice(i + 1);
  return shots.filter(s => s.ch === ch && s.text.startsWith(pre));
}
export function byText(table, shots) {
  const out = {};
  for (const key of Object.keys(table)) { const m = matchKey(key, shots); if (m.length === 1) out[m[0].n] = table[key]; }
  return out;
}
// для проверки: [ключ, сколько планов нашлось]
export const audit = (table, shots) => Object.keys(table).map(k => [k, matchKey(k, shots).map(s => s.n)]);
