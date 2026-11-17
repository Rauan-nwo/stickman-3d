// animatic/film.js: полный аниматик L001 (все планы шотлиста, 1920x1080, 30 к/с) — проверка ритма до дорогой покадровой анимации.
// Весь код — в core.js (общий с финальным фильмом production/L001/film/film.js); здесь — аниматик без хуков: герои — таблички-заглушки.
// Параметры (--set): debug=0 — без отладочной полосы; f0, f1 — диапазон кадров (рендер кусками); sheet=1 — подписи для листов.
// Перед сборкой: pwsh prep_assets.ps1 (JPG-плейты и кадры пути коробки в tmp/, модуль boxframes.js).
import { animatic, OPTIONS, FPS, W, H } from './core.js';

export default {
  fps: FPS, size: [W, H],
  options: OPTIONS,
  setup(stage, opt) { return animatic(stage, opt); },
};
