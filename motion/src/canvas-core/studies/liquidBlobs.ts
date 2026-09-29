// STUDY 32 · LIQUID BLOBS (24 s, 30 fps, 120 bpm). Four calendars as four drops of violet liquid on a flat pink
// ground: one drop splashes into four, the four merge in pairs and then all at once, the goo flows into a card
// that names the shared time, four droplets bud off it and land back as "booked" tags, and a liquid wipe drains
// to the lockup. For the fictional Oriel. Brand: the neutral pack, palette "sunset".
// Brief: series/studies/briefs/liquid-blobs.json · prompt: series/studies/prompts/liquid-blobs.prompt.md
//
// The goo is ONE implicit surface: f(x, y) = Σ r² / d² over a handful of balls (plus rounded-rectangle fields for
// the card and the tags), sampled on a coarse grid and contoured with marching squares at f = 1 (the fill),
// f = 1.8 (a flat gloss, offset up-left) and f = 0.85 (a faint meniscus). Every ball position is a closed-form
// function of the frame, so necks, merges and pinch-offs come from the field, not from a simulation.
import PACK from "../../../brand/packs/studio/pack.json";
import type { Ctx, Env } from "../core";
import type { Film, Shot } from "../film";
import { clamp, ease, lerp, prog, spring } from "../kit/motion";
import { usePack } from "../kit/pack";
import { beatScore } from "../kit/score";
import { layout, type Size } from "../kit/sizes";
import { letters, measure, text } from "../kit/type";
import { rr } from "../kit/ui";

const P = usePack(PACK),
  C = P.palette("sunset"),
  F_ = P.face;
const FPS = 30,
  BPM = 120,
  N = 720; // a beat is 15 frames
// the timeline, in frames (every cut on a beat)
const T = { people: 90, pull: 210, card: 390, booked: 510, end: 630 };
const DROP = 10, // the drop lands (it is in frame from frame 0)
  SPLASH = 15, // and splashes on beat 1
  TAGS = [105, 120, 135, 150],
  MERGE_AK = 270,
  MERGE_LT = 300,
  MERGE_ALL = 345,
  HOLD = 405,
  WIPE = 660,
  SIGN = 675;

const NAMES = ["Ana", "Kai", "Lena", "Theo"],
  FREE = ["1–4", "3–5", "2–4", "3–6"],
  CORE = [C.accent, C.accent2, C.surface, C.ground];

// ---- colour: the gloss is deep mixed 18% toward white (flat, no gradient)
const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a: string, b: string, t: number) => {
  const A = hex(a),
    B = hex(b);
  return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i]!, t))).join(",")})`;
};
const DEEP = C.deep ?? C.ink,
  GLOSS = mix(DEEP, "#ffffff", 0.18);

// ---- the field: balls (r² / d², optionally squashed) and rounded rectangles (1 on the edge, larger inside)
type Ball = { x: number; y: number; r: number; sx: number; sy: number; w: number };
type Slab = { x: number; y: number; w: number; h: number; rad: number; k: number; a: number };
const CAP = 12; // each term is capped so blends between balls and slabs stay smooth near ball centres
const ballTerm = (b: Ball, x: number, y: number) => {
  const dx = (x - b.x) / b.sx,
    dy = (y - b.y) / b.sy;
  return b.w * Math.min(CAP, (b.r * b.r) / (dx * dx + dy * dy + 1e-6));
};
const slabTerm = (s: Slab, x: number, y: number) => {
  const rad = Math.min(s.rad, s.w / 2, s.h / 2),
    qx = Math.abs(x - s.x) - (s.w / 2 - rad),
    qy = Math.abs(y - s.y) - (s.h / 2 - rad);
  const sd = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - rad;
  return s.a * Math.min(CAP, Math.exp(-sd / s.k));
};

// ---- marching squares with linear interpolation; segments are chained into closed polylines. The sample grid
// runs one cell past the frame on every side and its outer ring is forced to 0, so every contour closes.
type Grid = { g: Float32Array; nx: number; ny: number; ox: number; oy: number; st: number };
function contour({ g, nx, ny, ox, oy, st }: Grid, L: number): number[][] {
  const cols = nx + 1,
    segA = new Int32Array(cols * (ny + 1) * 2).fill(-1),
    segB = new Int32Array(cols * (ny + 1) * 2).fill(-1),
    segs: number[] = [];
  const add = (e0: number, e1: number) => {
    const s = segs.length / 2;
    segs.push(e0, e1);
    for (const e of [e0, e1])
      if (segA[e]! < 0) segA[e] = s;
      else segB[e] = s;
  };
  for (let j = 0; j < ny; j++)
    for (let i = 0; i < nx; i++) {
      const a = g[j * cols + i]!,
        b = g[j * cols + i + 1]!,
        c = g[(j + 1) * cols + i + 1]!,
        d = g[(j + 1) * cols + i]!;
      const idx = (a >= L ? 1 : 0) | (b >= L ? 2 : 0) | (c >= L ? 4 : 0) | (d >= L ? 8 : 0);
      if (idx === 0 || idx === 15) continue;
      const eT = (j * cols + i) * 2,
        eR = (j * cols + i + 1) * 2 + 1,
        eB = ((j + 1) * cols + i) * 2,
        eL = (j * cols + i) * 2 + 1;
      const mid = (a + b + c + d) / 4 >= L;
      switch (idx) {
        case 1:
        case 14:
          add(eL, eT);
          break;
        case 2:
        case 13:
          add(eT, eR);
          break;
        case 3:
        case 12:
          add(eL, eR);
          break;
        case 4:
        case 11:
          add(eR, eB);
          break;
        case 6:
        case 9:
          add(eT, eB);
          break;
        case 7:
        case 8:
          add(eL, eB);
          break;
        case 5: // TL and BR inside: a saddle, resolved by the cell's centre
          if (mid) {
            add(eT, eR);
            add(eB, eL);
          } else {
            add(eL, eT);
            add(eR, eB);
          }
          break;
        case 10: // TR and BL inside
          if (mid) {
            add(eL, eT);
            add(eR, eB);
          } else {
            add(eT, eR);
            add(eB, eL);
          }
          break;
      }
    }
  const pt = (e: number): [number, number] => {
    const k = e >> 1,
      i = k % cols,
      j = (k - i) / cols,
      a = g[k]!;
    if (e & 1) {
      const b = g[k + cols]!,
        t = (L - a) / (b - a);
      return [ox + i * st, oy + (j + t) * st];
    }
    const b = g[k + 1]!,
      t = (L - a) / (b - a);
    return [ox + (i + t) * st, oy + j * st];
  };
  const used = new Uint8Array(segs.length / 2),
    polys: number[][] = [];
  for (let s0 = 0; s0 < used.length; s0++) {
    if (used[s0]) continue;
    const poly: number[] = [],
      start = segs[2 * s0]!;
    let s = s0,
      e = start;
    for (let guard = 0; guard < used.length + 2; guard++) {
      used[s] = 1;
      poly.push(...pt(e));
      const e2 = segs[2 * s] === e ? segs[2 * s + 1]! : segs[2 * s]!;
      if (e2 === start) break;
      const nxt = segA[e2] === s ? segB[e2]! : segA[e2]!;
      if (nxt < 0 || used[nxt]) {
        poly.push(...pt(e2));
        break;
      }
      e = e2;
      s = nxt;
    }
    if (poly.length >= 6) polys.push(poly);
  }
  return polys;
}
const trace = (ctx: Ctx, polys: number[][], dx = 0, dy = 0) => {
  ctx.beginPath();
  for (const p of polys) {
    ctx.moveTo(p[0]! + dx, p[1]! + dy);
    for (let k = 2; k < p.length; k += 2) ctx.lineTo(p[k]! + dx, p[k + 1]! + dy);
    ctx.closePath();
  }
};

// a damped wobble that starts at frame t0 (0 before it)
const wob = (F: number, t0: number, amp: number, hz = 2.2, decay = 10) =>
  F <= t0 ? 0 : amp * Math.exp(-(F - t0) / decay) * Math.sin(2 * Math.PI * hz * ((F - t0) / FPS));
type V2 = [number, number];
const lerp2 = (a: V2, b: V2, t: number): V2 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];

export function make(size: Size, id: string): Film {
  const L = layout(size),
    { W, H, u, cx } = L,
    tall = L.tall;
  const S = (x: number, y: number): V2 => [x * u, y * u];

  // ---- per-size design: vertical is a diamond, landscape a row in the right two thirds
  const R = (tall ? 80 : 64) * u; // a person's main ball (the visible blob is about 1.25 R with its satellites)
  const G: V2 = tall ? S(540, 1070) : S(1265, 500); // the blob group's centre
  const SPOT: V2[] = tall
    ? [S(540, 740), S(250, 1070), S(830, 1070), S(540, 1400)]
    : [S(800, 500), S(1110, 500), S(1420, 500), S(1730, 500)];
  const CARD = tall
    ? { x: 540 * u, y: 1070 * u, w: 740 * u, h: 420 * u }
    : { x: 1265 * u, y: 520 * u, w: 800 * u, h: 420 * u };
  const SLOT = tall ? [1, 0, 3, 2] : [0, 1, 2, 3]; // each person's place in the avatar row (vertical: K A T L)
  const LAND = [585, 593, 600, 608]; // when each droplet lands on its spot
  const PILL = { w: 390 * u, h: 88 * u };
  // tags stay inside the safe area; in landscape the row alternates above and below so 44 px tags fit
  const inSafe = (x: number, w: number) => clamp(x, L.safe.x + w / 2, W - L.safe.x - w / 2);
  const SIDE = (i: number) => (tall || i % 2 ? 1 : -1);
  const BOOK: V2[] = SPOT.map((s, i) => [inSafe(s[0], PILL.w), s[1] + (tall ? 0 : SIDE(i) * 90 * u)]);
  const HEADS: { lines: string[]; at: number; out: number; stag?: number }[] = [
    { lines: tall ? ["Four calendars."] : ["Four", "calendars."], at: 14, out: 150, stag: 0.6 },
    { lines: tall ? ["Four different", "schedules."] : ["Four", "different", "schedules."], at: 158, out: 216 },
    { lines: ["Oriel finds", "the overlap."], at: 228, out: 506 },
    { lines: tall ? ["One time.", "On every calendar."] : ["One time.", "On every", "calendar."], at: 524, out: WIPE },
  ];
  const headW = tall ? W - 2 * L.safe.x : 540 * u,
    headX = tall ? cx : 100 * u;
  let headSize = 0; // fitted once, from the widest line of every headline

  // ---- the people: a main ball per person, its satellites, and its core dot
  type Person = { p: V2; r: number; sx: number; sy: number; w: number; core: V2; coreR: number };
  const idle = (i: number, F: number): V2 => [
    5 * u * Math.sin((F / FPS) * 2 * Math.PI * 0.37 + i * 1.7),
    6 * u * Math.sin((F / FPS) * 2 * Math.PI * 0.29 + i * 2.3),
  ];
  const orbit = (c: V2, rad: number, a: number): V2 => [c[0] + rad * Math.cos(a), c[1] + rad * Math.sin(a)];
  // the card floats while it holds, so the hold keeps moving
  const float = (F: number) =>
    7 * u * Math.sin((2 * Math.PI * (F - HOLD)) / 56) * prog(F, HOLD, HOLD + 12) * (1 - prog(F, 498, 512));
  const avatarAt = (i: number): V2 => [CARD.x + (SLOT[i]! - 1.5) * 150 * u, CARD.y + CARD.h / 2 - 74 * u];
  const budEnd = (i: number): V2 => [CARD.x + (SLOT[i]! - 1.5) * 200 * u, CARD.y + CARD.h / 2 + 64 * u];
  const pairOf = (i: number) => (i < 2 ? 0 : 1),
    PAIR_T = [MERGE_AK, MERGE_LT];
  const pairMid0 = (k: number): V2 => lerp2(SPOT[2 * k]!, SPOT[2 * k + 1]!, 0.5);
  const M: V2 = lerp2(pairMid0(0), pairMid0(1), 0.5);

  // separation scale of a merging pair: a slow drift until a neck forms and thickens, then a snap that overshoots
  // the pull strengthens as they near (a gentle start, then t⁴), so the neck exists only for the last few frames
  const sep = (F: number, from: number, tm: number, neck: number, start = 1) => {
    const t = prog(F, from, tm - 3),
      drift = lerp(start, neck, 0.25 * ease.outCubic(t) + 0.75 * t ** 4);
    return lerp(drift, 0, spring((F - (tm - 3)) / FPS, { freq: 3.2, damp: 0.38 }));
  };
  const DROP_H = (tall ? 560 : 380) * u; // how far above its landing the drop is at frame 0 (inside the frame)
  const person = (i: number, F: number): Person => {
    let p: V2,
      r = R,
      sx = 1,
      sy = 1,
      w = 1,
      core: V2,
      coreR = 11 * u;
    const own = (F / FPS) * 1.4 + i * 1.57;
    if (F < SPLASH) {
      // the drop: four coincident balls fall in (stretched), land and squash
      const e = prog(F, 0, DROP) ** 2;
      p = [G[0], lerp(G[1] - DROP_H, G[1], e)];
      const sq = F < DROP ? -0.16 : 0.34 * Math.exp(-(F - DROP) / 5) * Math.cos((2 * Math.PI * (F - DROP)) / 14);
      sx = 1 + sq;
      sy = 1 - sq * 0.8;
      core = orbit(p, 0.55 * R, i * (Math.PI / 2) + own * 0.6);
    } else if (F < T.booked) {
      // splash to the spots with a hop and an overshoot, then idle
      const k = spring((F - SPLASH) / FPS, { freq: 1.4, damp: 0.5 });
      p = lerp2(G, SPOT[i]!, k);
      p[1] -= 110 * u * Math.sin(Math.PI * prog(F, SPLASH, SPLASH + 22)) * (tall ? 0.6 : 1);
      const land = wob(F, SPLASH + 22, 0.16, 2.4, 6);
      sx = 1 + land;
      sy = 1 - land;
      const id2 = idle(i, F);
      p = [p[0] + id2[0], p[1] + id2[1]];
      core = orbit(p, 0.24 * R, own);
      // the pull: pairs drift together, neck, snap and wobble; then the pairs do the same
      const k2 = pairOf(i),
        tm = PAIR_T[k2]!,
        mid0 = pairMid0(k2);
      const half: V2 = [SPOT[i]![0] - mid0[0], SPOT[i]![1] - mid0[1]],
        dist = 2 * Math.hypot(half[0], half[1]);
      const s1 = sep(F, T.pull + 15 + k2 * 12, tm, (2.55 * R) / dist);
      const pairs = Math.hypot(pairMid0(0)[0] - pairMid0(1)[0], pairMid0(0)[1] - pairMid0(1)[1]);
      // the vertical diamond is tight, so the pairs ease apart while they form, leaving pink between them to close
      const open = lerp(1, tall ? 1.35 : 1, ease.inOutCubic(prog(F, T.pull + 30, MERGE_LT)));
      const s2 = sep(F, MERGE_LT, MERGE_ALL, (4.1 * R) / pairs, open);
      const mid: V2 = [M[0] + (mid0[0] - M[0]) * s2, M[1] + (mid0[1] - M[1]) * s2];
      if (F >= T.pull) {
        const w1 = wob(F, tm, 0.24, 2.4, 9),
          w2 = wob(F, MERGE_ALL, 0.26, 2.0, 11);
        const q: V2 = [mid[0] + half[0] * s1 * (1 + w1), mid[1] + half[1] * s1 * (1 - w1)];
        p = [
          M[0] + (q[0] - M[0]) * (1 + w2) + id2[0] * (1 - prog(F, T.pull, MERGE_ALL)),
          M[1] + (q[1] - M[1]) * (1 - w2) + id2[1],
        ];
        sx = (1 + w1) * (1 + w2);
        sy = (1 - w1) * (1 - w2);
        r = R * (1 + 0.4 * (w1 + w2));
        core = orbit(p, 0.24 * R, own);
        // cores: own blob, then a swirl in the pair, then a swirl in the whole
        const a0 = Math.atan2(half[1], half[0]),
          pc: V2 = [M[0] + (mid[0] - M[0]) * (1 + w2), M[1] + (mid[1] - M[1]) * (1 - w2)];
        const pairSwirl = orbit(pc, 0.5 * R, a0 + Math.max(0, F - tm) * 0.07);
        const allSwirl = orbit(M, 0.7 * R, i * (Math.PI / 2) + 0.4 + Math.max(0, F - MERGE_ALL) * 0.06);
        core = lerp2(
          lerp2(core, pairSwirl, ease.inOutCubic(prog(F, tm - 2, tm + 14))),
          allSwirl,
          ease.inOutCubic(prog(F, MERGE_ALL - 2, MERGE_ALL + 16)),
        );
      }
      // the goo lines up along the card's long axis, then the card field takes over
      const line: V2 = [CARD.x + (SLOT[i]! - 1.5) * CARD.w * 0.2, CARD.y];
      p = lerp2(p, line, ease.inOutCubic(prog(F, 372, 398)));
      w = 1 - ease.inOutCubic(prog(F, T.card, HOLD));
      const av = avatarAt(i);
      core = lerp2(
        core,
        [av[0], av[1] + float(F) + 3 * u * Math.sin(F / 9 + i * 1.6)],
        ease.inOutCubic(prog(F, 398, 424)),
      );
      coreR = lerp(11, 28, ease.inOutCubic(prog(F, 398, 424))) * u;
    } else {
      // booked: a droplet buds under the avatar, pinches off, flies to the spot, lands and becomes a tag
      const s = SLOT[i]!,
        A = avatarAt(i),
        B = budEnd(i),
        land = LAND[i]!;
      const grow = ease.outCubic(prog(F, 512 + 3 * s, 548 + 3 * s));
      p = lerp2(A, B, grow);
      r = 0.62 * R * ease.outCubic(prog(F, 512 + 3 * s, 534 + 3 * s));
      const e = prog(F, land - 24, land);
      if (e > 0) {
        p = lerp2(B, BOOK[i]!, ease.inOutCubic(e));
        p[1] -= 140 * u * Math.sin(Math.PI * e);
        const st = 0.14 * Math.sin(Math.PI * e);
        sx = 1 - st;
        sy = 1 + st;
      }
      const sq = F < land ? 0 : 0.3 * Math.exp(-(F - land) / 6) * Math.cos((2 * Math.PI * (F - land)) / 16);
      sx *= 1 + sq;
      sy *= 1 - sq * 0.8;
      w = 1 - ease.inOutCubic(prog(F, land + 3, land + 14));
      core = lerp2(A, p, ease.inOutCubic(prog(F, 512, 528)));
      coreR = lerp(28, 11, ease.inOutCubic(prog(F, 512, 528))) * u;
      core = lerp2(
        core,
        [BOOK[i]![0] - PILL.w / 2 + 38 * u, BOOK[i]![1]],
        ease.inOutCubic(prog(F, land + 4, land + 16)),
      );
    }
    return { p, r, sx, sy, w, core, coreR };
  };
  // three satellites orbit inside each main ball, each person at their own rhythm: the outline wobbles
  const PER = [
    [52, 71, 90],
    [61, 83, 47],
    [77, 55, 96],
    [44, 67, 85],
  ];
  const satellites = (i: number, F: number, b: Person, out: Ball[]) => {
    for (let k = 0; k < 3; k++) {
      const a = ((2 * Math.PI * F) / PER[i]![k]!) * (k % 2 ? -1 : 1) + i * 1.3 + k * 2.1,
        rad = 0.4 * b.r * (1 + 0.18 * Math.sin((F / PER[i]![(k + 1) % 3]!) * 2 * Math.PI));
      out.push({
        x: b.p[0] + rad * Math.cos(a) * b.sx,
        y: b.p[1] + rad * Math.sin(a) * b.sy,
        r: 0.5 * b.r,
        sx: b.sx,
        sy: b.sy,
        w: b.w,
      });
    }
  };

  // ---- the card: the merged goo flows into it over one beat, jelly-settles, breathes, then drains downward
  const cardSlab = (F: number): Slab | null => {
    if (F < T.card || F >= 562) return null;
    const m = ease.inOutCubic(prog(F, T.card, HOLD)),
      j = wob(F, HOLD, 0.05, 2.3, 9),
      br = 0.01 * Math.sin((2 * Math.PI * (F - HOLD)) / 40);
    let w = CARD.w * (1 + j + br),
      h = CARD.h * (1 - 1.2 * j - br),
      y = CARD.y + float(F),
      a = m;
    if (F >= T.booked) {
      const d = ease.inCubic(prog(F, 512, 548)),
        bottom = CARD.y + CARD.h / 2;
      h = lerp(CARD.h, 40 * u, d);
      w = lerp(CARD.w, CARD.w * 0.9, d);
      y = bottom - h / 2;
      a = 1 - 0.75 * ease.inCubic(prog(F, 538, 556));
    }
    return { x: CARD.x, y, w, h, rad: 64 * u, k: 45 * u, a };
  };
  const pillSlab = (i: number, F: number): Slab | null => {
    const land = LAND[i]!,
      m = ease.inOutCubic(prog(F, land + 3, land + 14));
    if (m <= 0 || F >= WIPE) return null;
    const j = wob(F, land + 14, 0.06, 2.6, 7);
    return {
      x: BOOK[i]![0],
      y: BOOK[i]![1],
      w: PILL.w * (1 + j),
      h: PILL.h * (1 - j),
      rad: PILL.h / 2,
      k: 36 * u,
      a: m,
    };
  };

  // ---- the wipe: one ball swells from below until it covers the frame, then drains downward
  // it covers the frame exactly on the whoosh (frame 660) and is already draining on the next frame: no dead hold
  const Rw = Math.hypot(W / 2, H + 160 * u);
  const wipeBall = (F: number): Ball | null => {
    if (F < 632 || F > 692) return null;
    const t = prog(F, 632, WIPE),
      d = prog(F, WIPE, 688),
      r = Rw * (0.25 * t + 0.75 * t * t),
      dy = (Rw + 420 * u) * (0.3 * d + 0.7 * d * d);
    return { x: W / 2, y: H + 160 * u + dy, r, sx: 1, sy: 1, w: 1 };
  };
  const wipeCover = (F: number, x: number, y: number) => {
    const b = wipeBall(F);
    return b && F < WIPE + 1 ? clamp((ballTerm(b, x, y) - 0.75) / 0.25) : 0;
  };

  // ---- the lockup (after the wipe): a small wobbling blob beside (landscape) or above (vertical) the wordmark
  const WM = {
    size: (tall ? 220 : 240) * u,
    family: F_.serif,
    weight: 400,
    color: C.ink,
    align: "left" as const,
    track: -0.01,
  };
  const lockBlob = (F: number): V2 => {
    const drift = 4 * u * Math.sin((2 * Math.PI * F) / 70);
    return tall ? [cx, 780 * u + drift] : [0, H / 2 - 44 * u + drift]; // landscape x is set from the wordmark width
  };
  let lockX = 0;

  // ---- every ball and slab at frame F
  const balls = (F: number) => {
    const out: Ball[] = [],
      slabs: Slab[] = [];
    if (F < WIPE) {
      for (let i = 0; i < 4; i++) {
        const b = person(i, F);
        if (b.w <= 0 || b.r <= 0) continue;
        out.push({ x: b.p[0], y: b.p[1], r: b.r, sx: b.sx, sy: b.sy, w: b.w });
        satellites(i, F, b, out);
      }
      // the drop's tail catches up as it lands
      if (F < DROP + 4) {
        const lag = 1 - prog(F, DROP - 5, DROP + 3);
        out.push({
          x: G[0],
          y: lerp(G[1] - DROP_H, G[1], prog(F, 0, DROP) ** 2) - 1.9 * R * lag,
          r: 0.55 * R,
          sx: 1,
          sy: 1,
          w: 1,
        });
      }
      // splash spray: six tiny drops fly out on arcs and fall back into the four blobs
      for (let k = 0; k < 6; k++) {
        const t = prog(F, SPLASH, SPLASH + 26 + k * 2);
        if (t <= 0 || t >= 1) continue;
        const to = SPOT[k % 4]!,
          c1: V2 = [lerp(G[0], to[0], 0.5) + (k % 2 ? 90 : -90) * u, Math.min(G[1], to[1]) - (190 + 30 * k) * u];
        const q = (a: number, b: number, c: number) => (1 - t) ** 2 * a + 2 * (1 - t) * t * b + t * t * c;
        out.push({ x: q(G[0], c1[0], to[0]), y: q(G[1], c1[1], to[1]), r: 15 * u, sx: 1, sy: 1, w: 1 });
      }
      // pinch-off: a tiny satellite droplet is left at each neck, then reabsorbed into its droplet
      for (let i = 0; i < 4; i++) {
        const s = SLOT[i]!,
          appear = prog(F, 541 + s, 546 + s),
          back = ease.inCubic(prog(F, 551 + s * 2, 566 + s * 2));
        if (appear <= 0 || back >= 1) continue;
        const neck: V2 = [budEnd(i)[0], CARD.y + CARD.h / 2 + 6 * u];
        const at = lerp2(neck, person(i, F).p, back);
        out.push({ x: at[0], y: at[1], r: 10 * u * appear, sx: 1, sy: 1, w: 1 });
      }
      const c = cardSlab(F);
      if (c) slabs.push(c);
      for (let i = 0; i < 4; i++) {
        const s = pillSlab(i, F);
        if (s) slabs.push(s);
      }
    } else {
      const [bx, by] = lockBlob(F),
        x = tall ? bx : lockX,
        wl = wob(F, 690, 0.1, 1.8, 14) + 0.03 * Math.sin((2 * Math.PI * F) / 45);
      const b: Person = {
        p: [x, by],
        r: R * (tall ? 0.95 : 1.05),
        sx: 1 + wl,
        sy: 1 - wl,
        w: 1,
        core: [0, 0],
        coreR: 0,
      };
      out.push({ x, y: by, r: b.r, sx: b.sx, sy: b.sy, w: 1 });
      satellites(0, F, b, out);
    }
    // the wipe joins the field while it swells (so it necks into the tags); once it covers the frame it is drawn
    // on its own (one ball's surface is a circle), so the draining never pulls on the lockup blob
    const wb = wipeBall(F);
    if (wb && F < WIPE) out.push(wb);
    return { out, slabs };
  };

  const st = 10 * u,
    nx = Math.ceil(W / st) + 2,
    ny = Math.ceil(H / st) + 2,
    grid = new Float32Array((nx + 1) * (ny + 1));
  const sample = (F: number): Grid => {
    const { out, slabs } = balls(F),
      cols = nx + 1;
    for (let j = 0; j <= ny; j++)
      for (let i = 0; i <= nx; i++) {
        if (i === 0 || j === 0 || i === nx || j === ny) {
          grid[j * cols + i] = 0;
          continue;
        }
        const x = (i - 1) * st,
          y = (j - 1) * st;
        let f = 0;
        for (const b of out) f += ballTerm(b, x, y);
        for (const s of slabs) f += slabTerm(s, x, y);
        grid[j * cols + i] = f;
      }
    return { g: grid, nx, ny, ox: -st, oy: -st, st };
  };
  const goo = (ctx: Ctx, F: number) => {
    const g = sample(F),
      body = contour(g, 1),
      shine = contour(g, 1.8),
      rim = contour(g, 0.85);
    ctx.save();
    trace(ctx, rim);
    ctx.strokeStyle = DEEP;
    ctx.globalAlpha = 0.25;
    ctx.lineWidth = 2 * u;
    ctx.lineJoin = "round";
    ctx.stroke();
    ctx.globalAlpha = 1;
    trace(ctx, body);
    ctx.fillStyle = DEEP;
    ctx.fill("evenodd");
    ctx.clip("evenodd");
    trace(ctx, shine, -8 * u, -8 * u);
    ctx.fillStyle = GLOSS;
    ctx.fill("evenodd");
    // the wipe is solid deep: its own surface (r² / d² = 1, a circle) is painted over the gloss
    const wb = wipeBall(F),
      disc = () => {
        ctx.beginPath();
        ctx.arc(wb!.x, wb!.y, wb!.r, 0, Math.PI * 2);
        ctx.fillStyle = DEEP;
        ctx.fill();
      };
    if (wb && F < WIPE) disc(); // clipped to the goo, where it necks into the tags
    ctx.restore();
    if (wb && F >= WIPE) disc(); // on its own, over the lockup blob
  };

  // ---- type
  const headline = (ctx: Ctx, F: number) => {
    const o = { size: 100 * u, family: F_.sans, weight: 800, color: C.ink, track: -0.035 };
    if (!headSize) {
      let s = (tall ? 96 : 96) * u;
      for (const h of HEADS) for (const l of h.lines) s = Math.min(s, (headW / measure(ctx, l, o)) * 100 * u);
      headSize = Math.floor(s);
    }
    const sz = headSize,
      lh = sz * 1.08;
    for (const h of HEADS) {
      if (F < h.at || F >= h.out + 10) continue;
      const out = ease.inCubic(prog(F, h.out, h.out + 10)),
        n = h.lines.length;
      const top = tall ? 450 * u - ((n - 1) * lh) / 2 : L.cy - (n * lh) / 2 + sz * 0.78;
      ctx.save();
      ctx.globalAlpha = 1 - out;
      ctx.translate(0, -out * 24 * u - ease.outCubic(prog(F, h.at, h.at + 90)) * 6 * u);
      h.lines.forEach((line, li) =>
        letters(
          ctx,
          line,
          headX,
          top + li * lh,
          { ...o, size: sz, align: tall ? "center" : "left" },
          (c) => spring((F - h.at - li * 6 - c * (h.stag ?? 1.2)) / FPS, { freq: 2.4, damp: 0.72 }),
          "rise",
        ),
      );
      ctx.restore();
    }
  };
  const TAG = { size: 44 * u, family: F_.sans, weight: 600, track: -0.01 };
  const tags = (ctx: Ctx, F: number) => {
    if (F < TAGS[0]! || F >= 226) return;
    const fade = 1 - prog(F, 210, 224);
    for (let i = 0; i < 4; i++) {
      const k = spring((F - TAGS[i]!) / FPS, { freq: 2.6, damp: 0.55 });
      if (k <= 0) continue;
      const s = `${NAMES[i]} · free ${FREE[i]}`,
        tw = measure(ctx, s, TAG),
        w = tw + 100 * u,
        h = 76 * u;
      const x = inSafe(SPOT[i]![0], w),
        y = SPOT[i]![1] + SIDE(i) * (1.3 * R + 53 * u) + (1 - fade) * 16 * u;
      ctx.save();
      ctx.globalAlpha = fade * clamp(k * 2);
      ctx.translate(x, y);
      ctx.scale(0.6 + 0.4 * k, 0.6 + 0.4 * k);
      rr(ctx, -w / 2, -h / 2, w, h, h / 2);
      ctx.fillStyle = C.surface;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(-w / 2 + 38 * u, 0, 12 * u, 0, Math.PI * 2);
      ctx.fillStyle = CORE[i]!;
      ctx.fill();
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 2 * u;
      ctx.stroke();
      text(ctx, s, -w / 2 + 64 * u, TAG.size * 0.36, { ...TAG, color: C.ink });
      ctx.restore();
    }
  };
  const onGoo = (ctx: Ctx, F: number) => {
    // cores (and, on the card, avatars with initials)
    for (let i = 0; i < 4; i++) {
      const b = person(i, F),
        cover = 1 - wipeCover(F, b.core[0], b.core[1]);
      if (cover <= 0) continue;
      ctx.save();
      ctx.globalAlpha = cover;
      ctx.beginPath();
      ctx.arc(b.core[0], b.core[1], b.coreR, 0, Math.PI * 2);
      ctx.fillStyle = CORE[i]!;
      ctx.fill();
      const ia = prog(F, 414, 426) * (1 - prog(F, 508, 516));
      if (ia > 0)
        text(ctx, NAMES[i]![0]!, b.core[0], b.core[1] + 9 * u, {
          size: 26 * u,
          family: F_.sans,
          weight: 800,
          color: C.ink,
          align: "center",
          alpha: ia,
        });
      ctx.restore();
    }
    // the card's time
    const ca = prog(F, 408, 420) * (1 - prog(F, 508, 518));
    if (ca > 0) {
      const push = 1 + 0.04 * prog(F, 408, 510);
      ctx.save();
      ctx.translate(CARD.x, CARD.y + float(F));
      ctx.scale(push, push);
      letters(
        ctx,
        "Thu · 3:00 pm",
        0,
        -34 * u,
        { size: (tall ? 100 : 96) * u, family: F_.sans, weight: 800, color: C.surface, align: "center", track: -0.035 },
        (c) => spring((F - 408 - c * 1.2) / FPS, { freq: 2.4, damp: 0.72 }) * (1 - prog(F, 508, 518)),
        "rise",
      );
      text(ctx, "works for everyone", 0, 30 * u, {
        size: 40 * u,
        family: F_.sans,
        weight: 600,
        color: C.surface,
        align: "center",
        alpha: prog(F, 424, 438) * (1 - prog(F, 508, 518)),
      });
      ctx.restore();
    }
    // the booked tags' copy
    for (let i = 0; i < 4; i++) {
      const land = LAND[i]!,
        a = prog(F, land + 14, land + 22); // only once the pill has formed
      if (a <= 0 || F >= WIPE) continue;
      const [x, y] = BOOK[i]!,
        cover = 1 - wipeCover(F, x, y);
      text(ctx, `${NAMES[i]} · booked`, x - PILL.w / 2 + 64 * u, y + TAG.size * 0.36 + (1 - a) * 8 * u, {
        ...TAG,
        color: C.surface,
        alpha: a * cover,
      });
    }
  };
  const lockup = (ctx: Ctx, F: number) => {
    const f = F - WIPE,
      tagline = "Find a time that works for everyone.";
    const wmW = measure(ctx, P.product, WM),
      tl = {
        size: (tall ? 40 : 38) * u,
        family: F_.sans,
        weight: 600,
        color: C.ink,
        align: "center" as const,
        track: -0.01,
      };
    const url = { size: 30 * u, family: F_.mono, weight: 500, color: C.ink, align: "center" as const, track: 0.02 };
    const rise = (c: number) => spring((f - 8 - c * 2.5) / FPS, { freq: 2.2, damp: 0.75 });
    const lift = ease.outCubic(prog(F, WIPE, N)) * 8 * u;
    if (tall) {
      letters(ctx, P.product, cx - wmW / 2, 1110 * u - lift, WM, rise, "rise");
      text(ctx, tagline, cx, 1200 * u - lift, { ...tl, alpha: prog(F, 684, 698) });
      text(ctx, P.url, cx, 1272 * u - lift, { ...url, alpha: prog(F, 692, 706) });
    } else {
      const blobW = 230 * u,
        x0 = cx - (blobW + wmW) / 2;
      lockX = x0 + 95 * u;
      letters(ctx, P.product, x0 + blobW, H / 2 + 30 * u - lift, WM, rise, "rise");
      text(ctx, tagline, cx, H / 2 + 150 * u - lift, { ...tl, alpha: prog(F, 684, 698) });
      text(ctx, P.url, cx, H / 2 + 214 * u - lift, { ...url, alpha: prog(F, 692, 706) });
    }
  };

  const paint = (ctx: Ctx, env: Env, F: number) => {
    F = clamp(F, 0, N - 1);
    ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
    ctx.fillStyle = C.ground;
    ctx.fillRect(0, 0, W, H);
    if (F < WIPE) headline(ctx, F);
    else lockup(ctx, F);
    goo(ctx, F);
    if (F < WIPE) {
      onGoo(ctx, F);
      tags(ctx, F);
    }
  };

  const cuts = [0, T.people, T.pull, T.card, T.booked, T.end, N],
    names = ["hook", "people", "pull", "card", "booked", "wipe"];
  const shots: Shot[] = names.map((sid, i) => ({
    id: sid,
    start: cuts[i]!,
    end: cuts[i + 1]!,
    draw: (ctx, local, env) => paint(ctx, env, cuts[i]! + local),
  }));
  const landTicks = LAND.flatMap((f) => [f, f + 3]);
  return {
    meta: { title: id, W, H, fps: FPS, bpm: BPM, durationFrames: N, raster: "cpu" },
    assets: { images: {}, fonts: P.assets },
    shots,
    audio: beatScore({
      frames: N,
      fps: FPS,
      bpm: BPM,
      mood: "soft",
      gain: 0.77,
      hits: [MERGE_AK, MERGE_LT, MERGE_ALL, HOLD],
      whooshes: [MERGE_AK, MERGE_LT, MERGE_ALL, WIPE],
      ticks: [SPLASH, SPLASH + 3, ...TAGS, ...landTicks],
      sign: SIGN,
    }),
  };
}

export const liquidBlobs = make("landscape", "liquidBlobs");
export const liquidBlobsVertical = make("vertical", "liquidBlobsVertical");
