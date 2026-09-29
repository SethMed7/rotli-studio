// STUDY 28 · PROOF WITHOUT WORDS (32 s, 60 fps, 90 bpm). A maths explainer in which the shapes do the arguing:
// a 3:4:5 right triangle, the squares on its sides, four copies in a square of side a + b that leave a c² hole,
// the same four rearranged to leave a² and b² holes, a live re-solve as the legs stretch, a unit-cell check and
// a quiet historical line. Every quantity keeps one colour; every symbol in an equation flies out of a shape.
// One source, designed for landscape and vertical. Brand: the neutral pack, palette "chalk".
// Brief: series/studies/briefs/proof-without-words.json · prompt: series/studies/prompts/proof-without-words.prompt.md
//
// The whole film is one continuous function paint(F) of a (fractional) frame F; the geometry is closed-form in
// the legs (a, b), so the figure re-solves live when they change. The shots only name the sections.
import PACK from "../../../brand/packs/studio/pack.json";
import type { Ctx, Env } from "../core";
import type { Film, Shot } from "../film";
import { motionBlur } from "../kit/blur";
import { clamp, lerp, prog } from "../kit/motion";
import { usePack } from "../kit/pack";
import { beatScore } from "../kit/score";
import { layout, type Size } from "../kit/sizes";

const P = usePack(PACK),
  C = P.palette("chalk"),
  FACE = P.face;
const FPS = 60,
  BPM = 90,
  N = 1920; // a beat is 40 frames
const T = { tri: 0, claim: 240, setup: 480, rearr: 800, so: 1120, check: 1440, end: 1680 };
// one colour per quantity, for the whole film
const QA = C.accent2, // side a and its square (blue)
  QB = C.s1, // side b and its square (pink)
  QC = C.accent, // side c and its square (yellow)
  INK = C.ink,
  MUTED = C.muted,
  WHITE = "#ffffff";

type V = [number, number];

// ---- helpers: colour, the S-curve, geometry
const hex = (h: string): [number, number, number] => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgba = (h: string, a = 1) => {
  const [r, g, b] = hex(h);
  return `rgba(${r},${g},${b},${a})`;
};
const mix = (h1: string, h2: string, t: number) => {
  const a = hex(h1),
    b = hex(h2);
  return (
    "#" +
    a
      .map((v, i) =>
        Math.round(lerp(v, b[i]!, clamp(t)))
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
};
const sig = (x: number) => 1 / (1 + Math.exp(-x));
/** the film's one transform curve: a symmetric sigmoid (slow start, fast middle, slow finish) */
const S = (t: number) => (sig(10 * (clamp(t) - 0.5)) - sig(-5)) / (sig(5) - sig(-5));
const sp = (F: number, a: number, b: number) => S(prog(F, a, b));
/** INDICATE: 0 → 1 → 0 over half a beat */
const pulse = (F: number, at: number, len = 20) => Math.sin(Math.PI * prog(F, at, at + len));
/** a LANDING: full on the frame something lands, then decays (a snap, not a swell) */
const snap = (F: number, at: number, tau = 7) => (F < at ? 0 : Math.exp(-(F - at) / tau));
const rot = ([x, y]: V, th: number): V => [x * Math.cos(th) - y * Math.sin(th), x * Math.sin(th) + y * Math.cos(th)];
const add = (p: V, q: V): V => [p[0] + q[0], p[1] + q[1]];
const centroid = (pts: V[]): V => [
  pts.reduce((s, p) => s + p[0], 0) / pts.length,
  pts.reduce((s, p) => s + p[1], 0) / pts.length,
];
const scaleAbout = (pts: V[], k: number): V[] => {
  if (k === 1) return pts;
  const c = centroid(pts);
  return pts.map(([x, y]) => [c[0] + (x - c[0]) * k, c[1] + (y - c[1]) * k]);
};
/** a gentle arc from p to q (a quadratic bend of `lift` px, upward when positive) */
const arc = (p: V, q: V, t: number, lift: number): V => {
  const m: V = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2 - lift],
    r = 1 - t;
  return [r * r * p[0] + 2 * r * t * m[0] + t * t * q[0], r * r * p[1] + 2 * r * t * m[1] + t * t * q[1]];
};

type Poly = {
  stroke: string | string[];
  /** fraction of the perimeter traced (WRITE) */
  write?: number;
  /** 0..1 of the 45% fill */
  fill?: number;
  fillColor?: string;
  fillA?: number;
  width?: number;
  alpha?: number;
  /** INDICATE: 0..1 toward white and toward 1.15× */
  flash?: number;
  /** how much an INDICATE grows the shape (0.15 = 1.15×) */
  grow?: number;
};
/** a shape: its outline traced by arc length, then its fill (same colour, 45%) */
function poly(ctx: Ctx, pts0: V[], o: Poly) {
  const alpha = o.alpha ?? 1,
    fl = o.flash ?? 0;
  if (alpha <= 0.001) return;
  const pts = scaleAbout(pts0, 1 + (o.grow ?? 0.15) * fl),
    n = pts.length;
  const strokes = Array.isArray(o.stroke) ? o.stroke : pts.map(() => o.stroke as string);
  ctx.save();
  ctx.globalAlpha *= alpha;
  const fa = (o.fillA ?? 0.45) * clamp(o.fill ?? 0);
  if (fa > 0) {
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.closePath();
    ctx.fillStyle = rgba(mix(o.fillColor ?? strokes[0]!, WHITE, fl * 0.7), fa);
    ctx.fill();
  }
  const w = clamp(o.write ?? 1);
  if (w > 0) {
    ctx.lineWidth = o.width ?? 4;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    const lens = pts.map((p, i) => Math.hypot(pts[(i + 1) % n]![0] - p[0], pts[(i + 1) % n]![1] - p[1])),
      target = w * lens.reduce((s, l) => s + l, 0);
    let acc = 0;
    for (let i = 0; i < n && acc < target; i++) {
      const p = pts[i]!,
        q = pts[(i + 1) % n]!,
        f = Math.min(1, (target - acc) / (lens[i]! || 1));
      ctx.strokeStyle = mix(strokes[i]!, WHITE, fl * 0.7);
      ctx.beginPath();
      ctx.moveTo(p[0], p[1]);
      ctx.lineTo(lerp(p[0], q[0], f), lerp(p[1], q[1], f));
      ctx.stroke();
      acc += lens[i]!;
    }
  }
  ctx.restore();
}

// ---- type: symbols WRITE (outline traced, then fill), never pop
const font = (family: string, size: number) => `400 ${size}px "${family}"`;
function writeStr(ctx: Ctx, s: string, x: number, y: number, fnt: string, size: number, color: string, p: number) {
  if (p <= 0) return;
  ctx.save();
  ctx.font = fnt;
  (ctx as Ctx & { letterSpacing: string }).letterSpacing = "0px";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  const a = ctx.globalAlpha,
    fp = prog(p, 0.45, 1),
    stroke = clamp(p / 0.6),
    sa = 1 - prog(p, 0.8, 1);
  if (fp > 0) {
    ctx.globalAlpha = a * fp;
    ctx.fillStyle = color;
    ctx.fillText(s, x, y);
  }
  if (sa > 0) {
    const Lg = size * 3.4;
    ctx.globalAlpha = a * sa;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.2, size * 0.022);
    ctx.lineJoin = "round";
    ctx.setLineDash([stroke * Lg, Lg + 1]);
    ctx.strokeText(s, x, y);
  }
  ctx.restore();
}
/** a line of prose, written glyph by glyph from the left */
function writeLine(
  ctx: Ctx,
  s: string,
  x: number,
  y: number,
  size: number,
  color: string,
  p: number,
  align: "left" | "center" = "center",
) {
  if (p <= 0) return;
  const fnt = font(FACE.sans, size);
  ctx.save();
  ctx.font = fnt;
  (ctx as Ctx & { letterSpacing: string }).letterSpacing = "0px";
  const total = ctx.measureText(s).width,
    x0 = align === "center" ? x - total / 2 : x,
    n = s.length;
  for (let i = 0; i < n; i++) {
    if (s[i] === " ") continue;
    const pi = clamp((p - 0.55 * (i / n)) / 0.45);
    if (pi > 0) writeStr(ctx, s[i]!, x0 + ctx.measureText(s.slice(0, i)).width, y, fnt, size, color, pi);
  }
  ctx.restore();
}

// ---- maths terms: variables in the serif italic, numbers and operators in Inter, exponents 60% raised 40%
type Tok = { t: string; e?: string; k: "v" | "n" | "o"; c: string };
const VS = 1.16; // the italic's small x-height, matched to Inter's figures
const baseFont = (k: Tok["k"], size: number) => (k === "v" ? font(FACE.italic, size * VS) : font(FACE.sans, size));
function tokW(ctx: Ctx, k: Tok, size: number) {
  ctx.save();
  (ctx as Ctx & { letterSpacing: string }).letterSpacing = "0px";
  ctx.font = baseFont(k.k, size);
  let w = ctx.measureText(k.t).width;
  if (k.e) {
    ctx.font = font(FACE.sans, size * 0.6);
    w += size * 0.06 + ctx.measureText(k.e).width;
  }
  ctx.restore();
  return w;
}
type TokDraw = { alpha?: number; flash?: number };
/** a term centred on x, on baseline y; p is its WRITE progress */
function term(ctx: Ctx, k: Tok, x: number, y: number, size: number, p: number, o: TokDraw = {}) {
  const alpha = o.alpha ?? 1,
    fl = o.flash ?? 0;
  if (p <= 0 || alpha <= 0.001) return;
  const w = tokW(ctx, k, size),
    x0 = x - w / 2,
    col = mix(k.c, WHITE, fl * 0.7),
    sc = 1 + 0.15 * fl;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y - size * 0.3);
  ctx.scale(sc, sc);
  ctx.translate(-x, -(y - size * 0.3));
  const bf = baseFont(k.k, size),
    bs = k.k === "v" ? size * VS : size;
  writeStr(ctx, k.t, x0, y, bf, bs, col, p);
  if (k.e) {
    ctx.font = bf;
    (ctx as Ctx & { letterSpacing: string }).letterSpacing = "0px";
    const bw = ctx.measureText(k.t).width;
    writeStr(
      ctx,
      k.e,
      x0 + bw + size * 0.06,
      y - size * 0.4,
      font(FACE.sans, size * 0.6),
      size * 0.6,
      col,
      prog(p, 0.2, 1),
    );
  }
  ctx.restore();
}
/** the centre x of each term of an equation laid out on one line, centred on cx */
function slots(ctx: Ctx, toks: Tok[], size: number, cx: number) {
  const gap = size * 0.3,
    ws = toks.map((k) => tokW(ctx, k, size)),
    total = ws.reduce((s, w) => s + w, 0) + gap * (toks.length - 1);
  let x = cx - total / 2;
  const xs = ws.map((w) => {
    const c = x + w / 2;
    x += w + gap;
    return c;
  });
  return { xs, left: cx - total / 2, right: cx + total / 2 };
}
const tk = {
  a2: { t: "a", e: "2", k: "v", c: QA } as Tok,
  b2: { t: "b", e: "2", k: "v", c: QB } as Tok,
  c2: { t: "c", e: "2", k: "v", c: QC } as Tok,
  a: { t: "a", k: "v", c: QA } as Tok,
  b: { t: "b", k: "v", c: QB } as Tok,
  c: { t: "c", k: "v", c: QC } as Tok,
  plus: { t: "+", k: "o", c: INK } as Tok,
  eq: { t: "=", k: "o", c: INK } as Tok,
  q: { t: "?", k: "o", c: INK } as Tok,
  n3: { t: "3", e: "2", k: "n", c: QA } as Tok,
  n4: { t: "4", e: "2", k: "n", c: QB } as Tok,
  n5: { t: "5", e: "2", k: "n", c: QC } as Tok,
  n9: { t: "9", k: "n", c: QA } as Tok,
  n16: { t: "16", k: "n", c: QB } as Tok,
  n25: { t: "25", k: "n", c: QC } as Tok,
};
const ASK: Tok[] = [{ t: "Why is", k: "n", c: INK }, tk.a2, tk.plus, tk.b2, tk.eq, tk.c2, { t: "?", k: "n", c: INK }];

// ---- the geometry, closed-form in the legs (a, b). Maths units, y up; right angle at the origin,
// leg a up the y axis, leg b along the x axis.
const TRI = (a: number, b: number): V[] => [
  [0, 0],
  [0, a],
  [b, 0],
];
/** the triangle placed with its bounding-box centre at screen (x, y), unit s, turned th (maths, CCW) */
const triAt = (a: number, b: number, x: number, y: number, s: number, th: number): V[] =>
  TRI(a, b).map((p) => {
    const [dx, dy] = rot([p[0] - b / 2, p[1] - a / 2], th);
    return [x + s * dx, y - s * dy];
  });
/** the four-corner arrangement (a c² hole) and the rearranged one (a² and b² holes), in a square [0, a + b]² */
const CORNERS = (a: number, b: number): V[] => [
  [0, 0],
  [a + b, 0],
  [a + b, a + b],
  [0, a + b],
];
const REARR = (a: number, b: number): V[] => [
  [a, b],
  [a, 0],
  [a + b, a + b],
  [0, b],
];
/** the bounding-box centre of triangle k (turned k·90°) whose right angle sits at R */
const pivotAt = (R: V, k: number, a: number, b: number): V => add(R, rot([b / 2, a / 2], (k * Math.PI) / 2));
const HOLE_C = (a: number, b: number): V[] => [
  [b, 0],
  [a + b, b],
  [a, a + b],
  [0, a],
];
const HOLE_A = (a: number, b: number): V[] => [
  [0, b],
  [a, b],
  [a, a + b],
  [0, a + b],
];
const HOLE_B = (a: number, b: number): V[] => [
  [a, 0],
  [a + b, 0],
  [a + b, b],
  [a, b],
];

// ---- per-size design
type Lay = {
  s1: number; // the big single triangle's unit (beats 1 and 7)
  tri0: V;
  note: V;
  s: number; // the unit of every other beat
  fig: V; // the claim figure's centre (= the hypotenuse midpoint)
  eqY: number;
  eqS: number;
  lab: number; // the size of a label inside a square
  sq: V;
  stage: V[];
  left: V;
  right: V;
  line: V;
  lineTwo: boolean;
  braceLeft: boolean;
  soY: number;
  stack: V[] | null; // vertical check: three squares stacked by size
  chkY: number;
  endTri: V;
  endEqY: number;
  endEqS: number;
  endLineY: number;
  /** the end line, broken to fit the frame */
  endLines: string[];
  /** the hook: the question's baseline and size, and the note under it */
  askY: number;
  askS: number;
  prose: number;
};
const END1 = "Named for Pythagoras.";
const LAND: Lay = {
  s1: 110,
  tri0: [960, 560],
  note: [960, 318],
  s: 64,
  fig: [960, 432],
  eqY: 930,
  eqS: 84,
  lab: 52,
  sq: [960, 510],
  stage: [
    [430, 680],
    [1490, 680],
    [1490, 350],
    [430, 350],
  ],
  left: [540, 420],
  right: [1380, 420],
  line: [960, 800],
  lineTwo: false,
  braceLeft: false,
  soY: 910,
  stack: null,
  chkY: 930,
  endTri: [960, 380],
  endEqY: 750,
  endEqS: 96,
  endLineY: 852,
  endLines: [END1, "Known to the Babylonians about 1,000 years earlier."],
  askY: 240,
  askS: 80,
  prose: 44,
};
const VERT: Lay = {
  s1: 130,
  tri0: [540, 880],
  note: [540, 606],
  s: 60,
  fig: [540, 700],
  eqY: 1230,
  eqS: 120,
  lab: 50,
  sq: [540, 820],
  stage: [
    [300, 1330],
    [780, 1330],
    [780, 350],
    [300, 350],
  ],
  left: [540, 475],
  right: [540, 1075],
  line: [540, 785],
  lineTwo: false,
  braceLeft: true,
  soY: 1470,
  stack: [
    [470, 340],
    [470, 590],
    [470, 900],
  ],
  chkY: 1310,
  endTri: [540, 720],
  endEqY: 1180,
  endEqS: 120,
  endLineY: 1296,
  endLines: [END1, "Known to the Babylonians", "about 1,000 years earlier."],
  askY: 520,
  askS: 92,
  prose: 44,
};

export function make(size: Size, id: string): Film {
  const Lr = layout(size),
    { W, H } = Lr,
    Y = Lr.tall ? VERT : LAND;

  // ---- shared drawers
  /** the triangle: edges a (R→T), c (T→Q), b (Q→R) keep their colours; `light` 0 = neutral ink */
  const triangle = (
    ctx: Ctx,
    pts: V[],
    o: {
      write?: number;
      fill?: number;
      light?: number[];
      ghost?: number;
      alpha?: number;
      widths?: number;
      flash?: number;
      grow?: number;
      tint?: string;
      tintK?: number;
    },
  ) => {
    const lt = o.light ?? [1, 1, 1],
      g = o.ghost ?? 0,
      cols = [QA, QC, QB].map((q, i) => mix(mix(INK, q, lt[[0, 2, 1][i]!]!), MUTED, g));
    poly(ctx, pts, {
      stroke: cols,
      write: o.write,
      fill: (o.fill ?? 1) * (1 - 0.75 * g),
      fillColor: mix(INK, o.tint ?? INK, o.tintK ?? 0),
      fillA: 0.2 + 0.25 * (o.tintK ?? 0),
      width: (o.widths ?? 4) - 1.2 * g,
      alpha: o.alpha,
      flash: o.flash,
      grow: o.grow,
    });
  };
  /** the right-angle mark, a small square in the corner */
  const mark = (ctx: Ctx, pts: V[], s: number, w: number, alpha = 1) => {
    if (w <= 0 || alpha <= 0) return;
    const [R, T_, Q] = pts as [V, V, V],
      k = 0.42 * s,
      ua: V = [
        (T_[0] - R[0]) / Math.hypot(T_[0] - R[0], T_[1] - R[1]),
        (T_[1] - R[1]) / Math.hypot(T_[0] - R[0], T_[1] - R[1]),
      ],
      ub: V = [
        (Q[0] - R[0]) / Math.hypot(Q[0] - R[0], Q[1] - R[1]),
        (Q[1] - R[1]) / Math.hypot(Q[0] - R[0], Q[1] - R[1]),
      ];
    const p1: V = [R[0] + ua[0] * k, R[1] + ua[1] * k],
      p2: V = [p1[0] + ub[0] * k, p1[1] + ub[1] * k],
      p3: V = [R[0] + ub[0] * k, R[1] + ub[1] * k];
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(p1[0], p1[1]);
    const segs: V[] = [p2, p3];
    let prev = p1;
    segs.forEach((q, i) => {
      const f = clamp(w * 2 - i);
      if (f > 0) ctx.lineTo(lerp(prev[0], q[0], f), lerp(prev[1], q[1], f));
      prev = q;
    });
    ctx.stroke();
    ctx.restore();
  };
  /** side labels a, b, c beside a triangle placed with triAt (th = 0) */
  const sideLabels = (ctx: Ctx, pts: V[], sz: number, p: number[], alpha: number, flash: number[] = [0, 0, 0]) => {
    const [R, T_, Q] = pts as [V, V, V];
    const hyp = Math.hypot(Q[0] - T_[0], Q[1] - T_[1]),
      nx = (R[1] - T_[1]) / hyp, // the outward normal of the hypotenuse, on screen: (a, −b)/c
      ny = (R[0] - Q[0]) / hyp;
    const at: [Tok, V][] = [
      [tk.a, [R[0] - 26 - sz * 0.3, (R[1] + T_[1]) / 2 + sz * 0.3]],
      [tk.b, [(R[0] + Q[0]) / 2, R[1] + 18 + sz * 0.72]],
      [tk.c, [(T_[0] + Q[0]) / 2 + nx * (18 + sz * 0.42), (T_[1] + Q[1]) / 2 + ny * (18 + sz * 0.42) + sz * 0.3]],
    ];
    at.forEach(([k, [x, y]], i) => term(ctx, k, x, y, sz, p[i]!, { alpha, flash: flash[i] }));
  };
  /** a curly brace along p → q, bowing out along the unit normal n */
  const brace = (ctx: Ctx, p: V, q: V, n: V, w: number, alpha = 1) => {
    if (w <= 0 || alpha <= 0) return;
    const Lb = Math.hypot(q[0] - p[0], q[1] - p[1]),
      e: V = [(q[0] - p[0]) / Lb, (q[1] - p[1]) / Lb],
      d = 13,
      gap = 12,
      r = Math.min(d, Lb / 4);
    const at = (s: number, o: number): V => [p[0] + e[0] * s + n[0] * (gap + o), p[1] + e[1] * s + n[1] * (gap + o)];
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.strokeStyle = MUTED;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    const len = Lb + 4 * d;
    ctx.setLineDash([w * len, len + 1]);
    ctx.beginPath();
    const m = (v: V) => ctx.moveTo(v[0], v[1]),
      l = (v: V) => ctx.lineTo(v[0], v[1]),
      qc = (c: V, v: V) => ctx.quadraticCurveTo(c[0], c[1], v[0], v[1]);
    m(at(0, 0));
    qc(at(0, d / 2), at(r, d / 2));
    l(at(Lb / 2 - r, d / 2));
    qc(at(Lb / 2, d / 2), at(Lb / 2, d));
    qc(at(Lb / 2, d / 2), at(Lb / 2 + r, d / 2));
    l(at(Lb - r, d / 2));
    qc(at(Lb, d / 2), at(Lb, 0));
    ctx.stroke();
    ctx.restore();
    return at(Lb / 2, d);
  };

  // the claim figure: maths → screen with its centre (the hypotenuse midpoint) at X
  const figMap =
    (X: V, s: number, a: number, b: number) =>
    (p: V): V => [X[0] + s * (p[0] - b / 2), X[1] - s * (p[1] - a / 2)];
  // the square figure: [0, a + b]² → screen, centred on X
  const sqMap =
    (X: V, s: number, a: number, b: number) =>
    (p: V): V => [X[0] + s * (p[0] - (a + b) / 2), X[1] - s * (p[1] - (a + b) / 2)];
  /** the three squares on the sides, grown g (0..1) outward, in maths units */
  const sideSquares = (a: number, b: number, g: number[]): { pts: V[]; c: V; col: string }[] => {
    const c = Math.hypot(a, b),
      nx = a / c,
      ny = b / c;
    return [
      {
        pts: [
          [0, 0],
          [0, a],
          [-a * g[0]!, a],
          [-a * g[0]!, 0],
        ],
        c: [-a / 2, a / 2],
        col: QA,
      },
      {
        pts: [
          [b, 0],
          [0, 0],
          [0, -b * g[1]!],
          [b, -b * g[1]!],
        ],
        c: [b / 2, -b / 2],
        col: QB,
      },
      {
        pts: [
          [0, a],
          [b, 0],
          [b + nx * c * g[2]!, ny * c * g[2]!],
          [nx * c * g[2]!, a + ny * c * g[2]!],
        ],
        c: [(a + b) / 2, (a + b) / 2],
        col: QC,
      },
    ];
  };

  // ============ beats 1–2 · the triangle and the claim (F < 530)
  const SQ_T = [256, 280, 304]; // each square grows over 32 frames (outline), then fills
  const LIFT = [368, 392, 416]; // a², b², c² lift off (36 frames each)
  const claimScene = (ctx: Ctx, F: number) => {
    const a = 3,
      b = 4,
      m = sp(F, 228, 268),
      X: V = [lerp(Y.tri0[0], Y.fig[0], m), lerp(Y.tri0[1], Y.fig[1], m)],
      s = lerp(Y.s1, Y.s, m),
      map = figMap(X, s, a, b);
    const ghost = sp(F, 480, 496),
      gone = 1 - sp(F, 490, 516);
    const eq = [tk.a2, tk.plus, tk.b2, tk.eq, tk.c2],
      sl = slots(ctx, eq, Y.eqS, Y.fig[0]),
      eqA = 1 - sp(F, 484, 508),
      eqDrop = 24 * sp(F, 484, 508);
    // the squares grow outward from the sides
    const sq = sideSquares(
      a,
      b,
      SQ_T.map((t) => sp(F, t, t + 32)),
    );
    sq.forEach((q, i) => {
      if (F < SQ_T[i]!) return;
      poly(ctx, q.pts.map(map), {
        stroke: mix(q.col, MUTED, ghost),
        fill: sp(F, SQ_T[i]! + 32, SQ_T[i]! + 44) * (1 - ghost),
        alpha: gone,
        // each square points as its label lifts off, and all three with the '?'
        flash: Math.max(pulse(F, LIFT[i]! - 4, 20), pulse(F, 456, 20)),
        grow: 0.06,
      });
    });
    // the triangle writes on, then each side lights in its colour
    if (F < T.setup) {
      const pts = triAt(a, b, X[0], X[1], s, 0),
        LT = [56, 96, 136],
        light = LT.map((t) => sp(F, t, t + 18)),
        thick = LT.reduce((w, t) => w + 3 * pulse(F, t, 24), 0),
        glow = LT.map((t) => pulse(F, t, 26)),
        gi = glow.indexOf(Math.max(...glow));
      // as each side lights, the triangle glows in its colour for a moment; then the whole triangle points
      triangle(ctx, pts, {
        write: S(prog(F, 3, 33)),
        fill: sp(F, 28, 42),
        light,
        widths: 4 + thick,
        tint: [QA, QB, QC][gi],
        tintK: glow[gi],
        flash: pulse(F, 188, 24),
        grow: 0.1,
      });
      mark(ctx, pts, s, prog(F, 36, 52));
      sideLabels(
        ctx,
        pts,
        Lr.tall ? 64 : 56,
        [60, 100, 140].map((t) => prog(F, t, t + 24)),
        1 - prog(F, 230, 248),
      );
    }
    // the hook: the question writes on by the first beat, in the quantities' colours; under it, muted,
    // "a right triangle"; both fade before the claim assembles its own equation out of the squares
    if (F < 240) {
      ctx.save();
      ctx.globalAlpha = 1 - prog(F, 196, 226);
      const rise = 10 * prog(F, 20, 226),
        ask = slots(ctx, ASK, Y.askS, Y.note[0]);
      ASK.forEach((k, i) =>
        term(ctx, k, ask.xs[i]!, Y.askY - rise, Y.askS, prog(F, -6 + 3 * i, 14 + 3 * i), {
          flash: 0.5 * snap(F, 40, 8) * (k === tk.q ? 1 : 0),
        }),
      );
      writeLine(ctx, "a right triangle", Y.note[0], Y.note[1] - rise, Y.prose, MUTED, prog(F, 18, 62));
      ctx.restore();
    }
    // the labels write at each square's centre, then lift off one at a time into 'a² + b² = c²'
    const src = [tk.a2, tk.b2, tk.c2],
      slotOf = [0, 2, 4];
    src.forEach((k, i) => {
      const labT = SQ_T[i]! + 34;
      if (F < labT) return;
      const c0 = map(sq[i]!.c),
        from: V = [c0[0], c0[1] + Y.lab * 0.3],
        to: V = [sl.xs[slotOf[i]!]!, Y.eqY + eqDrop],
        t = sp(F, LIFT[i]!, LIFT[i]! + 36),
        pos = arc(from, to, t, 70 + 0.12 * Math.hypot(to[0] - from[0], to[1] - from[1]));
      term(ctx, k, pos[0], pos[1], lerp(Y.lab, Y.eqS, t), prog(F, labT, labT + 22), {
        alpha: t > 0 ? eqA : gone,
      });
    });
    ctx.save();
    ctx.globalAlpha = eqA;
    term(ctx, tk.plus, sl.xs[1]!, Y.eqY + eqDrop, Y.eqS, prog(F, 400, 416));
    term(ctx, tk.eq, sl.xs[3]!, Y.eqY + eqDrop, Y.eqS, prog(F, 424, 440));
    term(ctx, tk.q, sl.xs[3]!, Y.eqY + eqDrop - Y.eqS * 0.82, Y.eqS * 0.5, prog(F, 438, 454), {
      flash: pulse(F, 456, 20),
    });
    ctx.restore();
  };

  // ============ beat 3 · setup (480 ≤ F < 800): four copies in a square of side a + b
  const FLY = [600, 640, 680, 720];
  const bigSquare = (
    ctx: Ctx,
    X: V,
    s: number,
    a: number,
    b: number,
    o: {
      outline?: number;
      outlineGhost?: number;
      tri: { r: number; ghost: number; fill: number; alpha: number; flash?: number }[];
      holes: { fill: number; flash: number; label: number; labelAlpha?: number; grow?: number }[]; // c, a, b
      alpha?: number;
      /** INDICATE the whole square (a gentle 1.06×) */
      flash?: number;
    },
  ) => {
    const map = sqMap(X, s, a, b),
      al = o.alpha ?? 1;
    if (al <= 0.001) return;
    ctx.save();
    ctx.globalAlpha *= al;
    const k0 = 1 + 0.06 * (o.flash ?? 0);
    ctx.translate(X[0], X[1]);
    ctx.scale(k0, k0);
    ctx.translate(-X[0], -X[1]);
    const box = [
      [0, 0],
      [a + b, 0],
      [a + b, a + b],
      [0, a + b],
    ].map((p) => map(p as V));
    poly(ctx, box, {
      stroke: mix(mix(INK, MUTED, o.outlineGhost ?? 0), WHITE, o.flash ?? 0),
      write: o.outline ?? 1,
      width: 4 + 3 * (o.flash ?? 0),
    });
    const cor = CORNERS(a, b),
      rea = REARR(a, b);
    o.tri.forEach((t, k) => {
      if (t.alpha <= 0) return;
      const R0 = pivotAt(cor[k]!, k, a, b),
        R1 = pivotAt(rea[k]!, k, a, b),
        pv = map([lerp(R0[0], R1[0], t.r), lerp(R0[1], R1[1], t.r)]);
      triangle(ctx, triAt(a, b, pv[0], pv[1], s, (k * Math.PI) / 2), {
        ghost: t.ghost,
        fill: t.fill,
        alpha: t.alpha,
        tint: WHITE,
        tintK: 0.45 * (t.flash ?? 0),
      });
    });
    const holes: [V[], string, Tok][] = [
      [HOLE_C(a, b), QC, tk.c2],
      [HOLE_A(a, b), QA, tk.a2],
      [HOLE_B(a, b), QB, tk.b2],
    ];
    holes.forEach(([pts, col, k], i) => {
      const h = o.holes[i];
      if (!h || (h.fill <= 0 && h.label <= 0)) return;
      const sp_ = pts.map(map);
      if (h.fill > 0)
        poly(ctx, sp_, { stroke: col, fill: h.fill, write: 1, alpha: clamp(h.fill * 3), flash: h.flash, grow: h.grow });
      const c = centroid(sp_);
      term(ctx, k, c[0], c[1] + Y.lab * 0.3, Y.lab, h.label, { alpha: h.labelAlpha ?? 1 });
    });
    ctx.restore();
  };
  /** the eight braces on the setup square: each edge reads b then a */
  const squareBraces = (ctx: Ctx, X: V, s: number, a: number, b: number, w: number, lw: number, alpha: number) => {
    if (alpha <= 0 || w <= 0) return;
    const map = sqMap(X, s, a, b),
      h = a + b;
    // [from, to, outward normal (screen)], for the four edges, split at the triangles' corners
    const edges: [V, V, V, V, V][] = [
      [
        [0, 0],
        [b, 0],
        [h, 0],
        [0, 1],
        [0, 0],
      ],
      [
        [h, 0],
        [h, b],
        [h, h],
        [1, 0],
        [0, 0],
      ],
      [
        [h, h],
        [a, h],
        [0, h],
        [0, -1],
        [0, 0],
      ],
      [
        [0, h],
        [0, a],
        [0, 0],
        [-1, 0],
        [0, 0],
      ],
    ];
    edges.forEach(([p0, pm, p1, n]) => {
      const segs: [V, V, Tok][] = [
        [p0, pm, tk.b],
        [pm, p1, tk.a],
      ];
      segs.forEach(([p, q, k]) => {
        const tip = brace(ctx, map(p), map(q), n, w, alpha);
        if (!tip) return;
        const sz = 44,
          off = n[1] !== 0 ? (n[1] > 0 ? sz * 0.95 : -sz * 0.35) : 0;
        term(ctx, k, tip[0] + n[0] * sz * 0.55, tip[1] + off + (n[0] !== 0 ? sz * 0.3 : 0), sz, lw, { alpha });
      });
    });
  };
  const setupScene = (ctx: Ctx, F: number) => {
    const a = 3,
      b = 4,
      s = Y.s;
    // the big square writes on, with muted braces reading a and b along each edge
    const outline = sp(F, 572, 598);
    if (F >= 572) {
      bigSquare(ctx, Y.sq, s, a, b, {
        outline,
        tri: [],
        // the hole is revealed hard on the frame the fourth triangle lands
        holes: [{ fill: F >= 760 ? 1 : 0, flash: snap(F, 760, 9), label: prog(F, 766, 790), grow: 0.03 }],
        flash: 0.5 * snap(F, 760, 9),
      });
      squareBraces(ctx, Y.sq, s, a, b, prog(F, 590, 620), prog(F, 598, 624), 1);
    }
    const map = sqMap(Y.sq, s, a, b),
      cor = CORNERS(a, b);
    for (let k = 0; k < 4; k++) {
      // stage: triangle 0 moves off the claim figure; copies 1..3 peel off it as ghost outlines, slide, then fill
      const move0 = sp(F, 490, 530),
        peel = k ? sp(F, 530 + 7 * (k - 1), 570 + 7 * (k - 1)) : 1,
        filled = k ? sp(F, 572 + 7 * (k - 1), 594 + 7 * (k - 1)) : 1,
        st0: V = [lerp(Y.fig[0], Y.stage[0]![0], move0), lerp(Y.fig[1], Y.stage[0]![1], move0)],
        stK: V = [lerp(st0[0], Y.stage[k]![0], peel), lerp(st0[1], Y.stage[k]![1], peel)];
      if (k && F < 530) continue;
      // fly in: one per beat, each turning 90° more than the last
      const f = sp(F, FLY[k]!, FLY[k]! + 40),
        tgt = map(pivotAt(cor[k]!, k, a, b)),
        x = lerp(stK[0], tgt[0], f),
        y = lerp(stK[1], tgt[1], f) - Math.sin(Math.PI * f) * 40,
        pts = triAt(a, b, x, y, s, (f * k * Math.PI) / 2);
      triangle(ctx, pts, { ghost: 1 - filled, fill: filled, flash: snap(F, FLY[k]! + 40, 6), grow: 0.04 });
      if (k === 0) mark(ctx, pts, s, 1, 1 - prog(F, FLY[0]!, FLY[0]! + 16));
    }
  };

  // ============ beats 4–5 · rearrange and so (800 ≤ F < 1470)
  const legs = (F: number): [number, number] => {
    const t1 = sp(F, 1360, 1400),
      t2 = sp(F, 1400, 1440),
      t3 = sp(F, 1440, 1468);
    const a = lerp(lerp(lerp(3, 4.3, t1), 2.2, t2), 3, t3),
      b = lerp(lerp(lerp(4, 2.9, t1), 4.9, t2), 4, t3);
    return [a, b];
  };
  const SO_A = [tk.c2, tk.eq, tk.a2, tk.plus, tk.b2],
    SO_B = [tk.a2, tk.plus, tk.b2, tk.eq, tk.c2];
  const squaresScene = (ctx: Ctx, F: number) => {
    const [a, b] = legs(F),
      s = Y.s,
      slide = sp(F, 800, 840),
      clear = 1 - sp(F, 1440, 1466),
      // once the line between them has gone, the two squares close in around the equation
      conv = sp(F, 1228, 1268) * (Lr.tall ? 40 : 80),
      dx = Lr.tall ? 0 : conv,
      dy = Lr.tall ? conv : 0,
      XL: V = [lerp(Y.sq[0], Y.left[0], slide) + dx, lerp(Y.sq[1], Y.left[1], slide) + dy],
      XR: V = [lerp(Y.sq[0], Y.right[0], slide) - dx, lerp(Y.sq[1], Y.right[1], slide) - dy];
    const dim = (i: number) => sp(F, 1060 + 9 * i, 1076 + 9 * i),
      copyFill = sp(F, 838, 858),
      sameSq = pulse(F, 976, 24), // as the brace writes
      sameTri = pulse(F, 1016, 24), // as 'same four triangles' writes
      done = pulse(F, 1320, 20), // the equation completes: all three areas point at once
      hg = F >= 1300 ? 0.04 : 0.15; // together they point gently, so they stay inside their squares
    // the braces of the setup square go first
    squareBraces(ctx, XL, s, a, b, 1, 1, 1 - prog(F, 800, 816));
    // lifts (so): c² from the left hole, a² and b² from the right holes
    const LC = 1164,
      LA = 1188,
      LB = 1212;
    bigSquare(ctx, XL, s, a, b, {
      tri: [0, 1, 2, 3].map((k) => ({ r: 0, ghost: dim(k), fill: 1, alpha: 1, flash: sameTri })),
      holes: [{ fill: 1, flash: Math.max(pulse(F, 1150), done), label: F < LC ? 1 : 0, grow: hg }],
      alpha: clear,
      flash: sameSq,
    });
    // the copy peels off as a ghost, slides right (down, vertical), then fills; its triangles rearrange
    // two at a time: triangles 1 and 3 (landing on beat 23, which frees the a² hole), then triangle 0
    // (landing on beat 24, which frees the b² hole)
    const r = [sp(F, 920, 960), sp(F, 861, 913), 0, sp(F, 868, 920)],
      landed = [snap(F, 960, 6), snap(F, 913, 6), 0, snap(F, 920, 6)],
      hgR = F < 1100 ? 0.03 : hg;
    bigSquare(ctx, XR, s, a, b, {
      outlineGhost: 1 - copyFill,
      tri: [0, 1, 2, 3].map((k) => ({
        r: r[k]!,
        ghost: Math.max(1 - copyFill, dim(4 + k)),
        fill: copyFill,
        alpha: 1,
        flash: Math.max(sameTri, landed[k]!),
      })),
      holes: [
        { fill: 0, flash: 0, label: 0 },
        {
          fill: F >= 920 ? 1 : 0,
          flash: Math.max(snap(F, 920, 12), pulse(F, 1176), done),
          label: F < LA ? prog(F, 926, 948) : 0,
          grow: hgR,
        },
        {
          fill: F >= 960 ? 1 : 0,
          flash: Math.max(snap(F, 960, 12), pulse(F, 1200), done),
          label: F < LB ? prog(F, 966, 988) : 0,
          grow: hgR,
        },
      ],
      alpha: clear,
      flash: sameSq,
    });
    // same square, same four triangles: a brace reading 'a + b' on each, and the line between them
    const bw = prog(F, 976, 1002),
      ba = 1 - prog(F, 1100, 1120);
    if (bw > 0 && ba > 0)
      [XL, XR].forEach((X) => {
        const h = ((a + b) * s) / 2,
          p: V = Y.braceLeft ? [X[0] - h, X[1] + h] : [X[0] - h, X[1] + h],
          q: V = Y.braceLeft ? [X[0] - h, X[1] - h] : [X[0] + h, X[1] + h],
          n: V = Y.braceLeft ? [-1, 0] : [0, 1],
          tip = brace(ctx, p, q, n, bw, ba)!;
        const sz = 44,
          lw = prog(F, 984, 1010),
          toks = [tk.a, tk.plus, tk.b];
        const cx = Y.braceLeft ? tip[0] - 16 - 60 : tip[0],
          y = Y.braceLeft ? tip[1] + sz * 0.3 : tip[1] + 14 + sz * 0.72,
          sl = slots(ctx, toks, sz, cx);
        toks.forEach((k, i) => term(ctx, k, sl.xs[i]!, y, sz, clamp(lw * 1.6 - i * 0.3), { alpha: ba }));
      });
    ctx.save();
    ctx.globalAlpha = ba;
    if (Y.lineTwo) {
      writeLine(ctx, "same square", Y.line[0], Y.line[1] - 12, Y.prose, MUTED, prog(F, 1006, 1032));
      writeLine(ctx, "same four triangles", Y.line[0], Y.line[1] + 32, Y.prose, MUTED, prog(F, 1046, 1076));
    } else
      writeLine(ctx, "same square · same four triangles", Y.line[0], Y.line[1], Y.prose, MUTED, prog(F, 980, 1050));
    ctx.restore();

    // so: the labels lift out and assemble 'c² = a² + b²', then the sides swap into 'a² + b² = c²'
    if (F < 1150) return;
    const A = slots(ctx, SO_A, Y.eqS, Y.fig[0]),
      B = slots(ctx, SO_B, Y.eqS, Y.fig[0]),
      eqY = Y.soY,
      mapL = sqMap(XL, s, a, b),
      mapR = sqMap(XR, s, a, b),
      cHole = centroid(HOLE_C(a, b).map(mapL)),
      aHole = centroid(HOLE_A(a, b).map(mapR)),
      bHole = centroid(HOLE_B(a, b).map(mapR));
    const swapAt = [1272, 1276, 1280, 1280, 1280]; // c², =, a², +, b²
    const ind = 0.4 * pulse(F, 1320, 20);
    ctx.save();
    ctx.globalAlpha = clear;
    SO_A.forEach((k, i) => {
      const iB = SO_B.indexOf(k),
        sw = sp(F, swapAt[i]!, swapAt[i]! + 40),
        pA: V = [A.xs[i]!, eqY],
        pB: V = [B.xs[iB]!, eqY],
        // off the baseline early (so nothing slides through a neighbour), back on it at the end;
        // c² and '=' both travel right, so c² goes over at twice the height
        lift =
          k === tk.c2 ? Y.eqS * (Lr.tall ? 1.1 : 1.5) : k === tk.eq ? Y.eqS * (Lr.tall ? 0.5 : 0.65) : -Y.eqS * 0.8,
        home: V = [lerp(pA[0], pB[0], sw), eqY - lift * Math.sqrt(Math.sin(Math.PI * sw))];
      const src = k === tk.c2 ? cHole : k === tk.a2 ? aHole : k === tk.b2 ? bHole : null,
        L0 = k === tk.c2 ? LC : k === tk.a2 ? LA : k === tk.b2 ? LB : 0;
      if (src) {
        if (F < L0) return;
        const t = sp(F, L0, L0 + 40),
          from: V = [src[0], src[1] + Y.lab * 0.3],
          pos = t < 1 ? arc(from, home, t, 60 + 0.12 * Math.hypot(home[0] - from[0], home[1] - from[1])) : home;
        term(ctx, k, pos[0], pos[1], lerp(Y.lab, Y.eqS, t), 1, { flash: ind });
      } else {
        const wAt = k === tk.eq ? 1196 : 1224;
        term(ctx, k, home[0], home[1], Y.eqS, prog(F, wAt, wAt + 16), { flash: ind });
      }
    });
    ctx.restore();
  };

  // ============ beat 6 · a check with numbers (1440 ≤ F < 1720)
  const COUNT: [number, number][] = [
    [1484, 1500],
    [1500, 1524],
    [1524, 1556],
  ];
  const cellAt = (q: number, i: number, n: number) => COUNT[q]![0] + (i * (COUNT[q]![1] - COUNT[q]![0])) / n;
  const checkSquares = () => {
    // each square: origin and two unit axes in maths units, side n, a maths → screen map, a counter anchor
    const a = 3,
      b = 4,
      s = Y.s;
    if (Y.stack) {
      return [3, 4, 5].map((n, q) => {
        const c = Y.stack![q]!,
          map = (p: V): V => [c[0] + s * p[0], c[1] - s * p[1]];
        return {
          n,
          o: [-n / 2, -n / 2] as V,
          e1: [1, 0] as V,
          e2: [0, 1] as V,
          map,
          counter: [c[0] + (n * s) / 2 + 30, c[1] + 14] as V,
          align: "left" as const,
          col: [QA, QB, QC][q]!,
        };
      });
    }
    const map = figMap(Y.fig, s, a, b),
      cc = Math.hypot(a, b);
    return [
      {
        n: 3,
        o: [-3, 0] as V,
        e1: [1, 0] as V,
        e2: [0, 1] as V,
        map,
        counter: map([-3.35, 1.5]),
        align: "right" as const,
        col: QA,
      },
      {
        n: 4,
        o: [0, -4] as V,
        e1: [1, 0] as V,
        e2: [0, 1] as V,
        map,
        counter: map([-0.4, -2.3]),
        align: "right" as const,
        col: QB,
      },
      {
        n: 5,
        o: [b, 0] as V,
        e1: [-b / cc, a / cc] as V,
        e2: [a / cc, b / cc] as V,
        map,
        counter: map([7.35, 3.6]),
        align: "left" as const,
        col: QC,
      },
    ];
  };
  const CHK = [tk.n3, tk.plus, tk.n4, tk.eq, tk.n5],
    NUM = [tk.n9, tk.plus, tk.n16, tk.eq, tk.n25];
  const checkScene = (ctx: Ctx, F: number) => {
    const out = 1 - sp(F, 1680, 1706),
      sqs = checkSquares();
    ctx.save();
    ctx.globalAlpha = out;
    const centres: V[] = [];
    sqs.forEach((q, qi) => {
      const pt = (i: number, j: number): V =>
          q.map([q.o[0] + q.e1[0] * i + q.e2[0] * j, q.o[1] + q.e1[1] * i + q.e2[1] * j]),
        n = q.n,
        box = [pt(0, 0), pt(n, 0), pt(n, n), pt(0, n)];
      centres.push(centroid(box));
      // cells fill in as they count
      for (let j = 0; j < n; j++)
        for (let i = 0; i < n; i++) {
          const idx = j * n + i,
            f = prog(F, cellAt(qi, idx, n * n), cellAt(qi, idx, n * n) + 5);
          if (f > 0)
            poly(ctx, [pt(i, j), pt(i + 1, j), pt(i + 1, j + 1), pt(i, j + 1)], { stroke: q.col, write: 0, fill: f });
        }
      // ruled into unit cells
      const gl = prog(F, 1476, 1494);
      if (gl > 0) {
        ctx.save();
        ctx.strokeStyle = rgba(q.col, 0.45 * gl);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 1; i < n; i++) {
          const [p0, p1, p2, p3] = [pt(i, 0), pt(i, n), pt(0, i), pt(n, i)];
          ctx.moveTo(p0[0], p0[1]);
          ctx.lineTo(p1[0], p1[1]);
          ctx.moveTo(p2[0], p2[1]);
          ctx.lineTo(p3[0], p3[1]);
        }
        ctx.stroke();
        ctx.restore();
      }
      poly(ctx, box, { stroke: q.col, write: sp(F, 1456 + 6 * qi, 1482 + 6 * qi), fill: 0 });
      // the counter
      const started = Math.min(
        n * n,
        Math.max(0, Math.floor(((F - COUNT[qi]![0]) / (COUNT[qi]![1] - COUNT[qi]![0])) * n * n) + 1),
      );
      if (F >= COUNT[qi]![0]) {
        const k: Tok = { t: String(started), k: "n", c: q.col },
          w = tokW(ctx, k, 40),
          x = q.align === "left" ? q.counter[0] + w / 2 : q.counter[0] - w / 2;
        term(ctx, k, x, q.counter[1], 40, prog(F, COUNT[qi]![0], COUNT[qi]![0] + 10));
      }
    });
    // the triangle (landscape keeps the figure)
    if (!Y.stack && F < T.end) {
      const pts = triAt(3, 4, Y.fig[0], Y.fig[1], Y.s, 0);
      triangle(ctx, pts, { write: sp(F, 1450, 1476), fill: prog(F, 1466, 1486) });
      mark(ctx, pts, Y.s, prog(F, 1474, 1488));
    }
    ctx.restore();
    // '3² + 4² = 5²', term by term out of the squares, then '9 + 16 = 25' out of the counters
    const A = slots(ctx, CHK, Y.eqS, Y.fig[0]),
      B = slots(ctx, NUM, Y.eqS, Y.fig[0]),
      y = Y.chkY,
      fl = 0.35 * pulse(F, 1640, 20),
      numOut = 1 - sp(F, 1680, 1700),
      liftOff = sp(F, 1600, 1622);
    const flyT = [1498, 1522, 1554];
    [0, 2, 4].forEach((slot, q) => {
      const k = CHK[slot]!,
        t = sp(F, flyT[q]!, flyT[q]! + 32);
      if (F < flyT[q]!) return;
      const from: V = [centres[q]![0], centres[q]![1] + Y.lab * 0.3],
        to: V = [A.xs[slot]!, y],
        pos = arc(from, to, t, 60 + 0.12 * Math.hypot(to[0] - from[0], to[1] - from[1]));
      term(ctx, k, pos[0], pos[1] - liftOff * Y.eqS * 0.6, lerp(Y.lab, Y.eqS, t), prog(F, flyT[q]!, flyT[q]! + 14), {
        alpha: out * (1 - liftOff),
      });
      // the numbers fly out of the counters
      const nt = sp(F, 1594 + 3 * q, 1634 + 3 * q);
      if (nt <= 0) return;
      const cnt = sqs[q]!,
        nk = NUM[slot]!,
        w = tokW(ctx, nk, 40),
        c0: V = [cnt.align === "left" ? cnt.counter[0] + w / 2 : cnt.counter[0] - w / 2, cnt.counter[1]],
        np = arc(c0, [B.xs[slot]!, y], nt, 50);
      term(ctx, nk, np[0], np[1], lerp(40, Y.eqS, nt), 1, { alpha: numOut, flash: fl });
    });
    [
      [1, 1522],
      [3, 1548],
    ].forEach(([slot, at]) => {
      const m = sp(F, 1600, 1640),
        x = lerp(A.xs[slot!]!, B.xs[slot!]!, m);
      term(ctx, CHK[slot!]!, x, y, Y.eqS, prog(F, at!, at! + 14), { alpha: numOut, flash: fl });
    });
  };

  // ============ beat 7 · end (F ≥ 1680)
  const endScene = (ctx: Ctx, F: number) => {
    const drift = -36 * prog(F, 1700, 1920),
      m = Y.stack ? 1 : sp(F, 1684, 1724),
      X: V = [lerp(Y.fig[0], Y.endTri[0], m), lerp(Y.fig[1], Y.endTri[1], m) + drift],
      s = lerp(Y.s, Y.s1, m),
      pts = triAt(3, 4, X[0], X[1], s, 0),
      legInd = [1840, 1862, 1884].map((t) => pulse(F, t, 20));
    triangle(ctx, pts, {
      write: Y.stack ? sp(F, 1686, 1712) : 1,
      fill: Y.stack ? prog(F, 1704, 1724) : 1,
      widths: 4 + 3 * Math.max(...legInd),
    });
    mark(ctx, pts, s, Y.stack ? prog(F, 1712, 1726) : 1);
    sideLabels(
      ctx,
      pts,
      Lr.tall ? 64 : 56,
      [1718, 1724, 1730].map((t) => prog(F, t, t + 22)),
      1,
      legInd,
    );
    const eq = [tk.a2, tk.plus, tk.b2, tk.eq, tk.c2],
      sl = slots(ctx, eq, Y.endEqS, Y.endTri[0]),
      y = Y.endEqY + drift,
      termInd = [legInd[0]!, 0, legInd[1]!, 0, legInd[2]!];
    eq.forEach((k, i) =>
      term(ctx, k, sl.xs[i]!, y, Y.endEqS, prog(F, 1706 + 6 * i, 1728 + 6 * i), { flash: termInd[i] }),
    );
    // the end-of-proof mark
    const qs = Y.endEqS * 0.4,
      qx = sl.right + Y.endEqS * 0.45,
      qy = y - Y.endEqS * 0.3 - qs / 2;
    poly(
      ctx,
      [
        [qx, qy],
        [qx + qs, qy],
        [qx + qs, qy + qs],
        [qx, qy + qs],
      ],
      {
        stroke: QC,
        write: F >= 1760 ? sp(F, 1760, 1776) : 0,
        fill: prog(F, 1772, 1790),
        flash: pulse(F, 1800, 20),
        width: 3,
      },
    );
    Y.endLines.forEach((l, i) =>
      writeLine(
        ctx,
        l,
        Y.endTri[0],
        Y.endLineY + i * Y.prose * 1.45 + drift,
        Y.prose,
        MUTED,
        prog(F, 1744 + 16 * i, 1780 + 16 * i),
      ),
    );
  };

  const paint = (ctx: Ctx, env: Env, F: number) => {
    F = clamp(F, 0, N - 1);
    ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
    ctx.fillStyle = C.ground;
    ctx.fillRect(0, 0, W, H);
    if (F < 530) claimScene(ctx, F);
    if (F >= T.setup && F < T.rearr) setupScene(ctx, F);
    if (F >= T.rearr && F < 1470) squaresScene(ctx, F);
    if (F >= T.check && F < 1720) checkScene(ctx, F);
    if (F >= T.end) endScene(ctx, F);
  };

  const cuts = [T.tri, T.claim, T.setup, T.rearr, T.so, T.check, T.end, N],
    names = ["triangle", "claim", "setup", "rearrange", "so", "check", "end"];
  const shots: Shot[] = names.map((sid, i) => ({
    id: sid,
    start: cuts[i]!,
    end: cuts[i + 1]!,
    draw: (ctx, local, env) =>
      motionBlur(ctx, env, (c, dt) => paint(c, env, cuts[i]! + local + dt), { samples: 7, shutter: 0.5 }),
  }));
  // ticks: each equation term as it lands, each triangle as it lands in the square, every third unit cell
  const cellTicks: number[] = [];
  COUNT.forEach((_, q) => {
    const n = (q + 3) ** 2;
    for (let i = 2; i < n; i += 3) cellTicks.push(Math.round(cellAt(q, i, n)));
  });
  return {
    meta: { title: id, W, H, fps: FPS, bpm: BPM, durationFrames: N, raster: "cpu" },
    assets: { images: {}, fonts: P.assets },
    shots,
    audio: beatScore({
      frames: N,
      fps: FPS,
      bpm: BPM,
      mood: "soft",
      hits: [760, 1320, 1640], // the c² hole, the equation after the swap, 9 + 16 = 25
      whooshes: [840, 1320],
      ticks: [
        40, // the question lands
        920,
        960, // the a² and b² holes
        ...LIFT.map((t) => t + 36),
        416,
        440, // a² + b² = c² (claim)
        ...FLY.map((t) => t + 40), // the four triangles land
        1204,
        1212,
        1228,
        1240,
        1252, // c² = a² + b² (so)
        1530,
        1536,
        1554,
        1562,
        1586, // 3² + 4² = 5²
        ...cellTicks,
      ],
      sign: 1760,
      gain: 0.72,
    }),
  };
}

export const proofWithoutWords = make("landscape", "proofWithoutWords");
export const proofWithoutWordsVertical = make("vertical", "proofWithoutWordsVertical");
