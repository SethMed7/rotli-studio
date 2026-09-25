// EPISODE 07 · SECURE — "AI is invited in. It does not own the house." (30 s, 1920x1080, dark)
// Story: other apps nag for accounts and tracking; Rotli asks for nothing, and AI is a choice (off,
// on your Mac, or the tools you already use). A note marked secure: remote clouds bounce off this
// Mac's boundary while the on-device model reads it. A pasted (fake) API key flags its note secure;
// a locked note lets the model read and refuses its edit.
// Turn: frame 448, the first remote cloud refused at the boundary. Token: health.md.
import type { Ctx, Env, P } from "./core";
import type { Film } from "./film";
import { actor, poseAt } from "./rotli/actor";
import { C, FONT, backOut, cloud, easeIn, easeInOut, easeOut, fillRR, ink, lerp, lockIcon, measure, pop, seg, sparkle, text, typed } from "./rotli/kit";
import type { DeriveSpec } from "./studio/derive";
import { makeScore } from "./studio/score2";
import { drift, END, endCard, ground, host, lowerThird, TITLE, titleCard } from "./studio/series";
import { FONTS } from "./studio/stage";
import { DARK as T, appFrame, caret, heading, para, pointer, task } from "./studio/ui";
import { useFamilyUI } from "./studio/ui";

// this episode speaks the ROTLI theme family: grounds, UI, captions, accents and the quokka
useFamilyUI("rotli");

const TOTAL = 900, DEMO_END = TOTAL - END, R = T.roles;
// layout (world units): the window, the on-device column, this Mac's boundary
const WIN = { x: 100, y: 130, w: 1090, h: 700 }, SIDE = 260, EX = WIN.x + SIDE + 64, COL = 1380, BX = 1600, CHIP = { x: COL, y: 262, s: 0.85 };
// cue table (frames)
const Q = { d: [105, 125, 145], strike: [150, 168, 186], fall: 196, settings: 222, rows: [228, 240, 252], pickMac: 300, health: 350, bound: 352, secure: 392, clouds: [418, 438], hit: [448, 468], read1: 474, server: 530, type: [552, 590], flag: 600, secure2: 614, trip: 648, lock: 676, read2: 694, edit: [712, 734] };
const ptr: [number, number, number][] = [[250, 1150, 900], [288, 1098, 496], [306, 1098, 496], [340, 200, 316], [356, 200, 316], [384, 1095, 166], [400, 1095, 166], [430, 1020, 740], [505, 1020, 740], [526, 220, 362], [538, 220, 362], [562, 1060, 720], [622, 1060, 720], [642, 210, 408], [654, 210, 408], [670, 945, 166], [686, 945, 166], [712, 1060, 760]];
const ptrAt = (l: number) => { if (l <= ptr[0][0]) return { x: ptr[0][1], y: ptr[0][2] }; for (let i = 1; i < ptr.length; i++) if (l < ptr[i][0]) { const [f0, x0, y0] = ptr[i - 1], [f1, x1, y1] = ptr[i], k = easeInOut((l - f0) / (f1 - f0)); return { x: x0 + (x1 - x0) * k, y: y0 + (y1 - y0) * k }; } const z = ptr[ptr.length - 1]; return { x: z[1], y: z[2] }; };
const press = (l: number, at: number) => (l >= at && l < at + 12 ? (l - at) / 12 : 0);

/** camera: wide for the boundary beats, pushed in (1.2×) on the window for settings and the key */
const CAM: [number, number, number, number][] = [[0, 1, 0, 0], [200, 1, 0, 0], [228, 1.2, 90, -106], [340, 1.2, 90, -106], [362, 1, 0, 0], [522, 1, 0, 0], [545, 1.2, 90, -106], [640, 1.2, 90, -106], [662, 1, 0, 0]];
const camera = (ctx: Ctx, env: Env, l: number) => {
  let c = CAM[CAM.length - 1].slice(1);
  for (let i = 0; i < CAM.length - 1; i++) if (l >= CAM[i][0] && l < CAM[i + 1][0]) { const a = CAM[i], b = CAM[i + 1], k = easeInOut(seg(l, a[0], b[0])); c = [lerp(a[1], b[1], k), lerp(a[2], b[2], k), lerp(a[3], b[3], k)]; break; }
  const [s, tx, ty] = c; ctx.setTransform(env.scale * s, 0, 0, env.scale * s, env.scale * tx, env.scale * ty); drift(ctx, env, l);
};

// ---------------------------------------------------------------- local props
/** the on-device model: the film's little chip friend */
const onDevice = (ctx: Ctx, cx: number, cy: number, s: number) => {
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
  fillRR(ctx, -70, -60, 140, 120, 18, C.olive, C.ink, 4);
  for (let i = -2; i <= 2; i++) { ctx.fillStyle = C.nightText; ctx.fillRect(i * 24 - 4, -76, 8, 16); ctx.fillRect(i * 24 - 4, 60, 8, 16); }
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(-24, -8, 8, 0, 6.29); ctx.arc(24, -8, 8, 0, 6.29); ctx.fill();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 8, 16, 0.2, Math.PI - 0.2); ctx.stroke();
  ctx.restore();
};
/** a round ✓ / ✕ badge */
const mark = (ctx: Ctx, cx: number, cy: number, ok: boolean, r = 14) => {
  ctx.save(); ctx.fillStyle = ok ? C.olive : C.badge; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.29); ctx.fill();
  ctx.strokeStyle = C.surface; ctx.lineWidth = r * 0.25; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.beginPath(); const q = r * 0.4;
  if (ok) { ctx.moveTo(cx - q * 1.1, cy); ctx.lineTo(cx - q * 0.3, cy + q * 0.9); ctx.lineTo(cx + q * 1.2, cy - q * 0.9); } else { ctx.moveTo(cx - q, cy - q); ctx.lineTo(cx + q, cy + q); ctx.moveTo(cx + q, cy - q); ctx.lineTo(cx - q, cy + q); }
  ctx.stroke(); ctx.restore();
};
/** a night pill with a ✓ / ✕, centred on cx, top at y, popped by p */
const pill = (ctx: Ctx, cx: number, y: number, label: string, ok: boolean, p: number) => {
  if (p <= 0) return; const w = measure(ctx, label, 26, 600) + 84;
  ctx.save(); ctx.translate(cx, y + 22); ctx.scale(p, p); fillRR(ctx, -w / 2, -22, w, 44, 22, C.nightSurface2, C.nightBorder, 2); mark(ctx, -w / 2 + 28, 0, ok); text(ctx, label, -w / 2 + 54, 9, { size: 26, weight: 600, color: C.nightText }); ctx.restore();
};
/** "no edits": a pencil with a slash through it */
const noEdit = (ctx: Ctx, cx: number, cy: number, s: number, col: string) => {
  ctx.save(); ctx.translate(cx, cy); ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineJoin = "round"; ctx.lineCap = "round";
  ctx.save(); ctx.rotate(-Math.PI / 4); const u = s / 22; // pencil: tip bottom-left, body up-right
  ctx.beginPath(); ctx.moveTo(-11 * u, 0); ctx.lineTo(-5 * u, -3.2 * u); ctx.lineTo(-5 * u, 3.2 * u); ctx.closePath(); ctx.fill();
  ctx.fillRect(-3.5 * u, -3.2 * u, 12 * u, 6.4 * u); ctx.fillRect(9.5 * u, -3.2 * u, 3 * u, 6.4 * u); ctx.restore();
  ctx.lineWidth = s * 0.12; ctx.beginPath(); ctx.moveTo(-s * 0.55, -s * 0.55); ctx.lineTo(s * 0.55, s * 0.55); ctx.stroke(); ctx.restore();
};
/** a pencil pointing left, tip at (x, y): an AI edit on its way */
const pencil = (ctx: Ctx, x: number, y: number) => {
  ctx.save(); ctx.translate(x, y); ctx.scale(0.8, 0.8); ctx.lineJoin = "round";
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(20, -10); ctx.lineTo(20, 10); ctx.closePath(); ctx.fillStyle = C.sand; ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(7, -3.5); ctx.lineTo(7, 3.5); ctx.closePath(); ctx.fill();
  fillRR(ctx, 20, -10, 58, 20, 3, C.clay, C.ink, 3); fillRR(ctx, 78, -10, 14, 20, 4, C.lake, C.ink, 3);
  ctx.restore();
};
/** a dashed arrow from the chip into the window, head pointing left */
const arrow = (ctx: Ctx, f: number, y: number, k: number, col: string) => {
  if (k <= 0) return; const x0 = COL - 78, x1 = WIN.x + WIN.w + 16;
  ink(ctx, [[x0, y], [x1 + 10, y]], { w: 5, color: col, seed: 800 + y, frame: f, progress: k, dash: [12, 9], wob: 0.4 });
  if (k >= 1) { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x1 + 18, y - 12); ctx.lineTo(x1 + 18, y + 12); ctx.closePath(); ctx.fill(); }
};
/** red spokes where something is refused */
const burst = (ctx: Ctx, x: number, y: number, k: number) => {
  if (k <= 0 || k >= 1) return; ctx.save(); ctx.globalAlpha = 1 - k; ctx.strokeStyle = C.badge; ctx.lineWidth = 6; ctx.lineCap = "round";
  for (let s = 0; s < 6; s++) { const a = s * 1.047 + 0.3; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * 22, y + Math.sin(a) * 22); ctx.lineTo(x + Math.cos(a) * (44 + 34 * k), y + Math.sin(a) * (44 + 34 * k)); ctx.stroke(); }
  ctx.restore();
};
/** title-bar toggle (Secure / Lock) */
const toggle = (ctx: Ctx, x: number, label: string, on: boolean, icon: (cx: number, cy: number, col: string) => void) => {
  const w = measure(ctx, label, 26, 600) + 66, fg = on ? R["on-accent"] : R.text;
  fillRR(ctx, x, 142, w, 46, 12, on ? R.accent : R.surface, on ? R.accent : R["text-muted"], 2); icon(x + 26, 166, on ? R["on-accent"] : R["text-muted"]);
  text(ctx, label, x + 48, 174, { size: 26, weight: 600, color: fg });
};
// this Mac's boundary: a dashed rounded rect around the window and the on-device column
// (evenly spaced points: the ink spline overshoots where long edges meet tight corners)
const BOUND: P[] = (() => { const pts: P[] = [], x0 = 60, y0 = 76, x1 = BX, y1 = 860, r = 40, step = 24;
  const edge = (ax: number, ay: number, bx: number, by: number) => { const n = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / step)); for (let i = 0; i < n; i++) pts.push([lerp(ax, bx, i / n), lerp(ay, by, i / n)]); };
  const corner = (cx: number, cy: number, a0: number) => { for (let i = 0; i < 4; i++) { const a = a0 + (i * Math.PI) / 8; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } };
  edge(x0 + r, y0, x1 - r, y0); corner(x1 - r, y0 + r, -Math.PI / 2); edge(x1, y0 + r, x1, y1 - r); corner(x1 - r, y1 - r, 0);
  edge(x1 - r, y1, x0 + r, y1); corner(x0 + r, y1 - r, Math.PI / 2); edge(x0, y1 - r, x0, y0 + r); corner(x0 + r, y0 + r, Math.PI); return pts; })();
// the nags Rotli never shows
const DLG = [{ t: "Create an account", s: "Sign up to continue", x: 470, y: 230 }, { t: "Allow tracking?", s: "Help us with analytics", x: 560, y: 420 }, { t: "Send crash report?", s: "Upload it to our servers", x: 650, y: 610 }];
const ROWS = [{ t: "Off", s: "Leave it off" }, { t: "On your Mac", s: "Run a model on your Mac" }, { t: "Your tools", s: "Connect the tools you already use" }];
const KEY = "sk-test-XXXXXXXXXXXX", PRE = "token: ";

const TITLE_LINES = ["AI is invited in.", "It does not own the house."];
/** the shared series title card (it moves the quokka clear of wide titles) */
const title = (ctx: Ctx, env: Env, l: number) => titleCard(ctx, env, l, l, { no: 7, title: TITLE_LINES, pose: "stays_local", dark: true });
const demo = (ctx: Ctx, l: number, env: Env) => {
  ground(ctx, l, true);
  camera(ctx, env, l);
  // the boundary: this Mac, drawn in once AI is on the table
  const bk = easeOut(seg(l, Q.bound, Q.bound + 26));
  if (bk > 0) { fillRR(ctx, 60, 76, BX - 60, 784, 40, `rgba(169,183,143,${(0.05 * bk).toFixed(3)})`); ink(ctx, BOUND, { w: 5, color: C.oliveBright, seed: 700, frame: l, progress: bk, closed: true, dash: [16, 12] });
    text(ctx, "on this Mac", COL, 134, { size: 28, weight: 600, align: "center", color: C.oliveBright, alpha: seg(l, Q.bound + 12, Q.bound + 26) }); }
  // the window and whichever view is open
  const view = l < Q.settings ? "health" : l < Q.health ? "settings" : l < Q.server ? "health" : l < Q.trip ? "server" : "trip";
  const active = view === "health" ? 0 : view === "server" ? 1 : view === "trip" ? 2 : -1;
  appFrame(ctx, T, WIN, { notes: ["Health", "Server setup", "Trip plan"], active, side: SIDE, title: view === "settings" ? "Settings" : view === "health" ? "health.md" : view === "server" ? "server-setup.md" : "trip-plan.md" });
  const healthSecure = l >= Q.secure, serverSecure = l >= Q.secure2, tripLocked = l >= Q.lock;
  if (healthSecure) lockIcon(ctx, WIN.x + SIDE - 34, 312, 18, R.accent);
  if (serverSecure) lockIcon(ctx, WIN.x + SIDE - 34, 358, 18, R.accent);
  if (tripLocked) noEdit(ctx, WIN.x + SIDE - 34, 404, 20, R.accent);
  if (view !== "settings") {
    toggle(ctx, 885, "Lock", view === "trip" && tripLocked, (x, y, c) => noEdit(ctx, x, y, 20, c));
    toggle(ctx, 1020, "Secure", (view === "health" && healthSecure) || (view === "server" && serverSecure), (x, y, c) => lockIcon(ctx, x, y + 2, 20, c));
  }
  const headLock = (s: string, at: number, icon: "lock" | "noedit") => { const p = pop(seg(l, at, at + 12)); if (p <= 0) return; const x = EX + measure(ctx, s, 50, 600) + 36; ctx.save(); ctx.translate(x, 244); ctx.scale(p, p); if (icon === "lock") lockIcon(ctx, 0, 0, 30, R.accent); else noEdit(ctx, 0, -6, 30, R.accent); ctx.restore(); };
  if (view === "health") {
    heading(ctx, T, EX, 262, "Health", 50);
    ["Allergy: penicillin", "Blood type: O+", "Next check-up: March 12"].forEach((s, i) => para(ctx, T, EX, 345 + i * 56, s));
    if (l >= Q.health) headLock("Health", Q.secure, "lock");
  } else if (view === "settings") {
    heading(ctx, T, EX, 262, "AI", 50);
    ROWS.forEach((row, i) => {
      const a = seg(l, Q.rows[i], Q.rows[i] + 10); if (a <= 0) return; const x = EX, y = 300 + i * 132 + (1 - a) * 16, w = 720, on = i === 1 && l >= Q.pickMac + 3;
      ctx.save(); ctx.globalAlpha *= a;
      fillRR(ctx, x, y, w, 116, 16, on ? R.tint : R.surface, on ? R.accent : R.border, on ? 3 : 2); fillRR(ctx, x + 22, y + 28, 64, 60, 14, R["surface-2"]);
      const ix = x + 54, iy = y + 58;
      if (i === 0) { ctx.strokeStyle = R["text-muted"]; ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.beginPath(); ctx.arc(ix, iy + 2, 16, -Math.PI / 2 + 0.7, -Math.PI / 2 - 0.7 + Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(ix, iy - 18); ctx.lineTo(ix, iy - 2); ctx.stroke(); }
      else if (i === 1) onDevice(ctx, ix, iy, 0.3);
      else cloud(ctx, ix, iy + 6, 0.3, { eyes: false, frame: l, seed: 44 });
      text(ctx, row.t, x + 110, y + 50, { size: 32, weight: 600, color: R.text }); text(ctx, row.s, x + 110, y + 90, { size: 26, color: R["text-muted"] });
      ctx.beginPath(); ctx.arc(x + w - 46, y + 58, 15, 0, 6.29); ctx.fillStyle = R.surface; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = on ? R.accent : R["text-muted"]; ctx.stroke();
      if (on) { ctx.beginPath(); ctx.arc(x + w - 46, y + 58, 8, 0, 6.29); ctx.fillStyle = R.accent; ctx.fill(); }
      ctx.restore();
    });
    if (l >= Q.pickMac && l < Q.pickMac + 14) sparkle(ctx, 1098, 452, 18 * (1 - (l - Q.pickMac) / 14), C.clay, l / 5);
  } else if (view === "server") {
    heading(ctx, T, EX, 262, "Server setup", 50);
    para(ctx, T, EX, 345, "Box: build-01");
    const y = 405, kx = EX + measure(ctx, PRE, 30), kw = measure(ctx, KEY, 30, 500, FONT.mono);
    if (l > Q.flag) { const k = easeOut(seg(l, Q.flag, Q.flag + 8)); fillRR(ctx, kx - 8, y - 32, (kw + 16) * k, 44, 8, R.tint, R.accent, 2); }
    if (l >= Q.type[0] - 6) { para(ctx, T, EX, y, PRE); text(ctx, typed(KEY, seg(l, Q.type[0], Q.type[1])), kx, y, { size: 30, font: FONT.mono, color: R.text }); }
    if (l >= Q.type[0] - 6 && l < Q.flag) caret(ctx, T, l < Q.type[0] ? kx : kx + measure(ctx, typed(KEY, seg(l, Q.type[0], Q.type[1])), 30, 500, FONT.mono), y, l, 30);
    const fp = pop(seg(l, Q.flag + 4, Q.flag + 16)); if (fp > 0) { const lab = "Looks like an API key", w = measure(ctx, lab, 26, 600) + 76; ctx.save(); ctx.translate(kx - 8, 470); ctx.scale(fp, fp); fillRR(ctx, 0, -24, w, 48, 24, R["surface-2"], R.accent, 2); lockIcon(ctx, 30, 2, 20, R.accent); text(ctx, lab, 54, 9, { size: 26, weight: 600, color: R.text }); ctx.restore(); }
    headLock("Server setup", Q.secure2, "lock");
    if (l >= Q.secure2 && l < Q.secure2 + 14) sparkle(ctx, 1095, 150, 18 * (1 - (l - Q.secure2) / 14), C.clay, l / 5);
  } else {
    heading(ctx, T, EX, 262, "Trip plan", 50);
    task(ctx, T, EX, 345, "x", "book the ferry"); task(ctx, T, EX, 405, " ", "find the pink lake"); task(ctx, T, EX, 465, " ", "pack a snorkel");
    headLock("Trip plan", Q.lock, "noedit");
  }
  // the on-device model: arrives when "On your Mac" is picked, reads what it may
  const cp = pop(seg(l, Q.pickMac + 6, Q.pickMac + 20));
  if (cp > 0) { const cy = CHIP.y + Math.sin(l / 12) * 3; ctx.save(); ctx.translate(COL, cy); ctx.scale(cp, cp); onDevice(ctx, 0, 0, CHIP.s); ctx.restore();
    text(ctx, "on-device model", COL, 372, { size: 26, weight: 600, align: "center", color: C.nightText, alpha: seg(l, Q.pickMac + 12, Q.pickMac + 24) }); }
  const inRead = (a: number, b: number) => l >= a && l < b;
  if (inRead(Q.read1, Q.server)) arrow(ctx, l, 238, easeOut(seg(l, Q.read1, Q.read1 + 10)), C.oliveBright);
  if (inRead(Q.read2, TOTAL)) arrow(ctx, l, 238, easeOut(seg(l, Q.read2, Q.read2 + 10)), C.oliveBright);
  if (inRead(Q.read1, Q.server)) pill(ctx, COL, 400, "can read", true, pop(seg(l, Q.read1 + 6, Q.read1 + 18)));
  if (inRead(Q.read2, TOTAL)) pill(ctx, COL, 400, "can read", true, pop(seg(l, Q.read2 + 6, Q.read2 + 18)));
  // the AI edit on a locked note: out of the chip, into the note, bounced
  if (l >= Q.edit[0]) { const [e0, e1] = Q.edit, x = l < e1 ? lerp(COL - 80, WIN.x + WIN.w + 14, easeIn(seg(l, e0, e1))) : lerp(WIN.x + WIN.w + 14, WIN.x + WIN.w + 34, easeOut(seg(l, e1, e1 + 14)));
    pencil(ctx, x, 292 + (l >= e1 ? Math.sin((l - e1) / 6) * 4 : 0)); burst(ctx, WIN.x + WIN.w + 6, 292, seg(l, e1, e1 + 14)); if (l >= e1) mark(ctx, x + 36, 262, false, 16 * pop(seg(l, e1, e1 + 10)));
    pill(ctx, COL, 456, "can't edit", false, pop(seg(l, e1 + 6, e1 + 18))); }
  // remote models: two clouds drift in from outside and bounce off the boundary
  for (let i = 0; i < 2; i++) {
    const t0 = Q.clouds[i], hit = Q.hit[i], y0 = [250, 590][i]; if (l < t0) continue;
    let x: number, y: number;
    if (l < hit) { const k = easeIn(seg(l, t0, hit)); x = lerp(2120, BX + 100, k); y = lerp(y0 - 160, y0, k); }
    else { const k = easeOut(seg(l, hit, hit + 24)); x = BX + 100 + 90 * k; y = y0 + Math.sin((l - hit) / 9) * 8; burst(ctx, BX, y0, seg(l, hit, hit + 14)); }
    cloud(ctx, x, y, 0.95, { frame: l, seed: 60 + i, face: l >= hit && l < hit + 40 ? "dizzy" : "curious" });
    text(ctx, "remote model", x, y + 100, { size: 26, weight: 600, align: "center", color: C.nightMuted, alpha: seg(l, t0 + 8, t0 + 20) });
    if (l >= hit && l < Q.server) pill(ctx, BX + 190, y0 + 124, "refused", false, pop(seg(l, hit + 4, hit + 16)) * (1 - seg(l, Q.server - 8, Q.server)));
  }
  // the quokka keeps the house
  const qs = backOut(seg(l, 356, 374));
  if (qs > 0) { const p = poseAt(l, [[0, "stays_local"], [Q.hit[0], "listening"], [500, "stays_local"], [Q.edit[1], "attention"], [750, "celebrating"]]); actor(ctx, env, l, { pose: p.pose, x: COL, y: 832, h: 280 * qs, squash: p.squash, shadowCol: "#000" }); }
  // the nags Rotli never shows: popped, struck through, gone
  DLG.forEach((d, i) => {
    const p = pop(seg(l, Q.d[i], Q.d[i] + 14)), fk = easeIn(seg(l, Q.fall + i * 6, Q.fall + i * 6 + 24)); if (p <= 0 || fk >= 1) return;
    ctx.save(); ctx.globalAlpha *= 1 - fk; ctx.translate(d.x + 310, d.y + 75 + fk * 520); ctx.rotate(fk * (i % 2 ? -0.35 : 0.3)); ctx.scale(p, p); ctx.translate(-310, -75);
    fillRR(ctx, 0, 0, 620, 150, 20, C.surface, C.ink, 3);
    text(ctx, d.t, 34, 60, { size: 34, weight: 600, color: C.cocoa }); text(ctx, d.s, 34, 110, { size: 26, color: C.muted });
    fillRR(ctx, 436, 82, 150, 46, 12, C.blue); text(ctx, "Continue", 511, 114, { size: 26, weight: 600, align: "center", color: "#ffffff" });
    ink(ctx, [[18, 48], [310, 52], [602, 46]], { w: 9, color: C.clay, seed: 30 + i, frame: l, progress: easeOut(seg(l, Q.strike[i], Q.strike[i] + 10)) });
    ctx.restore();
  });
  if (l >= 250 && l < 720) { const p = ptrAt(l); pointer(ctx, p.x, p.y, press(l, Q.pickMac) || press(l, Q.health) || press(l, Q.secure) || press(l, Q.server) || press(l, Q.trip) || press(l, Q.lock)); }
  if (l >= Q.secure && l < Q.secure + 14) sparkle(ctx, 1095, 150, 18 * (1 - (l - Q.secure) / 14), C.clay, l / 5);
  ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
  // the host keeps the corner until the quokka takes its place inside the boundary
  const hh = 1 - easeIn(seg(l, 344, 356)); if (hh > 0) host(ctx, env, l, { pose: "stays_local", dark: true, h: 250 * hh });
  lowerThird(ctx, l, 100, 216, "No account, no tracking.", "No analytics, ads, or crash uploads.", true);
  lowerThird(ctx, l, 226, 342, "Leave it off, run a model on your Mac,", "or connect the tools you already use.", true);
  lowerThird(ctx, l, 354, 522, "Secure notes never reach a remote model.", "An on-device model can still read them.", true);
  lowerThird(ctx, l, 532, 642, "It recognizes common secret shapes too.", "API keys, private keys, card and identity numbers.", true);
  lowerThird(ctx, l, 652, DEMO_END, "Locked notes can't be edited by any model.", "Every model can still read them.", true);
};

export const ep07Secure: Film = {
  meta: { title: "ep07Secure", W: 1920, H: 1080, fps: 30, bpm: 120, durationFrames: TOTAL, raster: "cpu" },
  assets: { images: {}, fonts: FONTS },
  shots: [
    { id: "title", start: 0, end: TITLE, draw: (c, l, e) => { c.setTransform(e.scale, 0, 0, e.scale, 0, 0); title(c, e, l); } },
    { id: "demo", start: TITLE, end: DEMO_END, draw: (c, l, e) => { c.setTransform(e.scale, 0, 0, e.scale, 0, 0); demo(c, l + TITLE, e); } },
    { id: "end", start: DEMO_END, end: TOTAL, draw: (c, l, e) => { c.setTransform(e.scale, 0, 0, e.scale, 0, 0); endCard(c, e, DEMO_END + l, l, { pose: "stays_local" }); } },
  ],
  audio: makeScore({ frames: TOTAL, energeticFrom: 120, endAt: 780, bellAt: [DEMO_END],
    pops: [[Q.d[0], 79], [Q.d[1], 81], [Q.d[2], 84], [Q.strike[0], 76], [Q.strike[1], 79], [Q.strike[2], 81], [Q.rows[0], 84], [Q.rows[1], 86], [Q.rows[2], 88], [Q.pickMac, 91], [Q.pickMac + 6, 93], [Q.health, 84], [Q.bound, 86], [Q.secure, 91], [Q.read1 + 6, 93], [Q.server, 84], [Q.flag, 91], [Q.secure2, 93], [Q.trip, 84], [Q.lock, 91], [Q.read2 + 6, 93], [Q.edit[1] + 6, 88], [750, 96]],
    clicks: Array.from({ length: Math.floor((Q.type[1] - Q.type[0]) / 3) }, (_, i) => Q.type[0] + i * 3), thumps: [Q.hit[0], Q.hit[1], Q.edit[1]] }),
};

// crops are in the rendered episode's screen coordinates (camera applied)
const PUSH = { x: 540, y: 120, w: 1000, h: 600 }, WIDE = { x: 410, y: 30, w: 1490, h: 830 }, LOCKED = { x: 410, y: 30, w: 1210, h: 830 };
export const ep07Derive: DeriveSpec = {
  no: 7, series: "secure",
  vertical: [
    { frame: 230, len: 105, crop: PUSH, title: "Three ways to use AI.", sub: "Off, on your Mac, or tools you use.", hi: "AI" },
    { frame: 426, len: 90, crop: { x: 1196, y: 60, w: 724, h: 800 }, title: "Remote models: refused.", sub: "Secure notes never reach them.", hi: "refused" },
    { frame: 548, len: 90, crop: { x: 560, y: 110, w: 1000, h: 560 }, title: "Secret shapes, recognized.", sub: "An API key marks its note secure.", hi: "recognized" },
    { frame: 664, len: 105, crop: LOCKED, title: "Locked: no AI edits.", sub: "Every model can still read it.", hi: "Locked" },
  ],
  slides: [
    { frame: 335, crop: PUSH, title: "AI is your call.", sub: "Off, on your Mac, or tools you use.", hi: "your call" },
    { frame: 515, crop: WIDE, title: "Remote models: refused.", sub: "Secure notes never reach them.", hi: "refused" },
    { frame: 634, crop: { x: 560, y: 110, w: 1000, h: 560 }, title: "Secret shapes, recognized.", sub: "API keys, card and identity numbers.", hi: "recognized" },
    { frame: 768, crop: LOCKED, title: "Locked: no AI edits.", sub: "Every model can still read it.", hi: "Locked" },
  ],
  single: { frame: 515, crop: WIDE, title: "AI is invited in.", sub: "It does not own the house.", hi: "invited" },
};
