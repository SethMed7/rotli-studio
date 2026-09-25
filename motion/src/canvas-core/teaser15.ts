// TEASER 15 — 15 s vertical (1080x1920) recut of the sealed film. Nothing is re-drawn: each
// segment re-renders the film's own frames at the scale this frame needs (studio/reframe) under a
// big caption, because vertical autoplay starts muted and the words must carry it.
import type { Ctx, Env } from "./core";
import type { Film } from "./film";
import { rotliStory } from "./rotliStory";
import { C, fillRR, seg, text } from "./rotli/kit";
import { envGround } from "./studio/grounds";
import { caption } from "./studio/brandmarks";
import { reframe } from "./studio/reframe";
import { makeScore } from "./studio/score2";
import { BRAND, FONTS, FORMATS } from "./studio/stage";

const [W, H] = FORMATS.story;
type Seg = {
  from: number;
  to: number;
  film: number;
  crop: { x: number; y: number; w: number; h: number };
  y: number;
  lines: string[];
  hi?: string;
};
// cue table: which film frames play where, cropped how, under which words
const SEGS: Seg[] = [
  {
    from: 0,
    to: 120,
    film: 150,
    crop: { x: 560, y: 0, w: 1040, h: 1080 },
    y: 600,
    lines: ["Every app wants", "your attention."],
    hi: "attention",
  },
  {
    from: 120,
    to: 150,
    film: 270,
    crop: { x: 400, y: 0, w: 1040, h: 1080 },
    y: 600,
    lines: ["Rotli doesn't."],
    hi: "doesn't",
  },
  {
    from: 150,
    to: 300,
    film: 300,
    crop: { x: 430, y: 175, w: 1000, h: 770 },
    y: 560,
    lines: ["⌥Space. Just write.", "Every note is a plain file."],
    hi: "plain file",
  },
  {
    from: 300,
    to: 450,
    film: 1640,
    crop: { x: 300, y: 0, w: 1320, h: 1080 },
    y: 560,
    lines: ["Everything, kept."],
    hi: "kept",
  },
];
const draw = (ctx: Ctx, l: number, env: Env) => {
  ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
  const s = SEGS.find((x) => l >= x.from && l < x.to)!,
    k = l - s.from,
    dh = (W * s.crop.h) / s.crop.w;
  envGround(ctx, l, "base", { w: W, h: H });
  // a slow push-in (6% over the segment) so every frame moves even while the footage holds
  const z = 1 - 0.06 * (k / (s.to - s.from)),
    cw = s.crop.w * z,
    ch = s.crop.h * z;
  reframe(
    ctx,
    env,
    rotliStory,
    s.film + k,
    { x: s.crop.x + (s.crop.w - cw) / 2, y: s.crop.y + (s.crop.h - ch) / 2, w: cw, h: ch },
    { x: 0, y: s.y, w: W, h: dh },
  );
  ctx.fillStyle = C.ink;
  ctx.fillRect(0, s.y - 3, W, 3);
  ctx.fillRect(0, s.y + dh, W, 3);
  if (s.lines.length)
    caption(ctx, s.lines, W / 2, 250, seg(k, 0, 18), l, { size: s.lines.length > 1 ? 76 : 96, hi: s.hi });
  const pill = l < 300 ? "Rotli · for Mac" : `${BRAND.url} · ${BRAND.platform}`,
    pw = l < 300 ? 300 : 380;
  fillRR(ctx, W / 2 - pw / 2, 1760, pw, 76, 38, l < 300 ? C.surface : C.clay, C.ink, 3);
  text(ctx, pill, W / 2, 1810, { size: 32, weight: 600, align: "center", color: l < 300 ? C.cocoa : C.surface });
};
export const teaser15: Film = {
  meta: { title: "teaser15", W, H, fps: 30, bpm: 120, durationFrames: 450, raster: "cpu" },
  assets: { images: {}, fonts: FONTS },
  shots: SEGS.map((s, i) => ({
    id: `seg${i + 1}`,
    start: s.from,
    end: s.to,
    draw: (c: Ctx, lo: number, e: Env) => draw(c, lo + s.from, e),
  })),
  audio: makeScore({
    frames: 450,
    energeticFrom: 120,
    endAt: 420,
    bellAt: [360],
    pops: Array.from({ length: 12 }, (_, i) => [18 + i * 8, [96, 91, 100, 93, 98][i % 5]] as [number, number]),
    thumps: [150],
    clicks: [412, 415],
  }),
};
