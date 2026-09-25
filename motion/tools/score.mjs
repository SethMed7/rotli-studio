// node tools/score.mjs — prints the score bar by bar (chord, melody, arrangement, cues) so a human can read it.
import { build } from "esbuild";
const js = (
  await build({
    entryPoints: ["src/canvas-core/rotli/score.ts"],
    bundle: true,
    format: "esm",
    write: false,
    platform: "neutral",
  })
).outputFiles[0].text;
const { PHRASE, MEL, CUES, phraseBar } = await import(
  "data:text/javascript;base64," + Buffer.from(js).toString("base64")
);
const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"],
  nm = (m) => NAMES[m % 12] + (Math.floor(m / 12) - 1);
const chordName = (c, lift) => ({ 60: "I", 65: "IV", 67: "V" })[c[0]] + ` (${nm(c[0] + lift).replace(/\d/, "")})`;
console.log(
  "120 bpm · 30 fps · bar = 60 frames · triplet eighths (5 frames) · C major, lifts to D major at frame 1560\n",
);
for (let b = 0; b < 30; b++) {
  const f0 = b * 60,
    lift = f0 >= 1560 ? 2 : 0,
    arr = [
      f0 >= 1740 ? "final chord + bell" : "melody",
      b >= 2 && f0 < 1740 ? "bass" : "",
      f0 >= 300 && f0 < 1740 ? "arp + kick + shaker" : "",
      f0 >= 720 && f0 < 1740 ? "octave sparkle" : "",
    ]
      .filter(Boolean)
      .join(", ");
  const cues = Object.entries(CUES).flatMap(([k, v]) =>
    (Array.isArray(v) ? v : [v])
      .flat()
      .filter((f) => typeof f === "number" && f >= f0 && f < f0 + 60)
      .map((f) => `${k}@${f}`),
  );
  console.log(
    `bar ${String(b + 1).padStart(2)}  f${String(f0).padStart(4)}  ${chordName(f0 >= 1740 ? PHRASE[0] : PHRASE[phraseBar(b)], lift).padEnd(8)}  ${
      f0 >= 1740
        ? "—"
        : MEL[phraseBar(b)]
            .map(([s, m]) => `${s}:${nm(m + lift)}`)
            .join(" ")
            .padEnd(34)
    }  [${arr}]${cues.length ? "  " + cues.join(" ") : ""}`,
  );
}
