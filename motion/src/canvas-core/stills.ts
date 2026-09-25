// STILLS — single images at exact platform sizes. Each is a one-shot "film" (15 frames so the beat
// grid holds); tools/export.mjs takes the last frame. One module, four pieces (shims re-export).
import type { Ctx, Env } from "./core";
import type { Film } from "./film";
import { rotliStory } from "./rotliStory";
import { C, fillRR, text } from "./rotli/kit";
import { envGround } from "./studio/grounds";
import { caption, lockup } from "./studio/brandmarks";
import { drawLook } from "./studio/look";
import { reframe } from "./studio/reframe";
import { FONTS, FORMATS, STYLE_NAME, THEME_LIST, lookAssets, type Format } from "./studio/stage";

const still = (
  title: string,
  format: Format,
  draw: (ctx: Ctx, l: number, env: Env, w: number, h: number) => void,
  images: Record<string, string> = {},
): Film => {
  const [w, h] = FORMATS[format];
  return {
    meta: { title, W: w, H: h, fps: 30, bpm: 120, durationFrames: 15, raster: "cpu" },
    assets: { images, fonts: FONTS },
    shots: [
      {
        id: format,
        start: 0,
        end: 15,
        draw: (ctx, l, env) => {
          ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
          draw(ctx, l, env, w, h);
        },
      },
    ],
  };
};
const STY = ["line", "cocoa", "green", "ocean", "iris", "berry", "amber"];

/** 4:5 poster: the seven companion colors, as the app draws them */
export const posterLineup = still(
  "posterLineup",
  "ig-portrait",
  (ctx, l, env, w, h) => {
    envGround(ctx, l, "base", { w, h });
    caption(ctx, ["Seven quokkas.", "One is yours."], w / 2, 170, 1, l, { size: 84, hi: "yours" });
    STY.forEach((s, i) => {
      const row = i < 4 ? 0 : 1,
        n = row ? 3 : 4,
        idx = row ? i - 4 : i,
        x = w / 2 + (idx - (n - 1) / 2) * 250,
        y = row ? 1170 : 700;
      drawLook(ctx, env, { id: `base-${s}`, x, y, h: 370, f: i * 17, blink: 0 });
      text(ctx, STYLE_NAME[s], x, y + 52, { size: 32, weight: 600, align: "center" });
    });
    text(ctx, "rotli.co  ·  for Mac", w / 2, h - 56, { size: 30, weight: 500, align: "center", color: C.clayText });
  },
  lookAssets(STY.map((s) => `base-${s}`)),
);

/** 1:1: all twelve theme environments */
export const themeGrid = still("themeGrid", "ig-square", (ctx, l, env, w, h) => {
  ctx.fillStyle = C.linen;
  ctx.fillRect(0, 0, w, h);
  caption(ctx, ["Six themes, light and dark."], w / 2, 120, 1, l, { size: 60, hi: "light and dark" });
  THEME_LIST.forEach((t, k) => {
    const x = 60 + (k % 4) * 245,
      y = 210 + Math.floor(k / 4) * 270,
      r = t.roles;
    fillRR(ctx, x, y, 225, 190, 20, r.ground, C.ink, 3);
    fillRR(ctx, x + 22, y + 26, 181, 138, 12, r.surface, r.border, 2);
    fillRR(ctx, x + 40, y + 48, 96, 13, 6, r.text);
    fillRR(ctx, x + 40, y + 76, 130, 9, 5, r["text-muted"]);
    fillRR(ctx, x + 40, y + 104, 30, 30, 8, r.success);
    fillRR(ctx, x + 82, y + 110, 84, 18, 9, r.tint);
    fillRR(ctx, x + 176, y + 104, 12, 30, 6, r.accent);
    text(ctx, t.label, x + 112, y + 226, { size: 24, weight: 600, align: "center" });
  });
  void env;
});

const sunsetCard = (title: string, format: Format) =>
  still(title, format, (ctx, l, env, w, h) => {
    const cropH = (1920 * h) / w;
    reframe(
      ctx,
      env,
      rotliStory,
      1790,
      { x: 0, y: Math.max(0, (1080 - cropH) / 2 - 20), w: 1920, h: cropH },
      { x: 0, y: 0, w, h },
    );
    void l;
  });
/** LinkedIn 1200x627 and X 1600x900: the film's end card, recomposed at the platform size */
export const linkedinCard = sunsetCard("linkedinCard", "linkedin");
export const xCard = sunsetCard("xCard", "x-post");
/** 16:9 hero: the lockup over the sunset */
export const heroFilm = still("heroFilm", "film", (ctx, l, env, w, h) => {
  reframe(ctx, env, rotliStory, 1790, { x: 0, y: 0, w: 1920, h: 1080 }, { x: 0, y: 0, w, h });
  void l;
});
export { lockup };
