// EPISODE 05 · LIBRARIAN — "A Librarian that files, never rewrites." (30 s, 1920x1080, dark)
// Story: the Librarian is switched on and you keep writing in Main; the new note gets tags, a
// summary, links and a place in the Library, all AROUND the words; the words stay exactly as
// written; switched off, the folder is still a complete workspace.
// Turn: frame 650, the toggle goes off and nothing breaks. Token: Local-first reading list.
import type { Ctx, Env } from "./core";
import type { Film } from "./film";
import { actor, hopAlong, poseAt } from "./rotli/actor";
import { C, card, easeInOut, fillRR, ink, lerp, measure, pop, seg, sparkle, text, typed } from "./rotli/kit";
import type { DeriveSpec } from "./studio/derive";
import { makeScore } from "./studio/score2";
import { drift, endCard, ground, lowerThird, titleCard, END, TITLE } from "./studio/series";
import { FONTS } from "./studio/stage";
import { DARK as T, appFrame, caret, heading, pointer, tagChip } from "./studio/ui";
import { useFamilyUI } from "./studio/ui";

// this episode speaks the GROVE theme family: grounds, UI, captions, accents and the quokka
useFamilyUI("grove");

const TOTAL = 900, DEMO_END = TOTAL - END, R = T.roles;
const WIN = { x: 70, y: 90, w: 1400, h: 760 }, SIDE = 350, EX = WIN.x + SIDE + 64;
// cue table (frames)
const Q = {
  on: 110, hop: [112, 140], h1: [150, 176], b1: [182, 216], b2: [222, 246], b3: [252, 274], b4: [280, 294],
  tags: 340, sum: 366, links: 392, fly: [412, 438], place: 440, outline: 500, same: 522, off: 650, b5: [675, 715],
};
const BODY = ["Software that keeps working when the wifi doesn't.", "Local-first software, the essay", "Ask Maya what she is reading", "Files over apps"];
const BODY_Y = [400, 452, 504, 556], OUT_R = 1300, LINE5 = "Read them on the ferry", LINE5_Y = 608;
// camera keyframes [frame, scale, origin x, origin y]: wide, pushed in while typing, wide to file, in for the proof, wide to switch off
const WIDE = [1.08, 50, 60], TYPE = [1.3, 430, 100], PROOF = [1.36, 400, 150];
const CAM: [number, number[]][] = [[90, WIDE], [130, WIDE], [156, TYPE], [300, TYPE], [326, WIDE], [470, WIDE], [496, PROOF], [600, PROOF], [626, WIDE]];
const camAt = (l: number) => {
  let v = CAM[CAM.length - 1][1];
  for (let i = 1; i < CAM.length; i++) if (l < CAM[i][0]) { const [f0, a] = CAM[i - 1], [f1, b] = CAM[i], k = easeInOut((l - f0) / (f1 - f0)); v = a.map((x, j) => x + (b[j] - x) * k); break; }
  if (l < CAM[0][0]) v = CAM[0][1];
  return v;
};
const camera = (ctx: Ctx, env: Env, l: number) => {
  const [s, ox, oy] = camAt(l);
  ctx.setTransform(env.scale * s, 0, 0, env.scale * s, -env.scale * ox * s, -env.scale * oy * s); drift(ctx, env, l);
};
const ptr: [number, number, number][] = [[92, 1260, 760], [106, 1450, 136], [124, 1450, 136], [146, 1300, 780], [612, 1300, 780], [640, 1450, 136], [664, 1450, 136], [690, 1150, 660]];
const ptrAt = (l: number) => { if (l <= ptr[0][0]) return { x: ptr[0][1], y: ptr[0][2] }; for (let i = 1; i < ptr.length; i++) if (l < ptr[i][0]) { const [f0, x0, y0] = ptr[i - 1], [f1, x1, y1] = ptr[i], k = easeInOut((l - f0) / (f1 - f0)); return { x: x0 + (x1 - x0) * k, y: y0 + (y1 - y0) * k }; } const z = ptr[ptr.length - 1]; return { x: z[1], y: z[2] }; };
const press = (l: number, at: number) => (l >= at && l < at + 12 ? (l - at) / 12 : 0);

/** the Librarian switch in the window's title bar; `on` 0..1 slides the knob */
const toggle = (ctx: Ctx, on: number) => {
  const x = 1412, y = 114, w = 76, h = 40;
  text(ctx, "Librarian", x - 16, y + 30, { size: 26, weight: 600, align: "right", color: R.text });
  fillRR(ctx, x, y, w, h, h / 2, on > 0.5 ? R.accent : R["surface-2"], on > 0.5 ? R.accent : R["text-muted"], 2);
  ctx.fillStyle = on > 0.5 ? R["on-accent"] : R["text-muted"]; ctx.beginPath(); ctx.arc(x + 20 + (w - 40) * on, y + h / 2, 13, 0, 6.29); ctx.fill();
};
/** Library in the sidebar: the areas, and the note once it is filed */
const library = (ctx: Ctx, l: number) => {
  const x = WIN.x, y0 = WIN.y + 400;
  text(ctx, "Library", x + 34, y0, { size: 25, weight: 600, color: R.text });
  const flash = l >= Q.place && l < Q.place + 30;
  ["People", "Projects", "Research"].forEach((n, i) => { const y = y0 + 46 + i * 44; if (i === 2 && flash) fillRR(ctx, x + 18, y - 30, SIDE - 36, 42, 10, R.tint); text(ctx, n, x + 52, y, { size: 24, color: i === 2 && l >= Q.place ? R.text : R["text-muted"], weight: i === 2 && l >= Q.place ? 600 : 500 }); });
  if (l >= Q.place) text(ctx, "Local-first reading list", x + 70, y0 + 46 + 3 * 44, { size: 24, color: R.text, alpha: seg(l, Q.place, Q.place + 8) });
};
const bullet = (ctx: Ctx, x: number, y: number, s: string) => { ctx.fillStyle = R["text-muted"]; ctx.beginPath(); ctx.arc(x + 10, y - 10, 5, 0, 6.29); ctx.fill(); text(ctx, s, x + 34, y, { size: 30, color: R.text }); return x + 34 + measure(ctx, s, 30); };
/** a filing that pops in around the note */
const popIn = (ctx: Ctx, l: number, at: number, x: number, y: number, draw: () => void) => { const p = pop(seg(l, at, at + 14)); if (p <= 0) return; ctx.save(); ctx.translate(x, y); ctx.scale(p, p); ctx.translate(-x, -y); draw(); ctx.restore(); };

const demo = (ctx: Ctx, l: number, env: Env) => {
  ground(ctx, l, true);
  camera(ctx, env, l);
  appFrame(ctx, T, WIN, { notes: ["Call with Maya", "Trip plan", "Local-first reading list"], active: 2, side: SIDE, title: "local-first-reading-list.md" });
  library(ctx, l);
  const on = l < Q.off ? seg(l, Q.on + 2, Q.on + 10) : 1 - seg(l, Q.off + 2, Q.off + 10);
  toggle(ctx, on);
  // the note, typed in Main
  let cur: [number, number] | null = null;
  if (l >= Q.h1[0]) { const s = typed("Local-first reading list", seg(l, Q.h1[0], Q.h1[1])); heading(ctx, T, EX, 290, s, 54); if (l < Q.b1[0]) cur = [EX + measure(ctx, s, 54, 600), 290]; }
  [Q.b1, Q.b2, Q.b3, Q.b4].forEach(([t0, t1], i) => { if (l < t0) return; const s = typed(BODY[i], seg(l, t0, t1)), y = BODY_Y[i]; const e = i === 0 ? (text(ctx, s, EX, y, { size: 30, color: R.text }), EX + measure(ctx, s, 30)) : bullet(ctx, EX, y, s); if (l < t1 + 6 && (i === 3 || l < [Q.b2, Q.b3, Q.b4][i][0])) cur = [e, y]; });
  if (l >= Q.b5[0]) { const s = typed(LINE5, seg(l, Q.b5[0], Q.b5[1])), e = bullet(ctx, EX, LINE5_Y, s); cur = [e, LINE5_Y]; }
  if (cur) caret(ctx, T, cur[0], cur[1], l, 34);
  // what the Librarian adds, around the words: tags above, a summary under the title, links and a place below
  popIn(ctx, l, Q.tags, EX, 212, () => { let x = EX; for (const t of ["#reading", "#local-first", "#software"]) x += tagChip(ctx, T, x, 222, t, 26) + 12; });
  popIn(ctx, l, Q.sum, EX, 340, () => text(ctx, "Summary  ·  Reading on local-first software, with Maya's picks.", EX, 344, { size: 27, color: R["text-muted"] }));
  const LY = 690;
  popIn(ctx, l, Q.links, EX, LY, () => { text(ctx, "Linked to", EX, LY, { size: 27, color: R["text-muted"] }); let x = EX + measure(ctx, "Linked to", 27) + 18; for (const n of ["Call with Maya", "Trip plan"]) { text(ctx, n, x, LY, { size: 27, weight: 600, color: R["accent-text"] }); const w = measure(ctx, n, 27, 600); ctx.fillStyle = R.accent; ctx.fillRect(x, LY + 7, w, 3); x += w + 28; } });
  popIn(ctx, l, Q.place, EX, 752, () => { const s = "Library  ›  Research", w = measure(ctx, s, 26, 600) + 36; fillRR(ctx, EX, 716, w, 48, 24, R["surface-2"], R.border, 2); text(ctx, s, EX + 18, 749, { size: 26, weight: 600, color: R.text }); });
  // the note's card flies to its shelf in the Library
  if (l >= Q.fly[0] && l < Q.fly[1] + 2) { const k = easeInOut(seg(l, Q.fly[0], Q.fly[1])); card(ctx, { x: lerp(1120, 250, k), y: lerp(290, 626, k) - Math.sin(k * Math.PI) * 160, rot: lerp(0.08, 0, k), scale: lerp(0.9, 0.45, k), title: "Local-first reading list", lines: 2, seed: 51, frame: l, dark: true, token: true }); }
  if (l >= Q.place && l < Q.place + 14) sparkle(ctx, 400, 650, 18 * (1 - (l - Q.place) / 14), C.clay, l / 5);
  if (l >= Q.tags && l < Q.tags + 14) sparkle(ctx, EX + 520, 196, 16 * (1 - (l - Q.tags) / 14), C.clay, l / 5);
  // the proof: the words, untouched
  const ok = seg(l, Q.outline, Q.outline + 18) * (1 - seg(l, 612, 624));
  if (ok > 0) { ctx.save(); ctx.globalAlpha *= ok; ctx.setLineDash([12, 9]); ctx.lineDashOffset = -l * 0.5; ctx.beginPath(); ctx.roundRect(EX - 24, 356, OUT_R - EX + 24, 222, 18); ctx.strokeStyle = R.success; ctx.lineWidth = 3; ctx.stroke(); ctx.restore(); }
  const sk = pop(seg(l, Q.same, Q.same + 14)) * (1 - seg(l, 612, 624));
  if (sk > 0) { ctx.save(); const w = measure(ctx, "words unchanged", 26, 600) + 84; ctx.translate(OUT_R - w / 2, 624); ctx.scale(sk, sk); ctx.translate(-w / 2, 0); fillRR(ctx, 0, -28, w, 56, 28, R["surface-2"], R.success, 2); ctx.fillStyle = R.success; ctx.beginPath(); ctx.arc(30, 0, 15, 0, 6.29); ctx.fill(); ink(ctx, [[23, 0], [28, 6], [37, -6]], { w: 4, color: R.surface, wob: 0, boil: 0 }); text(ctx, "words unchanged", 56, 9, { size: 26, weight: 600, color: R.text }); ctx.restore(); }
  // the Librarian herself: hops in when switched on, files, rests when switched off
  if (l >= Q.hop[0]) {
    const h = hopAlong(l, [[Q.hop[0], 2080, 900], [Q.hop[1], 1660, 900]], 120), p = poseAt(l, [[0, "walking"], [Q.hop[1], "knowledge_system"], [306, "searching"], [Q.place + 4, "knowledge_system"], [Q.same, "celebrating"], [566, "knowledge_system"], [Q.off + 8, "rest"]]);
    actor(ctx, env, l, { pose: p.pose, x: h.x, y: h.y, h: 360, lift: h.lift, squash: h.squash * p.squash, flip: l < Q.hop[1], shadowCol: "#000", lean: h.moving ? 0 : Math.sin(l / 9) * 1.6 });
  }
  if ((l >= 92 && l < 146) || (l >= 612 && l < 690)) { const pp = ptrAt(l); pointer(ctx, pp.x, pp.y, press(l, Q.on) || press(l, Q.off)); }
  ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
  lowerThird(ctx, l, 100, 296, "Turn the Librarian on.", "Keep working in Main.", true);
  lowerThird(ctx, l, 304, 466, "New notes get tags, summaries, links,", "and a place in your Library.", true);
  lowerThird(ctx, l, 474, 606, "It organizes around your writing.", "Every note keeps its words exactly as you wrote them.", true);
  lowerThird(ctx, l, 614, DEMO_END, "Turn it off.", "The folder is still a complete workspace.", true);
};

/** the title card under the series drift, so its hold still moves */
const title = (ctx: Ctx, l: number, env: Env) => {
  ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); drift(ctx, env, l, 0.6);
  titleCard(ctx, env, l, l, { no: 5, title: ["A Librarian that files,", "never rewrites."], pose: "knowledge_system", dark: true });
};

export const ep05Librarian: Film = {
  meta: { title: "ep05Librarian", W: 1920, H: 1080, fps: 30, bpm: 120, durationFrames: TOTAL, raster: "cpu" },
  assets: { images: {}, fonts: FONTS },
  shots: [
    { id: "title", start: 0, end: TITLE, draw: (c, l, e) => title(c, l, e) },
    { id: "demo", start: TITLE, end: DEMO_END, draw: (c, l, e) => { c.setTransform(e.scale, 0, 0, e.scale, 0, 0); demo(c, l + TITLE, e); } },
    { id: "end", start: DEMO_END, end: TOTAL, draw: (c, l, e) => { c.setTransform(e.scale, 0, 0, e.scale, 0, 0); endCard(c, e, DEMO_END + l, l, { pose: "knowledge_system" }); } },
  ],
  audio: makeScore({ frames: TOTAL, energeticFrom: 120, endAt: 780, bellAt: [DEMO_END], pops: [[Q.on, 84], [Q.hop[1], 81], [Q.tags, 86], [Q.sum, 88], [Q.links, 91], [Q.place, 93], [Q.outline, 88], [Q.same, 96], [Q.off, 84], [Q.b5[1], 88]], clicks: [Q.h1, Q.b1, Q.b2, Q.b3, Q.b4, Q.b5].flatMap(([a, b]) => Array.from({ length: Math.floor((b - a) / 3) }, (_, i) => a + i * 3)) }),
};

export const ep05Derive: DeriveSpec = {
  no: 5, series: "librarian",
  vertical: [
    { frame: 160, len: 135, crop: { x: 0, y: 0, w: 1420, h: 850 }, title: "Keep working in Main.", sub: "Turn the Librarian on.", hi: "Main" },
    { frame: 330, len: 135, crop: { x: 0, y: 0, w: 1576, h: 876 }, title: "Tags, summaries, links.", sub: "And a place in your Library.", hi: "links" },
    { frame: 500, len: 105, crop: { x: 60, y: 20, w: 1300, h: 830 }, title: "Never rewrites.", sub: "Every note keeps its words.", hi: "rewrites" },
    { frame: 630, len: 135, crop: { x: 420, y: 20, w: 1490, h: 840 }, title: "Turn it off.", sub: "The folder is still a complete workspace.", hi: "off" },
  ],
  slides: [
    { frame: 298, crop: { x: 0, y: 0, w: 1420, h: 850 }, title: "Keep working in Main.", sub: "Turn the Librarian on.", hi: "Main" },
    { frame: 466, crop: { x: 0, y: 0, w: 1576, h: 876 }, title: "Tags, summaries, links.", sub: "And a place in your Library.", hi: "links" },
    { frame: 600, crop: { x: 60, y: 20, w: 1300, h: 830 }, title: "Never rewrites.", sub: "Every note keeps its words.", hi: "rewrites" },
    { frame: 765, crop: { x: 420, y: 20, w: 1490, h: 840 }, title: "Turn it off.", sub: "The folder is still a complete workspace.", hi: "off" },
  ],
  single: { frame: 466, crop: { x: 0, y: 0, w: 1576, h: 876 }, title: "A Librarian that files,", sub: "never rewrites.", hi: "files" },
};
