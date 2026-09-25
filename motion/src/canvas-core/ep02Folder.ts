// EPISODE 02 · FOLDER — "One folder. Every way out stays open." (30 s, 1920x1080)
// Story: the note in Rotli is a file in an ordinary folder you picked (notes and chats are Markdown,
// .rotli/ only holds what Rotli can rebuild); the same file opens as plain text in another editor;
// the folder backs up any way you like; the app goes to the Trash and the folder still stands.
// Turn: frame 420, trip-plan.md opens as plain text outside Rotli. Token: trip-plan.md.
import type { Ctx, Env } from "./core";
import type { Film } from "./film";
import { POSES } from "./quokka/poses";
import { actor, hopAlong } from "./rotli/actor";
import { C, FONT, backOut, chip, easeInOut, fillRR, folder, ink, lerp, measure, pop, rr, seg, sparkle, text } from "./rotli/kit";
import type { DeriveSpec } from "./studio/derive";
import { makeScore } from "./studio/score2";
import { drift, endCard, ground, host, lowerThird, titleCard, END, TITLE } from "./studio/series";
import { FONTS } from "./studio/stage";
import { LIGHT as T, appFrame, caret, heading, para, pointer, task, type Rect } from "./studio/ui";
import { useFamilyUI } from "./studio/ui";

// this episode speaks the PAPER theme family: grounds, UI, captions, accents and the quokka
useFamilyUI("paper");

const TOTAL = 900, DEMO_END = TOTAL - END, R = T.roles;
// cue table (frames)
const Q = {
  rotliIn: 90, finderIn: 104, rows: 122, mdTags: 205, chatTag: 220, push: [240, 268], rotli: 255, rotliNote: 265, pull: [352, 378],
  dbl: [400, 407], finderOut: 412, editorIn: 420, same: 455, sceneOut: 520, vault: 530, copies: [560, 585, 610],
  dOut: 650, finderBack: 658, tile: 664, trash: 672, grab: 700, drop: 732, hop: [742, 762],
};
// pointer waypoints [frame, x, y] (world coords, under the camera)
const ptr: [number, number, number][] = [[360, 1560, 1010], [392, 1190, 320], [414, 1190, 320], [452, 1560, 1010], [680, 1560, 1010], [696, 1175, 268], [Q.grab, 1175, 268], [728, 1175, 560], [740, 1175, 560], [770, 1560, 1010]];
const ptrAt = (l: number) => { if (l <= ptr[0][0]) return { x: ptr[0][1], y: ptr[0][2] }; for (let i = 1; i < ptr.length; i++) if (l < ptr[i][0]) { const [f0, x0, y0] = ptr[i - 1], [f1, x1, y1] = ptr[i], k = easeInOut((l - f0) / (f1 - f0)); return { x: x0 + (x1 - x0) * k, y: y0 + (y1 - y0) * k }; } const z = ptr[ptr.length - 1]; return { x: z[1], y: z[2] }; };
const press = (l: number, at: number, d = 7) => (l >= at && l < at + d ? (l - at) / d : 0);

/** camera: a slow drift the whole film, plus a push onto the vault list while .rotli/ is explained */
const camera = (ctx: Ctx, env: Env, l: number) => {
  const z = easeInOut(seg(l, Q.push[0], Q.push[1])) * (1 - easeInOut(seg(l, Q.pull[0], Q.pull[1]))), s = (1 + 0.015 * seg(l, 90, DEMO_END)) * (1 + 0.18 * z);
  const ax = lerp(960, 1420, z), ay = lerp(450, 480, z), px = lerp(960, 1290, z), py = lerp(450, 456, z);
  ctx.setTransform(env.scale * s, 0, 0, env.scale * s, env.scale * (px - s * ax), env.scale * (py - s * ay)); drift(ctx, env, l);
};
/** scale-in/out around a point, for windows that open and close */
const around = (ctx: Ctx, cx: number, cy: number, s: number, a: number, draw: () => void) => { if (s <= 0 || a <= 0) return; ctx.save(); ctx.globalAlpha *= a; ctx.translate(cx, cy); ctx.scale(s, s); ctx.translate(-cx, -cy); draw(); ctx.restore(); };

// ---------------------------------------------------------------- local props
/** a plain OS window: traffic lights, a title bar, returns the body top */
const osWindow = (ctx: Ctx, r: Rect, title: string, left = "") => {
  fillRR(ctx, r.x + 10, r.y + 16, r.w, r.h, 26, "rgba(58,48,40,0.12)");
  fillRR(ctx, r.x, r.y, r.w, r.h, 26, R.surface, "#2b231d", 4);
  ctx.save(); rr(ctx, r.x, r.y, r.w, r.h, 26); ctx.clip(); ctx.fillStyle = R["surface-2"]; ctx.fillRect(r.x, r.y, r.w, 70); ctx.fillStyle = R.border; ctx.fillRect(r.x, r.y + 70, r.w, 2); ctx.restore();
  ["#e8836f", "#e8c46f", "#9cc27e"].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(r.x + 32 + i * 28, r.y + 35, 9, 0, 6.29); ctx.fill(); });
  if (left) text(ctx, left, r.x + 124, r.y + 44, { size: 26, weight: 500, color: R["text-muted"] });
  text(ctx, title, r.x + r.w / 2 + (left ? 60 : 0), r.y + 45, { size: 27, weight: 600, align: "center", color: R.text });
  return r.y + 72;
};
type Row = { name: string; kind: "dir" | "md" | "chat" | "board" | "doc" | "meta"; depth?: number; tag?: string; note?: string };
const ROWS: Row[] = [
  { name: "wiki/", kind: "dir" }, { name: "trip-plan.md", kind: "md", depth: 1, tag: "Markdown" }, { name: "ferry-times.md", kind: "md", depth: 1, tag: "Markdown" },
  { name: "chats/", kind: "dir" }, { name: "planning-with-claude.md", kind: "chat", depth: 1, tag: "Markdown" },
  { name: "storage/", kind: "dir" }, { name: "system-map.excalidraw", kind: "board", depth: 1 }, { name: "packing-list.docx", kind: "doc", depth: 1 },
  { name: ".rotli/", kind: "meta", note: "settings and indexes rotli can rebuild" },
];
const ROW_H = 58;
/** the vault as a Finder-like list; `shown(i)` 0..1 pops each row in, `tag(i)` 0..1 its note */
const vaultList = (ctx: Ctx, r: Rect, l: number, o: { shown: (i: number) => number; tag: (i: number) => number; sel?: number }) => {
  const top = osWindow(ctx, r, "My vault");
  // path bar: an ordinary directory
  const fx = r.x + 30, fy = top + 20; ctx.fillStyle = R.accent; ctx.beginPath(); ctx.roundRect(fx, fy + 8, 30, 21, 4); ctx.fill(); ctx.fillRect(fx, fy + 4, 12, 7);
  text(ctx, "~/Documents/My vault", fx + 44, fy + 28, { size: 26, font: FONT.mono, color: R["text-muted"] });
  ctx.fillStyle = R.border; ctx.fillRect(r.x, top + 66, r.w, 2);
  ROWS.forEach((row, i) => {
    const k = o.shown(i); if (k <= 0) return;
    const y = top + 80 + i * ROW_H, x = r.x + 26 + (row.depth ?? 0) * 38;
    ctx.save(); ctx.globalAlpha *= Math.min(1, k * 2); ctx.translate(0, (1 - pop(k)) * 14);
    if (i === o.sel) fillRR(ctx, r.x + 12, y - 2, r.w - 24, ROW_H - 4, 12, R.tint);
    const col = row.kind === "dir" ? R.accent : row.kind === "meta" ? "#a89a8c" : row.kind === "board" ? "#6fa68b" : row.kind === "doc" ? "#185abd" : row.kind === "chat" ? "#a58bd9" : R["text-muted"];
    if (row.kind === "dir" || row.kind === "meta") { ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(x, y + 16, 36, 26, 4); ctx.fill(); ctx.fillRect(x, y + 11, 15, 8); }
    else { fillRR(ctx, x + 4, y + 8, 28, 38, 4, R.surface, col, 3); ctx.fillStyle = col; ctx.fillRect(x + 10, y + 21, 16, 3); ctx.fillRect(x + 10, y + 30, 12, 3); }
    text(ctx, row.name, x + 52, y + 37, { size: 28, weight: row.kind === "dir" || row.kind === "meta" ? 600 : 500, color: R.text });
    const t = o.tag(i);
    if (t > 0 && row.tag) { const w = measure(ctx, row.tag, 26, 600) + 30, s = pop(t), cx = r.x + r.w - 30 - w / 2; ctx.save(); ctx.translate(cx, y + 28); ctx.scale(s, s); fillRR(ctx, -w / 2, -21, w, 42, 21, R.tint); text(ctx, row.tag, 0, 9, { size: 26, weight: 600, align: "center", color: R["accent-text"] }); ctx.restore(); }
    if (t > 0 && row.note) {
      const s = row.note.slice(0, Math.round(row.note.length * seg(t, 0, 0.7))), nx = r.x + r.w - 30;
      text(ctx, s, nx - 44, y + 37, { size: 26, weight: 500, align: "right", color: R["text-muted"] });
      // a rebuild arrow that keeps turning
      const a = seg(t, 0.6, 1); if (a > 0) { ctx.save(); ctx.globalAlpha *= a; ctx.translate(nx - 14, y + 28); ctx.rotate(l / 9); ctx.strokeStyle = R.accent; ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.beginPath(); ctx.arc(0, 0, 12, 0.4, 5.4); ctx.stroke(); ctx.fillStyle = R.accent; ctx.beginPath(); ctx.moveTo(15, -4); ctx.lineTo(5, -12); ctx.lineTo(16, -15); ctx.closePath(); ctx.fill(); ctx.restore(); }
    }
    ctx.restore();
  });
};
const PLAIN = ["# Trip plan", "", "- [x] book the ferry", "- [/] pack a snorkel", "- [ ] find the pink lake", "", "Leave by 9:40."];
/** another app: a plain text editor with the same note as bare Markdown (no styling, just text) */
const plainEditor = (ctx: Ctx, r: Rect, l: number, t0: number) => {
  const top = osWindow(ctx, r, "trip-plan.md", "Text editor");
  ctx.fillStyle = "#f6f3ee"; ctx.fillRect(r.x + 4, top, 66, r.h - 76); ctx.fillStyle = R.border; ctx.fillRect(r.x + 70, top, 2, r.h - 76);
  let endX = r.x + 100, endY = top + 70;
  PLAIN.forEach((s, i) => {
    const a = seg(l, t0 + i * 3, t0 + i * 3 + 6), y = top + 70 + i * 56; if (a <= 0) return;
    text(ctx, String(i + 1), r.x + 50, y, { size: 26, font: FONT.mono, align: "right", color: "#a89a8c", alpha: a });
    text(ctx, s, r.x + 100, y, { size: 30, font: FONT.mono, color: "#2b231d", alpha: a });
    endX = r.x + 100 + measure(ctx, s, 30, 500, FONT.mono); endY = y;
  });
  if (l > t0 + 26) caret(ctx, T, endX, endY, l, 32);
};
/** the Rotli app tile: clay square, the quokka mark, its name */
const appTile = (ctx: Ctx, cx: number, cy: number, s: number, label: number) => {
  if (s <= 0) return; const z = 170;
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
  fillRR(ctx, -z / 2, -z / 2, z, z, 40, C.clay, C.ink, 4);
  const mk = POSES._logo, m = 128 / mk.vb; ctx.save(); ctx.translate(-64, -70); ctx.scale(m, m); ctx.fillStyle = C.surface; for (const d of mk.d) ctx.fill(new Path2D(d), mk.rule); ctx.restore();
  if (label > 0) text(ctx, "Rotli", 0, z / 2 + 44, { size: 30, weight: 600, align: "center", color: C.cocoa, alpha: label });
  ctx.restore();
};
/** the Trash: a bin whose lid lifts by `lid` 0..1 */
const trashCan = (ctx: Ctx, cx: number, cy: number, s: number, lid: number) => {
  if (s <= 0) return; ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
  ctx.lineWidth = 4; ctx.strokeStyle = C.ink; ctx.lineJoin = "round";
  ctx.beginPath(); ctx.moveTo(-70, -70); ctx.lineTo(70, -70); ctx.lineTo(58, 90); ctx.quadraticCurveTo(56, 100, 46, 100); ctx.lineTo(-46, 100); ctx.quadraticCurveTo(-56, 100, -58, 90); ctx.closePath(); ctx.fillStyle = C.surface; ctx.fill(); ctx.stroke();
  ctx.fillStyle = C.border; for (const x of [-30, 0, 30]) ctx.fillRect(x - 3, -44, 6, 120);
  ctx.save(); ctx.translate(-80, -80); ctx.rotate(-0.55 * lid); fillRR(ctx, 0, -14, 160, 20, 8, C.surface2, C.ink, 4); fillRR(ctx, 58, -30, 44, 18, 8, C.surface2, C.ink, 4); ctx.restore();
  text(ctx, "Trash", 0, 150, { size: 30, weight: 600, align: "center", color: C.cocoa });
  ctx.restore();
};

// ---------------------------------------------------------------- the demo
const ROTLI_R: Rect = { x: 70, y: 90, w: 880, h: 730 }, RIGHT_R: Rect = { x: 990, y: 90, w: 860, h: 730 }, D_R: Rect = { x: 290, y: 90, w: 700, h: 720 };
const rotliWindow = (ctx: Ctx) => {
  const E = appFrame(ctx, T, ROTLI_R, { notes: ["Trip plan", "Ferry times", "Packing list"], active: 0, side: 250, title: "trip-plan.md" });
  heading(ctx, T, E.x, 236, "Trip plan", 56);
  task(ctx, T, E.x, 330, "x", "book the ferry"); task(ctx, T, E.x, 392, "/", "pack a snorkel"); task(ctx, T, E.x, 454, " ", "find the pink lake");
  para(ctx, T, E.x, 536, "Leave by 9:40.");
};
const demo = (ctx: Ctx, l: number, env: Env) => {
  ground(ctx, l);
  camera(ctx, env, l);
  // A + B: Rotli on the left, the vault (then another editor) on the right
  if (l < Q.sceneOut + 16) {
    const out = easeInOut(seg(l, Q.sceneOut, Q.sceneOut + 14)), inn = easeInOut(seg(l, Q.rotliIn, Q.rotliIn + 14));
    around(ctx, 510, 455, 1 - 0.1 * out, inn * (1 - out), () => { ctx.save(); ctx.translate(0, (1 - inn) * 40); rotliWindow(ctx); ctx.restore(); });
    const fin = backOut(seg(l, Q.finderIn, Q.finderIn + 16)), fout = easeInOut(seg(l, Q.finderOut, Q.finderOut + 10));
    around(ctx, 1420, 455, fin * (1 - 0.3 * fout), Math.min(1, fin * 2) * (1 - fout), () => vaultList(ctx, RIGHT_R, l, {
      shown: (i) => seg(l, Q.rows + i * 9, Q.rows + i * 9 + 12),
      tag: (i) => (i === 8 ? seg(l, Q.rotliNote, Q.rotliNote + 40) : i === 4 ? seg(l, Q.chatTag, Q.chatTag + 14) : seg(l, Q.mdTags + (i - 1) * 4, Q.mdTags + (i - 1) * 4 + 14)),
      sel: l >= Q.dbl[0] ? 1 : l >= Q.rotli ? 8 : l >= Q.chatTag ? 4 : l >= Q.mdTags ? 1 : -1,
    }));
    const ein = backOut(seg(l, Q.editorIn, Q.editorIn + 16));
    around(ctx, 1420, 455, ein * (1 - 0.1 * out), Math.min(1, ein * 2) * (1 - out), () => plainEditor(ctx, RIGHT_R, l, Q.editorIn + 6));
    // the same file, two doors
    const sk = pop(seg(l, Q.same, Q.same + 14));
    if (sk > 0) { const s = "same file  ·  trip-plan.md", w = measure(ctx, s, 28, 600) + 48; ctx.save(); ctx.globalAlpha *= 1 - out; ctx.translate(960, 52); ctx.scale(sk, sk); fillRR(ctx, -w / 2, -30, w, 60, 30, C.clay, C.ink, 3); text(ctx, s, 0, 10, { size: 28, weight: 600, align: "center", color: C.surface }); ctx.restore(); }
  }
  // C: the folder backs up any way you like
  if (l >= Q.vault && l < Q.dOut + 16) {
    const out = easeInOut(seg(l, Q.dOut, Q.dOut + 14)), k = backOut(seg(l, Q.vault, Q.vault + 16));
    around(ctx, 630, 460, k, Math.min(1, k * 2) * (1 - out), () => {
      folder(ctx, 450, 330, 360, 260, { front: false });
      [[-0.08, 540], [0.02, 640], [0.1, 730]].forEach(([rot, x], i) => { const up = 18 * Math.sin(l / 14 + i * 1.7); ctx.save(); ctx.translate(x, 322 + up); ctx.rotate(rot); fillRR(ctx, -70, -60, 140, 110, 12, C.surface, C.ink, 3); ctx.fillStyle = C.border; for (let j = 0; j < 3; j++) ctx.fillRect(-50, -30 + j * 20, 100 - j * 22, 6); ctx.restore(); });
      folder(ctx, 450, 330, 360, 260, { back: false, open: 0.12 });
      text(ctx, "My vault", 630, 650, { size: 34, weight: 600, align: "center", color: C.cocoa });
    });
    ["Time Machine", "a sync service", "git"].forEach((name, i) => {
      const t0 = Q.copies[i], y = 170 + i * 205, p = pop(seg(l, t0 + 8, t0 + 22)), a = 1 - out;
      ink(ctx, [[830, 470], [960, 470 + (y + 60 - 470) * 0.55], [1040, y + 60]], { w: 5, color: C.clay, seed: 30 + i, frame: l, progress: seg(l, t0, t0 + 12), alpha: a });
      if (p > 0) { ctx.save(); ctx.globalAlpha *= a; ctx.translate(1130, y + 60); ctx.scale(p, p); folder(ctx, -80, -50, 160, 110, {}); ctx.restore();
        ctx.save(); ctx.globalAlpha *= a * Math.min(1, p); chip(ctx, 1240, y + 32, name, { size: 34, bg: C.surface, fg: C.cocoa, border: C.ink }); ctx.restore(); }
    });
  }
  // D: the app goes to the Trash; the folder stays
  if (l >= Q.finderBack) {
    const fk = backOut(seg(l, Q.finderBack, Q.finderBack + 16)), bump = 1 + 0.03 * Math.sin(seg(l, Q.drop + 12, Q.drop + 24) * Math.PI);
    around(ctx, 640, 450, fk * bump, Math.min(1, fk * 2), () => vaultList(ctx, D_R, l, { shown: () => 1, tag: () => 0 }));
    const lid = seg(l, 712, 728) * (1 - seg(l, Q.drop + 12, Q.drop + 20));
    trashCan(ctx, 1175, 640, backOut(seg(l, Q.trash, Q.trash + 14)), lid);
    const home = { x: 1175, y: 262 }, p = ptrAt(l), drag = l >= Q.grab && l < Q.drop, gone = seg(l, Q.drop, Q.drop + 12);
    const tx = drag ? p.x : l >= Q.drop ? 1175 : home.x, ty = drag ? p.y - 6 : l >= Q.drop ? lerp(560, 600, gone) : home.y;
    if (gone < 1) appTile(ctx, tx, ty, backOut(seg(l, Q.tile, Q.tile + 14)) * (drag ? 0.82 : 1) * (1 - gone), 1 - seg(l, Q.grab - 4, Q.grab));
    if (l >= Q.drop && l < Q.drop + 14) sparkle(ctx, 1175, 540, 22 * (1 - (l - Q.drop) / 14), C.clay, l / 5);
    // the host quokka hops out of its corner into the scene, growing as it comes
    const h = hopAlong(l, [[Q.hop[0], 1830, 1050], [Q.hop[1], 1450, 820]], 110);
    if (l >= Q.hop[0]) actor(ctx, env, l, { pose: l < Q.hop[1] ? "walking" : "stays_local", x: h.x, y: h.y, h: lerp(180, 300, seg(l, Q.hop[0], Q.hop[1])), lift: h.lift, squash: h.squash, flip: l < Q.hop[1] });
  }
  if ((l >= 360 && l < 452) || (l >= 680 && l < 770)) { const p = ptrAt(l); pointer(ctx, p.x, p.y, press(l, Q.dbl[0]) || press(l, Q.dbl[1]) || press(l, Q.grab, 10)); }
  ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
  if (l < Q.hop[0]) host(ctx, env, l, { x: 1830, h: 180, pose: l < 250 ? "inbox" : l < 380 ? "thoughtful" : l < 530 ? "notes" : l < 660 ? "base" : "attention" });
  lowerThird(ctx, l, 100, 245, "Your vault is an ordinary directory you pick.", "Notes are Markdown, chats are Markdown.");
  lowerThird(ctx, l, 250, 372, "rotli's own metadata is rebuildable,", "never a second copy of your work.");
  lowerThird(ctx, l, 382, 520, "Open your work in other apps.", "rotli is never the only door to your notes.");
  lowerThird(ctx, l, 530, 652, "Back up the folder your way.", "Time Machine, a sync service, git. No export ritual.");
  lowerThird(ctx, l, 662, DEMO_END, "Delete the app and the work still makes sense.");
};

export const ep02Folder: Film = {
  meta: { title: "ep02Folder", W: 1920, H: 1080, fps: 30, bpm: 120, durationFrames: TOTAL, raster: "cpu" },
  assets: { images: {}, fonts: FONTS },
  shots: [
    { id: "title", start: 0, end: TITLE, draw: (c, l, e) => { c.setTransform(e.scale, 0, 0, e.scale, 0, 0); titleCard(c, e, l, l, { no: 2, title: ["One folder.", "Every way out", "stays open."], pose: "inbox" }); } },
    { id: "demo", start: TITLE, end: DEMO_END, draw: (c, l, e) => { c.setTransform(e.scale, 0, 0, e.scale, 0, 0); demo(c, l + TITLE, e); } },
    { id: "end", start: DEMO_END, end: TOTAL, draw: (c, l, e) => { c.setTransform(e.scale, 0, 0, e.scale, 0, 0); endCard(c, e, DEMO_END + l, l, { pose: "inbox" }); } },
  ],
  audio: makeScore({
    frames: TOTAL, energeticFrom: 120, endAt: 780, bellAt: [DEMO_END],
    pops: [[Q.finderIn, 84], [Q.rows, 86], [Q.rows + 27, 88], [Q.rows + 45, 91], [Q.rows + 72, 93], [Q.mdTags, 91], [Q.chatTag, 93], [Q.rotli, 96], [Q.dbl[0], 88], [Q.editorIn, 91], [Q.same, 96],
      [Q.vault, 84], [Q.copies[0] + 8, 88], [Q.copies[1] + 8, 91], [Q.copies[2] + 8, 93], [Q.finderBack, 84], [Q.tile, 86], [Q.trash, 88], [Q.drop, 96], [Q.hop[1], 91]],
    clicks: [Q.dbl[0], Q.dbl[1], Q.grab, ...Array.from({ length: 7 }, (_, i) => Q.editorIn + 6 + i * 3)],
    thumps: [Q.hop[1]],
  }),
};

export const ep02Derive: DeriveSpec = {
  no: 2, series: "folder",
  vertical: [
    { frame: 110, len: 135, crop: { x: 970, y: 60, w: 910, h: 790 }, title: "An ordinary directory.", sub: "Notes and chats are Markdown.", hi: "directory" },
    { frame: 388, len: 105, crop: { x: 975, y: 84, w: 910, h: 766 }, title: "Open it in other apps.", sub: "rotli is never the only door.", hi: "other apps" },
    { frame: 530, len: 120, crop: { x: 340, y: 120, w: 1220, h: 680 }, title: "Back up your way.", sub: "Time Machine, a sync service, git.", hi: "your way" },
    { frame: 660, len: 120, crop: { x: 250, y: 50, w: 1050, h: 800 }, title: "Delete the app.", sub: "The work still makes sense.", hi: "Delete" },
  ],
  slides: [
    { frame: 345, crop: { x: 770, y: 0, w: 1060, h: 860 }, title: "An ordinary directory you pick.", sub: "rotli's metadata is rebuildable.", hi: "directory" },
    { frame: 505, crop: { x: 360, y: 10, w: 1510, h: 850 }, title: "Open your work in other apps.", sub: "rotli is never the only door.", hi: "other apps" },
    { frame: 640, crop: { x: 340, y: 120, w: 1220, h: 680 }, title: "Back up the folder your way.", sub: "No export ritual.", hi: "your way" },
    { frame: 775, crop: { x: 250, y: 50, w: 1330, h: 800 }, title: "Delete the app.", sub: "The work still makes sense.", hi: "Delete" },
  ],
  single: { frame: 505, crop: { x: 360, y: 10, w: 1510, h: 850 }, title: "One folder.", sub: "Every way out stays open.", hi: "One folder" },
};
