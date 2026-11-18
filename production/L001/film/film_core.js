// film/film_core.js — финальный рендер L001 «Стикман Нуар»: тот же монтаж, что у аниматика (animatic/core.js — тайминг, плейты,
// шаблоны, грамматика камеры, события, переходы), но вместо табличек-заглушек — настоящие герои (shots.js + staging/*).
// Планы, у которых ещё нет постановки, рисуются как в аниматике (заглушка видна сразу) — так главы переводятся по одной.
// Параметры (--set): f0, f1 — диапазон кадров; solo=k|w — только герои на чёрном/белом (проверка непрозрачности);
//                    debug=1 — отладочная полоса аниматика; sheet=1 — подписи для листов;
//                    c3d=<папка> — 3D-планы из clips3d.js рисуются нативными кадрами <папка>/<план>/f-NNNN.png 1:1 (final.mjs),
//                    без c3d — прокси аниматика (для быстрых проверок).
// Ядро финального фильма: filmDef(таблицы) -> определение фильма. Точки входа: film.js (все главы), entries/<имя>.js (свои главы рабочего).
import { animatic, camOf, FPS, W, H } from '../animatic/core.js';

import { clips3d, frame0, frames, pad4 } from './clips3d.js';
import { byText } from './keys.js';
import timing from '../animatic/timing.json';

export function filmDef(ST) {   // ST = { SHOTS, OVER, SKIP_PROPS, RAIN } — таблицы постановки (shots/index.js merge)
  return {
  fps: FPS, size: [W, H],
  options: { debug: '0', f0: '0', f1: '', sheet: '0', solo: '', c3d: '' },
  setup(stage, opt) {
    const solo = opt.solo === 'k' || opt.solo === 'w' ? opt.solo : '';
    // постановка по ключам 'глава|начало текста' -> по номерам планов текущего timing.json
    const SHOTS = byText(ST.SHOTS, timing.shots), SKIP_PROPS = byText(ST.SKIP_PROPS, timing.shots), OVER = byText(ST.OVER, timing.shots), CLIPS3D = clips3d(timing.shots), RAIN = ST.RAIN;
    const cams = new Map();
    const camAt = s => { if (!cams.has(s.n)) cams.set(s.n, camOf(s, s.dur)); return cams.get(s.n); };
    // нативные 3D-кадры: путь, предзагрузка (final.mjs ждёт window.__prep3d(i) перед draw(i)), рисование 1:1 без масштаба
    const c3d = (opt.c3d || '').split('\\').join('/').replace(/\/$/, ''), f0 = +opt.f0 || 0, IMG = new Map();
    const shot3d = F => timing.shots.find(s => CLIPS3D[s.n] && F >= frame0(s) && F < frame0(s) + frames(s));
    const url = (n, i) => `file:///${c3d.replace(/^\//, '')}/${n}/f-${pad4(i)}.png`;
    const load = u => { if (IMG.has(u)) return IMG.get(u); const im = new Image(); const p = new Promise((ok, no) => { im.onload = () => ok(im); im.onerror = () => no(new Error('нет кадра ' + u)); });
      im.src = u; const e = { im, p }; IMG.set(u, e); if (IMG.size > 8) IMG.delete(IMG.keys().next().value); return e; };
    if (c3d) window.__prep3d = async i => { const F = f0 + i, s = shot3d(F); if (!s) return; const k = F - frame0(s); await load(url(s.n, k)).p; await (await load(url(s.n, k)).p).decode(); if (k + 1 < frames(s)) load(url(s.n, k + 1)); };
    const draw3d = (ctx, s, t) => { const k = Math.round((s.start + t) * 30) - frame0(s), e = load(url(s.n, Math.max(0, Math.min(frames(s) - 1, k))));
      if (e.im.complete && e.im.naturalWidth) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(e.im, 0, 0); } else { ctx.fillStyle = '#f0f'; ctx.fillRect(0, 0, W, H); } };   // пурпур = кадр не загрузился (видно на проверке)
    return animatic(stage, opt, {
      final: true,
      plate: s => (c3d && CLIPS3D[s.n]) ? (ctx, s, t) => draw3d(ctx, s, t) : SHOTS[s.n] ? (ctx, s, t, d, sz, cam, sp, API) => {
        if (solo) { ctx.fillStyle = solo === 'w' ? '#ffffff' : '#000000'; ctx.fillRect(0, 0, W, H); }
        ctx.save(); SHOTS[s.n]({ ctx, s, t, d, T: s.start + t, cam, camAt: camAt(s), solo: !!solo, API }); ctx.restore();
      } : null,
      over: s => (OVER[s.n] && !solo ? OVER[s.n] : null),
      noAmbient: s => !!(c3d && CLIPS3D[s.n]),                            // у нативной 3D-сцены свой свет и пыль
      rain: s => (solo ? false : RAIN(s)),
      skipProp: (s, q) => !!(SKIP_PROPS[s.n] && SKIP_PROPS[s.n].test(q)),
    });
  },
  };
}
