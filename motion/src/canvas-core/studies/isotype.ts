// STUDY 40 · ISOTYPE (30 s, 30 fps, 120 bpm). All the water on Earth as an Isotype picture-statistics chart:
// one flat drop = 1% of it, counted in rows of ten, never drawn bigger. A giant drop is struck through and breaks
// into a hundred same-size drops; the oceans count in (about 96.5, the last drop cut in half), ice and groundwater
// take a short row each (a quarter cut off each), everything else is a speck in a ring; then the fresh drops lift
// out and re-count into a chart of their own (one drop = 1% of fresh water). Subject: learn (USGS figures, hedged).
// Brief: series/studies/briefs/isotype.json · prompt: series/studies/prompts/isotype.prompt.md
//
// The whole film is one continuous function paint(F) of a fractional frame; the shots only name the sections.
// Declared deviations (for readability and fit): the landscape pitch is 60 px, not 64 (thirteen rows, the gaps and
// a headline must fit inside layout().safe with the push-in's drift); every line that carries a fact is 44 px or
// more (labels, the unit line, the counter, the captions; the brief's 34/24 px would read at under 10 px in a phone
// feed), and only the source footnotes stay small (28–30 px). The square has no room under its last row for the
// 'lakes, rivers…' list at a readable size, so only the landscape shows it. Each category's total slams in on the
// beat with a hit of its own (frames 315, 390, 510, 600, 750, 765: cues added to the brief's table), and the fresh
// chart lands on one frame (765: its last drop, the 100 flash, both totals and a pulse). Its hundred empty outline
// slots draw in as the first chart clears (the opening's move again), so the fresh drops fly into a visible chart.
// Square stacks the fresh chart in place of the first (which becomes a thumbnail); landscape builds it on the right
// half beside the first.
import PACK from "../../../brand/packs/studio/pack.json";
import type { Ctx, Env } from "../core";
import type { Film, Shot } from "../film";
import { clamp, ease, lerp, prog, spring } from "../kit/motion";
import { usePack } from "../kit/pack";
import { beatScore } from "../kit/score";
import { layout, type Size } from "../kit/sizes";
import { letters, measure, text, type TextOpts } from "../kit/type";

const P = usePack(PACK),
  C = P.palette("isotype"),
  F_ = P.face;
const FPS = 30,
  BPM = 120,
  N = 900; // a beat is 15 frames
const T = { ocean: 90, ice: 330, ground: 450, rest: 570, fresh: 660, end: 810 };

type Cat = "ocean" | "ice" | "ground" | "else";
const COL: Record<Cat, string> = { ocean: C.s1!, ice: C.s2!, ground: C.s3!, else: C.s4! };

// ---- colour
const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
const mix = (a: string, b: string, t: number) => {
  const A = rgb(a),
    B = rgb(b),
    k = clamp(t);
  return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i]!, k))).join(",")})`;
};

// ---- the pop: a short spring with about 8% overshoot
const POP = { freq: 3.2, damp: 0.63 };
const pop = (F: number, t0: number) => spring((F - t0) / FPS, POP);
const LET = { freq: 2.8, damp: 0.72 };

// ---- the drop: a circle (r = 18/56 of the pitch) and two tangent lines to a point, 48/56 of the pitch tall.
// (x, y) is the centre of its bounding box; k scales it about that centre.
const dropPath = (ctx: Ctx, x: number, y: number, p: number, k = 1) => {
  const r = ((p * 18) / 56) * k,
    d = ((p * 30) / 56) * k,
    cy = y + (d - r) / 2,
    b = Math.acos(r / d);
  ctx.beginPath();
  ctx.moveTo(x, cy - d);
  ctx.arc(x, cy, r, -Math.PI / 2 + b, (3 * Math.PI) / 2 - b);
  ctx.closePath();
};
/** fill a drop, optionally cut: keep the left `from`..`to` of its width (a vertical cut, never a smaller drop) */
const drop = (ctx: Ctx, x: number, y: number, p: number, color: string, k = 1, from = 0, to = 1) => {
  if (k <= 0.001 || to <= from) return;
  const r = ((p * 18) / 56) * k,
    cut = from > 0 || to < 1;
  ctx.save();
  if (cut) {
    ctx.beginPath();
    ctx.rect(x - r + 2 * r * from, y - p, 2 * r * (to - from), 2 * p);
    ctx.clip();
  }
  dropPath(ctx, x, y, p, k);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
};
const ghost = (ctx: Ctx, x: number, y: number, p: number, color: string, w: number) => {
  dropPath(ctx, x, y, p * 0.96);
  ctx.fillStyle = C.ground; // filled, so overlapping outlines stack like cut paper instead of crossing
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.stroke();
};
// the true area of a drop at pitch p, so the "everything else" speck can be drawn at its real share (0.04)
const dropArea = (p: number) => {
  const r = (p * 18) / 56,
    d = (p * 30) / 56;
  return (Math.PI - Math.acos(r / d)) * r * r + r * Math.sqrt(d * d - r * r);
};

// ---- the category glyphs, 44 px, flat, drawn in a box (x, y) → (x + s, y + s)
type Glyph = "wave" | "peak" | "strata" | "river";
const GLYPH: Record<Cat, Glyph> = { ocean: "wave", ice: "peak", ground: "strata", else: "river" };
const glyph = (ctx: Ctx, g: Glyph, x: number, y: number, s: number, k = 1) => {
  if (k <= 0.001) return;
  ctx.save();
  ctx.translate(x + s / 2, y + s / 2);
  ctx.scale(k, k);
  ctx.translate(-s / 2, -s / 2);
  if (g === "wave") {
    // three stacked swells, each two soft crests (thick flat strokes, so it reads as water, not a crown)
    ctx.strokeStyle = COL.ocean;
    ctx.lineWidth = s * 0.13;
    ctx.lineCap = "round";
    for (let k = 0; k < 3; k++) {
      const y0 = s * (0.22 + k * 0.28);
      ctx.beginPath();
      for (let i = 0; i <= 32; i++) {
        const t = i / 32;
        ctx.lineTo(s * (0.06 + t * 0.88), y0 + s * 0.08 * Math.sin(t * 4 * Math.PI));
      }
      ctx.stroke();
    }
  } else if (g === "peak") {
    ctx.beginPath();
    ctx.moveTo(0, s * 0.92);
    ctx.lineTo(s * 0.5, s * 0.08);
    ctx.lineTo(s, s * 0.92);
    ctx.closePath();
    ctx.fillStyle = COL.ice;
    ctx.fill();
    ctx.beginPath(); // the white cap, with a zigzag snow line
    ctx.moveTo(s * 0.5, s * 0.08);
    ctx.lineTo(s * 0.69, s * 0.41);
    ctx.lineTo(s * 0.6, s * 0.35);
    ctx.lineTo(s * 0.5, s * 0.45);
    ctx.lineTo(s * 0.4, s * 0.35);
    ctx.lineTo(s * 0.31, s * 0.41);
    ctx.closePath();
    ctx.fillStyle = C.surface;
    ctx.fill();
  } else if (g === "strata") {
    ctx.fillStyle = COL.ground;
    for (let i = 0; i < 3; i++) ctx.fillRect(0, s * (0.1 + i * 0.3), s, s * 0.2);
  } else {
    ctx.beginPath();
    ctx.moveTo(s * 0.18, 0);
    ctx.bezierCurveTo(s * 1.05, s * 0.3, -s * 0.05, s * 0.66, s * 0.82, s);
    ctx.strokeStyle = COL.else;
    ctx.lineWidth = s * 0.17;
    ctx.stroke();
  }
  ctx.restore();
};

// ---- the two charts as data. Chart A: one drop = 1% of all water. Chart B: one drop = 1% of fresh water.
type Cell = {
  cat: Cat;
  row: number;
  col: number;
  frac: number; // what it counts (a cut drop counts its fraction)
  at: number; // pops in
  cut?: number; // the frame the remainder is cut off
  salt?: number; // greys out here (salty)
  fly?: number; // lifts out to chart B cell index (fresh)
  fi?: number; // index among the flying drops (their stagger)
};
const A: Cell[] = [];
for (let i = 0; i < 97; i++)
  A.push({
    cat: "ocean",
    row: Math.floor(i / 10),
    col: i % 10,
    frac: i === 96 ? 0.5 : 1,
    at: 94 + i * 2.2, // about six a beat; the last (half) drop pops at 305
    cut: i === 96 ? 308 : undefined,
    salt: T.fresh + 2 + i * 0.2,
  });
// ice: 1 + ¾ (both fresh) · groundwater: 1 salty + ¾ fresh (0.93 saline, 0.76 fresh)
// each category's total slams in on the beat (num), with a hit of its own
const OA = { num: 315 };
const IA = { glyph: 332, name: 336, drop0: 352, drop1: 362, cut: 374, num: 390 };
const GA = { glyph: 452, name: 456, drop0: 472, drop1: 482, cut: 494, num: 510 };
const RA = { glyph: 572, ring: 576, name: 580, speck: 592, num: 600, list: 612 };
A.push({ cat: "ice", row: 10, col: 0, frac: 1, at: IA.drop0, fly: 0, fi: 0 });
A.push({ cat: "ice", row: 10, col: 1, frac: 0.75, at: IA.drop1, cut: IA.cut, fly: 1, fi: 1 });
A.push({ cat: "ground", row: 11, col: 0, frac: 1, at: GA.drop0, salt: T.fresh + 2 + 97 * 0.2 });
A.push({ cat: "ground", row: 11, col: 1, frac: 0.75, at: GA.drop1, cut: GA.cut, fly: 69, fi: 2 });

const B: Cell[] = [];
// the fresh re-count: ice from 705, its total slams at 750 as groundwater counts; everything lands at 765
const BT = { ice: 705, iceNum: 750, ground: 744, else: 765 };
const LAND = BT.else;
for (let i = 0; i < 69; i++) {
  const row = Math.floor(i / 10),
    col = i % 10;
  B.push({ cat: "ice", row, col, frac: 1, at: BT.ice + row * 5 + col });
}
for (let i = 0; i < 30; i++) {
  const row = 7 + Math.floor(i / 10),
    col = i % 10;
  B.push({ cat: "ground", row, col, frac: 1, at: BT.ground + (row - 7) * 6 + col });
}
B.push({ cat: "else", row: 10, col: 0, frac: 1, at: BT.else });
const LIFT = { up: 668, go: 678, dur: 26 };
const BACK = T.end + 44; // the end card: the fresh share returns to the first chart, in colour // fresh drops rise, then travel on straight lines

// the ticks: every third counting drop (so they patter, not buzz), plus the cuts
const TICKS = (() => {
  const t = new Set<number>();
  A.filter((c) => c.cat === "ocean").forEach((c, i) => i % 3 === 0 && t.add(Math.round(c.at)));
  for (const f of [IA.drop0, IA.drop1, IA.cut, GA.drop0, GA.drop1, GA.cut, RA.speck]) t.add(f);
  B.forEach((c, i) => i % 3 === 0 && t.add(c.at));
  return [...t].sort((a, b) => a - b);
})();

// a one-time 8% swell of a whole block on the frame it lands
const bump = (F: number, t: number) => (F >= t ? 0.08 * Math.sin(Math.PI * prog(F, t, t + 8)) : 0);
const SLAM = { freq: 4.2, damp: 0.42 };

type Xf = { x: number; y: number; s: number };
const xfLerp = (a: Xf, b: Xf, t: number): Xf => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), s: lerp(a.s, b.s, t) });

export function make(size: Size, id: string): Film {
  const L = layout(size),
    { W, H, u, cx } = L,
    wide = L.wide;
  const M = 96 * u,
    R = W - M;
  // ---- per-size design (numbers at 1080 on the short side)
  const G = wide
    ? {
        p: 60 * u,
        gap: 12 * u,
        top: 166 * u,
        headY: 124 * u,
        ruleY: 146 * u,
        subY: 124 * u,
        counterY: 202 * u,
        footY: 994 * u,
        big: { x: cx, y: 590 * u },
      }
    : {
        p: 56 * u,
        gap: 12 * u,
        top: 212 * u,
        headY: 126 * u,
        ruleY: 146 * u,
        subY: 192 * u,
        counterY: 192 * u,
        footY: 990 * u,
        big: { x: cx, y: 596 * u },
      };
  const { p, gap } = G;
  const labelX = M + 10 * p + 36 * u, // the ocean label column (beside the block)
    shortX = M + 2 * p + 20 * u; // the short-row label edge (beside their two drops)
  const xR = 920 * u; // landscape: the fresh chart's left edge
  const XA0: Xf = { x: M, y: G.top, s: 1 },
    XB0: Xf = wide ? { x: xR, y: G.top, s: 1 } : { x: M, y: G.top, s: 1 };
  const THUMB: Xf = { x: labelX, y: G.top, s: 0.3 };
  const endS = 0.75,
    END_B: Xf = { x: M, y: 256 * u, s: endS },
    END_A: Xf = { x: M + 10 * p * endS + 48 * u, y: 256 * u, s: endS };
  const xfA = (F: number): Xf => {
    if (wide) return XA0;
    if (F < T.end) return xfLerp(XA0, THUMB, ease.inOutCubic(prog(F, 676, 706)));
    return xfLerp(THUMB, END_A, ease.inOutCubic(prog(F, T.end, T.end + 30)));
  };
  const xfB = (F: number): Xf => (wide ? XB0 : xfLerp(XB0, END_B, ease.inOutCubic(prog(F, T.end, T.end + 30))));
  const rowYA = (row: number) => (row + 0.5) * p + (row >= 10 ? gap : 0);
  const rowYB = (row: number) => (row + 0.5) * p + (row >= 7 ? gap : 0) + (row >= 10 ? gap : 0);
  const at = (xf: Xf, lx: number, ly: number) => ({ x: xf.x + lx * xf.s, y: xf.y + ly * xf.s, p: p * xf.s });
  const posA = (c: Cell, xf: Xf) => at(xf, (c.col + 0.5) * p, rowYA(c.row));
  const posB = (c: Cell, xf: Xf) => at(xf, (c.col + 0.5) * p, rowYB(c.row));

  // ---- type
  const sans = (size: number, weight = 600, color = C.ink): TextOpts => ({
    size: size * u,
    family: F_.sans,
    weight,
    color,
    track: weight >= 800 ? -0.025 : -0.012,
  });
  const mono = (size: number, color = C.muted): TextOpts => ({
    size: size * u,
    family: F_.mono,
    weight: 500,
    color,
    track: 0,
  });
  /** a line drawn in parts (name 600, number 800), each part rising letter by letter from its own start frame */
  type Part = [string, number, number, string?]; // text, weight, start frame; a colour: slams in (a total), flashing it
  const partsWidth = (ctx: Ctx, parts: Part[], size: number) =>
    parts.reduce((w, [s, wt]) => w + measure(ctx, s, sans(size, wt)), 0);
  const fitSize = (ctx: Ctx, parts: Part[], max: number, maxW: number, min: number) => {
    let s = max;
    while (s > min && partsWidth(ctx, parts, s) > maxW) s -= 1;
    return s;
  };
  /** a total slamming in: it lands with a hard spring, scaling down from up to 1.25× where the row has room (growing
   * right from x0, never over the words before it or past R), flashing its category's colour as it lands */
  const slam = (ctx: Ctx, F: number, s: string, px: number, y: number, o: TextOpts, t0: number, x0: number) => {
    if (F < t0) return;
    const v = spring((F - t0) / FPS, SLAM),
      w = measure(ctx, s, o),
      k0 = clamp((R - x0) / w, 1.06, 1.25),
      k = lerp(k0, 1, v),
      mid = px + w / 2;
    let dx = 0;
    if (mid - (w * k) / 2 < x0) dx = x0 - (mid - (w * k) / 2);
    if (mid + (w * k) / 2 + dx > R) dx = R - (mid + (w * k) / 2);
    ctx.save();
    ctx.translate(mid + dx, y - o.size * 0.35);
    ctx.scale(k, k);
    text(ctx, s, -w / 2, o.size * 0.35, { ...o, alpha: (o.alpha ?? 1) * clamp((F - t0 + 1) / 3) });
    ctx.restore();
  };
  const line = (ctx: Ctx, F: number, parts: Part[], x: number, y: number, size: number, alpha = 1, color = C.ink) => {
    let px = x;
    for (const [s, wt, t0, flash] of parts) {
      const o = { ...sans(size, wt, color), alpha };
      if (flash) slam(ctx, F, s, px, y, { ...o, color: mix(flash, color, prog(F, t0 + 4, t0 + 16)) }, t0, px);
      else if (F >= t0) letters(ctx, s, px, y, o, (i) => spring((F - t0 - i * 0.8) / FPS, LET), "rise");
      px += measure(ctx, s, o);
    }
  };
  /** a headline that rises in letter by letter and, at `out`, slides up out of its mask */
  const head = (
    ctx: Ctx,
    F: number,
    s: string,
    x: number,
    y: number,
    o: TextOpts,
    t0: number,
    out = Infinity,
    align: CanvasTextAlign = "left",
  ) => {
    if (F < t0 || F > out + 12) return;
    const up = ease.inCubic(prog(F, out, out + 10));
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, y - o.size * 1.05, W, o.size * 1.35);
    ctx.clip();
    ctx.translate(0, -up * o.size * 1.2);
    letters(ctx, s, x, y, { ...o, align }, (i) => spring((F - t0 - i * 0.9) / FPS, LET), "rise");
    ctx.restore();
  };

  // ---- the counter: what is coloured, in drops (= percent)
  const counted = (F: number) => {
    if (F < T.fresh + 2) return A.reduce((s, c) => s + (F >= c.at ? c.frac : 0), 0);
    if (F < BT.ice)
      return A.reduce((s, c) => s + (F >= c.at && !(c.salt !== undefined && F >= c.salt + 4) ? c.frac : 0), 0);
    return B.reduce((s, c) => s + (F >= c.at ? 1 : 0), 0);
  };
  const full = (F: number) => (F < BT.ice ? GA.drop1 : LAND); // the frame the tally reaches 100
  const counter = (ctx: Ctx, F: number) => {
    const a = Math.min(prog(F, 86, 94), 1 - prog(F, T.end, T.end + 10));
    if (a <= 0) return;
    const v = counted(F),
      f100 = full(F),
      hot = F >= f100 ? 1 - prog(F, f100 + 4, f100 + 30) : 0,
      k = 1 + 0.16 * (F >= f100 ? Math.exp(-(F - f100) / 5) * Math.cos((F - f100) * 0.5) : 0);
    // one decimal: the figures are rounded, so the tally claims no more precision than they have
    const num = v.toFixed(1),
      o = { ...mono(44, mix(C.ink, C.accent, hot)), alpha: a },
      rest = { ...mono(44), alpha: a },
      x = R,
      y = wide ? G.counterY : G.counterY,
      wr = measure(ctx, "/100", rest);
    text(ctx, "/100", x, y, { ...rest, align: "right" });
    ctx.save();
    ctx.translate(x - wr, y - 15 * u);
    ctx.scale(k, k);
    text(ctx, num, 0, 15 * u, { ...o, align: "right" });
    ctx.restore();
  };

  // ---- 00 the rule: a giant drop, struck through, breaks into a hundred same-size drops
  const BIGK = 9; // the giant drop is nine drops tall; it is the lie Isotype forbids
  const bigCentre = { x: G.big.x, y: G.big.y + (6 * BIGK * p) / 56 }; // its circle's centre
  const slots = A; // the 101 slots the ghosts fly to (ocean 97, ice 2, groundwater 2)
  const ghostFrom = (i: number) => {
    const rad = Math.sqrt((i + 0.5) / slots.length) * ((18 * BIGK * p) / 56) * 1.25,
      ang = i * 2.39996;
    return { x: bigCentre.x + Math.cos(ang) * rad, y: bigCentre.y + Math.sin(ang) * rad };
  };
  const ghostT = (i: number, F: number) => ease.inOutCubic(prog(F, 60 + i * 0.12, 82 + i * 0.12));
  const rule = (ctx: Ctx, F: number) => {
    if (F < 60) {
      const k = lerp(0.4, 1.1, ease.outCubic(prog(F, 0, 58) ** 0.8) * 0.3 + prog(F, 0, 58) * 0.7); // it swells
      drop(ctx, G.big.x, G.big.y, p * BIGK, COL.ocean, k);
      // the strike: a red bar drawn on across the drop
      const s = ease.outCubic(prog(F, 20, 44)),
        x1 = G.big.x + 200 * u,
        y1 = G.big.y - 220 * u,
        x2 = G.big.x - 200 * u,
        y2 = G.big.y + 220 * u;
      if (s > 0) {
        ctx.save();
        ctx.globalAlpha = 1 - prog(F, 54, 60);
        ctx.strokeStyle = C.accent2;
        ctx.lineWidth = 18 * u;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(lerp(x1, x2, s), lerp(y1, y2, s));
        ctx.stroke();
        ctx.restore();
      }
    }
    // the notes beside it: "not bigger…" then "…more"
    const nx = G.big.x + (wide ? 240 : 196) * u,
      ny = G.big.y - 150 * u;
    if (F >= 28 && F < 60) head(ctx, F, "not bigger…", nx, ny, sans(44, 800, C.accent2), 28, 56);
    if (F >= 60 && F < 110) head(ctx, F, "…more", nx, ny, sans(44, 800), 62, 98);
  };
  const ghosts = (ctx: Ctx, F: number) => {
    if (F < 60) return;
    const xf = xfA(F);
    slots.forEach((c, i) => {
      if (F >= c.at + 3) return; // its fill has covered it
      const to = posA(c, xf),
        from = ghostFrom(i),
        t = ghostT(i, F);
      ghost(ctx, lerp(from.x, to.x, t), lerp(from.y, to.y, t), to.p, mix(C.line, C.muted, 0.25), 3 * u);
    });
  };

  // ---- chart A (all water)
  const newestRow = (F: number) => {
    let r = -1,
      t = -1;
    for (const c of A)
      if (F >= c.at && c.at > t) {
        t = c.at;
        r = c.row;
      }
    return r;
  };
  const chartA = (ctx: Ctx, F: number) => {
    const xf = xfA(F),
      bobRow = F < T.fresh ? newestRow(F) : -1,
      bob = Math.sin((F / 45) * Math.PI * 2) * 1.2 * u;
    for (const c of A) {
      if (F < c.at) continue;
      let { x, y, p: q } = posA(c, xf);
      if (c.row === bobRow) y += bob;
      if (c.fly !== undefined && F >= LIFT.up) {
        // it has left: a faint outline keeps its place, until the end card puts the fresh share back in colour
        if (F < BACK) ghost(ctx, x, y, q, C.line, 2 * u * xf.s + u);
        else drop(ctx, x, y, q, COL[c.cat], pop(F, BACK + c.fi! * 3), 0, c.frac);
        continue;
      }
      const g = c.salt !== undefined ? prog(F, c.salt, c.salt + 8) : 0,
        color = mix(COL[c.cat], C.line, g),
        k = pop(F, c.at) * (1 + (c.cat === "ocean" ? bump(F, OA.num) : 0)); // the block swells as its total lands
      if (c.cut !== undefined && F >= c.cut) {
        const t = prog(F, c.cut, c.cut + 16);
        drop(ctx, x, y, q, color, k, 0, c.frac);
        if (t < 1) {
          // the cut-off part falls away (the same flat colour, never a smaller drop)
          ctx.save();
          ctx.globalAlpha = 1 - ease.inCubic(t);
          drop(ctx, x + 6 * u * t, y + ease.inCubic(t) * q * 0.9, q, color, k, c.frac, 1);
          ctx.restore();
          // the cut line flashes where the knife went
          const r = (q * 18) / 56;
          ctx.fillStyle = C.accent2;
          ctx.globalAlpha = 1 - prog(F, c.cut, c.cut + 10);
          ctx.fillRect(x - r + 2 * r * c.frac - 1.5 * u, y - q * 0.55, 3 * u, q * 1.1);
          ctx.globalAlpha = 1;
        }
      } else drop(ctx, x, y, q, color, k);
    }
    // everything else: a magnifier ring on the last row with a speck at its true share of one drop
    if (F >= RA.ring) {
      const { x, y, p: q } = at(xf, 0.5 * p, rowYA(12)),
        k = pop(F, RA.ring),
        rr = q * 0.4 * k;
      ctx.save();
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 2 * u * Math.max(0.6, xf.s);
      ctx.beginPath();
      ctx.arc(x, y, rr, 0, Math.PI * 2);
      ctx.moveTo(x + rr * 0.72, y + rr * 0.72);
      ctx.lineTo(x + rr * 1.25, y + rr * 1.25);
      ctx.stroke();
      ctx.restore();
      if (F >= RA.speck && F < LIFT.up) speck(ctx, x, y, q, pop(F, RA.speck));
      if (F >= BACK + 9) speck(ctx, x, y, q, pop(F, BACK + 9));
    }
  };
  const speck = (ctx: Ctx, x: number, y: number, q: number, k: number) => {
    ctx.beginPath();
    ctx.arc(x, y, Math.sqrt((0.04 * dropArea(q)) / Math.PI) * k, 0, Math.PI * 2);
    ctx.fillStyle = COL.else;
    ctx.fill();
  };
  // the fresh drops lifting out of A and travelling to their places in B (same size all the way)
  const lifting = (ctx: Ctx, F: number) => {
    if (F < LIFT.up) return;
    const xa = XA0, // they leave before chart A moves
      xb = xfB(F);
    const flyers: { from: { x: number; y: number }; to: { x: number; y: number }; c: Cell | null; fi: number }[] = [];
    for (const c of A)
      if (c.fly !== undefined) flyers.push({ from: posA(c, xa), to: posB(B[c.fly]!, xb), c, fi: c.fi! });
    flyers.push({ from: at(xa, 0.5 * p, rowYA(12)), to: posB(B[B.length - 1]!, xb), c: null, fi: 3 });
    for (const f of flyers) {
      const target = f.c ? B[f.c.fly!]! : B[B.length - 1]!;
      if (F >= target.at + 2) continue; // chart B's own drop has popped over it
      const up = ease.outCubic(prog(F, LIFT.up, LIFT.go)) * 16 * u,
        t = ease.inOutCubic(prog(F, LIFT.go + f.fi * 3, LIFT.go + f.fi * 3 + LIFT.dur));
      const x = lerp(f.from.x, f.to.x, t),
        y = lerp(f.from.y - up, f.to.y, t);
      if (f.c) drop(ctx, x, y, p, COL[f.c.cat], 1, 0, f.c.frac);
      else speck(ctx, x, y, p, 1);
    }
  };

  // ---- chart B (fresh water)
  // the fresh chart's hundred empty slots draw in (as outlines, like the opening's) once the first chart has
  // cleared their place: square, as the first chart shrinks away to its thumbnail; landscape, in reading order
  const slotAt = B.map((c, i) => {
    const t0 = 670 + i * 0.3;
    if (wide) return t0;
    const b = posB(c, XB0),
      r = (b.p * 18) / 56;
    for (let f = 668; f <= 720; f++) {
      const a = xfA(f),
        right = a.x + 10 * p * a.s,
        bottom = a.y + (13 * p + gap) * a.s;
      const clear = b.x + r < a.x || b.x - r > right || b.y - b.p / 2 > bottom || b.y + b.p / 2 < a.y;
      if (clear) return Math.max(t0, f);
    }
    return 720;
  });
  const chartB = (ctx: Ctx, F: number) => {
    const xf = xfB(F);
    const last = B.reduce((m, c) => (F >= c.at ? Math.max(m, c.row) : m), -1);
    B.forEach((c, i) => {
      if (F < slotAt[i]! || F >= c.at + 3) return;
      const { x, y, p: q } = posB(c, xf),
        k = pop(F, slotAt[i]!);
      ghost(ctx, x, y, q * k, mix(C.line, C.muted, 0.25), 3 * u * xf.s);
    });
    for (const c of B) {
      if (F < c.at) continue;
      const { x, y, p: q } = posB(c, xf);
      drop(
        ctx,
        x,
        y + (c.row === last && F < T.end ? Math.sin((F / 45) * Math.PI * 2) * 1.2 * u : 0),
        q,
        COL[c.cat],
        pop(F, c.at) * (1 + (c.cat === "else" ? 0 : bump(F, LAND))), // the whole chart swells as it lands
      );
    }
  };

  // ---- labels
  const labelsA = (ctx: Ctx, F: number) => {
    const fade = 1 - prog(F, T.fresh + 2, T.fresh + 16), // text fades when the fresh water is singled out
      gl = wide ? 1 : fade; // landscape keeps the glyphs as a legend beside the first chart
    if (F >= T.end && !wide) return;
    const gs = 44 * u;
    // oceans, beside the block
    if (F >= 96) {
      glyph(ctx, "wave", labelX, G.top + 6 * u, gs, pop(F, 96) * gl);
      if (fade > 0) {
        // landscape has the whole right half free until the fresh chart: the key number goes big there
        line(ctx, F, [["Oceans", 600, 100]], labelX, G.top + (wide ? 124 : 104) * u, wide ? 60 : 44, fade);
        const nm: Part[] = [["about 96.5%", 800, OA.num, COL.ocean]];
        line(
          ctx,
          F,
          nm,
          labelX,
          G.top + (wide ? 246 : 166) * u,
          fitSize(ctx, nm, wide ? 112 : 56, R - labelX, 44),
          fade,
        );
      }
    }
    // the short rows: glyph and label beside their drops
    const short = (row: number, cat: Cat, t: typeof IA | typeof GA, name: string) => {
      if (F < t.glyph) return;
      const cyRow = G.top + rowYA(row);
      glyph(ctx, GLYPH[cat], shortX, cyRow - gs / 2, gs, pop(F, t.glyph) * gl);
      if (fade <= 0) return;
      const parts: Part[] = [
        [name, 600, t.name],
        [" · ", 600, t.num - 4],
        ["about 1.7%", 800, t.num, COL[cat]],
      ];
      const tx = shortX + gs + 14 * u,
        sz = fitSize(ctx, parts, wide ? 46 : 44, R - tx, 44);
      line(ctx, F, parts, tx, cyRow + sz * 0.36 * u, sz, fade);
    };
    short(10, "ice", IA, "Ice caps and glaciers");
    short(11, "ground", GA, "Groundwater");
    // everything else: its label, and the list as a footnote
    if (F >= RA.glyph) {
      const cyRow = G.top + rowYA(12);
      glyph(ctx, "river", shortX, cyRow - gs / 2, gs, pop(F, RA.glyph) * gl);
      if (fade > 0) {
        const tx = shortX + gs + 14 * u,
          one: Part[] = [
            ["Everything else", 600, RA.name],
            [" · ", 600, RA.num - 4],
            ["less than a tenth of one drop", 800, RA.num, COL.else],
          ];
        if (partsWidth(ctx, one, 46) <= R - tx) line(ctx, F, one, tx, cyRow + 46 * 0.36 * u, 46, fade);
        else {
          // the square: two lines at 44, the name on the row and the amount under it
          line(ctx, F, [one[0]!], tx, cyRow + 16 * u, 44, fade);
          line(ctx, F, [[one[2]![0], 800, RA.num, COL.else]], tx, cyRow + 66 * u, 44, fade);
        }
        // the list, where there is room for it at a readable size (the landscape's foot)
        if (wide && F >= RA.list)
          text(ctx, "lakes, rivers, swamps, soil, air, living things, permafrost", M, G.footY, {
            ...mono(30),
            alpha: fade * prog(F, RA.list, RA.list + 8),
          });
      }
    }
  };
  const labelsB = (ctx: Ctx, F: number) => {
    const a = wide ? 1 : 1 - prog(F, T.end, T.end + 12);
    if (a <= 0 || F < BT.ice) return;
    const gs = 44 * u,
      col = wide ? xR + 10 * p + 36 * u : labelX,
      top = G.top;
    // the name on its own line (44), then the glyph heading the total, which slams in on the beat
    const block = (cat: Cat, name: string, num: string, nameY: number, t0: number, tn: number) => {
      if (F < t0) return;
      line(ctx, F, [[name, 600, t0 + 2]], col, nameY, 44, a);
      const ny = nameY + 62 * u,
        np: Part[] = [[num, 800, tn, COL[cat]]],
        sz = fitSize(ctx, np, 56, R - col - gs - 12 * u, 44);
      glyph(ctx, GLYPH[cat], col, ny - sz * 0.36 * u - gs / 2, gs, pop(F, t0) * a);
      line(ctx, F, np, col + gs + 12 * u, ny, sz, a);
    };
    // ice beside its block (in the square, under the thumbnail); groundwater beside its three rows
    block("ice", "Ice", "about 69", wide ? top + 250 * u : top + 350 * u, BT.ice + 4, BT.iceNum);
    block("ground", "Groundwater", "about 30", top + rowYB(8) + 2 * u, BT.ground + 2, LAND);
    // everything else, beside its one drop
    if (F >= LAND - 16) {
      const xb = xfB(F),
        cyRow = xb.y + rowYB(10) * xb.s,
        gx = xb.x + p + 20 * u;
      glyph(ctx, "river", gx, cyRow - gs / 2, gs, pop(F, LAND - 16) * a);
      const parts: Part[] = [
        ["Everything else", 600, LAND - 14],
        [" · ", 600, LAND - 4],
        ["about 1", 800, LAND, COL.else],
      ];
      const tx = gx + gs + 14 * u;
      line(ctx, F, parts, tx, cyRow + 44 * 0.36 * u, 44, a);
      line(ctx, F, [["(all lakes and rivers included)", 600, LAND - 6]], tx, cyRow + 68 * u, 44, a, C.ink);
    }
  };

  // ---- headlines, the unit line, the rule
  const H64 = sans(64, 800);
  const header = (ctx: Ctx, F: number) => {
    const hx = M;
    head(ctx, F, "All the water on Earth", hx, G.headY, H64, 2, T.fresh);
    head(ctx, F, "Only about 2.5% is fresh.", hx, G.headY, H64, T.fresh + 9, T.end - 2);
    head(ctx, F, "Most of it is salty.", hx, G.headY, H64, T.end + 9);
    if (wide) head(ctx, F, "Most of the rest is frozen.", xR, G.headY, H64, T.end + 30);
    else {
      const o2 = sans(64, 800),
        w = measure(ctx, "Most of the rest is frozen.", o2);
      const s2 = w > R - M ? (64 * (R - M)) / w : 64;
      head(ctx, F, "Most of the rest is frozen.", hx, 206 * u, sans(s2, 800), T.end + 30);
    }
    // the unit line (the chart's key) and the rule
    const sub = sans(44, 600),
      sx = wide ? R : M,
      al: CanvasTextAlign = wide ? "right" : "left";
    head(ctx, F, "One drop = 1% of it.", sx, G.subY, sub, 70, 690, al);
    head(ctx, F, "One drop = 1% of fresh water.", sx, G.subY, sub, 698, T.end, al);
    const rw = ease.inOutCubic(prog(F, 4, 26)),
      ry = wide ? G.ruleY : lerp(G.ruleY, 228 * u, ease.inOutCubic(prog(F, T.end + 24, T.end + 44)));
    ctx.fillStyle = C.ink;
    ctx.fillRect(M, ry, (R - M) * rw, 2 * u);
  };
  const captions = (ctx: Ctx, F: number) => {
    if (!wide) {
      // the thumbnail's caption, then the end card's captions under both charts
      const a = prog(F, 704, 714) * (1 - prog(F, T.end, T.end + 8));
      if (a > 0) {
        const y = THUMB.y + (13 * p + gap) * THUMB.s + 46 * u;
        text(ctx, "grey = salty", THUMB.x, y, { ...sans(44, 600, C.muted), alpha: a });
      }
      const b = prog(F, T.end + 34, T.end + 46);
      if (b > 0) {
        const y = END_A.y + (13 * p + gap) * endS + 40 * u;
        text(ctx, "fresh water", END_B.x, y, { ...sans(44, 800), alpha: b });
        text(ctx, "all water", END_A.x, y, { ...sans(44, 800), alpha: b });
        text(ctx, "grey = salty", END_A.x, y + 50 * u, { ...sans(44, 600, C.muted), alpha: b });
      }
    } else {
      // under the grey chart, where the list was; it gives its place to the footer at the end
      const a = prog(F, 690, 702) * (1 - prog(F, T.end + 36, T.end + 46));
      if (a > 0) text(ctx, "grey = salty", M, G.footY, { ...sans(44, 600, C.muted), alpha: a });
    }
    // the footer
    const f = prog(F, T.end + 50, T.end + 62);
    if (f > 0) {
      if (wide)
        text(ctx, "figures rounded · USGS Water Science School, after Shiklomanov (1993)", M, G.footY, {
          ...mono(30),
          alpha: f,
        });
      else {
        text(ctx, "figures rounded", M, G.footY - 34 * u, { ...mono(28), alpha: f });
        text(ctx, "USGS Water Science School, after Shiklomanov (1993)", M, G.footY, { ...mono(28), alpha: f });
      }
    }
  };

  // ---- the slow push-in: through every hold, eased back under the two big moves (continuous everywhere)
  const push = (F: number) => {
    // each category's section pushes in 2% and cuts back on the next section's hit (a cut on the beat)
    if (F < T.fresh) {
      const h = [T.ocean, T.ice, T.ground, T.rest, T.fresh].findIndex((t, i, a) => F >= t && F < a[i + 1]!);
      return h < 0 ? 0 : 0.02 * prog(F, [T.ocean, T.ice, T.ground, T.rest][h]!, [T.ice, T.ground, T.rest, T.fresh][h]!);
    }
    if (F < 700) return 0;
    if (F < T.end) return 0.02 * prog(F, 700, T.end);
    if (F < T.end + 30) return 0.02 * (1 - ease.inOutCubic(prog(F, T.end, T.end + 30)));
    return 0.02 * prog(F, T.end + 30, N);
  };

  const paint = (ctx: Ctx, env: Env, F: number) => {
    F = clamp(F, 0, N - 1);
    ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
    ctx.fillStyle = C.ground;
    ctx.fillRect(0, 0, W, H);
    const z = 1 + push(F),
      ay = 300 * u;
    ctx.translate(cx, ay);
    ctx.scale(z, z);
    ctx.translate(-cx, -ay);
    header(ctx, F);
    rule(ctx, F);
    ghosts(ctx, F);
    chartA(ctx, F);
    labelsA(ctx, F);
    if (F >= 668) chartB(ctx, F);
    labelsB(ctx, F);
    lifting(ctx, F);
    captions(ctx, F);
    counter(ctx, F);
  };

  const cuts = [0, T.ocean, T.ice, T.ground, T.rest, T.fresh, T.end, N],
    names = ["rule", "oceans", "ice", "underground", "rest", "fresh", "end"];
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
      drop: T.ocean,
      // the brief's section hits, plus one on each total and on the fresh chart's landing
      hits: [T.ocean, OA.num, T.ice, IA.num, T.ground, GA.num, T.rest, RA.num, T.fresh, BT.iceNum, LAND],
      whooshes: [60],
      ticks: TICKS,
      sign: T.end,
      gain: 0.76, // about −16 LUFS
    }),
  };
}

export const isotypeSquare = make("square", "isotypeSquare");
export const isotype = make("landscape", "isotype");
