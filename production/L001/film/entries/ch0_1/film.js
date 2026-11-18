// film/entries/ch0_1.js — сборка только глав 0, 1: node engine/tools/build.mjs production/L001/film/entries/ch0_1 --out production/L001/film/out/film_ch0_1.html
import { filmDef } from '../../film_core.js';
import { merge } from '../../shots/index.js';
import * as c00 from '../../shots/ch00.js';
import * as c01 from '../../shots/ch01.js';
export default filmDef(merge([c00, c01]));
