// stage.js: рендерер, слои кадра и пост-обработка.
//
// Кадр собирается на выходном 2D-канвасе из четырёх слоёв (порядок — главный признак стиля):
//   [1] 3D-окружение: three.js, тени, DOF (свой проход глубины без прозрачных объектов), bloom, тон-маппинг, финальный грейд
//   [2] 2D-персонажи: векторный рисунок в точке проекции 3D-якоря. Сцена их НЕ освещает, туман, конус света,
//       bloom и тон-маппинг на них не ложатся (голова остаётся чисто белой)
//   [3] 3D-пропсы переднего плана (слой FG): ружьё, самородок — отдельным прозрачным проходом поверх персонажей
//   [4] 2D-эффекты (вспышка, кольца), затемнение кадра, виньетка
// Всё состояние кадра задаётся в stage.look и применяется перед рендером; draw(frame) остаётся чистой функцией кадра.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { place } from '../camera.js';

export const FG = 1;                                              // слой пропсов переднего плана
export const DEFAULT_LOOK = {
  bg: 0x120a05, fogColor: 0x1d1108, fogDensity: .03,              // фон и туман
  exposure: 1,                                                   // тон-маппинг (Neutral)
  bloom: .35, bloomRadius: .5, bloomThreshold: .92,
  dof: true, focus: 3, aperture: .002, maxblur: .01,             // DOF: дистанция фокуса в метрах
  grade: null,                                                   // { sat, tint:[r,g,b], lift:[r,g,b], contrast } — только слой [1]
  dark: 0, darkColor: '14,8,6',                                  // затемнение всего кадра (вместе с персонажами), 0..1
  vignette: 1,                                                   // сила виньетки, 0..1
  near: .03, far: 80,                                            // плоскости отсечения камеры (экстерьерам нужен far в километры)
};
// объекты, которые не должны писать глубину для DOF и для перекрытия персонажей: прозрачные, частицы, спрайты, линии
const noDepth = o => o.isPoints || o.isSprite || o.isLine || (o.isMesh && (o.material.transparent || o.userData.noDepth));

const GradeShader = {
  uniforms: { tDiffuse: { value: null }, sat: { value: 1 }, tint: { value: new THREE.Vector3(1, 1, 1) }, lift: { value: new THREE.Vector3(0, 0, 0) }, contrast: { value: 1 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float sat, contrast; uniform vec3 tint, lift; varying vec2 vUv;
    void main(){ vec4 c = texture2D(tDiffuse, vUv); float l = dot(c.rgb, vec3(.2126,.7152,.0722));
      vec3 r = mix(vec3(l), c.rgb, sat) * tint + lift; r = (r - .5)*contrast + .5; gl_FragColor = vec4(clamp(r, 0., 1.), c.a); }`,
};

export function createStage({ canvas, W = 720, H = 1280, FPS = 30 } = {}) {
  const out = canvas || document.getElementById('c'); out.width = W; out.height = H;
  const ctx = out.getContext('2d');
  const gl = document.createElement('canvas'); gl.width = W; gl.height = H;
  const renderer = new THREE.WebGLRenderer({ canvas: gl, antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1); renderer.setSize(W, H, false);
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap; renderer.shadowMap.autoUpdate = false;
  const scene = new THREE.Scene();
  const BG = new THREE.Color(DEFAULT_LOOK.bg); scene.background = BG;
  const fog = new THREE.FogExp2(DEFAULT_LOOK.fogColor, DEFAULT_LOOK.fogDensity); scene.fog = fog;
  const camera = new THREE.PerspectiveCamera(50, W / H, 0.03, 80);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), .04).texture;

  // ---------- post: bloom + bokeh DOF (own depth pre-pass, transparents hidden) + output + optional grade ----------
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 }));
  composer.setPixelRatio(1); composer.setSize(W, H);
  composer.addPass(new RenderPass(scene, camera));
  const bokeh = new BokehPass(scene, camera, { focus: 3, aperture: .002, maxblur: .01 });
  const depthPlain = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  // временно прячет всё, что не пишет глубину, остальным подменяет материал; возвращает функцию отката
  function depthOnly(material) {
    const hidden = [], swapped = [];
    scene.traverse(o => {
      if (!o.visible) return;
      if (noDepth(o)) { if (o.isMesh && !o.layers.test(camera.layers)) return; o.visible = false; hidden.push(o); }
      else if (o.isMesh && o.layers.test(camera.layers)) { swapped.push([o, o.material]); o.material = typeof material === 'function' ? material(o.material) : material; }
    });
    return () => { for (const [o, m] of swapped) o.material = m; for (const o of hidden) o.visible = true; };
  }
  {
    const old = new THREE.Color();
    bokeh.render = (r, writeBuffer, readBuffer) => {
      const restore = depthOnly(depthPlain);
      r.getClearColor(old); const oa = r.getClearAlpha(), ac = r.autoClear; r.autoClear = false;
      const bg = scene.background, fg = scene.fog; scene.background = null; scene.fog = null;
      r.setClearColor(0xffffff); r.setClearAlpha(1); r.setRenderTarget(bokeh._renderTargetDepth); r.clear(); r.render(scene, camera);
      scene.background = bg; scene.fog = fg;
      restore();
      bokeh.uniforms.tColor.value = readBuffer.texture; bokeh.uniforms.nearClip.value = camera.near; bokeh.uniforms.farClip.value = camera.far;
      r.setRenderTarget(writeBuffer); r.clear(); bokeh._fsQuad.render(r);
      r.setClearColor(old); r.setClearAlpha(oa); r.autoClear = ac;
    };
  }
  composer.addPass(bokeh);
  const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), .35, .5, .92); composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const gradePass = new ShaderPass(GradeShader); gradePass.enabled = false; composer.addPass(gradePass);

  // ---------- 2D: виньетка, рабочий слой для перекрытия персонажей ----------
  const vignette = document.createElement('canvas'); vignette.width = W; vignette.height = H;
  function setVignette({ alpha = .42, color = '8,4,2', inner = .25, outer = .66, cy = .48 } = {}) {
    const x = vignette.getContext('2d'); x.clearRect(0, 0, W, H);
    const g = x.createRadialGradient(W / 2, H * cy, H * inner, W / 2, H * cy, H * outer); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(${color},${alpha})`);
    x.fillStyle = g; x.fillRect(0, 0, W, H);
  }
  setVignette();
  let scratch = null, tmp = null;
  const layer2D = () => { if (!scratch) { scratch = document.createElement('canvas'); scratch.width = W; scratch.height = H; } return scratch; };
  const resetCtx = () => { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none'; };

  const look = { ...DEFAULT_LOOK };
  const _v = new THREE.Vector3();
  const maskScene = new THREE.Scene();
  const maskQuad = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, depthWrite: false, toneMapped: false, fog: false }));
  maskScene.add(maskQuad);
  const silent = [THREE.FrontSide, THREE.BackSide, THREE.DoubleSide].map(side => new THREE.MeshBasicMaterial({ colorWrite: false, side }));
  const depthSilent = m => silent[Array.isArray(m) ? 2 : m.side] || silent[0];   // перекрытие учитывает сторону материала (BackSide-комнаты)
  let depthFrame = -1, frameNo = 0;

  const stage = {
    W, H, FPS, FG, out, ctx, gl, renderer, scene, camera, envTex, composer, bokeh, bloom, look, setVignette, THREE,
    // фокусное расстояние в пикселях: метры на расстоянии d занимают pxs()/d пикселей
    pxs: () => H / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)),
    // мир -> экран: [x, y, глубина в метрах]
    project(p) { _v.copy(p).applyMatrix4(camera.matrixWorldInverse); const f = stage.pxs(), d = -_v.z; return [W / 2 + _v.x / d * f, H / 2 - _v.y / d * f, d]; },
    fg(o) { o.traverse(c => c.layers.set(FG)); return o; },      // объект рисуется только в проходе [3]
    both(l) { l.layers.enable(FG); return l; },                  // свет действует и на окружение, и на пропсы переднего плана
    add(...o) { scene.add(...o); return o[0]; },
    setCamera(s) { place(camera, s); return s; },
    resetLook(...parts) { for (const k in look) delete look[k]; Object.assign(look, DEFAULT_LOOK, ...parts); return look; },
    applyLook() {
      BG.set(look.bg); fog.color.set(look.fogColor); fog.density = look.fogDensity;
      renderer.toneMappingExposure = look.exposure;
      if (camera.near !== look.near || camera.far !== look.far) { camera.near = look.near; camera.far = look.far; camera.updateProjectionMatrix(); }
      bloom.enabled = look.bloom > 0; bloom.strength = look.bloom; bloom.radius = look.bloomRadius; bloom.threshold = look.bloomThreshold;
      bokeh.enabled = !!look.dof; bokeh.uniforms.focus.value = look.focus; bokeh.uniforms.aperture.value = look.aperture; bokeh.uniforms.maxblur.value = look.maxblur;
      const g = look.grade, on = !!g && ((g.sat ?? 1) !== 1 || (g.contrast ?? 1) !== 1 || (g.tint || [1, 1, 1]).some(v => v !== 1) || (g.lift || [0, 0, 0]).some(v => v !== 0));
      gradePass.enabled = on;
      if (on) { const u = gradePass.uniforms; u.sat.value = g.sat ?? 1; u.contrast.value = g.contrast ?? 1; u.tint.value.set(...(g.tint || [1, 1, 1])); u.lift.value.set(...(g.lift || [0, 0, 0])); }
    },
    // [1] окружение -> выходной канвас
    renderEnv() {
      frameNo++; stage.applyLook();
      camera.layers.set(0); renderer.shadowMap.needsUpdate = true;
      composer.render();
      resetCtx(); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.drawImage(gl, 0, 0);
    },
    // есть ли сейчас что рисовать в проходе [3]
    fgVisible() {
      const walk = o => { if (!o.visible) return false; if (o.isMesh && o.layers.isEnabled(FG)) return true; for (const c of o.children) if (walk(c)) return true; return false; };
      return walk(scene);
    },
    // [3] пропсы переднего плана: прозрачный проход поверх персонажей
    renderFg() {
      const bg = scene.background, fg = scene.fog; scene.background = null; scene.fog = null;
      camera.layers.set(FG); renderer.setRenderTarget(null); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(scene, camera);
      camera.layers.set(0); scene.background = bg; scene.fog = fg; depthFrame = -1;
      ctx.drawImage(gl, 0, 0);
    },
    // маска перекрытия: белое там, где вертикальная плоскость через точку p (лицом к камере) НЕ закрыта декорацией.
    // bias (м) сдвигает плоскость к камере, чтобы пол не «съедал» ступни. Возвращает gl-канвас с маской.
    occlusionMask(p, bias = .12) {
      const ac = renderer.autoClear; renderer.autoClear = false; renderer.setRenderTarget(null); renderer.setClearColor(0x000000, 0);
      camera.layers.set(0);
      if (depthFrame !== frameNo) {                              // глубина декорации — один раз за кадр
        const restore = depthOnly(depthSilent), bg = scene.background; scene.background = null;
        renderer.clear(true, true, true); renderer.render(scene, camera);
        scene.background = bg; restore(); depthFrame = frameNo;
      }
      renderer.clear(true, false, false);
      const toCam = _v.copy(camera.position).sub(p); toCam.y = 0; const L = toCam.length() || 1; toCam.multiplyScalar(1 / L);
      maskQuad.position.copy(p).addScaledVector(toCam, Math.min(bias, L * .5)); maskQuad.rotation.set(0, Math.atan2(toCam.x, toCam.z), 0); maskQuad.scale.set(60, 60, 1);
      renderer.render(maskScene, camera); renderer.autoClear = ac;
      return gl;
    },
    layer2D,
    // рисует fn(ctx2d) с учётом перекрытия декорацией в точке p; без occlude — прямо на выходной канвас
    drawOccluded(p, fn, bias) {
      const c = layer2D(), x = c.getContext('2d');
      x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.filter = 'none'; x.clearRect(0, 0, W, H);
      x.save(); fn(x); x.restore();
      x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.filter = 'none'; x.globalCompositeOperation = 'destination-in'; x.drawImage(stage.occlusionMask(p, bias), 0, 0);
      x.globalCompositeOperation = 'source-over';
      ctx.drawImage(c, 0, 0);
    },
    resetCtx,
    // [4] конец кадра: затемнение + виньетка
    finish() {
      resetCtx();
      if (look.dark > .005) { ctx.fillStyle = `rgba(${look.darkColor},${look.dark.toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
      if (look.vignette > 0) { ctx.globalAlpha = look.vignette; ctx.drawImage(vignette, 0, 0); ctx.globalAlpha = 1; }
    },
    // копия текущего кадра (для растворения между сценами)
    snapshot() { if (!tmp) { tmp = document.createElement('canvas'); tmp.width = W; tmp.height = H; } const x = tmp.getContext('2d'); x.globalCompositeOperation = 'copy'; x.drawImage(out, 0, 0); return tmp; },
    glInfo() { const g = renderer.getContext(), e = g.getExtension('WEBGL_debug_renderer_info'); return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : g.getParameter(g.RENDERER); },
  };
  return stage;
}
