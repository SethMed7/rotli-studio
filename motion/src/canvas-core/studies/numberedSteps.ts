// STUDY 14 · NUMBERED STEPS (24 s, 30 fps, 120 bpm). The founder-explainer listicle: a giant numeral fills a
// butter field, the step's words stack beside it as a serif ladder, and a small illustrated calendar acts the
// step out. The numeral IS the transition: one monoline stroke that slams in as a 1 and morphs into the 2 and the
// 3, then shrinks into the summary card's third row. Flat colour, poster-bold. Oriel is a fictional product.
// Brief: series/studies/briefs/numbered-steps.json · prompt: series/studies/prompts/numbered-steps.prompt.md
//
// The whole film is one continuous function paint(F) of a (fractional) frame F; the shots only name the sections.
import PACK from "../../../brand/packs/studio/pack.json";
import type { Ctx, Env } from "../core";
import type { Film, Shot } from "../film";
import { motionBlur } from "../kit/blur";
import { ladder, w, type Word } from "../kit/captions";
import { clamp, ease, lerp, prog, spring, window01 } from "../kit/motion";
import { usePack } from "../kit/pack";
import { beatScore } from "../kit/score";
import { layout, type Size } from "../kit/sizes";
import { measure, text } from "../kit/type";
import { check, rr } from "../kit/ui";

const P = usePack(PACK),
  C = P.palette("butter"),
  F_ = P.face;
const FPS = 30,
  BPM = 120,
  N = 720; // a beat is 15 frames, a bar 60
// the timeline, in frames (every cut on a beat)
const T = { one: 60, two: 240, three: 420, sum: 600 };
const STEP_AT = [T.one, T.two, T.three];
const TAU = Math.PI * 2;

// ---- the numerals: monoline centrelines in a unit box (height 1, y down), resampled to the same point count so
// any two can be blended point by point. Every digit starts top-left and ends bottom, so the blend reads as a morph.
type Pt = [number, number];
const M = 240;
const arc = (cx: number, cy: number, r: number, a0: number, a1: number, n = 90): Pt[] =>
  Array.from({ length: n + 1 }, (_, i) => {
    const a = lerp(a0, a1, i / n);
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });
const resample = (pts: Pt[]): Pt[] => {
  const d = [0];
  for (let i = 1; i < pts.length; i++)
    d.push(d[i - 1]! + Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1]));
  const total = d[d.length - 1]!,
    out: Pt[] = [];
  let j = 1;
  for (let i = 0; i < M; i++) {
    const s = (total * i) / (M - 1);
    while (j < d.length - 1 && d[j]! < s) j++;
    const k = (s - d[j - 1]!) / (d[j]! - d[j - 1]! || 1),
      a = pts[j - 1]!,
      b = pts[j]!;
    out.push([lerp(a[0], b[0], k), lerp(a[1], b[1], k)]);
  }
  return out;
};
const GLYPH: Pt[][] = [
  resample([
    [0.1, 0.2],
    [0.4, 0],
    [0.4, 1],
  ]),
  resample([...arc(0.29, 0.27, 0.26, Math.PI + 0.12, TAU + 0.62), [0.03, 1], [0.6, 1]]),
  resample([[0.05, 0], [0.55, 0], [0.28, 0.4], ...arc(0.28, 0.7, 0.3, -Math.PI / 2, Math.PI * 0.8)]),
];
/** each digit's horizontal centre (in heights): small numerals stack on one optical axis */
const MID = GLYPH.map((g) => (Math.min(...g.map((q) => q[0])) + Math.max(...g.map((q) => q[0]))) / 2);
const GW = 0.6, // glyph box width, in heights
  SW = 0.17; // stroke width, in heights

// ---- the week: four meetings that scatter, then gather into Thursday afternoon
const CHIPS: { t: string; c: number; r: number; tilt: number }[] = [
  { t: "Sync", c: 1, r: 0, tilt: -0.14 },
  { t: "1:1", c: 3, r: 1, tilt: 0.12 },
  { t: "Q&A", c: 0, r: 2, tilt: 0.1 },
  { t: "Plan", c: 4, r: 3, tilt: -0.11 },
];
const FOCUS = [0, 2, 4]; // Mon, Wed, Fri mornings
const DAYS = ["M", "T", "W", "T", "F"];
const ROWS = ["Block your deep work", "Batch your meetings", "Let the calendar ask"];

/** hex colour blend (flat colour, no gradients: this only ever fills one shape with one colour) */
const mix = (a: string, b: string, t: number) => {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const x = p(a),
    y = p(b);
  return `rgb(${x.map((v, i) => Math.round(lerp(v, y[i]!, clamp(t)))).join(",")})`;
};
/** an impact: a decaying wobble after frame 0 (squash on a slam) */
const kick = (f: number) => (f < 0 ? 0 : Math.sin(f * 0.5) * Math.exp(-f * 0.16));

export function make(size: Size, id: string): Film {
  const L = layout(size),
    { W, H, u, cx, tall } = L;

  // ---- per-size design: a vertical stacks numeral + words over the calendar; a square puts the numeral left
  // and the words over the calendar on the right, smaller
  const D = tall
    ? {
        num: { x: 144 * u, y: 300 * u, h: 640 * u },
        col: { x: 616 * u, w: 384 * u, label: 330 * u, words: 372 * u, size: 104 * u },
        cal: { x: 110 * u, y: 1112 * u, w: 860 * u, h: 448 * u },
        bub: { x: 612 * u, y: 996 * u, w: 368 * u, h: 86 * u },
        hook: { y: 520 * u, size: 150 * u, dots: 1300 * u },
        sum: { x: 110 * u, y: 360 * u, w: 860 * u, h: 600 * u, head: 92 * u, numH: 66 * u, txt: 38 * u },
        cta: { y: 1040 * u, size: 96 * u, mark: 1440 * u },
      }
    : {
        num: { x: 136 * u, y: 250 * u, h: 560 * u },
        col: { x: 536 * u, w: 464 * u, label: 104 * u, words: 134 * u, size: 84 * u },
        cal: { x: 536 * u, y: 468 * u, w: 464 * u, h: 482 * u },
        bub: { x: 96 * u, y: 906 * u, w: 368 * u, h: 80 * u },
        hook: { y: 250 * u, size: 108 * u, dots: 820 * u },
        sum: { x: 150 * u, y: 96 * u, w: 780 * u, h: 486 * u, head: 80 * u, numH: 56 * u, txt: 34 * u },
        cta: { y: 628 * u, size: 80 * u, mark: 958 * u },
      };

  const label = (
    ctx: Ctx,
    s: string,
    x: number,
    y: number,
    o: { color?: string; align?: CanvasTextAlign; alpha?: number } = {},
  ) =>
    text(ctx, s, x, y, {
      size: 24 * u,
      family: F_.sans,
      weight: 600,
      color: o.color ?? C.muted,
      align: o.align ?? "left",
      alpha: o.alpha ?? 1,
      track: 0.12,
    });
  const dot = (ctx: Ctx, x: number, y: number, r: number, fill: string) => {
    if (r <= 0) return;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fillStyle = fill;
    ctx.fill();
  };
  /** a flat shape with a hard ink offset beneath it: the poster's only depth */
  const slab = (
    ctx: Ctx,
    x: number,
    y: number,
    ww: number,
    hh: number,
    r: number,
    fill: string,
    off = 8 * u,
    stroke = true,
  ) => {
    rr(ctx, x + off * 0.6, y + off, ww, hh, r);
    ctx.fillStyle = C.ink;
    ctx.fill();
    rr(ctx, x, y, ww, hh, r);
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 4 * u;
      ctx.stroke();
    }
  };

  // ---- the numeral stroke: blend the three digits by springs (the 1 is the base; each morph adds its delta)
  const shapeAt = (F: number): Pt[] => {
    const k2 = spring((F - (T.two - 7)) / FPS, { freq: 2.3, damp: 0.6 }),
      k3 = spring((F - (T.three - 7)) / FPS, { freq: 2.3, damp: 0.6 });
    return GLYPH[0]!.map(([x, y], i) => {
      const b = GLYPH[1]![i]!,
        c = GLYPH[2]![i]!;
      return [x + (b[0] - x) * k2 + (c[0] - b[0]) * k3, y + (b[1] - y) * k2 + (c[1] - b[1]) * k3];
    });
  };
  const stroke = (ctx: Ctx, pts: Pt[], x: number, y: number, h: number, color: string) => {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = SW * h;
    ctx.lineCap = "butt";
    ctx.lineJoin = "round";
    ctx.beginPath();
    pts.forEach(([px, py], i) => (i ? ctx.lineTo(x + px * h, y + py * h) : ctx.moveTo(x + px * h, y + py * h)));
    ctx.stroke();
    ctx.restore();
  };
  // where the summary's third row keeps its numeral (the giant 3 shrinks into it)
  const rowY = (i: number) => D.sum.y + D.sum.head + ((D.sum.h - D.sum.head) / 3) * (i + 0.5);
  const rowNum = (i: number) => ({
    x: D.sum.x + 56 * u + (GW / 2 - MID[i]!) * D.sum.numH,
    y: rowY(i) - D.sum.numH / 2,
    h: D.sum.numH,
  });

  const numeral = (ctx: Ctx, F: number) => {
    if (F < 52) return;
    const n = D.num,
      pts = shapeAt(F);
    // slam: accelerate in from three times the size, land on the beat, squash
    const slam = F < T.one ? lerp(3.2, 1, ease.inCubic(prog(F, 52, T.one))) : 1;
    const punch = 1 - 0.07 * kick(F - T.one) + 0.05 * kick(F - T.two) + 0.05 * kick(F - T.three);
    // every hold keeps moving: a slow push-in through each step, handed back under the morph
    const step = F < T.two ? T.one : F < T.three ? T.two : T.three,
      push =
        1 + 0.045 * ease.inOutCubic(prog(F, step, step + 176)) * (1 - ease.inOutCubic(prog(F, step + 172, step + 186)));
    // into the card: shrink onto row 3's numeral
    const go = ease.inOutCubic(prog(F, T.sum - 14, T.sum + 12)),
      r3 = rowNum(2);
    const h = lerp(n.h, r3.h, go),
      x = lerp(n.x, r3.x, go),
      y = lerp(n.y, r3.y, go);
    const k = slam * punch * lerp(push, 1, go),
      ox = x + (GW * h) / 2,
      oy = y + h / 2;
    ctx.save();
    ctx.globalAlpha = prog(F, 52, 54);
    ctx.translate(ox, oy);
    ctx.scale(k, k);
    ctx.translate(-ox, -oy);
    stroke(ctx, pts, x, y, h, C.accent);
    ctx.restore();
  };

  // ---- the step's words: a serif ladder fitted to the column, arriving word by word
  const fit = (ctx: Ctx, lines: Word[][], size: number, width: number) => {
    let widest = 0;
    for (const line of lines) {
      const ws = line.map((wd) =>
        measure(ctx, wd.t, { size: size * (wd.scale ?? 1), family: wd.key ? F_.italic : F_.serif, track: -0.01 }),
      );
      widest = Math.max(widest, ws.reduce((a, b) => a + b, 0) + size * 0.24 * (line.length - 1));
    }
    return Math.min(size, (size * width) / widest);
  };
  const STEP_WORDS = (s: number): Word[][][] => [
    [
      [w("Block", s + 6, { scale: 1.15 })],
      [w("your", s + 12, { scale: 0.62 })],
      [w("deep work", s + 18, { key: true })],
    ],
    [
      [w("Batch", s + 6, { scale: 1.15 })],
      [w("your", s + 12, { scale: 0.62 })],
      [w("meetings", s + 18, { key: true })],
    ],
    [
      [w("Let the", s + 6, { scale: 0.72 })],
      [w("calendar", s + 12, { scale: 1.0 })],
      [w("ask", s + 18, { key: true, scale: 1.3 })],
    ],
  ];
  const words = (ctx: Ctx, F: number) => {
    STEP_AT.forEach((s, i) => {
      if (F < s || F >= s + 180) return;
      const lines = STEP_WORDS(s)[i]!,
        size = fit(ctx, lines, D.col.size, D.col.w),
        drift = (F - s) * 0.12 * u; // the column eases upward through the hold
      ladder(ctx, lines, D.col.x, D.col.words - drift + 12 * u, F, {
        size,
        face: F_.serif,
        italic: F_.italic,
        ink: C.ink,
        accent: C.accent,
        fps: FPS,
        gap: 0.06,
        out: s + 166,
      });
    });
  };

  // ---- progress: three small dots and the step label above the words (the hook's counting dots land here)
  const progDot = (i: number): Pt => [D.col.x + 10 * u + i * 30 * u, D.col.label - 9 * u];
  const hookDot = (i: number): Pt => [cx + (i - 1) * 104 * u, D.hook.dots];
  const progress = (ctx: Ctx, F: number) => {
    const a = 1 - prog(F, T.sum - 14, T.sum);
    if (a <= 0) return;
    ctx.save();
    ctx.globalAlpha = a;
    const cur = F < T.two ? 0 : F < T.three ? 1 : 2;
    for (let i = 0; i < 3; i++) {
      const fly = ease.inOutCubic(prog(F, 46 + i * 2, 58 + i * 2)),
        [hx, hy] = hookDot(i),
        [px, py] = progDot(i);
      const x = lerp(hx, px, fly),
        y = lerp(hy, py, fly);
      if (F < 58 + i * 2) {
        // the hook: each dot pops on its beat with its count inside
        const pop = spring((F - 15 * (i + 1) + 2) / FPS, { freq: 3, damp: 0.5 }),
          r = lerp(34 * u * pop, 9 * u, fly);
        dot(ctx, x, y, r, C.accent);
        if (fly < 0.5 && pop > 0.05)
          text(ctx, String(i + 1), x, y + 11 * u, {
            size: 32 * u * clamp(pop),
            family: F_.sans,
            weight: 800,
            color: C.surface,
            align: "center",
            alpha: 1 - fly * 2,
          });
        continue;
      }
      const on = STEP_AT[i]!,
        fill = spring((F - on) / FPS, { freq: 3, damp: 0.5 }),
        done = i < cur;
      dot(ctx, x, y, 9 * u, done ? C.ink : C.line);
      if (!done) dot(ctx, x, y, 9 * u * clamp(fill, 0, 1.4), C.accent);
    }
    // the label swaps on each cut, the new one rising in
    STEP_AT.forEach((s, i) => {
      const inn = ease.outCubic(prog(F, s + 2, s + 12)),
        out = i < 2 ? prog(F, STEP_AT[i + 1]! - 6, STEP_AT[i + 1]!) : 0;
      if (F < s || inn * (1 - out) <= 0) return;
      ctx.save();
      ctx.translate(0, (1 - inn) * 14 * u - out * 14 * u);
      label(ctx, `STEP ${i + 1} OF 3`, D.col.x + 96 * u, D.col.label, { color: C.ink, alpha: inn * (1 - out) });
      ctx.restore();
    });
    ctx.restore();
  };

  // ---- the calendar card: a week of five days, mornings above afternoons
  const cal = D.cal,
    head = 72 * u,
    gut = (tall ? 70 : 50) * u,
    pad = 14 * u;
  const cw = (cal.w - gut - pad) / 5,
    rh = (cal.h - head - pad * 2) / 4;
  const slot = (c: number, r: number, rows = 1) => ({
    x: cal.x + gut + c * cw + 5 * u,
    y: cal.y + head + pad + r * rh + 5 * u,
    w: cw - 10 * u,
    h: rows * rh - 10 * u,
  });
  const chipH = (2 * rh - 10 * u - 3 * 6 * u) / 4;
  const chipAt = (i: number) => {
    const pm = slot(3, 2, 2);
    return { x: pm.x, y: pm.y + i * (chipH + 6 * u), w: pm.w, h: chipH };
  };
  const calendar = (ctx: Ctx, F: number) => {
    const enter = spring((F - (T.one + 24)) / FPS, { freq: 2, damp: 0.7 }),
      leave = ease.inCubic(prog(F, T.sum - 16, T.sum)); // it drops out of frame, flat, no fade
    if (enter <= 0 || leave >= 1) return;
    ctx.save();
    ctx.globalAlpha = clamp(enter * 2);
    ctx.translate(0, (1 - enter) * 120 * u + leave * (H - cal.y + 40 * u));
    // binder rings, then the card
    for (const fx of [0.25, 0.75]) {
      rr(ctx, cal.x + cal.w * fx - 9 * u, cal.y - 22 * u, 18 * u, 44 * u, 9 * u);
      ctx.fillStyle = C.ink;
      ctx.fill();
    }
    slab(ctx, cal.x, cal.y, cal.w, cal.h, 26 * u, C.surface, 10 * u);
    // header: the days; Thursday turns blue once it holds the meetings
    const thu = prog(F, T.two + 110, T.two + 122);
    ctx.fillStyle = C.line;
    ctx.fillRect(cal.x + 2 * u, cal.y + head, cal.w - 4 * u, 3 * u);
    DAYS.forEach((d, c) =>
      text(ctx, d, cal.x + gut + c * cw + cw / 2, cal.y + head / 2 + 12 * u, {
        size: 30 * u,
        family: F_.sans,
        weight: 800,
        color: c === 3 ? mix(C.ink, C.accent, thu) : C.ink,
        align: "center",
      }),
    );
    // AM / PM gutter and a faint grid
    label(ctx, "AM", cal.x + gut / 2 + 4 * u, slot(0, 0).y + rh - 4 * u, { align: "center" });
    label(ctx, "PM", cal.x + gut / 2 + 4 * u, slot(0, 2).y + rh - 4 * u, { align: "center" });
    ctx.fillStyle = C.line;
    for (let c = 1; c < 5; c++)
      ctx.fillRect(cal.x + gut + c * cw - u, cal.y + head + pad, 2 * u, cal.h - head - pad * 2);
    ctx.fillRect(cal.x + gut, cal.y + head + pad + 2 * rh - u, cal.w - gut - pad, 2 * u);
    // the "now" line walks down the week: drawn under the blocks, alive through every hold
    const nowY = cal.y + head + pad + (cal.h - head - pad * 2) * (0.08 + 0.84 * prog(F, T.one + 30, T.sum)),
      na = prog(F, T.one + 40, T.one + 60);
    if (na > 0) {
      ctx.save();
      ctx.globalAlpha *= na;
      ctx.fillStyle = C.accent2;
      ctx.fillRect(cal.x + gut + 8 * u, nowY - 1.5 * u, cal.w - gut - pad - 8 * u, 3 * u);
      dot(ctx, cal.x + gut + 8 * u, nowY, 8 * u, C.accent2);
      ctx.restore();
    }
    // everything that enters the grid enters from under the header line (clipped to the card body)
    ctx.save();
    rr(ctx, cal.x, cal.y + head + 2 * u, cal.w, cal.h - head - 2 * u, 24 * u);
    ctx.clip();
    // step 1: three focus blocks drop into the mornings, one per beat
    FOCUS.forEach((c, i) => {
      const at = T.one + 45 + i * 15,
        k = spring((F - at + 6) / FPS, { freq: 2.6, damp: 0.5 });
      if (k <= 0) return;
      const s = slot(c, 0, 2),
        // after landing, the blocks breathe very slightly: a hold that still moves
        breathe = F > at + 20 ? 1 + 0.02 * Math.sin(((F - at) / 45) * TAU + i) : 1;
      ctx.save();
      ctx.globalAlpha *= clamp(k * 3);
      ctx.translate(s.x + s.w / 2, s.y + s.h / 2 - (1 - k) * 140 * u);
      ctx.scale(breathe, (2 - k) * breathe);
      rr(ctx, -s.w / 2, -s.h / 2, s.w, s.h, 14 * u);
      ctx.fillStyle = C.accent;
      ctx.fill();
      const o = { size: 24 * u, family: F_.sans, weight: 600, track: 0 };
      if (measure(ctx, "Focus", o) < s.w - 12 * u)
        text(ctx, "Focus", 0, 9 * u, { ...o, color: C.surface, align: "center" });
      ctx.restore();
    });
    // step 2: meetings pop up scattered across the week, then gather into Thursday afternoon
    CHIPS.forEach((ch, i) => {
      const pop = spring((F - (T.two + 30 + i * 10)) / FPS, { freq: 3, damp: 0.5 }),
        g = spring((F - (T.two + 90 + i * 4)) / FPS, { freq: 2.2, damp: 0.72 });
      if (pop <= 0) return;
      const from = slot(ch.c, ch.r),
        to = chipAt(i),
        fw = to.w,
        fh = to.h;
      const fx = from.x + (from.w - fw) / 2,
        fy = from.y + (from.h - fh) / 2;
      // while scattered they jitter (restless); gathered, they sit still in their stack
      const jit = (1 - clamp(g)) * Math.sin((F / 9) * TAU * 0.5 + i * 2) * 0.05;
      const x = lerp(fx, to.x, g),
        y = lerp(fy, to.y, g),
        rot = lerp(ch.tilt, 0, clamp(g)) + jit;
      ctx.save();
      ctx.translate(x + fw / 2, y + fh / 2);
      ctx.rotate(rot);
      ctx.scale(pop, pop);
      rr(ctx, -fw / 2 + 3 * u, -fh / 2 + 4 * u, fw, fh, 10 * u);
      ctx.fillStyle = C.ink;
      ctx.fill();
      rr(ctx, -fw / 2, -fh / 2, fw, fh, 10 * u);
      ctx.fillStyle = C.accent2;
      ctx.fill();
      text(ctx, ch.t, 0, 8.5 * u, { size: 23 * u, family: F_.sans, weight: 600, color: C.ink, align: "center" });
      ctx.restore();
    });
    ctx.restore();
    // the gathered afternoon: a dashed bracket marches around it (ambient motion through the hold)
    const br = window01(F, T.two + 108, T.two + 124, T.sum - 20, T.sum);
    if (br > 0) {
      const s = slot(3, 2, 2);
      ctx.save();
      ctx.globalAlpha *= br;
      ctx.strokeStyle = C.accent;
      ctx.lineWidth = 4 * u;
      ctx.setLineDash([12 * u, 9 * u]);
      ctx.lineDashOffset = -F * 0.9 * u;
      rr(ctx, s.x - 7 * u, s.y - 7 * u, s.w + 14 * u, s.h + 14 * u, 16 * u);
      ctx.stroke();
      ctx.restore();
    }
    // step 3: the booked hour lands in Tuesday afternoon (the bubble flies in; see bubble())
    const land = prog(F, T.three + 104, T.three + 105);
    if (land > 0) {
      const s = slot(1, 2);
      booked(ctx, F, s.x, s.y, s.w, s.h, 1);
    }
    ctx.restore();
  };
  // a booked chip: blue, with a white tick drawn in
  const booked = (ctx: Ctx, F: number, x: number, y: number, ww: number, hh: number, a: number) => {
    ctx.save();
    ctx.globalAlpha *= a;
    rr(ctx, x, y, ww, hh, 12 * u);
    ctx.fillStyle = C.accent;
    ctx.fill();
    const o = { size: 23 * u, family: F_.sans, weight: 600, track: 0 },
      tw = measure(ctx, "Booked", o),
      room = ww > tw + 44 * u;
    const kx = room ? x + ww / 2 - tw / 2 - 4 * u : x + ww / 2;
    check(ctx, kx, y + hh / 2, 16 * u, prog(F, T.three + 106, T.three + 118), C.surface, 4.5 * u);
    if (room) text(ctx, "Booked", kx + 18 * u, y + hh / 2 + 8 * u, { ...o, color: C.surface });
    ctx.restore();
  };

  // ---- step 3: "find an hour" is typed into a chat bubble; the bubble becomes the booked chip
  const bubble = (ctx: Ctx, F: number) => {
    const s3 = T.three,
      pop = spring((F - (s3 + 36)) / FPS, { freq: 2.8, damp: 0.55 });
    if (pop <= 0 || F >= s3 + 105) return;
    const go = ease.inOutCubic(prog(F, s3 + 84, s3 + 105)),
      b = D.bub,
      to = slot(1, 2);
    const x = lerp(b.x, to.x, go),
      y = lerp(b.y, to.y, go),
      ww = lerp(b.w, to.w, go),
      hh = lerp(b.h, to.h, go),
      r = lerp(b.h / 2, 12 * u, go);
    ctx.save();
    ctx.translate(x + ww, y + hh);
    ctx.scale(pop, pop);
    ctx.translate(-(x + ww), -(y + hh));
    const fill = mix(C.ink, C.accent, go);
    // the tail (a flat notch at the bottom right), gone once it starts to fly
    if (go < 0.3) {
      ctx.globalAlpha *= 1 - go / 0.3;
      ctx.beginPath();
      ctx.moveTo(x + ww - 40 * u, y + hh - 4 * u);
      ctx.lineTo(x + ww + 6 * u, y + hh + 16 * u);
      ctx.lineTo(x + ww - 12 * u, y + hh - 18 * u);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    rr(ctx, x, y, ww, hh, r);
    ctx.fillStyle = fill;
    ctx.fill();
    // typed, a character every two frames, with a blinking caret; then three thinking dots
    const msg = "find an hour",
      n = Math.floor(clamp((F - (s3 + 42)) / 2, 0, msg.length)),
      o = { size: 34 * u, family: F_.sans, weight: 600, track: -0.01 },
      ta = 1 - prog(go, 0, 0.35);
    if (ta > 0) {
      const tx = x + 32 * u,
        ty = y + hh / 2 + 12 * u;
      text(ctx, msg.slice(0, n), tx, ty, { ...o, color: C.surface, alpha: ta });
      const think = prog(F, s3 + 66, s3 + 70);
      if (think <= 0 && Math.floor(F / 8) % 2 === 0) {
        ctx.fillStyle = C.surface;
        ctx.globalAlpha *= ta;
        ctx.fillRect(tx + measure(ctx, msg.slice(0, n), o) + 4 * u, ty - 28 * u, 3 * u, 34 * u);
        ctx.globalAlpha = 1;
      }
      if (think > 0) {
        const ex = tx + measure(ctx, msg, o) + 22 * u;
        for (let i = 0; i < 3; i++) {
          const bob = Math.sin(((F - s3) / 12) * TAU - i * 0.9);
          dot(ctx, ex + i * 18 * u, ty - 10 * u - Math.max(0, bob) * 6 * u, 5 * u * think * ta, C.accent2);
        }
      }
    }
    ctx.restore();
  };

  // ---- 00 hook: "3 steps to a calmer week" in a ladder, centred; the dots below count the beats
  const hook = (ctx: Ctx, F: number) => {
    if (F >= T.one) return;
    const lines = [
      [w("3", -6, { scale: 1.25 }), w("steps", -2, { scale: 1.25 })],
      [w("to a", 5, { scale: 0.6 })],
      [w("calmer", 10, { key: true, scale: 1.3 })],
      [w("week", 16, { scale: 0.9 })],
    ];
    const push = 1 + 0.05 * (F / T.one);
    ctx.save();
    ctx.translate(cx, D.hook.y + 220 * u);
    ctx.scale(push, push);
    ctx.translate(-cx, -(D.hook.y + 220 * u));
    ladder(ctx, lines, cx, D.hook.y, F, {
      size: D.hook.size,
      face: F_.serif,
      italic: F_.italic,
      ink: C.ink,
      accent: C.accent,
      fps: FPS,
      align: "center",
      gap: 0.02,
      out: 40,
    });
    ctx.restore();
  };

  // ---- 600 summary: the numbered card with ticks, the call to action, and Oriel under it
  const summary = (ctx: Ctx, F: number) => {
    const S = D.sum,
      rise = spring((F - (T.sum - 4)) / FPS, { freq: 2.2, damp: 0.72 });
    if (rise <= 0) return;
    const hold = 1 + 0.03 * ease.inOutCubic(prog(F, T.sum + 20, N)); // a slow push-in to the end
    ctx.save();
    ctx.translate(cx, H / 2);
    ctx.scale(hold, hold);
    ctx.translate(-cx, -H / 2);
    ctx.save();
    // the card falls in from above as the calendar falls out below: one downward page-turn, no fades
    ctx.translate(0, -(1 - rise) * (S.y + S.h + 40 * u));
    slab(ctx, S.x, S.y, S.w, S.h, 30 * u, C.surface, 12 * u);
    label(ctx, "A CALMER WEEK · CHECKLIST", S.x + 56 * u, S.y + S.head / 2 + 14 * u);
    ctx.fillStyle = C.line;
    ctx.fillRect(S.x + 2 * u, S.y + S.head, S.w - 4 * u, 3 * u);
    ROWS.forEach((row, i) => {
      const y = rowY(i),
        at = T.sum + 2 + i * 5,
        a = ease.outCubic(prog(F, at, at + 10));
      if (i > 0) {
        ctx.fillStyle = C.line;
        ctx.fillRect(S.x + 40 * u, rowY(i) - (S.h - S.head) / 6, S.w - 80 * u, 2 * u);
      }
      // rows 1 and 2 get their numerals here; row 3's is the giant 3, arriving on its own
      if (i < 2) {
        const k = spring((F - at) / FPS, { freq: 3, damp: 0.55 }),
          n = rowNum(i);
        if (k > 0) {
          ctx.save();
          ctx.translate(n.x + (GW * n.h) / 2, y);
          ctx.scale(k, k);
          ctx.translate(-(n.x + (GW * n.h) / 2), -y);
          stroke(ctx, GLYPH[i]!, n.x, n.y, n.h, C.accent);
          ctx.restore();
        }
      }
      ctx.save();
      ctx.translate((1 - a) * 30 * u, 0);
      text(ctx, row, S.x + 56 * u + GW * S.numH + 42 * u, y + S.txt * 0.36, {
        size: S.txt,
        family: F_.sans,
        weight: 600,
        color: C.ink,
        alpha: a,
        track: -0.015,
      });
      ctx.restore();
      // the tick, one per beat
      const tk = T.sum + 30 + i * 15,
        kp = spring((F - tk) / FPS, { freq: 3, damp: 0.5 }),
        kx = S.x + S.w - 62 * u,
        r = 28 * u;
      ctx.lineWidth = 3 * u;
      ctx.strokeStyle = C.line;
      ctx.beginPath();
      ctx.arc(kx, y, r, 0, TAU);
      ctx.stroke();
      dot(ctx, kx, y, r * clamp(kp, 0, 1.3), C.accent);
      if (kp > 0) check(ctx, kx, y + 2 * u, 26 * u, prog(F, tk + 2, tk + 10), C.surface, 5 * u);
    });
    ctx.restore();
    // the call to action, then Oriel small under it
    const cta = [
      [w("Comment", T.sum + 45), w("“calm”", T.sum + 51, { key: true, scale: 1.2 })],
      [w("for the", T.sum + 57, { scale: 0.62 }), w("checklist", T.sum + 62, { scale: 0.9 })],
    ];
    ladder(ctx, cta, cx, D.cta.y, F, {
      size: fit(ctx, cta, D.cta.size, W - 2 * L.safe.x),
      face: F_.serif,
      italic: F_.italic,
      ink: C.ink,
      accent: C.accent,
      fps: FPS,
      align: "center",
      gap: 0.04,
    });
    const m = spring((F - (T.sum + 75)) / FPS, { freq: 2.6, damp: 0.6 });
    if (m > 0) {
      const o = { size: 40 * u, family: F_.sans, weight: 800, track: -0.03 },
        mw = measure(ctx, P.product, o),
        mx = cx - (mw + 26 * u) / 2;
      ctx.save();
      ctx.globalAlpha = clamp(m * 2);
      ctx.translate(0, (1 - m) * 24 * u);
      dot(ctx, mx + 9 * u, D.cta.mark - 14 * u, 9 * u, C.accent);
      text(ctx, P.product, mx + 26 * u, D.cta.mark, { ...o, color: C.ink });
      ctx.restore();
    }
    ctx.restore();
  };

  const paint = (ctx: Ctx, env: Env, F: number) => {
    F = clamp(F, 0, N - 1);
    ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
    ctx.fillStyle = C.ground;
    ctx.fillRect(0, 0, W, H);
    // the slam shakes the frame once; the morphs nudge it
    const shake = 14 * u * kick(F - T.one) + 6 * u * (kick(F - T.two) + kick(F - T.three));
    ctx.translate(0, shake);
    hook(ctx, F);
    calendar(ctx, F);
    summary(ctx, F);
    numeral(ctx, F);
    words(ctx, F);
    bubble(ctx, F);
    progress(ctx, F);
  };
  const cuts = [0, T.one, T.two, T.three, T.sum, N],
    names = ["hook", "block", "batch", "ask", "summary"];
  const shots: Shot[] = names.map((sid, i) => ({
    id: sid,
    start: cuts[i]!,
    end: cuts[i + 1]!,
    draw: (ctx, local, env) =>
      motionBlur(ctx, env, (c, dt) => paint(c, env, cuts[i]! + local + dt), { samples: 4, shutter: 0.5 }),
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
      drop: T.one,
      hits: [T.one, T.two, T.three],
      whooshes: [T.one, T.sum],
      ticks: [
        15,
        30,
        45, // the hook's count
        ...FOCUS.map((_, i) => T.one + 45 + i * 15), // focus blocks land
        ...CHIPS.map((_, i) => T.two + 30 + i * 10), // meetings pop up
        T.two + 96, // …and gather
        T.three + 42,
        T.three + 105, // typed, then booked
        T.sum + 30,
        T.sum + 45,
        T.sum + 60, // the card's ticks
      ],
      sign: T.sum + 75,
    }),
  };
}

export const numberedSteps = make("vertical", "numberedSteps");
export const numberedStepsSquare = make("square", "numberedStepsSquare");
