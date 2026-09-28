// STUDY 24 · DOODLE GUIDE (36 s, 30 fps, 120 bpm). A fun explainer about goldendoodles, hosted by the owner's
// own turtle mascot (a sanctioned exception to "Oriel only"). The spine: ONE character survives many rendering
// styles. A round badge in the bottom-left corner holds the turtle's head, and every section redraws it in a new
// style computed in code from the PNG (pixel dither, halftone, riso, ink line, flat poster, original). Each
// section flips to its own full-bleed colour on a hard cut; the dogs are drawn in code and their coats (straight,
// wavy, curly) are the lesson. One source, designed for landscape and vertical. Brand: the neutral pack, "doodle".
// Brief: series/studies/briefs/doodle-guide.json · prompt: series/studies/prompts/doodle-guide.prompt.md
//
// The film is one continuous paint(F) of a (fractional) frame; the shots only name the sections. Every style is
// computed ONCE per (source, style, pixel size) with getImageData into an offscreen canvas cached at module level;
// frames only draw cached canvases, so each frame stays a pure function of F.
import PACK from "../../../brand/packs/studio/pack.json";
import { rng, type Ctx, type Env, type Layer } from "../core";
import type { Film, Shot } from "../film";
import { clamp, ease, lerp, prog, spring } from "../kit/motion";
import { usePack } from "../kit/pack";
import { beatScore } from "../kit/score";
import { layout, type Size } from "../kit/sizes";
import { measure, text } from "../kit/type";
import { rr } from "../kit/ui";

const P = usePack(PACK),
  C = P.palette("doodle"),
  FACE = P.face;
const FPS = 30,
  BPM = 120,
  N = 1080; // a beat is 15 frames
const T = { basics: 90, gens: 210, coats: 390, sizes: 570, colours: 720, honest: 840, end: 960 };

// ------------------------------------------------------------------------------------------------ pixel styles
type Style = "dither" | "halftone" | "riso" | "ink" | "poster" | "original";
type Img = CanvasImageSource & { width: number; height: number };
type Pose = "head" | "wave" | "peek";
const hex = (h: string): [number, number, number] => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];
const luma = (r: number, g: number, b: number) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
const hash = (x: number, y: number, s: number) => {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 2246822519)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const INK = hex(C.ink),
  CREAM = hex(C.ground),
  WHITE = hex(C.surface),
  BLUE = hex(C.accent2),
  APRI = hex(C.accent);

// where each pose's eyes sit in its native PNG (bounding boxes, px), for the blink variant
const EYES: Record<Pose, [number, number, number, number][]> = {
  head: [
    [354, 205, 482, 339],
    [112, 331, 209, 444],
  ],
  wave: [
    [262, 80, 322, 146],
    [148, 146, 193, 203],
  ],
  peek: [
    [325, 120, 423, 224],
    [148, 223, 234, 329],
  ],
};

/** module-level cache: every styled canvas, keyed by source, style and device size (never rebuilt per frame) */
const CACHE = new Map<string, Layer | Img>();

const poseImage = (env: Env, pose: Pose) => {
  const img = env.image?.(`turtle:${pose}`) as Img | undefined;
  if (!img) throw new Error(`turtle:${pose} not in the piece's assets`);
  return img;
};
/** the pose's native PNG, or a copy with its eyes closed: lids in the sampled skin tone and a lash line */
const nativeSource = (env: Env, pose: Pose, blink: boolean): Img => {
  const img = poseImage(env, pose);
  if (!blink) return img;
  const key = `native:${pose}:blink`,
    hit = CACHE.get(key);
  if (hit) return (hit as Layer).canvas;
  const L = env.canvas(img.width, img.height),
    c = L.ctx;
  c.drawImage(img, 0, 0);
  const d = c.getImageData(0, 0, img.width, img.height).data;
  for (const [x0, y0, x1, y1] of EYES[pose]) {
    const w = x1 - x0,
      h = y1 - y0,
      mx = (x0 + x1) / 2,
      my = (y0 + y1) / 2;
    // the skin around the eye: blue pixels in a ring just outside the box
    let sr = 0,
      sg = 0,
      sb = 0,
      n = 0;
    for (let y = Math.round(y0 - h * 0.35); y < y1 + h * 0.35; y++)
      for (let x = Math.round(x0 - w * 0.35); x < x1 + w * 0.35; x++) {
        if (x < 0 || y < 0 || x >= img.width || y >= img.height) continue;
        if (x > x0 - 3 && x < x1 + 3 && y > y0 - 3 && y < y1 + 3) continue;
        const i = (y * img.width + x) * 4;
        if (d[i + 3]! > 220 && d[i + 2]! > d[i]! + 40 && d[i + 1]! > 150) {
          sr += d[i]!;
          sg += d[i + 1]!;
          sb += d[i + 2]!;
          n++;
        }
      }
    // the lid: every eye-white, iris and pupil pixel in the box becomes skin (the glasses stay: they are
    // near-black but never inside the pupil's core)
    const [kr, kg, kb] = n ? [sr / n, sg / n, sb / n] : [143, 208, 244],
      pad = 8,
      bx0 = Math.max(0, x0 - pad),
      by0 = Math.max(0, y0 - pad),
      bw = Math.min(img.width, x1 + pad) - bx0,
      bh = Math.min(img.height, y1 + pad) - by0,
      box = c.getImageData(bx0, by0, bw, bh),
      q = box.data;
    for (let y = 0; y < bh; y++)
      for (let x = 0; x < bw; x++) {
        const i = (y * bw + x) * 4,
          r = q[i]!,
          g = q[i + 1]!,
          b = q[i + 2]!,
          e = ((bx0 + x - mx) / (w / 2)) ** 2 + ((by0 + y - my) / (h / 2)) ** 2;
        const white = Math.min(r, g, b) > 175 && b - r < 22 && e < 1.6,
          iris = r > b + 6 && r < 190 && e < 1.1,
          pupil = r + g + b < 200 && e < 0.45;
        if (q[i + 3]! > 100 && (white || iris || pupil)) {
          q[i] = kr;
          q[i + 1] = kg;
          q[i + 2] = kb;
        }
      }
    c.putImageData(box, bx0, by0);
    c.strokeStyle = C.ink;
    c.lineCap = "round";
    c.lineWidth = Math.max(3, w * 0.1);
    c.beginPath();
    c.moveTo(x0 + w * 0.08, my + h * 0.02);
    c.quadraticCurveTo(mx, my + h * 0.42, x1 - w * 0.08, my + h * 0.02);
    c.stroke();
  }
  CACHE.set(key, L);
  return L.canvas;
};

/** the source drawn at a device size (w × h px), read back once */
const sourceAt = (env: Env, src: Img, w: number, h: number) => {
  const L = env.canvas(w, h);
  L.ctx.imageSmoothingEnabled = true;
  L.ctx.imageSmoothingQuality = "high";
  L.ctx.drawImage(src, 0, 0, w, h);
  return { L, d: L.ctx.getImageData(0, 0, w, h).data };
};

// (1) pixel dither: an ordered Bayer dither to four inks in chunky cells
const passDither = (env: Env, src: Img, w: number, h: number, cell: number): Layer => {
  const sw = Math.ceil(w / cell),
    sh = Math.ceil(h / cell),
    { L: small, d } = sourceAt(env, src, sw, sh);
  const out = small.ctx.createImageData(sw, sh),
    o = out.data,
    pal = [INK, BLUE, APRI, WHITE];
  for (let y = 0; y < sh; y++)
    for (let x = 0; x < sw; x++) {
      const i = (y * sw + x) * 4;
      if (d[i + 3]! < 110) continue;
      const t = (BAYER[(y % 4) * 4 + (x % 4)]! - 0.5) * 96,
        r = d[i]! + t,
        g = d[i + 1]! + t,
        b = d[i + 2]! + t,
        mx = Math.max(d[i]!, d[i + 1]!, d[i + 2]!),
        sat = mx ? (mx - Math.min(d[i]!, d[i + 1]!, d[i + 2]!)) / mx : 0;
      let best = pal[0]!,
        bd = Infinity;
      for (const p of sat < 0.16 ? [INK, WHITE] : pal) {
        const dd = 0.3 * (r - p[0]) ** 2 + 0.59 * (g - p[1]) ** 2 + 0.11 * (b - p[2]) ** 2;
        if (dd < bd) {
          bd = dd;
          best = p;
        }
      }
      o[i] = best[0];
      o[i + 1] = best[1];
      o[i + 2] = best[2];
      o[i + 3] = 255;
    }
  small.ctx.clearRect(0, 0, sw, sh);
  small.ctx.putImageData(out, 0, 0);
  const L = env.canvas(w, h);
  L.ctx.imageSmoothingEnabled = false;
  L.ctx.drawImage(small.canvas, 0, 0, sw * cell, sh * cell);
  return L;
};

// (2) halftone: two screens on rotated grids, a blue one for the turtle's colour and an ink one for its darks
const passHalftone = (env: Env, src: Img, w: number, h: number, s: number): Layer => {
  const { d } = sourceAt(env, src, w, h),
    L = env.canvas(w, h),
    c = L.ctx;
  const screen = (angle: number, color: string, cov: (r: number, g: number, b: number) => number, max = 0.74) => {
    const ca = Math.cos(angle),
      sa = Math.sin(angle),
      R = Math.hypot(w, h) / 2 / s + 2;
    c.beginPath();
    for (let j = -R; j <= R; j++)
      for (let i = -R; i <= R; i++) {
        const x = w / 2 + (i * ca - j * sa) * s,
          y = h / 2 + (i * sa + j * ca) * s,
          px = Math.round(x),
          py = Math.round(y);
        if (px < 0 || py < 0 || px >= w || py >= h) continue;
        const k = (py * w + px) * 4;
        if (d[k + 3]! < 110) continue;
        const r = s * max * Math.sqrt(clamp(cov(d[k]!, d[k + 1]!, d[k + 2]!)));
        if (r < 0.35) continue;
        c.moveTo(x + r, y);
        c.arc(x, y, r, 0, Math.PI * 2);
      }
    c.fillStyle = color;
    c.fill();
  };
  screen(0.26, C.accent2, (r, g, b) => (b - r) / 120 + 0.12);
  screen(0.26, C.accent, (r, _g, b) => (r - b - 25) / 110);
  screen(0.785, C.ink, (r, g, b) => ((0.7 - luma(r, g, b)) / 0.6) ** 1.4, 0.6);
  return L;
};

// (3) riso two-tone: accent2 and accent as two misregistered layers with a speckle, overprinted (multiply)
const passRiso = (env: Env, src: Img, w: number, h: number): Layer => {
  const { L, d } = sourceAt(env, src, w, h),
    out = L.ctx.createImageData(w, h),
    o = out.data,
    off = Math.max(2, Math.round(w * 0.022));
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? -1 : (y * w + x) * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      // layer A (blue): the body, lighter where the art is light, with pinholes
      let a = false,
        b = false;
      if (d[i + 3]! > 120) {
        const l = luma(d[i]!, d[i + 1]!, d[i + 2]!),
          cov = l > 0.9 ? 0.08 : l < 0.42 ? 1 : 0.62;
        a = hash(x >> 1, y >> 1, 3) < cov && hash(x, y, 9) > 0.04;
      }
      // layer B (apricot): the darks and warm tones, printed off-register
      const j = at(x - off, y - Math.round(off * 0.6));
      if (j >= 0 && d[j + 3]! > 120) {
        const l = luma(d[j]!, d[j + 1]!, d[j + 2]!),
          warm = d[j]! - d[j + 2]!,
          cov = l < 0.42 ? 1 : warm > 30 ? 0.8 : l > 0.9 ? 0 : 0.18;
        b = hash(x >> 1, y >> 1, 5) < cov && hash(x, y, 11) > 0.05;
      }
      if (!a && !b) continue;
      o[i] = ((a ? BLUE[0] : 255) * (b ? APRI[0] : 255)) / 255;
      o[i + 1] = ((a ? BLUE[1] : 255) * (b ? APRI[1] : 255)) / 255;
      o[i + 2] = ((a ? BLUE[2] : 255) * (b ? APRI[2] : 255)) / 255;
      o[i + 3] = 255;
    }
  L.ctx.clearRect(0, 0, w, h);
  L.ctx.putImageData(out, 0, 0);
  return L;
};

// (4) ink line: edges found from luminance and alpha, drawn as ink strokes on cream
const passInk = (env: Env, src: Img, w: number, h: number): Layer => {
  const { L, d } = sourceAt(env, src, w, h),
    lum = new Float32Array(w * h),
    al = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const a = d[i * 4 + 3]! / 255;
    al[i] = a;
    lum[i] = a * luma(d[i * 4]!, d[i * 4 + 1]!, d[i * 4 + 2]!) + (1 - a);
  }
  const sob = (m: Float32Array, x: number, y: number) => {
    const g = (xx: number, yy: number) => m[clamp(yy, 0, h - 1) * w + clamp(xx, 0, w - 1)]!;
    const gx =
        g(x + 1, y - 1) + 2 * g(x + 1, y) + g(x + 1, y + 1) - g(x - 1, y - 1) - 2 * g(x - 1, y) - g(x - 1, y + 1),
      gy = g(x - 1, y + 1) + 2 * g(x, y + 1) + g(x + 1, y + 1) - g(x - 1, y - 1) - 2 * g(x, y - 1) - g(x + 1, y - 1);
    return Math.hypot(gx, gy);
  };
  const out = L.ctx.createImageData(w, h),
    o = out.data;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x,
        dark = al[i]! > 0.5 ? clamp((0.4 - lum[i]!) / 0.14) : 0,
        v = clamp(Math.max(dark, (sob(lum, x, y) - 0.5) * 1.1, (sob(al, x, y) - 0.6) * 1.2));
      const a = Math.max(al[i]! > 0.5 ? 1 : 0, v);
      if (a <= 0) continue;
      o[i * 4] = lerp(CREAM[0], INK[0], v);
      o[i * 4 + 1] = lerp(CREAM[1], INK[1], v);
      o[i * 4 + 2] = lerp(CREAM[2], INK[2], v);
      o[i * 4 + 3] = 255 * a;
    }
  L.ctx.clearRect(0, 0, w, h);
  L.ctx.putImageData(out, 0, 0);
  return L;
};

// (5) flat poster: three flat tones (ink, accent2, white) and an ink outline around the silhouette
const passPoster = (env: Env, src: Img, w: number, h: number): Layer => {
  // smooth first (half size and back) so the tones come out as flat shapes, not speckle
  const half = env.canvas(Math.ceil(w / 2), Math.ceil(h / 2));
  half.ctx.imageSmoothingQuality = "high";
  half.ctx.drawImage(src, 0, 0, half.canvas.width, half.canvas.height);
  const { L, d } = sourceAt(env, half.canvas, w, h),
    r = Math.max(2, Math.round(w * 0.022)),
    inside = new Uint8Array(w * h),
    rowMax = new Uint8Array(w * h),
    ring = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) inside[i] = d[i * 4 + 3]! > 128 ? 1 : 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let m = 0;
      for (let k = -r; k <= r && !m; k++) m = inside[y * w + clamp(x + k, 0, w - 1)]!;
      rowMax[y * w + x] = m;
    }
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let m = 0;
      for (let k = -r; k <= r && !m; k++) m = rowMax[clamp(y + k, 0, h - 1) * w + x]!;
      ring[y * w + x] = m;
    }
  const out = L.ctx.createImageData(w, h),
    o = out.data;
  for (let i = 0; i < w * h; i++) {
    if (!ring[i]) continue;
    let c = INK;
    if (inside[i]) {
      const l = luma(d[i * 4]!, d[i * 4 + 1]!, d[i * 4 + 2]!);
      c = l < 0.4 ? INK : l > 0.86 ? WHITE : BLUE;
    }
    o[i * 4] = c[0];
    o[i * 4 + 1] = c[1];
    o[i * 4 + 2] = c[2];
    o[i * 4 + 3] = 255;
  }
  L.ctx.clearRect(0, 0, w, h);
  L.ctx.putImageData(out, 0, 0);
  return L;
};

// (6) original: the source at size
const passOriginal = (env: Env, src: Img, w: number, h: number): Layer => sourceAt(env, src, w, h).L;

/** a styled canvas of any source at a device size, computed once and cached */
const styled = (env: Env, id: string, src: () => Img, style: Style, w: number, h: number, cell: number) => {
  const key = `${id}:${style}:${w}x${h}:${cell}`,
    hit = CACHE.get(key) as Layer | undefined;
  if (hit) return hit.canvas;
  const s = src(),
    L =
      style === "dither"
        ? passDither(env, s, w, h, cell)
        : style === "halftone"
          ? passHalftone(env, s, w, h, cell)
          : style === "riso"
            ? passRiso(env, s, w, h)
            : style === "ink"
              ? passInk(env, s, w, h)
              : style === "poster"
                ? passPoster(env, s, w, h)
                : passOriginal(env, s, w, h);
  CACHE.set(key, L);
  return L.canvas;
};

// the confetti tokens (a paw print and a bone), drawn once as vectors, then styled like the badge
const TOKEN_PX = 120;
const tokenSource = (env: Env, kind: "paw" | "bone", outline = C.ink): Img => {
  const key = `token-src:${kind}:${outline}`,
    hit = CACHE.get(key) as Layer | undefined;
  if (hit) return hit.canvas;
  const L = env.canvas(TOKEN_PX, TOKEN_PX),
    c = L.ctx,
    k = TOKEN_PX / 100;
  c.scale(k, k);
  c.lineWidth = 6;
  c.strokeStyle = outline;
  c.lineJoin = "round";
  if (kind === "paw") {
    c.fillStyle = C.accent;
    const blobs: [number, number, number, number][] = [
      [50, 64, 22, 18],
      [24, 38, 9, 11],
      [41, 25, 9, 11],
      [59, 25, 9, 11],
      [76, 38, 9, 11],
    ];
    for (const [x, y, rx, ry] of blobs) {
      c.beginPath();
      c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      c.fill();
      c.stroke();
    }
  } else {
    c.fillStyle = C.surface;
    c.beginPath();
    for (const [x, y] of [
      [20, 36],
      [20, 64],
      [80, 36],
      [80, 64],
    ] as const)
      c.arc(x, y, 13, 0, Math.PI * 2);
    c.stroke();
    c.beginPath();
    c.rect(20, 40, 60, 20);
    c.stroke();
    c.beginPath();
    for (const [x, y] of [
      [20, 36],
      [20, 64],
      [80, 36],
      [80, 64],
    ] as const) {
      c.moveTo(x + 13, y);
      c.arc(x, y, 13, 0, Math.PI * 2);
    }
    c.rect(20, 40, 60, 20);
    c.fill();
  }
  CACHE.set(key, L);
  return L.canvas;
};

// ------------------------------------------------------------------------------------------------ the dogs
type Coat = "straight" | "wavy" | "curly";
type Tone = { coat: string; shade: string; light: string; patch?: string };
/** the named doodle colours (plus the golden retriever's golden) */
const DOG: Record<string, Tone> = {
  golden: { coat: "#e8b35e", shade: "#bd8634", light: "#f6dcaa" },
  cream: { coat: "#f5e6c8", shade: "#d3b886", light: "#fdf6e8" },
  apricot: { coat: "#f2b27a", shade: "#c97f42", light: "#fadcbd" },
  red: { coat: "#c96a3d", shade: "#8f4424", light: "#e9ae8a" },
  chocolate: { coat: "#7c4e34", shade: "#4e2f1e", light: "#a97a5d" },
  parti: { coat: "#fcfaf5", shade: "#d6ccbf", light: "#ffffff", patch: "#7c4e34" },
};
const COLOUR_NAMES = ["Cream", "Apricot", "Red", "Chocolate", "Parti"] as const;

type Stroke = { kind: Coat; x: number; y: number; a: number; l: number; part: "body" | "head" | "ear" };
const STROKES = new Map<Coat, Stroke[]>();
/** the coat texture as a seeded list of strokes in dog units (a dog is about 92 units tall), made once */
const coatStrokes = (coat: Coat): Stroke[] => {
  const hit = STROKES.get(coat);
  if (hit) return hit;
  const r = rng(coat === "straight" ? 11 : coat === "wavy" ? 23 : 37),
    out: Stroke[] = [],
    gap = coat === "curly" ? 6.2 : 7.2;
  const fill = (
    part: Stroke["part"],
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    keep: (x: number, y: number) => boolean,
  ) => {
    for (let y = cy - ry; y <= cy + ry; y += gap * 0.9)
      for (let x = cx - rx; x <= cx + rx; x += gap) {
        const jx = x + (r() - 0.5) * gap * 0.6 + ((Math.round(y / gap) % 2) * gap) / 2,
          jy = y + (r() - 0.5) * gap * 0.5;
        if (((jx - cx) / rx) ** 2 + ((jy - cy) / ry) ** 2 > 0.8 || !keep(jx, jy)) continue;
        out.push({ kind: coat, x: jx, y: jy, a: r() * Math.PI * 2, l: 0.8 + r() * 0.4, part });
      }
  };
  fill("head", 0, -64, 25, 22, (x, y) => y < -74 || Math.abs(x) > 19);
  fill("body", 0, -24, 25, 24, (x, y) => !(Math.abs(x) < 13 && y > -30) || coat !== "straight");
  fill("ear", 0, -58, 8, 16, () => true);
  out.sort((a, b) => a.y - b.y);
  STROKES.set(coat, out);
  return out;
};

type DogOpts = {
  coat: Coat;
  tone: string;
  /** 0..1: how much of the coat texture has drawn on (1 = all) */
  reveal?: number;
  /** 0..1: how strongly the silhouette carries the coat (1 = full) */
  curl?: number;
  f?: number;
  seed?: number;
  sneeze?: number;
  /** the outline colour (cream on the ink ground) */
  line?: string;
};
/** a cloud outline around an ellipse: n scallops pushed out by amp (amp 0 = a smooth ellipse) */
const cloud = (c: Ctx, cx: number, cy: number, rx: number, ry: number, n: number, amp: number, rot = 0) => {
  if (amp < 0.05) {
    c.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2);
    return;
  }
  const pt = (t: number, k: number): [number, number] => {
    const x = Math.cos(t) * (rx + k),
      y = Math.sin(t) * (ry + k);
    return [cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)];
  };
  const [x0, y0] = pt(0, 0);
  c.moveTo(x0, y0);
  for (let i = 0; i < n; i++) {
    const t0 = (i / n) * Math.PI * 2,
      t1 = ((i + 1) / n) * Math.PI * 2,
      [qx, qy] = pt((t0 + t1) / 2, amp * 2),
      [x1, y1] = pt(t1, 0);
    c.quadraticCurveTo(qx, qy, x1, y1);
  }
  c.closePath();
};

/** a cute sitting doodle, front on, feet at (x, y), h px tall; the coat is the lesson */
const dog = (c: Ctx, x: number, y: number, h: number, o: DogOpts) => {
  const tone = DOG[o.tone]!,
    k = h / 92,
    f = o.f ?? 0,
    seed = o.seed ?? 0,
    curl = o.curl ?? 1,
    reveal = o.reveal ?? 1,
    coat = o.coat,
    ow = Math.max(2.4, 3 * (h / 300)) / k, // the outline, in dog units
    line = o.line ?? C.ink;
  const amp = (coat === "curly" ? 2.6 : coat === "wavy" ? 1.5 : 0) * curl,
    nB = coat === "curly" ? 20 : 12,
    nH = coat === "curly" ? 18 : 12;
  const sneeze = o.sneeze ?? 0,
    tilt = 0.06 * Math.sin((f + seed * 13) / 22) - 0.18 * Math.sin(Math.PI * clamp(sneeze * 1.4)),
    breathe = 1 + 0.015 * Math.sin((f + seed * 7) / 9),
    wag = Math.sin((f + seed * 5) / 3.2) * 0.35;
  c.save();
  c.translate(x, y);
  c.scale(k, k * breathe);
  c.lineJoin = "round";
  c.lineCap = "round";
  const both = (path: () => void, fill: string) => {
    c.beginPath();
    path();
    c.lineWidth = ow * 2;
    c.strokeStyle = line;
    c.stroke();
    c.fillStyle = fill;
    c.fill();
  };
  const texture = (part: Stroke["part"], clip: () => void, strokeColor: string, mirror = false) => {
    const all = coatStrokes(coat).filter((s) => s.part === part),
      n = Math.floor(all.length * reveal);
    if (!n) return;
    c.save();
    c.beginPath();
    clip();
    c.clip();
    c.strokeStyle = strokeColor;
    c.lineWidth = coat === "curly" ? 1.25 : 1.35;
    c.beginPath();
    for (let i = 0; i < n; i++) {
      const s = all[i]!,
        sx = mirror ? -s.x : s.x;
      if (coat === "straight") {
        const L = (part === "head" ? 6 : part === "ear" ? 13 : 11) * s.l,
          lean = part === "ear" ? 0.8 : (sx / 25) * 2.2;
        c.moveTo(sx, s.y);
        c.quadraticCurveTo(sx + lean * 0.3, s.y + L * 0.5, sx + lean, s.y + L);
      } else if (coat === "wavy") {
        const L = 9 * s.l;
        c.moveTo(sx, s.y);
        c.bezierCurveTo(sx + 3.4, s.y + L / 3, sx - 3.4, s.y + (2 * L) / 3, sx, s.y + L);
      } else {
        const r = 2.2 * s.l;
        c.moveTo(sx + Math.cos(s.a) * r, s.y + Math.sin(s.a) * r);
        c.arc(sx, s.y, r, s.a, s.a + Math.PI * 1.75);
      }
    }
    c.stroke();
    c.restore();
  };
  // tail, behind everything, wagging
  c.save();
  c.translate(19, -12);
  c.rotate(-0.5 + wag);
  const tail = () => {
    if (coat === "curly") {
      c.rect(-2.5, -18, 5, 18);
      c.moveTo(7, -22);
      cloud(c, 0, -22, 7, 7, 9, 1.8 * curl);
    } else if (coat === "wavy") cloud(c, 4, -12, 5.5, 13, 8, 1.2 * curl, 0.35);
    else {
      c.ellipse(6, -12, 5, 15, 0.45, 0, Math.PI * 2);
    }
  };
  both(tail, tone.coat);
  c.restore();
  // body, haunches and front legs: one outline around the union, then the fills
  const bodyParts = () => {
    cloud(c, 0, -24, 25, 24, nB, amp);
    c.moveTo(34, -9);
    cloud(c, 20, -9, 13, 9, 7, amp * 0.8);
    c.moveTo(-6, -9);
    cloud(c, -20, -9, 13, 9, 7, amp * 0.8);
  };
  c.beginPath();
  bodyParts();
  c.lineWidth = ow * 2;
  c.strokeStyle = line;
  c.stroke();
  c.fillStyle = tone.coat;
  c.beginPath();
  cloud(c, 0, -24, 25, 24, nB, amp);
  c.fill();
  c.beginPath();
  cloud(c, 20, -9, 13, 9, 7, amp * 0.8);
  c.fill();
  c.beginPath();
  cloud(c, -20, -9, 13, 9, 7, amp * 0.8);
  c.fill();
  if (tone.patch) {
    c.save();
    c.beginPath();
    cloud(c, 0, -24, 25, 24, nB, amp);
    c.clip();
    c.fillStyle = tone.patch;
    c.beginPath();
    c.ellipse(15, -30, 12, 10, 0.4, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }
  texture("body", () => cloud(c, 0, -24, 25, 24, nB, amp), tone.shade);
  // front legs, outlined over the body, with light paws
  for (const lx of [-15, 3]) {
    rr(c, lx, -30, 12, 30, 6);
    c.fillStyle = tone.coat;
    c.fill();
    c.lineWidth = ow;
    c.strokeStyle = line;
    c.stroke();
  }
  c.fillStyle = tone.light;
  for (const px of [-9, 9]) {
    c.beginPath();
    c.ellipse(px, -4, 4.6, 2.8, 0, 0, Math.PI * 2);
    c.fill();
  }
  // the head, with a tilt from the neck
  c.save();
  c.translate(0, -44);
  c.rotate(tilt);
  c.translate(0, 44 + sneeze * 2);
  const headPath = () => {
    cloud(c, 0, -64, 25, 22, nH, amp);
    if (coat === "curly" && curl > 0.3) {
      c.moveTo(14, -86);
      cloud(c, 0, -86, 14, 8, 9, 2.4 * curl);
    }
  };
  both(headPath, tone.coat);
  if (tone.patch) {
    c.save();
    c.beginPath();
    cloud(c, 0, -64, 25, 22, nH, amp);
    c.clip();
    c.fillStyle = tone.patch;
    c.beginPath();
    c.ellipse(-11, -70, 10, 9, 0, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }
  texture("head", headPath, tone.shade);
  // face: muzzle, nose, mouth, tongue, blush, eyes
  c.fillStyle = tone.light;
  c.beginPath();
  c.ellipse(0, -55.5, 11.5, 8.5, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "#f29d95";
  for (const bx of [-16, 16]) {
    c.beginPath();
    c.ellipse(bx, -57, 3.6, 2.2, 0, 0, Math.PI * 2);
    c.fill();
  }
  c.fillStyle = "#ef7f86";
  c.beginPath();
  c.ellipse(0, -50.5, 2.8, 3.4, 0, 0, Math.PI);
  c.fill();
  c.strokeStyle = C.ink;
  c.lineWidth = 1.3;
  c.beginPath();
  c.moveTo(0, -57);
  c.lineTo(0, -54);
  c.moveTo(-4.2, -52.5);
  c.quadraticCurveTo(-2, -50.8, 0, -54);
  c.quadraticCurveTo(2, -50.8, 4.2, -52.5);
  c.stroke();
  c.fillStyle = C.ink;
  c.beginPath();
  c.moveTo(-4.2, -61);
  c.quadraticCurveTo(0, -63, 4.2, -61);
  c.quadraticCurveTo(3.6, -57, 0, -56.6);
  c.quadraticCurveTo(-3.6, -57, -4.2, -61);
  c.fill();
  c.fillStyle = "rgba(255,255,255,0.8)";
  c.beginPath();
  c.ellipse(-1.3, -61, 1.3, 0.7, 0, 0, Math.PI * 2);
  c.fill();
  const blinkT = (f + seed * 23) % 75,
    shut = sneeze > 0.15 && sneeze < 0.75 ? 1 : blinkT < 3 ? 1 : 0;
  for (const ex of [-9.5, 9.5]) {
    if (shut) {
      c.strokeStyle = C.ink;
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(ex - 3.4, -67);
      c.quadraticCurveTo(ex, -64.8, ex + 3.4, -67);
      c.stroke();
    } else {
      c.fillStyle = C.ink;
      c.beginPath();
      c.ellipse(ex, -67, 3.5, 3.9, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#ffffff";
      c.beginPath();
      c.arc(ex + 1.2, -68.4, 1.25, 0, Math.PI * 2);
      c.fill();
    }
  }
  // floppy ears over the head's sides
  for (const side of [-1, 1]) {
    c.save();
    c.scale(side, 1);
    const len = coat === "straight" ? 18 : 15.5,
      earPath = () =>
        coat === "curly"
          ? cloud(c, 26, -59, 8, len, 9, 2.4 * curl, -0.22)
          : coat === "wavy"
            ? cloud(c, 26, -59, 8, len, 8, 1.4 * curl, -0.22)
            : c.ellipse(26, -58, 7.5, len, -0.22, 0, Math.PI * 2);
    both(earPath, tone.patch ?? tone.shade);
    texture("ear", earPath, tone.patch ? "#5a3522" : tone.coat, false);
    c.restore();
  }
  c.restore();
  // the sneeze: a tiny puff from the nose
  if (sneeze > 0.35 && sneeze < 1) {
    const t = prog(sneeze, 0.35, 1);
    c.save();
    c.globalAlpha *= 1 - t;
    c.fillStyle = C.surface;
    c.strokeStyle = line === C.ink ? C.ink : C.muted;
    c.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      // out past the cheek, spreading and fading
      const a = -0.15 + i * 0.22,
        d = 32 + t * 14 + i * 3,
        r = 3.8 + t * 3.6 - i * 0.35;
      c.beginPath();
      c.arc(Math.cos(a) * d, -58 + Math.sin(a) * d * 0.7, r, 0, Math.PI * 2);
      c.fill();
      c.stroke();
    }
    c.restore();
  }
  c.restore();
};

// ------------------------------------------------------------------------------------------------ the film
type Section = { at: number; ground: string; label: string; badge: Style; ink: string };
const SECTIONS: Section[] = [
  { at: 0, ground: C.ground, label: "", badge: "dither", ink: C.ink },
  { at: T.basics, ground: C.s1!, label: "// 01 · the basics", badge: "halftone", ink: C.ink },
  { at: T.gens, ground: C.s2!, label: "// 02 · generations", badge: "dither", ink: C.ink },
  { at: T.coats, ground: C.s3!, label: "// 03 · coats", badge: "riso", ink: C.ink },
  { at: T.sizes, ground: C.s4!, label: "// 04 · sizes", badge: "ink", ink: C.ink },
  { at: T.colours, ground: C.s5!, label: "// 05 · colours", badge: "poster", ink: C.ink },
  { at: T.honest, ground: C.s6!, label: "// 06 · the honest bit", badge: "original", ink: C.ground },
  { at: T.end, ground: C.ground, label: "", badge: "original", ink: C.ink },
];
const sectionAt = (F: number) => [...SECTIONS].reverse().find((s) => F >= s.at)!;

export function make(size: Size, id: string): Film {
  const L = layout(size),
    { W, H, u, tall } = L,
    S = L.safe,
    hx = S.x + 24 * u;

  const pop = (F: number, at: number, freq = 2.4, damp = 0.55) => spring((F - at) / FPS, { freq, damp });
  const sans = (sz: number, weight = 600) => ({ size: sz * u, family: FACE.sans, weight, track: -0.03 });
  /** a sticker card: white, 3 px ink outline, a hard offset ink shadow */
  const sticker = (c: Ctx, x: number, y: number, w: number, h: number, r = 22 * u, sh = 8 * u, fill = C.surface) => {
    c.fillStyle = C.ink;
    rr(c, x + sh, y + sh, w, h, r);
    c.fill();
    c.fillStyle = fill;
    rr(c, x, y, w, h, r);
    c.fill();
    c.strokeStyle = C.ink;
    c.lineWidth = 3 * u;
    rr(c, x, y, w, h, r);
    c.stroke();
  };
  /** scale about a point by s (for springs and push-ins) */
  const about = (c: Ctx, x: number, y: number, s: number, fn: () => void, rot = 0) => {
    if (s <= 0.001) return;
    c.save();
    c.translate(x, y);
    c.rotate(rot);
    c.scale(s, s);
    c.translate(-x, -y);
    fn();
    c.restore();
  };

  // ---- headlines: tight Inter 600, left-aligned; the [key] word lands on a highlighter box that wipes in first
  type Head = {
    lines: string[];
    at: number[];
    x: number;
    y: number;
    size: number;
    maxW: number;
    color: string;
    center?: boolean;
    lead?: number;
  };
  const fitSize = (c: Ctx, h: Head) => {
    const widest = Math.max(...h.lines.map((l) => measure(c, l.replace(/[[\]]/g, ""), sans(h.size))));
    return Math.min(h.size * u, (h.size * u * h.maxW) / widest) / u;
  };
  const headline = (c: Ctx, F: number, h: Head) => {
    const sz = fitSize(c, h);
    if (CLOSE.some(([a, b]) => F >= a && F < b)) return sz; // a close-up insert frames the card alone
    const o = sans(sz),
      space = measure(c, "a a", o) - measure(c, "aa", o),
      lead = sz * u * (h.lead ?? 1.06);
    h.lines.forEach((line, li) => {
      const base = h.y + li * lead,
        start = h.at[li]!,
        m = /^(.*?)\[(.+?)\](.*)$/.exec(line),
        pre = m ? m[1]! : line,
        key = m ? m[2]! : "",
        post = m ? m[3]! : "";
      const plain = line.replace(/[[\]]/g, "");
      let x = h.center ? h.x - measure(c, plain, o) / 2 : h.x;
      const words: { s: string; key: boolean; x: number }[] = [];
      for (const w of pre.split(" ").filter(Boolean)) {
        words.push({ s: w, key: false, x });
        x += measure(c, w, o) + space;
      }
      if (key) {
        words.push({ s: key, key: true, x });
        x += measure(c, key, o);
        if (post) words.push({ s: post, key: false, x });
      }
      c.save();
      c.beginPath();
      c.rect(0, base - sz * u * 1.02, W, sz * u * 1.3);
      c.clip();
      words.forEach((wd, wi) => {
        const t = start + wi * 3 + (wd.key ? 4 : 0),
          w = measure(c, wd.s, o);
        if (wd.key) {
          const wipe = ease.outCubic(prog(F, t - 5, t + 1)),
            pad = sz * u * 0.1;
          if (wipe > 0) {
            c.fillStyle = C.accent;
            c.fillRect(wd.x - pad, base - sz * u * 0.8, (w + pad * 2) * wipe, sz * u * 1.02);
          }
        }
        const p = spring((F - t + (wd.key ? 5 : 0)) / FPS, { freq: 2.6, damp: 0.72 });
        if (p <= 0) return;
        text(c, wd.s, wd.x, base + (1 - p) * sz * u * 1.1, { ...o, color: wd.key ? C.ink : h.color });
      });
      c.restore();
    });
    return sz;
  };
  const mono = (c: Ctx, s: string, x: number, y: number, color: string, align: CanvasTextAlign = "left", sz = 24) =>
    text(c, s, x, y, { size: sz * u, family: FACE.mono, weight: 500, color, align, track: 0.02 });

  // ---- the turtle (a styled PNG, never redrawn by hand): bob, tilt and squash for life, blink by swapping
  const TURTLE_ASPECT: Record<Pose, number> = { head: 1, wave: 535 / 900, peek: 760 / 713 };
  const blinkAt = (F: number, every: number, off: number) => (F + off) % every < 4;
  const turtle = (
    c: Ctx,
    env: Env,
    pose: Pose,
    style: Style,
    x: number,
    foot: number,
    h: number,
    o: { tilt?: number; squash?: number; blink?: boolean; cell?: number } = {},
  ) => {
    const ph = Math.round(h * env.scale),
      pw = Math.round(h * TURTLE_ASPECT[pose] * env.scale),
      blink = !!o.blink;
    const img = styled(
      env,
      `${pose}${blink ? "-blink" : ""}`,
      () => nativeSource(env, pose, blink),
      style,
      pw,
      ph,
      Math.round((o.cell ?? 6) * u * env.scale),
    );
    const sq = o.squash ?? 1,
      w = h * TURTLE_ASPECT[pose];
    c.save();
    c.translate(x, foot);
    c.rotate(o.tilt ?? 0);
    c.scale(1 / Math.sqrt(sq), sq);
    c.imageSmoothingEnabled = style !== "dither";
    c.drawImage(img, -w / 2, -h, w, h);
    c.restore();
  };

  // ---- the corner badge: ink ring, cream fill, the turtle's head in the section's style
  const BADGE = 150 * u,
    bcx = S.x + BADGE / 2,
    bcy = H - S.bottom - BADGE / 2;
  const badge = (c: Ctx, env: Env, F: number, sec: Section) => {
    const s = 0.8 + 0.2 * pop(F, sec.at, 2.6, 0.45),
      spin = spring((F - sec.at + 1) / FPS, { freq: 2.4, damp: 0.5 }),
      r = BADGE / 2,
      dark = sec.at === T.honest;
    c.save();
    // the flip: the badge turns edge-on and comes round in the new style, on the cut frame
    c.translate(bcx, bcy);
    c.scale(Math.max(0.06, Math.abs(Math.cos((1 - spin) * Math.PI * 0.5))), 1);
    c.rotate((1 - spin) * 0.5);
    c.translate(-bcx, -bcy);
    about(c, bcx, bcy, s, () => {
      c.fillStyle = dark ? C.muted : C.ink;
      c.beginPath();
      c.arc(bcx + 6 * u, bcy + 6 * u, r, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = C.ground;
      c.beginPath();
      c.arc(bcx, bcy, r, 0, Math.PI * 2);
      c.fill();
      c.save();
      c.beginPath();
      c.arc(bcx, bcy, r - 2 * u, 0, Math.PI * 2);
      c.clip();
      const bob = Math.sin(F / 9) * 3 * u,
        hs = BADGE * 0.86;
      turtle(c, env, "head", sec.badge, bcx + 3 * u, bcy + hs * 0.5 + bob, hs, {
        tilt: Math.sin(F / 14) * 0.05,
        squash: 1 + 0.02 * Math.sin(F / 7),
        blink: blinkAt(F, 66, 20),
        cell: sec.badge === "halftone" ? 4 : 3,
      });
      c.restore();
      c.strokeStyle = dark ? C.ground : C.ink;
      c.lineWidth = 4 * u;
      c.beginPath();
      c.arc(bcx, bcy, r, 0, Math.PI * 2);
      c.stroke();
    });
    c.restore();
  };

  // ---- token confetti at the edges, in the badge's style; it settles on the end card
  const SLOTS: [number, number, "paw" | "bone"][] = tall
    ? [
        [0.52, 0.075, "paw"],
        [0.8, 0.095, "bone"],
        [0.955, 0.2, "paw"],
        [0.965, 0.42, "bone"],
        [0.962, 0.745, "paw"],
        [0.93, 0.9, "bone"],
        [0.62, 0.93, "paw"],
        [0.32, 0.955, "bone"],
      ]
    : [
        [0.4, 0.055, "paw"],
        [0.63, 0.045, "bone"],
        [0.86, 0.065, "paw"],
        [0.983, 0.3, "bone"],
        [0.984, 0.6, "paw"],
        [0.965, 0.93, "bone"],
        [0.82, 0.965, "paw"],
        [0.26, 0.965, "bone"],
      ];
  const confetti = (c: Ctx, env: Env, F: number, sec: Section) => {
    const px = Math.round(62 * u * env.scale),
      settle = ease.outCubic(prog(F, T.end, T.end + 70));
    SLOTS.forEach(([nx, ny, kind], i) => {
      const outline = sec.at === T.honest ? C.ground : C.ink;
      const img = styled(
        env,
        `token-${kind}:${outline}`,
        () => tokenSource(env, kind, outline),
        sec.badge,
        px,
        px,
        Math.round(4 * u * env.scale),
      );
      const ph = i * 1.7,
        amp = 1 - settle * 0.85,
        x = nx * W + Math.sin(F / 23 + ph) * 14 * u * amp,
        y = ny * H + Math.cos(F / 29 + ph * 1.3) * 12 * u * amp + (sec.at === T.end ? (1 - settle) * -40 * u : 0),
        spin = (i % 2 ? 1 : -1) * (F / 40 + ph) * (1 - settle * 0.9),
        flip = Math.cos(F / 17 + ph) * amp + (1 - amp);
      const s = 62 * u;
      c.save();
      c.translate(x, y);
      c.rotate(spin);
      c.scale(Math.max(0.12, Math.abs(flip)), 1);
      c.imageSmoothingEnabled = sec.badge !== "dither";
      c.drawImage(img, -s / 2, -s / 2, s, s);
      c.restore();
    });
  };

  // a dog that hops once over 12 frames from each start in `at` (life for the holds, on the beat)
  const hopK = (F: number, at: number[]) =>
    Math.max(0, ...at.map((t) => (F >= t && F < t + 12 ? Math.sin((Math.PI * (F - t)) / 12) : 0)));
  const hopDog = (c: Ctx, x: number, y: number, h: number, o: DogOpts, k: number) => {
    c.save();
    c.translate(x, y - k * h * 0.14);
    c.scale(1 - 0.04 * k, 1 + 0.05 * k);
    dog(c, 0, 0, h, o);
    c.restore();
  };
  /** landscape type runs larger: secondary lines are at least 30 px */
  const big = (land: number, vert: number) => (tall ? vert : land);

  // ============================================================================ 00 hook (cream)
  const hook = (c: Ctx, env: Env, F: number) => {
    const th = tall ? 1180 * u : 960 * u,
      tx = tall ? W * 0.52 : 1330 * u,
      rise = spring((F - 1) / FPS, { freq: 1.6, damp: 0.6 }),
      bob = Math.sin(F / 8) * 8 * u,
      wave = Math.sin(F / 4) * 0.045 * (1 - prog(F, 70, 90)) + 0.012 * Math.sin(F / 13);
    turtle(c, env, "wave", "dither", tx, H + (tall ? 70 : 40) * u + (1 - rise) * th * 0.7 + bob, th, {
      tilt: wave,
      squash: 1 + 0.02 * Math.sin(F / 6),
      blink: blinkAt(F, 60, 8),
      cell: 6,
    });
    // a small "psst…" bubble pops beside the turtle and goes
    const bIn = pop(F, 12, 2.8, 0.5),
      bOut = ease.inCubic(prog(F, 50, 60)),
      bs = bIn * (1 - bOut);
    if (bs > 0.01) {
      const bx = tall ? 820 * u : 1700 * u,
        by = tall ? 700 * u : 200 * u,
        bw = 180 * u,
        bh = 76 * u;
      about(c, bx, by + bh / 2, bs, () => {
        c.fillStyle = C.surface;
        c.strokeStyle = C.ink;
        c.lineWidth = 3 * u;
        c.beginPath();
        if (tall) {
          c.moveTo(bx - 20 * u, by + bh / 2 - 2 * u);
          c.lineTo(bx - 50 * u, by + bh / 2 + 40 * u);
          c.lineTo(bx + 10 * u, by + bh / 2 - 2 * u);
        } else {
          c.moveTo(bx - bw / 2 + 4 * u, by - 12 * u);
          c.lineTo(bx - bw / 2 - 40 * u, by + 26 * u);
          c.lineTo(bx - bw / 2 + 4 * u, by + 14 * u);
        }
        c.fill();
        c.stroke();
        rr(c, bx - bw / 2, by - bh / 2, bw, bh, bh / 2);
        c.fill();
        c.stroke();
        c.fillStyle = C.surface;
        c.fillRect(bx - bw / 2 + 1.5 * u, by - 10 * u, 10 * u, 20 * u);
        text(c, "psst…", bx, by + 12 * u, { ...sans(34), color: C.ink, align: "center" });
      });
    }
    headline(c, F, {
      lines: ["Thinking about", "a [goldendoodle]?"],
      at: [8, 22],
      x: hx,
      y: tall ? 400 * u : 470 * u,
      size: 108,
      maxW: tall ? 860 : 880,
      color: C.ink,
    });
  };

  // ============================================================================ 01 the basics
  // golden lands on the flip, poodle a beat later, the '+', then both slide together into one doodle (whoosh at +60)
  const B = {
    golden: T.basics,
    poodle: T.basics + 12,
    plus: T.basics + 22,
    merge0: T.basics + 36,
    merged: T.basics + 60,
  };
  const basics = (c: Ctx, F: number) => {
    const merge = ease.inOutCubic(prog(F, B.merge0, B.merged)),
      mcx = tall ? W / 2 : 1300 * u,
      mcy = tall ? 980 * u : 545 * u;
    const cw = tall ? 640 * u : 440 * u,
      ch = tall ? 320 * u : 560 * u,
      gap = tall ? 400 * u : 540 * u;
    const petCard = (
      x: number,
      y: number,
      s: number,
      coat: Coat,
      tone: string,
      label: string,
      seed: number,
      rot: number,
    ) =>
      about(
        c,
        x,
        y,
        s,
        () => {
          sticker(c, x - cw / 2, y - ch / 2, cw, ch);
          if (tall) {
            dog(c, x - cw / 2 + 160 * u, y + ch / 2 - 30 * u, 250 * u, { coat, tone, f: F, seed });
            const parts = label.split(" ");
            parts.forEach((p, i) =>
              text(c, p, x - cw / 2 + 320 * u, y + (i - (parts.length - 1) / 2) * 52 * u + 16 * u, {
                ...sans(46),
                color: C.ink,
              }),
            );
          } else {
            dog(c, x, y + ch / 2 - 104 * u, 360 * u, { coat, tone, f: F, seed });
            text(c, label, x, y + ch / 2 - 40 * u, {
              ...sans(label.length > 12 ? 40 : 46),
              color: C.ink,
              align: "center",
            });
          }
        },
        rot,
      );
    if (merge < 1) {
      const d = (gap / 2) * (1 - merge),
        s = 1 - 0.12 * merge;
      const g = tall ? [mcx, mcy - d] : [mcx - d, mcy],
        p = tall ? [mcx, mcy + d] : [mcx + d, mcy];
      petCard(g[0]!, g[1]!, pop(F, B.golden - 1) * s, "straight", "golden", "Golden Retriever", 1, -0.03 * (1 - merge));
      petCard(p[0]!, p[1]!, pop(F, B.poodle) * s, "curly", "cream", "Poodle", 2, 0.03 * (1 - merge));
      const ps = pop(F, B.plus, 3, 0.45) * (1 - prog(F, B.merge0, B.merge0 + 10));
      about(c, mcx, mcy, ps, () => {
        c.fillStyle = C.ink;
        c.beginPath();
        c.arc(mcx, mcy, 50 * u, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = C.accent;
        c.fillRect(mcx - 26 * u, mcy - 7 * u, 52 * u, 14 * u);
        c.fillRect(mcx - 7 * u, mcy - 26 * u, 14 * u, 52 * u);
      });
    }
    if (F >= B.merged) {
      const s = pop(F, B.merged - 1, 2.6, 0.45),
        dw = tall ? 520 * u : 500 * u,
        dh = tall ? 480 * u : 620 * u;
      // a burst of little rays as the two become one
      const burst = prog(F, B.merged, B.merged + 20);
      if (burst < 1) {
        c.strokeStyle = C.ink;
        c.lineWidth = 6 * u;
        c.lineCap = "round";
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2 + 0.3,
            r0 = (tall ? 300 : 330) * u + burst * 80 * u,
            r1 = r0 + 46 * u * (1 - burst);
          c.beginPath();
          c.moveTo(mcx + Math.cos(a) * r0, mcy + Math.sin(a) * r0 * 0.85);
          c.lineTo(mcx + Math.cos(a) * r1, mcy + Math.sin(a) * r1 * 0.85);
          c.stroke();
        }
      }
      // no caption: the headline's "= goldendoodle." lands with the merge; the doodle hops on the beats after
      about(c, mcx, mcy, s, () => {
        sticker(c, mcx - dw / 2, mcy - dh / 2, dw, dh);
        hopDog(
          c,
          mcx,
          mcy + dh / 2 - 40 * u,
          dh * 0.78,
          { coat: "wavy", tone: "apricot", f: F, seed: 3 },
          hopK(F, [B.merged + 30, B.merged + 45]),
        );
      });
    }
    headline(c, F, {
      lines: ["Golden + Poodle", "= [goldendoodle]."],
      at: [T.basics - 2, B.merged - 10],
      x: hx,
      y: tall ? 400 * u : 470 * u,
      size: 104,
      maxW: tall ? 860 : 680,
      color: C.ink,
    });
  };

  // ============================================================================ 02 generations
  const GENS: { t: string; a: string; b: string; share: number; coat: Coat | "vary"; tone: string }[] = [
    { t: "F1", a: "Golden × Poodle", b: "about half and half", share: 0.5, coat: "wavy", tone: "apricot" },
    { t: "F1B", a: "F1 × Poodle", b: "about three-quarters Poodle", share: 0.25, coat: "curly", tone: "cream" },
    { t: "F2", a: "F1 × F1", b: "coats vary most", share: 0.5, coat: "vary", tone: "red" },
    { t: "Multigen", a: "doodle × doodle,", b: "several generations", share: -1, coat: "wavy", tone: "chocolate" },
  ];
  const G = { first: T.gens + 15, every: 30, refill: T.gens + 150 };
  const gens = (c: Ctx, F: number) => {
    headline(c, F, {
      lines: tall ? ["The letters are the", "[family tree]."] : ["The letters", "are the", "[family tree]."],
      at: tall ? [T.gens - 2, T.gens + 12] : [T.gens - 2, T.gens + 6, T.gens + 14],
      x: hx,
      y: tall ? 380 * u : 330 * u,
      size: tall ? 92 : 100,
      maxW: tall ? 860 : 520,
      color: C.ink,
      lead: 1.08,
    });
    // a small legend for the bars
    const la = prog(F, T.gens + 20, T.gens + 30);
    if (la > 0) {
      c.save();
      c.globalAlpha = la;
      const msz = big(30, 24),
        mo = { size: msz * u, family: FACE.mono, weight: 500, track: 0.02 },
        sw = msz * u;
      const item = (x: number, y: number, label: string, color: string) => {
        c.fillStyle = color;
        c.fillRect(x, y - sw * 0.82, sw, sw);
        c.strokeStyle = C.ink;
        c.lineWidth = 2.5 * u;
        c.strokeRect(x, y - sw * 0.82, sw, sw);
        mono(c, label, x + sw + 12 * u, y, C.ink, "left", msz);
        return sw + 12 * u + measure(c, label, mo);
      };
      if (tall) {
        const ly = 515 * u,
          wP = measure(c, "poodle", mo) + sw + 12 * u,
          wG = measure(c, "golden", mo) + sw + 12 * u,
          x0 = W - S.x - wP - 36 * u - wG;
        item(x0, ly, "golden", DOG.golden!.coat);
        item(x0 + wG + 36 * u, ly, "poodle", C.accent2);
      } else {
        const ly = 700 * u,
          w = item(hx, ly, "golden", DOG.golden!.coat);
        item(hx + w + 40 * u, ly, "poodle", C.accent2);
      }
      c.restore();
    }
    GENS.forEach((g, i) => {
      const at = G.first + i * G.every,
        s = pop(F, at - 1, 2.4, 0.72);
      if (s <= 0.001) return;
      let x: number, y: number, w: number, h: number;
      if (tall) {
        w = 920 * u;
        h = 195 * u;
        x = S.x;
        y = 560 * u + i * 215 * u;
      } else {
        w = 565 * u;
        h = 380 * u;
        x = 680 * u + (i % 2) * 595 * u;
        y = 160 * u + Math.floor(i / 2) * 410 * u;
      }
      // the hold: every bar drains and refills once, in turn, and its dog hops as it does
      const rt = G.refill + i * 4,
        dip = Math.sin(Math.PI * prog(F, rt, rt + 16));
      about(c, x + w / 2, y + h / 2, s, () => {
        sticker(c, x, y, w, h);
        const coat: Coat =
          g.coat === "vary"
            ? (["straight", "wavy", "curly"] as const)[Math.floor(Math.max(0, F - at) / 15) % 3]!
            : g.coat;
        // F2's coat changes on every beat, each change landing with a squash-pop so it reads as "varies"
        const dh = tall ? 165 * u : 205 * u,
          fx = x + (tall ? 110 : 125) * u,
          fy = tall ? y + h - 16 * u : y + 228 * u,
          local = Math.max(0, F - at) % 15,
          bump = g.coat === "vary" && F - at >= 15 ? 1 - spring(local / FPS, { freq: 3, damp: 0.45 }) : 0;
        c.save();
        c.translate(fx, fy);
        c.scale(1 + 0.1 * bump, 1 - 0.12 * bump);
        hopDog(c, 0, 0, dh, { coat, tone: g.tone, f: F, seed: i + 4 }, hopK(F, [rt + 4]));
        c.restore();
        let bx: number, by: number, bw: number;
        const bh = (tall ? 26 : 36) * u;
        if (tall) {
          const tx = x + 225 * u;
          text(c, g.t, tx, y + 58 * u, { ...sans(44), color: C.ink });
          const tw = measure(c, g.t, sans(44));
          text(c, g.a, tx + tw + 22 * u, y + 56 * u, { ...sans(30), color: C.ink });
          text(c, g.b, tx, y + 104 * u, { ...sans(28, 400), color: C.muted });
          bx = tx;
          by = y + h - 58 * u;
          bw = 640 * u;
        } else {
          const tx = x + 250 * u;
          text(c, g.t, tx, y + 96 * u, { ...sans(66), color: C.ink });
          text(c, g.a, tx, y + 160 * u, { ...sans(g.a.length > 15 ? 36 : 40), color: C.ink });
          text(c, g.b, x + 34 * u, y + 286 * u, { ...sans(36, 400), color: C.ink });
          bx = x + 34 * u;
          by = y + h - 66 * u;
          bw = w - 68 * u;
        }
        // the bar: golden share vs poodle share, filling after the card lands
        const fill = ease.outCubic(prog(F, at + 8, at + 26)) * (1 - 0.9 * dip);
        c.save();
        rr(c, bx, by, bw, bh, bh / 2);
        c.fillStyle = C.line;
        c.fill();
        c.clip();
        if (g.share >= 0) {
          const wob = g.coat === "vary" ? 0.12 * Math.sin((F - at) / 9) : 0,
            sh = clamp(g.share + wob, 0.05, 0.95);
          c.fillStyle = DOG.golden!.coat;
          c.fillRect(bx, by, bw * sh * fill, bh);
          c.fillStyle = C.accent2;
          c.fillRect(bx + bw * sh * fill, by, bw * (1 - sh) * fill, bh);
        } else {
          // several generations: alternating segments
          for (let k = 0; k < 8; k++) {
            c.fillStyle = k % 2 ? C.accent2 : DOG.golden!.coat;
            c.fillRect(bx + (k * bw) / 8, by, (bw / 8) * clamp(fill * 8 - k), bh);
          }
        }
        c.restore();
        c.strokeStyle = C.ink;
        c.lineWidth = 2.5 * u;
        rr(c, bx, by, bw, bh, bh / 2);
        c.stroke();
      });
    });
  };

  // ============================================================================ 03 coats
  const COATS: [Coat, string][] = [
    ["straight", "Straight"],
    ["wavy", "Wavy"],
    ["curly", "Curly"],
  ];
  const K = { draw0: T.coats + 18, every: 28, len: 40, line: T.coats + 100, nudge: T.coats + 152 };
  const coats = (c: Ctx, F: number) => {
    const hsz = headline(c, F, {
      lines: ["More Poodle usually means", "[curlier]."],
      at: [T.coats - 2, T.coats + 14],
      x: hx,
      y: tall ? 380 * u : 190 * u,
      size: 88,
      maxW: tall ? 850 : 1400,
      color: C.ink,
    });
    // the small line
    const sa = spring((F - K.line) / FPS, { freq: 2.4, damp: 0.8 });
    if (sa > 0) {
      const o = sans(hsz),
        lx = tall ? hx : hx + measure(c, "curlier.", o) + 44 * u,
        ly = tall ? 380 * u + hsz * u * 1.06 * 2 : 190 * u + hsz * u * 1.06;
      text(c, "and, often, less shedding.", lx, ly + (1 - sa) * 20 * u, {
        ...sans(big(44, 40), 400),
        color: C.ink,
        alpha: clamp(sa),
      });
    }
    const cw = tall ? 290 * u : 510 * u,
      ch = tall ? 440 * u : 490 * u,
      gap = tall ? 25 * u : 45 * u,
      x0 = (W - (cw * 3 + gap * 2)) / 2,
      y0 = tall ? 700 * u : 338 * u;
    COATS.forEach(([coat, label], i) => {
      const at = T.coats + i * 5,
        s = pop(F, at - 1),
        x = x0 + i * (cw + gap),
        d0 = K.draw0 + i * K.every,
        draw = prog(F, d0, d0 + K.len);
      about(c, x + cw / 2, y0 + ch / 2, s, () => {
        sticker(c, x, y0, cw, ch);
        hopDog(
          c,
          x + cw / 2,
          y0 + ch - (tall ? 90 : 100) * u,
          tall ? 270 * u : 330 * u,
          {
            coat,
            tone: "apricot",
            f: F,
            seed: i * 3,
            reveal: draw,
            curl: coat === "straight" ? 0 : ease.outCubic(draw),
          },
          hopK(F, [d0 + K.len, K.nudge + 4 + i * 4]),
        );
        text(c, label, x + cw / 2, y0 + ch - (tall ? 30 : 34) * u, {
          ...sans(big(46, 36)),
          color: C.ink,
          align: "center",
        });
      });
    });
    // the slider: more Golden → more Poodle as the coats curl, then it nudges back and forth on the beat
    const sy = tall ? 1260 * u : 922 * u,
      sx0 = tall ? S.x + 60 * u : 600 * u,
      sx1 = tall ? W - S.x - 60 * u : 1320 * u,
      nudge =
        0.2 * Math.sin(Math.PI * prog(F, K.nudge, K.nudge + 14)) +
        0.12 * Math.sin(Math.PI * prog(F, K.nudge + 15, K.nudge + 27)),
      k = ease.inOutCubic(prog(F, K.draw0, K.draw0 + 2 * K.every + K.len)) - nudge,
      sl = spring((F - (T.coats + 8)) / FPS, { freq: 2.4, damp: 0.7 });
    c.save();
    c.globalAlpha = clamp(sl);
    c.translate(0, (1 - clamp(sl)) * 30 * u);
    const th = (tall ? 18 : 22) * u;
    rr(c, sx0, sy - th / 2, sx1 - sx0, th, th / 2);
    c.fillStyle = C.surface;
    c.fill();
    c.save();
    c.clip();
    c.fillStyle = C.accent;
    c.fillRect(sx0, sy - th / 2, (sx1 - sx0) * k, th);
    c.restore();
    c.strokeStyle = C.ink;
    c.lineWidth = 3 * u;
    rr(c, sx0, sy - th / 2, sx1 - sx0, th, th / 2);
    c.stroke();
    const kx = lerp(sx0, sx1, k),
      kr = (tall ? 24 : 28) * u;
    c.fillStyle = C.ink;
    c.beginPath();
    c.arc(kx + 4 * u, sy + 4 * u, kr, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = C.surface;
    c.beginPath();
    c.arc(kx, sy, kr, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    if (tall) {
      text(c, "more Golden", sx0, sy + 64 * u, { ...sans(30), color: C.ink });
      text(c, "more Poodle", sx1, sy + 64 * u, { ...sans(30), color: C.ink, align: "right" });
    } else {
      text(c, "more Golden", sx0 - 48 * u, sy + 13 * u, { ...sans(38), color: C.ink, align: "right" });
      text(c, "more Poodle", sx1 + 48 * u, sy + 13 * u, { ...sans(38), color: C.ink });
    }
    c.restore();
  };

  // ============================================================================ 04 sizes
  const SIZE_ROWS: [string, string, number][] = [
    ["Standard", "roughly 50–90 lb", 1],
    ["Medium", "roughly 30–45 lb", 0.76],
    ["Mini", "roughly 15–30 lb", 0.56],
    ["Petite", "under about 15 lb", 0.4],
  ];
  const Z = { first: T.sizes + 15, note: T.sizes + 75, hop1: T.sizes + 90, hop2: T.sizes + 120 };
  const ruler = (c: Ctx, x: number, top: number, floor: number, a: number) => {
    c.save();
    c.globalAlpha *= a;
    c.strokeStyle = C.ink;
    c.lineWidth = 3 * u;
    c.beginPath();
    c.moveTo(x, floor);
    c.lineTo(x, lerp(floor, top, a));
    const step = 20 * u;
    for (let y = floor, i = 0; y >= lerp(floor, top, a) - 0.5; y -= step, i++) {
      c.moveTo(x, y);
      c.lineTo(x + (i % 5 === 0 ? 26 : 13) * u, y);
    }
    c.stroke();
    c.restore();
  };
  const sizes = (c: Ctx, F: number) => {
    headline(c, F, {
      lines: ["Pick a [size]."],
      at: [T.sizes - 2],
      x: hx,
      y: tall ? 400 * u : 200 * u,
      size: 104,
      maxW: 860,
      color: C.ink,
    });
    const ra = ease.outCubic(prog(F, T.sizes, T.sizes + 16));
    const hops = (i: number) => hopK(F, [Z.hop1 + i * 6, Z.hop2 + (3 - i) * 6]);
    if (!tall) {
      const floor = 772 * u,
        rx = 170 * u,
        maxH = 470 * u,
        xs = [480, 870, 1230, 1565].map((v) => v * u);
      ruler(c, rx, floor - maxH - 20 * u, floor, ra);
      c.fillStyle = C.ink;
      c.fillRect(rx, floor - 1.5 * u, (1760 - 170) * u * ra, 3 * u);
      // dashed guides from the ruler to the top of each dog, behind all of them
      SIZE_ROWS.forEach(([, , k], i) => {
        const s = clamp(pop(F, Z.first + i * 15, 2.4, 0.5)),
          top = floor - maxH * k * 0.95;
        if (s <= 0.001) return;
        c.save();
        c.globalAlpha = s;
        c.setLineDash([8 * u, 8 * u]);
        c.strokeStyle = C.ink;
        c.lineWidth = 2 * u;
        c.beginPath();
        c.moveTo(rx + 30 * u, top);
        c.lineTo(xs[i]!, top);
        c.stroke();
        c.restore();
      });
      SIZE_ROWS.forEach(([name, lb, k], i) => {
        const s = pop(F, Z.first + i * 15, 2.4, 0.5),
          dh = maxH * k,
          x = xs[i]!;
        if (s <= 0.001) return;
        about(c, x, floor, s, () =>
          hopDog(
            c,
            x,
            floor - 2 * u,
            dh,
            { coat: i % 2 ? "curly" : "wavy", tone: ["apricot", "cream", "red", "chocolate"][i]!, f: F, seed: i + 8 },
            hops(i),
          ),
        );
        c.save();
        c.globalAlpha = clamp(s);
        text(c, name, x, floor + 62 * u, { ...sans(46), color: C.ink, align: "center" });
        text(c, lb, x, floor + 108 * u, { ...sans(34, 400), color: C.ink, align: "center" });
        c.restore();
      });
      c.globalAlpha = prog(F, Z.note, Z.note + 14);
      mono(c, "ranges are approximate; breeders' vary", 1040 * u, 1000 * u, C.ink, "center", 30);
      c.globalAlpha = 1;
    } else {
      const cw = 450 * u,
        ch = 430 * u,
        maxH = 290 * u;
      SIZE_ROWS.forEach(([name, lb, k], i) => {
        const s = pop(F, Z.first + i * 15 - 1, 2.4, 0.5),
          x = S.x + (i % 2) * (cw + 20 * u),
          y = 560 * u + Math.floor(i / 2) * (ch + 24 * u),
          floor = y + ch - 110 * u,
          dh = maxH * k;
        about(c, x + cw / 2, y + ch / 2, s, () => {
          sticker(c, x, y, cw, ch);
          ruler(c, x + 40 * u, floor - maxH - 10 * u, floor, 1);
          c.fillStyle = C.ink;
          c.fillRect(x + 40 * u, floor - 1.5 * u, cw - 80 * u, 3 * u);
          c.save();
          c.setLineDash([7 * u, 7 * u]);
          c.strokeStyle = C.ink;
          c.lineWidth = 2 * u;
          c.beginPath();
          c.moveTo(x + 70 * u, floor - dh * 0.95);
          c.lineTo(x + 260 * u, floor - dh * 0.95);
          c.stroke();
          c.restore();
          hopDog(
            c,
            x + 260 * u,
            floor - 2 * u,
            dh,
            { coat: i % 2 ? "curly" : "wavy", tone: ["apricot", "cream", "red", "chocolate"][i]!, f: F, seed: i + 8 },
            hops(i),
          );
          text(c, name, x + cw / 2, floor + 50 * u, { ...sans(34), color: C.ink, align: "center" });
          text(c, lb, x + cw / 2, floor + 88 * u, { ...sans(26, 400), color: C.ink, align: "center" });
        });
      });
      c.globalAlpha = prog(F, Z.note, Z.note + 14);
      mono(c, "ranges are approximate;", W - S.x, 1500 * u, C.ink, "right");
      mono(c, "breeders' vary", W - S.x, 1536 * u, C.ink, "right");
      c.globalAlpha = 1;
    }
  };

  // ============================================================================ 05 colours
  const colours = (c: Ctx, F: number) => {
    headline(c, F, {
      lines: ["From cream to", "[chocolate]."],
      at: [T.colours - 2, T.colours + 52],
      x: hx,
      y: tall ? 400 * u : 200 * u,
      size: 104,
      maxW: 860,
      color: C.ink,
    });
    const beat = clamp(Math.floor((F - T.colours - 15) / 15), -1, 99),
      idx = beat < 0 ? 0 : beat % 5,
      bump = beat < 0 ? 0 : 1 - spring((F - (T.colours + 15 + beat * 15)) / FPS, { freq: 3, damp: 0.45 });
    const dcx = tall ? W / 2 : 1060 * u,
      floor = tall ? 1130 * u : 792 * u,
      dh = tall ? 520 * u : 600 * u,
      s = pop(F, T.colours - 1, 2.2, 0.6);
    // a flat ground shadow for the stage
    c.fillStyle = "rgba(23,20,18,0.12)";
    c.beginPath();
    c.ellipse(dcx, floor, dh * 0.45 * s, dh * 0.06 * s, 0, 0, Math.PI * 2);
    c.fill();
    c.save();
    c.translate(dcx, floor);
    c.scale((1 + 0.05 * bump) * s, (1 - 0.06 * bump) * s);
    c.translate(-dcx, -floor);
    dog(c, dcx, floor, dh, { coat: "wavy", tone: COLOUR_NAMES[idx]!.toLowerCase(), f: F, seed: 5 });
    c.restore();
    // the swatch chips
    const chipH = big(84, 64) * u,
      o = sans(big(38, 28)),
      sr = big(22, 17) * u,
      widths = COLOUR_NAMES.map((n) => measure(c, n, o) + big(122, 96) * u),
      gap = big(20, 16) * u;
    const rows: number[][] = tall
      ? [
          [0, 1, 2],
          [3, 4],
        ]
      : [[0, 1, 2, 3, 4]];
    rows.forEach((row, ri) => {
      const total = row.reduce((a, i) => a + widths[i]!, 0) + gap * (row.length - 1);
      let x = (tall ? W : 2 * dcx) / 2 - total / 2;
      const y = (tall ? 1190 : 846) * u + ri * (chipH + 22 * u);
      for (const i of row) {
        const w = widths[i]!,
          on = beat >= 0 && idx === i,
          cs = pop(F, T.colours + 4 + i * 3, 2.6, 0.55) * (on ? 1 + 0.08 * (1 - bump) : 1);
        about(c, x + w / 2, y + chipH / 2, cs, () => {
          sticker(c, x, y, w, chipH, chipH / 2, on ? 6 * u : 4 * u, on ? C.ink : C.surface);
          const tone = DOG[COLOUR_NAMES[i]!.toLowerCase()]!,
            scx = x + chipH / 2 + 4 * u;
          c.fillStyle = tone.coat;
          c.beginPath();
          c.arc(scx, y + chipH / 2, sr, 0, Math.PI * 2);
          c.fill();
          c.strokeStyle = on ? C.surface : C.ink;
          c.lineWidth = 2.5 * u;
          c.stroke();
          if (tone.patch) {
            c.fillStyle = tone.patch;
            c.beginPath();
            c.arc(scx, y + chipH / 2, sr - 1.2 * u, -0.3, 1.4);
            c.fill();
          }
          text(c, COLOUR_NAMES[i]!, scx + sr + 14 * u, y + chipH / 2 + big(13, 10) * u, {
            ...o,
            color: on ? C.surface : C.ink,
          });
        });
        x += w + gap;
      }
    });
  };

  // ============================================================================ 06 the honest bit (ink ground)
  const HN = { dog: T.honest + 4, l1: T.honest + 34, l2: T.honest + 46, sneeze: T.honest + 62 };
  const honest = (c: Ctx, F: number) => {
    const hy = tall ? 620 * u : 360 * u,
      hsz = headline(c, F, {
        lines: ["No dog is fully", "[hypoallergenic]."],
        at: [T.honest - 2, T.honest + 12],
        x: hx,
        y: hy,
        size: 150,
        maxW: tall ? 860 : 1000,
        color: C.ground,
      });
    const l1 = spring((F - HN.l1) / FPS, { freq: 2.4, damp: 0.8 }),
      l2 = spring((F - HN.l2) / FPS, { freq: 2.4, damp: 0.8 }),
      y0 = hy + hsz * u * 1.06 + 110 * u;
    const lines = tall
      ? ["More Poodle usually means", "less shedding.", "Meet the dog first."]
      : ["More Poodle usually means less shedding.", "Meet the dog first."];
    lines.forEach((s, i) => {
      const p = clamp(i < lines.length - 1 ? l1 : l2);
      text(c, s, hx, y0 + i * 60 * u + (1 - p) * 18 * u, { ...sans(46, 400), color: C.ground, alpha: p });
    });
    // the doodle sneezes once (landscape: large on the right; vertical: small by the badge), then shakes it off
    const dx = tall ? bcx + BADGE / 2 + 130 * u : 1500 * u,
      floor = tall ? bcy + BADGE / 2 + 4 * u : 930 * u,
      dh = tall ? 190 * u : 560 * u,
      s = pop(F, HN.dog, 2.4, 0.55),
      sneeze = prog(F, HN.sneeze, HN.sneeze + 26),
      shake = Math.sin((F - HN.sneeze - 30) / 1.6) * 0.05 * Math.sin(Math.PI * prog(F, HN.sneeze + 30, HN.sneeze + 48));
    if (s > 0.001)
      about(
        c,
        dx,
        floor,
        s,
        () => {
          hopDog(
            c,
            dx,
            floor,
            dh,
            {
              coat: "wavy",
              tone: "cream",
              f: F,
              seed: 9,
              sneeze: sneeze > 0 && sneeze < 1 ? sneeze : 0,
              line: C.ground,
            },
            hopK(F, [HN.sneeze + 4]) * 0.6,
          );
        },
        shake,
      );
  };

  // ============================================================================ end card (cream)
  const E = { card: T.end, peek: T.end + 8, head: T.end + 10, chips: T.end + 26, foot: T.end + 50, bounce: T.end + 75 };
  const endCard = (c: Ctx, env: Env, F: number) => {
    const cw = tall ? 920 * u : 1200 * u,
      ch = tall ? 500 * u : 360 * u,
      cx = W / 2,
      top = tall ? 900 * u : 520 * u,
      th = tall ? 560 * u : 470 * u,
      s = pop(F, E.card - 1, 2.2, 0.6),
      peek = spring((F - E.peek) / FPS, { freq: 1.8, damp: 0.62 }),
      bob = Math.sin((F - T.end) / 9) * 5 * u;
    const drawTurtle = () =>
      turtle(c, env, "peek", "original", cx, top + th * 0.119 + (1 - peek) * th * 0.95 + bob, th, {
        tilt: 0.03 * Math.sin((F - T.end) / 16),
        squash: 1 + 0.015 * Math.sin((F - T.end) / 7),
        blink: blinkAt(F, 50, 12),
      });
    about(c, cx, top + ch / 2, s, () => {
      // the turtle behind the card; then its hands again over the card's top edge
      c.save();
      c.beginPath();
      c.rect(0, 0, W, top + 2 * u);
      c.clip();
      drawTurtle();
      c.restore();
      sticker(c, cx - cw / 2, top, cw, ch, 28 * u, 10 * u);
      c.save();
      c.beginPath();
      c.rect(0, top - 2 * u, W, th);
      c.clip();
      drawTurtle();
      c.restore();
      const hy = top + (tall ? 200 : 150) * u;
      headline(c, F, {
        lines: tall ? ["Which [doodle]", "is yours?"] : ["Which [doodle] is yours?"],
        at: tall ? [E.head, E.head + 12] : [E.head],
        x: cx,
        y: hy,
        size: tall ? 96 : 96,
        maxW: cw / u - 120,
        color: C.ink,
        center: true,
      });
      const chips = ["F1", "F1B", "F2", "Multigen"],
        o = sans(big(38, 30)),
        chH = big(70, 60) * u,
        ws = chips.map((t) => measure(c, t, o) + big(60, 52) * u),
        gap = 18 * u,
        total = ws.reduce((a, b) => a + b, 0) + gap * 3,
        chy = top + ch - (tall ? 120 : 112) * u;
      let x = cx - total / 2;
      chips.forEach((t, i) => {
        const w = ws[i]!,
          cs = pop(F, E.chips + i * 6, 2.8, 0.5) * (1 + 0.1 * hopK(F, [E.bounce + i * 5]));
        about(c, x + w / 2, chy + chH / 2, cs, () => {
          sticker(c, x, chy, w, chH, chH / 2, 4 * u, i % 2 ? C.accent2 : C.accent);
          text(c, t, x + w / 2, chy + chH / 2 + big(13, 11) * u, { ...o, color: C.ink, align: "center" });
        });
        x += w + gap;
      });
    });
    c.globalAlpha = prog(F, E.foot, E.foot + 16);
    mono(
      c,
      "sizes are approximate · every dog is its own dog",
      cx,
      tall ? 1545 * u : 1000 * u,
      C.ink,
      "center",
      big(30, 24),
    );
    c.globalAlpha = 1;
  };

  // ---- close-up inserts [from, to, focus x, focus y, zoom], cut on the beat: each long section gets one punch
  const CLOSE: [number, number, number, number, number][] = tall
    ? [
        [T.basics + 75, T.basics + 105, 540, 980, 1.6],
        [T.gens + 120, T.gens + 150, 420, 1087, 1.6],
        [T.coats + 120, T.coats + 150, 855, 920, 1.8],
        [T.sizes + 105, T.sizes + 135, 775, 1229, 1.9],
        [T.colours + 75, T.colours + 105, 540, 990, 1.3],
      ]
    : [
        [T.basics + 75, T.basics + 105, 1300, 545, 1.55],
        [T.gens + 120, T.gens + 150, 962, 760, 1.9],
        [T.coats + 120, T.coats + 150, 1515, 583, 1.7],
        [T.sizes + 105, T.sizes + 135, 1565, 740, 2.2],
        [T.colours + 75, T.colours + 105, 1060, 580, 1.3],
      ];

  // ---- the whole film as one paint(F)
  const paint = (c: Ctx, env: Env, F: number) => {
    F = clamp(F, 0, N - 1);
    c.setTransform(env.scale, 0, 0, env.scale, 0, 0);
    const sec = sectionAt(F);
    c.fillStyle = sec.ground;
    c.fillRect(0, 0, W, H);
    // a slow push-in over each section's content keeps every hold alive
    const next = SECTIONS.find((s) => s.at > F)?.at ?? N,
      push = 1 + 0.02 * ease.inOutCubic(prog(F, sec.at, next));
    const pcx = W / 2,
      pcy = tall ? H * 0.55 : H * 0.55;
    confetti(c, env, F, sec);
    c.save();
    c.translate(pcx, pcy);
    c.scale(push, push);
    c.translate(-pcx, -pcy);
    // a close-up insert: a hard cut in to one card for two beats, then a hard cut back out
    const cu = CLOSE.find(([a, b]) => F >= a && F < b);
    if (cu) {
      const [a, , fx, fy, z] = cu,
        zz = z * (1 + 0.03 * ease.outCubic(prog(F, a, a + 30)));
      c.translate(W / 2, H / 2);
      c.scale(zz, zz);
      c.translate(-fx * u, -fy * u);
    }
    if (F < T.basics) hook(c, env, F);
    else if (F < T.gens) basics(c, F);
    else if (F < T.coats) gens(c, F);
    else if (F < T.sizes) coats(c, F);
    else if (F < T.colours) sizes(c, F);
    else if (F < T.honest) colours(c, F);
    else if (F < T.end) honest(c, F);
    else endCard(c, env, F);
    c.restore();
    if (sec.label && !cu) mono(c, sec.label, S.x, S.top + 26 * u, sec.ink, "left", big(28, 24));
    if (F >= T.basics && F < T.end) badge(c, env, F, sec);
  };

  const cuts = [0, T.basics, T.gens, T.coats, T.sizes, T.colours, T.honest, T.end, N],
    names = ["hook", "basics", "generations", "coats", "sizes", "colours", "honest", "end"];
  const shots: Shot[] = names.map((sid, i) => ({
    id: sid,
    start: cuts[i]!,
    end: cuts[i + 1]!,
    draw: (c, local, env) => paint(c, env, cuts[i]! + local),
  }));
  const ticks = [
    B.golden + 2,
    B.poodle + 2,
    B.plus + 2,
    ...[0, 1, 2, 3].flatMap((i) => [G.first + i * G.every, G.first + 10 + i * G.every]),
    G.refill + 4,
    G.refill + 16,
    ...[0, 1, 2].flatMap((i) => [K.draw0 + i * K.every, K.draw0 + 20 + i * K.every]),
    K.nudge,
    ...CLOSE.flatMap(([a, b]) => [a, b]),
    ...[0, 1, 2, 3].map((i) => Z.first + i * 15),
    Z.hop1,
    Z.hop2,
    ...[0, 1, 2, 3, 4, 5, 6].map((i) => T.colours + 15 + i * 15),
    HN.sneeze + 12,
    ...[0, 1, 2, 3].map((i) => E.chips + i * 6),
  ];

  return {
    meta: { title: id, W, H, fps: FPS, bpm: BPM, durationFrames: N, raster: "cpu" },
    assets: {
      images: {
        "turtle:head": "assets/turtle/head.png",
        "turtle:wave": "assets/turtle/wave.png",
        "turtle:peek": "assets/turtle/peek.png",
      },
      fonts: P.assets,
    },
    shots,
    audio: beatScore({
      frames: N,
      fps: FPS,
      bpm: BPM,
      mood: "drive",
      drop: T.basics,
      hits: [T.basics, T.gens, T.coats, T.sizes, T.colours, T.honest, T.end],
      whooshes: [B.merged],
      ticks,
      sign: T.end + 6,
    }),
  };
}

export const doodleGuide = make("landscape", "doodleGuide");
export const doodleGuideVertical = make("vertical", "doodleGuideVertical");
