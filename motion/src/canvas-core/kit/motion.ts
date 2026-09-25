// MOTION: easing, closed-form springs and keyed tracks. Everything is a pure function of the frame, so any frame
// renders on its own (no simulation state), which is what makes goldens and parallel rendering possible.
export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** 0 → 1 as f goes from a to b (clamped) */
export const prog = (f: number, a: number, b: number) => clamp((f - a) / (b - a || 1));
/** a value that rises over [a, b] and falls over [c, d] (clamped; for things that come and go) */
export const window01 = (f: number, a: number, b: number, c: number, d: number) =>
  Math.min(prog(f, a, b), 1 - prog(f, c, d));

export const ease = {
  linear: (t: number) => t,
  inCubic: (t: number) => t * t * t,
  outCubic: (t: number) => 1 - (1 - t) ** 3,
  inOutCubic: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  outExpo: (t: number) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t)),
  inOutExpo: (t: number) =>
    t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? 2 ** (20 * t - 10) / 2 : (2 - 2 ** (-20 * t + 10)) / 2,
  outBack: (t: number, s = 1.70158) => 1 + (s + 1) * (t - 1) ** 3 + s * (t - 1) ** 2,
};
/** the easing curve as a cubic bezier (x1, y1, x2, y2), solved for y at x; for drawing a curve AND moving on it */
export const bezier = (x1: number, y1: number, x2: number, y2: number) => (x: number) => {
  const cx = (t: number) => 3 * x1 * t * (1 - t) ** 2 + 3 * x2 * t * t * (1 - t) + t ** 3;
  let lo = 0,
    hi = 1;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (cx(mid) < x) lo = mid;
    else hi = mid;
  }
  const t = (lo + hi) / 2;
  return 3 * y1 * t * (1 - t) ** 2 + 3 * y2 * t * t * (1 - t) + t ** 3;
};

export type SpringOpts = { freq?: number; damp?: number };
/** a spring's step response: 0 at t ≤ 0, settling on 1. freq in Hz, damp < 1 overshoots. t in seconds. */
export function spring(t: number, { freq = 2.2, damp = 0.72 }: SpringOpts = {}) {
  if (t <= 0) return 0;
  const w = 2 * Math.PI * freq;
  if (damp >= 1) return 1 - (1 + w * t) * Math.exp(-w * t);
  const wd = w * Math.sqrt(1 - damp * damp);
  return 1 - Math.exp(-damp * w * t) * (Math.cos(wd * t) + ((damp * w) / wd) * Math.sin(wd * t));
}

/**
 * A keyed value that springs from each key to the next: v0 + Σ Δi · spring(f − fi).
 * keys are [frame, value], in order. With `loop` (frames), the keys wrap: the last value must equal the first,
 * and the previous cycle's still-settling springs carry into the next, so frame 0 and frame `loop` match.
 */
export function track(f: number, fps: number, keys: [number, number][], opts: SpringOpts = {}, loop?: number) {
  let v = keys[0]![1];
  for (let i = 1; i < keys.length; i++) {
    const [k, val] = keys[i]!,
      d = val - keys[i - 1]![1];
    v += d * spring((f - k) / fps, opts);
    if (loop) v += d * (spring((f + loop - k) / fps, opts) - 1);
  }
  return v;
}

/** a repeating 0..1 phase for loops (seamless by construction) */
export const phase = (f: number, period: number) => (((f % period) + period) % period) / period;
