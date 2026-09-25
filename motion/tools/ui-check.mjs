// UI CHECK: load every studio page at 1440, 1280 and 390 px and report horizontal overflow, overlapping
// elements, console errors and failed requests (DESIGN.md). `node tools/ui-check.mjs [base-url]`
// against the local server (default :4501) or the hosted snapshot. Screenshots land in /tmp/ui-*.png.
import { chromium } from "playwright-core";
const B = process.argv[2] ?? "http://127.0.0.1:4501", widths = [1440, 1280, 390];
const pages = ["#/", "#/library", "#/series/season-one", "#/series/the-film", "#/piece/s01e05LighthouseKeeper", "#/piece/s01e05Vertical", "#/brand", "#/workflows", "#/runs", "#/tools", "#/docs", "#/isolation"];
const b = await chromium.launch(); const problems = [];
for (const w of widths) {
  const p = await b.newPage({ viewport: { width: w, height: 900 } });
  p.on("console", (m) => m.type() === "error" && problems.push(`[${w}] console: ${m.text()}`)); p.on("pageerror", (e) => problems.push(`[${w}] pageerror: ${e}`)); p.on("response", (r) => r.status() >= 400 && !r.url().includes("favicon") && problems.push(`[${w}] ${r.status()} ${r.url()}`));
  for (const h of [...pages, "POSTS"]) {
    await p.goto(h === "POSTS" ? B + "/posts" : B + "/" + h, { waitUntil: "networkidle" }); await p.waitForTimeout(h === "#/isolation" ? 14000 : 700);
    const r = await p.evaluate(() => {
      const out = [], vis = (el) => { const s = getComputedStyle(el), r = el.getBoundingClientRect(); return s.visibility !== "hidden" && s.display !== "none" && r.width > 1 && r.height > 1; };
      const root = document.querySelector("#main") ?? document.body;
      if (document.documentElement.scrollWidth > window.innerWidth + 1) out.push(`page overflows horizontally: ${document.documentElement.scrollWidth} > ${window.innerWidth}`);
      if (root.scrollWidth > root.clientWidth + 1) out.push(`main overflows horizontally: ${root.scrollWidth} > ${root.clientWidth}`);
      const els = [...root.querySelectorAll("h1,h2,h3,p,li > a,img,video,button,.chip,.meta,.num,figcaption,dt,dd")].filter(vis).filter((el) => !el.closest("details:not([open])") || el.closest("summary")).filter((el) => el.getBoundingClientRect().top < 3000).slice(0, 400);
      for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) { const a = els[i], c = els[j]; if (a.contains(c) || c.contains(a)) continue; const ra = a.getBoundingClientRect(), rc = c.getBoundingClientRect(); const ix = Math.min(ra.right, rc.right) - Math.max(ra.left, rc.left), iy = Math.min(ra.bottom, rc.bottom) - Math.max(ra.top, rc.top); if (ix > 3 && iy > 3) out.push(`overlap: <${a.tagName.toLowerCase()} ${a.className}> "${(a.textContent||"").trim().slice(0,30)}" × <${c.tagName.toLowerCase()} ${c.className}> "${(c.textContent||"").trim().slice(0,30)}"`); if (out.length > 12) return out; }
      return out;
    });
    r.forEach((x) => problems.push(`[${w}] ${h}: ${x}`));
    if (["#/", "#/series/season-one", "#/piece/s01e05LighthouseKeeper", "#/library", "#/tools", "#/brand"].includes(h) || h === "POSTS") await p.screenshot({ path: `/tmp/ui-${w}-${h.replace(/[^a-z0-9]+/gi, "_")}.png` });
  }
  if (w === 1440) { await p.goto(B + "/#/", { waitUntil: "networkidle" }); await p.waitForTimeout(700); await p.screenshot({ path: "/tmp/ui-home-full.png", fullPage: true }); const main = await p.$("#main"); const H = await p.evaluate(() => document.querySelector("#main").scrollHeight); for (const y of [900, 1800, 2700, 3600]) { if (y > H) break; await p.evaluate((yy) => document.querySelector("#main").scrollTo(0, yy), y); await p.waitForTimeout(400); await p.screenshot({ path: `/tmp/ui-home-${y}.png` }); } }
  await p.close();
}
await b.close(); console.log(problems.length ? problems.slice(0, 60).join("\n") : "no problems"); console.log("total", problems.length);
