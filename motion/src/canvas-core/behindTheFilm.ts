// BEHIND THE FILM: a 4-slide carousel (1080x1350; X takes at most four images) that follows the 60-second
// film post: how it was drawn in code, and where everything that made it lives. 1 the hook · 2 a brief, then an
// agent draws it · 3 checked to the pixel, scored sample by sample · 4 all of it is open. X crops a four-image
// post toward each image's centre, so every slide keeps its key line near the middle band (y≈405–945). Film
// frames are re-rendered crisp via studio/reframe; every claim is checkable (the engine, the brief, the goldens
// and the studio are all public).
import type { Ctx, Env } from "./core";
import type { Film } from "./film";
import { rotliStory } from "./rotliStory";
import { C, FONT, fillRR, nightGround, text } from "./rotli/kit";
import { caption, lockup } from "./studio/brandmarks";
import { envGround } from "./studio/grounds";
import { reframe } from "./studio/reframe";
import { FONTS, FORMATS } from "./studio/stage";

const [W, H] = FORMATS["ig-portrait"],
  N = 4;
type Box = { x: number; y: number; w: number; h: number };
const FULL: Box = { x: 0, y: 0, w: 1920, h: 1080 };
/** a film frame in a rounded, inked frame; returns the bottom edge */
const framed = (ctx: Ctx, env: Env, f: number, crop: Box, x: number, y: number, w: number, dark = false) => {
  const h = (w * crop.h) / crop.w;
  fillRR(ctx, x - 3, y - 3, w + 6, h + 6, 21, dark ? C.nightBorder : C.ink);
  reframe(ctx, env, rotliStory, f, crop, { x, y, w, h, r: 18 });
  return y + h;
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
  // 1 · the cover: the film's sunset, full bleed, the title in the middle band
  (ctx, l, env) => {
    reframe(ctx, env, rotliStory, 1560, { x: 380, y: 0, w: 864, h: 1080 }, { x: 0, y: 0, w: W, h: H });
    fillRR(ctx, 80, 420, W - 160, 280, 32, C.surface, C.ink, 3);
    caption(ctx, ["How we drew a film", "in code."], W / 2, 510, 1, l, { size: 72, hi: "code" });
    text(ctx, "60 seconds · every frame a function", W / 2, 665, {
      size: 32,
      weight: 500,
      align: "center",
      color: C.muted,
    });
    fillRR(ctx, W - 250, H - 130, 190, 70, 35, C.surface, C.ink, 3);
    text(ctx, "swipe →", W - 155, H - 83, { size: 30, weight: 600, align: "center" });
  },
  // 2 · a brief (the film as data) → an agent writes the scenes → the frame it draws
  (ctx, l, env) => {
    envGround(ctx, l, "band", { w: W, h: H, field: false });
    caption(ctx, ["It starts with a brief."], W / 2, 110, 1, l, { size: 56, hi: "brief" });
    code(ctx, 70, 150, W - 140, [
      "// the film, as data: story, scenes, claims",
      '"scenes": ["ferry", "just write", …]',
      '"claims": "rotli.co wording only"',
      "// every frame is a function",
      "renderFrame(film, ctx, frame)",
    ]);
    caption(ctx, ["An agent draws it."], W / 2, 532, 1, l, { size: 66, hi: "agent" });
    ["Claude Opus 5.5 wrote each scene in code", "on the open-source anidoodle engine."].forEach((s, i) =>
      text(ctx, s, W / 2, 596 + i * 44, { size: 34, weight: 500, align: "center", color: C.muted }),
    );
    framed(ctx, env, 900, FULL, 160, 690, W - 320);
    text(ctx, "The prompts and agent runs are kept.", W / 2, 1200, {
      size: 32,
      weight: 600,
      align: "center",
      color: C.cocoa,
    });
    pageNo(ctx, 1);
  },
  // 3 · checked to the pixel (light, top) and scored in code (night, bottom)
  (ctx, l, env) => {
    envGround(ctx, l, "band", { w: W, h: H, field: false });
    caption(ctx, ["Checked frame by frame."], W / 2, 105, 1, l, { size: 64, hi: "Checked" });
    text(ctx, "Contact sheets for the eye. Hashes for everything else.", W / 2, 162, {
      size: 32,
      weight: 500,
      align: "center",
      color: C.muted,
    });
    [60, 470, 760, 1050, 1330, 1700].forEach((f, i) =>
      framed(ctx, env, f, FULL, 72 + (i % 3) * 318, 200 + Math.floor(i / 3) * 187, 300),
    );
    fillRR(ctx, 220, 585, W - 440, 90, 45, C.olive, C.ink, 3);
    text(ctx, "golden: SAME", W / 2, 644, {
      size: 38,
      weight: 600,
      font: FONT.mono,
      align: "center",
      color: C.surface,
    });
    text(ctx, "If a pixel moves, the build says so.", W / 2, 728, {
      size: 32,
      weight: 500,
      align: "center",
      color: C.cocoa,
    });
    // the night half: the film's own soundtrack as a waveform
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 775, W, H - 775);
    ctx.clip();
    nightGround(ctx, l, 19, W, H);
    ctx.restore();
    caption(ctx, ["The sound is code, too."], W / 2, 855, 1, l, { size: 60, color: C.nightText, hi: "code" });
    text(ctx, "The music box and the waves are written sample by sample.", W / 2, 905, {
      size: 30,
      weight: 500,
      align: "center",
      color: C.nightMuted,
    });
    const w = waveform(),
      x0 = 90,
      bw = (W - 180) / w.length,
      mid = 1075;
    for (let i = 0; i < w.length; i++) {
      const h = Math.max(3, w[i]! * 105);
      ctx.fillStyle = i % 11 === 0 ? C.clay : C.nightText;
      ctx.fillRect(x0 + i * bw, mid - h, Math.max(1.5, bw - 1.5), h * 2);
    }
    text(ctx, "0:00", x0, 1240, { size: 28, font: FONT.mono, color: C.nightMuted });
    text(ctx, "1:00", W - x0, 1240, { size: 28, font: FONT.mono, align: "right", color: C.nightMuted });
    pageNo(ctx, 2, true);
  },
  // 4 · all of it is open: the film's frames by number, the studio, the sign-off
  (ctx, l, env) => {
    envGround(ctx, l, "base", { w: W, h: H });
    [45, 900, 1560].forEach((f, i) => {
      const x = 72 + i * 318,
        b = framed(ctx, env, f, FULL, x, 110, 300);
      text(ctx, `frame ${f}`, x + 150, b + 44, { size: 28, font: FONT.mono, align: "center", color: C.muted });
    });
    caption(ctx, ["All of it is open."], W / 2, 490, 1, l, { size: 84, hi: "open" });
    ["The engine, the briefs, the prompts,", "the agent runs and every render."].forEach((s, i) =>
      text(ctx, s, W / 2, 566 + i * 46, { size: 35, weight: 500, align: "center", color: C.muted }),
    );
    fillRR(ctx, 150, 660, W - 300, 140, 30, C.surface, C.ink, 3);
    text(ctx, "studio.rotli.co", W / 2, 748, { size: 54, weight: 600, align: "center", color: C.cocoa });
    lockup(ctx, W / 2, 1070, 1, l, { s: 0.75, url: true });
    pageNo(ctx, 3);
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
