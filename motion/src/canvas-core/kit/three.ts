// THREE: draw a frame in WebGL with three.js and keep every frame a pure function of its number.
//
// A study builds its scene ONCE (cached in env.cache, like any texture) and then, every frame, sets every animated
// property (positions, rotations, scales, morphs, colours, light levels, the camera) from the frame number before it
// renders. Nothing may carry over between frames: no THREE.Clock, AnimationMixer, physics step, OrbitControls,
// Math.random or "previous frame" state. Seek to frame 173 cold and it must draw exactly what playing to it draws.
//
// The WebGL canvas is composited onto the frame's 2D context, so the rest of the kit (grain, captions, blur passes)
// still works on top of it. No image, model or HDR files: geometry comes from three's primitives (spheres, capsules,
// lathes, tubes, extrusions) and light from the procedural RoomEnvironment, so the piece stays code all the way down.
//
// Determinism, measured 2026-10-02 (spike, headless Chromium, no extra flags): identical frame hashes on 4 pages in
// each of 2 browsers, and repeated golden runs SAME. Prove it again for every 3D piece with
// `node tools/determinism.mjs <piece>` (post-processing passes and new material features can change the answer).
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { Ctx, Env } from "../core";

export { THREE };

export type Stage3 = {
  canvas: OffscreenCanvas;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  /** render the scene and draw it onto the frame */
  render: (ctx: Ctx) => void;
};

export type StageOptions = {
  /** vertical field of view in degrees (a longer lens flatters characters: 25 to 35) */
  fov?: number;
  /** scene background colour; omit for a transparent canvas the 2D frame shows through */
  background?: string;
  /** strength of the procedural room light that every physical material reflects (0 turns it off) */
  environment?: number;
  /** ACES (contrasty, filmic), AgX (softer highlights) or Neutral; exposure multiplies it */
  tone?: "aces" | "agx" | "neutral";
  exposure?: number;
  /** soft shadows from any light with castShadow (PCF soft) */
  shadows?: boolean;
};

const TONES = {
  aces: THREE.ACESFilmicToneMapping,
  agx: THREE.AgXToneMapping,
  neutral: THREE.NeutralToneMapping,
} as const;

/**
 * The study's WebGL stage, built once per size and cached under `key`. `build` adds the scene's objects and returns
 * the handles the frame will animate; it runs once, so it may be as slow as it likes.
 */
export function stage3<T>(
  env: Env,
  key: string,
  W: number,
  H: number,
  opts: StageOptions,
  build: (s: Stage3) => T,
): Stage3 & T {
  const hit = env.cache.get(key) as (Stage3 & T) | undefined;
  if (hit) return hit;
  const canvas = new OffscreenCanvas(W, H);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, alpha: true });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = TONES[opts.tone ?? "aces"];
  renderer.toneMappingExposure = opts.exposure ?? 1;
  renderer.shadowMap.enabled = opts.shadows ?? true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  if (opts.background) scene.background = new THREE.Color(opts.background);
  if ((opts.environment ?? 1) > 0) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = opts.environment ?? 1;
    pmrem.dispose();
  }
  const camera = new THREE.PerspectiveCamera(opts.fov ?? 30, W / H, 0.05, 200);
  const s: Stage3 = {
    canvas,
    renderer,
    scene,
    camera,
    render: (ctx) => {
      renderer.render(scene, camera);
      ctx.drawImage(canvas, 0, 0, W, H);
    },
  };
  const out = Object.assign(s, build(s));
  env.cache.set(key, out);
  return out;
}

/**
 * A three-point rig in the warm, soft way feature animation lights a character: a warm key that casts the only
 * shadow, a cool sky/ground fill so nothing goes black, and a rim from behind that separates the silhouette from the
 * set. Returns the lights so a frame can animate their levels (a flash on the hit, a dim before it).
 */
export function softRig(
  scene: THREE.Scene,
  o: {
    key?: string;
    fill?: string;
    ground?: string;
    rim?: string;
    target?: THREE.Vector3;
    keyAt?: [number, number, number];
    rimAt?: [number, number, number];
    shadowMap?: number;
    /** half-size of the key's shadow frustum: fit it to the set so the shadow stays sharp */
    shadowSpan?: number;
  } = {},
) {
  const target = o.target ?? new THREE.Vector3(0, 0.6, 0);
  const key = new THREE.DirectionalLight(o.key ?? "#fff1de", 2.6);
  key.position.set(...(o.keyAt ?? [3.5, 6, 4]));
  key.target.position.copy(target);
  key.castShadow = true;
  key.shadow.mapSize.set(o.shadowMap ?? 2048, o.shadowMap ?? 2048);
  key.shadow.radius = 5;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  const span = o.shadowSpan ?? 4;
  Object.assign(key.shadow.camera, { left: -span, right: span, top: span, bottom: -span, near: 0.5, far: 30 });
  const fill = new THREE.HemisphereLight(o.fill ?? "#cfe0ff", o.ground ?? "#f1d8bd", 0.9);
  const rim = new THREE.DirectionalLight(o.rim ?? "#ffe6c7", 1.8);
  rim.position.set(...(o.rimAt ?? [-3, 3.5, -5]));
  rim.target.position.copy(target);
  scene.add(key, key.target, fill, rim, rim.target);
  return { key, fill, rim };
}
