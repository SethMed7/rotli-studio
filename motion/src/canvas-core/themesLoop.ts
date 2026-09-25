// SIX THEMES — 20 s vertical short (1080x1920). The whole frame becomes each of rotli's twelve
// environments (six families × light/dark), colours read from the app's own CSS (brand/themes.json),
// one beat-and-a-half each, wiping diagonally from one to the next; then a grid of all twelve.
import type { Ctx, Env } from "./core";
import type { Film } from "./film";
import { actor } from "./rotli/actor";
import { C, FONT, easeInOut, fillRR, ink, measure, pop, rr, seg, text } from "./rotli/kit";
import { fileField } from "./studio/grounds";
import type { PoseName } from "./quokka/poses";
import { lockup } from "./studio/brandmarks";
import { makeScore, PENTA } from "./studio/score2";
import { FONTS, FORMATS, THEME_LIST, type Theme } from "./studio/stage";

const [W, H] = FORMATS.story;
const EACH = 45, N = THEME_LIST.length, END = EACH * N, TOTAL = END + 60, WIPE = 10;
const POSES: PoseName[] = ["base", "waving", "notes", "thoughtful", "listening", "base", "celebrating", "notes", "waving", "thoughtful", "listening", "base"];

/** a note window drawn entirely from one theme's semantic roles */
const noteWindow = (ctx: Ctx, t: Theme, x: number, y: number, w: number, h: number, f: number) => {
  const r = t.roles, S = 250;
  fillRR(ctx, x, y, w, h, 30, r.surface, r.border, 3);
  ctx.save(); rr(ctx, x, y, w, h, 30); ctx.clip();
  ctx.fillStyle = r.ground; ctx.fillRect(x, y, S, h); ctx.fillStyle = r.border; ctx.fillRect(x + S, y, 2, h);
  ["#e8836f", "#e8c46f", "#9cc27e"].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x + 34 + i * 28, y + 36, 9, 0, 6.29); ctx.fill(); });
  text(ctx, "Main", x + 32, y + 116, { size: 28, weight: 600, color: r.text });
  ["Trip ideas", "Ferry times", "Reading list", "Salt lakes"].forEach((n, i) => { const yy = y + 172 + i * 56; if (!i) fillRR(ctx, x + 16, yy - 34, S - 32, 48, 12, r.tint); text(ctx, n, x + 36, yy, { size: 25, weight: i ? 500 : 600, color: i ? r["text-muted"] : r.text }); });
  text(ctx, "Files", x + 32, y + h - 40, { size: 25, weight: 500, color: r["text-muted"] });
  const ex = x + S + 48; let yy = y + 140;
  text(ctx, "Trip ideas", ex, yy, { size: 60, weight: 600, color: r.text }); yy += 84;
  const box = (state: "x" | "/" | " ", label: string) => {
    if (state === "x") { fillRR(ctx, ex, yy - 28, 34, 34, 9, r.success); ink(ctx, [[ex + 8, yy - 11], [ex + 15, yy - 4], [ex + 27, yy - 19]], { w: 4.5, color: r.surface, wob: 0.2, boil: 0 }); }
    else if (state === "/") { fillRR(ctx, ex, yy - 28, 34, 34, 9, r.surface, r.accent, 3); ctx.save(); rr(ctx, ex, yy - 28, 34, 34, 9); ctx.clip(); ctx.fillStyle = r.accent; ctx.fillRect(ex, yy - 28, 17, 34); ctx.restore(); }
    else fillRR(ctx, ex, yy - 28, 34, 34, 9, r.surface, r["text-muted"], 3);
    text(ctx, label, ex + 52, yy, { size: 32, weight: 500, color: state === "x" ? r["text-muted"] : r.text });
    if (state === "x") { ctx.fillStyle = r["text-muted"]; ctx.fillRect(ex + 52, yy - 11, measure(ctx, label, 32), 3); }
    yy += 64;
  };
  box("x", "book the ferry"); box("/", "pack a snorkel"); box(" ", "find the pink lake");
  yy += 16; text(ctx, "see", ex, yy, { size: 32, color: r.text }); const lx = ex + measure(ctx, "see ", 32); text(ctx, "Rottnest", lx, yy, { size: 32, weight: 600, color: r["accent-text"] }); ctx.fillStyle = r.accent; ctx.fillRect(lx, yy + 8, measure(ctx, "Rottnest", 32, 600), 3);
  yy += 78; const tw = measure(ctx, "#travel", 24, 600) + 30; fillRR(ctx, ex, yy - 34, tw, 44, 22, r.tint); text(ctx, "#travel", ex + 15, yy - 4, { size: 24, weight: 600, color: r["accent-text"] });
  const cw = measure(ctx, "trip-ideas.md", 24, 500, FONT.mono) + 30; fillRR(ctx, ex + tw + 16, yy - 34, cw, 44, 10, r["surface-2"]); text(ctx, "trip-ideas.md", ex + tw + 31, yy - 4, { size: 24, font: FONT.mono, color: r["syntax-blue"] });
  yy += 70; ctx.fillStyle = r.accent; ctx.fillRect(ex, yy - 34, 5, 90); text(ctx, "room to think,", ex + 26, yy, { size: 30, weight: 500, color: r["text-muted"] }); text(ctx, "files you keep", ex + 26, yy + 44, { size: 30, weight: 500, color: r["text-muted"] });
  ctx.restore(); void f;
};

const scene = (ctx: Ctx, env: Env, i: number, f: number) => {
  const t = THEME_LIST[i], r = t.roles, dark = t.mode === "dark";
  ctx.fillStyle = r.ground; ctx.fillRect(0, 0, W, H); fileField(ctx, f, { w: W, h: H, ink: r.text, alpha: 0.08 }); // the theme's own ground + the site's file field
  text(ctx, "Six themes.", W / 2, 230, { size: 100, weight: 600, align: "center", color: r.text });
  text(ctx, "each tuned for light and dark", W / 2, 312, { size: 40, weight: 500, align: "center", color: r["text-muted"] });
  noteWindow(ctx, t, 60, 420 + Math.sin(f / 11) * 8, 960, 1000, f);
  actor(ctx, env, f, { pose: POSES[i], x: 860, y: 1600, h: 470, lean: Math.sin(f / 9) * 3, squash: 1 + 0.02 * Math.sin(f / 5), shadowCol: dark ? "#000" : undefined });
  // the family name, the mode, and where we are among the twelve
  text(ctx, t.family, 70, 1650, { size: 84, weight: 600, color: r.text });
  const mw = measure(ctx, t.mode, 34, 600) + 88; fillRR(ctx, 72, 1690, mw, 64, 32, r.tint); text(ctx, t.mode === "light" ? "☀" : "☾", 106, 1735, { size: 32, color: r["accent-text"], align: "center" }); text(ctx, t.mode, 134, 1733, { size: 34, weight: 600, color: r["accent-text"] });
  for (let k = 0; k < N; k++) { ctx.fillStyle = k === i ? r.accent : r.border; ctx.beginPath(); ctx.arc(80 + k * 38, 1830, k === i ? 11 : 8, 0, 6.29); ctx.fill(); }
};

const draw = (ctx: Ctx, l: number, env: Env) => {
  ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
  if (l < END) {
    const i = Math.floor(l / EACH), k = l - i * EACH;
    scene(ctx, env, i === 0 || k >= WIPE ? i : i - 1, l);
    if (i > 0 && k < WIPE) { const p = easeInOut(k / WIPE), e = -H + p * (W + H * 2); ctx.save(); ctx.beginPath(); ctx.moveTo(e - H, H); ctx.lineTo(e, 0); ctx.lineTo(-10, 0); ctx.lineTo(-10, H); ctx.closePath(); ctx.clip(); scene(ctx, env, i, l); ctx.restore(); ctx.strokeStyle = THEME_LIST[i].roles.accent; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(e - H, H); ctx.lineTo(e, 0); ctx.stroke(); }
    return;
  }
  // the grid: all twelve, then the lockup
  const e = l - END; ctx.fillStyle = C.linen; ctx.fillRect(0, 0, W, H);
  text(ctx, "Pick yours.", W / 2, 250, { size: 100, weight: 600, align: "center", color: C.cocoa, alpha: seg(e, 0, 10) });
  THEME_LIST.forEach((t, k) => { const col = k % 3, row = Math.floor(k / 3), x = 70 + col * 320, y = 380 + row * 300, s = pop(seg(e, k * 2, k * 2 + 12)); if (s <= 0) return; const r = t.roles;
    ctx.save(); ctx.translate(x + 150, y + 110 + Math.sin((l + k * 7) / 10) * 6); ctx.scale(s, s); ctx.translate(-150, -110);
    fillRR(ctx, 0, 0, 300, 200, 22, r.ground, C.ink, 3); fillRR(ctx, 26, 30, 248, 140, 14, r.surface, r.border, 2); fillRR(ctx, 46, 54, 120, 14, 7, r.text); fillRR(ctx, 46, 84, 170, 10, 5, r["text-muted"]); fillRR(ctx, 46, 112, 34, 34, 8, r.accent); fillRR(ctx, 92, 120, 100, 18, 9, r.tint);
    ctx.restore(); text(ctx, t.label, x + 150, y + 248, { size: 28, weight: 600, align: "center", color: C.cocoa, alpha: s }); });
  lockup(ctx, W / 2, 1640, seg(e, 16, 56), l, { s: 0.62, tagline: false });
};

export const themesLoop: Film = {
  meta: { title: "themesLoop", W, H, fps: 30, bpm: 120, durationFrames: TOTAL, raster: "cpu" },
  assets: { images: {}, fonts: FONTS },
  shots: [{ id: "themes", start: 0, end: END, draw }, { id: "grid", start: END, end: TOTAL, draw: (c, l, e) => draw(c, l + END, e) }],
  audio: makeScore({ frames: TOTAL, energeticFrom: 60, endAt: END, bellAt: [END], pops: THEME_LIST.map((_, i) => [i * EACH, PENTA[i % PENTA.length]] as [number, number]) }),
};
