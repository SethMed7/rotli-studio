// STUDY 35 · TITLE SEQUENCE (24 s, 30 fps, 150 bpm). Opening titles for an invented film, "The Long Meeting", in
// the mid-century cut-paper manner: flat colour fields cut on the beat, one stark paper symbol per scene (bars, a
// table, a clock, a raised hand, coffee cups, a growing agenda, the title) and credits set into the shapes. Every
// credit is a part of a meeting, not a person. One source, designed for landscape and vertical. Pack palette "bass".
// Brief: series/studies/briefs/title-sequence.json · prompt: series/studies/prompts/title-sequence.prompt.md
//
// The film is one continuous function paint(F). Motion is cut-out animation: time steps "on twos", every arrival
// lands on a beat (or its half, for the fast runs) with a hard stop and a one-step overshoot, and every paper piece is
// a polygon whose vertices carry a small seeded jitter, so edges read as cut with scissors.
import PACK from "../../../brand/packs/studio/pack.json";
import { rng, type Ctx, type Env } from "../core";
import type { Film, Shot } from "../film";
import { clamp, lerp } from "../kit/motion";
import { usePack } from "../kit/pack";
import { beatScore } from "../kit/score";
import { layout, type Size } from "../kit/sizes";
import { measure, text, type TextOpts } from "../kit/type";

const P = usePack(PACK),
  C = P.palette("bass"),
  F_ = P.face;
const FPS = 30,
  BPM = 150,
  N = 720,
  BEAT = 12; // a beat is 12 frames, a bar of music 48
const INK = C.deep!,
  CREAM = C.ground,
  RED = C.accent,
  MUSTARD = C.accent2;
// the timeline, in frames: a hard colour cut every two bars
const T = { bars: 0, table: 96, clock: 192, hand: 288, cups: 384, agenda: 480, title: 576, last: 672 };
const FIELDS: [number, string][] = [
  [T.bars, INK],
  [T.table, CREAM],
  [T.clock, RED],
  [T.hand, MUSTARD],
  [T.cups, INK],
  [T.agenda, CREAM],
  [T.title, RED],
];

type Pt = [number, number];
type Pose = { x: number; y: number; a: number; l: number; t: number };
type Seg = [string, boolean]; // [words, is it a role word]

/** time "on twos": the picture changes every second frame, like cut-outs shot under a camera */
const q2 = (F: number) => Math.floor(F / 2) * 2;
/** an arrival that lands at frame t: still until t−D, an accelerating travel, one overshoot step at t, dead stop */
const arrive = (F: number, t: number, D: number): [number, number] => {
  if (F >= t + 2) return [1, 0];
  if (F >= t) return [1, 1];
  if (F <= t - D) return [0, 0];
  return [((F - (t - D)) / D) ** 1.4, 0];
};
/** a value moved by arrivals: keys are [landing frame, value]; the overshoot is capped at `os` */
const keyed = (F: number, keys: [number, number][], D: number, os: number) => {
  let v = keys[0]![1];
  for (let i = 1; i < keys.length; i++) {
    const d = keys[i]![1] - keys[i - 1]![1];
    if (!d) continue;
    const [p, o] = arrive(F, keys[i]![0], D);
    v += d * p + Math.sign(d) * Math.min(Math.abs(d) * 0.06, os) * o;
  }
  return v;
};
const shade = (hex: string, k: number) => {
  const n = parseInt(hex.slice(1), 16),
    f = (s: number) => Math.round(((n >> s) & 255) * (1 - k));
  return `rgb(${f(16)},${f(8)},${f(0)})`;
};
/** scissor edges: subdivide every edge about every `step` px and jitter each vertex (seeded, so the cut is fixed) */
const jag = (pts: Pt[], seed: number, amt: number, step: number): Pt[] => {
  const r = rng(seed * 97 + 11),
    out: Pt[] = [];
  pts.forEach(([ax, ay], i) => {
    const [bx, by] = pts[(i + 1) % pts.length]!,
      n = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / step));
    for (let k = 0; k < n; k++)
      out.push([lerp(ax, bx, k / n) + (r() - 0.5) * 2 * amt, lerp(ay, by, k / n) + (r() - 0.5) * 2 * amt]);
  });
  return out;
};
/** a long thin quadrilateral whose two ends are cut at slightly different angles */
const barPts = (l: number, t: number, seed: number): Pt[] => {
  const r = rng(seed * 13 + 5),
    a1 = (r() - 0.5) * 0.3 * t,
    a2 = (r() - 0.5) * 0.3 * t,
    h = t / 2,
    e = l / 2;
  return [
    [-e + a1, -h],
    [e + a2, -h],
    [e - a2, h],
    [-e - a1, h],
  ];
};
const circPts = (R: number): Pt[] =>
  Array.from({ length: 48 }, (_, i) => [Math.cos((i / 48) * Math.PI * 2) * R, Math.sin((i / 48) * Math.PI * 2) * R]);
const rrPts = (w: number, h: number, r: number): Pt[] => {
  const out: Pt[] = [],
    cs: [number, number, number][] = [
      [w / 2 - r, -h / 2 + r, -Math.PI / 2],
      [w / 2 - r, h / 2 - r, 0],
      [-w / 2 + r, h / 2 - r, Math.PI / 2],
      [-w / 2 + r, -h / 2 + r, Math.PI],
    ];
  for (const [x, y, a0] of cs)
    for (let k = 0; k <= 4; k++) {
      const a = a0 + (k / 4) * (Math.PI / 2);
      out.push([x + Math.cos(a) * r, y + Math.sin(a) * r]);
    }
  return out;
};

export function make(size: Size, id: string): Film {
  const L = layout(size),
    { W, H, u, tall } = L;
  const J = 2 * u; // the scissor jitter: up to 2 px either way at 1080
  // credits at 46 px (the brief says 30–40; raised so every credit reads on a phone), role words 1.32× that
  const CS = 46 * u;

  // ---- paper primitives
  const fill = (ctx: Ctx, pts: Pt[], color: string) => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  };
  /** a paper piece: its own local shape, cut once (seeded), then placed; a fresh landing leaves a 2 px shadow */
  const piece = (
    ctx: Ctx,
    x: number,
    y: number,
    a: number,
    pts: Pt[],
    seed: number,
    color: string,
    shadow?: string,
    step = 70 * u,
    amt = J,
  ) => {
    const cut = jag(pts, seed, amt, step);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    if (shadow) {
      // the shadow is offset in screen space (down-right), whatever the piece's angle
      ctx.save();
      ctx.rotate(-a);
      ctx.translate(2 * u, 2 * u);
      ctx.rotate(a);
      fill(ctx, cut, shadow);
      ctx.restore();
    }
    fill(ctx, cut, color);
    ctx.restore();
  };
  const bar = (ctx: Ctx, b: Pose, seed: number, color: string, shadow?: string) =>
    piece(ctx, b.x, b.y, b.a, barPts(b.l, b.t, seed), seed, color, shadow);
  // small circles take a jitter scaled to their radius, or a 15 px ring reads as a cog, not a cut
  const discJag = (R: number) => Math.min(J, R * 0.05);
  const disc = (ctx: Ctx, x: number, y: number, R: number, seed: number, color: string) =>
    piece(ctx, x, y, 0, circPts(R), seed, color, undefined, 1e9, discJag(R));
  /** a pose moved by arrivals, each key [landing frame, pose] */
  const poseAt = (F: number, keys: [number, Pose][], D = 6): Pose => {
    const k = (f: keyof Pose, os: number) =>
      keyed(
        F,
        keys.map(([at, p]) => [at, p[f]]),
        D,
        os,
      );
    return { x: k("x", 12 * u), y: k("y", 12 * u), a: k("a", 0.03), l: k("l", 0), t: k("t", 0) };
  };
  /** where a bar waits before it stabs in from an edge */
  const offEdge = (p: Pose, edge: "L" | "R" | "T" | "B"): Pose => {
    const hx = Math.abs(Math.cos(p.a)) * (p.l / 2) + Math.abs(Math.sin(p.a)) * (p.t / 2) + 60 * u,
      hy = Math.abs(Math.sin(p.a)) * (p.l / 2) + Math.abs(Math.cos(p.a)) * (p.t / 2) + 60 * u;
    if (edge === "L") return { ...p, x: -hx };
    if (edge === "R") return { ...p, x: W + hx };
    if (edge === "T") return { ...p, y: -hy };
    return { ...p, y: H + hy };
  };
  const pose = (x: number, y: number, a: number, l: number, t: number): Pose => ({
    x: x * u,
    y: y * u,
    a,
    l: l * u,
    t: t * u,
  });

  // ---- credits: Inter 600 uppercase at wide tracking; the role words in the italic serif, a little larger
  const NAME = (sz: number): TextOpts => ({ size: sz, family: F_.sans, weight: 600, track: 0.18 });
  const ROLE = (sz: number): TextOpts => ({ size: sz * 1.32, family: F_.italic, weight: 400, track: 0 });
  const segW = (ctx: Ctx, [s, role]: Seg, sz: number) => measure(ctx, s, role ? ROLE(sz) : NAME(sz));
  const creditW = (ctx: Ctx, segs: Seg[], sz: number) =>
    segs.reduce((w, sg, i) => w + segW(ctx, sg, sz) + (i ? 0.5 * sz : 0), 0);
  /** one line of credit on a baseline; `show` segments are cut in so far */
  const credit = (
    ctx: Ctx,
    segs: Seg[],
    x: number,
    y: number,
    color: string,
    sz: number,
    align: "left" | "center" | "right" = "left",
    show = 99,
  ) => {
    const w = creditW(ctx, segs, sz);
    let cx = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
    segs.forEach((sg, i) => {
      if (i < show) text(ctx, sg[0], cx, y, { ...(sg[1] ? ROLE(sz) : NAME(sz)), color });
      cx += segW(ctx, sg, sz) + 0.5 * sz;
    });
  };
  /** how many of a credit's pieces have been cut in, one per landing frame */
  const shown = (F: number, at: number[]) => at.filter((t) => F >= t).length;

  // ================= 00 THE BARS (0–96) and their swing into the table (96–110)
  // arrangement A as they stab in (one per beat), arrangement B on the next bar of music, three more stab into B
  const S1 = tall
    ? {
        A: [
          pose(480, 520, 0, 800, 40),
          pose(760, 1100, Math.PI / 2, 1000, 56),
          pose(560, 960, 0, 1000, 96),
          pose(250, 500, Math.PI / 2, 700, 28),
        ],
        B: [
          pose(560, 640, -0.2, 800, 40),
          pose(540, 790, -0.2, 900, 56),
          pose(540, 960, -0.2, 1000, 96),
          pose(520, 1120, -0.2, 700, 28),
          pose(880, 470, Math.PI / 2, 640, 48),
          pose(200, 1520, Math.PI / 2, 760, 36),
          pose(720, 1360, 0, 720, 60),
        ],
        from: ["L", "B", "R", "T", "T", "B", "R"] as const,
        exit: ["R", "B", "L", "T", "T", "B", "R"] as const,
        planks: [
          pose(598, 960, -Math.PI / 2, 1180, 78),
          pose(520, 960, -Math.PI / 2, 1180, 78),
          pose(442, 960, -Math.PI / 2, 1180, 78),
        ],
        creditSz: 44,
      }
    : {
        A: [
          pose(700, 300, 0, 1100, 40),
          pose(1380, 560, Math.PI / 2, 900, 56),
          pose(1000, 640, 0, 1160, 96),
          pose(420, 480, Math.PI / 2, 700, 28),
        ],
        B: [
          pose(820, 330, -0.14, 1100, 40),
          pose(900, 450, -0.14, 900, 56),
          pose(960, 590, -0.14, 1160, 96),
          pose(820, 730, -0.14, 700, 28),
          pose(1600, 420, Math.PI / 2, 760, 48),
          pose(560, 880, 0, 900, 36),
          pose(300, 560, Math.PI / 2, 640, 60),
        ],
        from: ["L", "B", "R", "T", "T", "L", "B"] as const,
        exit: ["L", "B", "R", "T", "T", "L", "B"] as const,
        planks: [pose(870, 460, 0, 1260, 80), pose(870, 540, 0, 1260, 80), pose(870, 620, 0, 1260, 80)],
        creditSz: 44,
      };
  // the credit bar lands first, on frame 0; the tall frame opens on a cross (the long upright lands with it), so
  // its first picture is not one small strip in an empty field
  const BAR_LAND = tall ? [12, 0, 0, 24, 60, 72, 84] : [24, 12, 0, 36, 60, 72, 84];
  const barKeys = S1.B.map((b, i): [number, Pose][] => {
    const first = i < 4 ? S1.A[i]! : b,
      keys: [number, Pose][] = [
        [-99, offEdge(first, S1.from[i]!)],
        [BAR_LAND[i]!, first],
      ];
    if (i < 4) keys.push([48, b]);
    keys.push([108, i < 3 ? S1.planks[i]! : offEdge(b, S1.exit[i]!)]);
    return keys;
  });
  const barsScene = (ctx: Ctx, F: number) => {
    const color = F < T.table ? CREAM : INK;
    // the credit bar (index 2) is drawn last, so nothing ever crosses its words
    [0, 1, 3, 4, 5, 6, 2].forEach((i) => {
      const keys = barKeys[i]!;
      if (F >= T.table + 14 && i < 3) return; // the planks have become the table
      const D = F >= T.table ? 10 : F >= 40 && F <= 48 ? 8 : 6;
      const b = poseAt(F, keys, D);
      bar(ctx, b, 100 + i, color);
      if (i === 2 && F < T.table) {
        // the small credit rides in on the thickest bar
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.a);
        credit(ctx, [["A CONFERENCE ROOM PICTURE", false]], 0, S1.creditSz * 0.36 * u, INK, S1.creditSz * u, "center");
        ctx.restore();
      }
    });
  };

  // ================= 01 THE TABLE (96–192): the planks snap into a table, chairs land one per beat
  const TB = tall ? { x: 520, y: 960, a: -Math.PI / 2, l: 1180, h: 234 } : { x: 870, y: 540, a: 0, l: 1260, h: 240 };
  const CHAIRS: { p: Pose; from: "L" | "R" | "T" | "B" }[] = tall
    ? [
        { p: pose(348, 560, Math.PI / 2, 110, 66), from: "L" },
        { p: pose(692, 960, Math.PI / 2, 110, 66), from: "R" },
        { p: pose(348, 1360, Math.PI / 2, 110, 66), from: "L" },
        { p: pose(692, 560, Math.PI / 2, 110, 66), from: "R" },
        { p: pose(348, 960, Math.PI / 2, 110, 66), from: "L" },
        { p: pose(692, 1360, Math.PI / 2, 110, 66), from: "R" },
      ]
    : [
        { p: pose(420, 365, 0, 110, 66), from: "T" },
        { p: pose(870, 715, 0, 110, 66), from: "B" },
        { p: pose(1320, 365, 0, 110, 66), from: "T" },
        { p: pose(420, 715, 0, 110, 66), from: "B" },
        { p: pose(870, 365, 0, 110, 66), from: "T" },
        { p: pose(1320, 715, 0, 110, 66), from: "B" },
      ];
  const CHAIR_LAND = CHAIRS.map((_, i) => 120 + i * BEAT);
  const tableScene = (ctx: Ctx, F: number) => {
    const sh = shade(CREAM, 0.08);
    CHAIRS.forEach((c, i) => {
      const t = CHAIR_LAND[i]!;
      if (F < t - 6) return;
      const p = poseAt(F, [
        [-99, offEdge(c.p, c.from)],
        [t, c.p],
      ]);
      piece(ctx, p.x, p.y, p.a, rrPts(p.l, p.t, 18 * u), 200 + i, RED, F < t + 6 ? sh : undefined);
    });
    if (F >= T.table + 14) {
      const land = F < T.table + 16 ? 1.012 : 1;
      piece(ctx, TB.x * u, TB.y * u, TB.a, rrPts(TB.l * u * land, TB.h * u * land, 22 * u), 210, INK);
      ctx.save();
      ctx.translate(TB.x * u, TB.y * u);
      ctx.rotate(TB.a);
      credit(
        ctx,
        [
          ["starring", true],
          ["THE AGENDA", false],
        ],
        0,
        13 * u,
        CREAM,
        CS,
        "center",
        shown(F, [120, 132]),
      );
      ctx.restore();
    }
  };

  // ================= 02 THE CLOCK (192–288): the minute hand jumps a notch on every beat, the hour hand creeps
  const CK = tall ? { x: 540, y: 760, R: 380, hub: 112 } : { x: 800, y: 540, R: 440, hub: 222 };
  const minuteAt = (F: number) =>
    keyed(
      F,
      [[0, 52] as [number, number]].concat(
        Array.from({ length: 8 }, (_, i) => [204 + i * BEAT, 53 + i] as [number, number]),
      ),
      2,
      0.3,
    );
  const clockFace = (
    ctx: Ctx,
    F: number,
    x: number,
    y: number,
    R: number,
    hub: number,
    minute: number,
    hour: number,
    seed: number,
  ) => {
    const land = F >= T.clock && F < T.clock + 2 ? 1.03 : 1;
    disc(ctx, x, y, R * land, seed, INK);
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2,
        major = i % 5 === 0,
        len = (major ? 0.11 : 0.045) * R,
        r0 = R * 0.9 - len / 2;
      piece(
        ctx,
        x + Math.cos(a) * r0,
        y + Math.sin(a) * r0,
        a,
        barPts(len, (major ? 0.034 : 0.014) * R, seed + i),
        seed + i,
        CREAM,
        undefined,
        1e9,
      );
    }
    const ha = (hour / 12) * Math.PI * 2 - Math.PI / 2,
      ma = (minute / 60) * Math.PI * 2 - Math.PI / 2,
      hl = R * (hub > R * 0.35 ? 0.74 : 0.58),
      ml = R * 0.86;
    bar(
      ctx,
      { x: x + Math.cos(ha) * hl * 0.45, y: y + Math.sin(ha) * hl * 0.45, a: ha, l: hl * 1.1, t: R * 0.075 },
      seed + 70,
      RED,
    );
    bar(
      ctx,
      { x: x + Math.cos(ma) * ml * 0.46, y: y + Math.sin(ma) * ml * 0.46, a: ma, l: ml * 1.02, t: R * 0.045 },
      seed + 71,
      CREAM,
    );
    disc(ctx, x, y, hub, seed + 72, CREAM);
    if (hub < R * 0.35) disc(ctx, x, y, hub * 0.16, seed + 73, INK);
  };
  const clockScene = (ctx: Ctx, F: number) => {
    const m = minuteAt(F),
      h = 10 + (52 + (F - T.clock) / BEAT) / 60;
    clockFace(ctx, F, CK.x * u, CK.y * u, CK.R * u, CK.hub * u, m, h, 300);
    const show = shown(F, [204, 216]);
    if (tall) {
      credit(
        ctx,
        [
          ["and", true],
          ["ANY OTHER BUSINESS", false],
        ],
        CK.x * u,
        (CK.y + CK.R + 130) * u,
        INK,
        CS,
        "center",
        show,
      );
    } else {
      const x = CK.x * u,
        y = CK.y * u;
      if (show > 0) text(ctx, "and", x, y - 50 * u, { ...ROLE(CS), color: INK, align: "center" });
      if (show > 1) {
        text(ctx, "ANY OTHER", x, y + 24 * u, { ...NAME(CS), color: INK, align: "center" });
        text(ctx, "BUSINESS", x, y + 84 * u, { ...NAME(CS), color: INK, align: "center" });
      }
    }
  };

  // ================= 03 THE HAND (288–384): it rises in three stepped moves, waves on the beat, then drops
  const handPts = (): Pt[] => {
    const arc: Pt[] = [];
    for (let k = 0; k <= 10; k++) {
      const a = (k / 10) * Math.PI;
      arc.push([Math.cos(a) * 100, -600 - Math.sin(a) * 100]);
    }
    return [
      [84, 760],
      [84, -250],
      [100, -300],
      [100, -600],
      ...arc.slice(1, -1),
      [-100, -600],
      [-100, -470],
      [-128, -498],
      [-160, -535],
      [-188, -546],
      [-206, -524],
      [-198, -484],
      [-162, -420],
      [-118, -334],
      [-100, -300],
      [-84, -250],
      [-84, 760],
    ].map(([x, y]) => [x * u, y * u] as Pt);
  };
  const HAND = handPts();
  const HD = tall
    ? {
        x: 620,
        keys: [2220, 1860, 1520],
        down: 2720,
        bar: pose(330, 520, 0, 820, 96),
        textX: 110,
        roleY: 452,
        asY: 632,
      }
    : {
        x: 1320,
        keys: [1560, 1220, 890],
        down: 1840,
        bar: pose(420, 540, 0, 980, 96),
        textX: 200,
        roleY: 474,
        asY: 654,
      };
  const handScene = (ctx: Ctx, F: number) => {
    const y = keyed(
        F,
        [
          [0, HD.down * u],
          [300, HD.keys[0]! * u],
          [312, HD.keys[1]! * u],
          [324, HD.keys[2]! * u],
          [372, HD.down * u],
        ],
        6,
        14 * u,
      ),
      a = keyed(
        F,
        [
          [0, 0],
          [336, 0.06],
          [348, -0.05],
          [360, 0.05],
          [372, 0],
        ],
        4,
        0.02,
      );
    // the credit: an ink bar stabs in from the left carrying the name; the role words sit above and below it
    const bp = poseAt(F, [
      [-99, offEdge(HD.bar, "L")],
      [T.hand, HD.bar],
    ]);
    bar(ctx, bp, 400, INK);
    const tx = HD.textX * u;
    credit(ctx, [["THE PROJECTOR", false]], tx + (bp.x - HD.bar.x), HD.bar.y + 16 * u, MUSTARD, CS);
    if (F >= 312) credit(ctx, [["with", true]], tx, HD.roleY * u, INK, CS);
    if (F >= 324) credit(ctx, [["as itself", true]], tx, HD.asY * u, INK, CS);
    piece(ctx, HD.x * u, y, a, HAND, 410, INK);
    // a cuff: one mustard cut across the wrist
    ctx.save();
    ctx.translate(HD.x * u, y);
    ctx.rotate(a);
    fill(
      ctx,
      jag(barPts(190 * u, 16 * u, 411), 411, J, 70 * u).map(([px, py]) => [px, py - 200 * u] as Pt),
      MUSTARD,
    );
    ctx.restore();
  };

  // ================= 04 THE CUPS (384–480): eight land in a row on the eighth notes, the row slides, more arrive
  const cupPts = (): { body: Pt[]; saucer: Pt[] } => ({
    body: [
      [-45, -12],
      [45, -12],
      [52, -40],
      [60, -132],
      [-60, -132],
      [-52, -40],
    ].map(([x, y]) => [x * u, y * u] as Pt),
    saucer: barPts(176 * u, 13 * u, 7),
  });
  const CUP = cupPts();
  const CU = tall
    ? { k: 1.2, pitch: 225, x0: 180, rows: [852, 1262], lines: [900, 1310], slide: 2 }
    : { k: 1.15, pitch: 205, x0: 230, rows: [602], lines: [640], slide: 4 };
  // each cup: its row, its slot before the slide, and when it lands
  const CUPS = Array.from({ length: 12 }, (_, i) => {
    const at = i < 8 ? 384 + i * 6 : 450 + (i - 8) * 6;
    if (!tall) return { row: 0, slot: i, at };
    if (i < 8) return { row: i < 4 ? 0 : 1, slot: i % 4, at };
    return { row: (i - 8) % 2, slot: 4 + Math.floor((i - 8) / 2), at };
  });
  const cup = (ctx: Ctx, x: number, y: number, k: number, seed: number, shadow?: string) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(k, k);
    // the handle: a ring cut from paper (outer and inner edge both scissor-cut)
    const ring = (sx: number) => {
      ctx.beginPath();
      for (const [R, s] of [
        [30 * u, seed],
        [15 * u, seed + 1],
      ] as const) {
        const pts = jag(circPts(R), s, discJag(R), 1e9);
        pts.forEach(([px, py], i) =>
          i ? ctx.lineTo(px + 66 * u + sx, py - 78 * u + sx) : ctx.moveTo(px + 66 * u + sx, py - 78 * u + sx),
        );
        ctx.closePath();
      }
    };
    if (shadow) {
      ring(2 * u);
      ctx.fillStyle = shadow;
      ctx.fill("evenodd");
      fill(
        ctx,
        jag(CUP.body, seed + 2, J, 1e9).map(([a, b]) => [a + 2 * u, b + 2 * u] as Pt),
        shadow,
      );
    }
    ring(0);
    ctx.fillStyle = CREAM;
    ctx.fill("evenodd");
    fill(ctx, jag(CUP.body, seed + 2, J, 1e9), CREAM);
    fill(
      ctx,
      jag(CUP.saucer, seed + 3, J, 60 * u).map(([a, b]) => [a, b - 5 * u] as Pt),
      CREAM,
    );
    ctx.restore();
  };
  const cupsScene = (ctx: Ctx, F: number) => {
    const slid = keyed(
      F,
      [
        [0, 0],
        [444, 1],
      ],
      8,
      0.05,
    );
    CU.lines.forEach((ly, r) => {
      const p = poseAt(F, [
        [-99, offEdge(pose(W / 2 / u, ly, 0, W / u + 200, 96), r ? "R" : "L")],
        [T.cups + r * BEAT, pose(W / 2 / u, ly, 0, W / u + 200, 96)],
      ]);
      bar(ctx, p, 500 + r, CREAM);
    });
    CUPS.forEach((c, i) => {
      if (F < c.at - 6) return;
      const exiting = c.slot < CU.slide,
        x = (CU.x0 + (c.slot - CU.slide * slid) * CU.pitch) * u - (exiting ? 300 * u * slid : 0),
        base = CU.rows[c.row]! * u,
        y = keyed(
          F,
          [
            [0, -260 * u],
            [c.at, base],
          ],
          6,
          10 * u,
        );
      cup(ctx, x, y, CU.k, 520 + i * 5, F >= c.at && F < c.at + 6 ? "rgb(40,36,32)" : undefined);
    });
    const ly = CU.lines[CU.lines.length - 1]! * u;
    credit(
      ctx,
      [
        ["screenplay by", true],
        ["THE MINUTES", false],
      ],
      (tall ? 110 : CU.x0 - 60) * u,
      ly + 16 * u,
      INK,
      CS,
      "left",
      shown(F, [408, 420]),
    );
  };

  // ================= 05 THE AGENDA (480–576): a staircase of stepped bars, a new step on every beat
  const STEP_LABELS = ["item 1", "item 2", "item 7", "item 12", "item 19", "item 28", "item 40", "item 57"];
  const STEPS = STEP_LABELS.map((_, i) => {
    const r = rng(600 + i),
      jx = (r() - 0.5) * 50,
      jl = (r() - 0.5) * 110;
    return tall
      ? pose(100 + i * 40 + jx * 0.4 + (560 + jl * 0.5) / 2, 560 + i * 112, (r() - 0.5) * 0.02, 560 + jl * 0.5, 108)
      : pose(150 + i * 150 + jx + (560 + jl) / 2, 920 - i * 82, (r() - 0.5) * 0.02, 560 + jl, 82);
  });
  const STEP_LAND = STEPS.map((_, i) => T.agenda + i * BEAT);
  // the title frame: after the hard cut the bars stab back in, in ink, and assemble it
  const FRAME = tall
    ? [
        pose(540, 460, 0, 950, 26),
        pose(540, 1180, 0, 950, 26),
        pose(112, 820, Math.PI / 2, 790, 26),
        pose(968, 820, Math.PI / 2, 790, 26),
      ]
    : [
        pose(960, 130, 0, 1720, 30),
        pose(960, 770, 0, 1720, 30),
        pose(170, 450, Math.PI / 2, 720, 30),
        pose(1750, 450, Math.PI / 2, 720, 30),
      ];
  const stepKeys = STEPS.map((s, i): [number, Pose][] => [
    [-99, offEdge(s, "R")],
    [STEP_LAND[i]!, s],
  ]);
  // top and bottom slam in on the cut, the sides half a beat later, each along its own length
  const frameKeys = FRAME.map((f, i): [number, Pose][] => [
    [-99, offEdge(f, (["L", "R", "T", "B"] as const)[i]!)],
    [i < 2 ? T.title : T.title + 6, f],
  ]);
  const agendaScene = (ctx: Ctx, F: number) => {
    const sh = shade(CREAM, 0.08);
    STEPS.forEach((_, i) => {
      const t = STEP_LAND[i]!;
      if (F < t - 6) return;
      const p = poseAt(F, stepKeys[i]!);
      bar(ctx, p, 610 + i, RED, F >= t && F < t + 6 ? sh : undefined);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.a);
      text(ctx, STEP_LABELS[i]!, -p.l / 2 + 26 * u, 11 * u, { size: 32 * u, family: F_.mono, weight: 500, color: INK });
      ctx.restore();
    });
    if (F < 492) return;
    // the credit climbs the staircase: it hops to the next rung half a beat BEFORE that step slides in, so the
    // arriving bar never crosses the words (in the vertical it sits on the head of the list)
    const segs: Seg[] = [
      ["music by", true],
      ["HOLD MUSIC", false],
    ];
    if (tall) credit(ctx, segs, 100 * u, (560 - 54 - 36) * u, INK, CS);
    else {
      // the right edge stays inside the safe area, allowing for the scene's drift
      const xMax = W - L.safe.x - 0.7 * 0.45 * 96 * u,
        rung = (i: number): [number, number] => [
          Math.min(STEPS[i]!.x + STEPS[i]!.l / 2, xMax),
          STEPS[i]!.y - STEPS[i]!.t / 2 - 26 * u,
        ],
        keys = STEP_LAND.slice(1).map((t, j) => [j ? t - 6 : 0, j + 1] as const),
        x = keyed(
          F,
          keys.map(([t, i]) => [t, rung(i)[0]]),
          4,
          8 * u,
        ),
        y = keyed(
          F,
          keys.map(([t, i]) => [t, rung(i)[1]]),
          4,
          8 * u,
        );
      credit(ctx, segs, x, y, INK, CS, "right");
    }
  };

  // ================= 06 THE TITLE (576–672) and 07 THE LAST CARD (672–720)
  const TL = tall
    ? { lines: ["THE", "LONG", "MEETING"], size: 150, x: 176, ys: [690, 860, 1030], under: 1080, clock: [800, 630, 96] }
    : { lines: ["THE LONG", "MEETING"], size: 180, x: 262, ys: [400, 610], under: 660, clock: [1530, 330, 120] };
  const TO = (): TextOpts => ({ size: TL.size * u, family: F_.sans, weight: 800, track: 0.02 });
  const SLAM = tall ? pose(540, 1370, 0, 1500, 250) : pose(960, 925, 0, 2400, 200);
  const LETTER_AT = (k: number) => T.title + k * 6; // fourteen letters on the eighth notes
  const titleScene = (ctx: Ctx, F: number) => {
    FRAME.forEach((_, i) => bar(ctx, poseAt(F, frameKeys[i]!), 610 + i, INK));
    const o = TO(),
      sh = shade(RED, 0.08);
    let k = 0;
    TL.lines.forEach((line, li) => {
      let x = TL.x * u;
      const base = TL.ys[li]! * u;
      [...line].forEach((ch, ci) => {
        const adv = measure(ctx, line.slice(0, ci + 1), o) - measure(ctx, line.slice(0, ci), o);
        if (ch !== " ") {
          const t = LETTER_AT(k),
            r = rng(900 + k),
            rot = (r() - 0.5) * 2 * ((2 * Math.PI) / 180),
            dy = (r() - 0.5) * 12 * u;
          if (F >= t) {
            const s = F < t + 2 ? 1.1 : 1,
              gw = measure(ctx, ch, o);
            ctx.save();
            ctx.translate(x + gw / 2, base + dy - o.size * 0.36);
            ctx.rotate(rot);
            ctx.scale(s, s);
            if (F < t + 6) text(ctx, ch, -gw / 2 + 2 * u, o.size * 0.36 + 2 * u, { ...o, track: 0, color: sh });
            text(ctx, ch, -gw / 2, o.size * 0.36, { ...o, track: 0, color: INK });
            ctx.restore();
          }
          k++;
        }
        x += adv;
      });
    });
    // the underline stabs in under the last line
    const last = TL.lines[TL.lines.length - 1]!,
      uw = measure(ctx, last, o),
      up: Pose = { x: TL.x * u + uw / 2, y: TL.under * u, a: 0, l: uw + 20 * u, t: 13 * u };
    if (F >= 654)
      bar(
        ctx,
        poseAt(F, [
          [-99, offEdge(up, "L")],
          [660, up],
        ]),
        700,
        INK,
      );
    if (F < T.last - 6) return;
    // the last card: the slam, the corner clock that ticks once, the last credit
    const sp = poseAt(
      F,
      [
        [-99, offEdge(SLAM, "R")],
        [T.last, SLAM],
      ],
      2, // a slam: off the frame one step, across it the next
    );
    bar(ctx, sp, 710, INK);
    const [cx, cy, cr] = TL.clock as [number, number, number];
    if (F >= T.last) {
      const m = keyed(
        F,
        [
          [0, 60],
          [696, 61],
        ],
        2,
        0.3,
      );
      clockFace(ctx, F, cx * u, cy * u, cr * u, cr * 0.14 * u, m, 11 + m / 60 - 1, 720);
    }
    const segs: Seg[] = [
        ["directed by", true],
        ["NOBODY IN PARTICULAR", false],
      ],
      sz = CS,
      show = shown(F, [684, 684]),
      left = (tall ? 110 : TL.x) * u + (sp.x - SLAM.x);
    if (creditW(ctx, segs, sz) < W - 2 * 110 * u) credit(ctx, segs, left, sp.y + 16 * u, CREAM, sz, "left", show);
    else if (show) {
      credit(ctx, [segs[0]!], left, sp.y - 16 * u, CREAM, sz);
      credit(ctx, [segs[1]!], left, sp.y + 54 * u, CREAM, sz);
    }
  };

  // ---- a static paper speckle over everything
  const SPECK = (() => {
    const r = rng(35);
    return Array.from({ length: 2600 }, () => [r() * W, r() * H, (1 + r() * 2.4) * u, r() < 0.5 ? 1 : 0] as const);
  })();
  const speckle = (ctx: Ctx) => {
    ctx.save();
    ctx.globalAlpha = 0.04;
    for (const [x, y, s, dark] of SPECK) {
      ctx.fillStyle = dark ? "#000" : "#fff";
      ctx.fillRect(x, y, s, s);
    }
    ctx.restore();
  };

  // each scene drifts slowly (on twos) so no hold is ever frozen
  const DRIFT: [number, number, number][] = [
    [T.bars, 1, 0],
    [T.table, -1, 0],
    [T.clock, 0.6, -0.6],
    [T.hand, 0, -1],
    [T.cups, -1, 0],
    [T.agenda, 0.7, 0.5],
    [T.title, -0.8, 0],
  ];
  const paint = (ctx: Ctx, env: Env, Fr: number) => {
    const F = q2(clamp(Fr, 0, N - 1));
    ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
    ctx.fillStyle = [...FIELDS].reverse().find(([s]) => F >= s)![1];
    ctx.fillRect(0, 0, W, H);
    const [d0, dx, dy] = [...DRIFT].reverse().find(([s]) => F >= s)!,
      k = (F - d0) * 0.45 * u;
    ctx.save();
    ctx.translate(dx * k, dy * k);
    if (F < T.table) barsScene(ctx, F);
    else if (F < T.clock) {
      tableScene(ctx, F);
      if (F < T.table + 14) barsScene(ctx, F);
    } else if (F < T.hand) clockScene(ctx, F);
    else if (F < T.cups) handScene(ctx, F);
    else if (F < T.agenda) cupsScene(ctx, F);
    else if (F < T.title) agendaScene(ctx, F);
    else titleScene(ctx, F);
    ctx.restore();
    speckle(ctx);
  };

  const cuts = [T.bars, T.table, T.clock, T.hand, T.cups, T.agenda, T.title, T.last, N],
    names = ["bars", "table", "clock", "hand", "cups", "agenda", "title", "last-card"];
  const shots: Shot[] = names.map((sid, i) => ({
    id: sid,
    start: cuts[i]!,
    end: cuts[i + 1]!,
    draw: (ctx, local, env) => paint(ctx, env, cuts[i]! + local),
  }));
  // soft ticks: every other one where arrivals fall on consecutive beats
  const ticks = [0, 24, 60, 84, 120, 144, 168, 204, 228, 252, 276, 396, 408, 420, 456, 468, 492, 516, 540, 564];
  for (let f = 588; f <= 648; f += BEAT) ticks.push(f);
  ticks.push(660);
  return {
    meta: { title: id, W, H, fps: FPS, bpm: BPM, durationFrames: N, raster: "cpu" },
    assets: { images: {}, fonts: P.assets },
    shots,
    audio: beatScore({
      frames: N,
      fps: FPS,
      bpm: BPM,
      mood: "drive",
      key: -2,
      drop: T.table,
      hits: [T.table, T.clock, T.hand, T.cups, T.agenda, T.title, T.last],
      ticks,
      sign: T.last + BEAT,
    }),
  };
}

export const titleSequence = make("landscape", "titleSequence");
export const titleSequenceVertical = make("vertical", "titleSequenceVertical");
