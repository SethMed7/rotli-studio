// SEASON ONE · 07 — ASK THE ISLAND. (60 s). Brief: season/episodes/s01e07.json
// Setup: Evening, and the quokka can't remember what's left before the trip.
// Turn: It opens Chat: an on-device model reads the vault and answers from what's actually there, naming the notes it read.
// Payoff: The answer keeps Conversation notes, the chat is saved as Markdown, and a PDF of the plan is filed beside it.
// Token: the Trip ideas note (read first, carried at dusk, back in the payoff beside the PDF).
//
// Cue table (global frames): cold 0 (question 118, chat intent 166) · chapter 210 · ask 330 (send 422,
// read 436–480, answer 500–576, model picker 612–726) · notes 780 (rows 812–872, file view 980) ·
// pdf 1170 (send 1236, pdf filed 1305, handed over 1340–1372) · payoff 1470 · end 1680.
import type { Ctx, Env } from "./core";
import type { Film } from "./film";
import { hopAlong, poseAt } from "./rotli/actor";
import { FONT, card, lerp, sparkle, typed } from "./rotli/kit";
import type { PoseName } from "./quokka/poses";
import type { DeriveSpec } from "./studio/derive";
import { lowerThird } from "./studio/series";
import { C, LIGHT, actor, backOut, chapterCard, easeInOut, easeOut, fillRR, glyph, ink, intertitle, measure, pop, sceneStart, seg, story, storyEnd, text, thought, type Scene, type S } from "./studio/story";
import { appFrame, caret, pointer, raw, tagChip } from "./studio/ui";

const T = LIGHT; // re-pointed at Iris by the engine every frame: always read T.roles inside a draw

// ---------------------------------------------------------------- helpers
/** a pointer path through [frame, x, y] waypoints */
const path = (l: number, w: [number, number, number][]) => {
  if (l <= w[0][0]) return { x: w[0][1], y: w[0][2] };
  for (let i = 1; i < w.length; i++) { const [f0, x0, y0] = w[i - 1], [f1, x1, y1] = w[i]; if (l < f1) { const k = easeInOut((l - f0) / (f1 - f0)); return { x: x0 + (x1 - x0) * k, y: y0 + (y1 - y0) * k }; } }
  const e = w[w.length - 1]; return { x: e[1], y: e[2] };
};
const press = (l: number, ats: number[]) => ats.reduce((a, at) => (l >= at && l < at + 12 ? (l - at) / 12 : a), 0);
/** a drawing faded between two local frames */
const fading = (ctx: Ctx, a: number, draw: () => void) => { if (a <= 0) return; ctx.save(); ctx.globalAlpha *= Math.min(1, a); draw(); ctx.restore(); };
/** a glyph from the thought-bubble set, drawn in place */
const mark = (ctx: Ctx, g: Parameters<typeof glyph>[1], x: number, y: number, s: number, col: string, acc: string) => { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); glyph(ctx, g, col, acc); ctx.restore(); };
/** a small note icon (folded corner); the token's fold is the accent */
const noteIcon = (ctx: Ctx, x: number, y: number, token = false) => {
  const R = T.roles; ctx.save(); ctx.lineWidth = 3; ctx.strokeStyle = R["text-muted"]; ctx.lineJoin = "round";
  ctx.beginPath(); ctx.moveTo(x, y - 30); ctx.lineTo(x + 16, y - 30); ctx.lineTo(x + 26, y - 20); ctx.lineTo(x + 26, y + 4); ctx.lineTo(x, y + 4); ctx.closePath(); ctx.fillStyle = R.surface; ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 16, y - 30); ctx.lineTo(x + 16, y - 20); ctx.lineTo(x + 26, y - 20); ctx.closePath(); ctx.fillStyle = token ? C.clay : R.border; ctx.fill(); ctx.stroke(); ctx.restore();
};
/** a file icon for the Files column: md (muted), pdf (the failure red, as Finder's PDF), dir (accent) */
const fileIcon = (ctx: Ctx, kind: "dir" | "md" | "pdf", x: number, y: number) => {
  const R = T.roles;
  if (kind === "dir") { ctx.fillStyle = R.accent; ctx.beginPath(); ctx.roundRect(x, y - 26, 16, 8, 3); ctx.fill(); ctx.beginPath(); ctx.roundRect(x, y - 21, 36, 26, 4); ctx.fill(); return; }
  const col = kind === "pdf" ? R.failure : R["text-muted"]; fillRR(ctx, x + 5, y - 30, 26, 34, 4, R.surface, col, 3); ctx.fillStyle = col; ctx.fillRect(x + 10, y - 18, 16, 3); ctx.fillRect(x + 10, y - 10, 12, 3);
};
/** the plan as a PDF page: a paper sheet, a title, lines, the red PDF tab */
const pdfPage = (ctx: Ctx, x: number, y: number, s: number, rot: number, f: number) => {
  if (s <= 0) return; const R = T.roles;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  fillRR(ctx, -95, -125, 190, 250, 10, R.surface, C.ink, 3);
  text(ctx, "Trip plan", -70, -78, { size: 28, weight: 600, color: R.text });
  for (let i = 0; i < 5; i++) ink(ctx, [[-70, -40 + i * 28], [-70 + [130, 110, 140, 90, 120][i], -40 + i * 28]], { w: 4, color: R.border, seed: 60 + i, frame: f, wob: 0.5, boil: 0.3 });
  fillRR(ctx, 22, 84, 64, 32, 8, R.failure); text(ctx, "PDF", 54, 108, { size: 20, weight: 600, align: "center", color: R["on-accent"] });
  ctx.restore();
};

// ---------------------------------------------------------------- the Chat window (shared by ask · notes · pdf)
const WIN = { x: 110, y: 56, w: 1400, h: 790 }, CX = 160, CR = 920, DIV = 960, PX = 996, PR = 1470;
const Q1 = "What's left before the trip?", Q2 = "Make this a PDF.", REPLY = "Made Trip plan.pdf, beside this chat.";
const ANSWER = ["The ferry is booked: Saturday, 8:30.", "Still to pack: the snorkel.", "Not planned yet: the pink lake."];
const READ = ["Trip ideas", "Ferry times", "Packing list"];
const VAULT = [{ t: "Trip ideas", read: true, token: true }, { t: "Ferry times", read: true }, { t: "Packing list", read: true }, { t: "Call Sam" }, { t: "Salt lakes" }, { t: "Quokka facts" }];
const MODELS = ["On this Mac", "Claude Code", "Codex", "Cursor"];
const chipRect = (ctx: Ctx) => { const w = measure(ctx, MODELS[0], 26, 600) + 76; return { x: CR - w, y: 128, w, h: 46 }; };

/** the window itself, popping in with `k` */
const window_ = (ctx: Ctx, k: number, draw: () => void) => {
  if (k <= 0) return; const sc = 0.94 + 0.06 * pop(k), cx = WIN.x + WIN.w / 2, cy = WIN.y + WIN.h / 2;
  ctx.save(); ctx.globalAlpha *= Math.min(1, k * 1.5); ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.translate(-cx, -cy);
  appFrame(ctx, T, WIN, { sidebar: false }); draw(); ctx.restore();
};
/** the chat header: title, the file button, the globe (off), the model picker chip */
const header = (ctx: Ctx, open: boolean) => {
  const R = T.roles, c = chipRect(ctx);
  text(ctx, "Trip chat", CX, 164, { size: 34, weight: 600, color: R.text, spacing: -0.8 });
  fillRR(ctx, c.x, c.y, c.w, c.h, 23, open ? R.tint : R.surface, R.border, 2);
  // the on-device chip glyph: a little square with pins
  ctx.save(); ctx.strokeStyle = R["accent-text"]; ctx.lineWidth = 3; ctx.strokeRect(c.x + 16, c.y + 14, 18, 18); for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(c.x + 19 + i * 6, c.y + 9); ctx.lineTo(c.x + 19 + i * 6, c.y + 14); ctx.moveTo(c.x + 19 + i * 6, c.y + 32); ctx.lineTo(c.x + 19 + i * 6, c.y + 37); ctx.stroke(); } ctx.restore();
  text(ctx, MODELS[0], c.x + 44, c.y + 32, { size: 26, weight: 600, color: R["accent-text"] });
  ctx.beginPath(); ctx.moveTo(CR - 26, c.y + 20); ctx.lineTo(CR - 19, c.y + 28); ctx.lineTo(CR - 12, c.y + 20); ctx.strokeStyle = R["text-muted"]; ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.stroke();
  // the globe: off (answers come from the vault)
  const gx = c.x - 38; ctx.beginPath(); ctx.arc(gx, 151, 22, 0, 6.29); ctx.fillStyle = R.surface; ctx.fill(); ctx.strokeStyle = R.border; ctx.lineWidth = 2; ctx.stroke(); mark(ctx, "globe", gx, 151, 0.55, R["text-muted"], R["text-muted"]);
  ctx.fillStyle = R.border; ctx.fillRect(CX, 190, CR - CX, 2);
};
/** a sent message: a right-aligned tinted bubble that pops from its right edge */
const bubble = (ctx: Ctx, s: string, y: number, k: number) => {
  if (k <= 0) return; const R = T.roles, w = measure(ctx, s, 30, 500) + 52, x = CR - w;
  ctx.save(); ctx.translate(CR, y + 30); ctx.scale(k, k); ctx.translate(-CR, -y - 30); fillRR(ctx, x, y, w, 62, 22, R.tint); text(ctx, s, x + 26, y + 42, { size: 30, color: R.text }); ctx.restore();
};
const dots = (ctx: Ctx, x: number, y: number, l: number, t0: number) => { for (let i = 0; i < 3; i++) { ctx.fillStyle = T.roles["text-muted"]; ctx.beginPath(); ctx.arc(x + i * 26, y - Math.max(0, Math.sin((l - t0) / 3 - i)) * 9, 7, 0, 6.29); ctx.fill(); } };
/** the Read row: the notes the answer came from, named */
const readRow = (ctx: Ctx, l: number, at: number[]) => {
  if (l < at[0]) return; text(ctx, "Read", CX, 320, { size: 26, color: T.roles["text-muted"] });
  let x = CX + 76; READ.forEach((s, i) => { const k = pop(seg(l, at[i], at[i] + 10)), w = measure(ctx, s, 26, 600) + 30; if (k > 0) { ctx.save(); ctx.translate(x + w / 2, 306); ctx.scale(k, k); ctx.translate(-x - w / 2, -306); tagChip(ctx, T, x, 320, s, 26); ctx.restore(); } x += w + 12; });
};
/** the grounded answer, typed line by line from `at`; returns the caret spot while typing */
const answer = (ctx: Ctx, l: number, at: number[]): [number, number] | null => {
  if (l < at[0]) return null; const R = T.roles; let cur: [number, number] | null = null;
  fillRR(ctx, CX, 348, CR - CX, 170, 18, R.ground, R.border, 2);
  ANSWER.forEach((a, i) => { const k = seg(l, at[i], at[i] + 24); if (k <= 0) return; const s = typed(a, k), y = 398 + i * 46; text(ctx, s, CX + 28, y, { size: 30, weight: i === 0 ? 600 : 500, color: R.text }); if (k < 1) cur = [CX + 28 + measure(ctx, s, 30, i === 0 ? 600 : 500), y]; });
  return cur;
};
/** the composer, kept well above the caption zone */
const composer = (ctx: Ctx, l: number, draft: string) => {
  const R = T.roles; fillRR(ctx, CX, 726, CR - CX, 66, 20, R.surface, R.border, 2);
  if (draft) { text(ctx, draft, CX + 26, 769, { size: 30, color: R.text }); caret(ctx, T, CX + 26 + measure(ctx, draft, 30, 500), 769, l, 32); } else text(ctx, "Ask the island…", CX + 26, 769, { size: 28, color: R["text-muted"] });
  ctx.fillStyle = draft ? R.accent : R.border; ctx.beginPath(); ctx.arc(CR - 38, 759, 22, 0, 6.29); ctx.fill();
  ctx.strokeStyle = R["on-accent"]; ctx.lineWidth = 3.5; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.beginPath(); ctx.moveTo(CR - 38, 770); ctx.lineTo(CR - 38, 748); ctx.moveTo(CR - 47, 757); ctx.lineTo(CR - 38, 748); ctx.lineTo(CR - 29, 757); ctx.stroke();
};
/** the right column's title row + the divider between the columns */
const panelHead = (ctx: Ctx, title: string, icon: "dir" | "note", k = 1) => {
  const R = T.roles; ctx.fillStyle = R.border; ctx.fillRect(DIV, WIN.y + 70, 2, WIN.h - 70);
  fading(ctx, k, () => { if (icon === "dir") fileIcon(ctx, "dir", PX, 160); else noteIcon(ctx, PX + 4, 160); text(ctx, title, PX + 50, 164, { size: 30, weight: 600, color: R.text }); ctx.fillStyle = R.border; ctx.fillRect(PX, 190, PR - PX, 2); });
};
/** ask: the vault's notes, and the ones the model reads */
const vaultPanel = (ctx: Ctx, l: number, sweep: [number, number]) => {
  const R = T.roles; panelHead(ctx, "Island", "dir");
  const at = seg(l, sweep[0], sweep[1]) * VAULT.length;
  VAULT.forEach((n, i) => { const y = 256 + i * 64, passed = at > i + 0.5, lit = l >= sweep[0] && Math.abs(at - i - 0.5) < 0.6 && at < VAULT.length;
    if (lit) fillRR(ctx, PX - 12, y - 42, PR - PX + 24, 58, 12, R["surface-2"]);
    if (n.read && passed) fillRR(ctx, PX - 12, y - 42, PR - PX + 24, 58, 12, R.tint);
    noteIcon(ctx, PX + 4, y, n.token); text(ctx, n.t, PX + 50, y, { size: 28, weight: n.read && passed ? 600 : 500, color: n.read && passed ? R.text : R["text-muted"] });
    if (n.read && passed) { const k = pop(seg(l, sweep[0] + ((i + 0.5) / VAULT.length) * (sweep[1] - sweep[0]), sweep[0] + ((i + 0.5) / VAULT.length) * (sweep[1] - sweep[0]) + 10)); ctx.save(); ctx.translate(PR - 20, y - 12); ctx.scale(k, k); ink(ctx, [[-12, 0], [-4, 8], [12, -10]], { w: 4.5, color: R["accent-text"], wob: 0.2, boil: 0 }); ctx.restore(); } });
  if (l >= sweep[1]) text(ctx, "Read 3 of 6 notes, on this Mac", PX, 680, { size: 26, color: R["text-muted"], alpha: seg(l, sweep[1], sweep[1] + 12) });
  else if (l >= sweep[0]) text(ctx, "Reading your vault…", PX, 680, { size: 26, color: R["text-muted"] });
};
/** notes: the Conversation notes section, rewritten after the reply */
const NOTE_ROWS: { t: string; h?: boolean }[] = [{ t: "The trip", h: true }, { t: "Ferry booked: Sat, 8:30." }, { t: "To pack: the snorkel." }, { t: "Open: the pink lake." }];
const notesPanel = (ctx: Ctx, l: number, at: number[], upd: number) => {
  const R = T.roles; panelHead(ctx, "Conversation notes", "note");
  const u = pop(seg(l, upd, upd + 12)) * (1 - seg(l, upd + 120, upd + 132)); if (u > 0) { ctx.save(); ctx.globalAlpha *= Math.min(1, u); const w = measure(ctx, "rewritten", 26, 600) + 36; fillRR(ctx, PR - w, 214, w, 44, 22, R.success); text(ctx, "rewritten", PR - w / 2, 245, { size: 26, weight: 600, align: "center", color: R["on-accent"] }); ctx.restore(); }
  NOTE_ROWS.forEach((r, i) => { const k = pop(seg(l, at[i], at[i] + 12)); if (k <= 0) return; const y = 300 + i * 66 + (i ? 14 : 0);
    ctx.save(); ctx.globalAlpha *= Math.min(1, k); ctx.translate(PX, y - 10); ctx.scale(1, k); ctx.translate(-PX, -y + 10);
    if (r.h) text(ctx, r.t, PX, y, { size: 30, weight: 600, color: R.text }); else { ctx.fillStyle = R.accent; ctx.beginPath(); ctx.arc(PX + 10, y - 10, 6, 0, 6.29); ctx.fill(); text(ctx, r.t, PX + 32, y, { size: 28, color: R.text }); }
    ctx.restore(); });
};
/** pdf: the chats folder, with the chat file and (from `pdfAt`) the PDF beside it */
const filesPanel = (ctx: Ctx, l: number, pdfAt: number) => {
  const R = T.roles; panelHead(ctx, "chats", "dir");
  const rows: { name: string; kind: "md" | "pdf"; at: number; note: string }[] = [{ name: "Trip chat.md", kind: "md", at: -99, note: "this chat" }, { name: "Trip plan.pdf", kind: "pdf", at: pdfAt, note: "new" }];
  rows.forEach((r, i) => { const k = pop(seg(l, r.at, r.at + 14)); if (k <= 0) return; const y = 262 + i * 70;
    ctx.save(); ctx.translate(PX, y); ctx.scale(k, k); ctx.translate(-PX, -y);
    if (i === 1) fillRR(ctx, PX - 12, y - 44, PR - PX + 24, 62, 12, R.tint);
    fileIcon(ctx, r.kind, PX, y); text(ctx, r.name, PX + 50, y, { size: 28, weight: i === 1 ? 600 : 500, color: R.text });
    if (i === 1) { const w = measure(ctx, r.note, 26, 600) + 28; fillRR(ctx, PR - w, y - 36, w, 44, 22, R.success); text(ctx, r.note, PR - w / 2, y - 5, { size: 26, weight: 600, align: "center", color: R["on-accent"] }); }
    else text(ctx, r.note, PR, y, { size: 26, align: "right", color: R["text-muted"] });
    ctx.restore(); });
  if (l >= pdfAt && l < pdfAt + 18) sparkle(ctx, PR - 40, 310, 22 * (1 - (l - pdfAt) / 18), C.clay, l / 5);
};

// ---------------------------------------------------------------- the quokka beside the window
const QX = 1712, QY = 1036, QH = 340;
const sideQuokka = (ctx: Ctx, env: Env, s: S, table: [number, PoseName][], hop = 1) => {
  const p = poseAt(s.l, table);
  actor(ctx, env, s.f, { pose: p.pose, x: QX, y: QY, h: QH, squash: p.squash * hop, lean: Math.sin(s.f / 10) * 2 });
};

// ---------------------------------------------------------------- cold: dusk, and a question
const GY = 900;
const dune = (ctx: Ctx, f: number) => {
  const R = T.roles; ctx.save(); ctx.beginPath(); ctx.moveTo(-60, GY + 30); ctx.bezierCurveTo(400, GY - 40, 900, GY + 10, 1300, GY - 20); ctx.bezierCurveTo(1600, GY - 40, 1800, GY, 1990, GY - 10); ctx.lineTo(1990, 1140); ctx.lineTo(-60, 1140); ctx.closePath(); ctx.fillStyle = R.tint; ctx.fill(); ctx.restore();
  ink(ctx, [[-60, GY + 30], [300, GY - 6], [700, GY - 8], [1000, GY - 2], [1300, GY - 20], [1650, GY - 22], [1990, GY - 10]], { w: 4, color: C.ink, seed: 3, frame: f, wob: 1 });
  // grass tufts that lean in the evening breeze
  [[260, GY - 4], [1180, GY - 16], [1480, GY - 22]].forEach(([x, y], i) => { const lean = Math.sin(f / 18 + i) * 6; for (let j = -1; j <= 1; j++) ink(ctx, [[x + j * 10, y], [x + j * 16 + lean, y - 34 - (j ? 0 : 12)]], { w: 3.5, color: C.muted, seed: 20 + i * 3 + j, frame: f, wob: 0.4 }); });
};
const cold: Scene = { id: "cold", len: 210, draw: (ctx, env, s) => {
  dune(ctx, s.f);
  fading(ctx, 1 - s.t(96, 110), () => intertitle(ctx, s, ["Evening on the island."], { y: 210, size: 72, t0: 4 }));
  // two forgotten things: blank pages drifting at the edge of memory
  [[1330, 430, 118], [1560, 610, 132]].forEach(([x, y, at], i) => card(ctx, { x, y: y + Math.sin(s.f / 16 + i) * 10, rot: Math.sin(s.f / 22 + i) * 0.12, scale: 0.75 * pop(s.t(at, at + 14)), ghost: true, frame: s.f }));
  // the quokka hops in with the Trip ideas card, stops, holds it up and reads it
  const X = 820, h = hopAlong(s.l, [[0, -170, GY], [22, 90, GY], [44, 350, GY], [66, 600, GY], [88, X, GY]], 80);
  const p = poseAt(s.l, [[0, "walking"], [90, "searching"], [118, "thoughtful"], [166, "attention"]]);
  const lift = easeInOut(s.t(92, 108)), bx = h.x + 120, by = h.y - h.lift - 200;
  card(ctx, { x: lerp(bx, 1040, lift), y: lerp(by, 650, lift) + Math.sin(s.f / 12) * 3, rot: lerp(-0.2, -0.06, lift) + Math.sin(s.f / 15) * 0.02, scale: lerp(0.8, 1.25, lift), title: "Trip ideas", token: true, lines: 3, seed: 7, frame: s.f });
  actor(ctx, env, s.f, { pose: h.moving ? "walking" : p.pose, x: h.x, y: h.y, h: 320, lift: h.lift, squash: h.squash * p.squash, lean: Math.sin(s.f / 9) * 2 });
  // what's left? then: ask
  fading(ctx, 1 - s.t(156, 164), () => thought(ctx, s, X + 20, GY - 290, "question", s.t(118, 136), { side: -1 }));
  thought(ctx, s, X + 20, GY - 290, "chat", s.t(166, 182), { side: -1 });
} };

const chapter: Scene = { id: "chapter", len: 120, draw: (ctx, env, s) => chapterCard(ctx, env, s, { no: 7, title: ["Ask the island."], pose: "ai_chat" }) };

// ---------------------------------------------------------------- ask: the question, the vault read, the grounded answer
const A = { type: [24, 84], send: 92, sweep: [104, 150] as [number, number], read: [116, 126, 136], dots: 150, ans: [168, 194, 220], ok: 252, pick: 290, hover: [322, 346, 370], back: 398 };
const ask: Scene = { id: "ask", len: 450, draw: (ctx, env, s) => {
  const l = s.l, open = l >= A.pick && l < A.back + 4;
  window_(ctx, s.t(0, 16), () => {
    header(ctx, open);
    bubble(ctx, Q1, 208, pop(seg(l, A.send + 2, A.send + 14)));
    readRow(ctx, l, A.read);
    if (l >= A.dots && l < A.ans[0]) dots(ctx, CX + 30, 440, l, A.dots);
    const cur = answer(ctx, l, A.ans);
    composer(ctx, l, l >= A.type[0] && l < A.send ? typed(Q1, seg(l, A.type[0], A.type[1])) : "");
    if (cur) caret(ctx, T, cur[0], cur[1], l, 32);
    vaultPanel(ctx, l, A.sweep);
    // the model picker: on this Mac by default, or a client already installed
    const dk = open ? pop(seg(l, A.pick + 2, A.pick + 14)) : 0;
    if (dk > 0) { const R = T.roles, c = chipRect(ctx), dw = 330, dx = CR - dw, dy = c.y + c.h + 8, hv = A.hover.filter((h) => l >= h).length;
      ctx.save(); ctx.globalAlpha *= Math.min(1, dk * 1.4); ctx.translate(CR, dy); ctx.scale(0.92 + 0.08 * dk, 0.92 + 0.08 * dk); ctx.translate(-CR, -dy);
      fillRR(ctx, dx, dy, dw, 20 + MODELS.length * 58, 16, R.surface, R.text, 2);
      MODELS.forEach((m, i) => { const y = dy + 10 + i * 58; if (i === 0) fillRR(ctx, dx + 8, y, dw - 16, 54, 10, R.tint); else if (i === hv && l < A.back) fillRR(ctx, dx + 8, y, dw - 16, 54, 10, R["surface-2"]); text(ctx, m, dx + 28, y + 37, { size: 28, weight: i === 0 ? 600 : 500, color: R.text }); });
      ctx.restore(); }
  });
  const c = chipRect(ctx), cy = c.y + 24;
  const p = path(l, [[20, 700, 820], [70, 760, 800], [86, CR - 38, 762], [120, CR - 38, 762], [150, 1400, 560], [262, 1400, 560], [284, c.x + c.w / 2, cy], [300, c.x + c.w / 2, cy], [322, CR - 160, 240 + 58], [346, CR - 160, 240 + 116], [370, CR - 160, 240 + 174], [390, CR - 160, 240], [440, CR - 120, 250]]);
  if (l >= 16) pointer(ctx, p.x, p.y, press(l, [A.send, A.pick, A.back]));
  sideQuokka(ctx, env, s, [[0, "ai_chat"], [A.send + 4, "listening"], [A.ans[2] + 20, "celebrating"], [A.pick - 20, "thoughtful"], [A.back + 8, "base"]]);
  fading(ctx, 1 - s.t(A.pick - 30, A.pick - 20), () => thought(ctx, s, QX + 20, QY - QH + 40, "check", s.t(A.ok, A.ok + 16)));
  lowerThird(ctx, l, 24, 262, "Chat reads the vault you are in, or the note you started it from,", "and answers from what is actually there.");
  lowerThird(ctx, l, 268, s.len, "On-device by default, or through an official", "Claude Code, Codex, or Cursor client already installed on your Mac.");
} };

// ---------------------------------------------------------------- notes: Conversation notes, and the chat as a Markdown file
const N = { upd: 20, rows: [34, 52, 70, 88], click: 176, flip: [182, 206] as [number, number], hl: 236 };
const MD: [string, number][] = [["# Trip chat", 2], ["What's left before the trip?", 0], ["The ferry is booked: Saturday, 8:30.", 0], ["Still to pack: the snorkel.", 0], ["Not planned yet: the pink lake.", 0], ["## Conversation notes", 3], ["### The trip", 4], ["- Ferry booked: Sat, 8:30.", 2], ["- To pack: the snorkel.", 2], ["- Open: the pink lake.", 2]];
const fileView = (ctx: Ctx, l: number) => {
  const R = T.roles;
  // the Files column: the chats folder and the chat, a plain .md file
  ctx.fillStyle = R.ground; ctx.fillRect(WIN.x + 2, WIN.y + 62, 370, WIN.h - 64); ctx.fillStyle = R.border; ctx.fillRect(WIN.x + 372, WIN.y + 62, 2, WIN.h - 64);
  text(ctx, "Files", WIN.x + 34, 164, { size: 28, weight: 600, color: R.text });
  fileIcon(ctx, "dir", WIN.x + 34, 240); text(ctx, "chats", WIN.x + 84, 240, { size: 28, weight: 600, color: R.text });
  fillRR(ctx, WIN.x + 20, 272, 336, 60, 12, R.tint); fileIcon(ctx, "md", WIN.x + 64, 312); text(ctx, "Trip chat.md", WIN.x + 114, 312, { size: 28, weight: 600, color: R.text });
  fileIcon(ctx, "dir", WIN.x + 34, 392); text(ctx, "wiki", WIN.x + 84, 392, { size: 28, color: R["text-muted"] });
  // the file, raw: the transcript and the Conversation notes section, plain Markdown
  const x = WIN.x + 420; text(ctx, "chats/Trip chat.md", x, 164, { size: 28, weight: 600, color: R["text-muted"], font: FONT.mono });
  ctx.fillStyle = R.border; ctx.fillRect(x, 190, WIN.x + WIN.w - 50 - x, 2);
  const hk = easeOut(seg(l, N.hl, N.hl + 16)); if (hk > 0) { ctx.save(); ctx.globalAlpha *= hk; fillRR(ctx, x - 18, 250 + 5 * 48 - 38, 660, 4 * 48 + 12, 12, R.tint); ctx.restore(); }
  MD.forEach(([ln, syn], i) => { const k = seg(l, N.flip[1] - 6 + i * 3, N.flip[1] + 6 + i * 3); if (k > 0) raw(ctx, T, x, 250 + i * 48, ln, syn, k, 30); });
};
const notes: Scene = { id: "notes", len: 390, transition: "cut", draw: (ctx, env, s) => {
  const l = s.l, flip = seg(l, N.flip[0], N.flip[1]), showFile = flip >= 0.5, sy = Math.abs(Math.cos(flip * Math.PI));
  ctx.save(); const cy = WIN.y + WIN.h / 2; ctx.translate(0, cy); ctx.scale(1, Math.max(0.02, sy)); ctx.translate(0, -cy);
  window_(ctx, 1, () => {
    if (!showFile) {
      header(ctx, false); bubble(ctx, Q1, 208, 1); readRow(ctx, 999, A.read); answer(ctx, 999, A.ans); composer(ctx, l, "");
      notesPanel(ctx, l, N.rows, N.upd);
      // the file button in the chat header: opens the chat as the file it is
      const R = T.roles, bx = chipRect(ctx).x - 96; ctx.beginPath(); ctx.arc(bx, 151, 22, 0, 6.29); ctx.fillStyle = l >= N.click - 20 ? R.tint : R.surface; ctx.fill(); ctx.strokeStyle = R.border; ctx.lineWidth = 2; ctx.stroke(); mark(ctx, "doc", bx, 151, 0.5, R["text-muted"], R["text-muted"]);
    } else fileView(ctx, l);
  });
  ctx.restore();
  const bx = chipRect(ctx).x - 96, p = path(l, [[0, CR - 120, 250], [110, 1060, 560], [150, 1060, 560], [172, bx + 6, 156], [200, bx + 6, 156], [236, 1230, 700], [390, 1260, 720]]);
  pointer(ctx, p.x, p.y, press(l, [N.click]));
  sideQuokka(ctx, env, s, [[0, "base"], [N.rows[0], "notes"], [N.flip[1], "knowledge_system"]]);
  if (l >= 110 && l < 172) thought(ctx, s, QX + 20, QY - QH + 40, "note", s.t(110, 126));
  lowerThird(ctx, l, 20, N.flip[0] - 2, "After every reply, rotli rewrites", "a short Conversation notes section.");
  lowerThird(ctx, l, N.flip[1], s.len, "The chat itself is saved as Markdown too.");
} };

// ---------------------------------------------------------------- pdf: a PDF of the plan, filed beside the chat
const P = { type: [30, 62], send: 66, dots: 74, reply: [96, 128], filed: 135, hand: [170, 202] as [number, number] };
const pdf: Scene = { id: "pdf", len: 300, transition: "cut", draw: (ctx, env, s) => {
  const l = s.l, back = seg(l, 0, 14), sy = Math.abs(Math.sin(back * Math.PI / 2));
  ctx.save(); const cy = WIN.y + WIN.h / 2; ctx.translate(0, cy); ctx.scale(1, Math.max(0.02, sy)); ctx.translate(0, -cy);
  window_(ctx, 1, () => {
    header(ctx, false); bubble(ctx, Q1, 208, 1); readRow(ctx, 999, A.read); answer(ctx, 999, A.ans);
    bubble(ctx, Q2, 540, pop(seg(l, P.send + 2, P.send + 14)));
    if (l >= P.dots && l < P.reply[0]) dots(ctx, CX + 30, 660, l, P.dots);
    let cur: [number, number] | null = null;
    if (l >= P.reply[0]) { const R = T.roles, k = seg(l, P.reply[0], P.reply[1]), t = typed(REPLY, k); fillRR(ctx, CX, 620, CR - CX, 76, 18, R.ground, R.border, 2); text(ctx, t, CX + 28, 669, { size: 30, color: R.text }); if (k < 1) cur = [CX + 28 + measure(ctx, t, 30, 500), 669]; }
    composer(ctx, l, l >= P.type[0] && l < P.send ? typed(Q2, seg(l, P.type[0], P.type[1])) : "");
    if (cur) caret(ctx, T, cur[0], cur[1], l, 32);
    filesPanel(ctx, l, P.filed);
  });
  ctx.restore();
  // the page leaves the folder and lands with the quokka
  const hk = easeInOut(seg(l, P.hand[0], P.hand[1])), from = [PR - 120, 330], to = [QX - 10, 470];
  if (l >= P.filed + 8) pdfPage(ctx, lerp(from[0], to[0], hk), lerp(from[1], to[1], hk) - Math.sin(hk * Math.PI) * 140, 0.35 + 0.45 * hk + 0.04 * Math.sin(s.f / 14) * hk, lerp(0, -0.12, hk) + Math.sin(s.f / 17) * 0.03 * hk, s.f);
  const p = path(l, [[0, 1260, 720], [26, 700, 800], [58, 760, 800], [64, CR - 38, 762], [90, CR - 38, 762], [150, 1200, 600], [300, 1240, 620]]);
  pointer(ctx, p.x, p.y, press(l, [P.send]));
  const land = l >= P.hand[1] && l < P.hand[1] + 8 ? 1 - 0.1 * Math.sin(((l - P.hand[1]) / 8) * Math.PI) : 1;
  sideQuokka(ctx, env, s, [[0, "base"], [P.type[0], "ai_chat"], [P.send + 6, "listening"], [P.hand[1], "celebrating"]], land);
  lowerThird(ctx, l, 20, s.len, "In the Mac app it can also make a Word document,", "a PDF, or a board, filed beside the chat.");
} };

// ---------------------------------------------------------------- payoff + end
const payoff: Scene = { id: "payoff", len: 210, draw: (ctx, env, s) => {
  intertitle(ctx, s, ["Asked at dusk.", "Answered from its own notes."], { hi: "own notes", y: 330 });
  const k = backOut(s.t(24, 44));
  if (k > 0) actor(ctx, env, s.f, { pose: "celebrating", x: 960, y: 1030, h: 300 * k, lean: Math.sin(s.f / 8) * 2 });
  card(ctx, { x: 680, y: 900 + Math.sin(s.f / 13) * 6, rot: -0.1 + Math.sin(s.f / 19) * 0.03, scale: 1.1 * pop(s.t(36, 52)), title: "Trip ideas", token: true, lines: 3, seed: 7, frame: s.f });
  pdfPage(ctx, 1250, 880 + Math.sin(s.f / 15 + 1) * 6, 0.8 * pop(s.t(44, 60)), 0.08 + Math.sin(s.f / 21) * 0.03, s.f);
} };
const end: Scene = { id: "end", len: 120, draw: (ctx, env, s) => storyEnd(ctx, env, s, { next: "The Locked Box", pose: "waving" }) };

const SCENES = [cold, chapter, ask, notes, pdf, payoff, end];
const AS = sceneStart(SCENES, "ask"), NO = sceneStart(SCENES, "notes"), PD = sceneStart(SCENES, "pdf"), PO = sceneStart(SCENES, "payoff");
export const s01e07AskTheIsland: Film = story({ id: "s01e07AskTheIsland", no: 7, title: "Ask the island.", atmosphere: "iris-dusk", scenes: SCENES,
  score: { key: 5, melody: 2, pops: [[118, 79], [166, 84], [AS + A.send + 2, 84], ...A.read.map((r, i) => [AS + r, [79, 81, 84][i]] as [number, number]), ...A.ans.map((r, i) => [AS + r, [86, 88, 91][i]] as [number, number]), [AS + A.pick, 91], [AS + A.back, 88],
    [NO + N.upd, 84], ...N.rows.map((r, i) => [NO + r, [79, 81, 84, 86][i]] as [number, number]), [NO + N.click, 91], [NO + N.flip[1], 93], [PD + P.send + 2, 84], [PD + P.reply[0], 88], [PD + P.filed, 96], [PD + P.hand[1], 91], [PO + 36, 84], [PO + 44, 88]], thumps: [22, 44, 66, 88] } });

export const s01e07Derive: DeriveSpec = {
  no: 7, series: "season-one", label: "Rotli · Season One · 07",
  vertical: [
    { frame: 20, len: 180, crop: { x: 300, y: 260, w: 1400, h: 800 }, title: "Evening on the island.", sub: "What's left before the trip?", hi: "Evening" },
    { frame: AS + 20, len: 270, crop: { x: 100, y: 40, w: 1420, h: 830 }, title: "Ask the island.", sub: "It answers from what is actually there.", hi: "Ask" },
    { frame: NO + 10, len: 240, crop: { x: 100, y: 40, w: 1420, h: 830 }, title: "Conversation notes.", sub: "The chat is saved as Markdown too.", hi: "notes" },
    { frame: PD + 40, len: 180, crop: { x: 120, y: 50, w: 1780, h: 1000 }, title: "A PDF of the plan.", sub: "Filed beside the chat.", hi: "PDF" },
  ],
  slides: [
    { frame: 190, crop: { x: 300, y: 260, w: 1400, h: 800 }, title: "Evening on the island.", sub: "What's left before the trip?", hi: "Evening" },
    { frame: AS + 256, crop: { x: 100, y: 40, w: 1420, h: 830 }, title: "Ask the island.", sub: "It answers from what is actually there.", hi: "Ask" },
    { frame: NO + 120, crop: { x: 100, y: 40, w: 1420, h: 830 }, title: "Conversation notes.", sub: "Rewritten after every reply.", hi: "notes" },
    { frame: PD + 240, crop: { x: 120, y: 50, w: 1780, h: 1000 }, title: "A PDF of the plan.", sub: "Filed beside the chat.", hi: "PDF" },
  ],
  single: { frame: AS + 256, crop: { x: 100, y: 40, w: 1420, h: 830 }, title: "Ask the island.", sub: "Answers from what is actually there.", hi: "Ask" },
};
