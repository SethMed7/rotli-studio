// Render the exact agent prompt for a study from its brief:
//   node tools/study-prompt.mjs series/studies/briefs/vertical-app-ad.json > series/studies/prompts/vertical-app-ad.prompt.md
// = workflows/study-preamble.md (the rules) + the study section built from the brief. Deterministic: the same
// brief always yields the same prompt, so any study can be rebuilt or re-made by re-running this.
import { readFileSync } from "node:fs";

const file = process.argv[2];
if (!file) {
  console.error("usage: node tools/study-prompt.mjs series/studies/briefs/<id>.json");
  process.exit(2);
}
const b = JSON.parse(readFileSync(file, "utf8"));
const pieces = Object.entries(b.pieces)
  .map(([size, id]) => `\`${id}\` (${size})`)
  .join(", ");
const pre = readFileSync(new URL("../workflows/study-preamble.md", import.meta.url), "utf8")
  .replaceAll("{{TITLE}}", b.title)
  .replaceAll("{{NO}}", String(b.no).padStart(2, "0"))
  .replaceAll("{{BRIEF}}", b.id)
  .replaceAll("{{MODULE}}", b.module)
  .replaceAll("{{PIECES}}", pieces)
  .replaceAll("{{PRIMARY}}", b.primary)
  .replaceAll("{{FRAMES}}", String(b.frames))
  .replaceAll("{{FPS}}", String(b.fps))
  .replaceAll("{{SOUND}}", b.sound);
console.log(`${pre}
--- THE STUDY (from ${file}) ---
${b.title} · study ${String(b.no).padStart(2, "0")} · ${b.kind} · ${b.frames} frames at ${b.fps} fps, ${b.bpm} bpm · palette "${b.palette}"
Style: ${b.style}
Learns from: ${b.learnsFrom}
Beats (frames · what):
${b.story.map((s) => `  - ${s.from}–${s.to} · ${s.what}`).join("\n")}
Sizes: ${b.sizes}
Teaches: ${b.teaches}
`);
