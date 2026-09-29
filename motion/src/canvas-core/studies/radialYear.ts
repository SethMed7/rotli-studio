// STUDY 49 · RADIAL YEAR (30 s, 30 fps). One year as a circle: 365 spokes whose LENGTH is the hours of daylight,
// Reykjavík (64° N) in amber spokes and Quito (near the equator) as one teal line, on a night ground. A hand sweeps
// the year and each spoke springs to its length as the hand passes. The data is closed-form (the sunrise equation)
// and labelled approximate; every value on screen is a whole number of hours said with "about".
// Brief: series/studies/briefs/radial-year.json · prompt: series/studies/prompts/radial-year.prompt.md
//
// The whole film is one continuous function paint(F) of a (fractional) frame F; the shots only name the sections.
import PACK from "../../../brand/packs/studio/pack.json";
import type { Ctx, Env } from "../core";
import type { Film, Shot } from "../film";
import { clamp, ease, lerp, prog, spring } from "../kit/motion";
import { usePack } from "../kit/pack";
import { beatScore } from "../kit/score";
import { layout, type Size } from "../kit/sizes";
import { letters, measure, text, type TextOpts } from "../kit/type";

const P = usePack(PACK),
  C = P.palette("daylight"),
  F_ = P.face;
const FPS = 30,
  BPM = 120,
  N = 900; // a beat is 15 frames, a bar 60
// the timeline, in frames (every cut on a beat)
const T = { burst: 15, rey: 90, extremes: 330, dec: 390, quito: 450, qland: 570, meet: 630, end: 780, sign: 810 };
// the first sweep ends a beat early, so the hand can glide to 21 Jun and land on the 330 hit with its callout
const SWEEP1: [number, number] = [90, 300],
  SWEEP2: [number, number] = [450, 570];
// the hits the picture punches on (the dial kicks, the callouts snap)
const HITS = [T.burst, T.extremes, T.dec, T.qland, T.meet];
/** a small instant kick of the dial on each hit, decaying in about six frames */
const kick = (F: number) => HITS.reduce((s, h) => s + (F >= h ? 0.022 * Math.exp(-(F - h) / 5) : 0), 0);
/** a label that snaps in on its frame: alpha in three frames, scale from 0.6 through an overshoot to 1 */
const snap = (f: number) => ({
  a: clamp(f / 3),
  s: f <= 0 ? 0.6 : 0.6 + 0.4 * spring(f / FPS, { freq: 3.4, damp: 0.42 }),
});

// ---- THE DATA: the sunrise equation (approximate; −0.833° for refraction and the Sun's disc)
const RAD = Math.PI / 180,
  DAYS = 365;
const daylight = (d: number, phi: number) => {
  const dec = 23.44 * Math.sin((2 * Math.PI * (d - 79)) / DAYS) * RAD,
    c = (Math.sin(-0.833 * RAD) - Math.sin(phi * RAD) * Math.sin(dec)) / (Math.cos(phi * RAD) * Math.cos(dec));
  return (2 * Math.acos(clamp(c, -1, 1))) / RAD / 15;
};
const REY = Array.from({ length: DAYS }, (_, d) => daylight(d, 64.15)),
  QUI = Array.from({ length: DAYS }, (_, d) => daylight(d, -0.22));
const MONTH_START = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334],
  MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthOf = (d: number) => {
  let m = 0;
  for (let i = 0; i < 12; i++) if (d >= MONTH_START[i]!) m = i;
  return m;
};
const JUN21 = 171,
  DEC21 = 354,
  MAR20 = 78,
  SEP23 = 265,
  QDAY = 215;

// ---- THE HAND: a sine ease-in-out (gentle enough that the ends of a sweep never stall), inverted so each spoke
// knows the frame the hand passed it
const inOut = (t: number) => (1 - Math.cos(Math.PI * t)) / 2;
const invInOut = (y: number) => Math.acos(1 - 2 * y) / Math.PI;
const passF = (day: number, [a, b]: [number, number]) => a + (b - a) * invInOut(clamp(day / DAYS));
/**
 * The hand's position in days, counted on (mod 365 gives the day). Two sweeps round the year; between them the hand
 * glides to the day each callout is about, so the readout counts to it; in the holds it drifts a little. The square
 * skips the Quito and crossing glides: there the hand would lie along those callouts' leader lines. The vertical
 * has no leaders (numbered markers instead), so its hand visits every callout.
 */
const Y = DAYS;
// the extremes: the hand lands on 21 Jun on the 330 hit and on 21 Dec on the 390 hit, as each callout snaps in, so
// the readout and the callout always agree
const EXTREMES: [number, number][] = [
  [0, 0],
  [SWEEP1[0], 0],
  [SWEEP1[1], Y], // Reykjavík's sweep
  [SWEEP1[1] + 3, Y],
  [T.extremes, Y + JUN21 + 0.5], // to 21 Jun
  [T.dec - 30, Y + JUN21 + 0.5],
  [T.dec, Y + DEC21 + 0.5], // to 21 Dec
  [T.quito - 16, Y + DEC21 + 0.5],
  [SWEEP2[0], 2 * Y], // back to the top
  [SWEEP2[1], 3 * Y], // Quito's sweep
];
const HAND_SQUARE: [number, number][] = [...EXTREMES, [T.meet, 3 * Y], [T.end, 3 * Y], [N, 3 * Y]];
const HAND_TALL: [number, number][] = [
  ...EXTREMES,
  [SWEEP2[1] + 2, 3 * Y],
  [T.meet - 2, 3 * Y + QDAY + 0.5], // to the Quito callout's day
  [T.meet, 3 * Y + QDAY + 0.5],
  [T.end - 6, 4 * Y + SEP23 + 0.5], // past the first crossing (20 Mar) to the second (23 Sep)
  [T.end, 4 * Y + SEP23 + 0.5],
  [T.end + 60, 5 * Y], // home to the top for the end
  [N, 5 * Y],
];
const handAt = (keys: [number, number][], F: number) => {
  for (let i = 1; i < keys.length; i++) {
    const [a, va] = keys[i - 1]!,
      [b, vb] = keys[i]!;
    if (F < b || i === keys.length - 1) {
      const t = prog(F, a, b);
      // a hold drifts forward and back by under a day (never behind its key, so the top still reads Jan)
      return va === vb ? va + (F >= SWEEP1[0] ? 0.7 * Math.sin(Math.PI * t) ** 2 : 0) : lerp(va, vb, inOut(t));
    }
  }
  return 0;
};
const SPRING = { freq: 3.2, damp: 0.55 }; // settles in about ten frames

// the sound cues: a tick at each month the hand passes (every other month in the faster Quito sweep)
const TICKS = [
  ...MONTH_START.map((d) => Math.round(passF(d + 0.5, SWEEP1))),
  ...MONTH_START.filter((_, i) => i % 2 === 0).map((d) => Math.round(passF(d + 0.5, SWEEP2))),
];

type Span = [string, TextOpts];
type Pt = [number, number];

export function make(size: Size, id: string): Film {
  const L = layout(size),
    { W, H, u, cx } = L,
    tall = L.tall,
    handDay = (F: number) => handAt(tall ? HAND_TALL : HAND_SQUARE, F);
  // the dial, designed per size
  // (the square's sits low enough that the two 44 px end lines fit beneath the title)
  const D = tall ? { x: cx, y: 862 * u, R: 380 * u } : { x: cx, y: 615 * u, R: 300 * u };
  const r0 = 0.24 * D.R,
    rOf = (h: number) => r0 + (h / 24) * (D.R - r0),
    ang = (day: number) => -Math.PI / 2 + (2 * Math.PI * day) / DAYS,
    labR = D.R + 50 * u; // clear of the 24 h label beside the upward axis
  // the slow push-in: it pushes in through every hold and gives a little back under the two sweeps, where the eye
  // is on the hand, so the dial never outgrows its layout
  const ZOOM: [number, number][] = [
    [SWEEP1[0], 1],
    [SWEEP1[1], 0.93],
    [SWEEP2[0], 0.984],
    // both push faster through the end hold; the square ends only a little past full size, to keep the Dec label
    // clear of the 44 px end lines beneath the title and the Jul label clear of the footer
    ...((tall
      ? [
          [SWEEP2[1], 0.92],
          [T.end, 1.0],
          [N, 1.08],
        ]
      : [
          [SWEEP2[1], 0.9],
          [T.meet, 0.93],
          [T.end, 0.97],
          [N, 1.03],
        ]) as [number, number][]),
  ];
  const zoom = (F: number) => pushIn(F) * (1 + kick(F));
  const pushIn = (F: number) => {
    if (F <= ZOOM[0]![0]) return 1;
    for (let i = 1; i < ZOOM.length; i++) {
      const [a, va] = ZOOM[i - 1]!,
        [b, vb] = ZOOM[i]!;
      // a steady rate, so the holds (and the slow ends of the sweeps) never stop moving
      if (F <= b) return lerp(va, vb, prog(F, a, b));
    }
    return ZOOM[ZOOM.length - 1]![1];
  };
  const toScreen = (F: number, day: number, r: number): Pt => {
    const z = zoom(F),
      a = ang(day);
    return [D.x + Math.cos(a) * r * z, D.y + Math.sin(a) * r * z];
  };

  const inter = (sz: number, color: string = C.ink): TextOpts => ({
    size: sz * u,
    family: F_.sans,
    weight: 600,
    color,
    track: -0.01,
  });
  const mono = (sz: number, color: string = C.ink): TextOpts => ({ size: sz * u, family: F_.mono, weight: 500, color });
  /** a line of mixed spans on one baseline */
  const spans = (ctx: Ctx, list: Span[], x: number, y: number, align: CanvasTextAlign, alpha = 1) => {
    const w = list.reduce((s, [t, o]) => s + measure(ctx, t, o), 0);
    let at = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
    for (const [t, o] of list) {
      text(ctx, t, at, y, { ...o, align: "left", alpha: (o.alpha ?? 1) * alpha });
      at += measure(ctx, t, o);
    }
    return w;
  };
  const dot = (ctx: Ctx, x: number, y: number, r: number, color: string) => {
    if (r <= 0) return;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  };
  /** a polyline drawn on to fraction p of its length */
  const leader = (ctx: Ctx, pts: Pt[], p: number, color: string = C.ink) => {
    if (p <= 0) return;
    const seg = pts.slice(1).map((q, i) => Math.hypot(q[0] - pts[i]![0], q[1] - pts[i]![1])),
      total = seg.reduce((a, b) => a + b, 0);
    let left = total * p;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2 * u;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(...pts[0]!);
    for (let i = 0; i < seg.length && left > 0; i++) {
      const k = Math.min(1, left / seg[i]!),
        [ax, ay] = pts[i]!,
        [bx, by] = pts[i + 1]!;
      ctx.lineTo(lerp(ax, bx, k), lerp(ay, by, k));
      left -= seg[i]!;
    }
    ctx.stroke();
    ctx.restore();
  };

  // ---- the dial: rings, ticks and labels (drawn on in the title), then the data
  const dialFrame = (ctx: Ctx, F: number) => {
    const ring = (r: number, p: number, dashed = false) => {
      if (p <= 0) return;
      ctx.save();
      ctx.strokeStyle = C.line;
      ctx.lineWidth = (dashed ? 2.5 : 2) * u;
      if (dashed) ctx.setLineDash([8 * u, 8 * u]);
      ctx.beginPath();
      ctx.arc(D.x, D.y, r, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * p);
      ctx.stroke();
      ctx.restore();
    };
    ring(r0, ease.inOutCubic(prog(F, 0, 32)));
    ring(rOf(24), ease.inOutCubic(prog(F, 2, 38)));
    ring(rOf(12), ease.inOutCubic(prog(F, 8, 44)), true);
    ring(rOf(6), ease.inOutCubic(prog(F, 14, 50)));
    ring(rOf(18), ease.inOutCubic(prog(F, 14, 50)));
    // month ticks and labels, clockwise from the top
    for (let m = 0; m < 12; m++) {
      const a = prog(F, 14 + m * 4, 24 + m * 4);
      if (a <= 0) continue;
      const t = ang(MONTH_START[m]!),
        mid = ang(MONTH_START[m]! + ((MONTH_START[m + 1] ?? DAYS) - MONTH_START[m]!) / 2);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.strokeStyle = C.muted;
      ctx.lineWidth = 2 * u;
      ctx.beginPath();
      ctx.moveTo(D.x + Math.cos(t) * (D.R + 6 * u), D.y + Math.sin(t) * (D.R + 6 * u));
      ctx.lineTo(D.x + Math.cos(t) * (D.R + 20 * u), D.y + Math.sin(t) * (D.R + 20 * u));
      ctx.stroke();
      text(ctx, MONTHS[m]!, D.x + Math.cos(mid) * labR, D.y + Math.sin(mid) * labR + 8 * u, {
        ...mono(24, C.muted),
        align: "center",
        alpha: a,
      });
      ctx.restore();
    }
  };
  // hour labels, once each, along the upward axis: just right of it (the hand only drifts a little) and just
  // outside each ring (the 12 h label clears the Quito line that runs on it)
  const ringLabels = (ctx: Ctx, F: number) => {
    const a = prog(F, 50, 70);
    if (a <= 0) return;
    [6, 12, 18, 24].forEach((h) =>
      text(ctx, `${h} h`, D.x + 16 * u, D.y - rOf(h) - (h === 12 ? 13 : 8) * u, {
        ...mono(22, C.muted),
        align: "left",
        alpha: a,
      }),
    );
  };
  /** spokes as thin annular wedges, 60% of their day's slot */
  const spokes = (ctx: Ctx, data: number[], grow: (d: number) => number, color: string, alpha = 1, under = 0) => {
    ctx.save();
    ctx.fillStyle = color;
    // a faint fill of the same outline under the spokes: it quiets the moiré of 365 thin wedges without
    // changing what is encoded (the length of each spoke)
    if (under > 0) {
      ctx.globalAlpha = under;
      ctx.beginPath();
      for (let d = 0; d < DAYS; d++) {
        const r = r0 + (rOf(data[d]!) - r0) * Math.max(0, grow(d));
        for (const e of [0.2, 0.8]) {
          const a = ang(d + e);
          if (d || e > 0.5) ctx.lineTo(D.x + Math.cos(a) * r, D.y + Math.sin(a) * r);
          else ctx.moveTo(D.x + Math.cos(a) * r, D.y + Math.sin(a) * r);
        }
      }
      ctx.closePath();
      ctx.moveTo(D.x + r0, D.y);
      ctx.arc(D.x, D.y, r0, 0, -Math.PI * 2, true);
      ctx.fill("evenodd");
    }
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    for (let d = 0; d < DAYS; d++) {
      const g = grow(d);
      if (g <= 0) continue;
      const r = r0 + (rOf(data[d]!) - r0) * g,
        a0 = ang(d + 0.2),
        a1 = ang(d + 0.8);
      ctx.moveTo(D.x + Math.cos(a0) * r0, D.y + Math.sin(a0) * r0);
      ctx.arc(D.x, D.y, r, a0, a1);
      ctx.arc(D.x, D.y, r0, a1, a0, true);
      ctx.closePath();
    }
    ctx.fill();
    ctx.restore();
  };
  const reyGrow = (F: number) => (d: number) => spring((F - passF(d + 0.5, SWEEP1)) / FPS, SPRING);
  const quiGrow = (F: number) => (d: number) => spring((F - passF(d + 0.5, SWEEP2)) / FPS, SPRING);
  // the opening burst: the real Reykjavík year springs out clockwise, landing on the 0.5 s hit, holds, and folds
  // back into the inner ring before the hand draws it properly
  const burstGrow = (F: number) => (d: number) => {
    const k = d / DAYS;
    return (
      spring((F + 1 - k * 10) / FPS, { freq: 3.2, damp: 0.5 }) *
      (1 - ease.inOutCubic(prog(F, 38 + k * 18, 64 + k * 18)))
    );
  };
  // the Quito line: one smooth closed line, drawn on behind the hand
  const quitoLine = (ctx: Ctx, F: number) => {
    const upto = F < SWEEP2[0] ? 0 : DAYS * inOut(prog(F, ...SWEEP2));
    if (upto <= 0) return;
    ctx.save();
    ctx.strokeStyle = C.accent2;
    // the ring lands on its hit: a thick flash that settles to 4 px
    ctx.lineWidth = (4 + (F >= T.qland ? 6 * Math.exp(-(F - T.qland) / 6) : 0)) * u;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    const n = Math.floor(upto);
    for (let d = 0; d <= n; d++) {
      const i = d % DAYS,
        a = ang(d),
        r = rOf(QUI[i]!);
      if (d) ctx.lineTo(D.x + Math.cos(a) * r, D.y + Math.sin(a) * r);
      else ctx.moveTo(D.x + Math.cos(a) * r, D.y + Math.sin(a) * r);
    }
    if (upto >= DAYS) ctx.closePath();
    else {
      const a = ang(upto),
        r = rOf(QUI[n % DAYS]!);
      ctx.lineTo(D.x + Math.cos(a) * r, D.y + Math.sin(a) * r);
    }
    ctx.stroke();
    ctx.restore();
  };
  const hand = (ctx: Ctx, F: number) => {
    const a = ease.outCubic(prog(F, 60, 88));
    if (a <= 0) return;
    const t = ang(handDay(F)),
      r1 = lerp(r0, D.R + 30 * u, a);
    ctx.save();
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 2.5 * u;
    ctx.beginPath();
    ctx.moveTo(D.x + Math.cos(t) * (r0 - 2 * u), D.y + Math.sin(t) * (r0 - 2 * u));
    ctx.lineTo(D.x + Math.cos(t) * r1, D.y + Math.sin(t) * r1);
    ctx.stroke();
    ctx.restore();
    dot(ctx, D.x + Math.cos(t) * r1, D.y + Math.sin(t) * r1, 6 * u, C.ink);
  };
  // the readout inside the inner ring: the hand's month over the current city's hours
  const readout = (ctx: Ctx, F: number) => {
    const a = prog(F, T.rey - 6, T.rey + 8);
    if (a <= 0) return;
    const d = Math.floor(handDay(F) + 1e-6) % DAYS,
      quito = F >= T.quito,
      h = Math.round((quito ? QUI : REY)[d]!),
      col = quito ? C.accent2 : C.accent;
    // the readout pops as the hand passes each month (on the tick)
    const last = TICKS.filter((t) => t <= F).pop(),
      pop = last === undefined ? 0 : 0.12 * clamp(1 - (F - last) / 9) ** 2;
    // a quick swap as the city changes
    const sw = quito ? prog(F, T.quito, T.quito + 8) : 1;
    // month, a small "about", and the hours big (44 px square, 55 px vertical): the hedge stays on screen and the
    // number reads on a phone; the stack fits inside the inner ring (checked at the widest, "about 21 h" / "Sep")
    const k = tall ? 1.25 : 1;
    ctx.save();
    ctx.globalAlpha = a * sw;
    ctx.translate(D.x, D.y);
    ctx.scale(1 + pop, 1 + pop);
    text(ctx, MONTHS[monthOf(d)]!, 0, -33 * k * u, { ...mono(26 * k), align: "center" });
    text(ctx, "about", 0, -8 * k * u, { ...mono(24 * k, C.muted), align: "center" });
    text(ctx, `${h} h`, 0, 34 * k * u, { ...mono(44 * k, col), weight: 600, track: -0.03, align: "center" });
    ctx.restore();
  };

  // ---- the title band and the legends
  const title = (ctx: Ctx, F: number) => {
    const o: TextOpts = {
      size: (tall ? 92 : 72) * u,
      family: F_.serif,
      color: C.ink,
      align: tall ? "center" : "left",
      track: -0.01,
    };
    const tx = tall ? cx : 80 * u,
      ty = (tall ? 300 : 124) * u;
    letters(ctx, "A year of daylight", tx, ty, o, (i) => spring((F + 4 - i * 0.55) / FPS, { freq: 2.8, damp: 0.7 }));
    // the subtitle gives way to the two end lines (square: beneath the title; vertical: in the rows below)
    const sub = prog(F, 22, 36) * (tall ? 1 : 1 - prog(F, T.end - 14, T.end));
    const subY = (tall ? 350 : 166) * u;
    if (sub > 0)
      text(ctx, "two cities, one year", tx, subY + (1 - ease.outCubic(sub)) * 12 * u, {
        ...inter(tall ? 32 : 26, C.muted),
        align: tall ? "center" : "left",
        alpha: sub,
      });
  };
  const endLines = (ctx: Ctx, F: number) => {
    const lines: [number, Span[]][] = [
      [
        T.end,
        [
          ["Far north: ", inter(tall ? 48 : 44, C.accent)],
          ["big swings.", inter(tall ? 48 : 44)],
        ],
      ],
      [
        T.sign,
        [
          ["The equator: ", inter(tall ? 48 : 44, C.accent2)],
          ["steady.", inter(tall ? 48 : 44)],
        ],
      ],
    ];
    lines.forEach(([at, list], i) => {
      const a = spring((F - at) / FPS, { freq: 2.4, damp: 0.75 });
      if (a <= 0) return;
      const y = tall ? (1450 + i * 66) * u : (186 + i * 54) * u;
      spans(ctx, list, tall ? cx : 80 * u, y + (1 - a) * 18 * u, tall ? "center" : "left", clamp(a));
    });
  };
  const legends = (ctx: Ctx, F: number) => {
    const one = (
      at: number,
      label: string,
      color: string,
      x: number,
      y: number,
      align: CanvasTextAlign,
      line: boolean,
    ) => {
      const a = spring((F - at) / FPS, { freq: 2.6, damp: 0.62 });
      if (a <= 0) return;
      const o = inter(tall ? 30 : 26, color),
        w = measure(ctx, label, o),
        sw = 34 * u,
        gap = 12 * u,
        full = sw + gap + w,
        left = (align === "right" ? x - full : align === "center" ? x - full / 2 : x) + (1 - a) * 40 * u;
      ctx.save();
      ctx.globalAlpha = clamp(a);
      // the swatch shows how the city is drawn: spokes or a line
      ctx.fillStyle = color;
      if (line) ctx.fillRect(left, y - 12 * u, sw, 4 * u);
      else for (let k = 0; k < 4; k++) ctx.fillRect(left + k * 9 * u, y - 22 * u, 5 * u, 24 * u);
      text(ctx, label, left + sw + gap, y, o);
      ctx.restore();
    };
    if (tall) {
      one(T.rey, "Reykjavík · 64° N", C.accent, 80 * u, 1356 * u, "left", false);
      one(T.quito, "Quito · near the equator", C.accent2, W - 80 * u, 1356 * u, "right", true);
    } else {
      one(T.rey, "Reykjavík · 64° N", C.accent, W - 80 * u, 112 * u, "right", false);
      one(T.quito, "Quito · near the equator", C.accent2, W - 80 * u, 156 * u, "right", true);
    }
  };
  const footer = (ctx: Ctx, F: number) => {
    const a = prog(F, 4, 14); // with the opening burst: no data is ever on screen without "approximate"
    if (a > 0)
      text(ctx, "approximate · sunrise to sunset · data: US Naval Observatory", cx, H - (tall ? 328 : 74) * u, {
        ...mono(22, C.muted),
        align: "center",
        alpha: a,
      });
  };

  // ---- callouts. Square: a leader from the spoke tip to a label around the dial. Vertical: a numbered marker on
  // the dial and the callout as a text row below it.
  type Callout = {
    at: number;
    out: number;
    tip: (F: number) => Pt;
    /** square: the leader's path after the tip, and the label lines */
    path?: Pt[];
    lines?: [Span[], number, number, CanvasTextAlign][];
    /** vertical: the marker number and the row */
    mark?: string;
    row?: Span[];
    small?: Span[];
  };
  const reyTip =
    (d: number, extra = 0) =>
    (F: number) =>
      toScreen(F, d + 0.5, rOf(REY[d]!) + extra);
  const quiTip =
    (d: number, extra = 0) =>
    (F: number) =>
      toScreen(F, d + 0.5, rOf(QUI[d]!) + extra);
  const callouts: Callout[] = tall
    ? [
        {
          at: T.extremes,
          out: T.quito + 6,
          tip: reyTip(JUN21, 28 * u),
          mark: "1",
          row: [
            ["21 Jun · ", inter(44)],
            ["about ", inter(44)],
            ["21", mono(46, C.accent)],
            [" h of daylight", inter(44)],
          ],
          small: [["twilight lasts all night", inter(32, C.muted)]],
        },
        {
          at: T.dec,
          out: T.quito + 6,
          tip: reyTip(DEC21, 30 * u),
          mark: "2",
          row: [
            ["21 Dec · ", inter(44)],
            ["about ", inter(44)],
            ["4", mono(46, C.accent)],
            [" h", inter(44)],
          ],
        },
        {
          at: T.qland,
          out: T.meet + 6,
          tip: quiTip(QDAY, 30 * u),
          mark: "3",
          row: [
            ["about ", inter(44)],
            ["12", mono(46, C.accent2)],
            [" h, every day of the year", inter(44)],
          ],
        },
      ]
    : [
        {
          at: T.extremes,
          out: T.quito + 6,
          tip: reyTip(JUN21),
          // under the May label, to the left end of the key number
          path: [[712 * u, 888 * u]],
          lines: [
            [[["21 Jun", inter(30)]], W - 80 * u, 850 * u, "right"],
            [
              [
                ["about ", mono(46)],
                ["21 h", mono(46, C.accent)],
              ],
              W - 80 * u,
              900 * u,
              "right",
            ],
            [[["of daylight", inter(30)]], W - 80 * u, 936 * u, "right"],
            [[["twilight lasts all night", inter(24, C.muted)]], W - 80 * u, 970 * u, "right"],
          ],
        },
        {
          at: T.dec,
          out: T.quito + 6,
          tip: reyTip(DEC21),
          path: [[344 * u, 294 * u]],
          lines: [
            [[["21 Dec", inter(30)]], 80 * u, 254 * u, "left"],
            [
              [
                ["about ", mono(46)],
                ["4 h", mono(46, C.accent)],
              ],
              80 * u,
              306 * u,
              "left",
            ],
          ],
        },
        {
          at: T.qland,
          out: T.meet + 6,
          tip: quiTip(QDAY),
          path: [[398 * u, 890 * u]],
          lines: [
            [
              [
                ["about ", mono(46)],
                ["12 h,", mono(46, C.accent2)],
              ],
              80 * u,
              906 * u,
              "left",
            ],
            [[["every day of the year", inter(30)]], 80 * u, 948 * u, "left"],
          ],
        },
      ];
  const drawCallout = (ctx: Ctx, F: number, c: Callout, slot: number) => {
    const out = 1 - prog(F, c.out - 12, c.out);
    if (F < c.at || out <= 0) return;
    const tip = c.tip(F),
      f = F - c.at;
    ctx.save();
    ctx.globalAlpha = out;
    // on the hit the tip flashes (a ring that opens and fades) and the label snaps in
    const flash = clamp(1 - f / 12);
    if (flash > 0) {
      ctx.save();
      ctx.globalAlpha = out * flash;
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 3 * u;
      ctx.beginPath();
      ctx.arc(tip[0], tip[1], (8 + f * 2.6) * u, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    // then, while the callout is up, a soft pulse from the point every two beats keeps the hold alive
    if (f >= 12) {
      const ph = (f - 12) % 30,
        r0p = c.row ? 20 : 8;
      ctx.save();
      ctx.globalAlpha = out * 0.75 * (1 - ph / 30);
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 2 * u;
      ctx.beginPath();
      ctx.arc(tip[0], tip[1], (r0p + ph * 1.3) * u, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    if (c.path && c.lines) {
      leader(ctx, [tip, ...c.path], ease.outCubic(prog(f, 0, 5)));
      dot(ctx, tip[0], tip[1], 5 * u * spring(f / FPS, { freq: 3, damp: 0.5 }), C.ink);
      c.lines.forEach(([list, x, y, align], i) => {
        const { a, s } = snap(f - i * 2);
        if (a <= 0) return;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(s, s);
        spans(ctx, list, 0, 0, align, a);
        ctx.restore();
      });
    } else if (c.row) {
      // the numbered marker on the dial
      const k = spring(f / FPS, { freq: 3, damp: 0.5 });
      dot(ctx, tip[0], tip[1], 20 * u * k, C.ink);
      if (k > 0.3)
        text(ctx, c.mark!, tip[0], tip[1] + 8 * u, { ...mono(22, C.ground), align: "center", alpha: clamp(k) });
      // the row: a marker glyph, then the words, snapping in on the hit about the row's centre
      const { a, s } = snap(f);
      if (a > 0) {
        const y = slot * u,
          gw = 52 * u,
          w = c.row.reduce((s, [t, o]) => s + measure(ctx, t, o), 0),
          left = cx - (w + gw) / 2;
        ctx.globalAlpha = out * a;
        ctx.save();
        ctx.translate(cx, y - 14 * u);
        ctx.scale(s, s);
        ctx.translate(-cx, -(y - 14 * u));
        dot(ctx, left + 18 * u, y - 11 * u, 18 * u, C.ink);
        text(ctx, c.mark!, left + 18 * u, y - 3 * u, { ...mono(22, C.ground), align: "center" });
        spans(ctx, c.row, left + gw, y, "left");
        ctx.restore();
        // the smaller line lands a beat after its row
        const b = spring((f - 18) / FPS, { freq: 2.6, damp: 0.75 });
        if (c.small && b > 0) spans(ctx, c.small, cx, y + 46 * u + (1 - b) * 12 * u, "center", clamp(b));
      }
    }
    ctx.restore();
  };
  // the baseline of each vertical callout's row (the June row carries a small line under it)
  const slotOf = (i: number) => (i === 1 ? 1542 : 1440);

  // ---- where they meet: markers pulse at the two crossings
  const crossings = (ctx: Ctx, F: number) => {
    const out = 1 - prog(F, T.end - 12, T.end + 4),
      f = F - T.meet;
    if (f < 0 || out <= 0) return;
    const pts = [MAR20, SEP23].map((d) => toScreen(F, d + 0.5, rOf((REY[d]! + QUI[d]!) / 2)));
    ctx.save();
    ctx.globalAlpha = out;
    pts.forEach(([x, y], i) => {
      const k = spring((f - i * 6) / FPS, { freq: 3, damp: 0.5 });
      // a pulse ring every beat and a half
      for (let p = 0; p < 2; p++) {
        const ph = (((f - i * 6 - p * 22) % 45) + 45) % 45;
        if (f - i * 6 - p * 22 < 0) continue;
        ctx.strokeStyle = C.ink;
        ctx.lineWidth = 2 * u;
        ctx.globalAlpha = out * (1 - ph / 45) * 0.9;
        ctx.beginPath();
        ctx.arc(x, y, (12 + ph * 0.9) * u, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = out;
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 3 * u;
      ctx.beginPath();
      ctx.arc(x, y, 11 * u * k, 0, Math.PI * 2);
      ctx.stroke();
      dot(ctx, x, y, 4 * u * k, C.ink);
    });
    if (tall) {
      const { a, s } = snap(f);
      if (a > 0) {
        const row: Span[] = [
            ["20 Mar & 23 Sep · ", inter(44)],
            ["about ", inter(44)],
            ["12", mono(46)],
            [" h in both", inter(44)],
          ],
          w = row.reduce((s, [t, o]) => s + measure(ctx, t, o), 0),
          left = cx - (w + 40 * u) / 2,
          y = 1440 * u;
        ctx.globalAlpha = out * a;
        ctx.translate(cx, y - 14 * u);
        ctx.scale(s, s);
        ctx.translate(-cx, -(y - 14 * u));
        ctx.strokeStyle = C.ink;
        ctx.lineWidth = 3 * u;
        ctx.beginPath();
        ctx.arc(left + 12 * u, y - 11 * u, 11 * u, 0, Math.PI * 2);
        ctx.stroke();
        dot(ctx, left + 12 * u, y - 11 * u, 4 * u, C.ink);
        spans(ctx, row, left + 40 * u, y, "left");
      }
    } else {
      // a short leader from each crossing to its date, outside the dial; the shared value below right
      const tags: [Pt, Pt[], string, number, CanvasTextAlign][] = [
        [pts[0]!, [[896 * u, 560 * u]], "20 Mar", W - 80 * u, "right"],
        [pts[1]!, [[184 * u, 626 * u]], "23 Sep", 80 * u, "left"],
      ];
      tags.forEach(([p, path, label, x, align], i) => {
        const g = f - i * 4;
        leader(ctx, [p, ...path], ease.outCubic(prog(g, 0, 5)));
        const { a, s } = snap(g - 2);
        if (a <= 0) return;
        ctx.save();
        ctx.translate(x, path[0]![1] + 9 * u);
        ctx.scale(s, s);
        text(ctx, label, 0, 0, { ...inter(30), align, alpha: out * a });
        ctx.restore();
      });
      const lines: Span[][] = [
        [["20 Mar & 23 Sep", inter(30)]],
        [
          ["about ", mono(46)],
          ["12 h", mono(46)],
        ],
        [["in both", inter(30)]],
      ];
      lines.forEach((list, i) => {
        const { a, s } = snap(f - 4 - i * 2);
        if (a <= 0) return;
        ctx.save();
        ctx.translate(W - 80 * u, [888, 934, 970][i]! * u);
        ctx.scale(s, s);
        spans(ctx, list, 0, 0, "right", out * a);
        ctx.restore();
      });
    }
    ctx.restore();
  };

  const paint = (ctx: Ctx, env: Env, F: number) => {
    F = clamp(F, 0, N - 1);
    ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
    ctx.fillStyle = C.ground;
    ctx.fillRect(0, 0, W, H);
    // the dial, under the slow push-in
    const z = zoom(F);
    ctx.save();
    ctx.translate(D.x, D.y);
    ctx.scale(z, z);
    ctx.translate(-D.x, -D.y);
    dialFrame(ctx, F);
    if (F >= SWEEP2[0]) spokes(ctx, QUI, quiGrow(F), C.accent2, 0.2);
    if (F >= SWEEP1[0]) spokes(ctx, REY, reyGrow(F), C.accent, 1, 0.35);
    else if (F < 82) spokes(ctx, REY, burstGrow(F), C.accent, 1, 0.35);
    quitoLine(ctx, F);
    ringLabels(ctx, F);
    hand(ctx, F);
    readout(ctx, F);
    ctx.restore();
    // the chrome around it
    title(ctx, F);
    legends(ctx, F);
    callouts.forEach((c, i) => drawCallout(ctx, F, c, slotOf(i)));
    crossings(ctx, F);
    endLines(ctx, F);
    footer(ctx, F);
  };

  const cuts = [0, T.rey, T.extremes, T.quito, T.meet, T.end, N],
    names = ["title", "reykjavik", "extremes", "quito", "meet", "end"];
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
      mood: "drive", // the kit's only mood with drums; they enter at the drop, as the first sweep starts
      drop: T.rey,
      hits: HITS,
      whooshes: [T.rey, T.quito],
      ticks: TICKS,
      sign: T.sign,
      gain: 0.7,
    }),
  };
}

export const radialYear = make("square", "radialYear");
export const radialYearVertical = make("vertical", "radialYearVertical");
