// STUDY 45 · TERMINAL BOOT (24 s, 30 fps, 120 bpm). A green-phosphor CRT boots and books a meeting from the command
// line for the fictional Oriel: power-on, a boot log, a typed command with a progress bar, a character-cell week
// whose scan column finds the one slot free for all four, the booking confirmed line by line, and a glowing sign-off.
// Brief: series/studies/briefs/terminal-boot.json · prompt: series/studies/prompts/terminal-boot.prompt.md
//
// Everything sits on a strict character grid (JetBrains Mono, advance 0.6 em, rows 1.13 em), scaled up from the
// brief's 30 px so the key lines read on a phone: 40 × 12 cells of 66 px type (landscape), 30 × 23 of 50 px (vertical). The screen is
// painted into one offscreen layer, then these closed-form passes make flat text read as light on glass:
//   glow        each run stroked wide and faint, then narrower, then filled (no blur filter, no shadowBlur)
//   persistence the screen as it was two frames earlier, drawn first at 25% (fills only)
//   scanlines   1 px ground lines every 3 px, plus a brighter refresh band rolling down every 90 frames
//   curvature   the layer redrawn in 8 px strips whose width falls off 3% toward top and bottom, then a vignette
//   flicker     brightness 0.96–1.0 from a hash of the frame number
// The font is subset to Latin, so no box-drawing, block or tick glyph is ever typed: frames, bars, busy cells and the
// cursor are strokes and rects snapped to cells; ticks are the word "ok".
import PACK from "../../../brand/packs/studio/pack.json";
import type { Ctx, Env, Layer } from "../core";
import { rng } from "../core";
import type { Film, Shot } from "../film";
import { clamp, ease, lerp, prog, spring } from "../kit/motion";
import { usePack } from "../kit/pack";
import { beatScore } from "../kit/score";
import { layout, type Size } from "../kit/sizes";

const P = usePack(PACK),
  C = P.palette("terminal"),
  MONO = P.face.mono;
const FPS = 30,
  BPM = 120,
  N = 720,
  BEAT = 15; // frames per beat; a bar is 60
// the timeline, in frames (every cut on a beat)
const T = { boot: 60, command: 180, week: 330, booked: 480, end: 600 };

// ---- the boot log: one line per half-beat after a beat on the banner
type Run = [string, "ink" | "accent" | "accent2"];
const BOOT: { at: number; runs: Run[] }[] = [
  { at: 60, runs: [["ORIEL/TTY 0.9", "ink"]] },
  {
    at: 90,
    runs: [
      ["[", "ink"],
      [" ok ", "accent"],
      ["] calendars mounted: 4", "ink"],
    ],
  },
  {
    at: 97.5,
    runs: [
      ["[", "ink"],
      [" ok ", "accent"],
      ["] time zones: 3", "ink"],
    ],
  },
  {
    at: 105,
    runs: [
      ["[", "ink"],
      [" ok ", "accent"],
      ["] working hours loaded", "ink"],
    ],
  },
  { at: 112.5, runs: [["[warn] kai: out Friday", "accent2"]] },
  {
    at: 120,
    runs: [
      ["[", "ink"],
      [" ok ", "accent"],
      ["] ready", "ink"],
    ],
  },
];
const PROMPT_AT = 150; // with a scroll snap, halfway between the banner (30) and Enter (285)

// ---- the command, typed at a seeded human cadence (2–4 frames a key, a longer pause before each flag and the
// quote, and a Tab that completes "--ev" to "--everyone "). Enter lands on frame 285.
const CMD = 'oriel book --everyone --len 45m "design review"';
const ENTER = 285;
type Key = { at: number; upto: number };
const KEYS: Key[] = (() => {
  const tabFrom = CMD.indexOf("--everyone") + 4,
    tabTo = CMD.indexOf("--len");
  for (let seed = 1; seed < 1000; seed++) {
    const r = rng(seed * 7919 + 45),
      rel: Key[] = [];
    let t = 0,
      i = 0;
    while (i < CMD.length) {
      const flag = CMD.startsWith("--", i) || CMD[i] === '"';
      if (rel.length) {
        const x = r();
        t += flag ? 5 : x < 0.72 ? 2 : x < 0.95 ? 3 : 4;
      }
      if (i === tabFrom) {
        i = tabTo; // Tab: the shell completes the flag and its trailing space
        rel.push({ at: t, upto: i });
        continue;
      }
      i++;
      rel.push({ at: t, upto: i });
    }
    const start = ENTER - 4 - t;
    if (start >= 181 && start <= 186) return rel.map((k) => ({ at: k.at + start, upto: k.upto }));
  }
  throw new Error("terminalBoot: no typing schedule lands Enter on frame 285");
})();
const typedAt = (F: number) => {
  let upto = 0,
    last = -1;
  for (const k of KEYS)
    if (F >= k.at) {
      upto = k.upto;
      last = k.at;
    }
  return { upto, last };
};

// ---- the week: 4 people × 5 days × 6 hourly slots (10:00–15:00, the working hours the three time zones share).
// '#' busy. Kai is out Friday; the only slot free for all four is Thu 14:00; 26 busy blocks in all.
const PEOPLE = ["ana", "kai", "mo", "lee"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const BUSY: string[][] = [
  // Mon       Tue       Wed       Thu       Fri
  ["##..##", ".##...", "....##", "##....", ".##..."], // ana
  ["..##..", "#....#", ".#....", "..##.#", "######"], // kai
  ["...#..", "...##.", "#.#...", "#....#", "....#."], // mo
  ["#.....", "......", "...##.", ".#.#..", "#...#."], // lee
];
const busy = (p: number, d: number, s: number) => BUSY[p]![d]![s] === "#";
const runsOf = (p: number, d: number) => {
  const out: [number, number][] = [];
  for (let s = 0; s < 6; s++)
    if (busy(p, d, s) && (s === 0 || !busy(p, d, s - 1))) {
      let e = s;
      while (e + 1 < 6 && busy(p, d, e + 1)) e++;
      out.push([s, e]);
    }
  return out;
};
const FOUND = { d: 3, s: 4 }; // Thu 14:00
{
  let blocks = 0;
  const free: number[] = [];
  for (let p = 0; p < 4; p++) for (let d = 0; d < 5; d++) blocks += runsOf(p, d).length;
  for (let d = 0; d < 5; d++)
    for (let s = 0; s < 6; s++) if (PEOPLE.every((_, p) => !busy(p, d, s))) free.push(d * 6 + s);
  if (blocks !== 26 || free.length !== 1 || free[0] !== FOUND.d * 6 + FOUND.s || BUSY[1]![4] !== "######")
    throw new Error(`terminalBoot: the week data contradicts its copy (${blocks} blocks, free ${free.join(",")})`);
}
const SCAN_AT = 366,
  SCAN_STEP = 3,
  SCAN_N = FOUND.d * 6 + FOUND.s; // steps to reach the free slot
const FOUND_AT = SCAN_AT + SCAN_N * SCAN_STEP + 3; // 435: the column flips to accent

// ---- after the week: the booking lines
const OKS = [510, 525, 540, 555];

// a stable hash of a whole frame number, 0..1
const hash = (n: number) => {
  let x = Math.imul((n | 0) ^ 0x9e3779b9, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
};
// the block cursor: on 8 frames, off 7 (one beat), counted from `since`
const blink = (F: number, since: number) => Math.floor(F - since) % BEAT < 8;

// ---- the ORIEL banner: a 5×7 cell font drawn as rects (the font has no block glyphs); each pixel is one column wide
// and half a row tall, so the letters are square-pixelled. It slams in on the beat at frame 30, top row first.
const GLYPHS: Record<string, string[]> = {
  O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  I: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "#####"],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
};
const BANNER_AT = 30;

export function make(size: Size, id: string): Film {
  const L = layout(size),
    { W, H, u, cx, tall } = L;
  // ---- the character grid, per size. The brief's 80 × 26 grid of 30 px type was about 8 px on a phone, so the
  // cells are scaled up (Z) until the key lines read at 360 px wide: 40 × 12 cells of 66 px type in the landscape,
  // 30 × 23 cells of 50 px type in the vertical. The buffer scrolls (a pure function of F) to keep them on the glass.
  const Z = tall ? 1.66 : 2.2,
    COLS = tall ? 30 : 40,
    ROWS = tall ? 23 : 12,
    cw = 18 * Z * u,
    rh = 34 * Z * u,
    TYPE = 30 * Z * u,
    BASE = 25 * Z * u, // baseline inside a row
    gcy = tall ? (L.safe.top + H - L.safe.bottom) / 2 : H / 2,
    gx0 = cx - (COLS / 2) * cw,
    gy0 = gcy - (ROWS / 2) * rh;
  // the screen: a rounded rect around the grid, inside a flat bezel
  const pad = tall ? { x: 60 * u, y: 90 * u } : { x: 70 * u, y: 50 * u };
  const SX = gx0 - pad.x,
    SY = gy0 - pad.y,
    SW = COLS * cw + 2 * pad.x,
    SH = ROWS * rh + 2 * pad.y,
    RAD = 40 * u;
  // `top` is the scroll offset in rows, set per frame by content()
  let top = 0;
  const X = (col: number) => gx0 + col * cw,
    Y = (row: number) => gy0 + (row - top) * rh,
    MX = (col: number) => X(col) + cw / 2,
    MY = (row: number) => Y(row) + rh / 2;
  // rows of the main buffer (absolute, before scrolling), per size
  const R = tall
    ? { log: 5, cmd: 12, cmd2: 13, read: 15, bar: 16, busy: 17, booked: 19, booked2: 20, oks: 22, acc: 27, again: 29 }
    : { log: 5, cmd: 12, cmd2: 13, read: 14, bar: 15, busy: 16, booked: 18, booked2: 18, oks: 20, acc: 25, again: 27 };
  // the scroll: [from frame, top row], each a 3-frame snap on a beat. The vertical centres the boot block first.
  const SCROLL: [number, number][] = tall
    ? [
        [0, -6],
        [PROMPT_AT, -1],
        [T.booked, 7],
      ]
    : [
        [0, 0],
        [PROMPT_AT, 5],
        [T.booked, 12],
        [570, 16],
      ];
  const scrollAt = (F: number) => {
    let v = SCROLL[0]![1];
    for (let i = 1; i < SCROLL.length; i++) {
      const [at, to] = SCROLL[i]!;
      if (F >= at) v = lerp(v, to, ease.outCubic(prog(F, at, at + 3)));
    }
    return v;
  };
  const colour = (k: Run[1]) => C[k]!;

  // ---- drawing on the grid. `ghost` is set for the persistence pass: fills only, at 25%.
  let ghost = false;
  const font = (px: number) => `500 ${px}px "${MONO}"`;
  const put = (ctx: Ctx, s: string, col: number, row: number, color: string = C.ink, px = TYPE) => {
    if (!s) return;
    const x = X(col),
      y = Y(row) + BASE,
      adv = px * 0.6; // JetBrains Mono's advance: 600/1000 em
    // glyph by glyph on the grid: no ligatures ("--" stays two hyphens), every character in its own cell
    const each = (f: (c: string, x: number) => void) => {
      for (let i = 0; i < s.length; i++) if (s[i] !== " ") f(s[i]!, x + i * adv);
    };
    ctx.font = font(px);
    (ctx as Ctx & { letterSpacing: string }).letterSpacing = "0px";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    if (ghost) {
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = color;
      each((c, cx) => ctx.fillText(c, cx, y));
      ctx.globalAlpha = 1;
      return;
    }
    const k = Math.sqrt(px / (30 * u)),
      glow = color === C.accent2 ? C.accent2 : C.accent;
    ctx.lineJoin = "round";
    ctx.strokeStyle = glow;
    ctx.globalAlpha = 0.06;
    ctx.lineWidth = 8 * u * k;
    each((c, cx) => ctx.strokeText(c, cx, y));
    ctx.globalAlpha = 0.15;
    ctx.lineWidth = 3 * u * k;
    each((c, cx) => ctx.strokeText(c, cx, y));
    ctx.globalAlpha = 1;
    ctx.fillStyle = color;
    each((c, cx) => ctx.fillText(c, cx, y));
  };
  // several coloured runs on one row, `n` characters of them shown
  const runs = (ctx: Ctx, rs: Run[], col: number, row: number, n = Infinity) => {
    let c = col,
      left = n;
    for (const [s, k] of rs) {
      if (left <= 0) break;
      put(ctx, s.slice(0, left), c, row, colour(k));
      c += s.length;
      left -= s.length;
    }
  };
  // a filled rect with phosphor glow around it
  const block = (ctx: Ctx, x: number, y: number, w: number, h: number, color: string = C.ink, glow = true) => {
    if (!ghost && glow) {
      ctx.strokeStyle = C.accent;
      ctx.lineJoin = "round";
      ctx.globalAlpha = 0.06;
      ctx.lineWidth = 8 * u;
      ctx.strokeRect(x, y, w, h);
      ctx.globalAlpha = 0.15;
      ctx.lineWidth = 3 * u;
      ctx.strokeRect(x, y, w, h);
    }
    ctx.globalAlpha = ghost ? 0.25 : 1;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = 1;
  };
  // ░ ▒ ▓ as 1 px vertical stripes: every 4th px, every 2nd, or 2 of every 3
  const shade = (
    ctx: Ctx,
    x: number,
    y: number,
    w: number,
    h: number,
    level: 1 | 2 | 3,
    color: string,
    glow = true,
  ) => {
    if (!ghost && glow) {
      ctx.strokeStyle = C.accent;
      ctx.globalAlpha = 0.05;
      ctx.lineWidth = 8 * u;
      ctx.strokeRect(x, y, w, h);
      ctx.globalAlpha = 0.12;
      ctx.lineWidth = 3 * u;
      ctx.strokeRect(x, y, w, h);
    }
    ctx.globalAlpha = ghost ? 0.25 : 1;
    ctx.fillStyle = color;
    const n = Math.floor(w / u);
    for (let i = 0; i < n; i++)
      if (level === 1 ? i % 4 === 0 : level === 2 ? i % 2 === 0 : i % 3 !== 2) ctx.fillRect(x + i * u, y, u, h);
    ctx.globalAlpha = 1;
  };
  // a 2 px line with glow (box edges run through cell centres)
  const rule = (ctx: Ctx, x1: number, y1: number, x2: number, y2: number, color: string = C.ink) => {
    const pass = (c: string, a: number, w: number) => {
      ctx.strokeStyle = c;
      ctx.globalAlpha = a;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    };
    ctx.lineCap = "square";
    if (ghost) pass(color, 0.25, 2 * u);
    else {
      pass(C.accent, 0.06, 8 * u);
      pass(C.accent, 0.15, 3 * u);
      pass(color, 1, 2 * u);
    }
    ctx.globalAlpha = 1;
    ctx.lineCap = "butt";
  };
  const cursor = (ctx: Ctx, col: number, row: number) => block(ctx, X(col), Y(row), cw, rh);
  // a line printed by the machine: it slides up into its row from half a row below (a scroll-in)
  const slide = (F: number, at: number) => 0.55 * (1 - ease.outCubic(prog(F, at, at + 5)));

  // ---- the banner, centred on the grid in rows 0–3.5, revealed a pixel row per frame like the beam painting it
  const BC = Math.round((COLS - 29) / 2);
  const banner = (ctx: Ctx, F: number) => {
    const shown = Math.floor((F - BANNER_AT) * 1.4) + 1,
      ph = rh / 2,
      rects: [number, number][] = [];
    "ORIEL".split("").forEach((ch, i) =>
      GLYPHS[ch]!.forEach((line, py) => {
        if (py >= shown) return;
        for (let px = 0; px < 5; px++) if (line[px] === "#") rects.push([X(BC + i * 6 + px), Y(0) + py * ph]);
      }),
    );
    const w = cw - 3 * u,
      h = ph - 3 * u;
    if (!ghost) {
      ctx.strokeStyle = C.accent;
      ctx.lineJoin = "round";
      for (const [lw, a] of [
        [10 * u, 0.06],
        [4 * u, 0.15],
      ] as const) {
        ctx.globalAlpha = a;
        ctx.lineWidth = lw;
        for (const [x, y] of rects) ctx.strokeRect(x, y, w, h);
      }
    }
    ctx.globalAlpha = ghost ? 0.25 : 1;
    ctx.fillStyle = C.accent;
    for (const [x, y] of rects) ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = 1;
  };

  // ---- the main buffer: banner, boot log, prompt, command, output, booking
  const mainBuffer = (ctx: Ctx, F: number) => {
    if (F >= BANNER_AT) banner(ctx, F);
    if (F < T.boot) {
      // the cursor blinks where the banner will land, then under it where the log will start
      const pre = F < BANNER_AT,
        since = pre ? 14 : 36;
      if (F >= since && blink(F, since) && F < T.boot - 1) cursor(ctx, pre ? BC : 0, pre ? 0 : R.log);
      return;
    }
    for (let i = 0; i < BOOT.length; i++) {
      const b = BOOT[i]!;
      if (F >= b.at) runs(ctx, b.runs, 0, R.log + i + slide(F, b.at));
    }
    if (F < PROMPT_AT) return;
    const { upto, last } = typedAt(F),
      entered = F >= ENTER;
    put(ctx, "~ $", 0, R.cmd, C.accent);
    // the command breaks after "--everyone" onto an indented second line, so each half reads at phone size
    const split = CMD.indexOf("--len"),
      typed = CMD.slice(0, upto);
    let curCol = 4 + upto,
      curRow = R.cmd;
    if (upto > split - 1) {
      put(ctx, CMD.slice(0, split - 1), 4, R.cmd);
      put(ctx, typed.slice(split), 4, R.cmd2);
      curCol = 4 + Math.max(0, upto - split);
      curRow = R.cmd2;
    } else put(ctx, typed, 4, R.cmd);
    if (!entered) {
      const since = last >= 0 ? last : PROMPT_AT;
      if (last >= 0 && F - last < 8) cursor(ctx, curCol, curRow);
      else if (blink(F, since)) cursor(ctx, curCol, curRow);
      return;
    }
    // output: reading, a drawn progress bar, the count
    const READ = ENTER + 3,
      BAR0 = ENTER + 5,
      BAR1 = ENTER + 23,
      COUNT = ENTER + 27;
    if (F >= READ) put(ctx, "reading 4 calendars", 0, R.read + slide(F, READ));
    if (F >= BAR0) {
      const cells = tall ? 23 : 30,
        n = Math.floor(ease.inOutCubic(prog(F, BAR0, BAR1)) * cells),
        by = Y(R.bar) + 5 * u,
        bh = rh - 10 * u;
      put(ctx, "[", 0, R.bar);
      put(ctx, "]", cells + 1, R.bar);
      for (let i = 0; i < cells; i++) {
        const x = X(1 + i);
        if (i < n) block(ctx, x, by, cw, bh, C.ink, false);
        else shade(ctx, x, by, cw, bh, 1, C.muted, false);
      }
      if (n > 0 && !ghost) {
        // one glow around the filled run, not one per cell
        ctx.strokeStyle = C.accent;
        ctx.globalAlpha = 0.06;
        ctx.lineWidth = 8 * u;
        ctx.strokeRect(X(1), by, n * cw, bh);
        ctx.globalAlpha = 0.15;
        ctx.lineWidth = 3 * u;
        ctx.strokeRect(X(1), by, n * cw, bh);
        ctx.globalAlpha = 1;
      }
      const pct = `${Math.round((n / cells) * 100)}%`;
      put(ctx, pct.padStart(4), cells + 3, R.bar, n === cells ? C.accent : C.ink);
    }
    if (F >= COUNT) put(ctx, "26 busy blocks · 3 time zones", 0, R.busy + slide(F, COUNT));
    if (F < T.booked) return;
    // the booking, after the week closes (the vertical wraps the title onto the next row)
    const B0 = T.booked + 14,
      head = "booked  Thu 14:00–14:45",
      tail = "design review",
      n = Math.floor((F - B0) * 3);
    if (n > 0)
      runs(
        ctx,
        [
          ["booked", "accent"],
          [head.slice(6), "ink"],
        ],
        0,
        R.booked,
        n,
      );
    const tn = n - head.length - 2;
    if (tn > 0) put(ctx, tail.slice(0, tn), tall ? 8 : head.length + 2, R.booked2);
    OKS.forEach((at, i) => {
      if (F >= at) put(ctx, `${PEOPLE[i]!.padEnd(3)} ok`, 0, R.oks + i + slide(F, at), C.accent);
    });
    const ACC = 570,
      m = Math.floor((F - ACC) * 3);
    if (m > 0)
      runs(
        ctx,
        [
          ["4/4", "accent"],
          [" accepted · invites sent", "ink"],
        ],
        0,
        R.acc,
        m,
      );
    const AGAIN = 585;
    if (F >= AGAIN) {
      put(ctx, "~ $", 0, R.again, C.accent);
      if (blink(F, AGAIN)) cursor(ctx, 4, R.again);
    }
  };

  // ---- the week, a full-screen character-cell app (the terminal's alternate screen)
  // landscape: people as rows, each day a group of six one-column hour slots · vertical: transposed, days as blocks
  // of six half-row slots, the four people as columns
  const WK = tall ? { c0: 0, c1: 29, r0: 1, r1: 18 } : { c0: 0, c1: 39, r0: 0, r1: 9 };
  const slotCol = (d: number, s: number) => 5 + d * 7 + s, // landscape
    slotY = (k: number) => Y(3) + (k * rh) / 2; // vertical, k = d * 6 + s
  // the cell rect of (person, day, slot run s0..s1)
  const cellRect = (p: number, d: number, s0: number, s1: number) => {
    if (tall) {
      const y0 = slotY(d * 6 + s0),
        y1 = slotY(d * 6 + s1 + 1);
      return { x: X(8 + p * 5) + 2 * u, y: y0 + 2 * u, w: 4 * cw - 4 * u, h: y1 - y0 - 4 * u };
    }
    const c0 = slotCol(d, s0),
      c1 = slotCol(d, s1) + 1,
      r = 2 + p * 2;
    return { x: X(c0) + 2 * u, y: Y(r) + 4 * u, w: (c1 - c0) * cw - 4 * u, h: rh - 8 * u };
  };
  // the scan's band for step k (0..29): a column in landscape, a row in the vertical
  const scanRect = (k: number) => {
    if (tall) return { x: X(7), y: slotY(k), w: X(28) - X(7), h: rh / 2 };
    const c = slotCol(Math.floor(k / 6), k % 6);
    return { x: X(c), y: Y(2), w: cw, h: Y(9) - Y(2) };
  };
  const weekApp = (ctx: Ctx, F: number) => {
    // open: the box grows out of its centre line with a little overshoot · close: it folds back to a line
    const open = F < T.booked ? spring((F - T.week) / FPS, { freq: 2.6, damp: 0.55 }) : 0,
      fold = ease.inCubic(prog(F, T.booked, T.booked + 7)),
      shrink = ease.inCubic(prog(F, T.booked + 7, T.booked + 11)),
      k = F < T.booked ? open : 1 - fold;
    if (F >= T.booked + 11) return;
    const midY = (MY(WK.r0) + MY(WK.r1)) / 2,
      top_ = lerp(midY, MY(WK.r0), k),
      bot = lerp(midY, MY(WK.r1), k),
      midX = (MX(WK.c0) + MX(WK.c1)) / 2,
      left = lerp(MX(WK.c0), midX, shrink),
      right = lerp(MX(WK.c1), midX, shrink);
    const title = "WEEK 14",
      live = F < T.booked && F >= T.week + 6;
    // the frame
    if (live) {
      rule(ctx, left, top_, X(WK.c0 + 2), top_);
      rule(ctx, X(WK.c0 + 3 + title.length + 1), top_, right, top_);
      put(ctx, title, WK.c0 + 3, WK.r0, C.accent);
    } else rule(ctx, left, top_, right, top_);
    rule(ctx, left, bot, right, bot);
    if (k > 0.02 && shrink === 0) {
      rule(ctx, left, top_, left, bot);
      rule(ctx, right, top_, right, bot);
    }
    if (!live) return;
    // headers and the muted rules between days
    const H0 = T.week + 7;
    ctx.fillStyle = C.muted;
    ctx.globalAlpha = ghost ? 0.25 : 0.8;
    for (let d = 1; d < 5; d++)
      if (tall) ctx.fillRect(X(1), slotY(d * 6) - u, X(28) - X(1), 2 * u);
      else ctx.fillRect(MX(slotCol(d, 0) - 1) - u, Y(1) + 8 * u, 2 * u, Y(9) - Y(1) - 8 * u);
    ctx.globalAlpha = 1;
    if (tall) {
      PEOPLE.forEach((nm, p) => F >= H0 + p && put(ctx, nm, 8 + p * 5, WK.r0 + 1));
      DAYS.forEach((dn, d) => F >= H0 + 1 + d && put(ctx, dn, 1, 3 + d * 3));
    } else {
      DAYS.forEach((dn, d) => F >= H0 + d && put(ctx, dn, slotCol(d, 0) + 1, WK.r0 + 1));
      PEOPLE.forEach((nm, p) => F >= H0 + 2 + p && put(ctx, nm, 1, 2 + p * 2));
    }
    // the cells fill in, a column (landscape) or a row (vertical) at a time; free cells are a small muted dot
    const FILL = T.week + 9;
    const shown = (d: number, s: number) => F >= FILL + (d * 6 + s) * 0.7;
    for (let d = 0; d < 5; d++)
      for (let s = 0; s < 6; s++) {
        if (!shown(d, s)) continue;
        for (let p = 0; p < 4; p++)
          if (!busy(p, d, s)) {
            const c = cellRect(p, d, s, s);
            ctx.fillStyle = C.muted;
            ctx.globalAlpha = ghost ? 0.25 : 1;
            ctx.fillRect(c.x + c.w / 2 - 3 * u, c.y + c.h / 2 - 3 * u, 6 * u, 6 * u);
            ctx.globalAlpha = 1;
          }
      }
    for (let p = 0; p < 4; p++)
      for (let d = 0; d < 5; d++)
        for (const [s0, s1] of runsOf(p, d)) {
          // a run appears as far as the fill has reached
          let e = s0 - 1;
          while (e < s1 && shown(d, e + 1)) e++;
          if (e < s0) continue;
          const c = cellRect(p, d, s0, e);
          shade(ctx, c.x, c.y, c.w, c.h, 3, C.ink);
        }
    // the scan: an inverse-video column (a row, in the vertical) stepping through the week
    if (F >= SCAN_AT) {
      const step = Math.min(SCAN_N, Math.floor((F - SCAN_AT) / SCAN_STEP)),
        found = F >= FOUND_AT,
        d = Math.floor(step / 6),
        s = step % 6,
        r = scanRect(step);
      block(ctx, r.x, r.y, r.w, r.h, found ? C.accent : C.ink);
      // inverse video: what was light is now dark
      for (let p = 0; p < 4; p++)
        if (busy(p, d, s)) {
          const c = cellRect(p, d, s, s);
          shade(ctx, c.x, c.y, c.w, c.h, 3, C.ground, false);
        }
      if (found) {
        const a = ease.outCubic(prog(F, FOUND_AT, FOUND_AT + 6)),
          msg = "Thu 14:00 · everyone free",
          n = Math.floor((F - FOUND_AT - 3) * 3);
        if (tall) {
          // the hour beside the band, and a drawn arrow from it into the band
          const y = r.y + r.h / 2;
          put(ctx, "14:00", 1, 3 + (SCAN_N + 0.5) / 2 - 0.41, C.accent);
          arrow(ctx, X(6) + 4 * u, y, X(6) + lerp(4, cw / u + 2, a) * u, y, a);
          put(ctx, msg.slice(0, Math.max(0, n)), Math.round((COLS - msg.length) / 2), WK.r1 + 2, C.accent);
        } else {
          const x = r.x + r.w / 2,
            y0 = Y(9) + 6 * u;
          arrow(ctx, x, y0 + lerp(10, rh / u - 4, a) * u, x, y0, a);
          put(ctx, msg.slice(0, Math.max(0, n)), COLS - 1 - msg.length, WK.r1 + 1, C.accent);
        }
      }
    }
    // the status line: inverse video along the bottom row
    const st =
        F >= FOUND_AT
          ? "1 slot free"
          : F >= SCAN_AT
            ? `scanning ${Math.min(SCAN_N, Math.floor((F - SCAN_AT) / SCAN_STEP)) + 1}/30`
            : "loading",
      sa = T.week + 8;
    if (F >= sa) {
      block(ctx, X(0), Y(ROWS - 1), COLS * cw, rh, C.ink);
      put(ctx, "oriel week", 1, ROWS - 1, C.ground);
      put(ctx, st, COLS - 1 - st.length, ROWS - 1, C.ground);
    }
  };
  const arrow = (ctx: Ctx, x1: number, y1: number, x2: number, y2: number, a: number) => {
    // a stem from (x1, y1) to the head at (x2, y2)
    if (a <= 0) return;
    const ang = Math.atan2(y2 - y1, x2 - x1),
      hl = 14 * u;
    rule(ctx, x1, y1, x2, y2, C.accent);
    rule(ctx, x2, y2, x2 - hl * Math.cos(ang - 0.6), y2 - hl * Math.sin(ang - 0.6), C.accent);
    rule(ctx, x2, y2, x2 - hl * Math.cos(ang + 0.6), y2 - hl * Math.sin(ang + 0.6), C.accent);
  };

  // ---- the sign-off: a large glowing name, its line, the address, and a fresh prompt
  const endScreen = (ctx: Ctx, F: number) => {
    const big = (tall ? 190 : 220) * u,
      name = P.product.toLowerCase(),
      nameCols = (name.length * big * 0.6) / cw,
      nc = COLS / 2 - nameCols / 2,
      nr = tall ? 9 : 4; // the row the big name's baseline sits in
    const typedN = Math.floor((F - (T.end + 3)) / 3) + 1;
    if (typedN > 0) put(ctx, name.slice(0, typedN), nc, nr, C.accent, big);
    const tag = tall ? ["find a time from", "the command line"] : ["find a time from the command line"],
      url = "oriel.example",
      t0 = T.end + 20,
      u0 = T.end + 34,
      AGAIN = T.end + 45;
    let tn = Math.floor((F - t0) * 3);
    tag.forEach((line, i) => {
      if (tn > 0) put(ctx, line.slice(0, tn), Math.round(COLS / 2 - line.length / 2), nr + 2 + i);
      tn -= line.length + 1;
    });
    const ur = nr + 2 + tag.length,
      un = Math.floor((F - u0) * 2);
    if (un > 0) put(ctx, url.slice(0, un), Math.round(COLS / 2 - url.length / 2), ur, C.accent);
    if (F >= AGAIN) {
      const pc = Math.round(COLS / 2 - 2.5);
      put(ctx, "~ $", pc, ur + 2, C.accent);
      if (blink(F, AGAIN)) cursor(ctx, pc + 4, ur + 2);
    }
  };

  // ---- everything the phosphor shows at frame F. The main buffer is clipped to the grid's rows, so scrolled-off
  // lines leave the glass instead of painting into its margin.
  const content = (ctx: Ctx, F: number) => {
    if (F < 0) return;
    if (F < T.week || (F >= T.booked + 11 && F < T.end)) {
      top = scrollAt(F);
      ctx.save();
      ctx.beginPath();
      ctx.rect(SX, gy0 - 8 * u, SW, ROWS * rh + 16 * u);
      ctx.clip();
      mainBuffer(ctx, F);
      ctx.restore();
    } else {
      top = 0;
      if (F < T.end) weekApp(ctx, F);
      else endScreen(ctx, F);
    }
  };

  // the camera: the monitor never moves; each section only drifts in a little and springs back at the next cut.
  // Every visible line stays inside layout().safe at the widest zoom.
  const KMAX = tall ? 1.015 : 1.025;
  const CUTS = [0, T.boot, T.week, T.booked, T.end];
  const camera = (F: number) => {
    let i = 0;
    while (i + 1 < CUTS.length && F >= CUTS[i + 1]!) i++;
    const at = CUTS[i]!,
      next = CUTS[i + 1] ?? N,
      now = lerp(1, KMAX, prog(F, at, next));
    if (i === 0) return now;
    return lerp(KMAX, now, spring((F - at) / FPS, { freq: 2.2, damp: 1 }));
  };
  const SURGES: [number, number][] = [
    [BANNER_AT, 0.16],
    [PROMPT_AT, 0.2],
    [FOUND_AT, 0.2],
    [ENTER, 0.2],
    [T.week, 0.22],
    [T.booked, 0.22],
    [T.end, 0.22],
  ];

  const layerOf = (env: Env): Layer => {
    const w = Math.round(SW * env.scale),
      h = Math.round(SH * env.scale),
      key = `terminalBoot:${id}:${w}x${h}`;
    let lay = env.cache.get(key) as Layer | undefined;
    if (!lay) {
      lay = env.canvas(w, h);
      env.cache.set(key, lay);
    }
    return lay;
  };
  const screenPath = (ctx: Ctx) => {
    ctx.beginPath();
    ctx.roundRect(SX, SY, SW, SH, RAD);
  };

  const paint = (ctx: Ctx, env: Env, F: number) => {
    F = clamp(F, 0, N - 1);
    const sc = env.scale;
    ctx.setTransform(sc, 0, 0, sc, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    // the bezel, flat, with a power lamp
    ctx.fillStyle = C.surface;
    ctx.fillRect(0, 0, W, H);
    // the camera: a slow drift toward the glass, centred on the grid
    const k = camera(F);
    ctx.setTransform(sc * k, 0, 0, sc * k, sc * (cx - cx * k), sc * (gcy - gcy * k));
    const lampX = tall ? cx : SX + SW + (W - SX - SW) / 2,
      lampY = tall ? SY + SH + 60 * u : SY + SH - 40 * u;
    ctx.beginPath();
    ctx.arc(lampX, lampY, 6 * u, 0, Math.PI * 2);
    ctx.fillStyle = F < 1 ? C.line : C.accent;
    ctx.fill();

    // ---- the screen layer: phosphor content, persistence, overexposure, scanlines, refresh band
    const lay = layerOf(env),
      g = lay.ctx;
    g.setTransform(sc, 0, 0, sc, -SX * sc, -SY * sc);
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";
    g.fillStyle = C.ground;
    g.fillRect(SX, SY, SW, SH);
    if (F >= 2) {
      ghost = true;
      content(g, F - 2);
    }
    ghost = false;
    content(g, F);
    // overexposure: the power-on, then a short phosphor surge when the whole screen changes at once
    let over = F < 9 ? 0 : 0.92 * (1 - ease.outCubic(prog(F, 11, 30)));
    for (const [at, a] of SURGES) if (F >= at) over += a * (1 - ease.outCubic(prog(F, at, at + 9)));
    if (over > 0) {
      g.globalAlpha = over;
      g.fillStyle = C.ink;
      g.fillRect(SX, SY, SW, SH);
      g.globalAlpha = 1;
    }
    // the refresh band: a brighter strip rolling down every 90 frames, crisp where the beam is and decaying behind
    // it like phosphor (the crisp edge is also what keeps every hold visibly alive)
    // (its edge sweeps the full height of the glass every period, so no frame is without it)
    const bandH = 120 * u,
      edge = SY + ((F % 90) / 90) * SH;
    {
      const by = edge - 0.92 * bandH,
        grad = g.createLinearGradient(0, by, 0, by + bandH);
      grad.addColorStop(0, "rgba(214,255,217,0)");
      grad.addColorStop(0.92, "rgba(214,255,217,0.05)");
      grad.addColorStop(1, "rgba(214,255,217,0)");
      g.fillStyle = grad;
      g.fillRect(SX, by, SW, bandH);
    }
    // scanlines
    g.fillStyle = C.ground;
    g.globalAlpha = 0.18;
    for (let y = SY; y < SY + SH; y += 3 * u) g.fillRect(SX, y, SW, u);
    g.globalAlpha = 1;

    // ---- composite onto the glass: curvature by strips, the raster opening, vignette, flicker
    ctx.save();
    screenPath(ctx);
    ctx.clip();
    ctx.fillStyle = "#070a08";
    ctx.fillRect(SX, SY, SW, SH);
    // power-on: a dot, a line, then the raster opens vertically with an overshoot
    const vs = F < 9 ? 0 : F < 40 ? spring((F - 9) / FPS, { freq: 2.4, damp: 0.5 }) : 1;
    if (vs > 0) {
      const lw = lay.canvas.width,
        lh = lay.canvas.height,
        strip = Math.max(1, Math.round(8 * u * sc)),
        midY = SY + SH / 2;
      for (let y = 0; y < lh; y += strip) {
        const hgt = Math.min(strip, lh - y),
          d = (y + hgt / 2 - lh / 2) / (lh / 2),
          kx = 1 - 0.03 * d * d,
          dw = SW * kx;
        ctx.drawImage(
          lay.canvas,
          0,
          y,
          lw,
          hgt,
          SX + (SW - dw) / 2,
          midY + (y / sc - SH / 2) * vs,
          dw,
          (hgt / sc) * vs + 0.6 / sc,
        );
      }
    }
    const scx = SX + SW / 2,
      scy = SY + SH / 2;
    if (F < 12) {
      const lineW = ease.outCubic(prog(F, 2, 9)) * SW * 0.96;
      ctx.fillStyle = C.ink;
      if (F < 4) {
        const r = (4 + 6 * ease.outCubic(prog(F, 0, 3))) * u;
        const halo = ctx.createRadialGradient(scx, scy, 0, scx, scy, 90 * u);
        halo.addColorStop(0, "rgba(60,255,125,0.55)");
        halo.addColorStop(1, "rgba(60,255,125,0)");
        ctx.fillStyle = halo;
        ctx.fillRect(scx - 90 * u, scy - 90 * u, 180 * u, 180 * u);
        ctx.beginPath();
        ctx.arc(scx, scy, r, 0, Math.PI * 2);
        ctx.fillStyle = C.ink;
        ctx.fill();
      }
      if (F >= 2 && F < 11) {
        const hh = lerp(3, 10, prog(F, 7, 10)) * u,
          fade = 1 - prog(F, 9, 11);
        ctx.globalAlpha = fade;
        const hg = ctx.createLinearGradient(0, scy - 40 * u, 0, scy + 40 * u);
        hg.addColorStop(0, "rgba(60,255,125,0)");
        hg.addColorStop(0.5, "rgba(60,255,125,0.35)");
        hg.addColorStop(1, "rgba(60,255,125,0)");
        ctx.fillStyle = hg;
        ctx.fillRect(scx - lineW / 2, scy - 40 * u, lineW, 80 * u);
        ctx.fillStyle = C.ink;
        ctx.fillRect(scx - lineW / 2, scy - hh / 2, lineW, hh);
      }
      ctx.globalAlpha = 1;
    }
    // vignette: the corners of the glass fall away
    const rr = Math.hypot(SW, SH) / 2,
      vg = ctx.createRadialGradient(scx, scy, rr * 0.45, scx, scy, rr);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(0,0,0,0.55)");
    ctx.fillStyle = vg;
    ctx.fillRect(SX, SY, SW, SH);
    // flicker
    const b = 0.96 + 0.04 * hash(Math.floor(F) + 1);
    ctx.fillStyle = `rgba(0,0,0,${(1 - b).toFixed(4)})`;
    ctx.fillRect(SX, SY, SW, SH);
    ctx.restore();
    // the glass meets the bezel
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 3 * u;
    screenPath(ctx);
    ctx.stroke();
  };

  const cuts = [0, T.boot, T.command, T.week, T.booked, T.end, N],
    names = ["power", "boot", "command", "week", "booked", "end"];
  const shots: Shot[] = names.map((sid, i) => ({
    id: sid,
    start: cuts[i]!,
    end: cuts[i + 1]!,
    draw: (ctx, local, env) => paint(ctx, env, cuts[i]! + local),
  }));
  // sound: a hit as the banner lands, a tick per boot line, every second key, each scan step and each acceptance; hits on power, Enter and
  // booked; a whoosh into the week; the sign-off as the name settles
  const ticks = [
    ...BOOT.map((b) => Math.round(b.at)),
    ...KEYS.filter((_, i) => i % 2 === 1).map((k) => k.at),
    ...Array.from({ length: SCAN_N + 1 }, (_, k) => SCAN_AT + k * SCAN_STEP),
    ...OKS,
    PROMPT_AT, // the scroll snap
    ...(tall ? [] : [570]),
  ];
  return {
    meta: { title: id, W, H, fps: FPS, bpm: BPM, durationFrames: N, raster: "cpu" },
    assets: { images: {}, fonts: P.assets },
    shots,
    audio: beatScore({
      frames: N,
      fps: FPS,
      bpm: BPM,
      mood: "drive",
      drop: T.week,
      hits: [0, BANNER_AT, ENTER, T.booked],
      whooshes: [T.week],
      ticks,
      sign: 630,
      gain: 0.9,
    }),
  };
}

export const terminalBoot = make("landscape", "terminalBoot");
export const terminalBootVertical = make("vertical", "terminalBootVertical");
