// MAKE FAVICON: the studio's icon. The bold quokka mark inside a circle of Rottnest (the film's day sky,
// the deep horizon band and the turquoise sea, from motion/brand/brand.json), so it reads on light and
// dark browser tabs alike. The head's inside is filled with the sky colour, found by flood-filling the
// outside of the line art, so the sea never shows through the face.
//
//   bun scripts/make-favicon.ts      -> library/logo/favicon-{16,32,48,64,180,192,512}.png + favicon.ico
import { chromium } from "playwright-core";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, ".."), OUT = join(ROOT, "library/logo");
const P = JSON.parse(readFileSync(join(ROOT, "motion/brand/brand.json"), "utf8")).palette as Record<string, string>;
const logo = readFileSync(join(OUT, "_logo-bold.svg"), "utf8");
const SIZES = [16, 32, 48, 64, 180, 192, 512];

const browser = await chromium.launch(), page = await browser.newPage();
const pngs = (await page.evaluate(async ({ logo, P, SIZES }) => {
  const img = new Image(); img.src = "data:image/svg+xml;base64," + btoa(logo); await img.decode();
  // the mark's inside: rasterize, seal the open bottom of the bust, flood-fill the outside, keep the rest
  const M = 1024, m = document.createElement("canvas"); m.width = m.height = M; const mg = m.getContext("2d")!; mg.drawImage(img, 0, 0, M, M);
  const d = mg.getImageData(0, 0, M, M), ink = new Uint8Array(M * M), outside = new Uint8Array(M * M);
  for (let i = 0; i < M * M; i++) ink[i] = d.data[i * 4 + 3]! > 40 ? 1 : 0;
  let bottom = 0; for (let i = 0; i < M * M; i++) if (ink[i]) bottom = Math.max(bottom, Math.floor(i / M));
  const seal = bottom - 6; let lo = M, hi = 0; for (let y = seal - 40; y <= bottom; y++) for (let x = 0; x < M; x++) if (ink[y * M + x]) { lo = Math.min(lo, x); hi = Math.max(hi, x); }
  const barrier = new Uint8Array(M * M); for (let x = lo; x <= hi; x++) for (let t = 0; t < 4; t++) barrier[(seal + t) * M + x] = 1;
  const stack: number[] = []; for (let i = 0; i < M; i++) stack.push(i, (M - 1) * M + i, i * M, i * M + M - 1);
  while (stack.length) { const i = stack.pop()!; if (i < 0 || i >= M * M || outside[i] || ink[i] || barrier[i]) continue; outside[i] = 1; const x = i % M; stack.push(i - M, i + M); if (x > 0) stack.push(i - 1); if (x < M - 1) stack.push(i + 1); }
  const fill = mg.createImageData(M, M), [r, gg, b] = [1, 3, 5].map((k) => parseInt(P.sky!.slice(k, k + 2), 16));
  for (let i = 0; i < M * M; i++) if (!ink[i] && !outside[i] && Math.floor(i / M) < seal + 4) { fill.data[i * 4] = r!; fill.data[i * 4 + 1] = gg!; fill.data[i * 4 + 2] = b!; fill.data[i * 4 + 3] = 255; }
  const f = document.createElement("canvas"); f.width = f.height = M; f.getContext("2d")!.putImageData(fill, 0, 0);
  const scene = (S: number, Y: number, H = 0.6) => {
  const N = 1024, c = document.createElement("canvas"); c.width = c.height = N; const g = c.getContext("2d")!;
  // the scene, clipped to a circle
  g.save(); g.beginPath(); g.arc(N / 2, N / 2, N / 2, 0, Math.PI * 2); g.clip();
  const horizon = N * H;
  g.fillStyle = P.sky!; g.fillRect(0, 0, N, horizon);
  g.fillStyle = P.seaDeep!; g.fillRect(0, horizon, N, N * 0.05);
  g.fillStyle = P.sea!; g.fillRect(0, horizon + N * 0.05, N, N);
  g.strokeStyle = P.seaLine!; g.lineWidth = N * 0.018; g.lineCap = "round";
  for (const [x, y, w] of [[0.16, 0.8, 0.14], [0.72, 0.76, 0.12], [0.44, 0.9, 0.16]] as const) { g.beginPath(); g.moveTo(N * x, N * y); g.quadraticCurveTo(N * (x + w / 2), N * (y - 0.018), N * (x + w), N * y); g.stroke(); }
  const X = (N - S) / 2; // the head sits over the horizon, like the quokka on the ferry
  g.save(); g.beginPath(); g.arc(N / 2, N / 2, N / 2, 0, Math.PI * 2); g.clip(); g.drawImage(f, X, Y, S, S); g.drawImage(img, X, Y, S, S); g.restore();
  // a thin ink ring, in the mark's line weight, so the circle reads on a linen tab too
  g.strokeStyle = "#3a3028"; g.lineWidth = N * 0.035; g.beginPath(); g.arc(N / 2, N / 2, N / 2 - g.lineWidth / 2, 0, Math.PI * 2); g.stroke();
  g.restore(); return c; };
  const full = scene(1024 * 0.8, 1024 * 0.14), close = scene(1024 * 0.9, 1024 * 0.1, 0.52); // small icons: bigger head, higher sea so the blue still shows
  // every size, downsampled in halves for clean small icons
  return SIZES.map((size) => { let src: HTMLCanvasElement = size <= 48 ? close : full; while (src.width / 2 >= size) { const h = document.createElement("canvas"); h.width = h.height = src.width / 2; const hg = h.getContext("2d")!; hg.imageSmoothingQuality = "high"; hg.drawImage(src, 0, 0, h.width, h.height); src = h; }
    const o = document.createElement("canvas"); o.width = o.height = size; const og = o.getContext("2d")!; og.imageSmoothingQuality = "high"; og.drawImage(src, 0, 0, size, size); return [size, o.toDataURL("image/png")] as const; });
}, { logo, P, SIZES })) as [number, string][];
await browser.close();

const buf = (url: string) => Buffer.from(url.split(",")[1]!, "base64");
for (const [size, url] of pngs) writeFileSync(join(OUT, `favicon-${size}.png`), buf(url));
// favicon.ico: PNG-compressed entries (16, 32, 48), the format every current browser reads
const ico = pngs.filter(([s]) => [16, 32, 48].includes(s)).map(([s, u]) => ({ s, data: buf(u) }));
const head = Buffer.alloc(6 + 16 * ico.length); head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(ico.length, 4);
let offset = head.length;
ico.forEach((e, i) => { const o = 6 + 16 * i; head.writeUInt8(e.s, o); head.writeUInt8(e.s, o + 1); head.writeUInt16LE(1, o + 4); head.writeUInt16LE(32, o + 6); head.writeUInt32LE(e.data.length, o + 8); head.writeUInt32LE(offset, o + 12); offset += e.data.length; });
writeFileSync(join(OUT, "favicon.ico"), Buffer.concat([head, ...ico.map((e) => e.data)]));
console.log(`favicon: ${SIZES.join(", ")} px + favicon.ico -> library/logo/`);
