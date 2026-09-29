// FOLEY: sound designed from what makes it, not music. A piece writes a CUE TABLE (frame, kind, a few numbers);
// foley() renders it over a quiet room tone and masters it to a loudness target. Every sound is synthesised from
// its physical source (a fingertip on a knob, a tag on a collar, graphite on paper) and seeded per cue, so two
// keystrokes or two jingles never sound identical, yet the same table is always the same samples. beatScore is the
// kit's music; this is its foley, and the two can be summed.
import { rng } from "../core";

export type FoleyKind =
  | "grab" // fingertip lands on a slider knob
  | "release" // and lets go
  | "detent" // one notch crossed; p = the slider's value 0..1 (pitch), pan = the knob's x 0..1
  | "tap" // a swatch, tab or button
  | "lamp" // a light changing colour: filament tink + a low swell
  | "sweep" // a paper backdrop changing: a rising swoosh
  | "air" // a soft camera whoosh that ENDS on its frame
  | "inflate" // a head growing: a rubbery rising glide
  | "deflate" // and shrinking, with a little air
  | "puff" // cheeks filling with breath
  | "pop" // lips letting it go
  | "glasses" // glasses pushed up the nose
  | "rustle" // shirt fabric on a gesture
  | "step" // a trainer on the floor
  | "think" // a thought forming: three rising dots
  | "paw" // a paw pad
  | "jingle" // a collar tag
  | "wag" // a tail plume through the air; p = number of swishes (1..8)
  | "blep" // a small tongue flick
  | "shell" // a shell set down on stone: tap + scrape
  | "slide" // a turtle's head sliding out
  | "type" // one key; p ≥ 0.9 is the spacebar
  | "pencil" // a pencil stroke; dur = its length in s, p = speed 0..1 (brightness)
  | "chime"; // the sign-off

export type Cue = { f: number; k: FoleyKind; v?: number; pan?: number; p?: number; dur?: number; seed?: number };
export type FoleySpec = {
  frames: number;
  fps: number;
  cues: Cue[];
  /** room tone: a quiet, dark bed so silence is never digital (level ≈ linear amplitude, 0 = off) */
  room?: number;
  /** integrated loudness target in LUFS (default −16, the studio's standard) */
  target?: number;
  /** the soft ceiling in dBFS (default −4) */
  ceiling?: number;
  /** tails wrap around the end, for looping pictures */
  loop?: boolean;
};

const TAU = Math.PI * 2;
const KINDS: FoleyKind[] = [
  "grab",
  "release",
  "detent",
  "tap",
  "lamp",
  "sweep",
  "air",
  "inflate",
  "deflate",
  "puff",
  "pop",
  "glasses",
  "rustle",
  "step",
  "think",
  "paw",
  "jingle",
  "wag",
  "blep",
  "shell",
  "slide",
  "type",
  "pencil",
  "chime",
];

export const foley =
  (sp: FoleySpec) =>
  (sr: number): [Float32Array, Float32Array] => {
    const n = Math.ceil((sp.frames / sp.fps) * sr),
      L = new Float32Array(n),
      R = new Float32Array(n);
    const add = (i: number, v: number, pan = 0.5) => {
      if (sp.loop) i = ((i % n) + n) % n;
      else if (i < 0 || i >= n) return;
      // equal-power pan
      L[i] += v * Math.cos((pan * Math.PI) / 2) * Math.SQRT2;
      R[i] += v * Math.sin((pan * Math.PI) / 2) * Math.SQRT2;
    };
    const S = (s: number) => Math.round(s * sr);

    // ---- building blocks, each writing at sample i0
    /** a decaying sine (optionally gliding from f0 to f1 over its length) */
    const sine = (
      i0: number,
      f0: number,
      f1: number,
      len: number,
      decay: number,
      vel: number,
      pan: number,
      atk = 0.001,
    ) => {
      let ph = 0;
      for (let k = 0; k < S(len); k++) {
        const t = k / sr,
          u = k / S(len);
        ph += (f0 + (f1 - f0) * u) / sr;
        add(i0 + k, Math.sin(TAU * ph) * Math.exp(-t / decay) * Math.min(1, t / atk) * vel, pan);
      }
    };
    /** noise through a state-variable band-pass whose centre glides fc0 → fc1; env(u) shapes it */
    const band = (
      i0: number,
      len: number,
      fc0: number,
      fc1: number,
      q: number,
      vel: number,
      env: (u: number) => number,
      r: () => number,
      pan: number | ((u: number) => number) = 0.5,
    ) => {
      let lo = 0,
        bp = 0;
      const m = S(len);
      for (let k = 0; k < m; k++) {
        const u = k / m,
          fc = Math.min(sr / 6.5, fc0 * (fc1 / fc0) ** u),
          g = 2 * Math.sin((Math.PI * fc) / sr),
          x = r() * 2 - 1;
        lo += g * bp;
        const hi = x - lo - q * bp;
        bp += g * hi;
        add(i0 + k, bp * env(u) * vel, typeof pan === "function" ? pan(u) : pan);
      }
    };
    /** a very short broadband click (the transient on every contact) */
    const click = (i0: number, vel: number, pan: number, r: () => number, ms = 1.6) => {
      // low-passed (about 6 kHz): raw white-noise clicks reach Nyquist and overshoot between samples
      const m = S(ms / 1000);
      let y = 0;
      for (let k = 0; k < m + 24; k++) {
        y += ((k < m ? (r() * 2 - 1) * Math.exp((-k / m) * 4) : 0) - y) * 0.55;
        add(i0 + k, y * vel * 1.4, pan);
      }
    };
    /** a low body thump */
    const thump = (i0: number, f: number, len: number, vel: number, pan: number) => {
      let ph = 0;
      for (let k = 0; k < S(len); k++) {
        const t = k / sr;
        ph += (f * (1 + 0.6 * Math.exp(-t / 0.008))) / sr;
        add(i0 + k, Math.sin(TAU * ph) * Math.exp(-t / (len / 3)) * Math.min(1, t / 0.0015) * vel, pan);
      }
    };
    /** an inharmonic metal strike: partials with their own decays */
    const metal = (i0: number, parts: number[], decay: number, vel: number, pan: number, r: () => number) =>
      parts.forEach((f, j) =>
        sine(i0, f, f, decay * 5, decay * (0.6 + r() * 0.8), (vel * (1 - j * 0.12)) / parts.length, pan),
      );

    // ---- the sounds
    for (const c of sp.cues) {
      const i0 = S(c.f / sp.fps),
        v = c.v ?? 1,
        pan = c.pan ?? 0.5,
        p = c.p ?? 0.5,
        r = rng((c.seed ?? 0) * 7919 + Math.round(c.f * 131) + KINDS.indexOf(c.k) * 104729 + 17);
      switch (c.k) {
        case "grab":
          click(i0, 0.5 * v, pan, r);
          sine(i0, 1850, 1800, 0.05, 0.012, 0.22 * v, pan);
          thump(i0, 320, 0.03, 0.12 * v, pan);
          break;
        case "release":
          click(i0, 0.35 * v, pan, r);
          sine(i0, 1230, 1200, 0.04, 0.01, 0.16 * v, pan);
          break;
        case "detent": {
          const f = 1100 + 1100 * p;
          click(i0, 0.18 * v, pan, r, 0.8);
          sine(i0, f, f * 0.98, 0.012, 0.0022, 0.18 * v, pan);
          break;
        }
        case "tap":
          click(i0, 0.3 * v, pan, r, 1);
          sine(i0, 3100, 3080, 0.09, 0.03, 0.14 * v, pan);
          sine(i0, 7400, 7380, 0.03, 0.008, 0.06 * v, pan);
          break;
        case "lamp":
          metal(i0, [4200, 6150, 8300], 0.018, 0.2 * v, pan, r);
          band(i0 + S(0.02), 0.5, 420, 950, 0.9, 0.5 * v, (u) => Math.sin(Math.PI * u) ** 2 * (1 - u * 0.4), r, pan);
          thump(i0, 70, 0.25, 0.07 * v, pan);
          break;
        case "sweep": {
          const d = c.dur ?? 0.38;
          band(
            i0,
            d,
            380,
            3200,
            0.7,
            0.55 * v,
            (u) => Math.sin(Math.PI * u) ** 1.5,
            r,
            (u) => 0.3 + 0.4 * u,
          );
          break;
        }
        case "air": {
          const d = c.dur ?? 0.55;
          band(
            i0 - S(d),
            d,
            260,
            1300,
            1.1,
            0.4 * v,
            (u) => u ** 2.2 * (1 - u ** 12),
            r,
            (u) => 0.35 + 0.3 * u,
          );
          break;
        }
        case "inflate":
        case "deflate": {
          const up = c.k === "inflate",
            d = c.dur ?? 0.45,
            m = S(d);
          let ph = 0;
          for (let k = 0; k < m; k++) {
            const u = k / m,
              f = (up ? 180 + 240 * u ** 0.7 : 380 - 230 * u ** 0.8) * (1 + 0.06 * Math.sin(TAU * 7 * u * d));
            ph += f / sr;
            const env = Math.min(1, u / 0.07) * (1 - u) ** 0.8;
            add(i0 + k, (Math.sin(TAU * ph) + 0.3 * Math.sin(2 * TAU * ph)) * env * 0.16 * v, pan);
          }
          if (!up) band(i0, d * 0.8, 900, 400, 1.4, 0.18 * v, (u) => Math.sin(Math.PI * u), r, pan);
          break;
        }
        case "puff":
          band(i0, 0.32, 260, 520, 1.2, 0.45 * v, (u) => Math.min(1, u / 0.2) * (1 - u) ** 1.5, r, pan);
          break;
        case "pop":
          click(i0, 0.4 * v, pan, r, 1.2);
          thump(i0, 92, 0.07, 0.35 * v, pan);
          band(i0, 0.12, 900, 500, 1.5, 0.2 * v, (u) => (1 - u) ** 3, r, pan);
          break;
        case "glasses":
          click(i0, 0.14 * v, pan, r, 0.7);
          sine(i0, 5200, 5150, 0.02, 0.003, 0.08 * v, pan);
          click(i0 + S(0.022), 0.11 * v, pan, r, 0.7);
          sine(i0 + S(0.022), 4700, 4650, 0.02, 0.003, 0.06 * v, pan);
          break;
        case "rustle":
          band(i0, 0.09, 3200, 4200, 1.6, 0.2 * v, (u) => Math.sin(Math.PI * u) ** 2, r, pan - 0.05);
          band(i0 + S(0.07), 0.12, 2800, 3600, 1.6, 0.16 * v, (u) => Math.sin(Math.PI * u) ** 2, r, pan + 0.05);
          break;
        case "step":
          thump(i0, 110, 0.06, 0.28 * v, pan);
          band(i0, 0.03, 900, 700, 1.2, 0.15 * v, (u) => (1 - u) ** 2, r, pan);
          if (r() < 0.6) sine(i0 + S(0.012), 1400, 1900, 0.04, 0.03, 0.03 * v, pan, 0.004);
          break;
        case "think":
          [784, 988, 1175].forEach((f, j) => {
            sine(i0 + S(j * 0.11), f, f, 0.5, 0.18, 0.1 * v, 0.45 + j * 0.05, 0.008);
            sine(i0 + S(j * 0.11), f * 2, f * 2, 0.2, 0.05, 0.015 * v, 0.45 + j * 0.05, 0.008);
          });
          band(i0, 0.45, 1500, 2600, 1.2, 0.05 * v, (u) => Math.sin(Math.PI * u), r, pan);
          break;
        case "paw":
          thump(i0, 140, 0.045, 0.22 * v, pan);
          band(i0, 0.025, 1800, 1400, 1.3, 0.06 * v, (u) => (1 - u) ** 2, r, pan);
          break;
        case "jingle": {
          const strikes = 4 + Math.floor(r() * 3);
          for (let s = 0; s < strikes; s++) {
            const at = i0 + S(r() * 0.2 * (s / strikes + 0.1)),
              parts = [2830, 3910, 5170, 6090, 7870].map((f) => f * (0.97 + r() * 0.06));
            metal(at, parts, 0.045 + r() * 0.05, (0.28 - s * 0.03) * v, pan + (r() - 0.5) * 0.1, r);
            click(at, 0.05 * v, pan, r, 0.5);
          }
          break;
        }
        case "wag": {
          const count = Math.max(1, Math.round(c.p ?? 3));
          for (let s = 0; s < count; s++)
            band(
              i0 + S(s * 0.13),
              0.1,
              800,
              1500,
              1.3,
              0.16 * v,
              (u) => Math.sin(Math.PI * u) ** 2,
              r,
              pan + (s % 2 ? 0.08 : -0.08),
            );
          break;
        }
        case "blep":
          sine(i0, 650, 1500, 0.014, 0.01, 0.14 * v, pan);
          click(i0 + S(0.012), 0.12 * v, pan, r, 0.8);
          band(i0 + S(0.01), 0.04, 2200, 1600, 1.5, 0.05 * v, (u) => (1 - u) ** 2, r, pan);
          break;
        case "shell": {
          metal(i0, [1310, 2640, 3970], 0.012, 0.3 * v, pan, r);
          click(i0, 0.25 * v, pan, r, 1);
          const grains = 18;
          for (let g = 0; g < grains; g++)
            click(i0 + S(0.02 + (g / grains) * 0.16 + r() * 0.01), 0.05 * v * (1 - g / grains), pan, r, 0.4);
          band(i0 + S(0.02), 0.18, 1600, 900, 1.4, 0.07 * v, (u) => (1 - u) ** 1.5, r, pan);
          break;
        }
        case "slide":
          band(i0, c.dur ?? 0.5, 240, 480, 1.1, 0.22 * v, (u) => Math.sin(Math.PI * u) ** 1.4, r, pan);
          break;
        case "type": {
          const space = p >= 0.9,
            f = space ? 1100 : 2000 + r() * 1500;
          click(i0, (space ? 0.18 : 0.26) * v, pan, r, space ? 2.2 : 1.1);
          sine(i0, f, f * 0.97, 0.02, space ? 0.005 : 0.003, 0.07 * v, pan);
          thump(i0 + S(0.006), space ? 150 : 190 + r() * 70, space ? 0.05 : 0.03, (space ? 0.16 : 0.11) * v, pan);
          break;
        }
        case "pencil": {
          const d = c.dur ?? 0.4,
            m = S(d),
            bright = 2400 + 2600 * p;
          let lo = 0,
            bp = 0,
            grain = 0;
          for (let k = 0; k < m; k++) {
            const u = k / m,
              g = 2 * Math.sin((Math.PI * bright) / sr);
            if (k % 64 === 0) grain = 0.35 + 0.65 * r() ** 2; // paper tooth: the grain's level changes every ~1.3 ms
            lo += g * bp;
            const hi = r() * 2 - 1 - lo - 1.3 * bp;
            bp += g * hi;
            add(i0 + k, bp * grain * Math.min(1, u / 0.06, (1 - u) / 0.1) * 0.22 * v, pan);
          }
          break;
        }
        case "chime":
          sine(i0, 1318.5, 1318.5, 2.4, 0.8, 0.12 * v, 0.45, 0.003);
          sine(i0, 2637, 2637, 1.2, 0.35, 0.035 * v, 0.55, 0.003);
          sine(i0 + S(0.09), 1975.5, 1975.5, 2, 0.7, 0.07 * v, 0.6, 0.003);
          break;
      }
    }

    // ---- master: set integrated loudness to the target, round off anything past the ceiling (−4 dBFS by default:
    // foley is all transients, and an AAC encode overshoots full-scale clicks by several dB)
    const g = 10 ** (((sp.target ?? -16) - lufs(L, R, sr)) / 20),
      ceil = 10 ** ((sp.ceiling ?? -4) / 20);
    for (const x of [L, R])
      for (let k = 0; k < n; k++) {
        const y = x[k]! * g,
          a = Math.abs(y);
        x[k] =
          a < ceil * 0.75
            ? y
            : Math.sign(y) * (ceil * 0.75 + ceil * 0.25 * Math.tanh((a - ceil * 0.75) / (ceil * 0.25)));
      }
    // the room tone goes on AFTER mastering, at a fixed level, so the foley's loudness decides the gain
    const room = sp.room ?? 0.004;
    if (room > 0) {
      const r = rng(4242);
      let a = 0,
        b = 0;
      for (let k = 0; k < n; k++) {
        a += (r() * 2 - 1 - a) * 0.02;
        b += (r() * 2 - 1 - b) * 0.02;
        L[k] += a * room * 6;
        R[k] += b * room * 6;
      }
    }
    return [L, R];
  };

/** integrated loudness (ITU-R BS.1770: K-weighting, 400 ms blocks, absolute and relative gates) */
export function lufs(L: Float32Array, R: Float32Array, sr: number): number {
  const kw = (x: Float32Array) => {
    // the standard's two biquads, designed at 48 kHz; close enough at 44.1 kHz for a gain decision
    const stages = [
      [1.53512485958697, -2.69169618940638, 1.19839281085285, -1.69065929318241, 0.73248077421585],
      [1, -2, 1, -1.99004745483398, 0.99007225036621],
    ];
    let src: ArrayLike<number> = x;
    for (const [b0, b1, b2, a1, a2] of stages) {
      const out = new Float64Array(x.length);
      let x1 = 0,
        x2 = 0,
        y1 = 0,
        y2 = 0;
      for (let k = 0; k < x.length; k++) {
        const x0 = src[k]!,
          y = b0! * x0 + b1! * x1 + b2! * x2 - a1! * y1 - a2! * y2;
        x2 = x1;
        x1 = x0;
        y2 = y1;
        y1 = y;
        out[k] = y;
      }
      src = out;
    }
    return src as Float64Array;
  };
  const kl = kw(L),
    kr = kw(R),
    block = Math.round(0.4 * sr),
    step = Math.round(0.1 * sr),
    powers: number[] = [];
  for (let s = 0; s + block <= kl.length; s += step) {
    let sum = 0;
    for (let k = s; k < s + block; k++) sum += kl[k]! * kl[k]! + kr[k]! * kr[k]!;
    powers.push(sum / block);
  }
  const loud = (p: number) => -0.691 + 10 * Math.log10(p),
    mean = (ps: number[]) => ps.reduce((a, p) => a + p, 0) / Math.max(1, ps.length),
    abs = powers.filter((p) => loud(p) > -70);
  if (!abs.length) return -70;
  const rel = loud(mean(abs)) - 10;
  return loud(mean(abs.filter((p) => loud(p) > rel)));
}
