// THIRD-PARTY INVENTORY: which files came from anidoodle, where they live now, and whether we changed them.
// Apache-2.0 §4(b) needs every modified file to carry a change notice; this tool proves it and keeps the list in
// third_party/anidoodle/README.md true after files move. Upstream hashes are recorded in upstream.json, so it runs
// without the upstream clone.
//   node tools/third-party-inventory.mjs                  rewrite the README's file lists
//   node tools/third-party-inventory.mjs --check          exit 1 if the lists are stale or a notice is missing
//   node tools/third-party-inventory.mjs --record <clone> re-record upstream.json from a clone at the vendored commit
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOM = resolve(dirname(fileURLToPath(import.meta.url)), ".."), STUDIO = resolve(ROOM, "..");
const DIR = join(ROOM, "third_party/anidoodle"), UPSTREAM = join(DIR, "upstream.json"), README = join(DIR, "README.md");
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const argAt = (flag) => { const i = process.argv.indexOf(flag); return i > 0 ? process.argv[i + 1] : undefined; };

const clone = argAt("--record");
if (clone) {
  const git = (...a) => execFileSync("git", ["-C", clone, ...a], { encoding: "utf8" });
  const files = Object.fromEntries(git("ls-files", "engine").split("\n").filter(Boolean).map((f) => [f.replace(/^engine\//, ""), sha(readFileSync(join(clone, f)))]));
  writeFileSync(UPSTREAM, JSON.stringify({ repo: "https://github.com/alexgreensh/anidoodle", commit: git("rev-parse", "HEAD").trim(), from: "engine/", files }, null, 1) + "\n");
  console.log(`recorded ${Object.keys(files).length} upstream files`);
  process.exit(0);
}

const upstream = JSON.parse(readFileSync(UPSTREAM, "utf8"));
const tracked = new Set(execFileSync("git", ["-C", STUDIO, "ls-files"], { encoding: "utf8" }).split("\n"));
// where vendored copies live: the live room, and the frozen first film
const ROOTS = [
  { dir: "motion", title: "Files from anidoodle in `motion/` (the live room)" },
  { dir: "archive/films/quokka-film-original", title: "Files from anidoodle in `archive/films/quokka-film-original/` (frozen archive of the first film)" },
];
// the room moved anidoodle's styles and examples into subfolders of canvas-core
const candidates = (root, rel) => { const m = rel.match(/^src\/canvas-core\/([^/]+)$/); return [`${root}/${rel}`, ...(m && root === "motion" ? ["styles", "examples"].map((d) => `${root}/src/canvas-core/${d}/${m[1]}`) : [])]; };
const NOTICE = /anidoodle.*(modified by Rotli contributors|by Rotli contributors; Apache-2\.0)/;

const problems = [], sections = [];
for (const { dir, title } of ROOTS) {
  const same = [], changed = [];
  for (const [rel, hash] of Object.entries(upstream.files)) {
    const at = candidates(dir, rel).find((p) => tracked.has(p));
    if (!at) continue;
    const bytes = readFileSync(join(STUDIO, at)), moved = at !== `${dir}/${rel}` ? ` (moved from \`${rel}\`)` : "";
    if (sha(bytes) === hash) { same.push(`- \`${at}\`${moved}`); continue; }
    changed.push(`- \`${at}\`${moved}`);
    if (!at.endsWith(".json") && !NOTICE.test(bytes.toString("utf8").split("\n").slice(0, 3).join("\n"))) problems.push(`${at} differs from upstream but has no change notice in its first lines`);
  }
  if (!same.length && !changed.length) continue;
  sections.push(`## ${title}\n\nUnchanged (byte-identical to upstream):\n\n${same.sort().join("\n") || "- (none)"}\n\nModified by Rotli contributors (a change notice on the first line; JSON files cannot carry one):\n\n${changed.sort().join("\n") || "- (none)"}`);
}

const START = "<!-- inventory:start (node motion/tools/third-party-inventory.mjs) -->", END = "<!-- inventory:end -->";
const text = readFileSync(README, "utf8"), a = text.indexOf(START), b = text.indexOf(END);
if (a < 0 || b < a) { console.error(`README.md lacks the ${START} … ${END} markers`); process.exit(1); }
const next = `${text.slice(0, a + START.length)}\n\n${sections.join("\n\n")}\n\n${text.slice(b)}`;

if (process.argv.includes("--check")) {
  if (next !== text) problems.push("third_party/anidoodle/README.md is stale: run node tools/third-party-inventory.mjs");
  if (problems.length) { console.error(`third-party: FAIL\n  ${problems.join("\n  ")}`); process.exit(1); }
  console.log("third-party: PASS · inventory current · every modified file carries a change notice");
} else {
  writeFileSync(README, next);
  console.log(`third-party: README lists updated${problems.length ? `\n  ${problems.join("\n  ")}` : ""}`);
  if (problems.length) process.exit(1);
}
