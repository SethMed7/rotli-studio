// STUDY 63 · LIGHT TRAILS (4 s, 60 fps, a seamless loop). A SECONDS study: no words, the style is the whole piece.
// Long-exposure light painting on black. Five points of light trace harmonograph and Lissajous curves, each
// trailing a glowing, tapered streak of the last 0.8 s of its path; where streaks cross the light adds. Two of the
// lights kiss on frame 0 with a small star glint (the loop is met mid-motion, so the meeting point lands). On the
// bar-2 downbeat (frame 120) every curve spirals into one point at the centre, flares, and springs apart again.
// One source, designed for square (the hero) and vertical (taller figures, the convergence centred a little high).
// Brief: series/studies/briefs/light-trails.json · prompt: series/studies/prompts/light-trails.prompt.md
// After light painting, the long-exposure photography technique (https://en.wikipedia.org/wiki/Light_painting),
// and harmonograph curves. No photograph is reproduced.
//
// A long exposure needs no history. A light's position is a closed-form function of the frame: a sum of sines with
// whole-number frequencies per loop (so every curve closes in exactly 240 frames), scaled and twisted about the
// centre by one convergence envelope. Its trail is that same function sampled BACKWARDS over the last 48 frames and
// drawn fresh every frame as a tapered line whose width and alpha fade toward the tail. Light is added
// (globalCompositeOperation "lighter"), and the glow is the same trails drawn wide into a quarter-size offscreen
// canvas, mipped down twice and added back scaled up (a cheap bloom, no ctx.filter). Every envelope either wraps
// round the loop or reaches its resting value before frame 240, so the last frame meets the first.
import PACK from "../../../brand/packs/studio/pack.json";
import { rng, type Ctx, type Env, type Layer } from "../core";
import type { Film, Shot } from "../film";
import { clamp, ease, prog } from "../kit/motion";
import { usePack } from "../kit/pack";
import { beatScore } from "../kit/score";
import { layout, type Size } from "../kit/sizes";

const P = usePack(PACK),
  C = P.palette("trails");
const FPS = 60,
  BPM = 120,
  N = 240, // two bars: a beat is 30 frames, bar 2's downbeat is frame 120
  TAU = Math.PI * 2;
// the story, in frames (each on the beat grid)
const T = { weave: 0, gather: 90, hit: 120, spring: 150 };
const TRAIL = 48, // frames of exposure behind each light (0.8 s)
  SEG = 112; // segments per trail (more than two per frame of exposure)

const wrap = (F: number) => ((F % N) + N) % N;
/** signed distance in frames from `at`, wrapped into (-N/2, N/2] */
const around = (F: number, at: number) => {
  const d = wrap(F - at);
  return d > N / 2 ? d - N : d;
};
const smooth = (t: number) => t * t * (3 - 2 * t);
const hexA = (hex: string, a: number) => {
  const v = parseInt(hex.slice(1), 16);
  return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${clamp(a)})`;
};

// ---- the convergence: 1 (the free figure) until the gather, which starts on beat 3 with the pre-pulse and eases in
// (cubic) to exactly 0 on frame 120, so the whole trail at the downbeat is the spiral in; a two-frame hold inside
// the flare (the trails keep pouring in behind); then a spring back out, staggered two frames per light so they peel
// away as a pinwheel. The spring is damped to about 9 % overshoot and the overshoot is halved again (soft limit),
// then windowed to exactly 1 by frame 228, well before the loop wraps.
const GATHER_FROM = 60,
  HOLD = 2,
  STAGGER = 2;
const gather = (F: number, i: number) => {
  F = wrap(F);
  if (F < GATHER_FROM) return 1;
  if (F <= T.hit) return 1 - prog(F, GATHER_FROM, T.hit) ** 3;
  const d = F - T.hit - HOLD - i * STAGGER;
  if (d <= 0) return 0;
  const w = 0.11, // rad per frame
    z = 0.6,
    wd = w * Math.sqrt(1 - z * z),
    s = 1 - Math.exp(-z * w * d) * (Math.cos(wd * d) + ((z * w) / wd) * Math.sin(wd * d)),
    g = s > 1 ? 1 + 0.5 * (s - 1) : s;
  return 1 + (g - 1) * (1 - smooth(prog(F, 186, 228)));
};
// the impact on the downbeat: a near-instant rise and a soft decay, windowed to exactly 0 before the loop wraps
const punch = (F: number) => {
  F = wrap(F);
  const d = (F - T.hit + 1) / FPS; // one frame early, so frame 120 itself carries the hit
  return d > 0 ? (1 - Math.exp(-d * 70)) * Math.exp(-d * 3.6) * (1 - ease.inOutCubic(prog(F, 176, 226))) : 0;
};
// exposure: the lights brighten as they gather and burn hot through the flare
const boost = (F: number) => {
  F = wrap(F);
  if (F < 84 || F > 200) return 0;
  return F <= T.hit ? ease.inCubic(prog(F, 84, T.hit)) : 1 - ease.outCubic(prog(F, T.hit, 200));
};
// frame 0 lands: a short pulse centred exactly on the loop point (wraps the seam), which lights the kiss glint and
// lifts every streak for a moment
const pulse0 = (F: number) => Math.exp(-((around(F, 0) / 8) ** 2));
// the pre-pulse on beat 3 (frame 60): the camera draws a quick breath in, the heads glint and the light lifts,
// setting up the hit (a four-frame rise into frame 60, a short decay, exactly 0 by frame 83). It lives in the camera,
// applied once per frame, so it is never printed into the trails.
const pulse60 = (F: number) => {
  const d = wrap(F) - 60;
  if (d <= -4 || d >= 23) return 0;
  return d <= 0 ? ease.inOutCubic(prog(d, -4, 0)) : Math.exp(-d / 9) * (1 - smooth(prog(d, 10, 23)));
};
// and the whole exposure opens a little round frame 0 (wraps)
const crest = (F: number) => (0.5 + 0.5 * Math.cos((TAU * F) / N)) ** 6;

// ---- the lights: per size, five curves x(t), y(t) as sums of [amplitude (px at 1080), frequency (whole cycles per
// loop), phase], with no high harmonics, so nothing has a cusp. They are composed as families: orange and blue are
// one Lissajous transposed (3:2 and 2:3), aimed so their heads meet at KISS on frame 0; gold and violet are one
// epicycle (a slow circle carrying a small counter-turning one) rotated half a turn, so they always ride opposite
// each other; the white light is a smaller epicycle turning the other way inside them.
type Term = [number, number, number];
type Ink = "accent" | "accent2" | "s1" | "s2" | "ink";
type Light = { ink: Ink; x: Term[]; y: Term[]; w: number; a: number };
const Q = Math.PI / 2;
/** an epicycle: a circle of radius R turning f times per loop, carrying one of radius r turning g times; sx, sy
 * stretch it for the frame, rot adds a phase to both */
const epi = (R: number, f: number, r: number, g: number, p: number, sx: number, sy: number, rot = 0) => ({
  x: [
    [R * sx, f, Q + rot],
    [r * sx, g, Q + p + rot],
  ] as Term[],
  y: [
    [R * sy, f, rot],
    [r * sy, g, p + rot],
  ] as Term[],
});
const SQUARE: Light[] = [
  { ink: "accent", x: [[300, 3, 0]], y: [[290, 2, 0]], w: 1, a: 1 },
  { ink: "accent2", x: [[290, 2, 0]], y: [[300, 3, 0]], w: 1, a: 1 },
  { ink: "s1", ...epi(260, 2, 50, -3, 0.6, 1, 1), w: 0.9, a: 0.9 },
  { ink: "s2", ...epi(260, 2, 50, -3, 0.6, 1, 1, Math.PI), w: 0.9, a: 0.9 },
  { ink: "ink", ...epi(130, -3, 34, 4, 1.1, 1, 1), w: 0.6, a: 0.65 },
];
const TALL: Light[] = [
  { ink: "accent", x: [[270, 3, 0]], y: [[600, 2, 0]], w: 1, a: 1 },
  { ink: "accent2", x: [[280, 2, 0]], y: [[590, 1, 0]], w: 1, a: 1 },
  { ink: "s1", ...epi(235, 2, 45, -3, 0.6, 1, 2.25), w: 0.9, a: 0.9 },
  { ink: "s2", ...epi(235, 2, 45, -3, 0.6, 1, 2.25, Math.PI), w: 0.9, a: 0.9 },
  { ink: "ink", ...epi(120, -3, 30, 4, 1.1, 1, 2.2), w: 0.6, a: 0.65 },
];
/** set the first term's phase so the sum is `target` at t = 0 (the other terms keep theirs); `back` picks the branch
 * that moves the other way through the point */
const aim = (terms: Term[], target: number, back: boolean) => {
  const rest = terms.slice(1).reduce((s, [a, , p]) => s + a * Math.sin(p), 0),
    [a0, f0] = terms[0]!,
    s = Math.asin(clamp((target - rest) / a0, -1, 1));
  terms[0] = [a0, f0, back ? Math.PI - s : s];
};
const design = (base: Light[], kiss: [number, number]) =>
  base.map((l, i) => {
    const c: Light = { ...l, x: l.x.map((t) => [...t] as Term), y: l.y.map((t) => [...t] as Term) };
    if (i < 2) {
      aim(c.x, kiss[0], i === 1);
      aim(c.y, kiss[1], i === 0);
    }
    return c;
  });

export function make(size: Size, id: string): Film {
  const L = layout(size),
    { W, H, u } = L,
    tall = L.tall;
  // per-size design: the vertical's figures are taller than they are wide and gather a little high, clear of the
  // feed's 220 px top and 320 px bottom bands
  const VX = W / 2,
    VY = tall ? H * 0.47 : H / 2,
    KISS: [number, number] = tall ? [90, -170] : [100, -110],
    LIGHTS = design(tall ? TALL : SQUARE, KISS),
    // radians of extra spiral as the figure gathers, half a radian more for each light, so they fan out of the flare to
    // different sides rather than as one sheaf
    TWIST = (i: number) => 1.7 + i * 0.5;

  const HEX: Record<Ink, string> = { accent: C.accent, accent2: C.accent2, s1: C.s1!, s2: C.s2!, ink: C.ink };

  // a light's offset from the centre at any (fractional, unwrapped) frame
  const at = (l: Light, i: number, F: number, out: Float32Array, k: number) => {
    const t = wrap(F) / N;
    let x = 0,
      y = 0;
    for (const [a, f, p] of l.x) x += a * Math.sin(TAU * f * t + p);
    for (const [a, f, p] of l.y) y += a * Math.sin(TAU * f * t + p);
    const g = gather(F, i),
      th = TWIST(i) * (1 - g),
      c = Math.cos(th),
      s = Math.sin(th);
    out[2 * k] = VX + (x * c - y * s) * g * u;
    out[2 * k + 1] = VY + (x * s + y * c) * g * u;
  };

  // ---- trails: sample each path backwards, tail (oldest) first
  const PTS = LIGHTS.map(() => new Float32Array((SEG + 1) * 2));
  const sampleAll = (F: number, len: number) => {
    LIGHTS.forEach((l, i) => {
      for (let k = 0; k <= SEG; k++) at(l, i, F - len * (1 - k / SEG), PTS[i]!, k);
    });
  };
  /** a tapered stroke: one butt-capped segment per sample, width and alpha growing toward the head (additive, so
   * the shared ends of neighbouring segments sum to one full coverage, and no round caps bead along the line) */
  const taper = (
    ctx: Ctx,
    pts: Float32Array,
    color: string,
    width: number,
    alpha: number,
    wPow: number,
    aPow: number,
    from = 0,
  ) => {
    ctx.strokeStyle = color;
    for (let k = Math.floor(from * SEG); k < SEG; k++) {
      const s = (k + 0.5) / SEG,
        a = alpha * s ** aPow;
      if (a < 0.004) continue;
      ctx.globalAlpha = Math.min(1, a);
      ctx.lineWidth = Math.max(0.2, width * s ** wPow);
      ctx.beginPath();
      ctx.moveTo(pts[2 * k]!, pts[2 * k + 1]!);
      ctx.lineTo(pts[2 * k + 2]!, pts[2 * k + 3]!);
      ctx.stroke();
    }
  };

  // ---- surfaces, cached per size and pixel density
  const surface = (env: Env, name: string, w: number, h: number): Layer => {
    const key = `lightTrails:${id}:${name}:${w}x${h}`;
    let lay = env.cache.get(key) as Layer | undefined;
    if (!lay) {
      lay = env.canvas(w, h);
      env.cache.set(key, lay);
    }
    return lay;
  };
  // the black: a faint lift of surface at the centre falling to deep at the corners (drawn once)
  const ground = (env: Env): Layer => {
    const pw = Math.round(W * env.scale),
      ph = Math.round(H * env.scale),
      key = `lightTrails:${id}:ground:${pw}x${ph}`;
    let lay = env.cache.get(key) as Layer | undefined;
    if (lay) return lay;
    lay = env.canvas(pw, ph);
    const c = lay.ctx;
    c.setTransform(env.scale, 0, 0, env.scale, 0, 0);
    c.fillStyle = C.deep ?? "#000000";
    c.fillRect(0, 0, W, H);
    const g = c.createRadialGradient(VX, VY, 0, VX, VY, Math.hypot(W, H) * 0.6);
    g.addColorStop(0, C.surface);
    g.addColorStop(0.45, C.ground);
    g.addColorStop(1, C.deep ?? "#000000");
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
    env.cache.set(key, lay);
    return lay;
  };
  // film grain: one seeded tile of faint specks, laid at one of eight offsets (frame mod 8, so it loops)
  const GRAIN = 256;
  const grainTile = (env: Env): Layer => {
    const key = `lightTrails:grain`;
    let lay = env.cache.get(key) as Layer | undefined;
    if (lay) return lay;
    lay = env.canvas(GRAIN, GRAIN);
    const c = lay.ctx,
      q = rng(6363);
    for (let i = 0; i < (GRAIN * GRAIN) / 5; i++) {
      c.globalAlpha = 0.012 + q() * 0.03;
      c.fillStyle = q() < 0.85 ? C.ink : C.muted;
      c.fillRect(Math.floor(q() * GRAIN), Math.floor(q() * GRAIN), 1, 1);
    }
    env.cache.set(key, lay);
    return lay;
  };
  const GRAIN_AT = (() => {
    const q = rng(6364);
    return Array.from({ length: 8 }, () => [Math.floor(q() * GRAIN), Math.floor(q() * GRAIN)] as const);
  })();

  // ---- a star glint: a halo and two thin crossed streaks (radial gradients squashed flat)
  const star = (ctx: Ctx, x: number, y: number, r: number, a: number, tint: string, halo = 1, reach = 2.6) => {
    if (a < 0.003) return;
    ctx.globalAlpha = 1;
    const hr = r * halo,
      glow = ctx.createRadialGradient(x, y, 0, x, y, hr);
    glow.addColorStop(0, hexA(C.ink, 0.9 * a));
    glow.addColorStop(0.18, hexA(tint, 0.45 * a));
    glow.addColorStop(1, hexA(tint, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(x - hr, y - hr, 2 * hr, 2 * hr);
    for (const [sx, sy, len] of [
      [1, 0.022, reach],
      [0.022, 1, 1.5],
    ] as const) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(sx, sy);
      const R = r * len,
        g = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
      g.addColorStop(0, hexA(C.ink, 0.95 * a));
      g.addColorStop(0.3, hexA(tint, 0.4 * a));
      g.addColorStop(1, hexA(tint, 0));
      ctx.fillStyle = g;
      ctx.fillRect(-R, -R, 2 * R, 2 * R);
      ctx.restore();
    }
  };

  const paint = (ctx: Ctx, env: Env, F: number) => {
    F = wrap(F);
    const t = F / N,
      kick = punch(F),
      hot = boost(F),
      cr = crest(F),
      p0 = pulse0(F),
      p60 = pulse60(F);
    // the exposure opens a little round the loop point and closes into the flare, so the downbeat shows only the
    // spiral in
    const len = TRAIL * (1 + 0.12 * cr - 0.35 * hot);
    sampleAll(F, len);

    // camera: a faint drift (a whole cycle of sway and a slow turn per loop) and a punch-in on the downbeat
    const zoom = 1 + 0.012 * Math.sin(TAU * t + 0.6) + 0.045 * kick - 0.02 * p60,
      rot = 0.022 * Math.sin(TAU * t + 0.4),
      ox = 7 * u * Math.cos(TAU * t),
      oy = 5 * u * Math.sin(2 * TAU * t + 1.1),
      ca = Math.cos(rot) * zoom,
      sa = Math.sin(rot) * zoom;
    // the camera matrix about the centre, then any pre-scale (device pixels, or the glow layer's quarter size)
    const cam = (c: Ctx, k: number) =>
      c.setTransform(
        k * ca,
        k * sa,
        -k * sa,
        k * ca,
        k * (VX + ox - (ca * VX - sa * VY)),
        k * (VY + oy - (sa * VX + ca * VY)),
      );

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.drawImage(ground(env).canvas, 0, 0);

    const gain = 1 + 0.15 * cr + 0.45 * p0 + 0.35 * p60 + 0.55 * hot;

    // ---- glow: the trails drawn wide into a quarter-size layer, mipped down twice, and all three added back
    const pw = Math.round(W * env.scale),
      ph = Math.round(H * env.scale),
      g0 = surface(env, "glow0", Math.ceil(pw / 4), Math.ceil(ph / 4)),
      g1 = surface(env, "glow1", Math.ceil(pw / 8), Math.ceil(ph / 8)),
      g2 = surface(env, "glow2", Math.ceil(pw / 16), Math.ceil(ph / 16));
    for (const g of [g0, g1, g2]) {
      g.ctx.setTransform(1, 0, 0, 1, 0, 0);
      g.ctx.globalAlpha = 1;
      g.ctx.globalCompositeOperation = "source-over";
      g.ctx.clearRect(0, 0, g.canvas.width, g.canvas.height);
    }
    const gc = g0.ctx;
    cam(gc, env.scale / 4);
    gc.globalCompositeOperation = "lighter";
    gc.lineCap = "butt";
    LIGHTS.forEach((l, i) => taper(gc, PTS[i]!, HEX[l.ink], 30 * u * l.w, 0.55 * l.a * gain, 0.55, 1.3));
    // the flare's bloom lives in the glow too, so it spreads with the trails
    if (kick > 0.002) {
      gc.globalAlpha = 1;
      const r = (120 + 240 * kick) * u,
        fg = gc.createRadialGradient(VX, VY, 0, VX, VY, r);
      fg.addColorStop(0, hexA(C.ink, kick));
      fg.addColorStop(0.14, hexA(C.ink, 0.55 * kick));
      fg.addColorStop(0.4, hexA(C.s1!, 0.16 * kick));
      fg.addColorStop(1, hexA(C.accent, 0));
      gc.fillStyle = fg;
      gc.fillRect(VX - r, VY - r, 2 * r, 2 * r);
    }
    // and the ring of light the flare throws: a soft annulus that runs outward and fades, blooming with the trails
    const rp = prog(F, T.hit, 150);
    if (F >= T.hit && rp < 1) {
      const rr = (120 + 260 * ease.outCubic(rp)) * u,
        band = (16 + 22 * rp) * u,
        fade = 0.33 * (1 - rp) ** 2;
      const ring = gc.createRadialGradient(VX, VY, Math.max(0, rr - band), VX, VY, rr + band);
      ring.addColorStop(0, hexA(C.s1!, 0));
      ring.addColorStop(0.5, hexA(C.ink, fade));
      ring.addColorStop(0.62, hexA(C.s1!, 0.5 * fade));
      ring.addColorStop(1, hexA(C.accent, 0));
      gc.globalAlpha = 1;
      gc.fillStyle = ring;
      gc.fillRect(VX - rr - band, VY - rr - band, 2 * (rr + band), 2 * (rr + band));
    }
    for (const [src, dst] of [
      [g0, g1],
      [g1, g2],
    ] as const) {
      dst.ctx.imageSmoothingEnabled = true;
      dst.ctx.imageSmoothingQuality = "high";
      dst.ctx.drawImage(src.canvas, 0, 0, dst.canvas.width, dst.canvas.height);
    }
    ctx.globalCompositeOperation = "lighter";
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    for (const [g, a] of [
      [g0, 0.85],
      [g1, 0.75],
      [g2, 0.7],
    ] as const) {
      ctx.globalAlpha = a;
      ctx.drawImage(g.canvas, 0, 0, pw, ph);
    }

    // ---- the streaks: a coloured body, then a hot core of ink toward the head (the ink light is its own core)
    cam(ctx, env.scale);
    ctx.lineCap = "butt";
    // (two body passes, a wide faint one and a narrow bright one, give the streak a soft cross-section rather than
    // the flat edge of a neon tube)
    LIGHTS.forEach((l, i) => {
      taper(ctx, PTS[i]!, HEX[l.ink], 11 * u * l.w, 0.26 * l.a * gain, 0.6, 1.3);
      taper(ctx, PTS[i]!, HEX[l.ink], 4.6 * u * l.w, 0.72 * l.a * gain, 0.8, 1.6);
    });
    LIGHTS.forEach((l, i) => {
      if (l.ink !== "ink") taper(ctx, PTS[i]!, C.ink, 2.8 * u * l.w, 0.85 * gain, 1.1, 2.6, 0.25);
    });
    // the light sources: each head drawn as its own path inside a half-frame shutter, so a fast light is a short
    // streak rather than a dot (analytic motion blur; kit/blur.ts would ghost these thin lines into copies)
    ctx.lineCap = "round";
    const HD = new Float32Array(6);
    LIGHTS.forEach((l, i) => {
      at(l, i, F - 0.5, HD, 0);
      at(l, i, F - 0.25, HD, 1);
      at(l, i, F, HD, 2);
      // a soft bulb of the light's colour round the source, so the head is a point of light, not a cut end
      ctx.globalAlpha = Math.min(1, 0.5 * l.a * gain);
      ctx.strokeStyle = HEX[l.ink];
      ctx.lineWidth = 11 * u * l.w;
      ctx.beginPath();
      ctx.moveTo(HD[0]!, HD[1]!);
      ctx.lineTo(HD[4]!, HD[5]!);
      ctx.stroke();
      ctx.globalAlpha = Math.min(1, 0.95 * l.a);
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 4.2 * u * l.w;
      ctx.beginPath();
      ctx.moveTo(HD[0]!, HD[1]!);
      ctx.lineTo(HD[2]!, HD[3]!);
      ctx.lineTo(HD[4]!, HD[5]!);
      ctx.stroke();
      // the beat-3 glint on every head
      if (p60 > 0.01) star(ctx, HD[4]!, HD[5]!, (30 + 40 * p60) * u * l.w, 0.85 * p60, HEX[l.ink]);
    });

    // ---- the downbeat flare: a white-hot core and an anamorphic streak (its ring lives in the glow layer)
    if (kick > 0.002) star(ctx, VX, VY, (70 + 170 * kick) * u, kick, C.accent2);
    // ---- the frame-0 kiss: a small star where the orange and the blue light meet
    star(ctx, VX + KISS[0] * u, VY + KISS[1] * u, (90 + 140 * p0) * u, p0, C.s2!, 0.45, 1.6);

    // ---- grain, screen-locked
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    const tile = grainTile(env),
      [gx, gy] = GRAIN_AT[Math.floor(F) % 8]!;
    for (let y = -gy; y < ph; y += GRAIN) for (let x = -gx; x < pw; x += GRAIN) ctx.drawImage(tile.canvas, x, y);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
  };

  const cuts = [T.weave, T.gather, T.hit, T.spring, N],
    names = ["weave", "gather", "flare", "spring"];
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
    audio: score,
  };
}

// ---- sound: the soft beat score as a quiet bed (key 8, F minor; its tails wrap), a warm pad through a slow
// filter, a soft riser into the downbeat, a bright airy hit on frame 120 and a small chime for the frame-0 kiss.
// Every pitched oscillator is quantised to a quarter hertz, so it runs a whole number of cycles in 4 s and the
// loop point falls on the same phase; the filters run the buffer twice so their state at the end meets the start.
const BASE_GAIN = 0.24,
  OUT = 0.72,
  PAD = 0.05,
  RISE_FROM = 66;
const q4 = (hz: number) => Math.round(hz * 4) / 4;
const mhz = (m: number) => 440 * 2 ** ((m - 69) / 12);
function score(sr: number): [Float32Array, Float32Array] {
  const [Lc, Rc] = beatScore({
    frames: N,
    fps: FPS,
    bpm: BPM,
    mood: "soft",
    key: 8,
    loop: true,
    gain: BASE_GAIN,
  })(sr);
  const n = Lc.length,
    at = (f: number) => Math.round((f / FPS) * sr),
    noise = rng(6301);
  const add = (i: number, l: number, r: number) => {
    i = ((i % n) + n) % n;
    Lc[i] = Lc[i]! + l;
    Rc[i] = Rc[i]! + r;
  };
  // the bed ducks under the hit and breathes back in, and is back to full well before the loop wraps
  for (let i = at(T.hit); i < n; i++) {
    const d = 1 - 0.5 * Math.exp(-(i - at(T.hit)) / (0.2 * sr));
    Lc[i] = Lc[i]! * d;
    Rc[i] = Rc[i]! * d;
  }

  // the pad: bar 1 F minor (F Ab C), bar 2 Db major (Db F Ab), detuned soft saws, crossfaded at each bar line
  const CH = [
    [53, 56, 60],
    [49, 53, 56],
  ];
  const raw = [new Float32Array(n), new Float32Array(n)];
  const bar = n / 2,
    xf = 0.08 * sr;
  for (let c = 0; c < 2; c++)
    for (const m of CH[c]!)
      for (const [det, side] of [
        [-0.5, 0],
        [0.75, 1],
      ] as const) {
        const f = q4(mhz(m)) + det,
          buf = raw[side]!;
        for (let i = 0; i < n; i++) {
          // weight of this chord: 1 inside its bar, a raised-cosine crossfade over each bar line (periodic)
          const d = c === 0 ? i : (i - bar + n) % n,
            pos = d < n - xf ? d : d - n,
            w =
              pos < -xf / 2
                ? 0
                : pos < xf / 2
                  ? smooth((pos + xf / 2) / xf)
                  : pos < bar - xf / 2
                    ? 1
                    : pos < bar + xf / 2
                      ? 1 - smooth((pos - bar + xf / 2) / xf)
                      : 0;
          if (w <= 0) continue;
          const ph = (f * i) / sr;
          let s = 0;
          for (let h = 1; h <= 6; h++) s += Math.sin(TAU * h * ph) / h;
          buf[i] = buf[i]! + s * w;
        }
      }
  // the slow filter: two one-pole low-passes whose cutoff opens toward the downbeat and closes again
  const cut = (i: number) => 420 + 1500 * (0.5 - 0.5 * Math.cos((TAU * i) / n)) ** 1.5;
  for (const [side, buf] of raw.entries()) {
    let a = 0,
      b = 0;
    for (let pass = 0; pass < 2; pass++)
      for (let i = 0; i < n; i++) {
        const k = 1 - Math.exp((-TAU * cut(i)) / sr);
        a += k * (buf[i]! - a);
        b += k * (a - b);
        if (pass === 1) {
          if (side === 0) Lc[i] = Lc[i]! + b * PAD;
          else Rc[i] = Rc[i]! + b * PAD;
        }
      }
  }

  // the riser: air (band-passed noise whose band climbs) and a soft upward glide, cut clean on the downbeat
  const r0 = at(RISE_FROM),
    r1 = at(T.hit);
  let lp = 0,
    lp2 = 0,
    gph = 0;
  for (let i = r0; i < r1; i++) {
    const p = (i - r0) / (r1 - r0),
      hi = 1 - Math.exp((-TAU * (1500 + 7000 * p * p)) / sr),
      lo = 1 - Math.exp((-TAU * (400 + 2500 * p * p)) / sr);
    lp += hi * (noise() * 2 - 1 - lp);
    lp2 += lo * (lp - lp2);
    gph += mhz(72 + 12 * p * p) / sr;
    const env = p ** 2.4 * Math.min(1, (r1 - i) / (0.005 * sr)),
      s = (lp - lp2) * 0.55 + Math.sin(TAU * gph) * 0.05,
      pan = 0.5 + 0.3 * Math.sin(TAU * 1.5 * p);
    add(i, s * env * (1 - pan) * 2, s * env * pan * 2);
  }

  // the hit: a bright shimmer of Db-major partials (with a bell's inharmonic second), a breath of high air and a
  // soft low body so it still lands on a phone speaker
  const h0 = at(T.hit);
  [73, 77, 80, 85, 89].forEach((m, j) => {
    const f = mhz(m),
      pan = 0.2 + 0.15 * j,
      vel = 0.13 / (1 + j * 0.25);
    for (let k = 0; k < Math.round(1.6 * sr); k++) {
      const t = k / sr,
        s =
          (Math.sin(TAU * f * t) + 0.3 * Math.sin(TAU * f * 2.76 * t) * Math.exp(-t * 6)) *
          Math.exp(-t * (2.2 + j * 0.3)) *
          Math.min(1, t / 0.0025);
      add(h0 + k, s * vel * (1 - pan) * 2, s * vel * pan * 2);
    }
  });
  let al = 0,
    ar = 0,
    pl = 0,
    pr = 0;
  const hpA = 1 - Math.exp((-TAU * 3800) / sr);
  for (let k = 0; k < Math.round(0.9 * sr); k++) {
    const xl = noise() * 2 - 1,
      xr = noise() * 2 - 1;
    al += hpA * (xl - al);
    ar += hpA * (xr - ar);
    const e = Math.exp(-k / (0.17 * sr)) * Math.min(1, k / (0.002 * sr)) * 0.3;
    // first difference of a low-pass: a gentle high-pass, the "air"
    add(h0 + k, (al - pl) * e * 2.2, (ar - pr) * e * 2.2);
    pl = al;
    pr = ar;
  }
  let ph = 0;
  for (let k = 0; k < Math.round(0.6 * sr); k++) {
    const t = k / sr;
    ph += (58 + 80 * Math.exp(-t / 0.04)) / sr;
    const s = Math.sin(TAU * ph) * Math.exp(-t / 0.16) * Math.min(1, t / 0.003) * 0.32;
    add(h0 + k, s, s);
  }
  // the pre-pulse on frame 60: a soft tap of air and a short plucked F, quieter than the hit
  const p60 = at(60);
  for (let k = 0; k < Math.round(0.5 * sr); k++) {
    const t = k / sr,
      s =
        (Math.sin(TAU * mhz(77) * t) * Math.exp(-t * 7) + (noise() * 2 - 1) * 0.35 * Math.exp(-t * 40)) *
        Math.min(1, t / 0.002) *
        0.06;
    add(p60 + k, s * 1.2, s * 0.8);
  }
  // the loop point: the bed's pad releases into every bar line, deepest at the wrap, so a soft F-minor swell
  // breathes in over the last 0.7 s (written at negative indices, so it wraps to the end of the buffer) and
  // blooms out of sample 0
  [65, 68, 72].forEach((m, j) => {
    const f = q4(mhz(m)),
      pan = 0.3 + 0.2 * j;
    for (let k = -Math.round(0.7 * sr); k < Math.round(0.7 * sr); k++) {
      const t = k / sr,
        e = t < 0 ? smooth(1 + t / 0.7) : Math.exp(-t / 0.25),
        v = Math.sin(TAU * f * t) + 0.3 * Math.sin(TAU * 2 * f * t);
      add(k, v * e * 0.08 * (1 - pan) * 2, v * e * 0.08 * pan * 2);
    }
  });
  // the kiss on frame 0: a small high chime (C, the fifth of F minor), quiet, its tail running into the loop
  for (let k = 0; k < Math.round(0.8 * sr); k++) {
    const t = k / sr,
      s =
        (Math.sin(TAU * mhz(84) * t) + 0.25 * Math.sin(TAU * mhz(84) * 2.76 * t) * Math.exp(-t * 9)) *
        Math.exp(-t * 4.5) *
        Math.min(1, t / 0.003) *
        0.09;
    add(k, s * 0.7, s * 1.3);
  }

  // and a soft low tick under it on sample 0 (the hit's body, about a third as loud and much shorter)
  let tph = 0;
  for (let k = 0; k < Math.round(0.45 * sr); k++) {
    const t = k / sr;
    tph += (58 + 80 * Math.exp(-t / 0.04)) / sr;
    const v = Math.sin(TAU * tph) * Math.exp(-t / 0.15) * Math.min(1, t / 0.003) * 0.32 * 0.35;
    add(k, v, v);
  }
  // one gentle saturation over the sum: louder without a limiter, and still deterministic
  let peak = 1e-9;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(Lc[i]!), Math.abs(Rc[i]!));
  const g = 1.25 / peak;
  for (let i = 0; i < n; i++) {
    Lc[i] = (Math.tanh(Lc[i]! * g) / Math.tanh(1.25)) * OUT;
    Rc[i] = (Math.tanh(Rc[i]! * g) / Math.tanh(1.25)) * OUT;
  }
  return [Lc, Rc];
}

export const lightTrails = make("square", "lightTrails");
export const lightTrailsVertical = make("vertical", "lightTrailsVertical");
