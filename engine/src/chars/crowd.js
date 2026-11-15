// crowd.js: толпа — сотни и тысячи плоских солдат дёшево.
//
//   const red = new Crowd(stage, {
//     count: 200,
//     clips: [{ char: soldierRed(), gait: 'march', opt: { musket: true } }, { char: drummer(), pose: (ch, ph, vw) => ACT.drumming(ch, 0, { phase: ph, ...vw }) }],
//     clip: i => (i < 8 ? 1 : 0),                 // какой клип у участника (число | (i, t) => число)
//     pos: (i, t, out) => out.set(x, y, z),       // мировая позиция ступней: фильм ставит участников на настил моста
//     heading: 0,                                 // курс (рад; 0 = идёт в +Z, PI/2 = в +X) — число | (i, t) => число
//     rate: 1.9, offset: 0,                       // фаза = t * rate + offset(i): 0 — все как один; 'random' — вразнобой
//     shadow: { parent: set.group },              // пятна-тени на земле (слой окружения)
//   });
//   сцена:  props: [red.shadow],  update(t) { red.update(t); }   chars(t) { red.draw(t); }   (тени видны только в сценах, где названы)
//
// Как рисуется. Клип = герой + походка: при создании каждый клип один раз рисуется вектором в атлас (4 вида x phases фаз
// + вид сверху) в двух размерах — подробном и «дальнем» (с утолщённым контуром: ряды шляп читаются и при 15 px роста).
// В кадре участники сортируются по глубине и уходят одним проходом WebGL (instancing) поверх готового окружения: глубина
// декорации при этом сохраняется, поэтому толпу попиксельно перекрывают цепи, пилоны и скалы; свет, туман и bloom сцены
// на неё не ложатся (как и на героев). Ближние участники (выше nearPx пикселей) рисуются вектором в полном качестве и идут
// в тот же проход — с той же сортировкой и перекрытием. Вид выбирается по углу между курсом участника и камерой;
// при взгляде сверху (круче ~60°) участник заменяется видом сверху, лежащим в плоскости земли.
//
// Параметры: count, clips[{ char, gait, opt, over, pose(ch, phase, {view, facing}) , yaw }], clip, pos, heading, rate, offset,
//   phase(i, t), state(i, t, m) — правка участника перед отрисовкой: m.rot (поворот фигуры), m.scale, m.alpha, m.air (true —
//   pos задаёт центр тела, а не ступни: полёт), m.clip, m.phase, m.heading, m.view/m.facing (жёстко), m.hide, m.marble (0..1), m.noTop (не подменять видом сверху и не сплющивать: падающие фигурки),
//   m.pose(p) — правка позы ближнего участника (эмоции);
//   marbles — 0..1 | (i, t) => 0..1: гэг «шарики» (фигура схлопывается в катящийся синий шарик и обратно);
//   cell [ширина, высота] ячейки атласа, box { x0, x1, y0, y1 } — область фигуры в ячейке (ед. рисунка), phases, nearPx, maxNear, haze (0..1 — подмешать туман сцены вдали), bias.
// Методы: update(t) — тени (вызывать в update сцены), draw(t, { nearer, farther }) — отрисовка (диапазон глубин в метрах —
// чтобы вставить героя между рядами), drawWith(t, [[actor, pose], ...]) — толпа и актёры в общем порядке глубины,
// stats — { drawn, near, ms } последнего кадра.
import * as THREE from 'three';
import { drawStickman } from './stickman.js';
import { gait, GAIT_YAW } from './gaits.js';
import { marble2D } from './closeups.js';
import { softTex } from '../core/textures.js';
import { clamp, lerp, smooth, seg, E } from '../core/ease.js';
import { hash } from '../core/rng.js';

const VIEWS = ['front', 'threeQuarter', 'side', 'back'], TAU = Math.PI * 2, PI = Math.PI, fract = v => v - Math.floor(v);
const BOX = globalThis.__CROWD_LEGACY ? { x0: -350, x1: 350, y0: -1190, y1: 44 } : { x0: -560, x1: 560, y0: -1460, y1: 60 };                       // область фигуры в ячейке, единицы рисунка
const N_TOP = 4, N_MARBLE = 12;

const VS = `
attribute vec3 iPos; attribute vec4 iUv; attribute vec4 iSize; attribute vec4 iA; attribute vec2 iB;
uniform vec2 uRes; uniform float uPx, uBias, uLegacy;
varying vec2 vUv, vScr; varying float vLod, vAlpha, vDepth;
void main() {
  vec2 q = position.xy; vUv = iUv.xy + q * iUv.zw; vLod = iA.y; vAlpha = iA.w;
  vec2 off = (q - iSize.zw) * iSize.xy; float cr = cos(iA.x), sr = sin(iA.x);
  if (iA.z > .5 && iA.z < 1.5) {                                            // вид сверху: квадрат лежит в плоскости земли
    float ch = cos(iB.x), sh = sin(iB.x);
    vec4 mv = viewMatrix * vec4(iPos + vec3(0., 1.5, 0.) + vec3(ch, 0., -sh) * off.x + vec3(sh, 0., ch) * off.y, 1.); mv.z += uBias;   // на высоте шляп, чтобы не спорить с землёй
    gl_Position = projectionMatrix * mv; vDepth = -mv.z; vScr = gl_Position.xy / gl_Position.w * .5 + .5; return;
  }
  off.y *= iB.y; off = vec2(off.x * cr - off.y * sr, off.x * sr + off.y * cr);
  vec4 mv0 = viewMatrix * vec4(iPos, 1.); vec4 c0 = projectionMatrix * mv0, c1 = projectionMatrix * viewMatrix * vec4(iPos + vec3(0., 1., 0.), 1.);
  vec2 n0 = c0.xy / c0.w, up = (c1.xy / c1.w - n0) * uRes; float ul = length(up); up = ul > 1e-4 ? up / ul : vec2(0., 1.);
  vec2 ndc = n0 + (vec2(up.y, -up.x) * off.x + up * off.y) * (uPx / c0.w) * 2. / uRes;
  vec4 mvz = viewMatrix * vec4(iPos + vec3(0., clamp(off.y, 0., 3.), 0.), 1.); mvz.z += uBias;     // глубина — как у вертикальной плоскости
  vec4 cz = projectionMatrix * mvz;
  // w одна на весь прямоугольник (c0.w): иначе uv и экранная координата интерполируются с перспективой между верхом и низом
  // (у них разная глубина) и рисунок внутри прямоугольника съезжает — «разрезанные» и удвоенные фигуры
  gl_Position = uLegacy > .5 ? vec4(ndc * cz.w, cz.z, cz.w) : vec4(ndc * c0.w, cz.z / cz.w * c0.w, c0.w); vDepth = -mv0.z; vScr = ndc * .5 + .5;
}`;
const FS = `
uniform sampler2D tMain, tFar, tNear; uniform vec3 uFog; uniform float uFogD, uHaze, uLegacy; uniform vec2 uRes;
varying vec2 vUv, vScr; varying float vLod, vAlpha, vDepth;
void main() {
  // ближний слой берётся строго по координате пикселя; дальний и подробный атласы — переключением, без смешения двух рисунков
  vec4 c = vLod > 1.5 ? texture2D(tNear, uLegacy > .5 ? vScr : gl_FragCoord.xy / uRes) : (uLegacy > .5 ? mix(texture2D(tMain, vUv), texture2D(tFar, vUv), clamp(vLod, 0., 1.)) : (vLod > .5 ? texture2D(tFar, vUv) : texture2D(tMain, vUv)));
  if (c.a < .004) discard;
  float f = uHaze * (1. - exp(-uFogD * uFogD * vDepth * vDepth));
  c.rgb = mix(c.rgb, uFog * c.a, f);
  gl_FragColor = c * vAlpha;
}`;

// Ближний слой (не legacy): все ближние участники рисуются вектором в один экранный слой строго от дальних к ближним и выводятся
// ОДНИМ полноэкранным проходом. Рядом с цветом рисуется «карта владельца»: силуэт каждого участника, залитый его удалением
// (горизонтальная дистанция от камеры, 8 бит в диапазоне группы). Шейдер по ней восстанавливает глубину вертикальной плоскости
// участника в этом пикселе и пишет её в gl_FragDepth — декорация перекрывает каждого участника по его собственной глубине,
// каждый пиксель выводится один раз (полупрозрачные края не уплотняются), прямоугольников, которые могли бы резать фигуру, нет.
const NEAR_VS = `void main() { gl_Position = vec4(position.xy, 0., 1.); }`;
const NEAR_FS = `
uniform sampler2D tNear, tOwner; uniform vec2 uRes, uTan, uC; uniform vec3 uNV, uFog; uniform float uP10, uP14, uBias, uFogD, uHaze;
void main() {
  vec2 uv = gl_FragCoord.xy / uRes; vec4 c = texture2D(tNear, uv); if (c.a < .004) discard;
  vec4 o = texture2D(tOwner, uv); float cv = mix(uC.x, uC.y, o.a > .05 ? clamp(o.r / o.a, 0., 1.) : 0.);
  vec2 nd = uv * 2. - 1.; vec3 dir = vec3(nd.x * uTan.x, nd.y * uTan.y, -1.);
  float den = dot(uNV, dir), tz = max((den > .05 ? cv / den : cv) - uBias, .05);
  gl_FragDepth = clamp((uP10 * (-tz) + uP14) / tz * .5 + .5, 0., 1.);
  float f = uHaze * (1. - exp(-uFogD * uFogD * tz * tz)); c.rgb = mix(c.rgb, uFog * c.a, f);
  gl_FragColor = c;
}`;
// обёртка над 2D-контекстом: рисует те же контуры, но одним цветом (для карты владельца)
const flatCtx = (ctx, col) => { ctx.fillStyle = col; ctx.strokeStyle = col; return new Proxy(ctx, {
  get(t, k) { const v = t[k]; return typeof v === 'function' ? v.bind(t) : v; },
  set(t, k, v) { if (k === 'fillStyle' || k === 'strokeStyle') t[k] = col; else if (k === 'globalAlpha') t[k] = v > .3 ? 1 : 0; else t[k] = v; return true; } }); };

export class Crowd {
  constructor(stage, o) {
    this.stage = stage; this.n = o.count; this.o = o;
    this.BOX = { ...BOX, ...(o.box || {}) };                                  // o.box = { x0, x1 } — шире ячейка для поз с сильным наклоном (спотыкается, летит): иначе голову режет край ячейки
    this.clips = o.clips.map(c => ({ gait: 'march', opt: {}, ...c, yaw: c.yaw ?? GAIT_YAW[c.gait] ?? 0 }));
    this.P = o.phases ?? 12; this.nearPx = o.nearPx ?? null; this.maxNear = o.maxNear ?? 40; this.haze = o.haze ?? 0; this.bias = o.bias ?? .12;
    this.rate = o.rate ?? 1.9; this.marbles = o.marbles ?? 0;
    const off = o.offset ?? 0; this.offsets = new Float32Array(this.n);
    for (let i = 0; i < this.n; i++) this.offsets[i] = off === 'random' ? hash(i * 3.71 + (o.seed ?? 1) * 17.3) : typeof off === 'function' ? off(i) : off;
    this._v = new THREE.Vector3(); this._m = []; for (let i = 0; i < this.n; i++) this._m.push({ i, pos: new THREE.Vector3() });
    this.stats = { drawn: 0, near: 0, ms: 0 };
    this._atlas(o.cell || (globalThis.__CROWD_LEGACY ? [144, 264] : [200, 272])); this._mesh();
    if (o.shadow) this._shadows(o.shadow);
  }
  // ---------- атлас: клипы x (4 вида x P фаз + N_TOP видов сверху), затем шарик ----------
  _atlas([cw, ch]) {
    const max = Math.min(4096, this.stage.renderer.capabilities.maxTextureSize), per = 4 * this.P + N_TOP, total = this.clips.length * per + N_MARBLE;
    let k = 1; for (; ;) { const cols = Math.floor(max / (cw * k)), rows = Math.ceil(total / cols); if (rows * ch * k <= max) break; k *= .9; }
    cw = Math.floor(cw * k); ch = Math.floor(ch * k);
    const cols = Math.floor(max / cw), rows = Math.ceil(total / cols), W = cols * cw, H = rows * ch, FK = .25;
    const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
    const main = mk(W, H), far = mk(Math.ceil(W * FK), Math.ceil(H * FK)), xm = main.getContext('2d'), xf = far.getContext('2d');
    const s = Math.min(cw / (this.BOX.x1 - this.BOX.x0), ch / (this.BOX.y1 - this.BOX.y0));       // пикселей на единицу рисунка
    this.cell = { cw, ch, cols, rows, W, H, s, per, ax: .5, ay: this.BOX.y1 * s / ch };
    const cellAt = idx => [(idx % cols) * cw, Math.floor(idx / cols) * ch];
    const into = (x, kk, idx, fn) => { const [cx, cy] = cellAt(idx); x.save(); x.scale(kk, kk); x.beginPath(); x.rect(cx, cy, cw, ch); x.clip(); x.translate(cx + cw / 2, cy + ch - this.BOX.y1 * s); x.scale(s, s); fn(x); x.restore(); };
    this.clips.forEach((c, ci) => {
      const S = c.char.spec, fat = { ...S, lw: S.lw * 2.3, limbW: S.limbW * 2.0 }; c.base = ci * per; c.unit = S.unit ?? .00202;
      VIEWS.forEach((view, vi) => { for (let p = 0; p < this.P; p++) {
        const pose = this.poseOf(c, (p + .5) / this.P, view, 1);
        into(xm, 1, c.base + vi * this.P + p, x => drawStickman(x, S, pose)); into(xf, FK, c.base + vi * this.P + p, x => drawStickman(x, fat, pose));
      } });
      for (let p = 0; p < N_TOP; p++) { const draw = x => { x.translate(0, -cw / 2 / s + this.BOX.y1); if (c.char.top) c.char.top(x, p / N_TOP, { marching: c.gait !== 'stand' }); };
        into(xm, 1, c.base + 4 * this.P + p, draw); into(xf, FK, c.base + 4 * this.P + p, draw); }
    });
    this.marbleBase = this.clips.length * per;
    for (let p = 0; p < N_MARBLE; p++) { const r = cw * .42 / s, draw = x => marble2D(x, 0, this.BOX.y1 - cw / 2 / s, r, p / N_MARBLE * TAU, this.o.marbleStyle || {});
      into(xm, 1, this.marbleBase + p, draw); into(xf, FK, this.marbleBase + p, x => marble2D(x, 0, this.BOX.y1 - cw / 2 / s, r, p / N_MARBLE * TAU, { ...(this.o.marbleStyle || {}), lw: r * .3 })); }
    const tex = c => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; t.premultiplyAlpha = true; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.anisotropy = 4; return t; };
    this.canvasMain = main; this.canvasFar = far; this.tMain = tex(main); this.tFar = tex(far);
    const st = this.stage; this.nearCanvas = mk(st.W, st.H); this.nearCtx = this.nearCanvas.getContext('2d');
    this.tNear = new THREE.CanvasTexture(this.nearCanvas); this.tNear.colorSpace = THREE.NoColorSpace; this.tNear.premultiplyAlpha = true; this.tNear.generateMipmaps = false; this.tNear.minFilter = this.tNear.magFilter = THREE.LinearFilter;
    if (this.nearPx == null) this.nearPx = ch * 1.2;
  }
  // поза клипа для фазы и вида (и для атласа, и для ближних участников)
  poseOf(c, phase, view, facing) {
    const vw = { view, facing }, p = c.pose ? c.pose(c.char, phase, vw) : gait(c.char, c.gait, phase, { ...c.opt, ...vw });
    return c.over ? { ...p, ...c.over } : p;
  }
  _mesh() {
    const cap = this.n * 2 + 8, g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0]), 3)); g.setIndex([0, 1, 2, 0, 2, 3]);
    const at = (name, size) => { const a = new THREE.InstancedBufferAttribute(new Float32Array(cap * size), size); a.setUsage(THREE.DynamicDrawUsage); g.setAttribute(name, a); return a; };
    this.a = { pos: at('iPos', 3), uv: at('iUv', 4), size: at('iSize', 4), A: at('iA', 4), B: at('iB', 2) };
    this.mat = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false, depthTest: true, side: THREE.DoubleSide,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
      uniforms: { tMain: { value: this.tMain }, tFar: { value: this.tFar }, tNear: { value: this.tNear }, uRes: { value: new THREE.Vector2(this.stage.W, this.stage.H) }, uPx: { value: 1000 }, uBias: { value: this.bias },
        uFog: { value: new THREE.Vector3(1, 1, 1) }, uFogD: { value: 0 }, uHaze: { value: 0 }, uLegacy: { value: globalThis.__CROWD_LEGACY ? 1 : 0 } } });
    this.mesh = new THREE.Mesh(g, this.mat); this.mesh.frustumCulled = false; this.scene = new THREE.Scene(); this.scene.add(this.mesh); this.geo = g; this.cap = cap;
    const st = this.stage, oc = document.createElement('canvas'); oc.width = st.W >> 1; oc.height = st.H >> 1; this.ownerCtx = oc.getContext('2d');
    this.tOwner = new THREE.CanvasTexture(oc); this.tOwner.colorSpace = THREE.NoColorSpace; this.tOwner.premultiplyAlpha = true; this.tOwner.generateMipmaps = false; this.tOwner.minFilter = this.tOwner.magFilter = THREE.LinearFilter;
    this.nearMat = new THREE.ShaderMaterial({ vertexShader: NEAR_VS, fragmentShader: NEAR_FS, transparent: true, depthWrite: false, depthTest: true,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
      uniforms: { tNear: { value: this.tNear }, tOwner: { value: this.tOwner }, uRes: { value: new THREE.Vector2(st.W, st.H) }, uTan: { value: new THREE.Vector2(1, 1) }, uC: { value: new THREE.Vector2(0, 1) },
        uNV: { value: new THREE.Vector3(0, 0, -1) }, uP10: { value: -1 }, uP14: { value: -1 }, uBias: { value: this.bias }, uFog: { value: new THREE.Vector3(1, 1, 1) }, uFogD: { value: 0 }, uHaze: { value: 0 } } });
    this.nearMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.nearMat); this.nearMesh.frustumCulled = false; this.nearMesh.renderOrder = 2; this.nearMesh.visible = false; this.scene.add(this.nearMesh);
  }
  _shadows({ parent, size = [.62, .26], opacity = .34, y = .012 }) {
    const m = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-PI / 2), new THREE.MeshBasicMaterial({ map: softTex(), color: 0x000000, transparent: true, opacity, depthWrite: false }), this.n);
    m.frustumCulled = false; m.userData.noDepth = true; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); (parent || this.stage.scene).add(m); m.visible = false;
    const z = new THREE.Matrix4().makeScale(0, 0, 0); for (let i = 0; i < this.n; i++) m.setMatrixAt(i, z);
    this.shadow = m; this.shadowCfg = { size, y }; this._mx = new THREE.Matrix4();
  }
  // состояние участников в момент t
  _state(t) {
    const o = this.o, nc = this.clips.length;
    for (let i = 0; i < this.n; i++) {
      const m = this._m[i]; const r = o.pos(i, t, m.pos); if (r && r !== m.pos) m.pos.copy(r);
      m.clip = typeof o.clip === 'function' ? o.clip(i, t) : o.clip ?? i % nc; m.heading = typeof o.heading === 'function' ? o.heading(i, t) : o.heading ?? 0;
      m.phase = o.phase ? o.phase(i, t) : t * this.rate + this.offsets[i];
      m.rot = 0; m.scale = 1; m.alpha = 1; m.air = false; m.hide = false; m.view = null; m.facing = null; m.pose = null; m.ground = null; m.noTop = false;
      m.marble = typeof this.marbles === 'function' ? this.marbles(i, t) : this.marbles;
      if (o.state) o.state(i, t, m);
    }
  }
  // тени: вызывать из update сцены (до рендера окружения)
  update(t) {
    if (!this.shadow) return; this.shadow.visible = true; this._state(t); const { size, y } = this.shadowCfg, mx = this._mx;
    for (let i = 0; i < this.n; i++) { const m = this._m[i], k = m.hide ? 0 : m.scale * (m.air ? .7 : 1);
      mx.makeScale(size[0] * k, 1, size[1] * k); mx.setPosition(m.pos.x, (m.ground ?? (m.air ? 0 : m.pos.y)) + y, m.pos.z); this.shadow.setMatrixAt(i, mx); }
    this.shadow.instanceMatrix.needsUpdate = true;
  }
  // отрисовка участников с глубиной в [nearer, farther) метров от камеры
  draw(t, { nearer = 0, farther = Infinity } = {}) {
    const t0 = performance.now(), st = this.stage, cam = st.camera, { cw, ch, cols, W, H, s, per, ax, ay } = this.cell, P = this.P;
    this._state(t);
    const pxs = st.pxs(), cp = cam.position, me = cam.matrixWorldInverse.elements, list = [], v = this._v;
    for (let i = 0; i < this.n; i++) {
      const m = this._m[i]; if (m.hide || m.alpha <= 0) continue;
      const p = m.pos, d = -(me[2] * p.x + me[6] * p.y + me[10] * p.z + me[14]); if (d < .15 || d < nearer || d >= farther) continue;
      const c = this.clips[m.clip], hM = (this.BOX.y1 - this.BOX.y0) * c.unit * m.scale, px = hM * pxs / d;                 // высота ячейки на экране
      const sx = st.W / 2 + (me[0] * p.x + me[4] * p.y + me[8] * p.z + me[12]) / d * pxs, sy = st.H / 2 - (me[1] * p.x + me[5] * p.y + me[9] * p.z + me[13]) / d * pxs;
      if (sx < -px || sx > st.W + px || sy < -px * 1.2 || sy > st.H + px * 1.2) continue;
      m.d = d; m.px = px; m.c = c;
      // вид: угол между направлением на камеру и тем, куда повёрнуто тело
      const dx = cp.x - p.x, dz = cp.z - p.z, dist = Math.hypot(dx, dz, cp.y - p.y);
      let rel = Math.atan2(dx, dz) - (m.heading + c.yaw); rel -= Math.round(rel / TAU) * TAU;
      const ar = Math.abs(rel); m.vw = m.view || (ar < .42 ? 'front' : ar < 1.0 ? 'threeQuarter' : ar < 2.15 ? 'side' : 'back'); m.fc = m.facing ?? (rel > 0 ? -1 : 1);
      m.elev = Math.asin(clamp((cp.y - p.y) / (dist || 1), -1, 1));
      list.push(m);
    }
    list.sort((a, b) => b.d - a.d);
    // ближние — вектором в слой nearCanvas (не больше maxNear самых крупных)
    // ближние — всегда сплошная группа самых близких по глубине: если между двумя «векторными» участниками окажется участник
    // из атласа, прямоугольник более близкого перерисует поверх него дальнего соседа (шов по краю прямоугольника, «лицо из двух половин»)
    let near = list.filter(m => m.px > this.nearPx && (m.noTop || m.elev < 1.0));
    if (near.length && !globalThis.__CROWD_LEGACY) { const dFar = near[0].d; near = list.filter(m => m.d <= dFar && (m.noTop || m.elev < 1.0)); }
    if (near.length > this.maxNear) near = near.slice(near.length - this.maxNear);
    const isNear = new Set(near), nx = this.nearCtx, LEG = !!globalThis.__CROWD_LEGACY, ox = this.ownerCtx;
    // удаление участника вдоль горизонтального направления взгляда: по нему шейдер восстанавливает глубину его вертикальной плоскости
    const fw = cam.getWorldDirection(new THREE.Vector3()), fh = new THREE.Vector3(fw.x, 0, fw.z); if (fh.lengthSq() < 1e-6) fh.set(0, 0, -1); fh.normalize();
    let c0 = 0, c1 = 1;
    if (near.length && !LEG) { c0 = Infinity; c1 = -Infinity; for (const m of near) { m.cv = fh.x * (m.pos.x - cp.x) + fh.z * (m.pos.z - cp.z); c0 = Math.min(c0, m.cv); c1 = Math.max(c1, m.cv); } c1 = Math.max(c1, c0 + .01);
      ox.setTransform(1, 0, 0, 1, 0, 0); ox.globalAlpha = 1; ox.clearRect(0, 0, st.W >> 1, st.H >> 1); }
    if (near.length) {
      nx.setTransform(1, 0, 0, 1, 0, 0); nx.clearRect(0, 0, st.W, st.H);
      for (const m of near) {
        const c = m.c, [x0, y0] = st.project(m.pos), [x1, y1] = st.project(v.copy(m.pos).setY(m.pos.y + .2)), k = pxs / m.d * c.unit * m.scale, S = c.char.spec;
        nx.save(); nx.translate(x0, y0); nx.rotate(Math.atan2(x1 - x0, -(y1 - y0))); nx.globalAlpha = m.alpha;
        const mk = m.marble || 0;
        if (mk >= .5) { const r = cw * .42 / s * k * (this.o.marbleSize ?? .5) * E.outBack(clamp((mk - .5) * 2)); marble2D(nx, 0, -r, r, m.phase * 5, this.o.marbleStyle || {}); }
        else {
          nx.scale(k * (1 + mk * .5), k * (m.noTop ? 1 : squashOf(m.elev)) * (1 - mk * 1.3)); if (m.air) nx.translate(0, -S.body.y);
          let pose = this.poseOf(c, m.phase, m.vw, m.fc); if (m.rot) pose = { ...pose, rot: m.rot }; if (m.pose) pose = m.pose(pose, m) || pose;
          drawStickman(nx, S, pose);
          if (!LEG) { const g8 = Math.round(255 * (m.cv - c0) / (c1 - c0)), fx = flatCtx(ox, `rgb(${g8},${g8},${g8})`);
            ox.save(); ox.scale(.5, .5); ox.translate(x0, y0); ox.rotate(Math.atan2(x1 - x0, -(y1 - y0))); ox.scale(k * (1 + mk * .5), k * (m.noTop ? 1 : squashOf(m.elev)) * (1 - mk * 1.3)); if (m.air) ox.translate(0, -S.body.y);
            drawStickman(fx, S, pose); ox.restore(); ox.globalAlpha = 1; }
        }
        nx.restore();
      }
      this.tNear.needsUpdate = true; if (!LEG) this.tOwner.needsUpdate = true;
    }
    // буферы экземпляров (дальние первыми)
    const A = this.a; let n = 0;
    const put = (m, idx, mode, lod, wM, hM, anx, any, rot, alpha, flip, squash, sq) => {
      if (n >= this.cap) return; const u0 = (idx % cols) * cw / W, v0 = 1 - (Math.floor(idx / cols) * ch + ch) / H, du = cw / W, dv = (sq ? cw : ch) / H, p = m.pos;
      A.pos.setXYZ(n, p.x, p.y, p.z); A.uv.setXYZW(n, flip ? u0 + du : u0, v0, flip ? -du : du, dv); A.size.setXYZW(n, wM, hM, anx, any); A.A.setXYZW(n, rot, lod, mode, alpha); A.B.setXY(n, m.heading + m.c.yaw, squash); n++;
    };
    for (const m of list) {
      const c = m.c, un = c.unit * m.scale, wM = cw / s * un, hM = ch / s * un, mk = m.marble || 0, lod = clamp((62 - m.px * (this.BOX.y1 - this.BOX.y0) * s / ch) / 26);
      if (isNear.has(m)) { if (LEG) put(m, 0, 2, 2, wM * 1.5, hM * 1.25, .5, m.air ? .5 : ay / 1.25 + .06, 0, 1, false, 1); continue; }      // не legacy: ближние идут отдельным полноэкранным проходом
      if (mk >= .5) { const k = E.outBack(clamp((mk - .5) * 2)), r = wM * k * (this.o.marbleSize ?? .5); put(m, this.marbleBase + (Math.floor(fract(m.phase * .8) * N_MARBLE) % N_MARBLE), 0, lod, r, r, .5, .08, 0, m.alpha, false, 1, true); continue; }
      const top = !m.noTop && m.elev > .95 ? 1 : 0;                         // жёсткая смена: полупрозрачное наложение двух видов даёт муар
      if (top < 1) {
        const ph = Math.floor(fract(m.phase) * P) % P, idx = c.base + VIEWS.indexOf(m.vw) * P + ph, flip = m.fc < 0 && m.vw !== 'front' && m.vw !== 'back';
        // поворот — как у ближних (по часовой, вокруг центра тела): у стоящего на земле якорь переносится в центр тела
        const rotG = !LEG && m.rot && !m.air, by = -c.char.spec.body.y * un; if (rotG) m.pos.y += by;
        put(m, idx, 0, lod, wM * (1 + mk * .5), hM * (1 - mk * 1.3), ax, (m.air || rotG) ? ay + (-c.char.spec.body.y * s / ch) : ay, LEG ? m.rot : -m.rot, m.alpha * (1 - top), flip, m.noTop ? 1 : squashOf(m.elev));
        if (rotG) m.pos.y -= by;
      }
      if (top > 0) put(m, c.base + 4 * P + (Math.floor(fract(m.phase) * N_TOP) % N_TOP), 1, lod, wM, wM, .5, .5, 0, m.alpha * top, false, 1, true);
    }
    for (const k in A) A[k].needsUpdate = true; this.geo.instanceCount = n;
    const hasNear = near.length > 0 && !LEG; this.mesh.visible = n > 0; this.nearMesh.visible = hasNear;
    if (hasNear) { const q = this.nearMat.uniforms, pe = cam.projectionMatrix.elements, ty = Math.tan(cam.fov * PI / 360);
      q.uTan.value.set(ty * cam.aspect, ty); q.uC.value.set(c0, c1); q.uNV.value.copy(fh).transformDirection(cam.matrixWorldInverse); q.uP10.value = pe[10]; q.uP14.value = pe[14]; q.uBias.value = this.bias;
      q.uHaze.value = this.haze; if (this.haze > 0) { const col = new THREE.Color(this.o.hazeColor ?? st.look.fogColor); if (this.o.hazeColor == null) col.convertLinearToSRGB(); q.uFog.value.set(col.r, col.g, col.b); q.uFogD.value = this.o.hazeDensity ?? st.look.fogDensity; } }
    if (n || hasNear) {
      const r = st.renderer, u = this.mat.uniforms, ac = r.autoClear;
      st.occlusionMask(cp, 0);                                             // глубина декорации уже лежит в буфере (или кладётся сейчас)
      u.uPx.value = pxs; u.uHaze.value = this.haze;
      if (this.haze > 0) { const col = new THREE.Color(this.o.hazeColor ?? st.look.fogColor); u.uFog.value.set(col.r, col.g, col.b); if (this.o.hazeColor == null) { col.convertLinearToSRGB(); u.uFog.value.set(col.r, col.g, col.b); } u.uFogD.value = this.o.hazeDensity ?? st.look.fogDensity; }
      r.autoClear = false; r.setRenderTarget(null); r.setClearColor(0x000000, 0); r.clear(true, false, false);
      cam.layers.set(0); r.render(this.scene, cam); r.autoClear = ac;
      st.resetCtx(); st.ctx.drawImage(st.gl, 0, 0);
    }
    if (globalThis.__CROWD_AUDIT) crowdAudit(this, list, isNear, t);
    this.stats = { drawn: n, near: near.length, ms: performance.now() - t0 };
    return this.stats;
  }
  // толпа и актёры в общем порядке глубины: items = [[actor, pose, opt], ...]
  drawWith(t, items) {
    const list = items.map(it => ({ actor: it[0], pose: it[1], opt: it[2], xf: it[0].xf() })).sort((a, b) => b.xf.d - a.xf.d);
    let far = Infinity;
    for (const it of list) { this.draw(t, { nearer: it.xf.d, farther: far }); it.actor.draw(it.pose, it.opt, it.xf); far = it.xf.d; }
    this.draw(t, { nearer: 0, farther: far });
  }
}
// камера смотрит сверху — фигура укорачивается (частично: шляпа должна остаться читаемой)
const squashOf = elev => lerp(1, Math.cos(Math.min(elev, 1.3)), .45 * smooth(seg(elev, .3, 1.0)));

// ---------------------------------------------------------------------------------------------------------------------
// Проверка слоя толпы (tools/audit.mjs, страница открыта с ?audit=1): для каждого вызова draw() сравниваются два силуэта
// в половинном размере — «как нарисовал конвейер» (атлас + ближний слой, без перекрытия декорацией) и «как должно быть»
// (каждый участник целиком, вектором, строго от дальних к ближним, та же поза/фаза/вид). Чего нет в первом — обрезано
// краем ячейки или прямоугольника; чего нет во втором — лишняя копия. Плюс счёт нарушений порядка: участник из атласа
// ближе, чем кто-то из «векторных» ближних (тогда прямоугольник ближнего перерисовывает поверх него дальнего соседа).
let _aud = null;
function crowdAudit(cr, list, isNear, t) {
  const st = cr.stage, W = st.W >> 1, H = st.H >> 1, A = globalThis.__CROWD_AUDIT, P = cr.P, pxs = st.pxs();
  if (!_aud) { const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c.getContext('2d', { willReadFrequently: true }); }; _aud = { act: mk(), ref: mk() }; }
  const r = st.renderer, u = cr.mat.uniforms, ac = r.autoClear, hz = u.uHaze.value;
  // 1) конвейер без перекрытия декорацией
  cr.mat.depthTest = false; cr.nearMat.depthTest = false; const hz2 = cr.nearMat.uniforms.uHaze.value; cr.nearMat.uniforms.uHaze.value = 0; u.uHaze.value = 0; r.autoClear = false; r.setRenderTarget(null); r.setClearColor(0x000000, 0); r.clear(true, true, false);
  st.camera.layers.set(0); r.render(cr.scene, st.camera); r.autoClear = ac; cr.mat.depthTest = true; cr.nearMat.depthTest = true; cr.nearMat.uniforms.uHaze.value = hz2; u.uHaze.value = hz;
  const xa = _aud.act; xa.setTransform(1, 0, 0, 1, 0, 0); xa.clearRect(0, 0, W, H); xa.drawImage(st.gl, 0, 0, W, H);
  // 2) эталон: каждый участник целиком
  const xr = _aud.ref; xr.setTransform(1, 0, 0, 1, 0, 0); xr.clearRect(0, 0, W, H); const v = new THREE.Vector3(), skip = [];
  let order = 0, dNear = -1; for (const m of list) if (isNear.has(m)) { dNear = m.d; break; }
  for (const m of list) {
    const c = m.c, S = c.char.spec, near = isNear.has(m), mk = m.marble || 0;
    if (!near && dNear > 0 && m.d < dNear - 1e-6) order++;
    const [x0, y0] = st.project(m.pos), [x1, y1] = st.project(v.copy(m.pos).setY(m.pos.y + .2)), k = pxs / m.d * c.unit * m.scale;
    if ((!near && m.elev > .95 && !m.noTop) || mk >= .5) { skip.push([x0 / 2, y0 / 2, k * 1300]); continue; }       // вид сверху и «шарик» — другой рисунок, не сравниваем
    xr.save(); xr.scale(.5, .5); xr.translate(x0, y0); xr.rotate(Math.atan2(x1 - x0, -(y1 - y0)));
    const sq = m.noTop ? 1 : squashOf(m.elev);
    if (near) { xr.scale(k * (1 + mk * .5), k * sq * (1 - mk * 1.3)); if (m.air) xr.translate(0, -S.body.y);
      let pose = cr.poseOf(c, m.phase, m.vw, m.fc); if (m.rot) pose = { ...pose, rot: m.rot }; if (m.pose) pose = m.pose(pose, m) || pose; drawStickman(xr, S, pose); }
    else { const ph = (Math.floor(fract(m.phase) * P) % P + .5) / P, flip = m.fc < 0 && m.vw !== 'front' && m.vw !== 'back';
      xr.scale(k * (1 + mk * .5) * (flip ? -1 : 1), k * sq * (1 - mk * 1.3)); if (m.air) xr.translate(0, -S.body.y);
      let pose = cr.poseOf(c, ph, m.vw, 1); if (m.rot) pose = { ...pose, rot: flip ? -m.rot : m.rot }; drawStickman(xr, S, pose); }
    xr.restore();
  }
  // 3) сравнение масок с допуском 3 px (половинный размер): толщина контура дальнего атласа и сглаживание не считаются
  const a = xa.getImageData(0, 0, W, H).data, b = xr.getImageData(0, 0, W, H).data, N = W * H, ma = new Uint8Array(N), mb = new Uint8Array(N);
  for (let i = 0; i < N; i++) { ma[i] = a[i * 4 + 3] > 90 ? 1 : 0; mb[i] = b[i * 4 + 3] > 90 ? 1 : 0; }
  for (const [sx, sy, rr] of skip) { const R = Math.max(6, rr / 2); for (let y = Math.max(0, sy - R | 0); y < Math.min(H, sy + R); y++) for (let x = Math.max(0, sx - R | 0); x < Math.min(W, sx + R); x++) { ma[y * W + x] = 2; mb[y * W + x] = 2; } }
  const dil = (src, R) => { const t1 = new Uint8Array(N), o = new Uint8Array(N);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let q = 0; for (let d = -R; d <= R && !q; d++) { const xx = x + d; if (xx >= 0 && xx < W && src[y * W + xx]) q = 1; } t1[y * W + x] = q; }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let q = 0; for (let d = -R; d <= R && !q; d++) { const yy = y + d; if (yy >= 0 && yy < H && t1[yy * W + x]) q = 1; } o[y * W + x] = q; } return o; };
  const da = dil(ma, 3), db = dil(mb, 3); let missing = 0, extra = 0;
  for (let i = 0; i < N; i++) { if (mb[i] === 1 && !da[i]) missing++; if (ma[i] === 1 && !db[i]) extra++; }
  A.push({ f: Math.round(t * st.FPS), n: list.length, near: isNear.size, missing, extra, order });
  if (globalThis.__CROWD_AUDIT_DUMP) { const o = xa.createImageData(W, H); for (let i = 0; i < N; i++) { const mi = mb[i] === 1 && !da[i], ex = ma[i] === 1 && !db[i]; o.data[i * 4] = ex ? 255 : ma[i] === 1 ? 90 : 0; o.data[i * 4 + 1] = mi ? 255 : mb[i] === 1 ? 90 : 0; o.data[i * 4 + 2] = ma[i] === 2 ? 120 : 0; o.data[i * 4 + 3] = 255; } xa.putImageData(o, 0, 0); (globalThis.__CROWD_AUDIT_IMG = globalThis.__CROWD_AUDIT_IMG || []).push(xa.canvas.toDataURL('image/png')); }
}
