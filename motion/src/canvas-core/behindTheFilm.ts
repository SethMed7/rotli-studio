// BEHIND THE FILM: a 7-slide carousel (1080x1350) that follows the 60-second film post: how it was drawn in
// code, and where everything that made it lives. Film frames are re-rendered crisp via studio/reframe; every
// claim is checkable (the engine, the brief, the goldens and the studio are all public).
import type { Ctx, Env } from "./core";
import type { Film } from "./film";
import { rotliStory } from "./rotliStory";
import { C, FONT, fillRR, nightGround, text } from "./rotli/kit";
import { caption, lockup } from "./studio/brandmarks";
import { envGround } from "./studio/grounds";
import { reframe } from "./studio/reframe";
import { FONTS, FORMATS } from "./studio/stage";

const [W, H] = FORMATS["ig-portrait"],
  N = 7;
type Box = { x: number; y: number; w: number; h: number };
const FULL: Box = { x: 0, y: 0, w: 1920, h: 1080 };
/** a film frame in a rounded, inked frame; returns the bottom edge */
const framed = (ctx: Ctx, env: Env, f: number, crop: Box, x: number, y: number, w: number, dark = false) => {
  const h = (w * crop.h) / crop.w;
  fillRR(ctx, x - 3, y - 3, w + 6, h + 6, 21, dark ? C.nightBorder : C.ink);
  reframe(ctx, env, rotliStory, f, crop, { x, y, w, h, r: 18 });
  return y + h;
};
const head = (ctx: Ctx, l: number, title: string, sub: string[], dark = false, hi?: string) => {
  caption(ctx, [title], W / 2, 170, 1, l, { size: 72, color: dark ? C.nightText : C.cocoa, hi });
  sub.forEach((s, i) =>
    text(ctx, s, W / 2, 248 + i * 46, { size: 35, weight: 500, align: "center", color: dark ? C.nightMuted : C.muted }),
  );
};
const pageNo = (ctx: Ctx, n: number, dark = false) => {
  for (let i = 0; i < N; i++) {
    ctx.fillStyle = i === n ? C.clay : dark ? C.nightBorder : C.border;
    ctx.beginPath();
    ctx.arc(W / 2 + (i - (N - 1) / 2) * 30, H - 60, i === n ? 9 : 7, 0, 6.29);
    ctx.fill();
  }
};
/** a code card in the brand's night surface, one string per line (the first line is a comment) */
const code = (ctx: Ctx, x: number, y: number, w: number, lines: string[], size = 29) => {
  const lh = size * 1.5,
    h = 56 + lines.length * lh;
  fillRR(ctx, x, y, w, h, 20, C.night, C.ink, 3);
  lines.forEach((s, i) =>
    text(ctx, s, x + 36, y + 44 + size * 0.8 + i * lh, {
      size,
      font: FONT.mono,
      color: s.startsWith("//") ? C.nightMuted : i % 2 ? C.nightText : C.sky,
    }),
  );
  return y + h;
};
/** the film's own soundtrack drawn as a waveform (computed once: the score is code too) */
let wave: Float32Array | null = null;
const waveform = () => {
  if (wave) return wave;
  const [L] = rotliStory.audio!(8000),
    bins = 220,
    per = Math.floor(L.length / bins);
  wave = new Float32Array(bins);
  for (let b = 0; b < bins; b++) {
    let m = 0;
    for (let i = b * per; i < (b + 1) * per; i++) m = Math.max(m, Math.abs(L[i]!));
    wave[b] = m;
  }
  const top = Math.max(...wave) || 1;
  for (let b = 0; b < bins; b++) wave[b]! /= top;
  return wave;
};

const SLIDES: ((ctx: Ctx, l: number, env: Env) => void)[] = [
  // 1 · the cover: the film's sunset, full bleed
  (ctx, l, env) => {
    reframe(ctx, env, rotliStory, 1560, { x: 380, y: 0, w: 864, h: 1080 }, { x: 0, y: 0, w: W, h: H });
    fillRR(ctx, 80, 110, W - 160, 300, 32, C.surface, C.ink, 3);
    caption(ctx, ["How we drew a film", "in code."], W / 2, 210, 1, l, { size: 72, hi: "code" });
    text(ctx, "60 seconds · every frame a function", W / 2, 370, {
      size: 32,
      weight: 500,
      align: "center",
      color: C.muted,
    });
    fillRR(ctx, W - 250, H - 130, 190, 70, 35, C.surface, C.ink, 3);
    text(ctx, "swipe →", W - 155, H - 83, { size: 30, weight: 600, align: "center" });
  },
  // 2 · every frame is a function
  (ctx, l, env) => {
    envGround(ctx, l, "band", { w: W, h: H, field: false });
    head(
      ctx,
      l,
      "Every frame is a function.",
      ["No timeline, no keyframes in an app.", "Code draws frame 0 to frame 1799."],
      false,
      "function",
    );
    const y = code(ctx, 70, 390, W - 140, [
      "// the whole contract",
      "renderFrame(film, ctx, frame)",
      "// same frame in, same pixels out",
      "frame 900 → the Librarian at night",
    ]);
    // five frames from the film, labelled with their frame numbers: three over two
    [45, 470, 900, 1200, 1560].forEach((f, i) => {
      const row = i < 3 ? 0 : 1,
        col = row ? i - 3 : i,
        w = 296,
        x = row ? W / 2 - w - 12 + col * (w + 24) : 70 + col * (w + 24),
        b = framed(ctx, env, f, FULL, x, y + 60 + row * 250, w);
      text(ctx, `frame ${f}`, x + w / 2, b + 40, { size: 26, font: FONT.mono, align: "center", color: C.muted });
    });
    pageNo(ctx, 1);
  },
  // 3 · it starts with a brief
  (ctx, l, env) => {
    envGround(ctx, l, "base", { w: W, h: H, field: false });
    head(
      ctx,
      l,
      "It starts with a brief.",
      ["The story, the scenes, and every claim", "a caption is allowed to make."],
      false,
      "brief",
    );
    const y = code(ctx, 70, 390, W - 140, [
      "// the film, as data",
      '"story": "a quokka on Rottnest"',
      '"scenes": ["ferry", "just write",',
      '  "one folder", "the Librarian", …]',
      '"claims": "rotli.co wording only"',
    ]);
    framed(ctx, env, 45, FULL, 150, y + 60, W - 300);
    pageNo(ctx, 2);
  },
  // 4 · an agent draws it
  (ctx, l, env) => {
    nightGround(ctx, l, 7, W, H);
    head(
      ctx,
      l,
      "An agent draws it.",
      ["Claude Opus 5.5 wrote each scene in code", "on the open-source anidoodle engine."],
      true,
      "agent",
    );
    framed(ctx, env, 900, { x: 700, y: 120, w: 1220, h: 900 }, 70, 380, W - 140, true);
    fillRR(ctx, 110, 1030, W - 220, 110, 22, C.nightSurface, C.nightBorder, 2);
    text(ctx, "The prompts and agent runs are kept.", W / 2, 1098, {
      size: 34,
      weight: 600,
      align: "center",
      color: C.nightText,
    });
    pageNo(ctx, 3, true);
  },
  // 5 · checked frame by frame
  (ctx, l, env) => {
    envGround(ctx, l, "band", { w: W, h: H, field: false });
    head(
      ctx,
      l,
      "Checked frame by frame.",
      ["Contact sheets for the eye.", "Hashes for everything else."],
      false,
      "frame",
    );
    const frames = [60, 330, 470, 600, 760, 1050, 1200, 1380, 1700];
    frames.forEach((f, i) => framed(ctx, env, f, FULL, 70 + (i % 3) * 318, 380 + Math.floor(i / 3) * 190, 302));
    fillRR(ctx, 190, 985, W - 380, 96, 48, C.olive, C.ink, 3);
    text(ctx, "golden: SAME", W / 2, 1047, {
      size: 38,
      weight: 600,
      font: FONT.mono,
      align: "center",
      color: C.surface,
    });
    text(ctx, "If a pixel moves, the build says so.", W / 2, 1150, {
      size: 32,
      weight: 500,
      align: "center",
      color: C.muted,
    });
    pageNo(ctx, 4);
  },
  // 6 · the sound is code too
  (ctx, l, env) => {
    nightGround(ctx, l, 19, W, H);
    head(
      ctx,
      l,
      "The sound is code, too.",
      ["The music box and the waves", "are written sample by sample."],
      true,
      "code",
    );
    const w = waveform(),
      x0 = 90,
      bw = (W - 180) / w.length,
      mid = 640;
    for (let i = 0; i < w.length; i++) {
      const h = Math.max(3, w[i]! * 190);
      ctx.fillStyle = i % 11 === 0 ? C.clay : C.nightText;
      ctx.fillRect(x0 + i * bw, mid - h, Math.max(1.5, bw - 1.5), h * 2);
    }
    text(ctx, "0:00", x0, mid + 250, { size: 26, font: FONT.mono, color: C.nightMuted });
    text(ctx, "1:00", W - x0, mid + 250, { size: 26, font: FONT.mono, align: "right", color: C.nightMuted });
    framed(ctx, env, 1560, FULL, 250, 930, W - 500, true);
    pageNo(ctx, 5, true);
  },
  // 7 · all of it is open
  (ctx, l) => {
    envGround(ctx, l, "base", { w: W, h: H });
    caption(ctx, ["All of it is open."], W / 2, 250, 1, l, { size: 80, hi: "open" });
    ["The engine, the briefs, the prompts,", "the agent runs and every render."].forEach((s, i) =>
      text(ctx, s, W / 2, 330 + i * 46, { size: 35, weight: 500, align: "center", color: C.muted }),
    );
    fillRR(ctx, 150, 470, W - 300, 150, 30, C.surface, C.ink, 3);
    text(ctx, "studio.rotli.co", W / 2, 562, { size: 54, weight: 600, align: "center", color: C.cocoa });
    lockup(ctx, W / 2, 860, 1, l, { s: 0.85, url: true });
    pageNo(ctx, 6);
  },
];

export const behindTheFilm: Film = {
  meta: { title: "behindTheFilm", W, H, fps: 30, bpm: 120, durationFrames: SLIDES.length * 15, raster: "cpu" },
  assets: { images: {}, fonts: FONTS },
  shots: SLIDES.map((d, i) => ({
    id: `slide${i + 1}`,
    start: i * 15,
    end: i * 15 + 15,
    draw: (ctx: Ctx, l: number, env: Env) => {
      ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
      d(ctx, i * 15 + l, env);
    },
  })),
};
