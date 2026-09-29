// STUDY 39 · ROUTE MAP (36 s, 30 fps, 120 bpm). An animated travel map in the adventure-film manner: the Arctic
// tern's year, pole to pole and back, as a dotted route that draws itself across a hand-authored Atlantic while a
// camera follows the bird, pins drop and a distance counter ticks to 70,900 km. Palette "atlas" of the neutral pack.
// Brief: series/studies/briefs/route-map.json · prompt: series/studies/prompts/route-map.prompt.md
// Figures: Egevang et al., PNAS 2010 (https://www.pnas.org/doi/10.1073/pnas.0909493107). Routes are simplified.
//
// The whole film is one continuous function paint(F) of a (fractional) frame F: the route position, the camera
// (which trails the bird by evaluating the route a few frames earlier) and every pin are closed-form, so any frame
// paints on its own. The shots only name the sections on the timeline.
import PACK from "../../../brand/packs/studio/pack.json";
import { rng, type Ctx, type Env, type Layer } from "../core";
import type { Film, Shot } from "../film";
import { clamp, ease, lerp, prog } from "../kit/motion";
import { usePack } from "../kit/pack";
import { beatScore } from "../kit/score";
import { layout, type Size } from "../kit/sizes";
import { measure, text, type TextOpts } from "../kit/type";
import { rr } from "../kit/ui";

const P = usePack(PACK),
  C = P.palette("atlas"),
  F_ = P.face;
const FPS = 30,
  BPM = 120,
  N = 1080; // a beat is 15 frames, a bar 60
// the timeline, in frames (every cut on a beat)
const T = { stop: 120, fork: 240, south: 420, home: 600, total: 810, end: 960 };

// ---------------------------------------------------------------- the map: lon/lat, equirectangular
type LL = [number, number]; // [longitude, latitude] in degrees
// the paper sheet (a little wider than the Atlantic so a following camera never shows its edge)
const SHEET = { w: -104, e: 62, s: -90, n: 90 };

// HAND-AUTHORED low-poly coastlines, stylised on purpose (rounded with quadratic curves when drawn)
const GREENLAND: LL[] = [
  [-73, 78],
  [-68, 80.5],
  [-58, 82],
  [-45, 83.2],
  [-32, 83.5],
  [-22, 82.5],
  [-17, 81],
  [-12, 80.8],
  [-18, 78],
  [-19, 76],
  [-18.5, 74.5],
  [-21, 72.5],
  [-22, 70.5],
  [-25, 69],
  [-30, 68.3],
  [-34, 66],
  [-38, 65.5],
  [-40, 63.5],
  [-43, 60],
  [-46, 60.8],
  [-48.5, 62],
  [-50.5, 64.5],
  [-52, 66.5],
  [-53.5, 68.5],
  [-51, 70.5],
  [-54, 71.5],
  [-55, 73.5],
  [-58, 75.5],
  [-62, 76.2],
  [-67, 76.5],
  [-71, 77.2],
];
const ICELAND: LL[] = [
  [-22.6, 63.85],
  [-21.2, 63.85],
  [-20, 63.55],
  [-18.8, 63.4],
  [-17.5, 63.75],
  [-16.2, 64.05],
  [-15, 64.3],
  [-14, 64.75],
  [-13.6, 65.2],
  [-14.4, 65.75],
  [-14.9, 66.3],
  [-15.9, 66.45],
  [-16.8, 66.15],
  [-17.8, 66.05],
  [-18.8, 66.2],
  [-19.9, 65.95],
  [-20.6, 65.6],
  [-21.4, 65.9],
  [-22.4, 66.45],
  [-23.4, 66.35],
  [-24.1, 65.95],
  [-23.1, 65.5],
  [-24.3, 65.2],
  [-23.3, 64.9],
  [-22.2, 64.65],
  [-22.9, 64.15],
];
const NORTH_AMERICA: LL[] = [
  [-130, 70],
  [-112, 68.6],
  [-98, 68.4],
  [-90, 68.8],
  [-83, 67.4],
  [-87, 65.4],
  [-93.5, 61.2],
  [-94.5, 58.8],
  [-89, 56.2],
  [-82.5, 55],
  [-80.5, 52.5],
  [-78.5, 55.5],
  [-77.2, 59],
  [-78, 62.3],
  [-72.5, 62],
  [-69.5, 59.2],
  [-64.7, 60.3],
  [-61.8, 56.6],
  [-57.6, 54.3],
  [-55.8, 52],
  [-60, 50.2],
  [-66.5, 49.2],
  [-64.3, 48.6],
  [-64.8, 47],
  [-61, 45.6],
  [-65.7, 43.6],
  [-70.2, 43.6],
  [-70, 41.6],
  [-74, 40.4],
  [-75.9, 37.5],
  [-76, 35.5],
  [-79, 33.2],
  [-81, 31.5],
  [-80, 26],
  [-81, 25.1],
  [-82.8, 28],
  [-84, 30],
  [-89.5, 30.2],
  [-94, 29.6],
  [-97, 27.8],
  [-97.4, 21.5],
  [-95.5, 18.6],
  [-91.5, 18.5],
  [-90.5, 21],
  [-87.3, 21.5],
  [-88.3, 16],
  [-83.3, 15],
  [-83.6, 11.5],
  [-81.7, 9],
  [-77.3, 8.5],
  [-80.5, 7.2],
  [-85.8, 10],
  [-91.4, 14],
  [-98, 16.2],
  [-106, 20.5],
  [-112, 27],
  [-124, 40],
  [-130, 55],
];
const BAFFIN: LL[] = [
  [-80, 73.6],
  [-73, 71.8],
  [-68, 70.2],
  [-62.5, 66.8],
  [-64.5, 64.8],
  [-65.5, 62.9],
  [-68, 63.2],
  [-72, 64.8],
  [-74.5, 65.4],
  [-73, 67],
  [-77, 68.8],
  [-82, 69.5],
  [-86, 70.2],
  [-89.5, 71.3],
  [-85, 73.5],
];
const ARCTIC_ISLES: LL[] = [
  [-120, 77.5],
  [-110, 78.5],
  [-96, 80.5],
  [-85, 82.3],
  [-72, 83],
  [-62, 82.4],
  [-66, 81],
  [-71, 79.3],
  [-75, 78.5],
  [-78, 76.4],
  [-82, 75.6],
  [-90, 76.2],
  [-97, 75],
  [-105, 75.5],
  [-115, 74.5],
  [-122, 75.8],
];
const NEWFOUNDLAND: LL[] = [
  [-59.4, 47.6],
  [-56, 51.6],
  [-55.3, 49.8],
  [-53.5, 49.3],
  [-52.7, 47.6],
  [-53.6, 46.6],
  [-55.8, 47],
  [-57.5, 47.5],
];
const CUBA: LL[] = [
  [-85, 21.9],
  [-82, 23.1],
  [-79.5, 22.6],
  [-75.5, 20.7],
  [-74.2, 20.2],
  [-77.5, 19.9],
  [-78, 20.8],
  [-81.8, 22.1],
];
const HISPANIOLA: LL[] = [
  [-74.4, 19.9],
  [-72, 19.9],
  [-68.4, 18.6],
  [-68.8, 18.2],
  [-71.4, 17.6],
  [-74.4, 18.4],
];
const SOUTH_AMERICA: LL[] = [
  [-77, 8.5],
  [-75.5, 10.5],
  [-72, 11.8],
  [-70, 12.2],
  [-68, 10.5],
  [-64, 10.6],
  [-61.5, 10.5],
  [-60, 8.5],
  [-57, 6],
  [-53, 5.5],
  [-51, 4],
  [-50, 1.5],
  [-48.5, -1],
  [-44.5, -2.5],
  [-41, -2.8],
  [-38, -4],
  [-35.2, -5.5],
  [-35, -8],
  [-37, -11],
  [-38.9, -13.5],
  [-39, -17.5],
  [-40.5, -21],
  [-42, -23],
  [-45, -23.8],
  [-48.5, -26.5],
  [-49, -28.8],
  [-51, -31],
  [-53, -34],
  [-56.5, -34.9],
  [-57.5, -36.5],
  [-57.5, -38.2],
  [-62, -39],
  [-62.5, -41],
  [-65, -42.5],
  [-65.5, -45],
  [-67.5, -46.5],
  [-66, -48],
  [-68.5, -50.5],
  [-68.5, -52.5],
  [-66, -55],
  [-68.5, -55.5],
  [-71.5, -54],
  [-74.5, -51],
  [-75, -46],
  [-73.5, -42],
  [-73.5, -37],
  [-71.5, -32],
  [-71, -27],
  [-70.5, -22],
  [-70.5, -18.5],
  [-75, -15.5],
  [-77, -12],
  [-79.5, -7.5],
  [-81, -5],
  [-80, -2],
  [-80, 1],
  [-78.5, 3],
  [-77.5, 6.5],
];
const AFRICA: LL[] = [
  [-5.9, 35.8],
  [-9.6, 33],
  [-9.8, 30],
  [-13, 27.8],
  [-16.5, 23.5],
  [-17, 21],
  [-16.2, 18],
  [-17.5, 14.7],
  [-16.7, 12.5],
  [-15, 11],
  [-13.3, 9],
  [-11.5, 7],
  [-8, 4.4],
  [-4, 5.2],
  [0, 5.6],
  [3, 6.3],
  [6, 4.3],
  [8.5, 4.5],
  [9.8, 2],
  [9.3, -1],
  [11.8, -4.5],
  [13.3, -8.5],
  [13.5, -12.5],
  [11.8, -17],
  [14.5, -22.5],
  [15, -26.5],
  [16.5, -28.6],
  [17.8, -31.5],
  [18.4, -34],
  [20, -34.8],
  [22.5, -34],
  [26, -33.8],
  [29, -32],
  [32.5, -28.5],
  [32.8, -26],
  [35.5, -24],
  [35.3, -21],
  [37, -17.5],
  [40.5, -15],
  [40.5, -10.5],
  [39.2, -5],
  [41, -1.8],
  [43, 0.5],
  [46.5, 4],
  [49.5, 8],
  [51.2, 11.8],
  [48, 11.3],
  [44, 10.5],
  [43.2, 12],
  [39.5, 15.5],
  [38, 18],
  [36.5, 22],
  [35, 24.5],
  [33, 28],
  [32.5, 30],
  [29, 31],
  [25, 31.8],
  [20, 30.5],
  [19.5, 32],
  [15, 32.3],
  [11, 33.5],
  [10.5, 36.8],
  [8, 37],
  [3, 36.8],
  [-2, 35.1],
];
const MADAGASCAR: LL[] = [
  [44, -25],
  [47, -25.2],
  [49.5, -17],
  [50.4, -15.3],
  [49.3, -12],
  [48, -13.5],
  [44.3, -16.5],
  [43.3, -22],
];
const EUROPE: LL[] = [
  [70, 22],
  [59, 22.5],
  [56.5, 18],
  [52, 16],
  [48, 14],
  [43.3, 12.7],
  [42.5, 16],
  [38.5, 22.5],
  [34.8, 28.5],
  [34.3, 31.3],
  [35.9, 35.5],
  [33, 36.3],
  [29, 36.5],
  [26.3, 40],
  [23.5, 40.3],
  [22.2, 36.6],
  [19.5, 40.5],
  [16, 43.5],
  [13.7, 45.5],
  [12.3, 44.5],
  [14, 42],
  [16.1, 40],
  [16.6, 38.4],
  [15.6, 40.1],
  [12.5, 41.8],
  [8.8, 44.4],
  [6, 43.1],
  [3.2, 43.3],
  [3.2, 41.9],
  [0.5, 40.5],
  [-2, 36.8],
  [-5.6, 36.1],
  [-8.9, 37],
  [-9.5, 39.5],
  [-8.8, 42],
  [-9.2, 43.1],
  [-1.7, 43.4],
  [-1.2, 46],
  [-4.7, 48.3],
  [-1.6, 48.8],
  [1.5, 50.1],
  [4.5, 52.5],
  [8.5, 53.8],
  [8.3, 56.9],
  [10.5, 57.6],
  [10.8, 56],
  [12.5, 54.5],
  [18.5, 54.7],
  [21.3, 57.2],
  [24, 59.4],
  [28.5, 59.8],
  [21.5, 61.5],
  [25.2, 65.2],
  [22, 65.7],
  [17.4, 62.4],
  [18.8, 59.9],
  [15.9, 56.1],
  [12.9, 55.6],
  [10.4, 59.4],
  [5.5, 58.9],
  [5.2, 62.5],
  [11, 64.9],
  [15, 68.5],
  [22, 70.5],
  [31, 70.2],
  [41, 67.3],
  [50, 68.2],
  [70, 72],
  [90, 72],
  [90, 22],
];
const BRITAIN: LL[] = [
  [-5.7, 50],
  [-3, 50.6],
  [1.4, 51.2],
  [1.7, 52.7],
  [0.2, 53.5],
  [-1.6, 55.6],
  [-2.1, 57],
  [-1.8, 57.6],
  [-3.5, 58.6],
  [-5, 58.6],
  [-6.2, 56.8],
  [-5.6, 55.4],
  [-3.3, 54.4],
  [-3, 53.3],
  [-4.6, 53.2],
  [-4.2, 52.3],
  [-5.2, 51.8],
  [-3.2, 51.4],
  [-4.5, 51.1],
];
const IRELAND: LL[] = [
  [-6, 52.2],
  [-6.2, 53.5],
  [-5.6, 54.6],
  [-7.3, 55.3],
  [-8.5, 54.4],
  [-10, 54],
  [-9.6, 52.6],
  [-10.3, 51.8],
  [-8.5, 51.6],
];
const SVALBARD: LL[] = [
  [11, 78.8],
  [16, 80],
  [22, 80.3],
  [27, 79.5],
  [20, 77.5],
  [16, 76.6],
  [13, 77.8],
];
const ANTARCTICA: LL[] = [
  [-120, -74],
  [-100, -73],
  [-90, -72.5],
  [-80, -73],
  [-75, -71.5],
  [-70, -69.5],
  [-68, -67],
  [-65, -65],
  [-62, -64],
  [-58, -63.2],
  [-56.5, -63.5],
  [-58, -64.5],
  [-61, -66],
  [-62, -68.5],
  [-61, -71],
  [-62, -74.5],
  [-58, -76],
  [-50, -77.8],
  [-40, -78],
  [-35, -77.6],
  [-30, -76.5],
  [-26, -75.3],
  [-20, -73.5],
  [-15, -72.5],
  [-11, -71.3],
  [-5, -70.8],
  [0, -70.2],
  [5, -70.3],
  [10, -70],
  [15, -70.2],
  [20, -70],
  [25, -70.3],
  [30, -69.8],
  [35, -69.2],
  [40, -69],
  [45, -68],
  [50, -67],
  [55, -66.5],
  [60, -67.2],
  [80, -68],
  [80, -100],
  [-120, -100],
];
const LAND = [
  NORTH_AMERICA,
  ARCTIC_ISLES,
  BAFFIN,
  GREENLAND,
  ICELAND,
  NEWFOUNDLAND,
  CUBA,
  HISPANIOLA,
  SOUTH_AMERICA,
  EUROPE,
  BRITAIN,
  IRELAND,
  SVALBARD,
  AFRICA,
  MADAGASCAR,
  ANTARCTICA,
];
const LAKES: LL[][] = [
  [
    [27.5, 42.5],
    [28.5, 44],
    [30.5, 46.4],
    [33.5, 46],
    [35.5, 45.3],
    [38, 47],
    [39.7, 46.8],
    [38.2, 44.4],
    [41.5, 41.6],
    [36, 41.7],
    [32, 41.9],
    [29, 41.2],
  ],
  [
    [47, 44.5],
    [49.5, 46.5],
    [53, 46.7],
    [53, 45],
    [51.3, 44.3],
    [53, 42],
    [53.8, 40],
    [53.4, 37.3],
    [51, 36.7],
    [49.2, 37.6],
    [49.5, 40.3],
    [47.8, 42.8],
  ],
];
const CAPE_VERDE: LL[] = [
  [-25, 17],
  [-24.3, 16.6],
  [-23.5, 15.1],
  [-22.9, 16.2],
  [-24.4, 14.9],
  [-22.8, 16.8],
];
const perimeter = (pts: LL[]) =>
  pts.reduce((s, p, i) => {
    const q = pts[(i + 1) % pts.length]!;
    return s + Math.hypot(q[0] - p[0], q[1] - p[1]);
  }, 0);
const LAND_LEN = LAND.map(perimeter);

// ---------------------------------------------------------------- the route (Egevang et al. 2010, simplified)
const TRUNK: LL[] = [
  [-21, 73.8],
  [-24, 69],
  [-29, 61],
  [-33, 54],
  [-35, 48],
  [-31, 40],
  [-25, 30],
  [-21, 21],
  [-22, 10],
];
const VIA_AFRICA: LL[] = [
  [-17, 3],
  [-8, -2],
  [2, -5],
  [8, -13],
  [9, -24],
  [12, -34],
  [8, -43],
  [-3, -51],
  [-14, -56],
  [-25, -58],
];
const VIA_BRAZIL: LL[] = [
  [-28, 2],
  [-31.5, -6],
  [-35, -14],
  [-38.5, -22],
  [-44, -30],
  [-50, -38],
  [-53, -46],
  [-46, -53],
  [-36, -57],
  [-25, -58],
];
const TAIL: LL[] = [
  [-32, -63.5],
  [-20, -65],
  [-8, -61],
  [-2, -52],
  [3, -40],
  [3, -27],
  [-3, -13],
  [-14, -3],
  [-28, 7],
  [-39, 19],
  [-44, 32],
  [-41, 45],
  [-34, 56],
  [-27, 65],
  [-21, 73.8],
];
const MAIN = [...TRUNK, ...VIA_AFRICA, ...TAIL];
const W_STOP = 4,
  W_FORK = 8,
  W_JOIN = 18,
  W_WINTER = 19;
const K = 12; // samples per Catmull-Rom span
// a Catmull-Rom curve through w[1..n-2] (w[0] and w[n-1] only steer the ends)
const catmull = (w: LL[]): LL[] => {
  const out: LL[] = [];
  for (let i = 1; i < w.length - 2; i++) {
    const a = w[i - 1]!,
      b = w[i]!,
      c = w[i + 1]!,
      d = w[i + 2]!;
    for (let k = 0; k < K; k++) {
      const t = k / K,
        t2 = t * t,
        t3 = t2 * t;
      const f = (j: 0 | 1) =>
        0.5 *
        (2 * b[j] +
          (c[j] - a[j]) * t +
          (2 * a[j] - 5 * b[j] + 4 * c[j] - d[j]) * t2 +
          (3 * b[j] - a[j] - 3 * c[j] + d[j]) * t3);
      out.push([f(0), f(1)]);
    }
  }
  out.push(w[w.length - 2]!);
  return out;
};
type Path = { pts: LL[]; cum: number[]; len: number };
const toPath = (pts: LL[]): Path => {
  const cum = [0];
  for (let i = 1; i < pts.length; i++)
    cum.push(cum[i - 1]! + Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1]));
  return { pts, cum, len: cum[cum.length - 1]! };
};
/** the point at arc length s (degrees), by binary search */
const pointAt = (p: Path, s: number): LL => {
  s = clamp(s, 0, p.len);
  let lo = 0,
    hi = p.cum.length - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (p.cum[m]! <= s) lo = m;
    else hi = m;
  }
  const a = p.pts[lo]!,
    b = p.pts[hi]!,
    t = (s - p.cum[lo]!) / (p.cum[hi]! - p.cum[lo]! || 1);
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
};
/** screen heading (radians) of the path at s: screen y runs down, latitude up */
const headingAt = (p: Path, s: number) => {
  const a = pointAt(p, s - 0.8),
    b = pointAt(p, s + 0.8);
  return Math.atan2(-(b[1] - a[1]), b[0] - a[0]);
};
const ROUTE = toPath(catmull([MAIN[0]!, ...MAIN, MAIN[MAIN.length - 1]!]));
const BRANCH = toPath(catmull([TRUNK[7]!, TRUNK[8]!, ...VIA_BRAZIL, TAIL[0]!]));
const S = {
  stop: ROUTE.cum[W_STOP * K]!,
  fork: ROUTE.cum[W_FORK * K]!,
  join: ROUTE.cum[W_JOIN * K]!,
  winter: ROUTE.cum[W_WINTER * K]!,
  after: ROUTE.cum[(W_WINTER + 1) * K]!,
  end: ROUTE.len,
};

// the traveller's position along the route: a monotone cubic through (frame, arc length) keys, so the bird eases
// into the stopover and the winter (a crawl, never a stop) and lands at the nest with no speed left
const KEYS: [number, number][] = [
  [120, 0],
  [196, S.stop],
  [258, S.stop + 0.1 * (S.fork - S.stop)],
  [330, S.fork],
  [478, S.join],
  [538, S.winter],
  [600, S.winter + 0.3 * (S.after - S.winter)],
  [840, S.end],
];
const TANGENTS = KEYS.map((_, i) => {
  if (i === 0) return 0;
  // the last key: the bird arrives at full speed and stops dead on the landing hit (frame 840)
  if (i === KEYS.length - 1) return (1.2 * (KEYS[i]![1] - KEYS[i - 1]![1])) / (KEYS[i]![0] - KEYS[i - 1]![0]);
  const d0 = (KEYS[i]![1] - KEYS[i - 1]![1]) / (KEYS[i]![0] - KEYS[i - 1]![0]),
    d1 = (KEYS[i + 1]![1] - KEYS[i]![1]) / (KEYS[i + 1]![0] - KEYS[i]![0]);
  return d0 <= 0 || d1 <= 0 ? 0 : 2 / (1 / d0 + 1 / d1); // harmonic mean: slows hard into a crawl
});
const along = (F: number) => {
  if (F <= KEYS[0]![0]) return 0;
  if (F >= KEYS[KEYS.length - 1]![0]) return S.end;
  let i = 0;
  while (F > KEYS[i + 1]![0]) i++;
  const [x0, y0] = KEYS[i]!,
    [x1, y1] = KEYS[i + 1]!,
    h = x1 - x0,
    t = (F - x0) / h,
    m0 = TANGENTS[i]! * h,
    m1 = TANGENTS[i + 1]! * h;
  const t2 = t * t,
    t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * y0 + (t3 - 2 * t2 + t) * m0 + (-2 * t3 + 3 * t2) * y1 + (t3 - t2) * m1;
};
/** the Brazil branch draws at the same fraction as the Africa branch */
const branchAlong = (s: number) => clamp((s - S.fork) / (S.join - S.fork)) * BRANCH.len;
const TOTAL_KM = 70900;
const kmAt = (F: number) => Math.round((TOTAL_KM * along(F)) / S.end / 100) * 100;

// ---------------------------------------------------------------- sound cues
const PIN_LAND = { nest: 84, stop: 196, winter: 540 };
const CHIPS: [number, string][] = [
  [120, "Aug"],
  [240, "Sep"],
  [420, "Nov"],
  [600, "Apr"],
  [735, "May"],
];
const HITS = [330, 840],
  WHOOSH = [120, 420, 600, 810];
const COUNTER_TICKS = (() => {
  // a tick each time the counter passes a 10,000 km mark (every other 5,000: thinned), clear of every other cue
  const busy = [...Object.values(PIN_LAND), ...CHIPS.map((c) => c[0]), ...HITS],
    out: number[] = [];
  let last = 0;
  for (let f = 120; f <= 840; f++) {
    const step = Math.floor(kmAt(f) / 5000);
    if (step > last) {
      last = step;
      if (step % 2 === 0 && busy.every((b) => Math.abs(b - f) > 5)) out.push(f);
    }
  }
  return out;
})();

// ---------------------------------------------------------------- helpers
const softplus = (x: number, k: number) => (x / k > 30 ? x : k * Math.log1p(Math.exp(x / k)));
/** a clamp with rounded corners, so a camera that reaches a bound slows into it instead of stopping dead */
const softClamp = (x: number, lo: number, hi: number, k = 3) => lo + softplus(x - lo, k) - softplus(x - hi, k);
/** a value eased between keys (ease-in-out on every move) */
const keyed = (F: number, keys: [number, number][]) => {
  if (F <= keys[0]![0]) return keys[0]![1];
  for (let i = 1; i < keys.length; i++) {
    const [f1, v1] = keys[i]!,
      [f0, v0] = keys[i - 1]!;
    if (F <= f1) return lerp(v0, v1, ease.inOutCubic(prog(F, f0, f1)));
  }
  return keys[keys.length - 1]![1];
};
const fmt = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const smoothClosed = (ctx: Ctx, pts: [number, number][]) => {
  const n = pts.length,
    mid = (a: [number, number], b: [number, number]): [number, number] => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const m0 = mid(pts[n - 1]!, pts[0]!);
  ctx.moveTo(m0[0], m0[1]);
  for (let i = 0; i < n; i++) {
    const p = pts[i]!,
      m = mid(p, pts[(i + 1) % n]!);
    ctx.quadraticCurveTo(p[0], p[1], m[0], m[1]);
  }
  ctx.closePath();
};

type Headline = { from: number; to: number; lines: [string, number][]; sub?: [string, number] };
const HEADLINES: Headline[] = [
  {
    from: -10,
    to: 176,
    lines: [
      ["A bird under 125 g", -4],
      ["flies pole to pole and back.", 34],
    ],
  },
  {
    from: 294,
    to: 418,
    lines: [["Then the tracked birds split:", 294]],
    sub: ["7 followed Africa, 4 crossed to Brazil.", 342],
  },
  {
    from: 448,
    to: 596,
    lines: [["It swaps one summer for another.", 448]],
    sub: ["Arctic in June, Antarctic from December to March.", 488],
  },
  {
    from: 612,
    to: 806,
    lines: [
      ["Home in an S-curve, riding the winds,", 612],
      ["in about 40 days.", 690],
    ],
  },
  { from: 852, to: 954, lines: [["Some flew more than 80,000 km.", 852]] },
  {
    from: 960,
    to: 1200,
    lines: [
      ["Over a 30-year life:", 962],
      ["maybe 2.4 million km.", 988],
    ],
    sub: ["About three trips to the Moon and back.", 1016],
  },
];
const FOOTER = "routes simplified · 11 tracked birds, 2007–08 · Egevang et al., PNAS 2010";

type Rect = { x: number; y: number; w: number; h: number };
const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

export function make(size: Size, id: string): Film {
  const L = layout(size),
    { W, H, u, cx, cy, tall } = L;
  const sans = (sz: number, weight = 600, color = C.ink): TextOpts => ({
    size: sz * u,
    family: F_.sans,
    weight,
    color,
  });
  const mono = (sz: number, color = C.muted): TextOpts => ({ size: sz * u, family: F_.mono, weight: 500, color });

  // ---- the camera: home (zoom 1, the whole route) and follow (the bird, a few frames behind)
  const HOME = tall ? { lon: -21, lat: 4, s: 7.1 * u } : { lon: -21, lat: 1, s: 6 * u };
  const ZF = tall ? 1.6 : 2.2; // the following zoom
  const panelBottom = tall ? 400 * u : 0,
    cardTop = tall ? H - L.safe.bottom - 110 * u : H;
  const sF = HOME.s * ZF,
    lonLo = SHEET.w + W / 2 / sF,
    lonHi = SHEET.e - W / 2 / sF,
    latHi = SHEET.n - (cy - panelBottom) / sF, // the sheet's top edge stays behind the headline panel
    latLo = SHEET.s + (cardTop - cy) / sF;
  const ZOOM: [number, number][] = [
    [0, 0],
    [66, 0],
    [146, 1],
    [316, 1],
    [364, 0.5],
    [396, 0.5],
    [442, 1],
    [500, 1],
    [578, 1.1],
    [622, 0.85],
    [780, 0.85],
    [840, 0],
  ];
  const LAG = 8;
  // the camera kicks on the three beats (the fork, the Antarctica landing, the total): a closed-form punch-in
  const KICKS: [number, number][] = [
    [330, 0.045],
    [PIN_LAND.winter, 0.035],
    [840, 0.04],
  ];
  const kick = (F: number) =>
    KICKS.reduce((k, [f, a]) => k * (F < f ? 1 : 1 + a * Math.exp(-(F - f) / 6) * Math.cos((F - f) * 0.35)), 1);
  const target = (F: number): LL => {
    const s = along(F - LAG);
    if (s > S.fork && s < S.join) {
      const a = pointAt(ROUTE, s),
        b = pointAt(BRANCH, branchAlong(s));
      return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    }
    return pointAt(ROUTE, s);
  };
  const camera = (F: number) => {
    const zf = keyed(F, ZOOM),
      [tl, tt] = target(F),
      settle = 1 + 0.07 * (1 - ease.inOutCubic(prog(F, 0, 76))),
      t = prog(F, 836, N - 1),
      push = 1 + 0.16 * (t < 0.15 ? (t * t) / 0.3 : t - 0.075); // eases in, then keeps pushing to the last frame
    return {
      lon: lerp(HOME.lon, softClamp(tl, lonLo, lonHi), zf),
      lat: lerp(HOME.lat, softClamp(tt, latLo, latHi), zf),
      s: HOME.s * ZF ** zf * settle * push * kick(F),
      zf,
    };
  };
  type Cam = ReturnType<typeof camera>;
  const proj = (c: Cam, p: LL): [number, number] => [cx + (p[0] - c.lon) * c.s, cy - (p[1] - c.lat) * c.s];

  // ---- the paper grain: seeded speckles, static, drawn once into a cached layer
  const grain = (env: Env): Layer => {
    const w = Math.round(W * env.scale),
      h = Math.round(H * env.scale),
      k = `route-map-grain:${w}x${h}`;
    let lay = env.cache.get(k) as Layer | undefined;
    if (!lay) {
      lay = env.canvas(w, h);
      const c = lay.ctx,
        r = rng(39);
      c.setTransform(env.scale, 0, 0, env.scale, 0, 0);
      c.fillStyle = C.ink;
      c.globalAlpha = 0.05;
      const n = Math.round((W * H) / 700);
      for (let i = 0; i < n; i++) {
        const s = (0.8 + r() * 1.8) * u;
        c.fillRect(r() * W, r() * H, s, s);
      }
      env.cache.set(k, lay);
    }
    return lay;
  };

  // ---- the map: sheet, graticule, land, labels
  const drawMap = (ctx: Ctx, c: Cam, F: number) => {
    const [x0, y0] = proj(c, [SHEET.w, SHEET.n]),
      [x1, y1] = proj(c, [SHEET.e, SHEET.s]);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, y0, x1 - x0, y1 - y0);
    ctx.clip();
    ctx.fillStyle = C.ground;
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    // graticule every 15°
    const g = ease.outCubic(prog(F, 4, 50));
    ctx.globalAlpha = g;
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 1 * u;
    ctx.beginPath();
    for (let lon = -90; lon <= 60; lon += 15) {
      const [x] = proj(c, [lon, 0]);
      ctx.moveTo(x, y0);
      ctx.lineTo(x, y1);
    }
    for (let lat = -90; lat <= 90; lat += 15) {
      const [, y] = proj(c, [0, lat]);
      ctx.moveTo(x0, y);
      ctx.lineTo(x1, y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
    // land: the coast draws on, then the fill arrives
    LAND.forEach((poly, i) => {
      const pts = poly.map((p) => proj(c, p)),
        draw = ease.outCubic(prog(F, i * 2 - 2, 46 + i * 2)),
        fill = ease.outCubic(prog(F, 24 + i * 2, 60 + i * 2));
      if (draw <= 0) return;
      ctx.beginPath();
      smoothClosed(ctx, pts);
      if (fill > 0) {
        ctx.globalAlpha = fill;
        ctx.fillStyle = C.surface;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      const len = LAND_LEN[i]! * c.s * 1.05;
      ctx.setLineDash(draw < 1 ? [len * draw, len] : []);
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 2 * u;
      ctx.lineJoin = "round";
      ctx.stroke();
      ctx.setLineDash([]);
    });
    const lakes = ease.outCubic(prog(F, 40, 64));
    if (lakes > 0)
      for (const lake of LAKES) {
        ctx.globalAlpha = lakes;
        ctx.beginPath();
        smoothClosed(
          ctx,
          lake.map((p) => proj(c, p)),
        );
        ctx.fillStyle = C.ground;
        ctx.fill();
        ctx.strokeStyle = C.ink;
        ctx.lineWidth = 1.5 * u;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    // the Cape Verde islands, south of which the routes split
    for (const p of CAPE_VERDE) {
      const [x, y] = proj(c, p);
      ctx.beginPath();
      ctx.arc(x, y, Math.max(2.5 * u, 0.28 * c.s), 0, Math.PI * 2);
      ctx.globalAlpha = g;
      ctx.fillStyle = C.surface;
      ctx.fill();
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 1.5 * u;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // the equator and the polar circles, dashed
    ctx.globalAlpha = g;
    ctx.strokeStyle = C.muted;
    ctx.lineWidth = 1.5 * u;
    ctx.setLineDash([10 * u, 8 * u]);
    ctx.beginPath();
    for (const lat of [0, 66.56, -66.56]) {
      const [, y] = proj(c, [0, lat]);
      ctx.moveTo(x0, y);
      ctx.lineTo(x1, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    // the map's double neatline, at the clip edge so no clipped coast pokes past it
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 2 * u;
    ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
    ctx.lineWidth = 1 * u;
    ctx.strokeRect(x0 - 9 * u, y0 - 9 * u, x1 - x0 + 18 * u, y1 - y0 + 18 * u);
  };

  const pill = (
    ctx: Ctx,
    s: string,
    x: number,
    y: number,
    o: TextOpts,
    fill: string,
    align: "left" | "center" | "right" = "center",
    alpha = 1,
  ) => {
    const w = measure(ctx, s, o),
      padX = 10 * u,
      h = o.size * 1.45,
      left = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
    ctx.save();
    ctx.globalAlpha *= alpha;
    rr(ctx, left - padX, y - h / 2, w + 2 * padX, h, h / 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.restore();
    text(ctx, s, left, y + o.size * 0.36, { ...o, alpha, align: "left" });
    return { x: left - padX, y: y - h / 2, w: w + 2 * padX, h };
  };

  // a label fades out as it nears a panel, the card or the frame edge, so it never shows clipped
  const clearOf = (r: Rect, avoid: Rect[]) => {
    const edge = Math.min(r.x, W - r.x - r.w, r.y, H - r.y - r.h) - 12 * u;
    let k = clamp(edge / (24 * u));
    for (const b of avoid) {
      const sep = Math.max(b.x - r.x - r.w, r.x - b.x - b.w, b.y - r.y - r.h, r.y - b.y - b.h) - 8 * u;
      k = Math.min(k, clamp(sep / (24 * u)));
    }
    return k;
  };
  const mapLabels = (ctx: Ctx, c: Cam, F: number, avoid: Rect[]) => {
    const a = ease.outCubic(prog(F, 30, 64)) * (1 - prog(F, 984, 1000)),
      ga = a * (1 - prog(F, 834, 848)); // the graticule labels clear the stage for the total
    if (a <= 0) return;
    // graticule labels on ground pills, at 15° E (clear of the route and of the corner panels)
    for (const [lat, s] of [
      [66.56, "Arctic Circle"],
      [0, "Equator"],
      [-66.56, "Antarctic Circle"],
    ] as [number, string][]) {
      const [x, y] = proj(c, [15, lat]),
        o = mono(24),
        pw = measure(ctx, s, o) + 20 * u,
        k = ga * clearOf({ x: x - pw / 2, y: y - 18 * u, w: pw, h: 36 * u }, avoid);
      if (k > 0) pill(ctx, s, x, y, o, C.ground, "center", k);
    }
    const sea = (s: string, p: LL, sz = 32) => {
      const [x, y] = proj(c, p),
        o = { size: sz * u, family: F_.italic, color: C.muted, align: "center" as const },
        sw = measure(ctx, s, o),
        k = a * clearOf({ x: x - sw / 2, y: y - sz * u, w: sw, h: sz * 1.3 * u }, avoid);
      if (k > 0) text(ctx, s, x, y, { ...o, alpha: k });
    };
    sea("North Atlantic", [-62, 36]);
    sea("Southern Ocean", [30, -57]);
    sea("Weddell Sea", [-50, -75]);
    const [vx, vy] = proj(c, [-26.5, 16.2]),
      vo = { size: 26 * u, family: F_.italic, color: C.muted, align: "right" as const },
      vw = measure(ctx, "Cape Verde", vo),
      vk = a * clearOf({ x: vx - vw, y: vy - 18 * u, w: vw, h: 34 * u }, avoid);
    if (vk > 0) text(ctx, "Cape Verde", vx, vy + 8 * u, { ...vo, alpha: vk });
    // a small compass rose in ink
    const [rx, ry] = proj(c, [-86, -50]),
      R = 30 * u;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(rx, ry);
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 1.5 * u;
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.62, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 4; i++) {
      ctx.rotate(Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(0, -R);
      ctx.lineTo(R * 0.2, 0);
      ctx.lineTo(-R * 0.2, 0);
      ctx.closePath();
      ctx.fillStyle = i === 3 ? C.ink : C.ground;
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
    text(ctx, "N", rx, ry - R - 10 * u, { ...mono(24, C.ink), align: "center", alpha: a });
  };

  // ---- the prevailing winds: thin muted arrows sweeping across the sea on the way home
  const WINDS: [LL, LL, number][] = [
    [[-46, -44], [-30, -41], 2],
    [[-6, -19], [-19, -9], 2],
    [[8, -8], [-4, 0], 2],
    [[-18, 24], [-32, 15], -2],
    [[-50, 50], [-36, 54], 2],
    [[-22, -30], [-34, -22], 2],
  ];
  const winds = (ctx: Ctx, c: Cam, F: number) => {
    const env = Math.min(prog(F, 606, 630), 1 - prog(F, 784, 806));
    if (env <= 0) return;
    ctx.save();
    ctx.strokeStyle = C.muted;
    ctx.fillStyle = C.muted;
    ctx.lineWidth = 4 * u;
    ctx.lineCap = "round";
    WINDS.forEach(([a, b, bend], i) => {
      const ph = ((((F - 606 + i * 11) % 54) + 54) % 54) / 54,
        t1 = clamp(ph * 1.5),
        t0 = clamp(ph * 1.5 - 0.55);
      if (t1 <= t0) return;
      const pa = proj(c, a),
        pb = proj(c, b),
        nx = -(pb[1] - pa[1]),
        ny = pb[0] - pa[0],
        l = Math.hypot(nx, ny) || 1,
        k: [number, number] = [
          (pa[0] + pb[0]) / 2 + (nx / l) * bend * 0.08 * l,
          (pa[1] + pb[1]) / 2 + (ny / l) * bend * 0.08 * l,
        ];
      const q = (t: number): [number, number] => [
        (1 - t) ** 2 * pa[0] + 2 * (1 - t) * t * k[0] + t * t * pb[0],
        (1 - t) ** 2 * pa[1] + 2 * (1 - t) * t * k[1] + t * t * pb[1],
      ];
      ctx.globalAlpha = env * (1 - prog(ph, 0.8, 1));
      ctx.beginPath();
      for (let j = 0; j <= 16; j++) {
        const p = q(lerp(t0, t1, j / 16));
        if (j) ctx.lineTo(p[0], p[1]);
        else ctx.moveTo(p[0], p[1]);
      }
      ctx.stroke();
      const tip = q(t1),
        back = q(Math.max(0, t1 - 0.05)),
        ang = Math.atan2(tip[1] - back[1], tip[0] - back[0]);
      ctx.save();
      ctx.translate(tip[0], tip[1]);
      ctx.rotate(ang);
      ctx.beginPath();
      ctx.moveTo(6 * u, 0);
      ctx.lineTo(-12 * u, -9 * u);
      ctx.lineTo(-12 * u, 9 * u);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    });
    ctx.restore();
  };

  // ---- the route: a dotted accent line with a solid last 60 px; dots are fixed on the map so they never crawl
  const DOT_STEP = (14 * u) / (HOME.s * Math.sqrt(ZF)); // 14 px apart at the middle zoom
  const drawRoute = (ctx: Ctx, c: Cam, path: Path, s: number, pulseAt: number | null) => {
    if (s <= 0) return;
    const done = s >= path.len - 1e-6, // a finished line is all dots; the solid stroke belongs to a moving head
      tailLen = done ? 0 : (60 * u) / c.s,
      r = 2.5 * u * (c.s / HOME.s) ** 0.35;
    ctx.fillStyle = C.accent;
    const dotsTo = s - tailLen;
    for (let d = 0; d <= dotsTo; d += DOT_STEP) {
      const [x, y] = proj(c, pointAt(path, d));
      if (x < -20 || x > W + 20 || y < -20 || y > H + 20) continue;
      const bump = pulseAt === null ? 0 : Math.exp(-(((d - pulseAt) / 7) ** 2));
      ctx.beginPath();
      ctx.arc(x, y, r * (1 + 1.3 * bump), 0, Math.PI * 2);
      ctx.fill();
    }
    if (done) return;
    ctx.strokeStyle = C.accent;
    ctx.lineWidth = 4 * u;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    const a = Math.max(0, s - tailLen);
    for (let j = 0; j <= 14; j++) {
      const [x, y] = proj(c, pointAt(path, lerp(a, s, j / 14)));
      if (j) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.stroke();
  };

  // ---- the traveller: an Arctic tern from above (narrow swept wings, deeply forked tail, pointed bill)
  const tern = (ctx: Ctx, x: number, y: number, ang: number, F: number, q: number) => {
    const k = 0.7 + 0.3 * Math.cos((F * 2 * Math.PI) / 8),
      span = 23 * k,
      sweep = 9 + 4 * (1 - k);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.scale(q, q);
    const shape = () => {
      ctx.beginPath();
      for (const g of [1, -1]) {
        ctx.moveTo(6, 0);
        ctx.quadraticCurveTo(3, g * span * 0.55, -sweep, g * span);
        ctx.quadraticCurveTo(-3, g * span * 0.4, -5, 0);
      }
      ctx.ellipse(0, 0, 11, 3.4, 0, 0, Math.PI * 2);
      ctx.moveTo(12.5, 0);
      ctx.arc(9, 0, 3.5, 0, Math.PI * 2);
      ctx.moveTo(-8, -2.6);
      ctx.lineTo(-23, -7);
      ctx.lineTo(-14, 0);
      ctx.lineTo(-23, 7);
      ctx.lineTo(-8, 2.6);
      ctx.closePath();
    };
    shape();
    ctx.strokeStyle = C.ground;
    ctx.lineWidth = 3.2;
    ctx.lineJoin = "round";
    ctx.stroke();
    ctx.fillStyle = C.ink;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(11.5, -1.4);
    ctx.lineTo(19.5, 0);
    ctx.lineTo(11.5, 1.4);
    ctx.closePath();
    ctx.fillStyle = C.accent;
    ctx.fill();
    ctx.restore();
  };
  // the tern's own position (the hook's fly-in, the route, and a hover at the nest)
  const NEST = MAIN[0]!,
    FLY_A: LL = [72, 60],
    FLY_K: LL = [18, 86];
  const bird = (F: number): { p: LL; ang: number; off: [number, number] } => {
    if (F < 70) {
      const t = ease.outCubic(prog(F, 12, 70)),
        q = (t: number): LL => [
          (1 - t) ** 2 * FLY_A[0] + 2 * (1 - t) * t * FLY_K[0] + t * t * NEST[0],
          (1 - t) ** 2 * FLY_A[1] + 2 * (1 - t) * t * FLY_K[1] + t * t * NEST[1],
        ];
      const a = q(t),
        b = q(Math.min(1, t + 0.02)),
        a2 = q(Math.max(0, t - 0.02));
      const dir = t < 0.98 ? Math.atan2(-(b[1] - a[1]), b[0] - a[0]) : Math.atan2(-(a[1] - a2[1]), a[0] - a2[0]);
      return { p: a, ang: dir, off: [0, 0] };
    }
    const s = along(F),
      hover = Math.max(1 - prog(F, 96, 122), prog(F, 836, 870));
    const base = headingAt(ROUTE, Math.min(Math.max(s, 1), S.end - 1)),
      wob = hover * 0.35 * Math.sin(F / 9);
    return {
      p: pointAt(ROUTE, s),
      ang: F >= 836 ? lerp(base, -Math.PI / 2 - 0.4, prog(F, 836, 880)) + wob : base + wob,
      off: [hover * 7 * u * Math.cos(F / 11), hover * 5 * u * Math.sin(F / 7)],
    };
  };

  // ---- pins: an accent teardrop that drops from above, squashes on landing, with a label card
  type Pin = { at: LL; land: number; show: number; title: string; fig?: string; sub?: string };
  const PINS: Pin[] = [
    { at: [-18.2, 74.4], land: PIN_LAND.nest, show: 118, title: "Greenland", sub: "nests here in the Arctic summer" },
    {
      at: [-32.5, 48.2],
      land: PIN_LAND.stop,
      show: 118,
      title: "Stopover",
      fig: "about 25 days",
      sub: "of feeding at sea",
    },
    { at: [-36, -66], land: PIN_LAND.winter, show: 120, title: "Winter by Antarctica", fig: "about 5 months" },
  ];
  const pinMark = (ctx: Ctx, c: Cam, pin: Pin, F: number) => {
    const t = F - pin.land;
    if (t < -10) return;
    const [x, y] = proj(c, pin.at),
      fall = prog(F, pin.land - 10, pin.land),
      yOff = -(1 - fall * fall) * 220 * u,
      squash = t > 0 ? 0.3 * Math.exp(-t / 3) * Math.cos(t * 0.9) : 0;
    // the soft shadow grows as the pin nears the map
    ctx.save();
    ctx.globalAlpha = 0.18 * fall;
    ctx.fillStyle = C.ink;
    ctx.beginPath();
    ctx.ellipse(x, y, 11 * u * (0.4 + 0.6 * fall), 4 * u * (0.4 + 0.6 * fall), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // the landing sends a flat ripple across the map (the Antarctica landing a bigger one)
    if (t >= 0 && t < 22) {
      const e = ease.outCubic(t / 22),
        big = pin.land === PIN_LAND.winter ? 1.7 : 1,
        rx = lerp(12, 80 * big, e) * u;
      ctx.save();
      ctx.globalAlpha = 0.85 * (1 - t / 22);
      ctx.strokeStyle = C.accent;
      ctx.lineWidth = lerp(4, 1.5, e) * u;
      ctx.beginPath();
      ctx.ellipse(x, y, rx, rx * 0.42, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    ctx.save();
    ctx.translate(x, y + yOff);
    ctx.scale(1 + squash * 0.6, 1 - squash);
    const R = 13 * u,
      hy = -32 * u;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-4 * u, -8 * u, -R, hy + 12 * u, -R, hy);
    ctx.arc(0, hy, R, Math.PI, 0);
    ctx.bezierCurveTo(R, hy + 12 * u, 4 * u, -8 * u, 0, 0);
    ctx.closePath();
    ctx.fillStyle = C.accent;
    ctx.fill();
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 1.5 * u;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, hy, 5 * u, 0, Math.PI * 2);
    ctx.fillStyle = C.surface;
    ctx.fill();
    ctx.restore();
  };
  const pinLabel = (ctx: Ctx, c: Cam, pin: Pin, F: number, avoid: Rect[], draw = true): Rect | null => {
    const a = Math.min(
      ease.outBack(prog(F, pin.land + 3, pin.land + 15)),
      1 - prog(F, pin.land + pin.show - 12, pin.land + pin.show),
    );
    if (a <= 0 || F < pin.land + 3) return null;
    const [x, y] = proj(c, pin.at),
      to = sans(34),
      fo = sans(56),
      so = sans(26, 400, C.muted),
      w =
        Math.max(
          measure(ctx, pin.title, to),
          pin.fig ? measure(ctx, pin.fig, fo) : 0,
          pin.sub ? measure(ctx, pin.sub, so) : 0,
        ) +
        36 * u,
      h = (pin.fig ? (pin.sub ? 166 : 130) : 98) * u,
      hy = y - 32 * u;
    const top = clamp(
      hy - h / 2,
      Math.max(L.safe.top, panelBottom + 16 * u),
      H - L.safe.bottom - h - (tall ? 130 * u : 0),
    );
    const right: Rect = { x: x + 26 * u, y: top, w, h },
      left: Rect = { x: x - 26 * u - w, y: top, w, h };
    const fits = (r: Rect) => r.x >= L.safe.x && r.x + r.w <= W - L.safe.x && avoid.every((b) => !overlaps(r, b));
    const prefer = x < W / 2 ? [right, left] : [left, right],
      r = prefer.find(fits) ?? prefer[0]!;
    if (!draw) return r;
    const sc = 0.85 + 0.15 * clamp(a),
      ox = r === right ? r.x : r.x + r.w;
    ctx.save();
    ctx.globalAlpha = clamp(a);
    ctx.translate(ox, hy);
    ctx.scale(sc, sc);
    ctx.translate(-ox, -hy);
    rr(ctx, r.x, r.y, r.w, r.h, 10 * u);
    ctx.fillStyle = C.surface;
    ctx.fill();
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 1.5 * u;
    ctx.stroke();
    text(ctx, pin.title, r.x + 18 * u, r.y + 44 * u, to);
    if (pin.fig) text(ctx, pin.fig, r.x + 18 * u, r.y + 108 * u, fo);
    if (pin.sub) text(ctx, pin.sub, r.x + 18 * u, r.y + (pin.fig ? 146 : 80) * u, so);
    ctx.restore();
    return r;
  };

  // ---- the headline panel (top-left in landscape, across the top in vertical)
  const HL_SIZE = 56,
    SUB_SIZE = 34,
    PAD = 26 * u;
  const maxText = tall ? W - 2 * L.safe.x - 2 * PAD : 640 * u;
  const wrapCache = new Map<string, string[]>();
  // greedy wrap at a width, then balanced: the narrowest width that keeps the same number of lines (no orphans)
  const greedy = (ctx: Ctx, s: string, o: TextOpts, max: number) => {
    const lines: string[] = [];
    let cur = "";
    for (const word of s.split(" ")) {
      const next = cur ? `${cur} ${word}` : word;
      if (cur && measure(ctx, next, o) > max) {
        lines.push(cur);
        cur = word;
      } else cur = next;
    }
    lines.push(cur);
    return lines;
  };
  const wrap = (ctx: Ctx, s: string, o: TextOpts) => {
    const key = `${o.size}|${s}`;
    let lines = wrapCache.get(key);
    if (!lines) {
      lines = greedy(ctx, s, o, maxText);
      if (lines.length > 1) {
        let lo = maxText / 3,
          hi = maxText;
        for (let i = 0; i < 20; i++) {
          const m = (lo + hi) / 2;
          if (greedy(ctx, s, o, m).length > lines.length) lo = m;
          else hi = m;
        }
        lines = greedy(ctx, s, o, hi);
      }
      wrapCache.set(key, lines);
    }
    return lines;
  };
  const headline = (ctx: Ctx, F: number, draw = true): Rect | null => {
    const hl = HEADLINES.find((h) => F >= h.from && F < h.to);
    if (!hl) return null;
    const ho = sans(HL_SIZE),
      so = sans(SUB_SIZE, 400, C.ink);
    const rows: { s: string; at: number; o: TextOpts; lead: number }[] = [];
    for (const [s, at] of hl.lines) for (const l of wrap(ctx, s, ho)) rows.push({ s: l, at, o: ho, lead: 64 * u });
    if (hl.sub) for (const l of wrap(ctx, hl.sub[0], so)) rows.push({ s: l, at: hl.sub[1], o: so, lead: 44 * u });
    // the panel grows (on a small spring) to the rows revealed so far, so it never shows an empty row
    const grow = rows.map((r, i) => (i === 0 ? 1 : clamp(ease.outBack(prog(F, r.at - 3, r.at + 7)), 0, 1.06)));
    const tw = tall
      ? maxText
      : rows.reduce(
          (acc, r, i) =>
            i === 0 ? measure(ctx, r.s, r.o) : lerp(acc, Math.max(acc, measure(ctx, r.s, r.o)), clamp(grow[i]!)),
          0,
        );
    const h =
      rows.reduce((a, r, i) => a + (r.lead + (i && r.o !== rows[i - 1]!.o ? 10 * u : 0)) * grow[i]!, 0) +
      2 * PAD -
      8 * u;
    const x = L.safe.x,
      y = L.safe.top,
      w = tw + 2 * PAD;
    if (!draw) return { x, y, w, h };
    const inA = ease.outCubic(prog(F, hl.from, hl.from + 10)),
      out = ease.inCubic(prog(F, hl.to - 10, hl.to));
    ctx.save();
    ctx.globalAlpha = inA * (1 - out);
    ctx.translate(0, -(1 - inA) * 16 * u - out * 16 * u);
    rr(ctx, x, y, w, h, 14 * u);
    ctx.globalAlpha *= 0.9;
    ctx.fillStyle = C.surface;
    ctx.fill();
    ctx.globalAlpha = inA * (1 - out);
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 1.5 * u;
    ctx.stroke();
    let by = y + PAD - 8 * u;
    rows.forEach((r, i) => {
      if (i && r.o !== rows[i - 1]!.o) by += 10 * u;
      by += r.lead;
      const e = ease.outCubic(prog(F, r.at, r.at + 12));
      if (e <= 0) return;
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, by - r.lead, w, r.lead + 14 * u);
      ctx.clip();
      text(ctx, r.s, x + PAD, by - 10 * u + (1 - e) * r.lead * 0.8, { ...r.o, alpha: e });
      ctx.restore();
    });
    ctx.restore();
    return { x, y, w, h };
  };

  // ---- the counter card: km in JetBrains Mono, a date chip under it
  const counterRect: Rect = tall
    ? { x: L.safe.x, y: cardTop, w: W - 2 * L.safe.x, h: 110 * u }
    : { x: W - L.safe.x - 340 * u, y: L.safe.top, w: 340 * u, h: 156 * u };
  const counter = (ctx: Ctx, F: number) => {
    const a = ease.outCubic(prog(F, 96, 116));
    if (a <= 0) return;
    const r = counterRect,
      km = kmAt(F);
    // the slam at 840: the number swells as the bird closes in, then 70,900 lands hard and the card jolts
    const hit = F >= 840 ? F - 840 : -1,
      jolt = hit >= 0 ? 12 * u * Math.exp(-hit / 4) * Math.cos(hit * 1.1) : 0,
      scl =
        hit < 0
          ? 1 + (tall ? 0.06 : 0.14) * ease.inCubic(prog(F, 822, 840))
          : 1 - 0.1 * Math.exp(-hit / 3.5) * Math.cos(hit * 0.8);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(0, (1 - a) * (tall ? 30 : -30) * u + jolt);
    // the whole card swells as the bird closes in and slams down on the hit (scaled about its own centre)
    ctx.translate(r.x + r.w / 2, r.y + r.h / 2);
    ctx.scale(scl, scl);
    ctx.translate(-(r.x + r.w / 2), -(r.y + r.h / 2));
    rr(ctx, r.x, r.y, r.w, r.h, 14 * u);
    ctx.fillStyle = C.surface;
    ctx.fill();
    const flash = hit >= 0 ? Math.exp(-hit / 8) : 0;
    ctx.strokeStyle = flash > 0.05 ? C.accent : C.ink;
    ctx.lineWidth = (1.5 + 3 * flash) * u;
    ctx.stroke();
    const no = { ...mono(60, C.ink) },
      nx = r.x + 24 * u,
      ny = tall ? r.y + r.h / 2 + 21 * u : r.y + 76 * u,
      num = fmt(km),
      nw = measure(ctx, num, no),
      kmColor = F >= 840 ? C.accent : C.ink;
    text(ctx, num, nx, ny, { ...no, color: kmColor });
    text(ctx, "km", nx + nw + 12 * u, ny, mono(26));
    // the date chip flips to each stage's month
    const i = CHIPS.findIndex(([f], j) => F >= f && (j === CHIPS.length - 1 || F < CHIPS[j + 1]![0]));
    const chipA = tall ? 1 - prog(F, 996, 1004) : 1;
    if (tall && F >= 996) {
      // the vertical's footer lives in the card, in place of the date chip
      const fa = ease.outCubic(prog(F, 1000, 1014)),
        fo = { ...mono(24, C.ink), align: "right" as const, alpha: fa },
        fx = r.x + r.w - 24 * u;
      text(ctx, "routes simplified · 11 tracked birds", fx, r.y + 46 * u, fo);
      text(ctx, "2007–08 · Egevang et al., PNAS 2010", fx, r.y + 82 * u, fo);
    }
    if (i >= 0 && chipA > 0) {
      const [f0, m] = CHIPS[i]!,
        e = ease.outBack(prog(F, f0, f0 + 10)),
        prev = i > 0 ? CHIPS[i - 1]![1] : null,
        chipW = 86 * u,
        chipH = 40 * u,
        chX = tall ? r.x + r.w - 24 * u - chipW : nx,
        chY = tall ? r.y + (r.h - chipH) / 2 : r.y + 96 * u;
      ctx.save();
      ctx.globalAlpha *= chipA;
      rr(ctx, chX, chY, chipW, chipH, chipH / 2);
      ctx.fillStyle = C.ink;
      ctx.fill();
      ctx.clip();
      const co = { ...mono(24, C.ground), align: "center" as const },
        mid = chX + chipW / 2,
        base = chY + chipH / 2 + 8.5 * u;
      if (prev && e < 1) text(ctx, prev, mid, base - clamp(e) * chipH, co);
      text(ctx, m, mid, base + (1 - clamp(e)) * chipH, co);
      ctx.restore();
    }
    ctx.restore();
    // the pill that pops once the counter lands
    const pa = Math.min(ease.outBack(prog(F, 846, 860)), 1 - prog(F, 946, 958));
    if (pa > 0) {
      const po = sans(26, 600, C.ground),
        s = "on average, in one year",
        pw = measure(ctx, s, po) + 32 * u,
        ph = 46 * u,
        px = r.x + r.w - pw,
        py = tall ? r.y - 16 * u - ph : r.y + r.h + 16 * u;
      ctx.save();
      ctx.globalAlpha = clamp(pa);
      const k = 0.6 + 0.4 * pa;
      ctx.translate(px + pw, py + ph / 2);
      ctx.scale(k, k);
      ctx.translate(-(px + pw), -(py + ph / 2));
      rr(ctx, px, py, pw, ph, ph / 2);
      ctx.fillStyle = C.accent;
      ctx.fill();
      text(ctx, s, px + 16 * u, py + ph / 2 + 9.5 * u, po);
      ctx.restore();
    }
  };

  const footer = (ctx: Ctx, F: number) => {
    const a = ease.outCubic(prog(F, 996, 1012));
    if (a <= 0) return;
    const o = mono(24);
    if (!tall) pill(ctx, FOOTER, L.safe.x + 10 * u, H - L.safe.bottom - 16 * u, o, C.ground, "left", a); // (vertical: in the card)
  };

  // ---- a fork tag: the count at 56 px on a ground pill with an ink rule, popping on the hit
  const forkTag = (ctx: Ctx, n: string, x: number, y: number, align: "left" | "right", t: number) => {
    const no = sans(56),
      wo = sans(30, 600),
      nw = measure(ctx, n, no),
      ww = measure(ctx, " birds", wo),
      pw = nw + ww + 36 * u,
      ph = 74 * u,
      left = clamp(align === "left" ? x : x - pw, L.safe.x, W - L.safe.x - pw),
      k = 0.5 + 0.5 * t;
    ctx.save();
    ctx.globalAlpha = clamp(t);
    ctx.translate(left + pw / 2, y);
    ctx.scale(k, k);
    ctx.translate(-(left + pw / 2), -y);
    rr(ctx, left, y - ph / 2, pw, ph, ph / 2);
    ctx.fillStyle = C.ground;
    ctx.fill();
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 1.5 * u;
    ctx.stroke();
    text(ctx, n, left + 18 * u, y + 20 * u, no);
    text(ctx, " birds", left + 18 * u + nw, y + 20 * u, wo);
    ctx.restore();
  };

  // ---- the frame
  const paint = (ctx: Ctx, env: Env, F: number) => {
    F = clamp(F, 0, N - 1);
    ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
    ctx.fillStyle = C.ground; // the sheet's paper margin: the map is printed on it, framed by a double neatline
    ctx.fillRect(0, 0, W, H);
    const c = camera(F);
    drawMap(ctx, c, F);
    // the overlays' geometry first, so map labels can fade clear of the panel, the card and the pin cards
    const hGeom = headline(ctx, F, false),
      bd = bird(F),
      birds: Rect[] = [];
    if (F >= 12) {
      const [tx, ty] = proj(c, bd.p);
      birds.push({ x: tx - 30 * u, y: ty - 30 * u, w: 60 * u, h: 60 * u });
    }
    const avoid = [counterRect, ...(hGeom ? [hGeom] : []), ...birds],
      pinRects = PINS.map((pin) => pinLabel(ctx, c, pin, F, avoid, false)).filter((r): r is Rect => r !== null);
    // (the card only counts once it has arrived, at frame 96)
    mapLabels(ctx, c, F, [...(F >= 96 ? [counterRect] : []), ...(hGeom ? [hGeom] : []), ...pinRects]);
    winds(ctx, c, F);
    const s = along(F),
      pulse = F >= 960 ? lerp(0, S.end + 20, prog(F, 960, N - 1) ** 0.8) : null;
    const [x0, y0] = proj(c, [SHEET.w, SHEET.n]),
      [x1, y1] = proj(c, [SHEET.e, SHEET.s]);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, y0, x1 - x0, y1 - y0);
    ctx.clip();
    if (s > S.fork)
      drawRoute(
        ctx,
        c,
        BRANCH,
        branchAlong(s),
        pulse === null ? null : ((pulse - S.fork) / (S.join - S.fork)) * BRANCH.len,
      );
    drawRoute(ctx, c, ROUTE, s, pulse);
    ctx.restore();
    for (const pin of PINS) pinMark(ctx, c, pin, F);
    // the fork's hit: two flat accent rings burst from the split point
    for (const [f0, R] of [
      [330, 170],
      [334, 110],
    ] as [number, number][]) {
      const t = F - f0;
      if (t < 0 || t >= 24) continue;
      const e = ease.outCubic(t / 24),
        [fx, fy] = proj(c, pointAt(ROUTE, S.fork));
      ctx.save();
      ctx.globalAlpha = 1 - t / 24;
      ctx.strokeStyle = C.accent;
      ctx.lineWidth = lerp(6, 1.5, e) * u;
      ctx.beginPath();
      ctx.arc(fx, fy, lerp(10, R, e) * u, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    // the travellers: one on the main route, a second on the Brazil branch while the routes are split
    const tq = u * (1 + 0.12 * c.zf);
    if (s > S.fork && s < S.join) {
      const b = branchAlong(s),
        [bx, by] = proj(c, pointAt(BRANCH, b));
      tern(ctx, bx, by, headingAt(BRANCH, Math.max(b, 1)), F + 3, tq);
    }
    if (F >= 12) {
      const [tx, ty] = proj(c, bd.p);
      tern(ctx, tx + bd.off[0], ty + bd.off[1], bd.ang, F, tq);
    }
    // the split, counted at each branch's head
    const tagA = Math.min(clamp(ease.outBack(prog(F, 331, 341))), 1 - prog(F, 462, 474));
    if (tagA > 0) {
      const a = proj(c, pointAt(ROUTE, s)),
        b = proj(c, pointAt(BRANCH, branchAlong(s)));
      forkTag(ctx, "7", a[0] + 34 * u, a[1] + 40 * u, "left", tagA);
      forkTag(ctx, "4", b[0] - 34 * u, b[1] + 40 * u, "right", tagA);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(grain(env).canvas, 0, 0);
    ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
    headline(ctx, F);
    counter(ctx, F);
    for (const pin of PINS) pinLabel(ctx, c, pin, F, avoid);
    footer(ctx, F);
  };

  const cuts = [0, T.stop, T.fork, T.south, T.home, T.total, T.end, N],
    names = ["hook", "stopover", "fork", "far-south", "way-home", "total", "end-card"];
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
    audio: beatScore({
      frames: N,
      fps: FPS,
      bpm: BPM,
      mood: "drive",
      drop: T.stop,
      hits: HITS,
      whooshes: WHOOSH,
      ticks: [...Object.values(PIN_LAND), ...CHIPS.map((c) => c[0]), ...COUNTER_TICKS].sort((a, b) => a - b),
      sign: T.end,
    }),
  };
}

export const routeMap = make("landscape", "routeMap");
export const routeMapVertical = make("vertical", "routeMapVertical");
