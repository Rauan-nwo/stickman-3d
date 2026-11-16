// hq_corridor/film.js — L001 #283 (14:22.9, «On November 12, Jensen Huang resigned…»): ночной коридор штаб-квартиры.
// 2.5D по рисованной плите GPT (raw/plate_corridor.png -> make_layers.py -> assets/plate_lit.jpg + plate_off.jpg):
// плита разрезана на 5 слоёв глубины по сечениям коридора (пилястры, торцевая стена с дверью, кабинет за дверью),
// каждый слой — плоскость на своей глубине (~1/полуширина сечения), камера плывёт вперёд — параллакс настоящий.
// Настольные лампы в стеклянных кабинетах гаснут по одной (маска по кругу лампы: смешение «горит»/«погашено» в шейдере);
// лампа в кабинете Хуанга за дверью горит до конца. План кончается у двери с пустым креслом и склейкой переходит
// в плиту assets/bg_nvidia_office_dry.png (хвост tail секунд, медленный наезд).
//   --set dur=6.7     длительность всего плана (с), shotlist #283
//   --set tail=0.8    хвост после склейки на плиту кабинета (0 — без хвоста, план кончается у двери)
import { THREE, V, clamp, E } from 'engine';
import { glow, noirLook, camSpline, GLIDE, setRes } from 'engine/sets/noirInteriors.js';
import plateLit from './assets/plate_lit.jpg';
import plateOff from './assets/plate_off.jpg';
import META from './assets/layers_meta.json';
import plateOffice from '../../assets/bg_nvidia_office_dry.png';

const FOV = 40, OS = 1.05;                            // вертикальный угол камеры; запас по краям слоёв (покачивание камеры)
const TAN = Math.tan(FOV / 2 * Math.PI / 180);
const DEPTH = hw => 1000 / hw;                         // глубина слоя по полуширине сечения (px плиты)
const ZEND = 2.6;                                      // сколько камера проходит вперёд (торец — на глубине 5.95, дверь ~60 % высоты кадра)
// порядок гашения ламп (индексы META.lamps): ближние раньше — уходят из кадра, дальние позже; время — доля корридорной части
const OFF_ORDER = [[0, .13], [1, .27], [2, .42], [3, .55], [4, .68], [5, .8]];

function loadTex(url) {
  // картинка вставляется в документ (как в platePlane): событие load страницы ждёт её декодирования до первого кадра рендера
  const t = new THREE.Texture(); const img = new Image(); img.style.display = 'none'; document.body.appendChild(img);
  img.onload = () => { t.image = img; t.needsUpdate = true; }; img.src = url;
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true;
  t.isReady = () => img.complete && img.naturalWidth > 0;
  return t;
}

export default {
  fps: 30, size: [1920, 1080],
  options: { dur: 6.7, tail: .8 },
  setup(stage, o) {
    const DUR = +o.dur || 6.7, TAIL = o.tail != null ? +o.tail : .8, CUT = DUR - TAIL; setRes(stage.W, stage.H);
    stage.renderer.toneMapping = THREE.NoToneMapping;
    stage.setVignette({ alpha: .35, color: '6,8,16', inner: .5, outer: 1.08, cy: .5 });
    const G = new THREE.Group(); stage.add(G);
    const tLit = loadTex(plateLit), tOff = loadTex(plateOff), tOffice = loadTex(plateOffice);
    const { W, H } = META, AR = W / H;

    // ---------- слои ----------
    // uL[i] = (u, v, r/H, погашено 0..1) — общие для всех слоёв (лампа гаснет одинаково на любом слое, где она видна)
    const uL = { value: META.lamps.map(l => new THREE.Vector4(l.u, l.v, l.r, 0)) };
    const layers = META.layers.map((L, i) => {
      const D = DEPTH(L.hw), h = 2 * D * TAN * OS, w = h * AR;
      const mat = new THREE.MeshBasicMaterial({ map: tLit, transparent: true, depthWrite: false, depthTest: false, toneMapped: false, fog: false });
      const hole = L.hole || [0, 0, 0, 0], outer = i > 0 ? META.layers[i - 1].hole : null;
      const U = { tOff: { value: tOff }, uHole: { value: new THREE.Vector4(...hole) }, uHasHole: { value: L.hole ? 1 : 0 }, uSize: { value: new THREE.Vector2(W, H) }, uFeather: { value: 2.5 }, uL,
        uOuter: { value: new THREE.Vector4(...(outer || [0, 0, 0, 0])) }, uHasOuter: { value: outer ? 1 : 0 }, uVP: { value: new THREE.Vector2(...META.vp) } };
      mat.onBeforeCompile = sh => {
        Object.assign(sh.uniforms, U);
        sh.fragmentShader = sh.fragmentShader
          .replace('#include <common>', '#include <common>\nuniform sampler2D tOff; uniform vec4 uHole, uOuter; uniform vec2 uSize, uVP; uniform float uFeather, uHasHole, uHasOuter; uniform vec4 uL[' + META.lamps.length + '];')
          .replace('#include <map_fragment>', `
            // за внешней границей слоя (дыра ближнего слоя) — не копия ближних предметов, а их «стена»: радиальное
            // продолжение края кольца от точки схода (как перспективные линии пола и потолка) — без двойников при параллаксе
            vec2 px0 = vec2(vMapUv.x * uSize.x, (1. - vMapUv.y) * uSize.y), pq = px0;
            if (uHasOuter > .5) { vec2 d = px0 - uVP; float s = 1.;
              if (d.x < -.01) s = min(s, (uOuter.x + 2. - uVP.x) / d.x); if (d.x > .01) s = min(s, (uOuter.z - 2. - uVP.x) / d.x);
              if (d.y < -.01) s = min(s, (uOuter.y + 2. - uVP.y) / d.y); if (d.y > .01) s = min(s, (uOuter.w - 2. - uVP.y) / d.y);
              pq = uVP + d * max(s, 0.); }
            vec2 uv2 = vec2(pq.x / uSize.x, 1. - pq.y / uSize.y);
            float sm = (pq == px0) ? 0. : 2.2;                                     // продолжение — мягче (мип-уровень), без резких полос
            vec4 cLit = texture2D(map, uv2, sm), cOff = texture2D(tOff, uv2, sm);
            float wOff = 0.;
            for (int i = 0; i < ${META.lamps.length}; i++) { vec4 L = uL[i]; float d = length((uv2 - L.xy) * vec2(uSize.x / uSize.y, 1.)) / L.z;
              wOff = max(wOff, L.w * (1. - smoothstep(.9, 1.04, d))); }
            diffuseColor.rgb *= mix(cLit.rgb, cOff.rgb, wOff);
            if (uHasHole > .5) { vec2 px = px0;
              float inside = min(min(px.x - uHole.x, uHole.z - px.x), min(px.y - uHole.y, uHole.w - px.y));
              diffuseColor.a *= smoothstep(-uFeather, uFeather, -inside); }`);
      };
      mat.customProgramCacheKey = () => 'hqLayer';
      // uv плиты остаются 0..1 по всей плоскости; запас OS — это просто чуть больший кадр той же картинки
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(0, 0, -D); m.renderOrder = -i; G.add(m);
      return { m, D, w, h };
    });
    // свечение ламп поверх плиты (под bloom): на плоскости слоя, где лампа видна
    const lampGlow = META.lamps.map(l => {
      const ly = layers[l.layer], p = V((l.u - .5) * ly.w, (l.v - .5) * ly.h, -ly.D + .002), size = l.r * ly.h * .55;
      const g = glow(G, p, { size, color: 0xffb35c, opacity: 0 }); g.renderOrder = 5; g.material.depthTest = false;
      return g;
    });

    // ---------- плита кабинета (после склейки) ----------
    const OFF_X = 400, officeMat = new THREE.MeshBasicMaterial({ map: tOffice, toneMapped: false, fog: false, depthWrite: false });
    const offD = 3, offH = 2 * offD * TAN, office = new THREE.Mesh(new THREE.PlaneGeometry(offH * 16 / 9, offH), officeMat);
    office.position.set(OFF_X, 0, -offD); G.add(office);

    // ---------- время ----------
    const lampOff = META.lamps.map(() => Infinity);
    for (const [i, u] of OFF_ORDER) lampOff[i] = u * CUT;
    const offK = d => d < 0 ? 0 : d > .45 ? 1 : E.inOutSine(d / .45);           // гаснет за ~0.45 с, без мигания

    const camera = t => {
      if (t >= CUT && TAIL > 0) {                                              // плита кабинета: медленный наезд
        const u = clamp((t - CUT) / Math.max(TAIL, .01)), z = -.06 * u;
        return { pos: [OFF_X, 0, z], target: [OFF_X, 0, z - 1], fov: FOV };
      }
      const u = clamp(t / CUT), e = GLIDE(u), z = -ZEND * e;
      // «плывёт»: лёгкое покачивание и дрейф взгляда, затухает к двери
      const sw = 1 - .6 * e, x = .035 * Math.sin(t * .9 + .4) * sw, y = .018 * Math.sin(t * 1.35) * sw - .01 * e;
      const tx = x * .4 + .02 * Math.sin(t * .6) * sw, ty = y * .5;
      return { pos: [x, y, z], target: [tx, ty, z - 2], fov: FOV, roll: .35 * Math.sin(t * .7) * sw };
    };

    const LOOK = noirLook({ bg: 0x0b0f1c, fogDensity: 0, bloom: .38, bloomThreshold: .78, bloomRadius: .55,
      grade: { sat: 1.0, tint: [1, 1, 1], lift: [0, 0, 0], contrast: 1.0 } });
    const set = { group: G, look: LOOK, tick() {} };
    return {
      duration: DUR,
      scenes: [{
        id: 'corridor', from: 0, to: DUR, set, camera,
        update(t) {
          const inCorr = t < CUT || TAIL <= 0;
          for (const L of layers) L.m.visible = inCorr; office.visible = !inCorr;
          META.lamps.forEach((l, i) => {
            const k = offK(t - lampOff[i]); uL.value[i].w = k;
            lampGlow[i].visible = inCorr; lampGlow[i].material.opacity = .22 * (1 - k);
          });
        },
      }],
    };
  },
};
