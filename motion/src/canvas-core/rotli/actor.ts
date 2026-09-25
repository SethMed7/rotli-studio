// The quokka as an ACTOR: the rig plus the habits that keep it alive in every frame (it blinks,
// it breathes) and the one locomotion it has, the hop, with a takeoff stretch and a landing squash.
import type { Ctx, Env, P } from "../core";
import type { PoseName } from "../quokka/poses";
import { blinkAt, drawQuokka, type Quokka } from "../quokka/rig";
import { HAS_CHARACTER, clamp01, lerp, shadow } from "./kit";
import { LOOK } from "../studio/stage";

export type Act = Omit<Quokka, "x" | "y" | "h"> & { x: number; y: number; h: number; lift?: number; noShadow?: boolean; shadowCol?: string };
/** draw the actor with its living habits; `f` is the GLOBAL frame so blinks never reset on a cut */
export const actor = (ctx: Ctx, env: Env, f: number, a: Act) => {
  if (!HAS_CHARACTER) return;
  const breath = 1 + 0.014 * Math.sin((f / 40) * Math.PI * 2), lift = a.lift ?? 0;
  if (!a.noShadow) shadow(ctx, a.x, a.y + 4, a.h * 0.2 * (1 - 0.35 * clamp01(lift / 120)), 0.2 * (1 - 0.4 * clamp01(lift / 120)), a.shadowCol);
  // a piece that picked a theme family (studio/stage useFamily) gets that family's quokka; Rotli pieces keep the rig's own colour
  drawQuokka(ctx, env, { ...a, body: a.body ?? (LOOK.family === "rotli" ? undefined : LOOK.quokka), y: a.y - lift, blink: a.blink ?? blinkAt(f, 84, 3), squash: (a.squash ?? 1) * breath });
};

/** hops between waypoints: `stops` are [frame, x, y]; each leg is one hop of height `hgt` */
export const hopAlong = (f: number, stops: [number, number, number][], hgt = 90) => {
  if (f <= stops[0][0]) return { x: stops[0][1], y: stops[0][2], lift: 0, squash: 1, moving: false, dir: 1 };
  for (let i = 1; i < stops.length; i++) {
    const [f0, x0, y0] = stops[i - 1], [f1, x1, y1] = stops[i];
    if (f < f1) {
      if (x0 === x1 && y0 === y1) return { x: x0, y: y0, lift: 0, squash: f - f0 < 6 && i > 1 ? 1 - 0.13 * Math.sin(((f - f0) / 6) * Math.PI) : 1, moving: false, dir: 1 }; // a hold, not a hop
      const t = (f - f0) / (f1 - f0), lift = Math.sin(t * Math.PI) * hgt;
      const squash = t < 0.18 ? 1 + 0.12 * Math.sin((t / 0.18) * Math.PI) : 1 + 0.04 * Math.sin(t * Math.PI);
      return { x: lerp(x0, x1, t), y: lerp(y0, y1, t), lift, squash, moving: true, dir: Math.sign(x1 - x0) || 1 };
    }
    // a landing squash for 6 frames after each stop
    const next = stops[i + 1]?.[0] ?? Infinity;
    if (f < next && f - f1 < 6) return { x: x1, y: y1, lift: 0, squash: 1 - 0.13 * Math.sin(((f - f1) / 6) * Math.PI), moving: false, dir: Math.sign(x1 - x0) || 1 };
  }
  const last = stops[stops.length - 1];
  return { x: last[1], y: last[2], lift: 0, squash: 1, moving: false, dir: 1 };
};

/** a pose change that pops: 3 frames of squash around a swap, so the cut in drawing reads as a gesture */
export const poseAt = (f: number, table: [number, PoseName][]): { pose: PoseName; squash: number } => {
  let pose = table[0][1], since = Infinity;
  for (const [t, p] of table) if (f >= t) { pose = p; since = f - t; }
  return { pose, squash: since < 5 ? 1 - 0.06 * Math.sin((since / 5) * Math.PI) : 1 };
};
export type { P };
