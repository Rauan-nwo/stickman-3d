// conveyor/film.js — L001 #80 (глава 3): «Nvidia сделала медленные версии для Китая — их запретили; сделала ещё медленнее —
// запретили и её (апрель 2025)». Конвейер лаборатории везёт платы-ускорители (зелёная полоса, без логотипа); каждая следующая
// меньше и с меньшим числом светящихся ядер (16 -> 9 -> 4). Под красным прессом штамп STOP бьёт по каждой — три раза в ритм,
// ядра гаснут. Камера — боковой проезд вдоль конвейера (тип B: рисованная стена-плита GPT + 3D-конвейер и платы).
//   --set dur=9       длительность (с); три цикла «подъезд -> удар -> отъезд» по dur/3
import { THREE, V, clamp, seg, E } from 'engine';
import { paint, emit, rbox, rcyl, decal, glow, hazeCard, lampLight, noirLook, camSpline, platePlane, setRes, tex, inked } from 'engine/sets/noirInteriors.js';
import plateLab from './assets/plate_lab_v2.png';                  // светлая чистая стена лаборатории (prompts/plate_lab_v2.txt)

const PI = Math.PI, BELT = .86, P = 2.0;            // верх ленты; шаг между платами на ленте
const CHIPS = [{ w: 1.0, d: .62, n: 4 }, { w: .7, d: .434, n: 3 }, { w: .45, d: .28, n: 2 }];      // 100 % / 70 % / 45 %

export default {
  fps: 30, size: [1920, 1080],
  options: { dur: 9 },
  setup(stage, o) {
    const DUR = +o.dur || 9, T = DUR / 3; setRes(stage.W, stage.H);
    stage.renderer.toneMapping = THREE.NoToneMapping;
    stage.setVignette({ alpha: .56, color: '4,7,16', inner: .38, outer: 1.0, cy: .48 });
    const G = new THREE.Group(); stage.add(G);

    // ---------- свет ----------
    G.add(new THREE.HemisphereLight(0x4f6f9e, 0x111827, 1.05));                                            // нуар: тёмно-синяя заливка, тени уходят в навы
    const rim = new THREE.DirectionalLight(0x5fd2cc, .85); rim.position.set(-1, 3, -4); G.add(rim, rim.target);             // бирюза от стекла чистой комнаты
    const key = new THREE.DirectionalLight(0xbcd2ff, .38); key.position.set(1.5, 4, 2.5); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
    key.shadow.bias = -.0005; key.shadow.normalBias = .01; Object.assign(key.shadow.camera, { left: -5, right: 5, top: 3, bottom: -3, near: .5, far: 12 }); key.shadow.camera.updateProjectionMatrix(); G.add(key, key.target);

    // ---------- стена: плита GPT ----------
    const wall = platePlane(G, plateLab, 12.4, 12.4 * 9 / 16, V(.3, 1.81, -4.6), { blur: .6, tint: '#5f7090' });                     // плита утоплена в навы/бирюзу нуара

    // пол
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 12), paint(0x1d2838, { amp: .2, freq: .7 })); floor.rotation.x = -PI / 2; floor.position.set(0, 0, -1); floor.receiveShadow = true; G.add(floor);
    for (const z of [.95, -.95]) decal(G, 20, .07, paint(0xc9a23a, { amp: .12 }), 0, .003, z, { rx: -PI / 2 });          // жёлтая разметка вдоль конвейера

    // ---------- конвейер ----------
    const metal = paint(0x3a4558, { amp: .14, freq: 2.4 }), metalDk = paint(0x232a38, { amp: .1 }), steel = paint(0x8a96a8, { amp: .08, freq: 5 });
    const L = 16, W = .78;
    for (const z of [W / 2 + .05, -W / 2 - .05]) rbox(G, L, .12, .07, metal, 0, BELT - .04, z, { r: .02, px: 3.5 });       // борта
    for (let x = -7.5; x <= 7.5; x += 1.5) for (const z of [W / 2 + .04, -W / 2 - .04]) rbox(G, .07, BELT - .1, .07, metalDk, x, (BELT - .1) / 2, z, { r: .015, px: 3 });   // ноги
    for (let x = -7.5; x <= 7.5; x += 1.5) rbox(G, .05, .05, W + .1, metalDk, x, .25, 0, { r: .01, px: 2.5 });
    // лента: тёмная резина с поперечными швами, текстура едет вместе с лентой
    const beltT = tex(64, 512, (x, w, h) => { x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, h); x.fillStyle = 'rgba(0,0,0,.38)'; for (let i = 0; i < 8; i++) x.fillRect(0, i * 64, w, 6); x.fillStyle = 'rgba(0,0,0,.08)'; for (let i = 0; i < 8; i++) x.fillRect(0, i * 64 + 30, w, 3); });
    beltT.wrapS = beltT.wrapT = THREE.RepeatWrapping; beltT.repeat.set(1, L / 1.0); beltT.rotation = PI / 2;
    const belt = new THREE.Mesh(new THREE.BoxGeometry(L, .04, W), paint(0x2a2f3b, { amp: .1, map: beltT })); belt.position.set(0, BELT - .02, 0); belt.receiveShadow = true; G.add(belt);
    // ролики на ближнем торце (видно, как крутятся)
    const rollers = [];
    const spokeT = tex(64, 64, (x, w) => { x.fillStyle = '#8a96a8'; x.fillRect(0, 0, w, w); x.fillStyle = '#2a3242'; x.fillRect(w / 2 - 5, 0, 10, w); });

    // ---------- пресс со штампом ----------
    const redM = paint(0xa3262c, { amp: .14, freq: 3 }), redDk = paint(0x6a1419, { amp: .1 }), yel = paint(0xd9a72e, { amp: .1 });
    const press = new THREE.Group(); G.add(press);
    rbox(press, .26, 1.95, .26, redDk, 0, .975, -.72, { r: .05, px: 4.5 }); rbox(press, .5, .06, .5, metalDk, 0, .03, -.72, { r: .02, px: 3 });   // колонна за лентой
    rbox(press, 1.0, .42, 1.05, redM, 0, 1.76, -.33, { r: .06, px: 5 });                                  // корпус-консоль над лентой                                      // корпус
    const hz = tex(512, 64, (x, w, h) => { for (let i = -2; i < 20; i++) { x.fillStyle = i % 2 ? '#141414' : '#e2b23a'; x.beginPath(); x.moveTo(i * 32, h); x.lineTo(i * 32 + 32, h); x.lineTo(i * 32 + 64, 0); x.lineTo(i * 32 + 32, 0); x.fill(); } });
    decal(press, .96, .07, paint(0xffffff, { map: hz, amp: .04 }), 0, 1.6, .1955, { ink: 1.5 });
    // табличка STOP на корпусе (читается сбоку)
    const plaqueT = tex(512, 192, (x, w, h) => { x.fillStyle = '#efe6cf'; x.fillRect(0, 0, w, h); x.fillStyle = '#b3121f'; x.font = '900 136px "Arial Black", Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('STOP', w / 2, h / 2 + 6); x.lineWidth = 14; x.strokeStyle = '#141014'; x.strokeRect(7, 7, w - 14, h - 14); });
    decal(press, .4, .15, paint(0xffffff, { map: plaqueT, amp: .04 }), 0, 1.79, .1955, { ink: 1.8 });
    const lampR = new THREE.Mesh(new THREE.SphereGeometry(.045, 16, 10), emit(0xff2a20, .3)); lampR.position.set(.13, 2.0, .05); press.add(lampR);
    const lampG = new THREE.Mesh(new THREE.SphereGeometry(.045, 16, 10), emit(0x5cff6a, .3)); lampG.position.set(-.01, 2.0, .05); press.add(lampG);
    const lampRG = glow(press, V(.13, 2.0, .08), { size: .5, color: 0xff3020, opacity: 0 });
    // шток и штамп
    const ram = new THREE.Group(); ram.position.z = 0; press.add(ram);
    rcyl(ram, .055, .055, .7, steel, 0, .35, 0, { px: 3 });
    rbox(ram, .94, .12, .6, redM, 0, .02, 0, { r: .03, px: 4.5 });
    rbox(ram, .92, .03, .58, paint(0x3a0d10, { amp: .06 }), 0, -.055, 0, { r: .01, px: 3 });              // резина
    const UP = 1.3;                                                                                       // низ штампа в покое

    // жёлто-чёрная полоса по ближнему борту ленты
    const hzRail = hz.clone(); hzRail.wrapS = THREE.RepeatWrapping; hzRail.repeat.set(14, 1); hzRail.needsUpdate = true;
    decal(G, L, .045, paint(0xffffff, { map: hzRail, amp: .06 }), 0, BELT - .04, W / 2 + .05 + .0365, { ink: 1.2 });
    // ---------- платы ----------
    // три платы-модуля (без кулера и без названий): зелёная PCB, золотые контакты спереди, кристалл с сеткой ядер
    // 4x4 / 3x3 / 2x2 по центру, чипы памяти по бокам, тонкая зелёная полоса-акцент сзади. Ядра — MeshBasic с яркостью
    // ниже порога bloom: читаются квадратами, не расплываются. Оттиск STOP — красная краска поверх кристалла.
    const stampT = tex(1024, 512, (x, w, h) => {
      x.clearRect(0, 0, w, h); const red = 'rgba(214,24,32,1)';
      x.lineJoin = 'round'; x.strokeStyle = 'rgba(40,6,10,.85)'; x.lineWidth = 46; x.beginPath(); x.roundRect(30, 30, w - 60, h - 60, 40); x.stroke();
      x.strokeStyle = red; x.lineWidth = 30; x.beginPath(); x.roundRect(30, 30, w - 60, h - 60, 40); x.stroke();
      x.font = '900 300px "Arial Black", Arial'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.lineWidth = 22; x.strokeStyle = 'rgba(40,6,10,.85)'; x.strokeText('STOP', w / 2, h / 2 + 14); x.fillStyle = red; x.fillText('STOP', w / 2, h / 2 + 14);
      x.globalCompositeOperation = 'destination-out'; let s = 7; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < 420; i++) { x.globalAlpha = .2 + r() * .5; x.beginPath(); x.arc(r() * w, r() * h, 1 + r() * 7, 0, 7); x.fill(); }
    });
    const dieTex = n => tex(512, 512, (x, w) => {
      x.fillStyle = '#0c131c'; x.fillRect(0, 0, w, w); const pad = 34, cs = (w - 2 * pad) / n, g = cs * .14;
      for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) { const x0 = pad + a * cs + g, y0 = pad + b * cs + g, s = cs - 2 * g;
        x.fillStyle = '#58dcc4'; x.fillRect(x0, y0, s, s); x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(x0, y0, s, s * .18); x.fillStyle = 'rgba(0,40,40,.35)'; x.fillRect(x0, y0 + s * .82, s, s * .18); }
      x.strokeStyle = '#9aa6b6'; x.lineWidth = 14; x.strokeRect(7, 7, w - 14, w - 14);
    });
    const pcbT = tex(512, 512, (x, w) => { x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, w); x.strokeStyle = 'rgba(150,230,170,.35)'; x.lineWidth = 3;
      let s = 3; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < 40; i++) { const y = r() * w, x0 = r() * w; x.beginPath(); x.moveTo(x0, y); x.lineTo(x0 + 60 + r() * 120, y); x.lineTo(x0 + 90 + r() * 140, y + (r() - .5) * 80); x.stroke(); }
      x.fillStyle = 'rgba(210,180,90,.6)'; for (let i = 0; i < 70; i++) { x.beginPath(); x.arc(r() * w, r() * w, 3, 0, 7); x.fill(); } });
    const chips = CHIPS.map((c, i) => {
      const g = new THREE.Group(); G.add(g);
      const pcb = paint(0x2f8a52, { amp: .1, freq: 5, map: pcbT });
      rbox(g, c.w, .03, c.d, pcb, 0, .015, 0, { r: .008, px: 3.2 });                                         // плата
      for (let k = 0; k < 18; k++) decal(g, c.w * .9 / 18 * .62, c.d * .09, paint(0xe0b24a, { amp: .04 }), -c.w * .45 + (k + .5) * c.w * .9 / 18, .0305, c.d / 2 - c.d * .06, { rx: -PI / 2, receive: false });   // контакты
      decal(g, c.w * .9, c.d * .035, emit(0x4fd060, .85), 0, .0306, -c.d / 2 + c.d * .06, { rx: -PI / 2, receive: false });            // полоса-акцент
      const dw = Math.min(c.w * .5, c.d * .62), top = .03, dz = 0;
      rbox(g, dw + .04, .016, dw + .04, paint(0x8d99aa, { amp: .06, freq: 6 }), 0, top + .008, dz, { r: .006, px: 3 });   // рамка-подложка кристалла
      for (const sx of [-1, 1]) for (const k of [-1, 1]) rbox(g, dw * .3, .014, dw * .36, paint(0x161a22, { amp: .06 }), sx * (dw / 2 + .03 + dw * .2), top + .007, dz + k * dw * .22, { r: .004, px: 2.2 });   // память
      const dieM = new THREE.MeshBasicMaterial({ map: dieTex(c.n), color: new THREE.Color(1, 1, 1), toneMapped: false, fog: false });   // ядра не тонут в дымке
      const die = new THREE.Mesh(new THREE.PlaneGeometry(dw, dw), dieM); die.rotation.x = -PI / 2; die.position.set(0, top + .0165, dz); g.add(die);
      const imp = new THREE.Mesh(new THREE.PlaneGeometry(c.w * .9, c.w * .9 * .5), new THREE.MeshBasicMaterial({ map: stampT, transparent: true, opacity: 0, depthWrite: false, toneMapped: false, fog: false }));
      imp.rotation.set(-PI / 2, 0, .05 - i * .04); imp.position.set(0, top + .019, dz); imp.renderOrder = 4; g.add(imp);
      return { g, c, dieM, imp, top: top + .016 };
    });
    // ---------- свет над прессом, дымка, передний план ----------
    // тёплые практики: рабочая лампа над прессом (свет падает на место удара) + дальняя лампа слева
    for (const [x, y, z, k] of [[0, 2.62, .62, 1], [-4.2, 3.15, .1, .55]]) {
      const sh = new THREE.Group(); sh.position.set(x, y + .07, z); G.add(sh);
      rcyl(sh, .05, .24, .16, paint(0x2b3140), 0, 0, 0, { px: 3, open: true, seg: 24 }); rcyl(sh, .006, .006, 1.6, metalDk, 0, .82, 0, { ink: false });
      lampLight(G, V(x, y, z), { color: 0xffad55, intensity: 3.4 * k, dist: 4.5, decay: 1.3, glowSize: .55, glowOp: .75 * k, cone: { floorY: BELT, r0: .16, r1: .85, a: .055 * k } });
    }
    // тёплое пятно на ленте под прессом (под платами: они его закрывают, пятно — вокруг)
    const poolT = tex(256, 256, (x, w) => { const g = x.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); g.addColorStop(0, 'rgba(255,170,80,.55)'); g.addColorStop(.55, 'rgba(255,140,60,.22)'); g.addColorStop(1, 'rgba(255,120,40,0)'); x.fillStyle = g; x.fillRect(0, 0, w, w); });
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.15), new THREE.MeshBasicMaterial({ map: poolT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    pool.rotation.x = -PI / 2; pool.position.set(0, BELT + .001, .12); pool.renderOrder = 2; G.add(pool);
    hazeCard(G, V(0, 1.6, -2.5), { w: 14, h: 4, color: 0x24486a, opacity: .16 });
    hazeCard(G, V(0, 2.2, .1), { w: 3.2, h: 2.4, color: 0xff9a40, opacity: .035 });                       // тёплая дымка в конусе лампы
    const fg = new THREE.Group(); G.add(fg);
    for (const x of [-2.6, 1.9]) { rbox(fg, .12, 1.15, .12, yel, x, .575, 1.55, { r: .04, px: 4 });
      const bt = tex(64, 256, (cx, w, h) => { for (let i = 0; i < 8; i++) { cx.fillStyle = i % 2 ? '#151515' : '#e2b23a'; cx.fillRect(0, i * 32, w, 32); } });
      for (const s of [1, -1]) decal(fg, .1, 1.1, paint(0xffffff, { map: bt, amp: .05 }), x, .575, 1.55 + s * .0605, { ry: s > 0 ? 0 : PI }); }
    fg.visible = false;                                                                                    // ограждение убрано: жёлтый поручень резал кадр по диагонали                                   // поручень ограждения

    // ---------- время ----------
    // лента: в каждом цикле едет 0..0.42 T (разгон и торможение), стоит под прессом, удар в 0.55 T
    const beltPos = t => { let b = -P * 1.0; for (let c = 0; c < 3; c++) { const t0 = c * T, k = E.inOutSine(clamp((t - t0 - .02 * T) / (.38 * T))); b += P * k; } return b; };
    const HIT = c => c * T + .5 * T;
    const ramY = t => {                                                                                    // высота низа штампа
      let y = UP;
      for (let c = 0; c < 3; c++) { const d = t - (HIT(c) - .13); if (d < 0 || d > .62) continue; const cy = BELT + chips[c].top + .014;
        if (d < .13) y = UP + (cy - UP) * (d / .13) * (d / .13); else if (d < .3) y = cy - .008 * Math.sin((d - .13) / .17 * PI); else y = cy + (UP - cy) * E.inOutSine(clamp((d - .3) / .32)); }
      return y;
    };
    const lastHit = t => { let h = -1; for (let c = 0; c < 3; c++) if (t >= HIT(c)) h = c; return h; };

    // камера: боковой проезд слева направо, чуть сверху; прицел отстаёт — пресс остаётся в кадре
    // камера: боковой проезд слева направо сверху-сбоку; к каждой следующей (меньшей) плате подходит ближе — все три читаются
    const CAM = [[0, [-1.2, 2.6, 3.5, -.35, 1.35, 0, 34]], [HIT(0), [-.5, 2.55, 3.4, 0, 1.33, 0, 34]], [HIT(1), [-.15, 2.42, 3.05, 0, 1.32, 0, 33]], [HIT(2), [.18, 2.3, 2.78, 0, 1.32, 0, 32]], [DUR, [.32, 2.28, 2.72, .07, 1.32, 0, 32]]];   // верх пресса в кадре на всех планах
    const camera = t => {
      const s = camSpline(CAM, t), h = lastHit(t);
      if (h >= 0) { const d = t - HIT(h); if (d < .35) { const a = .012 * Math.exp(-d * 14) * Math.sin(d * 70); s.target[1] += a; s.pos[1] += a * .5; } }
      return s;
    };
    const LOOK = noirLook({ bg: 0x070b16, fogColor: 0x0f2032, fogDensity: .045, bloom: .5, bloomThreshold: .86, bloomRadius: .55,
      grade: { sat: .95, tint: [.94, .99, 1.07], lift: [.012, .02, .038], contrast: 1.06 } });
    const set = { group: G, look: LOOK, tick() { wall.ready(); } };

    return {
      duration: DUR,
      scenes: [{
        id: 'conveyor', from: 0, to: DUR, set, camera,
        update(t) {
          const b = beltPos(t);
          beltT.offset.y = -b / 1.0; for (const r of rollers) r.rotation.y = -b / .045;
          chips.forEach((ch, i) => {
            ch.g.position.set(b - i * P, BELT, 0);
            const hit = HIT(i), d = t - hit, on = d < 0 ? 1 : d < .5 ? [1, .25, .85, .15, .55, .05, .3, .05][Math.min(7, Math.floor(d * 16))] : 0;   // ядра гаснут с миганием
            const cm = .16 + .84 * on; ch.dieM.color.setRGB(cm, cm, cm);
            ch.imp.material.opacity = d < 0 ? 0 : Math.min(1, d / .03) * .96;
          });
          ram.position.y = ramY(t) + .07;
          // лампы на прессе: зелёная, пока лента едет; красная — вспышка на ударе
          const h = lastHit(t), red = h >= 0 ? Math.max(0, 1 - (t - HIT(h)) / .9) : 0, moving = Math.abs(beltPos(t + .03) - beltPos(t)) > 1e-4;
          lampR.material.color.setRGB(1 * (.3 + 2 * red), .16 * (.3 + 2 * red), .12 * (.3 + 2 * red)); lampRG.material.opacity = .7 * red;
          lampG.material.color.setRGB(.36 * (moving ? 1.8 : .3), (moving ? 1.8 : .3), .42 * (moving ? 1.8 : .3));
        },
        over(t) {
          // удар: короткие штрихи-«ударные линии» от точки контакта (6 кадров)
          const h = lastHit(t); if (h < 0) return; const d = t - HIT(h); if (d > .22) return;
          const ctx = stage.ctx, c = chips[h], p = stage.project(V(0, BELT + c.top + .02, .26)), s = stage.pxs() / p[2] * .001, k = 1 - d / .22;
          ctx.save(); ctx.lineCap = 'round';
          for (let i = 0; i < 7; i++) { const a = PI + (i / 6) * PI, r0 = (230 + 60 * (1 - k)) * s, r1 = r0 + 90 * s * k;
            const x0 = p[0] + Math.cos(a) * r0 * 1.3, y0 = p[1] + Math.sin(a) * r0 * .55, x1 = p[0] + Math.cos(a) * r1 * 1.3, y1 = p[1] + Math.sin(a) * r1 * .55;
            ctx.globalAlpha = k; ctx.strokeStyle = '#0b0d17'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
            ctx.strokeStyle = '#f3ead2'; ctx.lineWidth = 4.5; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); }
          ctx.restore();
        },
      }],
    };
  },
};
