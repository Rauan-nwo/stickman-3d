// perf.mjs: мс на кадр в сценах с толпой.  node engine/films/army-test/perf.mjs  (после build.mjs)
import { chromium } from '../../node_modules/playwright-core/index.mjs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
const html = resolve(dirname(fileURLToPath(import.meta.url)), '../../out/army-test/film.html');
let b; try { b = await chromium.launch({ channel: 'chrome' }); } catch { b = await chromium.launch(); }
for (const n of [200, 1000, 2000]) {
  const p = await b.newPage(); await p.goto(pathToFileURL(html).href + `?render&red=${n}`);
  const r = await p.evaluate(() => {
    const out = {}, c = document.querySelector('canvas'), x = c.getContext('2d');
    for (const [name, a, z] of [['front', 0, 75], ['side', 75, 129], ['top', 129, 168], ['back', 168, 210]]) {
      for (let f = a; f < a + 3; f++) window.draw(f);
      let drawn = 0, near = 0; const t0 = performance.now();
      for (let f = a; f < z; f++) { window.draw(f); x.getImageData(0, 0, 1, 1); const s = window.__film.built.crowds.red.stats; drawn += s.drawn; near += s.near; }   // getImageData ждёт видеокарту
      out[name] = { ms: +((performance.now() - t0) / (z - a)).toFixed(1), drawn: Math.round(drawn / (z - a)), near: Math.round(near / (z - a)) };
    }
    return out;
  });
  console.log(`red=${n}:`, JSON.stringify(r)); await p.close();
}
await b.close();
