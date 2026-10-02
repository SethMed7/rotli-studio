// STUDY 59 · ONE BIT (4 s, 60 fps, a seamless loop). A SECONDS piece: no words, the style is the whole piece.
// A faceted icosahedron floats over a plain under a small red sun, rendered to two colours, ink on paper, through
// an 8×8 Bayer threshold, in the manner of Return of the Obra Dinn. On the bar-2 downbeat a hole punches through
// it and it whips round as a faceted torus, then closes back into the gem by the loop point.
// One source, designed for square (the hero) and vertical (more sky and more plain, the gem a little high).
// Brief: series/studies/briefs/one-bit.json · prompt: series/studies/prompts/one-bit.prompt.md
// Technique after ordered dithering (https://en.wikipedia.org/wiki/Ordered_dithering) and its use as a whole
// visual style in Lucas Pope's Return of the Obra Dinn (https://en.wikipedia.org/wiki/Return_of_the_Obra_Dinn).
// No art from the game is used.
//
// The scene is ray-marched at a low internal resolution (270 cells across, 4 output px each) from signed
// distance fields: the icosahedron is the max of its ten face-plane pairs, the torus a ring of straight segments
// with an octagonal tube, so both are flat-faceted, and the morph is a blend of the two fields (which is what
// lets a hole open: a shared mesh could not change genus). Each cell gets a luminance (one sun, a sky and ground
// fill, a soft cast shadow, a sky gradient), then is thresholded against the Bayer value of its SCREEN cell, so
// the pattern stays put while the object turns through it and shimmers. Everything is a function of the frame:
// the spin integrates to exactly one turn, every pulse is a function of the wrapped distance to its beat.
import PACK from "../../../brand/packs/studio/pack.json";
import { rng, type Ctx, type Env, type Layer } from "../core";
import type { Film, Shot } from "../film";
import { bezier, clamp, ease, lerp, prog, spring } from "../kit/motion";
import { usePack } from "../kit/pack";
import { beatScore } from "../kit/score";
import { layout, type Size } from "../kit/sizes";

const P = usePack(PACK),
  C = P.palette("onebit");
const FPS = 60,
  BPM = 120,
  N = 240, // two bars: a beat is 30 frames, bar 2's downbeat is frame 120
  TAU = Math.PI * 2;
// the story, in frames (each on the beat grid)
const T = { turn: 0, hit: 120, back: 180 };

// ---- the 8×8 Bayer matrix (thresholds (v + 0.5) / 64)
const BAYER = [
  0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54,
  22, 3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29,
  53, 21,
].map((v) => (v + 0.5) / 64);

// ---- the icosahedron: its 20 face normals are the dodecahedron's vertices, 10 opposite pairs. Turned once so a
// vertex points up (the spin then has five-fold symmetry)
const ICO = (() => {
  const g = (1 + Math.sqrt(5)) / 2,
    ig = 1 / g;
  const raw = [
    [1, 1, 1],
    [1, 1, -1],
    [1, -1, 1],
    [1, -1, -1],
    [0, ig, g],
    [0, ig, -g],
    [ig, g, 0],
    [-ig, g, 0],
    [g, 0, ig],
    [g, 0, -ig],
  ];
  // the vertex (0, 1, g) to +y: a rotation about x
  const a = Math.atan2(g, 1),
    ca = Math.cos(a),
    sa = Math.sin(a),
    out = new Float64Array(30);
  raw.forEach(([x, y, z], i) => {
    const l = Math.hypot(x!, y!, z!);
    out[i * 3] = x! / l;
    out[i * 3 + 1] = (y! * ca + z! * sa) / l;
    out[i * 3 + 2] = (-y! * sa + z! * ca) / l;
  });
  return out;
})();
const RI = 0.8; // inradius (circumradius about 1.06)
// the torus: NS straight segments round the ring, an MT-gon tube
const NS = 14,
  MT = 8,
  RT = 0.74,
  RTB = 0.3,
  SEG = TAU / NS;
const SC = Float64Array.from({ length: NS }, (_, k) => Math.cos(-Math.PI + (k + 0.5) * SEG)),
  SS = Float64Array.from({ length: NS }, (_, k) => Math.sin(-Math.PI + (k + 0.5) * SEG)),
  TC = Float64Array.from({ length: MT }, (_, j) => Math.cos((j * TAU) / MT)),
  TS = Float64Array.from({ length: MT }, (_, j) => Math.sin((j * TAU) / MT));

const smooth = (x: number) => {
  const t = clamp(x);
  return t * t * (3 - 2 * t);
};
// the signed frame distance from F to a beat h, wrapped into [-120, 120): every pulse is a function of it, so
// every pulse is periodic by construction
const wd = (F: number, h: number) => ((((F - h + N / 2) % N) + N) % N) - N / 2;
// an accent that lands ON its frame: a narrow bell (the loop point and beat 3 use it, so frame 0 is a peak and
// 239 → 0 is an ordinary step)
const bell = (F: number, h: number, w: number) => Math.exp(-((wd(F, h) / w) ** 2));
// the hit: a four-frame rise into the downbeat, then a windowed decay that is exactly 0 by 90 frames later
const kick = (F: number, h: number, tau: number) => {
  const d = wd(F, h);
  if (d < -4) return 0;
  if (d < 0) return smooth((d + 4) / 4);
  return Math.exp(-d / tau) * (1 - smooth((d - 30) / 60));
};

// ---- the morph, icosahedron (0) → torus (1): accelerates in so the hole punches open ON the downbeat, springs
// past full, holds while it whips round, then closes with an ease-in-out (slope 0 at both ends) and is all gem
// again by frame 222, well before the loop
const IN = bezier(0.6, 0, 1, 1);
const morph = (F: number) => {
  if (F < 106) return 0;
  if (F < T.hit) return 0.76 * IN(prog(F, 106, T.hit));
  const s = 0.76 + 0.24 * spring((F - T.hit) / FPS, { freq: 2.4, damp: 0.5 });
  if (F < 186) return s;
  const p = prog(F, 186, 222);
  return s * (1 - (p - (0.6 * Math.sin(TAU * p)) / TAU - (0.4 * Math.sin(2 * TAU * p)) / (2 * TAU)));
};
// ---- the spin: exactly one turn per loop. It surges on every beat (fastest ON the beat), kicks on beat 3, and on
// the downbeat whips forward and eases back down through the torus, never stopping. Each term integrates to zero
// over the loop, and the slowest it ever turns is about 0.4 of its mean speed
const WHIP = bezier(0.12, 0.7, 0.35, 1);
const spin = (F: number) => {
  const t = F / N,
    S = F < T.hit ? 0 : WHIP(prog(F, T.hit, 200)),
    S3 = F < 60 ? 0 : WHIP(prog(F, 60, 84));
  return TAU * (t + (0.2 / (TAU * 8)) * Math.sin(TAU * 8 * t) + 0.3 * (S - t) + 0.08 * (S3 - t));
};

export function make(size: Size, id: string): Film {
  const L = layout(size),
    { W, H } = L,
    tall = L.tall;
  // ---- per-size design (internal cells; 4 output px each at 1080 across)
  const IW = 270,
    IH = tall ? 480 : 270,
    // focal length in cells. The vertical stands further back on a longer lens: the gem is the same size, but the
    // plain recedes, so its shadow ends on the ground inside the frame instead of running out under the viewer
    F0 = tall ? 280 : 220,
    CAMH = 0.72, // a low eye: the sky opens up and the sun can stand high enough for a short shadow
    D = tall ? 5.5 : 4.2, // camera distance
    OY = 1.16, // the gem's resting height (it hovers a hand above its own shadow)
    PPY = (tall ? 0.46 : 0.5) * IH + ((OY - CAMH) / D) * F0, // the horizon row (puts the gem's centre where it should sit)
    PPX = IW / 2,
    // the sun's cell. The square's stands off to the left, so the gem's left flank takes the light and the shadow
    // runs toward the viewer and to the right; the vertical's stands near the middle, so its shadow falls down the
    // centre of the tall frame
    SUNX = tall ? 124 : 46,
    SUNY = tall ? 84 : 46,
    SHK = tall ? 40 : 18, // the cast shadow's sharpness
    // how far the downbeat's red ring and the loop point's travel (the vertical's stay whole and below the top
    // 220 px a feed covers), and how far the light breathes
    WAVE = tall ? 20 : 62,
    WAVE0 = tall ? 16 : 45,
    BREATHE = tall ? 0.03 : 0.04,
    // the lines across the view stop where they would come closer than six cells apart
    AZ = Math.sqrt((F0 * CAMH) / 6);
  // the light comes from the sun; it breathes a little higher and lower over the loop, so the dither bands crawl
  // across the faces even between the beats
  const LX0 = (SUNX - PPX) / F0,
    LY0 = (PPY - SUNY) / F0;
  let lx = 0,
    ly = 0,
    lz = 1;
  // the sky's fill: from above, in front and to the right of the gem
  const FL = Math.hypot(0.55, 0.65, -0.55),
    FX = 0.55 / FL,
    FY = 0.65 / FL,
    FZ = -0.55 / FL;
  const n = IW * IH,
    lum = new Float32Array(n),
    kind = new Uint8Array(n), // 0 sky, 1 ground, 2 object
    nrm = new Float32Array(n * 3),
    // which flat face each cell shows, on the icosahedron and on the torus: creases are engraved where it changes
    fidI = new Int16Array(n),
    fidT = new Int16Array(n);

  // ---- per-frame scene state (set at the top of paint, read by the field)
  let m = 0,
    sc = 1,
    cx = 0,
    cy = OY,
    cz = 0;
  const M = new Float64Array(9); // object → world rotation (its transpose takes world → object)
  let idI = 0,
    idT = 0; // the face (argmax plane) of each field at the last point sampled

  // the blended field, in world coordinates
  const sd = (px: number, py: number, pz: number) => {
    const wx = px - cx,
      wy = py - cy,
      wz = pz - cz;
    const x = (M[0]! * wx + M[3]! * wy + M[6]! * wz) / sc,
      y = (M[1]! * wx + M[4]! * wy + M[7]! * wz) / sc,
      z = (M[2]! * wx + M[5]! * wy + M[8]! * wz) / sc;
    let di = 0,
      dt = 0;
    if (m < 1) {
      di = -1e9;
      for (let i = 0; i < 30; i += 3) {
        const q = ICO[i]! * x + ICO[i + 1]! * y + ICO[i + 2]! * z,
          v = Math.abs(q);
        if (v > di) {
          di = v;
          idI = (i / 3) * 2 + (q < 0 ? 1 : 0);
        }
      }
      di -= RI;
    }
    if (m > 0) {
      let k = Math.floor((Math.atan2(z, x) + Math.PI) / SEG);
      if (k >= NS) k = NS - 1;
      const s = x * SC[k]! + z * SS[k]! - RT;
      dt = -1e9;
      let jj = 0;
      for (let j = 0; j < MT; j++) {
        const v = TC[j]! * s + TS[j]! * y;
        if (v > dt) {
          dt = v;
          jj = j;
        }
      }
      idT = k * MT + jj;
      dt -= RTB;
    }
    return (m <= 0 ? di : m >= 1 ? dt : lerp(di, dt, m)) * sc;
  };
  const RB = 1.25; // a bounding sphere (times sc) every ray tests before it marches
  // a soft shadow toward the sun from a point: marched only where the ray passes the bounding sphere, otherwise
  // estimated from its closest approach so the penumbra has no edge where the march stops
  const shadow = (px: number, py: number, pz: number, k: number) => {
    const ox = px - cx,
      oy = py - cy,
      oz = pz - cz,
      b = ox * lx + oy * ly + oz * lz,
      c2 = ox * ox + oy * oy + oz * oz;
    if (b > 0 && c2 > (RB * sc) ** 2) return 1; // the sun side, facing away from the gem
    const tc = Math.max(0.05, -b),
      dc = Math.sqrt(Math.max(0, c2 - b * b)),
      R = RB * sc;
    const free = clamp((k * (dc - 1.02 * sc)) / tc);
    if (dc > R) return free;
    const h = Math.sqrt(R * R - dc * dc);
    let t = Math.max(0.03, tc - h);
    const t1 = tc + h;
    let res = 1;
    for (let i = 0; i < 40 && t < t1; i++) {
      const d = sd(px + lx * t, py + ly * t, pz + lz * t);
      res = Math.min(res, (k * d) / t);
      if (res < 0.002) return 0;
      t += clamp(d, 0.02, 0.25);
    }
    return clamp(Math.min(res, Math.max(free, res)));
  };

  // ---- the surfaces this frame draws into (cached once per size: the image is fully overwritten every frame)
  const surf = (env: Env) => {
    const key = `oneBit:${IW}x${IH}`;
    let s = env.cache.get(key) as { lay: Layer; img: ImageData; px: Uint32Array } | undefined;
    if (s) return s;
    const lay = env.canvas(IW, IH),
      img = lay.ctx.createImageData(IW, IH);
    s = { lay, img, px: new Uint32Array(img.data.buffer) };
    env.cache.set(key, s);
    return s;
  };
  // pack colours as little-endian RGBA words
  const word = (hex: string) => {
    const v = parseInt(hex.slice(1), 16);
    return ((255 << 24) | ((v & 255) << 16) | (((v >> 8) & 255) << 8) | ((v >> 16) & 255)) >>> 0;
  };
  const PAPER = word(C.ground),
    INK = word(C.ink),
    RED = word(C.accent);

  const paint = (ctx: Ctx, env: Env, F: number) => {
    F = ((F % N) + N) % N;
    const t = F / N;
    // ---- the frame's moments
    const hit = kick(F, T.hit, 9), // the downbeat
      b0 = bell(F, 0, 9), // the loop point lands
      b3 = bell(F, 60, 7), // beat 3 sets up the hit
      land = b0 * 0.8 + b3 * 0.45,
      flash = bell(F, 0, 5), // the gem glints on frame 0
      beats = [30, 90, 150, 210].reduce((a, h) => a + bell(F, h, 6), 0) * 0.22; // the other beats tick softly
    m = morph(F);
    sc = 1 + 0.07 * hit + 0.08 * b0 + 0.03 * b3 - 0.025 * smooth(prog(F, 96, T.hit)) * (F < T.hit ? 1 : 0);
    {
      const ly0 = LY0 + BREATHE * Math.sin(TAU * t),
        l = Math.hypot(LX0, ly0, 1);
      lx = LX0 / l;
      ly = ly0 / l;
      lz = 1 / l;
    }
    // bob: lowest on each bar line (it settles onto the downbeats), a gentle float between
    cy = OY + 0.07 * (0.5 - 0.5 * Math.cos(TAU * 2 * t));
    // orientation: wobble · tilt toward the camera (more as a torus, to show the hole) · spin about its axis
    const th = spin(F),
      // (toward the viewer: the sun behind then meets the ring nearly edge-on, so its shadow stays a compact oval)
      al = -(0.62 + 0.24 * m),
      wb = 0.1 * Math.sin(TAU * t);
    {
      const cT = Math.cos(th),
        sT = Math.sin(th),
        cA = Math.cos(al),
        sA = Math.sin(al),
        cW = Math.cos(wb),
        sW = Math.sin(wb);
      // Rx(al)·Ry(th)
      const a00 = cT,
        a01 = 0,
        a02 = sT,
        a10 = sA * sT,
        a11 = cA,
        a12 = -sA * cT,
        a20 = -cA * sT,
        a21 = sA,
        a22 = cA * cT;
      // Rz(wb)·that
      M[0] = cW * a00 - sW * a10;
      M[1] = cW * a01 - sW * a11;
      M[2] = cW * a02 - sW * a12;
      M[3] = sW * a00 + cW * a10;
      M[4] = sW * a01 + cW * a11;
      M[5] = sW * a02 + cW * a12;
      M[6] = a20;
      M[7] = a21;
      M[8] = a22;
    }
    // camera: a punch-in on the downbeat and a smaller one on the loop point, on the gem
    const zoom = 1 + 0.045 * hit + 0.04 * b0 + 0.012 * b3 + 0.006 * beats,
      f = F0 * zoom,
      ex = 0,
      ey = CAMH,
      ez = -D;
    // the zoom centres on the gem's row, so the gem holds its place and the field rushes past it
    const gemRow = PPY - ((cy - CAMH) / D) * F0,
      py0 = gemRow + (PPY - gemRow) * zoom;
    const sunX = PPX + (f * lx) / lz,
      sunY = py0 - (f * ly) / lz;

    // ---- pass 1: luminance per cell
    const R = RB * sc,
      oxc = ex - cx,
      oyc = ey - cy,
      ozc = ez - cz,
      occ = oxc * oxc + oyc * oyc + ozc * ozc - R * R;
    for (let j = 0; j < IH; j++) {
      const vy = (py0 - (j + 0.5)) / f;
      for (let i = 0; i < IW; i++) {
        const o = j * IW + i;
        let dx = (i + 0.5 - PPX) / f,
          dy = vy,
          dz = 1;
        const il = 1 / Math.hypot(dx, dy, dz);
        dx *= il;
        dy *= il;
        dz *= il;
        // the gem
        let tHit = -1;
        const b = oxc * dx + oyc * dy + ozc * dz,
          disc = b * b - occ;
        if (disc > 0) {
          const h = Math.sqrt(disc),
            t1 = -b + h;
          let tt = Math.max(0, -b - h);
          for (let s = 0; s < 72 && tt < t1; s++) {
            const d = sd(ex + dx * tt, ey + dy * tt, ez + dz * tt);
            if (d < 0.0015) {
              tHit = tt;
              break;
            }
            tt += d * 0.92;
          }
        }
        // (the face ids are read from one last sample at the hit point, after the normal's four)
        const tG = dy < 0 ? -ey / dy : -1;
        if (tHit > 0 && (tG < 0 || tHit < tG)) {
          const px = ex + dx * tHit,
            py = ey + dy * tHit,
            pz = ez + dz * tHit,
            e = 0.0015;
          // the facet's normal from the field's gradient (a tetrahedron of samples)
          const a = sd(px + e, py - e, pz - e),
            bb = sd(px - e, py - e, pz + e),
            cc = sd(px - e, py + e, pz - e),
            dd = sd(px + e, py + e, pz + e);
          let nx = a - bb - cc + dd,
            ny = -a - bb + cc + dd,
            nz = -a + bb - cc + dd;
          const nl = 1 / (Math.hypot(nx, ny, nz) || 1);
          nx *= nl;
          ny *= nl;
          nz *= nl;
          const ndl = nx * lx + ny * ly + nz * lz;
          const lit = ndl > 0 ? ndl * shadow(px + nx * 0.01, py + ny * 0.01, pz + nz * 0.01, 10) : 0;
          // one sun; the open sky over the viewer's right shoulder as a soft fill; the sunlit plain bouncing up
          // from below: every facet turns to its own grey
          const sky = nx * FX + ny * FY + nz * FZ,
            fill = 0.08 + 0.72 * Math.max(0, sky) ** 1.2 + 0.2 * Math.max(0, -ny);
          sd(px, py, pz);
          fidI[o] = idI;
          fidT[o] = m > 0 ? idT : 0;
          lum[o] = clamp(1.2 * lit + fill + 0.22 * flash);
          kind[o] = 2;
          nrm[o * 3] = nx;
          nrm[o * 3 + 1] = ny;
          nrm[o * 3 + 2] = nz;
        } else if (tG > 0) {
          const gx = ex + dx * tG,
            gz = ez + dz * tG;
          const s = shadow(gx, 0, gz, SHK);
          let v = lerp(0.12, 0.86, s);
          // a survey grid on the plain, one cell wide on screen, laid half a square off the gem so no line runs
          // under it. The lines across the view crowd together with distance, so they stop while they are still
          // six cells apart; the lines running away from the viewer fade more slowly. Like the gem's creases they
          // are engraved in the opposite colour: ink on the sunlit plain, paper through the shadow
          const wx = (0.75 * tG) / f,
            wz = (0.75 * tG * tG) / (f * CAMH),
            ax = Math.exp(-tG / 10),
            az = clamp((AZ - tG) / 1.5);
          if (ax > 0.05) {
            const hx = gx - 0.5,
              hz = gz - 0.5,
              lxg = Math.abs(hx - Math.round(hx)),
              lzg = Math.abs(hz - Math.round(hz));
            const line = Math.max(ax * clamp(1.4 - lxg / wx), az * clamp(1.4 - lzg / wz));
            // solid, not a grey that would dither to dots
            v = lerp(v, lerp(0.8, 0.04, smooth((s - 0.3) / 0.4)), clamp(line * 1.6));
          }
          // the plain fades into the haze of the horizon (depth from light alone)
          lum[o] = lerp(v, 0.74, 1 - Math.exp(-tG / 12));
          kind[o] = 1;
        } else {
          // the sky: darker overhead, bright at the horizon and round the sun
          const cs = dx * lx + dy * ly + dz * lz;
          lum[o] = clamp(lerp(0.92, 0.42, smooth(dy / 0.55)) + 0.4 * Math.exp((cs - 1) * 9));
          kind[o] = 0;
        }
      }
    }

    // ---- pass 2: threshold against the screen-locked Bayer matrix; facet edges are engraved in the opposite
    // colour (paper on dark faces, ink on lit ones) and the silhouette in ink, as in the game; the sun and its
    // dithered halo are the one accent
    const S = surf(env),
      out = S.px,
      // for a frame either side of the loop point the engraving flips colour: the gem glints
      flip = Math.abs(wd(F, 0)) <= 1;
    const RS = 7 * zoom,
      halo = 0.3 + 0.55 * hit + 0.4 * land + beats,
      HW = 7 + 5 * hit,
      waveR = RS + 2 + WAVE * ease.outCubic(prog(wd(F, T.hit), 0, 54)),
      waveA = F >= T.hit && F < 180 ? 0.9 * (1 - smooth((F - T.hit) / 54)) : 0,
      // the loop point's smaller echo of it: born a few frames before 0 and swelling to its peak ON frame 0, so
      // the seam is mid-gesture, not a cut
      d0 = wd(F, 0),
      wave0R = RS + 1 + WAVE0 * smooth((d0 + 10) / 50),
      wave0A = d0 < -10 || d0 > 50 ? 0 : d0 < 0 ? smooth((d0 + 10) / 10) : 1 - smooth(d0 / 40),
      // and beat 3's half-size ring, which sets up the downbeat
      d3 = wd(F, 60),
      wave3R = RS + 1 + 22 * smooth((d3 + 8) / 38),
      wave3A = d3 < -8 || d3 > 36 ? 0 : d3 < 0 ? 0.55 * smooth((d3 + 8) / 8) : 0.55 * (1 - smooth(d3 / 30));
    for (let j = 0; j < IH; j++) {
      const brow = (j & 7) * 8;
      for (let i = 0; i < IW; i++) {
        const o = j * IW + i,
          thr = BAYER[brow + (i & 7)]!,
          k = kind[o]!;
        let ink = lum[o]! < thr;
        if (k === 2) {
          const r = i + 1 < IW ? o + 1 : o,
            d = j + 1 < IH ? o + IW : o;
          if (kind[r] !== 2 || kind[d] !== 2 || (i > 0 && kind[o - 1] !== 2) || (j > 0 && kind[o - IW] !== 2))
            ink = true;
          else {
            // which face set this cell engraves: the torus's past half-morph, cross-faded over a few frames through
            // the same screen-locked Bayer value, so the two sets of creases dissolve into each other (on the way
            // back the gem's creases win sooner and faster, so the closing shape never reads as a lump)
            let crease = false;
            if (m <= (F > T.back ? 0.55 + 0.1 * (thr - 0.5) : 0.5 + 0.16 * (thr - 0.5)))
              crease = fidI[o] !== fidI[r] || fidI[o] !== fidI[d];
            else {
              const a = fidT[o]!;
              for (const q of [r, d]) {
                const b = fidT[q]!;
                if (a === b) continue;
                // mid-morph, where the hole is still closed, the torus's top and inner faces fan into spokes round
                // the centre: there only a change of tube face is a crease, not a change of segment
                // (the flat top lets its radial creases back in sooner, so the hit frame is already faceted)
                const tj = a % MT;
                if (tj === b % MT && ((tj === 2 && m < 0.7) || ((tj === 3 || tj === 4) && m < 0.9))) continue;
                crease = true;
              }
            }
            // on the glint (frames 239, 0, 1) every crease is ink, so the brightened faces keep whole lines
            if (crease) ink = flip ? true : lum[o]! > 0.42;
          }
          out[o] = ink ? INK : PAPER;
          continue;
        }
        // the sun and its halo (never over the gem)
        const sx = i + 0.5 - sunX,
          sy = j + 0.5 - sunY,
          dist = Math.hypot(sx, sy);
        if (dist < RS) {
          out[o] = RED;
          continue;
        }
        const red =
          waveA * Math.exp(-(((dist - waveR) / 3.2) ** 2)) +
          wave0A * Math.exp(-(((dist - wave0R) / 3.2) ** 2)) +
          wave3A * Math.exp(-(((dist - wave3R) / 2.6) ** 2)) +
          halo * Math.exp(-(dist - RS) / HW);
        if (red > thr) {
          out[o] = RED;
          continue;
        }
        out[o] = ink ? INK : PAPER;
      }
    }
    S.lay.ctx.putImageData(S.img, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(S.lay.canvas, 0, 0, W * env.scale, H * env.scale);
  };

  const cuts = [T.turn, T.hit, T.back, N],
    names = ["turn", "morph", "return"];
  const shots: Shot[] = names.map((sid, i) => ({
    id: sid,
    start: cuts[i]!,
    end: cuts[i + 1]!,
    // no motion blur: averaging sub-frames of a two-colour image manufactures greys and breaks the one-bit rule;
    // at 60 fps the screen-locked pattern carries the motion on its own (the shimmer IS the motion blur here)
    draw: (ctx, local, env) => paint(ctx, env, cuts[i]! + local),
  }));
  return {
    meta: { title: id, W, H, fps: FPS, bpm: BPM, durationFrames: N, raster: "cpu" },
    assets: { images: {}, fonts: P.assets },
    shots,
    audio: score,
  };
}

// ---- sound: the soft beat score as a quiet bed (key 5: D minor, Dm then B♭), a gentle band-limited square
// pluck arpeggio in sixteenths with a dotted-eighth echo, a held square-ish pad that crosses both bar lines (the
// bed's pad breathes out at each bar, deepest at the wrap), an accent on sample 0, a tick that sets up beat 3,
// and a low thump on frame 120. Every cue writes through a wrapping add, so tails cross the seam.
const BASE_GAIN = 0.24,
  OUT = 0.58;
const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
function score(sr: number): [Float32Array, Float32Array] {
  const [Lc, Rc] = beatScore({ frames: N, fps: FPS, bpm: BPM, mood: "soft", key: 5, loop: true, gain: BASE_GAIN })(sr);
  const n = Lc.length,
    at = (f: number) => Math.round((f / FPS) * sr),
    noise = rng(5959);
  // the bed ducks under the hit and breathes back in (a closed-form sidechain, back to 1 long before the wrap)
  for (let i = at(T.hit); i < n; i++) {
    const d = 1 - 0.55 * Math.exp(-(i - at(T.hit)) / (0.2 * sr));
    Lc[i] = Lc[i]! * d;
    Rc[i] = Rc[i]! * d;
  }
  const add = (i: number, v: number, pan: number) => {
    i = ((i % n) + n) % n;
    Lc[i] = Lc[i]! + v * (1 - pan);
    Rc[i] = Rc[i]! + v * pan;
  };
  // a soft square: odd harmonics up to the 9th, rolled off, so it reads 8-bit without any fizz
  const sq = (ph: number) =>
    Math.sin(TAU * ph) +
    Math.sin(3 * TAU * ph) / 4 +
    Math.sin(5 * TAU * ph) / 9 +
    Math.sin(7 * TAU * ph) / 18 +
    Math.sin(9 * TAU * ph) / 32;
  const pluck = (i0: number, midi: number, vel: number, pan: number, decay = 13) => {
    const fr = hz(midi);
    for (let k = 0, len = Math.round(0.45 * sr); k < len; k++) {
      const t = k / sr;
      add(i0 + k, sq(fr * t) * Math.exp(-t * decay) * Math.min(1, t / 0.003) * vel, pan);
    }
  };
  // the arpeggio: D minor for bar 1, B♭ for bar 2 (the bed's chords at key 5), up and back over two octaves
  const CH = [
    [62, 65, 69],
    [58, 62, 65],
  ];
  const ORDER = [0, 1, 2, 3, 4, 3, 2, 1];
  for (let s = 0; s < 32; s++) {
    const ch = CH[s < 16 ? 0 : 1]!,
      step = ORDER[s % 8]!,
      midi = ch[step % 3]! + 12 * (1 + Math.floor(step / 3)),
      i0 = Math.round((s * sr) / 8),
      accent = s === 0 || s === 16 ? 1.6 : s % 4 === 0 ? 1.15 : 0.8,
      pan = 0.5 + 0.28 * Math.sin((s * TAU) / 8);
    pluck(i0, midi, 0.05 * accent, pan);
    pluck(i0 + Math.round(0.375 * sr), midi, 0.016 * accent, 1 - pan); // the echo, a dotted eighth later
  }
  // a held pad of soft squares a fifth apart, an octave down, that crosses each bar line (wraps at the seam)
  for (let bar = 0; bar < 2; bar++) {
    const root = CH[bar]![0]! - 12,
      i0 = bar * Math.round(2 * sr) - Math.round(0.5 * sr), // starts a beat early: no hole at the bar
      len = Math.round(2.75 * sr);
    for (const [midi, pan] of [
      [root, 0.35],
      [root + 7, 0.65],
    ] as const) {
      const fr = hz(midi);
      for (let k = 0; k < len; k++) {
        const t = k / sr,
          env = smooth(t / 0.22) * smooth((len - k) / (0.3 * sr));
        add(i0 + k, sq(fr * t * 1.002) * env * 0.11, pan);
      }
    }
  }
  // the loop point lands: a low soft square note and a felt tap on sample 0 (its tail runs on past the seam;
  // nothing is written before it, so 239 → 0 is the note's own attack)
  pluck(0, 50, 0.14, 0.5, 6);
  {
    let tp = 0;
    for (let k = 0; k < Math.round(0.35 * sr); k++) {
      const t = k / sr;
      tp += (55 + 60 * Math.exp(-t / 0.03)) / sr;
      add(k, Math.sin(TAU * tp) * Math.exp(-t / 0.11) * Math.min(1, t / 0.002) * 0.62, 0.5);
    }
  }
  // the set-up on beat 3: a quick rising two-note blip
  pluck(at(60), 81, 0.09, 0.6, 16);
  pluck(at(60) + Math.round(0.0625 * sr), 86, 0.08, 0.4, 16);
  {
    let tp = 0;
    for (let k = 0; k < Math.round(0.25 * sr); k++) {
      const t = k / sr;
      tp += (70 + 50 * Math.exp(-t / 0.025)) / sr;
      add(at(60) + k, Math.sin(TAU * tp) * Math.exp(-t / 0.07) * Math.min(1, t / 0.002) * 0.55, 0.5);
    }
  }
  // a pickup into the loop point (A, C, D, leaning on the low D at sample 0), so the last beat does not breathe out
  pluck(at(225), 69, 0.075, 0.4, 8);
  pluck(at(232.5), 72, 0.08, 0.6, 8);
  pluck(at(236.25), 74, 0.07, 0.5, 9);
  // and a soft swell of the D and A that rises through the last beat into the seam (written at negative indices,
  // so it wraps onto the end of the loop) and hands over to the note on sample 0
  for (const [midi, pan] of [
    [62, 0.4],
    [69, 0.6],
  ] as const) {
    const len = Math.round(0.45 * sr),
      fr = hz(midi);
    // it peaks on sample 0 and dies away over the next 0.2 s, so the join has no release in it
    for (let k = 0; k < len + Math.round(0.25 * sr); k++) {
      const t = k / sr,
        env = k < len ? (k / len) ** 2 : Math.exp(-(k - len) / (0.06 * sr));
      add(k - len, sq(fr * t) * env * 0.2, pan);
    }
  }
  // the thump on 120: a pitch-dropping sine (about 120 to 40 Hz) with a felt-soft attack…
  const h0 = at(T.hit);
  let ph = 0;
  for (let k = 0; k < Math.round(1.2 * sr); k++) {
    const t = k / sr;
    ph += (40 + 80 * Math.exp(-t / 0.04)) / sr;
    const body = Math.sin(TAU * ph) + 0.3 * Math.sin(2 * TAU * ph) * Math.exp(-t / 0.1);
    add(h0 + k, body * Math.exp(-t / 0.3) * Math.min(1, t / 0.002) * 0.95, 0.5);
  }
  // …a short dark thud so it still reads on a phone speaker, and a falling square chirp, the morph's own sound
  let th = 0;
  const a3 = 1 - Math.exp((-TAU * 800) / sr);
  for (let k = 0; k < Math.round(0.16 * sr); k++) {
    th += a3 * (noise() * 2 - 1 - th);
    add(h0 + k, th * Math.exp(-k / (0.045 * sr)) * 1.6, 0.5);
  }
  let cp = 0;
  for (let k = 0, len = Math.round(0.5 * sr); k < len; k++) {
    const t = k / sr;
    cp += hz(86 - 24 * (1 - Math.exp(-t / 0.12))) / sr;
    add(h0 + k, sq(cp) * Math.exp(-t * 7) * Math.min(1, t / 0.004) * 0.05, 0.5 + 0.2 * Math.sin(TAU * 3 * t));
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

export const oneBit = make("square", "oneBit");
export const oneBitVertical = make("vertical", "oneBitVertical");
