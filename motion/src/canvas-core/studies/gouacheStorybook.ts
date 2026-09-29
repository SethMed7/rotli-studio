// STUDY 52 · GOUACHE STORYBOOK (30 s, 24 fps, 120 bpm). An opaque-gouache picture book, animated: a small kid
// on a drizzly street shakes a snow globe, and the world inside it paints itself over the street, cuts on the beat
// behind the kid, swallows the camera through its glass, drains to its ink underdrawing, is painted back as
// evening and closes in a brush-edged iris. Every shape is a flat patch of paint with its own brush direction, a
// ragged edge and a dry fringe; black is dry-brush accent, never a closed outline. No product, no quokka.
// Brief: series/studies/briefs/gouache-storybook.json · prompt: series/studies/prompts/gouache-storybook.prompt.md
//
// The whole film is one function paint(F). THE CADENCE: it is 24 fps, but every fourth picture repeats the one
// before (18 new paintings a second), so everything animated reads the painted time T = paintedT(F), never F;
// only the section switch reads F, and every section starts on a multiple of 4, so a cut is never a held frame.
// Two things are computed ahead, once per size: the paper tooth and the bristle streak tile.
import PACK from "../../../brand/packs/studio/pack.json";
import { fractal, rng, type Ctx, type Env, type Layer } from "../core";
import type { Film, Shot } from "../film";
import { clamp, ease, lerp, prog, spring } from "../kit/motion";
import { usePack } from "../kit/pack";
import { beatScore } from "../kit/score";
import { layout, type Size } from "../kit/sizes";
import { text } from "../kit/type";

const P = usePack(PACK),
  C = P.palette("gouache"),
  F_ = P.face;
const FPS = 24,
  BPM = 120,
  N = 720; // a beat is 12 frames
type Pt = [number, number];
type Pass = "paint" | "ink" | "both" | "under";

/** the painted time: every fourth picture (i mod 4 = 1) holds the one before it */
export const paintedT = (F: number) => {
  const i = Math.floor(F);
  return i - (i % 4 === 1 ? 1 : 0);
};

// ------------------------------------------------------------------ colour, hashing, noise
const hx = (h: string): [number, number, number] => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];
const mix = (a: string, b: string, t: number) => {
  const A = hx(a),
    B = hx(b);
  return (
    "#" +
    A.map((v, i) =>
      Math.round(lerp(v, B[i]!, t))
        .toString(16)
        .padStart(2, "0"),
    ).join("")
  );
};
const rgba = (h: string, a: number) => {
  const [r, g, b] = hx(h);
  return `rgba(${r},${g},${b},${a})`;
};
/** a form's one shadow tone: its fill darkened 18% and pulled 20% toward s5 */
const darker = (h: string) => mix(mix(h, "#000000", 0.18), C.s5, 0.2);
const hash = (a: number) => {
  let h = Math.imul((a | 0) ^ 0x2c1b3c6d, 0x297a2d39) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
/** seeded 1D value noise, smooth, 0..1 */
const vn = (seed: number, x: number) => {
  const i = Math.floor(x),
    f = x - i,
    s = f * f * (3 - 2 * f);
  return lerp(hash(seed * 7919 + i), hash(seed * 7919 + i + 1), s);
};
const mod = (a: number, m: number) => ((a % m) + m) % m;

// ------------------------------------------------------------------ geometry
const rect = (x: number, y: number, w: number, h: number): Pt[] => [
  [x, y],
  [x + w, y],
  [x + w, y + h],
  [x, y + h],
];
const ell = (cx: number, cy: number, rx: number, ry = rx, n = 28, rot = 0): Pt[] =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2,
      x = Math.cos(a) * rx,
      y = Math.sin(a) * ry;
    return [cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)] as Pt;
  });
const arcPts = (cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n = 24): Pt[] =>
  Array.from({ length: n }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / (n - 1);
    return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry] as Pt;
  });
/** a superellipse box: soft corners for sleeves, bands and toggles */
const sbox = (cx: number, cy: number, w: number, h: number, n = 28): Pt[] =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2,
      c = Math.cos(a),
      s = Math.sin(a),
      k = 1 / (Math.abs(c) ** 4 + Math.abs(s) ** 4) ** 0.25;
    return [cx + (c * k * w) / 2, cy + (s * k * h) / 2] as Pt;
  });
const move = (pts: Pt[], dx: number, dy: number): Pt[] => pts.map(([x, y]) => [x + dx, y + dy]);
const rotAbout = ([x, y]: Pt, [cx, cy]: Pt, a: number): Pt => [
  cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a),
  cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a),
];
const trace = (ctx: Ctx, q: Pt[]) => {
  ctx.beginPath();
  ctx.moveTo(q[0]![0], q[0]![1]);
  for (let i = 1; i < q.length; i++) ctx.lineTo(q[i]![0], q[i]![1]);
  ctx.closePath();
};
const bbox = (q: Pt[]) => {
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity;
  for (const [x, y] of q) {
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  }
  return { x0, y0, x1, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, r: Math.hypot(x1 - x0, y1 - y0) / 2 };
};
/** a painted edge is never vector-perfect: resample about every `step` and push each vertex in or out by noise */
function rough(pts: Pt[], seed: number, amp: number, step: number): Pt[] {
  const n = pts.length;
  let per = 0;
  for (let i = 0; i < n; i++) per += Math.hypot(pts[(i + 1) % n]![0] - pts[i]![0], pts[(i + 1) % n]![1] - pts[i]![1]);
  const st = Math.max(step, per / 320),
    d: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = pts[i]!,
      b = pts[(i + 1) % n]!,
      m = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / st));
    for (let k = 0; k < m; k++) d.push([a[0] + ((b[0] - a[0]) * k) / m, a[1] + ((b[1] - a[1]) * k) / m]);
  }
  const m = d.length;
  return d.map((p, i) => {
    const a = d[(i - 1 + m) % m]!,
      b = d[(i + 1) % m]!,
      tx = b[0] - a[0],
      ty = b[1] - a[1],
      l = Math.hypot(tx, ty) || 1,
      off = ((vn(seed, i * 0.45) - 0.5) * 1.6 + (hash(seed * 131 + i) - 0.5) * 0.4) * amp;
    return [p[0] + (ty / l) * off, p[1] - (tx / l) * off] as Pt;
  });
}
/** a band along a centreline (the wipes, the scarf): ragged edges from 1D noise, a head split into dry tongues */
function band(c: Pt[], w: (s: number) => number, seed: number, rag: number, tongue: number, tailTongue = 0): Pt[] {
  const n = c.length,
    L: Pt[] = [],
    R: Pt[] = [];
  let tx = 1,
    ty = 0;
  for (let i = 0; i < n; i++) {
    const a = c[Math.max(0, i - 1)]!,
      b = c[Math.min(n - 1, i + 1)]!,
      l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    tx = (b[0] - a[0]) / l;
    ty = (b[1] - a[1]) / l;
    const s = i / (n - 1),
      hw = w(s) / 2,
      e1 = (vn(seed, i * 0.55) - 0.5) * 2 * rag,
      e2 = (vn(seed + 5, i * 0.55) - 0.5) * 2 * rag,
      p = c[i]!;
    L.push([p[0] - ty * (hw + e1), p[1] + tx * (hw + e1)]);
    R.push([p[0] + ty * (hw + e2), p[1] - tx * (hw + e2)]);
  }
  const cap: Pt[] = [];
  if (tongue > 0) {
    const k = 4 + Math.floor(hash(seed * 9) * 3),
      e = c[n - 1]!,
      hw = w(1) / 2;
    for (let j = 0; j < k; j++) {
      const f0 = j / k,
        f1 = (j + 0.5) / k,
        o0 = hw - f0 * 2 * hw,
        o1 = hw - f1 * 2 * hw,
        len = tongue * (0.35 + 0.65 * hash(seed * 11 + j));
      if (j > 0) cap.push([e[0] - ty * o0 - tx * tongue * 0.15, e[1] + tx * o0 - ty * tongue * 0.15]);
      cap.push([e[0] - ty * o1 + tx * len, e[1] + tx * o1 + ty * len]);
    }
  }
  const tcap: Pt[] = [];
  if (tailTongue > 0) {
    const e = c[0]!,
      a = c[Math.min(n - 1, 1)]!,
      l = Math.hypot(a[0] - e[0], a[1] - e[1]) || 1,
      bx = (a[0] - e[0]) / l,
      by = (a[1] - e[1]) / l,
      hw = w(0) / 2,
      k = 5 + Math.floor(hash(seed * 19) * 3);
    // from the right edge back to the left: dry hairs trailing behind the stroke
    for (let j = 0; j < k; j++) {
      const f1 = (j + 0.5) / k,
        o1 = -hw + f1 * 2 * hw,
        len = tailTongue * (0.3 + 0.7 * hash(seed * 23 + j));
      tcap.push([e[0] - by * o1 - bx * len, e[1] + bx * o1 - by * len]);
      if (j < k - 1) {
        const o0 = -hw + ((j + 1) / k) * 2 * hw;
        tcap.push([e[0] - by * o0 + bx * tailTongue * 0.2, e[1] + bx * o0 + by * tailTongue * 0.2]);
      }
    }
  }
  return [...L, ...cap, ...R.reverse(), ...tcap];
}

// ------------------------------------------------------------------ the two tiles, computed once per size
function bristleTile(env: Env, u: number): Layer {
  const k = `gouache:bristle:${u}:${env.scale}`;
  let t = env.cache.get(k) as Layer | undefined;
  if (t) return t;
  const S = Math.round(512 * u * env.scale);
  t = env.canvas(S, S);
  const c = t.ctx,
    r = rng(5252);
  c.setTransform(S / 512, 0, 0, S / 512, 0, 0);
  c.lineCap = "round";
  for (let i = 0; i < 900; i++) {
    const x = r() * 512,
      y = r() * 512,
      len = 60 + r() * 340,
      w = 1 + r() * 2,
      bend = (r() - 0.5) * 16,
      col = rgba(i % 2 ? C.surface : C.ink, 0.03 + r() * 0.06),
      cut0 = r() * 0.2,
      cut1 = 0.8 + r() * 0.2;
    for (const dx of [0, -512])
      for (const dy of [0, y > 480 ? -512 : y < 32 ? 512 : 0]) {
        c.strokeStyle = col;
        // the body, then ragged ends: two thinner hairs that stop at different lengths
        c.lineWidth = w;
        c.beginPath();
        c.moveTo(x + dx + len * cut0, y + dy);
        c.quadraticCurveTo(x + dx + len / 2, y + dy + bend, x + dx + len * cut1, y + dy);
        c.stroke();
        c.lineWidth = w * 0.45;
        c.beginPath();
        c.moveTo(x + dx, y + dy + w * 0.3);
        c.quadraticCurveTo(x + dx + len / 2, y + dy + bend + w * 0.3, x + dx + len, y + dy + w * 0.3);
        c.stroke();
      }
  }
  env.cache.set(k, t);
  return t;
}
function paperTile(env: Env, W: number, H: number, u: number): Layer {
  const k = `gouache:paper:${W}x${H}:${env.scale}`;
  let t = env.cache.get(k) as Layer | undefined;
  if (t) return t;
  const sc = env.scale,
    w = Math.round(W * sc),
    h = Math.round(H * sc);
  t = env.canvas(w, h);
  const c = t.ctx;
  // a low-frequency mottle, at 1/8 resolution and smoothed up
  const mw = Math.ceil(W / 8),
    mh = Math.ceil(H / 8),
    Mo = env.canvas(mw, mh),
    img = Mo.ctx.createImageData(mw, mh),
    [lr, lg, lb] = hx(C.muted);
  for (let y = 0; y < mh; y++)
    for (let x = 0; x < mw; x++) {
      const n = fractal(52, x / 30, y / 30, 1, 1, 3),
        i = (y * mw + x) * 4;
      img.data[i] = lr;
      img.data[i + 1] = lg;
      img.data[i + 2] = lb;
      img.data[i + 3] = Math.round(clamp((n - 0.4) * 1.2) * 255);
    }
  Mo.ctx.putImageData(img, 0, 0);
  c.imageSmoothingEnabled = true;
  c.drawImage(Mo.canvas, 0, 0, w, h);
  c.setTransform(sc, 0, 0, sc, 0, 0);
  const r = rng(1952);
  for (let i = 0; i < 12000; i++) {
    const s = (1 + r()) * u;
    c.fillStyle = rgba(r() < 0.5 ? C.line : C.surface, 0.5 + r() * 0.5);
    c.fillRect(r() * W, r() * H, s, s);
  }
  env.cache.set(k, t);
  return t;
}

// ------------------------------------------------------------------ the brush
type G = {
  ctx: Ctx;
  env: Env;
  pass: Pass;
  u: number;
  /** a point remap applied to every outline and mark (the fish-eye face); k is its local scale */
  map?: (p: Pt) => Pt;
  k: number;
};
const pats = new WeakMap<Ctx, CanvasPattern>();
const pattern = (g: G) => {
  let p = pats.get(g.ctx);
  if (!p) {
    p = g.ctx.createPattern(bristleTile(g.env, g.u).canvas, "repeat")!;
    pats.set(g.ctx, p);
  }
  return p;
};
const paints = (g: G) => g.pass === "paint" || g.pass === "both";
const inks = (g: G) => g.pass !== "paint";

type ShapeOpts = { shade?: [number, number]; hairs?: number; alpha?: number; amp?: number; tex?: boolean };
/**
 * A PAINTED SHAPE: a rough outline, a flat opaque fill, the bristle tile clipped inside and turned to the shape's own
 * brush angle, two or three load streaks, one flat shadow shape (the form minus itself shifted toward the light),
 * and dry drag hairs leaving the trailing edge. In the underdrawing pass it is a closed ink contour instead.
 */
function shape(g: G, pts: Pt[], fill: string, ang: number, seed: number, o: ShapeOpts = {}): Pt[] {
  if (g.pass === "ink") return [];
  const { ctx, u } = g,
    amp = ((o.amp ?? 3) * u) / g.k;
  let q = rough(pts, seed, amp, (12 * u) / g.k);
  if (g.map) q = q.map(g.map);
  if (g.pass === "under") {
    dry(g, q, 2.6 * u * g.k, seed, C.ink, 0.9, true);
    return q;
  }
  ctx.save();
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  trace(ctx, q);
  ctx.fillStyle = fill;
  ctx.fill();
  if (o.tex !== false) texture(g, q, fill, ang, seed);
  if (o.shade) {
    let lit = rough(move(pts, -o.shade[0], -o.shade[1]), seed + 3, amp, (12 * u) / g.k);
    if (g.map) lit = lit.map(g.map);
    const b = bbox(q),
      sh = darker(fill);
    ctx.save();
    trace(ctx, q);
    ctx.clip();
    ctx.beginPath();
    ctx.rect(b.x0 - 10, b.y0 - 10, b.x1 - b.x0 + 20, b.y1 - b.y0 + 20);
    ctx.moveTo(lit[0]![0], lit[0]![1]);
    for (let i = 1; i < lit.length; i++) ctx.lineTo(lit[i]![0], lit[i]![1]);
    ctx.closePath();
    ctx.clip("evenodd");
    ctx.fillStyle = sh;
    ctx.fillRect(b.x0 - 10, b.y0 - 10, b.x1 - b.x0 + 20, b.y1 - b.y0 + 20);
    if (o.tex !== false) texture(g, q, sh, ang, seed + 1, false);
    ctx.restore();
  }
  // the dry fringe: hairs of the fill leaving the edge along the brush, on the trailing side
  const nh = o.hairs ?? 6 + Math.floor(hash(seed * 3) * 15);
  if (nh > 0) {
    const b = bbox(q),
      dx = Math.cos(ang),
      dy = Math.sin(ang),
      m = q.length,
      cand: number[] = [];
    for (let i = 0; i < m; i++) {
      const a = q[(i - 1 + m) % m]!,
        c = q[(i + 1) % m]!;
      let nx = c[1] - a[1],
        ny = -(c[0] - a[0]);
      const l = Math.hypot(nx, ny) || 1;
      nx /= l;
      ny /= l;
      if (nx * (q[i]![0] - b.cx) + ny * (q[i]![1] - b.cy) < 0) {
        nx = -nx;
        ny = -ny;
      }
      if (nx * dx + ny * dy > 0.55) cand.push(i);
    }
    if (cand.length) {
      const sz = Math.min(1, b.r / (60 * u * g.k));
      ctx.strokeStyle = fill;
      ctx.lineCap = "round";
      for (let j = 0; j < nh; j++) {
        const p = q[cand[Math.floor(hash(seed * 7 + j) * cand.length)]!]!,
          len = (10 + 30 * hash(seed * 11 + j)) * u * g.k * sz,
          side = (hash(seed * 13 + j) - 0.5) * 0.25;
        ctx.lineWidth = (1 + hash(seed * 17 + j)) * u * g.k * Math.max(0.5, sz);
        ctx.beginPath();
        ctx.moveTo(p[0] - dx * 3 * u, p[1] - dy * 3 * u);
        ctx.lineTo(p[0] + (dx - dy * side) * len, p[1] + (dy + dx * side) * len);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
  return q;
}
function texture(g: G, q: Pt[], fill: string, ang: number, seed: number, load = true) {
  const { ctx, u } = g,
    b = bbox(q),
    sc = g.env.scale,
    t = 512 * u;
  ctx.save();
  trace(ctx, q);
  ctx.clip();
  ctx.translate(b.cx, b.cy);
  ctx.rotate(ang);
  ctx.save();
  ctx.translate(-t * hash(seed), -t * hash(seed + 9));
  ctx.scale(1 / sc, 1 / sc);
  ctx.globalAlpha *= 0.6;
  ctx.fillStyle = pattern(g);
  ctx.fillRect((-b.r - t) * sc, (-b.r - t) * sc, (2 * b.r + 2 * t) * sc, (2 * b.r + 2 * t) * sc);
  ctx.restore();
  ctx.globalAlpha = 1;
  if (load) {
    // where the brush was fullest: the fill mixed 25% with surface, in parallel bristle lines
    ctx.strokeStyle = mix(fill, C.surface, 0.25);
    ctx.lineCap = "round";
    const nl = 2 + (hash(seed * 5) > 0.5 ? 1 : 0),
      bw = Math.min(16 * u * g.k, b.r * 0.14),
      a0 = ctx.globalAlpha;
    for (let j = 0; j < nl; j++) {
      const yy = (hash(seed * 13 + j) - 0.5) * b.r * 0.9,
        x0 = -b.r * (0.2 + 0.6 * hash(seed * 17 + j)),
        len = b.r * (0.4 + 0.7 * hash(seed * 19 + j));
      for (let s = 0; s < 4; s++) {
        ctx.globalAlpha = a0 * (0.35 + 0.35 * hash(seed * 23 + j * 7 + s));
        ctx.lineWidth = bw * (0.15 + 0.2 * hash(seed * 29 + j * 7 + s));
        const y = yy + (s / 3 - 0.5) * bw;
        ctx.beginPath();
        ctx.moveTo(x0 + len * 0.15 * hash(seed * 31 + s), y);
        ctx.quadraticCurveTo(x0 + len / 2, y + bw * 0.3, x0 + len * (0.7 + 0.3 * hash(seed * 37 + s)), y);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = a0;
  }
  ctx.restore();
}
/**
 * A DRY-BRUSH MARK: a centreline with width w(s) = w0·sin(πs)^0.5, rendered as 4–6 parallel sub-lines whose
 * visibility along s is gated by seeded value noise, so the mark breaks into bristle streaks where the brush ran
 * dry (mostly near its ends). Closed marks (the underdrawing) keep their width all the way round.
 */
function dry(g: G, pts: Pt[], w0: number, seed: number, color: string, alpha: number, closed = false) {
  if (pts.length < 2) return;
  const { ctx } = g,
    src = closed ? [...pts, pts[0]!] : pts,
    cum = [0];
  for (let i = 1; i < src.length; i++)
    cum.push(cum[i - 1]! + Math.hypot(src[i]![0] - src[i - 1]![0], src[i]![1] - src[i - 1]![1]));
  const L = cum[cum.length - 1]!;
  if (L <= 0) return;
  const ns = Math.max(8, Math.min(160, Math.ceil(L / (5 * g.u)))),
    d: Pt[] = [],
    nrm: Pt[] = [];
  let seg = 0;
  for (let i = 0; i <= ns; i++) {
    const at = (L * i) / ns;
    while (seg < src.length - 2 && cum[seg + 1]! < at) seg++;
    const a = src[seg]!,
      b = src[seg + 1]!,
      f = (at - cum[seg]!) / (cum[seg + 1]! - cum[seg]! || 1);
    d.push([lerp(a[0], b[0], f), lerp(a[1], b[1], f)]);
  }
  for (let i = 0; i <= ns; i++) {
    const a = d[Math.max(0, i - 1)]!,
      b = d[Math.min(ns, i + 1)]!,
      l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    nrm.push([-(b[1] - a[1]) / l, (b[0] - a[0]) / l]);
  }
  const n = 4 + Math.floor(hash(seed * 3 + 1) * 3),
    cells = Math.max(4, L / (16 * g.u * g.k));
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = color;
  for (let j = 0; j < n; j++) {
    const off = (j + 0.5) / n - 0.5,
      sw = 1.8 / n;
    let left: Pt[] = [],
      right: Pt[] = [];
    const flush = () => {
      if (left.length > 1) {
        ctx.beginPath();
        ctx.moveTo(left[0]![0], left[0]![1]);
        for (const p of left) ctx.lineTo(p[0], p[1]);
        for (let k = right.length - 1; k >= 0; k--) ctx.lineTo(right[k]![0], right[k]![1]);
        ctx.closePath();
        ctx.fill();
      }
      left = [];
      right = [];
    };
    for (let i = 0; i <= ns; i++) {
      const s = i / ns,
        w = closed ? w0 : w0 * Math.sqrt(Math.sin(Math.PI * s)),
        edge = closed ? 0 : Math.abs(2 * s - 1) ** 3,
        thr = (closed ? 0.3 : 0.18) + 0.55 * edge + (j === 0 || j === n - 1 ? 0.12 : 0),
        vis = vn(seed * 17 + j * 101, s * cells) > thr;
      if (!vis) {
        flush();
        continue;
      }
      const p = d[i]!,
        nn = nrm[i]!,
        a = off * w + (sw * w) / 2,
        b = off * w - (sw * w) / 2;
      left.push([p[0] + nn[0] * a, p[1] + nn[1] * a]);
      right.push([p[0] + nn[0] * b, p[1] + nn[1] * b]);
    }
    flush();
  }
  ctx.restore();
}
/** black dry-brush accent (the ink pass): only shadow sides and defining lines, never a closed contour */
function ink(g: G, pts: Pt[], w0: number, seed: number, color = C.ink, alpha = 1) {
  if (!inks(g)) return;
  dry(g, g.map ? pts.map(g.map) : pts, w0 * g.u * g.k, seed, color, alpha);
}
/** a coloured dry-brush stroke that belongs to the paint (wave dashes, highlights, rain) */
function stroke(g: G, pts: Pt[], w0: number, seed: number, color: string, alpha = 1) {
  if (!paints(g)) return;
  dry(g, g.map ? pts.map(g.map) : pts, w0 * g.u * g.k, seed, color, alpha);
}
/** a small flat blob of ink (dot eyes), no texture */
function blob(g: G, pts: Pt[], color: string) {
  if (!inks(g) && color === C.ink) return;
  if (!paints(g) && color !== C.ink) return;
  let q = rough(pts, 7, 0.6 * g.u, 4 * g.u);
  if (g.map) q = q.map(g.map);
  trace(g.ctx, q);
  g.ctx.fillStyle = color;
  g.ctx.fill();
}
const within = (g: G, q: Pt[], fn: () => void) => {
  if (!q.length) return fn();
  g.ctx.save();
  trace(g.ctx, q);
  g.ctx.clip();
  fn();
  g.ctx.restore();
};

// ------------------------------------------------------------------ snow
type Flake = {
  x0: number;
  y0: number;
  r: number;
  v: number;
  w: number;
  ph: number;
  A: number;
  dir: number;
  rot: number;
};
const flakes = (n: number, seed: number): Flake[] => {
  const r = rng(seed);
  return Array.from({ length: n }, () => ({
    x0: r() * 2 - 1,
    y0: r() * 2,
    r: 2 + r() * 4,
    v: 0.011 + r() * 0.013,
    w: 0.03 + r() * 0.05,
    ph: r() * 6.28,
    A: 0.02 + r() * 0.05,
    dir: -Math.PI / 2 + (r() - 0.5) * 2.4,
    rot: r() * 3.14,
  }));
};
const FL_GLOBE = flakes(140, 11),
  FL_FRAME = flakes(220, 12);
/** closed-form snow: a fall, a sway, and for every shake already past a swirl offset and a vortex turn */
const flakeAt = (f: Flake, T: number, shakes: number[]): Pt => {
  let y = mod(f.y0 + f.v * T, 2) - 1,
    x = f.x0 + f.A * Math.sin(f.w * T + f.ph),
    th = 0;
  for (const tk of shakes) {
    if (T <= tk) continue;
    const dt = T - tk,
      o = 0.6 * (1 - Math.exp(-dt / 2)) * Math.exp(-dt / 18);
    x += Math.cos(f.dir) * o;
    y += Math.sin(f.dir) * o;
    th += 1.6 * (1 - Math.exp(-dt / 8)) * Math.exp(-dt / 40);
  }
  return [x * Math.cos(th) - y * Math.sin(th), x * Math.sin(th) + y * Math.cos(th)];
};
function flake(g: G, x: number, y: number, r: number, rot: number) {
  const { ctx } = g;
  if (g.pass === "under") {
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = Math.max(0.8, r * 0.3);
    ctx.beginPath();
    ctx.arc(x, y, r * 0.8, 0, Math.PI * 2);
    ctx.stroke();
    return;
  }
  ctx.fillStyle = C.surface;
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.72, rot, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = mix(C.surface, C.line, 0.7);
  ctx.lineWidth = r * 0.3;
  ctx.beginPath();
  ctx.moveTo(x - Math.cos(rot) * r * 0.6, y - Math.sin(rot) * r * 0.6);
  ctx.lineTo(x + Math.cos(rot) * r * 0.5, y + Math.sin(rot) * r * 0.5);
  ctx.stroke();
}

// ------------------------------------------------------------------ the kid
type Pose = {
  gx: number;
  gy: number;
  gr: number;
  arm: number;
  hy: number;
  tilt: number;
  puff: number;
  eyes: number;
  blink: number;
  mouth: 0 | 1 | 2;
  wind: number;
  stance: 0 | 1 | 2;
  cap: number;
  jolt: number;
  pom: number;
  bob: number;
};
const POSE: Pose = {
  gx: 0,
  gy: 200,
  gr: 118,
  arm: 112,
  hy: 0,
  tilt: 0,
  puff: 0,
  eyes: 1,
  blink: 0,
  mouth: 0,
  wind: 0,
  stance: 0,
  cap: 0,
  jolt: 0,
  pom: 0,
  bob: 0,
};
/** the head group, in its own space (neck at the origin, head centre at (0, −112)); every point goes through g.map */
function head(g: G, T: number, p: Pose, seed = 200) {
  const pf = p.puff;
  shape(g, ell(0, -112, 100 + pf * 8, 96 + pf * 3, 36), C.s6, -0.5, seed + 1, { shade: [20, 12], hairs: 8 });
  if (pf > 0)
    for (const s of [-1, 1])
      shape(g, ell(s * 72, -54, 30 * pf, 24 * pf, 18), C.s6, 0, seed + 3 + s, { hairs: 0, shade: [5, 4] });
  // blush: five overlapping streaks of s7 at 35%
  for (const s of [-1, 1])
    for (let j = 0; j < 5; j++)
      shape(
        g,
        ell(s * 60 + (j - 2) * 5, -48 + (j % 2) * 4 - 3, 17 + pf * 6, 4.5, 10, -0.15 * s),
        C.s7,
        0,
        seed + 10 + j + s * 5,
        {
          alpha: 0.35,
          hairs: 0,
          tex: false,
          amp: 0.5,
        },
      );
  // two ink dot eyes, each with one glint
  const open = 1 - 0.9 * p.blink,
    k = p.eyes;
  for (const s of [-1, 1]) {
    const ex = s * 34,
      ey = -76;
    blob(g, ell(ex, ey, 10.5 * k, 11 * k * open, 16), C.ink);
    if (open > 0.5) blob(g, ell(ex - 3.4 * k, ey - 4 * k, 3.4 * k, 3.4 * k, 10), C.surface);
  }
  if (p.mouth === 0) ink(g, arcPts(0, -52, 15, 9, 0.35, 2.8, 10), 5.5, seed + 15);
  else if (p.mouth === 1) {
    shape(g, [...arcPts(0, -54, 27, 21, 0, Math.PI, 16)], mix(C.ink, C.accent, 0.3), 0, seed + 16, {
      hairs: 0,
      tex: false,
      amp: 0.6,
    });
    shape(g, sbox(0, -50, 36, 7), C.surface, 0, seed + 17, { hairs: 0, tex: false, amp: 0.4 });
    ink(g, arcPts(0, -54, 28, 22, 0.2, 2.9, 14), 4, seed + 18);
  } else blob(g, ell(0, -46, 9, 11, 14), mix(C.ink, C.accent, 0.2));
  ink(g, arcPts(0, -112, 103 + pf * 8, 99, -0.9, 2.9, 30), 7, seed + 20);
  // the knitted hat: a dome with its brush running round it, a ribbed band, the pom-pom on a pivot
  shape(g, [...arcPts(0, -128, 112, 110, Math.PI, Math.PI * 2, 22)], C.s1, -0.35, seed + 30, { shade: [24, 8] });
  if (p.cap > 0)
    shape(
      g,
      [...arcPts(-4, -222, 64 * p.cap, 26 * p.cap, Math.PI, Math.PI * 2, 14), [58, -214], [-66, -214]],
      C.surface,
      0,
      seed + 36,
      { shade: [0, 6], hairs: 6 },
    );
  shape(g, sbox(0, -114, 232, 40), mix(C.s1, C.s3, 0.18), Math.PI / 2, seed + 31, { shade: [20, 0], hairs: 0 });
  for (let j = -5; j <= 6; j++)
    if (j > -2 || j % 2 === 0)
      ink(
        g,
        [
          [j * 17, -130],
          [j * 17 + 1, -98],
        ],
        3.2,
        seed + 40 + j,
      );
  ink(g, arcPts(0, -128, 113, 111, -1.35, -0.08, 14), 6, seed + 32);
  const pc = rotAbout([0, -268], [0, -236], p.pom);
  shape(g, ell(pc[0], pc[1], 31, 30, 22), C.accent, 0.8, seed + 60, { shade: [9, 7], hairs: 10 });
  ink(g, arcPts(pc[0], pc[1], 32, 31, -0.5, 2.3, 12), 5, seed + 61);
}
/** the rig: separate painted parts, each on its own pivot, the arms solved to the globe (two segments) */
function ik(S: Pt, M: Pt, a: number, b: number, side: number): [number, number] {
  const dx = M[0] - S[0],
    dy = M[1] - S[1],
    d = clamp(Math.hypot(dx, dy), Math.abs(a - b) + 1, a + b - 0.5),
    phi = Math.atan2(dy, dx),
    al = Math.acos(clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1)),
    t1 = side * Math.cos(phi + al) > side * Math.cos(phi - al) ? phi + al : phi - al,
    E: Pt = [S[0] + a * Math.cos(t1), S[1] + a * Math.sin(t1)];
  return [t1, Math.atan2(M[1] - E[1], M[0] - E[0])];
}
function kid(
  g: G,
  T: number,
  x: number,
  y: number,
  s: number,
  p: Pose,
  drawGlobe: (g: G, gx: number, gy: number, gr: number) => void,
) {
  const { ctx } = g;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  // legs and boots
  for (const side of [-1, 1]) {
    const la = [0, side * 0.12, -side * 0.1][p.stance]!;
    ctx.save();
    ctx.translate(side * 42, 318);
    ctx.rotate(la);
    shape(g, rect(-26, 0, 52, 160), mix(C.s5, C.ink, 0.15), Math.PI / 2, 120 + side, { shade: [12, 0], hairs: 4 });
    shape(g, ell(side * 8, 170, 44, 24, 20), mix(C.ink, C.s3, 0.25), 0, 125 + side, { hairs: 0, shade: [8, 6] });
    ctx.restore();
  }
  // the duffel coat, brushed down its length
  shape(
    g,
    [
      [-66, -8],
      [66, -8],
      [98, 24],
      [116, 180],
      [138, 330],
      [-138, 330],
      [-116, 180],
      [-98, 24],
    ],
    C.accent2,
    Math.PI / 2,
    101,
    { shade: [30, 0] },
  );
  ink(
    g,
    [
      [100, 30],
      [118, 180],
      [138, 326],
    ],
    8,
    102,
  );
  ink(
    g,
    [
      [126, 332],
      [20, 336],
      [-90, 332],
    ],
    6,
    103,
  );
  ink(
    g,
    [
      [2, 34],
      [4, 180],
      [6, 324],
    ],
    4,
    104,
  );
  for (let k = 0; k < 3; k++) {
    const ty = 76 + 72 * k;
    shape(g, sbox(28, ty, 36, 11, 16), C.surface, 0, 110 + k, { hairs: 0, shade: [0, 3], amp: 0.8 });
    ink(
      g,
      [
        [4, ty],
        [14, ty + 1],
      ],
      3,
      115 + k,
    );
  }
  // the scarf: a band at the neck and a tail that hangs, or streams in wind as a travelling sine
  const tail: Pt[] = [];
  for (let i = 0; i <= 14; i++) {
    const f = i / 14,
      hang: Pt = [44 + f * 16, 16 + f * 150],
      sx = 60 + f * 290,
      a = (4 + 0.14 * (sx - 60)) * (0.6 + 0.4 * p.wind),
      stream: Pt = [sx, 10 + f * 30 + a * Math.sin(0.028 * (sx - 60) - 0.55 * T)];
    tail.push([lerp(hang[0], stream[0], p.wind), lerp(hang[1], stream[1], p.wind)]);
  }
  shape(
    g,
    band(tail, (f) => 40 - 8 * f, 131, 2, 18),
    C.accent,
    lerp(Math.PI / 2, 0, p.wind),
    132,
    { hairs: 0, shade: [0, 8] },
  );
  shape(
    g,
    [
      [-86, -22],
      [86, -22],
      [98, 22],
      [0, 32],
      [-98, 22],
    ],
    C.accent,
    0,
    130,
    { shade: [0, 10], hairs: 8 },
  );
  ink(
    g,
    [
      [30, 30],
      [98, 20],
      [90, -18],
    ],
    5,
    133,
  );
  // the head group, bobbing on the beat and leaning
  ctx.save();
  ctx.translate(0, p.hy + p.bob);
  ctx.translate(0, -10);
  ctx.rotate(p.tilt);
  ctx.translate(0, 10);
  head(g, T, p);
  ctx.restore();
  // arms: shoulder → elbow → mitten, solved to the globe's sides
  const gy = p.gy + p.jolt,
    hands: [Pt, number][] = [];
  for (const side of [-1, 1]) {
    const S: Pt = [side * 86, 26],
      Mt: Pt = [p.gx + side * p.gr * 0.93, gy + p.gr * 0.28],
      [t1, t2] = ik(S, Mt, p.arm, p.arm, side);
    ctx.save();
    ctx.translate(S[0], S[1]);
    ctx.rotate(t1);
    shape(g, sbox(p.arm / 2, 0, p.arm + 34, 54), C.accent2, 0, 140 + side, { shade: [0, 12], hairs: 6 });
    ctx.translate(p.arm, 0);
    ctx.rotate(t2 - t1);
    shape(g, sbox(p.arm / 2, 0, p.arm + 24, 48), C.accent2, 0, 142 + side, { shade: [0, 10], hairs: 6 });
    ink(
      g,
      [
        [0, 22 * side],
        [p.arm * 0.9, 20 * side],
      ],
      5,
      144 + side,
    );
    ctx.restore();
    const E: Pt = [S[0] + p.arm * Math.cos(t1), S[1] + p.arm * Math.sin(t1)];
    hands.push([[E[0] + p.arm * Math.cos(t2), E[1] + p.arm * Math.sin(t2)], t2]);
  }
  drawGlobe(g, p.gx, gy, p.gr);
  for (const [[hx0, hy0], a] of hands) {
    const side = hx0 < p.gx ? -1 : 1;
    shape(g, ell(hx0, hy0, 36, 32, 22, a), C.s1, a, 150 + side, { shade: [7, 7], hairs: 8 });
    shape(g, ell(hx0 - side * 14, hy0 - 24, 12, 17, 14, -0.3 * side), C.s1, 0, 152 + side, { hairs: 0 });
    ink(g, arcPts(hx0, hy0, 37, 33, -0.2, 2.4, 12), 5, 154 + side);
  }
  ctx.restore();
}

// ------------------------------------------------------------------ the film
const HOME = 0,
  SEA = 1,
  DUNES = 2,
  JUNGLE = 3,
  PINES = 4,
  REEF = 5,
  ROOFS = 6,
  MOON = 7,
  BALLOONS = 8,
  BANDS = 9,
  VILLAGE = 10,
  INSIDE = 11,
  NESTED = 12;
const MONT = [DUNES, JUNGLE, PINES, REEF, ROOFS, MOON, BALLOONS, BANDS];
// the sections, in frames (all on the 12-frame beat grid, so never on a held picture)
const S = {
  pull: 48,
  shake: 96,
  repaint: 144,
  close: 192,
  montage: 240,
  push: 336,
  inside: 384,
  unpaint: 480,
  eve: 516,
  out: 552,
  lift: 600,
  end: 648,
};
const GLOBE_SHAKES = [-30, 12, 24, 96, 108, 120, 216, 228];
const JOLTS = [96, 108, 120, 216, 228];

type Rib = { p: Pt[]; w: number; f0: number; col: string; seed: number };
const bz = (p: Pt[], t: number): Pt => {
  const m = 1 - t;
  return [
    m * m * m * p[0]![0] + 3 * m * m * t * p[1]![0] + 3 * m * t * t * p[2]![0] + t * t * t * p[3]![0],
    m * m * m * p[0]![1] + 3 * m * m * t * p[1]![1] + 3 * m * t * t * p[2]![1] + t * t * t * p[3]![1],
  ];
};

export function make(size: Size, id: string): Film {
  const Lo = layout(size),
    { W, H, u, tall } = Lo,
    hd = Math.hypot(W, H) / 2,
    M = 640 * u;

  // ---- stages: where the kid stands in each kind of shot (kid space is 1 = 1 px at 1080)
  type Stage = { x: number; y: number; s: number };
  const MED: Stage = tall ? { x: W / 2, y: 800 * u, s: 1.75 * u } : { x: 0.4 * W, y: 560 * u, s: 1.3 * u },
    CLOSE: Stage = tall ? { x: W / 2, y: 850 * u, s: 2.6 * u } : { x: W / 2, y: 575 * u, s: 2.2 * u },
    MONTS: Stage = tall ? { x: W / 2, y: 1132 * u, s: 1.4 * u } : { x: W / 2, y: 580 * u, s: 0.84 * u };
  const P_MED = tall ? { gy: 250, gr: 150, arm: 140 } : { gy: 200, gr: 118, arm: 112 },
    P_CLOSE = tall ? { gy: 175, gr: 123, arm: 100 } : { gy: 125, gr: 110, arm: 92 },
    // overhead: the glass big enough to read its foretold world, its base clear of the pom-pom
    P_UP = { gy: -470, gr: 130, arm: 232 };
  // the end framing: the globe on screen, and the title under it
  const END = tall ? { x: W / 2, y: 760 * u, r: 330 * u } : { x: W / 2, y: 430 * u, r: 235 * u };

  // ---- the worlds: one function each, drawn in the frame's own coordinates, reaching past its edges (the globe
  // shows them through a circle wider than the frame's box). Pass "under" draws the ink underdrawing.
  const sky = (g: G, y: number, col: string, seed: number) =>
    shape(g, rect(-M, -M, W + 2 * M, y + M), col, 0, seed, { hairs: 0, amp: 2 });
  const ground = (g: G, y: number, col: string, seed: number, ang = 0) =>
    shape(g, rect(-M, y, W + 2 * M, H + M - y + M * 0.4), col, ang, seed, { hairs: 0, amp: 2 });
  const stars = (g: G, n: number, seed: number, yMax: number) => {
    for (let i = 0; i < n; i++) {
      const x = -M * 0.5 + hash(seed + i) * (W + M),
        y = -M * 0.4 + hash(seed + 99 + i) * (yMax + M * 0.4),
        r = (3 + 4 * hash(seed + 199 + i)) * u;
      shape(g, ell(x, y, r, r * 0.8, 8, hash(seed + i * 3)), C.surface, 0, seed + i, {
        hairs: 0,
        tex: false,
        amp: 0.6,
      });
    }
  };
  const house = (
    g: G,
    x: number,
    base: number,
    w: number,
    h: number,
    wall: string,
    roof: string,
    lit: string,
    seed: number,
    door?: string,
  ) => {
    shape(g, rect(x, base - h, w, h + 6 * u), wall, Math.PI / 2, seed, { shade: [0.2 * w, 0], hairs: 5 });
    const ry = base - h;
    shape(
      g,
      [
        [x - 8 * u, ry + 4 * u],
        [x + w / 2, ry - 0.5 * w],
        [x + w + 8 * u, ry + 4 * u],
      ],
      roof,
      -0.5,
      seed + 1,
      { shade: [0.18 * w, 0], hairs: 6 },
    );
    ink(
      g,
      [
        [x - 4 * u, ry + 2 * u],
        [x + w / 2, ry - 0.5 * w],
        [x + w + 6 * u, ry + 2 * u],
      ],
      5,
      seed + 2,
    );
    const rows = Math.max(1, Math.floor((h - 140 * u) / (100 * u)));
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < 2; c++)
        shape(
          g,
          rect(x + w * (0.18 + 0.4 * c), ry + 50 * u + r * 100 * u, w * 0.24, 50 * u),
          lit,
          Math.PI / 2,
          seed + 10 + r * 2 + c,
          {
            hairs: 0,
            amp: 1.2,
          },
        );
    if (door) {
      shape(g, rect(x + w * 0.34, base - 96 * u, w * 0.32, 96 * u), door, Math.PI / 2, seed + 30, {
        hairs: 0,
        shade: [0.08 * w, 0],
      });
      ink(
        g,
        [
          [x + w * 0.66, base - 96 * u],
          [x + w * 0.66, base],
        ],
        4,
        seed + 31,
      );
    }
    ink(
      g,
      [
        [x + w, ry + 6 * u],
        [x + w + 1 * u, base],
      ],
      5,
      seed + 3,
    );
  };

  const home = (g: G, T: number, v: number) => {
    const hz = (tall ? 0.63 : 0.66) * H;
    sky(g, hz, v ? mix(C.s5, C.s4, 0.3) : mix(C.s4, C.muted, 0.45), 11);
    if (v) {
      shape(g, rect(-M, hz - 0.34 * H, W + 2 * M, 0.34 * H), mix(C.s4, C.s7, 0.4), 0.02, 12, { hairs: 14, amp: 5 });
      shape(g, rect(-M, hz - 0.17 * H, W + 2 * M, 0.17 * H), mix(C.s6, C.s7, 0.3), -0.02, 13, { hairs: 14, amp: 5 });
    }
    const cols = [mix(C.s4, C.s5, 0.3), mix(C.s4, C.muted, 0.35), mix(C.s4, C.surface, 0.12), mix(C.s5, C.s4, 0.55)];
    let x = -M * 0.6,
      i = 0;
    while (x < W + M * 0.6) {
      const w = ((tall ? 150 : 130) + 70 * hash(i + 3)) * u,
        h = (340 + 260 * hash(i + 50)) * u * (tall ? 1.3 : 1);
      house(
        g,
        x,
        hz,
        w,
        h,
        cols[i % 4]!,
        mix(C.s5, C.ink, 0.25),
        v ? C.s1 : mix(C.s5, C.ink, 0.3),
        1000 + i * 40,
        mix(C.s5, C.ink, 0.2),
      );
      x += w + 6 * u;
      i++;
    }
    ground(g, hz, mix(C.muted, C.s5, 0.3), 30);
    shape(g, rect(-M, hz, W + 2 * M, 22 * u), mix(C.line, C.s4, 0.55), 0, 31, { hairs: 0, amp: 2 });
    if (v)
      for (let k = 0; k < 6; k++) {
        const px = (0.08 + 0.18 * k) * W,
          py = hz + (0.12 + 0.18 * hash(k + 7)) * (H - hz) + 30 * u;
        shape(g, ell(px, py, (90 + 60 * hash(k)) * u, 16 * u, 22), mix(C.s5, C.s4, 0.35), 0, 40 + k, { hairs: 4 });
        stroke(
          g,
          [
            [px - 30 * u, py],
            [px + 34 * u, py + 1 * u],
          ],
          7,
          50 + k,
          C.s1,
          0.9,
        );
      }
    else if (paints(g)) {
      // drizzle: dry-brush dashes on a seeded grid at 15°, falling 26 px per painted frame
      const { ctx } = g,
        sn = Math.sin(0.26),
        cs = Math.cos(0.26);
      ctx.save();
      ctx.strokeStyle = rgba(C.surface, 0.35);
      ctx.lineWidth = 1.5 * u;
      ctx.lineCap = "round";
      ctx.beginPath();
      for (let k = 0; k < 240; k++) {
        const len = (30 + 30 * hash(k + 400)) * u,
          d = 26 * u * T,
          y = mod(hash(k + 500) * H + d * cs, H + 120 * u) - 60 * u,
          xx = mod(hash(k + 600) * W - d * sn, W + 80 * u) - 40 * u;
        ctx.moveTo(xx, y);
        ctx.lineTo(xx - sn * len, y + cs * len);
      }
      ctx.stroke();
      ctx.restore();
    }
  };

  const sea = (g: G, T: number) => {
    const hz = (tall ? 0.46 : 0.52) * H;
    sky(g, hz, mix(C.accent2, C.surface, 0.72), 101);
    for (let k = 0; k < 4; k++) {
      const cx = (0.12 + 0.26 * k) * W + 8 * u * Math.sin(T / 40 + k),
        cy = (tall ? 0.12 + 0.07 * k : 0.14 + 0.05 * (k % 2)) * H;
      shape(g, ell(cx, cy, (110 + 40 * hash(k + 9)) * u, 30 * u, 24), C.surface, 0, 110 + k, {
        shade: [0, 10 * u],
        hairs: 10,
      });
    }
    shape(g, rect(-M, hz, W + 2 * M, 40 * u), mix(C.accent2, C.surface, 0.3), 0, 120, { hairs: 0, amp: 2 });
    ground(g, hz + 34 * u, mix(C.accent2, C.s5, 0.25), 121);
    for (let k = 0; k < 34; k++) {
      const yy = hz + 60 * u + hash(k + 800) * (H - hz + 200 * u),
        xx = mod(hash(k + 900) * (W + 2 * M) - T * (2 + (yy - hz) / (160 * u)) * u, W + 2 * M) - M,
        l = (40 + 50 * hash(k + 950)) * u * (0.6 + (yy - hz) / H);
      stroke(
        g,
        [
          [xx, yy],
          [xx + l / 2, yy - 5 * u],
          [xx + l, yy],
        ],
        6,
        130 + k,
        C.surface,
        0.95,
      );
    }
    // a wooden jetty under the kid (only where the kid stands, so the glass still shows mostly sea)
    const beach = () => {
      const jy = (tall ? 0.8 : 0.83) * H,
        jx = (tall ? 0.64 : 0.6) * W,
        jq = shape(
          g,
          [
            [-M, jy],
            [jx, jy - 6 * u],
            [jx + 10 * u, H + 60 * u],
            [-M, H + 60 * u],
          ],
          C.s3,
          0,
          125,
          { shade: [0, -22 * u], hairs: 10 },
        );
      within(g, g.pass === "under" ? [] : jq, () => {
        for (let k = 1; k < 9; k++)
          ink(
            g,
            [
              [(k / 9) * jx, jy + 4 * u],
              [(k / 9) * jx + 8 * u, H + 40 * u],
            ],
            3.5,
            127 + k,
            mix(C.s3, C.ink, 0.6),
          );
      });
      ink(
        g,
        [
          [jx - 4 * u, jy - 2 * u],
          [jx + 10 * u, H + 40 * u],
        ],
        7,
        126,
      );
      for (const f of [0.2, 0.55, 0.9])
        shape(
          g,
          rect(f * jx - 14 * u, jy + 10 * u, 28 * u, 0.3 * H),
          mix(C.s3, C.ink, 0.35),
          Math.PI / 2,
          140 + f * 10,
          { hairs: 0 },
        );
    };
    // the lighthouse on its rock
    const lx = (tall ? 0.64 : 0.7) * W,
      base = hz + 26 * u,
      th = (tall ? 820 : 450) * u,
      bw = (tall ? 150 : 124) * u,
      tw = (tall ? 100 : 84) * u;
    shape(g, ell(lx, hz + 36 * u, 200 * u, 56 * u, 26), mix(C.muted, C.s5, 0.45), 0.1, 140, {
      shade: [36 * u, 12 * u],
    });
    ink(g, arcPts(lx, hz + 36 * u, 202 * u, 58 * u, -0.3, 2.2, 16), 6, 141);
    const tower: Pt[] = [
      [lx - bw / 2, base],
      [lx - tw / 2, base - th],
      [lx + tw / 2, base - th],
      [lx + bw / 2, base],
    ];
    const tq = shape(g, tower, C.surface, Math.PI / 2, 142, { shade: [bw * 0.3, 0], hairs: 6 });
    within(g, g.pass === "under" ? [] : tq, () => {
      for (let k = 0; k < 3; k++)
        shape(g, rect(lx - 200 * u, base - th * (0.2 + 0.28 * k), 400 * u, th * 0.13), C.accent, 0.08, 143 + k, {
          shade: [bw * 0.3, 0],
          hairs: 0,
        });
    });
    shape(g, rect(lx - tw * 0.78, base - th - 18 * u, tw * 1.56, 18 * u), mix(C.ink, C.s5, 0.3), 0, 150, { hairs: 0 });
    shape(g, rect(lx - tw * 0.42, base - th - 76 * u, tw * 0.84, 58 * u), C.s1, 0, 151, {
      hairs: 0,
      shade: [tw * 0.2, 0],
    });
    shape(
      g,
      [
        [lx - tw * 0.6, base - th - 74 * u],
        [lx, base - th - 136 * u],
        [lx + tw * 0.6, base - th - 74 * u],
      ],
      C.accent,
      -0.4,
      152,
      { shade: [tw * 0.25, 0], hairs: 6 },
    );
    ink(
      g,
      [
        [lx + tw / 2, base - th + 4 * u],
        [lx + bw / 2, base - 4 * u],
      ],
      8,
      153,
    );
    ink(
      g,
      [
        [lx - tw * 0.8, base - th - 20 * u],
        [lx + tw * 0.8, base - th - 18 * u],
      ],
      5,
      154,
    );
    for (const f of [-0.15, 0.15])
      ink(
        g,
        [
          [lx + tw * f, base - th - 74 * u],
          [lx + tw * f, base - th - 20 * u],
        ],
        3.5,
        155 + f * 10,
      );
    // gulls: ink ticks
    for (let k = 0; k < 4; k++) {
      const gx = mod(hash(k + 70) * W + T * 2.2 * u, W + 400 * u) - 200 * u,
        gy = (0.12 + 0.18 * hash(k + 71)) * hz + 10 * u * Math.sin(T / 9 + k),
        f = 12 * u * Math.sin(T * 0.55 + k * 2),
        s = (1 - 0.3 * hash(k + 72)) * u;
      ink(
        g,
        [
          [gx - 26 * s, gy - f],
          [gx - 8 * s, gy - 2 * s],
          [gx, gy + 5 * s],
          [gx + 8 * s, gy - 2 * s],
          [gx + 26 * s, gy - f],
        ],
        5,
        160 + k,
      );
    }
    beach();
  };

  const dunes = (g: G, T: number) => {
    sky(g, 0.62 * H, mix(C.s1, C.surface, 0.62), 201);
    const sy = (tall ? 0.22 : 0.3) * H;
    shape(g, ell(0.7 * W, sy, 120 * u, 120 * u, 36), C.surface, -0.3, 202, { hairs: 0 });
    ink(g, arcPts(0.7 * W, sy, 124 * u, 124 * u, -0.3, 1.9, 16), 5, 203);
    const ys = tall ? [0.42, 0.53, 0.65, 0.79] : [0.5, 0.59, 0.7, 0.82],
      cols = [mix(C.s1, C.s3, 0.1), C.s1, mix(C.s1, C.s3, 0.35), mix(C.s3, C.s1, 0.3)];
    ys.forEach((y0, i) => {
      const pts: Pt[] = [],
        A = (70 + 30 * i) * u,
        f = (0.0023 + 0.0006 * i) / u,
        ph = i * 1.9 + T * 0.004 * (i + 1);
      for (let x = -M; x <= W + M; x += 40 * u) pts.push([x, y0 * H - A * (0.5 + 0.5 * Math.sin(x * f + ph))]);
      pts.push([W + M, H + M], [-M, H + M]);
      shape(g, pts, cols[i]!, i % 2 ? 0.12 : -0.12, 210 + i, { shade: [44 * u, 16 * u], hairs: 0 });
      if (i >= 2) ink(g, pts.slice(Math.floor(pts.length * 0.3), Math.floor(pts.length * 0.55)), 5, 220 + i);
    });
    for (let k = 0; k < 7; k++) {
      const x = (0.1 + 0.12 * k) * W,
        y = ys[3]! * H + (40 + 30 * hash(k + 5)) * u;
      ink(
        g,
        [
          [x, y],
          [x + 30 * u, y - 6 * u],
          [x + 60 * u, y],
        ],
        3.5,
        230 + k,
      );
    }
  };

  const jungle = (g: G, T: number) => {
    sky(g, H + M * 0.5, mix(C.s2, C.s5, 0.5), 301);
    const rows = tall ? 5 : 3,
      cols = [mix(C.s2, C.s5, 0.25), C.s2, mix(C.s2, C.s1, 0.25), mix(C.s2, C.surface, 0.18)];
    for (let r = 0; r < rows; r++) {
      const fy = (tall ? 0.22 + 0.17 * r : 0.38 + 0.3 * r) * H,
        n = tall ? 4 : 6,
        fr = (tall ? 250 : 230) * u * (0.8 + 0.12 * r);
      for (let i = 0; i < n; i++) {
        const fx = ((i + 0.5 * (r % 2)) / (n - 1)) * W * 1.1 - 0.05 * W,
          lobes = 5,
          sw = 0.05 * Math.sin(T / 10 + i + r);
        for (let j = 0; j < lobes; j++) {
          const a = -Math.PI + 0.35 + (j / (lobes - 1)) * (Math.PI - 0.7) + sw,
            cx = fx + Math.cos(a) * fr * 0.52,
            cy = fy + Math.sin(a) * fr * 0.52,
            c = cols[(r + j + i) % 4]!;
          shape(
            g,
            ell(cx, cy, fr * 0.54, fr * 0.13, 20, a),
            r < rows - 1 ? mix(c, C.s5, 0.25) : c,
            a,
            310 + r * 100 + i * 10 + j,
            {
              hairs: 4,
              shade: [0, 6 * u],
            },
          );
          if (j % 2 === 0)
            ink(
              g,
              [
                [fx + Math.cos(a) * fr * 0.1, fy + Math.sin(a) * fr * 0.1],
                [fx + Math.cos(a) * fr * 0.9, fy + Math.sin(a) * fr * 0.9],
              ],
              3.5,
              360 + r * 100 + i * 10 + j,
            );
        }
      }
    }
    for (let k = 0; k < 5; k++) {
      const x = (0.1 + 0.2 * k) * W,
        y = (tall ? 0.3 + 0.14 * k : 0.45 + 0.1 * (k % 3)) * H;
      shape(g, ell(x, y, 22 * u, 16 * u, 16), k % 2 ? C.accent : C.s1, 0, 390 + k, { hairs: 0, shade: [5 * u, 4 * u] });
    }
  };

  const pines = (g: G, T: number) => {
    const gy = (tall ? 0.68 : 0.7) * H;
    sky(g, gy, C.s5, 401);
    stars(g, 34, 402, gy * 0.8);
    shape(
      g,
      [
        [-M, gy],
        [0.2 * W, gy - 120 * u],
        [0.55 * W, gy - 60 * u],
        [0.85 * W, gy - 150 * u],
        [W + M, gy - 40 * u],
        [W + M, H + M],
        [-M, H + M],
      ],
      mix(C.s4, C.surface, 0.45),
      0,
      403,
      { hairs: 0, shade: [30 * u, 10 * u] },
    );
    ground(g, gy, C.surface, 404);
    const tree = (x: number, y: number, h: number, col: string, seed: number) => {
      shape(g, rect(x - 0.05 * h, y - 0.12 * h, 0.1 * h, 0.14 * h), mix(C.s3, C.ink, 0.4), Math.PI / 2, seed, {
        hairs: 0,
      });
      for (let t = 0; t < 3; t++) {
        const ty = y - 0.1 * h - t * 0.26 * h,
          tw = (0.36 - 0.08 * t) * h;
        shape(
          g,
          [
            [x - tw, ty],
            [x, ty - 0.42 * h],
            [x + tw, ty],
          ],
          col,
          Math.PI / 2,
          seed + 1 + t,
          { shade: [0.2 * tw, 0], hairs: 4 },
        );
        shape(
          g,
          [
            [x - tw * 0.95, ty - 2 * u],
            [x - tw * 0.2, ty - 0.2 * h],
            [x, ty - 0.1 * h],
          ],
          C.surface,
          0,
          seed + 5 + t,
          { hairs: 0 },
        );
        ink(
          g,
          [
            [x + 2 * u, ty - 0.4 * h],
            [x + tw, ty],
          ],
          4,
          seed + 9 + t,
        );
      }
    };
    for (let i = 0; i < 9; i++)
      tree(
        (i / 8) * W * 1.1 - 0.05 * W,
        gy - 20 * u,
        (170 + 60 * hash(i + 1)) * u,
        mix(C.s5, C.s2, 0.35),
        420 + i * 20,
      );
    const near = tall ? [0.18, 0.5, 0.82] : [0.12, 0.3, 0.72, 0.9];
    near.forEach((f, i) =>
      tree(f * W, gy + (60 + 40 * (i % 2)) * u, (tall ? 520 : 420) * u, mix(C.s2, C.s5, 0.35), 620 + i * 20),
    );
    for (let k = 0; k < 5; k++)
      shape(g, ell((0.1 + 0.2 * k) * W, gy + 200 * u, 120 * u, 14 * u), C.line, 0, 700 + k, { hairs: 0, tex: false });
    void T;
  };

  const reef = (g: G, T: number) => {
    sky(g, H + M, C.accent2, 501);
    shape(g, rect(-M, -M, W + 2 * M, M + 0.18 * H), mix(C.accent2, C.surface, 0.22), 0, 502, { hairs: 16, amp: 6 });
    const sb = (tall ? 0.8 : 0.78) * H;
    shape(
      g,
      [
        [-M, sb],
        [0.3 * W, sb - 40 * u],
        [0.7 * W, sb + 10 * u],
        [W + M, sb - 30 * u],
        [W + M, H + M],
        [-M, H + M],
      ],
      mix(C.s1, C.s3, 0.3),
      0,
      503,
      { shade: [0, 16 * u] },
    );
    const corals = tall ? [0.15, 0.4, 0.7, 0.9] : [0.1, 0.28, 0.6, 0.85];
    corals.forEach((f, i) => {
      const x = f * W,
        c = i % 2 ? C.s7 : C.s3;
      for (let j = 0; j < 4; j++)
        shape(
          g,
          sbox(x + (j - 1.5) * 34 * u, sb - (60 + 50 * hash(i * 9 + j)) * u, 30 * u, (130 + 90 * hash(i * 7 + j)) * u),
          c,
          Math.PI / 2,
          510 + i * 10 + j,
          { shade: [8 * u, 0], hairs: 4 },
        );
      ink(
        g,
        [
          [x + 60 * u, sb - 160 * u],
          [x + 64 * u, sb],
        ],
        4,
        550 + i,
      );
    });
    // kelp: bands swaying (the wipe renderer, standing up)
    for (let k = 0; k < 3; k++) {
      const x0 = (0.2 + 0.33 * k) * W,
        c: Pt[] = [];
      for (let i = 0; i <= 10; i++)
        c.push([x0 + 30 * u * Math.sin(i * 0.6 - T * 0.12 + k) * (i / 10), sb - i * (tall ? 70 : 42) * u]);
      shape(
        g,
        band(c, (s) => 34 * u * (1 - 0.5 * s), 560 + k, 2 * u, 12 * u),
        C.s2,
        -Math.PI / 2,
        561 + k,
        { hairs: 0, shade: [6 * u, 0] },
      );
    }
    for (let k = 0; k < 6; k++) {
      const dir = k % 2 ? -1 : 1,
        x = mod(hash(k + 30) * W + dir * T * 3 * u, W + 300 * u) - 150 * u,
        y = (tall ? 0.2 + 0.1 * k : 0.25 + 0.08 * k) * H,
        s = (0.8 + 0.4 * hash(k + 31)) * u;
      shape(g, ell(x, y, 52 * s, 24 * s, 20), C.accent, 0, 570 + k, { shade: [0, 7 * s], hairs: 0 });
      shape(
        g,
        [
          [x - dir * 44 * s, y],
          [x - dir * 84 * s, y - 24 * s],
          [x - dir * 80 * s, y + 24 * s],
        ],
        C.accent,
        0,
        580 + k,
        { hairs: 0 },
      );
      blob(g, ell(x + dir * 30 * s, y - 5 * s, 5 * s, 5 * s, 10), C.ink);
      ink(
        g,
        [
          [x + dir * 14 * s, y - 18 * s],
          [x + dir * 12 * s, y + 18 * s],
        ],
        3,
        590 + k,
      );
    }
    for (let k = 0; k < 12; k++) {
      const x = hash(k + 40) * W + 10 * u * Math.sin(T / 6 + k),
        y = mod(hash(k + 41) * H - T * 4 * u, H + 100 * u) - 50 * u,
        r = (8 + 12 * hash(k + 42)) * u;
      stroke(g, arcPts(x, y, r, r, 0.3, 5.9, 14), 3, 600 + k, C.surface, 0.9);
    }
  };

  const roofs = (g: G, T: number) => {
    sky(g, H + M, mix(C.s5, C.deep, 0.35), 601);
    stars(g, 26, 602, H * 0.4);
    shape(g, ell(0.18 * W, (tall ? 0.1 : 0.16) * H, 50 * u, 50 * u, 24), C.s1, 0, 603, { hairs: 0 });
    const rows = tall ? 6 : 3;
    for (let r = 0; r < rows; r++) {
      const base = (tall ? 0.36 + 0.13 * r : 0.5 + 0.22 * r) * H + (tall ? 0 : 0),
        col = mix(mix(C.s5, C.deep, 0.15 + 0.12 * r), C.s4, 0.08),
        n = tall ? 4 : 7;
      for (let i = 0; i < n; i++) {
        const w = ((tall ? 230 : 250) + 60 * hash(r * 13 + i)) * u,
          x = (i / n) * (W + 200 * u) - 100 * u + (r % 2) * 60 * u + (tall ? r * 20 * u : 0),
          h = (140 + 120 * hash(r * 17 + i)) * u,
          y = base - (tall ? i * 30 * u : 0);
        shape(
          g,
          [
            [x, y + H],
            [x, y - h],
            [x + w * 0.5, y - h - 0.35 * w],
            [x + w, y - h],
            [x + w, y + H],
          ],
          col,
          Math.PI / 2,
          610 + r * 20 + i,
          { shade: [0.15 * w, 0], hairs: 4 },
        );
        shape(g, rect(x + w * 0.7, y - h - 0.35 * w, 24 * u, 70 * u), col, Math.PI / 2, 650 + r * 20 + i, { hairs: 0 });
        ink(
          g,
          [
            [x - 4 * u, y - h + 2 * u],
            [x + w * 0.5, y - h - 0.35 * w],
            [x + w + 4 * u, y - h + 2 * u],
          ],
          5,
          680 + r * 20 + i,
        );
        for (let k = 0; k < 4; k++)
          if (hash(r * 100 + i * 10 + k) < 0.55)
            shape(
              g,
              rect(x + w * (0.16 + 0.2 * k), y - h + 40 * u + 44 * u * (k % 2), 30 * u, 36 * u),
              C.s1,
              Math.PI / 2,
              700 + r * 50 + i * 5 + k,
              { hairs: 0, amp: 1 },
            );
      }
    }
    void T;
  };

  const moon = (g: G, T: number) => {
    sky(g, H + M, mix(C.deep, C.s5, 0.3), 701);
    stars(g, 40, 702, H);
    const pl: Pt = tall ? [0.3 * W, 0.64 * H] : [0.76 * W, 0.3 * H],
      pr = (tall ? 120 : 130) * u,
      ring = (a0: number, a1: number, seed: number) =>
        shape(
          g,
          band(arcPts(pl[0], pl[1], pr * 1.8, pr * 0.42, a0, a1, 24), () => 22 * u, seed, 1.5 * u, 0),
          C.s1,
          0,
          seed + 1,
          { hairs: 0 },
        );
    ring(Math.PI, Math.PI * 2, 703);
    const pq = shape(g, ell(pl[0], pl[1], pr, pr, 32), C.s3, 0.2, 705, { shade: [pr * 0.3, pr * 0.2] });
    within(g, g.pass === "under" ? [] : pq, () =>
      shape(g, rect(pl[0] - 2 * pr, pl[1] - 0.2 * pr, 4 * pr, 0.3 * pr), C.s7, 0.2, 706, { hairs: 0 }),
    );
    ring(0, Math.PI, 707);
    ink(g, arcPts(pl[0], pl[1], pr + 2 * u, pr + 2 * u, -0.6, 1.8, 14), 5, 709);
    const mc: Pt = tall ? [0.56 * W, 0.26 * H] : [0.32 * W, 1.62 * H],
      mr = tall ? 380 * u : 0.95 * H;
    const mq = shape(g, ell(mc[0], mc[1], mr, mr, 64), mix(C.line, C.muted, 0.35), -0.3, 710, {
      shade: [mr * 0.12, mr * 0.08],
    });
    ink(g, arcPts(mc[0], mc[1], mr + 3 * u, mr + 3 * u, tall ? -0.7 : -1.6, tall ? 2 : -0.4, 30), 7, 711);
    within(g, g.pass === "under" ? [] : mq, () => {
      for (let k = 0; k < 7; k++) {
        const a = -Math.PI / 2 + (tall ? (k - 3) * 0.55 : (k - 3) * 0.22),
          d = mr * (tall ? 0.3 + 0.4 * hash(k + 5) : 0.9 + 0.06 * hash(k)),
          cx = mc[0] + Math.cos(a) * d,
          cy = mc[1] + Math.sin(a) * d,
          r = (26 + 40 * hash(k + 9)) * u;
        shape(g, ell(cx, cy, r, r * 0.6, 20), mix(C.muted, C.line, 0.3), 0, 720 + k, {
          shade: [-r * 0.25, -r * 0.2],
          hairs: 0,
        });
        ink(g, arcPts(cx, cy, r, r * 0.6, 3.2, 5.6, 10), 3.5, 740 + k);
      }
    });
    void T;
  };

  const balloons = (g: G, T: number) => {
    const hz = (tall ? 0.62 : 0.58) * H;
    sky(g, hz, mix(C.s4, C.surface, 0.55), 801);
    shape(g, ell(0.2 * W, 0.2 * H, 140 * u, 30 * u), C.surface, 0, 802, { shade: [0, 8 * u], hairs: 8 });
    const vp: Pt = [W / 2, hz - 300 * u],
      cols = [C.s2, mix(C.s2, C.s1, 0.45), C.s1, mix(C.s3, C.s1, 0.45), mix(C.s2, C.surface, 0.25)],
      ys = [hz, hz + 0.06 * H, hz + 0.14 * H, hz + 0.26 * H, hz + 0.44 * H, H + M];
    for (let r = 0; r < 5; r++)
      for (let c = -6; c < 6; c++) {
        const xAt = (y: number, k: number) => vp[0] + (k * 260 * u * (y - vp[1])) / (hz - vp[1]),
          y0 = ys[r]!,
          y1 = ys[r + 1]!;
        shape(
          g,
          [
            [xAt(y0, c), y0],
            [xAt(y0, c + 1), y0],
            [xAt(y1, c + 1), y1],
            [xAt(y1, c), y1],
          ],
          cols[mod(r * 3 + c, 5)]!,
          (c + 0.5) * 0.18 + Math.PI / 2,
          810 + r * 20 + c + 6,
          { hairs: 3 },
        );
      }
    for (let r = 1; r < 4; r++)
      ink(
        g,
        [
          [-50 * u, ys[r]!],
          [W / 2, ys[r]! + 3 * u],
          [W + 50 * u, ys[r]!],
        ],
        3.5,
        950 + r,
      );
    const bl: [number, number, number, string, string][] = tall
      ? [
          [0.3, 0.2, 1.2, C.accent, C.surface],
          [0.72, 0.34, 0.9, C.s1, C.accent2],
          [0.45, 0.48, 0.6, C.s2, C.surface],
        ]
      : [
          [0.22, 0.3, 0.9, C.accent, C.surface],
          [0.62, 0.22, 1.1, C.s1, C.accent2],
          [0.85, 0.42, 0.6, C.s2, C.surface],
        ];
    bl.forEach(([fx, fy, s, a, b], i) => {
      const x = fx * W,
        y = fy * H + 10 * u * Math.sin(T / 9 + i * 2),
        r = 110 * u * s,
        env: Pt[] = [];
      for (let k = 0; k < 28; k++) {
        const t = (k / 28) * Math.PI * 2,
          st = Math.sin(t);
        env.push([x + Math.cos(t) * r * (st > 0 ? 1 - 0.55 * st * st : 1), y + st * r * (st > 0 ? 1.35 : 1)]);
      }
      const eq = shape(g, env, a, Math.PI / 2, 960 + i * 10, { shade: [r * 0.25, 0], hairs: 0 });
      within(g, g.pass === "under" ? [] : eq, () => {
        for (let k = -2; k <= 2; k += 2)
          shape(g, rect(x + (k - 0.5) * r * 0.36, y - r * 1.4, r * 0.36, r * 3), b, Math.PI / 2, 961 + i * 10 + k, {
            hairs: 0,
            shade: [r * 0.25, 0],
          });
      });
      ink(g, arcPts(x, y, r + 2 * u, r + 2 * u, -1.2, 0.9, 14), 5, 970 + i);
      const by = y + r * 1.35 + 40 * u * s;
      ink(
        g,
        [
          [x - r * 0.4, y + r * 1.05],
          [x - 16 * u * s, by],
        ],
        2.5,
        975 + i,
      );
      ink(
        g,
        [
          [x + r * 0.4, y + r * 1.05],
          [x + 16 * u * s, by],
        ],
        2.5,
        978 + i,
      );
      shape(g, rect(x - 22 * u * s, by, 44 * u * s, 30 * u * s), C.s3, Math.PI / 2, 980 + i, { hairs: 0 });
    });
  };

  const village = (g: G, T: number, v: number, withSky = true, jolt = 0) => {
    const gy = (tall ? 0.76 : 0.72) * H;
    if (withSky) {
      sky(g, gy, v ? C.s5 : mix(C.s4, C.surface, 0.45), 1101);
      if (v) stars(g, 30, 1102, gy * 0.7);
    }
    g.ctx.save();
    g.ctx.translate(0, jolt);
    shape(
      g,
      [
        [-M, gy + 10 * u],
        [0.25 * W, gy - 90 * u],
        [0.6 * W, gy - 40 * u],
        [0.9 * W, gy - 110 * u],
        [W + M, gy - 20 * u],
        [W + M, H + M],
        [-M, H + M],
      ],
      v ? mix(C.s4, C.s5, 0.5) : mix(C.surface, C.s4, 0.3),
      0,
      1103,
      { hairs: 0, shade: [30 * u, 10 * u] },
    );
    ground(g, gy, v ? mix(C.surface, C.s4, 0.25) : C.surface, 1104);
    shape(
      g,
      ell(W / 2, gy + (H - gy) * 0.45, (tall ? 0.42 : 0.3) * W, (H - gy) * 0.28, 40),
      v ? mix(C.line, C.s4, 0.45) : mix(C.line, C.surface, 0.35),
      0,
      1105,
      { hairs: 0 },
    );
    ink(g, arcPts(W / 2, gy + (H - gy) * 0.45, (tall ? 0.42 : 0.3) * W, (H - gy) * 0.28, -0.3, 2.9, 30), 4, 1106);
    const xs = tall ? [0.1, 0.33, 0.56] : [0.1, 0.2, 0.3],
      hw = (tall ? 200 : 160) * u,
      hs = [320, 390, 340].map((h) => h * u * (tall ? 1.2 : 1)),
      walls = [mix(C.s6, C.surface, 0.35), mix(C.s4, C.surface, 0.3), mix(C.s1, C.surface, 0.55)],
      doors = [C.accent, C.s1, C.s2];
    xs.forEach((f, i) => {
      const x = f * W;
      house(
        g,
        x,
        gy + 4 * u,
        hw,
        hs[i]!,
        v ? mix(walls[i]!, C.s5, 0.35) : walls[i]!,
        i === 1 ? C.s3 : C.s5,
        v ? C.s1 : mix(C.s5, C.ink, 0.3),
        1200 + i * 60,
        doors[i],
      );
      shape(
        g,
        [
          [x - 8 * u, hs[i]! * -1 + gy + 8 * u],
          [x + hw / 2, gy - hs[i]! - 0.5 * hw + 6 * u],
          [x + hw * 0.3, gy - hs[i]! - 0.2 * hw],
        ],
        C.surface,
        0,
        1240 + i,
        { hairs: 0 },
      );
    });
    const tx = (tall ? 0.84 : 0.8) * W,
      tr = (tall ? 150 : 130) * u;
    shape(g, rect(tx - 16 * u, gy - 1.3 * tr, 32 * u, 1.3 * tr + 8 * u), mix(C.s3, C.ink, 0.35), Math.PI / 2, 1300, {
      hairs: 0,
    });
    shape(g, ell(tx, gy - 1.5 * tr, tr, tr * 1.05, 30), v ? mix(C.s2, C.s5, 0.35) : C.s2, -0.6, 1301, {
      shade: [tr * 0.3, tr * 0.2],
    });
    shape(g, ell(tx - tr * 0.2, gy - 2.25 * tr, tr * 0.6, tr * 0.2, 20), C.surface, 0, 1302, { hairs: 0 });
    ink(g, arcPts(tx, gy - 1.5 * tr, tr + 3 * u, tr * 1.05 + 3 * u, -0.6, 2.2, 16), 5, 1303);
    for (let k = 0; k < 9; k++) {
      const x = (0.35 + 0.05 * k) * W,
        y = gy + (40 + 60 * hash(k + 3)) * u;
      ink(
        g,
        [
          [x, y],
          [x + 18 * u, y + 1 * u],
        ],
        3,
        1310 + k,
      );
    }
    g.ctx.restore();
    void T;
  };

  // the inside of the globe: the little village under a huge curved glass, the giant kid peering in, fish-eyed
  const ARC = tall ? { x: W / 2, y: 1700 * u, r: 1600 * u } : { x: W / 2, y: 1560 * u, r: 1510 * u },
    FACE = tall ? { x: W / 2, y: 620 * u, r: 520 * u } : { x: W / 2, y: 300 * u, r: 500 * u };
  const fish =
    (sf: number) =>
    (p: Pt): Pt => {
      const qx = FACE.x + sf * p[0],
        qy = FACE.y + sf * (p[1] + 72),
        dx = qx - FACE.x,
        dy = qy - FACE.y,
        d = Math.hypot(dx, dy) || 1e-6,
        d2 = FACE.r * Math.sin((Math.PI * Math.min(d, FACE.r)) / (2 * FACE.r));
      return [FACE.x + (dx * d2) / d, FACE.y + (dy * d2) / d];
    };
  const inside = (g: G, T: number) => {
    shape(g, rect(-M, -M, W + 2 * M, H + 2 * M), mix(C.s5, C.deep, 0.35), 0.3, 1401, { hairs: 0 });
    const gq = shape(g, ell(ARC.x, ARC.y, ARC.r, ARC.r, 90), mix(C.s4, C.surface, 0.45), 0, 1402, { hairs: 0 });
    within(g, g.pass === "under" ? [] : gq, () => {
      const sf = FACE.r / 165,
        gf: G = { ...g, map: fish(sf), k: sf * 0.6 };
      head(
        gf,
        T,
        {
          ...POSE,
          eyes: 1.2 + 0.3 * spring((T - 408) / FPS, { freq: 2.4, damp: 0.5 }),
          puff: T >= 408 && T < 432 ? 0.8 : 0,
          blink: T >= 456 && T < 460 ? 1 : 0,
          mouth: 2,
        },
        1450,
      );
      // the giant mitten comes to tap the glass
      const tap = Math.max(0, 1 - Math.abs(T - 432) / 12);
      if (tap > 0) {
        const e = ease.outCubic(tap),
          mx = lerp(W + 380 * u, (tall ? 0.9 : 0.86) * W, e),
          my = lerp(H * 0.5, (tall ? 0.14 : 0.2) * H, e);
        shape(g, ell(mx, my, 250 * u, 200 * u, 30, -0.4), C.s1, -0.4, 1480, { shade: [40 * u, 30 * u] });
        ink(g, arcPts(mx, my, 252 * u, 202 * u, -0.4, 1.8, 14), 9, 1481);
      }
    });
    const jolt = T > 432 ? 22 * u * Math.sin((2 * Math.PI * (T - 432)) / 6) * Math.exp(-(T - 432) / 10) : 0;
    village(g, T, 0, false, jolt);
    // the curved glass horizon: a broad dry-brush highlight along the arc, the rim's ink on its shadow side
    stroke(
      g,
      arcPts(ARC.x, ARC.y, ARC.r - 50 * u, ARC.r - 50 * u, -Math.PI * 0.86, -Math.PI * 0.62, 30),
      34,
      1490,
      C.surface,
      0.7,
    );
    stroke(
      g,
      arcPts(ARC.x, ARC.y, ARC.r - 50 * u, ARC.r - 50 * u, -Math.PI * 0.3, -Math.PI * 0.22, 10),
      16,
      1491,
      C.surface,
      0.6,
    );
    ink(g, arcPts(ARC.x, ARC.y, ARC.r + 6 * u, ARC.r + 6 * u, -Math.PI * 0.58, -Math.PI * 0.08, 40), 12, 1492);
  };

  // the kid's own street, one step deep: the tiny kid holds a tiny globe that holds only snow
  const nested = (g: G, T: number) => {
    home(g, T, 1);
    kid(g, T, MED.x, MED.y, MED.s, { ...POSE, ...P_MED, cap: 1, mouth: 1, wind: 0 }, (gg, x, y, r) =>
      globe(gg, T, x, y, r, null, (g3, cx, cy, R) => {
        for (let i = 0; i < 18; i++) {
          const f = FL_GLOBE[i]!;
          flake(g3, cx + f.x0 * 0.7 * R, cy + (f.y0 - 1) * 0.7 * R, (f.r / 150) * R * 1.4, f.rot);
        }
      }),
    );
  };

  const bands = (g: G, T: number) => {
    for (let i = 0; i < 8; i++) {
      g.ctx.save();
      g.ctx.beginPath();
      g.ctx.rect(i === 0 ? -M : (i * W) / 8, -M, i === 0 ? M + W / 8 : i === 7 ? W / 8 + M : W / 8, H + 2 * M);
      g.ctx.clip();
      world(g, [SEA, ...MONT.slice(0, 7)][i]!, 0, T);
      g.ctx.restore();
    }
    for (let i = 1; i < 8; i++)
      ink(
        g,
        [
          [(i * W) / 8, -20 * u],
          [(i * W) / 8 + 2 * u, H + 20 * u],
        ],
        5,
        1500 + i,
      );
  };

  function world(g: G, k: number, v: number, T: number) {
    if (k === HOME) home(g, T, v);
    else if (k === SEA) sea(g, T);
    else if (k === DUNES) dunes(g, T);
    else if (k === JUNGLE) jungle(g, T);
    else if (k === PINES) pines(g, T);
    else if (k === REEF) reef(g, T);
    else if (k === ROOFS) roofs(g, T);
    else if (k === MOON) moon(g, T);
    else if (k === BALLOONS) balloons(g, T);
    else if (k === BANDS) bands(g, T);
    else if (k === VILLAGE) village(g, T, v);
    else if (k === INSIDE) inside(g, T);
    else if (k === NESTED) nested(g, T);
  }

  // ---- the globe: a glass circle on a wooden base; its world is the frame, mapped so the frame's half-diagonal
  // is the glass's radius (so when the glass fills the screen, the world inside IS the full frame: the match cut)
  type SnowFn = (g: G, x: number, y: number, R: number) => void;
  function globe(
    g: G,
    T: number,
    x: number,
    y: number,
    R: number,
    inner: ((g: G) => void) | null,
    snow: SnowFn,
    sweep = -1,
  ) {
    const { ctx } = g,
      bt = y + 0.8 * R,
      bb = y + 1.14 * R;
    shape(
      g,
      [
        [x - 0.66 * R, bt],
        [x + 0.66 * R, bt],
        [x + 0.78 * R, bb],
        [x - 0.78 * R, bb],
      ],
      C.s3,
      0,
      301,
      { shade: [0.18 * R, 0], hairs: 8 },
    );
    ink(
      g,
      [
        [x - 0.55 * R, (bt + bb) / 2 + 0.01 * R],
        [x, (bt + bb) / 2 - 0.012 * R],
        [x + 0.6 * R, (bt + bb) / 2 + 0.014 * R],
      ],
      (0.035 * R) / u,
      302,
      mix(C.s3, C.ink, 0.55),
    );
    ink(
      g,
      [
        [x + 0.64 * R, bt + 0.02 * R],
        [x + 0.78 * R, bb],
        [x - 0.3 * R, bb + 0.01 * R],
      ],
      (0.03 * R) / u,
      303,
    );
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, R, 0, Math.PI * 2);
    ctx.clip();
    if (inner) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(R / hd, R / hd);
      ctx.translate(-W / 2, -H / 2);
      inner(g);
      ctx.restore();
    } else {
      ctx.fillStyle = mix(C.s4, C.surface, 0.4);
      ctx.fillRect(x - R, y - R, 2 * R, 2 * R);
    }
    snow(g, x, y, R);
    if (sweep >= 0 && sweep <= 1) {
      const sx = x + lerp(-1.4, 1.4, sweep) * R;
      stroke(
        g,
        [
          [sx - 0.5 * R, y + 1.1 * R],
          [sx + 0.5 * R, y - 1.1 * R],
        ],
        (0.16 * R) / u,
        308,
        C.surface,
        0.55,
      );
    }
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = rgba(C.surface, 0.5);
    ctx.lineWidth = 0.022 * R;
    ctx.beginPath();
    ctx.arc(x, y, R, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    ink(g, arcPts(x, y, R * 1.006, R * 1.006, -0.75, 3.4, 40), (0.045 * R) / u, 304);
    stroke(g, arcPts(x, y, 0.8 * R, 0.8 * R, 3.4, 4.55, 24), (0.11 * R) / u, 305, C.surface, 0.7);
    stroke(g, arcPts(x, y, 0.8 * R, 0.8 * R, 0.3, 0.72, 10), (0.05 * R) / u, 306, C.surface, 0.6);
  }
  // cap: as the glass grows past a close-up toward the match cut, its flakes shrink toward the frame snow's size, so
  // the cut through the glass keeps the same snow (no pop from 15-44 px flakes to 3-8 px ones)
  const globeSnow =
    (shakes: number[], T: number, cap = false): SnowFn =>
    (g, x, y, R) => {
      const k = g.ctx.getTransform().a / g.env.scale,
        Rs = R * k,
        t = clamp((Rs - 300 * u) / (hd - 300 * u));
      for (const f of FL_GLOBE) {
        const [fx, fy] = flakeAt(f, T, shakes);
        const r = cap ? (f.r * lerp(Rs / 150, 1.4 * u, t)) / k : (f.r / 150) * R;
        if (fx * fx + fy * fy < 0.9) flake(g, x + fx * R, y + fy * R, r, f.rot + T * 0.02);
      }
    };
  // at the end the snow settles over the tiny street; flake i lands at t_i, the last at exactly 708
  const settleSnow =
    (T: number): SnowFn =>
    (g, x, y, R) => {
      const hz = ((tall ? 0.63 : 0.66) * H - H / 2) / hd,
        n = 90;
      for (let i = 0; i < n; i++) {
        const f = FL_GLOBE[i]!,
          ti = 628 + 80 * ((i + 1) / n) ** 0.85,
          yg = hz + 0.04 + 0.5 * hash(i + 3),
          fx = f.x0 * 0.8 + f.A * Math.sin(f.w * Math.min(T, ti) + f.ph),
          fy = yg - 0.02 * Math.max(0, ti - T),
          landed = T >= ti;
        if (fx * fx + fy * fy < 0.88)
          flake(g, x + fx * R, y + fy * R, (f.r / 150) * R * (landed ? 1.1 : 1), landed ? 0 : f.rot + T * 0.02);
      }
    };
  const frameSnow = (g: G, T: number, shakes: number[], big: number) => {
    for (const f of FL_FRAME) {
      let x = ((f.x0 + 1) / 2) * W + f.A * W * 0.3 * Math.sin(f.w * T + f.ph),
        y = mod((f.y0 / 2) * (H + 80 * u) + f.v * T * H * 0.35, H + 80 * u) - 40 * u,
        th = 0;
      for (const tk of shakes) {
        if (T <= tk) continue;
        const dt = T - tk,
          o = 0.6 * H * (1 - Math.exp(-dt / 2)) * Math.exp(-dt / 18);
        x += Math.cos(f.dir) * o;
        y += Math.sin(f.dir) * o;
        th += 0.5 * (1 - Math.exp(-dt / 8)) * Math.exp(-dt / 40);
      }
      const dx = x - W / 2,
        dy = y - H / 2;
      flake(
        g,
        W / 2 + dx * Math.cos(th) - dy * Math.sin(th),
        H / 2 + dx * Math.sin(th) + dy * Math.cos(th),
        f.r * u * big,
        f.rot + T * 0.02,
      );
    }
  };

  // ---- wipes: brush ribbons that paint the next scene on
  const ribs = (f0: number, dir: 1 | -1, cols: string[], seed: number): Rib[] =>
    [0, 1, 2].map((j) => {
      const w = (tall ? 580 : 430) * u,
        bow = (j - 1) * 40 * u * dir;
      if (!tall) {
        const y = (j + 0.5) * (H / 3),
          x0 = dir > 0 ? -380 * u : W + 380 * u,
          x1 = dir > 0 ? W + 380 * u : -380 * u;
        return {
          p: [
            [x0, y - bow],
            [lerp(x0, x1, 0.33), y + 110 * u],
            [lerp(x0, x1, 0.66), y - 110 * u],
            [x1, y + bow],
          ] as Pt[],
          w,
          f0: f0 + 4 * j,
          col: cols[j]!,
          seed: seed + j,
        };
      }
      // vertical: diagonal from the top left (or right) down, three parallel bands across the tall frame
      const a = 1.26,
        d: Pt = [dir * Math.cos(a), Math.sin(a)],
        nn: Pt = [-d[1], d[0]],
        o = (j - 1) * 540 * u,
        c: Pt = [W / 2 + nn[0] * o, H / 2 + nn[1] * o],
        Lh = 1400 * u,
        p0: Pt = [c[0] - d[0] * Lh, c[1] - d[1] * Lh],
        p3: Pt = [c[0] + d[0] * Lh, c[1] + d[1] * Lh];
      return {
        p: [
          p0,
          [lerp(p0[0], p3[0], 0.33) + nn[0] * 50 * u, lerp(p0[1], p3[1], 0.33) + nn[1] * 50 * u],
          [lerp(p0[0], p3[0], 0.66) - nn[0] * 50 * u, lerp(p0[1], p3[1], 0.66) - nn[1] * 50 * u],
          p3,
        ],
        w,
        f0: f0 + 4 * j,
        col: cols[j]!,
        seed: seed + j,
      };
    });
  const RIB1 = ribs(S.repaint, 1, [C.accent2, C.surface, C.s2], 1600),
    RIB2 = ribs(S.unpaint, -1, [C.ground, C.surface, C.line], 1700),
    RIB3 = ribs(S.eve, 1, [C.s5, C.s1, C.surface], 1800);
  const ribHead = (r: Rib, T: number) => 1.55 * ease.inOutCubic(clamp((T - r.f0) / 20));
  const ribPoly = (r: Rib, a: number, b: number, tongue: boolean): Pt[] => {
    const c: Pt[] = [];
    for (let i = 0; i <= 40; i++) c.push(bz(r.p, lerp(a, b, i / 40)));
    return band(
      c,
      (s) => r.w * (1 - 0.18 * (1 - s) ** 2),
      r.seed,
      10 * u,
      tongue ? 120 * u : 0,
      tongue && a > 0 ? 160 * u : 0,
    );
  };
  /** old scene everywhere, the new one inside every ribbon swept so far, the ribbons' bodies on top */
  const wipe = (g: G, T: number, rs: Rib[], oldFn: () => void, newFn: () => void, over?: () => void) => {
    const last = rs[rs.length - 1]!;
    if (T >= last.f0 + 20) {
      newFn();
      over?.();
      return;
    }
    oldFn();
    const { ctx } = g,
      heads = rs.map((r) => ribHead(r, T));
    if (heads.some((h) => h > 0)) {
      ctx.save();
      ctx.beginPath();
      rs.forEach((r, i) => {
        const h = Math.min(1, heads[i]!);
        if (h <= 0) return;
        const q = ribPoly(r, 0, h, true);
        ctx.moveTo(q[0]![0], q[0]![1]);
        for (const p of q) ctx.lineTo(p[0], p[1]);
        ctx.closePath();
      });
      ctx.clip();
      newFn();
      ctx.restore();
    }
    over?.();
    rs.forEach((r, i) => {
      const hh = heads[i]!,
        h = Math.min(1, hh),
        tl = clamp(hh - 0.55);
      if (h <= 0 || tl >= 1) return;
      const q = ribPoly(r, tl, h, true),
        m = bz(r.p, (tl + h) / 2),
        m2 = bz(r.p, Math.min(1, (tl + h) / 2 + 0.02)),
        pg: G = { ...g, pass: "paint" };
      shape(pg, q, r.col, Math.atan2(m2[1] - m[1], m2[0] - m[0]), r.seed + 50, { hairs: 0, amp: 1 });
    });
  };

  // ---- the camera: one transform over the world
  type Cam = { s: number; fx: number; fy: number; sx: number; sy: number };
  const ID: Cam = { s: 1, fx: 0, fy: 0, sx: 0, sy: 0 };
  const apply = (ctx: Ctx, c: Cam) => {
    ctx.translate(c.sx, c.sy);
    ctx.scale(c.s, c.s);
    ctx.translate(-c.fx, -c.fy);
  };
  const camMap = (c: Cam, [x, y]: Pt): Pt => [c.sx + c.s * (x - c.fx), c.sy + c.s * (y - c.fy)];
  /** exponential zoom about the globe: scale Z^e, and the globe centre reaches its target by the time scale hits Zc */
  const zoom = (e: number, gc: Pt, Z: number, Zc: number, to: Pt = [W / 2, H / 2]): Cam => {
    const s = Z ** e,
      c = ease.inOutCubic(clamp(Math.log(s) / Math.log(Zc)));
    return { s, fx: gc[0], fy: gc[1], sx: lerp(gc[0], to[0], c), sy: lerp(gc[1], to[1], c) };
  };
  // holds: a slow push (continuous through every non-cut boundary) and a 2 px drift, so no painting is frozen
  const holdZ = (T: number, F: number) =>
    F < S.close
      ? 1 + 0.03 * (T / 192)
      : F < S.montage
        ? 1 + 0.03 * ((T - 192) / 48)
        : F < S.inside
          ? 1 + 0.03 * Math.min(1, (T - 240) / 96)
          : F < S.out
            ? 1 + 0.04 * ((T - 384) / 168)
            : 1.04 + 0.05 * ((T - 552) / 168);
  const hold = (ctx: Ctx, T: number, F: number) => {
    const z = holdZ(T, F);
    ctx.translate(W / 2 + 2 * u * Math.sin(T / 13), H / 2 + 2 * u * Math.cos(T / 17));
    ctx.scale(z, z);
    ctx.translate(-W / 2, -H / 2);
  };
  const holdMap = (T: number, F: number, [x, y]: Pt): Pt => {
    const z = holdZ(T, F);
    return [W / 2 + 2 * u * Math.sin(T / 13) + z * (x - W / 2), H / 2 + 2 * u * Math.cos(T / 17) + z * (y - H / 2)];
  };

  // ---- poses through the film
  const decay = (T: number, t: number, per: number, tau: number) =>
    T > t ? Math.sin((2 * Math.PI * (T - t)) / per) * Math.exp(-(T - t) / tau) : 0;
  const pose = (F: number, T: number, base: Partial<Pose>, s: number): Pose => {
    let jolt = 0,
      pom = 0;
    for (const t of JOLTS) {
      jolt += (26 * u * decay(T, t, 6, 10)) / s;
      pom += 0.35 * decay(T - 2, t, 10, 12);
    }
    const wind = F >= S.repaint && F < S.out ? prog(T, 150, 170) : 0;
    pom += wind * 0.22 * Math.sin(T * 0.8) + 0.06 * Math.sin((2 * Math.PI * (T - 3)) / 12);
    const blink = [84, 170, 280].some((t) => T >= t && T < t + 4) ? 1 : 0;
    return {
      ...POSE,
      ...base,
      jolt,
      pom,
      wind,
      blink,
      bob: ((6 * u) / s) * (0.5 + 0.5 * Math.cos((2 * Math.PI * T) / 12)),
      cap: F >= S.out ? 1 : 0,
    };
  };

  // ---- the frame, section by section; returns the zoom's fixed point when the radial smear applies
  const scene = (ctx: Ctx, env: Env, F: number, T: number): Pt | null => {
    const g: G = { ctx, env, pass: "both", u, k: 1 };
    let smear: Pt | null = null;
    ctx.save();
    hold(ctx, T, F);
    const kidAt = (st: Stage, p: Pose, cam: Cam, inner: ((g: G) => void) | null, snow: SnowFn, sweep = -1) => {
      ctx.save();
      apply(ctx, cam);
      kid(g, T, st.x, st.y, st.s, p, (gg, x, y, r) => globe(gg, T, x, y, r, inner, snow, sweep));
      ctx.restore();
    };
    const bg = (k: number, v: number, cam: Cam = ID, gg: G = g) => {
      ctx.save();
      apply(ctx, cam);
      world(gg, k, v, T);
      ctx.restore();
    };
    const gStage = (st: Stage, p: Pose): Pt => [st.x + st.s * p.gx, st.y + st.s * p.gy];

    if (F < S.close) {
      // hook, pull-back, shake and the first repaint: the kid at mid shot on the drizzly street
      const p = pose(
          F,
          T,
          {
            ...P_MED,
            puff: F >= S.shake ? Math.min(prog(T, 96, 100), 1 - prog(T, 128, 134)) : 0,
            hy: 18 * ease.inOutCubic(prog(T, 132, 140)),
            tilt: 0.08 * ease.inOutCubic(prog(T, 132, 140)),
            gy: P_MED.gy - 30 * ease.inOutCubic(prog(T, 132, 140)),
            mouth: T >= 132 && T < 150 ? 2 : 0,
          },
          MED.s,
        ),
        gc = gStage(MED, { ...p, gy: P_MED.gy }),
        R = MED.s * P_MED.gr,
        sh = (tall ? 880 * u : (W / 2) * 1.02) / R;
      let cam = F < S.pull ? zoom(1, gc, sh, sh) : zoom(1 - ease.inOutCubic(prog(T, 48, 84)), gc, sh, sh);
      const kick = 40 * u * decay(T, 12, 6, 10) + 20 * u * decay(T, 24, 6, 10);
      cam = { ...cam, sy: cam.sy + kick };
      const inner = (gg: G) => world(gg, SEA, 0, T),
        snow = globeSnow(GLOBE_SHAKES, T),
        figure = () => kidAt(MED, p, cam, inner, snow);
      if (F < S.repaint) {
        bg(HOME, 0, cam);
        figure();
      } else
        wipe(
          g,
          T,
          RIB1,
          () => bg(HOME, 0, cam),
          () => bg(SEA, 0, cam),
          figure,
        );
    } else if (F < S.montage) {
      // close-up: a new world in the glass, the eyes widen, two more shakes
      const p = pose(
        F,
        T,
        {
          ...P_CLOSE,
          eyes: 1 + 0.5 * spring((T - 204) / FPS, { freq: 2.4, damp: 0.56 }),
          mouth: T >= 204 ? 2 : 0,
        },
        CLOSE.s,
      );
      bg(SEA, 0);
      kidAt(CLOSE, p, ID, (gg) => world(gg, DUNES, 0, T), globeSnow(GLOBE_SHAKES, T));
    } else if (F < S.push) {
      // the montage: the kid centred and locked, the world behind hard-cuts on every beat, the glass foretells
      const i = Math.floor((F - S.montage) / 12),
        v = i % 3,
        p = pose(
          F,
          T,
          { ...P_UP, gx: [0, -40, 40][v]!, tilt: [0, -0.12, 0.12][v]!, stance: v as 0 | 1 | 2, mouth: v === 1 ? 2 : 0 },
          MONTS.s,
        );
      bg(MONT[i]!, 0);
      const next = i < 7 ? MONT[i + 1]! : VILLAGE;
      kidAt(MONTS, p, ID, (gg) => world(gg, next, 0, T), globeSnow(GLOBE_SHAKES, T));
    } else if (F < S.inside) {
      // through the glass: the globe comes down to the lens and the camera pushes in, ×14, exponential
      const lo = ease.inOutCubic(prog(T, 336, 352)),
        p = pose(
          F,
          T,
          { gx: 0, gy: lerp(P_UP.gy, 40, lo), gr: lerp(P_UP.gr, 118, lo), arm: lerp(P_UP.arm, 118, lo), mouth: 2 },
          MONTS.s,
        ),
        gc = gStage(MONTS, p),
        R = MONTS.s * p.gr,
        u01 = prog(T, 336, 380),
        cam = zoom(ease.inOutCubic(u01), gc, 14, hd / R);
      if (cam.s * R >= hd) {
        world(g, VILLAGE, 0, T);
        const c = camMap(cam, gc),
          Rs = cam.s * R;
        globeSnow(GLOBE_SHAKES, T, true)(g, c[0], c[1], Rs);
        stroke(g, arcPts(c[0], c[1], 0.8 * Rs, 0.8 * Rs, 3.4, 4.55, 40), (0.11 * Rs) / u, 305, C.surface, 0.7);
        ink(g, arcPts(c[0], c[1], Rs, Rs, -0.75, 3.4, 60), (0.045 * Rs) / u, 304);
      } else {
        bg(BANDS, 0);
        kidAt(MONTS, p, cam, (gg) => world(gg, VILLAGE, 0, T), globeSnow(GLOBE_SHAKES, T, true));
      }
      if (T >= 354 && T < 362) smear = holdMap(T, F, camMap(cam, gc));
    } else if (F < S.unpaint) {
      // the giant tap: the whole picture kicks, like the first jolt
      ctx.translate(0, 34 * u * decay(T, 432, 6, 10));
      world(g, INSIDE, 0, T);
      frameSnow(g, T, [432], 1.9);
    } else if (F < S.eve) {
      // the unpaint: ribbons lift the colour off and leave the underdrawing, contours closed, on bare paper
      const under: G = { ...g, pass: "under" };
      wipe(
        g,
        T,
        RIB2,
        () => {
          world(g, INSIDE, 0, T);
          frameSnow(g, T, [432], 1.9);
        },
        () => {
          ctx.fillStyle = C.ground;
          ctx.fillRect(-M, -M, W + 2 * M, H + 2 * M);
          world(under, INSIDE, 0, T);
          frameSnow(under, T, [432], 1.9);
        },
      );
    } else if (F < S.out) {
      // the repaint, as evening
      const under: G = { ...g, pass: "under" };
      wipe(
        g,
        T,
        RIB3,
        () => {
          ctx.fillStyle = C.ground;
          ctx.fillRect(-M, -M, W + 2 * M, H + 2 * M);
          world(under, INSIDE, 0, T);
          frameSnow(under, T, [432], 1.9);
        },
        () => {
          world(g, VILLAGE, 1, T);
          frameSnow(g, T, [], 1.4);
        },
      );
    } else {
      // back out to the street (now evening, dry, a cap of snow on the hat), then the lift and the iris
      // the lift raises the globe to just under the chin (the whole grinning face stays in frame); the push onto
      // the glass waits until 624 and runs with the iris, so the face leaves the frame by a camera move, not a crop
      const lift = ease.inOutCubic(prog(T, 600, 618)),
        p = pose(F, T, { ...P_MED, gy: P_MED.gy - 50 * lift, mouth: T >= 588 ? 1 : 0 }, MED.s),
        gc = gStage(MED, p),
        R = MED.s * P_MED.gr;
      let cam: Cam;
      if (F < S.lift) cam = zoom(ease.inOutCubic(1 - prog(T, 552, 588)), gc, 14, hd / R);
      else {
        const e = ease.inOutCubic(prog(T, 624, 660)),
          se = END.r / R;
        cam = zoom(e, gc, se, se, [END.x, END.y]);
      }
      const nestedWorld = F >= S.lift,
        inner = (gg: G) => world(gg, nestedWorld ? NESTED : VILLAGE, 1, T),
        snow = nestedWorld ? settleSnow(T) : globeSnow([], T, true),
        sweep = (T - 612) / 12;
      if (cam.s * R >= hd) {
        world(g, VILLAGE, 1, T);
        frameSnow(g, T, [], 1.4);
        const c = camMap(cam, gc),
          Rs = cam.s * R;
        stroke(g, arcPts(c[0], c[1], 0.8 * Rs, 0.8 * Rs, 3.4, 4.55, 40), (0.11 * Rs) / u, 305, C.surface, 0.7);
        ink(g, arcPts(c[0], c[1], Rs, Rs, -0.75, 3.4, 60), (0.045 * Rs) / u, 304);
      } else {
        bg(HOME, 1, cam);
        kidAt(MED, p, cam, inner, snow, sweep);
      }
      if (T >= 566 && T < 574) smear = holdMap(T, F, camMap(cam, gc));
      if (T >= 636) {
        // the iris: deep outside a painted circle closing onto the glass
        const c = holdMap(T, F, camMap(cam, gc)),
          Rs = cam.s * R * holdZ(T, F),
          ri = lerp(hd * 1.2, Rs + 30 * u, ease.inOutCubic(prog(T, 636, 660)));
        ctx.restore();
        ctx.save();
        iris(ctx, c, ri, T);
      }
    }
    ctx.restore();
    if (F >= S.end - 12 && T >= 672) {
      const a = prog(T, 672, 684),
        o = { size: 120 * u, family: F_.serif, weight: 400, color: C.surface, align: "center" as const, alpha: a };
      if (tall) {
        text(ctx, "Shake for", W / 2, 1300 * u, o);
        text(ctx, "Elsewhere.", W / 2, 1430 * u, o);
      } else text(ctx, "Shake for Elsewhere.", W / 2, 865 * u, o);
    }
    return smear;
  };
  const iris = (ctx: Ctx, [cx, cy]: Pt, r: number, T: number) => {
    const n = 120;
    ctx.beginPath();
    ctx.rect(-M, -M, W + 2 * M, H + 2 * M);
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2,
        wob = 6 * u * (0.6 * Math.sin(3 * a + 1) + 0.3 * Math.sin(7 * a + 2) + 0.1 * Math.sin(13 * a)),
        x = cx + Math.cos(a) * (r + wob),
        y = cy + Math.sin(a) * (r + wob);
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = C.deep;
    ctx.fill("evenodd");
    // about forty dry-brush streaks of deep sweeping tangentially across the edge, turning slowly
    const g: G = { ctx, env: envRef!, pass: "both", u, k: 1 };
    for (let j = 0; j < 40; j++) {
      const a = (j / 40) * Math.PI * 2 + hash(j + 5) * 0.2 + T * 0.0015,
        rr = r + (hash(j + 9) - 0.5) * 18 * u,
        span = ((60 + 90 * hash(j + 11)) * u) / Math.max(r, 1);
      stroke(g, arcPts(cx, cy, rr, rr, a, a + span, 8), 7 + 8 * hash(j + 13), 1900 + j, C.deep, 1);
    }
  };
  let envRef: Env | null = null;

  const paint = (ctx: Ctx, env: Env, Fr: number) => {
    envRef = env;
    const F = Math.floor(clamp(Fr, 0, N - 1)),
      T = paintedT(F),
      sc = env.scale;
    ctx.setTransform(sc, 0, 0, sc, 0, 0);
    ctx.fillStyle = C.ground;
    ctx.fillRect(0, 0, W, H);
    const smear = scene(ctx, env, F, T);
    if (smear) {
      // the radial zoom smear (the one blur in the film): three copies of the frame about the fixed point
      const k = `gouache:smear:${W}x${H}:${sc}`;
      let Ly = env.cache.get(k) as Layer | undefined;
      if (!Ly) {
        Ly = env.canvas(Math.round(W * sc), Math.round(H * sc));
        env.cache.set(k, Ly);
      }
      Ly.ctx.setTransform(1, 0, 0, 1, 0, 0);
      Ly.ctx.clearRect(0, 0, Ly.canvas.width, Ly.canvas.height);
      Ly.ctx.drawImage(ctx.canvas as CanvasImageSource, 0, 0);
      const inward = F < S.inside;
      for (const [m, a] of [
        [0.96, 0.25],
        [0.92, 0.15],
        [0.88, 0.08],
      ] as const) {
        const z = inward ? m : 1 / m;
        ctx.save();
        ctx.setTransform(z, 0, 0, z, smear[0] * sc * (1 - z), smear[1] * sc * (1 - z));
        ctx.globalAlpha = a;
        ctx.drawImage(Ly.canvas, 0, 0);
        ctx.restore();
      }
    }
    // one sheet of paper under everything
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 0.08;
    ctx.drawImage(paperTile(env, W, H, u).canvas, 0, 0);
    ctx.restore();
  };

  const cuts = [
      0,
      S.pull,
      S.shake,
      S.repaint,
      S.close,
      S.montage,
      S.push,
      S.inside,
      S.unpaint,
      S.eve,
      S.out,
      S.lift,
      S.end,
      N,
    ],
    names = [
      "hook",
      "pull-back",
      "shake",
      "repaint",
      "close-up",
      "montage",
      "through",
      "inside",
      "unpaint",
      "evening",
      "back-out",
      "lift",
      "iris",
    ];
  const shots: Shot[] = names.map((sid, i) => ({
    id: sid,
    start: cuts[i]!,
    end: cuts[i + 1]!,
    draw: (ctx, local, env) => paint(ctx, env, cuts[i]! + local),
  }));
  return {
    meta: { title: id, W, H, fps: FPS, bpm: BPM, durationFrames: N, raster: "cpu" },
    assets: { images: {}, fonts: P.assets },
    shots,
    audio: beatScore({
      frames: N,
      fps: FPS,
      bpm: BPM,
      mood: "drive",
      key: 3,
      drop: S.montage,
      hits: [12, 168, 336, 432, 528, 660],
      whooshes: [144, 384, 504, 552, 648],
      ticks: [24, 84, 96, 108, 120, 204, 216, 228, 252, 264, 276, 288, 300, 312, 324, 456, 588, 612, 708],
      sign: 672,
      gain: 0.8,
    }),
  };
}

export const gouacheStorybook = make("landscape", "gouacheStorybook");
export const gouacheStorybookVertical = make("vertical", "gouacheStorybookVertical");
