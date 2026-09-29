// STUDY 41 · SEASONS ORRERY (34 s, 30 fps, 120 bpm). A science diagram built as a mechanical tellurion on a deep
// navy ground, drawn like an instrument plate: an orbit on a tabletop, a flat Sun on a pillar, an arm with turning
// gears that carries a tilted Earth whose axis rod stays parallel to itself all the way round. A beam inset turns
// "direct light" into squares you can count; a day dial shows day and night at 40° N from the sunrise equation.
// One source, designed for landscape and vertical. Brand: the neutral pack, palette "deep". Subject: learn.
// Brief: series/studies/briefs/seasons-orrery.json · prompt: series/studies/prompts/seasons-orrery.prompt.md
//
// The whole film is one continuous function paint(F) of a (fractional) frame F. Everything the Earth does is a
// function of one orbital angle s(F) (0 at the March equinox, π/2 at the June solstice) that eases between the
// beats' positions: the night side, the latitude lines, the beam's angle, the lit squares and the day dial are
// all computed from it, never simulated. The shots only name the sections.
import PACK from "../../../brand/packs/studio/pack.json";
import type { Ctx, Env } from "../core";
import type { Film, Shot } from "../film";
import { clamp, ease, lerp, prog, spring } from "../kit/motion";
import { usePack } from "../kit/pack";
import { beatScore } from "../kit/score";
import { layout, type Size } from "../kit/sizes";
import { measure, text } from "../kit/type";
import { rr } from "../kit/ui";

const P = usePack(PACK),
  C = P.palette("deep"),
  FACE = P.face;
const FPS = 30,
  BPM = 120,
  N = 1020; // a beat is 15 frames
const T = { hook: 0, tilt: 120, june: 255, beam: 450, dec: 630, eq: 810, end: 930 };

const TAU = Math.PI * 2,
  DEG = Math.PI / 180,
  TILT = 23.4 * DEG,
  LAT = 40 * DEG;

// ---- colour helpers
const rgba = (h: string, a: number) => {
  const n = parseInt(h.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};
const DIAL_POP = 390; // June's long day, pointed at: the dial snaps and its day arc flashes
const SWAP = 645; // December's swap: the dial slams back with a short day and the rod's south end flashes, on a hit
const mixHex = (a: string, b: string, t: number) => {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const x = p(a),
    y = p(b);
  return `rgb(${x.map((v, i) => Math.round(v + (y[i]! - v) * t)).join(",")})`;
};
/** a LANDING: full on the frame something lands, then decays (a snap, not a swell) */
const snap = (F: number, at: number, tau = 6) => (F < at ? 0 : Math.exp(-(F - at) / tau));
const sp = (F: number, at: number, freq = 2.6, damp = 0.55) => spring((F - at) / FPS, { freq, damp });

// ---- the orbital angle s(F): segments [from, to, s0, s1, easing]. s = 0 March, π/2 June, π September, 3π/2 December
const JAN = TAU * ((0.1 - 2.65) / 12) + TAU; // early January (about Jan 3), a little past the December solstice
const JUN = Math.PI / 2 + TAU,
  DEC = JUN + Math.PI,
  MAR = 2 * TAU,
  SEP = MAR + Math.PI;
type Seg = [number, number, number, number, (t: number) => number];
const SEGS: Seg[] = [
  [0, 44, Math.PI - 0.55, Math.PI, ease.outCubic], // the arm swings in
  [44, 84, Math.PI, JAN, ease.inOutCubic], // sweeps to early January
  [84, 195, JAN, JAN + 0.06, ease.linear], // drift
  [195, 255, JAN + 0.06, JUN, ease.inOutCubic], // the quick half turn, arriving at June on the whoosh
  [255, 510, JUN, JUN + 0.15, ease.linear],
  [510, 630, JUN + 0.15, DEC, ease.inOutCubic], // half way round to December, arriving on the whoosh
  [630, 778, DEC, DEC + 0.16, ease.linear],
  [778, 810, DEC + 0.16, MAR, ease.inOutCubic], // to March, arriving on the whoosh
  [810, 850, MAR, MAR + 0.03, ease.linear],
  [850, 888, MAR + 0.03, SEP, ease.inOutCubic], // March to September
  [888, 930, SEP, SEP + 0.03, ease.linear],
  [930, 1020, SEP + 0.03, SEP + 0.5, ease.linear], // the arm keeps turning behind the end card
];
const sAt = (F: number) => {
  for (const [a, b, s0, s1, e] of SEGS) if (F < b) return lerp(s0, s1, e(prog(F, a, b)));
  return SEGS[SEGS.length - 1]![3];
};
/** the Sun's declination and what follows from it at 40° N */
const decl = (s: number) => TILT * Math.sin(s);
const noonElev = (s: number) => 90 * DEG - LAT + decl(s);
const dayHalf = (dl: number) => Math.acos(clamp(-Math.tan(LAT) * Math.tan(dl), -1, 1)); // half the day, as an angle
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthOf = (s: number) => MONTHS[Math.floor((((2.65 + (12 * s) / TAU) % 12) + 12) % 12)]!;

// ---- captions: Inter 600 headlines with one key word in Instrument Serif Italic, a muted second line
type Cap = { at: number; out: number; head: string; sub?: string; subAt?: number };
const CAPS: Cap[] = [
  {
    at: 4,
    out: 112,
    head: "Is summer when we're *closest* to the Sun?",
    sub: "No. We're closest in early January.",
    subAt: 90,
  },
  {
    at: 128,
    out: 247,
    head: "Earth is *tilted* about 23.4°.",
    sub: "And the tilt points the same way all year.",
    subAt: 204,
  },
  {
    at: 262,
    out: 442,
    head: "June: the north leans *toward* the Sun.",
    sub: "Longer days, more direct light: northern summer.",
    subAt: 318,
  },
  {
    at: 458,
    out: 622,
    head: "Low sun spreads the *same* light over more ground.",
    sub: "So each patch gets less.",
    subAt: 588,
  },
  {
    at: 638,
    out: 802,
    head: "December: the *south* gets its turn.",
    sub: "Short days up north, summer down south.",
    subAt: 700,
  },
  { at: 818, out: 922, head: "March and September: the Sun is overhead at the *equator*." },
];

// ---- 3D: X right, Y up (north of the orbit plane), Z toward the viewer. The table is seen from above at e.
type V3 = [number, number, number];
const dot3 = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const AXIS: V3 = [Math.sin(TILT), Math.cos(TILT), 0]; // leans toward +X for ever: north toward the Sun at June (left)
// an equatorial basis (U1 × U2 = AXIS, so longitude grows eastward: the spin is prograde)
const U1: V3 = [0, 0, 1],
  U2: V3 = [Math.cos(TILT), -Math.sin(TILT), 0];
/** the Earth's daily turn, as its angle: one turn every 3.3 seconds (a tellurion's gearing, sped up) */
const spinAt = (F: number) => (TAU * F) / 100;
/** the place at 40° N, at longitude = the spin angle, on a sphere of radius r */
const markerAt = (spin: number, r: number): V3 =>
  [0, 1, 2].map(
    (j) => r * (Math.sin(LAT) * AXIS[j]! + Math.cos(LAT) * (Math.cos(spin) * U1[j]! + Math.sin(spin) * U2[j]!)),
  ) as V3;
/** the place's hour angle: 0 at local noon (facing the Sun), growing through the afternoon */
const hourAngle = (sunDir: V3, spin: number) => {
  const lon = Math.atan2(dot3(sunDir, U2), dot3(sunDir, U1)),
    h = spin - lon;
  return Math.atan2(Math.sin(h), Math.cos(h));
};

export function make(size: Size, id: string): Film {
  const L = layout(size),
    { W, H, u, cx, tall } = L;
  // the machine, per size (the brief's 1300 × 420 / 900 × 360 are shrunk so the Earth and its labels fit)
  const G = tall
    ? { ox: 540, oy: 1005, rx: 425, ry: 172, sunH: 140, postH: 118, er: 62, sunR: 56 }
    : { ox: 640, oy: 690, rx: 500, ry: 210, sunH: 150, postH: 125, er: 70, sunR: 64 };
  for (const k of Object.keys(G) as (keyof typeof G)[]) G[k] *= u;
  const sinE = G.ry / G.rx,
    cosE = Math.sqrt(1 - sinE * sinE),
    VIEW: V3 = [0, sinE, cosE];
  const proj = (v: V3): [number, number] => [v[0], v[2] * sinE - v[1] * cosE];
  const thetaOf = (s: number) => -Math.PI / 2 - s; // screen angle on the table: Mar far, Jun left, Sep near, Dec right
  const table = (s: number, R = G.rx): [number, number] => {
    const th = thetaOf(s);
    return [G.ox + R * Math.cos(th), G.oy + R * Math.sin(th) * sinE];
  };
  const earthAt = (s: number): [number, number] => {
    const [x, y] = table(s);
    return [x, y - G.postH];
  };
  const sunC: [number, number] = [G.ox, G.oy - G.sunH];

  // ---- per-size panels (screen space)
  const capX = L.safe.x,
    capW = W - 2 * L.safe.x,
    capTop = tall ? L.safe.top + 30 * u : L.safe.top + 4 * u;
  const HEAD = (tall ? 62 : 58) * u,
    SUB = 44 * u;
  const insetSmall = tall
    ? { x: 80 * u, y: 1245 * u, w: 540 * u, h: 355 * u }
    : { x: 1330 * u, y: 290 * u, w: 510 * u, h: 400 * u };
  const insetBig = tall
    ? { x: 80 * u, y: 975 * u, w: 920 * u, h: 625 * u }
    : { x: 890 * u, y: 270 * u, w: 950 * u, h: 740 * u };
  const dialC: [number, number] = tall ? [850 * u, 1395 * u] : [1585 * u, 840 * u],
    dialR = (tall ? 108 : 112) * u;

  // ---- the camera: screen = g + k · (world − f). Home drifts in a slow 2% push; beats blend toward targets.
  const pivot: [number, number] = [G.ox, G.oy - 100 * u];
  const cam = (F: number) => {
    const drift = 1 + 0.02 * (0.5 - 0.5 * Math.cos((TAU * F) / 330)) + 0.02 * ease.inOutCubic(prog(F, 930, 1020));
    let f: [number, number] = [...pivot],
      g: [number, number] = [...pivot],
      k = drift;
    const blend = (w: number, f2: [number, number], g2: [number, number], k2: number) => {
      if (w <= 0) return;
      f = [lerp(f[0], f2[0], w), lerp(f[1], f2[1], w)];
      g = [lerp(g[0], g2[0], w), lerp(g[1], g2[1], w)];
      k = lerp(k, k2, w);
    };
    // before the dial and the inset arrive, the machine has the frame to itself: larger and centred
    const w0 = 1 - ease.inOutCubic(prog(F, 262, 292));
    blend(w0, pivot, tall ? [540 * u, 1090 * u] : [900 * u, 640 * u], (tall ? 1.04 : 1.1) * drift);
    // the beam beat: the stage steps aside for the inset
    const wb = ease.inOutCubic(Math.min(prog(F, 450, 478), 1 - prog(F, 630, 645)));
    blend(wb, pivot, tall ? [540 * u, 795 * u] : [455 * u, 650 * u], tall ? 0.66 : 0.68);
    // the tilt: a push toward the Earth
    const E = earthAt(sAt(F));
    const wt = ease.inOutCubic(Math.min(prog(F, 122, 150), 1 - prog(F, 188, 218)));
    blend(wt, E, tall ? [540 * u, 870 * u] : [760 * u, 630 * u], (tall ? 2.1 : 2.2) * (1 + 0.03 * prog(F, 150, 190)));
    // the end card: the machine steps back and down, still turning, behind the words
    const we = ease.inOutCubic(prog(F, 928, 958));
    blend(we, pivot, tall ? [540 * u, 1250 * u] : [960 * u, 770 * u], (tall ? 0.8 : 0.66) * drift);
    // a slow float, as if the camera were held: the plate never sits dead still
    const fl = (TAU * F) / 180;
    g = [g[0] + 14 * u * Math.cos(fl), g[1] + 9 * u * Math.sin(fl)];
    return { f, g, k };
  };
  type Cam = ReturnType<typeof cam>;
  const toScreen = (c: Cam, p: [number, number]): [number, number] => [
    c.g[0] + c.k * (p[0] - c.f[0]),
    c.g[1] + c.k * (p[1] - c.f[1]),
  ];

  // ---- small drawing helpers
  const disc = (ctx: Ctx, x: number, y: number, r: number, fill: string) => {
    if (r <= 0) return;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fillStyle = fill;
    ctx.fill();
  };
  const mono = (
    ctx: Ctx,
    s: string,
    x: number,
    y: number,
    size: number,
    color: string,
    align: CanvasTextAlign = "left",
    alpha = 1,
  ) => text(ctx, s, x, y, { size, family: FACE.mono, weight: 500, color, align, track: 0.02, alpha });

  // ---- the Earth: a disc whose night side, latitude lines and marker are computed from the Sun's direction
  type EarthOpts = {
    alpha?: number;
    lat?: boolean;
    marker?: number;
    labels?: number;
    eq?: number;
    rodHi?: number;
    k: number;
  };
  const earth = (ctx: Ctx, s: number, E: [number, number], r: number, o: EarthOpts, spin = 0) => {
    const th = thetaOf(s),
      S: V3 = [-Math.cos(th), 0, -Math.sin(th)]; // toward the Sun (the table is level with the Sun, near enough)
    const a = o.alpha ?? 1;
    ctx.save();
    ctx.globalAlpha *= a;
    const ns = proj(AXIS),
      rodW = Math.max(3 * u, 3 * u * Math.min(1, 1 / o.k)) * (r / G.er > 1.5 ? 1.3 : 1);
    // the rod, drawn under the disc (the south end shows only beyond the limb)
    const rod = (from: number, to: number, color: string) => {
      ctx.beginPath();
      ctx.moveTo(E[0] + ns[0] * r * from, E[1] + ns[1] * r * from);
      ctx.lineTo(E[0] + ns[0] * r * to, E[1] + ns[1] * r * to);
      ctx.strokeStyle = color;
      ctx.lineWidth = rodW;
      ctx.lineCap = "round";
      ctx.stroke();
    };
    const rodColor = o.rodHi ? C.accent : C.ink;
    rod(-1.5, 0, rodColor);
    disc(ctx, E[0], E[1], r, C.accent2);
    const lw = (w: number) => w * u * Math.max(1, Math.min(1.6, r / G.er / 1.4));
    // a circle on the sphere (centre c, basis e1/e2, radius rho): its front half solid, or its back half dashed
    const circle = (c: V3, e1: V3, e2: V3, rho: number, back = false) => {
      ctx.beginPath();
      let pen = false;
      for (let i = 0; i <= 72; i++) {
        const t = (TAU * i) / 72,
          p: V3 = [0, 1, 2].map((j) => c[j]! + rho * (Math.cos(t) * e1[j]! + Math.sin(t) * e2[j]!)) as V3;
        const q = proj(p),
          vis = dot3(p, VIEW) >= 0;
        if (vis !== back) {
          if (pen) ctx.lineTo(E[0] + q[0], E[1] + q[1]);
          else ctx.moveTo(E[0] + q[0], E[1] + q[1]);
          pen = true;
        } else pen = false;
      }
      ctx.stroke();
    };
    const O: V3 = [0, 0, 0];
    const latCircle = (la: number, back = false) =>
      circle(AXIS.map((v) => v * r * Math.sin(la)) as V3, U1, U2, r * Math.cos(la), back);
    // the lines: the equator, the tropics and polar circles tilted with the axis, and meridians that turn with the spin
    if (o.lat !== false) {
      ctx.strokeStyle = C.ink;
      for (const latDeg of [0, 23.44, -23.44, 66.56, -66.56]) {
        ctx.globalAlpha = a * (latDeg === 0 ? 0.6 : 0.38);
        ctx.lineWidth = lw(latDeg === 0 ? 1.6 : 1.1);
        latCircle(latDeg * DEG);
      }
      ctx.globalAlpha = a * 0.26;
      ctx.lineWidth = lw(1.1);
      for (let k = 0; k < 4; k++) {
        const la = spin + (k * Math.PI) / 4,
          e1 = [0, 1, 2].map((j) => Math.cos(la) * U1[j]! + Math.sin(la) * U2[j]!) as V3;
        circle(O, e1, AXIS, r);
      }
      ctx.globalAlpha = a;
    }
    // a place at 40° N: its latitude in accent, the place itself turning with the Earth
    if (o.marker && o.marker > 0) {
      ctx.strokeStyle = C.accent;
      ctx.globalAlpha = a * 0.8 * clamp(o.marker);
      ctx.lineWidth = lw(1.6);
      latCircle(LAT);
      ctx.globalAlpha = a;
      const m = markerAt(spin, r),
        q = proj(m),
        mr = 7 * u * Math.max(1, r / G.er / 1.3) * o.marker;
      if (dot3(m, VIEW) > 0) {
        disc(ctx, E[0] + q[0], E[1] + q[1], mr + 2.5 * u, C.ink);
        disc(ctx, E[0] + q[0], E[1] + q[1], mr, C.accent);
      }
    }
    // the night: the half of the disc away from the projected Sun, closed by the projected terminator
    const s2 = proj(S),
      sd = dot3(S, VIEW),
      phi = Math.atan2(s2[1], s2[0]);
    ctx.save();
    ctx.translate(E[0], E[1]);
    ctx.rotate(phi);
    ctx.beginPath();
    const n = 40;
    for (let i = 0; i <= n; i++) {
      const yv = -r + (2 * r * i) / n;
      const xv = -Math.sqrt(Math.max(0, r * r - yv * yv));
      if (i) ctx.lineTo(xv, yv);
      else ctx.moveTo(xv, yv);
    }
    for (let i = n; i >= 0; i--) {
      const yv = -r + (2 * r * i) / n;
      ctx.lineTo(-sd * Math.sqrt(Math.max(0, r * r - yv * yv)), yv);
    }
    ctx.closePath();
    ctx.fillStyle = rgba(C.ground, 0.75);
    ctx.fill();
    ctx.restore();
    // at the equinoxes the equator is lit in accent; its hidden back half dashed (an instrument-plate convention)
    const eqHi = o.eq ?? 0;
    if (eqHi > 0 && o.lat !== false) {
      ctx.strokeStyle = C.accent;
      ctx.globalAlpha = a * eqHi;
      ctx.lineWidth = lw(3);
      latCircle(0);
      ctx.globalAlpha = a * 0.7 * eqHi;
      ctx.setLineDash([5 * u, 6 * u]);
      ctx.lineWidth = lw(1.4);
      latCircle(0, true);
      ctx.setLineDash([]);
      ctx.globalAlpha = a;
    }
    // the rod's north end, over the disc
    rod(1, 1.5, rodColor);
    ctx.lineWidth = 1.5 * u;
    ctx.strokeStyle = rgba(C.ink, 0.5);
    ctx.beginPath();
    ctx.arc(E[0], E[1], r, 0, TAU);
    ctx.stroke();
    // N and S at the rod's ends
    if (o.labels && o.labels > 0) {
      const sz = 24 * u * Math.max(1, 1 / o.k),
        ln = Math.hypot(ns[0], ns[1]),
        ux = ns[0] / ln,
        uy = ns[1] / ln;
      const reach = 1.5 * r * ln + sz * 0.8;
      mono(ctx, "N", E[0] + ux * reach, E[1] + uy * reach + sz * 0.36, sz, C.ink, "center", o.labels);
      mono(
        ctx,
        "S",
        E[0] - ux * reach,
        E[1] - uy * reach + sz * 0.36,
        sz,
        o.rodHi ? C.accent : C.ink,
        "center",
        o.labels,
      );
    }
    ctx.restore();
  };

  // ---- the machine: ring, ticks, gears, arm, post, Sun on its pillar
  const ring = (ctx: Ctx, F: number, k: number, dim: number) => {
    const draw = ease.inOutCubic(prog(F, 0, 34));
    ctx.save();
    ctx.globalAlpha *= dim;
    ctx.strokeStyle = rgba(C.ink, 0.55);
    ctx.lineWidth = 1.5 * u * Math.max(1, 0.8 / k);
    ctx.beginPath();
    ctx.ellipse(G.ox, G.oy, G.rx, G.ry, 0, Math.PI / 2, Math.PI / 2 + TAU * draw);
    ctx.stroke();
    // a faint table disc inside the orbit
    ctx.fillStyle = rgba(C.surface, 0.55 * draw);
    ctx.beginPath();
    ctx.ellipse(G.ox, G.oy, G.rx - 26 * u, G.ry - 26 * u * sinE, 0, 0, TAU);
    ctx.fill();
    // month ticks (the start of each month) and the four season labels, outside the ring
    for (let m = 0; m < 12; m++) {
      const a = prog(F, 10 + m * 2, 22 + m * 2);
      if (a <= 0) continue;
      const s = (TAU * (m - 2.65)) / 12,
        [x0, y0] = table(s, G.rx - 9 * u),
        [x1, y1] = table(s, G.rx + 9 * u);
      ctx.globalAlpha = dim * a;
      ctx.strokeStyle = rgba(C.ink, 0.6);
      ctx.lineWidth = 1.5 * u * Math.max(1, 0.8 / k);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }
    const sz = 24 * u * Math.max(1, 1 / k);
    ctx.globalAlpha = dim * prog(F, 18, 40);
    const lab: [string, number, number, number][] = [
      ["Mar", 0, 0, -1],
      ["Jun", Math.PI / 2, -1, 0],
      ["Sep", Math.PI, 0, 1],
      ["Dec", (3 * Math.PI) / 2, 1, 0],
    ];
    for (const [s, sv, dx, dy] of lab) {
      const [x, y] = table(sv);
      // Jun/Dec sit below the ring's ends (the Earth's post rises from the end); Mar above the far side, Sep below
      // Mar sits beside the far point, clear of the Sun's rings; Jun/Dec below and outside the ring's ends
      const lx = dy < 0 ? x + G.sunR * 1.95 : x + dx * 14 * u,
        ly = dy < 0 ? y + sz * 0.36 : dy ? y + 16 * u + sz : y + 34 * u + sz;
      const hot = (s === "Mar" ? eqPulse(F, 812) : 0) + (s === "Sep" ? eqPulse(F, 888) : 0);
      mono(ctx, s, lx, ly, sz * (1 + 0.25 * hot), hot > 0.02 ? C.accent : C.muted, dy < 0 ? "left" : "center");
    }
    ctx.restore();
  };
  // the Earth grows at each equinox pause (a close-up without moving the camera)
  const eqBig = (F: number) =>
    ease.inOutCubic(
      Math.max(Math.min(prog(F, 810, 826), 1 - prog(F, 842, 856)), Math.min(prog(F, 886, 900), 1 - prog(F, 922, 934))),
    );
  const eqPulse = (F: number, at: number) => Math.max(0, Math.min(1, prog(F, at, at + 6)) - prog(F, at + 30, at + 44));

  const gear = (ctx: Ctx, x: number, y: number, R: number, teeth: number, rot: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, sinE);
    ctx.rotate(rot);
    ctx.beginPath();
    for (let i = 0; i < teeth * 2; i++) {
      const a0 = (Math.PI * i) / teeth,
        a1 = (Math.PI * (i + 1)) / teeth,
        rr0 = i % 2 ? R * 0.8 : R;
      ctx.arc(0, 0, rr0, a0, a1);
    }
    ctx.closePath();
    ctx.fillStyle = C.ink;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.35, 0, TAU);
    ctx.fillStyle = C.ground;
    ctx.fill();
    ctx.restore();
  };
  const gears = (ctx: Ctx, s: number) => {
    const th = thetaOf(s),
      R1 = 40 * u,
      R2 = 24 * u;
    gear(ctx, G.ox, G.oy, R1, 16, th);
    const gx = G.ox - (R1 + R2) * 0.9 * Math.cos(0.5),
      gy = G.oy - (R1 + R2) * 0.9 * Math.sin(0.5) * sinE;
    gear(ctx, gx, gy, R2, 10, (-th * R1) / R2 + 0.3);
  };
  const arm = (ctx: Ctx, s: number, len: number) => {
    const th = thetaOf(s),
      R = G.rx * len,
      w = 16 * u,
      d = [Math.cos(th), Math.sin(th)],
      n = [-Math.sin(th), Math.cos(th)];
    const pt = (along: number, side: number): [number, number] => [
      G.ox + d[0]! * along + n[0]! * side,
      G.oy + (d[1]! * along + n[1]! * side) * sinE,
    ];
    ctx.beginPath();
    ctx.moveTo(...pt(0, -w / 2));
    ctx.lineTo(...pt(R, -w / 2));
    ctx.lineTo(...pt(R + w / 2, 0));
    ctx.lineTo(...pt(R, w / 2));
    ctx.lineTo(...pt(0, w / 2));
    ctx.closePath();
    ctx.fillStyle = C.surface;
    ctx.fill();
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 2 * u;
    ctx.lineJoin = "round";
    ctx.stroke();
  };
  const post = (ctx: Ctx, x: number, yTable: number, yTop: number, alpha = 1) => {
    ctx.save();
    ctx.globalAlpha *= alpha;
    const w = 8 * u;
    ctx.fillStyle = C.surface;
    ctx.fillRect(x - w / 2, yTop, w, yTable - yTop);
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 2 * u;
    ctx.strokeRect(x - w / 2, yTop, w, yTable - yTop);
    ctx.beginPath();
    ctx.ellipse(x, yTable, 14 * u, 14 * u * sinE, 0, 0, TAU);
    ctx.fillStyle = C.surface;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  };
  const sun = (ctx: Ctx, F: number) => {
    // the pillar
    const w = 16 * u;
    ctx.fillStyle = C.surface;
    ctx.fillRect(G.ox - w / 2, sunC[1], w, G.oy - sunC[1]);
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 2 * u;
    ctx.strokeRect(G.ox - w / 2, sunC[1], w, G.oy - sunC[1]);
    // three flat rings at falling alpha (no blur), popping in one by one, then the disc
    const rings: [number, number][] = [
      [0.25, 1],
      [0.12, 2],
      [0.06, 3],
    ];
    rings.forEach(([al, dr], i) => {
      const p = sp(F, 6 + i * 5, 2.4, 0.45),
        inner = G.sunR * (1 + 0.27 * (dr - 1)),
        outer = G.sunR * (1 + 0.27 * dr);
      if (p <= 0) return;
      ctx.beginPath();
      ctx.arc(sunC[0], sunC[1], Math.max(0, outer * p), 0, TAU);
      ctx.arc(sunC[0], sunC[1], Math.max(0, inner * p), 0, TAU, true);
      ctx.fillStyle = rgba(C.accent, al);
      ctx.fill();
    });
    disc(ctx, sunC[0], sunC[1], G.sunR * sp(F, 2, 2.2, 0.42), C.accent);
  };

  // ---- the orrery at frame F (inside the camera)
  const GHOSTS: [number, number][] = [
    [DEC, 205],
    [MAR, 218],
    [SEP, 231],
    [JUN, 244],
  ];
  const orrery = (ctx: Ctx, F: number, c: Cam) => {
    const s = sAt(F),
      th = thetaOf(s),
      k = c.k,
      dim = 1 - 0.72 * ease.inOutCubic(prog(F, 930, 950));
    const len = ease.outCubic(prog(F, 14, 46)),
      back = Math.sin(th) < 0;
    // at the equinox pauses the Earth grows; on the far side (March) it grows upward off its post, so it stays
    // clear of the Sun's rings in front of it
    const lift = G.er * 0.38 * eqBig(F) * Math.max(0, -Math.sin(th)),
      E0 = earthAt(s),
      E: [number, number] = [E0[0], E0[1] - lift],
      [tx, ty] = table(s, G.rx * len),
      er = G.er * sp(F, 20, 2.2, 0.5) * (1 + 0.38 * eqBig(F));
    ring(ctx, F, k, dim);
    ctx.save();
    ctx.globalAlpha *= dim;
    // ghost Earths: faint, rods parallel (they fade while the beam has the floor, and for the end card)
    const gA = (at: number) =>
      0.34 * sp(F, at, 2.8, 0.5) * (1 - 0.5 * Math.min(prog(F, 452, 470), 1 - prog(F, 630, 650)));
    const flash = snap(F, 255, 10) + snap(F, SWAP, 12);
    const ghost = (gs: number, at: number) => {
      const a = gA(at);
      if (a <= 0.001 || F < at) return;
      const [gx, gy] = table(gs),
        ge = earthAt(gs);
      post(ctx, gx, gy, ge[1] + G.er * 0.9, a);
      earth(ctx, gs, ge, G.er * (0.6 + 0.4 * clamp(sp(F, at, 2.8, 0.5))), {
        alpha: a,
        lat: false,
        k,
        rodHi: flash > 0.08 ? 1 : 0,
      });
    };
    const backGhosts = GHOSTS.filter(([gs]) => Math.sin(thetaOf(gs)) < -0.01),
      frontGhosts = GHOSTS.filter(([gs]) => Math.sin(thetaOf(gs)) >= -0.01);
    for (const [gs, at] of backGhosts) ghost(gs, at);
    const liveEarth = () => {
      if (len <= 0) return;
      arm(ctx, s, len * 0.985);
      if (er > 0) {
        post(ctx, tx, ty, ty - G.postH * len - lift + er * 0.9);
        const decF = snap(F, SWAP, 16);
        earth(
          ctx,
          s,
          [tx, ty - G.postH * len - lift],
          er,
          {
            k,
            marker: sp(F, 272, 2.6, 0.5),
            labels: prog(F, 150, 164) * dim,
            eq: Math.max(eqPulse(F, 818), eqPulse(F, 894)),
            rodHi: decF > 0.1 ? 1 : 0,
          },
          spinAt(F),
        );
      }
    };
    if (back) liveEarth();
    gears(ctx, s);
    sun(ctx, F);
    // the equinox line: from the Sun to the subsolar point, which lies on the equator (hidden part dashed)
    const eqA = Math.max(eqPulse(F, 818) * 1, eqPulse(F, 894));
    if (eqA > 0) {
      const S: V3 = [-Math.cos(th), 0, -Math.sin(th)],
        q = proj(S),
        ss: [number, number] = [E[0] + q[0] * er, E[1] + q[1] * er],
        draw = ease.outCubic(prog(F, F < 870 ? 820 : 896, F < 870 ? 834 : 910));
      const hidden = dot3(S, VIEW) < 0;
      const x1 = lerp(sunC[0], ss[0], draw),
        y1 = lerp(sunC[1], ss[1], draw);
      ctx.save();
      ctx.globalAlpha *= eqA;
      ctx.strokeStyle = C.accent;
      ctx.lineWidth = 2.5 * u;
      if (!hidden) {
        ctx.beginPath();
        ctx.moveTo(sunC[0], sunC[1]);
        ctx.lineTo(x1, y1);
        ctx.stroke();
        if (draw > 0.95) disc(ctx, ss[0], ss[1], 6 * u, C.accent);
      }
      ctx.restore();
    }
    if (!back) {
      for (const [gs, at] of frontGhosts) ghost(gs, at);
      liveEarth();
    } else for (const [gs, at] of frontGhosts) ghost(gs, at);
    // at September the subsolar point is behind the Earth: the line comes over the Sun's side and dives behind it
    if (eqA > 0) {
      const S: V3 = [-Math.cos(th), 0, -Math.sin(th)];
      if (dot3(S, VIEW) < 0) {
        const q = proj(S),
          ss: [number, number] = [E[0] + q[0] * er, E[1] + q[1] * er],
          draw = ease.outCubic(prog(F, 896, 910));
        // the visible part: from the Sun to the Earth's limb
        const dx = ss[0] - sunC[0],
          dy = ss[1] - sunC[1];
        // where the segment first meets the disc
        const fx = sunC[0] - E[0],
          fy = sunC[1] - E[1],
          A = dx * dx + dy * dy,
          B = 2 * (fx * dx + fy * dy),
          Cc = fx * fx + fy * fy - er * er,
          disc2 = B * B - 4 * A * Cc,
          tHit = disc2 > 0 ? (-B - Math.sqrt(disc2)) / (2 * A) : 1;
        ctx.save();
        ctx.globalAlpha *= eqA;
        ctx.strokeStyle = C.accent;
        ctx.lineWidth = 2.5 * u;
        ctx.beginPath();
        ctx.moveTo(sunC[0], sunC[1]);
        ctx.lineTo(sunC[0] + dx * Math.min(draw, tHit), sunC[1] + dy * Math.min(draw, tHit));
        ctx.stroke();
        if (draw > tHit) {
          ctx.setLineDash([5 * u, 6 * u]);
          ctx.beginPath();
          ctx.moveTo(sunC[0] + dx * tHit, sunC[1] + dy * tHit);
          ctx.lineTo(sunC[0] + dx * draw, sunC[1] + dy * draw);
          ctx.stroke();
          ctx.setLineDash([]);
          if (draw > 0.95) disc(ctx, ss[0], ss[1], 5 * u, C.accent);
        }
        ctx.restore();
      }
    }
    // the protractor: from the upright to the rod, in the tilt beat's close-up
    const pa = Math.min(prog(F, 140, 162), 1 - prog(F, 196, 212));
    if (pa > 0) {
      const ns = proj(AXIS),
        rodAng = Math.atan2(ns[1], ns[0]),
        up = -Math.PI / 2,
        R = G.er * 1.28,
        draw = ease.outCubic(prog(F, 146, 164));
      ctx.save();
      ctx.globalAlpha *= pa;
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = (1.5 * u) / Math.max(1, k * 0.7);
      ctx.setLineDash([((4 * u) / k) * 1.6, ((5 * u) / k) * 1.6]);
      ctx.beginPath();
      ctx.moveTo(E[0], E[1] - G.er * 1.05);
      ctx.lineTo(E[0], E[1] - G.er * 1.62);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = C.accent;
      ctx.lineWidth = (3 * u) / Math.max(1, k * 0.6);
      ctx.beginPath();
      ctx.arc(E[0], E[1], R, up, lerp(up, rodAng, draw));
      ctx.stroke();
      // small ticks along the arc, like a protractor's scale
      ctx.lineWidth = (1.2 * u) / Math.max(1, k * 0.7);
      for (let i = 0; i <= 5; i++) {
        const t = lerp(up, rodAng, i / 5);
        if (i / 5 > draw) break;
        ctx.beginPath();
        ctx.moveTo(E[0] + Math.cos(t) * R, E[1] + Math.sin(t) * R);
        ctx.lineTo(E[0] + Math.cos(t) * (R + ((7 * u) / k) * 1.6), E[1] + Math.sin(t) * (R + ((7 * u) / k) * 1.6));
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();
  };

  // ---- the day dial: a 24-hour face, day arc from the sunrise equation at 40° N (noon at the top)
  const dial = (ctx: Ctx, F: number, s: number) => {
    const a =
      sp(F, 276, 2.4, 0.6) * (1 - Math.min(prog(F, 450, 466), 1 - prog(F, SWAP, SWAP + 3))) * (1 - prog(F, 928, 944));
    if (a <= 0.001) return;
    // the arc springs to its computed value when the dial arrives, and again when it returns for December
    const dNow = decl(s),
      intro = sp(F, 282, 1.6, 0.8),
      back = sp(F, SWAP, 3.2, 0.5),
      dl = F < 600 ? dNow * intro : lerp(decl(JUN + 0.15), dNow, back);
    const H0 = dayHalf(dl),
      [x, y] = dialC,
      bump = Math.max(snap(F, DIAL_POP, 7), snap(F, SWAP, 8)),
      R = dialR * (0.85 + 0.15 * a) * (1 + 0.12 * bump),
      up = -Math.PI / 2;
    ctx.save();
    ctx.globalAlpha *= clamp(a);
    disc(ctx, x, y, R, C.surface);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, R * 0.92, up - H0, up + H0);
    ctx.closePath();
    ctx.fillStyle = bump > 0.05 ? mixHex(C.accent2, C.ink, 0.6 * bump) : C.accent2;
    ctx.fill();
    // the half line (6 and 18 o'clock), so "past half" can be seen
    ctx.strokeStyle = rgba(C.ink, 0.55);
    ctx.lineWidth = 1.2 * u;
    ctx.setLineDash([4 * u, 5 * u]);
    ctx.beginPath();
    ctx.moveTo(x - R, y);
    ctx.lineTo(x + R, y);
    ctx.stroke();
    ctx.setLineDash([]);
    // hour ticks, no numbers
    ctx.strokeStyle = C.ink;
    for (let h = 0; h < 24; h++) {
      const t = (TAU * h) / 24 + up,
        long = h % 6 === 0;
      ctx.lineWidth = (long ? 2 : 1) * u;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(t) * R, y + Math.sin(t) * R);
      ctx.lineTo(x + Math.cos(t) * (R - (long ? 16 : 9) * u), y + Math.sin(t) * (R - (long ? 16 : 9) * u));
      ctx.stroke();
    }
    ctx.lineWidth = 1.5 * u;
    ctx.beginPath();
    ctx.arc(x, y, R, 0, TAU);
    ctx.stroke();
    // the hand: the place's own hour, from the same spin that turns the Earth (in the day arc when it is lit)
    const th = thetaOf(s),
      ha = hourAngle([-Math.cos(th), 0, -Math.sin(th)], spinAt(F)) + up,
      lit = Math.abs(ha - up) < H0;
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 3 * u;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(ha) * R * 0.8, y + Math.sin(ha) * R * 0.8);
    ctx.stroke();
    disc(ctx, x + Math.cos(ha) * R * 0.8, y + Math.sin(ha) * R * 0.8, 7 * u, lit ? C.accent : C.muted);
    // a small sun at noon and a pin
    disc(ctx, x, y - R - 16 * u, 7 * u, C.accent);
    disc(ctx, x, y, 5 * u, C.ink);
    mono(ctx, "day · night at 40° N", x, y + R + 44 * u, 24 * u, C.muted, "center");
    ctx.restore();
  };

  // ---- the beam inset: a fixed-width torch beam on a strip of squares at the noon sun for 40° N
  const litCount = (s: number) => Math.round(4 / Math.sin(noonElev(s)));
  const inset = (ctx: Ctx, F: number, s: number) => {
    const a = sp(F, 324, 2.4, 0.6) * (1 - prog(F, 928, 944));
    if (a <= 0.001) return;
    const big = ease.inOutCubic(Math.min(prog(F, 450, 478), 1 - prog(F, 630, 645)));
    const r = {
      x: lerp(insetSmall.x, insetBig.x, big),
      y: lerp(insetSmall.y, insetBig.y, big),
      w: lerp(insetSmall.w, insetBig.w, big),
      h: lerp(insetSmall.h, insetBig.h, big),
    };
    const pop = 0.92 + 0.08 * clamp(a);
    ctx.save();
    ctx.globalAlpha *= clamp(a);
    ctx.translate(r.x + r.w / 2, r.y + r.h / 2);
    ctx.scale(pop, pop);
    ctx.translate(-(r.x + r.w / 2), -(r.y + r.h / 2));
    rr(ctx, r.x, r.y, r.w, r.h, 16 * u);
    ctx.fillStyle = C.surface;
    ctx.fill();
    ctx.strokeStyle = rgba(C.muted, 0.55);
    ctx.lineWidth = 1 * u;
    ctx.stroke();
    ctx.save();
    rr(ctx, r.x, r.y, r.w, r.h, 16 * u);
    ctx.clip();
    // labels grow with the card: 44 px while the beam has the floor, 26 px in the small card
    const lab = lerp(26, 44, big) * u;
    const pad = 28 * u,
      q = (r.w - 2 * pad) / 15,
      ground = r.y + r.h - pad - q - lab * 1.25;
    const el = noonElev(s),
      wb = 4 * q,
      len = wb / Math.sin(el),
      x0 = r.x + pad + 5 * q,
      hit = x0 + len / 2;
    // the beam: a torch at a fixed distance along the noon direction, its band exactly wb wide
    const D = Math.min(r.w * 0.44, (ground - r.y - 96 * u - 40 * u) / Math.max(0.5, Math.sin(el))),
      dx = -Math.cos(el),
      dy = -Math.sin(el),
      nx = -dy,
      ny = dx;
    const mx = hit + dx * D,
      my = ground + dy * D;
    const m1: [number, number] = [mx + (nx * wb) / 2, my + (ny * wb) / 2],
      m2: [number, number] = [mx - (nx * wb) / 2, my - (ny * wb) / 2];
    const g1: [number, number] = [x0, ground],
      g2: [number, number] = [x0 + len, ground];
    ctx.beginPath();
    ctx.moveTo(...m1);
    ctx.lineTo(...(nx > 0 ? g2 : g1));
    ctx.lineTo(...(nx > 0 ? g1 : g2));
    ctx.lineTo(...m2);
    ctx.closePath();
    ctx.fillStyle = rgba(C.ink, 0.16);
    ctx.fill();
    ctx.strokeStyle = rgba(C.ink, 0.7);
    ctx.lineWidth = 1.5 * u;
    ctx.beginPath();
    ctx.moveTo(...m1);
    ctx.lineTo(...(nx > 0 ? g2 : g1));
    ctx.moveTo(...m2);
    ctx.lineTo(...(nx > 0 ? g1 : g2));
    ctx.stroke();
    // the torch body behind the mouth
    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate(Math.atan2(dy, dx));
    const tl = Math.min(110 * u, r.w * 0.16);
    ctx.beginPath();
    ctx.moveTo(0, -wb / 2 - 6 * u);
    ctx.lineTo(tl * 0.35, -wb / 2 - 6 * u);
    ctx.lineTo(tl * 0.5, -wb * 0.3);
    ctx.lineTo(tl, -wb * 0.3);
    ctx.lineTo(tl, wb * 0.3);
    ctx.lineTo(tl * 0.5, wb * 0.3);
    ctx.lineTo(tl * 0.35, wb / 2 + 6 * u);
    ctx.lineTo(0, wb / 2 + 6 * u);
    ctx.closePath();
    ctx.fillStyle = C.surface;
    ctx.fill();
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 2 * u;
    ctx.lineJoin = "round";
    ctx.stroke();
    ctx.restore();
    // light in the beam: dashes running down it toward the ground (fixed width, so the same count of them)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(...m1);
    ctx.lineTo(...(nx > 0 ? g2 : g1));
    ctx.lineTo(...(nx > 0 ? g1 : g2));
    ctx.lineTo(...m2);
    ctx.closePath();
    ctx.clip();
    ctx.strokeStyle = rgba(C.ink, 0.5);
    ctx.lineWidth = 2 * u;
    ctx.setLineDash([16 * u, 22 * u]);
    ctx.lineDashOffset = -F * 7 * u;
    for (let i = 0; i < 4; i++) {
      const off = (i - 1.5) * q,
        sx = mx + nx * off,
        sy = my + ny * off;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx - dx * (D + 2 * len), sy - dy * (D + 2 * len));
      ctx.stroke();
    }
    ctx.restore();
    // the ground: a row of squares, the lit patch over them; each time another square lights, the patch flashes
    // and the counter kicks (the spread lands, count by count)
    const hitC = snap(F, lastCountChange(F), 7);
    ctx.fillStyle = hitC > 0.05 ? mixHex(C.accent, C.ink, 0.55 * hitC) : rgba(C.accent, 0.6);
    ctx.fillRect(x0, ground - 6 * u * hitC, len, q + 6 * u * hitC);
    ctx.strokeStyle = rgba(C.muted, 0.7);
    ctx.lineWidth = 1 * u;
    for (let i = 0; i < 15; i++) ctx.strokeRect(r.x + pad + i * q, ground, q, q);
    ctx.fillStyle = rgba(C.ink, 0.9);
    ctx.fillRect(r.x + pad, ground - 1 * u, r.w - 2 * pad, 2 * u);
    ctx.restore();
    // labels: what the beam is, which month, and the counter
    mono(
      ctx,
      `${monthOf(s)} noon at 40° N · same beam`,
      r.x + pad,
      ground + q + lab * 1.05,
      lab,
      big > 0.5 ? C.ink : C.muted,
    );
    const n = litCount(s),
      bump = hitC;
    const numBase = lerp(48, 88, big) * u,
      numSize = numBase * (1 + 0.4 * bump);
    text(ctx, String(n), r.x + r.w - pad, r.y + pad + numBase * 0.78 + (numSize - numBase) * 0.4, {
      size: numSize,
      family: FACE.sans,
      weight: 600,
      color: C.accent,
      align: "right",
    });
    mono(
      ctx,
      "squares lit",
      r.x + r.w - pad - measure(ctx, "00", { size: numBase, family: FACE.sans, weight: 600 }) - 16 * u,
      r.y + pad + numBase * 0.62,
      lerp(26, 36, big) * u,
      C.muted,
      "right",
    );
    ctx.restore();
  };
  // counter changes (for the bump and the ticks): precomputed over the film
  const CHANGES: number[] = [];
  for (let f = 325, prev = litCount(sAt(324)); f < 930; f++) {
    const c = litCount(sAt(f));
    if (c !== prev) CHANGES.push(f);
    prev = c;
  }
  const lastCountChange = (F: number) => {
    let at = -1e9;
    for (const c of CHANGES) if (c <= F) at = c;
    return at;
  };

  // ---- captions: word-by-word on springs, wrapped to the width
  type Tok = { key: string; tail: string; plain: string };
  const toks = (line: string): Tok[] =>
    line.split(" ").map((w) => {
      const m = /^\*(.+)\*(.*)$/.exec(w);
      return m ? { key: m[1]!, tail: m[2]!, plain: "" } : { key: "", tail: "", plain: w };
    });
  const place = (ctx: Ctx, line: string, size: number, maxW: number, weight: number) => {
    const o = { size, family: FACE.sans, weight, track: -0.015 },
      ko = { size: size * 1.2, family: FACE.italic, track: -0.01 },
      space = size * 0.27;
    const ws = toks(line).map((t) => ({
      t,
      w: t.plain ? measure(ctx, t.plain, o) : measure(ctx, t.key, ko) + (t.tail ? measure(ctx, t.tail, o) + 2 : 0),
    }));
    const wrap = (mw: number) => {
      const lines: { t: Tok; w: number; x: number }[][] = [[]];
      let x = 0;
      for (const w of ws) {
        if (x > 0 && x + w.w > mw) {
          lines.push([]);
          x = 0;
        }
        lines[lines.length - 1]!.push({ ...w, x });
        x += w.w + space;
      }
      return lines;
    };
    // balanced: the narrowest width that keeps the line count, so no line is a lone word
    let lines = wrap(maxW);
    if (lines.length > 1)
      for (let mw = maxW * 0.97; mw > maxW * 0.4; mw *= 0.97) {
        const l2 = wrap(mw);
        if (l2.length !== lines.length) break;
        lines = l2;
      }
    return { lines, o, ko };
  };
  const caption = (ctx: Ctx, F: number) => {
    for (const c of CAPS) {
      if (F < c.at - 1 || F > c.out + 10) continue;
      const leave = ease.inCubic(prog(F, c.out, c.out + 10));
      const H1 = place(ctx, c.head, HEAD, capW, 600);
      let by = capTop + HEAD;
      let wi = 0;
      const drawLine = (
        ln: { t: Tok; w: number; x: number }[],
        y: number,
        size: number,
        o: typeof H1.o,
        ko: typeof H1.ko,
        start: number,
        color: string,
        every: number,
      ) => {
        for (const w of ln) {
          const p = sp(F, start + wi * every, 3, 0.72);
          wi++;
          if (p <= 0.001) continue;
          ctx.save();
          ctx.globalAlpha *= clamp(p * 1.5) * (1 - leave);
          ctx.translate(0, (1 - p) * size * 0.4 - leave * 18 * u);
          const x = capX + w.x;
          if (w.t.plain) text(ctx, w.t.plain, x, y, { ...o, color });
          else {
            const kw = text(ctx, w.t.key, x, y, { ...ko, color: C.accent });
            if (w.t.tail) text(ctx, w.t.tail, x + kw + 2, y, { ...o, color });
          }
          ctx.restore();
        }
      };
      for (const ln of H1.lines) {
        drawLine(ln, by, HEAD, H1.o, H1.ko, c.at, C.ink, 3);
        by += HEAD * 1.16;
      }
      if (c.sub && c.subAt !== undefined) {
        const S1 = place(ctx, c.sub, SUB, capW, 400);
        by += SUB * 0.25;
        wi = 0;
        for (const ln of S1.lines) {
          drawLine(ln, by, SUB, S1.o, S1.ko, c.subAt, C.muted, 3);
          by += SUB * 1.2;
        }
      }
    }
  };

  // ---- screen-space labels tied to the machine: the hook's tag and the marker's label
  const tags = (ctx: Ctx, F: number, c: Cam) => {
    const s = sAt(F),
      E = toScreen(c, earthAt(s));
    // 'closest: early January': slams in whole on the answer's hit (90) and collapses as the tilt slams in (120);
    // never faded, so the ground-coloured text and its box always read together
    const tIn = F < 90 ? 0 : sp(F, 90, 3.2, 0.45),
      tOut = ease.inCubic(prog(F, 120, 126)),
      tScale = tIn * (1 - tOut);
    if (tScale > 0.02) {
      const base = toScreen(c, table(s)),
        s1 = "closest: early January",
        sz = 44 * u,
        w = measure(ctx, s1, { size: sz, family: FACE.mono, weight: 500, track: 0.02 }),
        bw = w + 36 * u,
        bh = sz + 30 * u;
      // landscape: just under the Earth's post; vertical: down in the lower third, on a leader from the post
      const cxT = tall ? cx : clamp(E[0] - 40 * u, L.safe.x + bw / 2, W - L.safe.x - bw / 2),
        cyT = tall ? 1385 * u : base[1] + 70 * u;
      ctx.save();
      if (tall) {
        ctx.strokeStyle = C.accent;
        ctx.lineWidth = 2 * u;
        ctx.globalAlpha *= clamp(tScale);
        ctx.beginPath();
        ctx.moveTo(base[0], base[1] + 6 * u);
        ctx.lineTo(lerp(base[0], cxT, 0.2), cyT - bh / 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.translate(cxT, cyT);
      ctx.scale(tScale, tScale);
      rr(ctx, -bw / 2, -bh / 2, bw, bh, 12 * u);
      ctx.fillStyle = C.accent;
      ctx.fill();
      mono(ctx, s1, -w / 2, sz * 0.36, sz, C.ground);
      ctx.restore();
    }
    // the answer: 'It's the tilt.' slams in on the 120 hit and holds through the tilt beat (landscape: top right,
    // clear of the headline; vertical: the lower third, under the machine)
    const aIn = F < 120 ? 0 : sp(F, 120, 3.4, 0.42),
      aOut = ease.inCubic(prog(F, 242, 252));
    if (aIn > 0.01 && aOut < 1) {
      const big = (tall ? 112 : 104) * u,
        kick = 1 + 0.5 * snap(F, 120, 4);
      const o = { size: big, family: FACE.sans, weight: 600, track: -0.02 },
        ko = { size: big * 1.2, family: FACE.italic, track: -0.01 };
      const w1 = measure(ctx, "It's the ", o),
        w2 = measure(ctx, "tilt", ko),
        w3 = measure(ctx, ".", o),
        tw = w1 + w2 + w3;
      const ax = tall ? cx : W - L.safe.x - tw / 2,
        ay = tall ? 1600 * u : capTop + big * 1.05;
      ctx.save();
      ctx.globalAlpha *= clamp(aIn * 2) * (1 - aOut);
      // vertical: a flat ground band behind the line, so the pushed-in ring never runs through the words
      if (tall) {
        ctx.fillStyle = rgba(C.ground, 0.88);
        ctx.fillRect(0, ay - big * 0.95, W, big * 1.3);
      }
      ctx.translate(ax, ay - big * 0.35 - aOut * 20 * u);
      ctx.scale(aIn * kick, aIn * kick);
      ctx.translate(-tw / 2, big * 0.35);
      text(ctx, "It's the ", 0, 0, { ...o, color: C.ink });
      text(ctx, "tilt", w1, 0, { ...ko, color: C.accent });
      text(ctx, ".", w1 + w2 + 2 * u, 0, { ...o, color: C.ink });
      ctx.restore();
    }
    // 'a place at 40° N'
    const ma = Math.min(prog(F, 276, 286), 1 - prog(F, 400, 414));
    if (ma > 0) {
      const vn = dot3(VIEW, AXIS),
        wv: V3 = [VIEW[0] - vn * AXIS[0], VIEW[1] - vn * AXIS[1], VIEW[2] - vn * AXIS[2]],
        wl = Math.hypot(...wv);
      const m: V3 = [0, 1, 2].map((i) => G.er * (Math.sin(LAT) * AXIS[i]! + (Math.cos(LAT) * wv[i]!) / wl)) as V3;
      const q = proj(m),
        M: [number, number] = [E[0] + q[0] * c.k, E[1] + q[1] * c.k];
      const lx = M[0] + (tall ? 50 : 40) * u,
        ly = M[1] - (tall ? 255 : 190) * u;
      const draw = ease.outCubic(prog(F, 276, 290));
      ctx.save();
      ctx.globalAlpha *= ma;
      ctx.strokeStyle = C.accent;
      ctx.lineWidth = 1.5 * u;
      ctx.beginPath();
      ctx.moveTo(M[0], M[1]);
      ctx.lineTo(lerp(M[0], lx - 10 * u, draw), lerp(M[1], ly + 8 * u, draw));
      ctx.stroke();
      // 44 px; landscape stacks it on two lines so it stays clear of the March ghost beside it
      if (tall) mono(ctx, "a place at 40° N", lx, ly, 44 * u, C.ink, "left", prog(F, 284, 292));
      else {
        mono(ctx, "a place", lx, ly - 50 * u, 44 * u, C.ink, "left", prog(F, 284, 292));
        mono(ctx, "at 40° N", lx, ly, 44 * u, C.ink, "left", prog(F, 284, 292));
      }
      ctx.restore();
    }
  };

  // ---- the end card
  const endCard = (ctx: Ctx, F: number) => {
    if (F < T.end) return;
    const big = (tall ? 90 : 92) * u,
      y0 = tall ? 540 * u : 250 * u;
    // set by hand per size, so the key word never wraps onto a line of its own
    const rows = (
      tall
        ? ["Seasons come", "from the *tilt*,", "not the distance."]
        : ["Seasons come from the *tilt*,", "not the distance."]
    ).map((r) => place(ctx, r, big, 1e9, 600));
    const line1 = rows[0]!;
    let wi = 0;
    const draw = (ln: { t: Tok; w: number; x: number }[], y: number, start: number) => {
      const total = ln.length ? ln[ln.length - 1]!.x + ln[ln.length - 1]!.w : 0,
        left = cx - total / 2;
      for (const w of ln) {
        const p = sp(F, start + wi * 3, 3, 0.7);
        wi++;
        if (p <= 0.001) continue;
        ctx.save();
        ctx.globalAlpha *= clamp(p * 1.5);
        ctx.translate(0, (1 - p) * big * 0.4);
        if (w.t.plain) text(ctx, w.t.plain, left + w.x, y, { ...line1.o, color: C.ink });
        else {
          const kw = text(ctx, w.t.key, left + w.x, y, { ...line1.ko, color: C.accent });
          if (w.t.tail) text(ctx, w.t.tail, left + w.x + kw + 2, y, { ...line1.o, color: C.ink });
        }
        ctx.restore();
      }
    };
    let y = y0;
    rows.forEach((row, i) => {
      if (i === rows.length - 1) wi = 0;
      draw(row.lines[0]!, y, i === rows.length - 1 ? T.end + 22 : T.end + 4);
      y += big * 1.12;
    });
    const la = prog(F, 966, 980);
    const ms = 44 * u;
    if (tall) {
      mono(ctx, "the distance changes by only", cx, y + 30 * u, ms, C.ink, "center", la * 0.85);
      mono(ctx, "about 3% over a year", cx, y + 30 * u + ms * 1.3, ms, C.ink, "center", la * 0.85);
    } else
      mono(ctx, "the distance changes by only about 3% over a year", cx, y + 30 * u, ms, C.ink, "center", la * 0.85);
    mono(
      ctx,
      "not to scale · sizes and distances exaggerated",
      cx,
      H - L.safe.bottom - 10 * u,
      24 * u,
      C.muted,
      "center",
      prog(F, 980, 994),
    );
  };

  const paint = (ctx: Ctx, env: Env, F: number) => {
    F = clamp(F, 0, N - 1);
    ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
    ctx.fillStyle = C.ground;
    ctx.fillRect(0, 0, W, H);
    // a faint plate grid: the instrument's ground
    ctx.fillStyle = rgba(C.line, 0.9);
    const gs = 60 * u;
    for (let x = (W / 2) % gs; x < W; x += gs)
      for (let y = (H / 2) % gs; y < H; y += gs) ctx.fillRect(x - u, y - u, 2 * u, 2 * u);
    const c = cam(F),
      s = sAt(F);
    ctx.save();
    ctx.translate(c.g[0], c.g[1]);
    ctx.scale(c.k, c.k);
    ctx.translate(-c.f[0], -c.f[1]);
    orrery(ctx, F, c);
    ctx.restore();
    // the protractor's label, in screen space so it stays a key number (≥ 44 px)
    const pa = Math.min(prog(F, 158, 166), 1 - prog(F, 196, 212));
    if (pa > 0) {
      const E = toScreen(c, earthAt(s)),
        bump = 1 + 0.18 * snap(F, 162, 6);
      text(ctx, "23.4°", E[0] - 22 * u, E[1] - G.er * 1.42 * c.k + 18 * u, {
        size: 52 * u * bump,
        family: FACE.sans,
        weight: 600,
        color: C.accent,
        align: "right",
        alpha: pa,
      });
    }
    tags(ctx, F, c);
    dial(ctx, F, s);
    inset(ctx, F, s);
    caption(ctx, F);
    endCard(ctx, F);
  };

  const cuts = [T.hook, T.tilt, T.june, T.beam, T.dec, T.eq, T.end, N],
    names = ["hook", "tilt", "june", "beam", "december", "equinoxes", "endcard"];
  const shots: Shot[] = names.map((sid, i) => ({
    id: sid,
    start: cuts[i]!,
    end: cuts[i + 1]!,
    draw: (ctx, local, env) => paint(ctx, env, cuts[i]! + local),
  }));
  // soft ticks: the protractor label, each ghost Earth, each change of the lit-square counter (thinned)
  const ticks: number[] = [162, DIAL_POP, ...GHOSTS.map(([, at]) => at)];
  for (const f of CHANGES) if (ticks.every((t) => Math.abs(t - f) >= 8)) ticks.push(f);
  return {
    meta: { title: id, W, H, fps: FPS, bpm: BPM, durationFrames: N, raster: "cpu" },
    assets: { images: {}, fonts: P.assets },
    shots,
    audio: beatScore({
      frames: N,
      fps: FPS,
      bpm: BPM,
      mood: "soft",
      key: 3,
      hits: [90, T.tilt, SWAP, T.end],
      whooshes: [T.june, T.dec, T.eq],
      ticks: ticks.sort((a, b) => a - b),
      sign: 960,
      gain: 0.71,
    }),
  };
}

export const seasonsOrrery = make("landscape", "seasonsOrrery");
export const seasonsOrreryVertical = make("vertical", "seasonsOrreryVertical");
