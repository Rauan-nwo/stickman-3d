// film/entries/ch4_6.js — сборка только глав 4, 5, 6: node engine/tools/build.mjs production/L001/film/entries/ch4_6 --out production/L001/film/out/film_ch4_6.html
import { filmDef } from '../../film_core.js';
import { merge } from '../../shots/index.js';
import * as c04 from '../../shots/ch04.js';
import * as c05 from '../../shots/ch05.js';
import * as c06 from '../../shots/ch06.js';
export default filmDef(merge([c04, c05, c06]));
