#!/usr/bin/env node
// arms_compare.mjs: руки «резиновые» (hose, шортсы) против рук с локтем (elbow, лонги) в одних и тех же позах
// + лента 12 кадров жеста (elbow, помощники arms.js). -> out/arms_compare.jpg
//   node production/longform/style-test/arms_compare.mjs
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
const HERE = dirname(fileURLToPath(import.meta.url)), ENGINE = join(HERE, '..', '..', '..', 'engine'), OUT = join(HERE, 'out');
mkdirSync(OUT, { recursive: true });
const req = createRequire(join(ENGINE, 'package.json')), { chromium } = req('playwright-core'), { build } = req('esbuild');
const src = `
import { moneyman, jensen } from './src/chars/presetsLong.js';
import { gait } from './src/chars/gaits.js';
import { feel } from './src/chars/stickman.js';
import { restHand, shoulder, arcHand, gesture } from './src/chars/arms.js';
const glass = (x, p) => { x.save(); x.translate(p[0], p[1]); x.lineWidth = 4; x.strokeStyle = '#1C1418'; x.fillStyle = 'rgba(200,225,240,.35)';
  x.beginPath(); x.moveTo(-26, -150); x.quadraticCurveTo(-30, -80, 0, -70); x.quadraticCurveTo(30, -80, 26, -150); x.closePath(); x.fill(); x.stroke();
  x.fillStyle = 'rgba(150,20,40,.8)'; x.beginPath(); x.moveTo(-24, -120); x.quadraticCurveTo(-22, -82, 0, -76); x.quadraticCurveTo(22, -82, 24, -120); x.closePath(); x.fill();
  x.beginPath(); x.moveTo(0, -70); x.lineTo(0, 16); x.moveTo(-22, 18); x.lineTo(22, 18); x.stroke(); x.restore(); };
window.sheet = (c) => {
  const W = 2400, H = 2380; c.width = W; c.height = H; const x = c.getContext('2d');
  x.fillStyle = '#6A7286'; x.fillRect(0, 0, W, H);
  const label = (s, px, py, size = 30, col = '#F2D27A', al = 'center') => { x.font = '700 ' + size + 'px Montserrat, Arial'; x.textAlign = al; x.lineWidth = 5; x.strokeStyle = 'rgba(0,0,0,.8)'; x.strokeText(s, px, py); x.fillStyle = col; x.fillText(s, px, py); };
  const H1 = moneyman({}), E1 = moneyman({}); H1.spec.armStyle = 'hose';
  const S = E1.spec, R = [restHand(S, -1), restHand(S, 1)];
  const poses = [
    ['покой', { hL: null }, R],
    ['тянется к столу', { table: true }, [R[0], [215, -440]]],
    ['жест вверх', {}, [R[0], [255, -690]]],
    ['держит бокал', { glass: [70, -470] }, [R[0], [70, -470]]],
  ];
  const k = .5, cw = W / 4;
  label('резиновые руки (hose) — шортсы', 20, 50, 34, '#F2D27A', 'left'); label('руки с локтем (elbow) — лонги', 20, 650, 34, '#9FE0B0', 'left');
  poses.forEach(([name, o, hands], i) => {
    for (const [row, ch] of [[0, H1], [1, E1]]) {
      const cx = i * cw + cw / 2, gy = 590 + row * 590;
      label(name, cx, gy + 14, 26);
      x.save(); x.translate(cx, gy - 20); x.scale(k, k);
      if (o.table) { x.fillStyle = '#E9D6C4'; x.fillRect(150, -440, 300, 40); x.strokeStyle = '#1C1418'; x.lineWidth = 6; x.strokeRect(150, -440, 300, 40); }
      const p = { ...feel('neutral', .4), bob: 0, arms: hands.map(h => ({ to: h })) };
      ch.draw(x, { stance: 'stand', ...p });
      if (o.glass) glass(x, o.glass);
      x.restore();
    }
  });
  // лента жеста: 12 кадров по 1/10 с, ударное слово в 0.3 с
  const y0 = 1555; label('жест под ударное слово (elbow): плечо ведёт, кисть отстаёт на 3 кадра, перелёт и возврат; левая рука в покое', 20, 1260, 26, '#9FE0B0', 'left');
  const up = [250, -690], sw = W / 12;
  for (let i = 0; i < 12; i++) {
    const t = .1 * i, g = gesture(t, .3), sh = shoulder(S, 1), hand = arcHand(sh, R[1], up, g.hand);
    const p = { ...feel('talk', t), bob: 0, sq: 0, lean: -.05 * g.body, tilt: .06 * g.body, arms: [{ to: R[0] }, { to: hand }] };
    x.save(); x.translate(i * sw + sw / 2, y0); x.scale(.27, .27); E1.draw(x, { stance: 'stand', ...p }); x.restore();
    label((t).toFixed(1) + ' с', i * sw + sw / 2, y0 + 10, 20, '#C9D3E8');
  }
  // походка Дженсена (натуральные ноги: бедро + голень, колено вперёд): 12 кадров одного цикла, сбоку и в 3/4.
  // Фигура смещается вперёд со скоростью опорной ступни — стопа на полу стоит на месте; метки на полу — мировые точки опоры.
  const Jn = jensen(), u = Jn.spec.u ?? 1, slip = [];
  [['сбоку', 'side', 1.42], ['3/4', 'threeQuarter', .7]].forEach(([nm, view, psi], r) => {
    const yG = 1880 + r * 400, k = .3, sw = W / 12, sp = Math.sin(psi), speed = 150 / .56 * u * sp;   // ед. рисунка за цикл
    label('походка Дженсена, ' + nm + ': стопа стоит на полу без скольжения, руки в противоход ногам, корпус чуть поднимается и опускается', 20, yG - 330, 24, '#9FE0B0', 'left');
    x.strokeStyle = 'rgba(20,14,18,.6)'; x.lineWidth = 3; x.beginPath(); x.moveTo(0, yG); x.lineTo(W, yG); x.stroke();
    let prev = null;
    for (let i = 0; i < 12; i++) {
      const ph = i / 12, P = gait(Jn, 'walk', ph, { view, facing: 1 }), travel = ph * speed;
      const cx = i * sw + sw / 2 - 40;
      x.save(); x.translate(cx + travel * k, yG); x.scale(k, k); Jn.draw(x, { stance: 'stand', ...feel('neutral', .4), ...P, mouth: 'smileS', eyes: 'rest' }); x.restore();
      // опорная стопа: мировая x (относительно ячейки), должна совпадать на соседних кадрах опоры
      const ank = P.legs.filter(l => l.hip).map(l => ({ x: l.b[0] + travel, y: l.b[1] }));
      const g0 = ank.reduce((a, b) => (b.y > a.y ? b : a));
      x.fillStyle = '#F2D27A'; x.beginPath(); x.arc(cx + g0.x * k, yG + 6, 5, 0, 7); x.fill();
      if (prev && Math.abs(prev.y - g0.y) < 1 && Math.abs(prev.x - g0.x) < 40) slip.push(Math.abs(prev.x - g0.x));
      prev = g0;
      label(i + '', cx, yG + 34, 18, '#C9D3E8');
    }
  });
  label('скольжение опорной стопы между соседними кадрами: макс. ' + Math.max(0, ...slip).toFixed(1) + ' ед. рисунка', 20, H - 18, 22, '#F2D27A', 'left');
  window.SLIP = slip;
  return [W, H];
};`;
const r = await build({ stdin: { contents: src, resolveDir: ENGINE, loader: 'js' }, bundle: true, format: 'iife', write: false, target: 'chrome120', logLevel: 'warning' });
const font = readFileSync(join(ENGINE, 'fonts', 'Montserrat-ExtraBold.ttf')).toString('base64');
const html = join(OUT, 'arms_compare.html');
writeFileSync(html, `<!doctype html><meta charset="utf-8"><style>@font-face{font-family:Montserrat;font-weight:700;src:url(data:font/ttf;base64,${font})}</style><canvas id="c"></canvas><script>${r.outputFiles[0].text.replace(/<\/script/gi, '<\/script')}</script>`);
let browser; try { browser = await chromium.launch({ channel: 'chrome' }); } catch { browser = await chromium.launch(); }
const page = await browser.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.goto(pathToFileURL(html).href); await page.evaluate(() => document.fonts.load('700 20px Montserrat'));
const data = await page.evaluate(() => { const c = document.getElementById('c'); window.sheet(c); return c.toDataURL('image/jpeg', .92).split(',')[1]; });
writeFileSync(join(OUT, 'arms_compare.jpg'), Buffer.from(data, 'base64'));
console.log(join(OUT, 'arms_compare.jpg')); if (errs.length) { console.error(errs); process.exitCode = 1; }
await browser.close();
