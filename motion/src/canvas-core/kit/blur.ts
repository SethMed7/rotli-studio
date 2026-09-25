// MOTION BLUR by subframes: the frame is drawn at several instants inside the shutter and averaged, the way a
// camera integrates light. Deterministic (fixed instants, fixed order), so goldens still hold. Costs `samples`×.
import type { Ctx, Env, Layer } from "../core";

const layer = (env: Env, key: string): Layer => {
  const w = Math.round(env.W * env.scale),
    h = Math.round(env.H * env.scale),
    k = `blur:${key}:${w}x${h}`;
  let L = env.cache.get(k) as Layer | undefined;
  if (!L) {
    L = env.canvas(w, h);
    env.cache.set(k, L);
  }
  return L;
};

/**
 * draw(ctx, dt) must paint a FULL opaque frame at time offset dt (in frames, within the shutter).
 * shutter 0.5 = a 180° shutter. samples 1 draws once with no blur.
 */
export function motionBlur(
  ctx: Ctx,
  env: Env,
  draw: (ctx: Ctx, dt: number) => void,
  { samples = 5, shutter = 0.5 } = {},
) {
  if (samples <= 1) {
    draw(ctx, 0);
    return;
  }
  const acc = layer(env, "acc"),
    one = layer(env, "one");
  acc.ctx.setTransform(1, 0, 0, 1, 0, 0);
  acc.ctx.globalAlpha = 1;
  acc.ctx.clearRect(0, 0, acc.canvas.width, acc.canvas.height);
  for (let i = 0; i < samples; i++) {
    one.ctx.setTransform(1, 0, 0, 1, 0, 0);
    one.ctx.globalAlpha = 1;
    one.ctx.globalCompositeOperation = "source-over";
    one.ctx.clearRect(0, 0, one.canvas.width, one.canvas.height);
    draw(one.ctx, (i / (samples - 1) - 0.5) * shutter);
    // a running average: after sample i the layer holds the mean of samples 0..i
    acc.ctx.globalAlpha = 1 / (i + 1);
    acc.ctx.drawImage(one.canvas, 0, 0);
  }
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.drawImage(acc.canvas, 0, 0);
  ctx.restore();
}
