// REFRAME: draw any frame of another film into a rectangle of this one. The source is re-rendered
// at the scale the rectangle needs (never a bitmap blown up), so a 16:9 shot stays crisp inside a
// 9:16 story or a 4:5 carousel slide.
import type { Ctx, Env } from "../core";
import { renderFrame, type Film } from "../film";
import { saveLook } from "./ui";

export const reframe = (
  ctx: Ctx,
  env: Env,
  film: Film,
  frame: number,
  src: { x: number; y: number; w: number; h: number },
  dst: { x: number; y: number; w: number; h: number; r?: number },
) => {
  const k = dst.w / src.w,
    S = env.scale * k,
    key = `reframe:${film.meta.title}:${Math.round(film.meta.W * S)}x${Math.round(film.meta.H * S)}`;
  let L = env.cache.get(key) as ReturnType<Env["canvas"]> | undefined;
  if (!L) {
    L = env.canvas(Math.round(film.meta.W * S), Math.round(film.meta.H * S));
    env.cache.set(key, L);
  }
  const restore = saveLook();
  renderFrame(film, L.ctx, frame, { ...env, scale: S });
  restore();
  ctx.save();
  if (dst.r) {
    ctx.beginPath();
    ctx.roundRect(dst.x, dst.y, dst.w, dst.h, dst.r);
    ctx.clip();
  }
  ctx.drawImage(L.canvas, src.x * S, src.y * S, src.w * S, src.h * S, dst.x, dst.y, dst.w, dst.h);
  ctx.restore();
};
