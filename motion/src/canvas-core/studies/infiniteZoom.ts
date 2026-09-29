// STUDY 43 · INFINITE ZOOM (20 s, 30 fps, a seamless loop). An endless Droste zoom for the fictional Oriel: the
// camera pushes forever into five nested flat illustrations (a city, one window, one desk, the phone on it, the
// free hour in its week), each hidden in a detail of the last, and the fifth holds the first. Brand: the neutral
// pack, palette "plum". Brief: series/studies/briefs/infinite-zoom.json · prompt: prompts/infinite-zoom.prompt.md
//
// An infinite zoom is arithmetic, not animation. Every scene is authored in its own unit square (centre 0,0,
// side 1) and its PORTAL, the square that holds the next scene, is exactly centred with side 1/6, so the zoom's
// fixed point is the frame centre at every level. With phase p = (F mod 600) / 120, level i = floor(p) and
// f = p − i, the current scene is a square of side C·6^f (C = the frame's long side), the next sits in its portal
// at C·6^f/6, and so on down to 4 px. The scale is exponential in time, so the push never changes speed; at f = 1
// the portal covers the frame exactly, and the next level takes over at f = 0 with the same pixels. Level 5 is
// level 0, so the loop closes. Everything that moves inside a scene is a function of the global frame with a
// period that divides 600, because each scene is on screen at several scales at once.
import PACK from "../../../brand/packs/studio/pack.json";
import type { Ctx, Env } from "../core";
import type { Film, Shot } from "../film";
import { clamp, ease, lerp, phase, prog } from "../kit/motion";
import { usePack } from "../kit/pack";
import { beatScore } from "../kit/score";
import { layout, type Size } from "../kit/sizes";
import { measure, text, type TextOpts } from "../kit/type";
import { rr } from "../kit/ui";

const P = usePack(PACK),
  C = P.palette("plum"),
  F_ = P.face;
const FPS = 30,
  BPM = 120,
  LV = 120, // frames per level (8 beats)
  NL = 5, // levels
  N = LV * NL, // 600
  BEAT = 15,
  RATIO = 6,
  HP = 1 / 12, // half the portal's side
  OUT0 = LV - 22, // a caption leaves over frames 98-108 of its level while the plate grows to fit the next,
  IN0 = LV - 12; // and the next rises in over 108-120, whole on the hand-off

// ---- colour: flat tints mixed from the pack's roles (no gradients anywhere)
const rgb = (s: string) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
const mix = (a: string, b: string, t: number) => {
  const A = rgb(a),
    B = rgb(b);
  return (
    "#" +
    A.map((v, i) =>
      Math.round(v + (B[i]! - v) * t)
        .toString(16)
        .padStart(2, "0"),
    ).join("")
  );
};
const K = {
  skyHi: mix(C.ground, C.accent, 0.13),
  sky: C.ground,
  skyLo: mix(C.ground, C.accent2, 0.2),
  skyGlow: mix(C.ground, C.accent2, 0.38),
  cloudA: mix(C.ground, C.accent, 0.24),
  cloudB: mix(C.ground, C.accent2, 0.45),
  halo: mix(C.ground, C.accent2, 0.55),
  far: mix(C.ink, C.ground, 0.64),
  mid: mix(C.ink, C.ground, 0.36),
  ledge: mix(C.ink, C.ground, 0.14),
  sill: mix(C.ink, C.ground, 0.3),
  winMid: mix(C.muted, C.ground, 0.3),
  facade: mix(C.muted, C.ink, 0.55), // the centre tower's windows, quiet so the one lit window is the only focus
  glowOut: mix(C.ink, C.accent2, 0.28),
  glowIn: mix(C.ink, C.accent2, 0.5),
  wall: mix(C.accent2, C.ground, 0.4),
  wallShade: mix(C.accent2, C.ink, 0.12),
  floor: mix(C.accent2, C.ink, 0.38),
  desk: mix(mix(C.ground, C.accent2, 0.3), C.ink, 0.1),
  lampLight: mix(C.accent2, C.surface, 0.62),
  leaf: mix(C.accent, C.ink, 0.5),
  leafLit: mix(C.accent, C.ink, 0.15),
  coffee: mix(C.ink, C.accent2, 0.35),
  scan: mix(C.surface, C.accent, 0.07),
  soft: mix(C.accent, C.surface, 0.82),
  lilac: mix(C.accent, C.surface, 0.55),
};
const DESK = K.desk,
  DESK_EDGE = mix(DESK, C.ink, 0.3),
  DESK_SHADE = mix(DESK, C.ink, 0.13);

// the punch on every key-word tick (a beat after each hand-off): 1 on the tick, gone 12 frames later. Its period is
// one level, so every copy of a scene on screen flares at once and the loop still closes.
const punch = (F: number) => {
  const q = phase(F - BEAT, LV) * LV;
  return q < 12 ? 1 - ease.outCubic(q / 12) : 0;
};

// ---- drawing helpers in a scene's unit square
const box = (ctx: Ctx, x: number, y: number, w: number, h: number, c: string) => {
  ctx.fillStyle = c;
  ctx.fillRect(x, y, w, h);
};
const rbox = (ctx: Ctx, x: number, y: number, w: number, h: number, r: number, c: string) => {
  rr(ctx, x, y, w, h, r);
  ctx.fillStyle = c;
  ctx.fill();
};
const disc = (ctx: Ctx, x: number, y: number, r: number, c: string) => {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = c;
  ctx.fill();
};
const oval = (ctx: Ctx, x: number, y: number, rx: number, ry: number, rot: number, c: string) => {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  ctx.fillStyle = c;
  ctx.fill();
};
// Scene words never get cut. The zoom keeps growing a word long after it has been read, so every in-scene word
// dissolves, by where it sits on screen alone, before a frame edge, the tag or the caption plate can slice it.
// `paint` rewrites this record (device px) at the top of every frame before the zoom reads it, so each frame is
// still a pure function of its number; both sides of a hand-off see the same transform and the same record.
type Rect = [x0: number, y0: number, x1: number, y1: number];
const KEEP: { W: number; H: number; u: number; out: Rect[] } = { W: 0, H: 0, u: 1, out: [] };
const keepAlpha = (b: Rect, w: number) => {
  // fade over a distance tied to the word's own width, so small labels keep a small margin and a 900 px
  // "Everyone free" stays whole at its hero size, then goes before it is cut
  const fd = clamp(0.12 * w, 14 * KEEP.u, 100 * KEEP.u);
  let a = clamp(Math.min(b[0], KEEP.W - b[2], b[1], KEEP.H - b[3]) / fd);
  for (const r of KEEP.out) a = Math.min(a, clamp(Math.max(r[0] - b[2], b[0] - r[2], r[1] - b[3], b[1] - r[3]) / fd));
  return a;
};
// text in unit coordinates: a font of 0.05 px under a scale of 11 520 hints badly, so the text is set at its
// on-screen size in device space (keeping any rotation), inside whatever clip the portals have set
const ut = (ctx: Ctx, s: string, x: number, y: number, o: TextOpts) => {
  const m = ctx.getTransform(),
    k = Math.hypot(m.a, m.b),
    size = o.size * k;
  if (size < 1.5) return;
  const X = m.a * x + m.c * y + m.e,
    Y = m.b * x + m.d * y + m.f,
    w = measure(ctx, s, { ...o, size }),
    x0 = o.align === "center" ? X - w / 2 : o.align === "right" ? X - w : X,
    a = keepAlpha([x0, Y - 0.75 * size, x0 + w, Y + 0.22 * size], w);
  if (a <= 0.002) return;
  ctx.save();
  ctx.setTransform(m.a / k, m.b / k, m.c / k, m.d / k, X, Y);
  text(ctx, s, 0, 0, { ...o, size, alpha: (o.alpha ?? 1) * a });
  ctx.restore();
};
const sans = (size: number, color: string = C.ink, align: CanvasTextAlign = "left"): TextOpts => ({
  size,
  family: F_.sans,
  weight: 600,
  color,
  align,
  track: -0.01,
});

// =====================================================================================================
// (0) CITY at dusk: plum towers against a pale sky, a low sun; the centre tower's one lit window is the portal
type Tower = [number, number, number]; // x0, x1, top
const FAR: Tower[] = [
  [-0.56, -0.42, -0.08],
  [-0.44, -0.33, -0.22],
  [-0.31, -0.2, -0.04],
  [0.19, 0.3, -0.17],
  [0.29, 0.4, -0.05],
  [0.4, 0.56, -0.24],
];
const MID: Tower[] = [
  [-0.5, -0.37, 0.05],
  [-0.36, -0.25, -0.11],
  [-0.27, -0.14, 0.06],
  [0.13, 0.25, 0.01],
  [0.24, 0.36, -0.1],
  [0.37, 0.52, 0.09],
];
const FRONT: Tower[] = [
  [-0.52, -0.39, 0.25],
  [-0.38, -0.19, 0.17],
  [0.19, 0.33, 0.21],
  [0.33, 0.52, 0.29],
];
const towerWindows = (ctx: Ctx, [x0, x1, top]: Tower, c: string) => {
  ctx.fillStyle = c;
  for (let y = top + 0.03; y < 0.43; y += 0.036)
    for (let x = x0 + 0.02; x < x1 - 0.022; x += 0.03) ctx.fillRect(x, y, 0.012, 0.018);
};
const cloud = (ctx: Ctx, x: number, y: number, s: number, c: string) => {
  rbox(ctx, x - 0.09 * s, y - 0.018 * s, 0.18 * s, 0.036 * s, 0.018 * s, c);
  rbox(ctx, x - 0.05 * s, y - 0.038 * s, 0.09 * s, 0.04 * s, 0.02 * s, c);
};
const city = (ctx: Ctx, F: number) => {
  // sky in flat bands, violet high, peach low
  box(ctx, -0.5, -0.5, 1, 1, K.skyHi);
  box(ctx, -0.5, -0.3, 1, 0.8, K.sky);
  box(ctx, -0.5, -0.08, 1, 0.58, K.skyLo);
  box(ctx, -0.5, 0.1, 1, 0.4, K.skyGlow);
  // two clouds drift right; one pass per loop, so the drift wraps with the picture
  const drift = (off: number) => -0.75 + 1.5 * phase(F + off, N);
  cloud(ctx, drift(0), -0.36, 1, K.cloudA);
  cloud(ctx, drift(330), -0.2, 0.7, K.cloudB);
  // the low sun, behind everything built
  for (const [x0, x1, t] of FAR) box(ctx, x0, t, x1 - x0, 0.6, K.far);
  disc(ctx, -0.2, -0.02, 0.09, K.halo);
  disc(ctx, -0.2, -0.02, 0.068, C.accent2);
  for (const t of MID) {
    box(ctx, t[0], t[2], t[1] - t[0], 0.6, K.mid);
    towerWindows(ctx, t, K.winMid);
  }
  // the centre tower: the middle third, a stepped crown, an antenna with a blinking light
  box(ctx, -1 / 6, -0.34, 1 / 3, 0.9, C.ink);
  box(ctx, -0.11, -0.39, 0.22, 0.06, C.ink);
  box(ctx, -0.004, -0.47, 0.008, 0.09, C.ink);
  if (phase(F, 30) < 0.4) disc(ctx, 0, -0.472, 0.009, C.accent2);
  for (let y = -0.25; y < 0.45; y += 0.12) box(ctx, -1 / 6, y, 1 / 3, 0.006, K.ledge);
  ctx.fillStyle = K.facade;
  for (let y = -0.31; y < 0.44; y += 0.04)
    for (let x = -0.145; x < 0.14; x += 0.035) {
      if (Math.abs(x + 0.007) < 0.12 && Math.abs(y + 0.01) < 0.12) continue; // keep the lit window clear
      ctx.fillRect(x, y, 0.014, 0.02);
    }
  // the lit window's glow on the facade (outside the portal), flaring on the tick
  const fl = punch(F),
    gw = 0.03 + 0.012 * fl;
  box(ctx, -HP - gw, -HP - gw, 2 * (HP + gw), 2 * (HP + gw), mix(K.glowOut, C.accent2, 0.35 * fl));
  box(ctx, -HP - 0.014, -HP - 0.014, 2 * HP + 0.028, 2 * HP + 0.028, mix(K.glowIn, C.accent2, 0.5 * fl));
  // a sill under the lit window (outside the portal)
  box(ctx, -0.1, HP + 0.004, 0.2, 0.014, K.sill);
  // the portal's stand-in: the lit window, warm orange (the next scene fades in over it)
  box(ctx, -HP, -HP, 2 * HP, 2 * HP, K.wall);
  for (const t of FRONT) {
    box(ctx, t[0], t[2], t[1] - t[0], 0.6, C.ink);
    towerWindows(ctx, t, C.muted);
  }
  box(ctx, -0.5, 0.445, 1, 0.06, C.ink);
};

// =====================================================================================================
// (1) WINDOW: the lit window from outside, a warm room behind it; the desk top's middle is the portal
const G = 0.44; // the glass
// the lamp flickers once, starting on the window level's tick (frame 135)
const lampOn = (F: number) => !((F >= 135 && F < 138) || (F >= 141 && F < 143) || (F >= 145 && F < 146));
const windowScene = (ctx: Ctx, F: number) => {
  box(ctx, -0.5, -0.5, 1, 1, C.ink); // the tower wall and the frame
  box(ctx, -G, -G, 2 * G, 2 * G, K.wall);
  box(ctx, -G, 0.19, 2 * G, G - 0.19, K.floor);
  box(ctx, -G, 0.19, 2 * G, 0.01, K.wallShade);
  const on = lampOn(F);
  // shelf with books (upper left)
  box(ctx, -0.43, -0.28, 0.22, 0.012, K.wallShade);
  const books: [number, number, string][] = [
    [0.022, 0.085, C.accent],
    [0.018, 0.1, C.ink],
    [0.026, 0.075, C.surface],
    [0.02, 0.092, C.accent],
    [0.024, 0.07, K.leaf],
  ];
  let bx = -0.415;
  for (const [w, h, c] of books) {
    box(ctx, bx, -0.28 - h, w, h, c);
    bx += w + 0.006;
  }
  // a framed print (left pane)
  box(ctx, -0.39, -0.13, 0.13, 0.16, C.ink);
  box(ctx, -0.38, -0.12, 0.11, 0.14, C.surface);
  disc(ctx, -0.325, -0.06, 0.03, C.accent);
  // pendant lamp over the desk; the light flickers once as the window fills the frame
  box(ctx, -0.0025, -G, 0.005, 0.12, C.ink);
  if (on) {
    ctx.beginPath();
    ctx.moveTo(-0.04, -0.3);
    ctx.lineTo(0.04, -0.3);
    ctx.lineTo(0.13, -0.2);
    ctx.lineTo(-0.13, -0.2);
    ctx.closePath();
    ctx.fillStyle = K.lampLight;
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(0, -0.3, 0.05, Math.PI, 0);
  ctx.closePath();
  ctx.fillStyle = C.ink;
  ctx.fill();
  disc(ctx, 0, -0.297, 0.017, on ? C.surface : K.wallShade);
  // hanging plant (right pane): a cord, a violet pot, two vines that sway
  const sway = 0.008 * Math.sin(2 * Math.PI * phase(F, 120));
  box(ctx, 0.2475, -G, 0.005, 0.1, C.ink);
  ctx.beginPath();
  ctx.moveTo(0.215, -0.34);
  ctx.lineTo(0.285, -0.34);
  ctx.lineTo(0.275, -0.29);
  ctx.lineTo(0.225, -0.29);
  ctx.closePath();
  ctx.fillStyle = C.accent;
  ctx.fill();
  for (const [vx, len] of [
    [0.232, 7],
    [0.268, 5],
  ] as const)
    for (let k = 0; k < len; k++) {
      const t = k / 6,
        x = vx + sway * t * 3 + 0.012 * Math.sin(k * 1.7),
        y = -0.29 + 0.03 * k;
      oval(ctx, x, y, 0.016, 0.009, k % 2 ? 0.6 : -0.6, k % 2 ? K.leaf : K.leafLit);
    }
  // a chair back peeking over the desk, then the desk (top seen from above, apron and legs)
  rbox(ctx, -0.07, -0.17, 0.14, 0.07, 0.02, K.leaf);
  box(ctx, -0.19, -0.125, 0.38, 0.25, DESK);
  box(ctx, -0.19, 0.125, 0.38, 0.03, DESK_EDGE);
  box(ctx, -0.175, 0.155, 0.018, 0.23, DESK_EDGE);
  box(ctx, 0.157, 0.155, 0.018, 0.23, DESK_EDGE);
  // the mullions: a plum grid of panes, the middle pane framing the desk
  for (const m of [-0.21, 0.21]) {
    box(ctx, m - 0.012, -G, 0.024, 2 * G, C.ink);
    box(ctx, -G, m - 0.012, 2 * G, 0.024, C.ink);
  }
  box(ctx, -0.5, G, 1, 0.03, K.sill);
  // the portal's stand-in is the desk top itself (the desk scene's ground is the same colour)
};

// =====================================================================================================
// (2) DESK, top down: a notebook, a mug with steam, a pen, a plant, a keyboard; the phone's screen is the portal
const PH = { w: HP + 0.016, top: -0.205, bot: 0.205, st: -0.188, sb: 0.188 };
const desk = (ctx: Ctx, F: number) => {
  box(ctx, -0.5, -0.5, 1, 1, DESK);
  for (const y of [-0.38, -0.13, 0.12, 0.37]) box(ctx, -0.5, y, 1, 0.004, DESK_SHADE);
  const shadow = (draw: (dx: number, dy: number, c: string | null) => void) => {
    draw(0.008, 0.012, DESK_SHADE);
    draw(0, 0, null);
  };
  // the notebook, open, turned a little
  ctx.save();
  ctx.translate(-0.24, -0.22);
  ctx.rotate(-0.14);
  shadow((dx, dy, c) => {
    if (c) return rbox(ctx, -0.13 + dx, -0.09 + dy, 0.26, 0.18, 0.008, c);
    rbox(ctx, -0.13, -0.09, 0.26, 0.18, 0.008, C.surface);
    box(ctx, -0.002, -0.09, 0.004, 0.18, C.line);
    for (let k = 0; k < 7; k++) {
      const y = -0.06 + k * 0.021;
      box(ctx, -0.115, y, 0.1, 0.003, C.line);
      box(ctx, 0.015, y, 0.1, 0.003, C.line);
      if (k < 5) box(ctx, -0.112, y - 0.009, [0.08, 0.06, 0.09, 0.05, 0.07][k]!, 0.006, C.ink);
      if (k < 3) box(ctx, 0.018, y - 0.009, [0.07, 0.085, 0.04][k]!, 0.006, C.accent);
    }
    box(ctx, 0.07, -0.09, 0.012, 0.21, C.accent2); // ribbon
  });
  ctx.restore();
  // the pen
  ctx.save();
  ctx.translate(-0.2, 0.05);
  ctx.rotate(0.45);
  shadow((dx, dy, c) => {
    rbox(ctx, -0.085 + dx, -0.008 + dy, 0.17, 0.016, 0.008, c ?? C.ink);
    if (!c) rbox(ctx, 0.035, -0.008, 0.05, 0.016, 0.008, C.accent);
  });
  ctx.restore();
  // the mug, and its steam curling on a 120-frame period
  const mx = 0.23,
    my = -0.2;
  shadow((dx, dy, c) => {
    rbox(ctx, mx + 0.055 + dx, my - 0.016 + dy, 0.05, 0.032, 0.014, c ?? C.surface);
    disc(ctx, mx + dx, my + dy, 0.066, c ?? C.surface);
    if (!c) {
      disc(ctx, mx, my, 0.052, C.line);
      disc(ctx, mx, my, 0.046, K.coffee);
    }
  });
  ctx.save();
  ctx.lineCap = "round";
  ctx.strokeStyle = C.surface;
  for (let s = 0; s < 3; s++) {
    const x0 = mx - 0.022 + s * 0.022,
      ph = phase(F + s * 40, 120);
    ctx.lineWidth = 0.01;
    for (let k = 0; k < 18; k++) {
      const t0 = k / 18,
        t1 = (k + 1) / 18,
        at = (t: number): [number, number] => [
          x0 + 0.02 * Math.sin(2 * Math.PI * (t * 1.4 - ph)) * t,
          my - 0.035 - t * 0.2,
        ];
      // each strand rises and thins; its visible part travels with the phase so the steam lifts off
      const a = Math.sin(Math.PI * clamp((t0 - ph * 0.5 + 0.1) / 0.75)) * (1 - t0);
      if (a <= 0.02) continue;
      ctx.globalAlpha *= a;
      ctx.beginPath();
      ctx.moveTo(...at(t0));
      ctx.lineTo(...at(t1));
      ctx.stroke();
      ctx.globalAlpha /= a;
    }
  }
  ctx.restore();
  // the plant, from above
  const px = -0.22,
    py = 0.27;
  disc(ctx, px + 0.008, py + 0.012, 0.078, DESK_SHADE);
  disc(ctx, px, py, 0.078, C.accent2);
  disc(ctx, px, py, 0.062, K.coffee);
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2 + 0.3 + 0.04 * Math.sin(2 * Math.PI * phase(F + k * 17, 120));
    oval(ctx, px + Math.cos(a) * 0.055, py + Math.sin(a) * 0.055, 0.058, 0.022, a, k % 2 ? K.leaf : K.leafLit);
  }
  disc(ctx, px, py, 0.02, K.leaf);
  // the keyboard's corner, lower right
  ctx.save();
  ctx.translate(0.3, 0.31);
  ctx.rotate(-0.07);
  shadow((dx, dy, c) => {
    rbox(ctx, -0.15 + dx, -0.075 + dy, 0.32, 0.15, 0.014, c ?? C.surface);
    if (!c)
      for (let r = 0; r < 4; r++)
        for (let q = 0; q < 9; q++) rbox(ctx, -0.137 + q * 0.033, -0.062 + r * 0.033, 0.027, 0.027, 0.005, C.line);
  });
  ctx.restore();
  // the phone at the centre: a plum body, its screen exactly the portal's width, showing the Oriel week
  box(ctx, -PH.w + 0.008, PH.top + 0.012, 2 * PH.w, PH.bot - PH.top, DESK_SHADE);
  rbox(ctx, -PH.w, PH.top, 2 * PH.w, PH.bot - PH.top, 0.034, C.ink);
  ctx.save();
  rr(ctx, -HP, PH.st, 2 * HP, PH.sb - PH.st, 0.022);
  ctx.clip();
  ctx.scale(1 / RATIO, 1 / RATIO);
  phoneApp(ctx, F); // the same function the next level draws, so the portal's edge is seamless
  ctx.restore();
  rbox(ctx, -0.02, PH.st + 0.006, 0.04, 0.009, 0.0045, C.ink); // the camera island
};

// =====================================================================================================
// (3) PHONE: the Oriel week. Columns and hour rows are 1/6 wide, so the centre cell is the portal and seven days
// run past the square's edges like a scrolled week. Drawn past its square (status bar above, more hours below)
// so the desk scene can show the whole screen with the same function.
type Block = [col: number, row: number, rows: number, kind: "o" | "l", label: string];
const BLOCKS: Block[] = [
  [-3, 1, 1, "l", ""],
  [-2, -1, 2, "l", "Focus"],
  [-2, 2, 1, "o", "Lunch"],
  [-2, 4, 1, "l", "Plan"],
  [-1, -1, 1, "o", "Sync"],
  [-1, 0, 1, "l", "1:1"],
  [-1, 1, 2, "l", "Deep"],
  [-1, 4, 1, "o", "Call"],
  [0, -1, 1, "o", "Standup"],
  [0, 1, 1, "l", ""], // unlabelled: it sits right under the caption as the zoom passes
  [0, 3, 2, "o", "Demo"],
  [1, -1, 1, "l", "Ops"],
  [1, 0, 2, "o", "Offsite"],
  [1, 3, 1, "l", "Retro"],
  [2, -1, 1, "l", "Brunch"],
  [2, 0, 1, "l", "Tennis"],
  [2, 2, 1, "o", "Visit"],
  [3, -1, 2, "o", ""],
  [3, 2, 1, "l", ""],
];
const DAYS = ["M", "T", "W", "T", "F", "S", "S"];
const COL = 1 / 6,
  GRID_TOP = -0.25;
const phoneApp = (ctx: Ctx, F: number) => {
  box(ctx, -0.5, -1.14, 1, 2.28, C.surface);
  // status bar and app bar (only the desk scene sees these)
  ut(ctx, "9:41", -0.4, -1.0, sans(0.05));
  rbox(ctx, 0.3, -1.04, 0.09, 0.042, 0.012, C.ink);
  ut(ctx, "Oriel", -0.4, -0.79, sans(0.1));
  disc(ctx, 0.37, -0.82, 0.055, C.accent);
  rbox(ctx, -0.4, -0.68, 0.8, 0.1, 0.05, C.line);
  rbox(ctx, -0.13, -0.672, 0.26, 0.084, 0.042, C.surface);
  ut(ctx, "Day", -0.27, -0.618, sans(0.036, C.ink, "center"));
  ut(ctx, "Week", 0, -0.618, sans(0.036, C.ink, "center"));
  ut(ctx, "Month", 0.27, -0.618, sans(0.036, C.ink, "center"));
  // header, inside the square
  ut(ctx, "Thu 14", 0, -0.312, sans(0.056, C.ink, "center"));
  for (let k = -2; k <= 2; k++) {
    if (k === 0) disc(ctx, 0, -0.2745, 0.021, C.accent);
    ut(ctx, DAYS[k + 3]!, k * COL, -0.2645, sans(0.027, k === 0 ? C.surface : C.ink, "center"));
  }
  // Oriel looks at the week: a faint violet band sweeps the days once a level
  const sx = -0.62 + 1.24 * phase(F, 120);
  box(ctx, sx - HP, GRID_TOP, COL, 1.4, K.scan);
  // grid
  ctx.fillStyle = C.line;
  for (let k = -3; k <= 2; k++) ctx.fillRect((k + 0.5) * COL - 0.002, GRID_TOP, 0.004, 1.4);
  for (let r = 0; r <= 8; r++) ctx.fillRect(-0.5, GRID_TOP + r * COL - 0.002, 1, 0.004);
  // booked blocks: line and accent2
  for (const [c, r, n, kind, label] of BLOCKS) {
    const x = c * COL - HP + 0.012,
      y = r * COL - HP + 0.012;
    rbox(ctx, x, y, COL - 0.024, n * COL - 0.024, 0.02, kind === "o" ? C.accent2 : C.line);
    box(ctx, x, y + 0.012, 0.008, n * COL - 0.048, kind === "o" ? C.ink : K.lilac);
    if (label) ut(ctx, label, x + 0.022, y + 0.045, sans(0.026));
  }
  // hour labels in the scrolled-off Monday column
  for (let r = -1; r <= 6; r++) {
    const h = 14 + r;
    ut(ctx, `${h > 12 ? h - 12 : h}${h >= 12 ? "p" : "a"}`, -0.49, r * COL - HP + 0.04, {
      size: 0.026,
      family: F_.mono,
      weight: 500,
      color: C.ink,
    });
  }
  // the free hour: a violet ring round the centre cell that swells and brightens every two beats inside the gutter
  // (only the tick's snap below crosses the booked blocks, on purpose, for half a second)
  const g = 0.5 - 0.5 * Math.cos(2 * Math.PI * phase(F, 60)),
    lw = 0.004 + 0.006 * g;
  ctx.save();
  ctx.lineWidth = lw;
  ctx.strokeStyle = mix(K.lilac, C.accent, g);
  rr(ctx, -HP - lw / 2, -HP - lw / 2, 2 * HP + lw, 2 * HP + lw, 0.026);
  ctx.stroke();
  // found: on the tick a violet ring snaps out from the free hour and fades as it spreads
  const pk = punch(F);
  if (pk > 0) {
    const grow = 0.07 * (1 - pk),
      pw = 0.006 + 0.01 * pk;
    ctx.globalAlpha *= pk;
    ctx.lineWidth = pw;
    ctx.strokeStyle = C.accent;
    rr(ctx, -HP - grow, -HP - grow, 2 * (HP + grow), 2 * (HP + grow), 0.026 + grow * 0.5);
    ctx.stroke();
  }
  ctx.restore();
  // the portal's stand-in: the chip itself, at the next scene's scale
  ctx.save();
  ctx.scale(1 / RATIO, 1 / RATIO);
  chipBase(ctx);
  ctx.restore();
};

// =====================================================================================================
// (4) CELL: the violet chip "Everyone free"; its tiny postcard skyline is the portal, and it is the city
const chipBase = (ctx: Ctx) => {
  box(ctx, -0.5, -0.5, 1, 1, C.surface);
  rbox(ctx, -0.47, -0.47, 0.94, 0.94, 0.09, C.accent);
};
const AVATARS = [C.accent2, C.surface, K.lilac, C.ink];
const cell = (ctx: Ctx, F: number) => {
  chipBase(ctx);
  ut(ctx, "Everyone free", 0, -0.128, sans(0.064, C.surface, "center"));
  // the postcard: a white border outside the portal, the city inside it
  rbox(ctx, -HP - 0.016, -HP - 0.016, 2 * HP + 0.032, 2 * HP + 0.032, 0.008, C.surface);
  box(ctx, -HP, -HP, 2 * HP, 2 * HP, K.skyLo);
  box(ctx, -HP, 0.02, 2 * HP, HP - 0.02, C.ink);
  ut(ctx, "Thu 14 · 2–3 pm", 0, 0.155, sans(0.034, K.soft, "center"));
  // everyone: the four avatars hop in turn on the tick, then keep a slow wave
  AVATARS.forEach((c, i) => {
    const x = -0.075 + i * 0.05,
      hop = punch(F - i * 2),
      y = -0.228 + 0.006 * Math.sin(2 * Math.PI * (phase(F, 60) - i / 4)) - 0.022 * Math.sin(Math.PI * hop),
      r = 1 + 0.18 * hop;
    disc(ctx, x, y, 0.031 * r, C.accent);
    disc(ctx, x, y, 0.025 * r, c);
  });
};

const SCENES = [city, windowScene, desk, phoneApp, cell];

// =====================================================================================================
// captions: plain Inter on a flat white plate, one italic key word in the accent
type Seg = { t: string; key: boolean };
const parse = (line: string): Seg[] =>
  line
    .split(/(\*[^*]+\*)/)
    .filter(Boolean)
    .map((t) => (t.startsWith("*") ? { t: t.slice(1, -1), key: true } : { t, key: false }));
const CAPTIONS: { tall: string[]; wide: string }[] = [
  { tall: ["Somewhere in the *city*,"], wide: "Somewhere in the *city*," },
  { tall: ["behind one *window*,"], wide: "behind one *window*," },
  { tall: ["on one *desk*,"], wide: "on one *desk*," },
  { tall: ["Oriel looks", "at the *week*"], wide: "Oriel looks at the *week*" },
  { tall: ["and finds the hour", "for *everyone*."], wide: "and finds the hour for *everyone*." },
];

export function make(size: Size, id: string): Film {
  const L = layout(size),
    { W, H, u, cx, cy } = L;
  const CC = Math.max(W, H); // the square that covers the frame

  // ---- the zoom: the current level and every level nested in it down to 4 px
  const zoom = (ctx: Ctx, Fm: number) => {
    const p = Fm / LV,
      i0 = Math.floor(p),
      f = p - i0;
    let side = CC * RATIO ** f;
    for (let d = 0; side >= 4; d++, side /= RATIO) {
      ctx.save();
      ctx.globalAlpha = clamp((side - 4) / 4); // fade in between 4 and 8 px: nothing pops
      ctx.translate(cx, cy);
      ctx.scale(side, side);
      if (d > 0) {
        ctx.beginPath();
        ctx.rect(-0.5, -0.5, 1, 1);
        ctx.clip();
      }
      SCENES[(i0 + d) % NL]!(ctx, Fm);
      ctx.restore();
    }
  };

  // ---- captions and the tag
  const cap = {
    size: (L.tall ? 60 : 50) * u,
    key: (L.tall ? 74 : 62) * u,
    padX: (L.tall ? 40 : 34) * u,
    padY: (L.tall ? 30 : 26) * u,
    lead: (L.tall ? 78 : 64) * u,
  };
  const segOpts = (s: Seg): TextOpts =>
    s.key
      ? { size: cap.key, family: F_.italic, color: C.accent, track: 0 }
      : { size: cap.size, family: F_.sans, weight: 600, color: C.ink, track: -0.015 };
  const lines = (k: number) => (L.tall ? CAPTIONS[k]!.tall : [CAPTIONS[k]!.wide]).map(parse);
  let metrics: { w: number; h: number; lw: number[] }[] | null = null;
  const measureAll = (ctx: Ctx) =>
    (metrics ??= CAPTIONS.map((_, k) => {
      const lw = lines(k).map((segs) => segs.reduce((a, s) => a + measure(ctx, s.t, segOpts(s)), 0));
      return { w: Math.max(...lw) + 2 * cap.padX, h: lw.length * cap.lead + 2 * cap.padY - (cap.lead - cap.size), lw };
    }));
  const plateBottom = H - L.safe.bottom - (L.tall ? 0 : 20 * u);
  // the plate: continuous, sized to the larger caption while one hands over to the next
  const plateRect = (ctx: Ctx, Fm: number) => {
    const M = measureAll(ctx),
      k = Math.floor(Fm / LV) % NL,
      local = Fm - k * LV;
    // it grows to fit both while the old words leave, then settles on the new words' size as they rise in, so it
    // fits the new caption exactly on the hand-off
    const cur = M[k]!,
      next = M[(k + 1) % NL]!,
      bw = Math.max(cur.w, next.w),
      bh = Math.max(cur.h, next.h);
    let pw = cur.w,
      ph = cur.h;
    if (local >= IN0) {
      const t = ease.inOutCubic(prog(local, IN0, LV));
      pw = lerp(bw, next.w, t);
      ph = lerp(bh, next.h, t);
    } else if (local >= OUT0) {
      const t = ease.inOutCubic(prog(local, OUT0, IN0));
      pw = lerp(cur.w, bw, t);
      ph = lerp(cur.h, bh, t);
    }
    return { px: L.tall ? cx - pw / 2 : L.safe.x, py: plateBottom - ph, pw, ph };
  };
  const captions = (ctx: Ctx, Fm: number) => {
    const M = measureAll(ctx),
      k = Math.floor(Fm / LV) % NL,
      { px, py, pw, ph } = plateRect(ctx, Fm);
    ctx.save();
    rr(ctx, px, py, pw, ph, 22 * u);
    ctx.fillStyle = C.surface;
    ctx.fill();
    ctx.lineWidth = 2 * u;
    ctx.strokeStyle = C.line;
    ctx.stroke();
    ctx.restore();
    // the words roll through the plate: each caption leaves upward as the plate grows to fit the next, and the next
    // rises in from below right after and settles exactly on the hand-off (never both at once, so lines of different
    // counts never collide, and frame 0 opens on a whole line). The key word rides in with its line and jumps on
    // the tick, a beat after the hand-off
    ctx.save();
    rr(ctx, px, py, pw, ph, 22 * u);
    ctx.clip();
    for (const j of [k - 1, k, k + 1]) {
      const jj = (j + NL) % NL,
        t = ((((Fm - jj * LV) % N) + N + N / 2) % N) - N / 2, // this caption's own clock, wrapped
        inP = ease.outCubic(prog(t, IN0 - LV, 0)),
        out = ease.inCubic(prog(t, OUT0, IN0)),
        roll = (1 - inP) * ph * 0.8 - out * ph * 0.8,
        alpha = inP * (1 - out);
      const kq = t - BEAT,
        hop = kq >= 0 && kq < 14 ? 1 - ease.outBack(kq / 14, 2.2) : 0, // 1 on the tick, a small dip, then rest
        keyRoll = roll - hop * cap.key * 0.16;
      if (alpha <= 0.002) continue;
      const ls = lines(jj),
        mw = M[jj]!.lw;
      ls.forEach((segs, li) => {
        const base = plateBottom - cap.padY - (ls.length - 1 - li) * cap.lead,
          lw = mw[li]!;
        let x = L.tall ? cx - lw / 2 : L.safe.x + cap.padX;
        for (const s of segs) {
          const o = segOpts(s),
            w = measure(ctx, s.t, o);
          text(ctx, s.t, x, base + (s.key ? keyRoll : roll), { ...o, alpha });
          x += w;
        }
      });
    }
    ctx.restore();
  };
  const TAG: TextOpts = { size: 24 * u, family: F_.mono, weight: 500, color: C.ink, track: 0.06 },
    TAG_S = "ORIEL · oriel.example";
  const tagRect = (ctx: Ctx) => ({ x: L.safe.x, y: L.safe.top, w: measure(ctx, TAG_S, TAG) + 36 * u, h: 52 * u });
  const tag = (ctx: Ctx) => {
    const { x, y, w, h } = tagRect(ctx);
    ctx.save();
    rr(ctx, x, y, w, h, 14 * u);
    ctx.fillStyle = C.surface;
    ctx.fill();
    ctx.lineWidth = 2 * u;
    ctx.strokeStyle = C.line;
    ctx.stroke();
    ctx.restore();
    text(ctx, TAG_S, x + 18 * u, y + 34 * u, TAG);
  };

  const paint = (ctx: Ctx, env: Env, F: number) => {
    const Fm = ((F % N) + N) % N;
    ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
    // this frame's keep-out, in device px, before any scene word is set
    const s = env.scale,
      t = tagRect(ctx),
      p = plateRect(ctx, Fm);
    KEEP.W = W * s;
    KEEP.H = H * s;
    KEEP.u = u * s;
    KEEP.out = [
      [t.x * s, t.y * s, (t.x + t.w) * s, (t.y + t.h) * s],
      [p.px * s, p.py * s, (p.px + p.pw) * s, (p.py + p.ph) * s],
    ];
    ctx.fillStyle = C.ground;
    ctx.fillRect(0, 0, W, H);
    zoom(ctx, Fm);
    ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
    ctx.globalAlpha = 1;
    captions(ctx, Fm);
    tag(ctx);
  };

  const names = ["city", "window", "desk", "phone", "cell"];
  const shots: Shot[] = names.map((sid, i) => ({
    id: sid,
    start: i * LV,
    end: (i + 1) * LV,
    draw: (ctx, local, env) => paint(ctx, env, i * LV + local),
  }));
  const hands = [1, 2, 3, 4, 5].map((k) => k * LV);
  return {
    meta: { title: id, W, H, fps: FPS, bpm: BPM, durationFrames: N, raster: "cpu" },
    assets: { images: {}, fonts: P.assets },
    shots,
    audio: beatScore({
      frames: N,
      fps: FPS,
      bpm: BPM,
      mood: "soft",
      loop: true,
      whooshes: hands, // each ends on a hand-off (600 wraps to 0)
      ticks: hands.map((h) => (h % N) + BEAT), // each caption's key word lands a beat after its hand-off
      gain: 0.36,
    }),
  };
}

export const infiniteZoomVertical = make("vertical", "infiniteZoomVertical");
export const infiniteZoom = make("landscape", "infiniteZoom");
