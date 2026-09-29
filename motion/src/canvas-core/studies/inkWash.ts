// STUDY 37 · INK WASH (30 s, 30 fps, 90 bpm). Three seasons painted in sumi-e on one scroll: a plum branch, a
// heron, an old pine under snow. Every stroke is laid down by a moving brush (a centreline, a width profile, an
// ink load that falls along it), bleeds into the paper while wet and dries with a darker rim; where the brush runs
// dry it splits into bristle lanes (kasure). Washes are the same bleed at large scale, and snow is paper the wash
// went around. One original haiku soaks in per painting; a small vermilion seal closes it. Brand: the neutral pack
// (palette "sumi"); no product, no quokka.
// Brief: series/studies/briefs/ink-wash.json · prompt: series/studies/prompts/ink-wash.prompt.md
//
// The whole film is one continuous function paint(F) of a (fractional) frame F: every mark is a closed-form
// function of the frame (the brush tip, the bleed's growth, the drying rim), so any frame paints on its own. The
// paper is the only thing computed ahead, once per size, into an offscreen canvas.
import PACK from "../../../brand/packs/studio/pack.json";
import { fractal, rng, type Ctx, type Env, type Layer } from "../core";
import type { Film, Shot } from "../film";
import { motionBlur } from "../kit/blur";
import { bezier, clamp, ease, lerp, prog, window01 } from "../kit/motion";
import { usePack } from "../kit/pack";
import { beatScore } from "../kit/score";
import { layout, type Size } from "../kit/sizes";
import { measure, text } from "../kit/type";

const P = usePack(PACK),
  C = P.palette("sumi"),
  F_ = P.face;
const FPS = 30,
  BPM = 90,
  N = 900; // a beat is 20 frames
// the timeline, in frames (every section starts on a beat)
const T = { paper: 0, spring: 100, summer: 320, winter: 560, seal: 820 };
// the camera: a slow push-in hold on each painting. Each season change is a wet brush flick that whips across the
// frame and wipes into the next painting (a hard cut hidden under the ink, on a hit); three cut-in close-ups show
// strokes landing (the plum's first stroke, the heron's wing, the pine's needles); and a hard cut to the whole scroll before the seal.
// (Round 4 of the critique: the brief's camera "never cuts"; the owner traded that for punches.)
const HOLD: [number, number][] = [
  [0, 320],
  [320, 560],
  [560, 820],
];
const WIPES = [320, 560]; // the frame each flick covers the whole screen (the cut under it)
const WIPE_HALF = 6; // frames from the flick entering to the cut, and from the cut to it leaving
const GUST = 760; // the winter gust throws the snow sideways
const TEXT_OUT: [number, number] = [806, 818];
const SEAL_AT = 840,
  SEAL_PX = 120; // the seal's size on screen at 1080

type Pt = [number, number];
type Mark = { t0: number; draw: (ctx: Ctx, F: number) => void };

// ---------------------------------------------------------------- small helpers
const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const rgba = (h: string, a: number) => {
  const [r, g, b] = hex(h);
  return `rgba(${r},${g},${b},${clamp(a).toFixed(4)})`;
};
const mix = (a: string, b: string, t: number) => {
  const A = hex(a),
    B = hex(b);
  return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], t))).join(",")})`;
};
const sstep = (t: number) => {
  t = clamp(t);
  return t * t * (3 - 2 * t);
};
const hash = (a: number, b: number) => {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35);
  h = Math.imul(h ^ (h >>> 15), 0x27d4eb2f);
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
};
/** 1-D value noise along a lane: coherent runs, so a dry lane drops out in streaks, not dots */
const vnoise = (lane: number, s: number, L: number) => {
  const x = s / L,
    i = Math.floor(x),
    f = sstep(x - i);
  return lerp(hash(lane, i), hash(lane, i + 1), f);
};

// the brush gesture: fast in, slow out (the tip's arc length over the stroke's time), and its inverse
const GESTURE = bezier(0.3, 0.55, 0.35, 1),
  GESTURE_INV = bezier(0.55, 0.3, 1, 0.35);

// ---------------------------------------------------------------- THE BRUSH
type StrokeOpts = {
  w: number; // full width at the belly, world px
  tone: string;
  alpha?: number;
  load?: [number, number]; // ink load at the start and the end
  press?: number; // how long the press takes (0..1 of the stroke)
  taper?: number; // where the taper begins
  tip?: number; // the width left at the tip (0..1)
  bleed?: number; // how far the halo creeps, world px
  bleedDur?: number; // frames the halo grows before it stops
  halo?: number; // the halo's alpha
  step?: number; // stamp spacing
  seed?: number;
  lanes?: number; // bristle lanes in the dry brush (default: 10–16, seeded)
  clip?: (ctx: Ctx) => void; // a region the stroke may not enter (the wash going round the snow)
  wash?: boolean; // a broad pale wash: no feather, core or hair, a softer bleed (default: w ≥ 100)
};
type Sample = {
  x: number;
  y: number;
  nx: number;
  ny: number;
  a: number;
  s: number;
  u: number;
  f0: number;
  hw: number;
  load: number;
  nz: number[]; // edge noise for each halo layer, left then right (low + high frequency)
};

/** chain: p0, c1, c2, p1, c1, c2, p2 … (cubic Béziers sharing ends), in world px */
function brush(chain: Pt[], t0: number, dur: number, o: StrokeOpts): Mark {
  const seed = o.seed ?? Math.round(chain[0][0] * 7 + chain[0][1] * 13 + t0),
    alpha = o.alpha ?? 0.82,
    [l0, l1] = o.load ?? [0.95, 0.5],
    press = o.press ?? 0.12,
    taper = o.taper ?? 0.55,
    tip = o.tip ?? 0.06,
    bleed = o.bleed ?? 8,
    bleedDur = o.bleedDur ?? 15,
    haloA = o.halo ?? 0.12,
    step = o.step ?? 2,
    wash = o.wash ?? o.w >= 100;
  // dense centreline, then resampled every `step` px of arc length
  const dense: Pt[] = [chain[0]];
  for (let i = 0; i + 3 < chain.length; i += 3) {
    const [a, b, c, d] = [chain[i], chain[i + 1], chain[i + 2], chain[i + 3]];
    for (let k = 1; k <= 80; k++) {
      const t = k / 80,
        m = 1 - t;
      dense.push([
        m * m * m * a[0] + 3 * m * m * t * b[0] + 3 * m * t * t * c[0] + t * t * t * d[0],
        m * m * m * a[1] + 3 * m * m * t * b[1] + 3 * m * t * t * c[1] + t * t * t * d[1],
      ]);
    }
  }
  const cum = [0];
  for (let i = 1; i < dense.length; i++)
    cum.push(cum[i - 1] + Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]));
  const len = cum[cum.length - 1],
    n = Math.max(2, Math.floor(len / step) + 1),
    S: Sample[] = [];
  let j = 0;
  for (let i = 0; i < n; i++) {
    const s = (i / (n - 1)) * len;
    while (j < dense.length - 2 && cum[j + 1] < s) j++;
    const k = (s - cum[j]) / (cum[j + 1] - cum[j] || 1),
      x = lerp(dense[j][0], dense[j + 1][0], k),
      y = lerp(dense[j][1], dense[j + 1][1], k);
    const tx = dense[j + 1][0] - dense[j][0],
      ty = dense[j + 1][1] - dense[j][1],
      tl = Math.hypot(tx, ty) || 1,
      u = s / len;
    // the width profile: a quick press, a full belly, a taper to a point, and a little life from noise
    const prof =
      (0.42 + 0.58 * sstep(u / press)) *
      (1 + 0.08 * Math.sin(Math.PI * u)) *
      (1 - (1 - tip) * sstep((u - taper) / (1 - taper))) *
      (0.92 + 0.16 * fractal(seed, s / 40, 0.5, 1, 1, 2)) *
      (0.95 + 0.1 * fractal(seed + 1, s / 9, 0.5, 1, 1, 2)) *
      (wash ? 0.72 + 0.56 * fractal(seed + 2, s / 170, 0.5, 1, 1, 2) : 1);
    S.push({
      x,
      y,
      nx: -ty / tl,
      ny: tx / tl,
      a: Math.atan2(ty, tx),
      s,
      u,
      f0: t0 + dur * GESTURE_INV(u),
      hw: Math.max(1.1, (o.w / 2) * prof),
      load: lerp(l0, l1, u ** 1.25),
      nz: Array.from(
        { length: 6 },
        (_, k) =>
          0.62 * fractal(seed + 3 + k * 7, x / 90, y / 90, 1, 1, 2) +
          0.38 * fractal(seed + 50 + k * 7, x / 21, y / 21, 1, 1, 2),
      ),
    });
  }
  const lanes = o.lanes ?? 10 + Math.floor(hash(seed, 7) * 7), // 10–16 bristles
    first = S[0],
    last = S[n - 1];
  const gradient = (ctx: Ctx, a: number) => {
    const dx = last.x - first.x,
      dy = last.y - first.y;
    if (Math.hypot(dx, dy) < 4) return rgba(o.tone, a * (0.55 + 0.45 * l0));
    const g = ctx.createLinearGradient(first.x, first.y, last.x, last.y);
    for (let k = 0; k <= 4; k++) g.addColorStop(k / 4, rgba(o.tone, a * (0.55 + 0.45 * lerp(l0, l1, (k / 4) ** 1.25))));
    return g;
  };

  const draw = (ctx: Ctx, F: number) => {
    const q = GESTURE(prog(F, t0, t0 + dur));
    if (F < t0) return;
    const m = Math.min(n, Math.floor((q * len) / step) + 1),
      dry = sstep(prog(F, t0 + dur, t0 + dur + bleedDur + 20)),
      a = alpha * (1 - 0.16 * dry); // ink lightens a little as it dries
    ctx.save();
    if (o.clip) o.clip(ctx);
    // (3) NIJIMI: a wider, paler halo that creeps into the fibres for bleedDur frames after the brush passes. It is
    // laid in two or three layers with their own ragged edges, so the bleed fades out instead of ending in a sleeve.
    if (bleed > 0 && m > 1) {
      const stride = Math.max(1, Math.round(4 / step)),
        idx: number[] = [];
      for (let i = 0; i < m; i += stride) idx.push(i);
      if (idx[idx.length - 1] !== m - 1) idx.push(m - 1);
      const layers = wash ? 3 : 2;
      for (let ly = 0; ly < layers; ly++) {
        const reach = (ly + 1) / layers,
          L: Pt[] = [],
          R: Pt[] = [];
        let dried = 0;
        for (const i of idx) {
          const p = S[i],
            age = F - p.f0,
            g = ease.outCubic(clamp(age / bleedDur)),
            b = bleed * reach * (0.25 + 0.75 * p.load) * g;
          const rl = p.hw + b * (0.15 + 1.7 * p.nz[ly]),
            rr = p.hw + b * (0.15 + 1.7 * p.nz[ly + 3]);
          L.push([p.x + p.nx * rl, p.y + p.ny * rl]);
          R.push([p.x - p.nx * rr, p.y - p.ny * rr]);
          if (age >= bleedDur) dried = L.length;
        }
        const pe = S[m - 1],
          ps = S[0],
          re = Math.hypot(L[L.length - 1][0] - R[R.length - 1][0], L[L.length - 1][1] - R[R.length - 1][1]) / 2,
          rs = Math.hypot(L[0][0] - R[0][0], L[0][1] - R[0][1]) / 2;
        const path = new Path2D();
        path.moveTo(L[0][0], L[0][1]);
        for (const q of L) path.lineTo(q[0], q[1]);
        for (let k = 1; k < 8; k++) {
          const f = (k / 8) * Math.PI,
            c = Math.cos(f),
            sn = Math.sin(f);
          path.lineTo(pe.x + (pe.nx * c + Math.cos(pe.a) * sn) * re, pe.y + (pe.ny * c + Math.sin(pe.a) * sn) * re);
        }
        for (let k = R.length - 1; k >= 0; k--) path.lineTo(R[k][0], R[k][1]);
        for (let k = 1; k < 8; k++) {
          const f = (k / 8) * Math.PI,
            c = Math.cos(f),
            sn = Math.sin(f);
          path.lineTo(
            ps.x - ps.nx * c * rs - Math.cos(ps.a) * sn * rs,
            ps.y - ps.ny * c * rs - Math.sin(ps.a) * sn * rs,
          );
        }
        path.closePath();
        ctx.fillStyle = rgba(o.tone, (haloA / layers) * 1.3);
        ctx.fill(path);
        // the dried edge: a thin rim, a little darker than the halo, wherever the outer bleed has stopped
        if (ly === layers - 1 && dried > 1 && bleed >= 3) {
          const rim = new Path2D();
          for (const side of [L, R]) {
            rim.moveTo(side[0][0], side[0][1]);
            for (let k = 1; k < dried; k++) rim.lineTo(side[k][0], side[k][1]);
          }
          ctx.strokeStyle = rgba(o.tone, haloA * 0.7);
          ctx.lineWidth = wash ? 1.6 : 1.1;
          ctx.lineJoin = "round";
          ctx.stroke(rim);
        }
      }
    }
    // (1) THE BODY: soft ellipses stamped along the painted part (a feathered pass, the body, a wet darker core,
    // and a few hair streaks so a wet stroke still shows the bristles that laid it)
    const feather = new Path2D(),
      body = new Path2D(),
      core = new Path2D();
    let any = false,
      anyCore = false;
    for (let i = 0; i < m; i++) {
      const p = S[i];
      if (p.load < 0.35 && !(i > 0 && S[i - 1].load >= 0.35)) continue;
      const rx = Math.max(step * 0.8, p.hw * 0.35),
        ca = Math.cos(p.a),
        sa = Math.sin(p.a);
      if (!wash) {
        feather.moveTo(p.x + (rx + 1) * ca, p.y + (rx + 1) * sa);
        feather.ellipse(p.x, p.y, rx + 1, p.hw + 1, p.a, 0, Math.PI * 2);
      }
      body.moveTo(p.x + rx * ca, p.y + rx * sa);
      body.ellipse(p.x, p.y, rx, p.hw, p.a, 0, Math.PI * 2);
      any = true;
      if (!wash && p.load > 0.62 && p.hw > 2.5) {
        core.moveTo(p.x + rx * 0.6 * ca, p.y + rx * 0.6 * sa);
        core.ellipse(p.x, p.y, rx * 0.6, p.hw * 0.45, p.a, 0, Math.PI * 2);
        anyCore = true;
      }
    }
    if (any) {
      if (!wash) {
        ctx.fillStyle = gradient(ctx, a * 0.25);
        ctx.fill(feather);
      }
      ctx.fillStyle = gradient(ctx, a);
      ctx.fill(body);
      if (anyCore) {
        ctx.fillStyle = rgba(o.tone, 0.16 * (1 - 0.4 * dry));
        ctx.fill(core);
      }
      if (!wash && o.w >= 12) {
        const hair = new Path2D();
        for (let l = 0; l < 7; l++) {
          const off = (l + 0.5) / 7 - 0.5;
          let open = false;
          for (let i = 0; i < m; i += 2) {
            const p = S[i];
            if (p.load < 0.35 || vnoise(seed * 17 + l, p.s, 34) > 0.55) {
              open = false;
              continue;
            }
            const x = p.x + p.nx * off * 1.6 * p.hw,
              y = p.y + p.ny * off * 1.6 * p.hw;
            if (open) hair.lineTo(x, y);
            else hair.moveTo(x, y);
            open = true;
          }
        }
        ctx.strokeStyle = rgba(o.tone, 0.2 * a);
        ctx.lineWidth = Math.max(1, o.w * 0.06);
        ctx.lineCap = "round";
        ctx.stroke(hair);
      }
    }
    // (2) KASURE: where the load runs low the body splits into bristle lanes that drop out (the "flying white")
    let dryN = 0,
      hwSum = 0;
    for (let i = 0; i < m; i++)
      if (S[i].load < 0.35) {
        dryN++;
        hwSum += S[i].hw;
      }
    if (dryN > 1) {
      const lw = ((hwSum / dryN) * 2 * 1.2) / lanes,
        path = new Path2D();
      for (let l = 0; l < lanes; l++) {
        const off = (l + 0.5) / lanes - 0.5,
          edge = Math.abs(off) * 2;
        let open = false;
        for (let i = 0; i < m; i++) {
          const p = S[i];
          if (p.load >= 0.35) {
            open = false;
            continue;
          }
          const keep = clamp(p.load / 0.35) ** 0.8 * (1 - 0.45 * edge) + 0.04,
            vis = vnoise(seed * 31 + l, p.s, 22 + 10 * hash(seed, l)) < keep;
          const x = p.x + p.nx * off * 2 * p.hw * 0.92,
            y = p.y + p.ny * off * 2 * p.hw * 0.92;
          if (vis) {
            if (open) path.lineTo(x, y);
            else path.moveTo(x, y);
            open = true;
          } else open = false;
        }
      }
      ctx.strokeStyle = gradient(ctx, a);
      ctx.lineWidth = Math.max(1, lw);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke(path);
    }
    ctx.restore();
  };
  return { t0, draw };
}

/** a round dab (a petal, an eye, a stamen dot): lands in 4 frames, bleeds, dries */
function dab(x: number, y: number, r: number, t0: number, tone: string, alpha: number, bleed = 4, seed = 1): Mark {
  const ring = (rad: (k: number) => number) => {
    const p = new Path2D();
    for (let k = 0; k < 20; k++) {
      const f = (k / 20) * Math.PI * 2,
        rr = rad(k);
      if (k) p.lineTo(x + Math.cos(f) * rr, y + Math.sin(f) * rr);
      else p.moveTo(x + Math.cos(f) * rr, y + Math.sin(f) * rr);
    }
    p.closePath();
    return p;
  };
  const wob = Array.from({ length: 20 }, (_, k) =>
    fractal(seed, Math.cos((k / 20) * 6.283), Math.sin((k / 20) * 6.283), 1.2, 1.2, 2),
  );
  const draw = (ctx: Ctx, F: number) => {
    if (F < t0) return;
    const g = ease.outCubic(prog(F, t0, t0 + 4)),
      bl = ease.outCubic(clamp((F - t0 - 1) / 12)),
      dry = sstep(prog(F, t0 + 6, t0 + 30));
    if (bleed > 0) {
      const h = ring((k) => r * g + bleed * bl * (0.3 + 1.4 * wob[k]));
      ctx.fillStyle = rgba(tone, 0.12);
      ctx.fill(h);
      if (bl >= 1 && bleed >= 3) {
        ctx.strokeStyle = rgba(tone, 0.14);
        ctx.lineWidth = 1.2;
        ctx.stroke(h);
      }
    }
    ctx.fillStyle = rgba(tone, alpha * (1 - 0.14 * dry));
    ctx.fill(ring((k) => r * g * (0.9 + 0.2 * wob[k])));
  };
  return { t0, draw };
}

// ---------------------------------------------------------------- THE THREE PAINTINGS (a 1000 × 1000 art box)
type Place = { x: number; y: number; s: number };
const map =
  (pl: Place) =>
  (p: Pt): Pt => [pl.x + p[0] * pl.s, pl.y + p[1] * pl.s];
const chainOf = (pl: Place, pts: Pt[]) => pts.map(map(pl));

function spring(pl: Place): { marks: Mark[]; petal: (ctx: Ctx, F: number) => void } {
  const s = pl.s,
    at = map(pl),
    B = (pts: Pt[], t0: number, dur: number, o: StrokeOpts) => brush(chainOf(pl, pts), t0, dur, { ...o, w: o.w * s });
  const marks: Mark[] = [
    // four strokes, landing on 120, 140, 160, 180: the first dark and wet, the last dry and streaked
    B(
      [
        [1030, 88],
        [935, 140],
        [870, 198],
        [800, 250],
        [730, 300],
        [650, 330],
        [570, 420],
      ],
      104,
      16,
      { w: 38, tone: C.s1, alpha: 0.9, load: [1, 0.62], bleed: 12, taper: 0.7, tip: 0.35 },
    ),
    B(
      [
        [578, 416],
        [505, 468],
        [470, 470],
        [405, 520],
        [340, 570],
        [300, 640],
        [236, 694],
      ],
      124,
      16,
      { w: 26, tone: C.s2, alpha: 0.88, load: [0.85, 0.42], bleed: 9, taper: 0.55 },
    ),
    B(
      [
        [770, 268],
        [706, 222],
        [640, 196],
        [540, 150],
      ],
      144,
      16,
      { w: 17, tone: C.s2, alpha: 0.85, load: [0.7, 0.36], bleed: 7 },
    ),
    B(
      [
        [432, 500],
        [385, 578],
        [392, 660],
        [330, 770],
      ],
      164,
      16,
      { w: 26, tone: C.s1, alpha: 0.78, load: [0.4, 0.05], bleed: 3, press: 0.08, taper: 0.6, tip: 0.25 },
    ),
  ];
  // five-dab blossoms with dark dotted centres, one per beat
  const clusters: [number, number, number][] = [
    [672, 284, 190],
    [530, 140, 210],
    [915, 210, 230],
    [500, 506, 250],
    [284, 588, 270],
  ];
  const FALL = 244,
    fallFrom = clusters[0];
  clusters.forEach(([cx, cy, t], c) => {
    const rot = hash(c, 5) * 6.283;
    for (let k = 0; k < 5; k++) {
      const a = rot + (k / 5) * Math.PI * 2,
        [x, y] = at([cx + Math.cos(a) * 16, cy + Math.sin(a) * 16]),
        d = dab(x, y, 16 * s, t + k * 0.8, C.s4, 0.9, 5 * s, c * 10 + k);
      // the petal that lets go leaves only its stain behind
      if (c === 0 && k === 1) marks.push({ t0: d.t0, draw: (ctx, F) => (F < FALL ? d.draw(ctx, F) : undefined) });
      else marks.push(d);
    }
    const [x0, y0] = at([cx, cy]);
    marks.push(dab(x0, y0, 3 * s, t + 5, C.s1, 0.9, 0, c + 99));
    for (let k = 0; k < 5; k++) {
      const a = rot + 0.6 + (k / 5) * Math.PI * 2,
        [x, y] = at([cx + Math.cos(a) * 9, cy + Math.sin(a) * 9]);
      marks.push(dab(x, y, 1.9 * s, t + 6 + k * 0.5, C.s1, 0.9, 0, c * 7 + k));
    }
  });
  // one petal falls on a slow sway
  const a1 = hash(0, 5) * 6.283 + (1 / 5) * Math.PI * 2,
    [px, py] = at([fallFrom[0] + Math.cos(a1) * 16, fallFrom[1] + Math.sin(a1) * 16]);
  const petal = (ctx: Ctx, F: number) => {
    if (F < FALL || F > 350) return;
    const t = (F - FALL) / FPS,
      x = px + 38 * s * Math.sin(t * 2.1) + 26 * s * t,
      y = py + 210 * s * t + 18 * s * Math.sin(t * 4.2 + 1) * clamp(t),
      a = 0.7 * Math.sin(t * 2.1 + 0.8);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.ellipse(0, 0, 16 * s, 11 * s * (0.75 + 0.25 * Math.cos(t * 2.1)), 0, 0, Math.PI * 2);
    ctx.fillStyle = rgba(C.s4, 0.92);
    ctx.fill();
    ctx.restore();
  };
  return { marks, petal };
}

function summer(pl: Place): Mark[] {
  const s = pl.s,
    at = map(pl),
    B = (pts: Pt[], t0: number, dur: number, o: StrokeOpts) => brush(chainOf(pl, pts), t0, dur, { ...o, w: o.w * s });
  const [hx, hy] = at([474, 176]);
  return [
    // a pale wash of water, laid as the flick clears
    B(
      [
        [40, 822],
        [350, 786],
        [650, 846],
        [980, 802],
      ],
      324,
      20,
      { w: 140, tone: C.s4, alpha: 0.45, load: [0.9, 0.6], bleed: 42, bleedDur: 28, taper: 0.8, tip: 0.75, step: 4 },
    ),
    B(
      [
        [950, 912],
        [700, 884],
        [400, 930],
        [150, 902],
      ],
      332,
      18,
      {
        w: 70,
        tone: C.accent2,
        alpha: 0.24,
        load: [0.9, 0.6],
        bleed: 30,
        bleedDur: 28,
        taper: 0.8,
        tip: 0.7,
        step: 3,
        wash: true,
      },
    ),
    // an S-curved neck in two presses: the lower curve as the flick clears (lands on 340), then the upper
    // curve to the head (lands on 380), a head, a sharp beak and a crest
    B(
      [
        [580, 478],
        [500, 446],
        [490, 366],
        [540, 316],
      ],
      318,
      22,
      { w: 20, tone: C.s1, alpha: 0.92, load: [1, 0.85], press: 0.1, taper: 0.9, tip: 0.9, bleed: 8 },
    ),
    B(
      [
        [536, 322],
        [592, 262],
        [548, 196],
        [484, 178],
      ],
      360,
      20,
      { w: 20, tone: C.s1, alpha: 0.92, load: [0.85, 0.7], press: 0.2, taper: 0.45, tip: 0.38, bleed: 8 },
    ),
    dab(hx, hy, 12 * s, 380, C.s1, 0.92, 3 * s, 44),
    B(
      [
        [466, 181],
        [420, 185],
        [380, 191],
        [320, 201],
      ],
      382,
      6,
      { w: 11, tone: C.s1, alpha: 0.92, load: [0.9, 0.7], press: 0.05, taper: 0.15, tip: 0.02, bleed: 3 },
    ),
    B(
      [
        [488, 166],
        [516, 158],
        [546, 152],
        [578, 150],
      ],
      388,
      5,
      { w: 5, tone: C.s2, alpha: 0.85, load: [0.8, 0.5], taper: 0.3, tip: 0.05, bleed: 2 },
    ),
    // a pale wet belly under the wing gives the body its volume
    B(
      [
        [552, 492],
        [584, 548],
        [650, 566],
        [742, 556],
      ],
      394,
      7,
      { w: 30, tone: C.s3, alpha: 0.6, load: [0.9, 0.6], press: 0.2, taper: 0.6, tip: 0.2, bleed: 10 },
    ),
    // the wing: one wide dry stroke (lands on 420), a tail and a single thin leg
    B(
      [
        [540, 474],
        [630, 428],
        [765, 448],
        [818, 562],
      ],
      402,
      18,
      { w: 60, tone: C.s2, alpha: 0.82, load: [0.8, 0.1], press: 0.3, taper: 0.5, tip: 0.12, bleed: 5, lanes: 8 },
    ),
    B(
      [
        [806, 552],
        [824, 580],
        [838, 604],
        [854, 632],
      ],
      421,
      4,
      { w: 15, tone: C.s1, alpha: 0.88, load: [0.8, 0.3], taper: 0.4, tip: 0.1, bleed: 3 },
    ),
    B(
      [
        [655, 522],
        [658, 620],
        [652, 730],
        [656, 836],
      ],
      423,
      7,
      { w: 5.5, tone: C.s1, alpha: 0.9, load: [0.9, 0.7], press: 0.05, taper: 0.9, tip: 0.6, bleed: 2 },
    ),
    // three quick reeds
    B(
      [
        [200, 905],
        [188, 760],
        [214, 620],
        [270, 470],
      ],
      427,
      5,
      { w: 11, tone: C.s2, alpha: 0.85, load: [0.8, 0.3], press: 0.05, taper: 0.3, tip: 0.02, bleed: 3 },
    ),
    B(
      [
        [246, 905],
        [250, 780],
        [276, 680],
        [322, 592],
      ],
      432,
      5,
      { w: 9, tone: C.s3, alpha: 0.85, load: [0.8, 0.25], press: 0.05, taper: 0.3, tip: 0.02, bleed: 3 },
    ),
    B(
      [
        [166, 905],
        [150, 800],
        [122, 700],
        [92, 612],
      ],
      437,
      5,
      { w: 9, tone: C.s3, alpha: 0.85, load: [0.8, 0.25], press: 0.05, taper: 0.3, tip: 0.02, bleed: 3 },
    ),
    // ripples: two thin broken strokes around the leg
    ...(
      [
        [
          [596, 838],
          [612, 833],
          [626, 832],
          [640, 835],
        ],
        [
          [670, 835],
          [690, 831],
          [712, 833],
          [732, 839],
        ],
        [
          [556, 870],
          [584, 863],
          [610, 863],
          [632, 868],
        ],
        [
          [680, 868],
          [712, 862],
          [742, 863],
          [776, 870],
        ],
      ] as Pt[][]
    ).map((pts, i) =>
      B(pts, 444 + i * 4, 4, { w: 4.5, tone: C.s2, alpha: 0.85, load: [0.7, 0.3], taper: 0.5, tip: 0.1, bleed: 2 }),
    ),
  ];
}

function winter(pl: Place): { marks: Mark[] } {
  const s = pl.s,
    at = map(pl),
    B = (pts: Pt[], t0: number, dur: number, o: StrokeOpts) => brush(chainOf(pl, pts), t0, dur, { ...o, w: o.w * s });
  const marks: Mark[] = [
    // a pale ground wash first: the snow is the paper left between it and the sky
    B(
      [
        [-20, 1004],
        [300, 986],
        [700, 1012],
        [1020, 992],
      ],
      548,
      18,
      {
        w: 56,
        tone: C.s4,
        alpha: 0.55,
        load: [0.9, 0.6],
        bleed: 18,
        bleedDur: 24,
        taper: 0.8,
        tip: 0.6,
        step: 3,
        wash: true,
      },
    ),
    // the old trunk, dry-brushed in two presses: the lower trunk as the flick clears (lands on 580), then the
    // brush lifts and runs out along the upper trunk (lands on 620)
    B(
      [
        [250, 1010],
        [276, 860],
        [190, 760],
        [290, 620],
      ],
      560,
      20,
      { w: 60, tone: C.s2, alpha: 0.86, load: [0.56, 0.3], press: 0.06, taper: 0.9, tip: 0.8, bleed: 6 },
    ),
    B(
      [
        [284, 632],
        [360, 530],
        [350, 450],
        [452, 370],
      ],
      596,
      24,
      { w: 54, tone: C.s2, alpha: 0.86, load: [0.4, 0.1], press: 0.15, taper: 0.5, tip: 0.35, bleed: 6 },
    ),
    // moss dots along the old bark
    ...(
      [
        [224, 902, 7],
        [300, 846, 5],
        [212, 760, 8],
        [318, 668, 6],
        [372, 520, 6],
      ] as [number, number, number][]
    ).map(([x, y, r], i) => {
      const [X, Y] = at([x, y]);
      return dab(X, Y, r * s, 622 + i * 2, C.s1, 0.88, 2 * s, 70 + i);
    }),
    // three branches
    B(
      [
        [300, 612],
        [420, 598],
        [560, 612],
        [724, 540],
      ],
      626,
      8,
      { w: 20, tone: C.s1, alpha: 0.88, load: [0.85, 0.4], taper: 0.6, tip: 0.2, bleed: 6 },
    ),
    B(
      [
        [362, 478],
        [292, 440],
        [212, 432],
        [118, 382],
      ],
      634,
      8,
      { w: 18, tone: C.s1, alpha: 0.88, load: [0.85, 0.4], taper: 0.6, tip: 0.2, bleed: 6 },
    ),
    B(
      [
        [450, 372],
        [540, 332],
        [640, 300],
        [782, 282],
      ],
      642,
      8,
      { w: 17, tone: C.s1, alpha: 0.88, load: [0.85, 0.4], taper: 0.6, tip: 0.2, bleed: 6 },
    ),
  ];
  // needle clusters: fast fans of strokes hanging under the snow
  const clusters: Pt[] = [
    [720, 542],
    [560, 606],
    [120, 382],
    [262, 440],
    [782, 282],
    [620, 305],
    [452, 368],
  ];
  clusters.forEach(([cx, cy], c) => {
    const t = 650 + c * 5;
    for (let k = 0; k < 7; k++) {
      const a = ((14 + (k * 152) / 6 + (hash(c, k) - 0.5) * 10) * Math.PI) / 180,
        l = 62 + hash(k, c) * 22;
      const p0: Pt = [cx + Math.cos(a) * 6, cy + Math.sin(a) * 6],
        p3: Pt = [cx + Math.cos(a) * l, cy + Math.sin(a) * l];
      marks.push(
        B(
          [
            p0,
            [lerp(p0[0], p3[0], 0.33), lerp(p0[1], p3[1], 0.33)],
            [lerp(p0[0], p3[0], 0.66), lerp(p0[1], p3[1], 0.66) + 3],
            p3,
          ],
          t + k * 0.8,
          3,
          {
            w: 6,
            tone: C.s1,
            alpha: 0.86,
            load: [0.9, 0.45],
            press: 0.05,
            taper: 0.3,
            tip: 0.05,
            bleed: 2,
          },
        ),
      );
    }
  });
  // the snow: lumps of bare paper on each bough and a few flakes, which the sky wash goes around
  const lumps = clusters.map(([cx, cy], c) => {
    const [x, y] = at([cx, cy - 12]);
    return { x, y, rx: (58 + hash(c, 3) * 8) * s, ry: 22 * s, seed: 300 + c };
  });
  const r = rng(37),
    flakes: [number, number, number][] = [];
  while (flakes.length < 24) {
    const fx = 20 + r() * 960,
      fy = 20 + r() * 520,
      fr = 3 + r() * 3.5;
    if (clusters.some(([cx, cy]) => Math.hypot((fx - cx) / 90, (fy - cy + 12) / 45) < 1)) continue;
    if (flakes.some(([x, y]) => Math.hypot(x - fx, y - fy) < 40)) continue;
    flakes.push([fx, fy, fr]);
  }
  // (built on first use: paths exist only in the browser, and the film is also constructed in Node)
  let snow: Path2D | undefined;
  const snowPath = () => {
    if (snow) return snow;
    const p = new Path2D();
    for (const L of lumps) {
      for (let k = 0; k <= 24; k++) {
        const f = (k / 24) * Math.PI * 2,
          sin = Math.sin(f),
          w = 0.88 + 0.24 * fractal(L.seed, Math.cos(f), sin, 1.3, 1.3, 2);
        const x = L.x + Math.cos(f) * L.rx * w,
          y = L.y + sin * L.ry * w * (sin > 0 ? 0.55 : 1);
        if (k) p.lineTo(x, y);
        else p.moveTo(x, y);
      }
      p.closePath();
    }
    for (const [fx, fy, fr] of flakes) {
      const [x, y] = at([fx, fy]);
      p.moveTo(x + fr * s, y);
      p.arc(x, y, fr * s, 0, Math.PI * 2);
    }
    const [bx0, by0] = at([-400, -400]),
      clipPath = new Path2D();
    clipPath.rect(bx0, by0, 1800 * s, 1800 * s);
    clipPath.addPath(p);
    return (snow = clipPath);
  };
  const clip = (ctx: Ctx) => ctx.clip(snowPath(), "evenodd");
  // a grey sky laid AROUND the boughs (three wide strokes whose halos merge)
  // one very wide pale wash, then a narrower darker one along the top inside it: a sky graded from dark to pale
  // with a single wet edge, not a stack of bands
  const sky: Pt[][] = [
    [
      [-140, 262],
      [300, 236],
      [700, 290],
      [1140, 250],
    ],
    [
      [1140, 66],
      [700, 44],
      [300, 92],
      [-140, 58],
    ],
  ];
  sky.forEach((pts, i) =>
    marks.push(
      B(pts, 684 + i * 14, 20, {
        w: [540, 210][i],
        tone: C.s3,
        alpha: [0.3, 0.17][i],
        load: [0.95, 0.6],
        bleed: [46, 70][i],
        bleedDur: 30,
        halo: 0.14,
        taper: 0.85,
        tip: 0.75,
        step: 5,
        clip,
      }),
    ),
  );
  return { marks };
}

// ---------------------------------------------------------------- THE HAIKU (original)
type Haiku = { season: string; sAt: number; at: number; lines: string[][] };
const HAIKU: Haiku[] = [
  {
    season: "SPRING",
    sAt: 170,
    at: 180,
    lines: [
      ["spring", "rain —"],
      ["the", "plum", "branch", "lets", "go"],
      ["one", "petal", "at", "a", "time"],
    ],
  },
  {
    season: "SUMMER",
    sAt: 420,
    at: 430,
    lines: [
      ["noon", "heat —"],
      ["the", "heron", "holds", "the", "river"],
      ["still", "on", "one", "leg"],
    ],
  },
  {
    season: "WINTER",
    sAt: 680,
    at: 690,
    lines: [
      ["first", "snow —"],
      ["the", "old", "pine", "keeps"],
      ["what", "it", "can", "hold"],
    ],
  },
];
const WORD_TIMES = HAIKU.flatMap((h) => h.lines.flat().map((_, i) => h.at + i * 10));

// ---------------------------------------------------------------- per-size design
type Design = {
  paper: { w: number; h: number };
  panel: (i: number) => { x: number; y: number; w: number; h: number };
  art: Place[];
  haiku: Pt[];
  mist: Pt[];
  intro: Pt;
  fit: { x: number; y: number; z: number };
  seal: Pt;
};

function design(size: Size): Design {
  const L = layout(size);
  if (L.tall) {
    // a hanging scroll: the three paintings stacked, the camera slides down
    const PH = 1640,
      paper = { w: 1080, h: 3 * PH + 220 }; // a bare margin below the last painting, where the seal goes
    return {
      paper,
      panel: (i) => ({ x: 0, y: i * PH, w: 1080, h: PH }),
      art: [
        { x: 40, y: 90, s: 1 },
        { x: 40, y: 470 + PH, s: 1 },
        { x: 40, y: 90 + 2 * PH, s: 1 },
      ],
      haiku: [
        [110, 1190],
        [110, 250 + PH],
        [520, 1190 + 2 * PH],
      ],
      mist: [
        [-80, 400],
        [300, 326],
        [760, 452],
        [1160, 370],
      ],
      intro: [540, 800],
      fit: { x: 540, y: (-480 + paper.h + 270) / 2 + 220, z: (L.H * 0.86) / (paper.h + 750) },
      seal: [760, 90 + 2 * PH + 1170],
    };
  }
  // a handscroll: the paintings side by side, read (and slid) from right to left
  const PW = 1900,
    M = 200, // bare paper at both ends of the handscroll
    paper = { w: 3 * PW + 2 * M, h: 1080 };
  return {
    paper,
    panel: (i) => ({ x: M + (2 - i) * PW, y: 0, w: PW, h: 1080 }),
    art: [
      { x: M + 2 * PW + 880, y: 80, s: 0.92 },
      { x: M + PW + 150, y: 80, s: 0.92 },
      { x: M + 880, y: 80, s: 0.92 },
    ],
    haiku: [
      [M + 2 * PW + 250, 560],
      [M + PW + 1170, 330],
      [M + 250, 420],
    ],
    mist: [
      [M + 2 * PW - 80, 330],
      [M + 2 * PW + 500, 268],
      [M + 2 * PW + 1300, 400],
      [M + 2 * PW + 1980, 300],
    ],
    intro: [M + 2 * PW + 520, 700],
    fit: { x: paper.w / 2 + 13, y: 540, z: (L.W * 0.88) / (paper.w + 570) },
    seal: [330, 800],
  };
}

// the paper: washi computed once per size into an offscreen canvas (mottling + 1,500 fibres per painting)
function paperLayer(env: Env, D: Design, id: string): Layer {
  const k = `inkWash:paper:${id}:${env.scale}`;
  let Lr = env.cache.get(k) as Layer | undefined;
  if (Lr) return Lr;
  const sc = env.scale,
    w = Math.round(D.paper.w * sc),
    h = Math.round(D.paper.h * sc);
  Lr = env.canvas(w, h);
  const c = Lr.ctx;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.fillStyle = C.ground;
  c.fillRect(0, 0, w, h);
  // a very light mottling, computed at 1/8 resolution and smoothed up
  const mw = Math.ceil(D.paper.w / 8),
    mh = Math.ceil(D.paper.h / 8),
    M = env.canvas(mw, mh),
    img = M.ctx.createImageData(mw, mh),
    [lr, lg, lb] = hex(C.line);
  for (let y = 0; y < mh; y++)
    for (let x = 0; x < mw; x++) {
      const n = fractal(29, x / 36, y / 36, 1, 1, 3),
        i = (y * mw + x) * 4;
      img.data[i] = lr;
      img.data[i + 1] = lg;
      img.data[i + 2] = lb;
      img.data[i + 3] = Math.round(clamp((n - 0.42) * 0.55) * 255);
    }
  M.ctx.putImageData(img, 0, 0);
  c.imageSmoothingEnabled = true;
  c.drawImage(M.canvas, 0, 0, w, h);
  // fibres: short, faint, slightly bent, in the surface and line tones
  c.setTransform(sc, 0, 0, sc, 0, 0);
  const r = rng(1937);
  c.lineCap = "round";
  for (let i = 0; i < 4500; i++) {
    const x = r() * D.paper.w,
      y = r() * D.paper.h,
      a = r() * Math.PI,
      l = 6 + r() * 20,
      bend = (r() - 0.5) * 6;
    c.strokeStyle = rgba(r() < 0.5 ? C.surface : C.line, 0.35 + r() * 0.45);
    c.lineWidth = 0.5 + r() * 0.9;
    c.beginPath();
    c.moveTo(x, y);
    c.quadraticCurveTo(
      x + Math.cos(a) * l * 0.5 - Math.sin(a) * bend,
      y + Math.sin(a) * l * 0.5 + Math.cos(a) * bend,
      x + Math.cos(a) * l,
      y + Math.sin(a) * l,
    );
    c.stroke();
  }
  env.cache.set(k, Lr);
  return Lr;
}

export function make(size: Size, id: string): Film {
  const L = layout(size),
    { W, H, u, tall } = L,
    D = design(size);

  // ---- the paintings, as marks in world space
  const mist = brush(D.mist, 0, 30, {
    w: tall ? 330 : 300,
    tone: C.s4,
    alpha: 0.4,
    load: [0.95, 0.55],
    bleed: 70,
    bleedDur: 34,
    halo: 0.13,
    taper: 0.82,
    tip: 0.7,
    step: 6,
    seed: 5,
  });
  // the hook: one bold stroke slashes in under the title in the first second (lands on beat 1, frame 20), running
  // dry at its end so the flying white shows at once; it lifts away with the title before the branch begins
  const [ix, iy] = D.intro;
  const slashMark = brush(
    [
      [ix - 390, iy + 118],
      [ix - 150, iy + 58],
      [ix + 110, iy + 124],
      [ix + 390, iy + 52],
    ],
    -2,
    22,
    { w: 44, tone: C.s1, alpha: 0.9, load: [1, 0.08], press: 0.06, taper: 0.7, tip: 0.3, bleed: 9, seed: 21 },
  );
  const slash: Mark = {
    t0: slashMark.t0,
    draw: (ctx, F) => {
      const a = 1 - sstep(prog(F, 74, 98));
      if (a <= 0) return;
      ctx.save();
      ctx.globalAlpha = a;
      slashMark.draw(ctx, F);
      ctx.restore();
    },
  };
  const sp = spring(D.art[0]),
    paintings: Mark[][] = [[mist, slash, ...sp.marks], summer(D.art[1]), winter(D.art[2]).marks];

  // ---- ambient weather, so no hold is ever still: spring rain, rings on the river, first snow
  const rainCount = Math.round((D.panel(0).w * D.panel(0).h) / 38000);
  const rain = (ctx: Ctx, F: number) => {
    const a = window01(F, -12, 10, 300, 336);
    if (a <= 0) return;
    const p = D.panel(0),
      span = p.h + 240,
      path = new Path2D();
    for (let k = 0; k < rainCount; k++) {
      const l = 60 + 40 * hash(k, 3),
        x = p.x - 120 + hash(k, 1) * (p.w + 240),
        y = p.y - 120 + ((hash(k, 2) * span + 30 * F) % span),
        dx = -0.2 * l,
        xs = x + ((y - p.y) / span) * -48;
      path.moveTo(xs, y);
      path.lineTo(xs + dx, y + l);
    }
    ctx.strokeStyle = rgba(C.s3, 0.3 * a);
    ctx.lineWidth = 1.6;
    ctx.lineCap = "round";
    ctx.stroke(path);
  };
  const [rx0, ry0] = map(D.art[1])([656, 838]),
    rs = D.art[1].s;
  const ripples = (ctx: Ctx, F: number) => {
    if (F < 344 || F > 600) return;
    for (let k = -4; k < 14; k++) {
      const born = 344 + k * 17,
        age = (F - born) / 96;
      if (age <= 0 || age >= 1) continue;
      const rx = (24 + 360 * ease.outCubic(age)) * rs,
        ry = rx * 0.13,
        path = new Path2D();
      for (let seg = 0; seg < 14; seg++) {
        if (hash(k, seg) < 0.4) continue;
        const a0 = (seg / 14) * Math.PI * 2,
          a1 = a0 + (Math.PI * 2) / 14 - 0.12;
        path.moveTo(rx0 + Math.cos(a0) * rx, ry0 + Math.sin(a0) * ry);
        path.ellipse(rx0, ry0, rx, ry, 0, a0, a1);
      }
      ctx.strokeStyle = rgba(C.s2, 0.75 * (1 - age) * window01(F, 342, 356, 560, 590));
      ctx.lineWidth = 3 * rs;
      ctx.stroke(path);
    }
  };
  // a flake's colour: a little darker than the paper, so it reads on bare paper without an outline
  const FLAKE =
    "#" +
    hex(C.ground)
      .map((v, i) =>
        Math.round(lerp(v, hex(C.s4)[i], 0.55))
          .toString(16)
          .padStart(2, "0"),
      )
      .join("");
  const GUST_THROW = D.panel(2).w * 0.9;
  const snowCount = Math.round((D.panel(2).w * D.panel(2).h) / 16000);
  const snowfall = (ctx: Ctx, F: number) => {
    const a = prog(F, 556, 578) * (1 - prog(F, TEXT_OUT[0], TEXT_OUT[1]));
    if (a <= 0) return;
    const p = D.panel(2),
      span = p.h + 80;
    for (let k = 0; k < snowCount; k++) {
      const r = (4 + 4 * hash(k, 9)) * (p.w > 1500 ? 0.92 : 1),
        v = 3 + 3 * hash(k, 8),
        y = p.y - 40 + ((hash(k, 7) * span + v * F) % span),
        // the gust: a sideways throw that decays (its displacement is closed-form, so any frame paints alone)
        g = F > GUST ? 1 - Math.exp(-(F - GUST) / 9) : 0,
        gv = F > GUST ? (Math.exp(-(F - GUST) / 9) / 9) * GUST_THROW : 0,
        x = p.x + ((((hash(k, 6) * p.w + 22 * Math.sin(F / 34 + k) + g * GUST_THROW) % p.w) + p.w) % p.w);
      // no outline: a soft pale dot on bare paper, unpainted paper where it crosses the wash; a streak in the gust
      ctx.strokeStyle = ctx.fillStyle = rgba(FLAKE, 0.95 * a);
      if (gv > 2) {
        ctx.lineWidth = 2 * r;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(x - Math.min(gv * 0.9, x - p.x), y - gv * 0.08);
        ctx.lineTo(x, y);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  // ---- the camera
  type Cam = { x: number; y: number; z: number };
  const centre = (i: number): Cam => {
    const p = D.panel(i);
    return { x: p.x + p.w / 2, y: p.y + p.h / 2, z: 1 };
  };
  const hold = (i: number, F: number): Cam => ({ ...centre(i), z: 1 + 0.035 * prog(F, HOLD[i][0], HOLD[i][1]) });
  // the cut-in close-ups: [from, to) in frames, centred on a point of a painting's art box, at a zoom
  const closeUps = [
    { from: 100, to: 140, i: 0, at: [800, 254] as Pt, z: 2.4 },
    { from: 400, to: 440, i: 1, at: [600, tall ? 420 : 390] as Pt, z: tall ? 1.9 : 2.2 },
    { from: 640, to: 680, i: 2, at: (tall ? [470, 470] : [560, 440]) as Pt, z: tall ? 1.8 : 2.0 },
  ].map((c) => {
    const [x, y] = map(D.art[c.i])(c.at);
    return { ...c, x, y };
  });
  const CUTS = [...closeUps.flatMap((c) => [c.from, c.to]), ...WIPES, T.seal];
  const cam = (F: number): Cam => {
    if (F < T.seal) {
      for (const c of closeUps)
        if (F >= c.from && F < c.to) return { x: c.x, y: c.y, z: c.z * (1 + 0.05 * prog(F, c.from, c.to)) };
      return hold(F < WIPES[0] ? 0 : F < WIPES[1] ? 1 : 2, F);
    }
    // a hard cut to the whole scroll, into a very slow drift that never quite stops
    const c = { ...D.fit, z: D.fit.z * (1 + 0.08 * prog(F, T.seal, 900)) };
    // the press: the scroll gives a little under the seal and settles back
    // (continuous from zero at the hit, so the shutter never straddles a jump and ghosts the seal)
    const x = Math.max(0, F - SEAL_AT) / 2,
      jolt = 0.018 * x * Math.exp(1 - x);
    return { ...c, z: c.z * (1 + jolt) };
  };
  const speed = (F: number) => {
    // no shutter across a cut: it would blend the two shots
    if (CUTS.some((c) => c > F - 0.5 && c <= F + 0.5)) return 0;
    const a = cam(F - 0.5),
      b = cam(F + 0.5);
    return Math.hypot((b.x - a.x) * b.z, (b.y - a.y) * b.z) + Math.abs(b.z - a.z) * 1500;
  };

  // ---- the scroll itself: mount, rollers, cord (seen whole only at the end)
  const scroll = (ctx: Ctx) => {
    const { w, h } = D.paper;
    ctx.fillStyle = C.line;
    if (tall) {
      ctx.strokeStyle = C.s2;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(90, -318);
      ctx.lineTo(w / 2, -470);
      ctx.lineTo(w - 90, -318);
      ctx.stroke();
      ctx.fillRect(-40, -300, w + 80, 300 + h + 230);
      ctx.fillStyle = C.accent2;
      ctx.fillRect(0, -16, w, 16);
      ctx.fillRect(0, h, w, 16);
      ctx.fillStyle = C.s1;
      ctx.fillRect(-50, -326, w + 100, 26);
      ctx.fillRect(-60, h + 230, w + 120, 40);
      ctx.fillStyle = C.s2;
      ctx.fillRect(-110, h + 222, 56, 56);
      ctx.fillRect(w + 54, h + 222, 56, 56);
    } else {
      ctx.fillRect(-240, -36, w + 480, h + 72);
      ctx.fillStyle = C.accent2;
      ctx.fillRect(-34, 0, 34, h);
      ctx.fillRect(w, 0, 34, h);
      ctx.fillStyle = C.s1;
      ctx.fillRect(-270, -70, 34, h + 140);
      ctx.fillStyle = C.s2;
      ctx.fillRect(w + 236, -50, 60, h + 100);
      ctx.fillStyle = C.s3;
      ctx.fillRect(w + 250, -50, 12, h + 100);
    }
  };

  // ---- the haiku, soaking in word by word, and the season word above it
  const haikuOpts = { size: 48 * u, family: F_.italic, weight: 400 };
  const writeHaiku = (ctx: Ctx, F: number, i: number) => {
    const hk = HAIKU[i],
      [x, y] = D.haiku[i],
      out = 1 - prog(F, TEXT_OUT[0], TEXT_OUT[1]);
    if (F < hk.sAt || out <= 0) return;
    text(ctx, hk.season, x + 2 * u, y, {
      size: 24 * u,
      family: F_.sans,
      weight: 400,
      color: C.muted,
      track: 0.3,
      alpha: prog(F, hk.sAt, hk.sAt + 12) * out,
    });
    const space = measure(ctx, " ", haikuOpts);
    let k = 0;
    hk.lines.forEach((line, li) => {
      let wx = x;
      for (const word of line) {
        const t = prog(F, hk.at + k * 10, hk.at + k * 10 + 10);
        if (t > 0)
          text(ctx, word, wx, y + (80 + li * 62) * u, {
            ...haikuOpts,
            color: mix(C.s4, C.ink, ease.outCubic(t)),
            alpha: 0.85 * Math.min(1, t * 2.5) * out,
          });
        wx += measure(ctx, word, haikuOpts) + space;
        k++;
      }
    });
  };
  // the title soaks in word by word (as the haiku do) over the slash, in ink and at a size a phone can read
  const introOpts = { size: 60 * u, family: F_.italic, weight: 400 };
  const INTRO = ["three", "seasons,", "in", "ink"];
  const intro = (ctx: Ctx, F: number) => {
    const out = 1 - prog(F, 76, 96);
    if (F < 2 || out <= 0) return;
    const space = measure(ctx, " ", introOpts),
      widths = INTRO.map((w) => measure(ctx, w, introOpts)),
      total = widths.reduce((a, b) => a + b, 0) + space * (INTRO.length - 1),
      y = D.intro[1] - 22 * u * ease.inCubic(prog(F, 76, 96));
    let wx = D.intro[0] - total / 2;
    INTRO.forEach((word, k) => {
      const t = prog(F, 2 + k * 5, 12 + k * 5);
      if (t > 0)
        text(ctx, word, wx, y, {
          ...introOpts,
          color: mix(C.s4, C.ink, ease.outCubic(t)),
          alpha: 0.88 * Math.min(1, t * 2.5) * out,
        });
      wx += widths[k] + space;
    });
  };

  // ---- the seal: a speckled vermilion square with a carved circle over a horizon line (an invented mark)
  const sr = rng(840),
    edge: Pt[] = [];
  for (let side = 0; side < 4; side++)
    for (let k = 0; k < 7; k++) {
      const t = k / 7 - 0.5,
        j = (sr() - 0.5) * 2.4,
        c = k === 0 ? (sr() - 0.5) * 2.4 : 0;
      const p: Pt =
        side === 0
          ? [t * 64, -32 + j]
          : side === 1
            ? [32 + j, t * 64]
            : side === 2
              ? [-t * 64, 32 + j]
              : [-32 + j, -t * 64];
      edge.push([p[0] + c, p[1] + c]);
    }
  const specks = Array.from({ length: 90 }, () => [
    (sr() - 0.5) * 62,
    (sr() - 0.5) * 62,
    0.5 + sr() * 1.3,
    0.45 + sr() * 0.5,
  ]);
  const blotches = Array.from({ length: 6 }, () => [(sr() - 0.5) * 44, (sr() - 0.5) * 44, 8 + sr() * 12]);
  const seal = (ctx: Ctx, F: number, z: number) => {
    if (F < SEAL_AT - 4) return;
    const t = prog(F, SEAL_AT - 4, SEAL_AT),
      k = lerp(1.6, 1, ease.inCubic(t)),
      spread = ease.outCubic(prog(F, SEAL_AT, SEAL_AT + 14)),
      sc = (SEAL_PX / 64) * ((u * k) / z); // SEAL_PX on screen, whatever the zoom
    const outline = (grow: number) => {
      const p = new Path2D();
      edge.forEach(([x, y], i) => {
        const l = Math.hypot(x, y) || 1,
          X = x + (x / l) * grow,
          Y = y + (y / l) * grow;
        if (i) p.lineTo(X, Y);
        else p.moveTo(X, Y);
      });
      p.closePath();
      return p;
    };
    ctx.save();
    ctx.translate(D.seal[0], D.seal[1]);
    ctx.scale(sc, sc);
    ctx.globalAlpha = Math.min(1, t * 3);
    if (spread > 0) {
      // the ink squeezed out under the press, then a paler ring where it soaks into the paper
      ctx.fillStyle = rgba(C.accent, 0.14 * spread);
      ctx.fill(outline(7 * spread));
      ctx.fillStyle = rgba(C.accent, 0.24);
      ctx.fill(outline(3 * spread));
    }
    ctx.fillStyle = C.accent;
    ctx.fill(outline(0));
    for (const [x, y, r] of blotches) {
      ctx.fillStyle = rgba(C.ground, 0.1);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // the carved mark, in paper colour
    ctx.strokeStyle = C.ground;
    ctx.lineWidth = 4.2;
    ctx.beginPath();
    ctx.arc(0, -7, 12.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineCap = "butt";
    ctx.beginPath();
    ctx.moveTo(-21, 15);
    ctx.lineTo(21, 15);
    ctx.stroke();
    for (const [x, y, r, a] of specks) {
      ctx.fillStyle = rgba(C.ground, a);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

  const visible = (i: number, c: { x: number; y: number; z: number }) => {
    const p = D.panel(i),
      hw = W / 2 / c.z,
      hh = H / 2 / c.z;
    return p.x < c.x + hw && p.x + p.w > c.x - hw && p.y < c.y + hh && p.y + p.h > c.y - hh;
  };

  // ---- the flick: a wet brush whipped across the whole frame (screen space) that wipes one season into the next.
  // Its body covers the screen at the cut; its leading edge bleeds a pale wet rim and its tail breaks into dry
  // bristle streaks. Down the hanging scroll in the vertical, right to left along the handscroll in the landscape.
  const fd = tall ? [0.3, 1] : [-1, 0.26],
    fl = Math.hypot(fd[0], fd[1]),
    dx = fd[0] / fl,
    dy = fd[1] / fl,
    corners = [
      [0, 0],
      [W, 0],
      [0, H],
      [W, H],
    ],
    sAlong = corners.map(([x, y]) => x * dx + y * dy),
    sAcross = corners.map(([x, y]) => -x * dy + y * dx),
    smin = Math.min(...sAlong),
    range = Math.max(...sAlong) - smin,
    umin = Math.min(...sAcross) - 60,
    umax = Math.max(...sAcross) + 60,
    BAND = range * 1.25,
    PAD = 140;
  const pt = (s: number, uu: number): Pt => [s * dx - uu * dy, s * dy + uu * dx];
  const flick = (ctx: Ctx, F: number) => {
    WIPES.forEach((c, wi) => {
      const t = (F - (c - WIPE_HALF)) / (2 * WIPE_HALF);
      if (t <= 0 || t >= 1) return;
      const seed = 400 + wi * 37,
        L = smin - PAD + (range + BAND + 2 * PAD) * t,
        Tr = L - BAND,
        lead: Pt[] = [],
        halo: Pt[] = [],
        trail: Pt[] = [];
      for (let uu = umin; uu <= umax + 1; uu += 16) {
        const eL =
            70 * (fractal(seed, uu / 260, 0.5, 1, 1, 2) - 0.5) + 22 * (fractal(seed + 1, uu / 45, 0.5, 1, 1, 2) - 0.5),
          eT =
            110 * (fractal(seed + 2, uu / 200, 0.5, 1, 1, 2) - 0.5) +
            30 * (fractal(seed + 3, uu / 30, 0.5, 1, 1, 2) - 0.5);
        lead.push(pt(L + eL, uu));
        halo.push(pt(L + eL + 26 + 30 * fractal(seed + 4, uu / 70, 0.5, 1, 1, 2), uu));
        trail.push(pt(Tr + eT, uu));
      }
      const poly = (a: Pt[], b: Pt[]) => {
        const p = new Path2D();
        p.moveTo(a[0][0], a[0][1]);
        for (const q of a) p.lineTo(q[0], q[1]);
        for (let k = b.length - 1; k >= 0; k--) p.lineTo(b[k][0], b[k][1]);
        p.closePath();
        return p;
      };
      ctx.fillStyle = rgba(C.s3, 0.4);
      ctx.fill(poly(halo, lead));
      ctx.fillStyle = rgba(C.s1, 0.95);
      ctx.fill(poly(lead, trail));
      // bristle marks inside the wet body: a few paler hair lines running the length of the stroke
      const hair = new Path2D();
      for (let k = 0; k < 18; k++) {
        const uu = lerp(umin, umax, hash(seed + 7, k)),
          [x0, y0] = pt(Tr + 40 + 200 * hash(seed + 8, k), uu),
          [x1, y1] = pt(L - 30 - 200 * hash(seed + 9, k), uu);
        hair.moveTo(x0, y0);
        hair.lineTo(x1, y1);
      }
      ctx.strokeStyle = rgba(C.s2, 0.32);
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      ctx.stroke(hair);
      // the dry tail: bristle lanes dragged out behind the body in uneven groups, broken where the brush ran out
      const lanes = 110,
        lw = (umax - umin) / lanes;
      for (let k = 0; k < lanes; k++) {
        const uu = umin + (k + 0.5) * lw,
          len = 40 + 460 * fractal(seed + 5, k / 7, 0.5, 1, 1, 2) ** 2.2 * (0.6 + 0.4 * hash(seed, k)),
          gap = hash(seed + 1, k),
          w = lw * (0.35 + 0.75 * hash(seed + 6, k)),
          tail = new Path2D(),
          [x0, y0] = pt(Tr + 60, uu),
          [x1, y1] = pt(Tr - len * (gap < 0.35 ? 0.4 + 0.2 * gap : 1), uu);
        tail.moveTo(x0, y0);
        tail.lineTo(x1, y1);
        if (gap < 0.35) {
          const [x2, y2] = pt(Tr - len * (0.7 + 0.2 * gap), uu),
            [x3, y3] = pt(Tr - len, uu);
          tail.moveTo(x2, y2);
          tail.lineTo(x3, y3);
        }
        ctx.strokeStyle = rgba(C.s1, 0.6 + 0.35 * hash(seed + 10, k));
        ctx.lineWidth = w;
        ctx.stroke(tail);
      }
    });
  };

  const paint = (ctx: Ctx, env: Env, F: number) => {
    F = clamp(F, 0, N - 1);
    const c = cam(F),
      paper = paperLayer(env, D, id);
    ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = C.surface;
    ctx.fillRect(0, 0, W, H);
    ctx.translate(W / 2, H / 2);
    ctx.scale(c.z, c.z);
    ctx.translate(-c.x, -c.y);
    scroll(ctx);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(paper.canvas, 0, 0, D.paper.w, D.paper.h);
    // ink multiplies into the paper, so the fibres show through every wash
    ctx.globalCompositeOperation = "multiply";
    paintings.forEach((marks, i) => {
      if (!visible(i, c)) return;
      for (const m of marks) if (F >= m.t0) m.draw(ctx, F);
    });
    sp.petal(ctx, F);
    if (visible(0, c)) rain(ctx, F);
    if (visible(1, c)) ripples(ctx, F);
    ctx.globalCompositeOperation = "source-over";
    if (visible(2, c)) snowfall(ctx, F);
    ctx.globalCompositeOperation = "source-over";
    intro(ctx, F);
    for (let i = 0; i < 3; i++) if (visible(i, c)) writeHaiku(ctx, F, i);
    seal(ctx, F, c.z);
    ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
    flick(ctx, F);
  };

  const cuts = [T.paper, T.spring, T.summer, T.winter, T.seal, N],
    names = ["paper", "spring", "summer", "winter", "seal"];
  const shots: Shot[] = names.map((sid, i) => ({
    id: sid,
    start: cuts[i],
    end: cuts[i + 1],
    draw: (ctx, local, env) => {
      const F = cuts[i] + local;
      // the slides and the pull-back get a shutter; the holds are painted once, sharp
      motionBlur(ctx, env, (cx, dt) => paint(cx, env, F + dt), {
        samples: Math.min(12, Math.max(1, Math.ceil((speed(F) * 0.35) / 2.2))),
        shutter: 0.35,
      });
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
      key: -5,
      // hits on the two flicks and the seal; whooshes on each stroke's landing, each cut and the gust
      hits: [...WIPES, SEAL_AT],
      whooshes: [20, 120, 140, 160, 180, ...WIPES, 380, 400, 420, 580, 620, 640, GUST, T.seal],
      // a tick for each blossom, and for every other haiku word (the ones on the beat)
      ticks: [190, 210, 230, 250, 270, ...WORD_TIMES.filter((f) => f % 20 === 0)],
      sign: 860,
      gain: 0.69,
    }),
  };
}

export const inkWash = make("landscape", "inkWash");
export const inkWashVertical = make("vertical", "inkWashVertical");
