// film/film.js — финальный рендер L001 «Стикман Нуар»: тот же монтаж, что у аниматика (animatic/core.js — тайминг, плейты,
// шаблоны, грамматика камеры, события, переходы), но вместо табличек-заглушек — настоящие герои (shots.js + staging/*).
// Планы, у которых ещё нет постановки, рисуются как в аниматике (заглушка видна сразу) — так главы переводятся по одной.
// Параметры (--set): f0, f1 — диапазон кадров; solo=k|w — только герои на чёрном/белом (проверка непрозрачности);
//                    debug=1 — отладочная полоса аниматика; sheet=1 — подписи для листов.
// Сборка: node engine/tools/build.mjs production/L001/film ; рендер глав — node production/L001/film/render.mjs (README.md).
import { animatic, camOf, FPS, W, H } from '../animatic/core.js';
import { SHOTS, SKIP_PROPS, RAIN, OVER } from './shots.js';

export default {
  fps: FPS, size: [W, H],
  options: { debug: '0', f0: '0', f1: '', sheet: '0', solo: '' },
  setup(stage, opt) {
    const solo = opt.solo === 'k' || opt.solo === 'w' ? opt.solo : '';
    const cams = new Map();
    const camAt = s => { if (!cams.has(s.n)) cams.set(s.n, camOf(s, s.dur)); return cams.get(s.n); };
    return animatic(stage, opt, {
      final: true,
      plate: s => SHOTS[s.n] ? (ctx, s, t, d, sz, cam, sp, API) => {
        if (solo) { ctx.fillStyle = solo === 'w' ? '#ffffff' : '#000000'; ctx.fillRect(0, 0, W, H); }
        ctx.save(); SHOTS[s.n]({ ctx, s, t, d, T: s.start + t, cam, camAt: camAt(s), solo: !!solo, API }); ctx.restore();
      } : null,
      over: s => (OVER[s.n] && !solo ? OVER[s.n] : null),
      rain: s => (solo ? false : RAIN(s)),
      skipProp: (s, q) => !!(SKIP_PROPS[s.n] && SKIP_PROPS[s.n].test(q)),
    });
  },
};
