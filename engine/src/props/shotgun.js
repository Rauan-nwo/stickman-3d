// shotgun.js: двустволка-переломка из примитивов для крупных планов (слой FG, рисуется поверх 2D-персонажа).
// Координаты ружья: +x вдоль стволов к дульному срезу, начало — казённик; barrels вращается вокруг шарнира HINGE
// (barrels.rotation.z < 0 — стволы «переломлены»). На общем плане то же ружьё — 2D-рисунок (chars/props2d.js gun2D).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { procMaterial, wood, ENGRAVE } from '../sets/kit.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

export function createShotgun(stage, { scale = .97 } = {}) {
  const envTex = stage.envTex;
  const gun = new THREE.Group();
  const barrels = new THREE.Group(); gun.add(barrels);
  const HINGE = V(.10, -.047, 0); barrels.position.copy(HINGE);
  const blued = new THREE.MeshStandardMaterial({ color: 0x1a1b22, roughness: .36, metalness: .9, envMap: envTex, envMapIntensity: .8 });
  const darkSteel = new THREE.MeshStandardMaterial({ color: 0x33353d, roughness: .45, metalness: .85, envMap: envTex, envMapIntensity: .9 });
  const silver = procMaterial({ color: 0xffffff, roughness: .38, metalness: .85, envMap: envTex, envMapIntensity: .42 }, ENGRAVE, true);
  const gunWood = procMaterial({ color: 0xffffff, roughness: .34, metalness: 0, envMap: envTex, envMapIntensity: .25 }, wood('vec3(1.2,14.,14.)', '.15,.05,.022', '.36,.14,.06'), true);
  const ringGold = new THREE.MeshStandardMaterial({ color: 0xf2cc1e, roughness: .3, metalness: .3, emissive: 0x8a7400, emissiveIntensity: .8, envMap: envTex, envMapIntensity: .5 });
  const BL = 1.05, BR0 = .0275, BR1 = .021, BZ = .0295;
  {
    const B = (m, x, y, z) => { m.position.set(x - HINGE.x, y - HINGE.y, z); barrels.add(m); return m; };      // place in gun coords, parented to the barrels
    for (const z of [-BZ, BZ]) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(BR1, BR0, BL, 28, 1, true), blued); b.rotation.z = -Math.PI / 2; B(b, BL / 2, 0, z);
      const inner = new THREE.Mesh(new THREE.CylinderGeometry(BR1 * .8, BR0 * .74, BL, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0x050404, side: THREE.BackSide })); inner.rotation.z = -Math.PI / 2; B(inner, BL / 2, 0, z);
      const ring = new THREE.Mesh(new THREE.RingGeometry(BR0 * .9, BR0 * 1.1, 36), ringGold); ring.rotation.y = -Math.PI / 2; B(ring, -.0015, 0, z);
      const ringT = new THREE.Mesh(new THREE.TorusGeometry(BR0 * 1.04, .0028, 8, 36), ringGold); ringT.rotation.y = Math.PI / 2; B(ringT, -.001, 0, z);
      const muz = new THREE.Mesh(new THREE.RingGeometry(BR1 * .66, BR1 * 1.04, 28), new THREE.MeshStandardMaterial({ color: 0x9aa3b8, roughness: .35, metalness: .9, envMap: envTex, envMapIntensity: 1.1, emissive: 0x30343c })); muz.rotation.y = Math.PI / 2; B(muz, BL + .001, 0, z);
    }
    B(new THREE.Mesh(new THREE.BoxGeometry(BL - .02, .012, .016), blued), BL / 2, BR0 * .78, 0);                 // top rib
    B(new THREE.Mesh(new THREE.BoxGeometry(BL - .02, .018, .02), blued), BL / 2, -BR0 * .5, 0);                   // bottom rib
    B(new THREE.Mesh(new THREE.BoxGeometry(.012, .02, .016), darkSteel), -.004, -.012, 0);                       // extractor
    B(new THREE.Mesh(new THREE.BoxGeometry(.105, .035, .05), darkSteel), .055, -.045, 0);                        // barrel lump
    const fore = new THREE.Mesh(new RoundedBoxGeometry(.34, .04, .082, 3, .016), gunWood); B(fore, .31, -.044, 0);
    B(new THREE.Mesh(new THREE.SphereGeometry(.007, 8, 6), ringGold), BL - .025, BR0 + .012, 0);                 // bead
  }
  { // receiver: blocky engraved-silver parts, top lever, two hammers, side plates, trigger guard, wooden stock
    const G = (m, x, y, z) => { m.position.set(x, y, z); gun.add(m); return m; };
    G(new THREE.Mesh(new RoundedBoxGeometry(.145, .1, .128, 3, .012), silver), -.0725, -.012, 0);                // action body
    G(new THREE.Mesh(new THREE.BoxGeometry(.125, .03, .095), silver), .06, -.077, 0);                            // action bar under the barrels
    for (const z of [-.045, .045]) { const f = new THREE.Mesh(new THREE.SphereGeometry(.027, 16, 12), silver); f.scale.set(1.2, .9, .85); G(f, -.022, .03, z); }   // fences
    const lever = new THREE.Group(); G(lever, -.05, .046, 0); lever.rotation.y = .1;
    const lv = new THREE.Mesh(new RoundedBoxGeometry(.15, .012, .026, 2, .005), silver); lv.position.set(-.075, 0, 0); lever.add(lv);
    const lvp = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, .016, 18), silver); lever.add(lvp);
    const thumb = new THREE.Mesh(new RoundedBoxGeometry(.05, .016, .042, 2, .006), silver); thumb.position.set(-.15, .003, 0); lever.add(thumb);
    const screw = new THREE.Mesh(new THREE.CylinderGeometry(.008, .008, .02, 10), darkSteel); lever.add(screw);
    for (const z of [-.075, .075]) {                                                                              // hammers
      const hm = new THREE.Group(); G(hm, -.085, .0, z);
      const body = new THREE.Mesh(new RoundedBoxGeometry(.04, .075, .016, 2, .006), darkSteel); body.position.set(0, .02, 0); body.rotation.z = .25; hm.add(body);
      const spur = new THREE.Mesh(new THREE.TorusGeometry(.04, .0085, 8, 16, 1.5), darkSteel); spur.position.set(-.04, .05, 0); spur.rotation.z = .3; hm.add(spur);
      const pad = new THREE.Mesh(new RoundedBoxGeometry(.03, .012, .024, 2, .004), darkSteel); pad.position.set(-.075, .078, 0); pad.rotation.z = -.5; hm.add(pad);
      const pl = new THREE.Shape(); pl.moveTo(-.02, .035); pl.lineTo(-.2, .02); pl.quadraticCurveTo(-.32, 0, -.2, -.03); pl.lineTo(-.02, -.055); pl.closePath();
      const plg = new THREE.ExtrudeGeometry(pl, { depth: .008, bevelEnabled: false }); plg.translate(0, 0, -.004);
      G(new THREE.Mesh(plg, silver), -.05, -.005, z * .86);                                                       // lock plate
    }
    G(new THREE.Mesh(new RoundedBoxGeometry(.24, .01, .03, 2, .004), silver), -.25, .037, 0).rotation.z = .045;   // top tang
    const tg = new THREE.Mesh(new THREE.TorusGeometry(.05, .007, 6, 24, Math.PI), silver); tg.rotation.z = Math.PI; G(tg, -.13, -.062, 0);
    G(new THREE.Mesh(new THREE.BoxGeometry(.008, .04, .012), darkSteel), -.13, -.08, 0).rotation.z = .3;
    const sh = new THREE.Shape(); sh.moveTo(-.1, .022); sh.lineTo(-.4, .012); sh.quadraticCurveTo(-.7, -.012, -.95, -.04); sh.lineTo(-.93, -.25); sh.quadraticCurveTo(-.6, -.12, -.34, -.062); sh.quadraticCurveTo(-.2, -.045, -.1, -.045); sh.closePath();
    const sg = new THREE.ExtrudeGeometry(sh, { depth: .05, bevelEnabled: true, bevelThickness: .012, bevelSize: .012, bevelSegments: 4, curveSegments: 14 }); sg.translate(0, 0, -.025);
    G(new THREE.Mesh(sg, gunWood), 0, 0, 0);
    G(new THREE.Mesh(new THREE.BoxGeometry(.02, .26, .09), new THREE.MeshStandardMaterial({ color: 0x1c1310, roughness: .8 })), -.955, -.15, 0).rotation.z = -.07;
  }
  gun.scale.setScalar(scale); stage.fg(gun);
  return {
    group: gun, barrels, HINGE, BL, BR0, BR1, BZ, mats: { blued, darkSteel, silver, gunWood, ringGold },
    // поза: pos [x,y,z], yaw (вокруг y), rz (дуло вверх +), open (рад, - = стволы опущены), recoil (м, откат назад)
    pose({ pos, yaw = 0, rz = 0, open = 0, recoil = 0 }) {
      gun.position.set(pos[0], pos[1], pos[2]);
      gun.rotation.set(0, yaw, rz + recoil * 1.2, 'YXZ');
      gun.translateX(-recoil);
      barrels.rotation.z = open;
      gun.updateMatrixWorld(true);
    },
    // точки в мире: казённик ближнего ствола, ось ствола наружу из казённика, дульный срез, место хвата цевья
    chamber: () => barrels.localToWorld(V(-HINGE.x, -HINGE.y, BZ)),
    chamberAxis(chamber) { return barrels.localToWorld(V(-HINGE.x - 1, -HINGE.y, BZ)).sub(chamber).normalize(); },
    muzzle: (off = .02) => barrels.localToWorld(V(BL - HINGE.x + off, -HINGE.y, 0)),
    foreGrip: () => barrels.localToWorld(V(.36 - HINGE.x, -.075 - HINGE.y, .0)),
    local: (x, y, z) => gun.localToWorld(V(x, y, z)),
  };
}
