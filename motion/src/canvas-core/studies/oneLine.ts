// STUDY 38 · ONE LINE (30 s, 30 fps, 120 bpm). How a bean seed germinates, drawn by ONE ink stroke that never
// lifts: it enters at the left edge as the soil line, dips to draw the subject, comes back up and leaves at the right
// edge, and every drawing morphs into the next. One source, designed for landscape and vertical. Brand: the neutral
// pack, palette "meadow". Brief: series/studies/briefs/one-line.json · prompt: series/studies/prompts/one-line.prompt.md
// Learns from Osvaldo Cavandoli's La Linea and the contour-line tradition (credited in the brief, nothing copied).
//
// How the line works (all pure functions of the frame):
//  - Every drawing is authored as ONE open path of cubic Bézier segments, cut into named SECTIONS (soil, stem, the two
//    seed halves, root, true leaves, sun, the "needs" marks). Each section is resampled by arc length to a fixed point
//    budget, so every drawing is the same number of points in the same order (soil first, subject, soil last).
//  - A part a drawing does not have is its section collapsed to the point where it will grow from; a morph
//    interpolates the point lists point-for-point, so the part grows out of that point and the line never breaks.
//  - Out-and-back spurs (root, veins) retrace themselves; the wobble is a displacement FIELD of position and time,
//    so a retraced stroke stays one stroke.
import PACK from "../../../brand/packs/studio/pack.json";
import { rng, type Ctx, type Env } from "../core";
import type { Film, Shot } from "../film";
import { motionBlur } from "../kit/blur";
import { clamp, ease, lerp, prog, spring } from "../kit/motion";
import { usePack } from "../kit/pack";
import { beatScore } from "../kit/score";
import { layout, type Size } from "../kit/sizes";
import { measure, text } from "../kit/type";

const P = usePack(PACK),
  C = P.palette("meadow"),
  F_ = P.face;
const FPS = 30,
  BPM = 120,
  N = 900; // a beat is 15 frames
// the story, in frames (every section starts on a beat)
const T = { needs: 120, water: 240, root: 375, hook: 510, leaves: 645, light: 780, sign: 840 };
// the line's life: the draw-on, then morph i takes drawing i to drawing i + 1 (each lands on its beat)
// the opening stroke snaps across the frame and draws the seed in under a second
const DRAW = [0, 27] as const;
// each morph is short and SNAPS into its drawing on the beat: it accelerates, overshoots a little and settles
const MORPHS: [number, number][] = [
  [132, 150], // 0 → 1 the needs rise out of the soil
  [222, 240], // 1 → 2 they sink back; three drops slide to the seed, which swells
  [286, 300], // 2 → 3 the coat splits
  [357, 375], // 3 → 4 the root breaks out of the seed
  [422, 435], // 4 → 5 it runs deeper and branches
  [488, 510], // 5 → 6 the stem hooks up through the soil
  [555, 570], // 6 → 7 the hook rises and pulls the seed up to the surface
  [627, 645], // 7 → 8 the hook straightens; the seed opens into two seed leaves
  [702, 720], // 8 → 9 the true leaves unfold
  [762, 780], // 9 → 10 the line loops into a sun
];
/** the snap: starts from rest (t²), overshoots about 7 % near the end and settles exactly on the arrival */
const snap = (t: number) => ease.outBack(t * t, 1.4);

// ---- the sections, in path order, with their point budgets (A = D + cotyR: in the early drawings it retraces them)
const SECS: [string, number][] = [
  ["soilL", 110],
  ["C", 90],
  ["cotyL", 150],
  ["plum", 320],
  ["cotyR", 150],
  ["D", 90],
  ["A", 240],
  ["root", 240],
  ["B", 240],
  ["soilM", 50],
  ["sunUp", 50],
  ["sunRing", 200],
  ["sunDn", 50],
  ["soilN", 60],
  ["nd1", 60],
  ["nd2", 60],
  ["nd3", 60],
  ["nAir", 130],
  ["nTh", 120],
  ["soilR", 90],
];
const RANGE: Record<string, [number, number]> = {};
let NPTS = 0;
for (const [name, n] of SECS) {
  RANGE[name] = [NPTS, NPTS + n];
  NPTS += n;
}
const SOIL = new Set(["soilL", "soilM", "soilN", "soilR"]);
const SKIP_DRAW = new Set(["A", "root", "B"]); // retraces: invisible in the first drawing, skipped by the draw-on

type Pt = [number, number];
const mix = (a: Pt, b: Pt, t: number): Pt => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];

// ---- a pen that writes cubic segments into dense samples and cuts them into named sections
class Pen {
  pts: Pt[];
  secs: Record<string, Pt[]> = {};
  private last = 0;
  constructor(p: Pt) {
    this.pts = [p];
  }
  get at(): Pt {
    return this.pts[this.pts.length - 1]!;
  }
  c(c1: Pt, c2: Pt, p: Pt, n = 28) {
    const p0 = this.at;
    for (let i = 1; i <= n; i++) {
      const t = i / n,
        m = 1 - t;
      this.pts.push([
        m * m * m * p0[0] + 3 * m * m * t * c1[0] + 3 * m * t * t * c2[0] + t * t * t * p[0],
        m * m * m * p0[1] + 3 * m * m * t * c1[1] + 3 * m * t * t * c2[1] + t * t * t * p[1],
      ]);
    }
    return this;
  }
  l(p: Pt, n = 10) {
    const p0 = this.at;
    return this.c(mix(p0, p, 1 / 3), mix(p0, p, 2 / 3), p, n);
  }
  /** an arc (or spiral, r0 → r1) from angle a0 to a1 around (cx, cy), as cubic quarter segments; starts at the pen */
  arc(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number) {
    const n = Math.max(1, Math.ceil(Math.abs(a1 - a0) / (Math.PI / 2))),
      da = (a1 - a0) / n,
      k = (4 / 3) * Math.tan(da / 4);
    for (let i = 0; i < n; i++) {
      const t0 = a0 + i * da,
        t1 = t0 + da,
        ra = lerp(r0, r1, i / n),
        rb = lerp(r0, r1, (i + 1) / n),
        dr = (rb - ra) / 3;
      const p3: Pt = [cx + rb * Math.cos(t1), cy + rb * Math.sin(t1)],
        p0 = this.at;
      this.c(
        [p0[0] - k * ra * Math.sin(t0) + dr * Math.cos(t0), p0[1] + k * ra * Math.cos(t0) + dr * Math.sin(t0)],
        [p3[0] + k * rb * Math.sin(t1) - dr * Math.cos(t1), p3[1] - k * rb * Math.cos(t1) - dr * Math.sin(t1)],
        p3,
      );
    }
    return this;
  }
  add(ps: Pt[]) {
    for (const p of ps) this.pts.push(p);
    return this;
  }
  /** close the current section (it shares its first point with the previous one's last) */
  end(name: string) {
    this.secs[name] = this.pts.slice(this.last);
    this.last = this.pts.length - 1;
    return this;
  }
}

const resample = (d: Pt[], n: number): Pt[] => {
  const L = [0];
  for (let i = 1; i < d.length; i++) L.push(L[i - 1]! + Math.hypot(d[i]![0] - d[i - 1]![0], d[i]![1] - d[i - 1]![1]));
  const tot = L[L.length - 1]!;
  if (tot < 1e-6) return Array.from({ length: n }, (): Pt => [d[0]![0], d[0]![1]]);
  const out: Pt[] = [];
  let j = 0;
  for (let i = 0; i < n; i++) {
    const s = (tot * i) / (n - 1);
    while (j < d.length - 2 && L[j + 1]! < s) j++;
    out.push(mix(d[j]!, d[j + 1]!, clamp((s - L[j]!) / (L[j + 1]! - L[j]! || 1))));
  }
  return out;
};

/** the offset contours of a centre line (dense points), g to its left and right */
const tube = (centre: Pt[], g: number) => {
  const left: Pt[] = [],
    right: Pt[] = [];
  centre.forEach((p, i) => {
    const a = centre[Math.max(0, i - 1)]!,
      b = centre[Math.min(centre.length - 1, i + 1)]!,
      len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1,
      tx = (b[0] - a[0]) / len,
      ty = (b[1] - a[1]) / len;
    left.push([p[0] + g * ty, p[1] - g * tx]);
    right.push([p[0] - g * ty, p[1] + g * tx]);
  });
  return { left, right };
};

type Geo = {
  x0: number;
  soil: number;
  s: number; // subject scale
  up: number; // extra height for the plant
  dn: number; // extra depth for the root
  g: number; // stem half-width
  sun: { x: number; y: number; r: number; base: [number, number] };
  needs: { x: number; end: number; rd: number; hd: number }; // the needs marks (drawing 1)
  rest: number; // where the flat needs sections lie once the plant has grown (after the sun's base)
  W: number;
};

// ---- the drawings. Each returns one path from the left edge to the right edge, cut into every section in SECS.
function drawings(G: Geo) {
  const { x0, soil, s, up, dn, W } = G;
  const q = (dx: number, dy: number): Pt => [x0 + dx * s, soil + dy * s * (dy < 0 ? up : dn)];
  const edgeL: Pt = [-30, soil],
    edgeR: Pt = [W + 30, soil];
  // the bean, dry and swollen (a kidney about 1.8 times as long as it is tall; wider and rounder once it has drunk)
  const SEED = {
    dry: { w: 118 * s, h: 64 * s, top: 36 * s, dent: 13 * s },
    big: { w: 138 * s, h: 82 * s, top: 28 * s, dent: 12 * s },
  };

  // the seed (a kidney bean): cotyL is its east half (top → east → the hilum H below), cotyR the west half back up.
  // (east first, so the halves never swap sides when the seed later rises and opens into two leaves)
  const seed = (pen: Pen, cx: number, cy: number, w: number, h: number, dent: number, split: boolean) => {
    // east half: T → E → bottom-east → H
    if (split) {
      // the coat splits: a small crack in the upper east shoulder
      const a: Pt = [cx + w * 0.24, cy - h * 0.46],
        b: Pt = [cx + w * 0.4, cy - h * 0.3];
      pen.c([cx + w * 0.1, cy - h / 2], [cx + w * 0.18, cy - h * 0.49], a);
      pen.l([cx + w * 0.25, cy - h * 0.3], 8);
      pen.l([cx + w * 0.32, cy - h * 0.36], 6);
      pen.l([cx + w * 0.33, cy - h * 0.24], 6);
      pen.l(b, 8);
      pen.c([cx + w * 0.47, cy - h * 0.2], [cx + w / 2, cy - h * 0.1], [cx + w / 2, cy]);
    } else pen.c([cx + w * 0.3, cy - h / 2], [cx + w / 2, cy - h * 0.36], [cx + w / 2, cy]);
    // a kidney: round lobes at both ends and a broad, shallow concave belly with the hilum in its middle
    pen.c([cx + w / 2, cy + h * 0.36], [cx + w * 0.45, cy + h / 2], [cx + w * 0.32, cy + h / 2]);
    pen.c([cx + w * 0.2, cy + h / 2], [cx + w * 0.13, cy + h / 2 - dent], [cx, cy + h / 2 - dent]);
    pen.end("cotyL").end("plum");
    // west half: H → the hilum scar (a small eye lying in the concave side) → W → T
    const Hx = cx,
      Hy = cy + h / 2 - dent;
    pen.c([Hx - w * 0.03, Hy - h * 0.12], [Hx - w * 0.11, Hy - h * 0.12], [Hx - w * 0.14, Hy - h * 0.03]);
    pen.c([Hx - w * 0.1, Hy - h * 0.01], [Hx - w * 0.04, Hy], [Hx, Hy]);
    pen.c([cx - w * 0.13, cy + h / 2 - dent], [cx - w * 0.2, cy + h / 2], [cx - w * 0.32, cy + h / 2]);
    pen.c([cx - w * 0.45, cy + h / 2], [cx - w / 2, cy + h * 0.36], [cx - w / 2, cy]);
    pen.c([cx - w / 2, cy - h * 0.36], [cx - w * 0.3, cy - h / 2], [cx, cy - h / 2]);
    pen.end("cotyR");
  };

  // an oval leaf from base b along angle ang (length len, width wid), traced round back to b
  const oval = (pen: Pen, b: Pt, ang: number, len: number, wid: number, flip = false) => {
    const d: Pt = [Math.cos(ang), Math.sin(ang)],
      n: Pt = [-d[1] * (flip ? -1 : 1), d[0] * (flip ? -1 : 1)];
    const at = (u: number, v: number): Pt => [b[0] + d[0] * u + n[0] * v, b[1] + d[1] * u + n[1] * v];
    const a = len / 2,
      w = wid / 2,
      k = 0.5523;
    pen.l(at(0, 0), 2);
    pen.c(at(0, w * k), at(a - a * k, w), at(a, w));
    pen.c(at(a + a * k, w), at(len, w * k), at(len, 0));
    pen.c(at(len, -w * k), at(a + a * k, -w), at(a, -w));
    pen.c(at(a - a * k, -w), at(0, -w * k), at(0, 0));
  };
  // a pointed true leaf with its midrib (a vein spur that retraces itself)
  const pointed = (pen: Pen, b: Pt, ang: number, len: number, wid: number) => {
    const d: Pt = [Math.cos(ang), Math.sin(ang)],
      n: Pt = [-d[1], d[0]];
    const at = (u: number, v: number): Pt => [b[0] + d[0] * u + n[0] * v, b[1] + d[1] * u + n[1] * v];
    pen.c(at(len * 0.18, wid * 0.55), at(len * 0.62, wid * 0.62), at(len, 0));
    pen.c(at(len * 0.62, -wid * 0.62), at(len * 0.18, -wid * 0.55), at(0, 0));
    pen.c(at(len * 0.25, wid * 0.04), at(len * 0.5, wid * 0.05), at(len * 0.72, 0.02 * wid));
    pen.c(at(len * 0.5, wid * 0.05), at(len * 0.25, wid * 0.04), at(0, 0));
  };

  // the needs marks along the soil, and their flat rest state
  const flatNeeds = (pen: Pen, x: number, end: number) => {
    const names = ["nd1", "nd2", "nd3", "nAir", "nTh"],
      step = (end - x) / names.length;
    names.forEach((nm, i) => pen.l([x + step * (i + 1), soil]).end(nm));
  };
  const needsUp = (pen: Pen) => {
    const { x, end, rd, hd } = G.needs;
    // three drops standing on the soil (water)
    for (let i = 0; i < 3; i++) {
      const xk = x + rd * 1.6 + i * rd * 3.4;
      pen.l([xk - rd * 0.45, soil]);
      pen.c([xk - rd * 0.8, soil - rd * 0.1], [xk - rd, soil - rd * 0.5], [xk - rd, soil - rd]);
      pen.c([xk - rd, soil - rd * 1.7], [xk - rd * 0.25, soil - hd * 0.72], [xk, soil - hd]);
      pen.c([xk + rd * 0.25, soil - hd * 0.72], [xk + rd, soil - rd * 1.7], [xk + rd, soil - rd]);
      pen.c([xk + rd, soil - rd * 0.5], [xk + rd * 0.8, soil - rd * 0.1], [xk + rd * 0.45, soil]);
      pen.end(`nd${i + 1}`);
    }
    // a gust (air): the line lifts off, waves, curls and comes back down
    const ax = x + rd * 9.6,
      aw = hd * 2.3,
      ay = soil - hd * 1.05;
    pen.l([ax, soil]);
    pen.c([ax + aw * 0.06, soil - hd * 0.4], [ax + aw * 0.02, ay + hd * 0.2], [ax + aw * 0.14, ay]);
    pen.c([ax + aw * 0.28, ay - hd * 0.3], [ax + aw * 0.4, ay + hd * 0.25], [ax + aw * 0.56, ay]);
    pen.c([ax + aw * 0.68, ay - hd * 0.22], [ax + aw * 0.8, ay - hd * 0.1], [ax + aw * 0.86, ay - hd * 0.02]);
    pen.arc(ax + aw * 0.86, ay - hd * 0.2, hd * 0.18, hd * 0.1, Math.PI / 2, -Math.PI * 1.1);
    pen.c([ax + aw * 0.8, ay + hd * 0.2], [ax + aw * 0.95, soil - hd * 0.2], [ax + aw, soil]);
    pen.end("nAir");
    // a thermometer (warmth): a bulb on the soil, a tube, a rounded cap
    const tx = Math.min(end - rd * 2.2, ax + aw + hd * 1.5),
      rb = hd * 0.3,
      tw = hd * 0.1,
      th = hd * 1.9;
    pen.l([tx - rb * 0.75, soil]);
    pen.c([tx - rb * 1.35, soil - rb * 0.6], [tx - rb * 0.9, soil - rb * 1.9], [tx - tw, soil - rb * 1.85]);
    pen.l([tx - tw, soil - th]);
    pen.arc(tx, soil - th, tw, tw, Math.PI, Math.PI * 2);
    pen.l([tx + tw, soil - rb * 1.85]);
    pen.c([tx + rb * 0.9, soil - rb * 1.9], [tx + rb * 1.35, soil - rb * 0.6], [tx + rb * 0.75, soil]);
    pen.l([end, soil]).end("nTh");
  };
  const drops = (pen: Pen, x: number, end: number) => {
    // three drops hanging from the soil line, soaking down beside the swollen seed
    const rd = 11 * s,
      hd = 40 * s;
    for (let i = 0; i < 3; i++) {
      const xk = x + rd * 1.2 + i * rd * 3.1,
        y = soil;
      pen.l([xk, y], 6);
      pen.c([xk - rd * 0.15, y + hd * 0.3], [xk - rd, y + hd - rd * 1.9], [xk - rd, y + hd - rd]);
      pen.arc(xk, y + hd - rd, rd, rd, Math.PI, 0);
      pen.c([xk + rd, y + hd - rd * 1.9], [xk + rd * 0.15, y + hd * 0.3], [xk, y]);
      pen.end(`nd${i + 1}`);
    }
    const step = (end - pen.at[0]) / 2;
    pen.l([pen.at[0] + step, soil]).end("nAir");
    pen.l([end, soil]).end("nTh");
  };

  // the sun, collapsed at a point on the soil (x) or looped up into the sky
  const sunFlat = (pen: Pen, x: number) => pen.l([x, soil]).end("soilM").end("sunUp").end("sunRing").end("sunDn");
  const sunUp = (pen: Pen) => {
    const { x, y, r, base } = G.sun;
    pen.l([base[0], soil]).end("soilM");
    // near the right edge the line leaves the soil, climbs to the sun's heart, spirals out one and a half turns
    // (clockwise) and leaves the frame through the sky: the sun is the end of the line
    const start: Pt = [x, y + r * 0.22];
    pen.c([base[0] - 10 * s, soil - (soil - y) * 0.5], [x + r * 0.4, y + r * 2.4], start).end("sunUp");
    pen.arc(x, y, r * 0.22, r, Math.PI / 2, Math.PI / 2 + Math.PI * 3).end("sunRing");
    pen.c([x + r * 0.9, y - r], [W - 120 * s, y - r * 1.25], [W + 60, y - r * 1.1]).end("sunDn");
  };

  const sec = (pen: Pen) => pen.secs;
  const fin = (secs: Record<string, Pt[]>, retrace: boolean) => {
    const out: Record<string, Pt[]> = {};
    for (const [nm, n] of SECS) {
      if (nm === "A" || nm === "B") continue;
      out[nm] = resample(secs[nm]!, n);
    }
    if (retrace) {
      // the root's way down and back up retraces the stem's return and the seed's west half, point for point
      out.A = [...[...out.D!].reverse(), ...[...out.cotyR!].reverse()];
    } else out.A = resample(secs.A!, RANGE.A![1] - RANGE.A![0]);
    out.B = [...out.A].reverse();
    const flat: Pt[] = [];
    for (const [nm] of SECS) flat.push(...out[nm]!);
    return flat;
  };

  // --- 0: the bean seed below the soil line, hung from a narrow dip
  const early = (step: "seed" | "needs" | "wet" | "split" | "root", grown = 1) => {
    const big = step !== "seed" && step !== "needs";
    const { w, h, top, dent } = big ? SEED.big : SEED.dry,
      cx = x0,
      cy = soil + top + h / 2;
    const a = q(-G.g / s, 0),
      b = q(G.g / s, 0),
      Tp: Pt = [cx, cy - h / 2];
    const pen = new Pen(edgeL);
    pen.l(a, 20).end("soilL");
    pen.c([a[0], a[1] + top * 0.4], [Tp[0] - 3 * s, Tp[1] - top * 0.4], Tp).end("C");
    seed(pen, cx, cy, w, h, dent, step === "split" || step === "root");
    pen.c([Tp[0] + 3 * s, Tp[1] - top * 0.4], [b[0], b[1] + top * 0.4], b).end("D");
    // the root: collapsed at the hilum, then a spur that curves down and branches once (retraced)
    const H: Pt = [cx, cy + h / 2 - dent];
    const pts: Pt[] = [];
    if (step === "root") {
      // just broken out (grown 0): short, the branch a bud; grown 1: deeper, branched
      const L = lerp(80, 135, grown) * s * dn,
        bs = lerp(0.2, 1, grown);
      const main = new Pen(H).c(
        [H[0] + 4 * s, H[1] + L * 0.3],
        [H[0] - 26 * s, H[1] + L * 0.6],
        [H[0] - 8 * s, H[1] + L],
      ).pts;
      const k = Math.floor(main.length * 0.42),
        bp = main[k]!;
      const branch = new Pen(bp).c(
        [bp[0] + 14 * s * bs, bp[1] + 10 * s * bs],
        [bp[0] + 34 * s * bs, bp[1] + 18 * s * bs],
        [bp[0] + 46 * s * bs, bp[1] + 44 * s * bs],
      ).pts;
      const m1 = main.slice(0, k + 1),
        m2 = main.slice(k);
      pts.push(...m1, ...branch, ...[...branch].reverse(), ...m2, ...[...m2].reverse(), ...[...m1].reverse());
    }
    const secs = sec(pen);
    secs.root = pts.length ? pts : [H];
    // the rest of the soil: sun (collapsed), then the needs
    const p2 = new Pen(b);
    if (step === "root") sunFlat(p2, G.sun.base[0]);
    else sunFlat(p2, x0 + 60 * s);
    if (step === "needs") {
      p2.l([G.needs.x, soil]).end("soilN");
      needsUp(p2);
    } else if (step === "wet" || step === "split") {
      p2.l([x0 + w / 2 + 34 * s, soil]).end("soilN");
      drops(p2, p2.at[0], G.rest);
    } else if (step === "root") {
      p2.l([G.rest, soil]).end("soilN");
      flatNeeds(p2, G.rest, G.rest + 260 * s);
    } else {
      p2.l([G.needs.x, soil]).end("soilN");
      flatNeeds(p2, G.needs.x, G.needs.end);
    }
    p2.l(edgeR, 20).end("soilR");
    Object.assign(secs, p2.secs);
    return fin(secs, true);
  };

  // the root once the plant stands on it: the same spur, hung from the stem's east foot straight down to J
  const rootFrom = (pen: Pen, J: Pt, L: number, grown: boolean) => {
    pen.c([pen.at[0], pen.at[1] + 10 * s], [J[0] + 2 * s, J[1] - 20 * s], J).end("A");
    const main = new Pen(J).c(
      [J[0] + 4 * s, J[1] + L * 0.3],
      [J[0] - 26 * s, J[1] + L * 0.6],
      [J[0] - (grown ? 14 : 8) * s, J[1] + L],
    ).pts;
    const k = Math.floor(main.length * 0.42),
      bp = main[k]!;
    const bl = grown ? 1.25 : 1;
    const branch = new Pen(bp).c(
      [bp[0] + 14 * s * bl, bp[1] + 10 * s * bl],
      [bp[0] + 34 * s * bl, bp[1] + 18 * s * bl],
      [bp[0] + 46 * s * bl, bp[1] + 44 * s * bl],
    ).pts;
    const m1 = main.slice(0, k + 1),
      m2 = main.slice(k);
    pen.add([...m1.slice(1), ...branch, ...[...branch].reverse(), ...m2, ...[...m2].reverse(), ...[...m1].reverse()]);
    pen.end("root");
    pen.l([pen.at[0] + G.g, soil]).end("B");
  };

  // the seed's hilum in the "root" drawing: where the root stays anchored once the stem rises
  const J: Pt = [x0, soil + SEED.big.top + SEED.big.h - SEED.big.dent];

  // --- the hook: the stem arches up through the soil; the seed hangs from its end at the surface
  // rise 1: the hook stands clear and the seed hangs at the surface; a lower rise: the hook has only just broken
  // through and the seed is still in the soil (the stem then pulls it up)
  const hook = (rise: number) => {
    const qr = (dx: number, dy: number) => q(dx, dy * rise + (rise < 1 ? (1 - rise) * 40 : 0));
    const centre = new Pen([x0, soil])
      .c(qr(0, -50), qr(-6, -105), qr(18, -128))
      .c(qr(40, -150), qr(78, -140), qr(84, -104))
      .c(qr(88, -80), qr(86, -60), qr(84, -46)).pts;
    const { left, right } = tube(centre, G.g);
    const pen = new Pen(edgeL);
    pen.l(left[0]!, 20).end("soilL");
    pen.add(left.slice(1)).end("C");
    // the seed hangs below the hook's end, turned on its side (its east half first, from the outer contour)
    const E = centre[centre.length - 1]!,
      w = 104 * s,
      h = 78 * s;
    const top: Pt = left[left.length - 1]!,
      back: Pt = right[right.length - 1]!;
    const cx = E[0],
      cy = E[1] + h / 2 + 2 * s;
    pen.c([top[0] + w * 0.3, top[1] + 2 * s], [cx + w / 2, cy - h * 0.3], [cx + w / 2, cy]);
    pen.c([cx + w / 2, cy + h * 0.32], [cx + w * 0.3, cy + h / 2], [cx, cy + h / 2]);
    pen.end("cotyL").end("plum");
    pen.c([cx - w * 0.3, cy + h / 2], [cx - w / 2, cy + h * 0.32], [cx - w / 2, cy]);
    pen.c([cx - w / 2, cy - h * 0.3], [back[0] - w * 0.3, back[1] + 2 * s], back);
    pen.end("cotyR");
    pen.add([...right].reverse().slice(1)).end("D");
    rootFrom(pen, J, lerp(135, 140, rise) * s * dn, false);
    sunFlat(pen, G.sun.base[0]);
    pen.l([G.rest, soil]).end("soilN");
    flatNeeds(pen, G.rest, G.rest + 260 * s);
    pen.l(edgeR, 20).end("soilR");
    return fin(pen.secs, false);
  };

  // --- the seedling: a straight stem, two round seed leaves; then true leaves; then the sun
  const plant = (step: "coty" | "true" | "sun") => {
    const stemH = 170;
    const centre = new Pen([x0, soil]).c(q(0, -60), q(5, -120), q(2, -stemH)).pts;
    const { left, right } = tube(centre, G.g);
    const pen = new Pen(edgeL);
    pen.l(left[0]!, 20).end("soilL");
    pen.add(left.slice(1)).end("C");
    const P1 = left[left.length - 1]!,
      P2 = right[right.length - 1]!;
    // the east seed leaf (from the west top, crossing the node)
    oval(pen, P1, -0.42, 78 * s, 50 * s, true);
    pen.end("cotyL");
    if (step === "coty") pen.l(P2, 4);
    else {
      // the shoot above the seed leaves: a short tube up to a node, two pointed true leaves, a bud between
      const top = q(1, -stemH - 88);
      const shoot = new Pen(P1).c(
        [P1[0], P1[1] - 30 * s * up],
        [top[0] - G.g, top[1] + 30 * s],
        [top[0] - G.g, top[1]],
      ).pts;
      pen.add(shoot.slice(1));
      const K2L = pen.at;
      pointed(pen, K2L, -Math.PI * 0.8, 92 * s, 40 * s);
      pen.c([K2L[0], K2L[1] - 12 * s], [K2L[0] + G.g * 2, K2L[1] - 12 * s], [top[0] + G.g, top[1]]);
      const K2R = pen.at;
      pointed(pen, K2R, -Math.PI * 0.2, 92 * s, 40 * s);
      const dn_ = new Pen(K2R).c([K2R[0], K2R[1] + 30 * s], [P2[0], P2[1] - 30 * s * up], P2).pts;
      pen.add(dn_.slice(1));
    }
    pen.end("plum");
    // the west seed leaf (from the east top, crossing back)
    oval(pen, P2, Math.PI + 0.42, 78 * s, 50 * s, false);
    pen.end("cotyR");
    pen.add([...right].reverse().slice(1)).end("D");
    rootFrom(pen, J, 165 * s * dn, true);
    if (step === "sun") sunUp(pen);
    else sunFlat(pen, G.sun.base[0]);
    pen.l([G.rest, soil]).end("soilN");
    flatNeeds(pen, G.rest, G.rest + 260 * s);
    pen.l(edgeR, 20).end("soilR");
    return fin(pen.secs, false);
  };

  return [
    early("seed"),
    early("needs"),
    early("wet"),
    early("split"),
    early("root", 0),
    early("root", 1),
    hook(0.62),
    hook(1),
    plant("coty"),
    plant("true"),
    plant("sun"),
  ];
}

// where the camera leans in each drawing: the middle of what is not soil
const focusOf = (pts: Pt[], soil: number): Pt => {
  let x0 = Infinity,
    x1 = -Infinity,
    y0 = Infinity,
    y1 = -Infinity;
  for (const [nm, [a, b]] of Object.entries(RANGE)) {
    if (SOIL.has(nm)) continue;
    for (let i = a; i < b; i++) {
      const [x, y] = pts[i]!;
      if (Math.abs(y - soil) < 2) continue;
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
    }
  }
  return x0 < x1 ? [(x0 + x1) / 2, (y0 + y1) / 2] : [0, soil];
};

// ---- captions: a headline (Inter 600) with one key word in the italic serif, and a muted line (Inter 400)
type Seg = { t: string; key: boolean };
type CWord = { segs: Seg[]; at: number; br?: boolean };
/** words of a line, one every `every` frames; *key words* in the italic; "\n" forces a line break */
const words = (line: string, start: number, every = 4): CWord[] => {
  let at = start,
    key = false;
  const out: CWord[] = [];
  for (const raw of line.replace(/\n/g, " \n ").split(" ").filter(Boolean)) {
    if (raw === "\n") {
      if (out.length) out[out.length - 1]!.br = true;
      continue;
    }
    const segs: Seg[] = [];
    for (const part of raw.split(/(\*)/)) {
      if (part === "*") key = !key;
      else if (part) segs.push({ t: part, key });
    }
    out.push({ segs, at });
    at += every * (/[.!?]$/.test(raw) ? 2.2 : /[,;:]$/.test(raw) ? 1.6 : 1);
  }
  return out;
};
type Cap = { head: CWord[]; sub?: CWord[]; out?: number; size?: number };

export function make(size: Size, id: string): Film {
  const L = layout(size),
    { W, H, u } = L,
    tall = L.tall;
  const G: Geo = tall
    ? {
        W,
        x0: 370,
        soil: Math.round(H * 0.62),
        s: 1.85,
        up: 0.85,
        dn: 0.55,
        g: 8,
        sun: { x: 620, y: 575, r: 64, base: [1040, 1040] },
        needs: { x: 500, end: 1040, rd: 17, hd: 70 },
        rest: W + 80,
      }
    : {
        W,
        x0: 700,
        soil: Math.round(H * 0.66),
        s: 1.6,
        up: 0.8,
        dn: 0.5,
        g: 7,
        sun: { x: 1560, y: 420, r: 78, base: [1880, 1880] },
        needs: { x: 930, end: 1500, rd: 24, hd: 88 },
        rest: W + 80,
      };
  const D = drawings(G);
  // per drawing, the points of every section that is collapsed to a single point in it
  const COLLAPSED = D.map((d) => {
    const out: boolean[] = Array.from({ length: NPTS }, () => false);
    for (const [a, b] of Object.values(RANGE)) {
      let m = 0;
      for (let j = a; j < b; j++) m = Math.max(m, Math.hypot(d[j]![0] - d[a]![0], d[j]![1] - d[a]![1]));
      if (m < 1) for (let j = a; j < b; j++) out[j] = true;
    }
    return out;
  });
  const FOCUS = D.map((d) => focusOf(d, G.soil));
  const soil = G.soil;

  // the line's pose at any fractional frame: a drawing, or two drawings mid-morph
  const pose = (F: number): { pts: Pt[]; k: number; e: number } => {
    let k = 0;
    for (let i = 0; i < MORPHS.length; i++) {
      const [a, b] = MORPHS[i]!;
      if (F >= b) k = i + 1;
      else if (F > a) {
        const t = prog(F, a, b),
          e = snap(t),
          ef = ease.inOutCubic(prog(F, a, a + (b - a) * 0.45)),
          fast = FAST[i],
          A = D[i]!,
          B = D[i + 1]!,
          flat = COLLAPSED[i + 1]!;
        // a part that shrinks back to a point must not overshoot through it
        return {
          pts: A.map((p, j) => mix(p, B[j]!, fast && fast(j) ? ef : flat[j] ? clamp(e) : e)),
          k: i,
          e: ease.inOutCubic(t),
        };
      }
    }
    return { pts: D[k]!, k, e: 0 };
  };
  // in the hook morph the root's retrace peels off the seed quickly, so its ghost outline is brief
  const inSec = (j: number, ...names: string[]) => names.some((n) => j >= RANGE[n]![0] && j < RANGE[n]![1]);
  const FAST: Record<number, (j: number) => boolean> = { 5: (j) => inSec(j, "A", "B") };
  // the camera: leans 2% toward the subject over every hold, eases back while the line moves
  const HOLDS: [number, number][] = [[DRAW[1], MORPHS[0]![0]]];
  for (let i = 0; i < MORPHS.length - 1; i++) HOLDS.push([MORPHS[i]![1], MORPHS[i + 1]![0]]);
  // and a framing per drawing, pivoted on the soil: close on the seed, easing out as the plant grows
  const FRAME = tall
    ? [1.35, 1.0, 1.35, 1.35, 1.28, 1.24, 1.16, 1.12, 1.0, 1.0, 1.0]
    : [1.25, 1.12, 1.25, 1.25, 1.2, 1.18, 1.12, 1.1, 1.0, 1.0, 1.0];
  const pivot: Pt = [G.x0, G.soil + 30 * u];
  const camera = (F: number) => {
    const { k, e } = pose(F);
    const f = e > 0 ? mix(FOCUS[k]!, FOCUS[k + 1]!, e) : FOCUS[k]!;
    const Z = e > 0 ? lerp(FRAME[k]!, FRAME[k + 1]!, e) : FRAME[k]!;
    let z = 1;
    if (F >= T.light) z = 1 + 0.045 * prog(F, T.light, N);
    else {
      for (const [a, b] of HOLDS) if (F >= a && F < b) z = 1 + 0.02 * ease.inOutCubic(prog(F, a, b));
      for (const [a, b] of MORPHS) if (F >= a && F < b) z = 1 + 0.02 * (1 - ease.inOutCubic(prog(F, a, b)));
    }
    // each arrival lands with a small punch-in that springs back (the whoosh ends on it)
    // (it rises over the last three frames of the morph, so no subframe straddles a jump)
    for (const [, b] of MORPHS)
      if (F >= b - 3 && F < b + 20)
        z *=
          1 + 0.035 * (F < b ? ease.inOutCubic(prog(F, b - 3, b)) : Math.exp(-(F - b) / 4) * Math.cos((F - b) * 0.35));
    return { f, z, Z };
  };

  // the hand: a slow displacement field of position and time (retraced strokes move together)
  const ph = rng(3838),
    p1 = ph() * 6.28,
    p2 = ph() * 6.28,
    p3 = ph() * 6.28;
  // plus a line boil: three takes of the same wobble, cycling every 5 frames, as hand-drawn cels do; it keeps
  // every hold alive (the take comes from the whole frame, so motion-blur subframes never mix two takes)
  const wob = (p: Pt, F: number): Pt => {
    const [x, y] = p,
      k = 1 / u,
      b = (Math.floor(Math.round(F) / 5) % 3) * 2.1;
    return [
      x +
        u *
          (1.1 * Math.sin(0.034 * k * x + 0.021 * k * y + 0.02 * F + p1 + b) +
            0.6 * Math.sin(0.011 * k * y - 0.015 * F + p3)),
      y +
        u *
          (1.2 * Math.sin(0.029 * k * x - 0.018 * k * y + 0.02 * F + p2 + b) +
            0.6 * Math.sin(0.012 * k * x + 0.015 * F + p1)),
    ];
  };

  // the draw-on order of the first drawing (retraces skipped), with the pen slowing on the subject
  const D0 = D[0]!;
  const order: number[] = [],
    cum: number[] = [];
  {
    let acc = 0,
      prev: Pt | null = null;
    for (const [nm] of SECS) {
      if (SKIP_DRAW.has(nm)) continue;
      const [a, b] = RANGE[nm]!,
        wgt = SOIL.has(nm) || nm.startsWith("n") || nm.startsWith("sun") ? 1 : 1.8;
      for (let i = a; i < b; i++) {
        const p = D0[i]!;
        if (prev) acc += Math.hypot(p[0] - prev[0], p[1] - prev[1]) * wgt;
        order.push(i);
        cum.push(acc);
        prev = p;
      }
    }
  }
  // the pen starts where the line enters the opening frame (the first framing is close, so the far left is off screen)
  const leftWorld = pivot[0] - (pivot[0] + 6 * u) / FRAME[0]!,
    cum0 =
      cum[
        Math.max(
          0,
          order.findIndex((i) => D0[i]![0] >= leftWorld),
        )
      ]!;
  const drawOn = (F: number) => {
    const t = prog(F, DRAW[0], DRAW[1]),
      e = 0.35 * t + 0.65 * ease.outCubic(t); // already racing on the first frame, easing into the right edge
    return (cum0 + e * (cum[cum.length - 1]! - cum0)) / cum[cum.length - 1]!;
  };

  let lw = 4 * u; // the stroke stays 4 px on screen whatever the framing
  const strokeLine = (ctx: Ctx, pts: Pt[]) => {
    ctx.beginPath();
    ctx.moveTo(pts[0]![0], pts[0]![1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i]![0], pts[i]![1]);
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = lw;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  };
  const fillPoly = (ctx: Ctx, pts: Pt[], color: string, alpha: number) => {
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.moveTo(pts[0]![0], pts[0]![1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i]![0], pts[i]![1]);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  };
  const slice = (pts: Pt[], nm: string) => pts.slice(RANGE[nm]![0], RANGE[nm]![1]);

  // labels for the needs, set in the soil under each mark
  const needLabels = (ctx: Ctx, F: number) => {
    const a = Math.min(prog(F, 138, 152), 1 - prog(F, 204, 216));
    if (a <= 0) return;
    const pts = D[1]!,
      mid = (nm: string | string[]) => {
        const ns = Array.isArray(nm) ? nm : [nm];
        let x0 = Infinity,
          x1 = -Infinity;
        for (const n of ns)
          for (const p of slice(pts, n))
            if (p[1] < soil - 3) {
              x0 = Math.min(x0, p[0]);
              x1 = Math.max(x1, p[0]);
            }
        return (x0 + x1) / 2;
      };
    const o = { size: 44 * u, family: F_.sans, weight: 600, color: C.ink, align: "center" as const, alpha: a };
    const y = soil + 62 * u,
      // a label never leaves the safe area (the thermometer sits near the right edge in the vertical)
      at = (t: string, x: number) => {
        const hw = measure(ctx, t, o) / 2;
        text(ctx, t, clamp(x, L.safe.x + hw, W - L.safe.x - hw), y, o);
      };
    at("water", mid(["nd1", "nd2", "nd3"]));
    at("air", mid("nAir"));
    at("warmth", mid("nTh"));
  };

  const world = (ctx: Ctx, env: Env, F: number) => {
    F = clamp(F, 0, N - 1);
    ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
    ctx.fillStyle = C.ground;
    ctx.fillRect(0, 0, W, H);
    const cam = camera(F);
    ctx.translate(pivot[0], pivot[1]);
    ctx.scale(cam.Z, cam.Z);
    ctx.translate(-pivot[0], -pivot[1]);
    lw = (4 * u) / (cam.Z * cam.z);
    ctx.translate(cam.f[0], cam.f[1]);
    ctx.scale(cam.z, cam.z);
    ctx.translate(-cam.f[0], -cam.f[1]);
    // the soil: a flat band under the line
    const { pts } = pose(F);
    let bandX = W * 2;
    if (F < DRAW[1]) {
      const target = drawOn(F) * cum[cum.length - 1]!;
      bandX = -W;
      for (let j = 0; j < order.length && cum[j]! <= target; j++) bandX = Math.max(bandX, pts[order[j]!]![0]);
    }
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = C.s1!;
    ctx.fillRect(-W, soil, bandX + W, H * 2);
    ctx.restore();

    const wp = pts.map((p) => wob(p, F));
    // the two flat fills, behind the line, after it has outlined them
    for (let i = 0; i < 3; i++) {
      const t0 = 246 + i * 8,
        a = prog(F, t0, t0 + 6) * (1 - prog(F, 336, 352));
      if (a <= 0) continue;
      // each drop fills with a small spring (the drip sounds on it), scaled about its own middle
      const poly = slice(wp, `nd${i + 1}`),
        k = F < 336 ? spring((F - t0) / FPS, { freq: 3.2, damp: 0.45 }) : 1;
      let mx = 0,
        my = 0;
      for (const [x, y] of poly) {
        mx += x;
        my += y;
      }
      mx /= poly.length;
      my /= poly.length;
      fillPoly(
        ctx,
        poly.map(([x, y]): Pt => [mx + (x - mx) * k, my + (y - my) * k]),
        C.accent2,
        a,
      );
    }
    const sa = prog(F, T.light + 2, T.light + 10);
    if (sa > 0) {
      // the sun fills with a spring, then pulses once on the sign-off chord
      const t = (F - T.sign) / FPS,
        pulse = t > 0 ? 0.07 * Math.sin(t * 2 * Math.PI * 2.2) * Math.exp(-t * 3.5) : 0,
        k = spring((F - T.light - 2) / FPS, { freq: 2.6, damp: 0.5 }) + pulse;
      const [sx, sy] = wob([G.sun.x, G.sun.y], F);
      ctx.save();
      ctx.globalAlpha = sa;
      ctx.beginPath();
      ctx.arc(sx, sy, G.sun.r * 0.97 * Math.max(0, k), 0, Math.PI * 2);
      ctx.fillStyle = C.accent;
      ctx.fill();
      ctx.restore();
    }

    if (F < DRAW[1]) {
      // the draw-on: the first drawing, trimmed by (weighted) length, with the nib at the moving end
      const p = drawOn(F);
      const target = p * cum[cum.length - 1]!;
      const vis: Pt[] = [];
      let tip: Pt = wp[order[0]!]!;
      for (let j = 0; j < order.length; j++) {
        const pj = wp[order[j]!]!;
        if (cum[j]! <= target) {
          vis.push(pj);
          tip = pj;
        } else {
          const a = wp[order[j - 1]!]!,
            t = (target - cum[j - 1]!) / (cum[j]! - cum[j - 1]! || 1);
          tip = mix(a, pj, t);
          vis.push(tip);
          break;
        }
      }
      if (vis.length > 1) strokeLine(ctx, vis);
      if (p < 1) {
        ctx.beginPath();
        ctx.arc(tip[0], tip[1], (4.5 * u * lw) / (4 * u), 0, Math.PI * 2);
        ctx.fillStyle = C.ink;
        ctx.fill();
      }
    } else strokeLine(ctx, wp);
    needLabels(ctx, F);
  };

  // ---- captions and the step counter, drawn sharp after the blurred world
  const CAPS: [number, Cap][] = [
    // the hook: the question lands inside the first half second, while the line snaps across and draws the seed
    [0, { head: words("How does a seed\nbecome a *plant*?", -6, 2), out: 44, size: 1.3 }],
    [
      56,
      {
        head: words("A bean seed holds a *tiny plant*", 54, 3),
        sub: words("and its own store of food.", 80, 3),
        out: 106,
      },
    ],
    [T.needs, { head: words("It needs *water*, air\nand the right warmth.", 124), out: 226 }],
    [
      T.water,
      { head: words("First it *drinks*.", 244), sub: words("The seed swells and its coat splits.", 272, 3), out: 361 },
    ],
    [
      T.root,
      { head: words("The *root* comes out first.", 379), sub: words("It's called the radicle.", 418, 3), out: 496 },
    ],
    [
      T.hook,
      {
        head: words("In a bean, the stem *hooks*", 514),
        sub: words("and pulls the seed leaves up through the soil.", 548, 3),
        out: 631,
      },
    ],
    [T.leaves, { head: [...words("*Seed leaves* first,\n", 649), ...words("then true leaves.", 694)], out: 766 }],
    [T.light, { head: [...words("When the stored food runs out,\n", 784), ...words("*light* takes over.", 814)] }],
  ];
  const cx0 = tall ? L.safe.x + 10 * u : 120 * u,
    cy0 = tall ? L.safe.top + 140 * u : 150 * u,
    maxW = tall ? W - 2 * cx0 : 1040 * u;
  const HEAD = (tall ? 60 : 64) * u,
    SUB = 44 * u;
  const segFont = (sg: Seg, size: number, weight: number) =>
    sg.key
      ? { size: size * 1.12, family: F_.italic, weight: 400, track: 0 }
      : { size, family: F_.sans, weight, track: -0.02 };
  const wordW = (ctx: Ctx, wd: CWord, size: number, weight: number) =>
    wd.segs.reduce((acc, sg) => acc + measure(ctx, sg.t, segFont(sg, size, weight)), 0);
  const paragraph = (
    ctx: Ctx,
    F: number,
    ws: CWord[],
    x: number,
    y: number,
    size: number,
    weight: number,
    color: string,
    out?: number,
  ) => {
    const space = size * 0.26,
      lh = size * 1.16,
      leave = out === undefined ? 0 : ease.inCubic(prog(F, out, out + 10));
    let cx = x,
      cy = y;
    ws.forEach((wd, i) => {
      const ww = wordW(ctx, wd, size, weight);
      if (cx > x && cx + ww > x + maxW) {
        cx = x;
        cy += lh;
      }
      const p = spring((F - wd.at) / FPS, { freq: 2.6, damp: 0.72 });
      if (p > 0.001) {
        ctx.save();
        ctx.globalAlpha = clamp(p * 1.6) * (1 - leave);
        ctx.translate(0, (1 - p) * size * 0.45 - leave * size * 0.35);
        let sx = cx;
        for (const sg of wd.segs) {
          const o = segFont(sg, size, weight);
          text(ctx, sg.t, sx, cy, { ...o, color });
          sx += measure(ctx, sg.t, o);
        }
        ctx.restore();
      }
      cx += ww + space;
      if (wd.br && i < ws.length - 1) {
        cx = x;
        cy += lh;
      }
    });
    return cy;
  };
  const captions = (ctx: Ctx, F: number) => {
    for (let i = 0; i < CAPS.length; i++) {
      const [start, cap] = CAPS[i]!,
        next = CAPS[i + 1]?.[0] ?? N;
      if (F < start || F >= next) continue;
      const yEnd = paragraph(ctx, F, cap.head, cx0, cy0, HEAD * (cap.size ?? 1), 600, C.ink, cap.out);
      if (cap.sub) paragraph(ctx, F, cap.sub, cx0, yEnd + SUB * 1.55, SUB, 400, C.muted, cap.out);
    }
  };
  const STEPS = [0, T.water, T.root, T.hook, T.leaves, T.light];
  const counter = (ctx: Ctx, F: number) => {
    const n = STEPS.filter((s) => F >= s).length,
      since = F - STEPS[n - 1]!,
      p = spring((since - (n === 1 ? 8 : 0)) / FPS, { freq: 2.4, damp: 0.7 }),
      x = W - (tall ? L.safe.x : 120 * u),
      y = tall ? L.safe.top + 50 * u : 118 * u;
    const o = { size: 32 * u, family: F_.mono, weight: 500, color: C.muted, align: "right" as const, track: 0.04 };
    const rest = measure(ctx, "/6", o);
    text(ctx, "/6", x, y, { ...o, alpha: prog(F, 8, 20) });
    ctx.save();
    ctx.beginPath();
    ctx.rect(x - rest - 50 * u, y - 38 * u, 50 * u, 50 * u);
    ctx.clip();
    text(ctx, String(n), x - rest, y + (1 - p) * 34 * u, { ...o, alpha: clamp(p * 1.5) });
    if (n > 1 && p < 1) text(ctx, String(n - 1), x - rest, y - p * 34 * u, { ...o, alpha: 1 - clamp(p * 1.5) });
    ctx.restore();
  };

  const cuts = [0, T.needs, T.water, T.root, T.hook, T.leaves, T.light, N],
    names = ["seed", "needs", "water", "root", "hook", "leaves", "light"];
  const shots: Shot[] = names.map((sid, i) => ({
    id: sid,
    start: cuts[i]!,
    end: cuts[i + 1]!,
    draw: (ctx, local, env) => {
      const F = cuts[i]! + local;
      // dense subframes while the line moves fast (a smear, not ghost copies); three for the boil in holds
      const moving = F < DRAW[1] + 1 || MORPHS.some(([a, b]) => F >= a - 1 && F <= b + 1);
      motionBlur(ctx, env, (c, dt) => world(c, env, F + dt), { samples: moving ? 10 : 3, shutter: 0.5 });
      ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
      captions(ctx, F);
      counter(ctx, F);
    },
  }));

  return {
    meta: { title: id, W, H, fps: FPS, bpm: BPM, durationFrames: N, raster: "cpu" },
    assets: { images: {}, fonts: P.assets },
    shots,
    audio: score,
  };
}

// ---- sound: a soft bright loop, a pen scratch while the line draws, whooshes into each morph, drips, a sign-off
const score = (sr: number): [Float32Array, Float32Array] => {
  const [L, R] = beatScore({
    frames: N,
    fps: FPS,
    bpm: BPM,
    mood: "soft",
    key: 5,
    whooshes: [T.water, T.root, 435, T.hook, 570, T.leaves, T.light],
    sign: T.sign,
    gain: 0.345,
  })(sr);
  const n = L.length,
    at = (f: number) => Math.round((f / FPS) * sr),
    noise = rng(3801);
  const add = (i: number, v: number, pan: number) => {
    if (i < 0 || i >= n) return;
    L[i] += v * (1 - pan) * 2 * 0.5;
    R[i] += v * pan * 2 * 0.5;
  };
  // the pen: a short band of paper noise every 3 frames while it draws, thinned and varied so it never buzzes
  const grain = (i0: number, vel: number, pan: number) => {
    const len = Math.round(0.022 * sr);
    let a = 0,
      b = 0;
    for (let k = 0; k < len; k++) {
      const x = noise() * 2 - 1;
      a += 0.35 * (x - a); // low-passed
      const y = a - b; // then high-passed: a papery band
      b += 0.08 * (a - b);
      const t = k / len;
      add(i0 + k, y * vel * Math.min(1, t / 0.2) * (1 - t) ** 1.5, pan);
    }
  };
  const scratch = (a: number, b: number) => {
    for (let f = a; f < b; f += 3)
      if (noise() > 0.3) grain(at(f) + Math.round(noise() * 0.01 * sr), 0.05 + 0.03 * noise(), 0.4 + 0.2 * noise());
  };
  scratch(DRAW[0] + 2, DRAW[1] - 4);
  scratch(MORPHS[8]![0] + 2, MORPHS[8]![1] - 2); // the true leaves unfold
  // a drip for each droplet as it fills
  for (let d = 0; d < 3; d++) {
    const i0 = at(246 + d * 8),
      len = Math.round(0.09 * sr);
    let ph = 0;
    for (let k = 0; k < len; k++) {
      const t = k / sr;
      ph += (1500 - 900 * Math.min(1, t / 0.05) + d * 120) / sr;
      add(i0 + k, Math.sin(2 * Math.PI * ph) * 0.07 * Math.exp(-t * 45) * Math.min(1, t / 0.002), 0.45 + d * 0.08);
    }
  }
  let peak = 1e-9;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(L[i]!), Math.abs(R[i]!));
  if (peak > 0.98)
    for (let i = 0; i < n; i++) {
      L[i] = (L[i]! * 0.98) / peak;
      R[i] = (R[i]! * 0.98) / peak;
    }
  return [L, R];
};

export const oneLine = make("landscape", "oneLine");
export const oneLineVertical = make("vertical", "oneLineVertical");
