// SEASON ONE · 09 — OTHER SHORES. (60 s). Brief: season/episodes/s01e09.json
// Setup: A friend across the water has a browser and an old folder of Markdown notes.
// Turn: Rotli Web opens a real folder in Chrome, Edge or Arc; the Helper brings Firefox, Zen and Brave. Back home on its Mac, the quokka shows how Rotli's first run inspects an old folder without writing anything, then opens it in place or imports a copy.
// Payoff: Two islands, one way of working, every note still in its own folder.
// Cast: the quokka keeps its home colour (Rotli clay) so it reads apart from the friend, who wears the
// episode's Ocean colour, flipped (the engine's family would otherwise paint both quokkas Ocean).
// Cue table (local frames):
//   cold    0–240  ferry glides in 0–90, the friend (browser + old folder) wonders 30–100, the quokka hops ashore 120–182, thought: globe 192
//   web     0–390  browser 0–16, url typed 14–40, Choose folder… 66, picker 70–140 (Notes 100, Select 128), the workspace 140+,
//                  tick 196, typed task 226–256, link 282–316, the folder on disk 330+, Chrome · Edge · Arc 300+
//   helper  0–300  Firefox/Zen/Brave 10/22/34, folder 40, Helper 60, bridge 80–170, Mac/Windows/Linux 180/190/200, notes cross 170+
//   import  0–420  choose 0–70 (click 60), reading the folder map 75–160 (nothing written), review 165–300 (Import a copy 226,
//                  Open in place 262, Open this vault 300), the old notes open in place 310+
//   payoff  0–210  intertitle; two islands, each with its own folder
import type { Ctx, Env } from "./core";
import type { Film } from "./film";
import { rng } from "./core";
import { hopAlong, poseAt } from "./rotli/actor";
import { ferry, jetty, sign } from "./rotli/island";
import { FONT, card, chip, folder, rr, typed } from "./rotli/kit";
import { blinkAt } from "./quokka/rig";
import type { PoseName } from "./quokka/poses";
import type { DeriveSpec } from "./studio/derive";
import { lowerThird } from "./studio/series";
import { FAMILY_QUOKKA } from "./studio/stage";
import { C, LIGHT, actor, backOut, chapterCard, easeInOut, easeOut, fillRR, glyph, intertitle, measure, pop, seg, sceneStart, story, storyEnd, text, thought, type Scene, type S } from "./studio/story";
import { caret, fileList, heading, link, pointer, raw, task, type Rect } from "./studio/ui";

const T = LIGHT;
const QB = FAMILY_QUOKKA.rotli; // the quokka's own colour: it is the visitor here
type Pt = [number, number, number];

// ---------------------------------------------------------------- the cast
/** the quokka (clay, the visitor) */
const quokka = (ctx: Ctx, env: Env, f: number, o: { pose: PoseName; x: number; y: number; h: number; lift?: number; squash?: number; flip?: boolean }) =>
  actor(ctx, env, f, { ...o, body: QB, lean: Math.sin(f / 9) * 2 });
/** the friend (Ocean, the episode's family), facing left, blinking on its own clock */
const friend = (ctx: Ctx, env: Env, f: number, o: { pose: PoseName; x: number; y: number; h: number; lift?: number; squash?: number }) =>
  actor(ctx, env, f, { ...o, flip: true, blink: blinkAt(f, 91, 5), lean: Math.sin(f / 11 + 1) * 2 });
/** the pair in the corner of a demo: the quokka and its friend watching the screen */
const pair = (ctx: Ctx, env: Env, s: S, qp: PoseName, fp: PoseName, qx = 1560, fx = 1770) => {
  quokka(ctx, env, s.f, { pose: qp, x: qx, y: 1050 + Math.sin(s.f / 7.3) * 3, h: 220 });
  friend(ctx, env, s.f, { pose: fp, x: fx, y: 1050 + Math.sin(s.f / 6.1 + 2) * 3, h: 240 });
};

// ---------------------------------------------------------------- local props (flat marks, theme colours only)
/** a pointer path through [frame, x, y] waypoints */
const path = (l: number, w: Pt[]) => {
  if (l <= w[0][0]) return { x: w[0][1], y: w[0][2] };
  for (let i = 1; i < w.length; i++) { const [f0, x0, y0] = w[i - 1], [f1, x1, y1] = w[i]; if (l < f1) { const k = easeInOut((l - f0) / (f1 - f0)); return { x: x0 + (x1 - x0) * k, y: y0 + (y1 - y0) * k }; } }
  const e = w[w.length - 1]; return { x: e[1], y: e[2] };
};
const pressAt = (l: number, clicks: number[]) => { const c = clicks.find((t) => l >= t && l < t + 12); return c === undefined ? 0 : (l - c) / 12; };
const popIn = (ctx: Ctx, cx: number, cy: number, s: number, draw: () => void) => { if (s <= 0) return; ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s); ctx.translate(-cx, -cy); draw(); ctx.restore(); };
const smallFolder = (ctx: Ctx, x: number, y: number, col: string) => { ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(x, y + 6, 34, 24, 4); ctx.fill(); ctx.fillRect(x, y + 2, 14, 8); };
/** window controls on the right (the friend has no Mac: a plain browser, not traffic lights) */
const controls = (ctx: Ctx, x: number, y: number, col: string) => {
  ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 18, y); ctx.stroke(); ctx.strokeRect(x + 44, y - 9, 18, 18);
  ctx.beginPath(); ctx.moveTo(x + 90, y - 9); ctx.lineTo(x + 108, y + 9); ctx.moveTo(x + 108, y - 9); ctx.lineTo(x + 90, y + 9); ctx.stroke(); ctx.restore();
};
const chevron = (ctx: Ctx, x: number, y: number, dir: number, col: string) => { ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.beginPath(); ctx.moveTo(x + 6 * dir, y - 11); ctx.lineTo(x - 6 * dir, y); ctx.lineTo(x + 6 * dir, y + 11); ctx.stroke(); ctx.restore(); };
/** a plain browser window: one tab, back/forward, an address bar. `inner` draws the page, clipped. */
const browserFrame = (ctx: Ctx, r: Rect, url: string, inner?: (c: Rect) => void, tab = "Rotli Web") => {
  const R = T.roles;
  fillRR(ctx, r.x + 10, r.y + 16, r.w, r.h, 22, "rgba(24,39,47,0.12)");
  fillRR(ctx, r.x, r.y, r.w, r.h, 22, R.surface, C.ink, 4);
  ctx.save(); rr(ctx, r.x, r.y, r.w, r.h, 22); ctx.clip();
  ctx.fillStyle = R["surface-2"]; ctx.fillRect(r.x, r.y, r.w, 64);
  fillRR(ctx, r.x + 20, r.y + 12, 300, 70, 14, R.surface);
  fillRR(ctx, r.x + 42, r.y + 28, 22, 22, 6, R.accent); text(ctx, tab, r.x + 78, r.y + 49, { size: 26, weight: 600, color: R.text });
  controls(ctx, r.x + r.w - 150, r.y + 33, R["text-muted"]);
  ctx.fillStyle = R.surface; ctx.fillRect(r.x, r.y + 64, r.w, 76);
  chevron(ctx, r.x + 42, r.y + 103, 1, R["text-muted"]); chevron(ctx, r.x + 90, r.y + 103, -1, R["text-muted"]);
  fillRR(ctx, r.x + 130, r.y + 78, r.w - 170, 50, 25, R["surface-2"]);
  text(ctx, url, r.x + 160, r.y + 112, { size: 26, font: FONT.mono, color: R.text });
  ctx.fillStyle = R.border; ctx.fillRect(r.x, r.y + 138, r.w, 2);
  const c = { x: r.x, y: r.y + 140, w: r.w, h: r.h - 140 }; if (inner) inner(c);
  ctx.restore(); return c;
};
/** a small generic browser card with a plain-text name (no logos); `ok` 0..1 draws a tick */
const miniBrowser = (ctx: Ctx, x: number, y: number, name: string, s: number, ok = 0, w = 330, h = 104) => {
  if (s <= 0) return; const R = T.roles; ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.scale(s, s); ctx.translate(-w / 2, -h / 2);
  fillRR(ctx, 4, 6, w, h, 16, "rgba(24,39,47,0.10)"); fillRR(ctx, 0, 0, w, h, 16, R.surface, C.ink, 3);
  ctx.save(); rr(ctx, 0, 0, w, h, 16); ctx.clip(); ctx.fillStyle = R["surface-2"]; ctx.fillRect(0, 0, w, 32); ctx.restore();
  fillRR(ctx, 14, 8, 110, 18, 9, R.surface); controls(ctx, w - 128, 16, R["text-muted"]);
  text(ctx, name, 24, 80, { size: 32, weight: 600, color: R.text });
  if (ok > 0) { ctx.save(); ctx.globalAlpha *= Math.min(1, ok * 2); ctx.beginPath(); ctx.arc(w - 40, 66, 20, 0, 6.29); ctx.fillStyle = R.success; ctx.fill();
    ctx.strokeStyle = R.surface; ctx.lineWidth = 5; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.beginPath(); ctx.moveTo(w - 50, 66); ctx.lineTo(w - 43, 74); ctx.lineTo(w - 30, 58); ctx.stroke(); ctx.restore(); }
  ctx.restore();
};
/** a folder's name, set beside it (the kit's tab label is too small for these names) */
const folderName = (ctx: Ctx, name: string, x: number, y: number) => text(ctx, name, x, y, { size: 30, weight: 600, align: "center", color: C.cocoa });
/** a glyph from the thought-bubble set, drawn in place */
const mark = (ctx: Ctx, g: Parameters<typeof glyph>[1], x: number, y: number, s: number) => { if (s <= 0) return; ctx.save(); ctx.translate(x, y); ctx.scale(s, s); glyph(ctx, g, C.cocoa, C.clay); ctx.restore(); };
/** a laptop on a crate: the friend's computer (a browser, no Mac) */
const laptop = (ctx: Ctx, x: number, y: number, f: number) => {
  const R = T.roles; ctx.save(); ctx.translate(x, y);
  fillRR(ctx, -90, -70, 180, 70, 6, "#b98b62", C.ink, 3); ctx.fillStyle = "#8d6547"; ctx.fillRect(-90, -40, 180, 4);
  fillRR(ctx, -80, -190, 160, 110, 10, C.cocoa, C.ink, 3); fillRR(ctx, -70, -180, 140, 90, 6, R.surface);
  ctx.fillStyle = R["surface-2"]; ctx.fillRect(-70, -180, 140, 16); ctx.fillStyle = R.accent; ctx.fillRect(-62, -176, 30, 8);
  for (let i = 0; i < 3; i++) { ctx.fillStyle = R.border; ctx.fillRect(-58, -150 + i * 16, 60 + ((i * 37 + Math.floor(f / 30)) % 50), 5); }
  fillRR(ctx, -100, -82, 200, 12, 4, C.cocoa, C.ink, 3);
  ctx.restore();
};
/** a sand islet with a tide-foam rim */
const islet = (ctx: Ctx, cx: number, cy: number, w: number, f: number) => {
  ctx.save(); ctx.fillStyle = C.sand; ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(cx, cy, w / 2, 70, 0, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = C.seaLine; ctx.lineWidth = 5; const lap = Math.sin(f / 18) * 8; ctx.beginPath(); ctx.moveTo(cx - w / 2 - 30 + lap, cy + 6); ctx.lineTo(cx + w / 2 + 30 - lap, cy + 6); ctx.stroke(); ctx.restore();
};
/** a band of sea across the bottom of a plain ground, with travelling wave dashes */
const seaBand = (ctx: Ctx, f: number, top: number) => {
  ctx.fillStyle = C.sea; ctx.fillRect(-120, top, 2160, 1300 - top); ctx.fillStyle = C.seaDeep; ctx.fillRect(-120, top, 2160, 12);
  const r = rng(61); ctx.save(); ctx.strokeStyle = C.seaLine; ctx.lineWidth = 3.5; ctx.lineCap = "round";
  for (let row = 0; row < 3; row++) for (let i = 0; i < 8; i++) { const y = top + 40 + row * 36, x = ((r() * 2100 + f * (0.5 + row * 0.2)) % 2200) - 140, l = 30 + r() * 40; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + l / 2, y - 6, x + l, y); ctx.stroke(); }
  ctx.restore();
};
/** the Rotli workspace in a rect: sidebar (the folder you opened and its notes) and the note */
const workspace = (ctx: Ctx, c: Rect, o: { folderName: string; notes: string[]; l: number; f: number; tick?: number; typedTask?: [number, number, number]; typedLink?: [number, number, number]; extra?: string }) => {
  const R = T.roles, sw = 300, l = o.l;
  ctx.fillStyle = R.ground; ctx.fillRect(c.x, c.y, sw, c.h); ctx.fillStyle = R.border; ctx.fillRect(c.x + sw, c.y, 2, c.h);
  smallFolder(ctx, c.x + 30, c.y + 30, R.accent); text(ctx, o.folderName, c.x + 78, c.y + 58, { size: 28, weight: 600, color: R.text });
  let sy = c.y + 116; o.notes.forEach((n, i) => { const sub = n.endsWith("/"); if (i === 0) fillRR(ctx, c.x + 18, sy - 32, sw - 36, 46, 10, R.tint);
    if (sub) smallFolder(ctx, c.x + 48, sy - 30, R["text-muted"]); text(ctx, sub ? n.slice(0, -1) : n, c.x + (sub ? 94 : 50), sy, { size: 26, weight: i === 0 ? 600 : 500, color: i === 0 ? R.text : R["text-muted"] }); sy += 50; });
  const x = c.x + sw + 70; let cur: [number, number] | null = null;
  heading(ctx, T, x, c.y + 110, "Trip ideas", 56);
  task(ctx, T, x, c.y + 190, "x", "book the ferry");
  const tk = o.tick ?? 1e9; task(ctx, T, x, c.y + 250, l >= tk ? "x" : " ", "pack a snorkel", { tick: seg(l, tk + 2, tk + 10) });
  task(ctx, T, x, c.y + 310, " ", "find the pink lake");
  const line = (y: number, rawS: string, syn: number, q: [number, number, number] | undefined, rendered: (a: number) => void) => {
    if (!q) { rendered(1); return; } const [t0, t1, r] = q; if (l < t0) return; const m = seg(l, r, r + 6);
    if (m < 1) { const e = raw(ctx, T, x, y, typed(rawS, seg(l, t0, t1)), syn, 1 - m); if (l < r) cur = [e, y]; }
    if (m > 0) rendered(m);
  };
  line(c.y + 370, "- [ ] visit my friend", 6, o.typedTask, (a) => task(ctx, T, x, c.y + 370, " ", "visit my friend", { alpha: a }));
  line(c.y + 460, "Times are in [[Ferry times]]", 0, o.typedLink, (a) => { ctx.save(); ctx.globalAlpha *= a; link(ctx, T, x, c.y + 460, "Times are in ", "Ferry times", o.typedLink ? seg(l, o.typedLink[2] + 2, o.typedLink[2] + 14) : 1); ctx.restore(); });
  if (o.extra) text(ctx, o.extra, x, c.y + 540, { size: 26, color: R["text-muted"] });
  if (cur) caret(ctx, T, cur[0], cur[1], o.f);
};
/** a panel listing a folder on disk, like Files */
const diskFolder = (ctx: Ctx, x: number, y: number, w: number, name: string, rows: string[], s: number, glow = -1) => {
  if (s <= 0) return; const R = T.roles; popIn(ctx, x + w / 2, y + 40, s, () => {
    const h = 86 + rows.length * 50; fillRR(ctx, x + 6, y + 8, w, h, 18, "rgba(24,39,47,0.10)"); fillRR(ctx, x, y, w, h, 18, R.surface, C.ink, 3);
    smallFolder(ctx, x + 24, y + 22, R.accent); text(ctx, name, x + 72, y + 50, { size: 28, weight: 600, color: R.text });
    rows.forEach((r, i) => { const yy = y + 110 + i * 50; if (i === glow) fillRR(ctx, x + 12, yy - 34, w - 24, 46, 10, R.tint);
      fillRR(ctx, x + 32, yy - 28, 22, 30, 4, R.surface, R["text-muted"], 3); text(ctx, r, x + 70, yy, { size: 26, color: R.text }); });
  });
};

// ---------------------------------------------------------------- cold: the ferry to the other island
const QX = 1060, GY = 940, FX = 1400, HOPS: Pt[] = [[120, 0, 772], [140, 600, 822], [160, 860, 822], [182, QX, GY]];
const cold: Scene = { id: "cold", len: 240, draw: (ctx, env, s) => {
  jetty(ctx, s.f, 380, 930, 822); sign(ctx, s.f, 700, 822, "OTHER SHORE");
  // the friend's things: a laptop on a crate (a browser) and an old folder of notes
  laptop(ctx, 1640, GY + 8, s.f);
  folder(ctx, 1730, GY - 118, 150, 118, { open: 0.12 + 0.06 * Math.sin(s.f / 14) }); folderName(ctx, "Old notes", 1805, GY + 38);
  card(ctx, { x: 1790, y: GY - 150, rot: 0.18 + Math.sin(s.f / 16) * 0.03, scale: 0.5, title: "", lines: 2, seed: 44, frame: s.f });
  // the ferry glides in from the left
  const fx = 250 - 480 * (1 - easeOut(s.t(0, 90))); ferry(ctx, s.f, fx, 812, 1);
  const stops: Pt[] = HOPS.map(([t, x, y], i) => [t, i ? x : fx + 60, y]), h = hopAlong(s.l, stops, 110);
  const onDeck = s.l < 120, x = onDeck ? fx + 60 : h.x, y = onDeck ? 772 : h.y;
  const qp = poseAt(s.l, [[0, "base"], [120, "walking"], [186, "attention"], [205, "thoughtful"]]);
  quokka(ctx, env, s.f, { pose: qp.pose, x, y, h: 300, lift: h.lift, squash: h.squash * qp.squash });
  // it brought its plans across: Trip ideas, held beside it
  card(ctx, { x: x - 120, y: y - 150 - (h.lift ?? 0) + Math.sin(s.f / 8) * 4, rot: -0.12 + Math.sin(s.f / 11) * 0.05, scale: 0.62, title: "Trip ideas", token: true, lines: 2, seed: 7, frame: s.f });
  // the friend: waves at the ferry, then looks at its old folder and the browser, unsure
  const fp = poseAt(s.l, [[0, "thoughtful"], [70, "waving"], [150, "listening"]]);
  friend(ctx, env, s.f, { pose: fp.pose, x: FX, y: GY, h: 300, squash: fp.squash });
  thought(ctx, s, FX - 20, GY - 250, "folder", s.t(20, 36) * (1 - seg(s.l, 64, 70)), { side: -1, scale: 0.8 });
  thought(ctx, s, FX - 20, GY - 250, "question", s.t(150, 164) * (1 - seg(s.l, 186, 192)), { side: -1, scale: 0.8 });
  // the quokka sees the browser: the web
  thought(ctx, s, QX + 20, GY - 270, "globe", s.t(192, 210), { side: 1 });
} };
const chapter: Scene = { id: "chapter", len: 120, draw: (ctx, env, s) => chapterCard(ctx, env, s, { no: 9, title: ["Other shores."], pose: "waving", body: QB }) };

// ---------------------------------------------------------------- web: a browser opens a real folder
const BR: Rect = { x: 80, y: 44, w: 1320, h: 800 }, BRX = BR.x + BR.w / 2;
const W1 = { url: [14, 40], choose: 66, sheet: 70, pick: 100, select: 128, ws: 132, tick: 196, task: [226, 250, 256] as [number, number, number], link: [276, 306, 312] as [number, number, number], disk: 330, browsers: 300 };
const web: Scene = { id: "web", len: 390, atm: "ocean-tide", draw: (ctx, env, s) => {
  const l = s.l, R = T.roles, bs = pop(s.t(0, 16)), url = typed("rotli.co/app/", seg(l, W1.url[0], W1.url[1])), wsA = seg(l, W1.ws, W1.ws + 14);
  popIn(ctx, BR.x + BR.w / 2, BR.y + BR.h / 2, bs, () => browserFrame(ctx, BR, url, (c) => {
    if (l >= W1.url[0] && l < W1.url[1] + 16) caret(ctx, T, BR.x + 160 + measure(ctx, url, 26, 500, FONT.mono), BR.y + 112, s.f, 30);
    const cx = c.x + c.w / 2;
    // the start page: choose your vault
    if (wsA < 1) { ctx.save(); ctx.globalAlpha *= (1 - wsA) * (l < W1.sheet ? 1 : 1 - seg(l, W1.select, W1.select + 4));
      text(ctx, "One folder is one vault", cx, c.y + 150, { size: 28, weight: 600, align: "center", color: R["accent-text"] });
      text(ctx, "Choose your vault", cx, c.y + 236, { size: 64, weight: 600, align: "center", color: R.text, spacing: -2 });
      text(ctx, "Pick the folder that holds your notes.", cx, c.y + 300, { size: 30, align: "center", color: R["text-muted"] });
      text(ctx, "Every note is a real file there.", cx, c.y + 344, { size: 30, align: "center", color: R["text-muted"] });
      const pr = pressAt(l, [W1.choose]), dy = 3 * Math.sin(pr * Math.PI); fillRR(ctx, cx - 150, c.y + 400 + dy, 300, 66, 33, R.accent, C.ink, 3); text(ctx, "Choose folder…", cx, c.y + 444 + dy, { size: 30, weight: 600, align: "center", color: R["on-accent"] });
      ctx.restore(); }
    // the computer's own folder picker
    const sIn = easeInOut(seg(l, W1.sheet, W1.sheet + 12)), sOut = seg(l, W1.select + 4, W1.select + 12);
    if (sIn > 0 && sOut < 1) { const dy = -60 * (1 - sIn) - 40 * sOut, px = cx - 330; ctx.save(); ctx.globalAlpha *= sIn * (1 - sOut);
      ctx.fillStyle = "rgba(24,39,47,0.12)"; ctx.fillRect(c.x, c.y, c.w, c.h);
      fillRR(ctx, px, c.y + 70 + dy, 660, 500, 20, R.surface, C.ink, 3);
      text(ctx, "Choose a folder", px + 32, c.y + 126 + dy, { size: 32, weight: 600, color: R.text });
      fileList(ctx, T, { x: px + 30, y: c.y + 156 + dy, w: 600, h: 262 }, [{ name: "Documents", kind: "dir" }, { name: "Notes", kind: "dir" }, { name: "Photos", kind: "dir" }, { name: "Projects", kind: "dir" }], l >= W1.pick + 2 ? 1 : -1, 58);
      const on = l >= W1.pick + 2; fillRR(ctx, px + 300, c.y + 470 + dy, 150, 58, 14, R.surface, R.border, 2); text(ctx, "Cancel", px + 375, c.y + 508 + dy, { size: 26, weight: 600, align: "center", color: R.text });
      fillRR(ctx, px + 470, c.y + 470 + dy, 160, 58, 14, on ? R.accent : R.border); text(ctx, "Select", px + 550, c.y + 508 + dy, { size: 26, weight: 600, align: "center", color: on ? R["on-accent"] : R["text-muted"] });
      ctx.restore(); }
    // the workspace: the same editor, in a tab, working in the folder
    if (wsA > 0) { ctx.save(); ctx.globalAlpha *= wsA;
      workspace(ctx, c, { folderName: "Notes", notes: ["Trip ideas", "Ferry times", "Reading list", "Trips/"], l, f: s.f, tick: W1.tick, typedTask: W1.task, typedLink: W1.link });
      ctx.restore(); }
  }));
  // the folder on this computer: the same file, saved there
  const d = pop(s.t(W1.disk, W1.disk + 16)); diskFolder(ctx, 1450, 70, 400, "Notes", ["Trip ideas.md", "Ferry times.md", "Reading list.md"], d, s.l >= W1.disk + 20 ? 0 : -1);
  if (d > 0) { const k = seg(l, W1.disk + 4, W1.disk + 22); if (k > 0 && k < 1) { const x0 = 900, y0 = 300, x1 = 1580, y1 = 180, e = easeInOut(k); card(ctx, { x: x0 + (x1 - x0) * e, y: y0 + (y1 - y0) * e - Math.sin(k * Math.PI) * 30, rot: -0.1 + k * 0.2, scale: 0.6 * (1 - 0.3 * k), title: "Trip ideas", token: true, lines: 2, seed: 7, frame: s.f }); } }
  // Chrome, Edge and Arc open the folder directly
  ["Chrome", "Edge", "Arc"].forEach((n, i) => miniBrowser(ctx, 1450, 420 + i * 118, n, pop(s.t(W1.browsers + i * 8, W1.browsers + 14 + i * 8)), seg(l, W1.browsers + 16 + i * 8, W1.browsers + 26 + i * 8), 400, 100));
  // the pointer
  const p = path(l, [[0, 1100, 760], [30, 1000, 700], [58, BRX, 590], [70, BRX, 590], [92, 700, 446], [104, 700, 446], [120, 960, 690], [136, 960, 690], [180, 466, 424], [200, 466, 424], [240, 980, 640], [390, 1010, 660]]);
  pointer(ctx, p.x, p.y + (l > 240 ? Math.sin(l / 11) * 6 : 0), pressAt(l, [W1.choose - 2, W1.pick - 2, W1.select - 2, W1.tick - 4]));
  pair(ctx, env, s, l < W1.ws ? "attention" : l < 330 ? "notes" : "celebrating", l < W1.ws ? "thoughtful" : "notes");
  if (l >= W1.tick && l < W1.tick + 60) thought(ctx, s, 1760, 830, "heart", s.t(W1.tick + 4, W1.tick + 18), { side: -1, scale: 0.6 });
  lowerThird(ctx, l, W1.ws + 6, W1.browsers - 4, "The same editor, folders, tasks, and links in your browser,", "working in a real folder on your computer.");
  lowerThird(ctx, l, W1.browsers, s.len, "Chrome, Edge, and Arc open the folder directly.");
} };

// ---------------------------------------------------------------- helper: the bridge for Firefox, Zen and Brave
const HB = { x: 960, y: 380, w: 380, h: 170 }, FOLD = { x: 1430, y: 290, w: 330, h: 240 };
const BROWSERS = [{ n: "Firefox", y: 180, at: 10 }, { n: "Zen", y: 330, at: 22 }, { n: "Brave", y: 480, at: 34 }];
/** planks of a bridge laid along a line, `p` 0..1 laid so far */
const planks = (ctx: Ctx, x0: number, y0: number, x1: number, y1: number, p: number) => {
  if (p <= 0) return; const len = Math.hypot(x1 - x0, y1 - y0), n = Math.floor(len / 30), a = Math.atan2(y1 - y0, x1 - x0);
  ctx.save(); ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + (x1 - x0) * p, y0 + (y1 - y0) * p); ctx.stroke();
  for (let i = 0; i <= n * p; i++) { const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t; ctx.save(); ctx.translate(x, y); ctx.rotate(a); fillRR(ctx, -9, -20, 18, 40, 4, "#b98b62", C.ink, 2.5); ctx.restore(); }
  ctx.restore();
};
const helper: Scene = { id: "helper", len: 300, atm: "ocean-tide", draw: (ctx, env, s) => {
  const l = s.l, R = T.roles;
  // the bridge: each browser to the Helper, the Helper to the folder
  BROWSERS.forEach((b, i) => planks(ctx, 470, b.y + 52, HB.x - HB.w / 2, HB.y + (i - 1) * 44, easeInOut(s.t(80 + i * 12, 120 + i * 12))));
  planks(ctx, HB.x + HB.w / 2, HB.y, FOLD.x - 10, HB.y + 20, easeInOut(s.t(140, 170)));
  // notes crossing both ways once the bridge stands
  if (l >= 170) for (let i = 0; i < 3; i++) { const k = ((l - 170 + i * 22) % 66) / 66, back = i === 1, bi = i, sx = 470, sy = BROWSERS[bi].y + 52, hx = HB.x - HB.w / 2, hy = HB.y + (bi - 1) * 44;
    const t = back ? 1 - k : k, px = t < 0.5 ? sx + (hx - sx) * (t * 2) : HB.x + HB.w / 2 + (FOLD.x - 10 - HB.x - HB.w / 2) * ((t - 0.5) * 2), py = t < 0.5 ? sy + (hy - sy) * (t * 2) : HB.y + 20 * ((t - 0.5) * 2);
    if (t > 0.47 && t < 0.53) continue; ctx.save(); ctx.globalAlpha *= seg(l, 170, 180); fillRR(ctx, px - 16, py - 44, 32, 40, 5, R.surface, i === 0 ? C.clay : C.ink, 3); ctx.fillStyle = R.border; ctx.fillRect(px - 9, py - 32, 18, 3); ctx.fillRect(px - 9, py - 24, 13, 3); ctx.restore(); }
  BROWSERS.forEach((b) => miniBrowser(ctx, 140, b.y, b.n, pop(s.t(b.at, b.at + 14)), seg(l, 180, 196)));
  // the Helper: a small program
  popIn(ctx, HB.x, HB.y, pop(s.t(60, 76)), () => {
    fillRR(ctx, HB.x - HB.w / 2 + 6, HB.y - HB.h / 2 + 8, HB.w, HB.h, 24, "rgba(24,39,47,0.10)"); fillRR(ctx, HB.x - HB.w / 2, HB.y - HB.h / 2, HB.w, HB.h, 24, R.surface, C.ink, 4);
    fillRR(ctx, HB.x - HB.w / 2 + 30, HB.y - 34, 64, 64, 16, R.accent); ctx.save(); ctx.strokeStyle = R["on-accent"]; ctx.lineWidth = 5; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(HB.x - HB.w / 2 + 44, HB.y + 10); ctx.quadraticCurveTo(HB.x - HB.w / 2 + 62, HB.y - 26, HB.x - HB.w / 2 + 80, HB.y + 10); ctx.moveTo(HB.x - HB.w / 2 + 40, HB.y + 12); ctx.lineTo(HB.x - HB.w / 2 + 84, HB.y + 12); ctx.stroke(); ctx.restore();
    text(ctx, "Rotli Helper", HB.x - HB.w / 2 + 116, HB.y + 14, { size: 38, weight: 600, color: R.text, spacing: -1 });
  });
  // Mac, Windows and Linux
  ["Mac", "Windows", "Linux"].forEach((o, i) => { const k = pop(s.t(180 + i * 10, 194 + i * 10)); if (k <= 0) return; const w = measure(ctx, o, 28, 600) + 30, x = HB.x - 200 + [0, 112, 280][i]; popIn(ctx, x + w / 2, HB.y + 150, k, () => chip(ctx, x, HB.y + 128, o, { size: 28, bg: R.tint, fg: R["accent-text"] })); });
  // the folder on the far side of the bridge
  popIn(ctx, FOLD.x + FOLD.w / 2, FOLD.y + FOLD.h / 2, pop(s.t(40, 56)), () => {
    folder(ctx, FOLD.x, FOLD.y, FOLD.w, FOLD.h, { back: true, front: false }); folderName(ctx, "Notes", FOLD.x + FOLD.w / 2, FOLD.y + FOLD.h + 44);
    card(ctx, { x: FOLD.x + FOLD.w / 2 + 10, y: FOLD.y + 70, rot: 0.06 + Math.sin(s.f / 13) * 0.03, scale: 0.9, title: "Trip ideas", token: true, lines: 2, seed: 7, frame: s.f });
    folder(ctx, FOLD.x, FOLD.y, FOLD.w, FOLD.h, { open: 0.1 + 0.05 * Math.sin(s.f / 12), back: false, front: true });
  });
  pair(ctx, env, s, l < 170 ? "attention" : "knowledge_system", l < 200 ? "listening" : "celebrating");
  if (l >= 206) thought(ctx, s, 1770, 830, "check", s.t(206, 222), { side: -1, scale: 0.6 });
  lowerThird(ctx, l, 64, s.len, "Rotli Helper: a small program for Mac, Windows, and Linux.", "It lets Firefox, Zen, and Brave use your folder.");
} };

// ---------------------------------------------------------------- import: inspect without writing, then open in place (or import a copy)
const PN: Rect = { x: 80, y: 44, w: 1320, h: 800 }, AS = 340; // the setup panel and its aside
const I1 = { pick: 30, choose: 60, scan: 72, review: 164, copy: 226, place: 262, open: 300, ws: 310 };
const OLD = [".obsidian", "Trip ideas.md", "Recipes.md", "Books.md", "journal"];
/** a setup choice row: title + description, selected = tinted with an accent rim */
const option = (ctx: Ctx, x: number, y: number, w: number, title: string, desc: string, on: boolean) => {
  const R = T.roles; fillRR(ctx, x, y, w, 108, 16, on ? R.tint : R.surface, on ? R.accent : R.border, on ? 3 : 2);
  ctx.beginPath(); ctx.arc(x + 38, y + 40, 13, 0, 6.29); ctx.fillStyle = R.surface; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = on ? R.accent : R["text-muted"]; ctx.stroke(); if (on) { ctx.beginPath(); ctx.arc(x + 38, y + 40, 7, 0, 6.29); ctx.fillStyle = R.accent; ctx.fill(); }
  text(ctx, title, x + 70, y + 50, { size: 32, weight: 600, color: R.text }); text(ctx, desc, x + 70, y + 88, { size: 26, color: R["text-muted"] });
};
const importScene: Scene = { id: "import", len: 420, atm: "ocean-tide", draw: (ctx, env, s) => {
  const l = s.l, R = T.roles, k = pop(s.t(0, 16)), X = PN.x + AS + 60, CW = PN.w - AS - 110;
  const stage = l < I1.scan ? "choose" : l < I1.review ? "scan" : l < I1.ws ? "review" : "ws";
  const fadeIn = (a: number) => seg(l, a, a + 12);
  popIn(ctx, PN.x + PN.w / 2, PN.y + PN.h / 2, 0.94 + 0.06 * k, () => { ctx.save(); ctx.globalAlpha *= Math.min(1, k * 1.4);
    fillRR(ctx, PN.x + 10, PN.y + 16, PN.w, PN.h, 26, "rgba(24,39,47,0.12)"); fillRR(ctx, PN.x, PN.y, PN.w, PN.h, 26, R.surface, C.ink, 4);
    ctx.save(); rr(ctx, PN.x, PN.y, PN.w, PN.h, 26); ctx.clip();
    if (stage === "ws") { const a = fadeIn(I1.ws); ctx.globalAlpha *= a; workspace(ctx, { x: PN.x, y: PN.y, w: PN.w, h: PN.h }, { folderName: "Old notes", notes: ["Trip ideas", "Recipes", "Books", "journal/"], l, f: s.f }); ctx.restore(); ctx.restore(); return; }
    // the aside
    ctx.fillStyle = R.ground; ctx.fillRect(PN.x, PN.y, AS, PN.h); ctx.fillStyle = R.border; ctx.fillRect(PN.x + AS, PN.y, 2, PN.h);
    text(ctx, "Rotli for Mac", PN.x + 40, PN.y + 80, { size: 40, weight: 600, color: R.text, spacing: -1 });
    ["Nothing is chosen", "or changed until", "you confirm."].forEach((t, i) => text(ctx, t, PN.x + 40, PN.y + 600 + i * 38, { size: 26, color: R["text-muted"] }));
    if (stage === "choose") {
      const a = fadeIn(0); ctx.save(); ctx.globalAlpha *= a;
      text(ctx, "One folder is one vault", X, PN.y + 110, { size: 28, weight: 600, color: R["accent-text"] });
      text(ctx, "Where should your notes live?", X, PN.y + 184, { size: 54, weight: 600, color: R.text, spacing: -2 });
      option(ctx, X, PN.y + 240, CW, "Create a Rotli vault", "Choose an empty home.", l < I1.pick);
      option(ctx, X, PN.y + 366, CW, "Open an existing folder", "Review an Obsidian, ZenNotes, or other Markdown tree.", l >= I1.pick);
      const pr = pressAt(l, [I1.choose - 2]), label = l < I1.pick ? "Choose an empty folder" : "Choose an existing folder", bw = measure(ctx, label, 28, 600) + 60;
      fillRR(ctx, PN.x + PN.w - 50 - bw, PN.y + PN.h - 110 + 3 * Math.sin(pr * Math.PI), bw, 64, 32, R.accent, C.ink, 3); text(ctx, label, PN.x + PN.w - 50 - bw / 2, PN.y + PN.h - 68 + 3 * Math.sin(pr * Math.PI), { size: 28, weight: 600, align: "center", color: R["on-accent"] });
      ctx.restore();
    } else if (stage === "scan") {
      const a = fadeIn(I1.scan); ctx.save(); ctx.globalAlpha *= a;
      text(ctx, "Reading the folder map…", X, PN.y + 150, { size: 54, weight: 600, color: R.text, spacing: -2 });
      text(ctx, "Counting notes and nested folders.", X, PN.y + 214, { size: 30, color: R["text-muted"] });
      text(ctx, "No files are being written.", X, PN.y + 258, { size: 30, weight: 600, color: R.text });
      fillRR(ctx, X, PN.y + 296, CW, 10, 5, R["surface-2"]); const sl = ((l - I1.scan) % 40) / 40; ctx.save(); rr(ctx, X, PN.y + 296, CW, 10, 5); ctx.clip(); fillRR(ctx, X - 200 + sl * (CW + 200), PN.y + 296, 200, 10, 5, R.accent); ctx.restore();
      // the old folder, read row by row, nothing changed
      fileList(ctx, T, { x: X, y: PN.y + 340, w: CW, h: 20 + OLD.length * 54 }, OLD.map((n) => ({ name: n, kind: n.endsWith(".md") ? "md" : "dir" })), Math.floor((l - I1.scan) / 14) % OLD.length, 54);
      ctx.restore();
    } else {
      const a = fadeIn(I1.review); ctx.save(); ctx.globalAlpha *= a;
      text(ctx, "Obsidian vault", X, PN.y + 110, { size: 28, weight: 600, color: R["accent-text"] });
      text(ctx, "Bring in Old notes.", X, PN.y + 184, { size: 56, weight: 600, color: R.text, spacing: -2 });
      let sx = X; [["31", "Markdown notes"], ["4", "nested folders"], ["6", "other files"]].forEach(([n, t]) => { const w = measure(ctx, n, 30, 700) + measure(ctx, t, 28) + 50; fillRR(ctx, sx, PN.y + 214, w, 54, 14, R["surface-2"]); text(ctx, n, sx + 16, PN.y + 251, { size: 30, weight: 700, color: R.text }); text(ctx, t, sx + 26 + measure(ctx, n, 30, 700), PN.y + 251, { size: 28, color: R["text-muted"] }); sx += w + 14; });
      const copy = l >= I1.copy && l < I1.place;
      option(ctx, X, PN.y + 300, CW, "Open in place", "Keep using this exact folder.", !copy);
      option(ctx, X, PN.y + 426, CW, "Import a copy", "The source vault remains untouched.", copy);
      const pr = pressAt(l, [I1.open - 2]), label = copy ? "Choose copy destination" : "Open this vault", bw = measure(ctx, label, 28, 600) + 60;
      fillRR(ctx, PN.x + PN.w - 50 - bw, PN.y + PN.h - 110 + 3 * Math.sin(pr * Math.PI), bw, 64, 32, R.accent, C.ink, 3); text(ctx, label, PN.x + PN.w - 50 - bw / 2, PN.y + PN.h - 68 + 3 * Math.sin(pr * Math.PI), { size: 28, weight: 600, align: "center", color: R["on-accent"] });
      ctx.restore();
    }
    ctx.restore(); ctx.restore(); });
  // the friend's old folder, beside the panel: read (a magnifier passes), then kept where it is
  const fy = 250; folder(ctx, 1480, fy, 300, 220, { open: 0.08 + 0.05 * Math.sin(s.f / 13) }); folderName(ctx, "Old notes", 1630, fy + 264);
  if (stage === "scan") { const t = (l - I1.scan) / 30; mark(ctx, "search", 1630 + Math.sin(t * 2.2) * 90, fy + 110 + Math.cos(t * 1.7) * 40, 1.6 * seg(l, I1.scan, I1.scan + 10)); }
  if (l >= I1.ws) { const c = pop(s.t(I1.ws + 6, I1.ws + 20)); popIn(ctx, 1740, fy - 10, c, () => { ctx.beginPath(); ctx.arc(1740, fy - 10, 30, 0, 6.29); ctx.fillStyle = R.success; ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.stroke(); ctx.strokeStyle = R.surface; ctx.lineWidth = 6; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.beginPath(); ctx.moveTo(1726, fy - 10); ctx.lineTo(1736, fy); ctx.lineTo(1754, fy - 22); ctx.stroke(); }); }
  // the pointer
  const bx = PN.x + PN.w - 200, by = PN.y + PN.h - 78;
  const p = path(l, [[0, 1000, 700], [22, 900, 460], [34, 900, 460], [52, bx, by], [64, bx, by], [100, 1100, 760], [200, 1000, 720], [220, 900, 520], [232, 900, 520], [254, 900, 390], [268, 900, 390], [292, bx + 40, by], [306, bx + 40, by], [360, 1000, 660], [420, 1030, 690]]);
  pointer(ctx, p.x, p.y + (l > 306 ? Math.sin(l / 11) * 6 : 0), pressAt(l, [I1.pick - 4, I1.choose - 2, I1.copy - 4, I1.place - 4, I1.open - 2]));
  // the quokka (the Mac user) works the panel; the friend watches
  pair(ctx, env, s, stage === "scan" ? "searching" : stage === "ws" ? "celebrating" : "notes", stage === "ws" ? "celebrating" : "listening", 1610, 1815);
  if (stage === "scan") thought(ctx, s, 1610, 830, "search", s.t(I1.scan + 10, I1.scan + 26), { scale: 0.6 });
  if (l >= I1.ws + 20) thought(ctx, s, 1815, 820, "heart", s.t(I1.ws + 24, I1.ws + 40), { side: -1, scale: 0.6 });
  lowerThird(ctx, l, 8, I1.scan + 20, "Already have an Obsidian, ZenNotes, or plain Markdown folder?");
  lowerThird(ctx, l, I1.scan + 22, s.len, "Rotli for Mac's first run inspects an old folder without writing anything,", "then opens it in place or imports a copy.");
} };

// ---------------------------------------------------------------- payoff: two islands, one way of working
const payoff: Scene = { id: "payoff", len: 210, atm: "ocean-tide", draw: (ctx, env, s) => {
  const SY = 900;
  intertitle(ctx, s, ["Two islands.", "One way of working."], { hi: "One way", y: 190, size: 84, sub: "Every note still in its own folder." });
  seaBand(ctx, s.f, SY + 10);
  const k = backOut(s.t(24, 44)), up = (1 - k) * 60;
  ctx.save(); ctx.translate(0, up); ctx.globalAlpha *= Math.min(1, k * 1.5);
  islet(ctx, 560, SY + 30, 760, s.f); islet(ctx, 1360, SY + 30, 760, s.f);
  // the quokka's island: its folder and the Trip ideas note
  folder(ctx, 520, SY - 210, 230, 170, { back: true, front: false }); folderName(ctx, "Island", 635, SY - 250);
  card(ctx, { x: 640, y: SY - 160, rot: 0.08 + Math.sin(s.f / 13) * 0.03, scale: 0.72, title: "Trip ideas", token: true, lines: 2, seed: 7, frame: s.f });
  folder(ctx, 520, SY - 210, 230, 170, { open: 0.1, back: false });
  quokka(ctx, env, s.f, { pose: "notes", x: 380, y: SY, h: 250 });
  // the friend's island: its own folder, in place, and the browser
  folder(ctx, 1170, SY - 210, 230, 170, { back: true, front: false }); folderName(ctx, "Old notes", 1285, SY - 250);
  card(ctx, { x: 1290, y: SY - 160, rot: -0.08 + Math.sin(s.f / 12) * 0.03, scale: 0.72, title: "Recipes", lines: 2, seed: 12, frame: s.f });
  folder(ctx, 1170, SY - 210, 230, 170, { open: 0.1, back: false });
  laptop(ctx, 1620, SY + 6, s.f);
  friend(ctx, env, s.f, { pose: "notes", x: 1500, y: SY, h: 250 });
  ctx.restore();
  // each is glad of the other
  if (s.l >= 130) thought(ctx, s, 400, SY - 230, "heart", s.t(130, 146), { scale: 0.7 });
  if (s.l >= 146) thought(ctx, s, 1480, SY - 240, "heart", s.t(146, 162), { side: -1, scale: 0.7 });
} };
const end: Scene = { id: "end", len: 120, atm: "ocean-tide", draw: (ctx, env, s) => storyEnd(ctx, env, s, { next: "Seasons", pose: "waving" }) };

const SCENES = [cold, chapter, web, helper, importScene, payoff, end];
const WB = sceneStart(SCENES, "web"), HP = sceneStart(SCENES, "helper"), IM = sceneStart(SCENES, "import"), PY = sceneStart(SCENES, "payoff");
export const s01e09OtherShores: Film = story({ id: "s01e09OtherShores", no: 9, title: "Other shores.", atmosphere: "harbour-day", scenes: SCENES,
  score: { key: 7, melody: 0,
    pops: [[192, 86],
      ...[W1.choose, W1.pick, W1.select, W1.tick, W1.task[2], W1.link[2], W1.disk, W1.browsers].map((c, i) => [WB + c, [79, 81, 84, 86, 88, 86, 91, 84][i]] as [number, number]),
      ...[10, 22, 34, 60, 170, 180, 190, 200].map((c, i) => [HP + c, [79, 81, 84, 88, 91, 84, 86, 88][i]] as [number, number]),
      ...[I1.choose, I1.review, I1.copy, I1.place, I1.open].map((c, i) => [IM + c, [81, 84, 86, 84, 91][i]] as [number, number]),
      [PY + 130, 86], [PY + 146, 88]],
    thumps: [140, 160, 182] } });

export const s01e09Derive: DeriveSpec = {
  no: 9, series: "season-one", label: "Rotli · Season One · 09",
  vertical: [
    { frame: 60, len: 180, crop: { x: 760, y: 330, w: 1160, h: 750 }, title: "Across the water.", sub: "A friend with a browser and an old folder.", hi: "friend" },
    { frame: WB + 140, len: 225, crop: { x: 80, y: 40, w: 1000, h: 720 }, title: "Your folder, in a browser.", sub: "Chrome, Edge, and Arc open it directly.", hi: "browser" },
    { frame: HP + 60, len: 210, crop: { x: 90, y: 110, w: 1110, h: 640 }, title: "Rotli Helper.", sub: "Firefox, Zen, and Brave use your folder.", hi: "Helper" },
    { frame: IM + 150, len: 150, crop: { x: 420, y: 40, w: 1000, h: 780 }, title: "Look first. Then open.", sub: "Rotli for Mac inspects without writing anything.", hi: "Look" },
  ],
  slides: [
    { frame: 215, crop: { x: 520, y: 280, w: 1400, h: 800 }, title: "Across the water.", sub: "A friend with a browser and an old folder.", hi: "friend" },
    { frame: WB + 320, crop: { x: 80, y: 40, w: 1000, h: 720 }, title: "Your folder, in a browser.", sub: "The same editor, tasks, and links.", hi: "browser" },
    { frame: HP + 260, crop: { x: 100, y: 80, w: 1720, h: 960 }, title: "Rotli Helper.", sub: "Firefox, Zen, and Brave use your folder.", hi: "Helper" },
    { frame: IM + 285, crop: { x: 420, y: 40, w: 1000, h: 780 }, title: "Open in place.", sub: "Or import a copy, in Rotli for Mac.", hi: "place" },
  ],
  single: { frame: PY + 190, crop: { x: 120, y: 60, w: 1680, h: 1000 }, title: "Other shores.", sub: "Your folder opens in a browser, too.", hi: "shores" },
};
