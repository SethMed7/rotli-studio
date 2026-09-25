// HOW ROTLI WORKS — a 7-slide Instagram carousel (1080x1350). Each slide is one shot; the export
// takes each shot's last frame. Film footage is re-rendered crisp via studio/reframe; claims use
// rotli.co's own wording (/features, /privacy).
import type { Ctx, Env } from "./core";
import type { Film } from "./film";
import { rotliStory } from "./rotliStory";
import { C, fillRR, nightGround, text } from "./rotli/kit";
import { envGround } from "./studio/grounds";
import { caption, lockup } from "./studio/brandmarks";
import { drawLook } from "./studio/look";
import { reframe } from "./studio/reframe";
import { FONTS, FORMATS, lookAssets } from "./studio/stage";

const [W, H] = FORMATS["ig-portrait"];
type Box = { x: number; y: number; w: number; h: number };
const framed = (ctx: Ctx, env: Env, f: number, crop: Box, x: number, y: number, w: number, dark = false) => {
  const h = (w * crop.h) / crop.w;
  fillRR(ctx, x - 3, y - 3, w + 6, h + 6, 27, dark ? C.nightBorder : C.ink);
  reframe(ctx, env, rotliStory, f, crop, { x, y, w, h, r: 24 });
  return y + h;
};
const head = (ctx: Ctx, l: number, title: string, sub: string[], dark = false, hi?: string) => {
  caption(ctx, [title], W / 2, 170, 1, l, { size: 76, color: dark ? C.nightText : C.cocoa, hi });
  sub.forEach((s, i) =>
    text(ctx, s, W / 2, 250 + i * 46, { size: 36, weight: 500, align: "center", color: dark ? C.nightMuted : C.muted }),
  );
};
const pageNo = (ctx: Ctx, n: number, dark = false) => {
  for (let i = 0; i < 7; i++) {
    ctx.fillStyle = i === n ? C.clay : dark ? C.nightBorder : C.border;
    ctx.beginPath();
    ctx.arc(W / 2 + (i - 3) * 30, H - 60, i === n ? 9 : 7, 0, 6.29);
    ctx.fill();
  }
};
const SLIDES: ((ctx: Ctx, l: number, env: Env) => void)[] = [
  (ctx, l, env) => {
    reframe(ctx, env, rotliStory, 140, { x: 720, y: 0, w: 864, h: 1080 }, { x: 0, y: 0, w: W, h: H });
    caption(ctx, ["Meet Rotli."], W / 2, 190, 1, l, { size: 110, hi: "Rotli" });
    text(ctx, "A calm notes app. Your files stay yours.", W / 2, 270, {
      size: 38,
      weight: 500,
      align: "center",
      color: C.cocoa,
    });
    fillRR(ctx, W - 250, H - 130, 190, 70, 35, C.surface, C.ink, 3);
    text(ctx, "swipe →", W - 155, H - 83, { size: 30, weight: 600, align: "center" });
  },
  (ctx, l, env) => {
    envGround(ctx, l, "band", { w: W, h: H, field: false });
    head(ctx, l, "Just write.", ["Markdown renders as you type.", "⌥Space opens it from anywhere."], false, "write");
    framed(ctx, env, 505, { x: 430, y: 175, w: 1000, h: 770 }, 60, 400, 960);
    pageNo(ctx, 1);
  },
  (ctx, l, env) => {
    envGround(ctx, l, "base", { w: W, h: H, field: false });
    head(ctx, l, "One folder.", ["Every note is a plain file you own.", "Open it in any editor."], false, "folder");
    framed(ctx, env, 710, { x: 230, y: 300, w: 700, h: 560 }, 230, 360, 620);
    framed(ctx, env, 710, { x: 985, y: 285, w: 880, h: 330 }, 90, 900, 900);
    pageNo(ctx, 2);
  },
  (ctx, l, env) => {
    nightGround(ctx, l, 7, W, H);
    head(
      ctx,
      l,
      "A Librarian that files.",
      ["It tags and links your notes,", "and never rewrites your words."],
      true,
      "files",
    );
    framed(ctx, env, 950, { x: 840, y: 180, w: 1060, h: 860 }, 60, 390, 960, true);
    pageNo(ctx, 3, true);
  },
  (ctx, l, env) => {
    nightGround(ctx, l, 19, W, H);
    head(ctx, l, "Secure stays home.", ["Secure notes never reach", "a remote model."], true, "home");
    framed(ctx, env, 1330, { x: 400, y: 150, w: 1120, h: 900 }, 60, 400, 960, true);
    pageNo(ctx, 4, true);
  },
  (ctx, l, env) => {
    envGround(ctx, l, "band", { w: W, h: H, field: false });
    head(
      ctx,
      l,
      "Ask your notes.",
      ["Chat reads the vault you are in", "and answers from what is there."],
      false,
      "notes",
    );
    framed(ctx, env, 1540, { x: 760, y: 150, w: 1040, h: 780 }, 60, 400, 960);
    pageNo(ctx, 5);
  },
  (ctx, l, env) => {
    envGround(ctx, l, "base", { w: W, h: H });
    lockup(ctx, W / 2, 330, 1, l, { s: 0.85 });
    [
      ["waving-green-glasses", 250],
      ["celebrating-ocean-hat", 540],
      ["waving-berry-hat", 830],
    ].forEach(([id, x], i) =>
      drawLook(ctx, env, { id: id as string, x: x as number, y: 1170, h: 560, f: l + i * 30, blink: 0 }),
    );
    text(ctx, "Make it yours: seven colors, a hat, glasses.", W / 2, 1245, {
      size: 34,
      weight: 500,
      align: "center",
      color: C.muted,
    });
    pageNo(ctx, 6);
  },
];
export const howRotliWorks: Film = {
  meta: { title: "howRotliWorks", W, H, fps: 30, bpm: 120, durationFrames: SLIDES.length * 15, raster: "cpu" },
  assets: { images: lookAssets(["waving-green-glasses", "celebrating-ocean-hat", "waving-berry-hat"]), fonts: FONTS },
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
