// ГОТОВО: L04 Вашингтон — общий план (кресло за столом) и обратная точка (дверь с навесным замком, стоящие у двери). Владелец — ведущий.
// staging/washington.js — конфиг для staging/desk.js. Плейты: assets/bg_washington_cold.png (общий), bg_washington_reverse.png (обратная).
// Свет: зелёная лампа слева на столе (общий) / справа (обратная), холодная луна в окне. Пиксели плейта 1920×1080.
import { deskLocation } from './desk.js';
import wide from '../../assets/bg_washington_cold.png';
import rev from '../../assets/bg_washington_reverse.png';

export const WA = deskLocation({
  plate: wide, rev,
  // кресло: спинка x 720–1110, верх 470; столешница — задняя кромка y 790, передняя 845; на столе телефон (480–760) и папки (1110–1440)
  sit: { seat: [915, 865], fs: .83, light: [-1, .1], deskBack: 790, hands: { L: [842, 818], R: [990, 818] },
    mask: [[95, 845], [180, 790], [1610, 790], [1720, 845], [1720, 1080], [95, 1080]] },
  // обратная точка: пол перед дверью y 690–815; стол с лампой и телефоном — передний план (маска revMask)
  revStand: { door: { feet: [1060, 790], fs: .5, light: [1, .2] }, board: { feet: [700, 790], fs: .5, light: [1, .2] } },
  revMask: [[0, 815], [1920, 815], [1920, 1080], [0, 1080]],
  views: {
    wide: { cx: 960, cy: 540, k: 1.0 }, mid: { cx: 915, cy: 640, k: 1.7 }, cu: { cx: 935, cy: 640, k: 2.2 }, xcu: { cx: 915, cy: 470, k: 4.2 },
    rev: { cx: 960, cy: 540, k: 1.0 }, revDoor: { cx: 1060, cy: 470, k: 1.6 }, revBoard: { cx: 660, cy: 330, k: 2.2 },
    phone: { cx: 625, cy: 735, k: 2.6 }, papers: { cx: 1275, cy: 745, k: 2.8 },
  },
});
