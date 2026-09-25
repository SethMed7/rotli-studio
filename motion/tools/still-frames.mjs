// Dead-air measure on a rendered video (gate.mjs's method: 270x270 greyscale thumbnails).
//   identical: frames equal to the previous one     windows: 15-frame spans where every frame changed < 0.5%
// Prints "identical: …" and "windows: …"; exits 1 when any window is found (the anidoodle standard).
import { spawnSync } from "node:child_process";
const W = 270, px = W * W, g = spawnSync("ffmpeg", ["-v", "error", "-i", process.argv[2], "-vf", `scale=${W}:${W}`, "-pix_fmt", "gray", "-f", "rawvideo", "-"], { maxBuffer: 1 << 30 }).stdout, n = Math.floor(g.length / px), ch = [0], same = [];
for (let f = 1; f < n; f++) { let c = 0; for (let i = 0; i < px; i++) if (Math.abs(g[(f - 1) * px + i] - g[f * px + i]) > 4) c++; ch.push(c / px); if (c === 0) same.push(f); }
const win = []; for (let f = 1; f + 15 <= n; f++) { let m = 0; for (let k = f; k < f + 15; k++) m = Math.max(m, ch[k]); if (m < 0.005) { const l = win[win.length - 1]; if (l && f <= l[1]) l[1] = f + 15; else win.push([f, f + 15]); } }
console.log(`identical: ${same.length}`); console.log(`windows: ${win.map(([a, b]) => `${a}-${b}`).join(" ")}`); process.exit(win.length ? 1 : 0);
