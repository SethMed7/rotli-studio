// STUDY 34 · BAUHAUS BEAT (24 s, 30 fps, 120 bpm, seamless 12-bar loop). A pure music visual in the Bauhaus
// manner: flat primary geometry on cream paper where the shapes PLAY the score. One blue circle, one red square,
// one yellow triangle, black bars, arcs, a quarter-disc and thin rules, on a module grid (square 6 × 6,
// landscape 10 × 6). No product and no words but the title. Brand: the neutral pack (palette "bauhaus").
// Brief: series/studies/briefs/bauhaus-beat.json · prompt: series/studies/prompts/bauhaus-beat.prompt.md
//
// Picture and sound read the SAME numbers: one beat is 15 frames, a bar 60, a sixteenth 3.75, and the chords,
// bass notes, hats and arpeggio below are the formulas kit/score.ts plays (never audio analysis):
//   kick  (every beat)         → the circle pulses 1 + 0.08·exp(−t/4)
//   bass  (beats 1 and 3)      → the triangle steps half a module, landing on the note in 3 frames (beat 1's
//                                step follows its glide, which ends a step short at frame 57)
//   chord (every bar, 4-cycle) → the quarter-disc turns 90° about its pivot
//   hats  (off-sixteenths)     → one of eight short bars jumps and decays
//   arp   (sixteenths)         → sixteen dots at the notes' pitches, the current one red
//   hits  (0, 180, 360, 540)   → the square turns 90° with a hard ease-out
// Every bar the whole composition glides to the next of six authored layouts in its last 6 frames and lands on
// the downbeat; bars 7–12 play them mirrored; bar 12 glides into layout A, so frame 720 is frame 0.
import PACK from "../../../brand/packs/studio/pack.json";
import { rng, type Ctx, type Env, type Layer } from "../core";
import type { Film, Shot } from "../film";
import { ease, lerp, prog } from "../kit/motion";
import { usePack } from "../kit/pack";
import { beatScore } from "../kit/score";
import { layout, type Size } from "../kit/sizes";
import { measure, text } from "../kit/type";

const P = usePack(PACK),
  C = P.palette("bauhaus"),
  F_ = P.face;
const FPS = 30,
  BPM = 120,
  N = 720,
  BEAT = (60 / BPM) * FPS, // 15 frames
  BAR = BEAT * 4, // 60 frames
  SIX = BAR / 16, // 3.75 frames
  GLIDE = 6; // the recomposition: the last 6 frames of every bar
const HITS = [0, 180, 360, 540];
const TITLE = "three shapes";
const DEG = Math.PI / 180;

// ---- the score's own numbers (kit/score.ts): Am F C G, the arpeggio's chord-tone pattern, octave on step 7
const CHORDS = [
  [57, 60, 64],
  [53, 57, 60],
  [48, 52, 55],
  [55, 59, 62],
];
const ARP = [0, 1, 2, 1, 0, 2, 1, 2];
const arpPitch = (bar: number, s: number) => CHORDS[bar % 4]![ARP[s % 8]!]! + 12 + (s % 8 === 7 ? 12 : 0);
const P_LO = 60,
  P_HI = 88; // the lowest and highest arpeggio notes across the four chords

// ---- a layout, in modules. Bars [x, y, len, thick, deg]; arc [x, y, r, thick, a0, sweep]; rules [x, y, len, deg];
// triangle [x, y, size, deg, dx, dy] (dx, dy = its path; one bass step is half a module along it); orb = degrees
// the square drifts round the circle over the bar (and then the triangle's path is the circle's edge too).
type Lay = {
  c: [number, number, number];
  s: [number, number, number, number];
  t: [number, number, number, number, number, number];
  b1: [number, number, number, number, number];
  b2: [number, number, number, number, number];
  a: [number, number, number, number, number, number];
  r1: [number, number, number, number];
  r2: [number, number, number, number];
  orb: number;
};
type Grid = { G: number; pivot: [number, number]; R: number; lays: Lay[] };

// SQUARE, 6 × 6. The quarter-disc pivots on (5, 1); bars 1–6 turn it clockwise from "down-left".
const SQUARE: Grid = {
  G: 6,
  pivot: [5, 1],
  R: 2,
  lays: [
    // A · the title rides the long bar; the circle high left, the triangle walks the bottom row
    {
      c: [1.5, 1.5, 1.1],
      s: [3.5, 5.5, 1, 0],
      t: [1, 5.45, 0.62, 0, 1, 0],
      b1: [2.25, 4, 4.5, 0.3, 0],
      b2: [5.5, 3, 6, 0.3, 90],
      a: [1.5, 1.5, 1.45, 0.12, 0, 90],
      r1: [2.5, 5.1, 1.8, 90],
      r2: [4.5, 1.5, 3, -45],
      orb: 0,
    },
    // B · the circle drops low and large under a raking bar
    {
      c: [2, 4, 1.5],
      s: [4.5, 3.5, 1, 0],
      t: [5, 5.45, 0.62, 0, -1, 0],
      b1: [3, 1.5, 6.4, 0.3, -18],
      b2: [0.5, 1, 2, 0.3, 90],
      a: [2, 4, 1.85, 0.12, 180, 120],
      r1: [3, 2.5, 6, 0],
      r2: [4, 4.5, 3, 90],
      orb: 0,
    },
    // C · a big square, a small circle, the triangle turned over
    {
      c: [4, 4, 1],
      s: [1, 2, 2, 0],
      t: [3.5, 1.2, 0.75, 180, 1, 0],
      b1: [3, 5.5, 6, 0.3, 0],
      b2: [2.5, 3, 6, 0.3, 90],
      a: [4, 4, 1.4, 0.12, -30, 170], // opens away from where the bar-9 disc lands when mirrored
      r1: [4.5, 2.5, 3, 0],
      r2: [1, 4.5, 2.2, 45],
      orb: 0,
    },
    // D · the square takes the centre on the diagonal (the hit at bar 4 turns it)
    {
      c: [1, 1, 0.75],
      s: [3, 3, 2, 0],
      t: [5.2, 4.6, 0.62, 0, -1, 0],
      b1: [3, 3, 7.4, 0.35, -45],
      b2: [4, 5.5, 4, 0.3, 0],
      a: [1, 1, 1.1, 0.12, 0, 180],
      r1: [4.5, 3, 6, 90],
      r2: [3, 1, 6, 0],
      orb: 0,
    },
    // E · the circle fills a third of the frame; the square and triangle orbit its edge
    {
      c: [2.5, 3.5, 1.9],
      s: [4.5, 2, 0.8, 0],
      t: [1, 1.5, 0.55, 0, 0, 0],
      b1: [5.5, 3, 6, 0.3, 90],
      b2: [4.5, 5.5, 3, 0.3, 0],
      a: [2.5, 3.5, 2.35, 0.12, 100, 110],
      r1: [3, 0.25, 6, 0],
      r2: [0.25, 3, 6, 90],
      orb: 30,
    },
    // F · a horizon bar; the circle sinks right, the triangle climbs toward the square
    {
      c: [4.5, 4.5, 1],
      s: [1.5, 1.5, 1, 0],
      t: [1.5, 4.6, 0.8, 0, 0, -1],
      b1: [3, 3, 6, 0.3, 0],
      b2: [3, 4.5, 3, 0.3, 90],
      a: [4.5, 4.5, 1.35, 0.12, 180, 90],
      r1: [2.5, 1.5, 3, 45],
      r2: [5.5, 4.5, 3, 90],
      orb: 0,
    },
  ],
};

// LANDSCAPE, 10 × 6. The quarter-disc anchors the right edge on (8, 3), so it sweeps out to the edge but never
// into the left margin (where the small title lives) when mirrored; circle and square sit apart on the long
// axis and the triangle walks the long horizontal paths.
const WIDE: Grid = {
  G: 10,
  pivot: [8, 3],
  R: 2,
  lays: [
    {
      c: [1.5, 1.6, 1.1],
      s: [4.5, 1.5, 1, 0],
      t: [1, 5.45, 0.62, 0, 1, 0],
      b1: [2.75, 4, 5.5, 0.3, 0],
      b2: [6.5, 3, 6, 0.3, 90],
      a: [1.5, 1.6, 1.45, 0.12, -100, 125],
      r1: [5, 5, 10, 0],
      r2: [8, 1, 2, 90],
      orb: 0,
    },
    {
      c: [2.5, 3.5, 1.5],
      s: [7.5, 4.5, 1, 0],
      t: [5.5, 5.45, 0.62, 0, 1, 0],
      b1: [5, 1.5, 8.4, 0.3, -12],
      b2: [0.5, 3, 4, 0.3, 90],
      a: [2.5, 3.5, 1.9, 0.12, 180, 110],
      r1: [5.5, 3, 4, 0],
      r2: [9.5, 4.5, 3, 90],
      orb: 0,
    },
    {
      c: [4.85, 3.9, 1], // clear of the bar-3 disc and (mirrored) the bar-9 disc
      s: [2, 2, 2, 0],
      t: [4.5, 1.2, 0.75, 180, 1, 0],
      b1: [5, 5.5, 10, 0.3, 0],
      b2: [3.5, 3, 6, 0.3, 90],
      a: [4.85, 3.9, 1.3, 0.12, 25, 115],
      r1: [6.5, 1.5, 3, 0],
      r2: [1, 4.5, 2.2, 45],
      orb: 0,
    },
    {
      c: [1.5, 1.5, 0.8],
      s: [5, 3, 2, 0],
      t: [6.5, 5.2, 0.7, 0, 1, 0],
      b1: [5, 3, 8.6, 0.35, -30],
      b2: [2.5, 5.5, 5, 0.3, 0],
      a: [1.5, 1.5, 1.15, 0.12, 0, 180],
      r1: [7.5, 3, 6, 90],
      r2: [5, 1, 10, 0],
      orb: 0,
    },
    {
      c: [4, 3, 1.9],
      s: [6, 1.5, 0.8, 0],
      t: [2, 4.5, 0.55, 0, 0, 0],
      b1: [8.5, 3, 6, 0.3, 90],
      b2: [5, 5.5, 4, 0.3, 0],
      a: [4, 3, 2.35, 0.12, 195, 115],
      r1: [5, 0.25, 10, 0],
      r2: [0.5, 3, 6, 90],
      orb: 30,
    },
    {
      c: [7.5, 4.5, 1],
      s: [2.5, 1.5, 1, 0],
      t: [1.5, 4.6, 0.8, 0, 1, 0],
      b1: [5, 3, 10, 0.3, 0],
      b2: [5, 4.5, 3, 0.3, 90],
      a: [7.5, 4.5, 1.35, 0.12, 180, 90],
      r1: [3.5, 2, 3, 45],
      r2: [9.5, 4.5, 3, 90],
      orb: 0,
    },
  ],
};

// mirror a layout left to right across the grid's vertical centre line (text is never mirrored)
const mirror = (l: Lay, G: number): Lay => ({
  c: [G - l.c[0], l.c[1], l.c[2]],
  s: [G - l.s[0], l.s[1], l.s[2], -l.s[3]],
  t: [G - l.t[0], l.t[1], l.t[2], -l.t[3], -l.t[4], l.t[5]],
  b1: [G - l.b1[0], l.b1[1], l.b1[2], l.b1[3], -l.b1[4]],
  b2: [G - l.b2[0], l.b2[1], l.b2[2], l.b2[3], -l.b2[4]],
  a: [G - l.a[0], l.a[1], l.a[2], l.a[3], 180 - l.a[4] - l.a[5], l.a[5]],
  r1: [G - l.r1[0], l.r1[1], l.r1[2], -l.r1[3]],
  r2: [G - l.r2[0], l.r2[1], l.r2[2], -l.r2[3]],
  orb: -l.orb,
});

// the concrete picture of one bar at one moment, flattened so a glide is one lerp over numbers
type Pose = {
  c: number[];
  s: number[];
  t: number[];
  b1: number[];
  b2: number[];
  a: number[];
  r1: number[];
  r2: number[];
  d: number[]; // quarter-disc: pivot x, y, radius, start angle (deg)
  ti: number[]; // title: x, y (px), size (px), angle (deg)
};
const KEYS = ["c", "s", "t", "b1", "b2", "a", "r1", "r2", "d", "ti"] as const;
const mix = (p: Pose, q: Pose, k: number): Pose => {
  const o = {} as Pose;
  for (const key of KEYS) o[key] = p[key].map((v, i) => lerp(v, q[key][i]!, k));
  return o;
};
// an angle glides to its nearest equivalent under the shape's symmetry (a bar looks the same turned 180°, the
// triangle 120°, the square 90°, the disc and arc only 360°), so nothing spins the long way across the mirror line
const turnTo = (from: number, to: number, per = 360) => from + ((((to - from) % per) + per * 1.5) % per) - per / 2;
// the angles in a Pose, with their symmetry: they glide without overshoot, so bars land level on the downbeat
const ANGLES: [keyof Pose, number, number][] = [
  ["s", 3, 90],
  ["t", 3, 120],
  ["b1", 4, 180],
  ["b2", 4, 180],
  ["a", 4, 360],
  ["r1", 3, 180],
  ["r2", 3, 180],
  ["d", 3, 360],
];

export function make(size: Size, id: string): Film {
  const L = layout(size),
    { W, H, u } = L;
  const GR = L.wide ? WIDE : SQUARE,
    m = 140 * u, // one module
    ox = (W - GR.G * m) / 2,
    oy = 60 * u,
    X = (x: number) => ox + x * m,
    Y = (y: number) => oy + y * m;
  // the ground band under the grid: a rule, the arpeggio dots and the hats row
  const band = {
    rule: oy + 6 * m + 18 * u,
    x0: L.wide ? ox : 470 * u,
    x1: ox + GR.G * m,
    dotLo: 988 * u,
    dotHi: 942 * u,
    hatBase: 1062 * u, // the hats use the paper under the dots, so their flick reads at phone size
  };
  const small = 44 * u; // the brief says "small"; 44 px keeps the title readable on a phone
  const T_SIZE = { w100: 0 }; // the title's width at 100 px (measured once, on the first frame)

  // ---- per bar: which layout, mirrored or not, and the disc's chord angle
  const layOf = (bar: number): Lay => {
    const b = ((bar % 12) + 12) % 12,
      l = GR.lays[b % 6]!;
    return b < 6 ? l : mirror(l, GR.G);
  };
  const discOf = (bar: number) => {
    const b = ((bar % 12) + 12) % 12,
      a = 90 + 90 * (b % 4); // the chord sets it: 0°, 90°, 180°, 270° past its start
    return b < 6 ? { x: GR.pivot[0], a } : { x: GR.G - GR.pivot[0], a: 90 - a }; // mirrored: the quadrant [a, a+90] becomes [90−a, 180−a]
  };
  // the title: large in bars 1 and 7 from the downbeat (the hit) to beat 4, small in the margin the rest of the
  // loop; it snaps between the two on those beats and never glides
  const titleOf = (ctx: Ctx, bar: number, f: number): number[] => {
    const b = ((bar % 12) + 12) % 12;
    if (!T_SIZE.w100) T_SIZE.w100 = measure(ctx, TITLE, { size: 100, family: F_.sans, weight: 800, track: -0.03 });
    const l = layOf(b);
    const large = f < 3 * BEAT;
    if (large && b === 0) {
      // along the long horizontal bar, sitting on it
      const sz = ((l.b1[2] - 0.15) * m * 100) / T_SIZE.w100;
      return [X(l.b1[0] - l.b1[2] / 2), Y(l.b1[1] - l.b1[3] / 2) - 0.26 * sz, sz, 0];
    }
    if (large && b === 6) {
      // reading upward along the vertical bar, on its inner side
      const sz = ((L.wide ? 5.4 : 4.3) * m * 100) / T_SIZE.w100;
      return [X(l.b2[0] + l.b2[3] / 2) + 0.86 * sz, Y(5.9), sz, -90];
    }
    return L.wide ? [200 * u, Y(6), small, -90] : [ox, 1008 * u, small, 0];
  };

  // the pose of bar `bar` at local frame f (0..60): the layout plus the in-bar moves (the triangle's bass step
  // on beat 3, the orbit drift in E). The kick pulse and the square's turns are added at draw time.
  const poseAt = (ctx: Ctx, bar: number, f: number, back = 0): Pose => {
    const l = layOf(bar),
      d = discOf(bar);
    // beat 3's bass note: the triangle steps half a module, landing on frame 30 from frame 27 (`back` = −1 is the
    // spot one step short of the layout, where the glide leaves it for beat 1's step)
    const step = ease.inOutCubic(prog(f, 2 * BEAT - 3, 2 * BEAT)) + back;
    let [tx, ty] = [l.t[0] + l.t[4] * 0.5 * step, l.t[1] + l.t[5] * 0.5 * step];
    let [sx, sy] = [l.s[0], l.s[1]];
    if (l.orb) {
      const [cx, cy] = l.c,
        drift = l.orb * DEG * prog(f, 0, BAR - GLIDE),
        dist = Math.hypot(tx - cx, ty - cy),
        tStep = -Math.sign(l.orb) * (0.5 / dist) * step, // half a module of arc along the edge
        rot = (x: number, y: number, a: number): [number, number] => [
          cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a),
          cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a),
        ];
      [sx, sy] = rot(sx, sy, drift);
      [tx, ty] = rot(tx, ty, tStep);
    }
    return {
      c: [...l.c],
      s: [sx, sy, l.s[2], l.s[3]],
      t: [tx, ty, l.t[2], l.t[3]],
      b1: [...l.b1],
      b2: [...l.b2],
      a: [...l.a],
      r1: [...l.r1],
      r2: [...l.r2],
      d: [d.x, GR.pivot[1], GR.R, d.a],
      ti: titleOf(ctx, bar, f),
    };
  };

  // the composition at any (wrapped) frame: rest, then glide in the last 6 frames with a small overshoot (the
  // arrival has weight) that lands exactly on the downbeat and rests there
  const poseAtFrame = (ctx: Ctx, F: number): Pose => {
    const bar = Math.floor(F / BAR),
      f = F - bar * BAR;
    if (f >= BAR - GLIDE) {
      const a = poseAt(ctx, bar, BAR - GLIDE),
        b = poseAt(ctx, bar + 1, 0),
        k = prog(f, BAR - GLIDE, BAR);
      for (const [key, i, per] of ANGLES) b[key][i] = turnTo(a[key][i]!, b[key][i]!, per);
      const o = mix(a, b, ease.outBack(k, 1.3)),
        ka = ease.outCubic(k);
      for (const [key, i] of ANGLES) o[key][i] = lerp(a[key][i]!, b[key][i]!, ka);
      o.ti = a.ti; // the title never glides through the shapes: it snaps on the beat grid (see titleOf)
      // beat 1's bass note: the triangle glides to one step short of its place by frame 57, then steps onto the
      // downbeat in 3 frames, like beat 3's
      const pre = poseAt(ctx, bar + 1, 0, -1);
      for (const i of [0, 1])
        o.t[i] =
          f < BAR - 3
            ? lerp(a.t[i]!, pre.t[i]!, ease.outBack(prog(f, BAR - GLIDE, BAR - 3), 1.3))
            : lerp(pre.t[i]!, b.t[i]!, ease.inOutCubic(prog(f, BAR - 3, BAR)));
      return o;
    }
    return poseAt(ctx, bar, f);
  };

  // ---- drawing (flat fills, no outlines; the later shape simply covers the earlier)
  const bar = (ctx: Ctx, [x, y, len, th, deg]: number[]) => {
    ctx.save();
    ctx.translate(X(x!), Y(y!));
    ctx.rotate(deg! * DEG);
    ctx.fillStyle = C.ink;
    ctx.fillRect((-len! * m) / 2, (-th! * m) / 2, len! * m, th! * m);
    ctx.restore();
  };
  const rule = (ctx: Ctx, [x, y, len, deg]: number[]) => {
    ctx.save();
    ctx.translate(X(x!), Y(y!));
    ctx.rotate(deg! * DEG);
    ctx.fillStyle = C.ink;
    ctx.fillRect((-len! * m) / 2, -1.5 * u, len! * m, 3 * u);
    ctx.restore();
  };
  const arcRing = (ctx: Ctx, [x, y, r, th, a0, sw]: number[]) => {
    ctx.beginPath();
    ctx.arc(X(x!), Y(y!), (r! + th! / 2) * m, a0! * DEG, (a0! + sw!) * DEG);
    ctx.arc(X(x!), Y(y!), (r! - th! / 2) * m, (a0! + sw!) * DEG, a0! * DEG, true);
    ctx.closePath();
    ctx.fillStyle = C.ink;
    ctx.fill();
  };
  const disc = (ctx: Ctx, [x, y, r, a]: number[]) => {
    ctx.beginPath();
    ctx.moveTo(X(x!), Y(y!));
    ctx.arc(X(x!), Y(y!), r! * m, a! * DEG, (a! + 90) * DEG);
    ctx.closePath();
    ctx.fillStyle = C.ink;
    ctx.fill();
  };

  // the four hits, a hard ease-out each; evaluated on the wrapped frame, so 719.9 reads "all four done" (360°)
  const squareTurn = (F: number) => HITS.reduce((s, h) => s + 90 * ease.outExpo(prog(F, h, h + 12)), 0);

  // the paper's faint speckle: seeded, static, drawn once into a cached layer
  const paper = (env: Env): Layer => {
    const w = Math.round(W * env.scale),
      h = Math.round(H * env.scale),
      k = `bauhaus-paper:${w}x${h}`;
    let lay = env.cache.get(k) as Layer | undefined;
    if (!lay) {
      lay = env.canvas(w, h);
      const c = lay.ctx,
        r = rng(34);
      c.setTransform(env.scale, 0, 0, env.scale, 0, 0);
      c.fillStyle = C.ground;
      c.fillRect(0, 0, W, H);
      const n = Math.round((W * H) / 900);
      for (let i = 0; i < n; i++) {
        const x = r() * W,
          y = r() * H,
          s = (0.8 + r() * 1.6) * u;
        c.fillStyle = r() < 0.5 ? "rgba(23,23,23,0.05)" : "rgba(120,96,60,0.07)";
        c.fillRect(x, y, s, s);
      }
      env.cache.set(k, lay);
    }
    return lay;
  };

  const paint = (ctx: Ctx, env: Env, F: number) => {
    F = ((F % N) + N) % N; // the shutter may sample either side of the seam
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(paper(env).canvas, 0, 0);
    ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
    const p = poseAtFrame(ctx, F);
    const sinceBeat = F % BEAT,
      kick = 1 + 0.08 * Math.exp(-sinceBeat / 4);

    // the composition, clipped above the ground band
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, band.rule - 10 * u);
    ctx.clip();
    disc(ctx, p.d);
    rule(ctx, p.r1);
    rule(ctx, p.r2);
    arcRing(ctx, p.a);
    bar(ctx, p.b1);
    bar(ctx, p.b2);
    // the circle: the kick
    ctx.beginPath();
    ctx.arc(X(p.c[0]!), Y(p.c[1]!), p.c[2]! * m * kick, 0, Math.PI * 2);
    ctx.fillStyle = C.accent2;
    ctx.fill();
    // the square: the hits
    ctx.save();
    ctx.translate(X(p.s[0]!), Y(p.s[1]!));
    ctx.rotate((p.s[3]! + squareTurn(F)) * DEG);
    ctx.fillStyle = C.accent;
    const ss = p.s[2]! * m;
    ctx.fillRect(-ss / 2, -ss / 2, ss, ss);
    ctx.restore();
    // the triangle: the bass (equilateral, size = circumradius)
    ctx.save();
    ctx.translate(X(p.t[0]!), Y(p.t[1]!));
    ctx.rotate(p.t[3]! * DEG);
    const tr = p.t[2]! * m;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / 3;
      if (i) ctx.lineTo(Math.cos(a) * tr, Math.sin(a) * tr);
      else ctx.moveTo(Math.cos(a) * tr, Math.sin(a) * tr);
    }
    ctx.closePath();
    ctx.fillStyle = C.s1;
    ctx.fill();
    ctx.restore();
    ctx.restore();

    // ---- the ground band: a rule, the arpeggio and the hats, from the same sixteenth grid
    ctx.fillStyle = C.ink;
    ctx.fillRect(ox, band.rule - 1.5 * u, GR.G * m, 3 * u);
    const barN = Math.floor(F / BAR),
      f = F - barN * BAR,
      cur = Math.floor(f / SIX),
      gl = ease.outBack(prog(f, BAR - GLIDE, BAR), 1.3), // the dots re-pitch with the recomposition
      dx = (band.x1 - band.x0) / 15,
      dotR = Math.min(0.3 * dx, 14 * u), // the dots and hats scale with the band's step (larger in landscape)
      hatW = Math.min(0.6 * dx, 30 * u);
    for (let s = 0; s < 16; s++) {
      const pitch = lerp(arpPitch(barN, s), arpPitch(barN + 1, s), gl),
        y = lerp(band.dotLo, band.dotHi, (pitch - P_LO) / (P_HI - P_LO)),
        since = f - s * SIX,
        hot = s === cur,
        r = dotR + (hot ? (3 + 5 * Math.exp(-Math.max(0, since) / 3)) * u : 0);
      ctx.beginPath();
      ctx.arc(band.x0 + s * dx, y, r, 0, Math.PI * 2);
      ctx.fillStyle = hot ? C.accent : C.ink;
      ctx.fill();
    }
    ctx.fillStyle = C.ink;
    for (let i = 0; i < 8; i++) {
      const at = (2 * i + 1) * SIX, // the off-sixteenth this bar plays
        since = (((f - at) % BAR) + BAR) % BAR,
        h = (8 + 40 * Math.exp(-since / 3)) * u,
        x = band.x0 + (2 * i + 1) * dx;
      ctx.fillRect(x - hatW / 2, band.hatBase - h, hatW, h);
    }

    // ---- the title (never mirrored, drawn last so nothing covers it)
    const [tx, ty, tsz, ta] = p.ti as [number, number, number, number];
    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(ta * DEG);
    text(ctx, TITLE, 0, 0, { size: tsz, family: F_.sans, weight: 800, color: C.ink, track: -0.03 });
    ctx.restore();
  };

  // shots only name the sections (four passes of three bars, each on a downbeat)
  const cuts = [0, 180, 360, 540, N],
    names = ["bars-1-3", "bars-4-6", "mirror-7-9", "mirror-10-12"];
  const shots: Shot[] = names.map((sid, i) => ({
    id: sid,
    start: cuts[i]!,
    end: cuts[i + 1]!,
    // no motion blur: a flat print has no translucent in-betweens, and the kick and the hits are hard events
    draw: (ctx, local, env) => paint(ctx, env, cuts[i]! + local),
  }));
  return {
    meta: { title: id, W, H, fps: FPS, bpm: BPM, durationFrames: N, raster: "cpu" },
    assets: { images: {}, fonts: P.assets },
    shots,
    audio: beatScore({ frames: N, fps: FPS, bpm: BPM, mood: "drive", loop: true, hits: HITS }),
  };
}

export const bauhausBeatSquare = make("square", "bauhausBeatSquare");
export const bauhausBeat = make("landscape", "bauhausBeat");
