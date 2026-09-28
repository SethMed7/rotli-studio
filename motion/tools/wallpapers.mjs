// WALLPAPERS. Every wallpaper for every screen at its exact pixel size, each drawn twice to prove it reproduces,
// then the downloads, small previews and the catalogue the site reads (src/canvas-core/wallpapers.ts owns the set).
//   node tools/wallpapers.mjs                  render all -> out/wallpapers/{full,preview}/ + out/wallpapers/wallpapers.json
//   node tools/wallpapers.mjs --screen iphone  one screen; the catalogue keeps the others
//   node tools/wallpapers.mjs --check          re-render and compare with golden/wallpapers.json (writes nothing)
// golden/wallpapers.json is tracked: every file's sha256, so a change to shared drawing code that moves a wallpaper
// fails the check the way a piece's golden does. Re-render on purpose to re-record it.
// Full-size PNGs are published as assets of the `studio-wallpapers` release by scripts/media.ts; the site ships
// only the previews and links each download there.
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { build } from "esbuild";

process.chdir(new URL("..", import.meta.url).pathname); // runs from the root or from motion/

const OUT = resolve("out/wallpapers"),
  CATALOGUE = join(OUT, "wallpapers.json"),
  GOLDEN = resolve("golden/wallpapers.json"),
  RELEASE = "studio-wallpapers",
  MAX_SIDE = 16384,
  MAX_AREA = 268435456; // Chromium draws a bigger canvas silently blank
const die = (m) => {
  console.error(`wallpapers: ${m}`);
  process.exit(1);
};
const opt = {};
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a === "--check") opt.check = true;
  else if (a === "--screen") opt.screen = process.argv[++i];
  else die(`unknown argument ${a}`);
}
const check = opt.check === true;

const src = (
  await build({
    stdin: {
      contents: `export { WALLPAPERS, WALLPAPER_SCREENS, designOf } from "./src/canvas-core/wallpapers";`,
      resolveDir: process.cwd(),
      loader: "ts",
    },
    bundle: true,
    format: "esm",
    write: false,
    platform: "neutral",
  })
).outputFiles[0].text;
const { WALLPAPERS, WALLPAPER_SCREENS, designOf } = await import(
  "data:text/javascript;base64," + Buffer.from(src).toString("base64")
);

const screens = Object.keys(WALLPAPER_SCREENS).filter((s) => !opt.screen || opt.screen === s);
if (!screens.length) die(`no screen '${opt.screen}' (has: ${Object.keys(WALLPAPER_SCREENS).join(", ")})`);
const film = (screen) => `wallpapers${screen[0].toUpperCase()}${screen.slice(1)}`;
const fileName = (id, screen) => `rotli-${id}-${screen}.png`;
const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");
const pngSize = (buf) => [buf.readUInt32BE(16), buf.readUInt32BE(20)];

const old = existsSync(CATALOGUE) ? JSON.parse(readFileSync(CATALOGUE, "utf8")) : null;
const golden = existsSync(GOLDEN) ? JSON.parse(readFileSync(GOLDEN, "utf8")) : {};
if (check && !Object.keys(golden).length) die("no golden/wallpapers.json to check against: run without --check first");
const files = Object.fromEntries((old?.wallpapers ?? []).map((w) => [w.id, w.files]));
let drift = 0;

for (const screen of screens) {
  const [w, h] = WALLPAPER_SCREENS[screen].out,
    { scale } = designOf(screen);
  if (w > MAX_SIDE || h > MAX_SIDE || w * h > MAX_AREA) die(`${screen} ${w}x${h} is past Chromium's canvas limit`);
  console.log(`${screen}: ${w}x${h} (scale ${scale.toFixed(4)})…`);
  const log = execFileSync("node", ["tools/still.mjs", film(screen), "--scale", String(scale)], { encoding: "utf8" });
  if (/NOT REPRODUCIBLE/.test(log)) die(`${screen}: a wallpaper did not reproduce\n${log}`);
  mkdirSync(join(OUT, "full"), { recursive: true });
  mkdirSync(join(OUT, "preview"), { recursive: true });
  for (const wp of WALLPAPERS) {
    const drawn = resolve(`out/still-${film(screen)}-${wp.id}.png`),
      buf = readFileSync(drawn),
      [pw, ph] = pngSize(buf);
    if (pw !== w || ph !== h) die(`${wp.id} on ${screen} came out ${pw}x${ph}, not ${w}x${h}`);
    const sha = sha256(buf);
    if (check) {
      rmSync(drawn);
      const was = golden[fileName(wp.id, screen)];
      console.log(`  ${wp.id.padEnd(18)} ${was === sha ? "SAME" : was ? "CHANGED" : "NEW"}`);
      if (was !== sha) drift++;
      continue;
    }
    const full = join(OUT, "full", fileName(wp.id, screen)),
      preview = join(OUT, "preview", `${wp.id}-${screen}.jpg`);
    renameSync(drawn, full);
    // previews: 640 px on the long edge for screens wider than tall, 360 px wide for phones
    execFileSync("ffmpeg", [
      "-y",
      "-loglevel",
      "error",
      "-i",
      full,
      "-vf",
      h > w ? "scale=360:-2" : "scale=640:-2",
      "-q:v",
      "4",
      preview,
    ]);
    (files[wp.id] ??= {})[screen] = {
      name: fileName(wp.id, screen),
      W: w,
      H: h,
      bytes: statSync(full).size,
      sha256: sha,
    };
    console.log(`  ${wp.id.padEnd(18)} ${(statSync(full).size / 1e6).toFixed(1)} MB`);
  }
}
if (check) {
  console.log(drift ? `wallpapers: ${drift} changed since golden/wallpapers.json` : "wallpapers: all SAME");
  process.exit(drift ? 1 : 0);
}
const catalogue = {
  generated: new Date().toISOString(),
  release: RELEASE,
  screens: Object.entries(WALLPAPER_SCREENS).map(([id, s]) => ({
    id,
    label: s.label,
    fits: s.fits,
    W: s.out[0],
    H: s.out[1],
  })),
  wallpapers: WALLPAPERS.map((wp) => ({
    id: wp.id,
    title: wp.title,
    family: wp.family,
    dark: wp.dark,
    files: files[wp.id] ?? {},
    previews: Object.fromEntries(
      Object.keys(files[wp.id] ?? {}).map((s) => [s, `out/wallpapers/preview/${wp.id}-${s}.jpg`]),
    ),
  })),
};
writeFileSync(CATALOGUE, JSON.stringify(catalogue, null, 1) + "\n");
const hashes = Object.fromEntries(
  catalogue.wallpapers
    .flatMap((w) => Object.values(w.files))
    .map((f) => [f.name, f.sha256])
    .sort(([a], [b]) => a.localeCompare(b)),
);
writeFileSync(GOLDEN, JSON.stringify(hashes, null, 1) + "\n");
console.log(
  `wallpapers: ${catalogue.wallpapers.length} × ${screens.length} screen(s) -> out/wallpapers/wallpapers.json`,
);
