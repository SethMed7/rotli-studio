// Snapshot rotli's brand assets into library/ so the studio keeps working no
// matter which branch the rotli checkout is on. Re-run after the brand or the
// site captures change:  bun run sync [path-to-rotli-checkout]
// Only adds and overwrites: files you placed in a shelf by hand (like
// captures/chat-social.webp) survive, and a shelf the source lacks is left as is.
// Never writes into the source checkout.
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";

const source = process.argv[2] ?? process.env.ROTLI_REPO ?? join(homedir(), "rotli");
const library = join(import.meta.dir, "..", "library");

/** Each library shelf: where it comes from and which files belong on it. */
const shelves: { shelf: string; from: string; match: RegExp }[] = [
  { shelf: "logo", from: "src/assets/characters", match: /^_logo(-bold)?\.svg$/ },
  { shelf: "quokka-line", from: "src/assets/characters", match: /^(?!_).+\.svg$/ },
  { shelf: "quokka-cocoa", from: "src/assets/characters/filled/cocoa", match: /\.webp$/ },
  { shelf: "quokka-green", from: "src/assets/characters/filled/green", match: /\.webp$/ },
  { shelf: "quokka-large", from: "site/src/assets/characters/cocoa", match: /\.webp$/ },
  { shelf: "companions", from: "site/src/assets/characters/showcase", match: /\.webp$/ },
  { shelf: "captures", from: "site/public/shots", match: /\.webp$/ },
  { shelf: "captures", from: "site/public", match: /^rotli-(app-.+|playground|web).+\.(png|webp)$/ },
  { shelf: "themes", from: "site/public/themes", match: /\.webp$/ },
  { shelf: "patterns", from: "site/public", match: /^hero-pattern\.svg$/ },
  {
    shelf: "fonts",
    from: "src/brand/fonts",
    match: /^(GeneralSans-(Regular|Medium|Semibold)\.woff2|Baloo2-600\.ttf)$/,
  },
  { shelf: "colors", from: "src/brand/tokens", match: /^colors\.json$/ },
];

if (!existsSync(join(source, "src/brand"))) {
  console.error(`Not a rotli checkout: ${source}`);
  process.exit(1);
}

let copied = 0;
for (const { shelf, from, match } of shelves) {
  const dir = join(source, from);
  if (!existsSync(dir)) {
    console.warn(`skip ${shelf}: ${from} is missing in ${source}`);
    continue;
  }
  mkdirSync(join(library, shelf), { recursive: true });
  for (const name of readdirSync(dir)) {
    const file = join(dir, name);
    if (!statSync(file).isFile() || !match.test(name)) continue;
    copyFileSync(file, join(library, shelf, basename(name)));
    copied += 1;
  }
}
mkdirSync(join(library, "uploads"), { recursive: true });
console.log(`library: ${copied} files from ${source}`);

// The twelve theme environments come from the app's CSS, computed in Chromium.
const themes = Bun.spawnSync(["bun", join(import.meta.dir, "sync-themes.ts"), source], {
  stdout: "inherit",
  stderr: "inherit",
});
if (themes.exitCode !== 0) {
  console.error(`sync-themes failed (exit ${themes.exitCode})`);
  process.exit(themes.exitCode ?? 1);
}
