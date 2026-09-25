// The lockup (quokka mark + wordmark + promise + url) and big captions, sized for any format.
import type { Ctx } from "../core";
import { POSES } from "../quokka/poses";
import { C, FONT, TRACK_CAPTION, backOut, ink, measure, seg, text } from "../rotli/kit";
import { BRAND } from "./stage";

/** the lockup, centred on (cx, cy), `t` 0..1 builds it in; `s` scales the whole thing */
export const lockup = (ctx: Ctx, cx: number, cy: number, t: number, f: number, o: { s?: number; ink?: string; sub?: string; tagline?: boolean; url?: boolean } = {}) => {
  if (t <= 0) return; const s = o.s ?? 1, col = o.ink ?? C.cocoa, k = backOut(seg(t, 0, 0.5));
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
  // the mark is the brand's (brand.json "mark": "quokka" by default, or null for a wordmark-only lockup)
  const hasMark = (BRAND as { mark?: string | null }).mark !== null, word = BRAND.wordmark, ww = measure(ctx, word, 150, 600, FONT.word), mk = POSES._logo, m = 190 / mk.vb, total = hasMark ? 190 + 16 + ww : ww;
  ctx.save(); ctx.globalAlpha *= Math.min(1, t * 3); ctx.translate(0, -40); ctx.scale(k, k);
  if (hasMark) { ctx.save(); ctx.translate(-total / 2, -118); ctx.scale(m, m); ctx.fillStyle = col; for (const d of mk.d) ctx.fill(new Path2D(d), mk.rule); ctx.restore(); }
  text(ctx, word, -total / 2 + (hasMark ? 206 : 0), 30, { size: 150, weight: 600, font: FONT.word, color: col });
  ctx.restore();
  if (o.tagline !== false) { text(ctx, o.sub ?? BRAND.tagline, 0, 100, { size: 46, weight: 600, align: "center", color: col, alpha: seg(t, 0.35, 0.6) }); ink(ctx, [[-300, 124], [300, 120]], { w: 5, color: C.clay, seed: 909, frame: f, progress: seg(t, 0.45, 0.8) }); }
  if (o.url !== false) text(ctx, BRAND.platform ? `${BRAND.url}  ·  ${BRAND.platform}` : BRAND.url, 0, 178, { size: 32, weight: 500, align: "center", color: o.ink ? col : C.clayText, alpha: seg(t, 0.6, 0.85) });
  ctx.restore();
};
/** a big caption block: lines rise in one after another; `hi` words get a clay underline */
export const caption = (ctx: Ctx, lines: string[], x: number, y: number, t: number, f: number, o: { size?: number; color?: string; align?: CanvasTextAlign; lead?: number; hi?: string; weight?: number; tight?: boolean } = {}) => {
  const size = o.size ?? 72, lead = o.lead ?? size * 1.14, align = o.align ?? "center", col = o.color ?? C.cocoa;
  lines.forEach((ln, i) => {
    const k = seg(t, i * 0.18, i * 0.18 + 0.45); if (k <= 0) return;
    const yy = y + i * lead + (1 - k) * 26;
    const sp = o.tight === false ? 0 : size * TRACK_CAPTION; // the brand's caption tracking
    text(ctx, ln, x, yy, { size, weight: o.weight ?? 600, align, color: col, alpha: k, spacing: sp, font: FONT.display });
    if (o.hi && ln.includes(o.hi)) { const w = measure(ctx, ln, size, o.weight ?? 600, FONT.display, sp), pre = measure(ctx, ln.slice(0, ln.indexOf(o.hi)), size, o.weight ?? 600, FONT.display, sp), hw = measure(ctx, o.hi, size, o.weight ?? 600, FONT.display, sp), x0 = align === "center" ? x - w / 2 + pre : align === "right" ? x - w + pre : x + pre;
      ink(ctx, [[x0, yy + size * 0.2], [x0 + hw, yy + size * 0.18]], { w: size * 0.08, color: C.clay, seed: 77 + i, frame: f, progress: seg(t, i * 0.18 + 0.3, i * 0.18 + 0.7) }); }
  });
};
