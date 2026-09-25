// prints frames whose 270x270 greyscale thumbnail is identical to the previous frame (gate.mjs's measure)
import { spawnSync } from "node:child_process";
const W = 270, px = W * W, g = spawnSync("ffmpeg", ["-v", "error", "-i", process.argv[2], "-vf", `scale=${W}:${W}`, "-pix_fmt", "gray", "-f", "rawvideo", "-"], { maxBuffer: 1 << 30 }).stdout, n = Math.floor(g.length / px), out = [];
for (let f = 1; f < n; f++) { let c = 0; for (let i = 0; i < px; i++) if (Math.abs(g[(f - 1) * px + i] - g[f * px + i]) > 4) c++; if (c === 0) out.push(f); }
console.log(out.join(" "));
