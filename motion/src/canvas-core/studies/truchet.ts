// STUDY 61 · TRUCHET (4 s, 60 fps, a seamless loop). A SECONDS piece: no words, the style is the whole piece.
// Smith's quarter-circle Truchet tiles in cream on deep teal: every square tile carries two thick arcs, so
// neighbouring tiles join into long meandering paths. A wave sweeps the grid from a moving origin and each tile
// turns a quarter with a spring (overshoot and settle), lifting off the ground as it turns; the whole maze
// re-routes behind the front, whose arcs glow vermilion, then gold, for a moment. On the bar-2 downbeat a second
// wave runs out from the centre, turning every tile back, and one long path lights gold from the centre to both
// of its ends as its tiles click into place.
// One source, designed for square (the hero) and vertical (a taller field, the wave sweeping down it and the hero
// path running across the frame a little high, clear of the feed's top and bottom bands).
// Brief: series/studies/briefs/truchet.json · prompt: series/studies/prompts/truchet.prompt.md
// Learns from Truchet tiles and Smith's quarter-circle variant (https://en.wikipedia.org/wiki/Truchet_tiles).
//
// Nothing but tiles ever turns. A tile's angle is its seeded base orientation plus a quarter turn per wave, each
// a closed-form spring of the frame, started at the moment the wave front reaches the tile. The fronts are exact:
// the first is a circle whose centre itself moves (the onset solves |p - O(t)| = c·t), the second a circle from the
// centre. Each spring is written with its previous cycle's tail carried in (as kit track() does with `loop`), so a
// tile turns exactly two quarter turns per loop: a Smith tile is symmetric under a half turn, so frame 240 draws
// exactly frame 0. The lit path is traced once per size at load, on the settled pattern, from the centre tile.
import PACK from "../../../brand/packs/studio/pack.json";
import { rng, type Ctx, type Env, type Layer } from "../core";
import type { Film, Shot } from "../film";
import { motionBlur } from "../kit/blur";
import { bezier, clamp, ease, lerp, prog, spring } from "../kit/motion";
import { usePack } from "../kit/pack";
import { beatScore } from "../kit/score";
import { layout, type Size } from "../kit/sizes";

const P = usePack(PACK),
  C = P.palette("truchet");
const FPS = 60,
  BPM = 120,
  N = 240, // two bars: a beat is 30 frames, bar 2's downbeat is frame 120
  TAU = Math.PI * 2,
  Q = Math.PI / 2;
// the story, in frames (each on the beat grid)
const T = { ripple: 0, pre: 60, hit: 120, settle: 180 };
const TURN = { freq: 4.2, damp: 0.5 }; // a quarter turn: a crisp snap, about 16 % overshoot, settled in a third of a second
const RING1 = 7.5, // the first wave's rings arrive on sixteenths
  RING2 = 7.5; // and so do the second wave's

// ---- time
const wrap = (F: number) => ((F % N) + N) % N;
/** frames from F to the nearest frame `at`, measured round the loop */
const wrapDist = (F: number, at: number) => {
  const d = wrap(F - at);
  return Math.min(d, N - d);
};
const pulse = (F: number, at: number, w: number) => Math.exp(-((wrapDist(F, at) / w) ** 2));
/** a quarter-turn spring started at `on` (any frame in [-N, N)), with the neighbouring loops' copies carried in,
 * so the summed angle advances by exactly one quarter turn per loop (to 1e-9) and frame N meets frame 0 */
const turn = (F: number, on: number) =>
  spring((F - on + N) / FPS, TURN) + spring((F - on) / FPS, TURN) + spring((F - on - N) / FPS, TURN) - 1;
/** frames a turn's spring takes to first reach its quarter: it starts this early, so it lands on time */
const LEAD = (() => {
  let f = 0;
  while (spring(f / FPS, TURN) < 1) f += 0.05;
  return f;
})();
/** a smooth one-sided bump peaking (at 1) `tau` frames after `on`, wrapped round the loop */
const bump = (F: number, on: number, tau: number) => {
  const x = wrap(F - on) / tau;
  return x * x * Math.exp(2 * (1 - x));
};
/** the downbeat's impact: a near-instant rise and a soft decay, windowed to exactly 0 before the wrap */
const punch = (F: number) => {
  const d = (F - T.hit + 1) / FPS; // one frame early, so frame 120 itself carries the hit
  return d > 0 ? (1 - Math.exp(-d * 26)) * Math.exp(-d * 4.2) * (1 - ease.inOutCubic(prog(F, 172, 226))) : 0;
};
/** beat 3's pre-pulse: a smaller nod that sets the hit up (exactly 0 from frame 100) */
const prePulse = (F: number) => {
  const d = (F - T.pre + 3) / FPS; // builds over three or four frames into frame 60
  return d > 0 ? (1 - Math.exp(-d * 14)) * Math.exp(-d * 8) * (1 - ease.inOutCubic(prog(F, 80, 100))) : 0;
};
/** light gathering at the centre over the last beat before the downbeat (0 outside 88–120) */
const gather = (F: number) => (F < 88 || F >= T.hit ? 0 : ease.inCubic(prog(F, 88, 119.5)));
/** the centre tiles wind back a few degrees as the light gathers, and the downbeat's spring lets them go (0 outside
 * 88–200) */
const windup = (F: number) =>
  F < 96
    ? 0
    : F < T.hit
      ? ease.inOutCubic(prog(F, 96, 119.5))
      : (1 - spring((F - T.hit) / FPS, TURN)) * (1 - prog(F, 150, 200));
const LIGHT = bezier(0.3, 0, 0.35, 1); // the lit path's front: bursts out of the centre, eases into the ends

// ---- colour
type RGB = [number, number, number];
const rgb = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a: RGB, b: RGB, t: number): RGB => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const css = (c: RGB, a = 1) => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${clamp(a)})`;
const GROUND = rgb(C.ground),
  SURFACE = rgb(C.surface),
  DEEP = rgb(C.deep!),
  INK = rgb(C.ink),
  GOLD = rgb(C.accent),
  EMBER = rgb(C.accent2),
  HOT = INK, // the hottest light is the pack's own cream
  FLASH = mix(GOLD, HOT, 0.2);

// ---- the grid. Sides: 0 N, 1 E, 2 S, 3 W. A settled tile is type 0 (arcs round the top-left and bottom-right
// corners, joining N-W and S-E) or type 1 (top-right and bottom-left, joining N-E and S-W); a quarter turn
// swaps the types, a half turn changes nothing.
const STEP: [number, number][] = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];
const PAIR = [
  [3, 2, 1, 0],
  [1, 0, 3, 2],
];
/** the corner (in half-tiles from the centre) an arc joining sides a and b turns round */
const cornerOf = (a: number, b: number): [number, number] => [a === 1 || b === 1 ? 1 : -1, a === 2 || b === 2 ? 1 : -1];
/** the angle, seen from corner c, of side s's midpoint */
const sideAngle = (c: [number, number], s: number) => {
  const [dx, dy] = STEP[s]!;
  return Math.atan2(dy - c[1], dx - c[0]);
};
// each type's two arcs as [corner x, corner y, start angle]; every arc sweeps a quarter, clockwise
const ARCS: [number, number, number][][] = [
  [
    [-1, -1, 0],
    [1, 1, Math.PI],
  ],
  [
    [1, -1, Q],
    [-1, 1, 3 * Q],
  ],
];

// k0: steps from the centre of the lit path's nearest segment in this tile (Infinity when it carries none)
type Tile = { i: number; j: number; x: number; y: number; o: number; on1: number; on2: number; k0: number };
// tile index, entry side, exit side (in path order), steps from the centre, lit travelling a→b (else b→a)
type Seg = { t: number; a: number; b: number; k: number; out: boolean; n: number }; // n: index from one end
type Design = {
  s: number; // tile size
  VX: number; // the second wave's origin (a tile centre) and the camera's pivot
  VY: number;
  ci: [number, number]; // columns drawn (overscan included)
  cj: [number, number]; // rows drawn
  O1: [number, number]; // the first wave's origin, in tiles from the centre
  V1: [number, number]; // ...its velocity (tiles per frame)
  c1: number; // ...its front's speed (tiles per frame)
  c2: number; // the second wave's front speed
  heroRows: [number, number]; // rows the lit path may use
  exits: number[]; // sides of the drawn grid the lit path must leave by
  len: number; // the lit path's target length, in segments
};

/** seeded orientations, and the longest path through the centre tile on the settled pattern (the first seed that
 * clears the design's bar wins; deterministic, so every render picks the same) */
function plan(D: Design) {
  const [i0, i1] = D.ci,
    [j0, j1] = D.cj,
    cols = i1 - i0 + 1,
    rows = j1 - j0 + 1;
  const idx = (i: number, j: number) => (j - j0) * cols + (i - i0);
  const inHero = (i: number, j: number) => i >= i0 && i <= i1 && j >= D.heroRows[0] && j <= D.heroRows[1];
  let best: { seed: number; o: Uint8Array; path: Seg[]; kc: number; score: number } | undefined;
  for (let seed = 1; seed < 900; seed++) {
    const q = rng(6100 + seed),
      o = new Uint8Array(cols * rows).map(() => (q() < 0.5 ? 0 : 1));
    // trace from the centre tile out through side `out`; returns the segments and the side it left the hero by
    const trace = (out: number) => {
      const segs: { t: number; a: number; b: number }[] = [];
      let i = 0,
        j = 0,
        b = out;
      for (let n = 0; n < 400; n++) {
        i += STEP[b]![0];
        j += STEP[b]![1];
        if (!inHero(i, j)) return { segs, exit: b, closed: false };
        if (i === 0 && j === 0) return { segs, exit: -1, closed: true };
        const a = (b + 2) % 4,
          t = idx(i, j);
        b = PAIR[o[t]!]![a]!;
        segs.push({ t, a, b });
      }
      return { segs, exit: -1, closed: true };
    };
    for (const a0 of [0, 2]) {
      const c = idx(0, 0),
        b0 = PAIR[o[c]!]![a0]!,
        fw = trace(b0),
        bw = trace(a0);
      if (fw.closed || bw.closed) continue;
      // it must cross the frame: leave by opposite sides of the drawn grid, both of them allowed
      if (!D.exits.includes(fw.exit) || bw.exit !== (fw.exit + 2) % 4) continue;
      const len = fw.segs.length + bw.segs.length + 1,
        lo = Math.min(fw.segs.length, bw.segs.length);
      // a readable river, not a knot: as near the target length as possible, its halves balanced
      const score = -Math.abs(len - D.len) + 0.5 * lo;
      if (lo < D.len * 0.35) continue;
      if (!best || score > best.score) {
        const back = bw.segs.reverse().map((sg) => ({ t: sg.t, a: sg.b, b: sg.a })),
          kc = back.length,
          path = [...back, { t: c, a: a0, b: b0 }, ...fw.segs].map((sg, k) => ({
            ...sg,
            k: Math.abs(k - kc),
            out: k >= kc,
            n: k,
          }));
        best = { seed, o, path, kc, score };
      }
    }
    if (best && seed > 300) break;
  }
  if (!best) throw new Error("truchet: no lit path found");
  // the waves: onsets per tile
  const tiles: Tile[] = [];
  const [vx, vy] = D.V1,
    vv = vx * vx + vy * vy,
    k1 = D.c1 * D.c1 - vv;
  for (let j = j0; j <= j1; j++)
    for (let i = i0; i <= i1; i++) {
      const qx = i - D.O1[0],
        qy = j - D.O1[1],
        qv = qx * vx + qy * vy,
        qq = qx * qx + qy * qy;
      tiles.push({
        i,
        j,
        x: D.VX + i * D.s,
        y: D.VY + j * D.s,
        o: best.o[idx(i, j)]!,
        // the front reaches the tile when |q - V t| = c t (the moving origin's circle); its turn lands then
        // ...and the front starts with a radius of about 1.2 tiles: the cluster inside it snaps together on frame 0
        on1: Math.max(0, (-qv + Math.sqrt(qv * qv + k1 * qq)) / k1 - 1.2 / D.c1) - LEAD,
        // the centre wave: the 3 × 3 centre tiles snap together on the downbeat, then the front runs out
        on2: T.hit + Math.max(0, Math.hypot(i, j) - 1.5) / D.c2 - LEAD,
        k0: Infinity,
      });
    }
  for (const sg of best.path) tiles[sg.t]!.k0 = Math.min(tiles[sg.t]!.k0, sg.k);
  return { tiles, path: best.path, kc: best.kc, seed: best.seed };
}

export function make(size: Size, id: string): Film {
  const L = layout(size),
    { W, H, u } = L,
    tall = L.tall;
  const s = W / 11; // eleven tiles across, so the centre is a tile's centre
  // per-size design. Square: the first wave rises from the lower left and its origin drifts to the upper right.
  // Vertical: a taller field; the first wave pours down from the upper left, the centre wave and the lit path sit
  // a little high (0.45 H), and the lit path keeps to rows clear of the 220 px top and 320 px bottom bands.
  const D: Design = tall
    ? {
        s,
        VX: W / 2,
        VY: Math.round(H * 0.45),
        ci: [-6, 6],
        cj: [-10, 11],
        O1: [-1, -3],
        V1: [0.01, 0.03],
        c1: 0.11,
        c2: 0.17,
        heroRows: [-5, 6],
        exits: [0, 2],
        len: 44,
      }
    : {
        s,
        VX: W / 2,
        VY: H / 2,
        ci: [-6, 6],
        cj: [-6, 6],
        O1: [-3, 3],
        V1: [0.02, -0.02],
        c1: 0.08,
        c2: 0.11,
        heroRows: [-6, 6],
        exits: [0, 1, 2, 3],
        len: 32,
      };
  const { tiles, path } = plan(D),
    h = s / 2,
    LW = 0.23 * s; // the arcs' stroke
  const pathLen = Math.max(...path.map((p) => p.k)) + 0.5;
  // the rings, for the score: one marimba pluck per ring of tiles the fronts reach
  const rings1 = [...new Set(tiles.map((t) => Math.round((t.on1 + LEAD) / RING1)))].sort((a, b) => a - b),
    rings2 = [...new Set(tiles.map((t) => Math.round((t.on2 + LEAD - T.hit) / RING2)))].sort((a, b) => a - b);

  // the lit path's segments, grouped by tile
  const lit = new Map<number, Seg[]>();
  for (const sg of path) lit.set(sg.t, [...(lit.get(sg.t) ?? []), sg]);

  // the first wave's origin, moving (tiles → px)
  const origin1 = (F: number): [number, number] => [
    D.VX + (D.O1[0] + D.V1[0] * F) * s,
    D.VY + (D.O1[1] + D.V1[1] * F) * s,
  ];

  // ---- cached surfaces
  const layer = (env: Env, name: string, w: number, hh: number): Layer => {
    const key = `truchet:${id}:${name}:${w}x${hh}`;
    let lay = env.cache.get(key) as Layer | undefined;
    if (!lay) {
      lay = env.canvas(w, hh);
      env.cache.set(key, lay);
    }
    return lay;
  };
  // the ground: deep teal, lifted toward the centre, falling to deep at the corners (drawn once per size)
  const ground = (env: Env): Layer => {
    const pw = Math.round(W * env.scale),
      ph = Math.round(H * env.scale),
      key = `truchet:${id}:ground:${pw}x${ph}`;
    let lay = env.cache.get(key) as Layer | undefined;
    if (lay) return lay;
    lay = env.canvas(pw, ph);
    const c = lay.ctx;
    c.setTransform(env.scale, 0, 0, env.scale, 0, 0);
    c.fillStyle = css(GROUND);
    c.fillRect(0, 0, W, H);
    const g = c.createRadialGradient(D.VX, D.VY - 60 * u, 0, D.VX, D.VY, Math.hypot(W, H) * 0.62);
    g.addColorStop(0, css(mix(GROUND, SURFACE, 0.55)));
    g.addColorStop(0.5, css(GROUND));
    g.addColorStop(1, css(DEEP));
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
    env.cache.set(key, lay);
    return lay;
  };
  // film grain: one seeded tile of faint specks, laid at one of eight offsets (frame mod 8, so it loops)
  const GRAIN = 256;
  const grainTile = (env: Env): Layer => {
    const key = `truchet:grain`;
    let lay = env.cache.get(key) as Layer | undefined;
    if (lay) return lay;
    lay = env.canvas(GRAIN, GRAIN);
    const c = lay.ctx,
      q = rng(6161);
    for (let i = 0; i < (GRAIN * GRAIN) / 4; i++) {
      c.globalAlpha = 0.02 + q() * 0.04;
      c.fillStyle = q() < 0.6 ? C.ink : C.deep!;
      c.fillRect(Math.floor(q() * GRAIN), Math.floor(q() * GRAIN), 1, 1);
    }
    env.cache.set(key, lay);
    return lay;
  };
  const GRAIN_AT = (() => {
    const q = rng(6162);
    return Array.from({ length: 8 }, () => [Math.floor(q() * GRAIN), Math.floor(q() * GRAIN)] as const);
  })();

  // ---- a tile's state at a (fractional) frame
  type State = { k: number; lift: number; glow: number; heat: number; flare: number };
  const state = (t: Tile, F: number): State => {
    const r2 = t.i * t.i + t.j * t.j,
      k = turn(F, t.on1) + turn(F, t.on2) - 0.09 * windup(F) * Math.exp(-r2 / 6), // about 8 degrees
      l1 = bump(F, t.on1, 4),
      l2 = bump(F, t.on2, 4),
      g1 = 0.8 * bump(F, t.on1, 4),
      // the lit path's tiles stop glowing once its light has passed them, so the light reads on its own
      g2 = bump(F, t.on2, 4) * (1 - clamp(front(F) - t.k0));
    // heat: how fresh the front is where this tile glows (1 = just reached, vermilion; 0 = trailing, gold)
    const d = g2 > g1 ? wrap(F - t.on2) : wrap(F - t.on1);
    // flare: light at the centre, a nod on beat 3, gathering into the downbeat and flashing on it
    const flare = clamp(punch(F) * Math.exp(-r2 / 9) + (0.45 * prePulse(F) + 0.35 * gather(F)) * Math.exp(-r2 / 4));
    return { k, lift: Math.max(l1, l2), glow: Math.max(g1, g2), heat: 1 - prog(d, 2, 11), flare };
  };
  /** add a tile's arcs to the current path, drawn as settled type `ty` turned by `phi` about its centre */
  const arcs = (c: Ctx, t: Tile, ty: number, phi: number, sc: number) => {
    const cs = Math.cos(phi) * sc,
      sn = Math.sin(phi) * sc;
    for (const [cx, cy, a0] of ARCS[ty]!) {
      // the corner, turned with the tile; the arc's angles turn by phi too
      const px = t.x + (cx * cs - cy * sn) * h,
        py = t.y + (cx * sn + cy * cs) * h;
      c.moveTo(px + Math.cos(a0 + phi) * h * sc, py + Math.sin(a0 + phi) * h * sc);
      c.arc(px, py, h * sc, a0 + phi, a0 + phi + Q);
    }
  };
  const rrect = (c: Ctx, x: number, y: number, w: number, r: number, phi: number) => {
    c.save();
    c.translate(x, y);
    c.rotate(phi);
    c.beginPath();
    c.roundRect(-w / 2, -w / 2, w, w, r);
    c.restore();
  };

  // ---- the tiles: one full opaque frame at frame F (motion blur samples this inside the shutter)
  const tilesAt = (c: Ctx, env: Env, F: number, cam: (c: Ctx) => void) => {
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = 1;
    c.globalCompositeOperation = "source-over";
    c.drawImage(ground(env).canvas, 0, 0);
    cam(c);
    c.lineCap = "round";
    c.lineJoin = "round"; // a miter at an arc's sub-pixel lead-in would spike
    const S = tiles.map((t) => state(t, F));
    const rest: number[] = [],
      up: number[] = [];
    S.forEach((st, n) => (st.lift > 0.015 || st.glow > 0.02 || st.flare > 0.02 ? up : rest).push(n));
    // turning tiles, lowest first: a soft shadow and the tile's plate, lifted off the ground as it turns
    up.sort((a, b) => S[a]!.lift - S[b]!.lift);
    const geo = (n: number) => {
      const t = tiles[n]!,
        st = S[n]!,
        m = Math.round(st.k);
      return { t, st, ty: (t.o + m) % 2, phi: Q * (st.k - m), sc: 1 + 0.07 * st.lift };
    };
    for (const n of up) {
      const { t, st, sc } = geo(n),
        L = st.lift;
      if (L <= 0.015) continue;
      c.save();
      c.shadowColor = css(DEEP, 0.55 * L);
      c.shadowBlur = 26 * L * u * env.scale;
      c.shadowOffsetY = 14 * L * u * env.scale;
      c.fillStyle = css(mix(GROUND, SURFACE, 0.35 + 0.65 * L), clamp(L * 1.5));
      rrect(c, t.x, t.y, s * 0.99 * sc, 0.17 * s, Q * st.k);
      c.fill();
      c.restore();
    }
    // every arc's faint drop shadow first (deeper under a lifted tile), so no shadow ever lies on a neighbour's
    // arc where the paths join; then the cream arcs, resting ones batched, turning ones glowing at the front
    c.lineWidth = LW;
    c.strokeStyle = css(DEEP, 0.5);
    c.beginPath();
    for (const n of rest) {
      const { t, ty, phi } = geo(n);
      arcs(c, { ...t, y: t.y + 3.2 * u }, ty, phi, 1);
    }
    c.stroke();
    for (const n of up) {
      const { t, st, ty, phi, sc } = geo(n);
      c.lineWidth = LW * sc;
      c.beginPath();
      arcs(c, { ...t, y: t.y + (3.2 + 6 * st.lift) * u }, ty, phi, sc);
      c.stroke();
    }
    c.lineWidth = LW;
    c.strokeStyle = css(INK);
    c.beginPath();
    for (const n of rest) {
      const { t, ty, phi } = geo(n);
      arcs(c, t, ty, phi, 1);
    }
    c.stroke();
    for (const n of up) {
      const { t, st, ty, phi, sc } = geo(n);
      c.lineWidth = LW * sc;
      c.strokeStyle = css(mix(mix(INK, mix(GOLD, EMBER, st.heat), 0.9 * clamp(st.glow)), FLASH, 0.85 * st.flare));
      c.beginPath();
      arcs(c, t, ty, phi, sc);
      c.stroke();
    }
    // the lit path: gold, riding each tile as it settles into the centre wave's pattern
    heroArcs(c, F, S, false);
  };

  // the lit path's level: off before the hit, the front runs out from the centre to both ends (121–170), the
  // whole path holds and then fades, lingering near half before it goes (exactly 0 from frame 228)
  const front = (F: number) => (F < T.hit ? -1 : LIGHT(prog(F, T.hit + 1, 150)) * (pathLen + 0.6));
  const litLevel = (F: number) =>
    F < T.hit ? 0 : 1 - 0.55 * ease.inOutCubic(prog(F, 176, 204)) - 0.45 * ease.inOutCubic(prog(F, 198, 228));
  /** the hold's highlight on segment n: a soft bump travelling end to end over 176–226, windowed to 0 by 226 */
  const shimmer = (F: number, n: number) => {
    if (F < 172 || F > 226) return 0;
    const w = Math.sin(Math.PI * prog(F, 172, 226)) ** 1.5,
      ph = -2 + (path.length + 3) * (0.5 - 0.5 * Math.cos(Math.PI * prog(F, 174, 226)));
    return w * Math.max(0, 1 - Math.abs(n - ph) / 1.8);
  };
  /** draw the lit path's arcs (each to how far the front has reached into it); `bloom` draws wide and soft */
  const heroArcs = (c: Ctx, F: number, S: State[], bloom: boolean) => {
    const lv = litLevel(F);
    if (lv <= 0.001) return;
    const fr = front(F);
    // two passes: every gold sheath first, then every cream core, so no segment's cap covers its neighbour's core
    for (const pass of bloom ? [0] : [0, 1])
      for (const [ti, segs] of lit) {
        // the light runs on its own clock, ahead of the front where it must: an arc lit on a tile still to turn
        // swings into the river as the wave reaches it
        const t = tiles[ti]!,
          st = S[ti]!,
          sc = 1 + 0.07 * st.lift,
          phi = Q * (st.k - 2), // the lit pattern is the settled pattern after the centre wave (two quarter turns)
          cs = Math.cos(phi) * sc,
          sn = Math.sin(phi) * sc;
        for (const sg of segs) {
          // how much of this segment is lit: the centre segment lights from its middle out, the rest from the end
          // nearer the centre
          const centre = sg.k === 0,
            reach = centre ? clamp(fr * 2) : clamp(fr - sg.k + 0.5);
          if (reach <= 0) continue;
          const cr = cornerOf(sg.a, sg.b),
            px = t.x + (cr[0] * cs - cr[1] * sn) * h,
            py = t.y + (cr[0] * sn + cr[1] * cs) * h;
          let a = sideAngle(cr, sg.a),
            b = sideAngle(cr, sg.b);
          let d = b - a;
          while (d > Math.PI) d -= TAU;
          while (d < -Math.PI) d += TAU;
          // segments behind the centre in path order are lit travelling backwards (b to a)
          if (!sg.out) {
            [a, b] = [b, a];
            d = -d;
          }
          let from = 0,
            to = reach;
          if (centre) {
            from = 0.5 - reach / 2;
            to = 0.5 + reach / 2;
          }
          const A0 = a + phi + d * from,
            A1 = a + phi + d * to,
            head = !centre && reach < 1 ? 1 : 0;
          // its own colour: a hot cream filament in a gold sheath, with an ember bloom
          // through the hold, a slow highlight runs along the river from one end to the other
          const hl = shimmer(F, sg.n);
          c.globalAlpha = (bloom ? 0.6 + 0.4 * hl : 1) * lv;
          if (pass === 0) {
            c.strokeStyle = css(bloom ? EMBER : GOLD);
            c.lineWidth = bloom ? LW * (2 + 0.6 * hl) : LW * sc * 1.04;
            c.beginPath();
            c.arc(px, py, h * sc, A0, A1, d < 0);
            c.stroke();
            continue;
          }
          {
            c.strokeStyle = css(HOT);
            c.lineWidth = LW * sc * (0.42 + 0.3 * hl);
            c.beginPath();
            c.arc(px, py, h * sc, A0, A1, d < 0);
            c.stroke();
          }
          if (head) {
            // the head: a hot point at the front
            const hx = px + Math.cos(A1) * h * sc,
              hy = py + Math.sin(A1) * h * sc;
            c.fillStyle = css(HOT);
            c.beginPath();
            c.arc(hx, hy, LW * 0.62, 0, TAU);
            c.fill();
          }
        }
      }
    c.globalAlpha = 1;
  };

  const paint = (ctx: Ctx, env: Env, F: number) => {
    F = wrap(F);
    const kick = punch(F),
      pre = prePulse(F),
      p0 = pulse(F, 0, 9);
    // camera: a slow breath and drift (whole cycles per loop), a punch-in on the downbeat, a nod on beat 3
    const camAt = (G: number) => {
      const tt = wrap(G) / N,
        z = 1 + 0.012 * (0.5 - 0.5 * Math.cos(TAU * tt)) + 0.022 * punch(wrap(G)) + 0.01 * prePulse(wrap(G)),
        r = 0.006 * Math.sin(TAU * tt + 0.5),
        ox = 7 * u * Math.cos(TAU * tt),
        oy = 5 * u * Math.sin(TAU * tt + 1.1);
      return { z, r, ox, oy };
    };
    const camera = (c: Ctx, G: number, k: number) => {
      const { z, r, ox, oy } = camAt(G),
        ca = Math.cos(r) * z,
        sa = Math.sin(r) * z;
      c.setTransform(
        k * ca,
        k * sa,
        -k * sa,
        k * ca,
        k * (D.VX + ox - (ca * D.VX - sa * D.VY)),
        k * (D.VY + oy - (sa * D.VX + ca * D.VY)),
      );
    };

    // ---- the tiles, motion-blurred inside a half-frame shutter (thick solid arcs only; grain and glow are added
    // after, unblurred)
    motionBlur(ctx, env, (c, dt) => tilesAt(c, env, wrap(F + dt), (cc) => camera(cc, F + dt, env.scale)), {
      samples: 4,
      shutter: 0.5,
    });

    // ---- glow: the front's arcs and the lit path drawn wide into a quarter-size layer, mipped down twice, added
    const pw = Math.round(W * env.scale),
      ph = Math.round(H * env.scale),
      g0 = layer(env, "glow0", Math.ceil(pw / 4), Math.ceil(ph / 4)),
      g1 = layer(env, "glow1", Math.ceil(pw / 8), Math.ceil(ph / 8)),
      g2 = layer(env, "glow2", Math.ceil(pw / 16), Math.ceil(ph / 16));
    for (const g of [g0, g1, g2]) {
      g.ctx.setTransform(1, 0, 0, 1, 0, 0);
      g.ctx.globalAlpha = 1;
      g.ctx.globalCompositeOperation = "source-over";
      g.ctx.clearRect(0, 0, g.canvas.width, g.canvas.height);
    }
    const gc = g0.ctx,
      S = tiles.map((tl) => state(tl, F));
    camera(gc, F, env.scale / 4);
    gc.globalCompositeOperation = "lighter";
    gc.lineCap = "round";
    gc.lineJoin = "round";
    gc.lineWidth = LW * 1.6;
    tiles.forEach((tl, n) => {
      const st = S[n]!;
      if (st.glow < 0.03 && st.flare < 0.03) return;
      const m = Math.round(st.k);
      gc.globalAlpha = clamp(0.28 * st.glow + 0.5 * st.flare);
      gc.strokeStyle = css(mix(mix(GOLD, EMBER, st.heat), FLASH, st.flare / (st.flare + st.glow + 1e-6)));
      gc.beginPath();
      arcs(gc, tl, (tl.o + m) % 2, Q * (st.k - m), 1 + 0.07 * st.lift);
      gc.stroke();
    });
    heroArcs(gc, F, S, true);
    // light sources: the first wave's moving origin (a soft gold glow that flares on frame 0), the centre on the
    // pre-pulse, and the downbeat's flash
    const spot = (x: number, y: number, r: number, col: RGB, a: number) => {
      if (a < 0.003) return;
      gc.globalAlpha = 1;
      const rg = gc.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, css(col, a));
      rg.addColorStop(0.35, css(col, 0.4 * a));
      rg.addColorStop(1, css(col, 0));
      gc.fillStyle = rg;
      gc.fillRect(x - r, y - r, 2 * r, 2 * r);
    };
    const o1 = origin1(Math.min(F, 96)),
      o1a = 0.22 * ease.inOutCubic(prog(F, 0, 16)) * (1 - ease.inOutCubic(prog(F, 40, 96)));
    spot(...o1, 2.6 * s, GOLD, o1a + 0.9 * p0 * (F > N / 2 ? 0 : 1));
    if (F > N / 2) {
      const ob = origin1(0);
      spot(ob[0], ob[1], 2.6 * s, GOLD, 0.9 * p0);
    }
    spot(D.VX, D.VY, 1.4 * s, GOLD, 0.8 * pre);
    spot(D.VX, D.VY, (3 + 5 * kick) * s, mix(GOLD, HOT, 0.5), 0.95 * kick + 0.6 * gather(F));
    // the centre wave's front, a soft ring of light running out with it
    const rp = F - T.hit;
    if (rp > 0 && rp < 70) {
      gc.globalAlpha = 0.16 * (1 - rp / 70) ** 1.5;
      gc.strokeStyle = css(GOLD);
      gc.lineWidth = 0.9 * s;
      gc.beginPath();
      gc.arc(D.VX, D.VY, (1.5 + rp * D.c2) * s, 0, TAU);
      gc.stroke();
    }
    for (const [src, dst] of [
      [g0, g1],
      [g1, g2],
    ] as const) {
      dst.ctx.imageSmoothingEnabled = true;
      dst.ctx.imageSmoothingQuality = "high";
      dst.ctx.drawImage(src.canvas, 0, 0, dst.canvas.width, dst.canvas.height);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "screen";
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    for (const [g, a] of [
      [g0, 0.4],
      [g1, 0.35],
      [g2, 0.3],
    ] as const) {
      ctx.globalAlpha = a;
      ctx.drawImage(g.canvas, 0, 0, pw, ph);
    }
    ctx.globalCompositeOperation = "source-over";

    // ---- the downbeat's ring: a hard bright line on the centre wave's front for its first ten frames (drawn sharp,
    // outside the blur)
    if (F >= T.hit && F < T.hit + 11) {
      const q = prog(F, T.hit, T.hit + 11);
      camera(ctx, F, env.scale);
      ctx.globalAlpha = 0.85 * (1 - q) ** 1.5;
      ctx.strokeStyle = css(HOT);
      ctx.lineWidth = (10 - 5 * q) * u;
      ctx.beginPath();
      ctx.arc(D.VX, D.VY, (1.5 + (F - T.hit) * D.c2) * s, 0, TAU);
      ctx.stroke();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }

    // ---- grain, screen-locked
    ctx.globalAlpha = 1;
    const tile = grainTile(env),
      [gx, gy] = GRAIN_AT[Math.floor(F) % 8]!;
    for (let y = -gy; y < ph; y += GRAIN) for (let x = -gx; x < pw; x += GRAIN) ctx.drawImage(tile.canvas, x, y);
  };

  const cuts = [T.ripple, T.hit, T.settle, N],
    names = ["ripple", "centre", "settle"];
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
    audio: (sr) => score(sr, rings1, rings2, tall),
  };
}

// ---- sound: the soft beat score in B minor as a quiet bed (bar 1 Bm, bar 2 G; its tails wrap), a held pad on B
// and D (the notes both chords share) that swells into the bed's bar-line gaps, a quiet marimba pluck for every
// ring of tiles each wave reaches (a rising B-minor run for the first wave, a falling G-major cascade for the
// second), a soft wood knock on beat 3 and a warm hit on frame 120: a low G with a felt thump under a marimba
// chord. Ring 0 of the first wave plucks on sample 0, and an air swell written before it wraps to the loop's end.
const BED = 0.24,
  OUT = 0.53;
const hz = (m: number) => 440 * 2 ** ((m - 69) / 12);
function score(sr: number, rings1: number[], rings2: number[], tall: boolean): [Float32Array, Float32Array] {
  const [Lc, Rc] = beatScore({ frames: N, fps: FPS, bpm: BPM, mood: "soft", key: 2, loop: true, gain: BED })(sr);
  const n = Lc.length,
    at = (f: number) => Math.round((f / FPS) * sr),
    noise = rng(6111),
    h0 = at(T.hit);
  const add = (i: number, v: number, pan: number) => {
    i = ((i % n) + n) % n;
    Lc[i] = Lc[i]! + v * (1 - pan);
    Rc[i] = Rc[i]! + v * pan;
  };
  // a circular moving average (the loop has no edges)
  const smooth = (x: Float32Array, w: number) => {
    const o = new Float32Array(n);
    let acc = 0;
    for (let k = -w; k <= w; k++) acc += x[((k % n) + n) % n]!;
    for (let i = 0; i < n; i++) {
      o[i] = acc / (2 * w + 1);
      acc += x[(i + w + 1) % n]! - x[(((i - w) % n) + n) % n]!;
    }
    return o;
  };
  const pow = new Float32Array(n);
  for (let i = 0; i < n; i++) pow[i] = (Lc[i]! ** 2 + Rc[i]! ** 2) / 2;
  const rms = smooth(pow, Math.round(0.03 * sr)).map(Math.sqrt);
  const ref = rms.reduce((a, b) => a + b, 0) / n,
    fill = smooth(
      rms.map((r) => clamp((ref - r) / ref)),
      Math.round(0.03 * sr),
    );
  // the bed ducks under the hit and breathes back in (10 ms in, so the duck itself does not click)
  for (let i = h0; i < n; i++) {
    const k = (i - h0) / sr,
      d = 1 - 0.55 * (1 - Math.exp(-k / 0.01)) * Math.exp(-k / 0.2);
    Lc[i] = Lc[i]! * d;
    Rc[i] = Rc[i]! * d;
  }
  // the pad: B3, D4 and F#4 is the wrong colour under G, so B3, D4, B4 over a low D2, at whole cycles per loop
  // (sample n meets sample 0), its level following how far the bed's own RMS falls below its mean
  const cyc = n / sr,
    whole = (m: number) => Math.round(hz(m) * cyc) / cyc,
    f1 = whole(59),
    f2 = whole(62),
    f3 = whole(71),
    f0 = whole(38);
  for (let i = 0; i < n; i++) {
    const t = i / sr,
      p = i / n,
      tr = 0.3 + 5 * fill[i]! + 0.05 * Math.sin(TAU * 4 * p);
    const v =
      (Math.sin(TAU * f1 * t) + 0.7 * Math.sin(TAU * f2 * t) + 0.22 * Math.sin(TAU * f3 * t)) * tr * 0.05 +
      Math.sin(TAU * f0 * t) * tr * 0.045;
    Lc[i] = Lc[i]! + v * (0.55 + 0.1 * Math.sin(TAU * p));
    Rc[i] = Rc[i]! + v * (0.55 - 0.1 * Math.sin(TAU * p));
  }
  // a marimba bar: the fundamental, its fourth partial (a tuned bar's first overtone) dying fast, and a soft
  // mallet click
  const marimba = (i0: number, m: number, g: number, pan: number, tau = 0.32) => {
    const f = hz(m);
    for (let k = 0, len = Math.round(1.4 * sr); k < len; k++) {
      const t = k / sr,
        a = Math.min(1, t / 0.0015);
      const v =
        Math.sin(TAU * f * t) * Math.exp(-t / tau) +
        0.4 * Math.sin(TAU * f * 3.93 * t) * Math.exp(-t / 0.035) +
        0.12 * Math.sin(TAU * f * 9.2 * t) * Math.exp(-t / 0.01);
      add(i0 + k, v * a * g, pan);
    }
    let lp = 0;
    for (let k = 0, len = Math.round(0.008 * sr); k < len; k++) {
      lp += 0.35 * (noise() * 2 - 1 - lp);
      add(i0 + k, lp * Math.exp(-k / (0.0015 * sr)) * g * 0.6, pan);
    }
  };
  // the first wave: B-minor pentatonic, rising and rolling, panned with the wave (left to right in the square,
  // and gently in the vertical, where it pours down the frame)
  const PENTA = [71, 74, 76, 78, 81, 83, 86, 88, 90];
  const ROLL = [0, 2, 1, 3, 2, 4, 3, 5, 4, 6, 5, 7, 6, 8];
  rings1.forEach((r, k) => {
    const f = r * RING1,
      m = PENTA[ROLL[k % ROLL.length]!]!,
      pan = tall ? 0.42 + 0.16 * Math.sin(k) : 0.25 + (0.5 * k) / Math.max(1, rings1.length - 1);
    marimba(at(f), m, (k === 0 ? 0.09 : 0.055) * (1 - 0.25 * (k / rings1.length)), pan);
  });
  // the second wave: G major falling outward from the hit, a quick quiet cascade
  const GMAJ = [91, 86, 83, 79, 74, 71, 67, 62];
  rings2.forEach((r, k) => {
    if (r === 0) return; // the hit carries ring 0
    marimba(
      at(T.hit + r * RING2),
      GMAJ[(k - 1) % GMAJ.length]!,
      0.045 * (1 - 0.5 * (k / rings2.length)),
      0.3 + 0.4 * (k % 2),
    );
  });
  // frame 0: a low B under ring 0's pluck, and air breathing in over the last 0.4 s (written at negative
  // indices, so it wraps to the end of the loop) to fill the deepest gap of the bed, at the wrap
  marimba(0, 47, 0.3, 0.45, 0.5);
  // ...and a short felt thump on sample 0 (a falling low sine and a breath of low-passed noise)
  {
    let ph0 = 0,
      lp0 = 0;
    for (let k = 0, len = Math.round(0.5 * sr); k < len; k++) {
      const t = k / sr;
      ph0 += (hz(35) * (1 + 0.8 * Math.exp(-t / 0.03))) / sr;
      lp0 += 0.06 * (noise() * 2 - 1 - lp0);
      const v = Math.sin(TAU * ph0) * Math.exp(-t / 0.16) * 0.45 + lp0 * Math.exp(-t / 0.03) * 1.6;
      add(k, v * Math.min(1, t / 0.002), 0.5);
    }
  }
  {
    let lo = 0,
      bd = 0;
    const len = at(24);
    for (let k = -len; k < 0; k++) {
      const p = (k + len) / len,
        f = Math.min(0.9, 2 * Math.sin((Math.PI * (1800 + 3600 * p * p)) / sr)),
        x = noise() * 2 - 1;
      lo += f * bd;
      bd += f * (x - lo - 0.8 * bd);
      add(k, bd * p ** 2 * Math.min(1, -k / (0.006 * sr)) * 0.26, 0.6 - 0.2 * p);
    }
  }
  // beat 3: a soft wood knock (a short low marimba F#3 and a click), quieter than the hit
  marimba(at(T.pre), 54, 0.4, 0.5, 0.2);
  marimba(at(T.pre), 66, 0.06, 0.6, 0.12);
  // the riser: air through a band-pass whose centre climbs, swelling with the light gathering at the centre
  // (88–119) and cut one frame before the downbeat
  {
    const r0 = at(88),
      r1 = at(T.hit - 1);
    let lo = 0,
      bd = 0;
    for (let i = r0; i < r1; i++) {
      const p = (i - r0) / (r1 - r0),
        f = Math.min(0.9, 2 * Math.sin((Math.PI * (900 + 5200 * p * p)) / sr)),
        x = noise() * 2 - 1;
      lo += f * bd;
      bd += f * (x - lo - 0.7 * bd);
      add(i, bd * p ** 1.6 * Math.min(1, (r1 - i) / (0.004 * sr)) * 0.64, 0.35 + 0.3 * p);
    }
  }
  // the hit: a warm low G with a slight pitch fall, a felt thump of low-passed noise, a marimba chord (G B D G)
  // rolled over 20 ms, and a breath of air
  let ph = 0;
  for (let k = 0, len = Math.round(1.2 * sr); k < len; k++) {
    const t = k / sr;
    ph += (hz(43) * (1 + 0.5 * Math.exp(-t / 0.035))) / sr;
    const body = Math.sin(TAU * ph) + 0.3 * Math.sin(2 * TAU * ph) * Math.exp(-t / 0.15);
    add(h0 + k, body * Math.exp(-t / 0.34) * Math.min(1, t / 0.003) * 1.0, 0.5);
  }
  let th = 0;
  const a3 = 1 - Math.exp((-TAU * 700) / sr);
  for (let k = 0, len = Math.round(0.16 * sr); k < len; k++) {
    th += a3 * (noise() * 2 - 1 - th);
    add(h0 + k, th * Math.exp(-k / (0.045 * sr)) * 1.4, 0.5);
  }
  [55, 59, 62, 67].forEach((m, j) => marimba(h0 + Math.round(j * 0.007 * sr), m, 0.16 - 0.02 * j, 0.3 + 0.13 * j, 0.6));
  let al = 0,
    pl = 0;
  const hpA = 1 - Math.exp((-TAU * 3500) / sr);
  for (let k = 0, len = Math.round(0.6 * sr); k < len; k++) {
    al += hpA * (noise() * 2 - 1 - al);
    const e = Math.exp(-k / (0.12 * sr)) * Math.min(1, k / (0.002 * sr)) * 0.35;
    add(h0 + k, (al - pl) * e, 0.5);
    pl = al;
  }
  // one gentle saturation over the sum: louder without a limiter, and still deterministic
  let peak = 1e-9;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(Lc[i]!), Math.abs(Rc[i]!));
  const g = 1.25 / peak;
  for (let i = 0; i < n; i++) {
    Lc[i] = (Math.tanh(Lc[i]! * g) / Math.tanh(1.25)) * OUT;
    Rc[i] = (Math.tanh(Rc[i]! * g) / Math.tanh(1.25)) * OUT;
  }
  return [Lc, Rc];
}

export const truchet = make("square", "truchet");
export const truchetVertical = make("vertical", "truchetVertical");
