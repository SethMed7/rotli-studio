// EPISODE 03 · HABITS — "Small habits. Big calm." (30 s, 1920x1080)
// Story: ⌥Space summons Rotli over another app and sends it away again; ⌘K finds a note by title
// and by text, best match first; wikilinks connect notes while a link to nothing stays inert; Main
// and the named view "Trip" arrange the same file without copying it.
// Turn: frame 684, the "same file" line drawn between Main and Trip. Token: ferry-times.md.
import type { Ctx, Env } from "./core";
import type { Film } from "./film";
import {
  C,
  FONT,
  clamp01,
  easeInOut,
  fillRR,
  ink,
  lerp,
  measure,
  pop,
  rr,
  seg,
  sparkle,
  text,
  typed,
} from "./rotli/kit";
import type { DeriveSpec } from "./studio/derive";
import { makeScore } from "./studio/score2";
import { drift, endCard, ground, host, lowerThird, titleCard, END, TITLE } from "./studio/series";
import { FONTS } from "./studio/stage";
import { LIGHT as T, appFrame, caret, heading, keys, para, pointer, tagChip, type Rect } from "./studio/ui";
import { useFamilyUI } from "./studio/ui";

// this episode speaks the OCEAN theme family: grounds, UI, captions, accents and the quokka
useFamilyUI("ocean");

const TOTAL = 900,
  DEMO_END = TOTAL - END,
  R = T.roles;
// cue table (frames)
const Q = {
  hot: [120, 180, 215],
  grow: [240, 262], // ⌥Space: show, hide, show; then Rotli grows to full size
  cmdK: 274,
  pal: 278,
  q: 290,
  rows: 295,
  best: 315,
  pick: 362,
  close: 366, // ⌘K palette
  l1: [415, 450, 452],
  l2: [462, 484, 486],
  hov1: 508,
  hov2: 546, // wikilinks
  views: 600,
  grab: 640,
  drop: 668,
  same: 684,
  file: 704,
  out: 722, // Main + Trip
};
const measureW = (t: string) => t.length * 17.5; // General Sans 500 @34px, close enough for an underline
const L1 = "Check [[Ferry times]] before we go.",
  L2 = "Maybe later: [[Someday]]";
const WIN: Rect = { x: 120, y: 110, w: 1680, h: 830 },
  SUMMON: Rect = { x: 360, y: 236, w: 1200, h: 556 };
const PAL: Rect = { x: 660, y: 185, w: 880, h: 430 };
const MAINP: Rect = { x: 610, y: 250, w: 320, h: 400 },
  TRIPP: Rect = { x: 1090, y: 250, w: 320, h: 400 };

// camera keyframes [frame, view x, view y, view width] in logical units; each leg eases
const CAM: [number, number, number, number][] = [
  [90, 0, 0, 1920],
  [244, 24, 12, 1872],
  [270, 415, 30, 1370],
  [366, 432, 42, 1336],
  [400, 104, 170, 1120],
  [592, 112, 176, 1100],
  [620, 405, 122, 1230],
  [Q.out, 415, 129, 1210],
  [748, 0, 0, 1920],
  [780, 12, 7, 1896],
];
const view = (l: number) => {
  if (l <= CAM[0][0]) return CAM[0];
  for (let i = 1; i < CAM.length; i++)
    if (l < CAM[i][0]) {
      const a = CAM[i - 1],
        b = CAM[i],
        k = easeInOut((l - a[0]) / (b[0] - a[0]));
      return [l, lerp(a[1], b[1], k), lerp(a[2], b[2], k), lerp(a[3], b[3], k)];
    }
  return CAM[CAM.length - 1];
};
const camera = (ctx: Ctx, env: Env, l: number) => {
  const [, x, y, w] = view(l),
    s = 1920 / w;
  ctx.setTransform(env.scale * s, 0, 0, env.scale * s, -env.scale * x * s, -env.scale * y * s);
  drift(ctx, env, l);
};

// pointer waypoints [frame, x, y]; "holds" drift a few px so the frame never freezes
const ptr: [number, number, number][] = [
  [318, 1400, 720],
  [348, 1184, 326],
  [372, 1178, 322],
  [400, 1450, 720],
  [488, 1440, 714],
  [508, 752, 358],
  [530, 760, 354],
  [546, 812, 508],
  [560, 818, 504],
  [586, 1060, 560],
  [604, 1070, 556],
  [634, 1124, 480],
  [640, 1124, 480],
  [668, 1124, 360],
  [676, 1128, 362],
  [700, 1300, 612],
  [716, 1310, 618],
];
const ptrAt = (l: number) => {
  if (l <= ptr[0][0]) return { x: ptr[0][1], y: ptr[0][2] };
  for (let i = 1; i < ptr.length; i++)
    if (l < ptr[i][0]) {
      const [f0, x0, y0] = ptr[i - 1],
        [f1, x1, y1] = ptr[i],
        k = easeInOut((l - f0) / (f1 - f0));
      return { x: x0 + (x1 - x0) * k, y: y0 + (y1 - y0) * k };
    }
  const z = ptr[ptr.length - 1];
  return { x: z[1], y: z[2] };
};
const press = (l: number, at: number) => (l >= at && l < at + 12 ? (l - at) / 12 : 0);
/** a key held for 10 frames: travels down over 3, rests, comes back over 3 */
const held = (l: number, at: number) => {
  const d = l - at;
  return d < 0 || d >= 10 ? 0 : d < 3 ? d / 3 : d > 7 ? (10 - d) / 3 : 1;
};
/** keycaps centred on cx (ui.keys draws from the left) */
const chord = (ctx: Ctx, cx: number, y: number, caps: string[], p: number, size: number) => {
  const w = caps.reduce((a, c) => a + Math.max(size * 1.4, measure(ctx, c, size * 0.5, 600) + size * 0.8) + 10, -10);
  keys(ctx, cx - w / 2, y, caps, p, size);
};
const lerpRect = (a: Rect, b: Rect, k: number): Rect => ({
  x: lerp(a.x, b.x, k),
  y: lerp(a.y, b.y, k),
  w: lerp(a.w, b.w, k),
  h: lerp(a.h, b.h, k),
});

/** "some other app": cool grey chrome, no name, no readable words */
const otherApp = (ctx: Ctx, l: number, a: number) => {
  const { x, y, w, h } = { x: 180, y: 178, w: 1480, h: 652 };
  ctx.save();
  ctx.globalAlpha *= a;
  fillRR(ctx, x + 10, y + 16, w, h, 20, "rgba(58,48,40,0.10)");
  fillRR(ctx, x, y, w, h, 20, "#f5f6f8", "#2b231d", 4);
  ctx.save();
  rr(ctx, x, y, w, h, 20);
  ctx.clip();
  ctx.fillStyle = "#e6e9ed";
  ctx.fillRect(x, y, w, 64);
  ctx.fillStyle = "#cfd4da";
  ctx.fillRect(x, y + 64, w, 2);
  [0, 1, 2].forEach((i) => {
    ctx.fillStyle = "#c3c8cf";
    ctx.beginPath();
    ctx.arc(x + 32 + i * 28, y + 32, 9, 0, 6.29);
    ctx.fill();
  });
  fillRR(ctx, x + w / 2 - 110, y + 24, 220, 16, 8, "#cfd4da");
  ctx.fillStyle = "#eceef1";
  ctx.fillRect(x, y + 66, 280, h);
  ctx.fillStyle = "#dde1e6";
  ctx.fillRect(x + 280, y + 66, 2, h);
  for (let i = 0; i < 7; i++)
    fillRR(ctx, x + 30, y + 110 + i * 56, 150 + ((i * 53) % 70), 18, 9, i === 1 ? "#b9c3cf" : "#d5dae0");
  const bars = [620, 860, 800, 720, 0, 840, 700, 780, 540];
  bars.forEach((bw, i) => {
    if (bw) fillRR(ctx, x + 350, y + 120 + i * 58, bw, 20, 10, i === 0 ? "#b9c3cf" : "#dde1e6");
  });
  if (Math.floor(l / 10) % 2 === 0) {
    ctx.fillStyle = "#6b7480";
    ctx.fillRect(x + 350 + 540 + 8, y + 120 + 8 * 58 - 6, 3, 32);
  }
  ctx.restore();
  ctx.restore();
};

/** matched letters in the accent, the rest plain */
const hiText = (ctx: Ctx, s: string, x: number, y: number, q: string, size: number, weight: number, col: string) => {
  const i = q ? s.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (i < 0) {
    text(ctx, s, x, y, { size, weight, color: col });
    return;
  }
  const parts: [string, number, string][] = [
    [s.slice(0, i), weight, col],
    [s.slice(i, i + q.length), 600, R["accent-text"]],
    [s.slice(i + q.length), weight, col],
  ];
  for (const [p, wt, c] of parts) {
    if (!p) continue;
    text(ctx, p, x, y, { size, weight: wt, color: c });
    if (c === R["accent-text"]) {
      ctx.fillStyle = R.accent;
      ctx.fillRect(x, y + 6, measure(ctx, p, size, wt), 3);
    }
    x += measure(ctx, p, size, wt);
  }
};

const RESULTS: [string, string][] = [
  ["Trip plan", "Sat: ferry at 9, then the pink lake"],
  ["Ferry times", "Back from the trip on Sunday, 17:30"],
  ["Packing list", "Snorkel and sunscreen for the trip"],
];
const palette = (ctx: Ctx, l: number) => {
  const n = l < Q.q ? 0 : Math.min(4, 1 + Math.floor((l - Q.q) / 5)),
    q = "trip".slice(0, n),
    { x, y, w, h } = PAL;
  fillRR(ctx, x, y, w, h, 22, R.surface, "#2b231d", 3);
  ctx.save();
  ctx.strokeStyle = R["text-muted"];
  ctx.lineWidth = 3.5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(x + 46, y + 46, 13, 0, 6.29);
  ctx.moveTo(x + 56, y + 56);
  ctx.lineTo(x + 66, y + 66);
  ctx.stroke();
  ctx.restore();
  if (q) text(ctx, q, x + 88, y + 60, { size: 34, color: R.text });
  else text(ctx, "Search notes", x + 88, y + 60, { size: 34, color: R["text-muted"] });
  caret(ctx, T, x + 88 + (q ? measure(ctx, q, 34) : 0), y + 60, l, 36);
  ctx.fillStyle = R.border;
  ctx.fillRect(x + 16, y + 92, w - 32, 2);
  if (n < 2) return;
  RESULTS.forEach(([t, snip], i) => {
    const k = pop(seg(l, Q.rows + i * 4, Q.rows + i * 4 + 12));
    if (k <= 0) return;
    const ry = y + 108 + i * 104;
    ctx.save();
    ctx.globalAlpha *= clamp01(k * 1.5);
    ctx.translate(0, (1 - k) * 14);
    if (i === 0) fillRR(ctx, x + 12, ry, w - 24, 96, 14, R.tint);
    hiText(ctx, t, x + 40, ry + 42, q, 30, 600, R.text);
    hiText(ctx, snip, x + 40, ry + 80, q, 26, 500, R["text-muted"]);
    ctx.restore();
  });
  const b = pop(seg(l, Q.best, Q.best + 12));
  if (b > 0) {
    const s = "Best match",
      bw = measure(ctx, s, 22, 600) + 28;
    ctx.save();
    ctx.translate(x + w - 36 - bw / 2, y + 108 + 36);
    ctx.scale(b, b);
    fillRR(ctx, -bw / 2, -19, bw, 38, 19, R.surface, R.accent, 2);
    text(ctx, s, 0, 8, { size: 22, weight: 600, align: "center", color: R["accent-text"] });
    ctx.restore();
  }
};

/** raw wikilink Markdown: the brackets in the accent, mono. Returns the caret x. */
const rawLinks = (ctx: Ctx, x: number, y: number, s: string, alpha = 1) => {
  for (const p of s.split(/(\[\[|\]\])/)) {
    if (!p) continue;
    const br = p === "[[" || p === "]]";
    text(ctx, p, x, y, { size: 32, font: FONT.mono, color: br ? R["accent-text"] : R.text, alpha });
    x += measure(ctx, p, 32, 500, FONT.mono);
  }
  return x;
};
const popChip = (ctx: Ctx, x: number, y: number, k: number, label: string, bg: string, fg: string, border?: string) => {
  if (k <= 0) return;
  const w = measure(ctx, label, 24, 600) + 26;
  ctx.save();
  ctx.translate(x + w / 2, y + 19);
  ctx.scale(k, k);
  fillRR(ctx, -w / 2, -19, w, 38, 19, bg, border, 2);
  text(ctx, label, 0, 8, { size: 24, weight: 600, align: "center", color: fg });
  ctx.restore();
};

const ferryNote = (ctx: Ctx, E: Rect, l: number) => {
  heading(ctx, T, E.x, E.y + 82, "Ferry times", 58);
  para(ctx, T, E.x, E.y + 164, "Saturday   9:00   harbour to island");
  para(ctx, T, E.x, E.y + 220, "Sunday   17:30   island to harbour");
  para(ctx, T, E.x, E.y + 290, "Tickets at the kiosk by the pier.", { muted: true });
  caret(ctx, T, E.x + measure(ctx, "Tickets at the kiosk by the pier.", 30), E.y + 290, l, 32);
};

const tripNote = (ctx: Ctx, E: Rect, l: number) => {
  const X = E.x;
  heading(ctx, T, X, 262, "Trip plan", 58);
  // line 1: typed raw, then rendered as a live link
  if (l >= Q.l1[0]) {
    const m = seg(l, Q.l1[2], Q.l1[2] + 6);
    if (m < 1) {
      const cx = rawLinks(ctx, X, 370, typed(L1, seg(l, Q.l1[0], Q.l1[1])), 1 - m);
      if (l < Q.l1[2]) caret(ctx, T, cx, 370, l);
    }
    if (m > 0) {
      ctx.save();
      ctx.globalAlpha *= m;
      const pre = "Check ",
        w0 = measure(ctx, pre, 34),
        lw = measure(ctx, "Ferry times", 34, 600),
        hov = seg(l, Q.hov1 - 4, Q.hov1 + 2) * (1 - seg(l, Q.hov2 - 14, Q.hov2 - 8));
      if (hov > 0) {
        ctx.save();
        ctx.globalAlpha *= hov;
        fillRR(ctx, X + w0 - 8, 334, lw + 16, 50, 10, R.tint);
        ctx.restore();
      }
      text(ctx, pre, X, 370, { size: 34, color: R.text });
      text(ctx, "Ferry times", X + w0, 370, { size: 34, weight: 600, color: R["accent-text"] });
      ctx.fillStyle = R.accent;
      ctx.fillRect(X + w0, 378, lw, 3);
      text(ctx, " before we go.", X + w0 + lw, 370, { size: 34, color: R.text });
      ctx.restore();
      popChip(
        ctx,
        X + w0,
        404,
        pop(seg(l, Q.hov1 + 4, Q.hov1 + 18)),
        "links to ferry-times.md",
        R.tint,
        R["accent-text"],
      );
    }
  }
  // line 2: a link to a note that does not exist renders inert
  if (l >= Q.l2[0]) {
    const m = seg(l, Q.l2[2], Q.l2[2] + 6);
    if (m < 1) {
      const cx = rawLinks(ctx, X, 520, typed(L2, seg(l, Q.l2[0], Q.l2[1])), 1 - m);
      if (l < Q.l2[2]) caret(ctx, T, cx, 520, l);
    }
    if (m > 0) {
      const pre = "Maybe later: ",
        w0 = measure(ctx, pre, 34);
      text(ctx, pre, X, 520, { size: 34, color: R.text, alpha: m });
      text(ctx, "Someday", X + w0, 520, { size: 34, color: R["text-muted"], alpha: m });
      // an unresolvable link renders dimmed with a dashed underline in the app ("missing"), never live
      ctx.save();
      ctx.globalAlpha *= m * 0.8;
      ctx.setLineDash([6, 5]);
      ctx.strokeStyle = R["text-muted"];
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(X + w0, 528);
      ctx.lineTo(X + w0 + measureW("Someday"), 528);
      ctx.stroke();
      ctx.restore();
      popChip(
        ctx,
        X + w0,
        554,
        pop(seg(l, Q.hov2 + 4, Q.hov2 + 18)),
        "no note yet · stays inert",
        R["surface-2"],
        R["text-muted"],
        R.border,
      );
    }
  }
};

const docIcon = (ctx: Ctx, x: number, y: number) => {
  fillRR(ctx, x, y, 22, 28, 4, R.surface, R["text-muted"], 3);
  ctx.fillStyle = R["text-muted"];
  ctx.fillRect(x + 5, y + 10, 12, 3);
  ctx.fillRect(x + 5, y + 17, 9, 3);
};
const slotY = (p: Rect, i: number) => p.y + 86 + i * 60;
const listRow = (ctx: Ctx, p: Rect, y: number, name: string, on: number, lift = 0) => {
  if (on > 0) {
    ctx.save();
    ctx.globalAlpha *= on;
    fillRR(ctx, p.x + 10 + lift, y + 4, p.w - 20, 52, 12, R.tint, lift ? R.accent : undefined, 2);
    ctx.restore();
  }
  docIcon(ctx, p.x + 28 + lift, y + 16);
  text(ctx, name, p.x + 66 + lift, y + 41, { size: 28, weight: on > 0.5 ? 600 : 500, color: R.text });
};
const listPanel = (ctx: Ctx, p: Rect, title: string, isView: boolean) => {
  fillRR(ctx, p.x, p.y, p.w, p.h, 18, R.surface, R.border, 2);
  text(ctx, title, p.x + 28, p.y + 52, { size: 30, weight: 600, color: R.text });
  if (isView) tagChip(ctx, T, p.x + 40 + measure(ctx, title, 30, 600), p.y + 50, "view", 20);
  ctx.fillStyle = R.border;
  ctx.fillRect(p.x + 16, p.y + 74, p.w - 32, 2);
};
const views = (ctx: Ctx, l: number) => {
  listPanel(ctx, MAINP, "Main", false);
  listPanel(ctx, TRIPP, "Trip", true);
  const same = seg(l, Q.same, Q.same + 8);
  ["Trip plan", "Ferry times", "Packing list", "Reading list", "Recipes"].forEach((n, i) =>
    listRow(ctx, MAINP, slotY(MAINP, i), n, n === "Ferry times" ? same : 0),
  );
  // the Trip view is rearranged by hand: Ferry times dragged to the top. Main does not move.
  const k = easeInOut(seg(l, Q.grab + 2, Q.drop)),
    lifted = l >= Q.grab && l < Q.drop + 4 ? 8 : 0;
  const trip: [string, number][] = [
    ["Trip plan", lerp(0, 1, k)],
    ["Packing list", lerp(1, 2, k)],
  ];
  for (const [n, s] of trip) listRow(ctx, TRIPP, TRIPP.y + 86 + s * 60, n, 0);
  listRow(ctx, TRIPP, TRIPP.y + 86 + lerp(2, 0, k) * 60, "Ferry times", seg(l, Q.grab, Q.grab + 4), lifted);
  // the turn: one file, two arrangements
  const c = seg(l, Q.same, Q.same + 14);
  if (c > 0)
    ink(
      ctx,
      [
        [MAINP.x + MAINP.w + 2, slotY(MAINP, 1) + 30],
        [990, slotY(MAINP, 1) + 26],
        [1030, slotY(TRIPP, 0) + 34],
        [TRIPP.x - 2, slotY(TRIPP, 0) + 30],
      ],
      { w: 4, color: C.clay, seed: 31, frame: l, progress: c, wob: 0.6 },
    );
  const sk = pop(seg(l, Q.same + 10, Q.same + 24));
  if (sk > 0) {
    const s = "same file",
      sw = measure(ctx, s, 22, 600) + 26;
    ctx.save();
    ctx.translate(1010, 396);
    ctx.scale(sk, sk);
    fillRR(ctx, -sw / 2, -19, sw, 38, 19, R.surface, C.clay, 2);
    text(ctx, s, 0, 8, { size: 22, weight: 600, align: "center", color: R["accent-text"] });
    ctx.restore();
  }
  const fk = pop(seg(l, Q.file, Q.file + 14));
  if (fk > 0) {
    ctx.save();
    ctx.translate(1010, 200);
    ctx.scale(fk, fk);
    fillRR(ctx, -160, -30, 320, 58, 29, C.clay, C.ink, 3);
    text(ctx, "ferry-times.md", 0, 9, { size: 27, weight: 600, align: "center", color: C.surface, font: FONT.mono });
    ctx.restore();
  }
};

/** Rotli's window visibility through the ⌥Space show / hide / show */
const rotliVis = (l: number) => {
  const show = (at: number) => {
    const t = seg(l, at + 4, at + 14);
    return { a: clamp01(t * 2), s: 0.94 + 0.06 * pop(t) };
  };
  if (l < Q.hot[0] + 4) return { a: 0, s: 1 };
  if (l < Q.hot[1] + 4) return show(Q.hot[0]);
  if (l < Q.hot[2] + 4) {
    const t = seg(l, Q.hot[1] + 4, Q.hot[1] + 12);
    return { a: 1 - t, s: 1 - 0.05 * easeInOut(t) };
  }
  return show(Q.hot[2]);
};
const rotli = (ctx: Ctx, l: number, r: Rect) => {
  const note = l < Q.close + 4 ? "ferry" : l < Q.views - 4 ? "trip" : "views";
  const E = appFrame(ctx, T, r, {
    notes: ["Trip plan", "Ferry times", "Packing list"],
    active: note === "trip" ? 0 : 1,
    title: note === "ferry" ? "ferry-times.md" : note === "trip" ? "trip-plan.md" : undefined,
  });
  if (note === "ferry") ferryNote(ctx, E, l);
  const ta = l < Q.close + 4 ? 0 : 1 - seg(l, Q.views - 10, Q.views - 2);
  if (ta > 0) {
    ctx.save();
    ctx.globalAlpha *= ta;
    tripNote(ctx, E, l);
    ctx.restore();
  }
  if (note === "views") {
    ctx.save();
    ctx.globalAlpha *= seg(l, Q.views - 4, Q.views + 6);
    views(ctx, l);
    ctx.restore();
  }
  // the ⌘K palette over a flat scrim
  const pa = seg(l, Q.pal, Q.pal + 8) * (1 - seg(l, Q.close, Q.close + 10));
  if (pa > 0) {
    ctx.save();
    rr(ctx, r.x, r.y, r.w, r.h, 26);
    ctx.clip();
    ctx.fillStyle = `rgba(58,48,40,${0.12 * pa})`;
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.restore();
    const s = 0.96 + 0.04 * pop(seg(l, Q.pal, Q.pal + 12)),
      cx = PAL.x + PAL.w / 2,
      cy = PAL.y + PAL.h / 2;
    ctx.save();
    ctx.globalAlpha *= pa;
    ctx.translate(cx, cy);
    ctx.scale(s, s);
    ctx.translate(-cx, -cy);
    palette(ctx, l);
    ctx.restore();
  }
};

const demo = (ctx: Ctx, l: number, env: Env) => {
  ground(ctx, l);
  camera(ctx, env, l);
  const oa = 1 - seg(l, 246, 262);
  if (oa > 0) otherApp(ctx, l, oa);
  const v = rotliVis(l);
  if (v.a > 0) {
    const r = lerpRect(SUMMON, WIN, easeInOut(seg(l, Q.grow[0], Q.grow[1]))),
      cx = r.x + r.w / 2,
      cy = r.y + r.h / 2;
    ctx.save();
    ctx.globalAlpha *= v.a;
    ctx.translate(cx, cy);
    ctx.scale(v.s, v.s);
    ctx.translate(-cx, -cy);
    rotli(ctx, l, r);
    ctx.restore();
  }
  // ⌥ Space, top centre, over the desktop
  const ka = seg(l, 98, 108) * (1 - seg(l, 236, 246));
  if (ka > 0) {
    ctx.save();
    ctx.globalAlpha *= ka;
    chord(ctx, 960, 48, ["⌥", "Space"], Math.max(...Q.hot.map((at) => held(l, at))), 64);
    ctx.restore();
  }
  // ⌘ K, in the middle of the editor, handing over to the palette
  const kb = seg(l, 252, 260) * (1 - seg(l, Q.pal, Q.pal + 8));
  if (kb > 0) {
    ctx.save();
    ctx.globalAlpha *= kb;
    chord(ctx, 1100, 360, ["⌘", "K"], held(l, Q.cmdK), 64);
    ctx.restore();
  }
  if (l >= Q.pick && l < Q.pick + 14) sparkle(ctx, 1170, 316, 18 * (1 - (l - Q.pick) / 14), C.clay, l / 5);
  // the host quokka, screen space, bottom right; it takes up the payoff pose when the file lands
  ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
  host(ctx, env, l, {
    pose:
      l < 255
        ? "attention"
        : l < 400
          ? "searching"
          : l < Q.views
            ? "thoughtful"
            : l < Q.file
              ? "base"
              : "knowledge_system",
  });
  camera(ctx, env, l);
  if (l >= 318 && l < 716) {
    const p = ptrAt(l);
    pointer(ctx, p.x, p.y, press(l, Q.pick) || press(l, Q.grab) || press(l, Q.drop));
  }
  ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
  lowerThird(ctx, l, 100, 244, "Open or hide Rotli from anywhere on your Mac.", "Press ⌥ Space.");
  lowerThird(ctx, l, 256, 402, "Search titles and text across the whole vault.", "Best match first.");
  lowerThird(ctx, l, 412, 596, "Wikilinks connect notes.", "A link to nothing looks inert, never live.");
  lowerThird(ctx, l, 606, 776, "Main and named views arrange the same files", "without copying them.");
};

export const ep03Habits: Film = {
  meta: { title: "ep03Habits", W: 1920, H: 1080, fps: 30, bpm: 120, durationFrames: TOTAL, raster: "cpu" },
  assets: { images: {}, fonts: FONTS },
  shots: [
    {
      id: "title",
      start: 0,
      end: TITLE,
      draw: (c, l, e) => {
        c.setTransform(e.scale, 0, 0, e.scale, 0, 0);
        titleCard(c, e, l, l, { no: 3, title: ["Small habits.", "Big calm."], pose: "searching" });
      },
    },
    {
      id: "demo",
      start: TITLE,
      end: DEMO_END,
      draw: (c, l, e) => {
        c.setTransform(e.scale, 0, 0, e.scale, 0, 0);
        demo(c, l + TITLE, e);
      },
    },
    {
      id: "end",
      start: DEMO_END,
      end: TOTAL,
      draw: (c, l, e) => {
        c.setTransform(e.scale, 0, 0, e.scale, 0, 0);
        endCard(c, e, DEMO_END + l, l, { pose: "searching" });
      },
    },
  ],
  audio: makeScore({
    frames: TOTAL,
    energeticFrom: 120,
    endAt: 780,
    bellAt: [DEMO_END],
    pops: [
      [Q.hot[0], 79],
      [Q.hot[0] + 6, 84],
      [Q.hot[1], 76],
      [Q.hot[2], 79],
      [Q.hot[2] + 6, 84],
      [Q.cmdK, 81],
      [Q.pal, 84],
      [Q.rows, 86],
      [Q.rows + 4, 88],
      [Q.rows + 8, 91],
      [Q.best, 93],
      [Q.pick, 91],
      [Q.l1[2], 88],
      [Q.l2[2], 86],
      [Q.hov1 + 4, 91],
      [Q.hov2 + 4, 84],
      [Q.grab, 84],
      [Q.drop, 88],
      [Q.same, 91],
      [Q.same + 10, 93],
      [Q.file, 96],
    ],
    clicks: [
      ...[0, 1, 2, 3].map((i) => Q.q + i * 5),
      ...[Q.l1, Q.l2].flatMap(([a, b]) => Array.from({ length: Math.floor((b - a) / 3) }, (_, i) => a + i * 3)),
    ],
  }),
};

export const ep03Derive: DeriveSpec = {
  no: 3,
  series: "habits",
  vertical: [
    {
      frame: 105,
      len: 135,
      crop: { x: 250, y: 0, w: 1420, h: 850 },
      title: "Open or hide Rotli.",
      sub: "⌥ Space, from anywhere on your Mac.",
      hi: "anywhere",
    },
    {
      frame: 270,
      len: 90,
      crop: { x: 290, y: 100, w: 1340, h: 760 },
      title: "Search the whole vault.",
      sub: "Titles and text, best match first.",
      hi: "best match",
    },
    {
      frame: 412,
      len: 180,
      crop: { x: 590, y: 20, w: 1040, h: 790 },
      title: "Wikilinks connect notes.",
      sub: "A link to nothing stays inert.",
      hi: "connect",
    },
    {
      frame: 620,
      len: 105,
      crop: { x: 240, y: 10, w: 1410, h: 850 },
      title: "Same files, many views.",
      sub: "Main and named views, no copies.",
      hi: "Same files",
    },
  ],
  slides: [
    {
      frame: 170,
      crop: { x: 250, y: 0, w: 1420, h: 850 },
      title: "Open or hide Rotli.",
      sub: "⌥ Space, from anywhere on your Mac.",
      hi: "anywhere",
    },
    {
      frame: 355,
      crop: { x: 290, y: 100, w: 1340, h: 760 },
      title: "Search the whole vault.",
      sub: "Titles and text, best match first.",
      hi: "best match",
    },
    {
      frame: 585,
      crop: { x: 590, y: 20, w: 1040, h: 790 },
      title: "Wikilinks connect notes.",
      sub: "A link to nothing stays inert.",
      hi: "connect",
    },
    {
      frame: 718,
      crop: { x: 240, y: 10, w: 1410, h: 850 },
      title: "Same files, many views.",
      sub: "Main and named views, no copies.",
      hi: "Same files",
    },
  ],
  single: {
    frame: 355,
    crop: { x: 230, y: 40, w: 1460, h: 820 },
    title: "Small habits.",
    sub: "Big calm.",
    hi: "calm",
  },
};
