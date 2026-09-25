// SHOTS 1, 2 and 9: the island. It opens quiet, the mainland's noise follows the quokka off the
// ferry, and at sunset the same beach holds everything the quokka kept.
import { rng, type Ctx, type Env } from "../core";
import { POSES } from "../quokka/poses";
import { actor, hopAlong, poseAt } from "./actor";
import { beach, bike, farIsland, ferry, HORIZON, jetty, sea, sign, sky, sun } from "./island";
import { C, H, W, backOut, badge, beatLabel, card, easeIn, easeInOut, easeOut, folder, ink, key, lerp, pop, seg, sparkle, speedLines, text } from "./kit";

const camera = (ctx: Ctx, env: Env, s: number, cx: number, cy: number) => { ctx.setTransform(env.scale * s, 0, 0, env.scale * s, env.scale * (cx - cx * s), env.scale * (cy - cy * s)); };
const flat = (ctx: Ctx, env: Env) => ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);

const world = (ctx: Ctx, f: number, mode: "day" | "sunset", beam = 0) => {
  sky(ctx, f, mode);
  if (mode === "sunset") sun(ctx, 1080, HORIZON + 10, 88, "#f9d47f");
  farIsland(ctx, f, mode, beam);
  sea(ctx, f, mode);
  beach(ctx, f, mode);
};

// ---------------------------------------------------------------- 1 · a quiet island (0-150)
export const shotFerry = (F0: number) => (ctx: Ctx, l: number, env: Env) => {
  const f = F0 + l;
  camera(ctx, env, 1 + 0.03 * easeInOut(l / 150), 960, 700);
  world(ctx, f, "day");
  jetty(ctx, f, 380, 930, 822);
  sign(ctx, f, 860, 822, "THOMSON BAY");
  bike(ctx, f, 1500, 1000, 1.1);
  const fx = lerp(-420, 250, easeOut(seg(l, 0, 48)));
  ferry(ctx, f, fx, 812, 1);
  // the quokka rides in on the deck, then hops the jetty onto the sand
  const h = hopAlong(l, [[52, fx + 60, 772], [68, 560, 822], [84, 760, 822], [102, 1080, 930]], 110);
  const { pose, squash } = poseAt(l, [[0, "base"], [52, "walking"], [104, "base"], [116, "waving"]]);
  const x = l < 52 ? fx + 60 : h.x, y = l < 52 ? 772 : h.y;
  if (h.moving) speedLines(ctx, x - 110, y - h.lift - 150, 1, 3, 60, f, C.muted, 0.5);
  actor(ctx, env, f, { pose, x, y, h: 330, lift: h.lift, squash: h.squash * squash, lean: pose === "waving" ? Math.sin(l / 5) * 2 : 0 });
  flat(ctx, env);
  beatLabel(ctx, f, l, 1, "a quiet island", "rottnest · where the quokkas live");
};

// ---------------------------------------------------------------- 2 · thoughts everywhere (150-300)
const COUNTS = ["3", "12", "99+", "7", "24", "1", "42", "5", "8", "16", "2", "31"];
export const shotNoise = (F0: number) => (ctx: Ctx, l: number, env: Env) => {
  const f = F0 + l, rise = easeIn(seg(l, 60, 150));
  const shake = rise * 6, sx = Math.sin(f * 1.7) * shake, sy = Math.cos(f * 2.3) * shake;
  camera(ctx, env, 1.06 + 0.1 * easeInOut(l / 150), 1080 + sx, 760 + sy);
  world(ctx, f, "day");
  jetty(ctx, f, 380, 930, 822);
  sign(ctx, f, 860, 822, "THOMSON BAY");
  bike(ctx, f, 1500, 1000, 1.1);
  // notes blow across in the wind, the token among them
  const r = rng(77);
  for (let i = 0; i < 9; i++) {
    const t0 = 4 + i * 12, t = (l - t0) / 70; if (t < 0 || t > 1) continue;
    const x = lerp(2100, -200, t), y = 300 + r() * 420 + Math.sin(t * 7 + i) * 60, token = i === 3;
    card(ctx, { x, y, rot: Math.sin(t * 9 + i) * 0.5, scale: token ? 0.9 : 0.62, title: token ? "Trip ideas" : "", token, lines: 2, seed: i + 5, frame: f });
  }
  // the quokka: worried, turning to each ping
  const turn = Math.floor(l / 14) % 2 === 0;
  let flinch = 0; for (let i = 0; i < COUNTS.length; i++) { const d = l - (18 + i * 8); if (d >= 0 && d < 6) flinch = Math.max(flinch, Math.sin((d / 6) * Math.PI)); }
  actor(ctx, env, f, { pose: l < 22 ? "base" : "attention", x: 1080 + Math.sin(l / 2.5) * 5 * rise, y: 930, h: 330, flip: l >= 22 && turn, lean: (turn ? -1 : 1) * (2 + 4 * rise) + Math.sin(l / 3) * 2, squash: 1 - 0.09 * flinch });
  // badges pop in a ring and keep jostling
  for (let i = 0; i < COUNTS.length; i++) {
    const t0 = 18 + i * 8, s = pop(seg(l, t0, t0 + 14)); if (s <= 0) continue;
    const a = -2.9 + (i / COUNTS.length) * 2.7, rad = 330 + (i % 3) * 70;
    badge(ctx, 1080 + Math.cos(a) * rad * 1.35 + Math.sin(f / 7 + i) * 6, 760 + Math.sin(a) * rad + Math.cos(f / 6 + i) * 6, s * (0.8 + (i % 2) * 0.2), COUNTS[i], i % 3);
  }
  flat(ctx, env);
  // the turn arrives: ⌥ and space drop in from the top, landing on the downbeat that cuts to shot 3
  const drop = easeIn(seg(l, 118, 142));
  if (l >= 118) { const y = lerp(-240, 430, drop); key(ctx, 610, y, 190, 170, "⌥", 0); key(ctx, 830, y, 480, 170, "space", 0); }
  beatLabel(ctx, f, l, 2, "thoughts everywhere", "and every app wants your attention");
};

// ---------------------------------------------------------------- 9 · room to think (1560-1800)
// The beach at sunset holds everything: quokka, folder, the token note peeking out. On the bell the
// quokka celebrates, then smiles for a selfie: a flash, and the moment becomes a polaroid (a real
// snapshot of that frame, rendered once into its own layer) that is tossed aside for the lockup.
const SNAP = 100, PX0 = 640, PY0 = 380, PW = 640, PH = 520; // polaroid window onto the world
const sunsetWorld = (ctx: Ctx, env: Env, F0: number, l: number) => {
  const f = F0 + l;
  camera(ctx, env, 1.02 - 0.02 * easeInOut(l / 240), 960, 700);
  sky(ctx, f, "sunset"); sun(ctx, 560, HORIZON - 6, 84, "#f9d47f"); farIsland(ctx, f, "sunset", 0.8); sea(ctx, f, "sunset"); beach(ctx, f, "sunset", 470);
  const fy = 870;
  folder(ctx, 1000, fy - 150, 220, 150, { front: false });
  card(ctx, { x: 1104, y: fy - 140, rot: 0.12 + Math.sin(f / 30) * 0.02, scale: 0.7, title: "Trip ideas", token: true, lines: 2, seed: 4, frame: f });
  folder(ctx, 1000, fy - 150, 220, 150, { back: false });
  const h = hopAlong(l, [[0, 600, 960], [16, 730, 920], [32, 860, 880]], 80);
  const p = l < 34 ? { pose: "walking" as const, squash: 1 } : poseAt(l, [[34, "base"], [58, "celebrating"], [92, "waving"], [150, "base"], [196, "waving"]]);
  actor(ctx, env, f, { pose: p.pose, x: h.x, y: h.y, h: 350, lift: h.lift, squash: h.squash * p.squash, lean: p.pose === "waving" ? Math.sin(l / 5) * 2.5 : 0 });
  if (l >= 58 && l < 92) for (let i = 0; i < 8; i++) sparkle(ctx, 860 + Math.cos(i * 0.8 + l / 10) * (110 + (l - 58) * 3), 640 + Math.sin(i * 0.8 + l / 10) * (70 + (l - 58) * 2), 14 * (1 - seg(l, 78, 92)), i % 2 ? C.clay : C.surface, l / 8);
};
export const shotSunset = (F0: number) => (ctx: Ctx, l: number, env: Env) => {
  const f = F0 + l;
  sunsetWorld(ctx, env, F0, l);
  flat(ctx, env);
  if (l >= SNAP) {
    const key = `snap:${F0 + SNAP}:${env.scale}`; let snap = env.cache.get(key) as ReturnType<Env["canvas"]> | undefined;
    if (!snap) { snap = env.canvas(Math.round(W * env.scale), Math.round(H * env.scale)); sunsetWorld(snap.ctx, env, F0, SNAP); env.cache.set(key, snap); }
    const inT = pop(seg(l, SNAP, SNAP + 16)), away = easeInOut(seg(l, 128, 156));
    const cx = lerp(PX0 + PW / 2, 330, away), cy = lerp(PY0 + PH / 2 + 30, 800, away), sc = lerp(lerp(1.12, 1, inT), 0.52, away), rot = lerp(-0.015, -0.1, away);
    ctx.save(); ctx.globalAlpha = Math.min(1, inT * 1.4);
    ctx.translate(cx, cy); ctx.rotate(rot); ctx.scale(sc, sc);
    ctx.fillStyle = "rgba(43,35,29,0.22)"; ctx.fillRect(-PW / 2 - 22, -PH / 2 - 16, PW + 44 + 10, PH + 150 + 12);
    ctx.fillStyle = C.surface; ctx.fillRect(-PW / 2 - 30, -PH / 2 - 30, PW + 60, PH + 160);
    ctx.drawImage(snap.canvas, PX0 * env.scale, PY0 * env.scale, PW * env.scale, PH * env.scale, -PW / 2, -PH / 2, PW, PH);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.strokeRect(-PW / 2 - 30, -PH / 2 - 30, PW + 60, PH + 160); ctx.lineWidth = 3; ctx.strokeRect(-PW / 2, -PH / 2, PW, PH);
    text(ctx, "rottnest · everything kept", 0, PH / 2 + 82, { size: 36, weight: 600, align: "center", color: C.cocoa });
    ctx.restore();
  }
  const flash = l >= SNAP - 4 && l < SNAP + 10 ? 1 - Math.abs(l - SNAP) / 10 : 0;
  if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${flash * 0.92})`; ctx.fillRect(0, 0, W, H); }
  // the lockup, top centre over the sunset sky: mark, wordmark, promise
  const lk = seg(l, 140, 162);
  if (lk > 0) {
    const s = backOut(lk), cx = 930, cy = 190;
    ctx.save(); ctx.globalAlpha = Math.min(1, lk * 1.6); ctx.translate(cx, cy); ctx.scale(s, s);
    const mk = POSES._logo, m = 210 / mk.vb; ctx.save(); ctx.translate(-330, -128); ctx.scale(m, m); ctx.fillStyle = C.ink; for (const d of mk.d) ctx.fill(new Path2D(d), mk.rule); ctx.restore();
    text(ctx, "Rotli", -110, 44, { size: 150, weight: 600, font: "'Baloo 2', sans-serif", color: C.cocoa });
    ctx.restore();
    text(ctx, "Room to think. Files you keep.", cx - 20, cy + 140, { size: 46, weight: 600, align: "center", color: C.cocoa, alpha: seg(l, 156, 172) });
    ink(ctx, [[cx - 330, cy + 164], [cx + 290, cy + 160]], { w: 5, color: C.clay, seed: 909, frame: f, progress: seg(l, 160, 182) });
    text(ctx, "rotli.co  ·  for Mac", cx - 20, cy + 214, { size: 30, weight: 500, align: "center", color: C.clayText, alpha: seg(l, 168, 184) });
  }
  if (l < 140) beatLabel(ctx, f, l, 9, "room to think", "and every file is still yours");
};
