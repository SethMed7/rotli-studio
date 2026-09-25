// STUDY 16 · AGENT NETWORK (24 s, 30 fps, 120 bpm). A system map for a fictional scheduling assistant: one
// request blinks on, four agents join a hub over dotted edges, glowing packets carry each handoff (one of them
// hits a conflict), orbit rings spin up while a time resolves, every node flashes green in turn, and the whole
// network collapses into the product's mark. A mono log prints every hop. One source, landscape and vertical.
// Brief: series/studies/briefs/agent-network.json · prompt: series/studies/prompts/agent-network.prompt.md
//
// The whole film is one continuous function paint(F) of a (fractional) frame F: packets, the log, the orbits
// and the camera are all closed-form in F, so any frame renders on its own (in parallel, for goldens). No motion
// blur: at 30 fps the packets carry their own trails, and every label on a moving packet has to stay readable.
import PACK from "../../../brand/packs/studio/pack.json";
import type { Ctx, Env } from "../core";
import type { Film, Shot } from "../film";
import { ladder, w, type Word } from "../kit/captions";
import { clamp, ease, lerp, prog, spring, window01 } from "../kit/motion";
import { usePack } from "../kit/pack";
import { beatScore } from "../kit/score";
import { layout, type Size } from "../kit/sizes";
import { letters, measure, text } from "../kit/type";
import { check, rr } from "../kit/ui";

const P = usePack(PACK),
  C = P.palette("terminal"),
  F_ = P.face;
const FPS = 30,
  BPM = 120,
  N = 720; // a beat is 15 frames, a bar 60
// the timeline, in frames (every cut on a beat)
const T = { agents: 75, packets: 225, resolve: 405, confirm: 555, sign: 660 };
const SECTIONS: [number, string][] = [
  [0, "00 REQUEST"],
  [T.agents, "01 AGENTS"],
  [T.packets, "02 HANDOFFS"],
  [T.resolve, "03 RESOLVE"],
  [T.confirm, "04 CONFIRM"],
  [T.sign, "05 ORIEL"],
];

type NodeId = "hub" | "cal" | "ppl" | "room" | "note";
const AGENTS: { id: Exclude<NodeId, "hub">; name: string; born: number; flash: number }[] = [
  { id: "cal", name: "CALENDAR", born: 90, flash: 570 },
  { id: "ppl", name: "PEOPLE", born: 105, flash: 585 },
  { id: "room", name: "ROOMS", born: 120, flash: 600 },
  { id: "note", name: "NOTES", born: 135, flash: 615 },
];
const HUB_FLASH = 630;

// every hop: a packet leaves `from` at a and lands on `to` at b (a blip on landing). tag rides beside the packet.
type Hop = { from: NodeId; to: NodeId; a: number; b: number; gold?: number; tag?: string };
const HOPS: Hop[] = [
  { from: "hub", to: "cal", a: 234, b: 262 },
  { from: "cal", to: "ppl", a: 276, b: 306, tag: "Tue 10:00?" },
  { from: "ppl", to: "cal", a: 347, b: 375, tag: "try Thu" },
  { from: "hub", to: "room", a: 410, b: 435 },
  { from: "room", to: "hub", a: 440, b: 465 },
  { from: "cal", to: "hub", a: 456, b: 490, gold: 472, tag: "Thu 15:00" },
  { from: "hub", to: "note", a: 504, b: 528 },
  ...AGENTS.map((g) => ({ from: "hub" as NodeId, to: g.id, a: g.flash - 18, b: g.flash, gold: 0 })),
];
const RESOLVED = 490; // the gold packet lands: the time is found
const HANDOFF = 686; // the collapse is complete: the hub hands itself to the sign-off as the mark
const CONFLICT = 306; // the Tue 10:00 ask lands on People and bounces

// the handoff log: [frame it starts printing, [text, colour role][]]
type Run = [string, "ink" | "muted" | "accent" | "gold"];
const LOG: [number, Run[]][] = [
  [
    40,
    [
      ["> request", "accent"],
      ["  60 min · 4 people", "ink"],
    ],
  ],
  ...AGENTS.map((g): [number, Run[]] => [
    g.born + 8,
    [
      ["+ ", "muted"],
      [g.name.toLowerCase().padEnd(10), "ink"],
      ["online", "muted"],
    ],
  ]),
  [
    262,
    [
      ["hub → calendar", "ink"],
      ["  find 60 min", "muted"],
    ],
  ],
  [
    306,
    [
      ["calendar → people", "ink"],
      ["  Tue 10?", "muted"],
    ],
  ],
  [
    322,
    [
      ["people × conflict", "ink"],
      ["  Dana busy", "muted"],
    ],
  ],
  [
    375,
    [
      ["people → calendar", "ink"],
      ["  try Thu", "muted"],
    ],
  ],
  [
    435,
    [
      ["hub → rooms", "ink"],
      ["  hold a room", "muted"],
    ],
  ],
  [
    465,
    [
      ["rooms → hub", "ink"],
      ["  4B is free", "muted"],
    ],
  ],
  [
    RESOLVED,
    [
      ["calendar → hub", "ink"],
      ["  Thu 15:00", "gold"],
    ],
  ],
  [
    528,
    [
      ["hub → notes", "ink"],
      ["  draft agenda", "muted"],
    ],
  ],
  [
    560,
    [
      ["hub → all", "ink"],
      ["  invite Thu 15:00", "muted"],
    ],
  ],
  [HUB_FLASH, [["booked · 4/4 accepted", "accent"]]],
];

export function make(size: Size, id: string): Film {
  const L = layout(size),
    { W, H, u, cx, cy, tall } = L;
  const col = (r: Run[1]) => (r === "gold" ? C.accent2 : C[r]!);
  const mono = (
    ctx: Ctx,
    s: string,
    x: number,
    y: number,
    o: { align?: CanvasTextAlign; color?: string; size?: number; alpha?: number } = {},
  ) =>
    text(ctx, s, x, y, {
      size: (o.size ?? 22) * u,
      family: F_.mono,
      weight: 500,
      color: o.color ?? C.muted,
      align: o.align ?? "left",
      track: 0.06,
      alpha: o.alpha ?? 1,
    });

  // ---- per-size design: where the network, the log and the captions live
  const hub0 = tall ? { x: cx, y: 915 * u } : { x: 850 * u, y: 560 * u };
  const spread = tall ? { x: 290 * u, y: 205 * u } : { x: 310 * u, y: 225 * u };
  const OFF: Record<NodeId, [number, number]> = {
    hub: [0, 0],
    cal: [-1, -1],
    ppl: [1, -1],
    room: [1, 1],
    note: [-1, 1],
  };
  const panel = tall
    ? { x: L.safe.x, y: 1268 * u, w: W - 2 * L.safe.x, h: H - L.safe.bottom - 1268 * u }
    : { x: 1340 * u, y: 250 * u, w: W - L.safe.x - 1340 * u, h: 580 * u };
  const cap = tall ? { x: L.safe.x, y: 296 * u, size: 76 * u } : { x: 110 * u, y: 250 * u, size: 74 * u };
  const R = 54 * u,
    RH = 70 * u;

  // ---- time helpers (all pure in F)
  const bornK = (nid: NodeId, F: number) => {
    if (nid === "hub") return 1;
    const g = AGENTS.find((a) => a.id === nid)!;
    return spring((F - g.born) / FPS, { freq: 2.4, damp: 0.5 });
  };
  const collapse = (F: number) => ease.inOutCubic(prog(F, T.sign, T.sign + 26));
  // the camera: the hook is framed close on the lone request, then pulls back to the network and pushes in slowly
  const cam = (F: number) => {
    const back = ease.inOutCubic(prog(F, 58, 104)),
      c = collapse(F);
    const s = lerp(1.32, 1, back) * (1 + 0.035 * ease.inOutCubic(prog(F, 104, T.sign))) + 0.04 * prog(F, 0, 60);
    const hx = lerp(lerp(cx, hub0.x, back), cx, c),
      hy = lerp(lerp(tall ? cy - 60 * u : cy, hub0.y, back), tall ? cy - 60 * u : cy, c);
    return { s, hx, hy };
  };
  // a node's position in network space (hub at 0,0); agents slide into the hub on the collapse
  const pos = (nid: NodeId, F: number): [number, number] => {
    const [ox, oy] = OFF[nid],
      k = 1 - collapse(F);
    let x = ox * spread.x * k,
      y = oy * spread.y * k;
    if (nid === "ppl" && F > CONFLICT) {
      // the conflict: People shakes once, hard, and settles
      const t = (F - CONFLICT) / FPS;
      x += Math.sin(t * 38) * Math.exp(-t * 5.5) * 12 * u;
    }
    return [x, y];
  };
  const flashK = (nid: NodeId, F: number) => {
    const at = nid === "hub" ? HUB_FLASH : AGENTS.find((a) => a.id === nid)!.flash;
    return F < at ? 0 : Math.exp(-(F - at) / 9);
  };
  const done = (nid: NodeId, F: number) =>
    prog(
      F,
      nid === "hub" ? HUB_FLASH : AGENTS.find((a) => a.id === nid)!.flash,
      (nid === "hub" ? HUB_FLASH : AGENTS.find((a) => a.id === nid)!.flash) + 8,
    );
  const landed = (nid: NodeId, F: number) => {
    // a ripple each time a packet lands here
    let r = 0;
    for (const h of HOPS) if (h.to === nid && F >= h.b && F < h.b + 20) r = Math.max(r, 1 - (F - h.b) / 20);
    return r;
  };

  // ---- drawing primitives
  const disc = (ctx: Ctx, x: number, y: number, r: number, fill: string) => {
    if (r <= 0) return;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
  };
  const ring = (ctx: Ctx, x: number, y: number, r: number, stroke: string, lw: number) => {
    if (r <= 0) return;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.stroke();
  };
  // a dotted edge between two rims, drawn on to fraction `draw`, its dots marching slowly toward `b`
  const edge = (
    ctx: Ctx,
    a: [number, number],
    b: [number, number],
    ra: number,
    rb: number,
    draw: number,
    F: number,
    color: string,
  ) => {
    const dx = b[0] - a[0],
      dy = b[1] - a[1],
      len = Math.hypot(dx, dy),
      span = len - ra - rb;
    if (span <= 0 || draw <= 0) return;
    const ux = dx / len,
      uy = dy / len,
      gap = 17 * u,
      march = (F * 0.55 * u) % gap,
      end = span * draw;
    ctx.fillStyle = color;
    for (let d = march; d <= end; d += gap) {
      ctx.beginPath();
      ctx.arc(a[0] + ux * (ra + d), a[1] + uy * (ra + d), 2.6 * u, 0, Math.PI * 2);
      ctx.fill();
    }
  };
  // the glyphs: thin line icons, 1 unit = the node radius
  const glyph = (ctx: Ctx, nid: NodeId, x: number, y: number, s: number, color: string) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 3 * u;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const k = s;
    if (nid === "cal") {
      rr(ctx, -0.36 * k, -0.28 * k, 0.72 * k, 0.62 * k, 0.08 * k);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-0.36 * k, -0.1 * k);
      ctx.lineTo(0.36 * k, -0.1 * k);
      ctx.moveTo(-0.18 * k, -0.4 * k);
      ctx.lineTo(-0.18 * k, -0.22 * k);
      ctx.moveTo(0.18 * k, -0.4 * k);
      ctx.lineTo(0.18 * k, -0.22 * k);
      ctx.stroke();
      for (const [i, j] of [
        [-1, 0],
        [0, 0],
        [1, 0],
        [-1, 1],
        [0, 1],
      ])
        disc(ctx, i! * 0.17 * k, 0.05 * k + j! * 0.15 * k, 0.045 * k, color);
    } else if (nid === "ppl") {
      ring(ctx, -0.14 * k, -0.14 * k, 0.12 * k, color, 3 * u);
      ring(ctx, 0.18 * k, -0.1 * k, 0.1 * k, color, 3 * u);
      ctx.beginPath();
      ctx.arc(-0.14 * k, 0.28 * k, 0.24 * k, Math.PI, 0);
      ctx.moveTo(0.36 * k, 0.26 * k);
      ctx.arc(0.18 * k, 0.26 * k, 0.18 * k, 0, Math.PI, true);
      ctx.stroke();
    } else if (nid === "room") {
      rr(ctx, -0.22 * k, -0.36 * k, 0.44 * k, 0.7 * k, 0.05 * k);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-0.38 * k, 0.34 * k);
      ctx.lineTo(0.38 * k, 0.34 * k);
      ctx.stroke();
      disc(ctx, 0.1 * k, 0.02 * k, 0.05 * k, color);
    } else if (nid === "note") {
      ctx.beginPath();
      ctx.moveTo(-0.28 * k, -0.36 * k);
      ctx.lineTo(0.14 * k, -0.36 * k);
      ctx.lineTo(0.28 * k, -0.22 * k);
      ctx.lineTo(0.28 * k, 0.36 * k);
      ctx.lineTo(-0.28 * k, 0.36 * k);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      for (const [yy, ww] of [
        [-0.12, 0.36],
        [0.04, 0.36],
        [0.2, 0.22],
      ]) {
        ctx.moveTo(-0.16 * k, yy! * k);
        ctx.lineTo((-0.16 + ww!) * k, yy! * k);
      }
      ctx.stroke();
    } else {
      // the hub: a switchboard, a core and four short spokes
      disc(ctx, 0, 0, 0.13 * k, color);
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const a = Math.PI / 4 + (i * Math.PI) / 2;
        ctx.moveTo(Math.cos(a) * 0.24 * k, Math.sin(a) * 0.24 * k);
        ctx.lineTo(Math.cos(a) * 0.4 * k, Math.sin(a) * 0.4 * k);
      }
      ctx.stroke();
    }
    ctx.restore();
  };
  // a pill label (mono) centred on x, baseline-centred on y
  const pill = (
    ctx: Ctx,
    s: string,
    x: number,
    y: number,
    o: { size: number; fg: string; bg: string; stroke?: string; alpha?: number },
  ) => {
    const tw = measure(ctx, s, { size: o.size, family: F_.mono, weight: 500, track: 0.04 }),
      h = o.size * 1.7,
      pw = tw + o.size * 1.3;
    ctx.save();
    ctx.globalAlpha *= o.alpha ?? 1;
    rr(ctx, x - pw / 2, y - h / 2, pw, h, h / 2);
    ctx.fillStyle = o.bg;
    ctx.fill();
    if (o.stroke) {
      ctx.strokeStyle = o.stroke;
      ctx.lineWidth = 2 * u;
      ctx.stroke();
    }
    text(ctx, s, x, y + o.size * 0.36, {
      size: o.size,
      family: F_.mono,
      weight: 500,
      color: o.fg,
      align: "center",
      track: 0.04,
    });
    ctx.restore();
    return pw;
  };

  // ---- the network, in network space (hub at the origin)
  const ORBITS = [
    { rx: 128, ry: 44, tilt: -0.32, w: 0.05, a0: 0.3, born: 405 },
    { rx: 160, ry: 56, tilt: 0.36, w: -0.038, a0: 2.1, born: 413 },
    { rx: 196, ry: 66, tilt: 0.02, w: 0.028, a0: 4.2, born: 421 },
  ];
  // the spin-up: angular speed ramps over [405, 450], so the angle is the ramp's integral (pure in F)
  const spun = (F: number, a: number, b: number) =>
    F < a ? 0 : F < b ? ((F - a) * (F - a)) / (2 * (b - a)) : (b - a) / 2 + (F - b);
  const orbits = (ctx: Ctx, F: number) => {
    const c = collapse(F);
    ORBITS.forEach((o, i) => {
      const g = spring((F - o.born) / FPS, { freq: 1.6, damp: 0.7 }) * (1 - c);
      if (g <= 0.001) return;
      const rx = o.rx * u * g,
        ry = o.ry * u * g,
        tilt = o.tilt + 0.0025 * (F - T.resolve),
        ang =
          o.a0 +
          o.w *
            spun(F, T.resolve, 450) *
            (1 + 0.8 * window01(F, RESOLVED - 10, RESOLVED, RESOLVED + 10, RESOLVED + 40));
      ctx.save();
      ctx.rotate(tilt);
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.strokeStyle = i === 1 ? C.accent : C.muted;
      ctx.globalAlpha *= i === 1 ? 0.55 : 0.6;
      ctx.lineWidth = 1.6 * u;
      ctx.stroke();
      ctx.globalAlpha = 1;
      // a bead rides each ring
      const bx = Math.cos(ang) * rx,
        by = Math.sin(ang) * ry,
        gold = F >= RESOLVED && i === 1;
      disc(ctx, bx, by, 5.5 * u * g, gold ? C.accent2 : i === 1 ? C.accent : C.ink);
      ctx.restore();
    });
  };
  const satellites = (ctx: Ctx, F: number) => {
    // each agent has a few tools (tiny dots) wired to it: the starburst gets its density from them
    const c = collapse(F);
    AGENTS.forEach((g, gi) => {
      const [nx, ny] = pos(g.id, F),
        [ox, oy] = OFF[g.id],
        // tools fan up from the top agents and sideways from the bottom ones (never down, where the label sits)
        base = oy < 0 ? -Math.PI / 2 + ox * 0.75 : ox < 0 ? Math.PI - 0.35 : 0.35,
        k = bornK(g.id, F) * (1 - c);
      if (k <= 0.01) return;
      for (let j = 0; j < 3; j++) {
        const a = base + (j - 1) * 0.5 + 0.05 * Math.sin(F * 0.03 + gi + j),
          d = (90 + 20 * ((j + gi) % 2)) * u * clamp(k),
          sx = nx + Math.cos(a) * d,
          sy = ny + Math.sin(a) * d;
        ctx.globalAlpha = 0.5 * clamp(k);
        ctx.strokeStyle = C.line;
        ctx.lineWidth = 1.5 * u;
        ctx.beginPath();
        ctx.moveTo(nx + Math.cos(a) * R, ny + Math.sin(a) * R);
        ctx.lineTo(sx, sy);
        ctx.stroke();
        ctx.globalAlpha = clamp(k) * (0.55 + 0.3 * Math.sin(F * 0.09 + j * 2 + gi));
        disc(ctx, sx, sy, 4.5 * u, done(g.id, F) > 0 ? C.accent : C.muted);
        ctx.globalAlpha = 1;
      }
    });
  };
  const edges = (ctx: Ctx, F: number) => {
    const hub = pos("hub", F);
    for (const g of AGENTS) {
      const draw = ease.outCubic(prog(F, g.born + 4, g.born + 30)),
        green = done(g.id, F);
      edge(ctx, hub, pos(g.id, F), RH, R * clamp(bornK(g.id, F)), draw, F, green > 0.5 ? C.accent : C.muted);
    }
    // the side channel Calendar ↔ People (the only agent-to-agent line)
    edge(
      ctx,
      pos("cal", F),
      pos("ppl", F),
      R,
      R,
      ease.outCubic(prog(F, 180, 214)),
      F,
      F >= CONFLICT && F < CONFLICT + 40 && Math.floor((F - CONFLICT) / 5) % 2 === 0
        ? C.ink
        : done("ppl", F) > 0.5
          ? C.accent
          : C.muted,
    );
  };
  const packets = (ctx: Ctx, F: number) => {
    for (const h of HOPS) {
      if (F < h.a - 2 || F > h.b + 1) continue;
      const a = pos(h.from, F),
        b = pos(h.to, F),
        ra = h.from === "hub" ? RH : R,
        rb = h.to === "hub" ? RH : R;
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]),
        ux = (b[0] - a[0]) / len,
        uy = (b[1] - a[1]) / len;
      const at = (t: number): [number, number] => {
        const d = ra + (len - ra - rb) * t;
        return [a[0] + ux * d, a[1] + uy * d];
      };
      const t = ease.inOutCubic(prog(F, h.a, h.b)),
        gold = h.gold !== undefined && F >= h.gold,
        colr = gold ? C.accent2 : C.accent,
        grow = spring((F - h.a + 2) / FPS, { freq: 4, damp: 0.6 }) * (1 - prog(F, h.b - 1, h.b + 1));
      // a short fading trail behind the head
      for (let i = 5; i >= 1; i--) {
        const tt = ease.inOutCubic(prog(F - i * 1.4, h.a, h.b));
        if (tt >= t) continue;
        const [x, y] = at(tt);
        ctx.globalAlpha = 0.14 * (6 - i) * grow;
        disc(ctx, x, y, (8 - i) * 1.1 * u, colr);
      }
      ctx.globalAlpha = 1;
      const [x, y] = at(t);
      ctx.save();
      ctx.shadowColor = colr;
      ctx.shadowBlur = 26 * u;
      disc(ctx, x, y, 11 * u * grow, colr);
      ctx.restore();
      disc(ctx, x, y, 4.5 * u * grow, C.ground);
      // the gold moment: a ring pops where the packet turns
      if (h.gold && F >= h.gold && F < h.gold + 16) {
        const p = (F - h.gold) / 16;
        ctx.globalAlpha = 1 - p;
        ring(ctx, x, y, (14 + 40 * ease.outCubic(p)) * u, C.accent2, 2.5 * u);
        ctx.globalAlpha = 1;
      }
      if (h.tag) {
        // the tag rides on the side of the packet away from the network's centre line
        const nx = -uy,
          ny = ux,
          side = ny > 0 || (Math.abs(ny) < 0.2 && nx < 0) ? -1 : 1,
          ta = clamp(Math.min(prog(t, 0.05, 0.18), 1 - prog(t, 0.62, 0.8)));
        pill(ctx, h.tag, x + nx * side * 50 * u, y + ny * side * 50 * u, {
          size: 22 * u,
          fg: gold ? C.ground : C.ink,
          bg: gold ? C.accent2 : C.surface,
          stroke: gold ? undefined : C.line,
          alpha: ta,
        });
      }
    }
  };
  const node = (ctx: Ctx, nid: NodeId, F: number) => {
    const [x, y] = pos(nid, F),
      hub = nid === "hub",
      r = hub ? RH : R,
      k = bornK(nid, F),
      c = collapse(F);
    if (k <= 0.001) return;
    const fl = flashK(nid, F),
      ok = done(nid, F),
      rip = landed(nid, F),
      conflict = nid === "ppl" ? window01(F, CONFLICT, CONFLICT + 3, CONFLICT + 34, CONFLICT + 44) : 0;
    const s = hub ? 1 + 0.03 * Math.sin(F * 0.12) * (1 - c) : k * (1 - c * 0.6);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    // ripples: a landing, and the hub's slow heartbeat
    if (rip > 0) {
      ctx.globalAlpha = rip * 0.8;
      ring(
        ctx,
        0,
        0,
        r + (1 - rip) * 36 * u,
        F >= RESOLVED && hub && F < RESOLVED + 20 ? C.accent2 : C.accent,
        2.5 * u,
      );
      ctx.globalAlpha = 1;
    }
    if (hub && F > 40) {
      const p = ((F - 40) % 45) / 45;
      ctx.globalAlpha = (1 - p) * 0.35 * (1 - c);
      ring(ctx, 0, 0, r + p * 60 * u, C.accent, 1.5 * u);
      ctx.globalAlpha = 1;
    }
    // the body: flat fill, a thin ring; depth only from the packet glow
    const lit = hub ? 1 : Math.max(ok, clamp(rip * 1.5));
    disc(ctx, 0, 0, r, fl > 0.02 ? mix(C.surface, C.accent, fl) : C.surface);
    const stroke =
      conflict > 0.5 ? C.ink : hub && F >= RESOLVED && F < HUB_FLASH ? C.accent2 : lit > 0.5 ? C.accent : C.line;
    ctx.save();
    if (conflict > 0.5) ctx.setLineDash([7 * u, 6 * u]);
    ring(ctx, 0, 0, r, stroke, (hub ? 3 : 2.5) * u);
    ctx.restore();
    glyph(
      ctx,
      nid,
      0,
      0,
      r * 1.05,
      fl > 0.45 ? C.ground : conflict > 0.5 ? C.muted : hub || ok > 0.5 ? C.accent : C.ink,
    );
    // badges: the conflict's × and the confirmation's check
    if (conflict > 0) {
      const bk = spring((F - CONFLICT) / FPS, { freq: 3, damp: 0.5 }) * conflict;
      disc(ctx, r * 0.72, -r * 0.72, 17 * u * bk, C.ink);
      text(ctx, "×", r * 0.72, -r * 0.72 + 8 * u * bk, {
        size: 26 * u * bk,
        family: F_.mono,
        weight: 500,
        color: C.ground,
        align: "center",
      });
    }
    if (ok > 0 && !hub) {
      const bk = spring((F - AGENTS.find((a) => a.id === nid)!.flash) / FPS, { freq: 3, damp: 0.5 });
      disc(ctx, r * 0.72, -r * 0.72, 17 * u * bk, C.accent);
      check(ctx, r * 0.72, -r * 0.72, 18 * u * bk, ok, C.ground, 3.5 * u);
    }
    ctx.restore();
    // the mono label under an agent
    if (!hub) {
      const la =
        clamp(prog(F, AGENTS.find((a) => a.id === nid)!.born + 6, AGENTS.find((a) => a.id === nid)!.born + 18)) *
        (1 - prog(F, T.sign, T.sign + 10));
      mono(ctx, AGENTS.find((a) => a.id === nid)!.name, x, y + r + 38 * u, {
        align: "center",
        size: 22,
        color: ok > 0.5 ? C.accent : conflict > 0.5 ? C.ink : C.muted,
        alpha: la,
      });
    }
  };
  // the conflict tag over People: the asked time, struck through
  const conflictTag = (ctx: Ctx, F: number) => {
    const a = window01(F, CONFLICT + 4, CONFLICT + 10, CONFLICT + 40, CONFLICT + 50);
    if (a <= 0) return;
    const [x, y] = pos("ppl", F),
      ty = y - R - 44 * u,
      pw = pill(ctx, "Tue 10:00", x, ty, { size: 22 * u, fg: C.ink, bg: C.surface, stroke: C.ink, alpha: a }),
      st = ease.outCubic(prog(F, CONFLICT + 10, CONFLICT + 18));
    ctx.save();
    ctx.globalAlpha = a;
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 2.5 * u;
    ctx.beginPath();
    ctx.moveTo(x - pw / 2 + 14 * u, ty);
    ctx.lineTo(x - pw / 2 + 14 * u + (pw - 28 * u) * st, ty);
    ctx.stroke();
    ctx.restore();
  };
  // the hub's label: the request in full while it is alone, then its short name; the found time sits above it
  const hubLabels = (ctx: Ctx, F: number) => {
    const c = collapse(F);
    const blink = F < 20 ? (Math.floor(F / 4) % 2 === 0 ? 1 : 0) : 1;
    const full = "request: one hour, four people",
      n = Math.floor(clamp((F - 14) * 1.3, 0, full.length)),
      swap = ease.inOutCubic(prog(F, 70, 86));
    if (swap < 1 && n > 0) {
      const s = full.slice(0, n) + (F < 60 && Math.floor(F / 8) % 2 === 0 ? "_" : "");
      mono(ctx, s, 0, RH + 52 * u, { align: "center", size: 24, color: C.ink, alpha: (1 - swap) * blink });
    }
    if (swap > 0)
      mono(ctx, "REQUEST", 0, RH + 38 * u, {
        align: "center",
        size: 22,
        color: F >= HUB_FLASH ? C.accent : C.muted,
        alpha: swap * (1 - prog(F, T.resolve - 8, T.resolve + 4)),
      });
    const ga = spring((F - RESOLVED) / FPS, { freq: 2.6, damp: 0.55 }) * (1 - c);
    if (F >= RESOLVED && ga > 0.01) {
      ctx.save();
      ctx.translate(0, -RH - 58 * u);
      ctx.scale(ga, ga);
      pill(ctx, "Thu 15:00", 0, 0, { size: 30 * u, fg: C.ground, bg: C.accent2 });
      ctx.restore();
    }
  };
  const network = (ctx: Ctx, F: number) => {
    const { s, hx, hy } = cam(F);
    // the hook: the request node blinks on like a cursor, then lands with a spring
    const on = F < 20 ? (Math.floor(F / 4) % 2 === 0 ? 1 : 0) : 1,
      land = spring((F - 16) / FPS, { freq: 2.2, damp: 0.45 });
    if (F >= HANDOFF) return; // from here the sign-off draws the hub as the mark
    ctx.save();
    ctx.translate(hx, hy);
    ctx.scale(s, s);
    orbits(ctx, F);
    satellites(ctx, F);
    edges(ctx, F);
    packets(ctx, F);
    for (const g of AGENTS) node(ctx, g.id, F);
    conflictTag(ctx, F);
    ctx.save();
    const hk = F < 16 ? 0.62 * on : 0.62 + 0.38 * land;
    ctx.scale(hk, hk);
    ctx.globalAlpha = F < 16 ? on : 1;
    node(ctx, "hub", F);
    ctx.restore();
    ctx.globalAlpha = 1;
    hubLabels(ctx, F);
    ctx.restore();
  };

  // ---- the log panel (screen space): lines type on, the list scrolls a line as each one lands past the fold
  const LS = tall ? 26 : 24, // the log's type size: the vertical's panel is wider, so it reads larger
    LH = (tall ? 41 : 38) * u,
    HEAD = 66 * u,
    rows = Math.floor((panel.h - HEAD - 22 * u) / LH);
  const logPanel = (ctx: Ctx, F: number) => {
    const inA = ease.outCubic(prog(F, 24, 44)),
      out = ease.inCubic(prog(F, T.sign, T.sign + 18));
    if (inA <= 0) return;
    ctx.save();
    ctx.globalAlpha = inA * (1 - out);
    ctx.translate(tall ? 0 : (1 - inA) * 60 * u + out * 80 * u, tall ? (1 - inA) * 60 * u + out * 80 * u : 0);
    rr(ctx, panel.x, panel.y, panel.w, panel.h, 20 * u);
    ctx.fillStyle = C.surface;
    ctx.fill();
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 2 * u;
    ctx.stroke();
    const px = panel.x + 28 * u;
    mono(ctx, "handoff.log", px, panel.y + 42 * u, { size: 22, color: C.muted });
    const live = 0.5 + 0.5 * Math.sin(F * 0.25);
    disc(ctx, panel.x + panel.w - 100 * u, panel.y + 34 * u, 6 * u, C.accent);
    ctx.globalAlpha = inA * (1 - out) * live * 0.5;
    disc(ctx, panel.x + panel.w - 100 * u, panel.y + 34 * u, 12 * u, C.accent);
    ctx.globalAlpha = inA * (1 - out);
    mono(ctx, "LIVE", panel.x + panel.w - 28 * u, panel.y + 42 * u, { size: 22, color: C.accent, align: "right" });
    ctx.fillStyle = C.line;
    ctx.fillRect(panel.x, panel.y + HEAD, panel.w, 2 * u);
    // clip the body and scroll it: each line past the fold eases the list up by one row
    ctx.save();
    ctx.beginPath();
    ctx.rect(panel.x, panel.y + HEAD + 2 * u, panel.w, panel.h - HEAD - 2 * u);
    ctx.clip();
    let scroll = 0;
    LOG.forEach(([at], i) => {
      if (i >= rows) scroll += ease.outCubic(prog(F, at - 6, at + 4)) * LH;
    });
    let last = -1,
      lastEnd = 0;
    LOG.forEach(([at, runs], i) => {
      if (F < at) return;
      const y = panel.y + HEAD + 12 * u + LH * (i + 1) - 10 * u - scroll;
      // lines scrolling under the header fade out before they reach it
      const fadeTop = clamp((y - (panel.y + HEAD + LH * 0.55)) / (LH * 0.5));
      if (fadeTop <= 0) return;
      ctx.save();
      ctx.globalAlpha *= fadeTop;
      let x = px,
        budget = Math.floor((F - at) * 2.4);
      const fresh = window01(F, at, at + 1, at + 20, at + 40);
      if (fresh > 0) {
        ctx.save();
        ctx.globalAlpha *= fresh * 0.5;
        ctx.fillStyle = C.line;
        ctx.fillRect(panel.x + 6 * u, y - LH * 0.7, panel.w - 12 * u, LH);
        ctx.restore();
      }
      for (const [s, role] of runs) {
        if (budget <= 0) break;
        const part = s.slice(0, budget);
        budget -= s.length;
        x += mono(ctx, part, x, y, { size: LS, color: col(role) }) + (part.length === s.length ? 0.06 * LS * u : 0);
      }
      ctx.restore();
      last = y;
      lastEnd = x;
    });
    // the cursor: a block that blinks after the newest line
    if (last > 0 && Math.floor(F / 9) % 2 === 0) {
      ctx.fillStyle = C.accent;
      ctx.fillRect(lastEnd + 6 * u, last - 20 * u, 12 * u, 24 * u);
    }
    ctx.restore();
    ctx.restore();
  };

  // ---- captions: serif ladders beside the action, one accent italic word each, words on the beat
  const CAPS: { from: number; out: number; lines: Word[][] }[] = [
    {
      from: 0,
      out: 64,
      lines: [
        [w("It starts", 18, { scale: 0.7 })],
        [w("with one", 26, { scale: 0.7 })],
        [w("request.", 36, { key: true, scale: 1.25 })],
      ],
    },
    {
      from: T.agents,
      out: 212,
      lines: [
        [w("Four", 96), w("agents,", 104)],
        [w("one", 112, { scale: 0.8 }), w("job", 120, { key: true, scale: 1.3 })],
        [w("each.", 128, { scale: 0.8 })],
      ],
    },
    {
      from: T.packets,
      out: 392,
      lines: [
        [w("Watch the", 244, { scale: 0.7 })],
        [w("traffic,", 256, { key: true, scale: 1.35 })],
        [w("not the", 270, { scale: 0.7 }), w("boxes.", 278, { scale: 0.7 })],
      ],
    },
    {
      from: T.resolve,
      out: 542,
      lines: [
        [w("Hop", 420, { scale: 0.8 }), w("by", 426, { scale: 0.8 }), w("hop,", 432, { scale: 0.8 })],
        [w("a time", 444, { scale: 0.8 })],
        [w("lands.", RESOLVED, { key: true, scale: 1.35 })],
      ],
    },
    {
      from: T.confirm,
      out: 652,
      lines: [
        [w("Everyone", 572, { scale: 0.8 })],
        [w("says", 586, { scale: 0.8 })],
        [w("yes.", 600, { key: true, scale: 1.4 })],
      ],
    },
  ];
  const captions = (ctx: Ctx, F: number) => {
    const c = CAPS.find((k) => F >= k.from && F < k.out + 10);
    if (!c) return;
    ladder(ctx, c.lines, cap.x, cap.y, F, {
      size: cap.size,
      face: F_.serif,
      italic: F_.italic,
      ink: C.ink,
      accent: c.lines.flat().some((x) => x.t === "lands.") ? C.accent2 : C.accent,
      fps: FPS,
      out: c.out,
      gap: 0.06,
    });
  };

  // ---- sign-off: the network has collapsed into the hub; the hub itself shrinks and slides into the mark
  const signoff = (ctx: Ctx, F: number) => {
    if (F < HANDOFF) return;
    const f = F - HANDOFF,
      c0 = cam(HANDOFF),
      o = {
        size: (tall ? 180 : 210) * u,
        family: F_.serif,
        weight: 400,
        color: C.ink,
        align: "left" as const,
        track: -0.01,
      },
      tw = measure(ctx, P.product, o),
      mr = 46 * u,
      gap = 62 * u,
      total = mr * 2 + gap + tw,
      x0 = cx - total / 2,
      oy = c0.hy,
      base = oy + o.size * 0.3,
      my = base - o.size * 0.3;
    // a slow push-in keeps the last hold alive
    const push = 1 + 0.045 * ease.outCubic(prog(F, HANDOFF, N));
    ctx.save();
    ctx.translate(cx, oy);
    ctx.scale(push, push);
    ctx.translate(-cx, -oy);
    const mv = ease.inOutCubic(prog(F, HANDOFF, HANDOFF + 14)),
      mx = lerp(c0.hx, x0 + mr, mv),
      mY = lerp(c0.hy, my, mv),
      r = lerp(RH * c0.s, mr, mv),
      beat = 1 + 0.05 * Math.sin(F * 0.12) * prog(F, HANDOFF + 14, HANDOFF + 24);
    // the mark: the hub's own ring and core, its spokes folding away
    disc(ctx, mx, mY, r * beat, C.surface);
    ring(ctx, mx, mY, r * beat, C.accent, 3.5 * u);
    ctx.save();
    ctx.globalAlpha = 1 - mv;
    glyph(ctx, "hub", mx, mY, r * 1.05, C.accent);
    ctx.restore();
    disc(ctx, mx, mY, lerp(0.13 * RH * 1.05 * c0.s, 16 * u, mv), C.accent);
    // a thin orbit keeps turning round the mark, with one gold bead: the found time
    const oa = prog(F, HANDOFF + 8, HANDOFF + 22);
    ctx.save();
    ctx.translate(mx, mY);
    ctx.rotate(-0.35 + (F - HANDOFF) * 0.012);
    ctx.globalAlpha = 0.6 * oa;
    ctx.beginPath();
    ctx.ellipse(0, 0, mr * 1.34, mr * 0.5, 0, 0, Math.PI * 2);
    ctx.strokeStyle = C.muted;
    ctx.lineWidth = 1.6 * u;
    ctx.stroke();
    ctx.globalAlpha = oa;
    const ba = (F - HANDOFF) * 0.1;
    disc(ctx, Math.cos(ba) * mr * 1.34, Math.sin(ba) * mr * 0.5, 5.5 * u, C.accent2);
    ctx.restore();
    letters(
      ctx,
      P.product,
      x0 + mr * 2 + gap,
      base,
      o,
      (i) => spring((f - 6 - i * 2.5) / FPS, { freq: 2.4, damp: 0.75 }),
      "rise",
    );
    const ta = prog(F, HANDOFF + 14, HANDOFF + 24);
    text(ctx, PACK.tagline, cx, base + (tall ? 100 : 96) * u, {
      size: (tall ? 46 : 44) * u,
      family: F_.italic,
      color: C.ink,
      align: "center",
      alpha: ta,
    });
    mono(ctx, "4 agents · 1 hub · every handoff logged", cx, base + (tall ? 170 : 160) * u, {
      align: "center",
      size: 22,
      color: C.muted,
      alpha: prog(F, HANDOFF + 20, HANDOFF + 30),
    });
    ctx.restore();
  };

  // ---- the HUD: read, not watched; drawn sharp on top of the blurred frame
  const hud = (ctx: Ctx, F: number) => {
    const a = prog(F, 6, 30),
      m = L.safe.x,
      top = (tall ? 262 : 98) * u,
      bot = H - 78 * u;
    const section = [...SECTIONS].reverse().find(([s]) => F >= s)![1],
      secs = Math.floor(F / FPS),
      fr = Math.floor(F % FPS);
    ctx.save();
    ctx.globalAlpha = a;
    mono(ctx, "ORIEL · AGENT MAP", m, top);
    if (tall) {
      mono(ctx, section, W - m, top, { align: "right", color: C.ink });
      ctx.fillStyle = C.line;
      ctx.fillRect(m, top + 18 * u, W - 2 * m, 2 * u);
      ctx.fillStyle = C.accent;
      ctx.fillRect(m, top + 18 * u, (W - 2 * m) * clamp(F / (N - 1)), 2 * u);
    } else {
      mono(ctx, "STUDY 16 · 30 FPS", W - m, top, { align: "right" });
      mono(ctx, `00:${String(secs).padStart(2, "0")}:${String(fr).padStart(2, "0")}`, m, bot);
      mono(ctx, section, W - m, bot, { align: "right", color: C.ink });
      ctx.fillStyle = C.line;
      ctx.fillRect(m, bot + 18 * u, W - 2 * m, 2 * u);
      ctx.fillStyle = C.accent;
      ctx.fillRect(m, bot + 18 * u, (W - 2 * m) * clamp(F / (N - 1)), 2 * u);
    }
    ctx.restore();
  };

  const paint = (ctx: Ctx, env: Env, F: number) => {
    F = clamp(F, 0, N - 1);
    ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = C.ground;
    ctx.fillRect(0, 0, W, H);
    // a faint dot grid drifts slowly under everything: the ground is never quite still
    ctx.fillStyle = "rgba(214,255,217,0.04)";
    const g = 54 * u,
      dy = (F * 0.25 * u) % g;
    for (let x = (W / 2) % g; x < W; x += g)
      for (let y = ((H / 2) % g) - g + dy; y < H; y += g) ctx.fillRect(x - u, y - u, 2 * u, 2 * u);
    network(ctx, F);
    logPanel(ctx, F);
    captions(ctx, F);
    signoff(ctx, F);
  };

  const cuts = [0, T.agents, T.packets, T.resolve, T.confirm, T.sign, N],
    names = ["request", "agents", "handoffs", "resolve", "confirm", "signoff"];
  const shots: Shot[] = names.map((sid, i) => ({
    id: sid,
    start: cuts[i]!,
    end: cuts[i + 1]!,
    draw: (ctx, local, env) => {
      // no motion blur: at 30 fps the packets carry their own trails, and every label must stay readable
      paint(ctx, env, cuts[i]! + local);
      ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
      hud(ctx, cuts[i]! + local);
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
      hits: [RESOLVED, HANDOFF],
      whooshes: [HANDOFF],
      // a blip for every packet hop (on landing), the conflict and each agent coming online
      ticks: [...HOPS.map((h) => h.b), CONFLICT + 16, ...AGENTS.map((g) => g.born), 16],
      sign: HANDOFF + 6,
      gain: 0.7, // about −16 LUFS
    }),
  };
}

// mix two #rrggbb colours (for the green flash: flat colour, blended over a few frames)
function mix(a: string, b: string, t: number) {
  const pa = parseInt(a.slice(1), 16),
    pb = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

export const agentNetwork = make("landscape", "agentNetwork");
export const agentNetworkVertical = make("vertical", "agentNetworkVertical");
