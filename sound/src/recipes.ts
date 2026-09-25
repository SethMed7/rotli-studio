// THE STUDIO'S SOUNDS. Each recipe realizes one prompt in sound/prompts/<id>.md. The music is built on the
// films' motif (motion/src/canvas-core/rotli/score.ts: the I-IV-I-V | I-IV-V-I phrase and the music-box
// melody), slowed down and thinned out, so the studio sounds like the films, only quieter.
import { MEL, PHRASE } from "../../motion/src/canvas-core/rotli/score";
import { bell, buffer, foldLoop, normalize, pad, pluck, reverb, type Buf } from "./synth";

export type Recipe = { id: string; kind: "music" | "effect"; title: string; use: string; render: () => Buf };

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
    use: "the studio's music, looping quietly while sound is on",
    render: linen,
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
