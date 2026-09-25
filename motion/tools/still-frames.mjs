// Dead-air measure on a rendered video (gate.mjs's method: 270x270 greyscale thumbnails).
//   identical: frames equal to the previous one
//   windows: half-second spans (15 frames at 30 fps, 30 at 60) where every frame is still: under 0.5% of the
//            frame changed (the anidoodle standard) AND under 3% of the drawn content changed. The second test
//            only matters for sparse designs (one dot on a dark ground is small against the frame but not
//            against what is drawn); for full-frame illustration it is the first test that decides, as before.
// Prints "identical: …" and "windows: …"; exits 1 when any window is found.
import { spawnSync } from "node:child_process";
const W = 270,
  px = W * W,
  g = spawnSync(
    "ffmpeg",
    ["-v", "error", "-i", process.argv[2], "-vf", `scale=${W}:${W}`, "-pix_fmt", "gray", "-f", "rawvideo", "-"],
    { maxBuffer: 1 << 30 },
  ).stdout,
  n = Math.floor(g.length / px),
  ch = [0],
  same = [];
const rate = spawnSync("ffprobe", [
  "-v",
  "error",
  "-select_streams",
  "v:0",
  "-show_entries",
  "stream=r_frame_rate",
  "-of",
  "csv=p=0",
  process.argv[2],
])
  .stdout.toString()
  .trim()
  .split("/")
  .map(Number);
const span = Math.max(15, Math.round((rate[0] / (rate[1] || 1)) * 0.5) || 15);
// content = pixels that differ from the frame's ground (its most common grey level)
const content = (f) => {
  const hist = new Uint32Array(256);
  for (let i = 0; i < px; i++) hist[g[f * px + i]]++;
  const ground = hist.indexOf(Math.max(...hist));
  let c = 0;
  for (let i = 0; i < px; i++) if (Math.abs(g[f * px + i] - ground) > 12) c++;
  return c;
};
const still = [false];
for (let f = 1; f < n; f++) {
  let c = 0;
  for (let i = 0; i < px; i++) if (Math.abs(g[(f - 1) * px + i] - g[f * px + i]) > 4) c++;
  ch.push(c / px);
  if (c === 0) same.push(f);
  still.push(c / px < 0.005 && c / Math.max(content(f), px * 0.02) < 0.03);
}
const win = [];
for (let f = 1; f + span <= n; f++) {
  let dead = true;
  for (let k = f; k < f + span; k++) dead &&= still[k];
  if (dead) {
    const l = win[win.length - 1];
    if (l && f <= l[1]) l[1] = f + span;
    else win.push([f, f + span]);
  }
}
console.log(`identical: ${same.length}`);
console.log(`windows: ${win.map(([a, b]) => `${a}-${b}`).join(" ")}`);
process.exit(win.length ? 1 : 0);
