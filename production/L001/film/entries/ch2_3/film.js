// film/entries/ch2_3.js — сборка только глав 2, 3: node engine/tools/build.mjs production/L001/film/entries/ch2_3 --out production/L001/film/out/film_ch2_3.html
import { filmDef } from '../../film_core.js';
import { merge } from '../../shots/index.js';
import * as c02 from '../../shots/ch02.js';
import * as c03 from '../../shots/ch03.js';
export default filmDef(merge([c02, c03]));
