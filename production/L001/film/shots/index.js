// film/shots/index.js — все главы: объединение таблиц постановки (ключи глав не пересекаются: префикс главы).
import * as c00 from './ch00.js';
import * as c01 from './ch01.js';
import * as c02 from './ch02.js';
import * as c03 from './ch03.js';
import * as c04 from './ch04.js';
import * as c05 from './ch05.js';
import * as c06 from './ch06.js';
import * as c07 from './ch07.js';
import * as c08 from './ch08.js';
import * as c09 from './ch09.js';
import * as c10 from './ch10.js';
import { RAIN_DEFAULT } from './common.js';
export const CHAPTERS = [c00, c01, c02, c03, c04, c05, c06, c07, c08, c09, c10];
export function merge(mods) {
  const SHOTS = {}, OVER = {}, SKIP_PROPS = {}, rains = mods.map(m => m.RAIN).filter(Boolean);
  for (const m of mods) { Object.assign(SHOTS, m.SHOTS); Object.assign(OVER, m.OVER); Object.assign(SKIP_PROPS, m.SKIP_PROPS); }
  const RAIN = s => { for (const r of rains) { const v = r(s); if (v !== undefined) return v; } return RAIN_DEFAULT(s); };
  return { SHOTS, OVER, SKIP_PROPS, RAIN };
}
export const ALL = merge(CHAPTERS);
