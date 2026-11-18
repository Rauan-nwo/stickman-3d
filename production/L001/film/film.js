// film/film.js — финальный рендер L001, ВСЕ главы (для итоговой сборки). Сборка: node engine/tools/build.mjs production/L001/film
// Рабочие собирают свои главы через entries/<имя>.js (README.md, «Работа по главам») — ошибка в чужой главе не ломает их сборку.
import { filmDef } from './film_core.js';
import { ALL } from './shots/index.js';
export default filmDef(ALL);
