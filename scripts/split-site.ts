// SPLIT SITE: keep the Railway upload small however large the library grows. The heavy files of a built snapshot
// (videos, images) move out of site-dist/public into one tar, which is attached to the `studio-site` GitHub release;
// site-dist/Dockerfile is rewritten to download that exact tar at build time and check its sha256 before unpacking.
// What Railway receives is then only pages, scripts, styles, data and fonts (a few MB).
//
//   bun scripts/export-site.ts && bun scripts/split-site.ts          (then `railway up` from site-dist/)
//   bun scripts/split-site.ts --keep 3                                also prune all but the 3 newest tars
//
// Needs `gh` with permission to upload release assets (GH_TOKEN in CI).
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";

const ROOT = join(import.meta.dir, ".."),
  DIST = join(ROOT, "site-dist"),
  PUB = join(DIST, "public"),
  TAG = "studio-site",
  REPO = "SethMed7/rotli-studio",
  HEAVY = /\.(mp4|jpg|jpeg|png|webp|zip)$/i;
const sh = (cmd: string[], allowFail = false) => {
  const r = Bun.spawnSync(cmd, { cwd: ROOT, stdout: "pipe", stderr: "pipe" });
  if (r.exitCode && !allowFail) throw new Error(`${cmd.join(" ")}\n${r.stderr}`);
  return { ok: r.exitCode === 0, out: r.stdout.toString() };
};
const walk = (d: string): string[] =>
  readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));

if (!existsSync(join(DIST, "Dockerfile"))) {
  console.error("no site-dist/: run bun scripts/export-site.ts first");
  process.exit(1);
}
// 1. move the heavy files into a staging folder that mirrors /srv, and tar it (the asset is named by its hash)
const heavy = walk(PUB).filter((f) => HEAVY.test(f));
const STAGE = join(ROOT, "tmp/site-media");
rmSync(STAGE, { recursive: true, force: true });
for (const f of heavy) {
  const to = join(STAGE, relative(PUB, f));
  mkdirSync(dirname(to), { recursive: true });
  renameSync(f, to);
}
const list = heavy.map((f) => relative(PUB, f)).sort();
writeFileSync(join(ROOT, "tmp/site-media.list"), list.join("\n") + "\n");
const tarTmp = join(ROOT, "tmp/site-media.tar");
// bsdtar (macOS) must be told to leave out Mac metadata; GNU tar (CI) has no such flags
const macTar = sh(["tar", "--version"]).out.includes("bsdtar");
sh([
  "tar",
  ...(macTar ? ["--no-mac-metadata", "--no-xattrs"] : []),
  "-cf",
  tarTmp,
  "-C",
  STAGE,
  "-T",
  join(ROOT, "tmp/site-media.list"),
]);
const sha = createHash("sha256").update(readFileSync(tarTmp)).digest("hex"),
  name = `site-media-${sha.slice(0, 16)}.tar`;
renameSync(tarTmp, join(ROOT, "tmp", name));

// 2. publish it (idempotent: the name is its hash)
if (!sh(["gh", "release", "view", TAG, "-R", REPO], true).ok)
  sh([
    "gh",
    "release",
    "create",
    TAG,
    "-R",
    REPO,
    "--prerelease",
    "--title",
    "Studio site media (deploy)",
    "--notes",
    "The heavy files of each deployed snapshot of studio.rotli.co, fetched by its Docker build and checked by sha256. Managed by scripts/split-site.ts; not a software release.",
  ]);
const assets = sh([
  "gh",
  "release",
  "view",
  TAG,
  "-R",
  REPO,
  "--json",
  "assets",
  "--jq",
  '.assets[] | .name + " " + .createdAt',
])
  .out.trim()
  .split("\n")
  .filter(Boolean);
if (!assets.some((a) => a.startsWith(name + " ")))
  sh(["gh", "release", "upload", TAG, "-R", REPO, join(ROOT, "tmp", name)]);

// 3. the Dockerfile fetches and verifies that tar, then adds the light files on top
const docker = readFileSync(join(DIST, "Dockerfile"), "utf8"),
  from = docker.split("\n").find((l) => l.startsWith("FROM "))!;
writeFileSync(
  join(DIST, "Dockerfile"),
  `# The studio's hosted snapshot: static files behind Caddy. Nothing here talks to rotli.co.
# Heavy media come from the studio-site release (scripts/split-site.ts), checked by sha256 before they are used.
${from}
RUN wget -q -O /tmp/media.tar "https://github.com/${REPO}/releases/download/${TAG}/${name}" \\
 && echo "${sha}  /tmp/media.tar" | sha256sum -c - \\
 && mkdir -p /srv && tar -xf /tmp/media.tar -C /srv && rm /tmp/media.tar
COPY Caddyfile /etc/caddy/Caddyfile
COPY public /srv
`,
);

// 4. keep the release small: prune all but the newest N tars (never the one just published)
const keep = Number(process.argv[process.argv.indexOf("--keep") + 1] || 0);
if (process.argv.includes("--keep") && keep > 0)
  assets
    .filter((a) => a.startsWith("site-media-"))
    .sort((a, b) => b.split(" ")[1]!.localeCompare(a.split(" ")[1]!))
    .slice(keep)
    .map((a) => a.split(" ")[0]!)
    .filter((n) => n !== name)
    .forEach((n) => sh(["gh", "release", "delete-asset", TAG, n, "-R", REPO, "-y"], true));
rmSync(STAGE, { recursive: true, force: true });
const light = walk(PUB).reduce((a, f) => a + statSync(f).size, 0);
console.log(
  `split: ${heavy.length} heavy files → ${name} (${(statSync(join(ROOT, "tmp", name)).size / 1e6).toFixed(0)} MB); Railway uploads ${(light / 1e6).toFixed(1)} MB`,
);
