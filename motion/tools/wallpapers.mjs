// WALLPAPERS: proof that the wallpaper maker draws reproducibly. The maker (the site's /wallpapers) renders each
// download in the visitor's browser with paintWallpaper (src/canvas-core/wallpapers.ts); this draws every preset on
// every screen through that same function, twice (tools/still.mjs refuses a frame that does not reproduce), at the
// design size (short side 1080), and compares each PNG's sha256 with golden/wallpapers.json.
//   node tools/wallpapers.mjs            draw and re-record golden/wallpapers.json
//   node tools/wallpapers.mjs --check    draw and compare (writes nothing)
// A change to shared drawing code or to a look file that moves a wallpaper fails the check the way a piece's golden
// does. Re-record on purpose.
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { build } from "esbuild";

process.chdir(new URL("..", import.meta.url).pathname); // runs from the root or from motion/

const GOLDEN = resolve("golden/wallpapers.json");
const die = (m) => {
  console.error(`wallpapers: ${m}`);
  process.exit(1);
};
const args = process.argv.slice(2);
if (args.some((a) => a !== "--check")) die(`unknown argument ${args.find((a) => a !== "--check")}`);
const check = args.includes("--check");

const src = (
  await build({
    stdin: {
      contents: `export { PRESETS, WALLPAPER_SCREENS } from "./src/canvas-core/wallpapers";`,
      resolveDir: process.cwd(),
      loader: "ts",
    },
    bundle: true,
    format: "esm",
    write: false,
    platform: "neutral",
    loader: { ".json": "json" },
  })
).outputFiles[0].text;
const { PRESETS, WALLPAPER_SCREENS } = await import(
  "data:text/javascript;base64," + Buffer.from(src).toString("base64")
);

const golden = existsSync(GOLDEN) ? JSON.parse(readFileSync(GOLDEN, "utf8")) : {};
if (check && !Object.keys(golden).length) die("no golden/wallpapers.json to check against: run without --check first");
const film = (screen) => `wallpapers${screen[0].toUpperCase()}${screen.slice(1)}`;
const hashes = {};
let drift = 0;
for (const screen of Object.keys(WALLPAPER_SCREENS)) {
  console.log(`${screen}…`);
  const log = execFileSync("node", ["tools/still.mjs", film(screen), "--scale", "1"], { encoding: "utf8" });
  if (/NOT REPRODUCIBLE/.test(log)) die(`${screen}: a preset did not reproduce\n${log}`);
  for (const p of PRESETS) {
    const drawn = resolve(`out/still-${film(screen)}-${p.id}.png`),
      key = `${screen}/${p.id}`,
      sha = createHash("sha256").update(readFileSync(drawn)).digest("hex");
    rmSync(drawn);
    hashes[key] = sha;
    if (check) {
      const was = golden[key];
      console.log(`  ${p.id.padEnd(18)} ${was === sha ? "SAME" : was ? "CHANGED" : "NEW"}`);
      if (was !== sha) drift++;
    }
  }
}
if (check) {
  const gone = Object.keys(golden).filter((k) => !(k in hashes));
  for (const k of gone) console.log(`  ${k} GONE`);
  console.log(drift + gone.length ? `wallpapers: ${drift + gone.length} changed since golden` : "wallpapers: all SAME");
  process.exit(drift + gone.length ? 1 : 0);
}
writeFileSync(GOLDEN, JSON.stringify(hashes, null, 1) + "\n");
console.log(
  `wallpapers: ${PRESETS.length} presets × ${Object.keys(WALLPAPER_SCREENS).length} screens -> golden/wallpapers.json`,
);
