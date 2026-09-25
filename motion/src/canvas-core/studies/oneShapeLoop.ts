// STUDY 03 · ONE-SHAPE LOOP (8 s, 60 fps, seamless). One rounded shape becomes every state of an interaction for
// a fictional scheduling product: a 'Schedule' pill is pressed, collapses into a spinner, closes into a check,
// stretches into a booked card and folds back into the pill. One source, designed for square and landscape.
// Brief: series/studies/briefs/one-shape-loop.json · prompt: series/studies/prompts/one-shape-loop.prompt.md
//
// A loop is a closed path in state space. Every property of the shape is a kit track keyed on springs with
// loop = N, whose last key equals its first, so frame N-1 flows into frame 0 by construction (loop-seam proves
// it). The whole piece is one continuous paint(F) of a fractional frame; the shots only name the states.
import PACK from "../../../brand/packs/studio/pack.json";
import type { Ctx, Env } from "../core";
import type { Film, Shot } from "../film";
import { motionBlur } from "../kit/blur";
import { clamp, ease, lerp, phase, prog, spring, track } from "../kit/motion";
import { usePack } from "../kit/pack";
import { beatScore } from "../kit/score";
import { layout, type Size } from "../kit/sizes";
import { text } from "../kit/type";
import { check, rr } from "../kit/ui";

const P = usePack(PACK),
  C = P.palette("loop"),
  F_ = P.face;
const FPS = 60,
  BPM = 120,
  N = 480; // a beat is 30 frames, a bar 120
// the states, in frames (each on the beat grid)
const T = { pill: 0, spin: 120, done: 240, card: 330, fold: 420 };
const PRESS = 90,
  CHECK = 262; // the two ticks
const TAU = Math.PI * 2;

// ---- the shape's state path. Every value springs from key to key and wraps at N (last key = first key).
type Keys = [number, number][];
const MORPH = { freq: 2.1, damp: 0.74 },
  SOFT = { freq: 2.6, damp: 1 },
  GLIDE = { freq: 1.1, damp: 0.9 };
const loopTrack = (F: number, keys: Keys, o = MORPH) => track(F, FPS, keys, o, N);
const KEY = {
  // size in design px (× k): pill 380×116 → circle 132 → card 556×200 → pill
  w: [
    [0, 380],
    [112, 132],
    [T.card, 556],
    [T.fold + 2, 380],
  ] as Keys,
  h: [
    [0, 116],
    [112, 132],
    [T.card, 200],
    [T.fold + 2, 116],
  ] as Keys,
  r: [
    [0, 58],
    [112, 66],
    [T.card, 34],
    [T.fold + 2, 58],
  ] as Keys,
  // press: the whole shape dips and springs back; the solid disc pops when it closes
  scale: [
    [0, 1],
    [PRESS - 2, 0.93],
    [PRESS + 8, 1],
    [T.done + 8, 1.09],
    [T.done + 20, 1],
  ] as Keys,
  // 0 = indigo, 1 = white card
  white: [
    [0, 0],
    [T.card, 1],
    [T.fold, 0],
  ] as Keys,
  // 0 = solid, 1 = a ring (the spinner's track)
  hollow: [
    [0, 0],
    [140, 1],
    [T.done + 2, 0],
  ] as Keys,
  // 1 = the accent covers the whole ring, 0 = only the chasing arc
  full: [
    [0, 1],
    [150, 0],
    [T.done - 14, 1],
  ] as Keys,
  label: [
    [0, 1],
    [104, 0],
    [T.fold + 22, 1],
  ] as Keys,
  checkDraw: [
    [0, 0],
    [CHECK - 8, 1],
    [T.fold, 0],
  ] as Keys,
  checkAlpha: [
    [0, 0],
    [T.done + 10, 1],
    [T.card - 14, 0],
  ] as Keys,
  content: [
    [0, 0],
    [T.card + 12, 1],
    [T.fold - 12, 0],
  ] as Keys,
  // the cursor, relative to the shape's centre (× k): enters from the lower right, presses, steps aside, leaves
  cx: [
    [0, 560],
    [8, 140],
    [150, 205],
    [T.card + 20, 300],
    [T.fold + 4, 560],
  ] as Keys,
  cy: [
    [0, 520],
    [8, 22],
    [150, 118],
    [T.card + 20, 160],
    [T.fold + 4, 520],
  ] as Keys,
  cpress: [
    [0, 1],
    [PRESS - 3, 0.84],
    [PRESS + 7, 1],
  ] as Keys,
};
// the landscape's state ticker counts 0,1,2,3,4 and is read mod 4 (the step from 3 to 4 IS the step back to 0,
// so the loop closes even though the count keeps rising)
const STEP: Keys = [
  [0, 0],
  [116, 1],
  [T.done + 4, 2],
  [T.card + 4, 3],
  [T.fold + 10, 4],
];
const STATES = ["Schedule", "Finding a time", "Confirmed", "Booked"];

// colour helpers (flat colour: a mix of two palette entries, never a gradient on the shape)
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
const TRACK = mix(C.accent2, C.accent, 0.14); // the spinner's track ring
const DOT = mix(C.line, C.muted, 0.45); // an idle indicator dot: between the rule and the muted text
const alpha = (h: string, a: number) => `rgba(${rgb(h).join(",")},${a})`;

// the spinner: a head and a tail that take turns running ahead (the classic arc that chases itself)
const chase = (F: number) => {
  const t = (F - T.spin) / 60,
    c = Math.floor(t),
    p = t - c,
    K = 0.72;
  const head = c * K + K * ease.inOutCubic(clamp(p * 2)),
    tail = c * K + K * ease.inOutCubic(clamp(p * 2 - 1));
  const rot = t * 0.55;
  return { a0: (tail + rot) * TAU - Math.PI / 2, span: (head - tail + 0.08) * TAU };
};

export function make(size: Size, id: string): Film {
  const L = layout(size),
    { W, H, u, cx, cy } = L,
    k = 1.5 * u;
  const oy = cy - 24 * u; // the shape's resting centre (a little above middle: the floor shadow sits below)

  const cursor = (ctx: Ctx, x: number, y: number, s: number) => {
    // a plain arrow pointer: ink body, white keyline, a soft contact shadow
    const pts: [number, number][] = [
      [0, 0],
      [0, 34],
      [8.5, 26.5],
      [14, 39],
      [20, 36.5],
      [14.5, 24],
      [25.5, 24],
    ];
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s * k, s * k);
    ctx.shadowColor = "rgba(21,21,26,0.22)";
    ctx.shadowBlur = 10 * k;
    ctx.shadowOffsetY = 4 * k;
    ctx.beginPath();
    pts.forEach(([a, b], i) => (i ? ctx.lineTo(a, b) : ctx.moveTo(a, b)));
    ctx.closePath();
    ctx.fillStyle = C.ink;
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = C.surface;
    ctx.stroke();
    ctx.restore();
  };

  // the booked card's face: a calendar glyph, the time, who it suits
  const cardFace = (ctx: Ctx, x: number, y: number, w: number, h: number, F: number, a: number) => {
    if (a <= 0.001) return;
    const g = 80 * k,
      gx = x + 44 * k,
      gy = y + h / 2 - g / 2,
      pop = (d: number) => spring((F - T.card - d) / FPS, { freq: 2.6, damp: 0.6 });
    const pg = pop(4),
      p1 = pop(10),
      p2 = pop(18);
    ctx.save();
    ctx.globalAlpha *= a;
    // calendar glyph
    ctx.save();
    ctx.translate(gx + g / 2, gy + g / 2);
    ctx.scale(0.6 + 0.4 * pg, 0.6 + 0.4 * pg);
    ctx.translate(-g / 2, -g / 2);
    rr(ctx, 0, 0, g, g, 16 * k);
    ctx.fillStyle = C.accent2;
    ctx.fill();
    ctx.save();
    rr(ctx, 0, 0, g, g, 16 * k);
    ctx.clip();
    ctx.fillStyle = C.accent;
    ctx.fillRect(0, 0, g, 22 * k);
    ctx.restore();
    for (const bx of [0.3, 0.7]) {
      rr(ctx, g * bx - 3 * k, -6 * k, 6 * k, 14 * k, 3 * k);
      ctx.fillStyle = C.ink;
      ctx.fill();
    }
    text(ctx, "25", g / 2, g - 16 * k, {
      size: 34 * k,
      family: F_.sans,
      weight: 800,
      color: C.accent,
      align: "center",
      track: -0.03,
    });
    ctx.restore();
    // copy
    const tx = gx + g + 30 * k,
      o1 = { size: 42 * k, family: F_.sans, weight: 600, color: C.ink, track: -0.025 };
    ctx.save();
    ctx.globalAlpha *= clamp(p1);
    ctx.translate(0, (1 - p1) * 14 * k);
    const w1 = text(ctx, "Thu 3:00 · ", tx, y + h / 2 - 2 * k, o1);
    text(ctx, "Booked", tx + w1 + 0.4 * k, y + h / 2 - 2 * k, { ...o1, color: C.accent });
    ctx.restore();
    ctx.save();
    ctx.globalAlpha *= clamp(p2);
    ctx.translate(0, (1 - p2) * 14 * k);
    text(ctx, "30 MIN · 4 OF 4 FREE", tx + 2 * k, y + h / 2 + 44 * k, {
      size: 22 * k,
      family: F_.mono,
      weight: 500,
      color: C.muted,
      track: 0.06,
    });
    ctx.restore();
    ctx.restore();
  };

  const scene = (ctx: Ctx, F: number) => {
    const w = loopTrack(F, KEY.w) * k,
      h = loopTrack(F, KEY.h) * k,
      r = loopTrack(F, KEY.r) * k;
    const label = clamp(loopTrack(F, KEY.label, SOFT)),
      white = clamp(loopTrack(F, KEY.white, SOFT));
    // breathing: the idle pill swells on every other beat; everything floats on a slow bob (both loop in N)
    const breathe = 1 + 0.018 * label * (0.5 - 0.5 * Math.cos(TAU * phase(F, 60)));
    const s = loopTrack(F, KEY.scale, { freq: 3.2, damp: 0.45 }) * breathe;
    const bob = Math.sin(TAU * phase(F, 240)) * 7 * k,
      x = cx,
      y = oy + bob;
    const sw = w * s,
      sh = h * s;

    // floor shadow: tighter and darker when the shape sits low
    const fy = oy + 100 * k + 20 * k,
      lift = (bob / (7 * k) + 1) / 2;
    ctx.save();
    ctx.translate(x, fy);
    ctx.scale(1, 0.16);
    const sr = sw * 0.46 * (1.04 - 0.08 * lift),
      g = ctx.createRadialGradient(0, 0, 0, 0, 0, sr);
    const sa = (0.19 - 0.05 * lift) * Math.min(1, (260 * k) / sw) ** 0.5;
    g.addColorStop(0, `rgba(21,21,26,${sa})`);
    g.addColorStop(0.55, `rgba(21,21,26,${sa * 0.45})`);
    g.addColorStop(1, "rgba(21,21,26,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, sr, 0, TAU);
    ctx.fill();
    ctx.restore();

    // success rings: two soft rings leave the disc as the check lands
    for (const [at, amp] of [
      [CHECK - 10, 1],
      [CHECK + 14, 0.7],
    ] as const) {
      const p = prog(F, at, at + 56);
      if (p <= 0 || p >= 1) continue;
      ctx.save();
      ctx.globalAlpha = (1 - p) * 0.5 * amp;
      ctx.strokeStyle = C.accent;
      ctx.lineWidth = 4 * k * (1 - p) + u;
      ctx.beginPath();
      ctx.arc(x, y, sh / 2 + ease.outCubic(p) * 150 * k, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }

    // the shape: an outer rounded rect, minus an inner one while it is a ring
    const L0 = x - sw / 2,
      T0 = y - sh / 2,
      hol = clamp(loopTrack(F, KEY.hollow, { freq: 2.4, damp: 0.9 }));
    const ring = 20 * k,
      inset = lerp(Math.min(sw, sh) / 2, ring, hol);
    const outline = () => {
      rr(ctx, L0, T0, sw, sh, r * s);
      if (hol > 0.002 && inset < Math.min(sw, sh) / 2 - 0.5) {
        const iw = sw - 2 * inset,
          ih = sh - 2 * inset;
        // the hole, wound the other way (evenodd fill)
        const ir = clamp(r * s - inset, 0, Math.min(iw, ih) / 2),
          il = L0 + inset,
          it = T0 + inset;
        ctx.moveTo(il + ir, it);
        ctx.arcTo(il, it, il, it + ih, ir);
        ctx.arcTo(il, it + ih, il + iw, it + ih, ir);
        ctx.arcTo(il + iw, it + ih, il + iw, it, ir);
        ctx.arcTo(il + iw, it, il, it, ir);
        ctx.closePath();
      }
    };
    const body = mix(C.accent, C.surface, white),
      full = clamp(loopTrack(F, KEY.full, { freq: 2.2, damp: 0.95 }));
    ctx.save();
    ctx.shadowColor = alpha(C.ink, 0.05 + 0.07 * white);
    ctx.shadowBlur = 30 * k;
    ctx.shadowOffsetY = 10 * k;
    outline();
    ctx.fillStyle = full > 0.999 ? body : TRACK;
    ctx.fill("evenodd");
    ctx.restore();
    if (full <= 0.999) {
      // the accent arc: a wedge from the centre, clipped to the ring
      const c = chase(F),
        span = lerp(c.span, TAU, ease.inOutCubic(full));
      ctx.save();
      outline();
      ctx.clip("evenodd");
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.arc(x, y, Math.max(sw, sh), c.a0, c.a0 + span);
      ctx.closePath();
      ctx.fillStyle = body;
      ctx.fill();
      ctx.restore();
    }

    // the press ripple, inside the pill
    const rp = prog(F, PRESS, PRESS + 40);
    if (rp > 0 && rp < 1) {
      ctx.save();
      outline();
      ctx.clip("evenodd");
      ctx.globalAlpha = 0.34 * (1 - rp);
      ctx.fillStyle = C.surface;
      ctx.beginPath();
      ctx.arc(x + 140 * k * s, y + 22 * k * s, ease.outCubic(rp) * 300 * k, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    // contents, clipped to the shape so the morph reveals and hides them
    ctx.save();
    outline();
    ctx.clip("evenodd");
    if (label > 0.01) {
      ctx.save();
      ctx.globalAlpha = label;
      ctx.translate(x, y);
      ctx.scale(s * (0.8 + 0.2 * label), s * (0.8 + 0.2 * label));
      text(ctx, "Schedule", 0, 15 * k, {
        size: 42 * k,
        family: F_.sans,
        weight: 600,
        color: C.surface,
        align: "center",
        track: -0.015,
      });
      ctx.restore();
    }
    const ca = clamp(loopTrack(F, KEY.checkAlpha, SOFT));
    if (ca > 0.01) {
      ctx.save();
      ctx.globalAlpha = ca;
      check(
        ctx,
        x - 2 * k,
        y + 2 * k,
        40 * k * s,
        clamp(loopTrack(F, KEY.checkDraw, { freq: 2.4, damp: 1 })),
        C.surface,
        11 * k,
      );
      ctx.restore();
    }
    cardFace(ctx, L0, T0, sw, sh, F, clamp(loopTrack(F, KEY.content, SOFT)));
    ctx.restore();

    return { x, y, s };
  };

  // landscape: the state's name in small mono on the left, a four-dot indicator on the right
  const rails = (ctx: Ctx, F: number, y: number) => {
    const step = loopTrack(F, STEP, { freq: 2.4, damp: 0.85 }),
      lx = L.safe.x + 110 * u,
      rx = W - L.safe.x - 110 * u;
    const lineH = 48 * u,
      mono = { size: 28 * u, family: F_.mono, weight: 500, track: 0.04 };
    text(ctx, "STATE", lx, y - 30 * u, { ...mono, size: 22 * u, color: C.muted, track: 0.12 });
    // an odometer: the names roll up through a one-line window
    ctx.save();
    ctx.beginPath();
    ctx.rect(lx - 10 * u, y - 4 * u, 520 * u, lineH);
    ctx.clip();
    const base = Math.floor(step);
    for (let i = base - 1; i <= base + 2; i++) {
      const dy = (i - step) * lineH,
        name = STATES[((i % 4) + 4) % 4]!;
      text(ctx, name, lx, y + 28 * u + dy, { ...mono, color: C.ink, alpha: clamp(1 - Math.abs(i - step) * 1.4) });
    }
    ctx.restore();
    // four dots; the active one stretches into a small indigo pill (the shape's own gesture, in miniature)
    const gap = 38 * u,
      dr = 7 * u,
      n = 4;
    const act = (i: number) => {
      let d = Math.abs((((step - i) % 4) + 4) % 4);
      d = Math.min(d, 4 - d);
      return clamp(1 - d);
    };
    const widths = Array.from({ length: n }, (_, i) => 2 * dr + 26 * u * ease.inOutCubic(act(i)));
    const total = widths.reduce((a, b) => a + b, 0) + gap * 0.6 * (n - 1);
    let px = rx - total;
    widths.forEach((wd, i) => {
      rr(ctx, px, y + 18 * u - dr, wd, 2 * dr, dr);
      ctx.fillStyle = mix(DOT, C.accent, act(i));
      ctx.fill();
      px += wd + gap * 0.6;
    });
    text(ctx, `0${(((Math.round(step) % 4) + 4) % 4) + 1} / 04`, rx, y - 30 * u, {
      ...mono,
      size: 22 * u,
      color: C.muted,
      align: "right",
      track: 0.12,
    });
  };

  const paint = (ctx: Ctx, env: Env, F: number) => {
    F = ((F % N) + N) % N; // the shutter may sample either side of the seam
    ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
    ctx.fillStyle = C.ground;
    ctx.fillRect(0, 0, W, H);
    const { x, y } = scene(ctx, F);
    if (L.wide) rails(ctx, F, oy - 14 * u);
    // the cursor, drawn last so it sits above everything
    const px = loopTrack(F, KEY.cx, GLIDE) * k,
      py = loopTrack(F, KEY.cy, GLIDE) * k;
    cursor(ctx, x + px, y + py, loopTrack(F, KEY.cpress, { freq: 3.4, damp: 0.5 }));
  };

  const cuts = [T.pill, T.spin, T.done, T.card, T.fold, N],
    names = ["pill", "spinner", "check", "card", "fold"];
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
    audio: beatScore({ frames: N, fps: FPS, bpm: BPM, mood: "soft", loop: true, ticks: [PRESS, CHECK], gain: 0.36 }),
  };
}

export const oneShapeLoop = make("square", "oneShapeLoop");
export const oneShapeLoopLandscape = make("landscape", "oneShapeLoopLandscape");
