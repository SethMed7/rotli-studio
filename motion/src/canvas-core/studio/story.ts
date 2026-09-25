// STORY — the thin scene engine and the story templates for Season One.
//
//   export const s01e01: Film = story({ id, no, title, atmosphere, scenes: [...], score, next })
//
// A scene is { id, len (a multiple of 15), atm?, transition?, draw(ctx, env, S) }. The engine computes
// the starts (asserting the beat grid), and for every frame: applies the scene's atmosphere (family
// colours, ground, drift, front ambient), calls the scene's draw with a context S, and runs the entry
// transition (cut, dip to ground, or the diagonal wipe). Templates below are plain functions scenes call.
import type { Ctx, Env } from "../core";
import type { Film } from "../film";
import { actor } from "../rotli/actor";
import {
  BRAND,
  C,
  FONT,
  HAS_CHARACTER,
  TRACK,
  TRACK_CAPTION,
  backOut,
  easeInOut,
  easeOut,
  fillRR,
  ink,
  measure,
  pop,
  seg,
  text,
} from "../rotli/kit";
import { POSES, type PoseName } from "../quokka/poses";
import { atmosphere, type Atmosphere } from "./atmospheres";
import { lockup } from "./brandmarks";
import { drawLook } from "./look";
import { makeScore, type ScoreSpec } from "./score2";
import { drift, host } from "./series";
import { FONTS, LOOK, lookAssets } from "./stage";
import { DARK, LIGHT, useFamilyUI } from "./ui";

export const W = 1920,
  H = 1080;
export type S = {
  l: number;
  f: number;
  len: number;
  atm: Atmosphere;
  dark: boolean;
  t: (a: number, b: number) => number;
};
export type Scene = {
  id: string;
  len: number;
  atm?: string;
  transition?: "cut" | "dip" | "wipe";
  draw: (ctx: Ctx, env: Env, s: S) => void;
};
export type StorySpec = {
  id: string;
  no: number;
  title: string;
  atmosphere: string;
  scenes: Scene[];
  score?: Partial<ScoreSpec>;
  looks?: string[];
  season?: string;
};

const apply = (a: Atmosphere) => useFamilyUI(a.family);
const frameOf = (ctx: Ctx, env: Env, sc: Scene, local: number, f: number, fallback: string) => {
  const a = atmosphere(sc.atm ?? fallback);
  apply(a);
  ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
  a.ground(ctx, f, W, H);
  ctx.save();
  drift(ctx, env, f, a.drift);
  sc.draw(ctx, env, { l: local, f, len: sc.len, atm: a, dark: a.dark, t: (x, y) => seg(local, x, y) });
  ctx.restore();
  ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
  a.front?.(ctx, f, W, H);
};

export const story = (sp: StorySpec): Film => {
  let t = 0;
  const starts = sp.scenes.map((s) => {
    if (s.len % 15) throw new Error(`${sp.id}: scene '${s.id}' is ${s.len} frames, not a multiple of 15`);
    const st = t;
    t += s.len;
    return st;
  });
  const shots = sp.scenes.map((sc, i) => ({
    id: sc.id,
    start: starts[i],
    end: starts[i] + sc.len,
    draw: (ctx: Ctx, local: number, env: Env) => {
      const f = starts[i] + local;
      frameOf(ctx, env, sc, local, f, sp.atmosphere);
      const tr = sc.transition ?? (i ? "dip" : "cut");
      if (i && tr === "dip" && local < 10) {
        const a = atmosphere(sc.atm ?? sp.atmosphere);
        ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
        ctx.globalAlpha = 1 - easeOut(local / 10);
        ctx.fillStyle = a.dark ? C.night : C.linen;
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;
      }
      if (i && tr === "wipe" && local < 12) {
        // the previous scene's last frame, wiped away diagonally by the new one
        const prev = sp.scenes[i - 1],
          L = env.canvas(Math.round(W * env.scale), Math.round(H * env.scale)),
          p = easeInOut(local / 12),
          e = -H + p * (W + H * 2);
        frameOf(L.ctx, env, prev, prev.len - 1, starts[i] - 1, sp.atmosphere);
        frameOf(ctx, env, sc, local, f, sp.atmosphere);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.save();
        ctx.beginPath();
        ctx.moveTo((e - H) * env.scale, H * env.scale);
        ctx.lineTo(e * env.scale, 0);
        ctx.lineTo(W * env.scale + 10, 0);
        ctx.lineTo(W * env.scale + 10, H * env.scale);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(L.canvas, 0, 0);
        ctx.restore();
        ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
        ctx.strokeStyle = C.clay;
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(e - H, H);
        ctx.lineTo(e, 0);
        ctx.stroke();
      }
    },
  }));
  const a0 = atmosphere(sp.atmosphere);
  return {
    meta: {
      title: sp.id,
      W,
      H,
      fps: 30,
      bpm: 120,
      durationFrames: t,
      raster: "cpu",
      family: atmosphere(sp.atmosphere).family,
    },
    assets: { images: lookAssets(sp.looks ?? []), fonts: FONTS },
    shots,
    audio: makeScore({ frames: t, endAt: Math.floor(t / 60) * 60 - 60, bellAt: [t - 150], ...a0.score, ...sp.score }),
  };
};
/** the frame where a scene starts, for cue tables and derive specs */
export const sceneStart = (scenes: Scene[], id: string) => {
  let t = 0;
  for (const s of scenes) {
    if (s.id === id) return t;
    t += s.len;
  }
  throw new Error(`no scene ${id}`);
};

// ================================================================ TEMPLATES
/** an intertitle: the story's words, centred, tight, the key word underlined in the accent */
export const intertitle = (
  ctx: Ctx,
  s: S,
  lines: string[],
  o: { hi?: string; y?: number; size?: number; sub?: string; t0?: number } = {},
) => {
  const size = o.size ?? 88,
    col = s.dark ? C.nightText : C.cocoa,
    y0 = o.y ?? 540 - ((lines.length - 1) * size * 1.12) / 2 + size * 0.3,
    t0 = o.t0 ?? 0;
  lines.forEach((ln, i) => {
    const k = easeOut(seg(s.l, t0 + i * 6, t0 + i * 6 + 16));
    if (k <= 0) return;
    const sp = size * TRACK_CAPTION,
      y = y0 + i * size * 1.12 + (1 - k) * 24,
      w = measure(ctx, ln, size, 600, FONT.display, sp);
    text(ctx, ln, W / 2, y, {
      size,
      weight: 600,
      align: "center",
      color: col,
      alpha: k,
      spacing: sp,
      font: FONT.display,
    });
    if (o.hi && ln.includes(o.hi)) {
      const x0 = W / 2 - w / 2 + measure(ctx, ln.slice(0, ln.indexOf(o.hi)), size, 600, FONT.display, sp),
        hw = measure(ctx, o.hi, size, 600, FONT.display, sp);
      ink(
        ctx,
        [
          [x0, y + size * 0.2],
          [x0 + hw, y + size * 0.18],
        ],
        {
          w: size * 0.08,
          color: s.dark ? C.oliveBright : C.clay,
          seed: 90 + i,
          frame: s.f,
          progress: seg(s.l, t0 + i * 6 + 12, t0 + i * 6 + 30),
        },
      );
    }
  });
  if (o.sub)
    text(ctx, o.sub, W / 2, y0 + lines.length * size * 1.12 + 10, {
      size: 36,
      weight: 500,
      align: "center",
      color: s.dark ? C.nightMuted : C.muted,
      alpha: seg(s.l, t0 + 20, t0 + 34),
    });
};

/** the chapter card: "Season One · 03", the title, the pose */
export const chapterCard = (
  ctx: Ctx,
  env: Env,
  s: S,
  o: { no: number; title: string[]; pose: PoseName; season?: string; body?: string; line?: boolean },
) => {
  const col = s.dark ? C.nightText : C.cocoa,
    k = s.t(0, 14),
    tag = `${o.season ?? `${BRAND.product} · Season One`}  ·  ${String(o.no).padStart(2, "0")}`,
    tw = measure(ctx, tag, 28, 600) + 48;
  fillRR(
    ctx,
    160,
    296 - 8 * (1 - k),
    tw,
    56,
    28,
    s.dark ? C.nightSurface2 : C.surface,
    s.dark ? C.nightBorder : C.ink,
    3,
  );
  text(ctx, tag, 184, 334 - 8 * (1 - k), { size: 28, weight: 600, color: col, alpha: k });
  o.title.forEach((ln, i) => {
    const kk = s.t(6 + i * 6, 22 + i * 6);
    text(ctx, ln, 160, 480 + i * 118 + (1 - kk) * 30, {
      size: 112,
      weight: 600,
      color: col,
      alpha: kk,
      spacing: 112 * TRACK,
      font: FONT.display,
    });
  });
  const last = o.title[o.title.length - 1],
    ly = 480 + (o.title.length - 1) * 118;
  ink(
    ctx,
    [
      [160, ly + 26],
      [160 + measure(ctx, last, 112, 600, FONT.display, 112 * TRACK), ly + 22],
    ],
    { w: 10, color: s.dark ? C.oliveBright : C.clay, seed: 5 + o.no, frame: s.f, progress: s.t(24, 48) },
  );
  const qx = Math.min(
      1720,
      Math.max(1480, 160 + Math.max(...o.title.map((t) => measure(ctx, t, 112, 600, FONT.display, 112 * TRACK))) + 300),
    ),
    sc = backOut(s.t(8, 26));
  if (sc > 0) {
    if (o.line) lineQuokka(ctx, s, { pose: o.pose, x: qx, y: 910, h: 660 * sc });
    else
      actor(ctx, env, s.f, {
        pose: o.pose,
        x: qx,
        y: 910,
        h: 660 * sc,
        lean: Math.sin(s.f / 9) * 2,
        body: o.body,
        shadowCol: s.dark ? "#000" : undefined,
      });
  }
};

// ---------------------------------------------------------------- pictographic thought bubbles (the quokka is mute)
export type Glyph =
  | "note"
  | "folder"
  | "lock"
  | "link"
  | "search"
  | "chat"
  | "board"
  | "doc"
  | "lighthouse"
  | "cloud"
  | "heart"
  | "sun"
  | "moon"
  | "key"
  | "question"
  | "check"
  | "globe"
  | "palette"
  | "tag"
  | "trash";
const glyph = (ctx: Ctx, g: Glyph, col: string, acc: string) => {
  ctx.save();
  ctx.strokeStyle = col;
  ctx.fillStyle = acc;
  ctx.lineWidth = 5;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  const P = (d: string, fill = false) => {
    const p = new Path2D(d);
    if (fill) ctx.fill(p);
    ctx.stroke(p);
  };
  switch (g) {
    case "note":
      P("M-22 -28h30l14 14v42h-44z M8 -28v14h14");
      P("M-12 -2h24 M-12 8h24 M-12 18h14");
      break;
    case "folder":
      P("M-30 -18h20l6 8h34v36h-60z", true);
      break;
    case "lock":
      P("M-14 -6v-10a14 14 0 0 1 28 0v10");
      P("M-22 -6h44v34h-44z", true);
      break;
    case "link":
      P("M-26 6a12 12 0 0 1 0-17l8-8a12 12 0 0 1 17 17 M26 -6a12 12 0 0 1 0 17l-8 8a12 12 0 0 1-17-17 M-8 8l16-16");
      break;
    case "search":
      P("M-6 -6m-16 0a16 16 0 1 0 32 0a16 16 0 1 0-32 0 M6 6l18 18");
      break;
    case "chat":
      P("M-28 -20h56v34h-30l-14 12v-12h-12z", true);
      break;
    case "board":
      P("M-30 -22h60v40h-60z M-18 -8h14v14h-14z M12 0m-8 0a8 8 0 1 0 16 0a8 8 0 1 0-16 0 M-2 -1h6");
      break;
    case "doc":
      P("M-20 -28h40v56h-40z");
      P("M-10 -14h20 M-10 -4h20 M-10 6h20 M-10 16h12");
      ctx.fillRect(-20, -28, 8, 56);
      break;
    case "lighthouse":
      P("M-10 26l4-40h12l4 40z M-12 -16h24 M-8 -16v-10h16v10 M-4 -26l4-6l4 6", true);
      break;
    case "cloud":
      P("M-24 12a12 12 0 0 1 2-24a16 16 0 0 1 30-4a12 12 0 0 1 18 14a10 10 0 0 1-4 14z");
      break;
    case "heart":
      P("M0 22l-24-24a13 13 0 0 1 24-14a13 13 0 0 1 24 14z", true);
      break;
    case "sun":
      P("M0 0m-12 0a12 12 0 1 0 24 0a12 12 0 1 0-24 0", true);
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        P(`M${Math.cos(a) * 18} ${Math.sin(a) * 18}L${Math.cos(a) * 28} ${Math.sin(a) * 28}`);
      }
      break;
    case "moon":
      P("M8 -24a24 24 0 1 0 0 48a18 18 0 1 1 0-48z", true);
      break;
    case "key":
      P("M-14 0m-10 0a10 10 0 1 0 20 0a10 10 0 1 0-20 0 M-4 0h30 M18 0v10 M26 0v8");
      break;
    case "question":
      P("M-12 -12a12 12 0 1 1 18 10c-6 4-6 6-6 12 M0 22v2");
      break;
    case "check":
      P("M-20 2l14 14l26-28");
      break;
    case "globe":
      P("M0 0m-24 0a24 24 0 1 0 48 0a24 24 0 1 0-48 0 M-24 0h48 M0 -24c-12 12-12 36 0 48c12-12 12-36 0-48");
      break;
    case "palette":
      P("M0 -24a24 24 0 1 0 0 48c6 0 6-8 2-10c-4-4 0-10 6-10h8a8 8 0 0 0 8-8c0-12-10-20-24-20z");
      for (const [x, y] of [
        [-12, -8],
        [0, -14],
        [12, -8],
      ]) {
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 6.29);
        ctx.fill();
      }
      break;
    case "tag":
      P("M-26 -12v-12h24l26 26l-18 18l-32-32z M-16 -16m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0", true);
      break;
    case "trash":
      P("M-20 -16h40l-4 42h-32z M-26 -16h52 M-8 -26h16v10");
      break;
  }
  ctx.restore();
};
/** a thought bubble rising from (x, y) (the quokka's head) holding a glyph; `t` 0..1 builds it */
export const thought = (
  ctx: Ctx,
  s: S,
  x: number,
  y: number,
  g: Glyph,
  t: number,
  o: { side?: 1 | -1; scale?: number } = {},
) => {
  if (t <= 0) return;
  const side = o.side ?? 1,
    k = pop(t),
    sc = o.scale ?? 1,
    bx = x + side * 70 * sc,
    by = y - 150 * sc,
    bob = Math.sin(s.f / 14) * 4;
  ctx.save();
  const fill = s.dark ? C.nightSurface2 : C.surface,
    line = s.dark ? C.nightMuted : C.ink; // dark: a lighter rim so the bubble reads on the deep band
  [
    [x + side * 18 * sc, y - 18 * sc, 7],
    [x + side * 38 * sc, y - 50 * sc, 11],
  ].forEach(([cx, cy, r], i) => {
    if (t > 0.15 + i * 0.15) {
      ctx.beginPath();
      ctx.arc(cx, cy, r * sc, 0, 6.29);
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = line;
      ctx.stroke();
    }
  });
  ctx.translate(bx, by + bob);
  ctx.scale(sc * k, sc * k);
  ctx.beginPath();
  ctx.ellipse(0, 0, 78, 62, 0, 0, 6.29);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = line;
  ctx.stroke();
  glyph(ctx, g, s.dark ? C.nightText : C.cocoa, s.dark ? C.oliveBright : C.clay);
  ctx.restore();
};
export { glyph };

// ---------------------------------------------------------------- the cast
/** the Librarian: the Fern quokka in glasses, drawn by the app's own <Character> (looks: *-green-glasses) */
export const LIBRARIAN_LOOKS = [
  "base-green-glasses",
  "thoughtful-green-glasses",
  "listening-green-glasses",
  "knowledge-green-glasses",
  "celebrating-green-glasses",
  "waving-green-glasses",
];
export const librarian = (
  ctx: Ctx,
  env: Env,
  s: S,
  o: {
    x: number;
    y: number;
    h?: number;
    pose?: "base" | "thoughtful" | "listening" | "knowledge" | "celebrating" | "waving";
    flip?: boolean;
    squash?: number;
  },
) => {
  ctx.save();
  ctx.globalAlpha = s.dark ? 0.35 : 0.18;
  ctx.fillStyle = s.dark ? "#000" : C.cocoa;
  ctx.beginPath();
  ctx.ellipse(o.x, o.y + 2, (o.h ?? 420) * 0.2, (o.h ?? 420) * 0.035, 0, 0, 6.29);
  ctx.fill();
  ctx.restore();
  drawLook(ctx, env, {
    id: `${o.pose ?? "base"}-green-glasses`,
    x: o.x,
    y: o.y,
    h: o.h ?? 420,
    f: s.f,
    flip: o.flip,
    squash: o.squash,
    lean: Math.sin(s.f / 12) * 1.5,
  });
};
/** the LINE style: the site's line-art quokka (one colour, no fill), for the privacy-band look */
export const lineQuokka = (
  ctx: Ctx,
  s: S,
  o: { pose?: PoseName; x: number; y: number; h: number; col?: string; lean?: number },
) => {
  if (!HAS_CHARACTER) return;
  const p = POSES[o.pose ?? "stays_local"],
    k = o.h / p.vb,
    bob = Math.sin(s.f / 16) * 3;
  ctx.save();
  ctx.translate(o.x, o.y + bob);
  ctx.rotate(((o.lean ?? Math.sin(s.f / 13) * 1.5) * Math.PI) / 180);
  ctx.translate(-o.h / 2, -o.h * 0.93);
  ctx.scale(k, k);
  if (p.tf) {
    ctx.translate(p.tf[0], p.tf[1]);
    ctx.scale(p.tf[2], p.tf[3]);
  }
  ctx.fillStyle = o.col ?? (s.dark ? C.nightText : C.cocoa);
  for (const d of p.d) ctx.fill(new Path2D(d), p.rule);
  ctx.restore();
};
export { actor, host, LIGHT, DARK, LOOK };

// ---------------------------------------------------------------- the end card with the next episode's title
export const storyEnd = (ctx: Ctx, env: Env, s: S, o: { next?: string; pose?: PoseName; line?: boolean }) => {
  lockup(ctx, 960, 360, s.t(0, 40), s.f, { s: 0.95, ink: s.dark ? C.nightText : undefined });
  if (o.next) {
    const k = s.t(30, 46),
      label = "Next",
      w = measure(ctx, o.next, 40, 600) + measure(ctx, label, 26, 600) + 90;
    ctx.save();
    ctx.globalAlpha = k;
    fillRR(ctx, 960 - w / 2, 640, w, 76, 38, s.dark ? C.nightSurface2 : C.surface, s.dark ? C.nightBorder : C.ink, 3);
    text(ctx, label, 960 - w / 2 + 32, 688, { size: 26, weight: 600, color: s.dark ? C.oliveBright : C.clay });
    text(ctx, o.next, 960 - w / 2 + 52 + measure(ctx, label, 26, 600), 690, {
      size: 40,
      weight: 600,
      color: s.dark ? C.nightText : C.cocoa,
    });
    ctx.restore();
  }
  const q = backOut(s.t(10, 28));
  if (q > 0) {
    if (o.line) lineQuokka(ctx, s, { pose: o.pose ?? "waving", x: 960, y: 1030, h: 230 * q });
    else
      actor(ctx, env, s.f, {
        pose: o.pose ?? "waving",
        x: 960,
        y: 1030,
        h: 230 * q,
        lean: Math.sin(s.f / 6) * 2,
        shadowCol: s.dark ? "#000" : undefined,
      });
  }
};
/** the dip colour / ground helpers re-exported for scene authors */
export { C, backOut, easeInOut, easeOut, fillRR, ink, measure, pop, seg, text };
