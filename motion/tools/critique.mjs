// CRITIQUE: what a reviewer (a person or the agent itself) needs to score a rendered video against
// workflows/critique.md, from the video file alone, so it works the same on our renders and on a reference.
//
//   node tools/critique.mjs <video.mp4> [--out /tmp/critique-<name>]
//
// Writes into --out:
//   sheet.png   every half second, 8 across (pacing, variety, composition)
//   phone.png   twelve evenly spaced frames at 360 px wide, the width of a phone feed (readability)
//   fast-1.png, fast-2.png   twelve consecutive frames around the two fastest moves (motion quality, ghosting)
//   pace.json   the pacing numbers below, and the timestamps of every sheet cell
// and prints the numbers. The measures are the ones the field study used on its references
// (series/studies/notes/2026-09-28-the-harness-is-the-studio.md): frames compared at 96 × 54 greyscale, 30 fps;
//   changes per 10 s   peaks of the mean frame difference above 18 grey levels, merged within 6 frames: the
//                      piece's punctuation (cuts, flips, slams, pops), not its motion; a film that glides reads low
//   longest calm       the longest stretch with no such change, in seconds (the "something new every 2–4 s" test)
//   near-still         the share of frames that differ from the previous one by under 0.4 grey levels
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const video = process.argv[2];
if (!video || video.startsWith("--")) {
  console.error("usage: node tools/critique.mjs <video.mp4> [--out dir]");
  process.exit(2);
}
const out = resolve(arg("out", `/tmp/critique-${basename(video).replace(/\.\w+$/, "")}`));
mkdirSync(out, { recursive: true });
const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { maxBuffer: 1 << 30 });
  if (r.status) throw new Error(`${cmd} failed: ${r.stderr.toString().slice(-400)}`);
  return r.stdout;
};
const probe = (entries) =>
  run("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", entries, "-of", "csv=p=0", video])
    .toString()
    .trim();
const duration = Number(
  run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", video]).toString(),
);
const [W, H] = probe("stream=width,height").split(",").map(Number);
const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${(s % 60).toFixed(1).padStart(4, "0")}`;

// ---- pacing, from the same 96 × 54 greyscale frames as the study
const w = 96,
  h = 54,
  px = w * h,
  g = run("ffmpeg", [
    "-v",
    "error",
    "-i",
    video,
    "-vf",
    `fps=30,scale=${w}:${h}`,
    "-pix_fmt",
    "gray",
    "-f",
    "rawvideo",
    "-",
  ]),
  n = Math.floor(g.length / px),
  diff = new Float64Array(n);
for (let f = 1; f < n; f++) {
  let s = 0;
  for (let i = 0; i < px; i++) s += Math.abs(g[f * px + i] - g[(f - 1) * px + i]);
  diff[f] = s / px;
}
const events = [];
for (let f = 1; f < n - 1; f++)
  if (diff[f] > 18 && diff[f] >= diff[f - 1] && diff[f] >= diff[f + 1] && (!events.length || f - events.at(-1) > 6))
    events.push(f);
const marks = [0, ...events, n - 1];
let calm = 0,
  calmAt = 0;
for (let i = 1; i < marks.length; i++)
  if (marks[i] - marks[i - 1] > calm) [calm, calmAt] = [marks[i] - marks[i - 1], marks[i - 1]];
const still = diff.slice(1).filter((d) => d < 0.4).length / Math.max(1, n - 1);
// the two fastest moves: the largest mean difference over a quarter second, at least two seconds apart
const win = 8,
  speed = Array.from({ length: n }, (_, f) => {
    let s = 0;
    for (let k = Math.max(1, f - win / 2); k < Math.min(n, f + win / 2); k++) s += diff[k];
    return s;
  });
const fast = [];
for (const f of [...speed.keys()].sort((a, b) => speed[b] - speed[a]))
  if (fast.every((x) => Math.abs(x - f) > 60)) {
    fast.push(f);
    if (fast.length === 2) break;
  }

// ---- the sheets (ffmpeg tiles; each cell is labelled in pace.json, not on the image, so nothing covers the frame)
const halfSeconds = Math.max(1, Math.floor(duration * 2));
const rows = Math.ceil(halfSeconds / 8);
run("ffmpeg", [
  "-v",
  "error",
  "-y",
  "-i",
  video,
  "-vf",
  `fps=2,scale=320:-2,tile=8x${rows}:padding=4:color=white`,
  "-frames:v",
  "1",
  join(out, "sheet.png"),
]);
const phoneAt = Array.from({ length: 12 }, (_, i) => ((i + 0.5) / 12) * duration);
run("ffmpeg", [
  "-v",
  "error",
  "-y",
  "-i",
  video,
  "-vf",
  `fps=12/${duration.toFixed(3)},scale=360:-2,tile=4x3:padding=6:color=white`,
  "-frames:v",
  "1",
  join(out, "phone.png"),
]);
fast.forEach((f, i) =>
  run("ffmpeg", [
    "-v",
    "error",
    "-y",
    "-ss",
    Math.max(0, f / 30 - 0.2).toFixed(3),
    "-i",
    video,
    "-vf",
    `fps=30,scale=480:-2,tile=6x2:padding=4:color=white`,
    "-frames:v",
    "1",
    join(out, `fast-${i + 1}.png`),
  ]),
);

const pace = {
  video: basename(video),
  size: `${W}x${H}`,
  seconds: +duration.toFixed(2),
  changesPer10s: +((events.length / (n / 30)) * 10).toFixed(1),
  longestCalm: { seconds: +(calm / 30).toFixed(1), from: mmss(calmAt / 30) },
  nearStill: +(still * 100).toFixed(0),
  changesAt: events.map((f) => mmss(f / 30)),
  fastMoves: fast.map((f) => mmss(f / 30)),
  sheet: { file: "sheet.png", everySeconds: 0.5, across: 8 },
  phone: { file: "phone.png", at: phoneAt.map(mmss) },
};
writeFileSync(join(out, "pace.json"), JSON.stringify(pace, null, 1) + "\n");
console.log(
  `${pace.video}: ${pace.seconds} s · ${pace.changesPer10s} changes per 10 s · longest calm ${pace.longestCalm.seconds} s from ${pace.longestCalm.from} · near-still ${pace.nearStill} % · fastest moves at ${pace.fastMoves.join(", ")}`,
);
console.log(`sheets -> ${out}/ (sheet.png, phone.png, fast-1.png, fast-2.png, pace.json)`);
