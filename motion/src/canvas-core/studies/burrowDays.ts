// STUDY 53 · BURROW DAYS (48 s, 24 fps, 120 bpm). A comic-book-rendered short at a rabbit's-eye scale: a wild
// rabbit wakes at dawn, survives a hawk, a fox, a walker's dog, and makes it home at dusk. Flat cel forms whose one
// shadow is halftone dots, ink only on the shadow side, depth of field drawn as cyan/magenta misregistration
// instead of blur, characters on twos over a camera on ones, lettered sound words, 2–4-frame impact frames, a
// sticker freeze, comic panels and yellow caption boxes, all in a 2.39:1 letterbox. No product: every name is
// invented. Learns from an animated short shared on X (https://x.com/ChrisGPT/status/2104775199698629064); none of
// its characters, story, words, colours or frames are used.
// Brief: series/studies/briefs/burrow-days.json · prompt: series/studies/prompts/burrow-days.prompt.md
//
// The whole film is one continuous function paint(F); the shots only name the sections. Two clocks: characters
// read Tc = 2 · floor(F / 2) (on twos), the camera, speed lines, dust and sparkles read F (on ones). Every scene is
// a function of (F, R), a picture rectangle, so the stalk page, the chase split and the end page redraw the very
// same scenes inside comic panels.
import PACK from "../../../brand/packs/studio/pack.json";
import type { Ctx, Env, Layer } from "../core";
import type { Film, Shot } from "../film";
import { clamp, ease, lerp, prog, spring, window01 } from "../kit/motion";
import { usePack } from "../kit/pack";
import { beatScore } from "../kit/score";
import { layout, type Size } from "../kit/sizes";
import { measure, text } from "../kit/type";

const P = usePack(PACK),
  C = P.palette("warren"),
  F_ = P.face;
const FPS = 24,
  BPM = 120,
  N = 1152; // a beat is 12 frames
const TAU = Math.PI * 2,
  DEG = Math.PI / 180;
// the timeline, in frames (every shot starts on the 12-frame beat)
const T = {
  emerge: 48,
  graze: 96,
  macro: 144,
  shadow: 192,
  alarm: 204,
  sky: 228,
  sticker: 252,
  stoop: 276,
  thump: 288,
  bolt: 300,
  bramble: 336,
  page3: 360,
  stalk: 408,
  over: 456,
  race: 516,
  fence: 552,
  path: 576,
  dogface: 648,
  reyes: 660,
  split: 672,
  chase: 696,
  tumble: 744,
  recall: 792,
  thistle: 828,
  dusk: 864,
  warren: 960,
  page: 1032,
};

/** characters live on twos */
const tw = (F: number) => 2 * Math.floor(F / 2);
/** a pure hash of an integer pair (every scatter is seeded, never random at render time) */
const hash = (n: number, s = 0) => {
  const x = Math.sin(n * 127.1 + s * 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const mod = (a: number, n: number) => ((a % n) + n) % n;

// ---------------------------------------------------------------- colour (flat fills only)
const MIX = new Map<string, string>();
const rgbOf = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a: string, b: string, t: number): string => {
  const key = a + b + t.toFixed(3);
  let v = MIX.get(key);
  if (!v) {
    const A = rgbOf(a),
      B = rgbOf(b);
    v =
      "#" +
      A.map((x, i) =>
        Math.round(clamp(lerp(x, B[i]!, t), 0, 255))
          .toString(16)
          .padStart(2, "0"),
      ).join("");
    MIX.set(key, v);
  }
  return v;
};
/** the one shadow tone: the base darkened 18 % */
const dark = (c: string, t = 0.18) => mix(c, "#000000", t);
const PINK = mix(C.accent, C.s3, 0.55),
  EARIN = mix(C.s3, C.muted, 0.45),
  EARTH = mix(C.s7, C.ink, 0.42),
  GRASS = C.s4,
  GDARK = C.s5;

type R = { x: number; y: number; w: number; h: number };
type Opt = { mini?: boolean };
type Mode = "dawn" | "day" | "dusk" | "night";
type Cam = { x: number; y: number; zoom: number; tilt: number; sx?: number; sy?: number };
const SKY: Record<Mode, string[]> = {
  dawn: [C.s2, mix(C.s2, C.s3, 0.34), mix(C.s2, C.s3, 0.68), C.s3],
  day: [mix(C.sky, C.s2, 0.28), mix(C.sky, C.s2, 0.12), C.sky, mix(C.sky, C.surface, 0.4)],
  dusk: [C.s2, mix(C.s2, C.accent, 0.5), C.accent, C.s3],
  night: [C.deep, mix(C.deep, C.s2, 0.45), mix(C.deep, C.s2, 0.8), C.s2],
};

// ---------------------------------------------------------------- the rabbit's pose (every angle closed-form)
type RP = {
  y: number; // lift (rig units, negative is up)
  pitch: number; // body pitch, radians (negative: nose up)
  sx: number; // stretch along the body
  sy: number; // squash across it
  neck: number; // head pitch (positive: down)
  e0: number; // near ear angle (0 = straight up, negative leans back)
  e1: number; // far ear
  flat: number; // ears laid flat back, 0..1
  fd: number; // forepaws: 0 planted, 1 dangling / reaching
  fx: number;
  fy: number;
  air: number; // hind feet: 0 planted, 1 trailing
  hx: number; // planted heel's forward offset
  lift: number; // the thump: toe raised (radians)
  tail: number; // 0 down, 1 flagged up
  chew: number;
  tw: number; // nose twitch, rig px
  pupil: number; // pupil radius / eye radius
  px: number; // pupil tremble
  ribs: number; // breath
  eye: number; // 0 shut, 1 open
};
const RB: RP = {
  y: 0,
  pitch: -0.12,
  sx: 1,
  sy: 1,
  neck: 0.15,
  e0: -0.2,
  e1: -0.42,
  flat: 0,
  fd: 0,
  fx: 0,
  fy: 0,
  air: 0,
  hx: 0,
  lift: 0,
  tail: 0,
  chew: 0,
  tw: 0,
  pupil: 0.55,
  px: 0,
  ribs: 1,
  eye: 1,
};
const rp = (o: Partial<RP> = {}): RP => ({ ...RB, ...o });
/** the ribs and the nose twitch on twos (a cosine, so a 4-frame period never samples its zeros) */
const twitch = (Tc: number, a = 3) => a * Math.cos((TAU * Tc) / 4);
const graze = (Tc: number, flicks: number[] = []): RP => {
  let e0 = -0.22;
  for (const f of flicks) if (Tc >= f && Tc < f + 6) e0 -= 20 * DEG * Math.sin((Math.PI * (Tc - f)) / 6);
  return rp({
    pitch: 0.1,
    neck: 35 * DEG + 0.2,
    chew: 0.5 + 0.5 * Math.sin((TAU * Tc) / 6),
    tw: twitch(Tc),
    e0,
    pupil: 0.58,
  });
};
const alert = (Tc: number): RP =>
  rp({ pitch: -60 * DEG, neck: -0.25, e0: 0.02, e1: -0.08, fd: 1, tw: twitch(Tc, 5), pupil: 0.45 });
const freeze = (F: number, base: Partial<RP> = {}): RP =>
  rp({ pitch: -0.02, sy: 0.94, neck: 0.25, flat: 1, pupil: 0.36, px: Math.floor(F / 2) % 2 ? 1 : -1, ...base });
/** HOP: one hop per beat from t0; returns the pose and how many steps (eased) it has advanced */
const hop = (Tc: number, t0: number, H = 38): { p: RP; step: number } => {
  const t = Math.max(0, Tc - t0),
    n = Math.floor(t / 12),
    ph = (t % 12) / 12;
  if (ph < 0.6) {
    const q = ph / 0.6;
    return {
      p: rp({
        y: -H * Math.sin(Math.PI * q),
        sx: lerp(1.15, 1.02, q),
        pitch: lerp(-15 * DEG, 10 * DEG, q),
        air: Math.sin(Math.PI * Math.min(1, q * 1.4)),
        fd: 1,
        fx: lerp(-6, 16, q),
        fy: lerp(-8, 4, q),
        e0: -0.45,
        e1: -0.62,
        tw: twitch(Tc),
      }),
      step: n + ease.inOutCubic(q),
    };
  }
  const q = (ph - 0.6) / 0.4;
  return {
    p: rp({ sy: 1 - 0.12 * Math.sin(Math.PI * q), sx: 1 + 0.05 * Math.sin(Math.PI * q), e0: -0.3, e1: -0.5 }),
    step: n + 1,
  };
};
/** BOLT: an 8-frame bound, stretched 1.3, ears flat back, the tail flagged */
const bolt = (Tc: number): RP => {
  const ph = mod(Tc, 8) / 8;
  if (ph < 0.5) {
    const q = ph / 0.5;
    return rp({
      y: -30 * Math.sin(Math.PI * q),
      sx: 1.3,
      sy: 0.92,
      pitch: lerp(-0.12, 0.08, q),
      air: 1,
      fd: 1,
      fx: 30,
      fy: -4,
      flat: 1,
      tail: 1,
      pupil: 0.4,
    });
  }
  const q = (ph - 0.5) / 0.5;
  return rp({
    y: -8 * Math.sin(Math.PI * q),
    sx: lerp(1.05, 0.94, q),
    sy: 1.02,
    pitch: lerp(-0.05, -0.2, q),
    air: 0,
    hx: lerp(20, 50, q),
    fd: 0.4,
    fx: lerp(10, -16, q),
    fy: -6,
    flat: 1,
    tail: 1,
    pupil: 0.4,
  });
};
const thumpLift = (Tc: number, t0: number) => {
  const t = Tc - t0;
  if (t < 0) return 0;
  if (t < 4) return -30 * DEG * (t / 4);
  if (t < 10) return 30 * DEG * 0.15 * Math.sin((Math.PI * (t - 4)) / 6);
  return 0;
};

// ---------------------------------------------------------------- the quadruped (one rig: the fox and the dog)
type QS = {
  len: number;
  hgt: number;
  br: number;
  col: string;
  chest: string;
  dog: boolean;
  snout: number;
};
const FOX: QS = { len: 176, hgt: 64, br: 28, col: C.s6, chest: C.surface, dog: false, snout: 36 };
const DOG: QS = { len: 176, hgt: 96, br: 42, col: C.surface, chest: C.surface, dog: true, snout: 30 };
type QP = {
  y: number;
  pitch: number;
  sx: number;
  legs: [number, number][]; // LF RF LH RH paw offsets from rest
  tail: [number, number];
  head: number;
  ears: number; // 0 rest, 1 pricked, -1 flat
  lower: number;
  mouth: number;
  blink: number;
};
const qp = (o: Partial<QP> = {}): QP => ({
  y: 0,
  pitch: 0,
  sx: 1,
  legs: [
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
  ],
  tail: [Math.PI - 0.45, 0.35],
  head: 0,
  ears: 0,
  lower: 0,
  mouth: 0,
  blink: 0,
  ...o,
});
/** STALK: one leg at a time over 24 frames, body 20 % lower, tail straight; the body moves 24/18 units a frame */
const STALK_V = 24 / 18;
const stalk = (Tc: number): QP => {
  const order = [0, 3, 1, 2],
    legs: [number, number][] = [0, 1, 2, 3].map((leg) => {
      const t = mod(Tc - order.indexOf(leg) * 6, 24);
      if (t < 6) return [lerp(-12, 12, t / 6), -14 * Math.sin((Math.PI * t) / 6)];
      return [lerp(12, -12, (t - 6) / 18), 0];
    });
  return qp({ legs, lower: 0.2, tail: [Math.PI - 0.08, 0.05], head: 0.18, ears: 0.3 });
};
const gallop = (Tc: number): QP => {
  const a = (TAU * mod(Tc, 8)) / 8,
    leg = (o: number): [number, number] => [34 * Math.cos(a + o), -18 * Math.max(0, Math.sin(a + o))];
  return qp({
    legs: [leg(0), leg(0.35), leg(Math.PI), leg(Math.PI + 0.35)],
    y: -14 * Math.abs(Math.sin(a)),
    pitch: 0.1 * Math.sin(a),
    sx: 1 + 0.08 * Math.cos(a),
    tail: [Math.PI - 0.3 + 0.25 * Math.sin(a), 0.25],
    head: -0.05,
    mouth: 1,
  });
};
const trot = (Tc: number): QP => {
  const a = (TAU * mod(Tc, 12)) / 12,
    leg = (o: number): [number, number] => [16 * Math.cos(a + o), -10 * Math.max(0, Math.sin(a + o))];
  return qp({
    legs: [leg(0), leg(Math.PI), leg(Math.PI), leg(0)],
    y: -3 * Math.abs(Math.sin(a)),
    tail: [Math.PI - 1.0 + 0.45 * Math.cos((TAU * mod(Tc, 4)) / 4), 0.5],
    mouth: 1,
    ears: 0.4,
  });
};
const sit = (o: Partial<QP> = {}): QP =>
  qp({
    pitch: -0.5,
    y: 6,
    legs: [
      [6, 0],
      [0, 0],
      [44, 0],
      [38, 0],
    ],
    tail: [Math.PI + 0.25, 0.2],
    ...o,
  });

// ---------------------------------------------------------------- geometry
const circ = (x: number, y: number, r: number) => {
  const p = new Path2D();
  p.arc(x, y, Math.max(0.01, r), 0, TAU);
  return p;
};
const ell = (x: number, y: number, rx: number, ry: number, rot = 0) => {
  const p = new Path2D();
  p.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU);
  return p;
};
/** a tapered capsule from a (radius ra) to b (radius rb) */
const capsule = (ax: number, ay: number, bx: number, by: number, ra: number, rb: number) => {
  const a = Math.atan2(by - ay, bx - ax),
    p = new Path2D();
  p.arc(ax, ay, ra, a + Math.PI / 2, a + (Math.PI * 3) / 2);
  p.arc(bx, by, rb, a - Math.PI / 2, a + Math.PI / 2);
  p.closePath();
  return p;
};
/** two-bone IK: the joint between a and the target b */
const ik = (ax: number, ay: number, bx: number, by: number, l1: number, l2: number, bend: number) => {
  const dx = bx - ax,
    dy = by - ay,
    d = Math.max(1e-3, Math.min(Math.hypot(dx, dy), l1 + l2 - 1e-3)),
    a = Math.atan2(dy, dx),
    A = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1)),
    j = a + bend * A,
    jx = ax + l1 * Math.cos(j),
    jy = ay + l1 * Math.sin(j),
    e = Math.atan2(by - jy, bx - jx);
  return { jx, jy, ex: jx + l2 * Math.cos(e), ey: jy + l2 * Math.sin(e) };
};
/** a leaf (the rabbit's ear, a grass blade): base centred at the origin, tip at (0, −len) */
const leaf = (len: number, wid: number, bend = 0) => {
  const p = new Path2D();
  p.moveTo(-wid * 0.45, 0);
  p.bezierCurveTo(-wid * 0.95 + bend * 0.3, -len * 0.45, -wid * 0.45 + bend * 0.8, -len * 0.92, bend, -len);
  p.bezierCurveTo(wid * 0.5 + bend * 0.8, -len * 0.9, wid * 0.85 + bend * 0.3, -len * 0.4, wid * 0.45, 0);
  p.closePath();
  return p;
};
/** the hawk, seen from below: one closed path (head, hooked beak, wings with five fingers, a fanned tail) */
const hawkPath = (flap: number, fold = 0) => {
  const span = lerp(118, 34, fold),
    lift = flap * 26 * (1 - fold),
    back = fold * 46,
    p = new Path2D(),
    side = (sg: number) => {
      const pts: [number, number][] = [];
      pts.push([sg * 10, -26]);
      pts.push([sg * span * 0.5, -30 + lift * 0.5 + back * 0.5]);
      const tip: [number, number] = [sg * span, -20 + lift + back],
        rear: [number, number] = [sg * span * 0.7, 6 + lift * 0.6 + back];
      pts.push(tip);
      for (let i = 0; i < 5; i++) {
        const a = (i + 0.5) / 5,
          b = (i + 1) / 5;
        pts.push([lerp(tip[0], rear[0], a) + sg * 14 * (1 - fold), lerp(tip[1], rear[1], a) + 12]);
        pts.push([lerp(tip[0], rear[0], b), lerp(tip[1], rear[1], b)]);
      }
      pts.push([sg * 16, 14 + back * 0.3]);
      pts.push([sg * 12, 26]);
      pts.push([sg * 26, 56]);
      return pts;
    };
  const R_ = side(1),
    L_ = side(-1).reverse();
  p.moveTo(0, -56); // the beak's hook
  p.lineTo(5, -50);
  p.lineTo(9, -40);
  for (const [x, y] of R_) p.lineTo(x, y);
  p.quadraticCurveTo(0, 66, -26, 56);
  for (const [x, y] of L_) p.lineTo(x, y);
  p.lineTo(-9, -40);
  p.lineTo(-4, -48);
  p.closePath();
  return p;
};

export function make(size: Size, id: string): Film {
  const L = layout(size),
    { W, H, u, tall } = L;
  // the picture: a 2.39:1 window between deep bars; the vertical is full bleed inside a thin paper border
  const PIC: R = tall ? { x: 18 * u, y: 18 * u, w: W - 36 * u, h: H - 36 * u } : { x: 0, y: 138 * u, w: W, h: 804 * u };
  const SAFE = { x0: L.safe.x, x1: W - L.safe.x, y0: L.safe.top, y1: H - L.safe.bottom };
  const geo = (R: R) => {
    const t = R.h > R.w * 1.2,
      k = t ? R.w / 1080 : Math.min(R.w / 1080, R.h / 804);
    return {
      tall: t,
      k,
      cx: R.x + R.w / 2,
      cy: R.y + R.h / 2,
      gy: R.y + R.h * (t ? 0.8 : 0.76),
      hz: R.y + R.h * (t ? 0.6 : 0.5),
    };
  };

  // ---------------------------------------------------------------- surfaces (cached per size)
  const scratch = (env: Env, name: string): Layer => {
    const w = Math.ceil(W * env.scale),
      h = Math.ceil(H * env.scale),
      key = `burrow:${name}:${w}x${h}`;
    let S = env.cache.get(key) as Layer | undefined;
    if (!S) {
      S = env.canvas(w, h);
      env.cache.set(key, S);
    }
    const s = S.ctx;
    s.setTransform(1, 0, 0, 1, 0, 0);
    s.globalAlpha = 1;
    s.globalCompositeOperation = "source-over";
    s.clearRect(0, 0, w, h);
    return S;
  };
  const tintOf = (env: Env, S: Layer, col: string): Layer => {
    const Tn = scratch(env, "tint"),
      t = Tn.ctx;
    t.drawImage(S.canvas as CanvasImageSource, 0, 0);
    t.globalCompositeOperation = "source-in";
    t.fillStyle = col;
    t.fillRect(0, 0, Tn.canvas.width, Tn.canvas.height);
    t.globalCompositeOperation = "source-over";
    return Tn;
  };
  /** MISREGISTRATION AS FOCUS: a cyan copy at −d, a magenta copy at +d (55 %), the true colours on top */
  const fringe = (c: Ctx, env: Env, d: number, dx: number, dy: number, draw: (c: Ctx) => void) => {
    if (d < 0.8) return draw(c);
    const S = scratch(env, "fr");
    S.ctx.setTransform(c.getTransform());
    draw(S.ctx);
    const D = d * env.scale,
      a0 = c.globalAlpha;
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = a0 * 0.55;
    c.drawImage(tintOf(env, S, C.accent2).canvas as CanvasImageSource, -dx * D, -dy * D);
    c.drawImage(tintOf(env, S, C.accent).canvas as CanvasImageSource, dx * D, dy * D);
    c.globalAlpha = a0;
    c.drawImage(S.canvas as CanvasImageSource, 0, 0);
    c.restore();
  };
  /** the offset of a layer at depth z from the focal depth zf (the brief's 7 · |1/z − 1/zf|, enlarged for phones) */
  const dof = (z: number, zf: number, k: number) => Math.min(9, 20 * Math.abs(1 / z - 1 / zf)) * u * Math.max(0.5, k);
  /** a flat pure-ink (or any colour) silhouette of whatever draw paints */
  const sil = (c: Ctx, env: Env, draw: (c: Ctx) => void, col: string = C.ink) => {
    const S = scratch(env, "sil");
    S.ctx.setTransform(c.getTransform());
    draw(S.ctx);
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.drawImage(tintOf(env, S, col).canvas as CanvasImageSource, 0, 0);
    c.restore();
  };
  // halftone: three dot tiles per size (cell 8 px at 1080, 15° screen, r = cell · 0.5 · √v), any ink colour
  const tile = (env: Env, v: number, col: string): Layer => {
    const cell = Math.max(3, Math.round(8 * u * env.scale)),
      key = `burrow:dot:${cell}:${v}:${col}`;
    let Tl = env.cache.get(key) as Layer | undefined;
    if (!Tl) {
      Tl = env.canvas(cell, cell);
      const t = Tl.ctx;
      t.fillStyle = col;
      t.beginPath();
      t.arc(cell / 2, cell / 2, cell * 0.5 * Math.sqrt(v), 0, TAU);
      t.fill();
      env.cache.set(key, Tl);
    }
    return Tl;
  };
  /** the device origin of the rig being drawn: character dots ride the body; scenery dots are screen-locked */
  let ANCHOR: [number, number] | null = null;
  const dots = (c: Ctx, env: Env, p: Path2D, v: number, col: string = C.ink, a = 1) => {
    const pat = c.createPattern(tile(env, v, col).canvas as CanvasImageSource, "repeat");
    if (!pat) return;
    const base = ANCHOR ? new DOMMatrix().translate(ANCHOR[0], ANCHOR[1]).rotate(15) : new DOMMatrix().rotate(15);
    pat.setTransform(c.getTransform().inverse().multiply(base));
    c.save();
    c.globalAlpha *= a;
    c.fillStyle = pat;
    c.fill(p);
    c.restore();
  };
  // one fixed key light per scene: LX, LY point toward the light on screen; the rim is accent at dawn and dusk
  let LX = 1,
    LY = -0.4,
    RIM = C.accent;
  const light = (m: Mode) => {
    const v = m === "dawn" ? [1, -0.45] : m === "dusk" ? [-1, -0.45] : m === "night" ? [0.3, -1] : [0.3, -1];
    const l = Math.hypot(v[0]!, v[1]!);
    LX = v[0]! / l;
    LY = v[1]! / l;
    RIM = m === "day" ? C.surface : m === "night" ? mix(C.s2, C.surface, 0.4) : C.accent;
  };
  /** CEL: the base, ONE shadow (the form minus itself shifted toward the light) filled 18 % darker with ink dots
   *  and a few 45° hatches, an ink contour on the shadow side only, and a 3 px rim on the lit edge */
  type CelO = { sh?: number; v?: number; rim?: string | false; ink?: number; hatch?: number };
  const cel = (c: Ctx, env: Env, p: Path2D, base: string, cx: number, cy: number, sz: number, o: CelO = {}) => {
    const m = c.getTransform(),
      sc = Math.hypot(m.a, m.b) || 1,
      det = m.a * m.d - m.b * m.c || 1;
    let lx = (m.d * LX - m.c * LY) / det,
      ly = (-m.b * LX + m.a * LY) / det;
    const ll = Math.hypot(lx, ly) || 1;
    lx /= ll;
    ly /= ll;
    const sh = (o.sh ?? 0.16) * sz * 2,
      lit = new Path2D();
    lit.addPath(p, new DOMMatrix([1, 0, 0, 1, lx * sh, ly * sh]));
    c.save();
    c.clip(p);
    c.fillStyle = dark(base);
    c.fill(p);
    if (o.v !== 0) dots(c, env, p, o.v ?? 0.45);
    const nh = o.hatch ?? 4;
    if (nh > 0) {
      c.strokeStyle = C.ink;
      c.lineWidth = (2 * u) / sc;
      c.lineCap = "round";
      c.beginPath();
      const qx = cx - lx * (sz - sh * 0.35),
        qy = cy - ly * (sz - sh * 0.35),
        hl = Math.max(sh * 0.9, (10 * u) / sc);
      for (let i = 0; i < nh; i++) {
        const t = (i / Math.max(1, nh - 1) - 0.5) * sz * 0.9,
          x = qx - ly * t,
          y = qy + lx * t;
        c.moveTo(x - hl * 0.35, y + hl * 0.35);
        c.lineTo(x + hl * 0.35, y - hl * 0.35);
      }
      c.stroke();
    }
    c.strokeStyle = C.ink;
    c.lineWidth = (2 * (o.ink ?? 4) * u) / sc;
    c.stroke(p);
    c.fillStyle = base;
    c.fill(lit);
    if (o.rim !== false) {
      c.save();
      c.clip(lit);
      c.strokeStyle = o.rim ?? RIM;
      c.lineWidth = (6 * u) / sc;
      c.stroke(p);
      c.restore();
    }
    c.restore();
  };

  // ---------------------------------------------------------------- camera: flat layers at depth z
  const lay = (c: Ctx, R: R, cam: Cam, z: number, draw: (c: Ctx) => void) => {
    const cx = R.x + R.w / 2,
      cy = R.y + R.h / 2,
      f = Number.isFinite(z) ? 4 / z : 0;
    c.save();
    c.translate(cx + (cam.sx ?? 0), cy + (cam.sy ?? 0));
    c.rotate(cam.tilt);
    c.scale(cam.zoom, cam.zoom);
    c.translate(-cx - cam.x * f, -cy - cam.y * f);
    draw(c);
    c.restore();
  };
  const flay = (c: Ctx, env: Env, R: R, cam: Cam, z: number, zf: number, draw: (c: Ctx) => void, mini = false) => {
    const d = mini ? 0 : dof(z, zf, geo(R).k);
    fringe(c, env, d, 1, 0, (cc) => lay(cc, R, cam, z, draw));
  };
  const shake = (F: number, t0: number, amp: number) => {
    const t = F - t0;
    if (t < 0 || t > 24) return 0;
    return amp * u * Math.exp(-t / 5) * Math.sin((TAU * t) / 4);
  };

  // ---------------------------------------------------------------- THE RABBIT (the one full rig)
  const rigM = (p: RP) => {
    const body = new DOMMatrix()
      .translate(0, p.y - 34)
      .rotate(p.pitch / DEG)
      .scale(p.sx, p.sy);
    const head = body
      .translate(92, -24)
      .scale(1 / p.sx, 1 / p.sy)
      .rotate((p.neck - p.pitch * 0.8) / DEG);
    return { body, head };
  };
  const EYE: [number, number] = [20, -24];
  /** where a rig-local point of the head lands in root units */
  const headPt = (p: RP, x: number, y: number) => {
    const q = rigM(p).head.transformPoint(new DOMPoint(x, y));
    return [q.x, q.y] as [number, number];
  };
  type RO = {
    face?: number;
    fur?: string;
    whisk?: boolean;
    only?: "whisk";
    inEye?: (c: Ctx, ex: number, ey: number, r: number) => void;
  };
  const rabbit = (c: Ctx, env: Env, x: number, y: number, s: number, p: RP, o: RO = {}) => {
    const fur = o.fur ?? C.s7,
      furD = dark(fur, 0.3);
    c.save();
    c.translate(x, y);
    c.scale(s * (o.face ?? 1), s);
    const M0 = c.getTransform(),
      { body, head } = rigM(p),
      at = (m: DOMMatrix) => c.setTransform(M0.multiply(m)),
      pt = (m: DOMMatrix, a: number, b: number) => {
        const q = m.transformPoint(new DOMPoint(a, b));
        return [q.x, q.y] as [number, number];
      };
    ANCHOR = [M0.e, M0.f];
    const whiskers = () => {
      at(head);
      const sc = Math.hypot(c.getTransform().a, c.getTransform().b);
      c.strokeStyle = C.ink;
      c.lineCap = "round";
      c.lineWidth = (2.2 * u) / sc;
      c.beginPath();
      for (const a of [-0.3, -0.06, 0.2]) {
        const bx = 46,
          by = -4 + p.tw * 0.3;
        c.moveTo(bx, by);
        c.quadraticCurveTo(
          bx + 20 * Math.cos(a),
          by + 20 * Math.sin(a) - 2,
          bx + 40 * Math.cos(a),
          by + 40 * Math.sin(a) + 3,
        );
      }
      c.stroke();
    };
    if (o.only === "whisk") {
      whiskers();
      c.restore();
      ANCHOR = null;
      return;
    }
    const earA = (e: number) => lerp(e, -1.42, p.flat);
    const earD = (bx: number, by: number, e: number, col: string, near: boolean) => {
      at(head.translate(bx, by).rotate(earA(e) / DEG));
      const ep = leaf(80, 24);
      cel(c, env, ep, col, 0, -40, 14, { sh: 0.2, hatch: 3 });
      if (near) {
        c.fillStyle = EARIN;
        c.fill(leaf(58, 12));
      }
    };
    // far side first
    earD(12, -42, p.e1, furD, false);
    const sh = pt(body, 80, 12),
      hip = pt(body, 0, 0);
    const foreT = (dx: number): [number, number] =>
      p.fd > 0
        ? [lerp(sh[0] + 6 + dx, sh[0] + 12 + p.fx + dx, p.fd), lerp(0, sh[1] + 26 + p.fy, p.fd)]
        : [sh[0] + 6 + p.fx + dx, 0];
    const fore = (dx: number, col: string) => {
      c.setTransform(M0);
      const [tx, ty] = foreT(dx),
        j = ik(sh[0] + dx * 0.5, sh[1], tx, Math.min(ty, 0), 17, 17, -1);
      cel(c, env, capsule(sh[0] + dx * 0.5, sh[1], j.jx, j.jy, 8, 6), col, (sh[0] + j.jx) / 2, (sh[1] + j.jy) / 2, 8, {
        hatch: 0,
      });
      cel(c, env, capsule(j.jx, j.jy, j.ex + 7, j.ey - 3, 6, 5), col, j.jx, j.jy, 6, { hatch: 0 });
    };
    fore(-10, furD);
    // the hind leg: thigh + long foot
    c.setTransform(M0);
    const planted: [number, number] = [hip[0] - 18 + p.hx, -6],
      trail: [number, number] = [hip[0] - 42, hip[1] + 22],
      heel: [number, number] = [lerp(planted[0], trail[0], p.air), lerp(planted[1], trail[1], p.air)],
      fa = lerp(0, Math.PI - 0.55, p.air) + p.lift,
      toe: [number, number] = [heel[0] + 58 * Math.cos(fa), heel[1] + 58 * Math.sin(fa)];
    cel(c, env, capsule(hip[0] + 4, hip[1] + 12, heel[0], heel[1], 18, 8), furD, hip[0], hip[1] + 12, 16, { hatch: 0 });
    cel(c, env, capsule(heel[0], heel[1], toe[0], toe[1], 8, 6), fur, heel[0] + 20, heel[1], 8, { hatch: 0 });
    // the cotton tail
    at(body);
    const tr = 14 * (1 + 0.35 * p.tail);
    cel(c, env, circ(-42 - 4 * p.tail, -12 - 16 * p.tail, tr), C.surface, -42, -12 - 16 * p.tail, tr, {
      rim: false,
      v: 0.25,
      hatch: 0,
    });
    // haunch + body (the ribcage breathes)
    cel(c, env, circ(0, 0, 36), fur, 0, 0, 36, { hatch: 3 });
    const bp = ell(46, -8, 62 * p.ribs, 36 * p.ribs, -0.12);
    cel(c, env, bp, fur, 46, -8, 40, { hatch: 5 });
    c.save();
    c.clip(bp);
    cel(c, env, ell(62, 22, 46, 16, -0.1), C.surface, 62, 22, 16, { rim: false, hatch: 0, v: 0.25, ink: 0 });
    c.restore();
    fore(0, fur);
    // the head
    at(head);
    cel(c, env, ell(32, 7 + p.chew * 4, 11, 7), furD, 32, 8, 8, { hatch: 0, rim: false });
    cel(c, env, circ(14, -18, 28), fur, 14, -18, 28, { hatch: 4 });
    cel(c, env, circ(36, -8, 16), mix(fur, C.surface, 0.2), 36, -8, 16, { hatch: 0, sh: 0.12 });
    c.fillStyle = PINK;
    c.beginPath();
    c.ellipse(51, -12 + p.tw * 0.4, 5.5, 4.2, 0.3, 0, TAU);
    c.fill();
    const sc = Math.hypot(c.getTransform().a, c.getTransform().b);
    c.strokeStyle = C.ink;
    c.lineWidth = (2.4 * u) / sc;
    c.lineCap = "round";
    c.beginPath();
    c.moveTo(50, -8 + p.tw * 0.3);
    c.quadraticCurveTo(48, -1, 42, 0);
    c.stroke();
    // the large comic eye: surface disc, ink pupil (shrinks in fear), one glint, a lid when shut
    const [ex, ey] = EYE,
      er = 11,
      disc = circ(ex, ey, er);
    c.fillStyle = C.surface;
    c.fill(disc);
    c.save();
    c.clip(disc);
    const pr = er * p.pupil,
      pxx = ex + 2 + p.px * 0.6;
    c.fillStyle = C.ink;
    c.beginPath();
    c.arc(pxx, ey, pr, 0, TAU);
    c.fill();
    o.inEye?.(c, ex, ey, er);
    c.fillStyle = C.surface;
    c.beginPath();
    c.arc(pxx + pr * 0.35, ey - pr * 0.42, Math.max(pr * 0.34, 1.8), 0, TAU);
    c.fill();
    if (p.eye < 1) {
      const ly = ey - er + 2 * er * (1 - p.eye);
      c.fillStyle = fur;
      c.fillRect(ex - er - 2, ey - er - 2, 2 * er + 4, ly - (ey - er) + 2);
      c.strokeStyle = C.ink;
      c.lineWidth = (4 * u) / sc;
      c.beginPath();
      c.moveTo(ex - er, ly);
      c.lineTo(ex + er, ly);
      c.stroke();
    }
    c.restore();
    c.strokeStyle = C.ink;
    c.lineWidth = (2.6 * u) / sc;
    c.stroke(disc);
    if (o.whisk !== false) whiskers();
    earD(4, -40, p.e0, fur, true);
    c.restore();
    ANCHOR = null;
  };
  /** draw the rabbit so a head-local point lands on (tx, ty) */
  const rabbitAt = (c: Ctx, env: Env, tx: number, ty: number, s: number, p: RP, o: RO = {}, pin = EYE) => {
    const [px, py] = headPt(p, pin[0], pin[1]);
    rabbit(c, env, tx - px * s * (o.face ?? 1), ty - py * s, s, p, o);
  };

  // ---------------------------------------------------------------- THE QUADRUPED (fox and dog)
  const quad = (c: Ctx, env: Env, x: number, y: number, s: number, A: QS, p: QP, face = 1, tongue = 0) => {
    c.save();
    c.translate(x, y);
    c.scale(s * face, s);
    const M0 = c.getTransform();
    ANCHOR = [M0.e, M0.f];
    const hgt = A.hgt * (1 - p.lower * 0.2),
      body = new DOMMatrix()
        .translate(0, -hgt + p.y)
        .rotate(p.pitch / DEG)
        .scale(p.sx, 1),
      pt = (a: number, b: number) => {
        const q = body.transformPoint(new DOMPoint(a, b));
        return [q.x, q.y] as [number, number];
      };
    const joints: [number, number][] = [
      pt(A.len * 0.3, A.br * 0.35),
      pt(A.len * 0.3 - 10, A.br * 0.35),
      pt(-A.len * 0.3, A.br * 0.3),
      pt(-A.len * 0.3 + 10, A.br * 0.3),
    ];
    const rest = [A.len * 0.3 + 4, A.len * 0.3 - 8, -A.len * 0.3 - 4, -A.len * 0.3 + 8];
    const lseg = (A.hgt - A.br * 0.3) * 0.56;
    const leg = (i: number, col: string) => {
      c.setTransform(M0);
      const [ax, ay] = joints[i]!,
        [dx, dy] = p.legs[i]!,
        j = ik(ax, ay, rest[i]! + dx, dy - 4, lseg, lseg, i < 2 ? -1 : 1),
        w = A.dog ? 11 : 8;
      cel(c, env, capsule(ax, ay, j.jx, j.jy, w * 1.3, w), col, ax, ay, w, { hatch: 0 });
      cel(c, env, capsule(j.jx, j.jy, j.ex, j.ey, w, w * 0.8), A.dog ? col : C.ink, j.jx, j.jy, w, { hatch: 0 });
      c.fillStyle = A.dog ? col : C.ink;
      c.beginPath();
      c.ellipse(j.ex + 5, j.ey + 1, w * 1.2, w * 0.7, 0, 0, TAU);
      c.fill();
      c.strokeStyle = C.ink;
      c.lineWidth = (2.5 * u) / Math.hypot(c.getTransform().a, c.getTransform().b);
      c.stroke();
    };
    const colD = dark(A.col, 0.28);
    leg(1, colD);
    leg(3, colD);
    // the tail: two segments
    c.setTransform(M0.multiply(body));
    const t0x = -A.len * 0.46,
      t0y = -A.br * 0.2,
      a1 = p.tail[0],
      a2 = a1 + p.tail[1],
      tl = A.dog ? 34 : 48,
      t1x = t0x + tl * Math.cos(a1),
      t1y = t0y + tl * Math.sin(a1),
      t2x = t1x + tl * Math.cos(a2),
      t2y = t1y + tl * Math.sin(a2);
    if (A.dog) {
      cel(c, env, capsule(t0x, t0y, t1x, t1y, 7, 6), A.col, t0x, t0y, 7, { hatch: 0 });
      cel(c, env, capsule(t1x, t1y, t2x, t2y, 6, 4), A.col, t1x, t1y, 6, { hatch: 0 });
    } else {
      cel(c, env, capsule(t0x, t0y, t1x, t1y, 11, 17), A.col, t1x, t1y, 16, { hatch: 2 });
      cel(c, env, capsule(t1x, t1y, t2x, t2y, 17, 6), A.col, t1x, t1y, 16, { hatch: 2 });
      c.save();
      c.clip(capsule(t1x, t1y, t2x, t2y, 17, 6));
      c.fillStyle = C.surface;
      c.beginPath();
      c.arc(t2x, t2y, 22, 0, TAU);
      c.fill();
      c.restore();
    }
    // the body
    const bp = ell(0, 0, A.len / 2, A.br, 0);
    cel(c, env, bp, A.col, 0, 0, A.br, { hatch: 5 });
    c.save();
    c.clip(bp);
    if (A.dog) {
      c.fillStyle = C.ink;
      c.beginPath();
      c.ellipse(-30, -A.br * 0.6, 34, 22, 0.2, 0, TAU);
      c.ellipse(40, -A.br * 0.9, 22, 18, 0, 0, TAU);
      c.fill();
    } else {
      c.fillStyle = C.chest ?? C.surface;
      c.beginPath();
      c.ellipse(A.len * 0.34, A.br * 0.55, 34, 16, -0.3, 0, TAU);
      c.fill();
    }
    c.restore();
    leg(0, A.col);
    leg(2, A.col);
    // the head
    const hr = A.br * (A.dog ? 0.78 : 0.85),
      head = body
        .translate(A.len * 0.46, -A.br * 0.55)
        .scale(1 / p.sx, 1)
        .rotate((p.head - p.pitch * 0.7) / DEG);
    c.setTransform(M0.multiply(head));
    const earBase: [number, number] = [-hr * 0.35, -hr * 0.75];
    const ear = (dx: number, col: string) => {
      if (A.dog) {
        const up = clamp(p.ears, -1, 1);
        c.save();
        c.translate(earBase[0] + dx, earBase[1] + 4);
        c.rotate(lerp(2.6, 0.5, (up + 1) / 2));
        cel(c, env, leaf(hr * 1.1, hr * 0.7), dark(col === C.ink ? C.ink : C.ink, 0), 0, -hr * 0.5, hr * 0.4, {
          hatch: 0,
          rim: C.muted,
        });
        c.restore();
      } else {
        c.save();
        c.translate(earBase[0] + dx, earBase[1]);
        c.rotate(lerp(-0.25, -1.3, clamp(-p.ears)) + 0.15 * clamp(p.ears));
        const tri = new Path2D();
        tri.moveTo(-9, 2);
        tri.lineTo(0, -hr * 0.95);
        tri.lineTo(10, 2);
        tri.closePath();
        cel(c, env, tri, col, 0, -hr * 0.3, 10, { hatch: 0 });
        c.fillStyle = C.ink;
        c.beginPath();
        c.moveTo(-3, -hr * 0.6);
        c.lineTo(0, -hr * 0.95);
        c.lineTo(3.5, -hr * 0.6);
        c.fill();
        c.restore();
      }
    };
    ear(8, colD);
    const snout = capsule(hr * 0.3, hr * 0.05, hr + A.snout, hr * 0.32, hr * 0.62, hr * 0.26);
    cel(c, env, snout, A.col, hr * 0.8, hr * 0.2, hr * 0.5, { hatch: 0 });
    cel(c, env, circ(0, 0, hr), A.col, 0, 0, hr, { hatch: 3 });
    if (!A.dog) {
      c.save();
      c.clip(snout);
      c.fillStyle = C.surface;
      c.beginPath();
      c.ellipse(hr + A.snout * 0.3, hr * 0.62, A.snout * 0.9, hr * 0.32, 0.1, 0, TAU);
      c.fill();
      c.restore();
    } else {
      c.fillStyle = C.ink;
      c.beginPath();
      c.ellipse(-hr * 0.05, -hr * 0.15, hr * 0.5, hr * 0.42, 0.3, 0, TAU);
      c.fill();
    }
    const sc = Math.hypot(c.getTransform().a, c.getTransform().b);
    // mouth (open when running) and tongue
    if (p.mouth > 0 || tongue > 0) {
      c.fillStyle = C.ink;
      c.beginPath();
      c.moveTo(hr * 0.5, hr * 0.45);
      c.lineTo(hr + A.snout * 0.8, hr * 0.5);
      c.lineTo(hr * 0.7, hr * 0.5 + 10 * Math.max(p.mouth, tongue));
      c.closePath();
      c.fill();
      if (A.dog) {
        const wag = 0.25 * Math.sin((TAU * p.blink) / 4);
        c.save();
        c.translate(hr * 0.85, hr * 0.55);
        c.rotate(-Math.PI + 0.35 + wag);
        cel(c, env, leaf(24, 14), PINK, 0, -12, 7, { hatch: 0, rim: false });
        c.restore();
      }
    }
    c.fillStyle = C.ink;
    c.beginPath();
    c.arc(hr + A.snout, hr * 0.32, A.dog ? 7 : 5, 0, TAU);
    c.fill();
    // the eye
    const ex = hr * 0.35,
      ey = -hr * 0.22,
      er = A.dog ? hr * 0.26 : hr * 0.2;
    if (p.blink >= 0.5 && !A.dog) {
      c.strokeStyle = C.ink;
      c.lineWidth = (3 * u) / sc;
      c.beginPath();
      c.moveTo(ex - er, ey);
      c.lineTo(ex + er, ey);
      c.stroke();
    } else {
      c.fillStyle = A.dog ? C.surface : C.s1;
      c.beginPath();
      c.ellipse(ex, ey, er, er * (A.dog ? 1 : 0.8), 0, 0, TAU);
      c.fill();
      c.fillStyle = C.ink;
      c.beginPath();
      if (A.dog) c.arc(ex + er * 0.25, ey, er * 0.55, 0, TAU);
      else c.ellipse(ex + er * 0.2, ey, er * 0.28, er * 0.75, 0, 0, TAU);
      c.fill();
      c.fillStyle = C.surface;
      c.beginPath();
      c.arc(ex + er * 0.45, ey - er * 0.35, er * 0.22, 0, TAU);
      c.fill();
      c.strokeStyle = C.ink;
      c.lineWidth = (2.5 * u) / sc;
      c.beginPath();
      c.ellipse(ex, ey, er, er * (A.dog ? 1 : 0.8), 0, 0, TAU);
      c.stroke();
    }
    ear(-6, A.dog ? C.ink : A.col);
    c.restore();
    ANCHOR = null;
  };

  // ---------------------------------------------------------------- the hawk, the dog's face, the boots, the moth
  const hawk = (c: Ctx, env: Env, x: number, y: number, s: number, flap: number, fold = 0, rot = 0) => {
    c.save();
    c.translate(x, y);
    c.rotate(rot);
    c.scale(s, s);
    const p = hawkPath(flap, fold);
    const oL = LX,
      oY = LY;
    LX = 0;
    LY = -1;
    cel(c, env, p, mix(C.s7, C.ink, 0.62), 0, 0, 40, { rim: C.surface, v: 0.7, hatch: 0, sh: 0.3 });
    LX = oL;
    LY = oY;
    // the eyes and the hooked beak, read in silhouette
    c.fillStyle = C.s1;
    c.beginPath();
    c.arc(-5, -42, 2.6, 0, TAU);
    c.arc(5, -42, 2.6, 0, TAU);
    c.fill();
    c.restore();
  };
  /** its shadow: the same path scaled 0.35 in y, skewed, ink at 55 % with a halftone edge */
  const hawkShadow = (c: Ctx, env: Env, x: number, y: number, s: number, flap: number, a = 1) => {
    c.save();
    c.translate(x, y);
    c.transform(1, 0, -0.5, 1, 0, 0);
    c.scale(s, s * 0.35);
    c.rotate(-Math.PI / 2);
    const p = hawkPath(flap),
      big = new Path2D();
    big.addPath(p, new DOMMatrix().scale(1.14, 1.14));
    dots(c, env, big, 0.45, C.ink, a);
    c.globalAlpha *= 0.55 * a;
    c.fillStyle = C.ink;
    c.fill(p);
    c.restore();
  };
  const dogFace = (c: Ctx, env: Env, x: number, y: number, s: number, F: number, prick = 1) => {
    const Tc = tw(F);
    c.save();
    c.translate(x, y);
    c.scale(s, s);
    const M0 = c.getTransform();
    ANCHOR = [M0.e, M0.f];
    // ears up (pricked), head, patch, muzzle, huge eyes, nose, tongue
    for (const sg of [-1, 1]) {
      c.save();
      c.translate(sg * 70, -70);
      c.rotate(sg * lerp(1.9, 0.45, prick) + sg * 0.04 * Math.cos((TAU * Tc) / 4));
      cel(c, env, leaf(110, 76), C.ink, 0, -50, 40, { hatch: 0, rim: C.muted });
      c.restore();
    }
    cel(c, env, circ(0, 0, 120), C.surface, 0, 0, 120, { hatch: 5 });
    c.save();
    c.clip(circ(0, 0, 120));
    c.fillStyle = C.ink;
    c.beginPath();
    c.ellipse(-58, -40, 58, 64, 0.3, 0, TAU);
    c.fill();
    c.restore();
    cel(c, env, ell(0, 62, 76, 54), mix(C.surface, C.ground, 0.4), 0, 62, 50, { hatch: 0 });
    for (const sg of [-1, 1]) {
      const ex = sg * 50,
        ey = -18,
        r = 34;
      c.fillStyle = C.surface;
      c.beginPath();
      c.arc(ex, ey, r, 0, TAU);
      c.fill();
      c.fillStyle = C.ink;
      c.beginPath();
      c.arc(ex + sg * 2, ey + 2, r * 0.42, 0, TAU);
      c.fill();
      c.fillStyle = C.surface;
      c.beginPath();
      c.arc(ex + 9, ey - 9, r * 0.17, 0, TAU);
      c.fill();
      c.strokeStyle = C.ink;
      c.lineWidth = 5;
      c.beginPath();
      c.arc(ex, ey, r, 0, TAU);
      c.stroke();
    }
    c.fillStyle = C.ink;
    c.beginPath();
    c.ellipse(0, 42, 26, 18, 0, 0, TAU);
    c.fill();
    c.fillStyle = C.surface;
    c.beginPath();
    c.arc(-8, 36, 5, 0, TAU);
    c.fill();
    c.save();
    c.translate(0, 84);
    c.rotate(Math.PI + 0.08 * Math.cos((TAU * Tc) / 8));
    cel(c, env, leaf(58, 34), PINK, 0, -26, 16, { hatch: 0, rim: false });
    c.restore();
    c.strokeStyle = C.ink;
    c.lineWidth = 5;
    c.beginPath();
    c.moveTo(-34, 74);
    c.quadraticCurveTo(0, 90, 34, 74);
    c.stroke();
    c.restore();
    ANCHOR = null;
  };
  /** a giant boot and its trouser hem, side view, facing right; (x, y) is the heel's ground point */
  const boot = (c: Ctx, env: Env, x: number, y: number, s: number, tilt: number, farSide: boolean) => {
    c.save();
    c.translate(x, y);
    c.rotate(tilt);
    c.scale(s, s);
    const leather = farSide ? mix(C.s7, C.ink, 0.6) : mix(C.s7, C.ink, 0.42),
      denim = farSide ? dark(C.s2, 0.3) : C.s2;
    // the trouser leg, running up out of frame
    const leg = new Path2D();
    leg.moveTo(8, -190);
    leg.lineTo(0, -1400);
    leg.lineTo(210, -1400);
    leg.lineTo(196, -190);
    leg.closePath();
    cel(c, env, leg, denim, 100, -500, 110, { hatch: 5, sh: 0.1 });
    // the hem
    cel(c, env, capsule(-4, -196, 206, -196, 16, 16), dark(denim, 0.1), 100, -196, 16, { hatch: 0 });
    const up = new Path2D();
    up.moveTo(20, -190);
    up.lineTo(186, -190);
    up.lineTo(200, -70);
    up.quadraticCurveTo(330, -60, 360, -20);
    up.lineTo(360, 0);
    up.lineTo(-6, 0);
    up.quadraticCurveTo(-12, -110, 20, -190);
    up.closePath();
    cel(c, env, up, leather, 170, -80, 110, { hatch: 5 });
    // sole, laces, a pull tab
    c.fillStyle = C.ink;
    c.beginPath();
    c.roundRect(-14, -6, 384, 34, 14);
    c.fill();
    c.fillStyle = mix(C.s7, C.ink, 0.2);
    for (let i = 0; i < 5; i++) c.fillRect(-4 + i * 76, 22, 40, 12);
    c.strokeStyle = C.s1;
    c.lineWidth = 7;
    c.beginPath();
    for (let i = 0; i < 4; i++) {
      c.moveTo(150 + i * 14, -170 + i * 30);
      c.lineTo(214 + i * 16, -150 + i * 30);
    }
    c.stroke();
    c.restore();
  };
  const moth = (c: Ctx, env: Env, x: number, y: number, s: number, F: number) => {
    const fl = Math.abs(Math.sin((TAU * tw(F)) / 6));
    c.save();
    c.translate(x, y);
    c.scale(s, s);
    for (const sg of [-1, 1]) {
      c.save();
      c.scale(sg * lerp(0.3, 1, fl), 1);
      const w = new Path2D();
      w.moveTo(0, -4);
      w.bezierCurveTo(40, -60, 110, -50, 96, 4);
      w.bezierCurveTo(90, 30, 40, 50, 0, 10);
      w.closePath();
      cel(c, env, w, mix(C.s3, C.muted, 0.35), 50, -10, 44, { hatch: 3 });
      c.fillStyle = C.ink;
      c.beginPath();
      c.arc(58, -14, 9, 0, TAU);
      c.fill();
      c.restore();
    }
    cel(c, env, ell(0, 0, 10, 34), mix(C.s7, C.ink, 0.3), 0, 0, 10, { hatch: 0 });
    c.restore();
  };

  // ---------------------------------------------------------------- comic furniture
  let LATE: ((c: Ctx) => void)[] = [];
  /** SOUND WORDS: Inter 800 caps, each letter seeded ±8° and 0.9–1.2 (the first largest), sheared for lean, an
   *  ink stroke and an 8-step ink extrusion; letters pop 2 frames apart (0 → 1.25 → 1), hold, then shake out */
  const sfx = (
    word: string,
    x: number,
    y: number,
    sz: number,
    t0: number,
    F: number,
    o: { fill?: string; t1?: number; rot?: number; now?: boolean; free?: boolean } = {},
  ) => {
    const t1 = o.t1 ?? t0 + 30;
    if (F < t0 || F >= t1 + 6) return;
    LATE.push((c) => word3(c, word, x, y, sz, t0, F, t1, o));
  };
  const word3 = (
    c: Ctx,
    word: string,
    x: number,
    y: number,
    sz: number,
    t0: number,
    F: number,
    t1: number,
    o: { fill?: string; rot?: number; now?: boolean; free?: boolean },
  ) => {
    const seed = [...word].reduce((a, ch) => a + ch.charCodeAt(0), 0),
      chars = [...word],
      scl = chars.map((_, i) => (i === 0 ? 1.2 : 0.9 + 0.2 * hash(i, seed))),
      rot = chars.map((_, i) => (hash(i, seed + 1) - 0.5) * 16 * DEG),
      fo = { size: sz, family: F_.sans, weight: 800 },
      adv = chars.map((ch, i) => measure(c, ch, fo) * scl[i]! * 0.96),
      total = adv.reduce((a, b) => a + b, 0),
      out = prog(F, t1, t1 + 6);
    // keep the lettering inside the safe area (it may break over the letterbox bars)
    const fit = Math.min(1, ((SAFE.x1 - SAFE.x0) * 0.9) / (total * 1.1));
    if (!o.free) {
      x = clamp(x, SAFE.x0 + total * fit * 0.55, SAFE.x1 - total * fit * 0.55);
      y = clamp(y, SAFE.y0 + sz * 0.95, SAFE.y1 - sz * 0.15);
    }
    c.save();
    c.translate(x, y);
    c.rotate(o.rot ?? -0.06);
    c.transform(1, 0, -0.2, 1, 0, 0);
    c.scale(fit, fit);
    c.font = `800 ${sz}px "${F_.sans}"`;
    c.textBaseline = "alphabetic";
    c.textAlign = "center";
    c.lineJoin = "round";
    let cx = -total / 2;
    chars.forEach((ch, i) => {
      const f = F - t0 - 2 * i,
        w = adv[i]!;
      cx += w / 2;
      if (o.now || f >= 0) {
        const pop = o.now ? 1 : spring(f / FPS, { freq: 3.2, damp: 0.36 }),
          k = pop * scl[i]! * (1 - 0.5 * out),
          jx = (hash(i, Math.floor(F / 2)) - 0.5) * (2 + 30 * out) * u,
          jy = (hash(i + 9, Math.floor(F / 2)) - 0.5) * (2 + 30 * out) * u;
        if (k > 0.01) {
          c.save();
          c.globalAlpha *= 1 - out;
          c.translate(cx + jx, jy);
          c.rotate(rot[i]!);
          c.scale(k, k);
          c.fillStyle = C.ink;
          for (let e = 8; e >= 1; e--) c.fillText(ch, e * u, e * u);
          c.strokeStyle = C.ink;
          c.lineWidth = 6 * u;
          c.strokeText(ch, 0, 0);
          c.fillStyle = o.fill ?? C.s1;
          c.fillText(ch, 0, 0);
          c.restore();
        }
      }
      cx += w / 2;
    });
    c.restore();
  };
  /** CAPTION BOX: s1, a 3 px ink border, a hard 6 px ink shadow, −2°, Inter 800 caps, sliding in over 4 frames */
  const caption = (c: Ctx, R: R, s: string, F: number, t0: number, t1: number, at?: [number, number]) => {
    if (F < t0 || F >= t1) return;
    const sz = 52 * u,
      fo = { size: sz, family: F_.sans, weight: 800, track: 0.01 },
      tw_ = measure(c, s, fo),
      pad = 24 * u,
      bw = tw_ + pad * 2,
      bh = sz + pad * 1.3,
      slide = ease.outCubic(prog(F, t0, t0 + 4)),
      x = at ? at[0] : Math.max(R.x + 44 * u, SAFE.x0 - 20 * u),
      y = at ? at[1] : Math.max(R.y + 40 * u, tall ? SAFE.y0 : 0);
    c.save();
    c.translate(x - (1 - slide) * (bw + x + 40 * u), y);
    c.rotate(-2 * DEG);
    c.fillStyle = C.ink;
    c.fillRect(6 * u, 6 * u, bw, bh);
    c.fillStyle = C.s1;
    c.fillRect(0, 0, bw, bh);
    c.strokeStyle = C.ink;
    c.lineWidth = 3 * u;
    c.strokeRect(0, 0, bw, bh);
    text(c, s, pad, bh / 2 + sz * 0.36, { ...fo, color: C.ink });
    c.restore();
  };
  /** FOCUS LINES: 90 seeded ink wedges converging on (px, py), a clear ellipse left round the subject, on twos */
  const focus = (c: Ctx, R: R, px: number, py: number, rx: number, ry: number, F: number, a = 1) => {
    if (a <= 0) return;
    const seed = Math.floor(F / 2),
      D = Math.hypot(R.w, R.h);
    c.save();
    c.beginPath();
    c.rect(R.x, R.y, R.w, R.h);
    c.clip();
    c.globalAlpha *= a;
    c.fillStyle = C.ink;
    c.beginPath();
    for (let i = 0; i < 90; i++) {
      const ang = ((i + hash(i, seed) * 0.9) / 90) * TAU,
        wd = (2 + 8 * hash(i, seed + 3)) * u,
        ca = Math.cos(ang),
        sa = Math.sin(ang),
        k = 1 + 0.35 * hash(i, seed + 5),
        fx = px + ca * D,
        fy = py + sa * D;
      c.moveTo(px + ca * rx * k, py + sa * ry * k);
      c.lineTo(fx - sa * wd * 0.5, fy + ca * wd * 0.5);
      c.lineTo(fx + sa * wd * 0.5, fy - ca * wd * 0.5);
      c.closePath();
    }
    c.fill();
    c.restore();
  };
  /** SPEED LINES: 30–60 seeded streaks moving 80 px a frame against the motion */
  const speed = (c: Ctx, R: R, F: number, dir = 1, n = 48, seed = 1, a = 1) => {
    c.save();
    c.beginPath();
    c.rect(R.x, R.y, R.w, R.h);
    c.clip();
    const cols = [C.surface, C.accent, C.accent2];
    for (let i = 0; i < n; i++) {
      const len = (60 + 340 * hash(i, seed + 1)) * u,
        span = R.w + len,
        x = R.x - len + mod(hash(i, seed + 4) * span - 80 * u * F * dir, span),
        y = R.y + hash(i, seed) * R.h;
      c.globalAlpha = a * (0.6 + 0.3 * hash(i, seed + 3));
      c.fillStyle = cols[i % 3]!;
      c.fillRect(x, y, len, (1 + 2 * hash(i, seed + 2)) * u);
    }
    c.restore();
  };
  /** the comic alarm: a spiky s1 burst with an ink border and an ink exclamation mark drawn as shapes */
  const alarm = (c: Ctx, x: number, y: number, r: number, k: number, F: number) => {
    if (k <= 0) return;
    c.save();
    c.translate(x, y);
    c.scale(k, k);
    c.rotate(0.06 * Math.cos(Math.floor(F / 2) * 2.1));
    c.beginPath();
    for (let i = 0; i < 32; i++) {
      const rr = i % 2 ? r * 0.62 : r * (0.95 + 0.12 * hash(i, 3)),
        a = (i / 32) * TAU;
      c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    c.closePath();
    c.fillStyle = C.ink;
    c.save();
    c.translate(8 * u, 8 * u);
    c.fill();
    c.restore();
    c.fillStyle = C.s1;
    c.fill();
    c.strokeStyle = C.ink;
    c.lineWidth = 5 * u;
    c.lineJoin = "round";
    c.stroke();
    c.fillStyle = C.ink;
    c.beginPath();
    c.moveTo(-r * 0.13, -r * 0.5);
    c.lineTo(r * 0.13, -r * 0.5);
    c.lineTo(r * 0.06, r * 0.14);
    c.lineTo(-r * 0.06, r * 0.14);
    c.closePath();
    c.fill();
    c.beginPath();
    c.arc(0, r * 0.32, r * 0.1, 0, TAU);
    c.fill();
    c.restore();
  };
  /** IMPACT FRAME: the whole picture flips to a flat graphic, the characters pure ink, the word huge */
  const impact = (
    c: Ctx,
    env: Env,
    R: R,
    F: number,
    kind: "burst" | "split",
    word: string,
    draw: (c: Ctx) => void,
    at: [number, number] = [0.5, 0.5],
  ) => {
    const g = geo(R);
    c.save();
    c.beginPath();
    c.rect(R.x, R.y, R.w, R.h);
    c.clip();
    if (kind === "burst") {
      c.fillStyle = C.surface;
      c.fillRect(R.x, R.y, R.w, R.h);
      c.fillStyle = C.s1;
      const D = Math.hypot(R.w, R.h);
      for (let i = 0; i < 24; i += 2) {
        const a0 = (i / 24) * TAU + F * 0.02,
          a1 = ((i + 1) / 24) * TAU + F * 0.02;
        c.beginPath();
        c.moveTo(g.cx, g.cy);
        c.lineTo(g.cx + Math.cos(a0) * D, g.cy + Math.sin(a0) * D);
        c.lineTo(g.cx + Math.cos(a1) * D, g.cy + Math.sin(a1) * D);
        c.fill();
      }
    } else {
      c.fillStyle = C.s1;
      c.fillRect(R.x, R.y, R.w, R.h);
      c.fillStyle = C.accent;
      c.beginPath();
      c.moveTo(R.x + R.w * 0.62, R.y);
      c.lineTo(R.x + R.w, R.y);
      c.lineTo(R.x + R.w, R.y + R.h);
      c.lineTo(R.x + R.w * 0.3, R.y + R.h);
      c.fill();
    }
    sil(c, env, draw);
    c.restore();
    const sz = (tall ? 230 : 210) * u;
    LATE.push((cc) =>
      word3(
        cc,
        word,
        R.x + R.w * (tall ? 0.5 : at[0]),
        tall ? R.y + R.h * 0.24 : R.y + R.h * at[1] + sz * 0.35,
        sz,
        F - 40,
        F,
        F + 100,
        { now: true },
      ),
    );
  };
  /** a comic dust puff: scalloped surface circles with ink on the shadow side, expanding and fading on twos */
  const puff = (c: Ctx, env: Env, x: number, y: number, r: number, F: number, t0: number, life = 14) => {
    const t = tw(F) - t0;
    if (t < 0 || t >= life) return;
    const q = t / life,
      k = ease.outCubic(q);
    c.save();
    c.globalAlpha *= 1 - q * q;
    for (let i = 0; i < 7; i++) {
      const a = Math.PI + (i / 6) * Math.PI,
        rr = r * (0.35 + 0.25 * hash(i, t0)) * (1 - 0.4 * q);
      const px = x + Math.cos(a) * r * (0.4 + 0.9 * k),
        py = y + Math.sin(a) * r * 0.45 * (0.4 + 0.9 * k) - r * 0.1;
      cel(c, env, circ(px, py, rr), mix(C.surface, C.ground, 0.5), px, py, rr, { hatch: 0, rim: false, v: 0.25 });
    }
    c.restore();
  };
  const star5 = (c: Ctx, x: number, y: number, r: number, rot: number) => {
    c.save();
    c.translate(x, y);
    c.rotate(rot);
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const rr = i % 2 ? r * 0.45 : r,
        a = (i / 10) * TAU - Math.PI / 2;
      c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    c.closePath();
    c.fillStyle = C.s1;
    c.fill();
    c.strokeStyle = C.ink;
    c.lineWidth = 3 * u;
    c.lineJoin = "round";
    c.stroke();
    c.restore();
  };
  /** a four-point sparkle (dew) */
  const sparkle = (c: Ctx, x: number, y: number, r: number) => {
    if (r <= 0.3) return;
    c.fillStyle = C.s1;
    c.beginPath();
    c.moveTo(x, y - r);
    c.lineTo(x + r * 0.22, y - r * 0.22);
    c.lineTo(x + r, y);
    c.lineTo(x + r * 0.22, y + r * 0.22);
    c.lineTo(x, y + r);
    c.lineTo(x - r * 0.22, y + r * 0.22);
    c.lineTo(x - r, y);
    c.lineTo(x - r * 0.22, y - r * 0.22);
    c.closePath();
    c.fill();
  };

  // ---------------------------------------------------------------- scenery
  /** the frame being painted (set by paint each frame), so far scenery can drift on ones without threading F */
  let FNOW = 0;
  /** far comic cumulus for the vertical's tall skies: a flat fill tinted to the sky, one halftone shadow on the
   *  underside, ink on the shadow side only, misregistered (a cyan and a magenta copy) as out of focus, drifting
   *  on ones; the same sky carries across cuts because it reads the frame, not the shot */
  const clouds = (c: Ctx, env: Env, R: R, mode: Mode, hz: number) => {
    const k = R.w / 1080,
      top = R.y + R.h * 0.06,
      tint = (t: number) =>
        mode === "dusk"
          ? mix(C.s3, C.accent, 0.3 + 0.25 * t)
          : mode === "dawn"
            ? mix(C.s3, C.surface, 0.4 - 0.2 * t)
            : mix(C.sky, C.surface, 0.66 - 0.3 * t),
      d = dof(30, 4, k);
    /** one cumulus outline: a flat base at y, n rounded bumps over it, tallest in the middle */
    const puff = (x0: number, y: number, cw: number, ch: number, n: number, seed: number) => {
      const p = new Path2D();
      p.moveTo(x0, y);
      let x = x0,
        py = y - ch * 0.22;
      p.lineTo(x0 + cw * 0.02, py);
      for (let j = 0; j < n; j++) {
        const bw = cw / n,
          mid = Math.sin((Math.PI * (j + 0.5)) / n),
          ny = j === n - 1 ? y - ch * 0.2 : y - ch * (0.3 + 0.45 * mid + 0.15 * hash(j, seed));
        p.quadraticCurveTo(x + bw / 2, Math.min(py, ny) - ch * (0.25 + 0.35 * mid), x + bw, ny);
        x += bw;
        py = ny;
      }
      p.lineTo(x0 + cw, y);
      p.closePath();
      return p;
    };
    const draw = (p: Path2D, col: string, cx: number, cy: number, sz: number) => {
      c.save();
      c.globalAlpha *= 0.55;
      c.fillStyle = C.accent2;
      c.translate(-d, 0);
      c.fill(p);
      c.fillStyle = C.accent;
      c.translate(2 * d, 0);
      c.fill(p);
      c.restore();
      cel(c, env, p, col, cx, cy, sz, { hatch: 4, sh: 0.22 });
    };
    // a towering bank on the horizon (it rises behind the hedge), crawling; not at dusk, whose low light turns
    // its shadow side into dark fins against the bright bands
    if (mode !== "dusk") {
      const cw = R.w * 1.5,
        ch = Math.min(R.h * 0.2, (hz - top) * 0.45),
        span = R.w + cw,
        x0 = R.x - cw + mod(R.w * 0.55 + FNOW * 0.12 * u, span);
      for (const dx of [0, -span]) {
        const p = puff(x0 + dx, hz + 10 * k, cw, ch, 7, 311);
        draw(p, tint(1), x0 + dx + cw / 2, hz - ch * 0.5, ch * 0.6);
      }
    }
    // loose cumulus through the upper sky, each at its own drift
    const n = 6,
      room = hz - R.h * 0.2 - top;
    for (let i = 0; i < n; i++) {
      const cw = (380 + 320 * hash(i, 301)) * k,
        ch = cw * (0.32 + 0.12 * hash(i, 302)),
        span = R.w + cw * 2 + R.w * 0.4,
        x0 = R.x - cw - R.w * 0.2 + mod(hash(i, 303) * span + FNOW * (0.3 + 0.45 * hash(i, 304)) * u, span),
        y = top + ch + room * ((i + 0.2 + 0.6 * hash(i, 305)) / n),
        p = puff(x0, y, cw, ch, 4 + Math.floor(3 * hash(i, 306)), i + 307);
      draw(p, tint(0.4 * hash(i, 308)), x0 + cw / 2, y - ch * 0.5, ch * 0.6);
    }
  };
  const skyBands = (c: Ctx, env: Env, R: R, mode: Mode, hz: number) => {
    const cols = SKY[mode],
      fr = [0, 0.38, 0.64, 0.84, 1],
      x0 = R.x - R.w,
      w = R.w * 3;
    for (let i = 0; i < 4; i++) {
      const y0 = i === 0 ? R.y - R.h : lerp(R.y, hz, fr[i]!),
        y1 = lerp(R.y, hz, fr[i + 1]!);
      c.fillStyle = cols[i]!;
      c.fillRect(x0, y0, w, y1 - y0 + (i === 3 ? R.h * 2 : 1));
      if (i < 3) {
        const p = new Path2D(),
          q = new Path2D();
        p.rect(x0, y1 - 14 * u, w, 14 * u);
        q.rect(x0, y1 - 30 * u, w, 16 * u);
        dots(c, env, p, 0.45, cols[i + 1]!);
        dots(c, env, q, 0.25, cols[i + 1]!);
      }
    }
    // the vertical's deep skies get far clouds, so the upper two thirds hold something; only the full tall
    // picture (never a comic panel, whose tall boxes would otherwise qualify), and only where the sky is deep
    if (mode !== "night" && tall && R.w > W * 0.8 && hz - R.y > R.h * 0.35)
      clouds(c, env, R, mode, Math.min(hz, R.y + R.h));
  };
  const sun = (c: Ctx, x: number, y: number, r: number, F: number, col: string = C.s1, rays = true) => {
    if (rays) {
      c.save();
      c.globalAlpha *= 0.5;
      c.fillStyle = col;
      c.beginPath();
      for (let i = 0; i < 20; i++) {
        const a = (i / 20) * TAU + F * 0.0035,
          d = r * 11;
        c.moveTo(x, y);
        c.lineTo(x + Math.cos(a - 0.018) * d, y + Math.sin(a - 0.018) * d);
        c.lineTo(x + Math.cos(a + 0.018) * d, y + Math.sin(a + 0.018) * d);
        c.closePath();
      }
      c.fill();
      c.restore();
    }
    c.fillStyle = col;
    c.beginPath();
    c.arc(x, y, r, 0, TAU);
    c.fill();
  };
  const hedge = (
    c: Ctx,
    env: Env,
    x0: number,
    x1: number,
    base: number,
    h: number,
    seed: number,
    col: string,
    k: number,
  ) => {
    // one scalloped outline (a single closed path, so the ink and the rim only ever follow its edge)
    const p = new Path2D();
    let x = x0 - 40 * k,
      i = 0,
      y = base - h * (0.62 + 0.3 * hash(0, seed + 1));
    p.moveTo(x, base + 30 * k);
    p.lineTo(x, y);
    while (x < x1 + 40 * k) {
      const bw = (70 + 60 * hash(i, seed)) * k,
        ny = base - h * (0.62 + 0.3 * hash(i + 1, seed + 1));
      p.quadraticCurveTo(x + bw / 2, Math.min(y, ny) - bw * 0.7, x + bw, ny);
      x += bw;
      y = ny;
      i++;
    }
    p.lineTo(x, base + 30 * k);
    p.closePath();
    cel(c, env, p, col, (x0 + x1) / 2, base - h * 0.5, h * 0.5, { hatch: 0, sh: 0.12 });
  };
  /** the ground from the horizon down: a far band and the meadow, flat, with tufts */
  const meadow = (c: Ctx, env: Env, R: R, hz: number, mode: Mode, k: number, seed = 3, tufts = 40) => {
    const far =
      mode === "dusk" ? mix(GRASS, C.accent, 0.3) : mode === "dawn" ? mix(GRASS, C.s3, 0.3) : mix(GRASS, C.sky, 0.3);
    const near = mode === "dusk" ? mix(GRASS, C.s2, 0.25) : mode === "night" ? mix(GRASS, C.deep, 0.6) : GRASS;
    c.fillStyle = far;
    c.fillRect(R.x - R.w, hz, R.w * 3, R.h * 2);
    c.fillStyle = near;
    c.fillRect(R.x - R.w, hz + 26 * k, R.w * 3, R.h * 2);
    const band = new Path2D();
    band.rect(R.x - R.w, hz + 26 * k - 18 * u, R.w * 3, 18 * u);
    dots(c, env, band, 0.45, near);
    c.fillStyle = dark(near, 0.25);
    c.beginPath();
    for (let i = 0; i < tufts; i++) {
      const tx = R.x - R.w * 0.5 + hash(i, seed) * R.w * 2,
        d = hash(i, seed + 1),
        ty = hz + 40 * k + d * (R.y + R.h - hz),
        th = (8 + 22 * d) * k;
      c.moveTo(tx - th * 0.6, ty);
      c.lineTo(tx - th * 0.3, ty - th);
      c.lineTo(tx, ty - th * 0.2);
      c.lineTo(tx + th * 0.25, ty - th * 1.2);
      c.lineTo(tx + th * 0.6, ty);
      c.closePath();
    }
    c.fill();
  };
  /** huge foreground blades (the near grass), each a cel form; bounce sways them */
  const blades = (
    c: Ctx,
    env: Env,
    R: R,
    k: number,
    seed: number,
    n: number,
    base: number,
    hMax: number,
    bounce = 0,
    span?: [number, number],
  ) => {
    const [a, b] = span ?? [R.x - R.w * 0.2, R.x + R.w * 1.2];
    for (let i = 0; i < n; i++) {
      const x = a + (b - a) * ((i + hash(i, seed) * 0.8) / n),
        hh = hMax * (0.45 + 0.55 * hash(i, seed + 1)) * k,
        bend = (hash(i, seed + 2) - 0.5) * 60 * k + bounce * 40 * k * Math.sin(i * 1.7),
        wd = (26 + 18 * hash(i, seed + 3)) * k;
      c.save();
      c.translate(x, base + 20 * k);
      cel(c, env, leaf(hh, wd, bend), i % 3 ? GDARK : mix(GDARK, GRASS, 0.45), bend * 0.4, -hh * 0.5, wd, {
        hatch: 0,
        sh: 0.22,
      });
      c.restore();
    }
  };
  const clover = (c: Ctx, env: Env, x: number, y: number, r: number) => {
    for (let i = 0; i < 3; i++) {
      const a = -Math.PI / 2 + (i / 3) * TAU,
        px = x + Math.cos(a) * r * 0.62,
        py = y + Math.sin(a) * r * 0.5;
      cel(c, env, ell(px, py, r * 0.55, r * 0.42, a), mix(GRASS, GDARK, 0.35), px, py, r * 0.5, { hatch: 0, ink: 3 });
    }
  };
  /** the bank and its burrow mouths (hole centres returned) */
  const bank = (
    c: Ctx,
    env: Env,
    cx: number,
    gy: number,
    w: number,
    h: number,
    holes: number[],
    k: number,
    mode: Mode,
  ) => {
    const p = new Path2D();
    p.moveTo(cx - w / 2, gy + 30 * k);
    p.bezierCurveTo(cx - w * 0.36, gy - h * 1.1, cx + w * 0.3, gy - h * 1.15, cx + w / 2, gy + 30 * k);
    p.closePath();
    const earth = mode === "night" ? mix(EARTH, C.deep, 0.5) : mode === "dusk" ? mix(EARTH, C.s2, 0.25) : EARTH;
    cel(c, env, p, earth, cx, gy - h * 0.4, h * 0.8, { hatch: 6, sh: 0.1 });
    // the grass cap
    c.save();
    c.clip(p);
    const cap = new Path2D();
    cap.moveTo(cx - w / 2, gy - h * 0.2);
    cap.bezierCurveTo(cx - w * 0.36, gy - h * 1.3, cx + w * 0.3, gy - h * 1.35, cx + w / 2, gy - h * 0.2);
    cap.lineTo(cx + w / 2, gy - h * 2);
    cap.lineTo(cx - w / 2, gy - h * 2);
    cap.closePath();
    const capC = mode === "night" ? mix(GDARK, C.deep, 0.5) : mode === "dusk" ? mix(GRASS, C.s2, 0.3) : GRASS;
    cel(c, env, cap, capC, cx, gy - h, h * 0.3, { hatch: 0 });
    c.restore();
    return holes.map((fx) => {
      const hx = cx + (fx - 0.5) * w,
        hy = gy - h * 0.2,
        rx = 76 * k,
        ry = 56 * k;
      c.fillStyle = C.deep;
      c.beginPath();
      c.ellipse(hx, hy, rx, ry, 0, Math.PI, TAU);
      c.lineTo(hx + rx, hy + ry * 0.55);
      c.lineTo(hx - rx, hy + ry * 0.55);
      c.fill();
      c.strokeStyle = C.ink;
      c.lineWidth = 5 * u;
      c.beginPath();
      c.ellipse(hx, hy, rx, ry, 0, Math.PI * 1.05, Math.PI * 1.95);
      c.stroke();
      return [hx, hy, rx, ry] as [number, number, number, number];
    });
  };
  /** inside the burrow mouth (and, with `above`, the air over it, so ears can rise out of the hole) */
  const holeClip = (c: Ctx, h: [number, number, number, number], above = false) => {
    const [hx, hy, rx, ry] = h;
    c.beginPath();
    c.ellipse(hx, hy, rx * 0.96, ry * 0.96, 0, Math.PI, TAU);
    c.lineTo(hx + rx * 0.96, hy + ry * 0.5);
    c.lineTo(hx - rx * 0.96, hy + ry * 0.5);
    c.closePath();
    if (above) c.rect(hx - rx * 1.6, hy - ry * 12, rx * 3.2, ry * 11.6);
    c.clip();
  };
  /** a scalloped cloud outline round an ellipse (one closed path) */
  const scallop = (cx: number, cy: number, rx: number, ry: number, n: number, seed: number, amp: number) => {
    const p = new Path2D(),
      at = (a: number, g = 0): [number, number] => [cx + Math.cos(a) * (rx + g), cy + Math.sin(a) * (ry + g)];
    p.moveTo(...at(0));
    for (let i = 0; i < n; i++) {
      const [qx, qy] = at(((i + 0.5) / n) * TAU, amp * (0.7 + 0.6 * hash(i, seed)) * 2),
        [bx, by] = at(((i + 1) / n) * TAU);
      p.quadraticCurveTo(qx, qy, bx, by);
    }
    p.closePath();
    return p;
  };

  // ================================================================ SCENES: each a function of (F, R)
  // 00 · the hook: an extreme close-up of the eye in the dark; it snaps open, the pupil shrinks in the light
  const hookEye = (c: Ctx, env: Env, F: number, R: R, o: Opt = {}) => {
    const g = geo(R),
      Tc = tw(F),
      k = g.k;
    light("night");
    LX = 0.2;
    LY = -1;
    RIM = C.s3;
    c.fillStyle = C.deep;
    c.fillRect(R.x, R.y, R.w, R.h);
    // a thin rim of dawn light from above, with halftone falloff into the dark
    const rimY = R.y + R.h * (g.tall ? 0.16 : 0.12);
    const arcP = new Path2D();
    arcP.moveTo(R.x - 10, R.y - 10);
    arcP.lineTo(R.x + R.w + 10, R.y - 10);
    arcP.lineTo(R.x + R.w + 10, rimY - 60 * k);
    arcP.quadraticCurveTo(g.cx, rimY + 40 * k, R.x - 10, rimY - 60 * k);
    arcP.closePath();
    c.fillStyle = C.s3;
    c.fill(arcP);
    for (let i = 0; i < 3; i++) {
      const band = new Path2D();
      band.moveTo(R.x - 10, rimY - 60 * k + i * 44 * k);
      band.quadraticCurveTo(g.cx, rimY + 40 * k + i * 44 * k, R.x + R.w + 10, rimY - 60 * k + i * 44 * k);
      band.lineTo(R.x + R.w + 10, rimY - 16 * k + i * 44 * k);
      band.quadraticCurveTo(g.cx, rimY + 84 * k + i * 44 * k, R.x - 10, rimY - 16 * k + i * 44 * k);
      band.closePath();
      dots(c, env, band, [0.7, 0.45, 0.25][i]!, mix(C.s3, C.deep, 0.25 + i * 0.2));
    }
    c.fillStyle = C.ink;
    c.fillRect(R.x, rimY - 60 * k, R.w, 3 * u);
    const open = o.mini
        ? 1 - (mod(F, 48) < 4 ? Math.sin((Math.PI * mod(tw(F), 48)) / 4) : 0)
        : clamp(spring((Tc - 6) / FPS, { freq: 4, damp: 0.55 }), 0, 1.2),
      pupil = o.mini ? 0.45 : lerp(0.86, 0.42, ease.outCubic(prog(Tc, 10, 22))),
      push = o.mini ? 1 : lerp(1, 1.05, F / 48);
    const pose = rp({
      neck: 0.1,
      pitch: -0.05,
      eye: Math.min(1, open),
      pupil,
      e0: -0.15 + 0.07 * Math.cos((Math.PI * Tc) / 2),
      e1: -0.3 - 0.07 * Math.cos((Math.PI * Tc) / 2),
      tw: twitch(Tc, 2),
    });
    const s = (g.tall ? 8.2 : 8.8) * k * push,
      ex = g.tall ? g.cx - 40 * k : R.x + R.w * 0.44,
      ey = g.tall ? g.cy + 60 * k : g.cy + 30 * k,
      fur = mix(C.s7, C.deep, 0.42);
    rabbitAt(c, env, ex, ey, s, pose, { fur, whisk: false });
    // pop marks when the eye snaps open
    if (!o.mini && F >= 10 && F < 22) {
      const a = 1 - prog(F, 14, 22);
      c.save();
      c.globalAlpha *= a;
      c.strokeStyle = C.s1;
      c.lineWidth = 7 * u;
      c.lineCap = "round";
      for (let i = 0; i < 5; i++) {
        const ang = -Math.PI * 0.85 + i * 0.3,
          r0 = 130 * s * 0.11 + prog(F, 10, 16) * 30 * k;
        c.beginPath();
        c.moveTo(ex + Math.cos(ang) * r0, ey + Math.sin(ang) * r0);
        c.lineTo(ex + Math.cos(ang) * (r0 + 50 * k), ey + Math.sin(ang) * (r0 + 50 * k));
        c.stroke();
      }
      c.restore();
    }
    // the whiskers, out of focus in front: misregistered
    fringe(c, env, o.mini ? 0 : 8 * u, 1, 0, (cc) => rabbitAt(cc, env, ex, ey, s, pose, { fur, only: "whisk" }));
    if (!o.mini) caption(c, R, "DAWN.", F, 24, 48);
  };

  // 01 · the emergence: a wide at grass height; the bank, the burrow, the sun, mist, the hedge far right
  const emerge = (c: Ctx, env: Env, F: number, R: R) => {
    const g = geo(R),
      k = g.k,
      Tc = tw(F);
    light("dawn");
    const cam: Cam = { x: 0, y: 0, zoom: lerp(1, 1.08, ease.inOutCubic(prog(F, 48, 96))), tilt: 0 };
    lay(c, R, cam, Infinity, (cc) => {
      skyBands(cc, env, R, "dawn", g.hz);
      sun(cc, R.x + R.w * (g.tall ? 0.72 : 0.78), g.hz - (20 + 30 * prog(F, 48, 96)) * k, 64 * k, F);
      // mist bands
      cc.fillStyle = C.surface;
      for (let i = 0; i < 3; i++) {
        cc.globalAlpha = 0.28;
        const mx = R.x + mod(i * 610 * k + F * (0.6 + 0.3 * i) * u, R.w + 800 * k) - 600 * k;
        cc.beginPath();
        cc.roundRect(mx, g.hz - (70 - i * 34) * k, (500 + 140 * i) * k, 16 * k, 8 * k);
        cc.fill();
      }
      cc.globalAlpha = 1;
    });
    flay(c, env, R, cam, 30, 4, (cc) =>
      hedge(cc, env, R.x + R.w * 0.6, R.x + R.w * 1.3, g.hz + 16 * k, 150 * k, 5, mix(GDARK, C.s2, 0.35), k),
    );
    lay(c, R, cam, 8, (cc) => meadow(cc, env, R, g.hz, "dawn", k, 4, 50));
    const bw = (g.tall ? 700 : 760) * k,
      bx = R.x + R.w * (g.tall ? 0.4 : 0.36);
    lay(c, R, cam, 4, (cc) => {
      const [hole] = bank(cc, env, bx, g.gy, bw, 250 * k, [0.42], k, "dawn");
      const s = 1.6 * k;
      if (Tc < 60) return;
      if (Tc < 72) {
        // ear tips, then the head, rising inside the burrow mouth
        const rise = ease.outCubic(prog(Tc, 60, 70));
        cc.save();
        holeClip(cc, hole!, true);
        rabbit(
          cc,
          env,
          hole![0] - 60 * s,
          hole![1] + lerp(230, 120, rise) * s,
          s,
          rp({ e0: -0.05, e1: -0.2, tw: twitch(Tc) }),
        );
        cc.restore();
        return;
      }
      if (Tc < 84) {
        const h = hop(Tc, 72, 50);
        rabbit(
          cc,
          env,
          lerp(hole![0] - 50 * s, hole![0] + 190 * s, h.step),
          lerp(hole![1] + 60 * s, g.gy, ease.outCubic(Math.min(1, h.step))),
          s,
          h.p,
        );
        return;
      }
      const up = ease.outBack(prog(Tc, 84, 90));
      const a = alert(Tc),
        p = rp({ ...a, pitch: lerp(-0.12, a.pitch, up), neck: lerp(0.15, a.neck, up), fd: up });
      rabbit(cc, env, hole![0] + 190 * s, g.gy, s, p);
    });
    flay(c, env, R, cam, 0.7, 4, (cc) => blades(cc, env, R, k, 7, g.tall ? 7 : 11, R.y + R.h, g.tall ? 520 : 420, 0));
  };

  // 02 · grazing: a side-on mid shot, the camera trucking right; also the shadow pass and the thump
  const mid = (c: Ctx, env: Env, F: number, R: R, mode: "graze" | "shadow" | "thump") => {
    const g = geo(R),
      k = g.k,
      Tc = tw(F);
    light("day");
    const sx = mode === "thump" ? shake(F, 288, 6) : 0,
      cam: Cam = { x: (F - 96) * 0.9 * u, y: 0, zoom: 1, tilt: 0, sx, sy: sx * 0.6 };
    lay(c, R, cam, Infinity, (cc) => {
      skyBands(cc, env, R, "day", g.hz - 40 * k);
      sun(cc, R.x + R.w * 0.2, R.y + R.h * 0.14, 48 * k, F, mix(C.s1, C.surface, 0.3), false);
    });
    flay(c, env, R, cam, 30, 4, (cc) =>
      hedge(cc, env, R.x - R.w * 0.5, R.x + R.w * 2, g.hz - 30 * k, 190 * k, 9, GDARK, k),
    );
    lay(c, R, cam, 8, (cc) => meadow(cc, env, R, g.hz - 40 * k, "day", k, 11, 60));
    const s = (g.tall ? 1.9 : 2.1) * k,
      rx = R.x + R.w * (g.tall ? 0.34 : 0.4) + (F - 96) * 0.9 * u;
    lay(c, R, cam, 4, (cc) => {
      for (let i = 0; i < 9; i++) {
        const cx = R.x + hash(i, 21) * R.w * 1.6,
          cy = g.gy - 10 * k + hash(i, 22) * 60 * k;
        clover(cc, env, cx, cy, (26 + 16 * hash(i, 23)) * k);
      }
      let p: RP;
      if (mode === "graze") p = graze(Tc, [120, 168]);
      else if (mode === "shadow") p = Tc < 198 ? graze(Tc) : rp({ ...freeze(F), flat: 0, e0: -0.1, neck: 0.3 });
      else {
        p = rp({ ...alert(Tc), pitch: -0.35, neck: 0.1, fd: 0, flat: 0.4, pupil: 0.34, lift: thumpLift(Tc, 284) }); // the foot slams on the 288 hit
        if (Tc >= 298) p = bolt(Tc);
      }
      rabbit(cc, env, rx, g.gy, s, p);
      if (mode === "thump") {
        // two ground rings from the foot
        const t = F - 288;
        for (let i = 0; i < 2; i++) {
          const q = prog(t - i * 3, 0, 12);
          if (q <= 0 || q >= 1) continue;
          cc.strokeStyle = C.ink;
          cc.globalAlpha = 1 - q;
          cc.lineWidth = 3 * u;
          cc.beginPath();
          cc.ellipse(rx - 10 * s, g.gy, (30 + 220 * q) * k, (8 + 50 * q) * k, 0, 0, TAU);
          cc.stroke();
          cc.globalAlpha = 1;
        }
      }
      // dew: four-point sparkles
      for (let i = 0; i < 7; i++) {
        const x = R.x + hash(i, 31) * R.w * 1.5,
          y = g.gy - hash(i, 32) * 70 * k,
          tw_ = Math.max(0, Math.sin(F * 0.35 + i * 2.1));
        sparkle(cc, x, y, 14 * k * tw_);
      }
    });
    flay(c, env, R, cam, 0.7, 4, (cc) =>
      blades(cc, env, R, k, 13, 5, R.y + R.h, 360, 0, [
        R.x + (F - 96) * 0.4 * u + R.w * 0.62,
        R.x + (F - 96) * 0.4 * u + R.w * 1.1,
      ]),
    );
    if (mode === "graze") caption(c, R, "BREAKFAST.", F, 96, 144);
    if (mode === "shadow") {
      const q = prog(F, 192, 204);
      if (g.tall)
        hawkShadow(
          c,
          env,
          lerp(R.x + R.w * 1.3, R.x - R.w * 0.4, q),
          lerp(g.gy - 520 * k, g.gy + 80 * k, q),
          3.2 * k,
          Math.sin(F * 0.5),
        );
      else hawkShadow(c, env, lerp(R.x + R.w * 1.2, R.x - R.w * 0.25, q), g.gy - 20 * k, 3.4 * k, Math.sin(F * 0.5));
    }
    if (mode === "thump") {
      sfx("THUMP", rx + (g.tall ? 40 : 400) * k, g.gy - (g.tall ? 380 : 330) * k, (g.tall ? 200 : 170) * u, 280, F, {
        // staggered from 280 so the whole word has popped by the slam (the shot opens at 288) and holds to the cut
        t1: 300,
        rot: -0.1,
      });
    }
  };

  // 02b · the macro: the muzzle pulling in a clover leaf, the near grass heavily fringed
  const macro = (c: Ctx, env: Env, F: number, R: R) => {
    const g = geo(R),
      k = g.k,
      Tc = tw(F);
    light("day");
    const cam: Cam = { x: (F - 144) * 0.5 * u, y: 0, zoom: lerp(1, 1.04, prog(F, 144, 192)), tilt: 0 };
    flay(c, env, R, cam, 12, 1.5, (cc) => {
      skyBands(cc, env, R, "day", g.hz - 120 * k);
      meadow(cc, env, R, g.hz - 120 * k, "day", k * 1.6, 17, 30);
    });
    const s = (g.tall ? 4.2 : 4.6) * k,
      p = graze(Tc),
      mx = g.tall ? g.cx + 170 * k : R.x + R.w * 0.62,
      my = g.tall ? g.cy + 200 * k : g.cy + 70 * k;
    lay(c, R, cam, 1.5, (cc) => {
      rabbitAt(cc, env, mx, my, s, p, {}, [44, 4]);
      // the leaf pulled in on twos, stem down to the ground
      const pull = ease.inOutCubic(prog(Tc, 150, 186)),
        lx = mx + lerp(80, 12, pull) * k,
        ly = my + lerp(60, 14, pull) * k + p.chew * 6 * k;
      cc.strokeStyle = GDARK;
      cc.lineWidth = 8 * k;
      cc.beginPath();
      cc.moveTo(lx, ly);
      cc.quadraticCurveTo(lx + 60 * k, ly + 120 * k, lx + 20 * k, R.y + R.h + 20);
      cc.stroke();
      clover(cc, env, lx + 20 * k, ly + 10 * k, 60 * k);
    });
    flay(c, env, R, cam, 0.5, 1.5, (cc) =>
      blades(cc, env, R, k, 19, g.tall ? 5 : 8, R.y + R.h, 640, 0, [R.x - R.w * 0.1, R.x + R.w * 0.45]),
    );
  };

  // 03 · the eye again: ears snap up, a tiny hawk crosses the glint; the alarm lands
  const eyeScene = (c: Ctx, env: Env, F: number, R: R, kind: "hawk" | "dog", o: Opt = {}) => {
    const g = geo(R),
      k = g.k,
      Tc = tw(F),
      t0 = kind === "hawk" ? 204 : 660;
    light("day");
    const cam: Cam = { x: 0, y: 0, zoom: lerp(1, 1.06, prog(F, t0, t0 + 24)), tilt: 0 };
    flay(
      c,
      env,
      R,
      cam,
      14,
      1,
      (cc) => {
        skyBands(cc, env, R, "day", g.hz + 60 * k);
        meadow(cc, env, R, g.hz + 60 * k, "day", k * 1.5, 23, 24);
      },
      o.mini,
    );
    const snap = spring((Tc - t0) / FPS, { freq: 3.6, damp: 0.45 });
    const pose = rp({
      neck: 0.05,
      pitch: -0.08,
      e0: lerp(-0.35, 0.05, snap),
      e1: lerp(-0.5, -0.1, snap),
      pupil: lerp(0.55, 0.3, clamp(snap)),
      px: Math.floor(F / 2) % 2 ? 1.5 : -1.5,
      tw: twitch(Tc, 4),
    });
    const s = (g.tall ? 8.4 : 8.4) * k,
      ex = g.tall ? g.cx - 30 * k : R.x + R.w * 0.36,
      ey = g.tall ? g.cy + 180 * k : g.cy + 60 * k;
    lay(c, R, cam, 1, (cc) =>
      rabbitAt(cc, env, ex, ey, s, pose, {
        inEye:
          kind === "hawk"
            ? (ec, x, y, r) => {
                const q = prog(F, 204, 216);
                if (q <= 0 || q >= 1) return;
                ec.save();
                ec.translate(lerp(x + r, x - r, q), y - r * 0.55);
                ec.scale(0.035, 0.035);
                ec.fillStyle = C.surface;
                ec.fill(hawkPath(Math.sin(tw(F) * 0.8)));
                ec.restore();
              }
            : undefined,
      }),
    );
    if (o.mini) return;
    const ak = spring((F - (t0 + 12)) / FPS, { freq: 3.4, damp: 0.4 });
    if (kind === "hawk") {
      if (F >= 216) focus(c, R, ex, ey, 300 * k, 260 * k, F, 1);
      alarm(c, g.tall ? g.cx + 250 * k : R.x + R.w * 0.74, g.tall ? R.y + R.h * 0.3 : g.cy - 90 * k, 190 * k, ak, F);
    } else {
      focus(c, R, ex, ey, 300 * k, 260 * k, F, 1);
      // shock lines round the eye
      c.save();
      c.strokeStyle = C.ink;
      c.lineWidth = 8 * u;
      c.lineCap = "round";
      for (let i = 0; i < 4; i++) {
        const a = -Math.PI * 0.8 + i * 0.35,
          r0 = 150 * k + prog(F, 660, 664) * 20 * k;
        c.beginPath();
        c.moveTo(ex + Math.cos(a) * r0, ey + Math.sin(a) * r0);
        c.lineTo(ex + Math.cos(a) * (r0 + 60 * k), ey + Math.sin(a) * (r0 + 60 * k));
        c.stroke();
      }
      c.restore();
    }
  };

  // 03b · low angle up at the bright sky, a 10° Dutch tilt, the hawk circling as a backlit silhouette
  const skyHawk = (c: Ctx, env: Env, F: number, R: R, o: Opt = {}, stoop = false) => {
    const g = geo(R),
      k = g.k,
      Tc = tw(F);
    light("day");
    const cam: Cam = { x: 0, y: 0, zoom: 1.12, tilt: 10 * DEG };
    lay(c, R, cam, Infinity, (cc) => {
      skyBands(cc, env, R, "day", R.y + R.h * 1.2);
      sun(cc, R.x + R.w * 0.72, R.y + R.h * 0.22, 70 * k, F);
    });
    if (stoop) {
      // the hawk folds and stoops straight at the lens
      const q = ease.inCubic(prog(F, 276, 288)),
        sc = lerp(0.3, 1.6, q) * (g.tall ? 3.4 : 3.6) * k,
        hy = g.tall ? lerp(R.y + R.h * 0.2, g.cy, q) : g.cy;
      focus(c, R, g.cx, hy, 110 * sc, 110 * sc, F);
      hawk(c, env, g.cx, hy, sc, 0.2, 1);
      return;
    }
    const a = Tc * 0.07,
      cy = R.y + R.h * (g.tall ? 0.3 : 0.42),
      hx = g.cx + Math.cos(a) * (g.tall ? 260 : 360) * k,
      hy = cy + Math.sin(a) * 70 * k;
    hawk(
      c,
      env,
      hx,
      hy,
      (g.tall ? 2.4 : 2.3) * k * (1 + 0.1 * Math.sin(a)),
      Math.sin((TAU * Tc) / 10),
      0,
      Math.cos(a) * 0.25,
    );
    flay(
      c,
      env,
      R,
      { ...cam, zoom: 1 },
      0.8,
      4,
      (cc) => {
        cc.save();
        const oL = LX;
        blades(cc, env, R, k, 29, 9, R.y + R.h, g.tall ? 300 : 230, 0);
        LX = oL;
        cc.restore();
      },
      o.mini,
    );
  };

  // 04 · the sticker freeze: the rabbit cut out on a tilted accent square over deep, specks drifting
  const sticker = (c: Ctx, env: Env, F: number, R: R) => {
    const g = geo(R),
      k = g.k;
    c.fillStyle = C.deep;
    c.fillRect(R.x, R.y, R.w, R.h);
    for (let i = 0; i < 70; i++) {
      const x = R.x + mod(hash(i, 41) * R.w + F * (0.4 + hash(i, 42)) * u * 1.5, R.w),
        y = R.y + mod(hash(i, 43) * R.h - F * 0.5 * u, R.h),
        r = (2 + 4 * hash(i, 44)) * u;
      c.fillStyle = i % 3 ? C.surface : C.s1;
      c.globalAlpha = 0.5 + 0.4 * hash(i, 45);
      c.beginPath();
      c.arc(x, y, r, 0, TAU);
      c.fill();
    }
    c.globalAlpha = 1;
    const qx = g.tall ? g.cx : R.x + R.w * 0.34,
      qy = g.tall ? g.cy + 120 * k : g.cy + 10 * k,
      side = (g.tall ? 720 : 600) * k,
      br = 1 + 0.02 * (0.5 - 0.5 * Math.cos((TAU * (F - 252)) / 24)),
      pop = 1; // the freeze is a cut: the sticker arrives fully formed and only breathes
    c.save();
    c.translate(qx, qy);
    c.rotate(-6 * DEG);
    c.scale(br * pop, br * pop);
    c.fillStyle = C.ink;
    c.fillRect(-side / 2 + 12 * u, -side / 2 + 12 * u, side, side);
    c.fillStyle = C.accent;
    c.fillRect(-side / 2, -side / 2, side, side);
    const halfP = new Path2D();
    halfP.rect(-side / 2, side * 0.1, side, side * 0.4);
    dots(c, env, halfP, 0.25, dark(C.accent, 0.25));
    c.restore();
    // the cut-out: ink offset shadow, a 10 px surface border, the rabbit
    const s = (g.tall ? 2.5 : 2.3) * k * pop,
      pose = freeze(F, { neck: 0.3 }),
      draw = (cc: Ctx) => {
        light("day");
        rabbit(cc, env, qx - 40 * s, qy + 90 * s, s, pose);
      };
    const S = scratch(env, "stk");
    S.ctx.setTransform(c.getTransform());
    draw(S.ctx);
    const ink = tintOf(env, S, C.ink);
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    const b = 10 * u * env.scale,
      sh = 8 * u * env.scale;
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU;
      c.drawImage(ink.canvas as CanvasImageSource, Math.cos(a) * b + sh, Math.sin(a) * b + sh);
    }
    const surf = tintOf(env, S, C.surface);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU;
      c.drawImage(surf.canvas as CanvasImageSource, Math.cos(a) * b, Math.sin(a) * b);
    }
    c.drawImage(S.canvas as CanvasImageSource, 0, 0);
    c.restore();
    const capAt: [number, number] = g.tall ? [SAFE.x0 + 10 * u, SAFE.y0] : [R.x + R.w * 0.62, g.cy - 60 * u];
    caption(c, R, "DON'T. MOVE.", F, 252, 276, capAt);
  };

  // 05 · the strike: an impact frame, then a tracking bolt into the bramble; the hawk lifts away empty
  const boltScene = (c: Ctx, env: Env, F: number, R: R) => {
    const g = geo(R),
      k = g.k,
      Tc = tw(F),
      s = 1.7 * k;
    light("day");
    if (F < 304) {
      impact(
        c,
        env,
        R,
        F,
        "split",
        "THWACK",
        (cc) => {
          // talons striking empty grass, the rabbit already leaping clear
          cc.save();
          cc.translate(R.x + R.w * (g.tall ? 0.4 : 0.36), g.gy - 20 * k);
          cc.scale(k * 2.2, k * 2.2);
          cc.fillStyle = C.ink;
          for (const sg of [-1, 1]) {
            cc.fillRect(sg * 22 - 6, -150, 12, 110);
            for (let t = -1; t <= 1; t++) {
              cc.beginPath();
              cc.moveTo(sg * 22, -40);
              cc.quadraticCurveTo(sg * 22 + t * 30, -20, sg * 22 + t * 34, 6);
              cc.lineTo(sg * 22 + t * 26, -10);
              cc.closePath();
              cc.fill();
            }
          }
          cc.restore();
          cc.save();
          cc.translate(R.x + R.w * (g.tall ? 0.4 : 0.36), g.gy - 20 * k - 150 * 2.2 * k - 120 * k);
          cc.scale(2.6 * k, 2.6 * k);
          cc.fill(hawkPath(0.9, 0.2));
          cc.restore();
          rabbit(cc, env, R.x + R.w * (g.tall ? 0.72 : 0.7), g.gy - 90 * k, s * 1.1, bolt(0));
          blades(cc, env, R, k, 41, 12, R.y + R.h, 260, 0);
        },
        [0.64, 0.12],
      );
      return;
    }
    const run = Math.min(Tc, 324) - 304,
      wx = R.x + R.w * 0.3 + run * 34 * u,
      cam: Cam = { x: Math.min(F - 304, 22) * 30 * u, y: 0, zoom: 1, tilt: 0 };
    lay(c, R, cam, Infinity, (cc) => skyBands(cc, env, R, "day", g.hz - 40 * k));
    flay(c, env, R, cam, 30, 4, (cc) =>
      hedge(cc, env, R.x - R.w * 0.5, R.x + R.w * 3, g.hz - 30 * k, 170 * k, 12, GDARK, k),
    );
    lay(c, R, cam, 8, (cc) => meadow(cc, env, R, g.hz - 40 * k, "day", k, 31, 70));
    const bx = R.x + R.w * 0.3 + 20 * 34 * u + 120 * k;
    lay(c, R, cam, 4, (cc) => {
      // the hawk lifting away empty, two feathers drifting
      const lq = ease.inOutCubic(prog(F, 304, 336)),
        hx = R.x + R.w * 0.3 - 80 * k + lq * 60 * k,
        hy = g.gy - 120 * k - lq * 520 * k;
      hawk(cc, env, hx, hy, 1.5 * k, Math.sin((TAU * Tc) / 8), 0, -0.3);
      for (let i = 0; i < 2; i++) {
        const fq = prog(F, 306 + i * 4, 336),
          fx = R.x + R.w * 0.3 + (i ? 60 : -30) * k + Math.sin(fq * 7 + i) * 40 * k,
          fy = g.gy - 200 * k + fq * 160 * k;
        cc.save();
        cc.translate(fx, fy);
        cc.rotate(Math.sin(fq * 6 + i * 2) * 0.8);
        cel(cc, env, leaf(46 * k, 14 * k), mix(C.s7, C.ink, 0.4), 0, -23 * k, 7 * k, { hatch: 0 });
        cc.restore();
      }
      if (Tc < 324) rabbit(cc, env, wx, g.gy, s, bolt(Tc));
      else if (Tc < 330) {
        // the dive: into the bramble, only the tail flashing
        const d = prog(Tc, 324, 330);
        rabbit(cc, env, wx + d * 90 * k, g.gy + d * 20 * k, s * (1 - 0.3 * d), rp({ ...bolt(0), pitch: 0.5 * d }));
      }
      // the bramble (drawn over the rabbit as it dives)
      const br = scallop(bx + 70 * k, g.gy - 70 * k, 250 * k, 150 * k, 12, 51, 34 * k);
      cel(cc, env, br, mix(GDARK, C.s2, 0.3), bx + 70 * k, g.gy - 100 * k, 160 * k, { hatch: 6 });
      cc.strokeStyle = C.ink;
      cc.lineWidth = 5 * u;
      cc.beginPath();
      for (let i = 0; i < 7; i++) {
        const x0 = bx - 80 * k + i * 55 * k;
        cc.moveTo(x0, g.gy - 20 * k);
        cc.quadraticCurveTo(x0 + 30 * k, g.gy - 220 * k, x0 + 80 * k, g.gy - 200 * k + hash(i, 52) * 40 * k);
      }
      cc.stroke();
      if (F >= 324) puff(cc, env, bx - 40 * k, g.gy, 110 * k, F, 324, 12);
    });
    if (F < 324) speed(c, R, F, 1, 50, 3);
  };

  // 06 · inside the bramble: thorns fringed in front, the rabbit peeking out
  const brambleScene = (c: Ctx, env: Env, F: number, R: R) => {
    const g = geo(R),
      k = g.k,
      Tc = tw(F);
    light("day");
    const cam: Cam = { x: (F - 336) * 0.6 * u, y: 0, zoom: lerp(1, 1.05, prog(F, 336, 360)), tilt: 0 };
    lay(c, R, cam, Infinity, (cc) => skyBands(cc, env, R, "day", g.hz));
    flay(c, env, R, cam, 30, 3, (cc) =>
      hedge(cc, env, R.x - R.w, R.x + R.w * 2, g.hz + 20 * k, 260 * k, 55, mix(GDARK, C.s2, 0.2), k),
    );
    lay(c, R, cam, 8, (cc) => meadow(cc, env, R, g.hz + 20 * k, "day", k, 57, 40));
    const s = (g.tall ? 2.8 : 2.9) * k,
      p = rp({ neck: 0.2, e0: -0.1 - 0.05 * Math.cos((TAU * Tc) / 8), e1: -0.3, pupil: 0.42, tw: twitch(Tc, 4) });
    lay(c, R, cam, 3, (cc) => rabbitAt(cc, env, R.x + R.w * (g.tall ? 0.36 : 0.3), g.gy - 60 * k, s, p));
    flay(c, env, R, { ...cam, x: 0 }, 0.6, 3, (cc) => {
      // the thorny stems framing the view, pure ink
      cc.strokeStyle = C.ink;
      cc.fillStyle = C.ink;
      cc.lineCap = "round";
      for (let i = 0; i < 7; i++) {
        const top = i % 2 === 0,
          x0 = R.x + (i / 6) * R.w,
          y0 = top ? R.y - 20 : R.y + R.h + 20,
          x1 = x0 + (hash(i, 61) - 0.5) * R.w * 0.6,
          y1 = top ? R.y + R.h * (0.15 + 0.2 * hash(i, 62)) : R.y + R.h * (0.75 - 0.2 * hash(i, 62)),
          sw = 14 * k;
        cc.lineWidth = sw;
        cc.beginPath();
        cc.moveTo(x0, y0);
        cc.quadraticCurveTo((x0 + x1) / 2 + 120 * k, (y0 + y1) / 2, x1, y1);
        cc.stroke();
        for (let t = 1; t < 6; t++) {
          const q = t / 6,
            px = lerp(lerp(x0, (x0 + x1) / 2 + 120 * k, q), lerp((x0 + x1) / 2 + 120 * k, x1, q), q),
            py = lerp(lerp(y0, (y0 + y1) / 2, q), lerp((y0 + y1) / 2, y1, q), q),
            sg = t % 2 ? 1 : -1;
          cc.beginPath();
          cc.moveTo(px - 10 * k, py);
          cc.lineTo(px + sg * 34 * k, py - 26 * k);
          cc.lineTo(px + 10 * k, py);
          cc.closePath();
          cc.fill();
        }
      }
    });
    caption(c, R, "FROM THE HEDGE.", F, 336, 360);
  };

  // 07 · the stalk page's panels: the eyes in the hedge, a paw lifting, an ear swivelling
  const hedgeEyes = (c: Ctx, env: Env, F: number, R: R, o: Opt = {}) => {
    const g = geo(R),
      k = g.k;
    c.fillStyle = mix(GDARK, C.deep, 0.62);
    c.fillRect(R.x, R.y, R.w, R.h);
    for (let i = 0; i < 26; i++) {
      const lx = R.x + hash(i, 71) * R.w,
        ly = R.y + hash(i, 72) * R.h;
      c.save();
      c.translate(lx, ly);
      c.rotate(hash(i, 73) * TAU + 0.03 * Math.sin(F * 0.05 + i));
      c.fillStyle = i % 2 ? mix(GDARK, C.deep, 0.3) : mix(GDARK, C.deep, 0.45);
      c.fill(leaf(120 * k, 60 * k));
      c.restore();
    }
    const halfP = new Path2D();
    halfP.rect(R.x, R.y, R.w, R.h);
    dots(c, env, halfP, 0.25, C.deep);
    const Tc = tw(F),
      t = o.mini ? mod(Tc, 36) : Tc - 396,
      bl = t >= 0 && t < 4 ? 1 : 0,
      ey = g.cy + (g.tall ? 0 : -20 * k),
      gap = 110 * k * (g.tall ? 1 : 1.2);
    for (const sg of [-1, 1]) {
      const ex = g.cx + sg * gap;
      c.save();
      c.translate(ex, ey);
      c.rotate(sg * 0.12);
      c.beginPath();
      c.moveTo(-70 * k, 0);
      c.quadraticCurveTo(0, -46 * k * (1 - bl), 70 * k, 0);
      c.quadraticCurveTo(0, 36 * k * (1 - bl), -70 * k, 0);
      c.closePath();
      c.fillStyle = C.s1;
      c.fill();
      c.strokeStyle = C.ink;
      c.lineWidth = 5 * u;
      c.stroke();
      if (!bl) {
        c.fillStyle = C.ink;
        c.beginPath();
        c.ellipse(0, 0, 9 * k, 30 * k, 0, 0, TAU);
        c.fill();
        c.fillStyle = C.surface;
        c.beginPath();
        c.arc(18 * k, -12 * k, 6 * k, 0, TAU);
        c.fill();
      }
      c.restore();
    }
  };
  const foxPaw = (c: Ctx, env: Env, F: number, R: R) => {
    const g = geo(R),
      k = g.k,
      Tc = tw(F);
    light("day");
    skyBands(c, env, R, "day", R.y + R.h * 0.35);
    meadow(c, env, R, R.y + R.h * 0.35, "day", k * 2, 81, 20);
    // the fox's front half, low, one forepaw lifting slow
    const lift = Math.sin(Math.PI * ease.inOutCubic(prog(Tc, 372, 406))),
      s = (g.tall ? 3.4 : 3.6) * k,
      y = R.y + R.h * 0.84,
      x = g.tall ? g.cx - 0.3 * FOX.len * s : g.cx - 0.36 * FOX.len * s,
      p = qp({ lower: 0.2, head: 0.25, ears: 0.6, tail: [Math.PI - 0.08, 0.05] });
    p.legs[0] = [lerp(0, 18, lift), -42 * lift];
    quad(c, env, x, y, s, FOX, p);
    blades(c, env, R, k, 83, 6, R.y + R.h, 200, 0);
  };
  const earSwivel = (c: Ctx, env: Env, F: number, R: R) => {
    const g = geo(R),
      k = g.k,
      Tc = tw(F);
    light("day");
    skyBands(c, env, R, "day", R.y + R.h * 0.7);
    meadow(c, env, R, R.y + R.h * 0.7, "day", k * 2, 91, 12);
    const sw = ease.inOutCubic(prog(Tc, 386, 396)),
      p = rp({
        neck: 0.1,
        e0: lerp(-0.1, -0.95, sw),
        e1: lerp(-0.3, -0.6, sw),
        pupil: lerp(0.55, 0.4, sw),
        tw: twitch(Tc, 3),
      }),
      s = (g.tall ? 3.3 : 3.2) * k;
    rabbitAt(c, env, g.cx + 40 * k, g.cy + (g.tall ? 120 : 110) * k, s, p);
  };
  const PANEL_A = [hedgeEyes, foxPaw, earSwivel];
  /** a comic panel: its own clipped box, a live scene, a 4 px ink border */
  const panel = (c: Ctx, box: R, draw: () => void) => {
    c.save();
    c.beginPath();
    c.rect(box.x, box.y, box.w, box.h);
    c.clip();
    draw();
    c.restore();
    c.strokeStyle = C.ink;
    c.lineWidth = 4 * u;
    c.strokeRect(box.x, box.y, box.w, box.h);
  };
  const stalkBoxes = (R: R) => {
    const m = 36 * u,
      gt = 16 * u,
      g = geo(R);
    if (g.tall) {
      const top = Math.max(R.y + m, SAFE.y0 - 60 * u),
        bot = Math.min(R.y + R.h - m, SAFE.y1 + 60 * u),
        h = (bot - top - 2 * gt) / 3;
      return [0, 1, 2].map((i) => ({ x: R.x + m, y: top + i * (h + gt), w: R.w - 2 * m, h }));
    }
    const w = (R.w - 2 * m - 2 * gt) / 3;
    return [0, 1, 2].map((i) => ({ x: R.x + m + i * (w + gt), y: R.y + m, w, h: R.h - 2 * m }));
  };
  const stalkPage = (c: Ctx, env: Env, F: number, R: R, apart = 0) => {
    const g = geo(R);
    if (apart === 0) {
      c.fillStyle = C.ground;
      c.fillRect(R.x, R.y, R.w, R.h);
    }
    stalkBoxes(R).forEach((b, i) => {
      const t0 = 360 + i * 12,
        k = spring((F - t0) / FPS, { freq: 2.6, damp: 0.7 });
      if (k <= 0) return;
      const off = (1 - k) * (g.tall ? R.w : R.h),
        ap = ease.inCubic(apart) * (g.tall ? R.w * 1.2 : R.h * 1.2),
        dir = i === 1 ? (g.tall ? 1 : -1) : 1,
        bx = g.tall ? b.x + off * (i % 2 ? -1 : 1) + ap * (i % 2 ? -1 : 1) : b.x,
        by = g.tall ? b.y : b.y + off * (i % 2 ? -1 : 1) + ap * dir * (i % 2 ? -1 : 1);
      const box = { ...b, x: bx, y: by };
      c.fillStyle = C.ink;
      c.fillRect(box.x + 8 * u, box.y + 8 * u, box.w, box.h);
      panel(c, box, () => PANEL_A[i]!(c, env, F, box));
    });
  };

  // 08 · the stalk wide: the fox slinks along the hedge; a twig snaps; the pounce
  const stalkWide = (c: Ctx, env: Env, F: number, R: R) => {
    const g = geo(R),
      k = g.k,
      Tc = tw(F);
    light("day");
    const cam: Cam = { x: (F - 408) * 0.5 * u, y: 0, zoom: 1 + 0.06 * prog(F, 408, 456), tilt: 0 };
    lay(c, R, cam, Infinity, (cc) => skyBands(cc, env, R, "day", g.hz - 60 * k));
    flay(c, env, R, cam, 30, 4, (cc) =>
      hedge(cc, env, R.x - R.w, R.x + R.w * 2, g.hz - 50 * k, 120 * k, 101, mix(GDARK, C.sky, 0.2), k),
    );
    lay(c, R, cam, 8, (cc) => meadow(cc, env, R, g.hz - 60 * k, "day", k, 103, 50));
    const fs = (g.tall ? 1.75 : 1.9) * k,
      rs = (g.tall ? 1.75 : 1.8) * k,
      fx0 = R.x + R.w * (g.tall ? 0.02 : 0.1),
      rx = R.x + R.w * (g.tall ? 0.58 : 0.74),
      fy = g.gy - 60 * k;
    lay(c, R, cam, 5, (cc) => hedge(cc, env, R.x - R.w, R.x + R.w * 2, fy - 10 * k, 240 * k, 107, GDARK, k));
    lay(c, R, cam, 4, (cc) => {
      const walk = Math.min(Tc, 444) - 408,
        fx = fx0 + walk * STALK_V * fs;
      if (Tc < 444) {
        const p = stalk(Tc);
        if (Tc >= 432) p.ears = 1;
        quad(cc, env, fx, fy, fs, FOX, p);
        if (Tc >= 432 && Tc < 444) {
          // the twig
          cc.strokeStyle = mix(C.s7, C.ink, 0.3);
          cc.lineWidth = 7 * k;
          cc.lineCap = "round";
          const bx = fx + FOX.len * 0.3 * fs,
            snap = prog(Tc, 432, 434);
          cc.beginPath();
          cc.moveTo(bx - 50 * k, fy + 2);
          cc.lineTo(bx, fy - 6 * k * snap);
          cc.moveTo(bx + 4 * k, fy - 6 * k * snap);
          cc.lineTo(bx + 50 * k, fy + 2);
          cc.stroke();
        }
      } else {
        // the pounce: a stretched leap toward where the rabbit was
        const q = prog(Tc, 444, 456),
          x = lerp(fx, rx - 40 * k, q),
          y = fy - Math.sin(Math.PI * q) * 180 * k;
        const p = qp({
          sx: 1.25,
          pitch: lerp(-0.4, 0.35, q),
          legs: [
            [50, -40],
            [44, -36],
            [-40, -10],
            [-46, -14],
          ],
          tail: [Math.PI - 0.1, 0],
          ears: -1,
          mouth: 1,
        });
        quad(cc, env, x, y, fs, FOX, p);
      }
      let rpz: RP;
      if (Tc < 432) rpz = graze(Tc, [420]);
      else if (Tc < 446) rpz = alert(Tc);
      else rpz = bolt(Tc);
      const rxx = Tc < 446 ? rx : rx + (Tc - 446) * 60 * k;
      rabbit(cc, env, rxx, g.gy, rs, rpz);
    });
    if (Tc >= 432 && F < 446)
      sfx(
        "SNAP",
        fx0 + (Math.min(Tc, 444) - 408) * STALK_V * fs + 60 * k,
        fy - 120 * k,
        (g.tall ? 80 : 72) * u,
        432,
        F,
        { t1: 442, fill: C.surface },
      );
    if (F >= 444) {
      const q = prog(F, 444, 456),
        fx = fx0 + 36 * STALK_V * fs;
      focus(c, R, lerp(fx, rx - 40 * k, q) - cam.x, fy - Math.sin(Math.PI * q) * 180 * k - 40 * k, 260 * k, 170 * k, F);
    }
    if (F < 416) stalkPage(c, env, F, R, prog(F, 408, 416));
  };

  // 09 · overhead: straight down on the mown meadow; the rabbit zig-zags, the fox overshoots every turn
  const overhead = (c: Ctx, env: Env, F: number, R: R) => {
    const g = geo(R),
      k = g.k,
      Tc = tw(F);
    light("day");
    // along-axis a runs left to right (landscape) or bottom to top (vertical); b is across it
    const Lr = g.tall ? R.h : R.w,
      Br = g.tall ? R.w : R.h,
      toXY = (a: number, b: number): [number, number] => (g.tall ? [g.cx + b, R.y + R.h - a] : [R.x + a, g.cy + b]),
      heading = (ang: number) => (g.tall ? ang - Math.PI / 2 : ang),
      v = 30 * u; // the rabbit's run, per frame
    const turns = [456, 468, 480, 492, 504, 516],
      across = [0, -0.26, 0.24, -0.24, 0.22, -0.1].map((b) => b * Br),
      way = turns.map((t, i) => [Lr * 0.12 + (t - 456) * v, across[i]!] as [number, number]);
    const pathAt = (t: number, pts: [number, number][], ts: number[]): { a: number; b: number; ang: number } => {
      let i = 0;
      while (i < ts.length - 2 && t >= ts[i + 1]!) i++;
      const q = clamp((t - ts[i]!) / (ts[i + 1]! - ts[i]!), 0, 1.4),
        [a0, b0] = pts[i]!,
        [a1, b1] = pts[i + 1]!;
      return { a: lerp(a0, a1, q), b: lerp(b0, b1, q), ang: Math.atan2(b1 - b0, a1 - a0) };
    };
    const rab = pathAt(Tc, way, turns);
    // the fox: reaches each turn 6 frames late and overshoots it along the old heading before cutting back
    const fway: [number, number][] = [[-Lr * 0.15, 0]],
      fts: number[] = [456];
    for (let i = 1; i < 6; i++) {
      const [a0, b0] = way[i - 1]!,
        [a1, b1] = way[i]!,
        dl = Math.hypot(a1 - a0, b1 - b0) || 1;
      fway.push([a1 + ((a1 - a0) / dl) * 150 * k, b1 + ((b1 - b0) / dl) * 150 * k]);
      fts.push(turns[i]! + 12);
    }
    const fox = pathAt(Tc, fway, fts);
    const camA = clamp((F - 456) * v - Lr * 0.42, 0, 1e9);
    c.save();
    // mown stripes and daisies, scrolled by the camera (on ones)
    const sw = 120 * k;
    for (let i = -2; i < Lr / sw + 4; i++) {
      const a = i * sw - mod(camA, sw * 2);
      c.fillStyle = i % 2 ? GRASS : mix(GRASS, C.s1, 0.18);
      const [x0, y0] = toXY(a, -Br / 2),
        [x1, y1] = toXY(a + sw, Br / 2);
      c.fillRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0));
    }
    for (let i = 0; i < 40; i++) {
      const a = mod(hash(i, 111) * Lr * 1.6 - camA, Lr * 1.6) - Lr * 0.2,
        b = (hash(i, 112) - 0.5) * Br,
        [x, y] = toXY(a, b),
        r = (10 + 6 * hash(i, 113)) * k;
      c.fillStyle = C.surface;
      for (let j = 0; j < 6; j++) {
        const aa = (j / 6) * TAU;
        c.beginPath();
        c.ellipse(x + Math.cos(aa) * r, y + Math.sin(aa) * r, r * 0.7, r * 0.34, aa, 0, TAU);
        c.fill();
      }
      c.fillStyle = C.s1;
      c.beginPath();
      c.arc(x, y, r * 0.45, 0, TAU);
      c.fill();
    }
    // dust puffs at every turn and at the empty pounce
    const puffs: [number, number, number][] = [[456, way[0]![0] - 150 * k, 0]];
    for (let i = 1; i < 5; i++) puffs.push([turns[i]!, way[i]![0], way[i]![1]]);
    for (const [t0, a, b] of puffs) {
      const [x, y] = toXY(a - camA, b);
      puff(c, env, x, y, (t0 === 456 ? 150 : 80) * k, F, t0, 12);
    }
    // top-view figures, each with a halftone ground shadow
    const top = (a: number, b: number, ang: number, fox_: boolean) => {
      const [x, y] = toXY(a - camA, b);
      c.save();
      c.translate(x, y);
      c.rotate(heading(ang));
      const s = (fox_ ? 2.0 : 1.9) * k,
        bob = 1 + 0.06 * Math.cos((TAU * mod(Tc, 8)) / 8);
      c.scale(s, s);
      const shP = fox_ ? ell(8, 10, 70, 28) : ell(6, 10, 44, 28);
      dots(c, env, shP, 0.7, C.ink, 0.8);
      // legs splaying out from under the body, a bound on twos, so both read as running animals from above
      const ga = (TAU * mod(Tc, 8)) / 8;
      c.lineCap = "round";
      for (const sg of [-1, 1])
        for (const [lx, ph] of fox_
          ? [
              [38, 0],
              [-36, Math.PI],
            ]
          : [
              [26, 0],
              [-30, Math.PI],
            ]) {
          const sw = (fox_ ? 22 : 16) * Math.cos(ga + ph + (sg > 0 ? 0.35 : 0)),
            hind = lx < 0 && !fox_;
          c.strokeStyle = C.ink;
          c.lineWidth = hind ? 18 : fox_ ? 13 : 11;
          c.beginPath();
          c.moveTo(lx, sg * 14);
          c.lineTo(lx + sw + (hind ? -16 : 0), sg * (fox_ ? 44 : 34));
          c.stroke();
          c.strokeStyle = fox_ ? mix(C.s6, C.ink, 0.55) : C.s7;
          c.lineWidth = hind ? 11 : fox_ ? 7 : 5;
          c.stroke();
        }
      if (fox_) {
        const tl = new Path2D();
        tl.moveTo(-60, -8);
        tl.quadraticCurveTo(-120, -10 + 16 * Math.sin(F * 0.6), -150, 0);
        tl.quadraticCurveTo(-120, 18, -60, 10);
        tl.closePath();
        cel(c, env, tl, C.s6, -100, 0, 14, { hatch: 0 });
        c.fillStyle = C.surface;
        c.beginPath();
        c.arc(-146, 0, 12, 0, TAU);
        c.fill();
        cel(c, env, ell(0, 0, 66 * bob, 26), C.s6, 0, 0, 26, { hatch: 3 });
        const hd = new Path2D();
        hd.moveTo(50, -22);
        hd.lineTo(110, 0);
        hd.lineTo(50, 22);
        hd.closePath();
        cel(c, env, hd, C.s6, 70, 0, 20, { hatch: 0 });
        // big pointed ears, orange with ink tips and backs, and a white cheek on each side of the snout
        for (const sg of [-1, 1]) {
          const ear = new Path2D();
          ear.moveTo(64, sg * 10);
          ear.lineTo(36, sg * 50);
          ear.lineTo(50, sg * 8);
          ear.closePath();
          c.fillStyle = C.s6;
          c.fill(ear);
          c.strokeStyle = C.ink;
          c.lineWidth = 3;
          c.lineJoin = "round";
          c.stroke(ear);
          c.fillStyle = C.ink;
          c.beginPath();
          c.moveTo(44, sg * 36);
          c.lineTo(36, sg * 50);
          c.lineTo(48, sg * 38);
          c.fill();
          c.fillStyle = C.surface;
          c.beginPath();
          c.ellipse(78, sg * 12, 16, 6, sg * -0.35, 0, TAU);
          c.fill();
        }
        c.fillStyle = C.ink;
        c.beginPath();
        c.arc(110, 0, 7, 0, TAU);
        c.fill();
      } else {
        cel(c, env, circ(-40, 0, 13), C.surface, -40, 0, 13, { hatch: 0, rim: false, v: 0.25 });
        cel(c, env, ell(0, 0, 44 * bob, 28), C.s7, 0, 0, 28, { hatch: 3 });
        cel(c, env, circ(40, 0, 20), C.s7, 40, 0, 20, { hatch: 0 });
        for (const sg of [-1, 1]) {
          c.save();
          c.translate(30, sg * 10);
          c.rotate(-Math.PI / 2 - sg * 1.2);
          cel(c, env, leaf(50, 18), C.s7, 0, -25, 9, { hatch: 0 });
          c.fillStyle = EARIN;
          c.fill(leaf(36, 8));
          c.restore();
        }
      }
      c.restore();
    };
    top(fox.a, fox.b, fox.ang, true);
    top(rab.a, rab.b, rab.ang, false);
    // skid marks where the fox overshoots
    c.restore();
    const [sxx, syy] = toXY(fway[2]![0] - camA, fway[2]![1]);
    sfx("SKRRT", sxx, syy - (g.tall ? 0 : 150 * k), (g.tall ? 170 : 150) * u, 480, F, { t1: 494, rot: 0.08 });
  };

  // 10 · the race and the fence
  const race = (c: Ctx, env: Env, F: number, R: R, fence: boolean) => {
    const g = geo(R),
      k = g.k,
      Tc = tw(F),
      s = (g.tall ? 1.9 : 1.9) * k;
    light("day");
    const camX = fence ? (552 - 516) * 30 * u + (F - 552) * 1.2 * u : (F - 516) * 30 * u,
      cam: Cam = { x: camX, y: 0, zoom: 1, tilt: 0 };
    lay(c, R, cam, Infinity, (cc) => skyBands(cc, env, R, "day", g.hz - 40 * k));
    flay(c, env, R, cam, 30, 4, (cc) =>
      hedge(cc, env, R.x - R.w, R.x + R.w * 20, g.hz - 30 * k, 160 * k, 121, mix(GDARK, C.sky, 0.15), k),
    );
    lay(c, R, cam, 8, (cc) => meadow(cc, env, R, g.hz - 40 * k, "day", k, 123, 120));
    const fenceX = R.x + R.w * 0.5 + (552 - 516) * 30 * u;
    lay(c, R, cam, 4, (cc) => {
      const sulk = F >= 564;
      if (!fence) {
        const rx = R.x + R.w * (g.tall ? 0.66 : 0.64) + camX,
          fx = R.x + R.w * (g.tall ? 0.18 : 0.26) + camX + 20 * k * Math.sin(F * 0.2);
        quad(cc, env, fx, g.gy, s, FOX, gallop(Tc));
        rabbit(cc, env, rx, g.gy, s, bolt(Tc));
      } else {
        const rq = Tc - 552,
          rx = fenceX + 150 * k + rq * 26 * k;
        if (rx < R.x + R.w * 1.1 + camX)
          rabbit(cc, env, rx, g.gy, s * (1 - rq * 0.008), rq < 12 ? bolt(Tc) : hop(Tc, 564, 30).p);
        const back = ease.outCubic(prog(Tc, 556, 564)),
          fx = fenceX - FOX.len * 0.62 * s - back * 90 * k;
        if (!sulk)
          quad(
            cc,
            env,
            fx,
            g.gy,
            s,
            FOX,
            qp({
              pitch: -0.1,
              ears: -1,
              legs: [
                [-10, 0],
                [-6, 0],
                [10, 0],
                [6, 0],
              ],
              head: 0.2,
              blink: Tc < 558 ? 1 : 0,
            }),
          );
        else quad(cc, env, fx, g.gy, s, FOX, sit({ ears: -1, head: 0.55, blink: mod(Tc, 24) < 4 ? 1 : 0 }));
        // the fence (in front of the fox: posts and two rails)
        for (const [dx, h] of [
          [-420, 1],
          [0, 1],
          [420, 1],
        ] as [number, number][]) {
          const px = fenceX + dx * k;
          cel(
            cc,
            env,
            capsule(px, g.gy + 20 * k, px, g.gy - 260 * k * h, 18 * k, 16 * k),
            mix(C.s7, C.s3, 0.2),
            px,
            g.gy - 120 * k,
            18 * k,
            { hatch: 2 },
          );
        }
        for (const ry of [-200, -110]) {
          const r_ = new Path2D();
          r_.rect(fenceX - 520 * k, g.gy + ry * k, 1040 * k, 26 * k);
          cel(cc, env, r_, mix(C.s7, C.s3, 0.35), fenceX, g.gy + ry * k + 13 * k, 13 * k, { hatch: 0 });
        }
        if (Tc >= 556 && Tc < 572) {
          for (let i = 0; i < 3; i++) {
            const a = F * 0.3 + (i * TAU) / 3;
            star5(
              cc,
              fx + FOX.len * 0.55 * s + Math.cos(a) * 60 * k,
              g.gy - 150 * k + Math.sin(a) * 18 * k,
              16 * k,
              F * 0.2,
            );
          }
        }
      }
    });
    if (!fence) speed(c, R, F, 1, 56, 7);
    if (fence && F < 556)
      impact(
        c,
        env,
        R,
        F,
        "burst",
        "BONK",
        (cc) =>
          lay(cc, R, cam, 4, (c2) => {
            quad(c2, env, fenceX - FOX.len * 0.62 * s + 20 * k, g.gy, s, FOX, gallop(0));
            const r_ = new Path2D();
            r_.rect(fenceX - 520 * k, g.gy - 200 * k, 1040 * k, 26 * k);
            c2.fill(r_);
            c2.fillRect(fenceX - 18 * k, g.gy - 260 * k, 36 * k, 280 * k);
          }),
        [0.24, 0.24],
      );
  };

  // 11 · the path: two giant boots step through, an empty lead swings, the rabbit hides; the dog's nose
  const bootsAt = (F: number, R: R) => {
    const g = geo(R),
      k = g.k,
      sc = (g.tall ? 0.85 : 1.15) * k,
      lift = (g.tall ? 900 : 520) * k;
    // each boot: [x, y lift, tilt] as a function of F: A lands at 588, B at 612, A leaves again after 616
    const A = (() => {
      if (F < 588) {
        const q = ease.inOutCubic(prog(F, 576, 588));
        return [lerp(R.x - 500 * k, R.x + R.w * 0.2, q), (1 - q) * lift * 0.7, -0.2 * (1 - q)];
      }
      if (F < 618) return [R.x + R.w * 0.2, 0, 0];
      const q = ease.inOutCubic(prog(F, 618, 640));
      return [
        lerp(R.x + R.w * 0.2, R.x + R.w * 1.1, q),
        Math.sin(Math.PI * Math.min(1, q * 1.2)) * lift,
        -0.2 * Math.sin(Math.PI * q),
      ];
    })();
    const B = (() => {
      if (F < 594) return [R.x - 60 * k, 0, 0];
      if (F < 612) {
        const q = ease.inOutCubic(prog(F, 594, 612));
        return [
          lerp(R.x - 60 * k, R.x + R.w * (g.tall ? 0.16 : 0.44), q),
          Math.sin(Math.PI * q) * lift,
          -0.25 * Math.sin(Math.PI * q),
        ];
      }
      return [R.x + R.w * (g.tall ? 0.16 : 0.44), 0, 0];
    })();
    return { A, B, sc };
  };
  const pathScene = (c: Ctx, env: Env, F: number, R: R) => {
    const g = geo(R),
      k = g.k,
      Tc = tw(F);
    light("day");
    const sh = shake(F, 588, 4) + shake(F, 612, 4),
      cam: Cam = { x: 0, y: 0, zoom: 1 + 0.03 * prog(F, 576, 648), tilt: 0, sx: sh * 0.4, sy: sh };
    lay(c, R, cam, Infinity, (cc) => skyBands(cc, env, R, "day", g.hz - 80 * k));
    flay(c, env, R, cam, 30, 4, (cc) =>
      hedge(cc, env, R.x - R.w, R.x + R.w * 2, g.hz - 70 * k, 150 * k, 131, mix(GDARK, C.sky, 0.2), k),
    );
    lay(c, R, cam, 8, (cc) => {
      meadow(cc, env, R, g.hz - 80 * k, "day", k, 133, 30);
      // the path: a flat sandy band
      cc.fillStyle = mix(C.ground, C.s3, 0.35);
      cc.fillRect(R.x - R.w, g.gy - 50 * k, R.w * 3, 90 * k);
    });
    const { A, B, sc } = bootsAt(F, R),
      bounce =
        Math.exp(-Math.max(0, F - 588) / 6) * (F >= 588 ? 1 : 0) +
        Math.exp(-Math.max(0, F - 612) / 6) * (F >= 612 ? 1 : 0);
    lay(c, R, cam, 4, (cc) => {
      boot(cc, env, B[0]!, g.gy - B[1]!, sc, B[2]!, true);
      boot(cc, env, A[0]!, g.gy - A[1]!, sc, A[2]!, false);
    });
    // the lead, swinging from above
    lay(c, R, cam, 4, (cc) => {
      const ax = (A[0]! + B[0]!) / 2 + 300 * k,
        ang = 0.3 * Math.sin((TAU * F) / 40),
        len = R.h * (g.tall ? 0.36 : 0.52),
        ex = ax + Math.sin(ang) * len,
        ey = R.y + Math.cos(ang) * len;
      cc.strokeStyle = C.accent;
      cc.lineWidth = 12 * k;
      cc.lineCap = "round";
      cc.beginPath();
      cc.moveTo(ax, R.y - 40);
      cc.quadraticCurveTo(ax + Math.sin(ang) * len * 0.3, R.y + len * 0.6, ex, ey);
      cc.stroke();
      cc.strokeStyle = C.ink;
      cc.lineWidth = 3 * u;
      cc.stroke();
      cc.fillStyle = mix(C.muted, C.surface, 0.4);
      cc.beginPath();
      cc.roundRect(ex - 12 * k, ey, 24 * k, 44 * k, 8 * k);
      cc.fill();
      cc.stroke();
    });
    // the rabbit hides in the long grass: only its ears
    const rx = R.x + R.w * (g.tall ? 0.7 : 0.7),
      rs = 1.6 * k;
    lay(c, R, cam, 3.5, (cc) => {
      const p = freeze(F, { flat: 0, e0: -0.05, e1: -0.2, neck: 0.4 });
      rabbit(cc, env, rx, g.gy + 30 * k, rs, p);
      if (F >= 624) {
        const q = ease.outCubic(prog(Tc, 624, 640)),
          dp = qp({ head: 0.25 + 0.06 * Math.cos((TAU * Tc) / 4), ears: 0, mouth: 0 });
        quad(cc, env, lerp(rx - 700 * k, rx - 380 * k, q), g.gy + 40 * k, 1.6 * k, DOG, dp);
      }
      blades(cc, env, R, k, 137, g.tall ? 12 : 26, g.gy + 50 * k, 300, bounce, [
        rx - (g.tall ? 300 : 700) * k,
        rx + 400 * k,
      ]);
    });
    flay(c, env, R, cam, 0.7, 4, (cc) =>
      blades(cc, env, R, k, 139, 4, R.y + R.h, 380, bounce * 0.5, [R.x + R.w * 0.85, R.x + R.w * 1.2]),
    );
    if (F >= 624)
      sfx("SNF SNF", rx - 330 * k, g.gy - 230 * k, (g.tall ? 80 : 72) * u, 624, F, {
        t1: 646,
        fill: C.surface,
        rot: -0.12,
      });
    caption(c, R, "FROM THE PATH.", F, 576, 624);
  };
  const dogFaceScene = (c: Ctx, env: Env, F: number, R: R, o: Opt = {}) => {
    const g = geo(R),
      k = g.k;
    light("day");
    flay(
      c,
      env,
      R,
      { x: 0, y: 0, zoom: 1, tilt: 0 },
      10,
      1,
      (cc) => {
        skyBands(cc, env, R, "day", g.hz + 40 * k);
        meadow(cc, env, R, g.hz + 40 * k, "day", k * 1.5, 141, 20);
      },
      o.mini,
    );
    const push = o.mini ? 1 : lerp(1, 1.06, prog(F, 648, 660)),
      s = (g.tall ? 2.6 : 2.3) * k * push,
      fx = g.tall ? g.cx : R.x + R.w * 0.42,
      fy = g.tall ? g.cy + 200 * k : g.cy + 90 * k;
    if (!o.mini) focus(c, R, fx, fy, 380 * k, 340 * k, F);
    dogFace(c, env, fx, fy, s, F, 1);
    const ak = o.mini ? 1 : spring((F - 648) / FPS, { freq: 3.4, damp: 0.4 });
    alarm(
      c,
      g.tall ? g.cx + 200 * k : R.x + R.w * 0.74,
      g.tall ? g.cy - 360 * k : g.cy - 150 * k,
      (o.mini ? 150 : 180) * k,
      ak,
      F,
    );
  };

  // 12 · the chase: a split, one tracking shot, a whip pan, the tumble
  const runPanel = (c: Ctx, env: Env, F: number, R: R, who: "rabbit" | "dog") => {
    const g = geo(R),
      k = g.k,
      Tc = tw(F);
    light("day");
    const cam: Cam = { x: F * 30 * u, y: 0, zoom: 1, tilt: 0 };
    lay(c, R, cam, Infinity, (cc) => skyBands(cc, env, R, "day", R.y + R.h * 0.45));
    lay(c, R, cam, 8, (cc) => meadow(cc, env, R, R.y + R.h * 0.45, "day", k, who === "dog" ? 151 : 153, 80));
    lay(c, R, cam, 4, (cc) => {
      const gy = R.y + R.h * 0.84;
      if (who === "rabbit") rabbit(cc, env, R.x + R.w * 0.5 + cam.x, gy, 1.9 * k, bolt(Tc));
      else quad(cc, env, R.x + R.w * 0.46 + cam.x, gy, 1.7 * k, DOG, gallop(Tc), 1, 1);
    });
    speed(c, R, F, 1, 40, who === "dog" ? 11 : 13);
  };
  const splitScene = (c: Ctx, env: Env, F: number, R: R, gutter = 1) => {
    const g = geo(R),
      m = 30 * u * gutter,
      gt = 16 * u * gutter;
    c.fillStyle = C.ground;
    c.fillRect(R.x, R.y, R.w, R.h);
    const slide = ease.outCubic(prog(F, 672, 678));
    const boxes: R[] = g.tall
      ? [
          { x: R.x + m, y: R.y + m, w: R.w - 2 * m, h: (R.h - 2 * m - gt) / 2 },
          { x: R.x + m, y: R.y + m + (R.h - 2 * m - gt) / 2 + gt, w: R.w - 2 * m, h: (R.h - 2 * m - gt) / 2 },
        ]
      : [
          { x: R.x + m, y: R.y + m, w: (R.w - 2 * m - gt) / 2, h: R.h - 2 * m },
          { x: R.x + m + (R.w - 2 * m - gt) / 2 + gt, y: R.y + m, w: (R.w - 2 * m - gt) / 2, h: R.h - 2 * m },
        ];
    boxes.forEach((b, i) => {
      const off = (1 - slide) * (g.tall ? R.w : R.w * 0.6) * (i ? 1 : -1),
        box = { ...b, x: b.x + off };
      panel(c, box, () => runPanel(c, env, F, box, i ? "dog" : "rabbit"));
    });
  };
  const chaseScene = (c: Ctx, env: Env, F: number, R: R) => {
    const g = geo(R),
      k = g.k,
      Tc = tw(F),
      rs = (g.tall ? 1.55 : 1.4) * k,
      ds = rs * 1.5 * (DOG.len / 176);
    light("day");
    // before the jink both run right; after it the rabbit doubles back left and the dog skids and follows
    const jink = F >= 720,
      camBase = (F - 696) * 30 * u,
      whip = ease.inOutCubic(prog(F, 716, 724)),
      x720 = R.x + (720 - 696) * 30 * u,
      rxJ = (t: number) => x720 + R.w * 0.66 - Math.max(0, t - 720 + 2) * 56 * u,
      camX = lerp(camBase, rxJ(F) - R.x - R.w * 0.36, whip);
    const cam: Cam = { x: camX, y: 0, zoom: 1, tilt: 0 };
    const draw = (cc: Ctx) => {
      lay(cc, R, cam, Infinity, (c2) => skyBands(c2, env, R, "day", g.hz - 40 * k));
      lay(cc, R, cam, 30, (c2) =>
        hedge(c2, env, R.x - R.w * 3, R.x + R.w * 4, g.hz - 30 * k, 160 * k, 161, mix(GDARK, C.sky, 0.15), k),
      );
      lay(cc, R, cam, 8, (c2) => meadow(c2, env, R, g.hz - 40 * k, "day", k, 163, 140));
      lay(cc, R, cam, 4, (c2) => {
        if (!jink) {
          const rx = R.x + R.w * (g.tall ? 0.7 : 0.66) + camBase,
            dx = R.x + R.w * (g.tall ? 0.22 : 0.26) + camBase;
          quad(c2, env, dx, g.gy, ds, DOG, gallop(Tc), 1, 1);
          rabbit(c2, env, rx, g.gy, rs, bolt(Tc));
        } else {
          const rx = rxJ(Tc),
            skid = ease.outCubic(prog(Tc, 720, 732)),
            dx = x720 + R.w * 0.26 + 300 * k * skid - Math.max(0, Tc - 732) * 34 * u,
            face = Tc < 728 ? 1 : -1;
          quad(
            c2,
            env,
            dx,
            g.gy,
            ds,
            DOG,
            Tc < 728
              ? qp({
                  pitch: -0.2,
                  legs: [
                    [40, 0],
                    [34, 0],
                    [30, 0],
                    [24, 0],
                  ],
                  mouth: 1,
                })
              : gallop(Tc),
            face,
            1,
          );
          rabbit(c2, env, rx, g.gy, rs, bolt(Tc), { face: -1 });
          if (Tc < 732) puff(c2, env, dx + 60 * k, g.gy, 90 * k, F, 720, 12);
        }
      });
    };
    if (F >= 716 && F < 726) {
      // the whip pan: a 60 px smear of the framing under horizontal streaks, sampled every 2 px as an
      // equal-weight average (copy i at alpha 1/(i+1), the first opaque) so no copy separates into a ghost
      const S = scratch(env, "whip");
      S.ctx.setTransform(c.getTransform());
      draw(S.ctx);
      c.save();
      c.setTransform(1, 0, 0, 1, 0, 0);
      const n = 31;
      for (let i = 0; i < n; i++) {
        const o = i % 2 ? (i + 1) / 2 : -i / 2; // 0, +1, −1, +2, −2 … so the average stays centred
        c.globalAlpha = 1 / (i + 1);
        c.drawImage(S.canvas as CanvasImageSource, o * 2 * u * env.scale, 0);
      }
      c.restore();
      speed(c, R, F, -1, 90, 17, 0.9);
    } else {
      draw(c);
      speed(c, R, F, jink ? -1 : 1, 48, 19);
    }
    if (F < 704) {
      // the gutter slides away
      const q = ease.inOutCubic(prog(F, 696, 704));
      c.save();
      c.globalAlpha = 1 - q;
      c.fillStyle = C.ground;
      if (g.tall) c.fillRect(R.x, g.cy - 8 * u * (1 - q) - q * R.h * 0.6, R.w, 16 * u * (1 - q) + 2);
      else c.fillRect(g.cx - 8 * u * (1 - q) + q * R.w * 0.6, R.y, 16 * u * (1 - q) + 2, R.h);
      c.restore();
    }
  };
  const tumble = (c: Ctx, env: Env, F: number, R: R) => {
    const g = geo(R),
      k = g.k,
      Tc = tw(F),
      ds = (g.tall ? 1.8 : 2.0) * k;
    light("day");
    const cam: Cam = {
      x: 0,
      y: 0,
      zoom: 1 + 0.05 * prog(F, 748, 792),
      tilt: 0,
      sx: shake(F, 748, 8),
      sy: shake(F, 748, 6),
    };
    const dx = g.tall ? g.cx : R.x + R.w * 0.55;
    if (F < 748) {
      impact(
        c,
        env,
        R,
        F,
        "burst",
        "FLUMP",
        (cc) => {
          cc.save();
          cc.translate(dx, g.gy - 100 * k);
          cc.rotate(-0.9 + (F - 744) * 0.3);
          quad(cc, env, 0, 100 * k, ds, DOG, gallop(3), 1, 1);
          cc.restore();
        },
        [0.26, 0.26],
      );
      return;
    }
    lay(c, R, cam, Infinity, (cc) => skyBands(cc, env, R, "day", g.hz - 40 * k));
    flay(c, env, R, cam, 30, 4, (cc) =>
      hedge(cc, env, R.x - R.w, R.x + R.w * 2, g.hz - 30 * k, 160 * k, 171, mix(GDARK, C.sky, 0.15), k),
    );
    lay(c, R, cam, 8, (cc) => meadow(cc, env, R, g.hz - 40 * k, "day", k, 173, 70));
    lay(c, R, cam, 4, (cc) => {
      const clear = ease.inOutCubic(prog(Tc, 760, 772));
      if (clear > 0) {
        const prick = spring((Tc - 768) / FPS, { freq: 3, damp: 0.45 });
        quad(
          cc,
          env,
          dx,
          g.gy,
          ds,
          DOG,
          sit({ ears: lerp(-0.3, 1, clamp(prick)), head: -0.1 - 0.4 * clamp(prick), mouth: 1 }),
          -1,
          1,
        );
      }
      if (clear < 1) {
        // the scalloped dust cloud, paws sticking out, stars circling
        cc.save();
        cc.globalAlpha *= 1 - clear;
        const cr = 290 * k * (1 - 0.3 * clear);
        for (let i = 0; i < 4; i++) {
          const a = (Tc * 0.25 + i * 1.6) % TAU,
            px = dx + Math.cos(a) * cr * 0.62,
            py = g.gy - cr * 0.5 + Math.sin(a) * cr * 0.4,
            wig = 0.2 * Math.cos(Tc * 0.8 + i);
          cc.save();
          cc.translate(px, py);
          cc.rotate(a + wig);
          cel(cc, env, capsule(0, 0, 110 * k, 0, 20 * k, 16 * k), C.surface, 55 * k, 0, 20 * k, { hatch: 0 });
          cc.fillStyle = C.ink;
          cc.beginPath();
          cc.ellipse(112 * k, 0, 10 * k, 18 * k, 0, 0, TAU);
          cc.fill();
          cc.restore();
        }
        // the dog's black floppy ear and its white tail poke out of the top, so the cloud is the dog, not a sheep
        const cy0 = g.gy - cr * 0.5;
        cc.save();
        cc.translate(dx - cr * 0.3, cy0 - cr * 0.34);
        cc.rotate(-0.5 + 0.25 * Math.cos(Tc * 0.9));
        cel(cc, env, leaf(cr * 0.42, cr * 0.26, cr * 0.12), C.ink, 0, -cr * 0.2, cr * 0.12, { hatch: 0, rim: C.muted });
        cc.restore();
        cc.save();
        cc.translate(dx + cr * 0.36, cy0 - cr * 0.3);
        cc.rotate(0.6 + 0.35 * Math.cos((TAU * Tc) / 4));
        cel(cc, env, capsule(0, 0, 0, -cr * 0.4, 16 * k, 9 * k), C.surface, 0, -cr * 0.2, 14 * k, { hatch: 0 });
        cc.restore();
        const cl = scallop(dx, cy0, cr * 0.62, cr * 0.44, 10, 177 + (Tc % 4), cr * 0.09);
        cel(cc, env, cl, mix(C.ground, C.s7, 0.38), dx, cy0, cr * 0.6, { hatch: 5, sh: 0.1 });
        for (let i = 0; i < 4; i++) {
          const a = F * 0.25 + (i * TAU) / 4;
          star5(cc, dx + Math.cos(a) * cr * 0.8, g.gy - cr * 1.05 + Math.sin(a) * cr * 0.18, 20 * k, F * 0.15);
        }
        cc.restore();
      }
    });
    sfx(
      "FWEET!",
      R.x + R.w * (g.tall ? 0.42 : 0.3),
      g.tall ? g.cy - 380 * k : g.cy - 170 * k,
      (g.tall ? 220 : 200) * u,
      768,
      F,
      { t1: 790, fill: C.surface, rot: -0.1 },
    );
    if (F >= 768 && F < 772) {
      // the whistle arrives from off-screen left: a quick sweep of speed lines
      speed(c, R, F, -1, 30, 23, 1 - prog(F, 768, 772));
    }
  };

  // 13 · the recall and the thistle
  const recall = (c: Ctx, env: Env, F: number, R: R) => {
    const g = geo(R),
      k = g.k,
      Tc = tw(F);
    light("day");
    const cam: Cam = { x: 0, y: 0, zoom: 1, tilt: 0 };
    lay(c, R, cam, Infinity, (cc) => skyBands(cc, env, R, "day", g.hz - 80 * k));
    flay(c, env, R, cam, 30, 4, (cc) =>
      hedge(cc, env, R.x - R.w, R.x + R.w * 2, g.hz - 70 * k, 150 * k, 181, mix(GDARK, C.sky, 0.2), k),
    );
    lay(c, R, cam, 8, (cc) => {
      meadow(cc, env, R, g.hz - 80 * k, "day", k, 183, 30);
      cc.fillStyle = mix(C.ground, C.s3, 0.35);
      cc.fillRect(R.x - R.w, g.gy - 50 * k, R.w * 3, 90 * k);
    });
    const sc = (g.tall ? 1.05 : 1.15) * k,
      bx = R.x + R.w * (g.tall ? 0.02 : 0.12),
      ds = (g.tall ? 1.5 : 1.6) * k,
      arrive = prog(Tc, 792, 814),
      dx = lerp(R.x + R.w * 1.05, bx + (g.tall ? 520 : 560) * k, arrive),
      clip = F >= 816;
    lay(c, R, cam, 4, (cc) => {
      boot(cc, env, bx - 120 * k, g.gy, sc, 0, true);
      boot(cc, env, bx, g.gy, sc, 0, false);
      const p =
        arrive < 1
          ? trot(Tc)
          : sit({ ears: 0.4, tail: [Math.PI + 0.3 + 0.35 * Math.cos((TAU * Tc) / 4), 0.3], mouth: 1 });
      quad(cc, env, dx, g.gy, ds, DOG, p, -1, 1);
      // the lead comes down and clips on
      const hx = bx + 460 * k,
        cx = dx - 110 * ds,
        cy = g.gy - DOG.hgt * ds * 1.35,
        down = ease.outCubic(prog(F, 804, 816)),
        ey = lerp(R.y + R.h * 0.2, cy, down),
        ex = lerp(hx + 80 * k, cx, down);
      cc.strokeStyle = C.accent;
      cc.lineWidth = 12 * k;
      cc.lineCap = "round";
      cc.beginPath();
      cc.moveTo(hx, R.y - 40);
      if (clip) cc.lineTo(ex, ey);
      else cc.quadraticCurveTo(hx + 40 * k, (R.y + ey) / 2 + 80 * k, ex, ey);
      cc.stroke();
      cc.strokeStyle = C.ink;
      cc.lineWidth = 3 * u;
      cc.stroke();
    });
    sfx("CLIK", dx - 60 * k, g.gy - DOG.hgt * ds * 1.9, (g.tall ? 80 : 72) * u, 816, F, { t1: 828, fill: C.surface });
  };
  const thistle = (c: Ctx, env: Env, F: number, R: R, o: Opt = {}) => {
    const g = geo(R),
      k = g.k,
      Tc = tw(F);
    light("day");
    LX = -0.6;
    LY = -0.8;
    const s = (g.tall ? 2.2 : 2.3) * k,
      rx = R.x + R.w * (g.tall ? 0.42 : 0.4),
      cam: Cam = { x: 0, y: 0, zoom: lerp(1, 1.12, ease.inOutCubic(prog(F, 828, 864))), tilt: 0 };
    lay(c, R, cam, Infinity, (cc) => skyBands(cc, env, R, "day", g.hz - 20 * k));
    flay(
      c,
      env,
      R,
      cam,
      30,
      4,
      (cc) => hedge(cc, env, R.x - R.w, R.x + R.w * 2, g.hz - 10 * k, 170 * k, 191, mix(GDARK, C.s3, 0.2), k),
      o.mini,
    );
    lay(c, R, cam, 8, (cc) => meadow(cc, env, R, g.hz - 20 * k, "day", k, 193, 40));
    lay(c, R, cam, 4, (cc) => {
      // the thistle: a stem arching over the rabbit, spiny leaves, a purple head with dots
      const tx = rx + (g.tall ? 440 : 560) * k,
        hx = rx + (g.tall ? 250 : 300) * k,
        hy = Math.max(R.y + 150 * k, g.gy - 600 * k),
        sway = 0.02 * Math.sin(F * 0.06);
      cc.save();
      cc.translate(tx, g.gy);
      cc.rotate(sway);
      cc.translate(-tx, -g.gy);
      cc.strokeStyle = C.ink;
      cc.lineWidth = 24 * k;
      cc.lineCap = "round";
      cc.beginPath();
      cc.moveTo(tx, g.gy + 10 * k);
      cc.quadraticCurveTo(tx + 40 * k, hy + 120 * k, hx, hy + 60 * k);
      cc.stroke();
      cc.strokeStyle = GDARK;
      cc.lineWidth = 16 * k;
      cc.stroke();
      for (let i = 0; i < 4; i++) {
        const q = 0.15 + i * 0.2,
          px = lerp(lerp(tx, tx + 40 * k, q), lerp(tx + 40 * k, hx, q), q),
          py = lerp(lerp(g.gy, hy + 120 * k, q), lerp(hy + 120 * k, hy + 60 * k, q), q);
        cc.save();
        cc.translate(px, py);
        cc.rotate((i % 2 ? 1 : -1) * 1.0 + 0.3);
        const len = (150 - i * 20) * k;
        cel(cc, env, leaf(len, 46 * k), GDARK, 0, -len / 2, 22 * k, { hatch: 0 });
        cc.fillStyle = C.ink;
        cc.beginPath();
        for (let j = 1; j < 6; j++) {
          const yy = -len * (j / 6.5),
            w = 22 * k * Math.sin((Math.PI * j) / 6.5) + 4 * k;
          for (const sg of [-1, 1]) {
            cc.moveTo(sg * w * 0.8, yy - 6 * k);
            cc.lineTo(sg * (w + 20 * k), yy - 14 * k);
            cc.lineTo(sg * w * 0.8, yy + 6 * k);
          }
        }
        cc.fill();
        cc.restore();
      }
      cel(cc, env, circ(hx, hy + 30 * k, 50 * k), GDARK, hx, hy + 30 * k, 50 * k, { hatch: 3 });
      const fl = new Path2D();
      for (let j = 0; j < 13; j++) {
        const a = -Math.PI + (j / 12) * Math.PI;
        fl.moveTo(hx, hy + 10 * k);
        fl.lineTo(hx + Math.cos(a - 0.08) * 90 * k, hy + Math.sin(a - 0.08) * 90 * k);
        fl.lineTo(hx + Math.cos(a + 0.08) * 90 * k, hy + Math.sin(a + 0.08) * 90 * k);
        fl.closePath();
      }
      cel(cc, env, fl, mix(C.accent, C.s2, 0.45), hx, hy - 30 * k, 60 * k, { hatch: 0 });
      cc.restore();
      // the heartbeat ring: halftone dots pulsing out once per beat, slowing
      const t = F - 828,
        beat = Math.floor(t / 12),
        q = (t % 12) / 12,
        slow = lerp(1, 0.55, prog(F, 828, 864));
      if (!o.mini) {
        const rr = (60 + 300 * ease.outCubic(q * slow)) * k,
          ring = new Path2D(),
          w = 44 * k;
        ring.ellipse(rx + 50 * s, g.gy - 45 * s, rr, rr * 0.8, 0, 0, TAU);
        ring.ellipse(rx + 50 * s, g.gy - 45 * s, Math.max(1, rr - w), Math.max(1, (rr - w) * 0.8), 0, 0, TAU, true);
        dots(cc, env, ring, 0.7, C.accent, (1 - q * q) * (beat < 2 ? 1 : 0.75));
      }
      const P_ = lerp(8, 24, ease.inOutCubic(prog(Tc, 828, 862))),
        relax = ease.inOutCubic(prog(Tc, 840, 848)),
        p = rp({
          ribs: 1 + 0.05 * Math.sin((TAU * (Tc - 828)) / P_),
          neck: 0.15,
          e0: lerp(0.02, -0.7, relax),
          e1: lerp(-0.08, -0.85, relax),
          pupil: lerp(0.38, 0.6, relax),
          eye: lerp(1, 0.75, relax),
          tw: twitch(Tc, lerp(3, 1, relax)),
        });
      rabbit(cc, env, rx, g.gy, s, p);
    });
  };

  // 14 · dusk: the hop home along the hedge; a shadow, a freeze, a moth; then the warren
  const dusk = (c: Ctx, env: Env, F: number, R: R, o: Opt = {}) => {
    const g = geo(R),
      k = g.k;
    const Fm = o.mini ? 864 + mod(F, 36) : F,
      Tc = tw(Fm);
    light("dusk");
    // hop progress: hops every beat except during the freeze (912–936)
    const hops = (t: number) => {
      if (t < 912) return hop(t, 864).step;
      if (t < 940) return hop(911, 864).step;
      return hop(911, 864).step + hop(t, 940).step;
    };
    const s = (g.tall ? 1.75 : 1.5) * k,
      step = 150 * k,
      wx = R.x + R.w * (g.tall ? 0.3 : 0.34),
      freezeP = ease.outCubic(window01(Fm, 912, 915, 936, 946)),
      camX = (o.mini ? 0 : hops(Math.max(864, F - 3)) * step) * (g.tall ? 1 : 1),
      rx0 = wx + hops(Tc) * step;
    const cam: Cam = {
      x: camX + freezeP * (wx + 90 * s - g.cx),
      y: freezeP * (g.gy - g.cy - 80 * k) * (g.tall ? 0.35 : 1),
      zoom: 1 + 0.3 * freezeP,
      tilt: 0,
    };
    lay(c, R, cam, Infinity, (cc) => {
      skyBands(cc, env, R, "dusk", g.hz);
      sun(cc, R.x + R.w * 0.16, g.hz - 10 * k, 80 * k, F, C.s3, true);
    });
    flay(
      c,
      env,
      R,
      cam,
      30,
      4,
      (cc) => hedge(cc, env, R.x - R.w, R.x + R.w * 6, g.hz + 10 * k, 130 * k, 201, mix(GDARK, C.s2, 0.5), k),
      o.mini,
    );
    lay(c, R, cam, 8, (cc) => meadow(cc, env, R, g.hz, "dusk", k, 203, 90));
    lay(c, R, cam, 5, (cc) =>
      hedge(cc, env, R.x - R.w, R.x + R.w * 8, g.gy - 70 * k, 230 * k, 207, mix(GDARK, C.s2, 0.35), k),
    );
    lay(c, R, cam, 4, (cc) => {
      // long shadows fall to the right of everything
      const rx = rx0;
      cc.save();
      cc.globalAlpha = 0.35;
      cc.fillStyle = C.s2;
      cc.beginPath();
      cc.ellipse(rx + 180 * s, g.gy + 6 * k, 200 * s, 12 * s, 0, 0, TAU);
      cc.fill();
      cc.restore();
      let p: RP;
      if (Tc >= 912 && Tc < 940) p = freeze(Fm, { flat: 0.3, e0: 0.05, e1: -0.1 });
      else p = Tc < 912 ? hop(Tc, 864, 40).p : hop(Tc, 940, 40).p;
      rabbit(cc, env, rx, g.gy, s, p);
    });
    if (!o.mini) {
      if (F >= 900 && F < 914) {
        const q = prog(F, 900, 914);
        hawkShadow(c, env, lerp(R.x + R.w * 1.3, R.x - R.w * 0.4, q), g.gy - 40 * k, 3.6 * k, Math.sin(F * 0.5), 0.9);
      }
      if (F >= 928 && F < 950) {
        const q = prog(F, 928, 950);
        fringe(c, env, 9 * u, 1, 0, (cc) =>
          moth(
            cc,
            env,
            lerp(R.x - 300 * k, R.x + R.w + 300 * k, q),
            g.cy - 120 * k + Math.sin(q * 9) * 90 * k,
            (g.tall ? 3.2 : 3.6) * k,
            F,
          ),
        );
      }
      // the shadow lands: a snap of focus lines and the alarm over the frozen rabbit
      if (F >= 912 && F < 930) {
        const zf = 1 + 0.35 * freezeP,
          rxS = g.cx + zf * (wx + 90 * s - g.cx) * (1 - freezeP),
          ryS = g.cy + zf * (g.gy - g.cy - freezeP * (g.gy - g.cy - 80 * k) - 60 * s),
          ak = spring((F - 912) / FPS, { freq: 3.4, damp: 0.4 }) * (1 - prog(F, 924, 930));
        focus(c, R, rxS, ryS, 300 * k, 220 * k, F, 1 - prog(F, 922, 930));
        alarm(c, rxS + (g.tall ? 260 : 360) * k, ryS - (g.tall ? 300 : 200) * k, 130 * k, ak, F);
      }
      caption(c, R, "HOME.", F, 864, 912);
    }
  };
  /** 912–936: a cut in on the frozen rabbit as the wing shadow slides over it, the pupil trembling */
  const duskFreeze = (c: Ctx, env: Env, F: number, R: R) => {
    const g = geo(R),
      k = g.k;
    light("dusk");
    const cam: Cam = { x: 0, y: 0, zoom: lerp(1, 1.06, prog(F, 912, 936)), tilt: 0 };
    flay(c, env, R, cam, 14, 1.2, (cc) => {
      skyBands(cc, env, R, "dusk", g.hz - 40 * k);
      hedge(cc, env, R.x - R.w, R.x + R.w * 2, g.hz, 200 * k, 241, mix(GDARK, C.s2, 0.5), k * 1.4);
      meadow(cc, env, R, g.hz + 10 * k, "dusk", k * 1.5, 243, 20);
    });
    const s = (g.tall ? 4.4 : 4.6) * k,
      ex = g.tall ? g.cx - 20 * k : R.x + R.w * 0.46,
      ey = g.tall ? g.cy + 120 * k : g.cy + 20 * k,
      p = freeze(F, { flat: 0.25, e0: 0.02, e1: -0.1, neck: 0.1, pupil: 0.3, px: Math.floor(F / 2) % 2 ? 2 : -2 });
    lay(c, R, cam, 1.2, (cc) => rabbitAt(cc, env, ex, ey, s, p));
    // the wing shadow slides over it
    const q = prog(F, 912, 926);
    if (q > 0 && q < 1)
      hawkShadow(c, env, lerp(R.x + R.w * 1.5, R.x - R.w * 0.6, q), ey + 80 * k, 11 * k, Math.sin(F * 0.4), 0.9);
    const ak = spring((F - 914) / FPS, { freq: 3.4, damp: 0.4 });
    focus(c, R, ex, ey, 420 * k, 320 * k, F, 1 - prog(F, 928, 936));
    alarm(c, g.tall ? g.cx + 250 * k : R.x + R.w * 0.76, g.tall ? R.y + R.h * 0.3 : g.cy - 150 * k, 150 * k, ak, F);
  };
  const warren = (c: Ctx, env: Env, F: number, R: R) => {
    const g = geo(R),
      k = g.k,
      Tc = tw(F);
    light("dusk");
    const cam: Cam = {
      x: (F - 960) * 0.8 * u,
      y: 0,
      zoom: lerp(1, 1.06, prog(F, 960, 1032)),
      tilt: 0,
      sx: shake(F, 1008, 5),
    };
    lay(c, R, cam, Infinity, (cc) => {
      skyBands(cc, env, R, "dusk", g.hz);
      sun(cc, R.x + R.w * 0.08, g.hz + 10 * k, 70 * k, F, C.s3, true);
    });
    flay(c, env, R, cam, 30, 4, (cc) =>
      hedge(cc, env, R.x - R.w, R.x + R.w * 3, g.hz + 10 * k, 130 * k, 211, mix(GDARK, C.s2, 0.5), k),
    );
    lay(c, R, cam, 8, (cc) => meadow(cc, env, R, g.hz, "dusk", k, 213, 60));
    const bw = (g.tall ? 1000 : 1300) * k,
      bx = g.tall ? g.cx + 60 * k : R.x + R.w * 0.56;
    lay(c, R, cam, 4, (cc) => {
      const holes = bank(cc, env, bx, g.gy, bw, (g.tall ? 300 : 280) * k, [0.2, 0.42, 0.62, 0.84], k, "dusk");
      // ears pop up from each hole, one per beat
      [960, 972, 984].forEach((t0, i) => {
        const h = holes[i === 2 ? 3 : i]!,
          up = spring((Tc - t0) / FPS, { freq: 3, damp: 0.42 });
        if (up <= 0) return;
        cc.save();
        holeClip(cc, h, true);
        const pp = rp({ neck: 0.05, e0: 0.02 + 0.1 * Math.cos((TAU * (Tc + i * 2)) / 8), e1: -0.12, pupil: 0.5 });
        rabbitAt(cc, env, h[0] + 10 * k, h[1] + lerp(200, 8, clamp(up, 0, 1.2)) * k, 1.3 * k, pp, {
          fur: mix(C.s7, C.s2, 0.3),
        });
        cc.restore();
      });
      // the rabbit hops in and dives into its own hole
      const own = holes[2]!,
        s = 1.35 * k;
      if (Tc < 1008) {
        const h = hop(Tc, 960, 40),
          x0 = R.x - 120 * k,
          x = Math.min(lerp(x0, own[0] - 60 * k, prog(h.step, 0, 4)), own[0] - 60 * k),
          y = lerp(g.gy, own[1] + 50 * k, prog(Tc, 996, 1006));
        rabbit(cc, env, x, y, s, Tc < 1000 ? h.p : rp({ pitch: 0.2, e0: -0.4 }));
      } else if (Tc < 1016) {
        const d = prog(Tc, 1008, 1014);
        cc.save();
        holeClip(cc, own);
        rabbit(
          cc,
          env,
          own[0] - 20 * k + d * 40 * k,
          own[1] + 50 * k + d * 150 * k,
          s,
          rp({ ...bolt(0), pitch: 0.9, tail: 1 }),
        );
        cc.restore();
        // the white tail flashing
        if (d < 0.9) {
          cc.save();
          cc.strokeStyle = C.surface;
          cc.lineWidth = 6 * u;
          for (let i = 0; i < 8; i++) {
            const a = (i / 8) * TAU;
            cc.beginPath();
            cc.moveTo(own[0] - 50 * k + Math.cos(a) * 36 * k, own[1] + Math.sin(a) * 36 * k);
            cc.lineTo(own[0] - 50 * k + Math.cos(a) * 70 * k, own[1] + Math.sin(a) * 70 * k);
            cc.stroke();
          }
          cc.restore();
        }
      }
      puff(cc, env, own[0], own[1] + 50 * k, 130 * k, F, 1008, 16);
      // fireflies after
      for (let i = 0; i < 8; i++) {
        const a = prog(F, 1012 + i, 1024 + i);
        if (a <= 0) continue;
        sparkle(
          cc,
          R.x + hash(i, 221) * R.w + Math.sin(F * 0.07 + i) * 30 * k,
          g.hz + hash(i, 222) * 200 * k + Math.cos(F * 0.05 + i) * 20 * k,
          10 * k * a * (0.6 + 0.4 * Math.sin(F * 0.4 + i)),
        );
      }
    });
    const own = bx + (0.62 - 0.5) * bw;
    sfx("FWUP", own + 40 * k, g.gy - (g.tall ? 520 : 400) * k, (g.tall ? 210 : 190) * u, 1008, F, { t1: 1026 });
  };

  // 15 · night, the bookend: the burrow mouth with two eye glints
  const night = (c: Ctx, env: Env, F: number, R: R) => {
    const g = geo(R),
      k = g.k;
    light("night");
    skyBands(c, env, R, "night", g.hz);
    for (let i = 0; i < 40; i++) {
      const x = R.x + hash(i, 231) * R.w,
        y = R.y + hash(i, 232) * (g.hz - R.y),
        tw_ = 0.5 + 0.5 * Math.sin(F * 0.12 + i * 1.3);
      sparkle(c, x, y, (3 + 5 * hash(i, 233)) * k * tw_);
    }
    meadow(c, env, R, g.hz, "night", k, 235, 20);
    const [hole] = bank(c, env, g.cx, g.gy + 40 * k, R.w * 1.1, R.h * 0.42, [0.5], k * 1.6, "night");
    const bl = mod(tw(F) - 1128, 1152) < 4 ? 1 : 0;
    for (const sg of [-1, 1]) {
      c.fillStyle = C.surface;
      c.beginPath();
      c.ellipse(hole![0] + sg * 26 * k, hole![1] - 12 * k, 9 * k, 9 * k * (1 - bl) + 0.5, 0, 0, TAU);
      c.fill();
    }
  };

  // ================================================================ THE PAGE
  const pageLayout = () => {
    if (!tall) {
      const m = 40 * u,
        gt = 16 * u,
        top = m,
        bandH = 220 * u,
        bot = H - m - bandH - gt,
        bigW = 640 * u,
        gridW = W - 2 * m - gt - bigW,
        h = (bot - top - gt) / 2,
        w3 = (gridW - 2 * gt) / 3,
        w2 = (gridW - gt) / 2;
      const small: R[] = [
        { x: m, y: top, w: w3, h },
        { x: m + w3 + gt, y: top, w: w3, h },
        { x: m + 2 * (w3 + gt), y: top, w: w3, h },
        { x: m, y: top + h + gt, w: w2, h },
        { x: m + w2 + gt, y: top + h + gt, w: w2, h },
      ];
      return {
        small,
        last: { x: W - m - bigW, y: top, w: bigW, h: bot - top },
        band: { x: m, y: H - m - bandH, w: W - 2 * m, h: bandH },
      };
    }
    const m = 40 * u,
      gt = 16 * u,
      top = 70 * u,
      bandH = 400 * u,
      bandY = SAFE.y1 - bandH + 40 * u,
      bot = bandY - gt,
      w = (W - 2 * m - gt) / 2,
      h1 = (bot - top - 2 * gt) * 0.28,
      h3 = bot - top - 2 * gt - 2 * h1,
      w5 = (W - 2 * m - gt) * 0.36;
    const small: R[] = [
      { x: m, y: top, w, h: h1 },
      { x: m + w + gt, y: top, w, h: h1 },
      { x: m, y: top + h1 + gt, w, h: h1 },
      { x: m + w + gt, y: top + h1 + gt, w, h: h1 },
      { x: m, y: top + 2 * (h1 + gt), w: w5, h: h3 },
    ];
    return {
      small,
      last: { x: m + w5 + gt, y: top + 2 * (h1 + gt), w: W - 2 * m - w5 - gt, h: h3 },
      band: { x: m, y: bandY, w: W - 2 * m, h: bandH },
    };
  };
  const pageScene = (c: Ctx, env: Env, F: number) => {
    const PL = pageLayout(),
      shrink = ease.inOutCubic(prog(F, 1032, 1056)),
      paper = prog(F, 1032, 1040);
    c.fillStyle = mix(tall ? C.ground : C.deep, C.ground, paper);
    c.fillRect(0, 0, W, H);
    const push = lerp(1, 1.03, prog(F, 1056, 1152));
    c.save();
    c.translate(W / 2, H / 2);
    c.scale(push, push);
    c.translate(-W / 2, -H / 2);
    const small = [hookEye, skyHawk, hedgeEyes, dogFaceScene, dusk] as ((
      c: Ctx,
      env: Env,
      F: number,
      R: R,
      o?: Opt,
    ) => void)[];
    PL.small.forEach((b, i) => {
      const t0 = 1056 + i * 12,
        q = ease.outCubic(prog(F, t0, t0 + 6));
      if (q <= 0) return;
      c.fillStyle = C.ink;
      c.fillRect(b.x + 8 * u, b.y + 8 * u, b.w * q, b.h);
      c.save();
      c.beginPath();
      c.rect(b.x, b.y, b.w * q, b.h);
      c.clip();
      small[i]!(c, env, F, b, { mini: true });
      c.restore();
      // the border inks on
      c.strokeStyle = C.ink;
      c.lineWidth = 4 * u;
      c.strokeRect(b.x, b.y, b.w * q, b.h);
    });
    const L_ = PL.last,
      r: R = {
        x: lerp(PIC.x, L_.x, shrink),
        y: lerp(PIC.y, L_.y, shrink),
        w: lerp(PIC.w, L_.w, shrink),
        h: lerp(PIC.h, L_.h, shrink),
      };
    if (shrink > 0) {
      c.fillStyle = C.ink;
      c.fillRect(r.x + 8 * u * shrink, r.y + 8 * u * shrink, r.w, r.h);
    }
    c.save();
    c.beginPath();
    c.rect(r.x, r.y, r.w, r.h);
    c.clip();
    night(c, env, F, r);
    c.restore();
    c.strokeStyle = C.ink;
    c.lineWidth = 4 * u * shrink;
    if (shrink > 0) c.strokeRect(r.x, r.y, r.w, r.h);
    c.restore();
    // the title band slides up across the page foot: set, not popped
    if (F >= 1080) {
      const B = PL.band,
        up = ease.outCubic(prog(F, 1080, 1090)),
        by = lerp(H + 20 * u, B.y, up);
      c.fillStyle = C.ink;
      c.fillRect(B.x + 10 * u, by + 10 * u, B.w, B.h);
      c.fillStyle = C.s1;
      c.fillRect(B.x, by, B.w, B.h);
      c.strokeStyle = C.ink;
      c.lineWidth = 4 * u;
      c.strokeRect(B.x, by, B.w, B.h);
      const tsz = 112 * u,
        fo = { size: tsz, family: F_.sans, weight: 800, track: -0.02 };
      const line = (s: string, y: number) => {
        c.save();
        c.font = `800 ${tsz}px "${F_.sans}"`;
        (c as Ctx & { letterSpacing: string }).letterSpacing = `${-0.02 * tsz}px`;
        c.textAlign = "left";
        c.lineJoin = "round";
        const x = W / 2 - measure(c, s, fo) / 2;
        c.fillStyle = C.ink;
        c.fillText(s, x + 7 * u, y + 7 * u);
        c.strokeStyle = C.ink;
        c.lineWidth = 7 * u;
        c.strokeText(s, x, y);
        c.fillStyle = C.surface;
        c.fillText(s, x, y);
        c.restore();
      };
      if (!tall) {
        line("BURROW DAYS", by + 118 * u);
        text(c, "one more day, and home.", W / 2, by + 186 * u, {
          size: 52 * u,
          family: F_.italic,
          color: C.ink,
          align: "center",
        });
      } else {
        line("BURROW", by + 130 * u);
        line("DAYS", by + 250 * u);
        text(c, "one more day, and home.", W / 2, by + 335 * u, {
          size: 52 * u,
          family: F_.italic,
          color: C.ink,
          align: "center",
        });
      }
    }
  };

  // ================================================================ the frame
  const specks = (env: Env): Layer => {
    const w = Math.ceil(W * env.scale),
      h = Math.ceil(H * env.scale),
      key = `burrow:specks:${w}x${h}`;
    let S = env.cache.get(key) as Layer | undefined;
    if (!S) {
      S = env.canvas(w, h);
      const s = S.ctx;
      for (let i = 0; i < 6000; i++) {
        s.globalAlpha = 0.03 + 0.03 * hash(i, 5);
        s.fillStyle = i % 2 ? C.ink : C.surface;
        const z = (1 + hash(i, 3)) * env.scale * u;
        s.fillRect(hash(i, 1) * w, hash(i, 2) * h, z, z);
      }
      env.cache.set(key, S);
    }
    return S;
  };
  type Sc = (c: Ctx, env: Env, F: number, R: R) => void;
  const SHOTS: [number, string, Sc][] = [
    [0, "dawn-eye", (c, e, F, R) => hookEye(c, e, F, R)],
    [T.emerge, "emergence", emerge],
    [T.graze, "grazing", (c, e, F, R) => mid(c, e, F, R, "graze")],
    [T.macro, "clover-macro", macro],
    [T.shadow, "wing-shadow", (c, e, F, R) => mid(c, e, F, R, "shadow")],
    [T.alarm, "alarm-eye", (c, e, F, R) => eyeScene(c, e, F, R, "hawk")],
    [T.sky, "hawk-circling", (c, e, F, R) => skyHawk(c, e, F, R)],
    [T.sticker, "sticker-freeze", sticker],
    [
      T.stoop,
      "stoop",
      (c, e, F, R) => {
        skyHawk(c, e, F, R, {}, true);
        sfx(
          "KREEE!",
          R.x + R.w * (tall ? 0.5 : 0.24),
          tall ? SAFE.y0 + 200 * u : R.y + 200 * u,
          (tall ? 190 : 170) * u,
          276,
          F,
          { t1: 290, fill: C.surface, rot: -0.12 },
        );
      },
    ],
    [T.thump, "thump", (c, e, F, R) => mid(c, e, F, R, "thump")],
    [T.bolt, "strike-bolt", boltScene],
    [T.bramble, "bramble", brambleScene],
    [T.page3, "stalk-page", (c, e, F, R) => stalkPage(c, e, F, R)],
    [T.stalk, "stalk-wide", stalkWide],
    [T.over, "overhead", overhead],
    [T.race, "race", (c, e, F, R) => race(c, e, F, R, false)],
    [T.fence, "fence", (c, e, F, R) => race(c, e, F, R, true)],
    [T.path, "path", pathScene],
    [T.dogface, "dog-face", (c, e, F, R) => dogFaceScene(c, e, F, R)],
    [T.reyes, "rabbit-eye", (c, e, F, R) => eyeScene(c, e, F, R, "dog")],
    [T.split, "chase-split", (c, e, F, R) => splitScene(c, e, F, R)],
    [T.chase, "chase", chaseScene],
    [T.tumble, "tumble", tumble],
    [T.recall, "recall", recall],
    [T.thistle, "thistle", (c, e, F, R) => thistle(c, e, F, R)],
    [T.dusk, "dusk", (c, e, F, R) => dusk(c, e, F, R)],
    [912, "dusk-freeze", duskFreeze],
    [936, "moth", (c, e, F, R) => dusk(c, e, F, R)],
    [T.warren, "warren", warren],
    [T.page, "page", () => undefined],
  ];
  for (const [s] of SHOTS) if (s % 12) throw new Error(`burrowDays: shot at ${s} is off the 12-frame beat`);

  const paint = (ctx: Ctx, env: Env, F: number, scene: Sc, isPage: boolean) => {
    ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
    FNOW = F;
    LATE = [];
    ANCHOR = null;
    if (isPage) pageScene(ctx, env, F);
    else {
      ctx.fillStyle = tall ? C.ground : C.deep;
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.beginPath();
      ctx.rect(PIC.x, PIC.y, PIC.w, PIC.h);
      ctx.clip();
      scene(ctx, env, F, PIC);
      ctx.restore();
      if (tall) {
        ctx.strokeStyle = C.ink;
        ctx.lineWidth = 4 * u;
        ctx.strokeRect(PIC.x, PIC.y, PIC.w, PIC.h);
      }
    }
    // the print specks over the whole picture (they drift on the page)
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const sp = specks(env),
      dx = isPage ? Math.round(((F - 1032) * 0.6 * u * env.scale) % 40) : 0;
    ctx.drawImage(sp.canvas as CanvasImageSource, dx, 0);
    ctx.restore();
    // sound words last: comic lettering may break over the bars
    ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
    for (const f of LATE) f(ctx);
  };
  const shots: Shot[] = SHOTS.map(([start, sid, scene], i) => {
    const end = i + 1 < SHOTS.length ? SHOTS[i + 1]![0] : N;
    return { id: sid, start, end, draw: (ctx, local, env) => paint(ctx, env, start + local, scene, start === T.page) };
  });
  return {
    meta: { title: id, W, H, fps: FPS, bpm: BPM, durationFrames: N, raster: "cpu" },
    assets: { images: {}, fonts: P.assets },
    shots,
    audio: beatScore({
      frames: N,
      fps: FPS,
      bpm: BPM,
      mood: "drive",
      key: 2,
      drop: 192,
      hits: [216, 288, 300, 456, 552, 648, 744, 1008],
      whooshes: [204, 300, 408, 456, 672, 720, 912, 1056],
      ticks: [
        12, 24, 60, 72, 84, 96, 120, 144, 168, 252, 276, 324, 336, 360, 372, 384, 396, 432, 468, 480, 492, 504, 564,
        576, 588, 612, 624, 660, 768, 816, 840, 864, 936, 960, 972, 984, 1056, 1068, 1080, 1092, 1104, 1128,
      ],
      sign: 1080,
    }),
  };
}

export const burrowDays = make("landscape", "burrowDays");
export const burrowDaysVertical = make("vertical", "burrowDaysVertical");
