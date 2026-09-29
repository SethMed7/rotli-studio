// STUDY 33 · SWISS GRID (22 s, 30 fps, 120 bpm). A poster-film for an invented lecture series, "Grid Week", in the
// International Typographic Style: off-white paper, black and one red, a VISIBLE grid that everything obeys. The
// grid draws in, a red module grows and the title drops onto its baseline, five evenings each bring a giant numeral,
// a day, a session and a tiny diagram that demonstrates it, then every element snaps along the grid into the final
// poster. Moves are horizontal or vertical only, one axis at a time, fast exponential snaps with no overshoot.
// Brief: series/studies/briefs/swiss-grid.json · prompt: series/studies/prompts/swiss-grid.prompt.md
//
// Per-size design. Portrait (primary) is 6 × 8 modules inside 64 px margins, 16 px gutters and a 12 px baseline
// grid, exactly as the brief sets it; landscape is 12 × 6 modules inside 104 px margins (the brief gives no
// landscape margin; 104 keeps the running head inside layout().safe and makes every module a whole pixel).
// Declared deviation (portrait only): layout("portrait") marks 4:5 as tall, so its safe area is the vertical
// feed's (x 80, top 220, bottom 320). The brief's 64 px margins and its running head in the top margin cannot
// both sit inside it. Every readable line EXCEPT the running head keeps its baseline inside y 220–1030; flush-left
// text starts on the 64 px margin, 16 px outside safe.x.
// Declared deviations from the brief after the second reader's critique: evening 1 arrives by a full-frame slam on
// its hit (ink, the "1" reversed, half a beat) and cuts back to the "1" at rest, not by a snap from the left edge;
// in landscape the list's days sit in column 7 (the brief says columns 1–6) so 56 px titles never reach them, and
// the info block's last line shares the list's last baseline in columns 9–12 rather than sitting at the bottom.
//
// The whole film is one function paint(F) of a fractional frame; the shots only name the sections. One move table
// (`at()`) records every snap as it is declared, and the tick track is made from that same table.
import PACK from "../../../brand/packs/studio/pack.json";
import type { Ctx, Env } from "../core";
import type { Film, Shot } from "../film";
import { clamp, lerp } from "../kit/motion";
import { usePack } from "../kit/pack";
import { beatScore } from "../kit/score";
import { layout, type Size } from "../kit/sizes";
import { measure, text, type TextOpts } from "../kit/type";

const P = usePack(PACK),
  C = P.palette("mono"), // ground, ink, line and accent (red) only; accent2 is never used
  SANS = P.face.sans;
const FPS = 30,
  BPM = 120,
  N = 660; // a beat is 15 frames, a half beat 7.5
const T = { title: 60, e1: 150, e2: 210, e3: 270, e4: 330, e5: 390, recompose: 450, poster: 570 };
const EV = [T.e1, T.e2, T.e3, T.e4, T.e5];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const SESSIONS = ["The Module", "The Margin", "The Gutter", "The Baseline", "The White Space"];
// "Hall 2 · every evening at 19:00" · "Free entry", broken by sense per size (never before an orphaned time)
const INFO_LINES = {
  portrait: ["Hall 2 · every evening", "at 19:00", "Free entry"],
  landscape: ["Hall 2", "Every evening", "at 19:00", "Free entry"],
};
const SUB = "Five evenings on order";
const CAP = 0.7275; // Inter's cap (and lining figure) height, in em

/** a snap: fast and final, a strong exponential ease-out that lands exactly on 1 with no overshoot */
const snap = (F: number, t0: number, d = 8) => {
  if (F <= t0) return 0;
  if (F >= t0 + d) return 1;
  return (1 - 2 ** ((-10 * (F - t0)) / d)) / (1 - 2 ** -10);
};
/** the index of the last start ≤ F (−1 before the first) */
const stepIndex = (F: number, starts: number[]) => {
  let k = -1;
  starts.forEach((s, i) => {
    if (F >= s) k = i;
  });
  return k;
};

type Geo = {
  m: number;
  cols: number;
  rows: number;
  g: number;
  cw: number;
  rh: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  cx: (i: number) => number;
  ry: (j: number) => number;
  span: (n: number) => number;
  rspan: (n: number) => number;
  /** snap a y to the nearest baseline of the 12 px grid (it starts at the type area's top) */
  bl: (y: number) => number;
};
const grid = (W: number, H: number, m: number, cols: number, rows: number, g = 16): Geo => {
  const cw = (W - 2 * m - (cols - 1) * g) / cols,
    rh = (H - 2 * m - (rows - 1) * g) / rows;
  return {
    m,
    cols,
    rows,
    g,
    cw,
    rh,
    x0: m,
    y0: m,
    x1: W - m,
    y1: H - m,
    cx: (i) => m + i * (cw + g),
    ry: (j) => m + j * (rh + g),
    span: (n) => n * cw + (n - 1) * g,
    rspan: (n) => n * rh + (n - 1) * g,
    bl: (y) => m + Math.round((y - m) / 12) * 12,
  };
};

export function make(size: Size, id: string): Film {
  const L = layout(size),
    { W, H } = L,
    port = size === "portrait";
  const G = port ? grid(W, H, 64, 6, 8) : grid(W, H, 104, 12, 6);
  const { cx, ry, span, bl, cw, rh, g } = G;

  // ---- the move table: every snap is declared through at(), and the ticks come from the same list
  const MOVES: number[] = [];
  const at = (f: number) => (MOVES.push(f), f);
  const ats = (f: number, n: number, every: number) => Array.from({ length: n }, (_, i) => at(f + i * every));

  // ---- per-size design, in grid units
  const numField = { c: 0, n: port ? 4 : 5, r: 2, rn: 4 };
  const NF = {
    x: cx(numField.c),
    y: ry(numField.r),
    w: span(numField.n),
    h: G.rspan(numField.rn),
  };
  const numBase = NF.y + NF.h, // the giant numeral rests on the field's bottom module edge
    numSize = NF.h / CAP;
  const textBase = bl(numBase); // day text shares the numeral's baseline (on the 12 px grid)
  // the title hangs its cap height from the top edge of row 2 (a gutter under the red module), which leaves
  // about 45 px (portrait) / 56 px (landscape) of paper above the numeral: portrait 328 · landscape 344
  const titleBase = bl(ry(1) + (port ? 104 : 92)); // the 4-column title's cap height, measured from a render
  // Readability over the brief's small sizes: the lines that matter on a phone (the subtitle, the day names, the
  // info block) are set at 40 px in portrait and 56–64 px in landscape (a 1920 frame is 5.3× smaller on a phone),
  // not 26–30; only the running head (chrome) stays small.
  const D = {
    headBase: G.y0 - 12, // the running head sits one baseline above the type area
    crop: port ? { o: 40, l: 18 } : { o: 44, l: 24 },
    diag: { x: cx(port ? 4 : 9), y: ry(2), w: span(port ? 2 : 3), h: G.rspan(2) },
    day: { x: cx(port ? 4 : 6), w: span(port ? 2 : 3) },
    // evening 5's column: in landscape it may run under the diagram (the text sits in rows 5–6, the diagram in 3–4)
    dayWide: { x: cx(port ? 5 : 7), w: G.x1 - cx(port ? 5 : 7) },
    sess: port ? 44 : 64,
    lead: port ? 48 : 72,
    daySize: port ? 40 : 56,
    subSize: port ? 40 : 56,
    subLead: port ? 48 : 64,
    // the subtitle: under the title (title phase), then beside it (evenings); it leaves at the recompose
    subA: { x: cx(0), lines: [SUB], base: titleBase + (port ? 60 : 72) },
    subB: port
      ? { x: cx(4), lines: ["Five evenings", "on order"], base: titleBase }
      : { x: cx(6), lines: [SUB], base: titleBase },
    titleCols0: 4,
    titleCols1: port ? 5 : 8,
    // landscape: the days sit in column 7 so the 56 px titles (bold when active) never reach them
    list: {
      base0: bl(ry(2) + (port ? 52 : 56) * CAP),
      pitch: 84 + (port ? 12 : 0),
      size: port ? 52 : 56,
      day: port ? 5 : 6,
      daySize: port ? 36 : 56,
    },
    // the info block, bottom right; in landscape its last line shares the list's last baseline
    info: port
      ? { x: cx(3), w: G.x1 - cx(3), base: bl(ry(5) + 30), size: 40, lead: 48, lines: INFO_LINES.portrait }
      : {
          x: cx(8),
          w: G.x1 - cx(8),
          base: bl(ry(2) + 56 * CAP) + 4 * 84 - 3 * 72,
          size: 56,
          lead: 72,
          lines: INFO_LINES.landscape,
        },
    redEndRow: G.rows - 1,
  };
  const listBase = (i: number) => D.list.base0 + i * D.list.pitch;

  // ---- the timeline (frames). Every entry here is a snap (or a cut) and so a tick.
  // The grid opens bold: the columns fall as solid ink bars, cut to hairlines, then the rows do the same.
  const colT = ats(-6, G.cols, 2),
    colsCut = at(port ? 15 : 27),
    rowT = ats(colsCut, G.rows, 2),
    rowsCut = at(rowT[rowT.length - 1]! + 9),
    baseT = rowsCut,
    cropT = ats(baseT + 6, 4, 2),
    headT = at(T.title + 75);
  const redT = { appear: at(T.title), grow: ats(T.title + 3, 3, 3) };
  const titleT = at(T.title + 22.5),
    subT = at(T.title + 37.5),
    subMoveX = at(T.title + 52.5),
    subMoveY = at(T.title + 60);
  const dayT = EV.map((e) => ({ label: at(e + 7.5), sess: at(e + 15) }));
  // evening 1: the page slides in, its modules cut in row by row, a red module lands, steps x, then y
  const diagT = {
    page: at(T.e1 + 22.5),
    rows: ats(T.e1 + 30, 3, 3),
    lit: at(T.e1 + 37.5),
    litX: at(T.e1 + 45),
    litY: at(T.e1 + 52.5),
  };
  const marginT = { band: at(T.e2 + 22.5), steps: ats(T.e2 + 30, 3, 7.5) };
  const gutterT = ats(T.e3 + 22.5, 4, 7.5),
    gutterOff = at(T.e3 + 52.5);
  const baselineT = at(T.e4 + 22.5),
    dropT = at(T.e4 + 37.5),
    guideOff = at(T.e4 + 52.5); // the page's baselines under the text show in ink from baselineT to here
  const fillT = at(T.e5 + 22.5),
    clearT = ats(T.e5 + 29, 2, 7),
    shiftT = at(T.e5 + 45);
  const R = T.recompose,
    RT = {
      // on the hit the numeral shrinks while the evening text and diagram leave right, so the page is never
      // left empty: the 5 rises, then 1–4, the titles and the days land a half beat apart
      shrink: at(R),
      out: at(R),
      up: at(R + 7.5),
      nums: ats(R + 15, 4, 3),
      titles: ats(R + 22.5, 5, 3),
      days: ats(R + 30, 5, 3),
      redShrink: ats(R + 45, 3, 3),
      redDown: at(R + 52.5),
      redGrow: ats(R + 60, 3, 3),
      subOut: at(R + 67.5),
      titleGrow: ats(R + 82.5, D.titleCols1 - D.titleCols0, 3),
    };
  const squareT = ats(547.5, 8, 15); // the active day steps once per beat
  // the poster lands with the opening's gesture: the row bars sweep across (x only) and, as they leave, the
  // hairlines are back at a quarter strength; then the info block snaps in
  const wipeT = { on: at(T.poster), off: at(T.poster + 7.5) },
    fallT = [0, 1, 2].map(() => wipeT.off),
    infoT = ats(T.poster + 15, D.info.lines.length, 3);
  // evening 1 lands as a slam: on the hit the frame cuts to ink with a type-area-tall "1" reversed out of it, and
  // half a beat later it cuts back to the page with the "1" at rest in its field
  const slamOff = at(T.e1 + 7.5);

  // ---- type helpers (Inter only, flush left, ink)
  const o = (size: number, weight: number, track = 0): TextOpts => ({
    size,
    family: SANS,
    weight,
    color: C.ink,
    track,
  });
  const clip = (ctx: Ctx, x: number, y: number, w: number, h: number, fn: () => void) => {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    fn();
    ctx.restore();
  };
  const rect = (ctx: Ctx, x: number, y: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  };
  const wrap = (ctx: Ctx, s: string, width: number, to: TextOpts) => {
    const words = s.split(" "),
      lines: string[] = [];
    let cur = "";
    for (const w of words) {
      const t = cur ? `${cur} ${w}` : w;
      if (cur && measure(ctx, t, to) > width) {
        lines.push(cur);
        cur = w;
      } else cur = t;
    }
    lines.push(cur);
    return lines;
  };
  const TITLE = o(100, 800, -0.04);
  let titlePerPx = 0; // "Grid Week" width at 1 px, measured once
  const titleSize = (ctx: Ctx, cols: number) => {
    if (!titlePerPx) titlePerPx = measure(ctx, "Grid Week", TITLE) / 100;
    return span(cols) / titlePerPx;
  };

  // ---- 00 the grid. Columns fall as solid ink bars and cut to their two hairline edges; the rows slide in from
  // the left the same way; then the baselines wipe down behind a short ink edge. Drawn in screen space: the push-in
  // is applied to the coordinates and every hairline is rounded to a whole pixel, so it stays 1 px sharp.
  const gridLayer = (ctx: Ctx, F: number, z: number) => {
    const fall = [0, 1, 2].map((i) => (F >= fallT[i]! ? 0.25 : 1)); // a cut, not a fade
    const X = (x: number) => W / 2 + (x - W / 2) * z,
      Y = (y: number) => H / 2 + (y - H / 2) * z;
    for (let i = 0; i < G.cols; i++) {
      const s = snap(F, colT[i]!, 8);
      if (s <= 0) continue;
      const dy = -(G.y1 + 10) * (1 - s);
      if (F < colsCut) {
        rect(ctx, X(cx(i)), Y(G.y0 + dy), cw * z, (G.y1 - G.y0) * z, C.ink);
        continue;
      }
      ctx.fillStyle = C.line;
      ctx.globalAlpha = fall[0]!;
      for (const x of [cx(i), cx(i) + cw]) ctx.fillRect(Math.round(X(x)), Y(G.y0), 1, (G.y1 - G.y0) * z);
      ctx.globalAlpha = 1;
    }
    for (let j = 0; j < G.rows; j++) {
      const s = snap(F, rowT[j]!, 8);
      if (s <= 0) continue;
      const dx = -(G.x1 + 10) * (1 - s);
      if (F < rowsCut) {
        rect(ctx, X(G.x0 + dx), Y(ry(j)), (G.x1 - G.x0) * z, rh * z, C.ink);
        continue;
      }
      ctx.fillStyle = C.line;
      ctx.globalAlpha = fall[1]!;
      for (const y of [ry(j), ry(j) + rh]) ctx.fillRect(X(G.x0), Math.round(Y(y)), (G.x1 - G.x0) * z, 1);
      ctx.globalAlpha = 1;
    }
    // baselines, at half the line's strength; the three newest are ink while the wipe runs
    const sb = snap(F, baseT, 10);
    if (sb > 0) {
      const yEnd = lerp(G.y0, G.y1, sb);
      for (let y = G.y0 + 12; y < G.y1 && y <= yEnd; y += 12) {
        const edge = sb < 1 && yEnd - y < 36;
        ctx.fillStyle = edge ? C.ink : C.line;
        ctx.globalAlpha = edge ? 1 : 0.5 * fall[2]!;
        ctx.fillRect(X(G.x0), Math.round(Y(y)), (G.x1 - G.x0) * z, 1);
      }
      ctx.globalAlpha = 1;
    }
  };
  const cropMarks = (ctx: Ctx, F: number) => {
    // crop marks: outside the four corners of the type area, in ink
    const { o: co, l } = D.crop;
    const corners: [number, number, number, number][] = [
      [G.x0, G.y0, -1, -1],
      [G.x1, G.y0, 1, -1],
      [G.x1, G.y1, 1, 1],
      [G.x0, G.y1, -1, 1],
    ];
    corners.forEach(([x, y, sx, sy], i) => {
      const s = snap(F, cropT[i]!, 6);
      if (s <= 0) return;
      const len = l * s;
      ctx.fillStyle = C.ink;
      // horizontal tick in the side margin, vertical tick in the top/bottom margin
      const hx0 = sx < 0 ? x - co - len : x + co;
      ctx.fillRect(hx0, Math.round(y) - 1, len, 1.5);
      const vy0 = sy < 0 ? y - co - len : y + co;
      ctx.fillRect(Math.round(x) - 1, vy0, 1.5, len);
    });
  };

  // ---- the running head: a tiny page number and the series line, one baseline above the type area (chrome)
  const runningHead = (ctx: Ctx, F: number) => {
    if (F < headT) return;
    text(ctx, "33", G.x0, D.headBase, o(22, 400));
    const s = snap(F, headT + 3, 7);
    clip(ctx, cx(1), D.headBase - 30, W, 42, () =>
      text(ctx, "Grid Week · 5 evenings", cx(1) - (1 - s) * 420, D.headBase, o(26, 400)),
    );
  };

  // ---- the red rectangle: one module that grows right in whole-module steps; at the recompose it shrinks back to
  // one module, drops to the bottom row, and grows again (x and y never at once)
  const red = (ctx: Ctx, F: number) => {
    if (F < redT.appear) return;
    let n = 1;
    for (const t of redT.grow) n += snap(F, t, 6);
    for (const t of RT.redShrink) n -= snap(F, t, 6);
    for (const t of RT.redGrow) n += snap(F, t, 6);
    const w = cw + (n - 1) * (cw + g),
      y = lerp(ry(0), ry(D.redEndRow), snap(F, RT.redDown, 9));
    rect(ctx, cx(0), y, w, rh, C.accent);
  };

  // ---- the title: drops onto its baseline from under the red module; at the recompose it grows column by column
  const title = (ctx: Ctx, F: number) => {
    if (F < titleT) return;
    let cols = D.titleCols0;
    for (const t of RT.titleGrow) cols += snap(F, t, 6);
    const sz = titleSize(ctx, cols),
      s = snap(F, titleT, 9),
      top = ry(0) + rh;
    const draw = (dy: number) => text(ctx, "Grid Week", cx(0), titleBase + dy, { ...TITLE, size: sz });
    if (s < 1) clip(ctx, 0, top, W, H - top, () => draw(-(titleBase - top + 10) * (1 - s)));
    else draw(0);
  };

  // ---- the subtitle: snaps in under the title, then x first, then y, to its place beside it; at the recompose it
  // leaves to the right (the final poster is title, list, info and the red bar)
  const subtitle = (ctx: Ctx, F: number) => {
    if (F < subT) return;
    const to = o(D.subSize, 400);
    const lines = (st: { lines: string[]; base: number }, x: number, dy: number) =>
      st.lines.forEach((ln, i) => text(ctx, ln, x, st.base + dy - (st.lines.length - 1 - i) * D.subLead, to));
    if (F < subMoveX) {
      const s = snap(F, subT, 8);
      clip(ctx, cx(0), D.subA.base - D.subSize * 1.1, W - cx(0), D.subSize * 1.45, () =>
        lines(D.subA, cx(0) - (1 - s) * span(4), 0),
      );
      return;
    }
    // the portrait's two-line set is cut in as the move starts; x snaps first, then y
    const x = lerp(D.subA.x, D.subB.x, snap(F, subMoveX, 8)) + (W - D.subB.x + 40) * snap(F, RT.subOut, 8),
      dy = (D.subA.base - D.subB.base) * (1 - snap(F, subMoveY, 8));
    if (x < W) lines(D.subB, x, dy);
  };

  // ---- the giant numeral: one per evening, pushed along its row or column inside its field; at the recompose
  // it shrinks to list size, rises to the fifth slot, and 1–4 drop into the slots above it
  const NUM = o(numSize, 800, -0.04);
  const LSZ = D.list.size;
  const numeral = (ctx: Ctx, F: number) => {
    if (F < T.e1) return;
    const k = stepIndex(F, EV);
    const draw = (i: number, dx: number, dy: number) => text(ctx, String(i + 1), NF.x + dx, numBase + dy, NUM);
    const fieldClip = (fn: () => void) => clip(ctx, NF.x, NF.y - 10, NF.w, NF.h + 34, fn);
    if (F < RT.shrink) {
      const s = snap(F, EV[k]!, 7),
        pw = NF.w + g,
        ph = NF.h + 48;
      fieldClip(() => {
        if (k === 0) draw(0, 0, 0); // at rest: it arrived by the slam (see slam())
        else if (k === 1 || k === 3) {
          if (s < 1) draw(k - 1, -pw * s, 0);
          draw(k, pw * (1 - s), 0);
        } else if (k === 2) {
          if (s < 1) draw(k - 1, 0, ph * s);
          draw(k, 0, -ph * (1 - s));
        } else {
          if (s < 1) draw(k - 1, 0, -ph * s);
          draw(k, 0, ph * (1 - s));
        }
      });
      return;
    }
    // recompose: the 5 shrinks (a size snap anchored on its baseline), then rises (y only) to its slot
    const sz = lerp(numSize, LSZ, snap(F, RT.shrink, 6)),
      y = lerp(numBase, listBase(4), snap(F, RT.up, 9));
    text(ctx, "5", NF.x, y, o(sz, 800, -0.02));
    // 1–4 drop onto their baselines, each inside its own line box (so no numeral crosses another)
    for (let i = 0; i < 4; i++) {
      const s = snap(F, RT.nums[i]!, 8),
        b = listBase(i);
      if (s <= 0) continue;
      clip(ctx, NF.x, b - LSZ * 1.05, cw, LSZ * 1.35, () =>
        text(ctx, String(i + 1), NF.x, b - LSZ * 1.2 * (1 - s), o(LSZ, 800, -0.02)),
      );
    }
  };

  // ---- the evening text: the day name, then the session, each rising onto its baseline inside its line box
  const dayText = (ctx: Ctx, F: number) => {
    if (F < dayT[0]!.label || F >= RT.out + 12) return;
    const k = Math.min(stepIndex(F, EV), 4);
    const so = o(D.sess, 800, -0.02),
      lo = o(D.daySize, 600);
    // evening 5 re-sets the column one module to the right (the wrap is cut as the move starts)
    const wide = k === 4 && F >= shiftT;
    const x0 = wide ? lerp(D.day.x, D.dayWide.x, snap(F, shiftT, 8)) : D.day.x;
    const lines = wrap(ctx, SESSIONS[k]!, wide ? D.dayWide.w : D.day.w, so);
    const first = textBase - (lines.length - 1) * D.lead,
      labelBase = first - D.lead - 12;
    // evening 4 arrives off the grid, a baseline and a half high; its own baselines show in ink, the diagram rules
    // its baselines, and the text drops onto them
    const off = k === 3 ? -18 * (1 - snap(F, dropT, 8)) : 0;
    if (k === 3 && F >= baselineT && F < guideOff) {
      ctx.fillStyle = C.ink;
      for (const y of [labelBase, ...lines.map((_, i) => first + i * D.lead)])
        ctx.fillRect(D.day.x, y - 0.5, D.day.w, 1.5);
    }
    const x = x0 + (F >= RT.out ? (W - D.day.x + 40) * snap(F, RT.out, 8) : 0);
    const rise = (s: string, base: number, t0: number, to: TextOpts) => {
      const p = snap(F, t0, 8);
      if (p <= 0) return;
      clip(ctx, x - 4, base + off - to.size * 1.05, W, to.size * 1.35, () =>
        text(ctx, s, x, base + off + to.size * 1.2 * (1 - p), to),
      );
    };
    lines.forEach((ln, i) => rise(ln, first + i * D.lead, dayT[k]!.sess + i * 3, so));
    rise(DAYS[k]!, labelBase, dayT[k]!.label, lo);
  };

  // ---- the diagram: a tiny page with its own 3 × 3 grid that demonstrates each evening's idea. Only one thing in
  // it is red at a time.
  const diagram = (ctx: Ctx, F: number) => {
    if (F < diagT.page || F >= RT.out + 12) return;
    const k = Math.min(stepIndex(F, EV), 4);
    const dx =
      (W - D.diag.x + 40) * (1 - snap(F, diagT.page, 8)) + (F >= RT.out ? (W - D.diag.x + 40) * snap(F, RT.out, 8) : 0);
    const { y, w, h } = D.diag,
      x = D.diag.x + dx;
    const gd = 10;
    let md = Math.round(Math.min(w, h) * 0.07);
    if (k === 1) for (const t of marginT.steps) md += 10 * snap(F, t, 8);
    const ax = x + md,
      ay = y + md,
      aw = w - 2 * md,
      ah = h - 2 * md,
      mw = (aw - 2 * gd) / 3,
      mh = (ah - 2 * gd) / 3;
    const mod = (c: number, r: number) => ({ x: ax + c * (mw + gd), y: ay + r * (mh + gd) });
    // the margin band (evening 2)
    if (k === 1 && F >= marginT.band) {
      rect(ctx, x, y, w, h, C.accent);
      rect(ctx, ax, ay, aw, ah, C.ground);
    }
    // the gutters, one at a time (evening 3)
    if (k === 2) {
      const gi = stepIndex(F, gutterT);
      if (gi >= 0 && F < gutterOff) {
        if (gi < 2) rect(ctx, ax + (gi + 1) * mw + gi * gd, ay, gd, ah, C.accent);
        else rect(ctx, ax, ay + (gi - 1) * mh + (gi - 2) * gd, aw, gd, C.accent);
      }
    }
    // evening 1: one red module lands top left, then steps right (x), then down (y) to the centre
    if (k === 0 && F >= diagT.lit) {
      const p = mod(snap(F, diagT.litX, 7), snap(F, diagT.litY, 7));
      rect(ctx, p.x, p.y, mw, mh, C.accent);
    }
    // the modules (evening 5 fills the centre in ink and clears the corners, then the edges)
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 9; i++) {
      const c = i % 3,
        r = Math.floor(i / 3),
        corner = c !== 1 && r !== 1;
      if (k === 0 && F < diagT.rows[r]!) continue;
      if (k === 4 && i !== 4 && F >= clearT[corner ? 0 : 1]!) continue;
      const p = mod(c, r);
      if (k === 4 && i === 4 && F >= fillT) rect(ctx, p.x, p.y, mw, mh, C.ink);
      ctx.strokeRect(p.x + 0.75, p.y + 0.75, mw - 1.5, mh - 1.5);
    }
    // the baselines rule in, left to right, one after another (evening 4)
    if (k === 3) {
      ctx.fillStyle = C.ink;
      let n = 0;
      for (let by = ay + 12; by < ay + ah; by += 12, n++) {
        const s = snap(F, baselineT + n * 0.5, 6);
        if (s > 0) ctx.fillRect(ax, Math.round(by) - 0.5, aw * s, 1);
      }
    }
    // the page
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  };

  // ---- the final poster: the list, the active-day square and the info block
  const list = (ctx: Ctx, F: number) => {
    if (F < RT.titles[0]!) return;
    const active = stepIndex(F, squareT),
      row = active < 0 ? -1 : active % 5;
    const tx = cx(1),
      dx = cx(D.list.day),
      dsz = D.list.daySize;
    for (let i = 0; i < 5; i++) {
      const b = listBase(i);
      const st = snap(F, RT.titles[i]!, 8);
      if (st > 0)
        clip(ctx, tx, b - LSZ, dx - g - tx, LSZ * 1.4, () =>
          text(ctx, SESSIONS[i]!, tx - (1 - st) * (dx - tx), b, o(LSZ, i === row ? 800 : 600, -0.02)),
        );
      const sd = snap(F, RT.days[i]!, 8);
      if (sd > 0)
        clip(ctx, dx, b - dsz * 1.1, G.x1 - dx + 8, dsz * 1.4, () =>
          text(ctx, DAYS[i]!, dx + (1 - sd) * (G.x1 - dx + 8), b, o(dsz, 600)),
        );
    }
    if (row >= 0) {
      // the square steps down one row per beat (a y snap), and back to the top after the fifth
      const sq = 24,
        prev = active === 0 ? row : (active - 1) % 5,
        y = lerp(listBase(prev), listBase(row), snap(F, squareT[active]!, 6));
      rect(ctx, cx(0) + cw - sq, y - (LSZ * CAP) / 2 - sq / 2, sq, sq, C.accent);
    }
  };
  const info = (ctx: Ctx, F: number) => {
    if (F < infoT[0]!) return;
    const to = o(D.info.size, 400);
    D.info.lines.forEach((ln, i) => {
      const s = snap(F, infoT[Math.min(i, infoT.length - 1)]!, 8),
        b = D.info.base + i * D.info.lead;
      if (s > 0)
        clip(ctx, D.info.x, b - D.info.size, D.info.w + 8, D.info.size * 1.35, () =>
          text(ctx, ln, D.info.x + (1 - s) * D.info.w, b, to),
        );
    });
  };

  const slam = (ctx: Ctx, F: number) => {
    if (F < T.e1 || F >= slamOff) return;
    rect(ctx, -W, -H, 3 * W, 3 * H, C.ink);
    const h = G.y1 - G.y0;
    text(ctx, "1", G.x0, G.y1, { ...o(h / CAP, 800, -0.04), color: C.ground });
  };

  const wipe = (ctx: Ctx, F: number) => {
    if (F < wipeT.on || F >= wipeT.off + 16) return;
    for (let j = 0; j < G.rows; j++) {
      const a = snap(F, wipeT.on + j, 6),
        b = snap(F, wipeT.off + j, 6),
        L0 = G.x1 - G.x0;
      const x0 = G.x0 - (L0 + 10) * (1 - a) + (L0 + G.m + 10) * b;
      if (a > 0 && b < 1) rect(ctx, x0, ry(j), L0, rh, C.ink);
    }
  };

  const paint = (ctx: Ctx, env: Env, F: number) => {
    F = clamp(F, 0, N - 1);
    ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
    ctx.fillStyle = C.ground;
    ctx.fillRect(0, 0, W, H);
    // a very slow, straight push-in over the whole film (1.000 → 1.015)
    const z = 1 + 0.015 * (F / (N - 1));
    gridLayer(ctx, F, z);
    ctx.translate(W / 2, H / 2);
    ctx.scale(z, z);
    ctx.translate(-W / 2, -H / 2);
    cropMarks(ctx, F);
    runningHead(ctx, F);
    red(ctx, F);
    title(ctx, F);
    subtitle(ctx, F);
    diagram(ctx, F);
    numeral(ctx, F);
    dayText(ctx, F);
    list(ctx, F);
    info(ctx, F);
    wipe(ctx, F);
    slam(ctx, F);
  };

  // ticks from the move table, thinned so snaps closer than 3 frames share one tick
  const ticks: number[] = [];
  for (const f of [...MOVES].filter((f) => f >= 0).sort((a, b) => a - b))
    if (!ticks.length || f - ticks[ticks.length - 1]! >= 3) ticks.push(f);

  const cuts = [0, T.title, ...EV, T.recompose, T.poster, N],
    names = ["grid", "title", "evening1", "evening2", "evening3", "evening4", "evening5", "recompose", "poster"];
  const shots: Shot[] = names.map((sid, i) => ({
    id: sid,
    start: cuts[i]!,
    end: cuts[i + 1]!,
    draw: (ctx, local, env) => paint(ctx, env, cuts[i]! + local),
  }));
  return {
    meta: { title: id, W, H, fps: FPS, bpm: BPM, durationFrames: N, raster: "cpu" },
    assets: { images: {}, fonts: P.assets },
    shots,
    audio: beatScore({
      frames: N,
      fps: FPS,
      bpm: BPM,
      mood: "drive",
      drop: T.title,
      hits: [...EV, T.recompose],
      ticks,
      sign: T.poster,
    }),
  };
}

export const swissGridPortrait = make("portrait", "swissGridPortrait");
export const swissGrid = make("landscape", "swissGrid");
