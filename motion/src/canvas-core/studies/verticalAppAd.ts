// STUDY 02 · VERTICAL APP AD (30 s, 30 fps, 100 bpm). The creator-explainer app-ad format with the presenter
// taken out: the product's own UI is the set. White cards float on a stone ground with big soft shadows, a phone
// fills with a group chat, a deep-green countdown stack lifts away, and serif captions arrive word by word with
// one key word in the accent italic. Flat colour; depth from shadow only. Oriel is a fictional product.
// Brief: series/studies/briefs/vertical-app-ad.json · prompt: series/studies/prompts/vertical-app-ad.prompt.md
//
// The whole film is one continuous function paint(F) of a (fractional) frame F; the shots only name the sections.
import PACK from "../../../brand/packs/studio/pack.json";
import type { Ctx, Env } from "../core";
import type { Film, Shot } from "../film";
import { motionBlur } from "../kit/blur";
import { clamp, ease, lerp, prog, spring } from "../kit/motion";
import { usePack } from "../kit/pack";
import { beatScore } from "../kit/score";
import { layout, type Size } from "../kit/sizes";
import { measure, text, type TextOpts } from "../kit/type";
import { card, check, phone, rr } from "../kit/ui";

const P = usePack(PACK),
  C = P.palette("sage"),
  F_ = P.face,
  DEEP = C.deep!;
const FPS = 30,
  BPM = 100,
  N = 900; // a beat is 18 frames, a bar 72
// the timeline, in frames (every cut on a beat)
const T = { problem: 72, turn: 216, reveal: 270, work: 360, done: 576, payoff: 720, end: 828 };
const TAU = Math.PI * 2;

// ---- the cast: you and three invented teammates (initials only, no people)
const WHO = [
  { name: "You", fill: C.accent, ink: C.surface },
  { name: "Ana", fill: C.accent2, ink: C.ink },
  { name: "Ben", fill: C.line, ink: C.ink },
  { name: "Kai", fill: DEEP, ink: C.surface },
];
// the group chat: twelve messages to find one hour
const MSG: [number, string][] = [
  [0, "Can we find an hour next week?"],
  [1, "Tuesday?"],
  [2, "Can't. Wed?"],
  [3, "Wed I'm out."],
  [1, "Thu after 3?"],
  [2, "Thu works"],
  [3, "Only till 4"],
  [0, "3 to 4 then?"],
  [1, "Wait, which Thu?"],
  [2, "Next week"],
  [3, "Sorry, lost track"],
  [1, "Who sends the invite?"],
];
const msgAt = (i: number) => T.problem + 12 + i * 9; // one bubble every half beat
// availability, Mon–Fri, eight hours (9–5) each; busy hours per person. Thu 3–4 (hour 6) is the only overlap.
const BUSY: number[][][] = [
  [
    [0, 1, 2, 5, 6],
    [1, 2, 3, 4, 6, 7],
    [0, 3, 4, 5, 6, 7],
    [0, 1, 2, 3, 7],
    [0, 1, 2, 3, 4, 5, 6, 7],
  ],
  [
    [3, 4, 5, 6, 7],
    [0, 1, 5, 6, 7],
    [0, 1, 2, 3, 4, 5, 6, 7],
    [2, 3, 4, 5, 7],
    [0, 1, 6, 7],
  ],
  [
    [0, 1, 2, 3, 4],
    [2, 3, 4, 5, 6, 7],
    [0, 1, 2, 5, 6, 7],
    [0, 1, 3, 4, 5, 7],
    [2, 3, 4, 5],
  ],
];
const DAYS = ["MON", "TUE", "WED", "THU", "FRI"],
  THU = 3,
  SLOT = 6;
const PROMPT = "Find an hour with Ana, Ben and Kai next week.";
// cue frames, shared by picture and sound
const CUE = {
  rows: [T.work, T.work + 12, T.work + 24],
  scan: 432,
  lit: 468,
  slot: 504,
  held: 522,
  lifts: [T.turn + 18, T.turn + 36, T.reveal],
  promptIn: 288,
  typeFrom: 296,
  send: 342,
  fly: 600,
  avatars: [612, 618, 624],
  checks: [642, 660, 678],
  toast: 690,
};

// ---- captions: words with their own size and face on shared lines
type Wd = { s: string; size: number; it?: boolean; acc?: boolean; at: number };
type Box = { x: number; y: number; w: number; align: "center" | "left" };
type Placed = { wd: Wd; x: number; y: number; size: number };
const wo = (wd: Wd, size: number): TextOpts => ({
  size,
  family: wd.it ? F_.italic : F_.serif,
  weight: 400,
  track: -0.012,
});

const mix = (a: string, b: string, t: number) => {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const A = p(a),
    B = p(b);
  return `#${A.map((v, i) =>
    Math.round(lerp(v, B[i]!, clamp(t)))
      .toString(16)
      .padStart(2, "0"),
  ).join("")}`; // hex, so mixes nest
};

export function make(size: Size, id: string): Film {
  const L = layout(size),
    { W, H, u, cx, cy, tall } = L;
  let S = 1; // device pixels per logical pixel: canvas shadows ignore the transform, so they scale by hand
  // where things live: vertical stacks captions (top third) over the UI; landscape puts the UI left, captions right
  const stage = tall ? { x: cx, y: 1130 * u } : { x: 480 * u, y: cy };
  const capBox: Box = tall
    ? { x: cx, y: 430 * u, w: W - 2 * L.safe.x, align: "center" }
    : { x: 1010 * u, y: cy, w: W - 1010 * u - L.safe.x, align: "left" };
  const fullBox: Box = { x: cx, y: cy, w: W - 2 * L.safe.x, align: "center" };

  // ---- drawing helpers
  const float = (ctx: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string, lift = 1) => {
    card(ctx, x, y, w, h, {
      r,
      fill,
      shadow: { blur: 64 * u * S * lift, y: 26 * u * S * lift, color: "rgba(21,58,42,0.15)" },
    });
    card(ctx, x, y, w, h, { r, fill, shadow: { blur: 6 * u * S, y: 2 * u * S, color: "rgba(21,58,42,0.10)" } });
  };
  const around = (ctx: Ctx, x: number, y: number, k: number, rot: number, fn: () => void) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(k, k);
    ctx.translate(-x, -y);
    fn();
    ctx.restore();
  };
  const disc = (ctx: Ctx, x: number, y: number, r: number, fill: string) => {
    if (r <= 0) return;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fillStyle = fill;
    ctx.fill();
  };
  const sans = (sz: number, weight = 400, color = C.ink, align: CanvasTextAlign = "left"): TextOpts => ({
    size: sz * u,
    family: F_.sans,
    weight,
    color,
    align,
    track: -0.01,
  });
  const mono = (sz: number, color = C.muted, align: CanvasTextAlign = "left"): TextOpts => ({
    size: sz * u,
    family: F_.mono,
    weight: 500,
    color,
    align,
    track: 0.08,
  });
  const bob = (F: number, seed: number, amp = 6) => Math.sin((F / 96 + seed) * TAU) * amp * u; // every hold keeps floating
  const avatar = (ctx: Ctx, x: number, y: number, r: number, who: number) => {
    const p = WHO[who]!;
    disc(ctx, x, y, r, p.fill);
    text(ctx, p.name[0]!, x, y + r * 0.36, { size: r * 1.05, family: F_.serif, color: p.ink, align: "center" });
  };
  const wrap = (ctx: Ctx, s: string, o: TextOpts, maxW: number) => {
    const out: string[] = [];
    let line = "";
    for (const w of s.split(" ")) {
      const next = line ? `${line} ${w}` : w;
      if (line && measure(ctx, next, o) > maxW) {
        out.push(line);
        line = w;
      } else line = next;
    }
    if (line) out.push(line);
    return out;
  };

  // lay caption lines out in a box: each line shrinks to fit the width, the block centres on box.y
  const place = (ctx: Ctx, lines: Wd[][], box: Box): Placed[] => {
    const rows = lines.map((line) => {
      const gapOf = (i: number, k: number) => (i ? 0.24 * Math.min(line[i - 1]!.size, line[i]!.size) * u * k : 0);
      const width = (k: number) =>
        line.reduce((a, wd, i) => a + gapOf(i, k) + measure(ctx, wd.s, wo(wd, wd.size * u * k)), 0);
      const k = Math.min(1, box.w / width(1)),
        lh = Math.max(...line.map((wd) => wd.size)) * u * k;
      return { line, k, lh, total: width(k), gapOf };
    });
    const height = rows.reduce((a, r) => a + r.lh * 0.98, 0),
      out: Placed[] = [];
    let top = box.y - height / 2;
    for (const r of rows) {
      const base = top + r.lh * 0.76;
      let x = box.align === "center" ? box.x - r.total / 2 : box.x;
      r.line.forEach((wd, i) => {
        x += r.gapOf(i, r.k);
        const sz = wd.size * u * r.k;
        out.push({ wd, x, y: base, size: sz });
        x += measure(ctx, wd.s, wo(wd, sz));
      });
      top += r.lh * 0.98;
    }
    return out;
  };
  // one word: rises and fades in on its frame; "pop" scales from its centre with an overshoot
  const word = (ctx: Ctx, F: number, p: Placed, alpha = 1, how: "rise" | "pop" = "rise", color?: string) => {
    const k = spring((F - p.wd.at) / FPS, how === "pop" ? { freq: 2.2, damp: 0.5 } : { freq: 2.4, damp: 0.72 });
    if (k <= 0) return;
    const o = { ...wo(p.wd, p.size), color: color ?? (p.wd.acc ? C.accent : C.ink), alpha: clamp(k * 1.6) * alpha };
    if (how === "pop") {
      const w = measure(ctx, p.wd.s, o);
      around(ctx, p.x + w / 2, p.y - p.size * 0.32, lerp(0.55, 1, k), 0, () => text(ctx, p.wd.s, p.x, p.y, o));
    } else text(ctx, p.wd.s, p.x, p.y + (1 - k) * 0.32 * p.size, o);
  };
  type Cap = { from: number; to: number; lines: Wd[][] };
  const caption = (ctx: Ctx, F: number, cap: Cap, box = capBox) => {
    if (F < cap.from - 1 || F > cap.to) return;
    const out = ease.inCubic(prog(F, cap.to - 10, cap.to)),
      drift = -16 * u * prog(F, cap.from, cap.to) - out * 26 * u;
    ctx.save();
    ctx.translate(0, drift);
    for (const p of place(ctx, cap.lines, box)) word(ctx, F, p, 1 - out);
    ctx.restore();
  };

  // ---- the set: concentric rings, always there, breathing; they follow the action and re-centre for the close
  const RINGS = [260, 380, 500, 640];
  const ringCentre = (F: number) => {
    const t = ease.inOutCubic(prog(F, 60, 96)) * (1 - ease.inOutCubic(prog(F, 700, 730)));
    return [lerp(cx, stage.x, t), lerp(cy, stage.y, t)] as const;
  };
  const ringScale = (F: number) =>
    F < T.end - 14
      ? 1
      : F < T.end
        ? 1 - 0.85 * ease.inCubic(prog(F, T.end - 14, T.end))
        : lerp(0.15, 1, spring((F - T.end) / FPS, { freq: 1.6, damp: 0.7 }));
  const rings = (ctx: Ctx, F: number) => {
    const [x, y] = ringCentre(F),
      k =
        ringScale(F) *
        lerp(0.6, 1, spring(F / FPS, { freq: 1.2, damp: 0.8 })) *
        (tall ? lerp(1, 0.84, (y - cy) / (stage.y - cy)) : 1);
    RINGS.forEach((r0, i) => {
      const r = r0 * u * k * (1 + 0.014 * Math.sin((F / 80 + i * 0.3) * TAU));
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.strokeStyle = C.line;
      ctx.lineWidth = 2.5 * u;
      ctx.stroke();
      // one bead per ring, orbiting (alternate directions): ambient motion under every hold
      const a = i * 1.9 + (F / FPS) * (i % 2 ? -0.22 : 0.3);
      // beads rest while full-screen type holds the frame, so nothing crosses the words
      // (and under the end card); they also slip under the day labels rather than cross them
      const by = y + Math.sin(a) * r,
        band =
          F > T.work - 10 && F < T.done + 30
            ? rowsTop + 16 * u
            : F > T.done + 30
              ? stage.y - (tall ? 90 : 60) * u + (tall ? 96 : 84) * u + 52 * u
              : NaN;
      const labels = Number.isNaN(band) ? 1 : clamp((Math.abs(by - band) - 24 * u) / (30 * u));
      const bead = Math.min(prog(F, 84, 100), 1 - prog(F, 700, 716)) * labels;
      if (bead > 0) {
        ctx.save();
        ctx.globalAlpha = bead;
        disc(ctx, x + Math.cos(a) * r, by, 7 * u, i === 1 ? C.accent : C.muted);
        ctx.restore();
      }
    });
  };

  // ---- 00 hook: "Finding one hour", small calendar cards orbiting the rings
  const ORBIT = tall
    ? ([
        [1, 255, "TUE", 14],
        [1, 285, "WED", 15],
        [1, 75, "THU", 16],
        [1, 105, "FRI", 17],
        [2, 225, "MON", 13],
        [2, 300, "MON", 20],
        [2, 45, "TUE", 21],
        [2, 125, "WED", 22],
      ] as const)
    : ([
        [1, 240, "TUE", 14],
        [1, 275, "WED", 15],
        [1, 60, "THU", 16],
        [1, 95, "FRI", 17],
        [3, 20, "MON", 13],
        [3, 340, "MON", 20],
        [3, 160, "TUE", 21],
        [3, 200, "WED", 22],
      ] as const);
  const calCard = (ctx: Ctx, x: number, y: number, day: string, n: number, k: number, rot: number) => {
    const w = 120 * u,
      h = 138 * u;
    around(ctx, x, y, k, rot, () => {
      float(ctx, x - w / 2, y - h / 2, w, h, 20 * u, C.surface, 0.6);
      ctx.save();
      rr(ctx, x - w / 2, y - h / 2, w, h, 20 * u);
      ctx.clip();
      ctx.fillStyle = C.accent;
      ctx.fillRect(x - w / 2, y - h / 2, w, 40 * u);
      ctx.restore();
      text(ctx, day, x, y - h / 2 + 29 * u, mono(22, C.surface, "center"));
      text(ctx, String(n), x, y + 48 * u, { size: 70 * u, family: F_.serif, color: C.ink, align: "center" });
    });
  };
  const hookLines: Wd[][] = tall
    ? [
        [{ s: "Finding", size: 200, at: 0 }],
        [
          { s: "one", size: 250, it: true, acc: true, at: 18 },
          { s: "hour", size: 250, it: true, acc: true, at: 36 },
        ],
      ]
    : [
        [{ s: "Finding", size: 190, at: 0 }],
        [
          { s: "one", size: 240, it: true, acc: true, at: 18 },
          { s: "hour", size: 240, it: true, acc: true, at: 36 },
        ],
      ];
  const probCap: Cap = {
    from: 94,
    to: T.turn - 4,
    lines: [
      [
        { s: "Finding", size: 72, at: -99 },
        { s: "one", size: 72, it: true, at: -99 },
        { s: "hour", size: 72, it: true, at: -99 },
      ],
      [
        { s: "takes", size: 96, at: 144 },
        { s: "twelve", size: 170, it: true, acc: true, at: 162 },
        { s: "messages.", size: 96, at: 180 },
      ],
    ],
  };
  const hookPush = (F: number) => 1 + 0.05 * ease.outCubic(prog(F, 0, T.problem));
  const hook = (ctx: Ctx, F: number) => {
    if (F >= 94) return;
    const [rx, ry] = ringCentre(F);
    // the cards: land staggered, orbit, then fling outward as the phone arrives
    ORBIT.forEach(([ring, deg, day, n], i) => {
      const land = spring((F - 2 - i * 3) / FPS, { freq: 2.2, damp: 0.6 }),
        fling = ease.inCubic(prog(F, 52 + i * 1.5, 72 + i * 1.5));
      if (land <= 0 || fling >= 1) return;
      const r =
          RINGS[ring]! * u * ringScale(F) * lerp(0.6, 1, spring(F / FPS, { freq: 1.2, damp: 0.8 })) * (1 + fling * 0.9),
        a = (deg * Math.PI) / 180 + (F / FPS) * 0.14; // one direction: the cards keep their spacing
      calCard(
        ctx,
        rx + Math.cos(a) * r,
        ry + Math.sin(a) * r,
        day,
        n,
        land * (1 - fling * 0.3),
        Math.sin(a * 2) * 0.12,
      );
    });
    // the words: huge, then (from the cut) they shrink into the caption's first line
    const A = place(ctx, hookLines, fullBox),
      B = place(ctx, probCap.lines, capBox),
      push = hookPush(F);
    const t = ease.inOutCubic(prog(F, T.problem, 94));
    A.forEach((a, i) => {
      const b = B[i]!,
        ax = cx + (a.x - cx) * push,
        ay = cy + (a.y - cy) * push;
      const p: Placed = { wd: a.wd, x: lerp(ax, b.x, t), y: lerp(ay, b.y, t), size: lerp(a.size * push, b.size, t) };
      word(ctx, F, p, 1, "rise", a.wd.acc ? mix(C.accent, C.ink, t) : C.ink);
    });
  };

  // ---- 01 problem: a phone fills with a group chat; a counter ticks up to 12
  const pw = (tall ? 430 : 380) * u,
    ph = pw * 2.05;
  const chat = (ctx: Ctx, F: number) => {
    if (F < T.problem || F > T.turn) return;
    const rise = spring((F - T.problem) / FPS, { freq: 1.5, damp: 0.78 }),
      sink = ease.inCubic(prog(F, T.turn - 26, T.turn - 6));
    const px = stage.x - pw / 2 - (tall ? 0 : 40 * u),
      py = stage.y - ph / 2 + (1 - rise) * H * 0.75 + sink * H * 0.8 + bob(F, 0.1, 5);
    const s = phone(ctx, px, py, pw, {
      body: C.ink,
      screen: mix(C.ground, C.surface, 0.55),
      shadow: { blur: 90 * u * S, y: 40 * u * S, color: "rgba(21,58,42,0.22)" },
    });
    ctx.save();
    rr(ctx, s.x, s.y, s.w, s.h, s.r);
    ctx.clip();
    // header: the group
    text(ctx, "Next week", s.x + s.w / 2, s.y + 104 * u, sans(28, 600, C.ink, "center"));
    text(ctx, "Ana, Ben, Kai and you", s.x + s.w / 2, s.y + 136 * u, sans(22, 400, C.muted, "center"));
    ctx.fillStyle = C.line;
    ctx.fillRect(s.x, s.y + 158 * u, s.w, 2 * u);
    // the bubbles, bottom-anchored: each new one pushes the stack up on a spring
    const bo = sans(25),
      lh = 33 * u,
      maxW = s.w * 0.66,
      pad = 18 * u,
      top = s.y + 160 * u,
      bottom = s.y + s.h - 104 * u;
    const bubbles = MSG.map(([who, msg]) => {
      const lines = wrap(ctx, msg, bo, maxW - 2 * pad);
      return {
        who,
        lines,
        h: lines.length * lh + 2 * pad - 6 * u,
        w: Math.max(...lines.map((l) => measure(ctx, l, bo))) + 2 * pad,
      };
    });
    let yb = bottom;
    ctx.save();
    ctx.beginPath();
    ctx.rect(s.x, top, s.w, bottom - top + 4 * u);
    ctx.clip();
    for (let i = MSG.length - 1; i >= 0; i--) {
      const b = bubbles[i]!,
        k = spring((F - msgAt(i)) / FPS, { freq: 2.6, damp: 0.7 });
      if (k <= 0) continue;
      const y = yb - b.h;
      yb -= (b.h + 14 * u) * clamp(k); // the stack above makes room as it arrives
      if (y + b.h < top) break;
      const mine = b.who === 0,
        bx = mine ? s.x + s.w - 22 * u - b.w : s.x + 76 * u;
      around(ctx, mine ? bx + b.w : bx, y + b.h, lerp(0.6, 1, k), 0, () => {
        ctx.save();
        ctx.globalAlpha = clamp(k * 2);
        if (!mine) avatar(ctx, s.x + 44 * u, y + b.h - 22 * u, 22 * u, b.who);
        card(ctx, bx, y, b.w, b.h, {
          r: 24 * u,
          fill: mine ? C.accent : C.surface,
          shadow: mine ? undefined : { blur: 10 * u * S, y: 3 * u * S, color: "rgba(21,58,42,0.10)" },
        });
        b.lines.forEach((l, j) =>
          text(ctx, l, bx + pad, y + pad + 22 * u + j * lh, { ...bo, color: mine ? C.surface : C.ink }),
        );
        ctx.restore();
      });
    }
    ctx.restore();
    // the input bar
    card(ctx, s.x + 22 * u, s.y + s.h - 84 * u, s.w - 44 * u, 58 * u, {
      r: 29 * u,
      fill: C.surface,
      stroke: C.line,
      lw: 2 * u,
    });
    text(ctx, "Message", s.x + 48 * u, s.y + s.h - 46 * u, sans(23, 400, C.muted));
    ctx.restore();
    // the counter floats over the phone's corner (depth by shadow): it counts every message
    const cIn = spring((F - (T.problem + 18)) / FPS, { freq: 2, damp: 0.6 }),
      n = MSG.filter((_, i) => F >= msgAt(i)).length;
    if (cIn > 0) {
      const last = n ? msgAt(n - 1) : 0,
        pop = 1 + 0.16 * (1 - spring((F - last) / FPS, { freq: 3, damp: 0.5 })) * (n ? 1 : 0);
      const cw = 250 * u,
        chh = 150 * u,
        kx = px + pw - 90 * u,
        ky = py - 40 * u + bob(F, 0.6, 7);
      around(ctx, kx + cw / 2, ky + chh / 2, cIn, 0.05 * (1 - cIn), () => {
        float(ctx, kx, ky, cw, chh, 30 * u, C.surface);
        text(ctx, "MESSAGES", kx + 30 * u, ky + 46 * u, mono(22));
        around(ctx, kx + 30 * u, ky + 120 * u, pop, 0, () =>
          text(ctx, String(n), kx + 28 * u, ky + 124 * u, {
            size: 84 * u,
            family: F_.serif,
            color: n >= 12 ? C.accent : C.ink,
          }),
        );
      });
    }
  };

  // ---- 02 turn: a 3-2-1 stack of deep-green cards lifts away to reveal the app icon; a prompt is typed
  const mark = (ctx: Ctx, x: number, y: number, s: number, lit = 1) => {
    float(ctx, x - s / 2, y - s / 2, s, s, s * 0.25, DEEP, 0.9);
    // an oriel: an arched bay window with four panes; one pane is the hour it found
    const aw = s * 0.46,
      ah = s * 0.56,
      ax = x - aw / 2,
      ay = y - ah / 2 + s * 0.02,
      lw = s * 0.035;
    ctx.beginPath();
    ctx.moveTo(ax, ay + ah);
    ctx.lineTo(ax, ay + aw / 2);
    ctx.arc(x, ay + aw / 2, aw / 2, Math.PI, 0);
    ctx.lineTo(ax + aw, ay + ah);
    ctx.closePath();
    ctx.fillStyle = C.accent2;
    ctx.fill();
    const my = ay + ah * 0.56;
    ctx.save();
    ctx.globalAlpha *= clamp(lit);
    ctx.fillStyle = C.accent;
    ctx.fillRect(x + lw / 2, my + lw / 2, aw / 2 - lw / 2, ay + ah - my - lw / 2);
    ctx.restore();
    ctx.fillStyle = DEEP;
    ctx.fillRect(x - lw / 2, ay, lw, ah);
    ctx.fillRect(ax, my - lw / 2, aw, lw);
  };
  const cdW = (tall ? 420 : 330) * u,
    cdH = cdW * 1.22;
  const iconS = (tall ? 250 : 200) * u,
    iconUp = (tall ? 250 : 200) * u;
  const promptW = (tall ? 900 : 800) * u,
    promptH = 220 * u;
  const turnSection = (ctx: Ctx, F: number) => {
    if (F < T.turn - 9 || F > T.work + 16) return;
    // the icon waits under the stack; it pops as the last card lifts, then rises to make room for the prompt
    const pop = spring((F - T.reveal) / FPS, { freq: 2.2, damp: 0.5 }),
      up = ease.inOutCubic(prog(F, CUE.promptIn - 10, CUE.promptIn + 14));
    const leave = ease.inCubic(prog(F, T.work - 16, T.work + 2));
    const iy = stage.y - up * iconUp + bob(F, 0.3, 5);
    if (pop > 0) {
      ctx.save();
      ctx.globalAlpha = 1 - leave;
      around(ctx, stage.x, iy, lerp(0.4, 1, pop) * (1 - 0.4 * leave), 0, () =>
        mark(ctx, stage.x, iy, iconS, prog(F, T.reveal + 10, T.reveal + 26)),
      );
      ctx.restore();
    }
    // the countdown stack (back to front); each card lifts off on its beat and the rest step forward
    const enter = spring((F - (T.turn - 8)) / FPS, { freq: 2, damp: 0.68 }); // lands on the cut, under the whoosh
    for (let i = 2; i >= 0; i--) {
      const gone = ease.inCubic(prog(F, CUE.lifts[i]!, CUE.lifts[i]! + 14));
      if (gone >= 1) continue;
      let depth = i;
      for (let k = 0; k < i; k++) depth -= spring((F - CUE.lifts[k]!) / FPS, { freq: 2.6, damp: 0.72 });
      const kx = stage.x,
        ky = stage.y + depth * 40 * u + (1 - enter) * 220 * u - gone * H * 0.8,
        k = (1 - depth * 0.07) * lerp(0.75, 1, enter);
      ctx.save();
      ctx.globalAlpha = clamp(enter * 2);
      around(ctx, kx, ky, k, -0.3 * gone + (i - 1) * 0.02 * (1 - gone), () => {
        float(ctx, kx - cdW / 2, ky - cdH / 2, cdW, cdH, 44 * u, DEEP, 1 + gone);
        text(ctx, String(3 - i), kx, ky + cdH * 0.2, {
          size: cdH * 0.62,
          family: F_.serif,
          color: C.surface,
          align: "center",
        });
      });
      ctx.restore();
    }
    // the prompt card: slides up, types, sends
    const pin = spring((F - CUE.promptIn) / FPS, { freq: 1.8, damp: 0.72 });
    if (pin > 0) {
      const x = stage.x - promptW / 2,
        y = stage.y + (tall ? 90 : 70) * u + (1 - pin) * 160 * u + bob(F, 0.8, 4) - leave * 80 * u;
      ctx.save();
      ctx.globalAlpha = clamp(pin * 2) * (1 - leave);
      float(ctx, x, y, promptW, promptH, 34 * u, C.surface);
      text(ctx, "ASK ORIEL", x + 40 * u, y + 56 * u, mono(22, C.accent));
      const o = sans(36, 400),
        lines = wrap(ctx, PROMPT, o, promptW - 180 * u);
      let left = Math.floor(clamp((F - CUE.typeFrom) / (CUE.send - 6 - CUE.typeFrom)) * PROMPT.length),
        cx0 = x + 40 * u,
        cy0 = y + 112 * u;
      lines.forEach((l, j) => {
        const shown = l.slice(0, Math.max(0, left));
        left -= l.length + 1;
        text(ctx, shown, x + 40 * u, y + 112 * u + j * 48 * u, o);
        if (shown.length && (left < 0 || j === lines.length - 1)) {
          cx0 = x + 40 * u + measure(ctx, shown, o) + 4 * u;
          cy0 = y + 112 * u + j * 48 * u;
        }
      });
      if (F < CUE.send && Math.floor(F / 9) % 2 === 0) {
        ctx.fillStyle = C.accent;
        ctx.fillRect(cx0, cy0 - 30 * u, 3 * u, 38 * u);
      }
      // send: presses on its frame
      const press = 1 - 0.18 * Math.sin(Math.PI * prog(F, CUE.send, CUE.send + 8)),
        bx = x + promptW - 72 * u,
        by = y + promptH - 72 * u;
      const ready = prog(F, CUE.send - 12, CUE.send - 4);
      around(ctx, bx, by, press, 0, () => {
        disc(ctx, bx, by, 36 * u, mix(C.line, C.accent, ready));
        ctx.strokeStyle = C.surface;
        ctx.lineWidth = 5 * u;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(bx, by + 15 * u);
        ctx.lineTo(bx, by - 15 * u);
        ctx.moveTo(bx - 12 * u, by - 3 * u);
        ctx.lineTo(bx, by - 15 * u);
        ctx.lineTo(bx + 12 * u, by - 3 * u);
        ctx.stroke();
      });
      ctx.restore();
    }
  };
  const turnCap: Cap = {
    from: T.reveal,
    to: T.work - 4,
    lines: [
      [
        { s: "Or", size: 100, at: 272 },
        { s: "just", size: 100, at: 281 },
        { s: "ask.", size: 190, it: true, acc: true, at: 290 },
      ],
    ],
  };

  // ---- 03 work: three rows of availability float in, a scan finds the overlap, a slot card pops
  const RW = (tall ? 920 : 840) * u,
    RH = (tall ? 150 : 132) * u,
    RG = 22 * u,
    rx = stage.x - RW / 2;
  const rowsTop = stage.y - (tall ? 330 : 300) * u,
    rowY = (i: number) => rowsTop + 44 * u + i * (RH + RG);
  const cellX0 = rx + (tall ? 190 : 176) * u,
    cellG = 10 * u,
    cellW = (rx + RW - 24 * u - cellX0 - 4 * cellG) / 5,
    cellH = RH - 36 * u;
  const cellX = (d: number) => cellX0 + d * (cellW + cellG);
  const slotW = RW,
    slotH = (tall ? 160 : 140) * u,
    slotY = rowY(3) + 10 * u;
  const rowsSection = (ctx: Ctx, F: number) => {
    if (F < T.work - 2 || F > T.done + 40) return;
    const scan = ease.inOutCubic(prog(F, CUE.scan, CUE.lit)) * THU,
      scanA = Math.min(prog(F, CUE.scan - 6, CUE.scan + 4), 1 - prog(F, CUE.lit + 6, CUE.lit + 20));
    const lit = spring((F - CUE.lit) / FPS, { freq: 2.2, damp: 0.7 }),
      hA = prog(F, T.work, T.work + 16) * (1 - prog(F, T.done, T.done + 12));
    // day labels over the columns
    DAYS.forEach((d, i) =>
      text(ctx, d, cellX(i) + cellW / 2, rowsTop + 24 * u, {
        ...mono(22, i === THU && lit > 0.5 ? C.accent : C.muted, "center"),
        alpha: hA,
      }),
    );
    for (let r = 0; r < 3; r++) {
      const at = CUE.rows[r]!,
        k = spring((F - at) / FPS, { freq: 1.9, damp: 0.74 }),
        out = ease.inCubic(prog(F, T.done + r * 4, T.done + 22 + r * 4));
      if (k <= 0 || out >= 1) continue;
      const dir = r % 2 ? 1 : -1,
        x = rx + (1 - k) * dir * W * 0.7 - out * W * 0.9,
        y = rowY(r) + bob(F, 0.2 + r * 0.31, 4);
      float(ctx, x, y, RW, RH, 28 * u, C.surface, 0.8);
      avatar(ctx, x + 56 * u, y + RH / 2 - 14 * u, 30 * u, r + 1);
      text(ctx, WHO[r + 1]!.name, x + 56 * u, y + RH / 2 + 50 * u, sans(24, 600, C.ink, "center"));
      for (let d = 0; d < 5; d++) {
        const x0 = cellX(d) + (x - rx),
          y0 = y + 18 * u,
          slot = cellH / 8,
          thu = d === THU,
          dim = thu ? 0 : 0.55 * clamp(lit);
        card(ctx, x0, y0, cellW, cellH, { r: 12 * u, fill: thu ? mix(C.ground, C.accent2, lit) : C.ground });
        // busy hours, merged into runs; once the overlap is found the other days fade back
        const busy = BUSY[r]![d]!,
          fill = mix(mix(C.line, C.muted, 0.28), C.ground, dim);
        for (let h = 0; h < 8; h++) {
          if (!busy.includes(h) || busy.includes(h - 1)) continue;
          let e = h;
          while (busy.includes(e + 1)) e++;
          card(ctx, x0 + 6 * u, y0 + h * slot + 3 * u, cellW - 12 * u, (e - h + 1) * slot - 6 * u, { r: 7 * u, fill });
        }
        // the free hour everyone shares lights up and swells a little
        if (thu && lit > 0)
          around(ctx, x0 + cellW / 2, y0 + (SLOT + 0.5) * slot, lerp(0.3, 1, lit), 0, () =>
            card(ctx, x0 + 3 * u, y0 + SLOT * slot - 2 * u, cellW - 6 * u, slot + 4 * u, { r: 8 * u, fill: C.accent }),
          );
      }
      // the scan: an outline sweeping Mon → Thu
      if (scanA > 0) {
        ctx.save();
        ctx.globalAlpha = scanA;
        rr(ctx, cellX(scan) + (x - rx) - 5 * u, y + 13 * u, cellW + 10 * u, cellH + 10 * u, 15 * u);
        ctx.strokeStyle = C.accent;
        ctx.lineWidth = 4 * u;
        ctx.stroke();
        ctx.restore();
      }
    }
  };
  // the slot card pops out of Thursday, holds, then becomes the invite and flies out
  const slotCard = (ctx: Ctx, F: number) => {
    if (F < CUE.slot || F > CUE.fly + 34) return;
    const k = spring((F - CUE.slot) / FPS, { freq: 2.1, damp: 0.55 }),
      fly = ease.inCubic(prog(F, CUE.fly, CUE.fly + 30));
    const centre = ease.inOutCubic(prog(F, T.done, T.done + 22)); // to the middle of the stage as the rows leave
    const ox = cellX(THU) + cellW / 2,
      oy = rowY(2) + RH / 2;
    let x = lerp(ox, stage.x, clamp(k)),
      y = lerp(oy, slotY + slotH / 2, clamp(k)) + bob(F, 0.9, 5);
    y = lerp(y, stage.y - 40 * u, centre);
    x += fly * W * 0.55;
    y -= fly * H * 0.7;
    const held = spring((F - CUE.held) / FPS, { freq: 2.6, damp: 0.5 }),
      invite = prog(F, T.done + 6, T.done + 20);
    around(ctx, x, y, lerp(0.25, 1, k) * (1 + 0.06 * centre) * (1 - 0.45 * fly), 0.25 * fly, () => {
      const x0 = x - slotW / 2,
        y0 = y - slotH / 2;
      float(ctx, x0, y0, slotW, slotH, 30 * u, C.surface, 1 + centre);
      ctx.save();
      rr(ctx, x0, y0, slotW, slotH, 30 * u);
      ctx.clip();
      ctx.fillStyle = C.accent;
      ctx.fillRect(x0, y0, 12 * u, slotH);
      ctx.restore();
      const label = invite > 0 ? "INVITE" : "THU · NEXT WEEK";
      text(ctx, label, x0 + 48 * u, y0 + 46 * u, { ...mono(22, C.accent), alpha: invite > 0 ? invite : 1 });
      text(ctx, "Thu 3:00–4:00", x0 + 46 * u, y0 + slotH - 40 * u, {
        size: (tall ? 70 : 62) * u,
        family: F_.serif,
        color: C.ink,
      });
      // who's in it, as a stack of avatars
      [1, 2, 3].forEach((w, i) =>
        avatar(ctx, x0 + slotW - (tall ? 330 : 300) * u + i * 44 * u, y0 + slotH / 2, 26 * u, w),
      );
      // the "Held" chip
      if (held > 0)
        around(ctx, x0 + slotW - 110 * u, y0 + slotH / 2, lerp(0.5, 1, held), 0, () => {
          ctx.save();
          ctx.globalAlpha = clamp(held * 2);
          card(ctx, x0 + slotW - 176 * u, y0 + slotH / 2 - 28 * u, 132 * u, 56 * u, {
            r: 28 * u,
            fill: invite > 0.5 ? DEEP : C.accent,
          });
          check(ctx, x0 + slotW - 146 * u, y0 + slotH / 2, 20 * u, clamp(held), C.surface, 4 * u);
          text(
            ctx,
            invite > 0.5 ? "Sent" : "Held",
            x0 + slotW - 124 * u,
            y0 + slotH / 2 + 9 * u,
            sans(24, 600, C.surface),
          );
          ctx.restore();
        });
    });
  };
  const workCaps: Cap[] = [
    {
      from: T.work,
      to: 430,
      lines: [
        [
          { s: "It", size: 96, at: 364 },
          { s: "reads", size: 96, at: 373 },
        ],
        [
          { s: "three", size: 96, at: 382 },
          { s: "calendars,", size: 170, it: true, acc: true, at: 391 },
        ],
      ],
    },
    {
      from: 432,
      to: 502,
      lines: [
        [
          { s: "finds", size: 96, at: 436 },
          { s: "the", size: 96, at: 445 },
        ],
        [{ s: "overlap,", size: 170, it: true, acc: true, at: 454 }],
      ],
    },
    {
      from: 504,
      to: T.done - 4,
      lines: [
        [
          { s: "and", size: 96, at: 508 },
          { s: "holds", size: 170, it: true, acc: true, at: 517 },
        ],
        [
          { s: "the", size: 96, at: 526 },
          { s: "time.", size: 96, at: 535 },
        ],
      ],
    },
  ];

  // ---- 04 done: three avatars get a check one by one; a toast says everyone's in
  const doneSection = (ctx: Ctx, F: number) => {
    if (F < CUE.avatars[0]! || F > T.payoff) return;
    const out = ease.inCubic(prog(F, T.payoff - 12, T.payoff)),
      gap = (tall ? 280 : 250) * u,
      r = (tall ? 96 : 84) * u,
      ay = stage.y - (tall ? 90 : 60) * u;
    ctx.save();
    ctx.globalAlpha = 1 - out;
    for (let i = 0; i < 3; i++) {
      const k = spring((F - CUE.avatars[i]!) / FPS, { freq: 2, damp: 0.6 }),
        c = spring((F - CUE.checks[i]!) / FPS, { freq: 2.6, damp: 0.5 });
      if (k <= 0) continue;
      const x = stage.x + (i - 1) * gap,
        y = ay + bob(F, i * 0.29, 6) + (1 - k) * 120 * u;
      around(ctx, x, y, lerp(0.4, 1, k), 0, () => {
        // a white medallion keeps the avatar floating on the stone
        disc(ctx, x, y + 0, r + 12 * u, "rgba(0,0,0,0)");
        card(ctx, x - r - 12 * u, y - r - 12 * u, 2 * (r + 12 * u), 2 * (r + 12 * u), {
          r: r + 12 * u,
          fill: C.surface,
          shadow: { blur: 60 * u * S, y: 24 * u * S, color: "rgba(21,58,42,0.15)" },
        });
        avatar(ctx, x, y, r, i + 1);
        text(ctx, WHO[i + 1]!.name, x, y + r + 62 * u, sans(30, 600, C.ink, "center"));
        if (c > 0)
          around(ctx, x + r * 0.72, y + r * 0.72, lerp(0.3, 1, c), 0, () => {
            disc(ctx, x + r * 0.72, y + r * 0.72, 34 * u, C.surface);
            disc(ctx, x + r * 0.72, y + r * 0.72, 28 * u, C.accent);
            check(ctx, x + r * 0.72, y + r * 0.72, 24 * u, clamp(c * 1.3), C.surface, 5 * u);
          });
      });
    }
    // the toast
    const t = spring((F - CUE.toast) / FPS, { freq: 1.9, damp: 0.66 });
    if (t > 0) {
      const tw = (tall ? 560 : 520) * u,
        th = 104 * u,
        x = stage.x - tw / 2,
        y = ay + r + (tall ? 170 : 130) * u + (1 - t) * 120 * u + bob(F, 0.55, 4);
      ctx.globalAlpha = clamp(t * 2) * (1 - out);
      float(ctx, x, y, tw, th, th / 2, DEEP, 1.1);
      disc(ctx, x + 56 * u, y + th / 2, 26 * u, C.accent);
      check(ctx, x + 56 * u, y + th / 2, 22 * u, clamp((F - CUE.toast - 4) / 10), C.surface, 5 * u);
      text(ctx, "Everyone's in.", x + 100 * u, y + th / 2 + 12 * u, sans(34, 600, C.surface));
      text(ctx, "3 / 3", x + tw - 40 * u, y + th / 2 + 9 * u, mono(24, C.accent2, "right"));
    }
    ctx.restore();
  };
  const doneCap: Cap = {
    from: T.done,
    to: T.payoff - 4,
    lines: [
      [
        { s: "It", size: 96, at: 582 },
        { s: "sends", size: 96, at: 591 },
        { s: "the", size: 96, at: 600 },
      ],
      [{ s: "invite.", size: 170, it: true, acc: true, at: 609 }],
    ],
  };

  // ---- 05 payoff: "One message." then "Not twelve.", mixed sizes, the second line in the accent
  const pay1: Wd[][] = tall
    ? [[{ s: "One", size: 300, at: 722 }], [{ s: "message.", size: 180, at: 740 }]]
    : [
        [
          { s: "One", size: 250, at: 722 },
          { s: "message.", size: 160, at: 740 },
        ],
      ];
  const pay2: Wd[][] = tall
    ? [
        [{ s: "Not", size: 180, it: true, acc: true, at: 776 }],
        [{ s: "twelve.", size: 300, it: true, acc: true, at: 794 }],
      ]
    : [
        [
          { s: "Not", size: 160, it: true, acc: true, at: 776 },
          { s: "twelve.", size: 250, it: true, acc: true, at: 794 },
        ],
      ];
  const payoff = (ctx: Ctx, F: number) => {
    if (F < T.payoff || F > T.end) return;
    const A = place(ctx, pay1, fullBox),
      B = place(ctx, [...pay1, ...pay2], fullBox),
      t = ease.inOutCubic(prog(F, 764, 784));
    const push = 1 + 0.06 * prog(F, T.payoff, T.end),
      out = ease.inCubic(prog(F, T.end - 12, T.end));
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(push, push);
    ctx.translate(-cx, -cy - out * 40 * u);
    A.forEach((a, i) => {
      const b = B[i]!;
      word(ctx, F, { ...a, x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) }, 1 - out, "pop");
    });
    B.slice(A.length).forEach((b) => word(ctx, F, b, 1 - out, "pop"));
    ctx.restore();
  };

  // ---- 06 end card: the mark, the wordmark, the address, and a line that says what this is
  const endCard = (ctx: Ctx, F: number) => {
    if (F < T.end) return;
    const f = F - T.end,
      push = 1 + 0.04 * prog(F, T.end, N),
      ms = (tall ? 270 : 190) * u,
      my = cy - (tall ? 190 : 170) * u;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(push, push);
    ctx.translate(-cx, -cy);
    const k = spring(f / FPS, { freq: 2, damp: 0.55 });
    around(ctx, cx, my, lerp(0.3, 1, k), 0.2 * (1 - clamp(k)), () => mark(ctx, cx, my, ms, prog(f, 10, 22)));
    const o = { size: (tall ? 200 : 140) * u, family: F_.serif, color: C.ink, align: "left" as const, track: -0.02 },
      w = measure(ctx, P.product, o),
      base = my + ms / 2 + (tall ? 220 : 160) * u;
    [...P.product].forEach((ch, i) => {
      const kk = spring((f - 6 - i * 2.5) / FPS, { freq: 2.2, damp: 0.72 });
      if (kk > 0)
        text(ctx, ch, cx - w / 2 + measure(ctx, P.product.slice(0, i), o), base + (1 - kk) * 60 * u, {
          ...o,
          alpha: clamp(kk * 1.5),
        });
    });
    const a = prog(f, 22, 34),
      b = prog(f, 34, 46);
    text(ctx, P.url, cx, base + (tall ? 84 : 72) * u, { ...mono(tall ? 32 : 28, C.accent, "center"), alpha: a });
    text(ctx, "A fictional product, drawn in code.", cx, base + (tall ? 142 : 124) * u, {
      ...sans(tall ? 27 : 24, 400, C.muted, "center"),
      alpha: b,
    });
    ctx.restore();
  };

  const paint = (ctx: Ctx, env: Env, F: number) => {
    F = clamp(F, 0, N - 1);
    S = env.scale;
    ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
    ctx.fillStyle = C.ground;
    ctx.fillRect(0, 0, W, H);
    rings(ctx, F);
    hook(ctx, F);
    chat(ctx, F);
    caption(ctx, F, probCap);
    turnSection(ctx, F);
    caption(ctx, F, turnCap);
    rowsSection(ctx, F);
    slotCard(ctx, F);
    for (const c of workCaps) caption(ctx, F, c);
    doneSection(ctx, F);
    caption(ctx, F, doneCap);
    payoff(ctx, F);
    endCard(ctx, F);
  };
  const cuts = [0, T.problem, T.turn, T.work, T.done, T.payoff, T.end, N],
    names = ["hook", "problem", "turn", "work", "done", "payoff", "end"];
  const shots: Shot[] = names.map((sid, i) => ({
    id: sid,
    start: cuts[i]!,
    end: cuts[i + 1]!,
    draw: (ctx, local, env) => {
      // a 180° shutter: cards that fly (the countdown lift, the invite, the fling) smear the way a camera sees them
      motionBlur(ctx, env, (c, dt) => paint(c, env, cuts[i]! + local + dt), { samples: 6, shutter: 0.5 });
    },
  }));
  return {
    meta: { title: id, W, H, fps: FPS, bpm: BPM, durationFrames: N, raster: "cpu" },
    assets: { images: {}, fonts: P.assets },
    shots,
    audio: beatScore({
      frames: N,
      fps: FPS,
      bpm: BPM,
      mood: "soft",
      hits: [CUE.slot],
      whooshes: [T.turn, T.payoff],
      ticks: [
        ...MSG.map((_, i) => msgAt(i) + 2),
        T.problem + 24,
        ...CUE.lifts,
        CUE.promptIn + 8,
        CUE.send,
        ...CUE.rows.map((f) => f + 10),
        CUE.held,
        ...CUE.checks.map((f) => f + 2),
        CUE.toast + 6,
      ],
      sign: T.end + 4,
      gain: 0.6,
    }),
  };
}

export const verticalAppAd = make("vertical", "verticalAppAd");
export const verticalAppAdLandscape = make("landscape", "verticalAppAdLandscape");
