// index.js: всё, что нужно фильму. В film.js пишите  import { ... } from 'engine';
// (tools/build.mjs подставляет этот файл вместо имени 'engine', так что путь к движку в фильме не нужен).
import * as THREE from 'three';
export { THREE };
export const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ядро
export { defineFilm, runFilm } from './core/film.js';
export { createStage, DEFAULT_LOOK, FG } from './core/stage.js';
export { timeline } from './core/timeline.js';
export { clamp, lerp, seg, smooth, E, spring, keys, step } from './core/ease.js';
export { rng, h3, vn3, fbm3, hash, hash01, noise1 } from './core/rng.js';
export { NOISE } from './core/noise.js';
export { canvasTex, glowTex, softTex } from './core/textures.js';
export { points, sprite } from './core/particles.js';

// камера
export { look, place, blend, keyed, withMods, handheld, shake, rackFocus, fwdOf, splineState, aimState, pushIn, pullBack, creep, whip, track, orbit, sequence } from './camera.js';

// декорации
export * as kit from './sets/kit.js';
export { mineShaft } from './sets/mineShaft.js';
export { mineGallery } from './sets/mineGallery.js';

// персонажи
export { elbowIK, elbowArm } from './chars/stickman.js';
export { Stickman, drawStickman, EMO, EMOTIONS, MOUTHS, BIG_MOUTHS, SMALL_MOUTHS, TALK_SET, feel, act, poseSeq, tweenPose, talk, talkMouth, blinkAt, CLOTHES, HATS, ell, line, hose, beanPath, drawHand } from './chars/stickman.js';
export { miner, buddy, richGuy, expert, PRESETS, MINER, BUDDY, C as CHAR_COLORS } from './chars/presets.js';
export { Actor, drawActors, blobShadow } from './chars/billboard.js';
export { drawLit } from './chars/light.js';
export { unUpper, restHand, shoulder, arcHand, gestureEnv, gesture } from './chars/arms.js';
export { jensen, alice, detective, moneyman, reporter, LONG_PRESETS, LONG, noirShade } from './chars/presetsLong.js';
export { gun2D, gun2DPoint, sandwich, nugget2D, chairBack } from './chars/props2d.js';

// 3D-пропсы
export { createShotgun } from './props/shotgun.js';
export { createNugget, nuggetGeo, goldBright, goldDeep } from './props/nugget.js';

// эффекты
export { lightCone } from './vfx/lightCone.js';
export { dustMotes } from './vfx/dustMotes.js';
export { dustBurst } from './vfx/dustBurst.js';
export { sparkles, sparkBurst } from './vfx/sparks.js';
export { muzzleFlash, glint } from './vfx/muzzleFlash.js';
export { glowTrail, shockRings } from './vfx/glowTrail.js';
export { impactDecal } from './vfx/impactDecal.js';
export { explosion } from './vfx/explosion.js';
export { screenShake, shakeOffset } from './vfx/screenShake.js';

// 2D-шаблоны кадров «Стикман Нуар» (карточки, цифра, карта, доска, документ, плашка, титул главы)
export { templates, blackCard, chapterTitle, lowerThird, bigNumber, noirMap, mapProjection, board, documentShot, NOIR, NOIR_FONT, PLACES, MAP_VIEWS } from './templates/index.js';
