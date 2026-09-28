// THE STUDIO'S SOUNDS. Each recipe realizes one prompt in sound/prompts/<id>.md. The music is built on the
// films' motif (motion/src/canvas-core/rotli/score.ts: the I-IV-I-V | I-IV-V-I phrase and the music-box
// melody), slowed down and thinned out, so the studio sounds like the films, only quieter.
import { MEL, PHRASE } from "../../motion/src/canvas-core/rotli/score";
import {
  bass,
  bell,
  buffer,
  chirp,
  crackle,
  epiano,
  foldLoop,
  kick,
  mallet,
  master,
  noise,
  normalize,
  pad,
  piano,
  pluck,
  reverb,
  type Buf,
} from "./synth";

/** music tracks name the theme family they are written for (motion/brand/themes.json), which the Sound page shows */
export type Recipe = {
  id: string;
  kind: "music" | "effect";
  title: string;
  use: string;
  render: () => Buf;
  playlist?: { family: string; theme: string; bpm: number; key: string };
};

// ---------------------------------------------------------------- music
/** "Linen": the studio theme. 16 bars at 66 bpm (about 58 s), a seamless loop. */
function linen(): Buf {
  const bpm = 66,
    beat = 60 / bpm,
    bar = beat * 4,
    bars = 16,
    loop = bar * bars,
    b = buffer(loop + 8);
  for (let n = 0; n < bars; n++) {
    const t = n * bar,
      chord = PHRASE[n % 8]!;
    pad(b, t, bar, [chord[0] - 12, chord[1], chord[2]], 0.34, { attack: 1.6, release: 2.2 }); // warm chord, the third and fifth up high
    pluck(b, t, chord[0] - 24, 0.16, { decay: 1.8, bright: 0.1, pan: 0.45 }); // a soft root on the downbeat
    // the melody, thinned: the first two notes of each bar, the second pass an octave lower and later
    const notes = MEL[n % 8]!.slice(0, 2),
      second = n >= 8;
    notes.forEach(([slot, midi], i) =>
      pluck(b, t + (slot / 12) * bar + (second ? beat / 2 : 0), midi - (second ? 12 : 0), i ? 0.07 : 0.1, {
        decay: 1.5,
        bright: 0.3,
        pan: 0.35 + 0.3 * (i % 2),
      }),
    );
  }
  reverb(b, 0.32, 1.2);
  const out = foldLoop(b, loop);
  normalize(out, -9);
  return out;
}

// ---------------------------------------------------------------- the playlist: one track per theme family
// Every track keeps the films' phrase and melody (so the playlist sounds like one album) and changes the key, the
// tempo, the instruments and the room to suit its family. Each is mastered to Linen's loudness, -21 LUFS, so the
// studio can move from one to the next without a jump in level, and each loops without a seam.
const PLAYLIST_LUFS = -21;
const chordOf = (n: number, key: number) => PHRASE[n % 8]!.map((m) => m + key) as [number, number, number];
const melodyOf = (n: number, key: number) => MEL[n % 8]!.map(([slot, m]) => [slot, m + key] as const);
const finish = (b: Buf, loop: number, room: number, size: number) => {
  reverb(b, room, size);
  const out = foldLoop(b, loop);
  master(out, PLAYLIST_LUFS);
  return out;
};

/** "Graphite" (Paper & Charcoal): the melody on a felt piano, alone, in a small dry room. F major, 72 bpm. */
function graphite(): Buf {
  const K = -7,
    beat = 60 / 72,
    bar = beat * 4,
    bars = 16,
    loop = bar * bars,
    b = buffer(loop + 10);
  for (let n = 0; n < bars; n++) {
    const t = n * bar,
      [r, third, fifth] = chordOf(n, K),
      second = n >= 8;
    // left hand: the root low on the downbeat, then the chord broken gently upward
    piano(b, t, r - 12, 0.5, { pan: 0.4 });
    piano(b, t + beat, fifth - 12, 0.26, { pan: 0.42 });
    piano(b, t + 2 * beat, third, 0.22, { pan: 0.45 });
    piano(b, t + 3 * beat, fifth - 12, 0.2, { pan: 0.42 });
    // right hand: the whole tune the first time; the second time every other note, with a quiet echo above
    melodyOf(n, K).forEach(([slot, m], i) => {
      if (second && i % 2) return;
      piano(b, t + (slot / 12) * bar, m, 0.42 - i * 0.03, { pan: 0.6 });
      if (second) piano(b, t + (slot / 12) * bar + beat / 2, m + 12, 0.1, { pan: 0.7, decay: 1.6 });
    });
    // every fourth bar, a pencil crossing the page
    if (n % 4 === 3)
      noise(b, t + 2 * beat, 0.7, 0.025, {
        seed: 40 + n,
        tone: 0.8,
        env: (u) => Math.sin(Math.PI * u) ** 2,
        pan: 0.65,
      });
  }
  return finish(b, loop, 0.18, 0.8);
}

/** "Tide" (Ocean): pads that breathe like a swell, a slow marimba arpeggio, surf every two bars. D major, 60 bpm. */
function tide(): Buf {
  const K = 2,
    beat = 1,
    bar = 4,
    bars = 16,
    loop = bar * bars,
    b = buffer(loop + 12);
  for (let n = 0; n < bars; n++) {
    const t = n * bar,
      [r, third, fifth] = chordOf(n, K);
    pad(b, t, bar, [r - 12, third, fifth, r + 12], 0.3, {
      attack: 2.4,
      release: 3,
      swell: { period: 2 * bar, depth: 0.45 },
    });
    bass(b, t, r - 24, bar, 0.16);
    // the rolling 1-5-3-5, slowed to eighths and moved down under the melody
    [r, fifth, third + 12, fifth].forEach((m, i) => {
      mallet(b, t + i * beat, m, 0.12, { pan: i % 2 ? 0.3 : 0.7, decay: 0.9 });
      mallet(b, t + (i + 0.5) * beat, [fifth, third + 12, fifth, r + 12][i]!, 0.07, { pan: 0.5, decay: 0.7 });
    });
    // the melody's first and third notes, like light on the water; an octave up in the second half
    melodyOf(n, K)
      .filter((_, i) => i === 0 || i === 2)
      .forEach(([slot, m], i) =>
        pluck(b, t + (slot / 12) * bar, m + (n >= 8 ? 12 : 0), n >= 8 ? 0.08 : 0.12, {
          decay: 2,
          bright: 0.5,
          pan: 0.4 + 0.2 * i,
        }),
      );
    // a wave: it gathers for a few seconds and falls back over the rest, moving across the stereo field
    if (n % 2 === 0) {
      const dir = (n / 2) % 2 ? -1 : 1;
      noise(b, t + 0.5, 2 * bar + 1.5, 0.07, {
        seed: 100 + n,
        tone: 0.34,
        env: (u) => (u < 0.35 ? (u / 0.35) ** 2 : (1 - (u - 0.35) / 0.65) ** 1.6),
        pan: (u) => 0.5 + dir * (0.25 - 0.5 * u),
      });
    }
  }
  return finish(b, loop, 0.38, 1.4);
}

/** "Canopy" (Grove): the tune on marimba, a shaker and a round bass join, birds between phrases. G major, 88 bpm. */
function canopy(): Buf {
  const K = -5,
    beat = 60 / 88,
    bar = beat * 4,
    bars = 24,
    loop = bar * bars,
    b = buffer(loop + 8);
  for (let n = 0; n < bars; n++) {
    const t = n * bar,
      pass = Math.floor(n / 8), // 0: marimba alone · 1: the band comes in · 2: a lighter band and a counter-line
      [r, third, fifth] = chordOf(n, K);
    pad(b, t, bar, [r - 12, third, fifth], 0.14, { attack: 0.6, release: 1 });
    melodyOf(n, K).forEach(([slot, m], i) =>
      mallet(b, t + (slot / 12) * bar, m, 0.34 - i * 0.02, { pan: 0.55, decay: 0.6 }),
    );
    if (pass >= 1) {
      bass(b, t, r - 24, beat * 1.5, 0.3);
      bass(b, t + 2 * beat, fifth - 24, beat * 1.2, 0.22);
      for (let s = 0; s < 8; s++)
        noise(b, t + (s * beat) / 2, 0.06, s % 2 ? 0.05 : 0.022, {
          seed: 300 + n * 8 + s,
          tone: 0.92,
          env: (u) => (1 - u) ** 2,
          pan: 0.66,
        });
    }
    if (pass === 1) [0, 2].forEach((q) => kick(b, t + q * beat, 0.34));
    if (pass === 2)
      [r + 12, fifth + 12, third + 24, fifth + 12].forEach((m, i) =>
        mallet(b, t + (i * 2 + 1) * (beat / 2), m, 0.09, { pan: 0.3, decay: 0.3 }),
      );
  }
  // birds, where the melody rests
  for (const [n, at, pan] of [
    [1, 3.2, 0.82],
    [5, 2.6, 0.2],
    [9, 3.4, 0.78],
    [14, 1.4, 0.25],
    [19, 3.1, 0.8],
    [22, 2.2, 0.3],
  ] as const) {
    const t = n * bar + at * beat;
    chirp(b, t, 2500, 3500, 0.09, 0.035, pan);
    chirp(b, t + 0.14, 2900, 2300, 0.07, 0.03, pan);
    if (n % 2) chirp(b, t + 0.26, 2600, 3700, 0.1, 0.025, pan);
  }
  return finish(b, loop, 0.24, 0.9);
}

/** "Dusk" (Iris): the phrase as a lo-fi groove, sevenths on an electric piano, brushes and dust. E-flat major, 76 bpm. */
function dusk(): Buf {
  const K = 3,
    beat = 60 / 76,
    bar = beat * 4,
    bars = 16,
    loop = bar * bars,
    swung = (q: number) => Math.floor(q) + (q % 1 ? 2 / 3 : 0), // an offbeat eighth, swung
    b = buffer(loop + 8);
  for (let n = 0; n < bars; n++) {
    const t = n * bar,
      [r, third, fifth] = chordOf(n, K),
      isV = PHRASE[n % 8]![0] === 67,
      voicing = [third - 12, fifth - 12, r + (isV ? 10 : 11) - 12, r + 14 - 12]; // rootless: 3, 5, 7, 9
    voicing.forEach((m, i) => {
      epiano(b, t, m, 0.3, { pan: 0.35 + i * 0.1, decay: 2 });
      epiano(b, t + swung(1.5) * beat, m, 0.16, { pan: 0.35 + i * 0.1, decay: 0.8 });
    });
    bass(b, t, r - 24, beat * 2, 0.34);
    bass(b, t + 3 * beat, fifth - 24, beat, 0.24);
    // the tune enters after a four-bar intro, down an octave on the same piano
    if (n >= 4)
      melodyOf(n, K).forEach(([slot, m], i) =>
        epiano(b, t + (slot / 12) * bar, m - 12, 0.36 - i * 0.03, { pan: 0.6, decay: 1.2, trem: 0.1 }),
      );
    kick(b, t, 0.42);
    kick(b, t + swung(1.5) * beat, 0.24);
    [1, 3].forEach((q) =>
      noise(b, t + q * beat, 0.2, 0.075, { seed: 500 + n * 4 + q, tone: 0.55, env: (u) => (1 - u) ** 3, pan: 0.45 }),
    );
    for (let s = 0; s < 8; s++)
      noise(b, t + swung(s / 2) * beat, 0.035, s % 2 ? 0.022 : 0.03, {
        seed: 600 + n * 8 + s,
        tone: 0.95,
        env: (u) => (1 - u) ** 2,
        pan: 0.62,
      });
  }
  crackle(b, 3, 0.02, 5);
  return finish(b, loop, 0.2, 0.8);
}

/** "Lamplight" (Midnight): low pads, a sub, one bell note a bar, night air and dust. A-flat major, 54 bpm. */
function lamplight(): Buf {
  const K = -4,
    beat = 60 / 54,
    bar = beat * 4,
    bars = 16,
    loop = bar * bars,
    b = buffer(loop + 12);
  for (let n = 0; n < bars; n++) {
    const t = n * bar,
      [r, third, fifth] = chordOf(n, K),
      mel = melodyOf(n, K);
    pad(b, t, bar, [r - 24, r - 12, third - 12, fifth - 12], 0.3, {
      attack: 3,
      release: 4,
      swell: { period: 4 * bar, depth: 0.25 },
    });
    bass(b, t, r - 24, bar, 0.12);
    bell(b, t + (mel[0]![0] / 12) * bar, mel[0]![1], 0.08, 0.4 + 0.2 * (n % 2));
    if (n % 2) bell(b, t + (mel[2]![0] / 12) * bar, mel[2]![1], 0.05, 0.6);
    if (n >= 8) pluck(b, t + 2 * beat, mel[1]![1] + 12, 0.04, { decay: 2.5, bright: 0.6, pan: 0.7 });
  }
  noise(b, 0, loop + 4, 0.014, { seed: 9, tone: 0.15, env: () => 1, pan: 0.5 });
  crackle(b, 2, 0.015, 11);
  return finish(b, loop, 0.45, 1.6);
}

// ---------------------------------------------------------------- effects: short, quiet, all in the theme's key
const fx =
  (seconds: number, draw: (b: Buf) => void, peak = -12) =>
  () => {
    const b = buffer(seconds);
    draw(b);
    reverb(b, 0.2, 0.6);
    normalize(b, peak);
    return b;
  };

export const RECIPES: Recipe[] = [
  {
    id: "linen",
    kind: "music",
    title: "Linen",
    use: "the studio's theme, and the first track of the playlist",
    render: linen,
    playlist: { family: "Rotli", theme: "light", bpm: 66, key: "C major" },
  },
  {
    id: "graphite",
    kind: "music",
    title: "Graphite",
    use: "the playlist's Paper & Charcoal track: the tune alone on a felt piano",
    render: graphite,
    playlist: { family: "Paper & Charcoal", theme: "paper", bpm: 72, key: "F major" },
  },
  {
    id: "tide",
    kind: "music",
    title: "Tide",
    use: "the playlist's Ocean track: breathing pads, a slow marimba, surf",
    render: tide,
    playlist: { family: "Ocean", theme: "ocean-light", bpm: 60, key: "D major" },
  },
  {
    id: "canopy",
    kind: "music",
    title: "Canopy",
    use: "the playlist's Grove track: marimba, shaker, bass and birds",
    render: canopy,
    playlist: { family: "Grove", theme: "grove-light", bpm: 88, key: "G major" },
  },
  {
    id: "dusk",
    kind: "music",
    title: "Dusk",
    use: "the playlist's Iris track: a lo-fi groove on electric piano",
    render: dusk,
    playlist: { family: "Iris", theme: "iris-dark", bpm: 76, key: "E-flat major" },
  },
  {
    id: "lamplight",
    kind: "music",
    title: "Lamplight",
    use: "the playlist's Midnight track: low pads, bells and night air",
    render: lamplight,
    playlist: { family: "Midnight", theme: "midnight-dark", bpm: 54, key: "A-flat major" },
  },
  {
    id: "page",
    kind: "effect",
    title: "Page",
    use: "moving to another page",
    render: fx(1.2, (b) => pluck(b, 0.01, 76, 0.5, { decay: 0.28, bright: 0.25 }), -16),
  },
  {
    id: "open",
    kind: "effect",
    title: "Open",
    use: "opening a piece",
    render: fx(
      1.8,
      (b) => {
        pluck(b, 0.01, 79, 0.45, { decay: 0.35 });
        pluck(b, 0.1, 84, 0.4, { decay: 0.5 });
      },
      -14,
    ),
  },
  {
    id: "sound-on",
    kind: "effect",
    title: "Sound on",
    use: "turning sound on",
    render: fx(
      1.8,
      (b) => {
        pluck(b, 0.01, 72, 0.4, { decay: 0.4 });
        pluck(b, 0.09, 76, 0.4, { decay: 0.4 });
        pluck(b, 0.18, 79, 0.45, { decay: 0.6 });
      },
      -13,
    ),
  },
  {
    id: "sound-off",
    kind: "effect",
    title: "Sound off",
    use: "turning sound off",
    render: fx(
      1.6,
      (b) => {
        pluck(b, 0.01, 79, 0.4, { decay: 0.35 });
        pluck(b, 0.1, 72, 0.4, { decay: 0.55 });
      },
      -15,
    ),
  },
  {
    id: "done",
    kind: "effect",
    title: "Done",
    use: "a check that passed (a golden verified SAME)",
    render: fx(
      3,
      (b) => {
        bell(b, 0.01, 84, 0.35);
        pluck(b, 0.01, 72, 0.3, { decay: 0.8 });
        pluck(b, 0.01, 76, 0.25, { decay: 0.8 });
      },
      -13,
    ),
  },
];
