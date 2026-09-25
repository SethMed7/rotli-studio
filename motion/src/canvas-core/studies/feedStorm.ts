// STUDY 18 · FEED STORM (23 s, 30 fps, 120 bpm). A notification feed as weather: one ping drops in, then
// message bubbles rain into an inbox faster and faster while the column scrolls under motion blur and a counter
// climbs to 47. Everything freezes; one calm cursor sweeps down the feed and 44 bubbles fold into a thin stack
// labelled "handled"; the three that matter slide together into one decision card; the cursor taps a time and the
// card turns calm. One alarm colour (the pack's accent), one calm colour (accent2). Oriel is a fictional product.
// Brief: series/studies/briefs/feed-storm.json · prompt: series/studies/prompts/feed-storm.prompt.md
//
// The whole film is one continuous function paint(F) of a (fractional) frame F: every bubble's place is a
// closed-form sum of springs over fixed arrival and fold schedules, so motion blur can sample inside the shutter.
// Two layers: the WORLD (rain, the inbox, the card, the sign-off) under one slow push-in, blurred; captions and
// the cursor in SCREEN space on top, sharp.
import PACK from "../../../brand/packs/studio/pack.json";
import { rng, type Ctx, type Env } from "../core";
import type { Film, Shot } from "../film";
import { motionBlur } from "../kit/blur";
import { ladder, w, type Word } from "../kit/captions";
import { clamp, ease, lerp, prog, spring } from "../kit/motion";
import { usePack } from "../kit/pack";
import { beatScore } from "../kit/score";
import { layout, type Size } from "../kit/sizes";
import { letters, measure, text } from "../kit/type";
import { card, check, rr } from "../kit/ui";

const P = usePack(PACK),
  C = P.palette("slate"),
  F_ = P.face;
const FPS = 30,
  BPM = 120,
  N = 690; // a beat is 15 frames, a bar 60
// the timeline, in frames (every cut on a beat)
const T = { storm: 60, freeze: 240, gather: 390, decide: 540, sign: 630 };
const CUE = { sweep: 258, tidy: 354, card: 426, tap: 570 };

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a: string, b: string, t: number) => {
  const A = hex(a),
    B = hex(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i]! - v) * clamp(t))).join(",")})`;
};
const rgba = (h: string, a: number) => `rgba(${hex(h).join(",")},${a})`;
const ALARM = C.accent,
  CALM = C.accent2,
  CALM_INK = mix(C.accent2, C.ink, 0.35), // calm dark enough to read as type on the light ground
  TAU = Math.PI * 2;

// ---- the feed: 47 invented messages in arrival order (first names only); three of them are the decision
const MSGS: [string, string][] = [
  ["Ada", "can we move it?"],
  ["Ben", "what time works?"],
  ["Cy", "I'm out Tue"],
  ["Dee", "sorry, conflict"],
  ["Eli", "Wed is packed"],
  ["Fay", "+1 on moving it"],
  ["Gus", "mornings are rough"],
  ["Ben", "Thu 15:00 works"],
  ["Hana", "who's running this?"],
  ["Ivo", "can't do Mon"],
  ["Dee", "is it still Tue?"],
  ["Jo", "pushing it again?"],
  ["Kit", "I'm travelling Wed"],
  ["Eli", "any update?"],
  ["Lu", "which room?"],
  ["Fay", "sorry, late reply"],
  ["Gus", "can it be shorter?"],
  ["Hana", "adding Sam"],
  ["Ivo", "what's the agenda?"],
  ["Jo", "I'm out Tue too"],
  ["Kit", "lunch clash"],
  ["Lu", "can we do async?"],
  ["Dee", "sorry, conflict"],
  ["Eli", "?"],
  ["Fay", "ping"],
  ["Gus", "bump"],
  ["Hana", "any time Thu?"],
  ["Ivo", "not Fri pm"],
  ["Jo", "who's in?"],
  ["Kit", "reschedule?"],
  ["Cy", "Fri 10:00 is open"],
  ["Lu", "still waiting"],
  ["Dee", "moving my 1:1"],
  ["Eli", "can't do 9"],
  ["Fay", "what time works?"],
  ["Gus", "sorry, conflict"],
  ["Hana", "bump"],
  ["Ivo", "?"],
  ["Jo", "I'm out Tue"],
  ["Kit", "any news?"],
  ["Lu", "ping"],
  ["Eli", "does 4 work?"],
  ["Fay", "not Wed"],
  ["Gus", "what time works?"],
  ["Hana", "running late"],
  ["Ivo", "bump"],
  ["Jo", "??"],
];
const NM = MSGS.length; // 47
const KEEP = [30, 7, 0]; // in feed order (top to bottom once the storm stops): Cy, Ben, Ada
const kept = (k: number) => KEEP.includes(k);
// arrivals: the hook's one ping, then 46 more from the storm's first beat, the gaps shrinking from a beat to ~2 frames
const ARRIVE: number[] = (() => {
  const a = [9];
  let t = T.storm;
  for (let k = 1; k < NM; k++) {
    a.push(t);
    t += Math.max(1.7, 15 * 0.885 ** (k - 1));
  }
  return a;
})();
const RANK: number[] = (() => {
  // each handled message's place in the "handled" stack (in sweep order)
  const r: number[] = [];
  let n = 0;
  for (let o = 0; o < NM; o++) r[NM - 1 - o] = kept(NM - 1 - o) ? -1 : n++;
  return r;
})();
// the rain: small alarm pings with grey streaks, thicker and faster as the storm builds; they freeze at T.freeze
const DROPS = (() => {
  const r = rng(18),
    out: { x: number; s: number; v: number; ping: boolean }[] = [];
  for (let i = 0; i < 90; i++) {
    const s = 26 + 200 * Math.sqrt(r());
    out.push({ x: r(), s, v: 18 + 26 * prog(s, 40, 220) + 8 * r(), ping: r() < 0.55 });
  }
  return out;
})();
// the pops: one per arrival while they are a beat apart, then thinned so the storm does not become a buzz
const POPS = (() => {
  const out: number[] = [];
  for (const a of ARRIVE) if (!out.length || a - out[out.length - 1]! >= 5) out.push(Math.round(a));
  return out;
})();

export function make(size: Size, id: string): Film {
  const L = layout(size),
    { W, H, u, cx, cy, tall } = L;
  // ---- per-size design: vertical stacks captions / inbox / card; landscape runs the feed on the left third
  const D = tall
    ? {
        panel: { x: 100 * u, y: 640 * u, w: 880 * u, h: 960 * u },
        compactH: 380 * u,
        card: { x: 100 * u, y: 1070 * u, w: 880 * u, h: 470 * u },
        capX: 100 * u,
        capY: [250 * u, 250 * u, 250 * u, 250 * u],
        capSize: 92 * u,
        msg: 34 * u,
        lanes: [[640 * u, 1040 * u]] as [number, number][],
        rainTo: 640 * u,
        title: 46 * u,
        mark: 200 * u,
      }
    : {
        panel: { x: 90 * u, y: 70 * u, w: 560 * u, h: 940 * u },
        compactH: 940 * u,
        card: { x: 780 * u, y: 520 * u, w: 1000 * u, h: 410 * u },
        capX: 780 * u,
        capY: [340 * u, 340 * u, 130 * u, 130 * u],
        capSize: 104 * u,
        msg: 28 * u,
        lanes: [[1440 * u, 1880 * u]] as [number, number][],
        rainTo: H,
        title: 50 * u,
        mark: 220 * u,
      };
  const HEAD = 112 * u,
    PITCH = (tall ? 130 : 118) * u,
    BH = (tall ? 110 : 98) * u,
    AV = 25 * u,
    LABEL = 44 * u,
    SP = 5 * u, // a folded sliver's pitch in the handled stack
    SP2 = 4 * u; // ...once the stack settles
  const pan = D.panel,
    contentTop = pan.y + HEAD + 18 * u,
    padX = 28 * u,
    avX = pan.x + padX + AV,
    bubX = pan.x + padX + 2 * AV + 16 * u,
    bubMax = pan.w - (bubX - pan.x) - 64 * u,
    dotX = pan.x + pan.w - 34 * u,
    fullW = pan.w - 2 * padX;
  const nameO = { size: (tall ? 25 : 23) * u, family: F_.sans, weight: 600, color: C.muted, track: -0.005 };
  const msgO = { size: D.msg, family: F_.sans, weight: 400, color: C.ink, track: -0.01 };
  const widthOf = new Map<number, number>();
  const bw = (ctx: Ctx, k: number) => {
    let v = widthOf.get(k);
    if (v === undefined) {
      v = Math.min(bubMax, Math.max(measure(ctx, MSGS[k]![0], nameO), measure(ctx, MSGS[k]![1], msgO)) + 48 * u);
      widthOf.set(k, v);
    }
    return v;
  };

  const dot = (ctx: Ctx, x: number, y: number, r: number, color: string) => {
    if (r <= 0) return;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fillStyle = color;
    ctx.fill();
  };
  const ring = (ctx: Ctx, x: number, y: number, r: number, lw: number, color: string, a: number) => {
    if (a <= 0) return;
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.stroke();
    ctx.restore();
  };
  const avatar = (ctx: Ctx, x: number, y: number, r: number, k: number, fill = C.line) => {
    if (r <= 0.5) return;
    dot(ctx, x, y, r, fill);
    text(ctx, MSGS[k]![0][0]!, x, y + r * 0.36, {
      size: r * 1.02,
      family: F_.sans,
      weight: 600,
      color: C.ink,
      align: "center",
    });
  };
  // one message bubble at (x, y) top-left; fold 0..1 squashes it into a sliver; lift 0..1 turns it into a floating
  // white card (for when it leaves the inbox); pin 0..1 marks it with the calm colour
  const bubble = (
    ctx: Ctx,
    k: number,
    x: number,
    y: number,
    o: { fold?: number; lift?: number; pin?: number; a?: number },
  ) => {
    const f = o.fold ?? 0,
      lift = o.lift ?? 0,
      pin = o.pin ?? 0,
      w0 = bw(ctx, k),
      ef = ease.inOutCubic(f),
      h = lerp(BH, 2 * u, ef),
      bx = lerp(x, pan.x + padX, ef),
      ww = lerp(w0, fullW, ef),
      by = y + lerp(BH / 2, SP / 2, ef) - h / 2; // it shrinks toward its slot in the handled stack
    ctx.save();
    ctx.globalAlpha *= o.a ?? 1;
    // the avatar folds away first
    avatar(ctx, x - (bubX - avX), y + BH / 2, AV * (1 - clamp(f * 2)), k);
    card(ctx, bx, by, ww, h, {
      r: Math.min(26 * u, h / 2),
      fill: f > 0 ? mix(C.ground, mix(C.line, C.muted, 0.3), f) : mix(C.ground, C.surface, lift),
      shadow: lift > 0 ? { blur: 40 * u * lift, y: 14 * u * lift, color: rgba(C.ink, 0.12 * lift) } : undefined,
      stroke: pin > 0 ? rgba(CALM, pin) : undefined,
      lw: 3 * u,
    });
    const ta = 1 - clamp(f * 3);
    if (ta > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(bx, by, ww, h);
      ctx.clip();
      text(ctx, MSGS[k]![0], x + 24 * u, y + BH * 0.38, { ...nameO, alpha: ta });
      text(ctx, MSGS[k]![1], x + 24 * u, y + BH * 0.78, { ...msgO, alpha: ta });
      ctx.restore();
    }
    ctx.restore();
  };

  // ---- schedules as functions of F
  // the sweep, in feed order o (0 = top; order o holds message 46 − o). The cursor folds the bubbles in view one by
  // one, slowing down; everything below the fold was handled out of sight and rises in already folded, so the
  // column relaxes instead of racing; the cursor then runs down it and pins the three that need a person.
  const VIS = tall ? 6 : 7,
    PIN = [318, 336, 350];
  const FOLD: number[] = Array.from({ length: NM }, (_, o) =>
    o < VIS
      ? CUE.sweep + 46 * (o / (VIS - 1)) ** 1.3
      : kept(NM - 1 - o)
        ? PIN[KEEP.indexOf(NM - 1 - o)]!
        : 254 + (o - VIS) * 0.5,
  );
  // where the cursor is along the feed (fractional order) over time
  const PATH: [number, number][] = [
    ...Array.from({ length: VIS }, (_, o) => [FOLD[o]! + 3, o] as [number, number]),
    ...KEEP.map((k, q) => [PIN[q]!, NM - 1 - k] as [number, number]),
  ];
  const front = (F: number) => {
    if (F <= PATH[0]![0]) return 0;
    for (let i = 1; i < PATH.length; i++) {
      const [t1, o1] = PATH[i]!,
        [t0, o0] = PATH[i - 1]!;
      if (F <= t1) return lerp(o0, o1, ease.inOutCubic(prog(F, t0, t1)));
    }
    return NM - 1;
  };
  const arrived = (F: number) => ARRIVE.filter((a) => a <= F).length;
  // the count reads evenly (it is what Oriel has handled, seen or not), fast at first, then settling
  const folded = (F: number) => Math.floor(44 * (1 - (1 - prog(F, 260, 352)) ** 1.7));
  // numbers are read, so they change on whole frames only (not inside the blur's shutter)
  let shown = 0;
  const counter = (F: number): { n: number; since: number } => {
    if (F < 250) {
      const n = arrived(F);
      return { n, since: n ? F - ARRIVE[n - 1]! : 99 };
    }
    if (F < T.gather) {
      const n = folded(F);
      let since = 99;
      for (let d = 0; d < 12; d++)
        if (folded(F - d - 1) < n) {
          since = d + F - Math.floor(F);
          break;
        }
      return { n: NM - n, since };
    }
    return F < 440 ? { n: 3, since: 99 } : { n: 1, since: F - 440 };
  };
  const spr = (t: number) => spring(t / FPS, { freq: 3.4, damp: 0.78 });
  const foldOf = (o: number, F: number) => (kept(NM - 1 - o) ? 0 : prog(F, FOLD[o]!, FOLD[o]! + 11));
  const colTopAt = (F: number) => contentTop + LABEL * ease.inOutCubic(prog(F, 248, 262));
  const stackTop = contentTop + LABEL;
  const tidy = (F: number) => ease.inOutCubic(prog(F, CUE.tidy, CUE.tidy + 30));
  const keptHome = (q: number) => stackTop + 44 * SP + 26 * u + q * PITCH; // where each kept bubble waits
  // the y of feed order o (0 = top) during the sweep: an accordion of full bubbles and slivers
  const accordion = (F: number) => {
    const ys: number[] = [],
      top = colTopAt(F);
    let y = top;
    for (let o = 0; o < NM; o++) {
      ys.push(y);
      y += kept(NM - 1 - o) ? PITCH : lerp(PITCH, SP, ease.inOutCubic(foldOf(o, F)));
    }
    return ys;
  };

  // ---- the rain (world space, behind the inbox)
  const rain = (ctx: Ctx, F: number) => {
    const Fz = Math.min(F, T.freeze),
      fade = 1 - prog(F, T.freeze + 4, T.freeze + 30);
    if (fade <= 0) return;
    const wind = 0.22 + 0.25 * prog(F, 60, 230);
    for (const d of DROPS) {
      const t = Fz - d.s;
      if (t < 0) continue;
      const v = d.v * u,
        y = -60 * u + t * v;
      if (y > D.rainTo + 40 * u) continue;
      const [a, b] = D.lanes[0]!,
        x = a + d.x * (b - a) - t * v * wind * 0.3,
        len = v * 2.6;
      ctx.save();
      ctx.globalAlpha *= fade * clamp(t / 3);
      ctx.strokeStyle = rgba(C.muted, 0.32);
      ctx.lineWidth = 3 * u;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x + len * wind * 0.3, y - len);
      ctx.lineTo(x, y);
      ctx.stroke();
      if (d.ping) dot(ctx, x, y, 7 * u, ALARM);
      ctx.restore();
    }
  };

  // ---- the inbox panel: header with the live counter, the feed clipped inside
  const panelH = (F: number) => lerp(pan.h, D.compactH, ease.inOutCubic(prog(F, 400, 432)));
  const pill = (ctx: Ctx, F: number, x: number, y: number, scale = 1) => {
    const c = { n: counter(shown).n, since: counter(F).since },
      calm = prog(F, CUE.tap + 2, CUE.tap + 14),
      pop = 1 + 0.22 * Math.exp(-c.since / 3.5) * (c.since < 12 ? 1 : 0),
      s = scale * pop,
      o = { size: 30 * u * s, family: F_.sans, weight: 800, color: C.surface, align: "center" as const },
      h = 54 * u * s,
      ww = Math.max(76 * u * s, measure(ctx, String(c.n), o) + 36 * u * s);
    if (c.n <= 0) return;
    card(ctx, x - ww, y - h / 2, ww, h, { r: h / 2, fill: mix(ALARM, CALM, calm) });
    text(ctx, String(c.n), x - ww / 2, y + 11 * u * s, o);
  };
  const inbox = (ctx: Ctx, F: number) => {
    const ph = panelH(F);
    card(ctx, pan.x, pan.y, pan.w, ph, {
      r: 40 * u,
      fill: C.surface,
      shadow: { blur: 60 * u, y: 20 * u, color: rgba(C.ink, 0.1) },
    });
    text(ctx, "Inbox", pan.x + 36 * u, pan.y + 70 * u, {
      size: 38 * u,
      family: F_.sans,
      weight: 600,
      color: C.ink,
      track: -0.02,
    });
    if (F < T.sign + 2) pill(ctx, F, pan.x + pan.w - 32 * u, pan.y + 58 * u);
    // a ping ring off the counter on every arrival (the storm's pulse)
    if (F < 250) {
      const since = counter(F).since;
      ring(
        ctx,
        pan.x + pan.w - 70 * u,
        pan.y + 58 * u,
        30 * u + since * 7 * u,
        3 * u,
        ALARM,
        0.6 * (1 - prog(since, 0, 14)),
      );
    }
    ctx.fillStyle = C.line;
    ctx.fillRect(pan.x + padX, pan.y + HEAD, pan.w - 2 * padX, 2 * u);
    ctx.save();
    rr(ctx, pan.x, pan.y + HEAD + 2 * u, pan.w, ph - HEAD - 2 * u, 40 * u);
    ctx.clip();
    ctx.beginPath();
    ctx.rect(pan.x, pan.y + HEAD + 2 * u, pan.w, ph);
    ctx.clip();
    if (F < 250) stormFeed(ctx, F);
    else sortFeed(ctx, F);
    ctx.restore();
  };
  const unread = (ctx: Ctx, y: number, a: number, color = ALARM) => {
    if (a > 0) {
      ctx.save();
      ctx.globalAlpha *= a;
      dot(ctx, dotX, y + BH / 2, 9 * u, color);
      ctx.restore();
    }
  };
  // 0–250: every bubble's slot is −1 plus the springs of itself and every later arrival
  const stormFeed = (ctx: Ctx, F: number) => {
    const bottom = pan.y + pan.h;
    for (let k = NM - 1; k >= 0; k--) {
      const own = spr(F - ARRIVE[k]!);
      if (own <= 0) continue;
      let s = -1;
      for (let j = k; j < NM; j++) s += spr(F - ARRIVE[j]!);
      const y = contentTop + s * PITCH;
      if (y > bottom || y < contentTop - PITCH * 1.2) continue;
      const a = clamp(own * 2.5);
      bubble(ctx, k, bubX, y, { a });
      unread(ctx, y, a);
    }
    // the hook: someone is typing, a beat before the storm
    const ty = prog(F, 30, 36) * (1 - prog(F, T.storm - 4, T.storm));
    if (ty > 0) {
      const y = contentTop + spr(F - ARRIVE[0]!) * PITCH;
      ctx.save();
      ctx.globalAlpha *= ty;
      avatar(ctx, avX, y + BH / 2, AV, 1);
      card(ctx, bubX, y + 14 * u, 120 * u, BH - 28 * u, { r: 30 * u, fill: C.ground });
      for (let d = 0; d < 3; d++) {
        const hop = Math.max(0, Math.sin(((F - 30) / FPS) * TAU * 1.6 - d * 0.9));
        dot(ctx, bubX + 34 * u + d * 26 * u, y + BH / 2 - hop * 9 * u, 8 * u, mix(C.muted, C.ink, hop * 0.6));
      }
      ctx.restore();
    }
  };
  // 250–390: the accordion, then the slivers gather into one stack and the kept three wait under it
  const sortFeed = (ctx: Ctx, F: number) => {
    const ys = accordion(F),
      g = tidy(F),
      sp = lerp(SP, SP2, ease.inOutCubic(prog(F, T.gather, T.gather + 24))),
      bottom = pan.y + pan.h;
    // the label row over the stack
    const la = prog(F, 254, 266),
      n = folded(shown);
    if (la > 0) {
      const y = contentTop + 30 * u;
      text(ctx, "HANDLED", pan.x + padX, y, {
        size: 22 * u,
        family: F_.mono,
        weight: 500,
        color: C.muted,
        alpha: la,
        track: 0.08,
      });
      const lw = measure(ctx, "HANDLED", { size: 22 * u, family: F_.mono, weight: 500, track: 0.08 });
      text(ctx, String(n), pan.x + padX + lw + 18 * u, y, {
        size: 22 * u,
        family: F_.mono,
        weight: 500,
        color: C.ink,
        alpha: la,
      });
      const done = prog(F, CUE.tidy + 10, CUE.tidy + 30);
      if (done > 0) {
        ctx.save();
        ctx.globalAlpha *= done;
        dot(ctx, pan.x + pan.w - padX - 15 * u, y - 8 * u, 15 * u, CALM);
        check(ctx, pan.x + pan.w - padX - 15 * u, y - 8 * u, 14 * u, done, C.surface, 3.5 * u);
        ctx.restore();
      }
    }
    // slivers first (they slide behind the kept bubbles while the stack gathers), then the rest
    const order = [...Array(NM).keys()].sort((a, b) => Number(kept(NM - 1 - a)) - Number(kept(NM - 1 - b)));
    for (const o of order) {
      const k = NM - 1 - o,
        isKept = kept(k);
      if (isKept && F >= T.gather) continue; // they have left the inbox (drawn by gather())
      const target = isKept ? keptHome(KEEP.indexOf(k)) : stackTop + RANK[k]! * sp,
        f = foldOf(o, F),
        yy = lerp(ys[o]!, target, g);
      if (yy > bottom || yy < contentTop - PITCH) continue;
      const pin = isKept ? prog(F, FOLD[o]!, FOLD[o]! + 8) : 0;
      bubble(ctx, k, bubX, yy, { fold: f, pin });
      unread(ctx, yy, isKept ? 1 : 1 - clamp(f * 3), pin > 0.5 ? CALM : ALARM);
    }
    // the empty state (landscape keeps the full-height inbox)
    if (!tall) {
      const ea = prog(F, 440, 462);
      if (ea > 0) {
        const y = stackTop + 44 * SP2 + 120 * u;
        ctx.save();
        ctx.globalAlpha *= ea;
        dot(ctx, pan.x + pan.w / 2, y, 30 * u, CALM);
        check(ctx, pan.x + pan.w / 2, y, 28 * u, prog(F, 446, 470), C.surface, 5 * u);
        text(ctx, "Nothing else needs you.", pan.x + pan.w / 2, y + 80 * u, {
          size: 28 * u,
          family: F_.sans,
          weight: 400,
          color: C.muted,
          align: "center",
        });
        ctx.restore();
      }
    }
  };

  // ---- 390–540: the three kept bubbles leave the inbox, slide together and become one decision card
  const cd = D.card;
  const btn = (i: number) => {
    const pad = 44 * u,
      gap = 24 * u,
      bwid = (cd.w - 2 * pad - gap) / 2,
      bh = 96 * u;
    return { x: cd.x + pad + i * (bwid + gap), y: cd.y + cd.h - pad - bh, w: bwid, h: bh };
  };
  const cardGrow = (F: number) => ease.outCubic(prog(F, CUE.card, CUE.card + 26));
  const gather = (ctx: Ctx, F: number) => {
    if (F < T.gather) return;
    const grow = cardGrow(F),
      pileCx = cd.x + cd.w / 2,
      pileCy = cd.y + cd.h / 2;
    // the card grows from the pile's bounds
    if (grow > 0) {
      const pw = bw(ctx, KEEP[1]!),
        x = lerp(pileCx - pw / 2 - 30 * u, cd.x, grow),
        y = lerp(pileCy - BH / 2 - 30 * u, cd.y, grow),
        ww = lerp(pw + 60 * u, cd.w, grow),
        hh = lerp(BH + 60 * u, cd.h, grow),
        calm = prog(F, CUE.tap + 2, CUE.tap + 16);
      card(ctx, x, y, ww, hh, {
        r: 36 * u,
        fill: C.surface,
        shadow: { blur: 70 * u, y: 24 * u, color: rgba(C.ink, 0.14) },
        stroke: calm > 0 ? rgba(CALM, calm) : undefined,
        lw: 4 * u,
      });
      decision(ctx, F);
    }
    const fadeOut = 1 - prog(F, CUE.card + 6, CUE.card + 20);
    if (fadeOut <= 0) return;
    KEEP.forEach((k, q) => {
      const m = ease.inOutCubic(prog(F, 394 + q * 6, 426 + q * 4)),
        wq = bw(ctx, k),
        x0 = bubX,
        y0 = keptHome(q),
        x1 = pileCx - wq / 2 + (bubX - avX) / 2 + (q - 1) * 16 * u,
        y1 = pileCy - BH / 2 + (q - 1) * 20 * u;
      const x = lerp(x0, x1, m),
        y = lerp(y0, y1, m) - Math.sin(m * Math.PI) * 30 * u;
      ctx.save();
      ctx.translate(x + wq / 2, y + BH / 2);
      ctx.rotate((((q - 1) * 2.2 * Math.PI) / 180) * m);
      ctx.translate(-(x + wq / 2), -(y + BH / 2));
      bubble(ctx, k, x, y, { lift: clamp(m * 3), pin: 1 - m, a: fadeOut });
      ctx.restore();
    });
  };
  const decision = (ctx: Ctx, F: number) => {
    const a0 = CUE.card + 18,
      pad = 44 * u,
      calm = prog(F, CUE.tap + 2, CUE.tap + 16),
      appear = (at: number) => spring((F - at) / FPS, { freq: 2.6, damp: 0.8 });
    // row 1: the tag and the three faces
    const t1 = appear(a0);
    if (t1 > 0) {
      ctx.save();
      ctx.globalAlpha *= clamp(t1 * 1.5);
      ctx.translate(0, (1 - t1) * 16 * u);
      const tagO = { size: 22 * u, family: F_.mono, weight: 500, color: C.surface, track: 0.1 };
      const label = calm > 0.5 ? "DECIDED" : "DECIDE",
        tw = measure(ctx, label, tagO) + 36 * u;
      card(ctx, cd.x + pad, cd.y + pad, tw, 44 * u, { r: 22 * u, fill: mix(ALARM, CALM, calm) });
      text(ctx, label, cd.x + pad + 18 * u, cd.y + pad + 30 * u, tagO);
      KEEP.forEach((k, q) => {
        const x = cd.x + cd.w - pad - 26 * u - (2 - q) * 40 * u;
        dot(ctx, x, cd.y + pad + 22 * u, 29 * u, C.surface);
        avatar(ctx, x, cd.y + pad + 22 * u, 26 * u, k);
      });
      ctx.restore();
    }
    // the question
    const t2 = appear(a0 + 6);
    if (t2 > 0) {
      const o = { size: D.title, family: F_.sans, weight: 600, color: C.ink, track: -0.02 };
      const s = "Decide: Thu 15:00 or Fri 10:00?",
        fit = Math.min(1, (cd.w - 2 * pad) / measure(ctx, s, o));
      ctx.save();
      ctx.globalAlpha *= clamp(t2 * 1.5);
      ctx.translate(0, (1 - t2) * 20 * u);
      text(ctx, s, cd.x + pad, cd.y + pad + 44 * u + 84 * u, { ...o, size: o.size * fit });
      const sub = ["Ada, Ben and Cy are waiting on you.", "Invite sent to Ada, Ben and Cy."];
      const so = { size: 26 * u, family: F_.sans, weight: 400, color: C.muted };
      text(ctx, sub[0]!, cd.x + pad, cd.y + pad + 44 * u + 138 * u, { ...so, alpha: 1 - calm });
      text(ctx, sub[1]!, cd.x + pad, cd.y + pad + 44 * u + 138 * u, { ...so, color: CALM_INK, alpha: calm });
      ctx.restore();
    }
    // the two buttons
    ["Thu 15:00", "Fri 10:00"].forEach((s, i) => {
      const t3 = appear(a0 + 12 + i * 4);
      if (t3 <= 0) return;
      const b = btn(i),
        hov = hover(F, i),
        press = i === 0 ? 1 - 0.06 * Math.sin(Math.PI * prog(F, CUE.tap - 3, CUE.tap + 5)) : 1,
        on = i === 0 ? calm : 0,
        off = i === 1 ? calm : 0;
      ctx.save();
      ctx.globalAlpha *= clamp(t3 * 1.5) * (1 - 0.55 * off);
      ctx.translate(b.x + b.w / 2, b.y + b.h / 2);
      ctx.scale((0.9 + 0.1 * t3) * press, (0.9 + 0.1 * t3) * press);
      ctx.translate(-(b.x + b.w / 2), -(b.y + b.h / 2));
      card(ctx, b.x, b.y, b.w, b.h, {
        r: 24 * u,
        fill: on > 0 ? mix(C.ground, CALM, on) : mix(C.ground, C.line, hov),
        stroke: hov > 0 && on === 0 ? rgba(C.ink, 0.25 * hov) : undefined,
        lw: 2 * u,
      });
      const lo = { size: 34 * u, family: F_.sans, weight: 600, color: on > 0.5 ? C.surface : C.ink, track: -0.01 },
        lw = measure(ctx, s, lo),
        ck = on > 0 ? 44 * u * on : 0;
      text(ctx, s, b.x + b.w / 2 + ck / 2, b.y + b.h / 2 + 12 * u, { ...lo, align: "center" });
      if (on > 0)
        check(
          ctx,
          b.x + b.w / 2 - lw / 2 - 14 * u,
          b.y + b.h / 2,
          18 * u,
          prog(F, CUE.tap + 6, CUE.tap + 20),
          C.surface,
          5 * u,
        );
      ctx.restore();
    });
  };
  // the cursor hovers Fri, thinks, then settles on Thu
  const hover = (F: number, i: number) =>
    i === 1 ? window01f(F, 512, 520, 536, 546) : window01f(F, 552, 560, CUE.tap + 2, CUE.tap + 8);
  const window01f = (f: number, a: number, b: number, c: number, d: number) =>
    Math.min(prog(f, a, b), 1 - prog(f, c, d));

  // ---- the cursor (screen space, sharp): enters on the freeze, sweeps the feed, gathers, taps
  const push = (F: number) => 1 + 0.035 * (F / N);
  const toScreen = (F: number, x: number, y: number): [number, number] => {
    const s = push(F);
    return [cx + (x - cx) * s, cy + (y - cy) * s];
  };
  const cursorAt = (F: number): { x: number; y: number; a: number; press: number } | null => {
    if (F < 244 || F > T.sign + 8) return null;
    const ys = accordion(Math.min(F, T.gather)),
      fr = front(F),
      i = Math.floor(fr),
      yf = lerp(ys[i]!, ys[Math.min(NM - 1, i + 1)]!, fr - i) + BH * 0.45,
      sweep = 0.5 - 0.5 * Math.cos(((F - CUE.sweep) / 22) * TAU),
      xs = bubX + 40 * u + sweep * Math.min(bubMax, 360 * u);
    // key poses
    const idle = { x: pan.x + pan.w - 70 * u, y: stackTop + 44 * SP + 90 * u };
    const b0 = btn(0),
      b1 = btn(1),
      rest = { x: cd.x + cd.w - 90 * u, y: cd.y + cd.h + 40 * u };
    let x: number, y: number;
    if (F < CUE.sweep) {
      const m = ease.outCubic(prog(F, 244, CUE.sweep));
      x = lerp(W + 60 * u, bubX + 40 * u, m);
      y = lerp(contentTop + 380 * u, contentTop + LABEL + 34 * u, m);
    } else if (F < CUE.tidy + 4) {
      x = xs;
      y = yf;
    } else if (F < T.gather + 4) {
      const m = ease.inOutCubic(prog(F, CUE.tidy + 4, T.gather + 4)),
        ex = xs,
        ey = yf;
      x = lerp(ex, idle.x, m);
      y = lerp(ey, idle.y, m);
    } else if (F < 500) {
      // rides with the kept three as they gather, then settles beside the card
      const m = ease.inOutCubic(prog(F, T.gather + 4, 440)),
        m2 = ease.inOutCubic(prog(F, 450, 500));
      x = lerp(lerp(idle.x, cd.x + cd.w / 2 + 120 * u, m), rest.x, m2);
      y = lerp(lerp(idle.y, cd.y + cd.h / 2 + 40 * u, m), rest.y, m2);
    } else if (F < 546) {
      const m = ease.inOutCubic(prog(F, 500, 520));
      x = lerp(rest.x, b1.x + b1.w * 0.8, m) + Math.sin((F - 500) / 9) * 6 * u * (1 - prog(F, 530, 545));
      y = lerp(rest.y, b1.y + b1.h * 0.62, m);
    } else if (F < 600) {
      const m = ease.inOutCubic(prog(F, 544, 564));
      x = lerp(b1.x + b1.w * 0.8, b0.x + b0.w * 0.8, m);
      y = lerp(b1.y + b1.h * 0.62, b0.y + b0.h * 0.62, m);
    } else {
      const m = ease.inOutCubic(prog(F, 600, T.sign + 8));
      x = lerp(b0.x + b0.w * 0.8, b0.x + b0.w * 0.8 + 160 * u, m);
      y = lerp(b0.y + b0.h * 0.62, b0.y + b0.h + 120 * u, m);
    }
    const press = Math.sin(Math.PI * prog(F, CUE.tap - 3, CUE.tap + 5));
    const a = F > T.sign ? 1 - prog(F, T.sign, T.sign + 8) : 1;
    const [sx, sy] = toScreen(F, x, y);
    return { x: sx, y: sy, a, press };
  };
  const cursor = (ctx: Ctx, F: number) => {
    const c = cursorAt(F);
    if (!c || c.a <= 0) return;
    // the tap: a calm ripple
    const rp = prog(F, CUE.tap, CUE.tap + 22);
    if (rp > 0 && rp < 1) ring(ctx, c.x, c.y, 16 * u + rp * 70 * u, 4 * u, CALM, 1 - rp);
    const s = 1.35 * u * (1 - 0.14 * c.press);
    ctx.save();
    ctx.globalAlpha *= c.a;
    ctx.translate(c.x, c.y);
    ctx.scale(s, s);
    ctx.beginPath();
    const pts = [
      [0, 0],
      [0, 34],
      [9, 26],
      [15, 39],
      [21, 36],
      [15, 24],
      [26, 24],
    ];
    pts.forEach(([px, py], j) => (j ? ctx.lineTo(px!, py!) : ctx.moveTo(px!, py!)));
    ctx.closePath();
    ctx.shadowColor = rgba(C.ink, 0.25);
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = C.ink;
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.strokeStyle = C.surface;
    ctx.lineWidth = 2.6;
    ctx.lineJoin = "round";
    ctx.stroke();
    ctx.restore();
  };

  // ---- captions: serif ladders beside the action (screen space, inside safe)
  const LAD = { face: F_.serif, italic: F_.italic, ink: C.ink, fps: FPS, gap: 0.1 };
  type Cap = { lines: Word[][]; out: number; key: string; y: number };
  const CAPS: Cap[] = [
    {
      lines: [
        [w("47", 10, { key: true, scale: tall ? 1.7 : 1.9 }), w("messages", 20)],
        [w("about", 96, { scale: 0.72 }), w("one", 102, { scale: 0.72 })],
        [w("meeting.", 110, { scale: 1.1 })],
      ],
      out: 230,
      key: ALARM,
      y: D.capY[0]!,
    },
    {
      lines: [
        [w("Most", 264, { scale: 0.72 }), w("of", 268, { scale: 0.72 }), w("it", 272, { scale: 0.72 })],
        [w("sorts", 280)],
        [w("itself.", 290, { key: true, scale: 1.6 })],
      ],
      out: 380,
      key: CALM_INK,
      y: D.capY[1]!,
    },
    {
      lines: [
        [w("Three", 404, { scale: 0.72 }), w("people,", 410, { scale: 0.72 })],
        [w("two", 420), w("times.", 428, { key: true, scale: 1.5 })],
      ],
      out: 552,
      key: ALARM,
      y: D.capY[2]!,
    },
    {
      lines: [[w("one", 578, { scale: 1.1 })], [w("decision.", 586, { key: true, scale: 1.7 })]],
      out: 622,
      key: CALM_INK,
      y: D.capY[3]!,
    },
  ];
  const captions = (ctx: Ctx, F: number) => {
    for (const c of CAPS) {
      const first = Math.min(...c.lines.flat().map((x) => x.at));
      if (F < first - 1 || F > c.out + 9) continue;
      // a slow rise keeps a held caption alive
      ladder(ctx, c.lines, D.capX, c.y - (F - first) * 0.18 * u, F, {
        ...LAD,
        size: D.capSize,
        accent: c.key,
        out: c.out,
      });
    }
  };

  // ---- sign-off: the counter flies onto the wordmark, now at 1 and calm
  const signoff = (ctx: Ctx, F: number) => {
    if (F < T.sign) return;
    const f = F - T.sign,
      o = { size: D.mark, family: F_.sans, weight: 800, color: C.ink, align: "left" as const, track: -0.05 },
      mw = measure(ctx, P.product, o),
      base = cy + (tall ? 20 : 40) * u,
      badge = 150 * u,
      x0 = cx - (mw + badge) / 2,
      sp = 1 + 0.08 * prog(F, T.sign, N); // linear: the push never settles, so the last frame still moves
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(sp, sp);
    ctx.translate(-cx, -cy);
    letters(ctx, P.product, x0, base, o, (i) => spring((f - 10 - i * 2.5) / FPS, { freq: 2.4, damp: 0.75 }), "rise");
    // the badge
    const m = ease.inOutCubic(prog(F, T.sign, T.sign + 20)),
      fromX = pan.x + pan.w - 32 * u,
      fromY = pan.y + 58 * u,
      toX = x0 + mw + badge,
      toY = base - D.mark * 0.72;
    const bob = Math.sin(((F - T.sign - 20) / FPS) * TAU * 0.8) * 7 * u * prog(F, T.sign + 20, T.sign + 30);
    pill(ctx, F, lerp(fromX, toX, m), lerp(fromY, toY, m) - Math.sin(m * Math.PI) * 80 * u + bob, lerp(1, 1.5, m));
    ctx.restore();
    ladder(
      ctx,
      [
        [
          w("Find", T.sign + 20, { scale: 0.8 }),
          w("a", T.sign + 23, { scale: 0.8 }),
          w("time", T.sign + 26, { scale: 0.8 }),
          w("that", T.sign + 29, { scale: 0.8 }),
        ],
        [w("works", T.sign + 33), w("for", T.sign + 36), w("everyone.", T.sign + 40, { key: true })],
      ],
      cx,
      base + 60 * u - (F - T.sign) * 0.2 * u,
      F,
      { ...LAD, size: (tall ? 70 : 62) * u, accent: CALM_INK, align: "center" },
    );
  };

  // the world: rain, inbox, card (under a slow push-in), then the sign-off
  const paint = (ctx: Ctx, env: Env, F: number) => {
    F = clamp(F, 0, N - 1);
    ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = C.ground;
    ctx.fillRect(0, 0, W, H);
    const s = push(F),
      out = prog(F, T.sign, T.sign + 10);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(s, s);
    ctx.translate(-cx, -cy);
    rain(ctx, F);
    if (out < 1) {
      ctx.save();
      ctx.globalAlpha *= 1 - out;
      ctx.translate(0, out * 60 * u);
      inbox(ctx, F);
      gather(ctx, F);
      // the hook: one ping falls onto the counter, and the first bubble drops in under it
      if (F < ARRIVE[0]! + 1) {
        const px = pan.x + pan.w - 70 * u,
          py = pan.y + 58 * u,
          t = ease.inCubic(prog(F, 0, ARRIVE[0]!)),
          y = lerp(Math.max(-40 * u, pan.y - 420 * u), py, t);
        ctx.strokeStyle = rgba(C.muted, 0.32);
        ctx.lineWidth = 3 * u;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(px, y - 60 * u - 200 * u * t);
        ctx.lineTo(px, y);
        ctx.stroke();
        dot(ctx, px, y, 11 * u, ALARM);
      }
      ctx.restore();
    }
    ctx.restore();
    signoff(ctx, F);
  };

  const cuts = [0, T.storm, T.freeze, T.gather, T.decide, T.sign, N],
    names = ["hook", "storm", "sweep", "gather", "decide", "signoff"];
  const shots: Shot[] = names.map((sid, i) => ({
    id: sid,
    start: cuts[i]!,
    end: cuts[i + 1]!,
    draw: (ctx, local, env) => {
      const F = cuts[i]! + local;
      shown = F;
      motionBlur(ctx, env, (c, dt) => paint(c, env, F + dt), {
        samples: sid === "storm" || sid === "sweep" ? 10 : 4,
        shutter: 0.5,
      });
      // captions and the cursor are read, not watched: drawn once, sharp, on top of the blurred frame
      ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
      ctx.globalAlpha = 1;
      captions(ctx, F);
      cursor(ctx, F);
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
      drop: T.storm,
      hits: [CUE.tap, T.sign],
      whooshes: [CUE.sweep, CUE.card],
      ticks: [...POPS, CUE.tap - 2],
      sign: T.sign + 6,
    }),
  };
}

export const feedStorm = make("vertical", "feedStorm");
export const feedStormLandscape = make("landscape", "feedStormLandscape");
