// STUDY 44 · MULTIPLANE (24 s, 30 fps, 100 bpm). A papercut diorama shot like a multiplane camera: seven flat
// layers of cut paper stand at real depths and a camera trucks in through them at dusk, toward a cabin whose lamp
// comes on. Nothing is faked: every layer is scaled about the vanishing point by s = z / (z − zc), so the near
// flats rush past while the far ridge barely grows and the sky and moon (infinite depth) never do. A rack focus
// blurs each flat by its distance from the focal plane (downscale, then upscale: never ctx.filter), every flat is
// one flat colour with a deckled edge, a paper-fibre texture and a soft shadow on the flat behind it.
// The ground rows (ridge, pines, clearing, ferns) rise from under the stage like a toy theatre's, so no flat is ever
// seen with its cut bottom edge; only the near trunks, which run off both edges, lower from above. Between the
// flats live the actors that give the walk its beats: an owl sweeping past close to the camera, a gust through the
// pines, a deer on the clearing that bolts as the pines part (every firefly flashing at once), the owl landing on
// the roof, and a warm flare when the lamp lights.
// No product, no brand: the forest, the cabin and the words are invented. Brand: the neutral pack, palette "dusk".
// Brief: series/studies/briefs/multiplane.json · prompt: series/studies/prompts/multiplane.prompt.md
//
// The whole film is one continuous function paint(F) of a (fractional) frame F; the shots only name the sections.
// Every outline is built once per size (lazily, on the first paint: Path2D does not exist in Node).
import PACK from "../../../brand/packs/studio/pack.json";
import { fractal, rng, type Ctx, type Env, type Layer, type P } from "../core";
import type { Film, Shot } from "../film";
import { bezier, clamp, ease, lerp, prog, spring } from "../kit/motion";
import { usePack } from "../kit/pack";
import { beatScore } from "../kit/score";
import { layout, type Size } from "../kit/sizes";
import { text } from "../kit/type";

const P_ = usePack(PACK),
  C = P_.palette("dusk"),
  F_ = P_.face;
const FPS = 30,
  BPM = 100,
  N = 720,
  BEAT = 18; // a beat is 18 frames
// the timeline, in frames (every section starts on a beat)
const T = { walk: 108, trees: 252, clearing: 396, lamp: 540, arrival: 612, sign: 648 };
const TAU = Math.PI * 2;
// the walk's actors, on the beat grid: the owl's close pass (whoosh), the gust (whoosh)
const OWL_CUE = 180,
  GUST_CUE = 270;

// ---------------------------------------------------------------- colour helpers
const rgb = (h: string) => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
};
const rgba = (h: string, a: number) => {
  const [r, g, b] = rgb(h);
  return `rgba(${r},${g},${b},${a})`;
};
const mix = (a: string, b: string, t: number) => {
  const A = rgb(a),
    B = rgb(b);
  return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i]!, t))).join(",")})`;
};

// ---------------------------------------------------------------- the camera (closed form)
// zc eases 0 → 7 over the walk on a slow-in, slow-out cubic bezier. Its handles are front-weighted (not the
// symmetric cubic) so the story's beats land: the ferns are gone by ~220, the trunks by ~390, the mid pines part
// across 396–540 and the cabin arrives at 612. zc at 252 / 396 / 540 = 2.1 / 4.5 / 6.5.
const CAM = bezier(0.2, 0.15, 0.8, 1);
const camT = (F: number) => CAM(prog(F, T.walk, T.arrival));
/** the settle: after arriving the camera keeps drifting (a slow creep in, a slow slide right), so the last hold
 *  still breathes. 0 until 560, then an eased-in ramp that is still moving at the last frame */
const settle = (F: number) => {
  const t = prog(F, 560, 720),
    a = 0.3;
  return (t < a ? (t * t) / (2 * a) : t - a / 2) / (1 - a / 2);
};
const zcAt = (F: number) => 7 * camT(F) + 0.35 * settle(F);
// the flats' depths (arbitrary units); the sky and the moon are at infinity
const Z = { ridge: 40, farPines: 20, clearing: 12, midPines: 9, trunks: 5, ferns: 3 };
// a flat lowers in on a spring with a tiny overshoot (1.5 %). Its FIRST contact with rest is solved in closed form
// (a step response first reaches 1 at ωd·t = π − acos ζ), so each flat touches down exactly on its tick.
const DROP = { freq: 1.325, damp: 0.8 };
const CROSS = (Math.PI - Math.acos(DROP.damp)) / (TAU * DROP.freq * Math.sqrt(1 - DROP.damp ** 2)); // seconds
const LAND = { ridge: 18, farPines: 36, clearing: 54, midPines: 72, trunks: 90, ferns: 108 };
// rack focus: [from, to, focal depth]. During the drop the focus follows each flat as it lands; then the walk
// racks ferns → near trunks → mid pines → cabin, each pull a beat long, on the beat.
const RACKS: [number, number, number][] = [
  [LAND.farPines - 8, LAND.farPines + 6, Z.farPines],
  [LAND.clearing - 8, LAND.clearing + 6, Z.clearing],
  [LAND.midPines - 8, LAND.midPines + 6, Z.midPines],
  [LAND.trunks - 8, LAND.trunks + 6, Z.trunks],
  [LAND.ferns - 8, LAND.ferns + 6, Z.ferns],
  [144, 162, Z.trunks],
  [288, 306, Z.midPines],
  [378, 384, Z.clearing], // a snap, on the deer's head coming up
];
/** the focal plane as inverse distance from the camera, 1 / (zf − zc) */
const focusInv = (F: number, zc: number) => {
  const inv = (z: number) => 1 / Math.max(0.35, z - zc);
  let v = inv(Z.ridge);
  for (const [a, b, z] of RACKS) {
    const e = ease.inOutCubic(prog(F, a, b));
    if (e >= 1) v = inv(z);
    else if (e > 0) v = lerp(v, inv(z), e);
  }
  return v;
};
const K_BLUR = 22; // px of blur per unit of inverse-depth difference
/** quantised blur: 1 (sharp), 2, 4 or 8 px, which is also the downscale factor */
const level = (d: number) => (d < 1.4 ? 1 : d < 3.2 ? 2 : d < 6.4 ? 4 : 8);
/** the same four levels, but across a band around each step the two neighbours cross-fade (w = the share of the
 *  softer one), so a rack pull glides instead of popping a whole flat from one level to the next */
const levelMix = (d: number): [number, number, number] => {
  const TH = [1.4, 3.2, 6.4],
    LV = [1, 2, 4, 8];
  for (let i = 0; i < 3; i++) {
    const band = 0.3 * TH[i]!;
    if (d < TH[i]! - band) return [LV[i]!, LV[i]!, 0];
    if (d < TH[i]! + band) {
      const t = (d - (TH[i]! - band)) / (2 * band);
      return [LV[i]!, LV[i + 1]!, t * t * (3 - 2 * t)];
    }
  }
  return [8, 8, 0];
};

// ---------------------------------------------------------------- geometry helpers (clockwise polygons)
const area = (pts: P[]) => {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i]!,
      [x2, y2] = pts[(i + 1) % pts.length]!;
    a += x1 * y2 - x2 * y1;
  }
  return a;
};
/** every subpath clockwise on screen, so overlapping pieces union under the nonzero rule */
const cw = (pts: P[]): P[] => (area(pts) < 0 ? [...pts].reverse() : pts);
/** the deckled cut: resample every `step` px and jitter each point by 1–2 px (seeded, fixed per size) */
const deckle = (pts: P[], r: () => number, u: number, step = 7, amt = 1): P[] => {
  const out: P[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]!,
      b = pts[(i + 1) % pts.length]!,
      n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / (step * u)));
    for (let k = 0; k < n; k++) {
      const amp = (1 + r()) * u * amt,
        ang = r() * TAU;
      out.push([lerp(a[0], b[0], k / n) + Math.cos(ang) * amp, lerp(a[1], b[1], k / n) + Math.sin(ang) * amp]);
    }
  }
  return out;
};
/** a mound: the top half of an ellipse, with a body that runs down to `bottom` (so a falling flat has no hole) */
const hump = (x: number, y: number, rx: number, ry: number, bottom: number): P[] =>
  cw([
    ...Array.from(
      { length: 21 },
      (_, i) => [x - rx + (2 * rx * i) / 20, y - ry * Math.sqrt(Math.max(0, 1 - ((2 * i) / 20 - 1) ** 2))] as P,
    ),
    [x + rx, bottom],
    [x - rx, bottom],
  ]);
const ellipse = (x: number, y: number, rx: number, ry: number, n = 28): P[] =>
  Array.from({ length: n }, (_, i) => [x + Math.cos((i / n) * TAU) * rx, y + Math.sin((i / n) * TAU) * ry] as P);
/** a tiered pine: tip, drooping tiers down both sides, a trunk that runs below the ground line */
const pine = (
  x: number,
  base: number,
  h: number,
  w: number,
  r: () => number,
  tiers: number,
  trunk: number,
  down: number,
): P[] => {
  const top = base - h,
    right: P[] = [],
    left: P[] = [];
  for (let k = 0; k < tiers; k++) {
    const f = (k + 1) / tiers,
      y = top + h * 0.84 * f,
      hr = (w / 2) * (0.26 + 0.74 * f) * (0.86 + 0.28 * r()),
      hl = (w / 2) * (0.26 + 0.74 * f) * (0.86 + 0.28 * r());
    right.push([x + hr, y + h * 0.015]);
    left.push([x - hl, y + h * 0.015]);
    if (k < tiers - 1) {
      right.push([x + hr * 0.4, y - h * 0.03]);
      left.push([x - hl * 0.4, y - h * 0.03]);
    }
  }
  const tw = trunk / 2,
    yb = top + h * 0.84 + h * 0.015;
  return cw([
    [x, top],
    ...right,
    [x + tw, yb],
    [x + tw, base + down],
    [x - tw, base + down],
    [x - tw, yb],
    ...left.reverse(),
  ]);
};
/** a fern frond: a curving spine with leaflets both sides, widest in the middle, pointing to the tip */
const frond = (bx: number, by: number, len: number, a0: number, curl: number, u: number): P[] => {
  const M = 16,
    L: P[] = [],
    R: P[] = [];
  let x = bx,
    y = by;
  for (let i = 0; i <= M; i++) {
    const t = i / M,
      a = a0 + curl * t * t,
      dx = Math.sin(a),
      dy = -Math.cos(a),
      nx = Math.cos(a),
      ny = Math.sin(a),
      h = len * 0.15 * Math.sin(Math.PI * (0.12 + 0.88 * t)) + 2 * u;
    if (i > 0) {
      // the leaflet tips lean toward the tip of the frond; the notch sits half a step back, close to the spine
      L.push([x - nx * h + dx * h * 0.45, y - ny * h + dy * h * 0.45]);
      R.push([x + nx * h + dx * h * 0.45, y + ny * h + dy * h * 0.45]);
    }
    const st = len / M;
    x += dx * st;
    y += dy * st;
    if (i < M) {
      L.push([x - nx * h * 0.22 - dx * st * 0.5, y - ny * h * 0.22 - dy * st * 0.5]);
      R.push([x + nx * h * 0.22 - dx * st * 0.5, y + ny * h * 0.22 - dy * st * 0.5]);
    }
  }
  return cw([[bx - 3 * u, by + 30 * u], ...L, [x, y], ...R.reverse(), [bx + 3 * u, by + 30 * u]]);
};

// ---------------------------------------------------------------- blur without ctx.filter
// One scratch surface per blur level per size, cleared and reused by every soft() call within a frame.
const scratch = (env: Env, d: number, role = "draw"): Layer => {
  const w = Math.ceil((env.W * env.scale) / d) + 2,
    h = Math.ceil((env.H * env.scale) / d) + 2,
    key = `multiplane:${role}:${d}:${w}x${h}`;
  let L = env.cache.get(key) as Layer | undefined;
  if (!L) {
    L = env.canvas(w, h);
    env.cache.set(key, L);
  }
  return L;
};
/** draw(c) paints in logical px; at d > 1 it is drawn at 1/d resolution and scaled back up (a soft blur) */
function soft(ctx: Ctx, env: Env, d: number, alpha: number, draw: (c: Ctx) => void) {
  if (alpha <= 0.003) return;
  if (d <= 1) {
    ctx.save();
    ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
    ctx.globalAlpha = alpha;
    draw(ctx);
    ctx.restore();
    return;
  }
  const S = scratch(env, d),
    c = S.ctx;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha = 1;
  c.globalCompositeOperation = "source-over";
  c.clearRect(0, 0, S.canvas.width, S.canvas.height);
  c.setTransform(env.scale / d, 0, 0, env.scale / d, 0, 0);
  draw(c);
  // scale back up an octave at a time (1/8 → 1/4 → 1/2 → 1): each bilinear 2× step smooths the last one's
  // stair-steps, so a big soften stays round instead of blocky
  let src = S,
    k = d;
  while (k > 2) {
    const U = scratch(env, k / 2, "up"),
      uc = U.ctx;
    uc.setTransform(1, 0, 0, 1, 0, 0);
    uc.globalAlpha = 1;
    uc.globalCompositeOperation = "source-over";
    uc.clearRect(0, 0, U.canvas.width, U.canvas.height);
    uc.imageSmoothingEnabled = true;
    uc.imageSmoothingQuality = "high";
    uc.drawImage(src.canvas, 0, 0, src.canvas.width * 2, src.canvas.height * 2);
    src = U;
    k /= 2;
  }
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = alpha;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src.canvas, 0, 0, src.canvas.width * k, src.canvas.height * k);
  ctx.restore();
}

/** soft() at a blend of two blur levels: each is drawn into its own full-size layer and the two are summed with
 *  'lighter' at (1 − w) and w, which is an exact cross-fade (colour and coverage), then laid down at `alpha` */
function softMix(ctx: Ctx, env: Env, m: [number, number, number], alpha: number, draw: (c: Ctx) => void) {
  const [a, b, w] = m;
  if (w <= 0.002 || a === b) return soft(ctx, env, a, alpha, draw);
  if (w >= 0.998) return soft(ctx, env, b, alpha, draw);
  if (alpha <= 0.003) return;
  const A = scratch(env, 1, "mixA"),
    M = scratch(env, 1, "mixM");
  const clear = (l: Layer) => {
    l.ctx.setTransform(1, 0, 0, 1, 0, 0);
    l.ctx.globalAlpha = 1;
    l.ctx.globalCompositeOperation = "source-over";
    l.ctx.clearRect(0, 0, l.canvas.width, l.canvas.height);
  };
  clear(M);
  [
    [a, 1 - w],
    [b, w],
  ].forEach(([d, k], i) => {
    clear(A);
    soft(A.ctx, env, d!, 1, draw);
    M.ctx.setTransform(1, 0, 0, 1, 0, 0);
    M.ctx.globalCompositeOperation = i ? "lighter" : "source-over";
    M.ctx.globalAlpha = k!;
    M.ctx.drawImage(A.canvas, 0, 0);
  });
  M.ctx.globalCompositeOperation = "source-over";
  M.ctx.globalAlpha = 1;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = alpha;
  ctx.drawImage(M.canvas, 0, 0);
  ctx.restore();
}

// ---------------------------------------------------------------- the paper fibre (one seeded tile per size)
const TILE = 256;
const fibreTile = (env: Env): Layer => {
  const key = `multiplane:fibre:${env.W}x${env.H}:${env.scale}`;
  let L = env.cache.get(key) as Layer | undefined;
  if (L) return L;
  const n = Math.round(TILE * env.scale);
  L = env.canvas(n, n);
  const img = L.ctx.createImageData(n, n),
    d = img.data,
    r = rng(44);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const lx = x / env.scale,
        ly = y / env.scale,
        fib = fractal(71, lx, ly, 0.012, 0.16, 3, TILE), // long fibres, stretched along x
        mott = fractal(73, lx, ly, 0.02, 0.02, 2, TILE),
        v = 0.62 + (fib - 0.5) * 0.9 + (mott - 0.5) * 0.35 + (r() - 0.5) * 0.18,
        i = (y * n + x) * 4;
      d[i] = d[i + 1] = d[i + 2] = Math.round(clamp(v) * 255);
      d[i + 3] = 255;
    }
  L.ctx.putImageData(img, 0, 0);
  env.cache.set(key, L);
  return L;
};

type Flat = {
  id: keyof typeof Z;
  z: number;
  color: string;
  land: number;
  /** where it starts, below (+) or above (−) its rest: ground rows rise from under the stage (so their cut bottom
   *  is never seen), the hanging trunks lower from above */
  drop: number;
  /** the gap to the flat behind it (drives the shadow offset) */
  behind: number;
  polys: P[][];
};

export function make(size: Size, id: string): Film {
  const L = layout(size),
    { W, H, u, cx, tall } = L;
  // the vanishing point: the frame centre (landscape); the vertical scales about the cabin's height instead, so
  // the cabin stays in the lower-middle third while the tall trees rush up and out
  const vx = cx,
    vy = tall ? 0.6 * H : 0.5 * H;
  const PMAX = 630 * u; // the camera's drift in x toward the cabin (px at unit inverse depth)
  const pan = (F: number) => PMAX * camT(F) + 420 * u * settle(F);
  const bob = (F: number) =>
    -3 *
    u *
    Math.abs(Math.sin((Math.PI * (F - T.walk)) / (BEAT / 2))) *
    prog(F, T.walk, T.walk + 18) *
    (1 - prog(F, 576, T.arrival));
  const tilt = (F: number) => (tall ? 50 * u * camT(F) : 0); // vertical: a slight tilt up as it trucks in

  // ---- authored layout (at zc = 0), per size
  const G = tall
    ? {
        ridge: 0.5 * H,
        farBase: 0.585 * H,
        ground: 0.62 * H,
        midBase: 0.9 * H,
        cabX: 0.56 * W,
        moon: [0.25 * W, 0.28 * H] as P,
      }
    : {
        ridge: 0.54 * H,
        farBase: 0.615 * H,
        ground: 0.64 * H,
        midBase: 0.93 * H,
        cabX: 0.56 * W,
        moon: [0.2 * W, 0.22 * H] as P,
      };
  const MOON_R = 56 * u;
  const cab = { x: G.cabX, base: G.ground + 6 * u, hw: 84 * u, wall: 92 * u, roof: 78 * u, eave: 16 * u };
  const win = { x: cab.x - 34 * u, y: cab.base - 58 * u, w: 34 * u, h: 38 * u };
  const chim = { x: cab.x + 44 * u, w: 22 * u, top: cab.base - cab.wall - cab.roof - 6 * u };
  const roofY = (x: number) => cab.base - cab.wall - cab.roof * (1 - Math.abs(x - cab.x) / (cab.hw + cab.eave));

  // ---- the flats, back to front (built as point lists; Path2D comes later, in the browser)
  const flats: Flat[] = (() => {
    const out: Flat[] = [];
    // far ridge: rolling hills
    {
      const r = rng(4401),
        top: P[] = [];
      const ph = [r() * TAU, r() * TAU, r() * TAU];
      for (let x = -0.4 * W; x <= 1.4 * W; x += 14 * u)
        top.push([
          x,
          G.ridge -
            (38 * Math.sin((x / W) * 5.1 + ph[0]!) +
              22 * Math.sin((x / W) * 11.3 + ph[1]!) +
              9 * Math.sin((x / W) * 29 + ph[2]!)) *
              u -
            (tall ? 90 * u : 0),
        ]);
      out.push({
        id: "ridge",
        z: Z.ridge,
        color: C.s1!,
        land: LAND.ridge,
        behind: 16,
        drop: 0.62 * H,
        polys: [cw([...top, [1.4 * W, 1.4 * H], [-0.4 * W, 1.4 * H]])],
      });
    }
    // far pines: a dense row of small pines on a ground band
    {
      const r = rng(4402),
        polys: P[][] = [];
      for (let x = -0.3 * W; x <= 1.3 * W; x += (18 + r() * 22) * u) {
        const h = (tall ? 120 + r() * 150 : 70 + r() * 110) * u;
        polys.push(pine(x, G.farBase + r() * 8 * u, h, h * (0.42 + r() * 0.12), r, 4, 5 * u, 20 * u));
      }
      polys.push(
        cw([
          [-0.4 * W, G.farBase + 6 * u],
          [1.4 * W, G.farBase + 6 * u],
          [1.4 * W, 1.4 * H],
          [-0.4 * W, 1.4 * H],
        ]),
      );
      out.push({ id: "farPines", z: Z.farPines, color: C.s2!, land: LAND.farPines, behind: 16, drop: 0.62 * H, polys });
    }
    // the clearing: a gentle ground line, a few low shrubs, and the cabin (pitched roof, chimney)
    {
      const r = rng(4403),
        top: P[] = [];
      for (let x = -0.9 * W; x <= 1.9 * W; x += 20 * u)
        top.push([x, G.ground + (5 * Math.sin(x * 0.006 + 1) + 3 * Math.sin(x * 0.017)) * u]);
      const polys: P[][] = [cw([...top, [1.9 * W, 1.3 * H], [-0.9 * W, 1.3 * H]])];
      const x0 = cab.x - cab.hw,
        x1 = cab.x + cab.hw,
        wt = cab.base - cab.wall;
      polys.push(
        cw([
          [x0 - cab.eave, wt + 6 * u],
          [cab.x, wt - cab.roof],
          [x1 + cab.eave, wt + 6 * u],
          [x1, wt + 6 * u],
          [x1, cab.base + 8 * u],
          [x0, cab.base + 8 * u],
          [x0, wt + 6 * u],
        ]),
      );
      polys.push(
        cw([
          [chim.x - chim.w / 2, chim.top],
          [chim.x + chim.w / 2, chim.top],
          [chim.x + chim.w / 2, roofY(chim.x + chim.w / 2) + 6 * u],
          [chim.x - chim.w / 2, roofY(chim.x - chim.w / 2) + 6 * u],
        ]),
      );
      for (const [fx, rx, ry] of [
        [-0.3, 60, 26],
        [-0.16, 40, 20],
        [0.24, 52, 22],
        [0.38, 70, 28],
      ] as const)
        polys.push(ellipse(cab.x + fx * W, G.ground + 4 * u, (rx + r() * 12) * u, (ry + r() * 6) * u));
      out.push({ id: "clearing", z: Z.clearing, color: C.s3!, land: LAND.clearing, behind: 8, drop: 0.62 * H, polys });
    }
    // mid pines: two stands of tall pines, a curtain either side of the cabin
    {
      const r = rng(4404),
        polys: P[][] = [];
      const xs = tall
        ? [-0.34, -0.12, 0.08, 0.27, 0.77, 0.94, 1.12, 1.32]
        : [-0.18, -0.04, 0.12, 0.29, 0.69, 0.83, 0.97, 1.12];
      xs.forEach((f, i) => {
        const inner = i === 3 || i === 4,
          h = (tall ? (inner ? 0.52 : 0.6 + r() * 0.24) : inner ? 0.58 : 0.64 + r() * 0.22) * H;
        polys.push(
          pine(f * W, G.midBase + r() * 20 * u, h, h * (tall ? 0.46 : 0.4) * (0.9 + r() * 0.2), r, 7, 14 * u, 0.5 * H),
        );
      });
      out.push({ id: "midPines", z: Z.midPines, color: C.s4!, land: LAND.midPines, behind: 3, drop: 1.0 * H, polys });
    }
    // near trunks: straight, slightly bent trunks that run off the top and bottom, with a few branch stubs
    {
      const r = rng(4405),
        polys: P[][] = [];
      const list: [number, number][] = tall
        ? [
            [0.04, 64],
            [0.22, 38],
            [0.81, 48],
            [0.99, 76],
          ]
        : [
            [0.05, 88],
            [0.22, 62],
            [0.355, 32],
            [0.8, 72],
            [0.955, 98],
          ];
      for (const [f, w0] of list) {
        const xc = f * W,
          ph = r() * TAU,
          bend = (10 + r() * 16) * u,
          right: P[] = [],
          left: P[] = [];
        const at = (y: number) => xc + bend * Math.sin((y / H) * 2.2 + ph);
        for (let y = -0.4 * H; y <= 1.4 * H; y += 40 * u) {
          const w = w0 * u * (0.82 + 0.18 * clamp(y / H));
          right.push([at(y) + w / 2, y]);
          left.push([at(y) - w / 2, y]);
        }
        polys.push(cw([...right, ...left.reverse()]));
        for (let k = 0; k < 3; k++) {
          const y = (0.08 + r() * 0.5) * H,
            dir = r() < 0.5 ? -1 : 1,
            w = w0 * u * 0.45,
            len = (30 + r() * 50) * u,
            ex = at(y) + (dir * w0 * u) / 2 - dir * 4 * u;
          polys.push(
            cw([
              [ex, y],
              [ex + dir * len, y - len * 0.7],
              [ex + dir * len + dir * 3 * u, y - len * 0.7 + 6 * u],
              [ex, y + w * 0.6],
            ]),
          );
        }
      }
      out.push({
        id: "trunks",
        z: Z.trunks,
        color: mix(C.s4!, C.deep!, 0.55),
        land: LAND.trunks,
        behind: 4,
        drop: -1.5 * H,
        polys,
      });
    }
    // ferns: two big clumps at the corners, two low ones in between, on a mounded bed
    {
      const r = rng(4406),
        polys: P[][] = [];
      const clumps: [number, number, number, number][] = tall
        ? [
            [0.04, 0.3, 0.44, 9],
            [0.97, 0.28, 0.42, 9],
            [0.3, 0.12, 0.19, 5],
            [0.73, 0.11, 0.17, 5],
          ]
        : [
            [0.06, 0.28, 0.42, 9],
            [0.95, 0.27, 0.4, 9],
            [0.32, 0.1, 0.16, 5],
            [0.7, 0.09, 0.14, 5],
          ];
      for (const [f, l0, l1, n] of clumps) {
        const bx = f * W,
          by = H + 14 * u;
        for (let i = 0; i < n; i++) {
          const a = lerp(-1.25, 1.25, i / (n - 1)) + (r() - 0.5) * 0.25,
            len = lerp(l0, l1, 1 - Math.abs(a) / 1.4) * H * (0.85 + r() * 0.3);
          polys.push(frond(bx + (r() - 0.5) * 40 * u, by, len, a, Math.sign(a || 1) * (0.5 + r() * 0.4), u));
        }
        polys.push(hump(bx, H + 0.02 * H, (l0 * 0.9 + 0.06) * W * (tall ? 0.9 : 0.5), 0.07 * H, H + 0.08 * H));
      }
      out.push({ id: "ferns", z: Z.ferns, color: C.deep!, land: LAND.ferns, behind: 2, drop: 0.62 * H, polys });
    }
    return out;
  })();

  // ---- sky: flat bands with deckled edges, the pink horizon strip below
  const bandPolys: [string, P[]][] = (() => {
    const r = rng(4400),
      bands: [number, string][] = tall
        ? [
            [0.44, C.line],
            [0.35, C.surface],
            [0.25, C.ground],
          ]
        : [
            [0.44, C.line],
            [0.34, C.surface],
            [0.24, C.ground],
          ];
    return bands.map(([y, col]) => {
      const edge: P[] = [];
      for (let x = 1.2 * W; x >= -0.2 * W; x -= 60 * u) edge.push([x, y * H + Math.sin(x * 0.004 + y * 20) * 4 * u]);
      return [col, deckle(cw([[-0.2 * W, -0.4 * H], [1.2 * W, -0.4 * H], ...edge]), r, u, 9)] as [string, P[]];
    });
  })();

  // ---- Path2D, built on the first paint (the browser has it; Node, which loads this module, does not)
  let paths: Map<string, Path2D> | null = null;
  const toPath = (polys: P[][]) => {
    const p = new Path2D();
    for (const pts of polys) {
      pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
      p.closePath();
    }
    return p;
  };
  const getPaths = () => {
    if (paths) return paths;
    paths = new Map();
    flats.forEach((f, i) => {
      const r = rng(4500 + i);
      paths!.set(f.id, toPath(f.polys.map((pts) => deckle(pts, r, u))));
    });
    bandPolys.forEach(([, pts], i) => paths!.set(`band${i}`, toPath([pts])));
    // the stage floor: a dark far land under a thin pink horizon, so before the flats rise the frame is a dusk
    // horizon, not a field of pink
    {
      const edge: P[] = [];
      for (let x = -0.2 * W; x <= 1.2 * W; x += 60 * u) edge.push([x, 0.6 * H + Math.sin(x * 0.005 + 2) * 5 * u]);
      paths.set("floor", toPath([deckle(cw([...edge, [1.2 * W, 1.6 * H], [-0.2 * W, 1.6 * H]]), rng(4498), u, 9)]));
    }
    paths.set("moon", toPath([deckle(ellipse(G.moon[0], G.moon[1], MOON_R, MOON_R, 60), rng(4499), u, 10, 0.5)]));
    return paths;
  };

  // ---- the view of a flat at depth z: scale about the vanishing point, parallax drift, bob, tilt, drop
  type View = { s: number; ox: number; oy: number; alpha: number; gap: number };
  const view = (z: number, F: number, land?: number, drop = 0): View | null => {
    const zc = zcAt(F),
      gap = z - zc,
      alpha = clamp((gap - 0.4) / 0.6);
    if (alpha <= 0) return null;
    let dy = 0;
    if (land !== undefined) {
      const p = spring((F - land) / FPS + CROSS, DROP);
      if (p <= 0) return null;
      dy = (1 - p) * drop;
    }
    return { s: z / gap, ox: -pan(F) / gap, oy: bob(F) + tilt(F) + dy, alpha, gap };
  };
  const apply = (c: Ctx, v: View) => {
    c.translate(vx + v.ox, vy + v.oy);
    c.scale(v.s, v.s);
    c.translate(-vx, -vy);
  };
  const toScreen = (v: View, x: number, y: number): P => [vx + (x - vx) * v.s + v.ox, vy + (y - vy) * v.s + v.oy];

  const texture = (c: Ctx, env: Env, path: Path2D, x0: number, y0: number, x1: number, y1: number) => {
    const pat = c.createPattern(fibreTile(env).canvas, "repeat");
    if (!pat) return;
    pat.setTransform(new DOMMatrix().scale(1 / env.scale));
    c.save();
    c.clip(path);
    c.globalCompositeOperation = "multiply";
    c.globalAlpha *= 0.06;
    c.fillStyle = pat;
    c.fillRect(x0, y0, x1 - x0, y1 - y0);
    c.restore();
  };

  // ---- the lamp: window light, glow rings, the trapezoid on the path, chimney smoke (all on the clearing flat)
  const lampOn = (F: number) => prog(F, T.lamp, T.lamp + 9);
  // a lamp breathes: smooth value noise on 4-frame knots (seeded, a pure function of F), about ±12 %
  const knot = (i: number) => {
    const x = Math.sin(i * 127.1 + 44.7) * 43758.5453;
    return x - Math.floor(x);
  };
  const flicker = (F: number) => {
    const t = F / 4,
      i = Math.floor(t),
      f = t - i,
      e = f * f * (3 - 2 * f);
    return 1 + 0.24 * (lerp(knot(i), knot(i + 1), e) - 0.5);
  };
  // ---- the path's centre line (the mean of its two quadratic edges), t = 0 at the cabin
  const pathMid = (t: number): P => {
    const b = cab.base + 4 * u,
      yc = G.ground + 0.14 * H,
      q = (a: number, m: number, e: number) => (1 - t) ** 2 * a + 2 * t * (1 - t) * m + t * t * e;
    return [
      (q(cab.x + 34 * u, cab.x + 90 * u, cab.x + 160 * u) + q(cab.x + 4 * u, cab.x - 40 * u, cab.x - 220 * u)) / 2,
      q(b, yc, 1.3 * H),
    ];
  };
  // ---- a split-rail fence either side of the path: posts grow toward us, two rails between them
  const fence = (c: Ctx) => {
    const y0 = cab.base + 22 * u,
      y1 = cab.base + (tall ? 170 : 70) * u,
      span = (tall ? 330 : 300) * u;
    c.fillStyle = C.s4!;
    for (const side of [-1, 1]) {
      const xa = cab.x + (side < 0 ? -64 : 78) * u,
        xb = xa + side * span,
        n = tall ? 5 : 4,
        post = (k: number) => {
          const t = k / (n - 1);
          return {
            x: lerp(xa, xb, t),
            y: lerp(y0, y1, t),
            h: lerp(24, tall ? 60 : 44, t) * u,
            w: lerp(4, tall ? 9 : 7, t) * u,
          };
        };
      for (let k = 0; k < n; k++) {
        const p = post(k);
        c.fillRect(p.x - p.w / 2, p.y - p.h, p.w, p.h + 2 * u);
      }
      for (let k = 0; k < n - 1; k++) {
        const a = post(k),
          b = post(k + 1);
        for (const f of [0.35, 0.72]) {
          const th = 2.4 * u * (a.h / (24 * u)) ** 0.5;
          c.beginPath();
          c.moveTo(a.x, a.y - a.h * f);
          c.lineTo(b.x, b.y - b.h * f);
          c.lineTo(b.x, b.y - b.h * f + th * 1.3);
          c.lineTo(a.x, a.y - a.h * f + th);
          c.closePath();
          c.fill();
        }
      }
    }
  };
  // ---- the deer: walks onto the clearing, grazes, looks up on a beat (the focus snaps to it), bolts as the pines
  // part. Drawn on the clearing flat, so it parallaxes, blurs and casts its shadow with it.
  const DEER = { in: 306, stop: 342, graze: 348, alert: 378, bolt: 396, gone: 426 };
  const deerX = cab.x - (tall ? 0.2 : 0.21) * W,
    deerY = cab.base - 2 * u,
    DS = (tall ? 78 : 58) * u; // shoulder height
  /** add a polygon to the current path, clockwise, so it unions with the ellipses under the nonzero rule */
  const poly = (c: Ctx, pts: P[]) => cw(pts).forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py)));
  const deerShape = (c: Ctx, x: number, y: number, dir: number, head: number, legs: number[], tailUp: number) => {
    c.save();
    c.translate(x, y);
    c.scale(dir * DS, DS);
    c.beginPath();
    // barrel, chest and rump
    c.ellipse(0, -0.84, 0.46, 0.18, 0, 0, TAU);
    c.moveTo(0.54, -0.86);
    c.ellipse(0.34, -0.86, 0.2, 0.21, 0, 0, TAU);
    c.moveTo(-0.18, -0.88);
    c.ellipse(-0.36, -0.88, 0.18, 0.2, 0, 0, TAU);
    // the neck: a tapered column from the chest, up and forward (alert, head = 0) or down to the grass (head = 1)
    const na = lerp(-1.1, 1.05, head), // neck angle from horizontal, screen y down
      nl = lerp(0.5, 0.62, head),
      bx = 0.42,
      by = -0.92,
      hx = bx + Math.cos(na) * nl,
      hy = by + Math.sin(na) * nl,
      px = -Math.sin(na),
      py = Math.cos(na);
    poly(c, [
      [bx + px * 0.13, by + py * 0.13],
      [bx - px * 0.1, by - py * 0.1],
      [hx - px * 0.06, hy - py * 0.06],
      [hx + px * 0.06, hy + py * 0.06],
    ]);
    c.closePath();
    // the head: a skull and a tapering muzzle, pointing forward (alert) or down (grazing)
    const sa = lerp(0.35, 1.55, head),
      mx = hx + Math.cos(sa) * 0.2,
      my = hy + Math.sin(sa) * 0.2;
    c.moveTo(hx + 0.1, hy);
    c.ellipse(hx, hy, 0.1, 0.085, sa, 0, TAU);
    poly(c, [
      [hx + Math.cos(sa + 1.4) * 0.07, hy + Math.sin(sa + 1.4) * 0.07],
      [mx + Math.cos(sa + 1.4) * 0.035, my + Math.sin(sa + 1.4) * 0.035],
      [mx + Math.cos(sa) * 0.03, my + Math.sin(sa) * 0.03],
      [mx - Math.cos(sa + 1.4) * 0.035, my - Math.sin(sa + 1.4) * 0.035],
      [hx - Math.cos(sa + 1.4) * 0.07, hy - Math.sin(sa + 1.4) * 0.07],
    ]);
    c.closePath();
    // two ears, swept back from the skull (pricked up when alert)
    const ea = sa + Math.PI + lerp(0.9, 0.5, head);
    for (const k of [0, 0.35]) {
      const ex = hx + Math.cos(ea + k) * 0.2,
        ey = hy + Math.sin(ea + k) * 0.2;
      poly(c, [
        [hx + Math.cos(ea + k + 1.2) * 0.04, hy + Math.sin(ea + k + 1.2) * 0.04],
        [ex, ey],
        [hx + Math.cos(ea + k - 1.2) * 0.04, hy + Math.sin(ea + k - 1.2) * 0.04],
      ]);
      c.closePath();
    }
    // legs: thigh to knee (front) or hock (back) to hoof, tapering, each swung about its top by legs[i]
    const tops: [number, number, number][] = [
      [-0.4, -0.84, -1],
      [-0.3, -0.82, -1],
      [0.3, -0.8, 1],
      [0.4, -0.8, 1],
    ];
    tops.forEach(([tx, ty, front], i) => {
      const a = legs[i]!,
        rot = (dx: number, dy: number): P => [
          tx + dx * Math.cos(a) + dy * Math.sin(a),
          ty - dx * Math.sin(a) + dy * Math.cos(a),
        ],
        knee = front > 0 ? rot(0.02, 0.42) : rot(-0.1, 0.44),
        hoof = front > 0 ? rot(0.01, 0.82) : rot(0.02, 0.84),
        w = [0.075, 0.035, 0.022];
      const pts = [rot(0, 0), knee, hoof];
      poly(c, [
        ...pts.map(([qx, qy], k) => [qx - w[k]!, qy] as P),
        ...[...pts].reverse().map(([qx, qy], k) => [qx + w[2 - k]!, qy] as P),
      ]);
      c.closePath();
    });
    c.fill();
    // the tail: a small dark tuft, flagged up and pale when it bolts
    c.fillStyle = tailUp > 0.5 ? C.ink : (c.fillStyle as string);
    c.beginPath();
    poly(c, [
      [-0.5, -0.96],
      [-0.62 - 0.02 * tailUp, -0.9 - 0.24 * tailUp],
      [-0.56 + 0.08 * tailUp, -0.8 - 0.12 * tailUp],
    ]);
    c.closePath();
    c.fill();
    c.restore();
  };
  const deer = (c: Ctx, F: number) => {
    if (F < DEER.in || F > DEER.gone) return;
    const walk = F < DEER.stop ? 1 : 1 - prog(F, DEER.stop, DEER.stop + 6),
      enter = ease.outCubic(prog(F, DEER.in, DEER.stop)),
      head =
        F < DEER.alert
          ? ease.inOutCubic(prog(F, DEER.graze, DEER.graze + 12))
          : 1 - clamp(spring((F - DEER.alert) / FPS, { freq: 3.2, damp: 0.55 }), 0, 1.15),
      ph = (TAU * F) / 14;
    let x = deerX - (1 - enter) * 0.14 * W,
      y = deerY,
      dir = 1,
      legs = [0.32, -0.32, -0.32, 0.32].map((k, i) => k * Math.sin(ph + (i % 2) * Math.PI) * walk),
      tail = 0;
    if (F >= DEER.bolt) {
      // bolts: turns, and bounds away to the left in two leaps, the pale tail flagged
      const b = prog(F, DEER.bolt, DEER.gone);
      dir = -1;
      tail = 1;
      x = deerX - b * b * 0.5 * W - b * 0.05 * W;
      y = deerY - Math.abs(Math.sin(b * TAU)) * 46 * u;
      const tuck = Math.abs(Math.sin(b * TAU));
      legs = [-0.95 * tuck, -0.8 * tuck, 0.9 * tuck, 1.05 * tuck];
    }
    const col = c.fillStyle;
    c.fillStyle = rgba(C.deep!, 0.25);
    deerShape(c, x + 3 * u, y + 3 * u, dir, F >= DEER.bolt ? 0 : head, legs, 0);
    c.fillStyle = C.s4!;
    deerShape(c, x, y, dir, F >= DEER.bolt ? 0 : head, legs, tail);
    c.fillStyle = col;
  };
  // ---- the owl: one silhouette, wings spread (flying) or folded (perched); faces left (dir 1) or right (−1)
  const owlShape = (c: Ctx, x: number, y: number, size: number, flap: number, fold: number, eyes: number) => {
    c.save();
    c.translate(x, y);
    c.scale(size, size);
    c.beginPath();
    // body, head, ear tufts
    c.ellipse(0, 0, lerp(0.3, 0.2, fold), lerp(0.17, 0.28, fold), 0, 0, TAU);
    const hx = lerp(-0.26, 0, fold),
      hy = lerp(-0.06, -0.34, fold);
    c.moveTo(hx + 0.15, hy);
    c.ellipse(hx, hy, 0.15, 0.13, 0, 0, TAU);
    for (const e of [-1, 1]) {
      poly(c, [
        [hx + e * 0.05, hy - 0.1],
        [hx + e * 0.14, hy - 0.24],
        [hx + e * 0.13, hy - 0.06],
      ]);
      c.closePath();
    }
    // tail
    poly(c, [
      [lerp(0.24, -0.08, fold), lerp(-0.04, 0.22, fold)],
      [lerp(0.46, -0.1, fold), lerp(0.0, 0.36, fold)],
      [lerp(0.46, 0.1, fold), lerp(0.1, 0.36, fold)],
      [lerp(0.24, 0.08, fold), lerp(0.1, 0.22, fold)],
    ]);
    c.closePath();
    // wings, spread by (1 − fold), flapping on `flap` (−1 … 1)
    const sp = 1 - fold;
    if (sp > 0.02)
      for (const e of [-1, 1]) {
        const lift = flap * 0.55 * sp,
          pts: P[] = [
            [0.05 * e, -0.1],
            [0.5 * e * sp, -0.12 - lift * 0.5],
            [1.0 * e * sp, -0.05 - lift],
            [0.84 * e * sp, 0.06 - lift * 0.85],
            [0.72 * e * sp, 0.02 - lift * 0.72],
            [0.6 * e * sp, 0.12 - lift * 0.6],
            [0.46 * e * sp, 0.08 - lift * 0.45],
            [0.32 * e * sp, 0.16 - lift * 0.3],
            [0.05 * e, 0.12],
          ];
        poly(c, pts);
        c.closePath();
      }
    c.fill();
    if (eyes > 0) {
      c.fillStyle = rgba(C.accent, eyes);
      for (const e of [-1, 1]) {
        c.beginPath();
        c.arc(hx + e * 0.06, hy + 0.01, 0.032, 0, TAU);
        c.fill();
      }
    }
    c.restore();
  };
  // the owl's second flight: from the left, down onto the roof's peak, where it stays (its eyes catch the lamp)
  const OWL2 = { from: 450, land: 486 };
  const owlOnClearing = (c: Ctx, F: number) => {
    if (F < OWL2.from) return;
    const peak: P = [cab.x - 8 * u, cab.base - cab.wall - cab.roof + 2 * u],
      size = 62 * u,
      p = prog(F, OWL2.from, OWL2.land),
      e = ease.outCubic(p),
      x = lerp(cab.x - 0.5 * W, peak[0], e),
      y = lerp(peak[1] - 0.22 * H, peak[1] - 0.36 * size, e) - Math.sin(Math.PI * p) * 0.04 * H,
      fold = ease.inOutCubic(prog(F, OWL2.land - 8, OWL2.land + 2)),
      settle = F > OWL2.land ? Math.exp(-(F - OWL2.land) / 5) * Math.sin((F - OWL2.land) * 0.9) * 3 * u : 0;
    const flap = Math.sin((TAU * F) / 11);
    c.fillStyle = rgba(C.deep!, 0.25);
    owlShape(c, x + 3 * u, y + settle + 3 * u, size, flap, fold, 0);
    c.fillStyle = C.s4!;
    owlShape(c, x, y + settle, size, flap, fold, 0.9 * lampOn(F));
  };
  const clearingDetail = (c: Ctx, F: number) => {
    // the path: a second, paler piece of paper glued on the clearing, leading from the cabin to us
    const b = cab.base + 4 * u;
    c.fillStyle = C.line;
    c.beginPath();
    c.moveTo(cab.x + 4 * u, b);
    c.lineTo(cab.x + 34 * u, b);
    c.quadraticCurveTo(cab.x + 90 * u, G.ground + 0.14 * H, cab.x + 160 * u, 1.3 * H);
    c.lineTo(cab.x - 220 * u, 1.3 * H);
    c.quadraticCurveTo(cab.x - 40 * u, G.ground + 0.14 * H, cab.x + 4 * u, b);
    c.fill();
    // stepping stones up the path (they catch the lamp's light later)
    const stoneRow = tall ? [0.03, 0.065, 0.105, 0.15, 0.2, 0.26] : [0.03, 0.07, 0.115, 0.165];
    stoneRow.forEach((t, i) => {
      const [x, y] = pathMid(t),
        rx = (9 + i * (tall ? 4.2 : 3.4)) * u,
        ry = (3.2 + i * (tall ? 1.7 : 1.3)) * u;
      c.fillStyle = C.s2!;
      c.beginPath();
      c.ellipse(x + (i % 2 ? 6 : -6) * u, y, rx, ry, 0, 0, TAU);
      c.fill();
    });
    deer(c, F);
    fence(c);
    // the window: dark until the lamp; the door is a lighter board with a step, so it never reads as a second window
    c.fillStyle = C.deep!;
    c.fillRect(win.x - win.w / 2, win.y - win.h / 2, win.w, win.h);
    c.fillStyle = C.s2!;
    c.fillRect(cab.x + 16 * u, cab.base - 54 * u, 24 * u, 54 * u);
    c.fillStyle = C.line;
    c.fillRect(cab.x + 11 * u, cab.base - 1 * u, 34 * u, 6 * u);
    c.fillStyle = C.deep!;
    c.beginPath();
    c.arc(cab.x + 35 * u, cab.base - 27 * u, 2.2 * u, 0, TAU);
    c.fill();
    owlOnClearing(c, F);
  };
  const lampLight = (c: Ctx, F: number) => {
    const on = lampOn(F);
    if (on <= 0) return;
    const fl = flicker(F);
    // the window fills from the sill up
    const fh = win.h * ease.outCubic(on);
    c.fillStyle = C.accent;
    c.fillRect(win.x - win.w / 2, win.y + win.h / 2 - fh, win.w, fh);
    c.fillStyle = C.s3!;
    c.fillRect(win.x - 1.5 * u, win.y - win.h / 2, 3 * u, win.h);
    c.fillRect(win.x - win.w / 2, win.y - 1.5 * u, win.w, 3 * u);
    // three glow rings bloom, each a beat-fraction behind the last; flat rings of falling alpha, no blur
    [0.2, 0.11, 0.055].forEach((a, k) => {
      const g = spring((F - T.lamp - 2 - k * 4) / FPS, { freq: 1.4, damp: 0.6 });
      if (g <= 0) return;
      const rr = (18 + 20 * k) * u * g * (1 + 0.04 * (fl - 1) * (k + 1) + 0.025 * Math.sin(F * 0.13 + k));
      c.fillStyle = rgba(C.accent, a * fl);
      c.beginPath();
      c.arc(win.x, win.y, rr + win.w * 0.5, 0, TAU);
      c.fill();
    });
    // a warm trapezoid of light falls from the window across the path
    const t = ease.outCubic(prog(F, T.lamp + 4, T.lamp + 26));
    if (t > 0) {
      c.fillStyle = rgba(C.accent, 0.18 * t * fl);
      const b = cab.base + 6 * u,
        reach = lerp(20, tall ? 150 : 250, t) * u;
      c.beginPath();
      c.moveTo(win.x - win.w / 2, b);
      c.lineTo(win.x + win.w / 2 + 6 * u, b);
      c.lineTo(win.x + win.w / 2 + 6 * u + reach * 0.75, b + reach);
      c.lineTo(win.x - win.w / 2 - reach * 0.5, b + reach);
      c.closePath();
      c.fill();
    }
  };
  const smoke = (c: Ctx, F: number) => {
    for (let j = 0; j < 3; j++) {
      const t0 = T.lamp + 12 + j * 7,
        grow = ease.outCubic(prog(F, t0, t0 + 70));
      if (grow <= 0) continue;
      const len = (34 + j * 8) * u * grow,
        M = 18,
        Lp: P[] = [],
        Rp: P[] = [];
      for (let i = 0; i <= M; i++) {
        const t = i / M,
          y = chim.top - 2 * u - t * len,
          x =
            chim.x + (j - 1) * 6 * u * (1 + 2 * t) + t * t * 16 * u + Math.sin(t * 5 - F * 0.09 + j * 2.1) * 7 * u * t,
          w = 3.6 * u * (1 - 0.6 * t);
        Lp.push([x - w, y]);
        Rp.push([x + w, y]);
      }
      c.fillStyle = rgba(C.s1!, 0.92 - j * 0.12);
      c.beginPath();
      [...Lp, ...Rp.reverse()].forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
      c.closePath();
      c.fill();
    }
  };

  // ---- the gust: a damped sway that peaks on its whoosh (frame 270); each standing flat shears about its base
  const GUST = 262;
  const gust = (F: number) => {
    const t = (F - GUST) / FPS;
    return t <= 0 ? 0 : Math.sin(TAU * 0.9 * t) * Math.exp(-1.7 * t);
  };
  const SWAY: Partial<Record<Flat["id"], [number, number]>> = {
    farPines: [0.035, G.farBase],
    midPines: [0.11, G.midBase],
    trunks: [0.05, H],
    ferns: [0.09, H],
  };
  // ---- one flat, in its own space: its shadow, or its paper (colour, extras, fibre, light)
  const shadowOff = (f: Flat) => (2.5 + 1.6 * Math.sqrt(Math.min(f.behind, 16))) * u;
  const drawFlat = (c: Ctx, env: Env, f: Flat, v: View, F: number, shadow: boolean) => {
    const path = getPaths().get(f.id)!;
    c.save();
    apply(c, v);
    const sw = SWAY[f.id],
      g = gust(F);
    if (sw && g !== 0) {
      c.translate(0, sw[1]);
      c.transform(1, 0, -sw[0] * g, 1, 0, 0);
      c.translate(0, -sw[1]);
    }
    if (shadow) {
      c.translate(shadowOff(f), shadowOff(f) * 1.2);
      c.fillStyle = rgba(C.deep!, 0.25);
      c.fill(path);
      c.restore();
      return;
    }
    c.fillStyle = f.color;
    c.fill(path);
    if (f.id === "clearing") clearingDetail(c, F);
    texture(c, env, path, -0.9 * W, -0.5 * H, 1.9 * W, 1.4 * H);
    if (f.id === "clearing") {
      lampLight(c, F);
      smoke(c, F);
    }
    c.restore();
  };
  const drawSky = (c: Ctx, env: Env, F: number) => {
    const ps = getPaths(),
      ty = tilt(F);
    c.save();
    c.translate(0, ty);
    c.fillStyle = C.sky!;
    c.fillRect(-0.2 * W, -0.4 * H, 1.4 * W, 1.9 * H);
    bandPolys.forEach(([col], i) => {
      c.fillStyle = col;
      c.fill(ps.get(`band${i}`)!);
    });
    c.fillStyle = mix(C.s3!, C.s4!, 0.5);
    c.fill(ps.get("floor")!);
    // the paper moon: an ink disc with two faint craters and its own small shadow on the sky
    const moon = ps.get("moon")!,
      [mx, my] = G.moon;
    c.save();
    c.translate(4 * u, 5 * u);
    c.fillStyle = rgba(C.deep!, 0.25);
    c.fill(moon);
    c.restore();
    c.fillStyle = C.ink;
    c.fill(moon);
    c.fillStyle = rgba(C.muted, 0.22);
    c.beginPath();
    c.arc(mx - 16 * u, my - 10 * u, 13 * u, 0, TAU);
    c.fill();
    c.beginPath();
    c.arc(mx + 18 * u, my + 16 * u, 8 * u, 0, TAU);
    c.fill();
    texture(c, env, moon, mx - MOON_R * 2, my - MOON_R * 2, mx + MOON_R * 2, my + MOON_R * 2);
    c.restore();
  };
  const moonScreen = (F: number): P => [G.moon[0], G.moon[1] + tilt(F)];

  // ---- moon shafts: long pale wedges from the moon, screened through the gaps in the pines
  const SHAFTS = tall ? [0.95, 1.12, 1.3, 1.46] : [0.36, 0.5, 0.66, 0.84];
  const shafts = (ctx: Ctx, F: number) => {
    const a = 0.08 * ease.inOutCubic(prog(F, T.trees, T.trees + 40)) * (1 - 0.55 * prog(F, T.lamp, T.lamp + 60));
    if (a <= 0) return;
    const [mx, my] = moonScreen(F),
      len = 2.4 * Math.max(W, H);
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = rgba(C.sky!, a);
    SHAFTS.forEach((ang, i) => {
      const th = ang + 0.03 * Math.sin(F * 0.012 + i * 1.7),
        hw = 0.018 + 0.01 * (i % 2);
      ctx.beginPath();
      ctx.moveTo(mx + Math.cos(th) * MOON_R * 0.6, my + Math.sin(th) * MOON_R * 0.6);
      ctx.lineTo(mx + Math.cos(th - hw) * len, my + Math.sin(th - hw) * len);
      ctx.lineTo(mx + Math.cos(th + hw) * len, my + Math.sin(th + hw) * len);
      ctx.closePath();
      ctx.fill();
    });
    ctx.restore();
  };

  // ---- fireflies: ~30, each at its own depth, on a closed-form Lissajous path, blinking on its own sine
  const clearFlat = flats.find((f) => f.id === "clearing")!;
  const windowAt = (F: number): { x: number; y: number; s: number } => {
    const v = view(clearFlat.z, F, clearFlat.land, clearFlat.drop) ?? { s: 1, ox: 0, oy: 0, alpha: 1, gap: 12 };
    const [x, y] = toScreen(v, win.x, win.y);
    return { x, y, s: v.s };
  };
  const FLIES = (() => {
    const r = rng(4444),
      bins: [number, number, number][] = [
        [3.6, 4.6, 4],
        [5.6, 8.6, 9],
        [9.4, 11.6, 8],
        [12.6, 18, 9],
      ],
      out: {
        z0: number;
        x0: number;
        y0: number;
        born: number;
        per: number;
        ph: number;
        ax: number;
        ay: number;
        wx: number;
        wy: number;
        px: number;
        py: number;
        zT: number;
        ra: number;
        rb: number;
        oa: number;
        os: number;
      }[] = [];
    for (const [z0, z1, n] of bins)
      for (let i = 0; i < n; i++)
        out.push({
          z0: lerp(z0, z1, r()),
          x0: lerp(0.06, 0.94, r()) * W,
          y0: lerp(tall ? 0.36 : 0.34, tall ? 0.84 : 0.86, r()) * H,
          born: 0,
          per: 40 + r() * 56,
          ph: r() * TAU,
          ax: (20 + r() * 34) * u,
          ay: (12 + r() * 22) * u,
          wx: TAU / (90 + r() * 90),
          wy: TAU / (70 + r() * 70),
          px: r() * TAU,
          py: r() * TAU,
          zT: 10.5 + r() * 1.2,
          ra: (60 + r() * 170) * u * (tall ? 0.8 : 1),
          rb: (34 + r() * 90) * u,
          oa: r() * TAU,
          os: (r() < 0.5 ? -1 : 1) * (TAU / (150 + r() * 120)),
        });
    // they rise in over the walk's first eight beats, in a shuffled order
    const order = out.map((_, i) => i).sort((a, b) => ((a * 7919) % 31) - ((b * 7919) % 31));
    order.forEach((k, i) => (out[k]!.born = T.walk + 6 + i * 4));
    return out;
  })();
  type Fly = (typeof FLIES)[number];
  // as the pines part (and the deer bolts) every firefly flashes at once, then falls back to its own rhythm
  const burst = (F: number) => (F < T.clearing ? 0 : Math.exp(-(F - T.clearing) / 10));
  const blinkOf = (f: Fly, F: number) => Math.max(0, Math.sin((TAU * F) / f.per + f.ph)) ** 3;
  const flyAt = (f: Fly, F: number) => {
    if (F < f.born) return null;
    const rise = ease.outCubic(prog(F, f.born, f.born + 70)),
      appear = prog(F, f.born, f.born + 24),
      zc = zcAt(F),
      g = ease.inOutCubic(prog(F, 380, 560)),
      z = lerp(Math.max(f.z0, zc + 1.1), f.zT, g),
      gap = z - zc,
      vis = clamp((gap - 0.4) / 0.6);
    if (vis <= 0) return null;
    const s = z / gap,
      ax = f.x0 + f.ax * Math.sin(f.wx * F + f.px),
      ay = f.y0 + f.ay * Math.sin(f.wy * F + f.py) + (1 - rise) * 280 * u;
    let x = vx + (ax - vx) * s - pan(F) / gap + 40 * u * gust(F) * s,
      y = vy + (ay - vy) * s + tilt(F) + bob(F);
    // they drift toward the cabin through the clearing, then gather round its window
    const k = 0.35 * ease.inOutCubic(prog(F, 400, 540)) + 0.57 * ease.inOutCubic(prog(F, T.arrival - 12, 700));
    if (k > 0) {
      const w = windowAt(F),
        tx = w.x + f.ra * Math.cos(f.oa + f.os * F),
        ty = w.y - 10 * u + f.rb * Math.sin(f.oa + f.os * F);
      x = lerp(x, tx, k);
      y = lerp(y, ty, k);
    }
    return { x, y, z, s, a: appear * vis, b: Math.max(blinkOf(f, F), burst(F)) };
  };
  const drawFly = (ctx: Ctx, fl: NonNullable<ReturnType<typeof flyAt>>) => {
    const r = 2.8 * u * clamp(Math.sqrt(fl.s), 0.8, 2.6) * (1 + 0.5 * fl.b * fl.b),
      br = 0.25 + 0.75 * fl.b;
    ctx.fillStyle = C.accent;
    [
      [5.4, 0.06],
      [3.6, 0.13],
      [2.2, 0.28],
    ].forEach(([k, a]) => {
      ctx.globalAlpha = fl.a * br * a!;
      ctx.beginPath();
      ctx.arc(fl.x, fl.y, r * k!, 0, TAU);
      ctx.fill();
    });
    ctx.globalAlpha = fl.a * (0.45 + 0.55 * fl.b);
    ctx.beginPath();
    ctx.arc(fl.x, fl.y, r, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
  };
  // the blink ticks come from the same sine the flies are drawn with: a visible fly's peak, at most one per
  // two beats, kept clear of the other cues
  const FLY_TICKS = (() => {
    const peaks: number[] = [],
      cues = [T.walk, OWL_CUE, GUST_CUE, T.clearing, DEER.alert, OWL2.land, T.lamp, T.sign];
    for (const f of FLIES)
      for (let k = -2; k < 30; k++) {
        const F = Math.round(f.per * (k + 0.25 - f.ph / TAU));
        if (F < 150 || F > 700) continue;
        const fl = flyAt(f, F);
        if (fl && fl.a > 0.6 && fl.x > 0.05 * W && fl.x < 0.95 * W && fl.y > 0.1 * H && fl.y < 0.9 * H) peaks.push(F);
      }
    const used = new Set<number>(),
      out: number[] = [];
    for (const F of peaks.sort((a, b) => a - b)) {
      const b = Math.floor(F / BEAT);
      if (b % 2 || used.has(b) || cues.some((c) => Math.abs(c - F) < 8)) continue;
      used.add(b);
      out.push(F);
    }
    return out;
  })();

  // ---- the owl's first flight: a close pass right to left, just behind the ferns and in front of the near trunks,
  // big and dark across the frame, centred on its whoosh at 180
  const OWL1 = { from: 153, to: 207, z: 3.9 };
  const owlPass = (ctx: Ctx, env: Env, F: number, lv: number) => {
    if (F < OWL1.from || F > OWL1.to) return;
    const v = view(OWL1.z, F);
    if (!v) return;
    const p = prog(F, OWL1.from, OWL1.to),
      ax = lerp(1.3 * W, -0.3 * W, p),
      ay = (tall ? 0.4 : 0.36) * H + Math.sin(Math.PI * p) * 0.08 * H - p * 0.06 * H,
      [x, y] = toScreen(v, ax, ay),
      size = (tall ? 240 : 270) * u * v.s,
      flap = Math.sin((TAU * (F - OWL1.from)) / 10);
    soft(ctx, env, lv, 1, (c) => {
      c.fillStyle = rgba(C.deep!, 0.25);
      owlShape(c, x + 6 * u, y + 7 * u, size, flap, 0, 0);
      c.fillStyle = mix(C.s4!, C.deep!, 0.4);
      owlShape(c, x, y, size, flap, 0, 0);
    });
  };

  // ---- the gust's needles: paper flecks torn off the pines, blown across between the mid pines and the trunks
  const NEEDLES = (() => {
    const r = rng(4460);
    return Array.from({ length: 34 }, () => ({
      z: lerp(5.6, 8.6, r()),
      x0: lerp(-0.45, 0.85, r()) * W,
      y0: lerp(0.12, 0.8, r()) * H,
      len: lerp(10, 22, r()) * u,
      spin: lerp(-0.5, 0.5, r()),
      ph: r() * TAU,
      late: r() * 10,
    }));
  })();
  const needles = (ctx: Ctx, env: Env, F: number, lv: number) => {
    if (F < GUST || F > GUST + 72) return;
    soft(ctx, env, lv, 1, (c) => {
      c.fillStyle = C.s1!;
      for (const n of NEEDLES) {
        const t = prog(F, GUST + n.late, GUST + n.late + 56);
        if (t <= 0 || t >= 1) continue;
        const v = view(n.z, F);
        if (!v) continue;
        const ax = n.x0 + ease.outCubic(t) * 0.75 * W + Math.sin(t * 9 + n.ph) * 14 * u,
          ay = n.y0 + t * 0.12 * H + Math.sin(t * 7 + n.ph) * 22 * u,
          [x, y] = toScreen(v, ax, ay),
          a = n.ph + F * n.spin,
          l = n.len * v.s,
          w = 2.4 * u * v.s;
        c.globalAlpha = Math.min(1, t * 8, (1 - t) * 5);
        c.beginPath();
        c.moveTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
        c.lineTo(x - Math.sin(a) * w, y + Math.cos(a) * w);
        c.lineTo(x - Math.cos(a) * l, y - Math.sin(a) * l);
        c.lineTo(x + Math.sin(a) * w, y - Math.cos(a) * w);
        c.closePath();
        c.fill();
      }
      c.globalAlpha = 1;
    });
  };

  // ---- type: the title at the start, one italic line at the end, ink, centred, no plates
  const titleLines = tall ? ["The Lamp at", "Hollow End"] : ["The Lamp at Hollow End"];
  const lastLines = tall ? ["home before", "dark."] : ["home before dark."];
  const typeSize = tall ? 112 * u : 100 * u,
    lead = typeSize * 1.08,
    typeTop = tall ? L.safe.top + typeSize * 0.95 : 0.25 * H;
  const lines = (ctx: Ctx, ls: string[], family: string, a: number, dy: number) => {
    if (a <= 0) return;
    ls.forEach((s, i) =>
      text(ctx, s, cx, typeTop + i * lead + dy, {
        size: typeSize,
        family,
        color: C.ink,
        align: "center",
        alpha: a,
        track: -0.01,
      }),
    );
  };

  const paint = (ctx: Ctx, env: Env, F: number) => {
    F = clamp(F, 0, N - 1);
    ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
    ctx.fillStyle = C.ground;
    ctx.fillRect(0, 0, W, H);
    const zc = zcAt(F),
      inv = focusInv(F, zc),
      dOf = (z: number) => K_BLUR * Math.abs((Number.isFinite(z) ? 1 / (z - zc) : 0) - inv),
      blurOf = (z: number) => level(dOf(z));
    // the sky and moon: infinite depth, never scaled
    softMix(ctx, env, levelMix(dOf(Infinity)), 1, (c) => drawSky(c, env, F));
    const flies = FLIES.map((f) => flyAt(f, F)).filter((f): f is NonNullable<typeof f> => !!f),
      done = new Set<number>();
    const fliesBehind = (z: number) => {
      ctx.save();
      ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
      flies.forEach((fl, i) => {
        if (!done.has(i) && fl.z > z) {
          done.add(i);
          drawFly(ctx, fl);
        }
      });
      ctx.restore();
    };
    for (const f of flats) {
      fliesBehind(f.z);
      if (f.id === "trunks") needles(ctx, env, F, Math.min(2, blurOf(6.5)));
      if (f.id === "ferns") owlPass(ctx, env, F, Math.min(2, blurOf(OWL1.z)));
      if (f.id === "midPines") {
        ctx.save();
        ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
        shafts(ctx, F);
        ctx.restore();
      }
      const v = view(f.z, F, f.land, f.drop);
      if (!v) continue;
      const lv = blurOf(f.z);
      soft(ctx, env, Math.min(8, Math.max(4, lv * 2)), v.alpha, (c) => drawFlat(c, env, f, v, F, true));
      softMix(ctx, env, levelMix(dOf(f.z)), v.alpha, (c) => drawFlat(c, env, f, v, F, false));
    }
    fliesBehind(-Infinity);
    ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
    // the lamp's flare: one warm screen wash on the hit, gone in a third of a second
    if (F >= T.lamp && F < T.lamp + 12) {
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.fillStyle = rgba(C.accent, 0.24 * Math.exp(-(F - T.lamp) / 3.5));
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    // the title fades up during the drop, then lifts away as the walk begins
    const lift = ease.inCubic(prog(F, T.walk, T.walk + 36));
    lines(
      ctx,
      titleLines,
      F_.serif,
      prog(F, 0, 24) * (1 - lift),
      (1 - ease.outCubic(prog(F, 0, 40))) * 18 * u - lift * 70 * u,
    );
    lines(
      ctx,
      lastLines,
      F_.italic,
      prog(F, T.sign, T.sign + 28),
      (1 - ease.outCubic(prog(F, T.sign, T.sign + 40))) * 20 * u,
    );
  };

  const cuts = [0, T.walk, T.trees, T.clearing, T.lamp, T.arrival, N],
    names = ["drop", "walk", "trees", "clearing", "lamp", "arrival"];
  const shots: Shot[] = names.map((sid, i) => ({
    id: sid,
    start: cuts[i]!,
    end: cuts[i + 1]!,
    draw: (ctx, local, env) => paint(ctx, env, cuts[i]! + local),
  }));
  return {
    meta: { title: id, W, H, fps: FPS, bpm: BPM, durationFrames: N, raster: "cpu" },
    assets: { images: {}, fonts: P_.assets },
    shots,
    audio: beatScore({
      frames: N,
      fps: FPS,
      bpm: BPM,
      mood: "soft",
      gain: 0.64,
      hits: [T.lamp],
      whooshes: [T.walk, OWL_CUE, GUST_CUE, T.clearing],
      ticks: [
        LAND.ridge,
        LAND.farPines,
        LAND.clearing,
        LAND.midPines,
        LAND.trunks,
        LAND.ferns,
        DEER.alert,
        OWL2.land,
        ...FLY_TICKS,
      ],
      sign: T.sign,
    }),
  };
}

export const multiplane = make("landscape", "multiplane");
export const multiplaneVertical = make("vertical", "multiplaneVertical");
