// RENDER SOUND: realize every recipe in sound/src/recipes.ts. Deterministic: the same files every run.
//
//   bun sound/tools/render.ts
//
// Writes sound/out/<id>.wav (48 kHz 16-bit masters, gitignored, regenerable), sound/web/<id>.m4a (AAC web
// copies the site plays, committed) and sound/catalog.json (id, kind, title, use, prompt, duration, sha256).
// Every sound must have its prompt in sound/prompts/<id>.md; the render stops if one is missing.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { RECIPES } from "../src/recipes";
import { SR, wav } from "../src/synth";

const ROOT = join(import.meta.dir, ".."), OUT = join(ROOT, "out"), WEB = join(ROOT, "web");
mkdirSync(OUT, { recursive: true }); mkdirSync(WEB, { recursive: true });
const missing = RECIPES.filter((r) => !existsSync(join(ROOT, "prompts", `${r.id}.md`)));
if (missing.length) { console.error(`every sound needs its prompt: missing sound/prompts/${missing.map((r) => r.id).join(".md, ")}.md`); process.exit(1); }

const catalog = [];
for (const r of RECIPES) {
  const b = r.render(), master = join(OUT, `${r.id}.wav`), web = join(WEB, `${r.id}.m4a`);
  writeFileSync(master, wav(b));
  const enc = Bun.spawnSync(["ffmpeg", "-y", "-loglevel", "error", "-i", master, "-c:a", "aac", "-b:a", r.kind === "music" ? "160k" : "128k", "-movflags", "+faststart", "-map_metadata", "-1", "-fflags", "+bitexact", "-flags:a", "+bitexact", web], { stderr: "pipe" });
  if (enc.exitCode) { console.error(enc.stderr.toString()); process.exit(1); }
  const seconds = b.L.length / SR;
  catalog.push({ id: r.id, kind: r.kind, title: r.title, use: r.use, prompt: `sound/prompts/${r.id}.md`, file: `sound/web/${r.id}.m4a`, seconds: Math.round(seconds * 100) / 100, sha256: createHash("sha256").update(readFileSync(master)).digest("hex") });
  console.log(`${r.id.padEnd(10)} ${r.kind.padEnd(7)} ${seconds.toFixed(2)} s`);
}
writeFileSync(join(ROOT, "catalog.json"), JSON.stringify({ note: "The studio's sounds, composed in code (sound/src). Regenerate with bun sound/tools/render.ts; sha256 is of the WAV master, so a changed recipe shows up here.", made: "code-synthesized, no samples, no AI audio model; MIT like the rest of this repo", sounds: catalog }, null, 1) + "\n");
console.log(`catalog -> sound/catalog.json (${catalog.length} sounds)`);
