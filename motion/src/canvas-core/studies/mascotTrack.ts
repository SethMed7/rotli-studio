// STUDY 12 · MASCOT TRACK (24 s, 30 fps, 120 bpm). The founder-explainer reel: one soft robot mascot and one
// metaphor carry the whole piece. Your assistant is a race car with no track; we build its track from four concept
// blocks, watch it race a top-down road flicking finished-task chips off to the sides, stop at a checkpoint where a
// person keeps the decision, and sign off beside the wordmark. Soft shadows, rounded forms, a subtle floor, serif
// word ladders beside the action. Oriel is a fictional product. Brand: the neutral pack, palette "plum".
// Brief: series/studies/briefs/mascot-track.json · prompt: series/studies/prompts/mascot-track.prompt.md
//
// The whole film is one continuous function paint(F) of a (fractional) frame F, so motion blur can sample inside
// the shutter; the shots only name the sections on the timeline.
import PACK from "../../../brand/packs/studio/pack.json";
import type { Ctx, Env } from "../core";
import { rng } from "../core";
import type { Film, Shot } from "../film";
import { motionBlur } from "../kit/blur";
import { ladder, w, type Word } from "../kit/captions";
import { clamp, ease, lerp, prog, spring, track, window01 } from "../kit/motion";
import { usePack } from "../kit/pack";
import { beatScore } from "../kit/score";
import { layout, type Size } from "../kit/sizes";
import { letters, measure, text } from "../kit/type";
import { check, rr } from "../kit/ui";

const P = usePack(PACK),
  C = P.palette("plum"),
  F_ = P.face;
const FPS = 30,
  BPM = 120,
  N = 720; // a beat is 15 frames, a bar 60
// the timeline, in frames (every cut on a beat)
const T = { stall: 75, build: 195, road: 345, check: 510, sign: 630 };
const LAND = [225, 255, 285, 315]; // the four blocks land on the beat
const HIT = [405, 435, 465, 495]; // the four chips are flicked on the beat
const TAP = 594; // the person taps "Yes"
const TAU = Math.PI * 2;

// ---- colour: the plum palette, plus flat tints mixed from it (no raw colours from outside the pack)
const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a: string, b: string, t: number) => {
  const A = hex(a),
    B = hex(b);
  return `#${A.map((v, i) =>
    Math.round(lerp(v, B[i]!, clamp(t)))
      .toString(16)
      .padStart(2, "0"),
  ).join("")}`;
};
const rgba = (h: string, a: number) => `rgba(${hex(h).join(",")},${a})`;
const SAND = mix(C.ground, C.accent2, 0.12), // the desert floor
  DUNE = mix(C.ground, C.muted, 0.14),
  SUN = mix(C.accent2, C.ground, 0.42),
  PEBBLE = mix(SAND, C.muted, 0.28),
  PUFF = mix(C.ground, C.muted, 0.26),
  SMOKE = mix(C.muted, C.ground, 0.35),
  LILAC = mix(C.accent, C.surface, 0.7),
  SKIN = mix(C.accent2, C.surface, 0.55),
  SLEEVE = mix(C.accent, C.ink, 0.3),
  HUB = mix(C.ink, C.surface, 0.4);

// the four concept blocks, bottom to top
const BLOCKS = [
  { t: "Calendars", fill: C.accent, ink: C.surface, icon: "cal" },
  { t: "Preferences", fill: C.accent2, ink: C.ink, icon: "pref" },
  { t: "Rules", fill: C.ink, ink: C.ground, icon: "rules" },
  { t: "History", fill: C.surface, ink: C.ink, icon: "hist" },
] as const;
const CHIPS = ["invite sent", "room booked", "agenda", "reminder"];

// a damped wobble that starts at frame 0 (for squash, antenna and landings); 0 before it starts
const wobble = (f: number, hz: number, decay: number) =>
  f <= 0 ? 0 : Math.exp((-decay * f) / FPS) * Math.sin((TAU * hz * f) / FPS);
const mod = (a: number, b: number) => ((a % b) + b) % b;

// seeded scenery (fixed at load: every frame reads the same list)
const R = rng(12);
const PEBBLES = Array.from({ length: 16 }, () => ({ x: R(), y: R(), s: 0.5 + R() * 0.8 }));
const SPECKS = Array.from({ length: 70 }, () => ({ x: R(), y: R(), s: 0.6 + R() * 0.9 }));

// ---- canvas shadows ignore the transform, so every blur and offset is scaled by the current device scale
const devScale = (ctx: Ctx) => {
  const m = ctx.getTransform();
  return Math.hypot(m.a, m.b);
};
const shadow = (ctx: Ctx, blur: number, y: number, color: string) => {
  const k = devScale(ctx);
  ctx.shadowColor = color;
  ctx.shadowBlur = blur * k;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = y * k;
};
/** a soft contact shadow on the floor: an ellipse drawn far off-canvas whose blurred shadow lands at (x, y) */
const contact = (ctx: Ctx, x: number, y: number, rx: number, ry: number, a: number) => {
  if (a <= 0.001 || rx <= 0) return;
  ctx.save();
  const m = ctx.getTransform(),
    D = 4000;
  ctx.shadowColor = rgba(C.ink, a);
  ctx.shadowBlur = ry * 1.4 * devScale(ctx);
  ctx.shadowOffsetX = D * m.a;
  ctx.shadowOffsetY = D * m.b;
  ctx.beginPath();
  ctx.ellipse(x - D, y, rx, ry, 0, 0, TAU);
  ctx.fillStyle = "#000";
  ctx.fill();
  ctx.restore();
};
const disc = (ctx: Ctx, x: number, y: number, r: number, fill: string) => {
  if (r <= 0) return;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fillStyle = fill;
  ctx.fill();
};
const fillRR = (ctx: Ctx, x: number, y: number, w_: number, h: number, r: number, fill: string) => {
  rr(ctx, x, y, w_, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
};

// ---- THE MASCOT, side view: two stacked rounded bodies, a visor, a tiny antenna, two wheels (it is the race car)
type Eyes = "open" | "narrow" | "flat" | "happy";
type Pose = {
  q?: number; // squash (1 = rest, < 1 squashed, > 1 stretched)
  lean?: number; // radians about the wheels (+ = nose down)
  spin?: number; // wheel angle
  eyes?: Eyes;
  blink?: number; // 0..1
  look?: number; // eyes up (px)
  droop?: number; // antenna droop 0..1
  sway?: number; // antenna sway (radians)
  slump?: number; // head sinks (px)
  arm?: number; // 0 = tucked away (no arm), 1 = raised
  wave?: number; // the raised arm's swing (radians)
};
function mascot(ctx: Ctx, x: number, y: number, k: number, p: Pose) {
  const q = p.q ?? 1;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, k);
  ctx.rotate(p.lean ?? 0);
  ctx.scale(1 + (1 - q) * 0.7, q);
  // wheels, with a hub mark so the spin reads
  for (const wx of [-70, 70]) {
    disc(ctx, wx, -28, 28, C.ink);
    disc(ctx, wx, -28, 11, HUB);
    ctx.save();
    ctx.translate(wx, -28);
    ctx.rotate(p.spin ?? 0);
    ctx.fillStyle = C.ink;
    ctx.fillRect(-2.5, -11, 5, 22);
    ctx.restore();
  }
  // the lower body (the car)
  ctx.save();
  shadow(ctx, 34, 14, rgba(C.ink, 0.13));
  fillRR(ctx, -118, -178, 236, 134, 58, C.surface);
  ctx.restore();
  ctx.save();
  rr(ctx, -118, -178, 236, 134, 58);
  ctx.clip();
  ctx.fillStyle = C.accent; // the racing stripe
  ctx.fillRect(-130, -124, 260, 18);
  ctx.fillStyle = rgba(C.ink, 0.05); // a flat underside band keeps the white body off the cream ground
  ctx.fillRect(-130, -64, 260, 30);
  ctx.restore();
  disc(ctx, -62, -115, 27, C.ink);
  text(ctx, "12", -62, -105, {
    size: 27,
    family: F_.sans,
    weight: 800,
    color: C.surface,
    align: "center",
    track: -0.02,
  });
  // the arm only exists to wave or cheer: a soft mitt that grows out of the back shoulder, clear of the head
  const a = clamp(p.arm ?? 0);
  if (a > 0.01) {
    ctx.save();
    ctx.translate(-92, -150);
    ctx.rotate(lerp(0.9, 2.55, a) + (p.wave ?? 0));
    ctx.scale(1, clamp(a * 2.5));
    shadow(ctx, 10, 4, rgba(C.ink, 0.14));
    fillRR(ctx, -15, -6, 30, 92, 15, LILAC);
    ctx.restore();
  }
  // the head, with the visor and the antenna
  ctx.save();
  ctx.translate(0, p.slump ?? 0);
  // antenna first, so its root hides under the head
  const droop = (p.droop ?? 0) * 1.25 + (p.sway ?? 0),
    ax = -12,
    ay = -296,
    L = 44;
  const tx = ax - Math.sin(-0.2 + droop) * L,
    ty = ay - Math.cos(-0.2 + droop) * L;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.quadraticCurveTo(ax + (tx - ax) * 0.2, ay - L * 0.6 + droop * 12, tx, ty);
  ctx.stroke();
  disc(ctx, tx, ty, 12, C.accent2);
  ctx.save();
  shadow(ctx, 22, 9, rgba(C.ink, 0.16));
  fillRR(ctx, -78, -302, 176, 138, 56, C.surface);
  ctx.restore();
  fillRR(ctx, -6, -274, 106, 68, 34, C.ink); // the visor
  const ey = -240 - (p.look ?? 0),
    bl = 1 - clamp(p.blink ?? 0) * 0.85,
    eyes = p.eyes ?? "open";
  for (const ex of [36, 72]) {
    if (eyes === "happy") {
      ctx.strokeStyle = C.accent2;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(ex, ey + 6, 10, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    } else {
      const [ew, eh] = eyes === "open" ? [15, 30] : eyes === "narrow" ? [20, 11] : [24, 6];
      fillRR(ctx, ex - ew / 2, ey - (eh * bl) / 2, ew, Math.max(4, eh * bl), ew / 2, C.accent2);
    }
  }
  ctx.restore();
  ctx.restore();
}

// ---- THE MASCOT, top down (the road scene): the same two bodies seen from above, facing down (toward us)
function mascotTop(ctx: Ctx, x: number, y: number, k: number, rot: number, F: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, k);
  ctx.rotate(rot);
  for (const [wx, wy] of [
    [-94, -70],
    [94, -70],
    [-94, 70],
    [94, 70],
  ] as const) {
    fillRR(ctx, wx - 16, wy - 32, 32, 64, 14, C.ink);
    // tread marks slide past so the wheels read as rolling
    ctx.save();
    rr(ctx, wx - 16, wy - 32, 32, 64, 14);
    ctx.clip();
    ctx.fillStyle = HUB;
    for (let t = 0; t < 4; t++) ctx.fillRect(wx - 16, wy - 32 + mod(t * 18 - F * 9, 72) - 4, 32, 4);
    ctx.restore();
  }
  ctx.save();
  shadow(ctx, 40, 18, rgba(C.ink, 0.35));
  fillRR(ctx, -88, -120, 176, 240, 64, C.surface);
  ctx.restore();
  ctx.save();
  rr(ctx, -88, -120, 176, 240, 64);
  ctx.clip();
  ctx.fillStyle = C.accent;
  ctx.fillRect(-11, -130, 22, 260);
  ctx.restore();
  ctx.save();
  shadow(ctx, 20, 10, rgba(C.ink, 0.2));
  fillRR(ctx, -70, -56, 140, 144, 56, C.surface);
  ctx.restore();
  // the visor wraps the front of the head; two eyes peek over its edge
  ctx.save();
  rr(ctx, -70, -56, 140, 144, 56);
  ctx.clip();
  fillRR(ctx, -60, 44, 120, 60, 26, C.ink);
  ctx.restore();
  fillRR(ctx, -30, 58, 16, 14, 7, C.accent2);
  fillRR(ctx, 14, 58, 16, 14, 7, C.accent2);
  ctx.save();
  shadow(ctx, 8, 10, rgba(C.ink, 0.25));
  disc(ctx, -4, -6, 14, C.accent2); // the antenna ball, seen from above
  ctx.restore();
  ctx.restore();
}

// ---- A PERSON (the checkpoint): rounded, faceless but friendly, facing left toward the mascot
function person(ctx: Ctx, x: number, y: number, k: number, hand: [number, number] | null, reach: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, k);
  fillRR(ctx, -36, -116, 28, 116, 14, C.ink);
  fillRR(ctx, 8, -116, 28, 116, 14, C.ink);
  ctx.save();
  shadow(ctx, 26, 12, rgba(C.ink, 0.14));
  fillRR(ctx, -62, -272, 124, 180, 58, C.accent);
  ctx.restore();
  const hx = -6,
    hy = -326;
  ctx.save();
  shadow(ctx, 16, 6, rgba(C.ink, 0.12));
  disc(ctx, hx, hy, 50, SKIN);
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.arc(hx, hy, 51, 0, TAU);
  ctx.clip();
  disc(ctx, hx + 26, hy - 26, 56, C.ink); // hair, on the back and top of the head
  ctx.restore();
  disc(ctx, hx - 28, hy + 2, 5.5, C.ink);
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(hx - 30, hy + 14, 10, Math.PI * 0.35, Math.PI * 0.85);
  ctx.stroke();
  // the arm: from the shoulder to a hand that rests, then reaches for the card
  const sx = -50,
    sy = -240,
    rest: [number, number] = [-58, -136],
    tgt: [number, number] = hand ? [(hand[0] - x) / k, (hand[1] - y) / k] : rest,
    hx2 = lerp(rest[0], tgt[0], reach),
    hy2 = lerp(rest[1], tgt[1], reach);
  ctx.strokeStyle = SLEEVE;
  ctx.lineWidth = 28;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.quadraticCurveTo(lerp(sx, hx2, 0.5) - 26 * (1 - reach), lerp(sy, hy2, 0.5) + 10, hx2, hy2);
  ctx.stroke();
  disc(ctx, hx2, hy2, 16, SKIN);
  ctx.restore();
}

// ---- the concept-block icons (stroked, in the block's ink)
function icon(ctx: Ctx, kind: string, x: number, y: number, s: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = s * 0.11;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const line = (a: number, b: number, c: number, d: number) => {
    ctx.beginPath();
    ctx.moveTo(x + a * s, y + b * s);
    ctx.lineTo(x + c * s, y + d * s);
    ctx.stroke();
  };
  if (kind === "cal") {
    rr(ctx, x, y + 0.12 * s, s, 0.88 * s, 0.16 * s);
    ctx.stroke();
    ctx.fillRect(x, y + 0.12 * s, s, 0.24 * s);
    line(0.28, 0, 0.28, 0.2);
    line(0.72, 0, 0.72, 0.2);
    for (const [a, b] of [
      [0.3, 0.58],
      [0.5, 0.58],
      [0.7, 0.58],
      [0.3, 0.78],
    ])
      disc(ctx, x + a * s, y + b * s, s * 0.06, color);
  } else if (kind === "pref") {
    line(0, 0.28, 1, 0.28);
    line(0, 0.72, 1, 0.72);
    ctx.lineWidth = s * 0.1;
    for (const [a, b] of [
      [0.66, 0.28],
      [0.32, 0.72],
    ]) {
      disc(ctx, x + a * s, y + b * s, s * 0.15, color);
    }
  } else if (kind === "rules") {
    line(0.02, 0.2, 0.14, 0.32);
    line(0.14, 0.32, 0.3, 0.1);
    line(0.44, 0.2, 1, 0.2);
    line(0.44, 0.52, 1, 0.52);
    line(0.44, 0.84, 1, 0.84);
    line(0.06, 0.52, 0.22, 0.52);
    line(0.06, 0.84, 0.22, 0.84);
  } else {
    ctx.beginPath();
    ctx.arc(x + 0.5 * s, y + 0.5 * s, 0.46 * s, 0, TAU);
    ctx.stroke();
    line(0.5, 0.5, 0.5, 0.22);
    line(0.5, 0.5, 0.72, 0.62);
  }
  ctx.restore();
}

export function make(size: Size, id: string): Film {
  const L = layout(size),
    { W, H, u, cx, tall: V } = L;

  // ---- per-size design: the vertical stacks a caption over a low stage; the square keeps captions above and
  // frames the mascot larger; the road scene is cropped tighter in the square
  const cap = V
    ? { x: L.safe.x + 20 * u, y: 290 * u, size: 108 * u }
    : { x: L.safe.x + 10 * u, y: 76 * u, size: 70 * u };
  const K = V ? 1.7 : 1.4, // mascot scale in the side scenes
    floor0 = V ? 1380 * u : 960 * u, // the desert floor
    STEP = 98 * u, // one block (92) and its gap
    slabW = 540 * u;
  const capOpts = (out?: number) => ({
    size: cap.size,
    face: F_.serif,
    italic: F_.italic,
    ink: C.ink,
    accent: C.accent,
    fps: FPS,
    align: "left" as const,
    gap: 0.1,
    out,
  });
  const caption = (ctx: Ctx, F: number, lines: Word[][], from: number, out: number) => {
    if (F < from - 1 || F > out + 10) return;
    ladder(ctx, lines, cap.x, cap.y, F, capOpts(out));
  };
  const CAP = {
    hook: [
      [w("Your", 10, { scale: 0.78 }), w("assistant", 16, { scale: 0.78 })],
      [w("is a", 28, { scale: 0.78 })],
      [w("race car.", 45, { key: true, scale: 1.5 })],
    ],
    stall: [
      [w("with", 96, { scale: 0.8 }), w("no", 104, { scale: 0.8 })],
      [w("track", 120, { key: true, scale: 1.8 })],
    ],
    build: [[w("Give", 199), w("it", 205), w("a", 211)], [w("track.", 225, { key: true, scale: 1.6 })]],
    check: [
      [w("you", 550, { scale: 0.72 }), w("keep", 556, { scale: 0.72 })],
      [w("the", 563, { scale: 0.72 }), w("decisions", 570, { key: true, scale: 1.3 })],
      [w("that", 580, { scale: 0.72 }), w("matter", 586, { scale: 0.72 })],
    ],
    sign: [
      [w("find", 636, { scale: 0.78 }), w("a", 640, { scale: 0.78 }), w("time", 644, { scale: 0.78 })],
      [w("that", 652, { scale: 0.78 }), w("works", 656, { scale: 0.78 }), w("for", 660, { scale: 0.78 })],
      [w("everyone", 666, { key: true, scale: 1.45 })],
    ],
  };

  // ================================================================ SIDE SCENES 0–345: hook, stall, build
  // one continuous desert set; the camera pans with the lurch, rises (and, square, pulls back) as the stack grows
  const pan = (F: number) => 420 * u * ease.outCubic(prog(F, T.stall, 128));
  const landed = (F: number) => LAND.filter((l) => F >= l).length;
  const camY = (F: number) =>
    V
      ? track(F, FPS, [[T.build, 0], ...LAND.map((l, i): [number, number] => [l, (i + 1) * 40 * u])], {
          freq: 1.1,
          damp: 0.9,
        })
      : track(F, FPS, [[T.build, 0], ...LAND.map((l, i): [number, number] => [l, (i + 1) * 10 * u])], {
          freq: 1.1,
          damp: 0.9,
        });
  const camZ = (F: number) =>
    track(F, FPS, [[T.build, 1], ...LAND.map((l, i): [number, number] => [l, 1 - (i + 1) * (V ? 0.055 : 0.075)])], {
      freq: 1.1,
      damp: 0.9,
    });
  const revAmp = (F: number) => window01(F, 30, 42, 64, 76) + 0.7 * window01(F, 326, 334, 345, 350);
  const puffs = (
    ctx: Ctx,
    F: number,
    x: number,
    y: number,
    k: number,
    births: number[],
    life: number,
    color: string,
    rise: number,
  ) => {
    for (const b of births) {
      const a = F - b;
      if (a < 0 || a > life) continue;
      const t = a / life;
      ctx.save();
      ctx.globalAlpha = (1 - t) * 0.9;
      disc(ctx, x - (a * 4 + 10) * k, y - a * rise * k, (12 + 30 * ease.outCubic(t)) * k, color);
      ctx.restore();
    }
  };
  // where the mascot's feet are (world y) and how high it is off whatever it stands on
  const feet = (F: number) => {
    if (F < 30) {
      // the bounce in: a fall that lands at 14, one small hop that lands at 28
      if (F < 14) return { y: floor0 - (1 - (F / 14) ** 2) * (V ? 1500 : 1000) * u, air: 1 };
      const x = prog(F, 14, 28);
      return { y: floor0 - 4 * 90 * u * x * (1 - x), air: x * (1 - x) * 2 };
    }
    for (let i = 0; i < LAND.length; i++) {
      const up = LAND[i]! - 11,
        down = LAND[i]! + 3;
      if (F >= up && F < down) {
        const x = (F - up) / (down - up);
        return { y: floor0 - lerp(i, i + 1, x) * STEP - 4 * 80 * u * x * (1 - x), air: 4 * x * (1 - x) };
      }
    }
    return { y: floor0 - landed(F + 8) * STEP, air: 0 };
  };
  const hookPose = (F: number): Pose => {
    let q = 1 - 0.22 * wobble(F - 14, 2.6, 6) - 0.14 * wobble(F - 28, 2.6, 6);
    for (const l of LAND) q -= 0.16 * wobble(F - (l + 3), 2.6, 6) + 0.1 * window01(F, l - 17, l - 13, l - 13, l - 11);
    const stall = prog(F, 126, 140) * (1 - prog(F, 200, 212));
    q -= 0.04 * stall;
    const lean =
      -0.06 * revAmp(F) +
      0.12 * wobble(F - T.stall, 1.6, 3.5) +
      0.05 * wobble(F - 100, 4, 8) +
      0.05 * wobble(F - 112, 4, 8) +
      0.07 * wobble(F - 122, 3, 6);
    const eyes: Eyes =
      F < 30 ? "open" : F < 126 ? "narrow" : F < 205 ? "flat" : F < 318 ? "open" : F < 330 ? "happy" : "narrow";
    const droop =
      spring((F - 128) / FPS, { freq: 1.5, damp: 0.5 }) * (1 - spring((F - 205) / FPS, { freq: 2, damp: 0.35 }));
    let sway = 0.05 * Math.sin(F * 0.13) + 0.3 * wobble(F - 14, 2.2, 4) + 0.25 * wobble(F - 28, 2.2, 4);
    for (const l of LAND) sway += 0.22 * wobble(F - (l + 3), 2.2, 4);
    sway += 0.12 * revAmp(F) * Math.sin(F * 1.9);
    return {
      q,
      lean,
      spin: pan(F) / (28 * u * K) + 0.9 * clamp(F - 30, 0, 46) + 0.8 * clamp(F - 326, 0, 30),
      eyes,
      blink: window01(F, 20, 22, 23, 25) + window01(F, 232, 234, 235, 237) + window01(F, 170, 172, 173, 176),
      droop,
      sway,
      slump: 8 * stall,
    };
  };
  const slab = (ctx: Ctx, i: number, x: number, top: number, squash: number) => {
    const b = BLOCKS[i]!,
      h = 92 * u;
    ctx.save();
    ctx.translate(x, top + h);
    ctx.scale(1 + (1 - squash) * 0.5, squash);
    ctx.save();
    shadow(ctx, 30, 12, rgba(C.ink, 0.16));
    fillRR(ctx, -slabW / 2, -h, slabW, h, 24 * u, b.fill);
    ctx.restore();
    const o = { size: 38 * u, family: F_.sans, weight: 600, color: b.ink, track: -0.01 },
      tw = measure(ctx, b.t, o),
      is = 36 * u,
      gx = -(is + 20 * u + tw) / 2;
    icon(ctx, b.icon, gx, -h / 2 - is / 2, is, b.ink);
    text(ctx, b.t, gx + is + 20 * u, -h / 2 + 13 * u, o);
    ctx.restore();
  };
  const sideScene = (ctx: Ctx, F: number) => {
    const p = pan(F),
      dz = spring((F - 80) / FPS, { freq: 1.2, damp: 0.8 }),
      xm = cx + (V ? 60 : 30) * u * ease.outCubic(prog(F, T.stall, 92)),
      push = 1 + 0.035 * prog(F, 0, T.build),
      z = camZ(F) * push,
      cy_ = camY(F),
      pivot = floor0;
    ctx.save();
    ctx.translate(cx, pivot + cy_);
    ctx.scale(z, z);
    ctx.translate(-cx, -pivot);
    // sky: the sun and two far mesas rise as the desert opens up (a flat, empty place)
    const sunY = floor0 - (V ? 760 : 470) * u;
    disc(ctx, W * 0.84 - p * 0.04, sunY + (1 - dz) * 140 * u, 62 * u * clamp(dz * 1.2), SUN);
    ctx.fillStyle = DUNE;
    for (const [x0, mw, mh] of [
      [0.05, 380, 70],
      [0.62, 300, 46],
      [1.25, 420, 60],
    ] as const) {
      const x = mod(x0 * W - p * 0.22 + 200 * u, W + 900 * u) - 450 * u,
        hh = mh * u * dz,
        ww = mw * u;
      if (hh < 0.5) continue;
      ctx.beginPath();
      ctx.ellipse(x + ww / 2, floor0 + 1, ww / 2, hh, 0, Math.PI, TAU);
      ctx.fill();
    }
    // the floor, with pebbles that slide by on the lurch
    ctx.fillStyle = SAND;
    ctx.fillRect(-W, floor0, W * 3, H * 2);
    ctx.fillStyle = rgba(C.ink, 0.05);
    ctx.fillRect(-W, floor0, W * 3, 3 * u);
    for (const pb of PEBBLES) {
      const depth = pb.y,
        yy = floor0 + (30 + depth * (V ? 520 : 200)) * u,
        x = mod(pb.x * (W + 400 * u) - p * (0.7 + depth), W + 400 * u) - 200 * u;
      ctx.beginPath();
      ctx.ellipse(x, yy, (8 + 10 * depth) * pb.s * u, (3 + 3 * depth) * pb.s * u, 0, 0, TAU);
      ctx.fillStyle = PEBBLE;
      ctx.fill();
    }
    // a tumbleweed rolls through the stall
    if (F > 136 && F < 225) {
      const a = F - 136,
        tx = W + 90 * u - a * 16 * u,
        ty = floor0 - 36 * u - Math.abs(Math.sin(a * 0.22)) * 34 * u,
        r = 34 * u;
      contact(ctx, tx, floor0 + 4 * u, r * 0.9, 7 * u, 0.12);
      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate(-a * 0.2);
      ctx.strokeStyle = C.muted;
      ctx.lineWidth = 4 * u;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, TAU);
      ctx.stroke();
      ctx.lineWidth = 3 * u;
      for (let j = 0; j < 3; j++) {
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.9, r * 0.35, (j * Math.PI) / 3, 0, TAU);
        ctx.stroke();
      }
      ctx.restore();
    }
    // the blocks: landed ones stack under the mascot, the next one falls in behind it
    for (let i = 0; i < 4; i++) {
      const l = LAND[i]!;
      if (F < l - 10) continue;
      const target = floor0 - (i + 1) * STEP + 6 * u,
        fall = 1 - ease.inCubic(prog(F, l - 10, l)),
        top = target - fall * 1500 * u;
      if (i === 0) contact(ctx, xm, floor0 + 2 * u, slabW * 0.52, 12 * u, 0.2 * (1 - fall));
      slab(ctx, i, xm, top, 1 - 0.1 * wobble(F - l, 3, 7));
      if (F >= l && F < l + 16) {
        const a = F - l;
        for (const s of [-1, 1]) {
          ctx.save();
          ctx.globalAlpha = (1 - a / 16) * 0.85;
          disc(ctx, xm + s * (slabW / 2 + a * 3 * u), target + 80 * u - a * 1.2 * u, (10 + a * 1.6) * u, PUFF);
          ctx.restore();
        }
      }
    }
    // the mascot
    const f = feet(F),
      pose = hookPose(F),
      shake = revAmp(F) * 3 * u * Math.sin(F * 2.7),
      standY = floor0 - landed(F + 8) * STEP;
    if (F >= 14 || f.y > floor0 - 900 * u)
      contact(
        ctx,
        xm,
        F < 30 ? floor0 + 2 * u : standY + 2 * u,
        150 * u * K * (1 - 0.45 * f.air),
        13 * u,
        0.2 * (1 - 0.6 * f.air),
      );
    // exhaust: rev puffs, the lurch's cough, the stall's smoke
    puffs(
      ctx,
      F,
      xm - 128 * u * K,
      f.y - 50 * u * K,
      u * K,
      [32, 37, 42, 47, 52, 57, 62, 67, 76, 80, 327, 332, 337, 342],
      20,
      PUFF,
      1,
    );
    puffs(ctx, F, xm - 100 * u * K, f.y - 80 * u * K, u * K, [104, 114, 124, 131], 30, SMOKE, 2.4);
    // speed lines while it revs
    const ra = revAmp(F);
    if (ra > 0.02)
      for (let j = 0; j < 3; j++) {
        const len = (70 + 50 * Math.abs(Math.sin(F * 0.9 + j * 2))) * u,
          yy = f.y - (70 + j * 55) * u * K;
        ctx.save();
        ctx.globalAlpha = ra * 0.7;
        fillRR(ctx, xm - (150 + 30 * j) * u * K - len, yy - 4 * u, len, 8 * u, 4 * u, C.muted);
        ctx.restore();
      }
    mascot(ctx, xm + shake, f.y, K * u, pose);
    ctx.restore();
    caption(ctx, F, CAP.hook, 0, 66);
    caption(ctx, F, CAP.stall, 90, 184);
    caption(ctx, F, CAP.build, 195, 334);
  };

  // ================================================================ ROAD 345–510: top down, racing toward us
  const Z = V ? 1 : 1.3, // the square crops the road tighter
    Hv = H / Z,
    RW = 540 * u,
    lane = [cx - RW * 0.13, cx + RW * 0.13],
    y0 = V ? 560 * u : 230 * u, // the mascot's resting screen height (zoomed coordinates)
    KT = (V ? 1.3 : 1.05) * u, // the mascot, top down
    VEL = 40 * u;
  const scroll = (f: number) => (f < 372 ? 0 : f < 392 ? (VEL * (f - 372) ** 2) / 40 : VEL * 10 + VEL * (f - 392));
  const roadX = (F: number) =>
    track(F, FPS, [[T.road, cx], ...HIT.map((h, i): [number, number] => [h - 24, lane[i % 2]!]), [HIT[3]! + 6, cx]], {
      freq: 1.2,
      damp: 0.8,
    });
  const chip = (ctx: Ctx, i: number, x: number, y: number, done: number, rot: number, k: number) => {
    const o = { size: 36 * u, family: F_.sans, weight: 600, color: C.ink, track: -0.01 },
      tw = measure(ctx, CHIPS[i]!, o),
      cw = tw + 128 * u,
      ch = 88 * u;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(k, k);
    ctx.save();
    shadow(ctx, 34, 14, rgba(C.ink, 0.3));
    fillRR(ctx, -cw / 2, -ch / 2, cw, ch, ch / 2, C.surface);
    ctx.restore();
    const bx = -cw / 2 + 48 * u;
    ctx.beginPath();
    ctx.arc(bx, 0, 21 * u, 0, TAU);
    ctx.strokeStyle = C.muted;
    ctx.lineWidth = 3 * u;
    ctx.stroke();
    disc(ctx, bx, 0, 22 * u * ease.outBack(clamp(done * 1.6)), C.accent);
    check(ctx, bx, 0, 21 * u, prog(done, 0.4, 1), C.surface, 5 * u);
    text(ctx, CHIPS[i]!, bx + 38 * u, 12 * u, o);
    ctx.restore();
  };
  const cone = (ctx: Ctx, x: number, y: number) => {
    ctx.save();
    shadow(ctx, 10, 6, rgba(C.ink, 0.18));
    disc(ctx, x, y, 22 * u, C.accent2);
    ctx.restore();
    disc(ctx, x, y, 13 * u, C.surface);
    disc(ctx, x, y, 6 * u, C.accent2);
  };
  const roadScene = (ctx: Ctx, F: number) => {
    const o = scroll(F),
      draw = ease.inOutCubic(prog(F, T.road, 372)),
      len = draw * (Hv + 40 * u);
    ctx.save();
    ctx.translate(cx, 0);
    ctx.scale(Z, Z);
    ctx.translate(-cx, 0);
    ctx.fillStyle = SAND;
    ctx.fillRect(cx - W, -10, W * 2, Hv + 20);
    for (const s of SPECKS) {
      const x = cx - W / 2 / Z + s.x * (W / Z),
        y = mod(s.y * (Hv + 200 * u) - o, Hv + 200 * u) - 100 * u;
      if (Math.abs(x - cx) < RW / 2 + 40 * u) continue;
      ctx.beginPath();
      ctx.ellipse(x, y, 7 * s.s * u, 4 * s.s * u, 0, 0, TAU);
      ctx.fillStyle = PEBBLE;
      ctx.fill();
    }
    // the road draws itself toward us; kerbs and a dashed centre line ride on it
    if (len > 1) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(cx - W, -20, W * 2, len + 20);
      ctx.clip();
      // cones mark the roadside every so often, on alternating sides
      for (let k = -1; k < Hv / (330 * u) + 2; k++) {
        const y = k * 330 * u - mod(o, 330 * u),
          side = mod(k + Math.floor(o / (330 * u)), 2) ? 1 : -1;
        cone(ctx, cx + side * (RW / 2 + 74 * u), y);
      }
      ctx.save();
      shadow(ctx, 30, 8, rgba(C.ink, 0.18));
      fillRR(ctx, cx - RW / 2 - 24 * u, -200, RW + 48 * u, len + 200, 40 * u, C.surface);
      ctx.restore();
      ctx.save();
      rr(ctx, cx - RW / 2 - 24 * u, -200, RW + 48 * u, len + 200, 40 * u);
      ctx.clip();
      const seg = 60 * u;
      for (let k = -1; k < Hv / seg + 2; k++) {
        const y = k * seg - mod(o, seg * 2);
        if (mod(k, 2) === 0) {
          ctx.fillStyle = C.accent;
          ctx.fillRect(cx - RW / 2 - 24 * u, y, 24 * u, seg);
          ctx.fillRect(cx + RW / 2, y, 24 * u, seg);
        }
      }
      ctx.restore();
      fillRR(ctx, cx - RW / 2, -200, RW, len + 200 - 24 * u, 26 * u, C.ink);
      for (let k = -1; k < Hv / (150 * u) + 2; k++) {
        const y = k * 150 * u - mod(o, 150 * u);
        if (y < len - 90 * u) fillRR(ctx, cx - 6 * u, y, 12 * u, 64 * u, 6 * u, rgba(C.ground, 0.85));
      }
      ctx.restore();
    }
    const my = lerp(-300 * u, y0, ease.outCubic(prog(F, 356, 388))),
      mx = roadX(F),
      rot = (-(roadX(F + 1) - roadX(F - 1)) * 0.004) / u;
    // speed lines stream past the mascot
    if (F > 380)
      for (let j = 0; j < 4; j++) {
        const x = mx + (j < 2 ? -1 : 1) * (150 + (j % 2) * 44) * (KT / u) * u,
          y = mod(j * 170 * u - o * 1.3, 700 * u) + my - 560 * u;
        ctx.save();
        ctx.globalAlpha = 0.45 * clamp((F - 380) / 10);
        fillRR(ctx, x - 3 * u, y, 6 * u, 120 * u, 3 * u, C.surface);
        ctx.restore();
      }
    if (F >= 354) mascotTop(ctx, mx, my, KT, rot, F);
    // the tasks: each chip pops out ahead of the mascot, gets its check, then is flicked off to the side
    HIT.forEach((h, i) => {
      const a = F - h,
        side = i % 2 ? 1 : -1;
      if (a < -20 || a > 26) return;
      const pop = spring((a + 20) / FPS, { freq: 2.4, damp: 0.62 }),
        ahead = my + (186 * KT) / u,
        t = ease.inOutCubic(clamp(a / 14)),
        x = lerp(mx, mx + side * 40 * u, pop) + side * t * 820 * u,
        y = lerp(my + 40 * u, ahead, pop) - t * 360 * u;
      if (a >= 0 && a < 10)
        for (let j = 0; j < 7; j++) {
          const ang = (j / 7) * TAU + i,
            r = (40 + a * 12) * u;
          ctx.save();
          ctx.globalAlpha = 1 - a / 10;
          disc(ctx, mx + side * 40 * u + Math.cos(ang) * r, ahead + Math.sin(ang) * r * 0.7, 6 * u, C.accent2);
          ctx.restore();
        }
      chip(ctx, i, x, y, prog(a, -10, -2), side * t * 0.8, pop * (1 + 0.12 * Math.sin(t * Math.PI)));
    });
    ctx.restore();
  };

  // ================================================================ CHECKPOINT 510–630: side view, on the track
  const floorC = V ? 1450 * u : 1000 * u,
    G = V ? 1.22 : 1, // the vertical stages the checkpoint larger (it has the height)
    stopX = 250 * u,
    postX = 620 * u,
    personX = 850 * u,
    KC = V ? 1.0 : 0.96,
    cardW = 620 * u,
    cardH = 196 * u,
    cardX = 211 * u,
    cardY = floorC - 590 * u,
    yesW = 150 * u,
    yesH = 58 * u,
    yesX = cardX + cardW - 36 * u - yesW,
    yesY = cardY + cardH - 30 * u - yesH;
  const strata = (ctx: Ctx, floor: number) => {
    // the track, seen side on: the four blocks laid flat as its foundation
    const bands = [C.surface, C.ink, C.accent2, C.accent];
    ctx.fillStyle = SAND;
    ctx.fillRect(0, floor, W, H - floor);
    bands.forEach((b, i) => {
      ctx.fillStyle = b;
      ctx.fillRect(0, floor + i * 30 * u, W, 30 * u);
    });
    ctx.fillStyle = rgba(C.ink, 0.08);
    ctx.fillRect(0, floor, W, 3 * u);
    ctx.fillStyle = rgba(C.ink, 0.12);
    for (let x = 90 * u; x < W; x += 240 * u) ctx.fillRect(x, floor, 3 * u, 120 * u);
  };
  const checkScene = (ctx: Ctx, F: number) => {
    const push = G * (1 + 0.04 * prog(F, T.check, T.sign));
    ctx.save();
    ctx.translate(cx, floorC);
    ctx.scale(push, push);
    ctx.translate(-cx, -floorC);
    strata(ctx, floorC);
    // the checkpoint: a post, a striped boom that lifts once the person says yes, a chequered flag
    const lift = spring((F - (TAP + 10)) / FPS, { freq: 1.4, damp: 0.62 });
    ctx.save();
    shadow(ctx, 16, 6, rgba(C.ink, 0.14));
    fillRR(ctx, postX - 12 * u, floorC - 250 * u, 24 * u, 250 * u, 10 * u, C.ink);
    ctx.restore();
    ctx.save();
    ctx.translate(postX, floorC - 196 * u);
    ctx.rotate(1.3 * lift);
    ctx.save();
    shadow(ctx, 14, 6, rgba(C.ink, 0.14));
    fillRR(ctx, -236 * u, -11 * u, 244 * u, 22 * u, 11 * u, C.surface);
    ctx.restore();
    ctx.save();
    rr(ctx, -236 * u, -11 * u, 244 * u, 22 * u, 11 * u);
    ctx.clip();
    ctx.fillStyle = C.accent;
    for (let k = 0; k < 6; k++) ctx.fillRect(-236 * u + k * 48 * u, -12 * u, 24 * u, 24 * u);
    ctx.restore();
    ctx.restore();
    disc(ctx, postX, floorC - 196 * u, 9 * u, C.accent2);
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 4; c++) {
        const wv = Math.sin(F * 0.28 - c * 0.9) * 4 * u * (c / 3),
          s = 18 * u;
        ctx.fillStyle = (r + c) % 2 ? C.surface : C.ink;
        ctx.fillRect(postX + 12 * u + c * s, floorC - 250 * u + r * s + wv, s + 0.5, s + 0.5);
      }
    // the person appears at the checkpoint
    const pa = spring((F - 516) / FPS, { freq: 2.2, damp: 0.55 });
    const reach = ease.inOutCubic(prog(F, 576, TAP)) * (1 - ease.inOutCubic(prog(F, TAP + 14, TAP + 30)));
    const press = window01(F, TAP - 2, TAP, TAP + 3, TAP + 8);
    contact(ctx, personX, floorC + 2 * u, 90 * u * KC, 10 * u, 0.2 * pa);
    // the mascot drives in fast and brakes at the boom
    const xm = lerp(-280 * u, stopX, ease.outCubic(prog(F, T.check, 540))),
      moving = 1 - prog(F, 522, 540),
      hop = prog(F, TAP + 8, TAP + 22),
      air = 4 * hop * (1 - hop),
      happy = F >= TAP + 4;
    contact(ctx, xm, floorC + 2 * u, 150 * u * KC * (1 - 0.3 * air), 12 * u, 0.2);
    for (let j = 0; j < 3; j++) {
      if (moving < 0.02) break;
      const len = (90 + 60 * Math.abs(Math.sin(F * 0.8 + j))) * u;
      ctx.save();
      ctx.globalAlpha = moving * 0.7;
      fillRR(ctx, xm - (160 + 30 * j) * u - len, floorC - (70 + j * 55) * u, len, 8 * u, 4 * u, C.muted);
      ctx.restore();
    }
    for (const b of [530, 534, 538]) {
      const a = F - b;
      if (a < 0 || a > 18) continue;
      ctx.save();
      ctx.globalAlpha = (1 - a / 18) * 0.85;
      disc(ctx, xm + (100 + a * 2.5) * u * KC, floorC - (10 + a * 1.2) * u, (10 + a * 1.5) * u, PUFF);
      ctx.restore();
    }
    mascot(ctx, xm, floorC - air * 50 * u, KC * u, {
      q: 1 - 0.12 * wobble(F - (TAP + 22), 2.6, 6) - 0.06 * window01(F, TAP + 4, TAP + 7, TAP + 7, TAP + 9),
      lean: 0.16 * wobble(F - 536, 1.5, 3.8),
      spin: xm / (28 * u * KC),
      eyes: happy ? "happy" : "open",
      look: 10 * window01(F, 548, 556, TAP - 4, TAP + 2),
      blink: window01(F, 566, 568, 569, 571),
      droop: 0,
      sway: 0.2 * wobble(F - 540, 2, 3) + 0.05 * Math.sin(F * 0.13) + 0.25 * wobble(F - (TAP + 6), 2.4, 4),
      arm: happy ? window01(F, TAP + 6, TAP + 14, 620, 630) : 0,
      wave: 0.3 * Math.sin(F * 0.5),
    });
    // the decision card floats up between them
    const cp = spring((F - 544) / FPS, { freq: 2, damp: 0.62 }),
      bob = Math.sin(F * 0.1) * 4 * u;
    if (cp > 0.01) {
      ctx.save();
      ctx.translate(cardX + cardW / 2, cardY + cardH + bob);
      ctx.scale(cp, cp);
      ctx.translate(-(cardX + cardW / 2), -(cardY + cardH));
      ctx.save();
      shadow(ctx, 60, 24, rgba(C.ink, 0.16));
      fillRR(ctx, cardX, cardY, cardW, cardH, 30 * u, C.surface);
      ctx.restore();
      text(ctx, "Move team sync to Thu 3 pm?", cardX + 36 * u, cardY + 56 * u, {
        size: 32 * u,
        family: F_.sans,
        weight: 600,
        color: C.ink,
        track: -0.015,
      });
      text(ctx, "Ana, Ben and Kai are free", cardX + 36 * u, cardY + 94 * u, {
        size: 26 * u,
        family: F_.sans,
        weight: 400,
        color: C.muted,
      });
      const nx = yesX - 16 * u - 170 * u;
      fillRR(ctx, nx, yesY, 170 * u, yesH, yesH / 2, C.line);
      text(ctx, "Not now", nx + 85 * u, yesY + 38 * u, {
        size: 26 * u,
        family: F_.sans,
        weight: 600,
        color: C.ink,
        align: "center",
      });
      const done = prog(F, TAP, TAP + 8),
        k = 1 - 0.08 * press;
      if (done > 0) {
        ctx.save();
        ctx.globalAlpha = 1 - done;
        ctx.strokeStyle = C.accent;
        ctx.lineWidth = 4 * u;
        rr(
          ctx,
          yesX - done * 22 * u,
          yesY - done * 22 * u,
          yesW + done * 44 * u,
          yesH + done * 44 * u,
          yesH / 2 + done * 22 * u,
        );
        ctx.stroke();
        ctx.restore();
      }
      ctx.save();
      ctx.translate(yesX + yesW / 2, yesY + yesH / 2);
      ctx.scale(k, k);
      fillRR(ctx, -yesW / 2, -yesH / 2, yesW, yesH, yesH / 2, done > 0 ? mix(C.accent, C.ink, 0.25 * done) : C.accent);
      const cw = 22 * u * prog(F, TAP + 2, TAP + 10);
      if (cw > 0) check(ctx, -34 * u, 0, 22 * u, prog(F, TAP + 2, TAP + 10), C.surface, 4.5 * u);
      text(ctx, "Yes", cw > 0 ? 10 * u : 0, 10 * u, {
        size: 28 * u,
        family: F_.sans,
        weight: 600,
        color: C.surface,
        align: "center",
      });
      ctx.restore();
      ctx.restore();
    }
    // the person is drawn over the card, so the tapping hand lands ON the button
    if (pa > 0.01) {
      ctx.save();
      ctx.translate(personX, floorC);
      ctx.scale(1, pa);
      ctx.translate(-personX, -floorC);
      person(
        ctx,
        personX,
        floorC + Math.sin(F * 0.16) * 2 * u,
        KC * u,
        [yesX + yesW / 2 - 18 * u, yesY + yesH / 2 + 22 * u + press * 4 * u],
        reach,
      );
      ctx.restore();
    }
    ctx.restore();
    caption(ctx, F, CAP.check, 546, 620);
  };

  // ================================================================ SIGN-OFF 630–720: the mascot waves beside Oriel
  const floorS = V ? 1340 * u : 960 * u,
    KS = V ? 1.6 : 1.25,
    signX = (V ? 280 : 250) * u,
    wordX = (V ? 496 : 432) * u,
    wordSize = (V ? 188 : 150) * u;
  const signScene = (ctx: Ctx, F: number) => {
    const push = 1 + 0.045 * prog(F, T.sign, N),
      pivot = floorS - 200 * u;
    ctx.save();
    ctx.translate(cx, pivot);
    ctx.scale(push, push);
    ctx.translate(-cx, -pivot);
    ctx.fillStyle = SAND;
    ctx.fillRect(-W, floorS, W * 3, H);
    ctx.fillStyle = rgba(C.ink, 0.05);
    ctx.fillRect(-W, floorS, W * 3, 3 * u);
    // a short piece of track draws under the lockup: the mascot stands on it
    const td = ease.inOutCubic(prog(F, T.sign, 654)),
      tl = L.safe.x,
      tr = W - L.safe.x,
      th = 34 * u;
    if (td > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(tl - 10, floorS - 10, (tr - tl) * td + 20, th + 40);
      ctx.clip();
      fillRR(ctx, tl, floorS, tr - tl, th, th / 2, C.ink);
      for (let x = tl + 50 * u; x < tr - 60 * u; x += 110 * u)
        fillRR(ctx, x - mod(F - T.sign, 30) * 2 * u + 30 * u, floorS + th / 2 - 4 * u, 50 * u, 8 * u, 4 * u, C.ground);
      ctx.restore();
    }
    // the mascot drops in and waves
    const fall = prog(F, T.sign, 642),
      air = (1 - fall * fall) * 1300 * u,
      q = 1 - 0.2 * wobble(F - 642, 2.6, 6),
      raise = ease.inOutCubic(prog(F, 648, 660));
    contact(ctx, signX, floorS + 2 * u, 150 * u * KS * (F < 642 ? 0.5 : 1), 13 * u, F < 642 ? 0.08 : 0.2);
    mascot(ctx, signX, floorS - air, KS * u, {
      q,
      lean: 0.03 * Math.sin((F - 660) * 0.21) * raise,
      eyes: F >= 648 ? "happy" : "open",
      sway: 0.3 * wobble(F - 642, 2.2, 4) + 0.08 * Math.sin(F * 0.42) * raise,
      arm: raise,
      wave: 0.4 * raise * Math.sin((F - 656) * 0.42),
      blink: window01(F, 700, 702, 703, 705) * (F >= 648 ? 0 : 1),
    });
    // the wordmark rises letter by letter; the address follows
    const o = { size: wordSize, family: F_.sans, weight: 800, color: C.ink, align: "left" as const, track: -0.045 },
      base = floorS - 150 * u;
    letters(
      ctx,
      P.product,
      wordX,
      base,
      o,
      (i) => spring((F - 648 - i * 2.5) / FPS, { freq: 2.4, damp: 0.72 }),
      "rise",
    );
    const ww = measure(ctx, P.product, o);
    disc(ctx, wordX + ww + 22 * u, base - 14 * u, 15 * u * spring((F - 664) / FPS, { freq: 3, damp: 0.45 }), C.accent);
    text(ctx, P.url, wordX + 8 * u, base + 60 * u, {
      size: 28 * u,
      family: F_.mono,
      weight: 500,
      color: C.muted,
      alpha: prog(F, 668, 682),
      track: 0.02,
    });
    ctx.restore();
    caption(ctx, F, CAP.sign, 632, N + 20);
  };

  const paint = (ctx: Ctx, env: Env, F: number) => {
    F = clamp(F, 0, N - 1);
    ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
    ctx.fillStyle = C.ground;
    ctx.fillRect(0, 0, W, H);
    if (F < T.road) sideScene(ctx, F);
    else if (F < T.check) roadScene(ctx, F);
    else if (F < T.sign) checkScene(ctx, F);
    else signScene(ctx, F);
  };
  const cuts = [0, T.stall, T.build, T.road, T.check, T.sign, N],
    names = ["hook", "stall", "build", "road", "checkpoint", "signoff"];
  const shots: Shot[] = names.map((sid, i) => ({
    id: sid,
    start: cuts[i]!,
    end: cuts[i + 1]!,
    draw: (ctx, local, env) => {
      // a 180° shutter: the drop, the lurch, the road and the flicked chips smear the way a camera sees them
      motionBlur(ctx, env, (c, dt) => paint(c, env, cuts[i]! + local + dt), { samples: 4, shutter: 0.5 });
    },
  }));

  // ---- sound: the soft beat score, plus the one thing the kit does not have: an engine rev (a rising tone)
  const score = beatScore({
    frames: N,
    fps: FPS,
    bpm: BPM,
    mood: "soft",
    hits: LAND,
    whooshes: [T.road + 6, ...HIT.map((h) => h + 6), T.check + 14],
    ticks: [14, 28, 548, TAP, TAP + 8, 642],
    sign: T.sign + 18,
    gain: 0.76,
  });
  const rev = (Lc: Float32Array, Rc: Float32Array, sr: number, f0: number, f1: number, amp: number) => {
    const i0 = Math.round((f0 / FPS) * sr),
      n = Math.round(((f1 - f0) / FPS) * sr);
    let ph = 0;
    for (let k = 0; k < n && i0 + k < Lc.length; k++) {
      const x = k / n,
        t = k / sr,
        s = x ** 1.4 - 0.12 * Math.exp(-(((x - 0.42) / 0.06) ** 2)),
        hz = 62 + 250 * s;
      ph += hz / sr;
      const saw =
          Math.sin(TAU * ph) +
          0.5 * Math.sin(2 * TAU * ph) +
          0.33 * Math.sin(3 * TAU * ph) +
          0.2 * Math.sin(4 * TAU * ph),
        env = Math.min(1, x / 0.08, (1 - x) / 0.18) * (0.78 + 0.22 * Math.sin(TAU * 26 * t)),
        v = saw * env * amp * 0.11;
      const i = i0 + k;
      Lc[i] = Math.tanh(Lc[i]! + v * 0.9);
      Rc[i] = Math.tanh(Rc[i]! + v);
    }
  };
  return {
    meta: { title: id, W, H, fps: FPS, bpm: BPM, durationFrames: N, raster: "cpu" },
    assets: { images: {}, fonts: P.assets },
    shots,
    audio: (sr) => {
      const [Lc, Rc] = score(sr);
      rev(Lc, Rc, sr, 28, 74, 1);
      rev(Lc, Rc, sr, 74, 96, 0.7);
      rev(Lc, Rc, sr, 324, 348, 0.6);
      return [Lc, Rc];
    },
  };
}

export const mascotTrack = make("vertical", "mascotTrack");
export const mascotTrackSquare = make("square", "mascotTrackSquare");
