// animatic/ru/film.js: русская версия аниматика L001 со СВОИМ таймингом (timing_ru.json — русский голос Fish в естественном
// темпе; те же планы и события, английские слова перенесены на русские строки в make_timing.mjs).
//   node production/L001/animatic/make_timing.mjs --lines out/lines_fish_ru.json --out animatic/timing_ru.json
//   node engine/tools/build.mjs production/L001/animatic/ru
//   node production/L001/animatic/render_all.mjs --lang ru --nodebug --jobs 2     -> out/animatic_ru.mp4, out/animatic_ru_debug.mp4
import { animatic, useTiming, OPTIONS, FPS, W, H } from '../core.js';
import timingRu from '../timing_ru.json';

useTiming(timingRu);
export default {
  fps: FPS, size: [W, H],
  options: OPTIONS,
  setup(stage, opt) { return animatic(stage, opt); },
};
