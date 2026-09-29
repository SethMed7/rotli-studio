// STUDY 51 · LITERAL TYPE (32 s, 60 fps, 120 bpm). Seven words for Oriel, an imaginary scheduling assistant, each
// of which DOES what it says, played as one continuous take: every prop becomes the next scene's first shape
// (a zoom through the 'booked' square, a crosshair that becomes a phone, a slot list that becomes a day column, a
// dive into a meeting, a pill that becomes a ball, a ball that falls into the lens and turns the film dark).
// Paper and ink only, one inversion; a serif word over mono machinery on a tilted drafting grid under a rolling
// camera, with a live seconds/frame/bpm readout. Brand: the neutral pack, palette "mono" (accents never used).
// Brief: series/studies/briefs/literal-type.json · prompt: series/studies/prompts/literal-type.prompt.md
//
// The film is one continuous function paint(F) of a fractional frame; the shots only name the sections. Seeded
// hashes (never Math.random) place the tangled letters, so any frame paints on its own.
import PACK from "../../../brand/packs/studio/pack.json";
import type { Ctx, Env, Layer } from "../core";
import type { Film, Shot } from "../film";
import { motionBlur } from "../kit/blur";
import { clamp, ease, lerp, prog, spring, track } from "../kit/motion";
import { usePack } from "../kit/pack";
import { beatScore } from "../kit/score";
import { layout, type Size } from "../kit/sizes";
import { measure, text } from "../kit/type";
import { rr } from "../kit/ui";

const P = usePack(PACK),
  C = P.palette("mono"),
  F_ = P.face;
const FPS = 60,
  BPM = 120,
  N = 1920; // a beat is 30 frames
const T = {
  snap: 150,
  zoom: 210,
  overlap: 240,
  lock: 360,
  morph: 450,
  zones: 480,
  fill: 570,
  column: 690,
  buffer: 720,
  ten: 870,
  dive: 930,
  poll: 960,
  win: 1110,
  ball: 1170,
  nudge: 1200,
  fall: 1380,
  flip: 1440,
  turns: 1530,
  gather: 1620,
  end: 1680,
  index: 1800,
};
// every typed line: [first frame, copy] (2 frames per character)
const CAP = {
  ev: [151, "12 replies, now one link."],
  ov: [368, "Where everyone is free."],
  zo: [606, "Three zones, one slot."],
  bu: [850, "Ten minutes between meetings."],
  po: [1114, "Let them pick."],
  nu: [1240, "Reminders that land."],
  ro: [1536, "The late slot takes turns."],
  tag: [1774, "Find a time that works for everyone."],
} as const;
const LOG = ["wk 1 ana", "wk 2 kai", "wk 3 mo", "wk 4 lee"];
const INDEX = ["Everyone", "Overlap", "Zones", "Buffer", "Poll", "Nudge", "Rotate"];
const SP = { freq: 2.4, damp: 0.67 }; // about 6% overshoot
const sp = (f: number, o = SP) => spring(f / FPS, o);
const hash = (i: number, s = 0) => {
  const x = Math.sin(i * 127.1 + s * 311.7 + 17.3) * 43758.5453;
  return x - Math.floor(x);
};
const rgb = (h: string) => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
};
const alpha = (h: string, a: number) => {
  const [r, g, b] = rgb(h);
  return `rgba(${r},${g},${b},${a})`;
};
const mix = (h1: string, h2: string, t: number) => {
  const a = rgb(h1),
    b = rgb(h2);
  return `rgb(${Math.round(lerp(a[0], b[0], t))},${Math.round(lerp(a[1], b[1], t))},${Math.round(lerp(a[2], b[2], t))})`;
};
type Pt = [number, number];
const lp = (a: Pt, b: Pt, t: number): Pt => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
const setTrack = (ctx: Ctx, px: number) => ((ctx as Ctx & { letterSpacing: string }).letterSpacing = `${px}px`);

// sound: ticks for letters, rows, the click, the pierce, gaps, votes, contacts, ring steps and index cells, plus
// one per third typed character, thinned so no two sit closer than 4 frames
const TICKS = (() => {
  const t = [0, 30, 60, 90, 120, 270, 300, 330, 555, 630, 750, 780, 810, 840, 990, 1020, 1050, 1080];
  t.push(1230, 1260, 1290, 1320, 1350, 1530, 1560, 1590);
  for (let i = 0; i < 7; i++) t.push(T.index + 12 * i);
  const typed: number[] = [];
  for (const [at, s] of Object.values(CAP)) for (let k = 2; k < s.length; k += 3) typed.push(at + 2 * k);
  LOG.forEach((s, i) => {
    for (let k = 2; k < s.length; k += 3) typed.push(T.turns + 30 * i + 2 * k);
  });
  const keep = [...t];
  for (const f of typed.sort((a, b) => a - b)) if (keep.every((k) => Math.abs(k - f) >= 4)) keep.push(f);
  return keep.sort((a, b) => a - b);
})();

export function make(size: Size, id: string): Film {
  const L = layout(size),
    { W, H, cx, cy, tall } = L;
  const V = <X>(land: X, vert: X): X => (tall ? vert : land);

  // ---------------------------------------------------------------- per-size design (u = 1 in both sizes)
  const D = {
    // 01 Everyone: tangle endpoints, then the snapped baseline (both ends on major grid intersections)
    S0: V<Pt>([192, 540], [540, 390]),
    B0: V<Pt>([1728, 540], [540, 1470]),
    S: V<Pt>([192, 540], [156, 960]),
    B: V<Pt>([1728, 540], [924, 960]),
    loopB: V(165, 120),
    wander: V(80, 190),
    evCapY: V(650, 1075),
    // 02 Overlap
    ovC: V<Pt>([1250, 540], [540, 1000]),
    ovS: V(640, 860),
    ovWord: V({ x: 160, y: 500, c: false }, { x: cx, y: 445, c: true }),
    ovCap: V({ x: 160, y: 610, c: false }, { x: cx, y: 1515, c: true }),
    // 03 Zones
    phC: V<Pt>([1010, 545], [540, 930]),
    phW: V(300, 340),
    phH: V(620, 700),
    stackC: V<Pt>([1060, 715], [540, 1120]),
    stackD: V(160, 150),
    znWord: V({ x: 200, y: 520, c: false }, { x: cx, y: 450, c: true }),
    znCap: V({ x: 200, y: 625, c: false }, { x: cx, y: 1560, c: true }),
    // 04 Buffer
    col: V({ x: 1000, y: 150, w: 360, bh: 130, ppm: 3.2 }, { x: 290, y: 520, w: 420, bh: 160, ppm: 3 }),
    buWord: V({ x: 170, y: 470, c: false }, { x: cx, y: 430, c: true }),
    buCap: V({ x: 170, y: 580, c: false }, { x: cx, y: 1545, c: true }),
    // 05 Poll
    poBase: V(470, 720),
    pill: V({ w: 250, h: 72 }, { w: 320, h: 84 }),
    poCapY: V(840, 1320),
    // 06 Nudge (laid out one pan to the right: the ball hops right and the camera follows it)
    pan: V(900, 700),
    nuBase: V(640, 1110),
    nuSize: V(180, 170),
    apex: V(170, 230),
    nuCapY: V(790, 1265),
    // 07 Rotate
    rc: V<Pt>([1280, 560], [540, 1010]),
    rr: V(250, 370),
    roWord: V({ x: 170, y: 500, c: false }, { x: cx, y: 470, c: true }),
    roCap: V({ x: 170, y: 610, c: false }, { x: cx, y: 1555, c: true }),
    logY: V(935, 1475),
    // end
    orBase: V(470, 880),
    tagY: V(575, 985),
    urlY: V(660, 1135),
  };

  // ---------------------------------------------------------------- colour: paper and ink, one inversion
  const theme = (F: number) =>
    F >= T.flip
      ? { bg: C.ink, fg: C.ground, grid: 1.2, gridC: C.ground }
      : { bg: C.ground, fg: C.ink, grid: 1, gridC: C.ink };

  // ---------------------------------------------------------------- type helpers
  const wordCache = new Map<string, { xs: number[]; ws: number[]; total: number }>();
  const lay = (ctx: Ctx, s: string, sz: number) => {
    const k = `${s}@${sz}`;
    let r = wordCache.get(k);
    if (!r) {
      const o = { size: sz, family: F_.serif, weight: 400 };
      const xs: number[] = [],
        ws: number[] = [];
      for (let i = 0; i < s.length; i++) {
        const a = measure(ctx, s.slice(0, i), o);
        xs.push(a);
        ws.push(measure(ctx, s.slice(0, i + 1), o) - a);
      }
      r = { xs, ws, total: measure(ctx, s, o) };
      wordCache.set(k, r);
    }
    return r;
  };
  const topCache = new Map<string, number>();
  /** the glyph's ink top above the baseline */
  const glyphTop = (ctx: Ctx, ch: string, sz: number) => {
    const k = `${ch}@${sz}`;
    let v = topCache.get(k);
    if (v === undefined) {
      ctx.save();
      ctx.font = `400 ${sz}px "${F_.serif}"`;
      setTrack(ctx, 0);
      v = ctx.measureText(ch).actualBoundingBoxAscent;
      ctx.restore();
      topCache.set(k, v);
    }
    return v;
  };
  type GlyphOpts = {
    rot?: number;
    sx?: number;
    sy?: number;
    fill?: string;
    stroke?: string;
    lw?: number;
    alpha?: number;
    base?: boolean;
  };
  /** one serif glyph drawn about its pivot (centre of the advance, 0.35 em above the baseline); base: scale from the baseline */
  const glyph = (ctx: Ctx, ch: string, px: number, py: number, sz: number, o: GlyphOpts) => {
    const a = o.alpha ?? 1;
    if (a <= 0.002) return;
    ctx.save();
    ctx.font = `400 ${sz}px "${F_.serif}"`;
    setTrack(ctx, 0);
    const w = ctx.measureText(ch).width,
      oy = o.base ? 0.35 * sz : 0;
    ctx.translate(px, py + oy);
    if (o.rot) ctx.rotate(o.rot);
    ctx.scale(o.sx ?? 1, o.sy ?? 1);
    ctx.globalAlpha *= a;
    if (o.fill) {
      ctx.fillStyle = o.fill;
      ctx.fillText(ch, -w / 2, 0.35 * sz - oy);
    }
    if (o.stroke) {
      ctx.lineWidth = o.lw ?? 2;
      ctx.lineJoin = "round";
      ctx.strokeStyle = o.stroke;
      ctx.strokeText(ch, -w / 2, 0.35 * sz - oy);
    }
    ctx.restore();
  };
  const mono = (
    ctx: Ctx,
    s: string,
    x: number,
    y: number,
    sz: number,
    color: string,
    align: CanvasTextAlign = "left",
    a = 1,
  ) => text(ctx, s, x, y, { size: sz, family: F_.mono, weight: 500, color, align, alpha: a });
  /** a typed mono line at 2 frames per character with a drawn block cursor (solid while typing, then 15 on / 15 off) */
  const typed = (
    ctx: Ctx,
    F: number,
    s: string,
    at: number,
    x: number,
    y: number,
    o: { c?: boolean; color: string; sz?: number; a?: number; cursor?: boolean },
  ) => {
    const f = F - at;
    if (f < 0) return;
    const sz = o.sz ?? 44,
      adv = 0.6 * sz,
      n = clamp(Math.floor(f / 2) + 1, 0, s.length),
      left = o.c ? x - (s.length * adv) / 2 : x,
      a = o.a ?? 1;
    if (a <= 0) return;
    mono(ctx, s.slice(0, n), left, y, sz, o.color, "left", a);
    const done = n >= s.length,
      on = !done || Math.floor((f - s.length * 2) / 15) % 2 === 0;
    if (o.cursor !== false && on) {
      ctx.save();
      ctx.globalAlpha *= a;
      ctx.fillStyle = o.color;
      ctx.fillRect(left + n * adv + 0.08 * sz, y - 0.8 * sz, 0.6 * sz, sz);
      ctx.restore();
    }
  };
  const dot = (ctx: Ctx, x: number, y: number, r: number, color: string) => {
    if (r <= 0) return;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  };
  const line = (ctx: Ctx, pts: Pt[], color: string, lw: number, dash?: number[]) => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.setLineDash(dash ?? []);
    ctx.stroke();
    ctx.setLineDash([]);
  };
  /** a leader line: 1.5 px, a 5 px dot at the anchor, drawn on from the anchor */
  const leader = (ctx: Ctx, pts: Pt[], t: number, color: string) => {
    if (t <= 0) return;
    let total = 0;
    for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1]);
    let left = total * t;
    const out: Pt[] = [pts[0]!];
    for (let i = 1; i < pts.length && left > 0; i++) {
      const a = pts[i - 1]!,
        b = pts[i]!,
        d = Math.hypot(b[0] - a[0], b[1] - a[1]);
      out.push(lp(a, b, Math.min(1, left / d)));
      left -= d;
    }
    line(ctx, out, color, 1.5);
    dot(ctx, pts[0]![0], pts[0]![1], 5, color);
  };
  const crosshair = (ctx: Ctx, x: number, y: number, r: number, color: string, halo: string, ticks = 1) => {
    ctx.save();
    for (const [c, lw] of [
      [halo, 7],
      [color, 2],
    ] as const) {
      ctx.strokeStyle = c;
      ctx.lineWidth = lw;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
      if (ticks > 0) {
        ctx.globalAlpha = ticks;
        ctx.beginPath();
        for (let k = 0; k < 4; k++) {
          const a = (k * Math.PI) / 2,
            c0 = Math.cos(a),
            s0 = Math.sin(a);
          ctx.moveTo(x + c0 * (r + 5), y + s0 * (r + 5));
          ctx.lineTo(x + c0 * (r + 18), y + s0 * (r + 18));
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
    ctx.restore();
  };
  /** the drawn cursor: a classic pointer arrow, ink with a paper edge; tip at (x, y) */
  const pointer = (ctx: Ctx, x: number, y: number, k: number, fg: string, bg: string, a = 1) => {
    if (a <= 0) return;
    const pts: Pt[] = [
      [0, 0],
      [0, 36],
      [9, 27],
      [16, 42],
      [23, 39],
      [16, 25],
      [28, 25],
    ];
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.translate(x, y);
    ctx.scale(k, k);
    ctx.beginPath();
    pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
    ctx.closePath();
    ctx.fillStyle = fg;
    ctx.strokeStyle = bg;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  };
  const layerOf = (env: Env, key: string): Layer => {
    const w = Math.round(W * env.scale),
      h = Math.round(H * env.scale),
      k = `literal:${key}:${w}x${h}`;
    let Ly = env.cache.get(k) as Layer | undefined;
    if (!Ly) {
      Ly = env.canvas(w, h);
      env.cache.set(k, Ly);
    }
    return Ly;
  };

  // ---------------------------------------------------------------- the camera
  // world → pre-roll screen is p' = z·p + t; the roll and scale drift sit on top of it, around the frame centre.
  // The drafting grid is drawn under the same zoom with its levels blended by frac(log4 z), so a ×16 or ×4 zoom
  // ends on exactly the grid it started from; after each move the grid keeps the anchor the move left it on.
  const A0: Pt = [cx, cy];
  const EV_SZ = 180,
    PO_SZ = 190,
    PO_BLOCK = PO_SZ / 4;
  const col = D.col;
  const Q: Pt = [col.x + col.w * 0.7, col.y + col.bh / 2 + 16 - 0.3 * PO_BLOCK]; // Poll's centre inside the top block
  const Pt_: Pt = [cx, D.poBase - 0.3 * PO_SZ]; // where it lands, ×4
  const A1: Pt = [16 * A0[0] - 15 * D.B[0], 16 * A0[1] - 15 * D.B[1]];
  const A2: Pt = [4 * (A1[0] - Q[0]) + Pt_[0], 4 * (A1[1] - Q[1]) + Pt_[1]];
  const cam = (F: number) => {
    let z = 1,
      tx = 0,
      ty = 0,
      anchor: Pt = A0;
    if (F >= T.zoom && F < T.overlap) {
      const e = prog(F, T.zoom, T.overlap) ** 1.7;
      z = 16 ** e;
      tx = D.B[0] * (1 - z);
      ty = D.B[1] * (1 - z);
    } else if (F >= T.overlap && F < T.ten) anchor = A1;
    else if (F >= T.ten && F < T.poll) {
      const e = 0.05 * ease.inOutCubic(prog(F, T.ten, T.dive)) + 0.95 * ease.inCubic(prog(F, T.dive, T.poll));
      z = 4 ** e;
      const m = ease.inOutCubic(prog(F, T.dive - 6, T.poll)),
        p = lp(Q, Pt_, m);
      tx = p[0] - z * Q[0];
      ty = p[1] - z * Q[1];
      anchor = A1;
    } else if (F >= T.poll && F < T.flip) {
      anchor = A2;
      tx = -D.pan * ease.inOutCubic(prog(F, T.ball + 6, T.ball + 58));
    }
    return { z, tx, ty, gx: z * anchor[0] + tx, gy: z * anchor[1] + ty };
  };
  // each payoff punches the camera in a few percent and lets it settle (the ball's contacts, a little)
  const KICKS: [number, number][] = [
    [T.snap, 0.035],
    [T.lock, 0.035],
    [T.fill, 0.035],
    [T.ten, 0.03],
    [T.win, 0.035],
    [T.gather, 0.03],
    ...[1230, 1260, 1290, 1320, 1350].map((f) => [f, 0.012] as [number, number]),
    ...[0, 30, 60, 90, 120].map((f) => [f, 0.015] as [number, number]), // each letter placed on the path
  ];
  const kick = (F: number) =>
    KICKS.reduce((s, [f, a]) => (F > f ? s + a * (1 - Math.exp(-(F - f) / 1.2)) * Math.exp(-(F - f) / 9) : s), 0);
  const base = (F: number) => ({
    roll: ((2.5 * Math.PI) / 180) * Math.sin((2 * Math.PI * F) / 420 - 0.7),
    k:
      (1.025 + 0.025 * Math.sin((2 * Math.PI * F) / 660 - 1.3)) *
      (1 + 0.045 * ease.inOutCubic(prog(F, T.index, N))) *
      (1 + kick(F)),
  });
  const grid = (ctx: Ctx, F: number, c: ReturnType<typeof cam>) => {
    const th = theme(F),
      lv = Math.log(c.z) / Math.log(4),
      fr = lv - Math.floor(lv + 1e-9),
      s = 12 * 4 ** fr,
      pad = 160;
    const al = [0.05 * fr, 0.05 + 0.05 * fr, 0.1].map((a) => a * th.grid);
    for (const axis of [0, 1]) {
      const o = axis ? c.gy : c.gx,
        len = axis ? H : W,
        k0 = Math.ceil((-pad - o) / s),
        k1 = Math.floor((len + pad - o) / s);
      for (let k = k0; k <= k1; k++) {
        const m = ((k % 16) + 16) % 16,
          a = m === 0 ? al[2]! : m % 4 === 0 ? al[1]! : al[0]!;
        if (a < 0.004) continue;
        ctx.fillStyle = alpha(th.gridC, a);
        const p = o + k * s;
        if (axis) ctx.fillRect(-pad, p - 0.5, W + 2 * pad, 1);
        else ctx.fillRect(p - 0.5, -pad, 1, H + 2 * pad);
      }
    }
  };

  // ================================================================ 01 EVERYONE: placed along a tangled path
  const EV = "Everyone",
    EV_AT = [-90, -60, -30, 0, 30, 60, 90, 120], // pre-rolled: frame 0 is already a tangle, then a letter per beat
    EV_N = ["1 reply", "2 replies", "4 replies", "5 replies", "7 replies", "9 replies", "10 replies", "12 replies"];
  // where each letter sits along the path (searched so no two letters, nor a letter and the 'booked' square, come
  // within about 210 px in either size); the cursor's head passes each at its placement frame, then dashes to the square
  const EV_S = [0.03, 0.107, 0.187, 0.328, 0.454, 0.569, 0.662, 0.765];
  const head = (F: number) => {
    if (F >= 140) return 1;
    if (F <= EV_AT[0]!) return EV_S[0]!;
    for (let i = 1; i < EV_AT.length; i++)
      if (F < EV_AT[i]!) return lerp(EV_S[i - 1]!, EV_S[i]!, prog(F, EV_AT[i - 1]!, EV_AT[i]!));
    return lerp(EV_S[7]!, 1, prog(F, EV_AT[7]!, 140));
  };
  const tangle = (s: number): Pt => {
    const [sx, sy] = D.S0,
      [bx, by] = D.B0,
      dx = bx - sx,
      dy = by - sy,
      len = Math.hypot(dx, dy),
      ux = dx / len,
      uy = dy / len,
      nx = -uy,
      ny = ux,
      env = Math.sin(Math.PI * s) ** 0.7,
      t = 2 * Math.PI * 3.3 * s,
      b = D.loopB;
    const along = len * s - b * Math.sin(t) * env,
      lat = D.wander * Math.sin(2 * Math.PI * 1.15 * s + 0.4) * env + b * (1 - Math.cos(t)) * env * 0.9 - b * 0.9 * env;
    return [sx + ux * along + nx * lat, sy + uy * along + ny * lat];
  };
  const tangleNormal = (s: number): Pt => {
    const a = tangle(s - 0.002),
      b = tangle(s + 0.002),
      d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [-(b[1] - a[1]) / d, (b[0] - a[0]) / d];
  };
  const evPlaced = (i: number): { p: Pt; rot: number } => {
    const s = EV_S[i]!,
      p = tangle(s),
      n = tangleNormal(s);
    if (i === 0) return { p: [D.S0[0] + V(80, 240), D.S0[1] - V(120, 10)], rot: (-18 * Math.PI) / 180 };
    const side = 1,
      off = side * (46 + 34 * hash(i, 1));
    return { p: [p[0] + n[0] * off, p[1] + n[1] * off], rot: ((hash(i, 2) - 0.5) * 2 * 35 * Math.PI) / 180 };
  };
  const everyone = (ctx: Ctx, F: number, zoomZ: number) => {
    const th = theme(F),
      W_ = lay(ctx, EV, EV_SZ),
      kp = sp(F - T.snap, { freq: 3.4, damp: 0.6 }),
      fade = 1 - prog(F, 214, 234),
      S = lp(D.S0, D.S, kp),
      B = lp(D.B0, D.B, kp);
    // the path, pulled tight into a baseline at the snap (it twangs once like a string)
    const sh = F < 140 ? head(F) : 1,
      n = Math.max(2, Math.round(420 * sh)),
      pts: Pt[] = [];
    const tw = F > T.snap ? 22 * Math.sin((2 * Math.PI * (F - T.snap)) / 9) * Math.exp(-(F - T.snap) / 12) : 0;
    const lx = B[0] - S[0],
      ly = B[1] - S[1],
      ll = Math.hypot(lx, ly) || 1;
    for (let i = 0; i <= n; i++) {
      const s = (i / n) * sh,
        a = tangle(s),
        b: Pt = [
          S[0] + lx * s - (ly / ll) * tw * Math.sin(Math.PI * s),
          S[1] + ly * s + (lx / ll) * tw * Math.sin(Math.PI * s),
        ];
      pts.push(lp(a, b, kp));
    }
    ctx.save();
    ctx.globalAlpha = fade;
    line(ctx, pts, th.fg, 3 / zoomZ);
    // start ring
    ctx.beginPath();
    ctx.arc(S[0], S[1], 12, 0, Math.PI * 2);
    ctx.fillStyle = th.bg;
    ctx.fill();
    ctx.strokeStyle = th.fg;
    ctx.lineWidth = 2.5 / zoomZ;
    ctx.stroke();
    ctx.restore();
    // the 'booked' square (it survives the zoom: its outline becomes the next frame)
    const pop = 1 + 0.25 * Math.exp(-Math.max(0, F - 140) / 6) * (F >= 140 ? 1 : 0);
    ctx.save();
    ctx.translate(B[0], B[1]);
    ctx.scale(pop, pop);
    ctx.fillStyle = th.bg;
    ctx.fillRect(-20, -20, 40, 40);
    ctx.strokeStyle = th.fg;
    ctx.lineWidth = 2 / zoomZ;
    ctx.lineJoin = "round";
    ctx.strokeRect(-20, -20, 40, 40);
    ctx.restore();
    mono(ctx, "booked", B[0], B[1] + 56, 28, C.muted, "center", 1 - prog(F, T.zoom, T.zoom + 8));
    // letters: placed at the cursor, then sprung upright onto the baseline as one word
    const left = lerp(S[0], B[0], 0.5) - W_.total / 2,
      baseY = lerp(S[1], B[1], 0.5);
    for (let i = 0; i < EV.length; i++) {
      const at = EV_AT[i]!;
      if (F < at) continue;
      const pl = evPlaced(i),
        k = sp(F - T.snap - i, { freq: 3.6, damp: 0.62 }), // the word lands with the string, on the hit
        flat: Pt = [left + W_.xs[i]! + W_.ws[i]! / 2, baseY - 0.35 * EV_SZ],
        p = lp(pl.p, flat, k),
        pop = sp(F - at, { freq: 3, damp: 0.6 });
      glyph(ctx, EV[i]!, p[0], p[1], EV_SZ, {
        rot: lerp(pl.rot, 0, k),
        sx: pop,
        sy: pop,
        fill: th.fg,
        alpha: fade,
      });
    }
    // the cursor and its counter, riding the head of the path
    if (F < T.snap + 12) {
      const hp = tangle(sh),
        a = 1 - prog(F, 142, 156),
        count = EV_AT.filter((t) => F >= t).length;
      pointer(ctx, hp[0], hp[1], 1, th.fg, th.bg, a);
      const flip = tall ? hp[0] > cx : hp[0] > W * 0.6,
        cxN = flip ? hp[0] - 22 : hp[0] + 36,
        cyN = flip ? hp[1] - 34 : hp[1] + 66;
      mono(ctx, EV_N[count - 1]!, cxN, cyN, 30, th.fg, flip ? "right" : "left", a * (1 - prog(F, 134, 142)));
    }
  };

  // ================================================================ 02 OVERLAP: dropped in like data
  const FREE: [number, number][][] = [
    [
      [9, 11],
      [13, 15.5],
      [16.5, 18],
    ],
    [
      [10, 12.5],
      [13.5, 16],
    ],
    [
      [9, 10],
      [11, 12],
      [13, 15],
      [17, 18],
    ],
    [
      [11, 12],
      [14, 15],
      [16, 17.5],
    ],
  ];
  const NAMES = ["ana", "kai", "mo", "lee"];
  const intersect = (n: number): [number, number][] => {
    let cur: [number, number][] = FREE[0]!;
    for (let r = 1; r < n; r++) {
      const nx: [number, number][] = [];
      for (const [a, b] of cur)
        for (const [c, d] of FREE[r]!) {
          const lo = Math.max(a, c),
            hi = Math.min(b, d);
          if (hi - lo > 0.01) nx.push([lo, hi]);
        }
      cur = nx;
    }
    return cur;
  };
  const OV = "Overlap";
  const ovFrame = (F: number) => {
    const k = sp(F - T.overlap, { freq: 2, damp: 0.67 }),
      c = lp(D.B, D.ovC, k),
      s = lerp(640, D.ovS, k);
    const x0 = c[0] - s / 2,
      y0 = c[1] - s / 2,
      ix0 = x0 + 0.17 * s,
      ix1 = x0 + s - 0.06 * s,
      iy0 = y0 + 0.1 * s,
      iy1 = y0 + s - 0.16 * s;
    return {
      c,
      s,
      x0,
      y0,
      ix0,
      ix1,
      iy0,
      iy1,
      lane: (iy1 - iy0) / 4,
      hx: (h: number) => ix0 + ((h - 9) / 9) * (ix1 - ix0),
    };
  };
  const lockPoint = (F: number): Pt => {
    const g = ovFrame(F);
    return [g.hx(14.5), (g.iy0 + g.iy1) / 2];
  };
  const overlap = (ctx: Ctx, env: Env, F: number) => {
    const th = theme(F),
      g = ovFrame(F),
      out = 1 - prog(F, T.morph, T.morph + 14),
      m = prog(F, T.lock, T.lock + 10),
      lk = sp(F - T.lock, { freq: 3, damp: 0.67 });
    ctx.save();
    ctx.globalAlpha = out;
    // frame: the zoomed square, ink until the lock, then a muted dashed outline
    ctx.lineJoin = "round";
    if (m < 1) {
      ctx.globalAlpha = out * (1 - m);
      ctx.strokeStyle = th.fg;
      ctx.lineWidth = 2;
      ctx.strokeRect(g.x0, g.y0, g.s, g.s);
    }
    if (m > 0) {
      ctx.globalAlpha = out * m;
      ctx.strokeStyle = C.muted;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.strokeRect(g.x0, g.y0, g.s, g.s);
      ctx.setLineDash([]);
    }
    ctx.globalAlpha = out;
    const inA = prog(F, T.overlap + 10, T.overlap + 26),
      ax = 26 * (g.s / 640) ** 0.5;
    // axis + hour labels
    ctx.globalAlpha = out * inA;
    ctx.fillStyle = C.muted;
    ctx.fillRect(g.ix0, g.iy1, g.ix1 - g.ix0, 1.5);
    for (let h = 9; h <= 18; h++) {
      ctx.fillRect(g.hx(h) - 0.75, g.iy1, 1.5, 10);
      mono(ctx, String(h).padStart(2, "0"), g.hx(h), g.iy1 + 0.075 * g.s, ax, C.muted, "center");
    }
    // the rows land one per beat; the band where every row so far is free darkens a step
    const landed = [0, 1, 2, 3].filter((r) => F >= 262 + 30 * r + 7).length;
    if (landed > 0) {
      for (const [a, b] of intersect(landed)) {
        const solid = landed === 4 ? lk : 0;
        ctx.globalAlpha = out;
        ctx.fillStyle = alpha(th.fg, lerp(0.05 + 0.035 * landed, 1, solid));
        ctx.fillRect(g.hx(a), g.iy0, g.hx(b) - g.hx(a), g.iy1 - g.iy0);
      }
    }
    for (let r = 0; r < 4; r++) {
      const k = sp(F - (262 + 30 * r), { freq: 3.4, damp: 0.67 });
      if (k <= 0) continue;
      const yc = g.iy0 + g.lane * (r + 0.5),
        bh = g.lane * 0.46;
      ctx.globalAlpha = out * clamp(k * 2);
      mono(ctx, NAMES[r]!, g.x0 + 0.035 * g.s, yc + 10, 30 * (g.s / 640) ** 0.3, C.muted);
      FREE[r]!.forEach(([a, b], j) => {
        const kk = sp(F - (262 + 30 * r) - 2 * j, { freq: 3.4, damp: 0.67 }),
          x = g.hx(a) - (1 - kk) * 60,
          w = (g.hx(b) - g.hx(a)) * clamp(kk, 0, 1.06);
        if (w <= 0) return;
        if (m < 1) {
          ctx.globalAlpha = out * (1 - m) * clamp(kk * 3);
          ctx.fillStyle = th.fg;
          rr(ctx, x, yc - bh / 2, w, bh, 6);
          ctx.fill();
        }
        if (m > 0) {
          ctx.globalAlpha = out * m;
          ctx.strokeStyle = C.muted;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([6, 6]);
          rr(ctx, x, yc - bh / 2, w, bh, 6);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      });
    }
    ctx.globalAlpha = out;
    // the leader to the one free slot
    const lp0 = lockPoint(F),
      bandTop: Pt = [lp0[0], g.iy0],
      side = -1,
      elbow: Pt = [lp0[0] + side * 40, g.y0 - 40],
      end: Pt = [lp0[0] + side * 60, g.y0 - 40];
    const la = prog(F, T.lock + 4, T.lock + 18);
    leader(ctx, [bandTop, elbow, end], la, C.muted);
    mono(
      ctx,
      "all 4 free · 14:00",
      end[0] + side * 12,
      end[1] + 10,
      28,
      C.muted,
      "right",
      prog(F, T.lock + 12, T.lock + 22),
    );
    // the word: letters dropped in like data points, then slid together; each overlap knocked out (xor)
    const W_ = lay(ctx, OV, EV_SZ),
      tight = 1 - 0.3 * sp(F - T.lock, { freq: 2, damp: 0.67 }),
      total = W_.total * tight,
      left = D.ovWord.c ? D.ovWord.x - total / 2 : D.ovWord.x;
    const Ly = layerOf(env, "xor"),
      lc = Ly.ctx;
    lc.setTransform(1, 0, 0, 1, 0, 0);
    lc.globalAlpha = 1;
    lc.globalCompositeOperation = "source-over";
    lc.clearRect(0, 0, Ly.canvas.width, Ly.canvas.height);
    lc.setTransform(ctx.getTransform());
    lc.globalCompositeOperation = "xor";
    for (let i = 0; i < OV.length; i++) {
      const at = T.overlap + 6 + 4 * i;
      if (F < at) continue;
      const k = sp(F - at, { freq: 2.6, damp: 0.5 }),
        x = left + (W_.xs[i]! + W_.ws[i]! / 2) * tight,
        y = D.ovWord.y - 0.35 * EV_SZ - (1 - k) * 320;
      glyph(lc, OV[i]!, x, y, EV_SZ, { fill: th.fg, alpha: clamp((F - at) / 5) });
    }
    lc.globalCompositeOperation = "source-over";
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(Ly.canvas as CanvasImageSource, 0, 0);
    ctx.restore();
    typed(ctx, F, CAP.ov[1], CAP.ov[0], D.ovCap.x, D.ovCap.y, { c: D.ovCap.c, color: th.fg });
    ctx.restore();
    // the crosshair: flies in on an arc, locks at 360, then glides to the centre and becomes the phone
    if (F >= 330) {
      const tgt = lockPoint(F),
        a = ease.outCubic(prog(F, 330, T.lock)),
        p0: Pt = [g.x0 + g.s * 1.05, g.y0 - 120],
        c1: Pt = [g.x0 + g.s * 1.2, g.iy1 + 80];
      let p: Pt = [
        (1 - a) ** 2 * p0[0] + 2 * (1 - a) * a * c1[0] + a * a * tgt[0],
        (1 - a) ** 2 * p0[1] + 2 * (1 - a) * a * c1[1] + a * a * tgt[1],
      ];
      const mk = phoneMorph(F);
      if (F >= T.morph) p = lp(tgt, D.phC, ease.inOutCubic(prog(F, T.morph, T.morph + 28)));
      if (F < T.morph + 1) {
        crosshair(ctx, p[0], p[1], 38, th.fg, th.bg);
        const pulse = prog(F, T.lock, T.lock + 22);
        if (pulse > 0 && pulse < 1) {
          ctx.save();
          ctx.globalAlpha = 1 - pulse;
          ctx.strokeStyle = th.fg;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(p[0], p[1], 38 + 70 * ease.outCubic(pulse), 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      } else {
        const w = lerp(76, D.phW, mk),
          h = lerp(76, D.phH, mk);
        ctx.save();
        ctx.strokeStyle = th.bg;
        ctx.lineWidth = 7;
        rr(ctx, p[0] - w / 2, p[1] - h / 2, w, h, lerp(38, 40, mk));
        ctx.stroke();
        ctx.strokeStyle = th.fg;
        ctx.lineWidth = lerp(2, 2.5, mk);
        ctx.stroke();
        ctx.globalAlpha = 1 - prog(F, T.morph, T.morph + 12);
        crosshair(ctx, p[0], p[1], 38 * (1 - mk * 0.5), th.fg, th.bg, 1);
        ctx.restore();
      }
    }
  };
  const phoneMorph = (F: number) => spring((F - (T.morph + 2)) / FPS, { freq: 1.9, damp: 0.67 });

  // ================================================================ 03 ZONES: typed as outlines, filled, exploded
  const ISO = {
    a: Math.SQRT1_2,
    b: Math.SQRT1_2 * Math.tan(Math.PI / 6),
    c: -Math.SQRT1_2,
    d: Math.SQRT1_2 * Math.tan(Math.PI / 6),
  };
  const ZN = "Zones";
  const LAYER_LABEL = ["ana · UTC-5 · 09:00", "kai · UTC+0 · 14:00", "mo · UTC+1 · 15:00"];
  /** the day view in phone-local coordinates (centred); build = per-element 0..1, filled = the solid state */
  const slotRect = (w: number, h: number, i: number) => ({
    x: -w / 2 + 0.07 * w,
    y: -h / 2 + 0.3 * h + i * 0.125 * h,
    w: w - 0.14 * w,
    h: 0.1 * h,
  });
  const dayView = (
    ctx: Ctx,
    F: number,
    w: number,
    h: number,
    o: { build: number; filled: boolean; frame: number; slots: number; bodyFill?: string },
  ) => {
    const th = theme(F),
      x0 = -w / 2,
      y0 = -h / 2,
      pad = 0.07 * w,
      b = (a: number, d = 10) => clamp((F - a) / d) * o.build + (1 - o.build);
    ctx.save();
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    // body
    if (o.frame > 0) {
      ctx.globalAlpha = o.frame;
      rr(ctx, x0, y0, w, h, 40);
      ctx.fillStyle = o.bodyFill ?? th.bg;
      ctx.fill();
      ctx.strokeStyle = th.fg;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.fillStyle = th.fg;
      rr(ctx, -0.12 * w, y0 + 14, 0.24 * w, 6, 3);
      ctx.fill();
      // header bar
      const hb = b(488);
      if (hb > 0) {
        rr(ctx, x0 + pad, y0 + 0.06 * h, (w - 2 * pad) * hb, 0.07 * h, 12);
        if (o.filled) {
          ctx.fillStyle = alpha(th.fg, 0.12);
          ctx.fill();
        }
        ctx.strokeStyle = th.fg;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      // avatar placeholder with a drawn X, and two text lines
      const ab = b(498),
        as = 0.17 * w,
        ax = x0 + pad,
        ay = y0 + 0.165 * h;
      if (ab > 0) {
        rr(ctx, ax, ay, as, as, 10);
        if (o.filled) {
          ctx.fillStyle = alpha(th.fg, 0.1);
          ctx.fill();
        }
        ctx.lineWidth = 2;
        ctx.stroke();
        const xk = clamp((F - 500) / 8) * o.build + (1 - o.build);
        line(ctx, [[ax + 8, ay + 8], lp([ax + 8, ay + 8], [ax + as - 8, ay + as - 8], xk)], th.fg, 1.5);
        line(ctx, [[ax + as - 8, ay + 8], lp([ax + as - 8, ay + 8], [ax + 8, ay + as - 8], xk)], th.fg, 1.5);
        ctx.globalAlpha = o.frame;
        line(
          ctx,
          [
            [ax + as + 16, ay + as * 0.3],
            [ax + as + 16 + w * 0.42 * ab, ay + as * 0.3],
          ],
          th.fg,
          2,
        );
        line(
          ctx,
          [
            [ax + as + 16, ay + as * 0.72],
            [ax + as + 16 + w * 0.26 * ab, ay + as * 0.72],
          ],
          alpha(th.fg, 0.5),
          2,
        );
      }
      ctx.globalAlpha = 1;
    }
    // five time-slot rows (they outlive the phone: they become the day column)
    ctx.globalAlpha = o.slots;
    for (let i = 0; i < 5; i++) {
      const sb = b(508 + 7 * i);
      if (sb <= 0) continue;
      const r = slotRect(w, h, i);
      rr(ctx, r.x, r.y, r.w * sb, r.h, 10);
      if (o.filled) {
        ctx.fillStyle = i === 2 ? th.fg : alpha(th.fg, 0.08);
        ctx.fill();
      }
      ctx.strokeStyle = th.fg;
      ctx.lineWidth = 2;
      ctx.stroke();
      const lc = o.filled && i === 2 ? th.bg : th.fg;
      dot(ctx, r.x + 22, r.y + r.h / 2, 7 * sb, lc);
      line(
        ctx,
        [
          [r.x + 42, r.y + r.h / 2],
          [r.x + 42 + (r.w * 0.5 - 20) * sb, r.y + r.h / 2],
        ],
        lc,
        2,
      );
    }
    ctx.restore();
  };
  const zones = (ctx: Ctx, F: number) => {
    const th = theme(F),
      mk = phoneMorph(F),
      w = lerp(76, D.phW, mk),
      h = lerp(76, D.phH, mk),
      filled = F >= T.fill;
    // tilt to isometric, explode into three layers, then collapse and right itself
    const tk =
        ease.inOutCubic(prog(F, T.fill + 6, T.fill + 30)) * (1 - ease.inOutCubic(prog(F, T.column + 4, T.column + 20))),
      collapse = 1 - ease.inCubic(prog(F, T.column, T.column + 12));
    const M = { a: lerp(1, ISO.a, tk), b: lerp(0, ISO.b, tk), c: lerp(0, ISO.c, tk), d: lerp(1, ISO.d, tk) },
      ctr = lp(D.phC, D.stackC, tk),
      off = (j: number) =>
        j === 0 ? 0 : -D.stackD * j * sp(F - 600 - 5 * (j - 1), { freq: 2.6, damp: 0.67 }) * collapse;
    const frameA = 1 - prog(F, T.column + 14, T.column + 26),
      stretch = ease.inOutCubic(prog(F, T.column + 16, T.buffer));
    // shadow (the only one in the film): flat ink at 6%, 10 px down, upright only
    if (tk < 1 && frameA > 0) {
      ctx.save();
      ctx.globalAlpha = (1 - tk) * frameA;
      rr(ctx, ctr[0] - w / 2, ctr[1] - h / 2 + 10, w, h, 40);
      ctx.fillStyle = alpha(th.fg, 0.06);
      ctx.fill();
      ctx.restore();
    }
    for (let j = 0; j < 3; j++) {
      if (j > 0 && off(j) === 0) continue;
      ctx.save();
      ctx.translate(ctr[0], ctr[1] + off(j));
      ctx.transform(M.a, M.b, M.c, M.d, 0, 0);
      dayView(ctx, F, w, h, { build: 1, filled, frame: frameA, slots: stretch > 0 ? 0 : 1 });
      ctx.restore();
    }
    // the slot list stretches into the day column
    if (stretch > 0) {
      for (let i = 0; i < 5; i++) {
        const s = slotRect(w, h, i),
          b = blockRect(T.buffer, i),
          x = lerp(ctr[0] + s.x, b.x, stretch),
          y = lerp(ctr[1] + s.y, b.y, stretch),
          ww = lerp(s.w, b.w, stretch),
          hh = lerp(s.h, b.h, stretch);
        rr(ctx, x, y, ww, hh, 10);
        ctx.fillStyle = i === 2 ? alpha(th.fg, lerp(1, 0.1, stretch)) : alpha(th.fg, lerp(0.08, 0.1, stretch));
        ctx.fill();
        ctx.strokeStyle = alpha(th.fg, 1 - stretch);
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = th.fg;
        ctx.save();
        rr(ctx, x, y, ww, hh, 10);
        ctx.clip();
        ctx.fillRect(x, y, 6 * stretch, hh);
        ctx.restore();
      }
    }
    // the cursor clicks the third slot
    if (F >= 532 && F < 600) {
      const s = slotRect(D.phW, D.phH, 2),
        tip: Pt = [D.phC[0] + s.x + s.w * 0.72, D.phC[1] + s.y + s.h * 0.55],
        from: Pt = [D.phC[0] + D.phW * 0.9, D.phC[1] + D.phH * 0.62],
        p = lp(from, tip, ease.inOutCubic(prog(F, 532, 551))),
        press = 1 - 0.14 * Math.sin(Math.PI * prog(F, 552, 560)),
        rip = prog(F, 555, 578);
      if (rip > 0 && rip < 1) {
        ctx.save();
        ctx.globalAlpha = 1 - rip;
        ctx.strokeStyle = th.fg;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(tip[0], tip[1], 8 + 36 * ease.outCubic(rip), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      pointer(ctx, p[0], p[1], press, th.fg, th.bg, prog(F, 532, 540) * (1 - prog(F, 578, 592)));
    }
    // the pierce: one vertical line through all three layers at the same slot
    const sl = slotRect(D.phW, D.phH, 2),
      lx = sl.x + sl.w / 2,
      ly = sl.y + sl.h / 2,
      px = ctr[0] + M.a * lx + M.c * ly,
      py0 = ctr[1] + M.b * lx + M.d * ly;
    const pierce = prog(F, 614, 630),
      pOut = 1 - prog(F, T.column, T.column + 8);
    if (pierce > 0 && pOut > 0) {
      const top = py0 + off(2) - 90,
        bot = py0 + 30;
      ctx.save();
      ctx.globalAlpha = pOut;
      line(
        ctx,
        [
          [px, top],
          [px, lerp(top, bot, ease.outCubic(pierce))],
        ],
        th.fg,
        3,
      );
      for (let j = 0; j < 3; j++) {
        const yj = py0 + off(j);
        if (lerp(top, bot, pierce) >= yj) dot(ctx, px, yj, 7, th.fg);
      }
      ctx.restore();
    }
    // layer labels with leader lines (right in landscape, below the stack in the vertical)
    if (F >= 628 && pOut > 0) {
      const rx = (D.phW / 2) * M.a + (-D.phH / 2) * M.c,
        ryl = (D.phW / 2) * M.b + (-D.phH / 2) * M.d;
      for (let j = 0; j < 3; j++) {
        const t = prog(F, 628 + 5 * j, 644 + 5 * j),
          anc: Pt = [ctr[0] + rx, ctr[1] + ryl + off(j)];
        ctx.save();
        ctx.globalAlpha = pOut;
        if (!tall) {
          const end: Pt = [D.stackC[0] + 390, anc[1]];
          leader(ctx, [anc, end], t, C.muted);
          mono(ctx, LAYER_LABEL[j]!, end[0] + 14, end[1] + 10, 28, th.fg, "left", prog(F, 640 + 5 * j, 650 + 5 * j));
        } else {
          const ex = 935 + 18 * j,
            ly2 = 1395 + 44 * j,
            end: Pt = [915, ly2 - 9];
          leader(ctx, [anc, [ex, anc[1]], [ex, ly2 - 9], end], t, C.muted);
          mono(ctx, LAYER_LABEL[j]!, 900, ly2, 28, th.fg, "right", prog(F, 640 + 5 * j, 650 + 5 * j));
        }
        ctx.restore();
      }
    }
    // the word: typed as outlines, filled at 570, then tumbling away to the left
    const W_ = lay(ctx, ZN, EV_SZ),
      left = D.znWord.c ? D.znWord.x - W_.total / 2 : D.znWord.x,
      popK = F >= T.fill ? 1 + 0.06 * Math.exp(-(F - T.fill) / 7) : 1;
    for (let i = 0; i < ZN.length; i++) {
      const at = 486 + 6 * i;
      if (F < at) continue;
      const tb = ease.inCubic(prog(F, T.column + 2 * i, T.column + 24)),
        x = left + W_.xs[i]! + W_.ws[i]! / 2 - (300 + 70 * (ZN.length - i)) * tb,
        y = D.znWord.y - 0.35 * EV_SZ + 120 * tb * tb;
      glyph(ctx, ZN[i]!, x, y, EV_SZ, {
        rot: -(1.2 + 0.8 * hash(i, 9)) * tb,
        sx: popK,
        sy: popK,
        fill: filled ? th.fg : undefined,
        stroke: filled ? undefined : th.fg,
        lw: 5,
        alpha: 1 - prog(tb, 0.4, 1),
      });
    }
    typed(ctx, F, CAP.zo[1], CAP.zo[0], D.znCap.x, D.znCap.y, {
      c: D.znCap.c,
      color: th.fg,
      a: 1 - prog(F, T.column, T.column + 10),
    });
  };

  // ================================================================ 04 BUFFER: spaced by a ruler
  const BLOCKS = ["standup", "1:1", "review", "sync", "plan"];
  const minutes = (F: number) =>
    track(
      F,
      FPS,
      [
        [0, 4],
        [777, 6],
        [807, 8],
        [837, 10],
      ],
      SP,
    );
  const gapPx = (F: number, i: number) => col.ppm * minutes(F) * sp(F - (747 + 30 * i));
  const blockRect = (F: number, i: number) => {
    let y = col.y;
    for (let k = 0; k < i; k++) y += col.bh + gapPx(F, k);
    return { x: col.x, y, w: col.w, h: col.bh };
  };
  const BU = "Buffer";
  const buffer = (ctx: Ctx, F: number) => {
    const th = theme(F),
      fall = ease.inCubic(prog(F, T.dive, T.dive + 22)),
      fallY = 260 * fall,
      fallA = 1 - fall;
    const expand = ease.inCubic(prog(F, T.dive + 4, T.poll)),
      expandFade = 1 - prog(F, T.dive + 16, T.poll);
    // blocks
    for (let i = 0; i < 5; i++) {
      let b = blockRect(F, i);
      const top = i === 0;
      if (top && expand > 0) {
        const big = { x: Q[0] - W / 3, y: Q[1] - H / 3, w: (2 * W) / 3, h: (2 * H) / 3 };
        b = {
          x: lerp(b.x, big.x, expand),
          y: lerp(b.y, big.y, expand),
          w: lerp(b.w, big.w, expand),
          h: lerp(b.h, big.h, expand),
        };
      }
      ctx.save();
      ctx.globalAlpha = top ? expandFade : fallA;
      if (!top) ctx.translate(0, fallY);
      rr(ctx, b.x, b.y, b.w, b.h, 10);
      ctx.fillStyle = alpha(th.fg, 0.1);
      ctx.fill();
      ctx.clip();
      ctx.fillStyle = th.fg;
      ctx.fillRect(b.x, b.y, 6, b.h);
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = (top ? 1 - prog(F, T.dive, T.dive + 12) : fallA) * prog(F, T.buffer - 4, T.buffer + 10);
      if (!top) ctx.translate(0, fallY);
      mono(ctx, BLOCKS[i]!, b.x + 26, b.y + b.h / 2 + 10, 30, th.fg);
      ctx.restore();
    }
    // the next word waits in the top block, in muted serif
    const pa = prog(F, T.ten + 2, T.ten + 18);
    if (pa > 0) {
      const b = blockRect(F, 0);
      text(ctx, "Poll", Q[0], b.y + b.h / 2 + 16, {
        size: PO_BLOCK,
        family: F_.serif,
        color: C.muted,
        align: "center",
        alpha: pa,
      });
    }
    ctx.save();
    ctx.globalAlpha = fallA;
    ctx.translate(0, fallY);
    // the drag handle: pulled down with each gap
    const last = blockRect(F, 4),
      hy = last.y + last.h + 16,
      hx = col.x + col.w / 2,
      ha = prog(F, T.buffer + 4, T.buffer + 18);
    if (ha > 0) {
      ctx.save();
      ctx.globalAlpha *= ha;
      rr(ctx, hx - 36, hy, 72, 26, 13);
      ctx.fillStyle = th.bg;
      ctx.fill();
      ctx.strokeStyle = th.fg;
      ctx.lineWidth = 2;
      ctx.stroke();
      line(
        ctx,
        [
          [hx - 7, hy + 10],
          [hx, hy + 5],
          [hx + 7, hy + 10],
        ],
        th.fg,
        2,
      );
      line(
        ctx,
        [
          [hx - 7, hy + 16],
          [hx, hy + 21],
          [hx + 7, hy + 16],
        ],
        th.fg,
        2,
      );
      ctx.restore();
    }
    // the ruler on the right counts the gap
    const rx = col.x + col.w + 36,
      ry0 = col.y,
      ry1 = last.y + last.h,
      ra = prog(F, T.buffer + 6, T.buffer + 20);
    if (ra > 0) {
      ctx.save();
      ctx.globalAlpha *= ra;
      ctx.fillStyle = C.muted;
      ctx.fillRect(rx, ry0, 1.5, ry1 - ry0);
      for (let y = ry0, k = 0; y <= ry1; y += 16, k++)
        ctx.fillRect(rx - (k % 5 === 0 ? 14 : 7), y, k % 5 === 0 ? 14 : 7, 1.5);
      const count = [750, 780, 810, 840].filter((f) => F >= f).length,
        val = [0, 4, 6, 8, 10][count]!,
        gi = Math.max(0, count - 1),
        gy = count === 0 ? col.y + col.bh / 2 : blockRect(F, gi).y + col.bh + gapPx(F, gi) / 2,
        big = sp(F - T.ten, { freq: 3, damp: 0.6 }),
        rs = lerp(32, 44, big);
      line(
        ctx,
        [
          [rx, gy],
          [rx + 12, gy],
        ],
        th.fg,
        2,
      );
      mono(ctx, `${val} min`, rx + 22, gy + rs * 0.35, rs, th.fg);
      // brackets mark each gap at the payoff
      for (let i = 0; i < 4; i++) {
        const t = prog(F, T.ten + 3 * i, T.ten + 10 + 3 * i);
        if (t <= 0) continue;
        const b = blockRect(F, i),
          y0 = b.y + b.h + 2,
          y1 = y0 + gapPx(F, i) - 4,
          bx = col.x + col.w + 12;
        ctx.globalAlpha = ra * t * fallA;
        line(
          ctx,
          [
            [bx - 6, y0],
            [bx, y0],
            [bx, y1],
            [bx - 6, y1],
          ],
          th.fg,
          2,
        );
      }
      ctx.restore();
    }
    // the word: its letters touch at first, then breathe with the gaps
    let gsum = 0;
    for (let i = 0; i < 4; i++) gsum += gapPx(F, i);
    const trk = Math.min(gsum / 4, V(64, 60)),
      W_ = lay(ctx, BU, EV_SZ),
      tot = W_.total - 5 * 5 + 5 * trk,
      left = D.buWord.c ? D.buWord.x - tot / 2 : D.buWord.x;
    for (let i = 0; i < BU.length; i++) {
      const k = sp(F - (T.buffer + 3 * i), { freq: 2.6, damp: 0.67 }),
        x = left + W_.xs[i]! + W_.ws[i]! / 2 + i * (trk - 5) - (1 - k) * 90;
      glyph(ctx, BU[i]!, x, D.buWord.y - 0.35 * EV_SZ, EV_SZ, {
        fill: th.fg,
        alpha: clamp(k * 1.5) * (1 - prog(F, T.dive, T.dive + 10)),
      });
    }
    ctx.restore();
    typed(ctx, F, CAP.bu[1], CAP.bu[0], D.buCap.x, D.buCap.y, {
      c: D.buCap.c,
      color: th.fg,
      a: 1 - prog(F, T.dive + 6, T.dive + 16),
    });
  };

  // ================================================================ 05 POLL: darkened by votes
  const PILLS = ["Tue 10:00", "Wed 15:00", "Thu 14:00"];
  const VOTES: [number, number][] = [
    [990, 2],
    [1020, 1],
    [1050, 2],
    [1080, 2],
  ];
  const pillRect = (j: number) => {
    const { w, h } = D.pill;
    if (!tall) {
      const gap = 44,
        x = cx - (3 * w + 2 * gap) / 2 + j * (w + gap);
      return { x, y: D.poBase + 120, w, h };
    }
    return { x: cx - w / 2, y: D.poBase + 150 + j * (h + 30), w, h };
  };
  const poll = (ctx: Ctx, F: number) => {
    const th = theme(F),
      out = 1 - prog(F, T.ball + 8, T.ball + 26),
      v = VOTES.reduce((s, [f]) => s + sp(F - f, { freq: 3, damp: 0.67 }), 0),
      count = VOTES.filter(([f]) => F >= f).length,
      win = prog(F, T.win, T.win + 6),
      grow = 1 + 0.15 * sp(F - T.win, { freq: 2.4, damp: 0.6 });
    ctx.save();
    ctx.globalAlpha = out;
    // the word
    ctx.save();
    ctx.translate(cx, D.poBase - 0.3 * PO_SZ);
    ctx.scale(grow, grow);
    text(ctx, "Poll", 0, 0.3 * PO_SZ, {
      size: PO_SZ,
      family: F_.serif,
      color: mix(C.muted, th.fg, clamp(v / 4)),
      align: "center",
    });
    ctx.restore();
    // the meter
    const ma = prog(F, T.poll + 20, T.poll + 34),
      mw = 300,
      mx = cx - mw / 2 - 36,
      my = D.poBase + (tall ? 58 : 44) + 22 * (grow - 1) * 2;
    if (ma > 0) {
      ctx.save();
      ctx.globalAlpha *= ma;
      ctx.strokeStyle = th.fg;
      ctx.lineWidth = 1.5;
      rr(ctx, mx, my, mw, 8, 4);
      ctx.stroke();
      ctx.fillStyle = th.fg;
      rr(ctx, mx, my, mw * clamp(v / 4) || 0.01, 8, 4);
      ctx.fill();
      mono(ctx, `${count}/4`, mx + mw + 20, my + 11, 30, th.fg);
      ctx.restore();
    }
    // the pills
    for (let j = 0; j < 3; j++) {
      if (j === 2 && F >= T.ball) continue;
      const k = sp(F - (T.poll + 4 + 10 * j), { freq: 3, damp: 0.6 });
      if (k <= 0) continue;
      const r = pillRect(j),
        winner = j === 2;
      ctx.save();
      ctx.translate(r.x + r.w / 2, r.y + r.h / 2);
      ctx.scale(k, k);
      rr(ctx, -r.w / 2, -r.h / 2, r.w, r.h, r.h / 2);
      if (winner && win > 0) {
        ctx.fillStyle = alpha(th.fg, win);
        ctx.fill();
      }
      if (!winner && win > 0) {
        ctx.strokeStyle = alpha(th.fg, 1 - win);
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.strokeStyle = alpha(C.muted, win);
        ctx.setLineDash([6, 6]);
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        ctx.strokeStyle = th.fg;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      const lc = winner ? mix(th.fg, th.bg, win) : mix(th.fg, C.muted, win);
      mono(ctx, PILLS[j]!, 0, 11, 32, lc, "center");
      ctx.restore();
    }
    // the focus ring hops to each chosen pill
    const fa = prog(F, 986, 994) * (1 - prog(F, T.win, T.win + 10));
    if (fa > 0) {
      const idx = track(
          F,
          FPS,
          [
            [0, 2],
            [1016, 1],
            [1046, 2],
          ],
          { freq: 3, damp: 0.67 },
        ),
        a = pillRect(Math.floor(idx)),
        b = pillRect(Math.min(2, Math.floor(idx) + 1)),
        t = idx - Math.floor(idx),
        x = lerp(a.x, b.x, t),
        y = lerp(a.y, b.y, t);
      ctx.save();
      ctx.globalAlpha *= fa;
      rr(ctx, x - 9, y - 9, a.w + 18, a.h + 18, (a.h + 18) / 2);
      ctx.strokeStyle = th.fg;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    }
    // the votes: a small ink dot drops under (or, stacked, beside) the chosen pill
    const slot = [0, 0, 0];
    const finals = [0, 1, 3];
    for (const [f, j] of VOTES) {
      const s = slot[j]!++;
      if (F < f - 4) continue;
      const r = pillRect(j),
        k = sp(F - f + 4, { freq: 3, damp: 0.5 }),
        tx = tall ? r.x + r.w + 34 + s * 26 : r.x + r.w / 2 + s * 26 - (finals[j]! - 1) * 13,
        ty = tall ? r.y + r.h / 2 : r.y + r.h + 32;
      if (j === 2 && F >= T.ball + 4) continue;
      dot(ctx, tx, ty - (1 - k) * 60, 8, th.fg);
    }
    typed(ctx, F, CAP.po[1], CAP.po[0], cx, D.poCapY, { c: true, color: th.fg });
    ctx.restore();
  };

  // ================================================================ 06 NUDGE: filled by a ball
  const NU = "Nudge",
    CONTACT = [1230, 1260, 1290, 1320, 1350],
    R = 20,
    APEX_F = 1394;
  const nuGeo = (ctx: Ctx) => {
    const W_ = lay(ctx, NU, D.nuSize),
      left = cx + D.pan - W_.total / 2;
    return [...NU].map((ch, i) => ({
      x: left + W_.xs[i]! + W_.ws[i]! / 2,
      top: D.nuBase - glyphTop(ctx, ch, D.nuSize),
    }));
  };
  const para = (a: Pt, b: Pt, h: number, t: number): Pt => [
    lerp(a[0], b[0], t),
    lerp(a[1], b[1], t) - 4 * h * t * (1 - t),
  ];
  /** the ball, a pure function of the frame: world position and radius */
  const ball = (ctx: Ctx, F: number): { p: Pt; r: number } => {
    const g = nuGeo(ctx),
      pr = pillRect(2),
      start: Pt = [pr.x + pr.w / 2, pr.y + pr.h / 2],
      cp = (i: number): Pt => [g[i]!.x, g[i]!.top - R];
    if (F < 1188) return { p: start, r: R };
    if (F < CONTACT[0]!) {
      const a = start,
        b = cp(0);
      return { p: para(a, b, D.apex + 80 + Math.max(0, a[1] - b[1]) / 2, prog(F, 1188, CONTACT[0]!)), r: R };
    }
    for (let i = 0; i < 4; i++)
      if (F < CONTACT[i + 1]!) {
        const a = cp(i),
          b = cp(i + 1);
        return { p: para(a, b, D.apex + Math.abs(a[1] - b[1]) / 2, prog(F, CONTACT[i]!, CONTACT[i + 1]!)), r: R };
      }
    const e = cp(4),
      apexP: Pt = [e[0] + 70, e[1] - V(380, 460)];
    if (F < APEX_F) {
      const t = prog(F, CONTACT[4]!, APEX_F);
      return { p: [lerp(e[0], apexP[0], t), e[1] - (e[1] - apexP[1]) * (2 * t - t * t)], r: R };
    }
    // the fall at the lens: exponential growth to cover the frame
    const t = prog(F, APEX_F, T.flip),
      c: Pt = [cx + D.pan, cy];
    return { p: lp(apexP, c, ease.inOutCubic(t)), r: R * 72 ** t };
  };
  const nudge = (ctx: Ctx, F: number) => {
    const th = theme(F),
      g = nuGeo(ctx),
      fallT = prog(F, APEX_F, T.flip),
      b = ball(ctx, F),
      gone = 1 - prog(F, T.fall, T.fall + 18);
    // ghost outline letters, filled on contact with a 5 px dip
    const ghostA = prog(F, 1188, 1212);
    for (let i = 0; i < NU.length; i++) {
      const c = CONTACT[i]!,
        hit = F >= c,
        dip = hit ? 5 * Math.exp(-(F - c) / 5) * Math.cos((F - c) * 0.45) : 0;
      let x = g[i]!.x,
        y = D.nuBase - 0.35 * D.nuSize + dip,
        rot = 0;
      if (fallT > 0) {
        const dx = x - b.p[0],
          dy = y - b.p[1],
          d = Math.hypot(dx, dy) || 1,
          need = b.r + 90;
        if (d < need) {
          x = b.p[0] + (dx / d) * need;
          y = b.p[1] + (dy / d) * need;
          rot = (need - d) * 0.004 * (hash(i, 5) < 0.5 ? -1 : 1);
        }
      }
      glyph(ctx, NU[i]!, x, y, D.nuSize, {
        rot,
        fill: hit ? th.fg : undefined,
        stroke: hit ? undefined : C.muted,
        lw: 5,
        alpha: ghostA * (1 - prog(fallT, 0.3, 0.9)),
      });
    }
    // annotations: '1 day before' to the first contact, '10 min before' to the fourth
    const labY = Math.min(g[0]!.top, g[3]!.top) - D.apex - V(96, 110);
    for (const [i, s, at] of [
      [0, "1 day before", 1232],
      [3, "10 min before", 1322],
    ] as const) {
      const t = prog(F, at, at + 14) * gone,
        anc: Pt = [g[i]!.x, g[i]!.top - 4];
      if (t <= 0) continue;
      ctx.save();
      ctx.globalAlpha = gone;
      leader(ctx, [anc, [anc[0], labY + 12]], t, C.muted);
      mono(ctx, s, anc[0], labY, 28, C.muted, "center", prog(F, at + 6, at + 16));
      ctx.restore();
    }
    typed(ctx, F, CAP.nu[1], CAP.nu[0], cx + D.pan, D.nuCapY, { c: true, color: th.fg, a: gone });
    // onion-skin rings along the arcs (every 6 frames over the last 36)
    if (F >= 1190 && F < APEX_F + 6) {
      ctx.save();
      ctx.strokeStyle = C.muted;
      ctx.lineWidth = 1.5;
      for (let k = 1; k <= 6; k++) {
        const f = Math.floor(F / 6) * 6 - 6 * (k - 1);
        if (f < 1188 || f > APEX_F || F - f < 2) continue;
        const q = ball(ctx, f);
        ctx.globalAlpha = 0.9 - k * 0.1;
        ctx.beginPath();
        ctx.arc(q.p[0], q.p[1], R, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
    // the winning pill collapses into the ball
    if (F >= T.ball && F < 1188) {
      const pr = pillRect(2),
        c1 = ease.inOutCubic(prog(F, T.ball, T.ball + 10)),
        c2 = ease.inOutCubic(prog(F, T.ball + 10, 1188)),
        h = lerp(pr.h, 2 * R, c2),
        w = lerp(lerp(pr.w, pr.h, c1), 2 * R, c2);
      rr(ctx, pr.x + pr.w / 2 - w / 2, pr.y + pr.h / 2 - h / 2, w, h, h / 2);
      ctx.fillStyle = th.fg;
      ctx.fill();
      mono(ctx, PILLS[2]!, pr.x + pr.w / 2, pr.y + pr.h / 2 + 11, 32, th.bg, "center", 1 - prog(F, T.ball, T.ball + 6));
      return;
    }
    if (F < 1188) return;
    // squash at contact (1.4 × 0.7 for 3 frames), stretch along the velocity near it
    const near = CONTACT.map((c) => F - c).reduce((m, d) => (Math.abs(d) < Math.abs(m) ? d : m), 99);
    ctx.save();
    ctx.translate(b.p[0], b.p[1]);
    if (near >= -0.5 && near < 2.5 && fallT === 0) {
      ctx.translate(0, R * 0.3);
      ctx.scale(1.4, 0.7);
    } else if (Math.abs(near) < 7 && fallT === 0) {
      const q0 = ball(ctx, F - 0.5).p,
        q1 = ball(ctx, F + 0.5).p,
        ang = Math.atan2(q1[1] - q0[1], q1[0] - q0[0]),
        s = 1 + 0.28 * (1 - Math.abs(near) / 7);
      ctx.rotate(ang);
      ctx.scale(s, 1 / s);
      ctx.rotate(-ang);
    }
    dot(ctx, 0, 0, b.r, th.fg);
    ctx.restore();
  };

  // ================================================================ 07 ROTATE: carried round a ring (dark)
  const RO = "Rotate",
    RO_SZ = 180;
  const ringRot = (F: number) =>
    track(
      F,
      FPS,
      [
        [0, 0],
        [1551, -Math.PI / 2],
        [1581, -Math.PI],
        [1611, (-3 * Math.PI) / 2],
      ],
      { freq: 3, damp: 0.62 },
    );
  const rotate = (ctx: Ctx, F: number) => {
    const th = theme(F),
      [rcx, rcy] = D.rc,
      RR = D.rr,
      gather = ease.inCubic(prog(F, 1626, 1662)),
      sq = ease.inCubic(prog(F, 1622, 1648)),
      phi = ringRot(F);
    ctx.save();
    ctx.translate(rcx, rcy);
    ctx.scale(1 - gather, 1 - gather);
    ctx.translate(-rcx, -rcy);
    // the ring draws on from the upper left while the word rides its head
    const s0 = -Math.PI / 2 - 0.95,
      draw = ease.inOutCubic(prog(F, T.flip + 2, 1500));
    ctx.strokeStyle = th.fg;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    if (draw > 0) {
      ctx.beginPath();
      ctx.arc(rcx, rcy, RR, s0, s0 + 2 * Math.PI * draw);
      ctx.stroke();
    }
    // 24 hour ticks (they turn with the ring)
    for (let k = 0; k < 24; k++) {
      const t = prog(F, 1460 + k, 1472 + k);
      if (t <= 0) continue;
      const a = phi - Math.PI / 2 + (k * Math.PI) / 12,
        len = k % 6 === 0 ? 24 : 12;
      ctx.globalAlpha = t;
      ctx.lineWidth = k % 6 === 0 ? 2.5 : 1.5;
      ctx.beginPath();
      ctx.moveTo(rcx + Math.cos(a) * (RR - 6), rcy + Math.sin(a) * (RR - 6));
      ctx.lineTo(rcx + Math.cos(a) * (RR - 6 - len), rcy + Math.sin(a) * (RR - 6 - len));
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // the wedge: the late slot, fixed at the top while the ring turns its people under it
    const wk = sp(F - 1522, { freq: 3, damp: 0.62 });
    if (wk > 0) {
      const half = ((16 * Math.PI) / 180) * wk;
      ctx.beginPath();
      ctx.arc(rcx, rcy, RR - 40, -Math.PI / 2 - half, -Math.PI / 2 + half);
      ctx.arc(rcx, rcy, RR * 0.2, -Math.PI / 2 + half, -Math.PI / 2 - half, true);
      ctx.closePath();
      ctx.fillStyle = th.fg;
      ctx.fill();
      const tip: Pt = [rcx + 18, rcy - RR * 0.62],
        elbow: Pt = [rcx + (tall ? 40 : RR * 0.55), rcy - RR - (tall ? 76 : 60)],
        end: Pt = [elbow[0] + (tall ? 14 : 26), elbow[1]];
      leader(ctx, [tip, elbow, end], prog(F, 1532, 1546), C.muted);
      mono(ctx, "late slot · 21:00", end[0] + 12, end[1] + 10, 28, th.fg, "left", prog(F, 1540, 1552));
    }
    // centre crosshair
    const ch = prog(F, 1446, 1466);
    if (ch > 0) {
      ctx.globalAlpha = ch;
      crosshair(ctx, rcx, rcy, 14, th.fg, th.bg);
      ctx.globalAlpha = 1;
    }
    // four people on the ring
    for (let i = 0; i < 4; i++) {
      const k = sp(F - (1486 + 4 * i), { freq: 3, damp: 0.6 }),
        a = phi - Math.PI / 2 + (i * Math.PI) / 2,
        x = rcx + Math.cos(a) * RR,
        y = rcy + Math.sin(a) * RR;
      dot(ctx, x, y, 10 * k, th.fg);
      if (k > 0) {
        ctx.beginPath();
        ctx.arc(x, y, 10 * k + 4, 0, Math.PI * 2);
        ctx.strokeStyle = th.bg;
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      mono(ctx, NAMES[i]!, x + Math.cos(a) * 46, y + Math.sin(a) * 40 + 10, 30, th.fg, "center", prog(F, 1508, 1522));
    }
    // the log under the ring, one entry per step
    const logW = LOG.join("   ").length * 18,
      lx0 = rcx - logW / 2;
    let off = 0;
    LOG.forEach((s, i) => {
      const at = T.turns + 30 * i,
        x = lx0 + off,
        latest = F < at + 30 || i === 3;
      off += (s.length + 3) * 18;
      typed(ctx, F, s, at, x, D.logY, { color: latest ? th.fg : C.muted, sz: 30, cursor: false });
    });
    ctx.restore();
    // the word rides once round the outside, then peels off and sets flat
    const W_ = lay(ctx, RO, RO_SZ),
      Rb = RR + 22,
      ride = V(0.8, 0.62),
      head = s0 + 2 * Math.PI * draw,
      left = D.roWord.c ? D.roWord.x - W_.total / 2 : D.roWord.x;
    for (let i = 0; i < RO.length; i++) {
      const xc = W_.xs[i]! + W_.ws[i]! / 2,
        th_ = head - ((W_.total - xc) * ride) / Rb - 0.05,
        rp: Pt = [rcx + Math.cos(th_) * (Rb + 0.35 * RO_SZ * ride), rcy + Math.sin(th_) * (Rb + 0.35 * RO_SZ * ride)],
        k = sp(F - 1500 - 3 * i, { freq: 2.4, damp: 0.67 }),
        flat: Pt = [left + xc, D.roWord.y - 0.35 * RO_SZ],
        p = lp(rp, flat, k);
      let r0 = th_ + Math.PI / 2;
      r0 = Math.atan2(Math.sin(r0), Math.cos(r0));
      const s = lerp(ride, 1, k);
      glyph(ctx, RO[i]!, p[0], p[1] + 0.35 * RO_SZ * sq, RO_SZ, {
        rot: lerp(r0, 0, k),
        sx: s,
        sy: s * (1 - sq),
        base: sq > 0,
        fill: th.fg,
        alpha: prog(F, T.flip + 4 + 2 * i, T.flip + 12 + 2 * i) * (1 - prog(sq, 0.8, 1)),
      });
    }
    typed(ctx, F, CAP.ro[1], CAP.ro[0], D.roCap.x, D.roCap.y, {
      c: D.roCap.c,
      color: th.fg,
      a: 1 - prog(F, 1624, 1640),
    });
    // the one dot everything gathers into
    if (gather > 0.5) dot(ctx, rcx, rcy, 14 * prog(gather, 0.5, 1), th.fg);
  };

  // ================================================================ END: dropped by a moving dot
  const OR = "Oriel",
    OR_SZ = 200,
    SW0 = 1712,
    SW1 = 1766;
  const endGeo = (ctx: Ctx) => {
    const W_ = lay(ctx, OR + ".", OR_SZ),
      left = cx - W_.total / 2,
      xs = [...OR].map((_, i) => left + W_.xs[i]! + W_.ws[i]! / 2),
      period: Pt = [left + W_.xs[5]! + W_.ws[5]! / 2, D.orBase - 12],
      sx0 = left - 60,
      sweepY = D.orBase - 250;
    return { xs, period, sx0, sweepY, left };
  };
  const endDot = (ctx: Ctx, F: number): Pt => {
    const g = endGeo(ctx);
    if (F < SW0) {
      const t = ease.inOutCubic(prog(F, T.end, SW0)),
        a = D.rc,
        b: Pt = [g.sx0, g.sweepY],
        c: Pt = [(a[0] + b[0]) / 2, Math.min(a[1], b[1]) - 160];
      return [
        (1 - t) ** 2 * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0],
        (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1],
      ];
    }
    if (F < SW1) {
      const t = prog(F, SW0, SW1),
        x = lerp(g.sx0, g.period[0], t);
      return [x, g.sweepY - 50 * Math.sin(Math.PI * t)];
    }
    const t = prog(F, SW1, SW1 + 12);
    return [g.period[0], lerp(g.sweepY, g.period[1], t * t)];
  };
  const ending = (ctx: Ctx, F: number) => {
    const th = theme(F),
      g = endGeo(ctx);
    // a large faint ring drifts behind the lockup
    const ra = prog(F, 1770, 1810);
    if (ra > 0) {
      ctx.save();
      ctx.globalAlpha = ra * 0.1;
      ctx.strokeStyle = th.fg;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(lerp(cx - 300, cx + 300, prog(F, 1770, N)), D.orBase - 60, V(470, 520), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    // letters: each dropped by the sweeping dot and sprung up from where it lands
    const tOf = (x: number) => SW0 + ((x - g.sx0) / (g.period[0] - g.sx0)) * (SW1 - SW0);
    for (let i = 0; i < OR.length; i++) {
      const x = g.xs[i]!,
        t0 = tOf(x),
        fall = prog(F, t0, t0 + 8);
      if (F < t0) continue;
      if (fall < 1) {
        const y0 = g.sweepY - 50 * Math.sin(Math.PI * prog(t0, SW0, SW1));
        dot(ctx, x, lerp(y0, D.orBase, fall * fall), 7, th.fg);
      }
      const k = sp(F - t0 - 8, { freq: 2.6, damp: 0.6 });
      if (k > 0)
        glyph(ctx, OR[i]!, x, D.orBase - 0.35 * OR_SZ, OR_SZ, {
          sx: clamp(k * 1.3, 0, 1.1),
          sy: k,
          base: true,
          fill: th.fg,
        });
    }
    // the dot and its trail; it lands as the full stop
    if (F >= T.end) {
      for (let k = 6; k >= 1; k--) {
        const f = F - 3 * k;
        if (f < T.end + 2 || f > SW1 + 4) continue;
        const p = endDot(ctx, f);
        dot(ctx, p[0], p[1], 12 * (1 - k / 7.5), alpha(th.fg, 0.9 - k * 0.1));
      }
      const p = endDot(ctx, F),
        land = F >= SW1 + 12 ? 1 + 0.2 * Math.exp(-(F - SW1 - 12) / 5) * Math.cos((F - SW1 - 12) * 0.5) : 1;
      dot(ctx, p[0], p[1], 14 * land, th.fg);
    }
    // the tagline types beneath
    if (!tall) typed(ctx, F, CAP.tag[1], CAP.tag[0], cx, D.tagY, { c: true, color: th.fg });
    else {
      const a = "Find a time that",
        b = "works for everyone.";
      typed(ctx, F, a, CAP.tag[0], cx, D.tagY, { c: true, color: th.fg, cursor: F < CAP.tag[0] + 2 * a.length + 2 });
      typed(ctx, F, b, CAP.tag[0] + 2 * a.length + 2, cx, D.tagY + 62, { c: true, color: th.fg });
    }
    const ua = ease.outCubic(prog(F, 1848, 1864));
    if (ua > 0) mono(ctx, "oriel.example", cx, D.urlY + (1 - ua) * 16, 44, th.fg, "center", ua);
    // the index
    for (let i = 0; i < 7; i++) {
      const at = T.index + 12 * i,
        a = prog(F, at, at + 8);
      if (a <= 0) continue;
      let x: number, y: number, cw: number;
      if (!tall) {
        cw = 220;
        x = cx - (7 * cw) / 2 + i * cw;
        y = 880;
      } else {
        cw = 380;
        x = i < 4 ? 130 : 570;
        y = 1300 + (i % 4) * 58;
      }
      ctx.fillStyle = alpha(th.fg, 0.45);
      ctx.fillRect(x, y, (cw - 24) * ease.outCubic(prog(F, at, at + 10)), 1);
      mono(ctx, String(i + 1).padStart(2, "0"), x, y + 40 - (1 - a) * 8, 26, C.muted, "left", a);
      mono(ctx, INDEX[i]!, x + 50, y + 40 - (1 - a) * 8, 30, th.fg, "left", a);
    }
  };

  // ---------------------------------------------------------------- the HUD (outside the camera)
  const hud = (ctx: Ctx, F: number) => {
    const f = Math.floor(F),
      s = `${(f / FPS).toFixed(2).padStart(5, "0")} s   frame ${String(f).padStart(4, "0")}   ${BPM} bpm`;
    mono(ctx, s, W - L.safe.x - 8, L.safe.top + 30, 24, C.muted, "right");
  };

  const paint = (ctx: Ctx, env: Env, F: number) => {
    F = clamp(F, 0, N - 1);
    const th = theme(F),
      c = cam(F),
      bs = base(F);
    ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
    ctx.fillStyle = th.bg;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(bs.roll);
    ctx.scale(bs.k, bs.k);
    ctx.translate(-cx, -cy);
    grid(ctx, F, c);
    // the zoom-through's caption is read, not dived through: it stays on the roll but off the zoom
    if (F >= CAP.ev[0] && F < T.overlap)
      typed(ctx, F, CAP.ev[1], CAP.ev[0], cx, D.evCapY, { c: true, color: th.fg, a: 1 - prog(F, 216, 232) });
    ctx.transform(c.z, 0, 0, c.z, c.tx, c.ty);
    if (F < T.overlap) everyone(ctx, F, c.z);
    else if (F < T.zones) overlap(ctx, env, F);
    else if (F < T.buffer) zones(ctx, F);
    else if (F < T.poll) buffer(ctx, F);
    else if (F < T.flip) {
      if (F < T.nudge) poll(ctx, F);
      if (F >= T.ball) nudge(ctx, F);
    } else if (F < T.end) rotate(ctx, F);
    else ending(ctx, F);
    ctx.restore();
  };

  const cuts: [number, string, number][] = [
    [0, "everyone", 1],
    [T.snap, "snap", 1],
    [T.zoom, "zoom-through", 12],
    [T.overlap, "overlap", 1],
    [T.lock, "lock", 1],
    [T.morph, "crosshair-phone", 1],
    [T.zones, "zones", 1],
    [T.fill, "fill", 1],
    [T.column, "column", 1],
    [T.buffer, "buffer", 1],
    [T.ten, "ten-minutes", 1],
    [T.dive, "dive", 12],
    [T.poll, "poll", 1],
    [T.win, "win", 1],
    [T.ball, "ball", 1],
    [T.nudge, "nudge", 1],
    [T.fall, "flip", 12],
    [T.flip, "rotate", 1],
    [T.turns, "turns", 1],
    [T.gather, "gather", 1],
    [T.end, "oriel", 1],
    [T.index, "index", 1],
  ];
  const shots: Shot[] = cuts.map(([start, sid, samples], i) => ({
    id: sid,
    start,
    end: cuts[i + 1]?.[0] ?? N,
    draw: (ctx, local, env) => {
      motionBlur(ctx, env, (c, dt) => paint(c, env, start + local + dt), { samples, shutter: 0.5 });
      ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
      hud(ctx, start + local);
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
      mood: "drive",
      drop: T.zones,
      hits: [T.snap, T.lock, T.fill, T.ten, T.win, T.flip, T.gather],
      whooshes: [T.overlap, T.zones, T.buffer, T.poll, T.nudge, T.flip],
      ticks: TICKS,
      sign: 1860,
      gain: 0.8,
    }),
  };
}

export const literalType = make("landscape", "literalType");
export const literalTypeVertical = make("vertical", "literalTypeVertical");
