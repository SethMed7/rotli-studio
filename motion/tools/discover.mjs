// DISCOVER: read a product's website the way we read rotli.co by hand, and write down everything the
// motion room needs to speak in that brand. Evidence, not opinions: every value keeps the page it came from.
//
//   node tools/discover.mjs https://example.com [--out discovery/] [--pages 6]
//
// Writes <out>/discovery.json and <out>/shots/*.png (full-page, after scrolling so reveal-on-scroll
// sections render). It captures:
//   type       h1/h2/body/button computed font family, weight, size, letter-spacing (the headline tracking)
//   tokens     every CSS custom property on :root, and per [data-theme=…] / .dark / prefers-color-scheme block
//   grounds    each section's background colour (base / band / deep candidates) and background-image urls
//   fonts      @font-face families, weights and source urls (download only if the owner confirms the licence)
//   marks      favicon / apple-touch-icon / og:image urls, inline <svg> in the header (logo candidates), <img> with logo/mascot names
//   claims     headings + the sentences under them, list items, FAQ question/answer pairs, with the page url
// Opus reads this file to make the brand pack; nothing here decides taste.
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium } from "playwright-core";

const url = process.argv[2]; if (!url) { console.error("usage: node tools/discover.mjs <url> [--out dir] [--pages n]"); process.exit(1); }
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; }; // helper from anidoodle tools/render.mjs (Apache-2.0)
const out = resolve(arg("out", "discovery")), maxPages = Number(arg("pages", 6)); mkdirSync(join(out, "shots"), { recursive: true });
const origin = new URL(url).origin;

const browser = await chromium.launch(), page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const visit = async (u) => {
  await page.goto(u, { waitUntil: "networkidle", timeout: 45000 }).catch(() => page.goto(u, { waitUntil: "load" }));
  const H = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < H; y += 450) { await page.evaluate((yy) => window.scrollTo(0, yy), y); await page.waitForTimeout(160); }
  await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(400);
  const shot = join(out, "shots", `${new URL(u).pathname.replace(/\W+/g, "_") || "home"}.png`); await page.screenshot({ path: shot, fullPage: true });
  const data = await page.evaluate(() => {
    const cs = (el) => { if (!el) return null; const s = getComputedStyle(el); return { family: s.fontFamily, weight: s.fontWeight, size: s.fontSize, letterSpacing: s.letterSpacing, lineHeight: s.lineHeight, color: s.color, background: s.backgroundColor }; };
    const tokens = { root: {}, variants: {} }, faces = [];
    for (const sheet of [...document.styleSheets]) { let rules; try { rules = [...sheet.cssRules]; } catch { continue; }
      const walk = (list, media) => { for (const r of list) {
        if (r.cssRules && !r.selectorText) { walk([...r.cssRules], r.conditionText || media); continue; }
        if (r.type === 5 /* font-face */) { faces.push({ family: r.style.getPropertyValue("font-family"), weight: r.style.getPropertyValue("font-weight"), src: r.style.getPropertyValue("src").slice(0, 300) }); continue; }
        if (!r.selectorText || !r.style) continue; const props = {}; for (const p of [...r.style]) if (p.startsWith("--")) props[p] = r.style.getPropertyValue(p).trim();
        if (!Object.keys(props).length) continue;
        const key = media ? `@media ${media} ${r.selectorText}` : r.selectorText;
        if (/^(:root|html)$/.test(r.selectorText) && !media) Object.assign(tokens.root, props); else (tokens.variants[key] ??= {}, Object.assign(tokens.variants[key], props));
      } };
      walk(rules, "");
    }
    const sections = [...document.querySelectorAll("section, header, footer, main > div")].slice(0, 40).map((el) => { const s = getComputedStyle(el); return { tag: el.tagName.toLowerCase(), cls: String(el.className).slice(0, 60), background: s.backgroundColor, image: s.backgroundImage !== "none" ? s.backgroundImage.slice(0, 200) : "", color: s.color, top: Math.round(el.getBoundingClientRect().top + scrollY), height: Math.round(el.getBoundingClientRect().height) }; });
    const marks = { icons: [...document.querySelectorAll("link[rel~=icon], link[rel=apple-touch-icon]")].map((l) => l.href), og: document.querySelector('meta[property="og:image"]')?.content ?? null,
      headerSvgs: [...document.querySelectorAll("header svg, nav svg, a[href='/'] svg")].slice(0, 4).map((s) => s.outerHTML.slice(0, 4000)),
      images: [...document.querySelectorAll("img")].filter((i) => /logo|mascot|character|brand|hero/i.test(i.src + i.alt + i.className)).slice(0, 12).map((i) => ({ src: i.currentSrc || i.src, alt: i.alt, w: i.naturalWidth, h: i.naturalHeight })) };
    const text = (el) => (el.innerText || el.textContent).replace(/\s+/g, " ").trim(); // innerText keeps <br> as a space
    const claims = [];
    document.querySelectorAll("h1, h2, h3").forEach((h) => { const next = []; let n = h.nextElementSibling; for (let i = 0; n && i < 3; i++, n = n.nextElementSibling) if (/^(P|UL|OL|DIV)$/.test(n.tagName)) next.push(text(n).slice(0, 400)); claims.push({ kind: h.tagName.toLowerCase(), heading: text(h), body: next.filter(Boolean) }); });
    const faq = [...document.querySelectorAll("details")].map((d) => ({ q: text(d.querySelector("summary") ?? d).slice(0, 200), a: text(d).replace(text(d.querySelector("summary") ?? d), "").trim().slice(0, 600) }));
    const links = [...document.querySelectorAll("a[href]")].map((a) => a.href);
    return { title: document.title, description: document.querySelector('meta[name="description"]')?.content ?? "", type: { h1: cs(document.querySelector("h1")), h2: cs(document.querySelector("h2")), body: cs(document.body), button: cs(document.querySelector("button, .btn, a[class*=button]")) }, tokens, faces, sections, marks, claims, faq, links };
  });
  return { url: u, shot, ...data };
};

const first = await visit(url), pages = [first], seen = new Set([url.replace(/\/$/, "")]);
for (const l of first.links) { if (pages.length >= maxPages) break; const u = l.split("#")[0].replace(/\/$/, ""); if (!u.startsWith(origin) || seen.has(u) || /\.(png|jpg|svg|pdf|zip|dmg)$/i.test(u)) continue; seen.add(u); try { pages.push(await visit(u)); } catch (e) { console.warn(`skip ${u}: ${e.message}`); } }
await browser.close();
const d = { url, origin, when: new Date().toISOString().slice(0, 10), pages: pages.map(({ links, ...p }) => p) };
writeFileSync(join(out, "discovery.json"), JSON.stringify(d, null, 1));
console.log(`discovered ${pages.length} page(s) of ${origin} -> ${join(out, "discovery.json")} (+ ${pages.length} full-page shots)`);
for (const p of d.pages) console.log(`  ${p.url}  h1 "${(p.claims.find((c) => c.kind === "h1") ?? {}).heading ?? ""}"  tokens ${Object.keys(p.tokens.root).length}+${Object.keys(p.tokens.variants).length} variants  faq ${p.faq.length}`);
