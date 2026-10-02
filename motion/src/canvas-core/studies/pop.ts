// STUDY 64 · POP (4 s, 60 fps, a seamless loop). The first Seconds study drawn in 3D with three.js: Pip, an invented
// little creature, lands a hop, spots a soap bubble drifting down, crouches, springs and boops it with the sprout on
// its head. The bubble pops on the downbeat of bar 2 (frame 120); Pip lands in a giggling double bounce, a new bubble
// floats down, and an excited hop lands on frame 240 = frame 0.
// One source, designed for square (the hero) and vertical (a low camera looking up the tall frame).
// Brief: series/studies/briefs/pop.json · prompt: series/studies/prompts/pop.prompt.md
// Learns from the twelve basic principles of animation
// (https://en.wikipedia.org/wiki/Twelve_basic_principles_of_animation); no film, character or design is reproduced.
//
// How it is drawn. kit/three.ts builds the WebGL stage once per size; every frame sets every animated property from
// the frame number (pose, face, sprout, bubble, droplets, lights, camera) and renders, so any frame drawn cold is the
// frame playing reaches. Two passes fake a long lens's depth of field: the wall, the props and the whole tabletop are
// rendered small, blurred on 2D canvases (halved down, doubled back up, as Frost does) and fed back to the second
// pass as its background texture; the second pass draws the near tabletop sharp, Pip and the bubble over it. (The
// brief asks for a transparent character pass composited on top; feeding the blur in as the background gives the
// same picture and lets the bubble's transmission refract the blurred wall instead of an empty canvas.)
//
// The animation is closed form: the hops are exact parabolas under one gravity, squash and stretch keep volume
// (y by s, x and z by 1/√s), stretch in the air follows the speed, and every secondary motion (the sprout's whip, the
// leaves, the cheeks) is a sum of damped sines started at the known landings and take-offs, windowed so it reaches
// rest before it wraps. The face is keyed on a periodic monotone spline, so frame 240 equals frame 0.
import PACK from "../../../brand/packs/studio/pack.json";
import { rng, type Ctx, type Env, type Layer } from "../core";
import type { Film, Shot } from "../film";
import { clamp, lerp } from "../kit/motion";
import { usePack } from "../kit/pack";
import { beatScore } from "../kit/score";
import { layout, type Size } from "../kit/sizes";
import { THREE, softRig, stage3 } from "../kit/three";

const P = usePack(PACK),
  C = P.palette("pip");
const FPS = 60,
  BPM = 120,
  N = 240, // two bars: a beat is 30 frames, bar 2's downbeat (the pop) is frame 120
  TAU = Math.PI * 2;
// the story, in frames (shots on the beat grid)
const T = { spot: 0, crouch: 60, pop: 120, hop: 180 };

// ---------------------------------------------------------------- closed-form helpers
const mod = (f: number, n = N) => ((f % n) + n) % n;
const ss = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
type Keys = readonly (readonly [number, number])[];
/** a periodic monotone cubic through [frame, value] keys spanning 0..N (first and last value equal) */
function curve(keys: Keys) {
  const ext = [
    ...keys.slice(-4, -1).map(([f, v]) => [f - N, v] as const),
    ...keys,
    ...keys.slice(1, 4).map(([f, v]) => [f + N, v] as const),
  ];
  const n = ext.length,
    xs = ext.map((k) => k[0]),
    ys = ext.map((k) => k[1]),
    d: number[] = [],
    m: number[] = [];
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1]! - ys[i]!) / (xs[i + 1]! - xs[i]!));
  for (let i = 0; i < n; i++) {
    if (i === 0 || i === n - 1) {
      m.push(0);
      continue;
    }
    const d0 = d[i - 1]!,
      d1 = d[i]!,
      h0 = xs[i]! - xs[i - 1]!,
      h1 = xs[i + 1]! - xs[i]!;
    m.push(d0 * d1 <= 0 ? 0 : (3 * (h0 + h1)) / ((2 * h1 + h0) / d0 + (h1 + 2 * h0) / d1));
  }
  return (F: number) => {
    const f = mod(F);
    let lo = 0,
      hi = n - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (xs[mid]! <= f) lo = mid;
      else hi = mid;
    }
    const h = xs[hi]! - xs[lo]!,
      t = (f - xs[lo]!) / h,
      t2 = t * t,
      t3 = t2 * t;
    return (
      (2 * t3 - 3 * t2 + 1) * ys[lo]! +
      (t3 - 2 * t2 + t) * h * m[lo]! +
      (-2 * t3 + 3 * t2) * ys[hi]! +
      (t3 - t2) * h * m[hi]!
    );
  };
}
/** the sum of damped sines started at each [frame, amplitude] event, wrapped round the loop and windowed to rest
 * 150 frames after its start (so the previous loop's tail is exactly what this loop inherits) */
function ring(F: number, events: Keys, hz: number, decay: number, delay = 0) {
  let v = 0;
  for (const [f, a] of events) {
    const tau = mod(F - f - delay),
      t = tau / FPS;
    v += a * Math.sin(TAU * hz * t) * Math.exp(-t / decay) * (1 - ss(110, 150, tau));
  }
  return v;
}

// ---------------------------------------------------------------- the body's motion
// Hops: [take-off, landing] frames. One gravity for every hop, so the big jump and the giggle bounces feel like one
// creature. The big jump peaks 4 frames after the pop, so the sprout is still rising when it touches the bubble.
const AIR: Keys = [
  [108, 140],
  [146, 162],
  [164, 174],
  [220, 240],
];
const GRAV = 15.3, // units/s²
  K_STRETCH = 0.045; // stretch per unit/s of speed in the air
const sOut = (a: number, b: number) => 1 + K_STRETCH * GRAV * ((b - a) / FPS / 2); // stretch at take-off/landing
const S_BIG = sOut(108, 140),
  S_B1 = sOut(146, 162),
  S_B2 = sOut(164, 174),
  S_HOP = sOut(220, 240);
function airAt(F: number) {
  for (const [a, b] of AIR)
    if (F > a && F < b) {
      const T0 = (b - a) / FPS,
        t = (F - a) / FPS;
      return { y: (GRAV / 2) * t * (T0 - t), v: GRAV * (T0 / 2 - t) };
    }
  return null;
}
// squash on the ground: the landing squash, the overshoot, the pre-pulse crouch on beat 3, the long wind-up and
// the launch; each ground stretch starts and ends on the air stretch at its landing and take-off
const SQUASH = curve([
  [0, S_HOP],
  [3, 0.8],
  [7, 1.0],
  [11, 1.05],
  [16, 0.985],
  [22, 1.0],
  [26, 0.95],
  [30, 1.06],
  [34, 0.985],
  [38, 1.012],
  [44, 1.0],
  [50, 0.996],
  [55, 1.025],
  [60, 0.8],
  [65, 0.875],
  [72, 0.862],
  [80, 0.838],
  [86, 0.805],
  [90, 0.768],
  [93, 0.784],
  [98, 0.74],
  [102, 0.705],
  [106, 0.68],
  [108, S_BIG],
  [140, S_BIG],
  [143, 0.62],
  [146, S_B1],
  [162, S_B1],
  [163, 0.84],
  [164, S_B2],
  [174, S_B2],
  [176, 0.88],
  [180, 1.04],
  [185, 0.99],
  [189, 1.0],
  [191, 0.9],
  [193, 1.06],
  [196, 0.9],
  [198, 1.06],
  [201, 0.99],
  [205, 1.0],
  [209, 1.025],
  [215, 0.84],
  [218, 0.82],
  [220, S_HOP],
  [240, S_HOP],
]);
// the head: a nod on each landing, tipping back to watch the bubble (after the eyes), upright for the boop
const PITCH = curve([
  [0, -0.04],
  [5, 0.03],
  [13, -0.06],
  [27, -0.1],
  [42, -0.2],
  [58, -0.22],
  [63, -0.14],
  [86, -0.18],
  [90, -0.06],
  [94, -0.19],
  [98, -0.2],
  [105, -0.29],
  [109, -0.04],
  [114, 0.0],
  [120, 0.02],
  [123, -0.13],
  [128, -0.04],
  [140, 0.0],
  [144, 0.15],
  [150, -0.02],
  [166, 0.06],
  [176, 0.03],
  [184, 0.0],
  [196, -0.17],
  [216, -0.19],
  [222, -0.1],
  [232, -0.09],
  [240, -0.04],
]);
const YAW = curve([
  [0, 0],
  [116, 0],
  [240, 0],
]);
// the eyes lead: they dart up a beat before the head follows, and come back to camera for the landings
const EYE_UP = curve([
  [0, 0.42],
  [13, 0.42],
  [19, 0.55],
  [40, 0.42],
  [58, 0.42],
  [104, 0.5],
  [110, 0.6],
  [118, 0.6],
  [120, 0.17],
  [125, 0.18],
  [131, 0.4],
  [136, 0.2],
  [140, 0],
  [176, 0],
  [181, 0.62],
  [200, 0.6],
  [214, 0.45],
  [230, 0.42],
  [240, 0.42],
]);
// eyelids: 0 open, 1 shut (below 0 is wide). The giggle squints happily (the lower lids rise into ^ ^); the hop and
// the landing on frame 0 keep the eyes open and bright; the two blinks are quick (about 7 frames)
const LID = curve([
  [0, -0.06],
  [8, -0.03],
  [15, 0.06],
  [20, -0.08],
  [21, 0.1],
  [22, 1.0],
  [24, 1.0],
  [25, 0.15],
  [27, -0.05],
  [44, 0.04],
  [56, 0.1],
  [59, 0.12],
  [60, 1.0],
  [63, 1.0],
  [64, 0.18],
  [66, 0.08],
  [104, 0.06],
  [108, 0.08],
  [117, 0.0],
  [119, 0],
  [120, -0.35],
  [126, -0.35],
  [132, -0.2],
  [138, 0.0],
  [143, 0.05],
  [176, 0.05],
  [180, -0.22],
  [186, -0.12],
  [194, -0.1],
  [210, 0.0],
  [216, 0.08],
  [222, -0.06],
  [240, -0.06],
]);
// (a blink shuts in two frames, holds two and opens in four; the giggle lifts the lower lids into laughing arcs)
const LID_LO = curve([
  [0, 0.1],
  [9, 0],
  [59, 0],
  [60, 0.3],
  [63, 0.3],
  [64, 0.04],
  [66, 0],
  [141, 0],
  [142, 1.0],
  [174, 1.0],
  [176, 1.0],
  [177, 0.35],
  [179, 0.05],
  [180, 0],
  [214, 0],
  [222, 0.1],
  [240, 0.1],
]);
const BROW_UP = curve([
  [0, 0.9],
  [6, 0.5],
  [19, 0.75],
  [50, 0.5],
  [57, 0.05],
  [62, -0.3],
  [104, -0.38],
  [109, 0.1],
  [117, 0.3],
  [119, 0.3],
  [120, 1.2],
  [128, 1.2],
  [134, 0.95],
  [142, 0.7],
  [148, 1.0],
  [176, 1.0],
  [180, 1.4],
  [194, 1.0],
  [214, 0.8],
  [232, 0.65],
  [240, 0.9],
]);
const BROW_KNIT = curve([
  [0, 0],
  [56, 0],
  [62, 1],
  [84, 0.8],
  [90, 1.35],
  [95, 0.7],
  [104, 1],
  [110, 0],
  [119, 0],
  [120, 0.4],
  [122, 0],
  [240, 0],
]);
// the mouth: a closed smile (its curve: 1 a smile, 0 flat), a round 'o', and an open grin
const SMILE = curve([
  [0, 1],
  [56, 1],
  [62, 0.8],
  [104, 0.8],
  [110, 0.55],
  [119, 0.55],
  [126, 0.7],
  [240, 1],
]);
const MOUTH_O = curve([
  [0, 0],
  [16, 0],
  [23, 0.38],
  [44, 0.32],
  [54, 0],
  [119, 0],
  [120, 0.75],
  [122, 1.0],
  [134, 0.9],
  [138, 0.3],
  [142, 0],
  [178, 0],
  [181, 0.35],
  [192, 0],
  [240, 0],
]);
const GRIN = curve([
  [0, 0.75],
  [8, 0.2],
  [14, 0],
  [136, 0],
  [142, 1],
  [174, 1],
  [178, 0.1],
  [181, 0],
  [186, 0],
  [196, 0.7],
  [210, 0.6],
  [220, 0.85],
  [240, 0.75],
]);
const BLUSH = curve([
  [0, 0.9],
  [20, 0.6],
  [136, 0.6],
  [144, 1],
  [182, 1],
  [196, 1],
  [206, 0.8],
  [220, 0.9],
  [240, 0.9],
]);
// arms: raise (0 hanging) and swing back (the wind-up)
const ARM = curve([
  [0, 1.25],
  [8, 0.5],
  [16, 0.32],
  [56, 0.32],
  [62, 0.18],
  [70, 0.32],
  [84, 0.36],
  [96, 0.08],
  [104, -0.02],
  [105, 0.02],
  [108, 1.3],
  [112, 2.55],
  [114, 2.72],
  [118, 2.5],
  [128, 2.3],
  [136, 1.2],
  [141, 0.55],
  [145, 1.0],
  [178, 0.6],
  [186, 0.6],
  [190, 1.3],
  [194, 0.7],
  [197, 1.4],
  [201, 0.7],
  [210, 0.4],
  [218, 0.3],
  [223, 1.5],
  [240, 1.25],
]);
const ARM_BACK = curve([
  [0, 0],
  [56, 0],
  [63, 0.4],
  [75, 0.7],
  [82, 0.5],
  [90, 0.72],
  [97, 0.62],
  [104, 0.78],
  [105, 0.75],
  [108, 0.2],
  [111, -0.25],
  [124, 0],
  [240, 0],
]);
// the camera: a slow push-in through the anticipation and a lift that follows the big jump three or four frames late
// (so the leap reads against the frame before the camera catches it), eased back by the wrap
const CAM_LIFT = curve([
  [0, 0.14],
  [28, 0],
  [104, 0],
  [112, 0.25],
  [126, 0.9],
  [133, 0.62],
  [139, 0.12],
  [146, 0.02],
  [156, 0],
  [200, 0],
  [232, 0.14],
  [240, 0.14],
]);
// the moments that set the secondary motion ringing: [frame, amplitude]
const LANDS: Keys = [
  [0, 0.5],
  [31, 0.22],
  [60, 0.28],
  [90, 0.2],
  [140, 1],
  [162, 0.45],
  [174, 0.32],
];
const TAKES: Keys = [
  [108, 0.75],
  [146, 0.4],
  [164, 0.3],
  [220, 0.4],
];
const BOOP: Keys = [[120, 1]];
const NEAR: Keys = [[38, 1]]; // the bubble passing just over the sprout
const bump = (F: number, at: number, w: number) => Math.exp(-(((F - at) / w) ** 2));
// the coil's weight shifts on the eighth notes (75, 90) and the sprout drawn back toward the launch
const SHIFT = (F: number) => bump(F, 75, 4) - bump(F, 90, 4);
const PULL = (F: number) => ss(78, 106, F) * (1 - ss(107, 111, F));
// the held arm poses: the hands-up hang through the pop and the fall, and the level arms of the excited hop
const HOLD = (F: number) => ss(112, 118, F) * (1 - ss(134, 138, F)) + ss(222, 226, F) * (1 - ss(236, 239.9, F));
const GIGGLE = (F: number) => ss(140, 146, F) * (1 - ss(170, 178, F)); // the giggle's envelope (a button at 176)
// the anticipation's quiver: the sprout trembles faster and harder as the take-off nears, gone by the launch
const QUIVER = (F: number) => ss(70, 82, F) * (1 - ss(103, 107, F)) * (0.45 + 0.55 * ss(70, 104, F));
// while Pip watches a drifting bubble (between the landings and the crouches) the sprout sways on its own breeze:
// a whole number of cycles per loop, windowed, so it is periodic
const IDLE = (F: number) => ss(8, 18, F) * (1 - ss(54, 60, F)) + ss(186, 196, F) * (1 - ss(210, 216, F));
// the giggle's three chirps (151, 157, 168): a short bump around each, for the laugh's head shake and cheek lift
const CHIRP = (F: number) => Math.max(...[151, 157, 168].map((f) => Math.exp(-(((F - f - 2) / 3.2) ** 2))));

// ---------------------------------------------------------------- the bubble's path
// A bubble enters above the frame on frame 150 (age 0) and pops on the sprout at age 210 (frame 120). Its height is
// keyed per size (design().bubbleY, units above the pop point); it sways on a slow figure that dies out exactly at
// the pop, so the sprout meets it dead centre.
const B_IN = 150,
  B_LIFE = 210;
const bubbleAge = (F: number) => mod(F - B_IN);
/** the bubble's sideways path, in units of its size's design().sway: it comes down on one side and hangs beside Pip,
 * crosses just over the sprout on 40 (the near miss), hangs on the other side, then drifts back to the middle as it
 * rises out of reach, dead centre at the pop */
const SWAY = curve([
  [0, 1.0],
  [20, 0.9],
  [28, 0.8],
  [40, 0],
  [52, -0.9],
  [60, -1.0],
  [64, -0.95],
  [80, -0.6],
  [100, -0.08],
  [110, 0],
  [120, 0],
  [150, 0.5],
  [176, 0.8],
  [196, 0.95],
  [218, 1.05],
  [240, 1.0],
]);
function bubbleSway(F: number) {
  const k = Math.min(1, bubbleAge(F) / B_LIFE);
  return {
    x: SWAY(F),
    z: 0.1 * Math.sin(TAU * k) * (1 - k),
  };
}

/** everything about Pip at frame F (pure) */
function pose(F: number) {
  F = mod(F);
  const air = airAt(F),
    y = air ? air.y : 0.038 * (bump(F, 193.5, 1.6) + bump(F, 198.5, 1.6)), // (two toe-bounces after the notice)
    s = air ? 1 + K_STRETCH * Math.abs(air.v) : SQUASH(F),
    g = GIGGLE(F),
    gt = (F - 140) / FPS,
    q = QUIVER(F) * Math.sin(TAU * 7 * (F / FPS));
  // the eyes follow the bubble's sway while they watch it; the head turns after them, six frames late
  const watch = (f: number) => clamp(EYE_UP(f) / 0.4),
    eyeX = 0.55 * bubbleSway(F).x * watch(F),
    headX = 0.3 * bubbleSway(F - 6).x * watch(F - 6),
    // and it tips its head toward the bubble's side, a few frames later still (a curious tilt)
    tilt = -0.11 * bubbleSway(F - 10).x * watch(F - 10),
    breeze = IDLE(F) * Math.sin(TAU * 1.5 * (F / FPS));
  // the sprout: a lean, whipped by every landing and take-off and bent hard by the boop; each of its six segments
  // answers about a frame after the one below it, so the wave travels up the stem
  const sprout = Array.from({ length: SEGS }, (_, k) => {
    const dl = k * 0.9;
    return {
      side:
        0.1 +
        0.07 * (1 + 0.25 * k) * QUIVER(F - dl) * Math.sin(TAU * 7 * ((F - dl) / FPS)) +
        0.14 * IDLE(F - 1.2 * dl) * Math.sin(TAU * 1.5 * ((F - 1.2 * dl) / FPS)) +
        0.42 * ring(F, LANDS, 3.0, 0.2, dl) -
        0.3 * ring(F, TAKES, 3.0, 0.18, dl) +
        0.55 * ring(F, BOOP, 3.4, 0.2, dl),
      fwd:
        0.06 -
        0.55 * PULL(F - dl) +
        0.32 * ring(F, LANDS, 2.6, 0.22, dl) +
        0.35 * ring(F, TAKES, 2.6, 0.2, dl) -
        0.45 * ring(F, BOOP, 3.0, 0.2, dl),
    };
  });
  const leaf =
    0.7 * ring(F, LANDS, 3.6, 0.16, 4) + 0.4 * ring(F, TAKES, 3.6, 0.16, 4) - 1.1 * ring(F, BOOP, 3.6, 0.2, 2);
  return {
    y,
    s,
    pitch: PITCH(F) + 0.05 * g * Math.sin(TAU * 7 * gt),
    yaw: YAW(F) + headX,
    roll:
      0.07 * g * Math.sin(TAU * 6 * gt) +
      0.03 * ring(F, LANDS, 2.2, 0.25) +
      tilt +
      0.07 * IDLE(F) * Math.sin(TAU * (F / FPS) + 0.5) + // a slow weight shift while it watches
      0.06 * CHIRP(F) * Math.sin(TAU * 6 * gt) + // a laughing shake on each chirp
      0.06 * SHIFT(F), // the coil's weight shifts
    eyeUp: EYE_UP(F),
    eyeX,
    converge: 0.22 * Math.exp(-(((F - 40) / 7) ** 2)), // the near miss on 40: the pupils cross a little
    lid: LID(F),
    lidLo: LID_LO(F),
    browUp: BROW_UP(F),
    knit: BROW_KNIT(F),
    smile: SMILE(F),
    o: MOUTH_O(F),
    grin: GRIN(F),
    blush: BLUSH(F),
    // (in units of 0.012: the chirps lift 0.02, and the grin after the notice lifts them for a moment)
    cheek: 0.6 * ring(F, LANDS, 4.2, 0.14, 1) + 1.7 * CHIRP(F) + 1.4 * ss(186, 196, F) * (1 - ss(212, 222, F)),
    pupil: 1 - 0.15 * ss(119, 120, F) * (1 - ss(123, 128, F)), // the pupils tighten in the flash
    iris: 1 - 0.13 * ss(119, 120, F) * (1 - ss(127, 135, F)), // and the irises shrink, so white rings them
    // the whole body trembles with the wind-up, harder toward the take-off
    jitter: 0.014 * QUIVER(F) * Math.sin(TAU * 9 * (F / FPS)),
    arm: ARM(F) + 0.45 * g * Math.sin(TAU * 8 * gt),
    armBack: ARM_BACK(F),
    // the other arm answers two frames late with a little less swing, so the arms never move as mirror twins
    armLag: 0.91 * (ARM(F - 2) + 0.45 * GIGGLE(F - 2) * Math.sin(TAU * 8 * ((F - 142) / FPS))),
    armBackLag: 0.91 * ARM_BACK(F - 2),
    airness: air ? Math.min(1, y / 0.12) : 0,
    sprout,
    leaf: leaf + 0.12 * q + 0.25 * breeze - 0.6 * ring(F, NEAR, 3.6, 0.15),
  };
}

// ---------------------------------------------------------------- the body's shape (a lathe profile)
const BODY = { yc: 0.42, hb: 0.42, ht: 0.58, r0: 0.44, zs: 0.94 };
const PROFILE: [number, number][] = []; // [r, y], bottom pole to top pole
for (let i = 0; i <= 96; i++) {
  const th = -Math.PI / 2 + (Math.PI * i) / 96,
    c = Math.max(0, Math.cos(th)),
    sn = Math.sin(th);
  const r = th < 0 ? BODY.r0 * c ** 0.78 : BODY.r0 * c * (1 - 0.1 * sn),
    yy = BODY.yc + (th < 0 ? BODY.hb : BODY.ht) * sn;
  PROFILE.push([i === 0 || i === 96 ? 0 : r, yy]);
}
const bodyR = (y: number) => {
  for (let i = 1; i < PROFILE.length; i++) {
    const [r1, y1] = PROFILE[i]!,
      [r0, y0] = PROFILE[i - 1]!;
    if (y <= y1) return lerp(r0, r1, (y - y0) / (y1 - y0 || 1));
  }
  return 0;
};
/** a point on the body's front at (x, y), and its outward normal */
function surf(x: number, y: number, out = 0) {
  const r = bodyR(y),
    dr = (bodyR(y + 0.002) - bodyR(y - 0.002)) / 0.004,
    z = BODY.zs * Math.sqrt(Math.max(0, r * r - x * x));
  const n = new THREE.Vector3(x, -r * dr, z / (BODY.zs * BODY.zs)).normalize();
  return { p: new THREE.Vector3(x, y, z).addScaledVector(n, out), n };
}
const faceTo = (o: THREE.Object3D, n: THREE.Vector3) =>
  o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n.clone().normalize());

// ---------------------------------------------------------------- per-size design
function design(size: Size) {
  const L = layout(size);
  return L.tall
    ? {
        ...L,
        // the tall frame: a low camera tilted up, the table's far edge about 78% down and the wall rising behind.
        // The camera barely follows the jump, so Pip rises through the frame. (projected, then measured on renders:
        // the feet stay above the 1600 px line through the crouch and the landing, and the bubble's top stays below
        // the 220 px band from the moment Pip notices it; the crouch push-in is half the square's, which is as deep
        // as those two lines allow)
        fov: 30,
        cam: new THREE.Vector3(0, 0.4, 7.4),
        look: new THREE.Vector3(0, 1.14, 0),
        lookY: curve([
          [0, 1.14],
          [240, 1.14],
        ]),
        lift: 0.05,
        // the push-in through the anticipation (half the square's: as deep as the two feed bands allow)
        camIn: curve([
          [0, 1],
          [30, 1],
          [60, 0.9875],
          [106, 0.94],
          [124, 0.94],
          [146, 0.965],
          [205, 0.9925],
          [240, 1],
        ]),
        sway: 0.5, // the bubble's sideways travel (units)
        // the bubble's height above the pop point: it falls in from above the frame on 150-190, then hovers with a
        // small bob while it drifts from side to side
        bubbleY: curve([
          [0, -0.155],
          [20, -0.16],
          [40, -0.14],
          [56, -0.12],
          [70, -0.09],
          [90, -0.035],
          [110, 0],
          [120, 0],
          [150, 1.9],
          [158, 0.85],
          [166, 0.2],
          [172, 0.1],
          [180, -0.02],
          [196, -0.12],
          [212, -0.14],
          [240, -0.155],
        ]),
        props: 1.25,
        win: [-1.7, 3.3] as const,
        feather: 0.15, // the bottom of the frame that is feathered out of focus (all near table)
      }
    : {
        ...L,
        // The watch is staged close: the bubble hangs beside Pip at crown height, nearly grazes the sprout on 40,
        // then escapes upward, which is what sends Pip into the crouch; the camera pulls back and up after it three or
        // four frames late (56-80), keeps a slow push-in through the wind-up, and comes back in as the new bubble
        // settles (176-204). (projected, then measured on renders: Pip's body about 37% of the frame through the
        // watch, the feet at most about 88% including the hop, the bubble's top clear of the edge at the near miss)
        fov: 30,
        cam: new THREE.Vector3(0, 0.6, 6.15),
        look: new THREE.Vector3(0, 1.2, 0),
        lookY: curve([
          [0, 0.95],
          [56, 0.95],
          [80, 1.22],
          [106, 1.2],
          [146, 1.2],
          [176, 1.15],
          [204, 0.95],
          [240, 0.95],
        ]),
        lift: 0.35,
        camIn: curve([
          [0, 0.83],
          [56, 0.83],
          [80, 0.95],
          [106, 0.88],
          [124, 0.88],
          [146, 0.93],
          [176, 0.95],
          [204, 0.83],
          [240, 0.83],
        ]),
        sway: 0.7,
        // the bubble's height above the pop point: beside the crown, the near miss on 40, the escape upward over
        // 64-110, and the new bubble falling in from above on 150-196
        bubbleY: curve([
          [0, -0.88],
          [20, -0.9],
          [28, -0.85],
          [40, -0.5],
          [52, -0.8],
          [60, -0.8],
          [64, -0.7],
          [100, -0.03],
          [110, 0],
          [120, 0],
          [150, 1.2],
          [176, 0.3],
          [196, -0.84],
          [240, -0.88],
        ]),
        props: 2.1,
        win: [-2.3, 2.9] as const,
        feather: 0.05,
      };
}

// ---------------------------------------------------------------- textures made in code
function blobTexture() {
  const n = 64,
    d = new Uint8Array(n * n * 4);
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      const x = (i + 0.5) / n - 0.5,
        y = (j + 0.5) / n - 0.5,
        r = Math.min(1, Math.hypot(x, y) * 2),
        v = Math.round(255 * (1 - r * r) ** 2.2);
      d.set([v, v, v, v], (j * n + i) * 4);
    }
  const t = new THREE.DataTexture(d, n, n);
  t.needsUpdate = true;
  return t;
}
/** the soap film's thickness (G channel, 0..1 of the 100-900 nm range): thicker toward the bottom where it drains,
 * with swirling bands that wrap seamlessly round the sphere's u; kept mostly in the 200-700 nm band where thin-film
 * colour is most vivid */
function swirlTexture() {
  const w = 256,
    h = 128,
    d = new Uint8Array(w * h * 4);
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const u = i / w,
        v = j / h, // 0 at the bottom pole, 1 at the top
        warp = 0.9 * Math.sin(TAU * (2 * u + 1.3 * v)) + 0.5 * Math.sin(TAU * (3 * u - 2.1 * v) + 1.7),
        band = 0.5 + 0.5 * Math.sin(TAU * (3 * u + 2.4 * v) + 3.2 * warp),
        t = clamp(0.14 + 0.36 * (1 - v) + 0.32 * band + 0.05 * Math.sin(TAU * (5 * u + 7 * v)));
      const g = Math.round(255 * t);
      d.set([g, g, g, 255], (j * w + i) * 4);
    }
  const t = new THREE.DataTexture(d, w, h);
  t.wrapS = THREE.RepeatWrapping;
  t.magFilter = t.minFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}
/** the bubble's own surroundings to reflect: a soft warm-to-cool room (equirectangular) with a few round soft lights,
 * so its film shows smooth swirls of colour instead of RoomEnvironment's rectangular panels */
function bubbleEnvTexture(env: Env) {
  const w = 512,
    h = 256,
    lay = env.canvas(w, h),
    c = lay.ctx;
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#4c5d7c");
  g.addColorStop(0.36, "#6f7480");
  g.addColorStop(0.5, "#8a7560");
  g.addColorStop(0.62, "#5e4433");
  g.addColorStop(1, "#2c1f17");
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  // a warm side and a cool side, wrapping in u
  const side = c.createLinearGradient(0, 0, w, 0);
  side.addColorStop(0, "rgba(120,160,255,0.22)");
  side.addColorStop(0.5, "rgba(255,170,100,0.2)");
  side.addColorStop(1, "rgba(120,160,255,0.22)");
  c.fillStyle = side;
  c.fillRect(0, 0, w, h);
  // round soft lights at [u, v (1 up), radius, colour, alpha]: the key (up, front right), the fill (up, front left),
  // a window behind, a warm bounce off the table and a few smaller glints; between them the room stays dim, so the
  // film is clear where it reflects the room and coloured where it reflects a light
  for (const [u, v, r, col, a] of [
    [0.68, 0.78, 80, "255,236,205", 1],
    [0.86, 0.66, 58, "205,225,255", 0.95],
    [0.13, 0.68, 64, "255,248,236", 0.9],
    [0.42, 0.58, 34, "255,255,255", 1],
    [0.56, 0.92, 40, "255,246,230", 0.9],
    [0.3, 0.8, 46, "235,240,255", 0.8],
    [0.75, 0.35, 70, "255,200,150", 0.6],
    [0.98, 0.5, 30, "255,255,255", 0.85],
  ] as const) {
    for (const du of [-1, 0, 1]) {
      const x = (u + du) * w,
        y = (1 - v) * h,
        rg = c.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, `rgba(${col},${a})`);
      rg.addColorStop(0.35, `rgba(${col},${a * 0.7})`);
      rg.addColorStop(1, `rgba(${col},0)`);
      c.fillStyle = rg;
      c.fillRect(x - r, y - r, 2 * r, 2 * r);
    }
  }
  const t = new THREE.CanvasTexture(lay.canvas as OffscreenCanvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.mapping = THREE.EquirectangularReflectionMapping;
  return t;
}
/** a soft ring (alpha), for the pop's mist */
function ringTexture() {
  const n = 128,
    d = new Uint8Array(n * n * 4);
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      const r = Math.hypot((i + 0.5) / n - 0.5, (j + 0.5) / n - 0.5) * 2,
        v = Math.round(255 * Math.exp(-(((r - 0.78) / 0.13) ** 2)) * (r < 1 ? 1 : 0));
      d.set([v, v, v, v], (j * n + i) * 4);
    }
  const t = new THREE.DataTexture(d, n, n);
  t.magFilter = t.minFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}
const PLANK = 0.5, // plank width in world units; the texture holds 8 planks over 4 units, so it repeats cleanly
  WOOD_SPAN = 4;
function woodTexture(env: Env) {
  const S = 1024,
    lay = env.canvas(S, S),
    c = lay.ctx,
    r = rng(6401),
    rows = WOOD_SPAN / PLANK,
    ph = S / rows,
    base = new THREE.Color(C.s2!),
    tone = (k: number) => {
      const col = base.clone();
      col.offsetHSL(0, 0, k);
      return `#${col.getHexString()}`;
    };
  for (let p = 0; p < rows; p++) {
    const y0 = p * ph,
      lift = (r() - 0.5) * 0.06;
    c.fillStyle = tone(lift);
    c.fillRect(0, y0, S, ph);
    // grain: long faint streaks along the plank, gently waving
    for (let k = 0; k < 70; k++) {
      const yy = y0 + r() * ph,
        amp = 1 + r() * 3,
        fr = 1 + Math.floor(r() * 3),
        phs = r() * TAU;
      c.beginPath();
      for (let x = 0; x <= S; x += 16) {
        const yv = yy + amp * Math.sin((TAU * fr * x) / S + phs);
        if (x === 0) c.moveTo(x, yv);
        else c.lineTo(x, yv);
      }
      c.strokeStyle = r() < 0.6 ? tone(lift - 0.06 - r() * 0.05) : tone(lift + 0.04);
      c.globalAlpha = 0.12 + r() * 0.2;
      c.lineWidth = 0.6 + r() * 1.6;
      c.stroke();
    }
    c.globalAlpha = 1;
    // an end joint somewhere along each plank
    const jx = Math.round(r() * S);
    c.fillStyle = tone(-0.2);
    c.globalAlpha = 0.5;
    c.fillRect(jx, y0, 2, ph);
    c.globalAlpha = 1;
    // the seam between planks: a dark groove and a lit lip under it
    c.fillStyle = tone(-0.24);
    c.fillRect(0, y0, S, 3);
    c.fillStyle = tone(0.06);
    c.globalAlpha = 0.6;
    c.fillRect(0, y0 + 3, S, 2);
    c.globalAlpha = 1;
  }
  const t = new THREE.CanvasTexture(lay.canvas as OffscreenCanvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}
/** a horizontal plane from z0 to z1 whose UVs follow world x and z, so two pieces of table share one grain */
function tablePlane(x0: number, x1: number, z0: number, z1: number) {
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0, 1, 1);
  g.rotateX(-Math.PI / 2);
  g.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
  const pos = g.attributes.position!,
    uv = g.attributes.uv!;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / WOOD_SPAN, -pos.getZ(i) / WOOD_SPAN);
  return g;
}

// ---------------------------------------------------------------- the stage
const lin = (hex: string) => new THREE.Color(hex);
const mix = (a: string, b: string, t: number) => new THREE.Color(a).lerp(new THREE.Color(b), t);
const WALL_Z = -3.6,
  SPLIT_Z = -2.0; // the near tabletop (sharp) ends on a plank seam; past it the table is in the blurred pass
const SEGS = 6, // the sprout's stem segments
  JOINT_MAX = 0.44; // the most one joint of the stem bends (radians)
const BUBBLE_R = 0.25,
  SINK = 0.05, // how far the bubble's end point sits down onto the sprout
  DROPS = 11, // the pop's iridescent beads
  HEROES = 4, // and its bigger beads, each with a glint
  RIM_FRAGS = 8; // the pieces the rim tears into
/** how far the tear has climbed the film (0 at the contact, 1 at the far pole) at frame F of the pop */
const openFrac = (F: number) => ss(119.6, 122.0, F);
const TEAR_N = new THREE.Vector3(0, Math.cos(0.7), Math.sin(0.7)); // the tear plane leans about 40° to the camera
/** the fractional frame the tear reaches height u on the film */
function openAt(u: number) {
  let lo = 119.6,
    hi = 122.0;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (openFrac(mid) < u) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
// the blurred pass is rendered at a quarter size, halved down to 1/32 and doubled back up to 1/4
const BG_DIV = 4,
  BG_LEVELS = [8, 16, 32];

function build(env: Env, size: Size, W: number, H: number) {
  const D = design(size);
  return stage3(
    env,
    `pop:${size}`,
    W,
    H,
    { fov: D.fov, environment: 0.1, tone: "aces", exposure: 1.0, shadows: true },
    ({ scene, renderer }) => {
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      // ---- shared light rig (both passes see the same light, so the table matches across the split)
      const rigOpts = {
        key: "#ffe9d2",
        fill: "#cfe2ff",
        ground: "#f3d6b8",
        rim: "#ffd9b0",
        keyAt: [2.4, 6.5, 5] as [number, number, number],
        rimAt: [-2.5, 2.2, -4.5] as [number, number, number],
        target: new THREE.Vector3(0, 0.6, 0),
        shadowSpan: 2.4,
      };
      const rig = softRig(scene, rigOpts);
      rig.key.intensity = 3.4;
      rig.fill.intensity = 0.36;
      rig.rim.intensity = 12;
      const bgScene = new THREE.Scene();
      bgScene.environment = scene.environment;
      bgScene.environmentIntensity = scene.environmentIntensity;
      const bgRig = softRig(bgScene, rigOpts);
      bgRig.key.castShadow = false;
      bgRig.key.intensity = 3.2;
      bgRig.fill.intensity = 0.5;
      bgRig.rim.intensity = 0;
      // a warm pool of light on the wall behind Pip
      const pool = new THREE.SpotLight("#ffd7a8", 60, 0, 0.5, 1, 2);
      pool.position.set(1.8, 4.5, 1.5);
      pool.target.position.set(-0.3, 1.6, WALL_Z);
      bgScene.add(pool, pool.target);

      // ---- the table: one wood texture; the near part sharp (it takes Pip's shadow), all of it in the blur
      const wood = woodTexture(env);
      const tableMat = new THREE.MeshPhysicalMaterial({
        map: wood,
        roughness: 0.52,
        clearcoat: 0.35,
        clearcoatRoughness: 0.32,
      });
      const near = new THREE.Mesh(tablePlane(-9, 9, SPLIT_Z, 9), tableMat);
      near.receiveShadow = true;
      scene.add(near);
      bgScene.add(new THREE.Mesh(tablePlane(-9, 9, WALL_Z, 9), tableMat));
      // ---- the wall and its props (blurred pass only)
      const wall = new THREE.Mesh(
        new THREE.PlaneGeometry(22, 14),
        new THREE.MeshStandardMaterial({ color: lin(C.ground), roughness: 0.95 }),
      );
      wall.position.set(0, 5, WALL_Z);
      bgScene.add(wall);
      // a window of soft sky to one side, so the bubble drifts across the warm wall and its pool of light
      const skyG = new THREE.PlaneGeometry(2.6, 2.6, 1, 8),
        skyC: number[] = [];
      const skyTop = mix(C.accent2, "#5aa6dc", 0.4).lerp(lin(C.ground), 0.2),
        skyLow = mix(C.accent2, C.surface, 0.6);
      for (let i = 0; i < skyG.attributes.position!.count; i++) {
        const k = skyG.attributes.position!.getY(i) / 2.6 + 0.5,
          col = skyLow.clone().lerp(skyTop, k);
        skyC.push(col.r, col.g, col.b);
      }
      skyG.setAttribute("color", new THREE.Float32BufferAttribute(skyC, 3));
      const sky = new THREE.Mesh(skyG, new THREE.MeshBasicMaterial({ vertexColors: true }));
      const [winX, winY] = D.win;
      sky.position.set(winX, winY, WALL_Z + 0.02);
      bgScene.add(sky);
      const frameMat = new THREE.MeshStandardMaterial({ color: lin(C.surface), roughness: 0.7 });
      for (const [w, h, x, yy] of [
        [2.9, 0.16, 0, 1.36],
        [2.9, 0.22, 0, -1.38],
        [0.16, 2.9, -1.37, 0],
        [0.16, 2.9, 1.37, 0],
        [0.09, 2.6, 0, 0],
        [2.6, 0.09, 0, 0.2],
      ] as const) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.12), frameMat);
        b.position.set(winX + x, winY + yy, WALL_Z + 0.06);
        bgScene.add(b);
      }
      // a potted plant and a stack of books at the back of the table, out of focus
      const px = D.props;
      const pot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.32, 0.25, 0.55, 32),
        new THREE.MeshStandardMaterial({ color: mix(C.surface, C.muted, 0.25), roughness: 0.6 }),
      );
      pot.position.set(px, 0.275, -3.0);
      bgScene.add(pot);
      const leafCol = mix("#56b04f", C.accent2, 0.22);
      const leafMatBg = new THREE.MeshStandardMaterial({ color: leafCol, roughness: 0.6 });
      const pr = rng(6402);
      for (let i = 0; i < 9; i++) {
        const l = new THREE.Mesh(new THREE.SphereGeometry(0.2 + pr() * 0.12, 16, 12), leafMatBg);
        l.position.set(px + (pr() - 0.5) * 0.7, 0.75 + pr() * 0.75, -3.0 + (pr() - 0.5) * 0.4);
        l.scale.set(1, 1.5, 0.6);
        bgScene.add(l);
      }
      const bookCols = [C.accent2, C.s1!, C.muted, C.surface];
      for (let i = 0; i < 4; i++) {
        const b = new THREE.Mesh(
          new THREE.BoxGeometry(0.9 - i * 0.06, 0.16, 0.6),
          new THREE.MeshStandardMaterial({ color: lin(bookCols[i]!), roughness: 0.7 }),
        );
        b.position.set(-px - 0.1 + i * 0.03, 0.08 + i * 0.16, -2.9);
        b.rotation.y = (i % 2 ? 0.08 : -0.06) + 0.2;
        bgScene.add(b);
      }

      // ---- Pip
      const root = new THREE.Group(); // at the feet: hop height, turn
      const squash = new THREE.Group(); // squash and stretch about the feet
      root.add(squash);
      scene.add(root);
      const skin = lin(C.accent);
      const bodyMat = new THREE.MeshPhysicalMaterial({
        color: skin,
        roughness: 0.45,
        clearcoat: 0.25,
        clearcoatRoughness: 0.4,
        sheen: 0.6,
        sheenRoughness: 0.5,
        sheenColor: mix(C.accent, "#fff0e0", 0.5),
        emissive: mix(C.accent, C.s1!, 0.5),
        emissiveIntensity: 0.05,
      });
      const U = {
        uBelly: { value: mix(C.surface, C.s1!, 0.06) },
        // a little warm light of its own, so the cool fill cannot grey the cream belly
        uBellyWarm: { value: lin("#fff1e0").multiplyScalar(0.09) },
        uBlush: { value: lin(C.s1!) },
        uBlushK: { value: 0.6 },
        uCheekY: { value: 0 },
      };
      const cheekL = surf(-0.275, 0.355).p,
        cheekR = surf(0.275, 0.355).p;
      bodyMat.onBeforeCompile = (sh) => {
        Object.assign(sh.uniforms, U);
        sh.vertexShader = sh.vertexShader
          .replace("#include <common>", "#include <common>\nvarying vec3 vObj;")
          .replace("#include <begin_vertex>", "#include <begin_vertex>\nvObj = position;");
        sh.fragmentShader = sh.fragmentShader
          .replace(
            "#include <common>",
            `#include <common>
varying vec3 vObj;
uniform vec3 uBelly; uniform vec3 uBellyWarm; uniform vec3 uBlush; uniform float uBlushK; uniform float uCheekY;
float gBelly;`,
          )
          .replace(
            "#include <color_fragment>",
            `#include <color_fragment>
{
  // the cream belly: an oval on the front, soft-edged
  vec2 b = vec2(vObj.x / 0.235, (vObj.y - 0.185) / 0.165);
  float belly = (1.0 - smoothstep(0.82, 1.0, length(b))) * smoothstep(0.0, 0.12, vObj.z);
  diffuseColor.rgb = mix(diffuseColor.rgb, uBelly, belly * 0.9);
  gBelly = belly;
  // rosy cheeks: two soft discs that jiggle on the landings
  vec3 cl = vec3(${cheekL.x.toFixed(4)}, ${cheekL.y.toFixed(4)} + uCheekY, ${cheekL.z.toFixed(4)});
  vec3 cr = vec3(${cheekR.x.toFixed(4)}, ${cheekR.y.toFixed(4)} + uCheekY, ${cheekR.z.toFixed(4)});
  float k = exp(-pow(length(vObj - cl) / 0.062, 2.0)) + exp(-pow(length(vObj - cr) / 0.062, 2.0));
  diffuseColor.rgb = mix(diffuseColor.rgb, uBlush, clamp(k, 0.0, 1.0) * uBlushK);
  // a touch darker and warmer toward the feet (soft bounce, no black)
  diffuseColor.rgb *= mix(0.86, 1.0, smoothstep(0.0, 0.35, vObj.y));
}`,
          )
          .replace(
            "#include <emissivemap_fragment>",
            "#include <emissivemap_fragment>\ntotalEmissiveRadiance += uBellyWarm * gBelly;",
          );
      };
      const lathe = new THREE.LatheGeometry(
        PROFILE.map(([r, yy]) => new THREE.Vector2(r, yy)),
        128,
      );
      lathe.rotateY(Math.PI); // the lathe's seam to the back
      lathe.scale(1, 1, BODY.zs);
      const body = new THREE.Mesh(lathe, bodyMat);
      body.castShadow = true;
      squash.add(body);
      const skinMat = new THREE.MeshPhysicalMaterial({
        color: skin,
        roughness: 0.45,
        clearcoat: 0.25,
        clearcoatRoughness: 0.4,
        sheen: 0.6,
        sheenRoughness: 0.5,
        sheenColor: mix(C.accent, "#fff0e0", 0.5),
        emissive: mix(C.accent, C.s1!, 0.5),
        emissiveIntensity: 0.05,
      });
      // the lower lids: warmed toward the cheek and lit a little from within, so the socket's shade can never turn
      // them into dark bags under the eyes
      const lowerMat = skinMat.clone();
      lowerMat.color = mix(C.accent, "#fff0e0", 0.16);
      lowerMat.emissive = mix(C.accent, "#ffe6d2", 0.5);
      lowerMat.emissiveIntensity = 0.2;
      const footMat = skinMat.clone();
      footMat.color = mix(C.accent, C.deep!, 0.12);

      // eyes: a glossy white, an iris and pupil that turn to look, two catchlights that stay with the light,
      // and lids (skin caps) that rotate down over the eye
      const EYE_R = 0.128;
      const whiteMat = new THREE.MeshPhysicalMaterial({
        color: lin("#fffaf2"),
        roughness: 0.2,
        clearcoat: 1,
        clearcoatRoughness: 0.04,
      });
      const irisMat = new THREE.MeshPhysicalMaterial({
        color: mix(C.deep!, C.s2!, 0.35),
        roughness: 0.3,
        clearcoat: 1,
        clearcoatRoughness: 0.05,
      });
      const pupilMat = new THREE.MeshPhysicalMaterial({
        color: lin(C.deep!).multiplyScalar(0.6),
        roughness: 0.25,
        clearcoat: 1,
        clearcoatRoughness: 0.05,
      });
      const lashMat = new THREE.MeshPhysicalMaterial({ color: mix(C.deep!, C.accent, 0.15), roughness: 0.5 });
      const glintMat = new THREE.MeshBasicMaterial({ color: "#ffffff", toneMapped: false });
      const cap = (r: number, a: number) => {
        const g = new THREE.SphereGeometry(r, 48, 16, 0, TAU, 0, a);
        g.rotateX(Math.PI / 2); // the cap's pole to +z (forward)
        return g;
      };
      const eyes = [-1, 1].map((side) => {
        const at = surf(side * 0.168, 0.465),
          grp = new THREE.Group();
        grp.position.copy(at.p).addScaledVector(at.n, -EYE_R * 0.5);
        faceTo(
          grp,
          at.n
            .clone()
            .multiplyScalar(0.35)
            .add(new THREE.Vector3(0, 0, 0.65)),
        );
        squash.add(grp);
        const white = new THREE.Mesh(new THREE.SphereGeometry(EYE_R, 48, 32), whiteMat);
        white.castShadow = true;
        const look = new THREE.Group();
        const pupil = new THREE.Mesh(cap(EYE_R * 1.008, 0.4), pupilMat);
        // (the iris and pupil sit in their own group, so a surprise can shrink them while keeping them on the eye)
        const irisGrp = new THREE.Group();
        irisGrp.add(new THREE.Mesh(cap(EYE_R * 1.004, 0.66), irisMat), pupil);
        look.add(irisGrp);
        grp.add(white, look);
        const glints = [
          { dir: new THREE.Vector3(0.38, 0.48, 0.8), r: 0.026 },
          { dir: new THREE.Vector3(-0.32, -0.26, 0.91), r: 0.012 },
        ].map(({ dir, r }) => {
          const m = new THREE.Mesh(new THREE.CircleGeometry(r, 24), glintMat);
          dir.normalize();
          m.position.copy(dir).multiplyScalar(EYE_R * 1.016);
          faceTo(m, dir);
          grp.add(m);
          return m;
        });
        const upper = new THREE.Mesh(new THREE.SphereGeometry(EYE_R * 1.03, 48, 16, 0, TAU, 0, Math.PI / 2), skinMat);
        const lower = new THREE.Mesh(
          new THREE.SphereGeometry(EYE_R * 1.025, 48, 16, 0, TAU, Math.PI / 2, Math.PI / 2),
          lowerMat,
        );
        // a lash line on the upper lid's rim, so a closed or squinting eye still reads at phone size
        const lash = new THREE.Mesh(new THREE.TorusGeometry(EYE_R * 1.03, 0.018, 6, 48, Math.PI), lashMat);
        lash.rotation.x = Math.PI / 2;
        upper.add(lash);
        grp.add(upper, lower);
        return { side, grp, look, irisGrp, pupil, upper, lower, glints };
      });
      // closed eyes: a shut eye is drawn as a lash arc lying on the face (the eyeball hides), so it reads as a flush
      // crescent, not a swollen lid: a U for a blink, an upturned ^ for the giggle's laughing squint
      const arc = (xc: number, f: (u: number) => number) => {
        const pts: THREE.Vector3[] = [];
        for (let i = 0; i <= 14; i++) {
          const u = -1 + (2 * i) / 14;
          pts.push(surf(xc + 0.1 * u, f(u), 0.006).p);
        }
        const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.014, 8, false), lashMat);
        m.visible = false;
        squash.add(m);
        return m;
      };
      const shutEyes = [-1, 1].map((side) => ({
        down: arc(side * 0.168, (u) => 0.448 + 0.034 * u * u),
        up: arc(side * 0.168, (u) => 0.492 - 0.044 * u * u),
      }));
      // brows: soft dark capsules that lift and knit
      const browMat = new THREE.MeshPhysicalMaterial({ color: mix(C.deep!, C.accent, 0.3), roughness: 0.5 });
      const brows = [-1, 1].map((side) => {
        const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.024, 0.075, 6, 12), browMat);
        m.geometry.rotateZ(Math.PI / 2);
        squash.add(m);
        return { side, m };
      });
      // the mouth: a smile tube, a round 'o' and an open grin, crossfaded by scale
      const mouthMat = new THREE.MeshPhysicalMaterial({ color: lin(C.deep!), roughness: 0.6 });
      const tongueMat = new THREE.MeshPhysicalMaterial({ color: mix(C.s1!, C.deep!, 0.25), roughness: 0.6 });
      const MOUTH_Y = 0.305,
        mAt = surf(0, MOUTH_Y, 0.004);
      const smilePts: THREE.Vector3[] = [];
      for (let i = 0; i <= 12; i++) {
        const x = -0.075 + (0.15 * i) / 12,
          yy = MOUTH_Y + 0.03 * (x / 0.075) ** 2;
        smilePts.push(surf(x, yy, 0.004).p.sub(mAt.p));
      }
      const smile = new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(smilePts), 32, 0.0145, 8, false),
        mouthMat,
      );
      smile.position.copy(mAt.p);
      squash.add(smile);
      const mouthO = new THREE.Group();
      mouthO.position.copy(mAt.p);
      faceTo(mouthO, mAt.n);
      const oDisc = new THREE.Mesh(new THREE.CircleGeometry(0.05, 40), mouthMat);
      const oTongue = new THREE.Mesh(new THREE.CircleGeometry(0.028, 32), tongueMat);
      oTongue.position.set(0, -0.022, 0.001);
      oTongue.scale.set(1, 0.6, 1);
      mouthO.add(oDisc, oTongue);
      squash.add(mouthO);
      const grinG = new THREE.Group();
      grinG.position.copy(surf(0, MOUTH_Y + 0.012, 0.004).p);
      faceTo(grinG, mAt.n);
      const grinDisc = new THREE.Mesh(new THREE.CircleGeometry(0.075, 40, Math.PI, Math.PI), mouthMat);
      const grinTongue = new THREE.Mesh(new THREE.CircleGeometry(0.04, 32, Math.PI, Math.PI), tongueMat);
      grinTongue.position.set(0, -0.028, 0.001);
      grinTongue.scale.set(1, 0.85, 1);
      grinG.add(grinDisc, grinTongue);
      squash.add(grinG);
      // arms: little nubs at the sides, hung from a shoulder pivot
      const arms = [-1, 1].map((side) => {
        const at = surf(side * 0.38, 0.27),
          piv = new THREE.Group();
        piv.position.copy(at.p);
        const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.11, 8, 16), skinMat);
        m.position.y = -0.085;
        m.castShadow = true;
        piv.add(m);
        squash.add(piv);
        return { side, piv };
      });
      // feet: soft ovals that stay on the table while the body squashes over them
      const feet = [-1, 1].map((side) => {
        const m = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), footMat);
        m.scale.set(0.115, 0.07, 0.15);
        m.castShadow = true;
        root.add(m);
        return { side, m };
      });
      // the sprout: three stem segments, each a child of the last, and two leaves at the tip
      const stemMat = new THREE.MeshPhysicalMaterial({
        color: mix("#5fae4a", C.accent2, 0.15),
        roughness: 0.5,
        sheen: 0.4,
      });
      const leafMat = new THREE.MeshPhysicalMaterial({
        color: leafCol,
        roughness: 0.42,
        sheen: 0.6,
        sheenColor: lin("#e8ffd8"),
        clearcoat: 0.3,
        side: THREE.DoubleSide,
      });
      const SEG = 0.216 / SEGS;
      const segs: THREE.Group[] = [];
      let parent: THREE.Object3D = squash;
      for (let k = 0; k < SEGS; k++) {
        const g = new THREE.Group();
        g.position.set(0, k === 0 ? 0.985 : SEG, k === 0 ? 0.0 : 0);
        const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.019, SEG * 1.02, 6, 12), stemMat);
        m.position.y = SEG / 2;
        m.castShadow = true;
        g.add(m);
        parent.add(g);
        segs.push(g);
        parent = g;
      }
      const tip = new THREE.Group();
      tip.position.y = SEG;
      parent.add(tip);
      const leafGeo = new THREE.SphereGeometry(1, 32, 16);
      {
        const p = leafGeo.attributes.position!;
        for (let i = 0; i < p.count; i++) {
          const u = p.getX(i) * 0.5 + 0.5, // 0 at the stem, 1 at the tip
            w = Math.sin(Math.PI * Math.min(1, u * 1.02)) ** 0.75 * (1 - 0.25 * u);
          p.setXYZ(i, u * 0.23, p.getY(i) * 0.016 * w + 0.07 * u * u, p.getZ(i) * 0.1 * w);
        }
        leafGeo.computeVertexNormals();
      }
      const leaves = [-1, 1].map((side) => {
        const piv = new THREE.Group();
        const m = new THREE.Mesh(leafGeo, leafMat);
        m.castShadow = true;
        piv.add(m);
        piv.rotation.y = side < 0 ? Math.PI : 0;
        tip.add(piv);
        return { side, piv };
      });

      // the soft contact shadow under the feet (tightens and darkens as Pip lands)
      const contact = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.MeshBasicMaterial({
          color: lin(C.deep!),
          alphaMap: blobTexture(),
          transparent: true,
          depthWrite: false,
        }),
      );
      contact.rotation.x = -Math.PI / 2;
      contact.position.y = 0.003;
      scene.add(contact);

      // ---- the bubble, its pop and the flash
      // the bubble and its droplets reflect their own soft room (a PMREM of a painted gradient with round lights)
      const pm = new THREE.PMREMGenerator(renderer);
      const bubbleEnv = pm.fromEquirectangular(bubbleEnvTexture(env)).texture;
      pm.dispose();
      const film = swirlTexture();
      renderer.localClippingEnabled = true; // the film tears open behind a clipping plane on the pop
      const clip = new THREE.Plane(new THREE.Vector3(0, 1, 0), 1000); // nothing clipped until then
      const bubbleMat = new THREE.MeshPhysicalMaterial({
        color: lin("#ffffff"),
        roughness: 0,
        metalness: 0,
        transmission: 1,
        thickness: 0.02,
        ior: 1.1,
        iridescence: 1,
        iridescenceIOR: 1.3,
        iridescenceThicknessRange: [100, 900],
        iridescenceThicknessMap: film,
        specularIntensity: 0.7,
        envMap: bubbleEnv,
        envMapIntensity: 1.9,
        side: THREE.DoubleSide,
        clippingPlanes: [clip],
        toneMapped: false,
      });
      // a bright Fresnel rim, so the film's edge reads against the wall at phone size
      bubbleMat.onBeforeCompile = (sh) => {
        sh.fragmentShader = sh.fragmentShader
          .replace(
            "#include <emissivemap_fragment>",
            `#include <emissivemap_fragment>
{
  float fr = 1.0 - abs(dot(normal, normalize(vViewPosition)));
  totalEmissiveRadiance += vec3(1.0, 0.97, 0.92) * (0.02 * fr * fr + 0.42 * pow(fr, 6.0));
}`,
          )
          .replace(
            "#include <opaque_fragment>",
            `{
  // a soft darker band just inside the bright edge, so the film separates from a pale wall at phone size
  float fd = 1.0 - abs(dot(normal, normalize(vViewPosition)));
  outgoingLight *= 1.0 - 0.32 * smoothstep(0.45, 0.8, fd) * (1.0 - smoothstep(0.86, 0.97, fd));
}
#include <opaque_fragment>`,
          );
      };
      const bubble = new THREE.Mesh(new THREE.SphereGeometry(BUBBLE_R, 64, 48), bubbleMat);
      scene.add(bubble);
      // the pop's droplets: tiny iridescent beads (tinted, half-transparent) and a few bigger ones with a specular
      // glint, each shed from a fragment of the retracting rim as it passes, thrown out radially on gravity arcs
      const drops = new THREE.InstancedMesh(
        new THREE.SphereGeometry(1, 10, 8),
        new THREE.MeshBasicMaterial({
          color: "#ffffff",
          transparent: true,
          opacity: 0.5,
          depthWrite: false,
          toneMapped: false,
        }),
        DROPS + HEROES,
      );
      drops.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      scene.add(drops);
      // each bigger bead's specular glint: a tiny untoned white dot up and to the right on its front
      const glints = new THREE.InstancedMesh(
        new THREE.SphereGeometry(1, 8, 6),
        new THREE.MeshBasicMaterial({ color: "#ffffff", toneMapped: false }),
        HEROES,
      );
      glints.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      scene.add(glints);
      const tints = [C.accent2, "#ff9ec8", "#7fe6f0", "#c9a6ff", "#ffe08a"];
      const dr = rng(6403);
      const dropDirs = Array.from({ length: DROPS + HEROES }, (_, i) => {
        const hero = i >= DROPS,
          u = 0.06 + 0.86 * dr(), // height on the film where it is shed: 0 the puncture, 1 the top
          th = Math.acos(1 - 2 * u),
          // shed from one of the rim's fragments (their centres are evenly spaced round it)
          ph = (TAU * (Math.floor(dr() * RIM_FRAGS) + 0.5 + 0.25 * (dr() - 0.5))) / RIM_FRAGS,
          n = new THREE.Vector3(Math.sin(th) * Math.cos(ph), -Math.cos(th), Math.sin(th) * Math.sin(ph));
        drops.setColorAt(i, mix("#ffffff", tints[i % tints.length]!, hero ? 0.1 : 0.45));
        return {
          hero,
          born: openAt(u), // the fractional frame the rim passes it
          n,
          // (thrown about one to two radii out before they fall)
          vel: n
            .clone()
            .multiplyScalar(1.1 + 0.7 * dr())
            .add(new THREE.Vector3(0, 0.35, 0)),
          r: hero ? 0.018 + 0.004 * dr() : 0.003 + 0.005 * dr(),
          life: 16 + 7 * dr(), // (all gone by 146)
        };
      });
      // the retracting rim: a thin ring riding the clipping plane, coloured along its length with the film's
      // thin-film hues; it fades in, tears into fragments (a mask by angle) and is gone when the plane reaches the top
      const rimG = new THREE.TorusGeometry(1, 0.01 / BUBBLE_R, 6, 120);
      {
        const cols: number[] = [],
          ang: number[] = [],
          pos = rimG.attributes.position!;
        for (let i = 0; i < pos.count; i++) {
          const a = mod(Math.atan2(pos.getY(i), pos.getX(i)) / TAU, 1),
            col = new THREE.Color().setHSL(mod(3 * a + 0.55, 1), 0.9, 0.6);
          cols.push(col.r, col.g, col.b);
          ang.push(a);
        }
        rimG.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));
        rimG.setAttribute("aAng", new THREE.Float32BufferAttribute(ang, 1));
      }
      rimG.rotateX(Math.PI / 2); // level, round the vertical axis
      const rimU = { uGap: { value: 0 } };
      const rimMat = new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        toneMapped: false,
      });
      rimMat.onBeforeCompile = (sh) => {
        Object.assign(sh.uniforms, rimU);
        sh.vertexShader = sh.vertexShader
          .replace("#include <common>", "#include <common>\nattribute float aAng;\nvarying float vAng;")
          .replace("#include <begin_vertex>", "#include <begin_vertex>\nvAng = aAng;");
        sh.fragmentShader = sh.fragmentShader
          .replace("#include <common>", "#include <common>\nvarying float vAng;\nuniform float uGap;")
          .replace(
            "#include <alphamap_fragment>",
            `#include <alphamap_fragment>
{
  // ${RIM_FRAGS} fragments with ragged gaps that widen as the film tears
  float f = vAng * ${RIM_FRAGS.toFixed(1)};
  float jag = fract(sin(floor(f) * 12.9898) * 43758.5453);
  if (fract(f + 0.2 * jag) > 1.0 - uGap * (0.7 + 0.6 * jag)) discard;
}`,
          );
      };
      const rim = new THREE.Mesh(rimG, rimMat);
      scene.add(rim);
      // a faint breath of light where the bubble was (additive, gone in a sixth of a second)
      const glow = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.MeshBasicMaterial({
          color: mix("#fff6e8", C.accent2, 0.15),
          alphaMap: blobTexture(),
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
        }),
      );
      scene.add(glow);
      // the pop's shape at phone size: a soft ring of mist that spreads from the film and fades over 121-123
      const mist = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.MeshBasicMaterial({
          color: lin("#f4fbff"),
          alphaMap: ringTexture(),
          transparent: true,
          depthWrite: false,
          toneMapped: false,
        }),
      );
      scene.add(mist);
      // the flash on Pip's face: a point light below and in front of the pop
      const hitLight = new THREE.PointLight("#fff4e6", 0, 2.5, 2);
      scene.add(hitLight);

      // ---- the blur chain for the background pass
      const bw = Math.round(W / BG_DIV),
        bh = Math.round(H / BG_DIV);
      const base = env.canvas(bw, bh);
      const down = BG_LEVELS.map((d) => env.canvas(Math.ceil(W / d), Math.ceil(H / d)));
      const up = BG_LEVELS.slice(0, -1).map((d) => env.canvas(Math.ceil(W / d), Math.ceil(H / d)));
      const out = env.canvas(bw, bh);
      const bgTex = new THREE.CanvasTexture(out.canvas as OffscreenCanvas);
      bgTex.colorSpace = THREE.SRGBColorSpace;
      bgTex.minFilter = THREE.LinearFilter;
      bgTex.generateMipmaps = false;
      scene.background = bgTex;
      // the near edge of the table, feathered out of focus in 2D (a long lens is soft in front of the subject too)
      const fh = Math.round(H * D.feather),
        feather = [1, 4, 10, 4].map((d) => env.canvas(Math.ceil(W / d), Math.max(1, Math.ceil(fh / d))));

      return {
        D,
        bgScene,
        root,
        squash,
        U,
        eyes,
        shutEyes,
        brows,
        smile,
        mouthO,
        grinG,
        arms,
        feet,
        segs,
        tip,
        leaves,
        contact,
        bubble,
        film,
        bodyMat,
        skinMat,
        drops,
        dropDirs,
        glints,
        mist,
        rim,
        rimMat,
        rimU,
        clip,
        glow,
        hitLight,
        base,
        down,
        up,
        out,
        bgTex,
        fh,
        feather,
        bw,
        bh,
        popAt: new THREE.Vector3(),
        ready: false,
      };
    },
  );
}
type Stage = ReturnType<typeof build>;

const M4 = new THREE.Matrix4(),
  Q = new THREE.Quaternion(),
  V3 = new THREE.Vector3(),
  S3 = new THREE.Vector3(),
  S4 = new THREE.Vector3(),
  S5 = new THREE.Vector3(),
  UP = new THREE.Vector3(0, 1, 0);

/** set Pip's whole pose for frame F */
function placePip(s: Stage, F: number) {
  const p = pose(F);
  s.root.position.set(p.jitter, p.y, 0);
  s.root.rotation.set(0, p.yaw, 0);
  const sq = 1 / Math.sqrt(p.s);
  s.squash.scale.set(sq, p.s, sq);
  s.squash.rotation.set(p.pitch, 0, p.roll, "YXZ");
  // eyes
  // the eyes keep most of their roundness through a squash (a cartoon convention: the face stays readable)
  const ek = 0.75,
    exz = lerp(1, Math.sqrt(p.s), ek),
    ey = lerp(1, 1 / p.s, ek);
  for (const e of s.eyes) {
    e.grp.scale.set(exz, ey, exz);
    e.look.rotation.set(-p.eyeUp, -e.side * (0.1 + p.converge) + p.eyeX, 0, "YXZ");
    // shrinking the iris in x and y would sink its edge into the eyeball, so it rides out a touch along the gaze
    e.irisGrp.scale.set(p.iris, p.iris, 1);
    e.irisGrp.position.z = 0.054 * (1 - p.iris); // (0.42 of the eye radius per unit of shrink)
    e.pupil.scale.set(p.pupil, p.pupil, 1);
    const lidA = lerp(-0.95, Math.PI / 2, clamp(p.lid - 0.42 * p.eyeUp * (1 - clamp(p.lid)), -0.09, 1)),
      loA = lerp(-0.95, Math.PI / 2, clamp(p.lidLo, 0, 1));
    e.upper.rotation.set(lidA, 0, 0);
    // the catchlights sit on the cornea: a closing lid hides them
    const shut = Math.max(clamp((p.lid - 0.15) / 0.2), clamp((p.lidLo - 0.25) / 0.2));
    for (const g of e.glints) {
      g.visible = shut < 0.999;
      g.scale.setScalar(1 - shut);
    }
    e.lower.rotation.set(-loA, 0, 0);
  }
  // fully shut: the lash arc replaces the eye (a blink shows a U; the giggle's lifted lower lids show a ^)
  const blinkShut = p.lid >= 0.93,
    laughShut = !blinkShut && p.lidLo >= 0.93;
  s.eyes.forEach((e, i) => {
    e.grp.visible = !blinkShut && !laughShut;
    s.shutEyes[i]!.down.visible = blinkShut;
    s.shutEyes[i]!.up.visible = laughShut;
  });
  // brows ride the surface above the eyes
  for (const b of s.brows) {
    const x = b.side * (0.17 - 0.014 * p.knit),
      yy = 0.635 + 0.08 * p.browUp - 0.012 * p.knit,
      at = surf(x, yy, 0.012);
    b.m.position.copy(at.p);
    faceTo(b.m, at.n);
    b.m.rotateZ(b.side * (0.34 * p.knit - 0.16 * p.browUp)); // (raised brows arch, inner ends up)
  }
  // mouth
  const open = Math.max(p.o, p.grin);
  // the closed smile shrinks away as any open mouth grows, gone before it can cross the 'o'
  const sk = clamp(1 - open / 0.35);
  s.smile.scale.set((1 + 0.15 * p.grin) * sk, Math.max(0.12, p.smile) * sk, 1);
  s.smile.visible = sk > 0.01;
  const oS = p.o * (1 - p.grin);
  s.mouthO.scale.set(0.55 + 0.45 * oS, 0.25 + 0.75 * oS, 1);
  s.mouthO.visible = oS > 0.02;
  s.grinG.scale.set(0.5 + 0.5 * p.grin, Math.max(0.01, p.grin), 1);
  s.grinG.visible = p.grin > 0.02;
  // cheeks
  s.U.uBlushK.value = 0.42 * p.blush;
  s.U.uCheekY.value = 0.012 * p.cheek;
  // arms
  // (a raise swings outward; the right arm runs a little behind the left, and on the held poses the left shoulder
  // rides higher and the right arm sags, so the silhouette is never a mirror image)
  const hold = HOLD(F);
  for (const a of s.arms) {
    const lag = a.side > 0,
      raise = lag ? p.armLag * (1 - 0.1 * hold) : p.arm + 0.1 * hold;
    a.piv.rotation.set(lag ? p.armBackLag : p.armBack, 0, a.side * (0.25 + raise), "XYZ");
  }
  // feet: spread under a squash, point down in the air
  for (const f of s.feet) {
    f.m.position.set(f.side * 0.17 * (1 + 0.6 * (1 - Math.min(1, p.s))), 0.058, 0.13);
    f.m.rotation.set(0.35 * p.airness, 0, -f.side * 0.15 * p.airness);
  }
  // sprout
  // each joint takes its share of the bend, capped at about 25 degrees; what a joint cannot take is carried into
  // the next one up, so the stem curves instead of kinking like a bent straw
  let carryF = 0,
    carryS = 0;
  s.segs.forEach((g, k) => {
    const b = p.sprout[k]!,
      share = k === 0 ? 0.3 : 0.46,
      f = b.fwd * share + carryF,
      sd = b.side * share + carryS,
      fc = clamp(f, -JOINT_MAX, JOINT_MAX),
      sc = clamp(sd, -JOINT_MAX, JOINT_MAX);
    carryF = f - fc;
    carryS = sd - sc;
    g.rotation.set(fc, 0, -sc);
  });
  for (const l of s.leaves) l.piv.rotation.set(0, l.side < 0 ? Math.PI : 0, 0.55 - p.leaf * 0.5 + 0.08 * l.side);
  // contact shadow
  const h = p.y;
  const cs = (0.95 + 0.9 * h) * (1 / Math.sqrt(p.s));
  s.contact.scale.set(cs, cs * 0.8, 1);
  s.contact.position.set(-0.05 - 0.2 * h, 0.003, 0.05 - 0.4 * h);
  (s.contact.material as THREE.MeshBasicMaterial).opacity = 0.55 * Math.exp(-h * 2.6);
}

/** the bubble's state: it enters above the frame on frame 150 (age 0) and pops on the sprout at age 210 (frame 120) */
function placeBubble(s: Stage, F: number, camera: THREE.PerspectiveCamera) {
  const age = bubbleAge(F),
    pa = s.popAt,
    tau = mod(F - T.pop),
    R = BUBBLE_R,
    opening = age >= B_LIFE ? openFrac(T.pop + tau) : 0;
  // round until the leaves touch it on 119; it dents over 119-120, and from 120 the film tears open at the contact
  // and its rim sweeps up over the bubble, gone by about 122.5
  s.bubble.visible = age <= B_LIFE + 1;
  const c = S3.set(pa.x, pa.y + R - SINK, pa.z);
  let sy = 1;
  if (s.bubble.visible) {
    const a = Math.min(age, B_LIFE),
      k = a / B_LIFE,
      t = a / FPS,
      held = age >= B_LIFE ? T.pop : F, // (the tearing film stays where it broke)
      sw = bubbleSway(held);
    // a closed-form wobble of the film (quieting as the sprout arrives), and the dent where the sprout pushes into
    // its bottom: it squashes the film about its bottom pole, so the contact stays on the leaves
    const w = (0.035 * Math.sin(TAU * 2.3 * t) + 0.018 * Math.sin(TAU * 3.7 * t + 1.3)) * (1 - ss(188, 204, a)),
      dent = 0.09 * ss(B_LIFE - 1, B_LIFE, a);
    sy = 1 - w - dent;
    s.bubble.scale.set(1 + w + dent * 0.5, sy, 1 + w * 0.6 + dent * 0.5);
    s.bubble.position.set(
      pa.x +
        s.D.sway * sw.x +
        0.028 * (1 + 0.8 * (ss(190, 200, F) + 1 - ss(10, 20, F))) * Math.sin((TAU * F) / 60) * (1 - ss(195, 208, a)),
      pa.y +
        R -
        SINK * ss(B_LIFE - 30, B_LIFE, a) +
        s.D.bubbleY(held) -
        dent * R +
        0.02 * Math.sin((TAU * F) / 80 + 0.7) * (1 - ss(195, 208, a)),
      pa.z + sw.z,
    );
    s.bubble.rotation.set(0.3 * Math.sin(TAU * k), TAU * k, 0);
    // the film's colour bands drift as it turns
    s.film.offset.set(0.6 * k, 0.15 * Math.sin(TAU * k));
  }
  // the tear: everything below the plane is gone; the plane (leaning toward the camera, so its torn edge reads as
  // a curve round the film) climbs from the contact to the far pole
  const bc = s.bubble.position,
    n = s.clip.normal.copy(TEAR_N),
    dPlane = n.dot(bc) - R * sy + 2 * R * sy * opening;
  s.clip.constant = opening > 0 ? -dPlane : 1000;
  // the rim fades in on 120 (faint, nearly whole), is torn into fragments on 121, and is gone at the pole
  s.rim.visible = opening > 0 && opening < 0.9;
  if (s.rim.visible) {
    const off = dPlane - n.dot(bc), // the plane's distance from the centre
      h = off / (R * sy), // -1 at the contact, 1 at the far pole
      rr = Math.max(0.002, R * Math.sqrt(Math.max(0, 1 - h * h)) * s.bubble.scale.x);
    s.rim.position.copy(bc).addScaledVector(n, off);
    s.rim.quaternion.setFromUnitVectors(UP, n);
    s.rim.scale.setScalar(rr);
    s.rimMat.opacity = 0.35 * ss(0, 0.25, opening);
    s.rimU.uGap.value = 0.08 + 0.6 * ss(0.15, 0.7, opening);
  }
  // droplets: shed from the rim as it passes, thrown out radially under Pip's own gravity; the beads stretch along
  // their flight for their first frames, the hero glints are stars that face the camera
  const live = tau < 27;
  s.drops.visible = live;
  s.glints.visible = live;
  if (live) {
    s.dropDirs.forEach((d, i) => {
      const since = T.pop + tau - d.born,
        t = Math.max(0, since) / FPS,
        swell = d.hero ? 1 + 0.5 * ss(121, 122, F) * (1 - ss(126, 128, F)) : 1, // (the hero beads read longer)
        r = since >= 0 ? d.r * swell * (1 - ss(0.55, 1, since / d.life)) : 0;
      V3.copy(c).addScaledVector(d.n, R).addScaledVector(d.vel, t);
      V3.y -= 0.5 * GRAV * t * t;
      // the velocity now, and a stretch along it that relaxes over the first four frames
      S5.copy(d.vel);
      S5.y -= GRAV * t;
      const stretch = 1 + 2.2 * (1 - clamp(since / 4));
      Q.setFromUnitVectors(UP, S5.normalize());
      M4.compose(V3, Q, S4.set(r, r * stretch, r));
      s.drops.setMatrixAt(i, M4);
      if (d.hero) {
        // its glint sits toward the camera and the key light
        V3.add(
          S4.copy(camera.position)
            .sub(V3)
            .normalize()
            .multiplyScalar(r * 0.8),
        ).add(S5.set(0.35 * r, 0.4 * r, 0));
        M4.compose(V3, Q.identity(), S4.setScalar(0.3 * r));
        s.glints.setMatrixAt(i - DROPS, M4);
      }
    });
    s.drops.instanceMatrix.needsUpdate = true;
    s.glints.instanceMatrix.needsUpdate = true;
  }
  // the mist ring: 1.3 to 2 radii over 121-124, fading out
  const mk = (tau - 1) / 3.5;
  s.mist.visible = tau >= 1 && tau <= 4;
  if (s.mist.visible) {
    s.mist.position.copy(c);
    s.mist.quaternion.copy(camera.quaternion);
    s.mist.scale.setScalar(2 * R * (1.3 + 0.7 * mk));
    (s.mist.material as THREE.MeshBasicMaterial).opacity = 0.38 * (1 - mk) ** 1.3;
  }
  // a faint breath of light, and the flash on Pip's face
  const gk = clamp(tau / 2);
  s.glow.visible = tau < 2;
  s.glow.position.copy(c);
  s.glow.scale.setScalar(R * (1.4 + 1.0 * gk));
  (s.glow.material as THREE.MeshBasicMaterial).opacity = 0.12 * (1 - gk) ** 2;
  s.hitLight.position.set(pa.x, pa.y - 0.6, pa.z + 0.7);
  s.hitLight.intensity = [0.75, 0.2, 0.05][tau] ?? 0; // a one-frame fill-light spike on Pip
  // the skin warms a touch in the flash (six frames)
  const glowSkin = 0.05 + 0.04 * (tau < 6 ? (1 - tau / 6) ** 2 : 0);
  s.bodyMat.emissiveIntensity = glowSkin;
  s.skinMat.emissiveIntensity = glowSkin;
}

function placeCamera(s: Stage, camera: THREE.PerspectiveCamera, F: number) {
  const D = s.D,
    k = D.camIn(F),
    lift = D.lift * CAM_LIFT(F),
    tau = mod(F - T.pop),
    t = tau / FPS,
    bump = tau < 50 ? Math.exp(-t / 0.11) * Math.sin(TAU * 4.5 * t + 1.3) * (1 - ss(30, 50, tau)) : 0;
  const lookY = D.lookY(F) + lift - 0.07 * bump;
  camera.position.set(D.cam.x, D.cam.y + lift * 0.6 + 0.06 * bump, D.cam.z * k);
  camera.lookAt(D.look.x, lookY, D.look.z);
  camera.fov = D.fov * (1 - 0.012 * bump);
  camera.updateProjectionMatrix();
}

export function make(size: Size, id: string): Film {
  const vignette = (env: Env) => {
    const key = `pop:vignette:${size}:${env.scale}`;
    let lay = env.cache.get(key) as Layer | undefined;
    if (lay) return lay.canvas;
    const w = Math.round(W * env.scale),
      h = Math.round(H * env.scale);
    lay = env.canvas(w, h);
    const g = lay.ctx.createRadialGradient(
      w / 2,
      h * 0.52,
      Math.min(w, h) * 0.35,
      w / 2,
      h * 0.52,
      Math.hypot(w, h) * 0.6,
    );
    const rgb = [1, 3, 5].map((i) => parseInt(C.deep!.slice(i, i + 2), 16)).join(",");
    g.addColorStop(0, `rgba(${rgb},0)`);
    g.addColorStop(1, `rgba(${rgb},0.22)`);
    lay.ctx.fillStyle = g;
    lay.ctx.fillRect(0, 0, w, h);
    env.cache.set(key, lay);
    return lay.canvas;
  };
  const D = design(size),
    { W, H } = D;
  const paint = (ctx: Ctx, env: Env, F: number) => {
    F = mod(F);
    const s = build(env, size, W, H);
    const { renderer, scene, camera, canvas } = s;
    if (!s.ready) {
      // where the sprout's tip is on the pop frame: the bubble's path ends exactly there
      placePip(s, T.pop);
      s.root.updateMatrixWorld(true);
      // (the leaves reach above the stem's tip: the bubble meets the highest point of the sprout)
      s.tip.getWorldPosition(s.popAt);
      s.popAt.y = new THREE.Box3().setFromObject(s.tip).max.y;
      s.ready = true;
    }
    placePip(s, F);
    placeCamera(s, camera, F);
    placeBubble(s, F, camera);
    s.glow.quaternion.copy(camera.quaternion);
    // pass 1: the set, small, then blurred on 2D canvases and handed to pass 2 as its background
    renderer.setViewport(0, 0, s.bw, s.bh);
    renderer.render(s.bgScene, camera);
    const step = (src: Layer["canvas"], sx: number, sy: number, sw: number, sh: number, dst: Layer) => {
      const c = dst.ctx;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.globalCompositeOperation = "copy";
      c.imageSmoothingEnabled = true;
      c.imageSmoothingQuality = "high";
      c.drawImage(src, sx, sy, sw, sh, 0, 0, dst.canvas.width, dst.canvas.height);
      c.globalCompositeOperation = "source-over";
    };
    step(canvas, 0, H - s.bh, s.bw, s.bh, s.base);
    let src: Layer = s.base;
    for (const d of s.down) {
      step(src.canvas, 0, 0, src.canvas.width, src.canvas.height, d);
      src = d;
    }
    for (let i = s.up.length - 1; i >= 0; i--) {
      step(src.canvas, 0, 0, src.canvas.width, src.canvas.height, s.up[i]!);
      src = s.up[i]!;
    }
    step(src.canvas, 0, 0, src.canvas.width, src.canvas.height, s.out);
    s.bgTex.needsUpdate = true;
    // pass 2: the near table, Pip and the bubble, sharp
    renderer.setViewport(0, 0, W, H);
    renderer.render(scene, camera);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.drawImage(canvas, 0, 0, W * env.scale, H * env.scale);
    // the near table's feathered blur: the bottom band down to a tenth and back up, faded in from its top edge
    {
      const [band, a, b, c] = s.feather as [Layer, Layer, Layer, Layer];
      step(canvas, 0, H - s.fh, W, s.fh, band);
      step(band.canvas, 0, 0, W, s.fh, a);
      step(a.canvas, 0, 0, a.canvas.width, a.canvas.height, b);
      step(b.canvas, 0, 0, b.canvas.width, b.canvas.height, c);
      step(c.canvas, 0, 0, c.canvas.width, c.canvas.height, band);
      const g = band.ctx.createLinearGradient(0, 0, 0, s.fh);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(0.45, "rgba(0,0,0,0.55)");
      g.addColorStop(1, "rgba(0,0,0,1)");
      band.ctx.globalCompositeOperation = "destination-in";
      band.ctx.fillStyle = g;
      band.ctx.fillRect(0, 0, W, s.fh);
      band.ctx.globalCompositeOperation = "source-over";
      ctx.drawImage(band.canvas, 0, (H - s.fh) * env.scale, W * env.scale, s.fh * env.scale);
    }
    // the pop's flash: a warm radial glow round the pop on 120 (a trace on 121), fading out above Pip's
    // face; the hit light does the face
    const tau = mod(F - T.pop);
    if (tau < 2) {
      const at = V3.copy(s.popAt).project(camera),
        x = ((at.x + 1) / 2) * W * env.scale,
        y = ((1 - at.y) / 2) * H * env.scale,
        r = 0.45 * H * env.scale,
        a = [0.1, 0.03][tau]!,
        g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(255,248,236,${a})`);
      g.addColorStop(0.4, `rgba(255,248,236,${a * 0.45})`);
      g.addColorStop(1, "rgba(255,248,236,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
      // and a small bright core where the film broke
      const rc = 0.08 * H * env.scale,
        gc = ctx.createRadialGradient(x, y - 0.3 * rc, 0, x, y - 0.3 * rc, rc);
      gc.addColorStop(0, `rgba(255,252,246,${2.6 * a})`);
      gc.addColorStop(1, "rgba(255,252,246,0)");
      ctx.fillStyle = gc;
      ctx.fillRect(x - rc, y - 1.3 * rc, 2 * rc, 2 * rc);
    }
    // a soft lens vignette (fixed, so it cannot seam)
    ctx.drawImage(vignette(env), 0, 0);
  };

  const cuts = [T.spot, T.crouch, T.pop, T.hop, N],
    names = ["spot", "crouch", "pop", "hop"];
  const shots: Shot[] = names.map((sid, i) => ({
    id: sid,
    start: cuts[i]!,
    end: cuts[i + 1]!,
    draw: (ctx, local, env) => paint(ctx, env, cuts[i]! + local),
  }));
  return {
    meta: { title: id, W, H, fps: FPS, bpm: BPM, durationFrames: N, raster: "cpu" },
    assets: { images: {} },
    shots,
    audio: score,
  };
}

// ---------------------------------------------------------------- sound
// The soft beat score as a quiet bed (key 3, tails wrapped), and Pip's own cues as pure, seeded samples: a rubbery
// boing on each take-off and landing, a glassy shimmer while a bubble drifts, a bright wet pop on 120, a giggle of
// three rising chirps after the landing. Every tail wraps, and the mix is re-normalised to about -16 LUFS.
const BASE_GAIN = 0.24,
  OUT = 0.57; // (about -2 dBTP after the AAC encode)
function score(sr: number): [Float32Array, Float32Array] {
  const [Lc, Rc] = beatScore({ frames: N, fps: FPS, bpm: BPM, mood: "soft", key: 3, loop: true, gain: BASE_GAIN })(sr);
  const n = Lc.length,
    at = (f: number) => Math.round((f / FPS) * sr),
    noise = rng(6464);
  // the bed ducks under the pop and breathes back in, reaching exactly 1 well before the wrap
  for (let i = at(T.pop); i < n; i++) {
    const t = (i - at(T.pop)) / sr,
      d = 1 - 0.6 * Math.exp(-t / 0.22) * (1 - ss(1.2, 1.8, t));
    Lc[i] = Lc[i]! * d;
    Rc[i] = Rc[i]! * d;
  }
  // and dips about 3 dB under the giggle (146-172), so the chirps and bounces sit on top of it
  for (let i = at(144); i < at(176); i++) {
    const F = (i / sr) * FPS,
      d = 1 - 0.3 * ss(144, 148, F) * (1 - ss(170, 175, F));
    Lc[i] = Lc[i]! * d;
    Rc[i] = Rc[i]! * d;
  }
  const add = (i: number, v: number, pan = 0.5) => {
    i = ((i % n) + n) % n;
    Lc[i] = Lc[i]! + v * (1 - pan) * 2 * 0.5;
    Rc[i] = Rc[i]! + v * pan * 2 * 0.5;
  };
  // a rubbery boing: a sine whose pitch springs (a fast drop and a decaying 14 Hz wobble); up = a take-off
  const boing = (f: number, f0: number, amp: number, dur: number, upward = false, pan = 0.5) => {
    const i0 = at(f);
    let ph = 0;
    for (let k = 0; k < Math.round(dur * sr); k++) {
      const t = k / sr,
        glide = upward ? 0.75 + 0.6 * (1 - Math.exp(-t / 0.05)) : 1 + 0.7 * Math.exp(-t / 0.018),
        wob = 1 + 0.13 * Math.exp(-t / 0.1) * Math.sin(TAU * 14 * t);
      ph += (f0 * glide * wob) / sr;
      const env = Math.min(1, t / 0.0025) * Math.exp(-t / (dur * 0.32)) * Math.min(1, (dur - t) / 0.02);
      add(i0 + k, (Math.sin(TAU * ph) + 0.3 * Math.sin(2 * TAU * ph)) * env * amp, pan);
    }
  };
  // landing on frame 0: a soft air swell written at negative indices (it wraps onto the end), then the boing on
  // sample 0
  {
    const len = Math.round(0.22 * sr);
    let a = 0,
      b = 0;
    for (let k = -len; k < 0; k++) {
      a += 0.12 * (noise() * 2 - 1 - a);
      b += 0.02 * (a - b);
      add(k, (a - b) * (1 + k / len) ** 2.5 * 0.5, 0.5);
    }
  }
  boing(0, 150, 0.55, 0.32);
  boing(T.crouch, 120, 0.57, 0.22); // the pre-pulse: a soft squish into the crouch
  boing(90, 112, 0.3, 0.16); // the second beat of the wind-up
  boing(108, 210, 0.5, 0.26, true); // the big take-off
  boing(140, 105, 0.68, 0.3); // the big landing (louder than the hop on 0, still well under the pop)
  boing(146, 230, 0.26, 0.18, true);
  boing(162, 160, 0.5, 0.22);
  boing(164, 260, 0.2, 0.14, true);
  boing(174, 170, 0.5, 0.24);
  boing(220, 240, 0.42, 0.2, true); // the excited hop
  // the wind-up: a faint rising whistle through the crouch, cut at the take-off
  {
    const i0 = at(66),
      i1 = at(108);
    let ph = 0;
    for (let i = i0; i < i1; i++) {
      const p = (i - i0) / (i1 - i0);
      ph += (420 + 380 * p * p) / sr;
      add(i, Math.sin(TAU * ph) * p ** 2 * 0.05 * Math.min(1, (i1 - i) / (0.01 * sr)), 0.45);
    }
  }
  // the POP: a short band-passed noise burst, a wet tail of lower band-passed noise (about a tenth of a second), a
  // sine blip that drops an octave, a soft low thump and the droplets' glitter (high partials, quickly gone)
  {
    const i0 = at(T.pop);
    let a = 0,
      b = 0,
      wa = 0,
      wb = 0,
      ph = 0;
    const a1 = 1 - Math.exp((-TAU * 6500) / sr),
      a2 = 1 - Math.exp((-TAU * 1600) / sr),
      w1 = 1 - Math.exp((-TAU * 3200) / sr),
      w2 = 1 - Math.exp((-TAU * 700) / sr);
    for (let k = 0; k < Math.round(0.5 * sr); k++) {
      const t = k / sr,
        nz = noise() * 2 - 1;
      a += a1 * (nz - a);
      b += a2 * (a - b);
      wa += w1 * (nz - wa);
      wb += w2 * (wa - wb);
      const wet = (wa - wb) * Math.min(1, t / 0.006) * Math.exp(-t / 0.06) * (1 - ss(0.2, 0.3, t)) * 2.4;
      const burst = (a - b) * Math.exp(-t / 0.012) * 3.6 + wet;
      ph += (1500 * (0.5 + 0.5 * Math.exp(-t / 0.02))) / sr;
      const blip = Math.sin(TAU * ph) * Math.exp(-t / 0.035) * Math.min(1, t / 0.0008) * 0.75;
      const thump = Math.sin(TAU * 95 * t) * Math.exp(-t / 0.05) * Math.min(1, t / 0.002) * 0.5;
      let glit = 0;
      for (const [fq, d] of [
        [3520, 0.11],
        [4690, 0.08],
        [6270, 0.06],
        [5130, 0.09],
      ] as const)
        glit += Math.sin(TAU * fq * t + fq) * Math.exp(-t / d);
      add(i0 + k, burst + blip + thump + glit * 0.05 * Math.min(1, t / 0.01), 0.5);
    }
  }
  // the giggle: three quick rising chirps, in the air between the bounces' boings
  [
    [151, 880],
    [156, 1040],
    [168, 1230],
  ].forEach(([f, f0], j) => {
    const i0 = at(f!),
      dur = 0.085;
    let ph = 0;
    for (let k = 0; k < Math.round(dur * sr); k++) {
      const t = k / sr,
        p = t / dur;
      ph += (f0! * (1 + 0.32 * p) * (1 + 0.02 * Math.sin(TAU * 38 * t))) / sr;
      // a chirp's tail ducks (about 6 dB) in the frames just before a bounce, so the bounce lands clear of it
      const Fs = f! + t * FPS,
        duck = 1 - 0.5 * Math.max(...[162, 174].map((b) => ss(b - 4.5, b - 1.5, Fs) * (Fs < b + 3 ? 1 : 0))),
        env = Math.sin(Math.PI * p) ** 1.5 * duck;
      add(
        i0 + k,
        (Math.sin(TAU * ph) + 0.35 * Math.sin(2 * TAU * ph) + 0.12 * Math.sin(3 * TAU * ph)) *
          env *
          0.72 *
          (j === 0 ? 0.89 : 1), // (the first chirp a decibel down, under the pop)
        0.4 + 0.1 * j,
      );
    }
  });
  // the shimmer: faint glassy partials (whole cycles per loop) while a bubble is on screen (wraps round the seam)
  {
    const secs = n / sr;
    for (let i = 0; i < n; i++) {
      const F = (i / sr) * FPS,
        age = mod(F - 150),
        on = age < 210 ? ss(20, 70, age) * (1 - ss(200, 210, age)) : 0;
      if (on <= 0) continue;
      const t = i / sr;
      let v = 0;
      [2093, 2637, 3136, 3951].forEach((fq, j) => {
        const f = Math.round(fq * secs) / secs,
          trem = 0.5 + 0.5 * Math.sin(((TAU * (3 + j) * t) / secs) * 2 + j);
        v += Math.sin(TAU * f * t) * trem;
      });
      add(i, v * on * 0.012, 0.5 + 0.2 * Math.sin((TAU * t) / secs));
    }
  }
  // one saturation over the sum (it rounds off the pop's first milliseconds): loud enough without a limiter, with
  // headroom for the AAC encode, still deterministic
  let peak = 1e-9;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(Lc[i]!), Math.abs(Rc[i]!));
  const g = 2.8 / peak;
  for (let i = 0; i < n; i++) {
    Lc[i] = (Math.tanh(Lc[i]! * g) / Math.tanh(2.8)) * OUT;
    Rc[i] = (Math.tanh(Rc[i]! * g) / Math.tanh(2.8)) * OUT;
  }
  return [Lc, Rc];
}

export const pop = make("square", "pop");
export const popVertical = make("vertical", "popVertical");
