// STUDY 30 · GLITCH SIGNAL (20 s, 30 fps). A late-night transmission from an invented station, Relay 7, that breaks
// up and recovers: colour bars, a host who says good evening, a breakup, a freeze that melts, a flat blue "signal
// lost" card, snow while the set searches, and the signal found again. No product: every name is invented.
// One source, designed for vertical and landscape. Brand: the neutral pack, palette "glitch".
// Brief: series/studies/briefs/glitch-signal.json · prompt: series/studies/prompts/glitch-signal.prompt.md
//
// Two layers, always. A CLEAN SCENE is painted each frame into one offscreen canvas; a GLITCH PASS redraws it onto
// the frame. Every random choice in the glitch pass is a seeded hash of a HELD index h = floor(frame / hold), taken
// from the ROUNDED frame, so the sub-frame samples of motion blur agree and a glitch holds for a few frames like a
// real one. Its strength is an envelope g(frame) set per story beat. Nothing is simulated: the datamosh smear is a
// closed-form function of (F − F0), the pixel sort and the snow are recomputed from the frame alone.
import PACK from "../../../brand/packs/studio/pack.json";
import { rng, type Ctx, type Env, type Layer } from "../core";
import type { Film, Shot } from "../film";
import { motionBlur } from "../kit/blur";
import { clamp, ease, lerp, prog, spring } from "../kit/motion";
import { usePack } from "../kit/pack";
import { beatScore } from "../kit/score";
import { layout, type Size } from "../kit/sizes";
import { letters, measure, text } from "../kit/type";

const P = usePack(PACK),
  C = P.palette("glitch"),
  F_ = P.face;
const FPS = 30,
  BPM = 120,
  N = 600,
  BEAT = 15; // a beat is 15 frames, a bar 60
// the timeline, in frames (every cut on a beat)
const T = { host: 90, breakup: 180, melt: 300, lost: 390, search: 450, found: 540 };
/** the big glitch spikes: the picture holds for HOLD frames before each (and the sound drops out), then explodes */
const SPIKES = [180, 240, 300],
  HOLD = 3;
/** 'clearly.' stutters: 'cle' · 'cle' · 'clearly.', three frames each */
const STUTTERS = [195, 225, 255, 285];
/** the small beat glitches in the host beat (two frames each) */
const TICKS = [105, 135, 165];
/** the tuner blanks the picture for three frames each time the search steps a channel */
const BLANKS = [465, 480, 495],
  BLANK = 3;
const blankAt = (f: number) => BLANKS.some((b) => f >= b && f < b + BLANK);

// the seventh bar is a magenta mixed from the pack's red and blue (every colour comes from the pack)
const rgbOf = (s: string) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
const mix = (a: string, b: string, t: number) => {
  const A = rgbOf(a),
    B = rgbOf(b);
  return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i]!, t))).join(",")})`;
};
const MAGENTA = mix(C.accent, C.s3, 0.42);
const BARS = [C.ink, C.s2, C.accent2, C.s1, MAGENTA, C.accent, C.s3];
const REVERSED = [C.s3, C.deep, MAGENTA, C.deep, C.accent2, C.deep, C.ink];

/** a seeded integer hash in [0, 1): the only source of glitch randomness */
const hash = (a: number, b = 0, c = 0, d = 0) => {
  let h = 0x2c1b3c6d ^ Math.imul(a | 0, 0x27d4eb2d);
  h = Math.imul(h ^ (h >>> 15) ^ Math.imul(b | 0, 0x165667b1), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13) ^ Math.imul(c | 0, 0x3c6ef372), 0xc2b2ae35);
  h = Math.imul(h ^ (h >>> 16) ^ Math.imul(d | 0, 0x7feb352d), 0x846ca68b);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};
const mod = (a: number, b: number) => ((a % b) + b) % b;

/** the glitch intensity g(frame), per story beat */
const G = (f: number) =>
  f < T.host
    ? 0
    : f < T.breakup
      ? 0.1
      : f < T.melt
        ? lerp(0.3, 0.9, (f - T.breakup) / (T.melt - T.breakup))
        : f < T.lost
          ? 0.7
          : f < 420
            ? 0.12
            : f < T.search
              ? 0.35
              : f < T.found
                ? lerp(0.5, 0.05, prog(f, T.search, 535))
                : 0.05;
/** the frame whose picture is held, during the HOLD frames before a spike (null when the picture runs) */
const heldAt = (f: number) => {
  for (const s of SPIKES) if (f >= s - HOLD && f < s) return s - HOLD;
  return null;
};
const spikeAt = (f: number) => SPIKES.some((s) => f >= s - HOLD && f < s + HOLD);

/** a late-night timecode that counts real frames (HH:MM:SS:FF) */
const timecode = (f: number) => {
  const tot = ((23 * 60 + 58) * 60 + 41) * FPS + Math.floor(f),
    s = Math.floor(tot / FPS);
  return [Math.floor(s / 3600) % 24, Math.floor(s / 60) % 60, s % 60, tot % FPS]
    .map((v) => String(v).padStart(2, "0"))
    .join(":");
};

export function make(size: Size, id: string): Film {
  const L = layout(size),
    { W, H, u, cx, cy, tall } = L;
  const M = L.safe.x,
    yTop = L.safe.top + 52 * u, // chrome baselines, inside the safe area
    yBot = H - L.safe.bottom - 26 * u;
  // the test card: seven bars, a strip of reversed bars, a black pluge band holding the lower strip
  const barsH = (tall ? 1344 : 720) * u,
    revH = (tall ? 96 : 70) * u,
    plugeY = barsH + revH,
    stripY = plugeY + 12 * u,
    stripH = (tall ? 80 : 72) * u;
  const MONO = 28 * u,
    STRIP = (tall ? 44 : 40) * u; // the lower strip is the first thing to read, so it is larger than the chrome
  const monoO = (color: string, sz = MONO) => ({ size: sz, family: F_.mono, weight: 500, color, track: 0.04 });

  /** mono chrome, optionally on a black plate so it reads over any bar */
  const mono = (
    c: Ctx,
    s: string,
    x: number,
    y: number,
    align: "left" | "right" | "center" = "left",
    color: string = C.ink,
    plate?: string,
    sz = MONO,
  ) => {
    const o = monoO(color, sz),
      w = measure(c, s, o),
      left = align === "right" ? x - w : align === "center" ? x - w / 2 : x;
    if (plate) {
      c.fillStyle = plate;
      c.fillRect(left - 14 * u, y - sz * 0.73 - 12 * u, w + 28 * u, sz * 0.73 + 24 * u);
    }
    text(c, s, left, y, o);
    return w;
  };

  // ---- station chrome: 'RELAY 7' with an on-air lamp, the running timecode, 'CH 07'
  const chrome = (c: Ctx, F: number, tcF: number | null, plate?: string) => {
    const lamp = 14 * u,
      w = measure(c, "RELAY 7", monoO(C.ink));
    if (plate) {
      c.fillStyle = plate;
      c.fillRect(M - 14 * u, yTop - MONO * 0.73 - 12 * u, w + 28 * u + lamp + 18 * u, MONO * 0.73 + 24 * u);
    }
    mono(c, "RELAY 7", M, yTop);
    // the lamp is lit on every other beat while the signal runs
    if (tcF !== null && Math.floor(F / BEAT) % 2 === 0) {
      c.fillStyle = C.accent;
      c.fillRect(M + w + 18 * u, yTop - MONO * 0.73 + 3 * u, lamp, lamp);
    }
    mono(c, tcF === null ? "--:--:--:--" : timecode(tcF), W - M, yTop, "right", C.ink, plate);
    mono(c, "CH 07", M, yBot, "left", C.ink, plate);
  };

  // ---- the colour bars (a test card); roll shifts the whole picture vertically, as a lost vertical hold does
  const bars = (
    c: Ctx,
    F: number,
    o: { tcF: number | null; strip?: number; push?: number; roll?: number; hum?: number },
  ) => {
    const card = () => {
      c.save();
      const k = o.push ?? 1;
      c.translate(cx, cy);
      c.scale(k, k);
      c.translate(-cx, -cy);
      BARS.forEach((col, i) => {
        const x0 = Math.round((W * i) / 7),
          x1 = Math.round((W * (i + 1)) / 7);
        c.fillStyle = col;
        c.fillRect(x0, -40 * u, x1 - x0, barsH + 40 * u);
        c.fillStyle = REVERSED[i]!;
        c.fillRect(x0, barsH, x1 - x0, revH);
      });
      c.fillStyle = C.deep;
      c.fillRect(-40 * u, plugeY, W + 80 * u, H - plugeY + 40 * u);
      // pluge patches: a white patch, then blacks just under and just over black
      const pY = stripY + stripH + 20 * u,
        spans: [number, string][] = [
          [2, C.ink],
          [1, C.deep],
          [0.6, C.ground],
          [0.6, C.deep],
          [0.6, C.surface],
          [1.2, C.deep],
        ];
      let x = W * 0.5;
      const unit = (W * 0.5) / 6;
      for (const [n, col] of spans) {
        c.fillStyle = col;
        c.fillRect(x, pY, n * unit + 1, H - pY + 40 * u);
        x += n * unit;
      }
      c.restore();
      // the lower strip, typed on
      c.fillStyle = C.surface;
      c.fillRect(0, stripY, W, stripH);
      const s = "NIGHT TRANSMISSION",
        shown = Math.floor(clamp(o.strip ?? 1) * s.length),
        base = stripY + stripH / 2 + STRIP * 0.36;
      const tw = mono(c, s.slice(0, shown), M, base, "left", C.ink, undefined, STRIP);
      if ((o.strip ?? 1) < 1 || Math.floor(F / 8) % 2 === 0) {
        c.fillStyle = C.accent2;
        c.fillRect(M + tw + (shown ? 10 * u : 0), base - STRIP * 0.73, 20 * u, STRIP * 0.73);
      }
      chrome(c, F, o.tcF, C.deep);
    };
    c.fillStyle = C.deep;
    c.fillRect(0, 0, W, H);
    const roll = o.roll ?? 0;
    if (Math.abs(roll) < 0.01) card();
    else {
      // the picture rolls: two copies of the frame one period apart, with the black blanking bar between them
      const blank = 60 * u,
        per = H + blank,
        y = mod(roll, per);
      for (const dy of [y, y - per]) {
        c.save();
        c.beginPath();
        c.rect(0, dy, W, H);
        c.clip();
        c.translate(0, dy);
        card();
        c.restore();
      }
      c.fillStyle = C.deep;
      c.fillRect(0, y - blank, W, blank);
    }
    // a hum bar: a wide, faintly darker band drifting down the picture, in three flat steps
    if (o.hum) {
      const bh = H * 0.3,
        y0 = mod(F * (H / 75), H + bh) - bh;
      c.fillStyle = `rgba(0,0,0,${0.07 * o.hum})`;
      c.fillRect(0, y0, W, bh);
      c.fillRect(0, y0 + bh * 0.25, W, bh * 0.5);
    }
  };

  // ---- the host lines: big, tight, left-aligned Inter 800 on a near-black ground
  const hostX = tall ? M : 150 * u,
    hostW = tall ? W - 2 * M : (W * 2) / 3 - 150 * u;
  let fit = 0;
  const hostSize = (c: Ctx) => {
    if (!fit) {
      const widest = Math.max(
        ...["Good evening.", "receiving us", "Signal found.", "We never left."].map((s) =>
          measure(c, s, { size: 100, family: F_.sans, weight: 800, track: -0.035 }),
        ),
      );
      fit = Math.min(150 * u, (hostW * 100) / widest / 1.05); // room for the push-in
    }
    return fit;
  };
  const hostO = (sz: number) => ({ size: sz, family: F_.sans, weight: 800, color: C.ink, track: -0.035 });
  const rise = (c: Ctx, s: string, x: number, y: number, sz: number, F: number, start: number, per = 1.4) =>
    letters(c, s, x, y, hostO(sz), (i) => spring((F - start - i * per) / FPS, { freq: 2.6, damp: 0.74 }), "rise");

  /** mode "intro" builds the lines; "breakup" repeats and jumps them and stutters 'clearly.'; "found" signs off */
  const host = (c: Ctx, F: number, mode: "intro" | "breakup" | "found", tcF: number) => {
    c.fillStyle = C.ground;
    c.fillRect(0, 0, W, H);
    const sz = hostSize(c),
      lh = sz * 1.0,
      gap = sz * 0.3,
      cap = sz * 0.73;
    const t0 = mode === "found" ? T.found : T.host,
      push = 1 + 0.04 * ease.inOutCubic(prog(F, t0, mode === "found" ? N : T.melt));
    c.save();
    c.translate(hostX, cy);
    c.scale(push, push);
    c.translate(-hostX, -cy);
    if (mode === "found") {
      const y0 = cy - (lh + cap) / 2 + cap;
      rise(c, "Signal found.", hostX, y0, sz, F, T.found, 0.9);
      rise(c, "We never left.", hostX, y0 + lh, sz, F, T.found + 7, 0.9);
    } else {
      const total = 3 * lh + gap + cap,
        y0 = cy - total / 2 + cap,
        ys = [y0, y0 + lh + gap, y0 + 2 * lh + gap, y0 + 3 * lh + gap];
      if (mode === "intro") {
        rise(c, "Good evening.", hostX, ys[0]!, sz, F, T.host);
        rise(c, "You are", hostX, ys[1]!, sz, F, 120);
        rise(c, "receiving us", hostX, ys[2]!, sz, F, 128, 1.1);
        rise(c, "clearly.", hostX, ys[3]!, sz, F, 150, 1.6);
      } else {
        // the lines repeat and jump on held frames; 'clearly.' stutters
        const f = Math.round(F),
          h = Math.floor(f / HOLD),
          g = G(f);
        let lines = ["Good evening.", "You are", "receiving us", "clearly."],
          dy = hash(h, 11) < g * 0.55 ? (hash(h, 12) - 0.5) * lh * 0.9 : 0;
        const st = STUTTERS.find((s) => f >= s && f < s + 9);
        if (st !== undefined) {
          const d = f - st;
          lines[3] = d < 6 ? "cle" : "clearly.";
          if (d >= 3 && d < 6) dy = lh * 0.35;
        }
        if (hash(h, 13) < g * 0.5) {
          const r = Math.floor(hash(h, 14) * 3);
          lines = lines.map((s, i) => (i === r + 1 ? lines[r]! : s));
        }
        lines.forEach((s, i) => text(c, s, hostX, ys[i]! + dy, hostO(sz)));
      }
    }
    c.restore();
    chrome(c, F, tcF);
  };

  // ---- the 'signal lost' card: flat blue, NO INPUT, SIGNAL LOST blinking for two beats
  const lostCard = (c: Ctx, F: number) => {
    c.fillStyle = C.s3;
    c.fillRect(0, 0, W, H);
    mono(c, "NO INPUT", M, yTop);
    mono(c, "CH 07", M, yBot);
    const f = Math.round(F),
      on = f >= 420 || (f - T.lost) % BEAT < 10;
    if (!on) return;
    const w100 = measure(c, "SIGNAL LOST", { size: 100, family: F_.sans, weight: 800, track: -0.02 }),
      sz = Math.min((tall ? 150 : 200) * u, ((W - 2 * M - 40 * u) * 100) / w100),
      push = 1 + 0.05 * prog(F, T.lost, T.search);
    c.save();
    c.translate(cx, cy);
    c.scale(push, push);
    text(c, "SIGNAL LOST", 0, sz * 0.36, {
      size: sz,
      family: F_.sans,
      weight: 800,
      color: C.ink,
      track: -0.02,
      align: "center",
    });
    c.restore();
  };

  // the vertical hold is lost, then caught: the picture rolls fast, slows, overshoots and settles at frame 525
  const rollAt = (F: number) => {
    const per = H + 60 * u,
      D = 2.5 * per,
      Fc = 512,
      A = 110 * u,
      w = Math.PI / 7;
    if (F < Fc) {
      const len = Fc - 480,
        p = prog(F, 480, Fc),
        v = A * w;
      return D * (1 - p) ** 2 + v * len * p * (1 - p);
    }
    return -A * Math.exp(-(F - Fc) / 4.5) * Math.sin(w * (F - Fc));
  };

  // ---- offscreen surfaces, in device pixels, kept across frames
  const surf = (env: Env, key: string, w = Math.round(env.W * env.scale), h = Math.round(env.H * env.scale)) => {
    const k = `glitch:${key}:${w}x${h}`;
    let S = env.cache.get(k) as Layer | undefined;
    if (!S) {
      S = env.canvas(w, h);
      env.cache.set(k, S);
    }
    return S;
  };
  const reset = (c: Ctx, k = 1) => {
    c.setTransform(k, 0, 0, k, 0, 0);
    c.globalAlpha = 1;
    c.globalCompositeOperation = "source-over";
    c.imageSmoothingEnabled = true;
  };

  // (1) RGB SPLIT: three passes through pure red, green and blue masks, recombined with 'lighter'
  const split = (env: Env, src: Layer, dst: Layer, off: number, offY = 0) => {
    const d = dst.ctx,
      Wd = src.canvas.width,
      Hd = src.canvas.height;
    reset(d);
    if (Math.abs(off) < 0.5 && Math.abs(offY) < 0.5) {
      d.drawImage(src.canvas, 0, 0);
      return;
    }
    const ch = surf(env, "chan"),
      t = ch.ctx;
    d.fillStyle = "#000";
    d.fillRect(0, 0, Wd, Hd);
    const passes: [string, number, number][] = [
      ["#ff0000", -off, -offY],
      ["#00ff00", 0, 0],
      ["#0000ff", off, offY],
    ];
    for (const [col, dx, dy] of passes) {
      reset(t);
      t.drawImage(src.canvas, 0, 0);
      t.globalCompositeOperation = "multiply";
      t.fillStyle = col;
      t.fillRect(0, 0, Wd, Hd);
      d.globalCompositeOperation = "lighter";
      d.drawImage(ch.canvas, Math.round(dx), Math.round(dy));
    }
    reset(d);
  };

  // (2) SLICE DISPLACEMENT: horizontal bands copied with an offset, some wrapping around the edge
  const slices = (ctx: Ctx, src: Layer, h: number, amt: number, n: number, k: number) => {
    const Wd = src.canvas.width,
      Hd = src.canvas.height;
    for (let i = 0; i < n; i++) {
      const bh = Math.max(1, Math.round((8 + 132 * hash(h, i, 1) ** 1.4) * u * k)),
        y = Math.round(hash(h, i, 2) * (Hd - bh)),
        off = Math.round((hash(h, i, 3) * 2 - 1) * 220 * u * k * amt);
      if (!off) continue;
      ctx.drawImage(src.canvas, 0, y, Wd, bh, off, y, Wd, bh);
      if (hash(h, i, 4) < 0.55) ctx.drawImage(src.canvas, 0, y, Wd, bh, off - Math.sign(off) * Wd, y, Wd, bh);
    }
  };

  // (3) SCANLINES: every third row 20% darker; a bright row every sixth only when g is high (cached overlays)
  const scanOverlay = (env: Env, bright: boolean) => {
    const S = surf(env, bright ? "bright" : "scan"),
      k = `glitch:${bright ? "bright" : "scan"}:done`;
    if (!env.cache.get(k)) {
      const c = S.ctx,
        Hd = S.canvas.height;
      reset(c);
      c.clearRect(0, 0, S.canvas.width, Hd);
      c.fillStyle = bright ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.2)";
      for (let y = 0; y < Hd; y += bright ? 6 : 3) c.fillRect(0, y, S.canvas.width, 1);
      env.cache.set(k, true);
    }
    return S;
  };

  // (4) VHS TRACKING: a band rolling up the screen; rows shifted by a sine of the row index plus hash noise,
  // desaturated and brightened, with white dropout specks
  const tracking = (ctx: Ctx, src: Layer, F: number, amt: number, k: number) => {
    const f = Math.round(F),
      Wd = src.canvas.width,
      Hd = src.canvas.height,
      bandH = Math.round((60 + 80 * hash(Math.floor(f / 4), 21)) * u * k),
      travel = Hd + 280 * u * k,
      y0 = Math.round(Hd + 140 * u * k - mod((F - 210) * 14 * u * k, travel)),
      step = Math.max(1, Math.round(2 * u * k));
    for (let r = 0; r * step < bandH; r++) {
      const y = y0 + r * step;
      if (y < 0 || y >= Hd) continue;
      const dx = Math.round(
        (Math.sin(r * 0.21 + f * 0.9) * 34 + (hash(Math.floor(f / 2), r, 23) - 0.5) * 50) * u * k * amt,
      );
      ctx.drawImage(src.canvas, 0, y, Wd, step, dx, y, Wd, step);
      ctx.drawImage(src.canvas, 0, y, Wd, step, dx - Math.sign(dx || 1) * Wd, y, Wd, step);
    }
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, y0, Wd, bandH);
    ctx.clip();
    ctx.globalCompositeOperation = "saturation";
    ctx.fillStyle = "#808080";
    ctx.fillRect(0, y0, Wd, bandH);
    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = `rgba(255,255,255,${0.1 + 0.18 * amt})`;
    ctx.fillRect(0, y0, Wd, bandH);
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#ffffff";
    const hs = Math.floor(f / 2);
    for (let i = 0; i < 14; i++) {
      if (hash(hs, i, 25) > 0.35 + 0.6 * amt) continue;
      ctx.fillRect(
        Math.round(hash(hs, i, 26) * Wd),
        Math.round(y0 + hash(hs, i, 27) * bandH),
        Math.round((6 + 60 * hash(hs, i, 28)) * u * k),
        Math.max(1, Math.round((1 + 2 * hash(hs, i, 29)) * u * k)),
      );
    }
    ctx.restore();
  };

  // (5) DATAMOSH SMEAR: the frame frozen at F0 cut into 24 px macroblocks, each moved by v(block) × (F − F0) along a
  // smooth field (the bars' motion), while a growing, hash-chosen share of blocks switch to the new scene
  const mosh = (dst: Layer, frozen: Layer, next: Layer, F: number, k: number) => {
    const d = dst.ctx,
      Wd = dst.canvas.width,
      Hd = dst.canvas.height,
      bs = Math.round(24 * u * k),
      t = F - T.melt,
      p = 0.9 * ease.inCubic(prog(F, T.melt + 4, T.lost - 2));
    reset(d);
    d.imageSmoothingEnabled = false;
    for (let j = 0; j * bs < Hd; j++)
      for (let i = 0; i * bs < Wd; i++) {
        const x = i * bs,
          y = j * bs,
          lx = (x + bs / 2) / k,
          ly = (y + bs / 2) / k;
        const pick = 0.62 * hash(i, j, 77) + 0.38 * (0.5 + 0.5 * Math.sin(lx / (190 * u) + ly / (260 * u) + 1.7));
        if (pick < p) {
          d.drawImage(next.canvas, x, y, bs, bs, x, y, bs, bs);
          continue;
        }
        const vx = 2.4 * Math.sin(ly / (310 * u) + 1.3) * (0.5 + 0.5 * Math.sin(lx / (230 * u))),
          vy = (1 + 3.4 * (0.5 + 0.5 * Math.sin(lx / (170 * u) + 0.7))) * (0.2 + ly / H);
        const sx = clamp(Math.round(x - vx * t * u * k), 0, Wd - bs),
          sy = clamp(Math.round(y - vy * t * u * k), 0, Hd - bs);
        d.drawImage(frozen.canvas, sx, sy, bs, bs, x, y, bs, bs);
      }
    reset(d);
  };

  // (6) PIXEL SORT (the melt only): at quarter resolution, in each column, runs brighter than a threshold (extended
  // a little further down as the melt grows) are sorted by brightness, dark to bright, so bright type drips down
  const pixelSort = (env: Env, ctx: Ctx, src: Layer, F: number) => {
    const amt = prog(F, T.melt + 20, T.lost - 4);
    if (amt <= 0) return;
    const Wd = src.canvas.width,
      Hd = src.canvas.height,
      qw = Math.ceil(Wd / 4),
      qh = Math.ceil(Hd / 4),
      Q = surf(env, "sort", qw, qh),
      q = Q.ctx;
    reset(q);
    q.clearRect(0, 0, qw, qh);
    q.drawImage(src.canvas, 0, 0, qw, qh);
    const img = q.getImageData(0, 0, qw, qh),
      d = img.data,
      out = new Uint8ClampedArray(d.length);
    const lum = (i: number) => (d[i]! * 0.299 + d[i + 1]! * 0.587 + d[i + 2]! * 0.114) / 255;
    const thr = lerp(0.9, 0.55, ease.inOutCubic(amt)),
      drip = amt * qh * 0.2,
      spread = 0.3 + 0.7 * amt;
    const run: number[] = [];
    for (let x = 0; x < qw; x++) {
      if (hash(x, 6) > spread) continue;
      const ext = Math.floor(drip * (0.3 + 0.7 * hash(x, 5)));
      let y = 0;
      while (y < qh) {
        if (lum((y * qw + x) * 4) <= thr) {
          y++;
          continue;
        }
        let e = y;
        while (e < qh && lum((e * qw + x) * 4) > thr) e++;
        e = Math.min(qh, e + ext);
        run.length = 0;
        for (let r = y; r < e; r++) run.push((r * qw + x) * 4);
        const sorted = run.map((i) => [lum(i), d[i]!, d[i + 1]!, d[i + 2]!] as const).sort((a, b) => a[0] - b[0]);
        run.forEach((i, n) => {
          const s = sorted[n]!;
          out[i] = s[1];
          out[i + 1] = s[2];
          out[i + 2] = s[3];
          out[i + 3] = 255;
        });
        y = e;
      }
    }
    img.data.set(out);
    q.putImageData(img, 0, 0);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(Q.canvas, 0, 0, qw * 4, qh * 4);
    ctx.restore();
  };

  // (7) SNOW: per-pixel noise at quarter resolution from the hash of (x, y, h); `top` is where it starts (logical px)
  const snow = (env: Env, ctx: Ctx, F: number, top: number, alpha: number) => {
    if (alpha <= 0) return;
    const f = Math.round(F),
      h = Math.floor(f / 2),
      k = env.scale,
      Wd = Math.round(W * k),
      Hd = Math.round(H * k),
      qw = Math.ceil(Wd / 4),
      qh = Math.ceil(Hd / 4),
      S = surf(env, "snow", qw, qh),
      key = `${h}:${Math.round(top)}`;
    if (env.cache.get("glitch:snowkey") !== key) {
      const img = S.ctx.createImageData(qw, qh),
        px = new Uint32Array(img.data.buffer);
      for (let y = 0; y < qh; y++) {
        const row = hash(y, h, 31),
          ly = (y * 4) / k;
        for (let x = 0; x < qw; x++) {
          const edge = top + (hash(Math.floor(x / 3), h, 33) - 0.5) * 40 * u;
          if (ly < edge) continue;
          const v = hash(x, y, h),
            gv = Math.round(clamp(0.12 + 0.78 * v * v + 0.22 * (row - 0.5)) * 255);
          px[y * qw + x] = (255 << 24) | (gv << 16) | (gv << 8) | gv;
        }
      }
      S.ctx.putImageData(img, 0, 0);
      env.cache.set("glitch:snowkey", key);
    }
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = alpha;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(S.canvas, 0, 0, qw * 4, qh * 4);
    ctx.restore();
  };

  // ---- the search readout over the snow: channels step one per beat, a signal meter fills
  const readout = (c: Ctx, F: number) => {
    const f = Math.round(F),
      a = prog(F, T.search + 2, T.search + 6);
    if (a <= 0) return;
    const sz = (tall ? 48 : 56) * u,
      locked = f >= 525,
      lit = f >= 495 ? 2 : f >= 480 ? 1 : f >= 465 ? 0 : -1;
    const parts: [string, string][] = [
      [locked ? "LOCKED   " : "SEARCHING", locked ? C.s1 : C.ink],
      ["  CH ", C.ink],
      ["05", lit === 0 ? C.ink : lit > 0 ? C.muted : C.line],
      [" · ", C.muted],
      ["06", lit === 1 ? C.ink : lit > 1 ? C.muted : C.line],
      [" · ", C.muted],
      ["07", lit === 2 ? (locked ? C.s1 : C.ink) : C.line],
    ];
    const o = monoO(C.ink, sz),
      full = parts.map((p) => p[0]).join(""),
      w = measure(c, full, o),
      x0 = cx - w / 2,
      base = cy - 10 * u,
      mH = sz * 0.55,
      mY = base + sz * 0.9;
    c.save();
    c.globalAlpha = a;
    c.fillStyle = C.deep;
    c.fillRect(x0 - 28 * u, base - sz * 0.73 - 26 * u, w + 56 * u, sz * 0.73 + 26 * u + sz * 0.9 + mH + 26 * u);
    let x = x0;
    for (const [s, col] of parts) {
      text(c, s, x, base, { ...o, color: col });
      x += measure(c, s, o) + o.track * sz;
    }
    // the meter: 16 segments; it hunts while searching and holds full once locked
    const n = 16,
      gap = 6 * u,
      sw = (w - gap * (n - 1)) / n,
      fill = locked
        ? n
        : clamp(Math.floor(prog(F, T.search, 525) * n) + Math.floor(hash(Math.floor(f / 3), 41) * 3) - 1, 0, n);
    for (let i = 0; i < n; i++) {
      c.fillStyle = i < fill ? C.s1 : C.line;
      c.fillRect(x0 + i * (sw + gap), mY, sw, mH);
    }
    c.restore();
  };

  // the frame frozen at the melt, cached (it depends on nothing but the size): the host lines, torn apart in RGB
  const frozenAt = (env: Env) => {
    const Fz = surf(env, "frozen"),
      key = "glitch:frozen:done";
    if (!env.cache.get(key)) {
      const S = surf(env, "freezeSrc");
      reset(S.ctx, env.scale);
      host(S.ctx, T.melt - 1, "intro", T.melt);
      split(env, S, Fz, 12 * u * env.scale, 0);
      env.cache.set(key, true);
    }
    return Fz;
  };

  const paint = (ctx: Ctx, env: Env, F: number) => {
    F = clamp(F, 0, N - 1);
    const f = Math.round(F),
      k = env.scale,
      held = heldAt(f),
      Fs = held ?? F,
      g = spikeAt(f) ? 1 : G(f),
      scene = surf(env, "scene"),
      comp = surf(env, "comp"),
      sc = scene.ctx;
    reset(sc, k);
    // ---- the clean scene
    if (f < T.host) {
      const on = ease.outCubic(prog(F, 0, 6));
      bars(sc, F, { tcF: F, strip: prog(F, 12, 40), push: 1 + 0.03 * prog(F, 0, T.host), hum: 1 });
      if (on < 1) {
        // the set warms up: the picture opens from a bright line across the middle
        sc.fillStyle = C.deep;
        const hh = (H / 2) * (1 - on);
        sc.fillRect(0, 0, W, hh);
        sc.fillRect(0, H - hh, W, hh);
        sc.fillStyle = C.ink;
        sc.fillRect(0, cy - Math.max(2 * u, H * 0.5 * on) / 2, W, Math.max(2 * u, 4 * u * (1 - on)));
      }
    } else if (f < T.melt) host(sc, Fs, f < T.breakup && held === null ? "intro" : "breakup", Fs);
    else if (f < T.lost) {
      // the colour bars try to return, rolling down under the frozen frame; the timecode sticks
      bars(sc, F, { tcF: T.melt, roll: (F - T.melt) * 7 * u });
    } else if (f < T.search) lostCard(sc, F);
    else if (f < T.found) {
      if (f < 480) {
        sc.fillStyle = C.deep;
        sc.fillRect(0, 0, W, H);
      } else {
        bars(sc, F, { tcF: null, roll: rollAt(F) });
        sc.fillStyle = `rgba(0,0,0,${1 - ease.outCubic(prog(F, 480, 506))})`;
        sc.fillRect(0, 0, W, H);
      }
    } else host(sc, F, "found", F); // the locked bars 525-540 are the clean bars; the host is back on the sign-off

    // ---- the glitch pass
    if (f >= T.melt && f < T.lost) mosh(comp, frozenAt(env), scene, F, k);
    else {
      const hh = Math.floor(f / 2),
        wink = f === 585,
        off = (wink ? 28 : 28 * g * (0.55 + 0.45 * hash(hh, 3))) * u * k,
        offY = spikeAt(f) ? (hash(hh, 8) - 0.5) * 14 * u * k : 0;
      split(env, scene, comp, g > 0 || wink ? off : 0, offY);
    }
    reset(ctx);
    ctx.drawImage(comp.canvas, 0, 0);
    ctx.imageSmoothingEnabled = false;
    if (f === 60) slices(ctx, comp, 60, 0.8, 6, k);
    const tick = TICKS.find((t) => f >= t && f < t + 2);
    if (tick !== undefined) slices(ctx, comp, tick, 0.32, 3, k);
    if (f >= T.breakup - HOLD && f < T.melt) {
      const h = Math.floor((held ?? f) / HOLD);
      if (spikeAt(f)) slices(ctx, comp, h, 1, 9, k);
      else if (hash(h, 51) < 0.35 + 0.6 * g) slices(ctx, comp, h, g, 3 + Math.floor(hash(h, 52) * 5), k);
    }
    if (f >= T.search && f < T.found) {
      const h = Math.floor(f / 4);
      if (hash(h, 53) < 0.25 + 0.5 * g) slices(ctx, comp, h, g, 3 + Math.floor(hash(h, 54) * 4), k);
    }
    if (f >= T.melt && f < T.lost) pixelSort(env, ctx, comp, F);
    const tr = f >= 210 && f < 336 ? prog(F, 210, 234) * (1 - prog(F, 318, 336)) : f >= 480 && f < 525 ? 0.6 : 0;
    if (tr > 0) tracking(ctx, comp, F, tr, k);
    // snow rises from the bottom after the card has blinked, then thins as the bars lock
    if (f >= 420 && f < T.found) {
      const top = f < T.search ? H * (1 - ease.inOutCubic(prog(F, 420, 447))) - 30 * u : -40 * u;
      snow(env, ctx, F, top, 1 - ease.inOutCubic(prog(F, 482, 530)));
    }
    reset(ctx, k);
    // a channel step: the tuner blanks the picture to black; the readout stays up
    if (blankAt(f)) {
      ctx.fillStyle = C.deep;
      ctx.fillRect(0, 0, W, H);
    }
    if (f >= T.search && f < T.found) readout(ctx, F);
    // scanlines stay on, faint in the clean beats and deep in the heavy ones
    reset(ctx);
    ctx.globalAlpha = clamp(0.3 + 0.9 * g);
    ctx.drawImage(scanOverlay(env, false).canvas, 0, 0);
    if (g > 0.6) {
      ctx.globalAlpha = clamp((g - 0.6) / 0.4);
      ctx.drawImage(scanOverlay(env, true).canvas, 0, 0);
    }
    reset(ctx);
  };

  const cuts = [0, T.host, T.breakup, T.melt, T.lost, T.search, T.found, N],
    names = ["signal", "host", "breakup", "melt", "lost", "search", "found"],
    samples = [3, 3, 1, 1, 1, 1, 3];
  const shots: Shot[] = names.map((sid, i) => ({
    id: sid,
    start: cuts[i]!,
    end: cuts[i + 1]!,
    draw: (ctx, local, env) =>
      motionBlur(ctx, env, (c, dt) => paint(c, env, cuts[i]! + local + dt), { samples: samples[i]!, shutter: 0.5 }),
  }));

  const score = beatScore({
    frames: N,
    fps: FPS,
    bpm: BPM,
    mood: "drive",
    drop: T.breakup,
    hits: [...SPIKES, T.lost],
    whooshes: [T.lost, T.found],
    ticks: [...STUTTERS.flatMap((s) => [0, 2, 4, 6, 8].map((d) => s + d)), ...BLANKS],
    sign: T.found,
  });
  // around the score: a static bed while the signal is lost, and dropouts on the frames the picture holds
  const audio = (sr: number): [Float32Array, Float32Array] => {
    const [Lc, Rc] = score(sr),
      at = (fr: number) => Math.round((fr / FPS) * sr),
      noise = rng(3030),
      a0 = at(T.lost),
      a1 = at(525);
    for (let i = a0; i < a1 && i < Lc.length; i++) {
      const fr = (i / sr) * FPS,
        lvl =
          (fr < 420 ? 0.05 : 0.085) *
          (1 - ease.inOutCubic(prog(fr, 478, 525))) *
          Math.min(1, (i - a0) / (0.004 * sr)) *
          (blankAt(Math.floor(fr)) ? 0 : 1); // the static mutes while the tuner blanks
      Lc[i] = Lc[i]! + (noise() * 2 - 1) * lvl;
      Rc[i] = Rc[i]! + (noise() * 2 - 1) * lvl;
    }
    const ramp = Math.round(0.002 * sr);
    for (const s of SPIKES) {
      const d0 = at(s - HOLD),
        d1 = at(s);
      for (let i = d0 - ramp; i < d1; i++) {
        const gn = i < d0 ? 1 - (i - (d0 - ramp)) / ramp : 0;
        Lc[i] = Lc[i]! * gn;
        Rc[i] = Rc[i]! * gn;
      }
    }
    for (let i = 0; i < Lc.length; i++) {
      Lc[i] = clamp(Lc[i]!, -1, 1);
      Rc[i] = clamp(Rc[i]!, -1, 1);
    }
    return [Lc, Rc];
  };

  return {
    meta: { title: id, W, H, fps: FPS, bpm: BPM, durationFrames: N, raster: "cpu" },
    assets: { images: {}, fonts: P.assets },
    shots,
    audio,
  };
}

export const glitchSignal = make("landscape", "glitchSignal");
export const glitchSignalVertical = make("vertical", "glitchSignalVertical");
