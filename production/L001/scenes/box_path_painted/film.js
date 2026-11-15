// box_path_painted/film.js: L001, «путь коробки» — прототип типа B («Стикман Нуар»): рисованные фоны GPT + параллакс
// камеры + немного 3D там, где оно даёт глубину. Сравнить с полностью 3D-версией ../box_path/.
//   1 склад (0–4.4 с)      наезд по проходу, ближняя стойка слева — передний слой; коробка на паллете в центре
//   — whip-pan —
//   2 порт (4.4–9.0)       боковой проезд; кран опускает коробку на мокрый асфальт (крюк, трос, стропы — 3D);
//                          угол контейнера справа — передний слой, небо/краны/судно — дальний
//   — склейка по коробке —
//   3 контейнер (9.0–13)   коробка на полу контейнера, медленный наезд к дверям; стропы слева — передний слой,
//                          порт в проёме — дальний
//   — уход в темноту —
//   4 дата-центр (13–17.5) коробка нераспакована среди стоек; ближняя стойка и штабель — передние слои
// Плиты и маски: make_assets.py -> assets/. Геометрия плиты: plate25d.js. Предметы: props.js.
// Параметры: --set shot=warehouse|port|container|datacenter (одна сцена), --set props=off (только плиты).
import { THREE, V, E, seg, clamp } from 'engine';
import { makePlate, blobShadow } from './plate25d.js';
import { hero, craneHook } from './props.js';
import pW from './assets/plate_warehouse.png'; import fW from './assets/fg_warehouse.png';
import pP from './assets/plate_port.png'; import fP from './assets/fg_port.png'; import farP from './assets/far_port.jpg';
import pC from './assets/plate_container.png'; import fC from './assets/fg_container.png'; import farC from './assets/far_container.jpg';
import pD from './assets/plate_datacenter.png'; import fD0 from './assets/fg_datacenter_0.png'; import fD1 from './assets/fg_datacenter_1.png';

const T = { W: 0, P: 4.4, C: 9.0, D: 13.0, END: 17.5 };
const lerp = (a, b, k) => a + (b - a) * k;
const mix = (a, b, k) => Object.fromEntries(Object.keys(a).map(n => [n, lerp(a[n], b[n] ?? a[n], k)]));

// грейд предметов по сцене: множители тонов тень / полутон / свет (сняты на глаз с плиты в точке, где стоит коробка)
const GRADE = {
  W: { shadow: [.78, .84, 1.0], mid: [1, .95, .9], light: [1.06, .98, .9] },          // тёплые лампы сверху, синие тени
  P: { shadow: [.5, .56, .78], mid: [.9, .82, .8], light: [1.12, .96, .8] },           // прожектор слева, мокрая ночь
  C: { shadow: [.3, .4, .54], mid: [.5, .66, .74], light: [.68, .9, .98] },           // холодный свет из проёма
  D: { shadow: [.48, .58, .68], mid: [.8, .88, .92], light: [.94, 1.02, 1.04] },       // бирюзовый потолок
};

export default {
  fps: 30, size: [1920, 1080],
  options: { shot: 'all', props: 'on' },
  setup(stage, o) {
    stage.renderer.toneMapping = THREE.NoToneMapping;
    stage.setVignette({ alpha: .28, color: '4,6,14', inner: .5, outer: 1.05, cy: .5 });
    const withProps = o.props !== 'off';
    const LOOK = (fogColor, fogDensity) => ({ bloom: 0, dof: false, fogColor, fogDensity, bg: 0x05070d, near: .05, far: 600, vignette: 1, exposure: 1 });

    function set(plate, look, extra = []) {
      const group = new THREE.Group(); group.add(plate.group, ...extra); stage.add(group);
      return { group, look, tick() { plate.tick(); } };
    }
    // коробка на полу: пиксель плиты -> точка пола, поворот, контактные тени (плотная под паллетом + мягкая со смещением от света)
    function placed(plate, px, ry, opts, shadowDir = [0, 0]) {
      const h = hero(opts), root = new THREE.Group(); root.add(h);
      const p = plate.floorAt(...px); root.position.set(p.x, .003, p.z); root.rotation.y = ry * Math.PI / 180;
      const s1 = blobShadow(.86, .72, .8), s2 = blobShadow(1.3, 1.05, .34); s2.position.x = shadowDir[0]; s2.position.z = shadowDir[1];
      root.add(s1, s2); root.userData.shadows = [s1, s2];
      return { root, h, p };
    }

    // ---------------- 1. склад ----------------
    const PW = makePlate({ plate: pW, h: 1.2, vp: [887, 511], fov: 50, left: [370, 640], right: [1480, 668], back: [887, 556], ceil: 8, fgs: [{ url: fW, depth: 3.2 }] });
    const BW = placed(PW, [905, 735], -24, { grade: GRADE.W, L: [.25, 1, -.35] }, [.15, -.2]);
    const sW = set(PW, LOOK(0x0b3442, .03), withProps ? [BW.root] : []);
    const camW = t => { const k = E.inOutSine(seg(t, 0, 4.4)); return PW.cam({ dz: .75 * k, dx: .12 * k, dy: -.05 * k, crop: .9 }); };

    // ---------------- 2. порт ----------------
    const PP = makePlate({ plate: pP, h: 1.0, vp: [975, 572], fov: 50, left: [250, 625], fgs: [{ url: fP, depth: 3.6 }], far: { url: farP, depth: 60 }, tmax: 40 });
    const BP = placed(PP, [860, 742], 16, { grade: GRADE.P, L: [-.6, 1, .35] }, [.35, -.15]);
    const crane = craneHook({ grade: GRADE.P, L: [-.6, 1, .35] });
    const sP = set(PP, LOOK(0x0d2232, .022), withProps ? [BP.root, crane.group] : []);
    const camP = t => { const l = t - T.P, k = E.inOutSine(seg(l, 0, 4.6)); return PP.cam({ dx: lerp(-.2, .35, k), dz: .45 * k, tilt: lerp(1.2, -.4, k), crop: .9 }); };
    // коробка висит на крюке и опускается на асфальт к 2.6 с, затем крюк чуть отпускает стропы
    const LAND = 2.6;
    function portPose(l) {
      const k = seg(l, 0, LAND), y = 3.2 * (1 - E.outCubic(k)), sway = .05 * Math.sin(l * 2.3) * (1 - k);
      BP.h.position.set(0, y, 0); BP.h.rotation.z = sway; BP.h.rotation.x = sway * .5;
      for (const s of BP.root.userData.shadows) { const a = clamp(1 - y / 2.6); s.material.opacity = a; s.scale.setScalar(1 + y * .25); }
      const top = BP.h.userData.top, hookY = y + top + 1.05 + .25 * smoothUp(l);
      const wp = v => BP.root.localToWorld(v);
      BP.root.updateMatrixWorld(true);
      const corners = [[-.56, -.46], [.56, -.46], [.56, .46], [-.56, .46]].map(([x, z]) => wp(V(x, y + .13, z)));
      crane.update(wp(V(0, hookY, 0)), corners);
    }
    const smoothUp = l => E.inOutSine(seg(l, LAND + .5, LAND + 1.6));

    // ---------------- 3. контейнер ----------------
    const PC = makePlate({ plate: pC, h: .7, vp: [882, 523], fov: 50, left: [400, 700], right: [1400, 716], back: [882, 652], ceil: 2.43,
      fgs: [{ url: fC, depth: 1.5 }], far: { url: farC, depth: 45 } });
    const BC = placed(PC, [880, 706], -16, { grade: GRADE.C, L: [.1, .7, -1], rim: { dir: [-1, .3, .2], color: '#e9a24e', k: .55 } }, [.0, .45]);
    const sC = set(PC, LOOK(0x0a2a36, .04), withProps ? [BC.root] : []);
    const camC = t => { const k = E.inOutSine(seg(t - T.C, 0, 4)); return PC.cam({ dz: .35 * k, dx: lerp(-.08, .08, k), crop: .9 }); };

    // ---------------- 4. дата-центр ----------------
    const PD = makePlate({ plate: pD, h: 1.2, vp: [870, 460], fov: 50, left: [365, 650], right: [1300, 610], back: [870, 522], ceil: 3.2,
      fgs: [{ url: fD0, depth: 2.0 }, { url: fD1, depth: 3.35 }] });
    const BD = placed(PD, [715, 708], 20, { grade: GRADE.D, L: [.15, 1, .25], rim: { dir: [0, .4, -1], color: '#5fd6d6', k: .35 } }, [-.1, .2]);
    const sD = set(PD, LOOK(0x0a4a58, .035), withProps ? [BD.root] : []);
    const camD = t => { const k = E.inOutSine(seg(t - T.D, 0, 4.5)); return PD.cam({ dx: lerp(-.15, .15, k), dz: .6 * k, crop: .9 }); };

    // дождь (2D) — поверх порта, как на рисованных фонах: тонкие косые штрихи
    const W = 1920, H = 1080, rain = [];
    { let s = 9; const r = () => (s = (s * 16807) % 2147483647) / 2147483647; for (let i = 0; i < 260; i++) rain.push([r() * W * 1.2, r() * H, 20 + r() * 34, .07 + r() * .12, .8 + r() * .5]); }
    function drawRain(x, t, a) {
      x.save(); x.lineCap = 'round'; x.lineWidth = 1.6;
      for (const [x0, y0, len, al, sp] of rain) {
        const y = (y0 + t * 1400 * sp) % (H + 60) - 30, xx = (((x0 - t * 220 * sp) % (W * 1.2)) + W * 1.2) % (W * 1.2);
        x.strokeStyle = `rgba(150,195,230,${(al * a).toFixed(3)})`; x.beginPath(); x.moveTo(xx, y); x.lineTo(xx - len * .2, y + len); x.stroke();
      }
      x.restore();
    }
    // whip-pan на склейке склад -> порт: кадр уезжает влево с размазкой, следующий въезжает справа
    function whip(f) {
      const at = T.P, d = .22, t = f.t; let s = 0;
      if (t > at - d && t < at) s = -900 * Math.pow((t - (at - d)) / d, 2.4);
      else if (t >= at && t < at + d) s = 900 * Math.pow(1 - (t - at) / d, 2.4);
      if (Math.abs(s) < 1) return;
      const x = f.ctx, snap = f.stage.snapshot(), n = 28, L = Math.abs(s) * .8 + 20;
      stage.resetCtx(); x.fillStyle = '#05070d'; x.fillRect(0, 0, W, H); x.filter = Math.abs(s) > 40 ? 'blur(3px)' : 'none';
      for (let i = 0; i < n; i++) { const off = s + (i / (n - 1) - .5) * L; x.globalAlpha = 1 / (i + 1);
        for (const k of [-1, 0, 1]) x.drawImage(snap, ((off % W) + k * W), 0); }
      x.globalAlpha = 1; x.filter = 'none';
    }

    const scenes = [
      { id: 'warehouse', from: T.W, to: T.P, set: sW, camera: camW, over(t, f) { whip(f); } },
      { id: 'port', from: T.P, to: T.C, set: sP, camera: camP, update(t) { portPose(t - T.P); },
        over(t, f) { drawRain(f.ctx, t, .9); whip(f); } },
      { id: 'container', from: T.C, to: T.D, set: sC, camera: camC },
      { id: 'datacenter', from: T.D, to: T.END, set: sD, camera: camD },
    ];
    const only = scenes.find(s => s.id === o.shot);
    if (only) { const d = only.to - only.from; return { duration: d, scenes: [{ ...only, from: 0, to: d, camera: t => only.camera(t + only.from), update: only.update && (t => only.update(t + only.from)), over: only.over && ((t, f) => only.over(t + only.from, { ...f, t: t + only.from })) }] }; }
    return { duration: T.END, scenes, transitions: [{ at: T.D, type: 'dip', dur: .5, color: '#03050b' }] };
  },
};
