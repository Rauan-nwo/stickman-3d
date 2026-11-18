// film/entries/ch7_10.js — сборка только глав 7, 8, 9, 10: node engine/tools/build.mjs production/L001/film/entries/ch7_10 --out production/L001/film/out/film_ch7_10.html
import { filmDef } from '../../film_core.js';
import { merge } from '../../shots/index.js';
import * as c07 from '../../shots/ch07.js';
import * as c08 from '../../shots/ch08.js';
import * as c09 from '../../shots/ch09.js';
import * as c10 from '../../shots/ch10.js';
export default filmDef(merge([c07, c08, c09, c10]));
