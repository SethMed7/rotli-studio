// THE SCORE, by the anidoodle recipe: music-box plucks, 2 ms attacks, pure exponential decays,
// major keys, one chord per bar, no pads, no drones, no reverb tails. Pushed toward energetic from
// the turn (frame 300): a soft kick, a shaker on the triplets, the rolling 1-5-3-5 arpeggio.
// It lifts a whole step for the sunset. Every onset is a FRAME; samples are round(frame/fps*sr).
import { rng } from "../core";

const FPS = 30,
  BAR = 60,
  TRIP = 5; // frames: bar = 4 beats of 15, triplet eighth = 5
/** which bar of the 8-bar phrase plays: the tune restarts on I at the turn (bar 5) and at the sunset lift (bar 26) */
export const phraseBar = (b: number) => (b < 5 ? b : b < 26 ? (b - 5) % 8 : (b - 26) % 8);
const hz = (m: number) => 440 * 2 ** ((m - 69) / 12);
type Chord = [number, number, number]; // root, third, fifth (MIDI, octave 4)
const I: Chord = [60, 64, 67],
  IV: Chord = [65, 69, 72],
  V: Chord = [67, 71, 74];
export const PHRASE: Chord[] = [I, IV, I, V, I, IV, V, I];
// melody per bar: [triplet slot 0..11, midi]; question ends on the fifth over V, answer on the root over I
export const MEL: [number, number][][] = [
  [
    [0, 76],
    [3, 79],
    [6, 84],
    [9, 79],
  ],
  [
    [0, 81],
    [3, 77],
    [6, 81],
    [9, 84],
  ],
  [
    [0, 79],
    [3, 76],
    [6, 72],
    [8, 74],
    [10, 76],
  ],
  [
    [0, 74],
    [3, 71],
    [6, 79],
  ],
  [
    [0, 76],
    [3, 79],
    [6, 84],
    [9, 79],
  ],
  [
    [0, 81],
    [3, 77],
    [6, 81],
    [9, 84],
  ],
  [
    [0, 83],
    [3, 79],
    [6, 74],
    [9, 79],
  ],
  [
    [0, 76],
    [3, 74],
    [6, 72],
  ],
];
// sound events, by frame (see story.md cue table)
export const CUES = {
  hops: [68, 84, 102, 330, 532, 1576, 1592],
  badges: Array.from({ length: 12 }, (_, i) => 150 + 18 + i * 8 + 4),
  turn: 300,
  typing: [
    [322, 340],
    [350, 368],
    [380, 394],
    [400, 416],
    [426, 438],
    [472, 474],
    [1360, 1384],
  ] as [number, number][],
  plinks: [
    378, 462, 476, 488, 498, 564, 580, 594, 608, 622, 636, 764, 782, 800, 818, 836, 854, 966, 973, 980, 987, 994, 1060,
    1110, 1186, 1200, 1480, 1488, 1590,
  ],
  thumps: [564, 1060, 1110],
  boings: [1238, 1254, 1270],
  checks: [1290, 1510],
  bell: 1620,
  shutter: 1660,
  final: 1740,
};

export const score =
  (frames: number) =>
  (sr: number): [Float32Array, Float32Array] => {
    const n = Math.ceil((frames / FPS) * sr),
      L = new Float32Array(n),
      R = new Float32Array(n),
      at = (f: number) => Math.round((f / FPS) * sr);
    const add = (i: number, v: number, pan: number) => {
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
        add(i0 + k + Math.floor(0.03 * sr), v * 0.2, 1 - pan); // one early reflection
      }
    };
    const bell = (f: number, midi: number, vel: number) => {
      const fr = hz(midi),
        i0 = at(f),
        len = Math.floor(sr * 4.5);
      for (let k = 0; k < len; k++) {
        const t = k / sr,
          env = Math.min(1, t / 0.002) * Math.exp(-t / 1.2),
          w = 2 * Math.PI * fr * t;
        const v =
          (Math.sin(w) +
            0.5 * Math.sin(2 * w) +
            0.3 * Math.sin(3 * w) +
            0.2 * Math.sin(4.2 * w) +
            0.5 * Math.sin(w / 2)) *
          env *
          vel;
        add(i0 + k, v, 0.5);
      }
    };
    const noise = rng(4242);
    const click = (f: number, vel: number, bright = 1, dur = 0.004) => {
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

    const bars = Math.floor(frames / BAR);
    for (let b = 0; b < bars; b++) {
      const f0 = b * BAR,
        lift = f0 >= 1560 ? 2 : 0,
        chord = PHRASE[phraseBar(b)].map((m) => m + lift) as Chord,
        mel = MEL[phraseBar(b)],
        energetic = f0 >= 300 && f0 < 1740;
      if (f0 >= 1740) {
        const home = I.map((m) => m + lift);
        home.forEach((m, i) => pluck(f0 + i * 2, m + 12, 0.7, 0.3 + i * 0.2));
        pluck(f0, home[0] - 24, 0.9, 0.5, true);
        break;
      }
      // melody: alone for the opening, octave-doubled from the librarian on
      for (const [slot, m] of mel) {
        const f = f0 + slot * TRIP,
          v = slot % 3 === 0 ? (slot === 0 ? 1 : 0.8) : 0.55;
        pluck(f, m + lift, v * 0.55, 0.55);
        if (f0 >= 720) pluck(f, m + lift + 12, v * 0.2, 0.62);
      }
      // bass on beats 1 and 3, from bar 2
      if (b >= 2) {
        pluck(f0, chord[0] - 24, 0.8, 0.5, true);
        pluck(f0 + 30, chord[2] - 24, 0.65, 0.5, true);
      }
      // the rolling arpeggio, from the turn
      if (energetic) {
        const pat = [0, 2, 1, 2];
        for (let s = 0; s < 12; s++)
          pluck(f0 + s * TRIP, chord[pat[s % 4]], s % 3 === 0 ? 0.28 : 0.18, 0.35 + 0.3 * (s % 2));
      }
      // kick + shaker, from the turn
      if (energetic) {
        kick(f0, 0.55);
        kick(f0 + 30, 0.45);
        for (let s = 0; s < 12; s++) click(f0 + s * TRIP, s % 3 === 0 ? 0.09 : 0.05, 1.3, 0.012);
      }
    }
    // sound events
    CUES.hops.forEach((f) => pluck(f, 84, 0.18, 0.4, true));
    CUES.badges.forEach((f, i) => pluck(f, [96, 91, 100, 93, 98][i % 5], 0.32, i % 2 ? 0.25 : 0.75));
    kick(CUES.turn, 1.0);
    click(CUES.turn, 0.5, 0.5, 0.02);
    pluck(CUES.turn, 84, 0.6, 0.5);
    for (const [a, z] of CUES.typing) for (let f = a; f < z; f += 2) click(f, 0.07, 1.6, 0.003);
    CUES.plinks.forEach((f, i) => pluck(f, [88, 91, 93, 96, 91, 98][i % 6], 0.3, 0.3 + (i % 3) * 0.2));
    CUES.thumps.forEach((f) => {
      kick(f, 0.35);
      pluck(f, 67, 0.25, 0.5, true);
    });
    CUES.boings.forEach((f, i) => {
      pluck(f, 55 + i * 2, 0.45, 0.7, true);
      pluck(f + 3, 62 + i * 2, 0.3, 0.7);
    });
    CUES.checks.forEach((f) => {
      pluck(f, 88, 0.4, 0.5);
      pluck(f + 5, 96, 0.35, 0.5);
    });
    bell(CUES.bell, 74 + 12, 0.35); // D6 over the lifted tonic
    click(CUES.shutter, 0.5, 1.8, 0.006);
    click(CUES.shutter + 3, 0.35, 1.8, 0.006);
    bell(CUES.final, 74, 0.3);
    // master: normalise, soft clip, then settle the peak at -4 dBFS
    let peak = 0;
    for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
    const g = 0.708 / (peak || 1);
    let post = 0;
    for (let i = 0; i < n; i++) {
      L[i] = Math.tanh(L[i] * g * 1.15);
      R[i] = Math.tanh(R[i] * g * 1.15);
      post = Math.max(post, Math.abs(L[i]), Math.abs(R[i]));
    }
    const out = 0.63 / (post || 1); // -4 dBFS, leaving headroom for the AAC encoder's overshoot
    for (let i = 0; i < n; i++) {
      L[i] *= out;
      R[i] *= out;
    }
    return [L, R];
  };
