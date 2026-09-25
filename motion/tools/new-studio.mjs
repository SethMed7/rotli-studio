// NEW STUDIO: a clean motion room for another product, from this one.
//   node tools/new-studio.mjs <dir> [--brand brand.proposal/]
// Copies the product-agnostic parts: the engine (anidoodle core + tools), studio/* (story engine, templates,
// atmospheres, derive, grounds, series, ui, score2), rotli/kit (palette comes from brand.json), the actor and
// rig, workflows and tools. Leaves behind: Rotli's pieces, series, goldens, renders. Writes pieces.json with
// only brandLook, drops in the proposed brand pack, and links node_modules (or run npm install there).
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const SRC = resolve(dirname(fileURLToPath(import.meta.url)), ".."), dst = resolve(process.argv[2] ?? ""), i = process.argv.indexOf("--brand"), brandDir = i > 0 ? resolve(process.argv[i + 1]) : null;
if (!process.argv[2]) { console.error("usage: node tools/new-studio.mjs <dir> [--brand proposal-dir]"); process.exit(1); }
if (existsSync(join(dst, "motion"))) { console.error(`${dst}/motion exists; refusing to overwrite`); process.exit(1); }
const skip = new Set(["node_modules", "out", "dist", "golden", ".tmp", "series", "runs"]);
cpSync(SRC, join(dst, "motion"), { recursive: true, filter: (p) => !skip.has(basename(p)) });
const core = join(dst, "motion/src/canvas-core"), hosts = join(dst, "motion/src/hosts");
const productPiece = /^(ep\d|s\d+e\d|rotliStory|teaser15|dressUp|themesLoop|howRotliWorks|stills|posterLineup|themeGrid|linkedinCard|xCard|heroFilm|atmosphereReel|poseLab|shots|story\b)/;
for (const f of readdirSync(core)) if (productPiece.test(f)) rmSync(join(core, f), { recursive: true, force: true });
for (const f of readdirSync(hosts)) if (/^page-/.test(f) && !/page-brandLook/.test(f) && productPiece.test(f.replace(/^page-/, ""))) rmSync(join(hosts, f));
if (brandDir) for (const f of ["brand.json", "themes.json"]) cpSync(join(brandDir, f), join(dst, "motion/brand", f));
writeFileSync(join(dst, "motion/pieces.json"), JSON.stringify({ note: "This product's catalogue. Start with brandLook (the look still); add pieces as they are approved.", pieces: [{ id: "brandLook", kind: "still", slug: "brand-look", format: "film", about: "The one look still that proves the brand pack." }] }, null, 1) + "\n");
mkdirSync(join(dst, "exports"), { recursive: true });
try { symlinkSync(join(SRC, "node_modules"), join(dst, "motion/node_modules")); } catch { console.warn("link node_modules failed: run npm install in the new motion/"); }
console.log(`new studio -> ${dst}/motion (engine + templates + tools; brand ${brandDir ? "from " + brandDir : "still Rotli's: replace brand/"}). Next: node tools/frames.mjs brandLook 14 --out /tmp/look`);
