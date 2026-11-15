// props.js: 3D-предметы, которые должны выглядеть нарисованными поверх рисованной плиты.
//   paintMat — заливка ровно тремя тонами (тень / полутон / свет) по направлению света ИЗ ПЛИТЫ, тона сняты с
//              нарисованных коробок и паллет на фонах и домножены на «грейд» сцены; туман сцены = дымка плиты;
//              необязательный цветной край (rim) от второго источника (лампа, проём двери)
//   контур    — те же обратная оболочка и линии рёбер, что в engine/src/sets/noirLogistics.js (толщина в пикселях)
//   hero()    — коробка с сервером: картон, лента цвета Nvidia крест-накрест, светящаяся пломба, наклейка с серийником,
//               на паллете. Начало координат — низ паллета.
//   craneHook() — крюк крана с тросом и четырьмя стропами к углам паллета (сцена порта)
import { THREE } from 'engine';
import { inkMat, hullGeo, edgeLines } from 'engine/sets/noirLogistics.js';
import { glowTex } from 'engine/core/textures.js';

const C = h => new THREE.Color(h);
// базовые тона (sRGB), сняты с нарисованных коробок/паллет bg_warehouse и bg_datacenter
export const TONES = {
  card: ['#7a4f34', '#b87e4c', '#d9a46c'],
  pallet: ['#5e3a22', '#a2652f', '#cc8a46'],
  strap: ['#3a5a10', '#64961a', '#86c426'],          // зелёный Nvidia, «нарисованный» (не светится)
  label: ['#7d786e', '#cfc6b2', '#f2e9d6'],
  steel: ['#12161f', '#2a3140', '#46506a'],
  yellow: ['#5a3c14', '#b07a22', '#e0a838'],
};
const toneCache = new Map();
// grade: { shadow:[r,g,b], mid:[..], light:[..] } — множители сцены; L — направление НА свет (мир); rim: { dir, color, k }
export function paintMat(name, grade, L, rim = null, map = null) {
  const t = TONES[name].map((h, i) => C(h).multiply(new THREE.Color(...[grade.shadow, grade.mid, grade.light][i])));
  const m = new THREE.ShaderMaterial({
    fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      c0: { value: t[0] }, c1: { value: t[1] }, c2: { value: t[2] }, L: { value: new THREE.Vector3(...L).normalize() },
      R: { value: new THREE.Vector3(...(rim ? rim.dir : [0, 1, 0])).normalize() }, rc: { value: C(rim ? rim.color : '#000') }, rk: { value: rim ? rim.k : 0 },
      map: { value: map }, useMap: { value: map ? 1 : 0 },
    }]),
    vertexShader: `varying vec3 vN; varying vec2 vUv;
      #include <fog_pars_vertex>
      void main(){ vN = normalize(mat3(modelMatrix) * normal); vUv = uv; vec4 mvPosition = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
      }`,
    fragmentShader: `uniform vec3 c0, c1, c2, L, R, rc; uniform float rk, useMap; uniform sampler2D map; varying vec3 vN; varying vec2 vUv;
      #include <fog_pars_fragment>
      void main(){ vec3 n = normalize(vN); float d = dot(n, L);
        vec3 col = mix(c0, c1, smoothstep(-.22, -.16, d)); col = mix(col, c2, smoothstep(.42, .48, d));
        col = mix(col, rc, rk * smoothstep(.5, .56, dot(n, R)));
        if (useMap > .5) col *= texture2D(map, vUv).rgb;
        gl_FragColor = vec4(col, 1.);
        #include <fog_fragment>
      }`,
  });
  return m;
}

// меш + контур (обратная оболочка) + линии рёбер — как inked() в noirLogistics, но с нашим материалом
function inked(parent, geo, mat, px = 3.5, edges = true) {
  const m = new THREE.Mesh(geo, mat); parent.add(m);
  if (px) { m.add(new THREE.Mesh(hullGeo(geo), inkMat(px))); if (edges) edgeLines(m, geo, Math.max(1.5, px * .55)); }
  return m;
}
const boxG = (w, h, d) => new THREE.BoxGeometry(w, h, d);

function labelTex(sn) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 320; const x = c.getContext('2d');
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, 512, 320); x.strokeStyle = '#141018'; x.lineWidth = 14; x.strokeRect(7, 7, 498, 306);
  x.fillStyle = '#76b900'; x.fillRect(30, 30, 110, 110);
  x.fillStyle = '#141018'; x.font = 'bold 64px Arial'; x.fillText('SN', 168, 92); x.font = 'bold 46px Consolas, monospace'; x.fillText(sn, 168, 140);
  for (let i = 0; i < 44; i++) { const r = Math.abs(Math.sin(i * 12.9898 + 3.1) * 43758.5) % 1; x.fillRect(32 + i * 10.5, 180, r > .5 ? 7 : 3, 108); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

// коробка на паллете. o: { grade, L, rim, px }
export function hero({ grade, L, rim = null, px = 3.5, sn = '4XG-2207-1193' }) {
  const g = new THREE.Group();
  const M = n => paintMat(n, grade, L, rim);
  const PW = 1.2, PD = 1.0, PH = .14, BW = .92, BH = .62, BD = .76, BY = PH;
  const pm = M('pallet');
  inked(g, boxG(PW, .035, PD), pm, px * .8).position.set(0, PH - .0175, 0);                    // верхний настил
  inked(g, boxG(PW, .022, PD), pm, px * .8, false).position.set(0, .011, 0);                  // нижний настил
  for (const x of [-PW / 2 + .07, 0, PW / 2 - .07]) inked(g, boxG(.14, PH - .057, PD), pm, px * .8).position.set(x, .022 + (PH - .057) / 2, 0);   // шашки — между ними тёмные проёмы
  const dark = new THREE.Mesh(boxG(PW - .02, PH - .06, PD - .04), new THREE.MeshBasicMaterial({ color: 0x0c0a10, fog: true })); dark.position.set(0, .022 + (PH - .057) / 2, 0); g.add(dark);
  inked(g, boxG(BW, BH, BD), M('card'), px).position.set(0, BY + BH / 2, 0);
  const sm = M('strap'), sw = .1;
  const s1 = new THREE.Mesh(boxG(sw, BH + .012, BD + .012), sm); s1.position.set(0, BY + BH / 2 + .001, 0); g.add(s1);
  const s2 = new THREE.Mesh(boxG(BW + .012, BH + .01, sw), sm); s2.position.set(0, BY + BH / 2, 0); g.add(s2);
  for (const s of [s1, s2]) edgeLines(s, s.geometry, 1.5);
  // наклейка спереди справа и сбоку
  const lm = paintMat('label', grade, L, rim, labelTex(sn));
  const la = new THREE.Mesh(new THREE.PlaneGeometry(.26, .165), lm); la.position.set(BW * .27, BY + BH * .58, BD / 2 + .004); g.add(la);
  const lb = new THREE.Mesh(new THREE.PlaneGeometry(.26, .165), lm); lb.rotation.y = Math.PI / 2; lb.position.set(BW / 2 + .004, BY + BH * .58, -BD * .22); g.add(lb);
  // пломба на ленте спереди: светится, с ореолом
  const seal = new THREE.Mesh(new THREE.CircleGeometry(.06, 28), new THREE.MeshBasicMaterial({ color: C('#a6f03a'), toneMapped: false, fog: false }));
  seal.position.set(0, BY + BH * .52, BD / 2 + .009); g.add(seal);
  const ring = new THREE.Mesh(new THREE.RingGeometry(.06, .075, 28), new THREE.MeshBasicMaterial({ color: 0x141018, fog: false })); ring.position.copy(seal.position); ring.position.z -= .001; g.add(ring);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: C('#8be02a'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: .55, fog: false }));
  glow.position.copy(seal.position).add(new THREE.Vector3(0, 0, .03)); glow.scale.setScalar(.42); g.add(glow);
  g.userData = { PW, PD, PH, top: BY + BH };
  return g;
}

// крюк крана: трос сверху, обойма, крюк, четыре стропы к углам паллета. update(hookPos) — точка крюка в мире.
export function craneHook({ grade, L, px = 3.5 }) {
  const g = new THREE.Group();
  const steel = paintMat('steel', grade, L), yel = paintMat('yellow', grade, L);
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(.022, .022, 1, 8), steel); g.add(cable);
  const cableInk = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, 1, 8), new THREE.MeshBasicMaterial({ color: 0x0a0c16, side: THREE.BackSide })); g.add(cableInk);
  const block = new THREE.Group(); g.add(block);
  inked(block, boxG(.36, .42, .26), yel, px).position.set(0, .34, 0);
  inked(block, new THREE.CylinderGeometry(.13, .13, .28, 20).rotateX(Math.PI / 2), steel, px).position.set(0, .5, 0);
  const hk = inked(block, new THREE.TorusGeometry(.09, .03, 10, 20, Math.PI * 1.45), steel, px * .8, false); hk.rotation.z = -Math.PI * .22; hk.position.set(0, .04, 0);
  inked(block, boxG(.05, .12, .05), steel, px * .7).position.set(0, .14, 0);
  const slings = []; for (let i = 0; i < 4; i++) { const s = new THREE.Mesh(new THREE.CylinderGeometry(.014, .014, 1, 6), steel); const k = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, 1, 6), new THREE.MeshBasicMaterial({ color: 0x0a0c16, side: THREE.BackSide })); g.add(s, k); slings.push([s, k]); }
  const up = new THREE.Vector3(0, 1, 0), tmp = new THREE.Vector3();
  const stretch = (m, a, b) => { tmp.subVectors(b, a); const L2 = tmp.length(); m.position.copy(a).addScaledVector(tmp, .5); m.scale.set(1, L2, 1); m.quaternion.setFromUnitVectors(up, tmp.normalize()); };
  function update(hook, corners, slack = 0) {
    block.position.copy(hook);
    const top = hook.clone().add(new THREE.Vector3(0, .65, 0)), sky = hook.clone().add(new THREE.Vector3(0, 40, 0));
    stretch(cable, top, sky); stretch(cableInk, top, sky);
    corners.forEach((c, i) => { const a = hook.clone().add(new THREE.Vector3(0, .04, 0)), b = c.clone(); if (slack) b.y += 0; stretch(slings[i][0], a, b); stretch(slings[i][1], a, b); });
  }
  return { group: g, update };
}
