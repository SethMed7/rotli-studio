// PORTABLE PROMPT: a copy-paste prompt that gets a study's style and quality from any capable model, with no tie to this
// repository (one self-contained HTML file, Canvas 2D, Google Fonts). Built from the study's brief, so it stays in step:
//   node tools/portable-prompt.mjs series/studies/briefs/<id>.json > series/studies/portable/<id>.md
//   node tools/portable-prompt.mjs --all      rewrite every portable prompt
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOM = new URL("..", import.meta.url).pathname;
const SIZES = { landscape: [1920, 1080], vertical: [1080, 1920], square: [1080, 1080], portrait: [1080, 1350] };
const pack = JSON.parse(readFileSync(join(ROOM, "brand/packs/studio/pack.json"), "utf8"));
const secs = (f, fps) => (f / fps).toFixed(f % fps ? 1 : 0);

function portable(file) {
  const b = JSON.parse(readFileSync(file, "utf8")),
    p = b.portable ?? {};
  const sizes = Object.keys(b.pieces),
    [W, H] = SIZES[b.primary],
    alt = sizes.find((s) => s !== b.primary);
  const pal = pack.palettes[b.palette];
  const palette = Object.entries(pal)
    .map(([k, v]) => `${k} ${v}`)
    .join(", ");
  const carousel = b.kind === "carousel",
    slides = carousel ? b.story.length : 0;
  const what = carousel
    ? `a ${slides}-slide carousel at ${W} × ${H}`
    : `${secs(b.frames, b.fps)} seconds of motion at ${W} × ${H}, ${b.fps} fps${p.loop ? ", a seamless loop" : ""}`;
  const deliverable = carousel
    ? [
        `- One self-contained HTML file that draws ${slides} slides on a <canvas> of ${W} × ${H}: arrows to move between them, and a "Download slides" button that saves each slide as a PNG (canvas.toBlob), named 01.png, 02.png, …`,
        `- Each slide is drawn by a pure function of the slide number, so every export is identical.`,
      ].join("\n")
    : [
        `- One self-contained HTML file with a <canvas> of ${W} × ${H}. Every frame is a pure function of time, draw(ctx, t) with t in seconds, carrying no state from frame to frame, so any moment renders on its own.`,
        `- A player: it autoplays muted on load; the first click turns the sound on, later clicks pause and play; ← and → step one frame at ${b.fps} fps; ?t=<seconds> opens paused on that moment.${p.loop ? `\n- It loops: the last frame must flow into the first with no jump. End every animated value where it began, and give every repeating motion a period that divides the loop's length.` : ""}`,
      ].join("\n");
  const beats = b.story
    .map((s, i) =>
      carousel ? `- Slide ${i + 1}: ${s.what}` : `- ${secs(s.from, b.fps)}–${secs(s.to, b.fps)} s · ${s.what}`,
    )
    .join("\n");
  const beatNote = carousel
    ? ""
    : ` (${b.bpm} bpm, a beat every ${(60 / b.bpm).toFixed(2)} s: every change of state starts on a beat; follow-through may start on a half-beat)`;
  const sizesText = [
    `- ${b.primary}: ${W} × ${H}.`,
    ...(alt
      ? [`- Add ?size=${alt} for ${SIZES[alt].join(" × ")}. Design that layout for its shape: ${p.sizes ?? b.sizes}`]
      : []),
  ].join("\n");
  const sound = p.sound ? `- Sound (Web Audio, starts on the first click): ${p.sound}\n` : "";
  const out = readFileSync(join(ROOM, "workflows/portable-template.md"), "utf8")
    .replaceAll("{{TITLE}}", b.title)
    .replaceAll("{{WHAT}}", what)
    .replaceAll("{{DELIVERABLE}}", deliverable)
    .replaceAll("{{FONTS}}", p.fonts ?? "Inter")
    .replaceAll("{{STYLE}}", p.style ?? b.style)
    .replaceAll("{{PALETTE}}", palette)
    .replaceAll("{{BEAT_NOTE}}", beatNote)
    .replaceAll("{{BEATS}}", beats)
    .replaceAll("{{SIZES}}", sizesText)
    .replaceAll("{{TEACHES}}", b.teaches)
    .replaceAll("{{SOUND}}", sound)
    .replaceAll("{{PRODUCT}}", pack.product);
  return out;
}

if (process.argv[2] === "--all") {
  const dir = join(ROOM, "series/studies/briefs");
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".json"))) {
    const id = f.replace(/\.json$/, "");
    writeFileSync(join(ROOM, "series/studies/portable", `${id}.md`), portable(join(dir, f)));
    console.log(`portable: ${id}`);
  }
} else if (process.argv[2]) process.stdout.write(portable(process.argv[2]));
else {
  console.error("usage: node tools/portable-prompt.mjs <brief.json> | --all");
  process.exit(2);
}
