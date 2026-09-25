// THE QUOKKA RIG. Rotli's canonical line art (poses.ts, path geometry) becomes a living character:
// ink is drawn from the brand outline, the body is flood-filled from that outline (so the fill can
// never drift off the line), eye glints are found in the art and give each pose a blink, and the
// whole figure hops, squashes, leans and breathes around its feet. Pure in its inputs; every
// raster is cached under a key that names everything its pixels depend on.
import type { Ctx, Env, Layer } from "../core";
import { POSES, type PoseName } from "./poses";

export const INK = "#2b231d";
export const COCOA_BODY = "#c6845f";
export const PAPER = "#fffaf2";
const RES = 900; // cached pose raster side per unit of env.scale; drawn at <= this size (downscale only)

type Eye = { x: number; y: number; r: number }; // art-space 0..1
type PoseSurface = { layer: Layer; eyes: Eye[]; foot: { x: number; y: number }; top: number };

// Per-pose placement onto a common frame: the base pose's feet sit at (0.5, 1). `s` rescales the
// art so the head matches base; `paper` seeds flood the prop interiors (note pages, envelope, screen)
// with paper instead of fur; `eyes` overrides detection where the art defeats it.
type Fix = {
  s?: number;
  dx?: number;
  dy?: number;
  paper?: [number, number][];
  eyes?: Eye[];
  gap?: number;
  eyeBand?: number;
};
export const POSE_FIX: Partial<Record<PoseName, Fix>> = {
  attention: { gap: 6 },
  walking: { eyeBand: 0.3 },
};

const hexRgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

const build = (env: Env, name: PoseName, body: string, ink: string): PoseSurface => {
  const key = `pose:${name}:${body}:${ink}:${env.scale}`;
  const hit = env.cache.get(key) as PoseSurface | undefined;
  if (hit) return hit;
  const p = POSES[name],
    N = Math.round(RES * env.scale),
    L = env.canvas(N, N),
    c = L.ctx;
  c.save();
  c.scale(N / p.vb, N / p.vb);
  if (p.tf) {
    c.translate(p.tf[0], p.tf[1]);
    c.scale(p.tf[2], p.tf[3]);
  }
  c.fillStyle = ink;
  for (const d of p.d) c.fill(new Path2D(d), p.rule);
  c.restore();
  const img = c.getImageData(0, 0, N, N),
    a = new Uint8Array(N * N);
  for (let i = 0; i < N * N; i++) a[i] = img.data[i * 4 + 3];
  // exterior: flood from the border through non-ink
  // the exterior flood runs against the ink DILATED by R px, so hairline gaps in traced art cannot
  // leak the fill; the exterior is then grown back by R so the fill still ends under the line.
  const R = POSE_FIX[name]?.gap ?? 3,
    wall = new Uint8Array(N * N);
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++)
      if (a[y * N + x] >= 110)
        for (let dy = -R; dy <= R; dy++)
          for (let dx = -R; dx <= R; dx++) {
            const X = x + dx,
              Y = y + dy;
            if (X >= 0 && Y >= 0 && X < N && Y < N && dx * dx + dy * dy <= R * R) wall[Y * N + X] = 1;
          }
  const OUT = 1,
    mark = new Uint32Array(N * N),
    stack: number[] = [];
  const push = (i: number) => {
    if (!mark[i] && !wall[i]) {
      mark[i] = OUT;
      stack.push(i);
    }
  };
  for (let i = 0; i < N; i++) {
    push(i);
    push((N - 1) * N + i);
    push(i * N);
    push(i * N + N - 1);
  }
  const push2 = (i: number, m: number) => {
    if (!mark[i] && a[i] < 110) {
      mark[i] = m;
      stack.push(i);
    }
  };
  {
    while (stack.length) {
      const i = stack.pop()!,
        x = i % N;
      for (const j of [x > 0 ? i - 1 : -1, x < N - 1 ? i + 1 : -1, i - N, i + N])
        if (j >= 0 && j < N * N && !mark[j] && !wall[j]) {
          mark[j] = OUT;
          stack.push(j);
        }
    }
  }
  {
    const grown = new Uint8Array(N * N);
    for (let i = 0; i < N * N; i++)
      if (mark[i] === OUT) {
        const x = i % N,
          y = (i - x) / N;
        for (let dy = -R; dy <= R; dy++)
          for (let dx = -R; dx <= R; dx++) {
            const X = x + dx,
              Y = y + dy;
            if (X >= 0 && Y >= 0 && X < N && Y < N && dx * dx + dy * dy <= R * R && a[Y * N + X] < 110)
              grown[Y * N + X] = 1;
          }
      }
    for (let i = 0; i < N * N; i++) if (grown[i]) mark[i] = OUT;
  }
  // interior components: tiny ones are eye glints, the rest is fur (or paper where seeded)
  let label = 2;
  const comps: { id: number; n: number; sx: number; sy: number }[] = [];
  for (let i = 0; i < N * N; i++)
    if (!mark[i] && a[i] < 110) {
      const id = label++;
      mark[i] = id;
      stack.push(i);
      let n = 0,
        sx = 0,
        sy = 0;
      while (stack.length) {
        const j = stack.pop()!,
          x = j % N;
        n++;
        sx += x;
        sy += (j - x) / N;
        if (x > 0) push2(j - 1, id);
        if (x < N - 1) push2(j + 1, id);
        if (j >= N) push2(j - N, id);
        if (j < N * N - N) push2(j + N, id);
      }
      comps.push({ id, n, sx, sy });
    }
  const fix = POSE_FIX[name] ?? {};
  const paperIds = new Set((fix.paper ?? []).map(([u, v]) => mark[Math.round(v * N) * N + Math.round(u * N)]));
  const glint = new Set(comps.filter((k) => k.n < N * N * 0.00012 && !paperIds.has(k.id)).map((k) => k.id));
  // ink bbox + foot
  let x0 = N,
    x1 = 0,
    y0 = N,
    y1 = 0;
  for (let i = 0; i < N * N; i++)
    if (a[i] >= 110) {
      const x = i % N,
        y = (i - x) / N;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  let fx = 0,
    fn = 0;
  for (let y = Math.round(y1 - (y1 - y0) * 0.05); y <= y1; y++)
    for (let x = x0; x <= x1; x++)
      if (a[y * N + x] >= 110) {
        fx += x;
        fn++;
      }
  // eyes: solid round ink blobs in the head that are not the nose; both eyes share a height
  const blob = new Int32Array(N * N),
    blobs: { x0: number; x1: number; y0: number; y1: number; n: number }[] = [];
  for (let i = 0; i < N * N; i++)
    if (a[i] >= 110 && !blob[i]) {
      const b = { x0: N, x1: 0, y0: N, y1: 0, n: 0 },
        id = blobs.push(b);
      blob[i] = id;
      stack.push(i);
      while (stack.length) {
        const j = stack.pop()!,
          x = j % N,
          y = (j - x) / N;
        b.n++;
        if (x < b.x0) b.x0 = x;
        if (x > b.x1) b.x1 = x;
        if (y < b.y0) b.y0 = y;
        if (y > b.y1) b.y1 = y;
        for (const q of [x > 0 ? j - 1 : -1, x < N - 1 ? j + 1 : -1, j - N, j + N])
          if (q >= 0 && q < N * N && a[q] >= 110 && !blob[q]) {
            blob[q] = id;
            stack.push(q);
          }
      }
    }
  const H = y1 - y0,
    cand = blobs
      .filter((b) => {
        const w = b.x1 - b.x0 + 1,
          h = b.y1 - b.y0 + 1;
        return (
          b.n > N * N * 0.00018 &&
          b.n < N * N * 0.003 &&
          b.n / (w * h) > 0.5 &&
          w / h > 0.6 &&
          w / h < 1.7 &&
          b.y0 > y0 + H * 0.1 &&
          b.y1 < y0 + H * 0.45 &&
          Math.abs((b.x0 + b.x1) / 2 - fx / Math.max(1, fn)) < N * (fix.eyeBand ?? 0.19)
        );
      })
      .sort((p1, p2) => p1.y0 - p2.y0);
  const eyes: Eye[] =
    fix.eyes ??
    cand
      .filter(
        (b) => Math.abs(b.y0 - cand[0].y0) < N * 0.035 && Math.abs(b.y1 - b.y0 - (cand[0].y1 - cand[0].y0)) < N * 0.02,
      )
      .slice(0, 2)
      .map((b) => ({
        x: (b.x0 + b.x1) / 2 / N,
        y: (b.y0 + b.y1) / 2 / N,
        r: Math.max(b.x1 - b.x0, b.y1 - b.y0) / 2 / N,
      }));
  // paint: fill everything that is not exterior, then the ink on top
  const [br, bg, bb] = hexRgb(body),
    [pr, pg, pb] = hexRgb(PAPER),
    fill = c.createImageData(N, N),
    f = fill.data;
  for (let i = 0; i < N * N; i++) {
    if (mark[i] === OUT) continue;
    const m = mark[i],
      isPaper = paperIds.has(m) || glint.has(m),
      k = i * 4;
    f[k] = isPaper ? pr : br;
    f[k + 1] = isPaper ? pg : bg;
    f[k + 2] = isPaper ? pb : bb;
    f[k + 3] = 255;
  }
  const out = env.canvas(N, N);
  out.ctx.putImageData(fill, 0, 0);
  out.ctx.drawImage(L.canvas, 0, 0);
  const s: PoseSurface = { layer: out, eyes, foot: { x: fn ? fx / fn / N : 0.5, y: y1 / N }, top: y0 / N };
  env.cache.set(key, s);
  return s;
};

export type Quokka = {
  pose: PoseName;
  x: number;
  y: number; // feet on the ground, logical px
  h: number; // height of the art square, logical px
  flip?: boolean;
  lean?: number; // lean in degrees around the feet
  squash?: number; // 1 = rest, <1 squashed (landing), >1 stretched (takeoff)
  blink?: number; // 0 open .. 1 shut
  body?: string;
  ink?: string;
  alpha?: number;
};

// Drawn in LOGICAL units: the caller's ctx already carries env.scale.
export const drawQuokka = (ctx: Ctx, env: Env, q: Quokka) => {
  const S = build(env, q.pose, q.body ?? COCOA_BODY, q.ink ?? INK),
    fix = POSE_FIX[q.pose] ?? {};
  const size = q.h * (fix.s ?? 1),
    sq = q.squash ?? 1;
  ctx.save();
  ctx.globalAlpha *= q.alpha ?? 1;
  ctx.translate(q.x, q.y);
  ctx.rotate(((q.lean ?? 0) * Math.PI) / 180);
  ctx.scale((q.flip ? -1 : 1) * (1 / Math.sqrt(sq)), sq);
  ctx.translate(((fix.dx ?? 0) - S.foot.x) * size, ((fix.dy ?? 0) - S.foot.y) * size);
  ctx.drawImage(S.layer.canvas, 0, 0, size, size);
  const b = q.blink ?? 0;
  if (b > 0.05)
    for (const e of S.eyes) {
      const ex = e.x * size,
        ey = e.y * size,
        r = e.r * size;
      ctx.fillStyle = q.body ?? COCOA_BODY;
      ctx.beginPath();
      ctx.ellipse(ex, ey, r * 1.35, r * 1.35 * Math.min(1, b * 1.4), 0, 0, Math.PI * 2);
      ctx.fill();
      if (b > 0.5) {
        ctx.strokeStyle = q.ink ?? INK;
        ctx.lineWidth = r * 0.5;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.arc(ex, ey - r * 0.7, r * 1.05, Math.PI * 0.22, Math.PI * 0.78);
        ctx.stroke();
      }
    }
  ctx.restore();
};

// ---- motion vocabulary (pure functions of a frame count)
export const clamp01 = (v: number) => (v <= 0 ? 0 : v >= 1 ? 1 : v);
export const easeOut = (t: number) => 1 - (1 - clamp01(t)) ** 3;
export const easeInOut = (t: number) => {
  t = clamp01(t);
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
};
export const backOut = (t: number) => {
  t = clamp01(t);
  const c = 1.9;
  return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2;
};
/** blink envelope: shut for ~4 frames every `period` frames, phase-shifted by `seed` */
export const blinkAt = (f: number, period = 78, seed = 0) => {
  const p = (((f + seed * 37) % period) + period) % period;
  return p < 2 ? p / 2 : p < 4 ? 1 : p < 6 ? 1 - (p - 4) / 2 : 0;
};
/** one hop of `len` frames: height 0..1 arc and squash (landing squash, takeoff stretch) */
export const hop = (t: number) => {
  if (t <= 0 || t >= 1)
    return { lift: 0, squash: t >= 1 && t < 1.25 ? 1 - 0.14 * Math.sin(((t - 1) / 0.25) * Math.PI) : 1 };
  return {
    lift: Math.sin(t * Math.PI),
    squash: t < 0.2 ? 1 + 0.12 * Math.sin((t / 0.2) * Math.PI) : 1 + 0.05 * Math.sin(t * Math.PI),
  };
};
export const breathe = (f: number) => 1 + 0.012 * Math.sin((f / 45) * Math.PI * 2);
