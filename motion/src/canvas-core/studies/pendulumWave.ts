// STUDY 42 · PENDULUM WAVE (32 s, 60 fps, an exact loop). A calm physics-lab demonstration on the graphite ground:
// fifteen uncoupled pendulums on one bar, seen three-quarter from one end, with a flat "from above" trace of the
// same fifteen, a progress ring and a pill that names each pattern on its frame. One source, designed for square
// and landscape. Brand: the neutral pack. No product at all; the numbers are the module's own tuning.
// Brief: series/studies/briefs/pendulum-wave.json · prompt: series/studies/prompts/pendulum-wave.prompt.md
//
// The whole piece is ONE closed-form system. The cycle G is the piece (32 s = 1920 frames). Pendulum k makes
// N_k = 24 + k whole swings per cycle, so theta_k(F) = A·cos(2π·N_k·F/1920): every angle, the camera drift, the
// captions, the pills and the ring are functions of F with periods that divide 1920, so the last frame flows into
// the first with no cross-fade. Nothing is simulated.
import PACK from "../../../brand/packs/studio/pack.json";
import type { Ctx, Env } from "../core";
import type { Film, Shot } from "../film";
import { clamp, ease, lerp, prog, spring } from "../kit/motion";
import { usePack } from "../kit/pack";
import { beatScore } from "../kit/score";
import { layout, type Size } from "../kit/sizes";
import { measure, text } from "../kit/type";
import { rr } from "../kit/ui";

const P = usePack(PACK),
  C = P.palette("graphite"),
  F_ = P.face;
const FPS = 60,
  BPM = 120,
  N = 1920, // one cycle G = 32 s; a beat is 30 frames
  G = N / FPS,
  TAU = Math.PI * 2;

// ---- the apparatus (SI units). Lengths follow from the period: L = g·(G / 2πN)².
const COUNT = 15,
  A = (12 * Math.PI) / 180,
  GRAV = 9.81,
  NK = Array.from({ length: COUNT }, (_, k) => 24 + k),
  LEN = NK.map((n) => GRAV * (G / (TAU * n)) ** 2), // 0.442 m … 0.176 m
  SPACING = 0.08, // along the bar (the module's own apparatus, wider than a lab rig so the far end reads)
  BAR = (COUNT - 1) * SPACING,
  FLOOR = -(LEN[0]! + 0.11);
/** the normalised swing of pendulum k: 1 at its right-hand turning point */
const swing = (k: number, F: number) => Math.cos((TAU * NK[k]! * F) / N);
const theta = (k: number, F: number) => A * swing(k, F);

// ---- the story, in frames. Pattern moments: at t = G/q every phase is 2πk/q, so the row falls into q groups.
const PATTERNS: { f: number; q: number; n: number; d: number; name: string }[] = [
  { f: 480, q: 4, n: 1, d: 4, name: "four groups" },
  { f: 640, q: 3, n: 1, d: 3, name: "three groups" },
  { f: 960, q: 2, n: 1, d: 2, name: "two rows" },
  { f: 1280, q: 3, n: 2, d: 3, name: "three groups" },
  { f: 1440, q: 4, n: 3, d: 4, name: "four groups" },
];
type Caption = { at: number; out: number; head: string; sub?: string };
// the opening caption is the closing one: it arrives at 1860 and is still on screen at 1920 = frame 0
const CAPTIONS: Caption[] = [
  { at: 1860, out: N + 188, head: "Fifteen pendulums.", sub: "Each one swings on its own." },
  { at: 240, out: 450 - 16, head: "Shorter string, faster swing." },
  {
    at: 450,
    out: 600 - 18,
    head: "Tuned to fit one more swing",
    sub: "The longest: 24 swings in 32 s. The shortest: 38.",
  },
  { at: 690, out: 870 - 20, head: "It only looks random.", sub: "Every swing is set by a length." },
  { at: 1050, out: 1410 - 16, head: "Same lengths, same dance.", sub: "Small swings, no friction: an ideal model." },
  { at: 1410, out: 1680 - 16, head: "Every one finishes whole swings…" },
  { at: 1680, out: 1830, head: "…so at 32 s they line up again." },
];
// the formula card: [in, out] per size (in the square it takes the caption's place, so the caption yields to it)
const CARD_WIDE: [number, number][] = [
  [270, 434],
  [1170, 1394],
];
const CARD_SQUARE: [number, number][] = [
  [336, 434],
  [1230, 1394],
];
const SQUARE_YIELD: Record<number, number> = { 240: 318, 1050: 1212 }; // caption start → when it leaves for the card

/** frames since an event, on the loop (so something that starts late in the cycle is still settling at frame 0) */
const since = (F: number, at: number) => (((F - at) % N) + N) % N;
/** 0..1: how strongly pendulum k is lit as "one group" around a pattern frame (every q-th one, from k = q) */
const groupLit = (k: number, F: number) => {
  let v = 0;
  for (const p of PATTERNS) {
    const f = F - (p.f - 3);
    if (k === 0 || k % p.q || f < 0 || f > 80) continue;
    v = Math.max(v, Math.min(prog(f, 0, 3), 1 - prog(f, 62, 80)));
  }
  // the seam: all fifteen in step, lit together only while that is true (a few frames either side of frame 0; by
  // frame 24 the longest and shortest are already a sixth of a swing apart)
  const s = since(F, N - 12);
  if (k !== 0 && s <= 36) v = Math.max(v, Math.min(prog(s, 0, 3), 1 - prog(s, 20, 36)));
  return v;
};

// the slams: each named pattern, and the realignment at the seam, lands as a full-width band with a hit in the
// score, settles into the outlined pill and fades. `life` is how long it stays; the seam's is short, because "all
// in step" stops being true within half a second.
const SLAMS = [
  ...PATTERNS.map((p) => ({ f: p.f, n: p.n, d: p.d, name: p.name, life: 80 })),
  { f: N, n: 1, d: 1, name: "all in step", life: 40 },
];
/** 0..1: the impact of the latest slam, instant on its frame and decaying over about a third of a second; the lit
 *  group's bobs and dots pop by it, so the moment lands in the pendulums as well as on the band */
const slamKick = (F: number) => {
  let v = 0;
  for (const s of SLAMS) {
    const f = since(F, s.f - 2);
    if (f <= 60) v = Math.max(v, Math.exp(-f / 10) * (1 - prog(f, 40, 60)));
  }
  return v;
};
/** frames since slam s began (it lands two frames before its pattern frame), or -1 when it is not on screen */
const slamAge = (s: (typeof SLAMS)[number], F: number) => {
  const f = since(F, s.f - 2);
  return f <= s.life ? f : -1;
};

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a: string, b: string, t: number) => {
  const x = hex(a),
    y = hex(b);
  return `#${x
    .map((v, i) =>
      Math.round(lerp(v, y[i]!, t))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
};
const rgba = (h: string, a: number) => `rgba(${hex(h).join(",")},${a})`;

export function make(size: Size, id: string): Film {
  const L = layout(size),
    { W, H, u } = L,
    wide = L.wide;
  const S = L.safe;

  // ---- per-size design
  const D = wide
    ? {
        view: { x: 0, y: 0, w: W * 0.6, h: H }, // the main view's box
        focal: 1850 * u,
        ox: 690 * u,
        oy: 566 * u,
        bob: 26 * u,
        col: W * 0.6 + 40 * u, // the right column's left edge
        colW: W - S.x - (W * 0.6 + 40 * u),
        capY: S.top + 64 * u,
        capW: W - S.x - (W * 0.6 + 40 * u),
        card: { x: W * 0.6 + 40 * u, y: 380 * u },
        pillY: 648 * u,
        // the trace fills the column (big) whenever the formula card is not shown, and tucks under the card when it is
        trace: { x0: W * 0.6 + 64 * u, x1: W - S.x - 24 * u, y: 790 * u, amp: 64 * u, dot: 8 * u },
        big: { y: 700 * u, amp: 140 * u, dot: 10 * u, pillY: 470 * u },
        ring: { x: W * 0.6 + 40 * u + 46 * u, y: H - S.bottom - 46 * u, r: 44 * u },
        timeAt: {
          x: W * 0.6 + 40 * u + 118 * u,
          y: H - S.bottom - 34 * u,
          align: "left" as CanvasTextAlign,
          size: 34 * u,
        },
      }
    : {
        view: { x: 0, y: 290 * u, w: W, h: 480 * u },
        focal: 1250 * u,
        ox: W * 0.5 - 20 * u,
        oy: 548 * u,
        bob: 22 * u,
        col: S.x,
        colW: W - 2 * S.x,
        capY: S.top + 58 * u,
        capW: W - 2 * S.x,
        card: { x: S.x, y: S.top + 4 * u },
        pillY: 768 * u,
        trace: { x0: S.x + 16 * u, x1: W - S.x - 200 * u, y: 916 * u, amp: 62 * u, dot: 8 * u },
        big: null,
        ring: { x: W - S.x - 80 * u, y: 898 * u, r: 50 * u },
        timeAt: { x: W - S.x - 80 * u, y: H - S.bottom - 6 * u, align: "center" as CanvasTextAlign, size: 26 * u },
      };

  // ---- the camera: a one-point projection, orbiting the bar's middle by ±1.5° with period G
  const H0 = ((wide ? -44 : -50) * Math.PI) / 180,
    DIST = 1.9,
    EYE = -0.3, // eye height: below the bar (Y = 0), level with the middle of the bobs
    MID = BAR / 2;
  const camera = (F: number) => {
    const h = H0 + ((1.5 * Math.PI) / 180) * Math.sin((TAU * F) / N),
      fwd = [Math.sin(h), Math.cos(h)] as const, // (x, z)
      right = [Math.cos(h), -Math.sin(h)] as const,
      pos = [-DIST * fwd[0], MID - DIST * fwd[1]] as const;
    return (X: number, Y: number, Z: number) => {
      const dx = X - pos[0],
        dz = Z - pos[1],
        xr = dx * right[0] + dz * right[1],
        zr = dx * fwd[0] + dz * fwd[1];
      return { x: D.ox + (D.focal * xr) / zr, y: D.oy - (D.focal * (Y - EYE)) / zr, z: zr };
    };
  };
  const zNear = DIST - MID * Math.cos(H0); // depth of the nearest pendulum at rest, for scaling bobs

  // ---- the main view
  const mainView = (ctx: Ctx, F: number) => {
    const pr = camera(F),
      pc = { x: D.view.x + D.view.w / 2, y: D.oy + 90 * u }; // zoom about the bobs' height, so they never drop onto the pill
    // the half-time push (peaking at 960), and a camera snap on every slam: an instant 7% punch-in that springs
    // back with a small undershoot
    let push = 1 + 0.04 * Math.sin(Math.PI * prog(F, 870, 1050)) ** 2;
    for (const s of SLAMS) {
      const f = since(F, s.f - 2);
      if (f <= 120) push += (wide ? 0.1 : 0.07) * Math.exp(-f / 16) * Math.cos((TAU * f) / 50);
    }
    ctx.save();
    ctx.beginPath();
    ctx.rect(D.view.x, 0, D.view.w - (wide ? 24 * u : 0), H); // the main view keeps to its column
    ctx.clip();
    ctx.translate(pc.x, pc.y);
    ctx.scale(push, push);
    ctx.translate(-pc.x, -pc.y);
    // the floor: a faint 1 px grid under the bobs
    ctx.strokeStyle = rgba(C.line, 1);
    ctx.lineWidth = 1 * u;
    ctx.globalAlpha = 0.35 * 2.2; // "line" on graphite is near the ground; 0.35 of a brighter line reads as faint
    const gx0 = -0.3,
      gx1 = 0.3,
      gz0 = -0.16,
      gz1 = BAR + 0.16;
    ctx.beginPath();
    for (let X = gx0; X <= gx1 + 1e-6; X += 0.075) {
      const a = pr(X, FLOOR, gz0),
        b = pr(X, FLOOR, gz1);
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
    }
    for (let Z = gz0; Z <= gz1 + 1e-6; Z += 0.08) {
      const a = pr(gx0, FLOOR, Z),
        b = pr(gx1, FLOOR, Z);
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
    // shadows: the only shadow in the piece, a soft ellipse under each bob whose x follows the bob
    for (let k = COUNT - 1; k >= 0; k--) {
      const th = theta(k, F),
        s = pr(LEN[k]! * Math.sin(th), FLOOR, k * SPACING),
        r = D.bob * 1.25 * (zNear / s.z);
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.scale(1, 0.32);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
      g.addColorStop(0, "rgba(0,0,0,0.35)");
      g.addColorStop(0.55, "rgba(0,0,0,0.22)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    // the bar: a 6 px surface rail with a 1 px ink highlight, tapering with depth, and two end caps
    const b0 = pr(0, 0, -0.05),
      b1 = pr(0, 0, BAR + 0.05),
      t0 = 6 * u * (zNear / b0.z),
      t1 = 6 * u * (zNear / b1.z);
    ctx.fillStyle = mix(C.surface, C.ink, 0.12);
    ctx.beginPath();
    ctx.moveTo(b0.x, b0.y - t0 / 2);
    ctx.lineTo(b1.x, b1.y - t1 / 2);
    ctx.lineTo(b1.x, b1.y + t1 / 2);
    ctx.lineTo(b0.x, b0.y + t0 / 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgba(C.ink, 0.55);
    ctx.lineWidth = 1 * u;
    ctx.beginPath();
    ctx.moveTo(b0.x, b0.y - t0 / 2);
    ctx.lineTo(b1.x, b1.y - t1 / 2);
    ctx.stroke();
    for (const [p, t] of [
      [b0, t0],
      [b1, t1],
    ] as const) {
      ctx.fillStyle = mix(C.surface, C.ink, 0.22);
      ctx.fillRect(p.x - t * 0.9, p.y - t * 1.4, t * 1.8, t * 2.8);
    }
    // the pendulums, far to near
    for (let k = COUNT - 1; k >= 0; k--) {
      const th = theta(k, F),
        Z = k * SPACING,
        top = pr(0, 0, Z),
        bob = pr(LEN[k]! * Math.sin(th), -LEN[k]! * Math.cos(th), Z),
        depth = zNear / bob.z,
        r = D.bob * depth * (1 + 0.45 * groupLit(k, F) * slamKick(F));
      ctx.strokeStyle = rgba(C.ink, 0.7 * lerp(0.7, 1, depth));
      ctx.lineWidth = 1.5 * u;
      ctx.beginPath();
      ctx.moveTo(top.x, top.y);
      ctx.lineTo(bob.x, bob.y);
      ctx.stroke();
      const gl = groupLit(k, F),
        lit = k === 0 ? C.accent : gl > 0 ? mix(C.ink, C.accent2, gl) : C.ink,
        rim = k === 0 ? mix(C.accent, C.ground, 0.62) : C.surface;
      const g = ctx.createRadialGradient(bob.x - r * 0.38, bob.y - r * 0.42, r * 0.08, bob.x, bob.y, r);
      g.addColorStop(0, lit);
      g.addColorStop(k === 0 ? 0.55 : 0.5, k === 0 ? mix(C.accent, C.ground, 0.2) : mix(lit, C.surface, 0.55));
      g.addColorStop(1, rim);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(bob.x, bob.y, r, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  };

  // ---- the trace: fifteen dots, their swing drawn vertically, joined by one accent2 line. In the landscape it is
  // big while the column is free and compact (under the card) while the formula card is shown.
  const cardIn = (F: number) =>
    ease.inOutCubic(
      Math.max(0, ...CARD_WIDE.map(([a, b]) => Math.min(prog(F, a - 24, a), 1 - prog(F, b + 16, b + 40)))),
    );
  const traceAt = (F: number) => {
    const B = D.big;
    if (!B) return { ...D.trace, pillY: D.pillY };
    const c = cardIn(F);
    return {
      ...D.trace,
      y: lerp(B.y, D.trace.y, c),
      amp: lerp(B.amp, D.trace.amp, c),
      dot: lerp(B.dot, D.trace.dot, c),
      pillY: lerp(B.pillY, D.pillY, c),
    };
  };
  const traceX = (k: number) => lerp(D.trace.x0, D.trace.x1, k / (COUNT - 1));
  const trace = (ctx: Ctx, F: number) => {
    const T = traceAt(F),
      pad = 22 * u;
    // axis and ticks
    ctx.fillStyle = C.line;
    ctx.fillRect(T.x0 - pad, T.y - 0.5 * u, T.x1 - T.x0 + 2 * pad, 1 * u);
    for (let k = 0; k < COUNT; k++) {
      const x = traceX(k);
      ctx.fillRect(x - 0.5 * u, T.y - T.amp - 6 * u, 1 * u, 8 * u);
      ctx.fillRect(x - 0.5 * u, T.y + T.amp - 2 * u, 1 * u, 8 * u);
    }
    // the group levels: q guide lines that come in around each pattern frame (and the single line at the seam)
    const guides: { q: number; a: number }[] = PATTERNS.map((p) => ({
      q: p.q,
      a: Math.min(prog(since(F, p.f - 24), 0, 18), 1 - prog(since(F, p.f - 24), 24 + 40, 24 + 64)),
    }));
    guides.push({ q: 1, a: Math.max(1 - prog(F, 30, 60), prog(F, N - 60, N - 36)) });
    for (const { q, a } of guides) {
      if (a <= 0) continue;
      const levels = [...new Set(Array.from({ length: q }, (_, j) => Math.cos((TAU * j) / q).toFixed(4)))].map(Number);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.strokeStyle = rgba(C.accent2, 0.5);
      ctx.lineWidth = 1.5 * u;
      ctx.setLineDash([6 * u, 8 * u]);
      for (const lv of levels) {
        const y = T.y - lv * T.amp,
          grow = ease.outCubic(a);
        ctx.beginPath();
        ctx.moveTo(T.x0 - pad, y);
        ctx.lineTo(lerp(T.x0 - pad, T.x1 + pad, grow), y);
        ctx.stroke();
      }
      ctx.restore();
    }
    // the line and the dots
    const pts = Array.from({ length: COUNT }, (_, k) => [traceX(k), T.y - swing(k, F) * T.amp] as const);
    ctx.strokeStyle = C.accent2;
    ctx.lineWidth = 3 * u;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
    pts.forEach(([x, y], k) => {
      const gl = groupLit(k, F);
      ctx.fillStyle = k === 0 ? C.accent : gl > 0 ? mix(C.ink, C.accent2, gl) : C.ink;
      ctx.beginPath();
      ctx.arc(x, y, T.dot * (1 + 0.35 * gl + 0.5 * gl * slamKick(F)), 0, TAU);
      ctx.fill();
    });
  };

  // ---- the progress ring and the timecode
  const ring = (ctx: Ctx, F: number) => {
    const R = D.ring,
      p = F / N,
      a0 = -Math.PI / 2,
      a1 = a0 + p * TAU;
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 1.5 * u;
    ctx.beginPath();
    ctx.arc(R.x, R.y, R.r, 0, TAU);
    ctx.stroke();
    if (p > 0) {
      ctx.strokeStyle = C.accent2;
      ctx.lineWidth = 3 * u;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(R.x, R.y, R.r, a0, a1);
      ctx.stroke();
    }
    ctx.fillStyle = C.accent2;
    ctx.beginPath();
    ctx.arc(R.x + Math.cos(a1) * R.r, R.y + Math.sin(a1) * R.r, 5 * u, 0, TAU);
    ctx.fill();
    // "32 s" inside the ring: the cycle it measures
    text(ctx, "32 s", R.x, R.y + 8 * u, {
      size: 22 * u,
      family: F_.mono,
      weight: 500,
      color: C.muted,
      align: "center",
    });
    const T = D.timeAt;
    text(ctx, `t = ${(Math.floor(F / 6) / 10).toFixed(1)} s`, T.x, T.y, {
      size: T.size,
      family: F_.mono,
      weight: 500,
      color: C.ink,
      align: T.align,
    });
  };

  // ---- drawn glyphs: the pack's fonts carry no π, √, ⅓ or ⅔, so they are drawn (same stroke as the mono)
  const frac = (ctx: Ctx, x: number, base: number, size: number, n: number, d: number, color: string) => {
    const s = size * 0.62,
      o = { size: s, family: F_.mono, weight: 500, color };
    text(ctx, String(n), x, base - size * 0.34, o);
    const nw = measure(ctx, String(n), o);
    ctx.strokeStyle = color;
    ctx.lineWidth = size * 0.075;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x + nw * 0.55, base + size * 0.04);
    ctx.lineTo(x + nw * 1.55, base - size * 0.8);
    ctx.stroke();
    text(ctx, String(d), x + nw * 1.2, base + size * 0.04, o);
    return nw * 2.25;
  };
  const formula = (ctx: Ctx, x: number, base: number, size: number, color: string) => {
    const o = { size, family: F_.mono, weight: 500, color },
      adv = measure(ctx, "0", o),
      lw = size * 0.085;
    let cx = x + text(ctx, "T = 2", x, base, o);
    // π
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const top = base - size * 0.54;
    ctx.beginPath();
    ctx.moveTo(cx + adv * 0.1, top + lw * 0.6);
    ctx.quadraticCurveTo(cx + adv * 0.2, top - lw * 0.2, cx + adv * 0.4, top);
    ctx.lineTo(cx + adv * 0.94, top);
    ctx.moveTo(cx + adv * 0.36, top);
    ctx.quadraticCurveTo(cx + adv * 0.34, base - size * 0.2, cx + adv * 0.2, base);
    ctx.moveTo(cx + adv * 0.68, top);
    ctx.lineTo(cx + adv * 0.66, base - size * 0.1);
    ctx.quadraticCurveTo(cx + adv * 0.68, base, cx + adv * 0.88, base - size * 0.04);
    ctx.stroke();
    cx += adv;
    // √ with a vinculum over L/g
    const inner = "L/g",
      iw = measure(ctx, inner, o),
      vy = base - size * 0.9;
    ctx.beginPath();
    ctx.moveTo(cx + adv * 0.08, base - size * 0.34);
    ctx.lineTo(cx + adv * 0.26, base - size * 0.42);
    ctx.lineTo(cx + adv * 0.48, base + size * 0.02);
    ctx.lineTo(cx + adv * 0.82, vy);
    ctx.lineTo(cx + adv * 0.96 + iw + adv * 0.1, vy);
    ctx.stroke();
    text(ctx, inner, cx + adv * 0.96, base, o);
    return cx + adv * 1.06 + iw - x;
  };

  // ---- captions: an Inter 600 headline and one muted line, word by word on springs, leaving by fading up 12 px
  const HEAD = 60 * u,
    SUB = 42 * u; // the brief's 34 px muted line is raised to 42 so it reads on a phone
  const wrap = (ctx: Ctx, s: string, o: { size: number; family: string; weight: number }, max: number) => {
    const lines: string[][] = [[]];
    for (const w of s.split(" ")) {
      const cur = lines[lines.length - 1]!,
        tryLine = [...cur, w].join(" ");
      if (cur.length && measure(ctx, tryLine, o) > max) lines.push([w]);
      else cur.push(w);
    }
    if (lines.length !== 2) return lines;
    // two lines: balance them (no orphan word on the second line)
    const ws = s.split(" ");
    let best = lines,
      bestW = Infinity;
    for (let b = 1; b < ws.length; b++) {
      const a = ws.slice(0, b),
        c = ws.slice(b),
        wmax = Math.max(measure(ctx, a.join(" "), o), measure(ctx, c.join(" "), o));
      if (wmax <= max && wmax < bestW) {
        best = [a, c];
        bestW = wmax;
      }
    }
    return best;
  };
  const captionAt = (ctx: Ctx, c: Caption, f: number) => {
    // f = frames since c.at (already wrapped); the caption lives for (out - at) + 16 frames
    const life = c.out - c.at,
      yieldAt = !wide && SQUARE_YIELD[c.at] !== undefined ? SQUARE_YIELD[c.at]! - c.at : life;
    const leaveF = Math.min(life, yieldAt);
    if (f < 0 || f > leaveF + 16) return;
    const leave = ease.inOutCubic(prog(f, leaveF, leaveF + 16));
    const ho = { size: HEAD, family: F_.sans, weight: 600, track: -0.02 },
      so = { size: SUB, family: F_.sans, weight: 400, track: -0.005 };
    const hl = wrap(ctx, c.head, ho, D.capW),
      sl = c.sub ? wrap(ctx, c.sub, so, D.capW) : [];
    let i = 0;
    ctx.save();
    ctx.globalAlpha *= 1 - leave;
    ctx.translate(0, -12 * u * leave);
    const put = (
      lines: string[][],
      o: typeof ho,
      y0: number,
      lh: number,
      color: string,
      start: number,
      every: number,
    ) => {
      lines.forEach((ws, li) => {
        let x = D.col;
        const y = y0 + li * lh;
        ws.forEach((w) => {
          const at = start + i * every,
            p = spring((f - at) / FPS, { freq: 3, damp: 0.78 });
          i++;
          const ww = measure(ctx, w, o);
          if (p > 0.001) {
            ctx.save();
            ctx.globalAlpha *= clamp(p * 1.5);
            ctx.translate(0, (1 - p) * o.size * 0.4);
            text(ctx, w, x, y, { ...o, color });
            ctx.restore();
          }
          x += ww + o.size * 0.26;
        });
      });
    };
    put(hl, ho, D.capY, HEAD * 1.12, C.ink, 0, 7);
    const hEnd = i * 7 + 6;
    i = 0;
    put(sl, so, D.capY + (hl.length - 1) * HEAD * 1.12 + SUB * 1.55, SUB * 1.28, C.muted, hEnd, 4);
    ctx.restore();
  };
  const captions = (ctx: Ctx, F: number) => {
    for (const c of CAPTIONS) {
      captionAt(ctx, c, F - c.at);
      if (c.out > N) captionAt(ctx, c, F + N - c.at); // the seam caption, seen from the next cycle
    }
  };

  // ---- the formula card
  const CARD = wide ? CARD_WIDE : CARD_SQUARE;
  const cardW = wide ? D.colW : 640 * u,
    cardH = wide ? 196 * u : 204 * u;
  const formulaCard = (ctx: Ctx, F: number) => {
    const win = CARD.find(([a, b]) => F >= a && F < b + 16);
    if (!win) return;
    const [a, b] = win,
      inP = spring((F - a) / FPS, { freq: 2, damp: 0.66 }),
      leave = ease.inOutCubic(prog(F, b, b + 16));
    const x = D.card.x + (1 - inP) * 160 * u,
      y = D.card.y - 12 * u * leave;
    ctx.save();
    ctx.globalAlpha = clamp(inP * 1.6) * (1 - leave);
    rr(ctx, x, y, cardW, cardH, 14 * u);
    ctx.fillStyle = C.surface;
    ctx.fill();
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 1 * u;
    ctx.stroke();
    formula(ctx, x + 32 * u, y + (wide ? 76 : 72) * u, 50 * u, C.ink); // 40 → 50 px: the key line of the card
    const so = { size: 36 * u, family: F_.sans, weight: 400, color: C.muted, track: -0.005 };
    if (wide) {
      text(ctx, "four times the length,", x + 32 * u, y + 130 * u, so);
      text(ctx, "twice the time", x + 32 * u, y + 172 * u, so);
    } else {
      text(ctx, "four times the length,", x + 32 * u, y + 134 * u, { ...so, size: 40 * u });
      text(ctx, "twice the time", x + 32 * u, y + 180 * u, { ...so, size: 40 * u });
    }
    ctx.restore();
  };

  // ---- the slam: each pattern lands as a full-width accent2 band with its name in large mono (a hit in the score on
  // the same frame), then settles into the brief's small outlined pill above the trace and fades after two beats
  // the band bleeds edge to edge (square-cornered, then rounding into the pill): across the whole square, and across
  // the landscape's right column, clipped at the hairline so it never crosses into the pendulums
  const POP = 1.06,
    band = wide ? { cx: W * 0.8, w: W * 0.4 } : { cx: W / 2, w: W };
  const BAND_H = (F: number) => (wide ? lerp(116, 96, cardIn(F)) : 122) * u, // slimmer under the landscape's card
    PILL_H = 60 * u;
  const pill = (ctx: Ctx, F: number) => {
    for (const sl of SLAMS) {
      const f = slamAge(sl, F);
      if (f < 0) continue;
      const settle = ease.inOutCubic(prog(f, 8, 22)),
        pop = spring(f / FPS, { freq: 4.5, damp: 0.55 }),
        fade = 1 - prog(f, sl.life - 18, sl.life);
      const size = lerp(52, 34, settle) * u,
        o = { size, family: F_.mono, weight: 500, color: mix(C.ground, C.ink, settle) };
      const label = ` · ${sl.name}`,
        fw = sl.d === 1 ? measure(ctx, "1", o) : size * 0.62 * 0.6 * 2.25 + (4 * u * size) / (34 * u),
        tw = fw + measure(ctx, label, o),
        pillW = tw + 2 * 26 * u,
        T = traceAt(F),
        w = lerp(band.w, pillW, settle),
        h = lerp(BAND_H(F), PILL_H, settle),
        cx = lerp(band.cx, (D.trace.x0 + D.trace.x1) / 2, settle),
        cy = T.pillY;
      ctx.save();
      if (wide) {
        ctx.beginPath();
        ctx.rect(W * 0.6 + 1 * u, 0, W * 0.4, H);
        ctx.clip();
      }
      ctx.globalAlpha = prog(f, 0, 2) * fade;
      ctx.translate(cx, cy);
      const sc = lerp(POP, 1, pop);
      ctx.scale(sc, sc);
      rr(ctx, -w / 2, -h / 2, w, h, (h / 2) * settle);
      ctx.fillStyle = mix(C.accent2, C.ground, settle);
      ctx.fill();
      ctx.strokeStyle = C.accent2;
      ctx.lineWidth = 1.5 * u;
      ctx.stroke();
      const x0 = -tw / 2,
        base = size * 0.36,
        fracColor = mix(C.ground, C.accent2, settle);
      if (sl.d === 1) text(ctx, "1", x0, base, { ...o, color: fracColor });
      else frac(ctx, x0, base, size, sl.n, sl.d, fracColor);
      text(ctx, label, x0 + fw, base, o);
      ctx.restore();
    }
  };

  const paint = (ctx: Ctx, env: Env, F: number) => {
    F = ((F % N) + N) % N; // an exact loop: frame N is frame 0
    ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
    ctx.fillStyle = C.ground;
    ctx.fillRect(0, 0, W, H);
    if (wide) {
      // a hairline between the two columns
      ctx.fillStyle = C.line;
      ctx.fillRect(W * 0.6, S.top, 1 * u, H - S.top - S.bottom);
    }
    mainView(ctx, F);
    trace(ctx, F);
    ring(ctx, F);
    captions(ctx, F);
    formulaCard(ctx, F);
    pill(ctx, F);
  };

  // shots only name the sections (each starts on the beat grid: a beat is 30 frames)
  const cuts = [0, 240, 450, 600, 870, 1050, 1410, 1680, N],
    names = ["in-step", "the-rule", "the-tuning", "looks-random", "half-time", "the-way-back", "four-again", "realign"];
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
    audio: (sr: number) => {
      const [Lc, Rc] = beatScore({
        frames: N,
        fps: FPS,
        bpm: BPM,
        mood: "soft",
        loop: true,
        whooshes: [0], // ends on frame 0: its swell wraps to the end of the file and lands the realignment
        hits: [0, ...PATTERNS.map((p) => p.f)], // every slam, and the realignment, lands on a hit
        ticks: PATTERNS.map((p) => p.f),
        gain: GAIN,
      })(sr);
      plucks(Lc, Rc, sr);
      return [Lc, Rc];
    },
  };
}

// ---- the phasing, audible: each pendulum plucks one note of A minor pentatonic (longest lowest) at each of its
// right-hand turning points, t = G·m/N_k, wrapped into the file so the loop is seamless. All fifteen at once at
// the seam (one chord), a shimmer between.
const GAIN = 0.7,
  PLUCK = 0.14;
const SCALE = [57, 60, 62, 64, 67, 69, 72, 74, 76, 79, 81, 84, 86, 88, 91];
function plucks(Lc: Float32Array, Rc: Float32Array, sr: number) {
  const n = Lc.length,
    len = Math.round(0.45 * sr);
  for (let k = 0; k < COUNT; k++) {
    const hz = 440 * 2 ** ((SCALE[k]! - 69) / 12),
      pan = lerp(0.3, 0.7, k / (COUNT - 1)),
      vel = PLUCK * lerp(1.15, 0.7, k / (COUNT - 1)); // the high notes quieter, so the chord is round
    const wave = new Float32Array(len);
    for (let j = 0; j < len; j++) {
      const t = j / sr;
      wave[j] =
        (Math.sin(TAU * hz * t) + 0.3 * Math.sin(TAU * 2 * hz * t)) * Math.exp(-t * 7) * Math.min(1, t / 0.002) * vel;
    }
    for (let m = 0; m < NK[k]!; m++) {
      const i0 = Math.round((sr * G * m) / NK[k]!);
      for (let j = 0; j < len; j++) {
        const i = (i0 + j) % n,
          v = wave[j]!;
        Lc[i] = Lc[i]! + v * (1 - pan) * 2 * 0.5;
        Rc[i] = Rc[i]! + v * pan * 2 * 0.5;
      }
    }
  }
  for (let i = 0; i < n; i++) {
    Lc[i] = Math.tanh(Lc[i]!);
    Rc[i] = Math.tanh(Rc[i]!);
  }
}

export const pendulumWaveSquare = make("square", "pendulumWaveSquare");
export const pendulumWave = make("landscape", "pendulumWave");
