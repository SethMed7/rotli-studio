// EPISODE 08 · WEB — "Your folder, in your browser." (30 s, 1920x1080)
// Story: a browser opens Rotli Web and picks a real folder; the same note, tasks and links are
// edited right there and the file sits in that folder; the Helper bridges Firefox, Zen and Brave;
// the Mac app and the web open the same folder. Turn: frame 235, "Open" (a real folder, in a tab).
// Token: trip-plan.md.
import type { Ctx, Env } from "./core";
import type { Film } from "./film";
import { actor } from "./rotli/actor";
import { C, FONT, backOut, chip, easeIn, easeInOut, fillRR, folder, ink, lerp, pop, rr, seg, sparkle, text, typed } from "./rotli/kit";
import type { DeriveSpec } from "./studio/derive";
import { makeScore } from "./studio/score2";
import { drift, endCard, ground, host, lowerThird, titleCard, END, TITLE } from "./studio/series";
import { FONTS } from "./studio/stage";
import { LIGHT as T, appFrame, caret, fileList, heading, link, pointer, raw, task, type Rect } from "./studio/ui";
import { useFamilyUI } from "./studio/ui";

// this episode speaks the MIDNIGHT theme family: grounds, UI, captions, accents and the quokka
useFamilyUI("midnight");

const TOTAL = 900, DEMO_END = TOTAL - END, R = T.roles;
// cue table (frames)
const Q = { url: [100, 124], openBtn: 165, sheet: 168, pick: 205, open: 235, ws: 245, tick1: 322, t4: [336, 360, 366], lnk: [378, 408, 414], toFolder: 432, panel: 458, tick2: 488, row: 494, out: 552, helper: 568, cards: [580, 590, 600], folder: 615, ai: 630, dOut: 668, mac: 680, web: 690, same: 705 };
const BR: Rect = { x: 90, y: 60, w: 1200, h: 790 };
const ptr: [number, number, number][] = [[112, 1150, 820], [150, 690, 628], [168, 690, 628], [196, 560, 404], [210, 560, 404], [228, 885, 628], [240, 885, 628], [300, 1000, 720], [316, 446, 420], [330, 446, 420], [360, 1000, 720], [470, 1000, 700], [482, 446, 480], [500, 446, 480], [545, 1100, 800]];
const ptrAt = (l: number) => { if (l <= ptr[0][0]) return { x: ptr[0][1], y: ptr[0][2] }; for (let i = 1; i < ptr.length; i++) if (l < ptr[i][0]) { const [f0, x0, y0] = ptr[i - 1], [f1, x1, y1] = ptr[i], k = easeInOut((l - f0) / (f1 - f0)); return { x: x0 + (x1 - x0) * k, y: y0 + (y1 - y0) * k }; } const z = ptr[ptr.length - 1]; return { x: z[1], y: z[2] }; };
const press = (l: number, at: number) => (l >= at && l < at + 12 ? (l - at) / 12 : 0);

/** camera: the browser centred, pushed in on the editor (1.2×) while we edit, then back to the left for the folder */
const camera = (ctx: Ctx, env: Env, l: number) => {
  const ab = easeInOut(seg(l, 262, 290)), bc = easeInOut(seg(l, 430, 456));
  let s = lerp(1, 1.2, ab), tx = lerp(270, 132, ab), ty = lerp(0, -58, ab);
  s = lerp(s, 1, bc); tx = lerp(tx, 0, bc); ty = lerp(ty, 0, bc);
  if (l >= Q.mac - 4) { s = 1 + 0.035 * seg(l, Q.mac - 4, DEMO_END); tx = 960 - 960 * s; ty = 470 - 470 * s; }
  ctx.setTransform(env.scale * s, 0, 0, env.scale * s, env.scale * tx, env.scale * ty); drift(ctx, env, l);
};

// ---------------------------------------------------------------- local props
const smallFolder = (ctx: Ctx, x: number, y: number, col = R.accent) => { ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(x, y + 6, 34, 24, 4); ctx.fill(); ctx.fillRect(x, y + 2, 14, 8); };
const chevron = (ctx: Ctx, x: number, y: number, dir: number) => { ctx.save(); ctx.strokeStyle = R["text-muted"]; ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.beginPath(); ctx.moveTo(x + 6 * dir, y - 11); ctx.lineTo(x - 6 * dir, y); ctx.lineTo(x + 6 * dir, y + 11); ctx.stroke(); ctx.restore(); };
/** a generic browser window: one tab, back/forward, an address bar. `inner` draws the page, clipped. */
const browserFrame = (ctx: Ctx, r: Rect, url: string, inner?: (c: Rect) => void, tab = "Rotli Web") => {
  fillRR(ctx, r.x + 10, r.y + 16, r.w, r.h, 26, "rgba(58,48,40,0.12)");
  fillRR(ctx, r.x, r.y, r.w, r.h, 26, R.surface, "#2b231d", 4);
  ctx.save(); rr(ctx, r.x, r.y, r.w, r.h, 26); ctx.clip();
  ctx.fillStyle = R["surface-2"]; ctx.fillRect(r.x, r.y, r.w, 64);
  ["#e8836f", "#e8c46f", "#9cc27e"].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(r.x + 32 + i * 28, r.y + 33, 9, 0, 6.29); ctx.fill(); });
  fillRR(ctx, r.x + 122, r.y + 12, 290, 70, 14, R.surface);
  fillRR(ctx, r.x + 144, r.y + 28, 22, 22, 6, R.accent); text(ctx, tab, r.x + 180, r.y + 49, { size: 26, weight: 600, color: R.text });
  if (r.w > 900) text(ctx, "New Tab", r.x + 452, r.y + 49, { size: 26, color: R["text-muted"] });
  ctx.fillStyle = R.surface; ctx.fillRect(r.x, r.y + 64, r.w, 76);
  chevron(ctx, r.x + 42, r.y + 103, 1); chevron(ctx, r.x + 90, r.y + 103, -1);
  fillRR(ctx, r.x + 130, r.y + 78, r.w - 170, 50, 25, R["surface-2"]);
  text(ctx, url, r.x + 160, r.y + 112, { size: 26, font: FONT.mono, color: R.text });
  ctx.fillStyle = R.border; ctx.fillRect(r.x, r.y + 138, r.w, 2);
  const c = { x: r.x, y: r.y + 140, w: r.w, h: r.h - 140 }; if (inner) inner(c);
  ctx.restore(); return c;
};
/** the web workspace sidebar: the folder you opened, its notes and a subfolder */
const webSidebar = (ctx: Ctx, c: Rect, sw: number, active = 0) => {
  ctx.fillStyle = R.ground; ctx.fillRect(c.x, c.y, sw, c.h); ctx.fillStyle = R.border; ctx.fillRect(c.x + sw, c.y, 2, c.h);
  smallFolder(ctx, c.x + 30, c.y + 30); text(ctx, "Notes", c.x + 78, c.y + 58, { size: 28, weight: 600, color: R.text });
  let sy = c.y + 116; ["Trip plan", "Ferry times", "Reading list"].forEach((n, i) => { if (i === active) fillRR(ctx, c.x + 18, sy - 32, sw - 36, 46, 10, R.tint); text(ctx, n, c.x + 50, sy, { size: 26, weight: i === active ? 600 : 500, color: i === active ? R.text : R["text-muted"] }); sy += 50; });
  smallFolder(ctx, c.x + 50, sy - 30, R["text-muted"]); text(ctx, "Trips", c.x + 96, sy, { size: 26, color: R["text-muted"] });
};
/** the same note, compact, for the side-by-side */
const miniNote = (ctx: Ctx, x: number, y: number) => {
  heading(ctx, T, x, y, "Trip plan", 44);
  task(ctx, T, x, y + 70, "x", "book the ferry", { size: 28 }); task(ctx, T, x, y + 124, "x", "pack a snorkel", { size: 28 }); task(ctx, T, x, y + 178, " ", "bring the map", { size: 28 });
};
/** a small generic browser card with a plain-text name */
const miniBrowser = (ctx: Ctx, x: number, y: number, name: string, s: number) => {
  if (s <= 0) return; ctx.save(); ctx.translate(x + 165, y + 58); ctx.scale(s, s); ctx.translate(-165, -58);
  fillRR(ctx, 0, 0, 330, 116, 16, R.surface, "#2b231d", 3); ctx.save(); rr(ctx, 0, 0, 330, 116, 16); ctx.clip(); ctx.fillStyle = R["surface-2"]; ctx.fillRect(0, 0, 330, 36); ctx.restore();
  [0, 1, 2].forEach((i) => { ctx.fillStyle = R.border; ctx.beginPath(); ctx.arc(22 + i * 20, 18, 6, 0, 6.29); ctx.fill(); }); fillRR(ctx, 90, 9, 220, 18, 9, R.surface);
  text(ctx, name, 28, 88, { size: 32, weight: 600, color: R.text }); ctx.restore();
};
const popIn = (ctx: Ctx, cx: number, cy: number, s: number, draw: () => void) => { if (s <= 0) return; ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s); ctx.translate(-cx, -cy); draw(); ctx.restore(); };

// ---------------------------------------------------------------- the web scene (browser, folder picker, editor, the folder on disk)
const webScene = (ctx: Ctx, l: number, env: Env) => {
  const bs = pop(seg(l, 90, 106)); if (bs <= 0) return;
  const url = typed("rotli.co/app", seg(l, Q.url[0], Q.url[1])), wsA = seg(l, Q.ws, Q.ws + 14);
  let cur: [number, number] | null = null;
  popIn(ctx, BR.x + BR.w / 2, BR.y + BR.h / 2, bs, () => browserFrame(ctx, BR, url, (c) => {
    if (l >= Q.url[0] && l < Q.url[1] + 16) caret(ctx, T, BR.x + 160 + url.length * 15.6, BR.y + 112, l, 30);
    const cx = c.x + c.w / 2;
    // the start page: open a folder
    if (wsA < 1) { ctx.save(); ctx.globalAlpha *= 1 - wsA;
      actor(ctx, env, l, { pose: "base", x: cx, y: c.y + 240, h: 190 });
      text(ctx, "Rotli Web", cx, c.y + 310, { size: 56, weight: 600, align: "center", color: R.text });
      text(ctx, "Open a folder on your computer to start.", cx, c.y + 360, { size: 30, align: "center", color: R["text-muted"] });
      const pr = press(l, Q.openBtn); fillRR(ctx, cx - 130, 598 + 3 * Math.sin(pr * Math.PI), 260, 62, 31, R.accent, "#2b231d", 3); text(ctx, "Open folder", cx, 640 + 3 * Math.sin(pr * Math.PI), { size: 30, weight: 600, align: "center", color: R["on-accent"] });
      ctx.restore(); }
    // the folder picker
    const sIn = easeInOut(seg(l, Q.sheet, Q.sheet + 12)), sOut = seg(l, Q.open + 2, Q.open + 10);
    if (sIn > 0 && sOut < 1) { const dy = -60 * (1 - sIn) - 40 * sOut; ctx.save(); ctx.globalAlpha *= sIn * (1 - sOut);
      ctx.fillStyle = "rgba(58,48,40,0.10)"; ctx.fillRect(c.x, c.y, c.w, c.h);
      fillRR(ctx, 390, 220 + dy, 600, 470, 22, R.surface, "#2b231d", 3);
      text(ctx, "Choose a folder", 420, 272 + dy, { size: 30, weight: 600, color: R.text });
      fileList(ctx, T, { x: 420, y: 300 + dy, w: 540, h: 256 }, [{ name: "Documents", kind: "dir" }, { name: "Notes", kind: "dir" }, { name: "Photos", kind: "dir" }, { name: "Projects", kind: "dir" }], l >= Q.pick + 2 ? 1 : -1, 58);
      fillRR(ctx, 640, 600 + dy, 150, 56, 14, R.surface, R.border, 2); text(ctx, "Cancel", 715, 637 + dy, { size: 26, weight: 600, align: "center", color: R.text });
      fillRR(ctx, 810, 600 + dy, 150, 56, 14, l >= Q.pick + 2 ? R.accent : R.border); text(ctx, "Open", 885, 637 + dy, { size: 26, weight: 600, align: "center", color: l >= Q.pick + 2 ? R["on-accent"] : R["text-muted"] });
      ctx.restore(); }
    // the workspace: the same editor, in a tab
    if (wsA > 0) { ctx.save(); ctx.globalAlpha *= wsA; webSidebar(ctx, c, 280, 0);
      const x = 430, line = (y: number, rawS: string, syn: number, [t0, t1, r]: number[], rendered: (a: number) => void) => {
        if (l < t0) return; const m = seg(l, r, r + 6);
        if (m < 1) { const e = raw(ctx, T, x, y, typed(rawS, seg(l, t0, t1)), syn, 1 - m); if (l < r) cur = [e, y]; }
        if (m > 0) rendered(m);
      };
      heading(ctx, T, x, 300, "Trip plan", 56);
      task(ctx, T, x, 380, "x", "book the ferry");
      task(ctx, T, x, 440, l >= Q.tick1 ? "x" : " ", "pack a snorkel", { tick: seg(l, Q.tick1 + 2, Q.tick1 + 10) });
      task(ctx, T, x, 500, l >= Q.tick2 ? "x" : " ", "find the pink lake", { tick: seg(l, Q.tick2 + 2, Q.tick2 + 10) });
      line(560, "- [ ] bring the map", 6, Q.t4, (a) => task(ctx, T, x, 560, " ", "bring the map", { alpha: a }));
      line(650, "Times are in [[Ferry times]]", 0, Q.lnk, (a) => { ctx.save(); ctx.globalAlpha *= a; link(ctx, T, x, 650, "Times are in ", "Ferry times", seg(l, Q.lnk[2] + 2, Q.lnk[2] + 14)); ctx.restore(); });
      if (cur) caret(ctx, T, cur[0], cur[1], l);
      ctx.restore(); }
  }));
  for (const at of [Q.tick1, Q.tick2]) if (l >= at && l < at + 14) sparkle(ctx, 446, (at === Q.tick1 ? 424 : 484) - 30, 16 * (1 - (l - at) / 14), C.clay, l / 5);
  // the folder on disk: the same file, just saved
  const pk = pop(seg(l, Q.panel, Q.panel + 16));
  popIn(ctx, 1600, 440, pk, () => {
    smallFolder(ctx, 1340, 234); text(ctx, "Notes", 1390, 262, { size: 34, weight: 600, color: C.cocoa });
    text(ctx, "a folder on your computer", 1340, 306, { size: 26, color: C.muted });
    fileList(ctx, T, { x: 1340, y: 326, w: 520, h: 252 }, [{ name: "trip-plan.md", kind: "md" }, { name: "ferry-times.md", kind: "md" }, { name: "reading-list.md", kind: "md" }, { name: "Trips", kind: "dir" }], l >= Q.row ? 0 : -1, 58);
  });
  if (l >= Q.row && l < Q.row + 16) sparkle(ctx, 1820, 372, 20 * (1 - (l - Q.row) / 16), C.clay, l / 5);
  const ck = pop(seg(l, Q.row + 14, Q.row + 28)); popIn(ctx, 1440, 640, ck, () => chip(ctx, 1340, 614, "No account", { size: 28, bg: C.clay, fg: C.surface, border: C.ink }));
  if (l >= 112 && l < 552) { const p = ptrAt(l); pointer(ctx, p.x, p.y, press(l, Q.openBtn) || press(l, Q.pick) || press(l, Q.open) || press(l, Q.tick1) || press(l, Q.tick2)); }
};

// ---------------------------------------------------------------- the Helper: a small bridge for other browsers
const helperScene = (ctx: Ctx, l: number) => {
  const names = ["Firefox", "Zen", "Brave"];
  names.forEach((n, i) => { const y = 190 + i * 150, at = Q.cards[i]; miniBrowser(ctx, 180, y, n, pop(seg(l, at, at + 14)));
    ink(ctx, [[520, y + 58], [620, y + 58 + (395 - y - 58) * 0.4], [712, 395]], { w: 4, color: C.clay, seed: 30 + i, frame: l, progress: seg(l, at + 8, at + 24) }); });
  popIn(ctx, 930, 395, pop(seg(l, Q.helper, Q.helper + 16)), () => {
    fillRR(ctx, 720, 290, 420, 210, 22, R.surface, "#2b231d", 4); ctx.save(); rr(ctx, 720, 290, 420, 210, 22); ctx.clip(); ctx.fillStyle = R["surface-2"]; ctx.fillRect(720, 290, 420, 70); ctx.fillStyle = R.border; ctx.fillRect(720, 358, 420, 2); ctx.restore();
    fillRR(ctx, 746, 310, 30, 30, 8, R.accent); text(ctx, "Rotli Helper", 792, 337, { size: 32, weight: 600, color: R.text });
    let x = 746; ["Mac", "Windows", "Linux"].forEach((p) => { x += chip(ctx, x, 408, p, { size: 26, bg: R.tint, fg: R["accent-text"] }) + 12; });
  });
  const fk = pop(seg(l, Q.folder, Q.folder + 16));
  ink(ctx, [[1148, 350], [1240, 320], [1320, 318]], { w: 4, color: C.clay, seed: 41, frame: l, progress: seg(l, Q.folder - 6, Q.folder + 10) });
  popIn(ctx, 1460, 330, fk, () => { folder(ctx, 1340, 238, 240, 160); text(ctx, "Your folder", 1460, 446, { size: 30, weight: 600, align: "center", color: C.cocoa }); });
  ink(ctx, [[1148, 450], [1230, 500], [1300, 540]], { w: 4, color: C.clay, seed: 43, frame: l, progress: seg(l, Q.ai - 6, Q.ai + 10) });
  popIn(ctx, 1500, 545, pop(seg(l, Q.ai, Q.ai + 16)), () => { fillRR(ctx, 1300, 496, 420, 100, 18, R.surface, "#2b231d", 3); text(ctx, ">_", 1328, 556, { size: 32, weight: 600, font: FONT.mono, color: R.accent }); text(ctx, "AI tools on your computer", 1384, 556, { size: 26, weight: 600, color: R.text }); });
};

// ---------------------------------------------------------------- Mac app and web, one folder
const sameScene = (ctx: Ctx, l: number, env: Env) => {
  popIn(ctx, 505, 420, pop(seg(l, Q.mac, Q.mac + 16)), () => {
    text(ctx, "Mac app", 505, 124, { size: 34, weight: 600, align: "center", color: C.cocoa });
    const E = appFrame(ctx, T, { x: 80, y: 150, w: 850, h: 540 }, { notes: ["Trip plan", "Ferry times", "Reading list"], active: 0, side: 250, title: "trip-plan.md" });
    miniNote(ctx, E.x, E.y + 60);
  });
  popIn(ctx, 1415, 420, pop(seg(l, Q.web, Q.web + 16)), () => {
    text(ctx, "Browser", 1415, 124, { size: 34, weight: 600, align: "center", color: C.cocoa });
    browserFrame(ctx, { x: 990, y: 150, w: 850, h: 540 }, "rotli.co/app", (c) => { webSidebar(ctx, c, 250, 0); miniNote(ctx, c.x + 300, c.y + 70); });
  });
  ink(ctx, [[505, 704], [640, 760], [838, 778]], { w: 5, color: C.clay, seed: 51, frame: l, progress: seg(l, Q.same - 4, Q.same + 14) });
  ink(ctx, [[1415, 704], [1280, 760], [1082, 778]], { w: 5, color: C.clay, seed: 53, frame: l, progress: seg(l, Q.same - 4, Q.same + 14) });
  popIn(ctx, 960, 780, pop(seg(l, Q.same, Q.same + 16)), () => { folder(ctx, 850, 712, 220, 128); text(ctx, "Notes", 960, 822, { size: 30, weight: 600, align: "center", color: C.cocoa }); });
};

const demo = (ctx: Ctx, l: number, env: Env) => {
  ground(ctx, l);
  camera(ctx, env, l);
  const wOut = easeIn(seg(l, Q.out, Q.out + 14));
  if (wOut < 1) { ctx.save(); ctx.globalAlpha *= 1 - wOut; ctx.translate(-160 * wOut, 0); webScene(ctx, l, env); ctx.restore(); }
  const dOut = easeIn(seg(l, Q.dOut, Q.dOut + 12));
  if (l >= Q.helper && dOut < 1) { ctx.save(); ctx.globalAlpha *= 1 - dOut; ctx.translate(-160 * dOut, 0); helperScene(ctx, l); ctx.restore(); }
  if (l >= Q.mac) sameScene(ctx, l, env);
  ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
  const hs = backOut(seg(l, Q.ws + 6, Q.ws + 24)); if (hs > 0) host(ctx, env, l, { x: 1815, h: 250 * hs, pose: l < 440 ? "notes" : l < Q.out + 8 ? "stays_local" : l < Q.mac ? "ai_chat" : l < Q.same + 8 ? "base" : "celebrating" });
  lowerThird(ctx, l, 100, 300, "No Mac? Open Rotli Web.", "Chrome, Edge, and Arc open your folder directly.");
  lowerThird(ctx, l, 305, 435, "The same editor, in your browser.", "Folders, tasks, and links, all there.");
  lowerThird(ctx, l, 440, 555, "Your notes stay in your folder", "unless you connect chat.");
  lowerThird(ctx, l, 565, 672, "Rotli Helper: Firefox, Zen, and Brave.", "Chat through the AI tools already on your computer.");
  lowerThird(ctx, l, 680, DEMO_END, "Mac app or web: the same folder.", "Mac app: chat, the Librarian, ⌥Space from anywhere.");
};

export const ep08Web: Film = {
  meta: { title: "ep08Web", W: 1920, H: 1080, fps: 30, bpm: 120, durationFrames: TOTAL, raster: "cpu" },
  assets: { images: {}, fonts: FONTS },
  shots: [
    { id: "title", start: 0, end: TITLE, draw: (c, l, e) => { c.setTransform(e.scale, 0, 0, e.scale, 0, 0); titleCard(c, e, l, l, { no: 8, title: ["Your folder,", "in your browser."], pose: "walking" }); } },
    { id: "demo", start: TITLE, end: DEMO_END, draw: (c, l, e) => { c.setTransform(e.scale, 0, 0, e.scale, 0, 0); demo(c, l + TITLE, e); } },
    { id: "end", start: DEMO_END, end: TOTAL, draw: (c, l, e) => { c.setTransform(e.scale, 0, 0, e.scale, 0, 0); endCard(c, e, DEMO_END + l, l, { pose: "walking" }); } },
  ],
  audio: makeScore({ frames: TOTAL, energeticFrom: 120, endAt: 780, bellAt: [DEMO_END], pops: [[96, 84], [Q.openBtn, 88], [Q.sheet + 4, 84], [Q.pick, 86], [Q.open, 91], [Q.ws + 4, 93], [Q.tick1, 88], [Q.t4[2], 86], [Q.lnk[2], 89], [Q.panel, 91], [Q.tick2, 88], [Q.row, 93], [Q.row + 16, 96], [Q.helper, 86], [Q.cards[0], 84], [Q.cards[1], 86], [Q.cards[2], 88], [Q.folder, 91], [Q.ai, 93], [Q.mac, 86], [Q.web, 89], [Q.same, 93], [Q.same + 8, 96]],
    clicks: [...[Q.url, Q.t4, Q.lnk].flatMap(([a, b]) => Array.from({ length: Math.floor((b - a) / 3) }, (_, i) => a + i * 3))] }),
};

export const ep08Derive: DeriveSpec = {
  no: 8, series: "web",
  vertical: [
    { frame: 160, len: 90, crop: { x: 360, y: 60, w: 1200, h: 790 }, title: "Open your folder.", sub: "Chrome, Edge, and Arc open it directly.", hi: "folder" },
    { frame: 315, len: 105, crop: { x: 590, y: 200, w: 1040, h: 600 }, title: "The same editor.", sub: "Tasks and links, in your browser.", hi: "editor" },
    { frame: 565, len: 105, crop: { x: 130, y: 140, w: 1060, h: 600 }, title: "Rotli Helper.", sub: "For Firefox, Zen, and Brave.", hi: "Helper" },
    { frame: 690, len: 90, crop: { x: 300, y: 60, w: 1320, h: 800 }, title: "The same folder.", sub: "In the Mac app or the browser.", hi: "same folder" },
  ],
  slides: [
    { frame: 214, crop: { x: 360, y: 60, w: 1200, h: 790 }, title: "Open a real folder.", sub: "Chrome, Edge, and Arc open it directly.", hi: "real folder" },
    { frame: 425, crop: { x: 590, y: 200, w: 1040, h: 600 }, title: "The same editor.", sub: "Folders, tasks, and links, in your browser.", hi: "editor" },
    { frame: 545, crop: { x: 1310, y: 200, w: 580, h: 500 }, title: "Your notes stay in your folder.", sub: "No account.", hi: "your folder" },
    { frame: 660, crop: { x: 130, y: 140, w: 1060, h: 600 }, title: "Rotli Helper.", sub: "For Firefox, Zen, and Brave.", hi: "Helper" },
  ],
  single: { frame: 425, crop: { x: 240, y: 14, w: 1440, h: 846 }, title: "Your folder, in your browser.", sub: "Rotli Web: the same editor, no account.", hi: "browser" },
};
