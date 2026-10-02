// STUDY 58 · FLOW FIELD (4 s, 60 fps, a seamless loop). The pilot of the SECONDS family: no words, the style is
// the whole piece. A few thousand fine strands of ink pour across warm paper along an angle field made from layered
// smooth noise, like a pen plotter; at the bar-2 downbeat the field inside a hidden circle turns into a vortex, the
// strands curl round and reveal the circle by their flow alone, and then it relaxes back into the stream.
// One source, designed for square (the hero) and vertical (the stream turns to fall down the tall frame).
// Brief: series/studies/briefs/flow-field.json · prompt: series/studies/prompts/flow-field.prompt.md
// Technique after Tyler Hobbs's essay on flow fields (https://www.tylerxhobbs.com/words/flow-fields).
//
// A flow field is drawn, not simulated. Every strand is traced FRESH each frame from a seeded start point through
// the field for a fixed number of steps, so nothing carries from one frame to the next. The field loops in time:
// a static base (core.ts fractal) plus a moving part from a gradient noise whose third axis is time and wraps
// (z = t·PZ on a lattice of period PZ, the same closed path as sampling noise on a circle, cos 2πt / sin 2πt), so
// frame 240 is frame 0. Each strand shows a window [tail, head] along its trace that slides on a periodic schedule
// (u = frac(k·t + φ), k whole), so strands draw on and wipe off forever without a seam. The vortex strength, the
// camera and the sound are functions of the frame with the same period.
import PACK from "../../../brand/packs/studio/pack.json";
import { fractal, rng, type Ctx, type Env, type Layer } from "../core";
import type { Film, Shot } from "../film";
import { bezier, clamp, ease, lerp, prog } from "../kit/motion";
import { usePack } from "../kit/pack";
import { beatScore } from "../kit/score";
import { layout, type Size } from "../kit/sizes";

const P = usePack(PACK),
  C = P.palette("flow");
const FPS = 60,
  BPM = 120,
  N = 240, // two bars: a beat is 30 frames, bar 2's downbeat is frame 120
  TAU = Math.PI * 2;
// the story, in frames (each on the beat grid)
const T = { pour: 0, curl: 90, hit: 120, relax: 150 };

// ---- a gradient noise whose z axis wraps with an integer period (time on a closed path)
const PERM = (() => {
  const r = rng(5858),
    p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [p[i], p[j]] = [p[j]!, p[i]!];
  }
  const o = new Uint8Array(512);
  for (let i = 0; i < 512; i++) o[i] = p[i & 255]!;
  return o;
})();
const GX = [1, -1, 1, -1, 1, -1, 1, -1, 0, 0, 0, 0],
  GY = [1, 1, -1, -1, 0, 0, 0, 0, 1, -1, 1, -1],
  GZ = [0, 0, 0, 0, 1, 1, -1, -1, 1, 1, -1, -1];
const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
function noise3(x: number, y: number, z: number, pz: number) {
  const X = Math.floor(x),
    Y = Math.floor(y),
    Z = Math.floor(z);
  const fx = x - X,
    fy = y - Y,
    fz = z - Z,
    z0 = ((Z % pz) + pz) % pz,
    z1 = (z0 + 1) % pz;
  const g = (ix: number, iy: number, iz: number, dx: number, dy: number, dz: number) => {
    const h = PERM[PERM[PERM[ix & 255]! + (iy & 255)]! + iz]! % 12;
    return GX[h]! * dx + GY[h]! * dy + GZ[h]! * dz;
  };
  const u = fade(fx),
    v = fade(fy),
    w = fade(fz);
  const a = lerp(g(X, Y, z0, fx, fy, fz), g(X + 1, Y, z0, fx - 1, fy, fz), u),
    b = lerp(g(X, Y + 1, z0, fx, fy - 1, fz), g(X + 1, Y + 1, z0, fx - 1, fy - 1, fz), u),
    c = lerp(g(X, Y, z1, fx, fy, fz - 1), g(X + 1, Y, z1, fx - 1, fy, fz - 1), u),
    d = lerp(g(X, Y + 1, z1, fx, fy - 1, fz - 1), g(X + 1, Y + 1, z1, fx - 1, fy - 1, fz - 1), u);
  return lerp(lerp(a, b, v), lerp(c, d, v), w);
}

// ---- the vortex: a faint eddy sets itself up from frame 48 (so the curl is prepared, not switched on), the curl
// accelerates into the downbeat (the pen speeds into the hit), holds a beat, then relaxes back to 0 well before
// the loop wraps
const CURL = bezier(0.5, 0, 0.82, 1);
// the field starts to let go two-thirds of a beat after the hit (inside the curl beat; the relax section is named
// from 150), so the hold after the downbeat never sits still
const RELAX = 140;
const vortex = (F: number) => {
  if (F < 48) return 0;
  if (F < T.hit) return 0.15 * ease.inOutCubic(prog(F, 48, 72)) + 0.85 * CURL(prog(F, 84, T.hit));
  if (F < RELAX) return 1;
  // the relax lingers around half strength, where the rings break one by one from the rim inward (a plain
  // ease-in-out crosses that threshold in a few frames and the circle blinks out): its slope is 0 at both ends
  // and 0.3 in the middle
  const p = prog(F, RELAX, 230);
  return 1 - (p - (0.15 * Math.sin(TAU * p)) / TAU - (0.85 * Math.sin(2 * TAU * p)) / (2 * TAU));
};
// the circle's size follows the vortex's strength both ways: it grows in place from a third of its size as the
// curl builds and contracts round its centre as it relaxes, so the eddy and the saddle that comes with it start
// and end as a point inside the clear band instead of sliding or tilting
const grow = (v: number) => 0.35 + 0.65 * v;
// the blue current's landing on frame 0: a short pulse, about a sixth of a second wide, wrapped round the seam
const pulse0 = (F: number) => {
  const d = Math.min(F, N - F);
  return Math.exp(-((d / 9) ** 2));
};
// after the hit the circle settles like a struck drumhead: it tightens, rebounds and tightens again, decaying
// over about a second (0 before the hit and windowed to exactly 0 long before the wrap)
const settle = (F: number) => {
  const d = (F - T.hit + 1) / FPS;
  return d > 0 ? Math.exp(-d * 2.4) * Math.sin(TAU * 1.5 * d) * (1 - ease.inOutCubic(prog(F, 180, 232))) : 0;
};
// the impact on the downbeat: a near-instant rise and a soft decay (0 before the hit, so frame 0 is untouched)
const punch = (F: number) => {
  const d = (F - T.hit + 1) / FPS; // one frame early, so frame 120 itself carries the hit
  // (windowed to exactly 0 well before the loop wraps, so frame 239 meets frame 0 with nothing left over)
  return d > 0 ? (1 - Math.exp(-d * 45)) * Math.exp(-d * 4.5) * (1 - ease.inOutCubic(prog(F, 180, 232))) : 0;
};

// ---- palette roles for strands
type Ink = "ink" | "accent" | "accent2" | "s1";
const INKS: Ink[] = ["ink", "accent", "accent2", "s1"];
const HEX: Record<Ink, string> = { ink: C.ink, accent: C.accent, accent2: C.accent2, s1: C.s1! };

type Strand = {
  x: number;
  y: number;
  ds: number; // step length, px
  len: number; // trace length, steps
  w: number; // line width, px
  a: number; // opacity
  ink: number; // index into INKS
  k: number; // cycles per loop (whole, so the schedule wraps)
  phi: number; // phase
  j: number; // jitter (vortex strands: frames of offset)
  j2: number;
  h: number; // a per-strand hash: each strand meets the rim at its own radius, so the rim never stacks into a line
  short?: boolean; // a short coloured vortex arc
};

export function make(size: Size, id: string): Film {
  const L = layout(size),
    { W, H, u } = L,
    tall = L.tall;
  // per-size design: the square's stream pours left to right; the vertical's falls down the tall frame and the
  // hidden circle sits a little high, clear of the feed's top and bottom bands
  const BIAS = tall ? 1.25 : 0.32,
    VX = W / 2,
    VY = tall ? H * 0.43 : H / 2,
    R0 = (tall ? 336 : 318) * u,
    SPIN = tall ? -1 : 1,
    BX = Math.cos(BIAS),
    BY = Math.sin(BIAS);
  const M = 170 * u, // the field extends past the frame so strands pour in from outside
    G = 9 * u, // field grid spacing
    X0 = -M,
    Y0 = -M,
    GW = Math.ceil((W + 2 * M) / G) + 2,
    GH = Math.ceil((H + 2 * M) / G) + 2;
  const PZ = 2; // the moving field passes through two noise cells per loop

  // the static base angle: computed once (a constant of the design, not state)
  const base = new Float32Array(GW * GH);
  for (let gy = 0; gy < GH; gy++)
    for (let gx = 0; gx < GW; gx++) {
      const nx = (X0 + gx * G) / (1080 * u),
        ny = (Y0 + gy * G) / (1080 * u);
      base[gy * GW + gx] = BIAS + 3.4 * (fractal(58, nx, ny, 1.55, 1.55, 3) - 0.5) * 2;
    }
  const ang = new Float32Array(GW * GH);
  const fieldAt = (t: number) => {
    const z = t * PZ;
    for (let gy = 0; gy < GH; gy++)
      for (let gx = 0; gx < GW; gx++) {
        const nx = (X0 + gx * G) / (1080 * u),
          ny = (Y0 + gy * G) / (1080 * u);
        const m = noise3(nx * 1.6, ny * 1.6, z, PZ) + 0.45 * noise3(nx * 3.3 + 17.3, ny * 3.3 + 5.1, z + 0.5, PZ);
        ang[gy * GW + gx] = base[gy * GW + gx]! + 1.15 * m;
      }
  };

  // ---- the strands: seeds, colours and schedules are constants drawn once from rng
  const r = rng(5801);
  const pick = (w: number[]) => {
    let x = r() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < w.length; i++) if ((x -= w[i]!) <= 0) return i;
    return 0;
  };
  const area = (W + 2 * M) * (H + 2 * M),
    perPx = 1 / (1080 * 1080);
  const back: Strand[] = [],
    front: Strand[] = [],
    curl: Strand[] = [];
  for (let i = 0, n = Math.round(1000 * area * perPx); i < n; i++)
    back.push({
      x: X0 + r() * (W + 2 * M),
      y: Y0 + r() * (H + 2 * M),
      ds: 5 * u,
      len: 40 + r() * 50,
      w: (0.75 + r() * 0.25) * u,
      a: 0.2 + r() * 0.1,
      ink: pick([0.93, 0, 0.07, 0]),
      k: 1,
      phi: r(),
      j: 0,
      j2: 0,
      h: r(),
    });
  for (let i = 0, n = Math.round(1150 * area * perPx); i < n; i++) {
    const ink = pick([0.82, 0.05, 0.1, 0.03]);
    // the blue current lands on frame 0: its strands share a phase, so their pens set down together just before
    // the seam and race out across it
    const phi = ink === 2 ? 0.03 + r() * 0.025 : r();
    front.push({
      x: X0 + r() * (W + 2 * M),
      y: Y0 + r() * (H + 2 * M),
      ds: 5 * u,
      len: (55 + r() * 70) * (ink === 2 ? 1.4 : 1),
      w: (1.05 + r() * 0.85) * u * (tall ? 1.2 : 1),
      a: 0.38 + r() * 0.2,
      ink,
      k: ink === 2 ? 1 : r() < 0.35 ? 2 : 1,
      phi,
      j: 0,
      j2: 0,
      h: r(),
    });
  }
  // the vertical's falling stream needs a direction you can read at phone size: two darker currents, each a tight
  // bundle of long strands seeded together upstream, so they braid down the tall frame
  if (tall)
    for (const [cx0, cy0] of [
      [0.3, -0.05],
      [0.88, 0.02],
    ] as const)
      for (let i = 0; i < 46; i++)
        front.push({
          x: W * cx0 + (r() - 0.5) * 70 * u, // (the right one enters wide, so it does not feed the rim head-on)
          y: H * cy0 + (r() - 0.5) * 70 * u,
          ds: 5 * u,
          len: 180 + r() * 120,
          w: (1.3 + r() * 0.6) * u,
          a: 0.42 + r() * 0.2,
          ink: 0,
          k: 1,
          phi: i / 46 + r() * 0.02,
          j: 0,
          j2: 0,
          h: r(),
        });
  for (let i = 0; i < 340; i++) {
    const short = r() < 0.15,
      rho = R0 * (0.1 + 0.88 * Math.sqrt(r())),
      th = r() * TAU,
      ds = 6 * u;
    curl.push({
      x: VX + Math.cos(th) * rho,
      y: VY + Math.sin(th) * rho,
      ds,
      // about one in seven is a short bold arc in colour (a quarter to two fifths of a turn), so the orbit shows as
      // marks travelling round rather than as rings sliding along themselves
      len: Math.min(300, ((short ? 0.25 + r() * 0.15 : 0.55 + r() * 0.4) * TAU * rho) / ds),
      w: (short ? 1.4 + r() * 0.6 : 0.8 + r() * 0.8) * u,
      a: short ? 0.55 + r() * 0.2 : 0.3 + r() * 0.25,
      ink: short ? pick([0, 0.75, 0.25, 0]) : pick([0.8, 0.14, 0, 0.06]),
      k: 1,
      phi: 0,
      j: r() * 12,
      short,
      // the relax unspools the small rings first, so the eye empties before the rim
      j2: 20 * (rho / R0) - 4 + r() * 6,
      h: r(),
    });
  }

  // ---- the direction at a point: the gridded field, deflected round the circle outside and blended into the
  // vortex inside. A field that does not turn (winding 0 round the circle) cannot become one that does (winding 1)
  // without either a zero or a tear: blending ANGLES tears (a seam where a part-turn jumps by w·2π), blending
  // VECTORS leaves a zero, which is exactly the stagnation point a real vortex in a stream has. So the inside
  // blends vectors, and the field's speed is kept: strands slow to a stop at the stagnation point instead of
  // being cut or knotted there.
  let V = 0,
    VW = 0,
    R = R0,
    rimK = 1,
    wakeOn = false,
    leeOn = false,
    outside = -1,
    dx = 0,
    dy = 0,
    sp = 1,
    lv = 1;
  const dir = (x: number, y: number) => {
    let fx = (x - X0) / G,
      fy = (y - Y0) / G;
    fx = clamp(fx, 0, GW - 1.001);
    fy = clamp(fy, 0, GH - 1.001);
    const ix = fx | 0,
      iy = fy | 0,
      tx = fx - ix,
      ty = fy - iy,
      o = iy * GW + ix;
    let a = lerp(lerp(ang[o]!, ang[o + 1]!, tx), lerp(ang[o + GW]!, ang[o + GW + 1]!, tx), ty);
    if (V > 0.001) {
      const ox = x - VX,
        oy = y - VY,
        d = Math.hypot(ox, oy) || 1,
        Rr = R * rimK;
      if (d < Rr * 1.25) {
        const rx = ox / d,
          ry = oy / d;
        if (d > Rr * 0.9) {
          // round the stone: cylinder flow. A stream heading in has its radial part shrunk by R²/d² and its
          // tangential part grown by the same, on whichever side it already leans, so at full strength nothing
          // crosses the rim (and none can curl in against the spin); one heading out is left alone, so the lee
          // side keeps no dark wake
          const c = Math.cos(a),
            sn = Math.sin(a),
            vr = c * rx + sn * ry;
          if (vr < 0) {
            const e = (d - Rr) / (Rr * 0.25),
              rise = clamp((d - Rr * 0.9) / (Rr * 0.1)),
              w = V * (e <= 0 ? rise * rise * (3 - 2 * rise) : (1 - e) * (1 - e)),
              q = w * Math.min(1, (Rr * Rr) / (d * d)),
              vt = -c * ry + sn * rx,
              vr2 = vr * (1 - q),
              vt2 = vt * (1 + q);
            lv = Math.min(lv, Math.hypot(vr2, vt2));
            a = Math.atan2(vr2 * ry + vt2 * rx, vr2 * rx - vt2 * ry);
          }
        }
        if (d < Rr) {
          // inside: blend toward the tangent (leaning a touch inward, so the rings are a slow spiral)
          // while the vortex is weak (forming or dying) the tangent hands over across a wider band, so where it
          // meets the stream there is a bend, not a crease
          const wb = lerp(0.35, 0.16, clamp((V - 0.2) / 0.4)),
            s = (d - Rr * (1 - wb)) / (Rr * wb),
            w = V * (s <= 0 ? 1 : 1 - s * s * (3 - 2 * s)),
            ta = Math.atan2(SPIN * rx, -SPIN * ry) + SPIN * 0.035,
            vx = lerp(Math.cos(a), Math.cos(ta), w),
            vy = lerp(Math.sin(a), Math.sin(ta), w),
            l = Math.hypot(vx, vy);
          sp = Math.min(1, l / 0.4);
          lv = Math.min(lv, l);
          if (l > 1e-6) a = Math.atan2(vy, vx);
        }
      }
    }
    dx = Math.cos(a);
    dy = Math.sin(a);
  };

  // trace a strand from its seed (midpoint steps, so circles hold) and stroke the window [tail, head]
  const PX = new Float32Array(1024),
    PY = new Float32Array(1024),
    LS = new Float32Array(1024);
  const lo = -M * 0.9,
    hiX = W + M * 0.9,
    hiY = H + M * 0.9;
  const stroke = (
    ctx: Ctx,
    s: Strand,
    tail: number,
    head: number,
    alpha = s.a,
    width = s.w,
    maxTurn = 3 * Math.PI,
    x = s.x,
    y = s.y,
  ) => {
    if (head - tail < 0.05 || alpha < 0.004) return;
    const n = Math.min(Math.ceil(head), 1023);
    let m = 0;
    PX[0] = x;
    PY[0] = y;
    rimK = 1 + 0.08 * (s.h - 0.5);
    LS[0] = 1;
    let px = 0,
      py = 0,
      turn = 0;
    for (let i = 1; i <= n; i++) {
      sp = 1;
      lv = 9;
      dir(x, y);
      const mx = x + dx * s.ds * 0.5 * sp,
        my = y + dy * s.ds * 0.5 * sp;
      sp = 1;
      dir(mx, my);
      // a turn sharper than about 40 degrees a step is an eddy smaller than any ring we draw, and a stream strand
      // caught in an eddy makes at most a turn and a half (past that it would only darken a ring): lift the pen
      if (i > 1 && (dx * px + dy * py < 0.77 || (turn += Math.abs(dx * py - dy * px)) > maxTurn)) break;
      px = dx;
      py = dy;
      x += dx * s.ds * sp;
      y += dy * s.ds * sp;
      PX[i] = x;
      PY[i] = y;
      LS[i] = lv;
      m = i;
      if (x < lo || y < lo || x > hiX || y > hiY) break;
      if (outside >= 0 && Math.hypot(x - VX, y - VY) > R * 1.02 && --outside < 0) break;
    }
    head = Math.min(head, m);
    if (head - tail < 0.05) return;
    if (V > 0.01 || ((wakeOn || leeOn) && VW > 0.01)) {
      // style the vortex's company by looking along the visible trace: a strand thins into the stagnation point
      // (the saddle every vortex in a stream has) instead of outlining it; a stream strand that funnels at the
      // windward rim, hugs the rim for long, or runs through the lee band behind the circle is thinned too,
      // because there the darkness is only overlap
      let lmin = 9,
        dmin = 9,
        dall = 9,
        hug = 0,
        lee = 0;
      const i0 = Math.floor(tail),
        i1 = Math.min(m, Math.ceil(head));
      for (let i = i0; i <= i1; i++) {
        lmin = Math.min(lmin, LS[i]!);
        if (!wakeOn && !leeOn) continue;
        const ox = PX[i]! - VX,
          oy = PY[i]! - VY,
          d = Math.hypot(ox, oy) / R,
          along = (ox * BX + oy * BY) / R0,
          across = (-ox * BY + oy * BX) / R0;
        if (along < 0.2) dmin = Math.min(dmin, d);
        dall = Math.min(dall, d);
        if (d > 1.03 && d < 1.1) hug++;
        const k = clamp((along - 0.5) / 0.7);
        lee = Math.max(lee, k * k * (3 - 2 * k) * Math.exp(-((across / 0.85) ** 2)));
      }
      const slow = clamp((lmin - 0.08) / 0.32);
      alpha *= lerp(1, slow * slow * (3 - 2 * slow), V);
      // the lee is thinned by COUNT, not by alpha: a hashed share of the strands passing through it fade out
      // (each over a narrow band of the threshold, so none pops) and the survivors keep full ink, a little finer.
      // The vortex strands unspool into the same lee, so they are thinned there too.
      if (wakeOn || leeOn) {
        const thin = 0.85 * VW * lee,
          keep = clamp((((s.h * 7.31) % 1) - thin) / 0.12);
        alpha *= keep * keep * (3 - 2 * keep);
        width *= 1 - 0.35 * thin;
      }
      if (wakeOn) {
        const near = clamp((dmin - 1.05) / 0.5);
        alpha *= 1 - 0.7 * V * (1 - near * near * (3 - 2 * near));
        if (hug > 20) alpha *= 1 - 0.55 * V * clamp((hug - 20) / 20);
        // a coloured stream strand that passes the disc would hang off it as a saturated string: near the
        // vortex the colour is the vortex's alone
        if (s.ink !== 0) {
          const far = clamp((dall - 1.1) / 0.4);
          alpha *= 1 - 0.8 * clamp((V - 0.2) / 0.3) * (1 - far * far * (3 - 2 * far));
        }
      }
      if (alpha < 0.004) return;
    }
    const t0 = Math.floor(tail),
      h0 = Math.floor(head);
    const at = (f: number, i: number) => [
      lerp(PX[i]!, PX[Math.min(i + 1, m)]!, f),
      lerp(PY[i]!, PY[Math.min(i + 1, m)]!, f),
    ];
    ctx.beginPath();
    const [ax, ay] = at(tail - t0, t0);
    ctx.moveTo(ax!, ay!);
    for (let i = t0 + 1; i <= h0; i++) ctx.lineTo(PX[i]!, PY[i]!);
    const [bx, by] = at(head - h0, h0);
    ctx.lineTo(bx!, by!);
    ctx.lineWidth = width;
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = HEX[INKS[s.ink]!];
    ctx.stroke();
  };
  // the stream's schedule: the pen sets down, runs its trace, and the tail chases it off (both ends ease)
  const flow = (ctx: Ctx, s: Strand, t: number, F: number) => {
    const p = (((s.k * t + s.phi) % 1) + 1) % 1;
    wakeOn = true;
    if (s.ink === 2) {
      // the blue current races out from its seeds across frame 0, blooms on the downbeat, and is wiped off by the
      // time the curl begins, so it never competes with the vermilion
      const head = s.len * ease.outCubic(clamp(p / 0.25)),
        tail = s.len * ease.inOutCubic(clamp((p - 0.28) / 0.2)),
        bloom = pulse0(F);
      stroke(ctx, s, tail, head, Math.min(1, s.a * (0.7 + 1.1 * bloom)), s.w * (1 + 0.9 * bloom));
      wakeOn = false;
      return;
    }
    const head = s.len * ease.inOutCubic(clamp(p / 0.72)),
      tail = s.len * ease.inOutCubic(clamp((p - 0.28) / 0.72));
    stroke(ctx, s, tail, head, s.a * Math.sin(Math.PI * p) ** 0.6);
    wakeOn = false;
  };
  // the vortex strands: drawn on through the curl, complete on the downbeat, unspooled as the field relaxes
  const SWEEP = bezier(0.42, 0, 0.78, 1);
  // the seeds orbit the centre (fast while the vortex forms, slowing after the hit), so the gaps between the
  // partial arcs visibly go round: a vortex turning, not a record pasted on
  const ORBIT = bezier(0.3, 0.3, 0.4, 1);
  const curlStroke = (ctx: Ctx, s: Strand, F: number) => {
    if (F < 84 || F > 238) return;
    const j2 = s.short ? s.j2 - 10 : s.j2, // the short bold arcs leave first, so none outlives the disc
      head = s.len * SWEEP(prog(F, 86 + s.j, T.hit)),
      tail = s.len * ease.inOutCubic(prog(F, T.relax + j2, 220 + j2));
    // a fragment shorter than about a twentieth of a turn reads as a fleck, not an arc
    if ((head - tail) * s.ds < 0.05 * TAU * Math.hypot(s.x - VX, s.y - VY)) return;
    // (the short coloured arcs ride faster, a steady extra whole turn, so after the hit they keep travelling)
    const th = SPIN * TAU * (0.6 * ORBIT(prog(F, 86, 238)) + (s.short ? 1 * ease.inOutCubic(prog(F, 96, 236)) : 0)),
      g = grow(V) * (1 - 0.06 * settle(F)),
      c = Math.cos(th) * g,
      sn = Math.sin(th) * g,
      ox = s.x - VX,
      oy = s.y - VY,
      sx = VX + c * ox - sn * oy,
      sy = VY + sn * ox + c * oy;
    // as it relaxes the rings thin out and may turn less, so they unspool rather than knot
    const relax = F > T.relax,
      fadeA = relax ? 0.25 + 0.75 * V : 1,
      turns = relax && V < 0.7 ? TAU * (0.6 + V) : 99;
    // the downbeat lands in colour: the vermilion and amber threads are held back while the pen sweeps, then
    // flare full and heavy on frame 120 and settle
    const warm = s.ink === 1 || s.ink === 3,
      flare = warm ? punch(F) : 0,
      a = warm ? Math.min(1, s.a * (0.55 + 1.3 * flare)) : s.a;
    leeOn = relax;
    // while the vortex is strong its strands lift at the rim instead of leaking out along the stream (a coloured
    // string hanging off the disc); as it weakens each may run a growing, per-strand number of steps past the rim,
    // so they unspool into the flow and their ends land irregularly, never on a cut circle
    outside = Math.floor(260 * (1 - V) * (0.3 + s.h));
    stroke(ctx, s, tail, head, a * fadeA, s.w * (1 + 0.8 * flare), turns, sx, sy);
    leeOn = false;
    outside = -1;
  };

  // ---- paper: warm ground, a faint seeded fibre speckle and a soft fall of light (cached once per size)
  const paper = (env: Env): Layer => {
    const pw = Math.round(W * env.scale),
      ph = Math.round(H * env.scale),
      key = `flowField:paper:${pw}x${ph}`;
    let lay = env.cache.get(key) as Layer | undefined;
    if (lay) return lay;
    lay = env.canvas(pw, ph);
    const c = lay.ctx,
      q = rng(9058);
    c.setTransform(env.scale, 0, 0, env.scale, 0, 0);
    c.fillStyle = C.ground;
    c.fillRect(0, 0, W, H);
    const g = c.createRadialGradient(VX, VY, 0, VX, VY, Math.hypot(W, H) * 0.62);
    g.addColorStop(0, "rgba(255,250,242,0.75)");
    g.addColorStop(0.55, "rgba(255,250,242,0.2)");
    g.addColorStop(1, "rgba(138,133,123,0.12)");
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
    c.lineCap = "round";
    for (let i = 0, n = Math.round((W * H) / 420); i < n; i++) {
      const x = q() * W,
        y = q() * H,
        a = q() * TAU,
        l = (3 + q() * 11) * u,
        b = (q() - 0.5) * 0.8;
      c.beginPath();
      c.moveTo(x, y);
      c.quadraticCurveTo(
        x + Math.cos(a + b) * l * 0.5,
        y + Math.sin(a + b) * l * 0.5,
        x + Math.cos(a) * l,
        y + Math.sin(a) * l,
      );
      c.lineWidth = (0.4 + q() * 0.5) * u;
      c.strokeStyle = q() < 0.7 ? C.muted : C.surface;
      c.globalAlpha = 0.05 + q() * 0.08;
      c.stroke();
    }
    for (let i = 0, n = Math.round((W * H) / 260); i < n; i++) {
      c.globalAlpha = 0.04 + q() * 0.07;
      c.fillStyle = q() < 0.8 ? C.muted : C.ink;
      const s = (0.4 + q() * 0.9) * u;
      c.fillRect(q() * W, q() * H, s, s);
    }
    c.globalAlpha = 1;
    env.cache.set(key, lay);
    return lay;
  };

  const paint = (ctx: Ctx, env: Env, F: number) => {
    F = ((F % N) + N) % N; // the shutter may sample either side of the seam
    const t = F / N;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.drawImage(paper(env).canvas, 0, 0);
    fieldAt(t);
    V = vortex(F);
    VW = Math.max(V, vortex((F + N - 24) % N)); // the wake outlives the vortex by a beat (wrapped)
    const kick = punch(F);
    R = R0 * grow(V) * (1 - 0.06 * settle(F));
    // camera: a push-in that rides the vortex and a snap on the downbeat, about the hidden circle
    const cam = 1 + 0.012 * V + 0.03 * kick;
    ctx.setTransform(env.scale * cam, 0, 0, env.scale * cam, env.scale * VX * (1 - cam), env.scale * VY * (1 - cam));
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const s of back) flow(ctx, s, t, F);
    for (const s of front) flow(ctx, s, t, F);
    for (const s of curl) curlStroke(ctx, s, F);
    ctx.globalAlpha = 1;
  };

  const cuts = [T.pour, T.curl, T.relax, N],
    names = ["pour", "curl", "relax"];
  const shots: Shot[] = names.map((sid, i) => ({
    id: sid,
    start: cuts[i]!,
    end: cuts[i + 1]!,
    // no motion blur: tested at 4 samples (kit/blur.ts), hairline translucent strands ghost into discrete copies
    // and lose contrast, and enough samples to hide that would cost more than the whole frame. The motion is
    // sub-pixel smooth at 60 fps without it.
    draw: (ctx, local, env) => paint(ctx, env, cuts[i]! + local),
  }));
  return {
    meta: { title: id, W, H, fps: FPS, bpm: BPM, durationFrames: N, raster: "cpu" },
    assets: { images: {}, fonts: P.assets },
    shots,
    audio: score,
  };
}

// ---- sound: the soft beat score (pad, bass, eighth plucks; its tails wrap so the loop is seamless), a pencil
// scratch that rises with the curl and stops dead on the downbeat, and a low hit on frame 120
const SCRATCH_FROM = 66,
  BASE_GAIN = 0.24,
  OUT = 0.62;
function score(sr: number): [Float32Array, Float32Array] {
  const [Lc, Rc] = beatScore({ frames: N, fps: FPS, bpm: BPM, mood: "soft", loop: true, gain: BASE_GAIN })(sr);
  const n = Lc.length,
    at = (f: number) => Math.round((f / FPS) * sr),
    noise = rng(1958);
  // the bed ducks under the hit and breathes back in (a closed-form sidechain), so the downbeat has room
  for (let i = at(T.hit); i < n; i++) {
    const d = 1 - 0.6 * Math.exp(-(i - at(T.hit)) / (0.22 * sr));
    Lc[i] = Lc[i]! * d;
    Rc[i] = Rc[i]! * d;
  }
  const add = (i: number, v: number, pan: number) => {
    i = ((i % n) + n) % n;
    Lc[i] = Lc[i]! + v * (1 - pan);
    Rc[i] = Rc[i]! + v * pan;
  };
  // the scratch: band-passed noise (about 1.8 to 7 kHz) shaped into quick pen strokes, swelling into the hit and
  // travelling across the stereo field the way the pen travels round the circle
  const i0 = at(SCRATCH_FROM),
    i1 = at(T.hit),
    a1 = 1 - Math.exp((-TAU * 7000) / sr),
    a2 = 1 - Math.exp((-TAU * 1800) / sr);
  let lp = 0,
    lp2 = 0;
  for (let i = i0; i < i1; i++) {
    const t = (i - i0) / sr,
      p = (i - i0) / (i1 - i0);
    lp += a1 * (noise() * 2 - 1 - lp);
    lp2 += a2 * (lp - lp2);
    const band = lp - lp2,
      stroke = Math.max(0, Math.sin(TAU * 10.5 * t + 0.9 * Math.sin(TAU * 2.7 * t))) ** 1.5,
      grit = noise() < 0.004 ? 2.2 : 1,
      env = p ** 2.2 * Math.min(1, (i1 - i) / (0.004 * sr));
    add(i, band * env * (0.25 + 0.75 * stroke) * grit * 0.5, 0.5 + 0.32 * Math.sin(TAU * 1.5 * p));
  }
  // the low hit: a pitch-dropping sine (about 110 to 42 Hz) with a felt-soft attack
  const h0 = at(T.hit);
  let ph = 0;
  for (let k = 0; k < Math.round(1.4 * sr); k++) {
    const t = k / sr;
    ph += (42 + 70 * Math.exp(-t / 0.045)) / sr;
    const body = Math.sin(TAU * ph) + 0.35 * Math.sin(2 * TAU * ph) * Math.exp(-t / 0.12);
    add(h0 + k, body * Math.exp(-t / 0.32) * Math.min(1, t / 0.002) * 0.78, 0.5);
  }
  // and its body: a short dark thud of low-passed noise, so the hit still reads on a phone speaker
  let th = 0;
  const a3 = 1 - Math.exp((-TAU * 900) / sr);
  for (let k = 0; k < Math.round(0.18 * sr); k++) {
    th += a3 * (noise() * 2 - 1 - th);
    add(h0 + k, th * Math.exp(-k / (0.05 * sr)) * 1.5, 0.5);
  }
  // a held pad of A and C (the two notes Am and F share) under the whole loop, so the bar lines and the wrap have
  // no hole where the score's pad releases and re-attacks; every partial makes whole cycles in the loop
  const secs = n / sr;
  for (let i = 0; i < n; i++) {
    const t = i / sr,
      swell = 0.8 + 0.2 * Math.cos((TAU * 2 * t) / secs);
    let v = 0;
    for (const [f, a] of [
      [220, 1],
      [261.5, 0.8],
      [440, 0.25],
    ] as const)
      v += Math.sin(TAU * (Math.round(f * secs) / secs) * t) * a;
    add(i, v * 0.028 * swell, 0.5);
  }
  // the landing on sample 0: a reverse pencil swell that ends on the seam and a soft tap on it, written at
  // negative indices so add() wraps the swell onto the end of the file
  const sw = Math.round(0.32 * sr);
  let hp = 0,
    lp3 = 0;
  const b1 = 1 - Math.exp((-TAU * 5200) / sr),
    b2 = 1 - Math.exp((-TAU * 1500) / sr);
  for (let k = -sw; k < Math.round(0.03 * sr); k++) {
    lp3 += b1 * (noise() * 2 - 1 - lp3);
    hp += b2 * (lp3 - hp);
    const band = lp3 - hp,
      env = k < 0 ? (1 + k / sw) ** 3 * 0.5 : Math.exp(-k / (0.006 * sr)) * 0.75;
    add(k, band * env, k < 0 ? 0.5 + 0.25 * (k / sw) : 0.5);
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

export const flowField = make("square", "flowField");
export const flowFieldVertical = make("vertical", "flowFieldVertical");
