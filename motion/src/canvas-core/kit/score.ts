// A BEAT SCORE for brand-neutral pieces: a four-chord loop (minor i–VI–III–VII) with pad, bass, a plucked
// arpeggio and, in "drive", kick and hats. Cues put hits, whooshes, UI ticks and a three-note sign-off on exact
// frames, so picture and sound cut together. Pure and seeded: the same spec is the same samples.
import { rng } from "../core";

export type BeatSpec = {
  frames: number;
  fps: number;
  bpm: number;
  /** drive: kick, hats, bass, 16th arpeggio · soft: pad, bass and an 8th pluck only */
  mood?: "drive" | "soft";
  /** semitones up from A minor */
  key?: number;
  /** drums enter here (before it: pad and pluck only) */
  drop?: number;
  /** a stab + noise burst on each frame */
  hits?: number[];
  /** a rising noise swell that ENDS on each frame */
  whooshes?: number[];
  /** soft UI clicks */
  ticks?: number[];
  /** a three-note sign-off starting here; the loop stops underneath it */
  sign?: number;
  /** tails wrap around the end, so the audio loops seamlessly with a looping picture */
  loop?: boolean;
  gain?: number;
};

const CHORDS = [
  [57, 60, 64],
  [53, 57, 60],
  [48, 52, 55],
  [55, 59, 62],
]; // Am F C G (midi)
const hz = (m: number) => 440 * 2 ** ((m - 69) / 12);

export const beatScore =
  (sp: BeatSpec) =>
  (sr: number): [Float32Array, Float32Array] => {
    const n = Math.ceil((sp.frames / sp.fps) * sr),
      L = new Float32Array(n),
      R = new Float32Array(n);
    const at = (f: number) => Math.round((f / sp.fps) * sr),
      beat = (60 / sp.bpm) * sr,
      K = sp.key ?? 0,
      noise = rng(7);
    const add = (i: number, v: number, pan = 0.5) => {
      if (sp.loop) i = ((i % n) + n) % n;
      else if (i < 0 || i >= n) return;
      L[i] += v * (1 - pan) * 2 * 0.5;
      R[i] += v * pan * 2 * 0.5;
    };
    const endAt = sp.sign !== undefined ? at(sp.sign) : sp.loop ? Infinity : n;
    const tone = (
      i0: number,
      midi: number,
      vel: number,
      len: number,
      kind: "pluck" | "pad" | "bass" | "bell",
      pan = 0.5,
    ) => {
      const fr = hz(midi + K);
      let ph = 0;
      for (let k = 0; k < len; k++) {
        const t = k / sr;
        ph += fr / sr;
        const s =
          kind === "pluck"
            ? (Math.sin(2 * Math.PI * ph) + 0.35 * Math.sin(4 * Math.PI * ph)) *
              Math.exp(-t * 7) *
              Math.min(1, t / 0.003)
            : kind === "bell"
              ? (Math.sin(2 * Math.PI * ph) + 0.4 * Math.sin(2 * Math.PI * ph * 2.76)) *
                Math.exp(-t * 2.4) *
                Math.min(1, t / 0.002)
              : kind === "bass"
                ? (Math.sin(2 * Math.PI * ph) + 0.25 * Math.sin(4 * Math.PI * ph)) *
                  Math.min(1, t / 0.01) *
                  Math.min(1, (len - k) / (0.05 * sr))
                : (Math.sin(2 * Math.PI * ph) +
                    0.5 * Math.sin(2 * Math.PI * ph * 1.003) +
                    0.25 * Math.sin(4 * Math.PI * ph * 0.998)) *
                  Math.min(1, t / 0.4, (len - k) / (0.4 * sr));
        add(i0 + k, s * vel, pan);
      }
    };
    const kick = (i0: number, vel: number) => {
      let ph = 0;
      for (let k = 0; k < 0.25 * sr; k++) {
        const t = k / sr;
        ph += (45 + 110 * Math.exp(-t / 0.03)) / sr;
        add(i0 + k, Math.sin(2 * Math.PI * ph) * Math.exp(-t / 0.09) * vel);
      }
    };
    const hiss = (i0: number, len: number, vel: (t: number) => number, pan = 0.5) => {
      let a = 0,
        b = 0;
      for (let k = 0; k < len; k++) {
        const x = noise() * 2 - 1;
        a += 0.55 * (x - a);
        b = x - a;
        add(i0 + k, b * vel(k / len), pan);
      }
    };

    const bars = Math.ceil(n / (beat * 4)),
      drive = (sp.mood ?? "drive") === "drive",
      drop = sp.drop !== undefined ? at(sp.drop) : 0;
    for (let b = 0; b < bars; b++) {
      const i0 = Math.round(b * 4 * beat),
        ch = CHORDS[b % 4]!;
      if (i0 >= endAt) break;
      const barLen = Math.min(Math.round(4 * beat), endAt - i0);
      ch.forEach((m, v) => tone(i0, m, 0.05, barLen, "pad", 0.3 + v * 0.2));
      tone(i0, ch[0]! - 24, 0.16, Math.min(Math.round(beat * 1.8), barLen), "bass");
      tone(
        i0 + Math.round(beat * 2),
        ch[0]! - 24,
        0.12,
        Math.min(Math.round(beat * 1.6), barLen - Math.round(beat * 2)),
        "bass",
      );
      const steps = drive ? 16 : 8,
        arp = [0, 1, 2, 1, 0, 2, 1, 2];
      for (let s = 0; s < steps; s++) {
        const j = i0 + Math.round((s * 4 * beat) / steps);
        if (j >= endAt) break;
        tone(
          j,
          ch[arp[s % 8]!]! + 12 + (s % 8 === 7 ? 12 : 0),
          drive ? 0.07 : 0.09,
          Math.round(0.4 * sr),
          "pluck",
          s % 2 ? 0.35 : 0.65,
        );
        if (drive && j >= drop) {
          if (s % 4 === 0) kick(j, 0.5);
          if (s % 2 === 1) hiss(j, Math.round(0.03 * sr), (t) => 0.05 * (1 - t), 0.6);
        }
      }
    }
    for (const f of sp.hits ?? []) {
      const i = at(f);
      kick(i, 0.6);
      hiss(i, Math.round(0.35 * sr), (t) => 0.16 * (1 - t) ** 2);
      CHORDS[0]!.forEach((m) => tone(i, m + 12, 0.05, Math.round(0.5 * sr), "pluck"));
    }
    for (const f of sp.whooshes ?? []) {
      const len = Math.round(0.7 * sr);
      hiss(at(f) - len, len, (t) => 0.12 * t * t);
    }
    for (const f of sp.ticks ?? []) hiss(at(f), Math.round(0.006 * sr), (t) => 0.3 * (1 - t), 0.55);
    if (sp.sign !== undefined)
      [69, 76, 81].forEach((m, i) =>
        tone(at(sp.sign!) + Math.round(i * beat * 0.5), m, 0.14, Math.round(2.5 * sr), "bell", 0.35 + i * 0.15),
      );

    // one static gain to full scale, then a gentle tanh saturation: louder (about −15 LUFS, where social video
    // sits) with no limiter pumping, and still deterministic
    let peak = 1e-9;
    for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(L[i]!), Math.abs(R[i]!));
    const g = 1 / peak,
      sat = 1.6,
      out = (sp.gain ?? 0.8) / Math.tanh(sat);
    for (let i = 0; i < n; i++) {
      L[i] = Math.tanh(L[i]! * g * sat) * out;
      R[i] = Math.tanh(R[i]! * g * sat) * out;
    }
    return [L, R];
  };
