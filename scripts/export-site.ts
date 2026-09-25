// EXPORT SITE: the Motion room as a static, read-only snapshot for hosting (its own Railway project,
// never part of rotli.co). Same pages as http://127.0.0.1:4500/, minus everything that needs this Mac: no
// Create editor, no write routes, no renders, no golden verification, no isolation audit.
//
//   bun scripts/export-site.ts                 -> site-dist/ (public/ + Dockerfile + Caddyfile)
//   bun scripts/export-site.ts --no-markers    build without deploy/private-markers.local.txt (knowingly)
//   cd site-dist && railway up --ci --no-gitignore --service studio    deploy (see deploy/README.md)
//
// What gets published is an explicit inventory, never a whole folder: git-tracked text under the listed paths,
// only the media the manifest references (never Create's drafts in exports/), web copies of the videos and the
// thumbnails the pages ask for. Everything is built into site-dist.staging/, then EVERY file written there
// (bundled script, styles, API answers, docs) is scanned with the same rules as the pre-push gate
// (scripts/lib/privacy.ts). Only a clean build replaces site-dist/; a failed one leaves it untouched.
//
// Videos are web copies (same size, H.264 -tune animation, fast-start; CRF 33, the landing film CRF 22) cached in
// motion/out/web/; scene and crop thumbnails (routes.ts thumbArgs, 1280 px) are extracted once into
// motion/out/thumbs-1280/.
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";

import { THUMB_DIR, atmospheres, looks, skills, thumbArgs, tools, videoFps } from "../src/motion/routes";
import { pieceIds, readPosts, validatePosts } from "./lib/posts";
import { baseRules, isText, markerRules, scan } from "./lib/privacy";

const ROOT = join(import.meta.dir, ".."),
  MOTION = join(ROOT, "motion");
const DIST = join(ROOT, "site-dist"),
  STAGE = join(ROOT, "site-dist.staging"),
  PUB = join(STAGE, "public");
const run = async (cmd: string[], cwd = ROOT) => {
  const p = Bun.spawn(cmd, { cwd, stdout: "pipe", stderr: "pipe" });
  const [out, err, code] = await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text(), p.exited]);
  if (code) throw new Error(`${cmd.join(" ")}\n${err || out}`);
  return out;
};
const pool = async <T>(items: T[], n: number, fn: (x: T) => Promise<void>) => {
  let i = 0;
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (i < items.length) await fn(items[i++]!);
    }),
  );
};
const walk = (dir: string): string[] =>
  existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
      )
    : [];
const put = (dest: string, from: string) => {
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(from, dest);
};
const newer = (a: string, b: string) => existsSync(a) && statSync(a).mtimeMs >= statSync(b).mtimeMs;
const hash = (body: string | Uint8Array) => new Bun.CryptoHasher("sha256").update(body).digest("hex");
const fail = (why: string) => {
  rmSync(STAGE, { recursive: true, force: true });
  console.error(`STOP: ${why}\nNothing was published: site-dist/ is unchanged.`);
  process.exit(1);
};

// only what git tracks can be published (an untracked or ignored file never slips in by sitting in a folder)
const tracked = (await run(["git", "ls-files", "-z"])).split("\0").filter(Boolean);
const trackedUnder = (prefix: string) => tracked.filter((f) => f === prefix || f.startsWith(`${prefix}/`));

// the private-name list is required: without it the scan cannot know what must never appear
let rules;
try {
  rules = [...baseRules(), ...markerRules(ROOT, { required: !process.argv.includes("--no-markers") })];
} catch (e) {
  fail(String((e as Error).message));
}

// the owner's published posts must validate exactly as the helper that adds them does
{
  const problems = validatePosts(readPosts(ROOT), pieceIds(ROOT));
  if (problems.length) fail(`publish/posts.json does not validate:\n  ${problems.join("\n  ")}`);
}

rmSync(STAGE, { recursive: true, force: true });
mkdirSync(PUB, { recursive: true });
console.log("manifest…");
await run(["node", "tools/manifest.mjs"], MOTION);
type Video = { file: string; poster: string | null; bytes: number; sha: string };
const manifest = JSON.parse(readFileSync(join(MOTION, "out/manifest.json"), "utf8")) as {
  pieces: {
    id: string;
    slug: string;
    kind: string;
    error?: string;
    shots: { start: number; end: number }[];
    posterFrame?: number;
    derive: { vertical: { frame: number }[]; slides: { frame: number }[]; single: { frame: number } } | null;
    video?: Video;
  }[];
};

// an incomplete snapshot is worse than none: every piece must load and every video must be rendered
{
  const broken = manifest.pieces.filter((p) => p.error).map((p) => `${p.id}: ${p.error}`),
    unrendered = manifest.pieces.filter((p) => p.kind === "video" && !p.video).map((p) => p.id);
  if (broken.length) fail(`pieces that do not load:\n  ${broken.join("\n  ")}`);
  if (unrendered.length)
    fail(`videos not rendered yet (node motion/tools/studio.mjs render <id>): ${unrendered.join(" ")}`);
}

// ---- the page (a meta tag marks the snapshot: no inline script, so the CSP can forbid them), script, styles
const hashName = (name: string, body: string | Uint8Array) =>
  name.replace(/\.(\w+)$/, `.${hash(body).slice(0, 12)}.$1`);
let pageHtml = readFileSync(join(ROOT, "static/motion.html"), "utf8").replace(
  "<head>",
  '<head>\n    <meta name="robots" content="noindex, nofollow" />\n    <meta name="studio-static" content="1" />',
);
const bundle = await Bun.build({
  entrypoints: [join(ROOT, "src/motion/app.ts")],
  target: "browser",
  format: "esm",
  minify: true,
});
if (!bundle.success) fail(bundle.logs.map(String).join("\n"));
// content-hashed names: a CDN (Cloudflare fronts studio.rotli.co) can never serve a stale script or stylesheet to a new page
const js = await bundle.outputs[0]!.text(),
  jsName = hashName("motion.js", js);
mkdirSync(join(PUB, "build"), { recursive: true });
writeFileSync(join(PUB, "build", jsName), js);
pageHtml = pageHtml.replace('src="/build/motion.js"', `src="/build/${jsName}"`);
for (const f of trackedUnder("library/fonts")) put(join(PUB, f), join(ROOT, f));
for (const f of trackedUnder("library/logo").filter((f) => /\/(_logo\.svg|favicon[^/]*)$/.test(f)))
  put(join(PUB, f), join(ROOT, f));
put(join(PUB, "favicon.ico"), join(ROOT, "library/logo/favicon.ico"));
// images the stylesheet points at get hashed names too, rewritten into the CSS before it is hashed
const cssAssets: [string, string][] = [];
for (const f of trackedUnder("library/patterns")) {
  const hashed = hashName(f, readFileSync(join(ROOT, f)));
  put(join(PUB, hashed), join(ROOT, f));
  cssAssets.push([`/${f}`, `/${hashed}`]);
}
for (const f of ["app.css", "motion.css"]) {
  let body = readFileSync(join(ROOT, "static", f), "utf8");
  for (const [from, to] of cssAssets) body = body.replaceAll(from, to);
  const hashed = hashName(f, body);
  mkdirSync(join(PUB, "static"), { recursive: true });
  writeFileSync(join(PUB, "static", hashed), body);
  pageHtml = pageHtml.replace(`href="/static/${f}"`, `href="/static/${hashed}"`);
}
writeFileSync(join(PUB, "index.html"), pageHtml);
writeFileSync(join(PUB, "robots.txt"), "User-agent: *\nDisallow: /\n");
// the studio's sounds (served at /sound/…, like the local server): catalog, web copies, prompts
for (const f of [...trackedUnder("sound/web"), ...trackedUnder("sound/prompts"), "sound/catalog.json"])
  put(join(PUB, f), join(ROOT, f));

// ---- text the pages link to: /m/… (motion room) and /s/… (studio), tracked files only
const MOTION_PUBLIC = [
  "pieces.json",
  "series.json",
  "README.md",
  "brand",
  "series",
  "workflows",
  "src/canvas-core",
  "src/hosts",
  "tools",
  "golden",
  "third_party",
];
const STUDIO_PUBLIC = [
  "AGENTS.md",
  "ARCHITECTURE.md",
  "CONTRIBUTING.md",
  "CHANGELOG.md",
  "SECURITY.md",
  "DESIGN.md",
  "README.md",
  "LICENSE",
  "NOTICE",
  "archive/README.md",
  "docs",
  "publish",
  "scripts",
  ".claude/skills",
  "library/companion-looks",
];
for (const p of MOTION_PUBLIC)
  for (const f of trackedUnder(`motion/${p}`)) put(join(PUB, "m", relative("motion", f)), join(ROOT, f));
for (const p of STUDIO_PUBLIC) for (const f of trackedUnder(p)) put(join(PUB, "s", f), join(ROOT, f));

// ---- media the manifest references (stills, carousel slides, posters), and nothing else from exports/ or out/
const media = new Set<string>();
const collect = (x: unknown): void => {
  if (typeof x === "string") {
    if (/\.(png|jpe?g|webp)$/i.test(x)) media.add(x);
  } else if (x && typeof x === "object") Object.values(x).forEach(collect);
};
collect(manifest);
for (const ref of media) {
  const abs = join(MOTION, ref),
    rel = relative(ROOT, abs);
  if (rel.startsWith("..") || !existsSync(abs))
    fail(`the manifest references ${ref}, which is missing or outside the studio`);
  put(rel.startsWith("motion/") ? join(PUB, "m", relative("motion", rel)) : join(PUB, "s", rel), abs);
}

// ---- videos: web copies (same pixel size, smaller files, fast start for streaming)
// flat vector animation holds up at CRF 33 with -tune animation (checked on the rain-heavy E08); it keeps
// the upload under Railway's CLI limit (a 247 MB snapshot was refused with 413)
const CRF = 33,
  vids = manifest.pieces.filter((p) => p.video);
// the landing film gets a better encode than the rest (rotli.co's own copy runs ~755 kbps; this beats it)
const crfFor = (slug: string) => (slug === "rotli-story" ? 22 : CRF);
console.log(`videos: ${vids.length} web copies…`);
await pool(vids, 3, async (p) => {
  const src = join(MOTION, p.video!.file),
    web = join(MOTION, "out/web", `crf${crfFor(p.slug)}`, `${p.slug}.mp4`);
  if (!newer(web, src)) {
    mkdirSync(dirname(web), { recursive: true });
    await run([
      "ffmpeg",
      "-y",
      "-loglevel",
      "error",
      "-i",
      src,
      "-c:v",
      "libx264",
      "-preset",
      "slow",
      "-crf",
      String(crfFor(p.slug)),
      "-tune",
      "animation",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      "-c:a",
      "aac",
      "-b:a",
      "96k",
      web,
    ]);
  }
  put(join(PUB, "m", p.video!.file), web);
  // the page states the size and fingerprint of what it serves: the web copy, not the master
  const bytes = readFileSync(web);
  p.video!.bytes = bytes.length;
  p.video!.sha = hash(bytes).slice(0, 16);
});

// Slide zips are not in the snapshot: they would double the slides and push the upload past Railway's limit.
// scripts/media.ts publishes one per carousel as a release asset, and the hosted pages link there.

// ---- API answers as files
const apiDir = join(PUB, "api/motion");
mkdirSync(apiDir, { recursive: true });
writeFileSync(join(apiDir, "manifest.json"), JSON.stringify(manifest));
writeFileSync(join(apiDir, "tools.json"), JSON.stringify(tools()));
writeFileSync(join(apiDir, "skills.json"), JSON.stringify(skills({ global: false })));
writeFileSync(join(apiDir, "atmospheres.json"), JSON.stringify(atmospheres()));
writeFileSync(join(apiDir, "looks.json"), JSON.stringify(looks()));

// ---- thumbnails: every frame the pages ask for (posters, scene midpoints, derive crops)
const want = new Map<string, Set<number>>();
const need = (slug: string, f: number) => (want.get(slug) ?? want.set(slug, new Set()).get(slug)!).add(f);
for (const p of vids) {
  if (p.posterFrame !== undefined) need(p.slug, p.posterFrame);
  for (const s of p.shots) need(p.slug, Math.floor((s.start + s.end) / 2));
  if (p.derive) for (const b of [...p.derive.vertical, ...p.derive.slides, p.derive.single]) need(p.slug, b.frame);
}
const jobs = [...want].flatMap(([slug, fs]) => [...fs].map((f) => ({ slug, f })));
console.log(`thumbnails: ${jobs.length}…`);
await pool(jobs, 6, async ({ slug, f }) => {
  const video = join(MOTION, "out/video", `${slug}.mp4`),
    cache = join(MOTION, "out", THUMB_DIR, slug, `${f}.jpg`);
  if (!newer(cache, video)) {
    mkdirSync(dirname(cache), { recursive: true });
    await run(thumbArgs(video, f, cache, videoFps(video)));
  }
  put(join(apiDir, "thumb", slug, `${f}.jpg`), cache);
});

// ---- the landing poster: one full-size still of the film (the scene thumbnails are 1280 px)
{
  const film = manifest.pieces.find((p) => p.id === "rotliStory"),
    frame = 45; // = HERO_POSTER_FRAME in src/motion/app.ts
  if (film?.video) {
    const out = join(apiDir, "poster", film.slug, `${frame}.jpg`);
    mkdirSync(dirname(out), { recursive: true });
    await run([
      "ffmpeg",
      "-y",
      "-loglevel",
      "error",
      "-ss",
      (frame / videoFps(join(MOTION, film.video.file))).toFixed(3),
      "-i",
      join(MOTION, film.video.file),
      "-frames:v",
      "1",
      "-vf",
      "scale=1920:-2",
      "-q:v",
      "2",
      out,
    ]);
  }
}

// ---- the host: Caddy, static files only
cpSync(join(ROOT, "deploy/Dockerfile"), join(STAGE, "Dockerfile"));
cpSync(join(ROOT, "deploy/Caddyfile"), join(STAGE, "Caddyfile"));
writeFileSync(join(STAGE, ".railwayignore"), "");

// ---- the privacy scan: every file in the staged snapshot, names and text (binary media is our own renders)
const all = walk(STAGE),
  hits: string[] = [];
let texts = 0;
for (const f of all) {
  const rel = relative(STAGE, f);
  for (const h of scan(rel, rules!)) hits.push(`${rel} (file name): ${h.replace(/^\d+: /, "")}`);
  const bytes = readFileSync(f);
  if (!isText(bytes)) continue;
  texts++;
  for (const h of scan(new TextDecoder().decode(bytes), rules!)) hits.push(`${rel}:${h}`);
}
if (hits.length) fail(`the snapshot would publish private material:\n  ${hits.slice(0, 60).join("\n  ")}`);

rmSync(DIST, { recursive: true, force: true });
renameSync(STAGE, DIST);
const size = all.reduce((a, f) => a + statSync(f.replace(STAGE, DIST)).size, 0);
console.log(
  `site-dist: ${all.length} files · ${(size / 1e6).toFixed(0)} MB · privacy scan clean over ${texts} text files -> ${relative(ROOT, DIST)}/`,
);
