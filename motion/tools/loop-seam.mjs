// LOOP SEAM: proves a looping video has no jump where it wraps. The change from the last frame back to the first
// must look like any other step: no bigger than the largest change between neighbouring frames inside the loop.
//   node tools/loop-seam.mjs out/video/one-shape-loop.mp4
// Prints the seam change and the largest inner change (as % of pixels moved); exits 1 on a visible seam.
import { spawnSync } from "node:child_process";

const file = process.argv[2];
if (!file) {
  console.error("usage: node tools/loop-seam.mjs <video.mp4>");
  process.exit(2);
}
const W = 270,
  px = W * W;
const r = spawnSync(
  "ffmpeg",
  ["-v", "error", "-i", file, "-vf", `scale=${W}:${W}`, "-pix_fmt", "gray", "-f", "rawvideo", "-"],
  { maxBuffer: 1 << 30 },
);
if (r.status) {
  console.error(r.stderr.toString());
  process.exit(2);
}
const g = r.stdout,
  n = Math.floor(g.length / px);
const diff = (a, b) => {
  let c = 0;
  for (let i = 0; i < px; i++) if (Math.abs(g[a * px + i] - g[b * px + i]) > 4) c++;
  return c / px;
};
let inner = 0;
for (let f = 1; f < n; f++) inner = Math.max(inner, diff(f - 1, f));
const seam = diff(n - 1, 0),
  ok = seam <= inner * 1.1 + 0.002;
console.log(
  `seam: ${(seam * 100).toFixed(2)}% · largest inner step: ${(inner * 100).toFixed(2)}% · ${ok ? "SEAMLESS" : "VISIBLE SEAM"}`,
);
process.exit(ok ? 0 : 1);
