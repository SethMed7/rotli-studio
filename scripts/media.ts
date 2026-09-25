// MEDIA: the renders the hosted site is built from. Git deliberately does not hold them (hundreds of MB of video),
// so they are published as assets of one GitHub release, `studio-media`, where the deploy workflow fetches them.
//
//   bun scripts/media.ts publish   build the snapshot here (fresh web copies and thumbnails, the privacy scan), then
//                                  upload each part whose content changed, and media.json last
//   bun scripts/media.ts fetch     (CI) download every part, unpack it into the checkout, verify its content hash
//   bun scripts/media.ts status    compare the media on this Mac with what is published
//
// Run `publish` after rendering new or changed pieces, before (or right after) pushing them: the site deploys the
// published renders. Only media the site uses is published (the same inventory as scripts/export-site.ts: renders
// of registered pieces, their web copies and thumbnails, and the slides the manifest references), and it is
// public, like the site itself.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(import.meta.dir, ".."),
  MOTION = join(ROOT, "motion"),
  TAG = "studio-media",
  WORK = join(ROOT, "tmp/media");
type Part = { name: string; files: string[] };
type Published = {
  commit: string;
  published: string;
  parts: Record<string, { sha: string; files: number; bytes: number }>;
};

const sh = (cmd: string[], opts: { input?: string; allowFail?: boolean; env?: Record<string, string> } = {}) => {
  const r = Bun.spawnSync(cmd, {
    cwd: ROOT,
    stdin: opts.input ? new TextEncoder().encode(opts.input) : undefined,
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, ...opts.env },
  });
  if (r.exitCode && !opts.allowFail) throw new Error(`${cmd.join(" ")}\n${r.stderr}`);
  return { ok: r.exitCode === 0, out: r.stdout.toString() };
};
const walk = (dir: string): string[] =>
  existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? walk(join(dir, e.name)) : e.name.startsWith(".") ? [] : [join(dir, e.name)],
      )
    : [];
const rel = (f: string) => relative(ROOT, f);

/** the four parts, each a list of repo-relative files */
function parts(): Part[] {
  const pieces = JSON.parse(readFileSync(join(MOTION, "pieces.json"), "utf8")).pieces as {
    slug: string;
    kind: string;
  }[];
  const video = pieces
    .filter((p) => p.kind === "video")
    .flatMap((p) => [`motion/out/video/${p.slug}.mp4`, `motion/out/video/${p.slug}.jpg`]);
  const manifest = JSON.parse(readFileSync(join(MOTION, "out/manifest.json"), "utf8"));
  const slides = new Set<string>();
  const collect = (x: unknown): void => {
    if (typeof x === "string") {
      if (x.startsWith("../exports/") && x.endsWith(".png")) slides.add(x.slice(3));
    } else if (x && typeof x === "object") Object.values(x).forEach(collect);
  };
  collect(manifest);
  return [
    { name: "video", files: video },
    { name: "web", files: walk(join(MOTION, "out/web")).map(rel) },
    { name: "thumbs", files: walk(join(MOTION, "out/thumbs-1280")).map(rel) },
    { name: "exports", files: [...slides] },
  ].map((p) => ({ ...p, files: p.files.filter((f) => existsSync(join(ROOT, f))).sort() }));
}
/** a part's identity: every path, size and content hash, so re-packing unchanged files never re-uploads */
function contentSha(files: string[]) {
  const h = createHash("sha256");
  for (const f of files)
    h.update(
      `${f}\0${statSync(join(ROOT, f)).size}\0${createHash("sha256")
        .update(readFileSync(join(ROOT, f)))
        .digest("hex")}\n`,
    );
  return h.digest("hex");
}
const published = (): Published | null => {
  const r = sh(["gh", "release", "download", TAG, "-p", "media.json", "-O", "-"], { allowFail: true });
  return r.ok ? (JSON.parse(r.out) as Published) : null;
};

const cmd = process.argv[2];
if (cmd === "status" || cmd === "publish") {
  if (cmd === "publish") {
    console.log("building the snapshot first (fresh web copies, thumbnails, privacy scan)…");
    const r = Bun.spawnSync(["bun", "scripts/export-site.ts"], { cwd: ROOT, stdout: "inherit", stderr: "inherit" });
    if (r.exitCode) process.exit(r.exitCode ?? 1);
  }
  const local = parts().map((p) => ({
    ...p,
    sha: contentSha(p.files),
    bytes: p.files.reduce((a, f) => a + statSync(join(ROOT, f)).size, 0),
  }));
  const remote = published();
  for (const p of local)
    console.log(
      `${p.name.padEnd(8)} ${String(p.files.length).padStart(4)} files ${(p.bytes / 1e6).toFixed(0).padStart(5)} MB  ${remote?.parts[p.name]?.sha === p.sha ? "published" : "CHANGED"}`,
    );
  if (cmd === "status") process.exit(0);
  if (!sh(["gh", "release", "view", TAG], { allowFail: true }).ok)
    sh([
      "gh",
      "release",
      "create",
      TAG,
      "--prerelease",
      "--title",
      "Studio media (renders)",
      "--notes",
      "The rendered videos, web copies, thumbnails and slides the hosted studio is built from. Managed by scripts/media.ts; the deploy workflow downloads them. Not a software release.",
    ]);
  mkdirSync(WORK, { recursive: true });
  for (const p of local) {
    if (remote?.parts[p.name]?.sha === p.sha) continue;
    const list = join(WORK, `${p.name}.list`),
      tar = join(WORK, `${p.name}.tar`);
    writeFileSync(list, p.files.join("\n") + "\n");
    // plain tar keeps modification times (the export's caches compare them) and no macOS metadata
    sh(["tar", "--no-mac-metadata", "--no-xattrs", "-cf", tar, "-T", list], { env: { COPYFILE_DISABLE: "1" } });
    console.log(`uploading ${p.name} (${(statSync(tar).size / 1e6).toFixed(0)} MB)…`);
    sh(["gh", "release", "upload", TAG, tar, "--clobber"]);
  }
  const record: Published = {
    commit: sh(["git", "rev-parse", "HEAD"]).out.trim(),
    published: new Date().toISOString(),
    parts: Object.fromEntries(local.map((p) => [p.name, { sha: p.sha, files: p.files.length, bytes: p.bytes }])),
  };
  writeFileSync(join(WORK, "media.json"), JSON.stringify(record, null, 1) + "\n");
  sh(["gh", "release", "upload", TAG, join(WORK, "media.json"), "--clobber"]);
  console.log(`media: published at ${record.commit.slice(0, 8)}`);
} else if (cmd === "fetch") {
  const remote = published();
  if (!remote) {
    console.error(`no ${TAG} release: run \`bun scripts/media.ts publish\` on the Mac that renders`);
    process.exit(1);
  }
  mkdirSync(WORK, { recursive: true });
  sh(["gh", "release", "download", TAG, "-p", "*.tar", "-D", WORK, "--clobber"]);
  for (const name of Object.keys(remote.parts)) {
    sh(["tar", "-xf", join(WORK, `${name}.tar`), "-C", ROOT]);
    const files = sh(["tar", "-tf", join(WORK, `${name}.tar`)])
      .out.split("\n")
      .filter((l) => l && !l.endsWith("/"))
      .sort();
    if (contentSha(files) !== remote.parts[name]!.sha) {
      console.error(`media: ${name} does not match media.json (a partial upload?)`);
      process.exit(1);
    }
    console.log(`media: ${name} ${files.length} files verified`);
  }
  // renders are made on the Mac; say so when the pieces changed after the media were last published
  const since = sh(
    ["git", "diff", "--name-only", remote.commit, "HEAD", "--", "motion/src", "motion/pieces.json", "motion/brand"],
    { allowFail: true },
  );
  if (!since.ok)
    console.log(`::warning::media were published from ${remote.commit.slice(0, 8)}, which is not in this history`);
  else if (since.out.trim())
    console.log(
      `::warning::piece sources changed since the media were published (${remote.commit.slice(0, 8)}); the site shows the published renders. Run \`bun scripts/media.ts publish\` after rendering.`,
    );
} else {
  console.error("usage: bun scripts/media.ts publish | fetch | status");
  process.exit(2);
}
