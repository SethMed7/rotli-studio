// DRESS UP — 16 s vertical short (1080x1920). "Make it yours": the companion cycles through the
// seven colours the app offers, puts on glasses and a bucket hat, parades mixed looks, and ends
// on the lineup + lockup. Every look is the app's REAL <Character> (brand/companions.json).
import type { Ctx, Env } from "./core";
import type { Film } from "./film";
import { C, backOut, easeOut, fillRR, lerp, measure, pop, seg, sparkle, text } from "./rotli/kit";
import { envGround, fileField } from "./studio/grounds";
import { lockup, caption } from "./studio/brandmarks";
import { drawLook } from "./studio/look";
import { makeScore, PENTA } from "./studio/score2";
import { FONTS, FORMATS, STYLE_HEX, STYLE_NAME, lookAssets } from "./studio/stage";

const [W, H] = FORMATS.story;
const STYLES = ["line", "cocoa", "green", "ocean", "iris", "berry", "amber"];
const PARADE: [string, string, number, number][] = [
  ["waving-berry-hat", "Berry · bucket hat", 5, 2],
  ["waving-green-glasses", "Fern · glasses", 2, 1],
  ["thoughtful-iris-glasses", "Iris · glasses", 4, 1],
  ["celebrating-ocean-hat", "Ocean · bucket hat", 3, 2],
  ["walking-amber-glasses", "Amber · glasses", 6, 1],
  ["listening-cocoa-hat", "Cocoa · bucket hat", 1, 2],
];
// cue table (frames): intro 0-30 · colours 30-135 (15 each) · accessories 135-195 · parade 195-375 · end 375-480
const T = { colours: 30, acc: 135, parade: 195, end: 375, total: 480 };
const lookAt = (l: number): { id: string; since: number; label: string; styleIdx: number; acc: number } => {
  if (l < T.acc) {
    const i = Math.max(0, Math.min(6, Math.floor((l - T.colours) / 15))),
      s0 = T.colours + i * 15;
    return {
      id: `base-${STYLES[i]}`,
      since: l < T.colours ? l : l - s0,
      label: STYLE_NAME[STYLES[i]],
      styleIdx: l < T.colours ? 0 : i,
      acc: 0,
    };
  }
  if (l < T.parade) {
    const g = l < 165;
    return {
      id: g ? "base-cocoa-glasses" : "base-cocoa-hat",
      since: l - (g ? 135 : 165),
      label: g ? "glasses" : "bucket hat",
      styleIdx: 1,
      acc: g ? 1 : 2,
    };
  }
  const i = Math.min(5, Math.floor((l - T.parade) / 30));
  return {
    id: PARADE[i][0],
    since: l - T.parade - i * 30,
    label: PARADE[i][1],
    styleIdx: PARADE[i][2],
    acc: PARADE[i][3],
  };
};

const draw = (ctx: Ctx, l: number, env: Env) => {
  ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
  const cur = lookAt(l),
    tint = STYLE_HEX[STYLES[cur.styleIdx]];
  // the site's base ground; the file field takes the colour you are trying on
  envGround(ctx, l, "base", { w: W, h: H, field: false });
  fileField(ctx, l, { w: W, h: H, ink: cur.styleIdx > 0 ? tint : C.cocoa, alpha: cur.styleIdx > 0 ? 0.35 : 0.09 });
  if (l < T.end) {
    caption(ctx, ["Make it yours."], W / 2, 250, seg(l, 0, 20), l, { size: 96, hi: "yours" });
    text(ctx, "your companion, your look", W / 2, 340, {
      size: 40,
      weight: 500,
      align: "center",
      color: C.muted,
      alpha: seg(l, 8, 24),
    });
    // the quokka: every swap pops (squash) and throws a few sparkles
    const k = cur.since,
      sq = k < 8 ? 1 - 0.12 * Math.sin((k / 8) * Math.PI) : 1,
      enter = l >= T.parade ? easeOut(seg(k, 0, 10)) : 1;
    const x = W / 2 + (1 - enter) * 420,
      intro = backOut(seg(l, 0, 18));
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = C.cocoa;
    ctx.beginPath();
    ctx.ellipse(W / 2, 1462, 250, 40, 0, 0, 6.29);
    ctx.fill();
    ctx.restore();
    drawLook(ctx, env, {
      id: cur.id,
      x,
      y: 1460,
      h: 1080 * intro,
      squash: sq,
      f: l,
      lean: l >= T.parade ? Math.sin(l / 7) * 2 : 0,
      flip: cur.id.startsWith("walking"),
    });
    if (k < 14 && l >= T.colours)
      for (let i = 0; i < 6; i++) {
        const a = i * 1.05 + l * 0.1;
        sparkle(
          ctx,
          W / 2 + Math.cos(a) * (300 + k * 14),
          900 + Math.sin(a) * (360 + k * 10),
          22 * (1 - k / 14),
          i % 2 ? C.clay : tint === "#ffffff" ? C.peach : tint,
          l / 6,
        );
      }
    // the name of what changed, big
    const nameK = pop(seg(k, 0, 10));
    ctx.save();
    ctx.translate(W / 2, 1600);
    ctx.scale(lerp(0.8, 1, nameK), lerp(0.8, 1, nameK));
    text(ctx, cur.label, 0, 0, {
      size: 66,
      weight: 600,
      align: "center",
      color: C.cocoa,
      alpha: Math.min(1, nameK * 1.5),
    });
    ctx.restore();
    // swatch row (colours) and accessory row: the current choice is a tinted pill, never a checkmark
    const sw = 118,
      x0 = W / 2 - (sw * 7) / 2 + sw / 2;
    STYLES.forEach((s, i) => {
      const cx = x0 + i * sw,
        on = i === cur.styleIdx;
      if (on) fillRR(ctx, cx - 48, 1668, 96, 96, 48, C.peach);
      ctx.beginPath();
      ctx.arc(cx, 1716, 32, 0, 6.29);
      ctx.fillStyle = STYLE_HEX[s];
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = C.ink;
      ctx.stroke();
    });
    const accs = ["none", "glasses", "bucket hat"];
    let ax = W / 2 - accs.reduce((w, a) => w + measure(ctx, a, 30, 600) + 70, 0) / 2;
    accs.forEach((a, i) => {
      const w = measure(ctx, a, 30, 600) + 48,
        on = i === cur.acc;
      fillRR(ctx, ax, 1790, w, 58, 29, on ? C.peach : C.surface, on ? C.clay : C.border, 3);
      text(ctx, a, ax + w / 2, 1830, { size: 30, weight: 600, align: "center", color: on ? C.clayText : C.muted });
      ax += w + 22;
    });
  } else {
    const e = l - T.end;
    lockup(ctx, W / 2, 400, seg(e, 30, 80), l, { s: 0.92, sub: "Pick a color. Add a hat." });
    STYLES.forEach((s, i) => {
      const row = i < 4 ? 0 : 1,
        n = row ? 3 : 4,
        idx = row ? i - 4 : i,
        x = W / 2 + (idx - (n - 1) / 2) * 250,
        y = row ? 1720 : 1260,
        t = pop(seg(e, i * 4, i * 4 + 14));
      if (t > 0)
        drawLook(ctx, env, {
          id: `base-${s}`,
          x,
          y,
          h: 430 * t,
          f: l + i * 11,
          squash: 1 + 0.03 * Math.sin((l + i * 9) / 5),
        });
    });
  }
};

export const dressUp: Film = {
  meta: { title: "dressUp", W, H, fps: 30, bpm: 120, durationFrames: T.total, raster: "cpu" },
  assets: {
    images: lookAssets([
      ...STYLES.map((s) => `base-${s}`),
      "base-cocoa-glasses",
      "base-cocoa-hat",
      ...PARADE.map((p) => p[0]),
    ]),
    fonts: FONTS,
  },
  shots: [
    { id: "intro", start: 0, end: 30, draw },
    { id: "colours", start: 30, end: T.acc, draw: (c, l, e) => draw(c, l + 30, e) },
    { id: "accessories", start: T.acc, end: T.parade, draw: (c, l, e) => draw(c, l + T.acc, e) },
    { id: "parade", start: T.parade, end: T.end, draw: (c, l, e) => draw(c, l + T.parade, e) },
    { id: "end", start: T.end, end: T.total, draw: (c, l, e) => draw(c, l + T.end, e) },
  ],
  audio: makeScore({
    frames: T.total,
    energeticFrom: 120,
    endAt: 420,
    bellAt: [T.end],
    pops: [
      ...STYLES.map((_, i) => [T.colours + i * 15, PENTA[i + 2]] as [number, number]),
      [135, 91],
      [165, 93],
      ...PARADE.map((_, i) => [T.parade + i * 30, PENTA[((i * 2) % 8) + 2]] as [number, number]),
    ],
  }),
};
