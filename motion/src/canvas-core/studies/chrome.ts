// STUDY 56 · CHROME (4 s, 60 fps, a seamless loop). A SECONDS piece: no words, the style is the whole piece. One
// fat ribbon of polished chrome, a (2,3) torus knot, turns in space above a glossy black floor. On the downbeat of
// bar 2 (frame 120) it slams into a squash, its three waists pinch while the lobes swell, a white glint sweeps the
// crests and a star flares; then it springs back, settles and turns on into the loop.
// One source, designed for square (the hero) and vertical (a taller knot set high, more floor and reflection below).
// Brief: series/studies/briefs/chrome.json · prompt: series/studies/prompts/chrome.prompt.md
// Learns from Y2K liquid-chrome object design (https://en.wikipedia.org/wiki/Y2K_aesthetic) and reflection
// (environment) mapping (https://en.wikipedia.org/wiki/Reflection_mapping). No artwork, logo or type from either.
//
// Chrome has no colour of its own: it is the world reflected. The ribbon is a tube swept along a closed 3D curve
// (cross-sections along the knot, each a ring of surface points). Every frame the mesh is posed, projected and
// rasterised in this module with a depth buffer (the per-pixel form of depth-sorting the cross-sections), keeping
// each pixel's surface normal. Each normal reflects the camera ray, and the reflected direction picks a colour from
// a fixed environment strip: a dark floor, a hot white horizon line, a warm sunset band (accent2), a sky band
// (accent) darkening to the zenith, and two softbox windows. As the knot turns the world stays put, so the
// reflections slide across the metal. A sharp specular (s1) rides the crests, a thin rim light catches the edges,
// and the glossy floor shows the knot mirrored, fading with its height above the floor.
// Anti-aliasing and motion blur are one thing here: the frame is drawn SAMPLES times at sub-pixel offsets AND at
// instants spread through a half-frame shutter, and averaged (the principle of kit/blur.ts, folded into the
// rasteriser so it costs no more than plain supersampling). The sparkle stars are fine strokes, so they are drawn
// once, unblurred. Everything is a closed-form function of the frame: the turn is one eased full rotation about the
// vertical plus a counter-spin of a third of a turn (the knot is three-fold symmetric), so frame 240 is frame 0.
import PACK from "../../../brand/packs/studio/pack.json";
import { rng, type Ctx, type Env, type Layer } from "../core";
import type { Film, Shot } from "../film";
import { clamp, ease, lerp, prog, window01 } from "../kit/motion";
import { usePack } from "../kit/pack";
import { beatScore } from "../kit/score";
import { layout, type Size } from "../kit/sizes";

const P = usePack(PACK),
  C = P.palette("chrome");
const FPS = 60,
  BPM = 120,
  N = 240, // two bars: a beat is 30 frames, bar 2's downbeat is frame 120
  TAU = Math.PI * 2;
// the story, in frames (each on the beat grid)
const T = { turn: 0, hit: 120, settle: 150 };

// ---- colour: the palette as linear-ish 0..1 triples, mixed in the module
const rgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};
const K = {
  ground: rgb(C.ground),
  surface: rgb(C.surface),
  ink: rgb(C.ink),
  muted: rgb(C.muted),
  line: rgb(C.line),
  accent: rgb(C.accent),
  accent2: rgb(C.accent2),
  deep: rgb(C.deep!),
  s1: rgb(C.s1!),
  s2: rgb(C.s2!),
};
type V3 = [number, number, number];
const mix3 = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

// ---- the environment strip, in world directions (y up, the camera looks along +z). Built once: E bins of
// elevation (sin of the angle above the horizon, -1..1) by A bins of azimuth.
const E = 1024,
  A = 256,
  SUN = Math.PI - 0.95, // the warm side of the sunset, toward camera-left
  BOX1 = Math.PI + 0.62, // two softbox windows in the sky, either side of the camera
  BOX2 = Math.PI - 1.55;
// the angle between two azimuths, 0..pi
const adiff = (a: number, b: number) => Math.abs(((((a - b + Math.PI) % TAU) + TAU) % TAU) - Math.PI);
// (boxes scales the two softboxes: the glint dims them while it runs, so it is the only moving vertical light)
const envStrip = (boxes: number) => {
  const out = new Float32Array(E * A * 3);
  for (let ei = 0; ei < E; ei++) {
    const e = (ei / (E - 1)) * 2 - 1;
    for (let ai = 0; ai < A; ai++) {
      const az = ((ai + 0.5) / A) * TAU - Math.PI;
      let c: V3;
      if (e < 0) {
        // the floor: deep black straight down, a slate sheen across the middle distance, then a dark band just
        // under the horizon, so the hot line above it meets black (the hard edge that makes metal read as chrome)
        const sheen = smooth(-0.66, -0.3, e) * (1 - smooth(-0.11, -0.035, e));
        c = mix3(K.deep, mix3(K.s2, K.muted, 0.35), sheen * 0.6);
        // a thin bright stripe across the floor, so even the lower halves carry one line of light
        c = mix3(c, K.ink, 0.45 * Math.exp(-(((e + 0.4) / 0.012) ** 2)));
        c = mix3(c, K.muted, 0.3 * Math.exp(-(((e + 0.24) / 0.025) ** 2)));
      } else {
        // the sky: sunset warm at the horizon (stronger on the sun side), blue above, falling dark to the zenith
        const sunSide = 0.5 + 0.5 * Math.cos(adiff(az, SUN));
        const warm = mix3(K.accent2, mix3(K.accent2, K.ink, 0.25), 0.4 * (1 - sunSide));
        c = mix3(warm, K.accent, smooth(0.1, 0.3, e));
        c = mix3(c, mix3(K.s2, K.ground, 0.55), smooth(0.3, 0.7, e) * 0.92);
        // dim the sunset on its far side so the warm band has a direction
        c = mix3(c, K.s2, (1 - sunSide) * 0.15 * (1 - smooth(0.05, 0.3, e)));
        // two tall softbox windows: crisp white panels that become the studio highlights
        for (const [b, wA] of [
          [BOX1, 0.2],
          [BOX2, 0.13],
        ] as const) {
          const inA = 1 - smooth(wA * 0.72, wA, adiff(az, b)),
            inE = smooth(0.14, 0.2, e) * (1 - smooth(0.62, 0.7, e));
          c = mix3(c, K.s1, inA * inE * 0.92 * boxes);
        }
      }
      // the hot white horizon line with a soft halo
      const core = Math.exp(-((e / 0.035) ** 2)),
        halo = Math.exp(-((e / 0.06) ** 2)) * 0.45;
      c = mix3(c, K.s1, Math.min(1, core + halo * 0.7));
      const o = (ei * A + ai) * 3;
      out[o] = c[0];
      out[o + 1] = c[1];
      out[o + 2] = c[2];
    }
  }
  return out;
};
const ENV = envStrip(1),
  ENV_DIM = envStrip(0.3);

// ---- the knot: a (2,3) torus knot, three-fold symmetric about its axis (z in model space)
const NS = 432, // cross-sections along the knot (a multiple of 3, so a third of a turn maps the mesh onto itself)
  NV = 40, // points round each cross-section
  KR = 2,
  KA = 1,
  KZ = 1.4;
const knot = (s: number): V3 => {
  const r = KR + KA * Math.cos(3 * s);
  return [r * Math.cos(2 * s), r * Math.sin(2 * s), KZ * KA * Math.sin(3 * s)];
};
// the centreline and a Frenet frame per cross-section (closed curve, so the frame closes too)
const CL = (() => {
  const c = new Float32Array(NS * 9);
  const h = 1e-3;
  for (let i = 0; i < NS; i++) {
    const s = (i / NS) * TAU,
      p = knot(s),
      a = knot(s - h),
      b = knot(s + h);
    const t: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]],
      acc: V3 = [b[0] - 2 * p[0] + a[0], b[1] - 2 * p[1] + a[1], b[2] - 2 * p[2] + a[2]];
    const tl = Math.hypot(...t);
    t[0] /= tl;
    t[1] /= tl;
    t[2] /= tl;
    const d = acc[0] * t[0] + acc[1] * t[1] + acc[2] * t[2];
    const n: V3 = [acc[0] - d * t[0], acc[1] - d * t[1], acc[2] - d * t[2]],
      nl = Math.hypot(...n);
    n[0] /= nl;
    n[1] /= nl;
    n[2] /= nl;
    const bb: V3 = [t[1] * n[2] - t[2] * n[1], t[2] * n[0] - t[0] * n[2], t[0] * n[1] - t[1] * n[0]];
    c.set([p[0], p[1], p[2], n[0], n[1], n[2], bb[0], bb[1], bb[2]], i * 9);
  }
  return c;
})();
const RING_C = Float32Array.from({ length: NV }, (_, j) => Math.cos((j / NV) * TAU)),
  RING_S = Float32Array.from({ length: NV }, (_, j) => Math.sin((j / NV) * TAU));
// where the three waists sit along the knot (w = 1 at a waist, 0 on a lobe)
const WAIST = Float32Array.from({ length: NS }, (_, i) => ((1 + Math.cos(3 * (i / NS) * TAU + 0.9)) / 2) ** 3);

// ---- time: the turn, the squash, the flash
// one full turn about the vertical, eased: slowest on the downbeat (the slam lands on a form you can read), then a
// whip out of the squash (an extra WHIP radians spent over 120..176, taken back evenly from the rest of the turn)
const WHIP = 0.7;
const turn = (F: number) => {
  const t = F / N,
    w = F <= T.hit ? 0 : F >= 176 ? 1 : 1 - (1 - prog(F, T.hit, 176)) ** 3;
  return -((TAU - WHIP) * t + 0.24 * Math.sin(TAU * t) + WHIP * w);
};
// a counter-spin about the knot's own axis: a third of a turn per loop (the knot maps onto itself)
const spin = (F: number) => (TAU / 3) * (F / N);
// the squash: a small stretch (anticipation), a slam into full squash ON frame 120, a damped spring back,
// windowed to exactly 0 long before the loop wraps
const hitSquash = (F: number) => {
  if (F < 100 || F > 216) return 0;
  if (F < 116) return -0.22 * ease.inOutCubic(prog(F, 100, 116));
  if (F < T.hit) return lerp(-0.22, 1, ease.inCubic(prog(F, 116, T.hit)));
  const d = (F - T.hit) / FPS;
  return Math.exp(-d * 4) * Math.cos(TAU * 1.8 * d) * (1 - ease.inOutCubic(prog(F, 172, 216)));
};
// the impact flash: a near-instant rise and a soft decay from the downbeat, exactly 0 by frame 200
const punch = (F: number) => {
  const d = (F - T.hit + 1) / FPS;
  return d > 0 ? (1 - Math.exp(-d * 60)) * Math.exp(-d * 5) * (1 - ease.inOutCubic(prog(F, 160, 200))) : 0;
};
// the distance in frames from F to frame f, round the loop
const wrapDist = (F: number, f: number) => {
  const d = (((F - f) % N) + N) % N;
  return Math.min(d, N - d);
};
// the frame-0 glint: a short pulse exactly on the loop point (it rises before the wrap and falls after it)
const glint0 = (F: number) => Math.exp(-((wrapDist(F, 0) / 9) ** 2));
// beat 3's pre-pulse: a small bounce of the metal and a flick of light that sets up the hit (0 outside 56..100)
const pre = (F: number) => {
  if (F < 56 || F > 100) return 0;
  if (F < 60) return 0.42 * ease.inCubic(prog(F, 56, 60));
  const d = (F - 60) / FPS;
  return 0.42 * Math.exp(-d * 7) * Math.cos(TAU * 2.2 * d) * (1 - ease.inOutCubic(prog(F, 84, 100)));
};
const prePunch = (F: number) => (F >= 60 && F < 100 ? Math.exp(-(F - 60) / 6) * (1 - prog(F, 84, 100)) : 0);
const squash = (F: number) => hitSquash(F) + pre(F);

// ---- per-size design
type Design = {
  ox: number; // screen centre of the knot (logical px)
  oy: number;
  ppu: number; // px per world unit at the knot's depth
  pitch: number; // the camera looks down by this much
  tilt: number; // the knot's axis leans back from the camera by this much
  stretch: number; // the knot's model scaled along its own y (tall frame: a taller knot)
  r0: number; // tube radius
  bob: number; // hover amplitude, world units
  floorGap: number;
};
const DESIGN: Record<"square" | "tall", Design> = {
  square: { ox: 540, oy: 478, ppu: 92, pitch: 0.1, tilt: 0.98, stretch: 1, r0: 0.66, bob: 0.1, floorGap: 0.16 },
  tall: { ox: 540, oy: 800, ppu: 110, pitch: 0.17, tilt: 0.62, stretch: 1.32, r0: 0.64, bob: 0.12, floorGap: 0.24 },
};
const SAMPLES = 6, // sub-pixel x shutter samples per frame (the anti-aliasing and the motion blur)
  SHUTTER = 0.5, // frames: a 180 degree shutter
  RSAMPLES = 4; // the floor reflection is soft: fewer samples at half resolution
// sub-pixel offsets: a rotated grid, one per sample (paired with an instant in the shutter)
const JIT: [number, number][] = Array.from({ length: SAMPLES }, (_, i) => {
  const a = i * 2.39996 + 0.4,
    r = Math.sqrt((i + 0.5) / SAMPLES) * 0.5;
  return [0.5 + r * Math.cos(a), 0.5 + r * Math.sin(a)];
});
// the slam itself (about 116..122) moves faster than six samples in a half-frame shutter can cover: those frames
// take more samples in a shorter shutter, so the hit frame stays one clean form
const FAST_SAMPLES = 10,
  FAST_SHUTTER = 0.2;
const JIT_FAST: [number, number][] = Array.from({ length: FAST_SAMPLES }, (_, i) => {
  const a = i * 2.39996 + 0.4,
    r = Math.sqrt((i + 0.5) / FAST_SAMPLES) * 0.5;
  return [0.5 + r * Math.cos(a), 0.5 + r * Math.sin(a)];
});
const RJIT: [number, number][] = [
  [0.375, 0.125],
  [0.875, 0.375],
  [0.125, 0.625],
  [0.625, 0.875],
];

type Pass = {
  w: number;
  h: number;
  z: Float32Array;
  nx: Float32Array;
  ny: Float32Array;
  nz: Float32Array;
  hh: Float32Array;
  acc: Float32Array;
};
const FAR = 1e30;

export function make(size: Size, id: string): Film {
  const L = layout(size),
    { W, H, u } = L,
    D = DESIGN[L.tall ? "tall" : "square"];
  const OX = D.ox * u,
    OY = D.oy * u,
    DIST = 15, // camera distance to the knot's centre, world units (a mild perspective: depth from scale)
    FOC = D.ppu * u * DIST,
    cp = Math.cos(D.pitch),
    sp = Math.sin(D.pitch),
    HORIZON = OY - FOC * Math.tan(D.pitch); // where the world's horizon line falls on screen
  const ct = Math.cos(D.tilt),
    st = Math.sin(D.tilt);

  // ---- posing the mesh: model -> world -> camera, with the squash, then normals from the posed surface
  const NVT = NS * NV;
  const PX = new Float32Array(NVT),
    PY = new Float32Array(NVT),
    PZ = new Float32Array(NVT),
    QX = new Float32Array(NVT), // normals (camera space)
    QY = new Float32Array(NVT),
    QZ = new Float32Array(NVT),
    HW = new Float32Array(NVT), // world height above the floor (for the reflection's fade)
    FR = new Uint8Array(NVT), // front-facing
    CX = new Float32Array(NS),
    CY = new Float32Array(NS),
    CZ = new Float32Array(NS);
  // the world transform of a model point; mirror reflects it in the floor plane
  let FLOOR = -4;
  const toWorld = (x: number, y: number, z: number, F: number, mirror: boolean, out: number[]) => {
    const sq = squash(F),
      sa = spin(F),
      cs = Math.cos(sa),
      ss = Math.sin(sa),
      th = turn(F),
      cth = Math.cos(th),
      sth = Math.sin(th);
    // the knot's own spin about its axis, its stretch for the tall frame
    let mx = x * cs - y * ss,
      my = (x * ss + y * cs) * D.stretch,
      mz = z;
    // stand it up: model z (the knot's axis) toward the camera (-z), leaning back by tilt about x
    let wx = mx,
      wy = my * ct + mz * st,
      wz = my * st - mz * ct;
    // the turn about the vertical
    mx = wx * cth + wz * sth;
    mz = -wx * sth + wz * cth;
    wx = mx;
    wz = mz;
    // the squash: pressed in world y, swelling in x and z (about the centre); then the hover
    my = wy * (1 - 0.26 * Math.sqrt(D.stretch) * sq) + D.bob * Math.sin(TAU * (F / N) + 0.6) - 0.1 * Math.max(0, sq);
    wx *= 1 + 0.11 * sq;
    wz *= 1 + 0.11 * sq;
    wy = mirror ? 2 * FLOOR - my : my;
    out[0] = wx;
    out[1] = wy;
    out[2] = wz;
  };
  const tmp = [0, 0, 0];
  const toCam = (out: number[]) => {
    const y = out[1]!,
      z = out[2]!;
    out[1] = y * cp + z * sp;
    out[2] = -y * sp + z * cp + DIST;
  };
  const pose = (F: number, mirror: boolean) => {
    const sq = squash(F);
    for (let i = 0; i < NS; i++) {
      const o = i * 9,
        // the pinch: waists narrow, lobes swell (r stays well inside the knot's clearance and curvature)
        r = D.r0 * (1 + (sq > 0 ? sq : 0.5 * sq) * (0.2 - 0.8 * WAIST[i]!)),
        cx = CL[o]!,
        cy = CL[o + 1]!,
        cz = CL[o + 2]!;
      toWorld(cx, cy, cz, F, mirror, tmp);
      toCam(tmp);
      CX[i] = tmp[0]!;
      CY[i] = tmp[1]!;
      CZ[i] = tmp[2]!;
      for (let j = 0; j < NV; j++) {
        const a = RING_C[j]! * r,
          b = RING_S[j]! * r;
        toWorld(
          cx + a * CL[o + 3]! + b * CL[o + 6]!,
          cy + a * CL[o + 4]! + b * CL[o + 7]!,
          cz + a * CL[o + 5]! + b * CL[o + 8]!,
          F,
          mirror,
          tmp,
        );
        const k = i * NV + j;
        HW[k] = mirror ? FLOOR - tmp[1]! : 0;
        toCam(tmp);
        PX[k] = tmp[0]!;
        PY[k] = tmp[1]!;
        PZ[k] = tmp[2]!;
      }
    }
    // normals from the posed surface (central differences along and around), turned outward
    for (let i = 0; i < NS; i++) {
      const ip = ((i + 1) % NS) * NV,
        im = ((i + NS - 1) % NS) * NV;
      for (let j = 0; j < NV; j++) {
        const jp = (j + 1) % NV,
          jm = (j + NV - 1) % NV,
          k = i * NV + j;
        const ax = PX[ip + j]! - PX[im + j]!,
          ay = PY[ip + j]! - PY[im + j]!,
          az = PZ[ip + j]! - PZ[im + j]!,
          bx = PX[i * NV + jp]! - PX[i * NV + jm]!,
          by = PY[i * NV + jp]! - PY[i * NV + jm]!,
          bz = PZ[i * NV + jp]! - PZ[i * NV + jm]!;
        let nx = ay * bz - az * by,
          ny = az * bx - ax * bz,
          nz = ax * by - ay * bx;
        const out = (PX[k]! - CX[i]!) * nx + (PY[k]! - CY[i]!) * ny + (PZ[k]! - CZ[i]!) * nz;
        const l = (out < 0 ? -1 : 1) / (Math.hypot(nx, ny, nz) || 1);
        nx *= l;
        ny *= l;
        nz *= l;
        QX[k] = nx;
        QY[k] = ny;
        QZ[k] = nz;
        FR[k] = nx * PX[k]! + ny * PY[k]! + nz * PZ[k]! < 0 ? 1 : 0;
      }
    }
  };
  // the floor sits a fixed gap under the lowest point the knot reaches in the whole loop
  {
    let lo = Infinity;
    for (let F = 0; F < N; F += 4) {
      const sq = squash(F);
      for (let i = 0; i < NS; i += 3) {
        const o = i * 9,
          r = D.r0 * (1 + sq * 0.2);
        toWorld(CL[o]!, CL[o + 1]!, CL[o + 2]!, F, false, tmp);
        lo = Math.min(lo, tmp[1]! - r);
      }
    }
    FLOOR = lo - D.floorGap;
  }

  // ---- the rasteriser: projected triangles into a depth + normal buffer, then one shade per covered pixel
  const SX = new Float32Array(NVT),
    SY = new Float32Array(NVT);
  const passes = new Map<string, Pass>();
  const passFor = (w: number, h: number, key: string): Pass => {
    let p = passes.get(key);
    if (!p || p.w !== w || p.h !== h) {
      const n = w * h;
      p = {
        w,
        h,
        z: new Float32Array(n).fill(FAR),
        nx: new Float32Array(n),
        ny: new Float32Array(n),
        nz: new Float32Array(n),
        hh: new Float32Array(n),
        acc: new Float32Array(n * 4),
      };
      passes.set(key, p);
    }
    return p;
  };
  // bounding box of the last projection, in pass pixels
  let bx0 = 0,
    by0 = 0,
    bx1 = 0,
    by1 = 0;
  const project = (sc: number, jx: number, jy: number, pw: number, ph: number) => {
    let x0 = Infinity,
      y0 = Infinity,
      x1 = -Infinity,
      y1 = -Infinity;
    for (let k = 0; k < NVT; k++) {
      const iz = FOC / PZ[k]!,
        x = (OX + PX[k]! * iz) * sc + jx,
        y = (OY - PY[k]! * iz) * sc + jy;
      SX[k] = x;
      SY[k] = y;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
    bx0 = Math.max(0, Math.floor(x0) - 1);
    by0 = Math.max(0, Math.floor(y0) - 1);
    bx1 = Math.min(pw - 1, Math.ceil(x1) + 1);
    by1 = Math.min(ph - 1, Math.ceil(y1) + 1);
  };
  const clearDepth = (p: Pass) => {
    for (let y = by0; y <= by1; y++) p.z.fill(FAR, y * p.w + bx0, y * p.w + bx1 + 1);
  };
  const tri = (p: Pass, a: number, b: number, c: number, withH: boolean) => {
    if (!(FR[a]! | FR[b]! | FR[c]!)) return;
    const x0 = SX[a]!,
      y0 = SY[a]!,
      x1 = SX[b]!,
      y1 = SY[b]!,
      x2 = SX[c]!,
      y2 = SY[c]!;
    const area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
    if (Math.abs(area) < 1e-7) return;
    const ia = 1 / area;
    const minX = Math.max(bx0, Math.ceil(Math.min(x0, x1, x2) - 0.5)),
      maxX = Math.min(bx1, Math.floor(Math.max(x0, x1, x2) - 0.5)),
      minY = Math.max(by0, Math.ceil(Math.min(y0, y1, y2) - 0.5)),
      maxY = Math.min(by1, Math.floor(Math.max(y0, y1, y2) - 0.5));
    if (minX > maxX || minY > maxY) return;
    const d0x = (y1 - y2) * ia,
      d1x = (y2 - y0) * ia;
    const za = PZ[a]!,
      zb = PZ[b]!,
      zc = PZ[c]!;
    const W_ = p.w,
      Z = p.z;
    for (let y = minY; y <= maxY; y++) {
      const py = y + 0.5,
        px = minX + 0.5;
      let w0 = ((x1 - px) * (y2 - py) - (x2 - px) * (y1 - py)) * ia,
        w1 = ((x2 - px) * (y0 - py) - (x0 - px) * (y2 - py)) * ia;
      let k = y * W_ + minX;
      for (let x = minX; x <= maxX; x++, k++, w0 += d0x, w1 += d1x) {
        const w2 = 1 - w0 - w1;
        if (w0 < -1e-5 || w1 < -1e-5 || w2 < -1e-5) continue;
        const z = w0 * za + w1 * zb + w2 * zc;
        if (z >= Z[k]!) continue;
        Z[k] = z;
        p.nx[k] = w0 * QX[a]! + w1 * QX[b]! + w2 * QX[c]!;
        p.ny[k] = w0 * QY[a]! + w1 * QY[b]! + w2 * QY[c]!;
        p.nz[k] = w0 * QZ[a]! + w1 * QZ[b]! + w2 * QZ[c]!;
        if (withH) p.hh[k] = w0 * HW[a]! + w1 * HW[b]! + w2 * HW[c]!;
      }
    }
  };
  const raster = (p: Pass, withH: boolean) => {
    for (let i = 0; i < NS; i++) {
      const i0 = i * NV,
        i1 = ((i + 1) % NS) * NV;
      for (let j = 0; j < NV; j++) {
        const j1 = (j + 1) % NV;
        tri(p, i0 + j, i1 + j, i1 + j1, withH);
        tri(p, i0 + j, i1 + j1, i0 + j1, withH);
      }
    }
  };

  // world-space lights for the specular and the rim (camera-side key upper left; rim from behind, upper right)
  const nrm = (v: V3): V3 => {
    const l = Math.hypot(...v);
    return [v[0] / l, v[1] / l, v[2] / l];
  };
  const KEY = nrm([-0.55, 0.62, -0.56]),
    KEY2 = nrm([0.7, 0.35, -0.62]),
    RIM = nrm([0.75, 0.45, 0.5]);
  type Look = { flash: number; sweep: number; sweepAz: number };
  const shade = (p: Pass, sc: number, jx: number, jy: number, reflect: boolean, look: Look) => {
    const A_ = p.acc,
      Z = p.z,
      W_ = p.w,
      ifoc = 1 / (FOC * sc);
    const flash = look.flash;
    for (let y = by0; y <= by1; y++) {
      const ly = y + 0.5 - jy,
        dyc = -(ly - OY * sc) * ifoc;
      let k = y * W_ + bx0;
      for (let x = bx0; x <= bx1; x++, k++) {
        if (Z[k]! >= FAR) continue;
        let nx = p.nx[k]!,
          ny = p.ny[k]!,
          nz = p.nz[k]!;
        const nl = 1 / Math.sqrt(nx * nx + ny * ny + nz * nz);
        nx *= nl;
        ny *= nl;
        nz *= nl;
        const lx = x + 0.5 - jx;
        let dx = (lx - OX * sc) * ifoc,
          dy = dyc,
          dz = 1;
        const dl = 1 / Math.sqrt(dx * dx + dy * dy + 1);
        dx *= dl;
        dy *= dl;
        dz *= dl;
        const dn = dx * nx + dy * ny + dz * nz,
          nv = clamp(-dn),
          rx = dx - 2 * dn * nx,
          ry = dy - 2 * dn * ny,
          rz = dz - 2 * dn * nz;
        // back to world (undo the camera's pitch); the floor's mirror image reflects the mirrored world
        let wy = cp * ry - sp * rz;
        const wz = sp * ry + cp * rz,
          wx = rx;
        if (reflect) wy = -wy;
        // the environment strip: linear in elevation (the horizon line is thin), nearest in azimuth
        const e = (clamp(wy, -1, 1) + 1) * 0.5 * (E - 1),
          e0 = Math.min(E - 2, e | 0),
          fe = e - e0;
        const az = Math.atan2(wx, wz);
        let ai = (((az + Math.PI) / TAU) * A) | 0;
        if (ai >= A) ai = A - 1;
        const o0 = (e0 * A + ai) * 3,
          o1 = o0 + A * 3;
        let r = ENV[o0]! + (ENV[o1]! - ENV[o0]!) * fe,
          g = ENV[o0 + 1]! + (ENV[o1 + 1]! - ENV[o0 + 1]!) * fe,
          b = ENV[o0 + 2]! + (ENV[o1 + 2]! - ENV[o0 + 2]!) * fe;
        if (look.sweep > 0) {
          const q = look.sweep;
          r = lerp(r, ENV_DIM[o0]! + (ENV_DIM[o1]! - ENV_DIM[o0]!) * fe, q);
          g = lerp(g, ENV_DIM[o0 + 1]! + (ENV_DIM[o1 + 1]! - ENV_DIM[o0 + 1]!) * fe, q);
          b = lerp(b, ENV_DIM[o0 + 2]! + (ENV_DIM[o1 + 2]! - ENV_DIM[o0 + 2]!) * fe, q);
        }
        // polished metal: a high reflectance that rises toward grazing angles
        const g5 = (1 - nv) ** 5,
          refl = 0.88 + 0.12 * g5;
        r *= refl;
        g *= refl;
        b *= refl;
        // the specular: a sharp key on the crests (and a softer second), brighter on the impact
        const rw0 = wy; // already the true (unmirrored) direction
        let s = Math.max(0, wx * KEY[0] + rw0 * KEY[1] + wz * KEY[2]);
        s *= s; // ^2
        s *= s; // ^4
        s *= s; // ^8
        const broad = s * s; // ^16
        s = broad * broad; // ^32
        s *= s; // ^64
        s *= s; // ^128
        let s2 = Math.max(0, wx * KEY2[0] + rw0 * KEY2[1] + wz * KEY2[2]);
        s2 *= s2;
        s2 *= s2;
        s2 *= s2;
        s2 *= s2;
        s2 *= s2; // ^32
        const spec = (s * 2.4 + broad * 0.1 + s2 * 0.35) * (1 + 1.6 * flash);
        // the rim: grazing edges that face the back light
        const nwy = cp * ny - sp * nz,
          nwz = sp * ny + cp * nz,
          facing = Math.max(0, nx * RIM[0] + (reflect ? -nwy : nwy) * RIM[1] + nwz * RIM[2]),
          ed = 1 - nv,
          rim = reflect ? 0 : ed * ed * ed * ed * facing * 0.9;
        let add = spec + rim;
        // the glint: a hot vertical softbox strip that sweeps through the world after the hit, so its reflection
        // bends along every tube
        if (look.sweep > 0) {
          const da = adiff(az, look.sweepAz) / 0.09,
            gate = smooth(-0.08, 0, wy) * (1 - smooth(0.8, 0.9, wy));
          if (da < 4) add += Math.exp(-da * da) * gate * look.sweep * 3.2;
        }
        r += add * K.s1[0];
        g += add * K.s1[1];
        b += add * K.s1[2];
        // a gentle shoulder instead of a hard clip, so the hot whites roll off
        if (reflect) {
          // (its grazing edges are let go: at half resolution a hairline rim would bead)
          const f = 0.85 * Math.exp(-p.hh[k]! / 1.5) * smooth(0.04, 0.4, nv);
          r *= f;
          g *= f;
          b *= f;
        }
        const o = k * 4;
        A_[o] = A_[o]! + (r > 0.85 ? 0.85 + 0.15 * (1 - Math.exp((0.85 - r) / 0.15)) : r);
        A_[o + 1] = A_[o + 1]! + (g > 0.85 ? 0.85 + 0.15 * (1 - Math.exp((0.85 - g) / 0.15)) : g);
        A_[o + 2] = A_[o + 2]! + (b > 0.85 ? 0.85 + 0.15 * (1 - Math.exp((0.85 - b) / 0.15)) : b);
        A_[o + 3] = A_[o + 3]! + 1;
      }
    }
  };

  // draw one pass (the knot or its floor image) at pass scale sc, averaged over n samples, onto ctx
  const layerFor = (env: Env, w: number, h: number, key: string): Layer => {
    const k = `chrome:${id}:${key}:${w}x${h}`;
    let lay = env.cache.get(k) as Layer | undefined;
    if (!lay) {
      lay = env.canvas(w, h);
      env.cache.set(k, lay);
    }
    return lay;
  };
  const drawPass = (ctx: Ctx, env: Env, F: number, reflect: boolean) => {
    const sc = env.scale * (reflect ? 0.5 : 1),
      pw = Math.round(W * sc),
      ph = Math.round(H * sc),
      fast = F >= 114 && F <= 124 && Math.abs(squash(F + 0.25) - squash(F - 0.25)) > 0.03,
      n = reflect ? RSAMPLES : fast ? FAST_SAMPLES : SAMPLES,
      shutter = fast ? FAST_SHUTTER : SHUTTER,
      p = passFor(pw, ph, reflect ? "r" : "k");
    let ux0 = pw,
      uy0 = ph,
      ux1 = -1,
      uy1 = -1;
    // the glint sweeps across the knot's screen extent along the diagonal
    const fl = punch(F) + 0.45 * prePunch(F) + 0.5 * glint0(F),
      sw = window01(F, 126, 134, 144, 152),
      look: Look = {
        flash: fl,
        sweep: sw,
        sweepAz: lerp(BOX1 + 0.35, BOX2 - 0.35, ease.inOutCubic(prog(F, 124, 150))),
      };
    for (let s = 0; s < n; s++) {
      const [jx, jy] = (reflect ? RJIT : fast ? JIT_FAST : JIT)[s]!;
      const dt = (n > 1 ? s / (n - 1) - 0.5 : 0) * shutter;
      pose(F + dt, reflect);
      project(sc, jx - 0.5, jy - 0.5, pw, ph);
      if (bx1 < bx0 || by1 < by0) continue;
      clearDepth(p);
      raster(p, reflect);
      shade(p, sc, jx - 0.5, jy - 0.5, reflect, look);
      ux0 = Math.min(ux0, bx0);
      uy0 = Math.min(uy0, by0);
      ux1 = Math.max(ux1, bx1);
      uy1 = Math.max(uy1, by1);
    }
    if (ux1 < ux0 || uy1 < uy0) return;
    const bw = ux1 - ux0 + 1,
      bh = uy1 - uy0 + 1,
      lay = layerFor(env, pw, ph, reflect ? "r" : "k"),
      img = lay.ctx.createImageData(bw, bh),
      d = img.data,
      A_ = p.acc;
    for (let y = 0; y < bh; y++) {
      let k = (uy0 + y) * pw + ux0,
        o = y * bw * 4;
      for (let x = 0; x < bw; x++, k++, o += 4) {
        const c = A_[k * 4 + 3]!;
        if (c > 0) {
          const ic = 255 / c;
          d[o] = A_[k * 4]! * ic;
          d[o + 1] = A_[k * 4 + 1]! * ic;
          d[o + 2] = A_[k * 4 + 2]! * ic;
          d[o + 3] = (c / n) * 255;
          A_[k * 4] = 0;
          A_[k * 4 + 1] = 0;
          A_[k * 4 + 2] = 0;
          A_[k * 4 + 3] = 0;
        }
      }
    }
    lay.ctx.setTransform(1, 0, 0, 1, 0, 0);
    lay.ctx.clearRect(0, 0, pw, ph);
    lay.ctx.putImageData(img, ux0, uy0);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(lay.canvas, 0, 0, pw, ph, 0, 0, Math.round(W * env.scale), Math.round(H * env.scale));
    ctx.restore();
  };

  // ---- the stage: near-black ground, the world's horizon as a faint line, a glossy floor with a pool of light
  // under the knot and a soft contact shadow (cached once per size)
  const floorY = (() => {
    // the floor's screen line straight under the knot's centre
    const t = [0, FLOOR, 0];
    toCam(t);
    return OY - (t[1]! * FOC) / t[2]!;
  })();
  const stage = (env: Env): Layer => {
    const pw = Math.round(W * env.scale),
      ph = Math.round(H * env.scale),
      key = `chrome:${id}:stage:${pw}x${ph}`;
    let lay = env.cache.get(key) as Layer | undefined;
    if (lay) return lay;
    lay = env.canvas(pw, ph);
    const c = lay.ctx;
    c.setTransform(env.scale, 0, 0, env.scale, 0, 0);
    c.fillStyle = C.ground;
    c.fillRect(0, 0, W, H);
    // the sky side: the faintest warm then cool lift just above the horizon, the world the metal reflects
    // (the tall frame has more sky above the knot: a taller, stronger band, so the world the metal reflects shows)
    const skyH = (L.tall ? 700 : 360) * u,
      sky = c.createLinearGradient(0, HORIZON - skyH, 0, HORIZON);
    sky.addColorStop(0, "rgba(11,12,16,0)");
    sky.addColorStop(0.45, `rgba(58,65,82,${L.tall ? 0.08 : 0.03})`);
    sky.addColorStop(0.8, `rgba(159,211,255,${L.tall ? 0.07 : 0.035})`);
    sky.addColorStop(1, `rgba(255,179,138,${L.tall ? 0.06 : 0.04})`);
    c.fillStyle = sky;
    c.fillRect(0, HORIZON - skyH, W, skyH);
    // the floor: surface at the horizon, falling to deep toward the viewer
    const fl = c.createLinearGradient(0, HORIZON, 0, H);
    fl.addColorStop(0, C.surface);
    fl.addColorStop(0.35, C.ground);
    fl.addColorStop(1, C.deep!);
    c.fillStyle = fl;
    c.fillRect(0, HORIZON, W, H - HORIZON);
    // the horizon line itself, hairline, brightest behind the knot
    const hl = c.createLinearGradient(0, 0, W, 0);
    hl.addColorStop(0, "rgba(107,114,128,0)");
    hl.addColorStop(0.5, "rgba(238,241,246,0.28)");
    hl.addColorStop(1, "rgba(107,114,128,0)");
    c.fillStyle = hl;
    c.fillRect(0, HORIZON - 0.75 * u, W, 1.5 * u);
    // a pool of light on the floor under the knot
    c.save();
    c.translate(OX, floorY);
    c.scale(1, 0.22);
    const pool = c.createRadialGradient(0, 0, 0, 0, 0, 520 * u);
    pool.addColorStop(0, "rgba(58,65,82,0.55)");
    pool.addColorStop(0.5, "rgba(58,65,82,0.18)");
    pool.addColorStop(1, "rgba(58,65,82,0)");
    c.fillStyle = pool;
    c.fillRect(-560 * u, -560 * u, 1120 * u, 1120 * u);
    c.restore();
    // the vignette: the corners fall away so the eye stays on the metal
    const vg = c.createRadialGradient(OX, OY, Math.min(W, H) * 0.35, OX, OY, Math.hypot(W, H) * 0.62);
    vg.addColorStop(0, "rgba(5,6,8,0)");
    vg.addColorStop(1, "rgba(5,6,8,0.6)");
    c.fillStyle = vg;
    c.fillRect(0, 0, W, H);
    env.cache.set(key, lay);
    return lay;
  };
  // the contact shadow breathes with the hover (closer = darker, tighter)
  const shadow = (ctx: Ctx, F: number) => {
    const h = D.bob * Math.sin(TAU * (F / N) + 0.6) - 0.1 * Math.max(0, squash(F)),
      k = clamp(0.5 - h / (D.bob * 4) + 0.25 * Math.max(0, squash(F)));
    ctx.save();
    ctx.translate(OX, floorY);
    ctx.scale(1, 0.16);
    const rr = (300 - 40 * k) * u;
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rr);
    g.addColorStop(0, `rgba(5,6,8,${0.5 + 0.3 * k})`);
    g.addColorStop(1, "rgba(5,6,8,0)");
    ctx.fillStyle = g;
    ctx.fillRect(-rr, -rr, rr * 2, rr * 2);
    ctx.restore();
  };

  // ---- the sparkle: a four-point star pinned to a crest point of the knot (fine strokes: drawn once, unblurred)
  // the crest point for each flare is chosen once: the most specular front vertex at that frame
  const crestAt = (F: number) => {
    pose(F, false);
    let best = 0,
      bk = 0;
    for (let k = 0; k < NVT; k++) {
      if (!FR[k]) continue;
      // only the near side of the knot (a crest that faces us, not one behind a strand)
      const i = (k / NV) | 0;
      if (CZ[i]! > DIST + 0.2) continue;
      // and near the middle of the frame, so a star's rays stay inside it
      if (Math.abs((PX[k]! * FOC) / PZ[k]!) > (L.tall ? 0.22 : 0.3) * W) continue;
      const nx = QX[k]!,
        ny = QY[k]!,
        nz = QZ[k]!;
      let dx = PX[k]!,
        dy = PY[k]!,
        dz = PZ[k]!;
      const dl = Math.hypot(dx, dy, dz);
      dx /= dl;
      dy /= dl;
      dz /= dl;
      const dn = dx * nx + dy * ny + dz * nz,
        rx = dx - 2 * dn * nx,
        ry = dy - 2 * dn * ny,
        rz = dz - 2 * dn * nz,
        wy = cp * ry - sp * rz,
        wz = sp * ry + cp * rz,
        s = rx * KEY[0] + wy * KEY[1] + wz * KEY[2];
      if (s > best) {
        best = s;
        bk = k;
      }
    }
    return bk;
  };
  const CREST0 = crestAt(0),
    CREST60 = crestAt(62),
    CREST1 = crestAt(T.hit + 4);
  const pinAt = (k: number, F: number): [number, number] => {
    pose(F, false);
    const iz = FOC / PZ[k]!;
    // lift the star a hair off the surface toward its normal so it sits on the crest's highlight
    return [OX + (PX[k]! + QX[k]! * 0.05) * iz, OY - (PY[k]! + QY[k]! * 0.05) * iz];
  };
  const star = (ctx: Ctx, x: number, y: number, R: number, a: number, rot: number) => {
    if (a <= 0.003 || R < 0.5) return;
    ctx.save();
    ctx.translate(x, y);
    if (L.tall) {
      // the tall star sits over bright metal: a short dark halo behind its core so it reads without growing
      const dk = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 0.4);
      dk.addColorStop(0, `rgba(5,6,8,${0.35 * a})`);
      dk.addColorStop(1, "rgba(5,6,8,0)");
      ctx.fillStyle = dk;
      ctx.beginPath();
      ctx.arc(0, 0, R * 0.4, 0, TAU);
      ctx.fill();
    }
    ctx.globalCompositeOperation = "lighter";
    const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 0.55);
    halo.addColorStop(0, `rgba(255,255,255,${a})`);
    halo.addColorStop(0.18, `rgba(255,255,255,${0.35 * a})`);
    halo.addColorStop(0.5, `rgba(159,211,255,${0.1 * a})`);
    halo.addColorStop(1, "rgba(159,211,255,0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.55, 0, TAU);
    ctx.fill();
    ctx.rotate(rot);
    // the long cross, then a short diagonal cross: thin lozenges, tapered to points
    const ray = (len: number, wid: number, al: number) => {
      const g = ctx.createLinearGradient(-len, 0, len, 0);
      g.addColorStop(0, "rgba(255,255,255,0)");
      g.addColorStop(0.5, `rgba(255,255,255,${al})`);
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-len, 0);
      ctx.quadraticCurveTo(0, -wid, len, 0);
      ctx.quadraticCurveTo(0, wid, -len, 0);
      ctx.fill();
    };
    ray(R, R * 0.05, a);
    ctx.rotate(Math.PI / 2);
    ray(R * 0.82, R * 0.05, a);
    ctx.rotate(Math.PI / 4);
    ray(R * 0.34, R * 0.035, a * 0.7);
    ctx.rotate(Math.PI / 2);
    ray(R * 0.34, R * 0.035, a * 0.7);
    ctx.restore();
  };

  // ---- grain: a faint seeded speckle, four tiles cycled with the frame (240 is a multiple of 4, so it loops)
  const grain = (env: Env, which: number): Layer => {
    const s = 256,
      key = `chrome:grain:${which}`;
    let lay = env.cache.get(key) as Layer | undefined;
    if (lay) return lay;
    lay = env.canvas(s, s);
    const img = lay.ctx.createImageData(s, s),
      q = rng(5600 + which);
    for (let i = 0; i < s * s; i++) {
      const v = q(),
        o = i * 4;
      const c = v < 0.5 ? 0 : 255;
      img.data[o] = c;
      img.data[o + 1] = c;
      img.data[o + 2] = c;
      img.data[o + 3] = Math.abs(v - 0.5) * 2 * 9;
    }
    lay.ctx.putImageData(img, 0, 0);
    env.cache.set(key, lay);
    return lay;
  };

  const paint = (ctx: Ctx, env: Env, F: number) => {
    F = ((F % N) + N) % N;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.drawImage(stage(env).canvas, 0, 0);
    ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
    shadow(ctx, F);
    drawPass(ctx, env, F, true);
    drawPass(ctx, env, F, false);
    // the flares: one rides the crest through the loop point (pinned with the frame unwrapped, so it does not
    // jump to a symmetric twin across the seam), a bigger one bursts on the downbeat
    ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
    const g0 = glint0(F);
    if (g0 > 0) {
      const [x, y] = pinAt(CREST0, F > N / 2 ? F - N : F);
      star(ctx, x, y, 170 * u * (0.35 + 0.65 * g0), g0, 0.2 + 0.004 * (F > N / 2 ? F - N : F));
    }
    // beat 3's small flare sets up the big one: small, small, BIG across the two bars
    const gp = F >= 59 && F <= 84 ? window01(F, 59, 60, 62, 82) : 0;
    if (gp > 0) {
      const [x, y] = pinAt(CREST60, F),
        e = ease.outCubic(gp);
      star(ctx, x, y, 120 * u * (0.4 + 0.6 * e), e * 0.9, -0.15 + 0.005 * (F - 60));
    }
    const g1 = F >= T.hit - 1 ? window01(F, T.hit - 1, T.hit, T.hit + 6, T.hit + 22) : 0;
    if (g1 > 0) {
      const [x, y] = pinAt(CREST1, F),
        e = ease.outCubic(g1);
      star(ctx, x, y, (L.tall ? 200 : 250) * u * (0.4 + 0.6 * e) * (1 + 0.15 * punch(F)), e, 0.1 + 0.006 * (F - T.hit));
    }
    // grain over everything, very faint
    const gl = grain(env, F % 4),
      q = rng(9100 + F);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    const pat = ctx.createPattern(gl.canvas, "repeat");
    if (pat) {
      ctx.save();
      ctx.translate(-Math.floor(q() * 256), -Math.floor(q() * 256));
      ctx.fillStyle = pat;
      ctx.fillRect(0, 0, Math.round(W * env.scale) + 256, Math.round(H * env.scale) + 256);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  };

  const cuts = [T.turn, T.hit, T.settle, N],
    names = ["turn", "pinch", "settle"];
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

// ---- sound: the soft beat score in C minor as a quiet bed (its tails wrap, so the loop is seamless), a felt sub
// under both downbeats, a metallic shimmer that swells into frame 120 and stops dead, a bright bell struck on 120,
// and a tiny high tink for the frame-0 glint
const BASE_GAIN = 0.16,
  OUT = 0.84,
  SHIMMER_FROM = 66;
function score(sr: number): [Float32Array, Float32Array] {
  const [Lc, Rc] = beatScore({ frames: N, fps: FPS, bpm: BPM, mood: "soft", key: 3, loop: true, gain: BASE_GAIN })(sr);
  const n = Lc.length,
    at = (f: number) => Math.round((f / FPS) * sr),
    noise = rng(5656);
  // the bed ducks under the hit and breathes back in (a closed-form sidechain that has fully recovered by the wrap)
  for (let i = at(T.hit); i < n; i++) {
    const d = 1 - 0.55 * Math.exp(-(i - at(T.hit)) / (0.25 * sr));
    Lc[i] = Lc[i]! * d;
    Rc[i] = Rc[i]! * d;
  }
  const add = (i: number, v: number, pan: number) => {
    i = ((i % n) + n) % n;
    Lc[i] = Lc[i]! + v * (1 - pan);
    Rc[i] = Rc[i]! + v * pan;
  };
  const hz = (m: number) => 440 * 2 ** ((m - 69) / 12);
  // the sub: a soft C (about 65 Hz) with a slow attack, under frame 0 and frame 120
  for (const [f, vel] of [
    [0, 0.14],
    [T.hit, 0.3],
  ] as const) {
    const i0 = at(f),
      fr = hz(36);
    for (let k = 0; k < Math.round(1.8 * sr); k++) {
      const t = k / sr;
      add(i0 + k, Math.sin(TAU * fr * t) * Math.min(1, t / 0.012) * Math.exp(-t / 0.55) * vel, 0.5);
    }
  }
  // the shimmer: high band-passed air plus a cluster of inharmonic partials (struck-metal ratios) trembling
  // faster and faster, swelling from SHIMMER_FROM and cut dead on the downbeat; it pans left to right
  {
    const i0 = at(SHIMMER_FROM),
      i1 = at(T.hit),
      a1 = 1 - Math.exp((-TAU * 11000) / sr),
      a2 = 1 - Math.exp((-TAU * 3500) / sr),
      parts = [1, 1.414, 2.13, 2.76, 3.92].map((r) => r * hz(84)),
      ph = parts.map(() => 0);
    let lp = 0,
      lp2 = 0,
      trem = 0;
    for (let i = i0; i < i1; i++) {
      const t = (i - i0) / sr,
        q = (i - i0) / (i1 - i0);
      lp += a1 * (noise() * 2 - 1 - lp);
      lp2 += a2 * (lp - lp2);
      trem += (14 + 26 * q * q) / sr;
      const tr = 0.6 + 0.4 * Math.sin(TAU * trem);
      let m = 0;
      for (let j = 0; j < parts.length; j++) {
        ph[j] = ph[j]! + (parts[j]! * (1 + 0.004 * Math.sin(TAU * (3 + j) * t))) / sr;
        m += Math.sin(TAU * ph[j]!) / (j + 1.5);
      }
      const env = q ** 2.6 * Math.min(1, (i1 - i) / (0.003 * sr));
      add(i, ((lp - lp2) * 0.9 + m * 0.11) * tr * env, 0.22 + 0.56 * q);
    }
  }
  // the bell on 120: C6 with a bell's inharmonic partials (hum, prime, tierce, quint, nominal and up), each with
  // its own decay, plus a short bright strike; the tail runs past the end and wraps into frame 0
  {
    const i0 = at(T.hit),
      f0 = hz(84),
      partials: [number, number, number][] = [
        [0.5, 0.35, 2.4], // hum: ratio, level, decay (s)
        [1, 0.6, 1.8],
        [1.2, 0.3, 1.2],
        [1.5, 0.22, 0.9],
        [2, 0.42, 0.8],
        [2.74, 0.2, 0.5],
        [3.76, 0.14, 0.35],
        [5.4, 0.08, 0.22],
      ];
    for (let k = 0; k < Math.round(2.6 * sr); k++) {
      const t = k / sr;
      let v = 0;
      for (const [r, lv, dc] of partials) v += Math.sin(TAU * f0 * r * t + r) * lv * Math.exp(-t / dc);
      add(i0 + k, v * Math.min(1, t / 0.0015) * (1 + 1.4 * Math.exp(-t / 0.05)) * 0.6, 0.55);
    }
    // the strike: a click of very high noise
    let hp = 0;
    const a = 1 - Math.exp((-TAU * 5000) / sr);
    for (let k = 0; k < Math.round(0.03 * sr); k++) {
      const x = noise() * 2 - 1;
      hp += a * (x - hp);
      add(i0 + k, (x - hp) * Math.exp(-k / (0.008 * sr)) * 1.4, 0.55);
    }
  }
  // the glint tinks: a small high bell on frame 0 (G7) and a smaller one on beat 3's pre-pulse (C7)
  for (const [f, m, vel, pan] of [
    [0, 103, 0.11, 0.38],
    [60, 96, 0.28, 0.62],
  ] as const) {
    const i0 = at(f),
      f0 = hz(m);
    for (let k = 0; k < Math.round(0.7 * sr); k++) {
      const t = k / sr;
      const v =
        (Math.sin(TAU * f0 * t) + 0.3 * Math.sin(TAU * f0 * 2.76 * t) * Math.exp(-t / 0.08)) * Math.exp(-t / 0.2);
      add(i0 + k, v * Math.min(1, t / 0.002) * vel, pan);
    }
  }
  // a soft breath of air that rises into the loop point and stops on sample 0 (written at negative indices, so
  // it sits at the end of the buffer and wraps into frame 0)
  {
    const len = Math.round(0.45 * sr),
      a1 = 1 - Math.exp((-TAU * 7000) / sr),
      a2 = 1 - Math.exp((-TAU * 1500) / sr);
    let lp = 0,
      lp2 = 0;
    for (let k = -len; k < 0; k++) {
      lp += a1 * (noise() * 2 - 1 - lp);
      lp2 += a2 * (lp - lp2);
      const q = (k + len) / len;
      add(k, (lp - lp2) * q ** 2.2 * Math.min(1, -k / (0.003 * sr)) * 0.25, 0.62 - 0.24 * q);
    }
  }
  // a short swell that crosses beat 3 (Eb5 and C5), so the pre-pulse is a pulse and not a recovery from the bed's dip
  {
    const i0 = at(60),
      a0 = Math.round(0.18 * sr),
      a1 = Math.round(0.45 * sr);
    for (let k = -a0; k < a1; k++) {
      const t = k / sr,
        e = k < 0 ? (1 + k / a0) ** 2 : Math.exp(-t / 0.14) * (1 - k / a1);
      add(i0 + k, (Math.sin(TAU * hz(75) * t) + 0.7 * Math.sin(TAU * hz(72) * t)) * e * 0.063, 0.5);
    }
  }
  // a module pad under everything: C3, C4 and Eb4 (the notes the loop's two chords share), each tuned to a whole
  // number of cycles per loop, so it is periodic by construction and fills the bed's release hole at every bar
  // line, deepest at the wrap
  {
    const loopS = n / sr;
    const tones = [hz(48), hz(60), hz(63)].map((f) => Math.round(f * loopS) / loopS);
    for (let i = 0; i < n; i++) {
      const t = i / sr,
        sw = 0.75 + 0.25 * Math.cos((TAU * 2 * t) / loopS);
      let v = 0;
      for (let j = 0; j < tones.length; j++) v += Math.sin(TAU * tones[j]! * t + j) * [0.22, 0.12, 0.08][j]!;
      add(i, v * sw, 0.5);
    }
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

export const chrome = make("square", "chrome");
export const chromeVertical = make("vertical", "chromeVertical");
