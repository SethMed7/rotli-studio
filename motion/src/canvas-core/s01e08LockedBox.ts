// SEASON ONE · 08 — THE LOCKED BOX. (60 s). Brief: series/season-one/episodes/s01e08.json
// Setup: Rain at night; the quokka keeps its passport note somewhere safe.
// Turn: It marks the note secure: remote clouds knock and are turned away at the door; the on-device friend may read it. A pasted secret is caught on its own. A locked note can be read by every model and edited by none.
// Payoff: Warm inside. The weather stays outside.
// Style: LINE (the line-art quokka, outlined props on the midnight deep band). Token: the Trip ideas note.
// The camera stays OUTSIDE the house in the story scenes, so the rain (the atmosphere's front layer) falls
// where it belongs: on the glass, never in the room.
//
// CUE TABLE (global frames)
//   0    cold     rain at night; the quokka at its window with the Passport note; it thinks: a lock
//   240  chapter  "The locked box."
//   360  secure   TURN (405): the note is marked secure and moves to wiki/_secure/; clouds knock at the door and are turned away; the chip reads
//   780  shapes   a fake key is pasted into Ferry booking; Rotli catches it on its own; a cloud bounces off
//   1110 lock     Trip ideas is locked: the chip and a cloud read it; both edits are refused
//   1440 payoff   "Warm inside. / The weather stays outside."
//   1680 end      Next: Other Shores
import type { Ctx, P } from "./core";
import type { Film } from "./film";
import { card, chip, cloud, FONT, lerp, lockIcon, sparkle } from "./rotli/kit";
import type { PoseName } from "./quokka/poses";
import type { DeriveSpec } from "./studio/derive";
import { lowerThird } from "./studio/series";
import { C, DARK, backOut, chapterCard, easeInOut, easeOut, fillRR, ink, intertitle, lineQuokka, measure, pop, seg, sceneStart, story, storyEnd, text, thought, type Scene, type S } from "./studio/story";
import { appFrame, heading, keys, para, pointer, task } from "./studio/ui";

const T = DARK;
const easeIn = (t: number) => Math.max(0, Math.min(1, t)) ** 3;
// ---------------------------------------------------------------- local helpers
/** the line-art quokka that can hop (lift) and face left (flip) */
const lq = (ctx: Ctx, s: S, pose: PoseName, x: number, y: number, h: number, lift = 0, flip = false) => { ctx.save(); if (flip) { ctx.translate(x * 2, 0); ctx.scale(-1, 1); } lineQuokka(ctx, s, { pose, x, y: y - lift, h }); ctx.restore(); };
/** a pose table: the last entry at or before `l` */
const poseOf = (l: number, table: [number, PoseName][]) => table.reduce((p, [t, n]) => (l >= t ? n : p), table[0][1]);
/** a slow camera push around a point (UI text stays ≥ 26 px on screen) */
const push = (ctx: Ctx, cx: number, cy: number, k: number) => { ctx.translate(cx, cy); ctx.scale(k, k); ctx.translate(-cx, -cy); };
const fade = (ctx: Ctx, a: number, fn: () => void) => { if (a <= 0) return; ctx.save(); ctx.globalAlpha *= Math.min(1, a); fn(); ctx.restore(); };
/** straight edges for ink(): subdivide so the hand-drawn spline keeps its corners */
const edges = (pts: P[], closed = false, n = 10): P[] => { const q = closed ? pts.concat([pts[0]]) : pts, out: P[] = []; for (let i = 1; i < q.length; i++) for (let j = 0; j < n; j++) out.push([q[i - 1][0] + ((q[i][0] - q[i - 1][0]) * j) / n, q[i - 1][1] + ((q[i][1] - q[i - 1][1]) * j) / n]); if (!closed) out.push(q[q.length - 1]); return out; };
const rect = (x0: number, y0: number, x1: number, y1: number): P[] => edges([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], true);
const press = (l: number, at: number[]) => at.reduce((a, c) => Math.max(a, l >= c && l < c + 12 ? (l - c) / 12 : 0), 0);
const LINE = () => C.nightText, SOFT = () => C.nightMuted;
/** the on-device model: the film's little green chip friend (eyes can glance toward what it reads) */
const onDevice = (ctx: Ctx, cx: number, cy: number, s: number, look = 0) => {
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
  fillRR(ctx, -70, -60, 140, 120, 18, C.olive, C.nightText, 4);
  for (let i = -2; i <= 2; i++) { ctx.fillStyle = C.nightText; ctx.fillRect(i * 24 - 4, -76, 8, 16); ctx.fillRect(i * 24 - 4, 60, 8, 16); }
  ctx.fillStyle = C.night; ctx.beginPath(); ctx.arc(-24 + look * 8, -8, 8, 0, 6.29); ctx.arc(24 + look * 8, -8, 8, 0, 6.29); ctx.fill();
  ctx.strokeStyle = C.night; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(look * 6, 8, 16, 0.2, Math.PI - 0.2); ctx.stroke();
  ctx.restore();
};
/** a round ✓ / ✕ badge, popped by `k` */
const mark = (ctx: Ctx, cx: number, cy: number, ok: boolean, k = 1, r = 22) => {
  if (k <= 0) return; ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k); ctx.fillStyle = ok ? C.oliveBright : C.badge; ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.29); ctx.fill();
  ctx.strokeStyle = C.night; ctx.lineWidth = r * 0.25; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.beginPath(); const q = r * 0.4;
  if (ok) { ctx.moveTo(-q * 1.1, 0); ctx.lineTo(-q * 0.3, q * 0.9); ctx.lineTo(q * 1.2, -q * 0.9); } else { ctx.moveTo(-q, -q); ctx.lineTo(q, q); ctx.moveTo(q, -q); ctx.lineTo(-q, q); }
  ctx.stroke(); ctx.restore();
};
/** red spokes where something is refused */
const burst = (ctx: Ctx, x: number, y: number, k: number) => {
  if (k <= 0 || k >= 1) return; ctx.save(); ctx.globalAlpha *= 1 - k; ctx.strokeStyle = C.badge; ctx.lineWidth = 6; ctx.lineCap = "round";
  for (let i = 0; i < 6; i++) { const a = i * 1.047 + 0.3; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * 22, y + Math.sin(a) * 22); ctx.lineTo(x + Math.cos(a) * (44 + 34 * k), y + Math.sin(a) * (44 + 34 * k)); ctx.stroke(); }
  ctx.restore();
};
/** "no edits": a pencil with a slash through it */
const noEdit = (ctx: Ctx, cx: number, cy: number, s: number, col: string) => {
  ctx.save(); ctx.translate(cx, cy); ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineJoin = "round"; ctx.lineCap = "round";
  ctx.save(); ctx.rotate(-Math.PI / 4); const u = s / 22;
  ctx.beginPath(); ctx.moveTo(-11 * u, 0); ctx.lineTo(-5 * u, -3.2 * u); ctx.lineTo(-5 * u, 3.2 * u); ctx.closePath(); ctx.fill();
  ctx.fillRect(-3.5 * u, -3.2 * u, 12 * u, 6.4 * u); ctx.fillRect(9.5 * u, -3.2 * u, 3 * u, 6.4 * u); ctx.restore();
  ctx.lineWidth = s * 0.12; ctx.beginPath(); ctx.moveTo(-s * 0.55, -s * 0.55); ctx.lineTo(s * 0.55, s * 0.55); ctx.stroke(); ctx.restore();
};
/** an outlined pencil pointing left, tip at (x, y): an AI edit on its way */
const pencil = (ctx: Ctx, x: number, y: number, f: number) => {
  ctx.save(); ctx.translate(x, y); const o = { w: 3.5, color: C.nightText, frame: f, wob: 0.4, boil: 0.3 };
  ink(ctx, [[0, 0], [22, -12], [22, 12], [0, 0]], { ...o, seed: 301 }); ink(ctx, edges([[22, -12], [96, -12], [96, 12], [22, 12]], true), { ...o, seed: 302, closed: true });
  ink(ctx, [[82, -12], [82, 12]], { ...o, seed: 303 }); ctx.fillStyle = C.nightText; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(7, -4); ctx.lineTo(7, 4); ctx.closePath(); ctx.fill();
  ctx.restore();
};
/** a dashed read arrow from (x0, y) to (x1, y), head at x1 */
const arrow = (ctx: Ctx, f: number, x0: number, y0: number, x1: number, y1: number, k: number, seed: number) => {
  if (k <= 0) return; ink(ctx, [[x0, y0], [lerp(x0, x1, 0.5), lerp(y0, y1, 0.5) - 10], [x1, y1]], { w: 5, color: C.oliveBright, seed, frame: f, progress: k, dash: [12, 9], wob: 0.4 });
  if (k >= 1) { const a = Math.atan2(y1 - y0 + 10, x1 - x0); ctx.save(); ctx.translate(x1, y1); ctx.rotate(a); ctx.fillStyle = C.oliveBright; ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(-16, -11); ctx.lineTo(-16, 11); ctx.closePath(); ctx.fill(); ctx.restore(); }
};
/** knock marks: little arcs beside the door */
const knockMarks = (ctx: Ctx, x: number, y: number, k: number, f: number) => {
  if (k <= 0 || k >= 1) return; const a = 1 - k;
  [0, 1].forEach((i) => ink(ctx, [[x + 10 + i * 16, y - 26 - i * 8], [x + 20 + i * 16, y], [x + 10 + i * 16, y + 26 + i * 8]], { w: 4, color: C.nightText, seed: 400 + i, frame: f, alpha: a, wob: 0.3 }));
};
/** rain dripping off an eave: a row of drops falling a short way */
const drips = (ctx: Ctx, f: number, x0: number, x1: number, y: number, n = 9) => {
  ctx.save(); ctx.strokeStyle = C.nightMuted; ctx.lineWidth = 3; ctx.lineCap = "round";
  for (let i = 0; i < n; i++) { const x = x0 + ((x1 - x0) * (i + 0.5)) / n, ph = (f * 2.2 + i * 37) % 70; ctx.globalAlpha = 0.6 * (1 - ph / 70); ctx.beginPath(); ctx.moveTo(x, y + 6 + ph * 1.6); ctx.lineTo(x, y + 20 + ph * 1.6); ctx.stroke(); }
  ctx.restore();
};

// ---------------------------------------------------------------- the window (cold open and payoff): we look in from the rain
const WN = { x: 460, y: 320, w: 1000, h: 560 };
const windowShot = (ctx: Ctx, s: S, inside: () => void) => {
  const f = s.f, o = { w: 4, color: LINE(), frame: f, wob: 0.8 }, x1 = WN.x + WN.w, y1 = WN.y + WN.h;
  // the eave and a few boards of the outside wall
  ink(ctx, [[-40, 250], [1960, 256]], { ...o, w: 5, seed: 1 }); ink(ctx, [[-40, 272], [1960, 276]], { ...o, w: 3, color: SOFT(), seed: 2 });
  drips(ctx, f, 80, 1840, 276, 14);
  [[80, 380], [100, 560], [60, 740], [1540, 420], [1580, 640], [1520, 820]].forEach(([x, y], i) => ink(ctx, [[x, y], [x + 300, y + 2]], { w: 3, color: SOFT(), seed: 10 + i, frame: f, alpha: 0.5 }));
  // the lit pane: a flat, faint fill (the light inside), then the room
  ctx.save(); ctx.globalAlpha = 0.07; ctx.fillStyle = C.nightText; ctx.fillRect(WN.x, WN.y, WN.w, WN.h); ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.rect(WN.x, WN.y, WN.w, WN.h); ctx.clip();
  // curtains, tied back at each side
  ink(ctx, [[WN.x + 4, WN.y + 6], [WN.x + 130, WN.y + 6], [WN.x + 92, WN.y + 200], [WN.x + 40, WN.y + 330], [WN.x + 70, WN.y + 550]], { ...o, w: 3, color: SOFT(), seed: 20 });
  ink(ctx, [[x1 - 4, WN.y + 6], [x1 - 130, WN.y + 6], [x1 - 92, WN.y + 200], [x1 - 40, WN.y + 330], [x1 - 70, WN.y + 550]], { ...o, w: 3, color: SOFT(), seed: 21 });
  inside(); ctx.restore();
  ink(ctx, rect(WN.x, WN.y, x1, y1), { ...o, w: 6, closed: true, seed: 3, wob: 0.5 });
  ink(ctx, rect(WN.x - 18, WN.y - 18, x1 + 18, y1 + 4), { ...o, w: 3, color: SOFT(), closed: true, seed: 4, wob: 0.5 });
  ink(ctx, [[WN.x - 50, y1 + 14], [x1 + 50, y1 + 14]], { ...o, w: 7, seed: 5 }); ink(ctx, [[WN.x - 40, y1 + 34], [x1 + 40, y1 + 34]], { ...o, w: 3, color: SOFT(), seed: 6 });
};

// ---------------------------------------------------------------- scenes
const cold: Scene = { id: "cold", len: 240, draw: (ctx, env, s) => {
  // rain at night; the quokka at its window turns the Passport note over; it thinks: a lock
  const pose = poseOf(s.l, [[0, "notes"], [96, "thoughtful"], [168, "stays_local"]]);
  windowShot(ctx, s, () => {
    lq(ctx, s, pose, 800, 1010, 520);
    card(ctx, { x: 1190, y: 620 + Math.sin(s.f / 17) * 6, rot: -0.07 + Math.sin(s.f / 23) * 0.03, scale: 1.4, title: "Passport", lines: 2, seed: 71, frame: s.f, dark: true });
  });
  intertitle(ctx, s, ["Rain at night."], { y: 110, size: 56, t0: 12 });
  intertitle(ctx, s, ["Some things stay in the house."], { y: 190, size: 56, hi: "stay", t0: 96 });
  thought(ctx, s, 840, 590, "lock", s.t(130, 150), { scale: 0.9 });
} };
const chapter: Scene = { id: "chapter", len: 120, draw: (ctx, env, s) => chapterCard(ctx, env, s, { no: 8, title: ["The locked box."], pose: "stays_local", line: true }) };

// the house, seen from the rain: the window shows the room, the door faces the weather
const HS = { x0: 260, x1: 1260, top: 420, gy: 840 }, HW = { x: 340, y: 480, w: 660, h: 290 }, DOOR = { x: 1110, y: 600, w: 120 };
const KNOCK = [
  { t0: 96, hit: 128, y: 650 },
  { t0: 172, hit: 204, y: 500 },
  { t0: 214, hit: 246, y: 760 },
];
const refuseAt = (k: (typeof KNOCK)[number]) => k.hit + 24;
const SECURE_AT = 45, CHIP_AT = 66, READ_AT = 92;
const house = (ctx: Ctx, s: S, inside: () => void) => {
  const f = s.f, o = { w: 4, color: LINE(), frame: f, wob: 0.8 };
  ink(ctx, [[-40, HS.gy], [1960, HS.gy + 4]], { ...o, w: 3, color: SOFT(), seed: 30 });
  ink(ctx, edges([[HS.x0, HS.gy], [HS.x0, HS.top], [HS.x1, HS.top], [HS.x1, HS.gy]]), { ...o, seed: 31, wob: 0.5 });
  ink(ctx, edges([[HS.x0 - 60, HS.top + 6], [(HS.x0 + HS.x1) / 2, 200], [HS.x1 + 60, HS.top + 6]]), { ...o, w: 5, seed: 32, wob: 0.5 });
  ink(ctx, edges([[1040, 312], [1040, 200], [1110, 200], [1110, 340]]), { ...o, seed: 33, wob: 0.4 }); // the chimney, standing on the roof
  drips(ctx, f, HS.x0 - 40, HS.x1 + 40, HS.top + 6, 10);
  // the window: the lit pane, the room inside, the frame
  ctx.save(); ctx.globalAlpha = 0.07; ctx.fillStyle = C.nightText; ctx.fillRect(HW.x, HW.y, HW.w, HW.h); ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.rect(HW.x, HW.y, HW.w, HW.h); ctx.clip(); inside(); ctx.restore();
  ink(ctx, rect(HW.x, HW.y, HW.x + HW.w, HW.y + HW.h), { ...o, w: 5, closed: true, seed: 34, wob: 0.4 });
  ink(ctx, [[HW.x - 30, HW.y + HW.h + 12], [HW.x + HW.w + 30, HW.y + HW.h + 12]], { ...o, w: 6, seed: 35 });
  // the door, shut; its lock arrives with the secure mark
  ink(ctx, edges([[DOOR.x, HS.gy], [DOOR.x, DOOR.y], [DOOR.x + DOOR.w, DOOR.y], [DOOR.x + DOOR.w, HS.gy]]), { ...o, seed: 36, wob: 0.4 });
  ctx.fillStyle = C.nightText; ctx.beginPath(); ctx.arc(DOOR.x + 24, 730, 6, 0, 6.29); ctx.fill();
};
const secure: Scene = { id: "secure", len: 420, draw: (ctx, env, s) => {
  const pose = poseOf(s.l, [[0, "notes"], [SECURE_AT, "stays_local"], [KNOCK[0].hit, "listening"], [refuseAt(KNOCK[2]) + 30, "stays_local"], [350, "celebrating"]]);
  const read = easeOut(s.t(READ_AT, READ_AT + 14)), chipK = pop(s.t(CHIP_AT, CHIP_AT + 14));
  house(ctx, s, () => {
    lq(ctx, s, pose, 460, 860, 380);
    card(ctx, { x: 680, y: 604 + Math.sin(s.f / 19) * 4, rot: -0.05, scale: 1.1, title: "Passport", lines: 2, lock: s.l >= SECURE_AT, seed: 71, frame: s.f, dark: true });
    if (s.l >= SECURE_AT && s.l < SECURE_AT + 16) sparkle(ctx, 770, 660, 20 * (1 - s.t(SECURE_AT, SECURE_AT + 16)), C.oliveBright, s.l / 4);
    const pk = pop(s.t(SECURE_AT + 10, SECURE_AT + 22)); if (pk > 0) { ctx.save(); ctx.translate(575, 716); ctx.scale(pk, pk); chip(ctx, 0, 0, "wiki/_secure/", { size: 26, mono: true, bg: C.nightSurface2, fg: C.nightText, border: C.nightBorder }); ctx.restore(); }
    if (chipK > 0) onDevice(ctx, 910, 690 + Math.sin(s.f / 12) * 3, 0.55 * chipK, -read);
    arrow(ctx, s.f, 868, 650, 792, 632, read, 41);
  });
  // the on-device friend may read it: a tick above the chip, and its name on the wall
  mark(ctx, 950, 640, true, pop(s.t(READ_AT + 10, READ_AT + 22)), 18);
  text(ctx, "on-device model", 910, 812, { size: 26, weight: 600, align: "center", color: C.oliveBright, alpha: s.t(CHIP_AT + 8, CHIP_AT + 20) });
  // the door's lock: it arrives with the secure mark and jolts at each knock
  const jolt = KNOCK.reduce((a, k) => Math.max(a, [0, 8, 16].reduce((b, d) => Math.max(b, s.l >= k.hit + d && s.l < k.hit + d + 6 ? 1 - (s.l - k.hit - d) / 6 : 0), 0)), 0);
  const lk = backOut(s.t(SECURE_AT, SECURE_AT + 14)); if (lk > 0) lockIcon(ctx, DOOR.x + DOOR.w / 2 + jolt * 3, 680, 30 * lk, C.oliveBright);
  // remote models: each cloud floats to the door, knocks three times, and is turned away
  KNOCK.forEach((k, i) => {
    if (s.l < k.t0) return; const ref = refuseAt(k), X = 1390;
    let x: number, y: number, a = 1;
    if (s.l < k.hit) { const e = easeOut(s.t(k.t0, k.hit)); x = lerp(2140, X, e); y = lerp(k.y - 220, k.y, e); }
    else if (s.l < ref) { const d = (s.l - k.hit) % 8; x = X - (s.l - k.hit < 24 ? Math.sin((d / 8) * Math.PI) * 26 : 0); y = k.y; }
    else { const e = easeIn(s.t(ref + 10, ref + 70)); x = X + 30 * easeOut(s.t(ref, ref + 10)) + 560 * e; y = k.y + Math.sin((s.l - ref) / 7) * 8 - 90 * e; a = 1 - e; }
    fade(ctx, a, () => cloud(ctx, x, y, 0.9, { frame: s.f, seed: 60 + i, face: s.l >= ref && s.l < ref + 50 ? "dizzy" : "curious" }));
    [0, 8, 16].forEach((d) => knockMarks(ctx, DOOR.x + DOOR.w + 6, k.y, seg(s.l, k.hit + d, k.hit + d + 8), s.f));
    burst(ctx, DOOR.x + DOOR.w + 20, k.y, s.t(ref, ref + 14));
    if (s.l >= ref) mark(ctx, x, y - 104, false, pop(s.t(ref, ref + 12)) * a);
    if (i === 0) text(ctx, "remote model", x, y + 96, { size: 26, weight: 600, align: "center", color: C.nightMuted, alpha: s.t(k.t0 + 14, k.t0 + 26) * a });
  });
  lowerThird(ctx, s.l, 24, 228, "Mark a note secure and Rotli moves it to wiki/_secure/", "and keeps it away from remote models and web lookups.", true);
  lowerThird(ctx, s.l, 236, s.len, "Remote models never see secure content;", "on-device models can, unless you turn that off.", true);
} };

// ---------------------------------------------------------------- the app (two demos), pushed in so body text reads ≥ 26 px
const WIN = { x: 90, y: 64, w: 1160, h: 740 }, SIDE = 300, EX = WIN.x + SIDE + 64, PCX = 670, PCY = 430;
const NOTES = ["Trip ideas", "Passport", "Ferry booking"];
const zoom = (s: S) => 1.09 + 0.03 * easeInOut(s.t(0, s.len));
/** a world point on the pushed window, in screen space (for props outside the push) */
const onScreen = (s: S, x: number, y: number): P => { const k = zoom(s); return [PCX + (x - PCX) * k, PCY + (y - PCY) * k]; };
const R = () => T.roles;
/** the sidebar row marks: a lock on secure notes, a no-edit pencil on locked ones */
const rowMark = (ctx: Ctx, i: number, kind: "secure" | "locked", k = 1) => { if (k <= 0) return; const x = WIN.x + SIDE - 36, y = WIN.y + 192 + i * 46 - 8; ctx.save(); ctx.translate(x, y); ctx.scale(k, k); if (kind === "secure") lockIcon(ctx, 0, 0, 20, R().accent); else noEdit(ctx, 0, -2, 22, R().accent); ctx.restore(); };
/** the title-bar Lock toggle */
const LOCK_BTN = { x: WIN.x + WIN.w - 190, y: WIN.y + 14, w: 150, h: 48 };
const lockToggle = (ctx: Ctx, on: boolean) => {
  const b = LOCK_BTN; fillRR(ctx, b.x, b.y, b.w, b.h, 12, on ? R().accent : R().surface, on ? R().accent : R()["text-muted"], 2);
  noEdit(ctx, b.x + 32, b.y + 24, 22, on ? R()["on-accent"] : R()["text-muted"]); text(ctx, "Lock", b.x + 60, b.y + 34, { size: 26, weight: 600, color: on ? R()["on-accent"] : R().text });
};
/** the corner quokka, drawn in line (the line style's host) */
const lineHost = (ctx: Ctx, s: S, pose: PoseName) => lq(ctx, s, pose, 1790, 1062 + Math.sin(s.f / 7.3) * 3, 250);

// shapes: the key is pasted, and Rotli catches it on its own
const KEY = "sk-test-XXXXXXXXXXXX", PRE = "Booking key: ", PASTE = 88, CAUGHT = 112, SH = { cloud: 176, hit: 206, chip: 236 };
const shapes: Scene = { id: "shapes", len: 330, draw: (ctx, env, s) => {
  const caught = s.l >= CAUGHT, ck = pop(s.t(CAUGHT, CAUGHT + 12));
  ctx.save(); push(ctx, PCX, PCY, zoom(s));
  appFrame(ctx, T, WIN, { notes: NOTES, active: 2, side: SIDE });
  rowMark(ctx, 1, "secure"); rowMark(ctx, 2, "secure", ck);
  heading(ctx, T, EX, 222, "Ferry booking", 50);
  if (ck > 0) { ctx.save(); ctx.translate(EX + measure(ctx, "Ferry booking", 50, 600) + 40, 206); ctx.scale(ck, ck); lockIcon(ctx, 0, 0, 30, R().accent); ctx.restore(); }
  fade(ctx, ck, () => chip(ctx, EX, 250, "wiki/_secure/", { size: 26, mono: true, bg: R()["surface-2"], fg: R().text, border: R().border }));
  para(ctx, T, EX, 360, "Morning ferry, one seat"); para(ctx, T, EX, 416, "Two bikes on the deck");
  const y = 472, kx = EX + measure(ctx, PRE, 30) + 14, kw = measure(ctx, KEY, 30, 500, FONT.mono);
  if (s.l >= 40) para(ctx, T, EX, y, PRE);
  if (caught) { const e = easeOut(s.t(CAUGHT, CAUGHT + 8)); fillRR(ctx, kx - 8, y - 32, (kw + 16) * e, 44, 8, R().tint, R().accent, 2); }
  if (s.l >= PASTE) text(ctx, KEY, kx, y, { size: 30, font: FONT.mono, color: R().text });
  if (s.l >= 60 && s.l < CAUGHT && Math.floor(s.f / 8) % 2 === 0) { ctx.fillStyle = R().accent; ctx.fillRect((s.l >= PASTE ? kx + kw : kx) + 2, y - 26, 3, 32); }
  // the pointer places the caret at the end of the line, then rests out of the way
  const k1 = easeInOut(s.t(20, 56)), k2 = easeInOut(s.t(130, 160)); let px = lerp(1150, kx + 6, k1), py = lerp(700, y - 10, k1);
  px = lerp(px, 1080, k2); py = lerp(py, 690, k2); px += Math.sin(s.f / 19) * 6 * s.t(160, 190);
  pointer(ctx, px, py, press(s.l, [58]));
  ctx.restore();
  // ⌘V, pressed
  const kp = s.l >= PASTE - 8 && s.l < PASTE + 8 ? 1 - Math.abs(s.l - PASTE) / 8 : 0; fade(ctx, s.t(62, 72) * (1 - s.t(120, 132)), () => keys(ctx, 1440, 140, ["⌘", "V"], kp, 64));
  // the edge of the window, in screen space: a cloud tries it and bounces off; the chip may still read
  const [ex] = onScreen(s, WIN.x + WIN.w, 0), ey = 470;
  if (s.l >= SH.cloud) { const ref = SH.hit; let x: number, y2: number, a = 1;
    if (s.l < ref) { const e = easeIn(s.t(SH.cloud, ref)); x = lerp(2120, ex + 110, e); y2 = lerp(ey - 160, ey, e); }
    else { const e = easeOut(s.t(ref, ref + 30)); x = ex + 110 + 220 * e; y2 = ey + Math.sin((s.l - ref) / 7) * 8 + 40 * e; a = 1 - s.t(ref + 60, ref + 100); }
    burst(ctx, ex + 10, ey, s.t(ref, ref + 14)); fade(ctx, a, () => { cloud(ctx, x, y2, 0.9, { frame: s.f, seed: 64, face: s.l >= ref && s.l < ref + 50 ? "dizzy" : "curious" }); if (s.l >= ref) mark(ctx, x, y2 - 104, false, pop(s.t(ref, ref + 12))); }); }
  const cp = pop(s.t(SH.chip, SH.chip + 14)), rd = easeOut(s.t(SH.chip + 14, SH.chip + 28));
  if (cp > 0) { onDevice(ctx, 1560, 760 + Math.sin(s.f / 12) * 3, 0.7 * cp, -rd); text(ctx, "on-device model", 1560, 870, { size: 26, weight: 600, align: "center", color: C.oliveBright, alpha: s.t(SH.chip + 8, SH.chip + 20) }); }
  arrow(ctx, s.f, 1490, 720, ex + 16, 640, rd, 43); mark(ctx, 1620, 690, true, pop(s.t(SH.chip + 24, SH.chip + 36)), 18);
  lineHost(ctx, s, s.l >= CAUGHT && s.l < CAUGHT + 60 ? "attention" : "stays_local");
  lowerThird(ctx, s.l, CAUGHT - 6, s.len, "Rotli also recognizes common secret shapes", "(API keys, private keys, card and identity numbers) and treats them the same way.", true);
} };

// lock: Trip ideas (the token) is locked; every model reads it, none edits it
const LK = { click: 60, readChip: 96, readCloud: 124, edit1: [168, 198], edit2: [226, 256] } as const;
const lock: Scene = { id: "lock", len: 330, draw: (ctx, env, s) => {
  const on = s.l >= LK.click + 4, nk = pop(s.t(LK.click + 4, LK.click + 16));
  ctx.save(); push(ctx, PCX, PCY, zoom(s));
  appFrame(ctx, T, WIN, { notes: NOTES, active: 0, side: SIDE });
  rowMark(ctx, 1, "secure"); rowMark(ctx, 2, "secure"); rowMark(ctx, 0, "locked", nk);
  lockToggle(ctx, on);
  heading(ctx, T, EX, 222, "Trip ideas", 50);
  if (nk > 0) { ctx.save(); ctx.translate(EX + measure(ctx, "Trip ideas", 50, 600) + 44, 204); ctx.scale(nk, nk); noEdit(ctx, 0, 0, 30, R().accent); ctx.restore(); }
  task(ctx, T, EX, 320, "x", "book the ferry"); task(ctx, T, EX, 384, "/", "find the pink lake"); task(ctx, T, EX, 448, " ", "pack a snorkel");
  para(ctx, T, EX, 540, "Sunset at the lighthouse", { muted: true });
  // the pointer clicks Lock, then drifts off the page
  const k1 = easeInOut(s.t(14, 52)), k2 = easeInOut(s.t(80, 110)), bx = LOCK_BTN.x + 90, by = LOCK_BTN.y + 30;
  let px = lerp(980, bx, k1), py = lerp(640, by, k1); px = lerp(px, 1000, k2); py = lerp(py, 660, k2); px += Math.sin(s.f / 17) * 8 * s.t(110, 140);
  pointer(ctx, px, py, press(s.l, [LK.click]));
  ctx.restore();
  // every model can still read it: the chip and a remote cloud, each with a tick
  const [ex] = onScreen(s, WIN.x + WIN.w, 0);
  const CH = { x: 1600, y: 300 }, CL = { x: 1620, y: 620 };
  const cp = pop(s.t(LK.readChip - 16, LK.readChip - 4)), cl = easeOut(s.t(LK.readCloud - 30, LK.readCloud - 6));
  const bump = (e: readonly number[]) => (s.l >= e[1] && s.l < e[1] + 10 ? Math.sin(((s.l - e[1]) / 10) * Math.PI) : 0);
  if (cp > 0) { onDevice(ctx, CH.x + bump(LK.edit1) * 8, CH.y + Math.sin(s.f / 12) * 3, 0.75 * cp, -easeOut(s.t(LK.readChip, LK.readChip + 12))); text(ctx, "on-device model", CH.x, CH.y + 110, { size: 26, weight: 600, align: "center", color: C.oliveBright, alpha: s.t(LK.readChip - 8, LK.readChip + 4) }); }
  if (cl > 0) { const cx = lerp(2140, CL.x, cl), cy = CL.y + Math.sin(s.f / 14) * 6; cloud(ctx, cx, cy, 0.9, { frame: s.f, seed: 66, face: s.l >= LK.edit2[1] && s.l < LK.edit2[1] + 40 ? "dizzy" : "curious" }); text(ctx, "remote model", cx, cy + 96, { size: 26, weight: 600, align: "center", color: C.nightMuted, alpha: s.t(LK.readCloud - 10, LK.readCloud + 2) }); }
  arrow(ctx, s.f, CH.x - 70, CH.y - 10, ex + 16, 250, easeOut(s.t(LK.readChip, LK.readChip + 14)), 44);
  arrow(ctx, s.f, CL.x - 100, CL.y - 10, ex + 16, 470, easeOut(s.t(LK.readCloud, LK.readCloud + 14)), 45);
  mark(ctx, CH.x + 66, CH.y - 70, true, pop(s.t(LK.readChip + 12, LK.readChip + 24)), 18); mark(ctx, CL.x + 80, CL.y - 80, true, pop(s.t(LK.readCloud + 12, LK.readCloud + 24)), 18);
  // none can edit it: a pencil leaves each model, hits the locked page and is bounced back
  const edit = (e: readonly number[], fromX: number, fromY: number, toY: number, seedMark: number) => {
    if (s.l < e[0]) return; const back = easeOut(s.t(e[1], e[1] + 16)), gone = s.t(e[1] + 50, e[1] + 64);
    const x = s.l < e[1] ? lerp(fromX, ex + 14, easeIn(s.t(e[0], e[1]))) : ex + 14 + 70 * back, y = (s.l < e[1] ? lerp(fromY, toY, easeInOut(s.t(e[0], e[1]))) : toY) + Math.sin(s.l / 5) * 3 * back;
    fade(ctx, 1 - gone, () => { pencil(ctx, x, y, s.f); if (s.l >= e[1]) mark(ctx, x + 50, y + 46, false, pop(s.t(e[1], e[1] + 12))); });
    burst(ctx, ex + 8, toY, s.t(e[1], e[1] + 14)); void seedMark;
  };
  edit(LK.edit1, CH.x - 110, CH.y + 30, 380, 1); edit(LK.edit2, CL.x - 130, CL.y + 40, 770, 2);
  lineHost(ctx, s, s.l >= LK.edit2[1] + 20 ? "celebrating" : s.l >= LK.edit1[1] ? "attention" : "stays_local");
  lowerThird(ctx, s.l, 24, s.len, "Want AI to stop touching a note? Lock it.", "Every model can still read it; none can edit it.", true);
} };

// payoff: back outside in the rain; inside, warm, the quokka rests with its notes
const payoff: Scene = { id: "payoff", len: 240, draw: (ctx, env, s) => {
  windowShot(ctx, s, () => {
    lq(ctx, s, poseOf(s.l, [[0, "stays_local"], [70, "rest"]]), 800, 1000, 480);
    card(ctx, { x: 1160, y: 560 + Math.sin(s.f / 19) * 5, rot: 0.06, scale: 1.3, title: "Passport", lines: 2, lock: true, seed: 71, frame: s.f, dark: true });
    card(ctx, { x: 1230, y: 740 + Math.sin(s.f / 23 + 1) * 5, rot: -0.05, scale: 1.3, title: "Trip ideas", token: true, lines: 2, seed: 31, frame: s.f, dark: true });
  });
  // a cloud drifts by outside, curious, and goes on its way
  const cx = lerp(2140, 1650, easeOut(s.t(20, 90))) + 420 * easeIn(s.t(150, 240)), cy = 560 + Math.sin(s.f / 14) * 8 - 60 * s.t(150, 240);
  cloud(ctx, cx, cy, 0.8, { frame: s.f, seed: 68 });
  intertitle(ctx, s, ["Warm inside.", "The weather stays outside."], { y: 100, size: 56, hi: "Warm", t0: 10 });
  thought(ctx, s, 840, 620, "heart", s.t(120, 140), { scale: 0.9 });
} };
const end: Scene = { id: "end", len: 120, draw: (ctx, env, s) => storyEnd(ctx, env, s, { next: "Other Shores", pose: "waving", line: true }) };

const SCENES = [cold, chapter, secure, shapes, lock, payoff, end];
const SE = sceneStart(SCENES, "secure"), SP = sceneStart(SCENES, "shapes"), LO = sceneStart(SCENES, "lock"), PA = sceneStart(SCENES, "payoff");
export const s01e08LockedBox: Film = story({ id: "s01e08LockedBox", no: 8, title: "The locked box.", atmosphere: "midnight-rain", scenes: SCENES,
  score: { key: 2, melody: 0,
    pops: [[SE + SECURE_AT, 84], [SE + CHIP_AT, 81], [SE + READ_AT + 10, 88],
      ...KNOCK.flatMap((k) => [0, 8, 16].map((d) => [SE + k.hit + d, 72] as [number, number])), ...KNOCK.map((k) => [SE + refuseAt(k), 79] as [number, number]),
      [SP + PASTE, 84], [SP + CAUGHT, 88], [SP + SH.hit, 79], [SP + SH.chip + 24, 86],
      [LO + LK.click, 84], [LO + LK.readChip + 12, 86], [LO + LK.readCloud + 12, 88], [LO + LK.edit1[1], 79], [LO + LK.edit2[1], 79], [PA + 120, 91]] } });

const CROP = { cold: { x: 420, y: 280, w: 1080, h: 640 }, secure: { x: 240, y: 150, w: 1400, h: 800 }, shapes: { x: 380, y: 125, w: 1320, h: 750 }, lock: { x: 380, y: 30, w: 1440, h: 820 } };
export const s01e08Derive: DeriveSpec = {
  no: 8, series: "season-one", line: true, label: "Rotli · Season One · 08",
  vertical: [
    { frame: 30, len: 180, crop: CROP.cold, title: "Rain at night.", sub: "Some things stay in the house.", hi: "night" },
    { frame: SE + 30, len: 240, crop: CROP.secure, title: "Mark a note secure.", sub: "Remote models never see secure content.", hi: "secure" },
    { frame: SP + 60, len: 210, crop: CROP.shapes, title: "Common secret shapes.", sub: "API keys, private keys, card and identity numbers.", hi: "secret" },
    { frame: LO + 40, len: 240, crop: CROP.lock, title: "Lock it.", sub: "Every model can still read it; none can edit it.", hi: "Lock" },
  ],
  slides: [
    { frame: 215, crop: CROP.cold, title: "Rain at night.", sub: "Some things stay in the house.", hi: "night" },
    { frame: SE + 262, crop: CROP.secure, title: "Mark a note secure.", sub: "Remote models never see secure content.", hi: "secure" },
    { frame: SP + 320, crop: CROP.shapes, title: "Common secret shapes.", sub: "API keys, private keys, card and identity numbers.", hi: "secret" },
    { frame: LO + 300, crop: CROP.lock, title: "Lock it.", sub: "Every model can still read it; none can edit it.", hi: "Lock" },
  ],
  single: { frame: SE + 262, crop: CROP.secure, title: "The locked box.", sub: "Remote models never see secure content.", hi: "locked" },
};
