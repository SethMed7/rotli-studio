// Render quokka "looks" from rotli's REAL <Character> component, so hats, glasses and
// colours follow the app's own placement and clip laws (nothing re-implemented here).
// Writes a throwaway harness into the rotli checkout's gitignored tmp/, serves it with
// rotli's own Vite, screenshots each look on a transparent background, then removes the
// harness. Never touches tracked files.   bun scripts/render-companions.ts [rotli-path] [--spec <json>]
// --spec renders another set (default motion/brand/companions.json -> library/companion-looks/); a spec may name its
// own output folder ("out", relative to the studio root) and give a look a "theme" (light or dark) to render under.
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { chromium } from "playwright-core";

// --only-missing renders only looks without a PNG yet (re-rendering all can shift antialiasing and move goldens)
const onlyMissing = process.argv.includes("--only-missing");
const source =
  process.argv.slice(2).find((a, i, all) => !a.startsWith("--") && all[i - 1] !== "--spec") ??
  process.env.ROTLI_REPO ??
  join(homedir(), "rotli");
const specArg = process.argv.indexOf("--spec");
const specPath =
  specArg > 0 ? resolve(process.argv[specArg + 1]!) : join(import.meta.dir, "..", "motion", "brand", "companions.json");
const spec = JSON.parse(readFileSync(specPath, "utf8"));
const outDir = join(import.meta.dir, "..", spec.out ?? "library/companion-looks");
// a matrix spec (emotions × styles × accessories, plus dark renders of darkVariants) expands to its looks
// "tintable" matrix specs render filled accessories WHITE and add one colour mask per pose × accessory, so a page can
// multiply any accessory colour in (black ink stays black); the line style's outline accessories carry no colour
type Look = { id: string; pose: string; style: string; accessory: string; theme?: string; mode?: "white" | "mask" };
const looks: Look[] =
  spec.looks ??
  (spec.emotions as { pose: string }[]).flatMap(({ pose }) =>
    (spec.styles as string[]).flatMap((style) =>
      (spec.accessories as { id: string }[]).flatMap(({ id: accessory }) => [
        {
          id: `${pose}-${style}-${accessory}`,
          pose,
          style,
          accessory,
          ...(spec.tintable && accessory !== "none" && style !== "line" ? { mode: "white" as const } : {}),
        },
        ...(((spec.darkVariants ?? []) as string[]).includes(style)
          ? [{ id: `${pose}-${style}-${accessory}-dark`, pose, style, accessory, theme: "dark" }]
          : []),
      ]),
    ),
  );
if (spec.looks === undefined && spec.tintable)
  for (const { pose } of spec.emotions as { pose: string }[])
    for (const { id: accessory } of spec.accessories as { id: string }[])
      if (accessory !== "none")
        looks.push({ id: `tint-${pose}-${accessory}`, pose, style: "cocoa", accessory, mode: "mask" });
// webp: lossless (pixel-identical to the screenshot, about a third of the PNG); needs cwebp (brew install webp)
const ext = spec.format === "webp" ? "webp" : "png";
const harness = join(source, "tmp", "studio-companions");
const PORT = 5198;
// the harness is the one thing this studio ever writes inside the product checkout (its gitignored tmp/, because
// Vite must serve the product's own source); a folder already there is not ours to overwrite or delete
if (existsSync(harness)) {
  console.error(`refused: ${harness} already exists; remove it by hand if it is a leftover of this script`);
  process.exit(2);
}
mkdirSync(outDir, { recursive: true });
let vite: ReturnType<typeof Bun.spawn> | null = null;
try {
  mkdirSync(harness, { recursive: true });
  const styles = ["base", "app", "notes", "editor", "render", "command", "quick", "onboarding", "board", "memex"]
    .map((s) => `import "../../src/styles/${s}.css";`)
    .join("\n");
  writeFileSync(
    join(harness, "index.html"),
    `<!doctype html><html data-theme="light"><head><meta charset="utf-8"><style>html,body{margin:0;background:transparent!important}#root{display:inline-block}</style></head><body><div id="root"></div><script type="module" src="./main.tsx"></script></body></html>`,
  );
  writeFileSync(
    join(harness, "main.tsx"),
    `${styles}
import ReactDOM from "react-dom/client";
import { Character } from "../../src/components/character";
import { useUiStore } from "../../src/state/ui";
const q = new URLSearchParams(location.search);
document.documentElement.dataset.theme = q.get("theme") ?? "light";
// white: the accessory's colour layer painted white (tintable); mask: that colour layer alone, in black
const tint = document.createElement("style");
tint.textContent =
  q.get("mode") === "white"
    ? "#cell * { --quokka-accessory-color: #ffffff !important; }"
    : q.get("mode") === "mask"
      ? "#cell * { visibility: hidden !important; } #cell .quokka-accessory-layer { visibility: visible !important; --quokka-accessory-color: #000000 !important; }"
      : "";
document.head.append(tint);
useUiStore.setState({ quokkaCompanionEnabled: true, quokkaAccessoryHue: Number(q.get("hue") ?? 38), quokkaLineColor: "auto" } as never);
ReactDOM.createRoot(document.getElementById("root")!).render(<div id="cell" style={{ width: ${spec.size}, height: ${spec.size} }}><Character name={q.get("pose") as never} size={${spec.size}} treatment={q.get("style") as never} accessory={q.get("accessory") as never} alwaysVisible /></div>);
`,
  );
  vite = Bun.spawn(["bunx", "vite", "--port", String(PORT), "--strictPort", "--host", "127.0.0.1"], {
    cwd: source,
    stdout: "pipe",
    stderr: "pipe",
  });
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(`http://127.0.0.1:${PORT}/tmp/studio-companions/index.html`)).ok) break;
    } catch {}
    await Bun.sleep(500);
  }
  const browser = await chromium.launch(),
    page = await browser.newPage({ viewport: { width: spec.size + 40, height: spec.size + 40 } });
  for (const look of looks) {
    if (onlyMissing && existsSync(join(outDir, `${look.id}.${ext}`))) continue;
    const url = `http://127.0.0.1:${PORT}/tmp/studio-companions/index.html?pose=${look.pose}&style=${look.style}&accessory=${look.accessory}&hue=${spec.accessoryHue}&theme=${look.theme ?? "light"}&mode=${look.mode ?? ""}`;
    // Vite may reload the page once while it optimizes dependencies on first load; retry an interrupted navigation
    for (let attempt = 1; ; attempt++) {
      try {
        await page.goto(url);
        break;
      } catch (e) {
        if (attempt >= 3 || !String(e).includes("interrupted by another navigation")) throw e;
        await page.waitForTimeout(1500);
      }
    }
    await page.waitForFunction(
      () => document.querySelectorAll("#cell svg, #cell img, #cell [style*='mask']").length > 0,
      null,
      { timeout: 30000 },
    );
    await page.waitForTimeout(700);
    const png = join(outDir, `${look.id}.png`);
    await page.locator("#cell").screenshot({ path: png, omitBackground: true });
    if (ext === "webp") {
      const webp = Bun.spawnSync([
        "cwebp",
        "-quiet",
        "-lossless",
        "-z",
        "9",
        png,
        "-o",
        join(outDir, `${look.id}.webp`),
      ]);
      if (webp.exitCode !== 0) throw new Error(`cwebp failed for ${look.id}: ${webp.stderr.toString()}`);
      rmSync(png);
    }
    console.log(`look ${look.id}`);
  }
  await browser.close();
} finally {
  vite?.kill();
  rmSync(harness, { recursive: true, force: true }); // setup failures clean up too
}
console.log(`companions: ${looks.length} looks -> ${outDir}`);
