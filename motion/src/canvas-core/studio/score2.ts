// A REUSABLE SCORE on Rotli's sonic motif: the same music-box melody and I-IV-I-V phrase as the
// film (so every piece sounds like the brand), laid out for any length. Everything is a FRAME.
// The sealed film keeps its own score.ts; this is the one new pieces use.
import { rng } from "../core";
import { MEL, PHRASE } from "../rotli/score";

export type ScoreSpec = {
  frames: number;
  fps?: number;
  energeticFrom?: number; // kick + shaker + arpeggio from this frame (a bar line)
  liftAt?: number; // up a whole step from this bar line
  sparkleFrom?: number; // octave doubling from here
  bellAt?: number[]; // bells on these frames
  endAt?: number; // final tonic chord here (music stops after)
  pops?: [number, number][]; // [frame, midi] plucks for on-screen events
  clicks?: number[]; // typing / shutter ticks
  thumps?: number[]; // soft landings
  key?: number; // semitones up from C (atmospheres use 0 C, 2 D, 5 F, 7 G); everything transposes
  melody?: 0 | 1 | 2; // 0 = the film's tune, 1 = "walking", 2 = "lilting" (same recipe, same chords)
};
// two more 8-bar melodies on the same I-IV-I-V | I-IV-V-I phrase: chord tones and the pentatonic, the question
// ends on the fifth over V (bar 4), the answer on the root over I (bar 8)
const MEL_WALK: [number, number][][] = [
  [
    [0, 72],
    [3, 76],
    [6, 79],
    [9, 76],
  ],
  [
    [0, 77],
    [3, 81],
    [6, 84],
    [9, 81],
  ],
  [
    [0, 79],
    [4, 81],
    [6, 79],
    [9, 76],
  ],
  [
    [0, 74],
    [3, 79],
    [6, 79],
  ],
  [
    [0, 72],
    [3, 76],
    [6, 79],
    [9, 84],
  ],
  [
    [0, 81],
    [3, 77],
    [6, 72],
    [9, 77],
  ],
  [
    [0, 79],
    [3, 74],
    [6, 71],
    [9, 74],
  ],
  [
    [0, 76],
    [3, 79],
    [6, 72],
  ],
];
const MEL_LILT: [number, number][][] = [
  [
    [0, 79],
    [2, 81],
    [4, 79],
    [6, 76],
    [9, 72],
  ],
  [
    [0, 77],
    [2, 79],
    [4, 81],
    [6, 84],
    [9, 81],
  ],
  [
    [0, 79],
    [3, 76],
    [6, 74],
    [8, 76],
    [10, 79],
  ],
  [
    [0, 83],
    [3, 79],
    [6, 74],
    [9, 79],
  ],
  [
    [0, 79],
    [2, 81],
    [4, 79],
    [6, 76],
    [9, 79],
  ],
  [
    [0, 81],
    [3, 84],
    [6, 81],
    [9, 77],
  ],
  [
    [0, 79],
    [3, 83],
    [6, 86],
    [9, 83],
  ],
  [
    [0, 84],
    [3, 79],
    [6, 72],
  ],
];
export const makeScore =
  (sp: ScoreSpec) =>
  (sr: number): [Float32Array, Float32Array] => {
    const FPS = sp.fps ?? 30,
      BAR = 60,
      TRIP = 5,
      n = Math.ceil((sp.frames / FPS) * sr),
      L = new Float32Array(n),
      R = new Float32Array(n),
      at = (f: number) => Math.round((f / FPS) * sr);
    const hz = (m: number) => 440 * 2 ** ((m - 69) / 12),
      add = (i: number, v: number, pan: number) => {
        if (i >= 0 && i < n) {
          L[i] += v * (1 - pan);
          R[i] += v * pan;
        }
      };
    const pluck = (f: number, midi: number, vel: number, pan = 0.5, bass = false) => {
      const fr = hz(midi),
        tau = 0.45 * Math.sqrt(440 / fr),
        len = Math.min(sr * 3, Math.floor(tau * 5 * sr)),
        i0 = at(f);
      for (let k = 0; k < len; k++) {
        const t = k / sr,
          env = Math.min(1, t / 0.002) * Math.exp(-t / tau),
          w = 2 * Math.PI * fr * t;
        let v = Math.sin(w) + 0.35 * Math.sin(2 * w);
        if (!bass) v += 0.12 * Math.sin(3 * w) + 0.08 * Math.sin(5.4 * w) * Math.exp(-t / 0.06);
        v *= env * vel * (bass ? 0.5 : 1);
        add(i0 + k, v, pan);
        add(i0 + k + Math.floor(0.03 * sr), v * 0.2, 1 - pan);
      }
    };
    const bell = (f: number, midi: number, vel: number) => {
      const fr = hz(midi),
        i0 = at(f),
        len = Math.floor(sr * 4);
      for (let k = 0; k < len; k++) {
        const t = k / sr,
          env = Math.min(1, t / 0.002) * Math.exp(-t / 1.2),
          w = 2 * Math.PI * fr * t;
        add(
          i0 + k,
          (Math.sin(w) +
            0.5 * Math.sin(2 * w) +
            0.3 * Math.sin(3 * w) +
            0.2 * Math.sin(4.2 * w) +
            0.5 * Math.sin(w / 2)) *
            env *
            vel,
          0.5,
        );
      }
    };
    const noise = rng(4242),
      click = (f: number, vel: number, bright = 1, dur = 0.004) => {
        const i0 = at(f),
          len = Math.floor(dur * sr);
        let prev = 0;
        for (let k = 0; k < len; k++) {
          const x = noise() * 2 - 1,
            hp = x - prev * (0.6 + 0.3 * bright);
          prev = x;
          add(i0 + k, hp * vel * Math.exp(-k / (len * 0.35)), 0.5);
        }
      };
    const kick = (f: number, vel: number) => {
      const i0 = at(f),
        len = Math.floor(0.22 * sr);
      let ph = 0;
      for (let k = 0; k < len; k++) {
        const t = k / sr,
          fr = 48 + 90 * Math.exp(-t / 0.03);
        ph += (2 * Math.PI * fr) / sr;
        add(i0 + k, Math.sin(ph) * Math.exp(-t / 0.09) * vel * Math.min(1, t / 0.002), 0.5);
      }
    };
    const K = sp.key ?? 0,
      TUNE = [MEL, MEL_WALK, MEL_LILT][sp.melody ?? 0];
    const eBar = sp.energeticFrom === undefined ? Infinity : Math.floor(sp.energeticFrom / BAR),
      lBar = sp.liftAt === undefined ? Infinity : Math.floor(sp.liftAt / BAR),
      endBar = Math.floor((sp.endAt ?? sp.frames) / BAR);
    for (let b = 0; b * BAR < sp.frames; b++) {
      const f0 = b * BAR,
        lift = (b >= lBar ? 2 : 0) + K,
        pb = b < eBar ? b % 8 : b < lBar ? (b - eBar) % 8 : (b - lBar) % 8;
      if (b >= endBar) {
        if (b === endBar) {
          [60, 64, 67].forEach((m, i) => pluck(f0 + i * 2, m + 12 + lift, 0.7, 0.3 + i * 0.2));
          pluck(f0, 36 + lift, 0.9, 0.5, true);
        }
        continue;
      }
      const chord = PHRASE[pb].map((m) => m + lift),
        energetic = b >= eBar;
      for (const [slot, m] of TUNE[pb]) {
        const f = f0 + slot * TRIP,
          v = slot % 3 === 0 ? (slot === 0 ? 1 : 0.8) : 0.55;
        pluck(f, m + lift, v * 0.55, 0.55);
        if (sp.sparkleFrom !== undefined && f0 >= sp.sparkleFrom) pluck(f, m + lift + 12, v * 0.2, 0.62);
      }
      if (b >= 1) {
        pluck(f0, chord[0] - 24, 0.8, 0.5, true);
        pluck(f0 + 30, chord[2] - 24, 0.65, 0.5, true);
      }
      if (energetic) {
        const pat = [0, 2, 1, 2];
        for (let s = 0; s < 12; s++)
          pluck(f0 + s * TRIP, chord[pat[s % 4]], s % 3 === 0 ? 0.28 : 0.18, 0.35 + 0.3 * (s % 2));
        kick(f0, 0.55);
        kick(f0 + 30, 0.45);
        for (let s = 0; s < 12; s++) click(f0 + s * TRIP, s % 3 === 0 ? 0.09 : 0.05, 1.3, 0.012);
      }
    }
    (sp.pops ?? []).forEach(([f, m], i) => pluck(f, m + K, 0.32, 0.3 + (i % 3) * 0.2));
    (sp.clicks ?? []).forEach((f) => click(f, 0.3, 1.8, 0.005));
    (sp.thumps ?? []).forEach((f) => {
      kick(f, 0.35);
      pluck(f, 67, 0.25, 0.5, true);
    });
    (sp.bellAt ?? []).forEach((f) => bell(f, 84 + K, 0.33));
    let peak = 0;
    for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
    const g = 0.708 / (peak || 1);
    let post = 0;
    for (let i = 0; i < n; i++) {
      L[i] = Math.tanh(L[i] * g * 1.15);
      R[i] = Math.tanh(R[i] * g * 1.15);
      post = Math.max(post, Math.abs(L[i]), Math.abs(R[i]));
    }
    const out = 0.63 / (post || 1);
    for (let i = 0; i < n; i++) {
      L[i] *= out;
      R[i] *= out;
    }
    return [L, R];
  };
/** C-major pentatonic, climbing: a pop per on-screen event that always sounds in key */
export const PENTA = [72, 74, 76, 79, 81, 84, 86, 88, 91, 93, 96];
