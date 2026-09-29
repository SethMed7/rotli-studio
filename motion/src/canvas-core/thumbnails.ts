// THUMBNAILS: the designed poster of every Rotli video (YouTube thumbnail, Reels/Shorts cover). A thumbnail is a
// film of one frame: the source piece's own frame, re-rendered at the scale the picture needs and pushed in on a
// focus point (usually the quokka), beside a flat title panel in Rotli's type: General Sans 600 at -0.045em, the key
// word underlined in clay, a small series label and the lockup. The choices per piece (frame, focus, zoom, title,
// key word, label) are data in brand/thumbnails.json; tools/thumbnails.mjs builds one page per thumbnail, so the
// source frame is drawn in exactly the state its own bundle has (its theme family, its assets).
//
//   landscape 1280×720   title panel left, picture right (clear of YouTube's duration badge, bottom right)
//   vertical  1080×1920  title in the upper third, picture below, the subject above the platform's bottom 320 px
import type { Ctx, Env } from "./core";
import { renderFrame, type Film } from "./film";
import { POSES } from "./quokka/poses";
import { RIG } from "./quokka/rig";
import { C, FONT, HAS_CHARACTER, TRACK, fillRR, ink, measure, text } from "./rotli/kit";
import { BRAND, FONTS, theme } from "./studio/stage";

// a thumbnail draws the quokka up to ~2× (a push-in): close the fill's gaps at that scale (see RIG in quokka/rig.ts)
RIG.scaleGap = true;

export type ThumbShape = "landscape" | "vertical";
export type ThumbSpec = {
  piece: string /* the piece this thumbnail is for */;
  source?: string /* whose frame function draws the picture (default: the piece) */;
  frame: number /* the source frame */;
  focus: [number, number] /* the point of the source frame (its own pixels) the picture centres on */;
  zoom: number /* 1 = the source just covers the picture; 2 = twice as close */;
  title: string[] /* the title, one string per line */;
  hi?: string /* the key word, underlined in clay */;
  label: string /* the small series + episode label, e.g. "Season One · 01" */;
  dark?: boolean /* a night scene: the panel takes the theme's dark ground */;
};
export const THUMB_SIZE: Record<ThumbShape, [number, number]> = { landscape: [1280, 720], vertical: [1080, 1920] };

/** Rotli's clay, from the untouched theme table (a piece's family re-points C.clay; the thumbnail family stays clay) */
const CLAY = theme("light")?.roles.accent ?? C.clay;
type Box = { x: number; y: number; w: number; h: number };
/** vertical covers: nothing that matters below this line (Reels, Shorts and TikTok lay their captions there) */
const SAFE_BOTTOM = 1920 - 320;

/** the source frame, rendered at the scale the picture needs (never a bitmap blown up) and cropped so the focus
 *  lands on `at` (thumbnail pixels); the crop stays inside the source frame */
const picture = (ctx: Ctx, env: Env, src: Film, sp: ThumbSpec, box: Box, at: [number, number]) => {
  const { W: sw, H: sh } = src.meta,
    k = Math.max(box.w / sw, box.h / sh) * Math.max(1, sp.zoom), // thumbnail px per source px
    cw = box.w / k,
    ch = box.h / k,
    cx = Math.min(sw - cw, Math.max(0, sp.focus[0] - (at[0] - box.x) / k)),
    cy = Math.min(sh - ch, Math.max(0, sp.focus[1] - (at[1] - box.y) / k)),
    S = env.scale * k,
    L = env.canvas(Math.round(sw * S), Math.round(sh * S));
  renderFrame(src, L.ctx, sp.frame, { ...env, W: sw, H: sh, scale: S });
  const s = env.scale;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(L.canvas, cx * S, cy * S, cw * S, ch * S, box.x * s, box.y * s, box.w * s, box.h * s);
  ctx.setTransform(s, 0, 0, s, 0, 0);
};

/** the mark and wordmark, left-aligned at (x, baseline y), `h` = the wordmark's size */
const wordmark = (ctx: Ctx, x: number, y: number, h: number, col: string) => {
  let dx = 0;
  if (HAS_CHARACTER && (BRAND as { mark?: string | null }).mark !== null) {
    const mk = POSES._logo,
      m = (h * 1.27) / mk.vb;
    ctx.save();
    ctx.translate(x, y - h * 0.99);
    ctx.scale(m, m);
    ctx.fillStyle = col;
    for (const d of mk.d) ctx.fill(new Path2D(d), mk.rule);
    ctx.restore();
    dx = h * 1.37;
  }
  text(ctx, BRAND.wordmark, x + dx, y, { size: h, weight: 600, font: FONT.word, color: col });
};

/** the largest size (capped at `max`) at which every line fits `maxW` */
const fit = (ctx: Ctx, lines: string[], maxW: number, max: number) =>
  Math.floor(
    Math.min(max, (max * maxW) / Math.max(...lines.map((l) => measure(ctx, l, max, 600, FONT.display, max * TRACK)))),
  );
const LEAD = 1.02;
/** the height of a title block from its cap line to below its underline */
const blockH = (size: number, n: number) => size * 0.74 + (n - 1) * size * LEAD + size * 0.3;
/** the title, every line at one size, the key word underlined in clay */
const title = (
  ctx: Ctx,
  lines: string[],
  hi: string | undefined,
  x: number,
  top: number,
  size: number,
  align: "left" | "center",
  col: string,
) => {
  const sp = size * TRACK;
  lines.forEach((ln, i) => {
    const y = top + size * 0.74 + i * size * LEAD,
      w = measure(ctx, ln, size, 600, FONT.display, sp) - sp, // letterSpacing trails the last glyph
      x0 = align === "center" ? x - w / 2 : x;
    text(ctx, ln, x0, y, { size, weight: 600, color: col, spacing: sp, font: FONT.display });
    if (hi && ln.includes(hi)) {
      const pre = measure(ctx, ln.slice(0, ln.indexOf(hi)), size, 600, FONT.display, sp),
        hw = measure(ctx, hi, size, 600, FONT.display, sp) - sp;
      ink(
        ctx,
        [
          [x0 + pre, y + size * 0.17],
          [x0 + pre + hw, y + size * 0.15],
        ],
        { w: Math.max(6, size * 0.075), color: CLAY, seed: 41 + i, frame: 0 },
      );
    }
  });
};

/** the series label: a flat pill, like the episodes' chapter cards */
const label = (ctx: Ctx, s: string, x: number, y: number, size: number, dark: boolean, align: "left" | "center") => {
  const w = measure(ctx, s, size, 600) + size * 1.4,
    h = size * 1.9,
    x0 = align === "center" ? x - w / 2 : x;
  fillRR(ctx, x0, y, w, h, h / 2, dark ? C.nightSurface2 : C.surface, dark ? C.nightBorder : C.ink, 3);
  text(ctx, s, x0 + size * 0.7, y + h / 2 + size * 0.36, { size, weight: 600, color: dark ? C.nightText : C.cocoa });
};

export const thumbnailFilm = (sp: ThumbSpec, source: Film, shape: ThumbShape): Film => {
  const [W, H] = THUMB_SIZE[shape];
  if (!sp.title.length) throw new Error(`thumbnail ${sp.piece}: no title`);
  if (sp.hi && !sp.title.some((l) => l.includes(sp.hi!)))
    throw new Error(`thumbnail ${sp.piece}: key word "${sp.hi}" is not in the title`);
  return {
    meta: { title: `thumbnail-${sp.piece}`, W, H, fps: 30, bpm: 120, durationFrames: 15, raster: "cpu" },
    assets: { images: source.assets.images, fonts: { ...FONTS, ...source.assets.fonts } },
    shots: [
      {
        id: "thumbnail",
        start: 0,
        end: 15,
        draw: (ctx, _l, env) => {
          ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
          const land = shape === "landscape",
            n = sp.title.length,
            size = land ? fit(ctx, sp.title, 452, 120) : fit(ctx, sp.title, 940, 150),
            // landscape: panel left (560 wide), the title centred between the label and the wordmark;
            // vertical: wordmark, label, title from the top, the panel ending under the title, the picture below
            top = land ? 150 + Math.max(0, (440 - blockH(size, n)) / 2) : 410,
            panel: Box = land
              ? { x: 0, y: 0, w: 560, h: H }
              : { x: 0, y: 0, w: W, h: Math.max(720, top + blockH(size, n) + 70) },
            pic: Box = land ? { x: 560, y: 0, w: W - 560, h: H } : { x: 0, y: panel.h, w: W, h: H - panel.h };
          // the picture first: the source sets its own theme family while it draws, and the panel follows it
          picture(ctx, env, source, sp, pic, land ? [pic.x + pic.w / 2, H / 2] : [W / 2, (panel.h + SAFE_BOTTOM) / 2]);
          const dark = !!sp.dark,
            col = dark ? C.nightText : C.cocoa;
          ctx.fillStyle = dark ? C.night : C.linen;
          ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
          if (land) {
            label(ctx, sp.label, 56, 52, 30, dark, "left");
            title(ctx, sp.title, sp.hi, 56, top, size, "left", col);
            wordmark(ctx, 56, 664, 40, col);
          } else {
            wordmark(ctx, W / 2 - 110, 206, 60, col);
            label(ctx, sp.label, W / 2, 270, 36, dark, "center");
            title(ctx, sp.title, sp.hi, W / 2, top, size, "center", col);
          }
        },
      },
    ],
  };
};
