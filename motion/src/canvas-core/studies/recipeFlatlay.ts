// STUDY 47 · RECIPE FLAT-LAY (30 s, 60 fps). A top-down stop-motion recipe on a kitchen table: pancakes, made by
// objects that move themselves, one pose at a time. One source, designed for vertical (primary) and square.
// Brief: series/studies/briefs/recipe-flatlay.json · prompt: series/studies/prompts/recipe-flatlay.prompt.md
//
// THE STOP-MOTION CLOCK. The film runs at 60 fps but every pose is held exactly 5 frames (12 poses a second, "on
// twos" at film rate), so everything is drawn from the pose index p = floor(F / 5), never from F. A beat (30
// frames) is exactly 6 poses. Easing lives in the SPACING of poses (the tables below: big steps, then smaller, one
// pose of overshoot back), never in smooth tweening, and there is no motion blur. Every object boils: a seeded
// ±1 px and ±0.3° per pose, so a held shot is never frozen. One overhead light: every object casts the same short
// hard shadow. Quantities follow a standard home recipe (King Arthur Baking's "Simply Perfect Pancakes", see the
// brief's facts); its wording is not copied.
import PACK from "../../../brand/packs/studio/pack.json";
import { rng, type Ctx, type Env } from "../core";
import type { Film, Shot } from "../film";
import { clamp, lerp } from "../kit/motion";
import { usePack } from "../kit/pack";
import { beatScore } from "../kit/score";
import { layout, type Size } from "../kit/sizes";
import { measure, text, type TextOpts } from "../kit/type";
import { rr } from "../kit/ui";

const PK = usePack(PACK),
  C = PK.palette("kitchen"),
  F_ = PK.face;
const FPS = 60,
  BPM = 120,
  N = 1800,
  HOLD = 5; // frames per pose: 12 poses a second, 6 poses a beat
const TAU = Math.PI * 2,
  DEG = Math.PI / 180;

// the timeline, in POSES (× 5 = frames); every step starts on a beat
const S = { title: 0, wet: 30, dry: 96, stir: 156, heat: 210, flip: 276, end: 330 };

// ---- spacing tables: where an object is on each pose after a move starts (0 = from, 1 = to)
/** an arrival: big steps, then smaller, one pose of overshoot, back (one beat) */
const ARRIVE = [0.36, 0.64, 0.84, 0.95, 1.04, 1];
/** a short hop between two nearby spots */
const QUICK = [0.5, 0.88, 1.04, 1];
/** a departure: small first, then faster (hand-placed objects start slow) */
const LEAVE = [0.07, 0.22, 0.48, 0.8, 1];
/** a label popping in and out */
const POP = [0.55, 1.1, 1];
const OUT = [0.75, 0.35, 0];
/** a top-down flip: the pancake's vertical scale, and how high it is (its shadow grows, then shrinks) */
const FLIP = [1, 0.5, 0, -0.5, -1];
const FLIP_LIFT = [1.8, 2.6, 3, 2.6, 1];
/** the end's camera push-in: the overhead camera lowers toward the plate, one pose at a time */
const PUSH = [0.06, 0.15, 0.26, 0.38, 0.5, 0.61, 0.71, 0.8, 0.87, 0.93, 0.97, 1.01, 1];
/** a butter pat dropped from above: bigger while it is closer to the camera, a squash on landing */
const PAT = [1.8, 1.45, 1.18, 0.94, 1];

const at = (tb: number[], i: number) => tb[Math.max(0, Math.min(tb.length - 1, i))]!;
/** a spacing table read at pose p for a move that starts at pose a (0 before it) */
const sp = (p: number, a: number, tb = ARRIVE) => (p < a ? 0 : at(tb, p - a));
/** 0 → 1 in n equal steps, one every `every` poses from pose a (liquids fill this way, never smoothly) */
const steps = (p: number, a: number, n: number, every = 1) =>
  p < a ? 0 : Math.min(n, Math.floor((p - a) / every) + 1) / n;

type Q = { x: number; y: number; r: number };
const q = (x: number, y: number, r = 0): Q => ({ x, y, r });
type Leg = [start: number, to: Q, table?: number[]];
/** a stepped path: from `from`, each leg moves to its spot on the poses of its table */
const path = (p: number, from: Q, legs: Leg[]): Q => {
  let c = from;
  for (const [a, to, tb] of legs) {
    const k = sp(p, a, tb ?? ARRIVE);
    if (k !== 0) c = { x: lerp(c.x, to.x, k), y: lerp(c.y, to.y, k), r: lerp(c.r, to.r, k) };
  }
  return c;
};

// ---- colour
const hexRgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a: string, b: string, t: number) => {
  const A = hexRgb(a),
    B = hexRgb(b);
  return (
    "#" +
    A.map((v, i) =>
      Math.round(lerp(v, B[i]!, t))
        .toString(16)
        .padStart(2, "0"),
    ).join("")
  );
};
const rgba = (h: string, a: number) => `rgba(${hexRgb(h).join(",")},${a})`;
const BASIN = mix(C.surface, C.line, 0.55),
  KRAFT = mix(C.board, C.surface, 0.42),
  SHELL = mix(C.board, C.surface, 0.55),
  WHITE_EGG = mix(C.surface, C.batter, 0.22),
  PALE = mix(C.surface, C.batter, 0.55),
  METAL = C.line,
  PAN_IN = mix(C.deep, C.muted, 0.32),
  SHADOW = rgba(C.deep, 0.18);

const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

type Spot = { x: number; y: number };
type Geo = {
  board: { x: number; y: number; w: number; h: number };
  B: Spot;
  RB: number;
  Bside: Spot;
  eggs: [Spot, Spot];
  jug: Spot;
  butter: Spot;
  sack: Spot;
  S: Spot;
  RS: number;
  spoons: [Spot, Spot, Spot];
  timer: Spot;
  pan: Spot;
  RP: number;
  plateSide: Spot;
  plateEnd: Spot;
  RPL: number;
  k: number; // object scale
  tag: number; // tag type size
  tags: Record<string, Spot & { left?: boolean }>;
  card: { x: number; y: number; num: number; title: number; pad: number; h: number; centre: boolean };
  titleCard: { big: number; sub: number; h: number };
  footer: Spot;
};

function geo(tall: boolean): Geo {
  if (tall)
    return {
      board: { x: 60, y: 505, w: 960, h: 1150 },
      B: { x: 540, y: 850 },
      RB: 190,
      Bside: { x: 255, y: 700 },
      eggs: [
        { x: 160, y: 668 },
        { x: 252, y: 735 },
      ],
      jug: { x: 870, y: 690 },
      butter: { x: 200, y: 990 },
      sack: { x: 880, y: 1265 },
      S: { x: 560, y: 1290 },
      RS: 130,
      spoons: [
        { x: 215, y: 1245 },
        { x: 300, y: 1470 },
        { x: 800, y: 1480 },
      ],
      timer: { x: 800, y: 1400 },
      pan: { x: 560, y: 1205 },
      RP: 235,
      plateSide: { x: 255, y: 705 },
      plateEnd: { x: 540, y: 1040 },
      RPL: 150,
      k: 1,
      tag: 30,
      tags: {
        eggs: { x: 205, y: 548 },
        milk: { x: 897, y: 824 },
        butter: { x: 205, y: 1088 },
        flour: { x: 880, y: 1122 },
        bp: { x: 240, y: 1158 },
        sugar: { x: 300, y: 1545 },
        salt: { x: 800, y: 1552 },
        lumps: { x: 540, y: 1112 },
        rest: { x: 800, y: 1548 },
        cup: { x: 800, y: 890 },
        flip: { x: 540, y: 1532 },
        more: { x: 540, y: 1532 },
      },
      card: { x: 80, y: 250, num: 120, title: 84, pad: 36, h: 176, centre: false },
      titleCard: { big: 150, sub: 34, h: 236 },
      footer: { x: 540, y: 1566 },
    };
  return {
    board: { x: 40, y: 240, w: 1000, h: 800 },
    B: { x: 630, y: 575 },
    RB: 160,
    Bside: { x: 200, y: 440 },
    eggs: [
      { x: 255, y: 405 },
      { x: 340, y: 450 },
    ],
    jug: { x: 910, y: 420 },
    butter: { x: 265, y: 645 },
    sack: { x: 150, y: 865 },
    S: { x: 385, y: 865 },
    RS: 110,
    spoons: [
      { x: 880, y: 740 },
      { x: 880, y: 845 },
      { x: 880, y: 950 },
    ],
    timer: { x: 905, y: 405 },
    pan: { x: 620, y: 655 },
    RP: 205,
    plateSide: { x: 200, y: 440 },
    plateEnd: { x: 560, y: 630 },
    RPL: 130,
    k: 0.85,
    tag: 26,
    tags: {
      eggs: { x: 300, y: 318 },
      milk: { x: 915, y: 592 },
      butter: { x: 265, y: 735 },
      flour: { x: 70, y: 560, left: true },
      bp: { x: 70, y: 616, left: true },
      sugar: { x: 70, y: 672, left: true },
      salt: { x: 70, y: 728, left: true },
      lumps: { x: 630, y: 782 },
      rest: { x: 905, y: 520 },
      cup: { x: 200, y: 648 },
      flip: { x: 600, y: 972 },
      more: { x: 600, y: 972 },
    },
    card: { x: 70, y: 70, num: 76, title: 52, pad: 24, h: 116, centre: false },
    titleCard: { big: 104, sub: 27, h: 168 },
    footer: { x: 560, y: 990 },
  };
}

// the pancakes' spots in the pan (in units of the pan's radius) and their radius
const CAKES: [number, number][] = [
  [-0.4, -0.3],
  [0.4, -0.3],
  [0, 0.38],
];
const CAKE_R = 0.34;
// pose schedule
const EGG = [34, 44]; // leaves home; over the bowl +4; crack +5; split +6; yolk in, halves home from +7
const JUG = 54; // to the rim (settles 58); tilt 60; pours 61–65; stops at 66 (frame 330); home from 67
const BUT = 65; // to the rim (settles 69); drips 70–72 land 71–73; home from 74
const WHISK = [
  { in: 74, turns: [79, 90], out: 91, bowl: "B" },
  { in: 140, turns: [145, 150], out: 151, bowl: "S" },
  { in: 170, turns: [175, 188], out: 189, bowl: "B" },
] as const;
const SACK = 102; // to S (settles 106); tilt 107; pours 108–112; home from 113
const SPOON = [114, 121, 128]; // to S (settles +4); tip +5; home from +6
const TIP = 158; // S to B (settles 162); tip 163; pours 164–168; leaves 170
const LADLE = 214; // in to B (settles 218, dips 219); pour k: moves at 220 + 7k, pours +3 … +6 (the last ends at 240)
const pourAt = (k: number) => 223 + 7 * k;
const flipAt = (k: number) => S.flip + 6 * k; // one per beat
const hopAt = (k: number) => 300 + 6 * k;
const BUBBLES = 244;
const TIMER = 180; // the timer steps in (on a beat); its dial runs from TIMER + 6
const PAN_OUT = 318; // the pan leaves as the last cake lands on the plate (a beat)
const PLATE_IN = 324; // then the plate steps to the centre (a beat)
/** the stop-motion camera bump on each step hit: nudged in, then back, one pose each */
const BUMP = [1.04, 1.015];

export function make(size: Size, id: string): Film {
  const L = layout(size),
    { W, H, u, tall } = L,
    G = geo(tall);
  const s = (v: number) => v * u;
  let pose = 0,
    DPR = 1;

  // ---- the set, generated once per size: linen threads and board grain
  const R0 = rng(hash(size) + 47);
  const threads: [number, number, number, number, number][] = []; // x, y, w, h, alpha
  for (let y = 0; y < H; y += s(3.2))
    if (R0() < 0.55) {
      const x0 = R0() * W * 0.6,
        len = W * (0.3 + R0() * 0.9);
      threads.push([x0 - W * 0.2, y, len, s(1.1), 0.035 + R0() * 0.06]);
    }
  for (let x = 0; x < W; x += s(3.2))
    if (R0() < 0.55) {
      const y0 = R0() * H * 0.6,
        len = H * (0.3 + R0() * 0.9);
      threads.push([x, y0 - H * 0.2, s(1.1), len, 0.03 + R0() * 0.05]);
    }
  const slubs = Array.from({ length: 70 }, () => [R0() * W, R0() * H, s(6 + R0() * 14)] as const);
  const bd = { x: s(G.board.x), y: s(G.board.y), w: s(G.board.w), h: s(G.board.h) };
  const grain = Array.from({ length: 11 }, (_, i) => ({
    y: bd.y + ((i + 0.5 + (R0() - 0.5) * 0.6) / 11) * bd.h,
    amp: s(4 + R0() * 10),
    f: 1 + R0() * 2.5,
    ph: R0() * TAU,
    x0: bd.x + R0() * bd.w * 0.3,
    x1: bd.x + bd.w * (0.7 + R0() * 0.3),
  }));
  const knots = Array.from({ length: 2 }, () => {
    let k = { x: 0, y: 0 };
    for (let i = 0; i < 60; i++) {
      k = { x: bd.x + bd.w * (0.15 + R0() * 0.7), y: bd.y + bd.h * (0.1 + R0() * 0.8) };
      // where the knot lands on screen once the end's camera has pushed in: keep it off the footer
      const ax = s(G.plateEnd.x),
        ay = s(G.plateEnd.y),
        clear = [1.5, 1.62].every((Z) => {
          const sx = ax + (k.x - ax) * Z,
            sy = ay + (k.y - ay) * Z;
          return Math.abs(sy - s(G.footer.y)) > s(80) || Math.abs(sx - s(G.footer.x)) > s(380);
        });
      if (clear) break;
    }
    return k;
  });
  // bubbles on each pancake: where, when they appear, how long they sit before popping
  const bubbles = CAKES.map((_, k) => {
    const r = rng(900 + k * 31);
    return Array.from({ length: 15 }, () => {
      const a = r() * TAU,
        d = Math.sqrt(r()) * 0.72;
      return {
        x: Math.cos(a) * d,
        y: Math.sin(a) * d,
        rad: 0.1 + r() * 0.06,
        b: BUBBLES + Math.floor(r() * 26),
        life: 2 + Math.floor(r() * 4),
      };
    });
  });
  const lumps = Array.from({ length: 6 }, (_, i) => {
    const r = rng(333 + i * 7),
      a = r() * TAU,
      d = 0.2 + r() * 0.5;
    return { x: Math.cos(a) * d, y: Math.sin(a) * d, rad: 0.035 + r() * 0.03 };
  });

  // ---- drawing primitives
  const circ = (ctx: Ctx, x: number, y: number, r: number) => {
    ctx.beginPath();
    ctx.arc(x, y, Math.max(0, r), 0, TAU);
  };
  /** fill the current path, casting the overhead light's hard shadow (lift > 1: the object is off the table) */
  const solid = (ctx: Ctx, fill: string, lift = 1) => {
    ctx.save();
    ctx.shadowColor = SHADOW;
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = ctx.shadowOffsetY = s(6) * lift * DPR;
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.restore();
  };
  const fill = (ctx: Ctx, c: string) => {
    ctx.fillStyle = c;
    ctx.fill();
  };
  const stroke = (ctx: Ctx, c: string, lw: number) => {
    ctx.strokeStyle = c;
    ctx.lineWidth = lw;
    ctx.stroke();
  };
  /** place an object: its spot, plus the boil (every pose it is re-placed by hand: ±1 px, ±0.3°) */
  const put = (ctx: Ctx, key: string, at: Q, draw: (ctx: Ctx) => void, sx = 1, sy = sx) => {
    const r = rng(hash(key) ^ Math.imul(pose + 17, 0x9e3779b1));
    const dx = (r() * 2 - 1) * u,
      dy = (r() * 2 - 1) * u,
      dr = (r() * 2 - 1) * 0.3 * DEG;
    ctx.save();
    ctx.translate(at.x + dx, at.y + dy);
    ctx.rotate(at.r + dr);
    ctx.scale(sx, sy);
    draw(ctx);
    ctx.restore();
  };
  const P = (sp: Spot, r = 0) => q(s(sp.x), s(sp.y), r);
  /** a spot just off the nearest (or a named) frame edge */
  const off = (a: Q, side: "l" | "r" | "t" | "b", d = 240): Q =>
    side === "l"
      ? q(-s(d), a.y, a.r)
      : side === "r"
        ? q(W + s(d), a.y, a.r)
        : side === "t"
          ? q(a.x, -s(d), a.r)
          : q(a.x, H + s(d), a.r);
  /** a spot on a bowl's rim, facing its centre (the object's +x points in) */
  const rim = (c: Q, R: number, ang: number, extra: number): Q =>
    q(c.x + Math.cos(ang) * (R + extra), c.y + Math.sin(ang) * (R + extra), ang + Math.PI);
  /** a soft lobed heap (flour, a mound on a spoon) */
  const heap = (ctx: Ctx, r: number, seed: number, lobes = 7) => {
    const g = rng(seed);
    ctx.beginPath();
    for (let i = 0; i <= lobes * 3; i++) {
      const a = (i / (lobes * 3)) * TAU,
        rr_ = r * (0.86 + 0.14 * Math.abs(Math.sin((a * lobes) / 2)) + (i % 3 === 0 ? g() * 0.05 : 0));
      if (i) ctx.lineTo(Math.cos(a) * rr_, Math.sin(a) * rr_);
      else ctx.moveTo(Math.cos(a) * rr_, Math.sin(a) * rr_);
    }
    ctx.closePath();
  };
  const dots = (ctx: Ctx, r: number, n: number, seed: number, c: string, dr: number) => {
    const g = rng(seed);
    ctx.fillStyle = c;
    for (let i = 0; i < n; i++) {
      const a = g() * TAU,
        d = Math.sqrt(g()) * r;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * d, Math.sin(a) * d, dr, 0, TAU);
      ctx.fill();
    }
  };
  /** a tapered pour stream between two world points (held while a pour lasts; it changes with every pose) */
  const stream = (ctx: Ctx, key: string, a: Spot, b: Spot, w0: number, w1: number, c: string) => {
    const r = rng(hash(key) + pose * 13),
      dx = b.x - a.x,
      dy = b.y - a.y,
      l = Math.hypot(dx, dy) || 1,
      nx = -dy / l,
      ny = dx / l,
      bow = (r() - 0.5) * s(10),
      mx = (a.x + b.x) / 2 + nx * bow,
      my = (a.y + b.y) / 2 + ny * bow,
      wm = (w0 + w1) / 2;
    ctx.beginPath();
    ctx.moveTo(a.x + (nx * w0) / 2, a.y + (ny * w0) / 2);
    ctx.quadraticCurveTo(mx + (nx * wm) / 2, my + (ny * wm) / 2, b.x + (nx * w1) / 2, b.y + (ny * w1) / 2);
    ctx.lineTo(b.x - (nx * w1) / 2, b.y - (ny * w1) / 2);
    ctx.quadraticCurveTo(mx - (nx * wm) / 2, my - (ny * wm) / 2, a.x - (nx * w0) / 2, a.y - (ny * w0) / 2);
    ctx.closePath();
    solid(ctx, c, 1.6);
    stroke(ctx, mix(c, C.muted, 0.35), s(1.5));
  };

  // ---- the table
  const table = (ctx: Ctx) => {
    ctx.fillStyle = C.ground;
    ctx.fillRect(0, 0, W, H);
    for (const [x, y, w, h, a] of threads) {
      ctx.fillStyle = rgba(C.muted, a);
      ctx.fillRect(x, y, w, h);
    }
    ctx.fillStyle = rgba(C.muted, 0.05);
    for (const [x, y, l] of slubs) ctx.fillRect(x, y, l, s(1.6));
    rr(ctx, bd.x, bd.y, bd.w, bd.h, s(28));
    solid(ctx, C.board);
    ctx.save();
    rr(ctx, bd.x, bd.y, bd.w, bd.h, s(28));
    ctx.clip();
    ctx.lineCap = "round";
    for (const g of grain) {
      ctx.beginPath();
      for (let x = g.x0; x <= g.x1; x += s(16)) {
        const y = g.y + Math.sin(((x - bd.x) / bd.w) * TAU * g.f + g.ph) * g.amp;
        if (x === g.x0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      stroke(ctx, rgba(C.crust, 0.28), s(2.2));
    }
    for (const k of knots) {
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.ellipse(k.x, k.y, s(12 + i * 11), s(5 + i * 6), 0, 0, TAU);
        stroke(ctx, rgba(C.crust, 0.25), s(2));
      }
    }
    ctx.restore();
  };

  // ---- objects (local coordinates, centred on 0,0; sizes × K)
  const bowl = (ctx: Ctx, R: number, inner: (ctx: Ctx, r: number) => void) => {
    circ(ctx, 0, 0, R);
    solid(ctx, C.surface);
    circ(ctx, 0, 0, R - s(3.5));
    stroke(ctx, C.line, s(7));
    const r = R * 0.8;
    circ(ctx, 0, 0, r);
    fill(ctx, BASIN);
    // the inner ellipse: the basin's far wall catches the light
    ctx.save();
    circ(ctx, 0, 0, r);
    ctx.clip();
    ctx.beginPath();
    ctx.ellipse(R * 0.04, R * 0.05, r * 0.97, r * 0.95, 0, 0, TAU);
    fill(ctx, mix(BASIN, C.surface, 0.3));
    inner(ctx, r);
    ctx.restore();
    circ(ctx, 0, 0, r);
    stroke(ctx, mix(C.line, C.muted, 0.2), s(2));
  };
  const swirl = (ctx: Ctx, r: number, turn: number, c: string) => {
    ctx.save();
    ctx.rotate(turn);
    ctx.lineCap = "round";
    for (const [rad, a0] of [
      [0.55, 0],
      [0.32, 2.4],
      [0.7, 3.6],
    ] as const) {
      ctx.beginPath();
      ctx.arc(0, 0, r * rad, a0, a0 + 1.5);
      stroke(ctx, c, s(4));
    }
    ctx.restore();
  };
  // the big bowl: eggs, milk, butter, whisked pale; then the dry mix, whisked to batter with a few lumps
  const bigInner = (ctx: Ctx, r: number) => {
    const p = pose,
      milk = steps(p, JUG + 7, 5),
      pale = steps(p, 81, 4, 3),
      flourIn = steps(p, TIP + 6, 5),
      batter = steps(p, 177, 4, 3),
      scoop = steps(p, LADLE + 5, 1);
    let frac = milk ? lerp(0.36, 0.84, milk) : 0,
      col = mix(C.surface, PALE, pale);
    if (batter) {
      col = mix(PALE, C.batter, batter);
      frac = lerp(0.84, 0.92, batter);
    }
    frac -= scoop * 0.24;
    if (frac > 0) {
      circ(ctx, 0, 0, r * frac);
      fill(ctx, col);
    }
    // eggs: whites and yolks, until the whisk takes them
    EGG.forEach((a, k) => {
      if (p < a + 7 || pale >= 1) return;
      const e = eggSpot(k);
      ctx.save();
      ctx.translate(e.x * r, e.y * r);
      heap(ctx, r * 0.3 * (1 - pale), 70 + k, 5);
      fill(ctx, milk ? mix(C.surface, WHITE_EGG, 0.5) : WHITE_EGG);
      circ(ctx, 0, 0, r * 0.13 * (1 - pale));
      fill(ctx, C.accent);
      ctx.restore();
    });
    // melted butter, dripped in
    for (let i = 0; i < 3; i++) {
      if (p < BUT + 6 + i || pale >= 1) continue;
      circ(ctx, r * (-0.3 + i * 0.12), r * (0.05 + i * 0.1), r * (0.07 - i * 0.008) * (1 - pale));
      fill(ctx, C.butter);
    }
    // the dry mix tipped in, then whisked away (a few lumps stay)
    if (flourIn && batter < 1) {
      ctx.save();
      ctx.translate(r * 0.18, r * 0.12);
      heap(ctx, r * lerp(0.2, 0.55, flourIn) * (1 - batter), 81);
      fill(ctx, C.surface);
      stroke(ctx, C.line, s(2));
      dots(ctx, r * 0.4 * (1 - batter), 14, 82, C.line, s(2.2));
      ctx.restore();
    }
    if (batter >= 0.5)
      for (const l of lumps.slice(0, batter >= 1 ? 6 : 4)) {
        circ(ctx, l.x * r, l.y * r, l.rad * r);
        fill(ctx, mix(C.batter, C.surface, 0.55));
        stroke(ctx, mix(C.batter, C.crust, 0.35), s(1.5));
      }
    const w = whiskState("B");
    if (w.turning) swirl(ctx, r, w.turn, rgba(C.crust, 0.35));
  };
  // the small bowl: a flour heap, three spoon mounds, whisked into one dry mix, then tipped out
  const smallInner = (ctx: Ctx, r: number) => {
    const p = pose,
      hp = steps(p, SACK + 6, 5),
      merged = steps(p, 146, 3, 2),
      empty = steps(p, TIP + 6, 5);
    const keep = 1 - empty;
    if (hp && keep > 0) {
      ctx.save();
      ctx.translate(r * 0.08 * (1 - merged), -r * 0.06 * (1 - merged));
      heap(ctx, r * lerp(lerp(0.3, 0.62, hp), 0.8, merged) * keep, 91);
      fill(ctx, C.surface);
      stroke(ctx, C.line, s(2));
      dots(ctx, r * 0.55 * keep, 16, 92, C.line, s(2.2));
      ctx.restore();
    }
    SPOON.forEach((a, k) => {
      if (p < a + 5 || merged >= 1) return;
      const d = spoonDir(k);
      ctx.save();
      ctx.translate(Math.cos(d) * r * 0.42, Math.sin(d) * r * 0.42);
      heap(ctx, r * 0.2 * (1 - merged), 95 + k, 5);
      fill(ctx, k === 1 ? mix(C.surface, C.batter, 0.25) : C.surface);
      stroke(ctx, C.line, s(1.8));
      dots(ctx, r * 0.14, k === 2 ? 9 : 5, 97 + k, k === 1 ? C.line : C.muted, s(k === 2 ? 1.4 : 2));
      ctx.restore();
    });
    const w = whiskState("S");
    if (w.turning) swirl(ctx, r, w.turn, rgba(C.muted, 0.3));
  };
  const egg = (ctx: Ctx, stage: number) => {
    // stage 0 whole · 1 crack (a zigzag) · 2 split, the yolk dropping · 3 halves apart (the shells)
    const rx = s(33),
      ry = s(43),
      zig = (sign: number) => {
        ctx.beginPath();
        ctx.moveTo(-rx * 1.2, 0);
        for (let i = 0; i <= 6; i++) ctx.lineTo(-rx + (i / 6) * 2 * rx, i % 2 ? s(7) : -s(7));
        ctx.lineTo(rx * 1.2, 0);
        ctx.lineTo(rx * 1.2, sign * ry * 1.3);
        ctx.lineTo(-rx * 1.2, sign * ry * 1.3);
        ctx.closePath();
      };
    if (stage < 2) {
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, TAU);
      solid(ctx, SHELL);
      stroke(ctx, mix(SHELL, C.muted, 0.35), s(2));
      ctx.beginPath();
      ctx.ellipse(-rx * 0.3, -ry * 0.35, rx * 0.25, ry * 0.18, -0.5, 0, TAU);
      fill(ctx, mix(SHELL, C.surface, 0.5));
      if (stage === 1) {
        ctx.beginPath();
        ctx.moveTo(-rx, 0);
        for (let i = 0; i <= 6; i++) ctx.lineTo(-rx + (i / 6) * 2 * rx, i % 2 ? s(7) : -s(7));
        stroke(ctx, C.ink, s(2.5));
      }
      return;
    }
    const gap = stage === 2 ? s(14) : s(34);
    if (stage === 2) {
      circ(ctx, 0, 0, s(17));
      fill(ctx, C.accent);
    }
    for (const sign of [-1, 1]) {
      ctx.save();
      ctx.translate(0, sign * gap);
      zig(sign);
      ctx.clip();
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, TAU);
      solid(ctx, SHELL);
      ctx.beginPath();
      ctx.ellipse(0, 0, rx - s(5), ry - s(5), 0, 0, TAU);
      fill(ctx, C.surface);
      ctx.restore();
    }
  };
  const jug = (ctx: Ctx, full: number, tilt: number) => {
    ctx.scale(1 - 0.14 * tilt, 1);
    ctx.beginPath();
    ctx.arc(-s(62), 0, s(26), Math.PI * 0.5, Math.PI * 1.5);
    ctx.save();
    ctx.shadowColor = SHADOW;
    ctx.shadowOffsetX = ctx.shadowOffsetY = s(6) * DPR;
    stroke(ctx, C.accent2, s(13));
    ctx.restore();
    ctx.beginPath();
    ctx.moveTo(s(50), -s(22));
    ctx.lineTo(s(86), 0);
    ctx.lineTo(s(50), s(22));
    ctx.closePath();
    solid(ctx, C.accent2);
    circ(ctx, 0, 0, s(62));
    solid(ctx, C.accent2);
    circ(ctx, 0, 0, s(52));
    fill(ctx, mix(C.accent2, C.deep, 0.35));
    if (full > 0) {
      circ(ctx, s(8) * tilt, 0, s(47) * Math.sqrt(full));
      fill(ctx, C.surface);
    }
  };
  const butterDish = (ctx: Ctx, pool: number) => {
    rr(ctx, -s(64), -s(46), s(128), s(92), s(24));
    solid(ctx, C.surface);
    stroke(ctx, C.line, s(3));
    rr(ctx, -s(50), -s(33), s(100), s(66), s(18));
    fill(ctx, BASIN);
    if (pool > 0) {
      ctx.save();
      ctx.scale(1.3, 0.85);
      heap(ctx, s(28) * Math.sqrt(pool), 55, 5);
      ctx.restore();
      fill(ctx, C.butter);
      circ(ctx, -s(8), -s(6), s(9) * pool);
      fill(ctx, mix(C.butter, C.surface, 0.45));
    }
  };
  const sack = (ctx: Ctx, tilt: number) => {
    ctx.scale(1, 1 - 0.18 * tilt);
    rr(ctx, -s(80), -s(100), s(160), s(200), s(16));
    solid(ctx, KRAFT);
    rr(ctx, -s(80), -s(100), s(160), s(46), s(16));
    fill(ctx, mix(KRAFT, C.crust, 0.18));
    ctx.beginPath();
    ctx.ellipse(0, -s(84), s(56), s(14 + 8 * tilt), 0, 0, TAU);
    fill(ctx, C.surface);
    circ(ctx, 0, s(28), s(38));
    fill(ctx, C.surface);
    // a sprig on the label
    ctx.save();
    ctx.translate(0, s(28));
    ctx.fillStyle = C.line;
    for (let i = 0; i < 3; i++)
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(side * s(7), s(12) - i * s(12), s(8), s(4), side * 0.6, 0, TAU);
        ctx.fill();
      }
    ctx.fillRect(-s(1.5), -s(20), s(3), s(40));
    ctx.restore();
  };
  const spoon = (ctx: Ctx, k: number, full: boolean, tip: boolean) => {
    const big = k === 1 ? 1.25 : 1;
    rr(ctx, -s(140), -s(8), s(118), s(16), s(8));
    solid(ctx, METAL);
    stroke(ctx, C.muted, s(1.5));
    ctx.save();
    ctx.scale(big, tip ? 0.42 : 1);
    ctx.beginPath();
    ctx.ellipse(0, 0, s(30), s(24), 0, 0, TAU);
    solid(ctx, METAL);
    stroke(ctx, C.muted, s(2));
    if (full) {
      ctx.translate(0, -s(3));
      heap(ctx, s(21), 95 + k, 5);
      fill(ctx, k === 1 ? mix(C.surface, C.batter, 0.25) : C.surface);
      stroke(ctx, C.line, s(1.5));
      dots(ctx, s(14), k === 2 ? 9 : 5, 97 + k, k === 1 ? C.line : C.muted, s(k === 2 ? 1.3 : 1.8));
    }
    ctx.restore();
  };
  const whisk = (ctx: Ctx, R: number) => {
    rr(ctx, R * 0.34, -s(13), R * 1.05, s(26), s(13));
    solid(ctx, C.accent2, 2.2);
    rr(ctx, R * 0.28, -s(9), s(26), s(18), s(4));
    fill(ctx, C.muted);
    ctx.lineWidth = s(3);
    ctx.strokeStyle = mix(C.muted, C.ink, 0.2);
    for (const ry of [0.1, 0.2, 0.3, 0.38]) {
      ctx.beginPath();
      ctx.ellipse(-R * 0.12, 0, R * 0.44, R * ry, 0, 0, TAU);
      ctx.stroke();
    }
  };
  const timer = (ctx: Ctx, minutes: number) => {
    rr(ctx, -s(15), -s(92), s(30), s(26), s(6));
    solid(ctx, C.accent2);
    circ(ctx, 0, 0, s(72));
    solid(ctx, C.accent2);
    circ(ctx, 0, 0, s(56));
    fill(ctx, C.surface);
    const a0 = -Math.PI / 2,
      a1 = a0 + (minutes / 60) * TAU;
    if (minutes > 0) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, s(50), a0, a1);
      ctx.closePath();
      fill(ctx, mix(C.accent2, C.surface, 0.55));
    }
    ctx.lineCap = "round";
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU,
        l = i % 3 ? 6 : 11;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * s(52), Math.sin(a) * s(52));
      ctx.lineTo(Math.cos(a) * s(52 - l), Math.sin(a) * s(52 - l));
      stroke(ctx, C.ink, s(3));
    }
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a1) * s(42), Math.sin(a1) * s(42));
    stroke(ctx, C.ink, s(5));
    circ(ctx, 0, 0, s(7));
    fill(ctx, C.ink);
  };
  const ladle = (ctx: Ctx, full: number, tilt: boolean) => {
    rr(ctx, s(34), -s(8), s(190), s(16), s(8));
    solid(ctx, METAL, 2.4);
    stroke(ctx, C.muted, s(1.5));
    circ(ctx, s(222), 0, s(12));
    fill(ctx, METAL);
    stroke(ctx, C.muted, s(1.5));
    ctx.save();
    ctx.scale(1, tilt ? 0.66 : 1);
    circ(ctx, 0, 0, s(46));
    solid(ctx, METAL, 2.4);
    stroke(ctx, C.muted, s(2.5));
    circ(ctx, 0, 0, s(37));
    fill(ctx, mix(METAL, C.muted, 0.3));
    if (full > 0) {
      circ(ctx, 0, 0, s(33) * Math.sqrt(full));
      fill(ctx, C.batter);
    }
    ctx.restore();
  };
  const hob = (ctx: Ctx, R: number) => {
    // a cast-iron ring (open in the middle: the board shows through until the pan covers it)
    ctx.save();
    ctx.shadowColor = SHADOW;
    ctx.shadowOffsetX = ctx.shadowOffsetY = s(6) * DPR;
    circ(ctx, 0, 0, R + s(14));
    stroke(ctx, C.deep, s(30));
    circ(ctx, 0, 0, R * 0.45);
    stroke(ctx, C.deep, s(16));
    ctx.restore();
    circ(ctx, 0, 0, R + s(14));
    stroke(ctx, C.muted, s(3));
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + (i * Math.PI) / 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * (R - s(10)), Math.sin(a) * (R - s(10)));
      ctx.lineTo(Math.cos(a) * (R + s(26)), Math.sin(a) * (R + s(26)));
      stroke(ctx, C.muted, s(8));
    }
  };
  const pancake = (ctx: Ctx, r: number, gold: boolean, cook: number, seed: number, lift = 1) => {
    const g = rng(seed);
    ctx.beginPath();
    for (let i = 0; i <= 18; i++) {
      const a = (i / 18) * TAU,
        rr_ = r * (0.97 + 0.03 * Math.sin(a * 3 + seed) + (g() - 0.5) * 0.02);
      if (i) ctx.lineTo(Math.cos(a) * rr_, Math.sin(a) * rr_);
      else ctx.moveTo(Math.cos(a) * rr_, Math.sin(a) * rr_);
    }
    ctx.closePath();
    if (gold) {
      solid(ctx, C.accent, lift);
      stroke(ctx, C.crust, s(7));
      for (let i = 0; i < 4; i++) {
        const a = g() * TAU,
          d = g() * r * 0.5;
        ctx.beginPath();
        ctx.ellipse(Math.cos(a) * d, Math.sin(a) * d, r * (0.12 + g() * 0.1), r * (0.08 + g() * 0.06), g() * 3, 0, TAU);
        fill(ctx, mix(C.accent, C.batter, 0.4));
      }
    } else {
      solid(ctx, C.batter, lift);
      stroke(ctx, mix(C.batter, C.crust, 0.18 + 0.5 * cook), s(4 + 3 * cook));
    }
  };
  const plate = (ctx: Ctx, R: number) => {
    circ(ctx, 0, 0, R);
    solid(ctx, C.surface);
    circ(ctx, 0, 0, R * 0.74);
    stroke(ctx, C.line, s(3));
  };
  const pat = (ctx: Ctx) => {
    rr(ctx, -s(24), -s(20), s(48), s(40), s(8));
    solid(ctx, C.butter);
    stroke(ctx, mix(C.butter, C.crust, 0.4), s(2));
    rr(ctx, -s(16), -s(13), s(18), s(10), s(4));
    fill(ctx, mix(C.butter, C.surface, 0.5));
  };

  // ---- where things are on a pose
  const Bq = (p: number) =>
    path(p, P(G.B), [
      [S.heat, P(G.Bside)],
      [S.flip - 6, off(P(G.Bside), "l", 300), LEAVE],
    ]);
  const Sq = (p: number) => {
    const home = P(G.S),
      b = Bq(TIP),
      d = Math.atan2(home.y - b.y, home.x - b.x),
      tipSpot = q(b.x + Math.cos(d) * (s(G.RB) + s(G.RS) * 0.5), b.y + Math.sin(d) * (s(G.RB) + s(G.RS) * 0.5), 0);
    return path(p, off(home, "b", 200), [
      [S.dry, home],
      [TIP, tipSpot],
      [TIP + 12, off(tipSpot, "b", 260), LEAVE],
    ]);
  };
  /** where on the big bowl's basin egg k lands (in units of the basin radius) */
  const eggSpot = (k: number) => (k ? { x: 0.3, y: 0.16 } : { x: -0.28, y: -0.22 });
  const spoonDir = (k: number) => {
    const h = P(G.spoons[k]!),
      c = P(G.S);
    return Math.atan2(h.y - c.y, h.x - c.x);
  };
  const whiskState = (bowlId: "B" | "S") => {
    const p = pose;
    for (const w of WHISK) {
      if (w.bowl !== bowlId || p < w.in || p >= w.out + 5) continue;
      const n = clamp(p - w.turns[0] + 1, 0, w.turns[1] - w.turns[0] + 1);
      return { on: true, w, turning: p >= w.turns[0] && p <= w.turns[1], turn: (n * Math.PI) / 2 };
    }
    return { on: false, w: WHISK[0], turning: false, turn: 0 };
  };

  // ---- labels: quantity tags beside their objects, and the step card
  const tagO = (): TextOpts => ({ size: s(G.tag), family: F_.sans, weight: 600, color: C.ink, track: -0.005 });
  const tag = (ctx: Ctx, key: string, str: string, a: number, b: number) => {
    const p = pose,
      k = p < a ? 0 : p >= b ? at(OUT, p - b) : at(POP, p - a);
    if (k <= 0) return;
    const t = G.tags[key]!,
      o = tagO(),
      padX = s(G.tag * 0.55),
      w = measure(ctx, str, o) + 2 * padX,
      h = s(G.tag * 1.62);
    let x = s(t.x) + (t.left ? w / 2 : 0);
    x = clamp(x, L.safe.x + w / 2, W - L.safe.x - w / 2);
    put(
      ctx,
      "tag" + key,
      q(x, s(t.y)),
      (c) => {
        rr(c, -w / 2, -h / 2, w, h, h * 0.32);
        solid(c, C.surface);
        text(c, str, -w / 2 + padX, s(G.tag * 0.36), o);
      },
      k,
    );
  };
  const stepCard = (ctx: Ctx, key: string, num: string, title: string, a: number, b: number) => {
    const p = pose,
      kin = sp(p, a),
      kout = sp(p, b, LEAVE);
    if (kin <= 0 || kout >= 1) return;
    const cd = G.card,
      numO: TextOpts = { size: s(cd.num), family: F_.sans, weight: 800, color: C.ink, track: -0.04 },
      titO: TextOpts = { size: s(cd.title), family: F_.italic, color: C.ink, track: -0.005 };
    const nw = measure(ctx, num, numO),
      tw = measure(ctx, title, titO),
      pad = s(cd.pad),
      gap = s(cd.pad * 0.8),
      w = pad * 2 + nw + gap + tw,
      h = s(cd.h);
    const x0 = s(cd.x) + w / 2,
      y0 = s(cd.y) + h / 2;
    const x = lerp(-w / 2 - s(40), x0, kin),
      y = lerp(y0, -h, kout);
    put(ctx, "card" + key, q(x, y), (c) => {
      rr(c, -w / 2, -h / 2, w, h, s(22));
      solid(c, C.surface);
      const base = s(cd.num * 0.36);
      text(c, num, -w / 2 + pad, base, numO);
      c.fillStyle = C.line;
      c.fillRect(-w / 2 + pad + nw + gap * 0.42, -h * 0.28, s(3), h * 0.56);
      text(c, title, -w / 2 + pad + nw + gap, base, titO);
    });
  };
  /** the title and end cards: the dish's name large in the serif, one line of Inter under it */
  const nameCard = (ctx: Ctx, key: string, big: string, sub: string, a: number, b: number) => {
    const p = pose,
      kin = sp(p, a),
      kout = sp(p, b, LEAVE);
    if (kin <= 0 || kout >= 1) return;
    const tc = G.titleCard,
      bigO: TextOpts = { size: s(tc.big), family: F_.serif, color: C.ink, track: -0.015 },
      subO: TextOpts = { size: s(tc.sub), family: F_.sans, weight: 600, color: C.ink, track: -0.005 };
    const bw = measure(ctx, big, bigO),
      sw = measure(ctx, sub, subO),
      pad = s(tall ? 44 : 28),
      w = tall ? W - 2 * L.safe.x : Math.max(bw, sw) + 2 * pad,
      h = s(tc.h);
    const x0 = tall ? W / 2 : s(G.card.x) + w / 2,
      y0 = s(G.card.y) + h / 2;
    const y = lerp(-h, y0, kin),
      y2 = lerp(y, -h, kout);
    put(ctx, "name" + key, q(x0, y2), (c) => {
      rr(c, -w / 2, -h / 2, w, h, s(24));
      solid(c, C.surface);
      const left = tall ? -bw / 2 : -w / 2 + pad,
        left2 = tall ? -sw / 2 : -w / 2 + pad;
      text(c, big, left, -h / 2 + pad * 0.55 + s(tc.big * 0.78), bigO);
      text(c, sub, left2, h / 2 - pad * 0.9, subO);
    });
  };

  // ---- the frame
  const paint = (ctx: Ctx, env: Env, F: number) => {
    F = clamp(Math.floor(F), 0, N - 1);
    pose = Math.floor(F / HOLD);
    DPR = env.scale;
    const p = pose;
    ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
    ctx.lineJoin = "round";
    // the end: the camera steps down toward the plate (the cards and footer stay put, drawn after)
    const push = sp(p, S.end + 1, PUSH),
      Z = 1 + (tall ? 0.55 : 0.5) * push + (p > S.end + 13 ? 0.004 * (p - S.end - 13) : 0);
    ctx.save();
    const hit = [S.wet, S.dry, S.stir, S.heat, S.flip].find((h) => p - h >= 0 && p - h < BUMP.length);
    if (hit !== undefined) {
      const zb = BUMP[p - hit]!,
        bx = bd.x + bd.w / 2,
        by = bd.y + bd.h / 2;
      ctx.translate(bx, by);
      ctx.scale(zb, zb);
      ctx.translate(-bx, -by);
    }
    if (Z > 1) {
      const ax = s(G.plateEnd.x),
        ay = s(G.plateEnd.y);
      ctx.translate(ax, ay);
      ctx.scale(Z, Z);
      ctx.translate(-ax, -ay);
    }
    table(ctx);

    const RB = s(G.RB),
      RS = s(G.RS),
      RP = s(G.RP),
      RPL = s(G.RPL);
    const b = Bq(p);

    // the hob and the pan (step 04 on)
    const hobQ = path(p, off(P(G.pan), "r", 520), [
      [S.heat + 1, P(G.pan)],
      [PAN_OUT + 1, off(P(G.pan), "r", 520), LEAVE],
    ]);
    const panQ = path(p, off(P(G.pan), "r", 560), [
      [S.heat + 3, P(G.pan)],
      [PAN_OUT, off(P(G.pan), "r", 560), LEAVE],
    ]);
    const onPan = (k: number, pq: Q) => ({ x: pq.x + CAKES[k]![0] * RP, y: pq.y + CAKES[k]![1] * RP });
    if (p >= S.heat + 1 && p < PAN_OUT + 6) put(ctx, "hob", hobQ, (c) => hob(c, RP));
    if (p >= S.heat + 3 && p < PAN_OUT + 5)
      put(ctx, "pan", panQ, (c) => {
        rr(c, RP - s(20), -s(22), s(215), s(44), s(22));
        solid(c, C.deep);
        circ(c, RP + s(170), 0, s(10));
        fill(c, PAN_IN);
        circ(c, 0, 0, RP);
        solid(c, C.deep);
        circ(c, 0, 0, RP - s(16));
        fill(c, PAN_IN);
        CAKES.forEach(([cx, cy], k) => {
          const a = pourAt(k),
            f = flipAt(k);
          if (p < a || p >= hopAt(k)) return;
          const grow = steps(p, a, 4),
            r = RP * CAKE_R * lerp(0.32, 1, grow),
            cook = steps(p, BUBBLES, 5, 6),
            flipping = p >= f && p < f + 5;
          const sy = flipping ? at(FLIP, p - f) : 1,
            gold = p >= f + 3,
            lift = flipping ? at(FLIP_LIFT, p - f) : 1,
            up = flipping ? 1 + 0.05 * (lift - 1) : 1;
          put(c, "cake" + k, q(cx * RP, cy * RP), (cc) => {
            cc.scale(up, up);
            if (Math.abs(sy) < 0.1) {
              rr(cc, -r, -s(6), 2 * r, s(12), s(6));
              solid(cc, C.crust, lift);
              return;
            }
            cc.scale(1, Math.abs(sy));
            pancake(cc, r, gold, cook, 11 + k, lift);
            if (gold || flipping) return;
            // bubbles: a ring that sits a few poses, then pops: ring, dot, gone (a faint pit stays)
            for (const bb of bubbles[k]!) {
              if (p < bb.b) continue;
              const age = p - bb.b,
                bx = bb.x * r,
                by = bb.y * r,
                br = bb.rad * r;
              if (age <= bb.life) {
                circ(cc, bx, by, br * (age === 0 ? 0.7 : 1));
                stroke(cc, mix(C.batter, C.crust, 0.8), s(4.5));
              } else if (age === bb.life + 1) {
                circ(cc, bx, by, br * 0.5);
                fill(cc, mix(C.batter, C.crust, 0.8));
              } else {
                circ(cc, bx, by, br * 0.3);
                fill(cc, mix(C.batter, C.crust, 0.45));
              }
            }
          });
        });
      });

    // the big bowl
    if (p < S.flip + 6) put(ctx, "bowlB", b, (c) => bowl(c, RB, bigInner));
    // the small bowl
    if (p >= S.dry && p < TIP + 18) put(ctx, "bowlS", Sq(p), (c) => bowl(c, RS, smallInner));

    // the plate, with the stack
    const plateQ = path(p, off(P(G.plateSide), "l", 260), [
      [S.flip + 18, P(G.plateSide)],
      [PLATE_IN, P(G.plateEnd)],
    ]);
    const stackAt = (k: number, pq: Q) => ({ x: pq.x + s(13) * (k - 1), y: pq.y - s(13) * (k - 1) });
    if (p >= S.flip + 18) {
      put(ctx, "plate", plateQ, (c) => plate(c, RPL));
      for (let k = 0; k < 3; k++)
        if (p >= hopAt(k) + 6) {
          const st = stackAt(k, plateQ);
          put(ctx, "stack" + k, q(st.x, st.y), (c) => pancake(c, RP * CAKE_R, true, 1, 11 + k));
        }
    }

    // ---- the ingredients: eggs, jug, butter, sack, spoons (they arrive one per beat in the title)
    // eggs
    EGG.forEach((a, k) => {
      const home = P(G.eggs[k]!),
        over = q(b.x + eggSpot(k).x * RB * 0.8, b.y + eggSpot(k).y * RB * 0.8),
        edge = off(home, "l", 200);
      const e = path(p, edge, [
        [0, home],
        [a, over],
        [a + 7, home],
        [S.dry - 6, edge, LEAVE],
      ]);
      if (p >= S.dry - 1) return;
      const stage = p < a + 5 ? 0 : p === a + 5 ? 1 : p === a + 6 ? 2 : 3;
      put(ctx, "egg" + k, e, (c) => egg(c, stage));
    });
    // milk jug: to the rim, tilt, pour in poses, back
    {
      const home = P(G.jug),
        ang = Math.atan2(home.y - b.y, home.x - b.x),
        spot = rim(q(G.B.x * u, G.B.y * u), RB, ang, s(28)),
        j = path(p, off(home, "r"), [
          [6, home],
          [JUG, spot],
          [JUG + 13, q(home.x, home.y, spot.r)],
          [S.dry - 6, off(home, "r"), LEAVE],
        ]);
      const tilt = p >= JUG + 6 && p < JUG + 12 ? (p === JUG + 6 ? 0.5 : 1) : 0,
        full = p < JUG + 7 ? 1 : p < JUG + 12 ? 1 - steps(p, JUG + 7, 5) * 0.92 : 0.08;
      if (p < S.dry - 1) put(ctx, "jug", j, (c) => jug(c, full, tilt));
      if (p >= JUG + 7 && p < JUG + 12) {
        const tip = { x: j.x + Math.cos(j.r) * s(86) * 0.86, y: j.y + Math.sin(j.r) * s(86) * 0.86 };
        stream(
          ctx,
          "milk",
          tip,
          { x: b.x + Math.cos(ang) * RB * 0.25, y: b.y + Math.sin(ang) * RB * 0.25 },
          s(20),
          s(11),
          C.surface,
        );
      }
    }
    // butter dish: to the rim, tilt, three drips
    {
      const home = P(G.butter),
        ang = Math.atan2(home.y - b.y, home.x - b.x),
        spot = rim(b, RB, ang, s(36)),
        d = path(p, off(home, "l"), [
          [12, home],
          [BUT, spot],
          [BUT + 9, q(home.x, home.y, spot.r)],
          [S.dry - 6, off(home, "l"), LEAVE],
        ]);
      const tilt = p >= BUT + 5 && p < BUT + 9,
        pool = p < BUT + 5 ? 1 : p < BUT + 9 ? 1 - steps(p, BUT + 5, 3) * 0.85 : 0.15;
      if (p < S.dry - 1) put(ctx, "butter", d, (c) => butterDish(c, pool), tilt ? 0.88 : 1, 1);
      // a drop in the air for one pose, then a spot on the liquid
      for (let i = 0; i < 3; i++)
        if (p === BUT + 5 + i) {
          const lip = { x: d.x + Math.cos(d.r) * s(70), y: d.y + Math.sin(d.r) * s(70) };
          put(ctx, "drop" + i, q(lerp(lip.x, b.x, 0.35), lerp(lip.y, b.y, 0.35)), (c) => {
            c.beginPath();
            c.ellipse(0, 0, s(10), s(13), 0, 0, TAU);
            solid(c, C.butter, 2.5);
          });
        }
    }
    // flour sack: to the small bowl, tilt, pour
    {
      const home = P(G.sack, 0.08),
        sq = P(G.S),
        ang = Math.atan2(home.y - sq.y, home.x - sq.x),
        spot = q(
          sq.x + Math.cos(ang) * (RS + s(90) * G.k),
          sq.y + Math.sin(ang) * (RS + s(90) * G.k),
          ang - Math.PI / 2,
        ),
        edge = off(home, tall ? "r" : "l"),
        sk = path(p, edge, [
          [18, home],
          [SACK, spot],
          [SACK + 11, home],
          [S.stir - 6, edge, LEAVE],
        ]);
      const tilt = p >= SACK + 5 && p < SACK + 11 ? 1 : 0;
      if (p < S.stir - 1)
        put(ctx, "sack", sk, (c) => {
          c.scale(G.k, G.k);
          sack(c, tilt);
        });
      if (p >= SACK + 6 && p < SACK + 11) {
        const mouth = { x: sk.x + Math.sin(sk.r) * s(84) * G.k, y: sk.y - Math.cos(sk.r) * s(84) * G.k };
        stream(ctx, "flour", mouth, { x: sq.x + s(8), y: sq.y - s(6) }, s(46) * G.k, s(26) * G.k, C.surface);
      }
    }
    // measuring spoons: baking powder, sugar, salt
    SPOON.forEach((a, k) => {
      const home0 = P(G.spoons[k]!),
        sq = P(G.S),
        d = spoonDir(k),
        home = q(home0.x, home0.y, d + Math.PI),
        spot = q(sq.x + Math.cos(d) * RS * 0.72, sq.y + Math.sin(d) * RS * 0.72, d + Math.PI + (k === 1 ? 0.3 : -0.3)),
        edge = off(home, tall ? (k === 2 ? "r" : "l") : "r"),
        sp_ = path(p, edge, [
          [24 + k, home],
          [a, spot],
          [a + 6, home],
          [S.stir - 6, edge, LEAVE],
        ]);
      if (p >= S.stir - 1) return;
      put(ctx, "spoon" + k, sp_, (c) => {
        c.scale(G.k, G.k);
        spoon(c, k, p < a + 5, p === a + 5);
      });
    });
    // the timer (step 03): steps in, its dial ticks down from 15
    {
      const home = P(G.timer),
        t = path(p, off(home, "r"), [
          [TIMER, home],
          [S.heat, off(home, tall ? "b" : "t", 300), LEAVE],
        ]);
      if (p >= TIMER && p < S.heat + 5)
        put(ctx, "timer", t, (c) => {
          c.scale(G.k * (tall ? 1.4 : 1), G.k * (tall ? 1.4 : 1));
          timer(c, 15 - clamp(p - (TIMER + 6), 0, 15));
        });
    }
    // the ladle (step 04): dips in the bowl, pours three circles
    {
      const bq = Bq(LADLE + 4),
        dip = q(bq.x + RB * 0.1, bq.y + RB * 0.1, -0.5),
        legs: Leg[] = [[LADLE, dip]];
      for (let k = 0; k < 3; k++) {
        const sp0 = onPan(k, P(G.pan));
        legs.push([220 + 7 * k, q(sp0.x - s(24), sp0.y - s(30), -0.5), QUICK]);
      }
      legs.push([241, off(P(G.pan), "r", 360), LEAVE]);
      const l = path(p, off(dip, "r", 400), legs);
      const k = Math.floor((p - 223) / 7),
        pouring = p >= 223 && p <= 240 && (p - 223) % 7 <= 3,
        full = p < LADLE + 5 ? 0 : p < 223 ? 1 : 1 - clamp((p - 223 + 1) / 21);
      if (p >= LADLE && p < 247) {
        put(ctx, "ladle", l, (c) => {
          c.scale(G.k, G.k);
          ladle(c, full, pouring);
        });
        if (pouring && k >= 0) {
          const sp0 = onPan(k, panQ),
            lip = { x: l.x + s(10), y: l.y + s(14) };
          stream(ctx, "batter" + k, lip, sp0, s(22) * G.k, s(14) * G.k, C.batter);
        }
      }
    }
    // whisks
    for (const bowlId of ["B", "S"] as const) {
      const w = whiskState(bowlId);
      if (!w.on) continue;
      const c0 = bowlId === "B" ? b : Sq(p),
        R = bowlId === "B" ? RB : RS,
        edge = off(c0, "r", 200 + R / u),
        wq = path(p, edge, [
          [w.w.in, q(c0.x, c0.y)],
          [w.w.out, edge, LEAVE],
        ]);
      put(ctx, "whisk" + bowlId, q(wq.x, wq.y, w.turn), (c) => whisk(c, R));
    }
    // pancakes hopping from the pan onto the plate
    for (let k = 0; k < 3; k++) {
      const h = hopAt(k);
      if (p < h || p >= h + 6) continue;
      const from = onPan(k, panQ),
        to = stackAt(k, plateQ),
        hq = path(p, q(from.x, from.y), [[h, q(to.x, to.y)]]),
        lift = at([2, 3, 2.6, 1.6, 1, 1], p - h),
        up = at([1.08, 1.14, 1.12, 1.06, 0.98, 1], p - h);
      put(ctx, "hop" + k, hq, (c) => {
        c.scale(up, up);
        pancake(c, RP * CAKE_R, true, 1, 11 + k, lift);
      });
    }
    // the butter pat, dropped on the stack (lands on the sign-off)
    if (p >= S.end + 3) {
      const top = stackAt(2, plateQ),
        k = at(PAT, p - (S.end + 3));
      put(ctx, "pat", q(top.x + s(6), top.y - s(4), 0.2), (c) => {
        c.scale(k, k);
        pat(c);
      });
    }

    ctx.restore();

    // ---- tags (beside their objects) and cards
    tag(ctx, "eggs", "2 large eggs", 32, S.dry - 7);
    tag(ctx, "milk", "1¼ cups milk", 33, S.dry - 7);
    tag(ctx, "butter", "3 tbsp melted butter", 34, S.dry - 7);
    tag(ctx, "flour", "1½ cups flour", 98, S.stir - 7);
    tag(ctx, "bp", "2 tsp baking powder", 99, S.stir - 7);
    tag(ctx, "sugar", "2 tbsp sugar", 100, S.stir - 7);
    tag(ctx, "salt", "¾ tsp salt", 101, S.stir - 7);
    tag(ctx, "lumps", "a few lumps are fine", 186, S.heat - 4);
    tag(ctx, "rest", "rest at least 15 min", TIMER + 12, S.heat);
    tag(ctx, "cup", "about ¼ cup each", 224, S.flip - 8);
    tag(
      ctx,
      "flip",
      tall ? "flip when bubbles form and pop · about 2 min" : "flip when bubbles form and pop · about 2 min",
      250,
      S.flip,
    );
    tag(ctx, "more", "about 1½–2 min more", 294, hopAt(2));

    nameCard(ctx, "title", "Pancakes", "a simple batter · makes about 12", 1, S.wet - 5);
    stepCard(ctx, "01", "01", "Whisk the wet", S.wet, S.dry - 5);
    stepCard(ctx, "02", "02", "Whisk the dry", S.dry, S.stir - 5);
    stepCard(ctx, "03", "03", "Stir dry into wet", S.stir, S.heat - 5);
    stepCard(ctx, "04", "04", "Medium heat", S.heat, S.flip - 5);
    stepCard(ctx, "05", "05", "Flip once", S.flip, S.end - 5);
    nameCard(ctx, "end", "Pancakes.", "makes about 12", S.end, 1e9);
    if (p >= S.end + 8)
      put(ctx, "footer", q(s(G.footer.x), s(G.footer.y)), (c) =>
        text(c, "quantities from a standard home recipe", 0, 0, {
          size: s(tall ? 25 : 23),
          family: F_.mono,
          weight: 500,
          color: C.ink,
          align: "center",
        }),
      );
  };

  // ---- shots name the steps; every one starts on a beat (a beat = 30 frames = 6 poses)
  const cuts = [S.title, S.wet, S.dry, S.stir, S.heat, S.flip, S.end].map((x) => x * HOLD).concat(N),
    names = ["title", "wet", "dry", "stir", "heat", "flip", "end"];
  const shots: Shot[] = names.map((sid, i) => ({
    id: sid,
    start: cuts[i]!,
    end: cuts[i + 1]!,
    draw: (ctx, local, env) => paint(ctx, env, cuts[i]! + local),
  }));

  // ---- sound: a tick on each landing pose (thinned to one per 10 frames), whooshes ending as pours stop,
  // a hit at each step, bubble pops and the timer, the sign-off as the butter lands
  const landings = [
    4,
    5,
    10,
    16,
    22,
    28,
    29,
    30, // title: the card and the ingredients
    S.wet + 4,
    ...EGG.flatMap((a) => [a + 4, a + 5, a + 6, a + 11]),
    JUG + 4,
    JUG + 17,
    BUT + 4,
    BUT + 6,
    BUT + 7,
    BUT + 8,
    BUT + 13,
    78,
    S.dry + 4,
    SACK + 4,
    SACK + 15,
    ...SPOON.flatMap((a) => [a + 4, a + 5, a + 10]),
    144,
    S.stir + 4,
    TIP + 4,
    TIP + 5,
    174,
    TIMER + 4,
    S.heat + 4,
    S.heat + 5,
    S.heat + 7,
    LADLE + 4,
    ...[0, 1, 2].map((k) => 223 + 7 * k),
    ...[0, 1, 2].map((k) => flipAt(k) + 4),
    S.flip + 22,
    ...[0, 1, 2].map((k) => hopAt(k) + 4),
    PLATE_IN + 4,
    S.end + 4,
  ];
  const pops = bubbles.flat().map((bb) => bb.b + bb.life + 1),
    timerTicks = Array.from({ length: 8 }, (_, i) => TIMER + 6 + i * 2);
  const hits = [S.wet, S.dry, S.stir, S.heat, S.flip].map((x) => x * HOLD);
  const ticks: number[] = [];
  for (const f of [...landings, ...pops, ...timerTicks].map((x) => x * HOLD).sort((a, b) => a - b))
    if (f < N && !hits.includes(f) && (!ticks.length || f - ticks[ticks.length - 1]! >= 10)) ticks.push(f);
  return {
    meta: { title: id, W, H, fps: FPS, bpm: BPM, durationFrames: N, raster: "cpu" },
    assets: { images: {}, fonts: PK.assets },
    shots,
    audio: beatScore({
      frames: N,
      fps: FPS,
      bpm: BPM,
      mood: "soft",
      key: 3,
      hits,
      whooshes: [(JUG + 12) * HOLD, 240 * HOLD],
      ticks,
      sign: 336 * HOLD,
      gain: 0.7,
    }),
  };
}

export const recipeFlatlayVertical = make("vertical", "recipeFlatlayVertical");
export const recipeFlatlay = make("square", "recipeFlatlay");
