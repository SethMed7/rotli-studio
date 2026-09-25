// Extract rotli's twelve theme environments (six families × light/dark) into
// library/themes.json by loading the app's own token CSS in Chromium and
// reading the COMPUTED semantic roles for each data-theme. The CSS is the truth;
// nothing here is hand-copied. Run: bun scripts/sync-themes.ts [path-to-rotli]
import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright-core";

const source = process.argv[2] ?? process.env.ROTLI_REPO ?? join(homedir(), "rotli");
const out = join(import.meta.dir, "..", "library", "themes.json");
const THEMES = [
  ["light", "Rotli", "light"], ["dark", "Rotli", "dark"], ["paper", "Paper & Charcoal", "light"], ["charcoal", "Paper & Charcoal", "dark"],
  ["ocean-light", "Ocean", "light"], ["ocean-dark", "Ocean", "dark"], ["grove-light", "Grove", "light"], ["grove-dark", "Grove", "dark"],
  ["iris-light", "Iris", "light"], ["iris-dark", "Iris", "dark"], ["midnight-light", "Midnight", "light"], ["midnight-dark", "Midnight", "dark"],
] as const;
const ROLES = ["ground", "surface", "surface-2", "tint", "text", "text-muted", "border", "accent", "accent-text", "on-accent", "success", "failure", "syntax-blue"];

// inlined, because a blank page may not load file:// stylesheets
const css = ["src/brand/tokens/colors.css", "src/styles/themes.css"].map((f) => `<style>${readFileSync(join(source, f), "utf8")}</style>`).join("");
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(`<!doctype html><html><head>${css}</head><body></body></html>`, { waitUntil: "load" });
const themes = [];
for (const [id, family, mode] of THEMES) {
  const roles = await page.evaluate(([t, roles]) => {
    document.documentElement.dataset.theme = t as string;
    const cs = getComputedStyle(document.documentElement), probe = document.createElement("i");
    document.body.append(probe);
    // resolve every role to rgb() through a real element, then to hex
    const hex = (v: string) => { probe.style.color = v; const m = getComputedStyle(probe).color.match(/\d+(\.\d+)?/g)!.map(Number); return "#" + m.slice(0, 3).map((n) => Math.round(n).toString(16).padStart(2, "0")).join(""); };
    return Object.fromEntries((roles as string[]).map((r) => [r, hex(cs.getPropertyValue(`--${r}`).trim())]));
  }, [id, ROLES] as const);
  themes.push({ id, family, mode, label: family === "Paper & Charcoal" ? (mode === "light" ? "Paper" : "Charcoal") : `${family} ${mode === "light" ? "Light" : "Dark"}`, roles });
}
await browser.close();
writeFileSync(out, JSON.stringify({ source: `${source.replace(homedir(), "~")}/src/styles/themes.css + src/brand/tokens/colors.css`, themes }, null, 1) + "\n");
console.log(`themes: ${themes.length} environments -> ${out}`);
