// STUDY 05 · SKETCH EXPLAINER (20 s, 30 fps, 90 bpm). A blueprint that draws itself: how a scheduling assistant
// (Oriel, fictional) finds the one hour three people share. Pale technical-pen lines on deep blue over a fine grid,
// single-stroke draftsman's capitals, one warm accent for the answer. The camera travels over ONE large drawing
// (the sheet), which at the end is seen whole. Designed for landscape (the week runs left to right) and vertical
// (the week runs top to bottom, the people stand across the top). Brand: the neutral pack, palette "blueprint".
// Brief: series/studies/briefs/sketch-explainer.json · prompt: series/studies/prompts/sketch-explainer.prompt.md
//
// Stroke order is the story: every line is drawn on with a `progress`, in the order a hand would make it, and the
// whole film is one continuous function paint(F) of a (fractional) frame; the shots only name the sections.
import PACK from "../../../brand/packs/studio/pack.json";
import { Gfx, oval, arc, type Ctx, type Env, type Medium, type P } from "../core";
import type { Film, Shot } from "../film";
import { clamp, ease, lerp, prog } from "../kit/motion";
import { usePack } from "../kit/pack";
import { beatScore } from "../kit/score";
import { layout, type Size } from "../kit/sizes";
import { measure, text } from "../kit/type";
import { letter, strokeCount, width } from "../styles/drafting";

const P_ = usePack(PACK),
  C = P_.palette("blueprint"),
  F_ = P_.face;
const FPS = 30,
  BPM = 90,
  N = 600; // a beat is 20 frames
// the timeline, in frames (every cut on a beat)
const T = { title: 0, people: 80, week: 200, scan: 340, invite: 460, sign: 560 };
// a technical pen, not a pencil: one clean pass, a little wobble, almost no bite
const PEN: Medium = { nib: 1, taper: 0.35, pressure: 0.25, retrace: false, wobble: 0.7, rough: 0.35 };

// ---- the week, as data. Hours are 0..40 across Mon–Fri (8 a day, 9:00–17:00). Busy blocks are [from, to).
const PEOPLE = ["ANA", "BEN", "KAI"];
const BUSY: [number, number][][] = [
  [
    [0, 2],
    [6, 8],
    [12, 14],
    [17, 20],
    [24, 27],
    [31, 32],
    [35, 37],
  ], // Ana
  [
    [2, 5],
    [8, 10],
    [13, 16],
    [20, 22],
    [26, 28],
    [32, 35],
  ], // Ben
  [
    [4, 6],
    [9, 12],
    [16, 18],
    [21, 24],
    [27, 30],
    [33, 36],
    [37, 40],
  ], // Kai
];
const busy = (i: number, h: number) => BUSY[i]!.some(([a, b]) => h >= a && h < b);
// the answer is DERIVED from the calendars, never typed in twice: the first hour nobody is busy
const FREE = Array.from({ length: 40 }, (_, h) => h).filter((h) => PEOPLE.every((_, i) => !busy(i, h)));
const ANSWER = FREE[0]!; // Thu 15:00 (hour 30) with the calendars above
const DAYS = ["MON", "TUE", "WED", "THU", "FRI"];
const clock = (h: number) => {
  const hr = 9 + (h % 8);
  return `${hr > 12 ? hr - 12 : hr}:00`;
};
const ANSWER_LABEL = `${DAYS[Math.floor(ANSWER / 8)]} ${clock(ANSWER)}`; // "THU 3:00"
const INVITE = `${ANSWER_LABEL}-${clock(ANSWER + 1)}`; // "THU 3:00-4:00" (the draftsman's hand has a dash, no en dash)

type Rect = { x: number; y: number; w: number; h: number };
type Cam = [number, number, number, number]; // frame, world x, world y, zoom

export function make(size: Size, id: string): Film {
  const L = layout(size),
    { W, H, u, tall } = L;
  // THE SHEET is drawn in world units equal to the final, pulled-back view (zoom 1 = the whole sheet on screen),
  // so every label is at least 22 px there and bigger in every closer shot.
  const s = u; // world units scale with the design unit
  const G = tall
    ? {
        // vertical: people across the top, the week runs down, days on the left
        title: {
          x: 540 * s,
          y: 272 * s,
          cap: 48 * s,
          lines: ["HOW A MEETING", "FINDS ITS TIME"],
          gap: 76 * s,
          align: "center" as const,
        },
        meta: { x: 540 * s, y: 246 * s, align: "center" as const },
        lanes: [280, 520, 760].map((x) => x * s),
        laneW: 200 * s,
        g0: 640 * s,
        g1: 1420 * s,
        card: { x: 280 * s, y: 780 * s, w: 700 * s, h: 300 * s },
        stamp: { x: 540 * s, y: 1532 * s },
        border: { x: 34 * s, y: 150 * s, w: W - 68 * s, h: 1560 * s },
      }
    : {
        // landscape: people down the left, the week runs right
        title: {
          x: 110 * s,
          y: 84 * s,
          cap: 46 * s,
          lines: ["HOW A MEETING FINDS ITS TIME"],
          gap: 0,
          align: "left" as const,
        },
        meta: { x: 1810 * s, y: 124 * s, align: "right" as const },
        lanes: [270, 456, 642].map((y) => y * s),
        laneW: 150 * s,
        g0: 400 * s,
        g1: 1810 * s,
        card: { x: 520 * s, y: 330 * s, w: 640 * s, h: 300 * s },
        stamp: { x: 900 * s, y: 944 * s },
        border: { x: 34 * s, y: 30 * s, w: W - 68 * s, h: H - 60 * s },
      };
  const span = (G.g1 - G.g0) / 40; // one hour along the week
  const at = (h: number) => G.g0 + h * span; // the week axis, in world units
  /** lane i between hours a and b (inset across the lane so blocks sit inside its rules) */
  const cell = (i: number, a: number, b: number, inset = 0): Rect =>
    tall
      ? { x: G.lanes[i]! + inset, y: at(a), w: G.laneW - 2 * inset, h: at(b) - at(a) }
      : { x: at(a), y: G.lanes[i]! + inset, w: at(b) - at(a), h: G.laneW - 2 * inset };
  const laneMid = (i: number) => G.lanes[i]! + G.laneW / 2;
  const allLanes = (a: number, b: number): Rect =>
    tall
      ? { x: G.lanes[0]!, y: at(a), w: G.lanes[2]! + G.laneW - G.lanes[0]!, h: at(b) - at(a) }
      : { x: at(a), y: G.lanes[0]!, w: at(b) - at(a), h: G.lanes[2]! + G.laneW - G.lanes[0]! };
  // a person: head, shoulders, name, where their arrow lands and where their check goes
  const person = (i: number) =>
    tall
      ? {
          head: [G.lanes[i]! + 52 * s, 502 * s] as P,
          r: 28 * s,
          name: [G.lanes[i]! + 96 * s, 482 * s] as P,
          cap: 28 * s,
          tip: [G.lanes[i]! + 124 * s, 608 * s] as P,
          check: [G.lanes[i]! + 168 * s, 560 * s] as P,
        }
      : {
          head: [168 * s, laneMid(i) - 24 * s] as P,
          r: 30 * s,
          name: [222 * s, laneMid(i) - 40 * s] as P,
          cap: 30 * s,
          tip: [352 * s, laneMid(i) - 16 * s] as P,
          check: [258 * s, laneMid(i) + 30 * s] as P,
        };

  // ---- the camera: eased keys (world centre + zoom). Holds are keys that still drift, so nothing ever freezes.
  const CAM: Cam[] = tall
    ? [
        [0, 540, 318, 1.4],
        [80, 540, 322, 1.45],
        [112, 540, 640, 1.07],
        [200, 540, 662, 1.1],
        [216, 540, 760, 1.1],
        [340, 540, 1080, 1.1],
        [366, 540, 956, 1.0],
        [460, 540, 960, 1.025],
        [488, 540, 820, 1.08],
        [560, 540, 812, 1.1],
        [580, 540, 960, 1],
        [599, 540, 960, 0.985],
      ]
    : [
        [0, 636, 128, 1.5],
        [80, 640, 132, 1.58],
        [112, 660, 560, 1.32],
        [200, 702, 556, 1.35],
        [216, 730, 556, 1.4],
        [340, 1320, 556, 1.4],
        [366, 960, 544, 1],
        [460, 960, 540, 1.025],
        [488, 800, 480, 1.15],
        [560, 796, 476, 1.18],
        [580, 960, 540, 1],
        [599, 960, 540, 0.985],
      ];
  const cam = (F: number) => {
    let i = 0;
    while (i < CAM.length - 2 && F >= CAM[i + 1]![0]) i++;
    const [f0, x0, y0, z0] = CAM[i]!,
      [f1, x1, y1, z1] = CAM[i + 1]!,
      k = ease.inOutCubic(prog(F, f0, f1));
    return { x: lerp(x0, x1, k) * s, y: lerp(y0, y1, k) * s, z: lerp(z0, z1, k) };
  };

  // ---- drawing helpers (fixed seeds, so a line is the same line on every frame)
  const pen = (
    g: Gfx,
    pts: P[],
    t: number,
    seed: number,
    o: { w?: number; color?: string; alpha?: number; closed?: boolean } = {},
  ) => {
    if (t <= 0) return;
    g.pen(pts, {
      progress: clamp(t),
      w: (o.w ?? 2.1) * s,
      color: o.color ?? C.ink,
      seed,
      wobble: 0.9 * s,
      boil: 0.28 * s,
      taper: 0.5,
      opacity: 0.94 * (o.alpha ?? 1),
      closed: o.closed ?? false,
      retrace: false,
    });
  };
  // a ruled line: two points with a midpoint, so the pen can bow a hair
  const rule = (a: P, b: P): P[] => [a, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], b];
  /** a rectangle drawn edge by edge in one continuous pen order (top, right, bottom, left) */
  const box = (g: Gfx, r: Rect, t: number, seed: number, o: { w?: number; color?: string; alpha?: number } = {}) => {
    const c: P[] = [
      [r.x, r.y],
      [r.x + r.w, r.y],
      [r.x + r.w, r.y + r.h],
      [r.x, r.y + r.h],
    ];
    for (let k = 0; k < 4; k++) pen(g, rule(c[k]!, c[(k + 1) % 4]!), t * 4 - k, seed + k, o);
  };
  /** diagonal hatching clipped EXACTLY to a rectangle (nothing leaves the block), drawn line by line */
  const hatch = (g: Gfx, r: Rect, t: number, seed: number, alpha: number) => {
    const gap = 13 * s,
      segs: [P, P][] = [];
    for (let c = r.x + r.y + gap * 0.6; c < r.x + r.w + r.y + r.h; c += gap) {
      const xa = Math.max(r.x, c - (r.y + r.h)),
        xb = Math.min(r.x + r.w, c - r.y);
      if (xb - xa > 2 * s)
        segs.push([
          [xa, c - xa],
          [xb, c - xb],
        ]);
    }
    segs.forEach(([a, b], k) =>
      pen(g, rule(b, a), (t * (segs.length + 3) - k) / 3, seed + k * 7, { w: 1.4, alpha: 0.8 * alpha }),
    );
  };
  const mono = (
    ctx: Ctx,
    str: string,
    x: number,
    y: number,
    o: { size?: number; color?: string; align?: CanvasTextAlign; alpha?: number; chars?: number } = {},
  ) => {
    if (o.chars !== undefined && o.chars < 1) return; // (a negative slice would count from the END)
    const shown = o.chars === undefined ? str : str.slice(0, Math.floor(o.chars));
    if (!shown) return;
    const opts = {
      size: (o.size ?? 24) * s,
      family: F_.mono,
      weight: 500,
      color: o.color ?? C.muted,
      track: 0.04,
      alpha: o.alpha ?? 1,
    };
    // typed on from its final left edge, so a centred label does not slide as it grows
    const full = measure(ctx, str, opts),
      left = o.align === "center" ? x - full / 2 : o.align === "right" ? x - full : x;
    text(ctx, shown, left, y, { ...opts, align: "left" });
  };
  const write = (
    g: Gfx,
    str: string,
    x: number,
    y: number,
    cap: number,
    t: number,
    seed: number,
    o: { color?: string; align?: "left" | "center" | "right"; alpha?: number; w?: number } = {},
  ) => {
    if (t <= 0) return;
    letter(g, str, x, y, {
      cap,
      color: o.color ?? C.ink,
      seed,
      align: o.align ?? "left",
      progress: clamp(t),
      opacity: 0.95 * (o.alpha ?? 1),
      w: o.w ?? Math.max(1.9 * s, cap * 0.075),
      track: 1.4,
    });
  };
  const arrow = (g: Gfx, from: P, to: P, bend: number, t: number, seed: number, color: string) => {
    const mx = (from[0] + to[0]) / 2,
      my = (from[1] + to[1]) / 2,
      dx = to[0] - from[0],
      dy = to[1] - from[1],
      l = Math.hypot(dx, dy) || 1;
    const c: P = [mx - (dy / l) * bend, my + (dx / l) * bend],
      pts: P[] = [];
    for (let k = 0; k <= 10; k++) {
      const q = k / 10,
        m = 1 - q;
      pts.push([
        m * m * from[0] + 2 * m * q * c[0] + q * q * to[0],
        m * m * from[1] + 2 * m * q * c[1] + q * q * to[1],
      ]);
    }
    pen(g, pts, t * 1.25, seed, { w: 2.2, color });
    const head = prog(t, 0.8, 1);
    if (head <= 0) return;
    const ax = to[0] - c[0],
      ay = to[1] - c[1],
      al = Math.hypot(ax, ay) || 1,
      ux = ax / al,
      uy = ay / al,
      hl = 16 * s;
    for (const side of [-1, 1])
      pen(
        g,
        [
          to,
          [to[0] - ux * hl * 0.5 - uy * hl * 0.3 * side, to[1] - uy * hl * 0.5 + ux * hl * 0.3 * side],
          [to[0] - ux * hl + -uy * hl * 0.55 * side, to[1] - uy * hl + ux * hl * 0.55 * side],
        ],
        head * 1.5,
        seed + (side > 0 ? 3 : 5),
        { w: 2.2, color },
      );
  };
  const tick = (g: Gfx, c: P, sz: number, t: number, seed: number) =>
    pen(
      g,
      [
        [c[0] - 0.5 * sz, c[1]],
        [c[0] - 0.15 * sz, c[1] + 0.38 * sz],
        [c[0] + 0.6 * sz, c[1] - 0.45 * sz],
      ],
      t,
      seed,
      { w: 3.4, color: C.accent },
    );

  // ---- timings, all derived from the timeline so the score and the picture agree
  const titleStrokes = G.title.lines.map((l) => strokeCount(l));
  const titleAt = (li: number) => {
    const n0 = titleStrokes.slice(0, li).reduce((a, b) => a + b, 0),
      all = titleStrokes.reduce((a, b) => a + b, 0);
    return [6 + (n0 / all) * 52, 6 + ((n0 + titleStrokes[li]!) / all) * 52];
  };
  const who = (i: number) => T.people + 6 + i * 22; // each person starts drawing here
  const laneStart = (i: number) => T.people + 22 + i * 12;
  const blockAt = (i: number, a: number) => T.week + 8 + (a / 40) * 120 + i * 3;
  const scanAt = (F: number) => ((F - (T.scan + 10)) / 90) * 40; // the scan's hour
  const LAND = Math.ceil(T.scan + 10 + ((ANSWER + 1) / 40) * 90); // the scan clears the free hour: the box lands
  const lift = (F: number) => ease.inOutCubic(prog(F, T.invite + 2, T.invite + 28));
  const inv = T.invite + 30; // the card is in place
  const arrowAt = (i: number) => inv + 34 + i * 7,
    checkAt = (i: number) => inv + 46 + i * 7;
  const STAMP = T.sign + 20; // on the beat, once the sheet is whole
  // how present the resolved week is: it steps back while the invite speaks, and half returns for the whole sheet
  const weekAlpha = (F: number) =>
    1 - 0.66 * prog(F, T.invite + 2, T.invite + 22) + 0.3 * prog(F, T.sign + 2, T.sign + 20);

  // ---- 1 · the sheet: grid, border, title
  const grid = (ctx: Ctx, cx: number, cy: number, z: number) => {
    const hw = W / 2 / z,
      hh = H / 2 / z,
      x0 = cx - hw,
      x1 = cx + hw,
      y0 = cy - hh,
      y1 = cy + hh,
      step = 24 * s;
    ctx.lineWidth = 1 / z;
    for (const major of [false, true]) {
      const st = major ? step * 5 : step;
      ctx.strokeStyle = major ? "rgba(143,176,214,0.16)" : "rgba(143,176,214,0.075)";
      ctx.beginPath();
      for (let x = Math.floor(x0 / st) * st; x <= x1; x += st) {
        ctx.moveTo(x, y0);
        ctx.lineTo(x, y1);
      }
      for (let y = Math.floor(y0 / st) * st; y <= y1; y += st) {
        ctx.moveTo(x0, y);
        ctx.lineTo(x1, y);
      }
      ctx.stroke();
    }
  };
  const sheet = (g: Gfx, F: number) => {
    const b = G.border,
      t = prog(F, 0, 60);
    box(g, b, t, 11, { w: 2.4, color: C.muted, alpha: 0.7 });
    box(g, { x: b.x + 12 * s, y: b.y + 12 * s, w: b.w - 24 * s, h: b.h - 24 * s }, prog(F, 10, 70), 21, {
      w: 1.2,
      color: C.muted,
      alpha: 0.5,
    });
    G.title.lines.forEach((l, li) => {
      const [a, e] = titleAt(li);
      write(g, l, G.title.x, G.title.y + li * G.title.gap, G.title.cap, prog(F, a!, e!), 31 + li * 3, {
        w: 3.2 * s,
        align: G.title.align,
      });
    });
    const ty = G.title.y + (G.title.lines.length - 1) * G.title.gap + G.title.cap + 24 * s,
      tw = Math.max(...G.title.lines.map((l) => width(l, G.title.cap, 1.4))) + 24 * s,
      tx = G.title.align === "center" ? G.title.x - tw / 2 + 12 * s : G.title.x;
    pen(g, rule([tx - 6 * s, ty], [tx + tw, ty + 2 * s]), prog(F, 58, 74), 41, { w: 2.6, color: C.accent2 });
    pen(g, rule([tx + 6 * s, ty + 11 * s], [tx + tw * 0.62, ty + 12 * s]), prog(F, 66, 78), 43, {
      w: 1.6,
      color: C.accent2,
    });
  };

  // ---- 2 · the people and their lanes
  const face = (g: Gfx, i: number, F: number) => {
    const p = person(i),
      [hx, hy] = p.head,
      r = p.r,
      f = F - who(i);
    pen(g, oval(hx, hy, r, r * 1.08, 12, -2.2), prog(f, 0, 12), 51 + i * 10, { w: 2.4, closed: true });
    pen(
      g,
      arc(hx, hy + r * 2.55, r * 1.62, r * 1.3, Math.PI + 0.12, 2 * Math.PI - 0.12, 9),
      prog(f, 10, 20),
      52 + i * 10,
      { w: 2.4 },
    );
    // one trait each, so three circles read as three people
    const d = prog(f, 8, 16);
    if (i === 0) pen(g, oval(hx + r * 0.62, hy - r * 0.95, r * 0.34, r * 0.3, 8), d, 53, { w: 2, closed: true }); // a bun
    if (i === 1) {
      pen(g, oval(hx - r * 0.38, hy - r * 0.02, r * 0.26, r * 0.22, 8), d * 2, 63, { w: 1.8, closed: true });
      pen(g, oval(hx + r * 0.38, hy - r * 0.02, r * 0.26, r * 0.22, 8), d * 2 - 1, 64, { w: 1.8, closed: true });
    } // glasses
    if (i === 2)
      pen(
        g,
        [
          [hx - r * 0.95, hy - r * 0.2],
          [hx - r * 0.4, hy - r * 0.62],
          [hx + r * 0.2, hy - r * 0.5],
          [hx + r * 0.95, hy - r * 0.12],
        ],
        d,
        73,
        { w: 2 },
      ); // a fringe
    write(g, PEOPLE[i]!, p.name[0], p.name[1], p.cap, prog(f, 16, 34), 81 + i, { w: 2.6 * s });
  };
  const lanes = (g: Gfx, F: number, a: number) => {
    for (let i = 0; i < 3; i++) {
      const t = prog(F, laneStart(i), laneStart(i) + 56),
        r = cell(i, 0, 40);
      const [p0, p1, q0, q1]: P[] = tall
        ? [
            [r.x, r.y],
            [r.x, r.y + r.h],
            [r.x + r.w, r.y],
            [r.x + r.w, r.y + r.h],
          ]
        : [
            [r.x, r.y],
            [r.x + r.w, r.y],
            [r.x, r.y + r.h],
            [r.x + r.w, r.y + r.h],
          ];
      pen(g, rule(p0!, p1!), t * 1.1, 101 + i * 4, { w: 2, alpha: a });
      pen(g, rule(q0!, q1!), t * 1.1 - 0.1, 102 + i * 4, { w: 2, alpha: a });
      // day dividers across the lane, drawn as the rule passes them
      for (let d = 1; d < 5; d++) {
        const c = cell(i, d * 8, d * 8),
          dt = prog(F, laneStart(i) + 56 * (d / 5), laneStart(i) + 56 * (d / 5) + 8);
        pen(
          g,
          tall ? rule([c.x, c.y], [c.x + G.laneW, c.y]) : rule([c.x, c.y], [c.x, c.y + G.laneW]),
          dt,
          111 + i * 10 + d,
          { w: 1.3, alpha: 0.7 * a },
        );
      }
    }
    // day labels, one hand-lettered word per day, in the order the lanes reach them
    DAYS.forEach((d, k) => {
      const t = prog(F, T.people + 60 + k * 9, T.people + 76 + k * 9);
      const warm = tall && k === Math.floor(ANSWER / 8) ? prog(F, LAND + 2, LAND + 12) : 0;
      if (tall) {
        write(g, d, 128 * s, at(k * 8) + 8 * s, 24 * s, t, 131 + k, { alpha: a * (1 - warm) });
        if (warm > 0)
          write(g, d, 128 * s, at(k * 8) + 8 * s, 24 * s, t, 131 + k, {
            alpha: warm * Math.max(a, 0.6),
            color: C.accent,
          });
      } else write(g, d, at(k * 8 + 4), 208 * s, 26 * s, t, 131 + k, { align: "center", alpha: a });
    });
    // hour ticks on the outside rule
    for (let h = 1; h < 40; h++) {
      if (h % 8 === 0) continue;
      const t = prog(F, T.people + 70 + h * 1.4, T.people + 76 + h * 1.4),
        x = at(h);
      if (tall)
        pen(g, rule([G.lanes[0]! - 12 * s, x], [G.lanes[0]! - 2 * s, x]), t, 141 + h, { w: 1.2, alpha: 0.7 * a });
      else
        pen(g, rule([x, G.lanes[2]! + G.laneW + 2 * s], [x, G.lanes[2]! + G.laneW + 12 * s]), t, 141 + h, {
          w: 1.2,
          alpha: 0.7 * a,
        });
    }
  };
  const hourLabels = (ctx: Ctx, F: number, a: number) => {
    for (let d = 0; d < 5; d++)
      for (const [h, lab] of [
        [0, "9"],
        [3, "12"],
        [6, "3"],
      ] as const) {
        const hh = d * 8 + h,
          own = hh === ANSWER ? 1 - prog(F, LAND, LAND + 6) : 1; // the answer's own label takes this place
        const t = prog(F, T.people + 84 + hh * 1.2, T.people + 90 + hh * 1.2);
        if (t <= 0) continue;
        if (tall) mono(ctx, lab, 262 * s, at(hh) + 9 * s, { size: 24, align: "right", alpha: t * a * own });
        else mono(ctx, lab, at(hh), G.lanes[2]! + G.laneW + 40 * s, { size: 24, align: "center", alpha: t * a * own });
      }
  };

  // ---- 3 · the busy week: each block is outlined, then hatched, as the pen travels the week
  const blocks = (g: Gfx, F: number, a: number) =>
    BUSY.forEach((list, i) =>
      list.forEach(([h0, h1], k) => {
        const t0 = blockAt(i, h0),
          r = cell(i, h0, h1, 12 * s);
        const inset: Rect = {
          x: r.x + (tall ? 0 : 3 * s),
          y: r.y + (tall ? 3 * s : 0),
          w: r.w - (tall ? 0 : 6 * s),
          h: r.h - (tall ? 6 * s : 0),
        };
        box(g, inset, prog(F, t0, t0 + 9), 201 + i * 40 + k * 5, { w: 1.9, alpha: a });
        hatch(g, inset, prog(F, t0 + 5, t0 + 22), 401 + i * 60 + k * 9, a);
      }),
    );

  // ---- 4 · the scan: a cutting-plane line sweeps the week; where all three lanes are free, it leaves the answer
  const scanLine = (g: Gfx, F: number) => {
    const h = scanAt(F),
      show = prog(F, T.scan + 6, T.scan + 12) * (1 - prog(F, T.scan + 102, T.scan + 112));
    if (show <= 0 || h < 0 || h > 40) return;
    const p = at(h),
      lo = G.lanes[0]! - 26 * s,
      hi = G.lanes[2]! + G.laneW + 26 * s;
    pen(g, tall ? rule([lo, p], [hi, p]) : rule([p, lo], [p, hi]), 1, 301, { w: 2.4, color: C.accent2, alpha: show });
    // at each lane: a small ring where it is free, a small cross where it is busy
    for (let i = 0; i < 3; i++) {
      const m = laneMid(i),
        c: P = tall ? [m, p] : [p, m],
        rr = 9 * s,
        free = !busy(i, Math.floor(h));
      if (free) pen(g, oval(c[0], c[1], rr, rr, 8), 1, 311 + i, { w: 2, color: C.accent2, alpha: show, closed: true });
      else {
        pen(g, rule([c[0] - rr, c[1] - rr], [c[0] + rr, c[1] + rr]), 1, 321 + i, {
          w: 2,
          color: C.accent2,
          alpha: show,
        });
        pen(g, rule([c[0] + rr, c[1] - rr], [c[0] - rr, c[1] + rr]), 1, 325 + i, {
          w: 2,
          color: C.accent2,
          alpha: show,
        });
      }
    }
  };
  const scanReadout = (ctx: Ctx, F: number) => {
    const h = scanAt(F),
      show = prog(F, T.scan + 6, T.scan + 12) * (1 - prog(F, T.scan + 102, T.scan + 112));
    if (show <= 0 || h < 0 || h > 40) return;
    const hh = Math.min(39, Math.floor(h)),
      lab = `${DAYS[Math.min(4, Math.floor(hh / 8))]} ${clock(hh)}`;
    if (tall)
      mono(ctx, `SCANNING  ${lab}`, 620 * s, 1474 * s, { size: 26, color: C.accent2, align: "center", alpha: show });
    else
      mono(ctx, lab, clamp(at(h), at(0) + 60 * s, at(40) - 60 * s), G.lanes[2]! + G.laneW + 120 * s, {
        size: 24,
        color: C.accent2,
        align: "center",
        alpha: show,
      });
  };
  const slot = allLanes(ANSWER, ANSWER + 1);
  const answer = (g: Gfx, F: number) => {
    if (F < LAND - 2 || lift(F) > 0) return;
    const t = prog(F, LAND - 2, LAND + 6),
      pad = 6 * s;
    box(g, { x: slot.x - pad, y: slot.y - pad, w: slot.w + 2 * pad, h: slot.h + 2 * pad }, t, 351, {
      w: 3,
      color: C.accent,
    });
  };
  // once the box has lifted, a dashed ghost keeps the place it came from
  const ghost = (g: Gfx, F: number) => {
    const t = prog(F, T.invite + 10, T.invite + 30);
    if (t <= 0) return;
    const pad = 6 * s,
      r = { x: slot.x - pad, y: slot.y - pad, w: slot.w + 2 * pad, h: slot.h + 2 * pad },
      long = tall ? r.w : r.h,
      n = Math.floor(long / (18 * s));
    for (let k = 0; k < n; k++) {
      const a0 = k / n,
        a1 = (k + 0.55) / n;
      for (const side of [0, 1]) {
        const seg: P[] = tall
          ? [
              [r.x + a0 * r.w, r.y + side * r.h],
              [r.x + a1 * r.w, r.y + side * r.h],
            ]
          : [
              [r.x + side * r.w, r.y + a0 * r.h],
              [r.x + side * r.w, r.y + a1 * r.h],
            ];
        pen(g, seg, t * n - k, 355 + k * 2 + side, { w: 1.8, color: C.accent, alpha: 0.7 });
      }
    }
  };
  const answerLabel = (g: Gfx, F: number, a: number) => {
    const t = prog(F, LAND + 2, LAND + 18);
    // the vertical's day column already says THU: the answer takes the place of its "3" and the day warms to the accent
    if (tall)
      write(g, clock(ANSWER), 254 * s, at(ANSWER) - 11 * s, 22 * s, t, 361, {
        color: C.accent,
        align: "right",
        w: 2.4 * s,
        alpha: a,
      });
    else
      write(g, ANSWER_LABEL, at(ANSWER + 0.5), G.lanes[2]! + G.laneW + 58 * s, 28 * s, t, 361, {
        color: C.accent,
        align: "center",
        w: 2.6 * s,
        alpha: a,
      });
  };

  // ---- 5 · the invite: the box lifts off the week into a card; arrows go to the three people; each gets a check
  const cardRect = (F: number): Rect => {
    const k = lift(F),
      pad = 6 * s,
      a: Rect = { x: slot.x - pad, y: slot.y - pad, w: slot.w + 2 * pad, h: slot.h + 2 * pad },
      b = G.card;
    return { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), w: lerp(a.w, b.w, k), h: lerp(a.h, b.h, k) };
  };
  const cardInk = (g: Gfx, F: number) => {
    if (lift(F) <= 0) return;
    const r = cardRect(F),
      c = G.card,
      x = c.x + 40 * s;
    box(g, r, 1, 351, { w: 3, color: C.accent });
    // a folded corner, so the box reads as a sheet laid on the drawing
    const fc = prog(F, inv, inv + 8),
      k = 26 * s;
    pen(
      g,
      [
        [c.x + c.w - k, c.y],
        [c.x + c.w - k, c.y + k],
        [c.x + c.w, c.y + k],
      ],
      fc,
      371,
      { w: 2, color: C.accent },
    );
    pen(g, rule([x, c.y + 104 * s], [c.x + c.w - 40 * s, c.y + 104 * s]), prog(F, inv + 6, inv + 16), 373, {
      w: 1.3,
      color: C.muted,
    });
    write(g, INVITE, x, c.y + 132 * s, 44 * s, prog(F, inv + 4, inv + 24), 381, { color: C.accent, w: 3 * s });
    write(g, PEOPLE.join(", "), x, c.y + 206 * s, 28 * s, prog(F, inv + 20, inv + 34), 385, { w: 2.4 * s });
    for (let i = 0; i < 3; i++) {
      const p = person(i),
        from: P = tall ? [G.lanes[i]! + G.laneW / 2, c.y - 6 * s] : [c.x - 6 * s, c.y + (70 + i * 80) * s];
      arrow(
        g,
        from,
        p.tip,
        (tall ? [-24, 0, 24][i]! : [18, 0, -18][i]!) * s,
        prog(F, arrowAt(i), arrowAt(i) + 14),
        391 + i * 9,
        C.ink,
      );
      tick(g, p.check, 30 * s, prog(F, checkAt(i), checkAt(i) + 8), 421 + i);
    }
  };
  const cardText = (ctx: Ctx, F: number) => {
    if (F < inv) return;
    const c = G.card,
      x = c.x + 40 * s;
    mono(ctx, "INVITE · 60 MIN", x, c.y + 70 * s, { size: 24, color: C.muted, chars: (F - inv) * 1.4 });
    mono(ctx, "sent by Oriel · 3 of 3 free", x, c.y + 270 * s, {
      size: 24,
      color: C.muted,
      chars: (F - inv - 34) * 1.6,
    });
  };

  // ---- 6 · the sign-off: the whole sheet, and a stamp
  const stamp = (ctx: Ctx, F: number) => {
    const f = F - STAMP;
    if (f < 0) return;
    const k = 1 + 0.5 * Math.exp(-f / 2.2) * Math.cos(f * 0.9) * (f < 8 ? 1 : 0),
      a = clamp(f / 3),
      sw = 500 * s,
      sh = 126 * s,
      { x, y } = G.stamp;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.045);
    ctx.scale(Math.max(1, k), Math.max(1, k));
    ctx.globalAlpha = a;
    ctx.strokeStyle = C.accent2;
    ctx.lineWidth = 3 * s;
    ctx.strokeRect(-sw / 2, -sh / 2, sw, sh);
    ctx.lineWidth = 1.5 * s;
    ctx.strokeRect(-sw / 2 + 8 * s, -sh / 2 + 8 * s, sw - 16 * s, sh - 16 * s);
    ctx.restore();
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.045);
    ctx.scale(Math.max(1, k), Math.max(1, k));
    text(ctx, P_.product.toUpperCase(), 0, -2 * s, {
      size: 46 * s,
      family: F_.sans,
      weight: 800,
      color: C.accent2,
      align: "center",
      track: 0.24,
      alpha: a,
    });
    text(ctx, "fictional · drawn in code", 0, 38 * s, {
      size: 24 * s,
      family: F_.mono,
      weight: 500,
      color: C.accent2,
      align: "center",
      track: 0.04,
      alpha: a,
    });
    ctx.restore();
  };

  const paint = (ctx: Ctx, env: Env, F: number) => {
    F = clamp(F, 0, N - 1);
    ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
    ctx.fillStyle = C.ground;
    ctx.fillRect(0, 0, W, H);
    const { x, y, z } = cam(F),
      g = new Gfx(ctx, env, Math.floor(F), PEN),
      wa = weekAlpha(F);
    g.push(W / 2 - x * z, H / 2 - y * z, z); // the camera: one transform over the whole sheet
    grid(ctx, x, y, z);
    // the drawing, in one ink pass (a soft bloom under white ink on blue, the tooth of the sheet on top)
    g.inkGroup(
      () => {
        sheet(g, F);
        for (let i = 0; i < 3; i++) face(g, i, F);
        lanes(g, F, wa);
        blocks(g, F, wa);
        scanLine(g, F);
        answer(g, F);
        ghost(g, F);
        answerLabel(g, F, F >= T.invite ? Math.max(wa, 0.5) : 1);
      },
      { blur: 1.6 * s * z, alpha: 0.3 },
    );
    hourLabels(ctx, F, wa);
    // the sheet's reference line steps out while the invite is framed close, and returns with the whole sheet
    mono(ctx, "SHEET 05 · WEEK 38", G.meta.x, G.meta.y, {
      size: 24,
      align: G.meta.align,
      chars: (F - T.people - 10) * 1.2,
      alpha: tall ? 1 : 1 - prog(F, T.invite, T.invite + 14) + prog(F, T.sign + 4, T.sign + 20),
    });
    scanReadout(ctx, F);
    // the card is a sheet laid ON the drawing: it hides what is under it, then its own ink goes on top
    if (lift(F) > 0) {
      const r = cardRect(F);
      g.fill(
        [
          [r.x, r.y],
          [r.x + r.w, r.y],
          [r.x + r.w, r.y + r.h],
          [r.x, r.y + r.h],
        ],
        C.ground,
        1,
      );
    }
    if (lift(F) <= 0 && F >= LAND) {
      const pad = 6 * s;
      ctx.fillStyle = C.accent;
      ctx.globalAlpha = 0.2 * prog(F, LAND, LAND + 8);
      ctx.fillRect(slot.x - pad, slot.y - pad, slot.w + 2 * pad, slot.h + 2 * pad);
      ctx.globalAlpha = 1;
    }
    g.inkGroup(() => cardInk(g, F), { blur: 1.6 * s * z, alpha: 0.3 });
    cardText(ctx, F);
    stamp(ctx, F);
    g.pop();
  };

  // ---- sound: pencil scratches as ticks while strokes go on, a hit when the answer lands, the sign-off with the stamp
  const ticks: number[] = [];
  const titleAll = titleStrokes.reduce((a, b) => a + b, 0);
  for (let k = 0; k < titleAll; k += 3) ticks.push(Math.round(6 + (k / titleAll) * 52));
  for (let i = 0; i < 3; i++) ticks.push(who(i), who(i) + 10, who(i) + 18, who(i) + 26);
  BUSY.forEach((list, i) => list.forEach(([h0]) => ticks.push(Math.round(blockAt(i, h0)))));
  for (let i = 0; i < 3; i++) ticks.push(arrowAt(i), checkAt(i) + 2);
  ticks.push(inv + 4, inv + 20);
  const cuts = [T.title, T.people, T.week, T.scan, T.invite, T.sign, N],
    names = ["title", "people", "week", "scan", "invite", "signoff"];
  const shots: Shot[] = names.map((sid, i) => ({
    id: sid,
    start: cuts[i]!,
    end: cuts[i + 1]!,
    draw: (ctx, local, env) => paint(ctx, env, cuts[i]! + local),
  }));
  return {
    meta: { title: id, W, H, fps: FPS, bpm: BPM, durationFrames: N, raster: "cpu" },
    assets: { images: {}, fonts: P_.assets },
    shots,
    audio: beatScore({
      frames: N,
      fps: FPS,
      bpm: BPM,
      mood: "soft",
      key: 3,
      gain: 0.74,
      hits: [LAND],
      whooshes: [T.invite + 28, T.sign + 20],
      ticks: [...new Set(ticks)].sort((a, b) => a - b),
      sign: STAMP,
    }),
  };
}

export const sketchExplainer = make("landscape", "sketchExplainer");
export const sketchExplainerVertical = make("vertical", "sketchExplainerVertical");
