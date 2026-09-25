// SEASON ONE · 04 — THE BURROW. (60 s). Brief: series/season-one/episodes/s01e04.json
// Setup: wind picks up in the grove; the quokka's papers blow out of the hut; it catches Trip ideas and thinks: a folder.
// Turn (dig): it digs a burrow: one folder (Island/) holding notes/, chats/, storage/ and a .rotli/ it can rebuild;
// Trip ideas is filed into notes/. In the app, Remove from Main keeps the file; Delete moves it to trash inside the vault.
// Payoff (storm): the storm takes the hut (the app); the burrow keeps every file. Nothing leaves until Empty Trash.
// Cue table (local frames):
//   cold   0–240   papers blow from the hut 10+, the quokka hops after them 40–106, catches Trip ideas 110, thought: folder 165
//   dig    0–390   digging 0–60, Island/ opens 60, the quokka drops in 80–100, four rooms 110/140/170/200, Trip ideas filed 215–255, .rotli rebuilds 290
//   remove 0–405   Files click 45, right-click Ferry times 132 → Remove from Main 162, right-click Call Sam 252 → Delete 278
//   storm  0–405   intertitle 0–66, storm builds 70+, flash 150, roof goes 170, walls go 195, clears 300+, the quokka climbs out 320–375
//   end    0–240   intertitle 0–105, end card 105+
import type { Ctx } from "./core";
import type { Film } from "./film";
import { rng } from "./core";
import { hopAlong, poseAt } from "./rotli/actor";
import { card, easeIn } from "./rotli/kit";
import type { DeriveSpec } from "./studio/derive";
import { lowerThird } from "./studio/series";
import {
  C,
  LIGHT,
  actor,
  chapterCard,
  easeInOut,
  easeOut,
  fillRR,
  glyph,
  host,
  intertitle,
  measure,
  pop,
  seg,
  sceneStart,
  story,
  storyEnd,
  text,
  thought,
  type Scene,
  type S,
} from "./studio/story";
import { appFrame, fileList, heading, pointer, task } from "./studio/ui";

const T = LIGHT;
type Pt = [number, number];

// ---------------------------------------------------------------- local props (flat marks, theme colours only)
/** the hut (the app, in the story): walls, a pitched roof, a window and a door. `roof`/`walls` = how far the storm has taken them */
const hut = (
  ctx: Ctx,
  x: number,
  y: number,
  o: { shake?: number; roof?: number; walls?: number; door?: number } = {},
) => {
  const sh = o.shake ?? 0,
    rf = o.roof ?? 0,
    wl = o.walls ?? 0;
  ctx.save();
  ctx.lineJoin = "round";
  if (wl < 1) {
    ctx.save();
    ctx.translate(x + 130 + wl * wl * 1500, y - wl * 120);
    ctx.rotate(sh + wl * 1.6);
    ctx.translate(-130, 0);
    fillRR(ctx, -130, -180, 260, 180, 6, C.surface, C.ink, 4);
    fillRR(ctx, -96, -146, 84, 62, 6, C.peach, C.ink, 3);
    ctx.fillStyle = C.ink;
    ctx.fillRect(-56, -146, 3, 62);
    const d = o.door ?? 0;
    fillRR(ctx, 30, -116, 60, 116, 4, C.cocoa);
    if (d > 0) {
      ctx.save();
      ctx.translate(30, 0);
      ctx.scale(1 - 0.7 * d, 1);
      fillRR(ctx, 0, -116, 60, 116, 4, C.muted, C.ink, 3);
      ctx.restore();
    }
    ctx.restore();
  }
  if (rf < 1) {
    ctx.save();
    ctx.translate(x + rf * rf * 1700, y - 180 - rf * 520);
    ctx.rotate(sh * 1.4 + rf * 5);
    ctx.beginPath();
    ctx.moveTo(-160, 0);
    ctx.lineTo(0, -110);
    ctx.lineTo(160, 0);
    ctx.closePath();
    ctx.fillStyle = C.clay;
    ctx.fill();
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
};
/** a grove tree that bends in the wind around its foot */
const tree = (ctx: Ctx, x: number, y: number, s: number, bend: number, f: number, seed = 1) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.rotate(bend * 0.12 + Math.sin(f / 17 + seed) * 0.02 * (1 + bend * 3));
  fillRR(ctx, -13, -170, 26, 170, 6, C.muted, C.ink, 3);
  (
    [
      [-50, -190, 70, C.clay],
      [48, -200, 64, C.clay],
      [0, -250, 82, C.oliveBright],
    ] as [number, number, number, string][]
  ).forEach(([cx, cy, r, col]) => {
    ctx.beginPath();
    ctx.arc(cx + bend * 12, cy, r, 0, 6.29);
    ctx.fillStyle = col;
    ctx.fill();
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 3;
    ctx.stroke();
  });
  ctx.restore();
};
/** the ground: a band of earth from `gy` down, a grass edge on top, pebbles in the soil */
const earth = (ctx: Ctx, gy: number, f: number) => {
  ctx.fillStyle = C.border;
  ctx.fillRect(-120, gy, 2160, 1300 - gy);
  const r = rng(44);
  ctx.fillStyle = C.muted;
  ctx.globalAlpha = 0.35;
  for (let i = 0; i < 70; i++) {
    const x = r() * 2000 - 40,
      y = gy + 40 + r() * (1100 - gy);
    ctx.beginPath();
    ctx.ellipse(x, y, 5 + r() * 7, 3 + r() * 4, r() * 3, 0, 6.29);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = C.ink;
  ctx.fillRect(-120, gy - 2, 2160, 5);
  ctx.fillStyle = C.clay;
  for (let x = -100; x < 2040; x += 38) {
    const h = 10 + ((x * 7) % 9) + Math.sin(f / 12 + x) * 2;
    ctx.beginPath();
    ctx.moveTo(x, gy);
    ctx.lineTo(x + 7, gy - h);
    ctx.lineTo(x + 14, gy);
    ctx.closePath();
    ctx.fill();
  }
};
/** wind: streaks racing left to right; `k` is the strength */
const wind = (ctx: Ctx, f: number, k: number, top = 60, bottom = 820, seed = 3) => {
  if (k <= 0) return;
  const r = rng(seed);
  ctx.save();
  ctx.strokeStyle = C.muted;
  ctx.lineCap = "round";
  ctx.lineWidth = 4;
  for (let i = 0; i < 14; i++) {
    const y = top + r() * (bottom - top),
      sp = 22 + r() * 18,
      len = 120 + r() * 160,
      x = ((f * sp + r() * 2400) % 2600) - 300;
    ctx.globalAlpha = 0.45 * k;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + len * 0.5, y - 12 * Math.sin(f / 9 + i), x + len, y);
    ctx.stroke();
  }
  ctx.restore();
};
/** rain, above the ground only */
const rainfall = (ctx: Ctx, f: number, k: number, gy: number) => {
  if (k <= 0) return;
  const r = rng(29);
  ctx.save();
  ctx.beginPath();
  ctx.rect(-120, -120, 2160, gy + 120);
  ctx.clip();
  ctx.strokeStyle = C.muted;
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.5 * k;
  ctx.beginPath();
  for (let i = 0; i < 110; i++) {
    const x0 = r() * 2300 - 100,
      sp = 26 + r() * 12,
      len = 26 + r() * 20,
      y = ((f * sp + r() * 3000) % (gy + 160)) - 80,
      x = x0 + y * 0.35;
    ctx.moveTo(x, y);
    ctx.lineTo(x + len * 0.35, y + len);
  }
  ctx.stroke();
  ctx.restore();
};
/** a tunnel drawn along a curve, `p` 0..1 dug so far */
const tunnel = (ctx: Ctx, a: Pt, b: Pt, c: Pt, p: number, w = 44) => {
  if (p <= 0) return;
  const pts: Pt[] = [];
  const n = 30,
    m = Math.max(2, Math.ceil(n * p));
  for (let i = 0; i <= m; i++) {
    const t = (i / n) * Math.min(1, (p * n) / m),
      u = 1 - t;
    pts.push([u * u * a[0] + 2 * u * t * b[0] + t * t * c[0], u * u * a[1] + 2 * u * t * b[1] + t * t * c[1]]);
  }
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const [col, lw] of [
    [C.ink, w + 8],
    [C.surface, w],
  ] as [string, number][]) {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.strokeStyle = col;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
  ctx.restore();
};
/** a small folder icon (tab + body) with its top-left at (x, y) */
const folderIcon = (ctx: Ctx, x: number, y: number, s = 1, col = C.clay) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.roundRect(0, 0, 16, 8, 3);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(0, 5, 38, 26, 4);
  ctx.fill();
  ctx.restore();
};
/** a room of the burrow (one folder): pops in with `k`; returns its top-left for contents */
const room = (
  ctx: Ctx,
  cx: number,
  cy: number,
  w: number,
  h: number,
  k: number,
  label: string,
  size = 34,
  dashed = false,
) => {
  if (k <= 0) return;
  const s = pop(k);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  fillRR(ctx, -w / 2, -h / 2, w, h, Math.min(46, h / 2), C.surface, C.ink, 4);
  if (dashed) {
    ctx.save();
    ctx.setLineDash([12, 9]);
    ctx.strokeStyle = C.clay;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-w / 2 + 10, -h / 2 + 10, w - 20, h - 20, Math.min(38, h / 2 - 10));
    ctx.stroke();
    ctx.restore();
  }
  const lx = -w / 2 + 28,
    ly = -h / 2 + size * 1.45;
  folderIcon(ctx, lx, ly - size * 0.82, size / 34);
  text(ctx, label, lx + 50 * (size / 34), ly, { size, weight: 600, color: C.cocoa });
  ctx.restore();
};
/** the rebuild arrow: a circular arrow turning */
const rebuild = (ctx: Ctx, x: number, y: number, r: number, a: number, col = C.clay) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  ctx.strokeStyle = col;
  ctx.fillStyle = col;
  ctx.lineWidth = r * 0.24;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(0, 0, r, 0.3, Math.PI * 1.75);
  ctx.stroke();
  const ex = Math.cos(Math.PI * 1.75) * r,
    ey = Math.sin(Math.PI * 1.75) * r;
  ctx.beginPath();
  ctx.moveTo(ex + r * 0.42, ey - r * 0.1);
  ctx.lineTo(ex - r * 0.1, ey - r * 0.42);
  ctx.lineTo(ex + r * 0.05, ey + r * 0.35);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
};
/** a picture file glyph (storage): a frame with a hill and a sun */
const picture = (ctx: Ctx, x: number, y: number, s: number) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  fillRR(ctx, -30, -22, 60, 44, 6, C.surface, C.cocoa, 4);
  ctx.fillStyle = C.clay;
  ctx.beginPath();
  ctx.moveTo(-26, 18);
  ctx.lineTo(-6, -4);
  ctx.lineTo(8, 10);
  ctx.lineTo(16, 2);
  ctx.lineTo(26, 18);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = C.oliveBright;
  ctx.beginPath();
  ctx.arc(14, -10, 6, 0, 6.29);
  ctx.fill();
  ctx.restore();
};
/** a glyph from the thought-bubble set, drawn in place */
const mark = (ctx: Ctx, g: Parameters<typeof glyph>[1], x: number, y: number, s: number) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  glyph(ctx, g, C.cocoa, C.clay);
  ctx.restore();
};
/** a pointer path through [frame, x, y] waypoints */
const path = (l: number, w: [number, number, number][]) => {
  if (l <= w[0][0]) return { x: w[0][1], y: w[0][2] };
  for (let i = 1; i < w.length; i++) {
    const [f0, x0, y0] = w[i - 1],
      [f1, x1, y1] = w[i];
    if (l < f1) {
      const k = easeInOut((l - f0) / (f1 - f0));
      return { x: x0 + (x1 - x0) * k, y: y0 + (y1 - y0) * k };
    }
  }
  const e = w[w.length - 1];
  return { x: e[1], y: e[2] };
};
/** a scene context shifted by `d` frames (for a template that starts part-way through a scene) */
const shift = (s: S, d: number): S => ({ ...s, l: s.l - d, t: (a, b) => seg(s.l - d, a, b) });

// ---------------------------------------------------------------- cold: the wind takes the papers
const GY = 860; // the ground line outdoors
const PAPERS = ["Ferry times", "Call Sam", "Salt lakes", "Ferry times", "Call Sam", "Salt lakes", "Ferry times"];
const CATCH_AT = 110;
const cold: Scene = {
  id: "cold",
  len: 240,
  draw: (ctx, env, s) => {
    const w = 0.5 + 0.5 * seg(s.l, 0, 40);
    wind(ctx, s.f, w, 80, 800);
    tree(ctx, 1560, GY, 1.1, w, s.f, 1);
    tree(ctx, 1790, GY, 0.9, w, s.f, 2);
    earth(ctx, GY, s.f);
    hut(ctx, 330, GY, { shake: Math.sin(s.f / 3) * 0.008 * w, door: 0.6 + 0.3 * Math.sin(s.f / 5) });
    // papers blow out of the hut window and away to the right
    const r = rng(9);
    PAPERS.forEach((p, i) => {
      const t0 = 6 + i * 30,
        k = (s.l - t0) / 95;
      const y0 = 250 + r() * 380;
      if (k < 0 || k > 1) return;
      card(ctx, {
        x: 290 + k * 1900,
        y: 720 - Math.min(1, k * 3) * (720 - y0) + Math.sin(k * 9 + i) * 40,
        rot: Math.sin(k * 8 + i) * 0.7 + k * 2,
        scale: 0.55 + 0.1 * Math.min(1, k * 4),
        title: "",
        lines: 2,
        seed: 30 + i,
        frame: s.f,
      });
    });
    // Trip ideas: out of the window a beat later, slower, caught at CATCH_AT
    const QX = 1250;
    const h = hopAlong(
      s.l,
      [
        [34, 560, GY],
        [58, 800, GY],
        [82, 1030, GY],
        [106, QX, GY],
      ],
      100,
    );
    const caught = s.l >= CATCH_AT,
      fly = seg(s.l, 24, CATCH_AT);
    if (!caught)
      card(ctx, {
        x: 290 + (QX - 70 - 290) * easeOut(fly),
        y: 700 - Math.sin(fly * Math.PI) * 330 - fly * 40 + Math.sin(s.f / 6) * 6,
        rot: (1 - fly) * 1.2 + Math.sin(s.f / 7) * 0.15,
        scale: 0.85,
        title: "Trip ideas",
        token: true,
        lines: 2,
        seed: 7,
        frame: s.f,
      });
    const pz = poseAt(s.l, [
      [0, "attention"],
      [34, "walking"],
      [106, "notes"],
      [150, "thoughtful"],
    ]);
    actor(ctx, env, s.f, {
      pose: pz.pose,
      x: h.x,
      y: h.y,
      h: 300,
      lift: h.lift,
      squash: h.squash * pz.squash,
      lean: Math.sin(s.f / 9) * 2 + (s.l < 106 ? 4 : 0),
    });
    if (caught)
      card(ctx, {
        x: QX - 10,
        y: GY - 88 + Math.sin(s.f / 8) * 3,
        rot: -0.12 + Math.sin(s.f / 11) * 0.05,
        scale: 0.85,
        title: "Trip ideas",
        token: true,
        lines: 2,
        seed: 7,
        frame: s.f,
      });
    thought(ctx, s, QX + 40, GY - 300, "folder", s.t(160, 182));
  },
};
const chapter: Scene = {
  id: "chapter",
  len: 120,
  draw: (ctx, env, s) => chapterCard(ctx, env, s, { no: 4, title: ["The burrow."], pose: "stays_local" }),
};

// ---------------------------------------------------------------- dig: the burrow as a folder tree
const DG = 330; // ground line in the dig scene
const ROOT = { x: 960, y: 480, w: 540, h: 150 };
const ROOMS = [
  { x: 300, label: "wiki/", at: 110, files: ["Trip ideas.md", "Ferry times.md"] },
  { x: 740, label: "chats/", at: 140, files: ["Trip chat.md"] },
  { x: 1180, label: "storage/", at: 170, files: ["lake.jpg", "ferry.pdf"] },
  { x: 1620, label: ".rotli/", at: 200, files: [] as string[] },
];
const RY = 730,
  RW = 400,
  RH = 190,
  FILED = [215, 255];
/** Trip ideas' way into notes/: across the floor of Island/, down the notes tunnel, into the room */
const filedAt = (f: number): Pt => {
  const a: Pt = [1020, ROOT.y - 28],
    b: Pt = [ROOT.x - 180, ROOT.y + 64],
    tb: Pt = [ROOMS[0].x + (ROOT.x - 180 - ROOMS[0].x) * 0.35, RY - 150],
    c: Pt = [ROOMS[0].x, RY - RH / 2 + 10],
    d: Pt = [ROOMS[0].x + 130, RY + 44];
  const L = (p: Pt, q: Pt, t: number): Pt => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
  if (f < 0.3) return L(a, b, easeInOut(f / 0.3));
  if (f < 0.8) {
    const t = (f - 0.3) / 0.5;
    return L(L(b, tb, t), L(tb, c, t), t);
  }
  return L(c, d, easeOut((f - 0.8) / 0.2));
};
const dig: Scene = {
  id: "dig",
  len: 390,
  draw: (ctx, env, s) => {
    tree(ctx, 1700, DG, 0.8, 0.2, s.f, 3);
    hut(ctx, 250, DG, { door: 0.2 });
    earth(ctx, DG, s.f);
    // the shaft and the first room: Island/, the one folder
    tunnel(ctx, [960, DG - 4], [960, DG + 40], [960, ROOT.y - 50], s.t(10, 60), 70);
    ROOMS.forEach((r, i) => {
      const sx = ROOT.x - 180 + i * 120;
      tunnel(
        ctx,
        [sx, ROOT.y + 60],
        [r.x + (sx - r.x) * 0.35, RY - 150],
        [r.x, RY - RH / 2 + 10],
        s.t(r.at - 28, r.at),
      );
    });
    room(ctx, ROOT.x, ROOT.y, ROOT.w, ROOT.h, s.t(56, 74), "Island/", 40);
    ROOMS.forEach((r, i) => {
      room(ctx, r.x, RY, RW, RH, s.t(r.at, r.at + 14), r.label, 34, i === 3);
      const x0 = r.x - RW / 2 + 30,
        a = s.t(r.at + 10, r.at + 24);
      r.files.forEach((fn, j) => {
        const vis = i === 0 && j === 0 ? seg(s.l, FILED[1] - 6, FILED[1] + 8) : a;
        text(ctx, fn, x0, RY - 4 + j * 44, { size: 28, color: C.cocoa, alpha: vis });
      });
      if (i === 1) mark(ctx, "chat", r.x + 130, RY + 30, 0.9 * a);
      if (i === 2) picture(ctx, r.x + 130, RY + 34, 0.95 * a);
      if (i === 3) {
        const rb = seg(s.l, 290, 330);
        text(ctx, "rebuildable", x0, RY + 20, { size: 28, color: C.muted, alpha: a });
        if (a > 0) rebuild(ctx, r.x + 120, RY + 12, 28, s.f / 14 + easeInOut(rb) * Math.PI * 4);
      }
    });
    // the quokka: digs at the surface, drops down the shaft into Island/, files Trip ideas, then stands in its folder
    const h = hopAlong(
      s.l,
      [
        [0, 960, DG],
        [80, 960, DG],
        [100, 1130, ROOT.y + 62],
      ],
      60,
    );
    const pz = poseAt(s.l, [
      [0, "searching"],
      [80, "walking"],
      [100, "notes"],
      [FILED[0], "base"],
      [FILED[1], "knowledge_system"],
    ]);
    const digBob = s.l < 80 ? 1 - 0.08 * Math.abs(Math.sin(s.f / 3)) : 1;
    actor(ctx, env, s.f, {
      pose: pz.pose,
      x: h.x,
      y: h.y,
      h: s.l < 90 ? 230 : 140,
      lift: h.lift,
      squash: h.squash * pz.squash * digBob,
      lean: Math.sin(s.f / 10) * 2,
    });
    if (s.l < 80) {
      const r = rng(70 + Math.floor(s.l / 5));
      for (let i = 0; i < 5; i++) {
        const k = ((s.l + i * 7) % 20) / 20,
          side = i % 2 ? 1 : -1;
        ctx.fillStyle = i % 3 ? C.muted : C.cocoa;
        ctx.beginPath();
        ctx.ellipse(
          960 + side * (40 + k * 180 + r() * 20),
          DG - 20 - Math.sin(k * Math.PI) * 120,
          9,
          6,
          k * 4,
          0,
          6.29,
        );
        ctx.fill();
      }
    }
    // Trip ideas: carried in, then filed down the tunnel into notes/
    const f = seg(s.l, FILED[0], FILED[1]);
    if (s.l < FILED[1] + 8) {
      const held = s.l < FILED[0],
        q = filedAt(f),
        fx = held ? h.x - 110 : q[0],
        fy = held ? h.y - (s.l < 90 ? 150 : 90) - h.lift : q[1];
      card(ctx, {
        x: fx,
        y: fy,
        rot: -0.1 + f * 0.3,
        scale: (s.l < 90 ? 0.75 : 0.62) * (1 - 0.25 * seg(s.l, FILED[1], FILED[1] + 8)),
        alpha: 1 - seg(s.l, FILED[1], FILED[1] + 8),
        title: "Trip ideas",
        token: true,
        lines: 2,
        seed: 7,
        frame: s.f,
      });
    }
    if (s.l >= FILED[1])
      card(ctx, {
        x: ROOMS[0].x + 130,
        y: RY + 44,
        rot: 0.08 + Math.sin(s.f / 13) * 0.02,
        scale: 0.5 * pop(seg(s.l, FILED[1], FILED[1] + 12)),
        title: "Trip ideas",
        token: true,
        lines: 1,
        seed: 7,
        frame: s.f,
      });
    thought(ctx, s, 1150, ROOT.y - 60, "check", s.t(330, 346), { scale: 0.7 });
    lowerThird(ctx, s.l, 120, s.len, "One folder is your vault:", "plain Markdown in one folder you choose.");
  },
};

// ---------------------------------------------------------------- remove: Remove from Main keeps the file; Delete moves it to trash
const WIN = { x: 90, y: 40, k: 1.2, w: 1450, h: 650 };
const FILES_AT = 45,
  REMOVE_AT = 162,
  DELETE_AT = 278;
const remove: Scene = {
  id: "remove",
  len: 405,
  draw: (ctx, env, s) => {
    const l = s.l,
      removed = l >= REMOVE_AT,
      deleted = l >= DELETE_AT,
      files = l >= FILES_AT;
    const notes = ["Trip ideas", ...(removed ? [] : ["Ferry times"]), ...(deleted ? [] : ["Call Sam"])];
    const menuFor = l >= 132 && l < REMOVE_AT ? 1 : l >= 252 && l < DELETE_AT ? 2 : 0;
    const active = !files ? 0 : menuFor === 1 ? 1 : menuFor === 2 ? 1 : -1;
    const k = pop(s.t(0, 16));
    ctx.save();
    ctx.translate(WIN.x + (WIN.w * WIN.k) / 2, WIN.y + (WIN.h * WIN.k) / 2);
    ctx.scale(WIN.k * (0.92 + 0.08 * k), WIN.k * (0.92 + 0.08 * k));
    ctx.translate(-WIN.w / 2, -WIN.h / 2);
    ctx.globalAlpha = Math.min(1, k * 1.4);
    const E = appFrame(
      ctx,
      T,
      { x: 0, y: 0, w: WIN.w, h: WIN.h },
      { notes, active, title: files ? "Island" : "Trip ideas.md" },
    );
    const R = T.roles;
    if (files) fillRR(ctx, 18, WIN.h - 64, 264, 44, 10, R.tint);
    text(ctx, "Files", 34, WIN.h - 34, {
      size: 24,
      weight: files ? 600 : 500,
      color: files ? R.text : R["text-muted"],
    });
    if (!files) {
      heading(ctx, T, E.x, E.y + 70, "Trip ideas", 56);
      task(ctx, T, E.x, E.y + 160, "x", "book the ferry");
      task(ctx, T, E.x, E.y + 222, " ", "pack a snorkel");
      task(ctx, T, E.x, E.y + 284, " ", "find the pink lake");
    } else {
      const a = s.t(FILES_AT, FILES_AT + 12);
      ctx.save();
      ctx.globalAlpha *= a;
      heading(ctx, T, E.x, E.y + 36, "Files", 40);
      const rows: { name: string; kind: string; depth?: number; note?: string }[] = [
        { name: "Island", kind: "dir" },
        { name: "wiki", kind: "dir", depth: 1 },
        { name: "Trip ideas.md", kind: "md", depth: 2, note: "in Main" },
        { name: "Ferry times.md", kind: "md", depth: 2, note: removed ? "" : "in Main" },
        ...(deleted ? [] : [{ name: "Call Sam.md", kind: "md", depth: 2, note: "in Main" }]),
        { name: "chats", kind: "dir", depth: 1 },
        { name: "storage", kind: "dir", depth: 1 },
        { name: "trash", kind: "dir", depth: 1 },
        ...(deleted ? [{ name: "Call Sam.md", kind: "md", depth: 2 }] : []),
        { name: ".rotli", kind: "dir", depth: 1 },
      ];
      const sel = removed && l < REMOVE_AT + 70 ? 3 : deleted && l < DELETE_AT + 80 ? 7 : -1;
      const FL = { x: E.x, y: E.y + 62, w: E.w, h: 20 + rows.length * 46 + 6 };
      fileList(ctx, T, FL, rows, sel, 46);
      if (deleted) {
        const b = pop(s.t(DELETE_AT + 30, DELETE_AT + 44));
        if (b > 0) {
          const bw = measure(ctx, "Empty Trash", 22, 600) + 36,
            bx = FL.x + FL.w - 24 - bw,
            by = FL.y + 20 + 6 * 46 + 5;
          ctx.save();
          ctx.translate(bx + bw / 2, by + 18);
          ctx.scale(b, b);
          fillRR(ctx, -bw / 2, -18, bw, 36, 18, R.surface, R.border, 2);
          text(ctx, "Empty Trash", 0, 8, { size: 22, weight: 600, align: "center", color: R["text-muted"] });
          ctx.restore();
        }
      }
      // the file flies from its sidebar row to where it lives on disk
      const flyTo = (t0: number, name: string, fromY: number, toRow: number) => {
        const t = seg(l, t0, t0 + 22);
        if (t <= 0 || t >= 1) return;
        const x = 160 + (E.x + 260 - 160) * easeInOut(t),
          y = fromY + (FL.y + 20 + toRow * 46 + 22 - fromY) * easeInOut(t) - Math.sin(t * Math.PI) * 60;
        const w = measure(ctx, name, 24, 600) + 36;
        fillRR(ctx, x - w / 2, y - 22, w, 44, 22, R.tint, R.accent, 2);
        text(ctx, name, x, y + 8, { size: 24, weight: 600, align: "center", color: R["accent-text"] });
      };
      flyTo(REMOVE_AT, "Ferry times", 230, 3);
      flyTo(DELETE_AT, "Call Sam", 230, 7);
      ctx.restore();
    }
    // the context menu
    if (menuFor) {
      const mx = 150,
        my = 238,
        it = ["Open", "Remove from Main", "Delete"],
        hov = menuFor === 1 ? (l >= 150 ? 1 : -1) : l >= 268 ? 2 : -1,
        mk = pop(seg(l, menuFor === 1 ? 132 : 252, (menuFor === 1 ? 132 : 252) + 8));
      ctx.save();
      ctx.translate(mx, my);
      ctx.scale(mk, mk);
      fillRR(ctx, 6, 10, 300, 3 * 50 + 16, 14, "rgba(0,0,0,0.10)");
      fillRR(ctx, 0, 0, 300, 3 * 50 + 16, 14, R.surface, R.border, 2);
      it.forEach((m, i) => {
        if (i === hov) fillRR(ctx, 8, 8 + i * 50, 284, 46, 10, R.tint);
        text(ctx, m, 24, 40 + i * 50, { size: 24, weight: i === hov ? 600 : 500, color: i === 2 ? R.failure : R.text });
      });
      ctx.restore();
    }
    // the pointer
    const p = path(l, [
      [0, 900, 520],
      [36, 80, 612],
      [60, 80, 612],
      [120, 150, 230],
      [140, 150, 230],
      [156, 230, 312],
      [170, 230, 312],
      [236, 140, 230],
      [256, 140, 230],
      [272, 220, 364],
      [290, 220, 364],
      [340, 880, 500],
      [405, 940, 540],
    ]);
    const click = [FILES_AT - 4, 128, REMOVE_AT - 4, 248, DELETE_AT - 4].find((c) => l >= c && l < c + 12);
    pointer(ctx, p.x, p.y + (l > 290 ? Math.sin(l / 11) * 6 : 0), click !== undefined ? (l - click) / 12 : 0);
    ctx.restore();
    host(ctx, env, s.f, { x: 1790, y: 1066, h: 200, pose: deleted ? "thoughtful" : "notes" });
    lowerThird(
      ctx,
      l,
      FILES_AT + 4,
      150,
      "Files, at the foot of the sidebar,",
      "browses the vault folder the way Finder does.",
    );
    lowerThird(
      ctx,
      l,
      REMOVE_AT - 2,
      272,
      "Remove from Main takes a note out of view;",
      "the file stays in your vault.",
    );
    lowerThird(
      ctx,
      l,
      DELETE_AT,
      s.len,
      "Delete moves it to Trash inside the vault.",
      "Nothing leaves your disk until you choose Empty Trash.",
    );
  },
};

// ---------------------------------------------------------------- storm: the storm takes the hut; the burrow keeps every file
const SG = 500; // ground line in the storm
const SROOT = { x: 1190, y: 630, w: 440, h: 150 };
const SROOMS = [1062, 1287, 1512, 1737],
  SRY = 835,
  SRW = 205,
  SRH = 130;
const storm: Scene = {
  id: "storm",
  len: 405,
  draw: (ctx, env, s) => {
    const l = s.l;
    if (l < 70) {
      const out = seg(l, 56, 70);
      ctx.save();
      ctx.globalAlpha = 1 - out;
      wind(ctx, s.f, 0.5 * seg(l, 0, 30), 80, 1000, 8);
      intertitle(ctx, s, ["Then the storm came."], { hi: "storm" });
      ctx.restore();
      if (out < 1) return;
    }
    const k = seg(l, 70, 140) * (1 - seg(l, 300, 360)),
      shake = Math.sin(s.f / 2.3) * 0.02 * k;
    tree(ctx, 130, SG, 0.9, 0.3 + k * 1.2, s.f, 4);
    tree(ctx, 760, SG, 0.75, 0.3 + k * 1.3, s.f, 5);
    const roof = seg(l, 170, 232),
      walls = seg(l, 195, 255);
    // where the hut stood
    if (walls > 0.3) {
      ctx.save();
      ctx.globalAlpha = 0.6 * seg(l, 220, 250);
      ctx.setLineDash([14, 10]);
      ctx.strokeStyle = C.muted;
      ctx.lineWidth = 3;
      ctx.strokeRect(290, SG - 180, 260, 180);
      ctx.restore();
    }
    hut(ctx, 420, SG, { shake, roof: easeIn(roof), walls: easeIn(walls), door: 0.5 + 0.5 * Math.sin(s.f / 3) * k });
    earth(ctx, SG, s.f);
    // the burrow, calm under it all
    tunnel(ctx, [1000, SG - 4], [1010, SG + 50], [SROOT.x - 150, SROOT.y - 20], 1, 60);
    SROOMS.forEach((x, i) => {
      const sx = SROOT.x - 150 + i * 100;
      tunnel(ctx, [sx, SROOT.y + 50], [x + (sx - x) * 0.3, SRY - 110], [x, SRY - SRH / 2 + 10], 1, 38);
    });
    room(ctx, SROOT.x, SROOT.y, SROOT.w, SROOT.h, 1, "Island/", 32);
    ["wiki/", "chats/", "storage/", ".rotli/"].forEach((lb, i) => {
      room(ctx, SROOMS[i], SRY, SRW, SRH, 1, lb, 28, i === 3);
    });
    card(ctx, {
      x: SROOMS[0],
      y: SRY + 30,
      rot: 0.06 + Math.sin(s.f / 13) * 0.02,
      scale: 0.42,
      title: "Trip ideas",
      token: true,
      lines: 1,
      seed: 7,
      frame: s.f,
    });
    mark(ctx, "chat", SROOMS[1], SRY + 30, 0.6);
    picture(ctx, SROOMS[2], SRY + 32, 0.75);
    rebuild(ctx, SROOMS[3], SRY + 30, 20, s.f / 14);
    // the storm, above ground only: dimmer sky, rain, wind, a flash
    ctx.save();
    ctx.globalAlpha = 0.3 * k;
    ctx.fillStyle = C.night;
    ctx.fillRect(-120, -120, 2160, SG + 118);
    ctx.restore();
    rainfall(ctx, s.f, k, SG);
    wind(ctx, s.f, k, 60, SG - 40, 12);
    if (l >= 150 && l < 156) {
      ctx.save();
      ctx.globalAlpha = 0.35 * (1 - (l - 150) / 6);
      ctx.fillStyle = C.surface;
      ctx.fillRect(-120, -120, 2160, SG + 118);
      ctx.restore();
    }
    // the quokka: asleep in Island/ through the storm, then out into the clear
    const h = hopAlong(
      l,
      [
        [0, 1300, SROOT.y + 68],
        [296, 1300, SROOT.y + 68],
        [314, 1060, SROOT.y + 68],
        [332, 1000, SG],
        [352, 700, SG],
        [372, 420, SG],
      ],
      80,
    );
    const pz = poseAt(l, [
      [0, "rest"],
      [288, "attention"],
      [296, "walking"],
      [372, "celebrating"],
    ]);
    actor(ctx, env, s.f, {
      pose: pz.pose,
      x: h.x,
      y: h.y,
      h: l < 322 ? 130 : 220,
      lift: h.lift,
      squash: h.squash * pz.squash,
      lean: Math.sin(s.f / 12) * 2,
      flip: l >= 296 && l < 372,
    });
    thought(ctx, s, 1318, SROOT.y - 45, "heart", s.t(240, 256) * (1 - seg(l, 282, 288)), { scale: 0.6 });
    thought(ctx, s, 450, SG - 210, "check", s.t(376, 392), { scale: 0.8 });
    lowerThird(ctx, l, 236, s.len, "Delete the app and the work still makes sense.");
  },
};

// ---------------------------------------------------------------- end: the payoff, then the end card
const end: Scene = {
  id: "end",
  len: 240,
  draw: (ctx, env, s) => {
    const out = seg(s.l, 96, 110);
    if (out < 1) {
      ctx.save();
      ctx.globalAlpha = 1 - out;
      intertitle(ctx, s, ["The hut blew away.", "Every file stayed."], {
        hi: "stayed",
        sub: "Nothing leaves your disk until you choose Empty Trash.",
      });
      ctx.restore();
    }
    if (s.l >= 100) storyEnd(ctx, env, shift(s, 100), { next: "The Lighthouse Keeper", pose: "waving" });
    else
      actor(ctx, env, s.f, { pose: "celebrating", x: 960, y: 1030, h: 180 * (1 - out), lean: Math.sin(s.f / 7) * 3 });
  },
};

const SCENES = [cold, chapter, dig, remove, storm, end];
const DI = sceneStart(SCENES, "dig"),
  RM = sceneStart(SCENES, "remove"),
  ST = sceneStart(SCENES, "storm");
export const s01e04Burrow: Film = story({
  id: "s01e04Burrow",
  no: 4,
  title: "The burrow.",
  atmosphere: "grove-burrow",
  scenes: SCENES,
  score: {
    key: 7,
    melody: 0,
    pops: [
      [CATCH_AT, 84],
      ...[60, ...ROOMS.map((r) => r.at)].map((c, i) => [DI + c, [79, 81, 84, 86, 88][i]] as [number, number]),
      [DI + FILED[1], 91],
      ...[FILES_AT, REMOVE_AT, DELETE_AT].map((c, i) => [RM + c, [81, 84, 79][i]] as [number, number]),
      [ST + 372, 88],
    ],
    thumps: [34, 58, 82, 106, DI + 100, ST + 200, ST + 250],
  },
});

export const s01e04Derive: DeriveSpec = {
  no: 4,
  series: "season-one",
  label: "Rotli · Season One · 04",
  vertical: [
    {
      frame: 20,
      len: 195,
      crop: { x: 240, y: 330, w: 1240, h: 750 },
      title: "The wind picks up.",
      sub: "The papers need a home.",
      hi: "home",
    },
    {
      frame: DI + 85,
      len: 255,
      crop: { x: 30, y: 270, w: 1360, h: 790 },
      title: "One folder.",
      sub: "Plain Markdown, in a folder you choose.",
      hi: "folder",
    },
    {
      frame: RM + 110,
      len: 210,
      crop: { x: 70, y: 30, w: 1260, h: 800 },
      title: "The file stays.",
      sub: "Remove from Main keeps it in your vault.",
      hi: "stays",
    },
    {
      frame: ST + 150,
      len: 240,
      crop: { x: 260, y: 110, w: 1600, h: 890 },
      title: "The hut can go.",
      sub: "The work still makes sense.",
      hi: "work",
    },
  ],
  slides: [
    {
      frame: 200,
      crop: { x: 240, y: 330, w: 1240, h: 750 },
      title: "The wind picks up.",
      sub: "The papers need a home.",
      hi: "home",
    },
    {
      frame: DI + 300,
      crop: { x: 30, y: 270, w: 1360, h: 790 },
      title: "One folder.",
      sub: "Plain Markdown, in a folder you choose.",
      hi: "folder",
    },
    {
      frame: RM + 380,
      crop: { x: 20, y: 30, w: 1880, h: 1050 },
      title: "Deleted, still here.",
      sub: "Trash lives inside the vault.",
      hi: "here",
    },
    {
      frame: ST + 395,
      crop: { x: 260, y: 110, w: 1600, h: 890 },
      title: "The hut can go.",
      sub: "The work still makes sense.",
      hi: "work",
    },
  ],
  single: {
    frame: DI + 330,
    crop: { x: 70, y: 90, w: 1780, h: 990 },
    title: "The burrow.",
    sub: "One folder keeps every file.",
    hi: "burrow",
  },
};
