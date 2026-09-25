// SEASON ONE · 02 — PLAIN WORDS. (60 s). Brief: season/episodes/s01e02.json
// Setup: At the morning desk the quokka writes in plain Markdown.
// Turn: Each line blooms as it's typed: tasks tick, a choice picks, a switch flips, a table fills, a Mermaid fence draws the ferry route.
// Payoff: Aa → Raw markdown: it was plain text the whole time.
//
// CUE TABLE (global frames)       cold 0 · chapter 210 · tasks 330 · choices 690 · diagram 1020 · raw 1350 · payoff 1590 · end 1680
//   cold     hop in (0–54), thought: note (60), types raw task lines onto the Trip ideas page (90–168), push into the page (170)
//   tasks    each line typed raw, renders when the caret leaves; ticks at 240/266; caret returns to line 1 → raw again (296)
//   choices  radio pick (130), switch flips (204), table renders (284), a cell fills (300)
//   diagram  the mermaid fence renders and draws the ferry route (140), the math fence renders (272)
//   raw      Aa (54) → Raw markdown (96): every row flips to the plain text it always was
import type { Ctx, Env } from "./core";
import type { Film } from "./film";
import { hopAlong, poseAt } from "./rotli/actor";
import { FONT, card, easeIn, ink, rr } from "./rotli/kit";
import type { DeriveSpec } from "./studio/derive";
import { lowerThird } from "./studio/series";
import { C, LIGHT, actor, chapterCard, easeInOut, easeOut, fillRR, intertitle, measure, pop, seg, sceneStart, story, storyEnd, text, thought, type Glyph, type Scene, type S } from "./studio/story";
import { appFrame, caret, choice, heading, pointer, table, task, type Rect } from "./studio/ui";
import type { PoseName } from "./quokka/poses";

const T = LIGHT;
// ---------------------------------------------------------------- local helpers
/** the demo camera: the window is authored at 1400×720 and pushed in so its 24px sidebar reads ≥ 26px */
const Z = 1.1, OX = 90, OY = 46, WIN: Rect = { x: 0, y: 0, w: 1400, h: 720 };
const MONO = 30, LINE = 46;
/** raw Markdown with every syntax token in the accent (mono, so widths are char counts) */
const SYNTAX = /^#+ |^- (?:\[[^\]]*\])+ |^```\w*|\||-->|\\frac|\\,|[{}[\]]/g;
const rawLine = (ctx: Ctx, x: number, y: number, s: string, alpha = 1) => {
  const cw = measure(ctx, "M", MONO, 500, FONT.mono); let last = 0;
  const put = (a: number, b: number, col: string) => { if (b > a) text(ctx, s.slice(a, b), x + a * cw, y, { size: MONO, font: FONT.mono, color: col, alpha }); };
  for (const m of s.matchAll(SYNTAX)) { const i = m.index ?? 0; put(last, i, T.roles.text); put(i, i + m[0].length, T.roles["accent-text"]); last = i + m[0].length; }
  put(last, s.length, T.roles.text); return x + s.length * cw;
};
/** a row of the note: raw while the caret is on it (typed t0..t1, raw until `leave`, raw again inside `edit`), rendered after */
type Row = { lines: string[]; t0: number; t1: number; ty?: number; leave: number; edit?: [number, number]; h: number; hr: number; editLines?: string[]; draw?: (ctx: Ctx, x: number, y: number, l: number, f: number) => void };
const typedLines = (lines: string[], t: number) => { let n = Math.round(lines.join("").length * t); return lines.map((ln) => { const k = Math.min(n, ln.length); n -= k; return ln.slice(0, k); }); };
/** draws the rows from (x, y0); returns the y below the last visible row and where the caret sits */
const note = (ctx: Ctx, x: number, y0: number, rows: Row[], l: number, f: number) => {
  let y = y0; let car: [number, number] | null = null;
  for (const r of rows) {
    if (l < r.t0) break;
    const editing = !!r.edit && l >= r.edit[0] && l < r.edit[1], k = editing ? 0 : r.draw ? easeOut(seg(l, r.leave, r.leave + 8)) : 0;
    if (k < 1) { const ls = editing ? (r.editLines ?? r.lines) : typedLines(r.lines, seg(l, r.ty ?? r.t0, r.t1)); let cx = x, cy = y + 34;
      ls.forEach((ln, i) => { if (i && !ln && ls.slice(i).every((q) => !q)) return; cx = rawLine(ctx, x, y + 34 + i * LINE, ln, 1 - k); cy = y + 34 + i * LINE; if (!ln && i) cx = x; });
      if (l < r.leave || editing) car = [cx, cy]; }
    if (k > 0 && r.draw) { ctx.save(); ctx.globalAlpha *= k; r.draw(ctx, x, y, l, f); ctx.restore(); }
    y += r.h + (r.hr - r.h) * k;
  }
  if (car) caret(ctx, T, car[0], car[1], f, 34);
  return y;
};
/** a pointer that glides between [frame, x, y] keys and presses on `clicks` */
const glide = (l: number, keysAt: [number, number, number][]) => {
  if (l <= keysAt[0][0]) return { x: keysAt[0][1], y: keysAt[0][2] };
  for (let i = 1; i < keysAt.length; i++) { const [a, x0, y0] = keysAt[i - 1], [b, x1, y1] = keysAt[i]; if (l < b) { const t = easeInOut((l - a) / (b - a)); return { x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t }; } }
  const e = keysAt[keysAt.length - 1]; return { x: e[1], y: e[2] };
};
const press = (l: number, clicks: number[]) => clicks.reduce((a, c) => Math.max(a, l >= c && l < c + 14 ? (l - c) / 14 : 0), 0);
/** the compact green/red switch Rotli draws for `[|x]` (off, red) and `[x|]` (on, green) */
const toggle = (ctx: Ctx, x: number, y: number, on: number, label: string) => {
  const R = T.roles, w = 66, h = 36, kx = x + 18 + on * (w - 36);
  fillRR(ctx, x, y - h + 8, w, h, h / 2, on > 0.5 ? R.success : R.failure);
  ctx.beginPath(); ctx.arc(kx, y - h / 2 + 8, 13, 0, 6.29); ctx.fillStyle = R.surface; ctx.fill();
  text(ctx, label, x + w + 20, y, { size: 30, color: R.text });
};
/** the Aa control in the window's top right; `open` shows the View popover with the chosen segment tinted */
const aaButton = (ctx: Ctx, hot = 0) => { const R = T.roles, x = WIN.w - 92; fillRR(ctx, x, 14, 64, 42, 10, hot ? R.tint : R.surface, R.border, 2); text(ctx, "Aa", x + 32, 45, { size: 26, weight: 600, align: "center", color: R.text }); };
const aaPopover = (ctx: Ctx, k: number, rawOn: number) => {
  if (k <= 0) return; const R = T.roles, w = 420, x = WIN.w - 28 - w, y = 66;
  ctx.save(); ctx.globalAlpha *= k; ctx.translate(x + w, y); ctx.scale(0.9 + 0.1 * k, 0.9 + 0.1 * k); ctx.translate(-x - w, -y);
  fillRR(ctx, x + 6, y + 10, w, 150, 16, "rgba(58,48,40,0.12)"); fillRR(ctx, x, y, w, 150, 16, R.surface, R.border, 2);
  text(ctx, "View · all notes", x + 24, y + 46, { size: 24, weight: 600, color: R["text-muted"] });
  const segs = ["Beautified", "Raw markdown"]; let sx = x + 24; segs.forEach((sg, i) => { const sw = measure(ctx, sg, 26, 600) + 36, on = i === (rawOn ? 1 : 0);
    fillRR(ctx, sx, y + 72, sw, 50, 10, on ? R.tint : R.surface, on ? R.accent : R.border, 2); text(ctx, sg, sx + sw / 2, y + 106, { size: 26, weight: 600, align: "center", color: on ? R.text : R["text-muted"] }); sx += sw + 10; });
  ctx.restore();
};
/** the quokka at the desk beside the window: pose table, a sway, and an optional pictogram */
const writer = (ctx: Ctx, env: Env, s: S, poses: [number, PoseName][], th?: { g: Glyph; a: number; b: number }) => {
  const p = poseAt(s.l, poses), x = 1790, y = 1050;
  actor(ctx, env, s.f, { pose: p.pose, x, y, h: 290, squash: p.squash, lean: Math.sin(s.f / 10) * 2.5 });
  if (th && s.l >= th.a && s.l < th.b) thought(ctx, s, x + 20, y - 250, th.g, seg(s.l, th.a, th.a + 16), { side: -1, scale: 0.7 });
};
/** open the demo camera; everything inside is in window coordinates */
const demo = (ctx: Ctx, s: S, push = 0.02, title = "Trip ideas") => {
  const z = Z * (1 + push * easeInOut(s.t(0, s.len))); ctx.save(); ctx.translate(OX, OY); ctx.scale(z, z);
  const e = appFrame(ctx, T, WIN, { active: 0, title }); aaButton(ctx); return e;
};

// ---------------------------------------------------------------- scenes
const cold: Scene = { id: "cold", len: 210, draw: (ctx, env, s) => {
  // the morning desk: the Trip ideas page propped up, a mug, the sun rising in the window. The quokka hops in,
  // thinks of a note, and types its first lines in plain Markdown. Then we push into the page.
  const push = easeIn(s.t(168, 210)), z = 1 + 0.55 * push; ctx.save(); ctx.translate(700, 560); ctx.scale(z, z); ctx.translate(-700, -560);
  // window + sun
  fillRR(ctx, 1480, 140, 300, 250, 16, C.sky, C.ink, 4); ctx.save(); rr(ctx, 1480, 140, 300, 250, 16); ctx.clip();
  const sy = 360 - 90 * easeOut(s.t(0, 210)); ctx.beginPath(); ctx.arc(1580, sy, 46, 0, 6.29); ctx.fillStyle = C.peach; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = C.clay; ctx.stroke(); ctx.restore();
  ctx.fillStyle = C.ink; ctx.fillRect(1627, 140, 5, 250); ctx.fillRect(1480, 262, 300, 5);
  // desk
  fillRR(ctx, 390, 960 - 4, 28, 100, 6, C.cocoa); fillRR(ctx, 1210, 960 - 4, 28, 100, 6, C.cocoa);
  ctx.fillStyle = C.cocoa; ctx.fillRect(400, 740, 20, 220); ctx.fillRect(1208, 740, 20, 220);
  fillRR(ctx, 350, 718, 930, 34, 10, C.peach, C.ink, 4);
  // mug + steam
  fillRR(ctx, 1080, 640, 76, 80, 10, C.surface, C.ink, 4); ctx.beginPath(); ctx.arc(1160, 680, 20, -1.3, 1.3); ctx.lineWidth = 6; ctx.strokeStyle = C.ink; ctx.stroke(); ctx.fillStyle = C.clay; ctx.fillRect(1082, 664, 72, 12);
  for (let i = 0; i < 3; i++) { const ph = (s.f / 40 + i / 3) % 1, x0 = 1098 + i * 20; ink(ctx, [[x0, 628 - ph * 30], [x0 + 8 * Math.sin(s.f / 9 + i), 598 - ph * 30], [x0 - 4, 570 - ph * 30]], { w: 4, color: C.muted, seed: 60 + i, frame: s.f, alpha: 0.6 * (1 - ph) }); }
  // the page: the season's token, propped on the desk
  const sway = Math.sin(s.f / 30) * 0.012; card(ctx, { x: 700, y: 556, scale: 2.6, rot: sway, token: true, title: "Trip ideas", lines: 0, frame: s.f, seed: 4 });
  ctx.save(); ctx.translate(700, 556); ctx.rotate(sway); ctx.translate(-700, -556);
  const L = [["- [ ] book the ferry", 90, 118], ["- [ ] pack a snorkel", 124, 152], ["- [ ] find the pink lake", 158, 190]] as const;
  let cx = 485, cy = 574; L.forEach(([ln, a, b], i) => { if (s.l < a) return; const t = ln.slice(0, Math.round(ln.length * seg(s.l, a, b))); cx = rawLine(ctx, 485, 574 + i * 50, t); cy = 574 + i * 50; });
  if (s.l >= 80) caret(ctx, T, cx, cy, s.f, 34);
  ctx.restore();
  // the quokka hops in from the right and settles beside the desk
  const h = hopAlong(s.l, [[0, 1990, 960], [18, 1800, 960], [36, 1590, 960], [54, 1420, 960]], 80), p = poseAt(s.l, [[0, "walking"], [56, "attention"], [86, "notes"]]);
  actor(ctx, env, s.f, { pose: p.pose, x: h.x, y: h.y, h: 400, lift: h.lift, squash: h.squash * p.squash, lean: h.moving ? -4 : Math.sin(s.f / 11) * 2.5 });
  thought(ctx, s, 1400, 620, "note", s.t(58, 74) * (1 - s.t(150, 158)), { side: -1 });
  ctx.restore();
} };
const chapter: Scene = { id: "chapter", len: 120, draw: (ctx, env, s) => chapterCard(ctx, env, s, { no: 2, title: ["Plain words."], pose: "notes" }) };

// tasks: the heading and three tasks, each typed raw and rendered as the caret moves on; two ticks; back to line 1
const TICK = [240, 266], EDIT = 296;
const tasks: Scene = { id: "tasks", len: 360, draw: (ctx, env, s) => {
  const e = demo(ctx, s), l = s.l;
  const tk = (i: number): Row => ({ lines: [["- [ ] book the ferry", "- [ ] pack a snorkel", "- [/] find the pink lake"][i]], t0: [44, 98, 152][i], t1: [84, 138, 196][i], leave: [98, 152, 208][i], h: 56, hr: 56,
    draw: (c, x, y) => { const tick = i < 2 ? seg(l, TICK[i], TICK[i] + 12) : 0; task(c, T, x, y + 34, i === 2 ? "/" : tick > 0 ? "x" : " ", ["book the ferry", "pack a snorkel", "find the pink lake"][i], { tick }); } });
  const rows: Row[] = [
    { lines: ["# Trip ideas"], t0: 12, t1: 30, leave: 44, h: 56, hr: 84, draw: (c, x, y) => heading(c, T, x, y + 56, "Trip ideas", 56) },
    { ...tk(0), edit: [EDIT, 999], editLines: ["- [x] book the ferry"] }, tk(1), tk(2),
    { lines: [""], t0: 208, t1: 208, leave: EDIT, h: 56, hr: 56 },
  ];
  note(ctx, e.x, e.y + 20, rows, l, s.f);
  // the pointer: tick, tick, then a click back into line 1's text
  if (l >= 206) { const by = (i: number) => e.y + 20 + 84 + i * 56 + 34 - 10; const p = glide(l, [[206, e.x + 520, e.y + 480], [236, e.x + 16, by(0)], [252, e.x + 16, by(0)], [262, e.x + 16, by(1)], [278, e.x + 16, by(1)], [292, e.x + 330, by(0)], [312, e.x + 330, by(0)], [340, e.x + 470, by(0) + 110]]); pointer(ctx, p.x, p.y, press(l, [...TICK, EDIT])); }
  ctx.restore();
  writer(ctx, env, s, [[0, "notes"], [TICK[0], "celebrating"], [TICK[1] + 24, "notes"]], { g: "check", a: TICK[0] + 4, b: EDIT + 10 });
  lowerThird(ctx, l, 30, s.len, "Hybrid Markdown shows raw syntax", "only on the line you are editing.");
} };

// choices: a radio pair (pick), a switch (flip), a table (renders, then a cell fills)
const PICK = 130, FLIP = 204, TBL = 284, CELL = 300;
const choices: Scene = { id: "choices", len: 330, draw: (ctx, env, s) => {
  const e = demo(ctx, s), l = s.l;
  const ch = (i: number): Row => ({ lines: [["- [#] 7:30 ferry", "- [#] Noon ferry"][i]], t0: [42, 80][i], t1: [72, 110][i], leave: [80, 150][i], h: 56, hr: 56, draw: (c, x, y) => choice(c, T, x, y + 34, [["7:30 ferry", "Noon ferry"][i]], i === 0 && l >= PICK ? [0] : []) });
  const rows: Row[] = [
    { lines: ["## Getting there"], t0: 10, t1: 30, leave: 42, h: 56, hr: 72, draw: (c, x, y) => heading(c, T, x, y + 48, "Getting there", 44) },
    ch(0), ch(1),
    { lines: ["- [|x] Hire a bike"], t0: 150, t1: 184, leave: 190, h: 56, hr: 64, draw: (c, x, y) => toggle(c, x, y + 36, easeInOut(seg(l, FLIP, FLIP + 8)), "Hire a bike") },
    { lines: ["| Day | Plan      |", "| --- | --------- |", "| Sat | Pink lake |", "| Sun |           |"], t0: 190, ty: 222, t1: 276, leave: TBL, h: 4 * LINE + 10, hr: 170,
      draw: (c, x, y) => { const fill = "Snorkel".slice(0, Math.round(7 * seg(l, CELL + 4, CELL + 22))); table(c, T, x, y + 10, [140, 300], [["Day", "Plan"], ["Sat", "Pink lake"], ["Sun", fill]], l >= CELL ? [2, 1] : undefined);
        if (l >= CELL && l < s.len) caret(c, T, x + 140 + 16 + measure(c, fill, 25), y + 10 + 2 * 50 + 35, s.f, 30); } },
  ];
  note(ctx, e.x, e.y + 20, rows, l, s.f);
  // the pointer: pick the 7:30 ferry, flip the switch, click the empty cell
  const y0 = e.y + 20 + 72, cellY = e.y + 20 + 72 + 56 * 2 + 64 + 10 + 2 * 50 + 25;
  if (l >= 112) { const p = glide(l, [[112, e.x + 420, e.y + 520], [128, e.x + 15, y0 + 34 - 11], [150, e.x + 15, y0 + 34 - 11], [198, e.x + 33, y0 + 112 + 30], [228, e.x + 33, y0 + 112 + 30], [294, e.x + 230, cellY], [330, e.x + 250, cellY + 10]]); pointer(ctx, p.x, p.y, press(l, [PICK, FLIP, CELL])); }
  ctx.restore();
  writer(ctx, env, s, [[0, "notes"], [PICK - 2, "thoughtful"], [FLIP + 4, "celebrating"], [FLIP + 40, "notes"]], { g: "sun", a: FLIP + 6, b: FLIP + 70 });
  lowerThird(ctx, l, 30, s.len, "Lists, checkboxes, choices, switches, tables,", "wikilinks, and Mermaid diagrams render in place.");
} };

// diagram: a mermaid fence renders and draws the ferry route; a math fence renders
const MER = 140, MATH = 272;
const route = (ctx: Ctx, x: number, y: number, l: number, f: number) => {
  const R = T.roles, nodes = [["Fremantle", 0, 230], ["Thomson Bay", 340, 260], ["Pink lake", 700, 220]] as const, cy = y + 70;
  nodes.forEach(([name, dx, w], i) => { const k = pop(seg(l, MER + 4 + i * 14, MER + 20 + i * 14)); if (k <= 0) return; ctx.save(); ctx.translate(x + dx + w / 2, cy); ctx.scale(k, k);
    fillRR(ctx, -w / 2, -34, w, 68, 14, i === 1 ? R.tint : R["surface-2"], i === 1 ? R.accent : R.border, 3); text(ctx, name, 0, 10, { size: 28, weight: 600, align: "center", color: R.text }); ctx.restore(); });
  [[230, 340], [600, 700]].forEach(([a, b], i) => { const p = seg(l, MER + 16 + i * 26, MER + 40 + i * 26); if (p <= 0) return;
    ink(ctx, [[x + a + 10, cy], [x + a + (b - a) / 2, cy - 10], [x + b - 12, cy]], { w: 4, color: R.accent, seed: 70 + i, frame: f, progress: p, wob: 0.5, boil: 0.3 });
    if (p >= 1) { ctx.fillStyle = R.accent; ctx.beginPath(); ctx.moveTo(x + b - 4, cy); ctx.lineTo(x + b - 22, cy - 10); ctx.lineTo(x + b - 22, cy + 10); ctx.closePath(); ctx.fill(); } });
  // the little ferry sails the first leg, once, then waits at Thomson Bay
  const fp = easeInOut(seg(l, MER + 50, MER + 110)); if (l >= MER + 44) { const fx = x + 120 + fp * 350, fy = cy + 54 + Math.sin(f / 7) * 2;
    ctx.fillStyle = R.surface; ctx.strokeStyle = R.text; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(fx - 26, fy - 8); ctx.lineTo(fx + 26, fy - 8); ctx.lineTo(fx + 18, fy + 8); ctx.lineTo(fx - 20, fy + 8); ctx.closePath(); ctx.fill(); ctx.stroke();
    fillRR(ctx, fx - 14, fy - 22, 22, 14, 4, R.accent); }
};
const fraction = (ctx: Ctx, x: number, y: number) => {
  const R = T.roles, num = "19 km", den = "38 km/h", w = Math.max(measure(ctx, num, 30), measure(ctx, den, 30)) + 20, fx = x + measure(ctx, "t = ", 34) + 6;
  text(ctx, "t = ", x, y + 52, { size: 34, color: R.text }); text(ctx, num, fx + w / 2, y + 30, { size: 30, align: "center", color: R.text });
  ctx.fillStyle = R.text; ctx.fillRect(fx, y + 42, w, 3); text(ctx, den, fx + w / 2, y + 80, { size: 30, align: "center", color: R.text });
};
const diagram: Scene = { id: "diagram", len: 330, draw: (ctx, env, s) => {
  const e = demo(ctx, s), l = s.l;
  const rows: Row[] = [
    { lines: ["## The ferry"], t0: 10, t1: 26, leave: 36, h: 56, hr: 72, draw: (c, x, y) => heading(c, T, x, y + 48, "The ferry", 44) },
    { lines: ["```mermaid", "flowchart LR", "  A[Fremantle] --> B[Thomson Bay]", "  B --> C[Pink lake]", "```"], t0: 36, t1: 130, leave: MER, h: 5 * LINE + 10, hr: 170, draw: (c, x, y, ll, f) => route(c, x, y, ll, f) },
    { lines: ["```math", "t = \\frac{19\\,km}{38\\,km/h}", "```"], t0: 214, t1: 262, leave: MATH, h: 3 * LINE + 10, hr: 110, draw: (c, x, y) => fraction(c, x, y) },
    { lines: [""], t0: MATH, t1: MATH, leave: 999, h: 56, hr: 56 },
  ];
  note(ctx, e.x, e.y + 20, rows, l, s.f);
  ctx.restore();
  writer(ctx, env, s, [[0, "notes"], [MER, "attention"], [MER + 30, "celebrating"], [MER + 90, "notes"], [MATH, "thoughtful"]], { g: "heart", a: MER + 40, b: MER + 120 });
  lowerThird(ctx, l, 30, s.len, "Tasks, choices, tables, diagrams, and math", "draw themselves as you type, and every one of them is plain text.");
} };

// raw: the whole note, beautified; Aa → Raw markdown flips every row to the plain text underneath
const AA = 54, RAW = 96;
type Flip = { raw: string[]; hb: number; hr: number; draw: (ctx: Ctx, x: number, y: number) => void };
const FULL: Flip[] = [
  { raw: ["# Trip ideas"], hb: 76, hr: LINE, draw: (c, x, y) => heading(c, T, x, y + 50, "Trip ideas", 52) },
  ...["book the ferry", "pack a snorkel", "find the pink lake"].map((t, i): Flip => ({ raw: [`- [${i < 2 ? "x" : "/"}] ${t}`], hb: 50, hr: LINE, draw: (c, x, y) => task(c, T, x, y + 34, i < 2 ? "x" : "/", t) })),
  ...["7:30 ferry", "Noon ferry"].map((t, i): Flip => ({ raw: [`- [#${i ? "" : "x"}] ${t}`], hb: 50, hr: LINE, draw: (c, x, y) => choice(c, T, x, y + 34, [t], i ? [] : [0]) })),
  { raw: ["- [x|] Hire a bike"], hb: 56, hr: LINE, draw: (c, x, y) => toggle(c, x, y + 36, 1, "Hire a bike") },
  { raw: ["| Day | Plan      |", "| --- | --------- |", "| Sat | Pink lake |", "| Sun | Snorkel   |"], hb: 166, hr: 4 * LINE, draw: (c, x, y) => table(c, T, x, y + 10, [140, 300], [["Day", "Plan"], ["Sat", "Pink lake"], ["Sun", "Snorkel"]]) },
];
const raw: Scene = { id: "raw", len: 240, draw: (ctx, env, s) => {
  const l = s.l, e = demo(ctx, s);
  aaButton(ctx, l >= AA && l < RAW + 10 ? 1 : 0);
  let y = e.y + 14;
  FULL.forEach((r, i) => { const p = seg(l, RAW + 4 + i * 4, RAW + 16 + i * 4), sc = Math.abs(Math.cos(p * Math.PI));
    ctx.save(); ctx.translate(0, y); ctx.scale(1, Math.max(0.02, sc)); ctx.translate(0, -y);
    if (p < 0.5) r.draw(ctx, e.x, y); else r.raw.forEach((ln, j) => rawLine(ctx, e.x, y + 34 + j * LINE, ln));
    ctx.restore(); y += r.hb + (r.hr - r.hb) * easeInOut(p); });
  if (l >= RAW + 60) caret(ctx, T, e.x + measure(ctx, "M", MONO, 500, FONT.mono) * "| Sun | Snorkel   |".length, y - LINE + 34 - 12, s.f, 34);
  aaPopover(ctx, easeOut(seg(l, AA, AA + 10)) * (1 - seg(l, RAW + 8, RAW + 16)), l >= RAW ? 1 : 0);
  const pv = glide(l, [[0, e.x + 700, e.y + 520], [20, e.x + 700, e.y + 520], [48, WIN.w - 60, 40], [66, WIN.w - 60, 40], [90, WIN.w - 130, 66 + 98], [RAW + 30, WIN.w - 130, 66 + 98], [RAW + 80, WIN.w - 240, 420], [240, WIN.w - 250, 440]]);
  pointer(ctx, pv.x, pv.y, press(l, [AA, RAW]));
  ctx.restore();
  writer(ctx, env, s, [[0, "notes"], [RAW + 6, "attention"], [RAW + 40, "celebrating"], [RAW + 100, "notes"]], { g: "note", a: RAW + 44, b: 240 });
  lowerThird(ctx, l, 40, s.len, "Aa → Raw markdown switches views in place.");
} };
const payoff: Scene = { id: "payoff", len: 90, draw: (ctx, env, s) => intertitle(ctx, s, ["It was plain text", "the whole time."], { hi: "plain text" }) };
const end: Scene = { id: "end", len: 120, draw: (ctx, env, s) => storyEnd(ctx, env, s, { next: "The Workshop", pose: "waving" }) };

const SCENES = [cold, chapter, tasks, choices, diagram, raw, payoff, end];
const TA = sceneStart(SCENES, "tasks"), CH = sceneStart(SCENES, "choices"), DI = sceneStart(SCENES, "diagram"), RW = sceneStart(SCENES, "raw");
export const s01e02PlainWords: Film = story({ id: "s01e02PlainWords", no: 2, title: "Plain words.", atmosphere: "linen-morning", scenes: SCENES,
  score: { key: 0, melody: 1, pops: [[TA + TICK[0], 79], [TA + TICK[1], 81], [TA + EDIT, 84], [CH + PICK, 79], [CH + FLIP, 84], [CH + TBL, 86], [DI + MER, 81], [DI + MATH, 86], [RW + AA, 84], [RW + RAW, 91]], thumps: [18, 36, 54] } });

export const s01e02Derive: DeriveSpec = {
  no: 2, series: "season-one", label: "Rotli · Season One · 02",
  vertical: [
    { frame: 40, len: 150, crop: { x: 340, y: 120, w: 1480, h: 900 }, title: "A morning desk.", sub: "The quokka writes in plain Markdown.", hi: "plain" },
    { frame: TA + 30, len: 270, crop: { x: 430, y: 60, w: 1000, h: 800 }, title: "Hybrid Markdown.", sub: "Raw syntax only on the line you are editing.", hi: "Hybrid" },
    { frame: CH + 90, len: 240, crop: { x: 430, y: 60, w: 1000, h: 800 }, title: "Render in place.", sub: "Choices, switches, tables.", hi: "in place" },
    { frame: RW + 30, len: 210, crop: { x: 430, y: 30, w: 1240, h: 840 }, title: "Aa → Raw markdown.", sub: "Switches views in place.", hi: "Raw" },
  ],
  slides: [
    { frame: 200 - 60, crop: { x: 340, y: 120, w: 1480, h: 900 }, title: "A morning desk.", sub: "The quokka writes in plain Markdown.", hi: "plain" },
    { frame: TA + 330, crop: { x: 430, y: 60, w: 1000, h: 800 }, title: "Hybrid Markdown.", sub: "Raw syntax only on the line you are editing.", hi: "Hybrid" },
    { frame: DI + 320, crop: { x: 430, y: 60, w: 1120, h: 800 }, title: "Diagrams draw themselves.", sub: "Every one of them is plain text.", hi: "draw" },
    { frame: RW + 220, crop: { x: 430, y: 30, w: 1240, h: 840 }, title: "Aa → Raw markdown.", sub: "Switches views in place.", hi: "Raw" },
  ],
  single: { frame: CH + 320, crop: { x: 430, y: 60, w: 1000, h: 800 }, title: "Plain words.", sub: "Every line quietly becomes what it means.", hi: "Plain" },
};
