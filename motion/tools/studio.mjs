// THE STUDIO ROOM's one command. Reads pieces.json.
//   node tools/studio.mjs list
//   node tools/studio.mjs render [id|all]      videos -> out/video/<slug>.mp4 (+ .jpg poster)
//                                              carousels/stills -> ../exports/<slug>/<format>/NN.png + captions.md
//   node tools/studio.mjs golden [id|all] [--record]   pixel+sample lock (sealed pieces must stay SAME)
//   node tools/studio.mjs check [id|all]       dead-air scan of rendered videos (no identical consecutive frames)
//   node tools/studio.mjs catalog              out/index.html: every piece, playable, with its files
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), ".."),
  EXPORTS = resolve(ROOT, "..", "exports");
const P = JSON.parse(readFileSync(join(ROOT, "pieces.json"), "utf8")).pieces,
  [cmd = "list", which = "all"] = process.argv.slice(2);
const pick = () => {
  const got = which === "all" ? P : P.filter((p) => p.id === which || p.slug === which);
  if (!got.length) {
    console.error(`no piece matches "${which}" (an id or slug from pieces.json, or all)`);
    process.exit(2);
  }
  return got;
};
const node = (args) => {
  const r = spawnSync("node", args, { cwd: ROOT, stdio: "inherit" });
  if (r.status) process.exitCode = r.status;
  return r.status;
};
const videoOut = (p) => join(ROOT, "out", "video", `${p.slug}.mp4`),
  slideDir = (p) => join(EXPORTS, p.slug, p.format);

if (cmd === "list")
  for (const p of P)
    console.log(
      `${p.sealed ? "🔒" : "  "} ${p.id.padEnd(15)} ${p.kind.padEnd(9)} ${p.format.padEnd(12)} ${(p.length ?? "").padEnd(6)} ${p.about}`,
    );

if (cmd === "render")
  for (const p of pick()) {
    if (p.kind === "video") {
      mkdirSync(dirname(videoOut(p)), { recursive: true });
      if (!node(["tools/render.mjs", p.id, "--out", videoOut(p)]))
        execFileSync("ffmpeg", [
          "-y",
          "-loglevel",
          "error",
          "-sseof",
          "-0.4",
          "-i",
          videoOut(p),
          "-frames:v",
          "1",
          "-q:v",
          "3",
          videoOut(p).replace(/\.mp4$/, ".jpg"),
        ]);
      continue;
    }
    const { buildPage } = await import("./build-page.mjs"),
      { detect } = await import("./detect.mjs"),
      pw = await import("./adapters/playwright.mjs");
    const page = await buildPage({
      entry: `src/hosts/page-${p.id}.ts`,
      out: join(ROOT, "dist", `${p.id}.html`),
      title: p.id,
    });
    const s = await pw.open(detect(), page.out, { scale: 1, workers: 1 }),
      meta = await s.info(),
      dir = slideDir(p);
    mkdirSync(dir, { recursive: true });
    for (const f of readdirSync(dir)) if (/^\d+\.png$/.test(f)) rmSync(join(dir, f)); // a shorter carousel must not keep old trailing slides
    const n = meta.durationFrames / 15;
    for (let i = 0; i < n; i++) {
      const f = await s.frame(i * 15 + 14, 0);
      writeFileSync(join(dir, `${String(i + 1).padStart(2, "0")}.png`), f.png);
    }
    await s.close();
    if (p.caption) writeFileSync(join(EXPORTS, p.slug, "captions.md"), `# ${p.slug}\n\n${p.caption}\n`);
    console.log(`${p.id}: ${n} image(s) -> ${relative(ROOT, dir)}`);
  }

// one summary line at the end, so a partly-matching piece ("9/57 frames SAME") can never read as a pass
if (cmd === "golden") {
  const failed = pick()
    .filter((p) =>
      node(["tools/golden.mjs", p.id, ...(process.argv.includes("--record") && !p.sealed ? ["--record"] : [])]),
    )
    .map((p) => p.id);
  console.log(
    failed.length
      ? `GOLDEN: ${failed.length} of ${pick().length} piece(s) DIFFER: ${failed.join(" ")}`
      : `GOLDEN: all ${pick().length} piece(s) SAME`,
  );
}

if (cmd === "check")
  for (const p of pick().filter((x) => x.kind === "video")) {
    const r = spawnSync("node", ["tools/still-frames.mjs", videoOut(p)], { cwd: ROOT }),
      [same, win] = r.stdout.toString().trim().split("\n");
    const bad = !!win.replace("windows:", "").trim();
    console.log(`${p.id.padEnd(15)} ${bad ? "DEAD AIR " + win : "ok"}  (${same} single identical frames)`);
    if (bad) process.exitCode = 1;
  }

if (cmd === "catalog") {
  const card = (p) => {
    const files =
      p.kind === "video"
        ? [videoOut(p)]
        : Array.from({ length: 12 }, (_, i) => join(slideDir(p), `${String(i + 1).padStart(2, "0")}.png`)).filter(
            existsSync,
          );
    const media =
      p.kind === "video"
        ? `<video controls preload="metadata" poster="${relative(join(ROOT, "out"), videoOut(p).replace(/\.mp4$/, ".jpg"))}" src="${relative(join(ROOT, "out"), videoOut(p))}"></video>`
        : `<div class="strip">${files.map((f) => `<a href="${relative(join(ROOT, "out"), f)}"><img src="${relative(join(ROOT, "out"), f)}"></a>`).join("")}</div>`;
    return `<section class="${p.format}"><h2>${p.sealed ? "🔒 " : ""}${p.id} <small>${p.kind} · ${p.format} ${p.length ?? ""}</small></h2><p>${p.about}</p>${media}</section>`;
  };
  writeFileSync(
    join(ROOT, "out", "index.html"),
    `<!doctype html><meta charset="utf-8"><title>rotli studio · motion room</title><style>body{font:16px/1.5 -apple-system,sans-serif;background:#f8f2e9;color:#3a3028;margin:40px auto;max-width:1200px;padding:0 24px}h1{font-size:34px}h2{font-size:22px;margin:0}small{color:#6e6155;font-weight:400}section{background:#fff;border:2px solid #e7dbc9;border-radius:18px;padding:20px;margin:18px 0}video{max-width:100%;max-height:640px;border-radius:12px;background:#000}.strip{display:flex;gap:10px;overflow-x:auto}.strip img{height:320px;border-radius:10px;border:1px solid #e7dbc9}</style><h1>rotli studio · motion room</h1><p>Everything here is drawn by code in <code>motion/</code>; see <code>pieces.json</code> and <code>SKILL.md</code>.</p>${P.map(card).join("")}`,
  );
  console.log(`catalog -> ${relative(ROOT, join(ROOT, "out", "index.html"))}`);
}
