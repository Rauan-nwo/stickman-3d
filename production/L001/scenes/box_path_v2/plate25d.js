// plate25d.js: рисованный фон (тип B «Стикман Нуар») как 2.5D-декорация для движения камеры.
//
// «Камерная проекция»: картинку видит исходная камера cam0 (высота h, наклон и поворот — по точке схода, FOV).
// Сетка 192x108 вершин лежит на лучах cam0 и упирается в простую геометрию-заместитель: пол y=0, стены x=const,
// задняя плоскость z=const, потолок y=const (что ближе по лучу). Из cam0 сетка выглядит ровно как картинка, а при
// сдвиге камеры получает правильный параллакс: пол уходит в перспективе, дальнее отстаёт. Глубина непрерывна (минимум
// по плоскостям), поэтому сетка не рвётся. Разрывы только у вырезанных слоёв:
//   fgs  — передний план (картинка с маской в альфе) на плоскостях ближе к камере; в основной плите дыра под ними
//          залита соседним цветом (make_assets.py);
//   far  — дальний план (небо, краны, улица за дверью) на плоскости далеко; в основной плите на его месте альфа 0.
// 3D-предметы ставятся в тех же мировых координатах: floorAt(u, v) — точка пола под пикселем (u, v) картинки.
// Все пиксельные координаты — в системе исходника (W x H, по умолчанию 1672x941), текстуры могут быть любого размера.
import { THREE, V } from 'engine';

const D2R = Math.PI / 180;
export function img(url) { const i = new Image(); i.src = url; i.style.display = 'none'; document.body.appendChild(i); return i; }
export const tex = c => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; return t; };
const canvasOf = i => { const c = document.createElement('canvas'); c.width = i.naturalWidth; c.height = i.naturalHeight; c.getContext('2d').drawImage(i, 0, 0); return c; };

// cfg: { plate, W, H, h, vp: [u, v] (точка схода оси прохода = горизонт), fov (вертикальный, град),
//        left/right/back: [u, v] — пиксель на полу у основания стены / задней стены; ceil: высота потолка (м),
//        fgs: [{ url, depth }], far: { url, depth }, tmax }
export function makePlate(cfg) {
  const W = cfg.W || 1672, H = cfg.H || 941, tV = Math.tan(cfg.fov / 2 * D2R), tH = tV * W / H, f = H / 2 / tV;
  const pitch = Math.atan((H / 2 - cfg.vp[1]) / f), yaw = Math.atan((cfg.vp[0] - W / 2) * Math.cos(pitch) / f);
  const P0 = V(0, cfg.h, 0), fwdH = V(-Math.sin(yaw), 0, -Math.cos(yaw)), right = V(Math.cos(yaw), 0, -Math.sin(yaw));
  const fwd = fwdH.clone().multiplyScalar(Math.cos(pitch)).add(V(0, -Math.sin(pitch), 0)), up = new THREE.Vector3().crossVectors(right, fwd);
  const ray = (u, v) => fwd.clone().addScaledVector(right, (u / W - .5) * 2 * tH).addScaledVector(up, (.5 - v / H) * 2 * tV);
  const floorAt = (u, v) => { const d = ray(u, v), t = -P0.y / d.y; return P0.clone().addScaledVector(d, t); };
  const planes = [[V(0, 1, 0), 0]];                                               // [нормаль, c]: p·n = c
  if (cfg.left) planes.push([V(1, 0, 0), floorAt(...cfg.left).x]);
  if (cfg.right) planes.push([V(1, 0, 0), floorAt(...cfg.right).x]);
  if (cfg.back) planes.push([V(0, 0, 1), floorAt(...cfg.back).z]);
  if (cfg.ceil) planes.push([V(0, 1, 0), cfg.ceil]);
  const tmax = cfg.tmax || 200;
  function hit(d) {
    let best = tmax;
    for (const [n, c] of planes) { const dn = d.dot(n); if (Math.abs(dn) < 1e-6) continue; const t = (c - P0.dot(n)) / dn; if (t > .05 && t < best) best = t; }
    return best;
  }
  const NX = 192, NY = 108, pos = new Float32Array((NX + 1) * (NY + 1) * 3), uv = new Float32Array((NX + 1) * (NY + 1) * 2), idx = [];
  for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) {
    const k = j * (NX + 1) + i, d = ray(i / NX * W, j / NY * H), p = P0.clone().addScaledVector(d, hit(d));
    pos.set([p.x, p.y, p.z], k * 3); uv.set([i / NX, 1 - j / NY], k * 2);
    if (i < NX && j < NY) idx.push(k, k + NX + 1, k + 1, k + 1, k + NX + 1, k + NX + 2);
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setIndex(idx);
  const group = new THREE.Group();
  // с дальним слоем плита полупрозрачна по краю маски (мягкий стык), но пишет глубину — 3D-предметы перекрываются верно.
  // v2: solid — плита и передний план непрозрачные с alphaTest (жёсткий край): так они попадают в проход глубины DOF (rack-focus)
  const solid = !!cfg.solid;
  const baseMat = new THREE.MeshBasicMaterial({ fog: false, toneMapped: false, transparent: !!cfg.far && !solid, depthWrite: true, alphaTest: cfg.far ? (solid ? .5 : .01) : 0 });
  const base = new THREE.Mesh(geo, baseMat); base.renderOrder = -5; base.userData.noDepth = false; group.add(base);
  const basis = new THREE.Matrix4().makeBasis(right, up, fwd.clone().negate());
  // плоскость, перпендикулярная оси cam0 на глубине D: из cam0 закрывает ровно кадр
  function card(D, o) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2 * D * tH, 2 * D * tV), new THREE.MeshBasicMaterial({ fog: false, toneMapped: false, ...o }));
    m.position.copy(P0).addScaledVector(fwd, D); m.quaternion.setFromRotationMatrix(basis); m.visible = false; group.add(m); return m;
  }
  const layers = [{ i: img(cfg.plate), mat: baseMat, mesh: base }];
  if (cfg.far) { const m = card(cfg.far.depth, { depthWrite: true }); m.renderOrder = -10; layers.push({ i: img(cfg.far.url), mat: m.material, mesh: m }); }
  const fgMeshes = [];
  for (const g of cfg.fgs || []) { const m = card(g.depth, solid ? { alphaTest: .5, depthWrite: false } : { transparent: true, depthWrite: false }); m.renderOrder = 10; fgMeshes.push(m); layers.push({ i: img(g.url), mat: m.material, mesh: m }); }
  base.visible = false;
  let ready = false;
  function tick() {
    if (ready || !layers.every(l => l.i.complete && l.i.naturalWidth)) return;
    for (const l of layers) { l.mat.map = tex(canvasOf(l.i)); l.mat.needsUpdate = true; l.mesh.visible = true;
      if (l.mesh.userData.depthMat) { l.mesh.userData.depthMat.map = l.mat.map; l.mesh.userData.depthMat.needsUpdate = true; } }
    ready = true;
  }
  // v2: для своего прохода глубины (DOF) — материал глубины с той же альфой, что у слоя
  for (const l of layers) if (l.mat.alphaTest > 0) l.mesh.userData.depthMat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, alphaTest: .5 });
  // v2: точка геометрии-заместителя под пикселем (u, v): пол, стена, потолок — что ближе по лучу
  const worldAt = (u, v) => { const d = ray(u, v); return P0.clone().addScaledVector(d, hit(d)); };
  // v2: точка на заданной глубине D (м) вдоль оси cam0 под пикселем (u, v)
  const pointAt = (u, v, D) => { const d = ray(u, v); return P0.clone().addScaledVector(d, D / d.dot(fwd)); };
  // v2: пиксель исходника (u, v) для точки мира, как её видит cam0
  const project0 = p => { const d = p.clone().sub(P0), z = d.dot(fwd); return [W / 2 + d.dot(right) / z / tH * W / 2, H / 2 - d.dot(up) / z / tV * H / 2]; };
  // v2: картинка-спрайт (вырезка из плиты) на плоскости ⟂ оси cam0 на глубине D. rect = [u0, v0, u1, v1] в пикселях исходника,
  //     pivot = [u, v] — точка подвеса (вокруг неё вращается группа). Возвращает { pivot: Group, mesh }
  function spriteCard(url, rect, D, pivotPx, o = {}) {
    const [u0, v0, u1, v1] = rect, a = pointAt(u0, v0, D), b = pointAt(u1, v1, D), pv = pointAt(...pivotPx, D);
    const w = b.clone().sub(a).dot(right), h = a.clone().sub(b).dot(up);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ fog: false, toneMapped: false, transparent: true, depthWrite: false, ...o }));
    const g = new THREE.Group(); g.position.copy(pv); g.quaternion.setFromRotationMatrix(basis); group.add(g); g.add(m);
    const c = a.clone().add(b).multiplyScalar(.5).sub(pv); m.position.set(c.dot(right), c.dot(up), 0); m.renderOrder = 5; m.visible = false;
    layers.push({ i: img(url), mat: m.material, mesh: m });
    return { pivot: g, mesh: m };
  }
  // состояние камеры относительно cam0: dx вправо, dy вверх, dz вперёд (м), yaw/tilt (град, + вправо / вверх), crop (<1 — уже cam0)
  function cam({ dx = 0, dy = 0, dz = 0, yaw: ya = 0, tilt = 0, crop = .9, roll = 0 } = {}) {
    const p = P0.clone().addScaledVector(right, dx).addScaledVector(up, dy).addScaledVector(fwd, dz);
    const d = fwd.clone().applyAxisAngle(right, tilt * D2R).applyAxisAngle(V(0, 1, 0), -ya * D2R);
    return { pos: [p.x, p.y, p.z], target: [p.x + d.x * 10, p.y + d.y * 10, p.z + d.z * 10], fov: 2 * Math.atan(tV * crop) / D2R, roll };
  }
  // v2: камера по позиции (dx/dy/dz как в cam) и точке прицела в мире (для наведения на наклейку и т. п.)
  function aim({ dx = 0, dy = 0, dz = 0, crop = .9, roll = 0 } = {}, target) {
    const p = P0.clone().addScaledVector(right, dx).addScaledVector(up, dy).addScaledVector(fwd, dz);
    return { pos: [p.x, p.y, p.z], target: [target.x, target.y, target.z], fov: 2 * Math.atan(tV * crop) / D2R, roll };
  }
  return { group, tick, floorAt, worldAt, pointAt, project0, spriteCard, cam, aim, P0, fwd, right, up, yaw, pitch, f, ray, basis, fgMeshes, base, isReady: () => ready };
}

// мягкая тень на полу (радиальный градиент), полуоси rx/rz (м), k — непрозрачность в центре
export function blobShadow(rx, rz, k = .55, color = '6,8,18') {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, `rgba(${color},${k})`); g.addColorStop(.62, `rgba(${color},${k * .85})`); g.addColorStop(.82, `rgba(${color},${k * .35})`); g.addColorStop(1, `rgba(${color},0)`);
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(rx * 2, rz * 2), new THREE.MeshBasicMaterial({ map: tex(c), transparent: true, depthWrite: false, toneMapped: false, fog: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
  m.rotation.x = -Math.PI / 2; m.position.y = .006; m.renderOrder = 1;
  return m;
}
