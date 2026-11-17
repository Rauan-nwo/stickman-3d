// film.js: L001 — 3D-пролёты над ночным городом («Стикман Нуар», тип C). 1920x1080, 30 fps.
//   --set shot=singapore|washington|taipei|final|towers|alaska   (#6, #85, #153 и #227, #298, #2 и #79, #300)
//   --set one=1                                      (towers: в конце на короне зелёной башни загорается «#1»)
//   --set dur=<сек>                                  (1.5–7; по умолчанию — длительность плана из шотлиста; Сингапур 3 с — в монтаж идут последние 1.8 с)
// 2.5D-мультиплан: набор engine/src/sets/noirCity.js (paintedRow, coverage); раскладки: shots.js; плиты GPT:
//   make_assets.py -> assets/ + assets.js. Старая low-poly версия раскладок — shots_lowpoly.js (не используется).
import { singapore, washington, taipei, final, towers, alaska } from './shots.js';
import A from './assets.js';

const SHOTS = { singapore, washington, taipei, final, towers, alaska };
const DEF = { singapore: 3, washington: 4.9, taipei: 3.3, final: 4.4, towers: 2.2, alaska: 3.6 };

export default {
  fps: 30, size: [1920, 1080],
  options: { shot: 'singapore', dur: '', camT: '', one: '' },   // camT — отладка: камера замерла в момент camT (с)
  setup(stage, o) {
    const shot = SHOTS[o.shot] ? o.shot : 'singapore';
    const dur = Math.min(7, Math.max(1.5, parseFloat(o.dur) || DEF[shot]));
    stage.setVignette({ alpha: .55, color: '3,5,14', inner: .4, outer: 1.05, cy: .5 });
    const S = SHOTS[shot](stage, A, dur, { one: o.one === '1' || o.one === 'true' });
    return {
      duration: dur,
      scenes: [{ id: shot, from: 0, to: dur, set: S.set, camera: o.camT !== '' ? () => S.camera(parseFloat(o.camT)) : S.camera, update: S.update, over: S.over }],
    };
  },
};
