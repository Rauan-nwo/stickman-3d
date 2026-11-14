// V001 «How Mine Salting Worked» — хук 0–3.7 с (111 кадров), 720x1280 @ 30 fps. Перенос теста hook2 на движок:
// только модули engine/, сам фильм — данные (ключи камеры, ружья, лица) и несколько функций постановки.
//   сцена A (0–2.0)   тёмный штрек: общий план → резкий наезд → крупно затвор, самородок в ствол → отъезд → подмигивание → выстрел
//   сцена B (2.0–3.7) светлая галерея: камера летит за самородком мимо напарника в стену, попадание на 3.12
// Параметр gun: '3d' (по умолчанию, как в hook2) — на средних планах 3D-модель ружья; '2d' — рисованное ружьё на средних
// планах, 3D остаётся только в крупном плане затвора (0.84–1.62) и в прицеливании в объектив (с 1.75).
//   node engine/tools/render.mjs production/V001/out/film.html shot --stills 24,52 --set gun=2d
import {
  THREE, V, mineShaft, mineGallery, miner, buddy, MINER, CHAR_COLORS, Actor, blobShadow,
  createShotgun, createNugget, goldDeep, gun2D, gun2DPoint, nugget2D,
  muzzleFlash, glint, glowTrail, shockRings, impactDecal, dustBurst, sprite, glowTex,
  look, keyed, withMods, handheld, shake, splineState, fwdOf, E, seg, clamp, lerp, smooth, step,
} from 'engine';

const T_CUT = 2.0, T_HIT = 3.12;                              // склейка на вспышке; попадание самородка в стену
const T_GUN3D = .55;                                          // до этого момента ружьё — 2D-рисунок в слое персонажа
const T_FIRE = 1.94;
const T_ECU = [.84, 1.62], T_AIM = 1.75;                      // режим gun='2d': 3D только в крупном плане затвора и с прицеливания
const OX = 100;                                               // декорация B стоит в мире на x = +100

export default {
  fps: 30, size: [720, 1280], duration: 3.7,
  options: { gun: '3d' },
  setup(stage, options) {
    const { camera, W, H } = stage;
    const GUN2D = String(options.gun).toLowerCase() === '2d';
    const gunIs2D = t => t < T_GUN3D || (GUN2D && (t < T_ECU[0] || (t >= T_ECU[1] && t < T_AIM)));

    // ---------- сцена A: штрек, шахтёр, ружьё ----------
    const shaft = mineShaft(stage);
    blobShadow(shaft.group, { pos: V(.16, .156, .2), size: [.7, .2], rot: -.5, opacity: .5 });   // шахтёр плоский — его тень на шпале = мягкое пятно
    const gun = createShotgun(stage); stage.add(gun.group);
    const nugA = createNugget(stage); stage.add(nugA);
    const gunKey = new THREE.DirectionalLight(0xfff0dc, 1.2); gunKey.layers.set(stage.FG); stage.add(gunKey, gunKey.target);   // светит только на пропсы переднего плана
    const hero = new Actor(stage, miner(), { pin: 'chest' }).at(V(0, -MINER.bodyY * .00202, 0));

    // --- 2D-ружьё (общий план): поза в единицах фигуры шахтёра
    const gun2DPose = t => { const sw = E.inOutCubic(seg(t, .40, .53)); return { x: lerp(36, 96, sw), y: lerp(-606, -545, sw), ang: lerp(-.765, -.02, sw), stock: lerp(-.165, -.5, sw), sc: .97 }; };
    // --- ключи 3D-ружья: [t, pos, yaw, rotZ (дуло вверх +), open (рад, - = стволы опущены)]
    const GUNK = [
      [0.50, [.2, 1.05, .26], 0, .12, 0],
      [0.68, [.12, 1.04, .26], -.45, .1, 0],
      [0.80, [.1, 1.04, .26], -.5, .1, -.76],
      [0.97, [.3, 1.04, .3], -.5, .1, -.76],
      [1.43, [.3, 1.04, .3], -.5, .1, -.76],
      [1.465, [.3, 1.05, .3], -.5, .09, 0],
      [1.53, [.3, 1.06, .3], -.5, .07, 0],
      [1.64, [.06, 1.3, .08], -.45, .02, 0],
      [1.70, [.06, 1.3, .08], -.45, .02, 0],
      [1.83, [-.02, 1.16, .26], -2.42, .04, 0],      // прицел в объектив: переписывается в aimPose() по финальной камере
      [2.00, [-.02, 1.16, .26], -2.42, .04, 0],
    ];
    function gunPose(t) {
      let i = 0; while (i + 1 < GUNK.length && t >= GUNK[i + 1][0]) i++;
      const a = GUNK[i], b = GUNK[Math.min(i + 1, GUNK.length - 1)];
      const k = a === b ? 0 : (b[4] === 0 && a[4] < 0 ? E.inCubic : E.inOutCubic)(seg(t, a[0], b[0]));
      return { pos: a[1].map((x, j) => lerp(x, b[1][j], k)), yaw: lerp(a[2], b[2], k), rz: lerp(a[3], b[3], k), open: lerp(a[4], b[4], k) };
    }
    const HA = V(0, 0, 0), HB = V(0, 0, 0);                      // 3D-цели кистей (A заряжает самородок, потом берёт шейку; B — на цевье)
    function poseGun(t) {
      const g = gunPose(t);
      const rec = t > T_FIRE ? Math.exp(-(t - T_FIRE) * 16) * Math.sin(clamp((t - T_FIRE) * 26) * Math.PI) * .07 : 0;
      gun.pose({ pos: g.pos, yaw: g.yaw, rz: g.rz, open: g.open, recoil: rec });
      const chamber = gun.chamber(), axisOut = gun.chamberAxis(chamber);
      HB.copy(gun.foreGrip());
      // кисть A: сбоку от коробки с самородком -> над открытым казёнником (0.72–1.17) -> роняет его, уходит влево -> шейка ложа
      const side = gun.local(-.2, .13, .09), over = chamber.clone().addScaledVector(axisOut, .15).add(V(-.03, .035, 0));
      const away = gun.local(-.2, .2, -.05), grip = gun.local(-.2, -.075, .06);
      const k1 = smooth(seg(t, .68, .84)), k2 = smooth(seg(t, 1.19, 1.36)), k3 = smooth(seg(t, 1.5, 1.64));
      HA.copy(side).lerp(over, k1).lerp(away, k2).lerp(grip, k3);
      HA.y += Math.sin(seg(t, .68, .84) * Math.PI) * .05;
      // самородок: в кисти A -> падает в ближний ствол (1.13–1.27) -> лежит внутри (блестит), пока стволы не закроются
      const inHand = HA.clone().add(V(.03, -.03, .03).applyQuaternion(camera.quaternion).add(V(0, 0, 0)));
      const fall = seg(t, 1.13, 1.27), seated = chamber.clone().addScaledVector(axisOut, -.018);
      nugA.visible = t >= T_GUN3D && t < 1.45;
      nugA.position.copy(fall <= 0 ? inHand : inHand.lerp(seated, E.inCubic(fall)));
      nugA.rotation.set(1 + t * 1.5, t * 1.1, .4); nugA.scale.setScalar(1);
    }
    // игра шахтёра: [t, глаза, рот, наклон века Л, П, взгляд, рот x, рот y, сдвиг лица (поворот в 3/4)]
    const MINER_FACE = [
      [0.00, ['lid', 'lid'], 'smirkS', 0, 0, [0, 0], -.01, .01, 0],
      [0.36, ['lid', 'lid'], 'o', 0, 0, [0, .2], -.02, .1, 0],
      [0.60, ['lid', 'lid'], 'o', 0, 1.5, [.3, .4], -.06, .11, -.14],
      [1.58, ['lid', 'closed'], 'smileS', 0, 0, [0, 0], 0, .14, -.06],
      [1.86, ['lid', 'lid'], 'o', 0, 1.5, [0, .2], -.04, .16, 0],
    ];
    // 2D-ружьё в позе 3D-ружья (режим gun='2d'): казённик и дульный срез проецируются в координаты фигуры
    function gun2DFrom3D(xf) {
      const O = hero.toLocal(gun.barrels.localToWorld(V(-gun.HINGE.x, -gun.HINGE.y, 0)), xf), M = hero.toLocal(gun.muzzle(0), xf);
      const R0 = hero.toLocal(gun.local(-.3, 0, 0), xf), R1 = hero.toLocal(gun.local(0, 0, 0), xf);
      const ang = Math.atan2(M[1] - O[1], M[0] - O[0]); let d = Math.atan2(R1[1] - R0[1], R1[0] - R0[0]) - ang;
      while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
      return { x: O[0], y: O[1], ang, stock: -.165 + d, sc: clamp(Math.hypot(M[0] - O[0], M[1] - O[1]) / 536, .8, 1.05) };
    }
    function drawMiner(t) {
      const f = step(MINER_FACE, t), wink = f[1][1] === 'closed', xf = hero.xf();
      hero.draw({ eyes: f[1], mouth: f[2], lid: [f[3], f[4]], look: f[5], mouthAt: [f[6], f[7]], turn: f[8], dy: Math.sin(t * 2.4) * 2.5, tilt: -.02 + .015 * Math.sin(t * 1.7) + (wink ? -.07 : 0) }, { only: 'base' }, xf);
      let arms, held, after = null;
      if (t < T_GUN3D) {                                         // общий план: рисованное ружьё, в кисти блестит самородок
        const g = gun2DPose(t), hB = gun2DPoint(g, 232 * g.sc, 14 * g.sc), hA = gun2DPoint(g, -78 * g.sc, -52 * g.sc);
        held = [{ layer: 'front', draw: x => { gun2D(x, g); nugget2D(x, hA[0] + 18, hA[1] - 22, CHAR_COLORS.gold); const gl = Math.max(0, Math.sin((t - .04) * 9)) ** 6; if (gl > .02) glint(x, hA[0] + 18, hA[1] - 22, 34 * gl, '#fff'); } }];
        arms = [{ to: hA, L: 150, bend: 1, hand: 19 }, { to: hB, L: 190, bend: -1, hand: 22 }];
      } else if (gunIs2D(t)) {                                   // gun='2d': рисованное ружьё повторяет позу 3D-ружья
        const g = gun2DFrom3D(xf), hA = hero.toLocal(HA, xf), hB = gun2DPoint(g, 232 * g.sc, 14 * g.sc), nug = t < 1.13;
        arms = [{ to: hA, L: 430, bend: 1, hand: 25 }, { to: hB, L: 250, bend: 1, hand: 25 }];
        after = x => { gun2D(x, g); if (nug) nugget2D(x, hA[0] + 22, hA[1] - 20, CHAR_COLORS.gold); };   // как и 3D-ружьё — поверх кистей
      } else {                                                   // 3D-ружьё: кисти — проекции 3D-точек хвата
        arms = [{ to: hero.toLocal(HA, xf), L: 430, bend: 1, hand: 25 }, { to: hero.toLocal(HB, xf), L: 250, bend: 1, hand: 25 }];
      }
      hero.draw({ arms, held }, { only: 'front' }, xf);         // руки и ружьё не «дышат» вместе с корпусом
      if (after) hero.with(after, xf);
    }

    // ---------- камера A: один непрерывный проезд (общий -> резкий наезд с облётом справа -> затвор крупно -> отъезд -> подмигивание -> средний) ----------
    const ECU = { cam: [-.52, .52, .42], tgt: [.07, .02, .0], roll: 4 };       // камера крупного плана в координатах ружья (казённик = начало)
    let camAKeys = null;
    {
      poseGun(1.0); const gw = p => gun.local(...p).toArray();
      const ecuP = gw(ECU.cam), ecuT = gw(ECU.tgt);
      poseGun(1.52); const pbP = gw([ECU.cam[0] * 1.12, ECU.cam[1] * .9, ECU.cam[2] * 1.12]), pbT = gw([.55, .04, .0]);
      camAKeys = [
        [0.00, look([0, 1.06, 3.74], [0, 1.25, 0], 50)],
        [0.50, look([0, 1.07, 3.56], [0, 1.25, 0], 50), E.linear],
        [0.60, look([-1.18, 1.2, 2.62], [.036, 1.22, .017], 50), E.inCubic],
        [0.667, look([-1.14, 1.25, 1.92], [.041, 1.233, .026], 50), E.linear],
        [0.733, look([-.9, 1.28, 1.32], [.056, 1.26, .042], 50), E.linear],
        [0.80, look([-.72, 1.3, 1.09], [.115, 1.17, .096], 50), E.linear],
        [0.96, look(ecuP, ecuT, 50, ECU.roll), E.inOutCubic],
        [1.42, look(ecuP.map((v, i) => v + [-.02, .01, .01][i]), ecuT, 50, ECU.roll), E.linear],
        [1.54, look(pbP, pbT, 50, 3), E.inOutCubic],
        [1.66, look([-1.05, 1.42, 1.1], [.11, 1.38, .12], 50), E.inOutCubic],
        [1.73, look([-1.16, 1.45, 1.18], [.105, 1.41, .125], 50), E.linear],
        [1.84, look([-1.9, 1.36, 1.52], [-.04, 1.475, -.05], 50), E.outCubic],
        [2.00, look([-1.94, 1.36, 1.55], [-.04, 1.475, -.05], 50), E.linear],
      ];
      // поза прицеливания: казённик и дуло ставятся через две экранные точки финального среднего плана (кадр 58 эталона)
      stage.setCamera(camAKeys[camAKeys.length - 2][1]);
      const f = stage.pxs(), xo = (330 - W / 2) / f, yo = -(702 - H / 2) / f, xm = (306 - W / 2) / f, ym = -(748 - H / 2) / f;
      const CHEST = hero.pos, BL = gun.BL;
      const dO = -CHEST.clone().applyMatrix4(camera.matrixWorldInverse).z - .04, a = xm * xm + ym * ym + 1, b = -2 * dO * (xm * xo + ym * yo + 1), c = dO * dO * (xo * xo + yo * yo + 1) - BL * BL;
      const dM = (-b - Math.sqrt(b * b - 4 * a * c)) / (2 * a);
      const O = V(xo * dO, yo * dO, -dO).applyMatrix4(camera.matrixWorld), M = V(xm * dM, ym * dM, -dM).applyMatrix4(camera.matrixWorld), dir = M.clone().sub(O).normalize();
      for (const k of [GUNK[GUNK.length - 2], GUNK[GUNK.length - 1]]) { k[1] = O.toArray(); k[2] = Math.atan2(-dir.z, dir.x); k[3] = Math.asin(dir.y); }
    }
    const camA = withMods(t => keyed(camAKeys)(t), handheld(3, .3, .8));

    // ---------- сцена B: галерея, напарник, полёт самородка ----------
    const gal = mineGallery(stage, { origin: [OX, 0, 0] });
    const pal = new Actor(stage, buddy(), { pin: 'seat' }).at(gal.seat);
    // камера B: [t, pos (локально в декорации), yaw (рад, + = вправо), pitch]
    const CAMB = [
      [2.00, [.15, 1.04, .22], 0, -.035], [2.33, [.15, 1.04, .0], 0, -.035], [2.633, [.1, 1.0, -1.25], .055, -.02],
      [2.80, [.0, .95, -2.1], .14, .03], [2.93, [-.13, .88, -2.75], .15, .08], [3.12, [-.16, .85, -2.98], .175, .1], [3.7, [-.165, .85, -3.01], .175, .1],
    ];
    const camStateB = t => { const s = splineState(CAMB, t); return { pos: V(s.pos[0] + OX, s.pos[1], s.pos[2]), yaw: s.yaw, pitch: s.pitch }; };
    // самородок едет по лучу взгляда на расстоянии D(t), затем входит в стену
    const nugDrop = t => -lerp(.045, .145, smooth(seg(t, 2.03, 2.75))) * (1 - smooth(seg(t, 2.95, T_HIT)));     // держится ниже центра, к попаданию поднимается
    const csHit = camStateB(T_HIT), hitDir = fwdOf(csHit.yaw, csHit.pitch + nugDrop(T_HIT));
    const P_HIT = gal.wall.hit(csHit.pos, hitDir) || csHit.pos.clone().addScaledVector(hitDir, 1.45);
    const N_HIT = gal.wall.N.clone(), EU = gal.wall.U;
    const WALL_D = csHit.pos.distanceTo(P_HIT);
    function nugDist(t) {
      if (t >= T_HIT) return WALL_D + .02;
      const outD = .5 + 1.5 * (1 - Math.exp(-Math.max(0, t - 1.99) / .03));
      const near = lerp(0, -.72, smooth(seg(t, 2.45, 2.9)));
      const base = outD + near;
      return lerp(base, WALL_D, E.inCubic(seg(t, 2.93, T_HIT)));
    }
    const nugPos = t => { const tt = Math.min(t, T_HIT), cs = camStateB(tt); return cs.pos.addScaledVector(fwdOf(cs.yaw, cs.pitch + nugDrop(tt)), nugDist(tt)); };
    const nugB = createNugget(stage, { r: .085, seed: 7, det: 3, fq: 2.1, amp: .78, flat: .86, mat: goldDeep(stage.envTex) }); stage.add(nugB);
    const fxB = new THREE.Group(); stage.add(fxB);
    const nugLight = new THREE.PointLight(0xffb040, 1.2, 3, 1.6); fxB.add(nugLight);
    gal.addCandle(gal.wall.uOf(P_HIT) - .215, 1.2);              // свеча слева-сверху от точки попадания
    const decal = impactDecal(fxB, { pos: P_HIT, normal: N_HIT });
    const hitGlow = sprite(fxB, glowTex());
    const dust = dustBurst(fxB, { pos: P_HIT, normal: N_HIT, along: EU });
    const camBraw = t => { const cs = camStateB(t), tgt = cs.pos.clone().add(fwdOf(cs.yaw, cs.pitch)); return { pos: cs.pos.toArray(), target: tgt.toArray(), fov: 64, roll: 0 }; };
    const camB = withMods(camBraw, handheld(9, .25, .9), shake(T_HIT, 1.1, 8, 24));
    const RING_T = [2.01, 2.16, 2.36, 2.52, 2.64, 2.76, 2.88];

    let muzzleS = null, np = null;                               // считаются в update и используются в том же кадре (состояния между кадрами нет)
    return {
      scenes: [{
        id: 'shaft', from: 0, to: T_CUT, set: shaft, props: [gun.group, nugA],
        camera: camA,
        update(t, f) {
          gun.group.visible = !gunIs2D(t);
          poseGun(t);                                            // камера уже стоит: положение самородка в кисти зависит от вида
          if (gunIs2D(t)) nugA.visible = false;
          // выстрел: самородок вырастает из дула с 1.90, вспышка на 1.935
          const muzzle = gun.muzzle(.02);
          if (t > 1.89) { const k = Math.pow(seg(t, 1.89, 2.0), 1.5), pm = muzzle.clone().applyMatrix4(camera.matrixWorldInverse), pe = V(-.3, -.52, -.6);
            nugA.visible = true; nugA.position.copy(pm.lerp(pe, k)).applyMatrix4(camera.matrixWorld); nugA.scale.setScalar(2.9 + 1.2 * k); nugA.rotation.set(t * 9, t * 6, 0); }
          muzzleS = stage.project(muzzle);
          const closeK = smooth(seg(t, .55, .8)) * (1 - smooth(seg(t, 1.52, 1.8)));
          shaft.lamp.cone.setAlpha(1 - .55 * closeK); shaft.plank.visible = t < 1.45;
          f.look.focus = camera.position.distanceTo(new THREE.Vector3(...f.cam.target)); f.look.aperture = lerp(.0012, .009, closeK); f.look.maxblur = .012;
          gunKey.position.copy(camera.position).add(V(.6, 1.4, .4)); gunKey.target.position.copy(gun.group.position); gunKey.intensity = lerp(.9, .1, closeK);
          const ecuK = smooth(seg(t, .84, .98)) * (1 - smooth(seg(t, 1.54, 1.66))), silver = gun.mats.silver;
          silver.envMapIntensity = lerp(.1, .5, ecuK); silver.color.setScalar(lerp(.4, 1, ecuK));
          f.look.exposure = 1 - .3 * closeK - .34 * smooth(seg(t, 1.52, 1.66)) * (1 - smooth(seg(t, 1.73, 1.84))) - .12 * smooth(seg(t, 1.75, 1.85));
          f.look.dark = .1 * closeK + .3 * ecuK + .06 * smooth(seg(t, 1.52, 1.66)) * (1 - smooth(seg(t, 1.73, 1.84)));   // на крупных планах эталон темнит весь кадр
        },
        chars: t => drawMiner(t),
        over(t, f) {
          if (t > 1.92 && t <= T_FIRE) muzzleFlash(f.ctx, muzzleS[0] - 14, muzzleS[1] + 22, 46, .9);
          if (t > T_FIRE) { const k = seg(t, T_FIRE, 2.0); muzzleFlash(f.ctx, muzzleS[0] - 10 * k, muzzleS[1] + 40 * k, 30 + 1300 * k * k, 1); }   // вспышка заливает кадр -> склейка
        },
      }, {
        id: 'gallery', from: T_CUT, to: 3.7, set: gal, props: [nugB, fxB],
        camera: camB,
        update(t, f) {
          np = nugPos(t); nugB.position.copy(np); nugB.rotation.set(.6 + t * 2.2, t * 1.4, .3 + t * .8); nugB.visible = t < T_HIT;
          const age = t - T_HIT, flash = age > 0 ? Math.exp(-age * 9) : 0;
          nugLight.position.copy(np).addScaledVector(N_HIT, .25); nugLight.intensity = (t < T_HIT ? .9 : 0) + flash * 2.5;
          decal.setAge(age);
          hitGlow.visible = age > 0 && age < .4; hitGlow.position.copy(P_HIT).addScaledVector(N_HIT, .06); hitGlow.scale.setScalar(.5 + .5 * clamp(age / .1)); hitGlow.material.opacity = flash * .5;
          dust.setAge(age);
          for (const fl of gal.flames) fl.material.rotation += (age > 0 ? -.5 * Math.exp(-age * 5) : 0);          // пламя свечи отдувает ударом
          f.look.focus = t < T_HIT ? camera.position.distanceTo(np) + lerp(1.2, 0, smooth(seg(t, 2.3, 2.9))) : camera.position.distanceTo(P_HIT);
          gunKey.position.copy(camera.position).add(V(-.5, 1.2, .3)); gunKey.target.position.copy(np); gunKey.intensity = .9;
        },
        under(t, f) {                                             // световой шлейф под самородком
          const [nx, ny, nd] = stage.project(np); if (nd < .05) return;
          const age = t - T_HIT, a = age < 0 ? 1 : Math.max(0, 1 - age / .1), fadeIn = lerp(.75, 1, smooth(seg(t, 2.0, 2.1))) * (1 - .55 * smooth(seg(t, 2.98, T_HIT)));
          if (a <= 0) return;
          glowTrail(f.ctx, { x: nx, y: ny, w: .085 * stage.pxs() / nd, H, alpha: a * fadeIn, discs: t > T_HIT - .1 ? [] : [0, 1].map(i => ((t - 2.0) / .42 + i * .5) % 1) });
        },
        chars(t) {
          const xf = pal.xf(); if (xf.d < .7 || t > 2.83) return;
          pal.draw({ dy: Math.sin(t * 2) * 1.2, look: [.55, -.1], chew: .5 + .5 * Math.sin(t * 11), blink: t > 2.52 && t < 2.6 }, undefined, xf);
        },
        over(t, f) {                                              // кольца-искажения вокруг самородка
          const ks = RING_T.filter(rt => t - rt > 0 && t - rt <= .3 && rt <= T_HIT - .2).map(rt => (t - rt) / .3);
          const [x, y, d] = stage.project(nugPos(Math.min(t, T_HIT)));
          shockRings(f.ctx, { x, y, w: .085 * stage.pxs() / d, ks });
        },
      }],
      transitions: [{ at: T_CUT, type: 'cut' }],
    };
  },
};
