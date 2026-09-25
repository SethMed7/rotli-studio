// Debug plate: every pose on one sheet with its detected eyes, feet anchor and an overlay on base.
import type { Ctx, Env } from "./core";
import type { Film } from "./film";
import { POSES, type PoseName } from "./quokka/poses";
import { drawQuokka } from "./quokka/rig";

const names = Object.keys(POSES).filter((n) => n !== "_logo") as PoseName[];
const draw = (ctx: Ctx, local: number, env: Env) => {
  const k = 1; ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.fillStyle = "#f8f2e9"; ctx.fillRect(0, 0, env.W * k, env.H * k);
  names.forEach((n, i) => {
    const cx = 130 + (i % 8) * 235, gy = 470 + Math.floor(i / 8) * 520;
    drawQuokka(ctx, env, { pose: "base", x: cx, y: gy, h: 420, alpha: 0.25 });
    drawQuokka(ctx, env, { pose: n, x: cx, y: gy, h: 420, blink: local });
    ctx.fillStyle = "#c97e62"; ctx.fillRect((cx - 3) * k, (gy - 3) * k, 6 * k, 6 * k);
    ctx.fillStyle = "#3a3028"; ctx.font = `${16 * k}px sans-serif`; ctx.fillText(n, (cx - 60) * k, (gy + 30) * k);
  });
};
export const poseLab: Film = { meta: { title: "poseLab", W: 1920, H: 1080, fps: 30, bpm: 120, durationFrames: 2 }, assets: { images: {} }, shots: [{ id: "lab", start: 0, end: 2, draw }] };
