// STUDY 19 · OFFER CARDS (21 s, 30 fps, 120 bpm). The founder-explainer offer reel: dark plan cards fan in and
// compare side by side, one lifts forward and a "+" joins a small setup-fee card to its monthly fee, a third card
// flips in, then the whole offer stacks, slides away, and one reply bubble types the word the viewer should comment.
// Flat plum on cream, rich card shadows, confident sans on the cards, serif ladders beside them. Oriel is fictional
// and every price is invented.
// Brief: series/studies/briefs/offer-cards.json · prompt: series/studies/prompts/offer-cards.prompt.md
//
// The whole film is one continuous function paint(F) of a (fractional) frame F; the shots only name the sections.
import PACK from "../../../brand/packs/studio/pack.json";
import type { Ctx, Env } from "../core";
import type { Film, Shot } from "../film";
import { motionBlur } from "../kit/blur";
import { ladder, w, type Word } from "../kit/captions";
import { clamp, ease, lerp, prog, spring } from "../kit/motion";
import { usePack } from "../kit/pack";
import { beatScore } from "../kit/score";
import { layout, type Size } from "../kit/sizes";
import { measure, text } from "../kit/type";
import { card, check, rr } from "../kit/ui";

const P = usePack(PACK),
  C = P.palette("plum"),
  F_ = P.face;
const FPS = 30,
  BPM = 120,
  N = 630; // a beat is 15 frames, a bar 60
// the timeline, in frames (every cut on a beat)
const T = { cards: 60, lift: 210, third: 360, away: 480, cta: 570 };
const TAU = Math.PI * 2;

/** hex colour blend (flat colour: it only ever picks one fill for one shape) */
const mix = (a: string, b: string, t: number) => {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const x = p(a),
    y = p(b);
  return `rgb(${x.map((v, i) => Math.round(lerp(v, y[i]!, clamp(t)))).join(",")})`;
};
// the dark card's own colours: plum body, cream type, a quieter cream for the fine print
const K = {
  body: C.deep!,
  ink: C.ground,
  soft: mix(C.deep!, C.ground, 0.62),
  rule: mix(C.deep!, C.ground, 0.16),
  well: mix(C.deep!, C.ground, 0.12),
};

type Plan = {
  name: string;
  price: string;
  per: string; // set inline after the price
  sub: string; // the line under the price
  feats: [string, string, string];
  btn: string;
  btnFill: string;
  btnInk: string;
  ticks: [number, number, number]; // the frame each feature ticks on
};
const SOLO: Plan = {
  name: "Solo",
  price: "$0",
  per: "",
  sub: "free, for one calendar",
  feats: ["Your booking link", "One calendar", "Email reminders"],
  btn: "Start free",
  btnFill: K.well,
  btnInk: K.ink,
  ticks: [100, 130, 160],
};
const TEAM: Plan = {
  name: "Team",
  price: "$8",
  per: "/ seat",
  sub: "per month, billed monthly",
  feats: ["Shared availability", "Round-robin booking", "Team dashboard"],
  btn: "Try Team",
  btnFill: C.accent,
  btnInk: C.surface,
  ticks: [107, 137, 167],
};
const PER: Plan = {
  name: "Per booking",
  price: "$0.50",
  per: "",
  sub: "per confirmed booking",
  feats: ["No monthly fee", "Same booking link", "For occasional use"],
  btn: "Pay as you go",
  btnFill: C.accent2,
  btnInk: C.deep!,
  ticks: [405, 420, 435],
};
const TAG_AT = 184; // "Most picked" pops onto the Team card
const PLUS_AT = 226,
  SETUP_AT = 232;
const TYPE_AT = [528, 535, 542, 549]; // h, o, u, r
const REPLY = "hour";

export function make(size: Size, id: string): Film {
  const L = layout(size),
    { W, H, u, cx, cy } = L,
    port = size === "portrait";

  // ---- per-size design. The vertical stacks caption / cards / setup fee top to bottom; the portrait (whose safe
  // area is only 810 px tall) sets smaller cards, puts the setup fee BESIDE the lifted card, and keeps the call to
  // action in the lower third.
  const D = port
    ? {
        card: {
          w: 416,
          h: 556,
          pad: 32,
          name: 30,
          price: 100,
          per: 30,
          sub: 25,
          feat: 25,
          row: 49,
          btn: 58,
          btnText: 25,
          tag: 22,
        },
        cap: { x: L.safe.x, y: 222 * u, size: 62 * u },
        pair: { y: 700 * u, dx: 226 * u },
        lift: { x: 352 * u, y: 700 * u, s: 1.04 },
        plus: { x: 632 * u, y: 700 * u },
        setup: { x: 832 * u, y: 700 * u, w: 260 * u, h: 236 * u },
        third: { y: 700 * u, dx: 236 * u, s: 1.04 },
        hook: { y: 400 * u, size: 116 * u },
        bubble: { y: 620 * u, text: 64 * u },
        cta: { y: 788 * u, size: 88 * u, mark: 1022 * u, two: true },
      }
    : {
        card: {
          w: 440,
          h: 660,
          pad: 40,
          name: 36,
          price: 136,
          per: 36,
          sub: 28,
          feat: 30,
          row: 70,
          btn: 72,
          btnText: 30,
          tag: 25,
        },
        cap: { x: L.safe.x, y: 272 * u, size: 96 * u },
        pair: { y: 975 * u, dx: 236 * u },
        lift: { x: cx, y: 915 * u, s: 1.06 },
        plus: { x: cx, y: 1322 * u },
        setup: { x: cx, y: 1442 * u, w: 520 * u, h: 150 * u },
        third: { y: 975 * u, dx: 246 * u, s: 1.06 },
        hook: { y: 600 * u, size: 160 * u },
        bubble: { y: 820 * u, text: 84 * u },
        cta: { y: 1010 * u, size: 124 * u, mark: 1520 * u, two: false },
      };
  const CD = D.card,
    CW = CD.w * u,
    CH = CD.h * u;

  const dot = (ctx: Ctx, x: number, y: number, r: number, fill: string) => {
    if (r <= 0) return;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fillStyle = fill;
    ctx.fill();
  };
  /** rich shadow: a wide ambient pool and a tight contact shadow, both in the plum ink */
  const shadowed = (ctx: Ctx, x: number, y: number, ww: number, hh: number, r: number, fill: string, lift = 0) => {
    card(ctx, x, y, ww, hh, {
      r,
      fill,
      shadow: { blur: (54 + 50 * lift) * u, y: (26 + 30 * lift) * u, color: `rgba(43,19,48,${0.26 + 0.1 * lift})` },
    });
    card(ctx, x, y, ww, hh, { r, fill, shadow: { blur: 12 * u, y: 6 * u, color: "rgba(43,19,48,0.22)" } });
  };
  const sans =
    (
      s: string,
      x: number,
      y: number,
      sz: number,
      weight: number,
      color: string,
      o: { align?: CanvasTextAlign; alpha?: number; track?: number } = {},
    ) =>
    (ctx: Ctx) =>
      text(ctx, s, x, y, {
        size: sz,
        family: F_.sans,
        weight,
        color,
        align: o.align ?? "left",
        alpha: o.alpha ?? 1,
        track: o.track ?? -0.01,
      });

  // ---- a plan card, drawn about its centre. s ≥ 1 always (text never shrinks under its set size); flip is the
  // signed horizontal scale of a card turning over (< 0 shows the back).
  type Pose = {
    x: number;
    y: number;
    s?: number;
    rot?: number;
    flip?: number;
    dim?: number;
    lift?: number;
    tag?: number;
  };
  const plan = (ctx: Ctx, p: Plan, F: number, o: Pose) => {
    const s = o.s ?? 1,
      flip = o.flip ?? 1;
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.rotate(o.rot ?? 0);
    ctx.scale(s * flip, s);
    const x0 = -CW / 2,
      y0 = -CH / 2,
      pad = CD.pad * u,
      r = 34 * u;
    shadowed(ctx, x0, y0, CW, CH, r, K.body, o.lift ?? 0);
    if (flip < 0) {
      // the back: a violet field with Oriel's dot pattern
      card(ctx, x0 + 14 * u, y0 + 14 * u, CW - 28 * u, CH - 28 * u, { r: r - 10 * u, fill: C.accent });
      for (let i = 0; i < 5; i++)
        for (let j = 0; j < 7; j++) dot(ctx, x0 + CW * (0.18 + i * 0.16), y0 + CH * (0.14 + j * 0.12), 7 * u, K.body);
      ctx.restore();
      return;
    }
    // name + tag
    const nameY = y0 + pad + CD.name * 0.9 * u;
    sans(p.name, x0 + pad, nameY, CD.name * u, 600, K.ink)(ctx);
    const tg = clamp(o.tag ?? 0, 0, 1.3);
    if (tg > 0) {
      const ts = CD.tag * u,
        tw = measure(ctx, "Most picked", { size: ts, family: F_.sans, weight: 600 }) + ts * 1.3,
        th = ts * 1.75,
        tx = -x0 - pad - tw / 2,
        ty = nameY - CD.name * 0.34 * u;
      ctx.save();
      ctx.translate(tx, ty);
      ctx.scale(tg, tg);
      card(ctx, -tw / 2, -th / 2, tw, th, { r: th / 2, fill: C.accent2 });
      sans("Most picked", 0, ts * 0.36, ts, 600, K.body, { align: "center" })(ctx);
      ctx.restore();
    }
    // price
    const priceY = nameY + 22 * u + CD.price * 0.76 * u,
      pw = text(ctx, p.price, x0 + pad - 4 * u, priceY, {
        size: CD.price * u,
        family: F_.sans,
        weight: 800,
        color: K.ink,
        track: -0.045,
      });
    if (p.per) sans(p.per, x0 + pad + pw + 10 * u, priceY, CD.per * u, 600, K.soft)(ctx);
    const subY = priceY + CD.sub * 1.55 * u;
    sans(p.sub, x0 + pad, subY, CD.sub * u, 400, K.soft)(ctx);
    const ruleY = subY + 24 * u;
    ctx.fillStyle = K.rule;
    ctx.fillRect(x0 + pad, ruleY, CW - 2 * pad, 2 * u);
    // features: a dim list whose checks tick on, one by one
    p.feats.forEach((f, i) => {
      const y = ruleY + CD.row * (0.78 + i) * u,
        k = spring((F - p.ticks[i]!) / FPS, { freq: 3.2, damp: 0.5 }),
        rr_ = CD.feat * 0.5 * u,
        ccx = x0 + pad + rr_,
        ccy = y - CD.feat * 0.34 * u;
      ctx.save();
      ctx.strokeStyle = K.rule;
      ctx.lineWidth = 2.5 * u;
      ctx.beginPath();
      ctx.arc(ccx, ccy, rr_, 0, TAU);
      ctx.stroke();
      ctx.restore();
      dot(ctx, ccx, ccy, rr_ * clamp(k, 0, 1.25), C.accent);
      if (k > 0)
        check(ctx, ccx, ccy + 1 * u, rr_ * 1.05, prog(F, p.ticks[i]! + 2, p.ticks[i]! + 9), C.surface, 3.5 * u);
      const lit = clamp(k * 1.4);
      sans(f, ccx + rr_ + 16 * u, y, CD.feat * u, 400, mix(C.deep!, C.ground, lerp(0.42, 1, lit)))(ctx);
    });
    // the button
    const bh = CD.btn * u,
      by = -y0 - pad - bh;
    card(ctx, x0 + pad, by, CW - 2 * pad, bh, { r: bh / 2, fill: p.btnFill });
    sans(p.btn, 0, by + bh / 2 + CD.btnText * 0.36 * u, CD.btnText * u, 600, p.btnInk, { align: "center" })(ctx);
    // a receded card sinks toward the ground with one flat veil
    if ((o.dim ?? 0) > 0) {
      rr(ctx, x0, y0, CW, CH, r);
      ctx.fillStyle = C.ground;
      ctx.globalAlpha = o.dim!;
      ctx.fill();
    }
    ctx.restore();
  };

  // ---- the small setup-fee card (white, the only light object among the plans)
  const setupCard = (ctx: Ctx, x: number, y: number, a: number) => {
    const { w: sw, h: sh } = D.setup,
      x0 = x - sw / 2,
      y0 = y - sh / 2;
    ctx.save();
    ctx.globalAlpha *= a;
    shadowed(ctx, x0, y0, sw, sh, 28 * u, C.surface);
    if (port) {
      sans("Setup fee", x, y0 + 58 * u, 28 * u, 600, C.ink, { align: "center" })(ctx);
      text(ctx, "$0", x, y0 + 150 * u, {
        size: 92 * u,
        family: F_.sans,
        weight: 800,
        color: C.ink,
        align: "center",
        track: -0.04,
      });
      sans("nothing up front", x, y0 + 200 * u, 23 * u, 400, C.muted, { align: "center" })(ctx);
    } else {
      sans("Setup fee", x0 + 40 * u, y0 + 66 * u, 34 * u, 600, C.ink)(ctx);
      sans("nothing up front", x0 + 40 * u, y0 + 108 * u, 26 * u, 400, C.muted)(ctx);
      text(ctx, "$0", x0 + sw - 40 * u, y0 + 104 * u, {
        size: 88 * u,
        family: F_.sans,
        weight: 800,
        color: C.ink,
        align: "right",
        track: -0.04,
      });
    }
    ctx.restore();
  };
  const plus = (ctx: Ctx, x: number, y: number, k: number, spin: number) => {
    if (k <= 0) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(spin);
    ctx.scale(k, k);
    dot(ctx, 0, 0, 34 * u, C.accent);
    ctx.fillStyle = C.surface;
    ctx.fillRect(-15 * u, -3.5 * u, 30 * u, 7 * u);
    ctx.fillRect(-3.5 * u, -15 * u, 7 * u, 30 * u);
    ctx.restore();
  };

  // ---- the cards over time: one pose per card per frame, from the story's beats
  const bob = (F: number, i: number) => ({
    y: Math.sin(F * 0.07 + i * 2.1) * 6 * u,
    rot: Math.sin(F * 0.05 + i * 1.3) * 0.006,
  });
  const cards = (ctx: Ctx, F: number) => {
    if (F < T.cards - 4) return;
    const rise = (d: number) => spring((F - T.cards - d) / FPS, { freq: 1.9, damp: 0.72 }),
      spread = spring((F - T.cards - 12) / FPS, { freq: 1.8, damp: 0.66 }),
      lift = spring((F - T.lift) / FPS, { freq: 1.7, damp: 0.72 }),
      turn = spring((F - T.third - 2) / FPS, { freq: 1.7, damp: 0.72 }),
      stack = spring((F - T.away) / FPS, { freq: 2.2, damp: 0.8 });
    const gone = (i: number) => ease.inCubic(prog(F, T.away + 16 + i * 4, T.away + 34 + i * 4));
    const below = H + CH * 0.7;
    // 1 · fan in: both rise from below as one hand, then spread apart side by side
    const pairPose = (i: number) => {
      const sgn = i ? 1 : -1,
        r = rise(i * 6);
      return {
        x: lerp(cx + sgn * 40 * u, cx + sgn * D.pair.dx, spread),
        y: lerp(below, D.pair.y, r),
        rot: lerp(sgn * 0.2, sgn * 0.022, spread),
      };
    };
    // 2 · the lift: Team forward and centred, Solo recedes behind it
    const liftPose = (i: number) =>
      i ? { x: D.lift.x, y: D.lift.y, rot: 0 } : { x: D.lift.x - 24 * u, y: D.lift.y + 30 * u, rot: -0.075 };
    // 3 · the third card: the two plans open to either side of it
    const thirdPose = (i: number) => ({
      x: cx + (i ? 1 : -1) * D.third.dx,
      y: D.third.y + 22 * u,
      rot: (i ? 1 : -1) * 0.1,
    });
    // 4 · the stack
    const stackPose = (i: number) => ({
      x: cx + (i - 1) * 10 * u,
      y: D.third.y + (1 - i) * 10 * u,
      rot: [-0.07, 0.05, -0.015][i]!,
    });
    const blend = (a: { x: number; y: number; rot: number }, b: { x: number; y: number; rot: number }, t: number) => ({
      x: lerp(a.x, b.x, t),
      y: lerp(a.y, b.y, t),
      rot: lerp(a.rot, b.rot, t),
    });
    const pose = (i: number) => {
      let p = pairPose(i);
      p = blend(p, liftPose(i), lift);
      p = blend(p, thirdPose(i), turn);
      p = blend(p, stackPose(i), stack);
      const b = bob(F, i),
        g = gone(i);
      return { x: p.x - g * (W + CW) * 1.1, y: p.y + b.y - g * 160 * u, rot: p.rot + b.rot - g * 0.35 };
    };
    const solo = pose(0),
      team = pose(1);
    const teamLift = lift * (1 - turn),
      soloDim = 0.45 * lift * (1 - turn);
    // the third card: rises and turns over as it lands, in front
    const flipK = spring((F - T.third - 6) / FPS, { freq: 1.5, damp: 0.62 }),
      riseK = spring((F - T.third - 4) / FPS, { freq: 1.9, damp: 0.78 }),
      b3 = bob(F, 2),
      g3 = gone(2),
      st3 = stackPose(2);
    const third = {
      x: lerp(cx, st3.x, stack) - g3 * (W + CW) * 1.1,
      y: lerp(lerp(below, D.third.y, riseK), st3.y, stack) + b3.y - g3 * 160 * u,
      rot: lerp(0, st3.rot, stack) + b3.rot - g3 * 0.35 + (1 - riseK) * 0.25,
      flip: Math.cos(Math.PI * (1 - clamp(flipK, 0, 1.2))),
    };
    const liftS = lerp(1, D.lift.s, teamLift),
      thirdS = lerp(D.third.s, 1, stack);
    // draw order: Solo, Team, then the third card on top
    // behind the third card, both plans sink back under a light veil so the new card reads first
    const back = 0.2 * turn * (1 - stack);
    plan(ctx, SOLO, F, { ...solo, dim: soloDim + back });
    plan(ctx, TEAM, F, {
      ...team,
      s: liftS,
      lift: teamLift,
      dim: back,
      tag: spring((F - TAG_AT) / FPS, { freq: 3, damp: 0.45 }),
    });
    if (F >= T.third + 4 && g3 < 1) plan(ctx, PER, F, { ...third, s: thirdS, lift: 1 - stack });
  };

  // ---- the setup fee joins: a "+" springs in under (vertical) or beside (portrait) the lifted card
  const equation = (ctx: Ctx, F: number) => {
    if (F < PLUS_AT || F > T.third + 30) return;
    const out = ease.inCubic(prog(F, T.third - 12, T.third + 6)),
      k = spring((F - PLUS_AT) / FPS, { freq: 2.6, damp: 0.5 }) * (1 - out),
      spin = (1 - clamp(spring((F - PLUS_AT) / FPS, { freq: 2, damp: 0.7 }))) * Math.PI * 0.75,
      b = Math.sin(F * 0.07 + 4) * 5 * u;
    plus(ctx, D.plus.x, D.plus.y + b, k, spin);
    const s = spring((F - SETUP_AT) / FPS, { freq: 2, damp: 0.72 });
    if (s <= 0) return;
    // slides in from the side it sits on, and drops out when the third card arrives
    const from = port ? { x: W + D.setup.w, y: D.setup.y } : { x: D.setup.x, y: H + D.setup.h };
    let x = lerp(from.x, D.setup.x, s),
      y = lerp(from.y, D.setup.y, s) + Math.sin(F * 0.07 + 5) * 6 * u;
    // it leaves the way it came
    const lx = port ? out * (W - D.setup.x + D.setup.w) : 0,
      ly = port ? 0 : out * (H - D.setup.y + D.setup.h);
    x += lx;
    y += ly;
    setupCard(ctx, x, y, 1);
  };

  // ---- captions: serif ladders beside the action, arriving word by word
  const fit = (ctx: Ctx, lines: Word[][], sz: number, width: number) => {
    let widest = 0;
    for (const line of lines) {
      const ws = line.map((wd) =>
        measure(ctx, wd.t, { size: sz * (wd.scale ?? 1), family: wd.key ? F_.italic : F_.serif, track: -0.01 }),
      );
      widest = Math.max(widest, ws.reduce((a, b) => a + b, 0) + sz * 0.24 * (line.length - 1));
    }
    return Math.min(sz, (sz * width) / widest);
  };
  const say = (
    ctx: Ctx,
    F: number,
    lines: Word[][],
    from: number,
    to: number,
    o: { x: number; y: number; size: number; align?: "left" | "center"; gap?: number },
  ) => {
    if (F < from || F >= to) return;
    const drift = (F - from) * 0.1 * u; // every hold rises a little
    ladder(ctx, lines, o.x, o.y - drift, F, {
      size: fit(ctx, lines, o.size, W - 2 * L.safe.x),
      face: F_.serif,
      italic: F_.italic,
      ink: C.ink,
      accent: C.accent,
      fps: FPS,
      align: o.align ?? "left",
      gap: o.gap ?? 0.06,
      out: to - 9,
    });
  };
  const captions = (ctx: Ctx, F: number) => {
    const c = { x: D.cap.x, y: D.cap.y, size: D.cap.size };
    // hook: centred and large
    say(ctx, F, [[w("How do", 4)], [w("you get", 12)], [w("paid?", 22, { key: true, scale: 1.45 })]], 0, T.cards + 2, {
      x: cx,
      y: D.hook.y,
      size: D.hook.size,
      align: "center",
      gap: 0.02,
    });
    say(
      ctx,
      F,
      [
        [w("Two", 96), w("plans,", 101)],
        [w("side", 108, { scale: 0.72 }), w("by", 112, { scale: 0.72 }), w("side", 117, { key: true, scale: 1.2 })],
      ],
      94,
      T.lift,
      c,
    );
    say(
      ctx,
      F,
      [
        [w("No", 252), w("setup,", 257)],
        [w("cancel", 266, { scale: 0.72 }), w("anytime", 273, { key: true, scale: 1.2 })],
      ],
      250,
      T.third,
      c,
    );
    say(
      ctx,
      F,
      [
        [w("Only", 386), w("sometimes?", 392)],
        [w("pay", 402, { scale: 0.72 }), w("per booking", 409, { key: true, scale: 1.2 })],
      ],
      384,
      T.away,
      c,
    );
    say(
      ctx,
      F,
      [
        [w("Want", 498), w("the", 503)],
        [w("full", 508, { scale: 0.72 }), w("breakdown?", 514, { key: true, scale: 1.2 })],
      ],
      496,
      T.cta,
      c,
    );
  };

  // ---- the reply bubble: a typing indicator, then "hour" typed a letter at a time; it pulses on the CTA's beats
  const bubble = (ctx: Ctx, F: number) => {
    const a0 = T.away + 30;
    if (F < a0) return;
    const pop = spring((F - a0) / FPS, { freq: 2.6, damp: 0.55 }),
      n = TYPE_AT.filter((t) => F >= t).length,
      shown = REPLY.slice(0, n),
      ts = D.bubble.text,
      o = { size: ts, family: F_.sans, weight: 600, track: -0.02 },
      tw = measure(ctx, shown || " ", o),
      bh = ts * 1.8,
      dotsW = ts * 1.6,
      // the bubble widens a letter at a time, springing to each new width
      grown = n
        ? lerp(
            measure(ctx, REPLY.slice(0, n - 1) || " ", o),
            tw,
            clamp(spring((F - TYPE_AT[n - 1]!) / FPS, { freq: 4, damp: 0.7 }), 0, 1.1),
          )
        : 0,
      bw = Math.max(dotsW, grown) + ts * 1.1;
    // pulse: a beat-locked swell and an expanding ring on every beat after the CTA lands
    const bt = Math.max(0, F - T.cta),
      beatF = bt % 15,
      pulse = F >= T.cta ? Math.exp(-beatF * 0.25) : 0,
      k = pop * (1 + 0.07 * pulse),
      av = bh * 0.42,
      total = av * 2 + 18 * u + bw,
      x0 = cx - total / 2,
      y = D.bubble.y + Math.sin(F * 0.08) * 5 * u;
    ctx.save();
    ctx.translate(cx, y);
    ctx.scale(k, k);
    ctx.translate(-cx, -y);
    // ring
    if (F >= T.cta) {
      const ring = beatF / 15;
      ctx.save();
      ctx.globalAlpha = (1 - ring) * 0.5;
      ctx.strokeStyle = C.accent;
      ctx.lineWidth = 4 * u;
      rr(
        ctx,
        x0 + av * 2 + 18 * u - ring * 36 * u,
        y - bh / 2 - ring * 36 * u,
        bw + ring * 72 * u,
        bh + ring * 72 * u,
        bh / 2 + ring * 36 * u,
      );
      ctx.stroke();
      ctx.restore();
    }
    // avatar: the viewer, a warm dot with a head-and-shoulders mark
    dot(ctx, x0 + av, y + bh * 0.18, av, C.accent2);
    dot(ctx, x0 + av, y + bh * 0.18 - av * 0.22, av * 0.34, C.deep!);
    ctx.save();
    ctx.beginPath();
    ctx.arc(x0 + av, y + bh * 0.18, av, 0, TAU);
    ctx.clip();
    dot(ctx, x0 + av, y + bh * 0.18 + av * 0.78, av * 0.62, C.deep!);
    ctx.restore();
    // the bubble with a tail toward the avatar
    const bx = x0 + av * 2 + 18 * u;
    ctx.save();
    ctx.shadowColor = "rgba(122,60,255,0.32)";
    ctx.shadowBlur = 40 * u;
    ctx.shadowOffsetY = 18 * u;
    ctx.fillStyle = C.accent;
    rr(ctx, bx, y - bh / 2, bw, bh, bh / 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(bx + 10 * u, y + bh * 0.12);
    ctx.lineTo(bx - 14 * u, y + bh * 0.5);
    ctx.lineTo(bx + bh * 0.5, y + bh * 0.42);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    if (!n) {
      // typing indicator
      for (let i = 0; i < 3; i++) {
        const h = Math.max(0, Math.sin((F - a0) * 0.35 - i * 0.9));
        dot(ctx, bx + bw / 2 + (i - 1) * ts * 0.42, y - h * 8 * u, ts * 0.12, C.surface);
      }
    } else {
      text(ctx, shown, bx + ts * 0.55, y + ts * 0.36, { ...o, color: C.surface });
      // caret blinks until the CTA
      if (F < T.cta + 6 && Math.floor(F / 8) % 2 === 0) {
        ctx.fillStyle = C.accent2;
        ctx.fillRect(bx + ts * 0.55 + tw + 10 * u, y - ts * 0.42, 4 * u, ts * 0.86);
      }
    }
    ctx.restore();
    // a small "reply" label above, until the CTA takes over
    const la = prog(F, a0 + 6, a0 + 16) * (1 - prog(F, T.cta, T.cta + 8));
    if (la > 0) sans("your reply", bx, y - bh / 2 - 22 * u, 24 * u, 600, C.muted, { alpha: la, track: 0.02 })(ctx);
  };

  // ---- the call to action: a big ladder in the lower part of the frame, the fictional mark small under it
  const cta = (ctx: Ctx, F: number) => {
    if (F < T.cta) return;
    const s = T.cta;
    const lines: Word[][] = D.cta.two
      ? [
          [w("Comment", s + 3), w("“hour”", s + 9, { key: true, scale: 1.3 })],
          [w("for the", s + 16, { scale: 0.62 }), w("guide", s + 21, { scale: 0.8 })],
        ]
      : [
          [w("Comment", s + 3)],
          [w("“hour”", s + 9, { key: true, scale: 1.45 })],
          [w("for the", s + 16, { scale: 0.58 }), w("guide", s + 21, { scale: 0.72 })],
        ];
    const drift = (F - s) * 0.12 * u;
    ladder(ctx, lines, cx, D.cta.y - drift, F, {
      size: fit(ctx, lines, D.cta.size, W - 2 * L.safe.x),
      face: F_.serif,
      italic: F_.italic,
      ink: C.ink,
      accent: C.accent,
      fps: FPS,
      align: "center",
      gap: 0.02,
    });
    const m = spring((F - (s + 30)) / FPS, { freq: 2.6, damp: 0.7 });
    if (m > 0) {
      const o = { size: 26 * u, family: F_.sans, weight: 600, track: -0.01 },
        a = `${P.product}`,
        b = " · a fictional product",
        aw = measure(ctx, a, { ...o, weight: 800 }),
        bw2 = measure(ctx, b, { ...o, weight: 400 }),
        x = cx - (aw + bw2 + 24 * u) / 2;
      ctx.save();
      ctx.globalAlpha = clamp(m * 1.5);
      ctx.translate(0, (1 - m) * 20 * u - drift);
      dot(ctx, x + 8 * u, D.cta.mark - 9 * u, 8 * u, C.accent);
      text(ctx, a, x + 24 * u, D.cta.mark, { ...o, weight: 800, color: C.ink });
      text(ctx, b, x + 24 * u + aw, D.cta.mark, { ...o, weight: 400, color: C.muted });
      ctx.restore();
    }
  };

  const paint = (ctx: Ctx, env: Env, F: number) => {
    F = clamp(F, 0, N - 1);
    ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
    ctx.fillStyle = C.ground;
    ctx.fillRect(0, 0, W, H);
    // a faint dot field that drifts upward: the cream ground always has a surface moving under it
    ctx.fillStyle = C.line;
    const g = 54 * u,
      oy = (F * 0.9 * u) % g;
    for (let x = (W / 2) % g; x < W; x += g)
      for (let y = -oy + g; y < H + g; y += g) ctx.fillRect(x - 2 * u, y - 2 * u, 4 * u, 4 * u);
    // a handheld camera: a slow float and breath on the whole scene, so no hold is ever still
    const k = 1.015 + 0.015 * Math.sin((F / 140) * TAU),
      dx = 8 * u * Math.sin((F / 190) * TAU),
      dy = 6 * u * Math.cos((F / 160) * TAU);
    ctx.save();
    ctx.translate(cx + dx, cy + dy);
    ctx.scale(k, k);
    ctx.translate(-cx, -cy);
    equation(ctx, F);
    cards(ctx, F);
    bubble(ctx, F);
    captions(ctx, F);
    cta(ctx, F);
    ctx.restore();
  };
  const cuts = [0, T.cards, T.lift, T.third, T.away, T.cta, N],
    names = ["hook", "compare", "lift", "third", "reply", "cta"];
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
      mood: "soft",
      hits: [T.cta],
      // a slide for each card as it lands: Solo, Team, the lift, the setup fee, the third card, the stack leaving
      whooshes: [T.cards + 14, T.cards + 24, T.lift + 12, SETUP_AT + 12, T.third + 22, T.away + 30],
      ticks: [...SOLO.ticks, ...TEAM.ticks, TAG_AT, PLUS_AT, ...PER.ticks, ...TYPE_AT],
      sign: T.cta + 15,
      gain: 0.67, // about −16 LUFS
    }),
  };
}

export const offerCards = make("vertical", "offerCards");
export const offerCardsPortrait = make("portrait", "offerCardsPortrait");
