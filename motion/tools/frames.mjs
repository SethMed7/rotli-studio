// node tools/frames.mjs <film> <frame,frame,...> [--out out/frames] [--sheet out/sheet.png] [--cols 4]
// Renders chosen frames in ONE browser session (fast review), optionally tiled into a contact sheet.
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildPage } from "./build-page.mjs";
import { detect } from "./detect.mjs";
import * as playwright from "./adapters/playwright.mjs";
const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : d;
}; // helper from anidoodle tools/render.mjs (Apache-2.0)
const film = process.argv[2],
  list = process.argv[3].split(",").map(Number),
  out = resolve(arg("out", "out/frames")),
  sheet = arg("sheet"),
  cols = Number(arg("cols", 4));
const env = detect(),
  page = await buildPage({ entry: `src/hosts/page-${film}.ts`, out: resolve(`dist/${film}.html`), title: film });
const s = await playwright.open(env, page.out, { scale: 1, workers: 1 });
mkdirSync(out, { recursive: true });
const files = [];
for (const n of list) {
  const f = await s.frame(n, 0),
    p = `${out}/f${String(n).padStart(4, "0")}.png`;
  writeFileSync(p, f.png);
  files.push(p);
  console.log(`frame ${n} ${f.shot} draw ${f.drawMs.toFixed(0)}ms`);
}
await s.close();
if (sheet)
  execFileSync("python3", [
    "-c",
    `import sys\nfrom PIL import Image, ImageDraw\nfs=sys.argv[3:]; c=int(sys.argv[2]); r=(len(fs)+c-1)//c\nw0,h0=Image.open(fs[0]).size; tw=640 if w0>=h0 else 320; th=round(tw*h0/w0)\nS=Image.new("RGB",(c*tw,r*th))\nfor i,f in enumerate(fs):\n  im=Image.open(f).convert("RGB").resize((tw,th)); d=ImageDraw.Draw(im); d.rectangle((0,0,70,26),fill="black"); d.text((6,6),f[-8:-4],fill="white"); S.paste(im,((i%c)*tw,(i//c)*th))\nS.save(sys.argv[1])`,
    resolve(sheet),
    String(cols),
    ...files,
  ]);
