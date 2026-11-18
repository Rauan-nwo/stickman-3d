// film/entries/ch7_10.js — сборка только глав 7, 8, 9, 10: node engine/tools/build.mjs production/L001/film/entries/ch7_10
// merge() — копия shots/index.js без импорта index.js: иначе в сборку попадали ВСЕ главы (170 МБ, страница не успевала загрузиться за 30 с).
import { filmDef } from '../../film_core.js';
import { RAIN_DEFAULT } from '../../shots/common.js';
import * as c07 from '../../shots/ch07.js';
import * as c08 from '../../shots/ch08.js';
import * as c09 from '../../shots/ch09.js';
import * as c10 from '../../shots/ch10.js';
function merge(mods) {
  const SHOTS = {}, OVER = {}, SKIP_PROPS = {}, rains = mods.map(m => m.RAIN).filter(Boolean);
  for (const m of mods) { Object.assign(SHOTS, m.SHOTS); Object.assign(OVER, m.OVER); Object.assign(SKIP_PROPS, m.SKIP_PROPS); }
  const RAIN = s => { for (const r of rains) { const v = r(s); if (v !== undefined) return v; } return RAIN_DEFAULT(s); };
  return { SHOTS, OVER, SKIP_PROPS, RAIN };
}
export default filmDef(merge([c07, c08, c09, c10]));
