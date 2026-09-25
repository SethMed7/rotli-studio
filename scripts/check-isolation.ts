// CHECK ISOLATION: prove the studio's work stays in ~/rotli-studio and has not leaked into the products,
// their repos or the live website. Read-only: it reports, it never moves or deletes anything.
//
//   bun scripts/check-isolation.ts            human report
//   bun scripts/check-isolation.ts --json     the same, as JSON (the studio site's Isolation view)
//   bun scripts/check-isolation.ts --offline  skip the live-site fetch
//
// Checks, each PASS / WARN / FAIL with evidence:
//   1. studio code only reaches outside the studio through the declared read-only sources
//   2. every studio render is found by content (sha256) or name in NO product repo, worktree or branch
//   3. the product repos have no studio files tracked, and their dirty files carry no studio signature
//   4. gitignored residue the studio left inside a product folder
//   5. the live sites reference no studio media
//   6. what lives outside the studio on purpose (global skills, agent memory)
//   7. the studio repo is safe to be public (check-public passes) and the editor server stays on 127.0.0.1
import { createHash } from "node:crypto";
import { existsSync, lstatSync, readdirSync, readFileSync, readlinkSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { basename, extname, join, relative } from "node:path";

const HOME = homedir(), STUDIO = import.meta.dir.replace(/\/scripts$/, ""), MOTION = join(STUDIO, "motion");
// Product folders this studio reads from or makes content about. Add a product here when the studio starts on it.
// other product folders come from the gitignored deploy/products.local.txt, so their names are never published
const localProducts = join(STUDIO, "deploy/products.local.txt");
const PRODUCTS = [join(HOME, "rotli"), ...(existsSync(localProducts) ? readFileSync(localProducts, "utf8").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#")).map((l) => l.replace(/^~/, HOME)) : [])];
const productNames = PRODUCTS.map((p) => basename(p)).join("|");
const LIVE = ["https://rotli.co/", "https://dev.rotli.co/"];
// The only studio files allowed to name a product path: they READ brand sources from it.
const DECLARED_READS: Record<string, string> = {
  "scripts/sync-library.ts": "copies brand assets FROM ~/rotli into library/",
  "scripts/sync-themes.ts": "computes the app's theme tokens FROM ~/rotli",
  "scripts/render-companions.ts": "renders the real <Character> from ~/rotli via a harness in its gitignored tmp/, then deletes it",
  "motion/tools/import-quokka.py": "reads the quokka line art FROM ~/rotli/src/assets/characters; writes inside motion/",
  "motion/tools/detect.mjs": "looks for a Playwright browser in the user's cache (a tool, not a product)",
  "motion/brand/themes.json": "records which rotli files its tokens were computed from (provenance text, not a path it opens)",
  "src/motion/routes.ts": "shows the two global skills' SKILL.md read-only on the Skills page",
  "scripts/check-isolation.ts": "this audit",
};
const SKIP = new Set(["node_modules", ".git", "target", "dist", "build", ".astro", ".turbo", ".next", ".cache", ".tmp", "coverage"]);
const MEDIA = new Set([".mp4", ".mov", ".webm", ".png", ".jpg", ".jpeg", ".webp", ".gif"]);
const SIGNATURE = /rotli-studio|canvas-core|anidoodle|quokka-film|motion room|s01e\d\d|studio\.mjs/;

type Level = "PASS" | "WARN" | "FAIL" | "INFO";
type Finding = { level: Level; text: string; evidence?: string[] };
type Check = { id: string; title: string; findings: Finding[] };
const checks: Check[] = [];
const check = (id: string, title: string) => { const c: Check = { id, title, findings: [] }; checks.push(c); return (level: Level, text: string, evidence?: string[]) => c.findings.push({ level, text, evidence }); };
const git = (dir: string, ...args: string[]) => { const r = Bun.spawnSync(["git", "-C", dir, ...args], { stderr: "pipe" }); return r.exitCode === 0 ? r.stdout.toString().trim() : null; };
const walk = function* (dir: string): Generator<string> { let ents; try { ents = readdirSync(dir, { withFileTypes: true }); } catch { return; } for (const e of ents) { if (SKIP.has(e.name)) continue; const p = join(dir, e.name); if (e.isDirectory()) yield* walk(p); else if (e.isFile()) yield p; } };
const sha = (f: string) => createHash("sha256").update(readFileSync(f)).digest("hex");
const size = (dir: string) => { let n = 0; for (const f of walk(dir)) try { n += statSync(f).size; } catch {} return n; };
const mb = (n: number) => `${(n / 1e6).toFixed(1)} MB`;
const home = (p: string) => p.replace(HOME, "~");

// ---------------------------------------------------------------- 1. studio code reaching outside
{
  const add = check("reach", "Studio code only reads outside the studio through declared sources");
  const roots = ["server.ts", "src", "scripts", "motion/src", "motion/tools", "motion/brand"].map((r) => join(STUDIO, r));
  const hits: string[] = [], declared: string[] = [];
  for (const root of roots) for (const f of existsSync(root) && statSync(root).isDirectory() ? walk(root) : [root]) {
    if (!/\.(ts|mjs|js|py|json|sh)$/.test(f) || f.includes("/examples/")) continue;
    const rel = relative(STUDIO, f), text = readFileSync(f, "utf8");
    const lines = text.split("\n").map((l, i) => [i + 1, l] as const).filter(([, l]) => new RegExp(`\\/Users\\/[a-z]+\\/(?!rotli-studio)|~\\/(${productNames})(?![\\w-])|homedir\\(\\)`).test(l) && !/^\s*(\/\/|#|\*)/.test(l));
    if (!lines.length) continue;
    (DECLARED_READS[rel] ? declared : hits).push(...lines.map(([n, l]) => `${rel}:${n}  ${l.trim().slice(0, 140)}`));
  }
  if (hits.length) add("FAIL", `${hits.length} undeclared path(s) outside the studio`, hits); else add("PASS", "no undeclared paths outside the studio");
  add("INFO", "declared read-only sources", Object.entries(DECLARED_READS).filter(([k]) => k !== "scripts/check-isolation.ts").map(([k, v]) => `${k}: ${v}`));
  if (declared.length) add("INFO", `${declared.length} path line(s) in declared files`, declared);
}

// ---------------------------------------------------------------- 2. studio renders found anywhere else
// Only what the studio MADE counts: renders and exports. Brand assets and app captures flow the other way
// (product -> studio library/films) on purpose, so a product file equal to one of those is not a leak.
const studioMedia = new Map<number, { file: string; sha?: string }[]>(), studioNames = new Set<string>();
const outputs = [join(MOTION, "out"), join(STUDIO, "exports"), ...(existsSync(join(STUDIO, "films")) ? readdirSync(join(STUDIO, "films")).flatMap((d) => ["out", "renders"].map((o) => join(STUDIO, "films", d, o))) : [])];
for (const dir of outputs) for (const f of walk(dir)) {
  if (!MEDIA.has(extname(f).toLowerCase())) continue; const s = statSync(f).size; if (s < 20_000) continue;
  (studioMedia.get(s) ?? studioMedia.set(s, []).get(s)!).push({ file: f }); studioNames.add(basename(f).replace(/\.\w+$/, ""));
}
const slugs = new Set<string>(JSON.parse(readFileSync(join(MOTION, "pieces.json"), "utf8")).pieces.map((p: { slug: string }) => p.slug));
// pieces the owner chose to publish into a product: reported, but as intent rather than a leak
const published = new Set<string>(existsSync(join(MOTION, "published.json")) ? JSON.parse(readFileSync(join(MOTION, "published.json"), "utf8")).published.map((p: { slug: string }) => p.slug) : []);
const stemOf = (f: string) => basename(f).replace(/\.\w+$/, "").replace(/-(poster|thumb)$/, "");
const worktrees = PRODUCTS.flatMap((p) => (git(p, "worktree", "list", "--porcelain") ?? "").split("\n").filter((l) => l.startsWith("worktree ")).map((l) => l.slice(9))).filter((w, i, a) => a.indexOf(w) === i);
const trees = [...new Set([...PRODUCTS.filter(existsSync), ...worktrees])];
{
  const add = check("renders", "No studio render sits in a product repo, worktree or branch");
  for (const tree of trees) {
    const byContent: string[] = [], byName: string[] = [];
    for (const f of walk(tree)) {
      if (!MEDIA.has(extname(f).toLowerCase())) continue; const s = statSync(f).size;
      const same = studioMedia.get(s); if (same) { const h = sha(f); const m = same.find((x) => (x.sha ??= sha(x.file)) === h); if (m) { byContent.push(`${relative(tree, f)}  ==  ${relative(STUDIO, m.file)}`); continue; } }
      const stem = basename(f).replace(/\.\w+$/, "").replace(/-(poster|thumb)$/, "");
      if (slugs.has(stem) && s > 20_000) byName.push(`${relative(tree, f)}  (name of studio piece "${stem}")`);
    }
    const ignoredResidue = (f: string) => git(tree, "check-ignore", "-q", f) !== null;
    const tracked = new Set((git(tree, "ls-files") ?? "").split("\n"));
    const path = (l: string) => l.split("  ")[0] ?? l;
    const split = (list: string[]) => ({ tracked: list.filter((l) => tracked.has(path(l))), untracked: list.filter((l) => !tracked.has(path(l)) && !ignoredResidue(path(l))), ignored: list.filter((l) => !tracked.has(path(l)) && ignoredResidue(path(l))) });
    const all = split([...byContent, ...byName]), branch = git(tree, "rev-parse", "--abbrev-ref", "HEAD"), upstream = git(tree, "rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}");
    const where = `${home(tree)} [${branch}${upstream ? ` → ${upstream}` : ""}]`, deploys = branch === "main" || branch === "dev";
    const pushed = upstream && (git(tree, "rev-list", "--count", `${upstream}..HEAD`) === "0") ? " and pushed" : "";
    if (all.tracked.length) add(deploys ? "FAIL" : "WARN", `${all.tracked.length} studio render(s) COMMITTED${pushed} on ${deploys ? "deploying" : "experiment"} branch ${where}`, all.tracked);
    if (all.untracked.length) add("WARN", `${all.untracked.length} studio render(s) untracked in ${where}`, all.untracked);
    if (all.ignored.length) add("WARN", `${all.ignored.length} studio render(s) in gitignored files of ${where}`, all.ignored);
    if (!byContent.length && !byName.length) add("PASS", `none in ${where}`);
  }
  // remote branches that are not checked out anywhere
  for (const p of PRODUCTS.filter(existsSync)) {
    const branches = (git(p, "for-each-ref", "--format=%(refname:short)", "refs/remotes") ?? "").split("\n").filter((b) => b && !b.endsWith("/HEAD"));
    const leaks = branches.filter((b) => (git(p, "ls-tree", "-r", "--name-only", b) ?? "").split("\n").some((f) => MEDIA.has(extname(f).toLowerCase()) && slugs.has(basename(f).replace(/\.\w+$/, "").replace(/-(poster|thumb)$/, ""))));
    for (const b of leaks) {
      const files = (git(p, "ls-tree", "-r", "--name-only", b) ?? "").split("\n").filter((f) => MEDIA.has(extname(f).toLowerCase()) && slugs.has(stemOf(f)));
      const undeclared = files.filter((f) => !published.has(stemOf(f))), deploys = ["origin/main", "origin/dev"].includes(b);
      const merged = git(p, "log", "-1", "--format=%h %ad %s", "--date=short", b, "--", ...new Set(files.map((f) => f.replace(/\/[^/]+$/, "")))) ?? "";
      if (undeclared.length) add(deploys ? "FAIL" : "WARN", `remote branch ${b} of ${home(p)} carries ${undeclared.length} file(s) named after studio pieces${deploys ? " — this branch deploys" : " (not merged into main or dev)"}; last change: ${merged}. Declare them in motion/published.json if publishing them was intended`, undeclared.slice(0, 40));
      if (files.length > undeclared.length) add("INFO", `remote branch ${b}: ${files.length - undeclared.length} file(s) published on purpose (motion/published.json)`);
    }
    if (!leaks.length) add("PASS", `no remote branch of ${home(p)} carries studio pieces`);
  }
}

// ---------------------------------------------------------------- 3. tracked + dirty files in product repos
{
  const add = check("repos", "Product repos: no studio files tracked; dirty work carries no studio signature");
  for (const tree of trees) {
    const grep = git(tree, "grep", "-l", "-I", "-E", "rotli-studio|canvas-core/|anidoodle|quokka-film|tools/studio\\.mjs") ?? "";
    const files = grep.split("\n").filter(Boolean);
    if (files.length) add("WARN", `${files.length} tracked file(s) in ${home(tree)} mention the studio`, files); else add("PASS", `no tracked file in ${home(tree)} mentions the studio`);
    const dirty = (git(tree, "status", "--porcelain") ?? "").split("\n").filter(Boolean);
    const studioish = dirty.filter((l) => { const f = join(tree, l.slice(3)); try { return SIGNATURE.test(l) || (statSync(f).isFile() && statSync(f).size < 2e6 && SIGNATURE.test(readFileSync(f, "utf8"))); } catch { return false; } });
    if (studioish.length) add("WARN", `${studioish.length} dirty file(s) in ${home(tree)} carry a studio signature`, studioish);
    // history: studio-type content that was committed once and pushed (it stays in remote history even after removal)
    if (tree === join(HOME, "rotli")) {
      const past = (git(tree, "log", "--remotes", "--format=", "--name-only", "--", "marketing") ?? "").split("\n").filter(Boolean), uniq = [...new Set(past)];
      const media = uniq.filter((f) => MEDIA.has(extname(f).toLowerCase())), onMain = (git(tree, "ls-tree", "-r", "--name-only", "origin/main", "--", "marketing") ?? "").split("\n").filter(Boolean);
      if (uniq.length) add(onMain.length ? "FAIL" : "INFO", `${uniq.length} film-project file(s) under marketing/ are in the public repo's pushed HISTORY (${media.length} media); ${onMain.length ? `${onMain.length} still on origin/main` : "removed from origin/main"}. This predates the studio; rewriting public history is not recommended`, [git(tree, "log", "--remotes", "--format=%h %ad %s", "--date=short", "--", "marketing") ?? ""].join("\n").split("\n").slice(0, 4));
    }
    if (dirty.length - studioish.length) add("INFO", `${dirty.length - studioish.length} dirty file(s) in ${home(tree)} are other work (no studio signature)`, dirty.filter((l) => !studioish.includes(l)));
  }
}

// ---------------------------------------------------------------- 4. gitignored residue inside product folders
{
  const add = check("residue", "Nothing the studio made sits inside a product folder, even gitignored");
  let any = false;
  // ~/rotli/marketing/ was the studio's old home inside the product repo (gitignored). Anything left there is
  // compared file-by-file (path + size) with the studio's films/: a full match means it is a leftover copy.
  const legacy = join(HOME, "rotli/marketing");
  if (existsSync(legacy)) for (const name of readdirSync(legacy).filter((n) => !n.startsWith("."))) {
    const p = join(legacy, name), twin = [join(STUDIO, "films/launch-film", name), join(STUDIO, "films", name)].find(existsSync);
    const files = [...walk(p)], missing = twin ? files.filter((f) => { const t = join(twin, relative(p, f)); return !existsSync(t) || statSync(t).size !== statSync(f).size; }) : files;
    add("WARN", `${home(p)} (gitignored now): ${missing.length ? `${missing.length} of ${files.length} file(s) exist ONLY here` : `all ${files.length} file(s) are already in the studio at ${home(twin!)}`}`, [`${mb(size(p))}${missing.length ? ` · e.g. ${missing.slice(0, 3).map((f) => relative(p, f)).join(", ")}` : " · safe to delete: a leftover copy"}`]);
    any = true;
  }
  const harness = join(HOME, "rotli/tmp/companion-harness");
  if (existsSync(harness)) { any = true; add("WARN", `${home(harness)} exists: the companion render harness should be deleted after each run`); }
  const scratch = readdirSync("/tmp").filter((d) => /^(disc-|anidoodle|qf-|qsheet|ov$|k\d+$|v\d+b?$)/.test(d));
  if (scratch.length) add("INFO", `${scratch.length} scratch folder(s) in /tmp from studio work (outside every product; safe to delete)`, scratch.map((d) => `/tmp/${d}`));
  if (!any) add("PASS", "no studio residue inside product folders");
}

// ---------------------------------------------------------------- 5. live sites
if (!process.argv.includes("--offline")) {
  const add = check("live", "The live websites reference no studio media");
  for (const url of LIVE) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000), headers: { "user-agent": "rotli-studio isolation check" } }), html = await res.text();
      const refs = [...new Set([...html.matchAll(/["'(]([^"'()\s]+\.(?:mp4|webm|mov|webp|jpg|png))/g)].map((m) => m[1] ?? ""))].filter((u) => slugs.has(basename(u).replace(/\.\w+$/, "").replace(/-(poster|thumb)$/, "")) || studioNames.has(basename(u).replace(/\.\w+$/, "")));
      const undeclared = refs.filter((u) => !published.has(stemOf(u)));
      if (undeclared.length) add("WARN", `${url} serves ${undeclared.length} file(s) named like studio pieces (not declared in motion/published.json)`, undeclared);
      else add("PASS", `${url} (HTTP ${res.status}) serves no undeclared studio media${refs.length ? ` (${refs.length} published on purpose)` : ""}`);
    } catch (e) { add("INFO", `${url} not reachable: ${(e as Error).message}`); }
  }
}

// ---------------------------------------------------------------- 6. outside by design
{
  const add = check("design", "Outside the studio on purpose");
  const skill = join(HOME, ".claude/skills/brand-motion-studio/SKILL.md");
  if (existsSync(skill)) { const t = readFileSync(skill, "utf8"); const stub = t.includes("rotli-studio/.claude/skills/brand-motion-studio/SKILL.md") && t.length < 1500;
    add(stub ? "PASS" : "WARN", stub ? "~/.claude/skills/brand-motion-studio is a stub; the skill's text lives in the studio" : "~/.claude/skills/brand-motion-studio holds the full skill text outside the studio", [home(skill)]); }
  const ani = join(HOME, ".claude/skills/anidoodle");
  if (existsSync(ani)) add("INFO", "~/.claude/skills/anidoodle: the third-party anidoodle skill (installed globally; the studio vendored its engine into motion/)", [lstatSync(ani).isSymbolicLink() ? `symlink → ${readlinkSync(ani)}` : "directory"]);
  const mem = join(HOME, ".claude/projects", join(HOME, "rotli").replaceAll("/", "-"), "memory");
  if (existsSync(mem)) add("INFO", "Claude Code's project memory notes about the studio (agent memory, not product code)", readdirSync(mem).filter((f) => /quokka|studio|site_experiments/.test(f)).map((f) => home(join(mem, f))));
}

// ---------------------------------------------------------------- 7. the studio is local-only
{
  const add = check("local", "The studio repo is safe to be public; the editor server is local");
  // the studio repo is public and open source like rotli; what must hold is the public-repo gate
  const urls = [...new Set((git(STUDIO, "remote", "-v") ?? "").split("\n").filter(Boolean).map((l) => l.split(/\s+/)[1] ?? ""))];
  if (!urls.length) add("PASS", "studio git has no remote (nothing can be pushed)");
  for (const url of urls) {
    const slug = url.match(/github\.com[:/](.+?)(\.git)?$/)?.[1];
    const vis = slug ? Bun.spawnSync(["gh", "repo", "view", slug, "--json", "visibility", "--jq", ".visibility"], { stderr: "pipe" }).stdout.toString().trim() : "";
    const gate = Bun.spawnSync(["bun", "scripts/check-public.ts"], { cwd: STUDIO, stdout: "pipe", stderr: "pipe" });
    add(gate.exitCode === 0 ? "PASS" : "FAIL", `studio remote ${slug ?? url} is ${(vis || "unknown").toLowerCase()}; public-repo gate (check-public) ${gate.exitCode === 0 ? "passes" : "FAILS"}`, gate.exitCode === 0 ? undefined : (gate.stdout.toString() + gate.stderr.toString()).split("\n").slice(0, 20));
  }
  const srv = readFileSync(join(STUDIO, "server.ts"), "utf8");
  add(/HOST = "127\.0\.0\.1"/.test(srv) ? "PASS" : "FAIL", "server binds 127.0.0.1 only");
  const ignored = ["motion/out", "exports"].map((p) => [p, git(STUDIO, "check-ignore", "-q", p) !== null] as const);
  add(ignored.every(([, v]) => v) ? "PASS" : "WARN", "renders and exports are gitignored in the studio", ignored.map(([p, v]) => `${p}: ${v ? "ignored" : "NOT ignored"}`));
}

const rank = { FAIL: 3, WARN: 2, INFO: 0, PASS: 1 } as const;
const worst = (c: Check) => c.findings.reduce<Level>((w, f) => (rank[f.level] > rank[w] ? f.level : w), "PASS");
const summary = { when: new Date().toISOString(), studio: home(STUDIO), products: PRODUCTS.map(home), worktrees: worktrees.map(home), status: checks.reduce<Level>((w, c) => (rank[worst(c)] > rank[w] ? worst(c) : w), "PASS"), checks: checks.map((c) => ({ ...c, status: worst(c) })) };
if (process.argv.includes("--json")) console.log(JSON.stringify(summary, null, 1));
else {
  console.log(`isolation: ${summary.status}  (studio ${summary.studio}; products ${summary.products.join(", ")}; worktrees ${summary.worktrees.length})`);
  for (const c of summary.checks) { console.log(`\n[${c.status}] ${c.title}`); for (const f of c.findings) { console.log(`  ${f.level.padEnd(4)} ${f.text}`); for (const e of (f.evidence ?? []).slice(0, 12)) console.log(`         ${e}`); if ((f.evidence?.length ?? 0) > 12) console.log(`         … ${f.evidence!.length - 12} more`); } }
}
