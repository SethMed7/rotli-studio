// TYPE: text at exact sizes and tracking, per-letter entrances, and words timed to a line of copy.
import type { Ctx } from "../core";

export type TextOpts = {
  size: number;
  family: string;
  weight?: number;
  color?: string;
  align?: CanvasTextAlign;
  base?: CanvasTextBaseline;
  /** tracking in em (−0.04 = tight display type) */
  track?: number;
  alpha?: number;
};
const setFont = (ctx: Ctx, o: TextOpts) => {
  ctx.font = `${o.weight ?? 400} ${o.size}px "${o.family}"`;
  (ctx as Ctx & { letterSpacing: string }).letterSpacing = `${(o.track ?? 0) * o.size}px`;
};
export function measure(ctx: Ctx, s: string, o: TextOpts) {
  ctx.save();
  setFont(ctx, o);
  const w = ctx.measureText(s).width;
  ctx.restore();
  return w - (o.track ?? 0) * o.size; // letterSpacing adds a trailing gap after the last glyph
}
export function text(ctx: Ctx, s: string, x: number, y: number, o: TextOpts) {
  ctx.save();
  setFont(ctx, o);
  ctx.fillStyle = o.color ?? "#000";
  ctx.globalAlpha *= o.alpha ?? 1;
  ctx.textAlign = "left";
  ctx.textBaseline = o.base ?? "alphabetic";
  const w = measure(ctx, s, o),
    left = o.align === "center" ? x - w / 2 : o.align === "right" || o.align === "end" ? x - w : x;
  ctx.fillText(s, left, y);
  ctx.restore();
  return w;
}

export type Entrance = "rise" | "drop" | "scale" | "fade";
/**
 * Draw a string glyph by glyph, each with its own progress p(i, n) in 0..1 (stagger lives in p).
 * "rise" slides each glyph up out of a mask at the baseline: the classic kinetic-type entrance.
 */
export function letters(
  ctx: Ctx,
  s: string,
  x: number,
  y: number,
  o: TextOpts,
  p: (i: number, n: number) => number,
  how: Entrance = "rise",
) {
  const chars = [...s],
    total = measure(ctx, s, o);
  let cx = o.align === "center" ? x - total / 2 : o.align === "right" ? x - total : x;
  ctx.save();
  if (how === "rise" || how === "drop") {
    ctx.beginPath();
    ctx.rect(cx - o.size, y - o.size * 1.05, total + o.size * 2, o.size * 1.35);
    ctx.clip();
  }
  chars.forEach((ch, i) => {
    const t = Math.max(0, Math.min(1, p(i, chars.length))),
      adv = measure(ctx, s.slice(0, i + 1), o) - measure(ctx, s.slice(0, i), o);
    if (t > 0) {
      ctx.save();
      if (how === "rise") ctx.translate(0, (1 - t) * o.size * 1.1);
      if (how === "drop") ctx.translate(0, -(1 - t) * o.size * 1.1);
      if (how === "scale") {
        const k = 0.4 + 0.6 * t;
        ctx.translate(cx + adv / 2, y - o.size * 0.35);
        ctx.scale(k, k);
        ctx.translate(-(cx + adv / 2), -(y - o.size * 0.35));
      }
      text(ctx, ch, cx, y, {
        ...o,
        align: "left",
        track: 0,
        alpha: (o.alpha ?? 1) * (how === "fade" || how === "scale" ? t : 1),
      });
      ctx.restore();
    }
    cx += adv;
  });
  ctx.restore();
}

export type TimedWord = { word: string; at: number; index: number };
/** a line of copy laid out in time: each word appears `every` frames after the previous (pauses after . , —) */
export function timed(line: string, start: number, every: number): TimedWord[] {
  let at = start;
  return line
    .split(/\s+/)
    .filter(Boolean)
    .map((word, index) => {
      const w = { word, at, index };
      at += every * (/[.!?]$/.test(word) ? 2.2 : /[,;:—]$/.test(word) ? 1.5 : 1);
      return w;
    });
}
