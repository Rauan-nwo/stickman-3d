// lightCone.js: видимый конус света под лампой. Узкий у абажура, мягкие края, обычное альфа-смешение.
// Он часть слоя [1] и по построению лежит ПОЗАДИ персонажей: герой в луче остаётся чисто белым.
import * as THREE from 'three';

export function lightCone(parent, { top, floorY = 0, r0 = .07, r1 = .63, color = [.93, .775, .56], aTop = .36, aBottom = .5, seg = 64 }) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { u_a: { value: 1 } }, transparent: true, depthWrite: false, side: THREE.FrontSide,
    vertexShader: `varying vec3 vN; varying vec3 vV; varying vec2 vUv; void main(){ vUv = uv; vec4 mv = modelViewMatrix*vec4(position,1.); vV = -mv.xyz; vN = normalize(normalMatrix*normal); gl_Position = projectionMatrix*mv; }`,
    // clamp обязателен: pow() от слегка отрицательного числа даёт NaN, а bloom размазывает NaN на весь кадр
    fragmentShader: `uniform float u_a; varying vec3 vN; varying vec3 vV; varying vec2 vUv;
    void main(){ float f = clamp(abs(dot(normalize(vN), normalize(vV))), 0., 1.), y = clamp(vUv.y, 0., 1.); float a = pow(f, 1.25) * mix(${aTop.toFixed(3)}, ${aBottom.toFixed(3)}, pow(y, 1.5)) * smoothstep(0., .34, y);
      gl_FragColor = vec4(vec3(${color.map(c => c.toFixed(3)).join(', ')}), a * u_a); }`,
  });
  const h = top.y - floorY, m = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, seg, 1, true), mat);
  m.position.set(top.x, floorY + h / 2, top.z); parent.add(m);
  m.setAlpha = a => { mat.uniforms.u_a.value = a; };
  return m;
}
