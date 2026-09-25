// ATMOSPHERES — reusable moods. An atmosphere is a theme FAMILY (colours: studio/stage useFamily), a
// GROUND (the site's base/band/deep, or the Rottnest scenery), AMBIENT life that keeps every frame
// moving (drifting files, stars, leaves, rain, tide), a camera DRIFT strength and a MUSIC preset.
// Scenes pick one by id; a whole piece usually lives in one and visits another for a scene or two.
// Everything is a pure function of the frame: rng(seed) only, never Math.random.
import type { Ctx } from "../core";
import { rng } from "../core";
import { beach, farIsland, lighthouse, sea, sky, sun, HORIZON } from "../rotli/island";
import { C, ink } from "../rotli/kit";
import { envGround, fileField } from "./grounds";
import type { ScoreSpec } from "./score2";
import type { Family } from "./stage";

export type Atmosphere = {
  id: string; label: string; family: Family; dark: boolean; drift: number; why: string;
  ground: (ctx: Ctx, f: number, w: number, h: number) => void;   // behind everything
  front?: (ctx: Ctx, f: number, w: number, h: number) => void;   // over the scene (rain, motes)
  score: Pick<ScoreSpec, "key" | "melody" | "energeticFrom" | "sparkleFrom">;
};

// ---------------------------------------------------------------- ambient life
const motes = (ctx: Ctx, f: number, w: number, h: number, col: string, n = 18, seed = 3, alpha = 0.18) => {
  // small note glyphs rising slowly, each on its own sway: paper in the air
  const r = rng(seed); ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.globalAlpha *= alpha;
  for (let i = 0; i < n; i++) { const x0 = r() * w, sp = 0.4 + r() * 0.6, ph = r() * 6.28, s = 0.8 + r() * 0.8, y = h + 60 - ((f * sp + r() * h * 1.4) % (h + 160)), x = x0 + Math.sin(f / 50 + ph) * 30;
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(f / 70 + ph) * 0.4); ctx.scale(s, s); ctx.beginPath(); ctx.moveTo(-10, -13); ctx.lineTo(4, -13); ctx.lineTo(10, -7); ctx.lineTo(10, 13); ctx.lineTo(-10, 13); ctx.closePath(); ctx.moveTo(-5, -3); ctx.lineTo(5, -3); ctx.moveTo(-5, 3); ctx.lineTo(5, 3); ctx.stroke(); ctx.restore(); }
  ctx.restore();
};
const stars = (ctx: Ctx, f: number, w: number, h: number, col: string, n = 80, seed = 7, top = 0.7) => {
  const r = rng(seed); ctx.save(); ctx.fillStyle = col;
  for (let i = 0; i < n; i++) { const x = r() * w, y = r() * h * top, ph = r() * 6.28, s = 1 + r() * 2; ctx.globalAlpha = 0.2 + 0.4 * (0.5 + 0.5 * Math.sin(f / 13 + ph)); ctx.beginPath(); ctx.arc(x, y, s, 0, 6.29); ctx.fill(); }
  ctx.restore();
};
const leaves = (ctx: Ctx, f: number, w: number, h: number, cols: string[], n = 22, seed = 11) => {
  const r = rng(seed); ctx.save();
  for (let i = 0; i < n; i++) { const sp = 0.5 + r() * 0.8, x0 = r() * w, ph = r() * 6.28, s = 10 + r() * 12, y = ((f * sp + r() * h * 1.3) % (h + 120)) - 60, x = x0 + Math.sin(f / 40 + ph) * 60;
    ctx.save(); ctx.translate(x, y); ctx.rotate(f / 30 + ph); ctx.fillStyle = cols[i % cols.length]; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.ellipse(0, 0, s, s * 0.45, 0, 0, 6.29); ctx.fill(); ctx.restore(); }
  ctx.restore();
};
const rain = (ctx: Ctx, f: number, w: number, h: number, col: string, n = 90, seed = 19) => {
  const r = rng(seed); ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 1.6; ctx.globalAlpha = 0.28; ctx.beginPath();
  for (let i = 0; i < n; i++) { const x0 = r() * (w + 200), sp = 14 + r() * 10, len = 18 + r() * 22, y = ((f * sp + r() * h * 3) % (h + 100)) - 50, x = x0 - y * 0.18; ctx.moveTo(x, y); ctx.lineTo(x - len * 0.18, y + len); }
  ctx.stroke(); ctx.restore();
};
const tide = (ctx: Ctx, f: number, w: number, h: number, col: string, rows = 4) => {
  for (let row = 0; row < rows; row++) { const y = h - 40 - row * 34, a = 22 - row * 4, pts: [number, number][] = []; for (let x = -40; x <= w + 40; x += 80) pts.push([x, y + Math.sin(x / 90 + f / (18 + row * 6) + row) * a * 0.4]);
    ink(ctx, pts, { w: 3, color: col, seed: 40 + row, frame: f, alpha: 0.35 - row * 0.06, wob: 0.6 }); }
};
const grid = (ctx: Ctx, w: number, h: number, col: string, step = 48, alpha = 0.07) => {
  ctx.save(); ctx.strokeStyle = col; ctx.globalAlpha = alpha; ctx.lineWidth = 1;
  for (let x = 0; x <= w; x += step) { ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, h); ctx.stroke(); }
  for (let y = 0; y <= h; y += step) { ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(w, y + 0.5); ctx.stroke(); }
  ctx.restore();
};
const moon = (ctx: Ctx, x: number, y: number, r: number, col: string, bg: string) => { ctx.save(); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.29); ctx.fill(); ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(x + r * 0.42, y - r * 0.18, r * 0.9, 0, 6.29); ctx.fill(); ctx.restore(); };
/** the Rottnest scenery at any size (it is authored at 1920x1080; other sizes scale to cover) */
const island = (mode: "day" | "sunset") => (ctx: Ctx, f: number, w: number, h: number) => {
  const k = Math.max(w / 1920, h / 1080); ctx.save(); ctx.translate((w - 1920 * k) / 2, (h - 1080 * k) / 2); ctx.scale(k, k);
  sky(ctx, f, mode); if (mode === "sunset") sun(ctx, 560, HORIZON - 6, 84, "#f9d47f"); farIsland(ctx, f, mode, mode === "sunset" ? 0.8 : 0); sea(ctx, f, mode); beach(ctx, f, mode, mode === "sunset" ? 470 : 820); ctx.restore();
};

// ---------------------------------------------------------------- the ten atmospheres
export const ATMOSPHERES: Record<string, Atmosphere> = {
  "island-dawn": { id: "island-dawn", label: "Island, morning", family: "rotli", dark: false, drift: 0.6, why: "arrival, beginnings: the vault as a place", ground: island("day"), front: (c, f, w, h) => motes(c, f, w, h, C.cocoa, 10, 5, 0.14), score: { key: 0, melody: 0, energeticFrom: 480 } },
  "linen-morning": { id: "linen-morning", label: "Linen, morning desk", family: "rotli", dark: false, drift: 0.8, why: "writing: the calm page", ground: (c, f, w, h) => { envGround(c, f, "base", { w, h }); motes(c, f, w, h, C.clay, 14, 8, 0.2); }, score: { key: 0, melody: 1, energeticFrom: 240 } },
  "paper-studio": { id: "paper-studio", label: "Paper studio", family: "paper", dark: false, drift: 0.7, why: "making things: boards, documents, the drafting table", ground: (c, f, w, h) => { envGround(c, f, "base", { w, h, field: false }); grid(c, w, h, C.cocoa); fileField(c, f, { w, h, alpha: 0.06 }); }, score: { key: 5, melody: 1, energeticFrom: 240 } },
  "grove-burrow": { id: "grove-burrow", label: "Grove burrow", family: "grove", dark: false, drift: 0.7, why: "one folder: the burrow that outlasts the storm", ground: (c, f, w, h) => { envGround(c, f, "band", { w, h }); leaves(c, f, w, h, [C.olive, C.clay, C.oliveBright]); }, score: { key: 7, melody: 0, energeticFrom: 240 } },
  "night-vault": { id: "night-vault", label: "Night, the lighthouse", family: "rotli", dark: true, drift: 0.6, why: "the Librarian works while you sleep", ground: (c, f, w, h) => { envGround(c, f, "deep", { w, h, fieldAlpha: 0.05 }); stars(c, f, w, h, C.nightText); c.save(); c.globalAlpha = 0.55; lighthouse(c, w - 160, h - 40, 0.9, f, 0.55, "night"); c.restore(); }, score: { key: 2, melody: 2, energeticFrom: 360, sparkleFrom: 0 } },
  "night-sky": { id: "night-sky", label: "Night, open sky", family: "rotli", dark: true, drift: 0.6, why: "night scenes that bring their own lighthouse or props", ground: (c, f, w, h) => { envGround(c, f, "deep", { w, h, fieldAlpha: 0.05 }); stars(c, f, w, h, C.nightText); }, score: { key: 2, melody: 2, energeticFrom: 360, sparkleFrom: 0 } },
  "ocean-tide": { id: "ocean-tide", label: "Ocean, the tide line", family: "ocean", dark: false, drift: 0.8, why: "threads and links: things connected by water", ground: (c, f, w, h) => { envGround(c, f, "base", { w, h }); tide(c, f, w, h, C.clay); }, score: { key: 7, melody: 1, energeticFrom: 240 } },
  "iris-dusk": { id: "iris-dusk", label: "Iris, dusk", family: "iris", dark: false, drift: 0.7, why: "conversation: evening questions", ground: (c, f, w, h) => { envGround(c, f, "base", { w, h }); stars(c, f, w, h * 0.5, C.clay, 30, 23, 1); moon(c, w - 180, 150, 44, C.peach, C.linen); }, score: { key: 5, melody: 2, energeticFrom: 240 } },
  "midnight-rain": { id: "midnight-rain", label: "Midnight, rain", family: "midnight", dark: true, drift: 0.6, why: "privacy: warm inside, weather outside", ground: (c, f, w, h) => envGround(c, f, "deep", { w, h, fieldAlpha: 0.05 }), front: (c, f, w, h) => rain(c, f, w, h, C.nightText), score: { key: 2, melody: 0, energeticFrom: 360 } },
  "harbour-day": { id: "harbour-day", label: "Harbour, other shores", family: "ocean", dark: false, drift: 0.6, why: "reaching other places: the web, other apps' folders", ground: island("day"), front: (c, f, w, h) => motes(c, f, w, h, C.cocoa, 8, 31, 0.12), score: { key: 7, melody: 0, energeticFrom: 240 } },
  "island-sunset": { id: "island-sunset", label: "Island, sunset", family: "rotli", dark: false, drift: 0.5, why: "endings, recaps: everything kept", ground: island("sunset"), score: { key: 2, melody: 2, energeticFrom: 240, sparkleFrom: 600 } },
};
export const atmosphere = (id: string) => { const a = ATMOSPHERES[id]; if (!a) throw new Error(`unknown atmosphere '${id}' (have: ${Object.keys(ATMOSPHERES).join(", ")})`); return a; };
export { grid, stars, rain, tide, leaves, motes, moon };
