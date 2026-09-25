// THE ROTLI KIT. Brand palette, type, hand-inked lines and the handful of props every shot
// shares (note cards, chips, keycaps, the folder, the app window, beat labels). Everything is
// drawn in LOGICAL 1920x1080 units; shots set the device transform once per frame.
import BRAND from "../../../brand/brand.json";
import { jitter, rng, sample, type Ctx, type P } from "../core";

export const W = 1920, H = 1080;
// Palette and type come from brand/brand.json: the one seam a second product swaps.
export { BRAND };
export const C = BRAND.palette;
// the mascot is optional: a brand whose "character" has no poses runs typographic (actor/looks/line art draw nothing)
export const HAS_CHARACTER = !!(BRAND as { character?: { poses?: string } | null }).character?.poses;
// display = headlines (defaults to the UI face); a second product sets fonts.display in its brand.json
/** headline tracking in em: the brand's own (fonts.tracking), else rotli.co's −0.045; captions run at 0.9× (Rotli: −0.04) */
const _tr = (BRAND.fonts as { tracking?: number }).tracking;
export const TRACK = _tr ?? -0.045, TRACK_CAPTION = _tr == null ? -0.04 : _tr * 0.9;
export const FONT = { ui: BRAND.fonts.ui, word: BRAND.fonts.word, mono: BRAND.fonts.mono, display: (BRAND.fonts as { display?: string }).display ?? BRAND.fonts.ui };

export const clamp01 = (v: number) => (v <= 0 ? 0 : v >= 1 ? 1 : v);
/** 0..1 progress of `f` through [a, b] */
export const seg = (f: number, a: number, b: number) => clamp01((f - a) / (b - a));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const easeOut = (t: number) => 1 - (1 - clamp01(t)) ** 3;
export const easeIn = (t: number) => clamp01(t) ** 3;
export const easeInOut = (t: number) => { t = clamp01(t); return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2; };
export const backOut = (t: number) => { t = clamp01(t); const c = 1.7; return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2; };
/** springy settle: overshoots once, then rests at 1 */
export const pop = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : 1 - Math.exp(-6 * t) * Math.cos(t * 9));
export const typed = (s: string, t: number) => s.slice(0, Math.round(s.length * clamp01(t)));

// ---------------------------------------------------------------- lines
/** A hand-inked line: authored control points, a fixed wobble, and a small "boil" that re-rolls
 *  every 4 frames so a held drawing still breathes. `progress` draws the first part only. */
export const ink = (ctx: Ctx, pts: P[], o: { w?: number; color?: string; seed?: number; frame?: number; closed?: boolean; progress?: number; wob?: number; boil?: number; alpha?: number; fill?: string; dash?: number[] } = {}) => {
  const { w = 4, color = C.ink, seed = 1, frame = 0, closed = false, progress = 1, wob = 1.2, boil = 0.7, alpha = 1, fill, dash } = o;
  if (progress <= 0) return;
  const base = jitter(pts, wob, seed), s = sample(jitter(base, boil, seed * 131 + Math.floor(frame / 4)), closed, 8);
  const n = Math.max(2, Math.ceil(s.length * clamp01(progress)));
  ctx.save(); ctx.globalAlpha *= alpha; ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.beginPath(); for (let i = 0; i < n; i++) (i ? ctx.lineTo : ctx.moveTo).call(ctx, s[i][0], s[i][1]);
  if (fill && progress >= 1) { ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); }
  if (dash) ctx.setLineDash(dash);
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.stroke(); ctx.restore();
};
export const rr = (ctx: Ctx, x: number, y: number, w: number, h: number, r: number) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
export const fillRR = (ctx: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string, stroke?: string, lw = 3) => { rr(ctx, x, y, w, h, r); ctx.fillStyle = fill; ctx.fill(); if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); } };

// ---------------------------------------------------------------- type
type TextOpts = { size?: number; weight?: number | string; color?: string; align?: CanvasTextAlign; font?: string; alpha?: number; base?: CanvasTextBaseline; spacing?: number };
export const text = (ctx: Ctx, s: string, x: number, y: number, o: TextOpts = {}) => {
  const { size = 28, weight = 500, color = C.cocoa, align = "left", font = FONT.ui, alpha = 1, base = "alphabetic", spacing = 0 } = o;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.font = `${weight} ${size}px ${font}`; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = base;
  if (spacing) (ctx as unknown as { letterSpacing: string }).letterSpacing = `${spacing}px`;
  ctx.fillText(s, x, y); ctx.restore();
};
export const measure = (ctx: Ctx, s: string, size: number, weight: number | string = 500, font = FONT.ui, spacing = 0) => { ctx.save(); ctx.font = `${weight} ${size}px ${font}`; if (spacing) (ctx as unknown as { letterSpacing: string }).letterSpacing = `${spacing}px`; const w = ctx.measureText(s).width; ctx.restore(); return w; };

// ---------------------------------------------------------------- grounds
/** linen paper with soft diagonal bands that drift, so no frame is ever a still */
export const paperGround = (ctx: Ctx, frame: number, band = C.peach, alpha = 0.32, w = W, h = H, ground = C.linen) => {
  ctx.fillStyle = ground; ctx.fillRect(0, 0, w, h);
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = band;
  const step = 170, off = (frame * 1.2) % (step * 2);
  for (let x = -h - step * 2 + off; x < w + step; x += step * 2) { ctx.beginPath(); ctx.moveTo(x, h); ctx.lineTo(x + step, h); ctx.lineTo(x + step + h, 0); ctx.lineTo(x + h, 0); ctx.closePath(); ctx.fill(); }
  ctx.restore();
};
/** the dark environment: warm cocoa night, a faint drafting grid and slow-twinkling stars */
export const nightGround = (ctx: Ctx, frame: number, seed = 7, w = W, h = H) => {
  ctx.fillStyle = C.night; ctx.fillRect(0, 0, w, h);
  ctx.save(); ctx.strokeStyle = "rgba(241,231,218,0.045)"; ctx.lineWidth = 1;
  for (let x = 0; x <= w; x += 60) { ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, h); ctx.stroke(); }
  for (let y = 0; y <= h; y += 60) { ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(w, y + 0.5); ctx.stroke(); }
  const r = rng(seed);
  for (let i = 0; i < 70; i++) { const x = r() * w, y = r() * h * 0.62, ph = r() * 6.28, s = 1 + r() * 1.8; ctx.globalAlpha = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(frame / 14 + ph)); ctx.fillStyle = C.nightText; ctx.beginPath(); ctx.arc(x, y, s, 0, 6.29); ctx.fill(); }
  ctx.restore();
};

// ---------------------------------------------------------------- beat label + counter (Addy's grammar)
export const beatLabel = (ctx: Ctx, frame: number, local: number, n: number, label: string, sub = "", dark = false) => {
  const t = easeOut(local / 12), col = dark ? C.nightText : C.cocoa, x = 72, y = 92;
  text(ctx, label, x, y, { size: 34, weight: 600, color: col, alpha: t });
  const w = measure(ctx, label, 34, 600);
  ink(ctx, [[x, y + 12], [x + w * 0.5, y + 15], [x + w, y + 11]], { w: 5, color: C.clay, seed: 90 + n, frame, progress: seg(local, 4, 20) });
  if (sub) text(ctx, sub, x, y + 52, { size: 24, weight: 500, color: dark ? C.nightMuted : C.muted, alpha: seg(local, 10, 24) });
  // counter ring, top right: the film's progress, always turning
  const cx = W - 104, cy = 84, p = frame / 1800;
  ctx.save(); ctx.lineWidth = 5; ctx.strokeStyle = dark ? C.nightBorder : C.border; ctx.beginPath(); ctx.arc(cx, cy, 26, 0, 6.29); ctx.stroke();
  ctx.strokeStyle = C.clay; ctx.lineCap = "round"; ctx.beginPath(); ctx.arc(cx, cy, 26, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2); ctx.stroke();
  ctx.fillStyle = C.clay; rr(ctx, cx - 7, cy - 7, 14, 14, 3); ctx.fill(); ctx.restore();
  void n;
};

// ---------------------------------------------------------------- props
export type CardOpts = { x: number; y: number; w?: number; h?: number; rot?: number; title?: string; lines?: number; lock?: boolean; token?: boolean; tag?: string; alpha?: number; scale?: number; dark?: boolean; ghost?: boolean; frame?: number; seed?: number };
/** a note card: paper, a title, scribble lines, a folded corner (clay on the token note) */
export const card = (ctx: Ctx, o: CardOpts) => {
  const { x, y, w = 190, h = 124, rot = 0, title = "", lines = 3, lock = false, token = false, tag, alpha = 1, scale = 1, dark = false, ghost = false, frame = 0, seed = 3 } = o;
  if (alpha <= 0 || scale <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(x, y); ctx.rotate(rot); ctx.scale(scale, scale); ctx.translate(-w / 2, -h / 2);
  if (ghost) { ctx.setLineDash([10, 8]); rr(ctx, 0, 0, w, h, 14); ctx.strokeStyle = dark ? C.nightMuted : C.muted; ctx.lineWidth = 3; ctx.stroke(); ctx.restore(); return; }
  fillRR(ctx, 4, 6, w, h, 14, dark ? "rgba(0,0,0,0.35)" : "rgba(58,48,40,0.12)");
  const fold = 30;
  ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(w - fold, 0); ctx.lineTo(w, fold); ctx.lineTo(w, h - 14); ctx.quadraticCurveTo(w, h, w - 14, h); ctx.lineTo(14, h); ctx.quadraticCurveTo(0, h, 0, h - 14); ctx.lineTo(0, 14); ctx.quadraticCurveTo(0, 0, 14, 0); ctx.closePath();
  ctx.fillStyle = dark ? C.nightSurface2 : C.surface; ctx.fill(); ctx.strokeStyle = dark ? C.nightBorder : C.ink; ctx.lineWidth = 3; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(w - fold, 0); ctx.lineTo(w - fold, fold - 4); ctx.quadraticCurveTo(w - fold, fold, w - fold + 4, fold); ctx.lineTo(w, fold); ctx.closePath(); ctx.fillStyle = token ? C.clay : dark ? C.nightBorder : C.peach; ctx.fill(); ctx.stroke();
  let ty = 36;
  if (title) { text(ctx, title, 18, ty, { size: 21, weight: 600, color: dark ? C.nightText : C.cocoa }); ty += 14; }
  const r = rng(seed);
  for (let i = 0; i < lines; i++) { const lw = (w - 44) * (0.55 + r() * 0.4); ink(ctx, [[18, ty + 12 + i * 20], [18 + lw, ty + 12 + i * 20]], { w: 4, color: dark ? C.nightMuted : C.border, seed: seed * 10 + i, frame, wob: 0.6, boil: 0.3 }); }
  if (lock) lockIcon(ctx, w - 30, h - 30, 16, C.clay);
  if (tag) chip(ctx, 16, h + 10, tag, { size: 17, bg: dark ? C.nightSurface : C.peach, fg: dark ? C.nightText : C.clayText });
  ctx.restore();
};
export const lockIcon = (ctx: Ctx, cx: number, cy: number, s: number, col: string) => {
  ctx.save(); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = s * 0.22;
  ctx.beginPath(); ctx.arc(cx, cy - s * 0.3, s * 0.42, Math.PI, 0); ctx.stroke();
  rr(ctx, cx - s * 0.62, cy - s * 0.3, s * 1.24, s * 0.95, s * 0.18); ctx.fill(); ctx.restore();
};
export const chip = (ctx: Ctx, x: number, y: number, label: string, o: { size?: number; bg?: string; fg?: string; border?: string; alpha?: number; mono?: boolean } = {}) => {
  const { size = 22, bg = C.peach, fg = C.clayText, border, alpha = 1, mono = false } = o, font = mono ? FONT.mono : FONT.ui, w = measure(ctx, label, size, 600, font) + size * 1.1, h = size * 1.6;
  ctx.save(); ctx.globalAlpha *= alpha; fillRR(ctx, x, y, w, h, h / 2, bg, border, 2);
  text(ctx, label, x + size * 0.55, y + h * 0.68, { size, weight: 600, color: fg, font }); ctx.restore();
  return w;
};
/** keycap with travel: `press` 0 up .. 1 down */
export const key = (ctx: Ctx, x: number, y: number, w: number, h: number, label: string, press: number) => {
  const up = 16 * (1 - press);
  fillRR(ctx, x, y + 16, w, h, 22, C.cocoa);
  fillRR(ctx, x, y + 16 - up, w, h, 22, C.surface, C.ink, 4);
  text(ctx, label, x + w / 2, y + 16 - up + h * 0.6, { size: Math.min(58, h * 0.4), weight: 600, align: "center", color: C.cocoa });
};
/** the vault folder; `open` lifts the front flap */
export const folder = (ctx: Ctx, x: number, y: number, w: number, h: number, o: { open?: number; label?: string; dark?: boolean; front?: boolean; back?: boolean } = {}) => {
  const { open = 0, label = "", dark = false, front = true, back = true } = o, tabW = w * 0.34;
  ctx.save(); ctx.lineWidth = 4; ctx.strokeStyle = C.ink; ctx.lineJoin = "round";
  if (back) {
    ctx.beginPath(); ctx.moveTo(x, y + 20); ctx.lineTo(x, y); ctx.quadraticCurveTo(x, y - 10, x + 12, y - 12); ctx.lineTo(x + tabW - 20, y - 12); ctx.lineTo(x + tabW + 10, y + 14); ctx.lineTo(x + w - 14, y + 14); ctx.quadraticCurveTo(x + w, y + 14, x + w, y + 28); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.closePath();
    ctx.fillStyle = dark ? "#9c6a4e" : C.clay; ctx.fill(); ctx.stroke();
    if (label) text(ctx, label, x + 22, y + 8, { size: 22, weight: 600, color: C.surface });
  }
  if (front) {
    const lift = open * h * 0.34;
    ctx.beginPath(); ctx.moveTo(x - 6, y + 46 + lift); ctx.lineTo(x + w + 6, y + 46 + lift); ctx.lineTo(x + w - 4, y + h); ctx.lineTo(x + 4, y + h); ctx.closePath();
    ctx.fillStyle = "#e3a585"; ctx.fill(); ctx.stroke();
  }
  ctx.restore();
};
/** a notification bubble with a count: the mainland's noise */
export const badge = (ctx: Ctx, x: number, y: number, s: number, count: string, glyph: number, alpha = 1) => {
  if (s <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(x, y); ctx.scale(s, s);
  fillRR(ctx, -46, -46, 92, 92, 24, C.surface, C.ink, 4);
  ctx.strokeStyle = C.muted; ctx.lineWidth = 5; ctx.lineCap = "round";
  if (glyph === 0) { ctx.beginPath(); ctx.moveTo(-22, -10); ctx.lineTo(0, 8); ctx.lineTo(22, -10); ctx.rect(-24, -18, 48, 34); ctx.stroke(); }
  else if (glyph === 1) { ctx.beginPath(); ctx.arc(0, -6, 18, Math.PI, 0); ctx.lineTo(18, 12); ctx.lineTo(-18, 12); ctx.closePath(); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 18, 5, 0, 6.29); ctx.stroke(); }
  else { rr(ctx, -24, -20, 48, 32, 10); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-10, 12); ctx.lineTo(-16, 24); ctx.lineTo(0, 12); ctx.stroke(); }
  ctx.fillStyle = C.badge; ctx.beginPath(); ctx.arc(40, -40, 24, 0, 6.29); ctx.fill(); ctx.strokeStyle = C.surface; ctx.lineWidth = 4; ctx.stroke();
  text(ctx, count, 40, -32, { size: count.length > 2 ? 17 : 22, weight: 600, color: "#fff", align: "center" });
  ctx.restore();
};
/** a remote-AI cloud: puffy, with a little antenna and dot eyes */
export const cloud = (ctx: Ctx, x: number, y: number, s: number, o: { dark?: boolean; frame?: number; seed?: number; eyes?: boolean; alpha?: number; face?: "curious" | "dizzy" } = {}) => {
  const { dark = true, frame = 0, seed = 5, eyes = true, alpha = 1, face = "curious" } = o;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(x, y); ctx.scale(s, s);
  const puffs: [number, number, number][] = [[-52, 8, 34], [-18, -18, 42], [26, -12, 38], [56, 10, 30], [0, 16, 40]];
  ctx.fillStyle = dark ? "#e9ecf2" : C.surface; ctx.strokeStyle = C.ink; ctx.lineWidth = 4;
  ctx.beginPath(); for (const [px, py, r] of puffs) { ctx.moveTo(px + r, py); ctx.arc(px, py, r, 0, 6.29); } ctx.fill();
  ink(ctx, [[-86, 20], [-84, -4], [-62, -26], [-44, -48], [-8, -60], [26, -52], [50, -34], [78, -18], [90, 14], [70, 44], [-60, 46], [-86, 20]], { w: 4, seed, frame, wob: 1.5 });
  ink(ctx, [[0, -60], [4, -84]], { w: 4, seed: seed + 1, frame }); ctx.fillStyle = C.clay; ctx.beginPath(); ctx.arc(4, -88, 7, 0, 6.29); ctx.fill();
  if (eyes) {
    ctx.fillStyle = C.ink;
    if (face === "dizzy") { ink(ctx, [[-28, 2], [-14, 14]], { w: 4 }); ink(ctx, [[-28, 14], [-14, 2]], { w: 4 }); ink(ctx, [[14, 2], [28, 14]], { w: 4 }); ink(ctx, [[14, 14], [28, 2]], { w: 4 }); }
    else { ctx.beginPath(); ctx.arc(-20, 6, 6, 0, 6.29); ctx.arc(20, 6, 6, 0, 6.29); ctx.fill(); }
  }
  ctx.restore();
};

// ---------------------------------------------------------------- the Rotli app window
export const APP = { side: 300 };
/** app chrome at (x, y, w, h): traffic lights, sidebar (Home · Main · System + notes), editor */
export const appWindow = (ctx: Ctx, x: number, y: number, w: number, h: number, o: { notes?: string[]; active?: number; frame?: number; dark?: boolean } = {}) => {
  const { notes = ["Trip ideas", "Ferry times", "Reading list"], active = 0, dark = false } = o, S = APP.side;
  fillRR(ctx, x + 10, y + 16, w, h, 26, dark ? "rgba(0,0,0,0.4)" : "rgba(58,48,40,0.14)");
  fillRR(ctx, x, y, w, h, 26, dark ? C.nightSurface : C.surface, C.ink, 4);
  ctx.save(); rr(ctx, x, y, w, h, 26); ctx.clip();
  ctx.fillStyle = dark ? C.night : C.linen; ctx.fillRect(x, y, S, h);
  ctx.strokeStyle = dark ? C.nightBorder : C.border; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + S, y); ctx.lineTo(x + S, y + h); ctx.stroke();
  ["#e8836f", "#e8c46f", "#9cc27e"].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x + 32 + i * 28, y + 32, 9, 0, 6.29); ctx.fill(); });
  const txt = dark ? C.nightText : C.cocoa, mut = dark ? C.nightMuted : "#5a4e44";
  let sy = y + 104;
  text(ctx, "Home", x + 34, sy, { size: 25, weight: 500, color: mut }); sy += 46;
  text(ctx, "Main", x + 34, sy, { size: 25, weight: 600, color: txt }); sy += 40;
  notes.forEach((n, i) => { if (i === active) fillRR(ctx, x + 18, sy - 28, S - 36, 40, 10, dark ? C.nightSurface2 : C.peach); text(ctx, n, x + 52, sy, { size: 24, weight: i === active ? 600 : 500, color: i === active ? txt : mut }); sy += 44; });
  sy += 10; text(ctx, "System", x + 34, sy, { size: 25, weight: 500, color: mut });
  text(ctx, "Files", x + 34, y + h - 34, { size: 24, weight: 500, color: mut });
  ctx.restore();
};

// ---------------------------------------------------------------- scenery helpers
/** little motion streaks behind something fast */
export const speedLines = (ctx: Ctx, x: number, y: number, dir: number, n: number, len: number, frame: number, col = C.muted, alpha = 0.6) => {
  for (let i = 0; i < n; i++) { const yy = y + (i - (n - 1) / 2) * 18, l = len * (0.6 + 0.4 * Math.sin(frame * 0.9 + i * 2)); ink(ctx, [[x, yy], [x - dir * l, yy]], { w: 4, color: col, seed: i + 40, frame, alpha }); }
};
/** a soft round shadow under a character */
export const shadow = (ctx: Ctx, x: number, y: number, w: number, a = 0.18, col = "#3a3028") => { ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, y, w, w * 0.18, 0, 0, 6.29); ctx.fill(); ctx.restore(); };
export const sparkle = (ctx: Ctx, x: number, y: number, s: number, col = C.clay, rot = 0) => {
  if (s <= 0) return; ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.fillStyle = col; ctx.beginPath();
  for (let i = 0; i < 8; i++) { const r = i % 2 ? s * 0.28 : s, a = (i / 8) * Math.PI * 2; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); ctx.restore();
};
export type { P };
