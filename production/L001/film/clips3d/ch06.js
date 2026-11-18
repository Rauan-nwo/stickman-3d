// film/clips3d/ch06.js — 3D-планы гл. 6 с нативной сценой (владелец: рабочий A); формат записи — film/clips3d.js.
// Без импортов: этот файл читает и node (final.mjs).
// Путь коробки: box_path_v2 (рисованная часть, 0–13.3 с, весь фильм без --set shot) в РЕАЛЬНОМ темпе: каждый план начинается с кадра
// своего подплана (s.box.from в timing.json), длина = длина плана (хвост подплана обрезан). Штамп INSPECTED в сцене — 9.72–9.84 с:
// план «cleared through customs» начинается с 9.0 с (кадр 270), удар штампа — на 0.84 с плана, в слове «customs».
// Хвост (проход ДЦ и «серийник = накладная») — полностью 3D-версия box_path (как в сборке assemble.ps1), кадры без повторов:
// «серийник и накладная» — 397–490 (серийник крупно после тёмного стыка 389–400, отъезд в ДЦ), «общий проход ДЦ» — 440–539 (14.7–18.0 с):
// 51 кадр отъезда в ДЦ повторяется в двух планах (через 87 с) — свободного хвоста сцены без повтора нет (box_path кончается на 540).
// Дата-центр: dc_inspection, план сцены = план фильма (--set shot, dur = длина плана); пролёт 180 одним дублем на два плана.
export default {
  '6|Follow one box': { scene: 'box_path_v2', set: {}, from: 0 },                 // S1 склад: погрузчик везёт коробку на нас
  "6|It's packed in a factory": { scene: 'box_path_v2', set: {}, from: 63 },     // S2 (2.1 с): на коробку шлёпается наклейка MALAYSIA
  '6|loaded onto a ship': { scene: 'box_path_v2', set: {}, from: 123 },           // S3 (4.1 с): кран поднимает коробку под дождём
  '6|cleared through customs': { scene: 'box_path_v2', set: {}, from: 270 },      // S5 (9.0 с): штамп INSPECTED на «customs»
  '6|and delivered to a data center': { scene: 'box_path_v2', set: {}, from: 318 },   // S6 (10.6 с): двери захлопываются, зум на серийник, темнота
  '6|Every step has paperwork': { scene: 'box_path', set: {}, from: 440 },        // хвост: коробка нераспакованной в проходе ДЦ
  '6|Every box was exactly where': { scene: 'box_path', set: {}, from: 397 },     // хвост: серийник крупно -> отъезд в проход ДЦ (D20-B ценник — табличкой ядра); с 345 на «paperwork» был тёмный стык 389–400
  '6|Late in 2024, inspectors': { scene: 'dc_inspection', set: { shot: '180' }, group: 'dc180' },        // двери «DATA HALL», луч фонаря, проезд вперёд
  '6|A data center is supposed to hum': { scene: 'dc_inspection', set: { shot: '180' }, group: 'dc180' }, // тот же дубль: проход между тёмными стойками
  '6|What they found were servers': { scene: 'dc_inspection', set: { shot: '182' }, dur: true },         // фонарь по коробкам в плёнке
  '6|INSPECTOR: Is it switched on': { scene: 'dc_inspection', set: { shot: '183' }, dur: true },         // крупно инспектор с фонарём
  "6|GUIDE: It's still wrapped": { scene: 'dc_inspection', set: { shot: '184' }, dur: true },            // гид стучит по плёнке
  '6|INSPECTOR: Since when': { scene: 'dc_inspection', set: { shot: '185' }, dur: true },                // крупно инспектор: «Since when?»
  '6|GUIDE: Since delivery': { scene: 'dc_inspection', set: { shot: '186' }, dur: true },                // палец на наклейке DELIVERED
};
