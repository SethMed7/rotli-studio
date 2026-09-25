// STUDY 15 · PAPER COLLAGE (24 s, 30 fps, 120 bpm). Cut paper on kraft for a fictional scheduling product:
// a torn headline, a calendar with one slot torn out, two paper hands carrying the missing piece, a retro paper
// computer that sorts its scraps into "Thu 3:00", three portraits that each get a check, and the click when the
// piece goes home. Everything moves on twos (each pose held 2 frames), every piece has torn edges, a paper rim,
// and a shadow that grows while it is lifted and shrinks when it is pasted down; the sheet's grain sits over it all.
// One source, designed for vertical (captions above, the collage below) and landscape (calendar left, the rest right).
// Brief: series/studies/briefs/paper-collage.json · prompt: series/studies/prompts/paper-collage.prompt.md
//
// The whole film is one continuous function paint(F) of a frame F, quantised to twos; the shots only name the
// sections. Every outline is built once in local coordinates, so a torn edge never re-tears as the piece moves.
import PACK from "../../../brand/packs/studio/pack.json";
import { fractal, halftone, rng, type Ctx, type Env, type Layer, type P } from "../core";
import type { Film, Shot } from "../film";
import { ladder, w as wd, type Word } from "../kit/captions";
import { clamp, ease, lerp, prog } from "../kit/motion";
import { usePack } from "../kit/pack";
import { beatScore } from "../kit/score";
import { layout, type Size } from "../kit/sizes";
import { measure, text } from "../kit/type";

const P_ = usePack(PACK),
  C = P_.palette("kraft"),
  F_ = P_.face;
const FPS = 30,
  BPM = 120,
  N = 720; // a beat is 15 frames
const HOLD = 2; // stop motion on twos
// the timeline, in frames (every cut on a beat)
const T = { calendar: 75, computer: 225, portraits: 375, click: 525, sign: 645 };
const CLICK = 585; // the piece goes home (a beat)
const TAU = Math.PI * 2;

// ---------------------------------------------------------------- colour + geometry helpers
const rgba = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};
const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};
const box = (x0: number, y0: number, x1: number, y1: number): P[] => [
  [x0, y0],
  [x1, y0],
  [x1, y1],
  [x0, y1],
];
const rect = (w: number, h: number) => box(-w / 2, -h / 2, w / 2, h / 2);
const ellipse = (rx: number, ry: number, cx = 0, cy = 0, n = 40): P[] =>
  Array.from({ length: n }, (_, i) => [cx + Math.cos((i / n) * TAU) * rx, cy + Math.sin((i / n) * TAU) * ry] as P);
const capsule = (a: P, b: P, r: number, n = 9): P[] => {
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]),
    out: P[] = [];
  for (let i = 0; i <= n; i++) {
    const t = ang - Math.PI / 2 + (Math.PI * i) / n;
    out.push([b[0] + Math.cos(t) * r, b[1] + Math.sin(t) * r]);
  }
  for (let i = 0; i <= n; i++) {
    const t = ang + Math.PI / 2 + (Math.PI * i) / n;
    out.push([a[0] + Math.cos(t) * r, a[1] + Math.sin(t) * r]);
  }
  return out;
};
/** a jigsaw piece w × h: a knob out on top and right, a socket in on the bottom, the left side flat */
const puzzle = (w: number, h: number, k: number): P[] => {
  const c = box(-w / 2, -h / 2, w / 2, h / 2),
    knobs = [1, 1, -1, 0],
    out: P[] = [];
  for (let e = 0; e < 4; e++) {
    const a = c[e]!,
      b = c[(e + 1) % 4]!,
      L = Math.hypot(b[0] - a[0], b[1] - a[1]),
      ux = (b[0] - a[0]) / L,
      uy = (b[1] - a[1]) / L,
      nx = uy,
      ny = -ux; // outward for this winding
    out.push(a);
    const s = knobs[e]!;
    if (!s) continue;
    const mx = (a[0] + b[0]) / 2,
      my = (a[1] + b[1]) / 2,
      neck = k * 0.55,
      ccx = mx + nx * k * 0.8 * s,
      ccy = my + ny * k * 0.8 * s;
    const p1: P = [mx - ux * neck, my - uy * neck],
      p2: P = [mx + ux * neck, my + uy * neck];
    out.push(p1);
    const a0 = Math.atan2(p1[1] - ccy, p1[0] - ccx),
      a1 = Math.atan2(p2[1] - ccy, p2[0] - ccx),
      want = Math.atan2(ny * s, nx * s),
      d = (((a1 - a0) % TAU) + TAU) % TAU;
    // go the long way round, through the side the knob points to
    const sweep = Math.cos(a0 + d / 2 - want) > Math.cos(a0 + (d - TAU) / 2 - want) ? d : d - TAU;
    for (let i = 1; i < 18; i++) {
      const t = a0 + (sweep * i) / 18;
      out.push([ccx + Math.cos(t) * k, ccy + Math.sin(t) * k]);
    }
    out.push(p2);
  }
  return out;
};
/** a thick paper check mark, s across */
const checkShape = (s: number): P[] =>
  (
    [
      [-0.5, 0.02],
      [-0.31, -0.17],
      [-0.12, 0.03],
      [0.34, -0.47],
      [0.53, -0.29],
      [-0.12, 0.4],
    ] as P[]
  ).map(([x, y]) => [x * s, y * s]);
/** offset a polygon outward by d (mitred), for the paper rim */
const offset = (pts: P[], d: number): P[] => {
  let A = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]!,
      b = pts[(i + 1) % pts.length]!;
    A += a[0] * b[1] - b[0] * a[1];
  }
  const sg = A > 0 ? 1 : -1,
    n = pts.length;
  const nrm = (a: P, b: P): P => {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [((b[1] - a[1]) / L) * sg, (-(b[0] - a[0]) / L) * sg];
  };
  return pts.map((p, i) => {
    const n1 = nrm(pts[(i - 1 + n) % n]!, p),
      n2 = nrm(p, pts[(i + 1) % n]!),
      k = d / Math.max(0.35, 1 + n1[0] * n2[0] + n1[1] * n2[1]);
    return [p[0] + (n1[0] + n2[0]) * k, p[1] + (n1[1] + n2[1]) * k];
  });
};
const densify = (pts: P[], step: number): P[] => {
  const out: P[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]!,
      b = pts[(i + 1) % pts.length]!,
      n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
    for (let k = 0; k < n; k++) out.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
  }
  return out;
};
/** scissors wander slowly; a tear bites finely. Both baked into the outline, in local coordinates. */
const tear = (pts: P[], seed: number, wander: number, nib: number): P[] => {
  const r = rng(seed);
  return pts.map(([x, y]) => {
    const bite = r() < 0.05 ? 1.8 : 1;
    return [
      x + (fractal(seed, x, y, 0.03, 0.03, 2) - 0.5) * 2.4 * wander + (r() - 0.5) * 2 * nib * bite,
      y + (fractal(seed + 50, x, y, 0.03, 0.03, 2) - 0.5) * 2.4 * wander + (r() - 0.5) * 2 * nib * bite,
    ];
  });
};
type Sheet = { face: P[]; rim: P[] };
const SHEETS = new Map<string, Sheet>();
/** a cut piece of paper: its coloured face and, a little larger and more ragged, the white core a tear exposes */
const sheet = (key: string, base: () => P[], rimW = 3.5, wander = 2.2): Sheet => {
  let s = SHEETS.get(key);
  if (s) return s;
  const b = base(),
    seed = hash(key) % 100000;
  s = {
    face: tear(densify(b, 5), seed, wander, 0.7),
    rim: rimW > 0 ? tear(densify(offset(b, rimW), 4), seed + 1, wander * 1.15, 1.5) : [],
  };
  SHEETS.set(key, s);
  return s;
};
const trace = (ctx: Ctx, pts: P[]) => {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
};

// ---------------------------------------------------------------- the paper grain (one tile, cached per scale)
const grainTile = (env: Env): Layer => {
  const key = `paperCollage:grain:${env.scale}`;
  let L = env.cache.get(key) as Layer | undefined;
  if (L) return L;
  const n = Math.round(512 * env.scale);
  L = env.canvas(n, n);
  const img = L.ctx.createImageData(n, n),
    d = img.data,
    r = rng(15);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const lx = x / env.scale,
        ly = y / env.scale,
        mott = fractal(31, lx, ly, 0.012, 0.012, 3, 512),
        fib = fractal(37, lx, ly, 0.03, 0.35, 2, 512),
        v = 128 + (r() - 0.5) * 34 + (mott - 0.5) * 70 + (fib - 0.5) * 34,
        i = (y * n + x) * 4;
      d[i] = d[i + 1] = d[i + 2] = clamp(v, 0, 255);
      d[i + 3] = 255;
    }
  L.ctx.putImageData(img, 0, 0);
  // loose fibres: short curls, some darker, some lighter than the sheet
  const c = L.ctx;
  c.setTransform(env.scale, 0, 0, env.scale, 0, 0);
  c.lineCap = "round";
  for (let i = 0; i < 160; i++) {
    const x = r() * 512,
      y = r() * 512,
      a = r() * TAU,
      l = 6 + r() * 18,
      bend = (r() - 0.5) * 10;
    c.strokeStyle = r() < 0.5 ? "rgba(70,70,70,0.35)" : "rgba(210,210,210,0.4)";
    c.lineWidth = 0.6 + r() * 0.8;
    for (const ox of [-512, 0, 512])
      for (const oy of [-512, 0, 512]) {
        c.beginPath();
        c.moveTo(x + ox, y + oy);
        c.quadraticCurveTo(
          x + ox + Math.cos(a) * l * 0.5 - Math.sin(a) * bend,
          y + oy + Math.sin(a) * l * 0.5 + Math.cos(a) * bend,
          x + ox + Math.cos(a) * l,
          y + oy + Math.sin(a) * l,
        );
        c.stroke();
      }
  }
  c.setTransform(1, 0, 0, 1, 0, 0);
  env.cache.set(key, L);
  return L;
};

// ---------------------------------------------------------------- sound: the soft loop plus a paper rustle per paste
const RUSTLES = [
  10, 28, 44, 64, 86, 102, 124, 234, 242, 248, 252, 258, 280, 300, 322, 346, 386, 394, 402, 420, 450, 480, 536, 548,
  574, 654, 660, 668,
];
const withRustles =
  (base: (sr: number) => [Float32Array, Float32Array], at: number[]) =>
  (sr: number): [Float32Array, Float32Array] => {
    const [L, R] = base(sr),
      n = L.length;
    at.forEach((f, j) => {
      const r = rng(900 + j),
        i0 = Math.round((f / FPS) * sr),
        len = Math.round((0.1 + r() * 0.06) * sr),
        pan = 0.3 + r() * 0.4;
      let prev = 0,
        spike = 0;
      for (let k = 0; k < len && i0 + k < n; k++) {
        const t = k / sr,
          x = r() * 2 - 1,
          hp = x - prev; // a first difference: the hiss loses its low end, like paper does
        prev = x;
        if (r() < 0.004) spike = 0.6 + r() * 0.8; // the crackle of a fold
        spike *= 0.993;
        const v = hp * (0.08 * Math.exp(-t * 16) + 0.1 * spike * Math.exp(-t * 9)) * Math.min(1, t / 0.004);
        L[i0 + k] = clamp(L[i0 + k]! + v * (1 - pan) * 2, -0.99, 0.99);
        R[i0 + k] = clamp(R[i0 + k]! + v * pan * 2, -0.99, 0.99);
      }
    });
    return [L, R];
  };

// ---------------------------------------------------------------- the film
export function make(size: Size, id: string): Film {
  const L = layout(size),
    { W, H, u, cx, cy } = L,
    tall = L.tall;
  let S = 1; // device pixels per logical pixel (shadows are in device space); set per frame
  let pose = 0; // the current pose (frame / 2): the boil changes with it

  // ---- paper: lay a sheet down with its rim and a shadow that says how far it is lifted
  const shadow = (ctx: Ctx, lift: number) => {
    ctx.shadowColor = rgba(C.ink, 0.24 + 0.12 * lift);
    ctx.shadowBlur = (3 + 26 * lift) * u * S;
    ctx.shadowOffsetX = (2 + 9 * lift) * u * S;
    ctx.shadowOffsetY = (3 + 17 * lift) * u * S;
  };
  const lay = (ctx: Ctx, s: Sheet, color: string, lift = 0.12, rim: string | null = C.surface) => {
    ctx.save();
    shadow(ctx, lift);
    trace(ctx, rim && s.rim.length ? s.rim : s.face);
    ctx.fillStyle = rim && s.rim.length ? rim : color;
    ctx.fill();
    ctx.restore();
    if (rim && s.rim.length) {
      trace(ctx, s.face);
      ctx.fillStyle = color;
      ctx.fill();
    }
  };
  /** place a piece: position + rotation, plus the stop-motion boil (every pose is re-placed by hand) */
  const at = (ctx: Ctx, key: string, x: number, y: number, rot: number, sc: number, fn: () => void, boil = 1) => {
    const r = rng(hash(key) + pose * 7919);
    ctx.save();
    ctx.translate(x + (r() - 0.5) * 2.4 * boil * u, y + (r() - 0.5) * 2.4 * boil * u);
    ctx.rotate(rot + (r() - 0.5) * 0.008 * boil);
    if (sc !== 1) ctx.scale(sc, sc);
    fn();
    ctx.restore();
  };
  /** a piece slid on over [a, a + d] from an offset, and off over [b, b + d2] to another; lift while it moves */
  const slide = (F: number, a: number, d: number, from: P, b = 1e9, d2 = 10, to: P = [0, 0]) => {
    const pin = ease.outCubic(prog(F, a, a + d)),
      pout = ease.inCubic(prog(F, b, b + d2));
    return {
      x: from[0] * (1 - pin) + to[0] * pout,
      y: from[1] * (1 - pin) + to[1] * pout,
      lift: 0.12 + 0.88 * Math.max(1 - pin, pout),
      on: F >= a && pout < 1,
    };
  };
  const label = (
    ctx: Ctx,
    s: string,
    x: number,
    y: number,
    size: number,
    color: string,
    o: { family?: string; weight?: number; align?: CanvasTextAlign; track?: number } = {},
  ) =>
    text(ctx, s, x, y, {
      size: size * u,
      family: o.family ?? F_.sans,
      weight: o.weight ?? 600,
      color,
      align: o.align ?? "center",
      track: o.track ?? 0,
    });

  // ---- per-size design
  const cal = tall
    ? { x: 100 * u, y: 725 * u, w: 880 * u, h: 620 * u }
    : { x: 100 * u, y: 150 * u, w: 800 * u, h: 570 * u };
  const grid = {
    x0: 96 * u,
    x1: cal.w - 22 * u,
    y0: 150 * u,
    y1: cal.h - 22 * u,
  };
  const cw = (grid.x1 - grid.x0) / 5,
    ch = (grid.y1 - grid.y0) / 4;
  const HOLE = { col: 3, row: 3 };
  const pw = cw - 22 * u,
    ph = ch - 22 * u,
    pk = Math.min(pw, ph) * 0.17;
  // the hole's centre, on the page (the calendar at rest)
  const holeX = cal.x + grid.x0 + (HOLE.col + 0.5) * cw,
    holeY = cal.y + grid.y0 + (HOLE.row + 0.5) * ch;
  // where the right hand waits with the piece: just under the calendar, beside the hole
  const hover: P = tall ? [holeX + 30 * u, cal.y + cal.h + 120 * u] : [holeX + 40 * u, cal.y + cal.h + 110 * u];
  const capL = tall ? { x: 100 * u, y: 250 * u, size: 82 } : { x: 1010 * u, y: 250 * u, size: 70 };

  // ---- background: the kraft page with a few big torn scraps and a halftone patch, all pasted flat
  const BG = tall
    ? [
        { k: "bg0", x: 1000, y: 1700, w: 520, h: 300, rot: -0.08, c: C.line },
        { k: "bg1", x: 1010, y: 180, w: 420, h: 380, rot: 0.12, c: C.line },
        { k: "bg2", x: 60, y: 1560, w: 300, h: 420, rot: -0.2, c: C.surface },
      ]
    : [
        { k: "bg0", x: 1830, y: 980, w: 520, h: 300, rot: -0.1, c: C.line },
        { k: "bg1", x: 60, y: 900, w: 420, h: 380, rot: 0.12, c: C.line },
        { k: "bg2", x: 1010, y: 1050, w: 300, h: 260, rot: -0.2, c: C.surface },
      ];
  const background = (ctx: Ctx) => {
    for (const b of BG) {
      const s = sheet(`${size}:${b.k}`, () => rect(b.w * u, b.h * u), 3, 5);
      at(ctx, b.k, b.x * u, b.y * u, b.rot, 1, () => lay(ctx, s, b.c, 0.04), 0.3);
    }
    // a halftone patch, printed straight onto the kraft
    const hx = tall ? 250 * u : 1500 * u,
      hy = tall ? 1700 * u : 820 * u,
      R = 150 * u;
    ctx.save();
    ctx.fillStyle = rgba(C.muted, 0.55);
    ctx.beginPath();
    for (const [x, y, r] of halftone({ x0: hx - R, y0: hy - R, x1: hx + R, y1: hy + R }, 16 * u, 30, (x, y) => {
      const d = Math.hypot(x - hx, y - hy) / R;
      return clamp(1 - d) * 0.9;
    })) {
      ctx.moveTo(x + r, y);
      ctx.arc(x, y, r, 0, TAU);
    }
    ctx.fill();
    ctx.restore();
  };

  // ---- 00 hook: the headline, letter scraps sliding in, word by word
  type Glyph = {
    ch: string;
    x: number;
    y: number;
    w: number;
    size: number;
    family: string;
    weight: number;
    paper: string;
    ink: string;
    rot: number;
    dy: number;
    dir: number;
  };
  const PAPERS: [string, string][] = [
    [C.surface, C.ink],
    [C.ink, C.surface],
    [C.surface, C.ink],
    [C.accent2, C.surface],
    [C.line, C.ink],
  ];
  const scraps = (
    ctx: Ctx,
    word: string,
    x: number,
    base: number,
    size: number,
    seed: number,
    red: boolean,
    align: "center" | "left" = "center",
  ) => {
    const r = rng(seed),
      out: Glyph[] = [];
    for (const ch of word) {
      const pick = r(),
        family = red ? (pick < 0.5 ? F_.italic : F_.serif) : pick < 0.4 ? F_.serif : pick < 0.75 ? F_.sans : F_.italic,
        weight = family === F_.sans ? 800 : 400,
        sz = size * (family === F_.sans ? 0.74 : 1),
        adv = measure(ctx, ch, { size: sz, family, weight }),
        [paper, ink] = red ? [C.accent, C.surface] : PAPERS[Math.floor(r() * PAPERS.length)]!;
      out.push({
        ch,
        x: 0,
        y: base,
        w: adv + size * 0.2,
        size: sz,
        family,
        weight,
        paper,
        ink,
        rot: (r() - 0.5) * 0.16,
        dy: (r() - 0.5) * size * 0.08,
        dir: r() * TAU,
      });
    }
    const gap = -size * 0.02,
      total = out.reduce((a, g) => a + g.w, 0) + gap * (out.length - 1);
    let cx0 = align === "center" ? x - total / 2 : x;
    for (const g of out) {
      g.x = cx0 + g.w / 2;
      cx0 += g.w + gap;
    }
    return out;
  };
  const drawScraps = (
    ctx: Ctx,
    F: number,
    gs: Glyph[],
    key: string,
    t0: number,
    stagger: number,
    dist: number,
    leave?: { at: number; dy: number },
  ) => {
    gs.forEach((g, i) => {
      const t = t0 + i * stagger,
        p = ease.outCubic(prog(F, t, t + 8));
      if (F < t) return;
      const out = leave ? ease.inCubic(prog(F, leave.at + i, leave.at + i + 8)) : 0;
      if (out >= 1) return;
      const lift = 0.12 + 0.88 * Math.max(1 - p, out),
        x = g.x + Math.cos(g.dir) * dist * (1 - p),
        y = g.y + g.dy + Math.sin(g.dir) * dist * (1 - p) + (leave ? leave.dy * out : 0),
        h = g.size * (g.family === F_.sans ? 1.28 : 0.98);
      const s = sheet(`${key}:${i}:${Math.round(g.w)}x${Math.round(h)}`, () => {
        const r = rng(hash(key) + i);
        return [
          [-g.w / 2 + (r() - 0.5) * 8 * u, -h / 2 + (r() - 0.5) * 8 * u],
          [g.w / 2 + (r() - 0.5) * 8 * u, -h / 2 + (r() - 0.5) * 8 * u],
          [g.w / 2 + (r() - 0.5) * 8 * u, h / 2 + (r() - 0.5) * 8 * u],
          [-g.w / 2 + (r() - 0.5) * 8 * u, h / 2 + (r() - 0.5) * 8 * u],
        ];
      });
      at(ctx, `${key}:${i}`, x, y - g.size * 0.3, g.rot * (1 + (1 - p) * 2), 1 + 0.06 * lift, () => {
        lay(ctx, s, g.paper, lift);
        text(ctx, g.ch, 0, g.size * (g.family === F_.sans ? 0.36 : 0.3), {
          size: g.size,
          family: g.family,
          weight: g.weight,
          color: g.ink,
          align: "center",
        });
      });
    });
  };
  const HEAD: [string, number, number, boolean][] = tall
    ? [
        ["The", 190, 760, false],
        ["missing", 205, 1020, false],
        ["piece", 250, 1320, true],
      ]
    : [
        ["The missing", 150, 470, false],
        ["piece", 200, 720, true],
      ];
  const hookSection = (ctx: Ctx, F: number) => {
    const lands = tall ? [10, 28, 44] : [14, 44];
    HEAD.forEach(([word, sz, y, red], k) => {
      const gs = scraps(ctx, word, cx, y * u, sz * u, 40 + k, red);
      // the last letter of each word lands on its beat
      const t0 = lands[k]! - 8 - (gs.length - 1) * (tall ? 1 : 1);
      drawScraps(ctx, F, gs, `head${size}${k}`, t0, 1, 320 * u, { at: 64 + k * 2, dy: -1200 * u });
    });
  };

  // ---- the calendar: a cream sheet, a red band, five days by four slots, one slot torn out in a jigsaw shape
  const MEET: [number, number, string, string, string][] = [
    [0, 0, C.accent2, "Standup", C.surface],
    [2, 0, C.line, "1:1", C.ink],
    [4, 0, C.line, "Plan", C.ink],
    [1, 1, C.ink, "Review", C.surface],
    [3, 1, C.accent2, "Focus", C.surface],
    [0, 2, C.line, "Lunch", C.ink],
    [4, 2, C.ink, "Demo", C.surface],
    [1, 3, C.accent2, "Call", C.surface],
    [2, 3, C.line, "Sync", C.ink],
  ];
  const DAYS = ["MON", "TUE", "WED", "THU", "FRI"],
    TIMES = ["9:00", "11:00", "1:00", "3:00"];
  const pieceSheet = () => sheet(`${size}:piece`, () => puzzle(pw, ph, pk), 3, 1.2);
  const drawPiece = (ctx: Ctx, lift: number) => {
    lay(ctx, pieceSheet(), C.accent, lift);
    label(ctx, "Thu 3:00", 0, 9 * u, tall ? 26 : 23, C.surface, { weight: 800, track: -0.01 });
  };
  const calendar = (ctx: Ctx, F: number, filled: boolean, lift: number) => {
    const paper = sheet(`${size}:cal`, () => rect(cal.w, cal.h), 4, 2.6);
    lay(ctx, paper, C.surface, lift);
    ctx.save();
    ctx.translate(-cal.w / 2, -cal.h / 2);
    // the header band
    const band = sheet(`${size}:band`, () => rect(cal.w - 28 * u, 72 * u), 3, 2);
    at(
      ctx,
      "band",
      cal.w / 2,
      14 * u + 36 * u,
      0.004,
      1,
      () => {
        lay(ctx, band, C.accent, 0.08);
        label(ctx, "THIS WEEK", 0, 11 * u, 30, C.surface, { weight: 800, track: 0.12 });
      },
      0.4,
    );
    DAYS.forEach((d, i) =>
      label(ctx, d, grid.x0 + (i + 0.5) * cw, 126 * u, 23, i === HOLE.col ? C.accent : C.muted, { track: 0.1 }),
    );
    // slot rules and times
    ctx.fillStyle = C.line;
    for (let r = 0; r < 4; r++) {
      ctx.fillRect(grid.x0 - 70 * u, grid.y0 + r * ch, grid.x1 - grid.x0 + 70 * u, 2 * u);
      label(ctx, TIMES[r]!, 22 * u, grid.y0 + r * ch + 36 * u, 22, C.muted, {
        family: F_.mono,
        weight: 500,
        align: "left",
      });
    }
    // meetings: strips of paper pasted into their slots
    MEET.forEach(([c0, r0, color, name, ink], i) => {
      const s = sheet(`${size}:meet${i}`, () => rect(cw - 14 * u, ch - 16 * u), 3, 1.6);
      at(
        ctx,
        `meet${i}`,
        grid.x0 + (c0 + 0.5) * cw,
        grid.y0 + (r0 + 0.5) * ch + 2 * u,
        ((i % 3) - 1) * 0.02,
        1,
        () => {
          lay(ctx, s, color, 0.06, C.surface);
          label(ctx, name, 0, 8 * u, 23, ink);
        },
        0.5,
      );
    });
    // the hole (or, once it clicks, the piece in it)
    ctx.save();
    ctx.translate(holeX - cal.x, holeY - cal.y);
    if (filled) drawPiece(ctx, 0.05);
    else {
      const hole = sheet(`${size}:hole`, () => puzzle(pw + 8 * u, ph + 8 * u, pk + 2 * u), 0, 1.4);
      trace(ctx, hole.face);
      ctx.fillStyle = C.ground;
      ctx.fill();
      ctx.save();
      trace(ctx, hole.face);
      ctx.clip();
      ctx.shadowColor = rgba(C.ink, 0.5);
      ctx.shadowBlur = 12 * u * S;
      ctx.shadowOffsetX = 5 * u * S;
      ctx.shadowOffsetY = 7 * u * S;
      ctx.beginPath();
      ctx.rect(-2000, -2000, 4000, 4000);
      hole.face.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      ctx.fillStyle = C.surface;
      ctx.fill("evenodd");
      ctx.restore();
    }
    ctx.restore();
    // masking tape on two corners
    const tape = sheet(`${size}:tape`, () => rect(150 * u, 44 * u), 0, 1.4);
    for (const [tx, ty, tr] of [
      [cal.w - 20 * u, 4 * u, 0.6],
      [30 * u, cal.h - 6 * u, 0.5],
    ] as const)
      at(
        ctx,
        `tape${tx}`,
        tx,
        ty,
        tr,
        1,
        () => {
          ctx.globalAlpha = 0.72;
          lay(ctx, tape, C.surface, 0.02, null);
          ctx.globalAlpha = 1;
        },
        0.4,
      );
    ctx.restore();
    void F;
  };

  // ---- the hands: cut from cream paper with teal sleeves. "pinch" carries the piece, "flat" holds the calendar down.
  const HS = tall ? 1.05 : 0.95;
  const handSheets = (pose: "pinch" | "flat") => {
    const k = `${size}:hand:${pose}`,
      s = HS * u;
    const sc = (pts: P[]) => pts.map(([x, y]) => [x * s, y * s] as P);
    const sleeve = sheet(`${k}:sleeve`, () => sc(box(-1300, -80, -16, 80)), 3, 3),
      cuff = sheet(`${k}:cuff`, () => sc(box(-56, -84, -6, 84)), 3, 1.6),
      palm = sheet(`${k}:palm`, () => sc(ellipse(88, 78, 62, 4)), 3, 2);
    if (pose === "flat") {
      const fingers = [-54, -18, 18, 52].map((y, i) =>
        sheet(
          `${k}:f${i}`,
          () => sc(capsule([110, y * 0.9], [232 - Math.abs(y) * 0.5 - (i === 3 ? 26 : 0), y * 1.12], 19)),
          3,
          1.2,
        ),
      );
      const thumb = sheet(`${k}:thumb`, () => sc(capsule([60, -58], [148, -126], 21)), 3, 1.2);
      return { under: [sleeve, cuff, ...fingers, palm], over: [thumb], nails: sc([[136, -113]]) };
    }
    const index = sheet(`${k}:index`, () => sc(capsule([110, -24], [228, -14], 21)), 3, 1.2),
      knuckles = [
        [148, 26],
        [140, 56],
        [118, 80],
      ].map(([x, y], i) => sheet(`${k}:kn${i}`, () => sc(ellipse(27, 22, x, y, 22)), 3, 1)),
      thumb = sheet(`${k}:thumb`, () => sc(capsule([70, -66], [206, -52], 23)), 3, 1.2);
    return { under: [sleeve, cuff, index, palm, ...knuckles], over: [thumb], nails: sc([[194, -54]]) };
  };
  const handColors = (n: number) => (i: number) =>
    i === 0 ? C.accent2 : i === 1 ? C.ink : i === n ? C.surface : C.surface;
  /** draw one hand; `layer` splits it so a held piece can sit between the fingers and the thumb */
  const hand = (
    ctx: Ctx,
    key: string,
    x: number,
    y: number,
    ang: number,
    pose: "pinch" | "flat",
    layer: "under" | "over",
    lift: number,
  ) => {
    const hs = handSheets(pose),
      list = layer === "under" ? hs.under : hs.over,
      col = handColors(99);
    at(ctx, key, x, y, ang, 1, () => {
      list.forEach((s, i) => lay(ctx, s, layer === "under" ? col(i) : C.surface, lift * (layer === "over" ? 1 : 0.9)));
      if (layer === "over")
        for (const [nx, ny] of hs.nails) {
          ctx.beginPath();
          ctx.ellipse(nx, ny, 13 * HS * u, 10 * HS * u, 0, 0, TAU);
          ctx.fillStyle = C.line;
          ctx.fill();
        }
    });
  };
  // the fingertip grip, in the hand's own frame (the piece hangs here)
  const GRIP: P = [230 * HS * u + ph * 0.35, -32 * HS * u];
  const tipOf = (x: number, y: number, ang: number): P => [
    x + Math.cos(ang) * GRIP[0] - Math.sin(ang) * GRIP[1],
    y + Math.sin(ang) * GRIP[0] + Math.cos(ang) * GRIP[1],
  ];

  // when the calendar and hands are on the page (vertical leaves for the computer and portraits)
  const calOn = (F: number) =>
    tall
      ? F < T.portraits
        ? slide(F, T.calendar, 12, [-1100 * u, 60 * u], T.computer - 12, 10, [-1200 * u, -80 * u])
        : slide(F, T.click, 12, [-1100 * u, 60 * u])
      : slide(F, T.calendar, 12, [-1100 * u, 60 * u]);
  const leftOn = (F: number) =>
    tall
      ? F < T.portraits
        ? slide(F, T.calendar + 18, 10, [-700 * u, 0], T.computer - 14, 10, [-1300 * u, -80 * u])
        : slide(F, T.click + 12, 10, [-700 * u, 0], T.sign - 26, 12, [-900 * u, 0])
      : slide(F, T.calendar + 18, 10, [-700 * u, 0], T.sign - 26, 12, [-900 * u, 0]);
  const rightOn = (F: number) =>
    tall
      ? F < T.portraits
        ? slide(F, T.calendar + 36, 14, [120 * u, 900 * u], T.computer - 16, 10, [0, 1200 * u])
        : slide(F, T.click + 14, 12, [120 * u, 900 * u])
      : slide(F, T.calendar + 36, 14, [120 * u, 900 * u]);

  const calendarScene = (ctx: Ctx, F: number) => {
    const c = calOn(F);
    if (!c.on) return;
    const filled = F >= CLICK;
    // the click: one hard pose of the whole sheet jumping, then settling
    const bump = F >= CLICK && F < CLICK + 6 ? (F < CLICK + 2 ? 1 : F < CLICK + 4 ? -0.5 : 0.2) : 0;
    // the left hand holds the sheet by its corner: fingers behind the paper, the thumb on the red band
    const lh = leftOn(F),
      hx = cal.x - 70 * u + lh.x + c.x,
      hy = cal.y + 45 * u + lh.y + c.y + bump * 6 * u;
    if (lh.on) hand(ctx, "lhand", hx, hy, 0.7, "flat", "under", lh.lift);
    at(
      ctx,
      "cal",
      cal.x + cal.w / 2 + c.x,
      cal.y + cal.h / 2 + c.y + bump * 6 * u,
      -0.012,
      1 + 0.03 * c.lift + bump * 0.006,
      () => calendar(ctx, F, filled, c.lift),
      0.5,
    );
    if (lh.on) hand(ctx, "lhand", hx, hy, 0.7, "flat", "over", lh.lift);
  };
  const rightHand = (ctx: Ctx, F: number) => {
    const rh = rightOn(F);
    if (!rh.on && F < CLICK) return;
    // the press: from hover, lift across to the hole, lower in, click; then the empty hand leaves
    const ang = -Math.PI / 2 + 0.16;
    const idle = Math.sin((Math.floor(F / 2) * 2) / 9) * 5 * u;
    const go = ease.inOutCubic(prog(F, CLICK - 36, CLICK - 12)),
      down = ease.inCubic(prog(F, CLICK - 12, CLICK)),
      away = ease.inCubic(prog(F, CLICK + 10, CLICK + 34));
    // the piece's centre on the page
    const px = lerp(hover[0], holeX, go) + rh.x,
      py = lerp(hover[1] + idle * (1 - go), holeY - 34 * u * (1 - down), go) + rh.y,
      held = F < CLICK;
    // put the hand where its grip meets the piece
    const [gx, gy] = tipOf(0, 0, ang),
      hx = px - gx,
      hy = py - gy + away * 900 * u,
      lift = held ? Math.max(rh.lift, 0.5 * go * (1 - down) + 0.15) : 0.15 + 0.5 * away;
    if (!held && away >= 1) return;
    hand(ctx, "rhand", hx, hy, ang, "pinch", "under", lift);
    if (held)
      at(
        ctx,
        "piece",
        px,
        py,
        0.05 * (1 - go),
        1 + 0.07 * (1 - down) * go + 0.03 * rh.lift,
        () => drawPiece(ctx, Math.max(0.2, lift)),
        0.8,
      );
    hand(ctx, "rhand", hx, hy, ang, "pinch", "over", lift);
  };

  // ---- 02 computer: a big circle, a retro paper computer; on its screen, scraps rearrange into "Thu 3:00"
  const comp = tall
    ? { x: cx - 20 * u, y: 1070 * u, w: 560 * u, h: 470 * u }
    : { x: 1330 * u, y: 610 * u, w: 470 * u, h: 400 * u };
  const circ = tall ? { x: cx + 170 * u, y: 935 * u, r: 310 * u } : { x: 1650 * u, y: 625 * u, r: 230 * u };
  const SCREEN = { w: comp.w - 96 * u, h: comp.h - 170 * u };
  const TARGET = "Thu 3:00";
  const computerScene = (ctx: Ctx, F: number) => {
    const out = tall ? T.portraits - 12 : T.portraits - 12;
    // the big circle: red, torn, a halftone shade across it that turns slowly
    const cs = slide(F, T.computer + 2, 8, [700 * u, -200 * u], out, 10, [900 * u, 0]);
    if (cs.on)
      at(
        ctx,
        "circle",
        circ.x + cs.x,
        circ.y + cs.y,
        0,
        1 + 0.04 * cs.lift,
        () => {
          const s = sheet(`${size}:circle`, () => ellipse(circ.r, circ.r, 0, 0, 90), 4, 3);
          lay(ctx, s, C.accent, cs.lift);
          ctx.save();
          trace(ctx, s.face);
          ctx.clip();
          ctx.fillStyle = rgba(C.ink, 0.5);
          ctx.beginPath();
          const turn = 20 + Math.floor(F / 2) * 0.35;
          for (const [x, y, r] of halftone(
            { x0: -circ.r, y0: -circ.r, x1: circ.r, y1: circ.r },
            15 * u,
            turn,
            (x, y) => {
              const d = (x * 0.6 + y * 0.8) / circ.r;
              return clamp((d - 0.05) * 1.1);
            },
          )) {
            ctx.moveTo(x + r, y);
            ctx.arc(x, y, r, 0, TAU);
          }
          ctx.fill();
          ctx.restore();
        },
        0.5,
      );
    const cp = slide(F, T.computer + 8, 10, [-900 * u, 120 * u], out + 2, 10, [-1100 * u, 0]);
    if (!cp.on) return;
    at(
      ctx,
      "computer",
      comp.x + cp.x,
      comp.y + cp.y,
      -0.02,
      1 + 0.04 * cp.lift,
      () => {
        const { w, h } = comp;
        // the box has depth: a darker kraft back piece, offset
        const back = sheet(`${size}:cback`, () => rect(w, h), 3, 2.4);
        at(ctx, "cback", 20 * u, 18 * u, 0.01, 1, () => lay(ctx, back, C.muted, cp.lift * 0.6), 0.3);
        const body = sheet(`${size}:cbody`, () => rect(w, h), 3.5, 2.4);
        lay(ctx, body, C.surface, cp.lift);
        // foot
        const foot = sheet(`${size}:cfoot`, () => box(-w * 0.28, h / 2 - 4 * u, w * 0.28, h / 2 + 34 * u), 3, 1.6);
        lay(ctx, foot, C.line, 0.05);
        // bezel + screen
        const sy = -h / 2 + 40 * u + SCREEN.h / 2;
        const bezel = sheet(`${size}:bezel`, () => rect(SCREEN.w + 24 * u, SCREEN.h + 24 * u), 2, 1.6);
        at(ctx, "bezel", 0, sy, 0.006, 1, () => lay(ctx, bezel, C.line, 0.04, null), 0.3);
        const screen = sheet(`${size}:screen`, () => rect(SCREEN.w, SCREEN.h), 0, 1.2);
        ctx.save();
        ctx.translate(0, sy);
        trace(ctx, screen.face);
        ctx.fillStyle = C.ink;
        ctx.fill();
        // scanline halftone: a faint teal screen
        ctx.save();
        trace(ctx, screen.face);
        ctx.clip();
        ctx.fillStyle = rgba(C.accent2, 0.35);
        ctx.beginPath();
        for (const [x, y, r] of halftone(
          { x0: -SCREEN.w / 2, y0: -SCREEN.h / 2, x1: SCREEN.w / 2, y1: SCREEN.h / 2 },
          12 * u,
          0,
          (x, y) => clamp(0.5 - Math.hypot(x / SCREEN.w, y / SCREEN.h) * 0.8),
        )) {
          ctx.moveTo(x + r, y);
          ctx.arc(x, y, r, 0, TAU);
        }
        ctx.fill();
        ctx.restore();
        screenScraps(ctx, F);
        ctx.restore();
        // front panel: a floppy slot, a red button, vents
        const slot = sheet(`${size}:slot`, () => rect(150 * u, 16 * u), 0, 0.8);
        at(ctx, "slot", w / 2 - 120 * u, h / 2 - 58 * u, 0, 1, () => lay(ctx, slot, C.ink, 0.02, null), 0.2);
        const btn = sheet(`${size}:btn`, () => ellipse(15 * u, 15 * u, 0, 0, 20), 2, 0.8);
        at(ctx, "btn", -w / 2 + 64 * u, h / 2 - 58 * u, 0, 1, () => lay(ctx, btn, C.accent, 0.06), 0.2);
        ctx.fillStyle = C.line;
        for (let i = 0; i < 4; i++) ctx.fillRect(-w / 2 + 110 * u + i * 26 * u, h / 2 - 72 * u, 12 * u, 30 * u);
      },
      0.5,
    );
    // keyboard: its own slab, pasted after the box
    const kb = slide(F, T.computer + 16, 8, [0, 700 * u], out + 4, 10, [0, 900 * u]);
    if (kb.on) {
      const kw = comp.w * 1.08,
        kh = 92 * u;
      at(
        ctx,
        "keys",
        comp.x + kb.x + 10 * u,
        comp.y + comp.h / 2 + 90 * u + kb.y,
        0.015,
        1 + 0.04 * kb.lift,
        () => {
          const s = sheet(`${size}:kb`, () => rect(kw, kh), 3, 2);
          lay(ctx, s, C.surface, kb.lift);
          ctx.fillStyle = C.line;
          for (let r = 0; r < 3; r++)
            for (let c = 0; c < 13; c++) {
              const x0 = -kw / 2 + 22 * u + c * ((kw - 44 * u) / 13) + (r % 2) * 10 * u,
                y0 = -kh / 2 + 14 * u + r * 22 * u;
              if (x0 < kw / 2 - 40 * u) ctx.fillRect(x0, y0, (kw - 44 * u) / 13 - 6 * u, 16 * u);
            }
        },
        0.5,
      );
    }
  };
  const screenScraps = (ctx: Ctx, F: number) => {
    const o = { size: 76 * u, family: F_.sans, weight: 800 },
      chars = [...TARGET],
      total = measure(ctx, TARGET, o),
      r = rng(81);
    let x = -total / 2;
    chars.forEach((ch, i) => {
      const adv = measure(ctx, TARGET.slice(0, i + 1), o) - measure(ctx, TARGET.slice(0, i), o),
        tx = x + adv / 2;
      x += adv;
      const sx = (r() - 0.5) * (SCREEN.w - 90 * u),
        sy = (r() - 0.5) * (SCREEN.h - 90 * u),
        srot = (r() - 0.5) * 0.9,
        order = [3, 0, 5, 1, 6, 2, 7, 4][i]!;
      if (ch === " ") return;
      const pasted = T.computer + 22 + order * 2, // scattered scraps land, one per pose
        move = ease.inOutCubic(prog(F, T.computer + 50 + order * 6, T.computer + 64 + order * 6));
      if (F < pasted) return;
      const land = prog(F, pasted, pasted + 4),
        lift = 0.1 + 0.6 * (1 - land) + 0.5 * Math.sin(move * Math.PI),
        paper = i === 4 || i === 5 ? C.accent : i < 3 ? C.surface : C.surface;
      const s = sheet(`${size}:scr${i}`, () => rect(adv + 10 * u, 90 * u), 2, 1.4);
      at(
        ctx,
        `scr${i}`,
        lerp(sx, tx, move),
        lerp(sy, 6 * u, move),
        lerp(srot, (r() - 0.5) * 0.08, move),
        1 + 0.08 * (1 - land),
        () => {
          lay(ctx, s, paper, lift, null);
          text(ctx, ch, 0, 28 * u, { ...o, color: paper === C.accent ? C.surface : C.ink, align: "center" });
        },
        0.8,
      );
    });
    // once it reads, a red strip is pasted under it
    const ul = prog(F, T.computer + 118, T.computer + 122);
    if (ul > 0) {
      const s = sheet(`${size}:ul`, () => rect(total * 0.9, 14 * u), 0, 1.4);
      at(ctx, "ul", 0, 66 * u, -0.02, 1 + 0.2 * (1 - ul), () => lay(ctx, s, C.accent, 0.1 + 0.6 * (1 - ul), null), 0.4);
    }
  };

  // ---- 03 portraits: three paper people, each gets a check pasted on
  const PEOPLE = [
    { name: "Ana", bg: C.accent2, skin: C.line, hair: C.ink, shirt: C.accent, hairStyle: 0 },
    { name: "Ben", bg: C.line, skin: C.muted, hair: C.ink, shirt: C.accent2, hairStyle: 1 },
    { name: "Kai", bg: C.accent, skin: C.line, hair: C.muted, shirt: C.ink, hairStyle: 2 },
  ];
  const card = tall ? { w: 280 * u, h: 370 * u } : { w: 250 * u, h: 330 * u };
  const cardPos = (i: number): P =>
    tall
      ? [cx + (i - 1) * 306 * u, (1050 + (i === 1 ? 90 : 0)) * u]
      : [(1145 + i * 275) * u, (640 + (i === 1 ? 50 : 0)) * u];
  const portraitScene = (ctx: Ctx, F: number) => {
    PEOPLE.forEach((p, i) => {
      const [x, y] = cardPos(i),
        s = slide(F, T.portraits + 4 + i * 8, 8, [0, 1100 * u], T.click - 12 + i * 2, 10, [0, -1500 * u]);
      if (!s.on) return;
      const { w, h } = card,
        sc = w / (280 * u);
      at(
        ctx,
        `card${i}`,
        x + s.x,
        y + s.y,
        (i - 1) * 0.05,
        1 + 0.04 * s.lift,
        () => {
          lay(
            ctx,
            sheet(`${size}:card${i}`, () => rect(w, h), 3.5, 2.4),
            C.surface,
            s.lift,
          );
          ctx.save();
          ctx.scale(sc, sc);
          const ph0 = -150 * u,
            ph1 = 96 * u;
          // the photo: a coloured ground with a halftone, a head, hair, shoulders
          const bg = sheet(`${size}:pbg${i}`, () => box(-118 * u, ph0, 118 * u, ph1), 0, 1.4);
          trace(ctx, bg.face);
          ctx.fillStyle = p.bg;
          ctx.fill();
          ctx.save();
          trace(ctx, bg.face);
          ctx.clip();
          ctx.fillStyle = rgba(C.ink, 0.22);
          ctx.beginPath();
          for (const [hx, hy, r] of halftone({ x0: -118 * u, y0: ph0, x1: 118 * u, y1: ph1 }, 12 * u, 45, (hx, hy) =>
            clamp((hy - ph0) / (ph1 - ph0) - 0.15),
          )) {
            ctx.moveTo(hx + r, hy);
            ctx.arc(hx, hy, r, 0, TAU);
          }
          ctx.fill();
          // shoulders
          const sh = sheet(`${size}:sh${i}`, () => ellipse(100 * u, 70 * u, 0, 105 * u, 40), 2, 1.6);
          lay(ctx, sh, p.shirt, 0.08);
          ctx.restore();
          const neck = sheet(`${size}:neck${i}`, () => box(-20 * u, -10 * u, 20 * u, 44 * u), 0, 1);
          lay(ctx, neck, p.skin, 0.02, null);
          // hair behind the head (a bob, a bun), the head, then a dome of hair over the brow
          const dome = (rx: number, ry: number, y0: number) => () =>
            Array.from({ length: 25 }, (_, j) => {
              const t = Math.PI + (Math.PI * j) / 24;
              return [Math.cos(t) * rx, y0 + Math.sin(t) * ry] as P;
            });
          if (p.hairStyle === 0)
            lay(
              ctx,
              sheet(`${size}:hb${i}`, () => ellipse(70 * u, 70 * u, 0, -44 * u, 36), 2, 1.6),
              p.hair,
              0.06,
            );
          if (p.hairStyle === 2)
            lay(
              ctx,
              sheet(`${size}:hb${i}`, () => ellipse(30 * u, 28 * u, 0, -118 * u, 24), 2, 1.2),
              p.hair,
              0.06,
            );
          const head = sheet(`${size}:head${i}`, () => ellipse(56 * u, 64 * u, 0, -46 * u, 36), 2.5, 1.6);
          lay(ctx, head, p.skin, 0.1);
          const top =
            p.hairStyle === 0
              ? dome(62 * u, 50 * u, -62 * u)
              : p.hairStyle === 1
                ? dome(59 * u, 38 * u, -70 * u)
                : dome(60 * u, 44 * u, -66 * u);
          lay(ctx, sheet(`${size}:hair${i}`, top, 2, 1.4), p.hair, 0.08);
          // a face: two dots and a smile, cut from the same dark paper
          ctx.fillStyle = C.ink;
          for (const ex of [-19, 19]) {
            ctx.beginPath();
            ctx.arc(ex * u, -36 * u, 5.5 * u, 0, TAU);
            ctx.fill();
          }
          ctx.strokeStyle = C.ink;
          ctx.lineWidth = 4 * u;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.arc(0, -26 * u, 16 * u, 0.22 * Math.PI, 0.78 * Math.PI);
          ctx.stroke();
          ctx.restore();
          label(ctx, p.name, 0, h / 2 - 34 * u, 30, C.ink, { weight: 600 });
        },
        0.7,
      );
      // the check, pasted on its beat
      const ct = 420 + i * 30,
        k = prog(F, ct - 6, ct);
      if (F >= ct - 6 && s.on) {
        const cs = sheet(`${size}:check${i}`, () => checkShape(130 * u), 3.5, 2),
          lift = 0.15 + 0.85 * (1 - k);
        at(
          ctx,
          `check${i}`,
          x + s.x + card.w * 0.32 + (1 - k) * 160 * u,
          y + s.y - card.h * 0.34 - (1 - k) * 220 * u,
          -0.1 + (1 - k) * 0.5,
          1 + 0.25 * (1 - k),
          () => lay(ctx, cs, C.accent, lift),
          0.6,
        );
      }
    });
  };

  // ---- 04 the click: confetti scraps burst from the hole
  const CONF = (() => {
    const r = rng(404);
    return Array.from({ length: 44 }, (_, i) => ({
      a: -Math.PI / 2 + (r() - 0.5) * 2.6,
      v: (700 + r() * 1100) * (tall ? 1.1 : 1),
      w: 16 + r() * 22,
      h: 10 + r() * 16,
      spin: (r() - 0.5) * 14,
      c: [C.accent, C.accent2, C.surface, C.ink, C.accent][i % 5]!,
      d: r() * 4,
    }));
  })();
  const confetti = (ctx: Ctx, F: number) => {
    if (F < CLICK) return;
    CONF.forEach((q, i) => {
      const t = (F - CLICK - q.d) / FPS;
      if (t < 0) return;
      const x = holeX + Math.cos(q.a) * q.v * t * u,
        y = holeY + (Math.sin(q.a) * q.v * t + 0.5 * 2600 * t * t) * u;
      if (y > H + 100 * u) return;
      const s = sheet(`conf${i}`, () => rect(q.w * u, q.h * u), 1.5, 1.2);
      at(ctx, `conf${i}`, x, y, q.spin * t, 1, () => lay(ctx, s, q.c, 0.5), 0);
    });
  };

  // ---- 05 sign-off: "Oriel" in cut letters, the red piece as its mark, the line under it
  const signSection = (ctx: Ctx, F: number) => {
    const base = (tall ? 900 : 470) * u,
      gs = scraps(ctx, P_.product, cx + (tall ? 0 : 60 * u), base, (tall ? 260 : 240) * u, 7, false);
    // every letter on cream or ink, so the name reads as one word
    gs.forEach((g, i) => {
      g.paper = i % 2 ? C.ink : C.surface;
      g.ink = i % 2 ? C.surface : C.ink;
      g.family = i === 0 ? F_.serif : g.family;
    });
    drawScraps(ctx, F, gs, `sign${size}`, T.sign + 1, 2, 360 * u);
    // the piece, pasted as the mark
    const k = prog(F, T.sign + 18, T.sign + 24);
    if (F >= T.sign + 18) {
      const mx = tall ? cx : gs[0]!.x - gs[0]!.w / 2 - pw * 0.95,
        my = tall ? base - 330 * u : base - 70 * u;
      at(
        ctx,
        "mark",
        mx + (1 - k) * 300 * u,
        my - (1 - k) * 200 * u,
        -0.08 + (1 - k) * 0.4,
        1.2 + 0.2 * (1 - k),
        () => drawPiece(ctx, 0.12 + 0.8 * (1 - k)),
        0.6,
      );
    }
    const s0 = T.sign + 26;
    const lines: Word[][] = [
      [wd("the", s0), wd("piece", s0 + 3), wd("your", s0 + 6)],
      [wd("week", s0 + 10, { scale: 1.15 }), wd("was", s0 + 13, { scale: 1.15 })],
      [wd("missing", s0 + 18, { scale: 1.7, key: true })],
    ];
    ladder(ctx, lines, cx, base + 110 * u, F, {
      size: (tall ? 66 : 58) * u,
      face: F_.serif,
      italic: F_.italic,
      ink: C.ink,
      accent: C.accent,
      fps: FPS,
      align: "center",
      gap: 0.08,
    });
    const ua = prog(F, T.sign + 44, T.sign + 50);
    if (ua > 0) {
      ctx.save();
      ctx.globalAlpha = ua;
      label(ctx, P_.url, cx, H - L.safe.bottom - (tall ? 10 : 20) * u, 26, C.muted, {
        family: F_.mono,
        weight: 500,
        track: 0.04,
      });
      ctx.restore();
    }
  };

  // ---- captions: serif word ladders beside the action, one key word in the accent italic
  const caption = (ctx: Ctx, F: number) => {
    const b = capL,
      o = { size: b.size * u, face: F_.serif, italic: F_.italic, ink: C.ink, accent: C.accent, fps: FPS, gap: 0.06 };
    if (F >= T.calendar && F < T.computer) {
      const s = T.calendar + 18;
      ladder(
        ctx,
        [
          [wd("Five", s), wd("people,", s + 4)],
          [wd("one", s + 12, { scale: 1.25 }), wd("free", s + 16, { scale: 1.25 })],
          [wd("hour.", s + 28, { scale: 2, key: true })],
        ],
        b.x,
        b.y,
        F,
        { ...o, out: T.computer - 10 },
      );
    } else if (F >= T.computer && F < T.portraits) {
      const s = T.computer + 14,
        lines = [
          [wd("Oriel", s), wd("reads", s + 4)],
          [wd("every", s + 12, { scale: 1.25 })],
          [wd("calendar.", s + 24, { scale: 1.6, key: true })],
        ];
      if (tall) ladder(ctx, lines, b.x, b.y, F, { ...o, out: T.portraits - 10 });
      else ladder(ctx, lines, W - L.safe.x, 110 * u, F, { ...o, size: 62 * u, align: "right", out: T.portraits - 10 });
    } else if (F >= T.portraits && F < T.click) {
      const s = T.portraits + 14,
        lines = [
          [wd("Everyone", s, { scale: 1.1 })],
          [wd("says", s + 10)],
          [wd("yes.", 420, { scale: 2.1, key: true })],
        ];
      if (tall) ladder(ctx, lines, b.x, b.y, F, { ...o, out: T.click - 10 });
      else ladder(ctx, lines, 1010 * u, 110 * u, F, { ...o, size: 62 * u, out: T.click - 10 });
    } else if (F >= T.click && F < T.sign) {
      const s = T.click + 16,
        lines = [
          [wd("Then", s), wd("it", s + 4)],
          [wd("just", s + 12, { scale: 1.25 })],
          [wd("clicks.", CLICK, { scale: 2, key: true })],
        ];
      ladder(ctx, lines, b.x, b.y, F, { ...o, out: T.sign - 10 });
    }
  };

  // ---- the frame
  const paint = (ctx: Ctx, env: Env, F0: number) => {
    const F = Math.floor(clamp(F0, 0, N - 1) / HOLD) * HOLD; // on twos
    S = env.scale;
    pose = F / HOLD;
    ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
    ctx.fillStyle = C.ground;
    ctx.fillRect(0, 0, W, H);
    // a slow push toward the middle of the page, the whole film long (the sign-off has its own)
    const push = F < T.sign ? 1 + 0.045 * (F / T.sign) : 1 + 0.03 * prog(F, T.sign, N),
      shake = F >= CLICK && F < CLICK + 4 ? (F < CLICK + 2 ? 5 : -3) * u : 0;
    ctx.save();
    ctx.translate(cx, cy + shake);
    ctx.scale(push, push);
    ctx.translate(-cx, -cy);
    background(ctx);
    if (F < T.calendar) hookSection(ctx, F);
    else if (F < T.sign) {
      if (F >= T.computer - 20 && F < T.portraits) computerScene(ctx, F);
      if (F >= T.portraits - 20 && F < T.click) portraitScene(ctx, F);
      calendarScene(ctx, F);
      rightHand(ctx, F);
      confetti(ctx, F);
    } else signSection(ctx, F);
    ctx.restore();
    caption(ctx, F);
    // the paper grain over everything; it jumps once, when the piece clicks in
    const g = grainTile(env),
      [ox, oy] = F >= CLICK ? [211, 97] : [0, 0];
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "soft-light";
    ctx.globalAlpha = 0.7;
    ctx.translate(-ox * S, -oy * S);
    ctx.fillStyle = ctx.createPattern(g.canvas as CanvasImageSource, "repeat")!;
    ctx.fillRect(ox * S, oy * S, W * S, H * S);
    ctx.restore();
  };

  const cuts = [0, T.calendar, T.computer, T.portraits, T.click, T.sign, N],
    names = ["hook", "calendar", "computer", "portraits", "click", "signoff"];
  const shots: Shot[] = names.map((sid, i) => ({
    id: sid,
    start: cuts[i]!,
    end: cuts[i + 1]!,
    draw: (ctx, local, env) => paint(ctx, env, cuts[i]! + local),
  }));
  return {
    meta: { title: id, W, H, fps: FPS, bpm: BPM, durationFrames: N, raster: "cpu" },
    assets: { images: {}, fonts: P_.assets },
    shots,
    audio: withRustles(
      beatScore({ frames: N, fps: FPS, bpm: BPM, mood: "soft", hits: [CLICK, T.sign + 15], sign: T.sign + 15 }),
      RUSTLES,
    ),
  };
}

export const paperCollage = make("vertical", "paperCollage");
export const paperCollageLandscape = make("landscape", "paperCollageLandscape");
