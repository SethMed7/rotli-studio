// STUDY 31 · NEON DRIVE (24 s, 60 fps, 100 bpm). The opening card of an invented night-drive mixtape, "Lumen
// Lane", in the synthwave (outrun) manner: a striped sun, wireframe mountains, a perspective grid that scrolls
// forever, neon tube lettering that ignites with an irregular flicker, a banded chrome word, palms in parallax, a
// tracklist, a neon cassette and a blinking PRESS PLAY. No product; every name is invented.
// Brief: series/studies/briefs/neon-drive.json · prompt: series/studies/prompts/neon-drive.prompt.md
//
// The whole film is one continuous function paint(F) of the frame. Neon is always three layered strokes composited
// with "lighter", never a blur filter. The grid and the palms share one closed-form distance travelled, dist(F), so
// the floor keeps scrolling through every speed change without a jump.
import PACK from "../../../brand/packs/studio/pack.json";
import type { Ctx, Env, Layer } from "../core";
import { rng } from "../core";
import type { Film, Shot } from "../film";
import { clamp, ease, lerp, prog, spring } from "../kit/motion";
import { usePack } from "../kit/pack";
import { beatScore } from "../kit/score";
import { layout, type Size } from "../kit/sizes";
import { text } from "../kit/type";

const P = usePack(PACK),
  C = P.palette("neon"),
  F_ = P.face;
const FPS = 60,
  BPM = 100,
  N = 1440; // a beat is 36 frames, a bar 144
const T = { world: 144, title: 432, slam: 576, drive: 720, lockup: 1008, end: 1296 };
// punches on the beat grid (critique round 2): the sun and grid land on beat 1, the mountains slam up with a camera
// lurch on bar 2, the floor surges on bar 3, the tube sign blooms on its first strike, the drive surges on bar 7,
// the cassette body snaps on, and PRESS PLAY's first blink lands with the sign-off
const PUNCH = { world: 36, ridge: 144, surge: 288, driveSurge: 864, body: 1116 };
const STRIKES = [0, 1, 2, 3, 4].map((i) => T.title + i * 18); // one tube letter every half beat
const TRACKS = ["A1  Tail Lights", "A2  Overpass", "A3  Coastline, 3 AM", "A4  Last Exit"];
const TRACK_ON = [756, 828, 900, 972]; // one line per two beats
const TRACK_OFF = [1008, 1026, 1044, 1062]; // switched off line by line
const BLINKS = [1296, 1332, 1368, 1404]; // PRESS PLAY, on every beat
const FLARE = 1368; // the sun's last stripe flares
const BROWNOUT = [1008, 1009, 1014]; // the sign dips as the lockup begins
const LINE_DROPS = [5, 6, 14, 23, 24, 31, 58, 59, 97, 131, 132]; // uneven, never metronomic

// ---- colour helpers (everything comes from the palette)
const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
};
const mix = (a: string, b: string, t: number, alpha = 1) => {
  const A = rgb(a),
    B = rgb(b);
  const c = (i: 0 | 1 | 2) => Math.round(lerp(A[i], B[i], t));
  return `rgba(${c(0)},${c(1)},${c(2)},${alpha})`;
};
const rgba = (hex: string, a: number) => mix(hex, hex, 0, a);

// a seeded hash of an integer: the flicker's source (pure, so any frame renders on its own)
const hash = (n: number) => {
  let x = Math.imul((n | 0) ^ 0x9e3779b9, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
};
/** 0 before `at`; an irregular on/off from hash(floor(F / 2)) for `len` frames; then on for good */
const ignite = (F: number, at: number, seed: number, len = 16) => {
  if (F < at) return 0;
  const l = F - at;
  if (l >= len) return 1;
  if (l < 2) return 1; // the strike
  if (l < 4 + (seed % 2) * 2) return 0; // it always catches, drops, then stutters
  return hash(seed * 131 + Math.floor(F / 2)) < 0.42 ? 1 : 0;
};
/** the reverse: on until `at`, a stutter, then off */
const quench = (F: number, at: number, seed: number) => (F < at ? 1 : 1 - ignite(F, at, seed + 50, 12));

// closed-form distance travelled: speed ramps linearly between keys, so its integral is exact
const RAMPS: [number, number, number][] = [
  [36, 60, 0.2], // the floor starts rushing the moment it lands
  [288, 292, 0.7], // a surge on bar 3
  [292, 340, -0.7],
  [720, 768, 0.34], // the drive speeds up
  [864, 868, 0.5], // and surges on bar 7
  [868, 924, -0.5],
  [1008, 1092, -0.3], // and eases back for the lockup
];
const integ = (F: number, a: number, b: number) =>
  F < a ? 0 : F < b ? (F - a) ** 2 / (2 * (b - a)) : (b - a) / 2 + F - b;
const dist = (F: number) => RAMPS.reduce((s, [a, b, d]) => s + d * integ(F, a, b), 0);

type Palm = { at: number; side: number; x: number; h: number; lean: number; seed: number };

export function make(size: Size, id: string): Film {
  const L = layout(size),
    { W, H, u, cx } = L,
    SQ = size === "square";
  const hz = (SQ ? 594 : 740) * u, // the horizon
    vx = cx,
    focal = (SQ ? 720 : 820) * u,
    sunR = (SQ ? 262 : 200) * u,
    sunUp = (SQ ? 72 : 70) * u; // how far the risen sun's centre sits above the horizon
  const m = L.safe.x;

  // ---- the neon: a wide faint stroke, a middle one, a thin bright core; always additive
  const neon = (
    ctx: Ctx,
    color: string,
    a: number,
    k: number,
    stroke: (c: Ctx) => void,
    core = mix(color, C.ink, 0.72),
  ) => {
    if (a <= 0) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const layers: [number, string, number][] = [
      [14 * k, color, 0.12],
      [7 * k, color, 0.35],
      [2.5 * k, core, 1],
    ];
    for (const [w, c, al] of layers) {
      ctx.globalAlpha = a * al;
      ctx.lineWidth = w;
      ctx.strokeStyle = c;
      stroke(ctx);
    }
    ctx.restore();
  };
  // neon TEXT: the font's outlines overlap inside M, N, A, so each stroke is drawn on a layer and the glyph fill
  // is cut out of it; only the outer tube line stays (the stroke widths are the brief's, their outer half shows)
  let ENV: Env | undefined;
  const layerOf = (): Layer => {
    const e = ENV!,
      w = Math.round(W * e.scale),
      h = Math.round(H * e.scale),
      k = `neonDrive:${w}x${h}`;
    let ly = e.cache.get(k) as Layer | undefined;
    if (!ly) {
      ly = e.canvas(w, h);
      e.cache.set(k, ly);
    }
    return ly;
  };
  const cutStroke = (
    ctx: Ctx,
    layers: [number, string, number][],
    op: GlobalCompositeOperation,
    stroke: (c: Ctx) => void,
    cut: (c: Ctx) => void,
  ) => {
    const ly = layerOf(),
      c = ly.ctx,
      tf = ctx.getTransform();
    for (const [w, color, a] of layers) {
      if (a <= 0) continue;
      c.save();
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.globalCompositeOperation = "source-over";
      c.globalAlpha = 1;
      c.clearRect(0, 0, ly.canvas.width, ly.canvas.height);
      c.setTransform(tf);
      c.font = ctx.font;
      (c as Ctx & { letterSpacing: string }).letterSpacing = (ctx as Ctx & { letterSpacing: string }).letterSpacing;
      c.textBaseline = ctx.textBaseline;
      c.lineCap = "round";
      c.lineJoin = "round";
      c.lineWidth = w;
      c.strokeStyle = color;
      c.fillStyle = "#000";
      stroke(c);
      c.globalCompositeOperation = "destination-out";
      cut(c);
      c.restore();
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = op;
      ctx.globalAlpha = a;
      ctx.drawImage(ly.canvas, 0, 0);
      ctx.restore();
    }
  };
  const neonText = (ctx: Ctx, color: string, a: number, k: number, stroke: (c: Ctx) => void, cut: (c: Ctx) => void) => {
    if (a <= 0) return;
    cutStroke(
      ctx,
      [
        [20 * k, color, 0.13 * a],
        [9 * k, color, 0.38 * a],
        [5 * k, mix(color, C.ink, 0.72), a],
      ],
      "lighter",
      stroke,
      cut,
    );
  };
  const font = (ctx: Ctx, px: number, family = F_.sans, weight = 800) => {
    ctx.font = `${weight} ${px}px "${family}"`;
    (ctx as Ctx & { letterSpacing: string }).letterSpacing = "0px";
  };
  /** glyph x positions (left edges) for a tracked word, and its width */
  const glyphs = (ctx: Ctx, s: string, px: number, track: number) => {
    ctx.save();
    font(ctx, px);
    let x = 0;
    const out = [...s].map((ch) => {
      const g = { ch, x, w: ctx.measureText(ch).width };
      x += g.w + track * px;
      return g;
    });
    ctx.restore();
    return { gl: out, w: x - track * px };
  };

  // ---- the world
  const STARS = (() => {
    const r = rng(31);
    return Array.from({ length: SQ ? 70 : 110 }, () => ({
      x: r() * W,
      y: r() * hz * 0.8,
      s: (0.8 + r() * 1.8) * u,
      w: 0.03 + r() * 0.09,
      p: r() * Math.PI * 2,
    }));
  })();
  const sky = (ctx: Ctx, F: number) => {
    ctx.fillStyle = C.deep;
    ctx.fillRect(0, 0, W, H);
    // the gradient rises from below the horizon during the ignition
    const rise = ease.outCubic(prog(F, 0, 40)),
      top = lerp(hz, 0, rise),
      g = ctx.createLinearGradient(0, top, 0, hz);
    g.addColorStop(0, C.ground);
    g.addColorStop(0.55, mix(C.ground, C.s3, 0.5));
    g.addColorStop(0.86, mix(C.s3, C.accent, 0.35));
    g.addColorStop(1, C.accent);
    ctx.save();
    ctx.globalAlpha = prog(F, 0, 12);
    ctx.fillStyle = C.ground;
    ctx.fillRect(0, 0, W, top);
    ctx.fillStyle = g;
    ctx.fillRect(0, top, W, hz - top + 1);
    ctx.restore();
    const a = prog(F, 2, 40);
    for (const s of STARS) {
      const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(F * s.w + s.p)) ** 2;
      ctx.globalAlpha = a * tw * clamp(1.2 - s.y / (hz * 0.8));
      ctx.fillStyle = C.ink;
      ctx.fillRect(s.x - s.s / 2, s.y - s.s / 2, s.s, s.s);
    }
    ctx.globalAlpha = 1;
  };

  const sunY = (F: number) =>
    F < T.end
      ? lerp(hz + sunR + 8 * u, hz - sunUp, spring((F - PUNCH.world) / FPS, { freq: 1.6, damp: 0.62 }))
      : lerp(hz - sunUp, hz + sunR + 8 * u, ease.inOutCubic(prog(F, T.end + 6, 1416)));
  const sun = (ctx: Ctx, F: number) => {
    const y = sunY(F);
    if (y - sunR > hz) return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, hz);
    ctx.clip();
    ctx.beginPath();
    ctx.arc(vx, y, sunR, 0, Math.PI * 2);
    ctx.clip();
    const g = ctx.createLinearGradient(0, y - sunR, 0, y + sunR);
    g.addColorStop(0, C.s1);
    g.addColorStop(0.55, C.s2);
    g.addColorStop(1, C.accent);
    ctx.fillStyle = g;
    ctx.fillRect(vx - sunR, y - sunR, sunR * 2, sunR * 2);
    // the gaps: closed-form in the frame, taller toward the bottom, drifting down forever
    const drift = Math.max(0, F - 60) / 150,
      n = 6;
    ctx.fillStyle = C.ground;
    for (let j = -1; j <= n; j++) {
      const t = (j + (drift % 1)) / n; // 0 at the first gap, 1 at the bottom
      if (t < 0 || t > 1.05) continue;
      const gy = y + lerp(-0.5, 0.36, t) * sunR,
        gh = (2 + 22 * t ** 1.3) * u * prog(F, 56, 96);
      ctx.fillRect(vx - sunR, gy, sunR * 2, gh);
    }
    ctx.restore();
  };
  // the last stripe flares as the sun sinks behind the horizon
  const sunFlare = (ctx: Ctx, F: number) => {
    if (F < T.end) return;
    const top = sunY(F) - sunR,
      d = (hz - top) / sunR; // 0 when the top touches the horizon
    const a =
        (F < 1416 ? clamp(1 - Math.abs(d - 0.12) / 0.5) : 0.35 + 0.1 * Math.sin(F * 0.4)) +
        (F >= FLARE ? 1.2 * (1 - prog(F, FLARE, FLARE + 30)) : 0),
      half = Math.sqrt(Math.max(0, sunR ** 2 - (hz - sunY(F)) ** 2)) + 40 * u;
    neon(ctx, C.s1, a, 1.3, (c) => {
      c.beginPath();
      c.moveTo(vx - half, hz - 2 * u);
      c.lineTo(vx + half, hz - 2 * u);
      c.stroke();
    });
  };

  const RIDGES = (() => {
    const r = rng(7),
      out: { pts: [number, number][]; front: boolean }[] = [];
    for (const front of [false, true]) {
      const pts: [number, number][] = [[-20 * u, hz]];
      let x = -20 * u;
      while (x < W + 20 * u) {
        x += (front ? 70 + r() * 90 : 90 + r() * 120) * u;
        const edge = Math.abs(x - cx) / (W / 2); // lower in the middle so the sun shows
        const h = (front ? 18 + r() * 44 : 34 + r() * 86) * u * (0.35 + 0.8 * edge) * (SQ ? 1.1 : 1);
        pts.push([x, hz - h]);
      }
      pts.push([x, hz]);
      out.push({ pts, front });
    }
    return out;
  })();
  const mountains = (ctx: Ctx, F: number) => {
    const up = spring((F - PUNCH.ridge) / FPS, { freq: 3, damp: 0.55 });
    if (up <= 0) return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, hz);
    ctx.clip();
    for (const { pts, front } of RIDGES) {
      const dy = (1 - (front ? spring((F - PUNCH.ridge - 6) / FPS, { freq: 3, damp: 0.55 }) : up)) * 140 * u;
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y + dy) : ctx.moveTo(x, y + dy)));
      ctx.closePath();
      ctx.fillStyle = front ? C.ground : C.surface;
      ctx.fill();
      // the wireframe: every peak drops a facet line to the valleys either side
      neon(ctx, C.accent2, front ? 0.55 : 0.8, 0.28, (c) => {
        c.beginPath();
        pts.forEach(([x, y], i) => (i ? c.lineTo(x, y + dy) : c.moveTo(x, y + dy)));
        c.stroke();
      });
      ctx.save();
      ctx.globalAlpha = 0.45;
      ctx.strokeStyle = C.accent2;
      ctx.lineWidth = 1 * u;
      ctx.beginPath();
      for (let i = 1; i < pts.length - 1; i++) {
        const [x, y] = pts[i]!,
          [xa] = pts[i - 1]!,
          [xb] = pts[i + 1]!;
        ctx.moveTo(x, y + dy);
        ctx.lineTo((x + xa) / 2 + (x - xa) * 0.15, hz);
        ctx.moveTo(x, y + dy);
        ctx.lineTo((x + xb) / 2, hz);
      }
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  };

  // the camera: height in grid cells above the floor (it drops for the drive)
  const camH = (F: number) =>
    lerp(lerp(2.8, 1.6, ease.inOutCubic(prog(F, 720, 780))), 2.3, ease.inOutCubic(prog(F, 1008, 1100))) *
    // the lurch as the mountains slam up: the camera jumps up, then springs back down
    (F >= PUNCH.ridge ? 1 + 0.3 * (1 - spring((F - PUNCH.ridge) / FPS, { freq: 2.4, damp: 0.5 })) : 1);
  const floorY = (F: number, z: number) => hz + (focal * camH(F)) / z;
  const floor = (ctx: Ctx, F: number) => {
    const g = ctx.createLinearGradient(0, hz, 0, H);
    g.addColorStop(0, C.surface);
    g.addColorStop(1, C.ground);
    ctx.fillStyle = C.deep;
    ctx.fillRect(0, hz, W, H - hz);
    ctx.save();
    ctx.globalAlpha = F >= PUNCH.world ? 1 : 0;
    ctx.fillStyle = g;
    ctx.fillRect(0, hz, W, H - hz);
    ctx.restore();
    const ga = F >= PUNCH.world ? 1 : 0;
    if (ga <= 0) return;
    const h = camH(F),
      zNear = (focal * h) / (H - hz),
      zFar = 70,
      ph = dist(F) % 1;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, hz, W, H - hz);
    ctx.clip();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "butt";
    // horizontal lines at depths n + 1 − phase: they rush toward the camera forever
    for (let n = Math.floor(zNear) - 1; n < zFar; n++) {
      const z = n + 1 - ph;
      if (z < zNear * 0.98) continue;
      const y = floorY(F, z),
        a = ga * clamp((zFar - z) / (zFar * 0.75)) ** 1.6,
        k = clamp(zNear / z + 0.25, 0.3, 1);
      for (const [w, al] of [
        [7 * k, 0.16],
        [2 * k, 0.9],
      ] as const) {
        ctx.globalAlpha = a * al;
        ctx.fillStyle = C.accent;
        ctx.fillRect(0, y - (w * u) / 2, W, w * u);
      }
    }
    // vertical lines converging to the vanishing point
    const cols = Math.ceil(((W / 2) * zNear) / focal) + 2;
    for (let i = -cols; i <= cols; i++) {
      const xb = vx + (focal * i) / zNear;
      for (const [w, al] of [
        [7, 0.14],
        [2, 0.85],
      ] as const) {
        const lg = ctx.createLinearGradient(0, hz, 0, H);
        lg.addColorStop(0, rgba(C.accent, 0));
        lg.addColorStop(0.25, rgba(C.accent, ga * al * 0.7));
        lg.addColorStop(1, rgba(C.accent, ga * al));
        ctx.globalAlpha = 1;
        ctx.strokeStyle = lg;
        ctx.lineWidth = w * u;
        ctx.beginPath();
        ctx.moveTo(vx, hz);
        ctx.lineTo(xb, H);
        ctx.stroke();
      }
    }
    ctx.restore();
    // a dark haze at the horizon so the far lines melt instead of shimmering
    const haze = ctx.createLinearGradient(0, hz, 0, hz + 44 * u);
    haze.addColorStop(0, mix(C.surface, C.accent, 0.25));
    haze.addColorStop(1, rgba(C.surface, 0));
    ctx.fillStyle = haze;
    ctx.globalAlpha = ga;
    ctx.fillRect(0, hz, W, 44 * u);
    ctx.globalAlpha = 1;
  };
  // the ignition line, which stays on as the horizon
  const horizonLine = (ctx: Ctx, F: number) => {
    const keys: [number, number][] = [
      [0, 0],
      [3, 0.14],
      [9, 0.14],
      [12, 0.42],
      [19, 0.42],
      [22, 0.7],
      [27, 0.72],
      [34, 1],
    ];
    let p = 1;
    for (let i = 1; i < keys.length; i++) {
      const [fa, va] = keys[i - 1]!,
        [fb, vb] = keys[i]!;
      if (F < fb) {
        p = F < fa ? va : lerp(va, vb, ease.outCubic((F - fa) / (fb - fa)));
        break;
      }
    }
    if (F < 0) return;
    // the tube keeps catching and dropping at uneven moments until the world has rolled in
    const on = LINE_DROPS.includes(Math.floor(F)) ? 0.12 : 1,
      a = on * lerp(1, 0.75, prog(F, 36, 120)) * (0.86 + 0.14 * hash(311 + Math.floor(F))), // the tube hums
      half = (W / 2 + 20 * u) * p;
    neon(ctx, C.accent2, a, 1, (c) => {
      c.beginPath();
      c.moveTo(vx - half, hz);
      c.lineTo(vx + half, hz);
      c.stroke();
    });
  };

  // ---- palms: silhouettes in deep, placed along the road; x = vx ± offset / z (true parallax)
  const PALMS: Palm[] = (() => {
    const r = rng(19),
      out: Palm[] = [];
    const start = dist(726),
      stop = dist(1000) - 44;
    for (let i = 0, t = start; t < stop; i++, t += 5.5 + r() * 3) {
      const side = i % 2 ? 1 : -1;
      out.push({ at: t, side, x: (SQ ? 4.8 : 5.4) + r() * 1.6, h: 5.4 + r() * 1.8, lean: 0.1 + r() * 0.12, seed: i });
    }
    return out;
  })();
  const ZSPAWN = 46;
  const palmShape = (ctx: Ctx, bx: number, by: number, hgt: number, side: number, lean: number, seed: number) => {
    const r = rng(100 + seed),
      top: [number, number] = [bx + side * lean * hgt, by - hgt];
    ctx.fillStyle = C.deep;
    // a segmented, curved trunk
    const seg = 10,
      at = (t: number): [number, number] => [bx + side * lean * hgt * t * t, by - hgt * t],
      wd = (t: number) => hgt * (0.034 - 0.014 * t);
    for (let i = 0; i < seg; i++) {
      const t0 = i / seg,
        t1 = (i + 1) / seg,
        [x0, y0] = at(t0),
        [x1, y1] = at(t1 + 0.004);
      ctx.beginPath();
      ctx.moveTo(x0 - wd(t0), y0);
      ctx.lineTo(x0 + wd(t0), y0);
      ctx.lineTo(x1 + wd(t1) * 0.8, y1);
      ctx.lineTo(x1 - wd(t1) * 0.8, y1);
      ctx.closePath();
      ctx.fill();
    }
    // 7 drooping fronds, each a tapered, notched polygon
    const fronds = 7;
    for (let f = 0; f < fronds; f++) {
      const ang = lerp(-Math.PI * 0.97, -Math.PI * 0.03, f / (fronds - 1)) + (r() - 0.5) * 0.18,
        len = hgt * (0.36 + r() * 0.1),
        droop = 0.75 + 0.5 * Math.abs(Math.cos(ang));
      const pt = (t: number): [number, number] => [
        top[0] + Math.cos(ang) * len * t,
        top[1] + Math.sin(ang) * len * t + droop * len * t * t,
      ];
      const steps = 20,
        upper: [number, number][] = [],
        lower: [number, number][] = [];
      for (let s = 0; s <= steps; s++) {
        const t = s / steps,
          [x, y] = pt(t),
          [x2, y2] = pt(Math.min(1, t + 0.02)),
          [x1, y1] = pt(Math.max(0, t - 0.02)),
          dx = x2 - x1,
          dy = y2 - y1,
          l = Math.hypot(dx, dy) || 1,
          nx = -dy / l,
          ny = dx / l,
          w = len * 0.1 * Math.sin(Math.PI * Math.min(1, t * 1.15)) ** 0.8,
          notch = s % 2 ? 0.6 : 1;
        upper.push([x + nx * w * 0.35, y + ny * w * 0.35]);
        lower.push([x - nx * w * notch, y - ny * w * notch]);
      }
      ctx.beginPath();
      [...upper, ...lower.reverse()].forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      ctx.fill();
    }
  };
  const palms = (ctx: Ctx, F: number) => {
    if (F < 720 || F > 1100) return;
    const d = dist(F),
      h = camH(F);
    const vis = PALMS.map((p) => ({ p, z: ZSPAWN - (d - p.at) })).filter(({ z }) => z > 0.6 && z <= ZSPAWN);
    vis.sort((a, b) => b.z - a.z);
    for (const { p, z } of vis) {
      const x = vx + (p.side * focal * p.x) / z,
        y = hz + (focal * h) / z,
        hgt = (focal * p.h) / z;
      if (Math.abs(x - vx) - hgt * 0.6 > W / 2) continue;
      ctx.save();
      ctx.globalAlpha = clamp((ZSPAWN - z) / 8);
      palmShape(ctx, x, y, hgt, p.side, p.lean, p.seed);
      ctx.restore();
    }
  };

  // ---- the title: LUMEN in neon tubes, LANE in chrome
  const TRACK = 0.04;
  const sizeA = (ctx: Ctx) => (SQ ? (0.8 * W) / (glyphs(ctx, "LUMEN", 100, TRACK).w / 100) : 176 * u);
  const sizeB = (ctx: Ctx) => (SQ ? sizeA(ctx) * 1.02 : 210 * u);
  const CAP = 0.727; // Inter's cap height, in em
  const GAP = 0.2; // between the words, in em of LUMEN
  const titleH = (ctx: Ctx) => sizeA(ctx) * (CAP + GAP) + sizeB(ctx) * CAP;
  const DROP = 3; // the letter that keeps a rare dropout
  const lumen = (ctx: Ctx, F: number, scale: number) => {
    const sa = sizeA(ctx),
      { gl, w } = glyphs(ctx, "LUMEN", sa, TRACK),
      x0 = -w / 2,
      base = sa * CAP;
    const hum = 0.92 + 0.08 * (0.5 + 0.5 * Math.sin(F * 2.3) * Math.sin(F * 0.71));
    const L0 = gl[0]!,
      N4 = gl[4]!;
    // the glyph bodies are cut away, and so are two short breaks where a real tube bends back
    const cut = (c: Ctx) => {
      gl.forEach((g) => c.fillText(g.ch, x0 + g.x, base));
      c.fillRect(x0 + L0.x - sa * 0.04, base - sa * 0.42, sa * 0.1, sa * 0.05);
      c.fillRect(x0 + N4.x + N4.w - sa * 0.04, base - sa * 0.24, sa * 0.1, sa * 0.05);
    };
    const lit = gl.map((g, i) => {
      let on = ignite(F, STRIKES[i]!, i * 3 + 1);
      if (i === DROP && F > T.slam + 20 && hash(900 + Math.floor(F / 3)) < 0.022) on = 0;
      return on;
    });
    ctx.save();
    font(ctx, sa);
    ctx.textBaseline = "alphabetic";
    // the unlit glass, visible just before the tubes catch
    const glass = prog(F, T.title - 20, T.title);
    if (glass > 0 && lit.some((o) => !o))
      cutStroke(
        ctx,
        [[5 * u, mix(C.line, C.muted, 0.25), glass]],
        "source-over",
        (c) => gl.forEach((g, i) => !lit[i] && c.strokeText(g.ch, x0 + g.x, base)),
        cut,
      );
    if (lit.some(Boolean))
      // the tubes thicken as the title shrinks, so the core stays about 4 px on screen in the drive
      neonText(
        ctx,
        C.accent2,
        hum,
        lerp(1, 2.6, clamp((1 - scale) / 0.56)),
        (c) => gl.forEach((g, i) => lit[i] && c.strokeText(g.ch, x0 + g.x, base)),
        cut,
      );
    ctx.restore();
  };
  const lane = (ctx: Ctx, F: number, y0: number) => {
    if (F < T.slam) return;
    const sb = sizeB(ctx),
      { gl, w } = glyphs(ctx, "LANE", sb, TRACK * 0.5),
      x0 = -w / 2,
      cap = sb * CAP,
      base = y0 + cap;
    const k = 1 + 0.15 * (1 - spring((F - T.slam) / FPS, { freq: 3.2, damp: 0.55 }));
    ctx.save();
    ctx.globalAlpha = 1; // a slam: it is simply there, big, and settles
    ctx.translate(0, base - cap / 2);
    ctx.scale(k, k);
    ctx.translate(0, -(base - cap / 2));
    font(ctx, sb);
    ctx.lineJoin = "round";
    const each = (fn: (ch: string, x: number) => void) => gl.forEach((g) => fn(g.ch, x0 + g.x));
    // a hard deep shadow keeps the chrome off whatever sits behind it
    ctx.fillStyle = C.deep;
    each((ch, x) => ctx.fillText(ch, x + 5 * u, base + 7 * u));
    // a deep keyline keeps the chrome off the sun behind it
    ctx.strokeStyle = C.deep;
    ctx.lineWidth = 22 * u;
    each((ch, x) => ctx.strokeText(ch, x, base));
    // the thin pink outer stroke and the 2 px ink outline (drawn under the fill: only their outer halves show)
    ctx.strokeStyle = C.accent;
    ctx.lineWidth = 12 * u;
    each((ch, x) => ctx.strokeText(ch, x, base));
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 4 * u;
    each((ch, x) => ctx.strokeText(ch, x, base));
    // the hard-banded chrome
    const g = ctx.createLinearGradient(0, base - cap, 0, base);
    const band = (t: number, c: string) => g.addColorStop(t, c);
    band(0, mix(C.accent2, C.ink, 0.6));
    band(0.3, mix(C.accent2, C.ink, 0.85));
    band(0.47, C.ink);
    band(0.5, C.ink);
    band(0.5, C.deep);
    band(0.57, C.s3);
    band(0.57, C.s2);
    band(1, C.s1);
    ctx.fillStyle = g;
    each((ch, x) => ctx.fillText(ch, x, base));
    ctx.restore();
    // a four-point star glint slides across once
    const gp = prog(F, T.slam + 14, T.slam + 62);
    if (gp > 0 && gp < 1) {
      const gx = lerp(x0 - 20 * u, x0 + w + 20 * u, ease.inOutCubic(gp)),
        gy = base - cap * 0.78,
        s = sb * 0.16 * Math.sin(Math.PI * gp);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = C.ink;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4,
          r = i % 2 ? s * 0.14 : s;
        ctx.lineTo(gx + Math.cos(a) * r, gy + Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 0.25;
      ctx.beginPath();
      ctx.arc(gx, gy, s * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  };
  // where the title block sits (anchor = the centre of LUMEN's cap top) and its scale, over the film
  const titlePose = (ctx: Ctx, F: number) => {
    const th = titleH(ctx),
      wA = glyphs(ctx, "LUMEN", sizeA(ctx), TRACK).w;
    const big = { x: cx, y: SQ ? 92 * u : 80 * u, s: 1 };
    const push = 1 + 0.025 * prog(F, T.title, T.drive); // a slow push-in through the hold
    const sd = SQ ? 0.4 : 0.44,
      small = { x: m + 14 * u + (wA * sd) / 2, y: SQ ? 124 * u : 132 * u, s: sd };
    const sl = SQ ? 0.5 : 0.6,
      lock = { x: cx, y: SQ ? 84 * u : 78 * u, s: sl };
    const a = ease.inOutCubic(prog(F, T.drive, T.drive + 48)),
      b = ease.inOutCubic(prog(F, 1044, 1100));
    const pose = {
      x: lerp(lerp(big.x, small.x, a), lock.x, b),
      y: lerp(lerp(big.y, small.y, a), lock.y, b),
      s: lerp(lerp(big.s * push, small.s, a), lock.s, b),
    };
    return { ...pose, h: th * pose.s };
  };
  const title = (ctx: Ctx, F: number) => {
    if (F < T.title - 20) return;
    const p = titlePose(ctx, F),
      sa = sizeA(ctx);
    const shake = F >= T.slam && F < T.slam + 10 ? Math.sin(F * 2.7) * 5 * u * (1 - (F - T.slam) / 10) : 0;
    ctx.save();
    ctx.translate(p.x, p.y + shake);
    ctx.scale(p.s, p.s);
    lumen(ctx, F, p.s);
    lane(ctx, F, sa * (CAP + GAP));
    ctx.restore();
    // the tagline under both, never scaled (it stays readable)
    const tA = F < T.drive ? prog(F, 612, 614) : prog(F, 1100, 1102);
    const tOut = F < T.drive ? 1 - prog(F, T.drive, T.drive + 12) : 1;
    const shown = F < T.drive ? Math.floor((F - 612) / 1.5) : Math.floor((F - 1100) / 1.5);
    const s = "a night-drive mixtape".slice(0, clamp(shown, 0, 21));
    const ty = p.y + p.h + (26 + 28 * p.s) * u,
      tpx = 32 * u;
    if (tA * tOut > 0 && s && SQ) {
      ctx.save();
      font(ctx, tpx, F_.mono, 500);
      const pw = ctx.measureText("a night-drive mixtape").width + 21 * 0.08 * tpx + 48 * u;
      ctx.restore();
      ctx.fillStyle = rgba(C.deep, 0.55 * tA * tOut);
      ctx.beginPath();
      ctx.roundRect(cx - pw / 2, ty - 36 * u, pw, 52 * u, 26 * u);
      ctx.fill();
    }
    if (tA * tOut > 0 && s)
      text(ctx, s, p.x, ty, {
        size: tpx,
        family: F_.mono,
        weight: 500,
        color: C.ink,
        align: "center",
        track: 0.08,
        alpha: tA * tOut,
      });
  };

  // ---- small neon mono (tracklist, pill): glow strokes behind a light fill core
  const neonMono = (
    ctx: Ctx,
    s: string,
    x: number,
    y: number,
    px: number,
    color: string,
    a: number,
    align: "left" | "center" = "left",
  ) => {
    if (a <= 0) return;
    ctx.save();
    font(ctx, px, F_.mono, 500);
    (ctx as Ctx & { letterSpacing: string }).letterSpacing = `${0.02 * px}px`;
    const w = ctx.measureText(s).width,
      lx = align === "center" ? x - w / 2 : x;
    ctx.textBaseline = "alphabetic";
    neon(ctx, color, a, 0.5, (c) => c.strokeText(s, lx, y));
    ctx.globalAlpha = a;
    ctx.fillStyle = mix(color, C.ink, 0.7);
    ctx.fillText(s, lx, y);
    ctx.restore();
  };
  const tracklist = (ctx: Ctx, F: number) => {
    if (F < TRACK_ON[0]! || F > 1080) return;
    const px = (SQ ? 38 : 42) * u,
      lh = px * 1.5;
    // landscape: a column at the right; square: under the title, over the grid on a dark band
    const x = SQ ? m + 24 * u : W - m - 560 * u,
      y0 = SQ ? hz + 96 * u : 196 * u;
    if (SQ) {
      const a = Math.min(prog(F, TRACK_ON[0]! - 12, TRACK_ON[0]!), 1 - prog(F, 1062, 1080));
      ctx.fillStyle = rgba(C.deep, 0.62 * a);
      ctx.fillRect(0, y0 - px * 1.6, W, lh * 4 + px * 1.3);
    }
    TRACKS.forEach((s, i) => {
      const a = ignite(F, TRACK_ON[i]!, 20 + i, 14) * quench(F, TRACK_OFF[i]!, 30 + i);
      neonMono(ctx, s, x, y0 + i * lh, px, C.accent, a);
    });
  };

  // ---- the cassette: it draws itself on (dash reveal), then its reels turn
  const drawOn = (ctx: Ctx, path: Path2D, len: number, p: number, color: string, k: number) => {
    if (p <= 0) return;
    neon(ctx, color, 1, k, (c) => {
      c.setLineDash([len * p, len * 2]);
      c.stroke(path);
    });
  };
  const rrPath = (x: number, y: number, w: number, h: number, r: number) => {
    const p = new Path2D();
    p.moveTo(x + w / 2, y);
    p.arcTo(x + w, y, x + w, y + h, r);
    p.arcTo(x + w, y + h, x, y + h, r);
    p.arcTo(x, y + h, x, y, r);
    p.arcTo(x, y, x + w, y, r);
    p.closePath();
    return p;
  };
  const cassette = (ctx: Ctx, F: number) => {
    if (F < 1080) return;
    const w = (SQ ? 340 : 380) * u,
      h = w * 0.6,
      pose = titlePose(ctx, F),
      top = pose.y + pose.h + (SQ ? 76 : 84) * u,
      x = cx - w / 2,
      r = w * 0.05;
    const pb = ease.inOutCubic(prog(F, 1080, PUNCH.body)),
      pw = ease.inOutCubic(prog(F, 1110, 1160)),
      pr = ease.outCubic(prog(F, 1136, 1180)),
      pt = ease.inOutCubic(prog(F, 1156, 1190));
    // the body is filled deep so it reads in front of the sun
    ctx.save();
    ctx.globalAlpha = F >= PUNCH.body ? 0.92 : 0; // no half-lit body over the sun: it snaps on as the outline closes
    ctx.fillStyle = C.deep;
    ctx.fill(rrPath(x, top, w, h, r));
    ctx.restore();
    drawOn(ctx, rrPath(x, top, w, h, r), 2 * (w + h), pb, C.accent, 0.62);
    const wx = x + w * 0.1,
      wy = top + h * 0.14,
      ww = w * 0.8,
      wh = h * 0.46;
    drawOn(ctx, rrPath(wx, wy, ww, wh, wh * 0.18), 2 * (ww + wh), pw, C.accent, 0.45);
    // the tape head: a trapezoid at the bottom
    const tp = new Path2D();
    tp.moveTo(x + w * 0.2, top + h);
    tp.lineTo(x + w * 0.27, top + h * 0.76);
    tp.lineTo(x + w * 0.73, top + h * 0.76);
    tp.lineTo(x + w * 0.8, top + h);
    drawOn(ctx, tp, w * 0.9, pt, C.accent, 0.4);
    // two reels whose spokes turn
    const rr = wh * 0.3,
      spin = Math.max(0, F - 1150) * 0.05 + (F >= T.end ? (F - T.end) * 0.03 : 0);
    for (const sx of [-1, 1]) {
      const rx = cx + sx * w * 0.21,
        ry = wy + wh / 2;
      const ring = new Path2D();
      ring.arc(rx, ry, rr, -Math.PI / 2, Math.PI * 1.5);
      drawOn(ctx, ring, Math.PI * 2 * rr, pr, C.accent2, 0.45);
      if (pr > 0.6) {
        const spokes = new Path2D();
        for (let i = 0; i < 6; i++) {
          const a = spin + (i * Math.PI) / 3;
          spokes.moveTo(rx + Math.cos(a) * rr * 0.22, ry + Math.sin(a) * rr * 0.22);
          spokes.lineTo(rx + Math.cos(a) * rr * 0.62, ry + Math.sin(a) * rr * 0.62);
        }
        neon(ctx, C.accent2, prog(pr, 0.6, 1), 0.36, (c) => c.stroke(spokes));
      }
    }
    // the tape between the reels
    const tape = new Path2D();
    tape.moveTo(cx - w * 0.21 + rr, wy + wh / 2 + rr * 0.9);
    tape.lineTo(cx + w * 0.21 - rr, wy + wh / 2 + rr * 0.9);
    drawOn(ctx, tape, w * 0.3, pr, C.accent2, 0.3);
    // the SIDE A pill: beside it (landscape) or stacked under it (square)
    const pa = ignite(F, 1188, 61, 12);
    if (pa > 0) {
      const px = 26 * u,
        pwid = 150 * u,
        ph = 50 * u,
        pX = SQ ? cx - pwid / 2 : x + w + 40 * u,
        pY = SQ ? Math.max(top + h + 24 * u, hz + 26 * u) : top + h / 2 - ph / 2;
      neon(ctx, C.accent2, pa, 0.4, (c) => c.stroke(rrPath(pX, pY, pwid, ph, ph / 2)));
      neonMono(ctx, "SIDE A", pX + pwid / 2, pY + ph / 2 + px * 0.36, px, C.accent2, pa, "center");
    }
    // PRESS PLAY blinks on every beat under the cassette
    if (F >= T.end) {
      const b = Math.floor((F - T.end) / 36),
        l = (F - T.end) % 36,
        on = b >= 3 ? 1 : l < 24 ? 1 : 0;
      const ppY = hz + (SQ ? 150 : 104) * u,
        pp = 54 * u;
      if (on) {
        ctx.save();
        font(ctx, pp);
        (ctx as Ctx & { letterSpacing: string }).letterSpacing = `${0.12 * pp}px`;
        const tw = ctx.measureText("PRESS PLAY").width - 0.12 * pp;
        neonText(
          ctx,
          C.accent2,
          1,
          0.55,
          (c) => c.strokeText("PRESS PLAY", cx - tw / 2, ppY),
          (c) => c.fillText("PRESS PLAY", cx - tw / 2, ppY),
        );
        ctx.restore();
      }
    }
  };

  // ---- the HUD line, top left
  const hud = (ctx: Ctx, F: number) => {
    const a = prog(F, PUNCH.surge, PUNCH.surge + 12);
    if (a <= 0) return;
    const secs = Math.max(0, Math.floor((F - T.title) / FPS));
    const s = `SIDE A · 00:${String(secs).padStart(2, "0")}`;
    const n = Math.floor((F - PUNCH.surge) / 2);
    text(ctx, s.slice(0, clamp(n, 0, s.length)), m, SQ ? H - L.safe.bottom : L.safe.top + 22 * u, {
      size: 24 * u,
      family: F_.mono,
      weight: 500,
      color: C.muted,
      track: 0.1,
    });
  };

  // a thin scanline overlay: every 3rd row, 6% black
  const scanlines = (ctx: Ctx) => {
    ctx.fillStyle = "rgba(0,0,0,0.06)";
    for (let y = 0; y < H; y += 3 * u) ctx.fillRect(0, y, W, u);
  };

  const paint = (ctx: Ctx, env: Env, F: number) => {
    F = clamp(F, 0, N - 1);
    ENV = env;
    ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    sky(ctx, F);
    sun(ctx, F);
    mountains(ctx, F);
    floor(ctx, F);
    horizonLine(ctx, F);
    sunFlare(ctx, F);
    palms(ctx, F);
    tracklist(ctx, F);
    title(ctx, F);
    cassette(ctx, F);
    hud(ctx, F);
    // two punches: the chrome slam and the kick into the drive light the whole frame for a moment
    // punches light the whole frame for a moment: pink for the world, cyan for the neon
    const pop = (at: number, peak: number, len: number) => (F >= at ? peak * (1 - prog(F, at, at + len)) ** 2 : 0);
    const flash =
      pop(PUNCH.world, 0.34, 16) +
      pop(PUNCH.ridge, 0.24, 12) +
      pop(PUNCH.surge, 0.22, 12) +
      pop(T.slam, 0.32, 14) +
      pop(T.drive, 0.22, 12) +
      pop(PUNCH.driveSurge, 0.2, 12);
    const bloom = pop(T.title, 0.26, 12) + pop(T.end, 0.24, 14);
    for (const [a, c] of [
      [flash, mix(C.accent, C.ink, 0.35)],
      [bloom, mix(C.accent2, C.ink, 0.3)],
    ] as const) {
      if (a <= 0) continue;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = a;
      ctx.fillStyle = c;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    // the sun's last stripe flares on the beat as it slips under the horizon
    const warm = F >= FLARE ? 0.3 * (1 - prog(F, FLARE, FLARE + 20)) ** 2 : 0;
    if (warm > 0) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = warm;
      ctx.fillStyle = C.s2;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    // a brownout as the tracklist switches off: the whole sign dips, unevenly
    if (BROWNOUT.includes(Math.floor(F))) {
      ctx.fillStyle = rgba(C.deep, 0.55);
      ctx.fillRect(0, 0, W, H);
    }
    scanlines(ctx);
  };

  const cuts = [0, T.world, T.title, T.drive, T.lockup, T.end, N],
    names = ["ignition", "world", "title", "drive", "lockup", "end"];
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
    audio: beatScore({
      frames: N,
      fps: FPS,
      bpm: BPM,
      mood: "drive",
      drop: T.title,
      hits: [PUNCH.world, PUNCH.ridge, T.slam],
      whooshes: [PUNCH.surge, T.drive, PUNCH.driveSurge],
      ticks: [0, 2, 11, 21, ...STRIKES.flatMap((f) => [f, f + 2]), ...TRACK_ON, PUNCH.body, ...BLINKS],
      sign: T.end,
      gain: 0.9,
    }),
  };
}

export const neonDrive = make("landscape", "neonDrive");
export const neonDriveSquare = make("square", "neonDriveSquare");
