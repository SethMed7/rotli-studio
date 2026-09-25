// GOLDEN LOCK. Proves a piece still renders the exact pixels and samples it was approved with.
//   node tools/golden.mjs <piece> --record    write golden/<piece>.json (every 30th frame + the score)
//   node tools/golden.mjs <piece>             compare against it; exit 1 on any difference
//   --record --unseal                         re-record a SEALED piece (only when its owner decides it may change)
// Run it after ANY change to the shared kit, rig, engine or fonts. A sealed piece must stay SAME: recording over
// one is refused unless --unseal says so. Size, length and the set of checked frames must match too.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildPage } from "./build-page.mjs";
import { detect } from "./detect.mjs";
import * as playwright from "./adapters/playwright.mjs";
const piece = process.argv[2], record = process.argv.includes("--record");
const ROOM = join(dirname(fileURLToPath(import.meta.url)), "..");
const entry = JSON.parse(readFileSync(join(ROOM, "pieces.json"), "utf8")).pieces.find((p) => p.id === piece);
if (!entry) { console.error(`no piece ${piece} in pieces.json`); process.exit(2); }
const sealedBy = entry.sealed ? "pieces.json" : JSON.parse(readFileSync(join(ROOM, "series.json"), "utf8")).series.find((x) => x.sealed && x.pieces?.includes(piece))?.id;
if (record && sealedBy && !process.argv.includes("--unseal")) { console.error(`refused: ${piece} is sealed (${sealedBy}); its golden may only be re-recorded with --unseal`); process.exit(2); }
const outArg = process.argv.indexOf("--golden"), file = outArg > 0 ? resolve(process.argv[outArg + 1]) : join(ROOM, "golden", `${piece}.json`);
const md5 = (b) => createHash("md5").update(b).digest("hex");
const env = detect(), page = await buildPage({ entry: `src/hosts/page-${piece}.ts`, out: resolve(`dist/${piece}.html`), title: piece });
const s = await playwright.open(env, page.out, { scale: 1, workers: 1 }), meta = await s.info();
const frames = {}; for (let n = 0; n < meta.durationFrames; n += 30) frames[n] = md5((await s.frame(n, 0)).png);
frames[meta.durationFrames - 1] = md5((await s.frame(meta.durationFrames - 1, 0)).png);
// and every shot's last frame: that is the frame the carousel and still exports ship
for (let n = 14; n < meta.durationFrames; n += 15) if (!(n in frames)) frames[n] = md5((await s.frame(n, 0)).png);
const a = await s.audio(48000), audio = a ? md5(a.pcm16) : null; await s.close();
const now = { piece, W: meta.W, H: meta.H, frames: meta.durationFrames, audio, hashes: frames };
if (record) { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, JSON.stringify(now, null, 1) + "\n"); console.log(`recorded ${Object.keys(frames).length} frames + audio -> ${file}`); process.exit(0); }
if (!existsSync(file)) { console.error(`no golden at ${file}; record one first`); process.exit(2); }
// every frame the golden recorded must match (a missing one counts as a difference); frames this tool now checks
// that an older golden never recorded are reported, not failed (a sealed golden cannot be widened without --unseal)
const g = JSON.parse(readFileSync(file, "utf8")), keys = Object.keys(g.hashes), extra = Object.keys(now.hashes).filter((k) => !(k in g.hashes)).length;
const bad = keys.filter((k) => g.hashes[k] !== now.hashes[k]), audioOk = g.audio === now.audio;
const shape = ["W", "H", "frames"].filter((k) => g[k] !== now[k]).map((k) => `${k} ${g[k]} -> ${now[k]}`);
console.log(`${piece}: ${keys.length - bad.length}/${keys.length} frames SAME, audio ${audioOk ? "SAME" : "DIFF"}${shape.length ? `, SHAPE DIFF (${shape.join(", ")})` : ""}${extra ? ` (${extra} newer check frame(s) not in this golden)` : ""}${bad.length ? "  differing frames: " + bad.join(" ") : ""}`);
process.exit(bad.length || !audioOk || shape.length ? 1 : 0);
