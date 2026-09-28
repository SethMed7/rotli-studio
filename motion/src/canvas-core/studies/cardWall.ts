// STUDY 22 · CARD WALL (30 s, 30 fps). A consumer launch film for the fictional Oriel built from ONE object: a
// tall rounded template card (a flat drawn scene on top, a tag chip, a title strip) repeated into a whole world: a
// coverflow, a Pick → Add → Done row, a cloud behind word slams, a wall that racks out of focus, the end card's
// backdrop. The ground is a slow aurora with twinkling specks. One source, designed for landscape and vertical.
// Brief: series/studies/briefs/card-wall.json · prompt: series/studies/prompts/card-wall.prompt.md
//
// The whole film is one continuous function paint(F) of a (fractional) frame F, so motion blur can sample inside
// the shutter; the shots only name the sections. Blur never uses ctx.filter: soft() draws into a small offscreen
// canvas and scales it back up. Cards are baked once into textures (a pure function of the template), then
// placed, scaled, tilted and sliced into strips for the coverflow's perspective.
import PACK from "../../../brand/packs/studio/pack.json";
import type { Ctx, Env, Layer } from "../core";
import { rng } from "../core";
import type { Film, Shot } from "../film";
import { motionBlur } from "../kit/blur";
import { clamp, ease, lerp, prog, spring } from "../kit/motion";
import { usePack } from "../kit/pack";
import { beatScore } from "../kit/score";
import { layout, type Size } from "../kit/sizes";
import { letters, measure, text, type TextOpts } from "../kit/type";
import { check, rr } from "../kit/ui";

const P = usePack(PACK),
  C = P.palette("deep"),
  F_ = P.face;
const FPS = 30,
  BPM = 120,
  N = 900; // a beat is 15 frames
// the timeline, in frames (every section starts on a beat)
const T = { mark: 0, head: 90, flow: 180, steps: 330, slam: 480, dof: 600, tiles: 720, end: 810 };
// the steps' cues, the slams' landings, the tiles' beats
const CUE = {
  tap: 358,
  check: 360,
  line1: 372,
  add: 388,
  pill: 414,
  line2: 420,
  done: 436,
  slam1: 480,
  slam2: 540,
  tiles: [735, 750, 765, 780],
};
const STEPS = Array.from({ length: 8 }, (_, k) => T.flow + 30 + 15 * k); // coverflow steps, one per beat
const TAU = Math.PI * 2;

const rgba = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

// ---- the one object: a template card. 400 × 560 card units; the art panel is 372 × 400.
const CW = 400,
  CH = 560,
  PAD = 56, // room for the baked shadow
  TS = 1.5; // textures are baked at 1.5× so a card can grow without going soft
type Tpl = { title: string; meta: string; tag: string };
const TPL: Tpl[] = [
  { title: "Coffee chat", meta: "30 min · 2 people", tag: "Popular" },
  { title: "Morning standup", meta: "15 min · the team", tag: "New" },
  { title: "Quick sync", meta: "20 min · 3 people", tag: "Popular" },
  { title: "1:1 catch-up", meta: "45 min · 2 people", tag: "New" },
  { title: "Brainstorm", meta: "1 hr · 6 people", tag: "Popular" },
  { title: "Trip planning", meta: "1 hr · 4 people", tag: "New" },
  { title: "Birthday lunch", meta: "Sat · 10 people", tag: "Popular" },
  { title: "Book club", meta: "Monthly · 5 people", tag: "New" },
  { title: "Team lunch", meta: "Fri · 8 people", tag: "Everyone in" },
];

const STARS = (() => {
  const R = rng(2201);
  return Array.from({ length: 150 }, () => ({
    x: R(),
    y: R(),
    s: 1 + R() * 1.8,
    a: 0.18 + R() * 0.5,
    ph: R() * TAU,
    sp: 0.8 + R() * 2.2,
  }));
})();
// the card cloud behind the word slams: normalised positions, depth z (0 near, 1 far), a tilt and a template
const CLOUD = (() => {
  const R = rng(2202);
  return Array.from({ length: 30 }, (_, i) => {
    const z = (i + R() * 0.8) / 30;
    let x = 0,
      y = 0;
    do {
      x = R() * 2 - 1;
      y = R() * 2 - 1;
    } while (z < 0.55 && Math.abs(x) < 0.5 && Math.abs(y) < 0.42); // keep near cards off the words
    return { x, y, z, rot: (R() - 0.5) * 0.75, tpl: i % 8, ph: R() * TAU };
  }).sort((a, b) => b.z - a.z);
})();

// ---- art: flat scenes in two or three pack colours, drawn into the 372 × 400 panel
const circle = (c: Ctx, x: number, y: number, r: number, fill: string) => {
  c.beginPath();
  c.arc(x, y, r, 0, TAU);
  c.fillStyle = fill;
  c.fill();
};
const ell = (c: Ctx, x: number, y: number, rx: number, ry: number, fill: string) => {
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, TAU);
  c.fillStyle = fill;
  c.fill();
};
const box = (c: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string) => {
  rr(c, x, y, w, h, r);
  c.fillStyle = fill;
  c.fill();
};
const stroke = (c: Ctx, color: string, lw: number, pts: [number, number][]) => {
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.strokeStyle = color;
  c.lineWidth = lw;
  c.lineCap = "round";
  c.lineJoin = "round";
  c.stroke();
};
const polyFill = (c: Ctx, fill: string, pts: [number, number][]) => {
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
  c.fillStyle = fill;
  c.fill();
};
const cloudShape = (c: Ctx, x: number, y: number, s: number, fill: string) => {
  circle(c, x - 48 * s, y, 32 * s, fill);
  circle(c, x, y - 20 * s, 46 * s, fill);
  circle(c, x + 50 * s, y, 30 * s, fill);
  box(c, x - 80 * s, y - 4 * s, 160 * s, 36 * s, 18 * s, fill);
};

function art(c: Ctx, i: number) {
  const A = C.accent,
    B = C.accent2,
    I = C.ink,
    Ln = C.line,
    G = C.ground;
  const bg = (col: string) => {
    c.fillStyle = col;
    c.fillRect(0, 0, 372, 400);
  };
  switch (i) {
    case 0: {
      // a coffee cup with steam
      bg(A);
      ell(c, 186, 332, 132, 28, Ln);
      c.beginPath();
      c.moveTo(100, 196);
      c.lineTo(272, 196);
      c.lineTo(255, 298);
      c.quadraticCurveTo(251, 322, 228, 322);
      c.lineTo(144, 322);
      c.quadraticCurveTo(121, 322, 117, 298);
      c.closePath();
      c.fillStyle = I;
      c.fill();
      c.beginPath();
      c.arc(268, 248, 36, -1.25, 1.25);
      c.strokeStyle = I;
      c.lineWidth = 16;
      c.stroke();
      ell(c, 186, 196, 86, 18, I);
      ell(c, 186, 198, 70, 11, Ln);
      for (const [x, top] of [
        [150, 104],
        [186, 74],
        [222, 104],
      ] as const) {
        c.beginPath();
        c.moveTo(x, 170);
        c.bezierCurveTo(x - 24, 150, x + 24, top + 40, x, top);
        c.strokeStyle = I;
        c.lineWidth = 10;
        c.lineCap = "round";
        c.stroke();
      }
      break;
    }
    case 1: {
      // a sun over a desk
      bg(Ln);
      circle(c, 262, 124, 62, A);
      box(c, 28, 282, 316, 18, 6, I);
      box(c, 58, 298, 14, 110, 4, I);
      box(c, 300, 298, 14, 110, 4, I);
      box(c, 98, 176, 142, 98, 10, B);
      box(c, 84, 272, 170, 10, 4, G);
      box(c, 268, 240, 34, 42, 7, A);
      c.beginPath();
      c.arc(304, 260, 11, -1.4, 1.4);
      c.strokeStyle = A;
      c.lineWidth = 6;
      c.stroke();
      break;
    }
    case 2: {
      // a clock face
      bg(I);
      circle(c, 186, 200, 134, Ln);
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * TAU,
          major = k % 3 === 0,
          r1 = 112,
          r0 = r1 - (major ? 26 : 14);
        stroke(c, I, major ? 8 : 5, [
          [186 + Math.cos(a) * r0, 200 + Math.sin(a) * r0],
          [186 + Math.cos(a) * r1, 200 + Math.sin(a) * r1],
        ]);
      }
      const hand = (a: number, len: number, lw: number, col: string) =>
        stroke(c, col, lw, [
          [186, 200],
          [186 + Math.cos(a) * len, 200 + Math.sin(a) * len],
        ]);
      hand((10 / 12) * TAU - TAU / 4, 62, 14, I);
      hand(-TAU / 4, 92, 10, I);
      hand(0.37 * TAU - TAU / 4, 100, 5, C.accent);
      circle(c, 186, 200, 13, C.accent);
      break;
    }
    case 3: {
      // two chat bubbles
      bg(B);
      box(c, 34, 62, 232, 112, 34, I);
      polyFill(c, I, [
        [66, 166],
        [112, 166],
        [52, 206],
      ]);
      box(c, 68, 98, 150, 16, 8, B);
      box(c, 68, 128, 100, 16, 8, B);
      box(c, 116, 214, 222, 100, 34, A);
      polyFill(c, A, [
        [300, 306],
        [262, 306],
        [324, 342],
      ]);
      for (const x of [180, 227, 274]) circle(c, x, 264, 12, I);
      break;
    }
    case 4: {
      // a whiteboard with a chart and a sticky note
      bg(A);
      box(c, 92, 280, 12, 130, 4, Ln);
      box(c, 268, 280, 12, 130, 4, Ln);
      box(c, 36, 54, 300, 228, 18, I);
      box(c, 66, 282, 240, 12, 5, Ln);
      box(c, 72, 196, 36, 62, 6, B);
      box(c, 120, 166, 36, 92, 6, B);
      box(c, 168, 132, 36, 126, 6, B);
      stroke(c, Ln, 8, [
        [72, 150],
        [126, 118],
        [176, 130],
        [236, 84],
      ]);
      c.save();
      c.translate(274, 206);
      c.rotate(0.1);
      box(c, -32, -32, 64, 64, 6, A);
      box(c, -20, -12, 40, 7, 3, I);
      box(c, -20, 4, 26, 7, 3, I);
      c.restore();
      break;
    }
    case 5: {
      // a plane over clouds
      bg(B);
      cloudShape(c, 96, 320, 1.15, I);
      cloudShape(c, 296, 124, 0.7, I);
      c.save();
      c.setLineDash([18, 16]);
      stroke(c, I, 6, [
        [26, 262],
        [118, 222],
      ]);
      c.restore();
      c.save();
      c.translate(220, 196);
      c.rotate(-0.26);
      polyFill(c, A, [
        [-4, 0],
        [34, 0],
        [-36, -58],
        [-58, -58],
      ]);
      box(c, -104, -17, 208, 34, 17, A);
      polyFill(c, A, [
        [-6, 0],
        [36, 0],
        [-34, 70],
        [-58, 70],
      ]);
      polyFill(c, A, [
        [-104, -4],
        [-74, -4],
        [-94, -48],
        [-112, -48],
      ]);
      for (let k = 0; k < 5; k++) circle(c, 18 + k * 15, -3, 4.5, I);
      c.restore();
      break;
    }
    case 6: {
      // a cake with a candle
      bg(Ln);
      ell(c, 186, 338, 152, 24, I);
      box(c, 90, 222, 192, 110, 14, B);
      box(c, 84, 196, 204, 46, 16, I);
      for (const [x, y, r] of [
        [112, 240, 12],
        [152, 244, 14],
        [198, 238, 11],
        [240, 246, 15],
        [272, 238, 10],
      ] as const)
        circle(c, x, y, r, I);
      for (const [x, y] of [
        [120, 290],
        [168, 276],
        [210, 300],
        [250, 280],
      ] as const) {
        c.save();
        c.translate(x, y);
        c.rotate(x * 0.03);
        box(c, -9, -3, 18, 6, 3, C.accent);
        c.restore();
      }
      box(c, 177, 126, 18, 74, 5, C.accent);
      c.beginPath();
      c.moveTo(186, 72);
      c.quadraticCurveTo(210, 102, 186, 118);
      c.quadraticCurveTo(162, 102, 186, 72);
      c.fillStyle = I;
      c.fill();
      break;
    }
    case 7: {
      // a stack of books
      bg(I);
      const books: [number, number, string][] = [
        [62, 254, A],
        [84, 220, B],
        [70, 250, Ln],
        [96, 210, A],
        [80, 228, B],
      ];
      books.forEach(([x, w, col], k) => {
        const y = 330 - k * 50;
        box(c, x, y, w, 44, 8, col);
        box(c, x + w - 44, y + 8, 12, 28, 4, I);
        box(c, x + 18, y + 17, w * 0.4, 10, 5, rgba(I, 0.55));
      });
      box(c, 246, 76, 14, 58, 3, A);
      break;
    }
    default: {
      // a long table with everyone round it
      bg(B);
      box(c, 120, 92, 132, 272, 56, Ln);
      const rows = [134, 196, 258, 320];
      for (const y of rows) {
        circle(c, 152, y, 14, I);
        circle(c, 220, y, 14, I);
      }
      rows.forEach((y, k) => {
        circle(c, 78, y, 25, [A, I, G, A][k]!);
        circle(c, 294, y, 25, [I, G, A, I][k]!);
      });
    }
  }
}

// ---- blur without ctx.filter: scratch canvases the size of the frame, reused by every soft() call
let E: Env; // the env of the frame being painted (set at the top of paint)
let blurK = 1; // soft() draws at 1/d scale; the true size of anything drawn inside it is its size × blurK
const scratch = (k: string): Layer => {
  const w = Math.round(E.W * E.scale),
    h = Math.round(E.H * E.scale),
    key = `cardWall:${k}:${w}x${h}`;
  let L = E.cache.get(key) as Layer | undefined;
  if (!L) {
    L = E.canvas(w, h);
    E.cache.set(key, L);
  }
  return L;
};
/** draw(c) painted d× out of focus (d = the downscale factor), at alpha, over the whole frame */
function soft(ctx: Ctx, d: number, alpha: number, draw: (c: Ctx) => void) {
  if (alpha <= 0.003) return;
  if (d < 1.2) {
    ctx.save();
    ctx.globalAlpha *= alpha;
    draw(ctx);
    ctx.restore();
    return;
  }
  const DW = Math.round(E.W * E.scale),
    DH = Math.round(E.H * E.scale),
    sw = Math.min(DW, Math.ceil(DW / d) + 2),
    sh = Math.min(DH, Math.ceil(DH / d) + 2);
  const A = scratch("softA"),
    a = A.ctx,
    M = ctx.getTransform();
  a.setTransform(1, 0, 0, 1, 0, 0);
  a.globalAlpha = 1;
  a.globalCompositeOperation = "source-over";
  a.clearRect(0, 0, sw + 2, sh + 2);
  a.imageSmoothingEnabled = true;
  a.imageSmoothingQuality = "high";
  a.save();
  a.setTransform(M.a / d, M.b / d, M.c / d, M.d / d, M.e / d, M.f / d);
  const k0 = blurK;
  blurK = d;
  try {
    draw(a);
  } finally {
    blurK = k0;
  }
  a.restore();
  let src: Layer = A,
    w = sw,
    h = sh;
  if (d >= 3) {
    // a tent blur at low resolution: the average of offset copies ("lighter" adds premultiplied colour, so
    // transparent areas average correctly too)
    const B = scratch("softB"),
      b = B.ctx,
      offs: [number, number][] = [
        [0, 0],
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
        [-0.7, -0.7],
        [0.7, -0.7],
        [-0.7, 0.7],
        [0.7, 0.7],
      ];
    b.setTransform(1, 0, 0, 1, 0, 0);
    b.globalAlpha = 1;
    b.globalCompositeOperation = "source-over";
    b.clearRect(0, 0, sw + 4, sh + 4);
    b.imageSmoothingEnabled = true;
    b.globalCompositeOperation = "lighter";
    b.globalAlpha = 1 / offs.length;
    for (const [ox, oy] of offs) b.drawImage(A.canvas, 0, 0, sw, sh, ox, oy, sw, sh);
    b.globalCompositeOperation = "source-over";
    b.globalAlpha = 1;
    src = B;
  }
  if (d >= 4) {
    // a second, 2× step smooths the bilinear creases of a big upscale
    const S2 = scratch("softC");
    S2.ctx.setTransform(1, 0, 0, 1, 0, 0);
    S2.ctx.globalAlpha = 1;
    S2.ctx.clearRect(0, 0, sw * 2 + 2, sh * 2 + 2);
    S2.ctx.imageSmoothingEnabled = true;
    S2.ctx.imageSmoothingQuality = "high";
    S2.ctx.drawImage(src.canvas, 0, 0, sw, sh, 0, 0, sw * 2, sh * 2);
    src = S2;
    w = sw * 2;
    h = sh * 2;
  }
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha *= alpha;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src.canvas, 0, 0, w, h, 0, 0, sw * d, sh * d);
  ctx.restore();
}
// ---- card copy is read, not watched: it is drawn ONCE per frame, sharp, from the shutter's middle sample, on top
// of the motion-blurred frame (like a HUD). Under soft() (already out of focus) or outside a blur pass it draws inline.
type Deferred = { M: DOMMatrix; a: number; fn: (c: Ctx) => void };
let REC: Deferred[] | null = null, // collecting (the middle sample)
  SKIP = false, // the other samples: leave the copy out
  CUR_DT = 0; // the shutter offset of the sample being painted
const sharp = (c: Ctx, fn: (c: Ctx) => void) => {
  if (blurK !== 1 || (!REC && !SKIP)) return fn(c);
  if (REC) REC.push({ M: c.getTransform(), a: c.globalAlpha, fn });
};
/** logical px per unit of the current transform (what a 1-unit glyph really measures on a 1080 frame) */
const effK = (c: Ctx) => {
  const M = c.getTransform();
  return (Math.hypot(M.a, M.b) * blurK) / E.scale;
};

// ---- text that never renders under 22 px: below it, a card's copy becomes a quiet bar
const gtext = (c: Ctx, s: string, x: number, y: number, o: TextOpts) => {
  if (o.size * effK(c) >= 22) return text(c, s, x, y, o);
  const w = measure(c, s, o),
    left = o.align === "center" ? x - w / 2 : o.align === "right" ? x - w : x;
  box(c, left, y - o.size * 0.62, w, o.size * 0.5, o.size * 0.25, rgba(o.color ?? C.ink, 0.55 * (o.alpha ?? 1)));
  return w;
};

// ---- a template card's face, in card units (0..CW, 0..CH); full = with its copy, else quiet bars
const TITLE: TextOpts = { size: 38, family: F_.sans, weight: 600, color: C.ink, track: -0.02 },
  META: TextOpts = { size: 30, family: F_.sans, weight: 400, color: C.muted, track: -0.005 },
  TAG = 28;
function cardFace(c: Ctx, i: number, bars: boolean, px: number, shadow: boolean) {
  const tp = TPL[i]!;
  c.save();
  if (shadow) {
    c.shadowColor = "rgba(2,3,16,0.62)";
    c.shadowBlur = 34 * px;
    c.shadowOffsetY = 18 * px;
  }
  box(c, 0, 0, CW, CH, 34, C.surface);
  c.restore();
  rr(c, 1, 1, CW - 2, CH - 2, 33);
  c.strokeStyle = rgba(C.ink, 0.1);
  c.lineWidth = 2;
  c.stroke();
  c.save();
  rr(c, 14, 14, 372, 400, 24);
  c.clip();
  c.translate(14, 14);
  art(c, i);
  c.restore();
  if (bars) {
    box(c, 30, 446, Math.min(300, measure(c, tp.title, TITLE)), 22, 11, rgba(C.ink, 0.8));
    box(c, 30, 494, Math.min(300, measure(c, tp.meta, META) * 0.9), 15, 7.5, rgba(C.muted, 0.75));
  }
}
/** a template card's copy (tag chip, title, meta), in card units: drawn live, never baked */
function cardCopy(c: Ctx, i: number) {
  const tp = TPL[i]!;
  chip(c, 30, 30, tp.tag, TAG);
  text(c, tp.title, 30, 474, TITLE);
  text(c, tp.meta, 30, 518, META);
}
/** a tag chip: dark glass pill, a coloured dot, the tag */
function chip(c: Ctx, x: number, y: number, label: string, size: number) {
  const o: TextOpts = { size, family: F_.sans, weight: 600, color: C.ink, track: -0.01 },
    tw = measure(c, label, o),
    h = size * 1.8,
    pad = size * 0.68,
    dr = size * 0.24;
  box(c, x, y, pad + dr * 2 + size * 0.38 + tw + pad, h, h / 2, rgba(C.ground, 0.74));
  circle(c, x + pad + dr, y + h / 2, dr, label === "New" ? C.accent2 : C.accent);
  text(c, label, x + pad + dr * 2 + size * 0.38, y + h / 2 + size * 0.36, o);
}

export function make(size: Size, id: string): Film {
  const L = layout(size),
    { W, H, u, cx, cy, tall, safe } = L;

  // ---- textures: one per template and variant, baked on first use (a pure function of the template)
  const tex = (i: number, bars: boolean, shadow = true): Layer => {
    const key = `cardWall:tex:${i}:${bars ? 1 : 0}:${shadow ? 1 : 0}:${E.scale}`;
    let X = E.cache.get(key) as Layer | undefined;
    if (X) return X;
    const px = TS * E.scale;
    X = E.canvas(Math.ceil((CW + 2 * PAD) * px), Math.ceil((CH + 2 * PAD) * px));
    X.ctx.setTransform(px, 0, 0, px, PAD * px, PAD * px);
    cardFace(X.ctx, i, bars, px, shadow);
    E.cache.set(key, X);
    return X;
  };
  const TW = CW + 2 * PAD,
    TH = CH + 2 * PAD;
  /** the copy shows only where every glyph is at least 22 px: the 28-unit tag needs a scale of 0.79 */
  const fullness = (c: Ctx) => prog(effK(c), 22 / TAG, 22 / TAG + 0.05);
  /** the copy over a card body: q = fullness; the bars (baked in the body) give way as the copy arrives */
  const copyOver = (ctx: Ctx, i: number, q: number, defer: boolean) => {
    if (q <= 0) return;
    const draw = (c: Ctx) => {
      c.save();
      c.globalAlpha *= q;
      c.translate(-CW / 2, -CH / 2);
      cardCopy(c, i);
      c.restore();
    };
    if (defer) sharp(ctx, draw);
    else draw(ctx);
  };
  /** a card centred at (x, y), s = scale (1 = 400 px wide), rot in radians */
  const put = (ctx: Ctx, i: number, x: number, y: number, s: number, rot = 0, a = 1, defer = true, ca = 1) => {
    if (a <= 0.003) return;
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.translate(x, y);
    if (rot) ctx.rotate(rot);
    ctx.scale(s * u, s * u);
    const q = fullness(ctx) * ca;
    ctx.drawImage(tex(i, q <= 0.001).canvas, -TW / 2, -TH / 2, TW, TH);
    copyOver(ctx, i, q, defer);
    ctx.restore();
  };
  /** the same card turned about its vertical axis by yaw: sliced into strips, each scaled by its depth */
  const persp = (ctx: Ctx, i: number, x: number, y: number, s: number, yaw: number, a = 1, rot = 0, ca = 1) => {
    if (Math.abs(yaw) < 0.004) return put(ctx, i, x, y, s, rot, a, true, ca);
    if (a <= 0.003) return;
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.translate(x, y);
    if (rot) ctx.rotate(rot);
    ctx.scale(s * u, s * u);
    const q = fullness(ctx) * ca,
      n = 44,
      sy = Math.sin(yaw),
      cyw = Math.cos(yaw),
      D = 1300,
      ov = (TW / n) * 0.1;
    // the shadow: an inset trapezoid under the card, blurred by the canvas shadow (strips would stripe it)
    const at = (uu: number, vv: number): [number, number] => {
      const p = 1 / (1 + (sy * uu) / D);
      return [uu * cyw * p, vv * p];
    };
    const ins = 22;
    ctx.save();
    const kk = effK(ctx) * E.scale;
    ctx.shadowColor = "rgba(2,3,16,0.62)";
    ctx.shadowBlur = (34 * kk) / blurK;
    ctx.shadowOffsetY = (18 * kk) / blurK;
    polyFill(ctx, C.surface, [
      at(-CW / 2 + ins, -CH / 2 + ins),
      at(CW / 2 - ins, -CH / 2 + ins),
      at(CW / 2 - ins, CH / 2 - ins),
      at(-CW / 2 + ins, CH / 2 - ins),
    ]);
    ctx.restore();
    const strips = (X: Layer) => {
      const cw = X.canvas.width,
        ch = X.canvas.height;
      for (let j = 0; j < n; j++) {
        const u0 = -TW / 2 + (j * TW) / n,
          u1 = u0 + TW / n,
          p0 = 1 / (1 + (sy * u0) / D),
          p1 = 1 / (1 + (sy * u1) / D),
          h = TH * ((p0 + p1) / 2),
          x0 = u0 * cyw * p0,
          x1 = u1 * cyw * p1;
        ctx.drawImage(X.canvas, (j * cw) / n, 0, cw / n, ch, x0, -h / 2, x1 - x0 + ov, h);
      }
    };
    strips(tex(i, q <= 0.001, false));
    // the copy sits near the card's centre, where the turn is mild: an affine fit of the strips is exact enough
    ctx.scale(cyw, 1);
    copyOver(ctx, i, q, true);
    ctx.restore();
  };
  /** begin drawing a live card (for the Add and Done steps): returns with the card's unit space set up */
  const liveCard = (ctx: Ctx, x: number, y: number, s: number, rot: number) => {
    ctx.translate(x, y);
    if (rot) ctx.rotate(rot);
    ctx.scale(s * u, s * u);
    ctx.translate(-CW / 2, -CH / 2);
    const k = effK(ctx) * E.scale;
    ctx.save();
    ctx.shadowColor = "rgba(2,3,16,0.62)";
    ctx.shadowBlur = (34 * k) / blurK;
    ctx.shadowOffsetY = (18 * k) / blurK;
    box(ctx, 0, 0, CW, CH, 34, C.surface);
    ctx.restore();
    rr(ctx, 1, 1, CW - 2, CH - 2, 33);
    ctx.strokeStyle = rgba(C.ink, 0.1);
    ctx.lineWidth = 2;
    ctx.stroke();
    box(ctx, 14, 14, 372, 400, 24, C.line);
  };

  const push = (ctx: Ctx, k: number, ox = cx, oy = cy) => {
    ctx.translate(ox, oy);
    ctx.scale(k, k);
    ctx.translate(-ox, -oy);
  };
  const rise = (F: number, at: number, freq = 2.6, damp = 0.72) => spring((F - at) / FPS, { freq, damp });

  // ---- headlines: tight Inter 600, one word per line in Instrument Serif Italic in the accent ("*word*")
  type Seg = { t: string; it: boolean };
  const words = (line: string): Seg[][] =>
    line
      .split(" ")
      .filter(Boolean)
      .map((w) =>
        w
          .split(/(\*[^*]+\*)/)
          .filter(Boolean)
          .map((p) => (p.startsWith("*") ? { t: p.slice(1, -1), it: true } : { t: p, it: false })),
      );
  const segO = (sg: Seg, sz: number, color: string = C.ink): TextOpts =>
    sg.it
      ? { size: sz * 1.16, family: F_.italic, weight: 400, color: C.accent, track: -0.005 }
      : { size: sz, family: F_.sans, weight: 600, color, track: -0.035 };
  const wordW = (ctx: Ctx, wd: Seg[], sz: number) => wd.reduce((s, sg) => s + measure(ctx, sg.t, segO(sg, sz)), 0);
  const lineW = (ctx: Ctx, line: string, sz: number) => {
    const ws = words(line);
    return ws.reduce((s, w) => s + wordW(ctx, w, sz), 0) + sz * 0.26 * (ws.length - 1);
  };
  /** the largest size (≤ sz) at which every line fits maxW */
  const fit = (ctx: Ctx, lines: string[], sz: number, maxW: number) =>
    Math.min(sz, ...lines.map((l) => (sz * maxW) / lineW(ctx, l, sz)));
  /** lines of a headline from the first baseline y; rev(i) is word i's arrival (0..1, springs), i counting across lines */
  const headline = (
    ctx: Ctx,
    lines: string[],
    x: number,
    y: number,
    sz: number,
    align: "left" | "center",
    rev: (i: number) => number,
    o: { lh?: number; color?: string } = {},
  ) => {
    let gi = 0;
    lines.forEach((line, li) => {
      const ws = words(line),
        by = y + li * sz * (o.lh ?? 1.1);
      let px = align === "center" ? x - lineW(ctx, line, sz) / 2 : x;
      for (const wd of ws) {
        const p = rev(gi++),
          ww = wordW(ctx, wd, sz);
        if (p > 0.001) {
          ctx.save();
          ctx.globalAlpha *= clamp(p * 1.6);
          ctx.translate(0, (1 - p) * sz * 0.32);
          let sx = px;
          for (const sg of wd) {
            const so = segO(sg, sz, o.color);
            text(ctx, sg.t, sx, by, so);
            sx += measure(ctx, sg.t, so);
          }
          ctx.restore();
        }
        px += ww + sz * 0.26;
      }
    });
  };
  const wrap = (ctx: Ctx, s: string, maxW: number, o: TextOpts) => {
    const out: string[] = [];
    let cur = "";
    for (const w of s.split(" ")) {
      const t = cur ? `${cur} ${w}` : w;
      if (cur && measure(ctx, t, o) > maxW) {
        out.push(cur);
        cur = w;
      } else cur = t;
    }
    if (cur) out.push(cur);
    return out;
  };

  // ---- the ground: a slow aurora (four soft fields on a tiny canvas, scaled up) and twinkling specks
  const ground = (ctx: Ctx, F: number) => {
    const mw = tall ? 72 : 128,
      mh = tall ? 128 : 72,
      key = `cardWall:mesh:${size}`;
    let M = E.cache.get(key) as Layer | undefined;
    if (!M) {
      M = E.canvas(mw, mh);
      E.cache.set(key, M);
    }
    const c = M.ctx,
      t = F / FPS,
      D = Math.max(W, H);
    c.setTransform(mw / W, 0, 0, mh / H, 0, 0);
    c.globalAlpha = 1;
    c.fillStyle = C.ground;
    c.fillRect(0, 0, W, H);
    const blob = (col: string, x: number, y: number, r: number, a: number) => {
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, rgba(col, a));
      g.addColorStop(0.5, rgba(col, a * 0.5));
      g.addColorStop(1, rgba(col, 0));
      c.fillStyle = g;
      c.fillRect(0, 0, W, H);
    };
    const br = (k: number) => 0.85 + 0.15 * Math.sin(t * 0.55 + k);
    blob(C.surface, W * (0.52 + 0.1 * Math.sin(t * 0.19 + 2)), H * (0.5 + 0.08 * Math.cos(t * 0.23)), D * 0.62, 1);
    blob(
      C.accent2,
      W * (0.16 + 0.07 * Math.sin(t * 0.31)),
      H * (0.18 + 0.07 * Math.cos(t * 0.27)),
      D * 0.55,
      0.42 * br(0),
    );
    blob(
      C.accent,
      W * (0.88 + 0.05 * Math.cos(t * 0.23)),
      H * (0.86 + 0.05 * Math.sin(t * 0.29)),
      D * 0.5,
      0.24 * br(1.7),
    );
    blob(
      C.accent2,
      W * (0.9 + 0.04 * Math.sin(t * 0.26 + 1)),
      H * (0.12 + 0.05 * Math.cos(t * 0.33)),
      D * 0.3,
      0.2 * br(3),
    );
    blob(C.ground, W * (0.34 + 0.08 * Math.cos(t * 0.21)), H * (0.92 + 0.04 * Math.sin(t * 0.3)), D * 0.36, 0.7);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(M.canvas, 0, 0, mw, mh, 0, 0, W * E.scale, H * E.scale);
    ctx.restore();
    ctx.fillStyle = C.ink;
    for (const s of STARS) {
      const a = s.a * (0.5 + 0.5 * Math.sin(t * s.sp + s.ph));
      if (a < 0.03) continue;
      ctx.globalAlpha = a;
      const x = ((s.x * W + t * 6 * u * s.s) % W) + 0,
        y = s.y * H,
        r = s.s * u;
      ctx.fillRect(x - r / 2, y - r / 2, r, r);
    }
    ctx.globalAlpha = 1;
  };

  // ---- the mark: an accent disc holding an arched (oriel) window, and the name tracked out beside it
  const markAt = (c: Ctx, x: number, y: number, r: number, arch = 1) => {
    if (r <= 0.1) return;
    circle(c, x, y, r, C.accent);
    if (arch <= 0) return;
    c.save();
    c.globalAlpha *= arch;
    const aw = r * 0.74 * lerp(0.6, 1, arch),
      top = y - r * 0.46,
      bot = y + r * 0.48;
    c.beginPath();
    c.moveTo(x - aw / 2, bot);
    c.lineTo(x - aw / 2, top + aw / 2);
    c.arc(x, top + aw / 2, aw / 2, Math.PI, 0);
    c.lineTo(x + aw / 2, bot);
    c.closePath();
    c.fillStyle = C.ink;
    c.fill();
    c.fillStyle = C.accent;
    c.fillRect(x - r * 0.045, top + aw * 0.28, r * 0.09, bot - top - aw * 0.28);
    c.restore();
  };
  const NAME = P.product.toUpperCase(),
    R0 = 56 * u,
    nameO = (track: number): TextOpts => ({ size: 62 * u, family: F_.sans, weight: 600, color: C.ink, track }),
    GAP = 36 * u;
  /** the lockup centred on (x, y): mark radius r0 × k, the name with its letters arriving by nameP(i) */
  const lockup = (
    ctx: Ctx,
    x: number,
    y: number,
    k: number,
    track: number,
    nameP: (i: number) => number,
    slide = 1,
  ) => {
    const lw = 2 * R0 + GAP + measure(ctx, NAME, nameO(0.34)),
      mx = lerp(x, x - lw / 2 + R0, slide);
    ctx.save();
    push(ctx, k, x, y);
    markAt(ctx, mx, y, R0, 1);
    letters(ctx, NAME, mx + R0 + GAP, y + 22 * u, nameO(track), nameP, "fade");
    ctx.restore();
  };

  // ---- 0 · the mark (0–90) and 1 · the headline (90–180)
  const lockTop = tall ? safe.top + 70 * u : 150 * u;
  const HEAD = tall ? ["Book what's", "*easy*."] : ["Book what's *easy*."];
  const SUB = tall
    ? ["Pick a template.", "Add your people.", "Done in seconds."]
    : ["Pick a template. Add your people. Done in seconds."];
  const CHIPS: { label: string; x: number; y: number; rot: number; at: number }[] = tall
    ? [
        { label: "Popular", x: cx - 250 * u, y: cy - 250 * u, rot: -0.1, at: 70 },
        { label: "New", x: cx + 330 * u, y: cy + 50 * u, rot: 0.08, at: 78 },
        { label: "Tonight", x: cx + 180 * u, y: cy + 470 * u, rot: -0.06, at: 86 },
      ]
    : [
        { label: "Popular", x: cx - 620 * u, y: cy - 150 * u, rot: -0.12, at: 70 },
        { label: "New", x: cx - 560 * u, y: cy + 270 * u, rot: 0.07, at: 78 },
        { label: "Tonight", x: cx + 600 * u, y: cy + 250 * u, rot: -0.06, at: 86 },
      ];
  const floatChip = (ctx: Ctx, label: string, x: number, y: number, rot: number, k: number, a: number) => {
    if (k <= 0.01 || a <= 0) return;
    const sz = 28 * u,
      o: TextOpts = {
        size: sz,
        family: F_.sans,
        weight: 600,
        color: label === "New" ? C.ground : C.ink,
        track: -0.01,
      },
      tw = measure(ctx, label, o),
      h = 60 * u,
      iw = 22 * u,
      w = 24 * u + iw + 12 * u + tw + 26 * u;
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(k, k);
    ctx.save();
    ctx.shadowColor = "rgba(2,3,16,0.5)";
    ctx.shadowBlur = 24 * u * E.scale;
    ctx.shadowOffsetY = 10 * u * E.scale;
    box(
      ctx,
      -w / 2,
      -h / 2,
      w,
      h,
      h / 2,
      label === "Popular" ? C.accent : label === "New" ? C.accent2 : rgba(C.surface, 0.95),
    );
    ctx.restore();
    if (label === "Tonight") {
      rr(ctx, -w / 2, -h / 2, w, h, h / 2);
      ctx.strokeStyle = rgba(C.ink, 0.18);
      ctx.lineWidth = 2 * u;
      ctx.stroke();
    }
    const ix = -w / 2 + 24 * u + iw / 2;
    if (label === "Popular") star(ctx, ix, 0, iw * 0.55, C.ink);
    else if (label === "New") {
      circle(ctx, ix, 0, iw * 0.3, C.ground);
    } else {
      circle(ctx, ix, 0, iw * 0.46, C.accent2);
      circle(ctx, ix + iw * 0.22, -iw * 0.14, iw * 0.4, C.surface);
    }
    text(ctx, label, ix + iw / 2 + 12 * u, sz * 0.36, o);
    ctx.restore();
  };
  const star = (ctx: Ctx, x: number, y: number, r: number, col: string) => {
    ctx.beginPath();
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * TAU - Math.PI / 2,
        rad = k % 2 ? r * 0.36 : r;
      ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
    }
    ctx.closePath();
    ctx.fillStyle = col;
    ctx.fill();
  };
  // the hook is compressed: the mark forms by 0.7 s, ORIEL is out by 1 s, the headline starts before 2 s
  const K0 = tall ? 1.35 : 1.5; // the lockup's size while it forms (it shrinks to 0.6 at the top)
  const intro = (ctx: Ctx, F: number) => {
    const t = F / FPS;
    // two rings breathe round the forming mark, then dissolve outward
    const out = ease.outCubic(prog(F, 22, 54));
    if (out < 1)
      for (const [k, r0] of [
        [0, 150],
        [1, 250],
      ] as const) {
        const r = r0 * K0 * u * (1 + 0.03 * Math.sin(t * 3 + k * 1.3)) * (1 + out * (k ? 0.55 : 0.8)),
          a = (1 - out) * prog(F, k * 3, 8 + k * 3) * (k ? 0.35 : 0.55);
        ctx.beginPath();
        ctx.arc(cx, cy, r * lerp(0.8, 1, ease.outCubic(prog(F, 0, 16))), 0, TAU);
        ctx.strokeStyle = rgba(C.ink, a);
        ctx.lineWidth = 2.5 * u;
        ctx.stroke();
      }
    // a ping leaves the rings on every beat while the mark forms (the pad's pulse, made visible)
    for (let b = 0; b <= 45; b += 15) {
      const p = prog(F, b, b + 30);
      if (p <= 0 || p >= 1) continue;
      ctx.beginPath();
      ctx.arc(cx, cy, (90 + 620 * ease.outCubic(p)) * u, 0, TAU);
      ctx.strokeStyle = rgba(b % 30 ? C.accent2 : C.ink, 0.45 * (1 - p) ** 1.4);
      ctx.lineWidth = 3.5 * u;
      ctx.stroke();
    }
    // three dots orbit inside, then spiral in and gather into the mark
    const gather = ease.inOutCubic(prog(F, 6, 20));
    if (F < 22)
      for (let i = 0; i < 3; i++) {
        const ang = (i * TAU) / 3 + t * 3.2 + gather * 2.6,
          rad = lerp(96, 0, gather) * K0 * u,
          a = prog(F, i * 2, 5 + i * 2) * (1 - prog(F, 18, 22));
        ctx.save();
        ctx.globalAlpha *= a;
        circle(
          ctx,
          cx + Math.cos(ang) * rad,
          cy + Math.sin(ang) * rad,
          lerp(13, 17, gather) * K0 * u,
          [C.accent, C.accent2, C.ink][i]!,
        );
        ctx.restore();
      }
    // the lockup: forms (18–32), slides left as the name tracks out (24–56), rises to the top (44–62)
    const disc = spring((F - 18) / FPS, { freq: 2.6, damp: 0.5 }),
      arch = ease.outCubic(prog(F, 22, 32)),
      slide = ease.inOutCubic(prog(F, 24, 40)),
      track = lerp(0.02, 0.34, ease.outCubic(prog(F, 25, 56))),
      up = ease.inOutCubic(prog(F, 44, 62)),
      leave = ease.inCubic(prog(F, 160, 174));
    if (F >= 18 && leave < 1) {
      const y = lerp(cy, lockTop, up) - leave * 40 * u,
        k = lerp(K0, 0.6, up) * (1 + 0.012 * Math.sin(t * 1.8));
      ctx.save();
      ctx.globalAlpha *= 1 - leave;
      const lw = 2 * R0 + GAP + measure(ctx, NAME, nameO(0.34)),
        mx = lerp(cx, cx - lw / 2 + R0, slide);
      push(ctx, k, cx, cy);
      ctx.translate(0, (y - cy) / k);
      markAt(ctx, mx, cy, R0 * disc, arch);
      letters(ctx, NAME, mx + R0 + GAP, cy + 22 * u, nameO(track), (i) => prog(F, 25 + i * 2, 33 + i * 2), "fade");
      ctx.restore();
    }
    // the headline lands word by word; chips float round it on springs; the sub-line
    if (F >= 52 && F < 190) {
      const sz = fit(ctx, HEAD, 150 * u, W - 2 * safe.x - 40 * u),
        hy = tall ? cy - 40 * u : cy + 40 * u,
        gone = ease.inCubic(prog(F, 168, 184)),
        push0 = 1 + 0.02 * ease.outCubic(prog(F, 54, 80)) + 0.08 * prog(F, 66, 184);
      ctx.save();
      ctx.globalAlpha *= 1 - gone;
      ctx.translate(0, -gone * 60 * u);
      push(ctx, push0, cx, hy);
      headline(ctx, HEAD, cx, hy, sz, "center", (i) => rise(F, 54 + i * 6), { lh: 1.02 });
      const so: TextOpts = {
        size: (tall ? 42 : 40) * u,
        family: F_.sans,
        weight: 400,
        color: rgba(C.ink, 0.82),
        align: "center",
        track: -0.01,
      };
      const sa = rise(F, 84, 2.2, 0.9);
      SUB.forEach((s, i) => {
        const y0 = hy + (tall ? sz * 1.02 + 120 * u : 118 * u) + i * 58 * u;
        text(ctx, s, cx, y0 + (1 - sa) * 20 * u, { ...so, alpha: clamp(sa) });
      });
      ctx.restore();
      CHIPS.forEach((ch, i) => {
        const k = spring((F - ch.at) / FPS, { freq: 2.4, damp: 0.45 }),
          bob = Math.sin(t * 2.2 + i * 2.1) * 14 * u;
        floatChip(ctx, ch.label, ch.x, ch.y + bob - gone * 80 * u, ch.rot + 0.03 * Math.sin(t * 1.3 + i), k, 1 - gone);
      });
    }
  };

  // ---- 2 · the coverflow (180–330): seven cards slide in from the right, one step per beat
  const FL = tall
    ? { y: cy + 110 * u, s0: 1.45, s1: 0.84, g1: 450, g2: 230, yaw: 0.5, lift: 34 }
    : { y: cy + 80 * u, s0: 1.0, s1: 0.7, g1: 330, g2: 240, yaw: 0.55, lift: 26 };
  const flowPos = (F: number) => STEPS.reduce((s, at) => s + spring((F - at) / FPS, { freq: 2.2, damp: 0.74 }), 0);
  const tplOf = (j: number) => ((j % 8) + 8) % 8;
  const flowCard = (F: number, j: number) => {
    const enterAt = (G: number) =>
        (1 - spring((G - T.flow + 2 - Math.max(0, j + 4) * 1.6) / FPS, { freq: 1.15, damp: 1 })) * 7 - flowPos(G),
      d = j + enterAt(F),
      vel = Math.abs(enterAt(F + 0.5) - enterAt(F - 0.5)), // cards per frame
      ad = Math.abs(d),
      sg = Math.sign(d),
      m = Math.min(ad, 1);
    return {
      d,
      x: cx + sg * (FL.g1 * m + FL.g2 * Math.max(ad - 1, 0)) * u,
      y: FL.y - FL.lift * u * (1 - m) + (1 - m) * 6 * u * Math.sin((F / FPS) * 2),
      s: ad < 1 ? lerp(FL.s0, FL.s1, ease.outCubic(m)) : FL.s1 * (1 - 0.09 * (ad - 1)),
      yaw: sg * FL.yaw * ease.outCubic(m),
      a: 1 - prog(ad, 3.1, 3.9),
      // copy only on the settled centre card: none while it slides, none on the turned side cards
      ca: (1 - prog(ad, 0.08, 0.2)) * (1 - prog(vel, 0.02, 0.05)),
    };
  };
  const flow = (ctx: Ctx, F: number) => {
    const out = ease.inCubic(prog(F, 316, 332));
    const items: ({ j: number } & ReturnType<typeof flowCard>)[] = [];
    for (let j = -4; j <= 14; j++) {
      const c = flowCard(F, j);
      if (Math.abs(c.d) < 4) items.push({ j, ...c });
    }
    items.sort((p, q) => Math.abs(q.d) - Math.abs(p.d));
    ctx.save();
    push(ctx, 1 + 0.03 * ease.inOutCubic(prog(F, 180, 330)), cx, FL.y);
    for (const it of items) {
      const centre = it.j === 8;
      if (centre && F >= T.steps) continue; // the steps take the centre card from here
      persp(ctx, tplOf(it.j), it.x, it.y, it.s, it.yaw, it.a * (centre ? 1 : 1 - out), 0, it.ca);
    }
    ctx.restore();
    // the headline above counts the templates, then changes
    const sz = tall ? 112 * u : 100 * u,
      hy = tall ? safe.top + 110 * u : 200 * u,
      swap = ease.inCubic(prog(F, 256, 266)),
      gone = ease.inCubic(prog(F, 322, 334));
    const n = Math.round(lerp(8, 40, ease.outCubic(prog(Math.round(F), 184, 228))));
    ctx.save();
    ctx.globalAlpha *= 1 - gone;
    ctx.translate(0, -gone * 40 * u);
    if (swap < 1) {
      ctx.save();
      ctx.globalAlpha *= 1 - swap;
      ctx.translate(0, -swap * 30 * u);
      headline(ctx, [`+${n} *templates*`], cx, hy, sz, "center", (i) => rise(F, 184 + i * 6));
      ctx.restore();
    }
    headline(ctx, tall ? ["More every", "*week*."] : ["More every *week*."], cx, hy, sz, "center", (i) =>
      rise(F, 264 + i * 6),
    );
    ctx.restore();
  };

  // ---- 3 · Pick → Add → Done (330–480)
  const ST = tall
    ? {
        s: 0.64,
        pts: [
          [364 * u, 420 * u],
          [364 * u, 898 * u],
          [364 * u, 1376 * u],
        ] as [number, number][],
      }
    : {
        s: 0.9,
        pts: [
          [cx - 500 * u, cy + 20 * u],
          [cx, cy + 20 * u],
          [cx + 500 * u, cy + 20 * u],
        ] as [number, number][],
      };
  const HW = (CW / 2) * ST.s * u,
    HH = (CH / 2) * ST.s * u;
  const STEP_TXT: [string, string, number][] = [
    ["Pick", "a template", 332],
    ["Add", "your people", CUE.add],
    ["Done.", "in seconds", CUE.done],
  ];
  /** the connecting curve i (0: card 1 → 2, 1: card 2 → 3) as a cubic */
  const link = (i: number): [number, number][] => {
    const [ax, ay] = ST.pts[i]!,
      [bx, by] = ST.pts[i + 1]!;
    if (tall) {
      const y0 = ay + HH + 14 * u,
        y1 = by - HH - 14 * u,
        g = y1 - y0;
      return [
        [ax, y0],
        [ax - 110 * u, y0 + g * 0.4],
        [bx + 110 * u, y1 - g * 0.4],
        [bx, y1],
      ];
    }
    const x0 = ax + HW + 16 * u,
      x1 = bx - HW - 16 * u,
      g = x1 - x0;
    return [
      [x0, ay],
      [x0 + g * 0.4, ay - 70 * u],
      [x1 - g * 0.4, by + 70 * u],
      [x1, by],
    ];
  };
  const bez = (p: [number, number][], t: number): [number, number] => {
    const m = 1 - t;
    return [0, 1].map(
      (k) => m * m * m * p[0]![k]! + 3 * m * m * t * p[1]![k]! + 3 * m * t * t * p[2]![k]! + t * t * t * p[3]![k]!,
    ) as [number, number];
  };
  const drawLink = (ctx: Ctx, F: number, i: number, at: number) => {
    const p = link(i),
      d = ease.inOutCubic(prog(F, at, at + 18));
    if (d <= 0) return;
    ctx.beginPath();
    for (let k = 0; k <= 60 * d; k++) {
      const [x, y] = bez(p, k / 60);
      if (k) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    const [hx, hy] = bez(p, d);
    ctx.lineTo(hx, hy);
    ctx.strokeStyle = i === 1 ? rgba(C.accent, 0.85) : rgba(C.accent2, 0.75);
    ctx.lineWidth = 3.5 * u;
    ctx.lineCap = "round";
    ctx.stroke();
    // the travelling dot: at the head while it draws, then riding the line on a loop
    const ride = d < 1 ? d : ((F - at - 18) / 30) % 1,
      [dx, dy] = bez(p, ease.inOutCubic(ride)),
      col = i === 1 ? C.accent : C.accent2;
    circle(ctx, dx, dy, 14 * u, rgba(col, 0.25));
    circle(ctx, dx, dy, 7.5 * u, col);
  };
  const pointer = (ctx: Ctx, x: number, y: number, k: number, a: number) => {
    if (a <= 0) return;
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.translate(x, y);
    ctx.scale(k * 1.5 * u, k * 1.5 * u);
    ctx.beginPath();
    for (const [px, py] of [
      [0, 0],
      [0, 34],
      [9, 26],
      [15, 40],
      [21, 37],
      [15, 24],
      [26, 24],
    ] as const)
      ctx.lineTo(px, py);
    ctx.closePath();
    ctx.fillStyle = C.ink;
    ctx.fill();
    ctx.strokeStyle = C.ground;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    ctx.stroke();
    ctx.restore();
  };
  const addCard = (ctx: Ctx, F: number, x: number, y: number, s: number, rot: number) => {
    ctx.save();
    liveCard(ctx, x, y, s, rot);
    const cols = [C.accent2, C.accent, C.ink],
      init = ["A", "M", "J"];
    for (let k = 0; k < 3; k++) {
      const p = spring((F - (CUE.add + 6 + k * 6)) / FPS, { freq: 2.6, damp: 0.5 });
      if (p <= 0.01) continue;
      const ax = 186 - 88 + k * 88 + 14,
        ay = 174 + 14;
      ctx.save();
      ctx.translate(ax, ay);
      ctx.scale(p, p);
      circle(ctx, 0, 0, 70, C.line);
      circle(ctx, 0, 0, 62, cols[k]!);
      sharp(ctx, (c) =>
        gtext(c, init[k]!, 0, 18, { size: 52, family: F_.sans, weight: 600, color: C.ground, align: "center" }),
      );
      ctx.restore();
    }
    // the pill: 3 people added
    const pp = spring((F - CUE.pill) / FPS, { freq: 2.4, damp: 0.6 });
    if (pp > 0.01) {
      const o: TextOpts = { size: 36, family: F_.sans, weight: 600, color: C.ground, track: -0.02 },
        tw = measure(ctx, "3 people added", o),
        w = 30 + 34 + 12 + tw + 30,
        h = 66;
      ctx.save();
      ctx.translate(200, 350);
      ctx.scale(pp, pp);
      box(ctx, -w / 2, -h / 2, w, h, h / 2, C.accent2);
      check(ctx, -w / 2 + 30 + 17, 2, 26, prog(F, CUE.pill + 4, CUE.pill + 14), C.ground, 6);
      sharp(ctx, (c) => gtext(c, "3 people added", -w / 2 + 30 + 34 + 12, 13, o));
      ctx.restore();
    }
    sharp(ctx, (c) => {
      gtext(c, "Coffee chat", 30, 474, TITLE);
      gtext(c, "3 people · this week", 30, 518, META);
    });
    ctx.restore();
  };
  const doneCard = (ctx: Ctx, F: number, x: number, y: number, s: number, rot: number) => {
    ctx.save();
    liveCard(ctx, x, y, s, rot);
    const t = F / FPS;
    ["M", "T", "W", "T", "F"].forEach((d, k) =>
      sharp(ctx, (c) =>
        gtext(c, d, 14 + 42 + k * 72, 74, {
          size: 36,
          family: F_.sans,
          weight: 600,
          color: k === 3 ? C.accent : C.muted,
          align: "center",
        }),
      ),
    );
    const lit = spring((F - (CUE.done + 6)) / FPS, { freq: 2.6, damp: 0.5 });
    for (let col = 0; col < 5; col++)
      for (let row = 0; row < 4; row++) {
        const bx = 14 + 16 + col * 72,
          by = 100 + row * 74,
          on = col === 3 && row === 1;
        box(ctx, bx, by, 60, 62, 12, rgba(C.ink, 0.09));
        if (on && lit > 0.01) {
          ctx.save();
          ctx.translate(bx + 30, by + 31);
          const pulse = 1 + 0.06 * Math.sin(t * 5);
          ctx.beginPath();
          ctx.arc(0, 0, 50 * pulse, 0, TAU);
          ctx.strokeStyle = rgba(C.accent, 0.35 * clamp(lit));
          ctx.lineWidth = 4;
          ctx.stroke();
          ctx.scale(lit, lit);
          box(ctx, -30, -31, 60, 62, 12, C.accent);
          check(ctx, 0, 1, 26, prog(F, CUE.done + 10, CUE.done + 20), C.ink, 6);
          ctx.restore();
        }
      }
    sharp(ctx, (c) => {
      gtext(c, "Thu · 2:00 PM", 30, 474, TITLE);
      gtext(c, "Everyone's free", 30, 518, META);
    });
    ctx.restore();
  };
  const sparks = (ctx: Ctx, F: number, x: number, y: number) => {
    const p = prog(F, CUE.done + 2, CUE.done + 26),
      t = F / FPS;
    if (p > 0 && p < 1)
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * TAU + 0.2;
        // the heading and label sit above and below (landscape) or to the right (vertical): no rays there
        if (tall ? Math.cos(a) > 0.3 : Math.abs(Math.sin(a)) > 0.7) continue;
        const e = ease.outCubic(p),
          r0 = 1 + 0.18 * e,
          len = (1 - p) * 46 * u,
          ex = Math.cos(a),
          ey = Math.sin(a),
          sx = x + ex * (HW + 18 * u) * r0 + ex * e * 40 * u,
          sy = y + ey * (HH + 18 * u) * r0 + ey * e * 40 * u;
        stroke(ctx, [C.accent, C.accent2, C.ink][k % 3]!, 5 * u, [
          [sx, sy],
          [sx + ex * len, sy + ey * len],
        ]);
      }
    // four little stars keep twinkling on the finished card
    const on = prog(F, CUE.done + 8, CUE.done + 20);
    if (on > 0)
      (
        [
          [-1.08, -0.8],
          [1.12, -0.35],
          [-1.1, 0.55],
          [1.05, 0.9],
        ] as const
      ).forEach(([kx, ky], k) => {
        const tw = 0.55 + 0.45 * Math.sin(t * 4 + k * 1.7);
        ctx.save();
        ctx.globalAlpha *= on;
        star(ctx, x + kx * HW, y + ky * HH, 13 * u * tw * on, k % 2 ? C.accent2 : C.ink);
        ctx.restore();
      });
  };
  const steps = (ctx: Ctx, F: number) => {
    const t = F / FPS,
      gone = 0;
    ctx.save();
    ctx.globalAlpha *= 1 - gone;
    push(ctx, 1 + 0.01 * ease.outCubic(prog(F, 330, 350)) + 0.04 * prog(F, 340, 480) + gone * 0.12);
    const bob = (k: number) => Math.sin(t * 1.8 + k * 1.9) * 7 * u;
    // the links first, under the cards
    drawLink(ctx, F, 0, CUE.line1);
    drawLink(ctx, F, 1, CUE.line2);
    // card 1: the coverflow's centre card flies in to become the template being picked
    const mv = ease.inOutCubic(prog(F, T.steps, T.steps + 18)),
      c0 = flowCard(T.steps, 8),
      [px, py] = ST.pts[0]!,
      tap = 1 - 0.05 * Math.sin(Math.PI * prog(F, CUE.tap - 2, CUE.tap + 8));
    const x1 = lerp(c0.x, px, mv),
      y1 = lerp(c0.y, py + bob(0), mv),
      s1 = lerp(c0.s, ST.s, mv) * tap;
    put(ctx, tplOf(8), x1, y1, s1, lerp(0, -0.02, mv));
    // the check pops on its corner
    const ck = spring((F - CUE.check) / FPS, { freq: 2.8, damp: 0.45 });
    if (ck > 0.01) {
      const bx = x1 + HW - 6 * u,
        by = y1 - HH + 6 * u;
      ctx.save();
      ctx.translate(bx, by);
      ctx.scale(ck, ck);
      circle(ctx, 0, 0, 30 * u, C.ground);
      circle(ctx, 0, 0, 25 * u, C.accent);
      check(ctx, 0, 1 * u, 22 * u, prog(F, CUE.check + 2, CUE.check + 10), C.ink, 5 * u);
      ctx.restore();
    }
    // the pointer comes in, taps, leaves
    const inP = ease.inOutCubic(prog(F, 338, 356)),
      outP = ease.inCubic(prog(F, 372, 388)),
      tx = px + 30 * u,
      ty = py + 20 * u;
    pointer(
      ctx,
      lerp(tx + 300 * u, tx, inP) + outP * 140 * u,
      lerp(ty + 340 * u, ty, inP) + outP * 200 * u,
      1 - 0.16 * Math.sin(Math.PI * prog(F, CUE.tap - 3, CUE.tap + 5)),
      prog(F, 338, 346) * (1 - outP),
    );
    const rip = prog(F, CUE.tap, CUE.tap + 16);
    if (rip > 0 && rip < 1) {
      ctx.beginPath();
      ctx.arc(tx, ty, (12 + 60 * ease.outCubic(rip)) * u, 0, TAU);
      ctx.strokeStyle = rgba(C.ink, 0.6 * (1 - rip));
      ctx.lineWidth = 3 * u;
      ctx.stroke();
    }
    // cards 2 and 3 spring in as their links arrive
    const cardIn = (at: number) => spring((F - at) / FPS, { freq: 2.2, damp: 0.62 });
    const k2 = cardIn(CUE.add),
      k3 = cardIn(CUE.done);
    if (k2 > 0.01) {
      const [x, y] = ST.pts[1]!;
      ctx.save();
      ctx.globalAlpha *= clamp(k2 * 2);
      addCard(ctx, F, x, y + bob(1) + (1 - k2) * 40 * u, ST.s * lerp(0.7, 1, k2), 0.015);
      ctx.restore();
    }
    if (k3 > 0.01) {
      const [x, y] = ST.pts[2]!;
      ctx.save();
      ctx.globalAlpha *= clamp(k3 * 2);
      doneCard(ctx, F, x, y + bob(2) + (1 - k3) * 40 * u, ST.s * lerp(0.7, 1, k3), -0.015);
      ctx.restore();
      sparks(ctx, F, x, y + bob(2));
    }
    // headings and labels
    STEP_TXT.forEach(([h, lab, at], i) => {
      const [x, y] = ST.pts[i]!,
        p = rise(F, at),
        q = rise(F, at + 8, 2.2, 0.9),
        col = i === 2 ? C.accent : C.ink;
      if (p <= 0.001) return;
      if (tall) {
        const tx0 = x + HW + 56 * u;
        headline(ctx, [h], tx0, y + 8 * u, 104 * u, "left", () => p, { color: col });
        text(ctx, lab, tx0 + 4 * u, y + 66 * u + (1 - q) * 14 * u, {
          size: 38 * u,
          family: F_.sans,
          weight: 400,
          color: C.muted,
          alpha: clamp(q),
        });
      } else {
        headline(ctx, [h], x, y - HH - 46 * u, 84 * u, "center", () => p, { color: col });
        text(ctx, lab, x, y + HH + 62 * u + (1 - q) * 14 * u, {
          size: 40 * u,
          family: F_.sans,
          weight: 400,
          color: rgba(C.ink, 0.66),
          align: "center",
          alpha: clamp(q),
        });
      }
    });
    ctx.restore();
  };

  // ---- 4 · word slams over the card cloud (480–600)
  const cloudAt = (F: number, cl: (typeof CLOUD)[number], i: number) => {
    const t = F / FPS,
      sc = spring((F - (CUE.slam1 - 3) - cl.z * 8) / FPS, { freq: 1.5, damp: 0.78 }),
      swirl = 1.1 * ease.inOutCubic(prog(F, 526, 552)) * (1 - cl.z * 0.35) + t * 0.035,
      pull = 1 - 0.22 * Math.sin(Math.PI * prog(F, 526, 556)),
      sx = tall ? W * 0.62 : W * 0.54,
      sy = tall ? H * 0.5 : H * 0.56;
    const ca = Math.cos(swirl),
      sa = Math.sin(swirl),
      nx = cl.x * ca - cl.y * sa,
      ny = cl.x * sa + cl.y * ca;
    return {
      x: cx + nx * sx * sc * pull + Math.sin(t * 0.5 + cl.ph) * 22 * u * (1 - cl.z),
      y: cy + ny * sy * sc * pull + Math.cos(t * 0.42 + cl.ph * 1.3) * 18 * u * (1 - cl.z),
      s: lerp(tall ? 0.95 : 0.9, 0.3, cl.z) * lerp(0.4, 1, sc),
      rot: cl.rot + (1 - sc) * 1.4 + 0.05 * Math.sin(t * 0.7 + i),
    };
  };
  const cloud = (ctx: Ctx, F: number, a: number, extraBlur = 1) => {
    const bands: [number, number, number][] = [
      [0.62, 1.01, 7],
      [0.3, 0.62, 3],
      [0, 0.3, 1],
    ];
    for (const [z0, z1, d] of bands)
      soft(ctx, d * extraBlur, a * (d > 5 ? 0.75 : 1), (c) => {
        CLOUD.forEach((cl, i) => {
          if (cl.z < z0 || cl.z >= z1) return;
          const p = cloudAt(F, cl, i);
          put(c, cl.tpl, p.x, p.y, p.s, p.rot, 1, false);
        });
      });
  };
  const slamWord = (ctx: Ctx, F: number, lines: string[], at: number, until: number, maxSz: number) => {
    if (F < at) return;
    const moving = F - at < 16 || F > until - 12;
    zoomed(ctx, F, moving, (c, G) => slamAt(c, G, lines, at, until, maxSz));
  };
  const slamAt = (ctx: Ctx, F: number, lines: string[], at: number, until: number, maxSz: number) => {
    const f = F - at;
    if (f < 0) return;
    const k0 = spring(f / FPS, { freq: 3.1, damp: 0.58 }),
      out = ease.inCubic(prog(F, until - 10, until)),
      sz = fit(ctx, lines, maxSz, W - 2 * safe.x - 20 * u),
      lh = 1.02,
      y0 = cy - ((lines.length - 1) * sz * lh) / 2 + sz * 0.36,
      k = (1 + 2.4 * (1 - k0)) * (1 + 0.045 * ease.outCubic(prog(F, at + 6, until))) * (1 + out * 0.5);
    ctx.save();
    ctx.globalAlpha *= prog(f, 0, 3) * (1 - out);
    push(ctx, k, cx, cy);
    ctx.shadowColor = "rgba(2,3,16,0.7)";
    ctx.shadowBlur = 40 * u * E.scale;
    ctx.shadowOffsetY = 8 * u * E.scale;
    headline(ctx, lines, cx, y0, sz, "center", () => 1, { lh });
    ctx.restore();
  };
  const slams = (ctx: Ctx, F: number) => {
    cloud(ctx, F, 1);
    pool(ctx, (tall ? 620 : 760) * u, 0.55);
    slamWord(ctx, F, tall ? ["No back-", "and-forth."] : ["No back-and-forth."], CUE.slam1, 534, 170 * u);
    slamWord(ctx, F, tall ? ["Just", "*ask*."] : ["Just *ask*."], CUE.slam2, 600, tall ? 230 * u : 220 * u);
  };

  /** type that moves too fast for the shutter's few samples: n sharp sub-frames averaged ("lighter" adds
   * premultiplied colour, so the average is exact) in a scratch layer, then composited once. Deferred like card copy. */
  const zoomed = (ctx: Ctx, F: number, moving: boolean, draw: (c: Ctx, G: number) => void) => {
    const run = (c: Ctx, G: number) => {
      if (!moving) return draw(c, G);
      const Z = scratch("zoom"),
        z = Z.ctx,
        n = 14,
        M = c.getTransform();
      z.setTransform(1, 0, 0, 1, 0, 0);
      z.globalAlpha = 1;
      z.globalCompositeOperation = "source-over";
      z.clearRect(0, 0, Z.canvas.width, Z.canvas.height);
      z.globalCompositeOperation = "lighter";
      for (let j = 0; j < n; j++) {
        z.save();
        z.setTransform(M);
        z.globalAlpha = 1 / n;
        draw(z, G + (j / (n - 1) - 0.5) * 0.5);
        z.restore();
      }
      z.globalCompositeOperation = "source-over";
      c.save();
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.drawImage(Z.canvas, 0, 0);
      c.restore();
    };
    if (!REC && !SKIP) return run(ctx, F);
    if (REC) {
      const G = F - CUR_DT;
      REC.push({ M: ctx.getTransform(), a: ctx.globalAlpha, fn: (c) => run(c, G) });
    }
  };
  /** a soft pool of the ground behind words keeps them readable over the cards */
  const pool = (ctx: Ctx, r: number, a: number) => {
    if (a <= 0) return;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, rgba(C.ground, a));
    g.addColorStop(0.6, rgba(C.ground, a * 0.6));
    g.addColorStop(1, rgba(C.ground, 0));
    ctx.save();
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  };
  // ---- the wall: a tilted grid of cards (the depth-of-field pull and the end card's backdrop)
  const wall = (ctx: Ctx, F: number, s: number, rot: number, drift: [number, number], seed: number) => {
    const px = (CW + 36) * s * u,
      py = (CH + 36) * s * u,
      cols = Math.ceil((tall ? H : W) / px) + 3,
      rows = Math.ceil((tall ? H : W) / py) + 3,
      t = F / FPS;
    ctx.save();
    ctx.translate(cx + drift[0] * t * u, cy + drift[1] * t * u);
    ctx.rotate(rot);
    for (let i = -Math.ceil(cols / 2); i <= Math.ceil(cols / 2); i++)
      for (let j = -Math.ceil(rows / 2); j <= Math.ceil(rows / 2); j++) {
        const off = (i & 1 ? py / 2 : 0) - py / 4;
        put(ctx, (((i * 3 + j * 5 + seed) % 9) + 9) % 9, i * px, j * py + off, s);
      }
    ctx.restore();
  };

  // ---- 5 · the depth-of-field pull (600–720)
  const DOF = tall
    ? { x: cx, y: cy + 215 * u, s: 1.3, yaw: 0 }
    : { x: cx + 450 * u, y: cy + 10 * u, s: 1.15, yaw: -0.2 };
  const DOF_HEAD = tall ? ["That meeting,", "with *everyone*", "in it."] : ["That meeting,", "with *everyone* in it."];
  const dof = (ctx: Ctx, F: number) => {
    const t = F / FPS,
      inA = 1,
      outA = 1,
      blurD = lerp(2.5, 22, ease.inOutCubic(prog(F, 602, 628))); // the cut lands on a sharp wall, then it pulls
    // the whole wall, heavily out of focus
    soft(ctx, blurD, inA * outA, (c) => {
      c.save();
      push(c, 1.08 + 0.12 * prog(F, 600, 720));
      wall(c, F, 0.72, -0.1, [-44, -18], 2);
      c.restore();
    });
    ctx.save();
    ctx.globalAlpha *= inA * outA * 0.42;
    ctx.fillStyle = C.ground;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    // one card racks into focus, tilting gently
    const k = spring((F - 604) / FPS, { freq: 1.6, damp: 0.8 }),
      rack = lerp(12, 1, ease.inOutCubic(prog(F, 606, 642))),
      y = DOF.y + (1 - k) * 90 * u,
      s = DOF.s * lerp(0.9, 1, k) * (1 + 0.09 * prog(F, 610, 720)),
      yaw = DOF.yaw + 0.07 * Math.sin(t * 0.9),
      rot = 0.035 * Math.sin(t * 0.7) - 0.02;
    soft(ctx, rack, clamp(k * 1.5) * outA, (c) => persp(c, 8, DOF.x, y, s, yaw, 1, rot));
    // the headline builds beside (or above) it
    const maxW = tall ? W - 2 * safe.x : DOF.x - (CW / 2) * DOF.s * u - 90 * u - (safe.x + 40 * u),
      sz = fit(ctx, DOF_HEAD, tall ? 112 * u : 96 * u, maxW),
      hx = tall ? cx : safe.x + 40 * u,
      hy = tall ? safe.top + 110 * u : cy - 20 * u;
    ctx.save();
    ctx.globalAlpha *= outA;
    ctx.translate(0, -(1 - outA) * 30 * u);
    push(ctx, 1 + 0.06 * prog(F, 614, 720), hx, hy);
    headline(ctx, DOF_HEAD, hx, hy, sz, tall ? "center" : "left", (i) =>
      rise(F, i < 2 ? 614 + i * 6 : 644 + (i - 2) * 6),
    );
    ctx.restore();
  };

  // ---- 6 · four feature tiles (720–810)
  const TILES: [string, string][] = [
    ["Private by default", "Your calendar stays yours"],
    ["Only you see it", "No shared feed"],
    ["Nothing to install", "Works in the browser"],
    ["Cancel anytime", "Keep what you booked"],
  ];
  const TL = tall
    ? { w: 440, h: 340, gap: 40, head: ["Yours, and", "only *yours*."], hy: safe.top + 150 * u, top: 660 * u }
    : { w: (W / u - 160 - 72) / 4, h: 380, gap: 24, head: ["Yours, and only *yours*."], hy: 250 * u, top: 330 * u };
  const IS = (tall ? 88 : 100) * u; // the icon square
  const icon = (ctx: Ctx, k: number, x: number, y: number) => {
    const s = IS;
    box(ctx, x, y, s, s, s * 0.26, C.accent);
    ctx.save();
    ctx.translate(x + s / 2, y + s / 2);
    ctx.scale(s / 61, s / 61);
    ctx.strokeStyle = C.ink;
    ctx.fillStyle = C.ink;
    ctx.lineWidth = 4.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (k === 0) {
      box(ctx, -14, -3, 28, 22, 5, C.ink);
      ctx.beginPath();
      ctx.arc(0, -4, 9, Math.PI, 0);
      ctx.stroke();
    } else if (k === 1) {
      ctx.beginPath();
      ctx.moveTo(-18, 0);
      ctx.quadraticCurveTo(0, -18, 18, 0);
      ctx.quadraticCurveTo(0, 18, -18, 0);
      ctx.stroke();
      circle(ctx, 0, 0, 5.5, C.ink);
      stroke(ctx, C.ink, 4.5, [
        [-15, 15],
        [15, -15],
      ]);
    } else if (k === 2) {
      rr(ctx, -18, -14, 36, 28, 5);
      ctx.stroke();
      stroke(ctx, C.ink, 4, [
        [-18, -5],
        [18, -5],
      ]);
      circle(ctx, -12, -9.5, 1.8, C.ink);
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, 13, -0.4 * Math.PI, 1.3 * Math.PI);
      ctx.stroke();
      polyFill(ctx, C.ink, [
        [4, -20],
        [4, -6],
        [-8, -13],
      ]);
    }
    ctx.restore();
  };
  const tiles = (ctx: Ctx, F: number) => {
    const t = F / FPS,
      inA = 1,
      out = 0;
    ctx.save();
    ctx.globalAlpha *= inA * (1 - out);
    push(ctx, 1 + 0.035 * ease.outCubic(prog(F, 720, 810)) + out * 0.06);
    const sz = fit(ctx, TL.head, tall ? 116 * u : 112 * u, W - 2 * safe.x);
    headline(ctx, TL.head, cx, TL.hy, sz, "center", (i) => rise(F, 718 + i * 5));
    const w = TL.w * u,
      h = TL.h * u,
      g = TL.gap * u,
      per = tall ? 2 : 4,
      x0 = cx - (per * w + (per - 1) * g) / 2;
    TILES.forEach(([bold, small], k) => {
      const col = k % per,
        row = Math.floor(k / per),
        x = x0 + col * (w + g),
        y = TL.top + row * (h + g) + Math.sin(t * 1.5 + k * 1.3) * 4 * u,
        ghost = prog(F, 716 + k * 2, 724 + k * 2),
        fill = spring((F - CUE.tiles[k]!) / FPS, { freq: 2.4, damp: 0.6 });
      // an empty outline waits; on its beat the tile fills in
      rr(ctx, x, y, w, h, 28 * u);
      ctx.strokeStyle = rgba(C.ink, 0.14 * ghost);
      ctx.lineWidth = 2 * u;
      ctx.setLineDash([10 * u, 10 * u]);
      ctx.stroke();
      ctx.setLineDash([]);
      if (fill <= 0.01) return;
      ctx.save();
      ctx.globalAlpha *= clamp(fill * 1.6);
      ctx.translate(x + w / 2, y + h / 2);
      ctx.scale(lerp(0.9, 1, fill), lerp(0.9, 1, fill));
      ctx.translate(-(x + w / 2), -(y + h / 2));
      ctx.save();
      ctx.shadowColor = "rgba(2,3,16,0.45)";
      ctx.shadowBlur = 30 * u * E.scale;
      ctx.shadowOffsetY = 14 * u * E.scale;
      box(ctx, x, y, w, h, 28 * u, rgba(C.surface, 0.82));
      ctx.restore();
      rr(ctx, x, y, w, h, 28 * u);
      ctx.strokeStyle = rgba(C.ink, 0.13);
      ctx.lineWidth = 2 * u;
      ctx.stroke();
      box(ctx, x + 28 * u, y + 1.5 * u, w - 56 * u, 1.5 * u, 0, rgba(C.ink, 0.12)); // the glass's top edge catches light
      const pad = 34 * u;
      icon(ctx, k, x + pad, y + pad);
      const bo: TextOpts = { size: (tall ? 36 : 40) * u, family: F_.sans, weight: 600, color: C.ink, track: -0.02 },
        so: TextOpts = { size: (tall ? 29 : 30) * u, family: F_.sans, weight: 400, color: rgba(C.ink, 0.62) },
        bl = wrap(ctx, bold, w - 2 * pad, bo),
        sl = wrap(ctx, small, w - 2 * pad, so);
      let by = y + pad + IS + (tall ? 58 : 66) * u;
      for (const l of bl) {
        text(ctx, l, x + pad, by, bo);
        by += bo.size * 1.25;
      }
      by += (tall ? 8 : 2) * u;
      for (const l of sl) {
        text(ctx, l, x + pad, by, so);
        by += so.size * 1.35;
      }
      ctx.restore();
    });
    // the line under them
    const la = rise(F, 795, 2.2, 0.9),
      lines = tall
        ? ["Free to start.", "Pay only when your team *grows*."]
        : ["Free to start. Pay only when your team *grows*."],
      ly = TL.top + (tall ? 2 * h + g : h) + (tall ? 110 : 104) * u;
    ctx.save();
    ctx.globalAlpha *= clamp(la);
    ctx.translate(0, (1 - la) * 16 * u);
    lines.forEach((l, i) =>
      headline(ctx, [l], cx, ly + i * 52 * u, (tall ? 38 : 42) * u, "center", () => 1, { color: rgba(C.ink, 0.85) }),
    );
    ctx.restore();
    ctx.restore();
  };

  // ---- 7 · the end card (810–900): the wall faded behind, the mark, the headline, the call to action
  const endCard = (ctx: Ctx, F: number) => {
    const inA = 1,
      k = 1 + 0.07 * ease.inOutCubic(prog(F, 810, 900));
    ctx.save();
    push(ctx, k);
    soft(ctx, 1.6, 0.25 * inA, (c) => wall(c, F, 0.56, -0.12, [-16, -10], 5));
    pool(ctx, tall ? 640 * u : 820 * u, 0.6 * inA);
    const ly = tall ? cy - 330 * u : cy - 190 * u,
      hs = fit(ctx, HEAD, 150 * u, W - 2 * safe.x - 40 * u),
      hy = tall ? cy - 60 * u : cy + 50 * u,
      m = spring((F - 809) / FPS, { freq: 2.4, damp: 0.6 });
    ctx.save();
    ctx.globalAlpha *= clamp(m * 1.6);
    lockup(ctx, cx, ly, 0.78 * lerp(0.6, 1, m), 0.34, (i) => prog(F, 811 + i * 2, 819 + i * 2));
    ctx.restore();
    headline(ctx, HEAD, cx, hy, hs, "center", (i) => rise(F, 814 + i * 5), { lh: 1.02 });
    // the pill
    const pp = spring((F - 836) / FPS, { freq: 2.4, damp: 0.55 });
    if (pp > 0.01) {
      const o: TextOpts = { size: 40 * u, family: F_.sans, weight: 600, color: C.ink, track: -0.015 },
        label = "Start free at oriel.example",
        tw = measure(ctx, label, o),
        ph = 96 * u,
        pw = tw + 44 * u * 2 + 40 * u,
        py = tall ? H - safe.bottom - ph / 2 - 30 * u : cy + 210 * u;
      ctx.save();
      ctx.globalAlpha *= clamp(pp * 2);
      ctx.translate(cx, py);
      ctx.scale(lerp(0.6, 1, pp), lerp(0.6, 1, pp));
      ctx.save();
      ctx.shadowColor = rgba(C.accent, 0.35);
      ctx.shadowBlur = 40 * u * E.scale;
      ctx.shadowOffsetY = 12 * u * E.scale;
      box(ctx, -pw / 2, -ph / 2, pw, ph, ph / 2, C.accent);
      ctx.restore();
      text(ctx, label, -pw / 2 + 44 * u, o.size * 0.36, o);
      const ax = pw / 2 - 44 * u - 16 * u,
        nudge = 4 * u * Math.sin((F / FPS) * 4);
      stroke(ctx, C.ink, 4 * u, [
        [ax - 14 * u + nudge, 0],
        [ax + 12 * u + nudge, 0],
      ]);
      stroke(ctx, C.ink, 4 * u, [
        [ax + 2 * u + nudge, -10 * u],
        [ax + 13 * u + nudge, 0],
        [ax + 2 * u + nudge, 10 * u],
      ]);
      ctx.restore();
    }
    ctx.restore();
  };

  const paint = (ctx: Ctx, env: Env, F: number) => {
    E = env;
    F = clamp(F, 0, N - 1);
    ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
    ctx.globalAlpha = 1;
    ground(ctx, F);
    if (F < 190) intro(ctx, F);
    if (F >= 176 && F < 342) flow(ctx, F);
    if (F >= T.steps && F < T.slam) steps(ctx, F);
    if (F >= T.slam && F < T.dof) slams(ctx, F);
    if (F >= T.dof && F < T.tiles) dof(ctx, F);
    if (F >= T.tiles && F < T.end) tiles(ctx, F);
    if (F >= T.end) endCard(ctx, F);
  };

  const cuts = [T.mark, T.head, T.flow, T.steps, T.slam, T.dof, T.tiles, T.end, N],
    names = ["mark", "headline", "coverflow", "steps", "slams", "focus", "tiles", "endcard"],
    base = [3, 3, 6, 4, 4, 3, 3, 2],
    samplesAt = (F: number, i: number) =>
      (F >= 180 && F < 214) || (F >= 472 && F < 494) || (F >= 528 && F < 556)
        ? 12
        : (F >= 40 && F < 66) || (F >= 330 && F < 350)
          ? 8
          : base[i]!;
  const shots: Shot[] = names.map((sid, i) => ({
    id: sid,
    start: cuts[i]!,
    end: cuts[i + 1]!,
    draw: (ctx, local, env) => {
      const n = samplesAt(cuts[i]! + local, i),
        mid = n > 1 ? (Math.floor(n / 2) / (n - 1) - 0.5) * 0.5 : 0, // the same expression motionBlur uses
        rec: Deferred[] = [];
      motionBlur(
        ctx,
        env,
        (c, dt) => {
          REC = dt === mid ? rec : null;
          SKIP = !REC;
          CUR_DT = dt;
          paint(c, env, clamp(cuts[i]! + local + dt, cuts[i]!, cuts[i + 1]! - 0.001));
        },
        { samples: n, shutter: 0.5 },
      );
      REC = null;
      SKIP = false;
      CUR_DT = 0;
      for (const r of rec) {
        ctx.save();
        ctx.setTransform(r.M);
        ctx.globalAlpha = r.a;
        r.fn(ctx);
        ctx.restore();
      }
    },
  }));
  return {
    meta: { title: id, W, H, fps: FPS, bpm: BPM, durationFrames: N, raster: "cpu" },
    assets: { images: {}, fonts: P.assets },
    shots,
    audio: beatScore({
      frames: N,
      fps: FPS,
      bpm: BPM,
      mood: "drive",
      drop: T.flow,
      hits: [CUE.done, CUE.slam1 + 4, CUE.slam2 + 4],
      whooshes: [T.flow, CUE.slam1, CUE.slam2],
      ticks: [...STEPS, CUE.check, ...CUE.tiles],
      sign: 840,
      gain: 0.69,
    }),
  };
}

export const cardWall = make("landscape", "cardWall");
export const cardWallVertical = make("vertical", "cardWallVertical");
