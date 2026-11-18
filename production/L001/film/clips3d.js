// film/clips3d.js — какие 3D-планы финала берут НАТИВНЫЙ рендер сцены (1920×1080, 30 к/с, PNG без потерь), а не прокси аниматика
// (12 к/с, 960×540 JPEG). Таблицу читают и фильм (рисует кадр 1:1 поверх — затем подписи и титры), и final.mjs (рендерит кадры).
//   scene — папка scenes/<scene>; set — параметры сцены (--set); dur: true — длина сцены = длина плана (кадр в кадр);
//   from — с какого кадра сцены начинается план; group — планы одной группы идут одним дублем: длина сцены = сумма их кадров,
//   каждый берёт свой отрезок подряд (после перетайминга дубль пересчитается сам).
// Кадр плана: frame0(s) = ceil(start·30), кадров N = ceil(end·30) − frame0 — так же считает движок (кадр f принадлежит плану, если start ≤ f/30 < end).
import { byText } from './keys.js';
// ключ — 'глава|начало текста плана' (keys.js): номера планов в шотлисте меняются
export const CLIPS3D_KEYS = {
  '0|the man who runs': { scene: 'city', set: { shot: 'towers', one: '1' }, dur: true, from: 0 },    // D03-B: город башен, «#1» на зелёной башне
  '0|by the warehouse': { scene: 'box_path_v2', set: {}, from: 0 },                                  // склад: S1–S2 пути коробки v2 в реальном темпе
  '1|It starts with a decision': { scene: 'desk3d', set: {}, group: 'desk3d' },                              // вашингтонский стол: звонок (+ название ролика поверх)
  '1|But first, meet': { scene: 'desk3d', set: {}, group: 'desk3d' },                              // тот же дубль: камера падает на папку — продолжение без повтора кадров
};
export const clips3d = shots => byText(CLIPS3D_KEYS, shots);          // { номер плана: запись } для текущего timing.json
export const FPS3D = 30;
export const frame0 = s => Math.ceil(s.start * FPS3D - 1e-6);
export const frames = s => Math.ceil(s.end * FPS3D - 1e-6) - frame0(s);
export const pad4 = i => String(i).padStart(4, '0');
