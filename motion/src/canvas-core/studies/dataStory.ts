// STUDY 08 · DATA STORY (15 s, 30 fps, 120 bpm). A dark dashboard for a fictional scheduling assistant: a grid of
// rounded widgets on graphite, each animating its own data (a headline percentage, a bar chart that re-sorts, a
// switch, a line chart that draws on, a donut, a live blob). Numbers roll like odometers. Coral is the headline
// figure, mint is good news. One source, designed for landscape and vertical. Brand: the neutral pack.
// Brief: series/studies/briefs/data-story.json · prompt: series/studies/prompts/data-story.prompt.md
//
// The lesson: every figure tweens from the same clock as the shape that shows it (a bar and its label, the line's
// head and its readout, the donut's arc and its count). The whole film is one continuous function paint(F) of a
// (fractional) frame F; the shots only name the sections. All data is invented and fixed.
import PACK from "../../../brand/packs/studio/pack.json";
import type { Ctx, Env } from "../core";
import type { Film, Shot } from "../film";
import { motionBlur } from "../kit/blur";
import { clamp, ease, lerp, prog, spring } from "../kit/motion";
import { usePack } from "../kit/pack";
import { beatScore } from "../kit/score";
import { layout, type Size } from "../kit/sizes";
import { letters, measure, text, type TextOpts } from "../kit/type";
import { card, check, rr } from "../kit/ui";

const P = usePack(PACK),
  C = P.palette("graphite"),
  F_ = P.face;
const FPS = 30,
  BPM = 120,
  N = 450; // a beat is 15 frames, a bar 60
// the timeline, in frames (every cut on a beat; the brief's 400 moves to 390, the nearest beat that gives the
// sign-off two full bars)
const T = { count: 60, auto: 150, lines: 240, push: 330, sign: 390 };
// inside the beats (the clocks every figure and its shape share)
const K = {
  riseA: 62,
  riseB: 140, // headline 0 → 92 and the bars rise
  on: 165, // the switch
  sortA: 180,
  sortB: 225, // the re-sort and the headline 92 → 98 (a hit lands on 98)
  lineA: 240,
  lineB: 326, // hours saved draws on
  donutA: 248,
  donutB: 322, // three of four teams
  pushB: 386,
};
const TAU = Math.PI * 2;
const hex = (h: string, a: number) =>
  `rgba(${parseInt(h.slice(1, 3), 16)},${parseInt(h.slice(3, 5), 16)},${parseInt(h.slice(5, 7), 16)},${a})`;

// ---- the data (invented)
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const FREE = [6, 3, 9, 5, 7]; // free hours per weekday
const RANK = FREE.map((v) => FREE.filter((w) => w > v).length); // slot after the re-sort, most free first
const BEST = FREE.indexOf(Math.max(...FREE));
const SAVED = [0, 2, 4.5, 7, 10.5, 14]; // hours saved, cumulative, at the start and end of each weekday
const TEAMS = ["Design", "Sales", "Support", "Ops"];

// ---- the clocks: one per figure, shared with the shape that shows it
const riseAt = (F: number, i = 2) => ease.outCubic(prog(F, K.riseA + (i - 2) * 3, K.riseB + (i - 2) * 3));
const sortAt = (F: number) => ease.inOutCubic(prog(F, K.sortA, K.sortB));
const headline = (F: number) => 92 * riseAt(F) + 6 * sortAt(F);
const sine = (t: number) => (1 - Math.cos(Math.PI * t)) / 2;
const lineAt = (F: number) => sine(prog(F, K.lineA, K.lineB));
const donutAt = (F: number) => sine(prog(F, K.donutA, K.donutB));
const onAt = (F: number) => spring((F - K.on) / FPS, { freq: 3, damp: 0.7 });
// hours saved at x in 0..1 along the week (a Catmull–Rom through the daily totals)
const savedAt = (x: number) => {
  const n = SAVED.length - 1,
    s = clamp(x) * n,
    i = Math.min(n - 1, Math.floor(s)),
    t = s - i;
  const p = (k: number) => SAVED[clamp(k, 0, n)]!,
    m0 = (p(i + 1) - p(i - 1)) / 2,
    m1 = (p(i + 2) - p(i)) / 2;
  const t2 = t * t,
    t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * p(i) + (t3 - 2 * t2 + t) * m0 + (-2 * t3 + 3 * t2) * p(i + 1) + (t3 - t2) * m1;
};
// the sign-off figure, 0 → 14 h
const givenAt = (F: number) => 14 * ease.outCubic(prog(F, T.sign + 10, T.sign + 38));

type Rect = { x: number; y: number; w: number; h: number };
type Roll = {
  dec?: number;
  suffix?: string;
  sfx?: Partial<TextOpts>;
  gap?: number;
  align?: "left" | "center" | "right";
  out?: number;
  /** the value at the frame's own instant and its speed per frame: a wheel spinning faster than half a digit a
   * frame shows crisp digits that change every frame (a counter's flicker) instead of a smeared strip */
  crisp?: number;
  speed?: number;
};

// ---- ODOMETER: a number drawn as rolling digit strips in fixed (tabular) cells. A place past the first rolls in
// from blank and its cell widens as the value reaches it; `out` rolls every cell up and away, staggered.
const digitW = (ctx: Ctx, o: TextOpts) => Math.max(...[..."0123456789"].map((d) => measure(ctx, d, o)));
const rollParts = (ctx: Ctx, v: number, o: TextOpts, r: Roll) => {
  const dec = r.dec ?? 0,
    n = Math.max(0, v) * 10 ** dec,
    top = Math.max(dec, Math.floor(Math.log10(Math.max(n, 1)))) + 1,
    dw = digitW(ctx, o),
    places: { k: number; w: number }[] = [];
  for (let k = top; k >= 0; k--) places.push({ k, w: k <= dec ? 1 : clamp(n - (10 ** k - 1)) });
  const dot = dec ? measure(ctx, ".", o) * 1.1 : 0,
    so = { ...o, ...r.sfx },
    sw = r.suffix ? (r.gap ?? 0) + measure(ctx, r.suffix, so) : 0;
  return { n, dec, dw, places, dot, so, sw, width: places.reduce((a, p) => a + p.w * dw, 0) + dot + sw };
};
const rollWidth = (ctx: Ctx, v: number, o: TextOpts, r: Roll = {}) => rollParts(ctx, v, o, r).width;
function roll(ctx: Ctx, v: number, x: number, base: number, o: TextOpts, r: Roll = {}) {
  const q = rollParts(ctx, v, o, r),
    lh = o.size * 0.95,
    out = r.out ?? 0;
  let cx = r.align === "center" ? x - q.width / 2 : r.align === "right" ? x - q.width : x,
    cell = 0;
  const lift = () => ease.inCubic(clamp(out * 1.7 - cell++ * 0.14)) * lh;
  const clipped = (w: number, draw: () => void) => {
    ctx.save();
    ctx.beginPath();
    ctx.rect(cx, base - o.size * 0.86, w, o.size * 1.0);
    ctx.clip();
    draw();
    ctx.restore();
  };
  for (const { k, w } of q.places) {
    if (w > 0) {
      const unit = 10 ** k,
        fast = ((r.speed ?? 0) * 10 ** q.dec) / unit > 0.5 && r.crisp !== undefined,
        s = fast
          ? Math.floor((r.crisp! * 10 ** q.dec) / unit)
          : k === 0
            ? q.n
            : Math.floor(q.n / unit) + clamp((q.n % unit) - (unit - 1)),
        d0 = Math.floor(s),
        fr = s - d0,
        up = lift(),
        dx = cx + w * q.dw - q.dw / 2;
      clipped(w * q.dw, () => {
        const blank = k > q.dec && d0 === 0;
        if (!blank) text(ctx, String(d0 % 10), dx, base - fr * lh - up, { ...o, align: "center", track: 0 });
        if (fr > 0.001)
          text(ctx, String((d0 + 1) % 10), dx, base + (1 - fr) * lh - up, { ...o, align: "center", track: 0 });
      });
    }
    cx += w * q.dw;
    if (k === q.dec && q.dec > 0) {
      const up = lift();
      clipped(q.dot, () => text(ctx, ".", cx + q.dot * 0.05, base - up, { ...o, track: 0 }));
      cx += q.dot;
    }
  }
  if (r.suffix) {
    const up = lift();
    cx += r.gap ?? 0;
    const sw = q.sw - (r.gap ?? 0);
    clipped(sw + o.size * 0.1, () => text(ctx, r.suffix!, cx, base - up, { ...q.so, align: "left" }));
  }
  return q.width;
}

export function make(size: Size, id: string): Film {
  const L = layout(size),
    { W, H, u, cx, cy, tall } = L;
  const R = (x: number, y: number, w: number, h: number): Rect => ({ x: x * u, y: y * u, w: w * u, h: h * u });
  const sans = (sz: number, weight = 600, color = C.ink): TextOpts => ({
    size: sz * u,
    family: F_.sans,
    weight,
    color,
    track: sz >= 60 ? -0.03 : -0.01,
  });
  const mono = (sz = 22, color = C.muted): TextOpts => ({
    size: sz * u,
    family: F_.mono,
    weight: 500,
    color,
    track: 0.06,
  });

  // ---- the grid, designed per size. Landscape: a 2 × 2 hero row over a mixed row. Vertical: one column with the
  // headline on top (larger) and a column below that scrolls to the widget the story is on.
  const G = tall
    ? {
        header: 252 * u,
        head: R(80, 284, 920, 500),
        figure: 330,
        col: { top: 808 * u, h: 792 * u, to: 816 * u },
        bars: R(80, 0, 920, 444),
        sw: R(80, 468, 920, 150),
        blob: R(80, 642, 920, 150),
        line: R(80, 816, 920, 380),
        donut: R(80, 1220, 920, 388),
      }
    : {
        header: 108 * u,
        head: R(80, 146, 868, 480),
        figure: 300,
        col: null,
        bars: R(972, 146, 868, 480),
        sw: R(80, 650, 380, 168),
        blob: R(80, 842, 380, 168),
        line: R(484, 650, 800, 360),
        donut: R(1308, 650, 532, 360),
      };
  const scrollAt = (F: number) => (G.col ? G.col.to * ease.inOutCubic(prog(F, T.lines - 10, T.lines + 36)) : 0);
  // a rolling figure's instant value and speed (see Roll.crisp)
  const live = (v: (F: number) => number, F: number) => ({
    crisp: v(Math.round(F)),
    speed: Math.abs(v(F + 0.5) - v(F - 0.5)),
  });
  const place = (r: Rect, F: number): Rect => (G.col ? { ...r, y: G.col.top + r.y - scrollAt(F) } : r);

  // each widget springs in from its own outer corner, on a stagger
  const ORDER = { head: 0, bars: 1, sw: 2, line: 3, donut: 4, blob: 5 } as const;
  const enter = (ctx: Ctx, F: number, key: keyof typeof ORDER, r: Rect, body: () => void) => {
    const k = spring((F - 3 - ORDER[key] * 5) / FPS, { freq: 1.9, damp: 0.8 });
    if (k <= 0.001) return;
    const ox = r.x + r.w / 2 < cx ? r.x : r.x + r.w,
      oy = G.col && key !== "head" ? r.y : r.y + r.h / 2 < cy ? r.y : r.y + r.h;
    ctx.save();
    ctx.globalAlpha *= clamp(k * 2.5);
    ctx.translate(ox, oy);
    ctx.scale(lerp(0.2, 1, k), lerp(0.2, 1, k));
    ctx.translate(-ox, -oy);
    body();
    ctx.restore();
  };
  const panel = (ctx: Ctx, r: Rect, fill = C.surface) =>
    card(ctx, r.x, r.y, r.w, r.h, { r: 28 * u, fill, stroke: C.line, lw: 2 * u });
  const title = (ctx: Ctx, r: Rect, s: string, dy = 60) => text(ctx, s, r.x + 36 * u, r.y + dy * u, sans(28));
  const disc = (ctx: Ctx, x: number, y: number, rad: number, color: string) => {
    if (rad <= 0) return;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, TAU);
    ctx.fillStyle = color;
    ctx.fill();
  };

  // ---- header: the product and a live pulse (part of the dashboard, so it moves with the camera)
  const header = (ctx: Ctx, F: number) => {
    const a = prog(F, 2, 16),
      x0 = 80 * u,
      x1 = W - 80 * u;
    ctx.save();
    ctx.globalAlpha *= a;
    const w = text(ctx, P.product, x0, G.header, { ...sans(34, 800), track: -0.03 });
    text(ctx, "Team week", x0 + w + 18 * u, G.header, sans(26, 600, C.muted));
    const lw = text(ctx, "LIVE · 4 TEAMS", x1, G.header, { ...mono(), align: "right" }),
      px = x1 - lw - 30 * u,
      py = G.header - 8 * u,
      pulse = ((F % 30) / 30) * 1;
    disc(ctx, px, py, 7 * u, C.accent2);
    ctx.globalAlpha *= 1 - pulse;
    ctx.strokeStyle = C.accent2;
    ctx.lineWidth = 2 * u;
    ctx.beginPath();
    ctx.arc(px, py, (7 + 14 * pulse) * u, 0, TAU);
    ctx.stroke();
    ctx.restore();
  };

  // ---- the headline: "Meetings found this week", the coral figure, a meter on the same clock, a mint delta
  const fig = () => sans(G.figure, 800, C.accent);
  const figRoll = (): Roll => ({ suffix: "%", sfx: { size: G.figure * 0.62 * u }, gap: 8 * u });
  const figBase = (r: Rect) => r.y + (tall ? 360 : 340) * u;
  const headWidget = (ctx: Ctx, F: number, r: Rect, grow: Rect | null, out: number) => {
    const g = grow ?? r;
    card(ctx, g.x, g.y, g.w, g.h, { r: 28 * u, fill: C.surface, stroke: grow ? undefined : C.line, lw: 2 * u });
    const fade = (1 - prog(out, 0, 0.5)) * (1 - prog(F, T.push + 4, T.push + 26));
    ctx.save();
    ctx.globalAlpha *= fade;
    title(ctx, r, "Meetings found this week", 66);
    // the delta chip counts on the climb's clock
    const c2 = sortAt(F),
      chipA = prog(F, K.sortA - 4, K.sortA + 6);
    if (chipA > 0) {
      const o = sans(24, 600, C.accent2),
        lab = " pts with Auto-book",
        w = 10 * u + measure(ctx, "+", o) + rollWidth(ctx, 6 * c2, o) + measure(ctx, lab, o) + 40 * u,
        x = r.x + r.w - 36 * u - w,
        y = r.y + 30 * u;
      ctx.save();
      ctx.globalAlpha *= chipA;
      card(ctx, x, y, w, 50 * u, { r: 25 * u, fill: hex(C.accent2, 0.14) });
      let tx = x + 20 * u;
      tx += text(ctx, "+", tx, y + 34 * u, o);
      tx += roll(ctx, 6 * c2, tx, y + 34 * u, o);
      text(ctx, lab, tx, y + 34 * u, o);
      ctx.restore();
    }
    ctx.restore();
    // 98 lands with the hit: the figure stamps (a quick pop from its baseline)
    const pop =
      1 +
      0.07 * Math.sin(Math.PI * prog(F, K.sortB, K.sortB + 8)) -
      0.02 * Math.sin(Math.PI * prog(F, K.sortB + 8, K.sortB + 18));
    ctx.save();
    ctx.translate(r.x + 40 * u, figBase(r));
    ctx.scale(pop, pop);
    ctx.translate(-(r.x + 40 * u), -figBase(r));
    roll(ctx, headline(F), r.x + 40 * u, figBase(r), fig(), { ...figRoll(), out, ...live(headline, F) });
    ctx.restore();
    const ring = prog(F, K.sortB, K.sortB + 20);
    if (ring > 0 && ring < 1) {
      const b = figureBox(ctx);
      ctx.save();
      ctx.globalAlpha *= (1 - ring) * 0.7;
      ctx.strokeStyle = C.accent;
      ctx.lineWidth = 3 * u;
      rr(
        ctx,
        b.x - b.w / 2 - 20 * u - ring * 40 * u,
        b.y - b.h / 2 - 20 * u - ring * 40 * u,
        b.w + 40 * u + ring * 80 * u,
        b.h + 40 * u + ring * 80 * u,
        30 * u,
      );
      ctx.stroke();
      ctx.restore();
    }
    ctx.save();
    ctx.globalAlpha *= fade;
    const mx = r.x + 48 * u,
      my = figBase(r) + (tall ? 44 : 40) * u,
      mw = r.w - 96 * u;
    card(ctx, mx, my, mw, 10 * u, { r: 5 * u, fill: C.line });
    if (headline(F) > 0.2) card(ctx, mx, my, (mw * headline(F)) / 100, 10 * u, { r: 5 * u, fill: C.accent });
    text(ctx, "of meeting requests got a time, no back-and-forth", mx, my + 62 * u, sans(24, 400, C.muted));
    ctx.restore();
  };

  // ---- bars: free hours per weekday; each label rides its bar; after the switch they re-sort, most free first
  const barsWidget = (ctx: Ctx, F: number, r: Rect) => {
    panel(ctx, r);
    title(ctx, r, "Free hours by day");
    text(ctx, "HOURS", r.x + r.w - 36 * u, r.y + 58 * u, { ...mono(), align: "right" });
    const left = r.x + 40 * u,
      right = r.x + r.w - 40 * u,
      base = r.y + r.h - 78 * u,
      top = r.y + (tall ? 150 : 160) * u,
      slot = (right - left) / DAYS.length,
      bw = slot * 0.56,
      maxH = base - top,
      c2 = sortAt(F),
      mid = Math.sin(Math.PI * c2);
    ctx.fillStyle = C.line;
    ctx.fillRect(left, base, right - left, 2 * u);
    const order = DAYS.map((_, i) => i)
      .sort((a, b) => RANK[a]! - a - (RANK[b]! - b))
      .reverse();
    for (const i of order) {
      const moving = RANK[i] !== i,
        s = lerp(i, RANK[i]!, c2),
        x = left + (s + 0.5) * slot,
        w = bw * (moving ? 1 - 0.5 * mid : 1),
        v = FREE[i]! * riseAt(F, i),
        h = (maxH * v) / 11,
        la = moving ? 1 - 0.85 * mid : 1;
      if (h > 1) {
        card(ctx, x - w / 2, base - h, w, h, { r: Math.min(12 * u, w / 2, h / 2), fill: C.muted });
        if (i === BEST) {
          const m = ease.outCubic(prog(F, K.on + 3, K.on + 24)) * h;
          if (m > 1) card(ctx, x - w / 2, base - m, w, m, { r: Math.min(12 * u, w / 2, m / 2), fill: C.accent2 });
        }
      }
      ctx.save();
      ctx.globalAlpha *= la * prog(F, K.riseA - 6, K.riseA + 4);
      const o = sans(28, 600, i === BEST && F > K.on + 12 ? C.accent2 : C.ink);
      roll(ctx, v, x, base - h - 16 * u, o, {
        suffix: "h",
        gap: 4 * u,
        sfx: { size: 22 * u, color: C.muted },
        align: "center",
      });
      ctx.restore();
      ctx.save();
      ctx.globalAlpha *= la;
      text(ctx, DAYS[i]!, x, base + 44 * u, { ...mono(22, C.muted), align: "center" });
      ctx.restore();
    }
  };

  // ---- switch: Auto-book turns on
  const switchWidget = (ctx: Ctx, F: number, r: Rect) => {
    const on = onAt(F);
    panel(ctx, r);
    title(ctx, r, "Auto-book", tall ? 64 : 62);
    const tw = 104 * u,
      th = tw * 0.56;
    // the kit's toggle sets globalAlpha outright, so the switch is drawn here to fade with the dashboard
    const x = r.x + r.w - 36 * u - tw,
      y = r.y + (tall ? r.h / 2 - th / 2 : 30 * u),
      t = clamp(on),
      kn = th * 0.8;
    card(ctx, x, y, tw, th, { r: th / 2, fill: C.line });
    ctx.save();
    ctx.globalAlpha *= clamp(t * 2);
    card(ctx, x, y, tw, th, { r: th / 2, fill: C.accent2 });
    ctx.restore();
    disc(ctx, x + th * 0.1 + on * (tw - th) + kn / 2, y + th / 2, kn / 2, C.ink);
    const sy = r.y + (tall ? 108 : 124) * u,
      a = prog(on, 0.4, 0.9);
    text(ctx, "OFF · ASKS FIRST", r.x + 36 * u, sy, { ...mono(), alpha: 1 - a });
    text(ctx, tall ? "ON · BOOKS THE BEST SLOT" : "ON · BEST SLOT", r.x + 36 * u, sy, {
      ...mono(22, C.accent2),
      alpha: a,
    });
  };

  // ---- live: a blob that never stops (the dashboard's heartbeat)
  const blobWidget = (ctx: Ctx, F: number, r: Rect) => {
    panel(ctx, r);
    title(ctx, r, "Listening", tall ? 64 : 62);
    text(ctx, "38 CALENDARS", r.x + 36 * u, r.y + (tall ? 108 : 124) * u, mono());
    const t = F / FPS,
      bx = r.x + r.w - (tall ? 110 : 88) * u,
      by = r.y + r.h / 2,
      R0 = (tall ? 46 : 44) * u;
    ctx.beginPath();
    for (let i = 0; i <= 72; i++) {
      const a = (i / 72) * TAU,
        k = 1 + 0.13 * Math.sin(3 * a + t * 2.2) + 0.08 * Math.sin(5 * a - t * 3.1) + 0.06 * Math.sin(2 * a + t * 1.4);
      const x = bx + Math.cos(a) * R0 * k,
        y = by + Math.sin(a) * R0 * k;
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = hex(C.accent2, 0.22);
    ctx.fill();
    disc(ctx, bx + Math.cos(t * 1.7) * 8 * u, by + Math.sin(t * 2.3) * 8 * u, R0 * 0.42, C.accent2);
  };

  // ---- line: hours saved draws on, a dot riding its head; the readout is the head's own value
  const lineWidget = (ctx: Ctx, F: number, r: Rect) => {
    panel(ctx, r);
    title(ctx, r, "Hours saved");
    const c = lineAt(F),
      left = r.x + 40 * u,
      right = r.x + r.w - 40 * u,
      top = r.y + 118 * u,
      base = r.y + r.h - 74 * u,
      X = (t: number) => lerp(left, right, t),
      Y = (v: number) => base - ((base - top) * v) / 14;
    roll(ctx, savedAt(c), r.x + r.w - 36 * u, r.y + 70 * u, sans(52, 800, C.accent2), {
      dec: 1,
      suffix: "h",
      gap: 8 * u,
      sfx: { size: 30 * u, weight: 600 },
      align: "right",
      ...live((f) => savedAt(lineAt(f)), F),
    });
    ctx.fillStyle = C.line;
    for (const v of [0, 7, 14]) ctx.fillRect(left, Y(v), right - left, 2 * u);
    DAYS.forEach((d, i) => text(ctx, d, X((i + 0.5) / 5), base + 44 * u, { ...mono(), align: "center" }));
    if (c <= 0) return;
    const pts: [number, number][] = [];
    for (let i = 0; i <= 90; i++) {
      const t = Math.min(c, i / 90);
      pts.push([X(t), Y(savedAt(t))]);
      if (t >= c) break;
    }
    ctx.beginPath();
    ctx.moveTo(X(0), base);
    for (const [x, y] of pts) ctx.lineTo(x, y);
    ctx.lineTo(pts[pts.length - 1]![0], base);
    ctx.closePath();
    ctx.fillStyle = hex(C.accent2, 0.12);
    ctx.fill();
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.strokeStyle = C.accent2;
    ctx.lineWidth = 5 * u;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    const [hx, hy] = pts[pts.length - 1]!,
      ring = ((F - K.lineA) % 30) / 30;
    ctx.save();
    ctx.globalAlpha *= 1 - ring;
    ctx.strokeStyle = C.accent2;
    ctx.lineWidth = 2 * u;
    ctx.beginPath();
    ctx.arc(hx, hy, (10 + 18 * ring) * u, 0, TAU);
    ctx.stroke();
    ctx.restore();
    disc(ctx, hx, hy, 11 * u, C.accent2);
    disc(ctx, hx, hy, 5 * u, C.surface);
  };

  // ---- donut: three of four teams booked; the count is the arc's own amount
  const donutWidget = (ctx: Ctx, F: number, r: Rect) => {
    panel(ctx, r);
    title(ctx, r, "Teams booked");
    const f = 3 * donutAt(F),
      rad = (tall ? 120 : 102) * u,
      dx = r.x + 40 * u + rad + 14 * u,
      dy = r.y + (tall ? 222 : 212) * u,
      gap = 0.12,
      a0 = -Math.PI / 2;
    ctx.lineWidth = 26 * u;
    ctx.lineCap = "butt";
    for (let k = 0; k < 4; k++) {
      const s = a0 + (k * TAU) / 4 + gap / 2,
        e = a0 + ((k + 1) * TAU) / 4 - gap / 2;
      ctx.strokeStyle = C.line;
      ctx.beginPath();
      ctx.arc(dx, dy, rad, s, e);
      ctx.stroke();
      const p = clamp(f - k);
      if (p > 0) {
        ctx.strokeStyle = C.accent2;
        ctx.beginPath();
        ctx.arc(dx, dy, rad, s, lerp(s, e, p));
        ctx.stroke();
      }
    }
    const o = sans(tall ? 64 : 56, 800, C.ink);
    roll(ctx, f, dx, dy + 20 * u, o, {
      suffix: "/4",
      gap: 2 * u,
      sfx: { size: 30 * u, color: C.muted },
      align: "center",
    });
    const lx = dx + rad + 60 * u,
      step = (tall ? 58 : 56) * u,
      ly0 = dy - 1.5 * step;
    TEAMS.forEach((name, k) => {
      const y = ly0 + k * step,
        done = prog(f, k + 0.55, k + 1);
      ctx.lineWidth = 2.5 * u;
      ctx.strokeStyle = C.line;
      ctx.beginPath();
      ctx.arc(lx + 14 * u, y, 14 * u, 0, TAU);
      ctx.stroke();
      if (done > 0) {
        disc(ctx, lx + 14 * u, y, 14 * u * ease.outBack(done), C.accent2);
        check(ctx, lx + 14 * u, y + 1 * u, 13 * u, done, C.surface, 3.5 * u);
      }
      text(ctx, name, lx + 42 * u, y + 9 * u, sans(26, 600, done > 0.5 ? C.ink : C.muted));
    });
  };

  // ---- a pointer: it crosses to the switch, clicks it on the beat, then drifts off toward the charts
  const pointer = (ctx: Ctx, F: number) => {
    const a = Math.min(
      prog(F, K.on - 22, K.on - 14),
      1 - prog(F, K.sortB + (tall ? 0 : 12), K.sortB + (tall ? 12 : 26)),
    );
    if (a <= 0) return;
    const sw = place(G.sw, F),
      tw = 104 * u,
      th = tw * 0.56,
      tx = sw.x + sw.w - 36 * u - tw / 2,
      ty = tall ? sw.y + sw.h / 2 : sw.y + 30 * u + th / 2,
      ax = G.head.x + G.head.w * 0.62,
      ay = G.head.y + G.head.h * 0.82,
      bx = tall ? cx + 120 * u : G.line.x + G.line.w * 0.55,
      by = tall ? G.head.y + G.head.h + 120 * u : G.line.y + G.line.h * 0.45,
      m1 = ease.inOutCubic(prog(F, K.on - 18, K.on - 2)),
      m2 = ease.inOutCubic(prog(F, K.sortA + 16, K.sortB + 22)),
      x = lerp(lerp(ax, tx, m1), bx, m2),
      y = lerp(lerp(ay, ty, m1), by, m2),
      press = 1 - 0.18 * Math.sin(Math.PI * prog(F, K.on - 2, K.on + 5)),
      ripple = prog(F, K.on, K.on + 16);
    ctx.save();
    ctx.globalAlpha *= a;
    if (ripple > 0 && ripple < 1) {
      ctx.save();
      ctx.globalAlpha *= 1 - ripple;
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 2.5 * u;
      ctx.beginPath();
      ctx.arc(tx, ty, (12 + 40 * ripple) * u, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
    const k = 1.5 * u * press,
      pts = [
        [0, 0],
        [0, 24],
        [6, 18.5],
        [10.5, 27.5],
        [14.5, 25.5],
        [10, 17],
        [17.5, 17],
      ];
    ctx.beginPath();
    pts.forEach(([px, py], i) => (i ? ctx.lineTo(x + px! * k, y + py! * k) : ctx.moveTo(x + px! * k, y + py! * k)));
    ctx.closePath();
    ctx.fillStyle = C.ink;
    ctx.strokeStyle = C.ground;
    ctx.lineWidth = 2.5 * u;
    ctx.lineJoin = "round";
    ctx.stroke();
    ctx.fill();
    ctx.restore();
  };

  // ---- the camera: a slow drift over the grid, then a push into the headline until the figure fills the frame
  const figureBox = (ctx: Ctx) => {
    const r = G.head,
      w = rollWidth(ctx, 98, fig(), figRoll()),
      capH = G.figure * 0.73 * u;
    return { x: r.x + 40 * u + w / 2, y: figBase(r) - capH / 2, w, h: capH };
  };
  const camera = (ctx: Ctx, F: number) => {
    const s0 = 0.97 + 0.03 * prog(F, 0, T.push),
      b = figureBox(ctx),
      s1 = Math.min((W * 0.86) / b.w, (H * 0.62) / b.h),
      e = ease.inOutCubic(prog(F, T.push, K.pushB)),
      s = Math.exp(lerp(Math.log(s0), Math.log(s1), e)) * (1 + 0.05 * prog(F, K.pushB - 20, N)),
      k = (s - s0) / (s1 - s0 || 1);
    return { s, fx: lerp(cx, b.x, clamp(k)), fy: lerp(cy, b.y, clamp(k)), e, s1, b };
  };

  const world = (ctx: Ctx, F: number) => {
    const cam = camera(ctx, F),
      out = prog(F, T.sign, T.sign + 12);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(cam.s, cam.s);
    ctx.translate(-cam.fx, -cam.fy);
    // the rest of the dashboard dims away as the camera commits to the headline
    const rest = 1 - ease.inOutCubic(prog(F, T.push + 2, T.push + 30));
    ctx.save();
    ctx.globalAlpha *= rest;
    if (rest > 0) header(ctx, F);
    const col = (body: () => void) => {
      if (rest <= 0) return;
      if (!G.col) return body();
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, G.col.top, W, G.col.h);
      ctx.clip();
      body();
      ctx.restore();
    };
    col(() => {
      const b = place(G.bars, F),
        s = place(G.sw, F),
        l = place(G.blob, F),
        n = place(G.line, F),
        d = place(G.donut, F);
      const vis = (r: Rect) => !G.col || (r.y < G.col.top + G.col.h && r.y + r.h > G.col.top);
      if (vis(b)) enter(ctx, F, "bars", b, () => barsWidget(ctx, F, b));
      if (vis(s)) enter(ctx, F, "sw", s, () => switchWidget(ctx, F, s));
      if (vis(l)) enter(ctx, F, "blob", l, () => blobWidget(ctx, F, l));
      if (vis(n)) enter(ctx, F, "line", n, () => lineWidget(ctx, F, n));
      if (vis(d)) enter(ctx, F, "donut", d, () => donutWidget(ctx, F, d));
    });
    ctx.restore();
    // during the push the headline card opens to cover the frame (drawn last, over the rest: a widget going full)
    const g = ease.inOutCubic(prog(F, T.push + 6, K.pushB)),
      r = G.head;
    let grow: Rect | null = null;
    if (g > 0) {
      const vw = W / cam.s1,
        vh = H / cam.s1,
        vx = cam.b.x - vw * 0.6,
        vy = cam.b.y - vh * 0.6,
        x0 = lerp(r.x, Math.min(r.x, vx), g),
        y0 = lerp(r.y, Math.min(r.y, vy), g),
        x1 = lerp(r.x + r.w, Math.max(r.x + r.w, vx + vw * 1.2), g),
        y1 = lerp(r.y + r.h, Math.max(r.y + r.h, vy + vh * 1.2), g);
      grow = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    }
    enter(ctx, F, "head", r, () => headWidget(ctx, F, r, grow, out));
    pointer(ctx, F);
    ctx.restore();
  };

  // ---- sign-off: the figure rolls away; Oriel, and the week's hours given back in mint
  const signoff = (ctx: Ctx, F: number) => {
    if (F < T.sign) return;
    const f = F - T.sign,
      push = 1 + 0.05 * ease.outCubic(prog(F, T.sign, N));
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(push, push);
    ctx.translate(-cx, -cy);
    const nameSize = tall ? 170 : 140,
      figSize = tall ? 330 : 290,
      gy = tall ? cy - 330 * u : cy - 210 * u,
      fy = tall ? cy + 110 * u : cy + 120 * u,
      cyy = fy + (tall ? 150 : 130) * u;
    const o = { ...sans(nameSize, 800), track: -0.04, align: "center" as const };
    letters(ctx, P.product, cx, gy, o, (i) => spring((f - 9 - i * 2.5) / FPS, { freq: 2.4, damp: 0.75 }), "rise");
    const fo = { ...sans(figSize, 800, C.accent2) },
      given = givenAt(F);
    if (F >= T.sign + 8)
      roll(ctx, given, cx, fy, fo, {
        suffix: "h",
        gap: 20 * u,
        sfx: { size: figSize * 0.6 * u, weight: 600 },
        align: "center",
        ...live(givenAt, F),
      });
    const a = ease.outCubic(prog(F, T.sign + 20, T.sign + 34));
    text(ctx, "hours given back this week", cx, cyy + (1 - a) * 24 * u, {
      ...sans(tall ? 46 : 42, 600, C.ink),
      align: "center",
      alpha: a,
    });
    // an underline draws on under the figure, keeping the last bar alive
    const uw = rollWidth(ctx, 14, fo, { suffix: "h", gap: 20 * u, sfx: { size: figSize * 0.6 * u, weight: 600 } }),
      d = ease.inOutCubic(prog(F, T.sign + 30, N - 4));
    if (d > 0) card(ctx, cx - uw / 2, fy + 42 * u, uw * d, 8 * u, { r: 4 * u, fill: C.accent2 });
    const ta = prog(F, T.sign + 36, T.sign + 50);
    text(ctx, P.url.toUpperCase(), cx, cyy + 70 * u, { ...mono(22, C.muted), align: "center", alpha: ta });
    ctx.restore();
  };

  const paint = (ctx: Ctx, env: Env, F: number) => {
    F = clamp(F, 0, N - 1);
    ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
    ctx.fillStyle = C.ground;
    ctx.fillRect(0, 0, W, H);
    world(ctx, F);
    signoff(ctx, F);
  };

  const cuts = [0, T.count, T.auto, T.lines, T.push, T.sign, N],
    names = ["hook", "count", "autobook", "charts", "push", "signoff"];
  const shots: Shot[] = names.map((sid, i) => ({
    id: sid,
    start: cuts[i]!,
    end: cuts[i + 1]!,
    draw: (ctx, local, env) =>
      motionBlur(ctx, env, (c, dt) => paint(c, env, cuts[i]! + local + dt), { samples: 6, shutter: 0.5 }),
  }));
  // ticks sit on the frames where the rolling figures turn over (from the same clocks as the picture)
  const ticks: number[] = [];
  const turns = (v: (F: number) => number, step: number, a: number, b: number) => {
    for (let F = a; F < b; F++) if (Math.floor(v(F + 1) / step) > Math.floor(v(F) / step)) ticks.push(F + 1);
  };
  turns(headline, 8, K.riseA, K.riseB + 2);
  turns(headline, 1, K.sortA, K.sortB - 1);
  turns((F) => savedAt(lineAt(F)), 2, K.lineA, K.lineB + 2);
  turns((F) => 3 * donutAt(F), 1, K.donutA, K.donutB + 2);
  turns(givenAt, 2, T.sign, N);
  return {
    meta: { title: id, W, H, fps: FPS, bpm: BPM, durationFrames: N, raster: "cpu" },
    assets: { images: {}, fonts: P.assets },
    shots,
    audio: beatScore({
      frames: N,
      fps: FPS,
      bpm: BPM,
      mood: "drive",
      drop: T.count,
      hits: [K.on, K.sortB],
      whooshes: [T.count, T.push + 30, T.sign],
      ticks,
      sign: T.sign + 6,
    }),
  };
}

export const dataStory = make("landscape", "dataStory");
export const dataStoryVertical = make("vertical", "dataStoryVertical");
