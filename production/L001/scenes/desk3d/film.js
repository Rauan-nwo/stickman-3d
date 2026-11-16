// desk3d/film.js — L001 #25 «звонок из Вашингтона»: стол крупно, 3D (тип B: рисованная стена-плита + 3D-стол и предметы).
// Тёмный деревянный стол с зелёным сукном, зелёная банкирская лампа, бежевый дисковый телефон звонит (трубка дребезжит
// на рычагах, звонок — маленькие 2D-дуги), папки с красными лентами, за жалюзи — ночной Капитолий. Медленный наезд.
// Свет и палитра — по production/L001/assets/bg_washington_cold.png (холодная ночь, единственный тёплый свет — лампа).
//   --set dur=6         длительность (с), звонки — серии по 1 с через 1 с, от 0.35 с
//   --set plate=old     стена из исходного bg_washington_cold (кроп), без новой плиты
import { THREE, V, clamp, seg, E } from 'engine';
import { paint, emit, rbox, rcyl, lathe, extrude, decal, inked, edges, glow, hazeCard, noirLook, camSpline, platePlane, setRes, vibeMarks, roundRectShape, tex } from 'engine/sets/noirInteriors.js';
import plateWall from './assets/plate_wall.png';
import plateCold from '../../assets/bg_washington_cold.png';

const TOP = .76;                                   // столешница
const PI = Math.PI;

export default {
  fps: 30, size: [1920, 1080],
  options: { dur: 6, plate: 'new' },
  setup(stage, o) {
    const DUR = +o.dur || 6; setRes(stage.W, stage.H);
    stage.renderer.toneMapping = THREE.NoToneMapping;
    stage.setVignette({ alpha: .62, color: '3,5,14', inner: .38, outer: 1.0, cy: .5 });
    const G = new THREE.Group(); stage.add(G);

    // ---------- свет ----------
    const hemi = new THREE.HemisphereLight(0x3a5a94, 0x0c0f1c, 1.15); G.add(hemi);
    const moon = new THREE.DirectionalLight(0x8fb4ff, 1.05); moon.position.set(1.6, 3.2, -3.2); moon.target.position.set(0, TOP, 0);
    moon.castShadow = true; moon.shadow.mapSize.set(2048, 2048); moon.shadow.bias = -.0006; moon.shadow.normalBias = .01;
    Object.assign(moon.shadow.camera, { left: -1.4, right: 1.4, top: 1.2, bottom: -1.2, near: .5, far: 9 }); moon.shadow.camera.updateProjectionMatrix();
    G.add(moon, moon.target);

    // ---------- стена: плита GPT ----------
    const useOld = o.plate === 'old';
    const WALLZ = -2.3;
    const wall = useOld
      ? platePlane(G, plateCold, 4.6, 4.6 * 520 / 1920 * (1920 / 1920) * 1.0, V(.1, 1.75, WALLZ), { crop: [0, 0, 1920, 520], blur: .8 })
      : platePlane(G, plateWall, 4.6, 4.6 * 9 / 16, V(-.05, .78, WALLZ), { blur: .9 });

    // ---------- стол ----------
    const wood = paint(0x3b2a26, { amp: .2, freq: 1.6, vert: [.2, .74, .35] }), woodDk = paint(0x241917, { amp: .12, freq: 2 });
    rbox(G, 2.3, .05, 1.05, wood, 0, TOP - .025, 0, { r: .014, px: 4.5 });                 // столешница
    rbox(G, 2.2, .1, .98, woodDk, 0, TOP - .1, 0, { r: .01, px: 3 });                       // царга
    rbox(G, 2.1, .62, .9, woodDk, 0, TOP - .46, -.04, { r: .02, px: 3 });
    for (const x of [-.7, 0, .7]) rbox(G, .62, .4, .02, paint(0x2e201d, { amp: .1 }), x, TOP - .44, .415, { r: .008, px: 2.5 });   // филёнки ящиков
    // сукно с золотой кромкой
    const felt = paint(0x1f5a36, { amp: .22, freq: 1.3, coolAmt: .5, vert: [-9, -8, 0] });
    rbox(G, 1.86, .006, .78, felt, 0, TOP + .003, -.02, { r: .003, px: 2, edge: 1.4 });
    rbox(G, 1.9, .004, .82, paint(0x8a6a2e, { amp: .06 }), 0, TOP + .001, -.02, { r: .002, ink: false });

    // ---------- кресло за столом (бордовая кожа, вертикальные валики) ----------
    const lea = paint(0x5c1d26, { amp: .14, freq: 3, vert: [.6, 1.3, .3] }), leaDk = paint(0x3e1219, { amp: .1 });
    const chair = new THREE.Group(); chair.position.set(-.62, -.16, -1.0); chair.scale.setScalar(.82); G.add(chair);
    rbox(chair, .78, .78, .16, leaDk, 0, 1.0, 0, { r: .07, px: 4 });
    for (let i = 0; i < 4; i++) rbox(chair, .17, .62, .07, lea, -.255 + i * .17, 1.0, .09, { r: .05, px: 2.5, edge: 0 });
    rbox(chair, .66, .14, .1, lea, 0, 1.4, .06, { r: .05, px: 3 });

    // ---------- банкирская лампа ----------
    const brass = paint(0xb8893e, { amp: .1, freq: 5 }), brassDk = paint(0x7a5524, { amp: .08 });
    const lamp = new THREE.Group(); lamp.position.set(-.5, TOP, -.16); lamp.rotation.y = .18; G.add(lamp);
    lathe(lamp, [[0, 0], [.11, 0], [.115, .012], [.1, .03], [.05, .045], [.025, .07], [0, .075]], brass, 0, 0, 0, { px: 3.5 });
    rcyl(lamp, .011, .011, .32, brass, 0, .22, 0, { px: 2.5 });
    rbox(lamp, .05, .03, .03, brassDk, 0, .385, 0, { r: .01, px: 2.5 });
    // абажур: зелёная стеклянная полутруба (выдавленный профиль-полукольцо), торцы чуть темнее
    const sh = new THREE.Shape(); const R0 = .085, R1 = .075;
    sh.absarc(0, 0, R0, 0, PI, false); sh.lineTo(-R1, 0); sh.absarc(0, 0, R1, PI, 0, true); sh.lineTo(R0, 0);
    const shadeMat = paint(0x1f7a46, { amp: .12, freq: 6, emissive: 0x164d2a });
    const shade = extrude(lamp, sh, .36, shadeMat, 0, .4, 0, { ry: PI / 2, bevel: .006, px: 4, edge: 1.6 });
    rbox(lamp, .37, .008, .015, brass, 0, .4, .081, { r: .003, px: 1.5, edge: 0 });                    // латунная кромка
    rbox(lamp, .37, .008, .015, brass, 0, .4, -.081, { r: .003, px: 1.5, edge: 0 });
    // тёплое нутро абажура и лампочка
    const inner = new THREE.Mesh(new THREE.PlaneGeometry(.32, .13), emit(0xffd28a, 1.9)); inner.rotation.x = PI / 2; inner.position.set(0, .398, 0); lamp.add(inner);
    const bulbG = glow(lamp, V(0, .38, 0), { size: .26, color: 0xffc070, opacity: .9 });
    // цепочка с бусиной
    rcyl(lamp, .0025, .0025, .12, brassDk, .06, .33, .09, { ink: false });
    rcyl(lamp, .009, .009, .014, brass, .06, .265, .09, { px: 1.5, edge: 0 });
    const lampL = new THREE.SpotLight(0xffb45e, 3.0, 2.6, 1.15, .75, 1); lampL.castShadow = true; lampL.shadow.mapSize.set(1024, 1024); lampL.shadow.bias = -.003; lampL.shadow.normalBias = .02; lampL.shadow.camera.near = .02;
    const lampWorld = V(-.5, TOP + .37, -.12); lampL.position.copy(lampWorld); lampL.target.position.set(-.1, TOP, .1); G.add(lampL, lampL.target);
    // мягкое тёплое пятно на сукне (рисованный «бассейн» света под лампой)
    const pool = new THREE.Mesh(new THREE.CircleGeometry(.62, 48), new THREE.MeshBasicMaterial({ color: 0xffa94e, transparent: true, opacity: .2, blending: THREE.AdditiveBlending, depthWrite: false, map: tex(256, 256, (x, w) => { const g = x.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); g.addColorStop(0, '#fff'); g.addColorStop(.45, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, w, w); }) }));
    pool.rotation.x = -PI / 2; pool.position.set(-.36, TOP + .0075, -.02); pool.scale.set(1.25, .8, 1); pool.renderOrder = 2; G.add(pool);

    // ---------- телефон ----------
    const beige = paint(0xd8c49c, { amp: .1, freq: 5, vert: [TOP, TOP + .1, .18] }), beigeDk = paint(0xa89270, { amp: .08, freq: 5 });
    const phone = new THREE.Group(); phone.position.set(.04, TOP, .04); phone.rotation.y = -.12; G.add(phone);
    // корпус: профиль сбоку (u — вперёд, v — вверх), выдавлен поперёк
    const pf = new THREE.Shape(); pf.moveTo(-.12, 0); pf.lineTo(.125, 0); pf.lineTo(.125, .038); pf.quadraticCurveTo(.12, .05, .105, .056); pf.lineTo(.035, .098);
    pf.quadraticCurveTo(.02, .106, 0, .106); pf.lineTo(-.085, .104); pf.quadraticCurveTo(-.115, .1, -.12, .07); pf.lineTo(-.12, 0);
    extrude(phone, pf, .23, beige, 0, .006, 0, { ry: -PI / 2, bevel: .014, px: 4.5, edge: 1.8 });
    rbox(phone, .25, .012, .26, beigeDk, 0, .006, 0, { r: .005, px: 2.5, edge: 0 });                 // подошва
    // диск набора на скате: кольцо с 10 отверстиями (текстура) + рамка
    const dialT = tex(512, 512, (x, w) => {
      x.fillStyle = '#e9dcbc'; x.beginPath(); x.arc(256, 256, 250, 0, 7); x.fill();
      x.fillStyle = '#c9b48c'; x.beginPath(); x.arc(256, 256, 250, 0, 7); x.arc(256, 256, 206, 0, 7, true); x.fill();
      for (let i = 0; i < 10; i++) { const a = -PI * .38 - i * .52, r = 170; x.fillStyle = '#2a2220'; x.beginPath(); x.arc(256 + Math.cos(a) * r, 256 + Math.sin(a) * r, 40, 0, 7); x.fill(); x.fillStyle = '#5a4a40'; x.beginPath(); x.arc(256 + Math.cos(a) * r - 6, 256 + Math.sin(a) * r - 6, 24, 0, 7); x.fill(); }
      x.fillStyle = '#f7f0dc'; x.beginPath(); x.arc(256, 256, 92, 0, 7); x.fill(); x.lineWidth = 10; x.strokeStyle = '#2a2220'; x.stroke();
      x.lineWidth = 14; x.beginPath(); x.arc(256, 256, 248, 0, 7); x.stroke();
      x.lineWidth = 9; x.strokeStyle = '#3a2e28'; x.beginPath(); x.moveTo(256 + 210, 256 + 40); x.lineTo(256 + 236, 256 + 90); x.stroke();   // упор пальца
    });
    const dial = new THREE.Group(); dial.position.set(0, .006 + .077 + .006, .07 + .004); dial.rotation.x = .56; phone.add(dial);
    rcyl(dial, .052, .054, .012, beigeDk, 0, 0, 0, { px: 3, seg: 40 });
    const dface = new THREE.Mesh(new THREE.CircleGeometry(.05, 48), paint(0xffffff, { map: dialT, amp: .04 })); dface.rotation.x = -PI / 2; dface.position.y = .0065; dial.add(dface);
    // рычаги
    for (const x of [-.075, .075]) rbox(phone, .03, .03, .05, beigeDk, x, .006 + .112, -.035, { r: .01, px: 2.5 });
    // трубка: ручка + наушник и микрофон (дребезжит как одно целое)
    const hs = new THREE.Group(); hs.position.set(0, .006 + .128, -.035); phone.add(hs);
    const hsk = new THREE.Group(); hs.add(hsk);
    const bar = new THREE.Shape(); bar.moveTo(-.14, -.012); bar.quadraticCurveTo(0, .03, .14, -.012); bar.lineTo(.14, .012); bar.quadraticCurveTo(0, .056, -.14, .012); bar.lineTo(-.14, -.012);
    extrude(hsk, bar, .046, beige, 0, .0, 0, { bevel: .012, px: 4, edge: 1.6 });
    for (const sx of [-1, 1]) {
      lathe(hsk, [[0, -.03], [.03, -.03], [.042, -.018], [.036, .006], [.022, .016], [0, .016]], beige, sx * .135, -.004, 0, { px: 4, seg: 32 });
      const holes = new THREE.Mesh(new THREE.CircleGeometry(.026, 32), paint(0x8d7a5c, { amp: .05 })); holes.rotation.x = PI / 2; holes.position.set(sx * .135, -.035, 0); hsk.add(holes);
    }
    // витой шнур: спираль вокруг кривой от бока корпуса по сукну к концу трубки
    const base = new THREE.CatmullRomCurve3([V(-.115, .03, .02), V(-.16, .012, .07), V(-.22, .01, .12), V(-.25, .012, .04), V(-.205, .05, -.04), V(-.16, .1, -.04)]);
    const coil = [], N = 900, turns = 70;
    for (let i = 0; i <= N; i++) { const u = i / N, p = base.getPointAt(u), tg = base.getTangentAt(u), nn = new THREE.Vector3(0, 1, 0).cross(tg).normalize(), bb = tg.clone().cross(nn).normalize(), a = u * turns * PI * 2;
      coil.push(p.clone().addScaledVector(nn, Math.cos(a) * .009).addScaledVector(bb, Math.sin(a) * .009)); }
    const cordGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(coil), 1800, .0034, 6, false);
    inked(phone, cordGeo, beige, { px: 1.6, edge: 0, wob: .1 });

    // ---------- папки с красными лентами ----------
    const covers = [0xc8ad7c, 0xa8885a, 0x8c8f88, 0xbfa06e], red = paint(0x8e1f26, { amp: .12, freq: 6 }), pages = paint(0xe8dfc8, { amp: .05 });
    const stack = new THREE.Group(); stack.position.set(.6, TOP, -.08); stack.rotation.y = -.1; G.add(stack);
    let y = 0; const hd = [];
    [[.36, .26, .03, 0], [.35, .25, .026, .05], [.37, .26, .034, -.04], [.34, .245, .024, .03]].forEach(([w, d, h, ry], i) => {
      const f = new THREE.Group(); f.position.set((i % 2 ? .008 : -.006), y, (i % 2 ? -.006 : .004)); f.rotation.y = ry; stack.add(f);
      const cm = paint(covers[i], { amp: .1, freq: 5 });
      rbox(f, w, .005, d, cm, 0, .0025, 0, { r: .002, px: 2.5, edge: 0 });
      rbox(f, w - .012, h - .01, d - .01, pages, -.004, .005 + (h - .01) / 2, 0, { r: .003, px: 2, edge: 0 });
      rbox(f, w, .005, d, cm, 0, h - .0025, 0, { r: .002, px: 2.5, edge: 0 });
      hd.push([y, h]); y += h + .001;
    });
    for (const z of [0]) {                                                                           // красная лента поперёк пачки
      rbox(stack, .05, y + .006, .275, red, .02, y / 2, z, { r: .004, px: 2.5, edge: 0 });
    }
    rbox(stack, .05, .004, .275, red, .02, y + .004, 0, { r: .002, ink: false });
    // ручка на сукне и стакан с ручками
    const pen = new THREE.Group(); pen.position.set(.32, TOP + .011, .27); pen.rotation.y = .42; G.add(pen);
    rcyl(pen, .0085, .0085, .15, paint(0x14161f, { amp: .05 }), 0, 0, 0, { rz: PI / 2, px: 2.5 });
    rcyl(pen, .0085, .002, .03, paint(0xc9a050), .09, 0, 0, { rz: -PI / 2, px: 2 });
    rcyl(pen, .0088, .0088, .012, paint(0xc9a050), -.03, 0, 0, { rz: PI / 2, px: 2, edge: 0 });
    const cup = new THREE.Group(); cup.position.set(-.86, TOP, -.22); G.add(cup);
    rbox(cup, .09, .12, .09, paint(0x1a1c26, { amp: .1 }), 0, .06, 0, { r: .01, px: 3.5 });
    for (const [dx, a, c] of [[-.015, .12, 0x1a2a58], [.016, -.1, 0x14161f]]) { const p = new THREE.Group(); p.position.set(dx, .12, 0); p.rotation.z = a; cup.add(p); rcyl(p, .006, .006, .13, paint(c), 0, .03, 0, { px: 2 }); rcyl(p, .0062, .0062, .03, paint(0xc9a050), 0, .085, 0, { px: 2, edge: 0 }); }

    // полосы лунного света от жалюзи на столе (справа сзади, мягкие)
    const stripeT = tex(64, 512, (x, w, h) => { for (let i = 0; i < 9; i++) { const g = x.createLinearGradient(0, i * 56, 0, i * 56 + 30); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, i * 56, w, 30); } });
    const stripes = new THREE.Mesh(new THREE.PlaneGeometry(.9, 1.0), new THREE.MeshBasicMaterial({ map: stripeT, color: 0x4f78c8, transparent: true, opacity: .08, blending: THREE.AdditiveBlending, depthWrite: false }));
    stripes.rotation.set(-PI / 2, 0, .6); stripes.scale.set(.7, .6, 1); stripes.position.set(.55, TOP + .0078, -.16); stripes.renderOrder = 2; G.add(stripes);

    // дымка между столом и стеной
    hazeCard(G, V(.2, 1.3, -1.5), { w: 6, h: 2.6, color: 0x2a4a80, opacity: .1 });
    hazeCard(G, V(-.5, 1.1, -.4), { w: 1.6, h: 1.2, color: 0xff9a40, opacity: .05 });

    // ---------- звонок ----------
    // серии по 1 с через 1 с; внутри серии дребезг трубки ~22 Гц, огибающая — быстрый набор и спад
    const ringK = t => { if (t < .35) return 0; const c = (t - .35) % 2.0; if (c > 1.0) return 0; return Math.min(1, c / .05) * Math.min(1, (1.0 - c) / .08); };
    const jig = (t, s) => Math.sin(t * 2 * PI * 22 + s) * .6 + Math.sin(t * 2 * PI * 31 + s * 2.3) * .4;

    // камера: медленный наезд с лёгким подъёмом к телефону; плавные разгон и торможение
    const CAM = [
      [0, [.16, 1.17, 1.32, .02, .86, -.12, 38]],
      [DUR * .5, [.13, 1.13, 1.18, .03, .862, -.12, 37.5]],
      [DUR, [.1, 1.09, 1.03, .04, .865, -.12, 37]],
    ];
    const LOOK = noirLook({ fogColor: 0x0b1730, fogDensity: .09, bloom: .55, bloomThreshold: .9, bloomRadius: .55,
      grade: { sat: .9, tint: [.93, .99, 1.09], lift: [.01, .016, .038], contrast: 1.06 } });
    const set = { group: G, look: LOOK, tick() { wall.ready(); } };

    let hsEnds = [V(-.135, 0, 0), V(.135, 0, 0)];
    return {
      duration: DUR,
      scenes: [{
        id: 'desk', from: 0, to: DUR, set, camera: t => camSpline(CAM, t),
        update(t) {
          const k = ringK(t);
          // трубка подпрыгивает на рычагах: крен и подскок, в паузах лежит ровно
          hsk.rotation.z = k * .045 * jig(t, 0); hsk.rotation.x = k * .03 * jig(t, 1.7); hsk.position.y = k * .006 * Math.max(0, jig(t, .4));
          phone.position.x = .04 + k * .0012 * jig(t, 2.9);
          // лампа чуть «дышит» от сети
          lampL.intensity = 3.0 * (1 + .015 * Math.sin(t * 7.3));
        },
        over(t, f) {
          const k = ringK(t); if (k < .02) return;
          const ctx = stage.ctx; hsk.updateMatrixWorld(true);
          const pa = stage.project(hsEnds[0].clone().add(V(0, .02, 0)).applyMatrix4(hsk.matrixWorld)), pb = stage.project(hsEnds[1].clone().add(V(0, .02, 0)).applyMatrix4(hsk.matrixWorld));
          const s = stage.pxs() / pa[2] * .001;                                 // пикселей на мм
          const fl = .75 + .25 * Math.abs(jig(t * .5, 3));                       // дуги пульсируют в такт
          vibeMarks(ctx, pa[0] - 6 * s, pa[1] - 4 * s, -1, k * fl, { r: 30 * s, gap: 15 * s, lw: Math.max(3.5, 3.6 * s), n: 3, span: 1.0, rot: .35 });
          vibeMarks(ctx, pb[0] + 6 * s, pb[1] - 4 * s, 1, k * fl, { r: 30 * s, gap: 15 * s, lw: Math.max(3.5, 3.6 * s), n: 3, span: 1.0, rot: -.35 });
        },
      }],
    };
  },
};
