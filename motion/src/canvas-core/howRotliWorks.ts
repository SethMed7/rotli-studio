// HOW ROTLI WORKS — a 4-slide carousel (1080x1350; X takes at most four images). Each slide is one shot;
// the export takes each shot's last frame. X shows four images as a 2x2 grid cropped toward each image's
// centre, so every slide keeps its key line and the heart of its picture near the middle band (y≈405–945).
// 1 meet Rotli · 2 just write, one folder you own · 3 the Librarian, secure, chat · 4 make it yours.
// Film footage is re-rendered crisp via studio/reframe; claims use rotli.co's own wording (/features, /privacy).
import type { Ctx, Env } from "./core";
import type { Film } from "./film";
import { rotliStory } from "./rotliStory";
import { C, fillRR, nightGround, text } from "./rotli/kit";
import { envGround } from "./studio/grounds";
import { caption, lockup } from "./studio/brandmarks";
import { drawLook } from "./studio/look";
import { reframe } from "./studio/reframe";
import { FONTS, FORMATS, lookAssets } from "./studio/stage";

const [W, H] = FORMATS["ig-portrait"],
  N = 4;
type Box = { x: number; y: number; w: number; h: number };
const framed = (ctx: Ctx, env: Env, f: number, crop: Box, x: number, y: number, w: number, dark = false) => {
  const h = (w * crop.h) / crop.w;
  fillRR(ctx, x - 3, y - 3, w + 6, h + 6, 27, dark ? C.nightBorder : C.ink);
  reframe(ctx, env, rotliStory, f, crop, { x, y, w, h, r: 24 });
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
/** one row of slide 3 (390 tall): a left-aligned heading and sub lines, centred beside a 4:3 film crop */
const ROW = 390;
const row = (
  ctx: Ctx,
  l: number,
  env: Env,
  y: number,
  title: string[],
  hi: string,
  sub: string[],
  f: number,
  crop: Box,
  dy = 0, // nudges the text block (the last row sits low, clear of X's centre crop)
) => {
  const block = 40 + (title.length - 1) * 62 + 34 + sub.length * 40,
    y0 = y + (ROW - block) / 2 + 40 + dy;
  caption(ctx, title, 60, y0, 1, l, { size: 54, color: C.nightText, align: "left", hi, lead: 62 });
  sub.forEach((s, i) =>
    text(ctx, s, 60, y0 + (title.length - 1) * 62 + 64 + i * 40, { size: 30, weight: 500, color: C.nightMuted }),
  );
  framed(ctx, env, f, crop, W - 60 - (ROW * 4) / 3, y, (ROW * 4) / 3, true);
};
const SLIDES: ((ctx: Ctx, l: number, env: Env) => void)[] = [
  // 1 · the cover: the quokka at Thomson Bay, the title in the middle band
  (ctx, l, env) => {
    reframe(ctx, env, rotliStory, 140, { x: 660, y: 160, w: 736, h: 920 }, { x: 0, y: 0, w: W, h: H });
    fillRR(ctx, 80, 420, W - 160, 240, 32, C.surface, C.ink, 3);
    caption(ctx, ["Meet Rotli."], W / 2, 548, 1, l, { size: 110, hi: "Rotli" });
    text(ctx, "A calm notes app. Your files stay yours.", W / 2, 626, {
      size: 38,
      weight: 500,
      align: "center",
      color: C.cocoa,
    });
    fillRR(ctx, W - 250, H - 130, 190, 70, 35, C.surface, C.ink, 3);
    text(ctx, "swipe →", W - 155, H - 83, { size: 30, weight: 600, align: "center" });
  },
  // 2 · just write, into one folder you own: the note above, the folder below, the line between
  (ctx, l, env) => {
    envGround(ctx, l, "band", { w: W, h: H, field: false });
    framed(ctx, env, 505, { x: 120, y: 150, w: 1680, h: 800 }, 90, 60, 900);
    caption(ctx, ["Just write.", "One folder you own."], W / 2, 590, 1, l, { size: 66, lead: 76, hi: "own" });
    ["Markdown renders as you type.", "Every note is a plain file. Open it in any editor."].forEach((s, i) =>
      text(ctx, s, W / 2, 730 + i * 44, { size: 32, weight: 500, align: "center", color: C.muted }),
    );
    framed(ctx, env, 710, { x: 220, y: 270, w: 1420, h: 690 }, 90, 812, 900);
    pageNo(ctx, 1);
  },
  // 3 · three rows on night: the Librarian, secure notes (the middle band), chat
  (ctx, l, env) => {
    nightGround(ctx, l, 7, W, H);
    row(
      ctx,
      l,
      env,
      45,
      ["A Librarian", "that files."],
      "files",
      ["It tags and links your", "notes, and never", "rewrites your words."],
      950,
      { x: 800, y: 215, w: 1120, h: 840 },
    );
    row(ctx, l, env, 460, ["Secure stays", "home."], "home", ["Secure notes never", "reach a remote model."], 1330, {
      x: 360,
      y: 105,
      w: 1300,
      h: 975,
    });
    row(
      ctx,
      l,
      env,
      875,
      ["Ask your", "notes."],
      "notes",
      ["Chat reads the vault", "you are in and answers", "from what is there."],
      1540,
      { x: 400, y: 0, w: 1440, h: 1080 },
      30,
    );
    pageNo(ctx, 2, true);
  },
  // 4 · make it yours, then the sign-off
  (ctx, l, env) => {
    envGround(ctx, l, "base", { w: W, h: H });
    caption(ctx, ["Make it yours."], W / 2, 190, 1, l, { size: 88, hi: "yours" });
    text(ctx, "Seven colors, a hat, glasses.", W / 2, 268, { size: 38, weight: 500, align: "center", color: C.muted });
    [
      ["waving-green-glasses", 250],
      ["celebrating-ocean-hat", 540],
      ["waving-berry-hat", 830],
    ].forEach(([id, x], i) =>
      drawLook(ctx, env, { id: id as string, x: x as number, y: 920, h: 540, f: l + i * 30, blink: 0 }),
    );
    lockup(ctx, W / 2, 1100, 1, l, { s: 0.7 });
    pageNo(ctx, 3);
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
