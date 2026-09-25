// EPISODE 04 · MAKE IT YOURS — "Six themes. Seven quokkas." (30 s, 1920x1080)
// Story: the same note in all twelve environments (colours from the app's CSS); then the companion
// panel: the pointer picks colours, glasses, a hat (looks rendered by the app's own <Character>);
// then the switch: the companion is optional. Turn: frame 330 (from the app to the character).
import type { Ctx, Env } from "./core";
import type { Film } from "./film";
import { C, easeInOut, fillRR, measure, pop, seg, sparkle, text } from "./rotli/kit";
import type { DeriveSpec } from "./studio/derive";
import { drawLook } from "./studio/look";
import { makeScore, PENTA } from "./studio/score2";
import { drift, endCard, ground, host, lowerThird, titleCard, END, TITLE } from "./studio/series";
import { FONTS, STYLE_HEX, STYLE_NAME, THEME_LIST, lookAssets, type Theme } from "./studio/stage";
import { appFrame, heading, link, pointer, tagChip, task } from "./studio/ui";

const TOTAL = 900,
  DEMO_END = TOTAL - END,
  TH0 = 95,
  EACH = 20,
  TH_END = TH0 + EACH * 12; // 95..335
const STY = ["cocoa", "green", "ocean", "iris", "berry", "amber"];
const PICKS: [number, string, number, number][] = [
  // [frame, look id, style index, accessory 0 none 1 glasses 2 hat]
  [360, "base-cocoa", 1, 0],
  [392, "base-green", 2, 0],
  [414, "base-ocean", 3, 0],
  [436, "base-iris", 4, 0],
  [458, "base-berry", 5, 0],
  [480, "base-amber", 6, 0],
  [510, "base-cocoa-glasses", 1, 1],
  [545, "base-cocoa-hat", 1, 2],
];
const OFF = 640,
  ON = 700;

const note = (ctx: Ctx, th: Theme, f: number) => {
  const E = appFrame(
    ctx,
    th,
    { x: 250, y: 150, w: 1420, h: 720 },
    { notes: ["Trip plan", "Ferry times", "Reading list"], active: 0, title: "trip-plan.md" },
  );
  heading(ctx, th, E.x, E.y + 90, "Trip plan", 64);
  task(ctx, th, E.x, E.y + 180, "x", "book the ferry", { size: 34 });
  task(ctx, th, E.x, E.y + 246, "/", "pack a snorkel", { size: 34 });
  task(ctx, th, E.x, E.y + 312, " ", "find the pink lake", { size: 34 });
  link(ctx, th, E.x, E.y + 400, "see ", "Rottnest", 1, 34);
  tagChip(ctx, th, E.x, E.y + 480, "#travel", 28);
  void f;
};
const themes = (ctx: Ctx, env: Env, l: number) => {
  const i = Math.max(0, Math.min(11, Math.floor((l - TH0) / EACH))),
    k = Math.max(0, l - TH0 - i * EACH),
    draw = (t: Theme) => {
      ctx.fillStyle = t.roles.ground;
      ctx.fillRect(-120, -120, 2160, 1320);
      note(ctx, t, l);
      fillRR(ctx, 250, 60, measure(ctx, t.label, 36, 600) + 60, 64, 32, t.roles.tint);
      text(ctx, t.label, 280, 104, { size: 36, weight: 600, color: t.roles["accent-text"] });
    };
  draw(THEME_LIST[i === 0 || k >= 8 ? i : i - 1]);
  if (i > 0 && k < 8) {
    const p = easeInOut(k / 8),
      e = -1080 + p * (1920 + 2160);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(e - 1080, 1080);
    ctx.lineTo(e, 0);
    ctx.lineTo(-10, 0);
    ctx.lineTo(-10, 1080);
    ctx.closePath();
    ctx.clip();
    draw(THEME_LIST[i]);
    ctx.restore();
  }
  void env;
};
const companion = (ctx: Ctx, env: Env, l: number) => {
  let cur = PICKS[0];
  for (const p of PICKS) if (l >= p[0]) cur = p;
  const since = l - cur[0],
    off = l >= OFF && l < ON;
  // the panel
  const px = 170,
    py = 190;
  fillRR(ctx, px + 10, py + 16, 820, 640, 26, "rgba(58,48,40,0.12)");
  fillRR(ctx, px, py, 820, 640, 26, C.surface, C.ink, 4);
  text(ctx, "Companion", px + 50, py + 80, { size: 44, weight: 600 });
  text(ctx, "Color", px + 50, py + 170, { size: 30, weight: 600, color: C.muted });
  ["line", ...STY].forEach((s, i) => {
    const cx = px + 90 + i * 104,
      on = i === cur[2];
    if (on) fillRR(ctx, cx - 44, py + 196, 88, 88, 44, C.peach);
    ctx.beginPath();
    ctx.arc(cx, py + 240, 30, 0, 6.29);
    ctx.fillStyle = STYLE_HEX[s];
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = C.ink;
    ctx.stroke();
  });
  text(ctx, STYLE_NAME[["line", ...STY][cur[2]]], px + 50, py + 340, { size: 32, weight: 600 });
  text(ctx, "Wear", px + 50, py + 420, { size: 30, weight: 600, color: C.muted });
  let ax = px + 50;
  ["none", "glasses", "bucket hat"].forEach((a, i) => {
    const w = measure(ctx, a, 30, 600) + 50,
      on = i === cur[3];
    fillRR(ctx, ax, py + 446, w, 62, 31, on ? C.peach : C.surface, on ? C.clay : C.border, 3);
    text(ctx, a, ax + w / 2, py + 488, { size: 30, weight: 600, align: "center", color: on ? C.clayText : C.muted });
    ax += w + 18;
  });
  // the switch
  const sw = l >= OFF && l < ON ? 1 : l >= ON ? 0 : 0,
    sx = px + 50;
  text(ctx, "Show companion", sx, py + 590, { size: 30, weight: 600 });
  const knob = l < OFF ? 1 : l < ON ? 1 - seg(l, OFF, OFF + 6) : seg(l, ON, ON + 6);
  fillRR(ctx, px + 640, py + 556, 110, 56, 28, knob > 0.5 ? C.olive : C.border);
  ctx.beginPath();
  ctx.arc(px + 668 + 54 * knob, py + 584, 22, 0, 6.29);
  ctx.fillStyle = C.surface;
  ctx.fill();
  void sw;
  // the quokka: the look the app draws, popping on every change
  if (!off) {
    const sq = since < 8 ? 1 - 0.12 * Math.sin((since / 8) * Math.PI) : 1,
      back = l >= ON ? pop(seg(l, ON, ON + 16)) : 1;
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = C.cocoa;
    ctx.beginPath();
    ctx.ellipse(1440, 942, 220, 34, 0, 0, 6.29);
    ctx.fill();
    ctx.restore();
    drawLook(ctx, env, {
      id: l >= ON ? "celebrating-cocoa" : cur[1],
      x: 1440,
      y: 940,
      h: 900 * back,
      squash: sq,
      f: l,
      lean: Math.sin(l / 8) * 2,
    });
    if (since < 14 && l >= PICKS[0][0])
      for (let i = 0; i < 6; i++) {
        const a = i * 1.05 + l * 0.1;
        sparkle(
          ctx,
          1440 + Math.cos(a) * (260 + since * 12),
          560 + Math.sin(a) * (300 + since * 8),
          20 * (1 - since / 14),
          i % 2 ? C.clay : C.peach,
          l / 6,
        );
      }
  } else {
    const k = seg(l, OFF, OFF + 12);
    if (k < 1)
      for (let i = 0; i < 8; i++) {
        const a = i * 0.8;
        sparkle(ctx, 1440 + Math.cos(a) * 200 * k, 600 + Math.sin(a) * 200 * k, 26 * (1 - k), C.peach, l / 5);
      }
    text(ctx, "your notes, uninterrupted", 1440, 620 + Math.sin(l / 6) * 8, {
      size: 34,
      weight: 500,
      align: "center",
      color: C.muted,
      alpha: seg(l, OFF + 10, OFF + 22),
    });
  }
  // pointer: to each swatch / button / the switch
  const targets: [number, number, number][] = [
    [335, 1300, 900],
    ...PICKS.map(
      ([f, , s, a]) =>
        [
          f - 6,
          a === 0 ? px + 90 + s * 104 : a === 1 ? px + 50 + 80 + 10 : px + 50 + 290 + 60,
          a === 0 ? py + 244 : py + 480,
        ] as [number, number, number],
    ),
    [OFF - 8, px + 695, py + 588],
    [ON - 8, px + 695, py + 588],
    [760, 1300, 1000],
  ];
  let p = { x: targets[0][1], y: targets[0][2] };
  for (let i = 1; i < targets.length; i++) {
    const [f0, x0, y0] = targets[i - 1],
      [f1, x1, y1] = targets[i];
    if (l >= f0 && l < f1) {
      const kk = easeInOut((l - f0) / (f1 - f0));
      p = { x: x0 + (x1 - x0) * kk, y: y0 + (y1 - y0) * kk };
      break;
    }
    if (l >= f1) p = { x: x1, y: y1 };
  }
  const clickAt = [...PICKS.map((q) => q[0] - 4), OFF - 2, ON - 2].find((c) => l >= c && l < c + 12);
  pointer(ctx, p.x, p.y, clickAt !== undefined ? (l - clickAt) / 12 : 0);
};

const demo = (ctx: Ctx, l: number, env: Env) => {
  ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
  if (l >= TH_END) ground(ctx, l);
  drift(ctx, env, l, 0.8);
  if (l < TH_END) {
    themes(ctx, env, l);
    host(ctx, env, l, { dark: THEME_LIST[Math.max(0, Math.min(11, Math.floor((l - TH0) / EACH)))].mode === "dark" });
  } else companion(ctx, env, l);
  ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
  lowerThird(ctx, l, 100, TH_END, "Six themes, light and dark.", "Every one tuned, every one yours.");
  lowerThird(ctx, l, TH_END + 20, 620, "Pick your companion.", "Seven colors, glasses, a bucket hat.");
  lowerThird(ctx, l, 632, DEMO_END, "Or turn it off.", "The quokka is optional. The calm isn't.");
};
export const ep04Yours: Film = {
  meta: { title: "ep04Yours", W: 1920, H: 1080, fps: 30, bpm: 120, durationFrames: TOTAL, raster: "cpu" },
  assets: {
    images: lookAssets([
      "base-cocoa",
      ...STY.slice(1).map((s) => `base-${s}`),
      "base-cocoa-glasses",
      "base-cocoa-hat",
      "celebrating-cocoa",
    ]),
    fonts: FONTS,
  },
  shots: [
    {
      id: "title",
      start: 0,
      end: TITLE,
      draw: (c, l, e) => {
        c.setTransform(e.scale, 0, 0, e.scale, 0, 0);
        titleCard(c, e, l, l, { no: 4, title: ["Make it yours."], pose: "waving" });
      },
    },
    { id: "themes", start: TITLE, end: 330, draw: (c, l, e) => demo(c, l + TITLE, e) },
    { id: "companion", start: 330, end: DEMO_END, draw: (c, l, e) => demo(c, l + 330, e) },
    {
      id: "end",
      start: DEMO_END,
      end: TOTAL,
      draw: (c, l, e) => {
        c.setTransform(e.scale, 0, 0, e.scale, 0, 0);
        endCard(c, e, DEMO_END + l, l, { pose: "celebrating" });
      },
    },
  ],
  audio: makeScore({
    frames: TOTAL,
    energeticFrom: 120,
    endAt: 780,
    bellAt: [DEMO_END],
    pops: [
      ...THEME_LIST.map((_, i) => [TH0 + i * EACH, PENTA[i % PENTA.length]] as [number, number]),
      ...PICKS.map(([f], i) => [f, PENTA[(i + 3) % PENTA.length]] as [number, number]),
      [OFF, 72],
      [ON, 96],
    ],
  }),
};
export const ep04Derive: DeriveSpec = {
  no: 4,
  series: "yours",
  vertical: [
    {
      frame: 95,
      len: 240,
      crop: { x: 240, y: 50, w: 1440, h: 830 },
      title: "Six themes.",
      sub: "Light and dark, each tuned.",
      hi: "themes",
    },
    {
      frame: 350,
      len: 225,
      crop: { x: 1040, y: 60, w: 800, h: 900 },
      title: "Pick your companion.",
      sub: "Seven colors, glasses, a hat.",
      hi: "companion",
    },
    { frame: 630, len: 90, crop: { x: 160, y: 180, w: 840, h: 660 }, title: "Or turn it off.", hi: "off" },
  ],
  slides: [
    {
      frame: 150,
      crop: { x: 240, y: 50, w: 1440, h: 830 },
      title: "Six themes.",
      sub: "Light and dark, each tuned.",
      hi: "themes",
    },
    { frame: 330, crop: { x: 240, y: 50, w: 1440, h: 830 }, title: "Midnight, too.", hi: "Midnight" },
    { frame: 490, crop: { x: 1040, y: 60, w: 800, h: 900 }, title: "Seven colors.", hi: "colors" },
    { frame: 600, crop: { x: 1040, y: 60, w: 800, h: 900 }, title: "Add a hat.", hi: "hat" },
  ],
  single: {
    frame: 600,
    crop: { x: 160, y: 140, w: 1700, h: 720 },
    title: "Make it yours.",
    sub: "Six themes. Seven quokkas.",
    hi: "yours",
  },
};
