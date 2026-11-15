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
//   cell [ширина, высота] ячейки атласа, phases, nearPx, maxNear, haze (0..1 — подмешать туман сцены вдали), bias.
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
const BOX = { x0: -350, x1: 350, y0: -1190, y1: 44 };                       // область фигуры в ячейке, единицы рисунка
const N_TOP = 4, N_MARBLE = 12;

const VS = `
attribute vec3 iPos; attribute vec4 iUv; attribute vec4 iSize; attribute vec4 iA; attribute vec2 iB;
uniform vec2 uRes; uniform float uPx, uBias;
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
  gl_Position = vec4(ndc * cz.w, cz.z, cz.w); vDepth = -mv0.z; vScr = ndc * .5 + .5;
}`;
const FS = `
uniform sampler2D tMain, tFar, tNear; uniform vec3 uFog; uniform float uFogD, uHaze;
varying vec2 vUv, vScr; varying float vLod, vAlpha, vDepth;
void main() {
  vec4 c = vLod > 1.5 ? texture2D(tNear, vScr) : mix(texture2D(tMain, vUv), texture2D(tFar, vUv), clamp(vLod, 0., 1.));
  if (c.a < .004) discard;
  float f = uHaze * (1. - exp(-uFogD * uFogD * vDepth * vDepth));
  c.rgb = mix(c.rgb, uFog * c.a, f);
  gl_FragColor = c * vAlpha;
}`;

export class Crowd {
  constructor(stage, o) {
    this.stage = stage; this.n = o.count; this.o = o;
    this.clips = o.clips.map(c => ({ gait: 'march', opt: {}, ...c, yaw: c.yaw ?? GAIT_YAW[c.gait] ?? 0 }));
    this.P = o.phases ?? 12; this.nearPx = o.nearPx ?? null; this.maxNear = o.maxNear ?? 40; this.haze = o.haze ?? 0; this.bias = o.bias ?? .12;
    this.rate = o.rate ?? 1.9; this.marbles = o.marbles ?? 0;
    const off = o.offset ?? 0; this.offsets = new Float32Array(this.n);
    for (let i = 0; i < this.n; i++) this.offsets[i] = off === 'random' ? hash(i * 3.71 + (o.seed ?? 1) * 17.3) : typeof off === 'function' ? off(i) : off;
    this._v = new THREE.Vector3(); this._m = []; for (let i = 0; i < this.n; i++) this._m.push({ i, pos: new THREE.Vector3() });
    this.stats = { drawn: 0, near: 0, ms: 0 };
    this._atlas(o.cell || [144, 264]); this._mesh();
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
    const s = Math.min(cw / (BOX.x1 - BOX.x0), ch / (BOX.y1 - BOX.y0));       // пикселей на единицу рисунка
    this.cell = { cw, ch, cols, rows, W, H, s, per, ax: .5, ay: BOX.y1 * s / ch };
    const cellAt = idx => [(idx % cols) * cw, Math.floor(idx / cols) * ch];
    const into = (x, kk, idx, fn) => { const [cx, cy] = cellAt(idx); x.save(); x.scale(kk, kk); x.beginPath(); x.rect(cx, cy, cw, ch); x.clip(); x.translate(cx + cw / 2, cy + ch - BOX.y1 * s); x.scale(s, s); fn(x); x.restore(); };
    this.clips.forEach((c, ci) => {
      const S = c.char.spec, fat = { ...S, lw: S.lw * 2.3, limbW: S.limbW * 2.0 }; c.base = ci * per; c.unit = S.unit ?? .00202;
      VIEWS.forEach((view, vi) => { for (let p = 0; p < this.P; p++) {
        const pose = this.poseOf(c, (p + .5) / this.P, view, 1);
        into(xm, 1, c.base + vi * this.P + p, x => drawStickman(x, S, pose)); into(xf, FK, c.base + vi * this.P + p, x => drawStickman(x, fat, pose));
      } });
      for (let p = 0; p < N_TOP; p++) { const draw = x => { x.translate(0, -cw / 2 / s + BOX.y1); if (c.char.top) c.char.top(x, p / N_TOP, { marching: c.gait !== 'stand' }); };
        into(xm, 1, c.base + 4 * this.P + p, draw); into(xf, FK, c.base + 4 * this.P + p, draw); }
    });
    this.marbleBase = this.clips.length * per;
    for (let p = 0; p < N_MARBLE; p++) { const r = cw * .42 / s, draw = x => marble2D(x, 0, BOX.y1 - cw / 2 / s, r, p / N_MARBLE * TAU, this.o.marbleStyle || {});
      into(xm, 1, this.marbleBase + p, draw); into(xf, FK, this.marbleBase + p, x => marble2D(x, 0, BOX.y1 - cw / 2 / s, r, p / N_MARBLE * TAU, { ...(this.o.marbleStyle || {}), lw: r * .3 })); }
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
        uFog: { value: new THREE.Vector3(1, 1, 1) }, uFogD: { value: 0 }, uHaze: { value: 0 } } });
    this.mesh = new THREE.Mesh(g, this.mat); this.mesh.frustumCulled = false; this.scene = new THREE.Scene(); this.scene.add(this.mesh); this.geo = g; this.cap = cap;
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
      const c = this.clips[m.clip], hM = (BOX.y1 - BOX.y0) * c.unit * m.scale, px = hM * pxs / d;                 // высота ячейки на экране
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
    let near = list.filter(m => m.px > this.nearPx && (m.noTop || m.elev < 1.0)); if (near.length > this.maxNear) near = near.slice(near.length - this.maxNear);
    const isNear = new Set(near), nx = this.nearCtx;
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
        }
        nx.restore();
      }
      this.tNear.needsUpdate = true;
    }
    // буферы экземпляров (дальние первыми)
    const A = this.a; let n = 0;
    const put = (m, idx, mode, lod, wM, hM, anx, any, rot, alpha, flip, squash, sq) => {
      if (n >= this.cap) return; const u0 = (idx % cols) * cw / W, v0 = 1 - (Math.floor(idx / cols) * ch + ch) / H, du = cw / W, dv = (sq ? cw : ch) / H, p = m.pos;
      A.pos.setXYZ(n, p.x, p.y, p.z); A.uv.setXYZW(n, flip ? u0 + du : u0, v0, flip ? -du : du, dv); A.size.setXYZW(n, wM, hM, anx, any); A.A.setXYZW(n, rot, lod, mode, alpha); A.B.setXY(n, m.heading + m.c.yaw, squash); n++;
    };
    for (const m of list) {
      const c = m.c, un = c.unit * m.scale, wM = cw / s * un, hM = ch / s * un, mk = m.marble || 0, lod = clamp((62 - m.px * (BOX.y1 - BOX.y0) * s / ch) / 26);
      if (isNear.has(m)) { put(m, 0, 2, 2, wM * 1.5, hM * 1.25, .5, m.air ? .5 : ay / 1.25 + .06, 0, 1, false, 1); continue; }
      if (mk >= .5) { const k = E.outBack(clamp((mk - .5) * 2)), r = wM * k * (this.o.marbleSize ?? .5); put(m, this.marbleBase + (Math.floor(fract(m.phase * .8) * N_MARBLE) % N_MARBLE), 0, lod, r, r, .5, .08, 0, m.alpha, false, 1, true); continue; }
      const top = !m.noTop && m.elev > .95 ? 1 : 0;                         // жёсткая смена: полупрозрачное наложение двух видов даёт муар
      if (top < 1) {
        const ph = Math.floor(fract(m.phase) * P) % P, idx = c.base + VIEWS.indexOf(m.vw) * P + ph, flip = m.fc < 0 && m.vw !== 'front' && m.vw !== 'back';
        put(m, idx, 0, lod, wM * (1 + mk * .5), hM * (1 - mk * 1.3), ax, m.air ? ay + (-c.char.spec.body.y * s / ch) : ay, m.rot, m.alpha * (1 - top), flip, m.noTop ? 1 : squashOf(m.elev));
      }
      if (top > 0) put(m, c.base + 4 * P + (Math.floor(fract(m.phase) * N_TOP) % N_TOP), 1, lod, wM, wM, .5, .5, 0, m.alpha * top, false, 1, true);
    }
    for (const k in A) A[k].needsUpdate = true; this.geo.instanceCount = n;
    if (n) {
      const r = st.renderer, u = this.mat.uniforms, ac = r.autoClear;
      st.occlusionMask(cp, 0);                                             // глубина декорации уже лежит в буфере (или кладётся сейчас)
      u.uPx.value = pxs; u.uHaze.value = this.haze;
      if (this.haze > 0) { const col = new THREE.Color(this.o.hazeColor ?? st.look.fogColor); u.uFog.value.set(col.r, col.g, col.b); if (this.o.hazeColor == null) { col.convertLinearToSRGB(); u.uFog.value.set(col.r, col.g, col.b); } u.uFogD.value = this.o.hazeDensity ?? st.look.fogDensity; }
      r.autoClear = false; r.setRenderTarget(null); r.setClearColor(0x000000, 0); r.clear(true, false, false);
      cam.layers.set(0); r.render(this.scene, cam); r.autoClear = ac;
      st.resetCtx(); st.ctx.drawImage(st.gl, 0, 0);
    }
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
