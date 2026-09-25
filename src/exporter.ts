// Export a post to PNGs at each format's exact pixel size, plus a captions
// file, by opening /render for every slide in headless Chromium. The browser
// is the playwright-core build already cached on this Mac.
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { chromium } from "playwright-core";

import { FORMATS, type FormatId, type Post } from "./model";

export const EXPORTS_DIR = join(import.meta.dir, "..", "exports");

export async function exportPost(
  origin: string,
  post: Post,
  formats: FormatId[] = [post.format],
): Promise<{ dir: string; files: string[] }> {
  const dir = join(EXPORTS_DIR, post.slug);
  const files: string[] = [];
  const browser = await chromium.launch();
  try {
    for (const format of formats) {
      const { w, h } = FORMATS[format];
      const out = join(dir, format);
      rmSync(out, { recursive: true, force: true });
      mkdirSync(out, { recursive: true });
      const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
      for (let i = 0; i < post.slides.length; i++) {
        await page.goto(`${origin}/render?post=${encodeURIComponent(post.slug)}&slide=${i}&format=${format}`);
        await page.waitForFunction(() => window.__slideReady === true, undefined, { timeout: 20_000 });
        const file = join(out, `${String(i + 1).padStart(2, "0")}.png`);
        await page.locator(".slide").screenshot({ path: file, animations: "disabled" });
        files.push(file);
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }
  const captions = [
    `# ${post.title}`,
    "",
    "## Instagram",
    "",
    post.captions.instagram,
    "",
    "## X",
    "",
    post.captions.x,
    "",
    "## LinkedIn",
    "",
    post.captions.linkedin,
    "",
  ].join("\n");
  writeFileSync(join(dir, "captions.md"), captions);
  files.push(join(dir, "captions.md"));
  return { dir, files };
}
