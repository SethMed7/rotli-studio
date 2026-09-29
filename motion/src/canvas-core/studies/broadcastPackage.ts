// STUDY 46 · BROADCAST PACKAGE (24 s, 30 fps, 120 bpm). A TV sports graphics package for an invented office
// ping-pong final, played dead straight: a stinger, a persistent score bug, a lower third, a stats board and a
// ticker over a top-down table with a closed-form rally. One house direction (everything enters from the left,
// builds in layers and leaves by a reverse wipe to the left) and one house angle (every plate is skewed 12°).
// Brief: series/studies/briefs/broadcast-package.json · prompt: series/studies/prompts/broadcast-package.prompt.md
//
// The whole film is one continuous function paint(F) of a (fractional) frame F; the shots only name the sections.
// Paint order: picture (the table) → full-frame panels → plates and the lower third → the stinger → the bug, the
// match-point tab and the ticker, which stay on top of everything once they have built.
import PACK from "../../../brand/packs/studio/pack.json";
import { rng, type Ctx, type Env } from "../core";
import type { Film, Shot } from "../film";
import { clamp, ease, lerp, prog, spring } from "../kit/motion";
import { usePack } from "../kit/pack";
import { beatScore } from "../kit/score";
import { layout, type Size } from "../kit/sizes";
import { measure, text, type TextOpts } from "../kit/type";

const P = usePack(PACK),
  C = P.palette("broadcast"),
  F_ = P.face;
const FPS = 30,
  BPM = 120,
  N = 720; // a beat is 15 frames
const K = Math.tan((12 * Math.PI) / 180); // the house angle: every plate leans 12°
// the timeline, in frames (every shot starts on a beat)
const T = { open: 0, live: 60, lower: 180, match: 300, stats: 420, win: 540, bumper: 630 };
const S1 = 30, // the open stinger covers the frame at 30–31 (its whoosh ends here)
  S2 = 570, // the winning stinger covers at 570–571
  TITLE = { in: 38, out: 105 }, // built by ~61, held a full second so 'THE FINAL' reads twice
  BUG = 84, // the score bug builds 84 → 96, one layer every 4 frames
  LOWER = { in: 180, out: 300 },
  TICKER = 206,
  ROLL1 = 330, // LUND 9 → 10, match point
  ROLL2 = 552, // LUND 10 → 11, the win
  TAB = { in: 340, out: ROLL2 },
  STATS = { in: 420, out: 532 },
  WIN = { in: 584, out: 628 }, // starts once the stinger's event mark has cleared (so two deep plates never cross)
  BUMP = 632,
  CLOCK0 = 41 * 60 + 7; // the match clock reads 41:07 when the live picture lands

// expo out, normalised so it reaches exactly 1 (no bounce): the one entry curve of the whole package
const XP = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : (1 - 2 ** (-10 * t)) / (1 - 2 ** -10));
const inn = (F: number, s: number, d = 11) => XP(prog(F, s, s + d));
const gone = (F: number, e: number, d = 8) => XP(prog(F, e, e + d));

// ---- THE RALLY: closed form. Each crossing runs from one paddle to the other; x is a triangle wave between the
// ends, the height a parabola that bounces once on the far half. A rally's last hit may be a winner the other
// paddle lunges at and misses (a virtual hit), after which the ball flies on and fades.
type Rally = { hits: number[]; first: 1 | -1; miss: boolean; lat: number[] };
const UB = 0.66, // where in a crossing the ball bounces
  H0 = 0.3; // the height at the paddle
const rally = (hits: number[], first: 1 | -1, miss: boolean, seed: number): Rally => {
  const r = rng(seed);
  return { hits, first, miss, lat: hits.map((_, i) => (i === 0 ? -0.25 * first : (r() * 2 - 1) * 0.62)) };
};
const RALLIES: Rally[] = [
  // the long point at 9–9: LUND serves at 60 (the live picture lands), wins it with a fast winner past MARSH
  rally([...Array.from({ length: 15 }, (_, k) => 60 + 18 * k), 326], -1, true, 11),
  // match point: MARSH serves; it runs on under the stats board
  rally(
    Array.from({ length: 10 }, (_, k) => 360 + 16 * k),
    1,
    false,
    23,
  ),
  // the winner: MARSH serves, LUND returns a winner, MARSH misses
  rally([534, 543, 551], 1, true, 5),
];
const sideOf = (R: Rally, k: number) => (k % 2 ? -R.first : R.first);
/** every bounce, for the soft ticks */
const BOUNCES = RALLIES.flatMap((R) => R.hits.slice(0, -1).map((h, k) => Math.round(h + UB * (R.hits[k + 1]! - h))));

export function make(size: Size, id: string): Film {
  const L = layout(size),
    { W, H, u, cx, cy, tall } = L;
  const sans = (size: number, weight: number, color: string, track = 0.04): TextOpts => ({
    size: size * u,
    family: F_.sans,
    weight,
    color,
    track,
  });
  const mono = (size: number, color: string): TextOpts => ({ size: size * u, family: F_.mono, weight: 500, color });

  // ---- the house shapes: a parallelogram whose bottom-left corner is (x, y + h); its top edge leans right
  const para = (ctx: Ctx, x: number, y: number, w: number, h: number) => {
    const s = h * K;
    ctx.beginPath();
    ctx.moveTo(x + s, y);
    ctx.lineTo(x + w + s, y);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.closePath();
  };
  const plate = (ctx: Ctx, x: number, y: number, w: number, h: number, color: string) => {
    para(ctx, x, y, w, h);
    ctx.fillStyle = color;
    ctx.fill();
  };
  /** the house wipe: reveal what fn draws from the left, up to frac of its width, behind a 12° edge */
  const wipe = (ctx: Ctx, x: number, y: number, w: number, h: number, frac: number, fn: () => void, pad = 60 * u) => {
    if (frac <= 0) return;
    if (frac >= 1) return fn();
    const y0 = y - pad,
      y1 = y + h + pad,
      span = (y1 - y0) * K,
      R = lerp(x - span - 4 * u, x + w + span + 4 * u, frac);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-1e4, y0);
    ctx.lineTo(R + span, y0);
    ctx.lineTo(R, y1);
    ctx.lineTo(-1e4, y1);
    ctx.closePath();
    ctx.clip();
    fn();
    ctx.restore();
  };
  /** a layer lands: wipe in from the left with a short slide, on the expo */
  const landing = (ctx: Ctx, F: number, s: number, fn: () => void) => {
    const p = inn(F, s);
    if (p <= 0) return;
    ctx.save();
    ctx.translate(-(1 - p) * 26 * u, 0);
    fn();
    ctx.restore();
  };
  const diamond = (ctx: Ctx, x: number, y: number, r: number, color: string) => {
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.lineTo(x + r, y);
    ctx.lineTo(x, y + r);
    ctx.lineTo(x - r, y);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  };

  // ======================================================================== THE TABLE (the live picture)
  const Lt = (tall ? 720 : 1080) * u,
    Wt = (tall ? 430 : 600) * u,
    X = Lt / 2 + 20 * u, // where the ball meets a paddle
    PR = (tall ? 40 : 44) * u, // paddle head radius
    tableCy = tall ? 920 * u : cy + 6 * u;
  const latPx = (l: number) => (l * Wt) / 2;

  type Ball = { x: number; y: number; h: number; a: number };
  const ballAt = (F: number): Ball | null => {
    for (const R of RALLIES) {
      const hs = R.hits,
        m = hs.length - 1;
      if (F < hs[0]! - 20 || F > hs[m]! + (R.miss ? 9 : 0)) continue;
      if (F < hs[0]!) {
        // the toss: the ball rises off the server's paddle and drops onto it at the serve
        const v = prog(F, hs[0]! - 20, hs[0]!);
        return {
          x: R.first * (X - 6 * u),
          y: latPx(R.lat[0]!),
          h: H0 * v + 1.3 * 4 * v * (1 - v),
          a: prog(F, hs[0]! - 20, hs[0]! - 14),
        };
      }
      if (F >= hs[m]!) {
        // the winner flies on past the paddle that missed it, and fades
        const d = F - hs[m]!,
          s = sideOf(R, m),
          vx = (2 * X) / (hs[m]! - hs[m - 1]!),
          vy = (latPx(R.lat[m]!) - latPx(R.lat[m - 1]!)) / (hs[m]! - hs[m - 1]!);
        return {
          x: s * X + s * vx * d * 0.4,
          y: latPx(R.lat[m]!) + vy * d * 0.4,
          h: H0 + 0.05 * d,
          a: 1 - prog(F, hs[m]! + 1, hs[m]! + 7),
        };
      }
      let k = 0;
      while (k < m - 1 && F >= hs[k + 1]!) k++;
      const s = sideOf(R, k),
        uu = (F - hs[k]!) / (hs[k + 1]! - hs[k]!);
      const h =
        uu < UB
          ? H0 * (1 - uu / UB) + 4 * (uu / UB) * (1 - uu / UB)
          : ((v) => H0 * v + 0.6 * 4 * v * (1 - v))((uu - UB) / (1 - UB));
      return { x: lerp(s * X, -s * X, uu), y: lerp(latPx(R.lat[k]!), latPx(R.lat[k + 1]!), uu), h, a: 1 };
    }
    return null;
  };
  // each paddle's events: every hit on its side (the missed winner sends it lunging to the wrong spot)
  const EVENTS = ([-1, 1] as const).map((side) =>
    RALLIES.flatMap((R) =>
      R.hits
        .map((f, k) => ({ f, k }))
        .filter(({ k }) => sideOf(R, k) === side)
        .map(({ f, k }) => {
          const missed = R.miss && k === R.hits.length - 1;
          const l = R.lat[k]!;
          return { f, lat: missed ? l + (l > 0 ? -0.55 : 0.55) : l, missed };
        }),
    ),
  );
  const paddle = (side: -1 | 1, F: number) => {
    const ev = EVENTS[side < 0 ? 0 : 1]!;
    let i = ev.findIndex((e) => e.f > F);
    if (i < 0) i = ev.length;
    const prev = ev[i - 1],
      next = ev[i];
    let lat: number;
    if (!prev) lat = next!.lat;
    else if (!next) lat = prev.lat;
    else {
      const gap = next.f - prev.f;
      lat = lerp(prev.lat, next.lat, ease.inOutCubic(prog(F, prev.f + 0.2 * gap, next.f - 0.18 * gap)));
    }
    // a short jab toward the table at every hit
    let jab = 0;
    for (const e of [prev, next]) if (e && !e.missed) jab = Math.max(jab, Math.exp(-(((F - e.f) / 3) ** 2)));
    return { x: side * (X + PR - 2 * u) - side * 16 * u * jab, y: latPx(lat) };
  };

  // the live picture has three cameras, cut on the beat: a wide one, a tighter centred one, and an end camera that
  // frames one player's half (side −1 LUND, +1 MARSH). Each rides a slow push-in with a gentle drift so the picture
  // never stops moving. The vertical cuts to the ends: its centred tight shot could not grow past ~1.14× before the
  // paddles met the bug and ticker, so it barely read as a cut. Under the lower third (about LUND) it holds LUND's
  // end, which also keeps MARSH's paddle out from under the plate.
  type Cam = [number, "wide" | "tight" | "end", (-1 | 1)?];
  const CAMS: Cam[] = tall
    ? [
        [S1 + 1, "wide"],
        [120, "end", 1],
        [T.lower, "end", -1],
        [240, "end", 1], // holds through LUND's winner flying past MARSH at 326
        [ROLL1, "end", -1], // the score rolls on LUND's end
        [375, "end", 1], // end to end reads as a cut; end to wide barely moves the vertical's pixels
        [525, "end", 1], // the winner, missed by MARSH
      ]
    : [
        [S1 + 1, "wide"],
        [120, "tight"],
        [T.lower, "wide"],
        [240, "end", 1],
        [ROLL1, "end", -1],
        [375, "wide"],
        [525, "end", 1],
      ];
  const view = (F: number) => {
    if (F >= S2 + 1)
      // after the win the picture cuts to a close shot of LUND's end
      return {
        s: (tall ? 1.55 : 1.6) + 0.1 * prog(F, S2, T.bumper + 10),
        fx: -X - 20 * u,
        ox: tall ? cx : 560 * u,
        oy: tall ? 560 * u : cy - 70 * u,
      };
    const i = CAMS.filter(([f]) => F >= f).length - 1,
      [f0, kind, side = 1] = CAMS[Math.max(0, i)]!,
      f1 = CAMS[i + 1]?.[0] ?? S2,
      push = 0.05 * ease.inOutCubic(prog(F, f0, f1)),
      t = F - S1;
    return {
      s: (kind === "end" ? (tall ? 1.7 : 1.5) : kind === "tight" ? 1.32 : 1) + push,
      // centre that half and its paddle; in landscape the paddle stays right of the bug and the match-point tab
      fx: kind === "end" ? side * (tall ? 230 : 370) * u : 0,
      ox: cx + 22 * u * Math.sin(t / 40),
      oy: tableCy + 12 * u * Math.cos(t / 55),
    };
  };

  const table = (ctx: Ctx, F: number) => {
    const v = view(F);
    ctx.save();
    ctx.translate(v.ox, v.oy);
    if (tall) ctx.rotate(Math.PI / 2); // players at the top (LUND) and the bottom (MARSH)
    ctx.scale(v.s, v.s);
    ctx.translate(-v.fx, 0);
    // the court: a flat surround with a boundary line
    const cw = Lt + 440 * u,
      ch = Wt + 300 * u;
    ctx.fillStyle = C.surface;
    ctx.fillRect(-cw / 2, -ch / 2, cw, ch);
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 4 * u;
    ctx.strokeRect(-cw / 2 + 24 * u, -ch / 2 + 24 * u, cw - 48 * u, ch - 48 * u);
    // the table top, its white edge lines and the centre line
    ctx.fillStyle = C.table;
    ctx.fillRect(-Lt / 2, -Wt / 2, Lt, Wt);
    ctx.fillStyle = C.ink;
    const e = 7 * u;
    ctx.fillRect(-Lt / 2, -Wt / 2, Lt, e);
    ctx.fillRect(-Lt / 2, Wt / 2 - e, Lt, e);
    ctx.fillRect(-Lt / 2, -Wt / 2, e, Wt);
    ctx.fillRect(Lt / 2 - e, -Wt / 2, e, Wt);
    ctx.fillRect(-Lt / 2, -1.5 * u, Lt, 3 * u);
    // the net across the middle, with its posts
    ctx.fillStyle = C.deep;
    ctx.fillRect(-5 * u, -Wt / 2 - 34 * u, 10 * u, Wt + 68 * u);
    ctx.fillStyle = C.ink;
    ctx.fillRect(-2 * u, -Wt / 2 - 34 * u, 4 * u, Wt + 68 * u);
    ctx.fillStyle = C.deep;
    ctx.fillRect(-9 * u, -Wt / 2 - 44 * u, 18 * u, 18 * u);
    ctx.fillRect(-9 * u, Wt / 2 + 26 * u, 18 * u, 18 * u);
    // the paddles: a round head in the player's colour and a handle pointing away from the table
    for (const side of [-1, 1] as const) {
      if (F > S2 && side === 1) continue;
      const p = F > S2 ? { x: -(X + PR - 2 * u), y: latPx(-0.1 + 0.12 * Math.sin((F - S2) / 14)) } : paddle(side, F);
      ctx.fillStyle = C.muted;
      ctx.fillRect(side > 0 ? p.x + PR * 0.6 : p.x - PR * 0.6 - 30 * u, p.y - 8 * u, 30 * u, 16 * u);
      ctx.beginPath();
      ctx.arc(p.x, p.y, PR, 0, Math.PI * 2);
      ctx.fillStyle = side < 0 ? C.accent : C.accent2;
      ctx.fill();
    }
    // the ball: height shows only through its shadow's offset and softness (the one shadow in the package)
    const b = F > S2 ? null : ballAt(F);
    if (b && b.a > 0) {
      const r = 10 * u * (1 + 0.28 * b.h),
        // the light stays top-left in screen space, so the shadow's local offset turns with the table
        sx = 30 * u * b.h,
        sy = 44 * u * b.h,
        [ox, oy] = tall ? [sy, -sx] : [sx, sy];
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.ellipse(
          b.x + ox,
          b.y + oy,
          r * (1 + i * 0.35 * (0.3 + b.h)),
          r * 0.8 * (1 + i * 0.35 * (0.3 + b.h)),
          0,
          0,
          Math.PI * 2,
        );
        ctx.fillStyle = `rgba(5,8,26,${((0.5 - 0.22 * clamp(b.h / 1.2)) / 3) * b.a})`;
        ctx.fill();
      }
      ctx.globalAlpha = b.a;
      ctx.beginPath();
      ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
      ctx.fillStyle = C.ink;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  };

  // ======================================================================== THE EVENT MARK: a ring round a paddle + T2
  const mark = (ctx: Ctx, x: number, y: number, s: number) => {
    const o = sans(120 * s, 800, C.ink, 0.01),
      wT = measure(ctx, "T2", o),
      R = 62 * u * s,
      gap = 26 * u * s,
      left = x - (2 * R + gap + wT) / 2,
      rx = left + R;
    ctx.beginPath();
    ctx.arc(rx, y, R - 5 * u * s, 0, Math.PI * 2);
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 10 * u * s;
    ctx.stroke();
    ctx.save();
    ctx.translate(rx, y);
    ctx.rotate(-0.6);
    ctx.fillStyle = C.ink;
    ctx.fillRect(-6 * u * s, 8 * u * s, 12 * u * s, 30 * u * s);
    ctx.beginPath();
    ctx.arc(0, -8 * u * s, 26 * u * s, 0, Math.PI * 2);
    ctx.fillStyle = C.accent;
    ctx.fill();
    ctx.restore();
    text(ctx, "T2", rx + R + gap, y + 43 * u * s, o);
  };

  // ======================================================================== THE STINGER
  const stinger = (ctx: Ctx, F: number, M: number, D: number, stag: number) => {
    const cols = [C.accent, C.accent2, C.gold, C.ink, C.deep],
      bh = H / 5,
      span = (bh + 2) * K;
    cols.forEach((col, i) => {
      const ls = M - D - stag * (4 - i),
        ts = M + 2 + stag * i,
        lead = XP(prog(F, ls, ls + D)),
        trail = XP(prog(F, ts, ts + D));
      if (lead <= trail) return;
      const a = lerp(-span - 2, W + 2, trail),
        b = lerp(-span - 2, W + 2, lead);
      plate(ctx, a, i * bh - 1, b - a, bh + 2, col);
      // the deep bar is near the navy ground, so its leading edge carries a flat line-coloured sliver to read
      if (col === C.deep && b - a > 14 * u) plate(ctx, b - 12 * u, i * bh - 1, 12 * u, bh + 2, C.line);
    });
    // the event mark snaps in over the middle for a beat, then wipes out to the left
    const on = inn(F, M - 3, 4),
      off = gone(F, M + 10, 5);
    if (on > 0 && off < 1) {
      const pw = 520 * u,
        ph = 220 * u,
        k = 1 + 0.08 * (1 - on);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(k, k);
      ctx.translate(-cx, -cy);
      wipe(ctx, cx - pw / 2 - (ph * K) / 2, cy - ph / 2, pw, ph, on * (1 - off), () => {
        plate(ctx, cx - pw / 2 - (ph * K) / 2, cy - ph / 2, pw, ph, C.deep);
        mark(ctx, cx, cy, 1);
      });
      ctx.restore();
    }
  };

  // ======================================================================== THE SCORE BUG (+ the match-point tab)
  const bx = L.safe.x,
    by = L.safe.top + (tall ? 12 * u : 0),
    bw = 360 * u,
    rowH = 48 * u,
    rg = 8 * u,
    bh = 2 * rowH + 3 * rg,
    stripY = by + bh + 5 * u,
    stripH = 42 * u,
    tabY = stripY + stripH + 6 * u,
    tabH = 40 * u;
  /** the bug's left edge at height yy (every plate below it continues the same 12° line) */
  const bugEdge = (yy: number) => bx + (by + bh - yy) * K;
  const scoreOf = (who: 0 | 1, F: number) => (who === 1 ? 9 : F < ROLL1 ? 9 : F < ROLL2 ? 10 : 11);
  const bugDraw = (ctx: Ctx, F: number) => {
    // layer 0: the deep base plate
    wipe(ctx, bx, by, bw, bh, inn(F, BUG), () => plate(ctx, bx, by, bw, bh, C.deep));
    (["LUND", "MARSH"] as const).forEach((name, r) => {
      const ry = by + rg + r * (rowH + rg),
        rx = bugEdge(ry + rowH) + 12 * u,
        col = r === 0 ? C.accent : C.accent2,
        boxX = rx + 246 * u,
        boxW = 80 * u,
        roll = r === 0 ? [ROLL1, ROLL2].find((R) => F >= R && F < R + 15) : undefined;
      // layer 1: colour (the chip and the score box)
      wipe(ctx, rx, ry, bw, rowH, inn(F, BUG + 4), () => {
        plate(ctx, rx, ry, 12 * u, rowH, col);
        const flash = roll !== undefined ? 1 - prog(F, roll + 11, roll + 15) : 0;
        plate(ctx, boxX, ry, boxW, rowH, C.line);
        if (flash > 0) {
          ctx.globalAlpha = flash;
          plate(ctx, boxX, ry, boxW, rowH, col);
          ctx.globalAlpha = 1;
        }
      });
      // layer 2: text (the surname and the score, which rolls: old digit up and out, new one up from below)
      wipe(ctx, rx, ry, bw, rowH, inn(F, BUG + 8), () => {
        text(ctx, name, rx + 30 * u + (rowH * K) / 2, ry + rowH / 2 + 11.5 * u, sans(32, 800, C.ink, 0.06));
        const mid = boxX + boxW / 2 + (rowH * K) / 2,
          base = ry + rowH / 2 + 12.5 * u,
          o = { ...mono(36, C.ink), align: "center" as const };
        ctx.save();
        para(ctx, boxX, ry, boxW, rowH);
        ctx.clip();
        if (roll !== undefined) {
          const t = XP(prog(F, roll, roll + 9));
          text(ctx, String(scoreOf(0, roll - 1)), mid, base - t * rowH, o);
          text(ctx, String(scoreOf(0, F)), mid, base + (1 - t) * rowH, o);
        } else text(ctx, String(scoreOf(r as 0 | 1, F)), mid, base, o);
        ctx.restore();
      });
    });
    // layer 3: detail (the strip with the game and the running match clock, which counts real frames)
    const sx = bugEdge(stripY + stripH);
    wipe(ctx, sx, stripY, bw, stripH, inn(F, BUG + 12), () => {
      plate(ctx, sx, stripY, bw, stripH, C.line);
      text(ctx, "G5", sx + 22 * u + (stripH * K) / 2, stripY + stripH / 2 + 9 * u, sans(25, 800, C.ink, 0.06));
      const secs = CLOCK0 + Math.max(0, Math.floor((F - T.live) / FPS)),
        clock = `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;
      text(ctx, clock, sx + bw - 18 * u + (stripH * K) / 2, stripY + stripH / 2 + 9 * u, {
        ...mono(26, C.ink),
        align: "right",
      });
      diamond(ctx, sx + 84 * u + (stripH * K) / 2, stripY + stripH / 2, 5 * u, C.gold);
    });
    // the gold MATCH POINT tab slides out beneath the bug, and wipes back out when the point is won
    const tx = bugEdge(tabY + tabH),
      tw = 250 * u,
      out = 1 - gone(F, TAB.out, 7);
    if (F >= TAB.in && out > 0)
      wipe(ctx, tx, tabY, tw, tabH, out, () => {
        wipe(ctx, tx, tabY, tw, tabH, inn(F, TAB.in), () => plate(ctx, tx, tabY, tw, tabH, C.gold));
        wipe(ctx, tx, tabY, tw, tabH, inn(F, TAB.in + 4), () =>
          text(ctx, "MATCH POINT", tx + 20 * u + (tabH * K) / 2, tabY + tabH / 2 + 9 * u, sans(25, 800, C.deep, 0.08)),
        );
      });
  };

  // ======================================================================== THE TICKER
  const tkH = 54 * u,
    tkY = H - L.safe.bottom - tkH,
    ITEMS = [
      "COFFEE MACHINE ON 3 IS FIXED",
      "FOOSBALL SEMIS FRIDAY AT 4",
      "LOST: ONE ORANGE BALL",
      "TABLE ONE CLOSED FOR RE-TAPING",
    ],
    GAP = 64 * u,
    SPEED = 3.4 * u; // px per frame, constant
  const ticker = (ctx: Ctx, F: number) => {
    if (F < TICKER) return;
    const lo = sans(24, 800, C.ink, 0.08),
      lw = measure(ctx, "OFFICE NEWS", lo) + 48 * u,
      labX = L.safe.x - 30 * u,
      labR = labX + lw + tkH * K;
    wipe(ctx, -60 * u, tkY, W + 120 * u, tkH, inn(F, TICKER, 14), () => {
      plate(ctx, -60 * u, tkY, W + 120 * u, tkH, C.deep);
      ctx.fillStyle = C.line;
      ctx.fillRect(0, tkY, W, 3 * u);
    });
    // the label block is fixed; everything else crawls behind it
    wipe(ctx, -200 * u, tkY, labX + lw + 200 * u, tkH, inn(F, TICKER + 4), () => {
      plate(ctx, -200 * u, tkY, labX + lw + 200 * u, tkH, C.accent);
      text(ctx, "OFFICE NEWS", labX + 24 * u, tkY + tkH / 2 + 9 * u, lo);
    });
    if (F < TICKER + 8) return;
    const o = sans(28, 600, C.ink, 0.04),
      widths = ITEMS.map((s) => measure(ctx, s, o)),
      S = widths.reduce((a, w) => a + w + GAP, 0),
      clipL = labR + 14 * u,
      clipR = W - L.safe.x,
      first = clipL + 24 * u - SPEED * (F - (TICKER + 8)); // x = x0 − v·F, wrapped below
    ctx.save();
    ctx.beginPath();
    ctx.rect(clipL, tkY, clipR - clipL, tkH);
    ctx.clip();
    // the text enters like everything else, wiped on from the left, then crawls
    const reveal = inn(F, TICKER + 8, 16);
    if (reveal < 1) {
      ctx.beginPath();
      ctx.rect(clipL, tkY, (clipR - clipL) * reveal, tkH);
      ctx.clip();
    }
    const k0 = Math.max(0, Math.floor((clipL - first) / S) - 1);
    for (let k = k0; first + k * S < clipR; k++) {
      let x = first + k * S;
      ITEMS.forEach((s, i) => {
        if (x < clipR && x + widths[i]! > clipL) text(ctx, s, x, tkY + tkH / 2 + 9.5 * u, o);
        x += widths[i]!;
        diamond(ctx, x + GAP / 2, tkY + tkH / 2, 7 * u, C.gold);
        x += GAP;
      });
    }
    ctx.restore();
  };

  // ======================================================================== THE TITLE PLATE (the open)
  const titleDraw = (ctx: Ctx, F: number) => {
    if (F < TITLE.in || F > TITLE.out + 12) return;
    const lines = tall ? ["TABLE TWO", "OPEN"] : ["TABLE TWO OPEN"],
      o = sans(tall ? 116 : 92, 800, C.ink, 0.03),
      lh = (tall ? 118 : 0) * u,
      th = (tall ? 262 : 134) * u,
      tw = Math.max(...lines.map((s) => measure(ctx, s, o))) + 96 * u,
      tx = L.safe.x,
      ty = tall ? 1070 * u : 676 * u,
      edge = (yy: number) => tx + (ty + th - yy) * K,
      sh = 56 * u,
      sy = ty + th + 8 * u,
      sw = measure(ctx, "THE FINAL", sans(32, 600, C.deep, 0.16)) + 72 * u;
    wipe(ctx, tx - 200 * u, ty, tw + 600 * u, th + sh + 8 * u, 1 - gone(F, TITLE.out), () => {
      wipe(ctx, tx, ty, tw, th, inn(F, TITLE.in), () => plate(ctx, tx, ty, tw, th, C.deep));
      wipe(ctx, tx, ty, 20 * u, th, inn(F, TITLE.in + 4), () => plate(ctx, tx, ty, 20 * u, th, C.accent));
      landing(ctx, F, TITLE.in + 8, () =>
        wipe(ctx, tx, ty, tw, th, inn(F, TITLE.in + 8), () =>
          lines.forEach((s, i) => {
            const base = ty + (tall ? 128 : 101) * u + i * lh;
            text(ctx, s, edge(base - 34 * u) + 48 * u, base, o);
          }),
        ),
      );
      const sx = edge(sy + sh) + 34 * u;
      wipe(ctx, sx, sy, sw, sh, inn(F, TITLE.in + 12), () => {
        plate(ctx, sx, sy, sw, sh, C.ink);
        text(ctx, "THE FINAL", sx + 36 * u + (sh * K) / 2, sy + sh / 2 + 11.5 * u, sans(32, 600, C.deep, 0.16));
      });
    });
  };

  // ======================================================================== THE LOWER THIRD
  const lowerDraw = (ctx: Ctx, F: number) => {
    if (F < LOWER.in || F > LOWER.out + 12) return;
    const s0 = LOWER.in,
      lx = L.safe.x,
      nh = 88 * u, // the name plate
      ly = tkY - (tall ? 40 : 34) * u - nh - 6 * u - 48 * u,
      barTop = ly - 12 * u,
      barH = nh + 6 * u + 48 * u + 24 * u,
      barEdge = (yy: number) => lx + 18 * u + (barTop + barH - yy) * K, // the bar's right edge at yy
      oLast = sans(64, 800, C.deep, 0.04),
      oFirst = sans(44, 600, C.deep, 0.04),
      wFirst = measure(ctx, "PIA", oFirst),
      wLast = measure(ctx, "LUND", oLast),
      pw = 30 * u + wFirst + 18 * u + wLast + 36 * u,
      px = barEdge(ly + nh) + 4 * u,
      sy = ly + nh + 6 * u,
      sh = 48 * u,
      line2 = "ACCOUNTS · 3RD YEAR ON TABLE TWO",
      o2 = sans(26, 600, C.ink, 0.05),
      sw = measure(ctx, line2, o2) + 64 * u,
      sx = barEdge(sy + sh) + 4 * u,
      tagO = sans(23, 800, C.ink, 0.07),
      tagN = mono(30, C.ink),
      tagW = measure(ctx, "SERVE WIN", tagO) + 14 * u + measure(ctx, "71%", tagN) + 48 * u,
      tagH = 48 * u,
      tagY = ly + (nh - tagH) / 2,
      tagX = px + pw + (ly + nh - (tagY + tagH)) * K + 12 * u;
    wipe(ctx, lx - 100 * u, barTop, tagX + tagW + 200 * u, barH, 1 - gone(F, LOWER.out), () => {
      // 1 · the accent bar wipes in
      wipe(ctx, lx, barTop, 18 * u, barH, inn(F, s0), () => plate(ctx, lx, barTop, 18 * u, barH, C.accent));
      // 2 · the white name plate slides out from behind the bar, through a mask at the bar's edge
      const p = inn(F, s0 + 4, 13);
      if (p > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(barEdge(barTop), barTop);
        ctx.lineTo(W, barTop);
        ctx.lineTo(W, barTop + barH);
        ctx.lineTo(barEdge(barTop + barH), barTop + barH);
        ctx.closePath();
        ctx.clip();
        ctx.translate(-(1 - p) * (pw + 30 * u), 0);
        plate(ctx, px, ly, pw, nh, C.ink);
        // 3 · the surname lands, 4 · then the first name
        const base = ly + nh / 2 + 23 * u,
          tx = px + 30 * u + (nh * K) / 2;
        landing(ctx, F, s0 + 8, () => text(ctx, "LUND", tx + wFirst + 18 * u, base, oLast));
        landing(ctx, F, s0 + 12, () => text(ctx, "PIA", tx, base, oFirst));
        ctx.restore();
      }
      // 5 · the deep strip with the second line
      wipe(ctx, sx, sy, sw, sh, inn(F, s0 + 16), () => {
        plate(ctx, sx, sy, sw, sh, C.deep);
        text(ctx, line2, sx + 34 * u + (sh * K) / 2, sy + sh / 2 + 9.5 * u, o2);
      });
      // 6 · the stat tag at the right end
      wipe(ctx, tagX, tagY, tagW, tagH, inn(F, s0 + 20), () => {
        plate(ctx, tagX, tagY, tagW, tagH, C.accent);
        const tx = tagX + 22 * u + (tagH * K) / 2,
          base = tagY + tagH / 2 + 8.5 * u;
        const w = text(ctx, "SERVE WIN", tx, base, tagO);
        text(ctx, "71%", tx + w + 14 * u, base + 1.5 * u, tagN);
      });
    });
  };

  // ======================================================================== THE STATS BOARD
  const ROWS: [string, number, number][] = [
    ["ACES", 4, 2],
    ["LONGEST RALLY", 23, 23],
    ["EDGE BALLS", 1, 5],
    ["SNACKS ON THE BENCH", 3, 0],
  ];
  const statsDraw = (ctx: Ctx, F: number) => {
    if (F < STATS.in || F > STATS.out + 12) return;
    const s0 = STATS.in,
      maxLen = (tall ? 300 : 520) * u,
      col = (tall ? 350 : 580) * u, // the number columns, from the spine
      rowsTop = (tall ? 760 : 430) * u,
      pitch = (tall ? 178 : 124) * u,
      barH = (tall ? 58 : 46) * u,
      spineTop = rowsTop - 20 * u,
      spineBot = rowsTop + 3 * pitch + 36 * u + barH,
      spineX = (yy: number) => cx + (spineBot - yy) * K - ((spineBot - spineTop) * K) / 2,
      push = 1 + 0.03 * ease.inOutCubic(prog(F, s0, STATS.out)); // a slow push-in keeps the hold alive
    wipe(ctx, -H * K - 20 * u, 0, W + H * K + 40 * u, H, 1 - gone(F, STATS.out), () => {
      wipe(ctx, -H * K - 20 * u, 0, W + H * K + 40 * u, H, inn(F, s0, 13), () =>
        plate(ctx, -H * K - 20 * u, 0, W + 2 * H * K + 40 * u, H, C.deep),
      );
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(push, push);
      ctx.translate(-cx, -cy);
      // the headers: flanking the spine (landscape) or stacked (vertical)
      const ho = sans(tall ? 76 : 68, 800, C.accent, 0.06),
        hy = (tall ? 560 : 348) * u,
        hh = 58 * u;
      if (tall) {
        const w1 = measure(ctx, "LUND", ho),
          w2 = measure(ctx, "MARSH", ho),
          y2 = hy + 92 * u;
        wipe(ctx, L.safe.x, hy - hh, w1 + 60 * u, hh, inn(F, s0 + 4), () => {
          plate(ctx, L.safe.x, hy - hh, 16 * u, hh, C.accent);
          text(ctx, "LUND", L.safe.x + 34 * u + (hh * K) / 2, hy, ho);
        });
        wipe(ctx, W - L.safe.x - w2 - 60 * u, y2 - hh, w2 + 60 * u, hh, inn(F, s0 + 8), () => {
          text(ctx, "MARSH", W - L.safe.x - 36 * u, y2, { ...ho, color: C.accent2, align: "right" });
          plate(ctx, W - L.safe.x - 16 * u, y2 - hh, 16 * u, hh, C.accent2);
        });
      } else {
        const w1 = measure(ctx, "LUND", ho);
        wipe(ctx, cx - 60 * u - w1, hy - hh, w1 + 40 * u, hh, inn(F, s0 + 4), () =>
          text(ctx, "LUND", spineX(hy) - 44 * u, hy, { ...ho, align: "right" }),
        );
        wipe(ctx, cx + 20 * u, hy - hh, 360 * u, hh, inn(F, s0 + 8), () =>
          text(ctx, "MARSH", spineX(hy) + 36 * u, hy, { ...ho, color: C.accent2 }),
        );
      }
      // the rows: a label, two bars growing out from the spine on staggered springs, numbers counting up
      ROWS.forEach(([label, a, b], i) => {
        const st = s0 + 14 + 12 * i,
          y = rowsTop + i * pitch,
          yb = y + 18 * u,
          grow = spring((F - st - 3) / FPS, { freq: 1.5, damp: 0.78 }),
          count = ease.outCubic(prog(F, st + 3, st + 30)),
          m = Math.max(a, b, 1),
          la = (a / m) * maxLen * grow,
          lb = (b / m) * maxLen * grow,
          sxb = spineX(yb + barH);
        wipe(ctx, cx - 400 * u, y - 40 * u, 800 * u, 44 * u, inn(F, st), () =>
          text(ctx, label, spineX(y - 12 * u), y, { ...sans(tall ? 28 : 26, 600, C.muted, 0.1), align: "center" }),
        );
        // the spine: one white segment per row, so the labels sit in the gaps
        wipe(ctx, sxb - 40 * u, yb - 8 * u, 80 * u, barH + 16 * u, inn(F, st), () =>
          plate(ctx, spineX(yb + barH + 8 * u) - 3 * u, yb - 8 * u, 6 * u, barH + 16 * u, C.ink),
        );
        if (la > 0) plate(ctx, sxb - 6 * u - la, yb, la, barH, C.accent);
        if (lb > 0) plate(ctx, sxb + 6 * u, yb, lb, barH, C.accent2);
        const no = mono(tall ? 44 : 42, C.ink),
          nb = yb + barH / 2 + 15 * u,
          na = inn(F, st + 3);
        if (na > 0) {
          text(ctx, String(Math.round(a * count)), sxb - col + (barH * K) / 2, nb, {
            ...no,
            align: "right",
            alpha: na,
          });
          text(ctx, String(Math.round(b * count)), sxb + col + (barH * K) / 2, nb, { ...no, alpha: na });
        }
      });
      ctx.restore();
    });
  };

  // ======================================================================== THE WIN PLATE
  const winDraw = (ctx: Ctx, F: number) => {
    if (F < WIN.in || F > WIN.out + 12) return;
    const lines = tall ? ["LUND", "WINS"] : ["LUND WINS"],
      o = sans(tall ? 150 : 118, 800, C.deep, 0.03),
      gh = (tall ? 330 : 150) * u,
      gw = Math.max(...lines.map((s) => measure(ctx, s, o))) + 110 * u,
      dh = 64 * u,
      tx = L.safe.x + 10 * u,
      ty = tall ? 1010 * u : 600 * u,
      edge = (yy: number) => tx + (ty + gh + dh - yy) * K,
      bw2 = gw + 70 * u;
    wipe(ctx, tx - 200 * u, ty, bw2 + 600 * u, gh + dh, 1 - gone(F, WIN.out), () => {
      // base (deep), then colour (the gold slab), then text, then detail (the result line)
      wipe(ctx, tx, ty, bw2, gh + dh, inn(F, WIN.in), () => plate(ctx, tx, ty, bw2, gh + dh, C.deep));
      const gx = edge(ty + gh);
      wipe(ctx, gx, ty, gw, gh, inn(F, WIN.in + 4), () => plate(ctx, gx, ty, gw, gh, C.gold));
      landing(ctx, F, WIN.in + 8, () =>
        wipe(ctx, gx, ty, gw, gh, inn(F, WIN.in + 8), () =>
          lines.forEach((s, i) => {
            const base = ty + (tall ? 150 : 118) * u + i * 146 * u;
            text(ctx, s, edge(base - 44 * u) + 48 * u, base, o);
          }),
        ),
      );
      const ry = ty + gh,
        rx = edge(ty + gh + dh) + 48 * u + (dh * K) / 2;
      wipe(ctx, edge(ty + gh + dh), ry, bw2, dh, inn(F, WIN.in + 12), () => {
        const w = text(ctx, "11–9", rx, ry + dh / 2 + 12 * u, mono(36, C.gold));
        text(ctx, "·  GAME 5", rx + w + 18 * u, ry + dh / 2 + 11 * u, sans(32, 600, C.ink, 0.1));
      });
    });
  };

  // ======================================================================== THE BUMPER
  const bumperDraw = (ctx: Ctx, F: number) => {
    if (F < BUMP) return;
    const push = 1 + 0.05 * ease.inOutCubic(prog(F, BUMP + 8, N)),
      my = cy - (tall ? 150 : 120) * u,
      ty = cy + (tall ? 80 : 90) * u,
      o = sans(tall ? 80 : 88, 800, C.ink, 0.03),
      so = sans(tall ? 32 : 34, 600, C.deep, 0.1),
      sw = measure(ctx, "CHAMPION · PIA LUND", so) + 80 * u,
      sh = 62 * u,
      sy = ty + 36 * u,
      tw = measure(ctx, "TABLE TWO OPEN", o);
    wipe(ctx, -H * K - 20 * u, 0, W + H * K + 40 * u, H, inn(F, BUMP, 13), () =>
      plate(ctx, -H * K - 20 * u, 0, W + 2 * H * K + 40 * u, H, C.ground),
    );
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(push, push);
    ctx.translate(-cx, -cy);
    wipe(ctx, cx - 260 * u, my - 110 * u, 520 * u, 220 * u, inn(F, BUMP + 4, 6), () => mark(ctx, cx, my, 1.25));
    landing(ctx, F, BUMP + 8, () =>
      wipe(ctx, cx - tw / 2, ty - 70 * u, tw, 80 * u, inn(F, BUMP + 8), () =>
        text(ctx, "TABLE TWO OPEN", cx, ty, { ...o, align: "center" }),
      ),
    );
    const sx = cx - sw / 2 - (sh * K) / 2;
    wipe(ctx, sx, sy, sw, sh, inn(F, BUMP + 12), () => {
      plate(ctx, sx, sy, sw, sh, C.gold);
      text(ctx, "CHAMPION · PIA LUND", cx, sy + sh / 2 + 12 * u, { ...so, align: "center" });
    });
    ctx.restore();
  };

  const paint = (ctx: Ctx, env: Env, F: number) => {
    F = clamp(F, 0, N - 1);
    ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
    ctx.fillStyle = C.ground;
    ctx.fillRect(0, 0, W, H);
    // the picture: nothing under the open stinger; the table once it has covered the frame
    if (F >= S1 + 1 && !(F > STATS.in + 14 && F < STATS.out - 2) && F < BUMP + 16) table(ctx, F);
    // the vertical's picture stops at the ticker once it arrives: a ground band wipes in under it on the ticker's own
    // frames, so nothing (the winning ball) shows in the 320 px below it, and there is no hard edge before it exists
    if (tall)
      wipe(ctx, -60 * u, tkY, W + 120 * u, H - tkY, inn(F, TICKER, 14), () => {
        ctx.fillStyle = C.ground;
        ctx.fillRect(-60 * u, tkY, W + 120 * u, H - tkY);
      });
    statsDraw(ctx, F);
    titleDraw(ctx, F);
    lowerDraw(ctx, F);
    winDraw(ctx, F);
    bumperDraw(ctx, F);
    if (F < S1 + 40) stinger(ctx, F, S1, 24, 3);
    if (F > S2 - 30 && F < S2 + 40) stinger(ctx, F, S2, 14, 2);
    if (F >= BUG) bugDraw(ctx, F);
    ticker(ctx, F);
  };

  const cuts = [T.open, T.live, T.lower, T.match, T.stats, T.win, T.bumper, N],
    names = ["open", "live", "lower-third", "match-point", "stats", "winner", "bumper"];
  const shots: Shot[] = names.map((sid, i) => ({
    id: sid,
    start: cuts[i]!,
    end: cuts[i + 1]!,
    draw: (ctx, local, env) => paint(ctx, env, cuts[i]! + local),
  }));

  // ---- sound: the drive score with its cues, plus a soft "tok" for every bounce the viewer can see
  const cues = [T.live, ROLL1, S2, S1],
    layerTicks = [BUG, BUG + 4, BUG + 8, BUG + 12, ...[0, 4, 8, 12, 16, 20].map((d) => LOWER.in + d), TAB.in, ROLL2];
  const busy = [...cues, ...layerTicks, T.bumper + 30];
  const toks: number[] = [];
  for (const f of BOUNCES) {
    const hidden = (f > STATS.in + 10 && f < STATS.out + 4) || f < S1 || Math.abs(f - S2) < 10;
    if (hidden || busy.some((c) => Math.abs(c - f) < 4) || (toks.length && f - toks[toks.length - 1]! < 8)) continue;
    toks.push(f);
  }
  const score = beatScore({
    frames: N,
    fps: FPS,
    bpm: BPM,
    mood: "drive",
    drop: T.live,
    hits: [T.live, ROLL1, S2],
    whooshes: [S1, S2],
    ticks: layerTicks,
    sign: T.bumper + 30,
  });
  return {
    meta: { title: id, W, H, fps: FPS, bpm: BPM, durationFrames: N, raster: "cpu" },
    assets: { images: {}, fonts: P.assets },
    shots,
    audio: (sr) => {
      const [Lc, Rc] = score(sr);
      for (const f of toks) {
        const i0 = Math.round((f / FPS) * sr);
        for (let k = 0; k < 0.05 * sr && i0 + k < Lc.length; k++) {
          const t = k / sr,
            v = Math.sin(2 * Math.PI * 1650 * t) * Math.exp(-t / 0.011) * 0.09;
          Lc[i0 + k]! += v * 0.9;
          Rc[i0 + k]! += v * 1.1;
        }
      }
      return [Lc, Rc];
    },
  };
}

export const broadcastPackage = make("landscape", "broadcastPackage");
export const broadcastPackageVertical = make("vertical", "broadcastPackageVertical");
