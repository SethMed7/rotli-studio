// STUDY 62 · FOLD (4 s, 60 fps, a seamless loop). A SECONDS piece: no words, the style is the whole piece.
// A square sheet of red paper on a pale table folds itself into a paper plane in three crisp folds (the two top
// corners to the centre line, the sheet in half, the wings back out), takes off in a banked climbing turn, hangs
// in side profile at its apex on the bar-2 downbeat, glides down somewhere else, touches down still moving, bounces
// and skids, then slides home unfolding, the last two flaps slapping down on the loop point.
// One source, designed for square (the hero; the arc crosses the frame) and vertical (seen from lower, the climb
// fills the tall frame: folded and landed in the lower half, the apex high above).
// Brief: series/studies/briefs/fold.json · prompt: series/studies/prompts/fold.prompt.md
// Learns from origami and its crease patterns (https://en.wikipedia.org/wiki/Origami), drawn the way flat-shaded
// paper-fold animations draw it. No model diagram is reproduced.
//
// Folding is rotation about a line. The crease pattern is frozen in flat-sheet coordinates: each side of the
// sheet is four flat facets (the keel strip, the wing, and the corner flap cut in two by the wing crease it later
// lies across), and each facet lists the folds it rides. A facet's pose is a kinematic chain applied innermost
// first, flap → wing → half → body, with every hinge axis fixed in the FLAT sheet, so any combination of angles is
// rigid and consistent (no axis is ever recomputed from a half-folded state). Folds that end flat are springs
// clamped at flat (paper cannot pass through paper), solved so each lands on its beat; folds that end in the air
// overshoot and settle. Facets are shaded by their normal against one key light (the near wing takes a two-frame
// specular snap on the downbeat), ordered back to front each frame by plane-side tests and a topological sort, and the
// table takes a soft shadow, cast along the light, that tightens as the sheet lands. Everything is a closed-form
// function of the frame: every spring is clamped or multiplied out to exactly zero before frame 240, the flight's
// path is a table integrated once, the sheet's slide and turn home end exactly where the take-off begins, and every
// pulse is a function of the wrapped distance to its beat.
import PACK from "../../../brand/packs/studio/pack.json";
import { rng, type Ctx, type Env, type Layer } from "../core";
import type { Film, Shot } from "../film";
import { lufs } from "../kit/foley";
import { clamp, ease, lerp, prog, spring, type SpringOpts } from "../kit/motion";
import { usePack } from "../kit/pack";
import { beatScore } from "../kit/score";
import { layout, type Size } from "../kit/sizes";

const P = usePack(PACK),
  C = P.palette("fold");
const FPS = 60,
  BPM = 120,
  N = 240, // two bars: a beat is 30 frames, bar 2's downbeat is frame 120
  TAU = Math.PI * 2;
// the story, in frames: the corner flaps land on 28 and beat 2, the half fold on beat 3 (the pre-pulse), the wings
// on beat 4; the plane takes off as its wings snap out, hangs at its apex on the downbeat, touches down on 165,
// opens as the skid dies, flat on 200, and the flaps slap down on the loop point
const T = { f1: 15, f2: 45, half: 60, wings: 90, lift: 88, hit: 120, land: 165, open: 200, open2: 222, end: 240 };

const wrap = (F: number) => ((F % N) + N) % N;
/** signed distance in frames from `at`, wrapped into (-N/2, N/2] */
const around = (F: number, at: number) => {
  const d = wrap(F - at);
  return d > N / 2 ? d - N : d;
};
const smooth = (t: number) => t * t * (3 - 2 * t);

// ---- colour: every hue is a pack role
type RGB = [number, number, number];
const rgb = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a: RGB, b: RGB, t: number): RGB => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const css = (c: RGB, a = 1) =>
  `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${clamp(a).toFixed(4)})`;
const RED = rgb(C.accent),
  PINK = rgb(C.s1!),
  DARK = rgb(C.s2!),
  WHITE = rgb(C.surface),
  INK = rgb(C.ink),
  GROUND = rgb(C.ground),
  LINE = rgb(C.line),
  MUTED = rgb(C.muted);
// the front of the sheet (red) and its back (pale pink), each from turned-away to full light
const FRONT = { shade: mix(DARK, INK, 0.12), base: RED, lit: mix(RED, PINK, 0.3), glint: mix(RED, WHITE, 0.62) };
// the back is the pale pink pulled a third of the way to the red, so a back face still holds about 1.6:1 against
// the table (a folded dart shows mostly its back); its full light only lifts it partway back toward the pink
const BACK_BASE = mix(PINK, RED, 0.34);
const BACK = {
  shade: mix(BACK_BASE, DARK, 0.4),
  base: BACK_BASE,
  lit: mix(BACK_BASE, PINK, 0.4),
  glint: mix(BACK_BASE, WHITE, 0.4),
};

// ---- vectors and rigid transforms (3×3 rotation + translation, row-major)
type V3 = [number, number, number];
type M = Float64Array;
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const mat = (r: number[], t: V3 = [0, 0, 0]): M => Float64Array.from([...r, ...t]);
const ID = mat([1, 0, 0, 0, 1, 0, 0, 0, 1]);
const apply = (m: M, p: V3): V3 => [
  m[0]! * p[0] + m[1]! * p[1] + m[2]! * p[2] + m[9]!,
  m[3]! * p[0] + m[4]! * p[1] + m[5]! * p[2] + m[10]!,
  m[6]! * p[0] + m[7]! * p[1] + m[8]! * p[2] + m[11]!,
];
/** a ∘ b: b first */
const mul = (a: M, b: M): M => {
  const o = new Float64Array(12);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++)
      o[i * 3 + j] = a[i * 3]! * b[j]! + a[i * 3 + 1]! * b[3 + j]! + a[i * 3 + 2]! * b[6 + j]!;
    o[9 + i] = a[i * 3]! * b[9]! + a[i * 3 + 1]! * b[10]! + a[i * 3 + 2]! * b[11]! + a[9 + i]!;
  }
  return o;
};
/** rotation by th about the line through a with unit direction d (Rodrigues) */
const about = (a: V3, d: V3, th: number): M => {
  const c = Math.cos(th),
    s = Math.sin(th),
    k = 1 - c,
    [x, y, z] = d;
  const r = [
    c + x * x * k,
    x * y * k - z * s,
    x * z * k + y * s,
    y * x * k + z * s,
    c + y * y * k,
    y * z * k - x * s,
    z * x * k - y * s,
    z * y * k + x * s,
    c + z * z * k,
  ];
  const m = mat(r),
    ra = apply(m, a);
  m[9] = a[0] - ra[0];
  m[10] = a[1] - ra[1];
  m[11] = a[2] - ra[2];
  return m;
};
const move = (x: number, y: number, z: number) => mat([1, 0, 0, 0, 1, 0, 0, 0, 1], [x, y, z]);
const rotZ = (th: number) => about([0, 0, 0], [0, 0, 1], th);
const rotX = (th: number) => about([0, 0, 0], [1, 0, 0], th);
const rotY = (th: number) => about([0, 0, 0], [0, 1, 0], th);

// ---- the crease pattern of a classic dart, in flat-sheet units: the sheet is x, y in [-1, 1], the nose at (0, 1),
// z up. It is BUILT once by folding the left half flat, fold by fold, and mirrored: the corners to the centre line
// (L1), the new diagonal edges in again (L2, from the nose to the tail corner, so on a square sheet no corner pokes
// past the tail), then the wing crease (LW, nose to tail) splits what it crosses. Each facet remembers which folds it
// rides and the layer it ends in, so the 3D pose below is just the chain of those folds.
type P2 = [number, number];
type Line = { a: P2; d: P2 };
const WC = 0.42, // the wing crease meets the tail edge this far from the centre line
  EPS = 0.004; // a folded layer floats this far above the one beneath it, so the layers never tie
const lineThrough = (a: P2, b: P2): Line => {
  const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
  return { a, d: [(b[0] - a[0]) / l, (b[1] - a[1]) / l] };
};
const L1 = lineThrough([0, 1], [-1, 0]),
  L2 = lineThrough([0, 1], [-1, -1]),
  LW = lineThrough([0, 1], [-WC, -1]);
const sideOfLine = (l: Line, p: P2) => (p[0] - l.a[0]) * l.d[1] - (p[1] - l.a[1]) * l.d[0];
/** the part of a convex polygon on one side of a line (Sutherland–Hodgman) */
const clipLine = (poly: P2[], l: Line, sign: number): P2[] => {
  const out: P2[] = [];
  poly.forEach((p, i) => {
    const q = poly[(i + 1) % poly.length]!,
      sp = sideOfLine(l, p) * sign,
      sq = sideOfLine(l, q) * sign;
    if (sp >= 0) out.push(p);
    if ((sp > 0 && sq < 0) || (sp < 0 && sq > 0)) {
      const t = sp / (sp - sq);
      out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
    }
  });
  return out;
};
const reflectP = (l: Line, p: P2): P2 => {
  const vx = p[0] - l.a[0],
    vy = p[1] - l.a[1],
    k = vx * l.d[0] + vy * l.d[1];
  return [l.a[0] + 2 * k * l.d[0] - vx, l.a[1] + 2 * k * l.d[1] - vy];
};
const areaOf = (poly: P2[]) =>
  poly.reduce((a, p, i) => a + p[0] * poly[(i + 1) % poly.length]![1] - poly[(i + 1) % poly.length]![0] * p[1], 0) / 2;
type Seed = { cur: P2[]; refl: Line[]; f1: boolean; f2: boolean; w: boolean };
const foldSeeds = (seeds: Seed[], l: Line, ref: P2, apply: (s: Seed, part: P2[]) => Seed) => {
  const sign = Math.sign(sideOfLine(l, ref)),
    out: Seed[] = [];
  for (const sd of seeds) {
    const keep = clipLine(sd.cur, l, -sign),
      moved = clipLine(sd.cur, l, sign);
    if (Math.abs(areaOf(keep)) > 1e-6) out.push({ ...sd, cur: keep });
    if (Math.abs(areaOf(moved)) > 1e-6) out.push(apply(sd, moved));
  }
  return out;
};
type Zone = "keel" | "wing";
type FacetDef = {
  side: -1 | 1;
  pts: P2[];
  creases: number[];
  f1: boolean;
  f2: boolean;
  w: boolean;
  zone: Zone;
  /** the layer it ends in, bottom up: the sheet 0, the corner flap's inner part 1, its outer part 2, the second flap 3 */
  rank: number;
};
const FACETS: FacetDef[] = (() => {
  let seeds: Seed[] = [
    {
      cur: [
        [0, 1],
        [-1, 1],
        [-1, -1],
        [0, -1],
      ],
      refl: [],
      f1: false,
      f2: false,
      w: false,
    },
  ];
  seeds = foldSeeds(seeds, L1, [-1, 1], (sd, p) => ({
    ...sd,
    cur: p.map((q) => reflectP(L1, q)),
    refl: [...sd.refl, L1],
    f1: true,
  }));
  seeds = foldSeeds(seeds, L2, [-1, -0.9], (sd, p) => ({
    ...sd,
    cur: p.map((q) => reflectP(L2, q)),
    refl: [...sd.refl, L2],
    f2: true,
  }));
  seeds = foldSeeds(seeds, LW, [-0.9, -0.9], (sd, p) => ({ ...sd, cur: p, w: true }));
  const onEdge = (a: P2, b: P2) =>
    (Math.abs(Math.abs(a[0]) - 1) < 1e-6 && Math.abs(a[0] - b[0]) < 1e-6) ||
    (Math.abs(Math.abs(a[1]) - 1) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6);
  return [-1, 1].flatMap((side) =>
    seeds.map((sd): FacetDef => {
      // back to the flat sheet: undo the reflections, last first
      const orig = sd.cur.map((q) => sd.refl.reduceRight<P2>((p, l) => reflectP(l, p), q)),
        pts = orig.map(([x, y]) => [-side * x, y] as P2);
      return {
        side: side as -1 | 1,
        pts,
        creases: pts.map((_, i) => i).filter((i) => !onEdge(orig[i]!, orig[(i + 1) % orig.length]!)),
        f1: sd.f1,
        f2: sd.f2,
        w: sd.w,
        zone: sd.w ? "wing" : "keel",
        rank: sd.f1 ? (sd.f2 ? 2 : 1) : sd.f2 ? 3 : 0,
      };
    }),
  );
})();

// ---- the folds: springs whose first crossing is solved so each lands on its frame. They overlap: each fold lifts
// off before the last one has settled, so the paper never waits
const SP_F1: SpringOpts = { freq: 2.9, damp: 0.5 },
  SP_F2: SpringOpts = { freq: 0.77, damp: 0.5 },
  SP_F2OPEN: SpringOpts = { freq: 1.1, damp: 0.5 },
  SP_WING: SpringOpts = { freq: 0.9, damp: 0.45 },
  SP_OPEN: SpringOpts = { freq: 1.3, damp: 0.6 };
/** frames from rest to a spring's first crossing of 1 */
const firstCross = (o: SpringOpts) => {
  let t = 0;
  while (spring(t, o) < 1 && t < 4) t += 1 / 4800;
  return t * FPS;
};
const X_F1 = firstCross(SP_F1),
  X_F2 = firstCross(SP_F2),
  // the second flaps may only start opening once the half and the wings are flat
  X_F2OPEN = Math.min(firstCross(SP_F2OPEN), T.open2 - T.open),
  X_WING = firstCross(SP_WING),
  X_OPEN = firstCross(SP_OPEN);
/** a fold that lands flat: 0 → 1, hitting exactly 1 on `land` and held there (clamped, the paper stops) */
const slap = (F: number, land: number, o: SpringOpts, x: number) => {
  const s = land - x;
  return F <= s ? 0 : F >= land ? 1 : Math.min(1, spring((F - s) / FPS, o));
};
/** a fold that ends in the air: first reaches 1 on `land`, overshoots and settles */
const swing = (F: number, land: number, o: SpringOpts, x: number) => spring((F - (land - x)) / FPS, o);

// the half fold: lifting from frame 28 (while the second flaps land), accelerating to cross its mark at full speed
// exactly on the pre-pulse (60), then swinging past it and settling, an underdamped spring started with that speed
const HALF_FROM = 28,
  HALF_POW = 1.6,
  HW = (TAU * 1.1) / FPS, // rad per frame
  HZ = 0.4,
  HWD = HW * Math.sqrt(1 - HZ * HZ),
  HV0 = HALF_POW / (60 - HALF_FROM);
const halfIn = (F: number) => {
  if (F <= HALF_FROM) return 0;
  if (F <= T.half) return prog(F, HALF_FROM, T.half) ** HALF_POW;
  const t = F - T.half;
  return 1 + (HV0 / HWD) * Math.exp(-HZ * HW * t) * Math.sin(HWD * t);
};
const HMAX = (70 * Math.PI) / 180, // the half fold: each half rises this far (it swings past and back through it)
  GMAX = (50 * Math.PI) / 180; // the wing fold, back out: the wings keep about 20° of dihedral, in the air and landed
/** per side (left, right): the corner fold and the second nose fold; then the half and the wings */
type Folds = { f1: [number, number]; f2: [number, number]; h: number; g: number };
const folds = (F: number): Folds => {
  F = wrap(F);
  // the corner flaps rest flat for a few frames, then fold in (landing on 15, the left one half a frame first) and fall back open at the end like paper
  // under gravity, fastest at the instant they hit, on 240 = 0; off that slap they rebound a little
  const bounce = F < 6 ? 0.04 * Math.sin((Math.PI * F) / 6) * (1 - F / 6) : 0,
    fall = 1 - prog(F, T.open2, T.end) ** 2.6;
  const f1 = (lead: number) => (F < T.hit ? Math.min(1, slap(F, T.f1 - lead, SP_F1, X_F1) + bounce) : fall);
  // the second nose flaps land on 45 and spring open again on 222, once the half and the wings are flat
  const f2 = (lead: number) =>
    F < T.hit ? slap(F, T.f2 - lead, SP_F2, X_F2) : 1 - slap(F, T.open2, SP_F2OPEN, X_F2OPEN);
  // the half and the wings swing in, then open as one (so the keel never kinks), starting as the plane skids to a
  // stop and landing flat on 200; both are multiplied out to exactly 0 by the opening's clamp
  const open = slap(F, T.open, SP_OPEN, X_OPEN);
  const h = HMAX * halfIn(F) * (1 - open),
    g = GMAX * swing(F, T.wings, SP_WING, X_WING) * (1 - open);
  return { f1: [f1(0.5), f1(0)], f2: [f2(0.5), f2(0)], h, g };
};

// ---- the flight: a gliding arc that travels across the frame. The path is laid out by arc length: the heading
// turns late (so on the downbeat the plane is in three-quarter profile, a clear dart), the speed is quick off the
// table and dies away in a short skid after touchdown. Back on the table the sheet slides home and turns back to its
// first heading while it unfolds and folds again, so frame 240 is frame 0.
const STOP = 176, // the skid ends
  PIVOT: V3 = [0, -0.15, 0.14];
/** per size: the heading at take-off (radians from +x), how far the arc turns (negative: to the right), its length
 * and its chord's middle on the table, the apex height, how hard it banks, and the heading the sheet is folded at
 * (turned so the half fold reads side-on) */
type Flight = {
  theta0: number;
  arc: number;
  len: number;
  mid: [number, number];
  zmax: number;
  bank: number;
  fold: number;
  /** the descent's weight: a nose-down pitch building into the glide, then a flare just before contact (radians) */
  dive: number;
};
const DEG = Math.PI / 180;
// both climb in a gentle left turn from a shallow three-quarter front view through side profile on the apex to a
// shallow three-quarter rear one (the turn is kept small so the sheet has little to turn back on the table). The square's arc crosses the frame; the vertical's is seen from lower and climbs much higher, so the
// tall frame carries the flight's height: folded and landed low, the apex high above
const SQUARE_FLIGHT: Flight = {
    theta0: -35 * DEG,
    arc: 65 * DEG,
    len: 2.2,
    mid: [0.14, 0.2],
    zmax: 1.15,
    bank: 0.4,
    fold: -8 * DEG,
    dive: 0.2,
  },
  TALL_FLIGHT: Flight = {
    theta0: -35 * DEG,
    arc: 65 * DEG,
    len: 1.0,
    mid: [0.2, 0.1],
    zmax: 2.15,
    bank: 0.18,
    fold: -8 * DEG,
    dive: 0.12,
  };
// the speed along the path, as a share of the arc per unit of flight time s: up to speed off the table, slowest at
// the apex (the glider trades its speed for height and hangs there on the downbeat), quick again in the glide, still
// moving at touchdown and then dying away in the skid. Integrated once into a table, so progress is closed-form.
const PROG = (() => {
  const NS = 600,
    sHit = (T.hit - T.lift) / (STOP - T.lift),
    sLand = (T.land - T.lift) / (STOP - T.lift),
    v = (s: number) =>
      smooth(clamp(s / 0.12)) *
      (1 - 0.25 * Math.exp(-(((s - sHit) / 0.11) ** 2))) *
      (s < sLand ? 1 : (1 - (s - sLand) / (1 - sLand)) ** 1.6),
    out = new Float64Array(NS + 1);
  for (let i = 1; i <= NS; i++) out[i] = out[i - 1]! + v((i - 0.5) / NS) / NS;
  for (let i = 0; i <= NS; i++) out[i] = out[i]! / out[NS]!;
  return (s: number) => {
    const k = clamp(s) * NS,
      i = Math.min(NS - 1, Math.floor(k));
    return lerp(out[i]!, out[i + 1]!, k - i);
  };
})();
type Flyer = {
  pos: (F: number) => [number, number];
  yaw: (F: number) => number;
  height: (F: number) => number;
  air: (F: number) => number;
  speed: (F: number) => number;
  body: (F: number) => M;
};
const flyer = (fl: Flight): Flyer => {
  // the path, integrated once by arc length: heading(q) = theta0 + arc · κ(q), κ eases in late and out flat
  const NS = 480,
    // (most of the turn is in the climb, a banked chandelle; the glide after the apex runs nearly straight)
    kappa = (q: number) => {
      // (smootherstep: the turn's rate AND its change ease to zero, so the bank never stops with a kink)
      const t = clamp(q / 0.62);
      return t * t * t * (t * (t * 6 - 15) + 10);
    },
    heading = (q: number) => fl.theta0 + fl.arc * kappa(q),
    px = new Float64Array(NS + 1),
    py = new Float64Array(NS + 1);
  for (let i = 1; i <= NS; i++) {
    const h = heading((i - 0.5) / NS);
    px[i] = px[i - 1]! + (Math.cos(h) * fl.len) / NS;
    py[i] = py[i - 1]! + (Math.sin(h) * fl.len) / NS;
  }
  const ox = fl.mid[0] - px[NS]! / 2,
    oy = fl.mid[1] - py[NS]! / 2,
    at = (q: number): [number, number] => {
      const k = clamp(q) * NS,
        i = Math.min(NS - 1, Math.floor(k)),
        f = k - i;
      return [ox + lerp(px[i]!, px[i + 1]!, f), oy + lerp(py[i]!, py[i + 1]!, f)];
    },
    A = at(0),
    B = at(1),
    yawA = fl.theta0 - Math.PI / 2,
    yawB = fl.theta0 + fl.arc - Math.PI / 2,
    yawF = fl.fold - Math.PI / 2;
  // progress along the path: quick off the table, gliding, dying away to a stop at STOP
  const q = (F: number) => PROG(prog(wrap(F), T.lift, STOP));
  const inFlight = (F: number) => {
    F = wrap(F);
    return F > T.lift && F < STOP;
  };
  // G runs from the take-off round the wrap to the next one, so the slide home can begin inside the skid
  const groundT = (F: number) => {
    F = wrap(F);
    return F > T.lift ? F : F + N;
  };
  const smoother = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  // the slide home starts six frames before the skid ends (added on top of the path, so it is seamless)
  const pos = (F: number): [number, number] => {
    const [x, y] = inFlight(F) ? at(q(F)) : B,
      sl = smoother(prog(groundT(F), STOP - 6, N - 6));
    return [x + (A[0] - B[0]) * sl, y + (A[1] - B[1]) * sl];
  };
  // on the table the sheet turns from where it landed back to its folding heading (under 45°, done before the
  // corner flaps open), then into its take-off heading during the wing fold, finished before it lifts
  const yaw = (F: number) => {
    const G = groundT(F);
    return (
      (inFlight(F) ? heading(q(F)) - Math.PI / 2 : yawB) +
      (yawF - yawB) * smooth(prog(G, STOP - 6, T.open - 3)) +
      (yawA - yawF) * smooth(prog(G, N + 44, N + 78))
    );
  };
  // the loop point: the open sheet floats a hair off the table as its flaps fall, and drops flat on frame 0
  const drop = (F: number) => {
    F = wrap(F);
    if (F < 222) return 0;
    return F < 236 ? 0.03 * smooth(prog(F, 222, 236)) : 0.03 * (1 - prog(F, 236, N) ** 2);
  };
  // height: a quick climb to the apex on the downbeat, a longer glide down that still meets the table moving
  // (touchdown on T.land), then a small bounce that is over before the skid ends
  const height = (F: number) => {
    F = wrap(F);
    if (F <= T.lift || F >= STOP) return 0;
    if (F <= T.hit) return fl.zmax * Math.sin((Math.PI / 2) * prog(F, T.lift, T.hit)) ** 1.6;
    if (F <= T.land) return fl.zmax * (1 - prog(F, T.hit, T.land) ** 1.7);
    const d = F - T.land;
    return d < 7 ? 0.15 * Math.sin((Math.PI * d) / 7) : d < 11 ? 0.02 * Math.sin((Math.PI * (d - 7)) / 4) : 0;
  };
  const air = (F: number) => {
    const s = prog(wrap(F), T.lift, STOP);
    return s <= 0 || s >= 1 ? 0 : Math.sin(Math.PI * s) ** 1.4;
  };
  const speed = (F: number) => {
    const a = pos(F - 0.5),
      b = pos(F + 0.5);
    return Math.hypot(b[0] - a[0], b[1] - a[1]);
  };
  const avgRate = Math.abs(fl.arc) / (STOP - T.lift);
  // round the downbeat the dart swells about a tenth, over 110–130, so the hit carries more paper
  const swell = (F: number) => {
    const k = 1 + 0.1 * Math.sin(Math.PI * prog(F, 110, 130)) ** 2;
    return mat([k, 0, 0, 0, k, 0, 0, 0, k]);
  };
  const body = (F: number): M => {
    F = wrap(F);
    const [x, y] = pos(F),
      w = yaw(F);
    if (!inFlight(F)) return mul(move(x, y, drop(F)), rotZ(w));
    const z = height(F),
      // the attitude follows the path: nose up in the climb, down in the glide, banked into the turn by its rate,
      // a light flutter; all eased out to the table
      vz = height(F + 0.5) - height(F - 0.5),
      rate = yaw(F + 0.5) - yaw(F - 0.5),
      on = smooth(clamp(z / 0.25)),
      // (on first contact the nose tips down a little as it bounces; on the downbeat it rolls its near wing toward
      // the camera, so the red top faces us at the apex)
      d = F - T.land,
      tip = d > 0 && d < 7 ? -0.12 * Math.sin((Math.PI * d) / 7) : 0,
      // (in the bounces only the tip moves it: no path pitch rocking the nose, no bank)
      air = F < T.land ? on : 0,
      // (the hit: a quick roll of the near wing toward the camera, six frames up and eighteen down, and a nose-up
      // flick on the downbeat itself)
      hitRoll = F < T.hit ? smooth(prog(F, T.hit - 6, T.hit)) : 1 - smooth(prog(F, T.hit, T.hit + 18)),
      hitFlick = F < T.hit ? smooth(prog(F, T.hit - 4, T.hit)) : 1 - smooth(prog(F, T.hit, T.hit + 10)),
      // (the descent: the nose drops into the glide over 138–155 and flares up over 150–165, gone exactly at contact)
      dive =
        F < T.land
          ? -fl.dive * smooth(prog(F, 138, 155)) * (1 - smooth(prog(F, 154, 162))) +
            0.6 * fl.dive * Math.sin(Math.PI * prog(F, 150, T.land))
          : 0,
      // (a soft limit, so the nose eases into its glide angle instead of stopping dead on a clamp)
      pa = Math.atan2(vz, speed(F) + 0.02) * 0.5,
      pitch = (pa < 0 ? 0.24 * Math.tanh(pa / 0.24) : 0.3 * Math.tanh(pa / 0.3)) * air + tip + 0.12 * hitFlick + dive,
      roll = clamp(-fl.bank * (rate / avgRate) + 0.04 * Math.sin((TAU * 6 * F) / N), -0.6, 0.6) * air + 0.45 * hitRoll;
    return mul(
      move(x, y, z),
      mul(
        rotZ(w),
        mul(
          move(PIVOT[0], PIVOT[1], PIVOT[2]),
          mul(rotX(pitch), mul(rotY(roll), mul(swell(F), move(-PIVOT[0], -PIVOT[1], -PIVOT[2])))),
        ),
      ),
    );
  };
  return { pos, yaw, height, air, speed, body };
};
const SQ = flyer(SQUARE_FLIGHT);

// ---- a facet's transform for the given folds: body ∘ half ∘ (wing) ∘ (second flap) ∘ (corner flap), every hinge a
// line in flat-sheet terms (mirrored for the right side); each later fold only moves once the earlier ones are flat,
// so the chain is always rigid. Each flap's layer floats above the one it lands on (the right side a hair higher)
const axisOf = (l: Line, s: number): V3 => [-s * l.d[0], l.d[1], 0];
const chain = (fd: FacetDef, fo: Folds, body: M): M => {
  const s = fd.side,
    i = s > 0 ? 1 : 0,
    bias = s > 0 ? 1.25 : 1;
  let m = ID;
  if (fd.f1) {
    const f = fo.f1[i];
    m = mul(move(0, 0, EPS * bias * smooth(f)), about([0, 1, 0], axisOf(L1, s), s * Math.PI * f));
  }
  if (fd.f2) {
    const f = fo.f2[i];
    m = mul(mul(move(0, 0, 3 * EPS * bias * smooth(f)), about([0, 1, 0], axisOf(L2, s), s * Math.PI * f)), m);
  }
  // about the wing crease, back out (a mountain fold relative to the half)
  if (fd.w) m = mul(about([0, 1, 0], axisOf(LW, s), -s * fo.g), m);
  // about the centre line: both halves rise (a valley fold)
  m = mul(about([0, 0, 0], [0, 1, 0], -s * fo.h), m);
  return mul(body, m);
};

export function make(size: Size, id: string): Film {
  const L = layout(size),
    { W, H, u } = L,
    tall = L.tall;
  // per-size design: the square's arc crosses the frame left to right; the vertical sits the sheet in the lower
  // half and looks from lower, with only a light follow of the height, so the climb rises up the tall frame
  const D = tall
    ? { vx: W / 2 + 37 * u, vy: H * 0.61, el: 0.86, az: 0.1, dist: 7, ppu: 268, fl: TALL_FLIGHT, follow: 0.1 }
    : { vx: W / 2, vy: H * 0.5, el: 0.9, az: 0.1, dist: 6.6, ppu: 228, fl: SQUARE_FLIGHT, follow: 0.25 };
  const FL = tall ? flyer(TALL_FLIGHT) : SQ;
  const HMID = D.fl.theta0 + D.fl.arc / 2; // the flight's middle heading, which the camera orbit centres on

  // ---- the camera: a look-at with gentle perspective, a slow drift, a loose follow of the paper (so it still
  // travels across the frame, and the camera keeps dollying through the landed beats), a punch-in on the downbeat and
  // two small bumps (the loop point, the pre-pulse)
  type Cam = { eye: V3; r: V3; up: V3; f: V3; focal: number };
  const camera = (F: number): Cam => {
    const t = wrap(F) / N,
      air = FL.air(F),
      [gx, gy] = FL.pos(F),
      z = FL.height(F),
      zoom =
        1 +
        0.01 * Math.sin(TAU * t + 0.7) +
        (tall ? 0.1 : 0.12) * punch(F) +
        0.05 * pulse0(F) +
        (tall ? 0.09 : 0.045) * pulse60(F);
    const target: V3 = [gx * 0.3, gy * 0.3, D.follow * z],
      // (the camera half-follows the paper's heading round the table, so the take-off, the apex and the landing all
      // read close to side-on)
      // (through the descent and the skid it follows harder and drops a little lower, so they read side-on)
      late = smooth(prog(wrap(F), 138, 152)) * (1 - smooth(prog(wrap(F), 186, 204))),
      az = D.az + 0.04 * Math.sin(TAU * t + 0.4) - (0.5 + 0.3 * late) * (FL.yaw(F) + Math.PI / 2 - HMID),
      el = D.el + 0.025 * Math.sin(TAU * t + 2.1) + 0.03 * air - 0.1 * late,
      eye: V3 = [
        target[0] - D.dist * Math.sin(az) * Math.cos(el),
        target[1] - D.dist * Math.cos(az) * Math.cos(el),
        target[2] + D.dist * Math.sin(el),
      ],
      f = norm(sub(target, eye)),
      r = norm(cross(f, [0, 0, 1])),
      up = cross(r, f);
    return { eye, r, up, f, focal: D.ppu * D.dist * zoom * u };
  };
  /** add a polygon to the current path, always wound the same way (so a nonzero fill is the union) */
  const addWound = (c: Ctx, q: [number, number][]) => {
    const ar = q.reduce((a, p, i) => a + p[0] * q[(i + 1) % q.length]![1] - q[(i + 1) % q.length]![0] * p[1], 0),
      pts = ar < 0 ? [...q].reverse() : q;
    pts.forEach(([x, y], k) => (k ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.closePath();
  };
  const project = (c: Cam, p: V3): [number, number] => {
    const v = sub(p, c.eye),
      zc = dot(v, c.f);
    return [D.vx + (c.focal * dot(v, c.r)) / zc, D.vy - (c.focal * dot(v, c.up)) / zc];
  };

  // ---- the key light: one sun from the upper left, in front
  const KEY = norm([-0.55, -0.36, 0.72]);
  const REST = KEY[2]; // how lit the flat sheet is: the colour ramp's middle

  // ---- facets this frame: world points, front normal, colour, screen polygon, depth
  type Drawn = {
    fd: FacetDef;
    w: V3[];
    n: V3;
    c: V3;
    sp: [number, number][];
    box: [number, number, number, number];
    depth: number;
    fill: RGB;
    /** the facet's transform (for points other than its corners) */
    m: M;
    /** the downbeat's highlight band: screen nose and tail of the wing it sweeps along, where it is (0..1), how strong */
    band?: { a: [number, number]; b: [number, number]; p: number; k: number };
  };
  const shade = (n: V3, cen: V3, cam: Cam): RGB => {
    const v = norm(sub(cam.eye, cen)),
      front = dot(n, v) >= 0,
      nv: V3 = front ? n : [-n[0], -n[1], -n[2]],
      ramp = front ? FRONT : BACK,
      d = dot(nv, KEY);
    return d >= REST
      ? mix(ramp.base, ramp.lit, clamp((d - REST) / (1 - REST)))
      : mix(ramp.base, ramp.shade, clamp((REST - d) / (REST + 0.35)) ** 0.9);
  };
  // the downbeat: a narrow highlight band sweeps the near wing from nose to tail over 115–125 (its middle crossing
  // the wing on 120), over a light lift
  // of the wing's colour that is up in a frame and gone in about five
  const snap = (F: number) => {
    const a = around(F, T.hit - 1);
    return a < 0 ? 0 : a < 1 ? a : Math.exp(-(a - 1) / 1.8) * (1 - smooth(prog(a, 5, 9)));
  };
  const snapWing = (ds: Drawn[], F: number, cam: Cam) => {
    const k = snap(F),
      sweep = prog(wrap(F), T.hit - 5, T.hit + 5),
      kb = Math.sin(Math.PI * sweep);
    if (k < 0.01 && kb < 0.01) return;
    // (the near wing is the one whose top shows the camera the most paper)
    const shown = (d: Drawn) => {
      let a2 = 0;
      d.sp.forEach(([x, y], k) => {
        const [x2, y2] = d.sp[(k + 1) % d.sp.length]!;
        a2 += x * y2 - x2 * y;
      });
      return Math.abs(a2) * (dot(d.n, sub(cam.eye, d.c)) >= 0 ? 1 : 0.2);
    };
    const wing = ds
        .filter((d) => d.fd.zone === "wing" && d.fd.rank === 0)
        .reduce((a, b) => (shown(b) > shown(a) ? b : a)),
      near = wing.fd.side,
      // the band runs from the nose to the middle of the wing's tail edge
      nose = project(cam, apply(wing.m, [0, 1, 0])),
      tail = project(cam, apply(wing.m, [(near * (1 + WC)) / 2, -1, 0]));
    for (const d of ds) {
      if (d.fd.side !== near || d.fd.zone !== "wing") continue;
      // a light lift of the whole wing (capped, so the paper stays red) and the band that sweeps it
      const front = dot(d.n, sub(cam.eye, d.c)) >= 0;
      d.fill = front ? mix(d.fill, FRONT.glint, 0.3 * k) : mix(d.fill, BACK.lit, 0.3 * k);
      d.band = { a: nose, b: tail, p: ease.inOutCubic(sweep), k: kb };
    }
  };
  /** the facets at F; inside a motion-blur sample, each facet is placed at F + dt·k, where k falls from 1 to 0 as
   * the facet turns edge-on, so a facet seen edge-on stays crisp instead of smearing into a see-through whisker */
  const build = (F: number, cam: Cam, dt = 0): Drawn[] => {
    const fo = folds(F),
      body = FL.body(F);
    const ds = FACETS.map((fd): Drawn => {
      let m = chain(fd, fo, body);
      if (dt) {
        const n0 = norm([m[2]!, m[5]!, m[8]!]),
          c0 = apply(m, [
            fd.pts.reduce((a, p) => a + p[0], 0) / fd.pts.length,
            fd.pts.reduce((a, p) => a + p[1], 0) / fd.pts.length,
            0,
          ]),
          k = smooth(clamp(Math.abs(dot(n0, norm(sub(cam.eye, c0)))) / 0.25)),
          t = F + dt * k;
        if (k > 0.001) m = chain(fd, folds(t), FL.body(t));
      }
      const w = fd.pts.map(([x, y]) => apply(m, [x, y, 0])),
        n: V3 = norm([m[2]!, m[5]!, m[8]!]),
        c: V3 = [0, 0, 0];
      for (const p of w) for (let k = 0; k < 3; k++) c[k] = c[k]! + p[k]! / w.length;
      const sp = w.map((p) => project(cam, p));
      let x0 = Infinity,
        y0 = Infinity,
        x1 = -Infinity,
        y1 = -Infinity;
      for (const [x, y] of sp) {
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
      }
      return {
        fd,
        w,
        n,
        c,
        sp,
        box: [x0, y0, x1, y1],
        depth: dot(sub(c, cam.eye), cam.f),
        fill: shade(n, c, cam),
        m,
      };
    });
    snapWing(ds, F, cam);
    return ds;
  };
  /** +1: b lies wholly on the camera's side of a's plane (draw a first); -1: wholly behind; 0: it straddles */
  const sideOf = (a: Drawn, b: Drawn, cam: Cam) => {
    const cs = Math.sign(dot(a.n, sub(cam.eye, a.c))) || 1;
    let lo = Infinity,
      hi = -Infinity;
    for (const p of b.w) {
      const d = dot(a.n, sub(p, a.c)) * cs;
      lo = Math.min(lo, d);
      hi = Math.max(hi, d);
    }
    const tol = 1e-4;
    if (lo > -tol && hi > tol) return 1;
    if (hi < tol && lo < -tol) return -1;
    return 0;
  };
  /** do two convex screen polygons truly overlap (by more than a hair, so neighbours sharing an edge do not)? */
  const overlap = (a: [number, number][], b: [number, number][]) => {
    for (const poly of [a, b])
      for (let k = 0; k < poly.length; k++) {
        const p = poly[k]!,
          q = poly[(k + 1) % poly.length]!,
          nx = q[1] - p[1],
          ny = p[0] - q[0],
          l = Math.hypot(nx, ny);
        if (l < 1e-6) continue;
        let a0 = Infinity,
          a1 = -Infinity,
          b0 = Infinity,
          b1 = -Infinity;
        for (const [x, y] of a) {
          const t = (x * nx + y * ny) / l;
          a0 = Math.min(a0, t);
          a1 = Math.max(a1, t);
        }
        for (const [x, y] of b) {
          const t = (x * nx + y * ny) / l;
          b0 = Math.min(b0, t);
          b1 = Math.max(b1, t);
        }
        if (Math.min(a1, b1) - Math.max(a0, b0) < 0.75) return false;
      }
    return true;
  };
  /** the fixed layer of a facet in the fold chain (a later-folded layer lies over an earlier one): the tie-break when
   * two facets are coplanar, so a landed stack never flickers */
  const rank = (d: Drawn) => d.fd.rank;
  const coplanar = (a: Drawn, b: Drawn) =>
    Math.abs(dot(a.n, b.n)) > 0.995 && b.w.every((p) => Math.abs(dot(a.n, sub(p, a.c))) < 0.012);
  /** back to front: an edge a → b for every truly overlapping pair, ordered by the plane tests (or, for a coplanar
   * pair, by layer), then a topological sort that always takes the farthest ready facet (and breaks a cycle the
   * same way) */
  const orderSet = (ds: Drawn[], cam: Cam): Drawn[] => {
    const n = ds.length,
      after: number[][] = ds.map(() => []),
      need = Array.from({ length: n }, () => 0);
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++) {
        const a = ds[i]!,
          b = ds[j]!;
        if (a.box[2] < b.box[0] || b.box[2] < a.box[0] || a.box[3] < b.box[1] || b.box[3] < a.box[1]) continue;
        if (!overlap(a.sp, b.sp)) continue;
        let r = sideOf(a, b, cam);
        if (!r) r = -sideOf(b, a, cam);
        if (!r && coplanar(a, b)) {
          // the flaps lie on the front face of what they are folded onto: over it when the camera sees that face
          const base = rank(a) <= rank(b) ? a : b,
            frontSide = dot(base.n, sub(cam.eye, base.c)) >= 0;
          r = rank(a) <= rank(b) === frontSide ? 1 : -1;
        }
        if (!r) r = a.depth >= b.depth ? 1 : -1;
        const [p, q] = r > 0 ? [i, j] : [j, i];
        after[p]!.push(q);
        need[q] = need[q]! + 1;
      }
    const done = Array.from({ length: n }, () => false),
      out: Drawn[] = [];
    for (let k = 0; k < n; k++) {
      let pick = -1;
      for (let i = 0; i < n; i++)
        if (!done[i] && need[i] === 0 && (pick < 0 || ds[i]!.depth > ds[pick]!.depth)) pick = i;
      if (pick < 0) for (let i = 0; i < n; i++) if (!done[i] && (pick < 0 || ds[i]!.depth > ds[pick]!.depth)) pick = i;
      done[pick] = true;
      out.push(ds[pick]!);
      for (const q of after[pick]!) need[q] = need[q]! - 1;
    }
    return out;
  };
  /** the convex hull of screen points (monotone chain) */
  const hull = (pts: [number, number][]): [number, number][] => {
    const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]),
      x = (o: [number, number], a: [number, number], b: [number, number]) =>
        (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]),
      lo: [number, number][] = [],
      hi: [number, number][] = [];
    for (const q of p) {
      while (lo.length >= 2 && x(lo[lo.length - 2]!, lo[lo.length - 1]!, q) <= 0) lo.pop();
      lo.push(q);
    }
    for (const q of p.reverse()) {
      while (hi.length >= 2 && x(hi[hi.length - 2]!, hi[hi.length - 1]!, q) <= 0) hi.pop();
      hi.push(q);
    }
    return [...lo.slice(0, -1), ...hi.slice(0, -1)];
  };
  /** once every nose flap lies flat, the paper is four flat stacks (each side's keel and wing): sort the stacks as
   * wholes, then draw each stack's layers bottom up when the camera sees its front face (top down when it sees the
   * back), so a landed stack can never be torn apart by a tie in the sort */
  const order = (ds: Drawn[], cam: Cam, stacked: boolean): Drawn[] => {
    if (!stacked) return orderSet(ds, cam);
    const groups = new Map<string, Drawn[]>();
    for (const d of ds) {
      const k = `${d.fd.side}:${d.fd.zone}`;
      groups.set(k, [...(groups.get(k) ?? []), d]);
    }
    const reps: Drawn[] = [...groups.values()].map((g) => {
      const base = g.find((d) => d.fd.rank === 0)!,
        sp = hull(g.flatMap((d) => d.sp));
      let x0 = Infinity,
        y0 = Infinity,
        x1 = -Infinity,
        y1 = -Infinity;
      for (const [x, y] of sp) {
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
      }
      return { ...base, w: g.flatMap((d) => d.w), sp, box: [x0, y0, x1, y1] };
    });
    const out: Drawn[] = [];
    for (const r of orderSet(reps, cam)) {
      const g = groups.get(`${r.fd.side}:${r.fd.zone}`)!,
        up = dot(r.n, sub(cam.eye, r.c)) >= 0;
      out.push(...[...g].sort((a, b) => (up ? a.fd.rank - b.fd.rank : b.fd.rank - a.fd.rank)));
    }
    return out;
  };

  // ---- surfaces, cached per size and pixel density
  const surface = (env: Env, name: string, w: number, h: number): Layer => {
    const key = `fold:${id}:${name}:${w}x${h}`;
    let lay = env.cache.get(key) as Layer | undefined;
    if (!lay) {
      lay = env.canvas(w, h);
      env.cache.set(key, lay);
    }
    return lay;
  };
  // the table: pale ground, lit a touch from the key's side, falling off softly to the corners (drawn once)
  const table = (env: Env): Layer => {
    const pw = Math.round(W * env.scale),
      ph = Math.round(H * env.scale),
      key = `fold:${id}:table:${pw}x${ph}`;
    let lay = env.cache.get(key) as Layer | undefined;
    if (lay) return lay;
    lay = env.canvas(pw, ph);
    const c = lay.ctx;
    c.setTransform(env.scale, 0, 0, env.scale, 0, 0);
    c.fillStyle = C.ground;
    c.fillRect(0, 0, W, H);
    const lx = D.vx + KEY[0] * 260 * u,
      ly = D.vy - 140 * u,
      g = c.createRadialGradient(lx, ly, 0, D.vx, D.vy, Math.hypot(W, H) * 0.62);
    g.addColorStop(0, css(mix(GROUND, WHITE, 0.55)));
    g.addColorStop(0.45, css(GROUND));
    g.addColorStop(1, css(mix(GROUND, MUTED, 0.3)));
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
    env.cache.set(key, lay);
    return lay;
  };
  // film grain: one seeded tile of faint specks, laid at one of eight offsets (frame mod 8, so it loops)
  const GRAIN = 256;
  const grainTile = (env: Env): Layer => {
    const key = `fold:grain`;
    let lay = env.cache.get(key) as Layer | undefined;
    if (lay) return lay;
    lay = env.canvas(GRAIN, GRAIN);
    const c = lay.ctx,
      q = rng(6262);
    for (let i = 0; i < (GRAIN * GRAIN) / 4; i++) {
      const dark = q() < 0.6;
      c.globalAlpha = dark ? 0.018 + q() * 0.03 : 0.03 + q() * 0.05;
      c.fillStyle = dark ? C.ink : C.surface;
      c.fillRect(Math.floor(q() * GRAIN), Math.floor(q() * GRAIN), 1, 1);
    }
    env.cache.set(key, lay);
    return lay;
  };
  const GRAIN_AT = (() => {
    const q = rng(6263);
    return Array.from({ length: 8 }, () => [Math.floor(q() * GRAIN), Math.floor(q() * GRAIN)] as const);
  })();

  // ---- the backdrop for one frame: table, a faint cutting-mat dot grid in perspective, and the soft shadow (cast
  // along the key onto the table, sharp and dark while the sheet lies on it, wide and pale in the air)
  const shadowLevels = (env: Env) => {
    const pw = Math.round(W * env.scale),
      ph = Math.round(H * env.scale);
    return [4, 8, 16, 32].map((k) => surface(env, `shadow${k}`, Math.ceil(pw / k), Math.ceil(ph / k)));
  };
  const backdrop = (env: Env, F: number, cam: Cam, ds: Drawn[]): Layer => {
    const pw = Math.round(W * env.scale),
      ph = Math.round(H * env.scale),
      bd = surface(env, "backdrop", pw, ph),
      c = bd.ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = 1;
    c.globalCompositeOperation = "source-over";
    c.drawImage(table(env).canvas, 0, 0);
    c.setTransform(env.scale, 0, 0, env.scale, 0, 0);
    // the dot grid: half a unit apart, fading out with distance from the sheet
    const STEP = 0.5;
    c.fillStyle = css(mix(LINE, MUTED, 0.7));
    for (let i = -9; i <= 9; i++)
      for (let j = -9; j <= 9; j++) {
        const x = i * STEP,
          y = j * STEP,
          r = Math.hypot(x, y * 1.15),
          a = 0.75 * (1 - smooth(clamp((r - 1.4) / 2.8)));
        if (a < 0.02) continue;
        const [sx, sy] = project(cam, [x, y, 0]);
        if (sx < -4 || sy < -4 || sx > W + 4 || sy > H + 4) continue;
        c.globalAlpha = a;
        c.beginPath();
        c.arc(sx, sy, 1.9 * u, 0, TAU);
        c.fill();
      }
    c.globalAlpha = 1;

    // the shadow: every facet projected along the key onto z = 0, filled into a quarter-size layer, mipped down
    const lv = shadowLevels(env);
    for (const l of lv) {
      l.ctx.setTransform(1, 0, 0, 1, 0, 0);
      l.ctx.globalAlpha = 1;
      l.ctx.clearRect(0, 0, l.canvas.width, l.canvas.height);
    }
    const s0 = lv[0]!.ctx;
    s0.setTransform(env.scale / 4, 0, 0, env.scale / 4, 0, 0);
    s0.fillStyle = C.ink;
    // (every facet's shadow goes into ONE path, all wound the same way, filled once: the union, with no
    // anti-aliased seams along the creases)
    s0.beginPath();
    for (const d of ds) {
      const q = d.w.map((p) => {
        // (a hair of lift, so even the flat sheet shows a thin contact shadow at its edge)
        const lz = p[2] + 0.025;
        return project(cam, [p[0] - (KEY[0] / KEY[2]) * lz, p[1] - (KEY[1] / KEY[2]) * lz, 0]);
      });
      addWound(s0, q);
    }
    s0.fill();
    for (let k = 1; k < lv.length; k++) {
      const dst = lv[k]!.ctx,
        src = lv[k - 1]!.canvas;
      dst.imageSmoothingEnabled = true;
      dst.imageSmoothingQuality = "high";
      // a small tent: four half-pixel offsets, so each level is a little softer than a plain halving
      dst.globalAlpha = 0.25;
      for (const [ox, oy] of [
        [-0.5, -0.5],
        [0.5, -0.5],
        [-0.5, 0.5],
        [0.5, 0.5],
      ] as const)
        dst.drawImage(src, ox, oy, lv[k]!.canvas.width, lv[k]!.canvas.height);
      dst.globalAlpha = 1;
    }
    const z = FL.height(F) / D.fl.zmax,
      slap0 = Math.exp(-((around(F, 0) / 2.2) ** 2)),
      blur = clamp(0.35 + 2.65 * Math.sqrt(z) - 0.3 * slap0, 0, 3),
      lo = Math.min(2, Math.floor(blur)),
      fr = blur - lo,
      alpha =
        (0.34 - 0.2 * z) *
        (tall ? (1 - z) ** 4 : 1) *
        (1 + 0.3 * pulse0(F) + 0.9 * slap0 + 0.25 * pulse60(F) + 0.35 * thud(F));
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.imageSmoothingEnabled = true;
    c.imageSmoothingQuality = "high";
    c.globalCompositeOperation = "multiply";
    for (const [k, a] of [
      [lo, 1 - fr],
      [lo + 1, fr],
    ] as const) {
      if (a < 0.002) continue;
      c.globalAlpha = alpha * a;
      c.drawImage(lv[k]!.canvas, 0, 0, pw, ph);
    }
    c.globalCompositeOperation = "source-over";
    c.globalAlpha = 1;
    return bd;
  };

  // ---- one sample of the scene at time F: the backdrop's device-pixel rectangle (ox, oy, w, h) drawn at the
  // context's origin, then the paper over it (a full opaque frame of that rectangle, as a motion-blur sample needs)
  const scene = (
    ctx: Ctx,
    env: Env,
    F: number,
    dt: number,
    bd: Layer,
    creaseA: number,
    ox: number,
    oy: number,
    w: number,
    h: number,
  ) => {
    const cam = camera(F + dt),
      fo0 = folds(F + dt),
      ds = order(build(F, cam, dt), cam, fo0.f1[0] === 1 && fo0.f1[1] === 1 && fo0.f2[0] === 1 && fo0.f2[1] === 1),
      fo = fo0;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.drawImage(bd.canvas, ox, oy, w, h, 0, 0, w, h);
    ctx.setTransform(env.scale, 0, 0, env.scale, -ox, -oy);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    // the sheet lies flat on the table (the half fold is open and nothing flies): the flaps cast a shadow on it
    const flat = fo.h === 0 && FL.air(F + dt) === 0;
    const path = (d: Drawn) => {
      ctx.beginPath();
      d.sp.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
    };
    const facet = (d: Drawn) => {
      // a facet seen edge-on is a sliver of shading, not paper: fade it out (its neighbours close over it)
      const vis = smooth(clamp((Math.abs(dot(d.n, norm(sub(cam.eye, d.c)))) - 0.02) / 0.14));
      if (vis < 0.01) return;
      ctx.globalAlpha = vis;
      path(d);
      ctx.fillStyle = css(d.fill);
      ctx.fill();
      if (d.band && d.band.k > 0.01) {
        const { a, b, p, k } = d.band,
          g = ctx.createLinearGradient(a[0], a[1], b[0], b[1]),
          w = 0.13;
        g.addColorStop(0, css(WHITE, 0));
        g.addColorStop(clamp(p - w), css(WHITE, 0));
        g.addColorStop(clamp(p), css(WHITE, 0.55 * k));
        g.addColorStop(clamp(p + w), css(WHITE, 0));
        g.addColorStop(1, css(WHITE, 0));
        ctx.save();
        ctx.clip();
        ctx.fillStyle = g;
        ctx.fillRect(d.box[0] - 2, d.box[1] - 2, d.box[2] - d.box[0] + 4, d.box[3] - d.box[1] + 4);
        ctx.restore();
        path(d);
      }
      // a hairline of the facet's own colour closes the antialiasing seam between neighbours
      ctx.strokeStyle = css(d.fill);
      ctx.lineWidth = 0.9 * u;
      ctx.stroke();
      // creases: a darker line that stays after the fold; deeper while the fold is closed
      const active = Math.max(fo.h / HMAX, fo.g / GMAX, Math.sin(Math.PI * fo.f1[0]), Math.sin(Math.PI * fo.f2[0]));
      ctx.strokeStyle = css(mix(d.fill, INK, 0.5), creaseA * (0.3 + 0.25 * clamp(active)));
      ctx.lineWidth = 1.15 * u;
      for (const e of d.fd.creases) {
        const a = d.sp[e]!,
          b = d.sp[(e + 1) % d.sp.length]!;
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };
    if (flat) {
      // (what lies on the table goes down first, then the shadows of what is lifting, then the rest in order)
      const onTable = (d: Drawn) => d.w.every((p) => Math.abs(p[2]) < 5e-4),
        base = ds.filter(onTable),
        flaps = ds.filter((d) => !onTable(d)),
        fm = Math.max(...fo.f1.map((f) => Math.sin(Math.PI * f)), ...fo.f2.map((f) => Math.sin(Math.PI * f)));
      base.forEach(facet);
      if (fm > 0.001) {
        ctx.save();
        ctx.beginPath();
        for (const d of base) d.sp.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.clip();
        ctx.fillStyle = css(INK, 0.1 * fm ** 0.5);
        ctx.beginPath();
        for (const d of flaps)
          addWound(
            ctx,
            d.w.map((p) => project(cam, [p[0] - (KEY[0] / KEY[2]) * p[2], p[1] - (KEY[1] / KEY[2]) * p[2], 0])),
          );
        ctx.fill();
        ctx.restore();
      }
      flaps.forEach(facet);
    } else ds.forEach(facet);
  };

  // the fastest vertex on screen, in px per frame (decides the blur samples and fades the crease lines)
  const speed = (F: number) => {
    const a = camera(F - 0.25),
      b = camera(F + 0.25),
      da = build(F - 0.25, a),
      db = build(F + 0.25, b);
    let v = 0;
    da.forEach((d, i) =>
      d.sp.forEach(([x, y], k) => {
        const [x2, y2] = db[i]!.sp[k]!;
        v = Math.max(v, Math.hypot(x2 - x, y2 - y) * 2);
      }),
    );
    return v;
  };

  const paint = (ctx: Ctx, env: Env, F: number) => {
    F = wrap(F);
    const cam = camera(F),
      bd = backdrop(env, F, cam, build(F, cam)),
      v = speed(F),
      // (the shutter opens continuously with speed, so the blur never switches on, with enough samples that a fast
      // edge never steps into copies; the apex stays crisp with a much shorter shutter round the downbeat)
      shutter = 0.5 * smooth(clamp((v - 0.8) / 5)) * (1 - 0.75 * Math.exp(-((around(F, T.hit) / 4) ** 2))),
      samples = v < 0.8 ? 1 : 11,
      // creases fade a little only while the paper flies fast (from the fastest speed over ±4 frames, so they never
      // flicker); on the table they never fade, so a crease that stays really stays
      onTable = folds(F).h === 0 && FL.air(F) === 0,
      vLow = Math.max(...[-4, -2, 0, 2, 4].map((k) => speed(F + k))),
      creaseA = onTable ? 1 : 1 / (1 + Math.max(0, vLow - 2) / 6);
    const pw = Math.round(W * env.scale),
      ph = Math.round(H * env.scale);
    if (samples <= 1 || shutter <= 0) scene(ctx, env, F, 0, bd, creaseA, 0, 0, pw, ph);
    else {
      // motion blur by subframes, as kit/blur.ts does it (fixed instants, a running average, so it is
      // deterministic), but only over the rectangle the paper sweeps inside the shutter: the backdrop is static
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(bd.canvas, 0, 0);
      let x0 = Infinity,
        y0 = Infinity,
        x1 = -Infinity,
        y1 = -Infinity;
      for (const dt of [-shutter / 2, 0, shutter / 2])
        for (const d of build(F, camera(F + dt), dt))
          for (const [x, y] of d.sp) {
            x0 = Math.min(x0, x);
            y0 = Math.min(y0, y);
            x1 = Math.max(x1, x);
            y1 = Math.max(y1, y);
          }
      const pad = 6,
        rx = clamp(Math.floor(x0 * env.scale) - pad, 0, pw),
        ry = clamp(Math.floor(y0 * env.scale) - pad, 0, ph),
        rw = clamp(Math.ceil(x1 * env.scale) + pad, 0, pw) - rx,
        rh = clamp(Math.ceil(y1 * env.scale) + pad, 0, ph) - ry;
      if (rw > 0 && rh > 0) {
        const acc = surface(env, "blurAcc", pw, ph),
          one = surface(env, "blurOne", pw, ph);
        acc.ctx.setTransform(1, 0, 0, 1, 0, 0);
        acc.ctx.globalAlpha = 1;
        acc.ctx.clearRect(0, 0, rw, rh);
        for (let i = 0; i < samples; i++) {
          one.ctx.setTransform(1, 0, 0, 1, 0, 0);
          one.ctx.globalAlpha = 1;
          one.ctx.globalCompositeOperation = "source-over";
          one.ctx.clearRect(0, 0, rw, rh);
          scene(one.ctx, env, F, (i / (samples - 1) - 0.5) * shutter, bd, creaseA, rx, ry, rw, rh);
          acc.ctx.globalAlpha = 1 / (i + 1);
          acc.ctx.drawImage(one.canvas, 0, 0, rw, rh, 0, 0, rw, rh);
        }
        // keep the average only where the paper swept (8-bit averaging drifts a level or two, which would show as
        // a box on the table): mask it to every sample's facets, filled and widened, so the table stays exact
        const mask = surface(env, "blurMask", pw, ph),
          mc = mask.ctx;
        mc.setTransform(1, 0, 0, 1, 0, 0);
        mc.globalAlpha = 1;
        mc.globalCompositeOperation = "source-over";
        mc.clearRect(0, 0, rw, rh);
        mc.setTransform(env.scale, 0, 0, env.scale, -rx, -ry);
        mc.fillStyle = mc.strokeStyle = "#fff";
        mc.lineWidth = 6 / env.scale;
        mc.lineJoin = "round";
        mc.beginPath();
        for (let i = 0; i < samples; i++) {
          const dt = (i / (samples - 1) - 0.5) * shutter;
          for (const d of build(F, camera(F + dt), dt)) addWound(mc, d.sp);
        }
        mc.fill();
        mc.stroke();
        acc.ctx.globalAlpha = 1;
        acc.ctx.globalCompositeOperation = "destination-in";
        acc.ctx.drawImage(mask.canvas, 0, 0, rw, rh, 0, 0, rw, rh);
        acc.ctx.globalCompositeOperation = "source-over";
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 1;
        ctx.drawImage(acc.canvas, 0, 0, rw, rh, rx, ry, rw, rh);
      }
    }
    // grain, screen-locked
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    const tile = grainTile(env),
      [gx, gy] = GRAIN_AT[Math.floor(F) % 8]!;
    for (let y = -gy; y < ph; y += GRAIN) for (let x = -gx; x < pw; x += GRAIN) ctx.drawImage(tile.canvas, x, y);
  };

  const cuts = [0, 90, 150, N],
    names = ["fold", "glide", "unfold"];
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

// ---- pulses (picture), each a function of the wrapped distance to its beat
// the impact on the downbeat: a two-frame rise and a soft decay, windowed to exactly 0 long before the wrap
const punch = (F: number) => {
  F = wrap(F);
  const d = (F - (T.hit - 1.5)) / FPS;
  return d > 0 ? (1 - Math.exp(-d * 30)) * Math.exp(-d * 3.2) * (1 - ease.inOutCubic(prog(F, 170, 222))) : 0;
};
// a hit envelope: two frames up into its beat, a quick decay, windowed to exactly 0 (it wraps the seam)
// the loop point
const kick = (F: number, at: number, decay: number, rise = 2) => {
  const d = around(F, at);
  if (d < -rise) return 0;
  return d <= 0 ? smooth((d + rise) / rise) : Math.exp(-d / decay) * (1 - smooth(prog(d, 3 * decay, 5 * decay)));
};
const pulse0 = (F: number) => kick(F, 0, 4, 2);
// the pre-pulse on beat 3, as the half fold swings up through its mark (zoom only; the shadow uses it too)
const pulse60 = (F: number) => kick(F, T.half, 4, 1);
// the touchdown on 165 and the sheet slapping open on 208
const thud = (F: number) => Math.exp(-((around(F, T.land) / 8) ** 2)) * 0.6 + Math.exp(-((around(F, T.open) / 6) ** 2));

// ---- sound: the soft beat score as a quiet bed (key 10, G minor; its tails wrap), a held pad that crosses the bar
// lines, crisp paper ticks on every fold landing, a rustle while the paper moves, a whoosh that follows the flight,
// a warm hit on the downbeat and a slap and a low thump on sample 0. Every pitched partial makes a whole number of
// cycles in the loop, and the mix is normalised to −16 LUFS.
const BASE_GAIN = 0.24,
  TARGET = -16;
const mhz = (m: number) => 440 * 2 ** ((m - 69) / 12);
function score(sr: number): [Float32Array, Float32Array] {
  const [Lc, Rc] = beatScore({ frames: N, fps: FPS, bpm: BPM, mood: "soft", key: 10, loop: true, gain: BASE_GAIN })(sr);
  const n = Lc.length,
    secs = n / sr,
    at = (f: number) => Math.round((f / FPS) * sr),
    whole = (hz: number) => Math.round(hz * secs) / secs,
    noise = rng(6201);
  const add = (i: number, v: number, pan: number) => {
    i = ((i % n) + n) % n;
    Lc[i] = Lc[i]! + v * (1 - pan) * 2;
    Rc[i] = Rc[i]! + v * pan * 2;
  };
  // the bed ducks under the hit and breathes back in, back to 1 long before the wrap
  for (let i = at(T.hit); i < n; i++) {
    const d = 1 - 0.6 * Math.exp(-(i - at(T.hit)) / (0.22 * sr));
    Lc[i] = Lc[i]! * d;
    Rc[i] = Rc[i]! * d;
  }
  // and dips by a quarter for a moment round every paper tick, so the cracks cut through
  for (const f of [0, T.f1 - 0.5, T.f1, T.f2 - 0.5, T.f2, T.half, T.wings, T.land, T.open, T.open2]) {
    const c = at(f) + Math.round(0.015 * sr),
      half = Math.round(0.04 * sr);
    for (let k = -half; k <= half; k++) {
      const i = (((c + k) % n) + n) % n,
        d = 1 - 0.25 * (0.5 + 0.5 * Math.cos((Math.PI * k) / half));
      Lc[i] = Lc[i]! * d;
      Rc[i] = Rc[i]! * d;
    }
  }

  // the pad: G minor (G Bb D) in bar 1, Eb major (Eb G Bb) in bar 2, soft and low, crossfaded over each bar line
  // with a raised cosine (the wrap is a bar line too), so the bed's release-and-attack holes are filled
  const CH = [
    [55, 58, 62],
    [51, 55, 58],
  ];
  const bar = n / 2,
    xf = 0.3 * sr;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    // weight of bar 2's chord: 0 in bar 1, 1 in bar 2, raised-cosine ramps centred on each bar line
    const d1 = i - bar,
      d0 = i < bar ? i : i - n,
      w2 =
        Math.abs(d1) < xf / 2
          ? smooth((d1 + xf / 2) / xf)
          : Math.abs(d0) < xf / 2
            ? 1 - smooth((d0 + xf / 2) / xf)
            : i > bar
              ? 1
              : 0;
    let v = 0;
    CH.forEach((ch, c) => {
      const wc = c ? w2 : 1 - w2;
      if (wc <= 0) return;
      for (const m of ch) {
        const f = whole(mhz(m));
        v += wc * (Math.sin(TAU * f * t) + 0.22 * Math.sin(TAU * 2 * f * t) + 0.08 * Math.sin(TAU * 3 * f * t));
      }
    });
    const breath = 0.85 + 0.15 * Math.cos((TAU * 2 * t) / secs);
    add(i, v * 0.015 * breath, 0.5 + 0.08 * Math.sin((TAU * t) / secs));
  }

  // a paper tick: a few milliseconds of band-passed noise (a crisp crack) over a short low "thup" of the sheet
  const tick = (i0: number, vel: number, pan: number, seed: number, body = 1, bright = 1) => {
    const q = rng(seed),
      hiK = 1 - Math.exp((-TAU * 9000 * bright) / sr),
      loK = 1 - Math.exp((-TAU * 1900) / sr);
    let a = 0,
      b = 0,
      ph = 0;
    for (let k = 0, len = Math.round(0.12 * sr); k < len; k++) {
      const t = k / sr;
      a += hiK * (q() * 2 - 1 - a);
      b += loK * (a - b);
      ph += (95 + 140 * Math.exp(-t / 0.012)) / sr;
      const crack = (a - b) * (Math.exp(-t / 0.006) + 0.35 * Math.exp(-t / 0.02)) * Math.min(1, t / 0.0004) * 3,
        thup = Math.sin(TAU * ph) * Math.exp(-t / 0.03) * Math.min(1, t / 0.0015) * 0.5 * body;
      add(i0 + k, (crack + thup) * vel, pan);
    }
  };
  // both nose folds (the left flap half a frame first), the second flaps opening, the half (the pre-pulse, a little
  // fuller), the wings
  tick(at(T.f1 - 0.5), 0.28, 0.38, 11, 0.8);
  tick(at(T.f1), 0.3, 0.62, 12, 0.8);
  tick(at(T.f2 - 0.5), 0.28, 0.4, 21, 0.9);
  tick(at(T.f2), 0.3, 0.6, 22, 0.9);
  tick(at(T.open2), 0.18, 0.5, 23, 0.8, 1.1);
  tick(at(T.half), 0.3, 0.5, 13, 1.6, 0.9);
  tick(at(T.wings), 0.26, 0.35, 14, 0.7, 1.1);
  tick(at(T.wings) + Math.round(0.009 * sr), 0.2, 0.65, 15, 0.7, 1.1);
  // the touchdown (fuller, a little darker) and the sheet slapping open
  tick(at(T.land), 0.26, 0.6, 16, 1.6, 0.8);
  tick(at(T.open), 0.3, 0.45, 17, 1.3, 0.95);
  // the pre-pulse also gets a small plucked D, the fifth, so beat 3 sets up the downbeat
  for (let k = 0, len = Math.round(0.6 * sr); k < len; k++) {
    const t = k / sr,
      f = mhz(74),
      s = (Math.sin(TAU * f * t) + 0.3 * Math.sin(TAU * 2 * f * t) * Math.exp(-t * 12)) * Math.exp(-t * 6);
    add(at(T.half) + k, s * Math.min(1, t / 0.002) * 0.055, 0.56);
  }

  // the rustle: soft band-passed noise that follows how fast the paper is folding (sampled from the pose itself)
  const foldRate = (F: number) => {
    const a = folds(F - 0.5),
      b = folds(F + 0.5);
    return (
      Math.abs(b.f1[0] - a.f1[0]) * 3 +
      Math.abs(b.f2[0] - a.f2[0]) * 3 +
      Math.abs(b.h - a.h) * 1.4 +
      Math.abs(b.g - a.g) * 1.4
    );
  };
  {
    const hiK = 1 - Math.exp((-TAU * 5200) / sr),
      loK = 1 - Math.exp((-TAU * 1300) / sr);
    let a = 0,
      b = 0;
    // run twice so the filters' state at the end meets the start
    for (let pass = 0; pass < 2; pass++)
      for (let i = 0; i < n; i++) {
        a += hiK * (noise() * 2 - 1 - a);
        b += loK * (a - b);
        if (pass === 0) continue;
        const F = (i / sr) * FPS,
          e = Math.min(1, foldRate(F) * 4) * 0.05;
        if (e > 1e-5) add(i, (a - b) * e, 0.5 + 0.15 * Math.sin(F / 9));
      }
  }

  // the whoosh: noise through a resonant band that rises and falls with the plane's speed, panned with its place
  {
    let lp = 0,
      bp = 0;
    const avg = SQUARE_FLIGHT.len / (STOP - T.lift);
    for (let i = at(T.lift); i < at(STOP); i++) {
      const F = (i / sr) * FPS,
        air = SQ.air(F),
        sp = SQ.speed(F) / avg,
        fc = 380 + 1500 * sp * air,
        k = 2 * Math.sin((Math.PI * fc) / sr),
        x = noise() * 2 - 1;
      // a state-variable band-pass (q about 1.4)
      const hp = x - lp - 0.7 * bp;
      bp += k * hp;
      lp += k * bp;
      const [gx] = SQ.pos(F);
      add(i, bp * 0.3 * air ** 1.3 * (0.5 + 0.5 * sp), clamp(0.5 + gx * 0.35, 0.1, 0.9));
    }
  }

  // the hit on 120: a warm, round body (a sine falling from about 130 to 55 Hz), a soft Eb-major bloom and a breath
  // of air, so it reads on a phone speaker and stands well above the bed
  const h0 = at(T.hit);
  {
    let ph = 0;
    for (let k = 0, len = Math.round(1.1 * sr); k < len; k++) {
      const t = k / sr;
      ph += (55 + 75 * Math.exp(-t / 0.05)) / sr;
      const s = (Math.sin(TAU * ph) + 0.25 * Math.sin(2 * TAU * ph) * Math.exp(-t / 0.08)) * Math.exp(-t / 0.28);
      add(h0 + k, s * Math.min(1, t / 0.003) * 0.42, 0.5);
    }
    [63, 67, 70, 75, 79].forEach((m, j) => {
      const f = mhz(m),
        pan = 0.25 + 0.125 * j,
        vel = 0.075 / (1 + j * 0.3);
      for (let k = 0, len = Math.round(1.8 * sr); k < len; k++) {
        const t = k / sr,
          s =
            (Math.sin(TAU * f * t) + 0.18 * Math.sin(TAU * 2 * f * t) * Math.exp(-t * 5)) *
            Math.exp(-t * (1.5 + j * 0.35)) *
            Math.min(1, t / 0.006);
        add(h0 + k, s * vel, pan);
      }
    });
    let al = 0,
      pl = 0;
    const hk = 1 - Math.exp((-TAU * 3000) / sr);
    for (let k = 0, len = Math.round(0.5 * sr); k < len; k++) {
      al += hk * (noise() * 2 - 1 - al);
      const e = Math.exp(-k / (0.09 * sr)) * Math.min(1, k / (0.002 * sr)) * 0.5;
      add(h0 + k, (al - pl) * e, 0.5);
      pl = al;
    }
  }

  // the loop point: the flaps falling (a short breath of air rising into the seam, written at negative indices so
  // it wraps onto the end of the buffer), then the slap and a low soft thump on sample 0
  {
    const sw = Math.round(0.4 * sr),
      hk = 1 - Math.exp((-TAU * 4200) / sr),
      lk = 1 - Math.exp((-TAU * 900) / sr);
    let a = 0,
      b = 0;
    for (let k = -sw; k < 0; k++) {
      a += hk * (noise() * 2 - 1 - a);
      b += lk * (a - b);
      add(k, (a - b) * (1 + k / sw) ** 2 * 0.22, 0.5);
    }
  }
  // and a soft G-minor swell that breathes in over the last 0.6 s and blooms out of sample 0, so the bed's
  // release at the wrap leaves no hole
  [67, 70, 74].forEach((m, j) => {
    const f = whole(mhz(m)),
      pan = 0.3 + 0.2 * j;
    for (let k = -Math.round(0.6 * sr); k < Math.round(0.6 * sr); k++) {
      const t = k / sr,
        e = t < 0 ? smooth(1 + t / 0.6) : Math.exp(-t / 0.22),
        v = Math.sin(TAU * f * t) + 0.25 * Math.sin(TAU * 2 * f * t);
      add(k, v * e * 0.05, pan);
    }
  });
  tick(0, 0.2, 0.42, 18, 1.5);
  tick(Math.round(0.004 * sr), 0.17, 0.58, 19, 1.5);
  {
    let ph = 0;
    for (let k = 0, len = Math.round(0.5 * sr); k < len; k++) {
      const t = k / sr;
      ph += (50 + 45 * Math.exp(-t / 0.035)) / sr;
      add(k, Math.sin(TAU * ph) * Math.exp(-t / 0.13) * Math.min(1, t / 0.002) * 0.26, 0.5);
    }
  }

  // one gentle saturation over the sum, then the level set to the target loudness (still deterministic)
  let peak = 1e-9;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(Lc[i]!), Math.abs(Rc[i]!));
  const g = 1.2 / peak;
  for (let i = 0; i < n; i++) {
    Lc[i] = Math.tanh(Lc[i]! * g) / Math.tanh(1.2);
    Rc[i] = Math.tanh(Rc[i]! * g) / Math.tanh(1.2);
  }
  const k = Math.min(0.98, 10 ** ((TARGET - lufs(Lc, Rc, sr)) / 20));
  for (let i = 0; i < n; i++) {
    Lc[i] = Lc[i]! * k;
    Rc[i] = Rc[i]! * k;
  }
  return [Lc, Rc];
}

export const fold = make("square", "fold");
export const foldVertical = make("vertical", "foldVertical");
