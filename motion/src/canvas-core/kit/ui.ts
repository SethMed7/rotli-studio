// UI AS A SET: rounded cards with soft shadows, a phone, a toggle, a toast. Flat colour from the palette; depth
// comes from shadow, never gradients.
import type { Ctx } from "../core";

export function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  const k = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + k, y);
  ctx.arcTo(x + w, y, x + w, y + h, k);
  ctx.arcTo(x + w, y + h, x, y + h, k);
  ctx.arcTo(x, y + h, x, y, k);
  ctx.arcTo(x, y, x + w, y, k);
  ctx.closePath();
}
export type CardOpts = {
  r?: number;
  fill: string;
  stroke?: string;
  lw?: number;
  shadow?: { blur: number; y: number; color: string };
};
export function card(ctx: Ctx, x: number, y: number, w: number, h: number, o: CardOpts) {
  ctx.save();
  if (o.shadow) {
    ctx.shadowColor = o.shadow.color;
    ctx.shadowBlur = o.shadow.blur;
    ctx.shadowOffsetY = o.shadow.y;
  }
  rr(ctx, x, y, w, h, o.r ?? 24);
  ctx.fillStyle = o.fill;
  ctx.fill();
  ctx.restore();
  if (o.stroke) {
    ctx.save();
    rr(ctx, x, y, w, h, o.r ?? 24);
    ctx.strokeStyle = o.stroke;
    ctx.lineWidth = o.lw ?? 2;
    ctx.stroke();
    ctx.restore();
  }
}
/** a phone: body, screen, island. Returns the screen rectangle to draw into (clip to it with rr + clip). */
export function phone(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  o: { body: string; screen: string; shadow?: CardOpts["shadow"] },
) {
  const h = w * 2.05,
    r = w * 0.16,
    b = w * 0.035;
  card(ctx, x, y, w, h, { r, fill: o.body, shadow: o.shadow });
  const s = { x: x + b, y: y + b, w: w - 2 * b, h: h - 2 * b, r: r - b };
  card(ctx, s.x, s.y, s.w, s.h, { r: s.r, fill: o.screen });
  card(ctx, x + w / 2 - w * 0.15, y + b + w * 0.03, w * 0.3, w * 0.085, { r: w * 0.05, fill: o.body });
  return s;
}
/** a switch; on01 animates the knob from off (0) to on (1) */
export function toggle(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  on01: number,
  o: { off: string; on: string; knob: string },
) {
  const h = w * 0.56,
    t = Math.max(0, Math.min(1, on01));
  card(ctx, x, y, w, h, { r: h / 2, fill: t > 0.5 ? o.on : o.off });
  ctx.save();
  ctx.globalAlpha = t < 0.5 ? t * 2 : 1;
  card(ctx, x, y, w, h, { r: h / 2, fill: o.on });
  ctx.restore();
  const k = h * 0.8,
    kx = x + h * 0.1 + t * (w - h);
  card(ctx, kx, y + h * 0.1, k, k, { r: k / 2, fill: o.knob, shadow: { blur: 8, y: 2, color: "rgba(0,0,0,0.25)" } });
}
/** a check mark drawn to fraction t (for toasts and completed states) */
export function check(ctx: Ctx, cx: number, cy: number, s: number, t: number, color: string, lw: number) {
  const pts: [number, number][] = [
      [-0.5, 0],
      [-0.15, 0.35],
      [0.55, -0.4],
    ],
    seg = [Math.hypot(0.35, 0.35), Math.hypot(0.7, 0.75)],
    L = seg[0]! + seg[1]!;
  let left = t * L;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(cx + pts[0]![0] * s, cy + pts[0]![1] * s);
  for (let i = 0; i < 2 && left > 0; i++) {
    const k = Math.min(1, left / seg[i]!),
      a = pts[i]!,
      b = pts[i + 1]!;
    ctx.lineTo(cx + (a[0] + (b[0] - a[0]) * k) * s, cy + (a[1] + (b[1] - a[1]) * k) * s);
    left -= seg[i]!;
  }
  ctx.stroke();
  ctx.restore();
}
