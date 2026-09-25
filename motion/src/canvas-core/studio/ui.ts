// APP UI, drawn from one theme's semantic roles: the window, sidebar, Markdown blocks as Rotli
// renders them (headings, task states, result buttons, choices, tables, code, links), a file list,
// a chat panel and a pointer. Episodes compose these; every colour comes from the theme, so any
// scene re-renders in any of the twelve environments.
import type { Ctx } from "../core";
import { C, FONT, fillRR, ink, measure, rr, text } from "../rotli/kit";
import { LOOK, familyThemes, firstFamily, theme, useFamily, type Family, type Theme } from "./stage";

/** the UI's light and dark themes: COPIES, so a piece's family (useFamilyUI) never touches the theme table */
const copy = (t: Theme): Theme => ({ ...t, roles: { ...t.roles } });
// Rotli's ids are "light"/"dark"; any other brand starts from its first family
export const LIGHT = copy(theme("light") ?? familyThemes(firstFamily())[0]), DARK = copy(theme("dark") ?? familyThemes(firstFamily())[1]);
/** pick the piece's theme family once, at module load: palette, UI themes and quokka colour follow it */
export const useFamilyUI = (fam: Family) => useFamily(fam, LIGHT, DARK);
/** snapshot the active colours (palette, UI themes, look); the returned function puts them back. A frame
 *  re-rendered from another piece (reframe) may switch family mid-draw; the host keeps its own. */
export const saveLook = () => { const c = { ...C }, l = copy(LIGHT), d = copy(DARK), k = { ...LOOK }; return () => { Object.assign(C, c); Object.assign(LIGHT, l); Object.assign(DARK, d); Object.assign(LOOK, k); }; };
export type Rect = { x: number; y: number; w: number; h: number };

/** the Rotli window: traffic lights, sidebar (Home · Main + notes · System · Files), editor. Returns the editor rect. */
export const appFrame = (ctx: Ctx, th: Theme, r: Rect, o: { notes?: string[]; active?: number; side?: number; sidebar?: boolean; title?: string } = {}): Rect => {
  const R = th.roles, S = o.sidebar === false ? 0 : (o.side ?? 300), notes = o.notes ?? ["Trip ideas", "Ferry times", "Reading list"];
  fillRR(ctx, r.x + 10, r.y + 16, r.w, r.h, 26, th.mode === "dark" ? "rgba(0,0,0,0.35)" : "rgba(58,48,40,0.12)");
  fillRR(ctx, r.x, r.y, r.w, r.h, 26, R.surface, th.mode === "dark" ? R.border : "#2b231d", 4);
  ctx.save(); rr(ctx, r.x, r.y, r.w, r.h, 26); ctx.clip();
  ["#e8836f", "#e8c46f", "#9cc27e"].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(r.x + 32 + i * 28, r.y + 32, 9, 0, 6.29); ctx.fill(); });
  if (S) {
    ctx.fillStyle = R.ground; ctx.fillRect(r.x, r.y, S, r.h); ctx.fillStyle = R.border; ctx.fillRect(r.x + S, r.y, 2, r.h);
    let sy = r.y + 104; text(ctx, "Home", r.x + 34, sy, { size: 25, color: R["text-muted"] }); sy += 46;
    text(ctx, "Main", r.x + 34, sy, { size: 25, weight: 600, color: R.text }); sy += 42;
    notes.forEach((n, i) => { if (i === o.active) fillRR(ctx, r.x + 18, sy - 30, S - 36, 44, 10, R.tint); text(ctx, n, r.x + 52, sy, { size: 24, weight: i === o.active ? 600 : 500, color: i === o.active ? R.text : R["text-muted"] }); sy += 46; });
    sy += 12; text(ctx, "System", r.x + 34, sy, { size: 25, color: R["text-muted"] });
    text(ctx, "Files", r.x + 34, r.y + r.h - 34, { size: 24, color: R["text-muted"] });
  }
  if (o.title) text(ctx, o.title, r.x + S + (r.w - S) / 2, r.y + 40, { size: 22, weight: 500, align: "center", color: R["text-muted"] });
  ctx.restore();
  return { x: r.x + S + 64, y: r.y + 70, w: r.w - S - 110, h: r.h - 100 };
};

// ---------------------------------------------------------------- Markdown, as Rotli draws it
export const heading = (ctx: Ctx, th: Theme, x: number, y: number, s: string, size = 58, alpha = 1) => text(ctx, s, x, y, { size, weight: 600, color: th.roles.text, alpha });
export const para = (ctx: Ctx, th: Theme, x: number, y: number, s: string, o: { size?: number; muted?: boolean; alpha?: number; weight?: number } = {}) => text(ctx, s, x, y, { size: o.size ?? 30, weight: o.weight ?? 500, color: o.muted ? th.roles["text-muted"] : th.roles.text, alpha: o.alpha });
/** raw Markdown: syntax characters in the accent, prose in text, mono. Returns the caret x. */
export const raw = (ctx: Ctx, th: Theme, x: number, y: number, s: string, syntax: number, alpha = 1, size = 30) => {
  const a = s.slice(0, syntax), b = s.slice(syntax);
  text(ctx, a, x, y, { size, font: FONT.mono, color: th.roles["accent-text"], alpha });
  text(ctx, b, x + measure(ctx, a, size, 500, FONT.mono), y, { size, font: FONT.mono, color: th.roles.text, alpha });
  return x + measure(ctx, s, size, 500, FONT.mono);
};
export const caret = (ctx: Ctx, th: Theme, x: number, y: number, f: number, size = 32) => { if (Math.floor(f / 8) % 2 === 0) { ctx.fillStyle = th.roles.accent; ctx.fillRect(x + 2, y - size * 0.8, 3, size); } };
/** a task: done (success fill + tick), in progress (half accent), open */
export const task = (ctx: Ctx, th: Theme, x: number, y: number, state: "x" | "/" | " ", label: string, o: { tick?: number; alpha?: number; size?: number } = {}) => {
  const R = th.roles, t = o.tick ?? 1, sz = o.size ?? 30; ctx.save(); ctx.globalAlpha *= o.alpha ?? 1;
  if (state === "x") { fillRR(ctx, x, y - 26, 32, 32, 8, t > 0 ? R.success : R.surface, t > 0 ? R.success : R["text-muted"], 3); if (t > 0) ink(ctx, [[x + 7, y - 10], [x + 14, y - 3], [x + 26, y - 18]], { w: 4.5, color: R.surface, progress: t, wob: 0.2, boil: 0 }); }
  else if (state === "/") { fillRR(ctx, x, y - 26, 32, 32, 8, R.surface, R.accent, 3); ctx.save(); rr(ctx, x, y - 26, 32, 32, 8); ctx.clip(); ctx.fillStyle = R.accent; ctx.fillRect(x, y - 26, 16, 32); ctx.restore(); }
  else fillRR(ctx, x, y - 26, 32, 32, 8, R.surface, R["text-muted"], 3);
  text(ctx, label, x + 50, y, { size: sz, color: state === "x" && t > 0 ? R["text-muted"] : R.text });
  if (state === "x" && t > 0) { ctx.fillStyle = R["text-muted"]; ctx.fillRect(x + 50, y - 10, measure(ctx, label, sz) * t, 3); }
  ctx.restore();
};
/** result buttons like [Ready][Blocked]: the chosen one fills with its colour */
export const results = (ctx: Ctx, th: Theme, x: number, y: number, labels: string[], chosen: number, colors = ["#8d9a76", "#c97e62", "#2f6f9e"]) => {
  let cx = x; labels.forEach((l, i) => { const w = measure(ctx, l, 26, 600) + 40, on = i === chosen, c = colors[i % colors.length]; fillRR(ctx, cx, y - 32, w, 46, 12, on ? c : th.roles.surface, c, 3); text(ctx, l, cx + w / 2, y, { size: 26, weight: 600, align: "center", color: on ? "#ffffff" : c }); cx += w + 14; }); return cx;
};
/** a choice list: one answer (radio) or several */
export const choice = (ctx: Ctx, th: Theme, x: number, y: number, opts: string[], picked: number[], multi = false) => {
  const R = th.roles; opts.forEach((o, i) => { const yy = y + i * 50, on = picked.includes(i);
    if (multi) fillRR(ctx, x, yy - 26, 30, 30, 7, on ? R.accent : R.surface, on ? R.accent : R["text-muted"], 3); else { ctx.beginPath(); ctx.arc(x + 15, yy - 11, 15, 0, 6.29); ctx.fillStyle = R.surface; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = on ? R.accent : R["text-muted"]; ctx.stroke(); if (on) { ctx.beginPath(); ctx.arc(x + 15, yy - 11, 8, 0, 6.29); ctx.fillStyle = R.accent; ctx.fill(); } }
    text(ctx, o, x + 48, yy, { size: 28, color: R.text }); });
};
/** a rendered table; `hot` = [row, col] of the cell being edited */
export const table = (ctx: Ctx, th: Theme, x: number, y: number, colW: number[], rows: string[][], hot?: [number, number]) => {
  const R = th.roles, rh = 50, w = colW.reduce((a, b) => a + b, 0);
  fillRR(ctx, x, y, w, rh * rows.length, 10, R.surface, R.border, 2); ctx.fillStyle = R["surface-2"]; ctx.fillRect(x + 2, y + 2, w - 4, rh - 2);
  rows.forEach((row, ri) => { let cx = x; row.forEach((c, ci) => { if (hot && hot[0] === ri && hot[1] === ci) { ctx.strokeStyle = R.accent; ctx.lineWidth = 3; ctx.strokeRect(cx + 3, y + ri * rh + 3, colW[ci] - 6, rh - 6); } text(ctx, c, cx + 16, y + ri * rh + 33, { size: 25, weight: ri ? 500 : 600, color: R.text }); cx += colW[ci]; }); if (ri) { ctx.fillStyle = R.border; ctx.fillRect(x, y + ri * rh, w, 2); } });
  let cx = x; colW.slice(0, -1).forEach((cw) => { cx += cw; ctx.fillStyle = R.border; ctx.fillRect(cx, y, 2, rh * rows.length); });
};
export const codeBlock = (ctx: Ctx, th: Theme, x: number, y: number, w: number, lines: string[]) => {
  const R = th.roles; fillRR(ctx, x, y, w, 30 + lines.length * 38, 12, R["surface-2"], R.border, 2);
  lines.forEach((l, i) => text(ctx, l, x + 22, y + 46 + i * 38, { size: 25, font: FONT.mono, color: i === 0 ? R["syntax-blue"] : R.text }));
};
export const link = (ctx: Ctx, th: Theme, x: number, y: number, pre: string, label: string, underline = 1, size = 30) => {
  para(ctx, th, x, y, pre, { size }); const lx = x + measure(ctx, pre, size); text(ctx, label, lx, y, { size, weight: 600, color: th.roles["accent-text"] }); ctx.fillStyle = th.roles.accent; ctx.fillRect(lx, y + 7, measure(ctx, label, size, 600) * underline, 3); return lx;
};
export const tagChip = (ctx: Ctx, th: Theme, x: number, y: number, s: string, size = 24) => { const w = measure(ctx, s, size, 600) + 30; fillRR(ctx, x, y - size - 10, w, size + 20, (size + 20) / 2, th.roles.tint); text(ctx, s, x + 15, y, { size, weight: 600, color: th.roles["accent-text"] }); return w; };

/** a Finder-like file list; kinds: dir | md | board | doc | pdf | chat */
export const fileList = (ctx: Ctx, th: Theme, r: Rect, rows: { name: string; kind: string; depth?: number; note?: string }[], sel = -1, rowH = 54) => {
  const R = th.roles; fillRR(ctx, r.x, r.y, r.w, r.h, 18, R.surface, R.border, 2);
  rows.forEach((row, i) => { const y = r.y + 20 + i * rowH, x = r.x + 24 + (row.depth ?? 0) * 34; if (i === sel) fillRR(ctx, r.x + 10, y - 4, r.w - 20, rowH - 6, 10, R.tint);
    const col = row.kind === "dir" ? R.accent : row.kind === "board" ? "#6fa68b" : row.kind === "doc" ? "#185abd" : row.kind === "pdf" ? "#9f3d3d" : row.kind === "chat" ? "#a58bd9" : R["text-muted"];
    if (row.kind === "dir") { ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(x, y + 12, 34, 24, 4); ctx.fill(); ctx.fillRect(x, y + 8, 14, 8); } else { fillRR(ctx, x + 4, y + 6, 26, 34, 4, R.surface, col, 3); ctx.fillStyle = col; ctx.fillRect(x + 9, y + 18, 16, 3); ctx.fillRect(x + 9, y + 26, 12, 3); }
    text(ctx, row.name, x + 50, y + 33, { size: 26, weight: row.kind === "dir" ? 600 : 500, color: R.text, font: row.kind === "dir" ? FONT.ui : FONT.ui });
    if (row.note) text(ctx, row.note, r.x + r.w - 24, y + 33, { size: 22, align: "right", color: R["text-muted"] }); });
};
/** a pointer: `press` 0..1 squashes it and throws a ring */
export const pointer = (ctx: Ctx, x: number, y: number, press = 0) => {
  if (press > 0 && press < 1) { ctx.save(); ctx.globalAlpha = 1 - press; ctx.strokeStyle = "#c97e62"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, 12 + press * 34, 0, 6.29); ctx.stroke(); ctx.restore(); }
  const s = 1 - 0.15 * Math.sin(Math.min(1, press) * Math.PI);
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 40); ctx.lineTo(10, 30); ctx.lineTo(18, 47); ctx.lineTo(25, 44); ctx.lineTo(17, 28); ctx.lineTo(30, 28); ctx.closePath(); ctx.fillStyle = "#ffffff"; ctx.fill(); ctx.lineWidth = 3.5; ctx.lineJoin = "round"; ctx.strokeStyle = "#2b231d"; ctx.stroke(); ctx.restore();
};
/** a keycap chord like ⌥ Space, drawn small for on-screen callouts */
export const keys = (ctx: Ctx, x: number, y: number, caps: string[], press = 0, size = 44) => {
  let cx = x; caps.forEach((c) => { const w = Math.max(size * 1.4, measure(ctx, c, size * 0.5, 600) + size * 0.8), up = 7 * (1 - press); fillRR(ctx, cx, y + 7, w, size * 1.4, 12, "#3a3028"); fillRR(ctx, cx, y + 7 - up, w, size * 1.4, 12, "#ffffff", "#2b231d", 3); text(ctx, c, cx + w / 2, y + 7 - up + size * 0.9, { size: size * 0.5, weight: 600, align: "center" }); cx += w + 10; }); return cx;
};
export { measure };
