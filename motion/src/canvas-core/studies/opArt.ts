// STUDY 60 · OP ART (4 s, 60 fps, a seamless loop). A SECONDS study: no words, the style is the whole piece.
// Op art after Bridget Riley's stripe paintings: a field of fine black stripes on off-white that a travelling bulge
// warps into a convex lens, so the flat page seems to breathe. Over half the frame a second grating, a few degrees
// off, crosses the first and the two interfere in moiré fringes that slide as the lens moves. One red stripe runs
// through the field. On the bar-2 downbeat (frame 120) the lens snaps to the centre, swells, and the moiré blooms
// into a disc of concentric rings for a beat before it shrinks away and the lens travels on into the loop.
// One source, designed for square (the hero) and vertical (more field above and below, the lens a little high).
// Brief: series/studies/briefs/op-art.json · prompt: series/studies/prompts/op-art.prompt.md
// After op art and the moiré effect (https://en.wikipedia.org/wiki/Op_art,
// https://en.wikipedia.org/wiki/Moir%C3%A9_pattern). No painting is reproduced.
//
// Op art is geometry plus a warp. Every band is laid out in a flat REST space (straight parallel stripes, a second
// grating rotated a few degrees, rings), sampled along its two edges, pushed through ONE smooth map and filled as a
// crisp polygon. The map is a radial gaussian lens (a point at distance r from the lens centre moves out to
// r·(1 + A·e^(−r²/R²))) followed by a slow vertical sine. For the horizontal stripes the radial lens is exactly a
// vertical displacement that depends on position (sliding a point along its own straight stripe changes nothing),
// and because it is radial it keeps rings round. Each band's width in rest space is set by how much the map
// stretches it across its own direction, so bands thicken where they crowd and thin where they spread. The second
// grating is composited with "xor" in a transparent layer: where its bands interleave with the first the page goes
// black, where they coincide it opens white, and that is the moiré. Every envelope wraps round the loop or reaches
// its resting value before frame 240, and the second grating slides a whole number of periods per loop.
import PACK from "../../../brand/packs/studio/pack.json";
import { rng, type Ctx, type Env, type Layer } from "../core";
import type { Film, Shot } from "../film";
import { clamp, ease, prog, spring } from "../kit/motion";
import { usePack } from "../kit/pack";
import { beatScore } from "../kit/score";
import { layout, type Size } from "../kit/sizes";

const P = usePack(PACK),
  C = P.palette("opart");
const FPS = 60,
  BPM = 120,
  N = 240, // two bars: a beat is 30 frames, bar 2's downbeat is frame 120
  BEAT = 30,
  TAU = Math.PI * 2;
// the story, in frames (each on the beat grid)
const T = { breathe: 0, hit: 120, relax: 150 };

// The lens must never fold the field (a fold would cross two bands). Radially the map is r → r·(1 + A·e^(−s)),
// s = r²/R², whose slope is 1 + A·e^(−s)·(1 − 2s). That is smallest at s = 1.5, where it is 1 − 2A·e^(−1.5)
// = 1 − 0.446·A, so the map stays one-to-one for any A below 1/(2·e^(−1.5)) ≈ 2.24. A_MAX keeps a margin under it,
// and every A (base, breath, beat ticks, pulses and the hit spring stacked) is clamped to it.
const A_MAX = 2.0;

const wrap = (F: number) => ((F % N) + N) % N;
/** signed distance in frames from `at`, wrapped into (-N/2, N/2] */
const around = (F: number, at: number) => {
  const d = wrap(F - at);
  return d > N / 2 ? d - N : d;
};
const smooth = (t: number) => t * t * (3 - 2 * t);
/** a slope-0-at-both-ends 0→1 that lingers round the middle (it moves fast early and late, slowly near half), so a
 * shape that is fading spends its time near half strength instead of blinking out */
const linger = (p: number) => p - (0.15 * Math.sin(TAU * p)) / TAU - (0.85 * Math.sin(2 * TAU * p)) / (2 * TAU);

// ---- envelopes (all functions of the frame, all periodic)
// a tick on every beat: a four-frame rise into the beat (a breath, not a twitch) and a soft decay, windowed to 0
// before the next
// a pulse with a rounded crest: a sine ease up over `rise` frames, a flat top for a frame or two that eases into an
// exponential decay (no cusp where the rise meets the fall)
const crest = (d: number, rise: number, decay: number) =>
  d < 0 ? 0.5 - 0.5 * Math.cos((Math.PI * (d + rise)) / rise) : 1 - (1 - Math.exp(-d / decay)) * smooth(prog(d, 0, 2));
const tick = (F: number) => {
  const d = wrap(F) - Math.round(wrap(F) / BEAT) * BEAT; // in [-15, 15]
  if (d < -5) return 0;
  return crest(d, 5, 7) * (1 - smooth(prog(d, 9, 15)));
};
// frame 0 lands: a short pulse centred exactly on the loop point (it wraps the seam)
const pulse0 = (F: number) => Math.exp(-((around(F, 0) / 9) ** 2));
// the pre-pulse on beat 3 (frame 60): a seven-frame rise into 60 (a swell, not a spike), a short decay, exactly 0 by
// frame 83
const pulse60 = (F: number) => {
  const d = wrap(F) - 60;
  if (d <= -7 || d >= 23) return 0;
  return crest(d, 7, 9) * (1 - smooth(prog(d, 10, 23)));
};
// (square) the moiré half parts for the lens: its edge retreats right while the lens comes in along that side and
// is pulled to the centre, and returns after the bloom
const retreat = (F: number) => {
  F = wrap(F);
  return smooth(prog(F, 66, 100)) * (1 - smooth(prog(F, 140, 200)));
};
// the impact on the downbeat: a near-instant rise and a soft decay, windowed to exactly 0 before the loop wraps
const punch = (F: number) => {
  F = wrap(F);
  const d = (F - T.hit + 1) / FPS; // one frame early, so frame 120 itself carries the hit
  return d > 0 ? (1 - Math.exp(-d * 90)) * Math.exp(-d * 2.6) * (1 - ease.inOutCubic(prog(F, 168, 222))) : 0;
};
// the inhale before the hit: the lens flattens a little as it is pulled toward the centre, then the slam
const inhale = (F: number) => {
  F = wrap(F);
  return F >= 96 && F < T.hit ? ease.inOutCubic(prog(F, 96, 118)) : 0;
};
// the lens wobbles like a struck jelly after the hit (starts at 0, gone by frame 176)
const wobble = (F: number) => {
  F = wrap(F);
  if (F <= T.hit || F >= 176) return 0;
  const d = F - T.hit;
  return Math.sin((TAU * d) / 16) * Math.exp(-d / 14) * (1 - smooth(prog(F, 150, 176)));
};
// the pull to the centre: 0 on the travelling path, accelerating in from frame 96 to arrive on 120 (an ease-in, so
// it snaps, but a quadratic one, already about 40% of the way by 112, so you see it travel in), a small overshoot spring past the centre, held through the bloom, and an ease back out onto the path
const snap = (F: number) => {
  F = wrap(F);
  if (F < 96 || F >= 218) return 0;
  if (F < T.hit) return prog(F, 96, T.hit) ** 2;
  const d = F - T.hit,
    over = 0.09 * Math.sin((TAU * d) / 22) * Math.exp(-d / 8) * (1 - smooth(prog(F, 138, 150)));
  return 1 + over - ease.inOutCubic(prog(F, T.relax, 218));
};
// the ring disc: springs open on the downbeat, holds for the beat, and shrinks away lingering near half, gone by
// frame 180 (a beat of rings, then the stripes again)
const BLOOM_END = 180;
const bloom = (F: number) => {
  F = wrap(F);
  if (F < T.hit) return 0;
  return spring((F - T.hit + 1) / FPS, { freq: 2.4, damp: 0.5 }) * (1 - linger(prog(F, T.relax, BLOOM_END)));
};
// as the disc closes its rings thin to hairlines, so it fades out rather than ending as a small hard coin
const ringFade = (F: number) => (1 - prog(wrap(F), T.relax, BLOOM_END - 4)) ** 1.4;
// the rings flow outward while the disc is open
const ripple = (F: number) => {
  F = wrap(F);
  return F < T.hit ? 0 : 0.8 * ease.outCubic(prog(F, T.hit, BLOOM_END));
};

export function make(size: Size, id: string): Film {
  const L = layout(size),
    { W, H, u } = L,
    tall = L.tall;
  // per-size design. Square: the lens travels a figure-of-eight across the middle, the moiré half is the right of
  // a steep diagonal. Vertical: horizontal stripes give more field above and below; the lens's home sits a little
  // high (clear of the feed's 220 px top and 320 px bottom bands), its path is taller, and the moiré half is the
  // field below a gently tilted line just under the lens.
  const HX = W / 2,
    HY = tall ? H * 0.44 : H / 2,
    PER = 22 * u, // stripe period: about 49 stripes across the square (coarse enough to survive a 5 Mbps re-encode)
    PER2 = PER * 1.08, // the second grating's period: a touch wider, so the beat fringes lean instead of standing up
    DUTY2 = 0.62, // and its bands are thinner, so the fringes are a soft half-tone, not a full-contrast barcode
    // the ring period: off the stripes' period, so where rings run parallel to stripes the interference makes a
    // few large crisp shapes instead of sub-pixel grey
    RING = PER * 1.4,
    R0 = (tall ? 250 : 235) * u,
    A0 = 0.8,
    AX = (tall ? 270 : 300) * u, // the lens's path: x = AX·sin(2πt − π/2), y = AY·sin(4πt + Y_PH)
    AY = (tall ? 345 : 200) * u, // the vertical's lowest point is 0.62 H, well into the moiré field below
    // square: at frame 0 the lens sits half a radius above the red stripe, falling onto it. Vertical: the lens's
    // low points fall on frames 95 and 215, so it works the moiré field just before the snap and just after it
    Y_PH = tall ? -1.0833 * Math.PI : -Math.PI / 6,
    // the moiré half: rest-space boundary point and the angle of its normal (the region is the side it points to)
    BX = HX + (tall ? 0 : 0.3 * R0),
    BY = HY + (tall ? 0.9 * R0 : 0),
    B_ANG = tall ? Math.PI / 2 - 0.22 : 0.42,
    B_WAVE = 70 * u, // the boundary is not a ruled line: a slow travelling wave, then the lens bends it too
    RETREAT = (tall ? 0 : 240) * u, // how far the square's moiré edge parts for the lens before the hit
    // the second grating's tilt, rad (about 2.3°). With PER2 = 1.08·PER the beat between the two gratings has
    // wavevector (−sin α / PER2, cos α / PER2 − 1 / PER): fringes about 12 periods (≈ 260 px) apart, leaning about
    // 25° from the stripes, and the lens bends them with everything else
    ALPHA = 0.04,
    RHO = (tall ? 380 : 360) * u, // the ring disc's rest radius at full bloom
    S = 6 * u, // the slow sine's height
    LAMBDA = W * 0.85;
  // how far the map can move a point: the lens at most 0.43·A·R (at r = R/√2), plus the sine. Bands that start
  // farther than this outside the frame can never be pulled into it.
  const RMAX = R0 * 1.28,
    MARGIN = 0.43 * A_MAX * RMAX + S + 24 * u,
    STEP = 4 * u; // rest-space sample step along a band (sub-pixel chord error at the largest magnification)

  // ---- the map, set up per frame
  let LX = HX,
    LY = HY,
    A = A0,
    R = R0,
    R2 = R0 * R0,
    SPH = 0, // the sine's phase
    mx = 0,
    my = 0;
  const map = (x: number, y: number) => {
    const dx = x - LX,
      dy = y - LY,
      f = 1 + A * Math.exp(-(dx * dx + dy * dy) / R2),
      X = LX + dx * f,
      Y = LY + dy * f;
    mx = X;
    my = Y + S * Math.sin((TAU * X) / LAMBDA + SPH) * (0.65 + 0.35 * Math.cos((TAU * Y) / (H * 1.3) - SPH));
  };
  // a band's width at a rest point, as a fraction of the period, from how much the lens stretches the field across
  // the band (tx, ty: the band's unit direction there). Radially the lens stretches by kr = 1 + e(1 − 2s), round
  // the centre by kt = 1 + e, so across a band that makes angle β with the radius the spacing grows by
  // kr·kt / √(kr²cos²β + kt²sin²β). Spread (> 1): a thin black line on wide white. Crowded (< 1): heavy black.
  const duty = (x: number, y: number, tx: number, ty: number) => {
    const dx = x - LX,
      dy = y - LY,
      r2 = dx * dx + dy * dy,
      s = r2 / R2;
    if (s > 12) return 0.5;
    const e = A * Math.exp(-s),
      kr = 1 + e * (1 - 2 * s),
      kt = 1 + e,
      c = r2 > 1e-6 ? (tx * dx + ty * dy) / Math.sqrt(r2) : 0,
      st = (kr * kt) / Math.sqrt(kr * kr * c * c + kt * kt * (1 - c * c));
    return 0.5 - 0.33 * Math.tanh(1.2 * Math.log(st));
  };

  // ---- band builders: rest edges sampled, mapped, and added to the current path as closed polygons
  const MAXS = Math.ceil((Math.max(W, H) * 2 + 4 * MARGIN) / STEP) + 8;
  const UX = new Float32Array(MAXS),
    UY = new Float32Array(MAXS),
    DX = new Float32Array(MAXS),
    DY = new Float32Array(MAXS);
  const flush = (ctx: Ctx, n: number) => {
    if (n < 2) return;
    ctx.moveTo(UX[0]!, UY[0]!);
    for (let i = 1; i < n; i++) ctx.lineTo(UX[i]!, UY[i]!);
    for (let i = n - 1; i >= 0; i--) ctx.lineTo(DX[i]!, DY[i]!);
    ctx.closePath();
  };
  /** one straight rest band: centre line through (ox, oy) with direction (tx, ty), normal (-ty, tx), from s0 to s1,
   * of a grating with period `per`; `w` scales the width */
  const band = (
    ctx: Ctx,
    ox: number,
    oy: number,
    tx: number,
    ty: number,
    s0: number,
    s1: number,
    per: number,
    w: number,
  ) => {
    const nx = -ty,
      ny = tx,
      n = Math.min(MAXS, Math.ceil((s1 - s0) / STEP) + 1);
    let hMax = 0;
    for (let i = 0; i < n; i++) {
      const sv = s0 + ((s1 - s0) * i) / (n - 1),
        cx = ox + tx * sv,
        cy = oy + ty * sv,
        h = 0.5 * per * duty(cx, cy, tx, ty) * w * (taperOn ? taper(cx, cy) : 1);
      if (h > hMax) hMax = h;
      map(cx - nx * h, cy - ny * h);
      UX[i] = mx;
      UY[i] = my;
      map(cx + nx * h, cy + ny * h);
      DX[i] = mx;
      DY[i] = my;
    }
    if (hMax > 0.05) flush(ctx, n); // a band tapered away along its whole length is not drawn at all
  };
  // the second grating is never CUT: its bands taper to nothing in width (strict black and white, no alpha) at
  // the edge of its half and round the lens's clearing, so its fringes grow in through hairlines. Set per frame.
  let taperOn = false,
    hole = 0, // rest radius round home the grating clears (the ring disc, or the swollen lens just after the hit)
    EX = 0, // the edge: a rest point on it, its normal (pointing into the half) and tangent, and the wave's phase
    EY = 0,
    ENX = 1,
    ENY = 0,
    EPH = 0;
  const taper = (x: number, y: number) => {
    const qx = x - EX,
      qy = y - EY,
      along = -qx * ENY + qy * ENX,
      d = qx * ENX + qy * ENY - B_WAVE * Math.sin((TAU * along) / (1.1 * Math.max(W, H)) - EPH);
    let k = smooth(clamp(d / (2 * PER)));
    if (k > 0 && hole > 0.5) {
      const r = Math.hypot(x - HX, y - HY);
      k *= smooth(clamp((r - hole) / (1.5 * PER)));
    }
    return k;
  };
  /** the s range of a straight rest line inside the frame grown by MARGIN (null if it misses) */
  const span = (ox: number, oy: number, tx: number, ty: number): [number, number] | null => {
    let lo = -1e9,
      hi = 1e9;
    for (const [o, d, a, b] of [
      [ox, tx, -MARGIN, W + MARGIN],
      [oy, ty, -MARGIN, H + MARGIN],
    ] as const) {
      if (Math.abs(d) < 1e-9) {
        if (o < a || o > b) return null;
        continue;
      }
      const t1 = (a - o) / d,
        t2 = (b - o) / d;
      lo = Math.max(lo, Math.min(t1, t2));
      hi = Math.min(hi, Math.max(t1, t2));
    }
    return hi > lo ? [lo, hi] : null;
  };
  /** a whole grating of straight bands at angle `ang`, offset `off` along its normal, through the home point */
  const grating = (ctx: Ctx, ang: number, off: number, per: number, w: number, skip0: boolean) => {
    const tx = Math.cos(ang),
      ty = Math.sin(ang),
      nx = -ty,
      ny = tx,
      reach = Math.hypot(W, H) / 2 + MARGIN + per,
      k0 = Math.floor((-reach - off) / per),
      k1 = Math.ceil((reach - off) / per);
    for (let k = k0; k <= k1; k++) {
      if (skip0 && k === 0) continue;
      const o = off + k * per,
        ox = HX + nx * o,
        oy = HY + ny * o,
        sp = span(ox, oy, tx, ty);
      if (sp) band(ctx, ox, oy, tx, ty, sp[0], sp[1], per, w);
    }
  };
  const RING_N = 240;
  /** the ring grating inside the disc of rest radius rho: annuli whose width follows the same duty rule */
  const rings = (ctx: Ctx, rho: number, flow: number, w: number) => {
    // (from k = -1, so as the rings flow outward a new one grows from a point at the centre instead of popping in)
    for (let k = -1; ; k++) {
      const rc = (k + (flow % 1)) * RING;
      if (rc >= rho) break;
      // rings taper in over the last half period inside the disc's rim instead of being cut there: as the disc
      // grows they reach full width within a frame or two, so the rim fills rather than reading as an outline
      const rim = smooth(clamp((rho - rc) / (0.5 * PER)));
      // (a ring still under about a pixel wide at the rim is left out, so the growing disc has no hairline outline)
      if (rim * 0.25 * RING < 0.6 * u) continue;
      // outer edge clockwise, inner edge anticlockwise: a nonzero fill leaves the hole open
      for (const side of [1, -1]) {
        for (let i = 0; i <= RING_N; i++) {
          const th = (side * TAU * i) / RING_N,
            c = Math.cos(th),
            sn = Math.sin(th),
            h = 0.5 * RING * duty(HX + rc * c, HY + rc * sn, -sn, c) * w * rim,
            r = Math.max(0, rc + side * h);
          map(HX + r * c, HY + r * sn);
          if (i === 0) ctx.moveTo(mx, my);
          else ctx.lineTo(mx, my);
        }
        ctx.closePath();
      }
    }
  };

  // ---- the transparent layer the gratings are composited in (one per size and pixel density)
  const layer = (env: Env): Layer => {
    const pw = Math.round(W * env.scale),
      ph = Math.round(H * env.scale),
      key = `opArt:${id}:layer:${pw}x${ph}`;
    let lay = env.cache.get(key) as Layer | undefined;
    if (!lay) {
      lay = env.canvas(pw, ph);
      env.cache.set(key, lay);
    }
    return lay;
  };

  const paint = (ctx: Ctx, env: Env, F: number) => {
    F = wrap(F);
    const t = F / N,
      kick = punch(F),
      p0 = pulse0(F),
      p60 = pulse60(F),
      tk = tick(F);
    // the lens: its travelling path, pulled to home by the snap; its strength breathes, ticks on every beat,
    // throbs on frames 0 and 60, inhales before the downbeat and swells and wobbles after it
    const px = HX + AX * Math.sin(TAU * t - Math.PI / 2),
      py = HY + AY * Math.sin(2 * TAU * t + Y_PH),
      sn = snap(F);
    LX = px + (HX - px) * sn;
    LY = py + (HY - py) * sn;
    A = clamp(
      A0 * (1 + 0.1 * Math.sin(2 * TAU * t + 0.4)) * (1 - 0.12 * inhale(F)) +
        0.1 * tk +
        0.34 * p0 +
        0.26 * p60 +
        0.85 * kick +
        0.13 * wobble(F),
      0,
      A_MAX,
    );
    R = R0 * (1 + 0.05 * Math.sin(TAU * t + 2) + 0.24 * kick + 0.05 * p0);
    R2 = R * R;
    SPH = TAU * t;
    const rho = RHO * bloom(F);

    // camera: a faint breath and a punch-in on the downbeat, about the home point
    const cam = (1 + 0.006 * Math.sin(TAU * t + 1.3) + 0.035 * kick) * env.scale,
      setCam = (c: Ctx) => c.setTransform(cam, 0, 0, cam, env.scale * HX - cam * HX, env.scale * HY - cam * HY);

    // ---- the gratings, in a transparent layer
    const lay = layer(env),
      g = lay.ctx;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = "source-over";
    g.globalAlpha = 1;
    g.clearRect(0, 0, lay.canvas.width, lay.canvas.height);
    setCam(g);
    g.fillStyle = C.ink;
    // the first grating: horizontal stripes (the red one, k = 0, is drawn on top later)
    g.beginPath();
    grating(g, 0, 0, PER, 1, true);
    g.fill();
    // the second grating, xor'd over the first inside its half of the frame (and outside the ring disc); it tilts a
    // little and slides two whole periods per loop, so the fringes travel and the loop closes
    g.globalCompositeOperation = "xor";
    const bAng = B_ANG + 0.05 * Math.sin(TAU * t + 2.2);
    ENX = Math.cos(bAng);
    ENY = Math.sin(bAng);
    EX = BX + RETREAT * retreat(F);
    EY = BY;
    EPH = TAU * t;
    // from the hit, the second grating also clears round the swollen lens (so the bulge lands whole), and that
    // clearing closes as the punch decays
    hole = Math.max(rho, R * 1.15 * kick);
    taperOn = true;
    g.beginPath();
    grating(g, ALPHA + 0.015 * Math.sin(TAU * t + 0.7), 2 * PER2 * t, PER2, DUTY2, false);
    g.fill();
    taperOn = false;
    // the bloom: concentric rings inside the disc, xor'd over the stripes
    if (rho > 0.5) {
      g.beginPath();
      rings(g, rho, ripple(F), ringFade(F));
      g.fill();
    }
    g.globalCompositeOperation = "source-over";

    // ---- the page, the layer, and the red stripe on top as one unbroken thread
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = C.ground;
    ctx.fillRect(0, 0, lay.canvas.width, lay.canvas.height);
    ctx.drawImage(lay.canvas, 0, 0);
    setCam(ctx);
    ctx.fillStyle = C.accent;
    ctx.beginPath();
    // never narrower than the black band it replaces, so no black sliver shows at its edges
    const sp = span(HX, HY, 1, 0);
    if (sp) bandRed(ctx, sp[0], sp[1], 0.03 + 0.26 * kick + 0.12 * p0 + 0.04 * tk);
    ctx.fill();
  };
  // the red stripe: the first grating's k = 0 band, at least 0.46 of a period wide in rest space
  const bandRed = (ctx: Ctx, s0: number, s1: number, extra: number) => {
    const n = Math.min(MAXS, Math.ceil((s1 - s0) / STEP) + 1);
    for (let i = 0; i < n; i++) {
      const cx = HX + s0 + ((s1 - s0) * i) / (n - 1),
        h = 0.5 * PER * (Math.max(duty(cx, HY, 1, 0), 0.46) + extra);
      map(cx, HY - h);
      UX[i] = mx;
      UY[i] = my;
      map(cx, HY + h);
      DX[i] = mx;
      DY[i] = my;
    }
    flush(ctx, n);
  };

  const cuts = [T.breathe, T.hit, T.relax, N],
    names = ["breathe", "bloom", "relax"];
  const shots: Shot[] = names.map((sid, i) => ({
    id: sid,
    start: cuts[i]!,
    end: cuts[i + 1]!,
    // no motion blur: the bands are fine lines (a few shutter samples would ghost them into copies), and the
    // motion is sub-pixel smooth at 60 fps without it
    draw: (ctx, local, env) => paint(ctx, env, cuts[i]! + local),
  }));
  return {
    meta: { title: id, W, H, fps: FPS, bpm: BPM, durationFrames: N, raster: "cpu" },
    assets: { images: {}, fonts: P.assets },
    shots,
    audio: score,
  };
}

// ---- sound: the soft beat score as a quiet bed (key -2, G minor; its tails wrap), a held pad of G and B-flat
// under the whole loop (no hole at the bar lines or the wrap), a tight kick-like low tick on every beat, a dry wood
// tock on frame 0 and a softer one on frame 60, and a sharp hit on frame 120: a big kick, a noise crack and a
// metallic ping. Pitched partials make whole cycles in the loop; tails wrap round the end of the buffer.
const BASE_GAIN = 0.24,
  DRIVE = 2.6, // how hard the sum is pushed into the saturation (the hit's peak lands at tanh(DRIVE))
  OUT = 0.65;
const q4 = (hz: number) => Math.round(hz * 4) / 4;
function score(sr: number): [Float32Array, Float32Array] {
  const [Lc, Rc] = beatScore({
    frames: N,
    fps: FPS,
    bpm: BPM,
    mood: "soft",
    key: -2,
    loop: true,
    gain: BASE_GAIN,
  })(sr);
  const n = Lc.length,
    at = (f: number) => Math.round((f / FPS) * sr),
    noise = rng(6060);
  const add = (i: number, l: number, r: number) => {
    i = ((i % n) + n) % n;
    Lc[i] = Lc[i]! + l;
    Rc[i] = Rc[i]! + r;
  };
  // the bed ducks under the hit and breathes back in, back to full well before the loop wraps
  for (let i = at(T.hit); i < n; i++) {
    const d = 1 - 0.55 * Math.exp(-(i - at(T.hit)) / (0.2 * sr));
    Lc[i] = Lc[i]! * d;
    Rc[i] = Rc[i]! * d;
  }
  // the held pad: G3, B-flat3 and a quiet G4 (G minor and E-flat major share G and B-flat), a whole number of
  // cycles each, with a gentle swell that peaks into the downbeat
  const secs = n / sr;
  for (let i = 0; i < n; i++) {
    const tt = i / sr,
      swell = 0.8 + 0.2 * Math.cos(TAU * (tt / secs - 0.5));
    let v = 0;
    for (const [f, a] of [
      [196, 1],
      [233.08, 0.75],
      [392, 0.22],
    ] as const)
      v += Math.sin(TAU * (Math.round(f * secs) / secs) * tt) * a;
    add(i, v * 0.026 * swell, v * 0.026 * swell);
  }
  // a kick-like low tick: a short pitch-dropping sine with a click on top
  const kickAt = (i0: number, gain: number, f0: number, f1: number, decay: number) => {
    let ph = 0,
      hp = 0,
      prev = 0;
    const len = Math.round(decay * 6 * sr),
      a = 1 - Math.exp((-TAU * 2500) / sr);
    for (let k = 0; k < len; k++) {
      const tt = k / sr;
      ph += (f1 + (f0 - f1) * Math.exp(-tt / 0.024)) / sr;
      const x = noise() * 2 - 1;
      hp += a * (x - hp);
      const click = (hp - prev) * Math.exp(-tt / 0.0025) * 0.5;
      prev = hp;
      const v = (Math.sin(TAU * ph) * Math.exp(-tt / decay) * Math.min(1, tt / 0.0008) + click) * gain;
      add(i0 + k, v, v);
    }
  };
  for (let b = 0; b < N / BEAT; b++) {
    const f = b * BEAT;
    if (f === T.hit) continue; // the hit has its own
    kickAt(at(f), f === 0 || f === 60 ? 0.42 : 0.24, 130, 50, 0.07);
  }
  // a dry wood tock: two inharmonic partials with a fast decay
  const tock = (i0: number, f: number, gain: number, pan: number) => {
    for (let k = 0; k < Math.round(0.25 * sr); k++) {
      const tt = k / sr,
        v =
          (Math.sin(TAU * f * tt) + 0.45 * Math.sin(TAU * f * 2.76 * tt) * Math.exp(-tt * 40)) *
          Math.exp(-tt * 28) *
          Math.min(1, tt / 0.0006) *
          gain;
      add(i0 + k, v * (1 - pan) * 2, v * pan * 2);
    }
  };
  // frame 0 lands on sample 0: a short rising breath of air that ends exactly on the seam (written at negative
  // indices, so it wraps onto the end of the buffer), then the accented tick and a G tock on the seam itself
  const sw = Math.round(0.22 * sr);
  let lpA = 0,
    hpA = 0;
  const b1 = 1 - Math.exp((-TAU * 7000) / sr),
    b2 = 1 - Math.exp((-TAU * 2200) / sr);
  for (let k = -sw; k < 0; k++) {
    lpA += b1 * (noise() * 2 - 1 - lpA);
    hpA += b2 * (lpA - hpA);
    const e = (1 + k / sw) ** 3 * 0.32,
      v = (lpA - hpA) * e;
    add(k, v * (1 + 0.3 * (k / sw)), v * (1 - 0.3 * (k / sw)));
  }
  tock(0, q4(1568), 0.2, 0.5);
  // the pre-pulse on frame 60: a softer D tock, panned a little left
  tock(at(60), q4(1175), 0.15, 0.4);

  // the hit on frame 120: a big kick, a crack of bright noise, a metallic ping and a short air tail
  const h0 = at(T.hit);
  kickAt(h0, 0.95, 160, 44, 0.2);
  let cl = 0,
    cr = 0;
  const hc = 1 - Math.exp((-TAU * 1800) / sr);
  for (let k = 0; k < Math.round(0.6 * sr); k++) {
    const tt = k / sr,
      xl = noise() * 2 - 1,
      xr = noise() * 2 - 1;
    cl += hc * (xl - cl);
    cr += hc * (xr - cr);
    // noise minus its low-pass: a one-pole high-pass (above about 1.8 kHz), the crack and its short air tail
    const e = (Math.exp(-tt / 0.03) + Math.exp(-tt / 0.22) * 0.12) * Math.min(1, tt / 0.0005);
    add(h0 + k, (xl - cl) * e * 0.55, (xr - cr) * e * 0.55);
  }
  [
    [784, 0.09, 0.42],
    [784 * 2.76, 0.05, 0.62],
    [784 * 5.4, 0.025, 0.5],
  ].forEach(([f, g, pan]) => {
    for (let k = 0; k < Math.round(1.2 * sr); k++) {
      const tt = k / sr,
        v = Math.sin(TAU * f! * tt) * Math.exp(-tt * (3 + f! / 1000)) * Math.min(1, tt / 0.001) * g!;
      add(h0 + k, v * (1 - pan!) * 2, v * pan! * 2);
    }
  });

  // one gentle saturation over the sum: louder without a limiter, and still deterministic
  let peak = 1e-9;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(Lc[i]!), Math.abs(Rc[i]!));
  const g = DRIVE / peak;
  for (let i = 0; i < n; i++) {
    Lc[i] = (Math.tanh(Lc[i]! * g) / Math.tanh(DRIVE)) * OUT;
    Rc[i] = (Math.tanh(Rc[i]! * g) / Math.tanh(DRIVE)) * OUT;
  }
  return [Lc, Rc];
}

export const opArt = make("square", "opArt");
export const opArtVertical = make("vertical", "opArtVertical");
