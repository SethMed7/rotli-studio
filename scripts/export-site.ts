// EXPORT SITE: the Motion room as a static, read-only snapshot for hosting (its own Railway project,
// never part of rotli.co). Same pages as http://127.0.0.1:4500/motion, minus everything that needs this
// Mac: no posts editor, no write routes, no renders, no golden verification, no isolation audit.
//
//   bun scripts/export-site.ts            -> site-dist/ (public/ + Dockerfile + Caddyfile)
//   cd site-dist && railway up --detach   deploy (see deploy/README.md)
//
// Videos are web copies (same size, H.264 -tune animation, fast-start; CRF 33, the landing film CRF 22) cached in
// motion/out/web/; scene and crop thumbnails (routes.ts thumbArgs, 1280 px) are extracted once into motion/out/thumbs-1280/. Text files are scanned for private
// markers before anything is written, and the build stops if one is found.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join, relative } from "node:path";

import { THUMB_DIR, atmospheres, looks, skills, thumbArgs, tools } from "../src/motion/routes";

const ROOT = join(import.meta.dir, ".."), MOTION = join(ROOT, "motion"), DIST = join(ROOT, "site-dist"), PUB = join(DIST, "public");
const run = async (cmd: string[], cwd = ROOT) => { const p = Bun.spawn(cmd, { cwd, stdout: "pipe", stderr: "pipe" }); const [out, err, code] = await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text(), p.exited]); if (code) throw new Error(`${cmd.join(" ")}\n${err || out}`); return out; };
const pool = async <T>(items: T[], n: number, fn: (x: T) => Promise<void>) => { let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) await fn(items[i++]!); })); };
const walk = (dir: string): string[] => (existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.name === "node_modules" || e.name.startsWith(".DS") ? [] : e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)])) : []);
const put = (dest: string, from: string) => { mkdirSync(dirname(dest), { recursive: true }); cpSync(from, dest); };
const newer = (a: string, b: string) => existsSync(a) && statSync(a).mtimeMs >= statSync(b).mtimeMs;

rmSync(DIST, { recursive: true, force: true }); mkdirSync(PUB, { recursive: true });
console.log("manifest…"); await run(["node", "tools/manifest.mjs"], MOTION);
const manifest = JSON.parse(readFileSync(join(MOTION, "out/manifest.json"), "utf8")) as { pieces: { id: string; slug: string; kind: string; role: string; episode: string | null; shots: { start: number; end: number }[]; posterFrame?: number; derive: { vertical: { frame: number }[]; slides: { frame: number }[]; single: { frame: number } } | null; video?: { file: string } }[] };

// ---- the page, its styles, script and brand assets (same absolute paths as the local server)
const html = readFileSync(join(ROOT, "static/motion.html"), "utf8").replace("<head>", '<head>\n    <meta name="robots" content="noindex, nofollow" />\n    <script>window.STUDIO_STATIC = true;</script>');
writeFileSync(join(PUB, "index.html"), html);
// stylesheets get content-hashed names too: Cloudflare caches .css for hours, and a stale stylesheet under a
// new page breaks the layout (seen 2026-09-25)
const hashName = (name: string, body: string | Buffer) => name.replace(/\.(\w+)$/, `.${new Bun.CryptoHasher("sha256").update(body).digest("hex").slice(0, 12)}.$1`);
let pageHtml = readFileSync(join(PUB, "index.html"), "utf8");

const bundle = await Bun.build({ entrypoints: [join(ROOT, "src/motion/app.ts")], target: "browser", format: "esm", minify: true });
if (!bundle.success) throw new Error(bundle.logs.map(String).join("\n"));
// content-hashed name: a CDN (Cloudflare fronts studio.rotli.co) can never serve a stale script to a new page
const js = await bundle.outputs[0]!.text(), jsName = `motion.${new Bun.CryptoHasher("sha256").update(js).digest("hex").slice(0, 12)}.js`;
mkdirSync(join(PUB, "build"), { recursive: true }); writeFileSync(join(PUB, "build", jsName), js);
pageHtml = pageHtml.replace('src="/build/motion.js"', `src="/build/${jsName}"`); // written once, after the stylesheets
for (const f of walk(join(ROOT, "library/fonts"))) put(join(PUB, relative(ROOT, f)), f);
put(join(PUB, "library/logo/_logo.svg"), join(ROOT, "library/logo/_logo.svg"));
for (const f of readdirSync(join(ROOT, "library/logo")).filter((n) => n.startsWith("favicon"))) put(join(PUB, "library/logo", f), join(ROOT, "library/logo", f));
put(join(PUB, "favicon.ico"), join(ROOT, "library/logo/favicon.ico"));
// images the stylesheet points at get hashed names too, rewritten into the CSS before it is hashed
const cssAssets: [string, string][] = [];
for (const f of readdirSync(join(ROOT, "library/patterns"))) { const body = readFileSync(join(ROOT, "library/patterns", f)), hashed = hashName(f, body); put(join(PUB, "library/patterns", hashed), join(ROOT, "library/patterns", f)); cssAssets.push([`/library/patterns/${f}`, `/library/patterns/${hashed}`]); }
writeFileSync(join(PUB, "robots.txt"), "User-agent: *\nDisallow: /\n");
// the studio's sounds: catalog, web copies, prompts (served at /sound/…, like the local server)
for (const d of ["web", "prompts"]) for (const f of readdirSync(join(ROOT, "sound", d))) put(join(PUB, "sound", d, f), join(ROOT, "sound", d, f));
put(join(PUB, "sound/catalog.json"), join(ROOT, "sound/catalog.json"));

// stylesheets: rewrite their asset URLs to the hashed names, then hash the stylesheets themselves
for (const f of ["app.css", "motion.css"]) { let body = readFileSync(join(ROOT, "static", f), "utf8"); for (const [from, to] of cssAssets) body = body.replaceAll(from, to); const hashed = hashName(f, body); mkdirSync(join(PUB, "static"), { recursive: true }); writeFileSync(join(PUB, "static", hashed), body); pageHtml = pageHtml.replace(`href="/static/${f}"`, `href="/static/${hashed}"`); }
writeFileSync(join(PUB, "index.html"), pageHtml);

// ---- API answers as files
const apiDir = join(PUB, "api/motion"); mkdirSync(apiDir, { recursive: true });
put(join(apiDir, "manifest.json"), join(MOTION, "out/manifest.json"));
writeFileSync(join(apiDir, "tools.json"), JSON.stringify(tools()));
writeFileSync(join(apiDir, "skills.json"), JSON.stringify(skills({ global: false })));
writeFileSync(join(apiDir, "atmospheres.json"), JSON.stringify(atmospheres()));
writeFileSync(join(apiDir, "looks.json"), JSON.stringify(looks()));

// ---- motion files the pages link to (/m/…) and studio docs (/s/…)
const motionText = ["pieces.json", "series.json", "posts.json", "README.md", "EVALUATION.md", "brand", "season", "workflows", "src/canvas-core", "src/hosts", "tools", "golden", "third_party"];
const studioText = ["launch", "AGENTS.md", "README.md", "LICENSE", "NOTICE", "films/README.md", ".claude/skills", "scripts", "exports", "library/companion-looks"];
const files: [string, string][] = [
  ...motionText.filter((p) => existsSync(join(MOTION, p))).flatMap((p) => (statSync(join(MOTION, p)).isDirectory() ? walk(join(MOTION, p)) : [join(MOTION, p)]).map((f) => [join(PUB, "m", relative(MOTION, f)), f] as [string, string])),
  ...studioText.flatMap((p) => (statSync(join(ROOT, p)).isDirectory() ? walk(join(ROOT, p)) : [join(ROOT, p)]).map((f) => [join(PUB, "s", relative(ROOT, f)), f] as [string, string])),
  ...walk(join(MOTION, "out")).filter((f) => /out\/[^/]+\.png$|out\/video\/[^/]+\.jpg$/.test(f)).map((f) => [join(PUB, "m", relative(MOTION, f)), f] as [string, string]),
];

// ---- privacy scan: nothing private leaves the Mac (the studio uses synthetic data only)
const PRIVATE: [RegExp, string][] = [[/sk-(?!test)[A-Za-z0-9_-]{20,}/, "API key"], [/-----BEGIN [A-Z ]*PRIVATE KEY/, "private key"], [/\b\d{3}-\d{2}-\d{4}\b/, "SSN-shaped number"], [/memex-vault\/(identity|personality|history|chats)\//, "private memex path"], [/(password|passwd)\s*[:=]\s*\S{6,}/i, "password"]];
// names that must never appear in a public snapshot (clients, private projects): one per line, kept in
// deploy/private-markers.local.txt, which is never exported
const markers = join(ROOT, "deploy/private-markers.local.txt");
if (existsSync(markers)) for (const name of readFileSync(markers, "utf8").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"))) PRIVATE.push([new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s*"), "i"), "private name (deploy/private-markers.local.txt)"]);
const hits: string[] = [];
for (const [, from] of files) if (/\.(md|json|ts|mjs|py|txt|html|css)$/.test(from)) { const t = readFileSync(from, "utf8"); for (const [re, what] of PRIVATE) if (re.test(t)) hits.push(`${relative(ROOT, from)}: ${what}`); }
if (hits.length) { console.error(`STOP: private markers found, nothing exported:\n  ${hits.join("\n  ")}`); process.exit(1); }
for (const [to, from] of files) put(to, from);

// ---- videos: web copies (same pixels size, smaller files, fast start for streaming)
// flat vector animation holds up at CRF 33 with -tune animation (checked on the rain-heavy E08); it keeps
// the upload under Railway's CLI limit (a 247 MB snapshot was refused with 413)
const CRF = 33, vids = manifest.pieces.filter((p) => p.video);
// the landing film gets a better encode than the rest (rotli.co's own copy runs ~755 kbps; this beats it)
const crfFor = (slug: string) => (slug === "rotli-story" ? 22 : CRF);
console.log(`videos: ${vids.length} web copies…`);
await pool(vids, 3, async (p) => {
  const src = join(MOTION, p.video!.file), web = join(MOTION, "out/web", `crf${crfFor(p.slug)}`, `${p.slug}.mp4`);
  if (!newer(web, src)) { mkdirSync(dirname(web), { recursive: true }); await run(["ffmpeg", "-y", "-loglevel", "error", "-i", src, "-c:v", "libx264", "-preset", "slow", "-crf", String(crfFor(p.slug)), "-tune", "animation", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-c:a", "aac", "-b:a", "96k", web]); }
  put(join(PUB, "m", p.video!.file), web);
});

// ---- thumbnails: every frame the pages ask for (posters, scene midpoints, derive crops)
const want = new Map<string, Set<number>>(); const need = (slug: string, f: number) => (want.get(slug) ?? want.set(slug, new Set()).get(slug)!).add(f);
for (const p of vids) { if (p.posterFrame !== undefined) need(p.slug, p.posterFrame); for (const s of p.shots) need(p.slug, Math.floor((s.start + s.end) / 2)); if (p.derive) for (const b of [...p.derive.vertical, ...p.derive.slides, p.derive.single]) need(p.slug, b.frame); }
const jobs = [...want].flatMap(([slug, fs]) => [...fs].map((f) => ({ slug, f })));
console.log(`thumbnails: ${jobs.length}…`);
await pool(jobs, 6, async ({ slug, f }) => {
  const video = join(MOTION, "out/video", `${slug}.mp4`), cache = join(MOTION, "out", THUMB_DIR, slug, `${f}.jpg`);
  if (!newer(cache, video)) { mkdirSync(dirname(cache), { recursive: true }); await run(thumbArgs(video, f, cache)); }
  put(join(apiDir, "thumb", slug, `${f}.jpg`), cache);
});

// ---- the landing poster: one full-size still of the film (the scene thumbnails are 640 px)
{ const film = manifest.pieces.find((p) => p.id === "rotliStory"), frame = 45; // = HERO_POSTER_FRAME in src/motion/app.ts
  if (film?.video) { const out = join(apiDir, "poster", film.slug, `${frame}.jpg`); mkdirSync(dirname(out), { recursive: true });
    await run(["ffmpeg", "-y", "-loglevel", "error", "-ss", (frame / 30).toFixed(3), "-i", join(MOTION, film.video.file), "-frames:v", "1", "-vf", "scale=1920:-2", "-q:v", "2", out]); } }

// ---- the host: Caddy, static files only
cpSync(join(ROOT, "deploy/Dockerfile"), join(DIST, "Dockerfile")); cpSync(join(ROOT, "deploy/Caddyfile"), join(DIST, "Caddyfile"));
writeFileSync(join(DIST, ".railwayignore"), "");
const size = walk(PUB).reduce((a, f) => a + statSync(f).size, 0);
console.log(`site-dist: ${walk(PUB).length} files · ${(size / 1e6).toFixed(0)} MB · privacy scan clean -> ${relative(ROOT, DIST)}/`);
