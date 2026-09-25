// STUDY 21 · MORPH LAUNCH (24 s, 60 fps, 120 bpm). A product launch for a fictional scheduling assistant in ONE
// continuous take: nothing cuts, every shape becomes the next. A caption line on a drifting mesh gradient swells
// into a frosted prompt field, the field squeezes to a pill and a dot, the dot drops onto a white page and becomes
// the mark, a dark pill wraps it like a button and the button grows into an app window read by a depth-of-field
// camera. A calendar tile pops out in 3D and unfolds into a week, the week folds into the first of a stack of
// notification cards, and the last card becomes the glass pill of the end card. Palette "sunset"; Oriel is invented.
// Brief: series/studies/briefs/morph-launch.json · prompt: series/studies/prompts/morph-launch.prompt.md
//
// The whole film is one continuous function paint(F) of a (fractional) frame F. Every morph is a chain of nested
// mixR(a, b, spring) calls on one rectangle, so each shape starts exactly where the last one ended. Blur has no
// ctx.filter: soft() draws into a small offscreen canvas and scales it back up (core.ts's soften, in one pass).
import PACK from "../../../brand/packs/studio/pack.json";
import { rng, type Ctx, type Env, type Layer } from "../core";
import type { Film, Shot } from "../film";
import { clamp, ease, lerp, prog, spring, track } from "../kit/motion";
import { usePack } from "../kit/pack";
import { beatScore } from "../kit/score";
import { layout, type Size } from "../kit/sizes";
import { measure, text, type TextOpts } from "../kit/type";
import { check, rr, toggle } from "../kit/ui";

const P = usePack(PACK),
  C = P.palette("sunset"),
  F_ = P.face;
const FPS = 60,
  BPM = 120,
  N = 1440; // a beat is 30 frames, a bar 120
// the timeline, in frames (every section starts on the beat grid)
const T = { hook: 0, prompt: 180, chain: 360, window: 540, tile: 900, cards: 1080, end: 1290 };
const TAU = Math.PI * 2;
const WHITE = C.surface;

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const rgba = (h: string, a: number) => `rgba(${hex(h).join(",")},${a})`;
const mix = (a: string, b: string, t: number) => {
  const A = hex(a),
    B = hex(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * clamp(t))).join(",")})`;
};
const sp = (F: number, at: number, freq = 2.2, damp = 0.75) => spring((F - at) / FPS, { freq, damp });

// ---------------------------------------------------------------- rectangles: the one shape that morphs
type R = { x: number; y: number; w: number; h: number; r: number };
const mixR = (a: R, b: R, t: number): R => ({
  x: lerp(a.x, b.x, t),
  y: lerp(a.y, b.y, t),
  w: Math.max(0, lerp(a.w, b.w, t)),
  h: Math.max(0, lerp(a.h, b.h, t)),
  r: Math.max(0, lerp(a.r, b.r, t)),
});
const centered = (x: number, y: number, w: number, h: number, r: number): R => ({
  x: x - w / 2,
  y: y - h / 2,
  w,
  h,
  r,
});
const scaleR = (a: R, k: number): R => centered(a.x + a.w / 2, a.y + a.h / 2, a.w * k, a.h * k, a.r * k);
const fillR = (c: Ctx, a: R, color: string) => {
  rr(c, a.x, a.y, a.w, a.h, a.r);
  c.fillStyle = color;
  c.fill();
};

// ---------------------------------------------------------------- copy + schedules (fixed at load: pure per frame)
const PROMPT = "Oriel, find an hour for Ana, Ben and Kai next week";
const NAME = "Scheduler";
const AGENT = "Team hour finder";
const INSTR = "Find an hour all four can make, hold a room, draft an agenda and send the invites.";
/** the frame each letter lands: a humanised typist (spaces and commas take longer) */
const typing = (s: string, start: number, gap: number, seed: number) => {
  const r = rng(seed);
  let at = start;
  return [...s].map((ch) => {
    const f = Math.round(at);
    at += gap * (0.6 + 0.8 * r()) + (ch === " " ? gap * 0.5 : 0) + (/[,.]/.test(ch) ? gap * 2.5 : 0);
    return f;
  });
};
const S_PROMPT = typing(PROMPT, 212, 1.8, 21),
  S_NAME = typing(NAME, 462, 3.6, 22),
  S_AGENT = typing(AGENT, 566, 1.9, 23),
  S_INSTR = typing(INSTR, 622, 0.72, 24);
const typed = (s: string, sched: number[], F: number) => s.slice(0, sched.filter((f) => f <= F).length);
const doneAt = (sched: number[]) => sched[sched.length - 1];

const TOGGLES = [720, 750, 780, 810]; // one per beat
const CONNECT = [840, 864];
const PRESS = { send: 336, button: 522, start: 882 };
const CAPS = ["Read calendars", "Hold rooms", "Draft agendas", "Send invites"];
const CARDS = [
  { t: "Found · Thu 3:00 · 4 of 4 free", s: "Ana, Ben, Kai and you", at: 1106, col: C.accent },
  { t: "Room 4B held", s: "Thursday, 3:00 to 4:00", at: 1140, col: C.deep },
  { t: "Agenda drafted", s: "Three items, shared in Chat", at: 1170, col: C.accent2 },
  { t: "Invites sent", s: "To Ana, Ben and Kai", at: 1200, col: C.accent },
];
// busy hours in the week panel: [day, start hour, length]
const BUSY: [number, number, number][] = [
  [0, 9, 2],
  [0, 13, 1.5],
  [0, 16, 1],
  [1, 10, 1],
  [1, 12, 3],
  [2, 9, 1],
  [2, 11, 2],
  [2, 14.5, 2.5],
  [3, 9.5, 2],
  [3, 12.5, 1.5],
  [4, 9, 3],
  [4, 13, 1],
  [4, 15, 2],
];

// ---------------------------------------------------------------- sound: key ticks and chimes over the soft loop
const withFoley =
  (base: (sr: number) => [Float32Array, Float32Array], keys: number[], chimes: number[]) =>
  (sr: number): [Float32Array, Float32Array] => {
    const [L, R] = base(sr),
      n = L.length;
    const add = (i: number, v: number, pan: number) => {
      if (i < 0 || i >= n) return;
      L[i] = clamp(L[i] + v * (1 - pan) * 2, -0.99, 0.99);
      R[i] = clamp(R[i] + v * pan * 2, -0.99, 0.99);
    };
    keys.forEach((f, j) => {
      const r = rng(700 + j),
        i0 = Math.round((f / FPS + (r() - 0.5) * 0.006) * sr),
        amp = 0.035 + 0.025 * r(),
        hz = 1700 + 900 * r(),
        pan = 0.38 + 0.24 * r();
      let prev = 0;
      for (let k = 0; k < 0.03 * sr; k++) {
        const t = k / sr,
          x = r() * 2 - 1,
          hp = x - prev;
        prev = x;
        add(i0 + k, amp * (0.55 * hp * Math.exp(-t * 420) + 0.45 * Math.sin(TAU * hz * t) * Math.exp(-t * 260)), pan);
      }
    });
    chimes.forEach((f, j) => {
      const i0 = Math.round((f / FPS) * sr);
      [81, 88].forEach((m, q) => {
        const hz = 440 * 2 ** ((m + (j % 2 ? 2 : 0) - 69) / 12),
          o = Math.round(q * 0.07 * sr);
        for (let k = 0; k < 1.4 * sr; k++) {
          const t = k / sr;
          add(
            i0 + o + k,
            0.05 *
              (Math.sin(TAU * hz * t) + 0.3 * Math.sin(TAU * hz * 2.76 * t)) *
              Math.exp(-t * 3.2) *
              Math.min(1, t / 0.003),
            0.35 + 0.3 * q,
          );
        }
      });
    });
    return [L, R];
  };

// ---------------------------------------------------------------- blur without ctx.filter
// Two scratch canvases the size of the frame, reused by every soft() call (nothing in them outlives the call).
const scratch = (env: Env, k: string): Layer => {
  const w = Math.round(env.W * env.scale),
    h = Math.round(env.H * env.scale),
    key = `morphLaunch:${k}:${w}x${h}`;
  let L = env.cache.get(key) as Layer | undefined;
  if (!L) {
    L = env.canvas(w, h);
    env.cache.set(key, L);
  }
  return L;
};
/**
 * draw(c) painted `radius` logical px out of focus, at `alpha`. box = the region draw() paints in, in the current
 * user space. The region is drawn at 1/d resolution (d grows with the radius) and scaled back up with smoothing
 * (twice for big radii), which is a soft tent blur for the price of a small drawImage.
 */
let depth = 0; // soft() inside soft() (a card's shadow inside a blurred card) gets its own scratch pair
function soft(
  ctx: Ctx,
  env: Env,
  box: [number, number, number, number],
  radius: number,
  alpha: number,
  draw: (c: Ctx) => void,
) {
  if (alpha <= 0.003) return;
  const M = ctx.getTransform(),
    k = Math.hypot(M.a, M.b),
    d = radius * k * 1.25;
  if (d < 1.15) {
    ctx.save();
    ctx.globalAlpha *= alpha;
    draw(ctx);
    ctx.restore();
    return;
  }
  const [bx, by, bw, bh] = box,
    xs: number[] = [],
    ys: number[] = [];
  for (const [x, y] of [
    [bx, by],
    [bx + bw, by],
    [bx, by + bh],
    [bx + bw, by + bh],
  ]) {
    xs.push(M.a * x + M.c * y + M.e);
    ys.push(M.b * x + M.d * y + M.f);
  }
  const DW = Math.round(env.W * env.scale),
    DH = Math.round(env.H * env.scale),
    pad = radius * k * 2.2;
  const x0 = Math.max(0, Math.floor(Math.min(...xs) - pad)),
    y0 = Math.max(0, Math.floor(Math.min(...ys) - pad)),
    x1 = Math.min(DW, Math.ceil(Math.max(...xs) + pad)),
    y1 = Math.min(DH, Math.ceil(Math.max(...ys) + pad));
  if (x1 - x0 < 1 || y1 - y0 < 1) return;
  const cw = Math.ceil((x1 - x0) / d) + 2,
    ch = Math.ceil((y1 - y0) / d) + 2;
  const A = scratch(env, `a${depth}`),
    a = A.ctx;
  a.setTransform(1, 0, 0, 1, 0, 0);
  a.globalAlpha = 1;
  a.globalCompositeOperation = "source-over";
  a.clearRect(0, 0, cw + 2, ch + 2);
  a.save();
  a.setTransform(M.a / d, M.b / d, M.c / d, M.d / d, (M.e - x0) / d, (M.f - y0) / d);
  depth++;
  try {
    draw(a);
  } finally {
    depth--;
  }
  a.restore();
  let src: Layer = A,
    sw = cw,
    sh = ch;
  if (d >= 4) {
    const B = scratch(env, `b${depth}`);
    B.ctx.setTransform(1, 0, 0, 1, 0, 0);
    B.ctx.globalAlpha = 1;
    B.ctx.clearRect(0, 0, cw * 2 + 2, ch * 2 + 2);
    B.ctx.imageSmoothingEnabled = true;
    B.ctx.drawImage(A.canvas, 0, 0, cw, ch, 0, 0, cw * 2, ch * 2);
    src = B;
    sw = cw * 2;
    sh = ch * 2;
  }
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha *= alpha;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src.canvas, 0, 0, sw, sh, x0, y0, cw * d, ch * d);
  ctx.restore();
}

// ---------------------------------------------------------------- the film
export function make(size: Size, id: string): Film {
  const L = layout(size),
    { W, H, u, cx, cy } = L,
    tall = L.tall;
  let E: Env; // the env of the frame being painted (set at the top of paint)
  let S = 1; // device pixels per logical pixel (shadowBlur is in device space)

  // ---- type
  const sans = (size: number, weight = 400, color = WHITE, alpha = 1, track = -0.01): TextOpts => ({
    size: size * u,
    family: F_.sans,
    weight,
    color,
    alpha,
    track,
  });
  const MARK = "@mark";
  const capSize = tall ? 92 : 78;

  // ---- the mark: an accent disc holding an arched (oriel) window with a mullion
  const markAt = (c: Ctx, x: number, y: number, r: number, arch = 1, disc = C.accent) => {
    if (r <= 0.1) return;
    c.beginPath();
    c.arc(x, y, r, 0, TAU);
    c.fillStyle = disc;
    c.fill();
    if (arch <= 0) return;
    c.save();
    c.globalAlpha *= arch;
    const aw = r * 0.74,
      top = y - r * 0.46,
      bot = y + r * 0.48;
    c.beginPath();
    c.moveTo(x - aw / 2, bot);
    c.lineTo(x - aw / 2, top + aw / 2);
    c.arc(x, top + aw / 2, aw / 2, Math.PI, 0);
    c.lineTo(x + aw / 2, bot);
    c.closePath();
    c.fillStyle = WHITE;
    c.fill();
    c.fillStyle = disc;
    c.fillRect(x - r * 0.045, top + aw * 0.28, r * 0.09, bot - top - aw * 0.28);
    c.restore();
  };

  // ---- the mesh gradient: four big soft blobs on a tiny canvas, scaled up to the frame
  const mesh = (ctx: Ctx, F: number) => {
    const mw = tall ? 72 : 128,
      mh = tall ? 128 : 72,
      key = `morphLaunch:mesh:${size}`;
    let M = E.cache.get(key) as Layer | undefined;
    if (!M) {
      M = E.canvas(mw, mh);
      E.cache.set(key, M);
    }
    const c = M.ctx,
      t = F / FPS,
      D = Math.max(W, H);
    c.setTransform(mw / W, 0, 0, mh / H, 0, 0);
    c.globalAlpha = 1;
    c.globalCompositeOperation = "source-over";
    c.fillStyle = C.deep;
    c.fillRect(0, 0, W, H);
    const blob = (col: string, x: number, y: number, r: number, a: number) => {
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, rgba(col, a));
      g.addColorStop(0.55, rgba(col, a * 0.45));
      g.addColorStop(1, rgba(col, 0));
      c.fillStyle = g;
      c.fillRect(0, 0, W, H);
    };
    blob(C.accent, W * (0.2 + 0.07 * Math.sin(t * 0.33)), H * (0.8 + 0.06 * Math.cos(t * 0.27)), D * 0.6, 0.95);
    blob(C.ground, W * (0.86 + 0.05 * Math.cos(t * 0.23)), H * (0.9 + 0.04 * Math.sin(t * 0.35)), D * 0.38, 0.7);
    blob(C.accent2, W * (0.92 + 0.04 * Math.sin(t * 0.29 + 1)), H * (0.06 + 0.05 * Math.cos(t * 0.31)), D * 0.36, 0.8);
    blob(C.deep, W * (0.5 + 0.1 * Math.sin(t * 0.21 + 2)), H * (0.42 + 0.07 * Math.cos(t * 0.25)), D * 0.34, 0.85);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(M.canvas, 0, 0, mw, mh, 0, 0, W * S, H * S);
    ctx.restore();
  };

  // ---- depth: a soft shadow is a blurred copy of the shape, never an outline
  const shade = (ctx: Ctx, a: R, alpha: number, blur = 26, dy = 16, color = C.deep) => {
    if (alpha <= 0 || a.w < 1) return;
    soft(ctx, E, [a.x, a.y + dy, a.w, a.h], blur * u, alpha, (c) => fillR(c, { ...a, y: a.y + dy }, color));
  };
  // frosted glass: a translucent white body with a top sheen, lifted by a soft shadow
  const glass = (ctx: Ctx, a: R, alpha: number) => {
    if (alpha <= 0.002 || a.w < 1) return;
    shade(ctx, a, 0.28 * alpha, 24, 14);
    ctx.save();
    ctx.globalAlpha *= alpha;
    rr(ctx, a.x, a.y, a.w, a.h, a.r);
    ctx.fillStyle = rgba(WHITE, 0.17);
    ctx.fill();
    const g = ctx.createLinearGradient(0, a.y, 0, a.y + a.h);
    g.addColorStop(0, rgba(WHITE, 0.26));
    g.addColorStop(0.45, rgba(WHITE, 0.05));
    g.addColorStop(1, rgba(WHITE, 0.12));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
  };

  // a soft glass ripple: a light ring that expands from a point and fades (it keeps holds alive)
  const ripple = (
    ctx: Ctx,
    x: number,
    y: number,
    F: number,
    at: number,
    r0: number,
    r1: number,
    life: number,
    alpha: number,
  ) => {
    const q = prog(F, at, at + life);
    if (q <= 0 || q >= 1) return;
    const r = lerp(r0, r1, ease.outCubic(q)),
      w = lerp(40, 110, q) * u,
      g = ctx.createRadialGradient(x, y, Math.max(0, r - w), x, y, r + w);
    g.addColorStop(0, rgba(WHITE, 0));
    g.addColorStop(0.5, rgba(WHITE, alpha * (1 - q)));
    g.addColorStop(1, rgba(WHITE, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - r - w, y - r - w, 2 * (r + w), 2 * (r + w));
  };
  // a sheen that sweeps across a glass shape (the field "listening" while it is typed into)
  const sheen = (ctx: Ctx, a: R, q: number, alpha: number) => {
    if (alpha <= 0) return;
    ctx.save();
    rr(ctx, a.x, a.y, a.w, a.h, a.r);
    ctx.clip();
    const sx = a.x - 220 * u + q * (a.w + 440 * u),
      g = ctx.createLinearGradient(sx - 110 * u, 0, sx + 110 * u, 0);
    g.addColorStop(0, rgba(WHITE, 0));
    g.addColorStop(0.5, rgba(WHITE, alpha));
    g.addColorStop(1, rgba(WHITE, 0));
    ctx.fillStyle = g;
    ctx.fillRect(a.x, a.y, a.w, a.h);
    ctx.restore();
  };

  // ---------------------------------------------------------------- 1 · captions: words blur in and out
  type Placed = { s: string; x: number; y: number; w: number; sz: number };
  const place = (ctx: Ctx, lines: string[][], sz: number, y0 = cy): Placed[] => {
    const o = sans(sz),
      gap = measure(ctx, " ", o),
      lh = sz * 1.16 * u,
      out: Placed[] = [];
    lines.forEach((ws, li) => {
      const widths = ws.map((s) => (s === MARK ? sz * 0.74 * u : measure(ctx, s, o))),
        total = widths.reduce((a, b) => a + b, 0) + gap * (ws.length - 1),
        y = y0 + (li - (lines.length - 1) / 2) * lh + sz * 0.35 * u;
      let x = cx - total / 2;
      ws.forEach((s, i) => {
        out.push({ s, x, y, w: widths[i], sz });
        x += widths[i] + gap;
      });
    });
    return out;
  };
  const bbox = (ps: Placed[]): R => {
    const x0 = Math.min(...ps.map((p) => p.x)),
      x1 = Math.max(...ps.map((p) => p.x + p.w)),
      y0 = Math.min(...ps.map((p) => p.y - p.sz * 0.78 * u)),
      y1 = Math.max(...ps.map((p) => p.y + p.sz * 0.24 * u));
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0, r: 0 };
  };
  /** one word: in = blur-to-sharp fade with a small scale settle; out = sharp-to-blur fade */
  const blurWord = (ctx: Ctx, p: Placed, F: number, at: number, outAt = Infinity) => {
    const k = sp(F, at, 2.3, 0.72),
      o = ease.inOutCubic(prog(F, outAt, outAt + 18));
    if (k <= 0.002 || o >= 1) return;
    const blur = (1 - clamp(k)) * 22 + o * 22,
      a = clamp(k * 1.5) * (1 - o),
      sc = lerp(1.16, 1, k) * (1 - 0.06 * o),
      hx = p.x + p.w / 2,
      hy = p.y - p.sz * 0.33 * u;
    soft(ctx, E, [p.x - p.w * 0.1, p.y - p.sz * 0.95 * u, p.w * 1.2, p.sz * 1.3 * u], blur * u, a, (c) => {
      c.translate(hx, hy);
      c.scale(sc, sc);
      c.translate(-hx, -hy);
      if (p.s === MARK) markAt(c, hx, hy, p.sz * 0.34 * u);
      else text(c, p.s, p.x, p.y, sans(p.sz));
    });
  };
  const P1 = tall
      ? [
          ["find", "a"],
          ["free", "hour"],
        ]
      : [["find", "a", "free", "hour"]],
    P2 = tall ? [["with", "one"], ["sentence"]] : [["with", "one", "sentence"]],
    P3 = tall ? [["using"], ["Oriel", MARK]] : [["using", "Oriel", MARK]];
  const bigSz = tall ? 310 : 340;
  const captions = (ctx: Ctx, F: number) => {
    const p1 = place(ctx, P1, capSize),
      find = p1[0];
    // the huge 'find', letter by letter, then it shrinks into its place in the line
    const shrink = ease.inOutCubic(prog(F, 54, 88));
    if (F < 54) {
      const o = sans(bigSz, 400, WHITE, 1, -0.02),
        wBig = measure(ctx, "find", o),
        x0 = cx - wBig / 2,
        base = cy + bigSz * 0.35 * u;
      [..."find"].forEach((ch, i) => {
        const x = x0 + measure(ctx, "find".slice(0, i), o) + (i ? o.track! * o.size : 0),
          cw = measure(ctx, ch, o);
        blurWord(ctx, { s: ch, x, y: base, w: cw, sz: bigSz }, F, 3 + i * 8);
      });
    } else {
      const o0 = sans(bigSz, 400, WHITE, 1, -0.02),
        wBig = measure(ctx, "find", o0),
        sz = lerp(bigSz, capSize, shrink),
        x = lerp(cx - wBig / 2, find.x, shrink),
        y = lerp(cy + bigSz * 0.35 * u, find.y, shrink),
        out = ease.inOutCubic(prog(F, 110, 128));
      if (out < 1)
        soft(ctx, E, [x - 20, y - sz * u, sz * 3 * u, sz * 1.3 * u], out * 22 * u, 1 - out, (c) =>
          text(c, "find", x, y, sans(sz, 400, WHITE, 1, lerp(-0.02, -0.01, shrink))),
        );
    }
    p1.slice(1).forEach((p, i) => blurWord(ctx, p, F, 68 + i * 6, 112 + i * 3));
    place(ctx, P2, capSize).forEach((p, i) => blurWord(ctx, p, F, 120 + i * 6, 148 + i * 3));
    place(ctx, P3, capSize).forEach((p, i) => blurWord(ctx, p, F, p.s === MARK ? 166 : 154 + i * 6, 186 + i * 2));
  };

  // ---------------------------------------------------------------- 2 · the glass prompt field
  const fieldR: R = tall ? centered(cx, cy, 920 * u, 400 * u, 60 * u) : centered(cx, cy, 1320 * u, 150 * u, 75 * u);
  const capR = (ctx: Ctx): R => {
    const b = bbox(place(ctx, P3, capSize)),
      h = tall ? b.h + 60 * u : capSize * 1.5 * u;
    return centered(b.x + b.w / 2, b.y + b.h / 2, b.w + 70 * u, h, tall ? 50 * u : h / 2);
  };
  const pillR = centered(cx, cy, 300 * u, 96 * u, 48 * u),
    dotR = centered(cx, cy, 64 * u, 64 * u, 32 * u);
  const promptSize = tall ? 50 : 38;
  const sendAt = (a: R) => {
    const r = (tall ? 50 : 46) * u;
    return tall
      ? { x: a.x + a.w - r - 34 * u, y: a.y + a.h - r - 34 * u, r }
      : { x: a.x + a.w - r - 26 * u, y: a.y + a.h / 2, r };
  };
  const wrap = (ctx: Ctx, s: string, o: TextOpts, maxW: number) => {
    const lines: string[] = [];
    let cur = "";
    for (const w of s.split(" ")) {
      const next = cur ? `${cur} ${w}` : w;
      if (cur && measure(ctx, next, o) > maxW) {
        lines.push(cur);
        cur = w;
      } else cur = next;
    }
    if (cur) lines.push(cur);
    return lines;
  };
  /** a typed block: lines of the full text, revealed letter by letter, and where the caret sits */
  const typedBlock = (
    ctx: Ctx,
    full: string,
    shown: number,
    o: TextOpts,
    x: number,
    y: number,
    maxW: number,
    lh: number,
  ) => {
    const lines = wrap(ctx, full, o, maxW);
    let left = shown,
      caret = { x, y };
    lines.forEach((ln, i) => {
      if (left <= 0) return;
      const part = ln.slice(0, left);
      text(ctx, part, x, y + i * lh, o);
      caret = { x: x + measure(ctx, part, o) + 4 * u, y: y + i * lh };
      left -= ln.length + 1;
    });
    return caret;
  };
  const caretAt = (ctx: Ctx, p: { x: number; y: number }, sz: number, F: number, busy: boolean, color = WHITE) => {
    if (!busy && Math.floor(F / 30) % 2) return;
    ctx.fillStyle = color;
    ctx.fillRect(p.x, p.y - sz * 0.78 * u, 3 * u, sz * 0.98 * u);
  };
  const fieldContents = (ctx: Ctx, a: R, F: number, alpha: number) => {
    if (alpha <= 0.002) return;
    const o = sans(promptSize, 400, WHITE),
      padX = (tall ? 56 : 56) * u,
      tx = a.x + padX,
      ty = tall ? a.y + 96 * u : a.y + a.h / 2 + promptSize * 0.35 * u,
      shown = typed(PROMPT, S_PROMPT, F).length,
      busy = F >= S_PROMPT[0] && F <= doneAt(S_PROMPT) + 6;
    ctx.save();
    ctx.globalAlpha *= alpha;
    // placeholder until the first letter
    const ph = 1 - prog(F, S_PROMPT[0] - 4, S_PROMPT[0]);
    if (ph > 0) text(ctx, "Ask Oriel anything", tx, ty, { ...o, alpha: 0.55 * ph * prog(F, 192, 204) });
    const car = typedBlock(ctx, PROMPT, shown, o, tx, ty, tall ? a.w - 2 * padX : a.w - padX - 150 * u, 66 * u);
    if (F >= 200) caretAt(ctx, shown ? car : { x: tx - 6 * u, y: ty }, promptSize, F, busy);
    // the round send button: faint until there is a sentence, pulses, is pressed
    const b = sendAt(a),
      ready = prog(F, doneAt(S_PROMPT), doneAt(S_PROMPT) + 10),
      press = F >= PRESS.send ? 1 - 0.14 * Math.sin(Math.PI * prog(F, PRESS.send - 3, PRESS.send + 9)) : 1;
    for (const at of [PRESS.send - 26, PRESS.send - 12]) {
      const q = prog(F, at, at + 22);
      if (q > 0 && q < 1) {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r * (1 + 0.7 * ease.outCubic(q)), 0, TAU);
        ctx.fillStyle = rgba(WHITE, 0.3 * (1 - q) * ready);
        ctx.fill();
      }
    }
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r * press, 0, TAU);
    ctx.fillStyle = rgba(WHITE, lerp(0.3, 1, ready));
    ctx.fill();
    // an up arrow
    const s = b.r * 0.42 * press;
    ctx.strokeStyle = mix(WHITE, C.deep, 0.35 + 0.65 * ready);
    ctx.lineWidth = 5 * u;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(b.x, b.y + s);
    ctx.lineTo(b.x, b.y - s);
    ctx.moveTo(b.x - s * 0.8, b.y - s * 0.2);
    ctx.lineTo(b.x, b.y - s);
    ctx.lineTo(b.x + s * 0.8, b.y - s * 0.2);
    ctx.stroke();
    ctx.restore();
  };

  // ---------------------------------------------------------------- 3 · the chain: pill, dot, mark, button, window
  const lock = (ctx: Ctx) => {
    const r = 40 * u,
      gap = 26 * u,
      nw = measure(ctx, NAME, sans(64, 600, C.ink, 1, -0.02)),
      total = 2 * r + gap + nw,
      mx = cx - total / 2 + r;
    return { mx, my: cy, r, nx: mx + r + gap, ny: cy + 64 * 0.35 * u, nw, total };
  };
  const WIN: R = tall
    ? { x: 80 * u, y: 170 * u, w: 920 * u, h: 1480 * u, r: 52 * u }
    : { x: 60 * u, y: 48 * u, w: 1800 * u, h: 984 * u, r: 40 * u };
  const capPush = (F: number) => 1 + 0.05 * ease.inOutCubic(prog(F, 60, 200));
  const scaleAbout = (a: R, k: number): R => ({
    x: cx + (a.x - cx) * k,
    y: cy + (a.y - cy) * k,
    w: a.w * k,
    h: a.h * k,
    r: a.r * k,
  });
  /** the one hero rectangle: caption → glass field → pill → dot (nested springs: each step starts where the last ended) */
  const hero = (ctx: Ctx, F: number) => {
    const lk = lock(ctx),
      k0 = sp(F, T.prompt, 1.5, 0.8),
      k1 = sp(F, T.chain, 2.0, 0.8),
      k2 = sp(F, 388, 2.4, 0.78),
      breathe = 1 + 0.03 * ease.inOutCubic(prog(F, 206, 360)) * (1 - clamp(k1));
    let a = mixR(mixR(scaleR(mixR(scaleAbout(capR(ctx), capPush(F)), fieldR, k0), breathe), pillR, k1), dotR, k2);
    // the drop: a hop up and over onto the page, landing where the mark lives
    const t = prog(F, 412, 440),
      hx = lerp(0, lk.mx - cx, ease.inOutCubic(t)),
      hy = -120 * u * 4 * t * (1 - t);
    a = { ...a, x: a.x + hx, y: a.y + hy };
    if (F >= 440) {
      // the landing squash, then the dot grows into the mark
      const land = Math.sin(Math.PI * prog(F, 440, 452)) * (1 - prog(F, 440, 470)),
        d = lerp(64 * u, 2 * lk.r, sp(F, 440, 2.4, 0.6));
      a = centered(lk.mx, lk.my + land * 8 * u, d * (1 + 0.22 * land), d * (1 - 0.22 * land), d / 2);
    }
    return { a, lk };
  };
  // the button pill that wraps mark + name, then grows into the window
  const button = (lk: ReturnType<typeof lock>, F: number) => {
    const full = centered(cx, cy, lk.total + 76 * u, 2 * lk.r + 52 * u, lk.r + 26 * u),
      kp = sp(F, 498, 2.0, 0.68),
      press = F >= PRESS.button ? 1 - 0.05 * Math.sin(Math.PI * prog(F, PRESS.button - 2, PRESS.button + 10)) : 1,
      kw = sp(F, 528, 1.25, 0.86);
    const pill = scaleR(mixR(scaleR(full, 0.6), full, kp), press);
    return { a: mixR(pill, WIN, kw), alpha: clamp(kp * 2.2), kw };
  };
  const titleAt = (w: R) => ({ mx: w.x + (tall ? 70 : 78) * u, my: w.y + (tall ? 76 : 70) * u, r: 24 * u });
  // the white page: a circle from the landing point, then it contracts into the window's edge
  const page = (ctx: Ctx, F: number, lk: ReturnType<typeof lock>, win: R) => {
    if (F < 440) return;
    const grow = ease.outCubic(prog(F, 440, 482)),
      kc = sp(F, 572, 1.3, 0.9);
    ctx.fillStyle = WHITE;
    if (grow < 1) {
      ctx.beginPath();
      ctx.arc(lk.mx, lk.my, grow * Math.hypot(W, H) * 1.05, 0, TAU);
      ctx.fill();
    } else if (kc < 0.999)
      fillR(ctx, mixR({ x: -500 * u, y: -500 * u, w: W + 1000 * u, h: H + 1000 * u, r: 0 }, win, kc), WHITE);
  };
  // the mark + name: the dot becomes the mark, the name types in, both ride into the window's title bar
  const lockup = (c: Ctx, F: number, a: R, lk: ReturnType<typeof lock>, win: R, dark: number) => {
    const col = prog(F, 440, 456),
      lockK = sp(F, 528, 1.25, 0.86),
      tt = titleAt(win),
      mx = lerp(lk.mx, tt.mx, lockK),
      my = lerp(a.y + a.h / 2, tt.my, lockK),
      mw = lerp(a.w, 2 * tt.r, lockK),
      mh = lerp(a.h, 2 * tt.r, lockK);
    c.save();
    c.translate(mx, my);
    c.scale(1, mh / Math.max(1e-3, mw));
    markAt(c, 0, 0, mw / 2, col, mix(WHITE, C.accent, col));
    c.restore();
    const nsz = lerp(64, 32, lockK),
      o = sans(nsz, 600, mix(C.ink, WHITE, dark), 1, -0.02),
      nx = mx + mw / 2 + lerp(26, 16, lockK) * u,
      ny = my + nsz * 0.35 * u,
      s = typed(NAME, S_NAME, F);
    text(c, s, nx, ny, o);
    if (F > 456 && F < 504)
      caretAt(c, { x: nx + measure(c, s, o) + 5 * u, y: ny }, nsz, F, F <= doneAt(S_NAME) + 3, C.accent);
  };

  // ---------------------------------------------------------------- 4 · inside the window: depth of field
  type Box = { x: number; y: number; w: number; h: number };
  const G = tall
    ? {
        name: { x: 48, y: 196, w: 824, h: 84 },
        instr: { x: 48, y: 360, w: 824, h: 226 },
        hours: null as Box | null,
        tiles: [0, 1, 2, 3].map((i) => ({ x: 48, y: 668 + i * 104, w: 824, h: 92 })),
        conn: [
          { x: 48, y: 1136, w: 824, h: 84 },
          { x: 48, y: 1232, w: 824, h: 84 },
        ],
        start: { x: 48, y: 1352, w: 824, h: 88 },
      }
    : {
        name: { x: 96, y: 214, w: 760, h: 84 },
        instr: { x: 96, y: 386, w: 760, h: 236 },
        hours: { x: 96, y: 712, w: 760, h: 84 } as Box | null,
        tiles: [0, 1, 2, 3].map((i) => ({ x: 960 + (i % 2) * 382, y: 214 + Math.floor(i / 2) * 140, w: 362, h: 120 })),
        conn: [
          { x: 960, y: 556, w: 744, h: 88 },
          { x: 960, y: 658, w: 744, h: 88 },
        ],
        start: { x: 1464, y: 842, w: 240, h: 84 },
      };
  const sc = (b: Box): Box => ({ x: b.x * u, y: b.y * u, w: b.w * u, h: b.h * u });
  const mid = (b: Box) => ({ x: (b.x + b.w / 2) * u, y: (b.y + b.h / 2) * u });
  const FOCUS: [number, { x: number; y: number }][] = [
    [540, mid(G.name)],
    [604, mid({ ...G.instr, h: 120 })],
    [650, mid({ ...G.instr, y: G.instr.y + 100, h: 120 })],
    [700, mid(G.tiles[0])],
    [735, mid(G.tiles[1])],
    [765, mid(G.tiles[2])],
    [795, mid(G.tiles[3])],
    [822, mid(G.conn[0])],
    [848, mid(G.conn[1])],
    [868, mid(G.start)],
  ];
  const focusAt = (F: number) => ({
    x: track(
      F,
      FPS,
      FOCUS.map(([f, p]) => [f, p.x]),
      { freq: 1.5, damp: 0.86 },
    ),
    y: track(
      F,
      FPS,
      FOCUS.map(([f, p]) => [f, p.y]),
      { freq: 1.5, damp: 0.86 },
    ),
  });
  /** the camera: zooms toward the focus and pulls it toward the centre; strength 0 = no camera */
  const camera = (F: number, win: R) => {
    const c = sp(F, 548, 0.9, 0.95) * (1 - ease.inOutCubic(prog(F, 896, 934))),
      f = focusAt(F),
      fs = { x: win.x + f.x, y: win.y + f.y },
      s = lerp(1, tall ? 1.1 : 1.14, c),
      pull = (tall ? 0.7 : 0.4) * c,
      q = { x: lerp(fs.x, cx, pull), y: lerp(fs.y, cy, pull) };
    return { c, f, s, tx: q.x - fs.x * s, ty: q.y - fs.y * s };
  };
  const dist = (b: Box, p: { x: number; y: number }) => {
    const x0 = b.x * u,
      y0 = b.y * u,
      dx = Math.max(x0 - p.x, 0, p.x - (x0 + b.w * u)),
      dy = Math.max(y0 - p.y, 0, p.y - (y0 + b.h * u));
    return Math.hypot(dx * (tall ? 1 : 0.8), dy);
  };
  const label = (c: Ctx, s: string, b: Box) => text(c, s, b.x * u, b.y * u - 18 * u, sans(24, 600, WHITE, 0.55, 0));
  const field = (c: Ctx, b: Box) => fillR(c, { ...sc(b), r: 18 * u }, rgba(WHITE, 0.07));
  const calIcon = (c: Ctx, x: number, y: number, s: number, day = "THU", num = "12") => {
    const a = { x: x - s / 2, y: y - s / 2, w: s, h: s, r: s * 0.22 };
    fillR(c, a, WHITE);
    c.save();
    rr(c, a.x, a.y, a.w, a.h, a.r);
    c.clip();
    c.fillStyle = C.accent;
    c.fillRect(a.x, a.y, s, s * 0.3);
    c.restore();
    if (s > 60 * u)
      text(c, day, x, a.y + s * 0.22, {
        size: s * 0.14,
        family: F_.sans,
        weight: 600,
        color: WHITE,
        align: "center",
        track: 0.06,
      });
    text(c, num, x, a.y + s * 0.83, {
      size: s * 0.44,
      family: F_.sans,
      weight: 600,
      color: C.ink,
      align: "center",
      track: -0.03,
    });
  };
  const chatIcon = (c: Ctx, x: number, y: number, s: number) => {
    fillR(c, centered(x, y - s * 0.06, s, s * 0.78, s * 0.3), C.accent2);
    c.beginPath();
    c.moveTo(x - s * 0.26, y + s * 0.26);
    c.lineTo(x - s * 0.34, y + s * 0.48);
    c.lineTo(x - s * 0.04, y + s * 0.3);
    c.fillStyle = C.accent2;
    c.fill();
    for (const k of [-1, 0, 1]) {
      c.beginPath();
      c.arc(x + k * s * 0.22, y - s * 0.06, s * 0.07, 0, TAU);
      c.fillStyle = C.deep;
      c.fill();
    }
  };
  type Item = { box: Box; draw: (c: Ctx, F: number) => void };
  const items: Item[] = [
    {
      box: { ...G.name, y: G.name.y - 44, h: G.name.h + 44 },
      draw: (c, F) => {
        label(c, "Name", G.name);
        field(c, G.name);
        const b = sc(G.name),
          o = sans(32, 400, WHITE),
          y = b.y + b.h / 2 + 32 * 0.35 * u,
          s = typed(AGENT, S_AGENT, F),
          w = measure(c, s, o);
        text(c, s, b.x + 28 * u, y, o);
        if (F > 552 && F < 612) caretAt(c, { x: b.x + 28 * u + w + 4 * u, y }, 32, F, F <= doneAt(S_AGENT) + 4);
      },
    },
    {
      box: { ...G.instr, y: G.instr.y - 44, h: G.instr.h + 44 },
      draw: (c, F) => {
        label(c, "Instructions", G.instr);
        field(c, G.instr);
        const b = sc(G.instr),
          o = sans(30, 400, WHITE, 0.92),
          shown = typed(INSTR, S_INSTR, F).length;
        const car = typedBlock(c, INSTR, shown, o, b.x + 28 * u, b.y + 58 * u, b.w - 56 * u, 46 * u);
        if (F > 614 && F < 700)
          caretAt(c, shown ? car : { x: b.x + 28 * u, y: b.y + 58 * u }, 30, F, F <= doneAt(S_INSTR) + 4);
      },
    },
    ...(G.hours
      ? [
          {
            box: { ...G.hours, y: G.hours.y - 44, h: G.hours.h + 44 },
            draw: (c: Ctx) => {
              const h = G.hours!;
              label(c, "Working hours", h);
              field(c, h);
              const b = sc(h);
              text(c, "Weekdays · 9:00 to 5:00", b.x + 28 * u, b.y + b.h / 2 + 11 * u, sans(30, 400, WHITE, 0.8));
            },
          },
        ]
      : []),
    ...G.tiles.map((t, i): Item => ({
      box: i === 0 ? { ...t, y: t.y - 44, h: t.h + 44 } : t,
      draw: (c, F) => {
        if (i === 0) label(c, "Can do", t);
        const b = sc(t),
          on = sp(F, TOGGLES[i], 3.2, 0.62);
        fillR(c, { ...b, r: 22 * u }, rgba(WHITE, 0.07 + 0.05 * clamp(on)));
        // an icon chip that warms when the capability is on
        const ix = b.x + (tall ? 50 : 48) * u,
          iy = b.y + b.h / 2;
        fillR(c, centered(ix, iy, 48 * u, 48 * u, 14 * u), mix(C.ink, C.accent, clamp(on) * 0.9 + 0.1));
        for (let k = 0; k < 3; k++) {
          c.fillStyle = rgba(WHITE, 0.9);
          c.fillRect(ix - 12 * u, iy - 11 * u + k * 9 * u, (k === 1 ? 16 : 24) * u, 4 * u);
        }
        text(c, CAPS[i], ix + 44 * u, iy + 26 * 0.35 * u, sans(26, 600, WHITE));
        const tw = 72 * u;
        toggle(c, b.x + b.w - tw - 24 * u, iy - tw * 0.28, tw, on, {
          off: rgba(WHITE, 0.16),
          on: C.accent,
          knob: WHITE,
        });
      },
    })),
    ...G.conn.map((t, i): Item => ({
      box: i === 0 ? { ...t, y: t.y - 44, h: t.h + 44 } : t,
      draw: (c, F) => {
        if (i === 0) label(c, "Connections", t);
        const b = sc(t),
          on = sp(F, CONNECT[i], 3, 0.7),
          iy = b.y + b.h / 2,
          ix = b.x + 50 * u;
        fillR(c, { ...b, r: 22 * u }, rgba(WHITE, 0.07));
        // the Calendar icon is the tile that later pops out of the window (drawn there once it has left)
        if (i === 0) {
          if (F < T.tile + 2) calIcon(c, ix, iy, 52 * u);
        } else chatIcon(c, ix, iy, 46 * u);
        text(c, i ? "Chat" : "Calendar", ix + 46 * u, iy + 28 * 0.35 * u, sans(28, 600, WHITE));
        // status pill: Connect → Connected (accent) with a check
        const pw = lerp(150, 206, clamp(on)) * u,
          pr = { x: b.x + b.w - pw - 20 * u, y: iy - 24 * u, w: pw, h: 48 * u, r: 24 * u };
        fillR(c, pr, rgba(WHITE, 0.12));
        c.save();
        c.globalAlpha *= clamp(on);
        fillR(c, pr, C.accent);
        c.restore();
        text(c, "Connect", pr.x + pw / 2, iy + 8 * u, {
          ...sans(22, 600, WHITE, 0.75 * (1 - clamp(on * 2))),
          align: "center",
        });
        if (on > 0.3) {
          check(c, pr.x + 30 * u, iy, 18 * u, prog(on, 0.3, 0.9), WHITE, 3.5 * u);
          text(c, "Connected", pr.x + 50 * u, iy + 8 * u, sans(22, 600, WHITE, clamp((on - 0.3) * 2), 0));
        }
      },
    })),
    {
      box: G.start,
      draw: (c, F) => {
        const b = sc(G.start),
          press = F >= PRESS.start ? 1 - 0.07 * Math.sin(Math.PI * prog(F, PRESS.start - 2, PRESS.start + 12)) : 1,
          ready = prog(F, CONNECT[1], CONNECT[1] + 12),
          a = scaleR({ ...b, r: b.h / 2 }, press);
        fillR(c, a, rgba(WHITE, 0.14 * (1 - ready)));
        c.save();
        c.globalAlpha *= ready;
        fillR(c, a, C.accent);
        c.restore();
        text(c, "Start", a.x + a.w / 2, a.y + a.h / 2 + 11 * u, { ...sans(30, 600, WHITE), align: "center" });
        // the press ring
        const q = prog(F, PRESS.start, PRESS.start + 24);
        if (q > 0 && q < 1) {
          c.save();
          c.globalAlpha *= 0.35 * (1 - q);
          fillR(c, scaleR({ ...b, r: b.h / 2 }, 1 + 0.25 * ease.outCubic(q)), C.accent2);
          c.restore();
        }
      },
    },
  ];
  // the window's own chrome: title lockup and a status chip
  const chrome = (c: Ctx, win: R, F: number, alpha: number) => {
    if (alpha <= 0) return;
    const r = centered(
        win.x + win.w - (tall ? 118 : 130) * u,
        win.y + (tall ? 76 : 70) * u,
        (tall ? 156 : 170) * u,
        46 * u,
        23 * u,
      ),
      run = prog(F, PRESS.start + 6, PRESS.start + 16);
    c.save();
    c.globalAlpha *= alpha;
    fillR(c, r, rgba(WHITE, 0.08));
    c.beginPath();
    c.arc(r.x + 26 * u, r.y + r.h / 2, 7 * u, 0, TAU);
    c.fillStyle = run > 0.5 ? C.accent : rgba(WHITE, 0.4);
    c.fill();
    text(c, run > 0.5 ? "Running" : "Draft", r.x + 44 * u, r.y + r.h / 2 + 8 * u, sans(22, 600, WHITE, 0.8, 0));
    c.restore();
  };
  const windowItems = (ctx: Ctx, F: number, win: R, cam: ReturnType<typeof camera>, alpha: number) => {
    const inA = prog(F, 552, 574) * alpha;
    if (inA <= 0) return;
    items.forEach((it) => {
      const d = dist(it.box, cam.f),
        blur = 9 * u * cam.c * clamp((d - 30 * u) / (230 * u));
      ctx.save();
      ctx.translate(win.x, win.y);
      soft(
        ctx,
        E,
        [it.box.x * u - 20 * u, it.box.y * u - 10 * u, it.box.w * u + 40 * u, it.box.h * u + 20 * u],
        blur,
        inA,
        (c) => it.draw(c, F),
      );
      ctx.restore();
    });
  };

  // ---------------------------------------------------------------- 5 · the calendar tile, in 3D, unfolding to a week
  const tileR = tall
      ? centered(cx, cy - 20 * u, 340 * u, 340 * u, 76 * u)
      : centered(cx, cy - 10 * u, 300 * u, 300 * u, 66 * u),
    panelR = tall ? centered(cx, cy + 20 * u, 920 * u, 1140 * u, 36 * u) : centered(cx, cy, 1240 * u, 700 * u, 32 * u);
  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  /** the face at (0,0): m = 0 is the app tile, m = 1 is the week panel (content lays out on the current size) */
  const face = (c: Ctx, w: number, h: number, m: number, F: number, contentA = 1) => {
    fillR(c, { x: 0, y: 0, w, h, r: lerp(w * 0.22, 32 * u, clamp(m)) }, WHITE);
    const ic = 1 - prog(m, 0, 0.3);
    if (ic > 0) {
      c.save();
      c.globalAlpha *= ic;
      c.save();
      rr(c, 0, 0, w, h, w * 0.22);
      c.clip();
      c.fillStyle = C.accent;
      c.fillRect(0, 0, w, Math.min(h, w) * 0.3);
      c.restore();
      const s = Math.min(w, h);
      if (s > 60 * u)
        text(c, "THU", w / 2, s * 0.22, {
          size: s * 0.14,
          family: F_.sans,
          weight: 600,
          color: WHITE,
          align: "center",
          track: 0.06,
        });
      text(c, "12", w / 2, h - s * 0.17, {
        size: s * 0.44,
        family: F_.sans,
        weight: 600,
        color: C.ink,
        align: "center",
        track: -0.03,
      });
      c.restore();
    }
    const pa = prog(m, 0.3, 0.75) * contentA;
    if (pa <= 0) return;
    c.save();
    c.globalAlpha *= pa;
    const pad = 44 * u,
      gx0 = pad + 70 * u,
      gx1 = w - pad,
      gy0 = (tall ? 170 : 150) * u,
      gy1 = h - 36 * u,
      colW = (gx1 - gx0) / 5,
      rowH = (gy1 - gy0) / 8,
      yOf = (hr: number) => gy0 + (hr - 9) * rowH;
    text(c, "Next week", pad, (tall ? 78 : 72) * u, sans(34, 600, C.ink, 1, -0.02));
    const who = "Ana · Ben · Kai · you";
    if (tall) text(c, who, pad, 118 * u, sans(24, 400, C.muted, 1, 0));
    else text(c, who, w - pad, 72 * u, { ...sans(24, 400, C.muted, 1, 0), align: "right" });
    for (let hr = 9; hr <= 17; hr++) {
      c.fillStyle = C.line;
      c.fillRect(gx0, yOf(hr) - 1 * u, gx1 - gx0, 2 * u);
      if (hr % 2 === 1)
        text(c, `${hr > 12 ? hr - 12 : hr}`, gx0 - 16 * u, yOf(hr) + 8 * u, {
          ...sans(22, 400, C.muted, 1, 0),
          align: "right",
        });
    }
    DAYS.forEach((d, i) => {
      // the columns unfold from the centre out
      const k = ease.outCubic(prog(m, 0.4 + 0.07 * Math.abs(i - 2), 0.85 + 0.05 * Math.abs(i - 2))),
        x = gx0 + i * colW,
        xm = x + colW / 2;
      if (k <= 0) return;
      c.save();
      c.translate(xm, 0);
      c.scale(k, 1);
      c.translate(-xm, 0);
      text(c, d, xm, gy0 - 18 * u, { ...sans(24, 600, i === 3 ? C.accent : C.muted, 1, 0), align: "center" });
      for (const [day, st, len] of BUSY)
        if (day === i)
          fillR(
            c,
            { x: x + 6 * u, y: yOf(st) + 3 * u, w: colW - 12 * u, h: len * rowH - 6 * u, r: 10 * u },
            rgba(C.deep, 0.13),
          );
      c.restore();
    });
    // Thursday 3:00: free for all four, and glowing
    const slot = { x: gx0 + 3 * colW + 6 * u, y: yOf(15) + 3 * u, w: colW - 12 * u, h: rowH - 6 * u, r: 12 * u },
      on = prog(m, 0.85, 1) * prog(F, 1028, 1044),
      pulse = 0.55 + 0.45 * Math.sin(((F - 1036) / FPS) * TAU * 0.9);
    if (on > 0) {
      const gx = slot.x + slot.w / 2,
        gy = slot.y + slot.h / 2,
        gr = Math.max(slot.w, slot.h) * (1.1 + 0.25 * pulse),
        g = c.createRadialGradient(gx, gy, 0, gx, gy, gr);
      g.addColorStop(0, rgba(C.accent2, 0.75 * on));
      g.addColorStop(1, rgba(C.accent2, 0));
      c.fillStyle = g;
      c.fillRect(gx - gr, gy - gr, gr * 2, gr * 2);
      c.save();
      c.globalAlpha *= on;
      fillR(c, slot, C.accent);
      if (tall) {
        text(c, "3:00", gx, gy - 4 * u, { ...sans(26, 600, WHITE, 1, 0), align: "center" });
        text(c, "free", gx, gy + 28 * u, { ...sans(22, 400, WHITE, 0.9, 0), align: "center" });
      } else text(c, "3:00 · free", gx, gy + 8 * u, { ...sans(24, 600, WHITE, 1, 0), align: "center" });
      c.restore();
    }
    c.restore();
  };
  /** draw the face in perspective: yaw about the vertical axis (vertical strips), then roll */
  const tile3d = (ctx: Ctx, a: R, yaw: number, roll: number, m: number, F: number, contentA: number) => {
    const x = a.x + a.w / 2,
      y = a.y + a.h / 2;
    if (Math.abs(yaw) < 0.002 && Math.abs(roll) < 0.002) {
      ctx.save();
      ctx.translate(a.x, a.y);
      face(ctx, a.w, a.h, m, F, contentA);
      ctx.restore();
      return;
    }
    const Fc = scratch(E, "face"),
      fc = Fc.ctx;
    fc.setTransform(1, 0, 0, 1, 0, 0);
    fc.clearRect(0, 0, Math.ceil(a.w * S) + 4, Math.ceil(a.h * S) + 4);
    fc.setTransform(S, 0, 0, S, 0, 0);
    face(fc, a.w, a.h, m, F, contentA);
    const n = Math.max(24, Math.min(120, Math.round(a.w / (8 * u)))),
      f = 1500 * u,
      cos = Math.cos(yaw),
      sin = Math.sin(yaw);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(roll);
    ctx.imageSmoothingEnabled = true;
    for (let i = 0; i < n; i++) {
      const xa = (i / n - 0.5) * a.w,
        xb = ((i + 1) / n - 0.5) * a.w,
        ka = f / (f + xa * sin),
        kb = f / (f + xb * sin),
        sa = xa * cos * ka,
        sb = xb * cos * kb,
        km = (ka + kb) / 2;
      ctx.drawImage(
        Fc.canvas,
        (i / n) * a.w * S,
        0,
        (a.w / n) * S,
        a.h * S,
        sa,
        (-a.h / 2) * km,
        sb - sa + 0.6 * u,
        a.h * km,
      );
    }
    ctx.restore();
  };

  // ---------------------------------------------------------------- 6 · notification cards on springs
  const cardW = (tall ? 920 : 780) * u,
    cardH = (tall ? 176 : 128) * u,
    pitch = cardH + (tall ? 28 : 20) * u,
    yB = cy + (tall ? 400 : 200) * u,
    yEdge = yB - (tall ? 2.4 : 1.55) * pitch;
  const cardY = (k: number, F: number) => {
    let shift = 0.35 * prog(F, 1200, 1300); // the stack keeps scrolling slowly
    for (let j = k + 1; j < CARDS.length; j++) shift += sp(F, CARDS[j].at, 1.8, 0.72);
    if (k < 3) shift += 3 * ease.inOutCubic(prog(F, 1246, 1286));
    const e = k === 0 ? 1 : sp(F, CARDS[k].at, 1.8, 0.66);
    return { y: yB - shift * pitch + (1 - e) * 220 * u, e };
  };
  const cardRect = (y: number, s = 1): R => centered(cx, y, cardW * s, cardH * s, (tall ? 40 : 32) * u * s);
  const cardFace = (c: Ctx, a: R, k: number, alpha: number) => {
    if (alpha <= 0.003) return;
    const card = CARDS[k],
      ir = (tall ? 38 : 30) * u,
      ix = a.x + (tall ? 66 : 54) * u,
      iy = a.y + a.h / 2,
      tx = ix + ir + (tall ? 30 : 24) * u,
      tz = tall ? 34 : 28,
      sz = tall ? 26 : 22;
    c.save();
    c.globalAlpha *= alpha;
    c.beginPath();
    c.arc(ix, iy, ir, 0, TAU);
    c.fillStyle = card.col;
    c.fill();
    const g = k === 2 ? C.deep : WHITE;
    if (k === 0) check(c, ix, iy + 2 * u, ir * 0.7, 1, g, 4 * u);
    if (k === 1) text(c, "4B", ix, iy + 8 * u, { ...sans(tall ? 26 : 22, 600, g, 1, 0), align: "center" });
    if (k === 2)
      for (let q = 0; q < 3; q++) {
        c.fillStyle = g;
        c.fillRect(ix - ir * 0.42, iy - ir * 0.36 + q * ir * 0.34, ir * (q === 2 ? 0.5 : 0.84), 4 * u);
      }
    if (k === 3) {
      c.beginPath();
      c.moveTo(ix - ir * 0.45, iy - ir * 0.05);
      c.lineTo(ix + ir * 0.5, iy - ir * 0.42);
      c.lineTo(ix + ir * 0.12, iy + ir * 0.48);
      c.lineTo(ix - ir * 0.02, iy + ir * 0.1);
      c.closePath();
      c.fillStyle = g;
      c.fill();
    }
    text(c, card.t, tx, iy - (tall ? 8 : 6) * u, sans(tz, 600, C.ink, 1, -0.01));
    text(c, card.s, tx, iy + (tall ? 34 : 28) * u, sans(sz, 400, C.muted, 1, 0));
    text(c, "now", a.x + a.w - (tall ? 40 : 34) * u, iy - (tall ? 8 : 6) * u, {
      ...sans(sz, 400, C.muted, 1, 0),
      align: "right",
    });
    c.restore();
  };
  const cardBody = (c: Ctx, a: R, alpha: number) => {
    shade(c, a, 0.3 * alpha, 22, 14);
    c.save();
    c.globalAlpha *= alpha;
    fillR(c, a, rgba(WHITE, 0.94));
    c.restore();
  };

  // ---------------------------------------------------------------- 7 · end card: a glass pill between two words
  const pillEnd = { w: (tall ? 176 : 156) * u, h: (tall ? 104 : 92) * u };
  const endLayout = (ctx: Ctx, left: string[], right: string[]) => {
    const o = sans(capSize),
      gapW = measure(ctx, " ", o),
      g = 30 * u,
      ws = (arr: string[]) => arr.map((s) => measure(ctx, s, o)),
      lw = ws(left),
      rw = ws(right),
      sum = (a: number[]) => a.reduce((x, y) => x + y, 0) + gapW * (a.length - 1),
      wl = sum(lw),
      wr = sum(rw),
      base = (y: number) => y + capSize * 0.35 * u;
    const out: Placed[] = [];
    if (tall) {
      // stacked: the left words above the pill, the right words under it
      const py = cy,
        yTop = base(py - pillEnd.h / 2 - 34 * u - capSize * 0.42 * u),
        yBot = base(py + pillEnd.h / 2 + 34 * u + capSize * 0.42 * u);
      let x = cx - wl / 2;
      left.forEach((s, i) => (out.push({ s, x, y: yTop, w: lw[i], sz: capSize }), (x += lw[i] + gapW)));
      x = cx - wr / 2;
      right.forEach((s, i) => (out.push({ s, x, y: yBot, w: rw[i], sz: capSize }), (x += rw[i] + gapW)));
      return { px: cx, py, words: out };
    }
    const total = wl + g + pillEnd.w + g + wr,
      x0 = cx - total / 2,
      px = x0 + wl + g + pillEnd.w / 2;
    let x = x0;
    left.forEach((s, i) => (out.push({ s, x, y: base(cy), w: lw[i], sz: capSize }), (x += lw[i] + gapW)));
    x = px + pillEnd.w / 2 + g;
    right.forEach((s, i) => (out.push({ s, x, y: base(cy), w: rw[i], sz: capSize }), (x += rw[i] + gapW)));
    return { px, py: cy, words: out };
  };

  // ---------------------------------------------------------------- the one continuous paint
  const paint = (ctx: Ctx, env: Env, F: number) => {
    E = env;
    S = env.scale;
    F = clamp(F, 0, N - 1);
    ctx.setTransform(S, 0, 0, S, 0, 0);
    mesh(ctx, F);
    // a breathing camera over everything but the ground: a slow drift that never stops
    const z = 1 + 0.014 * Math.sin((F / FPS) * 0.9),
      dy = 5 * u * Math.sin((F / FPS) * 0.7);
    ctx.translate(cx, cy + dy);
    ctx.scale(z, z);
    ctx.translate(-cx, -cy);

    // 1 · captions (0 → 206)
    if (F < 206) {
      const push = capPush(F);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(push, push);
      ctx.translate(-cx, -cy);
      captions(ctx, F);
      ctx.restore();
    }
    // 2 · the glass field (180 → 440): the caption line swells into it, then it squeezes to a pill and a dot
    const { a: ha, lk } = hero(ctx, F);
    if (F >= T.prompt && F < 440) {
      const white = prog(F, 392, 414);
      glass(ctx, ha, clamp((F - T.prompt) / 10) * (1 - white));
      sheen(ctx, ha, ((((F - 206) % 64) + 64) % 64) / 64, 0.2 * prog(F, 206, 220) * (1 - prog(F, 348, 364)));
      for (const at of [392, 414]) ripple(ctx, ha.x + ha.w / 2, ha.y + ha.h / 2, F, at, 30 * u, 380 * u, 44, 0.2);
      if (white > 0) {
        ctx.save();
        ctx.globalAlpha *= white;
        fillR(ctx, ha, WHITE);
        ctx.restore();
      }
      const out = prog(F, T.chain, T.chain + 16);
      // once the squeeze starts, the contents keep the field's layout and are squeezed with it (no re-wrap)
      if (out < 1)
        soft(ctx, E, [ha.x, ha.y, ha.w, ha.h], out * 20 * u, 1 - out, (c) => {
          if (F < T.chain) return fieldContents(c, ha, F, 1);
          c.translate(ha.x, ha.y);
          c.scale(ha.w / fieldR.w, ha.h / fieldR.h);
          c.translate(-fieldR.x, -fieldR.y);
          fieldContents(c, fieldR, F, 1);
        });
    }
    // 3 + 4 · the page, the mark, the button and the window it grows into, under the depth-of-field camera
    if (F >= 440 && F < 1000) {
      const b = button(lk, F),
        win = b.a,
        cam = camera(F, win),
        back = sp(F, T.tile, 1.2, 0.9),
        fade = 1 - ease.inOutCubic(prog(F, 928, 990)),
        blur = 16 * u * ease.inOutCubic(prog(F, 900, 960));
      ctx.save();
      // the dolly back at the end: the window recedes and softens while the tile comes forward
      ctx.translate(cx, cy);
      ctx.scale(1 - 0.14 * back, 1 - 0.14 * back);
      ctx.translate(-cx, -cy);
      ctx.translate(cam.tx, cam.ty);
      ctx.scale(cam.s, cam.s);
      page(ctx, F, lk, win);
      soft(ctx, E, [win.x - 60 * u, win.y - 60 * u, win.w + 120 * u, win.h + 120 * u], blur, fade, (c) => {
        if (b.alpha > 0) {
          c.save();
          c.globalAlpha *= b.alpha;
          shade(c, win, 0.35, lerp(26, 40, b.kw), lerp(16, 26, b.kw));
          fillR(c, win, C.ink);
          c.restore();
        }
        lockup(c, F, ha, lk, win, b.alpha);
        chrome(c, win, F, prog(F, 552, 574));
        windowItems(c, F, win, cam, 1);
      });
      ctx.restore();
    }
    // 5 · the calendar tile (900 → 1110)
    if (F >= T.tile && F < 1112) {
      // where the Calendar icon sits on screen at this frame (the tile leaves from there)
      const cam = camera(F, WIN),
        back = 1 - 0.14 * sp(F, T.tile, 1.2, 0.9),
        c0 = G.conn[0],
        ixL = WIN.x + (c0.x + 50) * u,
        iyL = WIN.y + (c0.y + c0.h / 2) * u,
        toS = (x: number, y: number) => ({
          x: cx + (x * cam.s + cam.tx - cx) * back,
          y: cy + (y * cam.s + cam.ty - cy) * back,
        }),
        ip = toS(ixL, iyL),
        is = 52 * u * cam.s * back,
        iconR = centered(ip.x, ip.y, is, is, is * 0.22);
      const kp = sp(F, T.tile + 2, 1.5, 0.7),
        ku = sp(F, 990, 1.25, 0.84),
        a0 = mixR(iconR, tileR, kp),
        bob = Math.sin(((F - T.tile) / FPS) * 2.4) * 10 * u * kp * (1 - ku),
        a1 = mixR({ ...a0, y: a0.y + bob }, panelR, ku);
      const yaw = (-0.62 * ease.outCubic(prog(F, 902, 932)) + 0.98 * prog(F, 912, 1000)) * (1 - ku),
        roll = -0.11 * kp * (1 - ku) + 0.035 * Math.sin(Math.PI * prog(F, 990, 1040)) * (1 - prog(F, 1030, 1060)),
        lift = kp * (1 - 0.7 * ku);
      // the card it becomes: the panel folds into the first notification
      const kc = sp(F, T.cards, 1.8, 0.86),
        target = cardRect(cardY(0, F).y),
        a = mixR(a1, target, kc),
        contentA = 1 - prog(F, T.cards, T.cards + 14);
      // soft shadow: a blurred copy under the tile, further away the higher it is lifted
      const sw = lerp(0.88, 1, kc);
      shade(
        ctx,
        { ...a, x: a.x + (a.w * (1 - sw)) / 2, w: a.w * sw },
        lerp(0.3 + 0.15 * lift, 0.3, kc),
        lerp(26 + 20 * lift, 22, kc),
        lerp(20 + 40 * lift, 14, kc),
      );
      if (kc < 0.001) tile3d(ctx, a1, yaw, roll, ku, F, 1);
      else {
        fillR(ctx, a, rgba(WHITE, lerp(1, 0.94, kc)));
        if (contentA > 0)
          soft(ctx, E, [a.x, a.y, a.w, a.h], (1 - contentA) * 18 * u, contentA, (c) => {
            c.save();
            c.beginPath();
            rr(c, a.x, a.y, a.w, a.h, a.r);
            c.clip();
            c.translate(a.x + (a.w - panelR.w) / 2, a.y + (a.h - panelR.h) / 2);
            face(c, panelR.w, panelR.h, 1, F, 1);
            c.restore();
          });
        const inA = prog(F, T.cards + 12, T.cards + 30);
        soft(ctx, E, [a.x, a.y, a.w, a.h], (1 - inA) * 14 * u, inA, (c) => cardFace(c, a, 0, 1));
      }
    }
    // 6 · the notification stack (1110 → 1310) and 7 · the end card
    if (F >= 1112) {
      for (let k = 0; k < CARDS.length; k++) {
        if (F < CARDS[k].at - 2 && k > 0) continue;
        const { y, e } = cardY(k, F),
          over = clamp((yEdge - y) / pitch),
          blur = over * 18 * u,
          alpha = clamp(e * 1.6) * (1 - 0.8 * over) * (k < 3 ? 1 - prog(F, 1258, 1284) : 1),
          a = cardRect(y, lerp(0.9, 1, clamp(e)) * (1 - 0.04 * over));
        if (k === 3 && F >= 1268) continue; // the last card is the end card's pill (drawn below)
        if (alpha <= 0.003) continue;
        soft(ctx, E, [a.x - 10 * u, a.y - 10 * u, a.w + 20 * u, a.h + 40 * u], blur, alpha, (c) => {
          cardBody(c, a, 1);
          cardFace(c, a, k, 1);
        });
      }
    }
    if (F >= 1268) {
      const push = 1 + 0.06 * ease.inOutCubic(prog(F, 1300, 1440));
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(push, push);
      ctx.translate(-cx, -cy);
      const A = endLayout(ctx, ["find"], ["a", "free", "hour"]),
        B = endLayout(ctx, ["using"], ["Oriel"]),
        kx = ease.inOutCubic(prog(F, 1362, 1396)),
        px = lerp(A.px, B.px, kx),
        float = Math.sin(((F - 1300) / FPS) * 1.6) * 4 * u,
        pill = centered(px, A.py + float, pillEnd.w, pillEnd.h, pillEnd.h / 2),
        ke = sp(F, 1268, 1.7, 0.8),
        { y } = cardY(3, F),
        from = cardRect(y),
        a = mixR(scaleR(from, 1 / push), pill, ke),
        glassK = prog(F, 1274, 1298),
        contentA = 1 - prog(F, 1268, 1282);
      if (glassK < 1) {
        ctx.save();
        ctx.globalAlpha *= 1 - glassK;
        cardBody(ctx, a, 1);
        ctx.restore();
      }
      glass(ctx, a, glassK);
      if (contentA > 0)
        soft(ctx, E, [a.x, a.y, a.w, a.h], (1 - contentA) * 16 * u, contentA, (c) => cardFace(c, a, 3, 1));
      // a slow beacon from the pill once the mark is in it
      for (const at of [1334, 1370, 1406])
        ripple(ctx, a.x + a.w / 2, a.y + a.h / 2, F, at, a.h * 0.6, 440 * u, 56, 0.17);
      // the pill fills with the mark, with a sheen that keeps crossing the glass
      const km = sp(F, 1330, 2.6, 0.5);
      if (km > 0) markAt(ctx, a.x + a.w / 2, a.y + a.h / 2, 30 * u * (tall ? 1.12 : 1) * km);
      const sh = ((F - 1300) % 100) / 100;
      if (F > 1300 && glassK >= 1) {
        ctx.save();
        rr(ctx, a.x, a.y, a.w, a.h, a.r);
        ctx.clip();
        const sx = a.x - a.w + sh * a.w * 3,
          g = ctx.createLinearGradient(sx - 40 * u, 0, sx + 40 * u, 0);
        g.addColorStop(0, rgba(WHITE, 0));
        g.addColorStop(0.5, rgba(WHITE, 0.28));
        g.addColorStop(1, rgba(WHITE, 0));
        ctx.fillStyle = g;
        ctx.fillRect(a.x, a.y, a.w, a.h);
        ctx.restore();
      }
      A.words.forEach((p, i) => blurWord(ctx, p, F, 1298 + i * 6, 1356 + i * 3));
      B.words.forEach((p, i) => blurWord(ctx, p, F, 1374 + i * 8));
      ctx.restore();
    }
  };

  // ---- the shots only name the sections; the paint is one function of the frame
  const cuts = [T.hook, T.prompt, T.chain, T.window, T.tile, T.cards, T.end, N],
    names = ["hook", "prompt", "chain", "window", "tile", "cards", "end"];
  const shots: Shot[] = names.map((sid, i) => ({
    id: sid,
    start: cuts[i],
    end: cuts[i + 1],
    draw: (ctx, local, env) => paint(ctx, env, cuts[i] + local),
  }));
  const keys = [
    ...S_PROMPT.filter((_, i) => PROMPT[i] !== " "),
    ...S_NAME,
    ...S_AGENT.filter((_, i) => AGENT[i] !== " "),
    ...S_INSTR.filter((_, i) => i % 2 === 0 && INSTR[i] !== " "),
  ];
  return {
    meta: { title: id, W, H, fps: FPS, bpm: BPM, durationFrames: N, raster: "cpu" },
    assets: { images: {}, fonts: P.assets },
    shots,
    audio: withFoley(
      beatScore({
        frames: N,
        fps: FPS,
        bpm: BPM,
        mood: "soft",
        gain: 0.72,
        hits: [1330],
        whooshes: [200, 388, 412, 440, 510, 566, 934, 1030, 1104, 1296, 1394],
        ticks: [PRESS.send, PRESS.button, ...TOGGLES, ...CONNECT, PRESS.start],
      }),
      keys,
      CARDS.map((c) => c.at),
    ),
  };
}

export const morphLaunch = make("landscape", "morphLaunch");
export const morphLaunchVertical = make("vertical", "morphLaunchVertical");
