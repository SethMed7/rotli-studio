// GROUNDS, the way rotli.co does them: solid environments (base, a warm band, a deep band) and,
// where a surface needs texture, the site's faint FILE FIELD: the hero-pattern tile's note, folder,
// checklist, note and chat bubble (site/public/hero-pattern.svg), stroked at 9% ink and drifting.
// No stripes, no gradients.
import { rng, type Ctx } from "../core";
import BRAND from "../../../brand/brand.json";
import { C } from "../rotli/kit";

// the exact glyphs of hero-pattern.svg (220-unit tile): [translateX, translateY, rotateDeg, path]
const GLYPHS: [number, number, number, string][] = [
  [22, 26, -8, "M0 0h20l8 8v28H0z M20 0v8h8 M5 15h16M5 21h16M5 27h10"],
  [128, 34, 6, "M0 4h11l4 4h19v22H0z"],
  [56, 124, 5, "M0 0h26v34H0z M5 9h5v5H5zM14 11h8M5 20h5v5H5zM14 22h8"],
  [158, 132, -4, "M0 0h18l7 7v25H0z M18 0v7h7 M5 14h14M5 20h9"],
  [98, 84, -6, "M0 3a3 3 0 0 1 3-3h24a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3H10l-6 5v-5H3a3 3 0 0 1-3-3z"],
];
// built on first draw: the build also loads this module in Node, where Path2D does not exist
let paths: { x: number; y: number; r: number; p: Path2D }[] | null = null;

/** the file field: tile 240px (the site's), glyph stroke in `ink` at `alpha`, drifting down-left */
export const fileField = (
  ctx: Ctx,
  f: number,
  o: { w?: number; h?: number; ink?: string; alpha?: number; tile?: number; drift?: number } = {},
) => {
  const w = o.w ?? 1920,
    h = o.h ?? 1080,
    T = o.tile ?? 240,
    k = T / 220,
    d = o.drift ?? 0.35,
    ox = -((f * d) % T),
    oy = (f * d * 0.6) % T;
  if ((BRAND as { pattern?: string | null }).pattern === null) return; // a brand without a pattern gets plain grounds
  paths ??= GLYPHS.map(([x, y, r, d]) => ({ x, y, r: (r * Math.PI) / 180, p: new Path2D(d) }));
  ctx.save();
  ctx.strokeStyle = o.ink ?? C.cocoa;
  ctx.globalAlpha *= o.alpha ?? 0.09;
  ctx.lineWidth = 1.6;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  for (let ty = -T + oy; ty < h + T; ty += T)
    for (let tx = -T + ox; tx < w + T; tx += T)
      for (const g of paths!) {
        ctx.save();
        ctx.translate(tx + g.x * k, ty + g.y * k);
        ctx.rotate(g.r);
        ctx.scale(k, k);
        ctx.stroke(g.p);
        ctx.restore();
      }
  ctx.restore();
};
/** files in flight: the same glyphs scattered in depth (far ones small and faint, near ones larger with a short
 *  streak behind them), all heading down-left like the field's drift. Seeded, so a frame always draws the same. */
export const fileFlight = (
  ctx: Ctx,
  o: { w: number; h: number; ink?: string; count?: number; seed?: number; alpha?: number },
) => {
  if ((BRAND as { pattern?: string | null }).pattern === null) return;
  paths ??= GLYPHS.map(([x, y, r, d]) => ({ x, y, r: (r * Math.PI) / 180, p: new Path2D(d) }));
  const R = rng(o.seed ?? 7),
    n = o.count ?? Math.round((o.w * o.h) / 26000),
    dir = { x: -0.8, y: 0.6 }; // down-left, the field's drift
  const files = Array.from({ length: n }, () => ({
    x: R() * (o.w + 200) - 100,
    y: R() * (o.h + 200) - 100,
    z: R() ** 1.6, // most files far away, a few close
    g: paths![Math.floor(R() * paths!.length)]!,
    r: (R() - 0.5) * 0.9,
  })).sort((a, b) => a.z - b.z);
  ctx.save();
  ctx.strokeStyle = o.ink ?? C.cocoa;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  for (const f of files) {
    const k = 0.7 + f.z * 2.6,
      a = (o.alpha ?? 0.22) * (0.35 + f.z * 0.65);
    ctx.globalAlpha = a;
    if (f.z > 0.45) {
      // the streak: three short lines trailing up-right
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const off = (i - 1) * 9 * k,
          sx = f.x - dir.y * off - dir.x * 22 * k,
          sy = f.y + dir.x * off - dir.y * 22 * k,
          len = (14 + i * 5) * k;
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx - dir.x * len, sy - dir.y * len);
      }
      ctx.stroke();
    }
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.r);
    ctx.scale(k, k);
    ctx.lineWidth = 1.6 / Math.max(0.9, k * 0.7);
    ctx.stroke(f.g.p);
    ctx.restore();
  }
  ctx.restore();
};
export type GroundKind = "base" | "band" | "deep";
/** a solid environment, optionally with the file field. deep = the family's dark ground */
export const envGround = (
  ctx: Ctx,
  f: number,
  kind: GroundKind,
  o: { w?: number; h?: number; field?: boolean; fieldAlpha?: number } = {},
) => {
  const w = o.w ?? 1920,
    h = o.h ?? 1080;
  ctx.fillStyle = kind === "deep" ? C.night : kind === "band" ? C.surface2 : C.linen;
  ctx.fillRect(-160, -160, w + 320, h + 320);
  if (o.field !== false)
    fileField(ctx, f, {
      w,
      h,
      ink: kind === "deep" ? C.nightText : C.cocoa,
      alpha: o.fieldAlpha ?? (kind === "deep" ? 0.07 : 0.09),
    });
};
