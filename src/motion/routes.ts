// The Motion room's server side: read-only views of motion/ (and the studio docs around it) for the
// studio site. Nothing here edits a piece; the only writes are caches under motion/out/ (the manifest,
// scene thumbnails, exact frame renders) and those are regenerable and gitignored.
import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { extname, isAbsolute, join, normalize, relative, sep } from "node:path";

const ROOT = join(import.meta.dir, "../..");
const MOTION = join(ROOT, "motion");
const OUT = join(MOTION, "out");

// What the site may read. Top-level names only; everything under them is allowed, nothing else is.
const MOTION_OPEN = new Set(["out", "golden", "season", "workflows", "brand", "src", "tools", "examples", "assets", "third_party", "pieces.json", "series.json", "posts.json", "README.md", "EVALUATION.md", "package.json"]);
const STUDIO_OPEN = new Set(["launch", ".claude", "AGENTS.md", "README.md", "LICENSE", "NOTICE", "films", "scripts", "exports", "library"]);
const TEXT = new Set([".ts", ".mjs", ".js", ".py", ".md", ".txt", ".json", ".sh", ".css", ".html"]);

// The public inventory: a file is servable only if git tracks it (or it sits in a generated-output folder),
// it lies under an allowed top-level name, and no path segment is a dotfile or node_modules. The request
// path is decoded and normalized BEFORE any check, and the real path must stay inside the studio.
const GENERATED = ["motion/out/", "exports/"];
let tracked: { at: number; files: Set<string> } | null = null;
const trackedFiles = () => {
  if (!tracked || Date.now() - tracked.at > 15_000) tracked = { at: Date.now(), files: new Set(Bun.spawnSync(["git", "ls-files", "-z"], { cwd: ROOT }).stdout.toString().split("\0").filter(Boolean)) };
  return tracked.files;
};
/** The file a request may read under `base`, or null. Exported for tests. */
export function allowed(base: string, open: Set<string>, rel: string, files: Set<string> = trackedFiles()): string | null {
  let clean: string; try { clean = decodeURIComponent(rel); } catch { return null; } // malformed encoding
  if (clean.includes("\0")) return null;
  const file = normalize(join(base, clean)), inBase = relative(base, file), inRoot = relative(ROOT, file);
  if (!inBase || inBase.startsWith("..") || isAbsolute(inBase) || inRoot.startsWith("..")) return null;
  const segs = inBase.split(sep);
  if (!open.has(segs[0]!) || segs.some((x) => x === "node_modules" || (x.startsWith(".") && x !== ".claude"))) return null;
  const repoPath = inRoot.split(sep).join("/");
  if (!files.has(repoPath) && !GENERATED.some((g) => repoPath.startsWith(g))) return null;
  try { if (relative(realpathSync(ROOT), realpathSync(file)).startsWith("..")) return null; } catch { return null; } // symlinks may not leave
  return file;
}

/** Serve a file; video honours Range so the player can seek through large renders. */
function serve(req: Request, file: string | null): Response {
  if (!file || !existsSync(file) || !statSync(file).isFile()) return new Response("Not found", { status: 404 });
  const f = Bun.file(file), size = f.size, ext = extname(file).toLowerCase();
  const type = TEXT.has(ext) ? `${ext === ".json" ? "application/json" : "text/plain"}; charset=utf-8` : f.type;
  const headers: Record<string, string> = { "content-type": type, "accept-ranges": "bytes", "cache-control": "no-store", "x-content-type-options": "nosniff" };
  const range = req.headers.get("range")?.match(/bytes=(\d*)-(\d*)/);
  if (!range) return new Response(f, { headers: { ...headers, "content-length": String(size) } });
  const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
  const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
  if (start >= size || start > end) return new Response(null, { status: 416, headers: { "content-range": `bytes */${size}` } });
  return new Response(f.slice(start, end + 1), { status: 206, headers: { ...headers, "content-range": `bytes ${start}-${end}/${size}`, "content-length": String(end - start + 1) } });
}

const run = async (cmd: string[], cwd: string, timeoutMs = 120_000) => {
  const p = Bun.spawn(cmd, { cwd, stdout: "pipe", stderr: "pipe" });
  const timer = setTimeout(() => p.kill(), timeoutMs);
  const [out, err, code] = await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text(), p.exited]);
  clearTimeout(timer);
  return { code, out, err };
};

// ---------------------------------------------------------------- the manifest (rebuilt when its inputs change)
const MANIFEST = join(OUT, "manifest.json");
/** the newest modification time under these paths (files and folders, recursively; skips node_modules) */
const newest = (paths: string[]): number => { let t = 0; const walk = (p: string) => { if (!existsSync(p)) return; const st = statSync(p); t = Math.max(t, st.mtimeMs); if (st.isDirectory()) for (const e of readdirSync(p)) if (e !== "node_modules" && e !== "out") walk(join(p, e)); }; paths.forEach(walk); return t; };
// everything the manifest is derived from: catalogue, series, runs, goldens, briefs, brand, piece source, renders
const MANIFEST_INPUTS = () => [join(MOTION, "pieces.json"), join(MOTION, "series.json"), join(MOTION, "workflows"), join(MOTION, "golden"), join(MOTION, "season"), join(MOTION, "brand"), join(MOTION, "src"), join(OUT, "video")];
let stamp: { at: number; t: number } | null = null;
const inputsStamp = () => { if (!stamp || Date.now() - stamp.at > 3000) stamp = { at: Date.now(), t: newest(MANIFEST_INPUTS()) }; return stamp.t; };
const stale = () => !existsSync(MANIFEST) || inputsStamp() > statSync(MANIFEST).mtimeMs;
let building: Promise<unknown> | null = null;
async function manifest(force = false): Promise<Response> {
  if (force || stale()) { building ??= run(["node", "tools/manifest.mjs"], MOTION).finally(() => (building = null)); const r = (await building) as { code: number; err: string }; if (r?.code) return Response.json({ error: r.err }, { status: 500 }); }
  return new Response(Bun.file(MANIFEST), { headers: { "content-type": "application/json", "cache-control": "no-store" } });
}

// ---------------------------------------------------------------- scene thumbnails (ffmpeg from the render) and exact frames
const SLUG = /^[a-z0-9-]{1,80}$/, ID = /^[A-Za-z0-9]{1,60}$/;
// Scene thumbnails and posters, from the master render: 1280 px on the long side (sharp at 2-4x on any
// row, card or crop box), Lanczos scaling, high-quality JPEG. One definition, used by the local server and
// the hosted export (scripts/export-site.ts). THUMB_DIR changes whenever the recipe does, so no stale soft
// thumbnails are reused.
export const THUMB_DIR = "thumbs-1280";
export const thumbArgs = (video: string, frame: number, out: string) => ["ffmpeg", "-y", "-loglevel", "error", "-ss", (frame / 30).toFixed(3), "-i", video, "-frames:v", "1", "-vf", "scale='if(gt(iw,ih),1280,-2)':'if(gt(iw,ih),-2,1280)':flags=lanczos", "-q:v", "3", out];
async function thumb(slug: string, frame: number): Promise<Response> {
  const video = join(OUT, "video", `${slug}.mp4`), dir = join(OUT, THUMB_DIR, slug), file = join(dir, `${frame}.jpg`);
  if (!existsSync(video)) return new Response("No render", { status: 404 });
  if (!existsSync(file) || statSync(file).mtimeMs < statSync(video).mtimeMs) {
    mkdirSync(dir, { recursive: true });
    const r = await run(thumbArgs(video, frame, file), MOTION, 30_000);
    if (r.code) return new Response(r.err, { status: 500 });
  }
  return new Response(Bun.file(file), { headers: { "content-type": "image/jpeg", "cache-control": "no-store" } });
}
/** A full-size still from the render (the landing poster): 1920 wide, high-quality JPEG, cached. */
async function fullPoster(slug: string, frame: number): Promise<Response> {
  const video = join(OUT, "video", `${slug}.mp4`), dir = join(OUT, "posters", slug), file = join(dir, `${frame}.jpg`);
  if (!existsSync(video)) return new Response("No render", { status: 404 });
  if (!existsSync(file) || statSync(file).mtimeMs < statSync(video).mtimeMs) {
    mkdirSync(dir, { recursive: true });
    const r = await run(["ffmpeg", "-y", "-loglevel", "error", "-ss", (frame / 30).toFixed(3), "-i", video, "-frames:v", "1", "-vf", "scale=1920:-2", "-q:v", "2", file], MOTION, 30_000);
    if (r.code) return new Response(r.err, { status: 500 });
  }
  return new Response(Bun.file(file), { headers: { "content-type": "image/jpeg", "cache-control": "no-store" } });
}
async function exactFrame(id: string, frame: number): Promise<Response> {
  const dir = join(OUT, "frames", id), file = join(dir, `f${String(frame).padStart(4, "0")}.png`);
  // re-render when any piece source changed since this frame was cached (a frame depends on shared code too)
  if (!existsSync(file) || statSync(file).mtimeMs < newest([join(MOTION, "src"), join(MOTION, "brand")])) { const r = await run(["node", "tools/frames.mjs", id, String(frame), "--out", `out/frames/${id}`], MOTION); if (r.code || !existsSync(file)) return new Response(r.err || "render failed", { status: 500 }); }
  return new Response(Bun.file(file), { headers: { "content-type": "image/png", "cache-control": "no-store" } });
}

// ---------------------------------------------------------------- docs the site lists
/** A tool's opening comment block: its own usage notes. */
const header = (file: string) => {
  const lines = readFileSync(file, "utf8").split("\n"), out: string[] = [];
  for (const l of lines.slice(lines[0]?.startsWith("#!") ? 1 : 0)) { if (!/^\s*(\/\/|\*|\/\*)/.test(l)) break; out.push(l.replace(/^\s*(\/\/ ?|\/\*\*? ?|\* ?)/, "")); }
  return out.join("\n").trim();
};
export function tools() {
  const list = (dir: string, base: string, re: RegExp) => (existsSync(dir) ? readdirSync(dir).filter((f) => re.test(f)).sort().map((f) => ({ file: `${base}/${f}`, about: header(join(dir, f)) || pyDoc(join(dir, f)) })) : []);
  return [...list(join(MOTION, "tools"), "motion/tools", /\.(mjs|py)$/), ...list(join(ROOT, "sound/tools"), "sound/tools", /\.ts$/), ...list(join(ROOT, "scripts"), "scripts", /\.ts$/)];
}
const pyDoc = (file: string) => (file.endsWith(".py") ? (readFileSync(file, "utf8").match(/"""([\s\S]*?)"""/)?.[1] ?? "").trim() : "");
export function skills({ global = true } = {}) {
  const dir = join(ROOT, ".claude/skills");
  const mine = existsSync(dir) ? readdirSync(dir).filter((d) => existsSync(join(dir, d, "SKILL.md"))).map((d) => ({ name: d, where: "studio", path: `.claude/skills/${d}/SKILL.md`, text: readFileSync(join(dir, d, "SKILL.md"), "utf8") })) : [];
  // global skills the studio depends on: shown read-only, never served as files
  if (!global) return mine;
  const others = ["brand-motion-studio", "anidoodle"].map((d) => join(homedir(), ".claude/skills", d, "SKILL.md")).filter(existsSync)
    .map((f) => ({ name: f.split("/").at(-2)!, where: "global", path: f.replace(homedir(), "~"), text: readFileSync(f, "utf8") }));
  return [...mine, ...others];
}
export function atmospheres() {
  const src = readFileSync(join(MOTION, "src/canvas-core/studio/atmospheres.ts"), "utf8");
  return [...src.matchAll(/"([\w-]+)": \{ id: "[\w-]+", label: "([^"]+)", family: "(\w+)", dark: (true|false), drift: ([\d.]+), why: "([^"]+)"[\s\S]*?score: \{ key: (\d+), melody: (\d)/g)]
    .map((m) => ({ id: m[1], label: m[2], family: m[3], dark: m[4] === "true", drift: Number(m[5]), why: m[6], key: Number(m[7]), melody: Number(m[8]) }));
}

export const looks = () => { const d = join(ROOT, "library/companion-looks"); return existsSync(d) ? readdirSync(d).filter((f) => f.endsWith(".png")) : []; };

// ---------------------------------------------------------------- isolation (cached; the audit walks the product repos)
let isolation: { at: number; body: string } | null = null;
async function isolationReport(fresh: boolean): Promise<Response> {
  if (fresh || !isolation || Date.now() - isolation.at > 10 * 60_000) {
    const r = await run(["bun", "scripts/check-isolation.ts", "--json"], ROOT, 180_000);
    if (r.code) return Response.json({ error: r.err || "audit failed" }, { status: 500 });
    isolation = { at: Date.now(), body: r.out };
  }
  return new Response(isolation.body, { headers: { "content-type": "application/json", "cache-control": "no-store" } });
}

const num = (s: string | undefined) => { const n = Number(s); return Number.isInteger(n) && n >= 0 && n < 100_000 ? n : null; };
const path = (req: Request, prefix: string) => new URL(req.url).pathname.slice(prefix.length);

export const motionRoutes = {
  "/motion": () => new Response(Bun.file(join(ROOT, "static/motion.html")), { headers: { "cache-control": "no-store" } }),
  "/m/*": (req: Request) => serve(req, allowed(MOTION, MOTION_OPEN, path(req, "/m/"))),
  "/s/*": (req: Request) => serve(req, allowed(ROOT, STUDIO_OPEN, path(req, "/s/"))),
  "/api/motion/manifest": { GET: () => manifest(), POST: () => manifest(true) },
  // the studio's sounds: the catalog, the web copies the site plays, and each sound's prompt
  "/sound/*": (req: Request) => serve(req, allowed(join(ROOT, "sound"), new Set(["catalog.json", "web", "prompts"]), path(req, "/sound/"))),
  "/api/motion/thumb/:slug/:frame": (req: Request & { params: { slug: string; frame: string } }) => {
    const f = num(req.params.frame.replace(/\.jpg$/, "")); return SLUG.test(req.params.slug) && f !== null ? thumb(req.params.slug, f) : new Response("Bad request", { status: 400 });
  },
  "/api/motion/poster/:slug/:frame": (req: Request & { params: { slug: string; frame: string } }) => {
    const f = num(req.params.frame.replace(/\.jpg$/, "")); return SLUG.test(req.params.slug) && f !== null ? fullPoster(req.params.slug, f) : new Response("Bad request", { status: 400 });
  },
  "/api/motion/frame/:id/:frame": (req: Request & { params: { id: string; frame: string } }) => {
    const f = num(req.params.frame.replace(/\.png$/, "")); return ID.test(req.params.id) && f !== null ? exactFrame(req.params.id, f) : new Response("Bad request", { status: 400 });
  },
  "/api/motion/verify/:id": {
    POST: async (req: Request & { params: { id: string } }) => {
      if (!ID.test(req.params.id)) return new Response("Bad request", { status: 400 });
      const r = await run(["node", "tools/golden.mjs", req.params.id], MOTION, 600_000);
      return Response.json({ ok: r.code === 0 && /SAME, audio SAME/.test(r.out), output: (r.out + r.err).trim().split("\n").slice(-3).join("\n") });
    },
  },
  "/api/motion/tools": () => Response.json(tools()),
  "/api/motion/skills": () => Response.json(skills()),
  "/api/motion/atmospheres": () => Response.json(atmospheres()),
  "/api/motion/looks": () => Response.json(looks()),
  "/api/motion/isolation": (req: Request) => isolationReport(new URL(req.url).searchParams.has("fresh")),
};
