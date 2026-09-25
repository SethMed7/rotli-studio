// STUDY 06 · KINETIC POSTER (12 s, 60 fps, 120 bpm). Type is the whole picture: near-black words set huge and
// tight on a signal-orange ground. FIND slams in, ONE fills from outline, HOUR. arrives in italic with a blue full
// stop, the three words shear into a block that the camera flies through to that full stop, a marquee of
// repeating rows, colour-flash cards on the beat (blue, black, paper), a line that counts 12 emails down to 1,
// and a sign-off. One source, designed for landscape and vertical. Brand: the neutral pack (Oriel is fictional).
// Brief: series/studies/briefs/kinetic-poster.json · prompt: series/studies/prompts/kinetic-poster.prompt.md
//
// The whole film is one continuous function paint(F) of a (fractional) frame F, so motion blur can sample
// inside the shutter; the shots only name the sections.
import PACK from "../../../brand/packs/studio/pack.json";
import type { Ctx, Env } from "../core";
import type { Film, Shot } from "../film";
import { motionBlur } from "../kit/blur";
import { clamp, ease, lerp, prog, spring, window01 } from "../kit/motion";
import { usePack } from "../kit/pack";
import { beatScore } from "../kit/score";
import { layout, type Size } from "../kit/sizes";
import { letters, measure, text, type TextOpts } from "../kit/type";

const P = usePack(PACK),
  C = P.palette("signal"),
  F_ = P.face;
const FPS = 60,
  BPM = 120,
  N = 720; // a beat is 30 frames, a bar 120
// the timeline, in frames (every cut on a beat)
const T = {
  one: 60,
  hour: 120,
  stack: 180,
  zoom: 240,
  marquee: 300,
  ask: 420,
  match: 450,
  book: 480,
  recap: 510,
  line: 540,
  sign: 660,
};
const SECTIONS: [number, string][] = [
  [0, "01 FIND"],
  [T.one, "02 ONE HOUR"],
  [T.stack, "03 STACK"],
  [T.marquee, "04 MARQUEE"],
  [T.ask, "05 ASK"],
  [T.match, "06 MATCH"],
  [T.book, "07 BOOK"],
  [T.recap, "08 ALL THREE"],
  [T.line, "09 TWELVE TO ONE"],
  [T.sign, "10 ORIEL"],
];
// the counter: 12 back-and-forth emails tick down to 1 invite, fast then slowing (ticks on exact frames)
const TICKS = Array.from({ length: 11 }, (_, k) => 588 + Math.round(52 * ((k + 1) / 11) ** 1.6));

type Face = { family: string; weight: number; track: number };
const SANS: Face = { family: F_.sans, weight: 800, track: -0.05 },
  ITAL: Face = { family: F_.italic, weight: 400, track: -0.01 },
  MONO: Face = { family: F_.mono, weight: 500, track: 0.08 };
const opt = (f: Face, size: number, color = C.ink, align: CanvasTextAlign = "left"): TextOpts => ({
  size,
  family: f.family,
  weight: f.weight,
  track: f.track,
  color,
  align,
});
type Ink = { fill?: string; stroke?: string; lw?: number; fillFrac?: number };
type Glyph = { dx?: number; dy?: number; skew?: number; sx?: number; sy?: number; ink: Ink } | null;
type Slot = { x: number; base: number; size: number };

const setFont = (ctx: Ctx, f: Face, size: number, track = 0) => {
  ctx.font = `${f.weight} ${size}px "${f.family}"`;
  (ctx as Ctx & { letterSpacing: string }).letterSpacing = `${track * size}px`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
};
const lerpSlot = (a: Slot, b: Slot, t: number): Slot => ({
  x: lerp(a.x, b.x, t),
  base: lerp(a.base, b.base, t),
  size: lerp(a.size, b.size, t),
});
/** a drop that accelerates into its mark, stretched along the fall, then squashes and rings out */
const fallSquash = (f: number, dist: number, dur = 7) => {
  if (f < 0) return null;
  if (f < dur) {
    const t = f / dur;
    return { dy: -dist * (1 - t * t), sx: 1 - 0.12 * t, sy: 1 + 0.22 * t };
  }
  const tau = (f - dur) / FPS,
    q = Math.exp(-tau * 9) * Math.cos(tau * Math.PI * 2 * 3.2);
  return { dy: 0, sx: 1 + 0.2 * q, sy: 1 - 0.28 * q };
};

export function make(size: Size, id: string): Film {
  const L = layout(size),
    { W, H, u, cx, tall } = L;
  // the content box: inside the platform-safe margins, clear of the HUD's two bands
  // (shrunk about its centre by the largest push-in, 5 %, so a slow push never carries type out of the safe area)
  const PUSH = 1.05,
    cbY = (L.safe.top + H - L.safe.bottom) / 2,
    cbW = (W - 2 * L.safe.x) / PUSH,
    cbH = (H - L.safe.top - L.safe.bottom - 120 * u) / PUSH,
    CB = { x0: cx - cbW / 2, x1: cx + cbW / 2, top: cbY - cbH / 2, bot: cbY + cbH / 2 };

  // ---- measuring (every size is fitted to the box by the type's own metrics, never by guesses)
  const wOf = (ctx: Ctx, s: string, f: Face, sz = 100) => measure(ctx, s, opt(f, sz));
  const capOf = (ctx: Ctx, f: Face) => {
    ctx.save();
    setFont(ctx, f, 100);
    const a = ctx.measureText("H").actualBoundingBoxAscent / 100;
    ctx.restore();
    return a;
  };
  /** the x of each glyph in a string set with its tracking (the kit's letters() method) */
  const xs = (ctx: Ctx, s: string, f: Face, sz: number) =>
    [...s].map((_, i) => (i ? measure(ctx, s.slice(0, i), opt(f, sz)) + f.track * sz : 0));
  const glyph = (ctx: Ctx, ch: string, x: number, y: number, f: Face, sz: number, ink: Ink) => {
    ctx.save();
    setFont(ctx, f, sz);
    if (ink.stroke) {
      ctx.strokeStyle = ink.stroke;
      ctx.lineWidth = ink.lw ?? sz * 0.022;
      ctx.lineJoin = "round";
      ctx.strokeText(ch, x, y);
    }
    const fr = ink.fillFrac ?? 1;
    if (ink.fill && fr > 0) {
      if (fr < 1) {
        // the fill rises from the baseline like ink up a stencil
        const top = y - sz * 0.76,
          bot = y + sz * 0.02,
          yy = lerp(bot, top, fr);
        ctx.beginPath();
        ctx.rect(x - sz, yy, sz * 3, bot - yy + 1);
        ctx.clip();
      }
      ctx.fillStyle = ink.fill;
      ctx.fillText(ch, x, y);
    }
    ctx.restore();
  };
  /** a word drawn glyph by glyph; per(i) moves, leans, squashes and inks each one (null hides it) */
  const word = (ctx: Ctx, s: string, x: number, base: number, f: Face, sz: number, per: (i: number) => Glyph) => {
    const gx = xs(ctx, s, f, sz),
      total = wOf(ctx, s, f, sz);
    [...s].forEach((ch, i) => {
      const g = per(i);
      if (!g) return;
      const gw = (i < s.length - 1 ? gx[i + 1]! : total + f.track * sz) - gx[i]!;
      ctx.save();
      ctx.translate(x + gx[i]! + gw / 2 + (g.dx ?? 0), base + (g.dy ?? 0));
      if (g.skew) ctx.transform(1, 0, g.skew, 1, 0, 0);
      ctx.scale(g.sx ?? 1, g.sy ?? 1);
      glyph(ctx, ch, -gw / 2, 0, f, sz, g.ink);
      ctx.restore();
    });
  };
  const dot = (ctx: Ctx, x: number, y: number, r: number, color = C.accent, sx = 1, sy = 1) => {
    if (r <= 0) return;
    ctx.save();
    ctx.translate(x, y + r); // squash about the dot's foot, where it lands
    ctx.scale(sx, sy);
    ctx.beginPath();
    ctx.arc(0, -r, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  };
  const outline = (ctx: Ctx, s: string, x: number, base: number, f: Face, sz: number, color: string, lw: number) => {
    ctx.save();
    setFont(ctx, f, sz, f.track);
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.lineJoin = "round";
    ctx.strokeText(s, x, base);
    ctx.restore();
  };
  const scaleAbout = (ctx: Ctx, k: number, x: number, y: number) => {
    ctx.translate(x, y);
    ctx.scale(k, k);
    ctx.translate(-x, -y);
  };
  const shearAbout = (ctx: Ctx, k: number, x: number, y: number) => {
    ctx.translate(x, y);
    ctx.transform(1, 0, k, 1, 0, 0);
    ctx.translate(-x, -y);
  };
  // a full stop that belongs to a word: a bold round dot, a little heavier than the face's own period
  const STOP_GAP = 0.05,
    STOP_R = 0.13; // × size, × cap
  const stopOf = (ctx: Ctx, s: string, f: Face, sl: Slot, cap: number) => {
    const r = STOP_R * cap * sl.size;
    return { x: sl.x + wOf(ctx, s, f, sl.size) + STOP_GAP * sl.size + r, y: sl.base - r, r };
  };

  // ---- per-size design: every layout is solved from the box, the metrics and a few ratios
  const geo = (ctx: Ctx) => {
    const cS = capOf(ctx, SANS),
      cI = capOf(ctx, ITAL),
      kI = cS / cI; // the italic is set larger so its capitals stand as tall as the sans
    const u1 = (s: string, f: Face) => wOf(ctx, s, f) / 100; // width at size 1
    const stopW = (cap: number) => STOP_GAP + 2 * STOP_R * cap; // a stop's width at size 1
    const wFIND = u1("FIND", SANS),
      wONE = u1("ONE", SANS),
      wHOUR = u1("HOUR", ITAL) + stopW(cI);

    // 01 hook: FIND alone, as big as the box allows
    const sH = Math.min(cbW / wFIND, (cbH * 0.62) / cS);
    const hook: Slot = { x: cx - (wFIND * sH) / 2, base: cbY + (cS * sH) / 2, size: sH };

    // 02 ONE HOUR: landscape runs FIND / ONE HOUR. on two lines; vertical stacks one word per line, larger
    const LEAD = 0.3;
    let B: [Slot, Slot, Slot];
    if (!tall) {
      const line2 = wONE + 0.24 + wHOUR * kI,
        s = Math.min(cbW / Math.max(wFIND, line2), (cbH * 0.9) / (cS * (2 + LEAD)));
      const bw = Math.max(wFIND, line2) * s,
        x0 = cx - bw / 2,
        b1 = cbY - (cS * s * (2 + LEAD)) / 2 + cS * s,
        b2 = b1 + cS * s * (1 + LEAD);
      B = [
        { x: x0, base: b1, size: s },
        { x: x0, base: b2, size: s },
        { x: x0 + (wONE + 0.24) * s, base: b2, size: s * kI },
      ];
    } else {
      const s = Math.min(cbW / Math.max(wFIND, wONE, wHOUR * kI), (cbH * 0.94) / (cS * (3 + 2 * LEAD)));
      const x0 = CB.x0,
        b1 = cbY - (cS * s * (3 + 2 * LEAD)) / 2 + cS * s;
      B = [0, 1, 2].map((k) => ({ x: x0, base: b1 + k * cS * s * (1 + LEAD), size: k === 2 ? s * kI : s })) as [
        Slot,
        Slot,
        Slot,
      ];
    }

    // a justified block: every word set to one width, stacked tight (03's block and 08's recap)
    const block = (ws: number[], caps: number[], maxH: number): Slot[] => {
      const GAP = 0.035,
        per = ws.reduce((a, w, k) => a + caps[k]! / w, 0) + GAP * (ws.length - 1),
        bw = Math.min(cbW, maxH / per),
        x0 = cx - bw / 2;
      let y = cbY - (bw * per) / 2;
      return ws.map((w, k) => {
        const sz = bw / w;
        y += caps[k]! * sz;
        const sl = { x: x0, base: y, size: sz };
        y += GAP * bw;
        return sl;
      });
    };
    const Cb = block([wFIND, wONE, wHOUR], [cS, cS, cI], cbH * 0.96) as [Slot, Slot, Slot];
    const wASK = u1("ASK", SANS),
      wMATCH = u1("MATCH", SANS),
      wBOOK = u1("BOOK", SANS);
    const recap = block([wASK, wMATCH, wBOOK + stopW(cS)], [cS, cS, cS], cbH * 0.9) as [Slot, Slot, Slot];

    // 05–07 cards: one word, centred, fitted, with a line of italic under it
    const card = (w: number) => {
      const sz = Math.min((cbW * 0.94) / w, (cbH * 0.58) / cS),
        subSize = (tall ? 62 : 58) * u,
        gap = 0.3 * cS * sz,
        hgt = cS * sz + gap + subSize * 0.75,
        base = cbY - hgt / 2 + cS * sz;
      return { x: cx - (w * sz) / 2, base, size: sz, sub: base + gap + subSize * 0.75, subSize };
    };
    const cards = [card(wASK), card(wMATCH), card(wBOOK + stopW(cS))]; // BOOK keeps its stop inside the box

    // 09 the line + the counter. Landscape: one line ASK · MATCH · BOOK. over a counter row; vertical: one word
    // per line, larger, the counter under it
    const GP = 0.28,
      DOT = 0.12; // gap around an interpunct (× size), interpunct radius (× cap)
    let line: [Slot, Slot, Slot], dots: { x: number; y: number; r: number }[];
    let counter: {
      xR: number;
      x0: number;
      base: number;
      size: number;
      label: { x: number; base: number; size: number };
    };
    const wDig = u1("12", SANS);
    if (!tall) {
      const ip = 2 * GP + 2 * DOT * cS,
        lw = wASK + wMATCH + wBOOK + 2 * ip + stopW(cS),
        s = cbW / lw,
        sC = s * 3,
        lab = sC * 0.19,
        hgt = cS * s + 0.6 * cS * s + cS * sC,
        x0 = CB.x0 + (cbW - lw * s) / 2,
        b = cbY - hgt / 2 + cS * s;
      let x = x0;
      line = [wASK, wMATCH, wBOOK].map((w) => {
        const sl = { x, base: b, size: s };
        x += (w + ip) * s;
        return sl;
      }) as [Slot, Slot, Slot];
      dots = [0, 1].map((k) => ({
        x: line[k]!.x + [wASK, wMATCH][k]! * s + (GP + DOT * cS) * s,
        y: b - cS * s * 0.5,
        r: DOT * cS * s,
      }));
      const cb = b + 0.6 * cS * s + cS * sC;
      counter = {
        xR: x0 + wDig * sC,
        x0,
        base: cb,
        size: sC,
        label: { x: x0 + wDig * sC + 0.14 * sC, base: cb, size: lab },
      };
    } else {
      const s = Math.min(cbW / Math.max(wASK, wMATCH, wBOOK + stopW(cS)), 400 * u),
        sC = s * 1.5,
        lab = 70 * u,
        hgt = cS * s * (3 + 2 * LEAD) + 0.55 * cS * s + cS * sC + lab * 1.35,
        b1 = cbY - hgt / 2 + cS * s;
      line = [0, 1, 2].map((k) => ({ x: CB.x0, base: b1 + k * cS * s * (1 + LEAD), size: s })) as [Slot, Slot, Slot];
      dots = [];
      const cb = line[2].base + 0.55 * cS * s + cS * sC;
      counter = {
        xR: CB.x0 + wDig * sC,
        x0: CB.x0,
        base: cb,
        size: sC,
        label: { x: CB.x0 + 6 * u, base: cb + lab * 1.35, size: lab },
      };
    }

    // 10 sign-off: the name as large as the box allows, the promise in small italic under it
    const wName = u1(P.product, SANS) + stopW(cS),
      sN = Math.min((cbW * 0.98) / wName, (cbH * 0.55) / cS),
      tagSize = (tall ? 60 : 54) * u,
      nh = cS * sN + 0.34 * cS * sN + tagSize * 0.7,
      name = { x: cx - (wName * sN) / 2, base: cbY - nh / 2 + cS * sN, size: sN, tag: cbY + nh / 2, tagSize };
    return { cS, cI, hook, B, Cb, recap, cards, line, dots, counter, name };
  };
  type Geo = ReturnType<typeof geo>;

  // ---- 01 FIND: letters slam in from the left and overshoot into place; a thin rule draws under the word
  const find = (ctx: Ctx, g: Geo, F: number, sl: Slot, color = C.ink) => {
    const gx = xs(ctx, "FIND", SANS, sl.size),
      // the leading letter (D) goes first, so the word stretches as it travels and compresses as it lands
      p = (i: number, f: number) => spring((f - (3 - i) * 2.5) / FPS, { freq: 2.3, damp: 0.58 }),
      d = -(sl.x + wOf(ctx, "FIND", SANS, sl.size) + 60 * u);
    word(ctx, "FIND", sl.x, sl.base, SANS, sl.size, (i) => {
      const dx = d * (1 - p(i, F)),
        v = d * (p(i, F - 1) - p(i, F)); // px per frame, + = moving right
      if (sl.x + gx[i]! + dx > W) return null;
      return { dx, skew: clamp(-v * 0.004, -0.45, 0.45), ink: { fill: color } };
    });
  };
  const rule = (ctx: Ctx, g: Geo, F: number, sl: Slot) => {
    const w = wOf(ctx, "FIND", SANS, sl.size),
      a = ease.inOutCubic(prog(F, 14, 44)),
      b = ease.inOutCubic(prog(F, T.one, T.one + 16));
    if (a <= b) return;
    ctx.fillStyle = C.ink;
    ctx.fillRect(sl.x + w * b, sl.base + 0.16 * g.cS * sl.size, w * (a - b), 7 * u);
  };
  const hookSection = (ctx: Ctx, g: Geo, F: number) => {
    ctx.save();
    scaleAbout(ctx, 1 + 0.035 * prog(F, 0, T.one), cx, cbY); // a slow push-in under the slam
    find(ctx, g, F, g.hook);
    rule(ctx, g, F, g.hook);
    ctx.restore();
  };

  // ---- 02 ONE drops in as outline letters that fill one by one; HOUR. follows in italic, its stop in blue
  const oneWord = (ctx: Ctx, F: number, sl: Slot, filled = false) =>
    word(ctx, "ONE", sl.x, sl.base, SANS, sl.size, (i) => {
      if (filled) return { ink: { fill: C.ink } };
      const fs = fallSquash(F - (T.one + 2 + i * 6), H * 0.8);
      if (!fs) return null;
      const fill = ease.inOutCubic(prog(F, T.one + 26 + i * 9, T.one + 44 + i * 9));
      return {
        dy: fs.dy,
        sx: fs.sx,
        sy: fs.sy,
        ink: { stroke: C.ink, lw: sl.size * 0.02, fill: C.ink, fillFrac: fill },
      };
    });
  const hourWord = (ctx: Ctx, g: Geo, F: number, sl: Slot, settled = false) => {
    const gx = xs(ctx, "HOUR", ITAL, sl.size),
      p = (i: number, f: number) => spring((f - T.hour - i * 2.5) / FPS, { freq: 2.3, damp: 0.62 });
    word(ctx, "HOUR", sl.x, sl.base, ITAL, sl.size, (i) => {
      if (settled) return { ink: { fill: C.ink } };
      const d = W - sl.x + 40 * u,
        dx = d * (1 - p(i, F)),
        v = d * (p(i, F - 1) - p(i, F));
      if (sl.x + gx[i]! + dx > W + 20 * u) return null;
      return { dx, skew: clamp(-v * 0.004, -0.45, 0.45), ink: { fill: C.ink } };
    });
    const st = stopOf(ctx, "HOUR", ITAL, sl, g.cI),
      fs = settled ? { dy: 0, sx: 1, sy: 1 } : fallSquash(F - (T.hour + 16), H * 0.7, 8);
    if (fs) dot(ctx, st.x, st.y + fs.dy, st.r, C.accent, fs.sx, fs.sy);
    return st;
  };
  const oneHourSection = (ctx: Ctx, g: Geo, F: number) => {
    const m = spring((F - T.one) / FPS, { freq: 2.2, damp: 0.78 });
    ctx.save();
    scaleAbout(ctx, 1 + 0.03 * prog(F, T.one, T.stack), cx, cbY);
    find(ctx, g, F, lerpSlot(g.hook, g.B[0], m));
    rule(ctx, g, F, lerpSlot(g.hook, g.B[0], m));
    oneWord(ctx, F, g.B[1]);
    if (F >= T.hour) hourWord(ctx, g, F, g.B[2]);
    ctx.restore();
  };

  // ---- 03 the three words shear and stack into a justified block; the camera flies through to the full stop
  const stackSection = (ctx: Ctx, g: Geo, F: number) => {
    const push = 1 + 0.03; // where 02's push-in left off
    const slots = [0, 1, 2].map((k) => {
      const lag = [0, 0, 10][k]!,
        t = ease.inOutCubic(prog(F, T.stack + lag, T.stack + 42 + lag)),
        sl = lerpSlot(g.B[k]!, g.Cb[k]!, t);
      // HOUR drops to its own line before it slides under ONE, so the two never collide on the way
      if (k === 2) sl.base = lerp(g.B[2].base, g.Cb[2].base, ease.inOutCubic(prog(F, T.stack, T.stack + 30)));
      return { sl, shear: -0.32 * Math.sin(Math.PI * t) };
    });
    const st = stopOf(ctx, "HOUR", ITAL, slots[2]!.sl, g.cI);
    // the fly-through: an exponential zoom about the stop, which itself glides to the centre and swells
    const z = ease.inCubic(prog(F, T.zoom + 2, T.zoom + 48)),
      k = Math.exp(Math.log(260) * z),
      glide = ease.inOutCubic(prog(F, T.zoom - 2, T.zoom + 44));
    const settle = 1 + 0.02 * ease.outCubic(prog(F, T.stack + 40, T.zoom)); // the block keeps breathing in
    // the stop's place on screen after the push, then carried to the centre
    const sx0 = cx + (st.x - cx) * push * settle,
      sy0 = cbY + (st.y - cbY) * push * settle,
      ax = lerp(sx0, cx, glide),
      ay = lerp(sy0, H / 2, glide);
    if (k < 60) {
      ctx.save();
      ctx.translate(ax, ay);
      ctx.scale(k, k);
      ctx.translate(-sx0, -sy0);
      scaleAbout(ctx, push * settle, cx, cbY);
      const draw = (sw: string, f: Face, i: number) => {
        const { sl, shear } = slots[i]!,
          w = wOf(ctx, sw, f, sl.size);
        ctx.save();
        shearAbout(ctx, shear, sl.x + w / 2, sl.base);
        text(ctx, sw, sl.x, sl.base, opt(f, sl.size));
        ctx.restore();
      };
      draw("FIND", SANS, 0);
      draw("ONE", SANS, 1);
      draw("HOUR", ITAL, 2);
      ctx.restore();
    }
    const grow = lerp(push * settle, 2.8, ease.inOutCubic(prog(F, T.zoom, T.zoom + 50))),
      breathe = 1 + 0.06 * Math.sin((F - T.zoom) / 5) * prog(F, T.zoom + 40, T.zoom + 52);
    dot(ctx, ax, ay, st.r * grow * breathe);
  };

  // ---- 04 marquee: five rows of the same line, alternating direction, solid and outline interleaved
  const PHRASE = "NO MORE BACK AND FORTH";
  const marqueeSection = (ctx: Ctx, g: Geo, F: number) => {
    const top = L.safe.top,
      bot = H - L.safe.bottom,
      pitch = (bot - top) / 5,
      sz = (pitch * 0.8) / g.cS,
      cap = g.cS * sz,
      pw = wOf(ctx, PHRASE, SANS, sz),
      gap = 0.3 * sz,
      r = 0.13 * cap,
      unit = pw + 2 * gap + 2 * r,
      v = (tall ? 7 : 8) * u;
    // the stop from 03 shrinks away under the incoming rows
    const r0 = STOP_R * g.cI * g.Cb[2].size * 2.8 * (1 - ease.inCubic(prog(F, T.marquee, T.marquee + 12)));
    dot(ctx, cx, H / 2, r0);
    for (let i = 0; i < 5; i++) {
      const dir = i % 2 ? -1 : 1,
        base = top + pitch * i + pitch / 2 + cap / 2,
        enter = -dir * W * 1.3 * (1 - spring((F - T.marquee - 3 * i) / FPS, { freq: 1.8, damp: 0.8 })),
        leave = dir * W * 1.4 * ease.inCubic(prog(F, T.ask - 22 + 3 * (4 - i), T.ask - 2 + 3 * (4 - i) * 0.3)),
        off = dir * v * (F - T.marquee) + i * unit * 0.37 + enter + leave;
      const solid = i % 2 === 0,
        color = i === 2 ? C.surface : C.ink;
      let x = (((off % unit) + unit) % unit) - unit;
      for (; x < W; x += unit) {
        if (solid) text(ctx, PHRASE, x, base, opt(SANS, sz, color));
        else outline(ctx, PHRASE, x, base, SANS, sz, C.ink, Math.max(3 * u, sz * 0.03));
        dot(ctx, x + pw + gap + r, base - 2 * r, r);
      }
    }
  };

  // ---- 05–07 colour-flash cards: a hard cut on each beat, one word landing with a squash
  const CARDS = [
    { at: T.ask, bg: C.accent, fg: C.surface, w: "ASK", sub: "ask everyone once" },
    { at: T.match, bg: C.ink, fg: C.ground, w: "MATCH", sub: "match every calendar" },
    { at: T.book, bg: C.surface, fg: C.ink, w: "BOOK", sub: "book the hour that fits" },
  ];
  const cardSection = (ctx: Ctx, g: Geo, F: number, i: number) => {
    const c = CARDS[i]!,
      d = g.cards[i]!,
      f = F - c.at;
    ctx.fillStyle = c.bg;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    scaleAbout(ctx, 1 + 0.04 * prog(f, 0, 30), cx, cbY);
    const fs = fallSquash(f, H * 0.75, 7);
    if (fs) {
      ctx.save();
      ctx.translate(cx, d.base + fs.dy);
      ctx.scale(fs.sx, fs.sy);
      ctx.translate(-cx, -d.base);
      text(ctx, c.w, d.x, d.base, opt(SANS, d.size, c.fg));
      if (i === 2) {
        // BOOK is the one that closes the deal: it keeps a blue full stop
        const st = stopOf(ctx, c.w, SANS, d, g.cS);
        dot(ctx, st.x, st.y, st.r * ease.outBack(prog(f, 8, 16)));
      }
      ctx.restore();
    }
    const a = ease.outCubic(prog(f, 9, 20));
    text(ctx, c.sub, cx, d.sub + (1 - a) * 24 * u, {
      size: d.subSize,
      family: ITAL.family,
      color: c.fg,
      align: "center",
      alpha: a,
    });
    ctx.restore();
  };

  // ---- 08 all three, back on the orange: a justified stack in their card colours, slammed in from the sides
  const RECAP_INK = [C.accent, C.ink, C.surface];
  const RECAP = ["ASK", "MATCH", "BOOK"];
  const recapX = (k: number, F: number) =>
    (k % 2 ? 1 : -1) * W * 1.1 * (1 - spring((F - T.recap - 4 * k) / FPS, { freq: 2.4, damp: 0.66 }));

  // ---- 09 the three words fly into one line that settles; a counter ticks 12 → 1 beside it
  const flight = (k: number, F: number) => spring((F - T.line - 4 * k) / FPS, { freq: 1.9, damp: 0.8 });
  const lineSection = (ctx: Ctx, g: Geo, F: number) => {
    const inRecap = F < T.line;
    ctx.save();
    scaleAbout(ctx, 1 + (inRecap ? 0.03 * prog(F, T.recap, T.line) : 0.03 * prog(F, T.line + 50, T.sign)), cx, cbY);
    RECAP.forEach((s, k) => {
      const t = inRecap ? 0 : flight(k, F),
        sl = lerpSlot(g.recap[k]!, g.line[k]!, t),
        dx = inRecap ? recapX(k, F) : 0,
        v = inRecap ? recapX(k, F) - recapX(k, F - 1) : lerpSlot(g.recap[k]!, g.line[k]!, flight(k, F - 1)).x - sl.x;
      const color = t < 0.5 ? RECAP_INK[k]! : C.ink, // a hard switch mid-flight, hidden in the blur
        w = wOf(ctx, s, SANS, sl.size),
        lean = inRecap ? clamp(-v * 0.004, -0.4, 0.4) : clamp(v * 0.004, -0.4, 0.4);
      ctx.save();
      ctx.translate(dx, 0);
      shearAbout(ctx, lean, sl.x + w / 2, sl.base);
      text(ctx, s, sl.x, sl.base, opt(SANS, sl.size, color));
      if (k === 2) {
        const st = stopOf(ctx, s, SANS, sl, g.cS);
        dot(ctx, st.x, st.y, st.r);
      }
      ctx.restore();
    });
    if (!inRecap) {
      // interpuncts pop in between the words once they have landed (landscape: the words share a line)
      g.dots.forEach((d, k) => {
        const s = spring((F - (T.line + 24 + 6 * k)) / FPS, { freq: 3, damp: 0.45 });
        dot(ctx, d.x, d.y, d.r * s);
      });
      counterDraw(ctx, g, F);
    }
    ctx.restore();
  };
  const counterDraw = (ctx: Ctx, g: Geo, F: number) => {
    const c = g.counter,
      cap = g.cS * c.size,
      appear = ease.outCubic(prog(F, T.line + 36, T.line + 52));
    if (appear <= 0) return;
    const n = 12 - TICKS.filter((t) => F >= t).length,
      last = [...TICKS].reverse().find((t) => F >= t);
    // a thin rule: the line above, the count below
    const rl = ease.inOutCubic(prog(F, T.line + 30, T.line + 56));
    ctx.fillStyle = C.ink;
    const ry = c.base - cap - (tall ? 0.28 : 0.3) * g.cS * g.line[0].size;
    ctx.fillRect(c.x0, ry, (tall ? cbW : g.line[2].x + wOf(ctx, "BOOK", SANS, g.line[2].size) - c.x0) * rl, 4 * u);
    // each tick is a hard swap with a small pop (a sliding outline digit smears into stripes under the blur)
    const s = String(n),
      w = wOf(ctx, s, SANS, c.size),
      x = tall ? c.x0 : c.xR - w,
      pop = last === undefined ? 1 : 1 + 0.07 * (1 - ease.outCubic(prog(F, last, last + 6))),
      fs = n === 1 ? (fallSquash(F - (TICKS[10]! - 7), 0) ?? { sx: 1, sy: 1 }) : { sx: pop, sy: pop };
    ctx.save();
    ctx.beginPath();
    ctx.rect(c.x0 - 40 * u, c.base - cap * 1.3, cbW + 80 * u, cap * 1.3 + 4 * u);
    ctx.clip(); // the first number rises out of the rule's shadow
    ctx.translate(x + w / 2, c.base + (1 - appear) * cap * 1.3);
    ctx.scale(fs.sx, fs.sy);
    ctx.translate(-(x + w / 2), -c.base);
    if (n === 1) text(ctx, s, x, c.base, opt(SANS, c.size, C.accent));
    else outline(ctx, s, x, c.base, SANS, c.size, C.ink, Math.max(3 * u, c.size * 0.028));
    ctx.restore();
    // the label: emails while counting, then the one thing that replaces them
    // (in sequence: the old line leaves before the new one arrives, so the two never overprint)
    const out = ease.inCubic(prog(F, TICKS[10]!, TICKS[10]! + 5)),
      inn = ease.outCubic(prog(F, TICKS[10]! + 5, TICKS[10]! + 14)),
      lb = c.label;
    const lab = (s: string, a: number, dy: number) =>
      text(ctx, s, lb.x, lb.base + dy, { size: lb.size, family: ITAL.family, color: C.ink, alpha: a * appear });
    lab("back-and-forth emails", 1 - out, -out * 24 * u);
    lab("invite, booked.", inn, (1 - inn) * 24 * u);
  };

  // ---- 10 sign-off: the name, huge, on the orange; the promise in small italic under it
  const signSection = (ctx: Ctx, g: Geo, F: number) => {
    const n = g.name,
      f = F - T.sign;
    ctx.save();
    scaleAbout(ctx, 1 + 0.05 * prog(F, T.sign, N), cx, cbY);
    letters(
      ctx,
      P.product,
      n.x,
      n.base,
      opt(SANS, n.size),
      (i) => spring((f - i * 2.5) / FPS, { freq: 2.4, damp: 0.72 }),
      "rise",
    );
    const st = stopOf(ctx, P.product, SANS, n, g.cS),
      fs = fallSquash(f - 12, H * 0.6, 8);
    if (fs) dot(ctx, st.x, st.y + fs.dy, st.r, C.accent, fs.sx, fs.sy);
    const a = ease.outCubic(prog(f, 22, 40));
    text(ctx, "find a time that works for everyone", cx, n.tag + (1 - a) * 18 * u, {
      size: n.tagSize,
      family: ITAL.family,
      color: C.ink,
      align: "center",
      alpha: a,
    });
    ctx.restore();
  };

  // ---- the HUD: small mono labels in the corners; the poster's fine print (hidden while the marquee runs)
  const groundAt = (F: number) =>
    F >= T.ask && F < T.match
      ? C.accent
      : F >= T.match && F < T.book
        ? C.ink
        : F >= T.book && F < T.recap
          ? C.surface
          : C.ground;
  const hud = (ctx: Ctx, F: number) => {
    const a = prog(F, 4, 20) * (1 - window01(F, T.marquee - 6, T.marquee, T.ask - 1, T.ask)),
      g = groundAt(F),
      color = g === C.accent || g === C.ink ? C.surface : C.ink;
    if (a <= 0) return;
    const section = [...SECTIONS].reverse().find(([s]) => F >= s)![1],
      secs = Math.floor(F / FPS),
      fr = Math.floor(F % FPS);
    const m = (s: string, x: number, y: number, align: CanvasTextAlign = "left") =>
      text(ctx, s, x, y, { ...opt(MONO, 22 * u, color, align), alpha: a });
    const top = L.safe.top + 16 * u,
      bot = H - L.safe.bottom;
    m(P.product.toUpperCase(), L.safe.x, top);
    m(tall ? "N°06" : "KINETIC POSTER · N°06", W - L.safe.x, top, "right");
    m(section, L.safe.x, bot);
    m(`00:${String(secs).padStart(2, "0")}:${String(fr).padStart(2, "0")}`, W - L.safe.x, bot, "right");
  };

  const paint = (ctx: Ctx, env: Env, F: number) => {
    F = clamp(F, 0, N - 1);
    ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
    ctx.fillStyle = C.ground;
    ctx.fillRect(0, 0, W, H);
    const g = geo(ctx);
    if (F < T.one) hookSection(ctx, g, F);
    else if (F < T.stack) oneHourSection(ctx, g, F);
    else if (F < T.marquee) stackSection(ctx, g, F);
    else if (F < T.ask) marqueeSection(ctx, g, F);
    else if (F < T.recap) cardSection(ctx, g, F, F < T.match ? 0 : F < T.book ? 1 : 2);
    else if (F < T.sign) lineSection(ctx, g, F);
    else signSection(ctx, g, F);
  };
  // each colour card is its own shot, so the blur's shutter never mixes one card's colour into the next
  const cuts = [0, T.one, T.stack, T.marquee, T.ask, T.match, T.book, T.recap, T.sign, N],
    names = ["find", "one-hour", "stack", "marquee", "ask", "match", "book", "line", "signoff"];
  const shots: Shot[] = names.map((sid, i) => ({
    id: sid,
    start: cuts[i]!,
    end: cuts[i + 1]!,
    draw: (ctx, local, env) => {
      // a hard cut must not smear the previous shot into the new one: the shutter stays inside the shot
      const F = cuts[i]! + local;
      motionBlur(ctx, env, (c, dt) => paint(c, env, Math.max(cuts[i]!, Math.min(cuts[i + 1]! - 0.01, F + dt))), {
        samples: 5,
        shutter: 0.5,
      });
      ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
      hud(ctx, F);
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
      drop: T.one,
      hits: [8, T.one + 9, T.hour + 8, T.ask, T.match, T.book, T.recap, TICKS[10]!],
      whooshes: [T.stack, T.marquee, T.line, T.sign],
      ticks: [T.hour + 24, T.line + 26, T.line + 32, ...TICKS.slice(0, 10)],
      sign: T.sign + 14,
      gain: 0.7, // about −16 LUFS with this many hits
    }),
  };
}

export const kineticPoster = make("landscape", "kineticPoster");
export const kineticPosterVertical = make("vertical", "kineticPosterVertical");
