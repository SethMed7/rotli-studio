// SEASON ONE · 03 — THE WORKSHOP. (60 s). Brief: series/season-one/episodes/s01e03.json
// Setup: The quokka needs a map of the island and a letter for the ferry office.
// Turn: It sketches the map on an Excalidraw board and writes the letter in a Word document, right beside its notes.
// Payoff: Both are saved in their own formats, as the same ordinary files any other app reads.
// Style: LINE (the line-art quokka, outline props on the paper-studio grid). Token: the Trip ideas note.
//
// CUE TABLE (global frames)
//   0    cold     the quokka hops to the drafting table; thinks: a board (the map), then a document (the letter)
//   210  chapter  "The workshop."
//   330  board    TURN: an Excalidraw board beside its notes; the island map drawn stroke by stroke, then labelled
//   780  doc      a Word document page; the letter to the ferry office typed, signed with a paw
//   1200 files    the folder: Trip ideas.md, Island map.excalidraw, Ferry letter.docx side by side; each opens
//   1590 payoff   "A map. A letter. / Ordinary files."
//   1680 end      Next: The Burrow
import type { Ctx, P } from "./core";
import type { Film } from "./film";
import { hopAlong } from "./rotli/actor";
import { card, chip, typed } from "./rotli/kit";
import type { DeriveSpec } from "./studio/derive";
import { lowerThird } from "./studio/series";
import {
  C,
  LIGHT,
  chapterCard,
  easeInOut,
  easeOut,
  fillRR,
  ink,
  intertitle,
  lineQuokka,
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
import { appFrame, caret, pointer } from "./studio/ui";
import type { PoseName } from "./quokka/poses";

const T = LIGHT;
// ---------------------------------------------------------------- local helpers
/** the point `t` (0..1) of the way along a polyline, for a pointer that follows the pen */
const along = (pts: P[], t: number, closed = false): P => {
  const q = closed ? pts.concat([pts[0]]) : pts,
    L: number[] = [0];
  for (let i = 1; i < q.length; i++) L.push(L[i - 1] + Math.hypot(q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1]));
  const d = Math.max(0, Math.min(1, t)) * L[L.length - 1];
  for (let i = 1; i < q.length; i++)
    if (d <= L[i]) {
      const k = (d - L[i - 1]) / (L[i] - L[i - 1] || 1);
      return [q[i - 1][0] + (q[i][0] - q[i - 1][0]) * k, q[i - 1][1] + (q[i][1] - q[i - 1][1]) * k];
    }
  return q[q.length - 1];
};
/** a slow camera push around a point (UI text stays ≥ 26 px on screen) */
const push = (ctx: Ctx, cx: number, cy: number, k: number) => {
  ctx.translate(cx, cy);
  ctx.scale(k, k);
  ctx.translate(-cx, -cy);
};
const ellipsePts = (cx: number, cy: number, rx: number, ry: number, n = 14, ph = 0): P[] =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + ph,
      w = 1 + 0.08 * Math.sin(i * 2.3);
    return [cx + Math.cos(a) * rx * w, cy + Math.sin(a) * ry * w] as P;
  });
/** the line-art quokka that can hop (lift) */
const lq = (ctx: Ctx, s: S, pose: PoseName, x: number, y: number, h: number, lift = 0, flip = false) => {
  ctx.save();
  if (flip) {
    ctx.translate(x * 2, 0);
    ctx.scale(-1, 1);
  }
  lineQuokka(ctx, s, { pose, x, y: y - lift, h });
  ctx.restore();
};
/** straight edges for ink(): subdivide so the hand-drawn spline keeps its corners */
const edges = (pts: P[], closed = false, n = 10): P[] => {
  const q = closed ? pts.concat([pts[0]]) : pts,
    out: P[] = [];
  for (let i = 1; i < q.length; i++)
    for (let j = 0; j < n; j++)
      out.push([q[i - 1][0] + ((q[i][0] - q[i - 1][0]) * j) / n, q[i - 1][1] + ((q[i][1] - q[i - 1][1]) * j) / n]);
  if (!closed) out.push(q[q.length - 1]);
  return out;
};
const press = (l: number, at: number[]) => at.reduce((a, c) => Math.max(a, l >= c && l < c + 14 ? (l - c) / 14 : 0), 0);

// ---------------------------------------------------------------- the island map (board-canvas coordinates)
const COAST: P[] = [
  [660, 500],
  [700, 455],
  [770, 440],
  [840, 420],
  [930, 410],
  [1010, 380],
  [1090, 360],
  [1180, 350],
  [1270, 365],
  [1350, 400],
  [1395, 450],
  [1380, 510],
  [1330, 540],
  [1300, 590],
  [1240, 620],
  [1150, 610],
  [1080, 640],
  [990, 630],
  [900, 600],
  [820, 580],
  [740, 560],
  [680, 540],
];
type Stroke = { pts: P[]; closed?: boolean; t0: number; t1: number; dash?: number[]; tool: number };
const STROKES: Stroke[] = [
  { pts: COAST, closed: true, t0: 30, t1: 120, tool: 6 },
  {
    pts: [
      [856, 520],
      [862, 462],
      [878, 462],
      [884, 520],
    ],
    closed: true,
    t0: 130,
    t1: 146,
    tool: 6,
  },
  {
    pts: [
      [850, 462],
      [870, 444],
      [890, 462],
    ],
    t0: 146,
    t1: 154,
    tool: 6,
  },
  { pts: ellipsePts(1120, 480, 70, 38), closed: true, t0: 160, t1: 180, tool: 6 },
  { pts: ellipsePts(1000, 520, 44, 28, 12, 1), closed: true, t0: 184, t1: 198, tool: 6 },
  { pts: ellipsePts(1236, 452, 40, 24, 12, 2), closed: true, t0: 202, t1: 216, tool: 6 },
  {
    pts: [
      [1385, 500],
      [1455, 500],
    ],
    t0: 222,
    t1: 230,
    tool: 5,
  },
  {
    pts: [
      [1455, 484],
      [1455, 516],
    ],
    t0: 230,
    t1: 236,
    tool: 5,
  },
  {
    pts: [
      [1570, 740],
      [1545, 650],
      [1505, 575],
      [1470, 528],
    ],
    t0: 244,
    t1: 276,
    dash: [14, 12],
    tool: 4,
  },
  {
    pts: [
      [1462, 553],
      [1470, 528],
      [1492, 540],
    ],
    t0: 276,
    t1: 282,
    tool: 4,
  },
];
const LABELS: { s: string; x: number; y: number; t0: number; align?: CanvasTextAlign }[] = [
  { s: "Thomson Bay", x: 1400, y: 410, t0: 290 },
  { s: "Lighthouse", x: 870, y: 562, t0: 310, align: "center" },
  { s: "Salt lakes", x: 1120, y: 566, t0: 330, align: "center" },
  { s: "Ferry", x: 1528, y: 712, t0: 350, align: "right" },
];
/** the map at progress `l` (board-scene local frames); a finished copy is `l = 999` */
const islandMap = (ctx: Ctx, l: number, f: number, labels = true) => {
  STROKES.forEach((st, i) =>
    ink(ctx, st.pts, {
      w: 4,
      color: C.ink,
      seed: 60 + i,
      frame: f,
      closed: st.closed,
      progress: seg(l, st.t0, st.t1),
      dash: st.dash,
      wob: 1.6,
    }),
  );
  if (labels)
    LABELS.forEach((lb) => {
      const t = seg(l, lb.t0, lb.t0 + 14);
      if (t > 0) text(ctx, typed(lb.s, t), lb.x, lb.y, { size: 28, weight: 500, color: T.roles.text, align: lb.align });
    });
};

// ---------------------------------------------------------------- the drafting table (outline props, the line style)
const draftingTable = (ctx: Ctx, f: number, x: number, y: number) => {
  const o = { w: 4, color: C.ink, frame: f, wob: 1 };
  ink(
    ctx,
    edges(
      [
        [x - 250, y - 290],
        [x + 250, y - 290],
        [x + 220, y - 390],
        [x - 220, y - 390],
      ],
      true,
    ),
    { ...o, wob: 0.6, closed: true, seed: 1 },
  ); // the tilted board
  ink(
    ctx,
    [
      [x - 262, y - 280],
      [x + 262, y - 280],
    ],
    { ...o, seed: 2 },
  ); // the ledge
  ink(
    ctx,
    edges(
      [
        [x - 150, y - 375],
        [x + 130, y - 375],
        [x + 145, y - 305],
        [x - 165, y - 305],
      ],
      true,
    ),
    { ...o, w: 3, wob: 0.5, closed: true, seed: 3 },
  ); // a blank sheet
  ink(
    ctx,
    [
      [x + 40, y - 286],
      [x + 130, y - 289],
    ],
    { ...o, w: 7, seed: 4 },
  ); // the pencil
  ink(
    ctx,
    [
      [x - 210, y - 280],
      [x - 240, y],
    ],
    { ...o, seed: 5 },
  );
  ink(
    ctx,
    [
      [x + 210, y - 280],
      [x + 240, y],
    ],
    { ...o, seed: 6 },
  ); // legs
  ink(
    ctx,
    [
      [x - 226, y - 120],
      [x + 226, y - 120],
    ],
    { ...o, seed: 7 },
  ); // the crossbar
  ink(
    ctx,
    [
      [x + 215, y - 392],
      [x + 270, y - 520],
      [x + 190, y - 580],
    ],
    { ...o, seed: 8 },
  ); // the lamp arm
  ink(
    ctx,
    edges(
      [
        [x + 150, y - 540],
        [x + 220, y - 610],
        [x + 240, y - 520],
      ],
      true,
    ),
    { ...o, wob: 0.6, closed: true, seed: 9 },
  ); // the shade
};

// ---------------------------------------------------------------- scenes
const TX = 820,
  TY = 930,
  QX = 1330; // the table, the floor, where the quokka stops
const cold: Scene = {
  id: "cold",
  len: 210,
  draw: (ctx, env, s) => {
    draftingTable(ctx, s.f, TX, TY);
    card(ctx, {
      x: TX - 200,
      y: TY - 400,
      rot: -0.14,
      scale: 0.8,
      title: "Trip ideas",
      token: true,
      lines: 2,
      seed: 31,
      frame: s.f,
    });
    const h = hopAlong(
      s.l,
      [
        [0, 2060, TY],
        [18, 1820, TY],
        [36, 1580, TY],
        [54, QX, TY],
        [160, QX, TY],
        [184, QX - 90, TY],
      ],
      90,
    );
    const pose: PoseName = s.l < 56 ? "walking" : s.l < 160 ? "thoughtful" : "notes";
    lq(ctx, s, pose, h.x, h.y, 380, h.lift, pose === "walking");
    thought(ctx, s, h.x - 20, h.y - 330, "board", s.t(66, 84), { side: -1, scale: 0.9 });
    thought(ctx, s, h.x + 20, h.y - 330, "doc", s.t(118, 136), { side: 1, scale: 0.9 });
    intertitle(ctx, s, ["It needs a map of the island,"], { y: 170, size: 60, hi: "map", t0: 50 });
    intertitle(ctx, s, ["and a letter for the ferry office."], { y: 256, size: 60, hi: "letter", t0: 104 });
  },
};
const chapter: Scene = {
  id: "chapter",
  len: 120,
  draw: (ctx, env, s) => chapterCard(ctx, env, s, { no: 3, title: ["The workshop."], pose: "thoughtful", line: true }),
};

// the app window, in logical coordinates, pushed in around its centre
const WIN = { x: 150, y: 90, w: 1460, h: 740 },
  SIDE = 280,
  PANE = { x: WIN.x + SIDE + 2, y: WIN.y, w: WIN.w - SIDE - 2, h: WIN.h },
  NOTES = ["Trip ideas", "Island map", "Ferry letter"];
const TOOLS = 8,
  TOOL_W = 54,
  TB = { x: 1020 - (TOOLS * TOOL_W + 20) / 2, y: 110, w: TOOLS * TOOL_W + 20, h: 64 };
/** the Excalidraw tool strip: select, rectangle, diamond, ellipse, arrow, line, draw, text */
const toolbar = (ctx: Ctx, active: number) => {
  const R = T.roles;
  fillRR(ctx, TB.x, TB.y, TB.w, TB.h, 14, R.surface, R.border, 2);
  for (let i = 0; i < TOOLS; i++) {
    const cx = TB.x + 10 + i * TOOL_W + TOOL_W / 2,
      cy = TB.y + TB.h / 2;
    if (i === active) fillRR(ctx, cx - 24, cy - 24, 48, 48, 10, R.tint);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = R.text;
    ctx.fillStyle = R.text;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    if (i === 0) {
      ctx.moveTo(-7, -11);
      ctx.lineTo(-7, 10);
      ctx.lineTo(-1, 4);
      ctx.lineTo(8, 4);
      ctx.closePath();
    }
    if (i === 1) ctx.rect(-10, -9, 20, 18);
    if (i === 2) {
      ctx.moveTo(0, -12);
      ctx.lineTo(12, 0);
      ctx.lineTo(0, 12);
      ctx.lineTo(-12, 0);
      ctx.closePath();
    }
    if (i === 3) ctx.ellipse(0, 0, 12, 10, 0, 0, 6.29);
    if (i === 4) {
      ctx.moveTo(-11, 9);
      ctx.lineTo(10, -10);
      ctx.moveTo(1, -10);
      ctx.lineTo(10, -10);
      ctx.lineTo(10, -1);
    }
    if (i === 5) {
      ctx.moveTo(-11, 9);
      ctx.lineTo(11, -9);
    }
    if (i === 6) {
      ctx.moveTo(-10, 10);
      ctx.lineTo(-8, 3);
      ctx.lineTo(6, -11);
      ctx.lineTo(11, -6);
      ctx.lineTo(-3, 8);
      ctx.closePath();
    }
    ctx.stroke();
    ctx.restore();
    if (i === 7) text(ctx, "A", cx, cy + 10, { size: 28, weight: 600, align: "center", color: R.text });
  }
};
const appWin = (ctx: Ctx, s: S, active: number, file: string) => {
  appFrame(ctx, T, WIN, { notes: NOTES, active, side: SIDE });
  text(ctx, file, PANE.x + 36, WIN.y + 152, { size: 26, weight: 600, color: T.roles["text-muted"] });
};
const board: Scene = {
  id: "board",
  len: 450,
  transition: "wipe",
  draw: (ctx, env, s) => {
    ctx.save();
    push(ctx, 880, 460, 1.09 + 0.03 * easeInOut(s.t(0, s.len)));
    appWin(ctx, s, 1, "Island map.excalidraw");
    const cur = STROKES.find((st) => s.l >= st.t0 - 8 && s.l < st.t1 + 4),
      lab = LABELS.find((lb) => s.l >= lb.t0 - 8 && s.l < lb.t0 + 18);
    toolbar(ctx, cur ? cur.tool : lab ? 7 : s.l < 30 ? 6 : 0);
    ctx.save();
    ctx.beginPath();
    ctx.rect(PANE.x, TB.y + TB.h + 6, PANE.w, WIN.y + WIN.h - TB.y - TB.h - 10);
    ctx.clip();
    islandMap(ctx, s.l, s.f);
    ctx.restore();
    // the pointer rides the pen tip; for labels it sits at the text tool's caret; after, it idles
    let px = 1200 + 60 * Math.sin(s.f / 23),
      py = 760 + 20 * Math.sin(s.f / 17);
    if (s.l < 30) {
      const k = easeInOut(s.t(0, 28));
      px = 1500 - (1500 - COAST[0][0]) * k;
      py = 780 - (780 - COAST[0][1]) * k;
    } else if (cur) [px, py] = along(cur.pts, seg(s.l, cur.t0, cur.t1), cur.closed);
    else if (lab) {
      px =
        lab.x +
        (lab.align === "center"
          ? 0
          : lab.align === "right"
            ? -measure(ctx, lab.s, 28)
            : measure(ctx, typed(lab.s, seg(s.l, lab.t0, lab.t0 + 14)), 28));
      py = lab.y - 10;
    } else if (s.l < 290) {
      const prev = STROKES.filter((st) => s.l >= st.t1).pop();
      if (prev) [px, py] = along(prev.pts, 1, prev.closed);
    }
    pointer(ctx, px, py, press(s.l, [...STROKES.map((st) => st.t0), ...LABELS.map((lb) => lb.t0 - 4)]));
    ctx.restore();
    lq(ctx, s, s.l < 380 ? "notes" : "celebrating", 1800, 1062, 300);
    thought(ctx, s, 1760, 790, "heart", s.t(380, 398), { side: 1, scale: 0.8 });
    lowerThird(ctx, s.l, 50, s.len, "Sketch on an Excalidraw canvas,", "saved as an ordinary .excalidraw file.");
  },
};

// ---------------------------------------------------------------- the Word document
const PAGE = { x: 690, y: 200, w: 660 },
  LM = PAGE.x + 70;
const LETTER: { s: string; y: number; t0: number; t1: number; bold?: boolean }[] = [
  { s: "Dear ferry office,", y: 290, t0: 52, t1: 86, bold: true },
  { s: "Please hold one seat on the", y: 360, t0: 106, t1: 150 },
  { s: "morning ferry to Thomson Bay.", y: 406, t0: 154, t1: 200 },
  { s: "I will bring my own map.", y: 452, t0: 206, t1: 244 },
  { s: "Thank you,", y: 522, t0: 256, t1: 276 },
];
const DOC_TOOLS = ["B", "I", "U", "H1", "H2", "≡"],
  DTX = 1010,
  DTY = 110;
const docToolbar = (ctx: Ctx, bold: boolean) => {
  const R = T.roles;
  DOC_TOOLS.forEach((b, i) => {
    const x = DTX + i * 62 + (i > 2 ? 18 : 0);
    fillRR(ctx, x, DTY + 8, 52, 50, 10, i === 0 && bold ? R.tint : R.surface, R.border, 2);
    text(ctx, b, x + 26, DTY + 43, {
      size: 26,
      weight: i === 0 ? 700 : 600,
      align: "center",
      color: R.text,
      font: i === 1 ? undefined : undefined,
    });
  });
  ctx.fillStyle = R.border;
  ctx.fillRect(DTX + 3 * 62 + 4, DTY + 14, 2, 38);
};
/** a paw print signature: the pad and four toes, outlined */
const paw = (ctx: Ctx, x: number, y: number, k: number, f: number, col = C.ink) => {
  if (k <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, k);
  ink(ctx, ellipsePts(0, 8, 20, 16, 12), { w: 3.5, color: col, closed: true, seed: 71, frame: f, wob: 0.5 });
  [
    [-24, -16],
    [-9, -28],
    [9, -28],
    [24, -16],
  ].forEach(([tx, ty], i) =>
    ink(ctx, ellipsePts(tx, ty, 7, 9, 8), { w: 3, color: col, closed: true, seed: 72 + i, frame: f, wob: 0.4 }),
  );
  ctx.restore();
};
const doc: Scene = {
  id: "doc",
  len: 420,
  draw: (ctx, env, s) => {
    const R = T.roles;
    ctx.save();
    push(ctx, 880, 460, 1.09 + 0.03 * easeInOut(s.t(0, s.len)));
    appWin(ctx, s, 2, "Ferry letter.docx");
    const bold = s.l >= 42 && s.l < 96;
    docToolbar(ctx, bold);
    ctx.save();
    ctx.beginPath();
    ctx.rect(PANE.x, DTY + 76, PANE.w - 2, WIN.y + WIN.h - DTY - 78);
    ctx.clip();
    ctx.fillStyle = R["surface-2"];
    ctx.fillRect(PANE.x, DTY + 76, PANE.w, 800);
    fillRR(ctx, PAGE.x, PAGE.y, PAGE.w, 900, 4, R.surface, R.border, 2);
    let cx = LM,
      cy = LETTER[0].y;
    LETTER.forEach((ln) => {
      const t = seg(s.l, ln.t0, ln.t1);
      if (t <= 0) return;
      const shown = typed(ln.s, t),
        wt = ln.bold ? 700 : 500;
      text(ctx, shown, LM, ln.y, { size: 30, weight: wt, color: R.text });
      cx = LM + measure(ctx, shown, 30, wt);
      cy = ln.y;
    });
    const sign = pop(s.t(288, 304));
    paw(ctx, LM + 40, 590, sign, s.f, R.text);
    if (s.l < 290) caret(ctx, T, cx, cy, s.l < LETTER[LETTER.length - 1].t1 ? 0 : s.f, 32);
    ctx.restore();
    // the pointer: to Bold, click; after the greeting, click Bold off; then it rests beside the page
    const bx = DTX + 26,
      by = DTY + 36;
    let px = 1300,
      py = 700;
    if (s.l < 42) {
      const k = easeInOut(s.t(10, 38));
      px = 1300 + (bx - 1300) * k;
      py = 700 + (by - 700) * k;
    } else if (s.l < 110) {
      px = bx + 6 * Math.sin(s.f / 9);
      py = by + 4;
    } else if (s.l < 280) {
      const k = easeInOut(s.t(110, 140));
      px = bx + (1440 - bx) * k;
      py = by + (620 - by) * k;
    } else {
      const k = easeInOut(s.t(280, 290));
      px = 1440 + (LM + 80 - 1440) * k + 10 * Math.sin(s.f / 13) * seg(s.l, 310, 330);
      px += (LM + 260 - (LM + 80)) * k;
      py = 620 + 40 * k;
    }
    pointer(ctx, px, py, press(s.l, [40, 94, 288]));
    ctx.restore();
    lq(ctx, s, s.l < 320 ? "notes" : "celebrating", 1800, 1062, 300);
    thought(ctx, s, 1760, 790, "check", s.t(322, 340), { side: 1, scale: 0.8 });
    lowerThird(
      ctx,
      s.l,
      40,
      s.len,
      "Word documents (.docx) and Excalidraw boards",
      "open and save in their own formats, alongside your notes.",
    );
  },
};

// ---------------------------------------------------------------- the folder: three ordinary files side by side
const TILE = { w: 380, h: 440, y: 260 },
  TILES = [
    { name: "Trip ideas.md", ext: ".md", kind: "Markdown", cx: 520 },
    { name: "Island map.excalidraw", ext: ".excalidraw", kind: "Excalidraw", cx: 960 },
    { name: "Ferry letter.docx", ext: ".docx", kind: "Word", cx: 1400 },
  ];
const OPEN = [180, 222, 264]; // the pointer opens each file in turn
const fileTile = (ctx: Ctx, s: S, i: number, k: number, bump: number) => {
  const t = TILES[i],
    x = t.cx - TILE.w / 2,
    y = TILE.y,
    fold = 44,
    R = T.roles;
  ctx.save();
  ctx.translate(t.cx, y + TILE.h / 2);
  ctx.rotate(Math.sin(s.f / 37 + i * 2) * 0.012);
  ctx.scale(k * (1 + 0.04 * bump), k * (1 - 0.03 * bump));
  ctx.translate(-t.cx, -(y + TILE.h / 2));
  ctx.beginPath();
  ctx.moveTo(x + 16, y);
  ctx.lineTo(x + TILE.w - fold, y);
  ctx.lineTo(x + TILE.w, y + fold);
  ctx.lineTo(x + TILE.w, y + TILE.h - 16);
  ctx.quadraticCurveTo(x + TILE.w, y + TILE.h, x + TILE.w - 16, y + TILE.h);
  ctx.lineTo(x + 16, y + TILE.h);
  ctx.quadraticCurveTo(x, y + TILE.h, x, y + TILE.h - 16);
  ctx.lineTo(x, y + 16);
  ctx.quadraticCurveTo(x, y, x + 16, y);
  ctx.closePath();
  ctx.fillStyle = R.surface;
  ctx.fill();
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + TILE.w - fold, y);
  ctx.lineTo(x + TILE.w - fold, y + fold);
  ctx.lineTo(x + TILE.w, y + fold);
  ctx.stroke();
  chip(ctx, x + 24, y + 26, t.ext, { size: 26, mono: true, bg: R.tint, fg: R["accent-text"] });
  const py = y + 210;
  if (i === 0)
    card(ctx, { x: t.cx, y: py, scale: 1.35, title: "Trip ideas", token: true, lines: 3, seed: 31, frame: s.f });
  if (i === 1) {
    ctx.save();
    ctx.translate(t.cx, py);
    ctx.scale(0.36, 0.36);
    ctx.translate(-1070, -540);
    islandMap(ctx, 999, s.f, false);
    ctx.restore();
  }
  if (i === 2) {
    fillRR(ctx, t.cx - 80, py - 100, 160, 200, 4, R.surface, R.border, 2);
    [0, 1, 2, 3].forEach((j) =>
      ink(
        ctx,
        [
          [t.cx - 58, py - 70 + j * 26],
          [t.cx - 58 + [96, 116, 110, 80][j], py - 70 + j * 26],
        ],
        { w: j ? 3 : 5, color: j ? R["text-muted"] : R.text, seed: 80 + j, frame: s.f, wob: 0.3 },
      ),
    );
    paw(ctx, t.cx - 40, py + 62, 0.6, s.f, R.text);
  }
  text(ctx, t.name, t.cx, y + TILE.h - 64, { size: 28, weight: 600, align: "center", color: R.text });
  text(ctx, t.kind, t.cx, y + TILE.h - 26, { size: 26, weight: 500, align: "center", color: R["text-muted"] });
  ctx.restore();
};
/** a small outlined folder mark for the header */
const folderMark = (ctx: Ctx, x: number, y: number, f: number) =>
  ink(
    ctx,
    [
      [x, y + 34],
      [x, y],
      [x + 22, y],
      [x + 30, y + 8],
      [x + 56, y + 8],
      [x + 56, y + 34],
    ],
    { w: 4, color: C.ink, closed: true, seed: 90, frame: f, wob: 0.5 },
  );
const files: Scene = {
  id: "files",
  len: 390,
  draw: (ctx, env, s) => {
    const hk = easeOut(s.t(0, 16));
    folderMark(ctx, 330, 150 - 12 * (1 - hk), s.f);
    text(ctx, "Rottnest trip", 406, 182 - 12 * (1 - hk), {
      size: 48,
      weight: 600,
      color: C.cocoa,
      alpha: hk,
      spacing: -1.5,
    });
    TILES.forEach((_, i) => {
      const k = pop(s.t(18 + i * 22, 40 + i * 22));
      if (k <= 0) return;
      const b = OPEN[i],
        bump = s.l >= b && s.l < b + 12 ? Math.sin(((s.l - b) / 12) * Math.PI) : 0;
      fileTile(ctx, s, i, k, bump);
    });
    // the pointer double-clicks each file: it opens as itself
    const route: P[] = [[1300, 860], ...TILES.map((t) => [t.cx + 60, TILE.y + 250] as P), [1500, 820]];
    let px: number, py: number;
    const lt = s.l - 150;
    if (lt < 0) {
      px = 1300 + 30 * Math.sin(s.f / 19);
      py = 860;
    } else {
      const i = Math.min(3, Math.floor(lt / 42)),
        k = easeInOut(Math.min(1, (lt - i * 42) / 26));
      px = route[i][0] + (route[i + 1][0] - route[i][0]) * k;
      py = route[i][1] + (route[i + 1][1] - route[i][1]) * k;
    }
    if (s.l > 120)
      pointer(
        ctx,
        px,
        py,
        Math.max(
          press(s.l, OPEN),
          press(
            s.l,
            OPEN.map((o) => o + 6),
          ),
        ),
      );
    const q = hopAlong(
      s.l,
      [
        [0, 1780, 1040],
        [300, 1780, 1040],
        [318, 1780, 1040],
      ],
      60,
    );
    lq(
      ctx,
      s,
      s.l < 300 ? "base" : "celebrating",
      q.x,
      q.y,
      340,
      s.l >= 300 && s.l < 330 ? Math.sin(((s.l - 300) / 30) * Math.PI) * 40 : 0,
    );
    thought(ctx, s, 1760, 720, "folder", s.t(96, 114), { side: -1, scale: 0.8 });
    lowerThird(ctx, s.l, 100, s.len, "Open and save in their own formats,", "alongside your notes.");
  },
};
const payoff: Scene = {
  id: "payoff",
  len: 90,
  draw: (ctx, env, s) => {
    intertitle(ctx, s, ["A map. A letter.", "Ordinary files."], { hi: "Ordinary" });
    lq(ctx, s, "celebrating", 1700 + 8 * Math.sin(s.f / 11), 1040, 260, Math.abs(Math.sin(s.l / 9)) * 18);
  },
};
const end: Scene = {
  id: "end",
  len: 120,
  draw: (ctx, env, s) => storyEnd(ctx, env, s, { next: "The Burrow", pose: "waving", line: true }),
};

const SCENES = [cold, chapter, board, doc, files, payoff, end];
const BO = sceneStart(SCENES, "board"),
  DO = sceneStart(SCENES, "doc"),
  FI = sceneStart(SCENES, "files");
export const s01e03Workshop: Film = story({
  id: "s01e03Workshop",
  no: 3,
  title: "The workshop.",
  atmosphere: "paper-studio",
  scenes: SCENES,
  score: {
    key: 5,
    melody: 1,
    pops: [
      ...STROKES.filter((st, i) => i === 0 || st.t0 - STROKES[i - 1].t1 > 4).map(
        (st, i) => [BO + st.t0, [79, 81, 84, 86, 88, 84, 81][i % 7]] as [number, number],
      ),
      ...LETTER.map((ln, i) => [DO + ln.t0, [79, 81, 84, 86, 88][i]] as [number, number]),
      [DO + 288, 91],
      ...TILES.map((_, i) => [FI + 18 + i * 22, [84, 86, 88][i]] as [number, number]),
    ],
    thumps: [18, 36, 54],
  },
});

const CROP = {
  cold: { x: 500, y: 290, w: 1100, h: 690 },
  board: { x: 400, y: 60, w: 1300, h: 820 },
  doc: { x: 600, y: 60, w: 900, h: 740 },
  files: { x: 300, y: 110, w: 1610, h: 950 },
};
export const s01e03Derive: DeriveSpec = {
  no: 3,
  series: "season-one",
  line: true,
  label: "Rotli · Season One · 03",
  vertical: [
    {
      frame: 60,
      len: 150,
      crop: CROP.cold,
      title: "A map and a letter.",
      sub: "The quokka has things to make.",
      hi: "map",
    },
    {
      frame: BO + 40,
      len: 300,
      crop: CROP.board,
      title: "Sketch on Excalidraw.",
      sub: "Saved as an ordinary .excalidraw file.",
      hi: "Excalidraw",
    },
    {
      frame: DO + 40,
      len: 270,
      crop: CROP.doc,
      title: "Word documents (.docx).",
      sub: "Open and save in their own formats.",
      hi: "Word",
    },
    {
      frame: FI + 20,
      len: 180,
      crop: CROP.files,
      title: "Ordinary files.",
      sub: "Alongside your notes.",
      hi: "Ordinary",
    },
  ],
  slides: [
    { frame: 200, crop: CROP.cold, title: "A map and a letter.", sub: "The quokka has things to make.", hi: "map" },
    {
      frame: BO + 400,
      crop: CROP.board,
      title: "Sketch on Excalidraw.",
      sub: "Saved as an ordinary .excalidraw file.",
      hi: "Excalidraw",
    },
    {
      frame: DO + 340,
      crop: CROP.doc,
      title: "Word documents (.docx).",
      sub: "Open and save in their own formats.",
      hi: "Word",
    },
    { frame: FI + 330, crop: CROP.files, title: "Ordinary files.", sub: "Alongside your notes.", hi: "Ordinary" },
  ],
  single: {
    frame: FI + 330,
    crop: CROP.files,
    title: "The workshop.",
    sub: "In their own formats, alongside your notes.",
    hi: "workshop",
  },
};
