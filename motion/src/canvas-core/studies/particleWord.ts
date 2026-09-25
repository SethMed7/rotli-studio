// STUDY 07 · PARTICLE WORD (12 s, 60 fps). Several thousand particles on a deep navy ground: dust drifting in
// depth finds its places inside the letters of a word, releases into a rotating point-cloud sphere with two
// accent orbit rings, unrolls into a wave surface, folds into a vortex and gathers into one bright point that
// opens into the sign-off ring. One source, designed for landscape and square. Brand: the neutral pack.
// Brief: series/studies/briefs/particle-word.json · prompt: series/studies/prompts/particle-word.prompt.md
//
// The lesson: every particle has a HOME in every form (dust, word, sphere, wave) and a clock of its own (a
// per-particle delay). A morph is then only interpolation between two homes with a staggered spring, so the
// whole film is one continuous function paint(F) of a (fractional) frame F: no simulation state, motion blur
// samples inside the shutter, and any frame renders on its own.
import PACK from "../../../brand/packs/studio/pack.json";
import { rng, type Ctx, type Env } from "../core";
import type { Film, Shot } from "../film";
import { motionBlur } from "../kit/blur";
import { project, type Camera } from "../kit/depth";
import { clamp, ease, lerp, prog, spring } from "../kit/motion";
import { usePack } from "../kit/pack";
import { beatScore } from "../kit/score";
import { layout, type Size } from "../kit/sizes";
import { text } from "../kit/type";

const P = usePack(PACK),
  C = P.palette("deep"),
  F_ = P.face;
// 120 bpm: a 30-frame beat at 60 fps, the grid every cut sits on; the score plays at the same tempo.
const FPS = 60,
  BPM = 120,
  N = 720; // a timeline beat is 30 frames
// the timeline, in frames (every cut on a beat)
const T = { word: 120, sphere: 270, wave: 420, vortex: 570, sign: 660 };
const WORD_DONE = 240; // the last letters settle here: the hit, and a glint runs through the word
const FORMS: [number, string][] = [
  [0, "01 DUST"],
  [T.word, "02 WORD"],
  [T.sphere, "03 SPHERE"],
  [T.wave, "04 WAVE"],
  [T.vortex, "05 POINT"],
];
const NP = 3200; // particles
const TAU = Math.PI * 2;
const GOLD = Math.PI * (3 - Math.sqrt(5));
// colour classes, drawn in this order (far to near)
const MUTED = 0,
  INK = 1,
  HOT = 2;

// ---- every particle's own numbers: its dust life, its accent flag, its place on the unit sphere, its clock
const R = rng(707);
const rnd = (n: number) => Float32Array.from({ length: n }, () => R());
const PT = {
  bx: rnd(NP),
  by: rnd(NP),
  depth: Float32Array.from(rnd(NP), (v) => v ** 1.7), // most dust is far; a few motes are near
  wobP: rnd(NP),
  wobF: rnd(NP),
  shim: rnd(NP),
  curl: Float32Array.from(rnd(NP), (v) => (v - 0.5) * 0.7),
  clock: rnd(NP),
  hot: Uint8Array.from(rnd(NP), (v, i) => (i === 0 || v < 0.035 ? 1 : 0)),
  // a Fibonacci sphere: evenly spread, and even in sin(latitude), so its equal-area unrolling is even too
  sx: new Float32Array(NP),
  sy: new Float32Array(NP),
  sz: new Float32Array(NP),
};
for (let i = 0; i < NP; i++) {
  const y = 1 - (2 * (i + 0.5)) / NP,
    r = Math.sqrt(1 - y * y),
    a = i * GOLD;
  PT.sx[i] = Math.cos(a) * r;
  PT.sy[i] = y;
  PT.sz[i] = Math.sin(a) * r;
}
const SIGN_RING = 90; // particles that become the sign-off ring; the next SIGN_DUST drift out of the point
const SIGN_DUST = 520;

export function make(size: Size, id: string): Film {
  const L = layout(size),
    { W, H, u, cx, cy } = L,
    square = size === "square";

  // ---- per-size design
  const WORD = square ? { lines: ["ORI", "EL"], size: 330 * u, gap: 1.0 } : { lines: ["ORIEL"], size: 360 * u, gap: 1 };
  const SPHERE_R = (square ? 0.8 : 0.92) * 300 * u; // on-screen radius of the sphere at its centre
  const WAVE_X = square ? 2.25 : 3.3; // half-width of the wave surface, in sphere radii
  const RING_Y = cy - (square ? 96 : 84) * u; // the point, then the sign-off ring
  const scratch = {
    x: new Float32Array(NP),
    y: new Float32Array(NP),
    s: new Float32Array(NP),
    a: new Float32Array(NP),
    c: new Uint8Array(NP),
  };

  // ---- home 1, dust: a closed-form drift (base + velocity · t + a slow wobble), near motes larger and brighter
  const dust = (i: number, F: number) => {
    const t = F / FPS,
      d = PT.depth[i]!,
      w = 0.25 + 0.5 * PT.wobF[i]!,
      ph = PT.wobP[i]! * TAU;
    let x = (-0.08 + 1.16 * PT.bx[i]!) * W + (10 + 46 * d) * u * t + (8 + 26 * d) * u * Math.sin(w * t + ph);
    let y = (-0.08 + 1.16 * PT.by[i]!) * H - (4 + 16 * d) * u * t + (6 + 18 * d) * u * Math.cos(0.8 * w * t + ph);
    let s = (0.9 + 4.6 * d * d) * u,
      a = 0.24 + 0.76 * d ** 1.1,
      c = d < 0.42 ? MUTED : INK;
    if (i === 0) {
      // the one accent particle that crosses the frame in the hook
      const k = lerp(prog(F, 8, 116), ease.inOutCubic(prog(F, 8, 116)), 0.35);
      x = lerp(-0.05 * W, 1.05 * W, k);
      y = lerp(0.72, 0.32, k) * H + 70 * u * Math.sin(k * Math.PI);
      s = 7 * u;
      a = 1;
      a = 0; // drawn by crosser(), sharp
      c = HOT; // the only accent in the hook: the other accent particles show their colour once they find a form
    }
    return { x, y, s, a, c };
  };

  // ---- home 2, the word: sampled from the word's own pixels on an offscreen canvas (once per env)
  const wordLines = (ctx: Ctx, color: string, alpha = 1) => {
    const o = { size: WORD.size, family: F_.sans, weight: 800, color, align: "center" as const, track: 0.02, alpha },
      capH = WORD.size * 0.727,
      lh = capH + WORD.size * 0.22 * WORD.gap,
      top = cy - (lh * (WORD.lines.length - 1) + capH) / 2;
    WORD.lines.forEach((s, k) => text(ctx, s, cx, top + capH + k * lh, o));
  };
  const wordHomes = (env: Env) => {
    const key = `pw:word:${size}`;
    const hit = env.cache.get(key) as
      | { x: Float32Array; y: Float32Array; delay: Float32Array; along: Float32Array }
      | undefined;
    if (hit) return hit;
    const layer = env.canvas(W, H),
      c = layer.ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, W, H);
    wordLines(c, "#ffffff");
    const px = c.getImageData(0, 0, W, H).data,
      lit = (x: number, y: number) => px[(Math.round(y) * W + Math.round(x)) * 4 + 3]! > 127;
    let area = 0,
      x0 = W,
      x1 = 0;
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++)
        if (px[(y * W + x) * 4 + 3]! > 127) {
          area++;
          x0 = Math.min(x0, x);
          x1 = Math.max(x1, x);
        }
    // a jittered grid a little denser than NP, so the letters fill evenly (no clumps, no holes)
    const g = Math.sqrt(area / NP) * 0.97,
      J = rng(31),
      pts: [number, number][] = [];
    for (let y = g / 2; y < H; y += g)
      for (let x = g / 2; x < W; x += g) {
        const jx = x + (J() - 0.5) * g * 0.7,
          jy = y + (J() - 0.5) * g * 0.7;
        if (jx >= 0 && jx < W && jy >= 0 && jy < H && lit(jx, jy)) pts.push([jx, jy]);
      }
    for (let i = pts.length - 1; i > 0; i--) {
      const j = Math.floor(J() * (i + 1));
      [pts[i], pts[j]] = [pts[j]!, pts[i]!];
    }
    const out = {
      x: new Float32Array(NP),
      y: new Float32Array(NP),
      delay: new Float32Array(NP),
      along: new Float32Array(NP),
    };
    for (let i = 0; i < NP; i++) {
      const p = pts[i % pts.length]!,
        dup = i >= pts.length ? 1 : 0;
      out.x[i] = p[0] + dup * (J() - 0.5) * g;
      out.y[i] = p[1] + dup * (J() - 0.5) * g;
      // its own clock: the word assembles left to right, loosely
      out.delay[i] = 76 * (0.55 * ((out.x[i]! - x0) / Math.max(1, x1 - x0)) + 0.45 * PT.clock[i]!);
      // where the glint that marks the finished word passes it: a diagonal sweep, left to right
      out.along[i] = (out.x[i]! - x0 + 0.35 * (out.y[i]! - cy)) / Math.max(1, x1 - x0);
    }
    env.cache.set(key, out);
    return out;
  };
  const wordAt = (Wd: ReturnType<typeof wordHomes>, i: number, F: number) => {
    const t = F / FPS,
      ph = PT.shim[i]! * TAU,
      push = 1 + 0.06 * ease.inOutCubic(prog(F, T.word + 50, T.sphere + 30)), // a slow push-in on the hold
      glint = Math.exp(-(((Wd.along[i]! - lerp(-0.25, 1.25, prog(F, WORD_DONE - 4, T.sphere + 6))) / 0.09) ** 2));
    const x = cx + (Wd.x[i]! - cx) * push + 0.7 * u * Math.sin(t * 2.1 + ph),
      y = cy + (Wd.y[i]! - cy) * push + 0.7 * u * Math.cos(t * 1.7 + ph);
    const shimmer = 0.5 + 0.5 * Math.sin(t * (2.2 + 2.6 * PT.shim[i]!) + ph * 3);
    return { x, y, s: (3.3 + 2.0 * glint) * u, a: lerp(0.68 + 0.32 * shimmer, 1, glint), c: PT.hot[i] ? HOT : INK };
  };

  // ---- home 3, the sphere: a rotating point cloud, lit by depth
  const sphereCam = (F: number): Camera => ({
    yaw: 0.4 + 0.42 * ((F - T.sphere) / FPS),
    pitch: 0.32 + 0.06 * Math.sin((F - T.sphere) / FPS),
    dist: 3.4,
    focal: SPHERE_R * 3.4,
    cx,
    cy,
  });
  const sphereAt = (i: number, F: number, cam: Camera) => {
    const t = (F - T.sphere) / FPS,
      breathe = 1 + 0.035 * Math.sin(PT.sy[i]! * 5 + t * 2.4 + PT.clock[i]! * 2); // a living surface
    const q = project([PT.sx[i]! * breathe, PT.sy[i]! * breathe, PT.sz[i]! * breathe], cam),
      front = clamp((4.4 - q.z) / 2); // 1 on the near face, 0 on the far one
    return {
      x: q.x,
      y: q.y,
      s: (1.3 + 2.0 * front) * u,
      a: 0.22 + 0.78 * front,
      c: PT.hot[i] ? HOT : front < 0.35 ? MUTED : INK,
    };
  };
  const sphereDelay = (i: number) => 38 * PT.clock[i]!;

  // ---- home 4, the wave: the sphere unrolled (equal-area: longitude across, height in depth), rippling toward us
  const YAW_U = sphereCam(T.wave).yaw;
  const unroll = new Float32Array(NP),
    unrollDelay = new Float32Array(NP);
  for (let i = 0; i < NP; i++) {
    const c = Math.cos(YAW_U),
      s = Math.sin(YAW_U),
      x1 = PT.sx[i]! * c - PT.sz[i]! * s,
      z1 = PT.sx[i]! * s + PT.sz[i]! * c,
      lon = Math.atan2(x1, -z1); // 0 on the face turned toward us
    unroll[i] = lon / Math.PI;
    unrollDelay[i] = 48 * Math.abs(unroll[i]!) + 14 * PT.clock[i]!; // the front peels first, the back seam last
  }
  const waveCam = (F: number): Camera => ({
    yaw: 0.1 * Math.sin((F - T.wave) / FPS / 1.6),
    pitch: 0.62,
    dist: 4.2,
    focal: SPHERE_R * 3.4,
    cx,
    cy: cy - (square ? 70 : 90) * u,
  });
  const waveAt = (i: number, F: number, cam: Camera) => {
    const t = (F - T.wave) / FPS,
      x = unroll[i]! * WAVE_X,
      z = -PT.sy[i]! * 1.35, // the sphere's top becomes the far edge
      h = 0.26 * Math.sin(3.1 * z + 3.0 * t + 0.9 * Math.sin(1.1 * x + 0.7 * t)) * (0.7 + 0.3 * Math.cos(0.8 * x - t)); // crests travel toward the viewer
    const q = project([x, h + 0.15, z], cam),
      near = clamp((5.5 - q.z) / 2.4),
      crest = clamp(0.5 - h * 2.2), // crests catch the light
      side = clamp(Math.min(q.x, W - q.x) / (0.14 * W)); // the surface fades out at the frame's sides
    return {
      x: q.x,
      y: q.y,
      s: (1.1 + 2.8 * near) * u,
      a: (0.3 + 0.7 * near) * (0.6 + 0.4 * crest) * (0.25 + 0.75 * side),
      c: PT.hot[i] ? HOT : near < 0.3 ? MUTED : INK,
    };
  };

  // one step of interpolation between two homes, on the particle's own clock, along a gentle curve
  const blend = (i: number, A: Home, B: Home, k: number) => {
    const m = clamp(k, 0, 1.2),
      bow = Math.sin(Math.PI * clamp(k)) * PT.curl[i]!,
      dx = B.x - A.x,
      dy = B.y - A.y;
    scratch.x[i] = A.x + dx * m - dy * bow;
    scratch.y[i] = A.y + dy * m + dx * bow;
    scratch.s[i] = lerp(A.s, B.s, clamp(k));
    scratch.a[i] = lerp(A.a, B.a, clamp(k));
    scratch.c[i] = k < 0.5 ? A.c : B.c;
  };
  const put = (i: number, A: Home) => {
    scratch.x[i] = A.x;
    scratch.y[i] = A.y;
    scratch.s[i] = A.s;
    scratch.a[i] = A.a;
    scratch.c[i] = A.c;
  };

  // ---- fill the scratch arrays with every particle's state at frame F
  const state = (env: Env, F: number) => {
    const Wd = F >= T.word - 1 ? wordHomes(env) : null;
    if (F < T.word) for (let i = 0; i < NP; i++) put(i, dust(i, F));
    else if (F < T.sphere)
      for (let i = 0; i < NP; i++) {
        const k = spring((F - T.word - Wd!.delay[i]!) / FPS, { freq: 1.45, damp: 0.8 });
        if (k <= 0) put(i, dust(i, F));
        else blend(i, dust(i, F), wordAt(Wd!, i, F), k);
      }
    else if (F < T.wave) {
      const cam = sphereCam(F);
      for (let i = 0; i < NP; i++) {
        const k = spring((F - T.sphere - sphereDelay(i)) / FPS, { freq: 1.2, damp: 0.78 });
        if (k <= 0) put(i, wordAt(Wd!, i, F));
        else blend(i, wordAt(Wd!, i, F), sphereAt(i, F, cam), k);
      }
    } else {
      const sc = sphereCam(F),
        wc = waveCam(F);
      for (let i = 0; i < NP; i++) {
        const k = spring((F - T.wave - unrollDelay[i]!) / FPS, { freq: 1.1, damp: 0.8 });
        if (k <= 0) put(i, sphereAt(i, F, sc));
        else if (F >= T.vortex) put(i, waveAt(i, F, wc));
        else blend(i, sphereAt(i, F, sc), waveAt(i, F, wc), k);
      }
      if (F >= T.vortex) vortex(F);
    }
  };

  // ---- the vortex: the wave's points spiral into one point, the inner ones first
  const vortex = (F: number) => {
    const rMax = Math.hypot(W, H) * 0.55;
    for (let i = 0; i < NP; i++) {
      const dx = scratch.x[i]! - cx,
        dy = scratch.y[i]! - RING_Y,
        r0 = Math.hypot(dx, dy),
        rn = clamp(r0 / rMax),
        start = T.vortex + 4 + 30 * rn + 8 * PT.clock[i]!,
        e = ease.inOutCubic(prog(F, start, start + 50)),
        swirl = ease.inCubic(prog(F, T.vortex, T.sign - 10)) * 2.2 + 5.2 * e ** 1.4,
        r = r0 * (1 - e) ** 1.35,
        th = Math.atan2(dy, dx) + swirl;
      scratch.x[i] = cx + Math.cos(th) * r;
      scratch.y[i] = RING_Y + Math.sin(th) * r * lerp(1, 0.82, e);
      scratch.s[i] = scratch.s[i]! * lerp(1.25, 0.8, e);
      scratch.a[i] = lerp(scratch.a[i]!, 1, e) * (1 - prog(e, 0.93, 1));
    }
  };

  // ---- draw the scratch arrays: batched by colour and quantised alpha (a few dozen fills, not thousands)
  const COLORS = [C.muted, C.ink, C.accent],
    LEVELS = 12;
  const buckets = Array.from({ length: 3 * LEVELS }, () => new Int32Array(NP)),
    counts = new Int32Array(3 * LEVELS);
  // the corner labels' boxes (padded): particles never pass under the words that name them
  const HUD_M = L.safe.x,
    HUD_TOP = L.safe.top + 22 * u,
    HUD_BOT = H - L.safe.bottom,
    CH = 22 * u * 0.68, // a JetBrains Mono advance plus its tracking, at 22 px
    HUD_BOXES: [number, number, number, number][] = [
      [HUD_M - 16 * u, HUD_TOP - 34 * u, HUD_M + 30 * CH + 16 * u, HUD_TOP + 16 * u],
      [W - HUD_M - 14 * CH - 16 * u, HUD_TOP - 34 * u, W - HUD_M + 16 * u, HUD_TOP + 16 * u],
      [HUD_M - 16 * u, HUD_BOT - 34 * u, HUD_M + 11 * CH + 16 * u, HUD_BOT + 16 * u],
      [W - HUD_M - 176 * u, HUD_BOT - 26 * u, W - HUD_M + 16 * u, HUD_BOT + 12 * u],
    ];
  const hudClear = (x: number, y: number) => {
    let k = 1;
    for (const [a, b, c, d] of HUD_BOXES) {
      const out = Math.max(a - x, x - c, b - y, y - d); // < 0 inside the box
      if (out < 14 * u) k = Math.min(k, clamp(out / (14 * u)));
    }
    return k;
  };
  let hudA = 0;
  const drawParticles = (ctx: Ctx) => {
    counts.fill(0);
    for (let i = 0; i < NP; i++) {
      const x = scratch.x[i]!,
        y = scratch.y[i]!,
        a = scratch.a[i]! * (hudA > 0.01 ? lerp(1, hudClear(x, y), hudA) : 1); // the labels keep a clear field
      if (a <= 0.02 || scratch.s[i]! <= 0.05) continue;
      if (x < -20 || y < -20 || x > W + 20 || y > H + 20) continue;
      const b = scratch.c[i]! * LEVELS + Math.min(LEVELS - 1, Math.floor(a * LEVELS));
      buckets[b]![counts[b]!++] = i;
    }
    for (let b = 0; b < 3 * LEVELS; b++) {
      if (!counts[b]) continue;
      ctx.globalAlpha = ((b % LEVELS) + 0.5) / LEVELS;
      ctx.fillStyle = COLORS[Math.floor(b / LEVELS)]!;
      ctx.beginPath();
      for (let k = 0; k < counts[b]!; k++) {
        const i = buckets[b]![k]!,
          r = scratch.s[i]! / 2,
          x = scratch.x[i]!,
          y = scratch.y[i]!;
        if (r < 1.1) ctx.rect(x - r, y - r, 2 * r, 2 * r);
        else {
          ctx.moveTo(x + r, y);
          ctx.arc(x, y, r, 0, TAU);
        }
      }
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  // ---- the hook's accent particle: drawn sharp over the blurred frame (a blurred 7 px dot would average to
  // nothing), as a head and a tapering tail along its own path. Flat colour, no glow.
  const crosser = (ctx: Ctx, F: number) => {
    if (F < 6 || F > 122) return;
    const tail = 26;
    ctx.strokeStyle = C.accent;
    ctx.lineCap = "round";
    for (let k = 0; k < tail; k++) {
      const p = dust(0, F - k * 0.55),
        q = dust(0, F - (k + 1) * 0.55),
        f = 1 - k / tail;
      ctx.globalAlpha = 0.85 * f;
      ctx.lineWidth = 6 * u * f;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(q.x, q.y);
      ctx.stroke();
    }
    const h = dust(0, F);
    ctx.globalAlpha = 1;
    ctx.fillStyle = C.accent;
    ctx.beginPath();
    ctx.arc(h.x, h.y, 5 * u, 0, TAU);
    ctx.fill();
  };

  // ---- two thin accent orbit rings around the sphere (back halves behind the cloud, front halves over it)
  const ringPts = (F: number, which: number) => {
    const cam = sphereCam(F),
      t = (F - T.sphere) / FPS,
      rad = which ? 1.42 : 1.24,
      tilt = which ? -0.95 + 0.12 * Math.sin(t * 0.9) : 1.2 + 0.1 * Math.sin(t * 0.7 + 1),
      spin = which ? 0.7 : -0.35,
      ct = Math.cos(tilt),
      st = Math.sin(tilt),
      cs = Math.cos(spin),
      ss = Math.sin(spin);
    return (a: number) => {
      const x0 = Math.cos(a) * rad,
        z0 = Math.sin(a) * rad,
        y = -z0 * st,
        z = z0 * ct;
      return project([x0 * cs - z * ss, y, x0 * ss + z * cs], cam);
    };
  };
  const rings = (ctx: Ctx, F: number, front: boolean) => {
    if (F < T.sphere + 10 || F > T.wave + 40) return;
    const leave = ease.inCubic(prog(F, T.wave, T.wave + 36));
    for (let w = 0; w < 2; w++) {
      const draw = ease.inOutCubic(prog(F, T.sphere + 18 + w * 12, T.sphere + 78 + w * 12)),
        at = ringPts(F, w),
        seg = 160,
        a0 = w * 1.7 + ((F - T.sphere) / FPS) * 0.25 + leave * 2.5, // the draw-on head sweeps forward
        span = TAU * draw * (1 - leave);
      if (span <= 0) continue;
      ctx.strokeStyle = C.accent;
      ctx.lineWidth = 1.8 * u;
      ctx.lineCap = "round";
      for (let k = 0; k < seg; k++) {
        const aa = a0 + (span * k) / seg,
          ab = a0 + (span * (k + 1)) / seg,
          p = at(aa),
          q = at(ab),
          isFront = (p.z + q.z) / 2 < 3.4;
        if (isFront !== front) continue;
        ctx.globalAlpha = front ? 0.95 : 0.4;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(q.x, q.y);
        ctx.stroke();
      }
      // a bead rides each ring, just ahead of the drawn line
      const b = at(a0 + span),
        bf = b.z < 3.4;
      if (bf === front && draw > 0.02) {
        ctx.globalAlpha = (front ? 1 : 0.5) * (1 - leave);
        ctx.fillStyle = C.accent;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 5.5 * u * (b.k / ((SPHERE_R * 3.4) / 3.4)) * 0.9, 0, TAU);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  };

  // ---- the point, then the ring it opens into, then the name beneath it
  const point = (ctx: Ctx, F: number) => {
    if (F < T.vortex + 30) return;
    const gather = ease.outCubic(prog(F, T.vortex + 30, T.sign - 4)),
      open = spring((F - T.sign) / FPS, { freq: 1.8, damp: 0.62 }),
      rr = lerp(4 * u, 58 * u, open),
      dotR = (4 + 12 * gather) * u * (1 - clamp(open * 1.3));
    if (dotR > 0.2) {
      ctx.fillStyle = C.ink;
      ctx.beginPath();
      ctx.arc(cx, RING_Y, dotR, 0, TAU);
      ctx.fill();
    }
    if (F >= T.sign) {
      ctx.strokeStyle = C.accent;
      ctx.lineWidth = lerp(10, 3, clamp(open)) * u;
      ctx.beginPath();
      ctx.arc(cx, RING_Y, rr, 0, TAU);
      ctx.stroke();
    }
  };
  // after the point opens: a bead circles the ring and a little dust drifts back out of it (the hold keeps moving)
  const signOff = (ctx: Ctx, F: number) => {
    if (F < T.sign) return;
    const t = (F - T.sign) / FPS,
      open = spring(t, { freq: 1.8, damp: 0.62 }),
      J = SIGN_RING + SIGN_DUST;
    // released dust, decelerating outward
    ctx.fillStyle = C.ink;
    for (let i = SIGN_RING; i < J; i++) {
      const a = PT.bx[i]! * TAU,
        v = (60 + 260 * PT.by[i]! ** 2) * u,
        d = (v * (1 - Math.exp(-t * 1.6))) / 1.6 + 30 * u * t,
        x = cx + Math.cos(a) * (d + 20 * u),
        y = RING_Y + Math.sin(a) * (d + 20 * u) * 0.9;
      ctx.globalAlpha = (0.15 + 0.4 * PT.depth[i]!) * prog(t, 0.05, 0.3);
      const s = (0.9 + 1.8 * PT.depth[i]!) * u;
      ctx.fillRect(x - s / 2, y - s / 2, s, s);
    }
    // ring beads
    for (let i = 0; i < SIGN_RING; i++) {
      const a = (i / SIGN_RING) * TAU + t * 0.5,
        rr = lerp(4, 58, open) * u + 9 * u + 2 * u * Math.sin(a * 3 + t * 3);
      ctx.globalAlpha = 0.55 * prog(t, 0.1, 0.4);
      ctx.fillRect(cx + Math.cos(a) * rr - u, RING_Y + Math.sin(a) * rr - u, 2 * u, 2 * u);
    }
    ctx.globalAlpha = 1;
    const bead = -Math.PI / 2 + t * 2.2,
      br = lerp(4, 58, open) * u;
    ctx.fillStyle = C.ink;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(bead) * br, RING_Y + Math.sin(bead) * br, 5 * u * clamp(open), 0, TAU);
    ctx.fill();
  };
  const lockup = (ctx: Ctx, F: number) => {
    if (F < T.sign) return;
    const f = F - T.sign,
      push = 1 + 0.03 * ease.outCubic(prog(F, T.sign, N)),
      a1 = ease.outCubic(prog(f, 8, 26)),
      a2 = ease.outCubic(prog(f, 18, 36));
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(push, push);
    ctx.translate(-cx, -cy);
    const name = { size: 118 * u, family: F_.sans, weight: 600, color: C.ink, align: "center" as const, track: -0.03 };
    text(ctx, P.product, cx, cy + (104 + 14 * (1 - a1)) * u, { ...name, alpha: a1 });
    text(ctx, "every hour, found", cx, cy + (170 + 12 * (1 - a2)) * u, {
      size: 46 * u,
      family: F_.italic,
      color: C.muted,
      align: "center",
      alpha: a2,
    });
    ctx.restore();
  };

  // ---- quiet corner labels: what this is, and which form the particles hold (read, not watched: drawn sharp)
  const mono = (ctx: Ctx, s: string, x: number, y: number, align: CanvasTextAlign, color: string, alpha: number) =>
    text(ctx, s, x, y, { size: 22 * u, family: F_.mono, weight: 500, color, align, track: 0.08, alpha });
  const hudAlpha = (F: number) => prog(F, 8, 36) * (1 - prog(F, T.sign - 20, T.sign));
  const hud = (ctx: Ctx, F: number) => {
    const a = hudAlpha(F),
      m = HUD_M,
      top = HUD_TOP,
      bot = HUD_BOT;
    if (a <= 0) return;
    const form = [...FORMS].reverse().find(([s]) => F >= s)!;
    const since = prog(F, form[0], form[0] + 16);
    mono(ctx, `${P.product.toUpperCase()} · PARTICLE STUDY`, m, top, "left", C.muted, a);
    mono(ctx, `${NP.toLocaleString("en-US").replace(",", " ")} POINTS`, W - m, top, "right", C.muted, a);
    mono(ctx, form[1], m, bot, "left", C.ink, a * since);
    // a thin rule that fills over the film, the one accent in the frame chrome
    const rw = 160 * u,
      rx = W - m - rw;
    ctx.globalAlpha = a;
    ctx.fillStyle = C.line;
    ctx.fillRect(rx, bot - 8 * u, rw, 2 * u);
    ctx.fillStyle = C.accent;
    ctx.fillRect(rx, bot - 8 * u, rw * clamp(F / (T.sign - 1)), 2 * u);
    ctx.globalAlpha = 1;
  };

  const paint = (ctx: Ctx, env: Env, F: number) => {
    F = clamp(F, 0, N - 1);
    ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
    ctx.fillStyle = C.ground;
    ctx.fillRect(0, 0, W, H);
    hudA = hudAlpha(F);
    if (F < T.sign) {
      state(env, F);
      rings(ctx, F, false);
      drawParticles(ctx);
      rings(ctx, F, true);
    }
    point(ctx, F);
    signOff(ctx, F);
    lockup(ctx, F);
  };

  const cuts = [0, T.word, T.sphere, T.wave, T.vortex, T.sign, N],
    names = ["dust", "word", "sphere", "wave", "vortex", "signoff"];
  const shots: Shot[] = names.map((sid, i) => ({
    id: sid,
    start: cuts[i]!,
    end: cuts[i + 1]!,
    draw: (ctx, local, env) => {
      motionBlur(ctx, env, (c, dt) => paint(c, env, cuts[i]! + local + dt), { samples: 4, shutter: 0.5 });
      ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
      crosser(ctx, cuts[i]! + local);
      hud(ctx, cuts[i]! + local);
    },
  }));
  return {
    meta: { title: id, W, H, fps: FPS, bpm: BPM, durationFrames: N, raster: "cpu" },
    assets: { images: {}, fonts: P.assets },
    shots,
    audio: beatScore({
      frames: N,
      fps: FPS,
      bpm: BPM,
      mood: "soft",
      whooshes: [T.word, T.sphere, T.wave, T.vortex, T.sign],
      hits: [WORD_DONE],
      sign: T.sign + 4,
      gain: 0.71,
    }),
  };
}
type Home = { x: number; y: number; s: number; a: number; c: number };

export const particleWord = make("landscape", "particleWord");
export const particleWordSquare = make("square", "particleWordSquare");
