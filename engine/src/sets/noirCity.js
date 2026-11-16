// noirCity.js: ночной город «Стикман Нуар» для 3D-пролётов (тип C) — L001 #6 Сингапур, #75 Вашингтон, #136 Тайбэй,
// #272 финал. Задача — выглядеть как рисованные фоны GPT (production/L001/assets/backgrounds_sheet*.jpg), а не как
// low-poly 3D. Поэтому весь свет и «рисунок» считаются в собственных шейдерах:
//   - здания: 3 тона cel (тень / полутон / свет) по лунному направлению, мазки низкой частоты в заливке, лёгкая
//     «рукотворная» кривизна (вершины изгибаются шумом по высоте), светлая фаска у вертикальных рёбер, тёплый свет
//     улицы у основания; линии рёбер тушью считаются в самом фрагменте (экранная толщина ~1.5 px, без LineSegments и
//     без z-fighting); силуэт — обратная оболочка 3.5–4 px (на силуэте контур толще, чем на рёбрах, как на фонах);
//   - окна: сетка этажей в метрах, у каждого окна своё состояние (тёплое / холодное / тусклое / тёмное / жалюзи),
//     горящие окна кучкуются шумом; далеко сетка плавно сводится к средней яркости (нет мерцания субпиксельных окон);
//     uOff гасит окна по одному (финал);
//   - туман глубины по экспоненте + низовая дымка (бирюзовая у земли, тёмно-синяя выше), контур тоже тонет в тумане;
//   - земля: одна плоскость-отражатель (Reflector) — вода и мокрые улицы, отражения вытянуты вертикально в «мазки»,
//     сетка улиц, тротуары, пятна света фонарей;
//   - рисованные плиты GPT: задник-панорама на цилиндре далеко, вырезанные достопримечательности (карточки,
//     поворачиваются к камере), фасад-цель (плоская плита на фасаде 3D-блока);
//   - дымка слоями (вертикальные полупрозрачные листы), фонари-точки со свечением (bloom), 2D-дождь, полёт камеры по
//     сплайну с профилем скорости (плавный разгон и торможение, без рывков).
// Всё детерминировано: случайность только rng(seed), времени внутри кадра нет (draw(frame) — чистая функция).
//
//   const C = noirCity(stage, { fog, haze, light, wob, ground, sky })   -> набор (set): { group, look, tick, U, ... }
//   C.buildings(specs) / cityGrid(...) / C.card(...) / C.backdrop(...) / C.facade(...) / C.lamps(...) / C.hazeSheets(...)
//   flight(keys, { dur, accel, decel }) -> t => { pos, target, fov, roll }      rain2D(ctx, t, o)      vignette — stage.
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { rng } from '../core/rng.js';

export const V = (x, y, z) => new THREE.Vector3(x, y, z);
const C3 = h => new THREE.Color(h);                                       // sRGB hex -> линейный цвет

// палитра (sRGB), снята с bg_singapore_street / bg_washington_cold / bg_restaurant_v2
export const NC = {
  ink: 0x080a14,
  fogHi: 0x0c1a30, fogLo: 0x1b3a4c,                                       // дымка: выше тёмно-синяя, у земли бирюзовая
  skyTop: 0x050a18, skyMid: 0x0d1c34, skyLow: 0x1c3a52,
  warm: 0xffb257, warmHot: 0xffd9a0, cool: 0xa9d6ff, dim: 0x8a5a2a,
  asphalt: 0x1b2433, water: 0x0b1828, sidewalk: 0x2a3446, grass: 0x14231f,
  // стены: тёмно-синие, сланец, бирюзово-серые, тёплый камень, кремовые (шопхаусы)
  walls: [0x2a3a56, 0x31435e, 0x26384a, 0x3a4a5e, 0x2e3e4e, 0x44506a, 0x3c3a4c, 0x283444],
  stone: [0x4c566a, 0x444e62, 0x566072, 0x3e485a],
  cream: [0x847660, 0x786a58, 0x8c7c64, 0x6e6252],
  neon: [0x47e0e0, 0xff4fa8, 0xffb24a, 0x7cff7a, 0x6a8cff],
};

// ---------------------------------------------------------------------------------------------------------------
// общий GLSL: шум, туман, изгиб
// ---------------------------------------------------------------------------------------------------------------
const GLSL_COMMON = /* glsl */`
uniform vec3 uFogHi, uFogLo; uniform float uFogDen, uFogStart, uHaze, uHazeH;
float h13(vec3 p){ p = fract(p*vec3(.1031,.1030,.0973)); p += dot(p, p.yxz+33.33); return fract((p.x+p.y)*p.z); }
float vn(vec3 p){ vec3 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
  return mix(mix(mix(h13(i), h13(i+vec3(1,0,0)), f.x), mix(h13(i+vec3(0,1,0)), h13(i+vec3(1,1,0)), f.x), f.y),
             mix(mix(h13(i+vec3(0,0,1)), h13(i+vec3(1,0,1)), f.x), mix(h13(i+vec3(0,1,1)), h13(i+vec3(1,1,1)), f.x), f.y), f.z); }
float fbm(vec3 p){ return .55*vn(p) + .3*vn(p*2.03 + 7.1) + .15*vn(p*4.1 + 3.3); }
float fogK(vec3 wp){
  float d = max(distance(wp, cameraPosition) - uFogStart, 0.);
  float f = 1. - exp(-d*d*uFogDen*uFogDen);
  float hz = uHaze*exp(-max(wp.y, 0.)/uHazeH)*smoothstep(20., 500., d);
  return clamp(1. - (1. - f)*(1. - hz), 0., 1.);
}
vec3 fogCol(vec3 wp){ return mix(uFogLo, uFogHi, smoothstep(0., uHazeH*2.5, wp.y)); }
`;
const GLSL_WOB = /* glsl */`
uniform float uWob;
vec3 wobble(vec3 wp, float seed, float wk){
  float a = uWob*wk*min(max(wp.y, 0.)*.003, .35);              // основание стоит ровно, кривизна растёт с высотой
  wp.x += a*(sin(wp.y*.09 + seed*6.28)*.6 + sin(wp.y*.031 + seed*17.)*.4);
  wp.z += a*(sin(wp.y*.08 + seed*11.)*.6 + sin(wp.y*.027 + seed*5.)*.4);
  return wp;
}
`;

// ---------------------------------------------------------------------------------------------------------------
// здания: шейдер «рисованной» заливки с окнами и рёбрами
// ---------------------------------------------------------------------------------------------------------------
const BUILD_VS = /* glsl */`
attribute vec3 aColor; attribute vec4 aWin; attribute vec4 aSeed; attribute vec4 aExtra;
varying vec3 vLocal, vWorld, vN; flat varying vec3 vScale, vLN, vColor; flat varying vec4 vWin, vSeed, vExtra;
${GLSL_WOB}
void main(){
  mat4 im = instanceMatrix;
  vec3 S = vec3(length(im[0].xyz), length(im[1].xyz), length(im[2].xyz));
  vec4 wp = modelMatrix*im*vec4(position, 1.);
  wp.xyz = wobble(wp.xyz, aSeed.x, aSeed.w);
  vLocal = position - vec3(0., .5, 0.); vScale = S; vWorld = wp.xyz; vLN = normal;
  vN = normalize(mat3(modelMatrix)*mat3(im)*normal);
  vColor = aColor; vWin = aWin; vSeed = aSeed; vExtra = aExtra;
  gl_Position = projectionMatrix*viewMatrix*wp;
}`;
const BUILD_FS = /* glsl */`
${GLSL_COMMON}
uniform vec3 uL, uShadowK, uMidK, uLightK, uRoofK, uInk, uWarm, uCool, uDim, uStreet;
uniform float uOff, uOffShare, uEdgePx, uEmK, uStreetH, uBrush;
varying vec3 vLocal, vWorld, vN; flat varying vec3 vScale, vLN, vColor; flat varying vec4 vWin, vSeed, vExtra;
void main(){
  vec3 q = vLocal*vScale; vec3 an = abs(vLN);
  bool side = an.y < .5;
  vec2 fq, fs;
  if (an.x > .5) { fq = vec2(q.z*sign(vLN.x), q.y); fs = vec2(vScale.z, vScale.y); }
  else if (an.z > .5) { fq = vec2(-q.x*sign(vLN.z), q.y); fs = vec2(vScale.x, vScale.y); }
  else { fq = vec2(q.x, q.z); fs = vec2(vScale.x, vScale.z); }
  float style = vSeed.y;                 // <0 — без окон и рёбер (деревья, купола); 0 офис; 1 ленты; 2 шопхаус/камень; 3 глухой
  // --- 3 тона ---
  vec3 N = normalize(vN);
  float ndl = dot(N, uL);
  float t1 = smoothstep(-.12, -.02, ndl), t2 = smoothstep(.3, .42, ndl);
  vec3 base = vColor;
  vec3 col = base*mix(mix(uShadowK, uMidK, t1), uLightK, t2);
  if (N.y > .6) {
    col = base*uRoofK;
    if (style > 1.5 && style < 2.5 && vExtra.z > .5) {                // черепица шопхауса: тёмно-красная, ряды
      float rz = q.z/.55, rw = fwidth(rz) + 1e-4;
      float rows = smoothstep(.0, rw*1.5, abs(fract(rz) - .5) - .38)*smoothstep(1.5, .5, rw*3.);
      col = vec3(.075, .022, .016)*(1.1 + .5*t2)*(1. - .35*rows);
    }
  }
  // --- мазки низкой частоты: пятна + вертикальные «протяжки» кистью ---
  float b = fbm(vWorld*vec3(.022, .011, .022) + vSeed.x*13.);
  float st = vn(vWorld*vec3(.13, .01, .13) + vSeed.x*7.);
  col *= 1. + uBrush*(.9*(b - .5) + .35*(st - .5));
  // низ темнее, тёплый свет улицы у основания
  float hb = vWorld.y;
  col *= mix(.68, 1., smoothstep(0., min(vScale.y*.6, 40.), hb));
  vec3 em = vec3(0.);
  float edge = 0.;
  if (style >= -.5) {
    if (side) col += uStreet*exp(-max(hb, 0.)/uStreetH);
    // --- фаска: светлая полоса у вертикальных рёбер на освещённой грани, тёмная — на теневой ---
    vec2 dE = fs*.5 - abs(fq);
    if (side) col *= 1. + (.22*t2 - .12*(1. - t1))*(1. - smoothstep(0., .9, dE.x));
    // --- рёбра тушью (экранная толщина) ---
    vec2 fw = fwidth(fq) + 1e-4;
    float ePix = min(dE.x/fw.x, dE.y/fw.y);
    edge = 1. - smoothstep(uEdgePx - .6, uEdgePx + .6, ePix);
    // --- окна ---
    vec4 W = vWin;
    if (side && W.x > .1 && style < 2.5) {
      float u = fq.x + fs.x*.5, v = fq.y + fs.y*.5;
      float gf = vExtra.x;                                           // высота первого этажа
      float topM = fs.y - max(W.y*.7, vExtra.y);                     // парапет / глухой верх
      float ncol = max(1., floor((fs.x - 1.6)/W.x)), off0 = (fs.x - ncol*W.x)*.5;
      vec2 cell = vec2((u - off0)/W.x, (v - gf)/W.y);
      vec2 ci = floor(cell), cf = fract(cell);
      vec2 cfw = fwidth(cell) + 1e-4;
      float inX = smoothstep(-cfw.x, cfw.x, cell.x)*(1. - smoothstep(ncol - cfw.x, ncol + cfw.x, cell.x));
      float inY = smoothstep(gf - .1, gf + .1, v)*(1. - smoothstep(topM - .1, topM + .1, v));
      float inG = inX*inY;
      vec2 r0 = style < .5 ? vec2(.17, .2) : style < 1.5 ? vec2(.02, .28) : vec2(.24, .14);
      vec2 r1 = style < .5 ? vec2(.83, .86) : style < 1.5 ? vec2(.98, .8) : vec2(.76, .9);
      float wx = smoothstep(r0.x - cfw.x, r0.x + cfw.x, cf.x)*(1. - smoothstep(r1.x - cfw.x, r1.x + cfw.x, cf.x));
      float wy = smoothstep(r0.y - cfw.y, r0.y + cfw.y, cf.y)*(1. - smoothstep(r1.y - cfw.y, r1.y + cfw.y, cf.y));
      float win = wx*wy*inG;
      // рамка: кольцо чуть шире окна
      vec2 g0 = r0 - cfw*1.3, g1 = r1 + cfw*1.3;
      float fx = smoothstep(g0.x - cfw.x, g0.x + cfw.x, cf.x)*(1. - smoothstep(g1.x - cfw.x, g1.x + cfw.x, cf.x));
      float fy = smoothstep(g0.y - cfw.y, g0.y + cfw.y, cf.y)*(1. - smoothstep(g1.y - cfw.y, g1.y + cfw.y, cf.y));
      float frame = clamp(fx*fy*inG - win, 0., 1.);
      float faceId = dot(floor(vLN + .5), vec3(1., 2., 3.));
      vec3 hk = vec3(ci, faceId + floor(vSeed.x*997.)*.37);
      float h1 = h13(hk), h2 = h13(hk + 17.3), h3 = h13(hk + 41.7), h4 = h13(hk + 63.1), h5 = h13(hk + 88.9);
      float clus = vn(vec3(ci*vec2(.31, .43), vSeed.x*37. + faceId));
      float lit = step(h1, W.z*(.25 + 1.5*clus*clus));
      float share = step(h3, uOffShare);
      lit *= 1. - share*smoothstep(h4, h4 + .012, uOff);
      vec3 wc = h2 < W.w ? uWarm : (h2 < W.w + (1. - W.w)*.6 ? uCool : uDim);
      wc *= .72 + .4*h5;
      // жалюзи у части горящих
      float bl = step(.8, h13(hk + 5.5));
      wc *= 1. - bl*.28*smoothstep(.4, .6, abs(fract(cf.y*6.) - .5)*2.);
      // переплёт: вертикальная планка у части окон, тёплое окно светлее к низу (как лампа на столе)
      float mul = step(.55, h13(hk + 2.2))*(1. - smoothstep(.0, cfw.x*1.5, abs(cf.x - .5) - .018));
      wc *= 1. - .55*mul;
      wc *= mix(1.08, .9, smoothstep(r0.y, r1.y, cf.y));
      vec3 pane = base*.16 + vec3(.004, .008, .018) + .014*h5;          // тёмное стекло
      // дальний план: сетка тоньше 3–5 px сводится к среднему (иначе мерцает при движении)
      float cellPix = min(W.x/(fwidth(u) + 1e-4), W.y/(fwidth(v) + 1e-4));
      float det = smoothstep(2.5, 5.5, cellPix);
      float area = (r1.x - r0.x)*(r1.y - r0.y);
      float avgLit = W.z*.85*(1. - uOffShare*clamp(uOff, 0., 1.));
      vec3 avgW = mix(mix(uCool, uDim, .4), uWarm, W.w)*.95;
      vec3 nearCol = mix(col, uInk, frame*.75);
      if (vExtra.z > .5) {                                            // ставни у окон шопхауса (тёмно-бирюзовые)
        float sx = smoothstep(r0.x - .2 - cfw.x, r0.x - .2 + cfw.x, cf.x)*(1. - smoothstep(r0.x - .03 - cfw.x, r0.x - .03 + cfw.x, cf.x))
                 + smoothstep(r1.x + .03 - cfw.x, r1.x + .03 + cfw.x, cf.x)*(1. - smoothstep(r1.x + .2 - cfw.x, r1.x + .2 + cfw.x, cf.x));
        nearCol = mix(nearCol, vec3(.018, .06, .055)*(.8 + .6*t2), sx*wy*inG);
      }
      nearCol = mix(nearCol, pane, win);
      vec3 farCol = mix(col, pane, area*inG*.9);
      col = mix(farCol, nearCol, det);
      em = mix(avgW*avgLit*area*inG*.6, wc*lit*win, det);
      // витрины первого этажа
      float shop = step(.35, h13(vec3(floor(u/6.), faceId, vSeed.x*3.)));
      float sb = smoothstep(.5, .7, v)*(1. - smoothstep(gf - .9, gf - .7, v))*shop*step(1.2, gf);
      em += uWarm*.85*sb*smoothstep(.06, .12, fract(u/6.))*(1. - smoothstep(.88, .94, fract(u/6.)));
    }
  }
  col = mix(col, uInk, edge*.92);
  float f = fogK(vWorld);
  col = mix(col, fogCol(vWorld), f);
  em *= 1. - .62*f;
  gl_FragColor = vec4(col + em*uEmK, 1.);
}`;
const INK_VS = /* glsl */`
attribute vec4 aSeed;
uniform float uPx; uniform vec2 uRes;
varying vec3 vWorld;
${GLSL_WOB}
void main(){
  #ifdef USE_INSTANCING
    mat4 im = instanceMatrix;
  #else
    mat4 im = mat4(1.);
  #endif
  vec3 S = vec3(length(im[0].xyz), length(im[1].xyz), length(im[2].xyz));
  vec4 wp = modelMatrix*im*vec4(position, 1.);
  float seed = aSeed.x, wk = aSeed.w;
  wp.xyz = wobble(wp.xyz, seed, wk);
  vWorld = wp.xyz;
  vec4 cp = projectionMatrix*viewMatrix*wp;
  vec3 nw = normalize(mat3(modelMatrix)*mat3(im)*normal);
  vec3 nv = mat3(viewMatrix)*nw;
  vec2 sd = (projectionMatrix*vec4(nv, 0.)).xy*uRes; float L = length(sd);
  if (L > 1e-5) { sd /= L; float w = cp.w; float k = uPx*mix(1., .38, smoothstep(40., 900., w));
    cp.xy += sd*k*2./uRes*w; }
  gl_Position = cp;
}`;
const INK_FS = /* glsl */`
${GLSL_COMMON}
uniform vec3 uInk;
varying vec3 vWorld;
void main(){ float f = fogK(vWorld); gl_FragColor = vec4(mix(uInk, fogCol(vWorld), f*.93), 1.); }`;

// ---------------------------------------------------------------------------------------------------------------
// земля-отражатель: вода и мокрые улицы
// ---------------------------------------------------------------------------------------------------------------
const GROUND_VS = /* glsl */`
uniform mat4 textureMatrix; varying vec4 vUv; varying vec3 vWorld;
void main(){ vUv = textureMatrix*vec4(position, 1.); vec4 wp = modelMatrix*vec4(position, 1.); vWorld = wp.xyz;
  gl_Position = projectionMatrix*viewMatrix*wp; }`;
const GROUND_FS = /* glsl */`
${GLSL_COMMON}
uniform sampler2D tDiffuse; uniform vec3 color;
uniform vec4 uWater; uniform vec4 uGrid; uniform vec2 uStreetW; uniform vec4 uCity;
uniform vec3 uWaterCol, uAsphalt, uWalk, uLamp, uInk, uGrass; uniform vec4 uLawn;
uniform float uWetW, uWetS, uStreak, uLampR, uLampStep, uLampK;
varying vec4 vUv; varying vec3 vWorld;
float rect(vec2 p, vec4 r, float s){ return smoothstep(r.x - s, r.x + s, p.x)*(1. - smoothstep(r.z - s, r.z + s, p.x))
                                           *smoothstep(r.y - s, r.y + s, p.y)*(1. - smoothstep(r.w - s, r.w + s, p.y)); }
void main(){
  vec3 p = vWorld;
  float inW = rect(p.xz, uWater, 1.5);
  float inC = rect(p.xz, uCity, 4.);
  float inL = rect(p.xz, uLawn, 2.);
  // сетка улиц: координаты внутри периода
  vec2 lc = mod(p.xz - uGrid.xy, uGrid.zw);                      // 0..period; улица — в начале периода шириной uStreetW
  vec2 dS = min(lc, uGrid.zw - lc);                              // расстояние до оси улицы (ось при lc = 0)
  float stX = (1. - smoothstep(uStreetW.x*.5 - .3, uStreetW.x*.5 + .3, dS.x))*(1. - inL);
  float stZ = (1. - smoothstep(uStreetW.y*.5 - .3, uStreetW.y*.5 + .3, dS.y))*(1. - inL);
  float street = max(stX, stZ);
  float walkX = smoothstep(uStreetW.x*.5 - 3.2, uStreetW.x*.5 - 2.8, dS.x)*stX;
  float walkZ = smoothstep(uStreetW.y*.5 - 3.2, uStreetW.y*.5 - 2.8, dS.y)*stZ;
  float walk = max(walkX, walkZ)*(1. - stX*stZ);
  // разметка: пунктир по оси
  float dashX = (1. - smoothstep(.12, .22, dS.x))*step(.5, fract(p.z/9.))*(1. - stZ);
  float dashZ = (1. - smoothstep(.12, .22, dS.y))*step(.5, fract(p.x/9.))*(1. - stX);
  vec3 land = mix(mix(uAsphalt, uWalk, .45)*.8, uAsphalt, street);
  land = mix(land, uWalk, walk);
  land = mix(land, vec3(.55, .45, .25), max(dashX, dashZ)*.5);
  land = mix(land, uGrass, inL);
  // пятна фонарей вдоль тротуаров
  float ex = uStreetW.x*.5 - 1.6, ez = uStreetW.y*.5 - 1.6;
  float alongZ = mod(p.z, uLampStep) - uLampStep*.5, alongX = mod(p.x, uLampStep) - uLampStep*.5;
  float dX = length(vec2(abs(dS.x) - ex, alongZ))*stX, dZ = length(vec2(abs(dS.y) - ez, alongX))*stZ;
  dX = stX > .01 ? dX : 999.; dZ = stZ > .01 ? dZ : 999.;
  // у каждого фонаря своя яркость, часть не горит
  float idX = h13(vec3(floor(p.z/uLampStep), floor((p.x - uGrid.x)/uGrid.z + .5), sign(lc.x - uGrid.z*.5)));
  float idZ = h13(vec3(floor(p.x/uLampStep), floor((p.z - uGrid.y)/uGrid.w + .5) + 50., sign(lc.y - uGrid.w*.5)));
  float kX = step(.3, idX)*(.4 + .6*idX), kZ = step(.3, idZ)*(.4 + .6*idZ);
  float pool = max(exp(-dX*dX/(uLampR*uLampR))*kX, exp(-dZ*dZ/(uLampR*uLampR))*kZ);
  land += uLamp*pool*uLampK;
  land = mix(uAsphalt*.7, land, inC);
  land *= .85 + .3*fbm(p*vec3(.02, 0., .02));
  // отражение: вертикальные «мазки» + горизонтальная рябь
  vec4 uv = vUv;
  float rip = vn(vec3(p.x*.012, 1.3, p.z*.22)) - .5;
  uv.x += rip*uv.w*.006*mix(.4, 1., inW);
  vec3 r = vec3(0.); float ws = 0.;
  for (int i = 0; i < 8; i++) { float o = float(i)/7.; float w = 1. - o*.7;
    vec4 u2 = uv; u2.y += (o - .25)*uv.w*uStreak; r += texture2DProj(tDiffuse, u2).rgb*w; ws += w; }
  r /= ws;
  float wet = mix(uWetS*street*(1. - walk*.5), uWetW, inW);
  vec3 wcol = uWaterCol*(.8 + .4*fbm(p*vec3(.006, 0., .05)));
  // нарисованные блики-чёрточки на воде
  float dash = smoothstep(.78, .86, vn(vec3(p.x*.05, 0., p.z*.9)))*smoothstep(.4, .6, vn(vec3(p.x*.004, 2., p.z*.01)));
  wcol += vec3(.02, .035, .05)*dash;
  vec3 col = mix(land, wcol, inW) + r*wet;
  // кромка воды — линия тушью
  float shore = inW*(1. - inW)*4.;
  col = mix(col, uInk, shore*.8);
  float f = fogK(p);
  col = mix(col, fogCol(p), f);
  gl_FragColor = vec4(col, 1.);
}`;

// ---------------------------------------------------------------------------------------------------------------
// рисованные плиты: карточки, задник, фасад
// ---------------------------------------------------------------------------------------------------------------
const CARD_VS = /* glsl */`
varying vec2 vUv; varying vec3 vWorld;
void main(){ vUv = uv; vec4 wp = modelMatrix*vec4(position, 1.); vWorld = wp.xyz; gl_Position = projectionMatrix*viewMatrix*wp; }`;
const CARD_FS = /* glsl */`
${GLSL_COMMON}
uniform sampler2D map; uniform float uBoost, uFogK, uHazeK, uOpacity, uFadeTop, uFadeBot, uDim; uniform vec3 uTint;
uniform vec4 uCrop;
varying vec2 vUv; varying vec3 vWorld;
void main(){
  vec2 uv = uCrop.xy + vUv*uCrop.zw;
  vec4 c = texture2D(map, uv);
  float a = c.a*uOpacity*smoothstep(0., uFadeBot + 1e-4, vUv.y)*(1. - smoothstep(1. - uFadeTop - 1e-4, 1., vUv.y));
  if (a < .004) discard;
  vec3 rgb = c.rgb*uTint*uDim;
  float l = dot(rgb, vec3(.2126, .7152, .0722));
  rgb *= 1. + uBoost*smoothstep(.45, .85, l);                   // огни плиты чуть ярче 1 -> bloom
  float f = fogK(vWorld)*uFogK;
  rgb = mix(rgb, fogCol(vWorld), f);
  rgb = mix(rgb, uFogLo, uHazeK*(1. - vUv.y));
  gl_FragColor = vec4(rgb, a);
}`;

// ---------------------------------------------------------------------------------------------------------------
// фонари-точки: свечение, размер в пикселях ограничен снизу (без мерцания), тонут в тумане
// ---------------------------------------------------------------------------------------------------------------
const LAMP_VS = /* glsl */`
${GLSL_COMMON}
attribute vec3 aCol; attribute float aSize; uniform float uK, uH;
varying vec3 vCol; varying float vA;
void main(){ vec4 wp = modelMatrix*vec4(position, 1.); vec4 mv = viewMatrix*wp;
  float d = -mv.z; float s = uK*aSize*uH/max(d, 1.);
  vA = smoothstep(.8, 3., s)*(1. - .7*fogK(wp.xyz)); s = clamp(s, 2., 140.);
  vCol = aCol; gl_PointSize = s; gl_Position = projectionMatrix*mv; }`;
const LAMP_FS = /* glsl */`
varying vec3 vCol; varying float vA;
void main(){ vec2 d = gl_PointCoord - .5; float r = length(d)*2.; if (r > 1.) discard;
  float core = exp(-r*r*18.), halo = exp(-r*r*3.5)*.35;
  gl_FragColor = vec4(vCol*(core*1.6 + halo)*vA, 1.); }`;

// ---------------------------------------------------------------------------------------------------------------
// дымка слоями
// ---------------------------------------------------------------------------------------------------------------
const HAZE_FS = /* glsl */`
${GLSL_COMMON}
uniform vec3 uCol; uniform float uA, uH, uSeed, uNear;
varying vec2 vUv; varying vec3 vWorld;
void main(){
  float y = vWorld.y;
  float band = exp(-max(y, 0.)/uH);
  float n = fbm(vec3(vWorld.x*.004, y*.012, uSeed));
  float edge = smoothstep(0., .12, vUv.x)*smoothstep(1., .88, vUv.x);
  float d = distance(cameraPosition, vWorld);
  float a = uA*band*(.55 + .8*n)*edge*smoothstep(uNear, uNear*3., d);
  gl_FragColor = vec4(uCol, clamp(a, 0., 1.));
}`;

// ---------------------------------------------------------------------------------------------------------------
const RES = new THREE.Vector2(1920, 1080);
const _boxGeo = (() => { const g = new THREE.BoxGeometry(1, 1, 1, 1, 12, 1); g.translate(0, .5, 0); return g; })();
const _hullGeo = (() => { let g = new THREE.BufferGeometry(); g.setAttribute('position', _boxGeo.getAttribute('position').clone()); g.setIndex(_boxGeo.index.clone()); g = mergeVertices(g, 1e-4); g.computeVertexNormals(); return g; })();
const _blobGeo = (() => { const g = new THREE.IcosahedronGeometry(.5, 3); g.translate(0, .5, 0); return g; })();
const _blobHull = (() => { let g = new THREE.BufferGeometry(); g.setAttribute('position', _blobGeo.getAttribute('position').clone()); if (_blobGeo.index) g.setIndex(_blobGeo.index.clone()); g = mergeVertices(g, 1e-4); g.computeVertexNormals(); return g; })();

// картинка из data-URL -> текстура (страница ждёт загрузки картинок из DOM до первого кадра)
export function imgTex(url, { mip = true } = {}) {
  const i = new Image(); i.src = url; i.style.display = 'none'; if (typeof document !== 'undefined') document.body.appendChild(i);
  const t = new THREE.Texture(i); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  t.generateMipmaps = mip; t.minFilter = mip ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
  t.userData.img = i; t.userData.ready = false;
  return t;
}
const texReady = t => { if (t.userData.ready) return true; const i = t.userData.img; if (i && i.complete && i.naturalWidth) { t.needsUpdate = true; t.userData.ready = true; } return t.userData.ready; };

// ---------------------------------------------------------------------------------------------------------------
// набор
// ---------------------------------------------------------------------------------------------------------------
export function noirCity(stage, o = {}) {
  const group = new THREE.Group(); group.name = 'noirCity'; stage.add(group);
  const L = V(...(o.light || [-.55, .62, .55])).normalize();
  const U = {
    uFogHi: { value: C3(o.fogHi ?? NC.fogHi) }, uFogLo: { value: C3(o.fogLo ?? NC.fogLo) },
    uFogDen: { value: o.fog ?? .0006 }, uFogStart: { value: o.fogStart ?? 40 }, uHaze: { value: o.haze ?? .55 }, uHazeH: { value: o.hazeH ?? 45 },
    uWob: { value: o.wob ?? 1 },
  };
  const BU = {
    ...U,
    uL: { value: L }, uInk: { value: C3(NC.ink) },
    uShadowK: { value: V(...(o.shadowK || [.34, .41, .62])) }, uMidK: { value: V(...(o.midK || [.6, .67, .84])) },
    uLightK: { value: V(...(o.lightK || [.8, .87, 1.0])) }, uRoofK: { value: V(...(o.roofK || [.62, .7, .9])) },
    uWarm: { value: C3(o.warm ?? NC.warm).multiplyScalar(o.warmK ?? 1.25) }, uCool: { value: C3(o.cool ?? NC.cool).multiplyScalar(.8) },
    uDim: { value: C3(NC.dim).multiplyScalar(.7) }, uStreet: { value: C3(o.street ?? 0x6a3a14).multiplyScalar(o.streetK ?? .5) },
    uStreetH: { value: o.streetH ?? 7 }, uOff: { value: 0 }, uOffShare: { value: 0 }, uEdgePx: { value: o.edgePx ?? 1.5 },
    uEmK: { value: 1 }, uBrush: { value: o.brush ?? .3 },
  };
  const buildMat = new THREE.ShaderMaterial({ uniforms: BU, vertexShader: BUILD_VS, fragmentShader: BUILD_FS });
  const INKU = { ...U, uInk: BU.uInk, uPx: { value: o.inkPx ?? 3.6 }, uRes: { value: RES } };
  const inkMat = new THREE.ShaderMaterial({ uniforms: INKU, vertexShader: INK_VS, fragmentShader: INK_FS, side: THREE.BackSide });

  const cards = [], texs = [];
  const look = {
    bg: o.bg ?? NC.skyMid, fogColor: o.fogHi ?? NC.fogHi, fogDensity: .0004, exposure: 1,
    bloom: o.bloom ?? .45, bloomRadius: .35, bloomThreshold: o.bloomThreshold ?? 1.25, dof: false, vignette: 1,
    near: o.near ?? .8, far: o.far ?? 9000,
    grade: o.grade ?? { sat: .95, tint: [.96, 1, 1.05], lift: [.006, .01, .024], contrast: 1.05 },
  };

  // ----- небо: градиент + облака мазками -----
  const sky = new THREE.Mesh(new THREE.SphereGeometry(8000, 32, 16), new THREE.ShaderMaterial({
    uniforms: { top: { value: C3(o.skyTop ?? NC.skyTop) }, mid: { value: C3(o.skyMid ?? NC.skyMid) }, low: { value: C3(o.skyLow ?? NC.skyLow) }, cl: { value: o.clouds ?? .5 } },
    side: THREE.BackSide, depthWrite: false,
    vertexShader: 'varying vec3 vD; void main(){ vD = position; vec4 p = projectionMatrix*modelViewMatrix*vec4(position,1.); gl_Position = p.xyww; }',
    fragmentShader: `uniform vec3 top, mid, low; uniform float cl; varying vec3 vD;
      ${GLSL_COMMON.split('float fogK')[0]}
      void main(){ vec3 d = normalize(vD); float h = d.y;
        vec3 c = mix(low, mid, smoothstep(-.02, .2, h)); c = mix(c, top, smoothstep(.18, .7, h));
        float a = atan(d.z, d.x);
        float n = fbm(vec3(a*2.2, h*9., 1.)); float band = smoothstep(.5, .72, n)*smoothstep(.02, .12, h)*smoothstep(.55, .2, h);
        c = mix(c, mid*1.5 + vec3(.004,.008,.012), band*cl);
        gl_FragColor = vec4(c, 1.); }`,
  }));
  sky.frustumCulled = false; sky.renderOrder = -20; group.add(sky);

  // ----- здания -----
  // spec: { x, z, w, d, h, ry, y, color, cell:[cw, ch], lit, warm, style, seed, gf, top, wob }
  function buildings(specs, { parent = group, blob = false, ink = true, inkPx } = {}) {
    const n = specs.length; if (!n) return null;
    const geo = (blob ? _blobGeo : _boxGeo).clone(), hgeo = (blob ? _blobHull : _hullGeo).clone();
    const aC = new Float32Array(n * 3), aW = new Float32Array(n * 4), aS = new Float32Array(n * 4), aE = new Float32Array(n * 4);
    const mats = [], c = new THREE.Color();
    specs.forEach((s, i) => {
      mats.push(new THREE.Matrix4().compose(V(s.x, s.y ?? 0, s.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, s.ry || 0, 0)), V(s.w, s.h, s.d)));
      c.set(s.color ?? NC.walls[0]); aC.set([c.r, c.g, c.b], i * 3);
      const cell = s.cell || [3.4, 3.6];
      aW.set([s.style < 0 ? 0 : cell[0], cell[1], s.lit ?? .4, s.warm ?? .7], i * 4);
      aS.set([s.seed ?? i * .618 % 1, s.style ?? 0, 0, s.wob ?? 1], i * 4);
      aE.set([s.gf ?? 4.2, s.top ?? 1.2, s.shop ? 1 : 0, 0], i * 4);
    });
    for (const g of [geo, hgeo]) {
      g.setAttribute('aColor', new THREE.InstancedBufferAttribute(aC, 3)); g.setAttribute('aWin', new THREE.InstancedBufferAttribute(aW, 4));
      g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(aS, 4)); g.setAttribute('aExtra', new THREE.InstancedBufferAttribute(aE, 4));
    }
    const m = new THREE.InstancedMesh(geo, buildMat, n); mats.forEach((M, i) => m.setMatrixAt(i, M)); m.frustumCulled = false; parent.add(m);
    if (ink) { const im = inkPx ? new THREE.ShaderMaterial({ uniforms: { ...INKU, uPx: { value: inkPx } }, vertexShader: INK_VS, fragmentShader: INK_FS, side: THREE.BackSide }) : inkMat;
      const h = new THREE.InstancedMesh(hgeo, im, n); mats.forEach((M, i) => h.setMatrixAt(i, M)); h.frustumCulled = false; parent.add(h); m.userData.hull = h; }
    m.userData.specs = specs;
    return m;
  }

  // ----- земля: вода + улицы (одна плоскость-отражатель) -----
  let ground = null;
  function makeGround(g = {}) {
    const size = g.size ?? 12000;
    const shader = {
      name: 'NoirGround',
      uniforms: {
        color: { value: new THREE.Color(1, 1, 1) }, tDiffuse: { value: null }, textureMatrix: { value: null },
        uWater: { value: new THREE.Vector4(...(g.water || [0, 0, 0, 0])) }, uCity: { value: new THREE.Vector4(...(g.city || [-1e5, -1e5, 1e5, 1e5])) },
        uLawn: { value: new THREE.Vector4(...(g.lawn || [0, 0, 0, 0])) },
        uGrid: { value: new THREE.Vector4(...(g.grid || [0, 0, 76, 76])) }, uStreetW: { value: new THREE.Vector2(...(g.streetW || [16, 16])) },
        uWaterCol: { value: C3(g.waterCol ?? NC.water) }, uAsphalt: { value: C3(g.asphalt ?? NC.asphalt) }, uWalk: { value: C3(g.walk ?? NC.sidewalk) },
        uGrass: { value: C3(g.grass ?? NC.grass) },
        uLamp: { value: C3(g.lamp ?? NC.warm) }, uInk: { value: C3(NC.ink) },
        uWetW: { value: g.wetWater ?? .75 }, uWetS: { value: g.wetStreet ?? .35 }, uStreak: { value: g.streak ?? .05 },
        uLampR: { value: g.lampR ?? 4.5 }, uLampStep: { value: g.lampStep ?? 34 }, uLampK: { value: g.lampK ?? .3 },
        uFogHi: U.uFogHi, uFogLo: U.uFogLo, uFogDen: U.uFogDen, uFogStart: U.uFogStart, uHaze: U.uHaze, uHazeH: U.uHazeH,
      },
      vertexShader: GROUND_VS, fragmentShader: GROUND_FS,
    };
    ground = new Reflector(new THREE.PlaneGeometry(size, size), { textureWidth: g.texW ?? 1280, textureHeight: g.texH ?? 720, clipBias: .002, shader });
    // Reflector клонирует uniforms — вернуть общие (туман меняется по кадрам)
    for (const k of ['uFogHi', 'uFogLo', 'uFogDen', 'uFogStart', 'uHaze', 'uHazeH']) ground.material.uniforms[k] = U[k];
    ground.rotation.x = -Math.PI / 2; ground.position.set(g.cx ?? 0, 0, g.cz ?? 0); group.add(ground);
    return ground;
  }

  // ----- рисованная карточка (вырезанная достопримечательность): origin — низ по центру -----
  // bb: 'cyl' — поворот к камере по вертикальной оси (+ наклон pitchK к камере), false — неподвижна (ry)
  function card(url, { pos, height, aspect, bb = 'cyl', pitchK = .6, maxTilt = .45, ry = 0, boost = .35, fogK = 1, hazeK = 0, tint = [1, 1, 1], renderOrder = 0, fadeBot = 0, fadeTop = 0, crop = [0, 0, 1, 1], depthWrite = true, parent = group } = {}) {
    const t = typeof url === 'string' ? imgTex(url) : url; texs.push(t);
    const w = height * aspect;
    const geo = new THREE.PlaneGeometry(w, height); geo.translate(0, height / 2, 0);
    const mat = new THREE.ShaderMaterial({
      uniforms: { ...U, map: { value: t }, uBoost: { value: boost }, uFogK: { value: fogK }, uHazeK: { value: hazeK }, uOpacity: { value: 1 },
        uFadeTop: { value: fadeTop }, uFadeBot: { value: fadeBot }, uTint: { value: V(...tint) }, uDim: { value: 1 }, uCrop: { value: new THREE.Vector4(...crop) } },
      vertexShader: CARD_VS, fragmentShader: CARD_FS, transparent: true, depthWrite, side: THREE.DoubleSide,
    });
    const m = new THREE.Mesh(geo, mat); m.position.copy(pos); m.rotation.y = ry; m.renderOrder = renderOrder; m.frustumCulled = false;
    m.userData.bb = bb; m.userData.pitchK = pitchK; m.userData.ry0 = ry; m.userData.maxTilt = maxTilt; parent.add(m); cards.push(m);
    return m;
  }
  // задник-панорама: часть цилиндра радиуса R вокруг center, смотрит внутрь; низ — на высоте y0
  function backdrop(url, { center = V(0, 0, 0), R = 3000, span = 100, yaw = 0, y0 = -60, boost = .3, fogK = .25, fadeTop = .14, fadeBot = .04, hazeK = 0, tint = [1, 1, 1], aspect = 16 / 9, stretch = 1, crop = [0, 0, 1, 1] } = {}) {
    const t = typeof url === 'string' ? imgTex(url) : url; texs.push(t);
    const a = span * Math.PI / 180, arc = R * a, h = arc / aspect / stretch;
    const geo = new THREE.CylinderGeometry(R, R, h, 96, 1, true, Math.PI - a / 2 + yaw, a);
    // CylinderGeometry: u идёт по углу; смотреть изнутри -> зеркалим u
    const uv = geo.getAttribute('uv'); for (let i = 0; i < uv.count; i++) uv.setX(i, 1 - uv.getX(i));
    geo.translate(0, h / 2 + y0, 0);
    const mat = new THREE.ShaderMaterial({
      uniforms: { ...U, map: { value: t }, uBoost: { value: boost }, uFogK: { value: fogK }, uHazeK: { value: hazeK }, uOpacity: { value: 1 },
        uFadeTop: { value: fadeTop }, uFadeBot: { value: fadeBot }, uTint: { value: V(...tint) }, uDim: { value: 1 }, uCrop: { value: new THREE.Vector4(...crop) } },
      vertexShader: CARD_VS, fragmentShader: CARD_FS, transparent: true, depthWrite: false, side: THREE.BackSide,
    });
    const m = new THREE.Mesh(geo, mat); m.position.copy(center); m.renderOrder = -15; m.frustumCulled = false; group.add(m);
    return m;
  }
  // фасад-цель: плоская плита на передней грани блока (смотрит в +z после ry), низ — y0
  function facade(url, { pos, width, aspect = 1672 / 941, ry = 0, y0 = 0, boost = .3, fogK = 1, crop = [0, 0, 1, 1] } = {}) {
    const h = width / aspect;
    return card(url, { pos: V(pos.x, y0, pos.z), height: h, aspect, bb: false, ry, boost, fogK, crop });
  }

  // ----- фонари -----
  function lamps(list, { size = 1, k = 900, parent = group } = {}) {
    // list: [[x, y, z, colorHex?, size?]]
    const n = list.length; const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), sz = new Float32Array(n); const c = new THREE.Color();
    list.forEach((l, i) => { pos.set([l[0], l[1], l[2]], i * 3); c.set(l[3] ?? NC.warmHot); col.set([c.r, c.g, c.b], i * 3); sz[i] = (l[4] ?? 1) * size; });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aCol', new THREE.BufferAttribute(col, 3)); g.setAttribute('aSize', new THREE.BufferAttribute(sz, 1));
    const m = new THREE.Points(g, new THREE.ShaderMaterial({ uniforms: { ...U, uK: { value: k }, uH: { value: 1 } }, vertexShader: LAMP_VS, fragmentShader: LAMP_FS,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.frustumCulled = false; m.renderOrder = 5; parent.add(m); return m;
  }

  // ----- дымка слоями: вертикальные листы поперёк полёта -----
  function hazeSheets(list, { parent = group } = {}) {
    return list.map((s, i) => {
      const geo = new THREE.PlaneGeometry(s.width ?? 3000, s.height ?? 300); geo.translate(0, (s.height ?? 300) / 2 + (s.y0 ?? -10), 0);
      const m = new THREE.Mesh(geo, new THREE.ShaderMaterial({
        uniforms: { ...U, uCol: { value: C3(s.color ?? NC.fogLo) }, uA: { value: s.alpha ?? .35 }, uH: { value: s.h ?? 40 }, uSeed: { value: i * 3.7 + 1 }, uNear: { value: s.near ?? 60 } },
        vertexShader: CARD_VS, fragmentShader: HAZE_FS, transparent: true, depthWrite: false, side: THREE.DoubleSide,
      }));
      m.position.set(s.x ?? 0, 0, s.z); m.rotation.y = s.ry ?? 0; m.renderOrder = 3; m.frustumCulled = false; parent.add(m); return m;
    });
  }

  // ----- tick -----
  const _v = new THREE.Vector3();
  function tick(t, st) {
    st.renderer.toneMapping = THREE.NoToneMapping;
    const cam = st.camera;
    sky.position.copy(cam.position);
    RES.set(st.W, st.H);
    for (const tx of texs) texReady(tx);
    for (const m of cards) {
      if (!m.userData.bb) continue;
      _v.copy(cam.position).sub(m.position);
      const yaw = Math.atan2(_v.x, _v.z), hd = Math.hypot(_v.x, _v.z), el = Math.atan2(_v.y - m.geometry.parameters.height * .35, hd);
      // 'pitch' — только наклон к камере (без поворота, иначе картинка «крутится», когда камера проходит рядом)
      m.rotation.set(0, 0, 0); m.rotation.order = 'YXZ'; m.rotation.y = m.userData.bb === 'pitch' ? m.userData.ry0 : yaw;
      m.rotation.x = -Math.min(m.userData.maxTilt, Math.max(0, el) * m.userData.pitchK);
    }
  }
  const ready = () => texs.every(texReady);

  return { group, look, tick, U, BU, buildMat, inkMat, buildings, makeGround, get ground() { return ground; }, card, backdrop, facade, lamps, hazeSheets, sky, ready, L };
}

// ---------------------------------------------------------------------------------------------------------------
// генератор кварталов: сетка улиц (период P, ширина улицы S), в квартале 1–3 x 1–2 участка, высоты от heightAt
// ---------------------------------------------------------------------------------------------------------------
export function cityGrid({ x0, x1, z0, z1, grid = [0, 0, 76, 76], streetW = [16, 16], seed = 1, heightAt = () => 30, avoid = () => false,
  palette = NC.walls, lit = [.25, .55], warm = [.55, .85], styleAt = null, lampStep = 34, lampY = 5.5, tiers = true, roofStuff = true, cells = [[3.2, 3.5], [3.6, 3.8], [4.2, 3.4], [2.8, 3.2]] }) {
  const r = rng(seed), specs = [], lampsList = [];
  const [ox, oz, px, pz] = grid;
  const kx0 = Math.floor((x0 - ox) / px), kx1 = Math.ceil((x1 - ox) / px), kz0 = Math.floor((z0 - oz) / pz), kz1 = Math.ceil((z1 - oz) / pz);
  for (let kx = kx0; kx < kx1; kx++) for (let kz = kz0; kz < kz1; kz++) {
    const bx0 = ox + kx * px + streetW[0] / 2, bx1 = ox + (kx + 1) * px - streetW[0] / 2;
    const bz0 = oz + kz * pz + streetW[1] / 2, bz1 = oz + (kz + 1) * pz - streetW[1] / 2;
    const cx = (bx0 + bx1) / 2, cz = (bz0 + bz1) / 2;
    if (cx < x0 || cx > x1 || cz < z0 || cz > z1) continue;
    const blockOut = avoid(cx, cz, (bx1 - bx0) / 2, (bz1 - bz0) / 2);
    // фонари по периметру квартала
    if (!blockOut) for (let z = bz0 + 6; z < bz1; z += lampStep) { lampsList.push([bx0 - 1.6, lampY, z]); lampsList.push([bx1 + 1.6, lampY, z]); }
    if (!blockOut) for (let x = bx0 + 6; x < bx1; x += lampStep) { lampsList.push([x, lampY, bz0 - 1.6]); lampsList.push([x, lampY, bz1 + 1.6]); }
    const nx = 1 + (r() * 3 | 0), nz = 1 + (r() * 2 | 0);
    const wx = (bx1 - bx0) / nx, wz = (bz1 - bz0) / nz;
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      const x = bx0 + (i + .5) * wx, z = bz0 + (j + .5) * wz;
      if (avoid(x, z, wx / 2, wz / 2)) continue;
      const H0 = heightAt(x, z); if (H0 <= 0) continue;
      const h = Math.max(8, H0 * (.55 + r() * .9));
      const ins = 1 + r() * 2.5, w = wx - ins * 2 - r() * 3, d = wz - ins * 2 - r() * 3;
      const style = styleAt ? styleAt(x, z, h, r) : (h > 70 ? (r() < .3 ? 1 : 0) : (r() < .2 ? 1 : 0));
      const col = palette[(r() * palette.length) | 0];
      const cell = cells[(r() * cells.length) | 0];
      const L = lit[0] + r() * (lit[1] - lit[0]), Wm = warm[0] + r() * (warm[1] - warm[0]);
      const sd = r();
      specs.push({ x: x + (r() - .5) * 2, z: z + (r() - .5) * 2, w, d, h, color: col, cell, lit: L, warm: Wm, style, seed: sd, gf: 3.6 + r() * 1.4, top: .6 + r() * 1.8 });
      // ступень сверху у высоких
      if (tiers && h > 45 && r() < .6) {
        const k = .55 + r() * .25, h2 = h * (.12 + r() * .25);
        specs.push({ x, z, y: h, w: w * k, d: d * k, h: h2, color: col, cell, lit: L, warm: Wm, style, seed: sd + .37, gf: .3, top: 1.5 });
        if (r() < .15) specs.push({ x, z, y: h + h2, w: 1.2, d: 1.2, h: 8 + r() * 14, color: 0x2a3040, style: 3, seed: sd, cell: [0, 0] });
      }
      // крышные мелочи (бак, вентблок)
      if (roofStuff && r() < .55) {
        const n = 1 + (r() * 3 | 0);
        for (let k = 0; k < n; k++) specs.push({ x: x + (r() - .5) * w * .6, z: z + (r() - .5) * d * .6, y: h, w: 2 + r() * 4, d: 2 + r() * 4, h: 1.5 + r() * 2.5, color: 0x3a4456, style: 3, seed: r(), cell: [0, 0], wob: 0 });
      }
    }
  }
  return { specs, lamps: lampsList };
}

// ---------------------------------------------------------------------------------------------------------------
// полёт камеры: сплайн Catmull-Rom (центростремительный) по позиции и цели, длина дуги -> равномерная скорость,
// профиль скорости — трапеция с плавными (косинусными) разгоном и торможением. Нет рывков: скорость непрерывна.
// keys: [{ p:[x,y,z], at:[x,y,z], fov, roll }]
// ---------------------------------------------------------------------------------------------------------------
export function flight(keys, { dur, accel = .3, decel = .4, hold = 0 } = {}) {
  const P = new THREE.CatmullRomCurve3(keys.map(k => V(...k.p)), false, 'centripetal');
  const A = new THREE.CatmullRomCurve3(keys.map(k => V(...k.at)), false, 'centripetal');
  P.arcLengthDivisions = A.arcLengthDivisions = 2000;
  const fovs = keys.map(k => k.fov ?? 40), rolls = keys.map(k => k.roll ?? 0);
  // профиль: v(u) — разгон за accel, торможение за decel (доли длительности), интеграл -> s(u) в 0..1
  const N = 2000, S = new Float64Array(N + 1);
  const vel = u => { const a = u < accel ? .5 - .5 * Math.cos(Math.PI * u / accel) : 1; const d = u > 1 - decel ? .5 - .5 * Math.cos(Math.PI * (1 - u) / decel) : 1; return Math.min(a, d); };
  for (let i = 1; i <= N; i++) S[i] = S[i - 1] + vel((i - .5) / N);
  for (let i = 0; i <= N; i++) S[i] /= S[N];
  const prog = u => { u = Math.min(1, Math.max(0, u)); const x = u * N, i = Math.min(N - 1, Math.floor(x)); return S[i] + (S[i + 1] - S[i]) * (x - i); };
  const lerpArr = (arr, s) => { const x = s * (arr.length - 1), i = Math.min(arr.length - 2, Math.floor(x)), f = x - i, e = f * f * (3 - 2 * f); return arr[i] + (arr[i + 1] - arr[i]) * e; };
  const move = dur - hold;
  const fn = t => {
    const s = prog(t / move);
    const p = P.getPointAt(s), a = A.getPointAt(s);
    return { pos: [p.x, p.y, p.z], target: [a.x, a.y, a.z], fov: lerpArr(fovs, s), roll: lerpArr(rolls, s) };
  };
  fn.progress = t => prog(t / move);
  return fn;
}

// ---------------------------------------------------------------------------------------------------------------
// 2D-дождь (слой [4]): два слоя — дальний тонкий и ближний длинный, наклон, детерминирован
// ---------------------------------------------------------------------------------------------------------------
const _rain = new Map();
export function rain2D(ctx, t, { W = 1920, H = 1080, n = 380, seed = 7, alpha = 1, slant = .2, speed = 1, color = '175,205,240', drift = 0 } = {}) {
  const key = `${n}:${seed}:${W}`;
  if (!_rain.has(key)) { const r = rng(seed), a = []; for (let i = 0; i < n; i++) { const near = r() < .25; a.push([r() * W * 1.3, r() * H, near ? 46 + r() * 50 : 16 + r() * 26, near ? .1 + r() * .12 : .06 + r() * .12, near ? 1.6 + r() * .5 : .9 + r() * .4, near ? 2 : 1.2]); } _rain.set(key, a); }
  if (alpha < .01) return;
  ctx.save(); ctx.lineCap = 'round';
  for (const [x0, y0, len, al, sp, lw] of _rain.get(key)) {
    const y = (y0 + t * 1500 * sp * speed) % (H + 120) - 60;
    const xx = ((((x0 - t * 1500 * sp * speed * slant + drift * t * sp) % (W * 1.3)) + W * 1.3) % (W * 1.3)) - W * .15;
    ctx.strokeStyle = `rgba(${color},${(al * alpha).toFixed(3)})`; ctx.lineWidth = lw;
    ctx.beginPath(); ctx.moveTo(xx, y); ctx.lineTo(xx - len * slant, y + len); ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------------------------
// 2.5D (опционально, старые функции не меняются): рисованные ряды домов — плоские вертикальные «плиты» на глубине z,
// нарисованные на холсте в манере фонов GPT: плоская заливка в 2–3 тона, светлый край слева, тёмная боковая грань
// справа, карниз-плита, тушь по силуэту, сетка окон (янтарные, тёмные, редкие холодные), неоновые крышки, у основания
// бирюзовая дымка. Размер и разрешение ряда считает coverage() по пути камеры — край ряда не попадает в кадр, текстура
// не растягивается больше чем ~1:1 на экране.
// ---------------------------------------------------------------------------------------------------------------
const _cam = new THREE.PerspectiveCamera(40, 16 / 9, .1, 1e5), _ray = new THREE.Vector3();
// что видно на плоскости z = Z за весь пролёт: { x0, x1, y0, y1, ppm } (ppm — пикселей экрана на метр в ближайший момент)
export function coverage(camFn, dur, Z, { W = 1920, H = 1080, n = 90, margin = .1, maxPpm = 40 } = {}) {
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, ppm = 0;
  for (let i = 0; i <= n; i++) {
    const s = camFn(dur * i / n); _cam.fov = s.fov; _cam.aspect = W / H; _cam.position.set(...s.pos); _cam.up.set(0, 1, 0);
    _cam.lookAt(...s.target); _cam.updateProjectionMatrix(); _cam.updateMatrixWorld();
    const dz = s.pos[2] - Z; if (dz < 1) continue;
    for (const [u, v] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 1], [0, -1]]) {
      _ray.set(u, v, .5).unproject(_cam).sub(_cam.position);
      if (_ray.z > -1e-4) { if (v > 0) y1 = 1e9; continue; }          // луч не дошёл до плоскости (вверх/назад) — вверху без предела
      const k = (Z - s.pos[2]) / _ray.z, x = s.pos[0] + _ray.x * k, y = s.pos[1] + _ray.y * k;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
    ppm = Math.max(ppm, H / (2 * dz * Math.tan(s.fov * Math.PI / 360)));
  }
  const m = (x1 - x0) * margin;
  return { x0: x0 - m, x1: x1 + m, y0, y1, ppm: Math.min(maxPpm, ppm) };
}

const _hex = (c, k = 1, add = 0) => { const v = typeof c === 'string' ? parseInt(c.slice(1), 16) : c;
  const f = x => Math.max(0, Math.min(255, Math.round(x * k + add))); return `rgb(${f(v >> 16 & 255)},${f(v >> 8 & 255)},${f(v & 255)})`; };
const _mix = (a, b, t) => { const p = x => [x >> 16 & 255, x >> 8 & 255, x & 255], A = p(a), B = p(b); return (Math.round(A[0] + (B[0] - A[0]) * t) << 16) | (Math.round(A[1] + (B[1] - A[1]) * t) << 8) | Math.round(A[2] + (B[2] - A[2]) * t); };

// C — набор noirCity; o: { z, x0, x1, ppm, base, kind: 'tower'|'stone'|'trees', seed, heightAt(x), w:[min,max], step:[min,max],
//   palette, lit, cool, warm, neon:[hex], neonShare, signs, ink, haze, keep:[[xa,xb]] — без домов, abut:[xa,xb] — дома вплотную
//   к плите снаружи (край плиты закрыт соседом), dynamic — окна гаснут }
export function paintedRow(C, o) {
  const r = rng(o.seed ?? 1), kind = o.kind || 'tower', ppm = Math.max(1.2, o.ppm), base = o.base ?? -6;
  const pal = o.palette || NC.walls, [wMin, wMax] = o.w || [18, 40], [sMin, sMax] = o.step || [.75, 1.05];
  const blds = [];
  const add = (x, w) => { const cx = x + w / 2, h = Math.max(6, o.heightAt(cx) * (o.abut ? .92 + .16 * r() : .72 + .56 * r()));
    blds.push({ x, w, h, c: pal[(r() * pal.length) | 0], side: kind === 'trees' ? 0 : .1 + .12 * r(), seed: r() * 1e4 | 0,
      lit: (o.lit ?? .45) * (.6 + .8 * r()), z: r() }); };
  if (o.abut) {                                                        // вплотную к плите [xa, xb]: дома от краёв наружу
    const [xa, xb] = o.abut;
    for (let x = xb; x < o.x1;) { const w = wMin + (wMax - wMin) * r(); add(x, w); x += w * (sMin + (sMax - sMin) * r()); }
    for (let x = xa; x > o.x0;) { const w = wMin + (wMax - wMin) * r(); add(x - w, w); x -= w * (sMin + (sMax - sMin) * r()); }
  } else {
    let x = o.x0 - wMax * r();
    while (x < o.x1) {
      const w = wMin + (wMax - wMin) * r(), cx = x + w / 2;
      if (!(o.keep || []).some(([a, b]) => cx + w / 2 > a && cx - w / 2 < b)) add(x, w); else r();
      x += w * (sMin + (sMax - sMin) * r());
    }
  }
  // дальние (низкие) рисуем первыми, высокие сзади: высокие раньше
  blds.sort((a, b) => b.h - a.h || a.z - b.z);
  const maxH = Math.max(10, ...blds.map(b => b.h)) * (o.spireH ? 1.18 : 1) + 14;
  const Wm = o.x1 - o.x0, Hm = maxH - base, WPX = Math.ceil(Wm * ppm), HPX = Math.min(8192, Math.ceil(Hm * ppm));
  const TW = 4096, nT = Math.ceil(WPX / TW), lamps = [], wins = [];
  const ink = _hex(o.ink ?? NC.ink), lw = Math.max(1.6, Math.min(5, ppm * .16 * (o.inkK ?? 1)));
  const PX = xm => (xm - o.x0) * ppm, PY = ym => HPX - (ym - base) * ppm;
  const tiles = [];
  for (let ti = 0; ti < nT; ti++) {
    const ox = ti * TW - 2, tw = Math.min(TW, WPX - ti * TW) + 4;
    const cv = document.createElement('canvas'); cv.width = tw; cv.height = HPX; const g = cv.getContext('2d');
    g.translate(-ox, 0); g.lineJoin = 'round';
    for (const [bi, b] of blds.entries()) {
      const L = PX(b.x), R = PX(b.x + b.w); if (R < ox - 40 || L > ox + tw + 40) continue;
      drawBuilding(g, b, bi, ti);
    }
    tiles.push({ cv, ox, tw });
  }
  function drawBuilding(g, b, bi, ti) {
    const rr = rng(b.seed), L = PX(b.x), R = PX(b.x + b.w), T = PY(b.h), B = PY(base), W = R - L;
    if (kind === 'trees') {                                             // кроны: круги с тушью и светлым краем
      const n = Math.max(1, Math.round(b.w / (o.crown ?? 9)));
      for (let i = 0; i < n; i++) {
        const cr = (b.w / n) * (.62 + .25 * rr()) * ppm, cx = L + (i + .5) * W / n, cy = T + cr;
        g.fillStyle = _hex(b.c); g.fillRect(cx - cr * .8, cy, cr * 1.6, B - cy);
        g.beginPath(); g.arc(cx, cy, cr, 0, Math.PI * 2); g.fillStyle = _hex(b.c); g.fill();
        g.lineWidth = lw; g.strokeStyle = ink; g.stroke();
        g.beginPath(); g.arc(cx - cr * .2, cy - cr * .2, cr * .72, Math.PI * 1.05, Math.PI * 1.6); g.lineWidth = cr * .18; g.strokeStyle = _hex(b.c, 1.35, 6); g.stroke();
      }
      return;
    }
    const sideX = R - W * b.side, cap = Math.max(1.2, b.h * .025) * ppm, ext = Math.max(2, W * .025);
    const front = _hex(b.c), side = _hex(b.c, .66), rim = _hex(b.c, 1.18, 4), capC = _hex(b.c, 1.12, 3);
    g.fillStyle = front; g.fillRect(L, T, sideX - L, B - T);
    g.fillStyle = side; g.fillRect(sideX, T, R - sideX, B - T);
    g.fillStyle = rim; g.fillRect(L, T, Math.max(2, W * .035), B - T);
    // окна
    const st = kind === 'stone';
    const cw = (o.cell?.[0] ?? (st ? 4.2 : 3.2)) * ppm, ch = (o.cell?.[1] ?? (st ? 4.6 : 3.6)) * ppm;
    const gf = (st ? 5 : 4.5) * ppm;
    const ww = cw * (st ? .44 : .56), wh = ch * (st ? .6 : .52);
    const big = ww > 9;
    const drawWins = (x0, x1, dim, narrow) => {
      const n = Math.floor((x1 - x0) / cw); if (n < 1) return;
      const pad = (x1 - x0 - n * cw) / 2;
      for (let y = B - gf - ch; y > T + cap + ch * .25; y -= ch) for (let i = 0; i < n; i++) {
        const wx = x0 + pad + i * cw + (cw - ww * narrow) / 2, wy = y + (ch - wh) / 2;
        const cl = Math.sin(i * .9 + b.seed) * .5 + Math.sin(y / ch * 1.3 + b.seed * .7) * .5;   // окна горят кучками
        const v = rr() * .65 + cl * .35 + .175;
        let col;
        if (v < b.lit * (dim ? .55 : 1)) col = rr() < (o.cool ?? .06) ? '#cfe6ff' : (rr() < .25 ? '#ffc766' : '#f3a33c');
        if (col) {
          g.fillStyle = dim ? _hex(parseInt(col.slice(1), 16), .62) : col; g.fillRect(wx, wy, ww * narrow, wh);
          if (!dim && big) {                                            // крупно: свет сверху, жалюзи у части окон
            const gr = g.createLinearGradient(0, wy, 0, wy + wh); gr.addColorStop(0, 'rgba(255,240,200,.55)'); gr.addColorStop(.5, 'rgba(255,220,150,0)'); gr.addColorStop(1, 'rgba(120,50,10,.25)');
            g.fillStyle = gr; g.fillRect(wx, wy, ww * narrow, wh);
            if (rr() < .3) { g.fillStyle = 'rgba(90,45,15,.35)'; const n = Math.max(3, wh / 7 | 0); for (let k = 0; k < n * .55; k++) g.fillRect(wx, wy + k * wh / n, ww * narrow, Math.max(1, wh / n * .35)); }
          }
          if (!dim && o.dynamic) wins.push({ ti, bi, big, lw: Math.max(1.2, lw * .6), x: wx, y: wy, w: ww * narrow, h: wh, cx: o.x0 + (wx + ww / 2) / ppm, cy: base + (HPX - wy - wh / 2) / ppm });
        } else { g.fillStyle = st ? _hex(b.c, .55) : _hex(b.c, .62); g.fillRect(wx, wy, ww * narrow, wh);
          if (big) { g.strokeStyle = _hex(b.c, 1.25, 10); g.globalAlpha = .35; g.lineWidth = ww * .1; g.beginPath(); g.moveTo(wx + ww * .25, wy + wh * .9); g.lineTo(wx + ww * .7, wy + wh * .15); g.stroke(); g.globalAlpha = 1; } }
        if (big) { g.lineWidth = Math.max(1.2, lw * .6); g.strokeStyle = ink; g.strokeRect(wx, wy, ww * narrow, wh);
          g.beginPath(); g.moveTo(wx + ww * narrow / 2, wy); g.lineTo(wx + ww * narrow / 2, wy + wh); g.moveTo(wx, wy + wh * .32); g.lineTo(wx + ww * narrow, wy + wh * .32); g.stroke();
          g.fillStyle = _hex(b.c, 1.22, 6); g.fillRect(wx - ww * .06, wy + wh, ww * narrow * 1.12, Math.max(2, ch * .07));
          g.strokeRect(wx - ww * .06, wy + wh, ww * narrow * 1.12, Math.max(2, ch * .07)); }
        if (st && ww > 3) { g.fillStyle = _hex(b.c, 1.2, 4); g.fillRect(wx - ww * .12, wy + wh, ww * narrow * 1.24, Math.max(1, ch * .06)); g.fillRect(wx - ww * .08, wy - ch * .08, ww * narrow * 1.16, Math.max(1, ch * .06)); }
      }
    };
    if (ww > 9 && !st) {                                                // крупно: межэтажные пояса и простенки
      g.fillStyle = _hex(b.c, .86); for (let y = B - gf; y > T + cap; y -= ch) g.fillRect(L, y - ch * .06, sideX - L, ch * .06);
      g.fillStyle = _hex(b.c, 1.08, 2); g.fillRect(L + W * .05, T + cap, Math.max(2, W * .015), B - T - cap);
    }
    drawWins(L + W * .05, sideX - W * .02, false, 1);
    if (R - sideX > cw * .6) drawWins(sideX + 2, R - 2, true, .55);
    // карниз
    g.fillStyle = capC; g.fillRect(L - ext, T - cap * .2, W + ext * 2, cap);
    if (st) { g.fillStyle = _hex(b.c, .75); for (let xx = L; xx < R; xx += cap * .7) g.fillRect(xx, T + cap * .85, cap * .3, cap * .35); }
    g.lineWidth = lw; g.strokeStyle = ink; g.strokeRect(L - ext, T - cap * .2, W + ext * 2, cap);
    // крыша: короба, антенна, неоновая крышка
    if (!st) {
      const nb = rr() < .7 ? 1 + (rr() * 2 | 0) : 0;
      for (let k = 0; k < nb; k++) { const bw = W * (.12 + .15 * rr()), bh = Math.max(3, Math.min(bw * .7, 2.6 * ppm)), bx = L + W * (.1 + .7 * rr());
        g.fillStyle = _hex(b.c, .85); g.fillRect(bx, T - cap * .2 - bh, bw, bh); g.lineWidth = lw * .8; g.strokeStyle = ink; g.strokeRect(bx, T - cap * .2 - bh, bw, bh); }
      if (o.neon && rr() < (o.neonShare ?? .25)) {
        const nc = o.neon[(rr() * o.neon.length) | 0], nw = W * (.35 + .3 * rr()), nh = Math.max(2.5, 1.2 * ppm), nx = L + (W - nw) / 2, ny = T - cap * .2 - nh;
        g.save(); g.shadowColor = _hex(nc); g.shadowBlur = Math.max(4, nh * 1.6); g.fillStyle = _hex(nc, 1, 40); g.fillRect(nx, ny, nw, nh); g.restore();
        g.lineWidth = lw * .8; g.strokeStyle = ink; g.strokeRect(nx, ny, nw, nh);
        lamps.push([o.x0 + (nx + nw / 2) / ppm, base + (HPX - ny) / ppm, o.z + .5, nc, Math.min(3, .6 + nw / ppm / 10)]);
      }
      if (o.signs && rr() < o.signs && b.h > 18) {                      // вертикальная вывеска без букв у угла
        const nc = o.neon[(rr() * o.neon.length) | 0], sw = 1.4 * ppm, sh = Math.min(b.h * .45, 9 + 8 * rr()) * ppm, sx = L + W * .06, sy = B - gf - sh - rr() * (B - T - gf - sh) * .5;
        g.save(); g.shadowColor = _hex(nc); g.shadowBlur = sw * 1.5; g.fillStyle = _hex(nc, 1, 30); g.fillRect(sx, sy, sw, sh); g.restore();
        g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(sx + sw * .3, sy + sw * .3, sw * .4, sh - sw * .6);
        g.lineWidth = lw * .7; g.strokeStyle = ink; g.strokeRect(sx, sy, sw, sh);
        lamps.push([o.x0 + (sx + sw / 2) / ppm, base + (HPX - sy - sh / 2) / ppm, o.z + 1, nc, 1.2]);
      }
    }
    if (!st && b.h > (o.spireH ?? 1e9)) {                               // шпиль и красный огонь на высоких башнях
      const sx = L + (sideX - L) * .5, sh = b.h * .14 * ppm; g.lineWidth = Math.max(2, lw * .9); g.strokeStyle = ink;
      g.beginPath(); g.moveTo(sx, T - cap); g.lineTo(sx, T - cap - sh); g.stroke();
      g.fillStyle = _hex(b.c, 1.1); g.fillRect(sx - W * .12, T - cap - sh * .25, W * .24, sh * .25); g.strokeRect(sx - W * .12, T - cap - sh * .25, W * .24, sh * .25);
      lamps.push([o.x0 + sx / ppm, base + (HPX - (T - cap - sh)) / ppm, o.z + .5, 0xff3a2a, 1.4]);
    }
    // тушь: силуэт и ребро боковой грани
    g.lineWidth = lw; g.strokeStyle = ink; g.strokeRect(L, T, W, B - T + lw);
    g.lineWidth = lw * .6; g.beginPath(); g.moveTo(sideX, T); g.lineTo(sideX, B); g.stroke();
  }
  // бирюзовая дымка у основания (как на фонах: низ кварталов тонет в свете улиц)
  if (o.haze !== 0) for (const t of tiles) {
    const g = t.cv.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-atop';
    const hz = (o.hazeH ?? 14) * ppm, y0 = PY(0);
    const gr = g.createLinearGradient(0, y0 - hz, 0, y0); const hc = o.hazeCol ?? 0x2a5a6a;
    gr.addColorStop(0, `rgba(${hc >> 16 & 255},${hc >> 8 & 255},${hc & 255},0)`); gr.addColorStop(1, `rgba(${hc >> 16 & 255},${hc >> 8 & 255},${hc & 255},${o.haze ?? .55})`);
    g.fillStyle = gr; g.fillRect(0, y0 - hz, t.tw, HPX - y0 + hz); g.globalCompositeOperation = 'source-over';
  }
  // плоскости
  const group = new THREE.Group(); C.group.add(group);
  const meshes = tiles.map(t => {
    const tex = new THREE.CanvasTexture(t.cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter; tex.userData.ready = true;
    const wM = t.tw / ppm, cx = o.x0 + (t.ox + t.tw / 2) / ppm;
    const m = C.card(tex, { pos: V(cx, base, o.z), height: HPX / ppm, aspect: t.tw / HPX, bb: false, boost: o.boost ?? .35, fogK: o.fogK ?? 1, parent: group, renderOrder: o.renderOrder ?? 0 });
    t.tex = tex; return m;
  });
  // окна гаснут: off(t) -> множество индексов wins; перерисовка тайла только при смене числа погасших
  let lastKey = '';
  const baseCopies = o.dynamic ? tiles.map(t => { const c = document.createElement('canvas'); c.width = t.cv.width; c.height = t.cv.height; c.getContext('2d').drawImage(t.cv, 0, 0); return c; }) : null;
  function setOff(list) {
    const key = list.join(','); if (key === lastKey || !baseCopies) return; lastKey = key;
    const dirty = new Set(list.map(i => wins[i].ti)); tiles.forEach((t, i) => { if (t.offN) dirty.add(i); t.offN = 0; });
    for (const i of dirty) { const g = tiles[i].cv.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(baseCopies[i], 0, 0); }
    for (const i of list) { const w = wins[i], t = tiles[w.ti], g = t.cv.getContext('2d'); g.setTransform(1, 0, 0, 1, -t.ox, 0);
      g.fillStyle = _hex(blds[w.bi].c, .62); g.fillRect(w.x, w.y, w.w, w.h); t.offN = (t.offN || 0) + 1;
      if (w.big) { g.lineWidth = w.lw; g.strokeStyle = ink; g.strokeRect(w.x, w.y, w.w, w.h); g.beginPath();
        g.moveTo(w.x + w.w / 2, w.y); g.lineTo(w.x + w.w / 2, w.y + w.h); g.moveTo(w.x, w.y + w.h * .32); g.lineTo(w.x + w.w, w.y + w.h * .32); g.stroke(); } }
    for (const i of dirty) tiles[i].tex.needsUpdate = true;
  }
  return { group, meshes, lamps, wins, setOff, blds, ppm, size: [WPX, HPX] };
}
