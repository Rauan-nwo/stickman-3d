// billboard.js: плоский персонаж в 3D-мире. Актёр = рисунок (Stickman) + 3D-якорь. Каждый кадр якорь проецируется на экран,
// рисунок масштабируется по перспективе (метры -> пиксели на глубине якоря), доворачивается по крену камеры и рисуется
// вектором на выходной канвас ПОСЛЕ 3D-окружения: сцена его не освещает, туман и bloom на него не ложатся.
//
//   const hero = new Actor(stage, miner(), { pin: 'chest' }).at(V(0, 1.113, 0));
//   в chars(t): hero.draw(pose)                      — нарисовать;  drawActors([a, b]) — несколько, дальние первыми
//   hero.toLocal(worldPoint)                         — 3D-точка в координатах фигуры (кисть на 3D-ружье)
//   occlude: true                                    — декорация перед героем закрывает его (попиксельно, по глубине)
//   blobShadow(set.group, { pos, size })             — мягкая тень-пятно на полу (часть слоя окружения)
import * as THREE from 'three';
import { softTex } from '../core/textures.js';
import { drawLit } from './light.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

export class Actor {
  // pin: имя точки из spec.pins ('feet' | 'chest' | 'seat') или [x, y] в координатах фигуры — она садится на 3D-якорь
  constructor(stage, char, { unit, pin = 'feet', occlude = false, bias = .12, shadow = null, light = null } = {}) {
    this.light = light;                                          // необязательный свет сцены (light.js); null — как раньше
    this.stage = stage; this.char = char; this.unit = unit ?? char.spec.unit ?? .002;
    this.pin = Array.isArray(pin) ? pin : (char.spec.pins && char.spec.pins[pin]) || [0, 0];
    this.occlude = occlude; this.bias = bias; this.pos = V(0, 0, 0); this.shadow = shadow; this.visible = true;
  }
  // мировая позиция якоря; тень (если есть) идёт за героем
  at(p) { this.pos.copy(p); if (this.shadow && this.shadow.userData.follow) { const o = this.shadow.userData.offset; this.shadow.position.set(p.x + o.x, this.shadow.userData.y ?? p.y + o.y, p.z + o.z); } return this; }
  // экранное преобразование: { x, y, s (пикселей на единицу рисунка), rot, d (глубина, м) }
  xf() {
    const st = this.stage, [x, y, d] = st.project(this.pos), [x2, y2] = st.project(this.pos.clone().add(V(0, .2, 0)));
    return { x, y, s: st.pxs() / d * this.unit, rot: Math.atan2(x2 - x, -(y2 - y)), d };
  }
  // мировая точка -> координаты фигуры
  toLocal(p, xf = this.xf()) {
    const [sx, sy] = this.stage.project(p), dx = (sx - xf.x) / xf.s, dy = (sy - xf.y) / xf.s, c = Math.cos(-xf.rot), s = Math.sin(-xf.rot);
    return [dx * c - dy * s + this.pin[0], dx * s + dy * c + this.pin[1]];
  }
  // произвольный рисунок в координатах фигуры: fn(ctx)
  with(fn, xf = this.xf()) {
    const run = ctx => { ctx.save(); ctx.translate(xf.x, xf.y); ctx.rotate(xf.rot); ctx.scale(xf.s, xf.s); ctx.translate(-this.pin[0], -this.pin[1]); fn(ctx); ctx.restore(); };
    if (this.occlude) this.stage.drawOccluded(this.pos, run, this.bias); else run(this.stage.ctx);
    return xf;
  }
  // нарисовать героя в позе; opt.only = 'base' | 'front' — отдельные проходы (например, руки поверх 3D-пропса не нужны, а поверх 2D — нужны)
  draw(pose, opt, xf = this.xf()) {
    if (!this.visible || xf.d <= 0.05) return xf;
    const L = (opt && opt.light) || this.light;
    if (L && !this.occlude) {                                    // свет сцены: фигура рисуется во внеэкранный слой и подсвечивается
      const st = this.stage;
      drawLit(st.ctx, st.W, st.H, xf.s, x => { x.save(); x.translate(xf.x, xf.y); x.rotate(xf.rot); x.scale(xf.s, xf.s); x.translate(-this.pin[0], -this.pin[1]); this.char.draw(x, pose, opt); x.restore(); }, L);
      return xf;
    }
    return this.with(ctx => this.char.draw(ctx, pose, opt), xf);
  }
}
// несколько актёров в одном кадре: дальние рисуются первыми. items = [[actor, pose, opt], ...] или [{ actor, pose, opt }]
export function drawActors(items) {
  const list = items.map(it => (Array.isArray(it) ? { actor: it[0], pose: it[1], opt: it[2] } : it)).map(it => ({ ...it, xf: it.actor.xf() }));
  list.sort((a, b) => b.xf.d - a.xf.d);
  for (const it of list) it.actor.draw(it.pose, it.opt, it.xf);
}
// мягкая тень-пятно на полу под плоским героем. size = [вдоль, поперёк] в метрах, rot — поворот вокруг вертикали.
// follow: тень двигается вместе с актёром (actor.shadow = blobShadow(...)), offset — смещение от якоря.
export function blobShadow(parent, { pos = V(0, 0, 0), size = [.7, .2], rot = 0, opacity = .5, follow = false, offset = V(0, 0, 0), y } = {}) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: softTex(), color: 0x000000, transparent: true, opacity, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.rotation.z = rot; m.scale.set(size[0], size[1], 1); m.position.copy(pos); parent.add(m);
  m.userData = { follow, offset, y };
  return m;
}
