// CAPTION LADDERS: the explainer-reel caption. A phrase is set as a short stack of lines, each word arriving on its
// own frame (a rise and a fade), sizes mixed on purpose, one key word in an accent italic. It sits beside the
// action, not under it like a subtitle, and it moves with the voice (or the beat) one word at a time.
//
//   ladder(ctx, [[w("Best", 30)], [w("kept", 36)], [w("secret", 48, { key: true })]], x, y, f, { sans, serif, italic, ink, accent })
import type { Ctx } from "../core";
import { clamp, spring } from "./motion";
import { measure, text } from "./type";

export type Word = { t: string; at: number; scale?: number; key?: boolean; serif?: boolean };
/** a word that appears at frame `at`; scale is relative to the ladder's size; key = the accent italic word */
export const w = (t: string, at: number, o: { scale?: number; key?: boolean; serif?: boolean } = {}): Word => ({
  t,
  at,
  ...o,
});

export type LadderOpts = {
  size: number;
  face: string; // the regular face (a serif reads best, as in editorial explainers)
  italic: string; // the accent face for key words
  ink: string;
  accent: string;
  fps?: number;
  align?: "left" | "center" | "right";
  gap?: number; // line gap as a fraction of the size
  out?: number; // frame the whole ladder starts to leave (fades up and out over 8 frames)
};

/** draw a ladder of lines at (x, y = the first baseline); returns the height it used */
export function ladder(ctx: Ctx, lines: Word[][], x: number, y: number, f: number, o: LadderOpts) {
  const fps = o.fps ?? 30,
    gap = o.gap ?? 0.12,
    leave = o.out === undefined ? 0 : clamp((f - o.out) / 8);
  let by = y;
  for (const line of lines) {
    const sizes = line.map((wd) => o.size * (wd.scale ?? 1)),
      lh = Math.max(...sizes);
    const widths = line.map((wd, i) =>
      measure(ctx, wd.t, { size: sizes[i]!, family: wd.key ? o.italic : o.face, track: -0.01 }),
    );
    const space = o.size * 0.24,
      total = widths.reduce((a, b) => a + b, 0) + space * (line.length - 1);
    let cx = o.align === "center" ? x - total / 2 : o.align === "right" ? x - total : x;
    line.forEach((wd, i) => {
      const p = spring((f - wd.at) / fps, { freq: 3, damp: 0.8 });
      if (p > 0.001) {
        ctx.save();
        ctx.globalAlpha *= clamp(p * 1.4) * (1 - leave);
        ctx.translate(0, (1 - p) * sizes[i]! * 0.35 - leave * o.size * 0.4);
        text(ctx, wd.t, cx, by + lh, {
          size: sizes[i]!,
          family: wd.key ? o.italic : o.face,
          color: wd.key ? o.accent : o.ink,
          track: -0.01,
        });
        ctx.restore();
      }
      cx += widths[i]! + space;
    });
    by += lh * (1 + gap);
  }
  return by - y;
}

/** the words of a sentence spread evenly over [from, to] frames: an easy way to time a ladder to a line of voice */
export const spread = (words: string[], from: number, to: number) =>
  words.map((t, i) => ({ t, at: Math.round(from + ((to - from) * i) / Math.max(1, words.length - 1)) }));
