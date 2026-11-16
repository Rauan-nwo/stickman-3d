// templates/index.js: 2D-шаблоны кадров стиля «Стикман Нуар» (связки и факты лонгов, 1920x1080).
// Каждый шаблон — чистая функция fn(ctx, t, opts): рисует весь кадр на 2D-канвасе (кроме lowerThird — он поверх),
// t — секунды от начала шота; в каждом есть медленный наезд и одно событие. Пример: production/L001/scenes/templates_demo/film.js
export { blackCard, chapterTitle } from './cards.js';
export { lowerThird, bigNumber } from './captions.js';
export { noirMap, mapProjection } from './map.js';
export { board } from './board.js';
export { documentShot } from './document.js';
export { NOIR, FONT as NOIR_FONT, camPush, grain, vignette, lampPool, motes, marker, scribbleEllipse, wobble, partial } from './noir.js';
export { PLACES } from './mapData.js';
import { blackCard, chapterTitle } from './cards.js';
import { lowerThird, bigNumber } from './captions.js';
import { noirMap } from './map.js';
import { board } from './board.js';
import { documentShot } from './document.js';
// те же функции под короткими именами: templates.map, templates.document (как отдельные экспорты конфликтовали бы с глобальным document)
export const templates = { blackCard, chapterTitle, lowerThird, bigNumber, map: noirMap, board, document: documentShot };
