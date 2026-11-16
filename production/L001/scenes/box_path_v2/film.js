// box_path_v2/film.js: L001, «путь коробки» v2 — рисованная часть (0–13.3 с). После неё встык идёт понравившийся
// кусок полностью 3D-версии ../box_path/ (с 13.07 с до конца, без изменений) — склейка в assemble.ps1.
// Задача v2: не «слайд-шоу». Каждый план — своя грамматика камеры, внутри плит всё живёт, коробка всегда что-то делает.
//   S1 склад   0.0–2.1  наклон вниз от качающихся ламп к проходу (+отъезд трансфокатором); погрузчик везёт коробку на нас
//   S2 склад   2.1–4.1  низкий боковой проезд; погрузчик тормозит, опускает вилы, на коробку шлёпается наклейка MALAYSIA
//   — whip-pan —
//   S3 порт    4.1–6.3  отъезд-раскрытие: крупно коробка в луже под дождём, стропы натягиваются, кран поднимает её
//   — склейка по коробке (врезка в движение) —
//   S4 порт    6.3–8.2  наезд на раскачивающуюся коробку, тележка крана несёт её вправо
//   — склейка —
//   S5 контейн 8.2–10.5 перевод фокуса: стропы на переднем плане -> коробка, въехавшая в контейнер; штамп INSPECTED
//   S6 контейн 10.5–13.3 двери захлопываются (темнеет, лампа мигает), резкий зум на серийник, уход в темноту
// Плиты — ../box_path_painted/assets (+ v2: assets/ из make_assets.py). Параметры: --set shot=s1..s6 (один план).
import { THREE, V, E, seg, clamp } from 'engine';
import { glowTex } from 'engine/core/textures.js';
import { forklift as makeForklift } from 'engine/sets/noirLogistics.js';
import { makePlate, blobShadow } from './plate25d.js';
import { hero, craneHook, repaint, addTag, doorLeaf, ripples } from './props.js';
import pW from './assets/plate_warehouse_v2.png'; import lampW from './assets/lamp_w.png'; import fW from '../box_path_painted/assets/fg_warehouse.png';
import pP from './assets/plate_port_v2.png'; import fP from '../box_path_painted/assets/fg_port.png'; import farP from './assets/far_port_v2.jpg';
import pC from './assets/plate_container_v2.png'; import fC from '../box_path_painted/assets/fg_container.png'; import farC from './assets/far_container_v2.jpg';

const T = { S1: 0, S2: 2.1, S3: 4.1, S4: 6.3, S5: 8.2, S6: 10.5, END: 13.3 };
const K = 1920 / 1672;                                     // пиксели 1920 -> пиксели исходника плиты
const lerp = (a, b, k) => a + (b - a) * k;
const GRADE = {
  W: { shadow: [.78, .84, 1.0], mid: [1, .95, .9], light: [1.06, .98, .9] },
  P: { shadow: [.5, .56, .78], mid: [.9, .82, .8], light: [1.12, .96, .8] },
  C: { shadow: [.3, .4, .54], mid: [.5, .66, .74], light: [.68, .9, .98] },
};
// мерцание лампы: ровный «гул» + провалы в заданных окнах [t0, t1]
const flick = (t, seed, dips = []) => {
  let k = .9 + .06 * Math.sin(t * 37 + seed) + .04 * Math.sin(t * 91 + seed * 3);
  for (const [a, b] of dips) if (t > a && t < b) { const p = (t - a) / (b - a); k *= (Math.sin(p * 31 + seed) > .1 ? .2 : 1) * (1 - Math.sin(p * Math.PI) * .5); }
  return k;
};
// встряска камеры после удара: затухающие колебания
const kick = (t, t0, amp, dur = .35) => { const d = t - t0; if (d < 0 || d > dur) return 0; return amp * Math.sin(d * 70) * Math.pow(1 - d / dur, 2); };
// v3: потолок увеличения плиты. Плита 1920 px = кадр 1920 px при crop 1, при crop .46 она растянута в 2.2 раза и мылится.
// Если crop < cmin, камера вместо зума подъезжает по оси взгляда так, чтобы точка focus сохранила размер и место в кадре
// (в плоскости коробки кадр тот же, фон растянут не больше 1/cmin).
const TAN25 = Math.tan(25 * Math.PI / 180);
function capZoom(c, focus, cmin = .8) {
  const crop = Math.tan(c.fov * Math.PI / 360) / TAN25; if (crop >= cmin) return c;
  const p = V(...c.pos), d = V(...c.target).sub(p).normalize(), D = focus.clone().sub(p).dot(d), s = D * (1 - crop / cmin);
  return { ...c, pos: p.addScaledVector(d, s).toArray(), target: V(...c.target).addScaledVector(d, s).toArray(), fov: 2 * Math.atan(TAN25 * cmin) * 180 / Math.PI };
}

export default {
  fps: 30, size: [1920, 1080],
  options: { shot: 'all' },
  setup(stage, o) {
    stage.renderer.toneMapping = THREE.NoToneMapping;
    stage.setVignette({ alpha: .3, color: '4,6,14', inner: .5, outer: 1.05, cy: .5 });
    const LOOK = (fogColor, fogDensity) => ({ bloom: 0, dof: false, fogColor, fogDensity, bg: 0x05070d, near: .05, far: 600, vignette: 1, exposure: 1 });
    const W = 1920, H = 1080;
    const set = (plate, look, extra = []) => { const group = new THREE.Group(); group.add(plate.group, ...extra); stage.add(group); return { group, look, tick() { plate.tick(); } }; };
    const glow = (color, opacity, scale) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: new THREE.Color(color), blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, transparent: true, opacity, fog: false })); s.scale.setScalar(scale); s.renderOrder = 20; return s; };
    // пятно света на полу (аддитивное, мягкий радиальный градиент)
    const poolTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.45, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
    const pool = (rx, rz, color) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(rx * 2, rz * 2), new THREE.MeshBasicMaterial({ map: poolTex, color: new THREE.Color(color), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 })); m.rotation.x = -Math.PI / 2; m.position.y = .01; m.renderOrder = 2; return m; };

    // ---------------- DOF для rack-focus: свой проход глубины (слои плиты режутся по альфе, как в цвете) ----------------
    {
      const bk = stage.bokeh, scene = stage.scene, camera = stage.camera, plain = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }), old = new THREE.Color();
      const noDepth = q => q.isPoints || q.isSprite || q.isLine || (q.isMesh && (q.material.transparent || q.userData.noDepth));
      bk.render = (r, writeBuffer, readBuffer) => {
        const hidden = [], swapped = [];
        scene.traverse(q => { if (!q.visible) return; if (noDepth(q)) { q.visible = false; hidden.push(q); } else if (q.isMesh) { swapped.push([q, q.material]); q.material = q.userData.depthMat || plain; } });
        r.getClearColor(old); const oa = r.getClearAlpha(), ac = r.autoClear; r.autoClear = false;
        const bg = scene.background, fg = scene.fog; scene.background = null; scene.fog = null;
        r.setClearColor(0xffffff); r.setClearAlpha(1); r.setRenderTarget(bk._renderTargetDepth); r.clear(); r.render(scene, camera);
        scene.background = bg; scene.fog = fg;
        for (const [q, m] of swapped) q.material = m; for (const q of hidden) q.visible = true;
        bk.uniforms.tColor.value = readBuffer.texture; bk.uniforms.nearClip.value = camera.near; bk.uniforms.farClip.value = camera.far;
        r.setRenderTarget(writeBuffer); r.clear(); bk._fsQuad.render(r);
        r.setClearColor(old); r.setClearAlpha(oa); r.autoClear = ac;
      };
    }

    // ====================== СКЛАД ======================
    const PW = makePlate({ plate: pW, h: 1.2, vp: [887, 511], fov: 50, left: [370, 640], right: [1480, 668], back: [887, 556], ceil: 8, fgs: [{ url: fW, depth: 3.2 }] });
    // ближняя лампа: вырезана из плиты, висит на подвесе и качается
    const lampD = PW.worldAt(1013 / K, 2).clone().sub(PW.P0).dot(PW.fwd);
    const lamp = PW.spriteCard(lampW, [920 / K, 0, 1104 / K, 144 / K], lampD, [1013 / K, 0], { depthTest: false });
    const lampGlow = glow('#ffc070', .5, 2.2); lampGlow.position.copy(PW.pointAt(1013 / K, 112 / K, lampD).sub(lamp.pivot.position).applyQuaternion(lamp.pivot.quaternion.clone().invert())); lamp.pivot.add(lampGlow);
    // остальные лампы прохода: свечение + пятна света на полу
    const wLamps = [[285, 2.2], [378, 1.5], [428, 1.0]].map(([v, s], i) => {
      const p = PW.worldAt(1013 / K, v / K), g = glow('#ffc070', .3, s * .9); g.position.copy(p); g.position.y -= .1;
      const pl = pool(2.6 + i * .3, 3.2, '#a8672a'); pl.position.set(p.x, .01, p.z); return { g, pl, base: [.3, .22, .2][i] };
    });
    const pool1 = pool(3.2, 4.0, '#a8672a');
    { const p = PW.pointAt(1013 / K, 112 / K, lampD); pool1.position.set(p.x, .01, p.z); }
    // погрузчик (модель движка, перекрашена в 3 тона плиты) и коробка
    const LW = [0, 1, -.6];
    const fkHolder = new THREE.Group(); const FK = makeForklift(fkHolder); repaint(FK.group, GRADE.W, LW);
    const fkShadow = blobShadow(1.5, 1.05, .78); fkHolder.add(fkShadow);
    const boxW = new THREE.Group(), heroW = hero({ grade: GRADE.W, L: LW }); heroW.rotation.y = Math.PI / 2; boxW.add(heroW);
    const tagW = addTag(heroW, 'malaysia', GRADE.W, LW);
    const boxWsh = blobShadow(.8, .7, .75); const boxWsh2 = blobShadow(1.2, 1.0, .3);
    const sW = set(PW, LOOK(0x0b3442, .03), [fkHolder, boxW, boxWsh, boxWsh2, pool1, ...wLamps.flatMap(l => [l.g, l.pl])]);
    // путь: d — расстояние коробки от камеры вдоль прохода (м), cy — высота вил
    // погрузчик едет по диагонали прохода (справа-сзади к центру), у остановки доворачивает боком к камере
    const fwdH = V(PW.fwd.x, 0, PW.fwd.z).normalize();
    const onAisle = (d, lat) => V(PW.P0.x, 0, PW.P0.z).addScaledVector(fwdH, d).addScaledVector(PW.right, lat);
    const A0 = onAisle(14.5, 2.2), A1 = onAisle(5.4, -.15), pathDir = A1.clone().sub(A0).normalize();
    function whPose(t) {
      const s = t < T.S2 ? .62 * seg(t, 0, T.S2) : .62 + .38 * E.outCubic(seg(t, T.S2, 2.95));
      const turn = .5 * E.inOutSine(seg(t, 2.25, 2.95));                       // доворот ~29°
      const cy = .25 * (1 - E.inOutSine(seg(t, 3.05, 3.45))), back = .9 * E.inOutSine(seg(t, 3.55, 4.1));
      return { bp: A0.clone().lerp(A1, s), dir: pathDir.clone().applyAxisAngle(V(0, 1, 0), turn), cy, back };
    }
    function whUpdate(t) {
      const { bp, dir, cy, back } = whPose(t), heading = Math.atan2(-dir.z, dir.x);
      boxW.position.set(bp.x, cy, bp.z); boxW.rotation.y = heading;
      const fp = bp.clone().addScaledVector(dir, -1.3 - back);
      fkHolder.position.copy(fp); fkHolder.rotation.y = heading; FK.carriage.position.y = back > 0 ? 0 : cy;
      fkShadow.position.set(-.2, .006, 0);
      boxWsh.position.set(bp.x, .006, bp.z); boxWsh2.position.set(bp.x + .1, .006, bp.z - .15);
      boxWsh.material.opacity = 1 - cy * 1.2;
      FK.beacon.visible = Math.floor(t * 3.2) % 2 === 0;
      // наклейка шлёпается на коробку (2.75 с): из крупного масштаба с поворотом -> на место
      const k = seg(t, 2.72, 2.9); tagW.mesh.visible = t >= 2.72;
      tagW.mesh.scale.setScalar(lerp(2.4, 1, E.outCubic(k))); tagW.mesh.rotation.z = tagW.rot + (1 - E.outCubic(k)) * -.5 + kick(t, 2.9, .05, .3);
      // лампы: качание ближней, мерцание (провалы у третьей)
      lamp.pivot.rotation.z = .055 * Math.sin(t * 2.6 + .4);
      const f0 = flick(t, 1); lampGlow.material.opacity = .5 * f0; pool1.material.opacity = .22 * f0;
      const sw = Math.sin(t * 2.6 + .4) * .055 * lampD * .5; pool1.position.x = PW.pointAt(1013 / K, 112 / K, lampD).x + sw;
      wLamps.forEach((l, i) => { const f = flick(t, i + 2, i === 1 ? [[.55, 1.05], [3.2, 3.5]] : []); l.g.material.opacity = l.base * 1.6 * f; l.pl.material.opacity = .2 * f; });
    }
    const camS1 = t => { const k = E.inOutSine(seg(t, 0, T.S2)); return PW.cam({ tilt: lerp(8.5, -2.2, k), crop: lerp(.6, .88, k), dz: .55 * k, dx: .02 }); };
    const camS2 = t => {
      const k = E.inOutSine(seg(t, T.S2, T.S3)), c = PW.cam({ dx: lerp(-.45, .36, k), dy: -.36, dz: .95, yaw: lerp(-3.2, 4.2, k), tilt: -3.2, crop: .7 });
      const j = kick(t, 2.9, .1) + kick(t, 3.45, .16, .4); c.target[1] += j; return c;   // шлепок наклейки, удар паллета об пол
    };

    // ====================== ПОРТ ======================
    const PP = makePlate({ plate: pP, h: 1.0, vp: [975, 572], fov: 50, left: [250, 625], fgs: [{ url: fP, depth: 3.6 }], far: { url: farP, depth: 60 }, tmax: 40 });
    const LP = [-.6, 1, .35];
    const rootP = new THREE.Group(); const gp = PP.floorAt(860, 742); rootP.position.set(gp.x, .003, gp.z); rootP.rotation.y = 16 * Math.PI / 180;
    const heroP = hero({ grade: GRADE.P, L: LP }); rootP.add(heroP);
    const tagP = addTag(heroP, 'malaysia', GRADE.P, LP);
    const shP = [blobShadow(.86, .72, .8), blobShadow(1.3, 1.05, .34)]; shP[1].position.set(.35, 0, -.15); rootP.add(...shP);
    const crane = craneHook({ grade: GRADE.P, L: LP });
    const ripP = ripples(34, [gp.x - 3.2, gp.x + 3.2, gp.z - 1.5, gp.z + 3.6], 11);
    // фонари: свечение на головах (глубина — по основанию столба), пятно на асфальте
    const pLamps = [[[245, 75], [240, 600], 3.2], [[565, 262], [560, 590], 2.2], [[733, 365], [729, 592], 1.6], [[868, 447], [868, 585], 1.1]].map(([hd, bs, s], i) => {
      const D = PP.floorAt(...bs).sub(PP.P0).dot(PP.fwd), g = glow('#ffc070', .4, s); g.position.copy(PP.pointAt(...hd, D)); return { g, i };
    });
    const poolP = pool(4.2, 3.0, '#b06a28'); { const p = PP.floorAt(850, 705); poolP.position.set(p.x, .012, p.z); }
    const sP = set(PP, LOOK(0x0d2232, .022), [rootP, crane.group, ripP.group, poolP, ...pLamps.map(l => l.g)]);
    const TOP = heroP.userData.top, SL = 1.05;
    function portPose(t) {
      // y — высота низа паллета; hk — подъём крюка над «провисшим» положением; tx — ход тележки; sw — качание (рад)
      const lift = E.inOutSine(seg(t, 4.62, 6.25)), y = .9 * lift;
      const taut = E.inOutSine(seg(t, 4.28, 4.62));
      const tx = .45 * E.inOutSine(seg(t, 6.3, 8.0));
      const amp = lift * (.05 + .1 * seg(t, 6.0, 7.2));
      const az = amp * Math.sin((t - 4.6) * 2.9) - .07 * Math.sin(Math.PI * seg(t, 6.3, 8.0)) * (t > 6.3 ? 1 : 0), ax = amp * .45 * Math.sin((t - 4.6) * 2.1 + 1);
      const hookL = V(tx * Math.cos(-16 * Math.PI / 180), y + TOP + SL - .42 * (1 - taut), tx * Math.sin(16 * Math.PI / 180));
      const off = V(0, -(TOP + SL), 0).applyEuler(new THREE.Euler(ax, 0, az));
      heroP.position.copy(y > 0.001 ? hookL.clone().add(off) : V(0, 0, 0)); heroP.rotation.set(y > .001 ? ax : 0, 0, y > .001 ? az : 0);
      for (const s of shP) { const a = clamp(1 - y / 2.2); s.material.opacity = a; s.scale.setScalar(1 + y * .3); s.position.x = heroP.position.x + (s === shP[1] ? .35 : 0); s.position.z = heroP.position.z + (s === shP[1] ? -.15 : 0); }
      rootP.updateMatrixWorld(true);
      const corners = [[-.56, -.46], [.56, -.46], [.56, .46], [-.56, .46]].map(([x, z]) => heroP.localToWorld(V(x, .14, z)));
      crane.update(rootP.localToWorld(hookL.clone()), corners);
      tagP.mesh.visible = true;
      ripP.update(t, 1);
      pLamps.forEach(l => { l.g.material.opacity = .42 * flick(t, l.i + 7, l.i === 1 ? [[5.15, 5.6], [7.0, 7.3]] : []); });
      poolP.material.opacity = .16 * flick(t, 8, [[5.15, 5.6], [7.0, 7.3]]);
    }
    const boxPW = () => heroP.localToWorld(V(0, .45, 0));
    const camS3 = t => capZoom(camS3raw(t), boxPW());
    const camS3raw = t => { const k = E.inOutSine(seg(t, T.S3, T.S4)); return PP.cam({ dz: lerp(2.6, 0, k), dx: lerp(.15, -.05, k), tilt: lerp(-7.4, 3.2, k) + kick(t, 4.62, 1.1, .4), yaw: lerp(.8, .3, k), crop: lerp(.46, .83, k) }); };   // рывок строп
    const camS4 = t => { const k = E.inOutSine(seg(t, T.S4, T.S5)), b = boxPW(); const tg = V(b.x, b.y + .05, b.z); return PP.aim({ dx: lerp(-.6, -.2, k), dy: .32, dz: lerp(.3, 2.5, k), crop: lerp(.72, .46, k) }, tg); };
    // сглаживание прицела S4 (камера «догоняет» коробку, а не прилипает): прицел = среднее по 5 точкам прошлого
    const camS4s = t => { const s = [0, .06, .12, .18, .24].map(d => camS4(Math.max(T.S4, t - d))); const c = camS4(t); c.target = [0, 1, 2].map(i => s.reduce((a, q) => a + q.target[i], 0) / s.length); return capZoom(c, boxPW()); };

    // ====================== КОНТЕЙНЕР ======================
    const PC = makePlate({ plate: pC, h: .7, vp: [882, 523], fov: 50, left: [400, 700], right: [1400, 716], back: [882, 652], ceil: 2.43,
      fgs: [{ url: fC, depth: 1.5 }], far: { url: farC, depth: 45 }, solid: true });
    const LC = [.1, .7, -1], RIM = { dir: [-1, .3, .2], color: '#e9a24e', k: .55 };
    const rootC = new THREE.Group(); const gc = PC.floorAt(880, 706); rootC.position.set(gc.x, .003, gc.z); rootC.rotation.y = -16 * Math.PI / 180;
    const heroC = hero({ grade: GRADE.C, L: LC, rim: RIM }); rootC.add(heroC);
    addTag(heroC, 'malaysia', GRADE.C, LC, RIM);
    const stamp = addTag(heroC, 'inspected', GRADE.C, LC);
    const shC = [blobShadow(.86, .72, .8), blobShadow(1.3, 1.05, .34)]; shC[1].position.set(0, 0, .45); rootC.add(...shC);
    // двери: петли на плоскости проёма, створки 3D; угол «открыто» подобран так, чтобы кромка легла на нарисованную
    const zb = PC.floorAt(882, 652).z;
    const onBack = (u, v) => { const d = PC.ray(u, v); return PC.P0.clone().addScaledVector(d, (zb - PC.P0.z) / d.z); };
    const hL = onBack(545, 657), hLt = onBack(542, 227), hR = onBack(1232, 660), hRt = onBack(1230, 225);
    const wid = (hR.x - hL.x) / 2, hgt = (hLt.y - hL.y + hRt.y - hR.y) / 2, y0 = (hL.y + hR.y) / 2;
    const leafL = doorLeaf(wid, hgt, 1, GRADE.C, [.6, .4, .8]), leafR = doorLeaf(wid, hgt, -1, GRADE.C, [-.6, .4, .8]);
    leafL.position.set(hL.x, y0, zb - .03); leafR.position.set(hR.x, y0, zb - .03);
    function openAngle(side, target) {
      let best = 0, bd = 1e9; for (let a = 0; a <= 170; a += .5) { const r = a * Math.PI / 180, h = side > 0 ? hL : hR;
        const p = V(h.x + side * Math.cos(r) * wid, y0 + hgt / 2, zb - .03 - Math.sin(r) * wid), u = PC.project0(p)[0];
        if (Math.abs(u - target) < bd) { bd = Math.abs(u - target); best = r; } }
      return best;
    }
    const AL = openAngle(1, 645), AR = openAngle(-1, 1127);
    const doorK = t => { const a = seg(t, 10.85, 11.42); return a < 1 ? E.inCubic(a) : 1 - .035 * Math.sin(seg(t, 11.42, 11.7) * Math.PI); };   // 1 = закрыто
    const SLAM = 11.42;
    const sealC = glow('#8be02a', .0, .5);
    const lampC = glow('#ffb060', .45, .9); lampC.position.copy(PC.pointAt(365, 250, PC.floorAt(400, 700).sub(PC.P0).dot(PC.fwd)));
    const sC = set(PC, LOOK(0x0a2a36, .04), [rootC, leafL, leafR, lampC]);
    function contUpdate(t, f) {
      // коробка въезжает из проёма и встаёт (8.2–9.0)
      const k = E.outCubic(seg(t, T.S5, 8.75)), p0 = PC.floorAt(882, 662);
      rootC.position.set(lerp(p0.x, gc.x, k), .003, lerp(p0.z, gc.z, k)); rootC.rotation.y = lerp(-6, -16, k) * Math.PI / 180;
      heroC.rotation.z = .025 * Math.sin(seg(t, 8.85, 9.4) * Math.PI * 3) * (1 - seg(t, 8.85, 9.4));
      // штамп INSPECTED (9.75)
      const s = seg(t, 9.72, 9.84); stamp.mesh.visible = t >= 9.72; stamp.mesh.scale.setScalar(lerp(2.6, 1, E.inCubic(s))); stamp.mesh.material.opacity = .92 * clamp(s * 3);
      // двери
      const dk = doorK(t); leafL.rotation.y = AL * (1 - dk); leafR.rotation.y = -AR * (1 - dk);
      lampC.material.opacity = .45 * flick(t, 3, [[SLAM + .05, SLAM + .55], [12.55, 12.8]]);
      heroC.userData.sealGlow.material.opacity = .55 * (1 - seg(t, 11.9, 12.1));            // ореол пломбы гаснет до наезда на наклейку
      // перевод фокуса в S5
      if (t < T.S6) { const r = E.inOutSine(seg(t, 8.8, 9.1)); Object.assign(f.look, { dof: true, focus: lerp(1.55, 3.7, r), aperture: .0042, maxblur: .011 }); }
    }
    const labelW = () => heroC.localToWorld(V(.92 * .27, .14 + .62 * .58, .38));
    const camS5 = t => { const k = E.inOutSine(seg(t, T.S5, T.S6)), c = PC.cam({ dx: lerp(-.2, -.12, k), dz: .05 + .1 * k, yaw: lerp(-4.2, -3.4, k), crop: .84, tilt: -.6 }); c.target[1] += kick(t, 9.84, .18, .4) + kick(t, 8.75, .2, .35); return c; };   // стоп коробки, штамп
    const camS6 = t => {
      const k = E.inOutSine(seg(t, T.S6, 12.0)), z = E.inOutQuint(seg(t, 12.05, 12.32));
      const base = PC.cam({ dx: lerp(.4, .26, k), dy: -.24, dz: lerp(.5, .8, k), yaw: lerp(-3.5, -1.2, k), tilt: 2.2, roll: 0, crop: .72 });
      const lw = labelW(), tg = V(...base.target).lerp(lw, z), fov = lerp(base.fov, 2 * Math.atan(Math.tan(25 * Math.PI / 180) * .12) * 180 / Math.PI, z);
      const c = { ...base, target: [tg.x, tg.y, tg.z], fov };
      const sh = kick(t, SLAM, .3, .5); c.target[1] += sh; c.target[0] += sh * .6; c.roll = kick(t, SLAM, 2.5, .5);
      if (t > 12.32) { const d = t - 12.32; c.target[0] += .004 * d; c.fov *= 1 - .03 * d; }
      return c;
    };

    // ====================== 2D: дождь, дымка, whip ======================
    const rain = [];
    { let s = 9; const r = () => (s = (s * 16807) % 2147483647) / 2147483647; for (let i = 0; i < 420; i++) rain.push([r() * W * 1.3, r() * H, 24 + r() * 46, .08 + r() * .16, .75 + r() * .55, r()]); }
    // наклон штрихов как на плите: сверху справа вниз влево, dx/dy ~ -0.22
    function drawRain(x, t, a, near = 1) {
      x.save(); x.lineCap = 'round';
      for (const [x0, y0, len, al, sp, z] of rain) {
        const L = len * (z > .8 ? 1.8 * near : 1), w = z > .8 ? 2.6 : 1.5;
        const y = (y0 + t * 1700 * sp) % (H + 120) - 60, xx = (((x0 - t * 370 * sp) % (W * 1.3)) + W * 1.3) % (W * 1.3) - W * .1;
        x.lineWidth = w; x.strokeStyle = `rgba(${z > .8 ? '170,210,240' : '120,180,220'},${(al * a * (z > .8 ? 1.1 : 1)).toFixed(3)})`;
        x.beginPath(); x.moveTo(xx, y); x.lineTo(xx - L * .22, y + L); x.stroke();
      }
      x.restore();
    }
    function drawHaze(x, t, rgb, a, seed, n = 5) {
      let s = seed; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
      x.save();
      for (let i = 0; i < n; i++) {
        const sp = 30 + r() * 50, cx = ((r() * (W + 1200) + t * sp) % (W + 1200)) - 600, cy = H * (.3 + r() * .5), rx = 420 + r() * 520, ry = 90 + r() * 120;
        x.setTransform(rx / 100, 0, 0, ry / 100, cx, cy);
        const g = x.createRadialGradient(0, 0, 0, 0, 0, 100); g.addColorStop(0, `rgba(${rgb},${(a * (.7 + .3 * Math.sin(t * .9 + i))).toFixed(3)})`); g.addColorStop(1, `rgba(${rgb},0)`);
        x.fillStyle = g; x.fillRect(-100, -100, 200, 200);
      }
      x.restore();
    }
    function whip(f, at = T.S3, d = .2) {
      const t = f.t; let s = 0;
      if (t > at - d && t < at) s = -1100 * Math.pow((t - (at - d)) / d, 2.4);
      else if (t >= at && t < at + d) s = 1100 * Math.pow(1 - (t - at) / d, 2.4);
      if (Math.abs(s) < 1) return;
      const x = f.ctx, snap = f.stage.snapshot(), n = 28, L = Math.abs(s) * .8 + 20;
      stage.resetCtx(); x.fillStyle = '#05070d'; x.fillRect(0, 0, W, H); x.filter = Math.abs(s) > 40 ? 'blur(3px)' : 'none';
      for (let i = 0; i < n; i++) { const off = s + (i / (n - 1) - .5) * L; x.globalAlpha = 1 / (i + 1); for (const kk of [-1, 0, 1]) x.drawImage(snap, ((off % W) + kk * W), 0); }
      x.globalAlpha = 1; x.filter = 'none';
    }
    // дождь в проёме контейнера: только между кромками створок и в пределах проёма
    function rainInDoorway(f, t, a) {
      const x = f.ctx, P = q => f.stage.project(q), dk = doorK(t);
      const edge = (h, side, A, yy) => { const r = A * (1 - dk); return V(h.x + side * Math.cos(r) * wid, yy, zb - .03 - Math.sin(r) * wid); };
      const pts = [edge(hL, 1, AL, y0 + hgt), edge(hR, -1, AR, y0 + hgt), edge(hR, -1, AR, y0), edge(hL, 1, AL, y0)].map(P);
      if (pts[1][0] - pts[0][0] < 2) return;
      x.save(); x.beginPath(); pts.forEach(([px, py], i) => (i ? x.lineTo(px, py) : x.moveTo(px, py))); x.closePath(); x.clip();
      // дождь за коробкой: вырезаем экранный прямоугольник коробки с паллетом
      const bc = []; for (const bx of [-.62, .62]) for (const by of [0, .78]) for (const bz of [-.52, .52]) bc.push(P(heroC.localToWorld(V(bx, by, bz))));
      const xs = bc.map(q => q[0]), ys = bc.map(q => q[1]);
      x.beginPath(); x.rect(0, 0, W, H); x.rect(Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)); x.clip('evenodd');
      drawRain(x, t, a, .6); x.restore();
    }
    function darkOverlay(f, a) { if (a < .005) return; const x = f.ctx; stage.resetCtx(); x.fillStyle = `rgba(3,5,12,${a.toFixed(3)})`; x.fillRect(0, 0, W, H); }
    function glow2D(f, p, r, rgb, a) {
      const [sx, sy, d] = f.stage.project(p); if (d <= 0 || a < .01) return; const x = f.ctx; x.save(); x.globalCompositeOperation = 'lighter';
      const g = x.createRadialGradient(sx, sy, 0, sx, sy, r); g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(.3, `rgba(${rgb},${a * .35})`); g.addColorStop(1, `rgba(${rgb},0)`);
      x.fillStyle = g; x.fillRect(sx - r, sy - r, 2 * r, 2 * r); x.restore();
    }

    const scenes = [
      { id: 's1', from: T.S1, to: T.S2, set: sW, camera: camS1, update(t) { whUpdate(t); }, over(t, f) { drawHaze(f.ctx, t, '200,140,80', .05, 3); } },
      { id: 's2', from: T.S2, to: T.S3, set: sW, camera: camS2, update(t) { whUpdate(t); }, over(t, f) { drawHaze(f.ctx, t, '200,140,80', .05, 3); whip(f); } },
      { id: 's3', from: T.S3, to: T.S4, set: sP, camera: camS3, update(t) { portPose(t); if (PP.isReady()) PP.fgMeshes.forEach(m => { m.visible = true; }); }, over(t, f) { drawHaze(f.ctx, t, '90,140,170', .06, 5); drawRain(f.ctx, t, 1); whip(f); } },
      { id: 's4', from: T.S4, to: T.S5, set: sP, camera: camS4s, update(t) { portPose(t); PP.fgMeshes.forEach(m => { m.visible = false; }); /* v3: камера ближе (capZoom) — угол контейнера переднего плана влезал бы чёрной плитой */ }, over(t, f) { drawHaze(f.ctx, t, '90,140,170', .06, 5); drawRain(f.ctx, t, 1); } },
      { id: 's5', from: T.S5, to: T.S6, set: sC, camera: camS5, update(t, f) { contUpdate(t, f); }, over(t, f) { rainInDoorway(f, t, .9); drawHaze(f.ctx, t, '60,130,150', .045, 7); } },
      { id: 's6', from: T.S6, to: T.END, set: sC, camera: camS6, update(t, f) { contUpdate(t, f); },
        over(t, f) {
          rainInDoorway(f, t, .9); drawHaze(f.ctx, t, '60,130,150', .045 * (1 - doorK(t)), 7);
          const dk = doorK(t), dark = .5 * E.inOutSine(seg(t, 11.15, SLAM + .05)) + .42 * E.inOutSine(seg(t, 12.55, T.END));
          darkOverlay(f, Math.min(.94, dark));
          const lf = flick(t, 3, [[SLAM + .05, SLAM + .55], [12.55, 12.8]]);
          glow2D(f, lampC.position, 160, '255,170,80', .35 * lf * (dk > .5 ? 1 : 0));
          // v3: зелёный 2D-ореол пломбы убран — на крупном плане он раздувался в мутную кляксу на полкадра
        } },
    ];
    const only = scenes.find(s => s.id === o.shot);
    if (only) { const d = only.to - only.from; return { duration: d, scenes: [{ ...only, from: 0, to: d, camera: t => only.camera(t + only.from), update: only.update && ((t, f) => only.update(t + only.from, f)), over: only.over && ((t, f) => only.over(t + only.from, { ...f, t: t + only.from })) }] }; }
    return { duration: T.END, scenes };
  },
};
