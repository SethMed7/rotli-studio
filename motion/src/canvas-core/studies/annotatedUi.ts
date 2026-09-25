// STUDY 13 · ANNOTATED UI (23 s, 30 fps, 120 bpm). The founder-explainer move: a real-looking interface card gets
// marked up live. A calendar invite sent for 3:00 AM is circled in red marker, its time zone highlighted, an arrow
// swoops to a scribbled note; the team thread piles up complaints; then the same invite rebuilds itself in everyone's
// own time, ticks draw beside the three guests, and the red marks turn teal and tidy into a checklist. The camera
// pushes into each annotated detail; serif caption ladders sit beside the action. Oriel is a fictional product.
// Brief: series/studies/briefs/annotated-ui.json · prompt: series/studies/prompts/annotated-ui.prompt.md
//
// The whole film is one continuous function paint(F) of a (fractional) frame F; the shots only name the sections.
// Two layers: the WORLD (the invite and every mark on it) moves under one camera; captions, the thread and the
// checklist live in SCREEN space beside it, so a push-in never carries a caption out of the safe area.
import PACK from "../../../brand/packs/studio/pack.json";
import { rng, type Ctx, type Env } from "../core";
import type { Film, Shot } from "../film";
import { motionBlur } from "../kit/blur";
import { ladder, w, type Word } from "../kit/captions";
import { clamp, ease, lerp, prog, spring } from "../kit/motion";
import { usePack } from "../kit/pack";
import { beatScore } from "../kit/score";
import { layout, type Size } from "../kit/sizes";
import { measure, text, type TextOpts } from "../kit/type";
import { card, check } from "../kit/ui";

const P = usePack(PACK),
  C = P.palette("slate"),
  F_ = P.face;
const FPS = 30,
  BPM = 120,
  N = 690; // a beat is 15 frames, a bar 60
// the timeline, in frames (every cut on a beat)
const T = { zoom: 75, thread: 210, fix: 360, tidy: 510, sign: 615 };
// the cast: three invented teammates; Kai (in Seoul) picked noon, the invite went out as 3:00 AM UTC
const GUESTS = [
  { name: "Ana", city: "Lisbon", was: "4:00 AM", now: "10:00 AM" },
  { name: "Ben", city: "Berlin", was: "5:00 AM", now: "11:00 AM" },
  { name: "Kai", city: "Seoul", was: "12:00 PM", now: "6:00 PM" },
];
// the thread: who says what (0 Ana = you, on the right)
const MSGS: [number, string][] = [
  [1, "who moved it?"],
  [0, "I can't make it"],
  [1, "is this 3 a.m. for you too?"],
  [2, "wrong time again"],
  [0, "which time zone is this?"],
  [1, "can we move it?"],
  [2, "moving it. again."],
  [1, "I can't make it either"],
];
const msgAt = (i: number) => T.thread + 14 + i * 13;
const CUE = {
  circle: 24,
  hl: 96,
  arrow: 118,
  note: 134,
  badge: 318,
  rebuild: T.fix + 6,
  ticks: [424, 440, 456],
  tint: T.tidy + 2,
  morph: T.tidy + 16,
  checks: [556, 568, 580],
  underline: 594,
  typing: 330,
  line: T.sign + 22,
};
const CHECKLIST = ["Everyone sees their own time", "No 3 a.m. surprises", "All three can make it"];

// ---- colour: every value comes from the slate palette; mixes of two palette colours are still the palette
const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a: string, b: string, t: number) => {
  const A = hex(a),
    B = hex(b);
  return `#${A.map((v, i) =>
    Math.round(lerp(v, B[i]!, clamp(t)))
      .toString(16)
      .padStart(2, "0"),
  ).join("")}`;
};
const rgba = (h: string, a: number) => `rgba(${hex(h).join(",")},${a})`;
const RED = C.accent,
  TEAL = C.accent2,
  TEAL_INK = mix(C.accent2, C.ink, 0.35), // teal dark enough to read as type on the light ground
  DEEP = C.deep!;

// ---- hand-drawn marks: point lists in card units, a wobble that boils every 8 frames, drawn on by length
type Pt = [number, number];
const TAU = Math.PI * 2;
const wob = (seed: number, t: number) =>
  Math.sin(t * 1.7 + seed * 12.99) * 0.6 + Math.sin(t * 3.3 + seed * 4.1) * 0.3 + Math.sin(t * 6.1 + seed * 7.7) * 0.1;
const boil = (F: number) => Math.floor(F / 8) % 3; // hand-drawn line boil: three takes of each stroke, cycling
const lengths = (pts: Pt[]) => {
  const acc = [0];
  for (let i = 1; i < pts.length; i++)
    acc.push(acc[i - 1]! + Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1]));
  return acc;
};
/** the first fraction t of a polyline, by length */
const partial = (pts: Pt[], t: number): Pt[] => {
  if (t >= 1) return pts;
  if (t <= 0 || pts.length < 2) return [];
  const acc = lengths(pts),
    want = t * acc[acc.length - 1]!,
    out: Pt[] = [pts[0]!];
  for (let i = 1; i < pts.length; i++) {
    if (acc[i]! <= want) out.push(pts[i]!);
    else {
      const k = (want - acc[i - 1]!) / (acc[i]! - acc[i - 1]! || 1),
        a = pts[i - 1]!,
        b = pts[i]!;
      out.push([lerp(a[0], b[0], k), lerp(a[1], b[1], k)]);
      break;
    }
  }
  return out;
};
/** n points evenly spaced along a polyline (so any two marks can morph point for point) */
const resample = (pts: Pt[], n: number): Pt[] => {
  const acc = lengths(pts),
    total = acc[acc.length - 1]!,
    out: Pt[] = [];
  let j = 1;
  for (let i = 0; i < n; i++) {
    const want = (i / (n - 1)) * total;
    while (j < pts.length - 1 && acc[j]! < want) j++;
    const a = pts[j - 1]!,
      b = pts[j]!,
      k = clamp((want - acc[j - 1]!) / (acc[j]! - acc[j - 1]! || 1));
    out.push([lerp(a[0], b[0], k), lerp(a[1], b[1], k)]);
  }
  return out;
};
/** a marker loop: 1.14 turns, spiralling out a little so it overshoots its own start, tilted */
const loop = (cx: number, cy: number, rx: number, ry: number, seed: number, take: number): Pt[] => {
  const n = 110,
    a0 = -2.5 + seed * 0.3,
    turns = 1.14,
    tilt = -0.07;
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1),
      a = a0 + t * turns * TAU,
      r = 1 + 0.035 * wob(seed + take * 0.37, a * 1.3) + 0.075 * t - 0.03;
    const x = Math.cos(a) * rx * r,
      y = Math.sin(a) * ry * r;
    return [cx + x * Math.cos(tilt) - y * Math.sin(tilt), cy + x * Math.sin(tilt) + y * Math.cos(tilt)] as Pt;
  });
};
/** a curve from a to b bowed sideways (bow in card units, + is to the left of travel), with a hand wobble */
const swoop = (a: Pt, b: Pt, bow: number, seed: number, take: number, n = 60): Pt[] => {
  const dx = b[0] - a[0],
    dy = b[1] - a[1],
    l = Math.hypot(dx, dy) || 1,
    nx = dy / l,
    ny = -dx / l;
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1),
      k = 4 * t * (1 - t),
      j = 1.6 * wob(seed + take * 0.41, t * 9) * Math.sin(Math.PI * t);
    return [a[0] + dx * t + nx * (bow * k + j), a[1] + dy * t + ny * (bow * k + j)] as Pt;
  });
};
/** a hand tick */
const tick = (x: number, y: number, s: number, seed: number, take: number): Pt[] => {
  const c: Pt[] = [
    [-0.5, -0.02],
    [-0.14, 0.36],
    [0.58, -0.52],
  ];
  const pts: Pt[] = [];
  for (let seg = 0; seg < 2; seg++)
    for (let i = seg ? 1 : 0; i <= 16; i++) {
      const t = i / 16,
        a = c[seg]!,
        b = c[seg + 1]!,
        bend = seg ? 0.05 * Math.sin(Math.PI * t) : 0;
      pts.push([
        x + (lerp(a[0], b[0], t) - bend + 0.02 * wob(seed + take, t * 5)) * s,
        y + (lerp(a[1], b[1], t) - bend) * s,
      ]);
    }
  return pts;
};
/** a rounded checkbox outline, clockwise from its top-left */
const box = (x: number, y: number, s: number, r: number): Pt[] => {
  const pts: Pt[] = [],
    arcs: [number, number, number][] = [
      [x + s - r, y + r, -Math.PI / 2],
      [x + s - r, y + s - r, 0],
      [x + r, y + s - r, Math.PI / 2],
      [x + r, y + r, Math.PI],
    ];
  pts.push([x + r, y]);
  for (const [ax, ay, a0] of arcs)
    for (let i = 0; i <= 8; i++)
      pts.push([ax + Math.cos(a0 + (i / 8) * (Math.PI / 2)) * r, ay + Math.sin(a0 + (i / 8) * (Math.PI / 2)) * r]);
  pts.push([x + r, y]);
  return pts;
};
const stroke = (ctx: Ctx, pts: Pt[], color: string, lw: number, alpha = 1, cap: CanvasLineCap = "round") => {
  if (pts.length < 2 || alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.lineCap = cap;
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(pts[0]![0], pts[0]![1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i]![0], pts[i]![1]);
  ctx.stroke();
  ctx.restore();
};

// ---- the camera: X = a + (x − f)·s, keyed and blended as a zoom about a point
type Cam = { fx: number; fy: number; ax: number; ay: number; s: number };
type Rect = { x: number; y: number; w: number; h: number };
const fit = (r: Rect, t: Rect, extra = 1): Cam => ({
  fx: r.x + r.w / 2,
  fy: r.y + r.h / 2,
  ax: t.x + t.w / 2,
  ay: t.y + t.h / 2,
  s: Math.min(t.w / r.w, t.h / r.h) * extra,
});
const still = (x: number, y: number, s = 1, dy = 0): Cam => ({ fx: x, fy: y, ax: x, ay: y + dy, s });
const blend = (A: Cam, B: Cam, t: number): Cam => {
  const s = Math.exp(lerp(Math.log(A.s), Math.log(B.s), t)),
    rx = (A.fx + B.fx) / 2,
    ry = (A.fy + B.fy) / 2;
  const px = lerp(A.ax + (rx - A.fx) * A.s, B.ax + (rx - B.fx) * B.s, t),
    py = lerp(A.ay + (ry - A.fy) * A.s, B.ay + (ry - B.fy) * B.s, t);
  return { fx: rx, fy: ry, ax: px, ay: py, s };
};

export function make(size: Size, id: string): Film {
  const L = layout(size),
    { W, H, u, cx, cy, tall } = L;
  // the invite is designed in CARD UNITS (760 × 660) and set at K design units per card unit
  const K = (tall ? 1.12 : 1) * u,
    CW = 760,
    CH = 660,
    PAD = 52;
  const card0 = tall ? { x: cx - (CW * K) / 2, y: 262 * u } : { x: 150 * u, y: cy - (CH * K) / 2 };
  const cardRect: Rect = { x: card0.x, y: card0.y, w: CW * K, h: CH * K };
  // the side: captions and the checklist (right of the card in landscape, under it in the vertical)
  const side = tall
    ? { x: 100 * u, y: card0.y + CH * K + 78 * u, w: 880 * u }
    : { x: 1110 * u, y: 200 * u, w: 730 * u };
  const capSize = (tall ? 112 : 100) * u;
  const cw = (p: Pt): Pt => [card0.x + p[0] * K, card0.y + p[1] * K]; // card units → world
  const cr = (x: number, y: number, w_: number, h: number): Rect => ({
    x: card0.x + x * K,
    y: card0.y + y * K,
    w: w_ * K,
    h: h * K,
  });
  const sans = (size_: number, weight: number, color: string, align: CanvasTextAlign = "left"): TextOpts => ({
    size: size_,
    family: F_.sans,
    weight,
    color,
    align,
    track: -0.01,
  });
  const mono = (size_: number, color: string, align: CanvasTextAlign = "left"): TextOpts => ({
    size: size_,
    family: F_.mono,
    weight: 500,
    color,
    align,
    track: 0.06,
  });

  // ---- the card's rows (card units). Each row flips over to its fixed version during the rebuild.
  const ROW = { head: 70, title: 134, time: 252, tz: 318, rule: 372, guest: [440, 520, 600] };
  const flipOf = (F: number, i: number) => prog(F, CUE.rebuild + i * 7, CUE.rebuild + 14 + i * 7);
  // where the marks sit, measured from the current text (both versions, blended by the rebuild)
  const geo = (ctx: Ctx, F: number) => {
    const tue = measure(ctx, "Tue", sans(40, 600, C.muted)),
      bigX = PAD + tue + 40;
    const wasW = measure(ctx, "3:00 AM", sans(96, 800, C.ink)),
      nowW = measure(ctx, "10:00", sans(96, 800, C.ink));
    const tzX = PAD + measure(ctx, "Time zone", sans(30, 400, C.muted)) + 16;
    const utcW = measure(ctx, "UTC", sans(30, 600, C.ink)),
      localW = measure(ctx, "Local", sans(30, 600, C.ink));
    const ft = ease.inOutCubic(flipOf(F, 1)),
      fz = ease.inOutCubic(flipOf(F, 2));
    const bw = lerp(wasW, nowW, ft),
      vw = lerp(utcW, localW, fz);
    const noteO = { size: 42, family: F_.italic, color: RED },
      noteW = measure(ctx, "Ana is in Lisbon", noteO),
      noteX = CW - 44 - noteW;
    return {
      bigX,
      circle: { cx: bigX + bw / 2, cy: ROW.time - 35, rx: bw / 2 + 24, ry: 62 },
      hl: { x0: tzX - 8, x1: tzX + vw + 8, y: ROW.tz - 11 },
      tzX,
      note: { x: noteX, y: ROW.tz + 22, w: noteW, o: noteO },
      arrow: { a: [tzX + vw + 18, ROW.tz + 6] as Pt, b: [noteX - 14, ROW.tz + 8] as Pt },
    };
  };
  type Geo = ReturnType<typeof geo>;

  const row = (ctx: Ctx, F: number, i: number, y: number, draw: (after: boolean) => void) => {
    const f = flipOf(F, i),
      k = Math.abs(Math.cos(Math.PI * f));
    ctx.save();
    ctx.translate(0, y);
    ctx.scale(1, Math.max(0.001, k));
    ctx.translate(0, -y);
    draw(f >= 0.5);
    ctx.restore();
  };
  const avatar = (ctx: Ctx, x: number, y: number, r: number, who: number) => {
    const fill = [DEEP, C.muted, C.line][who]!,
      ink = who === 2 ? C.ink : C.surface;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fillStyle = fill;
    ctx.fill();
    text(ctx, GUESTS[who]!.name[0]!, x, y + r * 0.36, { ...sans(r, 600, ink, "center"), track: 0 });
  };
  // the invite, drawn in card units (ctx already carries camera × card placement)
  const invite = (ctx: Ctx, F: number, g: Geo, s: number) => {
    card(ctx, 0, 0, CW, CH, {
      r: 34,
      fill: C.surface,
      shadow: { blur: (54 * s * K) / u, y: (22 * s * K) / u, color: rgba(C.ink, 0.13) },
    });
    card(ctx, 0, 0, CW, CH, { r: 34, fill: C.surface, stroke: C.line, lw: 1.5 });
    row(ctx, F, 0, ROW.head - 8, (after) => {
      if (!after) text(ctx, "CALENDAR INVITE", PAD, ROW.head, mono(24, C.muted));
      else {
        ctx.beginPath();
        ctx.arc(PAD + 9, ROW.head - 8, 9, 0, TAU);
        ctx.fillStyle = TEAL;
        ctx.fill();
        text(ctx, "UPDATED BY ORIEL", PAD + 30, ROW.head, mono(24, C.ink));
      }
      text(ctx, "from Kai", CW - PAD, ROW.head, { ...sans(24, 400, C.muted, "right") });
    });
    text(ctx, "Design review", PAD, ROW.title, { ...sans(50, 600, C.ink), track: -0.02 });
    row(ctx, F, 1, ROW.time - 35, (after) => {
      text(ctx, "Tue", PAD, ROW.time, sans(40, 600, C.muted));
      const big = after ? "10:00" : "3:00 AM",
        bw = text(ctx, big, g.bigX, ROW.time, { ...sans(96, 800, C.ink), track: -0.03 });
      text(
        ctx,
        after ? "· your time" : "– 3:30",
        g.bigX + bw + 34,
        ROW.time,
        sans(34, after ? 600 : 400, after ? C.ink : C.muted),
      );
    });
    row(ctx, F, 2, ROW.tz - 11, (after) => {
      text(ctx, "Time zone", PAD, ROW.tz, sans(30, 400, C.muted));
      text(ctx, after ? "Local" : "UTC", g.tzX, ROW.tz, sans(30, 600, C.ink));
    });
    ctx.fillStyle = C.line;
    ctx.fillRect(PAD, ROW.rule, CW - 2 * PAD, 2);
    GUESTS.forEach((gs, i) => {
      const y = ROW.guest[i]!;
      row(ctx, F, 3 + i, y, (after) => {
        avatar(ctx, PAD + 26, y, 26, i);
        const nw = text(ctx, gs.name, PAD + 70, y + 11, sans(32, 600, C.ink));
        text(ctx, gs.city, PAD + 70 + nw + 14, y + 11, sans(28, 400, C.muted));
        text(
          ctx,
          after ? gs.now : gs.was,
          CW - PAD - 62,
          y + 11,
          sans(28, after ? 600 : 400, after ? C.ink : C.muted, "right"),
        );
      });
    });
  };

  // ---- the camera keys (world rects: the time/zone lines for the push, the guest list for the ticks)
  const focusZone = cr(PAD - 16, ROW.time - 110, CW - PAD - 8, ROW.tz - ROW.time + 150),
    focusGuests = cr(0, ROW.guest[0]! - 60, CW, ROW.guest[2]! - ROW.guest[0]! + 120);
  const ZOOM = tall
    ? fit(focusZone, { x: 60 * u, y: 330 * u, w: 960 * u, h: 440 * u })
    : fit(focusZone, { x: 40 * u, y: 170 * u, w: 940 * u, h: 600 * u });
  const GUEST = tall
    ? fit(focusGuests, { x: 40 * u, y: 600 * u, w: 1000 * u, h: 420 * u })
    : fit(focusGuests, { x: 60 * u, y: 460 * u, w: 960 * u, h: 520 * u });
  const ccx = cardRect.x + cardRect.w / 2,
    ccy = cardRect.y + cardRect.h / 2;
  const REST = still(ccx, ccy),
    HOOK = still(cw([PAD + 200, ROW.time - 35])[0], cw([PAD + 200, ROW.time - 35])[1], 1.045),
    BACK = still(ccx, ccy, 0.94, -26 * u),
    BACK2 = still(ccx, ccy, 0.93, -30 * u),
    SIGN = still(ccx, ccy, 1.03);
  const zoomed = (c: Cam, k: number): Cam => ({ ...c, s: c.s * k });
  const KEYS: [number, Cam, "io" | "lin"][] = [
    [0, REST, "lin"],
    [T.zoom + 2, HOOK, "io"],
    [T.zoom + 30, ZOOM, "lin"],
    [T.thread - 2, zoomed(ZOOM, 1.06), "io"],
    [T.thread + 22, BACK, "lin"],
    [T.fix - 2, BACK2, "io"],
    [T.fix + 22, REST, "lin"],
    [CUE.ticks[0]! - 26, zoomed(REST, 1.02), "io"],
    [CUE.ticks[0]! - 2, GUEST, "lin"],
    [T.tidy - 10, zoomed(GUEST, 1.04), "io"],
    [T.tidy + 18, REST, "lin"],
    [T.sign, SIGN, "lin"],
  ];
  const camAt = (F: number): Cam => {
    let i = 0;
    while (i < KEYS.length - 2 && F >= KEYS[i + 1]![0]) i++;
    const [f0, a, how] = KEYS[i]!,
      [f1, b] = KEYS[i + 1]!,
      t = prog(F, f0, f1),
      c = blend(a, b, how === "io" ? ease.inOutCubic(t) : t);
    // the card slides up into place at the start; at the sign-off everything lifts away
    const enter = 1 - spring(F / FPS, { freq: 1.5, damp: 0.78 }),
      leave = ease.inCubic(prog(F, T.sign, T.sign + 14));
    return { ...c, ay: c.ay + enter * (tall ? 1000 : 800) * u - leave * 340 * u };
  };
  const map = (c: Cam, p: Pt): Pt => {
    const q = cw(p);
    return [c.ax + (q[0] - c.fx) * c.s, c.ay + (q[1] - c.fy) * c.s];
  };

  // ---- the marks, in screen space (mapped from card units through the camera), with a red → teal tint
  const tint = (F: number) => ease.inOutCubic(prog(F, CUE.tint, CUE.tint + 20));
  const markColor = (F: number) => mix(RED, TEAL, tint(F));
  const drawn = (F: number, at: number, len: number) => ease.inOutCubic(prog(F, at, at + len));
  // checklist rows (screen): where the tidy marks land
  const listTop = side.y + (tall ? 250 : 300) * u,
    rowGap = (tall ? 92 : 96) * u,
    boxS = 48 * u;
  const boxAt = (i: number): Pt => [side.x, listTop + i * rowGap];
  const MORPH = 96;
  const morph = (F: number, i: number) => ease.inOutCubic(prog(F, CUE.morph + i * 6, CUE.morph + 30 + i * 6));
  const tidyTo = (
    F: number,
    i: number,
    src: Pt[],
    lw: number,
    alpha: number,
    color: string,
    ctx: Ctx,
    comp?: GlobalCompositeOperation,
    cap: CanvasLineCap = "round",
  ) => {
    const m = morph(F, i);
    const [bx, by] = boxAt(i),
      dst = resample(box(bx, by, boxS, 12 * u), MORPH);
    const pts =
      m > 0 ? resample(src, MORPH).map((p, k) => [lerp(p[0], dst[k]![0], m), lerp(p[1], dst[k]![1], m)] as Pt) : src;
    ctx.save();
    if (comp && m === 0) ctx.globalCompositeOperation = comp;
    stroke(ctx, pts, color, lerp(lw, 5 * u, m), lerp(alpha, 1, m), m > 0.5 ? "round" : cap);
    ctx.restore();
  };
  const marks = (ctx: Ctx, F: number, g: Geo, c: Cam) => {
    const b = boil(F),
      col = markColor(F),
      lw = 7.5 * K * c.s;
    // 1 · the loop around "3:00 AM"
    const cp = drawn(F, CUE.circle, 22);
    if (cp > 0) {
      const src = partial(loop(g.circle.cx, g.circle.cy, g.circle.rx, g.circle.ry, 3, b), cp).map((p) => map(c, p));
      tidyTo(F, 0, src, lw, 1, col, ctx);
    }
    // 2 · the highlighter across the zone
    const hp = drawn(F, CUE.hl, 12);
    if (hp > 0) {
      const { x0, x1, y } = g.hl,
        pts = partial(
          Array.from(
            { length: 24 },
            (_, i) => [lerp(x0, x1, i / 23), y + 1.2 * wob(11 + b * 0.3, i * 0.6) - (i / 23) * 3] as Pt,
          ),
          hp,
        ).map((p) => map(c, p));
      ctx.save();
      ctx.lineCap = "butt";
      tidyTo(F, 1, pts, 40 * K * c.s, 0.4, col, ctx, "multiply", "butt");
      ctx.restore();
    }
    // 3 · the arrow that swoops from the zone to the note, and its head
    const ap = drawn(F, CUE.arrow, 14);
    if (ap > 0) {
      const shaft = swoop(g.arrow.a, g.arrow.b, -46, 7, b);
      tidyTo(
        F,
        2,
        partial(shaft, ap).map((p) => map(c, p)),
        lw * 0.8,
        1,
        col,
        ctx,
      );
      const hpv = prog(F, CUE.arrow + 12, CUE.arrow + 18) * (1 - prog(F, CUE.morph, CUE.morph + 8));
      if (hpv > 0) {
        const e = shaft[shaft.length - 1]!,
          q = shaft[shaft.length - 6]!,
          ang = Math.atan2(e[1] - q[1], e[0] - q[0]),
          hl = 22;
        for (const d of [-0.5, 0.5]) {
          const tip: Pt = [e[0] - Math.cos(ang + d) * hl * hpv, e[1] - Math.sin(ang + d) * hl * hpv];
          stroke(ctx, [map(c, e), map(c, tip)], col, lw * 0.8);
        }
      }
    }
    // 4 · the scribbled note, written left to right, with a quick underline
    const np = prog(F, CUE.note, CUE.note + 26),
      nOut = prog(F, CUE.morph - 6, CUE.morph + 10);
    if (np > 0 && nOut < 1) {
      const [x0, y0] = map(c, [g.note.x - 6, g.note.y - 44]),
        [x1] = map(c, [g.note.x + g.note.w + 8, 0]);
      ctx.save();
      ctx.globalAlpha *= 1 - nOut;
      ctx.beginPath();
      ctx.rect(x0, y0 - 40 * u, (x1 - x0) * np, 140 * K * c.s + 40 * u);
      ctx.clip();
      const [nx, ny] = map(c, [g.note.x, g.note.y]);
      ctx.translate(nx, ny);
      ctx.rotate(-0.045);
      text(ctx, "Ana is in Lisbon", 0, 0, { ...g.note.o, size: 42 * K * c.s, color: col });
      ctx.restore();
      const up = drawn(F, CUE.note + 20, 10);
      if (up > 0)
        stroke(
          ctx,
          partial(swoop([g.note.x + 4, g.note.y + 18], [g.note.x + g.note.w, g.note.y + 8], 5, 19, b), up).map((p) =>
            map(c, p),
          ),
          col,
          lw * 0.55,
          1 - nOut,
        );
    }
    // 5 · ticks beside the three guests (they stay on the card and only change colour)
    CUE.ticks.forEach((at, i) => {
      const tp = drawn(F, at, 9);
      if (tp > 0)
        stroke(
          ctx,
          partial(tick(CW - PAD - 14, ROW.guest[i]!, 34, 23 + i, b), tp).map((p) => map(c, p)),
          col,
          lw * 0.85,
        );
    });
  };

  // ---- the checklist the marks tidy into (screen space, the side)
  const checklist = (ctx: Ctx, F: number) => {
    CHECKLIST.forEach((s, i) => {
      const [bx, by] = boxAt(i),
        a = prog(F, CUE.checks[i]! - 8, CUE.checks[i]! + 10);
      if (a <= 0) return;
      check(
        ctx,
        bx + boxS / 2,
        by + boxS / 2 + 2 * u,
        boxS * 0.62,
        prog(F, CUE.checks[i]!, CUE.checks[i]! + 9),
        TEAL,
        6 * u,
      );
      ctx.save();
      ctx.beginPath();
      ctx.rect(bx + boxS, by - 20 * u, (W - bx) * ease.outCubic(a), boxS + 40 * u);
      ctx.clip();
      const lo = sans((tall ? 40 : 36) * u, 600, C.ink);
      text(ctx, s, bx + boxS + 26 * u, by + boxS / 2 + 12 * u, lo);
      ctx.restore();
      // the last row gets a quick teal underline: the one line that matters, marked like the rest
      const up = drawn(F, CUE.underline, 20);
      if (i === CHECKLIST.length - 1 && up > 0) {
        const x0 = bx + boxS + 22 * u,
          x1 = x0 + measure(ctx, s, lo) + 10 * u,
          y0 = by + boxS / 2 + 40 * u;
        stroke(ctx, partial(swoop([x0, y0 + 4 * u], [x1, y0 - 4 * u], 8 * u, 41, boil(F)), up), TEAL, 7 * u);
      }
    });
  };

  // ---- the team thread: complaint bubbles pop in, stack and scroll (screen space, over the card's place)
  const TH = tall
    ? { x: cardRect.x, y: 250 * u, w: cardRect.w, h: 780 * u }
    : { x: 150 * u, y: 150 * u, w: 760 * u, h: 780 * u };
  const bubbleH = 70 * u,
    bubbleGap = 20 * u,
    areaTop = 118 * u,
    areaH = TH.h - areaTop - 24 * u,
    fitN = Math.floor(areaH / (bubbleH + bubbleGap));
  const thread = (ctx: Ctx, F: number) => {
    const inn = spring((F - T.thread) / FPS, { freq: 1.7, damp: 0.8 }),
      out = ease.inCubic(prog(F, T.fix - 4, T.fix + 14));
    if (inn <= 0 || out >= 1) return;
    const x = TH.x,
      y = TH.y + (1 - inn) * H * 0.75 + out * H * 0.8,
      push = 1 + 0.03 * prog(F, T.thread, T.fix);
    ctx.save();
    ctx.translate(x + TH.w / 2, y + TH.h / 2);
    ctx.scale(push, push);
    ctx.translate(-(x + TH.w / 2), -(y + TH.h / 2));
    card(ctx, x, y, TH.w, TH.h, {
      r: 34 * u,
      fill: C.surface,
      shadow: { blur: 70 * u, y: 28 * u, color: rgba(C.ink, 0.16) },
    });
    card(ctx, x, y, TH.w, TH.h, { r: 34 * u, fill: C.surface, stroke: C.line, lw: 1.5 * u });
    const pad = 44 * u;
    text(ctx, "# design-review", x + pad, y + 68 * u, { ...sans((tall ? 40 : 36) * u, 600, C.ink), track: -0.02 });
    const shown = MSGS.filter((_, i) => F >= msgAt(i)).length;
    // the unread badge counts up with the thread
    const bw_ = 112 * u,
      bxx = x + TH.w - pad - bw_,
      byy = y + 38 * u;
    card(ctx, bxx, byy, bw_, 44 * u, { r: 22 * u, fill: shown ? RED : C.line });
    text(ctx, `${shown} new`, bxx + bw_ / 2, byy + 30 * u, { ...mono(22 * u, C.surface, "center"), track: 0.02 });
    ctx.fillStyle = C.line;
    ctx.fillRect(x + pad, y + 98 * u, TH.w - 2 * pad, 2 * u);
    // bubbles: a scroll that springs up one row for each bubble past what fits
    let scroll = 0;
    MSGS.forEach((_, i) => {
      if (i >= fitN) scroll += (bubbleH + bubbleGap) * spring((F - msgAt(i)) / FPS, { freq: 2.2, damp: 0.8 });
    });
    scroll += (bubbleH + bubbleGap) * spring((F - CUE.typing) / FPS, { freq: 2.2, damp: 0.8 });
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y + areaTop - 8 * u, TH.w, areaH + 8 * u);
    ctx.clip();
    MSGS.forEach(([who, s], i) => {
      const p = spring((F - msgAt(i)) / FPS, { freq: 2.6, damp: 0.55 });
      if (p <= 0) return;
      const me = who === 0,
        by = y + areaTop + i * (bubbleH + bubbleGap) - scroll,
        tw = measure(ctx, s, sans(30 * u, 400, C.ink)),
        bw = tw + 52 * u,
        bx = me ? x + TH.w - pad - bw : x + pad + 64 * u;
      const ox = me ? bx + bw : bx,
        oy = by + bubbleH;
      ctx.save();
      ctx.globalAlpha *= clamp(p * 2);
      ctx.translate(ox, oy);
      ctx.scale(lerp(0.4, 1, p), lerp(0.4, 1, p));
      ctx.translate(-ox, -oy);
      if (!me) avatar(ctx, x + pad + 26 * u, by + bubbleH / 2, 26 * u, who);
      card(ctx, bx, by, bw, bubbleH, { r: 30 * u, fill: me ? DEEP : C.ground });
      text(ctx, s, bx + 26 * u, by + bubbleH / 2 + 11 * u, sans(30 * u, 400, me ? C.surface : C.ink));
      ctx.restore();
    });
    ctx.restore();
    // and Kai is already typing the next one: three dots that never stop bouncing
    const tp = spring((F - CUE.typing) / FPS, { freq: 2.6, damp: 0.55 });
    if (tp > 0) {
      const by = y + areaTop + MSGS.length * (bubbleH + bubbleGap) - scroll,
        bx = x + pad + 64 * u;
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y + areaTop - 8 * u, TH.w, areaH + 8 * u);
      ctx.clip();
      ctx.globalAlpha *= clamp(tp * 2);
      ctx.translate(bx, by + bubbleH);
      ctx.scale(lerp(0.4, 1, tp), lerp(0.4, 1, tp));
      ctx.translate(-bx, -(by + bubbleH));
      avatar(ctx, x + pad + 26 * u, by + bubbleH / 2, 26 * u, 2);
      card(ctx, bx, by, 118 * u, bubbleH, { r: 30 * u, fill: C.ground });
      for (let d = 0; d < 3; d++) {
        const hop = Math.max(0, Math.sin(((F - CUE.typing) / FPS) * TAU * 1.6 - d * 0.9));
        ctx.beginPath();
        ctx.arc(bx + 34 * u + d * 25 * u, by + bubbleH / 2 - hop * 9 * u, 8 * u, 0, TAU);
        ctx.fillStyle = mix(C.muted, C.ink, hop * 0.6);
        ctx.fill();
      }
      ctx.restore();
    }
    // a red loop around the badge once the pile-up peaks
    const lp = drawn(F, CUE.badge, 16);
    if (lp > 0)
      stroke(ctx, partial(loop(bxx + bw_ / 2, byy + 22 * u, bw_ / 2 + 22 * u, 40 * u, 5, boil(F)), lp), RED, 7 * u);
    ctx.restore();
  };

  // ---- captions: serif ladders beside the action (screen space, inside safe)
  const LAD = { face: F_.serif, italic: F_.italic, ink: C.ink, fps: FPS, gap: 0.08 };
  type Cap = { lines: Word[][]; out: number; key: string; y: number };
  const CAPS: Cap[] = [
    {
      lines: [
        [w("Sent", 32, { scale: 0.75 }), w("at", 38, { scale: 0.75 })],
        [w("3 a.m.?", 44, { key: true, scale: 1.5 })],
      ],
      out: T.zoom - 8,
      key: RED,
      y: tall ? side.y : 320 * u,
    },
    {
      lines: [
        [w("Nobody", 104, { scale: 0.75 })],
        [w("lives", 110), w("in", 116)],
        [w("UTC.", 124, { key: true, scale: 1.5 })],
      ],
      out: T.thread - 10,
      key: RED,
      y: tall ? 1200 * u : 280 * u,
    },
    {
      lines: [
        [w("Every", 236, { scale: 0.75 }), w("team", 243, { scale: 0.75 })],
        [w("has", 250)],
        [w("one.", 258, { key: true, scale: 1.7 })],
      ],
      out: T.fix - 8,
      key: RED,
      y: tall ? 1090 * u : 290 * u,
    },
    {
      lines: [
        [w("Same", 392, { scale: 0.75 }), w("invite,", 398, { scale: 0.75 })],
        [w("your", 408, { key: true, scale: 1.45 }), w("time.", 415, { scale: 1.45 })],
      ],
      out: T.tidy - 12,
      key: TEAL_INK,
      y: tall ? side.y : 330 * u,
    },
    {
      lines: [
        [w("Draw", 530, { scale: 0.62 }), w("the", 534, { scale: 0.62 }), w("eye,", 538, { scale: 0.62 })],
        [w("then", 544, { scale: 0.8 }), w("the", 548, { scale: 0.8 }), w("fix.", 553, { key: true, scale: 0.95 })],
      ],
      out: T.sign - 4,
      key: TEAL_INK,
      y: tall ? side.y - 10 * u : 170 * u,
    },
  ];
  const captions = (ctx: Ctx, F: number) => {
    for (const c of CAPS) {
      const first = Math.min(...c.lines.flat().map((x) => x.at));
      if (F < first - 1 || F > c.out + 9) continue;
      ladder(ctx, c.lines, side.x, c.y, F, { ...LAD, size: capSize, accent: c.key, out: c.out });
    }
  };

  // ---- sign-off: the wordmark, a hand-drawn underline, the line
  const signoff = (ctx: Ctx, F: number) => {
    if (F < T.sign + 10) return;
    const f = F - T.sign,
      push = 1 + 0.045 * ease.outCubic(prog(F, T.sign, N)),
      wy = tall ? cy - 150 * u : cy - 110 * u;
    ctx.save();
    ctx.translate(cx, wy);
    ctx.scale(push, push);
    ctx.translate(-cx, -wy);
    const o = {
      size: (tall ? 230 : 210) * u,
      family: F_.sans,
      weight: 800,
      color: C.ink,
      align: "center" as const,
      track: -0.05,
    };
    const rise = spring((f - 12) / FPS, { freq: 2, damp: 0.72 }),
      mw = measure(ctx, P.product, o);
    ctx.save();
    ctx.globalAlpha *= clamp(rise * 1.5);
    ctx.translate(0, (1 - rise) * 60 * u);
    text(ctx, P.product, cx, wy, o);
    ctx.restore();
    const lp = drawn(F, CUE.line, 16);
    if (lp > 0) {
      const b = boil(F);
      const ul = swoop([cx - mw / 2 + 6 * u, wy + 58 * u], [cx + mw / 2 + 20 * u, wy + 34 * u], 18 * u, 31, b).map(
        (p) => [p[0], p[1]] as Pt,
      );
      stroke(ctx, partial(ul, lp), TEAL, 13 * u);
    }
    ladder(
      ctx,
      [
        [
          w("times", CUE.line + 4, { scale: 0.7 }),
          w("that", CUE.line + 8, { scale: 0.7 }),
          w("make", CUE.line + 12, { scale: 0.7 }),
        ],
        [w("sense", CUE.line + 17), w("to", CUE.line + 21)],
        [w("everyone", CUE.line + 26, { key: true, scale: 1.25 })],
      ],
      cx,
      wy + (tall ? 130 : 110) * u,
      F,
      { ...LAD, size: (tall ? 96 : 66) * u, accent: TEAL_INK, align: "center" },
    );
    ctx.restore();
  };

  const paint = (ctx: Ctx, env: Env, F: number) => {
    F = clamp(F, 0, N - 1);
    ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = C.ground;
    ctx.fillRect(0, 0, W, H);
    const c = camAt(F);
    // a faint dot grid the camera drifts over (a surface to move against; it rides at half the camera's push)
    const gs = 48 * u,
      par = 1 + (c.s - 1) * 0.5,
      ox = ((cx - (c.fx - c.ax) * 0.5) % gs) - gs,
      oy = ((cy - (c.fy - c.ay) * 0.5 + F * 0.4 * u) % gs) - gs;
    ctx.fillStyle = rgba(C.ink, 0.07);
    for (let x = ox; x < W + gs; x += gs * par)
      for (let y = oy; y < H + gs; y += gs * par) ctx.fillRect(x - 1.5 * u, y - 1.5 * u, 3 * u, 3 * u);
    const g = geo(ctx, F),
      gone = prog(F, T.sign, T.sign + 14);
    if (gone < 1) {
      ctx.save();
      ctx.globalAlpha = 1 - gone;
      ctx.translate(c.ax, c.ay);
      ctx.scale(c.s, c.s);
      ctx.translate(-c.fx + card0.x, -c.fy + card0.y);
      ctx.scale(K, K);
      invite(ctx, F, g, c.s);
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = 1 - gone;
      marks(ctx, F, g, c);
      ctx.restore();
    }
    thread(ctx, F);
    if (gone < 1) {
      ctx.save();
      ctx.globalAlpha = 1 - gone;
      checklist(ctx, F);
      ctx.restore();
    }
    captions(ctx, F);
    signoff(ctx, F);
  };

  const cuts = [0, T.zoom, T.thread, T.fix, T.tidy, T.sign, N],
    names = ["hook", "zone", "thread", "fix", "tidy", "signoff"];
  const shots: Shot[] = names.map((sid, i) => ({
    id: sid,
    start: cuts[i]!,
    end: cuts[i + 1]!,
    draw: (ctx, local, env) =>
      motionBlur(ctx, env, (c, dt) => paint(c, env, cuts[i]! + local + dt), { samples: 4, shutter: 0.5 }),
  }));

  // ---- sound: the soft beat score, with a marker squeak as each mark draws and a pop for each bubble
  const squeaks: [number, number][] = [
    [CUE.circle, 0.55],
    [CUE.hl, 0.35],
    [CUE.arrow, 0.4],
    [CUE.note, 0.7],
    [CUE.badge, 0.45],
    ...CUE.ticks.map((f) => [f, 0.25] as [number, number]),
    [CUE.line, 0.5],
  ];
  const pops = MSGS.map((_, i) => msgAt(i));
  const score = beatScore({
    frames: N,
    fps: FPS,
    bpm: BPM,
    mood: "soft",
    hits: [T.fix, T.sign],
    ticks: [...CUE.checks, CUE.rebuild + 7, CUE.rebuild + 21, CUE.rebuild + 35],
    sign: T.sign + 6,
    gain: 0.74,
  });
  const audio = (sr: number): [Float32Array, Float32Array] => {
    const [Lc, Rc] = score(sr),
      n = Lc.length,
      at = (f: number) => Math.round((f / FPS) * sr),
      noise = rng(13);
    const add = (i: number, v: number, pan: number) => {
      if (i < 0 || i >= n) return;
      Lc[i] += v * (1 - pan) * 2 * 0.5;
      Rc[i] += v * pan * 2 * 0.5;
    };
    // a marker squeak: a scratchy, slightly wavering high tone under band-limited noise, in short strokes
    for (const [f, secs] of squeaks) {
      const i0 = at(f),
        len = Math.round(secs * sr);
      let ph = 0,
        lp = 0,
        hp = 0;
      for (let k = 0; k < len; k++) {
        const t = k / sr,
          x = k / len,
          env =
            Math.min(1, t / 0.01) * Math.min(1, (len - k) / (0.03 * sr)) * (0.65 + 0.35 * Math.sin(TAU * 7 * t) ** 2);
        ph += (1650 + 260 * Math.sin(TAU * 3.1 * t) + 120 * x) / sr;
        const r = noise() * 2 - 1;
        lp += 0.35 * (r - lp);
        hp = r - lp;
        add(i0 + k, (0.05 * Math.sin(TAU * ph) * (0.6 + 0.4 * lp) + 0.06 * hp) * env, 0.4 + 0.2 * x);
      }
    }
    // a bubble pop: a quick falling blip
    pops.forEach((f, j) => {
      const i0 = at(f);
      let ph = 0;
      for (let k = 0; k < 0.09 * sr; k++) {
        const t = k / sr;
        ph += (520 + 900 * Math.exp(-t / 0.018) + (j % 3) * 60) / sr;
        add(i0 + k, 0.2 * Math.sin(TAU * ph) * Math.exp(-t / 0.028) * Math.min(1, t / 0.002), 0.3 + 0.2 * (j % 3));
      }
    });
    // keep the sum under full scale (one static gain, so still deterministic)
    let peak = 1e-9;
    for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(Lc[i]!), Math.abs(Rc[i]!));
    if (peak > 0.97)
      for (let i = 0; i < n; i++) {
        Lc[i] = (Lc[i]! * 0.97) / peak;
        Rc[i] = (Rc[i]! * 0.97) / peak;
      }
    return [Lc, Rc];
  };

  return {
    meta: { title: id, W, H, fps: FPS, bpm: BPM, durationFrames: N, raster: "cpu" },
    assets: { images: {}, fonts: P.assets },
    shots,
    audio,
  };
}

export const annotatedUi = make("vertical", "annotatedUi");
export const annotatedUiLandscape = make("landscape", "annotatedUiLandscape");
