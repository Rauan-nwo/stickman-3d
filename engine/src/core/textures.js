// textures.js: канвас-текстуры (надписи, свечения). Общие текстуры создаются один раз.
import * as THREE from 'three';
export const canvasTex = (w, h, fn) => {
  const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
};
let _glow, _soft;
// тёплое свечение (огонь, золото) и нейтральное мягкое пятно (пыль, тень)
export const glowTex = () => _glow || (_glow = canvasTex(128, 128, (x) => { const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,236,170,1)'); g.addColorStop(.22, 'rgba(255,180,70,.55)'); g.addColorStop(1, 'rgba(255,120,20,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); }));
export const softTex = () => _soft || (_soft = canvasTex(128, 128, (x) => { const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.5, 'rgba(255,255,255,.4)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); }));
