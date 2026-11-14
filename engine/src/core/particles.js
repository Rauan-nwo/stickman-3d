// particles.js: GPU-частицы и спрайты. Движение частиц считается в вершинном шейдере из u_time — чистая функция времени.
import * as THREE from 'three';
// attrs: [[имя, размер, (i, массив, смещение) => void], ...]; u_px — фокусное расстояние в пикселях (stage.pxs())
export function points(parent, n, attrs, vs, fs, blending = THREE.AdditiveBlending) {
  const g = new THREE.BufferGeometry();
  for (const [k, size, fn] of attrs) { const a = new Float32Array(n * size); for (let i = 0; i < n; i++) fn(i, a, i * size); g.setAttribute(k, new THREE.BufferAttribute(a, size)); }
  const u = { u_time: { value: 0 }, u_px: { value: 1000 } };
  const pt = new THREE.Points(g, new THREE.ShaderMaterial({ uniforms: u, vertexShader: vs, fragmentShader: fs, transparent: true, depthWrite: false, blending }));
  pt.frustumCulled = false; parent.add(pt);
  pt.tick = (t, stage) => { u.u_time.value = t; u.u_px.value = stage.pxs(); };
  return pt;
}
export const sprite = (parent, tex, opts = {}) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, ...opts })); parent.add(s); return s; };
