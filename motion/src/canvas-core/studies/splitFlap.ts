// STUDY 29 · SPLIT-FLAP (24 s, 60 fps). A mechanical departures board for the meetings of one day: the board
// powers on in one amber flip, six meetings rattle in letter by letter, four snap to red DELAYED, Oriel finds new
// times, every status snaps green to BOOKED on one hit, and the board snaps clear to a two-row sign-off. One source, landscape and vertical.
// Brief: series/studies/briefs/split-flap.json · prompt: series/studies/prompts/split-flap.prompt.md
//
// The board is data. Every cell carries the same drum (40 flaps) and a list of (frame, target) segments; it only
// ever moves FORWARD through the drum, one flap per FLAP frames, so its face at any frame is a closed-form function
// of its segments. paint(F) draws every cell from that function: no simulation state, any frame on its own.
import PACK from "../../../brand/packs/studio/pack.json";
import type { Ctx, Env } from "../core";
import type { Film, Shot } from "../film";
import { clamp, ease, lerp, phase, prog } from "../kit/motion";
import { usePack } from "../kit/pack";
import { beatScore } from "../kit/score";
import { layout, type Size } from "../kit/sizes";
import { text } from "../kit/type";

const P = usePack(PACK),
  C = P.palette("solari"),
  F_ = P.face;
const FPS = 60,
  BPM = 120,
  N = 1440; // a beat is 30 frames
const FLAP = 2; // frames per flap: 30 flaps a second, so a full trip round the drum is 1.3 s
const CASCADE = 2; // a row's cells start this many frames apart, left to right
const DRUM = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:.-";
// the timeline, in frames (every cut on a beat)
const T = { power: 0, day: 120, trouble: 480, works: 720, booked: 960, end: 1200 };
// the hits: each DELAYED row snaps red on a beat, the status column snaps green, the message row lands, the whole
// board snaps to the sign-off; every cell of a snap starts at its own frame and lands on the same one
const DELAYED_LAND = [540, 570, 600, 630];
const NEW_TIME_LAND = [780, 810, 840, 870];
const CUE = { firstDelayed: 540, booked: 1050, allBooked: 1140, sign: 1290 };
const DAY_GAP = 54; // a meeting boards every 54 frames, so the last settles just before the drop
// camera shots: [start, framing]; 'wide' is the whole board, 'names' a close-up on the times and meetings,
// 'status' a close-up on the status column. A wide shot runs across act boundaries, so its push-in never snaps back
// (the one reset hides inside the sign-off snap). Landscape also cuts in on the TIME column while the new times land.
type Framing = "wide" | "names" | "status";
const shotsFor = (tall: boolean): [number, Framing][] => [
  [0, "wide"],
  [240, "names"],
  [420, "wide"],
  [T.trouble, "status"],
  [660, "wide"],
  ...(tall
    ? []
    : ([
        [780, "names"],
        [900, "wide"],
      ] as [number, Framing][])),
  [T.booked, "status"],
  [1080, "wide"],
  [CUE.sign, "wide"],
];
// the slow push-in: 1% a second from each shot's first frame, slower on a long wide shot so it never pushes the
// board out of the safe area (the wide framing's pivot leaves room for 4%)
const PUSH = 0.00017,
  WIDE_PUSH = 0.038;
// a kick: the camera jumps in on a hit and settles back (a decaying punch)
const KICKS: [number, number][] = [
  ...DELAYED_LAND.map((f): [number, number] => [f, 0.03]),
  ...NEW_TIME_LAND.map((f): [number, number] => [f, 0.015]),
  [CUE.booked, 0.045],
  [CUE.allBooked, 0.035],
  [CUE.sign, 0.035],
];

// ---- faces: a drum index and a tone (0 plain, 1 amber, 2 red, 3 green)
type Face = { c: number; t: number };
type Run = { at: number; from: Face; to: Face; n: number };
type Cell = { segs: { at: number; to: Face }[]; runs: Run[]; last: Face };
const BLANK: Face = { c: 0, t: 0 };
const mix = (a: string, b: string, k: number) => {
  const p = (h: string, i: number) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
  const ch = (i: number) => Math.round(lerp(p(a, i), p(b, i), k));
  return `rgb(${ch(0)},${ch(1)},${ch(2)})`;
};
const TONE = [C.surface, C.accent, C.accent2, C.s1];
const TONE_TOP = TONE.map((c) => mix(c, "#ffffff", 0.05)); // each flap face is 5% lighter at its top
const GLYPH = [C.ink, C.ground, C.ground, C.ground];
const code = (ch: string) => {
  const i = DRUM.indexOf(ch);
  if (i < 0) throw new Error(`splitFlap: '${ch}' is not on the drum`);
  return i;
};
const faceOf = (r: Run, j: number): Face => (j <= 0 ? r.from : j >= r.n ? r.to : { c: (r.from.c + j) % 40, t: 0 });
const steps = (from: Face, to: Face) => {
  const d = (to.c - from.c + 40) % 40;
  return d === 0 && to.t !== from.t ? 1 : d; // a colour change on the same character is one colour flap
};
/** turn a cell's segments into runs: a new target interrupts the old one only after the flap in flight lands */
const resolve = (cell: Cell) => {
  let cur = BLANK;
  for (const s of [...cell.segs].sort((a, b) => a.at - b.at)) {
    let at = s.at;
    const pr = cell.runs[cell.runs.length - 1];
    if (pr) {
      const e = Math.max(0, s.at - pr.at),
        k = Math.floor(e / FLAP);
      at = Math.max(at, pr.at);
      if (k >= pr.n) cur = pr.to;
      else if (e % FLAP === 0) cur = faceOf(pr, k);
      else {
        cur = faceOf(pr, k + 1);
        at = pr.at + (k + 1) * FLAP;
      }
    }
    cell.runs.push({ at, from: cur, to: s.to, n: steps(cur, s.to) });
  }
};
type State = { a: Face; b: Face; p: number; land: number }; // p < 0: static on a · land: frames since a landed
const stateAt = (cell: Cell, F: number): State => {
  let r: Run | undefined;
  for (const x of cell.runs) if (x.at <= F) r = x;
  if (!r) return { a: BLANK, b: BLANK, p: -1, land: 99 };
  const e = F - r.at,
    k = Math.floor(e / FLAP);
  if (k >= r.n) return { a: r.to, b: r.to, p: -1, land: r.n ? e - r.n * FLAP : 99 };
  // phase sampled mid-frame, so each of a flap's two frames shows one half of the flip in motion
  return { a: faceOf(r, k), b: faceOf(r, k + 1), p: (e - k * FLAP + 0.5) / FLAP, land: k ? e - k * FLAP : 99 };
};
const flipping = (cell: Cell, F: number) => stateAt(cell, F).p >= 0;
const mk = (n: number): Cell[] => Array.from({ length: n }, () => ({ segs: [], runs: [], last: BLANK }));
type Tone = number | ((i: number) => number);
const toneAt = (t: Tone, i: number) => (typeof t === "number" ? t : t(i));
/** send cells to a string, cascading left to right from `at` */
const put = (cells: Cell[], s: string, at: number, tone: Tone = 0) =>
  cells.forEach((c, i) => {
    const to = { c: code(s[i] ?? " "), t: toneAt(tone, i) };
    c.segs.push({ at: at + CASCADE * i, to });
    c.last = to;
  });
/** frames from the first cell starting to the last cell landing, from the settled faces */
const span = (cells: Cell[], s: string, tone: Tone = 0) =>
  Math.max(...cells.map((c, i) => CASCADE * i + FLAP * steps(c.last, { c: code(s[i] ?? " "), t: toneAt(tone, i) })));
/** send cells to a string so that every cell lands within `spread` flaps before frame `at`: each starts as far
 * ahead as its own trip round the drum needs (from the face it has settled on), so the rattle starts raggedly and
 * ends in one snap. The small fixed jitter keeps cells bound for the same letter from showing the same flap in
 * unison. Returns the frame the first cell starts. */
const snap = (cells: Cell[], s: string, at: number, tone: Tone = 0, spread = 3, salt = 0) => {
  let first = at;
  cells.forEach((c, i) => {
    const to = { c: code(s[i] ?? " "), t: toneAt(tone, i) },
      jitter = ((i * 37 + salt * 53 + at * 13) % 97) % (spread + 1),
      start = at - FLAP * (steps(c.last, to) + jitter);
    c.segs.push({ at: start, to });
    c.last = to;
    first = Math.min(first, start);
  });
  return first;
};
const lettersIn = (str: string, tone: number) => (i: number) => (str[i] === " " || str[i] === undefined ? 0 : tone);

// ---- the day
const MEETINGS = [
  { time: "09:30", name: "STANDUP", short: "STANDUP", room: "A1", later: "" },
  { time: "10:00", name: "DESIGN CRIT", short: "DESIGN", room: "B4", later: "10:30" },
  { time: "11:15", name: "1:1 WITH ANA", short: "1:1 ANA", room: "A2", later: "11:45" },
  { time: "13:00", name: "ROADMAP", short: "ROADMAP", room: "C1", later: "13:30" },
  { time: "14:30", name: "HIRING SYNC", short: "HIRING", room: "B2", later: "" },
  { time: "16:00", name: "RETRO", short: "RETRO", room: "A3", later: "16:30" },
];
// status words sit in an 8-cell span; the offsets keep each word near the middle and its drum trips short
const STATUS = { boarding: "BOARDING", ontime: "ON TIME ", delayed: " DELAYED", booked: " BOOKED " };
const TONE_OF = { boarding: 1, ontime: 0, delayed: 2, booked: 3 };
const DELAYED_ROWS = [1, 2, 3, 5];

export function make(size: Size, id: string): Film {
  const L = layout(size),
    { W, H, u, cx } = L,
    tall = L.tall;

  // ---- per-size design: the board geometry and where the printed lines sit
  const G = tall
    ? {
        cols: 16,
        cw: 50 * u,
        chH: 72 * u,
        pitch: 54 * u,
        fs: 50 * u,
        rowsY: Array.from({ length: 12 }, (_, i) => (352 + Math.floor(i / 2) * 170 + (i % 2) * 80) * u),
        msgY: 1386 * u,
        headerY: 286 * u,
        headsY: 336 * u,
        tickerY: 1540 * u,
        endY: 1540 * u,
        frameTop: 232 * u,
        frameBot: 1478 * u,
      }
    : {
        cols: 31,
        cw: 50 * u,
        chH: 76 * u,
        pitch: 54 * u,
        fs: 54 * u,
        rowsY: Array.from({ length: 6 }, (_, i) => (196 + i * 96) * u),
        msgY: 786 * u,
        headerY: 118 * u,
        headsY: 178 * u,
        tickerY: 948 * u,
        endY: 944 * u,
        frameTop: 62 * u,
        frameBot: 886 * u,
      };
  const boardW = (G.cols - 1) * G.pitch + G.cw,
    left = cx - boardW / 2,
    right = left + boardW,
    colX = (c: number) => left + c * G.pitch;
  // the two framings: the whole board (pushing in about its middle), and a close-up on the status column that
  // fits every status row from the column heads down, its left edge in the gap between two cells and its top
  // below the header clock
  const SHOTS = shotsFor(tall);
  const FRAME = (() => {
    // the wide push pivots about the point that brings the board's two sides (lamps included) and its top (the
    // clock) and bottom (the printed lines) to the safe margins at the same moment
    const sx = L.safe.x,
      xl = left,
      xr = right + 23 * u,
      yt = G.headerY - 38 * u,
      yb = Math.max(G.tickerY, G.endY) + 12 * u,
      piv = (a: number, b: number, sa: number, sb: number) => (sa * b + sb * a) / (sa + sb),
      px = piv(xl, xr, xl - sx, W - sx - xr),
      py = piv(yt, yb, yt - L.safe.top, H - L.safe.bottom - yb);
    const x1 = right + 40 * u,
      y0 = G.headsY - 30 * u,
      y1 = G.rowsY[G.rowsY.length - 1]! + G.chH + 24 * u,
      z = Math.min(W / (x1 - colX(tall ? 5 : 14)), H / (y1 - y0)),
      vw = W / z,
      c0 = Math.ceil((x1 - vw - left) / G.pitch), // the first whole cell that fits
      l = colX(c0) - (G.pitch - G.cw) / 2,
      c1 = Math.floor((left - 40 * u + vw - left) / G.pitch) - 1, // the last whole cell from the left
      r = colX(c1) + G.cw + (G.pitch - G.cw) / 2;
    return {
      wide: { z: 1, ax: px, ay: py, fx: px, fy: py },
      // (vertical: every character sits in columns 0-13, so the close-up drops the two blank columns and the lamps)
      names: tall
        ? {
            z: W / (colX(13) + G.cw - left + 48 * u),
            ax: W / 2,
            ay: H / 2,
            fx: (left + colX(13) + G.cw) / 2,
            fy: (G.rowsY[0]! + G.rowsY[11]! + G.chH) / 2,
          }
        : { z, ax: W / 2, ay: H / 2, fx: r - vw / 2, fy: (y0 + y1) / 2 },
      status: { z, ax: W / 2, ay: H / 2, fx: l + vw / 2, fy: (y0 + y1) / 2 },
    };
  })();

  // ---- the cells
  const rows = G.rowsY.map(() => mk(G.cols)),
    msg = mk(G.cols),
    clock = mk(5);
  const all = [...rows.flat(), ...msg, ...clock];
  // where each meeting's fields live
  const statusRow = (m: number) => rows[tall ? 2 * m + 1 : m]!,
    statusCells = (m: number) => statusRow(m).slice(tall ? 6 : 23, tall ? 14 : 31),
    timeCells = (m: number) => rows[tall ? 2 * m : m]!.slice(0, 5);
  const lines = (m: number, status: keyof typeof STATUS): { row: number; s: string; tone: Tone }[] => {
    const mt = MEETINGS[m]!,
      word = lettersIn(STATUS[status], TONE_OF[status]); // only the letter flaps take the colour
    if (tall)
      return [
        { row: 2 * m, s: `${mt.time} ${mt.short.padEnd(10)}`, tone: 0 },
        { row: 2 * m + 1, s: `  ${mt.room}  ${STATUS[status]}  `, tone: (i) => (i >= 6 && i < 14 ? word(i - 6) : 0) },
      ];
    return [
      {
        row: m,
        s: `${mt.time} ${mt.name.padEnd(12)}  ${mt.room} ${STATUS[status]}`,
        tone: (i) => (i >= 23 ? word(i - 23) : 0),
      },
    ];
  };
  const centred = (s: string, n = G.cols, shift = 0) => {
    const l = Math.floor((n - s.length) / 2) + shift;
    return (" ".repeat(l) + s).padEnd(n);
  };

  // 0 · power on: every flap on the board flips at once to amber (one colour flap each), then a diagonal wave
  // flips them back to plain while DEPARTURES spells itself across the first row in amber and the clock rattles in
  const board = [...rows.flat(), ...clock];
  snap(board, "", FLAP, 1, 0); // every cell at once
  const dep0 = tall ? 3 : 10,
    DEP = "DEPARTURES";
  rows.forEach((r, ri) =>
    r.forEach((c, j) => {
      const at = 30 + j + 3 * ri,
        d = ri === 0 ? j - dep0 : -1,
        to = d >= 0 && d < DEP.length ? { c: code(DEP[d]!), t: 1 } : BLANK;
      c.segs.push({ at, to });
      c.last = to;
    }),
  );
  put(clock, "09:41", 30);
  // 1 · the day boards: a meeting every 54 frames, each row rattling in left to right, letter by letter
  // (row 0 turns straight from DEPARTURES into the first meeting)
  MEETINGS.forEach((_, m) =>
    lines(m, m === 0 ? "boarding" : "ontime").forEach((l, k) =>
      put(rows[l.row]!, l.s, T.day - 10 + DAY_GAP * m + k * 16, l.tone),
    ),
  );
  // 2 · the trouble: the clock ticks over just before the drop, then each delayed row's status snaps red on a beat
  put([clock[4]!], "2", T.trouble - 14);
  DELAYED_ROWS.forEach((m, i) =>
    snap(statusCells(m), STATUS.delayed, DELAYED_LAND[i]!, lettersIn(STATUS.delayed, TONE_OF.delayed), 3, m),
  );
  // 3 · Oriel works: a message row, then new times snap in one row per beat
  // the text, then three blank cells where the dots cycle
  const msg1Text = tall ? " FINDING TIME   " : "  ORIEL IS FINDING A TIME      ";
  put(msg, msg1Text, T.works);
  const msg1Land = T.works + span(mk(G.cols), msg1Text);
  DELAYED_ROWS.forEach((m, i) => snap(timeCells(m), MEETINGS[m]!.later, NEW_TIME_LAND[i]!, 0, 0));
  // then the message row itself rattles round to the news
  const MSG_FOUND = centred("NEW TIMES FOUND");
  put(msg, MSG_FOUND, T.works + 186, lettersIn(MSG_FOUND, TONE_OF.booked));
  // 4 · all booked: every status on the board rattles round and the whole column snaps green on one hit; then
  // the message row lands
  MEETINGS.forEach((_, m) =>
    snap(statusCells(m), STATUS.booked, CUE.booked, lettersIn(STATUS.booked, TONE_OF.booked), 3, m),
  );
  const MSG2 = tall ? centred("MEETINGS BOOKED") : centred("ALL MEETINGS BOOKED");
  snap(msg, MSG2, CUE.allBooked, lettersIn(MSG2, TONE_OF.booked));
  // 5 · end: the whole board rattles off the day and snaps, on the sign-off, to a clear board with ORIEL in amber
  // flaps; only the promise row still holds the day, and it rattles round after the snap, letter by letter, in green
  const endRows = tall ? [5, 6] : [2, 3],
    endText = (tall ? ["ORIEL", "ALL BOOKED"] : ["ORIEL", "EVERYONE BOOKED"]).map((s) => centred(s));
  rows.forEach((r, i) => {
    if (i === endRows[0]) snap(r, endText[0]!, CUE.sign, lettersIn(endText[0]!, TONE_OF.boarding), 3, i);
    else if (i === endRows[1]) {
      const p = endText[1]!,
        on = r.filter((_, j) => p[j] !== " ");
      snap(
        r.filter((_, j) => p[j] === " "),
        "",
        CUE.sign,
        0,
        5,
        i,
      );
      put(on, p.replaceAll(" ", ""), CUE.sign, TONE_OF.booked);
    } else snap(r, "", CUE.sign, 0, 5, i);
  });
  snap(msg, "", CUE.sign, 0, 5, 9);
  // and the web address rattles in on the message row, left to right; the dot is 38 flaps round the drum, so its
  // cell sets off early and lands last
  const URL = centred(P.url.toUpperCase());
  msg.forEach((c, i) =>
    URL[i] === "." ? snap([c], ".", N - 64, 0, 0) : put([c], URL[i]!, CUE.sign + 10 + CASCADE * i),
  );
  all.forEach(resolve);

  // ---- sound: the clatter is one tick per flap period while anything flips, doubled for a big cascade
  const ticks: number[] = [];
  for (let f = 0; f < N; f += FLAP) {
    let n = 0;
    for (const c of all) if (flipping(c, f)) n++;
    if (n > 0) ticks.push(f);
    if (n > 10) ticks.push(f + 1);
  }

  // ---- drawing a cell
  const R = 4 * u,
    GAP = 1 * u; // half of the 2 px split
  const halfPath = (ctx: Ctx, x: number, y0: number, w: number, y1: number, top: boolean) => {
    ctx.beginPath();
    if (top) {
      ctx.moveTo(x, y1);
      ctx.arcTo(x, y0, x + w, y0, R);
      ctx.arcTo(x + w, y0, x + w, y1, R);
      ctx.lineTo(x + w, y1);
    } else {
      ctx.moveTo(x, y0);
      ctx.lineTo(x + w, y0);
      ctx.arcTo(x + w, y1, x, y1, R);
      ctx.arcTo(x, y1, x, y0, R);
    }
    ctx.closePath();
  };
  /** one half of a flap face; sY scales it about the hinge (a flap in flight), dark shades it as it tips */
  const half = (
    ctx: Ctx,
    face: Face,
    top: boolean,
    x: number,
    y: number,
    w: number,
    h: number,
    fs: number,
    sY = 1,
    dark = 0,
    ga = 1,
  ) => {
    if (sY <= 0.001) return;
    const hinge = y + h / 2,
      y0 = top ? y : hinge + GAP,
      y1 = top ? hinge - GAP : y + h;
    ctx.save();
    if (sY !== 1) {
      ctx.translate(0, hinge);
      ctx.scale(1, sY);
      ctx.translate(0, -hinge);
    }
    halfPath(ctx, x, y0, w, y1, top);
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, TONE_TOP[face.t]!);
    g.addColorStop(1, TONE[face.t]!);
    ctx.fillStyle = g;
    ctx.fill();
    if (face.c) {
      ctx.clip();
      ctx.font = `600 ${fs}px "${F_.sans}"`;
      (ctx as Ctx & { letterSpacing: string }).letterSpacing = "0px";
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = GLYPH[face.t]!;
      ctx.globalAlpha *= ga;
      ctx.fillText(DRUM[face.c]!, x + w / 2, hinge + fs * 0.362);
      ctx.globalAlpha /= ga;
    }
    if (dark > 0) {
      ctx.fillStyle = `rgba(0,0,0,${dark.toFixed(3)})`;
      ctx.fillRect(x, y0, w, y1 - y0);
    }
    ctx.restore();
  };
  const drawCell = (
    ctx: Ctx,
    cell: Cell,
    F: number,
    x: number,
    y: number,
    w: number,
    h: number,
    fs: number,
    ga = 1,
  ) => {
    const s = stateAt(cell, F),
      over = s.land >= 0 && s.land < 1 ? 1.04 : 1; // the flap that just landed bounces 4% for one frame
    // the housing behind the flaps shows through the split
    ctx.fillStyle = C.line;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, R);
    ctx.fill();
    if (s.p < 0) {
      half(ctx, s.a, true, x, y, w, h, fs, 1, 0, ga);
      half(ctx, s.a, false, x, y, w, h, fs, over, 0, ga);
    } else {
      // behind: the new top is already showing; below: the old bottom until the falling flap covers it
      half(ctx, s.b, true, x, y, w, h, fs, 1, 0, ga);
      half(ctx, s.a, false, x, y, w, h, fs, over, 0, ga);
      if (s.p < 0.5) {
        const c = Math.cos((s.p / 0.5) * (Math.PI / 2));
        half(ctx, s.a, true, x, y, w, h, fs, c, 0.45 * (1 - c), ga);
      } else {
        const k = (s.p - 0.5) / 0.5;
        half(ctx, s.b, false, x, y, w, h, fs, k, 0.45 * (1 - k), ga);
      }
    }
    // two tiny hinge pins at the ends of the split
    ctx.fillStyle = C.muted;
    const py = y + h / 2 - 3 * u;
    ctx.fillRect(x - 1 * u, py, 2.5 * u, 6 * u);
    ctx.fillRect(x + w - 1.5 * u, py, 2.5 * u, 6 * u);
  };

  // ---- the housing: a thin muted frame, the printed header, column heads, the flap clock
  const mark = (ctx: Ctx, x: number, y: number, s: number) => {
    // the Oriel mark: an arched window with an amber dot resting in it
    const w = s * 0.72,
      lw = s * 0.1,
      l = x - w / 2,
      r = x + w / 2,
      top = y - s / 2,
      bot = y + s / 2,
      rad = w / 2;
    ctx.save();
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = lw;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(l, bot);
    ctx.lineTo(l, top + rad);
    ctx.arc(x, top + rad, rad, Math.PI, 0);
    ctx.lineTo(r, bot);
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = C.accent;
    ctx.beginPath();
    ctx.arc(x, y + s * 0.14, s * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  const CLK = { w: 34 * u, h: 50 * u, pitch: 38 * u, fs: 34 * u },
    clockX = right - 4 * CLK.pitch - CLK.w,
    clockY = G.headerY - 38 * u;
  const heads: [string, number][] = tall
    ? [
        ["TIME", 0],
        ["MEETING", 6],
      ]
    : [
        ["TIME", 0],
        ["MEETING", 6],
        ["ROOM", 20],
        ["STATUS", 23],
      ];
  const housing = (ctx: Ctx, F: number, wide: boolean) => {
    const a = ease.outCubic(prog(F, 4, 34));
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.strokeStyle = C.muted;
    ctx.lineWidth = 1.5 * u;
    ctx.beginPath();
    ctx.roundRect(left - 34 * u, G.frameTop, boardW + 68 * u, G.frameBot - G.frameTop, 10 * u);
    ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(0, (1 - a) * 10 * u);
    if (wide) mark(ctx, left + 16 * u, G.headerY - 12 * u, 34 * u);
    if (wide)
      text(ctx, "Departures", left + 46 * u, G.headerY, {
        size: 34 * u,
        family: F_.sans,
        weight: 600,
        color: C.ink,
        track: -0.01,
      });
    for (const [s, c] of heads)
      text(ctx, s, colX(c) + 2 * u, G.headsY, {
        size: 22 * u,
        family: F_.sans,
        weight: 600,
        color: C.muted,
        track: 0.12,
      });
    ctx.restore();
    // the clock's colon blinks at 1 Hz once it has landed
    if (wide)
      clock.forEach((c, i) => {
        const ga = i === 2 && F >= T.day && phase(F, FPS) >= 0.5 ? 0.18 : 1;
        drawCell(ctx, c, F, clockX + i * CLK.pitch, clockY, CLK.w, CLK.h, CLK.fs, ga);
      });
  };

  // ---- lamps: one per meeting, beside its status; BOARDING blinks at 1 Hz
  const lamp = (ctx: Ctx, F: number, m: number) => {
    const cells = statusCells(m),
      row = tall ? 2 * m + 1 : m,
      y = G.rowsY[row]! + G.chH / 2,
      x = right + 17 * u;
    let tone = -1;
    if (cells.every((c) => !flipping(c, F))) tone = Math.max(...cells.map((c) => stateAt(c, F).a.t));
    const lit = tone === 1 ? (phase(F, FPS) < 0.5 ? 1 : 0) : tone > 1 ? 1 : 0;
    ctx.beginPath();
    ctx.arc(x, y, 6 * u, 0, Math.PI * 2);
    ctx.fillStyle = lit ? TONE[tone]! : C.line;
    ctx.fill();
    if (!lit) {
      ctx.strokeStyle = C.muted;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 1.2 * u;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  };

  // ---- the message row: appears under the board; its trailing dots cycle while Oriel looks
  const msgAlpha = (F: number) => ease.outCubic(prog(F, T.works - 24, T.works));
  const dots = (ctx: Ctx, F: number) => {
    if (F < msg1Land || F >= T.works + 186) return;
    const n = 1 + (Math.floor((F - msg1Land) / 15) % 3),
      first = tall ? 13 : 25;
    for (let i = 0; i < n; i++) {
      const x = colX(first + i) + G.cw / 2,
        y = G.msgY + G.chH / 2 + G.fs * 0.362 - 5 * u;
      ctx.beginPath();
      ctx.arc(x, y, 5.5 * u, 0, Math.PI * 2);
      ctx.fillStyle = C.accent;
      ctx.fill();
    }
  };

  // ---- printed lines under the board: a typed ticker, then the sign-off
  const typed = (ctx: Ctx, F: number, s: string, at: number, out: number, dotColor: string) => {
    if (F < at || F >= out + 12) return;
    const n = Math.min(s.length, Math.floor((F - at) / 2)),
      a = 1 - prog(F, out, out + 12);
    const o = { size: 46 * u, family: F_.sans, weight: 500, color: C.ink, alpha: a },
      x = left + 34 * u;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = dotColor;
    ctx.fillRect(left, G.tickerY - 30 * u, 18 * u, 18 * u);
    ctx.restore();
    const w = text(ctx, s.slice(0, n), x, G.tickerY, o);
    if (n < s.length || phase(F, 40) < 0.5) {
      ctx.fillStyle = C.ink;
      ctx.globalAlpha = a;
      ctx.fillRect(x + w + 5 * u, G.tickerY - 38 * u, 4 * u, 48 * u);
      ctx.globalAlpha = 1;
    }
  };
  const TK1 = 664,
    TK1_OUT = 884;
  const signOff = (ctx: Ctx, F: number) => {
    const a1 = ease.outCubic(prog(F, 1372, 1400));
    if (a1 > 0)
      text(ctx, "Find a time that works for everyone.", cx, G.endY + (1 - a1) * 14 * u, {
        size: 50 * u,
        family: F_.sans,
        weight: 600,
        color: C.ink,
        align: "center",
        alpha: a1,
        track: -0.01,
      });
  };

  const paint = (ctx: Ctx, env: Env, F: number) => {
    F = clamp(F, 0, N - 1);
    ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
    ctx.fillStyle = C.ground;
    ctx.fillRect(0, 0, W, H);
    // the camera: a framing per shot (cut on the beat), a slow push-in within each shot, and a kick on each hit
    let si = 0;
    while (si + 1 < SHOTS.length && F >= SHOTS[si + 1]![0]) si++;
    const [s0, kind] = SHOTS[si]!,
      s1 = SHOTS[si + 1]?.[0] ?? N,
      fr = FRAME[kind],
      rate = kind === "wide" ? Math.min(PUSH, WIDE_PUSH / (s1 - s0)) : PUSH;
    let z = fr.z * (1 + rate * (F - s0));
    for (const [h, a] of KICKS) if (F >= h) z *= 1 + a * Math.exp(-(F - h) / 7);
    ctx.translate(fr.ax, fr.ay);
    ctx.scale(z, z);
    ctx.translate(-fr.fx, -fr.fy);
    housing(ctx, F, kind === "wide");
    rows.forEach((r, i) => r.forEach((c, j) => drawCell(ctx, c, F, colX(j), G.rowsY[i]!, G.cw, G.chH, G.fs)));
    MEETINGS.forEach((_, m) => lamp(ctx, F, m));
    const ma = kind === "status" ? 0 : msgAlpha(F); // the status close-up never shows a sliver of the message row
    if (ma > 0) {
      ctx.save();
      ctx.globalAlpha = ma;
      msg.forEach((c, j) => drawCell(ctx, c, F, colX(j), G.msgY, G.cw, G.chH, G.fs));
      dots(ctx, F);
      ctx.restore();
    }
    typed(ctx, F, "Four meetings need a new time.", TK1, TK1_OUT, C.accent2);
    signOff(ctx, F);
  };

  const cuts = [T.power, T.day, T.trouble, T.works, T.booked, T.end, N],
    names = ["power", "day", "trouble", "works", "booked", "end"];
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
      drop: T.trouble,
      hits: [CUE.firstDelayed, CUE.booked],
      whooshes: [T.booked],
      ticks,
      sign: CUE.sign,
    }),
  };
}

export const splitFlap = make("landscape", "splitFlap");
export const splitFlapVertical = make("vertical", "splitFlapVertical");
