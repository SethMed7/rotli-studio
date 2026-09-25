// Render quokka "looks" from rotli's REAL <Character> component, so hats, glasses and
// colours follow the app's own placement and clip laws (nothing re-implemented here).
// Writes a throwaway harness into the rotli checkout's gitignored tmp/, serves it with
// rotli's own Vite, screenshots each look on a transparent background, then removes the
// harness. Never touches tracked files.   bun scripts/render-companions.ts [rotli-path]
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright-core";

// --only-missing renders only looks without a PNG yet (re-rendering all can shift antialiasing and move goldens)
const onlyMissing = process.argv.includes("--only-missing");
const source = process.argv.slice(2).find((a) => !a.startsWith("--")) ?? process.env.ROTLI_REPO ?? join(homedir(), "rotli");
const spec = JSON.parse(readFileSync(join(import.meta.dir, "..", "motion", "brand", "companions.json"), "utf8"));
const outDir = join(import.meta.dir, "..", "library", "companion-looks");
const harness = join(source, "tmp", "studio-companions");
const PORT = 5198;
mkdirSync(harness, { recursive: true }); mkdirSync(outDir, { recursive: true });
const styles = ["base", "app", "notes", "editor", "render", "command", "quick", "onboarding", "board", "memex"].map((s) => `import "../../src/styles/${s}.css";`).join("\n");
writeFileSync(join(harness, "index.html"), `<!doctype html><html data-theme="light"><head><meta charset="utf-8"><style>html,body{margin:0;background:transparent!important}#root{display:inline-block}</style></head><body><div id="root"></div><script type="module" src="./main.tsx"></script></body></html>`);
writeFileSync(join(harness, "main.tsx"), `${styles}
import ReactDOM from "react-dom/client";
import { Character } from "../../src/components/character";
import { useUiStore } from "../../src/state/ui";
const q = new URLSearchParams(location.search);
useUiStore.setState({ quokkaCompanionEnabled: true, quokkaAccessoryHue: Number(q.get("hue") ?? 38), quokkaLineColor: "auto" } as never);
ReactDOM.createRoot(document.getElementById("root")!).render(<div id="cell" style={{ width: ${spec.size}, height: ${spec.size} }}><Character name={q.get("pose") as never} size={${spec.size}} treatment={q.get("style") as never} accessory={q.get("accessory") as never} alwaysVisible /></div>);
`);
const vite = Bun.spawn(["bunx", "vite", "--port", String(PORT), "--strictPort", "--host", "127.0.0.1"], { cwd: source, stdout: "pipe", stderr: "pipe" });
try {
  for (let i = 0; i < 60; i++) { try { if ((await fetch(`http://127.0.0.1:${PORT}/tmp/studio-companions/index.html`)).ok) break; } catch {} await Bun.sleep(500); }
  const browser = await chromium.launch(), page = await browser.newPage({ viewport: { width: spec.size + 40, height: spec.size + 40 } });
  for (const look of spec.looks) {
    if (onlyMissing && existsSync(join(outDir, `${look.id}.png`))) continue;
    await page.goto(`http://127.0.0.1:${PORT}/tmp/studio-companions/index.html?pose=${look.pose}&style=${look.style}&accessory=${look.accessory}&hue=${spec.accessoryHue}`);
    await page.waitForFunction(() => document.querySelectorAll("#cell svg, #cell img, #cell [style*='mask']").length > 0, null, { timeout: 30000 });
    await page.waitForTimeout(700);
    await page.locator("#cell").screenshot({ path: join(outDir, `${look.id}.png`), omitBackground: true });
    console.log(`look ${look.id}`);
  }
  await browser.close();
} finally {
  vite.kill(); rmSync(harness, { recursive: true, force: true });
}
console.log(`companions: ${spec.looks.length} looks -> ${outDir}`);
