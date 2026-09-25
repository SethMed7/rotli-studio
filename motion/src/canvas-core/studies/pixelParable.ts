// STUDY 11 · PIXEL PARABLE (25 s, 30 fps, 120 bpm). A cautionary tale in 8-bit: a manager rewards meetings
// booked, the team floods the sky with calendar icons, most of them turn out to be no-shows, a pixel serpent eats
// the day, and a crisp card shows the fix (count what happened, not what was booked). One source, designed for
// vertical and landscape. Brand: the neutral pack, palette "arcade".
// Brief: series/studies/briefs/pixel-parable.json · prompt: series/studies/prompts/pixel-parable.prompt.md
//
// The grid decision: every pixel of the scene is a CELL of 6 px, and every position is a whole number of cells,
// so nothing is ever anti-aliased; only the UI cards and captions are drawn crisp, on top. The whole film is one
// continuous function paint(F) of a (fractional) frame, and the shots only name the sections on the timeline.
import PACK from "../../../brand/packs/studio/pack.json";
import { rng, type Ctx, type Env } from "../core";
import type { Film, Shot } from "../film";
import { ladder, w, type Word } from "../kit/captions";
import { clamp, ease, lerp, prog, spring } from "../kit/motion";
import { usePack } from "../kit/pack";
import { beatScore } from "../kit/score";
import { layout, type Size } from "../kit/sizes";
import { text } from "../kit/type";
import { card, rr } from "../kit/ui";

const P = usePack(PACK),
  C = P.palette("arcade"),
  F_ = P.face;
const FPS = 30,
  BPM = 120,
  N = 750,
  BEAT = 15, // 60 / 120 × 30
  PX = 6; // the one pixel size
// the timeline, in frames (every cut on a beat)
const T = { hook: 0, book: 75, noshow: 210, serpent: 345, fix: 480, sign: 630 };

// ---- colour: the pack's arcade palette, plus flat tints mixed from it (never a gradient)
const mix = (a: string, b: string, t: number) => {
  const p = (s: string, i: number) => parseInt(s.slice(1 + i * 2, 3 + i * 2), 16);
  return `#${[0, 1, 2]
    .map((i) =>
      Math.round(lerp(p(a, i), p(b, i), t))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
};
const SKY = C.sky!,
  K = C.ground, // outlines, hair, the ground strip
  CREAM = C.ink,
  TEAL = C.accent2,
  MAG = C.accent,
  CITY = mix(SKY, C.muted, 0.2),
  CITY_LIT = mix(SKY, C.muted, 0.42);

// ---- the grid: every scene pixel is a whole cell
const cell = (ctx: Ctx, x: number, y: number, w: number, h: number, color: string) => {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x) * PX, Math.round(y) * PX, Math.round(w) * PX, Math.round(h) * PX);
};
// the calendar icon, 9 × 9 cells; b = its state colour (teal booked, magenta no-show)
const ICON = [
  "..k...k..",
  "kkkkkkkkk",
  "kbbbbbbbk",
  "kbbbbbbbk",
  "kfffffffk",
  "kfbfbfbfk",
  "kfffffffk",
  "kfbfbfffk",
  "kkkkkkkkk",
];
/** the icon squashed to sx × sy (a pixel flip samples whole source cells, so it stays on the grid) */
const icon = (ctx: Ctx, cx: number, cy: number, color: string, sx = 1, sy = 1, k = 1) => {
  const nw = Math.max(1, Math.round(9 * sx)),
    nh = Math.max(1, Math.round(9 * sy));
  if (sx <= 0.02 || sy <= 0.02) return;
  const x0 = Math.round(cx) - Math.floor(nw / 2) * k,
    y0 = Math.round(cy) - Math.floor(nh / 2) * k,
    pal: Record<string, string> = { k: K, b: color, f: CREAM };
  for (let j = 0; j < nh; j++) {
    const row = ICON[Math.floor((j * 9) / nh)]!;
    for (let i = 0; i < nw; i++) {
      const ch = row[Math.floor((i * 9) / nw)]!;
      if (ch !== ".") cell(ctx, x0 + i * k, y0 + j * k, k, k, pal[ch]!);
    }
  }
};

// pixel type: 3 × 5 digits for the hour tiles, 5 × 7 letters for the sign
const DIGITS: Record<string, string[]> = {
  "0": ["###", "#.#", "#.#", "#.#", "###"],
  "1": [".#.", "##.", ".#.", ".#.", "###"],
  "2": ["##.", "..#", ".#.", "#..", "###"],
  "3": ["##.", "..#", ".#.", "..#", "##."],
  "4": ["#.#", "#.#", "###", "..#", "..#"],
  "5": ["###", "#..", "##.", "..#", "##."],
  "9": ["###", "#.#", "###", "..#", "##."],
};
const GLYPHS: Record<string, string[]> = {
  O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  r: ["....", "....", "#.##", "##..", "#...", "#...", "#..."],
  i: [".#.", "...", "##.", ".#.", ".#.", ".#.", "###"],
  e: [".....", ".....", ".###.", "#...#", "#####", "#....", ".###."],
  l: ["##.", ".#.", ".#.", ".#.", ".#.", ".#.", "###"],
};
const glyphRun = (
  ctx: Ctx,
  s: string,
  font: Record<string, string[]>,
  x: number,
  y: number,
  k: number,
  color: string,
) => {
  let cx = x;
  for (const ch of s) {
    const g = font[ch]!;
    g.forEach((row, j) => [...row].forEach((c, i) => c === "#" && cell(ctx, cx + i * k, y + j * k, k, k, color)));
    cx += (g[0]!.length + 1) * k;
  }
};
const runWidth = (s: string, font: Record<string, string[]>, k: number) =>
  [...s].reduce((a, ch) => a + (font[ch]![0]!.length + 1) * k, 0) - k;

// ---- people: 12 × 27 cells, feet on a row. Poses are drawn from parts so a pose change is a pixel change.
type Pose = "stand" | "sit" | "cheer" | "fiveL" | "fiveR";
type Mood = "smile" | "flat" | "frown";
type Who = { shirt: string; hair: string; tie?: boolean };
const person = (
  ctx: Ctx,
  x: number,
  feet: number,
  who: Who,
  o: { pose: Pose; look: number; down?: boolean; mood: Mood; blink?: boolean; type?: number; step?: number },
) => {
  const top = feet - 27,
    R = (cx: number, cy: number, w: number, h: number, c: string) => cell(ctx, x + cx, top + cy, w, h, c);
  const up = o.pose === "cheer" || o.pose === "fiveL" || o.pose === "fiveR",
    upL = o.pose === "cheer" || o.pose === "fiveL",
    upR = o.pose === "cheer" || o.pose === "fiveR";
  // legs (hidden behind the desk when seated)
  if (o.pose !== "sit") {
    const lift = o.step ?? 0;
    R(3, 20, 2, lift === 1 ? 5 : 6, C.surface);
    R(7, 20, 2, lift === 2 ? 5 : 6, C.surface);
    R(2, lift === 1 ? 25 : 26, 3, 1, K);
    R(7, lift === 2 ? 25 : 26, 3, 1, K);
  }
  // torso and arms
  R(1, 10, 10, 1, K);
  R(0, 11, 12, 9, K);
  R(3, 11, 6, 8, who.shirt);
  R(5, 11, 2, 1, CREAM); // the neck
  if (who.tie) R(5, 12, 2, 5, MAG);
  const arm = (side: 0 | 1, raised: boolean) => {
    const ax = side ? 10 : 1;
    if (raised) {
      // raised: a Y pose, the arm clear of the head
      R(side ? 9 : 0, 11, 3, 8, K); // the sleeve folds away
      R(side ? 11 : -2, 0, 3, 12, K);
      R(side ? 12 : -1, 4, 1, 7, who.shirt);
      R(side ? 12 : -1, 1, 1, 2, CREAM);
    } else if (o.pose === "sit") {
      R(ax, 11, 1, 1, who.shirt);
      R(ax, 12 - ((o.type ?? 0) === side + 1 ? 1 : 0), 1, 2, CREAM);
    } else {
      R(ax, 11, 1, 6, who.shirt);
      R(ax, 17, 1, 2, CREAM);
    }
  };
  arm(0, up && upL);
  arm(1, up && upR);
  // head: hair, face, eyes, mouth (the face turns with `look`)
  R(3, 0, 6, 1, who.hair);
  R(2, 1, 8, 8, K);
  R(2, 1, 8, 2, who.hair);
  R(2, 3, 1, 2, who.hair);
  R(9, 3, 1, 2, who.hair);
  R(3, 3, 6, 6, CREAM);
  R(3, 9, 6, 1, K);
  const lx = clamp(Math.round(o.look), -1, 1),
    ey = o.down ? 4 : 3;
  for (const ex of [4 + lx, 7 + lx]) R(ex, o.blink ? ey + 1 : ey, 1, o.blink ? 1 : 2, K);
  const mx = 5 + lx;
  if (o.mood === "smile") {
    R(mx - 1, 6, 1, 1, K);
    R(mx + 2, 6, 1, 1, K);
    R(mx, 7, 2, 1, K);
  } else if (o.mood === "frown") {
    R(mx, 6, 2, 1, K);
    R(mx - 1, 7, 1, 1, K);
    R(mx + 2, 7, 1, 1, K);
  } else R(mx, 7, 2, 1, K);
};

// ---- per-size design, in cells (the scene) and px (the crisp layer)
type Lay = {
  gy: number; // the ground strip's top row
  mgr: number; // manager's left column
  desks: number[]; // desk left columns (30 wide)
  tower: { x: number; y: number }; // the icon grid's top-left (8 × 6, pitch 10)
  rows: [number, number]; // the serpent's path rows on the floor
  turn: number; // where the path turns down
  tiles: number[]; // hour-tile centre columns, in path order
  sign: { cx: number; top: number };
  lineC: number; // the sign-off line's centre column
  text: { x: number; y: number; size: number };
  counter: [number, number, number, number];
  fixCard: [number, number, number, number];
  chip: { x: number; y: number };
  cityMax: number;
};
const design = (size: Size): Lay =>
  size === "vertical"
    ? {
        gy: 230,
        mgr: 27,
        desks: [51, 87, 123],
        tower: { x: 62, y: 141 },
        rows: [241, 256],
        turn: 168,
        tiles: [22, 55, 88, 121, 154, 138, 105, 72, 39],
        sign: { cx: 90, top: 150 },
        lineC: 90,
        text: { x: 80, y: 250, size: 76 },
        counter: [80, 270, 920, 340],
        fixCard: [80, 262, 920, 440],
        chip: { x: 80, y: 700 },
        cityMax: 64,
      }
    : {
        gy: 136,
        mgr: 72,
        desks: [120, 170, 220],
        tower: { x: 145, y: 47 },
        rows: [146, 159],
        turn: 304,
        tiles: [30, 95, 160, 225, 290, 257, 192, 127, 62],
        sign: { cx: 185, top: 50 },
        lineC: 185,
        text: { x: 80, y: 70, size: 62 },
        counter: [80, 96, 640, 300],
        fixCard: [80, 88, 720, 392],
        chip: { x: 1416, y: 300 },
        cityMax: 50,
      };

// ---- the icons: 48 meetings, their pop, flight, slot, flip and launch (all closed-form in F)
const NI = 48;
const ICONS = (() => {
  const r = rng(11),
    order = Array.from({ length: NI }, (_, i) => i);
  for (let i = NI - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  const noShow = new Map<number, number>(); // icon → its rank among the no-shows
  order.slice(0, 36).forEach((i, k) => noShow.set(i, k));
  return Array.from({ length: NI }, (_, i) => ({
    spawn: 80 + Math.round(110 * (i / (NI - 1)) ** 0.62),
    desk: [1, 0, 2][i % 3]!,
    col: i % 8,
    row: 5 - Math.floor(i / 8), // the tower fills from the bottom
    ox: Math.round((r() - 0.5) * 16),
    oy: Math.round((r() - 0.5) * 10),
    ph: r() * Math.PI * 2,
    flip: noShow.has(i) ? 228 + Math.round(noShow.get(i)! * 2.7) : -1,
    back: noShow.has(i) ? 522 + Math.round((35 - noShow.get(i)!) * 2) : -1,
  }));
})();
const FLY = 16;

export function make(size: Size, id: string): Film {
  const L = layout(size),
    { W, H, u } = L,
    D = design(size),
    Wc = W / PX,
    Hc = H / PX,
    gy = D.gy,
    deskTop = gy - 11;

  // ---- the path the serpent follows along the floor (a boustrophedon: across, down, back)
  const path: [number, number][] = [
    [-40, D.rows[0]],
    [D.turn, D.rows[0]],
    [D.turn, D.rows[1]],
    [-240, D.rows[1]],
  ];
  const segLen = path.slice(1).map((p, i) => Math.abs(p[0] - path[i]![0]) + Math.abs(p[1] - path[i]![1]));
  const at = (s: number): { x: number; y: number; dx: number; dy: number } => {
    for (let i = 0; i < segLen.length; i++) {
      const a = path[i]!,
        b = path[i + 1]!,
        l = segLen[i]!;
      if (s <= l || i === segLen.length - 1) {
        const dx = Math.sign(b[0] - a[0]),
          dy = Math.sign(b[1] - a[1]);
        return { x: a[0] + dx * s, y: a[1] + dy * s, dx, dy };
      }
      s -= l;
    }
    return { x: 0, y: 0, dx: 1, dy: 0 };
  };
  // each tile's arc-length on the path (row 0 then row 1)
  const tileS = D.tiles.map((c, k) => (k < 5 ? c + 40 : 40 + D.turn + segLen[1]! + (D.turn - c)));
  const S0 = 347, // the head starts off-screen at s = 0 here
    exitS = 40 + D.turn + segLen[1]! + D.turn + 6 + (10 + 27) * 3,
    V = exitS / (492 - S0); // cells per frame: the tail clears the frame as the fix lands
  const head = (F: number) => (F - S0) * V;
  const eatAt = tileS.map((s) => S0 + s / V),
    snakeIn = Math.round(S0 + 40 / V),
    HOURS = ["9", "10", "11", "12", "1", "2", "3", "4", "5"];

  // ---- the city behind the office (flat tints; windows twinkle)
  const CITYB = (() => {
    const r = rng(size === "vertical" ? 5 : 6),
      out: { x: number; w: number; h: number }[] = [];
    for (let x = -4; x < Wc;) {
      const bw = 10 + Math.floor(r() * 16),
        bh = 14 + Math.floor(r() * (D.cityMax - 14));
      out.push({ x, w: bw, h: bh });
      x += bw + Math.floor(r() * 4);
    }
    return out;
  })();
  const city = (ctx: Ctx, F: number) => {
    const tw = Math.floor(F / 12);
    CITYB.forEach((b, n) => {
      cell(ctx, b.x, gy - b.h, b.w, b.h, CITY);
      for (let y = gy - b.h + 3; y < gy - 4; y += 5)
        for (let x = b.x + 2; x < b.x + b.w - 2; x += 4) {
          const h = (x * 73 + y * 151 + n * 17) % 23;
          if ((h + tw) % 7 < 3) cell(ctx, x, y, 2, 2, CITY_LIT);
        }
    });
  };

  // ---- the floor: the ground strip, its path, and the day's hour tiles
  const tileShown = (k: number, F: number) => {
    if (F < eatAt[k]!) return true;
    const back = 492 + k * 6;
    return F >= back;
  };
  const floor = (ctx: Ctx, F: number) => {
    cell(ctx, 0, gy, Wc, Hc - gy, K);
    cell(ctx, 0, gy, Wc, 1, C.surface);
    // the path: a dotted track the whole film, so the serpent has somewhere to go
    for (let x = 1; x < D.turn; x += 3) {
      cell(ctx, x, D.rows[0], 2, 1, C.line);
      cell(ctx, x, D.rows[1], 2, 1, C.line);
    }
    for (let y = D.rows[0]; y <= D.rows[1]; y += 3) cell(ctx, D.turn, y, 1, 2, C.line);
    D.tiles.forEach((c, k) => {
      if (!tileShown(k, F)) {
        // crumbs fly off the tile the serpent just ate
        const t = F - eatAt[k]!;
        if (t >= 0 && t < 10) {
          const y = D.rows[k < 5 ? 0 : 1];
          for (let q = 0; q < 6; q++) {
            const a = (q / 6) * Math.PI * 2 + 0.4,
              d = 3 + t * 1.4;
            cell(ctx, c + Math.cos(a) * d, y + Math.sin(a) * d * 0.8, 1, 1, q % 2 ? CREAM : MAG);
          }
        }
        return;
      }
      const back = 492 + k * 6,
        pop = F >= back && F < back + 4 ? -1 : 0,
        x = c - 5,
        y = D.rows[k < 5 ? 0 : 1] - 4 + pop,
        fill = F >= back && F < back + 3 ? TEAL : CREAM;
      cell(ctx, x + 1, y, 9, 1, fill);
      cell(ctx, x, y + 1, 11, 7, fill);
      cell(ctx, x + 1, y + 8, 9, 1, fill);
      const s = HOURS[k]!,
        wd = runWidth(s, DIGITS, 1);
      glyphRun(ctx, s, DIGITS, x + Math.floor((11 - wd) / 2), y + 2, 1, K);
    });
  };

  // ---- the serpent: 3-cell body on the path, a 5-cell head, a flicking tongue; it grows with each hour it eats
  const serpent = (ctx: Ctx, F: number) => {
    if (F < S0 || F > 500) return;
    const s = head(F),
      eaten = eatAt.filter((e) => F >= e).length,
      n = 10 + eaten * 3;
    for (let k = n; k >= 1; k--) {
      const q = at(s - k * 3);
      if (q.x < -4 || q.x > Wc + 4) continue;
      const wig = Math.round(Math.sin((s - k * 3) * 0.2 - F * 0.3) * 1.2),
        x = q.x + q.dy * wig,
        y = q.y + q.dx * wig;
      cell(ctx, x - 1, y - 1, 3, 3, MAG);
      if (k % 3 === 0) cell(ctx, x, y, 1, 1, CREAM);
      if (k === n) cell(ctx, x - 1, y - 1, 3, 3, mix(MAG, K, 0.35));
    }
    const h = at(s),
      hx = Math.round(h.x),
      hy = Math.round(h.y);
    cell(ctx, hx - 2, hy - 2, 5, 5, MAG);
    // eyes sit on the leading side; the tongue flicks ahead every few frames
    const fx = h.dx,
      fy = h.dy;
    for (const side of [-1, 1]) cell(ctx, hx + fx - fy * side, hy + fy + fx * side, 1, 1, CREAM);
    if (Math.floor(F / 4) % 2 === 0) {
      cell(ctx, hx + fx * 3, hy + fy * 3, 1, 1, TEAL);
      cell(ctx, hx + fx * 4 - fy, hy + fy * 4 - fx, 1, 1, TEAL);
      cell(ctx, hx + fx * 4 + fy, hy + fy * 4 + fx, 1, 1, TEAL);
    }
  };

  // ---- the office: three desks, a manager, and the team's moods over the story
  const TEAM: Who[] = [
    { shirt: TEAL, hair: K },
    { shirt: C.muted, hair: MAG },
    { shirt: MAG, hair: K },
  ];
  const BOSS: Who = { shirt: C.line, hair: C.muted, tie: true };
  const blinkAt = (F: number, seed: number) => (Math.floor(F) + seed * 37) % 97 < 3;
  const bob = (F: number, seed: number) => ((F + seed * 5) % BEAT < 4 ? -1 : 0);
  const teamMood = (F: number): { look: number; mood: Mood; down?: boolean } =>
    F < T.book
      ? { look: -1, mood: "flat" }
      : F < 280
        ? { look: 1, mood: "smile" }
        : F < T.serpent
          ? { look: 1, mood: "frown" }
          : F < 500
            ? { look: 0, mood: "frown", down: true }
            : { look: F < T.sign ? 1 : 0, mood: "smile" };
  const bossMood = (F: number): { look: number; mood: Mood; down?: boolean } =>
    F < 280
      ? { look: 1, mood: "smile" }
      : F < T.serpent
        ? { look: 1, mood: "frown" }
        : F < 500
          ? { look: 1, mood: "frown", down: true }
          : { look: 1, mood: "smile" };
  const monitor = (ctx: Ctx, x: number, F: number, seed: number, deskTop: number) => {
    const bad = F >= 240 && F < 520;
    cell(ctx, x + 17, deskTop - 10, 11, 8, K);
    cell(ctx, x + 18, deskTop - 9, 9, 6, C.surface);
    cell(ctx, x + 21, deskTop - 2, 3, 1, K);
    cell(ctx, x + 20, deskTop - 1, 5, 1, K);
    const r = rng(seed * 1000 + Math.floor(F / (F > T.book && F < T.noshow ? 3 : 6)));
    for (let l = 0; l < 3; l++) cell(ctx, x + 19, deskTop - 8 + l * 2, 1 + Math.floor(r() * 6), 1, bad ? MAG : TEAL);
  };
  const desk = (ctx: Ctx, x: number, deskTop: number) => {
    cell(ctx, x, deskTop, 30, 1, C.muted);
    cell(ctx, x, deskTop + 1, 30, 1, K);
    cell(ctx, x + 1, deskTop + 2, 28, gy - deskTop - 2, K);
    cell(ctx, x + 2, deskTop + 2, 26, gy - deskTop - 3, C.surface);
    cell(ctx, x + 17, deskTop + 3, 10, 1, K);
    cell(ctx, x + 17, deskTop + 6, 10, 1, K);
    cell(ctx, x + 21, deskTop + 4, 2, 1, C.muted);
    cell(ctx, x + 21, deskTop + 7, 2, 1, C.muted);
  };

  // the sign-off line: where each person lands, and the high-fives on the beats
  const lineX = [D.lineC - 30, D.lineC - 14, D.lineC + 2, D.lineC + 18]; // boss, A, B, C
  const FIVES: [number, number, number][] = [
    [660, 0, 1],
    [675, 1, 2],
    [690, 2, 3],
  ];
  const hopP = (F: number, i: number) => ease.inOutCubic(prog(F, 634 + i * 3, 654 + i * 3));
  const standing = (ctx: Ctx, F: number, i: number, from: number, fromFeet: number, who: Who) => {
    const p = hopP(F, i),
      x = Math.round(lerp(from, lineX[i]!, p)),
      air = Math.sin(p * Math.PI) * 14;
    let feet = Math.round(lerp(fromFeet, gy, p) - air),
      pose: Pose = "stand",
      dx = 0;
    const five = FIVES.find(([f, a, b]) => (a === i || b === i) && F >= f && F < f + 11);
    if (five) {
      pose = five[1] === i ? "fiveR" : "fiveL";
      dx = five[1] === i ? 1 : -1; // lean in so the raised hands meet
      feet -= F < five[0] + 6 ? 2 : 0;
    } else if (F >= 705) {
      pose = "cheer";
      feet -= (F + i * 4) % BEAT < 5 ? 3 : 0;
    } else if (p >= 1) feet += bob(F, i);
    person(ctx, x + dx, feet, who, {
      pose,
      look: 0,
      mood: "smile",
      blink: blinkAt(F, i + 3),
      step: p > 0 && p < 1 ? 1 + (Math.floor(F / 3) % 2) : 0,
    });
  };
  const sparks = (ctx: Ctx, F: number) => {
    for (const [f, a] of FIVES) {
      const t = F - f;
      if (t < 0 || t >= 12) continue;
      const cx = lineX[a]! + 14,
        cy = gy - 27 + 1 - 2,
        d = 2 + Math.floor(t / 2) * 2;
      for (const [vx, vy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
        [1, 1],
        [-1, 1],
        [1, -1],
        [-1, -1],
      ] as const) {
        const k = vx && vy ? 0.7 : 1;
        cell(ctx, cx + Math.round(vx * d * k), cy + Math.round(vy * d * k), 1, 1, (vx + vy + 4) % 2 ? TEAL : MAG);
      }
    }
  };

  const office = (ctx: Ctx, F: number) => {
    const tm = teamMood(F),
      typing = F >= T.book && F < T.noshow + 60;
    // seated (until each one hops out for the sign-off)
    D.desks.forEach((dx, i) => {
      const p = hopP(F, i + 1);
      if (p <= 0)
        person(ctx, dx + 3, deskTop + 13 + bob(F, i + 1), TEAM[i]!, {
          pose: "sit",
          ...tm,
          blink: blinkAt(F, i + 1),
          type: typing ? 1 + (Math.floor(F / 4 + i) % 2) : 0,
        });
      // the sign-off clears the stage: desks sink into the floor
      const sink = Math.round(ease.inCubic(prog(F, 644, 664)) * 24);
      if (sink >= 24) return;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, W, gy * PX);
      ctx.clip();
      desk(ctx, dx, deskTop + sink);
      monitor(ctx, dx, F, i + 1, deskTop + sink);
      ctx.restore();
    });
    // the manager stands to the left of the team, then joins the line
    if (F < 634) {
      const bm = bossMood(F);
      person(ctx, D.mgr, gy + bob(F, 0), BOSS, {
        pose: F >= 540 && F < 600 ? "fiveR" : "stand",
        ...bm,
        blink: blinkAt(F, 0),
      });
    } else standing(ctx, F, 0, D.mgr, gy, BOSS);
    D.desks.forEach((dx, i) => {
      if (hopP(F, i + 1) > 0) standing(ctx, F, i + 1, dx + 3, deskTop + 9, TEAM[i]!);
    });
    sparks(ctx, F);
  };

  // ---- the hook's speech bubble: calendar = star (we reward what we count)
  const bubble = (ctx: Ctx, F: number) => {
    if (F < 10 || F >= 69) return;
    const s = spring((F - 10) / FPS, { freq: 3, damp: 0.5 }),
      k = 2, // the bubble is drawn at two cells per pixel: the hook's one big prop
      bw = 29 * k,
      bh = 15 * k,
      x = D.mgr - 4,
      y = gy - 27 - bh - 6 - Math.round((1 - Math.min(1, s)) * 6) - (F % BEAT < 4 ? 1 : 0);
    if (s < 0.35 || F >= 66) return;
    cell(ctx, x + k, y, bw - 2 * k, k, K);
    cell(ctx, x, y + k, bw, bh - 2 * k, K);
    cell(ctx, x + k, y + bh - k, bw - 2 * k, k, K);
    cell(ctx, x + k, y + k, bw - 2 * k, bh - 2 * k, CREAM);
    cell(ctx, x + 4 * k, y + bh - k, 3 * k, 2 * k, K); // the tail
    cell(ctx, x + 5 * k, y + bh - k, k, k, CREAM);
    icon(ctx, x + 7 * k, y + 7 * k + 1, TEAL, 1, 1, k);
    cell(ctx, x + 13 * k, y + 6 * k, 3 * k, k, K);
    cell(ctx, x + 13 * k, y + 8 * k, 3 * k, k, K);
    // a pixel star that twinkles on the beat
    const tw = F % BEAT < 7 ? 0 : 1,
      sx = x + 22 * k,
      sy = y + 7 * k;
    cell(ctx, sx - k, sy - k, 3 * k, 3 * k, MAG);
    cell(ctx, sx, sy - (3 - tw) * k, k, 2 * k, MAG);
    cell(ctx, sx, sy + (2 - tw) * k, k, 2 * k, MAG);
    cell(ctx, sx - (3 - tw) * k, sy, 2 * k, k, MAG);
    cell(ctx, sx + (2 - tw) * k, sy, 2 * k, k, MAG);
  };

  // ---- the icons: pop from a monitor, fly to the swarm, settle into the tower, wobble, flip, launch
  const wobbleAmp = (F: number) =>
    clamp(prog(F, 214, 240) * (F < T.serpent ? 1 : lerp(1, 0.6, prog(F, T.serpent, T.serpent + 30)))) *
    (1 - ease.inOutCubic(prog(F, 500, 540)));
  const icons = (ctx: Ctx, F: number) => {
    const settle = ease.inOutCubic(prog(F, 196, 216)),
      A = wobbleAmp(F);
    for (const ic of ICONS) {
      if (F < ic.spawn) continue;
      const sx = D.tower.x + ic.col * 10 + 4,
        sy = D.tower.y + ic.row * 10 + 4,
        h = 5 - ic.row; // height in the tower
      // the swarm: hovering off its slot, bobbing on its own phase
      const hx = sx + ic.ox * (1 - settle),
        hy = sy + ic.oy * (1 - settle) + (1 - settle) * Math.round(Math.sin(F * 0.25 + ic.ph));
      const fromX = D.desks[ic.desk]! + 22,
        fromY = deskTop - 11,
        p = ease.outCubic(prog(F, ic.spawn, ic.spawn + FLY)),
        pop = spring((F - ic.spawn) / FPS, { freq: 3.2, damp: 0.5 });
      let x = lerp(fromX, hx, p),
        y = lerp(fromY, hy, p) - Math.sin(p * Math.PI) * 14;
      // the tower wobbles, more at the top
      x += Math.round(A * Math.sin((F - 210) * 0.21) * 2.4 * (h / 5));
      // sign-off: the tower launches upward, top rows first
      const launch = 631 + ic.row * 3 + ((ic.col * 5) % 8);
      let squash = 1;
      if (F >= launch) {
        // pop: the icon shrinks into four sparks that fly out and vanish
        const t = F - launch;
        squash = 1 - clamp(t / 4);
        if (t >= 4) {
          if (t < 12) {
            const d = 2 + (t - 4);
            for (const [vx, vy] of [
              [1, 1],
              [-1, 1],
              [1, -1],
              [-1, -1],
            ] as const)
              cell(ctx, x + vx * d, y + vy * d, 1, 1, ic.col % 2 ? TEAL : MAG);
          }
          continue;
        }
      }
      // flips: teal → magenta (a no-show), and back to teal in the fix
      let color = TEAL,
        fx = 1;
      if (ic.flip >= 0) {
        const f1 = prog(F, ic.flip, ic.flip + 6),
          f2 = prog(F, ic.back, ic.back + 6);
        const flipT = f2 > 0 ? f2 : f1,
          toMag = f2 > 0 ? f2 < 0.5 : f1 >= 0.5;
        fx = Math.abs(Math.cos(flipT * Math.PI));
        color = toMag ? MAG : TEAL;
      }
      icon(ctx, x, y, color, fx * Math.min(pop, 1.15) * squash, Math.min(pop, 1.15) * squash);
    }
  };

  // ---- the sign: 'Oriel' in pixel letters on a marquee board that rises from behind the office
  const signW = runWidth("Oriel", GLYPHS, 3) + 16,
    signH = 7 * 3 + 12;
  const sign = (ctx: Ctx, F: number) => {
    if (F < 644) return;
    const s = spring((F - 644) / FPS, { freq: 1.5, damp: 0.55 }),
      top = Math.round(lerp(gy + 2, D.sign.top, s)),
      x = D.sign.cx - Math.floor(signW / 2);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, gy * PX);
    ctx.clip();
    // posts reach the floor once the board is up
    const postH = gy - (D.sign.top + signH);
    cell(ctx, x + 10, top + signH, 3, postH, K);
    cell(ctx, x + signW - 13, top + signH, 3, postH, K);
    cell(ctx, x, top, signW, signH, K);
    cell(ctx, x + 1, top + 1, signW - 2, signH - 2, C.surface);
    cell(ctx, x + 3, top + 3, signW - 6, signH - 6, K);
    // marquee bulbs chase around the frame
    const ph = Math.floor(F / 4);
    let n = 0;
    for (let i = 2; i < signW - 2; i += 3, n++) {
      cell(ctx, x + i, top + 1, 1, 1, (n + ph) % 2 ? TEAL : MAG);
      cell(ctx, x + signW - 1 - i, top + signH - 2, 1, 1, (n + ph) % 2 ? TEAL : MAG);
    }
    glyphRun(ctx, "Oriel", GLYPHS, x + 8, top + 6, 3, CREAM);
    ctx.restore();
  };

  // ---- the crisp layer: cards, a chip and the caption ladders (never pixelated)
  const shadow = { blur: 44 * u, y: 16 * u, color: "rgba(18,22,58,0.28)" };
  const cardIn = (F: number, a: number, b: number) => {
    const i = spring((F - a) / FPS, { freq: 2.2, damp: 0.72 }),
      o = ease.inCubic(prog(F, b - 12, b));
    return { alpha: clamp(i * 1.5) * (1 - o), dy: (1 - i) * 60 * u - o * 40 * u - (F - a) * 0.12 * u };
  };
  const counterCard = (ctx: Ctx, F: number) => {
    if (F < 78 || F >= T.noshow) return;
    const [x, y0, cw, ch] = D.counter,
      { alpha, dy } = cardIn(F, 78, T.noshow),
      y = y0 + dy,
      tall = L.tall;
    const n = ICONS.filter((ic) => F >= ic.spawn).length,
      value = n === 0 ? 12 : 12 + Math.round((228 * n) / NI);
    ctx.save();
    ctx.globalAlpha = alpha;
    card(ctx, x, y, cw, ch, { r: 28 * u, fill: K, shadow });
    text(ctx, "MEETINGS BOOKED", x + 44 * u, y + 66 * u, {
      size: 22 * u,
      family: F_.mono,
      weight: 500,
      color: C.muted,
      track: 0.1,
    });
    text(ctx, "THIS WEEK", x + cw - 44 * u, y + 66 * u, {
      size: 22 * u,
      family: F_.mono,
      weight: 500,
      color: C.muted,
      align: "right",
      track: 0.1,
    });
    const big = (tall ? 150 : 132) * u;
    // the number pops a little each time it ticks
    const last = [...ICONS].reverse().find((ic) => F >= ic.spawn),
      kick = last ? 1 - prog(F, last.spawn, last.spawn + 5) : 0;
    ctx.save();
    const nx = x + 40 * u,
      ny = y + (tall ? 212 : 196) * u;
    ctx.translate(nx, ny);
    ctx.scale(1 + 0.04 * kick, 1 + 0.04 * kick);
    text(ctx, String(value), 0, 0, { size: big, family: F_.sans, weight: 800, color: CREAM, track: -0.04 });
    ctx.restore();
    // the bonus bar: what the team was rewarded for
    const bx = x + 44 * u,
      by = y + ch - 62 * u,
      bw = cw - 88 * u,
      frac = value / 240,
      hit = value >= 200;
    rr(ctx, bx, by, bw, 14 * u, 7 * u);
    ctx.fillStyle = C.line;
    ctx.fill();
    rr(ctx, bx, by, Math.max(14 * u, bw * frac), 14 * u, 7 * u);
    ctx.fillStyle = hit ? MAG : TEAL;
    ctx.fill();
    ctx.fillStyle = CREAM;
    ctx.fillRect(bx + bw * (200 / 240) - u, by - 8 * u, 3 * u, 30 * u);
    text(ctx, hit ? "BONUS UNLOCKED" : "BONUS AT 200", x + cw - 44 * u, by - 22 * u, {
      size: 22 * u,
      family: F_.mono,
      weight: 600,
      color: hit ? MAG : C.muted,
      align: "right",
      track: 0.08,
    });
    ctx.restore();
  };
  const chip = (ctx: Ctx, F: number) => {
    if (F < 226 || F >= T.fix) return;
    const n = ICONS.filter((ic) => ic.flip >= 0 && F >= ic.flip + 3).length;
    const { alpha, dy } = cardIn(F, 226, T.fix - 4),
      x = D.chip.x,
      y = D.chip.y + dy * 0.5,
      label = "no-shows",
      o = { size: 26 * u, family: F_.sans, weight: 600, color: CREAM, track: -0.01 };
    ctx.save();
    ctx.globalAlpha = alpha;
    const num = String(n),
      nw = text(ctx, num, -9999, -9999, { ...o, weight: 800 }),
      lw = text(ctx, label, -9999, -9999, o),
      cw = 30 * u + 22 * u + 16 * u + nw + 10 * u + lw + 30 * u;
    card(ctx, x, y, cw, 64 * u, { r: 32 * u, fill: K, shadow });
    ctx.fillStyle = MAG;
    ctx.fillRect(x + 30 * u, y + 21 * u, 22 * u, 22 * u);
    text(ctx, num, x + 68 * u, y + 41 * u, { ...o, weight: 800 });
    text(ctx, label, x + 78 * u + nw, y + 41 * u, { ...o, color: C.muted });
    ctx.restore();
  };
  const fixCard = (ctx: Ctx, F: number) => {
    if (F < 486 || F >= T.sign) return;
    const [x, y0, cw, ch] = D.fixCard,
      { alpha, dy } = cardIn(F, 486, T.sign),
      y = y0 + dy,
      tall = L.tall;
    ctx.save();
    ctx.globalAlpha = alpha;
    card(ctx, x, y, cw, ch, { r: 28 * u, fill: K, shadow });
    text(ctx, "ORIEL · WHAT WE COUNT NOW", x + 44 * u, y + 66 * u, {
      size: 22 * u,
      family: F_.mono,
      weight: 500,
      color: C.muted,
      track: 0.1,
    });
    const colW = (cw - 88 * u) / 2;
    ctx.fillStyle = C.line;
    ctx.fillRect(x + 44 * u + colW - u, y + 104 * u, 2 * u, ch - 144 * u);
    const METRICS = [
      { label: "meetings held", to: 31, color: TEAL, pts: [0.18, 0.22, 0.2, 0.34, 0.42, 0.4, 0.58, 0.66, 0.8] },
      { label: "decisions made", to: 18, color: CREAM, pts: [0.1, 0.16, 0.24, 0.22, 0.38, 0.5, 0.56, 0.72, 0.9] },
    ];
    METRICS.forEach((m, i) => {
      const cx = x + 44 * u + i * colW + (i ? 36 : 0) * u,
        inner = colW - 36 * u,
        d = ease.inOutCubic(prog(F, 500 + i * 8, 560 + i * 8));
      text(ctx, m.label, cx, y + 128 * u, { size: 30 * u, family: F_.sans, weight: 600, color: CREAM, track: -0.01 });
      text(ctx, String(Math.round(m.to * d)), cx, y + (tall ? 250 : 232) * u, {
        size: (tall ? 110 : 96) * u,
        family: F_.sans,
        weight: 800,
        color: m.color,
        track: -0.04,
      });
      // the sparkline draws on, rising
      const top = y + (tall ? 290 : 262) * u,
        bot = y + ch - 44 * u,
        k = m.pts.length - 1;
      ctx.save();
      ctx.strokeStyle = m.color;
      ctx.lineWidth = 5 * u;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      const upto = d * k;
      for (let j = 0; j <= Math.ceil(upto); j++) {
        const t = Math.min(j, upto),
          a = m.pts[Math.floor(t)]!,
          b = m.pts[Math.min(k, Math.floor(t) + 1)]!,
          v = lerp(a, b, t - Math.floor(t)),
          px = cx + (t / k) * (inner - 24 * u),
          py = lerp(bot, top, v);
        if (j) ctx.lineTo(px, py);
        else ctx.moveTo(px, py);
      }
      ctx.stroke();
      if (d > 0) {
        const t = upto,
          a = m.pts[Math.floor(t)]!,
          b = m.pts[Math.min(k, Math.floor(t) + 1)]!,
          v = lerp(a, b, t - Math.floor(t));
        ctx.fillStyle = m.color;
        ctx.beginPath();
        ctx.arc(cx + (t / k) * (inner - 24 * u), lerp(bot, top, v), 9 * u, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
    ctx.restore();
  };

  // caption ladders: serif, mixed sizes, one accent italic word; beside the action, word by word
  const LADDERS: { lines: Word[][]; out?: number; from: number }[] = [
    {
      from: 0,
      out: 64,
      lines: [
        [w("We", 8), w("rewarded", 14)],
        [w("meetings", 24, { scale: 1.35 })],
        [w("booked.", 36, { scale: 1.9, key: true })],
      ],
    },
    {
      from: T.noshow,
      out: 334,
      lines: [
        [w("so", 222), w("they", 228)],
        [w("booked", 238, { scale: 1.35 })],
        [w("everything", 250, { scale: 1.9, key: true })],
      ],
    },
    {
      from: T.serpent,
      out: 468,
      lines: [
        [w("The", 356), w("metric", 362)],
        [w("became", 374, { scale: 1.35 })],
        [w("the", 388, { scale: 1.9 }), w("goal.", 394, { scale: 1.9, key: true })],
      ],
    },
    {
      from: T.sign,
      lines: [
        [w("measure", 642), w("the", 650)],
        [w("outcome,", 660, { scale: 1.9, key: true })],
        [w("not", 676), w("the", 682), w("count", 690, { scale: 1.35 })],
      ],
    },
  ];
  const captions = (ctx: Ctx, F: number) => {
    for (const c of LADDERS) {
      if (F < c.from || (c.out !== undefined && F > c.out + 9)) continue;
      ctx.save();
      ctx.translate(0, -(F - c.from) * 0.1 * u); // a slow drift keeps the hold alive
      ladder(ctx, c.lines, D.text.x, D.text.y, F, {
        size: D.text.size * u,
        face: F_.serif,
        italic: F_.italic,
        ink: K,
        accent: MAG,
        fps: FPS,
        out: c.out,
        gap: 0.04,
      });
      ctx.restore();
    }
  };

  const paint = (ctx: Ctx, env: Env, F: number) => {
    F = clamp(F, 0, N - 1);
    ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
    ctx.fillStyle = SKY;
    ctx.fillRect(0, 0, W, H);
    city(ctx, F);
    sign(ctx, F);
    floor(ctx, F);
    serpent(ctx, F);
    office(ctx, F);
    bubble(ctx, F);
    icons(ctx, F);
    counterCard(ctx, F);
    chip(ctx, F);
    fixCard(ctx, F);
    captions(ctx, F);
  };

  const cuts = [T.hook, T.book, T.noshow, T.serpent, T.fix, T.sign, N],
    names = ["hook", "booking", "no-shows", "serpent", "fix", "sign-off"];
  const shots: Shot[] = names.map((sid, i) => ({
    id: sid,
    start: cuts[i]!,
    end: cuts[i + 1]!,
    draw: (ctx, local, env) => paint(ctx, env, cuts[i]! + local),
  }));
  const flips = ICONS.filter((ic) => ic.flip >= 0);
  return {
    meta: { title: id, W, H, fps: FPS, bpm: BPM, durationFrames: N, raster: "cpu" },
    assets: { images: {}, fonts: P.assets },
    shots,
    audio: beatScore({
      frames: N,
      fps: FPS,
      bpm: BPM,
      mood: "drive",
      key: 3,
      drop: T.book,
      hits: [snakeIn, T.sign],
      whooshes: [T.noshow, T.fix],
      ticks: [
        ...ICONS.map((ic) => ic.spawn),
        ...flips.filter((_, k) => k % 2 === 0).map((ic) => ic.flip + 3),
        ...eatAt.map((e) => Math.ceil(e)),
        ...D.tiles.map((_, k) => 492 + k * 6),
        ...FIVES.map(([f]) => f),
      ],
      sign: 690,
      gain: 0.72, // about −16 LUFS
    }),
  };
}

export const pixelParable = make("vertical", "pixelParable");
export const pixelParableLandscape = make("landscape", "pixelParableLandscape");
