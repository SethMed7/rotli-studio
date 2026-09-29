// STUDY 48 · STAINED GLASS (24 s, 30 fps, 90 bpm). A leaded window of the four elements, built and then lit by one
// day of sun: the lead draws itself, the panes flood with colour from a seed point, then only the sun moves. The
// same panes change mood from dawn to night and throw their colour onto the stone floor. No product, no real window.
// Brief: series/studies/briefs/stained-glass.json · prompt: series/studies/prompts/stained-glass.prompt.md
//
// One continuous paint(F). The window is geometry built once per size (panes as polygons in window pixels, cut in
// paint order so later panes cover earlier ones); the light is closed-form in F; the lead is drawn into a scratch
// layer each frame (each pane erases the lead under it, then strokes its own came), so the cut lines are the drawing.
import PACK from "../../../brand/packs/studio/pack.json";
import { rng, type Ctx, type Env, type Layer } from "../core";
import type { Film, Shot } from "../film";
import { clamp, ease, lerp, prog, spring, window01 } from "../kit/motion";
import { usePack } from "../kit/pack";
import { beatScore } from "../kit/score";
import { layout, type Size } from "../kit/sizes";
import { letters, measure, text } from "../kit/type";
import { rr } from "../kit/ui";

const P = usePack(PACK),
  C = P.palette("glass"),
  F_ = P.face;
const FPS = 30,
  BPM = 90,
  N = 720; // a beat is 20 frames
const T = { glaze: 120, noon: 280, dusk: 440, night: 580, end: 660 };
const FLOOD = { earth: 120, water: 160, air: 200, fire: 240, arch: 260 };

// ---------------------------------------------------------------- colour
const rgb = (h: string): [number, number, number] => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const hex = (c: number[]) =>
  "#" +
  c
    .map((v) =>
      Math.round(clamp(v, 0, 255))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("");
const mix = (a: string, b: string, t: number) => {
  const A = rgb(a),
    B = rgb(b);
  return hex(A.map((v, i) => lerp(v, B[i]!, t)));
};
const rgba = (h: string, a: number) => {
  const [r, g, b] = rgb(h);
  return `rgba(${r},${g},${b},${clamp(a)})`;
};
const J = {
  ruby: C.ruby,
  emerald: C.emerald,
  azure: C.azure,
  violet: C.violet,
  gold: C.accent,
  cobalt: C.accent2,
  clear: mix(C.ink, C.azure, 0.16),
};
const dk = (c: string, t = 0.3) => mix(c, C.deep, t);
const lt = (c: string, t = 0.25) => mix(c, C.ink, t);
const GRIS = "rgba(58,34,18,0.6)";
const HILITE = mix(C.lead, C.ink, 0.28);

// ---------------------------------------------------------------- geometry helpers (u, v in panel units)
type Pt = [number, number];
const TAU = Math.PI * 2;
const ring = (cu: number, cv: number, ru: number, rv: number, n = 32): Pt[] =>
  Array.from({ length: n }, (_, i) => [cu + Math.cos((i / n) * TAU) * ru, cv + Math.sin((i / n) * TAU) * rv]);
const arcPts = (cu: number, cv: number, ru: number, rv: number, a0: number, a1: number, n = 16): Pt[] =>
  Array.from({ length: n }, (_, i) => {
    const a = a0 + (i / (n - 1)) * (a1 - a0);
    return [cu + Math.cos(a) * ru, cv + Math.sin(a) * rv];
  });
const cub = (p0: Pt, p1: Pt, p2: Pt, p3: Pt, n = 12): Pt[] =>
  Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n,
      m = 1 - t;
    return [
      m * m * m * p0[0] + 3 * m * m * t * p1[0] + 3 * m * t * t * p2[0] + t * t * t * p3[0],
      m * m * m * p0[1] + 3 * m * m * t * p1[1] + 3 * m * t * t * p2[1] + t * t * t * p3[1],
    ];
  });
const waveLine = (v0: number, amp: number, f: number, ph: number, n = 18): Pt[] =>
  Array.from({ length: n + 1 }, (_, i) => {
    const u = -0.06 + (i / n) * 1.12;
    return [u, v0 + amp * Math.sin(TAU * (f * u + ph))];
  });
const below = (v0: number, amp: number, f: number, ph: number): Pt[] => [
  ...waveLine(v0, amp, f, ph),
  [1.06, 1.06],
  [-0.06, 1.06],
];
const above = (v0: number, amp: number, f: number, ph: number): Pt[] => [
  ...waveLine(v0, amp, f, ph),
  [1.06, -0.06],
  [-0.06, -0.06],
];
// the right part of a wave band: the wave from u0 on, then a slanted cut back down to the bottom
const bandSplit = (v0: number, amp: number, f: number, ph: number, u0: number, lean: number): Pt[] => {
  const top = waveLine(v0, amp, f, ph, 30).filter(([u]) => u >= u0),
    first = top[0]!;
  return [...top, [1.06, 1.06], [first[0] + lean, 1.06]];
};
const flame = (cu: number, vb: number, w: number, tip: Pt): Pt[] => {
  const h = vb - tip[1];
  const left = cub([cu - w / 2, vb], [cu - w * 0.8, vb - h * 0.45], [tip[0] - w * 0.1, tip[1] + h * 0.42], tip),
    right = cub(tip, [tip[0] + w * 0.28, tip[1] + h * 0.45], [cu + w * 0.72, vb - h * 0.35], [cu + w / 2, vb]),
    bottom = cub([cu + w / 2, vb], [cu + w / 2, vb + 0.08], [cu - w / 2, vb + 0.08], [cu - w / 2, vb]);
  return [...left, ...right.slice(1), ...bottom.slice(1, -1)];
};
const spiralRibbon = (cu: number, cv: number, R: number, a: number, turns: number, dir: number, w: number) => {
  const n = 70,
    outer: Pt[] = [],
    inner: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n,
      th = dir * t * turns * TAU + (dir > 0 ? 0 : Math.PI),
      r = R * (0.3 + 0.7 * t);
    outer.push([cu + Math.cos(th) * (r + w / 2), cv + Math.sin(th) * (r + w / 2) * a]);
    inner.push([cu + Math.cos(th) * (r - w / 2), cv + Math.sin(th) * (r - w / 2) * a]);
  }
  return { pts: [...outer, ...inner.reverse()], ends: [outer[n]!, inner[0]!] as Pt[] };
};

// ---------------------------------------------------------------- the four panels, cut in paint order
type Gris = "veins" | "scales" | "feathers" | "hatch" | "licks";
type Def = { pts: Pt[]; col: string; corners?: Pt[]; poly?: boolean; gris?: Gris };
const RECT: Pt[] = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
];

const earth = (a: number): Def[] => {
  const canopy = (n: number) => ring(0.72, 0.38, 0.19, 0.19 * a, n);
  return [
    { pts: RECT, col: J.azure },
    {
      pts: [
        [0.38, -0.04],
        [1.04, -0.04],
        [1.04, 0.4],
      ],
      col: mix(J.azure, J.cobalt, 0.55),
      poly: true,
    },
    {
      pts: [
        [0.36, 0.7],
        [0.76, 0.18],
        [1.12, 0.7],
      ],
      col: J.violet,
      poly: true,
    },
    {
      pts: [
        [0.76, 0.18],
        [0.88, 0.7],
        [1.12, 0.7],
      ],
      col: dk(J.violet, 0.32),
      poly: true,
    },
    {
      pts: [
        [-0.12, 0.74],
        [0.3, 0.14],
        [0.74, 0.74],
      ],
      col: J.cobalt,
      poly: true,
    },
    {
      pts: [
        [0.3, 0.14],
        [0.45, 0.74],
        [0.74, 0.74],
      ],
      col: dk(J.cobalt, 0.34),
      poly: true,
    },
    {
      pts: [
        [0.3, 0.14],
        [0.18, 0.31],
        [0.25, 0.27],
        [0.31, 0.34],
        [0.37, 0.27],
        [0.43, 0.32],
      ],
      col: J.clear,
      poly: true,
    },
    { pts: below(0.68, 0.03, 1.1, 0.1), col: J.emerald },
    { pts: below(0.87, 0.022, 1.4, 0.55), col: dk(J.emerald, 0.3) },
    {
      pts: [
        [0.69, 0.5],
        [0.755, 0.5],
        [0.775, 0.9],
        [0.675, 0.9],
      ],
      col: dk(mix(J.gold, J.ruby, 0.45), 0.3),
      poly: true,
    },
    { pts: canopy(34), col: lt(J.emerald, 0.14), gris: "veins" },
    {
      pts: arcPts(0.72, 0.38, 0.19, 0.19 * a, -Math.PI / 2, Math.PI / 2, 18),
      col: J.emerald,
      corners: [
        [0.72, 0.38 - 0.19 * a],
        [0.72, 0.38 + 0.19 * a],
      ],
      gris: "veins",
    },
  ];
};

const water = (a: number): Def[] => {
  const up = cub([0.2, 0.63], [0.33, 0.49], [0.56, 0.49], [0.7, 0.63], 16),
    lo = cub([0.7, 0.63], [0.56, 0.77], [0.33, 0.77], [0.2, 0.63], 16),
    gill = 0.56,
    hu = up.filter(([u]) => u >= gill),
    hl = lo.filter(([u]) => u >= gill);
  return [
    { pts: RECT, col: J.gold },
    {
      pts: [
        [-0.04, -0.04],
        [0.62, -0.04],
        [-0.04, 0.24],
      ],
      col: mix(J.gold, J.ruby, 0.45),
      poly: true,
    },
    { pts: below(0.28, 0.035, 1.4, 0), col: J.azure },
    { pts: bandSplit(0.28, 0.035, 1.4, 0, 0.6, 0.12), col: mix(J.azure, J.clear, 0.3), corners: [] },
    { pts: below(0.5, 0.035, 1.4, 0.18), col: J.cobalt },
    { pts: bandSplit(0.5, 0.035, 1.4, 0.18, 0.78, 0.06), col: dk(J.cobalt, 0.28) },
    { pts: below(0.78, 0.03, 1.4, 0.36), col: mix(J.cobalt, J.violet, 0.55) },
    { pts: bandSplit(0.78, 0.03, 1.4, 0.36, 0.4, -0.08), col: J.violet },
    { pts: [...up, ...lo.slice(1, -1)], col: J.gold, corners: [up[0]!], gris: "scales" },
    { pts: [...hu, ...hl], col: J.ruby, corners: [hu[0]!, hl[hl.length - 1]!] },
    {
      pts: [
        [0.22, 0.63],
        [0.08, 0.53],
        [0.12, 0.63],
        [0.08, 0.73],
      ],
      col: J.ruby,
      poly: true,
    },
    { pts: ring(0.63, 0.6, 0.026, 0.026 * a, 14), col: J.clear },
  ];
};

const air = (a: number): Def[] => {
  const s1 = spiralRibbon(0.3, 0.52, 0.2, a, 1.55, 1, 0.06),
    s2 = spiralRibbon(0.75, 0.6, 0.14, a, 1.35, -1, 0.05);
  return [
    { pts: RECT, col: lt(J.azure, 0.34) },
    { pts: above(0.3, 0.03, 1.2, 0.2), col: J.azure },
    {
      pts: [
        [0.56, -0.04],
        [1.04, -0.04],
        [1.04, 0.22],
      ],
      col: mix(J.azure, J.cobalt, 0.5),
      poly: true,
    },
    { pts: below(0.8, 0.03, 1.2, 0.3), col: mix(J.violet, J.azure, 0.35) },
    { pts: s1.pts, col: J.cobalt, corners: s1.ends },
    { pts: ring(0.3, 0.52, 0.06, 0.06 * a, 18), col: J.gold },
    { pts: s2.pts, col: J.cobalt, corners: s2.ends },
    { pts: ring(0.75, 0.6, 0.045, 0.045 * a, 16), col: J.gold },
    {
      pts: [
        ...cub([0.52, 0.2], [0.45, 0.1], [0.36, 0.07], [0.24, 0.09], 8),
        ...cub([0.24, 0.09], [0.35, 0.13], [0.43, 0.19], [0.5, 0.26], 8).slice(1),
      ],
      col: J.clear,
      corners: [[0.24, 0.09]],
      gris: "feathers",
    },
    {
      pts: [
        ...cub([0.6, 0.2], [0.66, 0.09], [0.75, 0.05], [0.88, 0.05], 8),
        ...cub([0.88, 0.05], [0.77, 0.1], [0.69, 0.17], [0.63, 0.26], 8).slice(1),
      ],
      col: J.clear,
      corners: [[0.88, 0.05]],
      gris: "feathers",
    },
    { pts: ring(0.565, 0.225, 0.075, 0.034, 20), col: J.gold },
  ];
};

const fire = (): Def[] => [
  { pts: RECT, col: dk(J.violet, 0.38) },
  {
    pts: [
      [-0.04, -0.04],
      [0.5, -0.04],
      [-0.04, 0.46],
    ],
    col: dk(J.cobalt, 0.2),
    poly: true,
  },
  {
    pts: [
      [0.62, -0.04],
      [1.04, -0.04],
      [1.04, 0.4],
    ],
    col: J.violet,
    poly: true,
  },
  { pts: flame(0.25, 0.84, 0.32, [0.12, 0.3]), col: J.gold, corners: [[0.12, 0.3]] },
  { pts: flame(0.76, 0.84, 0.32, [0.9, 0.33]), col: J.gold, corners: [[0.9, 0.33]] },
  { pts: flame(0.5, 0.86, 0.4, [0.53, 0.07]), col: J.ruby, corners: [[0.53, 0.07]], gris: "licks" },
  { pts: flame(0.5, 0.84, 0.18, [0.47, 0.42]), col: lt(J.gold, 0.28), corners: [[0.47, 0.42]] },
  { pts: below(0.83, 0.02, 2, 0.1), col: dk(J.ruby, 0.4) },
  { pts: ring(0.2, 0.92, 0.13, 0.05, 20), col: J.ruby, gris: "hatch" },
  { pts: ring(0.5, 0.935, 0.15, 0.05, 20), col: J.gold, gris: "hatch" },
  { pts: ring(0.8, 0.92, 0.13, 0.05, 20), col: J.ruby, gris: "hatch" },
];

// ---------------------------------------------------------------- the window (window pixels, origin top-left of the rect)
type Shape = {
  pts: Pt[];
  col: string;
  gris?: Pt[][];
  bubbles: [number, number, number][];
  grad: [number, number, number, number];
  len: number;
  top: number;
};
type Key = "earth" | "water" | "air" | "fire" | "arch" | "border";
type Region = { key: Key; clip: Pt[]; shapes: Shape[]; seed: Pt; reach: number; at: number; dur: number; bb: number[] };
type Win = {
  Wp: number;
  b: number;
  regions: Region[];
  outline: Pt[];
  solder: Pt[];
  bars: number[];
  top: number;
  bottom: number;
  panels: Record<"earth" | "water" | "air" | "fire", number[]>;
};

const perim = (pts: Pt[]) => {
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]!,
      b = pts[(i + 1) % pts.length]!;
    s += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  return s;
};
const bbox = (pts: Pt[]) => {
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity;
  for (const [x, y] of pts) {
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  }
  return [x0, y0, x1, y1];
};
const inside = (p: Pt, poly: Pt[]) => {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]!,
      [xj, yj] = poly[j]!;
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};
const distTo = (p: Pt, poly: Pt[]) => {
  let d = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!,
      b = poly[(i + 1) % poly.length]!,
      dx = b[0] - a[0],
      dy = b[1] - a[1],
      t = clamp(((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1));
    d = Math.min(d, Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy));
  }
  return d;
};

// grisaille: painted detail, as polylines in window pixels, from the pane's box
const grisaille = (kind: Gris, bb: number[], u: number): Pt[][] => {
  const [x0, y0, x1, y1] = bb as [number, number, number, number],
    w = x1 - x0,
    h = y1 - y0,
    out: Pt[][] = [];
  if (kind === "veins") {
    const cx = (x0 + x1) / 2;
    out.push(cub([cx, y1], [cx - w * 0.05, y0 + h * 0.6], [cx + w * 0.05, y0 + h * 0.3], [cx, y0], 8));
    for (let i = 1; i < 5; i++) {
      const y = y0 + (h * i) / 5 + h * 0.08;
      out.push([
        [cx, y],
        [cx - w * 0.3, y - h * 0.14],
      ]);
      out.push([
        [cx, y],
        [cx + w * 0.3, y - h * 0.14],
      ]);
    }
  } else if (kind === "scales") {
    const s = 11 * u;
    for (let row = 0, y = y0 + s * 0.8; y < y1; row++, y += s * 0.75)
      for (let x = x0 + (row % 2 ? s / 2 : 0); x < x1; x += s)
        out.push(arcPts(x, y, s / 2, s / 2, 0.15, Math.PI - 0.15, 7));
  } else if (kind === "feathers") {
    for (let x = x0 - h; x < x1; x += 9 * u)
      out.push([
        [x, y1],
        [x + h * 0.7, y0],
      ]);
  } else if (kind === "hatch") {
    for (let x = x0; x < x1; x += 8 * u)
      out.push([
        [x, y1],
        [x + h * 0.6, y0],
      ]);
  } else {
    const cx = (x0 + x1) / 2;
    for (const k of [-0.18, 0, 0.18])
      out.push(
        cub(
          [cx + k * w, y1 - h * 0.08],
          [cx + k * w * 1.6, y0 + h * 0.65],
          [cx + k * w * 0.4 + w * 0.08, y0 + h * 0.4],
          [cx + k * w * 0.2 + w * 0.02, y0 + h * 0.22 + Math.abs(k) * h * 0.4],
          8,
        ),
      );
  }
  return out;
};

function buildWindow(Wp: number, u: number, seed: number): Win {
  const r = rng(seed),
    b = 0.065,
    Hr = 1.1,
    ri = 1 - b,
    innerTop = Math.PI + Math.acos(0.5 / ri),
    s = (x: number, y: number): Pt => [x * Wp, y * Wp];
  const shape = (pts: Pt[], col: string, gris?: Gris): Shape => {
    const bb = bbox(pts),
      a = r() * Math.PI,
      cx = (bb[0] + bb[2]) / 2,
      cy = (bb[1] + bb[3]) / 2,
      rad = Math.max(bb[2] - bb[0], bb[3] - bb[1]) / 2 + 1;
    const nb = 2 + Math.floor(r() * 3),
      bubbles: [number, number, number][] = Array.from({ length: nb }, () => [
        lerp(bb[0], bb[2], r()),
        lerp(bb[1], bb[3], r()),
        (1.2 + r() * 1.6) * u,
      ]);
    return {
      pts,
      col,
      bubbles,
      gris: gris ? grisaille(gris, bb, u) : undefined,
      grad: [cx - Math.cos(a) * rad, cy - Math.sin(a) * rad, cx + Math.cos(a) * rad, cy + Math.sin(a) * rad],
      len: perim(pts),
      top: bb[1],
    };
  };
  const regions: Region[] = [],
    solder: Pt[] = [],
    panelArea = Hr - b,
    pw = (1 - 2 * b) / 2,
    ph = panelArea / 2,
    aspect = pw / ph;
  const panelBox = (col: number, row: number): number[] => [(b + col * pw) * Wp, row * ph * Wp, pw * Wp, ph * Wp];
  const panels = {
    air: panelBox(0, 0),
    fire: panelBox(1, 0),
    earth: panelBox(0, 1),
    water: panelBox(1, 1),
  };
  const addSolder = (p: Pt) => {
    if (!solder.some((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) < 10 * u)) solder.push(p);
  };
  const addRegion = (key: Key, clip: Pt[], defs: Def[], map: (p: Pt) => Pt, seed: Pt, at: number, dur: number) => {
    const shapes = defs.map((d) => shape(d.pts.map(map), d.col, d.gris)),
      bb = bbox(clip);
    // solder where a corner of a pane meets another came (and is not hidden under a later pane)
    const tol = 2.5 * u;
    defs.forEach((d, i) => {
      const cs = (d.corners ?? (d.poly ? d.pts : [])).map(map);
      for (const c of cs) {
        if (c[0] < bb[0] - tol || c[0] > bb[2] + tol || c[1] < bb[1] - tol || c[1] > bb[3] + tol) continue;
        if (shapes.slice(i + 1).some((sh) => inside(c, sh.pts) && distTo(c, sh.pts) > tol)) continue;
        const onOther = distTo(c, clip) < tol || shapes.some((sh, j) => j !== i && j > 0 && distTo(c, sh.pts) < tol);
        if (onOther) addSolder([clamp(c[0], bb[0], bb[2]), clamp(c[1], bb[1], bb[3])]);
      }
    });
    const reach = Math.max(...clip.map(([x, y]) => Math.hypot(x - seed[0], y - seed[1])));
    regions.push({ key, clip, shapes, seed, reach, at, dur, bb });
  };
  const panelRegion = (key: "earth" | "water" | "air" | "fire", defs: Def[], seedUV: Pt) => {
    const [x, y, w, h] = panels[key] as [number, number, number, number],
      map = ([pu, pv]: Pt): Pt => [x + pu * w, y + pv * h];
    const clip: Pt[] = [
      [x, y],
      [x + w, y],
      [x + w, y + h],
      [x, y + h],
    ];
    clip.forEach(addSolder);
    addRegion(key, clip, defs, map, map(seedUV), FLOOD[key], 34);
  };
  panelRegion("earth", earth(aspect), [0.72, 0.4]);
  panelRegion("water", water(aspect), [0.45, 0.62]);
  panelRegion("air", air(aspect), [0.56, 0.22]);
  panelRegion("fire", fire(), [0.5, 0.86]);

  // the arch zone: spandrels, two small eyes, and the roundel with its sun
  // the inner arch: the left arc (centre (1, 0)) up to the apex, then its mirror down the right
  const leftIn = arcPts(1, 0, ri, ri, Math.PI, innerTop, 24),
    rightMirror = leftIn.map(([x, y]): Pt => [1 - x, y]).reverse();
  const archClip: Pt[] = [...leftIn, ...rightMirror.slice(1)].map(([x, y]) => s(x, y));
  const RC: Pt = [0.5, -0.4],
    RR = 0.25;
  const unit = (p: Pt): Pt => s(p[0], p[1]);
  const rays: Def[] = Array.from({ length: 12 }, (_, i) => {
    const th = (i / 12) * TAU - Math.PI / 2,
      d = (TAU / 12) * 0.46,
      r1 = RR * 0.46,
      r2 = RR * 0.93,
      at = (rr_: number, a: number): Pt => [RC[0] + Math.cos(a) * rr_, RC[1] + Math.sin(a) * rr_];
    const tip = at(r2, th + 0.1);
    return {
      pts: [
        ...cub(at(r1, th - d), at(RR * 0.62, th - d * 0.55), at(RR * 0.8, th + 0.0), tip, 8),
        ...cub(tip, at(RR * 0.78, th + 0.2), at(RR * 0.6, th + d * 0.85), at(r1, th + d), 8).slice(1),
      ],
      col: i % 2 ? J.gold : J.ruby,
      corners: [at(r1, th - d), at(r1, th + d)],
    };
  });
  const archDefs: Def[] = [
    { pts: archClip.map(([x, y]): Pt => [x / Wp, y / Wp]), col: dk(J.violet, 0.2) },
    {
      pts: [
        [0.5, -1],
        [1, -1],
        [1, 0.01],
        [0.5, 0.01],
      ],
      col: dk(J.cobalt, 0.22),
      corners: [[0.5, 0]],
    },
    { pts: ring(0.165, -0.08, 0.055, 0.055, 18), col: J.emerald },
    { pts: ring(0.835, -0.08, 0.055, 0.055, 18), col: J.emerald },
    { pts: ring(RC[0], RC[1], RR, RR, 48), col: J.cobalt },
    ...rays,
    { pts: ring(RC[0], RC[1], RR * 0.46, RR * 0.46, 32), col: lt(J.gold, 0.12) },
    { pts: ring(RC[0], RC[1], RR * 0.24, RR * 0.24, 24), col: lt(J.gold, 0.5) },
  ];
  addRegion("arch", archClip, archDefs, unit, s(RC[0], RC[1]), FLOOD.arch, 26);
  addSolder(s(0.5, RC[1] + RR));

  // the border: small square panes alternating ruby and azure, up both sides, along the bottom and round the arch
  const squares: Pt[][] = [];
  const nSide = 16,
    sh = panelArea / nSide;
  for (let i = 0; i < nSide; i++)
    for (const x of [0, 1 - b])
      squares.push([s(x, i * sh), s(x + b, i * sh), s(x + b, (i + 1) * sh), s(x, (i + 1) * sh)]);
  const nBot = 15,
    bw = 1 / nBot;
  for (let i = 0; i < nBot; i++)
    squares.push([s(i * bw, panelArea), s((i + 1) * bw, panelArea), s((i + 1) * bw, Hr), s(i * bw, Hr)]);
  const nArc = 16,
    outerTop = Math.PI + Math.PI / 3;
  for (let i = 0; i < nArc; i++) {
    const a0 = Math.PI + (i / nArc) * (outerTop - Math.PI),
      a1 = Math.PI + ((i + 1) / nArc) * (outerTop - Math.PI),
      b0 = Math.PI + (i / nArc) * (innerTop - Math.PI),
      b1 = Math.PI + ((i + 1) / nArc) * (innerTop - Math.PI);
    const q: Pt[] = [
      [1 + Math.cos(a0), Math.sin(a0)],
      [1 + Math.cos(a1), Math.sin(a1)],
      [1 + ri * Math.cos(b1), ri * Math.sin(b1)],
      [1 + ri * Math.cos(b0), ri * Math.sin(b0)],
    ];
    squares.push(q.map(unit));
    squares.push(q.map(([x, y]) => unit([1 - x, y])));
  }
  // the chase: the border floods pane by pane round the window while the panels fill
  const order = squares
    .map((q, i) => {
      const [x, y] = [(q[0]![0] + q[2]![0]) / 2, (q[0]![1] + q[2]![1]) / 2];
      return { i, k: Math.atan2(x - Wp / 2, -(y - Wp * 0.1)) };
    })
    .sort((p, q) => p.k - q.k);
  order.forEach(({ i }, n) => {
    const q = squares[i]!,
      c: Pt = [(q[0]![0] + q[2]![0]) / 2, (q[0]![1] + q[2]![1]) / 2],
      col = n % 2 ? J.azure : J.ruby;
    regions.push({
      key: "border",
      clip: q,
      shapes: [shape(q, col)],
      seed: c,
      reach: Math.max(...q.map(([x, y]) => Math.hypot(x - c[0], y - c[1]))),
      at: 124 + (n / order.length) * 146,
      dur: 8,
      bb: bbox(q),
    });
  });

  const outerL = arcPts(1, 0, 1, 1, Math.PI, outerTop, 28);
  const outline: Pt[] = (
    [
      ...outerL,
      ...outerL
        .slice(0, -1)
        .reverse()
        .map(([x, y]): Pt => [1 - x, y]),
      [1, Hr],
      [0, Hr],
    ] as Pt[]
  ).map(unit);
  return {
    Wp,
    b,
    regions,
    outline,
    solder,
    bars: [ph * 0.5 * Wp, ph * 1.5 * Wp],
    top: -Math.sqrt(0.75) * Wp,
    bottom: Hr * Wp,
    panels,
  };
}

// ---------------------------------------------------------------- the light, closed form in F
type Light = {
  k: number;
  sun: number;
  day: number;
  warm: number;
  fire: number;
  moon: number;
  spread: number;
  moonC: Pt;
  band: number;
  dawn: number;
  flash: number;
};

export function make(size: Size, id: string): Film {
  const L = layout(size),
    { W, H, u, cx } = L,
    tall = L.tall;
  // ---- per-size design: the lancet, the sill, the floor
  const Wp = (tall ? 480 : 388) * u,
    win = buildWindow(Wp, u, 48),
    winX = tall ? (W - Wp) / 2 : 600 * u - Wp / 2,
    apexY = tall ? 336 * u : 78 * u,
    winY = apexY - win.top, // the rect's top edge
    winB = winY + win.bottom,
    sillH = 26 * u,
    Y0 = tall ? winB + 120 * u : winB + 46 * u, // where the wall meets the floor
    wcx = winX + Wp / 2;
  const focus: Pt = [wcx, tall ? winY + Wp * 0.2 : H / 2];
  const lw = 9 * u;

  const light = (F: number): Light => {
    const day = clamp((F - 230) / 360),
      up = Math.pow(Math.max(0, Math.sin(Math.PI * day)), 0.6),
      strike = ease.outCubic(prog(F, T.noon, T.noon + 8)),
      // the sun strikes on the hit: the glass overshoots past full in three frames, then settles onto the sun curve
      flash = prog(F, T.noon, T.noon + 3) * (1 - ease.inOutCubic(prog(F, T.noon + 3, T.noon + 34))),
      nightFade = prog(F, 572, 612),
      dawn = 0.32 * ease.inOutCubic(prog(F, 10, 270)),
      sun = up * strike * (1 - nightFade),
      e = Math.max(dawn * (1 - strike), sun) + 0.6 * flash,
      moon = ease.inOutCubic(prog(F, 588, 630));
    const air = win.panels.air,
      water = win.panels.water;
    const drift = prog(F, 600, 719);
    const moonC: Pt = [
      lerp(air[0]! + air[2]! * 0.45, water[0]! + water[2]! * 0.6, drift) + Math.sin(F * 0.05) * 8 * u,
      lerp(air[1]! + air[3]! * 0.5, water[1]! + water[3]! * 0.35, drift) + Math.cos(F * 0.04) * 8 * u,
    ];
    return {
      k: (0.25 + 0.75 * e) * (1 - 0.3 * moon),
      sun,
      day,
      warm: Math.max(0.22 * (1 - prog(F, 285, 350)) * prog(F, 0, 120), 0.42 * prog(F, 455, 568)) * (1 - nightFade),
      fire: window01(F, 500, 510, 582, 614),
      moon,
      spread: ease.inOutCubic(prog(F, 646, 700)),
      moonC,
      band: 0.26 * sun + 0.38 * window01(F, T.noon, T.noon + 4, T.noon + 8, T.noon + 40),
      dawn: prog(F, 0, 64) * (0.45 + 0.55 * prog(F, 0, 270)) * (1 - strike),
      flash,
    };
  };

  // ---- drawing helpers
  const path = (ctx: Ctx, pts: Pt[], close = true) => {
    ctx.beginPath();
    ctx.moveTo(pts[0]![0], pts[0]![1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i]![0], pts[i]![1]);
    if (close) ctx.closePath();
  };
  const fillShape = (ctx: Ctx, s: Shape, detail: boolean) => {
    path(ctx, s.pts);
    ctx.fillStyle = s.col;
    ctx.fill();
    // mouth-blown glass is never even: a seeded streak of about ±8% lightness across the pane
    const g = ctx.createLinearGradient(s.grad[0], s.grad[1], s.grad[2], s.grad[3]);
    g.addColorStop(0, "rgba(255,255,255,0.10)");
    g.addColorStop(0.3, "rgba(0,0,0,0.07)");
    g.addColorStop(0.55, "rgba(255,255,255,0.06)");
    g.addColorStop(1, "rgba(0,0,0,0.10)");
    ctx.fillStyle = g;
    ctx.fill();
    if (!detail) return;
    ctx.save();
    ctx.clip();
    ctx.fillStyle = "rgba(255,255,255,0.32)";
    for (const [x, y, rad] of s.bubbles) {
      ctx.beginPath();
      ctx.arc(x, y, rad, 0, TAU);
      ctx.fill();
    }
    if (s.gris) {
      ctx.strokeStyle = GRIS;
      ctx.lineWidth = 2.2 * u;
      ctx.lineCap = "round";
      for (const line of s.gris) {
        path(ctx, line, false);
        ctx.stroke();
      }
    }
    ctx.restore();
  };
  // one sweep of light down the window per section: first light twice at dawn, the sun in the morning and again in
  // the afternoon, the moon at night. It brightens the glass (by day) and glances off the lead (always).
  const sweep = (F: number) => {
    const L_ = light(F);
    if (F < 278) {
      const t = ((((F - 10) / 130) % 2) + 2) % 2,
        tri = t < 1 ? t : 2 - t; // down, then back up
      return { pos: lerp(0.02, 1.0, tri), a: window01(F, 10, 30, 250, 276) * 0.42, col: "#ffe2b8" };
    }
    if (F < 588)
      return {
        pos: F < 440 ? lerp(0.02, 1.0, prog(F, 282, 438)) : lerp(0.02, 1.0, prog(F, 442, 588)),
        a: 0.44 * clamp(L_.sun * 2.4),
        col: mix("#fff1d0", "#ffb070", prog(F, 450, 570)),
      };
    // the moon passes down the lead and back up, so it never rests on the bottom border (which it glared)
    const mt = prog(F, 588, 719) * 1.5,
      mtri = mt < 1 ? mt : 2 - mt;
    return { pos: lerp(0.02, 0.92, ease.inOutCubic(mtri)), a: prog(F, 588, 604) * 0.4, col: "#cfe0ff" };
  };
  const sweepGrad = (ctx: Ctx) =>
    ctx.createLinearGradient(0.25 * Wp, win.top - 0.04 * Wp, 0.75 * Wp, win.bottom + 0.04 * Wp);
  const lightRegion = (ctx: Ctx, reg: Region, Lt: Light, F: number) => {
    const [x0, y0, x1, y1] = reg.bb as [number, number, number, number],
      w = x1 - x0,
      h = y1 - y0;
    let k = Lt.k;
    if (reg.key === "fire" && Lt.fire > 0) {
      // the last to blaze: it flickers like a hearth as the others go dark
      const flick = 0.5 * Math.sin(F * 0.9) + 0.3 * Math.sin(F * 2.3 + 1) + 0.2 * Math.sin(F * 5.1 + 2);
      k = Math.max(k, (0.3 + 0.7 * Lt.fire) * (1 - 0.16 * Lt.fire * (0.5 + 0.5 * flick)));
    }
    const mw = Lt.moon * (reg.key === "air" ? 1 : Lt.spread),
      mr = Wp * 0.42;
    // transmitted colour: the pane darkened toward 25%, lifted by the sun (and, at night, by the moon)
    if (mw > 0.002) {
      const kin = Math.max(k, 0.26 + 0.44 * mw),
        g = ctx.createRadialGradient(Lt.moonC[0], Lt.moonC[1], 0, Lt.moonC[0], Lt.moonC[1], mr);
      g.addColorStop(0, rgba(C.deep, 1 - kin));
      g.addColorStop(1, rgba(C.deep, 1 - k));
      ctx.fillStyle = g;
    } else ctx.fillStyle = rgba(C.deep, 1 - k);
    ctx.fillRect(x0, y0, w, h);
    ctx.save();
    if (Lt.warm > 0.002) {
      ctx.globalCompositeOperation = "multiply";
      ctx.fillStyle = rgba("#ffae6a", Lt.warm);
      ctx.fillRect(x0, y0, w, h);
    }
    if (reg.key === "fire" && Lt.fire > 0) {
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = rgba("#ff6a24", 0.14 * Lt.fire);
      ctx.fillRect(x0, y0, w, h);
    }
    if (mw > 0.002) {
      ctx.globalCompositeOperation = "screen";
      const g = ctx.createRadialGradient(Lt.moonC[0], Lt.moonC[1], 0, Lt.moonC[0], Lt.moonC[1], mr);
      g.addColorStop(0, rgba("#9cc8ff", 0.3 * mw));
      g.addColorStop(1, rgba("#9cc8ff", 0));
      ctx.fillStyle = g;
      ctx.fillRect(x0, y0, w, h);
    }
    if (Lt.flash > 0.002) {
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = rgba("#fff1d0", 0.34 * Lt.flash);
      ctx.fillRect(x0, y0, w, h);
    }
    if (Lt.band > 0.002) {
      // a soft diagonal band of extra brightness sweeping across the glass as the sun moves
      ctx.globalCompositeOperation = "lighter";
      const g = sweepGrad(ctx),
        pos = sweep(F).pos;
      g.addColorStop(clamp(pos - 0.16), "rgba(255,244,214,0)");
      g.addColorStop(clamp(pos), `rgba(255,244,214,${Lt.band})`);
      g.addColorStop(clamp(pos + 0.16), "rgba(255,244,214,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x0, y0, w, h);
    }
    ctx.restore();
  };
  const floodOf = (reg: Region, F: number) => ease.outCubic(prog(F, reg.at, reg.at + reg.dur));
  const drawGlass = (ctx: Ctx, F: number, Lt: Light, detail: boolean, only?: Key, full = false) => {
    for (const reg of win.regions) {
      if (only && reg.key !== only) continue;
      const fl = full ? 1 : floodOf(reg, F);
      if (fl <= 0) continue;
      ctx.save();
      path(ctx, reg.clip);
      ctx.clip();
      if (fl < 1) {
        ctx.beginPath();
        ctx.arc(reg.seed[0], reg.seed[1], fl * reg.reach, 0, TAU);
        ctx.clip();
      }
      for (const s of reg.shapes) fillShape(ctx, s, detail);
      lightRegion(ctx, reg, Lt, F);
      ctx.restore();
      if (fl < 1 && reg.key !== "border") {
        // the flood front: a bright rim where the colour is still arriving
        ctx.save();
        path(ctx, reg.clip);
        ctx.clip();
        ctx.beginPath();
        ctx.arc(reg.seed[0], reg.seed[1], fl * reg.reach, 0, TAU);
        ctx.strokeStyle = rgba(C.ink, 0.75 * (1 - fl));
        ctx.lineWidth = 5 * u;
        ctx.stroke();
        ctx.restore();
      }
    }
  };

  // ---- the lead: each came draws itself (dash offset) top to bottom; each pane erases the lead it covers
  const yMin = win.top,
    yRange = win.bottom - win.top;
  const drawAt = (y: number) => 6 + 70 * ((y - yMin) / yRange);
  const came = (ctx: Ctx, pts: Pt[], len: number, p: number, hi: string) => {
    if (p <= 0) return;
    path(ctx, pts);
    if (p < 1) {
      ctx.setLineDash([len, len]);
      ctx.lineDashOffset = len * (1 - p);
    } else ctx.setLineDash([]);
    ctx.strokeStyle = C.lead;
    ctx.lineWidth = lw;
    ctx.stroke();
    ctx.strokeStyle = hi;
    ctx.lineWidth = 2 * u;
    ctx.stroke();
  };
  const leadLayer = (lc: Ctx, F: number, hi: string) => {
    lc.lineJoin = "round";
    lc.lineCap = "butt";
    for (const reg of win.regions) {
      if (reg.key === "border") continue;
      lc.save();
      path(lc, reg.clip);
      lc.clip();
      for (const s of reg.shapes) {
        lc.save();
        lc.globalCompositeOperation = "destination-out";
        path(lc, s.pts);
        lc.fillStyle = "#000";
        lc.fill();
        lc.restore();
        came(lc, s.pts, s.len, prog(F, drawAt(s.top), drawAt(s.top) + 26), hi);
      }
      lc.restore();
    }
    for (const reg of win.regions) {
      const len = perim(reg.clip);
      came(lc, reg.clip, len, prog(F, drawAt(reg.bb[1]!), drawAt(reg.bb[1]!) + 26), hi);
    }
    came(lc, win.outline, perim(win.outline), prog(F, 2, 60), hi);
    lc.setLineDash([]);
    // a sheen on the metal: first light glancing down the fresh lead at dawn, the moon catching it at night
    const { pos, a, col } = sweep(F);
    if (a > 0.002) {
      const g = sweepGrad(lc);
      g.addColorStop(clamp(pos - 0.12), rgba(col, 0));
      g.addColorStop(clamp(pos), rgba(col, a));
      g.addColorStop(clamp(pos + 0.12), rgba(col, 0));
      lc.save();
      lc.globalCompositeOperation = "source-atop";
      lc.fillStyle = g;
      lc.fillRect(-Wp, win.top - Wp, 3 * Wp, win.bottom - win.top + 2 * Wp);
      lc.restore();
    }
  };
  const glint = (ctx: Ctx, F: number, c: Pt, r: number, at: number, col: string) => {
    const f = F - at;
    if (f < 0 || f > 26) return;
    const k = spring(f / FPS, { freq: 3, damp: 0.5 }),
      a = 1 - prog(f, 8, 26);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = rgba(col, 0.85 * a);
    for (let i = 0; i < 8; i++) {
      const th = (i / 8) * TAU + 0.2,
        len = r * (i % 2 ? 0.55 : 1) * k,
        wd = 7 * u * (i % 2 ? 0.7 : 1);
      ctx.save();
      ctx.translate(c[0], c[1]);
      ctx.rotate(th);
      ctx.beginPath();
      ctx.moveTo(0, -wd);
      ctx.lineTo(len, 0);
      ctx.lineTo(0, wd);
      ctx.lineTo(-wd, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.beginPath();
    ctx.arc(c[0], c[1], r * 0.35 + r * 0.8 * ease.outCubic(prog(f, 0, 24)), 0, TAU);
    ctx.strokeStyle = rgba(col, 0.6 * a);
    ctx.lineWidth = 4 * u;
    ctx.stroke();
    ctx.restore();
  };
  const solderAndBars = (ctx: Ctx, F: number, hi: string) => {
    for (const p of win.solder) {
      const k = spring((F - drawAt(p[1]) - 22) / FPS, { freq: 3.2, damp: 0.45 });
      if (k <= 0) continue;
      ctx.beginPath();
      ctx.arc(p[0], p[1], 7.5 * u * k, 0, TAU);
      ctx.fillStyle = C.lead;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(p[0] - 2 * u, p[1] - 2 * u, 2.4 * u * k, 0, TAU);
      ctx.fillStyle = hi;
      ctx.fill();
    }
    // the iron saddle bars, last
    win.bars.forEach((y, i) => {
      const p = ease.inOutCubic(prog(F, 92 + i * 6, 114 + i * 6));
      if (p <= 0) return;
      const x0 = -0.05 * Wp,
        x1 = lerp(x0, 1.05 * Wp, p);
      ctx.fillStyle = C.deep;
      ctx.fillRect(x0, y - 6 * u, x1 - x0, 12 * u);
      ctx.fillStyle = mix(C.deep, C.ink, 0.22);
      ctx.fillRect(x0, y - 5 * u, x1 - x0, 2 * u);
    });
  };

  // ---- scratch surfaces (cleared before every use: nothing outlives the frame)
  const scratch = (env: Env, key: string, w: number, h: number): Layer => {
    const k = `stainedGlass:${id}:${key}:${w}x${h}`;
    let S = env.cache.get(k) as Layer | undefined;
    if (!S) {
      S = env.canvas(w, h);
      env.cache.set(k, S);
    }
    S.ctx.setTransform(1, 0, 0, 1, 0, 0);
    S.ctx.globalAlpha = 1;
    S.ctx.globalCompositeOperation = "source-over";
    S.ctx.clearRect(0, 0, w, h);
    return S;
  };

  // ---- the floor patches: the panes drawn again, small, then projected, stretched, sheared and rippled
  const PS = 1 / 9,
    padW = 0.06 * Wp,
    srcW = Math.ceil((Wp + 2 * padW) * PS),
    srcH = Math.ceil((win.bottom - win.top + 2 * padW) * PS);
  const patchSource = (env: Env, key: string, F: number, Lt: Light, only?: Key, tint?: string) => {
    const S = scratch(env, key, srcW, srcH),
      c = S.ctx;
    c.fillStyle = "#000";
    c.fillRect(0, 0, srcW, srcH);
    c.setTransform(PS, 0, 0, PS, padW * PS, (padW - win.top) * PS);
    // at dawn the empty lancet throws pale sky, and the panes arrive on the floor as they flood
    if (!only) dawnSky(c, F);
    drawGlass(c, F, { ...Lt, k: 1, band: 0, moon: 0, fire: 0, flash: 0 }, false, only, !!only);
    // the lead throws no light (it arrives on the floor as it is drawn)
    c.globalAlpha = only ? 1 : prog(F, 30, 110);
    c.strokeStyle = "#000";
    c.lineWidth = lw * 1.2;
    c.lineJoin = "round";
    for (const reg of win.regions) {
      path(c, reg.clip);
      c.stroke();
      if (reg.key !== "border")
        for (const s of reg.shapes.slice(1)) {
          path(c, s.pts);
          c.stroke();
        }
    }
    for (const y of win.bars) {
      c.fillStyle = "#000";
      c.fillRect(-0.05 * Wp, y - 6 * u, 1.1 * Wp, 12 * u);
    }
    c.globalAlpha = 1;
    if (tint) {
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.globalCompositeOperation = "multiply";
      c.fillStyle = tint;
      c.fillRect(0, 0, srcW, srcH);
      c.globalCompositeOperation = "source-over";
    }
    return S;
  };
  type PatchGeo = { x0: number; y0: number; len: number; dx: number; w0: number; w1: number };
  const drawPatch = (ctx: Ctx, S: Layer, alpha: number, g: PatchGeo, F: number) => {
    const n = 56,
      sw = S.canvas.width,
      sh = S.canvas.height;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, Y0, W, H - Y0);
    ctx.clip();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = alpha;
    ctx.imageSmoothingEnabled = true;
    for (let i = 0; i < n; i++) {
      const t0 = i / n,
        t1 = (i + 1) / n,
        tm = (t0 + t1) / 2;
      // t = 0 is the bottom of the window (lands by the wall), t = 1 its apex (thrown furthest)
      const w = lerp(g.w0, g.w1, tm),
        ripple = (Math.sin(tm * 11 + F * 0.2 + 1.7) * 7 + Math.sin(tm * 27 - F * 0.14) * 3) * u * (0.4 + tm),
        x = g.x0 + g.dx * tm + ripple,
        ya = g.y0 + g.len * t0,
        yb = g.y0 + g.len * t1;
      ctx.drawImage(S.canvas, 0, sh * (1 - t1), sw, sh / n, x - w / 2, ya, w, yb - ya + 0.6);
    }
    ctx.restore();
  };
  // the patch geometry follows the sun's path from first light (it creeps from frame 0, before the sun strikes)
  const sunGeo = (F: number): PatchGeo => {
    const d = clamp((F + 30) / 620),
      low = 1 - Math.pow(Math.max(0, Math.sin(Math.PI * d)), 0.6),
      full = Wp * (1 + (2 * padW) / Wp);
    return tall
      ? {
          x0: wcx + lerp(40, -40, d) * u,
          y0: Y0 + 8 * u,
          len: lerp(300, 640, low) * u,
          dx: lerp(200, -260, d) * u,
          w0: full * 1.02,
          w1: full * lerp(1.45, 1.7, low),
        }
      : {
          x0: wcx + lerp(-40, 360, d) * u,
          y0: Y0 + 6 * u,
          len: lerp(130, 186, low) * u,
          dx: (lerp(260, 420, d) + 560 * low) * u,
          w0: full * 0.95,
          w1: full * lerp(1.15, 1.35, low),
        };
  };
  // the moon's patch creeps too, the other way
  const moonGeo = (F: number): PatchGeo => {
    const m = prog(F, 570, N - 1);
    return tall
      ? {
          x0: wcx + lerp(40, -60, m) * u,
          y0: Y0 + 8 * u,
          len: lerp(380, 540, m) * u,
          dx: lerp(40, -200, m) * u,
          w0: Wp * 1.1,
          w1: Wp * 1.6,
        }
      : {
          x0: wcx + lerp(-20, 240, m) * u,
          y0: Y0 + 6 * u,
          len: 140 * u,
          dx: lerp(260, 520, m) * u,
          w0: Wp,
          w1: Wp * 1.2,
        };
  };

  // ---- the room: an ashlar wall, a splayed stone reveal, the sill, a slab floor in perspective
  const wallRows = (() => {
    const r = rng(4807),
      rows: { y: number; joints: number[]; tones: number[] }[] = [],
      ch = 62 * u;
    for (let y = Y0; y > -ch; y -= ch) {
      const joints: number[] = [],
        tones: number[] = [];
      let x = -r() * 160 * u;
      while (x < W) {
        joints.push(x);
        tones.push(r());
        x += (120 + r() * 90) * u;
      }
      rows.push({ y, joints, tones });
    }
    return { rows, ch };
  })();
  const room = (ctx: Ctx, Lt: Light) => {
    ctx.fillStyle = C.ground;
    ctx.fillRect(0, 0, W, Y0);
    const { rows, ch } = wallRows;
    for (const row of rows) {
      row.joints.forEach((x, i) => {
        const tone = row.tones[i]!;
        ctx.fillStyle = tone < 0.5 ? `rgba(255,240,220,${0.012 + tone * 0.02})` : `rgba(0,0,0,${(tone - 0.5) * 0.12})`;
        ctx.fillRect(x, row.y - ch, (row.joints[i + 1] ?? W) - x, ch);
      });
      ctx.fillStyle = C.line;
      ctx.fillRect(0, row.y - ch - u, W, 2 * u);
      for (const x of row.joints) ctx.fillRect(x - u, row.y - ch, 2 * u, ch);
    }
    // the day on the wall: a faint warm spill around the opening
    if (Lt.sun > 0.01 || Lt.flash > 0.01) {
      const g = ctx.createRadialGradient(wcx, winY, 0, wcx, winY, Wp * 1.4);
      g.addColorStop(0, rgba(C.accent, 0.1 * Lt.sun + 0.16 * Lt.flash));
      g.addColorStop(1, rgba(C.accent, 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, Y0);
    }
    // the floor
    const fg = ctx.createLinearGradient(0, Y0, 0, H);
    fg.addColorStop(0, mix(C.floor, C.ground, 0.35));
    fg.addColorStop(1, mix(C.floor, C.ground, 0.62));
    ctx.fillStyle = fg;
    ctx.fillRect(0, Y0, W, H - Y0);
    const vp: Pt = [wcx, Y0 - (tall ? 1100 : 900) * u];
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, Y0, W, H - Y0);
    ctx.clip();
    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.lineWidth = 2 * u;
    const step = (tall ? 190 : 230) * u;
    for (let x = wcx - step * 12; x < W + step * 12; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, H);
      ctx.lineTo(vp[0] + (x - vp[0]) * ((Y0 - vp[1]) / (H - vp[1])), Y0);
      ctx.stroke();
    }
    for (const d of tall ? [44, 104, 180, 276, 396, 540] : [28, 66, 116, 180]) {
      ctx.beginPath();
      ctx.moveTo(0, Y0 + d * u);
      ctx.lineTo(W, Y0 + d * u);
      ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = C.stone;
    ctx.fillRect(0, Y0 - 5 * u, W, 7 * u);
    ctx.fillStyle = mix(C.stone, C.ink, 0.12);
    ctx.fillRect(0, Y0 - 5 * u, W, 2 * u);
  };
  const reveal = (ctx: Ctx) => {
    ctx.save();
    ctx.translate(winX, winY);
    path(ctx, win.outline);
    ctx.lineJoin = "round";
    ctx.strokeStyle = C.stone;
    ctx.lineWidth = 46 * u;
    ctx.stroke();
    ctx.restore();
    // the sill
    const sx = winX - 40 * u,
      sw = Wp + 80 * u;
    ctx.fillStyle = C.stone;
    ctx.fillRect(sx, winB + 4 * u, sw, sillH);
    ctx.fillStyle = mix(C.stone, C.ink, 0.16);
    ctx.fillRect(sx, winB + 4 * u, sw, 3 * u);
    ctx.fillStyle = C.deep;
    ctx.fillRect(sx, winB + 4 * u + sillH, sw, 4 * u);
  };
  const dawnSky = (ctx: Ctx, F: number) => {
    const g = ctx.createLinearGradient(0, win.top, 0, win.bottom),
      t = prog(F, 0, 260);
    g.addColorStop(0, mix("#6d7fa0", "#d8c7b8", t));
    g.addColorStop(0.6, mix("#8a8aa0", "#f0cfa8", t));
    g.addColorStop(1, mix("#9a8c8c", "#f6dcb4", t));
    path(ctx, win.outline);
    ctx.fillStyle = g;
    ctx.fill();
    // first light: the sky in the opening pales from the horizon up
    const up = prog(F, 0, 64);
    if (up < 1) {
      const edge = lerp(win.bottom + 20 * u, win.top - 140 * u, up),
        d = ctx.createLinearGradient(0, edge - 120 * u, 0, edge);
      d.addColorStop(0, rgba(C.deep, 0.9));
      d.addColorStop(1, rgba(C.deep, 0));
      ctx.fillStyle = d;
      ctx.fill();
    }
  };

  // ---- labels: the time chip, the element names, the title
  const PHASES: [number, string][] = [
    [0, "dawn"],
    [T.noon, "noon"],
    [T.dusk, "dusk"],
    [T.night, "night"],
  ];
  // the clock jumps with the phase word, so 'noon' never reads 07:50
  const CLOCK: [number, number][] = [
    [0, 5 * 60 + 12],
    [279, 7 * 60 + 10],
    [280, 11 * 60 + 20],
    [410, 12 * 60],
    [439, 13 * 60 + 40],
    [440, 17 * 60 + 30],
    [579, 19 * 60 + 50],
    [580, 21 * 60 + 10],
    [720, 23 * 60 + 30],
  ];
  const clock = (F: number) => {
    let i = 0;
    while (i < CLOCK.length - 2 && F > CLOCK[i + 1]![0]) i++;
    const [f0, m0] = CLOCK[i]!,
      [f1, m1] = CLOCK[i + 1]!,
      m = Math.floor(lerp(m0, m1, clamp((F - f0) / (f1 - f0))));
    return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  };
  const chip = (ctx: Ctx, F: number, Lt: Light) => {
    const pop = spring((F - 4) / FPS, { freq: 2.6, damp: 0.55 }),
      word = { size: 40 * u, family: F_.mono, weight: 500, track: 0.02 },
      small = { size: 30 * u, family: F_.mono, weight: 500, track: 0.02 },
      h = 76 * u,
      w = 384 * u,
      x = tall ? cx - w / 2 : 1026 * u,
      y = tall ? 224 * u : 88 * u;
    if (pop <= 0) return;
    ctx.save();
    ctx.globalAlpha = clamp(pop * 1.5);
    ctx.translate(x + w / 2, y + h / 2);
    ctx.scale(0.7 + 0.3 * pop, 0.7 + 0.3 * pop);
    ctx.translate(-(x + w / 2), -(y + h / 2));
    rr(ctx, x, y, w, h, h / 2);
    ctx.fillStyle = C.surface;
    ctx.fill();
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 2 * u;
    ctx.stroke();
    // a little sun dial: the sun (or the moon) on its arc
    const dx = x + 46 * u,
      dy = y + h / 2 + 11 * u,
      dr = 20 * u,
      night = prog(F, T.night, T.night + 20);
    ctx.beginPath();
    ctx.arc(dx, dy, dr, Math.PI, TAU);
    ctx.strokeStyle = C.muted;
    ctx.lineWidth = 2.5 * u;
    ctx.stroke();
    const ang = Math.PI + Math.PI * (night > 0 ? prog(F, T.night, N) : clamp((F - 140) / 440)),
      px = dx + Math.cos(ang) * dr,
      py = dy + Math.sin(ang) * dr;
    ctx.beginPath();
    ctx.arc(px, py, 7 * u, 0, TAU);
    ctx.fillStyle = night > 0.5 ? "#bcd6ff" : Lt.sun > 0.05 ? C.accent : mix(C.accent, C.muted, 0.5);
    ctx.fill();
    // the phase word rolls over at each turn of the day
    let pi = 0;
    while (pi < PHASES.length - 1 && F >= PHASES[pi + 1]![0]) pi++;
    const since = F - PHASES[pi]![0],
      roll = pi > 0 ? ease.outCubic(prog(since, 0, 14)) : 1;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + 80 * u, y + 4 * u, 140 * u, h - 8 * u);
    ctx.clip();
    const base = y + h / 2 + 14 * u;
    text(ctx, PHASES[pi]![1], x + 84 * u, base + (1 - roll) * 44 * u, { ...word, color: C.ink, alpha: roll });
    if (pi > 0 && roll < 1)
      text(ctx, PHASES[pi - 1]![1], x + 84 * u, base - roll * 44 * u, { ...word, color: C.ink, alpha: 1 - roll });
    ctx.restore();
    text(ctx, clock(F), x + w - 30 * u, base - 2 * u, { ...small, color: C.muted, align: "right" });
    ctx.restore();
  };
  const NAMES: { key: "earth" | "water" | "air" | "fire"; col: string }[] = [
    { key: "earth", col: J.emerald },
    { key: "water", col: J.cobalt },
    { key: "air", col: J.azure },
    { key: "fire", col: J.ruby },
  ];
  const nameStyle = { size: (tall ? 52 : 60) * u, family: F_.italic, color: C.ink };
  const name = (ctx: Ctx, F: number, key: string, col: string, x: number, y: number, dim: number) => {
    const at = FLOOD[key as keyof typeof FLOOD] + 6,
      k = spring((F - at) / FPS, { freq: 2.4, damp: 0.62 });
    if (k <= 0) return 0;
    const sw = (tall ? 18 : 22) * u,
      gap = 12 * u;
    ctx.save();
    ctx.globalAlpha = clamp(k) * dim;
    ctx.fillStyle = col;
    const s = sw * clamp(k, 0, 1.2);
    ctx.fillRect(x + (sw - s) / 2, y - nameStyle.size * 0.32 - s / 2, s, s);
    ctx.strokeStyle = C.lead;
    ctx.lineWidth = 3 * u;
    ctx.strokeRect(x + (sw - s) / 2, y - nameStyle.size * 0.32 - s / 2, s, s);
    letters(
      ctx,
      key,
      x + sw + gap,
      y,
      nameStyle,
      (i) => spring((F - at - i * 2) / FPS, { freq: 2.6, damp: 0.7 }),
      "rise",
    );
    ctx.restore();
    return sw + gap + measure(ctx, key, nameStyle);
  };
  const names = (ctx: Ctx, F: number) => {
    const dim = 1 - (tall ? 1 : 0.55) * prog(F, T.end - 10, T.end + 10); // the vertical title takes their place
    if (tall) {
      // one row on the sill, in the order the panels fill
      const gap = 30 * u,
        widths = NAMES.map((n) => (18 + 12) * u + measure(ctx, n.key, nameStyle)),
        total = widths.reduce((s, w) => s + w, 0) + gap * 3;
      let x = cx - total / 2;
      const y = winB + sillH + 64 * u;
      NAMES.forEach((n, i) => {
        name(ctx, F, n.key, n.col, x, y, dim);
        x += widths[i]! + gap;
      });
    } else {
      // a column beside the loupe, in the order the panels fill; the element in the loupe reads at full strength
      const focus = viewAt(F).key;
      NAMES.forEach((n, i) => {
        const on = focus === n.key || F >= T.end ? 1 : 0.5;
        name(ctx, F, n.key, n.col, 1566 * u, (304 + i * 92) * u, dim * on);
      });
    }
  };
  const title = (ctx: Ctx, F: number) => {
    const f = F - T.end;
    if (f < 0) return;
    const big = {
        size: (tall ? 112 : 124) * u,
        family: F_.serif,
        color: C.ink,
        align: (tall ? "center" : "left") as CanvasTextAlign,
        track: -0.01,
      },
      x = tall ? cx : 1030 * u,
      y = tall ? 1515 * u : 800 * u,
      drift = (1 - ease.outCubic(prog(f, 0, 50))) * 16 * u;
    ctx.save();
    ctx.translate(0, drift);
    letters(ctx, "Four Elements", x, y, big, (i) => spring((f - 2 - i * 1.6) / FPS, { freq: 2.2, damp: 0.72 }), "rise");
    text(ctx, "a window, one day", tall ? cx : x + 4 * u, y + (tall ? 66 : 74) * u, {
      size: (tall ? 44 : 48) * u,
      family: F_.italic,
      color: C.muted,
      align: tall ? "center" : "left",
      alpha: prog(f, 18, 34),
    });
    ctx.restore();
  };

  // three punches in the light: the sun strikes the roundel, it flares again at noon, the fire catches at dusk
  const flares = (ctx: Ctx, F: number) => {
    glint(ctx, F, [Wp / 2, -0.4 * Wp], 0.42 * Wp, T.noon, "#fff3d6");
    glint(ctx, F, [Wp / 2, -0.4 * Wp], 0.34 * Wp, 400, "#fff3d6");
    const fp = win.panels.fire;
    glint(ctx, F, [fp[0]! + fp[2]! / 2, fp[1]! + fp[3]! * 0.55], 0.3 * Wp, 500, "#ffb070");
  };

  // ---- the landscape loupe: a close-up of the window in the right half that cuts, on the beat, to the part being
  // made (the roundel while the lead draws, each panel as it floods, the sun at noon, the fire at dusk, the air
  // under the moon). It redraws the same glass and lead at a larger scale; nothing is copied from the frame.
  const LX = 1040 * u,
    LY = 196 * u,
    LS = 460 * u;
  const roundelBox = [Wp / 2 - 0.3 * Wp, -0.4 * Wp - 0.3 * Wp, 0.6 * Wp, 0.6 * Wp];
  const VIEWS: [number, Key | "roundel"][] = [
    [0, "roundel"],
    [60, "fire"],
    [120, "earth"],
    [160, "water"],
    [200, "air"],
    [240, "fire"],
    [260, "roundel"],
    [360, "water"],
    [400, "roundel"],
    [440, "earth"],
    [500, "fire"],
    [580, "air"],
    [N, "air"],
  ];
  const viewAt = (F: number) => {
    let i = 0;
    while (i < VIEWS.length - 2 && F >= VIEWS[i + 1]![0]) i++;
    const [f0, key] = VIEWS[i]!,
      f1 = VIEWS[i + 1]![0],
      box = key === "roundel" ? roundelBox : win.panels[key as "earth" | "water" | "air" | "fire"];
    return { key, box: box as number[], push: 1 + 0.07 * ease.inOutCubic(prog(F, f0, f1)) };
  };
  const loupe = (ctx: Ctx, env: Env, F: number, Lt: Light, hi: string) => {
    const sc = env.scale,
      { box, push } = viewAt(F),
      [bx, by, bw, bh] = box as [number, number, number, number],
      m = (LS / (Math.max(bw, bh) * 1.1)) * push,
      ox = LX + LS / 2 - m * (bx + bw / 2),
      oy = LY + LS / 2 - m * (by + bh / 2),
      pop = spring((F - 8) / FPS, { freq: 2.4, damp: 0.6 });
    if (pop <= 0) return;
    ctx.save();
    ctx.globalAlpha = clamp(pop * 1.4);
    // the stone mount
    rr(ctx, LX - 14 * u, LY - 14 * u, LS + 28 * u, LS + 28 * u, 28 * u);
    ctx.fillStyle = C.stone;
    ctx.fill();
    rr(ctx, LX, LY, LS, LS, 18 * u);
    ctx.clip();
    ctx.fillStyle = C.ground;
    ctx.fillRect(LX, LY, LS, LS);
    ctx.setTransform(sc * m, 0, 0, sc * m, sc * ox, sc * oy);
    dawnSky(ctx, F);
    drawGlass(ctx, F, Lt, true);
    const LL = scratch(env, "loupeLead", Math.round(LS * sc), Math.round(LS * sc));
    LL.ctx.setTransform(sc * m, 0, 0, sc * m, sc * (ox - LX), sc * (oy - LY));
    leadLayer(LL.ctx, F, hi);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(LL.canvas, Math.round(sc * LX), Math.round(sc * LY));
    ctx.setTransform(sc * m, 0, 0, sc * m, sc * ox, sc * oy);
    solderAndBars(ctx, F, hi);
    flares(ctx, F);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = clamp(pop * 1.4);
    rr(ctx, LX, LY, LS, LS, 18 * u);
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 3 * u;
    ctx.stroke();
    ctx.restore();
  };

  // ---- the frame
  const paint = (ctx: Ctx, env: Env, F: number) => {
    F = clamp(F, 0, N - 1);
    const Lt = light(F),
      sc = env.scale,
      z = 1 + 0.03 * (F / (N - 1)) + 0.05 * prog(F, 560, N - 1), // a slow push-in that leans in for the night
      world = [sc * z, 0, 0, sc * z, sc * (focus[0] - focus[0] * z), sc * (focus[1] - focus[1] * z)] as const;
    ctx.setTransform(...world);
    room(ctx, Lt);
    // light on the floor: the sun's patches through the day, the moon's through the air panel at night
    if (Lt.sun > 0.004 || Lt.moon > 0.004 || Lt.dawn > 0.004) {
      ctx.setTransform(...world);
      if (Lt.sun > 0.004 || Lt.dawn > 0.004) {
        const red = prog(F, 470, 575),
          tint = red > 0 ? mix("#ffffff", "#ff7a4a", red) : undefined;
        drawPatch(
          ctx,
          patchSource(env, "sun", F, Lt, undefined, tint),
          0.66 * Lt.sun + 0.26 * Lt.dawn + 0.3 * Lt.flash,
          sunGeo(F),
          F,
        );
      }
      if (Lt.moon > 0.004)
        drawPatch(ctx, patchSource(env, "moon", F, Lt, "air", "#8fb4ff"), 0.4 * Lt.moon, moonGeo(F), F);
      ctx.setTransform(...world);
    }
    if (Lt.moon > 0) {
      ctx.fillStyle = rgba(C.deep, 0.35 * Lt.moon);
      ctx.fillRect(0, Y0, W, H - Y0);
    }
    reveal(ctx);
    ctx.save();
    ctx.translate(winX, winY);
    dawnSky(ctx, F);
    drawGlass(ctx, F, Lt, true);
    ctx.restore();
    // the lead, drawn on its own layer so each pane can erase the came it covers
    const hi = Lt.moon > 0 ? mix(HILITE, "#b8cdf0", 0.55 * Lt.moon) : HILITE;
    const LL = scratch(env, "lead", Math.round(W * sc), Math.round(H * sc));
    LL.ctx.setTransform(world[0], 0, 0, world[3], world[4] + sc * z * winX, world[5] + sc * z * winY);
    leadLayer(LL.ctx, F, hi);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(LL.canvas, 0, 0);
    ctx.setTransform(...world);
    ctx.save();
    ctx.translate(winX, winY);
    solderAndBars(ctx, F, hi);
    // two punches in the long light: the roundel's sun flares at noon, the fire panel catches at dusk
    flares(ctx, F);
    ctx.restore();
    if (tall) names(ctx, F);
    // the read layer: sharp, outside the push-in
    ctx.setTransform(sc, 0, 0, sc, 0, 0);
    if (!tall) {
      loupe(ctx, env, F, Lt, hi);
      names(ctx, F);
    }
    chip(ctx, F, Lt);
    title(ctx, F);
  };

  // a cold open: one beat of the finished window at noon, flaring on the hit, then a cut on beat 1 to the dark
  // lancet and the build (the dawn section runs from frame 20; the build itself is unchanged)
  const TEASE = 20;
  const cuts = [0, TEASE, T.glaze, T.noon, T.dusk, T.night, T.end, N],
    ids = ["tease", "dawn", "glaze", "noon", "dusk", "night", "end"];
  const shots: Shot[] = ids.map((sid, i) => ({
    id: sid,
    start: cuts[i]!,
    end: cuts[i + 1]!,
    draw: (ctx, local, env) => paint(ctx, env, i === 0 ? 400 + local : cuts[i]! + local),
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
      hits: [0, T.noon, 400, 500],
      whooshes: [T.dusk, T.night],
      ticks: [20, 40, 60, 80, 100, FLOOD.earth, FLOOD.water, FLOOD.air, FLOOD.fire, FLOOD.arch],
      sign: T.end,
      gain: 0.78,
    }),
  };
}

export const stainedGlassVertical = make("vertical", "stainedGlassVertical");
export const stainedGlass = make("landscape", "stainedGlass");
