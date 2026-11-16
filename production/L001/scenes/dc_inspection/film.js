// dc_inspection/film.js — L001 #180–186: инспекторы Минторга США в малайзийском дата-центре (тип B/C: 3D-проход ДЦ из
// engine/src/sets/noirLogistics.js + штабели запечатанных коробок и фонарик из box_path_v2/tail, герои лонгов — 2D внутри 3D).
//   180   двери открываются, луч фонаря в тёмном проходе, проезд вперёд                         (shotlist 6.0 с)
//   182   фонарь скользит по коробкам в плёнке, боковой проезд                                 (3.5 с)
//   183w  общий план: инспектор и гид в проходе, ноги стоят, контактные тени (доп. план для монтажа) (2.0 с)
//   183   крупно инспектор: «Is it switched on?» — светит фонарём на ящик, наезд                (1.6 с)
//   184   средний гид (обратная точка): «It's still wrapped.» — стучит по плёнке, дрейф        (1.6 с)
//   185   крупно инспектор: «Since when?» — записывает в планшет, наезд                         (1.4 с)
//   186   вставка: палец на наклейке с датой доставки (реплика гида «Since delivery.» за кадром) (1.6 с)
// Параметры: --set shot=180|182|183w|183|184|185|186 — один план; --set dur=<с> — длительность (одного плана, а без shot —
// всего фильма, планы масштабируются); --set d183=1.4 — длительность отдельного плана; --set date="..." — дата на
// наклейке (по умолчанию даты нет: поле смазано — в сценарии даты нет, НУЖНО УТОЧНИТЬ у Рауана); --set solo=k|w --set vig=0 — проверка непрозрачности героев.
import { THREE, V, clamp, seg, E, Actor, act, blinkAt, unUpper, shoulder, restHand, arcHand, gesture, elbowIK, noirShade, blobShadow, lerp, ell } from 'engine';
import { noirLogistics, box, toon, pallet, edgeLines, NOIR } from 'engine/sets/noirLogistics.js';
import { paint, inkHull, rbox, decal, glow, hazeCard, noirLook, camSpline, GLIDE, setRes, tex } from 'engine/sets/noirInteriors.js';
import { lightCone } from 'engine/vfx/lightCone.js';
import { rng } from 'engine/core/rng.js';
import { serialLabelTex } from '../box_path_v2/props.js';
import { inspector, guide, flashlight, clipboard, pen } from './chars.js';

const PI = Math.PI;
const BASE = [['180', 6.0], ['182', 3.5], ['183w', 2.0], ['183', 1.6], ['184', 1.6], ['185', 1.4], ['186', 1.6]];

export default {
  fps: 30, size: [1920, 1080],
  options: {},
  setup(stage, o) {
    setRes(stage.W, stage.H);
    const solo = o.solo;
    stage.setVignette({ alpha: .58, color: '3,5,12', inner: .4, outer: 1.0, cy: .5 });
    // ---------- длительности ----------
    let list = BASE.map(([id, d]) => [id, o['d' + id] != null ? +o['d' + id] : d]);
    if (o.shot) list = list.filter(([id]) => id === String(o.shot)).map(([id, d]) => [id, o.dur != null ? +o.dur : d]);
    else if (o.dur != null) { const tot = list.reduce((s, [, d]) => s + d, 0), k = +o.dur / tot; list = list.map(([id, d]) => [id, d * k]); }
    let acc = 0; const SH = {}; for (const [id, d] of list) { SH[id] = { from: acc, to: acc + d, d }; acc += d; }
    const DUR = acc;

    // ---------- декорация ----------
    const L = noirLogistics(stage, { dcBoxes: false });
    const { dcParts: P } = L; L.hero.visible = false;
    L.forklift.group.position.set(0, 0, -1); L.truck.group.position.set(40, 0, -1);
    const DC = V(L.dcX, 0, 0), dc = P.group;
    // «рисованный» вид для этой сцены: cel-заливки с пятнами и контур с переменной толщиной (только внутри фильма;
    // сама декорация не меняется — box_path и box_path_v2 рендерятся как раньше)
    const swapped = new Map();
    L.group.traverse(m => {
      if (!m.isMesh) return;
      const mt = m.material;
      if (mt && mt.isMeshToonMaterial && !mt.userData.paint) {
        if (!swapped.has(mt)) swapped.set(mt, paint(mt.color.getHex(), { map: mt.map || null, transparent: mt.transparent, opacity: mt.opacity, alphaTest: mt.alphaTest, amp: .16, freq: 1.4 }));
        m.material = swapped.get(mt);
      } else if (mt && mt.side === THREE.BackSide && mt.customProgramCacheKey && mt.customProgramCacheKey() === 'ink') m.material = inkHull(3.4, { wob: .4 });
    });

    // ---------- стойки погашены: пустые рамы, висящие кабели (ДЦ не работает) ----------
    // лицевые панели стоек (плоскости .54 x 2.05) получают рисунок пустой рамы вместо LED; сами LED-слои скрыты в update
    const emptyRackT = tex(256, 1024, (x, w, h) => {
      const r = rng(17);
      x.fillStyle = '#2b3d55'; x.fillRect(0, 0, w, h);
      x.fillStyle = '#3f5674'; x.fillRect(0, 0, 26, h); x.fillRect(w - 26, 0, 26, h);                       // стойки рамы
      x.fillStyle = '#1a2638'; for (let y = 40; y < h - 30; y += 11) { x.fillRect(30, y, 5, 3); x.fillRect(w - 35, y, 5, 3); } // отверстия рельсов
      for (let y = 30; y < h - 40; y += 84) {                                                               // пустые полки: тёмный проём + светлая кромка
        x.fillStyle = '#16202f'; x.fillRect(36, y, w - 72, 70); x.fillStyle = '#4c6584'; x.fillRect(36, y + 70, w - 72, 6);
        if (r() < .3) { x.fillStyle = '#34485f'; x.fillRect(36, y + 4, w - 72, 30); x.fillStyle = '#22324a'; for (let k = 0; k < 12; k++) x.fillRect(48 + k * 14, y + 12, 6, 14); }   // заглушка
      }
      x.lineCap = 'round';                                                                                   // висящие кабели
      for (let i = 0; i < 4; i++) { const x0 = 50 + r() * 150, x1 = x0 + (r() - .5) * 80, len = 300 + r() * 500;
        x.strokeStyle = ['#0e1520', '#6b2a24', '#1d3a5a', '#0e1520'][i]; x.lineWidth = 7 + r() * 4;
        x.beginPath(); x.moveTo(x0, 0); x.bezierCurveTo(x0, len * .5, x1, len * .6, x1 + (r() - .5) * 30, len); x.stroke(); }
      x.strokeStyle = '#0b0d17'; x.lineWidth = 6; x.strokeRect(3, 3, w - 6, h - 6);
    });
    const emptyRackM = paint(0xffffff, { map: emptyRackT, amp: .12, freq: 1.2 });
    const rackBoxM = paint(0x24344a, { amp: .16, freq: 1.4 });
    dc.children.forEach(m => {
      if (!m.isMesh || P.racks.includes(m)) return;
      const gp = m.geometry.parameters || {};
      if (gp.width === .54 && gp.height === 2.05) m.material = emptyRackM;
      else if (Math.abs(Math.abs(m.position.z) - 2.3) < .01 && Math.abs(m.position.y - 1.1) < .01) m.material = rackBoxM;
    });
    // пыль: облачка-спрайты (в луче фонаря и с плёнки при ударе), детерминированно от t
    const dustTex = tex(64, 64, (x) => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 30); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.5, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); });
    const motes = []; const RM = rng(23);
    for (let i = 0; i < 220; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: dustTex, color: 0xffe6bf, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
      sp.visible = false; L.group.add(sp); motes.push({ sp, a: RM(), b: RM(), c: RM(), s: .004 + RM() * .009 }); }
    const puff = []; for (let i = 0; i < 46; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: dustTex, color: 0xcfc2a6, transparent: true, opacity: 0, depthWrite: false, fog: false }));
      sp.visible = false; sp.renderOrder = 6; L.group.add(sp); puff.push({ sp, a: RM(), b: RM(), c: RM() }); }
    // motesInBeam: пылинки в объёме луча от p0 к p1 (видны там, где светит), k — яркость
    const _ax = new THREE.Vector3(), _q = new THREE.Vector3();
    function motesInBeam(t, p0, p1, k, spread = .16) {
      _ax.copy(p1).sub(p0); const len = _ax.length(); _ax.normalize();
      const up = Math.abs(_ax.y) > .9 ? V(1, 0, 0) : V(0, 1, 0), u = new THREE.Vector3().crossVectors(_ax, up).normalize(), v = new THREE.Vector3().crossVectors(_ax, u);
      for (const m of motes) {
        const along = (m.a + t * .012 * (m.b - .5)) % 1, ang = m.b * 6.283 + t * .3 * (m.c - .5), rr = Math.sqrt(m.c) * spread * (.15 + along);
        _q.copy(p0).addScaledVector(_ax, along * len * .95).addScaledVector(u, Math.cos(ang) * rr * len * .9).addScaledVector(v, Math.sin(ang) * rr * len * .9);
        _q.y += .03 * Math.sin(t * .7 + m.a * 20);
        m.sp.position.copy(_q); m.sp.scale.setScalar(m.s * (1 + along * 1.5)); m.sp.visible = k > 0;
        m.sp.material.opacity = (along < .12 ? 0 : 1) * .8 * k * (.35 + .65 * Math.abs(Math.sin(m.a * 50 + t * 1.3))) * Math.min(1, along * 6) * (1 - rr / (spread * 1.3 * (.15 + along) + 1e-6)) ;
      }
    }
    function hideMotes() { for (const m of motes) m.sp.visible = false; }
    // puffAt: облачко пыли с плёнки от точки p наружу по нормали n, d — время с удара (с)
    function puffAt(p, n, d) {
      for (const q of puff) {
        const on = d > 0 && d < 1.6; q.sp.visible = on; if (!on) continue;
        const e = 1 - Math.exp(-d * 3.2), sx = (q.a - .5) * .9, sy = (q.b - .3) * .6;
        q.sp.position.copy(p).addScaledVector(n, (.03 + .2 * q.c) * e).add(V(sx * e * .6, sy * e * .5 + d * .05, 0)).addScaledVector(n, .0);
        q.sp.scale.setScalar(.012 + .045 * e * (.4 + q.c));
        q.sp.material.opacity = Math.min(1, d * 12) * (1 - d / 1.6) * (.3 + .4 * q.a);
      }
    }
    function hidePuff() { for (const q of puff) q.sp.visible = false; }

    // ---------- штабели запечатанных коробок (из box_path_v2/tail, + «рисованные» материалы) ----------
    const R = rng(91);
    const labelLo = serialLabelTex('4XG-2207-0', { w: 1024, bg: '#f4eedc' }), loMat = paint(0xffffff, { map: labelLo, amp: .05 });
    const addLabel = (parent, w, pos, ry, mat) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * .633), mat); m.position.copy(pos); m.rotation.y = ry; parent.add(m); edgeLines(m, m.geometry, 2); return m; };
    const fragTex = tex(512, 512, (x) => { x.fillStyle = '#e8a23a'; x.fillRect(0, 0, 512, 512); x.fillStyle = '#141018';
      for (const cx of [170, 342]) { x.beginPath(); x.moveTo(cx, 70); x.lineTo(cx + 80, 190); x.lineTo(cx + 34, 190); x.lineTo(cx + 34, 330); x.lineTo(cx - 34, 330); x.lineTo(cx - 34, 190); x.lineTo(cx - 80, 190); x.closePath(); x.fill(); }
      x.fillRect(60, 370, 392, 18); x.font = "900 70px 'Arial Black', Arial"; x.fillText('THIS SIDE', 62, 470); x.strokeStyle = '#141018'; x.lineWidth = 28; x.strokeRect(14, 14, 484, 484); });
    const fragMat = paint(0xffffff, { map: fragTex, amp: .05 });
    const filmTex = tex(256, 512, (x) => { const r = rng(4); x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(0, 0, 256, 512);
      for (let i = 0; i < 26; i++) { const y = r() * 512, a = .25 + r() * .6; x.strokeStyle = `rgba(255,255,255,${a.toFixed(2)})`; x.lineWidth = 2 + r() * 5; x.beginPath(); x.moveTo(0, y); x.bezierCurveTo(80, y + (r() - .5) * 60, 170, y + (r() - .5) * 60, 256, y + (r() - .5) * 40); x.stroke(); } });
    filmTex.wrapS = filmTex.wrapT = THREE.RepeatWrapping;
    const filmMat = new THREE.MeshPhongMaterial({ color: 0x7fa6c4, specular: 0xdff0ff, shininess: 60, map: filmTex, transparent: true, opacity: .16, depthWrite: false });
    const strapMat = paint(0x15171f, { amp: .08 }), cornerMat = paint(0x8a8272, { amp: .1 }), tapeG = paint(NOIR.tape, { amp: .1 }), tapeT = paint(0xc9b48a, { amp: .1 });
    const cards = [NOIR.card, NOIR.cardDark, 0x9c7550, 0xb08a5e, 0x8e6a4c].map(c => paint(c, { amp: .18, freq: 2.2 }));
    const SPOTS = [[1.5, 1.2, 'tall'], [3.35, 1.25, 'crate'], [5.2, 1.25, 'mixed'], [-1.5, -1.3, 'crate'], [6.4, -1.2, 'mixed'], [8, -1.25, 'tall'], [9.15, 1.25, 'tall'], [11, 1.2, 'crate'], [14, -1.2, 'mixed'], [17, 1.2, 'tall']];
    const stacks = [];
    for (const [sx, sz, kind] of SPOTS) {
      const g = new THREE.Group(); g.position.set(sx, 0, sz); g.rotation.y = (R() - .5) * .12; dc.add(g);
      pallet(g, 1.2, 1.0); const face = -Math.sign(sz);
      let y = .15; const items = [];
      const sizes = kind === 'crate' ? [[1.1, .78, .92], [.7, .42, .6]] : kind === 'tall' ? [[.95, .62, .8], [.95, .62, .8], [.9, .5, .78]] : [[1.05, .5, .9], [.8, .55, .66], [.55, .36, .5]];
      sizes.forEach(([w, h, d]) => {
        const dx = (R() - .5) * .08, dz = (R() - .5) * .06, ry = (R() - .5) * .1;
        rbox(g, w, h, d, cards[(R() * cards.length) | 0], dx, y + h / 2, dz, { r: .025, px: 3.2, ry });
        const tm = R() < .6 ? tapeG : tapeT;
        box(g, w + .012, .07, d + .012, tm, dx, y + h - .02, dz, { ink: false, ry });
        box(g, .08, h + .014, d + .014, tm, dx, y + h / 2, dz, { ink: false, ry });
        items.push({ w, h, d, y, dx, dz, ry }); y += h + .005;
      });
      const top = y, bw = Math.max(...sizes.map(s => s[0])) + .04, bd = Math.max(...sizes.map(s => s[2])) + .04;
      for (const ox of [-bw * .28, bw * .28]) { box(g, .045, top + .02, bd + .02, strapMat, ox, top / 2, 0, { px: 1.5 }); box(g, .045, .02, bd + .02, strapMat, ox, top + .005, 0, { ink: false }); }
      for (const [cx, cz] of [[-bw / 2, face * bd / 2], [bw / 2, face * bd / 2], [-bw / 2, -face * bd / 2]]) box(g, .05, top - .17, .05, cornerMat, cx, .15 + (top - .15) / 2, cz, { px: 1.5 });
      const fh = Math.min(top - .1, 1.25), fm = new THREE.Mesh(new THREE.BoxGeometry(bw + .03, fh, bd + .03), filmMat); fm.position.set(0, .12 + fh / 2, 0); fm.renderOrder = 3; g.add(fm);
      edgeLines(fm, fm.geometry, 1.5);
      items.forEach((it, k) => {
        const ly = it.y + it.h * .55;
        if (it.h > .4) addLabel(g, .26, V(it.dx + it.w * .22, ly, it.dz + face * (it.d / 2 + .006)), face > 0 ? 0 : PI, loMat);
        if (k === 0 || R() < .5) addLabel(g, .22, V(it.dx - it.w / 2 - .006, ly, it.dz + face * it.d * .2), -PI / 2, loMat);
        if (R() < .45) { const m = new THREE.Mesh(new THREE.PlaneGeometry(.16, .16), fragMat); m.position.set(it.dx - it.w * .25, it.y + it.h * .5, it.dz + face * (it.d / 2 + .006)); m.rotation.y = face > 0 ? 0 : PI; g.add(m); edgeLines(m, m.geometry, 1.5); }
      });
      stacks.push({ g, x: sx, z: sz, top, items, face });
    }
    // наклейка доставки на коробке у гида (вставка 186): на грани к проходу, второй ярус
    // даты нет в сценарии -> на наклейке её нет: DELIVERED + штамп-галочка, поле даты смазано, сверху пыль.
    // --set date="..." печатает дату только если её явно передали (по умолчанию — смазанное поле)
    const DATE = o.date || null;
    const delivT = tex(1024, 640, (x, w, h) => {
      x.fillStyle = '#f6efdc'; x.fillRect(0, 0, w, h); x.lineWidth = 16; x.strokeStyle = '#141018'; x.strokeRect(8, 8, w - 16, h - 16);
      x.fillStyle = '#b3121f'; x.fillRect(8, 8, w - 16, 130); x.fillStyle = '#fff'; x.font = "900 92px 'Arial Black', Arial"; x.textBaseline = 'middle'; x.fillText('DELIVERED', 40, 76);
      x.fillStyle = '#141018'; x.font = '700 58px Arial'; x.fillText('DATE', 40, 210);
      if (DATE) { x.font = "900 132px 'Arial Black', Arial"; x.fillText(DATE, 40, 330); }
      else {                                                                                                // смазанное поле: размытые штрихи чернил, ничего не читается
        x.save(); x.filter = 'blur(9px)'; x.fillStyle = 'rgba(20,16,24,.55)';
        for (const [a, b, c] of [[40, 290, 120], [180, 300, 90], [300, 286, 150], [470, 296, 60]]) { x.beginPath(); x.ellipse(a + c / 2, b + 6, c / 2, 34, -.05, 0, 7); x.fill(); }
        x.filter = 'blur(3px)'; x.strokeStyle = 'rgba(20,16,24,.5)'; x.lineWidth = 10; x.beginPath(); x.moveTo(40, 300); x.bezierCurveTo(200, 270, 380, 340, 560, 290); x.stroke();
        x.restore();
      }
      x.font = '700 44px Consolas, monospace'; x.fillText('SITE: MY-DC-07  BAY 4', 40, 450);
      for (let i = 0; i < 60; i++) { const r = Math.abs(Math.sin(i * 12.9898) * 43758.5) % 1; x.fillRect(40 + i * 15.5, 500, r > .5 ? 9 : 4, 100); }
      // штамп-галочка: красный круг с галочкой, чуть повёрнут, с потёртостями
      x.save(); x.translate(800, 290); x.rotate(-.18); x.strokeStyle = 'rgba(179,18,31,.9)'; x.lineWidth = 18; x.beginPath(); x.arc(0, 0, 118, 0, 7); x.stroke();
      x.lineWidth = 8; x.beginPath(); x.arc(0, 0, 94, 0, 7); x.stroke();
      x.lineWidth = 30; x.lineCap = 'round'; x.lineJoin = 'round'; x.beginPath(); x.moveTo(-52, 4); x.lineTo(-12, 46); x.lineTo(62, -50); x.stroke();
      x.globalCompositeOperation = 'destination-out'; let s = 11; const rr = () => (s = (s * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < 140; i++) { x.globalAlpha = .3 + rr() * .6; x.beginPath(); x.arc((rr() - .5) * 260, (rr() - .5) * 260, 1 + rr() * 5, 0, 7); x.fill(); }
      x.restore(); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
      // пыль поверх: серо-бежевая вуаль гуще к верхнему краю + крапинки
      const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(150,138,116,.42)'); g.addColorStop(.5, 'rgba(150,138,116,.18)'); g.addColorStop(1, 'rgba(150,138,116,.08)');
      x.fillStyle = g; x.fillRect(0, 0, w, h); let s2 = 5; const r2 = () => (s2 = (s2 * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(${r2() < .5 ? '120,110,92' : '210,200,180'},${(.15 + r2() * .35).toFixed(2)})`; x.fillRect(r2() * w, r2() * h, 1 + r2() * 3, 1 + r2() * 3); }
      x.fillStyle = 'rgba(246,239,220,.35)'; x.beginPath(); x.ellipse(250, 310, 150, 60, -.1, 0, 7); x.fill();   // след пальца по пыли
    });
    const tgt = stacks.find(s => s.x === 9.15), it1 = tgt.items[1];
    const delivMat = paint(0xffffff, { map: delivT, amp: .04 });
    const sticker = new THREE.Mesh(new THREE.PlaneGeometry(.2, .2 * .625), delivMat);
    sticker.position.set(it1.dx - .15, it1.y + it1.h * .45, it1.dz + tgt.face * (it1.d / 2 + .007)); sticker.rotation.y = tgt.face > 0 ? 0 : PI; tgt.g.add(sticker); edgeLines(sticker, sticker.geometry, 2.2);
    // плёнка перед наклейкой у этого штабеля — та же; блик плёнки на вставке

    // ---------- двери в проход (180): перегородка у x = -14 с двустворчатой дверью ----------
    const doorWall = new THREE.Group(); doorWall.position.set(-14, 0, 0); dc.add(doorWall);
    const wallM = paint(0x203752, { amp: .2, freq: 1.2, vert: [0, 3, .25] }), doorM = paint(0x2f5470, { amp: .18, freq: 2, vert: [0, 2.4, .3] });   // навы/бирюза, как фоны серии
    rbox(doorWall, .2, 3.6, 3.4, wallM, 0, 1.8, 2.7, { r: .02, px: 3.5 }); rbox(doorWall, .2, 3.6, 3.4, wallM, 0, 1.8, -2.7, { r: .02, px: 3.5 }); rbox(doorWall, .2, 1.2, 2.0, wallM, 0, 3.0, 0, { r: .02, px: 3.5 });
    const doorFace = sgn => paint(0xffffff, { amp: .14, freq: 2, map: tex(256, 620, (x, w, h) => {
      x.fillStyle = '#3d6584'; x.fillRect(0, 0, w, h);
      const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(255,255,255,.08)'); g.addColorStop(1, 'rgba(0,0,20,.25)'); x.fillStyle = g; x.fillRect(0, 0, w, h);
      x.strokeStyle = '#0b0d17'; x.lineWidth = 5; x.strokeRect(20, 20, w - 40, h - 40);                                  // филёнка
      x.fillStyle = '#2b4c66'; x.fillRect(24, 24, w - 48, h - 48);
      const wx = sgn > 0 ? 70 : 70, wy = 70, ww = 116, wh = 190;                                                      // окошко
      x.fillStyle = '#5fc4cc'; x.fillRect(wx, wy, ww, wh); x.fillStyle = 'rgba(200,255,250,.35)'; x.fillRect(wx, wy, ww, wh * .3);
      x.strokeStyle = 'rgba(20,40,60,.55)'; x.lineWidth = 2; for (let k = 1; k < 6; k++) { x.beginPath(); x.moveTo(wx + k * ww / 6, wy); x.lineTo(wx + k * ww / 6, wy + wh); x.stroke(); x.beginPath(); x.moveTo(wx, wy + k * wh / 6); x.lineTo(wx + ww, wy + k * wh / 6); x.stroke(); }
      x.strokeStyle = '#0b0d17'; x.lineWidth = 7; x.strokeRect(wx, wy, ww, wh);
      x.fillStyle = '#e8dfc6'; x.fillRect(64, 300, 128, 46); x.strokeRect(64, 300, 128, 46); x.fillStyle = '#16202c';     // табличка «DATA HALL»
      x.font = '900 17px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('DATA HALL', 128, 324);
      x.fillStyle = '#7d8a99'; x.fillRect(24, h - 120, w - 48, 96); x.strokeRect(24, h - 120, w - 48, 96);              // отбойник
      x.fillStyle = 'rgba(0,0,0,.18)'; for (let k = 0; k < 7; k++) x.fillRect(30 + k * 32, h - 112, 3, 80);
    }) });
    const leaves = [];
    for (const s of [-1, 1]) {
      const hinge = new THREE.Group(); hinge.position.set(.05, 0, s * 1.0); doorWall.add(hinge);
      rbox(hinge, .06, 2.38, .98, doorM, 0, 1.2, -s * .49, { r: .015, px: 3.5 });
      // лицевая грань створки — рисунок: филёнка, окошко с армированным стеклом и бирюзовым светом прохода, табличка, отбойник
      decal(hinge, .98, 2.38, doorFace(s), -.0315, 1.2, -s * .49, { ry: -PI / 2, ink: 2.2 });
      rbox(hinge, .05, .04, .32, paint(0x9aa2ae), -.06, 1.1, -s * .86, { r: .01, px: 2 });
      decal(hinge, .5, .08, paint(0xc9a23a, { amp: .06 }), -.034, .3, -s * .49, { ry: -PI / 2 });
      leaves.push({ hinge, s });
    }
    // щель между створками: бирюзовый свет LED изнутри, гаснет по мере открытия (видна, пока двери закрыты)
    const leak = new THREE.Mesh(new THREE.PlaneGeometry(.02, 2.3), new THREE.MeshBasicMaterial({ color: new THREE.Color(.4, 1.25, 1.2), transparent: true, opacity: .8, depthWrite: false }));
    leak.position.set(-.04, 1.2, 0); leak.rotation.y = -PI / 2; doorWall.add(leak);
    // кодовый замок у двери: красный -> зелёный при открытии
    const lockL = new THREE.Mesh(new THREE.PlaneGeometry(.05, .05), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, .2, .15) })); lockL.position.set(-.11, 1.25, 1.25); lockL.rotation.y = -PI / 2; doorWall.add(lockL);
    rbox(doorWall, .03, .22, .14, paint(0x22262e), -.1, 1.2, 1.25, { r: .01, px: 2 });

    // ---------- свет: фонарик, рабочая лампа над героями ----------
    const torch = new THREE.SpotLight(0xffe2b0, 0, 26, .15, .45, 1.1);
    torch.castShadow = true; torch.shadow.mapSize.set(1024, 1024); torch.shadow.bias = -.0006; torch.shadow.camera.near = .2;
    L.group.add(torch, torch.target);
    const beam = new THREE.Group(); L.group.add(beam);
    const cone = lightCone(beam, { top: V(0, 0, 0), floorY: -1, r0: .006, r1: Math.tan(.15), color: [1, .9, .7], aTop: .1, aBottom: .18 });
    // «рисованный» луч (планы 180/182): плотный тёплый конус + узкое ядро + горячее пятно на плёнке
    const cone2 = lightCone(beam, { top: V(0, 0, 0), floorY: -1, r0: .01, r1: Math.tan(.15) * 1.05, color: [1, .86, .6], aTop: .22, aBottom: .42 });
    const core = lightCone(beam, { top: V(0, 0, 0), floorY: -1, r0: .004, r1: Math.tan(.15) * .45, color: [1, .95, .82], aTop: .16, aBottom: .3 });
    const hot = glow(L.group, V(0, 0, 0), { size: 1.1, color: 0xffd49a, opacity: 0 }), hot2 = glow(L.group, V(0, 0, 0), { size: .38, color: 0xfff1d6, opacity: 0 });
    let paintedBeam = 0;
    const setTorch = (pos, target, k, coneK = 1) => {
      torch.position.copy(pos); torch.target.position.copy(target); torch.target.updateMatrixWorld(); torch.intensity = 7 * k * (1 + paintedBeam * .6);
      const d = target.clone().sub(pos), len = d.length(); d.normalize();
      beam.position.copy(pos); beam.quaternion.setFromUnitVectors(V(0, -1, 0), d); beam.scale.setScalar(len * 1.1);
      cone.setAlpha(k * coneK * (1 - paintedBeam)); cone2.setAlpha(k * coneK * paintedBeam); core.setAlpha(k * coneK * paintedBeam);
      const hp = target.clone().addScaledVector(d, -.12);
      hot.position.copy(hp); hot2.position.copy(hp); hot.material.opacity = .45 * k * paintedBeam; hot2.material.opacity = .6 * k * paintedBeam;
      hot.scale.setScalar(.3 + len * .06); hot2.scale.setScalar(.1 + len * .02);
      cone2.visible = core.visible = hot.visible = hot2.visible = paintedBeam > 0;
    };
    const W = (x, y, z) => V(x, y, z).add(DC);                    // локальные координаты прохода -> мир
    const work = new THREE.PointLight(0xffb060, 0, 7, 1.3); work.position.copy(W(7.9, 2.75, .1)); L.group.add(work);
    const workShade = new THREE.Group(); workShade.position.copy(W(7.9, 2.95, .1)); L.group.add(workShade);
    rbox(workShade, .5, .08, .22, paint(0x2b313d), 0, 0, 0, { r: .02, px: 3 });
    const workPanel = new THREE.Mesh(new THREE.PlaneGeometry(.44, .16), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.9, 1.5, .95) })); workPanel.rotation.x = PI / 2; workPanel.position.y = -.042; workShade.add(workPanel);
    const workGlow = glow(L.group, W(7.9, 2.8, .1), { size: 1.4, color: 0xffb060, opacity: 0 });
    hazeCard(L.group, W(10, 1.4, 0), { w: 10, h: 3, color: 0x2a4a80, opacity: .09, ry: -PI / 2 });

    // ---------- герои ----------
    const IN = inspector(), GU = guide();
    const posI = W(7.25, 0, -.4), posG = W(8.25, 0, .62);
    const AI = new Actor(stage, IN, { pin: 'feet', occlude: false }).at(posI);
    const AG = new Actor(stage, GU, { pin: 'feet', occlude: false }).at(posG);
    IN.spec.shade = noirShade([1, -.55]); GU.spec.shade = noirShade([-1, -.55]);
    const shadowsG = new THREE.Group(); L.group.add(shadowsG);
    for (const [p, dx] of [[posI, -.18], [posG, .18]]) {
      blobShadow(shadowsG, { pos: p.clone().add(V(0, .006, 0)), size: [.62, .3], opacity: .62 });
      blobShadow(shadowsG, { pos: p.clone().add(V(-dx * 0, .007, dx * 2.2)), size: [.5, 1.1], rot: 0, opacity: .26 });     // отброс от рабочей лампы
    }
    const breathe = (p, t, seed) => { p.bob = -3 * (1 - Math.cos(t * 2 * PI * .3 + seed)) / 2; p.sq = 0; p.dx = 0; p.lean = .006 * Math.sin(t * 2 * PI * .2 + seed); p.tilt = (p.tilt || 0) * .3 + .012 * Math.sin(t * 2 * PI * .23 + seed); };
    const say = (t, a, b, rest = 'neutral') => [[0, rest], [a, 'talk'], [b, rest]];
    // инспектор: правая (ближняя к гиду) кисть с фонарём, левая держит планшет у груди
    function drawInspector(t, local, { talkAt = null, torchOn = true, aim = null, write = 0, look = [.55, 0] }) {
      const S = IN.spec, p = act(t, talkAt ? say(local, ...talkAt).map(([a, n]) => [a + (t - local), n]) : [[0, 'neutral']]);
      Object.assign(p, { blink: blinkAt(t, 3), view: 'threeQuarter', facing: 1, stance: 'stand', look }); breathe(p, t, 0);
      if (p.mouth === 'teeth' || p.mouth === 'teethOpen') p.mouth = 'open';
      // планшет — всегда в правой руке у груди; фонарь (и ручка на 185) — в левой
      const xf = AI.xf(), sh0 = shoulder(S, -1);
      const clipC = [26, -432 + 2 * Math.sin(t * 1.3)], handR = [52, -404];
      let handL, dirS = [-1, .35], torchW = null;
      if (aim) {                                                     // фонарь: кисть на линии плечо -> цель, на 74 % длины руки
        const tl = AI.toLocal(aim, xf), d = [tl[0] - sh0[0], tl[1] - sh0[1]], n = Math.hypot(...d); dirS = [d[0] / n, d[1] / n];
        handL = unUpper(S, p, [sh0[0] + dirS[0] * 150 + 30, sh0[1] + dirS[1] * 150 + 40]);
      } else handL = write > 0 ? [-6 + 24 * Math.sin(t * 9) * write, -452 + 6 * Math.sin(t * 17) * write] : restHand(S, -1);
      p.arms = [{ to: handL, w: 11 }, { to: handR, w: 11 }];
      AI.draw(p, { only: 'base' });
      AI.with(x => { clipboard(x, clipC, .1, .35 + .5 * clamp((local - .45) / 1.0) * (write > 0 ? 1 : 0)); });
      AI.draw(p, { only: 'front' });
      AI.with(x => { if (write > 0) pen(x, handL, -2.5); else if (aim) flashlight(x, handL, dirS, torchOn); else flashlight(x, handL, [-.15, 1], false); });
      // мировая точка линзы (для 3D-луча): от кисти на 60 ед. вдоль направления, обратно в мир через экран и глубину якоря
      if (aim) { const lp = [handL[0] + dirS[0] * 60, handL[1] + dirS[1] * 60]; torchW = localToWorld(AI, lp, xf); }
      return torchW;
    }
    function drawGuide(t, local, { talkAt = null, tap = null, look = [-.55, 0] }) {
      const S = GU.spec, p = act(t, talkAt ? say(local, ...talkAt).map(([a, n]) => [a + (t - local), n]) : [[0, 'neutral']]);
      Object.assign(p, { blink: blinkAt(t, 5), view: 'threeQuarter', facing: -1, stance: 'stand', look }); breathe(p, t, 1.7);
      if (p.mouth === 'teeth' || p.mouth === 'teethOpen') p.mouth = 'open';
      let hand1 = restHand(S, 1), hand0 = restHand(S, -1);
      if (tap) {                                                    // стучит по плёнке ближнего штабеля: кисть к плёнке, два коротких удара
        const tp = unUpper(S, p, tap.local), sh = shoulder(S, -1), g = gesture(local, tap.at, { lead: .2, rise: .28, hold: .7, fall: .3 });
        const knock = Math.max(0, Math.sin(clamp((local - tap.at - .1) / .5) * PI * 2)) * 14;
        hand0 = arcHand(sh, restHand(S, -1), [tp[0] + knock, tp[1]], clamp(g.hand));
        p.lean = (p.lean || 0) + .03 * g.body;
      }
      p.arms = [{ to: hand0, w: 11 }, { to: hand1, w: 11 }];
      AG.draw(p);
    }
    // точка фигуры -> мир: луч из камеры через экранную точку до глубины якоря
    const _r = new THREE.Raycaster();
    function localToWorld(A, lp, xf) {
      const c = Math.cos(xf.rot), s = Math.sin(xf.rot), dx = (lp[0] - A.pin[0]) * xf.s, dy = (lp[1] - A.pin[1]) * xf.s;
      const sx = xf.x + dx * c - dy * s, sy = xf.y + dx * s + dy * c;
      _r.setFromCamera(new THREE.Vector2(sx / stage.W * 2 - 1, -(sy / stage.H * 2 - 1)), stage.camera);
      const fwd = new THREE.Vector3(); stage.camera.getWorldDirection(fwd);
      const k = xf.d / _r.ray.direction.dot(fwd); return _r.ray.origin.clone().addScaledVector(_r.ray.direction, k);
    }

    // линии рёбер (LineSegments2) не участвуют в маске перекрытия героев: в проходе глубины они рисовались бы как
    // нерастянутые четырёхугольники (тонкие полосы поперёк героя)
    L.group.traverse(o => { if (o.isLineSegments2 || (o.material && o.material.isLineMaterial)) o.userData.noDepth = true; });
    // ---------- вид ----------
    const LOOK = noirLook({ fogColor: 0x0b1626, fogDensity: .05, bloom: .6, bloomThreshold: .84, bloomRadius: .55, far: 900,
      grade: { sat: .95, tint: [.93, 1.0, 1.05], lift: [.016, .024, .036], contrast: 1.03 } });
    if (solo) Object.assign(LOOK, { bg: solo === 'w' ? 0xffffff : 0x000000, fogDensity: 0, bloom: 0, grade: null, vignette: 0 });
    if (o.vig === '0') LOOK.vignette = 0;
    const G0 = LOOK.grade;
    const stripCol = P.strips.map(s => s.material.color.clone()), lightBase = P.stripLights.map(l => l.intensity);
    const setDark = (strips, hemi) => { P.strips.forEach((s, i) => s.material.color.copy(stripCol[i]).multiplyScalar(strips)); P.stripLights.forEach((l, j) => { l.intensity = lightBase[j] * strips; }); L.hemi.intensity = hemi; P.warm.intensity = 0; };
    const baseTick = L.tick;
    const set = { group: L.group, look: LOOK, tick(t, st) { baseTick(t, st); L.moon.intensity = 0; if (solo) L.group.visible = false; } };
    const cam = (K, ease) => (t, s) => { const c = camSpline(K.map(([u, v]) => [s.from + u * s.d, v.map((q, j) => j < 3 || (j >= 3 && j < 6) ? q + (j === 0 || j === 3 ? DC.x : 0) : q)]), t, ease); return c; };
    const shots = [];
    const add = (id, def) => { if (SH[id]) shots.push({ id, from: SH[id].from, to: SH[id].to, set, ...def(SH[id]) }); };
    const u01 = (t, s) => (t - s.from) / s.d;

    // ===== 180: двери открываются, луч фонаря в проходе =====
    // вид поднят в рисованный тёмно-синий/бирюзовый диапазон (как фоны серии): стена у дверей видна, проход за ними —
    // бирюзовая дымка, погашенные стойки читаются силуэтами; луч — плотный тёплый конус с горячим пятном на плёнке
    const doorLamp = new THREE.PointLight(0xffc48a, 0, 5.5, 1.4); doorLamp.position.copy(W(-14.7, 3.05, 0)); L.group.add(doorLamp);
    const doorCage = new THREE.Group(); doorCage.position.copy(W(-14.16, 3.05, 0)); L.group.add(doorCage);
    rbox(doorCage, .14, .12, .3, paint(0x2b313d), 0, .07, 0, { r: .02, px: 2.5 });
    const doorBulb = new THREE.Mesh(new THREE.SphereGeometry(.06, 16, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.6, .9) })); doorBulb.position.set(-.04, -.02, 0); doorCage.add(doorBulb);
    const doorGlow = glow(L.group, W(-14.25, 3.0, 0), { size: 1.3, color: 0xffb060, opacity: 0 });
    const rackFill = []; for (const z of [-1.2, 1.2]) for (const x of [-8, -2, 4]) { const pl = new THREE.PointLight(0x5fc6d0, 0, 6, 1.3); pl.position.copy(W(x, 2.6, z)); L.group.add(pl); rackFill.push(pl); }
    const darkRacks = (k) => { P.racks.forEach(r => { r.visible = false; }); rackFill.forEach(l => { l.intensity = 3.2 * k; }); };
    const openLook = (f, fog, dens) => { f.look.fogColor = fog; f.look.fogDensity = dens; if (!solo) f.look.grade = { sat: .98, tint: [.92, 1.0, 1.04], lift: [.03, .05, .065], contrast: 1.02 }; };
    add('180', s => ({
      camera: t => camSpline([[0, [-15.35, 1.55, .05, -6, 1.25, 0, 46]], [.55, [-13.6, 1.5, 0, -4, 1.2, 0, 45]], [1, [-10.6, 1.42, -.05, 0, 1.1, .1, 44]]].map(([u, v]) => [u, [v[0] + DC.x, v[1], v[2], v[3] + DC.x, v[4], v[5], v[6]]]), u01(t, s) , GLIDE),
      update(t, f) {
        const u = u01(t, s), lt = t - s.from; paintedBeam = 1;
        setDark(.38 + .3 * smoothK(lt, 1.2, 3.2), 1.05 + .25 * smoothK(lt, 1.0, 3.0)); openLook(f, 0x163a4e, .055);
        darkRacks(.4 + .6 * smoothK(lt, 1.0, 3.0));
        doorLamp.intensity = 2.6; doorGlow.material.opacity = .55;
        const open = E.inOutCubic(clamp((lt - .35) / 1.5)); for (const l of leaves) l.hinge.rotation.y = l.s * -1.75 * open * (1 - .06 * Math.sin(lt * 3) * (1 - open));
        lockL.material.color.setRGB(lt > .3 ? .25 : 1.6, lt > .3 ? 1.6 : .2, .15);
        const c = f.cam, cp = V(...c.pos);
        // луч: сначала на створки, с открытием — в проход, к штабелю в плёнке справа вдали (горячее пятно на плёнке)
        const go = E.inOutSine(clamp((lt - .9) / (s.d - 1.1)));
        const aimX = lt < .9 ? -14.1 : lerp(-14.1, 1.0, go), aimY = lt < .9 ? 1.15 - .1 * lt : lerp(1.05, .95, go), aimZ = lt < .9 ? .35 - .3 * lt : lerp(.08, .62, go);
        const k = smoothK(lt, .08, .4);                                                      // фонарь включается плавно (без мерцания)
        const from = cp.clone().add(V(-.3, -.42, -.45)), to = W(aimX, aimY, aimZ);
        setTorch(from, to, k * lerp(.7, 1.15, smoothK(lt, .8, 1.6)), lerp(.45, 1, smoothK(lt, .9, 1.8)));
        motesInBeam(lt, from, to, k * .55 * smoothK(lt, .8, 1.8)); hidePuff();
        leak.material.opacity = .55 * clamp(1 - open * 4);
        work.intensity = 0; workGlow.material.opacity = 0; workPanel.visible = false; shadowsG.visible = false;
      },
    }));
    // ===== 182: фонарь скользит по плёнке, боковой проезд; с плёнки в луче поднимается пыль =====
    add('182', s => ({
      camera: t => camSpline([[0, [.5, 1.3, -1.05, 1.3, .8, 1.25, 38]], [1, [4.2, 1.26, -1.1, 5.0, .8, 1.25, 38]]].map(([u, v]) => [u, [v[0] + DC.x, v[1], v[2], v[3] + DC.x, v[4], v[5], v[6]]]), u01(t, s), GLIDE),
      update(t, f) {
        const lt = t - s.from, u = u01(t, s); paintedBeam = 1;
        setDark(.62, 1.2); darkRacks(1); openLook(f, 0x18404f, .045);
        doorLamp.intensity = 0; doorGlow.material.opacity = 0;
        const c = f.cam, cp = V(...c.pos), ax = lerp(.4, 6.2, E.inOutSine(u)), ay = .78 + .2 * Math.sin(lt * 2.2);
        const from = cp.clone().add(V(-.25, .42, .32)), to = W(ax, ay, .68);                    // фонарь чуть впереди и выше камеры: конус не заливает кадр
        setTorch(from, to, .9, .55);
        motesInBeam(lt + 7, from, to, .6, .13);
        filmTex.offset.y = lt * .01; hidePuff();
        work.intensity = 0; workGlow.material.opacity = 0; workPanel.visible = false; shadowsG.visible = false;
      },
    }));
    // общие для диалога
    const dlgLight = f => { paintedBeam = 0; if (!solo) f.look.grade = G0; hideMotes(); hidePuff(); doorLamp.intensity = 0; doorGlow.material.opacity = 0; darkRacks(.35); setDark(.55, .75); work.intensity = 2.1; workGlow.material.opacity = .45; workPanel.visible = true; shadowsG.visible = true; f.look.fogDensity = .045; f.look.fogColor = 0x12324a; };
    const aimBox = W(6.9, .45, -.72), aimCU = W(6.55, 1.2, -.95);                                    // инспектор светит на штабель за собой слева (x 8, z -1.25)
    // ===== 183w: общий план =====
    add('183w', s => ({
      camera: t => camSpline([[0, [4.3, 1.35, -.18, 8.2, 1.0, .12, 40]], [1, [4.6, 1.33, -.18, 8.2, 1.0, .12, 39]]].map(([u, v]) => [u, [v[0] + DC.x, v[1], v[2], v[3] + DC.x, v[4], v[5], v[6]]]), u01(t, s)),
      update(t, f) { dlgLight(f); AI.occlude = AG.occlude = true; },
      chars(t) {
        const lt = t - s.from, aim = W(6.95, .4, -.7);
        // дальний первым: гид (z .72 дальше от камеры по x? оба на одной глубине) — рисуем по глубине
        const items = [[AI, () => drawInspector(t, lt, { aim, look: [.5, .1] })], [AG, () => drawGuide(t, lt, { look: [-.5, .05] })]].map(([A, fn]) => ({ d: A.xf().d, fn }));
        items.sort((a, b) => b.d - a.d); let tw = null; for (const it of items) { const r = it.fn(); if (r) tw = r; }
        if (tw) setTorchLate(tw, aim);
      },
    }));
    // ===== 183: крупно инспектор «Is it switched on?» =====
    add('183', s => ({
      camera: t => camSpline([[0, [6.05, 1.5, .84, 7.3, 1.36, -.4, 31]], [1, [6.25, 1.48, .64, 7.3, 1.36, -.4, 30]]].map(([u, v]) => [u, [v[0] + DC.x, v[1], v[2], v[3] + DC.x, v[4], v[5], v[6]]]), u01(t, s), GLIDE),
      update(t, f) { dlgLight(f); },
      chars(t) { const lt = t - s.from; const tw = drawInspector(t, lt, { talkAt: [.15, .15 + Math.min(1.0, s.d * .65)], aim: aimCU, look: [.5, 0] }); if (tw) setTorchLate(tw, aimCU); },
    }));
    // ===== 184: средний гид (обратная точка) «It's still wrapped.» =====
    sticker.updateMatrixWorld(true); const tapPt = sticker.localToWorld(V(-.2, -.02, .03)); const tapN = V(0, 0, tgt.face).applyQuaternion(tgt.g.getWorldQuaternion(new THREE.Quaternion()));
    add('184', s => ({
      camera: t => camSpline([[0, [6.35, 1.45, -.55, 8.25, 1.25, .62, 34]], [1, [6.45, 1.45, -.48, 8.3, 1.25, .64, 34]]].map(([u, v]) => [u, [v[0] + DC.x, v[1], v[2], v[3] + DC.x, v[4], v[5], v[6]]]), u01(t, s)),
      update(t, f) { dlgLight(f); setTorch(W(7.1, 1.1, -.4), aimBox, .0, 0); const lt = t - s.from, at = Math.min(.55, s.d * .35); puffAt(tapPt, tapN, lt - (at + .22)); },
      chars(t) { const lt = t - s.from; drawGuide(t, lt, { talkAt: [.12, .12 + Math.min(1.05, s.d * .66)], tap: { local: [-212, -436], at: Math.min(.55, s.d * .35) }, look: [-.5, 0] }); },
    }));
    // ===== 185: крупно инспектор «Since when?» — пишет =====
    add('185', s => ({
      camera: t => camSpline([[0, [6.2, 1.48, .72, 7.28, 1.34, -.4, 29]], [1, [6.42, 1.46, .52, 7.28, 1.34, -.4, 27.5]]].map(([u, v]) => [u, [v[0] + DC.x, v[1], v[2], v[3] + DC.x, v[4], v[5], v[6]]]), u01(t, s), GLIDE),
      update(t, f) { dlgLight(f); setTorch(W(7.1, 1.1, -.4), aimBox, 0, 0); },
      chars(t) { const lt = t - s.from; drawInspector(t, lt, { talkAt: [.1, .1 + Math.min(.7, s.d * .5)], write: clamp((lt - .45) / .25), look: [.25, .35] }); },
    }));
    // ===== 186: вставка — палец на наклейке =====
    add('186', s => {
      sticker.updateMatrixWorld(true); const sp = new THREE.Vector3(); sticker.getWorldPosition(sp); const nrm = V(0, 0, tgt.face).applyQuaternion(tgt.g.getWorldQuaternion(new THREE.Quaternion()));
      return {
        camera: t => { const u = GLIDE(clamp(u01(t, s))), d = lerp(.36, .28, u); const p = sp.clone().addScaledVector(nrm, d).add(V(.06, .05, 0)); return { pos: p.toArray(), target: sp.clone().add(V(.015, -.005, 0)).toArray(), fov: 36, roll: -2 }; },
        update(t, f) { dlgLight(f); work.intensity = 2.6; f.look.fogDensity = .02; setTorch(sp.clone().addScaledVector(nrm, 1.1).add(V(-.4, .5, 0)), sp, .22, 0); },
        over(t) {
          if (solo) return;
          // рука гида: тёмная «трубка» из правого нижнего угла, кисть-точка ложится на дату и чуть нажимает
          const lt = t - s.from, k = E.outBack(clamp((lt - .15) / .45), 1.2), press = lt > .6 ? .06 * Math.sin(clamp((lt - .6) / .25) * PI) : 0;
          const dateP = stage.project(sticker.localToWorld(V(-.003, -.011, .004)));
          const ctx = stage.ctx, hx = lerp(stage.W + 160, dateP[0], k), hy = lerp(stage.H + 120, dateP[1] + 18, k), r = 46 * (1 - press);
          const ex = lerp(stage.W + 220, (hx + stage.W) / 2 + 60, k), ey = lerp(stage.H + 200, hy + 210, k);
          ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          ctx.strokeStyle = '#141014'; ctx.lineWidth = 66; ctx.beginPath(); ctx.moveTo(stage.W + 300, stage.H + 260); ctx.quadraticCurveTo(ex, ey, hx, hy); ctx.stroke();
          ctx.strokeStyle = 'rgba(255,214,150,.2)'; ctx.lineWidth = 11; ctx.beginPath(); ctx.moveTo(stage.W + 300, stage.H + 250); ctx.quadraticCurveTo(ex - 16, ey - 14, hx - 10, hy - 12); ctx.stroke();
          ctx.fillStyle = 'rgba(10,6,10,.35)'; ctx.beginPath(); ctx.ellipse(hx + 14, hy + 16, r * 1.1, r * .8, 0, 0, PI * 2); ctx.fill();
          ell(ctx, hx, hy, r, r, '#141014', null);
          ctx.restore();
        },
      };
    });
    // поздняя установка луча: позиция линзы известна только после рисования героя -> следующий кадр того же t нельзя,
    // поэтому луч на планах с героем считается заранее по прошлой позе (детерминированно: та же поза в том же t)
    let pendingTorch = null;
    function setTorchLate(from, to) { pendingTorch = [from, to]; }
    // предварительный проход: на диалоговых планах с фонарём позу считаем до рендера (без рисования), чтобы луч шёл из линзы
    for (const sh of shots) if (sh.id === '183' || sh.id === '183w') {
      const upd = sh.update, ch = sh.chars;
      sh.update = (t, f) => {
        upd(t, f);
        const c = stage.ctx, saved = stage.ctx; // рисуем в черновой канвас, чтобы узнать линзу
        const tmp = scratch(); stage.ctx = tmp.getContext('2d'); pendingTorch = null; ch(t); stage.ctx = saved;
        if (pendingTorch) setTorch(pendingTorch[0], pendingTorch[1], solo ? 0 : 1, sh.id === '183' ? .25 : .5);
      };
    }
    let _scr = null; function scratch() { if (!_scr) { _scr = document.createElement('canvas'); _scr.width = stage.W; _scr.height = stage.H; } return _scr; }
    function smoothK(t, a, b) { const k = clamp((t - a) / (b - a)); return k * k * (3 - 2 * k); }

    return { duration: DUR, scenes: shots, transitions: [] };
  },
};
