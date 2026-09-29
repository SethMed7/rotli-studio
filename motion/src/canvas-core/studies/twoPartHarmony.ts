// STUDY 54 · TWO-PART HARMONY (120 s, 30 fps, 120 bpm). A music video for an original duet about how Claude
// Opus 5.5 and Claude Sonnet 5.5 work together, sung in code by two pixel critters: Opus (glasses, the low voice)
// and Sonnet (headphones, the high voice). Verses give each model its own job, the bridge-before-the-bridge is the
// advisor tool (Sonnet calls, Opus reads the whole thread and sends back sealed advice), and every claim on screen
// is in the brief's `facts` with its source.
// Brief: series/studies/briefs/two-part-harmony.json · prompt: series/studies/prompts/two-part-harmony.prompt.md
//
// THE SONG IS DATA. One syllable table (SONG) carries each syllable's singer, pitch, vowel and consonants. It drives
// both formant voices in audio(sr), the lit karaoke syllables, the singing mouths and the choreography's accents,
// so picture and sound cannot drift. The voice engine is Study 25's (fivePointFive.ts), copied and given a second
// timbre; nothing here imports another piece.
//
// The critters are drawn from scratch as a 14 × 8 pixel grid, after the Claude Code mascot (Anthropic's; see
// NOTICE: the character is not MIT). The whole film is one continuous paint(F); shots only name the sections.
//
// CUE TABLE (bar = 60 frames, beat = 15)
//   bars  1–4   intro      0–239   "5.5" slams on frame 0; Opus lands (15), Sonnet lands (30); title; count-in (180–239)
//   bars  5–12  verse 1   240–719  Opus: the hardest problem · the long road · judgment · the plan, line by line
//   bars 13–20  verse 2   720–1199 Sonnet: the spec · the checks · 30 % faster than Sonnet 5 · fewer tokens
//   bars 21–28  chorus   1200–1679 "One to make the plan, one to make it go · Plan it! Build it! Check it! Ship it!"
//   bars 29–36  advisor  1680–2159 the call · the whole thread · the sealed envelope · "your code can't read it"
//   bars 37–44  chorus 2 2160–2639 the concert: spotlights, a crowd, LED cards
//   bars 45–48  bridge   2640–2879 half time, one fact card a bar: 1M tokens · effort · the prices · executor rates
//   bars 49–56  chorus 3 2880–3359 up a whole step (G → A), every colour, callbacks
//   bars 57–60  outro    3360–3599 "five point five" · the high five on 3480 · the end card
import PACK from "../../../brand/packs/studio/pack.json";
import type { Ctx, Env } from "../core";
import { rng } from "../core";
import type { Film, Shot } from "../film";
import { clamp, ease, lerp, prog, spring } from "../kit/motion";
import { usePack } from "../kit/pack";
import { layout, type Size } from "../kit/sizes";
import { measure, text } from "../kit/type";
import { rr } from "../kit/ui";

const P = usePack(PACK),
  C = P.palette("ivory"),
  F_ = P.face;
const FPS = 30,
  BPM = 120,
  BEAT = 15, // frames per beat
  BAR = 60, // frames per bar
  BARS = 60,
  N = BARS * BAR; // 3600
const TAU = Math.PI * 2;
const OPUS = C.accent, // the clay: Opus's lines and seal
  SONNET = C.accent2, // the blue: Sonnet's lines and headphones
  BOTH = C.green; // sung together

/** the frame a bar/beat starts on (bar is 1-indexed): the same arithmetic the audio uses */
const frameOf = (bar: number, beat = 0) => (bar - 1) * BAR + beat * BEAT;

// ================================================================== THE SONG
// [bar, beat in bar, length in beats, midi, vowel, "onset|coda" consonants, text, singer]
// vowels: a ɑ · ae æ · e (say) · i · o · u · A ʌ · E ɛ · I ɪ · @ ə · R ɜ · O ɔ; "x>y" glides x into y.
// text "~" continues the previous syllable on a new pitch. Word ends carry their trailing space.
// singer: O = Opus (low), S = Sonnet (high), B = both (Sonnet on the tune, Opus a tenth below).
type Who = "O" | "S" | "B";
type Row = [number, number, number, number, string, string, string, Who];
type Cell = [number, number, number, string, string, string];
const at = (who: Who, bar: number, cells: Cell[], tr = 0): Row[] =>
  cells.map(([beat, len, midi, v, c, t]) => [bar, beat, len, midi + tr, v, c, t, who]);

/** the chorus, written once in G; the last one is sung a whole step up */
const chorus = (b: number, tr: number): Row[] => [
  ...at(
    "O",
    b,
    [
      [0, 1, 55, "A", "w|n", "One "],
      [1, 0.5, 57, "@", "t|", "to "],
      [1.5, 1, 59, "e>I", "m|k", "make "],
      [2.5, 0.5, 57, "@", "dh|", "the "],
    ],
    tr,
  ),
  ...at("O", b + 1, [[0, 2.5, 57, "ae", "p l|n", "plan, "]], tr),
  ...at(
    "S",
    b + 2,
    [
      [0, 1, 67, "A", "w|n", "one "],
      [1, 0.5, 69, "@", "t|", "to "],
      [1.5, 1, 71, "e>I", "m|k", "make "],
      [2.5, 0.5, 69, "I", "|t", "it "],
    ],
    tr,
  ),
  ...at("S", b + 3, [[0, 2.5, 67, "o>u", "g|", "go! "]], tr),
  ...at(
    "O",
    b + 4,
    [
      [0, 0.5, 55, "ae", "p l|n", "Plan "],
      [0.5, 0.5, 55, "I", "|t", "it! "],
    ],
    tr,
  ),
  ...at(
    "S",
    b + 4,
    [
      [2, 0.5, 67, "I", "b|l d", "Build "],
      [2.5, 0.5, 67, "I", "|t", "it! "],
    ],
    tr,
  ),
  ...at(
    "S",
    b + 5,
    [
      [0, 0.5, 66, "E", "ch|k", "Check "],
      [0.5, 0.5, 66, "I", "|t", "it! "],
    ],
    tr,
  ),
  ...at(
    "B",
    b + 5,
    [
      [2, 0.5, 69, "I", "sh|p", "Ship "],
      [2.5, 1, 66, "I", "|t", "it! "],
    ],
    tr,
  ),
  ...at(
    "B",
    b + 6,
    [
      [0, 0.5, 67, "o>u", "|", "O"],
      [0.5, 0.5, 67, "@", "p|s", "pus "],
      [1, 0.5, 69, "ae", "|n d", "and "],
      [1.5, 1, 71, "a", "s|n", "Son"],
      [2.5, 0.5, 69, "I", "n|t", "net, "],
    ],
    tr,
  ),
  ...at(
    "B",
    b + 7,
    [
      [0, 0.5, 67, "o>u", "", "oh "],
      [0.5, 0.5, 69, "o>u", "", "oh "],
      [1, 3, 72, "o>u", "", "oh!"],
    ],
    tr,
  ),
];

const SONG: Row[] = [
  // bar 4 · the count-in
  ...at("S", 4, [
    [0, 0.75, 62, "A", "w|n", "One, "],
    [1, 0.75, 64, "u", "t|", "two, "],
    [2, 0.75, 66, "i", "th r|", "three, "],
    [3, 0.75, 67, "O", "f|r", "four!"],
  ]),
  // verse 1 · Opus · E minor
  ...at("O", 5, [
    [0, 0.5, 52, "ae", "h|n d", "Hand "],
    [0.5, 0.5, 52, "i", "m|", "me "],
    [1, 0.5, 54, "@", "dh|", "the "],
    [1.5, 1, 55, "a", "h|r d", "hard"],
    [2.5, 0.5, 54, "@", "|s t", "est "],
    [3, 1, 52, "a", "p r|b", "prob"],
  ]),
  ...at("O", 6, [[0, 1.5, 52, "@", "l|m", "lem, "]]),
  ...at("O", 7, [
    [0, 0.5, 52, "@", "dh|", "the "],
    [0.5, 1, 55, "O", "l|ng", "long "],
    [1.5, 1.5, 57, "o>u", "r|d", "road, "],
    [3, 0.5, 55, "@", "dh|", "the "],
  ]),
  ...at("O", 8, [
    [0, 1, 57, "ae", "t|ng", "tan"],
    [1, 0.5, 55, "@", "g|l d", "gled "],
    [1.5, 2.5, 54, "a>I", "k|n d", "kind, "],
  ]),
  ...at("O", 9, [
    [0, 0.5, 59, "a>I", "|", "I "],
    [0.5, 1, 59, "I", "th|ng k", "think "],
    [1.5, 0.5, 57, "I", "|t", "it "],
    [2, 1.5, 55, "u", "th r|", "through "],
    [3.5, 0.5, 54, "I", "w|th", "with "],
  ]),
  ...at("O", 10, [
    [0, 1, 55, "A", "j|j", "judg"],
    [1, 2, 52, "@", "m|n t", "ment, "],
  ]),
  ...at("O", 11, [
    [0, 0.5, 50, "a>I", "|", "I "],
    [0.5, 1, 55, "ae", "p l|n", "plan "],
    [1.5, 0.5, 57, "I", "|t", "it "],
    [2, 1.5, 59, "O", "|l", "all, "],
  ]),
  ...at("O", 12, [
    [0, 1, 57, "a>I", "l|n", "line "],
    [1, 1, 54, "a>I", "b|", "by "],
    [2, 2, 50, "a>I", "l|n", "line."],
  ]),
  // verse 2 · Sonnet
  ...at("S", 13, [
    [0, 0.5, 64, "ae", "h|n d", "Hand "],
    [0.5, 0.5, 64, "i", "m|", "me "],
    [1, 0.5, 66, "@", "", "a "],
    [1.5, 1.5, 67, "i", "k l|r", "clear "],
  ]),
  ...at("S", 14, [[0, 2, 64, "E", "s p|k", "spec, "]]),
  ...at("S", 15, [
    [0, 0.5, 62, "ae", "|n d", "and "],
    [0.5, 0.5, 62, "@", "", "a "],
    [1, 1, 67, "e>I", "w|", "way "],
    [2, 0.5, 66, "@", "t|", "to "],
    [2.5, 1, 67, "E", "ch|k", "check "],
    [3.5, 0.5, 66, "I", "|t s", "it's "],
  ]),
  ...at("S", 16, [[0, 2.5, 69, "a>I", "r|t", "right, "]]),
  ...at("S", 17, [
    [0, 0.5, 71, "R", "th|", "thir"],
    [0.5, 0.5, 71, "i", "t|", "ty "],
    [1, 0.5, 69, "R", "p|", "per"],
    [1.5, 1, 67, "E", "s|n t", "cent "],
    [2.5, 0.5, 69, "ae", "f|s t", "fast"],
    [3, 0.5, 67, "R", "|", "er "],
    [3.5, 0.5, 66, "ae", "dh|n", "than "],
  ]),
  ...at("S", 18, [
    [0, 0.5, 64, "a>I", "m|", "my "],
    [0.5, 2, 67, "ae", "l|s t", "last, "],
  ]),
  ...at("S", 19, [
    [0, 0.5, 67, "u", "f y|", "few"],
    [0.5, 0.5, 66, "R", "|", "er "],
    [1, 0.5, 67, "o>u", "t|", "to"],
    [1.5, 1, 71, "@", "k|n z", "kens, "],
    [2.5, 0.5, 69, "E", "f|", "feath"],
    [3, 0.5, 67, "R", "dh|", "er "],
  ]),
  ...at("S", 20, [[0, 3, 69, "a>I", "l|t", "light!"]]),
  // chorus 1
  ...chorus(21, 0),
  // the advisor
  ...at("S", 29, [
    [0, 0.5, 64, "E", "w|n", "When "],
    [0.5, 0.5, 64, "a>I", "", "I "],
    [1, 0.5, 66, "i", "n|d", "need "],
    [1.5, 0.5, 67, "@", "", "a "],
    [2, 1, 67, "ae", "p l|n", "plan, "],
    [3, 0.5, 66, "a>I", "", "I "],
    [3.5, 0.5, 64, "e>I", "m|k", "make "],
  ]),
  ...at("S", 30, [
    [0, 0.5, 64, "@", "dh|", "the "],
    [0.5, 2.5, 67, "O", "k|l", "call. "],
  ]),
  ...at("O", 31, [
    [0, 0.5, 55, "a>I", "", "I "],
    [0.5, 0.5, 55, "i", "r|d", "read "],
    [1, 0.5, 57, "@", "dh|", "the "],
    [1.5, 1, 59, "o>u", "h|l", "whole "],
    [2.5, 1, 57, "E", "th r|d", "thread, "],
    [3.5, 0.5, 55, "a>I", "", "I "],
  ]),
  ...at("O", 32, [
    [0, 0.5, 54, "i", "r|d", "read "],
    [0.5, 0.5, 55, "I", "|t", "it "],
    [1, 2.5, 57, "O", "|l", "all. "],
  ]),
  ...at("O", 33, [
    [0, 0.5, 52, "a>I", "m|", "My "],
    [0.5, 0.5, 55, "@", "|d", "ad"],
    [1, 1, 59, "a>I", "v|s", "vice "],
    [2, 0.5, 57, "A", "k|m z", "comes "],
    [2.5, 1, 55, "ae", "b|k", "back "],
  ]),
  ...at("O", 34, [
    [0, 1, 57, "i", "s|l d", "sealed "],
    [1, 0.5, 55, "A", "|p", "up "],
    [1.5, 2, 52, "a>I", "t|t", "tight. "],
  ]),
  ...at("S", 35, [
    [0, 0.5, 67, "O", "y|r", "Your "],
    [0.5, 1, 67, "o>u", "k|d", "code "],
    [1.5, 0.5, 69, "ae", "k|n t", "can't "],
    [2, 1, 71, "i", "r|d", "read "],
    [3, 0.5, 69, "I", "|t", "it, "],
    [3.5, 0.5, 67, "a>I", "", "I "],
  ]),
  ...at("S", 36, [
    [0, 0.5, 66, "ae", "k|n", "can, "],
    [0.5, 0.5, 67, "O", "|l", "al"],
    [1, 2.5, 69, "a>I", "r|t", "right!"],
  ]),
  // chorus 2
  ...chorus(37, 0),
  // bridge · half time, one fact a bar
  ...at("S", 45, [
    [0, 0.5, 64, "@", "", "A "],
    [0.5, 0.5, 67, "I", "m|l", "mil"],
    [1, 0.5, 67, "@", "y|n", "lion "],
    [1.5, 0.5, 67, "o>u", "t|", "to"],
    [2, 1.5, 64, "@", "k|n z", "kens, "],
  ]),
  ...at("S", 46, [
    [0, 0.5, 66, "E", "|f", "ef"],
    [0.5, 0.5, 66, "R", "f|t", "fort, "],
    [1, 1, 62, "o>u", "l|", "low "],
    [2, 0.5, 66, "@", "t|", "to "],
    [2.5, 1.5, 69, "ae", "m|k s", "max, "],
  ]),
  ...at("S", 47, [
    [0, 0.5, 67, "ae", "h|f", "half "],
    [0.5, 0.5, 67, "@", "dh|", "the "],
    [1, 0.5, 71, "a>I", "p r|s", "price "],
    [1.5, 0.5, 69, "R", "p|", "per "],
    [2, 0.5, 67, "o>u", "t|", "to"],
    [2.5, 1.5, 64, "@", "k|n", "ken, "],
  ]),
  ...at("O", 48, [
    [0, 0.5, 54, "o>u", "m|s t", "most "],
    [0.5, 0.5, 54, "o>u", "t|", "to"],
    [1, 0.5, 57, "@", "k|n z", "kens "],
    [1.5, 0.5, 55, "ae", "|t", "at "],
    [2, 0.5, 54, "a", "s|n", "Son"],
    [2.5, 0.5, 55, "I", "n|t s", "net's "],
    [3, 1, 57, "e>I", "r|t s", "rates!"],
  ]),
  // chorus 3 · up a whole step
  ...chorus(49, 2),
  // outro
  ...at(
    "B",
    57,
    [
      [0, 1, 69, "a>I", "f|v", "Five "],
      [1, 0.5, 71, "", "", "~"],
      [1.5, 0.5, 69, "O>I", "p|n t", "point "],
      [2, 2, 67, "a>I", "f|v", "five, "],
    ],
    2,
  ),
  ...at(
    "B",
    58,
    [
      [0, 1, 67, "a>I", "f|v", "five "],
      [1, 0.5, 69, "", "", "~"],
      [1.5, 0.5, 67, "O>I", "p|n t", "point "],
      [2, 2, 62, "a>I", "f|v", "five!"],
    ],
    2,
  ),
];

// the displayed lines: [first bar, last bar]; a syllable belongs to the line whose bars hold its start
const LINE_BARS: [number, number][] = [
  [4, 4], // 0 count-in
  [5, 6],
  [7, 8],
  [9, 10],
  [11, 12], // 1–4 verse 1
  [13, 14],
  [15, 16],
  [17, 18],
  [19, 20], // 5–8 verse 2
  [21, 22],
  [23, 24],
  [25, 26],
  [27, 28], // 9–12 chorus 1
  [29, 30],
  [31, 32],
  [33, 34],
  [35, 36], // 13–16 advisor
  [37, 38],
  [39, 40],
  [41, 42],
  [43, 44], // 17–20 chorus 2
  [45, 45],
  [46, 46],
  [47, 47],
  [48, 48], // 21–24 bridge
  [49, 50],
  [51, 52],
  [53, 54],
  [55, 56], // 25–28 chorus 3
  [57, 58], // 29 outro
];
type Syl = { text: string; s: number; e: number; line: number; who: Who; rows: Row[] };
const SYLS: Syl[] = [];
for (const r of [...SONG].sort((a, b) => frameOf(a[0], a[1]) - frameOf(b[0], b[1]))) {
  const s = frameOf(r[0], r[1]),
    e = s + r[2] * BEAT;
  if (r[6] === "~") {
    const prev = SYLS[SYLS.length - 1];
    prev.e = e;
    prev.rows.push(r);
  } else
    SYLS.push({
      text: r[6],
      s,
      e,
      who: r[7],
      line: LINE_BARS.findIndex(([a, b]) => r[0] >= a && r[0] <= b),
      rows: [r],
    });
}
const LINES = LINE_BARS.map((_, li) => SYLS.map((s, k) => (s.line === li ? k : -1)).filter((k) => k >= 0));
const LINE_START = LINES.map((ks) => SYLS[ks[0]].s),
  LINE_END = LINES.map((ks) => SYLS[ks[ks.length - 1]].e);
/** who sings a whole line: one singer, or "M" when it mixes (the chant) */
const LINE_WHO = LINES.map((ks) => {
  const w = new Set(ks.map((k) => SYLS[k].who));
  return w.size === 1 ? [...w][0] : "M";
});

// ================================================================== THE SOUND
const hz = (m: number) => 440 * 2 ** ((m - 69) / 12);
const BEAT_S = 60 / BPM;
type Part = "intro" | "verse" | "verse2" | "chorus" | "advisor" | "bridge" | "final" | "outro";
const partOf = (bar: number): Part =>
  bar <= 4
    ? "intro"
    : bar <= 12
      ? "verse"
      : bar <= 20
        ? "verse2"
        : bar <= 28
          ? "chorus"
          : bar <= 36
            ? "advisor"
            : bar <= 44
              ? "chorus"
              : bar <= 48
                ? "bridge"
                : bar <= 56
                  ? "final"
                  : "outro";
/** semitones above G for a bar (the last chorus and the outro are in A) */
const trOf = (bar: number) => (bar >= 49 ? 2 : 0);
// chords in G: pad voicing and bass root
const CHORD: Record<string, { pad: number[]; bass: number }> = {
  G: { pad: [55, 59, 62], bass: 43 },
  D: { pad: [54, 57, 62], bass: 38 },
  Em: { pad: [55, 59, 64], bass: 40 },
  C: { pad: [55, 60, 64], bass: 36 },
};
const PROG: string[] = [
  ..."G D Em C".split(" "),
  ...Array(4).fill("Em C G D".split(" ")).flat(),
  ...Array(2).fill("G D Em C".split(" ")).flat(),
  ...Array(2).fill("Em C G D".split(" ")).flat(),
  ...Array(2).fill("G D Em C".split(" ")).flat(),
  ..."C D Em D".split(" "),
  ...Array(2).fill("G D Em C".split(" ")).flat(),
  ..."G D C G".split(" "),
];
const chordAt = (bar: number) => {
  const c = CHORD[PROG[bar - 1]],
    t = trOf(bar);
  return { pad: c.pad.map((m) => m + t), bass: c.bass + t };
};

// the hits the picture lands on (exact beat frames)
const SLAM = 0; // "5.5" on frame 0
const LAND_O = frameOf(1, 1),
  LAND_S = frameOf(1, 2);
const COUNT = [0, 1, 2, 3].map((b) => frameOf(4, b));
const BOX = frameOf(5, 0); // the hardest problem drops
const PLAN_LINES = Array.from({ length: 8 }, (_, i) => frameOf(11, 0) + i * BEAT); // the plan, line by line
const SPEC = frameOf(13, 2); // the spec card is caught
const TESTS = [0, 1, 2, 3].map((b) => frameOf(16, b)); // four checks go green
const DASH = frameOf(17, 0); // Sonnet dashes
const FEATHER = frameOf(19, 3);
const CHANT = [0, 1, 2, 3].map((i) => i * 2 * BEAT); // offsets from a chorus's chant bar: plan, build, check, ship
const CHANT_BARS = [25, 41, 53];
const CALL = frameOf(30, 1); // the advisor button
const SEND = frameOf(33, 2); // the envelope leaves Opus
const SEAL = frameOf(34, 0); // it lands, sealed
const OPEN = frameOf(36, 0); // Sonnet opens it
const BULB = frameOf(36, 1);
const FACT_SLAMS = [45, 46, 47, 48].map((b) => frameOf(b, 0));
const DROP = frameOf(49, 0); // the key change lands
const HIGH5 = frameOf(59, 0);

// formants (Hz) per vowel
const VOW: Record<string, [number, number, number]> = {
  a: [800, 1150, 2900],
  ae: [660, 1720, 2410],
  e: [400, 1600, 2700],
  i: [300, 2300, 3000],
  o: [450, 800, 2800],
  u: [325, 700, 2500],
  A: [640, 1190, 2390],
  E: [550, 1770, 2490],
  I: [400, 1920, 2560],
  "@": [500, 1500, 2500],
  R: [490, 1350, 1690],
  O: [570, 840, 2410],
};
type Tok = { d: number; voiced?: [number, number, number]; lvl?: number; noise?: string };
const TOK: Record<string, Tok> = {
  w: { d: 0.06, voiced: [300, 610, 2200], lvl: 0.55 },
  y: { d: 0.05, voiced: [280, 2250, 2900], lvl: 0.55 },
  l: { d: 0.06, voiced: [360, 1100, 2700], lvl: 0.6 },
  r: { d: 0.06, voiced: [420, 1250, 1600], lvl: 0.6 },
  n: { d: 0.07, voiced: [250, 1700, 2600], lvl: 0.32 },
  m: { d: 0.07, voiced: [250, 1100, 2500], lvl: 0.32 },
  ng: { d: 0.07, voiced: [250, 2000, 2700], lvl: 0.32 },
  b: { d: 0.035, voiced: [200, 900, 2400], lvl: 0.12, noise: "bd" },
  d: { d: 0.035, voiced: [200, 1700, 2600], lvl: 0.12, noise: "bd" },
  g: { d: 0.035, voiced: [200, 1990, 2500], lvl: 0.12, noise: "bd" },
  j: { d: 0.07, voiced: [280, 1800, 2600], lvl: 0.18, noise: "sh" },
  dh: { d: 0.045, voiced: [300, 1500, 2600], lvl: 0.3, noise: "th" },
  v: { d: 0.05, voiced: [300, 1100, 2400], lvl: 0.3, noise: "f" },
  z: { d: 0.07, voiced: [300, 1500, 2600], lvl: 0.25, noise: "z" },
  s: { d: 0.09, noise: "s" },
  sh: { d: 0.1, noise: "sh" },
  ch: { d: 0.09, noise: "ch" },
  f: { d: 0.07, noise: "f" },
  th: { d: 0.06, noise: "th" },
  h: { d: 0.06, noise: "h" },
  t: { d: 0.055, noise: "t" },
  k: { d: 0.06, noise: "k" },
  p: { d: 0.055, noise: "p" },
};
const HISS: Record<string, [number, number, number]> = {
  s: [6400, 1.6, 0.34],
  z: [6400, 1.6, 0.16],
  sh: [2900, 1.4, 0.3],
  f: [4800, 0.6, 0.1],
  th: [5200, 0.8, 0.08],
  h: [1600, 0.6, 0.1],
  t: [4300, 1.2, 0.55],
  k: [2100, 2, 0.5],
  p: [900, 0.8, 0.45],
  bd: [1400, 0.8, 0.12],
  asp: [2600, 0.6, 0.12],
};
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
/** the diatonic third below m in the major key on `root` (a pitch class) */
const thirdDown = (m: number, root: number) => {
  const pc = (((m - root) % 12) + 12) % 12,
    i = MAJOR.indexOf(pc);
  if (i < 0) return m - 3;
  const dn = MAJOR[(i + 5) % 7];
  return m - pc + dn - (dn > pc ? 12 : 0);
};

type Seg = { a: number; b: number; f: [number, number, number]; lvl: number };
type Hiss = { t: number; d: number; kind: string; lvl: number };
type VSyl = {
  voiceFrom: number;
  ts: number;
  vowelEnd: number;
  voiceEnd: number;
  on: Seg[];
  coda: Seg[];
  v1: [number, number, number];
  v2: [number, number, number];
  rows: { t0: number; midi: number }[];
  gain: number;
};
type Timbre = { fs: number; vibHz: number; vibDepth: number; body: number; gain: number };
const OPUS_VOICE: Timbre = { fs: 0.9, vibHz: 4.7, vibDepth: 0.22, body: 260, gain: 1.15 },
  SONNET_VOICE: Timbre = { fs: 1.07, vibHz: 5.9, vibDepth: 0.17, body: 380, gain: 0.95 };

/** the syllables one singer sings; in "B" rows Opus takes the third below, an octave down */
const partFor = (who: "O" | "S"): Syl[] =>
  SYLS.filter((s) => s.who === who || s.who === "B").map((s) =>
    who === "O" && s.who === "B"
      ? {
          ...s,
          rows: s.rows.map((r) => {
            const root = 7 + trOf(r[0]);
            return [r[0], r[1], r[2], thirdDown(r[3], root) - 12, r[4], r[5], r[6], r[7]] as Row;
          }),
        }
      : s,
  );

/** the voice plan for one singer: onsets, vowel, codas and pitch rows in seconds (pure, from SONG) */
function plan(list: Syl[], tb: Timbre) {
  const sec = (f: number) => f / FPS,
    sc = (f: [number, number, number]): [number, number, number] => [f[0] * tb.fs, f[1] * tb.fs, f[2] * tb.fs],
    out: VSyl[] = [],
    hiss: Hiss[] = [];
  list.forEach((s, k) => {
    const r0 = s.rows[0],
      [onS, codaS] = r0[5].split("|"),
      onT = (onS ?? "").split(" ").filter(Boolean),
      codaT = (codaS ?? "").split(" ").filter(Boolean);
    const ts = sec(s.s),
      te = sec(s.e);
    const prevTs = k ? sec(list[k - 1].s) : -1;
    const full = onT.reduce((a, t) => a + TOK[t].d, 0);
    const pre = Math.min(full, Math.max(0.03, ts - prevTs - 0.12));
    const on: Seg[] = [];
    let a = ts - pre,
      voiceFrom = ts;
    const scale = pre / Math.max(1e-6, full);
    for (const t of onT) {
      const tk = TOK[t],
        d = tk.d * scale;
      if (tk.voiced) {
        on.push({ a, b: a + d, f: sc(tk.voiced), lvl: tk.lvl ?? 0.5 });
        voiceFrom = Math.min(voiceFrom, a);
        if (tk.noise === "bd") hiss.push({ t: a + d - 0.012, d: 0.012, kind: "bd", lvl: 1 });
        else if (tk.noise) hiss.push({ t: a, d, kind: tk.noise, lvl: 1 });
      } else if (tk.noise === "t" || tk.noise === "k" || tk.noise === "p") {
        hiss.push({ t: a + d - 0.03, d: 0.016, kind: tk.noise, lvl: 1 });
        hiss.push({ t: a + d - 0.016, d: 0.03, kind: "asp", lvl: 1 });
      } else if (tk.noise === "ch") {
        hiss.push({ t: a, d: 0.012, kind: "t", lvl: 0.7 });
        hiss.push({ t: a + 0.012, d: d - 0.012, kind: "sh", lvl: 1 });
      } else if (tk.noise) hiss.push({ t: a, d, kind: tk.noise, lvl: 1 });
      a += d;
    }
    const next = list[k + 1];
    let nextPre = Infinity;
    if (next) {
      const nOn = (next.rows[0][5].split("|")[0] ?? "").split(" ").filter(Boolean),
        nPre = Math.min(
          nOn.reduce((q, t) => q + TOK[t].d, 0),
          Math.max(0.03, sec(next.s) - ts - 0.12),
        );
      nextPre = sec(next.s) - nPre;
    }
    const endMax = Math.min(te - 0.03, nextPre - 0.012);
    const unv = codaT.filter((t) => !TOK[t].voiced),
      vcd = codaT.filter((t) => TOK[t].voiced);
    const cu = unv.reduce((q, t) => q + TOK[t].d, 0),
      voiceEnd = Math.max(ts + 0.1, endMax - cu);
    const cvFull = vcd.reduce((q, t) => q + TOK[t].d, 0),
      cv = Math.min(cvFull, (voiceEnd - ts) * 0.4);
    const coda: Seg[] = [];
    let c = voiceEnd - cv;
    const vsc = cv / Math.max(1e-6, cvFull);
    for (const t of vcd) {
      const tk = TOK[t],
        d = tk.d * vsc;
      coda.push({ a: c, b: c + d, f: sc(tk.voiced!), lvl: tk.lvl ?? 0.5 });
      if (tk.noise === "bd") hiss.push({ t: c + d - 0.01, d: 0.01, kind: "bd", lvl: 1 });
      else if (tk.noise) hiss.push({ t: c, d: d + 0.02, kind: tk.noise, lvl: 0.8 });
      c += d;
    }
    let q = voiceEnd;
    for (const t of unv) {
      const tk = TOK[t];
      if (tk.noise === "t" || tk.noise === "k" || tk.noise === "p") {
        hiss.push({ t: q + 0.025, d: 0.016, kind: tk.noise, lvl: 0.7 });
        hiss.push({ t: q + 0.041, d: 0.025, kind: "asp", lvl: 0.7 });
      } else if (tk.noise) hiss.push({ t: q, d: tk.d, kind: tk.noise, lvl: 0.9 });
      q += tk.d;
    }
    const [v1s, v2s] = r0[4].split(">");
    out.push({
      voiceFrom,
      ts,
      vowelEnd: voiceEnd - cv,
      voiceEnd,
      on,
      coda,
      v1: sc(VOW[v1s]),
      v2: sc(VOW[v2s ?? v1s]),
      rows: s.rows.map((r) => ({ t0: sec(frameOf(r[0], r[1])), midi: r[3] })),
      gain: s.who === "B" ? 0.85 : 1,
    });
  });
  return { syl: out, hiss };
}

const smooth = (x: number) => {
  const t = clamp(x);
  return t * t * (3 - 2 * t);
};
const blep = (t: number, dt: number) => {
  if (t < dt) {
    const x = t / dt;
    return x + x - x * x - 1;
  }
  if (t > 1 - dt) {
    const x = (t - 1) / dt;
    return x * x + x + x + 1;
  }
  return 0;
};
/** RBJ band-pass (0 dB peak) coefficients: [b0, a1, a2] (b1 = 0, b2 = −b0) */
const bpCoef = (f: number, q: number, sr: number, out: Float64Array, o: number) => {
  const w = (TAU * Math.min(f, sr * 0.45)) / sr,
    al = Math.sin(w) / (2 * q),
    a0 = 1 + al;
  out[o] = al / a0;
  out[o + 1] = (-2 * Math.cos(w)) / a0;
  out[o + 2] = (1 - al) / a0;
};

/** one sung voice: a band-limited sawtooth at the note's pitch through three parallel formant band-passes */
function voice(sr: number, n: number, list: Syl[], tb: Timbre, seed: number) {
  const { syl: VS, hiss } = plan(list, tb);
  const dry = new Float32Array(n),
    env = new Float32Array(n);
  const CB = 32,
    blocks = Math.ceil(n / CB),
    coef = new Float64Array(9);
  const fS = [500 * tb.fs, 1500 * tb.fs, 2500 * tb.fs],
    BW = [85, 110, 170],
    G = [1, 0.85, 0.5];
  let amp = 0,
    ph = 0,
    k = 0;
  const x = [0, 0],
    y = new Float64Array(6);
  let body = 0;
  const breath = rng(seed);
  const aA = 1 - Math.exp(-CB / (sr * 0.006)),
    aF = 1 - Math.exp(-CB / (sr * 0.016)),
    lpB = 1 - Math.exp((-TAU * tb.body) / sr);
  for (let b = 0; b < blocks; b++) {
    const t = (b * CB) / sr;
    while (k + 1 < VS.length && t >= VS[k + 1].voiceFrom - 0.005) k++;
    const s = VS[k];
    let tAmp = 0,
      tf: [number, number, number] = s.v1,
      midi = s.rows[0].midi;
    if (t >= s.voiceFrom && t < s.voiceEnd + 0.03) {
      if (t < s.ts) {
        const seg = s.on.find((g) => t >= g.a && t < g.b);
        if (seg) {
          tf = seg.f;
          tAmp = seg.lvl;
        }
      } else if (t < s.vowelEnd) {
        const len = s.vowelEnd - s.ts,
          g = s.v1 === s.v2 ? 0 : smooth((t - s.ts - len * 0.5) / Math.max(0.04, len * 0.42));
        tf = [lerp(s.v1[0], s.v2[0], g), lerp(s.v1[1], s.v2[1], g), lerp(s.v1[2], s.v2[2], g)];
        tAmp = 1;
      } else if (t < s.voiceEnd) {
        const seg = s.coda.find((g) => t >= g.a && t < g.b) ?? s.coda[s.coda.length - 1];
        tf = seg ? seg.f : s.v2;
        tAmp = seg ? seg.lvl : 1;
      }
      tAmp *= s.gain;
      let ri = 0;
      while (ri + 1 < s.rows.length && t >= s.rows[ri + 1].t0) ri++;
      const row = s.rows[ri];
      let from: number, g0: number, gd: number;
      if (ri > 0) {
        from = s.rows[ri - 1].midi;
        g0 = row.t0;
        gd = 0.07;
      } else {
        const p = VS[k - 1];
        from = p && s.voiceFrom - p.voiceEnd < 0.25 ? p.rows[p.rows.length - 1].midi : row.midi - 0.7;
        g0 = s.voiceFrom;
        gd = Math.max(0.06, s.ts - s.voiceFrom + 0.04);
      }
      midi = from + (row.midi - from) * smooth((t - g0) / gd);
      midi +=
        tb.vibDepth * clamp((t - s.ts - 0.2) / 0.3) * Math.sin(TAU * tb.vibHz * t) + 0.04 * Math.sin(TAU * 0.7 * t + k);
    }
    amp += (tAmp - amp) * aA;
    for (let j = 0; j < 3; j++) fS[j] += (tf[j] - fS[j]) * aF;
    for (let j = 0; j < 3; j++) bpCoef(fS[j], fS[j] / BW[j], sr, coef, j * 3);
    const dt = hz(midi) / sr;
    const i1 = Math.min(n, (b + 1) * CB);
    if (amp < 1e-4 && Math.abs(y[0]) + Math.abs(y[2]) + Math.abs(y[4]) < 1e-6) {
      for (let i = b * CB; i < i1; i++) breath();
      ph = 0;
      continue;
    }
    for (let i = b * CB; i < i1; i++) {
      ph += dt;
      if (ph >= 1) ph -= 1;
      const saw = 2 * ph - 1 - blep(ph, dt);
      const src = (saw + (breath() * 2 - 1) * 0.06) * amp;
      body += (src - body) * lpB;
      let v = body * 0.35;
      for (let j = 0; j < 3; j++) {
        const o = j * 3,
          yy = coef[o] * (src - x[1]) - coef[o + 1] * y[j * 2] - coef[o + 2] * y[j * 2 + 1];
        y[j * 2 + 1] = y[j * 2];
        y[j * 2] = yy;
        v += G[j] * yy;
      }
      x[1] = x[0];
      x[0] = src;
      dry[i] = v * tb.gain;
      env[i] = amp;
    }
  }
  hiss.forEach((h, idx) => {
    const [fc, q, lvl] = HISS[h.kind],
      r = rng(seed * 10 + idx),
      c = new Float64Array(3);
    bpCoef(fc, q, sr, c, 0);
    const i0 = Math.round(h.t * sr),
      len = Math.max(8, Math.round(h.d * sr)),
      atk = Math.min(len * 0.3, 0.012 * sr),
      rel = Math.min(len * 0.4, 0.02 * sr);
    let x1 = 0,
      x2 = 0,
      y1 = 0,
      y2 = 0;
    for (let j = 0; j < len; j++) {
      const xi = r() * 2 - 1,
        yy = c[0] * (xi - x2) - c[1] * y1 - c[2] * y2;
      x2 = x1;
      x1 = xi;
      y2 = y1;
      y1 = yy;
      const e = Math.min(1, j / atk, (len - j) / rel),
        i = i0 + j;
      if (i >= 0 && i < n) dry[i] += yy * e * lvl * h.lvl * 1.6 * tb.gain;
    }
  });
  return { dry, env };
}

/** a plate-like reverb: parallel damped combs into allpasses (Schroeder / Freeverb shape), mono in, stereo out */
function plate(inp: Float32Array, sr: number, send: (i: number) => number): [Float32Array, Float32Array] {
  const n = inp.length,
    k = sr / 44100,
    pre = Math.round(0.022 * sr);
  const mk = (spread: number) => ({
    combs: [1116, 1188, 1277, 1356, 1422, 1491].map((d) => ({
      buf: new Float32Array(Math.round((d + spread) * k)),
      i: 0,
      lp: 0,
    })),
    aps: [556, 441, 341, 225].map((d) => ({ buf: new Float32Array(Math.round((d + spread) * k)), i: 0 })),
  });
  const chans = [mk(0), mk(23)],
    out: [Float32Array, Float32Array] = [new Float32Array(n), new Float32Array(n)];
  const fb = 0.8,
    damp = 0.3;
  for (let c = 0; c < 2; c++) {
    const ch = chans[c],
      o = out[c];
    for (let i = 0; i < n; i++) {
      const xin = i >= pre ? inp[i - pre] * send(i - pre) * 0.12 : 0;
      let s = 0;
      for (const cb of ch.combs) {
        const yv = cb.buf[cb.i];
        cb.lp = yv * (1 - damp) + cb.lp * damp;
        cb.buf[cb.i] = xin + cb.lp * fb;
        cb.i = cb.i + 1 === cb.buf.length ? 0 : cb.i + 1;
        s += yv;
      }
      for (const ap of ch.aps) {
        const bv = ap.buf[ap.i],
          yv = -s + bv;
        ap.buf[ap.i] = s + bv * 0.5;
        ap.i = ap.i + 1 === ap.buf.length ? 0 : ap.i + 1;
        s = yv;
      }
      o[i] = s;
    }
  }
  return out;
}

/** the band: a 120 bpm pop arrangement (drums, bouncing octave bass, chord stabs, pads, a plucked hook) + the hits */
function band(sr: number, n: number): [Float32Array, Float32Array] {
  const L = new Float32Array(n),
    R = new Float32Array(n),
    noise = rng(5252);
  const beatN = BEAT_S * sr,
    f2i = (f: number) => Math.round((f / FPS) * sr);
  const add = (i: number, v: number, pan = 0.5) => {
    if (i < 0 || i >= n) return;
    L[i] += v * (1 - pan);
    R[i] += v * pan;
  };
  const kick = (i0: number, vel: number) => {
    let ph = 0;
    for (let k = 0; k < 0.3 * sr; k++) {
      const t = k / sr;
      ph += (48 + 130 * Math.exp(-t / 0.03)) / sr;
      add(i0 + k, Math.sin(TAU * ph) * Math.exp(-t / 0.12) * Math.min(1, t / 0.001) * vel);
    }
    for (let k = 0; k < 0.004 * sr; k++) add(i0 + k, (noise() * 2 - 1) * 0.25 * vel * (1 - k / (0.004 * sr)));
  };
  const snare = (i0: number, vel: number) => {
    let lp = 0,
      ph = 0;
    for (let k = 0; k < 0.2 * sr; k++) {
      const t = k / sr,
        w = noise() * 2 - 1;
      lp += 0.25 * (w - lp);
      ph += (200 - 30 * Math.min(1, t / 0.05)) / sr;
      add(i0 + k, ((w - lp) * Math.exp(-t / 0.07) * 0.8 + Math.sin(TAU * ph) * Math.exp(-t / 0.04) * 0.55) * vel, 0.48);
    }
  };
  const clap = (i0: number, vel: number) => {
    let a = 0,
      b = 0;
    for (let k = 0; k < 0.18 * sr; k++) {
      const t = k / sr,
        w = noise() * 2 - 1;
      a += 0.45 * (w - a);
      b += 0.2 * (a - b);
      // three quick bursts, then the tail
      const e =
        t < 0.03 ? (Math.floor(t / 0.01) % 1 === 0 ? Math.exp(-(t % 0.01) / 0.003) : 0) : Math.exp(-(t - 0.03) / 0.05);
      add(i0 + k, (a - b) * e * vel * 1.3, 0.52);
    }
  };
  const hat = (i0: number, vel: number, pan: number, open = false) => {
    let a = 0,
      b = 0;
    const len = (open ? 0.2 : 0.05) * sr,
      dec = open ? 0.07 : 0.014;
    for (let k = 0; k < len; k++) {
      const t = k / sr,
        w = noise() * 2 - 1;
      a += 0.6 * (w - a);
      b += 0.6 * (w - a - b);
      add(i0 + k, (w - a - b) * Math.exp(-t / dec) * vel, pan);
    }
  };
  const crash = (i0: number, vel: number) => {
    let a = 0;
    for (let k = 0; k < 1.8 * sr; k++) {
      const t = k / sr,
        w = noise() * 2 - 1;
      a += 0.7 * (w - a);
      const v = (w - a) * Math.exp(-t / 0.55) * vel;
      add(i0 + k, v, 0.35);
      add(i0 + k + 37, v * 0.8, 0.65);
    }
  };
  const tone = (
    i0: number,
    midi: number,
    len: number,
    vel: number,
    kind: "pluck" | "bell" | "bass" | "lead",
    pan = 0.5,
  ) => {
    const f = hz(midi),
      dt = f / sr;
    let ph = 0,
      ph2 = 0.25,
      lp = 0;
    const lpk = 1 - Math.exp((-TAU * (kind === "lead" ? 2400 : 420)) / sr);
    for (let k = 0; k < len; k++) {
      const t = k / sr;
      ph += dt;
      if (ph >= 1) ph -= 1;
      let s: number;
      if (kind === "bass") {
        ph2 += dt;
        if (ph2 >= 1) ph2 -= 1;
        lp += (2 * ph2 - 1 - blep(ph2, dt) - lp) * lpk;
        s = (Math.sin(TAU * ph) + 0.5 * lp) * Math.min(1, t / 0.005) * Math.min(1, (len - k) / (0.03 * sr));
      } else if (kind === "lead") {
        ph2 += dt * 1.004;
        if (ph2 >= 1) ph2 -= 1;
        const sq = (ph < 0.5 ? 1 : -1) + (ph2 < 0.5 ? 1 : -1);
        lp += (sq - lp) * lpk;
        s = lp * 0.5 * Math.exp(-t * 3.2) * Math.min(1, t / 0.003) * Math.min(1, (len - k) / (0.02 * sr));
      } else if (kind === "pluck")
        s =
          (Math.sin(TAU * ph) + 0.35 * Math.sin(2 * TAU * ph) + 0.12 * Math.sin(3 * TAU * ph)) *
          Math.exp(-t * 7.5) *
          Math.min(1, t / 0.002);
      else
        s =
          (Math.sin(TAU * ph) + 0.4 * Math.sin(TAU * ph * 2.76) * Math.exp(-t * 3)) *
          Math.exp(-t * 2.2) *
          Math.min(1, t / 0.002);
      add(i0 + k, s * vel, pan);
    }
  };
  /** a short detuned-saw chord stab through a closing low-pass (the chorus's pump) */
  const stab = (i0: number, notes: number[], len: number, vel: number) => {
    notes.forEach((m, v) => {
      const f = hz(m + 12);
      [0.994, 1.006].forEach((dtn, d) => {
        const dt = (f * dtn) / sr;
        let ph = (v * 0.31 + d * 0.5) % 1,
          lp = 0,
          lp2 = 0;
        for (let k = 0; k < len; k++) {
          const t = k / sr;
          ph += dt;
          if (ph >= 1) ph -= 1;
          const cut = 1 - Math.exp((-TAU * (500 + 3200 * Math.exp(-t / 0.08))) / sr);
          lp += (2 * ph - 1 - blep(ph, dt) - lp) * cut;
          lp2 += (lp - lp2) * cut;
          const e = Math.min(1, t / 0.004) * Math.min(1, (len - k) / (0.03 * sr));
          add(i0 + k, lp2 * e * vel, d ? 0.7 - v * 0.05 : 0.3 + v * 0.05);
        }
      });
    });
  };
  const pad = (i0: number, midi: number, len: number, vel: number, pan: number, bright = 900) => {
    const f = hz(midi),
      d1 = (f * 1.0035) / sr,
      d2 = (f * 0.9965) / sr,
      lpk = 1 - Math.exp((-TAU * bright) / sr),
      att = 0.25 * sr,
      rel = 0.4 * sr;
    let p1 = 0,
      p2 = 0.5,
      lp = 0,
      lp2 = 0;
    for (let k = 0; k < len + rel; k++) {
      p1 += d1;
      if (p1 >= 1) p1 -= 1;
      p2 += d2;
      if (p2 >= 1) p2 -= 1;
      const s = 2 * p1 - 1 - blep(p1, d1) + (2 * p2 - 1 - blep(p2, d2));
      lp += (s - lp) * lpk;
      lp2 += (lp - lp2) * lpk;
      const e = Math.min(1, k / att) * (k > len ? Math.max(0, 1 - (k - len) / rel) : 1);
      add(i0 + k, lp2 * e * vel, pan);
    }
  };
  /** filtered noise rising into a downbeat (or falling away from one) */
  const sweep = (i0: number, len: number, vel: number, up: boolean) => {
    let lp = 0,
      bp = 0;
    for (let k = 0; k < len; k++) {
      const p = k / len,
        q = up ? p : 1 - p,
        w = noise() * 2 - 1,
        cut = 1 - Math.exp((-TAU * (300 + 6000 * q * q)) / sr);
      lp += (w - lp) * cut;
      bp += (lp - bp) * 0.5;
      add(i0 + k, (lp - bp) * (up ? p * p : (1 - p) ** 2) * vel, 0.5 + 0.2 * Math.sin(p * 9));
    }
  };
  const thud = (i0: number, vel: number) => {
    let ph = 0,
      lp = 0;
    for (let k = 0; k < 0.3 * sr; k++) {
      const t = k / sr,
        w = noise() * 2 - 1;
      ph += (42 + 80 * Math.exp(-t / 0.02)) / sr;
      lp += 0.1 * (w - lp);
      add(i0 + k, (Math.sin(TAU * ph) * Math.exp(-t / 0.09) + lp * Math.exp(-t / 0.025) * 1.6) * vel);
    }
  };
  const boing = (i0: number, vel: number) => {
    let ph = 0;
    for (let k = 0; k < 0.35 * sr; k++) {
      const t = k / sr;
      ph += (330 + 260 * Math.sin(t * 38) * Math.exp(-t / 0.12) + 200 * t) / sr;
      add(i0 + k, Math.sin(TAU * ph) * Math.exp(-t / 0.13) * vel, 0.62);
    }
  };
  const blip = (i0: number, midi: number, vel: number, pan = 0.5) => {
    const f = hz(midi);
    for (let k = 0; k < 0.08 * sr; k++) {
      const t = k / sr;
      add(i0 + k, (Math.sin(TAU * f * t) > 0 ? 1 : -1) * 0.5 * Math.exp(-t / 0.03) * vel, pan);
    }
  };
  const ARP = [0, 1, 2, 1, 2, 0, 2, 1];
  // the hook: a plucked figure (in 8ths) that climbs through the chord, the song's instrumental signature
  const HOOK = [
    [0, 2, 24],
    [0.5, 1, 24],
    [1, 0, 24],
    [1.5, 1, 24],
    [2, 2, 24],
    [2.75, 0, 36],
    [3, 2, 24],
    [3.5, 1, 24],
  ];
  for (let bar = 1; bar <= BARS; bar++) {
    const part = partOf(bar),
      ch = chordAt(bar),
      i0 = Math.round((bar - 1) * 4 * beatN),
      barN = Math.round(4 * beatN),
      big = part === "chorus" || part === "final";
    // pads
    const padVel = part === "bridge" ? 0.05 : part === "intro" ? 0.03 : big ? 0.032 : 0.028;
    if (bar <= 59)
      ch.pad.forEach((m, v) => pad(i0, m, barN, padVel, 0.3 + v * 0.2, part === "intro" && bar < 4 ? 600 : 1100));
    if (bar === 60) ch.pad.forEach((m, v) => pad(i0, m, Math.round(barN * 0.8), 0.04, 0.3 + v * 0.2, 800));
    // bass
    if (part === "verse" || part === "verse2" || part === "advisor" || big || part === "outro") {
      if (bar <= 58)
        for (let e = 0; e < 8; e++)
          tone(
            i0 + Math.round(e * 0.5 * beatN),
            ch.bass + (e % 2 ? 12 : 0),
            Math.round(0.42 * beatN),
            big ? 0.19 : 0.16,
            "bass",
          );
    }
    if (part === "intro" && bar >= 2 && bar <= 3)
      [0, 1.5, 2.5].forEach((b) => tone(i0 + Math.round(b * beatN), ch.bass, Math.round(0.9 * beatN), 0.15, "bass"));
    if (part === "bridge") tone(i0, ch.bass, Math.round(barN * 0.95), 0.2, "bass");
    // chord stabs: offbeats in the verses, a push pattern in the choruses
    if (part === "verse2" || part === "advisor")
      for (let b = 0; b < 4; b++) stab(i0 + Math.round((b + 0.5) * beatN), ch.pad, Math.round(0.18 * sr), 0.022);
    if (big || part === "outro")
      if (bar <= 58)
        [0, 0.75, 1.5, 2.5, 3.25].forEach((b) => stab(i0 + Math.round(b * beatN), ch.pad, Math.round(0.2 * sr), 0.03));
    // the plucked hook: the intro, the choruses (an octave up in the last one), quiet under verse 2
    if (part === "intro" || big || part === "verse2" || (part === "outro" && bar <= 58)) {
      const vel = part === "intro" ? 0.07 : part === "verse2" ? 0.03 : 0.045;
      for (const [b, idx, o] of HOOK)
        tone(i0 + Math.round(b * beatN), ch.pad[idx] + o, Math.round(0.4 * sr), vel, "pluck", b % 1 ? 0.35 : 0.65);
      if (part === "final")
        for (const [b, idx, o] of HOOK)
          tone(i0 + Math.round(b * beatN), ch.pad[idx] + o + 12, Math.round(0.18 * sr), 0.018, "lead", 0.5);
    }
    // a soft arpeggio under verse 1 and the advisor
    if (part === "verse" || part === "advisor")
      for (let s = 0; s < 8; s++)
        tone(
          i0 + Math.round(s * 0.5 * beatN),
          ch.pad[ARP[s]] + 12,
          Math.round(0.35 * sr),
          0.032,
          "pluck",
          s % 2 ? 0.3 : 0.7,
        );
    // drums
    for (let b = 0; b < 4; b++) {
      const j = i0 + Math.round(b * beatN);
      if (part === "intro") {
        if (bar >= 2 && bar <= 3) {
          kick(j, 0.5);
          if (b % 2) clap(j, 0.22);
        }
        if (bar === 4) clap(j, 0.16 + b * 0.04);
      }
      if (part === "verse" || part === "advisor") {
        if (b === 0 || b === 2) kick(j, 0.5);
        if (b === 1 || b === 3) clap(j, 0.2);
      }
      if (part === "verse2") {
        kick(j, b % 2 ? 0.4 : 0.52);
        if (b % 2) clap(j, 0.22);
      }
      if (big) {
        kick(j, 0.58);
        if (b % 2) {
          clap(j, 0.24);
          snare(j, 0.14);
        }
      }
      if (part === "bridge" && bar < 48) {
        if (b === 0) kick(j, 0.55);
        if (b === 2) snare(j, 0.24);
      }
      if (part === "outro" && bar <= 58) {
        kick(j, 0.5);
        if (b % 2) clap(j, 0.2);
      }
    }
    // hats
    const hats = big
      ? 8
      : part === "verse2" || part === "advisor" || part === "verse"
        ? 8
        : part === "intro" && bar >= 2 && bar <= 3
          ? 8
          : 0;
    for (let h = 0; h < hats; h++) {
      const off = h % 2 === 1;
      hat(i0 + Math.round(h * 0.5 * beatN), off ? (big ? 0.07 : 0.055) : 0.035, 0.62, off && big);
    }
    if (big) for (let h = 0; h < 16; h++) if (h % 2) hat(i0 + Math.round(h * 0.25 * beatN), 0.02, 0.4);
    if (bar === 1 || bar === 21 || bar === 37 || bar === 49 || bar === 29 || bar === 45)
      crash(i0, bar === 49 ? 0.2 : 0.14);
  }
  // fills and risers into the big sections
  for (const b of [4, 20, 36, 48]) {
    const i0 = Math.round((b - 1) * 4 * beatN);
    sweep(i0, Math.round(4 * beatN), b === 48 ? 0.22 : 0.14, true);
    if (b === 20 || b === 36)
      for (let s = 0; s < 4; s++) snare(i0 + Math.round((3 + s * 0.25) * beatN), 0.1 + s * 0.04);
    if (b === 48) for (let s = 0; s < 16; s++) snare(i0 + Math.round(s * 0.25 * beatN), 0.06 + (s / 16) * 0.2);
  }
  sweep(Math.round(28 * 4 * beatN), Math.round(2 * beatN), 0.1, false); // out of chorus 1 into the advisor
  // hits the picture lands on
  {
    kick(f2i(SLAM), 0.8);
    crash(f2i(SLAM), 0.16);
    stab(f2i(SLAM), chordAt(1).pad, Math.round(0.5 * sr), 0.05);
  }
  thud(f2i(LAND_O), 0.5);
  boing(f2i(LAND_S), 0.14);
  thud(f2i(LAND_S), 0.25);
  thud(f2i(BOX), 0.55);
  PLAN_LINES.forEach((f, i) => blip(f2i(f), 79 + (i % 4) * 2, 0.02, 0.4));
  thud(f2i(SPEC), 0.25);
  TESTS.forEach((f, i) => tone(f2i(f), 84 + [0, 2, 4, 7][i], Math.round(0.3 * sr), 0.05, "bell", 0.55));
  sweep(f2i(DASH) - Math.round(0.5 * sr), Math.round(0.6 * sr), 0.16, true);
  tone(f2i(FEATHER), 88, Math.round(1.2 * sr), 0.03, "bell", 0.4);
  for (const b of CHANT_BARS)
    CHANT.forEach((o) => {
      const i = f2i(frameOf(b, 0) + o);
      thud(i, 0.35);
    });
  blip(f2i(CALL), 76, 0.05, 0.6);
  blip(f2i(CALL) + Math.round(0.09 * sr), 83, 0.05, 0.6);
  sweep(f2i(SEND), Math.round(1 * beatN), 0.12, true);
  thud(f2i(SEAL), 0.3);
  {
    // the seal cracks: a short bright pop
    const i = f2i(OPEN);
    let lp = 0;
    for (let k = 0; k < 0.05 * sr; k++) {
      const w = noise() * 2 - 1;
      lp += 0.5 * (w - lp);
      add(i + k, (w - lp) * Math.exp(-k / (0.006 * sr)) * 0.4);
    }
  }
  [84, 88, 91].forEach((m, v) =>
    tone(f2i(BULB) + v * Math.round(0.05 * sr), m, Math.round(0.9 * sr), 0.04, "bell", 0.6),
  );
  FACT_SLAMS.forEach((f) => thud(f2i(f), 0.3));
  kick(f2i(DROP), 0.7);
  {
    const i = f2i(HIGH5);
    kick(i, 0.7);
    clap(i, 0.5);
    clap(i + Math.round(0.02 * sr), 0.35);
    crash(i, 0.2);
    stab(i, chordAt(59).pad, Math.round(0.6 * sr), 0.05);
    const end = chordAt(60).pad;
    [...end, end[0] + 12].forEach((m, v) =>
      tone(f2i(frameOf(60, 0)), m + 12, Math.round(2.4 * sr), 0.05, "bell", 0.3 + v * 0.13),
    );
  }
  COUNT.forEach((f, i) => blip(f2i(f), 72 + i * 2, 0.018, 0.5));
  thud(f2i(frameOf(59, 2)), 0.3);
  return [L, R];
}

/** BS.1770 integrated loudness (K-weighted, gated), so the mix can be set to exactly −16 LUFS */
function loudness(L: Float32Array, R: Float32Array, sr: number) {
  const kw = (x: Float32Array) => {
    const o = new Float32Array(x.length);
    let K = Math.tan((Math.PI * 1681.974450955533) / sr);
    const Vh = 10 ** (3.999843853973347 / 20),
      Vb = Vh ** 0.4996667741545416,
      Q = 0.7071752369554196;
    let a0 = 1 + K / Q + K * K;
    const b = [(Vh + (Vb * K) / Q + K * K) / a0, (2 * (K * K - Vh)) / a0, (Vh - (Vb * K) / Q + K * K) / a0],
      a = [(2 * (K * K - 1)) / a0, (1 - K / Q + K * K) / a0];
    K = Math.tan((Math.PI * 38.13547087602444) / sr);
    const Q2 = 0.5003270373238773;
    a0 = 1 + K / Q2 + K * K;
    const c = [(2 * (K * K - 1)) / a0, (1 - K / Q2 + K * K) / a0];
    let x1 = 0,
      x2 = 0,
      y1 = 0,
      y2 = 0,
      u1 = 0,
      u2 = 0,
      z1 = 0,
      z2 = 0;
    for (let i = 0; i < x.length; i++) {
      const y = b[0] * x[i] + b[1] * x1 + b[2] * x2 - a[0] * y1 - a[1] * y2;
      x2 = x1;
      x1 = x[i];
      y2 = y1;
      y1 = y;
      const z = y - 2 * u1 + u2 - c[0] * z1 - c[1] * z2;
      u2 = u1;
      u1 = y;
      z2 = z1;
      z1 = z;
      o[i] = z;
    }
    return o;
  };
  const l = kw(L),
    r = kw(R),
    blk = Math.round(0.4 * sr),
    hop = Math.round(0.1 * sr),
    zs: number[] = [];
  for (let s = 0; s + blk <= l.length; s += hop) {
    let e = 0;
    for (let i = s; i < s + blk; i++) e += l[i] * l[i] + r[i] * r[i];
    zs.push(e / blk);
  }
  const lk = (z: number) => -0.691 + 10 * Math.log10(z + 1e-12);
  const abs = zs.filter((z) => lk(z) > -70),
    mean = (a: number[]) => a.reduce((p, q) => p + q, 0) / Math.max(1, a.length);
  const rel = lk(mean(abs)) - 10;
  return lk(mean(abs.filter((z) => lk(z) > rel)));
}

/** the stems before the master (band, both dry voices, the voice reverb); exported for checking the mix */
export function twoPartHarmonyParts(sr: number) {
  const n = Math.ceil((N / FPS) * sr),
    [bL, bR] = band(sr, n),
    o = voice(sr, n, partFor("O"), OPUS_VOICE, 331),
    s = voice(sr, n, partFor("S"), SONNET_VOICE, 557);
  const mono = new Float32Array(n);
  for (let i = 0; i < n; i++) mono[i] = o.dry[i] + s.dry[i];
  const [wL, wR] = plate(mono, sr, (i) => {
    const p = partOf(Math.floor(i / (4 * BEAT_S * sr)) + 1);
    return p === "chorus" || p === "final" ? 1.3 : p === "bridge" ? 0.6 : 0.9;
  });
  return { n, bL, bR, o, s, wL, wR };
}

function audio(sr: number): [Float32Array, Float32Array] {
  const { n, bL, bR, o, s, wL, wR } = twoPartHarmonyParts(sr);
  const L = new Float32Array(n),
    R = new Float32Array(n);
  let duck = 0;
  const dk = 1 - Math.exp(-1 / (0.05 * sr));
  for (let i = 0; i < n; i++) {
    duck += (Math.max(o.env[i], s.env[i]) - duck) * dk;
    const g = 1 - 0.3 * Math.min(1, duck);
    // Opus a touch left, Sonnet a touch right: the duet reads in stereo too
    L[i] = bL[i] * g * 1.2 + o.dry[i] * 0.72 + s.dry[i] * 0.52 + wL[i];
    R[i] = bR[i] * g * 1.2 + o.dry[i] * 0.52 + s.dry[i] * 0.72 + wR[i];
  }
  const gain = 10 ** ((-15.75 - loudness(L, R, sr)) / 20);
  const knee = (x: number) => {
    const a = Math.abs(x);
    return a < 0.74 ? x : Math.sign(x) * (0.74 + 0.14 * Math.tanh((a - 0.74) / 0.14));
  };
  const fade = Math.round(0.5 * sr);
  for (let i = 0; i < n; i++) {
    const f = i > n - fade ? (n - i) / fade : 1;
    L[i] = knee(L[i] * gain) * f;
    R[i] = knee(R[i] * gain) * f;
  }
  return [L, R];
}

// ================================================================== THE PICTURE
const hx = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgba = (hex: string, a: number) => {
  const [r, g, b] = hx(hex);
  return `rgba(${r},${g},${b},${a})`;
};
const mix = (a: string, b: string, t: number) => {
  const p = hx(a),
    q = hx(b),
    k = clamp(t),
    h = (v: number) => Math.round(v).toString(16).padStart(2, "0");
  return `#${h(lerp(p[0], q[0], k))}${h(lerp(p[1], q[1], k))}${h(lerp(p[2], q[2], k))}`;
};
/** integer hash → 0..1 (the same on every machine) */
const hash = (a: number, b = 0) => {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  return (h >>> 0) / 4294967296;
};
const IVORY = C.ground,
  INK = C.ink,
  PAPER = C.paper,
  OPUS_BODY = C.accent,
  SONNET_BODY = mix(mix(C.accent, "#f0a47e", 0.45), C.accent2, 0.14),
  // text colours: darkened on light grounds, lifted on dark ones, so a lit syllable always reads
  OPUS_ON_LIGHT = mix(OPUS, INK, 0.18),
  SONNET_ON_LIGHT = mix(SONNET, INK, 0.3),
  BOTH_ON_LIGHT = mix(BOTH, INK, 0.2),
  BOTH_ON_DARK = mix(BOTH, "#ffffff", 0.28);
const whoColor = (w: string, dark: boolean) =>
  w === "O"
    ? dark
      ? OPUS
      : OPUS_ON_LIGHT
    : w === "S"
      ? dark
        ? SONNET
        : SONNET_ON_LIGHT
      : dark
        ? BOTH_ON_DARK
        : BOTH_ON_LIGHT;
const beatPh = (F: number) => (((F % BEAT) + BEAT) % BEAT) / BEAT;
const sp = (F: number, f0: number, freq = 2.6, damp = 0.62) => spring((F - f0) / FPS, { freq, damp });
const barOf = (F: number) => Math.floor(F / BAR) + 1;

// the mouths: how open each singer's mouth is on every frame, from the same syllables the voices sing
const OPEN_V: Record<string, number> = {
  a: 1,
  ae: 0.95,
  A: 0.9,
  O: 0.9,
  o: 0.7,
  u: 0.5,
  R: 0.6,
  E: 0.8,
  e: 0.6,
  I: 0.55,
  i: 0.45,
  "@": 0.6,
};
const MOUTH = { O: new Float32Array(N), S: new Float32Array(N) };
const SINCE = { O: new Float32Array(N).fill(99), S: new Float32Array(N).fill(99) }; // frames since a syllable began
for (const s of SYLS) {
  const open = OPEN_V[s.rows[0][4].split(">")[0]] ?? 0.6;
  for (const w of s.who === "B" ? (["O", "S"] as const) : [s.who as "O" | "S"]) {
    for (let F = s.s; F < Math.min(N, s.e - 1); F++)
      MOUTH[w][F] = Math.max(MOUTH[w][F], open * (0.55 + 0.45 * Math.exp(-(F - s.s) / 4)));
    for (let F = s.s; F < Math.min(N, s.s + 99); F++) SINCE[w][F] = Math.min(SINCE[w][F], F - s.s);
  }
}

// ---------------------------------------------------------------- the critters: a 14 × 8 pixel grid
type Arm = "out" | "up" | "down" | "point" | "high";
type Eyes = "open" | "blink" | "happy" | "up" | "left" | "right";
type Pose = {
  x: number;
  y: number; // the floor under the feet
  px: number; // one grid pixel, in canvas px
  who: "O" | "S";
  sx: number;
  sy: number;
  lean: number; // grid pixels the top row shears sideways
  flip: number; // 1 facing us, −1 turned away (a spin passes through 0)
  armL: Arm;
  armR: Arm;
  legA: number; // lifts of the two leg pairs, 0..1
  legB: number;
  eyes: Eyes;
  mouth: number;
  lift: number; // grid pixels off the floor (a jump)
  alpha: number;
  tag: number; // the name tag, 0..1
  tint?: string; // a silhouette: one colour, no face
};
const ARM: Record<Arm, [number, number][]> = {
  out: [
    [0, 3],
    [1, 3],
  ],
  up: [
    [1, 3],
    [1, 2],
    [0, 1],
    [0, 0],
  ],
  high: [
    [1, 2],
    [1, 1],
    [1, 0],
    [1, -1],
  ],
  down: [
    [1, 4],
    [1, 5],
  ],
  point: [
    [-1, 3],
    [0, 3],
    [1, 3],
  ],
};
const LEGS: [number, "A" | "B"][] = [
  [3, "A"],
  [5, "B"],
  [8, "A"],
  [10, "B"],
];
const basePose = (who: "O" | "S", x: number, y: number, px: number): Pose => ({
  x,
  y,
  px,
  who,
  sx: 1,
  sy: 1,
  lean: 0,
  flip: 1,
  armL: "out",
  armR: "out",
  legA: 0,
  legB: 0,
  eyes: "open",
  mouth: 0,
  lift: 0,
  alpha: 1,
  tag: 0,
});

function critter(ctx: Ctx, p: Pose, u: number) {
  if (p.alpha <= 0.01) return;
  const px = p.px;
  ctx.save();
  ctx.globalAlpha *= p.alpha;
  // the contact shadow shrinks as it jumps
  const sh = 1 / (1 + p.lift * 0.12);
  ctx.fillStyle = rgba(INK, 0.1 * sh);
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + px * 0.2, px * 6.2 * sh * Math.abs(p.sx), px * 0.8 * sh, 0, 0, TAU);
  ctx.fill();
  ctx.translate(p.x, p.y - p.lift * px);
  ctx.scale(p.sx * (Math.abs(p.flip) < 0.08 ? 0.08 * Math.sign(p.flip || 1) : p.flip), p.sy);
  const front = p.flip > 0;
  const X = (c: number, r: number) => (c - 7) * px + (r < 6 ? p.lean * px * (1 - Math.max(0, r) / 6) : 0),
    Y = (r: number) => (r - 8) * px,
    cell = (c: number, r: number, w = 1, h = 1) => ctx.rect(X(c, r), Y(r), w * px + 0.6, h * px + 0.6);
  const body = p.tint ?? (p.who === "O" ? OPUS_BODY : SONNET_BODY);
  // legs (a lifted leg is one pixel short)
  ctx.fillStyle = body;
  ctx.beginPath();
  for (const [c, pair] of LEGS) {
    const up = pair === "A" ? p.legA : p.legB;
    cell(c, 6, 1, up > 0.5 ? 1 : 2);
  }
  ctx.fill();
  // body and arms, one path so the pixels never seam
  ctx.beginPath();
  for (let r = 0; r < 6; r++) cell(2, r, 10, 1);
  for (const [c, r] of ARM[p.armL]) cell(c, r);
  for (const [c, r] of ARM[p.armR]) cell(13 - c, r);
  ctx.fill();
  if (p.who === "S") {
    // headphones: a band over the top, a cup on each side
    ctx.fillStyle = p.tint ?? SONNET;
    ctx.beginPath();
    cell(3, -2, 8, 1);
    cell(2, -1, 10, 1);
    cell(0, 0, 3, 3);
    cell(11, 0, 3, 3);
    ctx.fill();
  }
  if (front && !p.tint) {
    // eyes, with a glint
    ctx.fillStyle = INK;
    const eyeC = p.eyes === "left" ? -1 : p.eyes === "right" ? 1 : 0,
      eyeR = p.eyes === "up" ? -1 : 0;
    if (p.eyes === "happy") {
      ctx.strokeStyle = INK;
      ctx.lineWidth = px * 0.42;
      ctx.lineCap = "square";
      for (const c of [4, 9]) {
        ctx.beginPath();
        ctx.moveTo(X(c - 0.5, 3), Y(3.6));
        ctx.lineTo(X(c + 0.5, 2), Y(2.5));
        ctx.lineTo(X(c + 1.5, 3), Y(3.6));
        ctx.stroke();
      }
    } else {
      ctx.beginPath();
      for (const c of [4, 9]) {
        if (p.eyes === "blink") ctx.rect(X(c, 3), Y(3.6), px + 0.6, px * 0.35);
        else cell(c + eyeC, 2 + eyeR, 1, 2);
      }
      ctx.fill();
      if (p.eyes !== "blink") {
        ctx.fillStyle = "#ffffff";
        for (const c of [4, 9])
          ctx.fillRect(X(c + eyeC, 2 + eyeR) + px * 0.55, Y(2 + eyeR) + px * 0.18, px * 0.3, px * 0.3);
      }
    }
    if (p.who === "O") {
      // glasses: two thin frames and a bridge
      ctx.strokeStyle = INK;
      ctx.lineWidth = Math.max(1.5 * u, px * 0.2);
      ctx.beginPath();
      for (const c of [4, 9]) ctx.rect(X(c - 0.7, 2), Y(1.45), px * 2.4, px * 3.05);
      ctx.moveTo(X(5.7, 2), Y(2.3));
      ctx.lineTo(X(8.3, 2), Y(2.3));
      ctx.stroke();
    }
    // cheeks
    ctx.fillStyle = rgba("#c2453a", 0.28);
    ctx.fillRect(X(2.6, 4), Y(4.1), px * 1.1, px * 0.6);
    ctx.fillRect(X(10.3, 4), Y(4.1), px * 1.1, px * 0.6);
    // the singing mouth
    if (p.mouth > 0.05) {
      ctx.fillStyle = INK;
      const h = px * (0.35 + 1.1 * p.mouth);
      ctx.fillRect(X(6, 4), Y(4.25), px * 2, h);
      ctx.fillStyle = mix(body, "#7a2618", 0.5);
      if (p.mouth > 0.45) ctx.fillRect(X(6.4, 4), Y(4.25) + h * 0.55, px * 1.2, h * 0.4);
    }
  }
  ctx.restore();
  if (p.tag > 0.01) {
    const label = p.who === "O" ? "OPUS 5.5" : "SONNET 5.5",
      o = { size: 24 * u, family: F_.mono, weight: 500 },
      w = measure(ctx, label, o) + 26 * u,
      hgt = 40 * u,
      k = spring(p.tag * 0.6, { freq: 2.4, damp: 0.55 }),
      ty = p.y - p.lift * px - (p.who === "S" ? 11.6 : 9.6) * px * p.sy - hgt;
    ctx.save();
    ctx.globalAlpha *= clamp(p.tag * 3) * p.alpha;
    ctx.translate(p.x, ty + hgt / 2);
    ctx.scale(k, k);
    ctx.fillStyle = p.who === "O" ? OPUS_ON_LIGHT : SONNET_ON_LIGHT;
    rr(ctx, -w / 2, -hgt / 2, w, hgt, hgt / 2);
    ctx.fill();
    text(ctx, label, 0, 8 * u, { ...o, color: IVORY, align: "center" });
    ctx.restore();
  }
}

// ---------------------------------------------------------------- choreography
/** a bounce landing on every beat (or every other one): squash at the landing, a little air between */
const bop = (p: Pose, F: number, amt: number, every = 1) => {
  const len = BEAT * every,
    ph = (((F % len) + len) % len) / len,
    land = Math.exp(-ph * 7);
  p.sy *= 1 - 0.1 * amt * land;
  p.sx *= 1 + 0.08 * amt * land;
  p.lift += Math.sin(Math.PI * ph) * 0.9 * amt;
  const k = Math.floor(F / len) % 2;
  p.legA = k ? 0 : Math.sin(Math.PI * ph) > 0.3 ? 1 : 0;
  p.legB = k ? (Math.sin(Math.PI * ph) > 0.3 ? 1 : 0) : 0;
};
const jump = (p: Pose, F: number, f0: number, h: number, len = BEAT * 2) => {
  const t = (F - f0) / len;
  if (t < 0 || t > 1) return;
  p.lift += Math.sin(Math.PI * t) * h;
  p.sy *= t < 0.15 ? 1 + 0.15 * Math.sin((t / 0.15) * Math.PI) : 1;
  p.armL = p.armR = "up";
  p.legA = p.legB = 1;
};
const spin = (p: Pose, F: number, f0: number, len = BEAT) => {
  const t = (F - f0) / len;
  if (t >= 0 && t <= 1) p.flip = Math.cos(t * TAU);
};
const blinkAt = (F: number, seed: number) => {
  const period = 97 + Math.floor(hash(seed) * 40),
    ph = (F + seed * 13) % period;
  return ph < 4;
};
const sing = (p: Pose, F: number) => {
  const f = clamp(Math.round(F), 0, N - 1);
  p.mouth = MOUTH[p.who][f];
  // a small accent on every sung syllable
  const s = SINCE[p.who][f];
  if (s < 8) p.sy *= 1 + 0.05 * Math.exp(-s / 2.5);
};

// ---------------------------------------------------------------- the lyric setter
type LStyle = { family: string; weight: number; upper: boolean; max: number; track: number };
type Piece = { k: number; t: string; x: number; w: number; row: number };
type SetLine = { pieces: Piece[]; rowW: number[]; size: number; lead: number; st: LStyle };
const styleOf = (li: number): LStyle => {
  const w = LINE_WHO[li];
  if (li === 0) return { family: F_.sans, weight: 800, upper: true, max: 118, track: -0.03 };
  if (w === "O") return { family: F_.serif, weight: 400, upper: false, max: 116, track: -0.01 };
  if (w === "S") return { family: F_.sans, weight: 800, upper: false, max: 92, track: -0.035 };
  return { family: F_.sans, weight: 800, upper: true, max: 104, track: -0.02 };
};
/** the fact strip: what the line claims, with its hedge (every one is in the brief's facts) */
const FACTS: [number, number, string][] = [
  [frameOf(5), frameOf(9), "the hardest long-horizon work: an Opus model"],
  [frameOf(9), frameOf(13), "Opus 5.5: complex work, careful judgment"],
  [frameOf(13), frameOf(17), "Sonnet 5.5: a clear spec, a way to check the result"],
  [frameOf(17), frameOf(19), "Sonnet 5.5: 30% faster than Sonnet 5"],
  [frameOf(19), frameOf(21), "typically far fewer tokens for the same work"],
  [frameOf(21), frameOf(25), "advisor tool: Opus 5.5 can advise Sonnet 5.5"],
  [frameOf(29), frameOf(31), "the executor decides when to ask"],
  [frameOf(31), frameOf(33), "the advisor reads it all: a plan or a correction"],
  [frameOf(33), frameOf(35), "Opus 5.5 advising: the advice comes back encrypted"],
  [frameOf(35), frameOf(37), "your app can't read it; the executor can"],
  [frameOf(45), frameOf(46), "Sonnet 5.5: a 1M-token context window"],
  [frameOf(46), frameOf(47), "Sonnet 5.5 effort: low · medium · high · xhigh · max"],
  [frameOf(47), frameOf(48), "input and output: half of Opus 5.5 · cache reads equal"],
  [frameOf(48), frameOf(49), "most tokens run at the executor's rates"],
];

const darkAt = (F: number) => {
  const b = barOf(F);
  return b === 4 || (b >= 21 && b <= 28) || (b >= 37 && b <= 44) || (b >= 49 && b <= 56);
};
const COUNT_BG = [INK, SONNET, BOTH, INK]; // never clay: Opus would vanish into it
/** the ground outside the choruses: it flips between ivory and a pale tint of the singer on every line */
const groundAt = (F: number) => {
  const b = barOf(F),
    li = LINE_BARS.findIndex(([a, c]) => b >= a && b <= c);
  if (li < 0 || b < 5) return IVORY;
  const w = LINE_WHO[li],
    col = w === "O" ? OPUS : w === "S" ? SONNET : BOTH;
  return li % 2 ? mix(IVORY, col, 0.22) : IVORY;
};
/** the frame a line change lands on (for the camera's punch-in), or -1 */
const lineCutAt = (F: number) => {
  const b = barOf(F),
    li = LINE_BARS.findIndex(([a, c]) => b >= a && b <= c);
  return li < 0 ? -1 : frameOf(LINE_BARS[li][0]);
};

export function make(size: Size, id: string): Film {
  const Lay = layout(size),
    { W, H, u, cx, tall } = Lay,
    S = Lay.safe;
  const lyr = tall
    ? { top: 262 * u, bot: 700 * u, maxW: W - 2 * S.x, rows: 3 }
    : { top: 100 * u, bot: 332 * u, maxW: 1720 * u, rows: 2 };
  const stage = tall ? { floor: 1400 * u, half: 400 * u } : { floor: 880 * u, half: 700 * u };
  const PX = (tall ? 15.5 : 18) * u;
  const factY = tall ? H - S.bottom - 8 * u : H - S.bottom - 6 * u;
  type Box = { x: number; y: number; w: number; h: number };
  const BOX_R: Box = tall
      ? { x: 90 * u, y: 740 * u, w: 900 * u, h: 470 * u }
      : { x: 780 * u, y: 372 * u, w: 1000 * u, h: 520 * u },
    BOX_L: Box = tall ? BOX_R : { x: 140 * u, y: 372 * u, w: 1000 * u, h: 520 * u },
    BOX_C: Box = tall
      ? { x: 90 * u, y: 730 * u, w: 900 * u, h: 440 * u }
      : { x: 360 * u, y: 330 * u, w: 1200 * u, h: 400 * u };
  /** draw in a 1000 × 520 space fitted (centred) into a box, so every prop is designed once for both sizes */
  const inBox = (ctx: Ctx, b: Box, draw: () => void) => {
    const k = Math.min(b.w / 1000, b.h / 520);
    ctx.save();
    ctx.translate(b.x + b.w / 2, b.y + b.h / 2);
    ctx.scale(k, k);
    ctx.translate(-500, -260);
    draw();
    ctx.restore();
  };
  const at2 = (ctx: Ctx, x: number, y: number, k: number, rot: number, draw: () => void) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(k, k);
    draw();
    ctx.restore();
  };
  /** a prop's life in a window: its entrance spring and its exit (scale-out over the last 5 frames) */
  const life = (F: number, a: number, b: number) => {
    const inn = sp(F, a, 2.4, 0.6),
      out = 1 - ease.inCubic(prog(F, b - 5, b));
    return { on: F >= a - 1 && F < b, k: inn * out, inn, out };
  };

  // ---------------------------------------------------------------- the cast: where each critter stands
  // keys: [frame, x as a share of the stage half-width, pixel size multiplier, height off the floor (u)]
  type Key = [number, number, number, number, boolean?]; // [..., cut: jump straight to the mark]
  const HI = tall ? 460 : 330,
    CH = tall ? -120 : 0; // the vertical's choruses stand lower, on a deeper stage
  const KEYS: Record<"O" | "S", Key[]> = {
    O: [
      [0, -0.36, 1.25, 0],
      [frameOf(5), tall ? -0.5 : -0.6, 1.3, 0, true],
      [frameOf(13), tall ? -0.8 : 0.93, 0.8, 0, true],
      [frameOf(21), tall ? -0.52 : -0.3, tall ? 1.6 : 1.3, CH, true],
      [frameOf(29), tall ? -0.5 : -0.78, 1.0, HI, true],
      [frameOf(37), tall ? -0.52 : -0.34, tall ? 1.6 : 1.45, CH, true],
      [frameOf(45), tall ? -0.55 : -0.82, 1.0, 0, true],
      [frameOf(49), tall ? 0.52 : 0.38, tall ? 1.6 : 1.45, CH, true],
      [frameOf(57), tall ? 0.7 : 0.44, 1.3, 0, true],
      [frameOf(57, 2), tall ? 0.6 : 0.38, 1.3, 0],
      [frameOf(58), tall ? 0.5 : 0.32, 1.3, 0],
      [frameOf(58, 2), tall ? 0.4 : 0.25, 1.3, 0],
    ],
    S: [
      [0, 0.36, 1.2, 0],
      [frameOf(5), tall ? 0.8 : 1.0, 0.8, 0, true],
      [frameOf(13), 0.5, 1.3, 0, true],
      [frameOf(21), tall ? 0.52 : 0.3, tall ? 1.6 : 1.3, CH, true],
      [frameOf(29), tall ? 0.52 : 0.62, 1.1, 0, true],
      [frameOf(37), tall ? 0.52 : 0.34, tall ? 1.6 : 1.45, CH, true],
      [frameOf(45), tall ? 0.55 : 0.82, 1.0, 0, true],
      [frameOf(49), tall ? -0.52 : -0.38, tall ? 1.6 : 1.45, CH, true],
      [frameOf(57), tall ? -0.7 : -0.44, 1.3, 0, true],
      [frameOf(57, 2), tall ? -0.6 : -0.38, 1.3, 0],
      [frameOf(58), tall ? -0.5 : -0.32, 1.3, 0],
      [frameOf(58, 2), tall ? -0.4 : -0.25, 1.3, 0],
    ],
  };

  const spot = (who: "O" | "S", F: number) => {
    const ks = KEYS[who];
    let i = 0;
    while (i + 1 < ks.length && F >= ks[i + 1][0]) i++;
    const cur = ks[i],
      prev = ks[Math.max(0, i - 1)],
      k = i === 0 || cur[4] ? 1 : sp(F, cur[0], 2.2, 0.8),
      hop =
        i === 0 || cur[4]
          ? 0
          : Math.sin(Math.PI * clamp((F - cur[0]) / 14)) * (Math.abs(cur[1] - prev[1]) > 0.04 ? 3 : 0);
    return {
      x: cx + lerp(prev[1], cur[1], k) * stage.half,
      px: PX * lerp(prev[2], cur[2], k),
      y: stage.floor - lerp(prev[3], cur[3], k) * u,
      hop,
    };
  };

  /** every critter's pose on a frame: its spot, then the section's dance, then its singing */
  const pose = (who: "O" | "S", F: number): Pose => {
    const s = spot(who, F),
      p = basePose(who, s.x, s.y, s.px),
      bar = barOf(F),
      part = partOf(bar),
      me = who === "O",
      lf = F % BAR; // frame in the bar
    p.lift += s.hop;
    if (blinkAt(F, me ? 3 : 8)) p.eyes = "blink";
    if (part === "intro") {
      const land = me ? LAND_O : LAND_S;
      if (F < land - 10) p.alpha = 0;
      else if (F < land) {
        const t = (F - (land - 10)) / 10;
        p.lift += 75 * (1 - t * t);
        p.armL = p.armR = "up";
        p.legA = p.legB = 1;
      } else {
        const t = (F - land) / FPS,
          sq = Math.exp(-t * 9) * Math.cos(t * 30);
        p.sy *= 1 - 0.22 * sq;
        p.sx *= 1 + 0.16 * sq;
        if (!me && F < land + 20) p.lift += Math.abs(Math.sin(((F - land) / 20) * Math.PI)) * 4;
      }
      if (bar === 2) bop(p, F, 0.7);
      if (bar === 3) {
        bop(p, F, 0.8);
        const b = Math.floor(lf / BEAT);
        p.armL = b % 2 ? "up" : "out";
        p.armR = b % 2 ? "out" : "up";
        p.eyes = "happy";
      }
      if (bar === 4) {
        const b = Math.floor(lf / BEAT);
        jump(p, F, frameOf(4, b), 3.2, BEAT);
      }
      p.tag = bar >= 2 && bar < 4 ? clamp((F - frameOf(2) - (me ? 0 : 6)) / 10) : 0;
    } else if (part === "verse") {
      if (me) {
        if (bar <= 6) {
          bop(p, F, 0.5, 2);
          if (F >= BOX && F < BOX + 12) p.armL = p.armR = "up";
          p.eyes = F < BOX + 30 ? "up" : p.eyes;
        } else if (bar <= 8) {
          bop(p, F, 0.55, 2);
          p.armR = "point";
          p.eyes = p.eyes === "blink" ? "blink" : "right";
        } else if (bar <= 10) {
          // thinking: a slow sway, one arm up to the chin, eyes up
          p.lean = Math.sin((F / (BEAT * 4)) * TAU) * 0.8;
          p.armR = "up";
          p.armL = "down";
          p.eyes = p.eyes === "blink" ? "blink" : "up";
          bop(p, F, 0.3, 2);
        } else {
          bop(p, F, 0.5, 1);
          p.armR = "point";
          p.eyes = p.eyes === "blink" ? "blink" : "right";
        }
        p.tag = bar <= 6 ? 1 - prog(F, frameOf(6, 2), frameOf(7)) : 0;
      } else {
        bop(p, F, 0.7);
        p.eyes = p.eyes === "blink" ? "blink" : "left";
      }
    } else if (part === "verse2") {
      if (!me) {
        bop(p, F, 0.9);
        if (bar <= 14) {
          if (F >= SPEC - 4 && F < SPEC + 14) p.armL = p.armR = "up";
        } else if (bar <= 16) {
          p.eyes = F >= TESTS[0] ? "happy" : p.eyes;
          const b = Math.floor(lf / BEAT);
          if (bar === 16) p.armL = b % 2 ? "up" : "out";
        } else if (bar <= 18) {
          // the dash: lean into the speed
          p.lean = -1.6 * Math.min(1, (F - DASH) / 6) + Math.sin(F * 0.9) * 0.2;
          p.legA = Math.floor(F / 3) % 2;
          p.legB = 1 - p.legA;
          p.armL = p.armR = "down";
          p.x -= Math.sin(Math.PI * clamp((F - DASH) / (BAR * 2))) * 40 * u;
        } else {
          p.lean = Math.sin((F / BEAT) * Math.PI) * 0.9;
          p.eyes = "happy";
          p.armL = p.armR = Math.floor(F / BEAT) % 2 ? "out" : "down";
        }
        p.tag = bar <= 14 && !tall ? 1 - prog(F, frameOf(14, 2), frameOf(15)) : 0;
      } else {
        bop(p, F, 0.4, 2);
        p.eyes = p.eyes === "blink" ? "blink" : "right";
      }
    } else if (part === "chorus" || part === "final") {
      const b0 = bar >= 49 ? 49 : bar >= 37 ? 37 : 21,
        rel = bar - b0,
        big = part === "final" ? 1.3 : 1;
      bop(p, F, 0.9 * big);
      if (rel === 0 && me) {
        p.armL = p.armR = "up";
        p.eyes = "happy";
      }
      if (rel === 1 && me) p.armR = "point";
      if (rel === 2 && !me) jump(p, F, frameOf(bar, 0), 3 * big);
      if (rel === 3 && !me) spin(p, F, frameOf(bar, 1), BEAT * 2);
      if (rel === 4 || rel === 5) {
        const c = CHANT.map((o) => frameOf(b0 + 4) + o),
          i = c.filter((f) => F >= f).length - 1;
        if (i === 0 && me) p.armL = p.armR = "high";
        if ((i === 1 || i === 2) && !me) p.armL = p.armR = i === 1 ? "high" : "point";
        if (i === 3) jump(p, F, c[3], 2.2, BEAT * 2);
        if (i >= 0 && F - c[i] < 6) p.sy *= 1 - 0.1 * Math.exp(-(F - c[i]) / 2);
      }
      if (rel === 6) {
        const b = Math.floor(lf / BEAT);
        p.x += (b % 2 ? 1 : -1) * 18 * u * Math.sin(Math.PI * beatPh(F));
        p.lean = (b % 2 ? 1 : -1) * 0.8;
      }
      if (rel === 7) {
        jump(p, F, frameOf(bar, 1), 4 * big, BEAT * 3);
        if (F >= frameOf(bar, 1)) p.eyes = "happy";
      }
    } else if (part === "advisor") {
      if (me) {
        // on the cloud: a float, reading, then sending
        p.lift += Math.sin((F / (BEAT * 4)) * TAU) * 0.6;
        if (bar === 31 || bar === 32) {
          p.eyes = Math.floor(F / (BEAT / 2)) % 2 ? "left" : "right";
          p.armL = p.armR = "down";
        } else if (bar === 33 || bar === 34) {
          p.armR = F >= SEND - 6 && F < SEND + 20 ? "point" : "out";
          p.eyes = p.eyes === "blink" ? "blink" : "right";
        } else if (bar <= 30) {
          p.eyes = F >= CALL + 10 ? "up" : p.eyes;
          bop(p, F, 0.3, 2);
        } else {
          p.eyes = "happy";
          bop(p, F, 0.4, 2);
        }
      } else {
        if (bar <= 30 && F < CALL) {
          // typing: arms down, alternating on 8ths
          const k = Math.floor(F / (BEAT / 2)) % 2;
          p.armL = k ? "down" : "out";
          p.armR = k ? "out" : "down";
          p.eyes = p.eyes === "blink" ? "blink" : "left";
          bop(p, F, 0.25);
        } else if (F >= CALL - 2 && F < CALL + 10) {
          p.armL = "point";
        } else if (F < SEAL) {
          p.eyes = p.eyes === "blink" ? "blink" : "up";
          bop(p, F, 0.4, 2);
        } else if (F < OPEN) {
          p.armL = p.armR = F < SEAL + 14 ? "up" : "out";
          bop(p, F, 0.5);
        } else {
          p.armL = p.armR = "up";
          p.eyes = "happy";
          bop(p, F, 0.8);
        }
      }
    } else if (part === "bridge") {
      const mine = (bar !== 48) === !me;
      bop(p, F, mine ? 0.9 : 0.35, mine ? 1 : 2);
      if (mine) p.armL = p.armR = Math.floor(F / BEAT) % 2 ? "up" : "out";
      p.eyes = p.eyes === "blink" ? "blink" : me ? "right" : "left";
    } else {
      // outro: step in, the high five, then dance
      if (F < HIGH5 - 8) {
        bop(p, F, 0.8);
        p.eyes = p.x < cx ? "right" : "left";
      } else if (F < HIGH5 + 24) {
        jump(p, F, HIGH5 - 8, 3.6, 32);
        if (p.x < cx) {
          p.armR = "high";
          p.armL = "out";
        } else {
          p.armL = "high";
          p.armR = "out";
        }
        p.eyes = "happy";
      } else {
        bop(p, F, 0.7);
        p.eyes = "happy";
        const b = Math.floor(F / BEAT) % 2;
        p.armL = b ? "up" : "out";
        p.armR = b ? "out" : "up";
      }
    }
    sing(p, F);
    return p;
  };

  // ---------------------------------------------------------------- grounds and small parts
  const dots = (ctx: Ctx, F: number, col: string, a: number) => {
    const g = 48 * u,
      off = (F * 0.25 * u) % g;
    ctx.fillStyle = rgba(col, a);
    for (let y = -g + off; y < H + g; y += g)
      for (let x = -g + off * 0.6; x < W + g; x += g) ctx.fillRect(x, y, 3 * u, 3 * u);
  };
  const confetti = (ctx: Ctx, F: number, f0: number, x0: number, y0: number, n: number, seed: number, spread = 1) => {
    const t = F - f0;
    if (t < 0 || t > 70) return;
    const cols = [OPUS, SONNET, BOTH, IVORY, SONNET_BODY];
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (hash(seed, i) - 0.5) * 2.4 * spread,
        v = (9 + hash(seed, i + 99) * 14) * u,
        x = x0 + Math.cos(a) * v * t,
        y = y0 + Math.sin(a) * v * t + 0.32 * u * t * t,
        r = t * (0.2 + hash(seed, i + 7) * 0.3),
        s = (8 + hash(seed, i + 5) * 10) * u;
      ctx.save();
      ctx.globalAlpha *= 1 - clamp((t - 45) / 25);
      ctx.translate(x, y);
      ctx.rotate(r);
      ctx.fillStyle = cols[i % cols.length];
      ctx.fillRect(-s / 2, -s / 4, s, s / 2 + Math.abs(Math.sin(r * 2)) * s * 0.4);
      ctx.restore();
    }
  };
  const rain = (ctx: Ctx, F: number, n: number, seed: number) => {
    const cols = [OPUS, SONNET, BOTH, IVORY];
    for (let i = 0; i < n; i++) {
      const sp0 = (2.2 + hash(seed, i) * 2.5) * u,
        x = hash(seed, i + 50) * W + Math.sin(F * 0.05 + i) * 30 * u,
        y = ((hash(seed, i + 80) * (H + 100 * u) + F * sp0) % (H + 100 * u)) - 50 * u,
        s = (8 + hash(seed, i + 3) * 8) * u;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(F * 0.08 + i);
      ctx.fillStyle = cols[i % cols.length];
      ctx.fillRect(-s / 2, -s / 4, s, s / 2);
      ctx.restore();
    }
  };
  const rays = (
    ctx: Ctx,
    x: number,
    y: number,
    r: number,
    n: number,
    rot: number,
    col: (i: number) => string,
    a: number,
  ) => {
    ctx.save();
    ctx.globalAlpha *= a;
    for (let i = 0; i < n; i++) {
      const a0 = rot + (i / n) * TAU,
        a1 = a0 + (TAU / n) * 0.5;
      ctx.fillStyle = col(i);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a0) * r, y + Math.sin(a0) * r);
      ctx.lineTo(x + Math.cos(a1) * r, y + Math.sin(a1) * r);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  };
  const card = (ctx: Ctx, x: number, y: number, w: number, h: number, fill: string, line = INK, lw = 4, r = 22) => {
    ctx.fillStyle = fill;
    rr(ctx, x, y, w, h, r);
    ctx.fill();
    if (lw > 0) {
      ctx.strokeStyle = line;
      ctx.lineWidth = lw;
      rr(ctx, x, y, w, h, r);
      ctx.stroke();
    }
  };
  const bar = (ctx: Ctx, x: number, y: number, w: number, h: number, col: string) => {
    ctx.fillStyle = col;
    rr(ctx, x, y - h / 2, Math.max(h, w), h, h / 2);
    ctx.fill();
  };
  const T = (
    ctx: Ctx,
    s: string,
    x: number,
    y: number,
    size: number,
    col: string,
    family = F_.sans,
    weight = 800,
    align: CanvasTextAlign = "center",
    track = -0.02,
  ) => text(ctx, s, x, y, { size, family, weight, color: col, align, track });
  const mono = (
    ctx: Ctx,
    s: string,
    x: number,
    y: number,
    size: number,
    col: string,
    align: CanvasTextAlign = "center",
  ) => text(ctx, s, x, y, { size, family: F_.mono, weight: 500, color: col, align });
  const MUTED = mix(C.muted, INK, 0.35);

  // ---------------------------------------------------------------- the icons (chant cards and callbacks)
  const icon = (ctx: Ctx, kind: "plan" | "build" | "check" | "ship" | "go", col: string, t = 1) => {
    ctx.save();
    ctx.strokeStyle = col;
    ctx.fillStyle = col;
    ctx.lineWidth = 9;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (kind === "plan") {
      ctx.strokeRect(-42, -44, 84, 88);
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(-24, -20 + i * 22);
        ctx.lineTo(-24 + 48 * clamp(t * 3 - i), -20 + i * 22);
        ctx.stroke();
      }
    } else if (kind === "build") {
      for (let i = 0; i < 3; i++) ctx.fillRect(-40 + (i % 2) * 20, 22 - i * 30 - 26 * (1 - clamp(t * 3 - i)), 60, 24);
    } else if (kind === "check") {
      check(ctx, 0, 0, 90, t);
    } else if (kind === "ship") {
      ctx.beginPath();
      ctx.moveTo(-46, 4);
      ctx.lineTo(46, -34);
      ctx.lineTo(10, 40);
      ctx.lineTo(0, 12);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(-40, -14);
      ctx.lineTo(8, -14);
      ctx.lineTo(8, -38);
      ctx.lineTo(48, 0);
      ctx.lineTo(8, 38);
      ctx.lineTo(8, 14);
      ctx.lineTo(-40, 14);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  };
  function check(ctx: Ctx, x: number, y: number, s: number, t: number, col?: string) {
    const pts: [number, number][] = [
        [-0.5, 0],
        [-0.15, 0.35],
        [0.55, -0.4],
      ],
      seg = [Math.hypot(0.35, 0.35), Math.hypot(0.7, 0.75)];
    let left = t * (seg[0] + seg[1]);
    ctx.save();
    if (col) ctx.strokeStyle = col;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(x + pts[0][0] * s, y + pts[0][1] * s);
    for (let i = 0; i < 2 && left > 0; i++) {
      const k = Math.min(1, left / seg[i]);
      ctx.lineTo(x + lerp(pts[i][0], pts[i + 1][0], k) * s, y + lerp(pts[i][1], pts[i + 1][1], k) * s);
      left -= seg[i];
    }
    ctx.stroke();
    ctx.restore();
  }

  // ================================================================ SCENES (props behind and in front of the cast)
  // ---- intro
  const introBack = (ctx: Ctx, F: number) => {
    const bar = barOf(F);
    if (bar === 4) {
      const b = Math.floor((F - frameOf(4)) / BEAT);
      ctx.fillStyle = COUNT_BG[b];
      ctx.fillRect(0, 0, W, H);
      const k = 1 + 0.5 * Math.exp(-((F - COUNT[b]) / 3));
      at2(ctx, cx, stage.floor - (tall ? 490 : 420) * u, k, 0, () =>
        T(ctx, String(b + 1), 0, (tall ? 170 : 150) * u, (tall ? 460 : 400) * u, rgba(IVORY, 0.9)),
      );
      return;
    }
    ctx.fillStyle = bar === 3 ? mix(IVORY, BOTH, 0.24) : IVORY; // bar 3: the pair waves together
    ctx.fillRect(0, 0, W, H);
    dots(ctx, F, INK, 0.06);
    // "5.5": slams on frame 0, then settles back as the ground the cast stands on
    const out = bar >= 2 ? ease.inCubic(prog(F, frameOf(2) - 4, frameOf(2) + 8)) : 0;
    if (out < 1) {
      const k = (1 + 0.6 * Math.exp(-F / 3.5) * Math.cos(F * 0.5)) * (1 - out),
        col = mix(INK, mix(PAPER, C.muted, 0.55), prog(F, 18, 40));
      at2(ctx, cx, stage.floor - (tall ? 420 : 400) * u, k, 0, () =>
        T(ctx, "5.5", 0, (tall ? 140 : 140) * u, (tall ? 380 : 400) * u, col, F_.sans, 800, "center", -0.05),
      );
    }
  };
  const introText = (ctx: Ctx, F: number) => {
    if (F < frameOf(2) - 4 || F >= frameOf(4)) return;
    const k = sp(F, frameOf(2) - 4),
      out = 1 - ease.inCubic(prog(F, frameOf(4) - 6, frameOf(4)));
    const title = "Two-Part Harmony",
      o = { size: (tall ? 118 : 140) * u, family: F_.italic, weight: 400, track: -0.02 },
      w = measure(ctx, title, o),
      y = (lyr.top + lyr.bot) / 2 + (tall ? 10 : 20) * u;
    ctx.save();
    ctx.globalAlpha *= out;
    // letters pop in on 16ths
    let x = cx - w / 2;
    [...title].forEach((ch, i) => {
      const cw = measure(ctx, title.slice(0, i + 1), o) - measure(ctx, title.slice(0, i), o),
        t = sp(F, frameOf(2) + i * 2, 3, 0.5);
      if (t > 0) at2(ctx, x + cw / 2, y, t, 0, () => text(ctx, ch, -cw / 2, 0, { ...o, color: INK }));
      x += cw;
    });
    mono(
      ctx,
      "a song about Opus 5.5 and Sonnet 5.5 working together",
      cx,
      y + (tall ? 64 : 64) * u,
      26 * u,
      rgba(MUTED, k),
    );
    ctx.restore();
  };

  // ---- verse 1 (Opus): the crate, the long road, the scale, the plan
  const crate = (ctx: Ctx, F: number, L: ReturnType<typeof life>) => {
    const drop = sp(F, BOX - 8, 2.2, 0.45),
      y = lerp(-620, 0, clamp(drop, 0, 1.2)),
      wob = Math.exp(-(F - BOX) / 12) * Math.sin((F - BOX) * 0.6) * 0.05 + Math.sin((F / BEAT) * Math.PI) * 0.012;
    at2(ctx, 520, 300 + y, L.out, F >= BOX ? wob : 0, () => {
      card(ctx, -200, -160, 400, 320, INK, INK, 0, 18);
      ctx.fillStyle = OPUS;
      ctx.fillRect(-200, -34, 400, 44);
      T(ctx, "THE HARDEST", 0, -70, 46, IVORY);
      T(ctx, "PROBLEM", 0, 92, 46, IVORY);
    });
    // question marks puff out of it on the beats
    for (let b = 1; b < 8; b++) {
      const f0 = BOX + b * BEAT,
        t = F - f0;
      if (t < 0 || t > 26) continue;
      ctx.save();
      ctx.globalAlpha *= (1 - t / 26) * L.out;
      T(ctx, "?", 520 + (b % 2 ? 1 : -1) * (150 + b * 12), 150 - t * 5, 96, OPUS_ON_LIGHT, F_.italic, 400);
      ctx.restore();
    }
  };
  const road = (ctx: Ctx, F: number, L: ReturnType<typeof life>) => {
    const a = frameOf(7),
      p = ease.outCubic(prog(F, a - 2, a + 22)),
      vy = 64,
      far = lerp(520, vy, p);
    ctx.save();
    ctx.globalAlpha *= L.out;
    ctx.strokeStyle = rgba(INK, 0.18);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(40, vy);
    ctx.lineTo(960, vy);
    ctx.stroke();
    const wAt = (y: number) => lerp(8, 480, (y - vy) / (520 - vy));
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.moveTo(500 - wAt(520) / 2, 520);
    ctx.lineTo(500 + wAt(520) / 2, 520);
    ctx.lineTo(500 + wAt(far) / 2, far);
    ctx.lineTo(500 - wAt(far) / 2, far);
    ctx.closePath();
    ctx.fill();
    // dashes rush toward us: the road is long
    ctx.fillStyle = IVORY;
    for (let i = 0; i < 12; i++) {
      const z = ((((i + F * 0.07) % 12) + 12) % 12) / 12,
        y = vy + (520 - vy) * z * z,
        h = 4 + 40 * z * z,
        w = 3 + 14 * z;
      if (y < far) continue;
      ctx.fillRect(500 - w / 2, y - h / 2, w, h);
    }
    // the tangle at the far end
    if (p > 0.6) {
      ctx.strokeStyle = OPUS;
      ctx.lineWidth = 6;
      ctx.lineJoin = "round";
      ctx.beginPath();
      for (let i = 0; i <= 160; i++) {
        const t = (i / 160) * TAU * 3,
          r = 44 + 18 * Math.sin(t * 2.3 + F * 0.08) + 10 * Math.sin(t * 5.1);
        const x = 500 + Math.cos(t * 1.7) * r * 1.3,
          y = vy - 6 + Math.sin(t * 1.3) * r * 0.55;
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      ctx.globalAlpha *= clamp((p - 0.6) / 0.3);
      ctx.stroke();
    }
    ctx.restore();
  };
  const scales = (ctx: Ctx, F: number, L: ReturnType<typeof life>) => {
    const a = frameOf(9),
      b = Math.floor((F - a) / BEAT),
      tgt = [-0.2, 0.16, -0.12, 0.09, -0.06, 0.04, -0.02, 0][clamp(b, 0, 7)],
      prevT = [0, -0.2, 0.16, -0.12, 0.09, -0.06, 0.04, -0.02][clamp(b, 0, 7)],
      ang = lerp(prevT, tgt, sp(F, a + b * BEAT, 2.6, 0.5));
    // thought dots rise from the thinker
    [0, 1, 2].forEach((i) => {
      const t = sp(F, a + i * 6, 3, 0.5);
      ctx.fillStyle = rgba(INK, 0.85);
      ctx.beginPath();
      ctx.arc(40 + i * 56, 470 - i * 58, (10 + i * 7) * t * L.out, 0, TAU);
      ctx.fill();
    });
    at2(ctx, 560, 290, L.k, 0, () => {
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.moveTo(-90, 200);
      ctx.lineTo(90, 200);
      ctx.lineTo(30, 160);
      ctx.lineTo(-30, 160);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(-9, -130, 18, 300);
      ctx.beginPath();
      ctx.arc(0, -140, 20, 0, TAU);
      ctx.fill();
      ctx.save();
      ctx.translate(0, -120);
      ctx.rotate(ang);
      ctx.fillRect(-270, -8, 540, 16);
      for (const side of [-1, 1]) {
        const x = side * 250;
        ctx.save();
        ctx.translate(x, 0);
        ctx.rotate(-ang);
        ctx.strokeStyle = INK;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-70, 150);
        ctx.moveTo(0, 0);
        ctx.lineTo(70, 150);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(0, 152, 86, 18, 0, 0, Math.PI);
        ctx.fill();
        ctx.fillStyle = side < 0 ? OPUS : SONNET;
        if (side < 0) ctx.fillRect(-32, 88, 64, 64);
        else {
          ctx.beginPath();
          ctx.arc(0, 118, 34, 0, TAU);
          ctx.fill();
        }
        ctx.restore();
      }
      ctx.restore();
    });
  };
  const planSheet = (ctx: Ctx, F: number, L: ReturnType<typeof life>) => {
    at2(ctx, 440, 270 + (1 - L.inn) * 300, L.out, -0.03, () => {
      card(ctx, -300, -240, 600, 480, C.surface, INK, 4, 20);
      T(ctx, "THE PLAN", -260, -178, 50, INK, F_.sans, 800, "left");
      let pen: [number, number] | null = null;
      PLAN_LINES.forEach((f0, i) => {
        const t = ease.outCubic(prog(F, f0, f0 + 9)),
          y = -118 + i * 44,
          len = 200 + hash(i, 5) * 250;
        if (F < f0) return;
        mono(ctx, String(i + 1), -254, y + 10, 28, MUTED, "left");
        bar(ctx, -214, y, len * t, 14, i % 3 === 2 ? OPUS : INK);
        if (t < 1) pen = [-214 + len * t, y];
      });
      if (pen) {
        const [px0, py0] = pen as [number, number];
        at2(ctx, px0, py0, 1, -0.7, () => {
          ctx.fillStyle = OPUS;
          ctx.fillRect(0, -9, 120, 18);
          ctx.fillStyle = INK;
          ctx.beginPath();
          ctx.moveTo(0, -9);
          ctx.lineTo(-22, 0);
          ctx.lineTo(0, 9);
          ctx.fill();
        });
      }
    });
  };
  const verse1Back = (ctx: Ctx, F: number) => {
    inBox(ctx, BOX_R, () => {
      const l1 = life(F, BOX - 8, frameOf(7)),
        l2 = life(F, frameOf(7), frameOf(9)),
        l3 = life(F, frameOf(9), frameOf(11)),
        l4 = life(F, frameOf(11), frameOf(13));
      if (l1.on) crate(ctx, F, l1);
      if (l2.on) road(ctx, F, l2);
      if (l3.on) scales(ctx, F, l3);
      if (l4.on) planSheet(ctx, F, l4);
    });
  };

  // ---- verse 2 (Sonnet): the spec, the checks, the speed, the tokens
  const specCard = (ctx: Ctx, F: number, L: ReturnType<typeof life>) => {
    const t = ease.outCubic(prog(F, frameOf(13) - 4, SPEC)),
      land = F >= SPEC ? Math.exp(-(F - SPEC) / 6) * Math.sin((F - SPEC) * 0.9) * 0.04 : 0;
    at2(ctx, lerp(1200, 500, t), 270 - Math.sin(t * Math.PI) * 120, L.out, lerp(0.6, -0.02, t) + land, () => {
      card(ctx, -270, -190, 540, 380, C.surface, INK, 4, 20);
      ctx.fillStyle = SONNET;
      rr(ctx, -270, -190, 540, 84, 20);
      ctx.fill();
      ctx.fillRect(-270, -130, 540, 24);
      T(ctx, "SPEC", -234, -130, 52, IVORY, F_.sans, 800, "left");
      for (let i = 0; i < 3; i++) {
        const y = -40 + i * 76;
        ctx.strokeStyle = INK;
        ctx.lineWidth = 4;
        ctx.strokeRect(-226, y - 20, 40, 40);
        bar(ctx, -160, y, 180 + hash(i, 9) * 200, 16, rgba(INK, 0.8));
      }
    });
  };
  const tests = (ctx: Ctx, F: number, L: ReturnType<typeof life>) => {
    const labels = ["tests pass", "types check", "lint clean", "matches the spec"];
    labels.forEach((lab, i) => {
      const f0 = frameOf(15, i),
        k = sp(F, f0, 3, 0.55) * L.out,
        y = 70 + i * 110,
        done = F >= TESTS[i];
      if (k <= 0) return;
      at2(ctx, 500, y, k, 0, () => {
        card(ctx, -300, -44, 600, 88, done ? mix(IVORY, BOTH, 0.18) : C.surface, INK, 4, 44);
        ctx.fillStyle = done ? BOTH : C.surface;
        ctx.strokeStyle = done ? BOTH : MUTED;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(-250, 0, 26, 0, TAU);
        if (done) ctx.fill();
        else {
          ctx.beginPath();
          ctx.arc(-250, 0, 24, F * 0.3, F * 0.3 + 4.2);
          ctx.stroke();
        }
        if (done) {
          ctx.lineWidth = 8;
          check(ctx, -250, 2, 34, ease.outCubic(prog(F, TESTS[i], TESTS[i] + 6)), IVORY);
        }
        mono(ctx, lab, -200, 10, 32, INK, "left");
      });
    });
  };
  const speed = (ctx: Ctx, F: number, L: ReturnType<typeof life>) => {
    const a = frameOf(17),
      lock = frameOf(17, 3),
      v = Math.round(30 * ease.outCubic(prog(F, a, lock)));
    ctx.save();
    ctx.globalAlpha *= L.out;
    // speed lines
    for (let i = 0; i < 16; i++) {
      const y = 30 + hash(i, 3) * 460,
        len = 120 + hash(i, 4) * 260,
        x = 1100 - (((F - a) * (26 + hash(i, 6) * 20) + hash(i, 8) * 1400) % 1500);
      ctx.fillStyle = rgba(INK, 0.1);
      ctx.fillRect(x, y, len, 6);
    }
    // the ghost of Sonnet 5, trailing
    const g = basePose("S", 170 - Math.sin(F * 0.2) * 6, 470, 9);
    g.alpha = 0.28;
    g.legA = Math.floor(F / 6) % 2;
    g.legB = 1 - g.legA;
    critter(ctx, g, 1);
    mono(ctx, "Sonnet 5", 170, 514, 32, MUTED);
    const pop = 1 + 0.25 * Math.exp(-(F - lock) / 4) * (F >= lock ? 1 : 0),
      jit = F < lock ? Math.sin(F * 2.1) * 4 : 0;
    at2(ctx, 580, 250 + jit, pop * L.inn, 0, () => {
      T(ctx, `${v}%`, 0, 60, 230, F >= lock ? SONNET_ON_LIGHT : INK, F_.sans, 800, "center", -0.05);
    });
    const k2 = sp(F, lock, 3, 0.55);
    at2(ctx, 580, 380, k2, 0, () => {
      T(ctx, "FASTER", 0, 0, 72, INK);
      mono(ctx, "than Sonnet 5", 0, 52, 32, MUTED);
    });
    ctx.restore();
  };
  const tokens = (ctx: Ctx, F: number, L: ReturnType<typeof life>) => {
    const a = frameOf(19),
      coin = (x: number, y: number, fill: string) => {
        ctx.fillStyle = mix(fill, INK, 0.25);
        ctx.fillRect(x - 80, y - 4, 160, 24);
        ctx.beginPath();
        ctx.ellipse(x, y + 20, 80, 20, 0, 0, Math.PI);
        ctx.fill();
        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.ellipse(x, y - 4, 80, 20, 0, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = INK;
        ctx.lineWidth = 3;
        ctx.stroke();
      };
    ctx.save();
    ctx.globalAlpha *= L.out;
    const base = tall ? 350 : 440,
      gap = 26;
    for (let i = 0; i < 12; i++) coin(300, base - i * gap * L.inn, mix(PAPER, C.muted, 0.45));
    // the right stack sheds coins on the 8ths
    const gone = (i: number) => a + 4 + (11 - i) * (BEAT / 2);
    for (let i = 0; i < 12; i++) {
      const g0 = gone(i),
        keep = i < 7;
      if (!keep && F >= g0) {
        const t = F - g0;
        if (t > 18) continue;
        ctx.save();
        ctx.globalAlpha *= 1 - t / 18;
        coin(700 + t * 6 * (i % 2 ? 1 : -1), base - i * gap - t * 14, SONNET);
        ctx.restore();
      } else coin(700, base - i * gap * L.inn, SONNET);
    }
    mono(ctx, "Sonnet 5", 300, base + 74, 32, MUTED);
    mono(ctx, "Sonnet 5.5", 700, base + 74, 32, SONNET_ON_LIGHT);
    mono(ctx, "same work · illustrative", tall ? 500 : 300, tall ? base + 118 : 100, 30, MUTED);
    // the feather
    if (F >= FEATHER - 20) {
      const t = (F - (FEATHER - 20)) / 60,
        x = lerp(980, 560, clamp(t)) + Math.sin(t * 7) * 50,
        y = lerp(-40, 230, clamp(t)) + Math.sin(t * 14) * 12;
      at2(ctx, x, y, 1, -0.6 + Math.sin(t * 7) * 0.35, () => {
        ctx.fillStyle = C.surface;
        ctx.strokeStyle = INK;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-90, 0);
        ctx.bezierCurveTo(-40, -44, 50, -40, 90, 0);
        ctx.bezierCurveTo(50, 30, -40, 30, -90, 0);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-110, 4);
        ctx.lineTo(80, 0);
        ctx.stroke();
      });
    }
    ctx.restore();
  };
  const verse2Back = (ctx: Ctx, F: number) => {
    inBox(ctx, BOX_L, () => {
      const l1 = life(F, frameOf(13) - 4, frameOf(15)),
        l2 = life(F, frameOf(15), frameOf(17)),
        l3 = life(F, frameOf(17), frameOf(19)),
        l4 = life(F, frameOf(19), frameOf(21));
      if (l1.on) specCard(ctx, F, l1);
      if (l2.on) tests(ctx, F, l2);
      if (l3.on) speed(ctx, F, l3);
      if (l4.on) tokens(ctx, F, l4);
    });
  };

  // ---- the choruses: 1 a party, 2 a concert, 3 the finale (a whole step up)
  const chorusBack = (ctx: Ctx, F: number, b0: number, v: 1 | 2 | 3) => {
    const bar = barOf(F),
      rel = bar - b0,
      bp = beatPh(F);
    const li = LINE_BARS.findIndex(([a, b]) => bar >= a && bar <= b),
      w = LINE_WHO[li],
      lineCol = w === "O" ? OPUS : w === "S" ? SONNET : BOTH,
      oy = stage.floor - 120 * u;
    // the ground flips on every line: ink, then a deep tint of whoever sings
    ctx.fillStyle = li % 2 ? mix(INK, lineCol, 0.32) : INK;
    ctx.fillRect(0, 0, W, H);
    if (v === 1) rays(ctx, cx, oy, Math.max(W, H), 14, F * 0.004, () => lineCol, 0.16 + 0.06 * Math.exp(-bp * 5));
    if (v === 3) {
      const cols = [OPUS, SONNET, BOTH];
      rays(ctx, cx, oy, Math.max(W, H), 18, -F * 0.006, (i) => cols[(i + Math.floor(F / BEAT)) % 3], 0.22);
    }
    if (v === 2) {
      // the concert: LED bars at the back, three spotlights sweeping
      const n = 24,
        bw = W / n;
      for (let i = 0; i < n; i++) {
        const lvl = 0.3 + 0.5 * Math.abs(Math.sin(i * 0.7 + F * 0.11)) * (0.6 + 0.4 * Math.exp(-bp * 4)),
          h = lvl * (tall ? 520 : 300) * u;
        ctx.fillStyle = rgba([OPUS, SONNET, BOTH][i % 3], 0.3);
        for (let y = 0; y < h; y += 22 * u)
          ctx.fillRect(i * bw + 6 * u, stage.floor - 60 * u - y - 16 * u, bw - 12 * u, 16 * u);
      }
      for (let s = 0; s < 3; s++) {
        const ang = Math.sin(F * 0.03 + s * 2.1) * 0.5,
          x0 = W * (0.2 + s * 0.3),
          len = H * 1.1;
        ctx.save();
        ctx.translate(x0, -20 * u);
        ctx.rotate(ang);
        ctx.fillStyle = rgba(IVORY, 0.07);
        ctx.beginPath();
        ctx.moveTo(-20 * u, 0);
        ctx.lineTo(20 * u, 0);
        ctx.lineTo(180 * u, len);
        ctx.lineTo(-180 * u, len);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }
    // the stage the cast dances on
    ctx.fillStyle = mix(INK, IVORY, 0.07);
    const cf = stage.floor - CH * u;
    ctx.fillRect(0, cf, W, H - cf);
    ctx.fillStyle = rgba(IVORY, 0.12);
    ctx.fillRect(0, cf, W, 4 * u);
    // spotlight pools under whoever sings
    for (const who of ["O", "S"] as const) {
      const on = MOUTH[who][clamp(Math.round(F), 0, N - 1)] > 0 || (rel >= 6 && rel <= 7);
      if (!on) continue;
      const sx = spot(who, F).x;
      ctx.fillStyle = rgba(who === "O" ? OPUS : SONNET, 0.22);
      ctx.beginPath();
      ctx.ellipse(sx, cf + 8 * u, 190 * u, 34 * u, 0, 0, TAU);
      ctx.fill();
    }
    // line props
    inBox(ctx, BOX_C, () => {
      if (rel <= 1) {
        const l = life(F, frameOf(b0) - 2, frameOf(b0 + 2));
        const oL = spot("O", F).x < cx;
        at2(
          ctx,
          oL ? (tall ? 250 : 330) : tall ? 750 : 670,
          (tall ? 280 : 200) + Math.sin(F * 0.15) * 10,
          l.k * 1.2,
          -0.08,
          () => {
            card(ctx, -90, -90, 180, 180, OPUS, OPUS, 0, 30);
            icon(ctx, "plan", IVORY, prog(F, frameOf(b0), frameOf(b0) + 30));
          },
        );
      } else if (rel <= 3) {
        const l = life(F, frameOf(b0 + 2) - 2, frameOf(b0 + 4));
        const sR = spot("S", F).x > cx;
        at2(
          ctx,
          sR ? (tall ? 750 : 670) : tall ? 250 : 330,
          (tall ? 280 : 200) + Math.sin(F * 0.15) * 10,
          l.k * 1.2,
          0.08,
          () => {
            card(ctx, -90, -90, 180, 180, SONNET, SONNET, 0, 30);
            icon(ctx, "go", IVORY);
          },
        );
        for (let i = 0; i < 5; i++) {
          const x = ((F * 22 + i * 240) % 1200) - 100;
          ctx.fillStyle = rgba(SONNET, 0.35 * l.k);
          ctx.fillRect(x, 150 + i * 60, 90, 6);
        }
      } else if (rel <= 5) {
        const words: [string, "plan" | "build" | "check" | "ship", string, string][] = [
          ["PLAN", "plan", OPUS, IVORY],
          ["BUILD", "build", SONNET, IVORY],
          ["CHECK", "check", BOTH, IVORY],
          ["SHIP", "ship", IVORY, INK],
        ];
        const l = life(F, frameOf(b0 + 4) - 1, frameOf(b0 + 6));
        words.forEach(([wd, ic, bg, fg], i) => {
          const f0 = frameOf(b0 + 4) + CHANT[i];
          if (F < f0 - 1) return;
          const t = sp(F, f0 - 1, 3.2, 0.5),
            k = lerp(1.9, 1, t) * l.out,
            rot = lerp(i % 2 ? 0.3 : -0.3, (i % 2 ? 1 : -1) * 0.04, t);
          const gx = tall ? 500 + ((i % 2) - 0.5) * 270 : 500 + (i - 1.5) * 250,
            gy = tall ? 40 + Math.floor(i / 2) * 250 : v === 1 ? 190 : 140,
            drop = v === 3 ? (1 - sp(F, f0 - 4, 2.4, 0.5)) * -130 : 0,
            flip = v === 2 ? Math.abs(Math.cos((1 - clamp(sp(F, f0 - 3, 2.6, 0.7))) * Math.PI * 0.5)) : 1;
          at2(
            ctx,
            gx,
            gy + drop,
            (v === 1 ? k : l.out) * (tall ? 0.98 : 1.08),
            v === 1 ? rot : (i % 2 ? 1 : -1) * 0.04,
            () => {
              ctx.scale(flip, 1);
              ctx.globalAlpha *= v === 1 ? clamp(t * 3) : v === 3 ? clamp(sp(F, f0 - 4, 2.4, 0.5) * 3) : 1;
              card(ctx, -106, -120, 212, 240, bg, bg, 0, 26);
              at2(ctx, 0, -34, 1, 0, () => icon(ctx, ic, fg, prog(F, f0, f0 + 18)));
              T(ctx, wd, 0, 86, 46, fg);
            },
          );
        });
      } else if (rel === 7) {
        const f0 = frameOf(b0 + 7, 1);
        rays(
          ctx,
          500,
          360,
          900,
          20,
          F * 0.02,
          (i) => (i % 2 ? OPUS : SONNET),
          0.35 * sp(F, f0 - 2) * (1 - prog(F, frameOf(b0 + 8) - 6, frameOf(b0 + 8))),
        );
      }
    });
    if (v === 3) rain(ctx, F, 60, 77);
  };
  const chorusFront = (ctx: Ctx, F: number, b0: number, v: 1 | 2 | 3) => {
    const f0 = frameOf(b0 + 7, 1);
    confetti(ctx, F, f0, cx, stage.floor - 200 * u, 90, b0 * 7, 1);
    confetti(ctx, F, frameOf(b0), cx - 300 * u, stage.floor - 120 * u, 40, b0 * 3, 0.6);
    confetti(ctx, F, frameOf(b0), cx + 300 * u, stage.floor - 120 * u, 40, b0 * 5, 0.6);
    if (v === 2) {
      // the crowd: little silhouettes bobbing in front of the stage, arms up on the downbeats
      const n = tall ? 7 : 11,
        gw = W / n;
      for (let i = 0; i < n; i++) {
        const g = basePose(
          i % 2 ? "S" : "O",
          gw * (i + 0.5),
          stage.floor + (tall ? 330 : 185) * u,
          (tall ? 11 : 12) * u,
        );
        bop(g, F + i * 4, 1);
        g.tint = mix(INK, IVORY, 0.2);
        g.armL = g.armR = Math.floor((F + i * 4) / BEAT) % 2 ? "high" : "up";
        critter(ctx, g, u);
      }
    }
  };

  // ---- the advisor: the call, the whole thread, the sealed envelope, the code that can't read it
  const cloud = (ctx: Ctx, x: number, y: number, s: number) => {
    ctx.fillStyle = C.surface;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4 * u;
    const puffs: [number, number, number][] = [
      [-130, 8, 52],
      [-60, -16, 70],
      [30, -22, 78],
      [115, 0, 56],
      [0, 22, 60],
    ];
    ctx.beginPath();
    for (const [px0, py0, r] of puffs) {
      ctx.moveTo(x + (px0 + r) * s, y + py0 * s);
      ctx.arc(x + px0 * s, y + py0 * s, r * s, 0, TAU);
    }
    ctx.stroke();
    ctx.fill();
  };
  const beamPath = (F: number) => {
    const o = spot("O", F),
      s = spot("S", F),
      a: [number, number] = [s.x - 20 * u, s.y - s.px * 10],
      b: [number, number] = [o.x + 150 * u, o.y + 10 * u],
      c: [number, number] = [(a[0] + b[0]) / 2 + 60 * u, Math.min(a[1], b[1]) - 60 * u];
    const at = (t: number): [number, number] => [
      (1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0],
      (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1],
    ];
    return { a, b, c, at };
  };
  const envelope = (ctx: Ctx, x: number, y: number, k: number, rot: number, open: number) => {
    const rise = tall ? 56 : 90; // how far the letter slides out (the vertical has a code window above it)
    at2(ctx, x, y, k, rot, () => {
      card(ctx, -80, -52, 160, 104, C.surface, INK, 4 * u, 8);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-80, -52);
      ctx.lineTo(0, -52 + 60 * (1 - open * 2));
      ctx.lineTo(80, -52);
      ctx.stroke();
      if (open > 0.3) {
        const up = ease.outCubic(clamp((open - 0.3) / 0.7));
        card(ctx, -60, -40 - up * rise, 120, 80, IVORY, INK, 3, 6);
        for (let i = 0; i < 3; i++) bar(ctx, -44, -20 - up * rise + i * 20, 70 - i * 14, 8, OPUS);
      }
      if (open < 0.4) {
        ctx.fillStyle = OPUS;
        ctx.beginPath();
        ctx.arc(0, 4, 24, 0, TAU);
        ctx.fill();
        // a small lock on the seal
        ctx.fillStyle = IVORY;
        ctx.fillRect(-9, 0, 18, 14);
        ctx.strokeStyle = IVORY;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(0, 0, 6, Math.PI, 0);
        ctx.stroke();
      }
    });
  };
  const advisorBack = (ctx: Ctx, F: number) => {
    ctx.fillStyle = groundAt(F);
    ctx.fillRect(0, 0, W, H);
    dots(ctx, F, INK, 0.06);
    const o = spot("O", F),
      s = spot("S", F),
      bm = beamPath(F);
    // the desk
    ctx.fillStyle = INK;
    ctx.fillRect(s.x - (tall ? 440 : 560) * u, s.y + 2 * u, (tall ? 600 : 760) * u, 10 * u);
    // the advisor button
    const bx = s.x - (tall ? 400 : 470) * u,
      by = s.y - 26 * u,
      press = F >= CALL && F < CALL + 8 ? 8 * u : 0;
    ctx.fillStyle = mix(INK, IVORY, 0.2);
    rr(ctx, bx - 60 * u, by + 6 * u, 120 * u, 22 * u, 8 * u);
    ctx.fill();
    ctx.fillStyle = OPUS;
    ctx.beginPath();
    ctx.ellipse(bx, by + press, 46 * u, 18 * u, 0, 0, TAU);
    ctx.fill();
    ctx.fillRect(bx - 46 * u, by + press, 92 * u, 12 * u - press);
    mono(ctx, "advisor", bx, by - 34 * u, 26 * u, INK);
    if (F >= CALL && F < CALL + 24) {
      ctx.strokeStyle = rgba(OPUS, 1 - (F - CALL) / 24);
      ctx.lineWidth = 4 * u;
      ctx.beginPath();
      ctx.ellipse(bx, by, (46 + (F - CALL) * 5) * u, (18 + (F - CALL) * 2) * u, 0, 0, TAU);
      ctx.stroke();
    }
    // the beam: drawn on by the call, dotted, and it stays for the rest of the section
    if (F >= CALL) {
      const p = ease.outCubic(prog(F, CALL, CALL + 24));
      ctx.fillStyle = rgba(INK, 0.5);
      for (let i = 0; i <= 40 * p; i++) {
        const [x, y] = bm.at(i / 40);
        ctx.beginPath();
        ctx.arc(x, y, 4 * u, 0, TAU);
        ctx.fill();
      }
      if (F < CALL + 30) {
        const [x, y] = bm.at(clamp((F - CALL) / 30));
        ctx.fillStyle = SONNET;
        ctx.beginPath();
        ctx.arc(x, y, 14 * u, 0, TAU);
        ctx.fill();
      }
    }
    // the cloud Opus sits on
    cloud(ctx, o.x, o.y + 26 * u + Math.sin((F / (BEAT * 4)) * TAU) * 6 * u, (tall ? 1.15 : 1.2) * u);
    // the whole thread, scrolling fast past the reader
    const l2 = life(F, frameOf(31), frameOf(33));
    if (l2.on) {
      const tx = tall ? cx + 40 * u : cx - 330 * u,
        tw = tall ? 440 * u : 400 * u,
        ty = tall ? 760 * u : 380 * u,
        th = tall ? 400 * u : 470 * u;
      ctx.save();
      ctx.globalAlpha *= l2.k;
      card(ctx, tx, ty, tw, th, C.surface, INK, 4 * u, 20 * u);
      ctx.beginPath();
      rr(ctx, tx + 4 * u, ty + 4 * u, tw - 8 * u, th - 8 * u, 16 * u);
      ctx.clip();
      const scroll = (F - frameOf(31)) * 11 * u;
      for (let i = 0; i < 60; i++) {
        const left = hash(i, 1) > 0.45,
          bh = (36 + Math.floor(hash(i, 2) * 3) * 22) * u,
          y = ty + th - 20 * u + i * -84 * u + scroll;
        if (y < ty - 120 * u || y > ty + th + 40 * u) continue;
        const bw = tw * (0.45 + hash(i, 3) * 0.35);
        ctx.fillStyle = left ? mix(IVORY, INK, 0.08) : mix(IVORY, SONNET, 0.3);
        rr(ctx, left ? tx + 20 * u : tx + tw - 20 * u - bw, y - bh, bw, bh, 14 * u);
        ctx.fill();
      }
      ctx.restore();
      ctx.save();
      ctx.globalAlpha *= l2.k;
      mono(ctx, "the whole thread", tx + tw / 2, ty - 18 * u, 32 * u, INK);
      ctx.restore();
    }
    // the code window that can't read the advice
    const l4 = life(F, frameOf(35) - 2, frameOf(37));
    if (l4.on) {
      const wx = tall ? cx - 40 * u : cx - 380 * u,
        ww = tall ? 490 * u : 640 * u,
        wy = tall ? 704 * u : 390 * u,
        wh = tall ? 200 * u : 250 * u,
        fs = (tall ? 23 : 26) * u;
      at2(ctx, wx + ww / 2, wy + wh / 2, l4.k, -0.015, () => {
        card(ctx, -ww / 2, -wh / 2, ww, wh, INK, INK, 0, 18 * u);
        [0, 1, 2].forEach((i) => {
          ctx.fillStyle = [OPUS, C.muted, BOTH][i];
          ctx.beginPath();
          ctx.arc(-ww / 2 + (26 + i * 26) * u, -wh / 2 + 26 * u, 8 * u, 0, TAU);
          ctx.fill();
        });
        mono(ctx, "your app", ww / 2 - 20 * u, -wh / 2 + 34 * u, 22 * u, C.muted, "right");
        const scr = [...Array(tall ? 12 : 16)]
          .map(
            (_, i) =>
              "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"[
                Math.floor(hash(i, Math.floor(F / 2)) * 64)
              ],
          )
          .join("");
        const lines = tall
          ? ["type:", '  "advisor_redacted_result"', "encrypted_content:", `  "${scr}…"`]
          : ['type: "advisor_redacted_result"', `encrypted_content: "${scr}…"`, "stop_reason: …"];
        lines.forEach((ln, i) =>
          mono(
            ctx,
            ln,
            -ww / 2 + 26 * u,
            -wh / 2 + ((tall ? 74 : 86) + i * (tall ? 34 : 50)) * u,
            fs,
            i % 2 && tall ? OPUS : IVORY,
            "left",
          ),
        );
      });
      const q = sp(F, frameOf(35, 2), 3, 0.45);
      if (q > 0 && F < OPEN) T(ctx, "?", wx + ww - 10 * u, wy + 10 * u, 140 * u * q, OPUS_ON_LIGHT, F_.italic, 400);
    }
  };
  const advisorFront = (ctx: Ctx, F: number) => {
    const s = spot("S", F),
      o = spot("O", F),
      bm = beamPath(F);
    // the laptop, in front of the typist
    const lx = s.x - (tall ? 250 : 260) * u;
    ctx.fillStyle = mix(INK, IVORY, 0.12);
    ctx.beginPath();
    ctx.moveTo(lx - 80 * u, s.y);
    ctx.lineTo(lx + 60 * u, s.y);
    ctx.lineTo(lx + 90 * u, s.y - 120 * u);
    ctx.lineTo(lx - 50 * u, s.y - 120 * u);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = SONNET;
    ctx.beginPath();
    ctx.arc(lx + 20 * u, s.y - 60 * u, 12 * u, 0, TAU);
    ctx.fill();
    // the envelope: from Opus down the beam to Sonnet, sealed; opened on "I can"
    if (F >= SEND - 4) {
      const t = ease.inOutCubic(prog(F, SEND, SEAL)),
        [x, y] = F < SEAL ? bm.at(1 - t) : [s.x + 30 * u, s.y - s.px * 11 - (tall ? 120 : 70) * u],
        k = (F < SEAL ? lerp(0.8, 1.2, t) : 1.2 + 0.15 * Math.exp(-(F - SEAL) / 5)) * u * (tall ? 1 : 1.1),
        open = ease.outCubic(prog(F, OPEN, OPEN + 14)),
        fade = 1 - prog(F, frameOf(37) - 6, frameOf(37));
      if (F < SEND) {
        ctx.save();
        ctx.globalAlpha *= clamp((F - SEND + 4) / 4);
        envelope(ctx, o.x + 150 * u, o.y - 20 * u, 0.8 * u, 0, 0);
        ctx.restore();
      } else {
        ctx.save();
        ctx.globalAlpha *= fade;
        envelope(ctx, x, y, k, F < SEAL ? (1 - t) * 0.8 : 0.05 * Math.sin(F * 0.3), open);
        ctx.restore();
      }
      if (F >= SEAL && F < frameOf(36)) {
        const k2 = sp(F, SEAL, 3, 0.6);
        ctx.save();
        ctx.globalAlpha *= k2;
        const lab = "advisor_redacted_result",
          o2 = { size: 24 * u, family: F_.mono, weight: 500 },
          w = measure(ctx, lab, o2) + 28 * u,
          ly = tall ? s.y - 190 * u : s.y - s.px * 11 - 170 * u,
          lx2 = clamp(tall ? s.x - 250 * u : s.x, S.x + w / 2, W - S.x - w / 2);
        ctx.fillStyle = INK;
        rr(ctx, lx2 - w / 2, ly - 30 * u, w, 44 * u, 22 * u);
        ctx.fill();
        text(ctx, lab, lx2, ly, { ...o2, color: IVORY, align: "center" });
        ctx.restore();
      }
    }
    // the lightbulb
    if (F >= BULB - 2) {
      const k = sp(F, BULB - 2, 3, 0.45),
        bx = s.x - (tall ? 150 : 190) * u,
        by = s.y - s.px * 12 - 40 * u;
      at2(ctx, bx, by, k * u * (tall ? 0.8 : 1), 0, () => {
        rays(ctx, 0, 0, tall ? 90 : 120, 10, F * 0.03, () => OPUS, 0.45);
        ctx.fillStyle = "#fff6d8";
        ctx.strokeStyle = INK;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(0, -10, 40, 0, TAU);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = INK;
        ctx.fillRect(-18, 30, 36, 24);
      });
    }
  };

  // ---- the bridge: one fact card a bar
  const factCard = (ctx: Ctx, F: number, i: number) => {
    const f0 = FACT_SLAMS[i],
      end = i < 3 ? FACT_SLAMS[i + 1] : frameOf(49),
      t = sp(F, f0 - 3, 3, 0.55),
      out = prog(F, end - 5, end),
      k = lerp(1.35, 1, t) * (1 - ease.inCubic(out)),
      rot = (i % 2 ? 1 : -1) * 0.025 + (1 - t) * 0.2 * (i % 2 ? 1 : -1);
    at2(ctx, 500, 260 + out * -60, k, rot, () => {
      ctx.globalAlpha *= clamp(t * 3);
      card(ctx, -380, -235, 760, 500, C.surface, INK, 5, 30);
      const lf = F - f0;
      if (i === 0) {
        T(ctx, "1M", 0, 70, 260, SONNET_ON_LIGHT, F_.sans, 800, "center", -0.05);
        T(ctx, "tokens of context", 0, 150, 48, INK, F_.sans, 600);
        mono(ctx, "Sonnet 5.5 · native", 0, 202, 30, MUTED);
      } else if (i === 1) {
        T(ctx, "EFFORT", 0, -168, 52, INK);
        mono(ctx, "Sonnet 5.5", 0, 222, 32, MUTED);
        const levels = ["low", "medium", "high", "xhigh", "max"],
          lvl = clamp(Math.floor(lf / (BEAT * 0.8)), 0, 4),
          prevA = Math.PI + (Math.max(0, lvl - 1) / 4) * Math.PI,
          ang = lerp(prevA, Math.PI + (lvl / 4) * Math.PI, sp(F, f0 + lvl * BEAT * 0.8, 3, 0.5));
        ctx.strokeStyle = rgba(INK, 0.2);
        ctx.lineWidth = 26;
        ctx.beginPath();
        ctx.arc(0, 150, 200, Math.PI, 0);
        ctx.stroke();
        ctx.strokeStyle = SONNET;
        ctx.beginPath();
        ctx.arc(0, 150, 200, Math.PI, ang);
        ctx.stroke();
        levels.forEach((l, j) => {
          const a = Math.PI + (j / 4) * Math.PI,
            r = 262;
          mono(ctx, l, Math.cos(a) * r, 150 + Math.sin(a) * r + 10, 28, j === lvl ? SONNET_ON_LIGHT : MUTED);
        });
        ctx.strokeStyle = INK;
        ctx.lineWidth = 10;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(0, 150);
        ctx.lineTo(Math.cos(ang) * 170, 150 + Math.sin(ang) * 170);
        ctx.stroke();
        ctx.fillStyle = INK;
        ctx.beginPath();
        ctx.arc(0, 150, 18, 0, TAU);
        ctx.fill();
      } else if (i === 2) {
        mono(ctx, "per million tokens", 0, 236, 32, MUTED);
        const tag = (x: number, name: string, col: string, inP: string, outP: string) => {
          card(ctx, x - 165, -140, 330, 330, IVORY, INK, 4, 22);
          ctx.fillStyle = col;
          rr(ctx, x - 165, -140, 330, 78, 22);
          ctx.fill();
          ctx.fillRect(x - 165, -90, 330, 28);
          T(ctx, name, x, -86, 38, IVORY);
          T(ctx, inP, x, 20, 64, INK);
          mono(ctx, "input", x, 58, 26, MUTED);
          T(ctx, outP, x, 138, 64, INK);
          mono(ctx, "output", x, 176, 26, MUTED);
        };
        tag(-185, "SONNET 5.5", SONNET_ON_LIGHT, "$2", "$10");
        tag(185, "OPUS 5.5", OPUS_ON_LIGHT, "$4", "$20");
        const st = sp(F, f0 + 2 * BEAT - 2, 3.4, 0.5);
        if (st > 0)
          at2(ctx, -185, -186, lerp(2.2, 1, st) * 0.46, -0.1, () => {
            ctx.globalAlpha *= clamp(st * 3);
            ctx.fillStyle = C.surface;
            rr(ctx, -150, -64, 300, 128, 18);
            ctx.fill();
            ctx.strokeStyle = BOTH_ON_LIGHT;
            ctx.lineWidth = 10;
            rr(ctx, -150, -64, 300, 128, 18);
            ctx.stroke();
            T(ctx, "HALF", 0, 34, 96, BOTH_ON_LIGHT);
          });
      } else {
        T(ctx, "MOST TOKENS", 0, -150, 56, INK);
        const n = 20,
          cw = 30,
          gap = 3.5,
          x0 = -((n * cw + (n - 1) * gap) / 2),
          adv = new Set([4, 13]);
        for (let j = 0; j < n; j++) {
          const on = lf >= (j * BEAT * 3) / n,
            pk = on ? sp(F, f0 + (j * BEAT * 3) / n, 4, 0.5) : 0;
          if (!on) continue;
          at2(ctx, x0 + j * (cw + gap) + cw / 2, -30, pk, 0, () => {
            ctx.fillStyle = adv.has(j) ? OPUS : SONNET;
            ctx.fillRect(-cw / 2, -40, cw, 80);
          });
        }
        ctx.fillStyle = SONNET;
        ctx.fillRect(-300, 70, 28, 28);
        T(ctx, "Sonnet 5.5 · executor rates", -258, 95, 32, INK, F_.sans, 600, "left");
        ctx.fillStyle = OPUS;
        ctx.fillRect(-300, 124, 28, 28);
        T(ctx, "Opus 5.5 · advisor rates", -258, 149, 32, INK, F_.sans, 600, "left");
        mono(ctx, "illustrative", 0, 210, 30, MUTED);
      }
    });
  };
  const bridgeBack = (ctx: Ctx, F: number) => {
    ctx.fillStyle = groundAt(F);
    ctx.fillRect(0, 0, W, H);
    dots(ctx, F, INK, 0.06);
    const i = clamp(barOf(F) - 45, 0, 3);
    const box: Box = tall
      ? { x: 40 * u, y: 640 * u, w: 1000 * u, h: 480 * u }
      : { x: 460 * u, y: 340 * u, w: 1000 * u, h: 520 * u };
    inBox(ctx, box, () => factCard(ctx, F, i));
  };

  // ---- outro: "five point five", the high five, the end card
  const outroBack = (ctx: Ctx, F: number) => {
    ctx.fillStyle = F >= HIGH5 ? mix(IVORY, BOTH, 0.2) : IVORY;
    ctx.fillRect(0, 0, W, H);
    dots(ctx, F, INK, 0.06);
    const k =
      sp(F, frameOf(57) - 2, 2.4, 0.5) *
      (1 + 0.05 * Math.exp(-beatPh(F) * 5)) *
      (1 - ease.inCubic(prog(F, HIGH5 - 6, HIGH5)));
    at2(ctx, cx, stage.floor - (tall ? 440 : 470) * u, k, 0, () =>
      T(ctx, "5.5", 0, 110 * u, 300 * u, mix(PAPER, C.muted, 0.55), F_.sans, 800, "center", -0.05),
    );
    if (F >= HIGH5 - 4)
      rays(
        ctx,
        cx,
        stage.floor - 200 * u,
        Math.max(W, H),
        16,
        F * 0.01,
        (i) => (i % 2 ? OPUS : SONNET),
        0.28 * sp(F, HIGH5 - 4) * (1 - 0.55 * prog(F, HIGH5 + 20, HIGH5 + 50)),
      );
  };
  const endCard = (ctx: Ctx, F: number) => {
    if (F < HIGH5) return;
    const lines1 = tall ? ["Opus 5.5 advises.", "Sonnet 5.5 executes."] : ["Opus 5.5 advises. Sonnet 5.5 executes."];
    const small = tall
      ? [
          "fan-made · sung and drawn in code",
          "not affiliated with Anthropic",
          "facts: claude.dev · platform.claude.com",
        ]
      : [
          "fan-made · sung and drawn in code · not affiliated with Anthropic",
          "facts: claude.dev/blog · platform.claude.com/docs",
        ];
    const hedge = tall
      ? ["with the advisor tool, Opus 5.5", "can advise a Sonnet 5.5 executor"]
      : ["with the advisor tool, Opus 5.5 can advise a Sonnet 5.5 executor"];
    const big = (tall ? 76 : 76) * u,
      y0 = tall ? lyr.top + 90 * u : lyr.top + 50 * u;
    ctx.save();
    const slam = 1 + 0.35 * Math.exp(-(F - HIGH5) / 3.5);
    ctx.translate(cx, y0);
    ctx.scale(slam, slam);
    ctx.translate(-cx, -y0);
    lines1.forEach((ln, i) => {
      const parts = ln.split(/(Opus 5\.5|Sonnet 5\.5)/).filter(Boolean),
        o = { size: big, family: F_.sans, weight: 800, track: -0.03 },
        w = measure(ctx, ln, o);
      let x = cx - w / 2;
      const y = y0 + i * big * 1.08;
      for (const p of parts) {
        const col = p === "Opus 5.5" ? OPUS_ON_LIGHT : p === "Sonnet 5.5" ? SONNET_ON_LIGHT : INK;
        text(ctx, p, x, y, { ...o, color: col });
        x += measure(ctx, p, o);
      }
    });
    const ys = y0 + lines1.length * big * 1.08 - (tall ? 4 : 14) * u;
    hedge.forEach((s, i) => mono(ctx, s, cx, ys + i * 50 * u, 40 * u, INK));
    ctx.restore();
    // the credits land on beat 3 of the bar
    const c0 = frameOf(59, 2),
      kc = sp(F, c0, 3, 0.55);
    if (kc <= 0) return;
    const yc = ys + hedge.length * 50 * u + 10 * u;
    at2(ctx, cx, yc, lerp(1.25, 1, kc), 0, () => {
      ctx.globalAlpha *= clamp(kc * 3);
      const o = { size: 30 * u, family: F_.mono, weight: 500 },
        pw = Math.max(...small.map((t) => measure(ctx, t, o))) + 56 * u,
        ph = small.length * 42 * u + 24 * u;
      ctx.fillStyle = PAPER;
      rr(ctx, -pw / 2, -34 * u, pw, ph, 18 * u);
      ctx.fill();
      small.forEach((s, i) => mono(ctx, s, 0, i * 42 * u, 30 * u, MUTED));
    });
  };

  // ================================================================ THE LYRICS (karaoke, coloured by singer)
  const sets = new Map<number, SetLine>();
  const setLine = (ctx: Ctx, li: number): SetLine => {
    const hit = sets.get(li);
    if (hit) return hit;
    const st = styleOf(li),
      ks = LINES[li];
    let size = st.max * u,
      res: SetLine | null = null,
      maxRows = tall ? 2 : 1;
    for (;;) {
      const o = { size, family: st.family, weight: st.weight, track: st.track };
      const disp = (t: string) => (st.upper ? t.toUpperCase() : t);
      const spaceW = measure(ctx, " ", o);
      // words: syllables until one ends in a space
      const words: { ks: number[]; w: number[]; tw: number }[] = [];
      let cur: { ks: number[]; w: number[]; tw: number } = { ks: [], w: [], tw: 0 };
      for (const k of ks) {
        const t = disp(SYLS[k].text),
          w = measure(ctx, t.trimEnd(), o);
        cur.ks.push(k);
        cur.w.push(w);
        cur.tw += w;
        if (t.endsWith(" ")) {
          words.push(cur);
          cur = { ks: [], w: [], tw: 0 };
        }
      }
      if (cur.ks.length) words.push(cur);
      const rows: (typeof words)[] = [[]],
        rowW = [0];
      for (const wd of words) {
        const r = rows.length - 1,
          add = (rows[r].length ? spaceW : 0) + wd.tw;
        if (rows[r].length && rowW[r] + add > lyr.maxW) {
          rows.push([wd]);
          rowW.push(wd.tw);
        } else {
          rows[r].push(wd);
          rowW[r] += add;
        }
      }
      if (rows.length <= maxRows || size <= 44 * u) {
        const pieces: Piece[] = [];
        rows.forEach((r, ri) => {
          let x = -rowW[ri] / 2;
          r.forEach((wd, wi) => {
            if (wi) x += spaceW;
            wd.ks.forEach((k, j) => {
              pieces.push({ k, t: disp(SYLS[k].text).trimEnd(), x, w: wd.w[j], row: ri });
              x += wd.w[j];
            });
          });
        });
        res = { pieces, rowW, size, lead: size * (st.family === F_.serif ? 1.02 : 1.08), st };
        break;
      }
      size -= 4 * u;
      if (maxRows < lyr.rows && size < st.max * u * 0.72) {
        maxRows = lyr.rows;
        size = st.max * u;
      }
    }
    sets.set(li, res);
    return res;
  };
  const LCOUNT = LINES.length;
  const lineWindow = (li: number) => {
    const a = LINE_START[li] - 4,
      nextA = li + 1 < LCOUNT ? LINE_START[li + 1] - 4 : Infinity,
      b = Math.min(nextA, LINE_END[li] + 36, li === LCOUNT - 1 ? HIGH5 - 2 : Infinity);
    return [a, b];
  };
  const drawLine = (ctx: Ctx, F: number, li: number) => {
    const [a, b] = lineWindow(li);
    if (F < a || F >= b) return;
    const L2 = setLine(ctx, li),
      inn = sp(F, a, 2.8, 0.7),
      out = prog(F, b - 7, b),
      dark = darkAt(F),
      n = L2.rowW.length,
      mid = (lyr.top + lyr.bot) / 2,
      y0 = mid - (n * L2.lead) / 2 + L2.size * 0.78 + (1 - inn) * 36 * u - out * 30 * u;
    const o = { size: L2.size, family: L2.st.family, weight: L2.st.weight, track: L2.st.track };
    ctx.save();
    ctx.globalAlpha *= clamp(inn * 1.4) * (1 - out);
    for (const pc of L2.pieces) {
      const s = SYLS[pc.k],
        state = F < s.s ? 0 : F < s.e ? 1 : 2,
        col = li === 0 ? IVORY : whoColor(s.who, dark),
        x = cx + pc.x,
        y = y0 + pc.row * L2.lead;
      if (state === 0) {
        text(ctx, pc.t, x, y, { ...o, color: col, alpha: 0.26 });
        continue;
      }
      const pop = state === 1 ? 1 + (L2.st.upper ? 0.05 : 0.12) * Math.exp(-(F - s.s) / 3) : 1,
        lift = state === 1 ? -6 * u * Math.exp(-(F - s.s) / 5) : 0;
      ctx.save();
      ctx.translate(x + pc.w / 2, y - L2.size * 0.32 + lift);
      ctx.scale(pop, pop);
      text(ctx, pc.t, -pc.w / 2, L2.size * 0.32, { ...o, color: col });
      if (state === 1) {
        ctx.fillStyle = col;
        const p = clamp((F - s.s) / Math.max(1, s.e - s.s));
        ctx.fillRect(-pc.w / 2, L2.size * 0.32 + 12 * u, pc.w * p, 6 * u);
      }
      ctx.restore();
    }
    ctx.restore();
  };

  // ---------------------------------------------------------------- the fact strip and the HUD
  const factStrip = (ctx: Ctx, F: number) => {
    const f = FACTS.find(([a, b]) => F >= a && F < b);
    if (!f || (tall && darkAt(F))) return;
    const [a, b, s] = f,
      k = sp(F, a, 2.6, 0.7) * (1 - prog(F, b - 6, b)),
      dark = darkAt(F),
      o = { size: 44 * u, family: F_.mono, weight: 500 };
    let lines = [s];
    if (measure(ctx, s, o) > W - 2 * S.x - 40 * u) {
      // wrap at the middle space for the vertical
      const words = s.split(" "),
        half = Math.ceil(words.length / 2);
      lines = [words.slice(0, half).join(" "), words.slice(half).join(" ")];
    }
    const lh = 56 * u,
      w = Math.max(...lines.map((l) => measure(ctx, l, o))) + 40 * u,
      h = lines.length * lh + 16 * u,
      y = factY - h;
    ctx.save();
    ctx.globalAlpha *= clamp(k * 1.5);
    ctx.translate(0, (1 - k) * 16 * u);
    ctx.fillStyle = dark ? rgba(IVORY, 0.1) : PAPER;
    rr(ctx, cx - w / 2, y, w, h, 16 * u);
    ctx.fill();
    lines.forEach((l, i) =>
      text(ctx, l, cx, y + 8 * u + (i + 0.75) * lh, { ...o, color: dark ? IVORY : INK, align: "center" }),
    );
    ctx.restore();
  };
  const SECTION: [number, string][] = [
    [1, "INTRO"],
    [5, "VERSE 1 · OPUS"],
    [13, "VERSE 2 · SONNET"],
    [21, "CHORUS"],
    [29, "THE ADVISOR"],
    [37, "CHORUS"],
    [45, "BRIDGE"],
    [49, "CHORUS · UP A STEP"],
    [57, "OUTRO"],
  ];
  const hud = (ctx: Ctx, F: number) => {
    const dark = darkAt(F),
      col = dark ? rgba(IVORY, 0.55) : MUTED,
      y = S.top + (tall ? 12 : 4) * u,
      bar = barOf(F),
      sec = [...SECTION].reverse().find(([b]) => bar >= b)![1];
    mono(ctx, sec, S.x, y, 22 * u, col, "left");
    mono(
      ctx,
      `BAR ${String(bar).padStart(2, "0")} · BEAT ${Math.floor((F % BAR) / BEAT) + 1}`,
      W - S.x,
      y,
      22 * u,
      col,
      "right",
    );
  };

  // ================================================================ THE FRAME
  const paint = (ctx: Ctx, env: Env, F: number) => {
    F = clamp(F, 0, N - 1);
    ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
    const bar = barOf(F),
      part = partOf(bar);
    // grounds and props behind the cast
    const back = () => {
      if (part === "intro") introBack(ctx, F);
      else if (part === "verse" || part === "verse2") {
        ctx.fillStyle = groundAt(F);
        ctx.fillRect(0, 0, W, H);
        dots(ctx, F, INK, 0.06);
        if (part === "verse") verse1Back(ctx, F);
        else verse2Back(ctx, F);
      } else if (part === "chorus") chorusBack(ctx, F, bar >= 37 ? 37 : 21, bar >= 37 ? 2 : 1);
      else if (part === "final") chorusBack(ctx, F, 49, 3);
      else if (part === "advisor") advisorBack(ctx, F);
      else if (part === "bridge") bridgeBack(ctx, F);
      else outroBack(ctx, F);
    };
    // the camera: a slow push-in through each section, a kick on every downbeat of the big ones
    const s0 = SECTION.filter(([b]) => bar >= b).pop()![0],
      s1 = SECTION.find(([b]) => b > bar)?.[0] ?? BARS + 1,
      k = (F - frameOf(s0)) / (frameOf(s1) - frameOf(s0)),
      big = part === "chorus" || part === "final",
      cut = lineCutAt(F),
      kick = big
        ? 0.012 * Math.exp(-beatPh(F) * 6)
        : cut >= frameOf(5) && part !== "outro"
          ? 0.04 * Math.exp(-(F - cut) / 5)
          : part === "outro" && bar <= 58
            ? 0.035 * Math.exp(-((F % (2 * BEAT)) / 5))
            : 0,
      zoom = 1 + 0.03 * k + kick;
    // the ground fills the frame unzoomed; the camera moves the stage
    ctx.save();
    back();
    ctx.restore();
    ctx.save();
    ctx.translate(cx, stage.floor);
    ctx.scale(zoom, zoom);
    ctx.translate(-cx + Math.sin(F * 0.013) * 6 * u, -stage.floor);
    const o = pose("O", F),
      s = pose("S", F);
    // the one who is singing (or the hero) stands in front
    const oFront = MOUTH.O[F] > MOUTH.S[F] || (part === "verse" && MOUTH.S[F] === 0);
    if (oFront) {
      critter(ctx, s, u);
      critter(ctx, o, u);
    } else {
      critter(ctx, o, u);
      critter(ctx, s, u);
    }
    if (part === "advisor") advisorFront(ctx, F);
    if (big) chorusFront(ctx, F, bar >= 49 ? 49 : bar >= 37 ? 37 : 21, bar >= 49 ? 3 : bar >= 37 ? 2 : 1);
    if (part === "outro") confetti(ctx, F, HIGH5, cx, stage.floor - 240 * u, 120, 59, 1.1);
    if (part === "intro") {
      confetti(ctx, F, LAND_O, o.x, stage.floor, 18, 11, 0.5);
      confetti(ctx, F, LAND_S, s.x, stage.floor, 18, 12, 0.5);
    }
    ctx.restore();
    // words on top: the title, the lyric, the end card
    introText(ctx, F);
    for (let li = 0; li < LCOUNT; li++) drawLine(ctx, F, li);
    endCard(ctx, F);
    factStrip(ctx, F);
    hud(ctx, F);
    // flashes on the two biggest hits: ivory over the dark key change, green over the ivory high five
    for (const [f0, a, col] of [
      [DROP, 0.5, IVORY],
      [HIGH5, 0.8, BOTH],
    ] as [number, number, string][]) {
      const t = F - f0;
      if (t >= 0 && t < 8) {
        ctx.fillStyle = rgba(col, a * (1 - t / 8));
        ctx.fillRect(0, 0, W, H);
      }
    }
  };

  const NAMES: [number, string][] = [
    [1, "intro"],
    [5, "verse1"],
    [13, "verse2"],
    [21, "chorus1"],
    [29, "advisor"],
    [37, "chorus2"],
    [45, "bridge"],
    [49, "chorus3"],
    [57, "outro"],
  ];
  const shots: Shot[] = NAMES.map(([b, name], i) => {
    const start = frameOf(b),
      end = i + 1 < NAMES.length ? frameOf(NAMES[i + 1][0]) : N;
    return { id: name, start, end, draw: (ctx, local, env) => paint(ctx, env, start + local) };
  });
  return {
    meta: { title: id, W, H, fps: FPS, bpm: BPM, durationFrames: N, raster: "cpu" },
    assets: { images: {}, fonts: P.assets },
    shots,
    audio,
  };
}

export const twoPartHarmony = make("landscape", "twoPartHarmony");
export const twoPartHarmonyVertical = make("vertical", "twoPartHarmonyVertical");
