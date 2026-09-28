// STUDY 25 · FIVE POINT FIVE (64 s, 30 fps, 90 bpm). A lyric video for a short song about Opus 5.5 making this
// studio, where the song is made in code too. Ink-black ground, cream type, one clay accent; every lyric line gets
// its own visual idea, cut on the bar, and the sung syllable lights as it is sung.
// Brief: series/studies/briefs/five-point-five.json · prompt: series/studies/prompts/five-point-five.prompt.md
//
// THE SONG IS DATA. One syllable table (SONG) drives three things: the formant-synthesized voice in audio(sr), the
// lit syllables in the picture, and the HUD meter. Picture and sound read the same rows, so they cannot drift.
// The whole film is one continuous paint(F) of a frame; the shots only name the sections on the bar grid.
import PACK from "../../../brand/packs/studio/pack.json";
import type { Ctx, Env, Layer } from "../core";
import { rng } from "../core";
import type { Film, Shot } from "../film";
import { clamp, ease, lerp, prog, spring } from "../kit/motion";
import { usePack } from "../kit/pack";
import { layout, type Size } from "../kit/sizes";
import { measure, text } from "../kit/type";
import { rr } from "../kit/ui";

const P = usePack(PACK),
  C = P.palette("clay"),
  F_ = P.face;
const FPS = 30,
  BPM = 90,
  N = 1920,
  BEAT = 20, // frames per beat
  BAR = 80; // frames per bar (a picture cut sits on every bar line)
const TAU = Math.PI * 2;

// ================================================================== THE SONG
// [bar (1-indexed), beat in bar, length in beats, midi, vowel, "onset|coda" consonants, text]
// vowels: a ɑ · e (say) · i · o · u · A ʌ · E ɛ · I ɪ · @ ə · R ɜ · O ɔ; "x>y" glides x into y (a diphthong).
// text "~" continues the previous syllable on a new pitch (a melisma). Word ends carry their trailing space.
type Row = [number, number, number, number, string, string, string];
const SONG: Row[] = [
  // bar 2 · the hum, low
  [2, 0, 1, 55, "a>I", "f|v", "five "],
  [2, 1, 0.5, 57, "", "", "~"],
  [2, 1.5, 0.5, 55, "O>I", "p|n t", "point "],
  [2, 2, 2, 52, "a>I", "f|v", "five"],
  // verse · A minor
  [3, 0, 1, 60, "A", "w|n", "One "],
  [3, 1, 1, 64, "a", "p r|m p t", "prompt, "],
  [3, 2, 1, 60, "A", "w|n", "one "],
  [3, 3, 1, 64, "I", "l|ng k", "link, "],
  [4, 0, 0.5, 62, "@", "", "a "],
  [4, 0.5, 1, 65, "I", "b l|ng k", "blink"],
  [4, 1.5, 0.5, 64, "I", "|ng", "ing "],
  [4, 2, 2, 60, "a>I", "l|n", "line"],
  [5, 0, 0.5, 59, "I", "|t", "It "],
  [5, 0.5, 1, 60, "i", "r|d", "read "],
  [5, 1.5, 0.5, 60, "@", "dh|", "the "],
  [5, 2, 1.5, 64, "i", "b r|f", "brief, "],
  [6, 0, 0.5, 62, "E", "dh|n", "then "],
  [6, 0.5, 0.5, 62, "I", "|t", "it "],
  [6, 1, 1, 64, "i", "r|d", "read "],
  [6, 2, 0.5, 62, "@", "dh|", "the "],
  [6, 2.5, 1.5, 59, "u", "r|l z", "rules"],
  [7, 0, 0.5, 64, "E", "|v", "Ev"],
  [7, 0.5, 0.5, 62, "i", "r|", "ery "],
  [7, 1, 1, 60, "e>I", "f r|m", "frame "],
  [7, 2, 0.5, 59, "@", "", "a "],
  [7, 2.5, 0.5, 60, "A", "f|ng k", "func"],
  [7, 3, 1, 57, "@", "sh|n", "tion, "],
  [8, 0, 0.5, 60, "o>u", "n|", "no "],
  [8, 0.5, 0.5, 62, "I", "h|d", "hid"],
  [8, 1, 0.5, 64, "@", "d|n", "den "],
  [8, 1.5, 2, 65, "e>I", "s t|t", "state"],
  [9, 0, 0.5, 57, "I", "|t", "It "],
  [9, 0.5, 1, 62, "u", "d r|", "drew "],
  [9, 1.5, 0.5, 62, "@", "dh|", "the "],
  [9, 2, 1, 65, "o>u", "h|l", "whole "],
  [9, 3, 1, 64, "I", "th|ng", "thing "],
  [10, 0, 1, 62, "a>u", "|t", "out "],
  [10, 1, 0.5, 60, "A", "|v", "of "],
  [10, 1.5, 2, 62, "o>u", "k|d", "code"],
  // chorus · C major
  [11, 0, 1.5, 64, "o>u", "", "Oh, "],
  [11, 1.5, 1, 67, "o", "", "O"],
  [11, 2.5, 1, 64, "@", "p|s", "pus, "],
  [12, 0, 1, 67, "a>I", "f|v", "five "],
  [12, 1, 0.5, 69, "", "", "~"],
  [12, 1.5, 0.5, 67, "O>I", "p|n t", "point "],
  [12, 2, 2, 62, "a>I", "f|v", "five"],
  [13, 0, 1, 67, "O", "d r|", "Draw "],
  [13, 1, 0.5, 67, "I", "|t", "it "],
  [13, 1.5, 0.5, 65, "I", "|n", "in "],
  [13, 2, 2, 64, "o>u", "k|d", "code "],
  [14, 0, 1, 64, "@", "t|", "to"],
  [14, 1, 2.5, 65, "a>I", "n|t", "night"],
  [15, 0, 1, 64, "E", "|v", "Ev"],
  [15, 1, 1, 65, "i", "r|", "ery "],
  [15, 2, 2, 67, "e>I", "f r|m", "frame "],
  [16, 0, 1, 65, "@", "", "a "],
  [16, 1, 1, 64, "A", "f|ng k", "func"],
  [16, 2, 2, 62, "@", "sh|n", "tion"],
  [17, 0, 2, 69, "e>I", "s|m", "Same "],
  [17, 2, 1, 67, "I", "p|k s", "pix"],
  [17, 3, 1, 65, "@", "|l z", "els "],
  [18, 0, 1, 64, "E", "|v", "ev"],
  [18, 1, 1, 62, "i", "r|", "ery "],
  [18, 2, 2, 67, "a>I", "t|m", "time"],
  // bridge · A minor, kick only
  [19, 0, 0.5, 60, "I", "|t", "It "],
  [19, 0.5, 1, 64, "E", "ch|k t", "checked "],
  [19, 1.5, 0.5, 64, "I", "|t s", "its "],
  [19, 2, 1, 60, "R", "w|k", "work"],
  [20, 0, 0.5, 60, "I", "|t", "it "],
  [20, 0.5, 1, 65, "E", "ch|k t", "checked "],
  [20, 1.5, 0.5, 65, "I", "|t", "it "],
  [20, 2, 1, 69, "a>I", "t w|s", "twice"],
  // tag
  [21, 0, 1, 67, "a>I", "f|v", "five "],
  [21, 1, 0.5, 69, "", "", "~"],
  [21, 1.5, 0.5, 67, "O>I", "p|n t", "point "],
  [21, 2, 2, 64, "a>I", "f|v", "five"],
  [22, 0, 1, 67, "a>I", "f|v", "five "],
  [22, 1, 0.5, 69, "", "", "~"],
  [22, 1.5, 0.5, 67, "O>I", "p|n t", "point "],
  [22, 2, 2, 62, "a>I", "f|v", "five"],
  [23, 0, 1.5, 65, "e>I", "m|d", "made "],
  [23, 1.5, 0.5, 64, "I", "|n", "in "],
  [23, 2, 5, 60, "o>u", "k|d", "code"],
];
/** the frame a row starts on: the same arithmetic the audio uses (a beat is 20 frames) */
const frameOf = (bar: number, beat: number) => (bar - 1) * BAR + beat * BEAT;

// syllables (continuations fold into the one before), and the displayed lines they belong to
type Syl = { text: string; s: number; e: number; line: number; rows: Row[] };
const LINE_BARS: [number, number][] = [
  [2, 2], // 0 hum
  [3, 4], // 1 verse 1
  [5, 6], // 2
  [7, 8], // 3
  [9, 10], // 4
  [11, 12], // 5 chorus 1
  [13, 14], // 6
  [15, 16], // 7
  [17, 18], // 8
  [19, 19], // 9 bridge a
  [20, 20], // 10 bridge b
  [21, 21], // 11 tag
  [22, 22], // 12
  [23, 24], // 13
];
const SYLS: Syl[] = [];
for (const r of SONG) {
  const s = frameOf(r[0], r[1]),
    e = s + r[2] * BEAT;
  if (r[6] === "~") {
    const prev = SYLS[SYLS.length - 1];
    prev.e = e;
    prev.rows.push(r);
  } else SYLS.push({ text: r[6], s, e, line: LINE_BARS.findIndex(([a, b]) => r[0] >= a && r[0] <= b), rows: [r] });
}
/** the syllables sung in one bar (each line's two halves set only their own bar's words) */
const barKs = (bar: number) => SYLS.map((s, k) => (s.rows[0][0] === bar ? k : -1)).filter((k) => k >= 0);
const LINES = LINE_BARS.map((_, li) => SYLS.map((s, k) => (s.line === li ? k : -1)).filter((k) => k >= 0));

// ================================================================== THE SOUND
const hz = (m: number) => 440 * 2 ** ((m - 69) / 12);
const BEAT_S = 60 / BPM;
// per-bar chords: pad voicing (low, under the voice) and the bass root
const CHORD: Record<string, { pad: number[]; bass: number }> = {
  Am: { pad: [45, 48, 52], bass: 45 },
  C: { pad: [43, 48, 52], bass: 48 },
  F: { pad: [45, 48, 53], bass: 41 },
  G: { pad: [43, 47, 50], bass: 43 },
  Dm: { pad: [45, 50, 53], bass: 38 },
};
const PROG = [
  "Am",
  "C",
  "Am",
  "F",
  "C",
  "G",
  "Am",
  "F",
  "Dm",
  "G",
  "C",
  "G",
  "Am",
  "F",
  "C",
  "G",
  "F",
  "G",
  "Am",
  "F",
  "C",
  "G",
  "F",
  "C",
];
type Part = "intro" | "verse" | "chorus" | "bridge" | "tag" | "end";
const partOf = (bar: number): Part =>
  bar <= 2 ? "intro" : bar <= 10 ? "verse" : bar <= 18 ? "chorus" : bar <= 20 ? "bridge" : bar <= 22 ? "tag" : "end";
// the hits the picture lands on (exact beat frames)
const LOCK = frameOf(12, 0); // 880: the numerals lock
const STAMPS = [frameOf(18, 3), frameOf(19, 3), frameOf(20, 3)]; // 1420, 1500, 1580
const ENTER = frameOf(2, 0); // 80: the Enter key lights
const TYPE_FROM = 0,
  TYPE_TO = 76,
  PROMPT = "write a song about you";
const typedAt = (i: number) => Math.round(TYPE_FROM + ((TYPE_TO - TYPE_FROM) * i) / PROMPT.length);

// formants (Hz) per vowel, with standard values for the five the brief names
const VOW: Record<string, [number, number, number]> = {
  a: [800, 1150, 2900],
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
// consonants: duration (s); voiced ones carry formant loci and a level, unvoiced ones make noise
type Tok = { d: number; voiced?: [number, number, number]; lvl?: number; noise?: string };
const TOK: Record<string, Tok> = {
  w: { d: 0.06, voiced: [300, 610, 2200], lvl: 0.55 },
  l: { d: 0.06, voiced: [360, 1100, 2700], lvl: 0.6 },
  r: { d: 0.06, voiced: [420, 1250, 1600], lvl: 0.6 },
  n: { d: 0.07, voiced: [250, 1700, 2600], lvl: 0.32 },
  m: { d: 0.07, voiced: [250, 1100, 2500], lvl: 0.32 },
  ng: { d: 0.07, voiced: [250, 2000, 2700], lvl: 0.32 },
  b: { d: 0.035, voiced: [200, 900, 2400], lvl: 0.12, noise: "bd" },
  d: { d: 0.035, voiced: [200, 1700, 2600], lvl: 0.12, noise: "bd" },
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
// noise colour per consonant: centre Hz, Q, level
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
/** the diatonic third above in C major (the chorus harmony) */
const thirdUp = (m: number) => {
  const pc = ((m % 12) + 12) % 12,
    i = MAJOR.indexOf(pc);
  if (i < 0) return m + 4;
  const up = MAJOR[(i + 2) % 7];
  return m - pc + up + (up < pc ? 12 : 0);
};

type Seg = { a: number; b: number; f: [number, number, number]; lvl: number };
type Hiss = { t: number; d: number; kind: string; lvl: number };
type VSyl = {
  pre: number;
  voiceFrom: number;
  ts: number;
  te: number;
  vowelEnd: number;
  voiceEnd: number;
  on: Seg[];
  coda: Seg[];
  v1: [number, number, number];
  v2: [number, number, number];
  rows: { t0: number; midi: number }[];
  gain: number;
  dbl: boolean;
};

/** the voice plan: every syllable's onsets, vowel, codas and pitch rows, in seconds (pure, from SONG) */
function plan() {
  const sec = (f: number) => f / FPS,
    out: VSyl[] = [],
    hiss: Hiss[] = [];
  SYLS.forEach((s, k) => {
    const r0 = s.rows[0],
      [onS, codaS] = r0[5].split("|"),
      onT = (onS ?? "").split(" ").filter(Boolean),
      codaT = (codaS ?? "").split(" ").filter(Boolean);
    const ts = sec(s.s),
      te = sec(s.e);
    const prevTs = k ? sec(SYLS[k - 1].s) : -1;
    let pre = onT.reduce((a, t) => a + TOK[t].d, 0);
    pre = Math.min(pre, Math.max(0.03, ts - prevTs - 0.12));
    const on: Seg[] = [];
    let a = ts - pre,
      voiceFrom = ts;
    const scale =
      pre /
      Math.max(
        1e-6,
        onT.reduce((q, t) => q + TOK[t].d, 0),
      );
    for (const t of onT) {
      const tk = TOK[t],
        d = tk.d * scale;
      if (tk.voiced) {
        on.push({ a, b: a + d, f: tk.voiced, lvl: tk.lvl ?? 0.5 });
        voiceFrom = Math.min(voiceFrom, a);
        if (tk.noise === "bd") hiss.push({ t: a + d - 0.012, d: 0.012, kind: "bd", lvl: 1 });
        else if (tk.noise) hiss.push({ t: a, d, kind: tk.noise, lvl: 1 });
      } else if (tk.noise === "t" || tk.noise === "k" || tk.noise === "p") {
        // a stop: closure (silence), a burst, then a breath of aspiration into the vowel
        hiss.push({ t: a + d - 0.03, d: 0.016, kind: tk.noise, lvl: 1 });
        hiss.push({ t: a + d - 0.016, d: 0.03, kind: "asp", lvl: 1 });
      } else if (tk.noise === "ch") {
        hiss.push({ t: a, d: 0.012, kind: "t", lvl: 0.7 });
        hiss.push({ t: a + 0.012, d: d - 0.012, kind: "sh", lvl: 1 });
      } else if (tk.noise) hiss.push({ t: a, d, kind: tk.noise, lvl: 1 });
      a += d;
    }
    // where this syllable must stop sounding: before the next one's onset begins
    const next = SYLS[k + 1];
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
    let cv = vcd.reduce((q, t) => q + TOK[t].d, 0);
    cv = Math.min(cv, (voiceEnd - ts) * 0.4);
    const coda: Seg[] = [];
    let c = voiceEnd - cv;
    const vsc =
      cv /
      Math.max(
        1e-6,
        vcd.reduce((q, t) => q + TOK[t].d, 0),
      );
    for (const t of vcd) {
      const tk = TOK[t],
        d = tk.d * vsc;
      coda.push({ a: c, b: c + d, f: tk.voiced!, lvl: tk.lvl ?? 0.5 });
      if (tk.noise === "bd") hiss.push({ t: c + d - 0.01, d: 0.01, kind: "bd", lvl: 1 });
      else if (tk.noise) hiss.push({ t: c, d: d + 0.02, kind: tk.noise, lvl: 0.8 });
      c += d;
    }
    let u = voiceEnd;
    for (const t of unv) {
      const tk = TOK[t];
      if (tk.noise === "t" || tk.noise === "k" || tk.noise === "p") {
        hiss.push({ t: u + 0.025, d: 0.016, kind: tk.noise, lvl: 0.7 });
        hiss.push({ t: u + 0.041, d: 0.025, kind: "asp", lvl: 0.7 });
      } else if (tk.noise) hiss.push({ t: u, d: tk.d, kind: tk.noise, lvl: 0.9 });
      u += tk.d;
    }
    const [v1s, v2s] = r0[4].split(">"),
      bar = r0[0];
    out.push({
      pre,
      voiceFrom,
      ts,
      te,
      vowelEnd: voiceEnd - cv,
      voiceEnd,
      on,
      coda,
      v1: VOW[v1s],
      v2: VOW[v2s ?? v1s],
      rows: s.rows.map((r) => ({ t0: sec(frameOf(r[0], r[1])), midi: r[3] })),
      gain: bar <= 2 ? 0.55 : 1,
      dbl: bar >= 11 && bar <= 18,
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

/** the sung voice: a band-limited sawtooth at the note's pitch through three parallel formant band-passes */
function voice(sr: number, n: number) {
  const { syl: VS, hiss } = plan();
  const dry = new Float32Array(n),
    env = new Float32Array(n); // the voice's level, for ducking the band under it
  const CB = 32,
    blocks = Math.ceil(n / CB),
    coef = new Float64Array(9);
  const fS = [500, 1500, 2500],
    BW = [85, 110, 170],
    G = [1, 0.85, 0.5];
  let amp = 0,
    dAmp = 0,
    ph = 0,
    ph2 = 0,
    k = 0;
  const x = [0, 0, 0, 0],
    y = new Float64Array(6),
    y2 = new Float64Array(6),
    xd = [0, 0];
  let body = 0,
    body2 = 0;
  const breath = rng(551);
  const aA = 1 - Math.exp(-CB / (sr * 0.006)),
    aF = 1 - Math.exp(-CB / (sr * 0.016));
  for (let b = 0; b < blocks; b++) {
    const t = (b * CB) / sr;
    while (k + 1 < VS.length && t >= VS[k + 1].voiceFrom - 0.005) k++;
    const s = VS[k];
    let tAmp = 0,
      tf: [number, number, number] = s.v1,
      midi = s.rows[0].midi,
      dbl = 0;
    if (t >= s.voiceFrom && t < s.voiceEnd + 0.03) {
      if (t < s.ts) {
        const seg = s.on.find((g) => t >= g.a && t < g.b);
        if (seg) {
          tf = seg.f;
          tAmp = seg.lvl;
        } else tAmp = 0;
      } else if (t < s.vowelEnd) {
        const len = s.vowelEnd - s.ts,
          g = s.v1 === s.v2 ? 0 : smooth((t - s.ts - len * 0.5) / Math.max(0.04, len * 0.42));
        tf = [lerp(s.v1[0], s.v2[0], g), lerp(s.v1[1], s.v2[1], g), lerp(s.v1[2], s.v2[2], g)];
        tAmp = 1;
      } else if (t < s.voiceEnd) {
        const seg = s.coda.find((g) => t >= g.a && t < g.b) ?? s.coda[s.coda.length - 1];
        tf = seg ? seg.f : s.v2;
        tAmp = seg ? seg.lvl : 1;
      } else tAmp = 0;
      tAmp *= s.gain;
      // pitch: the row sounding now, a short portamento from the previous note, and a gentle late vibrato
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
      midi += 0.2 * clamp((t - s.ts - 0.22) / 0.3) * Math.sin(TAU * 5.3 * t) + 0.04 * Math.sin(TAU * 0.7 * t + k);
      if (s.dbl) dbl = 0.42;
    }
    amp += (tAmp - amp) * aA;
    dAmp += (dbl * tAmp - dAmp) * aA;
    for (let j = 0; j < 3; j++) fS[j] += (tf[j] - fS[j]) * aF;
    for (let j = 0; j < 3; j++) bpCoef(fS[j], fS[j] / BW[j], sr, coef, j * 3);
    const f0 = hz(midi),
      dt = f0 / sr,
      dt2 = hz(midi + (thirdUp(Math.round(midi)) - Math.round(midi))) / sr;
    const i1 = Math.min(n, (b + 1) * CB);
    if (amp < 1e-4 && dAmp < 1e-4 && Math.abs(y[0]) + Math.abs(y[2]) + Math.abs(y[4]) < 1e-6) {
      for (let i = b * CB; i < i1; i++) breath();
      ph = 0;
      ph2 = 0.37;
      continue;
    }
    const lpB = 1 - Math.exp((-TAU * 320) / sr);
    for (let i = b * CB; i < i1; i++) {
      ph += dt;
      if (ph >= 1) ph -= 1;
      const saw = 2 * ph - 1 - blep(ph, dt);
      const src = (saw + (breath() * 2 - 1) * 0.06) * amp;
      body += (src - body) * lpB;
      let v = body * 0.35;
      for (let j = 0; j < 3; j++) {
        const o = j * 3,
          b0 = coef[o],
          yy = b0 * (src - x[1]) - coef[o + 1] * y[j * 2] - coef[o + 2] * y[j * 2 + 1];
        y[j * 2 + 1] = y[j * 2];
        y[j * 2] = yy;
        v += G[j] * yy;
      }
      x[1] = x[0];
      x[0] = src;
      if (dAmp > 1e-4 || Math.abs(y2[0]) > 1e-6) {
        ph2 += dt2;
        if (ph2 >= 1) ph2 -= 1;
        const s2 = (2 * ph2 - 1 - blep(ph2, dt2)) * dAmp;
        body2 += (s2 - body2) * lpB;
        v += body2 * 0.35;
        for (let j = 0; j < 3; j++) {
          const o = j * 3,
            yy = coef[o] * (s2 - xd[1]) - coef[o + 1] * y2[j * 2] - coef[o + 2] * y2[j * 2 + 1];
          y2[j * 2 + 1] = y2[j * 2];
          y2[j * 2] = yy;
          v += G[j] * yy;
        }
        xd[1] = xd[0];
        xd[0] = s2;
      }
      dry[i] = v;
      env[i] = amp;
    }
  }
  // consonant noise: seeded, band-passed bursts at the onsets and codas
  hiss.forEach((h, idx) => {
    const [fc, q, lvl] = HISS[h.kind],
      r = rng(9000 + idx),
      c = new Float64Array(3);
    bpCoef(fc, q, sr, c, 0);
    const i0 = Math.round(h.t * sr),
      len = Math.max(8, Math.round(h.d * sr)),
      atk = Math.min(len * 0.3, 0.012 * sr),
      rel = Math.min(len * 0.4, 0.02 * sr);
    let x1 = 0,
      x2 = 0,
      y1 = 0,
      yv2 = 0;
    for (let j = 0; j < len; j++) {
      const xi = r() * 2 - 1,
        yy = c[0] * (xi - x2) - c[1] * y1 - c[2] * yv2;
      x2 = x1;
      x1 = xi;
      yv2 = y1;
      y1 = yy;
      const e = Math.min(1, j / atk, (len - j) / rel),
        i = i0 + j;
      if (i >= 0 && i < n) dry[i] += yy * e * lvl * h.lvl * 1.6;
    }
  });
  return { dry, env };
}

/** a plate-like reverb: parallel damped combs into allpasses (Schroeder / Freeverb shape), mono in, stereo out */
function plate(inp: Float32Array, sr: number, send: (i: number) => number): [Float32Array, Float32Array] {
  const n = inp.length,
    k = sr / 44100,
    pre = Math.round(0.022 * sr);
  const make = (spread: number) => ({
    combs: [1116, 1188, 1277, 1356, 1422, 1491].map((d) => ({
      buf: new Float32Array(Math.round((d + spread) * k)),
      i: 0,
      lp: 0,
    })),
    aps: [556, 441, 341, 225].map((d) => ({ buf: new Float32Array(Math.round((d + spread) * k)), i: 0 })),
  });
  const chans = [make(0), make(23)],
    out: [Float32Array, Float32Array] = [new Float32Array(n), new Float32Array(n)];
  const fb = 0.83,
    damp = 0.28;
  for (let c = 0; c < 2; c++) {
    const ch = chans[c],
      o = out[c];
    for (let i = 0; i < n; i++) {
      const x = i >= pre ? inp[i - pre] * send(i - pre) * 0.12 : 0;
      let s = 0;
      for (const cb of ch.combs) {
        const y = cb.buf[cb.i];
        cb.lp = y * (1 - damp) + cb.lp * damp;
        cb.buf[cb.i] = x + cb.lp * fb;
        cb.i = cb.i + 1 === cb.buf.length ? 0 : cb.i + 1;
        s += y;
      }
      for (const ap of ch.aps) {
        const b = ap.buf[ap.i],
          y = -s + b;
        ap.buf[ap.i] = s + b * 0.5;
        ap.i = ap.i + 1 === ap.buf.length ? 0 : ap.i + 1;
        s = y;
      }
      o[i] = s;
    }
  }
  return out;
}

/** the band: kick, snare on 2 and 4, closed hats, a sine-and-saw bass, a pad and a plucked arpeggio, plus the hits */
function band(sr: number, n: number): [Float32Array, Float32Array] {
  const L = new Float32Array(n),
    R = new Float32Array(n),
    noise = rng(9025);
  const at = (sec: number) => Math.round(sec * sr),
    beatN = BEAT_S * sr;
  const add = (i: number, v: number, pan = 0.5) => {
    if (i < 0 || i >= n) return;
    L[i] += v * (1 - pan) * 2 * 0.5;
    R[i] += v * pan * 2 * 0.5;
  };
  const kick = (i0: number, vel: number) => {
    let ph = 0;
    for (let k = 0; k < 0.32 * sr; k++) {
      const t = k / sr;
      ph += (46 + 120 * Math.exp(-t / 0.028)) / sr;
      add(i0 + k, Math.sin(TAU * ph) * Math.exp(-t / 0.11) * Math.min(1, t / 0.001) * vel);
    }
  };
  const snare = (i0: number, vel: number) => {
    let lp = 0,
      ph = 0;
    for (let k = 0; k < 0.22 * sr; k++) {
      const t = k / sr,
        w = noise() * 2 - 1;
      lp += 0.25 * (w - lp);
      ph += (190 - 30 * Math.min(1, t / 0.05)) / sr;
      add(
        i0 + k,
        ((w - lp) * Math.exp(-t / 0.075) * 0.8 + Math.sin(TAU * ph) * Math.exp(-t / 0.045) * 0.6) * vel,
        0.47,
      );
    }
  };
  const hat = (i0: number, vel: number, pan: number) => {
    let a = 0,
      b = 0;
    for (let k = 0; k < 0.05 * sr; k++) {
      const t = k / sr,
        w = noise() * 2 - 1;
      a += 0.6 * (w - a);
      b += 0.6 * (w - a - b);
      add(i0 + k, (w - a - b) * Math.exp(-t / 0.014) * vel, pan);
    }
  };
  const tone = (i0: number, midi: number, len: number, vel: number, kind: "pluck" | "bell" | "bass", pan = 0.5) => {
    const f = hz(midi),
      dt = f / sr;
    let ph = 0,
      ph2 = 0.25,
      lp = 0;
    const lpk = 1 - Math.exp((-TAU * 420) / sr);
    for (let k = 0; k < len; k++) {
      const t = k / sr;
      ph += dt;
      if (ph >= 1) ph -= 1;
      let s: number;
      if (kind === "bass") {
        ph2 += dt;
        if (ph2 >= 1) ph2 -= 1;
        lp += (2 * ph2 - 1 - blep(ph2, dt) - lp) * lpk;
        s = (Math.sin(TAU * ph) + 0.45 * lp) * Math.min(1, t / 0.006) * Math.min(1, (len - k) / (0.04 * sr));
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
  const pad = (i0: number, midi: number, len: number, vel: number, pan: number) => {
    const f = hz(midi),
      d1 = (f * 1.0035) / sr,
      d2 = (f * 0.9965) / sr,
      lpk = 1 - Math.exp((-TAU * 900) / sr),
      att = 0.3 * sr,
      rel = 0.45 * sr;
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
  const ARP = [0, 1, 2, 1, 2, 0, 1, 2];
  for (let bar = 1; bar <= 24; bar++) {
    const part = partOf(bar),
      ch = CHORD[PROG[bar - 1]],
      i0 = Math.round((bar - 1) * 4 * beatN),
      barN = Math.round(4 * beatN);
    // pad (fades out over the last bar)
    const padVel = part === "end" && bar === 24 ? 0.03 : 0.036;
    ch.pad.forEach((m, v) => pad(i0, m, bar === 24 ? Math.round(barN * 0.7) : barN, padVel, 0.3 + v * 0.2));
    // bass
    if (part === "verse")
      [
        [0, 1.5],
        [1.5, 0.5],
        [2, 1.5],
        [3.5, 0.5],
      ].forEach(([b, l]) => tone(i0 + Math.round(b * beatN), ch.bass, Math.round(l * beatN * 0.95), 0.17, "bass"));
    if (part === "chorus")
      for (let e = 0; e < 8; e++)
        tone(
          i0 + Math.round(e * 0.5 * beatN),
          ch.bass + (e % 4 === 3 ? 12 : 0),
          Math.round(0.45 * beatN),
          0.16,
          "bass",
        );
    if (part === "bridge") tone(i0, ch.bass, Math.round(barN * 0.95), 0.15, "bass");
    if (part === "tag")
      [0, 2].forEach((b) => tone(i0 + Math.round(b * beatN), ch.bass, Math.round(1.9 * beatN), 0.15, "bass"));
    // plucked arpeggio: 8ths, 16ths in the chorus, one pluck at the end
    const steps = part === "chorus" ? 16 : part === "end" ? 0 : 8;
    for (let s = 0; s < steps; s++) {
      const j = i0 + Math.round((s * 4 * beatN) / steps),
        m = ch.pad[ARP[s % 8]] + 24 + (s % 8 === 7 ? 12 : 0);
      tone(
        j,
        m,
        Math.round(0.45 * sr),
        part === "intro" ? 0.05 : part === "chorus" ? 0.034 : 0.042,
        "pluck",
        s % 2 ? 0.3 : 0.7,
      );
    }
    if (bar === 23) tone(i0, ch.pad[2] + 24, Math.round(2.6 * sr), 0.07, "bell", 0.55);
    // drums
    for (let b = 0; b < 4; b++) {
      const j = i0 + Math.round(b * beatN);
      if (part === "verse") {
        if (b === 0 || b === 2) kick(j, 0.5);
        if (b === 1 || b === 3) snare(j, 0.16);
      }
      if (part === "chorus") {
        kick(j, 0.55);
        if (b === 1 || b === 3) snare(j, 0.26);
      }
      if (part === "bridge" && (b === 0 || b === 2)) kick(j, 0.5);
      if (part === "tag") {
        if (b === 0 || b === 2) kick(j, 0.45);
        if (b === 1 || b === 3) snare(j, 0.12);
      }
    }
    const hats = part === "chorus" ? 16 : part === "verse" || part === "tag" ? 8 : 0;
    for (let h = 0; h < hats; h++)
      hat(i0 + Math.round((h * 4 * beatN) / hats), (h % 2 ? 0.045 : 0.07) * (part === "chorus" ? 1 : 0.8), 0.62);
  }
  // hits the picture lands on: the numeral lock, the three stamps, the Enter key and the typed keys
  const f2s = (f: number) => f / FPS;
  {
    const i = at(f2s(LOCK));
    kick(i, 0.7);
    let lp = 0;
    for (let k = 0; k < 0.5 * sr; k++) {
      const t = k / sr,
        w = noise() * 2 - 1;
      lp += 0.3 * (w - lp);
      add(i + k, lp * Math.exp(-t / 0.12) * 0.35);
    }
    [67, 71, 74, 79].forEach((m, v) => tone(i, m, Math.round(1.6 * sr), 0.05, "bell", 0.35 + v * 0.1));
  }
  for (const f of STAMPS) {
    const i = at(f2s(f));
    let ph = 0,
      lp = 0;
    for (let k = 0; k < 0.35 * sr; k++) {
      const t = k / sr,
        w = noise() * 2 - 1;
      ph += (44 + 90 * Math.exp(-t / 0.02)) / sr;
      lp += 0.12 * (w - lp);
      add(i + k, Math.sin(TAU * ph) * Math.exp(-t / 0.09) * 0.8 + lp * Math.exp(-t / 0.03) * 1.4, 0.5);
    }
  }
  {
    const i = at(f2s(ENTER));
    for (let k = 0; k < 0.06 * sr; k++) {
      const t = k / sr;
      add(
        i + k,
        Math.sin(TAU * 1760 * t) * Math.exp(-t / 0.02) * 0.08 + (noise() * 2 - 1) * Math.exp(-t / 0.003) * 0.12,
      );
    }
  }
  for (let c = 0; c < PROMPT.length; c++) {
    const i = at(f2s(typedAt(c)));
    for (let k = 0; k < 0.012 * sr; k++)
      add(i + k, (noise() * 2 - 1) * Math.exp(-k / (0.002 * sr)) * 0.07, 0.45 + (c % 3) * 0.05);
  }
  return [L, R];
}

/** BS.1770 integrated loudness (K-weighted, gated), so the mix can be set to exactly −16 LUFS */
function loudness(L: Float32Array, R: Float32Array, sr: number) {
  const kw = (x: Float32Array) => {
    const o = new Float32Array(x.length);
    // stage 1: high shelf
    let K = Math.tan((Math.PI * 1681.974450955533) / sr);
    const Vh = 10 ** (3.999843853973347 / 20),
      Vb = Vh ** 0.4996667741545416,
      Q = 0.7071752369554196;
    let a0 = 1 + K / Q + K * K;
    const b = [(Vh + (Vb * K) / Q + K * K) / a0, (2 * (K * K - Vh)) / a0, (Vh - (Vb * K) / Q + K * K) / a0],
      a = [(2 * (K * K - 1)) / a0, (1 - K / Q + K * K) / a0];
    // stage 2: high pass
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

/** the stems (band, dry voice, voice reverb) before the master; exported for checking the mix */
export function fivePointFiveParts(sr: number) {
  const n = Math.ceil((N / FPS) * sr),
    [bL, bR] = band(sr, n),
    { dry, env } = voice(sr, n);
  const partAt = (i: number) => partOf(Math.floor(i / (4 * BEAT_S * sr)) + 1);
  const [wL, wR] = plate(dry, sr, (i) => {
    const p = partAt(i);
    return p === "chorus" ? 1.4 : p === "verse" ? 0.8 : 1.2;
  });
  return { n, bL, bR, dry, env, wL, wR };
}

function audio(sr: number): [Float32Array, Float32Array] {
  const { n, bL, bR, dry, env, wL, wR } = fivePointFiveParts(sr);
  const L = new Float32Array(n),
    R = new Float32Array(n);
  let duck = 0;
  const dk = 1 - Math.exp(-1 / (0.05 * sr));
  for (let i = 0; i < n; i++) {
    duck += (env[i] - duck) * dk;
    const g = 1 - 0.3 * Math.min(1, duck),
      v = dry[i] * 1.0;
    L[i] = bL[i] * g * 1.5 + v + wL[i];
    R[i] = bR[i] * g * 1.5 + v + wR[i];
  }
  // the master: set to −16 LUFS, then a soft knee above 0.8 so no sample clips
  const gain = 10 ** ((-15.85 - loudness(L, R, sr)) / 20);
  const knee = (x: number) => {
    const a = Math.abs(x);
    return a < 0.8 ? x : Math.sign(x) * (0.8 + 0.19 * Math.tanh((a - 0.8) / 0.19));
  };
  // fade the last half second to silence
  const fade = Math.round(0.5 * sr);
  for (let i = 0; i < n; i++) {
    const f = i > n - fade ? (n - i) / fade : 1;
    L[i] = knee(L[i] * gain) * f;
    R[i] = knee(R[i] * gain) * f;
  }
  return [L, R];
}

// the song's loudness as the picture sees it (the HUD meter): voice + kicks, from the same table
const levelAt = (F: number) => {
  let v = 0;
  for (const s of SYLS) if (F >= s.s - 2 && F < s.e) v = Math.max(v, 0.62 + 0.25 * Math.exp(-(F - s.s) / 6));
  const bar = Math.floor(F / BAR) + 1,
    part = partOf(Math.min(24, bar)),
    inBeat = F % BEAT,
    beat = Math.floor((F % BAR) / BEAT);
  const kickOn = part === "chorus" || ((part === "verse" || part === "bridge" || part === "tag") && beat % 2 === 0);
  const k = kickOn ? 0.35 * Math.exp(-inBeat / 4) : 0,
    base = part === "intro" ? 0.18 : part === "end" ? 0.2 : part === "chorus" ? 0.34 : 0.26;
  return clamp(base + 0.55 * v + k - (F > N - 20 ? (F - (N - 20)) / 20 : 0));
};

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
    k = clamp(t);
  return `rgb(${Math.round(lerp(p[0], q[0], k))},${Math.round(lerp(p[1], q[1], k))},${Math.round(lerp(p[2], q[2], k))})`;
};
/** integer hash → 0..1 (the same on every machine) */
const hash = (a: number, b = 0) => {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  return (h >>> 0) / 4294967296;
};
const SPECKS = (() => {
  const r = rng(2525);
  return Array.from({ length: 900 }, () => [r(), r(), 0.6 + r() * 1.6, r()] as [number, number, number, number]);
})();
const pad4 = (n: number) => String(Math.max(0, Math.round(n))).padStart(4, "0");

// the karaoke state of a syllable: future, lit (accent, while sung) or sung (fading back to ink)
const litAt = (k: number, F: number) => {
  const s = SYLS[k];
  if (F < s.s) return -1;
  if (F < s.e) return 1;
  return 1 - clamp((F - s.e) / 6);
};
const wordStart = (k: number) => {
  let j = k;
  while (j > 0 && SYLS[j - 1].line === SYLS[k].line && !SYLS[j - 1].text.endsWith(" ")) j--;
  return SYLS[j].s;
};

type TSpec = {
  family: string;
  weight?: number;
  size: number;
  track?: number;
  upper?: boolean;
  sx?: number;
  lead?: number;
  brk?: number[];
};
type Piece = { k: number; t: string; x: number; w: number; row: number };
type SetLine = { pieces: Piece[]; rowW: number[]; size: number; lead: number; o: TSpec };

export function make(size: Size, id: string): Film {
  const L = layout(size),
    { W, H, u, cx, cy, tall } = L,
    S = L.safe;
  const hudTop = S.top + 24 * u,
    hudBot = H - S.bottom - (tall ? 0 : 4) * u;

  // ---------------------------------------------------------------- type: syllables set, wrapped and lit
  const opts = (o: TSpec, size = o.size) => ({ size, family: o.family, weight: o.weight ?? 400, track: o.track ?? 0 });
  const disp = (o: TSpec, t: string) => (o.upper ? t.toUpperCase() : t);
  /** set one lyric line: fit its size so it wraps into at most maxRows rows no wider than maxW */
  const setLine = (ctx: Ctx, li: number | number[], o: TSpec, maxW: number, maxRows: number): SetLine => {
    const ks = typeof li === "number" ? LINES[li] : li,
      sx = o.sx ?? 1;
    let sz = o.size;
    for (let tries = 0; ; tries++) {
      const to = opts(o, sz),
        space = measure(ctx, " ", to) * sx;
      const pieces: Piece[] = [],
        rowW: number[] = [];
      let row = 0,
        x = 0,
        word: Piece[] = [],
        words = 0,
        ok = true;
      const flush = () => {
        const full = word.reduce((a, p) => a + p.w, 0),
          vis = full - (word[word.length - 1].t.endsWith(" ") ? space : 0);
        if (x > 0 && (x + vis > maxW || (o.brk ?? []).includes(words))) {
          rowW[row] = rowW[row] ?? 0;
          row++;
          x = 0;
        }
        if (vis > maxW) ok = false;
        for (const p of word) {
          p.x = x;
          p.row = row;
          x += p.w;
          pieces.push(p);
        }
        rowW[row] = x - (word[word.length - 1].t.endsWith(" ") ? space : 0);
        word = [];
        words++;
      };
      ks.forEach((k, i) => {
        const t = disp(o, SYLS[k].text);
        word.push({
          k,
          t,
          x: 0,
          w: measure(ctx, t, to) * sx + (t.endsWith(" ") ? (o.track ?? 0) * sz * sx : 0),
          row: 0,
        });
        if (t.endsWith(" ") || i === ks.length - 1) flush();
      });
      if ((ok && row + 1 <= maxRows) || tries > 40) return { pieces, rowW, size: sz, lead: o.lead ?? 1.08, o };
      sz *= 0.96;
    }
  };
  type Look = {
    ink: string;
    accent?: string;
    future?: "ghost" | "hide" | "show";
    ghost?: number;
    enter?: (f: number, p: Piece) => { a: number; dy: number; s: number };
  };
  /** draw a set line at (x, first baseline y); returns the end of the last visible piece (for a caret) */
  const drawSet = (
    ctx: Ctx,
    st: SetLine,
    x: number,
    y: number,
    align: "left" | "center" | "right",
    F: number,
    look: Look,
  ) => {
    const sx = st.o.sx ?? 1,
      to = opts(st.o, st.size),
      acc = look.accent ?? C.accent;
    let end = { x: x, y, row: 0 };
    for (const p of st.pieces) {
      const lit = litAt(p.k, F),
        ws = wordStart(p.k),
        rw = st.rowW[p.row],
        left = align === "left" ? x : align === "center" ? x - rw / 2 : x - rw;
      const px = left + p.x,
        py = y + p.row * st.size * st.lead;
      let a = 1,
        dy = 0,
        sc = 1;
      if (look.future === "hide") {
        if (F < ws) continue;
        if (look.enter) ({ a, dy, s: sc } = look.enter(F - ws, p));
      } else if (lit < 0) a = look.future === "show" ? 1 : (look.ghost ?? 0.22);
      const col = lit < 0 ? look.ink : mix(look.ink, acc, lit);
      ctx.save();
      ctx.globalAlpha *= a;
      ctx.translate(px, py + dy);
      if (sc !== 1) {
        ctx.translate(p.w / 2, -st.size * 0.35);
        ctx.scale(sc, sc);
        ctx.translate(-p.w / 2, st.size * 0.35);
      }
      ctx.scale(sx, 1);
      text(ctx, p.t, 0, 0, { ...to, color: col });
      ctx.restore();
      if (a > 0.05) end = { x: px + (p.t.endsWith(" ") ? p.w - measure(ctx, " ", to) * sx : p.w), y: py, row: p.row };
    }
    return end;
  };
  const blockH = (st: SetLine) => st.size * (1 + st.lead * (st.rowW.length - 1));
  const mono = (
    ctx: Ctx,
    s: string,
    x: number,
    y: number,
    o: { align?: CanvasTextAlign; color?: string; size?: number; track?: number; alpha?: number } = {},
  ) =>
    text(ctx, s, x, y, {
      size: (o.size ?? 22) * u,
      family: F_.mono,
      weight: 500,
      color: o.color ?? C.muted,
      align: o.align ?? "left",
      track: o.track ?? 0.08,
      alpha: o.alpha ?? 1,
    });

  // ---------------------------------------------------------------- light, depth, grain
  const glow = (ctx: Ctx, x: number, y: number, r: number, a: number, col = C.accent) => {
    if (a <= 0) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(col, a));
    g.addColorStop(0.45, rgba(col, a * 0.35));
    g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  };
  /** depth of field without ctx.filter: paint into a small offscreen canvas and scale it back up */
  const soft = (ctx: Ctx, env: Env, k: number, draw: (c: Ctx) => void, alpha = 1) => {
    const w = Math.max(1, Math.round((W * env.scale) / k)),
      h = Math.max(1, Math.round((H * env.scale) / k)),
      key = `fpf:soft:${w}x${h}`;
    let ly = env.cache.get(key) as Layer | undefined;
    if (!ly) {
      ly = env.canvas(w, h);
      env.cache.set(key, ly);
    }
    const c = ly.ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = 1;
    c.clearRect(0, 0, w, h);
    c.setTransform(env.scale / k, 0, 0, env.scale / k, 0, 0);
    draw(c);
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.imageSmoothingEnabled = true;
    (ctx as Ctx & { imageSmoothingQuality: string }).imageSmoothingQuality = "high";
    ctx.drawImage(ly.canvas, 0, 0, W, H);
    ctx.restore();
  };
  const vignette = (ctx: Ctx, a: number) => {
    const g = ctx.createRadialGradient(cx, cy, Math.min(W, H) * 0.35, cx, cy, Math.hypot(W, H) * 0.62);
    g.addColorStop(0, rgba(C.deep, 0));
    g.addColorStop(1, rgba(C.deep, a));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  };
  const grain = (ctx: Ctx, F: number, col: string, a: number) => {
    const fr = Math.floor(F / 2);
    ctx.fillStyle = col;
    for (let i = 0; i < SPECKS.length; i++) {
      if (hash(i, fr) > 0.45) continue;
      const [x, y, s, b] = SPECKS[i];
      ctx.globalAlpha = a * (0.4 + 0.6 * b);
      const px = ((x + hash(i, fr + 7) * 0.02) % 1) * W,
        py = ((y + hash(i + 3, fr) * 0.02) % 1) * H;
      ctx.fillRect(px, py, s * u, s * u);
    }
    ctx.globalAlpha = 1;
  };
  const caret = (ctx: Ctx, x: number, y: number, h: number, F: number, col = C.accent, w = 5) => {
    if (F % BEAT >= 11) return;
    ctx.fillStyle = col;
    ctx.fillRect(x, y - h, w * u, h);
  };
  const enterGlyph = (ctx: Ctx, x: number, y: number, s: number, col: string, lw: number) => {
    ctx.save();
    ctx.strokeStyle = col;
    ctx.lineWidth = lw;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(x + s * 0.35, y - s * 0.4);
    ctx.lineTo(x + s * 0.35, y + s * 0.1);
    ctx.lineTo(x - s * 0.35, y + s * 0.1);
    ctx.moveTo(x - s * 0.12, y - s * 0.12);
    ctx.lineTo(x - s * 0.37, y + s * 0.1);
    ctx.lineTo(x - s * 0.12, y + s * 0.32);
    ctx.stroke();
    ctx.restore();
  };
  const tick = (ctx: Ctx, x: number, y: number, s: number, t: number, col: string, lw: number) => {
    const p1: [number, number] = [x - s * 0.5, y],
      p2: [number, number] = [x - s * 0.15, y + s * 0.35],
      p3: [number, number] = [x + s * 0.55, y - s * 0.4];
    const l1 = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]),
      l2 = Math.hypot(p3[0] - p2[0], p3[1] - p2[1]),
      d = clamp(t) * (l1 + l2);
    if (d <= 0) return;
    ctx.save();
    ctx.strokeStyle = col;
    ctx.lineWidth = lw;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(...p1);
    if (d < l1) ctx.lineTo(lerp(p1[0], p2[0], d / l1), lerp(p1[1], p2[1], d / l1));
    else {
      ctx.lineTo(...p2);
      const k = (d - l1) / l2;
      ctx.lineTo(lerp(p2[0], p3[0], k), lerp(p2[1], p3[1], k));
    }
    ctx.stroke();
    ctx.restore();
  };
  /** a polyline drawn on to fraction p with a dash offset (the "draws itself" stroke) */
  const drawOn = (ctx: Ctx, pts: [number, number][], p: number, closed = false) => {
    if (p <= 0) return;
    let len = 0;
    for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (closed) len += Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]);
    ctx.save();
    ctx.setLineDash([len, len + 1]);
    ctx.lineDashOffset = len * (1 - clamp(p));
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    if (closed) ctx.closePath();
    ctx.stroke();
    ctx.restore();
  };

  // ---------------------------------------------------------------- shared: a punch, the paper, the bar's words
  // Every lyric line is two bars; the second bar cuts to a closer framing of the same idea (its "b" half), and
  // each half sets only the words sung in its own bar, so the lit syllable is always on screen.
  /** a cut lands with a punch: a quick, slightly overshooting scale down from 1 + amt */
  const punchIn = (ctx: Ctx, f: number, ox = cx, oy = cy, amt = 0.1) => {
    const s = 1 + amt * (1 - spring(f / FPS, { freq: 3.4, damp: 0.5 }));
    ctx.translate(ox, oy);
    ctx.scale(s, s);
    ctx.translate(-ox, -oy);
  };
  const paper = C.ink,
    pink = C.deep; // ink on paper
  type Scene = (ctx: Ctx, env: Env, F: number, bare?: boolean) => void;

  // ---------------------------------------------------------------- 0 · intro: the prompt field and the hum
  const field0 = tall ? { w: W - 2 * S.x, h: 150 * u, y: 400 * u } : { w: 0.6 * W, h: 150 * u, y: 200 * u };
  const typeO = { size: 64 * u, family: F_.sans, weight: 400, track: -0.015 };
  const promptField = (ctx: Ctx, x: number, y: number, w: number, h: number, lit = 0) => {
    ctx.save();
    ctx.shadowColor = rgba(C.deep, 0.5);
    ctx.shadowBlur = 40 * u;
    ctx.shadowOffsetY = 14 * u;
    rr(ctx, x, y, w, h, 26 * u);
    ctx.fillStyle = lit > 0 ? mix(paper, C.accent, lit) : paper;
    ctx.fill();
    ctx.restore();
  };
  const waveBand = tall
    ? { x0: S.x, x1: W - S.x, y: 1110 * u, amp: 330 * u, n: 36 }
    : { x0: S.x + 20 * u, x1: W - S.x - 20 * u, y: 760 * u, amp: 215 * u, n: 56 };
  /** the hum as a bar waveform across the frame; A is its height (0..1) */
  const wave = (ctx: Ctx, F: number, A: number, col: string) => {
    const { x0, x1, y, amp, n } = waveBand,
      pitch = (x1 - x0) / n,
      bw = pitch * 0.66;
    ctx.fillStyle = col;
    for (let i = 0; i < n; i++) {
      const q = (i + 0.5) / n,
        env = Math.sin(Math.PI * q) ** 0.7,
        v = 0.3 + 0.7 * Math.abs(Math.sin(q * 23 + F * 0.37) * 0.6 + Math.sin(q * 61 - F * 0.83) * 0.4),
        hh = Math.max(5 * u, amp * A * env * v);
      rr(ctx, x0 + i * pitch + (pitch - bw) / 2, y - hh, bw, 2 * hh, bw / 2);
      ctx.fill();
    }
  };
  const enterKey = (ctx: Ctx, x: number, y: number, lit: number, pop: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(pop, pop);
    rr(ctx, -46 * u, -38 * u, 92 * u, 76 * u, 16 * u);
    ctx.fillStyle = lit > 0 ? mix(rgba(pink, 0.08), pink, lit) : rgba(pink, 0.08);
    ctx.fill();
    enterGlyph(ctx, 0, 0, 40 * u, lit > 0.3 ? paper : rgba(pink, 0.55), 3.6 * u);
    ctx.restore();
  };
  const intro: Scene = (ctx, _env, F, bare = false) => {
    const { w, h, y } = field0,
      x = cx - w / 2,
      k = F - ENTER,
      sent = F >= ENTER;
    // the hum: a big bar waveform, idling on the plucks, then full height when the voice comes in
    const pluck = Math.exp(-(F % 10) / 4),
      A = sent ? levelAt(F) * (1.05 + 0.3 * Math.exp(-k / 5)) : 0.36 + 0.1 * pluck;
    glow(ctx, cx, waveBand.y, 900 * u, sent ? 0.16 : 0.08);
    // Enter: the frame takes a breath of clay as the voice comes in
    if (sent) {
      ctx.fillStyle = rgba(C.accent, 0.3 * Math.exp(-k / 4));
      ctx.fillRect(-100 * u, -100 * u, W + 200 * u, H + 200 * u);
    }
    wave(ctx, F, A, sent ? (k < 10 ? mix(C.accent, C.ink, k / 10) : C.ink) : rgba(C.ink, 0.5));
    // the field: already there on frame 0, settling in
    ctx.save();
    punchIn(ctx, F, cx, y + h / 2, 0.04);
    promptField(ctx, x, y, w, h, sent ? 0.95 * Math.exp(-k / 5) : 0);
    const ty = y + h / 2 + 22 * u;
    mono(ctx, ">", x + 44 * u, ty - 2 * u, { color: sent && k < 6 ? paper : C.accent, size: 44, track: 0 });
    const typed = PROMPT.slice(0, PROMPT.split("").filter((_, i) => F >= typedAt(i)).length);
    text(ctx, typed, x + 104 * u, ty, { ...typeO, color: sent ? rgba(pink, 0.55) : pink });
    const tw = measure(ctx, typed, typeO);
    if (!sent) caret(ctx, x + 112 * u + tw, ty + 12 * u, 66 * u, F < TYPE_TO + 2 ? 0 : F, C.accent, 5);
    enterKey(
      ctx,
      x + w - 90 * u,
      y + h / 2,
      sent ? 1 - 0.5 * prog(F, ENTER + 10, ENTER + 50) : 0,
      sent ? 1 + 0.14 * Math.exp(-k / 3) : 1,
    );
    ctx.restore();
    if (sent) {
      const p = ease.inOutCubic(prog(F, ENTER + 2, 158));
      mono(ctx, "WRITING", x + 8 * u, y + h + 50 * u, { alpha: prog(F, ENTER + 4, ENTER + 12) });
      mono(ctx, `${Math.round(p * 100)}%`, x + w - 8 * u, y + h + 50 * u, {
        align: "right",
        alpha: prog(F, ENTER + 4, ENTER + 12),
      });
    }
    if (bare) return;
    // the hum's words, tracked mono, lit as they are sung
    const st = setLine(ctx, 0, { family: F_.mono, weight: 500, size: 48 * u, track: 0.24 }, w, 1);
    ctx.save();
    ctx.globalAlpha = prog(F, ENTER - 6, ENTER + 2);
    drawSet(ctx, st, cx, y + h + (tall ? 190 : 150) * u, "center", F, { ink: C.ink, future: "ghost", ghost: 0.25 });
    ctx.restore();
  };

  // ---------------------------------------------------------------- 1 · "One prompt, one link, | a blinking line"
  const big1 = tall
    ? { x: 90 * u, y: 330 * u, w: W - 180 * u, h: 1110 * u }
    : { x: 120 * u, y: 150 * u, w: W - 240 * u, h: 780 * u };
  const verse1: Scene = (ctx, _env, F, bare = false) => {
    const t0 = frameOf(3, 0),
      f = F - t0;
    if (f < BAR) {
      // a: the field snaps huge and the words land in heavy caps across it
      const g = spring(f / FPS, { freq: 4.2, damp: 0.72 }),
        from = { x: cx - field0.w / 2, y: field0.y, w: field0.w, h: field0.h };
      const x = lerp(from.x, big1.x, g),
        y = lerp(from.y, big1.y, g),
        w = lerp(from.w, big1.w, g),
        h = lerp(from.h, big1.h, g);
      promptField(ctx, x, y, w, h);
      const pad = 70 * u;
      ctx.save();
      ctx.globalAlpha = prog(f, 3, 10);
      mono(ctx, "> PROMPT 01", x + pad, y + pad * 0.9, { color: C.accent, size: 24 });
      mono(ctx, "1 / 1", x + w - pad, y + pad * 0.9, { align: "right", size: 24, color: rgba(pink, 0.5) });
      mono(ctx, PROMPT, x + pad, y + h - pad * 0.7, { size: 26, track: 0.04, color: rgba(pink, 0.55) });
      enterGlyph(ctx, x + w - pad - 16 * u, y + h - pad * 0.7 - 9 * u, 32 * u, rgba(pink, 0.5), 2.8 * u);
      ctx.restore();
      if (bare) return;
      const st = setLine(
        ctx,
        barKs(3),
        { family: F_.sans, weight: 800, size: 250 * u, track: -0.012, upper: true, sx: 0.8, lead: 0.94, brk: [2] },
        big1.w - 2 * pad,
        tall ? 3 : 2,
      );
      const by = big1.y + (big1.h - blockH(st)) / 2 + st.size * 0.8;
      const end = drawSet(ctx, st, big1.x + pad, by, "left", F, {
        ink: pink,
        future: "hide",
        enter: (kk) => {
          const s = spring(kk / FPS, { freq: 3.4, damp: 0.62 });
          return { a: clamp(kk / 2), dy: -(1 - s) * st.size * 0.25, s: 1 + (1 - s) * 0.22 };
        },
      });
      if (f >= 2) caret(ctx, end.x + 18 * u, end.y + st.size * 0.02, st.size * 0.72, F, C.accent, 12);
      return;
    }
    // b: a hard cut to the end of the line: "A BLINKING LINE" giant, and the caret as a clay block
    const fb = f - BAR;
    ctx.save();
    punchIn(ctx, fb);
    glow(ctx, cx, cy, 900 * u, 0.12);
    mono(ctx, "> PROMPT 01", S.x + 20 * u, tall ? 330 * u : 170 * u, { color: C.accent, size: 24 });
    if (!bare) {
      const st = setLine(
        ctx,
        barKs(4),
        { family: F_.sans, weight: 800, size: 340 * u, track: -0.012, upper: true, sx: 0.78, lead: 0.9 },
        W - 2 * S.x - (tall ? 150 : 60) * u,
        tall ? 3 : 2,
      );
      const by = cy - blockH(st) / 2 + st.size * 0.78,
        lx = S.x + 20 * u;
      const end = drawSet(ctx, st, lx, by, "left", F, {
        ink: C.ink,
        future: "hide",
        enter: (kk) => {
          const s = spring(kk / FPS, { freq: 3.6, damp: 0.6 });
          return { a: clamp(kk / 2), dy: 0, s: 1 + (1 - s) * 0.3 };
        },
      });
      caret(ctx, end.x + 22 * u, end.y + st.size * 0.02, st.size * 0.72, F, C.accent, st.size * 0.1);
    }
    ctx.restore();
  };

  // ---------------------------------------------------------------- 2 · "It read the brief, | then it read the rules"
  const DOCS = [0, 1].map((d) => {
    const r = rng(310 + d);
    return Array.from({ length: 12 }, (_, i) => {
      const edge = i === 0 || i === 11;
      return { ind: edge ? 0 : 1 + Math.floor(r() * 2), k: 60 + r() * 110, v: 80 + r() * 260, edge, bullet: d === 1 };
    });
  });
  /** a paper document (the brief), drawn centred at 0,0; scan steps a clay highlight down its lines */
  const doc = (ctx: Ctx, d: number, w: number, h: number, scan: number, F: number, since: number) => {
    const x0 = -w / 2,
      y0 = -h / 2;
    ctx.save();
    ctx.shadowColor = rgba(C.deep, 0.6);
    ctx.shadowBlur = 50 * u;
    ctx.shadowOffsetY = 24 * u;
    rr(ctx, x0, y0, w, h, 14 * u);
    ctx.fillStyle = paper;
    ctx.fill();
    ctx.restore();
    mono(ctx, d ? "rules.md" : "brief.json", x0 + 40 * u, y0 + 58 * u, { color: pink, size: 24 });
    mono(ctx, d ? "02" : "01", -x0 - 40 * u, y0 + 58 * u, { align: "right", color: rgba(pink, 0.5), size: 24 });
    ctx.fillStyle = rgba(pink, 0.15);
    ctx.fillRect(x0 + 40 * u, y0 + 84 * u, w - 80 * u, 2 * u);
    const lines = DOCS[d],
      lh = (h - 140 * u) / lines.length,
      top = y0 + 120 * u;
    if (scan >= 0) {
      const i = Math.floor(scan),
        kk = ease.outCubic(clamp((scan - i) * 3)),
        hy = top + (Math.min(i, lines.length - 1) + (i < lines.length - 1 ? kk : 0)) * lh;
      ctx.fillStyle = rgba(C.accent, 0.32);
      ctx.fillRect(x0 + 20 * u, hy - lh * 0.1, w - 40 * u, lh * 0.8);
      ctx.fillStyle = C.accent;
      ctx.fillRect(x0 + 20 * u, hy - lh * 0.1, 6 * u, lh * 0.8);
    }
    lines.forEach((ln, i) => {
      const y = top + i * lh + lh * 0.3,
        lx = x0 + 100 * u + ln.ind * 34 * u;
      mono(ctx, String(i + 1).padStart(2, "0"), x0 + 40 * u, y + 8 * u, { color: rgba(pink, 0.45) });
      if (ln.edge && !ln.bullet) {
        text(ctx, i === 0 ? "{" : "}", x0 + 100 * u, y + 10 * u, {
          size: 30 * u,
          family: F_.mono,
          weight: 500,
          color: pink,
        });
      } else {
        const kw = Math.min(ln.k * u, w * 0.3);
        ctx.fillStyle = rgba(pink, 0.3);
        rr(ctx, lx, y - 7 * u, kw, 14 * u, 7 * u);
        ctx.fill();
        ctx.fillStyle = rgba(pink, 0.7);
        rr(ctx, lx + kw + 22 * u, y - 7 * u, Math.min(ln.v * u, x0 + w - 160 * u - (lx + kw + 22 * u)), 14 * u, 7 * u);
        ctx.fill();
      }
      if (i % 3 === 2 && scan >= i + 0.3) {
        const p = spring((F - since - (i + 0.3) * 6) / FPS, { freq: 3.2, damp: 0.55 });
        ctx.save();
        ctx.translate(x0 + w - 70 * u, y);
        ctx.scale(p, p);
        mono(ctx, "read", -26 * u, 8 * u, { align: "right", color: C.accent, size: 24 });
        tick(ctx, 4 * u, 0, 24 * u, clamp(p * 1.4), C.accent, 3.4 * u);
        ctx.restore();
      }
    });
  };
  /** the rules, full frame: a handful of lines as big as headlines, the highlight stepping on each beat */
  const docClose = (ctx: Ctx, F: number, fb: number) => {
    ctx.fillStyle = paper;
    ctx.fillRect(-80 * u, -80 * u, W + 160 * u, H + 160 * u);
    const lh = (tall ? 132 : 100) * u,
      top = (tall ? 860 : 560) * u,
      x0 = S.x + 20 * u,
      n = tall ? 5 : 4,
      lines = DOCS[1].slice(3, 3 + n);
    mono(ctx, "rules.md", x0, top - 70 * u, { color: pink, size: 30 });
    mono(ctx, "02", W - S.x - 20 * u, top - 70 * u, { color: rgba(pink, 0.5), size: 30, align: "right" });
    ctx.fillStyle = rgba(pink, 0.15);
    ctx.fillRect(x0, top - 44 * u, W - 2 * S.x - 40 * u, 3 * u);
    const scan = Math.min(n - 1, (fb / BEAT) * 1.1),
      i0 = Math.floor(scan),
      kk = ease.outCubic(clamp((scan - i0) * 4)),
      hy = top + (i0 + (i0 < n - 1 ? kk : 0)) * lh;
    ctx.fillStyle = rgba(C.accent, 0.3);
    ctx.fillRect(x0 - 20 * u, hy, W - 2 * S.x, lh * 0.82);
    ctx.fillStyle = C.accent;
    ctx.fillRect(x0 - 20 * u, hy, 10 * u, lh * 0.82);
    lines.forEach((ln, i) => {
      const y = top + i * lh + lh * 0.41;
      mono(ctx, String(i + 4).padStart(2, "0"), x0 + 14 * u, y + 13 * u, { color: rgba(pink, 0.45), size: 36 });
      const lx = x0 + 150 * u + ln.ind * 50 * u,
        kw = ln.k * 2.2 * u,
        vw = Math.min(ln.v * 2 * u, W - S.x - 260 * u - (lx + kw + 36 * u));
      ctx.fillStyle = pink;
      ctx.fillRect(lx - 40 * u, y - 5 * u, 16 * u, 10 * u);
      ctx.fillStyle = rgba(pink, 0.3);
      rr(ctx, lx, y - 18 * u, kw, 36 * u, 18 * u);
      ctx.fill();
      ctx.fillStyle = rgba(pink, 0.72);
      rr(ctx, lx + kw + 36 * u, y - 18 * u, vw, 36 * u, 18 * u);
      ctx.fill();
      if (scan >= i + 0.2) {
        const p = spring((fb - (i + 0.2) * (BEAT / 1.1)) / FPS, { freq: 3.4, damp: 0.5 });
        ctx.save();
        ctx.translate(W - S.x - 60 * u, y);
        ctx.scale(p, p);
        mono(ctx, "read", -40 * u, 12 * u, { align: "right", color: C.accent, size: 36 });
        tick(ctx, 8 * u, 0, 40 * u, clamp(p * 1.4), C.accent, 6 * u);
        ctx.restore();
      }
    });
  };
  const verse2: Scene = (ctx, _env, F, bare = false) => {
    const t0 = frameOf(5, 0),
      f = F - t0;
    if (f < BAR) {
      const dc = tall
        ? { x: cx, y: 1130 * u, w: 800 * u, h: 700 * u }
        : { x: 1380 * u, y: 550 * u, w: 660 * u, h: 820 * u };
      const g = spring(f / FPS, { freq: 3.2, damp: 0.72 });
      glow(ctx, dc.x, dc.y, 620 * u, 0.12);
      ctx.save();
      ctx.translate(dc.x + (1 - g) * 420 * u, dc.y + (1 - g) * 60 * u);
      ctx.rotate((-6 - (1 - g) * 10 + f * 0.03) * (Math.PI / 180));
      doc(ctx, 0, dc.w, dc.h, (f - 6) / 6, F, t0 + 6);
      ctx.restore();
      if (bare) return;
      const st = setLine(
        ctx,
        barKs(5),
        { family: F_.serif, size: (tall ? 150 : 150) * u, track: -0.015, lead: 1 },
        tall ? W - 2 * S.x : 820 * u,
        2,
      );
      drawSet(
        ctx,
        st,
        tall ? cx : 130 * u,
        tall ? 330 * u + st.size * 0.8 : cy - blockH(st) / 2 + st.size * 0.8,
        tall ? "center" : "left",
        F,
        {
          ink: C.ink,
          future: "ghost",
        },
      );
      return;
    }
    const fb = f - BAR;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-1.2 * (Math.PI / 180));
    ctx.translate(-cx, -cy);
    punchIn(ctx, fb, cx, cy, 0.08);
    docClose(ctx, F, fb);
    ctx.restore();
    if (bare) return;
    const st = setLine(
      ctx,
      barKs(6),
      { family: F_.serif, size: (tall ? 150 : 140) * u, track: -0.015, lead: 1, brk: [2] },
      W - 2 * S.x - 40 * u,
      tall ? 3 : 2,
    );
    drawSet(ctx, st, S.x + 20 * u, (tall ? 300 : 150) * u + st.size * 0.8, "left", F, {
      ink: pink,
      future: "ghost",
      ghost: 0.2,
    });
  };

  // ---------------------------------------------------------------- 3 · "Every frame a function, | no hidden state"
  type Topo = { halfW: number; hy: number; gy: number; hs: number; clip: number };
  const topoA: Topo = tall
    ? { halfW: 1200 * u, hy: 860 * u, gy: 1980 * u, hs: 1100 * u, clip: H - S.bottom - 40 * u }
    : { halfW: 1500 * u, hy: 420 * u, gy: 1240 * u, hs: 1050 * u, clip: H - S.bottom - 40 * u };
  // the low angle: the eye near the surface, the near hills filling the bottom of the frame
  const topoB: Topo = tall
    ? { halfW: 2100 * u, hy: 780 * u, gy: 2500 * u, hs: 2300 * u, clip: H - S.bottom - 40 * u }
    : { halfW: 2600 * u, hy: 380 * u, gy: 1560 * u, hs: 1900 * u, clip: H - S.bottom - 40 * u };
  const height = (x: number, z: number, t: number) => {
    const bx = 0.5 * Math.sin(t * 0.9),
      bz = 0.32 + 0.14 * Math.cos(t * 0.7);
    return (
      0.08 * Math.sin(3.1 * x + 1.3 * t) * Math.cos(4 * z - 0.8 * t) +
      0.3 * Math.exp(-((x - bx) ** 2 + ((z - bz) * 1.5) ** 2) / 0.05) +
      0.03 * Math.sin(9 * x - 6 * z + 2.4 * t)
    );
  };
  const projT = (T: Topo, x: number, z: number, h: number): [number, number] => {
    const d = 1 + 3.2 * z;
    return [cx + (x * T.halfW) / d, T.hy + (T.gy - T.hy) / d - (h * T.hs) / d];
  };
  const mesh = (ctx: Ctx, T: Topo, t: number, z0: number, z1: number, a: number) => {
    const NR = 38,
      NC = 70;
    ctx.lineWidth = 1.6 * u;
    for (let r = NR; r >= 0; r--) {
      const z = r / NR;
      if (z < z0 || z > z1) continue;
      ctx.strokeStyle = rgba(C.ink, a * (0.14 + 0.5 * (1 - z)));
      ctx.beginPath();
      for (let c = 0; c <= NC; c++) {
        const x = -1.3 + (2.6 * c) / NC,
          [px, py] = projT(T, x, z, height(x, z, t));
        if (c) ctx.lineTo(px, py);
        else ctx.moveTo(px, py);
      }
      ctx.stroke();
    }
    for (let c = 0; c <= NC; c += 3) {
      const x = -1.3 + (2.6 * c) / NC;
      ctx.strokeStyle = rgba(C.ink, a * 0.12);
      ctx.beginPath();
      for (let r = Math.floor(z0 * NR); r <= Math.ceil(z1 * NR); r++) {
        const z = r / NR,
          [px, py] = projT(T, x, z, height(x, z, t));
        if (r > z0 * NR) ctx.lineTo(px, py);
        else ctx.moveTo(px, py);
      }
      ctx.stroke();
    }
  };
  /** the same function as a lit, filled surface: far to near, each cell shaded by its height and slope */
  const terrain = (ctx: Ctx, T: Topo, t: number) => {
    const NR = 30,
      NC = 48,
      xs = (c: number) => -1.25 + (2.5 * c) / NC;
    ctx.lineWidth = 1.2 * u;
    for (let r = NR - 1; r >= 0; r--) {
      const za = (r + 1) / NR,
        zb = r / NR;
      for (let c = 0; c < NC; c++) {
        const xa = xs(c),
          xb = xs(c + 1),
          h00 = height(xa, za, t),
          h10 = height(xb, za, t),
          h01 = height(xa, zb, t),
          h11 = height(xb, zb, t);
        const light = clamp(0.3 + 2.1 * ((h00 + h10 + h01 + h11) / 4) + 0.3 * (1 - zb) + 2.2 * (h10 + h11 - h00 - h01));
        const col = mix(C.surface, C.ink, light * 0.92);
        const p = [projT(T, xa, za, h00), projT(T, xb, za, h10), projT(T, xb, zb, h11), projT(T, xa, zb, h01)];
        ctx.beginPath();
        ctx.moveTo(...p[0]);
        ctx.lineTo(...p[1]);
        ctx.lineTo(...p[2]);
        ctx.lineTo(...p[3]);
        ctx.closePath();
        ctx.fillStyle = col;
        ctx.fill();
        ctx.strokeStyle = rgba(C.deep, 0.35);
        ctx.stroke();
      }
    }
  };
  const rider = (ctx: Ctx, T: Topo, F: number, t: number, lift: number) => {
    const px = 0.55 * Math.sin(t * 1.1),
      pz = 0.2,
      [dx, dy] = projT(T, px, pz, height(px, pz, t));
    ctx.strokeStyle = rgba(C.accent, 0.8);
    ctx.lineWidth = 2.5 * u;
    ctx.setLineDash([6 * u, 8 * u]);
    ctx.beginPath();
    ctx.moveTo(dx, dy);
    ctx.lineTo(dx, dy - lift);
    ctx.stroke();
    ctx.setLineDash([]);
    glow(ctx, dx, dy, 70 * u, 0.55);
    ctx.fillStyle = C.accent;
    ctx.beginPath();
    ctx.arc(dx, dy, 11 * u, 0, TAU);
    ctx.fill();
    const right = dx > cx;
    mono(ctx, `f(${pad4(F)}) = ${height(px, pz, t).toFixed(3)}`, dx + (right ? -14 : 14) * u, dy - lift - 8 * u, {
      color: C.ink,
      size: 26,
      align: right ? "right" : "left",
    });
  };
  const verse3: Scene = (ctx, env, F, bare = false) => {
    const t0 = frameOf(7, 0),
      f = F - t0,
      t = F / FPS;
    if (f < BAR) {
      const rise = ease.outCubic(prog(f, 0, 16));
      ctx.save();
      ctx.beginPath();
      ctx.rect(-100 * u, -100 * u, W + 200 * u, topoA.clip + 100 * u);
      ctx.clip();
      ctx.translate(0, (1 - rise) * 160 * u);
      glow(ctx, cx, topoA.hy + 160 * u, 700 * u, 0.1);
      soft(ctx, env, 4, (c) => mesh(c, topoA, t, 0.5, 1, 1), 0.9);
      mesh(ctx, topoA, t, 0, 0.5, 1);
      rider(ctx, topoA, F, t, 120 * u);
      ctx.restore();
      mono(ctx, "f(frame) → pixels", tall ? cx : W - S.x - 70 * u, tall ? topoA.hy + 10 * u : topoA.hy - 28 * u, {
        align: tall ? "center" : "right",
        size: 26,
        track: 0.32,
        alpha: prog(f, 6, 16),
      });
      if (bare) return;
      const st = setLine(
        ctx,
        barKs(7),
        {
          family: F_.mono,
          weight: 500,
          size: (tall ? 84 : 84) * u,
          track: 0.06,
          upper: true,
          lead: 1.2,
          brk: tall ? [2] : [],
        },
        tall ? W - 2 * S.x : 1600 * u,
        2,
      );
      drawSet(ctx, st, cx, (tall ? 400 : 150) * u + st.size, "center", F, { ink: C.ink, future: "ghost", ghost: 0.2 });
      return;
    }
    // b: from a low angle, the function becomes ground you could stand on
    const fb = f - BAR;
    ctx.save();
    punchIn(ctx, fb, cx, H, 0.12);
    ctx.beginPath();
    ctx.rect(-100 * u, -100 * u, W + 200 * u, topoB.clip + 100 * u);
    ctx.clip();
    glow(ctx, cx, topoB.hy, 900 * u, 0.14);
    terrain(ctx, topoB, t);
    rider(ctx, topoB, F, t, 160 * u);
    ctx.restore();
    if (bare) return;
    const st = setLine(
      ctx,
      barKs(8),
      { family: F_.mono, weight: 500, size: (tall ? 120 : 118) * u, track: 0.06, upper: true, lead: 1.15 },
      W - 2 * S.x - 40 * u,
      tall ? 3 : 1,
    );
    drawSet(ctx, st, cx, (tall ? 330 : 150) * u + st.size * 0.9, "center", F, {
      ink: C.ink,
      future: "ghost",
      ghost: 0.22,
    });
  };

  // ---------------------------------------------------------------- 4 · "It drew the whole thing | out of code"
  type Stroke = [number, number][];
  const circ = (x: number, y: number, r: number, a0 = -Math.PI / 2, n = 48): Stroke =>
    Array.from({ length: n + 1 }, (_, i) => [
      x + r * Math.cos(a0 + (i / n) * TAU),
      y + r * Math.sin(a0 + (i / n) * TAU),
    ]);
  const CAMERA: Stroke[] = [
    [
      [-0.42, 0.0],
      [0.22, 0.0],
      [0.22, 0.34],
      [-0.42, 0.34],
      [-0.42, 0.0],
    ],
    circ(-0.28, -0.19, 0.16),
    circ(0.08, -0.21, 0.18),
    [
      [0.22, 0.07],
      [0.44, -0.02],
      [0.44, 0.36],
      [0.22, 0.27],
    ],
    [
      [0.36, 0.02],
      [0.36, 0.32],
    ],
    [
      [-0.52, 0.06],
      [-0.42, 0.06],
      [-0.42, 0.16],
      [-0.52, 0.16],
      [-0.52, 0.06],
    ],
    [
      [-0.1, 0.34],
      [-0.34, 0.84],
    ],
    [
      [-0.1, 0.34],
      [0.14, 0.84],
    ],
    [
      [-0.1, 0.34],
      [-0.1, 0.8],
    ],
    [
      [-0.34, 0.1],
      [-0.06, 0.1],
    ],
    [
      [-0.34, 0.16],
      [-0.16, 0.16],
    ],
    circ(-0.28, -0.19, 0.04),
    circ(0.08, -0.21, 0.045),
  ];
  const cam = tall ? { x: 560 * u, y: 1080 * u, s: 560 * u } : { x: cx + 20 * u, y: 590 * u, s: 440 * u };
  const arcC = tall ? { x: cx, y: 1480 * u, r: 1060 * u } : { x: cx, y: 1320 * u, r: 1040 * u };
  /** words set on a circle: each glyph placed on the arc and turned to it; top: centred at the top of the circle */
  const onArc = (ctx: Ctx, st: SetLine, ox: number, oy: number, R: number, F: number, row: number, a0 = 1) => {
    const to = opts(st.o, st.size),
      rw = st.rowW[row];
    for (const p of st.pieces) {
      if (p.row !== row) continue;
      const lit = litAt(p.k, F),
        col = lit < 0 ? C.ink : mix(C.ink, C.accent, lit),
        a = lit < 0 ? 0.22 : 1;
      let cxp = p.x;
      for (const ch of p.t) {
        const adv = measure(ctx, ch, to) + (st.o.track ?? 0) * st.size,
          ang = -Math.PI / 2 + (cxp + adv / 2 - rw / 2) / R;
        ctx.save();
        ctx.globalAlpha *= a * a0;
        ctx.translate(ox + R * Math.cos(ang), oy + R * Math.sin(ang));
        ctx.rotate(ang + Math.PI / 2);
        text(ctx, ch, 0, 0, { ...to, color: col, align: "center" });
        ctx.restore();
        cxp += adv;
      }
    }
  };
  const lensC = tall ? { x: cx, y: 1150 * u, r: 410 * u } : { x: cx, y: 630 * u, r: 330 * u };
  const lens = (ctx: Ctx, fb: number, F: number) => {
    const { x, y, r } = lensC,
      draw = ease.outCubic(prog(fb, 0, 6)),
      spin = fb * 0.01;
    glow(ctx, x, y, r * 2.2, 0.22 + 0.4 * Math.exp(-fb / 5));
    // the barrel: a bright ring with knurling
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = draw;
    ctx.fillStyle = C.ink;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.arc(0, 0, r * 0.6, 0, TAU, true);
    ctx.fill();
    ctx.strokeStyle = rgba(C.deep, 0.55);
    ctx.lineWidth = 4 * u;
    for (let i = 0; i < 72; i++) {
      const a = (i / 72) * TAU + spin;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.66, Math.sin(a) * r * 0.66);
      ctx.lineTo(Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.95);
      ctx.stroke();
    }
    // the glass, the aperture blades turning, a focus ring
    ctx.fillStyle = C.surface;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.6, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = rgba(C.ink, 0.8);
    ctx.lineWidth = 3 * u;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.5, 0, TAU);
    ctx.stroke();
    const open = r * (0.24 + 0.03 * Math.sin(F / 14)),
      blades = 7;
    ctx.fillStyle = rgba(C.ink, 0.3);
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 3 * u;
    for (let i = 0; i < blades; i++) {
      const a = (i / blades) * TAU - spin * 3,
        b = a + TAU / blades;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * open, Math.sin(a) * open);
      ctx.lineTo(Math.cos(b) * open, Math.sin(b) * open);
      ctx.lineTo(Math.cos(b + 0.5) * r * 0.5, Math.sin(b + 0.5) * r * 0.5);
      ctx.arc(0, 0, r * 0.5, b + 0.5, a + 0.5, true);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    // a glint, and the record light in clay
    ctx.strokeStyle = rgba(C.ink, 0.6);
    ctx.lineWidth = 8 * u;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.4, -2.5, -1.9);
    ctx.stroke();
    glow(ctx, r * 0.08, -r * 0.06, r * 0.3, 0.7);
    ctx.fillStyle = C.accent;
    ctx.beginPath();
    ctx.arc(r * 0.08, -r * 0.06, r * 0.07, 0, TAU);
    ctx.fill();
    ctx.restore();
  };
  const verse4: Scene = (ctx, _env, F, bare = false) => {
    const t0 = frameOf(9, 0),
      f = F - t0;
    if (f < BAR) {
      glow(ctx, cam.x, cam.y + 0.1 * cam.s, 560 * u, 0.13);
      ctx.save();
      ctx.translate(cam.x, cam.y);
      ctx.scale(cam.s, cam.s);
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = (3.6 * u) / cam.s;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      const each = 4.5,
        dur = 12;
      CAMERA.forEach((st, i) => drawOn(ctx, st, ease.inOutCubic(prog(f, i * each, i * each + dur))));
      const spin = f * 0.08;
      [
        [-0.28, -0.19, 0.13],
        [0.08, -0.21, 0.15],
      ].forEach(([x, y, r], j) => {
        const p = prog(f, (1 + j) * each + dur, (1 + j) * each + dur + 8);
        if (p <= 0) return;
        ctx.globalAlpha = p;
        ctx.beginPath();
        for (let s = 0; s < 3; s++) {
          const a = spin * (j ? 0.9 : 1.1) + (s * TAU) / 3;
          ctx.moveTo(x + Math.cos(a) * r * 0.35, y + Math.sin(a) * r * 0.35);
          ctx.lineTo(x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.9);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
      });
      const done = CAMERA.length * each + dur;
      if (f > done && Math.floor((f - done) / 10) % 2 === 0) {
        glow(ctx, 0.14, 0.06, 0.12, 0.6);
        ctx.fillStyle = C.accent;
        ctx.beginPath();
        ctx.arc(0.14, 0.06, 0.022, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
      if (bare) return;
      const st = setLine(
        ctx,
        barKs(9),
        { family: F_.sans, weight: 600, size: (tall ? 96 : 92) * u, track: -0.01 },
        (tall ? 900 : 1200) * u,
        1,
      );
      for (let r = 0; r < st.rowW.length; r++)
        onArc(ctx, st, arcC.x, arcC.y, arcC.r - r * 112 * u, F, r, prog(f, 0, 6));
      return;
    }
    // b: the lens, close; "out of code" wraps around it
    const fb = f - BAR;
    ctx.save();
    punchIn(ctx, fb, lensC.x, lensC.y, 0.14);
    lens(ctx, fb, F);
    ctx.restore();
    // the shutter fires on the cut: a white flash, gone in a few frames
    ctx.fillStyle = rgba(C.ink, 0.28 * Math.exp(-fb / 3));
    ctx.fillRect(-100 * u, -100 * u, W + 200 * u, H + 200 * u);
    if (bare) return;
    const st = setLine(
      ctx,
      barKs(10),
      { family: F_.sans, weight: 600, size: (tall ? 120 : 110) * u, track: 0.02 },
      2000 * u,
      1,
    );
    onArc(ctx, st, lensC.x, lensC.y, lensC.r + (tall ? 120 : 100) * u, F, 0);
  };

  // ---------------------------------------------------------------- 5 · "Oh, Opus, | five point five": the odometer
  const numerals = (ctx: Ctx, v: number, speed: number, x: number, y: number, sz: number, col: string) => {
    const o = { size: sz, family: F_.sans, weight: 800, track: 0 },
      dw = measure(ctx, "0", o) * 1.02,
      pw = measure(ctx, ".", o) * 1.1,
      total = dw * 2 + pw,
      left = x - total / 2,
      lh = sz * 1.05;
    const tenths = v * 10,
      ones = Math.floor(v + 1e-9) + clamp((tenths % 10) - 9);
    const wheel = (pos: number, wx: number, blur: number) => {
      ctx.save();
      ctx.beginPath();
      ctx.rect(wx - 10 * u, y - sz * 0.9, dw + 20 * u, sz * 1.02);
      ctx.clip();
      const base = Math.floor(pos),
        fr = pos - base;
      for (let d = -1; d <= 2; d++) {
        const digit = (((base + d) % 10) + 10) % 10,
          dy = (d - fr) * lh,
          copies = blur > 0.02 ? 3 : 1;
        for (let c = 0; c < copies; c++)
          text(ctx, String(digit), wx + dw / 2, y + dy + (c - (copies - 1) / 2) * blur * lh * 0.35, {
            ...o,
            color: col,
            align: "center",
            alpha: copies > 1 ? 0.45 : 1,
          });
      }
      ctx.restore();
    };
    wheel(ones, left, speed * 0.1);
    text(ctx, ".", left + dw + pw / 2, y, { ...o, color: col, align: "center" });
    wheel(tenths, left + dw + pw, speed);
    return { left, total };
  };
  const odoVal = (F: number) => 5.5 * ease.inOutCubic(prog(F, frameOf(11, 0) + 4, LOCK));
  const chorus1: Scene = (ctx, _env, F, bare = false) => {
    if (F < LOCK) {
      const odo = tall ? { size: 440 * u, y: 1250 * u } : { size: 480 * u, y: 880 * u };
      const v = odoVal(F),
        speed = Math.abs(odoVal(F + 0.5) - odoVal(F - 0.5)) * 10;
      glow(ctx, cx, odo.y - odo.size * 0.38, 640 * u, 0.14);
      const { left, total } = numerals(ctx, v, speed, cx, odo.y, odo.size, C.ink);
      ctx.fillStyle = rgba(C.ink, 0.14);
      ctx.fillRect(left - 40 * u, odo.y + 40 * u, total + 80 * u, 2 * u);
      mono(ctx, `LOCK @ ${pad4(LOCK)}`, left - 40 * u, odo.y + 80 * u, { size: 24 });
      mono(ctx, v.toFixed(2), left + total + 40 * u, odo.y + 80 * u, { align: "right", size: 24 });
      if (bare) return;
      const st = setLine(
        ctx,
        barKs(11),
        { family: F_.italic, size: (tall ? 190 : 170) * u, track: -0.01, lead: 1 },
        W - 2 * S.x - 40 * u,
        1,
      );
      drawSet(ctx, st, cx, (tall ? 480 : 130) * u + st.size * 0.8, "center", F, {
        ink: C.ink,
        future: "ghost",
        ghost: 0.24,
      });
      return;
    }
    // b: the lock, huge: the digits fill the frame and flash on the downbeat
    const k = F - LOCK,
      flash = Math.exp(-k / 6),
      big = tall ? { size: 600 * u, y: 1420 * u } : { size: 760 * u, y: 960 * u };
    ctx.save();
    punchIn(ctx, k, cx, big.y - big.size * 0.36, 0.12);
    glow(ctx, cx, big.y - big.size * 0.38, (760 + 300 * flash) * u, 0.18 + 0.3 * flash);
    numerals(ctx, 5.5, 0, cx, big.y, big.size, mix(C.ink, C.accent, clamp(1 - k / 50)));
    ctx.strokeStyle = rgba(C.accent, flash * 0.8);
    ctx.lineWidth = 4 * u;
    ctx.beginPath();
    ctx.arc(cx, big.y - big.size * 0.38, (300 + (1 - flash) * 700) * u, 0, TAU);
    ctx.stroke();
    ctx.restore();
    if (flash > 0.01) {
      ctx.fillStyle = rgba(C.ink, 0.25 * flash);
      ctx.fillRect(-100 * u, -100 * u, W + 200 * u, H + 200 * u);
    }
    if (bare) return;
    const st = setLine(
      ctx,
      barKs(12),
      { family: F_.italic, size: (tall ? 170 : 150) * u, track: -0.01, lead: 1 },
      W - 2 * S.x - 40 * u,
      tall ? 2 : 1,
    );
    drawSet(ctx, st, cx, (tall ? 330 : 130) * u + st.size * 0.8, "center", F, {
      ink: C.ink,
      future: "ghost",
      ghost: 0.24,
    });
  };

  // ---------------------------------------------------------------- 6 · "Draw it in code | tonight": streaming code
  const TOKENS = [
    "ctx.arc(",
    "spring(",
    "frame",
    "lerp(a, b, t)",
    "ease.out",
    "rng(25)",
    "moveTo(",
    "fillRect(",
    "prog(f,",
    "return",
    "const",
  ];
  const COLS = Array.from({ length: 9 }, (_, c) => {
    const r = rng(960 + c);
    return {
      far: c % 2 === 1,
      x: (c + 0.3 * r()) / 9,
      speed: c % 2 ? 1.1 : 2.1 + r(),
      lines: Array.from({ length: 34 }, () => ({
        ind: Math.floor(r() * 3),
        segs: Array.from({ length: 1 + Math.floor(r() * 3) }, () =>
          r() < 0.16 ? { tok: TOKENS[Math.floor(r() * TOKENS.length)], w: 0 } : { tok: "", w: 30 + r() * 120 },
        ),
      })),
    };
  });
  const codeCols = (ctx: Ctx, F: number, far: boolean, a: number, ink = C.ink) => {
    const lh = (far ? 30 : 44) * u,
      span = 34 * lh;
    for (const col of COLS) {
      if (col.far !== far) continue;
      const x0 = col.x * W,
        off = (F * col.speed * u) % span;
      col.lines.forEach((ln, i) => {
        let y = i * lh - off;
        if (y < -lh) y += span;
        if (y > H + lh) return;
        const edge = clamp((y - hudTop - 30 * u) / (90 * u)) * clamp((hudBot - 40 * u - y) / (90 * u));
        if (edge <= 0) return;
        ctx.save();
        ctx.globalAlpha *= edge;
        let x = x0 + ln.ind * 26 * u;
        for (const sg of ln.segs) {
          if (sg.tok) {
            if (far) {
              ctx.fillStyle = rgba(ink, 0.25 * a);
              rr(ctx, x, y - 6 * u, sg.tok.length * 10 * u, 10 * u, 5 * u);
              ctx.fill();
              x += sg.tok.length * 10 * u + 14 * u;
            } else {
              const w = mono(ctx, sg.tok, x, y + 8 * u, { size: 24, color: ink, alpha: 0.55 * a, track: 0 });
              x += w + 16 * u;
            }
          } else {
            const w = sg.w * (far ? 0.6 : 1) * u;
            ctx.fillStyle = rgba(ink, (far ? 0.18 : 0.2) * a);
            rr(ctx, x, y - (far ? 5 : 7) * u, w, (far ? 10 : 14) * u, 7 * u);
            ctx.fill();
            x += w + 14 * u;
          }
        }
        ctx.restore();
      });
    }
  };
  const curvePt = (t: number, base: number, amp: number): [number, number] => [
    lerp(-80 * u, W + 80 * u, t),
    base - amp * Math.sin(Math.PI * 1.7 * t + 0.4) * (0.75 + 0.25 * Math.cos(5 * t)),
  ];
  const chorus2: Scene = (ctx, env, F, bare = false) => {
    const f = F - frameOf(13, 0);
    soft(ctx, env, 3, (c) => codeCols(c, F, true, 1), 0.9);
    codeCols(ctx, F, false, 1);
    if (f < BAR) {
      const ly = tall ? 560 * u : 300 * u,
        g = ctx.createLinearGradient(0, ly - 260 * u, 0, ly + 260 * u);
      g.addColorStop(0, rgba(C.ground, 0));
      g.addColorStop(0.5, rgba(C.ground, 0.92));
      g.addColorStop(1, rgba(C.ground, 0));
      ctx.fillStyle = g;
      ctx.fillRect(-100 * u, ly - 260 * u, W + 200 * u, 520 * u);
      const p = ease.inOutCubic(prog(f, 2, BAR)),
        n = 160,
        base = tall ? 1250 * u : 740 * u,
        amp = (tall ? 210 : 170) * u;
      ctx.strokeStyle = C.accent;
      ctx.lineWidth = 7 * u;
      ctx.lineCap = "round";
      ctx.beginPath();
      for (let i = 0; i <= n * p; i++) {
        const [x, y] = curvePt(i / n, base, amp);
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      ctx.stroke();
      if (p > 0 && p < 1) {
        const [hx2, hy] = curvePt(p, base, amp);
        glow(ctx, hx2, hy, 120 * u, 0.55);
        ctx.fillStyle = C.accent;
        ctx.beginPath();
        ctx.arc(hx2, hy, 12 * u, 0, TAU);
        ctx.fill();
      }
      if (bare) return;
      const st = setLine(
        ctx,
        barKs(13),
        { family: F_.sans, weight: 800, size: (tall ? 170 : 160) * u, track: -0.035, lead: 1, brk: tall ? [2] : [] },
        W - 2 * S.x - 40 * u,
        tall ? 2 : 1,
      );
      drawSet(ctx, st, cx, ly - blockH(st) / 2 + st.size * 0.8, "center", F, {
        ink: C.ink,
        future: "ghost",
        ghost: 0.2,
      });
      return;
    }
    // b: the curve has crossed the frame; everything under it floods clay, the code showing through
    const fb = f - BAR,
      rise = (1 - spring(fb / FPS, { freq: 3, damp: 0.6 })) * 90 * u,
      base = (tall ? 1180 : 800) * u + rise,
      amp = (tall ? 230 : 180) * u,
      n = 120;
    const flood = () => {
      ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        const [x, y] = curvePt(i / n, base, amp);
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      ctx.lineTo(W + 200 * u, H + 200 * u);
      ctx.lineTo(-200 * u, H + 200 * u);
      ctx.closePath();
    };
    ctx.save();
    flood();
    ctx.fillStyle = C.accent;
    ctx.fill();
    ctx.clip();
    codeCols(ctx, F + 40, false, 1, C.deep);
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const [x, y] = curvePt(i / n, base, amp);
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 5 * u;
    ctx.stroke();
    ctx.restore();
    if (bare) return;
    const st = setLine(
      ctx,
      barKs(14),
      { family: F_.sans, weight: 800, size: (tall ? 260 : 280) * u, track: -0.04, lead: 1 },
      W - 2 * S.x - 40 * u,
      1,
    );
    ctx.save();
    punchIn(ctx, fb, cx, (tall ? 560 : 330) * u, 0.18);
    const g = ctx.createRadialGradient(cx, (tall ? 520 : 300) * u, 0, cx, (tall ? 520 : 300) * u, 700 * u);
    g.addColorStop(0, rgba(C.ground, 0.9));
    g.addColorStop(1, rgba(C.ground, 0));
    ctx.fillStyle = g;
    ctx.fillRect(-100 * u, 0, W + 200 * u, (tall ? 1000 : 640) * u);
    drawSet(ctx, st, cx, (tall ? 600 : 400) * u, "center", F, { ink: C.ink, future: "ghost", ghost: 0.22 });
    ctx.restore();
  };

  // ---------------------------------------------------------------- 7 · "Every frame | a function": the contact strip
  const THUMBS: [number, number][] = [
    [0, 40],
    [1, 200],
    [1, 280],
    [2, 360],
    [2, 440],
    [3, 520],
    [3, 600],
    [4, 690],
    [4, 760],
    [5, 850],
  ];
  const strip = tall ? { y: 900 * u, th: 440 * u, v: 4.4 * u } : { y: 480 * u, th: 250 * u, v: 6 * u };
  const PICK = 4; // the frame under the playhead when the strip stops: blown up in the second bar
  const chorus3: Scene = (ctx, env, F, bare = false) => {
    const f = F - frameOf(15, 0);
    if (f < BAR) {
      const tw = (strip.th * W) / H,
        gap = 30 * u,
        sh = strip.th + 110 * u,
        sy = strip.y,
        slide = cx - tw / 2 - PICK * (tw + gap) + (BAR - f) * strip.v * ease.outCubic(1 - f / BAR) ** 0.3;
      glow(ctx, cx, sy + sh / 2, 800 * u, 0.1);
      ctx.fillStyle = C.surface;
      ctx.fillRect(-100 * u, sy, W + 200 * u, sh);
      ctx.fillStyle = C.ground;
      const sp = 44 * u;
      for (let x = (slide % sp) - sp - 100 * u; x < W + 100 * u; x += sp) {
        rr(ctx, x, sy + 16 * u, 22 * u, 22 * u, 5 * u);
        ctx.fill();
        rr(ctx, x, sy + sh - 38 * u, 22 * u, 22 * u, 5 * u);
        ctx.fill();
      }
      THUMBS.forEach(([sc, fr], i) => {
        const x = slide + i * (tw + gap),
          y = sy + 55 * u;
        if (x > W + 100 * u || x + tw < -100 * u) return;
        const mid = Math.abs(x + tw / 2 - cx) < (tw + gap) / 2;
        ctx.save();
        rr(ctx, x, y, tw, strip.th, 6 * u);
        ctx.clip();
        ctx.fillStyle = C.ground;
        ctx.fillRect(x, y, tw, strip.th);
        ctx.translate(x, y);
        ctx.scale(tw / W, strip.th / H);
        SCENES[sc](ctx, env, fr, true);
        ctx.restore();
        rr(ctx, x, y, tw, strip.th, 6 * u);
        ctx.strokeStyle = mid ? C.accent : rgba(C.ink, 0.12);
        ctx.lineWidth = (mid ? 5 : 2) * u;
        ctx.stroke();
        mono(ctx, pad4(fr), x + 4 * u, y + strip.th + 34 * u, { color: mid ? C.ink : C.muted });
      });
      ctx.fillStyle = C.accent;
      ctx.fillRect(cx - 2 * u, sy - 26 * u, 4 * u, sh + 52 * u);
      ctx.beginPath();
      ctx.moveTo(cx - 14 * u, sy - 32 * u);
      ctx.lineTo(cx + 14 * u, sy - 32 * u);
      ctx.lineTo(cx, sy - 14 * u);
      ctx.fill();
      const nn = Math.round(lerp(1, 1920, ease.inOutCubic(prog(f, 0, BAR)))),
        cy2 = sy - (tall ? 90 : 70) * u,
        o = { size: (tall ? 46 : 48) * u, family: F_.mono, weight: 500, track: 0.06 };
      const s1 = "FRAME ",
        s2 = pad4(nn),
        s3 = " → 1920",
        w1 = measure(ctx, s1, o) + o.track * o.size,
        w2 = measure(ctx, s2, o) + o.track * o.size,
        w3 = measure(ctx, s3, o),
        lx = cx - (w1 + w2 + w3) / 2;
      text(ctx, s1, lx, cy2, { ...o, color: C.muted });
      text(ctx, s2, lx + w1, cy2, { ...o, color: C.ink });
      text(ctx, s3, lx + w1 + w2, cy2, { ...o, color: C.muted });
      if (bare) return;
      const st = setLine(
        ctx,
        barKs(15),
        { family: F_.sans, weight: 400, size: (tall ? 170 : 160) * u, track: -0.03, lead: 1 },
        W - 2 * S.x - 40 * u,
        tall ? 2 : 1,
      );
      drawSet(ctx, st, cx, (tall ? 360 : 120) * u + st.size * 0.8, "center", F, {
        ink: C.ink,
        future: "ghost",
        ghost: 0.22,
      });
      return;
    }
    // b: the frame under the playhead, blown up in a film gate
    const fb = f - BAR,
      [sc, fr] = THUMBS[PICK],
      gw = (tall ? 520 : 1180) * u,
      gh = (gw * H) / W,
      gx = cx - gw / 2,
      gy = (tall ? 290 : 120) * u;
    ctx.save();
    punchIn(ctx, fb, cx, gy + gh / 2, 0.1);
    ctx.fillStyle = C.surface;
    ctx.fillRect(gx - 40 * u, gy - 40 * u, gw + 80 * u, gh + 80 * u);
    ctx.fillStyle = C.ground;
    for (let y = gy - 20 * u; y < gy + gh + 20 * u; y += 44 * u) {
      rr(ctx, gx - 30 * u, y, 18 * u, 22 * u, 4 * u);
      ctx.fill();
      rr(ctx, gx + gw + 12 * u, y, 18 * u, 22 * u, 4 * u);
      ctx.fill();
    }
    ctx.save();
    ctx.beginPath();
    ctx.rect(gx, gy, gw, gh);
    ctx.clip();
    ctx.fillStyle = C.ground;
    ctx.fillRect(gx, gy, gw, gh);
    const zoom = 1.25 + 0.04 * prog(fb, 0, BAR);
    ctx.translate(gx + gw / 2, gy + gh / 2);
    ctx.scale((gw / W) * zoom, (gh / H) * zoom);
    ctx.translate(-W / 2, -H / 2);
    SCENES[sc](ctx, env, fr, true);
    ctx.restore();
    ctx.strokeStyle = C.accent;
    ctx.lineWidth = 5 * u;
    ctx.strokeRect(gx, gy, gw, gh);
    rr(ctx, gx + 20 * u, gy + 20 * u, 230 * u, 50 * u, 8 * u);
    ctx.fillStyle = rgba(C.deep, 0.85);
    ctx.fill();
    mono(ctx, `FRAME ${pad4(fr)}`, gx + 38 * u, gy + 54 * u, { color: C.ink, size: 26 });
    ctx.restore();
    if (bare) return;
    const st = setLine(
      ctx,
      barKs(16),
      { family: F_.sans, weight: 400, size: (tall ? 170 : 150) * u, track: -0.03, lead: 1 },
      W - 2 * S.x - 40 * u,
      tall ? 2 : 1,
    );
    drawSet(ctx, st, cx, gy + gh + (tall ? 230 : 190) * u, "center", F, { ink: C.ink, future: "ghost", ghost: 0.22 });
  };

  // ---------------------------------------------------------------- 8 · "Same pixels | every time": the form and the stamp
  const SPECK_STAMP = (() => {
    const r = rng(1420);
    return Array.from({ length: 170 }, () => [r() - 0.5, r() - 0.5, 0.6 + r() * r() * 3.2] as [number, number, number]);
  })();
  const stamp = (ctx: Ctx, x: number, y: number, s: number, rot: number, k: number, seed: number) => {
    if (k < 0) return;
    const sc = k < 3 ? lerp(1.6, 1, ease.outCubic(k / 3)) : 1,
      a = k < 3 ? clamp(0.5 + k / 3) : 1;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(sc * s, sc * s);
    ctx.globalAlpha *= a * 0.94;
    const w = 300,
      h = 124;
    ctx.strokeStyle = C.accent;
    ctx.lineWidth = 9;
    rr(ctx, -w / 2, -h / 2, w, h, 14);
    ctx.stroke();
    ctx.lineWidth = 3;
    rr(ctx, -w / 2 + 14, -h / 2 + 14, w - 28, h - 28, 8);
    ctx.stroke();
    text(ctx, "SAME", 0, 34, { size: 92, family: F_.sans, weight: 800, color: C.accent, align: "center", track: 0.1 });
    ctx.globalAlpha = 1;
    ctx.fillStyle = paper;
    SPECK_STAMP.forEach(([sx, sy, r], i) => {
      if (hash(i, seed) < 0.35) return;
      ctx.beginPath();
      ctx.arc(sx * (w + 16), sy * (h + 16), r, 0, TAU);
      ctx.fill();
    });
    ctx.restore();
  };
  const FW = 720,
    FH = 840;
  /** the form, in its own 720 × 840 units; wr: how far each field is written (0..1), ck: checks, sg: signature */
  const form = (ctx: Ctx, wr: number[], ck: number[], sg: number) => {
    ctx.save();
    ctx.shadowColor = rgba(C.deep, 0.3);
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 16;
    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, FW, FH);
    ctx.restore();
    ctx.fillStyle = pink;
    ctx.fillRect(0, 0, FW, 116);
    text(ctx, "GOLDEN CHECK · FORM 5.5", 40, 72, {
      size: 38,
      family: F_.sans,
      weight: 800,
      color: paper,
      track: -0.01,
    });
    const lab = (s: string, x: number, y: number, align: CanvasTextAlign = "left") =>
      text(ctx, s, x, y, { size: 29, family: F_.mono, weight: 500, color: rgba(pink, 0.6), track: 0.08, align });
    lab("SHEET 01", 40, 160);
    lab("STUDIO USE", FW - 40, 160, "right");
    const fields: [string, string][] = [
      ["PIECE", "five point five"],
      ["FRAMES", "1920"],
      ["SIZE", `${W} × ${H}`],
    ];
    fields.forEach(([l, v], i) => {
      const y = 250 + i * 88;
      lab(l, 40, y);
      ctx.fillStyle = rgba(pink, 0.25);
      ctx.fillRect(200, y + 12, FW - 240, 2);
      if (wr[i] > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(200, y - 60, (FW - 240) * wr[i], 90);
        ctx.clip();
        text(ctx, v, 210, y + 2, { size: 50, family: F_.italic, color: pink });
        ctx.restore();
      }
    });
    ["Render A", "Render B", "Pixels match"].forEach((l, i) => {
      const y = 530 + i * 64;
      ctx.strokeStyle = pink;
      ctx.lineWidth = 3;
      ctx.strokeRect(40, y - 28, 36, 36);
      text(ctx, l, 98, y, { size: 30, family: F_.sans, weight: 600, color: pink, track: -0.01 });
      tick(ctx, 58, y - 12, 34, ck[i], pink, 6);
    });
    lab("CHECKED BY", 40, 790);
    ctx.fillStyle = rgba(pink, 0.25);
    ctx.fillRect(250, 800, 260, 2);
    if (sg > 0) {
      ctx.strokeStyle = pink;
      ctx.lineWidth = 3.5;
      ctx.lineCap = "round";
      const pts: [number, number][] = Array.from({ length: 60 }, (_, i) => {
        const t = i / 59;
        return [260 + t * 230, 786 - 20 * Math.sin(t * 17) * (1 - t * 0.6) - 8 * Math.sin(t * 5)];
      });
      drawOn(ctx, pts, sg);
    }
  };
  const formBox = tall ? { x: cx, y: 1130 * u, s: 0.98 * u } : { x: 1330 * u, y: 540 * u, s: 0.98 * u };
  const bandH = (tall ? 870 : 480) * u; // the close-up's dark band (the form's header, filling the frame)
  const chorus4: Scene = (ctx, _env, F, bare = false) => {
    const t0 = frameOf(17, 0),
      f = F - t0;
    if (f < BAR) {
      const enter = spring(f / FPS, { freq: 3.6, damp: 0.7 });
      const wr = [prog(f, 2, 14), prog(f, 14, 24), prog(f, 24, 36)],
        ck = [prog(f, 40, 46), prog(f, 60, 66), 0],
        sg = ease.inOutCubic(prog(f, 62, 78));
      ctx.save();
      ctx.translate(formBox.x, formBox.y + (1 - enter) * 220 * u);
      ctx.rotate((2 - (1 - enter) * 6 + f * 0.01) * (Math.PI / 180));
      ctx.scale(formBox.s, formBox.s);
      ctx.translate(-FW / 2, -FH / 2);
      form(ctx, wr, ck, sg);
      ctx.restore();
      if (bare) return;
      const st = setLine(
        ctx,
        barKs(17),
        { family: F_.sans, weight: 800, size: (tall ? 190 : 180) * u, track: -0.01, upper: true, sx: 0.84, lead: 0.96 },
        tall ? W - 2 * S.x : 800 * u,
        2,
      );
      drawSet(
        ctx,
        st,
        tall ? cx : 130 * u,
        tall ? 330 * u + st.size * 0.8 : cy - blockH(st) / 2 + st.size * 0.8,
        tall ? "center" : "left",
        F,
        {
          ink: pink,
          future: "ghost",
          ghost: 0.18,
        },
      );
      return;
    }
    // b: close on the form: the header band fills the top, the last box ticks huge, and the stamp slams
    const fb = f - BAR,
      k = F - STAMPS[0],
      shake = k >= 0 ? 10 * u * Math.exp(-k / 3) * Math.sin(k * 2.2) : 0;
    ctx.save();
    ctx.translate(0, shake);
    punchIn(ctx, fb, cx, bandH, 0.08);
    ctx.fillStyle = paper;
    ctx.fillRect(-100 * u, -100 * u, W + 200 * u, H + 200 * u);
    ctx.fillStyle = pink;
    ctx.fillRect(-100 * u, -100 * u, W + 200 * u, bandH + 100 * u);
    const st = setLine(
      ctx,
      barKs(18),
      { family: F_.sans, weight: 800, size: (tall ? 230 : 240) * u, track: -0.01, upper: true, sx: 0.84, lead: 0.92 },
      W - 2 * S.x - 40 * u,
      tall ? 2 : 1,
    );
    const ly = bandH - 60 * u - (st.rowW.length - 1) * st.size * st.lead;
    mono(ctx, "GOLDEN CHECK · FORM 5.5", S.x + 20 * u, ly - st.size * 0.8 - 34 * u, {
      color: rgba(paper, 0.6),
      size: 30,
    });
    const bx = S.x + 40 * u,
      by = bandH + (tall ? 170 : 120) * u,
      bs = (tall ? 170 : 150) * u;
    ctx.strokeStyle = pink;
    ctx.lineWidth = 10 * u;
    ctx.strokeRect(bx, by, bs, bs);
    tick(ctx, bx + bs * 0.5, by + bs * 0.48, bs * 0.95, prog(fb, 3, 12), pink, 22 * u);
    text(ctx, "Pixels match", bx + bs + 50 * u, by + bs * 0.72, {
      size: (tall ? 84 : 96) * u,
      family: F_.sans,
      weight: 600,
      color: pink,
      track: -0.02,
    });
    stamp(
      ctx,
      tall ? cx + 40 * u : W - 520 * u,
      tall ? by + bs + 190 * u : by + bs / 2 + 40 * u,
      (tall ? 2.3 : 2.2) * u,
      -0.14,
      k,
      4,
    );
    ctx.restore();
    if (bare) return;
    ctx.save();
    ctx.translate(0, shake);
    drawSet(ctx, st, S.x + 20 * u, ly, "left", F, {
      ink: paper,
      future: "ghost",
      ghost: 0.22,
    });
    ctx.restore();
  };

  // ---------------------------------------------------------------- 9 · bridge: "It checked its work / it checked it twice"
  const stack = tall
    ? { x: cx, y: 1000 * u, s: 0.7 * u, dy: 270 * u, dx: -40 * u }
    : { x: 1330 * u, y: 420 * u, s: 0.66 * u, dy: 250 * u, dx: -60 * u };
  const bridge: Scene = (ctx, _env, F, bare = false) => {
    const t0 = frameOf(19, 0),
      f = F - t0,
      full = [1, 1, 1];
    glow(ctx, stack.x, stack.y + stack.dy / 2, 700 * u, 0.12);
    const sheets = [
      {
        x: stack.x + 40 * u,
        y: stack.y + 10 * u,
        rot: 5,
        at: -999,
        stamp: STAMPS[0],
        sx: 490,
        sy: 690,
        srot: -0.12,
        seed: 1,
      },
      { x: stack.x, y: stack.y, rot: -3, at: -999, stamp: STAMPS[1], sx: 500, sy: 240, srot: -0.22, seed: 2 },
      {
        x: stack.x + stack.dx,
        y: stack.y + stack.dy,
        rot: 3,
        at: BAR,
        stamp: STAMPS[2],
        sx: 250,
        sy: 640,
        srot: 0.16,
        seed: 3,
      },
    ];
    sheets.forEach((sh, i) => {
      const fa = f - sh.at;
      if (sh.at > 0 && fa < 0) return;
      // the third sheet is dropped onto the stack on the bar line: it lands, it does not slide
      const drop = sh.at > 0 ? 1 + 0.16 * (1 - spring(fa / FPS, { freq: 3.6, damp: 0.55 })) : 1;
      const k = F - sh.stamp,
        shake = k >= 0 && k < 20 ? 7 * u * Math.exp(-k / 3) * Math.sin(k * 2.2) : 0;
      ctx.save();
      ctx.translate(sh.x, sh.y + shake);
      ctx.rotate((sh.rot * Math.PI) / 180);
      ctx.scale(stack.s * drop, stack.s * drop);
      ctx.translate(-FW / 2, -FH / 2);
      form(ctx, full, full, 1);
      stamp(ctx, sh.sx, sh.sy, 0.95, sh.srot, i === 0 ? 99 : k, sh.seed);
      ctx.restore();
    });
    if (bare) return;
    const size = (tall ? 124 : 118) * u,
      sets = [9, 10].map((li) =>
        setLine(ctx, li, { family: F_.italic, size, track: -0.01, lead: 1 }, tall ? W - 2 * S.x : 800 * u, 2),
      );
    let y = tall ? 330 * u + size * 0.8 : cy - size * 0.7;
    sets.forEach((st, i) => {
      ctx.save();
      ctx.globalAlpha = i === 0 ? (f < BAR ? 1 : 0.55) : f < BAR ? 0.35 : 1;
      drawSet(ctx, st, tall ? cx : 130 * u, y, tall ? "center" : "left", F, {
        ink: C.ink,
        future: "ghost",
        ghost: 0.3,
      });
      ctx.restore();
      y += st.size * st.lead * st.rowW.length + size * 0.15;
    });
  };

  // ---------------------------------------------------------------- 10 · tag: the numerals twice, then the empty prompt
  const FIVES = SYLS.filter((s) => (s.line === 11 || s.line === 12) && s.text.startsWith("five")).map((s) => s.s);
  const tag: Scene = (ctx, _env, F, bare = false) => {
    const t0 = frameOf(21, 0),
      f = F - t0;
    if (f < 2 * BAR) {
      // "five point five" twice: each sung "five" pulses the numerals and washes the frame in clay
      const second = f >= BAR,
        pulse = FIVES.reduce((a, s) => Math.max(a, F >= s ? Math.exp(-(F - s) / 5) : 0), 0);
      const nsz = (second ? (tall ? 520 : 560) : tall ? 320 : 300) * u,
        ny = second ? (tall ? 1380 : 940) * u : (tall ? 900 : 560) * u;
      ctx.fillStyle = rgba(C.accent, 0.2 * pulse);
      ctx.fillRect(-100 * u, -100 * u, W + 200 * u, H + 200 * u);
      ctx.save();
      punchIn(ctx, second ? f - BAR : f, cx, ny - nsz * 0.36, 0.1);
      glow(ctx, cx, ny - nsz * 0.36, (nsz / u) * 1.5 * u * (1 + 0.3 * pulse), 0.24 + 0.35 * pulse);
      const sc = 1 + 0.12 * pulse;
      ctx.translate(cx, ny - nsz * 0.36);
      ctx.scale(sc, sc);
      ctx.translate(-cx, -(ny - nsz * 0.36));
      numerals(ctx, 5.5, 0, cx, ny, nsz, mix(C.accent, C.ink, 0.5 * pulse));
      ctx.restore();
      if (bare) return;
      const st = setLine(
        ctx,
        second ? 12 : 11,
        { family: F_.italic, size: (tall ? 150 : 140) * u, track: -0.01 },
        W - 2 * S.x,
        1,
      );
      drawSet(ctx, st, cx, second ? (tall ? 520 : 250) * u : (tall ? 1130 : 800) * u, "center", F, {
        ink: C.ink,
        future: "ghost",
        ghost: 0.26,
      });
      return;
    }
    // "made in code": the prompt field returns, empty, caret blinking; Regenerate is there and not pressed
    const fc = f - 2 * BAR,
      fw = field0.w,
      fh = field0.h,
      fy = (tall ? 820 : 470) * u,
      fx = cx - fw / 2,
      push = 1 + 0.05 * prog(fc, 0, 2 * BAR);
    ctx.save();
    ctx.translate(cx, fy + fh / 2);
    ctx.scale(push, push);
    ctx.translate(-cx, -(fy + fh / 2));
    punchIn(ctx, fc, cx, fy + fh / 2, 0.06);
    glow(ctx, cx, fy + fh / 2, 700 * u, 0.14);
    promptField(ctx, fx, fy, fw, fh);
    mono(ctx, ">", fx + 44 * u, fy + fh / 2 + 20 * u, { color: C.accent, size: 44, track: 0 });
    caret(ctx, fx + 104 * u, fy + fh / 2 + 34 * u, 66 * u, F, C.accent, 5);
    const bw = 270 * u,
      bh = 70 * u,
      bx = fx + fw - bw,
      by = fy + fh + 34 * u;
    rr(ctx, bx, by, bw, bh, 35 * u);
    ctx.strokeStyle = rgba(C.ink, 0.4);
    ctx.lineWidth = 2 * u;
    ctx.stroke();
    ctx.save();
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 2.8 * u;
    const ix = bx + 44 * u,
      iy = by + bh / 2,
      ir = 13 * u;
    ctx.beginPath();
    ctx.arc(ix, iy, ir, -0.3, Math.PI * 1.55);
    ctx.stroke();
    const ex = ix + ir * Math.cos(-0.3),
      ey = iy + ir * Math.sin(-0.3);
    ctx.beginPath();
    ctx.moveTo(ex + 1 * u, ey - 9 * u);
    ctx.lineTo(ex + 1 * u, ey + 1 * u);
    ctx.lineTo(ex - 9 * u, ey + 1 * u);
    ctx.stroke();
    ctx.restore();
    text(ctx, "Regenerate", bx + 72 * u, by + bh / 2 + 10 * u, {
      size: 28 * u,
      family: F_.sans,
      weight: 600,
      color: C.ink,
      track: -0.01,
    });
    // the credit types itself in, on the last bar
    const credit = "a song drawn and sung in code · no samples, no voice model",
      shown = Math.floor(credit.length * prog(fc, BAR, BAR + 50));
    if (shown > 0) {
      const cy0 = by + bh + (tall ? 150 : 120) * u;
      if (tall) {
        const [c1, c2] = credit.split(" · "),
          a1 = c1.slice(0, shown),
          a2 = c2.slice(0, Math.max(0, shown - c1.length - 3));
        mono(ctx, a1, cx - measure(ctx, c1, { size: 28 * u, family: F_.mono, track: 0.04 }) / 2, cy0, {
          size: 28,
          track: 0.04,
        });
        mono(ctx, a2, cx - measure(ctx, c2, { size: 28 * u, family: F_.mono, track: 0.04 }) / 2, cy0 + 46 * u, {
          size: 28,
          track: 0.04,
        });
      } else {
        const full = measure(ctx, credit, { size: 28 * u, family: F_.mono, track: 0.04 });
        mono(ctx, credit.slice(0, shown), cx - full / 2, cy0, { size: 28, track: 0.04 });
      }
    }
    ctx.restore();
    if (bare) return;
    const st = setLine(ctx, 13, { family: F_.italic, size: (tall ? 170 : 160) * u, track: -0.01 }, W - 2 * S.x, 1);
    drawSet(ctx, st, cx, fy - (tall ? 120 : 90) * u, "center", F, { ink: C.ink, future: "ghost", ghost: 0.26 });
  };

  const SCENES: Scene[] = [intro, verse1, verse2, verse3, verse4, chorus1, chorus2, chorus3, chorus4, bridge, tag];

  const sceneAt = (F: number) => Math.min(10, Math.floor(F / (2 * BAR)));
  const NAMES = [
    "INTRO",
    "VERSE 1",
    "VERSE 2",
    "VERSE 3",
    "VERSE 4",
    "CHORUS 1",
    "CHORUS 2",
    "CHORUS 3",
    "CHORUS 4",
    "BRIDGE",
    "TAG",
  ];

  // ---------------------------------------------------------------- the HUD: tiny mono fragments at the edges
  const hud = (ctx: Ctx, F: number, lightTop: boolean, lightBot: boolean) => {
    hudRow(ctx, F, lightTop, true);
    hudRow(ctx, F, lightBot, false);
  };
  const hudRow = (ctx: Ctx, F: number, cream: boolean, top: boolean) => {
    const flick = F >= 40 ? 1 : hash(Math.floor(F / 3), 5) > 0.45 ? prog(F, 0, 40) : 0.12 * prog(F, 0, 40);
    const col = cream ? rgba(C.deep, 0.6) : C.muted,
      hi = cream ? C.deep : C.ink,
      x0 = S.x,
      x1 = W - S.x,
      bar = Math.min(24, Math.floor(F / BAR) + 1),
      beat = Math.floor((F % BAR) / BEAT) + 1;
    ctx.save();
    ctx.globalAlpha = flick;
    if (top) {
      mono(ctx, "FIVE POINT FIVE · 25", x0, hudTop, { color: col });
      mono(ctx, `${NAMES[sceneAt(F)]} · BAR ${String(bar).padStart(2, "0")}.${beat}`, x1, hudTop, {
        color: hi,
        align: "right",
      });
    } else {
      mono(ctx, `FRAME ${pad4(F)} / 1920`, x0, hudBot, { color: col });
      const key = (bar >= 11 && bar <= 18) || bar >= 21 ? "C MAJ" : "A MIN";
      const kw = mono(ctx, `90 BPM · ${key}`, x1, hudBot, { color: col, align: "right" });
      // the level meter: segments that follow the song's envelope
      const lv = levelAt(F),
        segs = 16,
        sw = 7 * u,
        sg = 4 * u,
        mx = x1 - kw - 28 * u - segs * (sw + sg);
      for (let i = 0; i < segs; i++) {
        const on = i / segs < lv;
        ctx.fillStyle = on ? (i >= segs - 3 ? C.accent : hi) : cream ? rgba(C.deep, 0.14) : rgba(C.ink, 0.12);
        ctx.globalAlpha = flick * (on ? 0.8 : 1);
        ctx.fillRect(mx + i * (sw + sg), hudBot - 18 * u, sw, 20 * u);
      }
      ctx.globalAlpha = flick;
    }
    // corner ticks
    ctx.strokeStyle = cream ? rgba(C.deep, 0.3) : rgba(C.ink, 0.2);
    ctx.lineWidth = 2 * u;
    const m = 36 * u,
      l = 18 * u,
      y = top ? S.top - (tall ? 30 : 34) * u : H - S.bottom + (tall ? 30 : 34) * u,
      sy = top ? 1 : -1;
    for (const [x, sx] of [
      [m, 1],
      [W - m, -1],
    ]) {
      ctx.beginPath();
      ctx.moveTo(x, y + sy * l);
      ctx.lineTo(x, y);
      ctx.lineTo(x + sx * l, y);
      ctx.stroke();
    }
    ctx.restore();
  };

  // which frames are light (paper or cream) at the top and bottom edges, for the HUD and the vignette
  const lightAt = (F: number): [boolean, boolean] => {
    if (F >= frameOf(6, 0) && F < frameOf(7, 0)) return [true, true]; // the rules, full frame
    if (F >= frameOf(17, 0) && F < frameOf(18, 0)) return [true, true]; // the form on cream
    if (F >= frameOf(18, 0) && F < frameOf(19, 0)) return [false, true]; // the band on top, paper below
    return [false, false];
  };
  const paint = (ctx: Ctx, env: Env, F: number) => {
    F = clamp(F, 0, N - 1);
    ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
    const sc = sceneAt(F),
      [lt, lb] = lightAt(F),
      cream = sc === 8;
    ctx.fillStyle = cream ? C.accent2 : C.ground;
    ctx.fillRect(0, 0, W, H);
    // every hold keeps moving: a slow push-in and a sideways drift, a different way per scene
    const s0 = sc * 2 * BAR,
      len = sc === 10 ? 4 * BAR : 2 * BAR,
      k = (F - s0) / len,
      dir = sc % 2 ? -1 : 1,
      amt = len / (2 * BAR); // the same speed in a two-bar or a four-bar section
    ctx.save();
    ctx.translate(cx + dir * (k - 0.5) * 34 * amt * u, cy + (k - 0.5) * 10 * amt * u);
    ctx.scale(1 + 0.035 * amt * k, 1 + 0.035 * amt * k);
    ctx.translate(-cx, -cy);
    SCENES[sc](ctx, env, F);
    ctx.restore();
    vignette(ctx, lt || lb ? 0.18 : 0.6);
    grain(ctx, F, lt ? C.deep : C.ink, lt ? 0.08 : 0.07);
    hud(ctx, F, lt, lb);
  };

  const shots: Shot[] = NAMES.map((name, i) => {
    const start = i * 2 * BAR,
      end = i === 10 ? N : (i + 1) * 2 * BAR;
    return {
      id: name.toLowerCase().replace(" ", ""),
      start,
      end,
      draw: (ctx, local, env) => paint(ctx, env, start + local),
    };
  });
  return {
    meta: { title: id, W, H, fps: FPS, bpm: BPM, durationFrames: N, raster: "cpu" },
    assets: { images: {}, fonts: P.assets },
    shots,
    audio,
  };
}

export const fivePointFive = make("landscape", "fivePointFive");
export const fivePointFiveVertical = make("vertical", "fivePointFiveVertical");
