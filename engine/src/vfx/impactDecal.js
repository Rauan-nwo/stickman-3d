// impactDecal.js: попадание в стену — воронка с растрескавшимися плитками, плоская жёлтая «клякса» с каплями и шипами,
// тонкие трещины, которые продолжают расти ~0.5 с. Это НЕ взрыв (см. explosion.js). Рисуется на канвас-текстуре,
// плоскость лежит на стене (pos = точка попадания, normal = от стены в комнату).
import * as THREE from 'three';
import { rng } from '../core/rng.js';
import { clamp, E } from '../core/ease.js';

export function impactDecal(parent, { pos, normal, size = .58, res = 512, seeds = [77, 91, 55], splat = '#E9CC2E' }) {
  const DEC = res, decalC = document.createElement('canvas'); decalC.width = decalC.height = DEC;
  const decalT = new THREE.CanvasTexture(decalC); decalT.colorSpace = THREE.SRGBColorSpace; decalT.anisotropy = 8;
  const decal = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: decalT, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }));
  decal.position.copy(pos).addScaledVector(normal, .012); decal.lookAt(pos.clone().add(normal)); parent.add(decal);
  const CRACKS = (() => { const r = rng(seeds[0]), a = []; for (let i = 0; i < 9; i++) { let ang = i / 9 * 6.283 + (r() - .5) * .5, x = Math.cos(ang) * 34, y = Math.sin(ang) * 34; const pts = [[x, y]], L = 110 + r() * 130, n = 9; for (let s = 0; s < n; s++) { ang += (r() - .5) * .9; x += Math.cos(ang) * L / n; y += Math.sin(ang) * L / n; pts.push([x, y]); } const br = r() < .6 ? { at: 3 + Math.floor(r() * 4), ang: ang + (r() < .5 ? 1 : -1) * (.5 + r() * .5), len: 25 + r() * 45 } : null; a.push({ pts, br, delay: r() * .12 }); } return a; })();
  const PLATES = (() => { const r = rng(seeds[1]), a = []; for (let i = 0; i < 7; i++) { const a0 = i / 7 * 6.283 + (r() - .5) * .5, a1 = a0 + 6.283 / 7 * (.55 + r() * .5), r0 = 24 + r() * 14, r1 = 46 + r() * 30; a.push({ a0, a1, r0, r1, sh: .25 + r() * .5, lift: r() }); } return a; })();
  const DROPS = (() => { const r = rng(seeds[2]), a = []; for (let i = 0; i < 22; i++) { const ang = r() * 6.283, d = 42 + r() * 62; a.push({ ang, d, s: 2.5 + r() * 5 }); } return a; })();
  function draw(age) {
    const x = decalC.getContext('2d'), c = DEC / 2; x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, DEC, DEC); x.translate(c, c); x.lineCap = 'round'; x.lineJoin = 'round';
    if (DEC !== 512) x.scale(DEC / 512, DEC / 512);
    const k = E.outCubic(clamp(age / .1));
    // thin cracks, growing for ~0.5 s
    for (const cr of CRACKS) { const g = clamp((age - cr.delay) / .5), n = Math.max(1, Math.floor(g * (cr.pts.length - 1)));
      x.strokeStyle = 'rgba(32,18,10,.9)'; x.lineWidth = 2.2; x.beginPath(); x.moveTo(cr.pts[0][0], cr.pts[0][1]); for (let i = 1; i <= n; i++) x.lineTo(cr.pts[i][0], cr.pts[i][1]); x.stroke();
      if (cr.br && n > cr.br.at) { const p = cr.pts[cr.br.at]; x.lineWidth = 1.6; x.beginPath(); x.moveTo(p[0], p[1]); x.lineTo(p[0] + Math.cos(cr.br.ang) * cr.br.len * g, p[1] + Math.sin(cr.br.ang) * cr.br.len * g); x.stroke(); } }
    // crater bowl
    const g0 = x.createRadialGradient(-6, -8, 4, 0, 0, 54); g0.addColorStop(0, '#E8C9A0'); g0.addColorStop(.55, '#D2A777'); g0.addColorStop(1, '#8F6A49');
    x.fillStyle = g0; x.beginPath(); for (let i = 0; i <= 14; i++) { const a = i / 14 * 6.283, rr = (46 + 9 * Math.sin(i * 2.7)) * k; x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } x.closePath(); x.fill();
    x.fillStyle = 'rgba(26,14,8,.92)'; x.beginPath(); x.moveTo(-40 * k, 6); x.quadraticCurveTo(-36 * k, -40 * k, 14 * k, -40 * k); x.quadraticCurveTo(-14 * k, -22 * k, -18 * k, 4); x.closePath(); x.fill();             // inner shadow (depth)
    // cracked plates lifted around the rim
    for (const p of PLATES) { const off = 6 + p.lift * 9 * k, am = (p.a0 + p.a1) / 2, ox = Math.cos(am) * off, oy = Math.sin(am) * off;
      x.beginPath(); x.moveTo(ox + Math.cos(p.a0) * p.r0, oy + Math.sin(p.a0) * p.r0); x.lineTo(ox + Math.cos(p.a0 + .08) * p.r1, oy + Math.sin(p.a0 + .08) * p.r1); x.lineTo(ox + Math.cos(am) * (p.r1 + 7), oy + Math.sin(am) * (p.r1 + 7)); x.lineTo(ox + Math.cos(p.a1 - .08) * p.r1, oy + Math.sin(p.a1 - .08) * p.r1); x.lineTo(ox + Math.cos(p.a1) * p.r0, oy + Math.sin(p.a1) * p.r0); x.closePath();
      x.fillStyle = `rgb(${Math.round(190 + 40 * p.sh)},${Math.round(150 + 36 * p.sh)},${Math.round(108 + 30 * p.sh)})`; x.fill();
      x.save(); x.clip(); x.fillStyle = 'rgba(70,45,28,.55)'; const r = rng(Math.round(p.a0 * 100)); for (let i = 0; i < 26; i++) x.fillRect(ox + (r() - .5) * 120, oy + (r() - .5) * 120, 2 + r() * 3, 1.5 + r() * 2); x.restore();
      x.strokeStyle = 'rgba(28,15,8,.95)'; x.lineWidth = 3.4; x.beginPath(); x.moveTo(ox + Math.cos(p.a0) * p.r0, oy + Math.sin(p.a0) * p.r0); x.lineTo(ox + Math.cos(p.a0 + .08) * p.r1, oy + Math.sin(p.a0 + .08) * p.r1); x.lineTo(ox + Math.cos(am) * (p.r1 + 7), oy + Math.sin(am) * (p.r1 + 7)); x.stroke(); }
    // flat yellow splat: droplets, spikes, faceted disc
    x.fillStyle = splat; for (const d of DROPS) { const dd = d.d * (.45 + .55 * k); x.beginPath(); x.arc(Math.cos(d.ang) * dd, Math.sin(d.ang) * dd, d.s, 0, 6.3); x.fill(); }
    for (const [a, L] of [[-1.05, 86], [-2.2, 62], [.45, 78], [2.4, 52], [.0, 46]]) { const LL = L * k; x.beginPath(); x.moveTo(Math.cos(a - .32) * 26, Math.sin(a - .32) * 26); x.lineTo(Math.cos(a) * LL, Math.sin(a) * LL); x.lineTo(Math.cos(a + .32) * 26, Math.sin(a + .32) * 26); x.closePath(); x.fillStyle = '#EFD12C'; x.fill(); }
    x.beginPath(); for (let i = 0; i <= 16; i++) { const a = i / 16 * 6.283, rr = (i % 2 ? 23 : 29) * k; x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } x.closePath(); x.fillStyle = '#EBCB2A'; x.fill(); x.lineWidth = 2; x.strokeStyle = '#B08A10'; x.stroke();
    x.strokeStyle = 'rgba(160,120,10,.55)'; x.lineWidth = 1.6; x.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; x.moveTo(0, 0); x.lineTo(Math.cos(a) * 25 * k, Math.sin(a) * 25 * k); } x.stroke();
    x.fillStyle = '#FBE873'; x.beginPath(); x.arc(-5, -6, 9 * k, 0, 6.3); x.fill();
    decalT.needsUpdate = true;
  }
  // age — секунды после попадания; до него декаль скрыта
  decal.setAge = age => { decal.visible = age > 0; if (decal.visible) draw(age); };
  decal.visible = false;
  return decal;
}
