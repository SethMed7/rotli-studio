// STUDY 09 · SHAPE MORPH (8 s, 60 fps, seamless). One solid shape on a pale dot grid becomes every other
// primitive: circle → square → triangle → star → circle, turning a little on each change, with three coloured
// satellites on tilted orbits and a soft floor shadow. The grid ripples outward on every morph. One source,
// designed for square and landscape. Brand: the neutral pack (palette "mono").
// Brief: series/studies/briefs/shape-morph.json · prompt: series/studies/prompts/shape-morph.prompt.md
//
// The morph: every outline is sampled at the SAME M angles around the centre (a radius per angle), so shape A
// and shape B have point i on the same ray and blend point by point. What springs is the interpolation: one
// weight per change, w(F) = a spring step from 0 to 1, and the outline is S0 + Σ wᵢ·(Sᵢ₊₁ − Sᵢ). A weight that
// overshoots 1 extrapolates past the new shape (the square's pinched snap, the star's burst), and the points
// themselves never carry state. Every weight wraps at N (the kit's track-with-loop formula, per key), and the
// last shape IS the first, so frame 479 flows into frame 0 by construction; loop-seam proves it.
import PACK from "../../../brand/packs/studio/pack.json";
import type { Ctx, Env } from "../core";
import type { Film, Shot } from "../film";
import { motionBlur } from "../kit/blur";
import { clamp, ease, lerp, phase, spring, type SpringOpts } from "../kit/motion";
import { usePack } from "../kit/pack";
import { beatScore } from "../kit/score";
import { layout, type Size } from "../kit/sizes";
import { text } from "../kit/type";

const P = usePack(PACK),
  C = P.palette("mono"),
  F_ = P.face;
const FPS = 60,
  BPM = 120,
  N = 480; // a beat is 30 frames, a bar 120
// the changes, in frames (each on the beat grid); the grid pulses once inside the opening circle
const T = { circle: 0, square: 120, triangle: 240, star: 330, soften: 420 };
const PULSE = 60;
const TAU = Math.PI * 2;

// ---- springs, one per change. The helper is track()-with-loop, but each key brings its own spring.
type Step = [frame: number, delta: number, o: SpringOpts];
const steps = (F: number, keys: Step[]) => {
  let v = 0;
  for (const [k, d, o] of keys) v += d * (spring((F - k) / FPS, o) + spring((F + N - k) / FPS, o) - 1);
  return v;
};
const SNAP = { freq: 2.4, damp: 0.42 }, // circle → square: a snap that overshoots
  FOLD = { freq: 1.9, damp: 0.72 }, // square → triangle: heavier, a fold
  BURST = { freq: 3.1, damp: 0.34 }, // triangle → star: a burst that rings
  SOFTEN = { freq: 1.5, damp: 0.92 }; // star → circle: melts back
const MORPHS: [number, SpringOpts][] = [
  [T.square, SNAP],
  [T.triangle, FOLD],
  [T.star, BURST],
  [T.soften, SOFTEN],
];
// per-change weights: 0 before the change, springing to 1 after (and wrapping at N)
const weights = (F: number) => MORPHS.map(([k, o]) => steps(F, [[k, 1, o]]));
// the turn, in degrees, accumulated per change: a quarter turn onto the square, then a little each time.
// The four add to exactly one turn, so the wrap carry is invisible (and the circle hides it anyway).
const TURNS = [90, 90, 72, 108];
const turn = (F: number) =>
  steps(
    F,
    MORPHS.map(([k, o], i) => [k, TURNS[i]!, o] as Step),
  );
const ROT_AT = [0, 90, 180, 252]; // the turn each shape is seen at, so each one lands upright

// ---- outlines as radius per angle. A polygon from polar vertices: the ray at θ meets the edge (a1,r1)–(a2,r2)
// at r1·r2·sin(a2−a1) / (r1·sin(θ−a1) + r2·sin(a2−θ)). M = 240 puts a sample exactly on every corner below.
const M = 240;
const polar = (verts: [number, number][]) =>
  Array.from({ length: M }, (_, i) => {
    const th = (i / M) * TAU;
    for (let k = 0; k < verts.length; k++) {
      const [v1, r1] = verts[k]!,
        [v2, r2] = verts[(k + 1) % verts.length]!,
        span = (((v2 - v1) % TAU) + TAU) % TAU,
        a1 = v1 - Math.ceil((v1 - th) / TAU - 1e-9) * TAU, // the edge's start, brought to or just below θ
        a2 = a1 + span;
      if (th > a2 + 1e-9) continue;
      return (r1 * r2 * Math.sin(a2 - a1)) / (r1 * Math.sin(th - a1) + r2 * Math.sin(a2 - th));
    }
    return 1;
  });
const deg = (d: number) => (((d % 360) + 360) % 360) * (Math.PI / 180);
// each outline is drawn pre-rotated by the turn it is seen at, so on screen it stands upright
const regular = (n: number, r: number, upAt: number, inner?: number) =>
  polar(
    Array.from({ length: inner ? n * 2 : n }, (_, i) => {
      const step = 360 / (inner ? n * 2 : n);
      return [deg(-90 - upAt + i * step), inner && i % 2 ? inner : r] as [number, number];
    }),
  );
// sizes chosen so the mass reads about the same through every change
const SHAPES = [
  Array.from({ length: M }, () => 1), // circle
  polar([0, 1, 2, 3].map((i) => [deg(45 + i * 90), 0.9 * Math.SQRT2] as [number, number])), // square
  regular(3, 1.36, ROT_AT[2]!), // triangle, upright at 180°
  regular(5, 1.4, ROT_AT[3]!, 0.6), // star, upright at 252°
  Array.from({ length: M }, () => 1), // circle again: the loop closes on the first shape
];
const NAMES = ["circle", "square", "triangle", "star"];

// ---- satellites: three tilted orbits. Speed is a pure function (direction flips at the fold, a kick at the
// burst); the angle is its integral, tabulated once, and scaled so each satellite makes whole turns per loop.
const dirOf = (F: number) =>
  1 +
  steps(F, [
    [T.triangle, -1.55, { freq: 1.1, damp: 0.8 }],
    [T.soften, 1.55, { freq: 1.1, damp: 0.8 }],
  ]);
const boostOf = (F: number) =>
  1 +
  steps(F, [
    [T.star, 0.9, { freq: 2.6, damp: 0.7 }],
    [T.star + 36, -0.9, { freq: 1.4, damp: 0.85 }],
  ]);
const flingOf = (F: number) =>
  1 +
  steps(F, [
    [T.star, 0.34, { freq: 2.6, damp: 0.5 }],
    [T.star + 36, -0.34, { freq: 1.5, damp: 0.72 }],
  ]);
const SUB = 4,
  CUM = (() => {
    const c = new Float64Array(N * SUB + 1);
    for (let i = 1; i <= N * SUB; i++) {
      const a = (i - 1) / SUB,
        b = i / SUB;
      c[i] = c[i - 1]! + ((dirOf(a) * boostOf(a) + dirOf(b) * boostOf(b)) / 2) * (1 / SUB);
    }
    return c;
  })();
const TOTAL = CUM[N * SUB]!;
const travel = (F: number) => {
  const x = (((F % N) + N) % N) * SUB,
    i = Math.min(N * SUB - 1, Math.floor(x));
  return lerp(CUM[i]!, CUM[i + 1]!, x - i) / TOTAL; // 0 → 1 across the loop
};
// radius (× shape radius), tilt of the orbit plane on screen, turns per loop, start angle, size, colour
const SATS = [
  { r: 1.72, tilt: -0.22, turns: 2, a0: 0.4, size: 17, color: C.accent },
  { r: 2.02, tilt: 0.16, turns: 1, a0: 2.6, size: 21, color: C.accent2 },
  { r: 2.32, tilt: -0.06, turns: 1, a0: 4.7, size: 14, color: C.ink },
];
const SQUASH = 0.34; // the orbit plane seen from a little above

// colour helpers (flat colour: a mix of two palette entries)
const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a: string, b: string, t: number) => {
  const A = rgb(a),
    B = rgb(b),
    k = clamp(t);
  return (
    "#" +
    A.map((v, i) =>
      Math.round(lerp(v, B[i]!, k))
        .toString(16)
        .padStart(2, "0"),
    ).join("")
  );
};
const alpha = (h: string, a: number) => `rgba(${rgb(h).join(",")},${a})`;

// a ripple that leaves the centre at frame m and wraps at N (the one launched at 420 carries into frame 0)
const since = (F: number, m: number) => (((F - m) % N) + N) % N;
const RIPPLES: [number, number][] = [
  [PULSE, 0.65],
  [T.square, 1],
  [T.triangle, 0.9],
  [T.star, 1.15],
  [T.soften, 0.8],
];

export function make(size: Size, id: string): Film {
  const L = layout(size),
    { W, H, u, cx, cy } = L;
  const R = 160 * u, // the shape's radius
    ox = cx,
    oy = cy - 34 * u; // its resting centre (a little above middle: the floor shadow sits below)
  const pitch = 54 * u,
    reach = Math.hypot(W / 2, H / 2) + 60 * u, // a ripple crosses the whole frame
    speed = reach / 78; // px per frame

  // the outline at frame F: S0 + Σ wᵢ·(Sᵢ₊₁ − Sᵢ), one radius per sample angle
  const outline = (F: number) => {
    const w = weights(F);
    return Array.from({ length: M }, (_, i) => {
      let r = SHAPES[0]![i]!;
      for (let k = 0; k < 4; k++) r += w[k]! * (SHAPES[k + 1]![i]! - SHAPES[k]![i]!);
      return r;
    });
  };
  const circleness = (F: number) => {
    const w = weights(F);
    return clamp(1 - w[0]!) + clamp(w[3]!); // 1 while it is a circle, 0 otherwise
  };

  // the landscape's rails sit on the shape's centre line; the grid leaves them a clear panel
  const lx = L.safe.x + 60 * u,
    rx = W - L.safe.x - 60 * u;
  const clear = (x: number, y: number) =>
    L.wide && Math.abs(y - oy - 24 * u) < 100 * u && (x < lx + 250 * u || x > rx - 280 * u);

  // ---- the dot grid, centred on the shape; every morph sends a ring outward through it
  const grid = (ctx: Ctx, F: number) => {
    const base = mix(C.line, C.muted, 0.38),
      nx = Math.ceil(W / 2 / pitch) + 1,
      ny = Math.ceil(H / 2 / pitch) + 1;
    const fronts = RIPPLES.map(([m, amp]) => {
      const t = since(F, m);
      return { rho: t * speed, amp: amp * Math.exp(-t / 70) * clamp(t / 4) };
    });
    for (let j = -ny; j <= ny; j++)
      for (let i = -nx; i <= nx; i++) {
        const gx = ox + i * pitch,
          gy = oy + j * pitch,
          d = Math.hypot(gx - ox, gy - oy);
        if (d < R * 0.9 || clear(gx, gy)) continue; // under the shape, or behind the rails
        // ambient: a slow wave travels outward all the time, so no hold is ever still
        const amb = 0.5 + 0.5 * Math.sin(d / (170 * u) - TAU * phase(F, 120));
        let g = 0;
        for (const f of fronts) {
          const e = (d - f.rho) / (46 * u);
          g += f.amp * Math.exp(-e * e);
        }
        const push = g * 13 * u,
          dx = ((gx - ox) / (d || 1)) * push,
          dy = ((gy - oy) / (d || 1)) * push;
        const r = (2.3 + 0.7 * amb + 3.2 * g) * u;
        ctx.fillStyle = g > 0.02 ? mix(base, C.ink, clamp(g * 0.75)) : base;
        ctx.beginPath();
        ctx.arc(gx + dx, gy + dy, r, 0, TAU);
        ctx.fill();
      }
  };

  // ---- satellites: position on a tilted ellipse; depth > 0 is the near half (in front of the shape)
  const sat = (F: number, s: (typeof SATS)[number], fling: number) => {
    const a = s.a0 + TAU * s.turns * travel(F),
      rr = s.r * R * fling,
      lx = Math.cos(a) * rr,
      ly = Math.sin(a) * rr * SQUASH,
      c = Math.cos(s.tilt),
      sn = Math.sin(s.tilt);
    return { x: ox + lx * c - ly * sn, y: oy + lx * sn + ly * c, depth: Math.sin(a) };
  };
  const drawSat = (ctx: Ctx, F: number, s: (typeof SATS)[number], fling: number) => {
    const p = sat(F, s, fling),
      r = s.size * u * (1 + 0.2 * p.depth);
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, TAU);
    ctx.fillStyle = s.color;
    ctx.fill();
    if (s.color === C.ink && p.depth >= 0) {
      ctx.lineWidth = 3 * u;
      ctx.strokeStyle = C.ground; // a keyline so the ink satellite still reads in front of the ink shape
      ctx.stroke();
    }
  };
  const orbitPath = (ctx: Ctx, s: (typeof SATS)[number], fling: number, front: boolean) => {
    ctx.save();
    ctx.translate(ox, oy);
    ctx.rotate(s.tilt);
    ctx.scale(1, SQUASH);
    ctx.beginPath();
    const rr = s.r * R * fling;
    if (front) ctx.arc(0, 0, rr, 0, Math.PI);
    else ctx.arc(0, 0, rr, Math.PI, TAU);
    ctx.restore();
    ctx.lineWidth = 2 * u;
    ctx.strokeStyle = front ? alpha(C.muted, 0.55) : C.line;
    ctx.stroke();
  };

  const scene = (ctx: Ctx, F: number) => {
    const rs = outline(F),
      circ = circleness(F),
      // the circle breathes on every other beat; everything floats on a slow bob; both close in N
      breathe = 1 + (0.012 + 0.03 * circ) * (0.5 - 0.5 * Math.cos(TAU * phase(F, 60))),
      bob = Math.sin(TAU * phase(F, 240)) * 7 * u,
      rot = ((turn(F) + 2.5 * Math.sin(TAU * phase(F, 240))) * Math.PI) / 180,
      // a small squash-pop on each change (an impulse that has died long before the next)
      pop = MORPHS.reduce((s, [k]) => {
        const t = since(F, k) / FPS;
        return s + 0.07 * Math.exp(-t * 6) * Math.sin(TAU * 2.2 * t);
      }, 0),
      fling = flingOf(F),
      x = ox,
      y = oy + bob,
      k = R * breathe * (1 + pop);

    // floor shadow: soft, tighter and darker when the shape sits low
    const lift = (bob / (7 * u) + 1) / 2,
      fy = oy + R * 1.78;
    ctx.save();
    ctx.translate(x, fy);
    ctx.scale(1, 0.14);
    const sr = R * 1.15 * breathe * (1.04 - 0.1 * lift),
      g = ctx.createRadialGradient(0, 0, 0, 0, 0, sr),
      sa = 0.2 - 0.05 * lift;
    g.addColorStop(0, alpha(C.ink, sa));
    g.addColorStop(0.55, alpha(C.ink, sa * 0.42));
    g.addColorStop(1, alpha(C.ink, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, sr, 0, TAU);
    ctx.fill();
    ctx.restore();

    // far halves of the orbits, and the satellites behind the shape
    for (const s of SATS) orbitPath(ctx, s, fling, false);
    for (const s of SATS) if (sat(F, s, fling).depth < 0) drawSat(ctx, F, s, fling);

    // the shape: M points, one per angle, rotated by its turn; a round-joined stroke of the same ink softens
    // the corners without changing the sampling
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.beginPath();
    for (let i = 0; i < M; i++) {
      const th = (i / M) * TAU,
        r = rs[i]! * k;
      if (i) ctx.lineTo(Math.cos(th) * r, Math.sin(th) * r);
      else ctx.moveTo(Math.cos(th) * r, Math.sin(th) * r);
    }
    ctx.closePath();
    ctx.fillStyle = C.ink;
    ctx.fill();
    ctx.lineJoin = "round";
    ctx.lineWidth = 12 * u;
    ctx.strokeStyle = C.ink;
    ctx.stroke();
    ctx.restore();

    // near halves of the orbits pass in front, then the near satellites
    for (const s of SATS) orbitPath(ctx, s, fling, true);
    for (const s of SATS) if (sat(F, s, fling).depth >= 0) drawSat(ctx, F, s, fling);
  };

  // ---- landscape: the current shape's name on the left, a four-step indicator on the right
  const stepOf = (F: number) =>
    steps(
      F,
      MORPHS.map(([k]) => [k + 4, 1, { freq: 2.4, damp: 0.9 }] as Step),
    ); // counts 0,1,2,3,4 and is read mod 4 (4 IS 0)
  const icon = (ctx: Ctx, which: number, x: number, y: number, r: number) => {
    const rs = SHAPES[which]!,
      rot = (ROT_AT[which]! * Math.PI) / 180;
    ctx.beginPath();
    for (let i = 0; i < M; i += 2) {
      const th = (i / M) * TAU + rot,
        rr = rs[i]! * r;
      if (i) ctx.lineTo(x + Math.cos(th) * rr, y + Math.sin(th) * rr);
      else ctx.moveTo(x + Math.cos(th) * rr, y + Math.sin(th) * rr);
    }
    ctx.closePath();
  };
  const rails = (ctx: Ctx, F: number) => {
    const step = stepOf(F),
      y = oy;
    const mono = { family: F_.mono, weight: 500 };
    // left: an odometer rolls the name up through a one-line window
    text(ctx, "SHAPE", lx, y - 34 * u, { ...mono, size: 22 * u, color: C.muted, track: 0.14 });
    const lineH = 50 * u;
    ctx.save();
    ctx.beginPath();
    ctx.rect(lx - 10 * u, y - 6 * u, 320 * u, lineH);
    ctx.clip();
    const base = Math.floor(step);
    for (let i = base - 1; i <= base + 2; i++) {
      const dy = (i - step) * lineH;
      text(ctx, NAMES[((i % 4) + 4) % 4]!, lx, y + 30 * u + dy, {
        ...mono,
        size: 32 * u,
        color: C.ink,
        track: 0.02,
        alpha: clamp(1 - Math.abs(i - step) * 1.4),
      });
    }
    ctx.restore();
    const n = ((Math.round(step) % 4) + 4) % 4;
    text(ctx, `0${n + 1} / 04`, lx, y + 84 * u, { ...mono, size: 22 * u, color: C.muted, track: 0.14 });
    // right: the four shapes in miniature; the active one fills with ink and lifts, the rest are outlines
    const act = (i: number) => {
      let d = Math.abs((((step - i) % 4) + 4) % 4);
      d = Math.min(d, 4 - d);
      return ease.inOutCubic(clamp(1 - d));
    };
    const gap = 66 * u,
      ir = 17 * u;
    text(ctx, "STEP", rx, y - 34 * u, { ...mono, size: 22 * u, color: C.muted, align: "right", track: 0.14 });
    for (let i = 0; i < 4; i++) {
      const a = act(i),
        ix = rx - ir * 1.1 - (3 - i) * gap,
        iy = y + 24 * u - a * 5 * u;
      icon(ctx, i, ix, iy, ir * (1 + 0.14 * a));
      if (a > 0.02) {
        ctx.fillStyle = alpha(C.ink, a);
        ctx.fill();
      }
      ctx.lineJoin = "round";
      ctx.lineWidth = 2.5 * u;
      ctx.strokeStyle = mix(C.muted, C.ink, a);
      ctx.stroke();
    }
    // a hairline under the four, with a short ink bar that slides to the active one
    const x0 = rx - ir * 1.1 - 3 * gap,
      barY = y + 70 * u;
    ctx.fillStyle = C.line;
    ctx.fillRect(x0 - ir * 1.2, barY, 3 * gap + ir * 2.4, 2 * u);
    const pos = ((step % 4) + 4) % 4,
      wrapT = clamp(pos - 3); // between the star and the next circle the bar slides off right and in from left
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0 - ir * 1.2, barY - 2 * u, 3 * gap + ir * 2.4, 6 * u);
    ctx.clip();
    ctx.fillStyle = C.ink;
    for (const p of wrapT > 0 ? [pos, pos - 4] : [pos])
      ctx.fillRect(x0 + p * gap - ir * 1.2, barY - u, ir * 2.4, 4 * u);
    ctx.restore();
  };

  const paint = (ctx: Ctx, env: Env, F: number) => {
    F = ((F % N) + N) % N; // the shutter may sample either side of the seam
    ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
    ctx.fillStyle = C.ground;
    ctx.fillRect(0, 0, W, H);
    grid(ctx, F);
    scene(ctx, F);
    if (L.wide) rails(ctx, F);
  };

  const cuts = [T.circle, T.square, T.triangle, T.star, T.soften, N],
    names = ["circle", "square", "triangle", "star", "soften"];
  const shots: Shot[] = names.map((sid, i) => ({
    id: sid,
    start: cuts[i]!,
    end: cuts[i + 1]!,
    draw: (ctx, local, env) => {
      motionBlur(ctx, env, (c, dt) => paint(c, env, cuts[i]! + local + dt), { samples: 4, shutter: 0.5 });
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
      loop: true,
      ticks: [T.square, T.triangle, T.star, T.soften],
      gain: 0.36,
    }),
  };
}

export const shapeMorph = make("square", "shapeMorph");
export const shapeMorphLandscape = make("landscape", "shapeMorphLandscape");
