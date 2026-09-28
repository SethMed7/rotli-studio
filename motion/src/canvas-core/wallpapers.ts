// WALLPAPERS — free desktop, tablet and phone wallpapers: one film per screen and one shot per wallpaper, so
// `node tools/wallpapers.mjs` renders every screen at its exact pixel size (WALLPAPER_SCREENS). No words on a
// wallpaper; the quokka and the lighthouse sit low and left of centre, clear of macOS's desktop icons (top right),
// the menu bar, the Dock and a phone's clock.
import type { Ctx, Env } from "./core";
import type { Film } from "./film";
import { drawQuokka, type Quokka } from "./quokka/rig";
import { beach, farIsland, HORIZON, lighthouse, sea, sky, sun } from "./rotli/island";
import { C } from "./rotli/kit";
import { leaves, moon, motes, rain, stars, tide, grid } from "./studio/atmospheres";
import { envGround, fileField } from "./studio/grounds";
import { FAMILY_QUOKKA, FONTS, STYLE_HEX, useFamily, type Family } from "./studio/stage";

/** each screen: the pixels it ships at and the devices it fits. The design space is the same shape with its short
 *  side at 1080 (so strokes, stars and leaves read as they do in the films); the render scale maps it to `out`. */
export const WALLPAPER_SCREENS = {
  mac: { out: [5120, 3200], label: "Mac", fits: "MacBook, iMac and most Mac displays (16:10)" },
  display: { out: [6016, 3384], label: "Display", fits: "Studio Display, Pro Display XDR, 4K and 5K monitors (16:9)" },
  ipad: { out: [2752, 2752], label: "iPad", fits: "every iPad, in either orientation" },
  iphone: { out: [1320, 2868], label: "iPhone", fits: "iPhone; smaller models scale it down" },
  android: { out: [1440, 3200], label: "Android", fits: "20:9 Android phones" },
} as const;
export type WallpaperScreen = keyof typeof WALLPAPER_SCREENS;
/** a screen's design space and the scale that turns it into exactly `out` pixels */
export const designOf = (screen: WallpaperScreen) => {
  const [w, h] = WALLPAPER_SCREENS[screen].out,
    scale = Math.min(w, h) / 1080;
  return { W: w / scale, H: h / scale, scale };
};
type Box = { W: number; H: number; tall: boolean };

const F = 120; // the frame every ambient layer (clouds, stars, leaves) is frozen at

/** the 1920x1080 island, scaled to cover the screen; `ax` picks which part of the width a narrow screen keeps */
const island = (ctx: Ctx, b: Box, mode: "day" | "sunset", ax: number) => {
  const k = Math.max(b.W / 1920, b.H / 1080);
  ctx.save();
  ctx.translate((b.W - 1920 * k) * ax, (b.H - 1080 * k) / 2);
  ctx.scale(k, k);
  sky(ctx, F, mode);
  if (mode === "sunset") sun(ctx, 560, HORIZON - 6, 84, "#f9d47f");
  farIsland(ctx, F, mode, mode === "sunset" ? 0.8 : 0);
  sea(ctx, F, mode);
  beach(ctx, F, mode, mode === "sunset" ? 470 : 820);
  ctx.restore();
  return { k, x0: (b.W - 1920 * k) * ax, y0: (b.H - 1080 * k) / 2 };
};

/** the quokka, standing where a wallpaper wants it: a share of the width and height, sized to the short side */
const quokka = (
  ctx: Ctx,
  env: Env,
  b: Box,
  q: Omit<Quokka, "x" | "y" | "h">,
  at: { x: number; y: number; h: number },
) => drawQuokka(ctx, env, { blink: 0, ...q, x: b.W * at.x, y: b.H * at.y, h: Math.min(b.W, b.H) * at.h });

type Wallpaper = {
  id: string;
  title: string;
  family: Family;
  dark: boolean;
  draw: (ctx: Ctx, env: Env, b: Box) => void;
};

export const WALLPAPERS: Wallpaper[] = [
  {
    id: "island-morning",
    title: "Island, morning",
    family: "rotli",
    dark: false,
    draw: (ctx, env, b) => {
      island(ctx, b, "day", b.tall ? 0.86 : b.W < b.H * 1.2 ? 0.8 : 0.5);
      quokka(
        ctx,
        env,
        b,
        { pose: "base", body: STYLE_HEX.cocoa },
        b.tall ? { x: 0.5, y: 0.8, h: 0.36 } : { x: 0.56, y: 0.84, h: 0.26 },
      );
      motes(ctx, F, b.W, b.H, C.cocoa, 10, 5, 0.12);
    },
  },
  {
    id: "island-sunset",
    title: "Island, sunset",
    family: "rotli",
    dark: false,
    draw: (ctx, env, b) => {
      island(ctx, b, "sunset", b.tall ? 0.3 : 0.5);
      quokka(
        ctx,
        env,
        b,
        { pose: "waving", body: STYLE_HEX.cocoa },
        b.tall ? { x: 0.56, y: 0.82, h: 0.34 } : { x: 0.62, y: 0.86, h: 0.24 },
      );
    },
  },
  {
    id: "lighthouse-night",
    title: "Night, the lighthouse",
    family: "rotli",
    dark: true,
    draw: (ctx, env, b) => {
      envGround(ctx, F, "deep", { w: b.W, h: b.H, fieldAlpha: 0.05 });
      stars(ctx, F, b.W, b.H, C.nightText, b.tall ? 120 : 110);
      moon(ctx, b.W * (b.tall ? 0.72 : 0.36), b.H * (b.tall ? 0.24 : 0.2), 40, C.nightText, C.night);
      ctx.save();
      ctx.globalAlpha = 0.6;
      lighthouse(ctx, b.W * (b.tall ? 0.8 : 0.84), b.H - 40, b.tall ? 1.2 : 0.95, F, 0.55, "night");
      ctx.restore();
      quokka(
        ctx,
        env,
        b,
        { pose: "rest", body: STYLE_HEX.cocoa },
        b.tall ? { x: 0.36, y: 0.84, h: 0.34 } : { x: 0.26, y: 0.88, h: 0.24 },
      );
    },
  },
  {
    id: "ocean-tide",
    title: "Ocean, the tide line",
    family: "ocean",
    dark: false,
    draw: (ctx, env, b) => {
      envGround(ctx, F, "base", { w: b.W, h: b.H });
      tide(ctx, F, b.W, b.H, C.clay, 5);
      quokka(
        ctx,
        env,
        b,
        { pose: "thoughtful", body: FAMILY_QUOKKA.ocean },
        b.tall ? { x: 0.5, y: 0.8, h: 0.4 } : { x: 0.3, y: 0.8, h: 0.3 },
      );
    },
  },
  {
    id: "grove-leaves",
    title: "Grove, falling leaves",
    family: "grove",
    dark: false,
    draw: (ctx, env, b) => {
      envGround(ctx, F, "band", { w: b.W, h: b.H });
      leaves(ctx, F, b.W, b.H, [C.olive, C.clay, C.oliveBright], b.tall ? 30 : 26);
      quokka(
        ctx,
        env,
        b,
        { pose: "listening", body: FAMILY_QUOKKA.grove },
        b.tall ? { x: 0.5, y: 0.8, h: 0.4 } : { x: 0.3, y: 0.82, h: 0.3 },
      );
    },
  },
  {
    id: "iris-dusk",
    title: "Iris, dusk",
    family: "iris",
    dark: false,
    draw: (ctx, env, b) => {
      envGround(ctx, F, "base", { w: b.W, h: b.H });
      stars(ctx, F, b.W, b.H * 0.55, C.clay, 34, 23, 1);
      moon(ctx, b.W * (b.tall ? 0.7 : 0.4), b.H * (b.tall ? 0.24 : 0.22), 46, C.peach, C.linen);
      quokka(
        ctx,
        env,
        b,
        { pose: "celebrating", body: FAMILY_QUOKKA.iris },
        b.tall ? { x: 0.5, y: 0.8, h: 0.4 } : { x: 0.3, y: 0.82, h: 0.3 },
      );
    },
  },
  {
    id: "midnight-rain",
    title: "Midnight, rain",
    family: "midnight",
    dark: true,
    draw: (ctx, env, b) => {
      envGround(ctx, F, "deep", { w: b.W, h: b.H, fieldAlpha: 0.05 });
      quokka(
        ctx,
        env,
        b,
        { pose: "base", body: STYLE_HEX.line },
        b.tall ? { x: 0.5, y: 0.8, h: 0.4 } : { x: 0.3, y: 0.82, h: 0.3 },
      );
      rain(ctx, F, b.W, b.H, C.nightText, b.tall ? 140 : 120);
    },
  },
  {
    id: "paper-studio",
    title: "Paper studio",
    family: "paper",
    dark: false,
    draw: (ctx, env, b) => {
      envGround(ctx, F, "base", { w: b.W, h: b.H, field: false });
      grid(ctx, b.W, b.H, C.cocoa);
      fileField(ctx, F, { w: b.W, h: b.H, alpha: 0.06 });
      quokka(
        ctx,
        env,
        b,
        { pose: "notes", body: STYLE_HEX.line },
        b.tall ? { x: 0.5, y: 0.8, h: 0.4 } : { x: 0.3, y: 0.82, h: 0.3 },
      );
    },
  },
];

const BEAT = 15;
const screenFilm = (screen: WallpaperScreen): Film => {
  const { W, H } = designOf(screen),
    b: Box = { W, H, tall: H > W * 1.2 };
  return {
    meta: {
      title: `wallpapers-${screen}`,
      W,
      H,
      fps: 30,
      bpm: 120,
      durationFrames: WALLPAPERS.length * BEAT,
      raster: "cpu",
    },
    assets: { images: {}, fonts: FONTS },
    shots: WALLPAPERS.map((w, i) => ({
      id: w.id,
      start: i * BEAT,
      end: (i + 1) * BEAT,
      draw: (ctx, _l, env) => {
        useFamily(w.family); // each shot sets its own palette first, so the set renders the same in any order
        ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
        w.draw(ctx, env, b);
      },
    })),
  };
};

export const wallpapersMac = screenFilm("mac");
export const wallpapersDisplay = screenFilm("display");
export const wallpapersIpad = screenFilm("ipad");
export const wallpapersIphone = screenFilm("iphone");
export const wallpapersAndroid = screenFilm("android");
