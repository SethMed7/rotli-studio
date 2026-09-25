// THE SERIES GRAMMAR — "Rotli in 30 seconds". Every landscape episode keeps the same shape and look
// so the feed reads as one body of work: a title card (episode number, the promise, a quokka pose),
// the demo under lower-third captions, and the end card. Linen for making things, cocoa night for
// AI and privacy, matching the app's light and dark environments.
import type { Ctx, Env } from "../core";
import { actor } from "../rotli/actor";
import { BRAND, C, FONT, TRACK, backOut, easeOut, fillRR, ink, measure, pop, seg, text } from "../rotli/kit";
import type { PoseName } from "../quokka/poses";
import { lockup } from "./brandmarks";
import { envGround } from "./grounds";
import { LOOK } from "./stage";

export const EP_W = 1920, EP_H = 1080, TITLE = 90, END = 120;
/** the site's grounds: base linen with the file field for making things, the deep band for AI and privacy */
export const ground = (ctx: Ctx, f: number, dark = false) => envGround(ctx, f, dark ? "deep" : "base");
const TIGHT = TRACK; // the brand's headline tracking (rotli.co: −0.045em)
/** title card: `Rotli in 30 seconds · 03`, the promise, one quokka pose */
export const titleCard = (ctx: Ctx, env: Env, f: number, l: number, o: { no: number; title: string[]; pose: PoseName; dark?: boolean }) => {
  ground(ctx, f, o.dark);
  const col = o.dark ? C.nightText : C.cocoa, k = seg(l, 0, 14);
  const tag = `Rotli in 30 seconds  ·  ${String(o.no).padStart(2, "0")}`, tw = measure(ctx, tag, 26, 600) + 44;
  fillRR(ctx, 160, 300 - 8 * (1 - k), tw, 52, 26, o.dark ? C.nightSurface2 : C.surface, o.dark ? C.nightBorder : C.ink, 3); text(ctx, tag, 182, 335 - 8 * (1 - k), { size: 26, weight: 600, color: o.dark ? C.nightText : C.cocoa, alpha: k });
  o.title.forEach((ln, i) => { const kk = seg(l, 6 + i * 6, 22 + i * 6); text(ctx, ln, 160, 470 + i * 110 + (1 - kk) * 30, { size: 104, weight: 600, color: col, alpha: kk, spacing: 104 * TIGHT, font: FONT.display }); });
  const last = o.title[o.title.length - 1]; ink(ctx, [[160, 470 + (o.title.length - 1) * 110 + 24], [160 + measure(ctx, last, 104, 600, FONT.display, 104 * TIGHT), 470 + (o.title.length - 1) * 110 + 20]], { w: 9, color: C.clay, seed: 5 + o.no, frame: f, progress: seg(l, 24, 48) });
  // the quokka stands clear of the widest title line (wide titles push it right)
  const qx = Math.min(1700, Math.max(1480, 160 + Math.max(...o.title.map((t) => measure(ctx, t, 104, 600, FONT.display, 104 * TIGHT))) + 300));
  const s = backOut(seg(l, 8, 26)); if (s > 0) actor(ctx, env, f, { pose: o.pose, x: qx, y: 900, h: 640 * s, lean: Math.sin(f / 9) * 2, body: LOOK.quokka, shadowCol: o.dark ? "#000" : undefined });
};
/** lower thirds are hidden while a derivative re-renders an episode frame (its own big caption carries the words) */
export const CAPTIONS = { on: true };
/** a lower-third caption: rises in at t0, leaves at t1; `sub` is the quieter second line */
export const lowerThird = (ctx: Ctx, l: number, t0: number, t1: number, line: string, sub = "", dark = false) => {
  if (!CAPTIONS.on) return;
  const inn = easeOut(seg(l, t0, t0 + 10)), out = seg(l, t1 - 8, t1); if (inn <= 0 || out >= 1) return;
  const a = inn * (1 - out), y = 1000 + (1 - inn) * 30, w = Math.max(measure(ctx, line, 40, 600), sub ? measure(ctx, sub, 28, 500) : 0) + 70, h = sub ? 124 : 82;
  ctx.save(); ctx.globalAlpha *= a; fillRR(ctx, 72, y - h, w, h, 22, dark ? C.nightSurface2 : C.surface, dark ? C.nightBorder : C.ink, 3);
  ctx.fillStyle = C.clay; ctx.fillRect(72, y - h + 22, 6, h - 44);
  text(ctx, line, 104, y - h + 54, { size: 40, weight: 600, color: dark ? C.nightText : C.cocoa, spacing: 40 * -0.02 }); if (sub) text(ctx, sub, 104, y - h + 98, { size: 28, weight: 500, color: dark ? C.nightMuted : C.muted }); ctx.restore();
};
/** the series end card: lockup, the three promises, the url */
export const endCard = (ctx: Ctx, env: Env, f: number, l: number, o: { pose?: PoseName; dark?: boolean } = {}) => {
  ground(ctx, f, false); drift(ctx, env, f, 0.6);
  lockup(ctx, 960, 400, seg(l, 0, 40), f, { s: 1 });
  const chips = ((BRAND as { promise?: string }).promise ?? "").split(" · ").filter(Boolean); let x = 960 - chips.reduce((w, c) => w + measure(ctx, c, 30, 600) + 60, -16) / 2;
  chips.forEach((c, i) => { const p = pop(seg(l, 24 + i * 5, 36 + i * 5)); if (p <= 0) { x += measure(ctx, c, 30, 600) + 60; return; } const w = measure(ctx, c, 30, 600) + 44; ctx.save(); ctx.translate(x + w / 2, 700); ctx.scale(p, p); fillRR(ctx, -w / 2, -30, w, 60, 30, i === 0 ? C.clay : C.surface, C.ink, 3); text(ctx, c, 0, 11, { size: 30, weight: 600, align: "center", color: i === 0 ? C.surface : C.cocoa }); ctx.restore(); x += w + 16; });
  const s = backOut(seg(l, 10, 28)); if (s > 0) actor(ctx, env, f, { pose: o.pose ?? "waving", x: 960, y: 1060, h: 250 * s, lean: Math.sin(f / 6) * 2, body: LOOK.quokka });
};

/** the HOST: a small quokka in the corner of every demo, breathing, blinking, swaying on two
 *  unrelated periods so no frame is ever frozen while the UI holds between clicks */
export const host = (ctx: Ctx, env: Env, f: number, o: { x?: number; y?: number; h?: number; pose?: PoseName; dark?: boolean; flip?: boolean } = {}) => {
  actor(ctx, env, f, { pose: o.pose ?? "base", body: LOOK.quokka, x: o.x ?? 1790, y: (o.y ?? 1062) + Math.sin(f / 7.3) * 3, h: o.h ?? 250, lean: Math.sin(f / 11) * 3 + Math.sin(f / 4.1) * 0.8, flip: o.flip, shadowCol: o.dark ? "#000" : undefined });
};

/** DRIFT: the series' living camera. Compose it after any shot camera: a slow pan and a 1% breath on
 *  unrelated periods, so a UI hold never reads (or measures) as a still frame. */
export const drift = (ctx: Ctx, env: Env, f: number, strength = 1) => {
  const t = ctx.getTransform(), k = env.scale, s = 1 + 0.012 * strength * Math.sin(f / 29), dx = 16 * strength * Math.sin(f / 23), dy = 10 * strength * Math.sin(f / 31 + 1);
  ctx.setTransform(t.a * s, t.b, t.c, t.d * s, t.e * s + (1 - s) * 960 * k + dx * k, t.f * s + (1 - s) * 540 * k + dy * k);
};
