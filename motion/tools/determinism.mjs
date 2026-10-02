// DETERMINISM: does a piece draw bit-identical frames however it is rendered? Goldens hash frames from one page;
// renders spread frames over several pages and a fresh browser each time, so a piece whose pixels depend on the GPU,
// timing or leftover state passes its golden and still ships frames that differ. This hashes the same frames on four
// pages in each of two separate browsers, out of order, and fails on any disagreement. Run it for every WebGL
// (three.js) piece and after any change to how one renders (kit/three.ts).
//   node tools/determinism.mjs <piece> [--frames 0,37,60,120,199]
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { buildPage } from "./build-page.mjs";
import { detect } from "./detect.mjs";
import * as playwright from "./adapters/playwright.mjs";

const piece = process.argv[2];
if (!piece) {
  console.error("usage: node tools/determinism.mjs <piece> [--frames 0,37,60,120,199]");
  process.exit(2);
}
const ROOM = resolve(import.meta.dirname, "..");
// a piece needs only its host page here, so a builder can prove it before the piece is registered
if (!existsSync(join(ROOM, "src/hosts", `page-${piece}.ts`))) {
  console.error(`no host src/hosts/page-${piece}.ts`);
  process.exit(2);
}
const at = process.argv.indexOf("--frames");
const env = detect(),
  page = await buildPage({ entry: `src/hosts/page-${piece}.ts`, out: resolve(`dist/${piece}.html`), title: piece });
const probe = await playwright.open(env, page.out, { scale: 1, workers: 1 });
const n = (await probe.info()).durationFrames;
await probe.close();
// a spread of frames by default, including the first and the last; each page visits them in its own order
const frames =
  at > 0
    ? process.argv[at + 1].split(",").map(Number)
    : [0, Math.round(n * 0.15), Math.round(n / 4), Math.round(n / 2), Math.round(n * 0.83), n - 1];
const rows = [];
for (let b = 0; b < 2; b++) {
  const s = await playwright.open(env, page.out, { scale: 1, workers: 4 });
  for (let w = 0; w < 4; w++) {
    const order = frames.map((f, i) => frames[(i + w + b) % frames.length]);
    const got = {};
    for (const f of order) got[f] = await s.hash(f, w);
    rows.push({ where: `browser ${b + 1} page ${w + 1}`, hashes: frames.map((f) => got[f]) });
  }
  await s.close();
}
const odd = rows.filter((r) => r.hashes.join() !== rows[0].hashes.join());
console.log(`${piece}: frames ${frames.join(", ")}`);
for (const r of rows) console.log(`  ${r.where}: ${r.hashes.join(" ")}`);
console.log(
  odd.length
    ? `DETERMINISM: DIFFERENT on ${odd.map((r) => r.where).join(", ")}`
    : `DETERMINISM: ${piece} SAME on 8 pages in 2 browsers`,
);
process.exit(odd.length ? 1 : 0);
