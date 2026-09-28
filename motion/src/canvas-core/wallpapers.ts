// WALLPAPERS — the wallpaper maker's one source: screens, backgrounds, quokka looks, placement and presets, and
// `paintWallpaper`, a pure function the site's maker (src/site/wallpaperMaker.ts) and the golden check
// (tools/wallpapers.mjs) both call. No words on a wallpaper; the quokka stands low, clear of macOS's menu bar,
// desktop icons (top right) and Dock, and of a phone's clock. Its looks are the app's REAL <Character>
// (brand/wallpaper-looks.json, rendered by scripts/render-companions.ts), drawn as images, never re-drawn here.
import LOOKS from "../../brand/wallpaper-looks.json";
import type { Ctx, Env } from "./core";
import type { Film } from "./film";
import { beach, farIsland, HORIZON, lighthouse, sea, sky, sun } from "./rotli/island";
import { C } from "./rotli/kit";
import { leaves, moon, motes, rain, stars, tide, grid } from "./studio/atmospheres";
import { envGround, fileField, fileFlight } from "./studio/grounds";
import { drawLook } from "./studio/look";
import { FONTS, STYLE_NAME, THEME_LIST, useFamily, type Family } from "./studio/stage";

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
export type Box = { W: number; H: number; tall: boolean };
export const boxOf = (screen: WallpaperScreen): Box => {
  const { W, H } = designOf(screen);
  return { W, H, tall: H > W * 1.2 };
};

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
};

// ---------------------------------------------------------------- backgrounds
export type Background = {
  id: string;
  title: string;
  group: "plain" | "scene";
  family: Family;
  dark: boolean;
  /** drawn under the quokka */
  draw: (ctx: Ctx, b: Box) => void;
  /** drawn over it (rain, drifting motes) */
  over?: (ctx: Ctx, b: Box) => void;
};
const familyOf = (name: string) => name.toLowerCase().split(/[^a-z]+/)[0]!;

/** plain: every theme environment the app ships, as its flat ground (the cleanest wallpaper there is) */
const PLAIN: Background[] = THEME_LIST.map((t) => ({
  id: `plain-${t.id}`,
  title: t.label,
  group: "plain" as const,
  family: familyOf(t.family),
  dark: t.mode === "dark",
  draw: (ctx: Ctx, b: Box) => {
    ctx.fillStyle = t.roles.ground;
    ctx.fillRect(0, 0, b.W, b.H);
  },
}));

const SCENES: Background[] = [
  {
    id: "island-morning",
    title: "Island, morning",
    group: "scene",
    family: "rotli",
    dark: false,
    draw: (ctx, b) => island(ctx, b, "day", b.tall ? 0.86 : b.W < b.H * 1.2 ? 0.8 : 0.5),
    over: (ctx, b) => motes(ctx, F, b.W, b.H, C.cocoa, 10, 5, 0.12),
  },
  {
    id: "island-sunset",
    title: "Island, sunset",
    group: "scene",
    family: "rotli",
    dark: false,
    draw: (ctx, b) => island(ctx, b, "sunset", b.tall ? 0.3 : 0.5),
  },
  {
    id: "lighthouse-night",
    title: "Night, the lighthouse",
    group: "scene",
    family: "rotli",
    dark: true,
    draw: (ctx, b) => {
      envGround(ctx, F, "deep", { w: b.W, h: b.H, fieldAlpha: 0.05 });
      stars(ctx, F, b.W, b.H, C.nightText, b.tall ? 120 : 110);
      moon(ctx, b.W * (b.tall ? 0.72 : 0.36), b.H * (b.tall ? 0.24 : 0.2), 40, C.nightText, C.night);
      ctx.save();
      ctx.globalAlpha = 0.6;
      lighthouse(ctx, b.W * (b.tall ? 0.8 : 0.84), b.H - 40, b.tall ? 1.2 : 0.95, F, 0.55, "night");
      ctx.restore();
    },
  },
  {
    id: "ocean-tide",
    title: "Ocean, the tide line",
    group: "scene",
    family: "ocean",
    dark: false,
    draw: (ctx, b) => {
      envGround(ctx, F, "base", { w: b.W, h: b.H });
      tide(ctx, F, b.W, b.H, C.clay, 5);
    },
  },
  {
    id: "grove-leaves",
    title: "Grove, falling leaves",
    group: "scene",
    family: "grove",
    dark: false,
    draw: (ctx, b) => {
      envGround(ctx, F, "band", { w: b.W, h: b.H });
      leaves(ctx, F, b.W, b.H, [C.olive, C.clay, C.oliveBright], b.tall ? 30 : 26);
    },
  },
  {
    id: "iris-dusk",
    title: "Iris, dusk",
    group: "scene",
    family: "iris",
    dark: false,
    draw: (ctx, b) => {
      envGround(ctx, F, "base", { w: b.W, h: b.H });
      stars(ctx, F, b.W, b.H * 0.55, C.clay, 34, 23, 1);
      moon(ctx, b.W * (b.tall ? 0.7 : 0.4), b.H * (b.tall ? 0.24 : 0.22), 46, C.peach, C.linen);
    },
  },
  {
    id: "midnight-rain",
    title: "Midnight, rain",
    group: "scene",
    family: "midnight",
    dark: true,
    draw: (ctx, b) => envGround(ctx, F, "deep", { w: b.W, h: b.H, fieldAlpha: 0.05 }),
    over: (ctx, b) => rain(ctx, F, b.W, b.H, C.nightText, b.tall ? 140 : 120),
  },
  {
    id: "files-flying",
    title: "Files in flight",
    group: "scene",
    family: "rotli",
    dark: false,
    draw: (ctx, b) => {
      envGround(ctx, F, "base", { w: b.W, h: b.H, field: false });
      fileFlight(ctx, { w: b.W, h: b.H, ink: C.cocoa, seed: 11 });
    },
  },
  {
    id: "files-flying-night",
    title: "Files in flight, night",
    group: "scene",
    family: "rotli",
    dark: true,
    draw: (ctx, b) => {
      envGround(ctx, F, "deep", { w: b.W, h: b.H, field: false });
      fileFlight(ctx, { w: b.W, h: b.H, ink: C.nightText, seed: 11, alpha: 0.18 });
    },
  },
  {
    id: "paper-studio",
    title: "Paper studio",
    group: "scene",
    family: "paper",
    dark: false,
    draw: (ctx, b) => {
      envGround(ctx, F, "base", { w: b.W, h: b.H, field: false });
      grid(ctx, b.W, b.H, C.cocoa);
      fileField(ctx, F, { w: b.W, h: b.H, alpha: 0.06 });
    },
  },
];
export const BACKGROUNDS: Background[] = [...PLAIN, ...SCENES];
export const backgroundOf = (id: string) => BACKGROUNDS.find((x) => x.id === id) ?? BACKGROUNDS[0]!;

// ---------------------------------------------------------------- the quokka
export const EMOTIONS = LOOKS.emotions;
export const COLOURS = LOOKS.styles.map((id) => ({ id, label: STYLE_NAME[id] ?? id }));
export const ACCESSORIES = LOOKS.accessories;
export type Place = "left" | "centre" | "right";
export type Size = "small" | "medium" | "large";
export const PLACES: Place[] = ["left", "centre", "right"];
export const SIZES: Size[] = ["small", "medium", "large"];
/** what it wears is coloured the app's way: oklch(70% 0.15 hue); the app's default hue is 38 */
export const ACCESSORY_HUES = [
  { hue: 38, label: "Tangerine" },
  { hue: 20, label: "Coral" },
  { hue: 85, label: "Mustard" },
  { hue: 145, label: "Green" },
  { hue: 200, label: "Teal" },
  { hue: 255, label: "Blue" },
  { hue: 300, label: "Violet" },
  { hue: 350, label: "Pink" },
];
export type QuokkaSpec = { pose: string; style: string; accessory: string; hue: number; place: Place; size: Size };
export type WallpaperSpec = { background: string; quokka: QuokkaSpec | null };

/** the look file for a quokka on a background: the line style has a white-ink render for dark grounds */
export const lookId = (q: Pick<QuokkaSpec, "pose" | "style" | "accessory">, dark: boolean) =>
  `${q.pose}-${q.style}-${q.accessory}${dark && LOOKS.darkVariants.includes(q.style) ? "-dark" : ""}`;
export const lookFile = (id: string) => `library/wallpaper-looks/${id}.${LOOKS.format}`;
/** the colour mask for a filled accessory (line quokkas wear outline accessories, with no colour to change) */
export const maskId = (q: Pick<QuokkaSpec, "pose" | "style" | "accessory">) =>
  q.accessory !== "none" && q.style !== "line" ? `tint-${q.pose}-${q.accessory}` : null;

/** oklch(L C h) -> sRGB hex (CSS Color 4's OKLab matrices), so every browser and the golden get the same colour */
export const oklchHex = (L: number, Cc: number, h: number) => {
  const a = Cc * Math.cos((h * Math.PI) / 180),
    b = Cc * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3,
    m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3,
    s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lin = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return `#${lin
    .map((c) => {
      const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.max(c, 0) ** (1 / 2.4) - 0.055;
      return Math.round(Math.min(1, Math.max(0, v)) * 255)
        .toString(16)
        .padStart(2, "0");
    })
    .join("")}`;
};
export const accessoryHex = (hue: number) => oklchHex(0.7, 0.15, hue);

/** the look with its accessory coloured: the white accessory multiplied by the hue through its mask (ink stays
 *  black), cached per look and hue */
const tintedLook = (env: Env, id: string, mask: string, hue: number) => {
  const key = `tinted:${id}:${hue}`,
    hit = env.cache.get(key) as CanvasImageSource | undefined;
  if (hit) return hit;
  const look = env.image?.(`look:${id}`) as (CanvasImageSource & { width: number }) | undefined,
    m = env.image?.(`look:${mask}`);
  if (!look || !m) throw new Error(`look ${id} or its mask ${mask} not loaded`);
  const N = look.width,
    L = env.canvas(N, N),
    T = env.canvas(N, N);
  L.ctx.drawImage(look, 0, 0);
  T.ctx.drawImage(m, 0, 0, N, N);
  T.ctx.globalCompositeOperation = "source-in";
  T.ctx.fillStyle = accessoryHex(hue);
  T.ctx.fillRect(0, 0, N, N);
  L.ctx.globalCompositeOperation = "multiply";
  L.ctx.drawImage(T.canvas, 0, 0);
  env.cache.set(key, L.canvas);
  return L.canvas;
};

// feet low on the screen and the height as a share of the short side; phones get a taller figure, set a little
// higher (clear of the home bar), and every place stays inside the bands the header names
const HEIGHT: Record<Size, [number, number]> = { small: [0.2, 0.3], medium: [0.27, 0.38], large: [0.36, 0.48] };
const PLACE_X: Record<Place, [number, number]> = { left: [0.28, 0.3], centre: [0.5, 0.5], right: [0.72, 0.7] };
export const placement = (b: Box, q: Pick<QuokkaSpec, "place" | "size">) => {
  const t = b.tall ? 1 : 0;
  return { x: b.W * PLACE_X[q.place][t], y: b.H * (b.tall ? 0.84 : 0.88), h: Math.min(b.W, b.H) * HEIGHT[q.size][t] };
};

/** one wallpaper, drawn in design units (the caller's ctx already carries env.scale); env.image must supply
 *  `look:<lookId>` when the spec has a quokka */
export const paintWallpaper = (ctx: Ctx, env: Env, spec: WallpaperSpec, b: Box) => {
  const bg = backgroundOf(spec.background);
  useFamily(bg.family); // every wallpaper sets its own palette first, so any order draws the same
  bg.draw(ctx, b);
  if (spec.quokka) {
    const id = lookId(spec.quokka, bg.dark),
      mask = maskId(spec.quokka),
      tinted = mask ? tintedLook(env, id, mask, spec.quokka.hue) : null,
      withTint: Env = tinted ? { ...env, image: (n) => (n === `look:${id}` ? tinted : env.image?.(n)) } : env;
    drawLook(ctx, withTint, { id, ...placement(b, spec.quokka), blink: false });
  }
  bg.over?.(ctx, b);
};

// ---------------------------------------------------------------- presets
const q = (pose: string, style: string, accessory: string, place: Place = "left", size: Size = "medium", hue = 38) => ({
  pose,
  style,
  accessory,
  hue,
  place,
  size,
});
export const PRESETS: { id: string; title: string; spec: WallpaperSpec }[] = [
  {
    id: "island-morning",
    title: "Island, morning",
    spec: { background: "island-morning", quokka: q("base", "cocoa", "none", "centre") },
  },
  {
    id: "island-sunset",
    title: "Island, sunset",
    spec: { background: "island-sunset", quokka: q("waving", "cocoa", "bucket-hat", "right") },
  },
  {
    id: "lighthouse-night",
    title: "Night, the lighthouse",
    spec: { background: "lighthouse-night", quokka: q("rest", "cocoa", "none") },
  },
  {
    id: "ocean-tide",
    title: "Ocean, the tide line",
    spec: { background: "ocean-tide", quokka: q("thoughtful", "ocean", "glasses", "left", "medium", 20) },
  },
  {
    id: "grove-leaves",
    title: "Grove, falling leaves",
    spec: { background: "grove-leaves", quokka: q("listening", "green", "bucket-hat") },
  },
  { id: "iris-dusk", title: "Iris, dusk", spec: { background: "iris-dusk", quokka: q("celebrating", "iris", "none") } },
  {
    id: "midnight-rain",
    title: "Midnight, rain",
    spec: { background: "midnight-rain", quokka: q("base", "line", "goggles") },
  },
  {
    id: "paper-studio",
    title: "Paper studio",
    spec: { background: "paper-studio", quokka: q("base", "line", "glasses") },
  },
  {
    id: "files-flying",
    title: "Files in flight",
    spec: { background: "files-flying", quokka: q("walking", "cocoa", "goggles", "left", "medium", 200) },
  },
  {
    id: "linen",
    title: "Linen, hello",
    spec: { background: "plain-light", quokka: q("waving", "cocoa", "none", "centre", "small") },
  },
  { id: "charcoal", title: "Charcoal, nothing else", spec: { background: "plain-charcoal", quokka: null } },
];

// ---------------------------------------------------------------- films: the golden check draws every preset
const BEAT = 15;
const screenFilm = (screen: WallpaperScreen): Film => {
  const b = boxOf(screen),
    ids = [
      ...new Set(
        PRESETS.flatMap((p) =>
          p.spec.quokka
            ? [lookId(p.spec.quokka, backgroundOf(p.spec.background).dark), maskId(p.spec.quokka)].filter(
                (x): x is string => x !== null,
              )
            : [],
        ),
      ),
    ];
  return {
    meta: {
      title: `wallpapers-${screen}`,
      W: b.W,
      H: b.H,
      fps: 30,
      bpm: 120,
      durationFrames: PRESETS.length * BEAT,
      raster: "cpu",
    },
    assets: { images: Object.fromEntries(ids.map((id) => [`look:${id}`, `../${lookFile(id)}`])), fonts: FONTS },
    shots: PRESETS.map((p, i) => ({
      id: p.id,
      start: i * BEAT,
      end: (i + 1) * BEAT,
      draw: (ctx, _l, env) => {
        ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
        paintWallpaper(ctx, env, p.spec, b);
      },
    })),
  };
};

export const wallpapersMac = screenFilm("mac");
export const wallpapersDisplay = screenFilm("display");
export const wallpapersIpad = screenFilm("ipad");
export const wallpapersIphone = screenFilm("iphone");
export const wallpapersAndroid = screenFilm("android");
