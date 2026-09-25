// SHOTS 3, 4, 6 and 8: inside Rotli. ⌥Space opens a calm window, the note renders as it is
// typed, it becomes a plain file in one folder, views are shelves over that folder, and Chat
// answers from it.
import type { Ctx, Env } from "../core";
import { actor, hopAlong, poseAt } from "./actor";
import {
  C,
  FONT,
  H,
  W,
  appWindow,
  backOut,
  beatLabel,
  card,
  chip,
  easeIn,
  easeInOut,
  easeOut,
  fillRR,
  folder,
  ink,
  key,
  lerp,
  measure,
  paperGround,
  pop,
  rr,
  seg,
  sparkle,
  text,
  typed,
} from "./kit";

const flat = (ctx: Ctx, env: Env) => ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
const caret = (ctx: Ctx, x: number, y: number, f: number, size = 32) => {
  if (Math.floor(f / 8) % 2 === 0) {
    ctx.fillStyle = C.clay;
    ctx.fillRect(x + 2, y - size * 0.8, 3, size);
  }
};
/** raw markdown, typed: syntax characters in clay, prose in cocoa, all mono */
const rawLine = (ctx: Ctx, s: string, x: number, y: number, syntax: number, alpha = 1) => {
  const a = s.slice(0, syntax),
    b = s.slice(syntax);
  text(ctx, a, x, y, { size: 30, weight: 500, font: FONT.mono, color: C.clay, alpha });
  text(ctx, b, x + measure(ctx, a, 30, 500, FONT.mono), y, {
    size: 30,
    weight: 500,
    font: FONT.mono,
    color: C.cocoa,
    alpha,
  });
  return x + measure(ctx, s, 30, 500, FONT.mono);
};
const checkbox = (ctx: Ctx, x: number, y: number, state: "x" | "/" | " ", tick: number, alpha = 1) => {
  ctx.save();
  ctx.globalAlpha *= alpha;
  if (state === "x") {
    fillRR(ctx, x, y - 26, 32, 32, 8, tick > 0 ? C.olive : C.surface, tick > 0 ? C.oliveText : C.muted, 3);
    if (tick > 0)
      ink(
        ctx,
        [
          [x + 7, y - 10],
          [x + 14, y - 3],
          [x + 26, y - 18],
        ],
        { w: 4.5, color: C.surface, progress: tick, wob: 0.2, boil: 0 },
      );
  } else if (state === "/") {
    fillRR(ctx, x, y - 26, 32, 32, 8, C.surface, C.clay, 3);
    ctx.save();
    rr(ctx, x, y - 26, 32, 32, 8);
    ctx.clip();
    ctx.fillStyle = C.clay;
    ctx.fillRect(x, y - 26, 16, 32);
    ctx.restore();
  } else fillRR(ctx, x, y - 26, 32, 32, 8, C.surface, C.muted, 3);
  ctx.restore();
};

/** an Excalidraw-style board, inserted by the slash menu: a box, a circle, an arrow, drawn by hand */
const board = (ctx: Ctx, x: number, y: number, s: number, f: number) => {
  if (s <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  fillRR(ctx, 0, 0, 560, 200, 16, C.linen, C.border, 3);
  text(ctx, "Board", 18, 32, { size: 20, weight: 600, color: C.muted });
  ink(
    ctx,
    [
      [40, 70],
      [210, 66],
      [214, 160],
      [44, 164],
      [40, 70],
    ],
    { w: 4, seed: 71, frame: f, fill: C.peach },
  );
  text(ctx, "ferry", 92, 124, { size: 24, weight: 600 });
  ink(
    ctx,
    [
      [222, 116],
      [300, 110],
      [330, 114],
    ],
    { w: 4, seed: 72, frame: f },
  );
  ink(
    ctx,
    [
      [314, 100],
      [332, 114],
      [314, 128],
    ],
    { w: 4, seed: 73, frame: f },
  );
  ctx.beginPath();
  ctx.ellipse(430, 116, 86, 52, 0, 0, 6.29);
  ctx.fillStyle = "#cfeee9";
  ctx.fill();
  ink(
    ctx,
    Array.from(
      { length: 13 },
      (_, i) => [430 + Math.cos((i / 12) * 6.283) * 86, 116 + Math.sin((i / 12) * 6.283) * 52] as [number, number],
    ),
    { w: 4, seed: 74, frame: f },
  );
  text(ctx, "island", 430, 124, { size: 24, weight: 600, align: "center" });
  ctx.restore();
};

// ---------------------------------------------------------------- 3 · just write (300-510)
type Ln = {
  raw: string;
  syn: number;
  t0: number;
  t1: number;
  r: number;
  kind: "h1" | "task" | "link" | "slash";
  state?: "x" | "/" | " ";
  label?: string;
};
const LINES: Ln[] = [
  { raw: "# Trip ideas", syn: 2, t0: 22, t1: 40, r: 44, kind: "h1" },
  { raw: "- [x] book the ferry", syn: 6, t0: 50, t1: 68, r: 70, kind: "task", state: "x", label: "book the ferry" },
  { raw: "- [/] pack a snorkel", syn: 6, t0: 80, t1: 94, r: 96, kind: "task", state: "/", label: "pack a snorkel" },
  {
    raw: "- [ ] find the pink lake",
    syn: 6,
    t0: 100,
    t1: 116,
    r: 118,
    kind: "task",
    state: " ",
    label: "find the pink lake",
  },
  { raw: "see [[Rott", syn: 4, t0: 126, t1: 138, r: 162, kind: "link" },
  { raw: "/", syn: 1, t0: 172, t1: 174, r: 999, kind: "slash" },
];
export const shotWrite = (F0: number) => (ctx: Ctx, l: number, env: Env) => {
  const f = F0 + l;
  flat(ctx, env);
  paperGround(ctx, f);
  // the press that turned the film: keys slam, a ring clears the air
  if (l < 14) {
    const p = easeOut(l / 4),
      fade = 1 - seg(l, 6, 14);
    ctx.save();
    ctx.globalAlpha = fade;
    key(ctx, 610, 430, 190, 170, "⌥", p);
    key(ctx, 830, 430, 480, 170, "space", p);
    ctx.restore();
  }
  const ring = seg(l, 2, 22);
  if (ring > 0 && ring < 1) {
    ctx.save();
    ctx.globalAlpha = 1 - ring;
    ctx.strokeStyle = C.clay;
    ctx.lineWidth = 10 * (1 - ring) + 2;
    ctx.beginPath();
    ctx.arc(960, 520, 60 + ring * 900, 0, 6.29);
    ctx.stroke();
    ctx.restore();
  }
  // the window opens out of the keypress
  const o = pop(seg(l, 6, 26));
  if (o <= 0) {
    beatLabel(ctx, f, l, 3, "just write", "⌥Space, and markdown renders as you type");
    return;
  }
  const X = 140,
    Y = 180,
    Wd = 1260,
    Hd = 760;
  ctx.save();
  ctx.translate(960, 540);
  ctx.scale(lerp(0.3, 1, o), lerp(0.3, 1, o));
  ctx.translate(-960, -540);
  ctx.globalAlpha = Math.min(1, o * 1.5);
  appWindow(ctx, X - 150 + 150, Y, Wd, Hd, { frame: f });
  const ex = X + 300 + 64;
  let y = Y + 124,
    caretAt: [number, number] | null = null;
  for (const ln of LINES) {
    if (l < ln.t0) break;
    const tt = seg(l, ln.t0, ln.t1),
      s = typed(ln.raw, tt),
      morph = easeOut(seg(l, ln.r, ln.r + 6));
    if (ln.kind === "h1") {
      if (morph < 1) {
        const end = rawLine(ctx, s, ex, y, ln.syn, 1 - morph);
        if (l < ln.r) caretAt = [end, y];
      }
      if (morph > 0)
        text(ctx, "Trip ideas", ex, y + 8 - 6 * (1 - morph), { size: 58, weight: 600, color: C.cocoa, alpha: morph });
      y += 88;
      continue;
    }
    if (ln.kind === "task") {
      if (morph < 1) {
        const end = rawLine(ctx, s, ex, y, ln.syn, 1 - morph);
        if (l < ln.r) caretAt = [end, y];
      }
      if (morph > 0) {
        const tick = ln.state === "x" ? easeOut(seg(l, ln.r + 8, ln.r + 16)) : 0;
        checkbox(ctx, ex, y, ln.state!, tick, morph);
        text(ctx, ln.label!, ex + 50, y, {
          size: 30,
          weight: 500,
          color: ln.state === "x" && tick > 0 ? C.muted : C.cocoa,
          alpha: morph,
        });
        if (ln.state === "x" && tick > 0) {
          ctx.fillStyle = C.muted;
          ctx.fillRect(ex + 50, y - 10, measure(ctx, ln.label!, 30) * tick, 3);
        }
        if (ln.state === "/")
          chip(ctx, ex + 60 + measure(ctx, ln.label!, 30), y - 30, "in progress", { size: 18, alpha: morph });
      }
      y += 60;
      continue;
    }
    if (ln.kind === "link") {
      y += 18;
      if (l < ln.r) {
        const end = rawLine(ctx, s, ex, y, 0);
        caretAt = [end, y];
        const pk = pop(seg(l, 140, 150));
        if (pk > 0) {
          ctx.save();
          ctx.globalAlpha = Math.min(1, pk * 1.4);
          const px = ex + 90,
            py = y + 18;
          fillRR(ctx, px, py, 360, 158, 14, C.surface, C.ink, 3);
          ["Rottnest", "Rottnest ferry times", "Reading list"].forEach((it, i) => {
            if (i === (l < 152 ? 1 : 0)) fillRR(ctx, px + 8, py + 8 + i * 48, 344, 44, 10, C.peach);
            text(ctx, it, px + 22, py + 40 + i * 48, { size: 22, weight: i === 0 ? 600 : 500 });
          });
          ctx.restore();
        }
      } else {
        const m = easeOut(seg(l, ln.r, ln.r + 6));
        text(ctx, "see", ex, y, { size: 30, weight: 500 });
        const lx = ex + measure(ctx, "see ", 30);
        text(ctx, "Rottnest", lx, y, { size: 30, weight: 600, color: C.clayText });
        ctx.fillStyle = C.clay;
        ctx.fillRect(lx, y + 6, measure(ctx, "Rottnest", 30, 600) * m, 3);
        sparkle(
          ctx,
          lx + measure(ctx, "Rottnest", 30, 600) + 18,
          y - 22,
          12 * (1 - seg(l, ln.r + 6, ln.r + 20)),
          C.clay,
          l / 6,
        );
      }
      y += 64;
      continue;
    }
    if (ln.kind === "slash") {
      if (l >= 198) {
        board(ctx, ex, y - 30, pop(seg(l, 198, 208)), f);
        continue;
      }
      const end = rawLine(ctx, "/", ex, y, 1);
      caretAt = [end, y];
      const mn = pop(seg(l, 176, 188)) * (1 - seg(l, 196, 199));
      if (mn > 0) {
        const px = ex + 20,
          py = y + 16,
          items = ["Table", "Board", "Task", "Mermaid", "Embed"],
          sel = l < 188 ? 0 : 1;
        ctx.save();
        ctx.globalAlpha = Math.min(1, mn * 1.4);
        ctx.translate(px, py);
        ctx.scale(lerp(0.9, 1, mn), lerp(0.9, 1, mn));
        fillRR(ctx, 0, 0, 300, 250, 14, C.surface, C.ink, 3);
        items.forEach((it, i) => {
          if (i === sel) fillRR(ctx, 8, 8 + i * 47, 284, 43, 10, C.peach);
          text(ctx, ["▦", "✎", "☐", "◇", "⧉"][i], 26, 38 + i * 47, { size: 22, color: C.clayText });
          text(ctx, it, 62, 38 + i * 47, { size: 22, weight: i === sel ? 600 : 500 });
        });
        ctx.restore();
      }
    }
  }
  if (caretAt) caret(ctx, caretAt[0], caretAt[1], f);
  ctx.restore();
  // the quokka writes along beside the window
  const h = hopAlong(
    l,
    [
      [10, 2150, 1010],
      [30, 1660, 1010],
    ],
    120,
  );
  const p = poseAt(l, [
    [0, "walking"],
    [32, "notes"],
  ]);
  const scribble = p.pose === "notes" ? 1 + 0.03 * Math.abs(Math.sin(l * 0.8)) : 1;
  actor(ctx, env, f, {
    pose: p.pose,
    x: h.x,
    y: h.y,
    h: 500,
    lift: h.lift,
    squash: h.squash * p.squash * scribble,
    flip: p.pose === "walking",
    lean: p.pose === "notes" ? Math.sin(l / 6) * 3.5 : 0,
  });
  beatLabel(ctx, f, l, 3, "just write", "⌥Space, and markdown renders as you type");
};

// ---------------------------------------------------------------- 4 · one folder is your vault (510-720)
const TREE = [
  ["your vault/", ""],
  ["├─ wiki/", "the Library"],
  ["├─ chats/", "conversations"],
  ["├─ storage/", "boards · docs · images"],
  ["└─ .rotli/", "rebuildable"],
] as const;
export const shotVault = (F0: number) => (ctx: Ctx, l: number, env: Env) => {
  const f = F0 + l;
  flat(ctx, env);
  paperGround(ctx, f, C.surface2, 0.5);
  const FX = 250,
    FY = 400,
    FW = 640,
    FH = 440,
    open = 1 - easeInOut(seg(l, 96, 118)) * 0.8;
  folder(ctx, FX, FY, FW, FH, { label: "your vault", front: false });
  // the token note flies from where the window was and drops into the folder; others follow
  const fly = easeInOut(seg(l, 4, 40)),
    drop = easeIn(seg(l, 40, 54));
  if (l < 56)
    card(ctx, {
      x: lerp(960, FX + FW * 0.45, fly),
      y: lerp(520, FY - 60, fly) - Math.sin(fly * Math.PI) * 160 + drop * 220,
      rot: lerp(0, -0.12, fly),
      scale: lerp(1.9, 1.1, fly),
      title: "Trip ideas",
      token: true,
      lines: 3,
      seed: 4,
      frame: f,
    });
  const others = ["Ferry times", "Reading list", "Quokka facts"];
  others.forEach((t, i) => {
    const t0 = 56 + i * 10,
      k = seg(l, t0, t0 + 16);
    if (k > 0 && k < 1)
      card(ctx, {
        x: FX + 180 + i * 150,
        y: lerp(-100, FY + 160, easeIn(k)),
        rot: 0.2 - i * 0.18,
        scale: 0.9,
        title: t,
        lines: 2,
        seed: 20 + i,
        frame: f,
      });
  });
  // peeking tabs of what is inside
  for (let i = 0; i < 4; i++) {
    const up = easeOut(seg(l, 50 + i * 10, 66 + i * 10));
    if (up > 0)
      fillRR(
        ctx,
        FX + 70 + i * 132,
        FY + 62 - up * (44 + 10 * Math.sin(l / 7 + i * 1.3)),
        118,
        80,
        10,
        i === 0 ? C.surface : C.linen,
        C.ink,
        3,
      );
  }
  folder(ctx, FX, FY, FW, FH, { open, back: false });
  // the tree inks in, one line per beat
  const TX = 1000,
    TY = 330;
  TREE.forEach(([a, b], i) => {
    const t0 = 70 + i * 14;
    if (l < t0) return;
    const k = seg(l, t0, t0 + 10);
    text(ctx, typed(a, k), TX, TY + i * 62, {
      size: 34,
      weight: 600,
      font: FONT.mono,
      color: i === 0 ? C.clayText : C.cocoa,
    });
    if (b)
      text(ctx, b, TX + 290, TY + i * 62, { size: 28, weight: 500, color: C.muted, alpha: seg(l, t0 + 6, t0 + 14) });
  });
  // three promises
  ["plain .md files", "open in any editor", "yours to keep"].forEach((c, i) => {
    const s = pop(seg(l, 150 + i * 10, 164 + i * 10));
    if (s > 0) {
      ctx.save();
      ctx.translate(FX + 20 + i * 230, 915);
      ctx.scale(s, s);
      chip(ctx, 0, 0, c, {
        size: 24,
        bg: i === 2 ? C.clay : C.surface,
        fg: i === 2 ? C.surface : C.cocoa,
        border: C.ink,
      });
      ctx.restore();
    }
  });
  const h = hopAlong(
    l,
    [
      [0, 2100, 1010],
      [22, 1480, 1010],
    ],
    120,
  );
  const p = poseAt(l, [
    [0, "walking"],
    [24, "inbox"],
    [54, "celebrating"],
    [96, "base"],
    [150, "waving"],
  ]);
  actor(ctx, env, f, {
    pose: p.pose,
    x: h.x,
    y: h.y,
    h: 380,
    lift: h.lift,
    squash: h.squash * p.squash,
    flip: p.pose === "walking",
    lean: p.pose === "waving" ? Math.sin(l / 5) * 3 : p.pose === "base" ? Math.sin(l / 8) * 2 : 0,
  });
  beatLabel(ctx, f, l, 4, "one folder is your vault", "every note is a plain file you own");
};

// ---------------------------------------------------------------- 6 · your views, your shelf (960-1140)
const ROWS = ["Trip ideas", "Ferry times", "Reading list", "Quokka facts", "Old draft"];
export const shotViews = (F0: number) => (ctx: Ctx, l: number, env: Env) => {
  const f = F0 + l;
  flat(ctx, env);
  paperGround(ctx, f, "#dfe6d3", 0.55);
  const PX = 150,
    PY = 200,
    PW = 600,
    PHt = 740;
  fillRR(ctx, PX + 10, PY + 14, PW, PHt, 24, "rgba(58,48,40,0.12)");
  fillRR(ctx, PX, PY, PW, PHt, 24, C.surface, C.ink, 4);
  // tabs: Main, then a named view pops in
  fillRR(ctx, PX + 28, PY + 26, 120, 50, 25, C.peach);
  text(ctx, "Main", PX + 88, PY + 60, { size: 26, weight: 600, align: "center" });
  const tv = pop(seg(l, 36, 48));
  if (tv > 0) {
    ctx.save();
    ctx.translate(PX + 230, PY + 51);
    ctx.scale(tv, tv);
    fillRR(ctx, -62, -25, 124, 50, 25, C.surface, C.clay, 3);
    text(ctx, "Trip", 0, 9, { size: 26, weight: 600, align: "center", color: C.clayText });
    ctx.restore();
    text(ctx, "+ named view", PX + 320, PY + 60, { size: 22, color: C.muted, alpha: seg(l, 44, 54) });
  }
  // folder + trash on the right: where rows go when they leave the shelf
  const FX = 1230,
    FY = 560,
    FW = 440,
    FH = 330;
  const bump = 1 + 0.06 * Math.sin(seg(l, 98, 110) * Math.PI);
  ctx.save();
  ctx.translate(FX + FW / 2, FY + FH);
  ctx.scale(bump, bump);
  ctx.translate(-FX - FW / 2, -FY - FH);
  folder(ctx, FX, FY, FW, FH, { label: "your vault" });
  ctx.restore();
  const TX = 1790,
    TY = 960,
    lid = Math.sin(seg(l, 136, 152) * Math.PI) * 0.6;
  ctx.save();
  ctx.lineWidth = 4;
  ctx.strokeStyle = C.ink;
  ctx.fillStyle = C.surface2;
  ctx.beginPath();
  ctx.moveTo(TX - 60, TY - 130);
  ctx.lineTo(TX + 60, TY - 130);
  ctx.lineTo(TX + 48, TY);
  ctx.lineTo(TX - 48, TY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(TX + i * 24, TY - 110);
    ctx.lineTo(TX + i * 20, TY - 20);
    ctx.stroke();
  }
  ctx.translate(TX - 70, TY - 140);
  ctx.rotate(-lid);
  fillRR(ctx, 0, -14, 140, 18, 6, C.surface2, C.ink, 4);
  ctx.restore();
  text(ctx, "Trash", TX, TY + 44, { size: 24, weight: 600, align: "center", color: C.muted });
  // rows arrive by paw, then two leave: one to the vault, one to the Trash
  const slotY = (i: number) => PY + 150 + i * 100;
  const gone2 = seg(l, 100, 112);
  ROWS.forEach((t, i) => {
    const t0 = 6 + i * 7,
      arrive = pop(seg(l, t0, t0 + 14));
    if (arrive <= 0) return;
    let x = lerp(900, PX + 40, easeOut(seg(l, t0, t0 + 10))),
      y = lerp(760, slotY(i), easeOut(seg(l, t0, t0 + 10)));
    if (i > 2) y -= 100 * easeInOut(gone2);
    let s = 1,
      rot = 0;
    if (i === 2 && l >= 72) {
      const k = easeInOut(seg(l, 74, 100));
      x = lerp(PX + 40, FX + 110, k);
      y = lerp(slotY(2), FY + 40, k) - Math.sin(k * Math.PI) * 160;
      s = lerp(1, 0.6, k);
      rot = k * 0.3;
      if (k >= 1) return;
    }
    if (i === 4 && l >= 122) {
      const k = easeInOut(seg(l, 124, 150));
      x = lerp(PX + 40, TX - 150, k);
      y = lerp(slotY(3), TY - 180, k) - Math.sin(k * Math.PI) * 200;
      s = lerp(1, 0.45, k);
      rot = -k * 0.5;
      if (k >= 1) return;
    }
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(s * Math.min(1, arrive), s * Math.min(1, arrive));
    const focus = l >= 112 ? 4 : l >= 60 ? 2 : 0; // the highlight follows the row about to act
    fillRR(ctx, 0, -34, 520, 76, 14, i === focus ? C.peach : C.linen, C.border, 2);
    ctx.fillStyle = i === focus ? C.clay : C.muted;
    rr(ctx, 22, -18, 30, 38, 5);
    ctx.fill();
    text(ctx, t, 74, 14, { size: 26, weight: i === focus ? 600 : 500 });
    ctx.restore();
  });
  // what each departure means, said where it happens
  const m1 = pop(seg(l, 62, 72)) * (1 - seg(l, 96, 102));
  if (m1 > 0) {
    ctx.save();
    ctx.globalAlpha = m1;
    chip(ctx, PX + 380, slotY(2) - 30, "Remove from Main", { size: 22, bg: C.cocoa, fg: C.surface });
    ctx.restore();
  }
  const k1 = pop(seg(l, 104, 116));
  if (k1 > 0) {
    ctx.save();
    ctx.translate(FX + 10, FY + FH + 30);
    ctx.scale(k1, k1);
    chip(ctx, 0, 0, "✓ still in your vault", { size: 24, bg: C.olive, fg: C.surface });
    ctx.restore();
  }
  const m2 = pop(seg(l, 112, 122)) * (1 - seg(l, 122, 128));
  if (m2 > 0) {
    ctx.save();
    ctx.globalAlpha = m2;
    chip(ctx, PX + 380, slotY(3) - 30, "Delete", { size: 22, bg: C.badge, fg: C.surface });
    ctx.restore();
  }
  const k2 = pop(seg(l, 152, 164));
  if (k2 > 0) {
    ctx.save();
    ctx.translate(1300, 1000);
    ctx.scale(k2, k2);
    chip(ctx, 0, 0, "Trash stays on your disk until you empty it", {
      size: 22,
      bg: C.surface,
      fg: C.cocoa,
      border: C.ink,
    });
    ctx.restore();
  }
  // the quokka: arranges by paw, then turns to watch the notes go
  const p = poseAt(l, [
    [0, "base"],
    [60, "searching"],
    [118, "listening"],
    [158, "waving"],
  ]);
  actor(ctx, env, f, {
    pose: p.pose,
    x: 960,
    y: 1000,
    h: 400,
    squash: p.squash,
    flip: l < 60,
    lean: l < 60 ? -3 + Math.sin(l / 4) * 2 : l >= 158 ? Math.sin(l / 5) * 3 : Math.sin(l / 10) * 1.5,
  });
  beatLabel(ctx, f, l, 6, "your views, your shelf", "remove from view never deletes");
};

// ---------------------------------------------------------------- 8 · ask anything (1350-1560)
const ANSWER = ["You booked the ferry — done ✓", "Still to do: pack a snorkel", "and find the pink lake."];
export const shotChat = (F0: number) => (ctx: Ctx, l: number, env: Env) => {
  const f = F0 + l;
  flat(ctx, env);
  paperGround(ctx, f);
  const X = 780,
    Y = 170,
    Wd = 1000,
    Hd = 720;
  const o = pop(seg(l, 0, 14));
  ctx.save();
  ctx.translate(X + Wd / 2, Y + Hd / 2);
  ctx.scale(lerp(0.85, 1, o), lerp(0.85, 1, o));
  ctx.translate(-X - Wd / 2, -Y - Hd / 2);
  ctx.globalAlpha = Math.min(1, o * 1.4);
  fillRR(ctx, X + 10, Y + 16, Wd, Hd, 26, "rgba(58,48,40,0.14)");
  fillRR(ctx, X, Y, Wd, Hd, 26, C.surface, C.ink, 4);
  text(ctx, "Chat", X + 40, Y + 62, { size: 30, weight: 600 });
  const models = ["on-device", "Claude", "ChatGPT", "Gemini"];
  let mx = X + 170;
  models.forEach((m, i) => {
    mx +=
      12 + chip(ctx, mx, Y + 30, m, { size: 18, bg: i === 0 ? C.olive : C.linen, fg: i === 0 ? C.surface : C.muted });
  });
  ctx.strokeStyle = C.border;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(X, Y + 96);
  ctx.lineTo(X + Wd, Y + 96);
  ctx.stroke();
  // the question
  const q = "what's left for Rottnest?",
    qt = seg(l, 10, 34);
  if (l >= 10) {
    const qs = typed(q, qt),
      qw = Math.max(80, measure(ctx, qs, 30) + 50);
    fillRR(ctx, X + Wd - 40 - qw, Y + 130, qw, 64, 22, C.peach);
    text(ctx, qs, X + Wd - 40 - qw + 25, Y + 172, { size: 30 });
  }
  // thinking dots, then the answer streams, then its sources
  if (l >= 38 && l < 58)
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = C.muted;
      ctx.beginPath();
      ctx.arc(X + 70 + i * 26, Y + 262 - Math.max(0, Math.sin((l - 38) / 3 - i)) * 10, 8, 0, 6.29);
      ctx.fill();
    }
  if (l >= 58) {
    fillRR(ctx, X + 40, Y + 220, 700, 220, 22, C.linen, C.border, 2);
    ANSWER.forEach((a, i) => {
      const t0 = 58 + i * 22,
        k = seg(l, t0, t0 + 20);
      if (k > 0) text(ctx, typed(a, k), X + 70, Y + 280 + i * 54, { size: 30, weight: i === 0 ? 600 : 500 });
    });
    const cits = ["[[Trip ideas]]", "[[Ferry times]]"];
    let cx = X + 40;
    cits.forEach((c, i) => {
      const s = pop(seg(l, 130 + i * 8, 144 + i * 8));
      if (s > 0) {
        ctx.save();
        ctx.translate(cx, Y + 470);
        ctx.scale(s, s);
        cx += 16 + chip(ctx, 0, 0, c, { size: 24, bg: C.peach, fg: C.clayText, mono: true });
        ctx.restore();
      } else cx += 16 + measure(ctx, c, 24, 600, FONT.mono) + 26;
    });
    text(ctx, "answers come from your notes, with sources", X + 40, Y + 580, {
      size: 24,
      color: C.muted,
      alpha: seg(l, 150, 164),
    });
  }
  ctx.restore();
  // threads from the vault up to the cited notes
  const FX = 150,
    FY = 770;
  folder(ctx, FX, FY, 180, 130, { label: "" });
  if (l >= 128)
    [0, 1].forEach((i) => {
      const tx = X + 40 + i * 250 + 100,
        ty = Y + 500;
      ink(
        ctx,
        [
          [FX + 150, FY + 10],
          [(FX + tx) / 2, FY - 200 - i * 60],
          [tx, ty + 30],
        ],
        { w: 4, color: C.clay, seed: 800 + i, frame: f, progress: seg(l, 128 + i * 8, 146 + i * 8), dash: [12, 10] },
      );
    });
  const p = poseAt(l, [[0, "ai_chat"]]);
  actor(ctx, env, f, {
    pose: p.pose,
    x: 500,
    y: 1010,
    h: 520,
    squash: p.squash * (p.pose === "ai_chat" ? 1 + (l < 40 ? 0.015 : 0.008) * Math.sin(l * 1.9) : 1),
    lean: Math.sin(l / 7) * 2,
  });
  beatLabel(ctx, f, l, 8, "ask anything", "chat already knows your vault");
};
export { H, W, backOut, easeIn };
