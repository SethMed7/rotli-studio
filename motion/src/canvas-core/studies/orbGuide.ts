// STUDY 26 · ORB GUIDE (26 s, 30 fps). A quiet, airy launch film for a fictional product on a warm off-white
// ground, where ONE small glossy orb carries the eye through every scene: it swells inside a hairline grid cell,
// becomes a picture tile and then the mark, flies past typed lines on thin comet arcs, lands as a checkbox beside
// a word roller, and the product window grows out of it. One source, designed for landscape and vertical.
// Brand: the neutral pack, palette "loop". Brief: series/studies/briefs/orb-guide.json ·
// prompt: series/studies/prompts/orb-guide.prompt.md
//
// The whole film is one continuous function paint(F) of a (fractional) frame F; the shots only name the sections.
import PACK from "../../../brand/packs/studio/pack.json";
import type { Ctx, Env } from "../core";
import type { Film, Shot } from "../film";
import { motionBlur } from "../kit/blur";
import { clamp, ease, lerp, prog, spring, track } from "../kit/motion";
import { usePack } from "../kit/pack";
import { beatScore } from "../kit/score";
import { layout, type Size } from "../kit/sizes";
import { measure, text, type TextOpts } from "../kit/type";
import { card, check, rr } from "../kit/ui";

const P = usePack(PACK),
  C = P.palette("loop"),
  F_ = P.face;
const FPS = 30,
  BPM = 120,
  N = 780; // a beat is 15 frames
// the timeline, in frames (every cut on a beat)
const T = { lockup: 90, pill: 150, ring: 210, orb: 360, comet: 420, roller: 540, product: 690, end: 750 };

// ---- colour: everything derives from the pack
const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a: string, b: string, t: number) => {
  const A = hex(a),
    B = hex(b);
  return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i]!, t))).join(",")})`;
};
const rgba = (h: string, a: number) => `rgba(${hex(h).join(",")},${a})`;
const WHITE = C.surface;
const HI = mix(C.accent2, WHITE, 0.55), // the orb's highlight
  MID = mix(C.accent2, C.accent, 0.45),
  COMET = mix(C.accent2, C.accent, 0.5), // the comet line: accent2 pushed just far enough to survive compression
  GRID = mix(C.line, C.ink, 0.1),
  SOFT = mix(C.surface, C.ground, 0.55);

// ---- typed copy: each glyph has a frame it appears (grey) and turns ink `dur` frames later
type At = (i: number) => number;
const every =
  (start: number, rate: number): At =>
  (i) =>
    start + i * rate;
const COPY = {
  name: { s: "Oriel", at: every(100, 3), dur: 3 },
  pill: { s: "INTRODUCING ORIEL TEAMS", at: every(170, 0.7), dur: 2 },
  ring: { s: "From ask to booked", at: every(252, 2), dur: 2 },
  l1: { s: "Ask. Pick. Get it booked.", at: every(428, 1.6), dur: 2 },
  l2: { s: "With everyone, from invite to calendar.", at: every(482, 1.15), dur: 2 },
  plan: { s: "Plan your own", at: (i: number) => (i < 4 ? 544 + i * 2 : 562 + (i - 4) * 2), dur: 2 },
  end: { s: "Oriel", at: every(758, 1.4), dur: 2 },
};
const WORDS = ["Polls", "Rotations", "Office hours", "And more"],
  WORD_AT = [615, 630, 645, 660];

// ---- the tile ring: nine flat scenes, each with a place on a loose ring and a depth (far = smaller, slower)
const SCENES = ["plane", "mug", "clock", "moon", "books", "lamp", "chat", "calendar", "leaf"] as const;
type Scene = (typeof SCENES)[number] | "moon";
const RING = [
  { a: -8, r: 1.0, z: 1.0, rot: -3 },
  { a: -128, r: 1.05, z: 0.9, rot: 4 },
  { a: 118, r: 0.95, z: 0.84, rot: -4 },
  { a: -88, r: 1.0, z: 0.68, rot: 3 },
  { a: 34, r: 1.0, z: 0.8, rot: 5 },
  { a: -170, r: 1.0, z: 0.74, rot: -5 },
  { a: 152, r: 1.02, z: 0.94, rot: 3 },
  { a: -48, r: 0.95, z: 0.64, rot: -3 },
  { a: 76, r: 1.05, z: 0.72, rot: 4 },
];

type Pt = [number, number];
/** a Catmull-Rom path through the points, at t in 0..1 */
const spline = (pts: Pt[], t: number): Pt => {
  const n = pts.length - 1,
    x = clamp(t) * n,
    i = Math.min(n - 1, Math.floor(x)),
    f = x - i;
  const p0 = pts[Math.max(0, i - 1)]!,
    p1 = pts[i]!,
    p2 = pts[i + 1]!,
    p3 = pts[Math.min(n, i + 2)]!;
  const cr = (a: number, b: number, c: number, d: number) =>
    0.5 * (2 * b + (-a + c) * f + (2 * a - 5 * b + 4 * c - d) * f * f + (-a + 3 * b - 3 * c + d) * f * f * f);
  return [cr(p0[0], p1[0], p2[0], p3[0]), cr(p0[1], p1[1], p2[1], p3[1])];
};

export function make(size: Size, id: string): Film {
  const L = layout(size),
    { W, H, u, cx } = L,
    tall = L.tall;
  const cy = tall ? (L.safe.top + H - L.safe.bottom) / 2 : L.cy; // the content centre (vertical feeds cover the ends)
  const D = tall
    ? {
        wide0: [700, 1180],
        name: 64,
        mark: 74,
        pillText: 30,
        tile: 136,
        ringR: [340, 560],
        ringText: 52,
        line: 58,
        lineGap: 78,
        box: 46,
        win: [680, 980],
        winY: cy - 30,
        orbR: 19,
      }
    : {
        wide0: [900, 640],
        name: 50,
        mark: 60,
        pillText: 26,
        tile: 118,
        ringR: [560, 300],
        ringText: 44,
        line: 50,
        lineGap: 0,
        box: 38,
        win: [1040, 620],
        winY: cy,
        orbR: 17,
      };
  const sans = (sz: number, weight = 400, color = C.ink, trackEm = -0.01): TextOpts => ({
    size: sz * u,
    family: F_.sans,
    weight,
    color,
    track: trackEm,
  });
  const push = (ctx: Ctx, k: number, x = cx, y = cy) => {
    ctx.translate(x, y);
    ctx.scale(k, k);
    ctx.translate(-x, -y);
  };

  // ---------------------------------------------------------------- drawing vocabulary
  /** the orb: the accent as a sphere, lit from the upper left */
  const orb = (ctx: Ctx, x: number, y: number, r: number, a = 1) => {
    if (r <= 0.2 || a <= 0) return;
    const g = ctx.createRadialGradient(x - r * 0.42, y - r * 0.46, r * 0.04, x - r * 0.12, y - r * 0.12, r * 1.28);
    g.addColorStop(0, HI);
    g.addColorStop(0.42, MID);
    g.addColorStop(1, C.accent);
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  /** a soft contact shadow under something that has landed */
  const contact = (ctx: Ctx, x: number, y: number, r: number, a: number) => {
    if (a <= 0 || r <= 0) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, 0.26);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, rgba(C.ink, 0.2 * a));
    g.addColorStop(1, rgba(C.ink, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  /** the hairline construction grid: a cell whose four lines run off the frame, with ink dots where they cross */
  const grid = (ctx: Ctx, gx: number, gy: number, w: number, h: number, a: number) => {
    if (a <= 0) return;
    const xs = [gx - w / 2, gx + w / 2],
      ys = [gy - h / 2, gy + h / 2];
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.fillStyle = GRID;
    for (const x of xs) ctx.fillRect(x - 0.6 * u, 0, 1.2 * u, H);
    for (const y of ys) ctx.fillRect(0, y - 0.6 * u, W, 1.2 * u);
    ctx.fillStyle = C.ink;
    for (const x of xs)
      for (const y of ys) {
        ctx.beginPath();
        ctx.arc(x, y, 2.6 * u, 0, Math.PI * 2);
        ctx.fill();
      }
    ctx.restore();
  };
  /** the Oriel mark: an arched window with the orb resting in it */
  const mark = (ctx: Ctx, x: number, y: number, s: number, a = 1) => {
    if (a <= 0 || s <= 0) return;
    const w = s * 0.74,
      lw = s * 0.1,
      l = x - w / 2 + lw / 2,
      r = x + w / 2 - lw / 2,
      top = y - s / 2 + lw / 2,
      bot = y + s / 2 - lw / 2,
      rad = (r - l) / 2;
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = lw;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(l, bot);
    ctx.lineTo(l, top + rad);
    ctx.arc(x, top + rad, rad, Math.PI, 0);
    ctx.lineTo(r, bot);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
    orb(ctx, x, top + rad + s * 0.1, s * 0.15, a);
  };

  // ---- typewriter: the next glyph shows in muted grey first, then turns ink
  const typeAt = (ctx: Ctx, s: string, left: number, y: number, o: TextOpts, at: At, dur: number, F: number, a = 1) => {
    if (a <= 0) return;
    const tp = (o.track ?? 0) * o.size;
    for (let i = 0; i < s.length; i++) {
      const si = (F - at(i)) / dur;
      if (si < 0) break;
      const ch = s[i]!;
      if (ch === " ") continue;
      const x = left + (i ? measure(ctx, s.slice(0, i), o) + tp : 0),
        ink = clamp((si - 1) * 2.5),
        grey = clamp(si * 3);
      if (ink < 1)
        text(ctx, ch, x, y, { ...o, align: "left", track: 0, color: C.muted, alpha: a * grey * (1 - ink) * 0.7 });
      if (ink > 0) text(ctx, ch, x, y, { ...o, align: "left", track: 0, alpha: a * ink });
    }
  };
  /** the width of what has been typed so far, eased glyph to glyph (for groups that re-centre as they type) */
  const typedW = (ctx: Ctx, s: string, o: TextOpts, at: At, dur: number, F: number) => {
    let n = 0;
    while (n < s.length && F >= at(n)) n++;
    if (n === 0) return 0;
    const prev = n > 1 ? measure(ctx, s.slice(0, n - 1), o) : 0,
      cur = measure(ctx, s.slice(0, n), o);
    return lerp(prev, cur, ease.outCubic(clamp((F - at(n - 1)) / dur)));
  };
  const typeTicks = (c: { s: string; at: At }, step = 3) =>
    [...c.s].flatMap((ch, i) => (i % step === 0 && ch !== " " ? [Math.round(c.at(i))] : []));

  // ---- a picture tile: a flat scene in two or three pack colours, drawn in a unit square
  const scene = (ctx: Ctx, k: Scene, t: number) => {
    const bg = (c: string) => {
      ctx.fillStyle = c;
      ctx.fillRect(0, 0, 1, 1);
    };
    const circ = (x: number, y: number, r: number, c: string) => {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    };
    const box = (x: number, y: number, w: number, h: number, r: number, c: string) => {
      ctx.fillStyle = c;
      rr(ctx, x, y, w, h, r);
      ctx.fill();
    };
    const stroke = (c: string, lw: number) => {
      ctx.strokeStyle = c;
      ctx.lineWidth = lw;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
    };
    const s1 = Math.sin(t * 1.3);
    switch (k) {
      case "moon": {
        bg(C.ink);
        circ(0.68, 0.3 + s1 * 0.01, 0.12, C.accent2);
        circ(0.18, 0.22, 0.012, C.muted);
        circ(0.36, 0.14, 0.01, C.muted);
        ctx.fillStyle = mix(C.ink, C.muted, 0.45);
        ctx.beginPath();
        ctx.moveTo(0, 0.7);
        ctx.quadraticCurveTo(0.3, 0.5, 0.62, 0.7);
        ctx.quadraticCurveTo(0.85, 0.6, 1, 0.66);
        ctx.lineTo(1, 1);
        ctx.lineTo(0, 1);
        ctx.fill();
        ctx.fillStyle = C.muted;
        ctx.beginPath();
        ctx.moveTo(0, 0.86);
        ctx.quadraticCurveTo(0.45, 0.68, 1, 0.84);
        ctx.lineTo(1, 1);
        ctx.lineTo(0, 1);
        ctx.fill();
        break;
      }
      case "plane": {
        bg(C.accent2);
        circ(0.5, 0.62, 0.25, WHITE);
        ctx.save();
        ctx.translate(0.46 + s1 * 0.02, 0.36);
        ctx.rotate(-0.25);
        ctx.fillStyle = C.ink;
        ctx.beginPath();
        ctx.moveTo(0.2, 0);
        ctx.lineTo(-0.18, -0.1);
        ctx.lineTo(-0.08, 0.02);
        ctx.lineTo(-0.16, 0.12);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        ctx.beginPath();
        ctx.moveTo(0.1, 0.5);
        ctx.quadraticCurveTo(0.2, 0.4, 0.3, 0.46);
        ctx.setLineDash([0.03, 0.03]);
        stroke(C.muted, 0.012);
        ctx.setLineDash([]);
        break;
      }
      case "mug": {
        bg(C.line);
        box(0.3, 0.45, 0.34, 0.36, 0.05, C.ink);
        ctx.beginPath();
        ctx.arc(0.66, 0.6, 0.08, -Math.PI / 2, Math.PI / 2);
        stroke(C.ink, 0.04);
        for (let j = 0; j < 3; j++) {
          const x = 0.38 + j * 0.09,
            w = Math.sin(t * 2 + j) * 0.02;
          ctx.beginPath();
          ctx.moveTo(x, 0.38);
          ctx.bezierCurveTo(x + 0.04 + w, 0.32, x - 0.04 - w, 0.26, x, 0.18);
          stroke(C.muted, 0.022);
        }
        break;
      }
      case "clock": {
        bg(WHITE);
        circ(0.5, 0.5, 0.3, C.accent2);
        ctx.beginPath();
        ctx.arc(0.5, 0.5, 0.3, 0, Math.PI * 2);
        stroke(C.ink, 0.03);
        const m = t * 0.8;
        ctx.beginPath();
        ctx.moveTo(0.5, 0.5);
        ctx.lineTo(0.5 + Math.sin(m) * 0.2, 0.5 - Math.cos(m) * 0.2);
        ctx.moveTo(0.5, 0.5);
        ctx.lineTo(0.5 + Math.sin(m / 12 + 2) * 0.12, 0.5 - Math.cos(m / 12 + 2) * 0.12);
        stroke(C.ink, 0.035);
        circ(0.5, 0.5, 0.03, C.ink);
        break;
      }
      case "books": {
        bg(C.accent2);
        box(0.22, 0.66, 0.56, 0.12, 0.02, C.ink);
        box(0.28, 0.54, 0.48, 0.12, 0.02, C.muted);
        box(0.25, 0.42, 0.5, 0.12, 0.02, WHITE);
        box(0.3, 0.3, 0.42, 0.12, 0.02, C.ink);
        break;
      }
      case "lamp": {
        bg(C.ink);
        ctx.fillStyle = rgba(C.accent2, 0.18 + s1 * 0.03);
        ctx.beginPath();
        ctx.moveTo(0.4, 0.44);
        ctx.lineTo(0.6, 0.44);
        ctx.lineTo(0.82, 0.86);
        ctx.lineTo(0.18, 0.86);
        ctx.fill();
        ctx.fillStyle = C.accent2;
        ctx.beginPath();
        ctx.moveTo(0.38, 0.44);
        ctx.lineTo(0.62, 0.44);
        ctx.lineTo(0.56, 0.26);
        ctx.lineTo(0.44, 0.26);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(0.5, 0.26);
        ctx.lineTo(0.5, 0.08);
        stroke(C.muted, 0.02);
        break;
      }
      case "chat": {
        bg(WHITE);
        box(0.14, 0.2, 0.52, 0.24, 0.08, C.accent2);
        box(0.34, 0.52, 0.52, 0.24, 0.08, C.ink);
        for (let j = 0; j < 3; j++) circ(0.5 + j * 0.1, 0.64, 0.025 * (0.7 + 0.3 * Math.sin(t * 4 - j)), WHITE);
        break;
      }
      case "calendar": {
        bg(C.line);
        box(0.2, 0.2, 0.6, 0.62, 0.05, WHITE);
        box(0.2, 0.2, 0.6, 0.15, 0.05, C.ink);
        ctx.fillStyle = C.ink;
        ctx.fillRect(0.2, 0.3, 0.6, 0.05);
        for (let r = 0; r < 3; r++)
          for (let c = 0; c < 4; c++)
            circ(0.3 + c * 0.13, 0.46 + r * 0.12, 0.03, r === 1 && c === 2 ? C.muted : C.line);
        break;
      }
      case "leaf": {
        bg(mix(C.accent2, WHITE, 0.3));
        ctx.save();
        ctx.translate(0.5, 0.52);
        ctx.rotate(-0.6 + s1 * 0.05);
        ctx.fillStyle = C.ink;
        ctx.beginPath();
        ctx.moveTo(0, -0.32);
        ctx.quadraticCurveTo(0.24, 0, 0, 0.32);
        ctx.quadraticCurveTo(-0.24, 0, 0, -0.32);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(0, -0.26);
        ctx.lineTo(0, 0.42);
        stroke(C.accent2, 0.02);
        ctx.restore();
        break;
      }
    }
  };
  const tile = (
    ctx: Ctx,
    k: Scene,
    x: number,
    y: number,
    s: number,
    r: number,
    t: number,
    o: { a?: number; rot?: number; shadow?: number; zoom?: number } = {},
  ) => {
    if (s <= 0.5) return;
    const a = o.a ?? 1;
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.translate(x, y);
    if (o.rot) ctx.rotate(o.rot);
    if (o.shadow)
      card(ctx, -s / 2, -s / 2, s, s, {
        r,
        fill: C.ground,
        shadow: { blur: 26 * u, y: 10 * u, color: rgba(C.ink, 0.13 * o.shadow) },
      });
    rr(ctx, -s / 2, -s / 2, s, s, r);
    ctx.clip();
    const z = o.zoom ?? 1;
    ctx.scale(s * z, s * z);
    ctx.translate(-0.5, -0.5);
    scene(ctx, k, t);
    ctx.restore();
  };
  /** a comet line: where the orb was over the last frames, alpha falling along its length */
  const comet = (ctx: Ctx, pos: (f: number) => Pt, F: number, len = 20, a = 1) => {
    ctx.save();
    ctx.strokeStyle = COMET;
    ctx.lineWidth = 1.8 * u;
    ctx.lineCap = "round";
    let p = pos(F);
    for (let k = 1; k <= len; k++) {
      const q = pos(F - k * 0.75);
      if (Math.hypot(q[0] - p[0], q[1] - p[1]) > 0.1) {
        ctx.globalAlpha = a * 0.9 * (1 - k / len) ** 1.5;
        ctx.beginPath();
        ctx.moveTo(p[0], p[1]);
        ctx.lineTo(q[0], q[1]);
        ctx.stroke();
      }
      p = q;
    }
    ctx.restore();
  };

  // ---------------------------------------------------------------- 0 · the orb is born (0 → 90)
  const SPR = { freq: 1.4, damp: 0.82 };
  const cellW = (F: number) =>
    track(
      F,
      FPS,
      [
        [0, D.wide0[0]!],
        [3, 380],
        [26, 150],
        [42, 232],
        [60, 300],
        [76, 150],
      ],
      SPR,
    );
  const cellH = (F: number) =>
    track(
      F,
      FPS,
      [
        [0, D.wide0[1]!],
        [3, 380],
        [26, 150],
        [42, 232],
        [60, 300],
        [76, 150],
      ],
      SPR,
    );
  const tileSide = (F: number) =>
    track(
      F,
      FPS,
      [
        [40, 68],
        [42, 232],
        [60, 300],
      ],
      { freq: 1.5, damp: 0.86 },
    ) *
      (1 - ease.inOutCubic(prog(F, 72, 86))) +
    D.mark * 0.8 * ease.inOutCubic(prog(F, 72, 86));
  const birth = (ctx: Ctx, F: number) => {
    if (F > 100) return;
    grid(ctx, cx, cy, cellW(F) * u, cellH(F) * u, prog(F, 0, 5) * (1 - prog(F, 84, 104)));
    const r = lerp(2.5, 34, spring((F - 12) / FPS, { freq: 1.2, damp: 0.8 })) * u * prog(F, 8, 12),
      m = ease.inOutCubic(prog(F, 40, 54)),
      toMark = prog(F, 84, 92);
    if (F < 40) {
      orb(ctx, cx, cy, r);
      return;
    }
    const side = lerp(2 * r, tileSide(F) * u, m),
      rad = lerp(side / 2, 18 * u * (tileSide(F) / 300) ** 0.4, m);
    if (toMark < 1) {
      tile(ctx, "moon", cx, cy, side, rad, F / FPS, {
        a: m * (1 - toMark),
        zoom: 1 + 0.12 * ease.inOutCubic(prog(F, 44, 80)),
      });
      // the orb's gloss lingers over the tile as it opens, then clears
      ctx.save();
      rr(ctx, cx - side / 2, cy - side / 2, side, side, rad);
      ctx.clip();
      orb(ctx, cx, cy, (side / 2) * 1.42, (1 - m) * (1 - toMark));
      ctx.restore();
    }
    if (F >= 84 && F < 92) mark(ctx, cx, cy, D.mark * u, toMark);
  };

  // ---------------------------------------------------------------- 1 · the lockup (90 → 150)
  const lockupAt = (ctx: Ctx, F: number, c: { s: string; at: At; dur: number }, a: number) => {
    const o = sans(D.name, 600, C.ink, -0.015),
      tw = typedW(ctx, c.s, o, c.at, c.dur, F),
      gap = 22 * u * clamp(tw / (20 * u)),
      mw = D.mark * u * 0.74,
      groupW = mw + gap + tw,
      left = cx - groupW / 2;
    mark(ctx, left + mw / 2, cy, D.mark * u, a);
    typeAt(ctx, c.s, left + mw + gap, cy + D.name * 0.36 * u, o, c.at, c.dur, F, a);
  };
  const lockup = (ctx: Ctx, F: number) => {
    if (F < 92 || F > 158) return;
    const out = ease.inCubic(prog(F, 140, 152));
    ctx.save();
    push(ctx, 1 + 0.05 * ease.inOutCubic(prog(F, 90, 150)) - 0.08 * out);
    ctx.translate(14 * u * ease.inOutCubic(prog(F, 90, 150)), 0);
    lockupAt(ctx, F, COPY.name, 1 - out);
    ctx.restore();
  };

  // ---------------------------------------------------------------- 2 · the pill (150 → 210)
  const pillHalf = (ctx: Ctx, w: number, h: number, t: number) => {
    const r = h / 2,
      straight = Math.max(0, w / 2 - r),
      arcL = Math.PI * r,
      total = 2 * straight + arcL;
    let left = t * total;
    ctx.moveTo(0, -r);
    const a = Math.min(left, straight);
    ctx.lineTo(a, -r);
    left -= a;
    if (left > 0) {
      ctx.arc(straight, 0, r, -Math.PI / 2, -Math.PI / 2 + Math.min(left, arcL) / r);
      left -= arcL;
    }
    if (left > 0) ctx.lineTo(straight - Math.min(left, straight), r);
  };
  const pill = (ctx: Ctx, F: number) => {
    if (F < 150 || F > 211) return;
    const o = sans(D.pillText, 600, C.ink, 0.14),
      tw = measure(ctx, COPY.pill.s, o),
      pw = tw + 76 * u,
      ph = 62 * u,
      draw = ease.inOutCubic(prog(F, 151, 168)),
      shrink = ease.inCubic(prog(F, 201, 210)),
      k = (1 + 0.035 * ease.inOutCubic(prog(F, 151, 201))) * (1 - shrink);
    if (k <= 0.01) return;
    ctx.save();
    push(ctx, k);
    // the pill's body fills in once its outline has closed
    const fillA = prog(F, 162, 172);
    if (fillA > 0)
      card(ctx, cx - pw / 2, cy - ph / 2, pw, ph, {
        r: ph / 2,
        fill: rgba(C.surface, 0.9 * fillA),
        shadow: { blur: 18 * u, y: 4 * u, color: rgba(C.ink, 0.06 * fillA) },
      });
    ctx.translate(cx, cy);
    ctx.strokeStyle = mix(C.line, C.ink, 0.22);
    ctx.lineWidth = 1.6 * u;
    ctx.lineCap = "round";
    for (const sx of [1, -1]) {
      ctx.save();
      ctx.scale(sx, 1);
      ctx.beginPath();
      pillHalf(ctx, pw, ph, draw);
      ctx.stroke();
      ctx.restore();
    }
    ctx.translate(-cx, -cy);
    typeAt(
      ctx,
      COPY.pill.s,
      cx - tw / 2,
      cy + D.pillText * 0.36 * u,
      o,
      COPY.pill.at,
      COPY.pill.dur,
      F,
      1 - prog(F, 199, 205),
    );
    ctx.restore();
  };

  // ---------------------------------------------------------------- 3 · the tile ring (210 → 360)
  const STACK: [number, number, number][] = [
    [0, 0, 0],
    [-24, -14, -8],
    [24, -12, 7],
  ];
  const ring = (ctx: Ctx, F: number) => {
    if (F < 208 || F > 376) return;
    const S = D.tile * u,
      burst = (j: number) => spring((F - 238 - j * 0.8) / FPS, { freq: 1.25, damp: 0.8 }),
      gather = (j: number) => spring((F - 345 - (8 - j) * 0.5) / FPS, { freq: 1.6, damp: 0.86 }),
      collapse = ease.inOutCubic(prog(F, 360, 372)),
      tileA = 1 - prog(F, 364, 374),
      t = (F - 240) / FPS;
    // the group breathes outward while the ring holds
    const spread = 1 + 0.05 * ease.inOutCubic(prog(F, 250, 345));
    const items = RING.map((R, j) => {
      const appear =
        j === 0
          ? spring((F - 210) / FPS, { freq: 1.8, damp: 0.8 })
          : j < 3
            ? spring((F - 225 - j) / FPS, { freq: 1.8, damp: 0.82 })
            : 0;
      const st = STACK[j] ?? [0, 0, 0],
        sx = st[0] * u * (j < 3 ? appear : 1),
        sy = st[1] * u * (j < 3 ? appear : 1),
        srot = ((st[2] * Math.PI) / 180) * (j < 3 ? appear : 1);
      const ang = (R.a * Math.PI) / 180,
        rx = Math.cos(ang) * D.ringR[0]! * u * R.r * spread,
        ry = Math.sin(ang) * D.ringR[1]! * u * R.r * spread,
        dx = Math.sin(t * 0.9 * R.z + j * 1.7) * 16 * u * R.z,
        dy = Math.cos(t * 0.7 * R.z + j * 2.3) * 11 * u * R.z;
      const b = burst(j),
        g = gather(j),
        on = b * (1 - g);
      // before the burst the stack winds up: it fans a little wider and tucks in
      const wind = ease.inOutCubic(prog(F, 224, 239)) * (1 - b),
        fan = 1 + 0.6 * wind;
      const x = lerp(sx * fan, rx + dx, on) * (1 - collapse),
        y = lerp(sy * fan, ry + dy, on) * (1 - collapse),
        s = lerp(lerp(S * 0.82 * (1 - 0.12 * wind), S * R.z, on), 72 * u, collapse) * (j === 0 ? appear : 1),
        rot = lerp(srot * fan, ((R.rot * Math.PI) / 180) * 0.6, on) * (1 - collapse),
        rad = lerp(14 * u, s / 2, collapse);
      // tiles 3..8 wait hidden under the stack until the burst
      const vis = j < 3 ? 1 : b > 0.01 ? 1 : 0;
      return { j, x, y, s, rot, rad, z: R.z, vis };
    });
    // far first; the stack keeps tile 0 on top
    items.sort((p, q) => p.z - q.z);
    for (const it of items) {
      if (!it.vis) continue;
      tile(ctx, SCENES[it.j]!, cx + it.x, cy + it.y, it.s, it.rad, F / FPS + it.j, {
        a: tileA,
        rot: it.rot,
        shadow: it.z,
      });
    }
    // the line at the centre of the ring
    const o = sans(D.ringText, 400),
      w = measure(ctx, COPY.ring.s, o);
    ctx.save();
    push(ctx, 1 + 0.03 * ease.inOutCubic(prog(F, 252, 342)));
    typeAt(
      ctx,
      COPY.ring.s,
      cx - w / 2,
      cy + D.ringText * 0.36 * u,
      o,
      COPY.ring.at,
      COPY.ring.dur,
      F,
      1 - prog(F, 330, 342),
    );
    ctx.restore();
  };

  // ---------------------------------------------------------------- 4 · the orb again (360 → 420), 5 · comets (420 → 540)
  const breath = (F: number) =>
    track(
      F,
      FPS,
      [
        [364, 36],
        [372, 118],
        [386, 20],
      ],
      { freq: 1.25, damp: 0.84 },
    ) *
    u *
    (1 + 0.03 * Math.sin((F - 364) / 6) * (1 - prog(F, 392, 404)));
  // the flights: a path per size (landscape sweeps left to right; vertical runs top to bottom)
  const FL1: Pt[] = tall
    ? [
        [cx, cy],
        [cx - 250, cy - 330],
        [cx - 150, cy - 120],
        [cx + 150, cy + 110],
        [cx + 300, cy + 520],
        [cx + 380, H + 120],
      ]
    : [
        [cx, cy],
        [cx - 540, cy + 250],
        [cx - 360, cy + 70],
        [cx + 40, cy - 90],
        [cx + 640, cy - 330],
        [W + 120, cy - 470],
      ];
  const FL2: Pt[] = tall
    ? [
        [cx + 460, -120],
        [cx + 300, cy - 440],
        [cx + 60, cy - 210],
        [cx - 250, cy + 190],
        [cx - 400, cy + 640],
        [cx - 470, H + 120],
      ]
    : [
        [W + 120, cy + 440],
        [cx + 560, cy + 250],
        [cx + 120, cy + 112],
        [cx - 380, cy - 110],
        [cx - 700, cy - 330],
        [-120, cy - 470],
      ];
  const flight = (pts: Pt[], a: number, b: number) => (f: number) => spline(pts, ease.inOutCubic(prog(f, a, b)));
  const f1 = flight(FL1, 406, 470),
    f2 = flight(FL2, 486, 540);
  const orbAgain = (ctx: Ctx, F: number) => {
    if (F < 364 || F > 480) return;
    const r0 = breath(F);
    if (F < 404) {
      contact(ctx, cx, cy + r0 * 1.5, r0 * 1.3, prog(F, 392, 402));
      orb(ctx, cx, cy, r0, prog(F, 364, 374));
      return;
    }
    const [x, y] = f1(F),
      k = prog(F, 406, 470);
    comet(ctx, f1, F);
    contact(ctx, cx, cy + r0 * 1.5, r0 * 1.3, 1 - prog(F, 404, 410));
    orb(ctx, x, y, lerp(r0, D.orbR * u, prog(F, 404, 418)) * (1 + 0.2 * Math.sin(Math.PI * k)));
  };
  const cometLines = (ctx: Ctx, F: number) => {
    if (F < 426 || F > 541) return;
    const o = sans(D.line, 400);
    // line 1
    if (F < 482) {
      const w = measure(ctx, COPY.l1.s, o),
        out = ease.inCubic(prog(F, 470, 480));
      ctx.save();
      push(ctx, 1 + 0.025 * ease.inOutCubic(prog(F, 428, 480)));
      ctx.translate(0, -out * 14 * u);
      typeAt(ctx, COPY.l1.s, cx - w / 2, cy + D.line * 0.36 * u, o, COPY.l1.at, COPY.l1.dur, F, 1 - out);
      ctx.restore();
    }
    // line 2 (the vertical breaks it in two centred lines)
    if (F >= 480) {
      const out = ease.inCubic(prog(F, 530, 540)),
        parts = tall ? ["With everyone, from", "invite to calendar."] : [COPY.l2.s];
      ctx.save();
      push(ctx, 1 + 0.025 * ease.inOutCubic(prog(F, 482, 540)));
      ctx.translate(0, -out * 14 * u);
      let off = 0;
      parts.forEach((s, li) => {
        const w = measure(ctx, s, o),
          y = cy + D.line * 0.36 * u + (li - (parts.length - 1) / 2) * D.lineGap * u,
          base = off;
        typeAt(ctx, s, cx - w / 2, y, o, (i) => COPY.l2.at(base + i), COPY.l2.dur, F, 1 - out);
        off += s.length + 1;
      });
      ctx.restore();
    }
    if (F >= 482) {
      comet(ctx, f2, F);
      const k = prog(F, 486, 540);
      orb(ctx, ...f2(F), D.orbR * u * (1 + 0.2 * Math.sin(Math.PI * k)));
    }
  };

  // ---------------------------------------------------------------- 6 · the roller (540 → 690)
  const rollerO = sans(D.line, 400);
  const wordO = sans(D.line, 400);
  const rollerLayout = (ctx: Ctx, F: number) => {
    const box = D.box * u,
      gapA = 18 * u,
      gapB = 16 * u,
      sW = measure(ctx, COPY.plan.s, rollerO),
      ww = WORDS.map((w) => measure(ctx, w, wordO)),
      SPRW = { freq: 1.6, damp: 0.9 };
    if (!tall) {
      const base = sW + gapA + box + gapB;
      const rowW =
        F < 588
          ? typedW(ctx, COPY.plan.s, rollerO, COPY.plan.at, COPY.plan.dur, F)
          : track(
              F,
              FPS,
              [
                [588, sW],
                [590, sW + gapA + box],
                [WORD_AT[0]!, base + ww[0]!],
                [WORD_AT[1]!, base + ww[1]!],
                [WORD_AT[2]!, base + ww[2]!],
                [WORD_AT[3]!, base + ww[3]!],
              ],
              SPRW,
            );
      const left = cx - rowW / 2,
        y = cy + D.line * 0.36 * u;
      return {
        sLeft: left,
        sY: y,
        boxX: left + sW + gapA + box / 2,
        boxY: y - D.line * 0.36 * u,
        wordX: left + base,
        wordY: y,
      };
    }
    const sY = cy - 64 * u + D.line * 0.36 * u,
      rowY = cy + 72 * u + D.line * 0.36 * u,
      rowW = track(
        F,
        FPS,
        [
          [588, box],
          [WORD_AT[0]!, box + gapB + ww[0]!],
          [WORD_AT[1]!, box + gapB + ww[1]!],
          [WORD_AT[2]!, box + gapB + ww[2]!],
          [WORD_AT[3]!, box + gapB + ww[3]!],
        ],
        SPRW,
      ),
      left = cx - rowW / 2,
      tw = typedW(ctx, COPY.plan.s, rollerO, COPY.plan.at, COPY.plan.dur, F);
    return {
      sLeft: cx - tw / 2,
      sY,
      boxX: left + box / 2,
      boxY: rowY - D.line * 0.36 * u,
      wordX: left + box + gapB,
      wordY: rowY,
    };
  };
  /** where the checkbox is: in the sentence, then gliding to the centre of the product cell */
  const boxAt = (ctx: Ctx, F: number): Pt => {
    const R = rollerLayout(ctx, Math.min(F, 678)),
      g = ease.inOutCubic(prog(F, 678, 694));
    return [lerp(R.boxX, cx, g), lerp(R.boxY, D.winY, g)];
  };
  const drop =
    (ctx: Ctx) =>
    (f: number): Pt => {
      const R = rollerLayout(ctx, 600),
        pts: Pt[] = tall
          ? [
              [cx + 420, R.boxY - 600],
              [cx + 300, R.boxY - 210],
              [R.boxX + 110, R.boxY - 24],
              [R.boxX, R.boxY],
            ]
          : [
              [R.boxX - 420, -60],
              [R.boxX - 240, R.boxY - 250],
              [R.boxX - 70, R.boxY - 90],
              [R.boxX, R.boxY],
            ];
      return spline(pts, ease.inOutCubic(prog(f, 578, 600)));
    };
  const roller = (ctx: Ctx, F: number) => {
    if (F < 542 || F >= T.product) return;
    const R = rollerLayout(ctx, F),
      out = prog(F, 674, 686);
    ctx.save();
    push(ctx, 1 + 0.03 * ease.inOutCubic(prog(F, 544, 686)));
    typeAt(ctx, COPY.plan.s, R.sLeft, R.sY, rollerO, COPY.plan.at, COPY.plan.dur, F, 1 - out);
    // the word roller: the old word slides up and fades, the new one rises in from below
    for (let k = 0; k < WORDS.length; k++) {
      const sp = (f: number) => spring((f - WORD_AT[k]!) / FPS, { freq: 2.2, damp: 0.86 }),
        spOut = (f: number) =>
          k + 1 < WORDS.length ? spring((f - WORD_AT[k + 1]!) / FPS, { freq: 2.2, damp: 0.86 }) : 0;
      const inK = sp(F),
        outK = spOut(F);
      if (inK <= 0 || outK >= 0.999) continue;
      const lift = D.line * 0.85 * u,
        dyAt = (f: number) => (1 - sp(f)) * lift - spOut(f) * lift,
        dy = dyAt(F),
        v = dyAt(F + 1) - dy,
        a = clamp(inK * 1.5) * (1 - clamp(outK * 1.5)) * (1 - out);
      // a faked vertical blur: faint copies smeared along the motion while it is fast
      for (const g of [-1, 1])
        if (Math.abs(v) > 0.5) text(ctx, WORDS[k]!, R.wordX, R.wordY + dy + g * v * 0.9, { ...wordO, alpha: a * 0.22 });
      text(ctx, WORDS[k]!, R.wordX, R.wordY + dy, { ...wordO, alpha: a * (Math.abs(v) > 0.5 ? 0.8 : 1) });
    }
    ctx.restore();
    // the orb drops in on a short arc and becomes the checkbox
    const path = drop(ctx),
      [bx, by] = boxAt(ctx, F),
      box = D.box * u,
      morph = ease.inOutCubic(prog(F, 600, 608));
    if (F >= 574 && F < 600) {
      comet(ctx, path, F, 16);
      const [x, y] = path(F);
      contact(ctx, bx, by + box * 0.75, box * 0.7, prog(F, 594, 600));
      orb(ctx, x, y, D.orbR * u * lerp(0.8, box / 2 / (D.orbR * u), prog(F, 590, 600)) * prog(F, 574, 579));
    } else if (F >= 600) {
      comet(ctx, path, F, 16, 1 - prog(F, 600, 606));
      contact(ctx, bx, by + box * 0.75, box * 0.7, 1 - prog(F, 604, 616));
      const pop = 1 + 0.14 * Math.sin(Math.PI * prog(F, 600, 612)),
        s = box * pop,
        rad = lerp(s / 2, 9 * u, morph);
      card(ctx, bx - s / 2, by - s / 2, s, s, { r: rad, fill: C.accent });
      if (morph < 1) {
        ctx.save();
        rr(ctx, bx - s / 2, by - s / 2, s, s, rad);
        ctx.clip();
        orb(ctx, bx, by, (s / 2) * 1.42, 1 - morph);
        ctx.restore();
      }
      check(ctx, bx, by + s * 0.02, s * 0.46, ease.outCubic(prog(F, 604, 616)), WHITE, 4.2 * u);
    }
  };

  // ---------------------------------------------------------------- 7 · the product (690 → 750), 8 · end (750 → 780)
  const WW = D.win[0]! * u,
    WH = D.win[1]! * u;
  const winContent = (ctx: Ctx, F: number) => {
    const t22 = (s: string, x: number, y: number, color = C.muted, weight = 400, align: CanvasTextAlign = "left") =>
      text(ctx, s, x, y, { ...sans(22, weight, color, 0), align });
    // title bar
    [24, 46, 68].forEach((x) => {
      ctx.fillStyle = C.line;
      ctx.beginPath();
      ctx.arc(x * u, 26 * u, 6 * u, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = C.line;
    ctx.fillRect(0, 52 * u, WW, 1.2 * u);
    const book = spring((F - 720) / FPS, { freq: 2, damp: 0.8 });
    const booking = (x: number, y: number, w: number, h: number, label: string, sub?: string) => {
      if (book < 1) {
        ctx.save();
        ctx.setLineDash([6 * u, 6 * u]);
        rr(ctx, x, y, w, h, 10 * u);
        ctx.strokeStyle = C.muted;
        ctx.lineWidth = 1.6 * u;
        ctx.globalAlpha *= 1 - book;
        ctx.stroke();
        ctx.restore();
      }
      // two soft rings breathe out of the booked slot (they keep the hold alive)
      for (const p0 of [720, 736]) {
        const pulse = prog(F, p0, p0 + 26);
        if (pulse <= 0 || pulse >= 1) continue;
        ctx.save();
        ctx.globalAlpha *= (1 - pulse) * 0.5;
        rr(
          ctx,
          x - pulse * 16 * u,
          y - pulse * 16 * u,
          w + pulse * 32 * u,
          h + pulse * 32 * u,
          10 * u + pulse * 16 * u,
        );
        ctx.strokeStyle = C.accent;
        ctx.lineWidth = 2 * u;
        ctx.stroke();
        ctx.restore();
      }
      if (book > 0) {
        const k = clamp(book, 0, 1.2);
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.scale(k, k);
        card(ctx, -w / 2, -h / 2, w, h, { r: 10 * u, fill: C.accent });
        ctx.restore();
        text(ctx, label, x + 14 * u, y + 34 * u, {
          ...sans(tall ? 26 : 22, 600, WHITE, 0),
          alpha: prog(book, 0.75, 1),
        });
        if (sub) text(ctx, sub, x + 14 * u, y + 68 * u, { ...sans(22, 400, C.accent2, 0), alpha: prog(book, 0.75, 1) });
      } else text(ctx, tall ? "Finding a time" : "Finding…", x + 14 * u, y + 34 * u, { ...sans(22, 400, C.muted, 0) });
    };
    if (!tall) {
      t22("Team week", WW / 2, 34 * u, C.muted, 400, "center");
      // sidebar
      ctx.fillStyle = SOFT;
      ctx.fillRect(0, 53 * u, 200 * u, WH - 53 * u);
      mark(ctx, 38 * u, 98 * u, 30 * u);
      t22("Oriel", 62 * u, 106 * u, C.ink, 600);
      ["This week", "Polls", "Rotations", "Office hours"].forEach((s, i) => {
        if (i === 0) card(ctx, 14 * u, 146 * u, 172 * u, 40 * u, { r: 8 * u, fill: C.line });
        t22(s, 28 * u, 174 * u + i * 48 * u, i === 0 ? C.ink : C.muted, i === 0 ? 600 : 400);
      });
      // week grid
      const gx0 = 270 * u,
        gx1 = WW - 20 * u,
        cw = (gx1 - gx0) / 5,
        gy0 = 104 * u,
        rh = (WH - gy0 - 16 * u) / 8;
      ["Mon 12", "Tue 13", "Wed 14", "Thu 15", "Fri 16"].forEach((d, i) =>
        t22(d, gx0 + cw * (i + 0.5), 88 * u, C.muted, 400, "center"),
      );
      ctx.fillStyle = C.line;
      for (let r = 0; r <= 8; r++) ctx.fillRect(gx0, gy0 + r * rh, gx1 - gx0, 1 * u);
      for (let c = 0; c <= 5; c++) ctx.fillRect(gx0 + c * cw, gy0, 1 * u, rh * 8);
      for (let r = 0; r < 8; r++)
        t22(String(9 + r > 12 ? 9 + r - 12 : 9 + r), gx0 - 16 * u, gy0 + r * rh + 26 * u, C.muted, 400, "right");
      const slot = (c: number, h0: number, d: number) =>
        [gx0 + c * cw + 6 * u, gy0 + (h0 - 9) * rh + 5 * u, cw - 12 * u, d * rh - 10 * u] as const;
      (
        [
          [0, 9, 1, "Standup"],
          [1, 11, 1.5, "Review"],
          [2, 10, 1, "1:1"],
          [3, 14, 1, "Planning"],
          [4, 9.5, 1, "Retro"],
          [0, 14.5, 1, "Hiring"],
        ] as const
      ).forEach(([c, h0, d, s]) => {
        const [x, y, w, h] = slot(c, h0, d);
        card(ctx, x, y, w, h, { r: 10 * u, fill: C.accent2 });
        text(ctx, s, x + 14 * u, y + 34 * u, sans(22, 600, C.ink, 0));
      });
      const [x, y, w, h] = slot(2, 12.5, 1.5);
      booking(x, y, w, h, "Team sync");
      // the now line creeps down the week, the orb riding its left end
      const na = prog(F, 704, 716),
        ny = gy0 + (11.6 - 9 + (F - 700) / 40) * rh;
      if (na > 0) {
        ctx.save();
        ctx.globalAlpha *= na;
        ctx.fillStyle = COMET;
        ctx.fillRect(gx0, ny - 0.8 * u, gx1 - gx0, 1.6 * u);
        ctx.restore();
        orb(ctx, gx0, ny, 7 * u, na);
      }
    } else {
      text(ctx, "Thursday", 32 * u, 120 * u, sans(38, 600, C.ink, -0.01));
      t22("Team · six events", 32 * u, 156 * u);
      const rows: [string, string, string, boolean][] = [
        ["9:00", "Standup", "15 min · everyone", false],
        ["10:30", "Review", "Design · 4 people", false],
        ["12:00", "", "", false],
        ["13:00", "Team sync", "A time for all 6", true],
        ["14:30", "1:1", "30 min", false],
        ["16:00", "Retro", "Weekly", false],
      ];
      rows.forEach(([tm, s, sub, isBook], i) => {
        const y = 196 * u + i * 128 * u,
          x = 132 * u,
          w = WW - x - 28 * u,
          h = 104 * u;
        t22(tm, 32 * u, y + 36 * u);
        if (!s) {
          ctx.fillStyle = C.line;
          ctx.fillRect(x, y + h / 2, w, 1.2 * u);
          t22("Free", x + w, y + h / 2 - 12 * u, C.muted, 400, "right");
          return;
        }
        if (isBook) booking(x, y, w, h, s, sub);
        else {
          card(ctx, x, y, w, h, { r: 12 * u, fill: C.accent2 });
          text(ctx, s, x + 14 * u, y + 40 * u, sans(26, 600, C.ink, 0));
          t22(sub, x + 14 * u, y + 76 * u, mix(C.muted, C.ink, 0.3));
        }
      });
    }
  };
  const product = (ctx: Ctx, F: number) => {
    if (F < T.product || F > 770) return;
    const s = spring((F - 690) / FPS, { freq: 1.15, damp: 0.9 }),
      sc = spring((F - 693) / FPS, { freq: 0.95, damp: 0.9 }),
      e = ease.inOutCubic(prog(F, 750, 764)),
      box = D.box * u,
      [bx, by] = boxAt(ctx, F),
      k = 1 + 0.06 * ease.inOutCubic(prog(F, 696, 756));
    const w = lerp(lerp(box, WW, s), D.mark * u * 0.74, e),
      h = lerp(lerp(box, WH, s), D.mark * u, e),
      cellS = (tall ? 320 : 300) * u,
      gw = lerp(lerp(cellS, WW, sc), D.mark * u, e),
      gh = lerp(lerp(cellS, WH, sc), D.mark * u, e);
    ctx.save();
    push(ctx, k, cx, D.winY);
    grid(ctx, bx, by, gw, gh, prog(F, 690, 702) * (1 - prog(F, 750, 760)));
    const colour = prog(F, 690, 698),
      toMark = prog(F, 758, 766),
      rad = lerp(lerp(9 * u, 20 * u, s), 14 * u, e);
    ctx.globalAlpha = 1 - toMark;
    card(ctx, bx - w / 2, by - h / 2, w, h, {
      r: rad,
      fill: C.surface,
      shadow: { blur: 60 * u, y: 18 * u, color: rgba(C.ink, 0.1 * colour) },
    });
    const ca = prog(s, 0.6, 0.95) * (1 - prog(F, 750, 756));
    if (ca > 0) {
      ctx.save();
      rr(ctx, bx - w / 2, by - h / 2, w, h, rad);
      ctx.clip();
      ctx.globalAlpha = ca;
      ctx.translate(bx - w / 2, by - h / 2);
      ctx.scale(w / WW, h / WH);
      winContent(ctx, F);
      ctx.restore();
    }
    if (colour < 1) {
      ctx.globalAlpha = 1 - colour;
      card(ctx, bx - w / 2, by - h / 2, w, h, { r: rad, fill: C.accent });
      check(ctx, bx, by + box * 0.02, box * 0.46 * (w / box), 1, WHITE, 4.2 * u);
    }
    ctx.restore();
  };
  const endCard = (ctx: Ctx, F: number) => {
    if (F < 758) return;
    ctx.save();
    push(ctx, 1 + 0.07 * ease.outCubic(prog(F, 750, 780)), cx, D.winY);
    ctx.translate(0, D.winY - cy);
    lockupAt(ctx, F, COPY.end, prog(F, 758, 766));
    ctx.restore();
  };

  const paint = (ctx: Ctx, env: Env, F: number) => {
    F = clamp(F, 0, N - 1);
    ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
    ctx.fillStyle = C.ground;
    ctx.fillRect(0, 0, W, H);
    birth(ctx, F);
    lockup(ctx, F);
    pill(ctx, F);
    ring(ctx, F);
    orbAgain(ctx, F);
    cometLines(ctx, F);
    roller(ctx, F);
    product(ctx, F);
    endCard(ctx, F);
  };

  const cuts = [0, T.lockup, T.pill, T.ring, T.orb, T.comet, T.roller, T.product, T.end, N],
    names = ["birth", "lockup", "pill", "ring", "orb", "comets", "roller", "product", "end"];
  const shots: Shot[] = names.map((sid, i) => ({
    id: sid,
    start: cuts[i]!,
    end: cuts[i + 1]!,
    draw: (ctx, local, env) =>
      motionBlur(ctx, env, (c, dt) => paint(c, env, cuts[i]! + local + dt), { samples: 5, shutter: 0.4 }),
  }));

  // ---- sound: a soft loop, a gentle kick from the tile ring, ticks, whooshes, a pop and a sign-off
  const SIGN = 756,
    POP = 600;
  const ticks = [
    ...typeTicks(COPY.name),
    ...typeTicks(COPY.pill),
    ...typeTicks(COPY.ring),
    ...typeTicks(COPY.l1),
    ...typeTicks(COPY.l2),
    ...typeTicks(COPY.plan),
    ...typeTicks(COPY.end),
    ...WORD_AT,
    720,
  ];
  const base = beatScore({
    frames: N,
    fps: FPS,
    bpm: BPM,
    mood: "soft",
    whooshes: [240, 436, 512, 598],
    ticks,
    sign: SIGN,
    gain: 0.7,
  });
  const audio = (sr: number): [Float32Array, Float32Array] => {
    const [Lc, Rc] = base(sr),
      n = Lc.length,
      at = (f: number) => Math.round((f / FPS) * sr);
    const add = (i: number, v: number) => {
      if (i < 0 || i >= n) return;
      Lc[i] += v;
      Rc[i] += v;
    };
    // a gentle kick on every other beat, from the tile ring to the product
    for (let f = T.ring; f < T.end; f += 30) {
      const i0 = at(f);
      let ph = 0;
      for (let k = 0; k < 0.22 * sr; k++) {
        const t = k / sr;
        ph += (48 + 80 * Math.exp(-t / 0.025)) / sr;
        add(i0 + k, Math.sin(2 * Math.PI * ph) * Math.exp(-t / 0.08) * 0.22);
      }
    }
    // the pop: a short sine blip with a falling pitch, when the orb becomes the checkbox
    {
      const i0 = at(POP);
      let ph = 0;
      for (let k = 0; k < 0.09 * sr; k++) {
        const t = k / sr;
        ph += (980 - 520 * (t / 0.09)) / sr;
        add(i0 + k, Math.sin(2 * Math.PI * ph) * Math.exp(-t / 0.028) * Math.min(1, t / 0.002) * 0.3);
      }
    }
    let peak = 1e-9;
    for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(Lc[i]!), Math.abs(Rc[i]!));
    const g = (peak > 0.95 ? 0.95 / peak : 1) * 0.66; // about -16 LUFS
    for (let i = 0; i < n; i++) {
      Lc[i] = Lc[i]! * g;
      Rc[i] = Rc[i]! * g;
    }
    return [Lc, Rc];
  };

  return {
    meta: { title: id, W, H, fps: FPS, bpm: BPM, durationFrames: N, raster: "cpu" },
    assets: { images: {}, fonts: P.assets },
    shots,
    audio,
  };
}

export const orbGuide = make("landscape", "orbGuide");
export const orbGuideVertical = make("vertical", "orbGuideVertical");
