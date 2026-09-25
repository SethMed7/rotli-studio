// STUDY 10 · LAYER STACK (24 s, 30 fps). An isometric explainer for a fictional scheduling assistant: three
// thick slabs, each marked '?', drop into a stack over a sunburst of thin rays; each lifts out and opens into its
// own small scene (a desk where the ask is typed, a node diagram of agents, a dark square of memory), then the
// three fly home and lock with a click, their '?' marks flipping to ticks. Captions are serif word ladders.
// One source, designed for vertical (primary) and square. Brand: the neutral pack, palette "cobalt".
// Brief: series/studies/briefs/layer-stack.json · prompt: series/studies/prompts/layer-stack.prompt.md
//
// Like the reference study, the whole film is one continuous function paint(F) of a (fractional) frame F; the
// shots only name the sections on the timeline.
import PACK from "../../../brand/packs/studio/pack.json";
import type { Ctx, Env } from "../core";
import { rng } from "../core";
import type { Film, Shot } from "../film";
import { motionBlur } from "../kit/blur";
import { ladder, w, type Word } from "../kit/captions";
import { clamp, ease, lerp, prog, spring, window01 } from "../kit/motion";
import { usePack } from "../kit/pack";
import { beatScore } from "../kit/score";
import { layout, type Size } from "../kit/sizes";
import { letters, measure, text } from "../kit/type";
import { card, check } from "../kit/ui";

const P = usePack(PACK),
  C = P.palette("cobalt"),
  F_ = P.face;
const FPS = 30,
  BPM = 120,
  N = 720; // a beat is 15 frames, a bar 60
// the timeline, in frames (every cut on a beat)
const T = { ask: 60, agents: 180, memory: 330, lock: 480, sign: 630 };
const LAND = [45, 30, 15]; // hook: the bottom slab lands first, the top one last (all on beats)
const CLICK = 540; // the stack locks
const FLIP = [552, 567, 582]; // '?' marks flip to ticks, top to bottom

const C30 = Math.cos(Math.PI / 6),
  S30 = Math.sin(Math.PI / 6);
/** a pack colour, darkened (k < 1) or lightened toward white (k > 1): the iso side faces */
const tone = (hex: string, k: number) => {
  const n = parseInt(hex.slice(1), 16),
    c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(k <= 1 ? v * k : v + (255 - v) * (k - 1)));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
};
const rgba = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

// the three layers, top to bottom
type Layer = { name: string; top: string; left: string; right: string; glyph: string; label: string };
const LAYERS: Layer[] = [
  {
    name: "the ask",
    top: C.accent,
    left: tone(C.accent, 0.72),
    right: tone(C.accent, 0.86),
    glyph: C.ink,
    label: C.ink,
  },
  {
    name: "the agents",
    top: C.accent2,
    left: tone(C.accent2, 0.62),
    right: tone(C.accent2, 0.8),
    glyph: C.surface,
    label: C.surface,
  },
  { name: "memory", top: "#22325f", left: tone(C.deep, 0.7), right: C.deep, glyph: C.accent, label: C.surface },
];

// the sunburst's angle: the integral of a piecewise-linear spin rate, in closed form (no jumps between subframes)
const SPIN: [number, number][] = [
  [0, 0.03],
  [45, 0.004],
  [CLICK, 0.004],
  [CLICK + 20, 0.026],
  [T.sign, 0.026],
  [T.sign + 50, 0.01],
  [N, 0.01],
];
const spinAngle = (F: number) => {
  let a = 0;
  for (let i = 1; i < SPIN.length; i++) {
    const [f0, r0] = SPIN[i - 1]!,
      [f1, r1] = SPIN[i]!;
    if (F <= f0) break;
    const t = Math.min(F, f1) - f0,
      rt = r0 + ((r1 - r0) * t) / (f1 - f0);
    a += ((r0 + rt) / 2) * t;
  }
  return a;
};

// the memory starburst: points around a centre (seeded once, never per frame)
const STAR = (() => {
  const R = rng(10),
    n = 26;
  return Array.from({ length: n }, (_, i) => ({
    a: (i / n) * Math.PI * 2 + (R() - 0.5) * 0.18,
    r: 0.38 + R() * 0.52,
    s: 0.7 + R() * 0.6,
    ph: R() * Math.PI * 2,
  }));
})();

export function make(size: Size, id: string): Film {
  const L = layout(size),
    { W, H, u, cx } = L,
    V = L.tall;
  // ---- per-size design
  const SX = cx,
    SY = (V ? 1190 : 665) * u, // the stack's centre (the middle slab's top face)
    R = (V ? 165 : 124) * u, // a slab's footprint half-extent, in local px
    TH = (V ? 74 : 62) * u, // slab thickness
    GAP = (V ? 42 : 34) * u, // the float gap, before the lock
    GAPL = 10 * u, // the gap once locked
    K = V ? 1.32 : 1.3, // how much a slab grows when it opens into its scene
    SCY = SY + (V ? 40 : 60) * u, // a scene's slab centre
    OUT = { x: V ? 1.25 * W : 1.1 * W, y: V ? 0.3 * H : 0.4 * H }; // where an exiting slab goes

  // ---- iso helpers: local (x down-right, y down-left, z up) px about a slab's top-face centre, scaled by k
  type Slab = { x: number; y: number; k: number; flat: number };
  const iso = (s: Slab, x: number, y: number, z: number): [number, number] => [
    s.x + (x - y) * C30 * s.k,
    s.y + ((x + y) * S30 - z) * s.k,
  ];
  const poly = (ctx: Ctx, pts: [number, number][], fill: string) => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  };
  /** an iso box from (x0,y0,z0) to (x1,y1,z1), local px on slab s: top, then the two faces that face us */
  const box = (
    ctx: Ctx,
    s: Slab,
    [x0, y0, z0]: number[],
    [x1, y1, z1]: number[],
    top: string,
    left: string,
    right: string,
  ) => {
    const p = (x: number, y: number, z: number) => iso(s, x, y, z);
    poly(ctx, [p(x0, y1, z1), p(x1, y1, z1), p(x1, y1, z0), p(x0, y1, z0)], left);
    poly(ctx, [p(x1, y0, z1), p(x1, y1, z1), p(x1, y1, z0), p(x1, y0, z0)], right);
    poly(ctx, [p(x0, y0, z1), p(x1, y0, z1), p(x1, y1, z1), p(x0, y1, z1)], top);
  };
  /** draw in a plane: (ax, ay) is the plane's x axis on screen, (bx, by) its y axis */
  const plane = (ctx: Ctx, o: [number, number], ax: number, ay: number, bx: number, by: number, fn: () => void) => {
    ctx.save();
    ctx.transform(ax, ay, bx, by, o[0], o[1]);
    fn();
    ctx.restore();
  };
  /** a rounded quad (the slab top, which flattens into a square) */
  const quad = (ctx: Ctx, pts: [number, number][], r: number) => {
    ctx.beginPath();
    const m = (a: [number, number], b: [number, number]): [number, number] => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    ctx.moveTo(...m(pts[3]!, pts[0]!));
    for (let i = 0; i < 4; i++) {
      const a = pts[i]!,
        b = pts[(i + 1) % 4]!;
      ctx.arcTo(a[0], a[1], b[0], b[1], r);
    }
    ctx.closePath();
  };
  const dot = (ctx: Ctx, x: number, y: number, r: number, color: string) => {
    if (r <= 0) return;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  };

  // ---- where each slab is, as a pure function of the frame
  const lockK = (F: number) => spring((F - CLICK) / FPS, { freq: 3.4, damp: 0.42 });
  const stackY = (i: number, F: number) => SY + (i - 1) * (TH + lerp(GAP, GAPL, lockK(F)));
  const bob = (i: number, F: number) => Math.sin((F / 64) * Math.PI * 2 + i * 1.3) * 5 * u;
  const slabAt = (i: number, F: number): Slab | null => {
    const home: Slab = { x: SX, y: stackY(i, F) + bob(i, F), k: 1, flat: 0 };
    // hook: drop from above the frame, a small bounce on landing
    if (F < T.ask) {
      const land = LAND[i]!;
      if (F < land - 14) return null;
      const fall = ease.inCubic(prog(F, land - 14, land)),
        g = F - land,
        bounce = g > 0 ? Math.exp(-g / 5) * Math.sin(g * 0.55) * 16 * u : 0;
      return {
        ...home,
        y: stackY(i, F) - (1 - fall) * (V ? 1350 : 900) * u + bounce + bob(i, F) * prog(F, land, land + 20),
      };
    }
    const scene = [T.ask, T.agents, T.memory][i]!,
      end = [T.agents, T.memory, T.lock][i]!;
    // before its scene (and after the ask begins), a slab waits below the frame; it fell there at the ask
    const drop = ease.inCubic(prog(F, T.ask + 2, T.ask + 22)) * H * 0.75;
    if (F < scene) return i === 0 ? null : { ...home, y: home.y + drop };
    if (F < end) {
      // lift out (the top slab) or rise from below (the others), then settle at the scene's centre, grown
      const s = spring((F - scene) / FPS, { freq: 1.25, damp: 0.78 }),
        from = i === 0 ? stackY(0, T.ask) : stackY(i, F) + H * 0.75,
        arc = i === 0 ? Math.sin(Math.PI * prog(F, scene, scene + 30)) * 130 * u : 0;
      const at: Slab = {
        x: SX,
        y: lerp(from, SCY, s) - arc + bob(i, F) * s,
        k: lerp(1, K, s),
        flat:
          i === 2
            ? ease.inOutCubic(prog(F, T.memory + 20, T.memory + 46)) *
              (1 - ease.inOutCubic(prog(F, T.lock - 18, T.lock - 2)))
            : 0,
      };
      if (i === 2) return at;
      // leave: the ask exits up-left, the agents up-right
      const go = ease.inCubic(prog(F, end - 18, end + 2)),
        dir = i === 0 ? -1 : 1;
      return { ...at, x: at.x + dir * go * OUT.x, y: at.y - go * OUT.y, k: at.k * (1 - 0.2 * go) };
    }
    // the lock: memory sinks into the bottom slot, the other two fly home from where they left
    if (i === 2) {
      const s = spring((F - T.lock) / FPS, { freq: 1.4, damp: 0.8 });
      return { x: SX, y: lerp(SCY, home.y, s), k: lerp(K, 1, s), flat: 0 };
    }
    const s = spring((F - (T.lock + (i === 0 ? 14 : 4))) / FPS, { freq: 1.35, damp: 0.82 }),
      dir = i === 0 ? -1 : 1,
      ox = SX + dir * OUT.x,
      oy = SCY - OUT.y;
    return { x: lerp(ox, home.x, s), y: lerp(oy, home.y, s), k: lerp(K * 0.8, 1, s), flat: 0 };
  };

  // ---- one slab: its soft shadow, the three flat faces, the name on the left face, '?' or a tick on the right
  const slab = (ctx: Ctx, i: number, s: Slab, F: number) => {
    const Ly = LAYERS[i]!,
      m = s.flat,
      th = TH * (1 - m),
      Q = R * C30 * 1.72; // half the side of the square the memory slab flattens into (screen px at k = 1)
    const iso4 = [iso(s, -R, -R, 0), iso(s, R, -R, 0), iso(s, R, R, 0), iso(s, -R, R, 0)]; // N E S W
    const sq: [number, number][] = [
      [s.x - Q * s.k, s.y - Q * s.k],
      [s.x + Q * s.k, s.y - Q * s.k],
      [s.x + Q * s.k, s.y + Q * s.k],
      [s.x - Q * s.k, s.y + Q * s.k],
    ];
    const top = iso4.map((p, j): [number, number] => [lerp(p[0], sq[j]![0], m), lerp(p[1], sq[j]![1], m)]);
    const down = (p: [number, number]): [number, number] => [p[0], p[1] + th * s.k];
    // shadow: the top's outline, dropped and blurred (the one place depth is not flat)
    ctx.save();
    ctx.shadowColor = rgba(C.deep, 0.2);
    ctx.shadowBlur = 34 * u * s.k * ctx.getTransform().d;
    // the shadow offset ignores the transform (the push-in scales it), so match it in device px
    const d = ctx.getTransform().d;
    ctx.shadowOffsetY = 10000 * d;
    ctx.translate(0, -10000 + (th + 26 * u) * s.k);
    quad(ctx, top, 22 * u * m * s.k);
    ctx.fillStyle = "#000";
    ctx.fill();
    ctx.restore();
    // faces
    if (th > 0.5) {
      poly(ctx, [top[3]!, top[2]!, down(top[2]!), down(top[3]!)], Ly.left);
      poly(ctx, [top[2]!, top[1]!, down(top[1]!), down(top[2]!)], Ly.right);
    }
    quad(ctx, top, 22 * u * m * s.k);
    ctx.fillStyle = Ly.top;
    ctx.fill();
    if (m > 0.02) return;
    // the name, on the left face (from its scene on)
    const named = [T.ask + 30, T.agents + 30, T.memory + 30][i]!,
      na = prog(F, named, named + 12);
    if (na > 0)
      plane(ctx, top[3]!, C30 * s.k, S30 * s.k, 0, s.k, () =>
        text(ctx, Ly.name, 22 * u, TH * 0.64, {
          size: 28 * u,
          family: F_.sans,
          weight: 600,
          color: Ly.label,
          alpha: na,
          track: 0.01,
        }),
      );
    // '?' on the right face; at the lock it flips (turns about the face's vertical) and comes back a tick
    const fl = prog(F, FLIP[i]!, FLIP[i]! + 10),
      turn = Math.cos(Math.PI * fl),
      faceW = 2 * R;
    plane(ctx, top[2]!, C30 * s.k, -S30 * s.k, 0, s.k, () => {
      ctx.translate(faceW / 2, TH / 2);
      ctx.scale(Math.max(0.001, Math.abs(turn)), 1);
      if (fl < 0.5)
        text(ctx, "?", 0, TH * 0.3, {
          size: TH * 0.82,
          family: F_.sans,
          weight: 800,
          color: Ly.glyph,
          align: "center",
        });
      else check(ctx, 0, 0, TH * 0.5, 1, Ly.glyph, 7 * u);
    });
  };

  // ---- the sunburst: thin tapering rays behind the stack, bounded so the captions sit on clean ground
  const RAYS = 64;
  const rays = (ctx: Ctx, F: number) => {
    const a0 = spinAngle(F),
      grow = 0.35 + 0.65 * ease.outCubic(prog(F, 0, 30)),
      r0 = 60 * u,
      rMax = (V ? 600 : 520) * u * grow;
    ctx.save();
    ctx.fillStyle = rgba(C.accent2, 0.3);
    for (let k = 0; k < RAYS; k++) {
      const a = a0 + (k / RAYS) * Math.PI * 2,
        r1 = rMax * (k % 2 ? 0.72 : 1),
        wd = 2.4 * u,
        nx = -Math.sin(a),
        ny = Math.cos(a);
      if (r1 <= r0) continue;
      ctx.beginPath();
      ctx.moveTo(SX + Math.cos(a) * r0 + nx * wd, SY + Math.sin(a) * r0 + ny * wd);
      ctx.lineTo(SX + Math.cos(a) * r1, SY + Math.sin(a) * r1);
      ctx.lineTo(SX + Math.cos(a) * r0 - nx * wd, SY + Math.sin(a) * r0 - ny * wd);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  };

  // ---- scene 1 · the ask: a desk with a calendar block and a laptop; the ask is typed into a card above
  const ASK = "an hour with Ana and Ben",
    TYPE0 = 104,
    PER = 1.7,
    TYPED = TYPE0 + ASK.length * PER,
    PICK = 156;
  const askScene = (ctx: Ctx, F: number) => {
    const s0 = slabAt(0, F);
    if (!s0 || F < T.ask + 20 || F >= T.agents) return;
    const s: Slab = { ...s0, x: s0.x + 10 * u * s0.k, k: s0.k * (V ? 1.3 : 1.2) }; // the desk, a touch larger than life
    const out = ease.inCubic(prog(F, T.agents - 26, T.agents - 14));
    const g = (d: number) => clamp(spring((F - (T.ask + 24) - d) / FPS, { freq: 2.2, damp: 0.62 }), 0, 1.3) * (1 - out);
    const white = C.surface,
      wl = tone("#dfe5f3", 0.88),
      wr = "#e7ecf7";
    // desk: four legs, then the board (z grows up out of the slab)
    const gd = g(0),
      H1 = 62 * u * gd,
      dx0 = -118 * u,
      dx1 = 72 * u,
      dy0 = -80 * u,
      dy1 = 44 * u;
    if (gd > 0.01) {
      for (const [lx, ly] of [
        [dx0 + 8 * u, dy0 + 8 * u],
        [dx1 - 16 * u, dy0 + 8 * u],
        [dx0 + 8 * u, dy1 - 16 * u],
        [dx1 - 16 * u, dy1 - 16 * u],
      ] as [number, number][])
        box(ctx, s, [lx, ly, 0], [lx + 8 * u, ly + 8 * u, H1], C.ink, tone(C.ink, 0.8), tone(C.ink, 1.25));
      box(ctx, s, [dx0, dy0, H1], [dx1, dy1, H1 + 10 * u * gd], white, wl, wr);
    }
    const top = H1 + 10 * u * gd;
    // laptop: a base on the desk and a screen standing at its back edge
    const gl = g(6);
    if (gl > 0.01) {
      box(
        ctx,
        s,
        [-104 * u, -56 * u, top],
        [-40 * u, 10 * u, top + 4 * u],
        "#c9d2e8",
        tone("#c9d2e8", 0.8),
        tone("#c9d2e8", 0.9),
      );
      box(ctx, s, [-110 * u, -56 * u, top], [-104 * u, 10 * u, top + 50 * u * gl], C.ink, tone(C.ink, 0.8), "#24345f");
      // the screen's glow: a few flat lines on its face (the face at x = -104 looks down-right)
      const scr = (yy: number, zz: number, len: number, col: string) => {
        const a = iso(s, -104 * u, yy, top + zz * gl),
          b = iso(s, -104 * u, yy - len, top + zz * gl);
        ctx.strokeStyle = col;
        ctx.lineWidth = 3 * u * s.k;
        ctx.beginPath();
        ctx.moveTo(...a);
        ctx.lineTo(...b);
        ctx.stroke();
      };
      ctx.save();
      ctx.globalAlpha *= prog(F, TYPE0, TYPE0 + 8);
      scr(0, 38 * u, 46 * u, C.accent);
      scr(0, 28 * u, 34 * u, tone(C.accent2, 1.3));
      scr(0, 18 * u, 40 * u, tone(C.accent2, 1.3));
      ctx.restore();
    }
    // the calendar block: a cube with a month grid on top; the chosen slot fills when the ask is typed
    const gc = g(12),
      c0 = 0,
      c1 = 56 * u,
      cy0 = -52 * u,
      cy1 = 4 * u,
      ch = 56 * u * gc;
    if (gc > 0.01) {
      box(ctx, s, [c0, cy0, top], [c1, cy1, top + ch], white, wl, wr);
      // the amber header band across the front-right face
      box(ctx, s, [c1 - 0.5 * u, cy0, top + ch - 14 * u * gc], [c1, cy1, top + ch], C.accent, C.accent, C.accent);
      // the date on the right face
      plane(ctx, iso(s, c1, cy1, top + ch), C30 * s.k, -S30 * s.k, 0, s.k, () =>
        text(ctx, "14", (cy1 - cy0) / 2, 44 * u * gc, {
          size: 28 * u,
          family: F_.sans,
          weight: 800,
          color: C.ink,
          align: "center",
          alpha: clamp(gc),
        }),
      );
      // a 4 × 4 grid on the top face
      const pick = spring((F - PICK) / FPS, { freq: 3, damp: 0.5 });
      for (let a = 0; a < 4; a++)
        for (let b = 0; b < 4; b++) {
          const x = c0 + 6 * u + a * 12.5 * u,
            y = cy0 + 6 * u + b * 12.5 * u,
            hot = a === 2 && b === 1,
            sz = 9 * u;
          const zz = top + ch + (hot ? 6 * u * clamp(pick) : 0);
          poly(
            ctx,
            [iso(s, x, y, zz), iso(s, x + sz, y, zz), iso(s, x + sz, y + sz, zz), iso(s, x, y + sz, zz)],
            hot && pick > 0.02 ? C.accent2 : "#d6ddee",
          );
        }
    }
    // a mug, for scale and warmth
    const gm = g(18);
    if (gm > 0.01)
      box(
        ctx,
        s,
        [30 * u, 18 * u, top],
        [46 * u, 34 * u, top + 20 * u * gm],
        C.accent2,
        tone(C.accent2, 0.62),
        tone(C.accent2, 0.8),
      );
    // the ask card: flat UI floating above the scene, typed on
    const ca = spring((F - (T.ask + 34)) / FPS, { freq: 2.4, damp: 0.7 }) * (1 - out);
    if (ca > 0.01) {
      const cw = (V ? 620 : 560) * u,
        chh = 104 * u,
        x = cx - cw / 2,
        y = (V ? 790 : 318) * u + (1 - ca) * 30 * u;
      ctx.save();
      ctx.globalAlpha *= clamp(ca);
      card(ctx, x, y, cw, chh, {
        r: 26 * u,
        fill: C.surface,
        shadow: { blur: 40 * u, y: 14 * u, color: rgba(C.deep, 0.16) },
      });
      dot(ctx, x + 50 * u, y + chh / 2, 14 * u, C.accent);
      const n = clamp(Math.floor((F - TYPE0) / PER) + 1, 0, ASK.length),
        s0 = ASK.slice(0, n),
        o = { size: 34 * u, family: F_.sans, weight: 400, color: C.ink, track: -0.01 },
        tx = x + 86 * u,
        by = y + chh / 2 + 12 * u;
      if (n === 0) text(ctx, "Ask Oriel…", tx, by, { ...o, color: C.muted });
      else text(ctx, s0, tx, by, o);
      const blink = F < TYPED + 4 || Math.floor(F / 9) % 2 === 0;
      if (blink) {
        ctx.fillStyle = C.accent2;
        ctx.fillRect(tx + (n ? measure(ctx, s0, o) : 0) + 4 * u, by - 30 * u, 3 * u, 38 * u);
      }
      ctx.restore();
    }
  };

  // ---- scene 2 · the agents: four nodes on the slab, dotted links that draw on, two orbit ellipses
  const NODES: { x: number; y: number; name: string }[] = [
    { x: -1, y: -1, name: "Calendars" },
    { x: 1, y: -1, name: "Time zones" },
    { x: 1, y: 1, name: "Invites" },
    { x: -1, y: 1, name: "Rooms" },
  ];
  const LINKS: [number, number][] = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 0],
  ];
  const LINK0 = T.agents + 50,
    LINK_EVERY = 12;
  const agentsScene = (ctx: Ctx, F: number) => {
    const s = slabAt(1, F);
    if (!s || F < T.agents + 16 || F >= T.memory) return;
    const out = ease.inCubic(prog(F, T.memory - 30, T.memory - 18)),
      NR = R * 0.54,
      ZN = 34 * u;
    const pos = (j: number) => {
      const n = NODES[j]!;
      return { x: n.x * NR, y: n.y * NR };
    };
    const g = (j: number) =>
      clamp(spring((F - (T.agents + 22) - j * 6) / FPS, { freq: 2.4, damp: 0.55 }), 0, 1.4) * (1 - out);
    // links: dotted, on the plane the nodes float in, each drawn on in turn
    ctx.save();
    ctx.lineCap = "round";
    ctx.setLineDash([0.1, 11 * u * s.k]);
    ctx.lineWidth = 5 * u * s.k;
    ctx.strokeStyle = C.surface;
    LINKS.forEach(([a, b], k) => {
      const d = ease.outCubic(prog(F, LINK0 + k * LINK_EVERY, LINK0 + k * LINK_EVERY + 16)) * (1 - out);
      if (d <= 0) return;
      const pa = pos(a),
        pb = pos(b),
        A = iso(s, pa.x, pa.y, ZN * 0.5),
        B = iso(s, lerp(pa.x, pb.x, d), lerp(pa.y, pb.y, d), ZN * 0.5);
      ctx.beginPath();
      ctx.moveTo(...A);
      ctx.lineTo(...B);
      ctx.stroke();
    });
    ctx.restore();
    // nodes: little pucks, back to front, each bobbing on its own phase
    const order = [0, 1, 3, 2];
    for (const j of order) {
      const k = g(j);
      if (k <= 0.01) continue;
      const p = pos(j),
        hz = ZN + Math.sin(F / 14 + j * 1.7) * 4 * u,
        r = 30 * u * Math.min(k, 1.15);
      // its shadow on the slab
      ctx.save();
      ctx.globalAlpha *= 0.25 * clamp(k);
      const sh = iso(s, p.x, p.y, 0);
      ctx.beginPath();
      ctx.ellipse(sh[0], sh[1], r * C30 * 1.4 * s.k, r * S30 * 1.4 * s.k, 0, 0, Math.PI * 2);
      ctx.fillStyle = C.deep;
      ctx.fill();
      ctx.restore();
      const c = iso(s, p.x, p.y, hz),
        hgt = 18 * u * s.k * clamp(k),
        rx = r * 1.4 * C30 * s.k,
        ry = r * 1.4 * S30 * s.k;
      // side band then the top ellipse
      ctx.beginPath();
      ctx.ellipse(c[0], c[1] + hgt, rx, ry, 0, 0, Math.PI);
      ctx.lineTo(c[0] - rx, c[1]);
      ctx.ellipse(c[0], c[1], rx, ry, 0, Math.PI, 0, true);
      ctx.closePath();
      ctx.fillStyle = "#c9d2e8";
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(c[0], c[1], rx, ry, 0, 0, Math.PI * 2);
      ctx.fillStyle = C.surface;
      ctx.fill();
      dot(ctx, c[0], c[1], 7 * u * s.k * clamp(k), j === 0 ? C.accent : C.ink);
    }
    // two thin orbit ellipses wrap the diagram; a dot rides each
    const cc = iso(s, 0, 0, ZN);
    for (let e = 0; e < 2; e++) {
      const d = ease.inOutCubic(prog(F, T.agents + 36 + e * 14, T.agents + 80 + e * 14)) * (1 - out);
      if (d <= 0) continue;
      const rx = R * 2.4 * (e ? 0.9 : 1),
        ry = R * 0.74 * (e ? 1.25 : 1),
        rot = (e ? -1 : 1) * 0.16,
        a0 = e ? 0.4 : 2.2;
      ctx.save();
      ctx.strokeStyle = e ? C.accent : C.ink;
      ctx.globalAlpha *= e ? 0.9 : 0.55;
      ctx.lineWidth = 2.5 * u;
      ctx.beginPath();
      ctx.ellipse(cc[0], cc[1], rx, ry, rot, a0, a0 + Math.PI * 2 * d);
      ctx.stroke();
      ctx.restore();
      const t = a0 + ((F - T.agents) / FPS) * (e ? -0.9 : 0.7),
        ex = Math.cos(t) * rx,
        ey = Math.sin(t) * ry;
      if (d > 0.98)
        dot(
          ctx,
          cc[0] + ex * Math.cos(rot) - ey * Math.sin(rot),
          cc[1] + ex * Math.sin(rot) + ey * Math.cos(rot),
          9 * u,
          e ? C.accent : C.ink,
        );
    }
    // labels: flat pills above each node
    for (const j of order) {
      const la = spring((F - (T.agents + 60) - j * 8) / FPS, { freq: 2.6, damp: 0.7 }) * (1 - out);
      if (la <= 0.01) continue;
      const p = pos(j),
        c = iso(s, p.x, p.y, ZN),
        name = NODES[j]!.name,
        o = { size: 24 * u, family: F_.sans, weight: 600, color: C.ink, track: 0 },
        tw = measure(ctx, name, o) + 34 * u,
        th = 44 * u,
        side = j === 1 ? 1 : j === 3 ? -1 : 0,
        lx = c[0] + side * 58 * u * s.k - (side === 0 ? tw / 2 : side < 0 ? tw : 0),
        below = j === 2, // the front node's label hangs below it, clear of the ring
        ly = c[1] + (below ? 64 : side === 0 ? -72 : -22) * u * s.k - th / 2 - (1 - la) * 12 * u;
      ctx.save();
      ctx.globalAlpha *= clamp(la);
      card(ctx, lx, ly, tw, th, {
        r: th / 2,
        fill: C.surface,
        shadow: { blur: 18 * u, y: 6 * u, color: rgba(C.deep, 0.18) },
      });
      text(ctx, name, lx + 17 * u, ly + th / 2 + 8.5 * u, o);
      ctx.restore();
    }
  };

  // ---- scene 3 · memory: the navy slab turns to face us as a dark square; a starburst of remembered points
  const MEM = [
    { a: -2.35, r: 0.62, t: "Ana · no Mondays", at: T.memory + 92 },
    { a: -0.35, r: 0.66, t: "Ben · after ten", at: T.memory + 104 },
    { a: 2.0, r: 0.62, t: "45 min is plenty", at: T.memory + 116 },
  ];
  const memoryScene = (ctx: Ctx, F: number) => {
    const s = slabAt(2, F);
    if (!s || s.flat < 0.6 || F < T.memory || F >= T.lock) return;
    // the memory fades as the square tilts back into a slab (no blank beat between them)
    ctx.save();
    ctx.globalAlpha *= prog(s.flat, 0.6, 1);
    const Q = R * C30 * 1.72 * s.k,
      out = ease.inCubic(prog(F, T.lock - 26, T.lock - 12)),
      spin = (F - T.memory) * 0.0035,
      born = (k: number) => ease.outCubic(prog(F, T.memory + 50 + k * 1.6, T.memory + 64 + k * 1.6)) * (1 - out);
    const pt = (a: number, r: number): [number, number] => [
      s.x + Math.cos(a + spin) * r * Q * 0.92,
      s.y + Math.sin(a + spin) * r * Q * 0.92,
    ];
    ctx.save();
    ctx.beginPath();
    ctx.rect(s.x - Q, s.y - Q, 2 * Q, 2 * Q);
    ctx.clip();
    // spokes from the centre
    ctx.lineWidth = 1.6 * u;
    STAR.forEach((p, k) => {
      const b = born(k);
      if (b <= 0) return;
      const e = pt(p.a, p.r * b);
      ctx.strokeStyle = rgba(C.surface, 0.28);
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(...e);
      ctx.stroke();
    });
    // neighbours linked round the rim
    ctx.strokeStyle = rgba(C.accent2, 0.9);
    ctx.lineWidth = 2 * u;
    STAR.forEach((p, k) => {
      const q = STAR[(k + 1) % STAR.length]!,
        b = Math.min(born(k), born(k + 1)) * prog(F, T.memory + 66 + k * 1.2, T.memory + 80 + k * 1.2);
      if (b <= 0) return;
      const A = pt(p.a, p.r),
        B = pt(q.a, q.r);
      ctx.beginPath();
      ctx.moveTo(...A);
      ctx.lineTo(lerp(A[0], B[0], b), lerp(A[1], B[1], b));
      ctx.stroke();
    });
    STAR.forEach((p, k) => {
      const b = born(k);
      if (b <= 0) return;
      const e = pt(p.a, p.r * b),
        tw = 0.75 + 0.25 * Math.sin(F / 7 + p.ph);
      dot(ctx, e[0], e[1], 4.5 * u * p.s * tw, C.surface);
    });
    // the centre: the one who remembers
    const hub = spring((F - (T.memory + 46)) / FPS, { freq: 2.6, damp: 0.5 }) * (1 - out);
    dot(ctx, s.x, s.y, 18 * u * hub, C.accent);
    ctx.restore();
    // the three memories: amber points with labels
    for (const m of MEM) {
      const k = spring((F - m.at) / FPS, { freq: 2.6, damp: 0.6 }) * (1 - out);
      if (k <= 0.01) continue;
      const [x, y] = pt(m.a, m.r);
      dot(ctx, x, y, 11 * u * Math.min(k, 1.2), C.accent);
      const o = { size: 24 * u, family: F_.sans, weight: 600, color: C.ink, track: 0 },
        tw = measure(ctx, m.t, o) + 34 * u,
        th = 44 * u,
        left = x > s.x,
        lx = left ? x - tw + 20 * u : x - 20 * u,
        ly = y - th - 20 * u - (1 - k) * 10 * u;
      ctx.save();
      ctx.globalAlpha *= clamp(k);
      card(ctx, lx, ly, tw, th, { r: th / 2, fill: C.surface });
      text(ctx, m.t, lx + 17 * u, ly + th / 2 + 8.5 * u, o);
      ctx.restore();
    }
    ctx.restore();
  };

  // ---- the lock: a click ring and short sparks off the stack's corners
  const lockFx = (ctx: Ctx, F: number) => {
    const t = prog(F, CLICK, CLICK + 22);
    if (t <= 0 || t >= 1) return;
    const a = R * C30 * 2;
    ctx.save();
    ctx.globalAlpha = (1 - t) * 0.9;
    ctx.strokeStyle = C.accent;
    ctx.lineWidth = 4 * u;
    ctx.lineCap = "round";
    for (let k = 0; k < 8; k++) {
      const ang = (k / 8) * Math.PI * 2 + Math.PI / 8,
        r0 = a * (1.05 + 0.25 * ease.outCubic(t)),
        r1 = r0 + 40 * u * (1 - t);
      ctx.beginPath();
      ctx.moveTo(SX + Math.cos(ang) * r0, SY + Math.sin(ang) * r0 * 0.75);
      ctx.lineTo(SX + Math.cos(ang) * r1, SY + Math.sin(ang) * r1 * 0.75);
      ctx.stroke();
    }
    ctx.restore();
  };

  // ---- sign-off: the wordmark set on the top slab's top face
  const wordmark = (ctx: Ctx, F: number) => {
    const s = slabAt(0, F);
    if (!s || F < T.sign) return;
    const o = { size: 118 * u, family: F_.serif, weight: 400, color: C.ink, align: "center" as const, track: -0.01 };
    // the top face: x axis up the W→N edge, y axis down the N→E edge; centred on the face
    plane(ctx, [s.x, s.y], C30, -S30, C30, S30, () =>
      letters(
        ctx,
        P.product,
        0,
        36 * u,
        o,
        (i) => spring((F - T.sign - 4 - i * 3) / FPS, { freq: 2.4, damp: 0.72 }),
        "rise",
      ),
    );
  };

  // ---- captions: serif ladders beside the action; a giant step numeral in its slab's colour
  type Cap = { from: number; out: number; lines: Word[][]; num?: number };
  const CAPS: Cap[] = [
    {
      from: 0,
      out: T.ask - 8,
      lines: [[w("The", 14, { scale: 0.5 })], [w("three-layer", 20, { key: true })], [w("calendar.", 27)]],
    },
    {
      from: T.ask,
      out: T.agents - 22,
      num: 0,
      lines: [
        [w("Layer 1", T.ask + 12, { scale: 0.42 })],
        [w("the", T.ask + 20, { scale: 0.75 }), w("ask", T.ask + 26, { key: true })],
      ],
    },
    {
      from: T.agents,
      out: T.memory - 24,
      num: 1,
      lines: [
        [w("Layer 2", T.agents + 16, { scale: 0.42 })],
        [w("the", T.agents + 24, { scale: 0.75 }), w("agents", T.agents + 30, { key: true })],
      ],
    },
    {
      from: T.memory,
      out: T.lock - 26,
      num: 2,
      lines: [
        [w("Layer 3", T.memory + 16, { scale: 0.42 })],
        [w("what they", T.memory + 24, { scale: 0.75 })],
        [w("remember", T.memory + 32, { key: true })],
      ],
    },
    {
      from: T.lock,
      out: T.sign - 12,
      lines: [
        [w("Now they", CLICK - 6, { scale: 0.62 })],
        [w("click", CLICK + 2, { key: true })],
        [w("together.", CLICK + 10, { scale: 0.8 })],
      ],
    },
    {
      from: T.sign,
      out: N + 99,
      lines: [
        [w("three layers,", T.sign + 20, { scale: 0.62 })],
        [w("one", T.sign + 28, { scale: 0.8 }), w("calm", T.sign + 34, { key: true })],
        [w("week.", T.sign + 40, { scale: 0.8 })],
      ],
    },
  ];
  const capSize = V ? 104 * u : 78 * u,
    NUMS = ["1", "2", "3"];
  const captions = (ctx: Ctx, F: number) => {
    const c = [...CAPS].reverse().find((k) => F >= k.from);
    if (!c) return;
    const opts = {
      size: capSize,
      face: F_.serif,
      italic: F_.italic,
      ink: C.ink,
      accent: C.accent2,
      fps: FPS,
      out: c.out,
      gap: 0.08,
    };
    const numbered = c.num !== undefined;
    if (V) {
      ladder(ctx, c.lines, L.safe.x, L.safe.top, F, { ...opts, align: "left" });
    } else if (numbered) {
      ladder(ctx, c.lines, L.safe.x + 170 * u, L.safe.top + 10 * u, F, { ...opts, align: "left" });
    } else ladder(ctx, c.lines, cx, L.safe.top + 10 * u, F, { ...opts, align: "center" });
    if (!numbered) return;
    // the giant numeral: rises in, drifts, leaves with the ladder
    const i = c.num!,
      a = window01(F, c.from + 8, c.from + 20, c.out, c.out + 8),
      rise = (1 - ease.outCubic(prog(F, c.from + 8, c.from + 26))) * 60 * u,
      drift = (F - c.from) * 0.12 * u;
    const size = V ? 380 * u : 250 * u,
      x = V ? W - L.safe.x : L.safe.x,
      y = V ? L.safe.top + 330 * u : L.safe.top + 205 * u;
    text(ctx, NUMS[i]!, x, y + rise - drift, {
      size,
      family: F_.serif,
      color: LAYERS[i]!.top,
      align: V ? "right" : "left",
      alpha: a,
    });
  };
  // the url, quiet, under the sign-off
  const url = (ctx: Ctx, F: number) => {
    const a = prog(F, T.sign + 50, T.sign + 64);
    if (a <= 0) return;
    const y = V ? H - L.safe.bottom + 10 * u : H - L.safe.bottom - 4 * u;
    text(ctx, P.url, cx, y, {
      size: 26 * u,
      family: F_.mono,
      weight: 500,
      color: C.muted,
      align: "center",
      alpha: a,
      track: 0.04,
    });
  };

  const paint = (ctx: Ctx, env: Env, F: number) => {
    F = clamp(F, 0, N - 1);
    ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
    ctx.fillStyle = C.ground;
    ctx.fillRect(0, 0, W, H);
    // a slow push-in across the whole film keeps every hold alive (the captions stay put)
    const z = 1 + 0.05 * ease.inOutCubic(F / (N - 1)) + 0.018 * Math.sin((F / 90) * Math.PI);
    ctx.save();
    ctx.translate(SX, SY);
    ctx.scale(z, z);
    ctx.translate(-SX, -SY);
    rays(ctx, F);
    // slabs back to front: the lowest on screen first, so an upper slab (and its shadow) sits over it
    const live = [2, 1, 0].map((i) => ({ i, s: slabAt(i, F) })).filter((e) => e.s);
    live.sort((a, b) => b.s!.y - a.s!.y + (b.i - a.i) * 0.001);
    for (const { i, s } of live) {
      slab(ctx, i, s!, F);
      if (i === 0) askScene(ctx, F);
      if (i === 1) agentsScene(ctx, F);
      if (i === 2) memoryScene(ctx, F);
    }
    lockFx(ctx, F);
    wordmark(ctx, F);
    ctx.restore();
    captions(ctx, F);
    url(ctx, F);
  };

  const cuts = [0, T.ask, T.agents, T.memory, T.lock, T.sign, N],
    names = ["hook", "ask", "agents", "memory", "lock", "signoff"];
  const shots: Shot[] = names.map((sid, i) => ({
    id: sid,
    start: cuts[i]!,
    end: cuts[i + 1]!,
    draw: (ctx, local, env) =>
      motionBlur(ctx, env, (c, dt) => paint(c, env, cuts[i]! + local + dt), { samples: 3, shutter: 0.5 }),
  }));
  const typing = Array.from({ length: Math.ceil(ASK.length / 3) }, (_, k) => Math.round(TYPE0 + k * 3 * PER));
  return {
    meta: { title: id, W, H, fps: FPS, bpm: BPM, durationFrames: N, raster: "cpu" },
    assets: { images: {}, fonts: P.assets },
    shots,
    audio: beatScore({
      frames: N,
      fps: FPS,
      bpm: BPM,
      mood: "soft",
      hits: [...LAND, CLICK],
      whooshes: [T.ask + 12, T.agents + 4, T.memory + 4, T.lock + 36],
      ticks: [
        ...typing,
        PICK,
        ...LINKS.map((_, k) => LINK0 + k * LINK_EVERY),
        ...MEM.map((m) => m.at),
        ...FLIP.map((f) => f + 5),
      ],
      sign: T.sign + 6,
    }),
  };
}

export const layerStack = make("vertical", "layerStack");
export const layerStackSquare = make("square", "layerStackSquare");
