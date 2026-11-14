// film.js: фильм = данные + несколько функций. Раннер превращает его в страницу с контрактом рендера:
//   window.draw(frame), window.FRAMES, window.FPS, window.CUES (времена жёстких склеек).
//
// export default {
//   fps: 30, size: [720, 1280],
//   options: { gun: '3d' },              // параметры фильма (переопределяются через ?gun=2d или render.mjs --set gun=2d)
//   setup(stage, options) {              // один раз: построить декорации, героев, пропсы
//     return {
//       duration: 3.7,                   // необязательно: по умолчанию конец последней сцены
//       scenes: [{
//         id: 'shaft', from: 0, to: 2.0, // секунды; сцена активна при from <= t < to
//         set: shaft,                    // декорация (или массив): { group, look, tick(t, stage) }
//         props: [gun.group],            // объекты в корне сцены, видимые только в этой сцене
//         look: { bloom: .2 },           // правки вида поверх set.look
//         camera: t => state,            // { pos, target, fov, roll } — см. camera.js
//         update(t, f) {},               // до рендера 3D: позы пропсов, f.look.focus / exposure / dark ...
//         under(t, f) {},                // 2D под персонажами (шлейф)
//         chars(t, f) {},                // 2D-персонажи: actor.draw(pose)
//         over(t, f) {},                 // 2D-эффекты поверх FG-пропсов (вспышка, кольца)
//       }],
//       transitions: [{ at: 2.0, type: 'cut' | 'dissolve' | 'flash' | 'dip', dur: .2, color: '#fff' }],
//     };
//   },
// };
// f = { t, frame, stage, look, ctx, cam, scene, local } — контекст кадра (local = t - scene.from).
// Правило: всё внутри сцены — чистая функция t. Никаких часов, Math.random() и накопленного состояния между кадрами.
import { createStage } from './stage.js';
import { clamp } from './ease.js';

export const defineFilm = def => def;
const arr = x => (x == null ? [] : Array.isArray(x) ? x : [x]);

export function runFilm(def, opts = {}) {
  const [W, H] = def.size || [720, 1280], FPS = def.fps || 30;
  const stage = createStage({ canvas: opts.canvas, W, H, FPS });
  // параметры фильма: def.options — значения по умолчанию, их можно переопределить в адресе страницы (?gun=2d)
  // или при рендере:  node tools/render.mjs film.html out.mp4 --set gun=2d
  const options = { ...(def.options || {}), ...(opts.options || {}) };
  if (typeof location !== 'undefined') for (const [k, v] of new URLSearchParams(location.search)) if (k !== 'render' && k !== 'f') options[k] = v;
  const built = (def.setup ? def.setup(stage, options) : null) || {};
  const scenes = [...(built.scenes || def.scenes || [])].sort((a, b) => a.from - b.from);
  if (!scenes.length) throw new Error('film: нет ни одной сцены');
  scenes.forEach((s, i) => { s.sets = arr(s.set); s.props = arr(s.props); if (s.to == null) s.to = scenes[i + 1] ? scenes[i + 1].from : (built.duration ?? def.duration); if (s.to == null) throw new Error(`film: у последней сцены '${s.id}' нет to, а duration не задан`); });
  const transitions = built.transitions || def.transitions || [];
  const duration = built.duration ?? def.duration ?? Math.max(...scenes.map(s => s.to));
  const FRAMES = built.frames ?? def.frames ?? Math.round(duration * FPS);
  // всё, чем управляет раннер: группы декораций и пропсы сцен. Видимо только то, что перечислено в активной сцене.
  const managed = new Set(); for (const s of scenes) { for (const st of s.sets) managed.add(st.group); for (const p of s.props) managed.add(p); }
  const sceneAt = t => { let i = 0; while (i + 1 < scenes.length && t >= scenes[i + 1].from - 1e-6) i++; return scenes[i]; };

  function renderScene(sc, t, frame) {
    const on = new Set([...sc.sets.map(s => s.group), ...sc.props]);
    for (const o of managed) o.visible = on.has(o);
    const look = stage.resetLook(...sc.sets.map(s => s.look), sc.look);
    const cam = sc.camera ? stage.setCamera(sc.camera(t)) : null;
    const f = { t, frame, stage, look, ctx: stage.ctx, cam, scene: sc, local: t - sc.from };
    for (const s of sc.sets) if (s.tick) s.tick(t, stage, f);
    if (sc.update) sc.update(t, f);
    stage.renderEnv();                                             // [1]
    if (sc.under) sc.under(t, f);                                  // [2]
    if (sc.chars) sc.chars(t, f);
    if (sc.fg !== false && stage.fgVisible()) stage.renderFg();    // [3]
    if (sc.over) sc.over(t, f);                                    // [4]
    stage.finish();
  }
  function draw(frame) {
    const t0 = performance.now(), t = frame / FPS, ctx = stage.ctx;   // performance.now — только для статистики, в кадр не попадает
    const sc = sceneAt(t);
    const tr = transitions.find(x => x.type === 'dissolve' && t >= x.at - (x.dur ?? .2) / 2 - 1e-6 && t < x.at + (x.dur ?? .2) / 2 - 1e-6);
    if (tr) {                                                      // растворение: обе сцены рендерятся целиком и смешиваются
      const dur = tr.dur ?? .2, k = clamp((t - (tr.at - dur / 2)) / dur), a = sceneAt(tr.at - 1e-3), b = sceneAt(tr.at + 1e-3);
      renderScene(a, t, frame); const snap = stage.snapshot();
      renderScene(b, t, frame);
      stage.resetCtx(); ctx.globalAlpha = 1 - (tr.ease ? tr.ease(k) : k); ctx.drawImage(snap, 0, 0); ctx.globalAlpha = 1;
    } else renderScene(sc, t, frame);
    for (const x of transitions) {
      if (x.type === 'flash') {                                    // вспышка на склейке: быстро нарастает за pre, гаснет за dur
        const pre = x.pre ?? 1 / FPS, dur = x.dur ?? .13, d = t - x.at;
        const a = d < -pre ? 0 : d < 0 ? Math.pow(1 + d / pre, 2) : d < dur ? Math.pow(1 - d / dur, 2) : 0;
        if (a > .003) { stage.resetCtx(); ctx.globalAlpha = a * (x.peak ?? 1); ctx.fillStyle = x.color || '#FFF6DC'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
      } else if (x.type === 'dip') {                               // уход в цвет и выход из него (пыль, темнота)
        const dur = x.dur ?? .5, a = 1 - Math.abs(t - x.at) / (dur / 2);
        if (a > .003) { stage.resetCtx(); ctx.globalAlpha = Math.min(1, a * (x.peak ?? 1.15)); ctx.fillStyle = x.color || '#000'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
      }
    }
    perf[frame] = performance.now() - t0;
  }
  const perf = [];
  const cuts = scenes.slice(1).map(s => s.from).filter(at => !transitions.some(x => Math.abs(x.at - at) < 1e-6 && x.type !== 'cut' && x.type !== 'flash'));
  const film = { stage, scenes, transitions, duration, FRAMES, FPS, draw, perf, sceneAt, built, options };
  if (typeof window !== 'undefined') {
    window.draw = draw; window.FRAMES = FRAMES; window.FPS = FPS; window.CUES = cuts;
    window.GL_INFO = stage.glInfo(); window.__perf = perf; window.__film = film; window.__stage = stage;
    const q = new URLSearchParams(location.search);
    if (q.has('f')) draw(+q.get('f'));                             // ?f=24 — показать один кадр
    else if (!q.has('render')) {                                   // предпросмотр в браузере (часы только здесь, вне draw)
      const start = performance.now();
      const loop = () => { draw(Math.floor((performance.now() - start) / 1000 * FPS) % FRAMES); requestAnimationFrame(loop); };
      loop();
    }
  }
  return film;
}
