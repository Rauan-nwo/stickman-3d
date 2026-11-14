// explosion.js: взрыв — вспышка + клубы пыли + разлетающиеся обломки. Всё считается из age (секунды после взрыва).
// Пыль может вырасти до «завесы» на весь кадр (curtain) — основа мягкого перехода «пыль закрыла кадр → новая локация».
//   const boom = explosion(set.group, { pos: V(0, 1, -6), scale: 1.5, dir: [0, .3, 1] });
//   в update(t): boom.setAge(t - T_BOOM, stage);   в over(t): boom.flash2D(ctx, stage, t - T_BOOM)
import * as THREE from 'three';
import { rng } from '../core/rng.js';
import { clamp, smooth } from '../core/ease.js';
import { sprite } from '../core/particles.js';
import { softTex, glowTex } from '../core/textures.js';
import { STONES } from '../sets/kit.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

export function explosion(parent, { pos, scale = 1, dir = [0, .25, 1], seed = 5, nDust = 16, nDebris = 28, dustColor = [.80, .66, .50], debrisColor = 0x8a7663, life = 2.6, curtain = 0, light = true }) {
  const r = rng(seed), D = V(...dir).normalize(), g = new THREE.Group(); parent.add(g);
  // вспышка: точечный свет + ядро свечения
  const L = light ? new THREE.PointLight(0xffc070, 0, 14 * scale, 1.6) : null; if (L) { L.position.copy(pos); g.add(L); }
  const core = sprite(g, glowTex()); core.position.copy(pos);
  // клубы: мягкие непрозрачные спрайты, разбегаются вперёд по dir и вверх, растут и тают
  const dust = [];
  for (let i = 0; i < nDust; i++) {
    const s = sprite(g, softTex(), { blending: THREE.NormalBlending, color: new THREE.Color(dustColor[0] * (.85 + .3 * r()), dustColor[1] * (.85 + .3 * r()), dustColor[2] * (.85 + .3 * r())) });
    const v = V(r() - .5, r() * .7, r() - .5).normalize().multiplyScalar(.8).add(D.clone().multiplyScalar(.6 + r() * .9)).multiplyScalar((1.2 + r() * 2.2) * scale);
    dust.push({ s, v, sc: (.7 + r() * .9) * scale, d: r() * .12, o: .55 + r() * .3, rot: (r() - .5) * 1.5 });
  }
  // обломки: камни по баллистике
  const debris = [], dm = new THREE.MeshStandardMaterial({ color: debrisColor, roughness: 1, flatShading: true });
  for (let i = 0; i < nDebris; i++) {
    const c = new THREE.Mesh(STONES[i % 4], dm), k = .03 + r() * r() * .12; c.scale.set(k * (.7 + r() * .6), k * (.5 + r() * .5), k * (.7 + r() * .6)); c.castShadow = true;
    const v = V(r() - .5, r() * .9 + .1, r() - .5).normalize().add(D.clone().multiplyScalar(.5 + r())).multiplyScalar((2.5 + r() * 5) * scale);
    c.userData = { v, spin: V(r(), r(), r()).multiplyScalar(9) }; g.add(c); debris.push(c);
  }
  g.visible = false;
  return {
    group: g, light: L,
    setAge(age) {
      g.visible = age >= 0 && age < life; if (!g.visible) return;
      const flash = Math.exp(-age * 11);
      if (L) L.intensity = 60 * scale * flash;
      core.visible = age < .35; core.scale.setScalar((1.2 + 9 * clamp(age / .12)) * scale); core.material.opacity = flash;
      for (const d of dust) {
        const a = age - d.d; d.s.visible = a > 0; if (!d.s.visible) continue;
        const k = (1 - Math.exp(-2.6 * a)) / 2.6;                                  // быстрый разлёт с торможением
        d.s.position.copy(pos).addScaledVector(d.v, k); d.s.position.y += .25 * a * scale;
        d.s.scale.setScalar(d.sc * (.6 + 3.2 * (1 - Math.exp(-2.4 * a))) * (1 + curtain * 3 * smooth(a / .6)));
        d.s.material.rotation = d.rot * a;
        d.s.material.opacity = d.o * smooth(a / .06) * (1 - smooth((a - life * .45) / (life * .5)));
      }
      for (const c of debris) {
        const k = 1.1, p = pos.clone().addScaledVector(c.userData.v, (1 - Math.exp(-k * age)) / k); p.y -= 4.9 * age * age;
        c.visible = p.y > -.2; c.position.copy(p); c.rotation.set(c.userData.spin.x * age, c.userData.spin.y * age, c.userData.spin.z * age);
      }
    },
    // пылевая завеса поверх ВСЕГО кадра, включая персонажей (слой [4]): k = 0..1 — насколько кадр закрыт.
    // Основа перехода «пыль закрыла кадр -> новая локация»: в уходящей сцене k растёт до 1, в приходящей падает до 0.
    veil2D(ctx, stage, k, t = 0, color = '214,196,168') {
      if (k <= .003) return;
      const { W, H } = stage, r2 = rng(seed + 77);
      ctx.save(); ctx.globalAlpha = Math.min(1, k * 1.15); ctx.fillStyle = `rgba(${color},${(.55 + .45 * k).toFixed(3)})`; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 9; i++) {                                  // клубы: крупные мягкие пятна, медленно ползут вверх
        const x = r2() * W, y = (r2() * 1.3 - .15) * H - t * (30 + 50 * r2()), rad = (.28 + .3 * r2()) * W * (.7 + .5 * k), dk = r2() < .5;
        const gr = ctx.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, dk ? 'rgba(150,128,100,.34)' : 'rgba(244,234,214,.38)'); gr.addColorStop(1, dk ? 'rgba(150,128,100,0)' : 'rgba(244,234,214,0)');
        ctx.fillStyle = gr; ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
      }
      ctx.restore();
    },
    // белая засветка всего кадра в первые кадры (слой [4]); peak — максимум непрозрачности
    flash2D(ctx, stage, age, peak = .85) {
      if (age < 0 || age > .3) return;
      const a = peak * Math.exp(-age * 14);
      ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#FFF3D2'; ctx.fillRect(0, 0, stage.W, stage.H); ctx.restore();
    },
  };
}
