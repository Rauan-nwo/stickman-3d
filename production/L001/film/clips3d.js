// film/clips3d.js — какие 3D-планы финала берут НАТИВНЫЙ рендер сцены (1920×1080, 30 к/с, PNG без потерь), а не прокси аниматика
// (12 к/с, 960×540 JPEG). Таблицу читают и фильм (рисует кадр 1:1 поверх — затем подписи и титры), и final.mjs (рендерит кадры).
//   scene — папка scenes/<scene>; set — параметры сцены (--set); dur: true — длина сцены = длина плана (кадр в кадр);
//   from — с какого кадра сцены начинается план; group — планы одной группы идут одним дублем: длина сцены = сумма их кадров,
//   каждый берёт свой отрезок подряд (после перетайминга дубль пересчитается сам).
// Кадр плана: frame0(s) = ceil(start·30), кадров N = ceil(end·30) − frame0 — так же считает движок (кадр f принадлежит плану, если start ≤ f/30 < end).
import { byText } from './keys.js';
// ключ — 'глава|начало текста плана' (keys.js): номера планов в шотлисте меняются
import c00 from './clips3d/ch00.js';
import c01 from './clips3d/ch01.js';
import c02 from './clips3d/ch02.js';
import c03 from './clips3d/ch03.js';
import c04 from './clips3d/ch04.js';
import c05 from './clips3d/ch05.js';
import c06 from './clips3d/ch06.js';
import c07 from './clips3d/ch07.js';
import c08 from './clips3d/ch08.js';
import c09 from './clips3d/ch09.js';
import c10 from './clips3d/ch10.js';
export const CLIPS3D_KEYS = Object.assign({}, c00, c01, c02, c03, c04, c05, c06, c07, c08, c09, c10);   // по главам: clips3d/chNN.js
export const clips3d = shots => byText(CLIPS3D_KEYS, shots);          // { номер плана: запись } для текущего timing.json
export const FPS3D = 30;
export const frame0 = s => Math.ceil(s.start * FPS3D - 1e-6);
export const frames = s => Math.ceil(s.end * FPS3D - 1e-6) - frame0(s);
export const pad4 = i => String(i).padStart(4, '0');
