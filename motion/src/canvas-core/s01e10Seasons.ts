// SEASON ONE · 10 — SEASONS. (60 s). Brief: series/season-one/episodes/s01e10.json
// Setup: The island turns through its seasons: each of Rotli's six theme families, light and dark.
// Turn: The quokka tries on colours, glasses, a hat (or turns the companion off); a new friend opens the Welcome folder's nine lessons and the guided tour.
// Payoff: At sunset the quokka and the Librarian look out over the island: everything kept.
//
// The montage is six scenes (one per family, each its own atmosphere, wiping diagonally like a turning
// season). The same Trip ideas note sits in every one, in the family's light AND dark theme, and its tasks
// get done as the year goes by: everything changes colour, nothing gets lost.
//
// Cue table (global frames): cold 0 · chapter 180 · seasons 300 (rotli 300, paper 390, ocean 465, grove 540,
// iris 615, midnight 690) · looks 780 (colours 840–948, glasses 970, hat 988, pose 1026–1044, off 1072) ·
// welcome 1140 (folder 1190, lesson 1260, settings 1322, tour 1360–1420) · finale 1440 · end 1680.
import type { Ctx } from "./core";
import type { Film } from "./film";
import { rng } from "./core";
import { hopAlong, poseAt } from "./rotli/actor";
import { card, sparkle } from "./rotli/kit";
import type { PoseName } from "./quokka/poses";
import type { DeriveSpec } from "./studio/derive";
import { drawLook } from "./studio/look";
import { lowerThird } from "./studio/series";
import { FAMILY_QUOKKA, STYLE_HEX, STYLE_NAME, type Theme } from "./studio/stage";
import { C, DARK, LIBRARIAN_LOOKS, LIGHT, actor, backOut, chapterCard, easeInOut, easeOut, fillRR, intertitle, librarian, measure, pop, sceneStart, seg, story, storyEnd, text, thought, type Glyph, type Scene } from "./studio/story";
import { heading, link, para, pointer, results, tagChip, task, useFamilyUI } from "./studio/ui";

type Pt = [number, number];
/** a drawing faded out between two local frames */
const fading = (ctx: Ctx, a: number, draw: () => void) => { if (a <= 0) return; ctx.save(); ctx.globalAlpha *= a; draw(); ctx.restore(); };
/** the pointer along a path of [local frame, x, y, click?]: it glides into each stop and presses on the clicks */
const pointerPath = (ctx: Ctx, l: number, path: [number, number, number, boolean?][]) => {
  if (l < path[0][0] - 14) return;
  let x = path[0][1], y = path[0][2], press = 0;
  for (let i = 0; i < path.length; i++) { const [t, px, py, click] = path[i], prev = path[i - 1];
    if (prev && l >= t - 14 && l < t) { const k = easeInOut(seg(l, t - 14, t)); x = prev[1] + (px - prev[1]) * k; y = prev[2] + (py - prev[2]) * k; }
    if (l >= t) { x = px; y = py; if (click && l < t + 10) press = seg(l, t, t + 10); } }
  pointer(ctx, x, y, press);
};

// ---------------------------------------------------------------- cold: the sun goes down on a year
const cold: Scene = { id: "cold", len: 180, draw: (ctx, env, s) => {
  // the quokka hops along the sand with the Trip ideas note, sets it down, sits and watches the sun
  const h = hopAlong(s.l, [[10, 2080, 985], [34, 1760, 985], [58, 1480, 985], [82, 1230, 985]], 80);
  const put = easeInOut(s.t(92, 112)), carry: Pt = [h.x + 40, h.y - h.lift - 250 + Math.sin(s.f / 9) * 3];
  card(ctx, { x: carry[0] + (1010 - carry[0]) * put, y: carry[1] + (985 - 40 - carry[1]) * put - Math.sin(put * Math.PI) * 50, rot: -0.2 + put * 0.1, scale: 0.9, title: "Trip ideas", token: true, lines: 2, seed: 41, frame: s.f });
  const p = poseAt(s.l, [[0, "walking"], [84, "attention"], [96, "notes"], [118, "thoughtful"]]);
  actor(ctx, env, s.f, { pose: h.moving ? "walking" : p.pose, x: h.x, y: h.y, h: 330, lift: h.lift, squash: h.squash * p.squash, flip: true, lean: s.l > 118 ? Math.sin(s.f / 12) * 2 : 0 });
  fading(ctx, 1 - s.t(100, 114), () => intertitle(ctx, s, ["One year on the island."], { y: 190, size: 76, t0: 14 }));
  thought(ctx, s, h.x - 20, h.y - 300, "sun", s.t(122, 140), { side: -1 });
} };

const chapter: Scene = { id: "chapter", len: 120, atm: "linen-morning", draw: (ctx, env, s) => chapterCard(ctx, env, s, { no: 10, title: ["Seasons."], pose: "celebrating" }) };

// ---------------------------------------------------------------- seasons: six families, light and dark, one note
const TASKS = ["book the ferry", "pack a snorkel", "find the pink lake"];
type St = " " | "/" | "x";
const PROGRESS: St[][] = [[" ", " ", " "], ["x", " ", " "], ["x", "/", " "], ["x", "x", " "], ["x", "x", "/"], ["x", "x", "x"]];
/** the Trip ideas note in one theme: a window drawn from its roles, UI text 26 px and up */
const tripWindow = (ctx: Ctx, th: Theme, x: number, y: number, w: number, h: number, states: St[], tick: number[]) => {
  const R = th.roles, dark = th.mode === "dark";
  fillRR(ctx, x + 10, y + 16, w, h, 26, dark ? "rgba(0,0,0,0.35)" : "rgba(58,48,40,0.12)"); fillRR(ctx, x, y, w, h, 26, R.surface, dark ? R.border : "#2b231d", 4);
  ["#e8836f", "#e8c46f", "#9cc27e"].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x + 32 + i * 28, y + 34, 9, 0, 6.29); ctx.fill(); });
  text(ctx, th.label, x + w / 2, y + 44, { size: 26, weight: 600, align: "center", color: R["text-muted"] }); ctx.fillStyle = R.border; ctx.fillRect(x + 2, y + 70, w - 4, 2);
  heading(ctx, th, x + 52, y + 150, "Trip ideas", 54);
  states.forEach((st, i) => task(ctx, th, x + 52, y + 230 + i * 62, st, TASKS[i], { tick: tick[i], size: 30 }));
  link(ctx, th, x + 52, y + 440, "see ", "Rottnest", 1, 30); tagChip(ctx, th, x + 52, y + 516, "#travel", 26);
};
const SEASON: { id: string; atm: string; len: number; pose: PoseName; glyph?: Glyph }[] = [
  { id: "seasons", atm: "linen-morning", len: 90, pose: "waving", glyph: "palette" }, { id: "paper", atm: "paper-studio", len: 75, pose: "notes" },
  { id: "ocean", atm: "ocean-tide", len: 75, pose: "searching" }, { id: "grove", atm: "grove-burrow", len: 75, pose: "listening" },
  { id: "iris", atm: "iris-dusk", len: 75, pose: "thoughtful" }, { id: "midnight", atm: "midnight-rain", len: 90, pose: "stays_local", glyph: "heart" },
];
const SOFF = SEASON.map((_, i) => SEASON.slice(0, i).reduce((a, b) => a + b.len, 0)), MONTAGE = SEASON.reduce((a, b) => a + b.len, 0);
const WX = [96, 850], WY = 250, WW = 700, WH = 560;
// (derivatives no longer inherit a visited family: reframe() restores the host's colours, studio/ui saveLook)
const visiting = (sc: Scene): Scene => sc;
const seasonScene = (i: number): Scene => visiting({ id: SEASON[i].id, len: SEASON[i].len, atm: SEASON[i].atm, transition: i ? "wipe" : "dip", draw: (ctx, env, s) => {
  const sp = SEASON[i], col = s.dark ? C.nightText : C.cocoa, enter = i ? 1 : easeOut(s.t(0, 18));
  // the family's name, and where we are among the six
  text(ctx, LIGHT.family, 100, 168, { size: 72, weight: 600, color: col, spacing: 72 * -0.04, alpha: enter });
  for (let k = 0; k < SEASON.length; k++) { ctx.fillStyle = k === i ? (s.dark ? C.oliveBright : C.clay) : s.dark ? C.nightBorder : C.border; ctx.beginPath(); ctx.arc(112 + k * 34, 212, k === i ? 10 : 7, 0, 6.29); ctx.fill(); }
  // the same note in the light and the dark theme; the year's tasks get done as the seasons turn
  const tick = PROGRESS[i].map((st, k) => (st === "x" && (i === 0 || PROGRESS[i - 1][k] !== "x") ? s.t(26, 42) : 1));
  [LIGHT, DARK].forEach((th, k) => { const a = i ? 1 : easeOut(s.t(6 + k * 8, 24 + k * 8)); if (a <= 0) return; ctx.save(); ctx.globalAlpha = a;
    tripWindow(ctx, th, WX[k], WY + (1 - a) * 40 + Math.sin(s.f / 14 + k * 1.7) * 6, WW, WH, PROGRESS[i], tick); ctx.restore(); });
  // the quokka (in the family's colour) hops in for the first season, then hops once every season
  const h = i ? { x: 1745, y: 1010, lift: Math.sin(s.t(8, 26) * Math.PI) * 46, squash: 1, moving: false } : hopAlong(s.l, [[0, 2090, 1010], [18, 1910, 1010], [36, 1745, 1010]], 80);
  actor(ctx, env, s.f, { pose: h.moving ? "walking" : sp.pose, x: h.x, y: h.y, h: 330, lift: h.lift, squash: h.squash, flip: true, lean: Math.sin(s.f / 11) * 2, shadowCol: s.dark ? "#000" : undefined });
  if (sp.glyph) thought(ctx, s, 1720, 710, sp.glyph, s.t(i ? 22 : 44, i ? 38 : 60), { side: -1, scale: 0.9 });
  lowerThird(ctx, SOFF[i] + s.l, 16, MONTAGE, "Six theme families,", "each with a tuned light and dark environment.", s.dark);
} });
const SEASONS = SEASON.map((_, i) => seasonScene(i));

// ---------------------------------------------------------------- looks: the quokka tries things on
const STY = ["line", "cocoa", "green", "ocean", "iris", "berry", "amber"], POSE_CHIPS = ["base", "waving", "celebrating"], ACC_CHIPS = ["none", "glasses", "bucket hat"];
type LookEv = { t: number; row: "colour" | "pose" | "acc" | "off"; v: number; id: string };
const LOOK_EV: LookEv[] = [
  ...(["green", "ocean", "iris", "berry", "amber", "line", "cocoa"] as const).map((c, k) => ({ t: 60 + k * 18, row: "colour" as const, v: STY.indexOf(c), id: `base-${c}` })),
  { t: 190, row: "acc", v: 1, id: "base-cocoa-glasses" }, { t: 208, row: "acc", v: 2, id: "base-cocoa-hat" }, { t: 226, row: "acc", v: 0, id: "base-cocoa" },
  { t: 246, row: "pose", v: 1, id: "waving-cocoa" }, { t: 264, row: "pose", v: 2, id: "celebrating-cocoa" }, { t: 292, row: "off", v: 0, id: "" },
];
const LOOK_IDS = [...new Set(LOOK_EV.map((e) => e.id).filter(Boolean)), "base-cocoa"];
const PX = 110, PY = 120, PW = 820, PH = 720; // the Companion settings panel
const chipRow = (ctx: Ctx, labels: string[], x: number, y: number) => { let cx = x; return labels.map((l) => { const w = measure(ctx, l, 28, 600) + 48, r = { x: cx, y, w, h: 56 }; cx += w + 16; return r; }); };
const looks: Scene = visiting({ id: "looks", len: 360, atm: "paper-studio", draw: (ctx, env, s) => {
  const past = LOOK_EV.filter((e) => s.l >= e.t), last = past[past.length - 1], since = last ? s.l - last.t : s.l;
  const st = { colour: 1, pose: 0, acc: 0, on: true, id: "base-cocoa" };
  for (const e of past) { if (e.row === "off") { st.on = false; continue; } st.id = e.id; if (e.row === "colour") st.colour = e.v; if (e.row === "pose") st.pose = e.v; if (e.row === "acc") st.acc = e.v; }
  // the panel: colour, mood and pose, accessory, and the companion switch; the current choice is a tinted pill
  const pin = easeOut(s.t(0, 16)); ctx.save(); ctx.translate(-60 * (1 - pin), 0); ctx.globalAlpha = pin;
  fillRR(ctx, PX + 10, PY + 16, PW, PH, 26, "rgba(58,48,40,0.12)"); fillRR(ctx, PX, PY, PW, PH, 26, C.surface, C.ink, 4);
  text(ctx, "Companion", PX + 56, PY + 86, { size: 48, weight: 600, spacing: -1.6 });
  text(ctx, "Colour", PX + 56, PY + 160, { size: 28, weight: 600, color: C.muted }); text(ctx, STYLE_NAME[STY[st.colour]], PX + PW - 56, PY + 160, { size: 28, weight: 600, align: "right", color: C.clayText });
  const sw = STY.map((_, k): Pt => [PX + 90 + k * 106, PY + 226]);
  STY.forEach((c, k) => { const [x, y] = sw[k]; if (k === st.colour) { ctx.beginPath(); ctx.arc(x, y, 46, 0, 6.29); ctx.fillStyle = C.peach; ctx.fill(); } ctx.beginPath(); ctx.arc(x, y, 31, 0, 6.29); ctx.fillStyle = c === "line" ? C.surface : STYLE_HEX[c]; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = C.ink; ctx.stroke(); });
  const rows = [{ label: "Mood and pose", chips: POSE_CHIPS, y: PY + 316, on: st.pose }, { label: "Accessory", chips: ACC_CHIPS, y: PY + 476, on: st.acc }];
  const rects = rows.map((r) => { text(ctx, r.label, PX + 56, r.y, { size: 28, weight: 600, color: C.muted }); const rr = chipRow(ctx, r.chips, PX + 56, r.y + 30);
    rr.forEach((b, k) => { const on = k === r.on; fillRR(ctx, b.x, b.y, b.w, b.h, 28, on ? C.peach : C.surface, on ? C.clay : C.border, 3); text(ctx, r.chips[k], b.x + b.w / 2, b.y + 38, { size: 28, weight: 600, align: "center", color: on ? C.clayText : C.cocoa }); }); return rr; });
  ctx.fillStyle = C.border; ctx.fillRect(PX + 40, PY + 606, PW - 80, 2);
  text(ctx, "Show companion", PX + 56, PY + 668, { size: 30, weight: 600 });
  const swOn = st.on ? 1 : 1 - easeOut(seg(s.l, 292, 302)), SX = PX + PW - 160, SY = PY + 636;
  fillRR(ctx, SX, SY, 100, 52, 26, swOn > 0.5 ? C.clay : C.border); ctx.beginPath(); ctx.arc(SX + 26 + 48 * swOn, SY + 26, 20, 0, 6.29); ctx.fillStyle = C.surface; ctx.fill();
  ctx.restore();
  // the companion itself: every swap pops and throws a few sparkles; switched off, it shrinks away
  const QX = 1430, QY = 975, off = st.on ? 0 : easeInOut(seg(s.l, 292, 306)), intro = backOut(s.t(4, 22));
  ctx.save(); ctx.globalAlpha = 0.18 * (1 - off * 0.6); ctx.fillStyle = C.cocoa; ctx.beginPath(); ctx.ellipse(QX, QY + 2, 170, 26, 0, 0, 6.29); ctx.fill(); ctx.restore();
  if (off < 1) { const sq = last && since < 8 && last.row !== "off" ? 1 - 0.12 * Math.sin((since / 8) * Math.PI) : 1;
    drawLook(ctx, env, { id: st.id, x: QX, y: QY, h: 700 * intro * (1 - off), squash: sq, f: s.f, lean: Math.sin(s.f / 11) * 2 }); }
  else { ctx.save(); ctx.setLineDash([14, 12]); ctx.lineDashOffset = -s.f * 0.6; ctx.strokeStyle = C.muted; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(QX, QY - 300, 160 + Math.sin(s.f / 9) * 6, 300, 0, 0, 6.29); ctx.stroke(); ctx.restore(); }
  if (last && last.row !== "off" && since < 14) for (let k = 0; k < 6; k++) { const a = k * 1.05 + s.l * 0.1; sparkle(ctx, QX + Math.cos(a) * (230 + since * 10), QY - 330 + Math.sin(a) * (260 + since * 8), 20 * (1 - since / 14), k % 2 ? C.clay : STYLE_HEX[STY[st.colour]] === "#ffffff" ? C.peach : STYLE_HEX[STY[st.colour]], s.l / 6); }
  fading(ctx, 1 - s.t(50, 60), () => thought(ctx, s, QX + 60, QY - 610, "palette", s.t(14, 30), { scale: 0.9 }));
  // the pointer: each change is a click on the panel
  const target = (e: LookEv): Pt => e.row === "colour" ? sw[e.v] : e.row === "off" ? [SX + 60, SY + 26] : ((b) => [b.x + b.w / 2, b.y + 28] as Pt)(rects[e.row === "pose" ? 0 : 1][e.v]);
  pointerPath(ctx, s.l, [[40, 980, 700], ...LOOK_EV.map((e) => { const [x, y] = target(e); return [e.t, x, y, true] as [number, number, number, boolean]; }), [330, 1000, 820]]);
  lowerThird(ctx, s.l, 24, 284, "Pick a body colour, a mood and pose,", "and glasses or a bucket hat.");
  lowerThird(ctx, s.l, 296, s.len, "Turn the companion off", "and it appears only during onboarding.");
} });

// ---------------------------------------------------------------- welcome: a new friend, nine lessons, the tour
const LESSONS = ["Writing and formatting", "Tasks and progress", "Choices and toggles", "Tables and code", "Links and finding", "Main and named views", "Files and attachments", "AI and privacy", "Your launch checklist"];
const AX = 90, AY = 80, AW = 1480, AH = 770, SB = 440, EX = AX + SB + 60; // the app window, its sidebar, the editor's left edge
const WT = { folder: 50, lesson: 120, tick: 146, result: 164, settings: 182, around: 204, tour: [220, 240, 260, 280] };
const TOUR = [{ r: { x: AX + 28, y: AY + 70, w: 124, h: 54 }, title: "New notes start here", n: 1 }, { r: { x: AX + 26, y: AY + 206, w: 130, h: 50 }, title: "Main is a view", n: 2 },
  { r: { x: AX + 28, y: AY + 136, w: 384, h: 52 }, title: "Find anything", n: 3 }, { r: { x: AX + AW - 128, y: AY + 26, w: 92, h: 54 }, title: "See the Markdown underneath", n: 4 }];
const welcome: Scene = { id: "welcome", len: 300, atm: "linen-morning", draw: (ctx, env, s) => {
  const T = LIGHT, R = T.roles, win = pop(s.t(0, 20)); if (win <= 0) return;
  ctx.save(); ctx.translate(AX + AW / 2, AY + AH / 2); ctx.scale(0.9 + 0.1 * win, 0.9 + 0.1 * win); ctx.translate(-AX - AW / 2, -AY - AH / 2); ctx.globalAlpha = Math.min(1, win * 1.4);
  fillRR(ctx, AX + 10, AY + 16, AW, AH, 26, "rgba(58,48,40,0.12)"); fillRR(ctx, AX, AY, AW, AH, 26, R.surface, "#2b231d", 4);
  ctx.save(); ctx.beginPath(); ctx.roundRect(AX, AY, AW, AH, 26); ctx.clip(); ctx.fillStyle = R.ground; ctx.fillRect(AX, AY, SB, AH); ctx.fillStyle = R.border; ctx.fillRect(AX + SB, AY, 2, AH); ctx.restore();
  ["#e8836f", "#e8c46f", "#9cc27e"].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(AX + 32 + i * 28, AY + 34, 9, 0, 6.29); ctx.fill(); });
  // sidebar: New, Search, Main, the Welcome folder and its nine lessons, Settings
  fillRR(ctx, AX + 36, AY + 76, 108, 44, 12, R.accent); text(ctx, "New", AX + 90, AY + 107, { size: 28, weight: 600, align: "center", color: R["on-accent"] });
  fillRR(ctx, AX + 36, AY + 142, 368, 42, 21, R.surface, R.border, 2); text(ctx, "Search", AX + 64, AY + 172, { size: 26, color: R["text-muted"] });
  text(ctx, "Main ▾", AX + 40, AY + 242, { size: 28, weight: 600, color: R.text });
  const open = s.l >= WT.folder, lessonOn = s.l >= WT.lesson;
  if (open && s.l < WT.folder + 30) fillRR(ctx, AX + 20, AY + 262, SB - 40, 46, 10, R.tint);
  ctx.fillStyle = R.accent; ctx.beginPath(); ctx.roundRect(AX + 44, AY + 276, 34, 24, 4); ctx.fill(); ctx.fillRect(AX + 44, AY + 272, 14, 8);
  text(ctx, (open ? "▾ " : "▸ ") + "Welcome", AX + 92, AY + 296, { size: 28, weight: 600, color: R.text });
  if (open) text(ctx, "9", AX + SB - 40, AY + 296, { size: 26, weight: 600, align: "right", color: R["accent-text"] });
  LESSONS.forEach((n, i) => { const k = easeOut(seg(s.l, WT.folder + 6 + i * 5, WT.folder + 18 + i * 5)); if (k <= 0) return; const y = AY + 346 + i * 44;
    if (lessonOn && i === 1) fillRR(ctx, AX + 48, y - 31, SB - 68, 42, 10, R.tint);
    text(ctx, n, AX + 92, y, { size: 26, weight: lessonOn && i === 1 ? 600 : 500, color: lessonOn && i === 1 ? R.text : R["text-muted"], alpha: k }); });
  text(ctx, "Settings", AX + 40, AY + AH - 30, { size: 26, color: R["text-muted"] });
  // Aa, and the editor: the root welcome note, then the Tasks and progress lesson
  fillRR(ctx, AX + AW - 116, AY + 32, 72, 44, 12, R["surface-2"], R.border, 2); text(ctx, "Aa", AX + AW - 80, AY + 63, { size: 28, weight: 600, align: "center", color: R.text });
  if (!lessonOn) { heading(ctx, T, EX, AY + 170, "Welcome to Rotli", 56); para(ctx, T, EX, AY + 250, "This is a real Markdown note in your vault.", { size: 30 });
    para(ctx, T, EX, AY + 310, "The Welcome folder in Main holds", { size: 30, muted: true }); para(ctx, T, EX, AY + 356, "nine short lessons.", { size: 30, muted: true }); }
  else { const k = easeOut(seg(s.l, WT.lesson, WT.lesson + 12)); ctx.save(); ctx.globalAlpha *= k; ctx.translate(0, (1 - k) * 16);
    heading(ctx, T, EX, AY + 170, "Tasks and progress", 56); para(ctx, T, EX, AY + 236, "Click these controls.", { size: 30, muted: true });
    task(ctx, T, EX, AY + 320, s.l >= WT.tick ? "x" : " ", "Write the first draft", { tick: seg(s.l, WT.tick, WT.tick + 12), size: 30 });
    task(ctx, T, EX, AY + 382, "/", "Review the details", { size: 30 }); task(ctx, T, EX, AY + 444, "x", "Make room to think", { size: 30 });
    heading(ctx, T, EX, AY + 540, "Results", 40); const rx = results(ctx, T, EX, AY + 610, ["True", "False"], s.l >= WT.result ? 0 : -1); para(ctx, T, rx + 12, AY + 610, "Is the decision ready?", { size: 30 });
    ctx.restore(); }
  // Settings → General → Show me around
  const sh = s.l >= WT.settings && s.l < WT.around + 12 ? (s.l < WT.around ? pop(seg(s.l, WT.settings, WT.settings + 14)) : 1 - easeOut(seg(s.l, WT.around + 2, WT.around + 12))) : 0;
  if (sh > 0.01) { ctx.save(); ctx.globalAlpha *= Math.min(1, sh * 1.3); ctx.translate(1060, 430); ctx.scale(0.9 + 0.1 * sh, 0.9 + 0.1 * sh);
    fillRR(ctx, -380, -230, 760, 460, 24, R.surface, "#2b231d", 4); ctx.fillStyle = R.ground; ctx.fillRect(-378, -160, 220, 388); ctx.fillStyle = R.border; ctx.fillRect(-380, -162, 760, 2);
    text(ctx, "Settings", -340, -180, { size: 36, weight: 600, color: R.text });
    fillRR(ctx, -366, -140, 196, 48, 10, R.tint); text(ctx, "General", -344, -106, { size: 28, weight: 600, color: R.text }); ["Appearance", "Keys"].forEach((n, i) => text(ctx, n, -344, -44 + i * 58, { size: 28, color: R["text-muted"] }));
    text(ctx, "Guided tour", -120, -100, { size: 30, weight: 600, color: R.text }); text(ctx, "Points at the real controls.", -120, -54, { size: 26, color: R["text-muted"] });
    fillRR(ctx, -120, 0, 290, 60, 14, R.accent); text(ctx, "Show me around", 25, 40, { size: 28, weight: 600, align: "center", color: R["on-accent"] });
    ctx.restore(); }
  // the tour: a ring on each real control, with its step card
  const tt = WT.tour, ti = tt.filter((t) => s.l >= t).length - 1;
  if (ti >= 0) { const a = TOUR[Math.max(0, ti - 1)].r, b = TOUR[ti].r, k = ti ? easeInOut(seg(s.l, tt[ti], tt[ti] + 10)) : pop(seg(s.l, tt[0], tt[0] + 12)), r = ti ? { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, w: a.w + (b.w - a.w) * k, h: a.h + (b.h - a.h) * k } : b;
    // a flat scrim over the window with the spotlit control left clear, as the real tour does
    ctx.save(); ctx.beginPath(); ctx.roundRect(AX, AY, AW, AH, 26); ctx.roundRect(r.x - 8, r.y - 8, r.w + 16, r.h + 16, 16); ctx.fillStyle = R.text; ctx.globalAlpha *= 0.2 * seg(s.l, tt[0], tt[0] + 8); ctx.fill("evenodd"); ctx.restore();
    ctx.save(); ctx.strokeStyle = R.accent; ctx.lineWidth = 5; ctx.beginPath(); ctx.roundRect(r.x - 8, r.y - 8, r.w + 16, r.h + 16, 16); ctx.stroke(); ctx.restore();
    const st = TOUR[ti], ck = easeOut(seg(s.l, tt[ti] + 4, tt[ti] + 14)), cw = Math.max(measure(ctx, st.title, 30, 600), 120) + 64, right = st.r.x + st.r.w + 30 + cw < AX + AW;
    const cx = right ? st.r.x + st.r.w + 30 : st.r.x - 30 - cw, cy = st.r.y + st.r.h + (right ? -40 : 30);
    ctx.save(); ctx.globalAlpha *= ck; fillRR(ctx, cx, cy, cw, 110, 18, R.surface, R.accent, 3); text(ctx, st.title, cx + 32, cy + 48, { size: 30, weight: 600, color: R.text }); text(ctx, `${st.n} of 6`, cx + 32, cy + 88, { size: 26, color: R["text-muted"] }); ctx.restore(); }
  ctx.restore();
  // the pointer: open the folder, open a lesson, tick a task, choose a result, Settings, Show me around
  pointerPath(ctx, s.l, [[30, 1100, 700], [WT.folder, AX + 180, AY + 288, true], [WT.lesson, AX + 220, AY + 382, true], [WT.tick, EX + 16, AY + 306, true], [WT.result, EX + 40, AY + 596, true],
    [WT.settings, AX + 90, AY + AH - 40, true], [WT.around, 1085, 460, true], [WT.tour[1] + 8, 1200, 760]]);
  // the new friend (Ocean, from other shores) hops in and learns the island
  const h = hopAlong(s.l, [[4, 2090, 1010], [22, 1910, 1010], [40, 1760, 1010]], 80);
  const p = poseAt(s.l, [[0, "attention"], [60, "notes"], [WT.tick + 2, "celebrating"], [WT.tick + 26, "searching"], [WT.tour[3] - 6, "waving"]]);
  actor(ctx, env, s.f, { pose: h.moving ? "walking" : p.pose, x: h.x, y: h.y, h: 300, lift: h.lift, squash: h.squash * p.squash, flip: true, body: FAMILY_QUOKKA.ocean, lean: Math.sin(s.f / 10) * 2 });
  fading(ctx, 1 - s.t(84, 96), () => thought(ctx, s, 1740, 740, "question", s.t(44, 60), { side: -1, scale: 0.85 }));
  lowerThird(ctx, s.l, 16, 196, "The Welcome folder holds nine short lessons,", "plus a guided tour of the real controls.");
  lowerThird(ctx, s.l, 204, s.len, "Settings → General → Show me around", "runs it again.");
} };

// ---------------------------------------------------------------- finale: sunset, the quokka and the Librarian, everything kept
const finale: Scene = { id: "finale", len: 240, draw: (ctx, env, s) => {
  // the Librarian is already on the sand; the quokka hops in with the Trip ideas note and sets it down between them
  const lp = s.l < 70 ? "base" : s.l < 150 ? "listening" : "knowledge";
  librarian(ctx, env, s, { x: 1010, y: 990, h: 470, pose: lp, flip: true });
  const h = hopAlong(s.l, [[6, 2080, 990], [28, 1830, 990], [50, 1600, 990], [70, 1460, 990]], 70);
  const put = easeInOut(s.t(78, 98)), carry: Pt = [h.x + 40, h.y - h.lift - 250 + Math.sin(s.f / 9) * 3];
  card(ctx, { x: carry[0] + (1236 - carry[0]) * put, y: carry[1] + (948 - carry[1]) * put - Math.sin(put * Math.PI) * 50, rot: -0.2 + put * 0.12, scale: 0.9, title: "Trip ideas", token: true, lines: 2, seed: 41, frame: s.f });
  const p = poseAt(s.l, [[0, "walking"], [72, "notes"], [100, "listening"], [170, "celebrating"]]);
  actor(ctx, env, s.f, { pose: h.moving ? "walking" : p.pose, x: h.x, y: h.y, h: 330, lift: h.lift, squash: h.squash * p.squash, flip: true, lean: s.l > 100 ? Math.sin(s.f / 12) * 2 : 0 });
  fading(ctx, 1 - s.t(150, 162), () => thought(ctx, s, h.x + 10, h.y - 300, "heart", s.t(104, 120)));
  // the year's colours come back as small lights over the sea
  const r = rng(77); for (let k = 0; k < 6; k++) { const x = 260 + r() * 640, y = 610 + r() * 140, t0 = 110 + k * 10, a = easeOut(s.t(t0, t0 + 16)); if (a <= 0) continue;
    sparkle(ctx, x + Math.sin(s.f / 17 + k) * 12, y - a * 30 + Math.sin(s.f / 11 + k) * 6, 28 * a, [STYLE_HEX.cocoa, STYLE_HEX.green, STYLE_HEX.ocean, STYLE_HEX.iris, STYLE_HEX.berry, STYLE_HEX.amber][k], s.f / 20 + k); }
  intertitle(ctx, s, ["Everything changes colour.", "Everything is kept."], { hi: "kept", y: 170, size: 80, t0: 120 });
} };

// ---------------------------------------------------------------- end: the season ends; both wave
const end: Scene = { id: "end", len: 120, atm: "linen-morning", draw: (ctx, env, s) => {
  storyEnd(ctx, env, s, { pose: "waving" });
  const q = backOut(s.t(18, 36)); if (q > 0) librarian(ctx, env, s, { x: 1210, y: 1030, h: 270 * q, pose: "waving" });
} };

const SCENES = [cold, chapter, ...SEASONS, looks, welcome, finale, end];
const SE = sceneStart(SCENES, "seasons"), LO = sceneStart(SCENES, "looks"), WE = sceneStart(SCENES, "welcome"), FI = sceneStart(SCENES, "finale");
export const s01e10Seasons: Film = story({ id: "s01e10Seasons", no: 10, title: "Seasons.", atmosphere: "island-sunset", scenes: SCENES, looks: [...LOOK_IDS, ...LIBRARIAN_LOOKS],
  score: { key: 2, melody: 2, thumps: [34, 58, 82, FI + 28, FI + 50, FI + 70],
    pops: [...SOFF.map((o, i) => [SE + o, [79, 81, 84, 86, 88, 91][i]] as [number, number]), ...LOOK_EV.map((e, i) => [LO + e.t, [79, 81, 84, 86, 88, 91, 93][i % 7]] as [number, number]),
      ...[WT.folder, WT.lesson, WT.tick, WT.result, WT.settings, WT.around, ...WT.tour].map((t, i) => [WE + t, [81, 84, 86, 88, 91, 93][i % 6]] as [number, number])] } });

const CO = { x: 500, y: 250, w: 1420, h: 830 }, SC = { x: 40, y: 70, w: 1560, h: 870 }, LC = { x: 60, y: 80, w: 1780, h: 990 }, WC = { x: 40, y: 50, w: 1600, h: 890 }, FC = { x: 560, y: 300, w: 1340, h: 760 };
export const s01e10Derive: DeriveSpec = {
  no: 10, series: "season-one", label: "Rotli · Season One · 10",
  vertical: [
    { frame: 30, len: 150, crop: CO, title: "A year on the island.", sub: "Everything changes colour.", hi: "year" },
    { frame: SE + 20, len: 300, crop: SC, title: "Six theme families.", sub: "Each with a tuned light and dark.", hi: "Six" },
    { frame: LO + 50, len: 210, crop: LC, title: "Pick a body colour.", sub: "A mood and pose, glasses or a bucket hat.", hi: "colour" },
    { frame: FI + 40, len: 180, crop: FC, title: "Everything is kept.", sub: "At sunset, with the Librarian.", hi: "kept" },
  ],
  slides: [
    { frame: SE + SOFF[3] + 50, crop: SC, title: "Six theme families.", sub: "Each with a tuned light and dark.", hi: "Six" },
    { frame: LO + 220, crop: LC, title: "Pick a body colour.", sub: "Glasses or a bucket hat.", hi: "colour" },
    { frame: WE + 175, crop: WC, title: "Nine short lessons.", sub: "Plus a guided tour of the real controls.", hi: "Nine" },
    { frame: FI + 200, crop: FC, title: "Everything is kept.", sub: "At sunset, with the Librarian.", hi: "kept" },
  ],
  single: { frame: FI + 110, crop: { x: 640, y: 300, w: 1180, h: 780 }, title: "Seasons.", sub: "Everything changes colour. Nothing gets lost.", hi: "Seasons" },
};
