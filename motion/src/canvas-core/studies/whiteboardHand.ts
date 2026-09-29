// STUDY 27 · WHITEBOARD HAND (34 s, 30 fps, 90 bpm). A whiteboard explainer speed-drawn by a drawn hand: how a
// rainbow forms, in four steps on one raindrop, a big picture and a recap, with an eraser wipe between ideas.
// One source, designed for landscape and vertical. Brand: the neutral pack, palette "whiteboard".
// Brief: series/studies/briefs/whiteboard-hand.json · prompt: series/studies/prompts/whiteboard-hand.prompt.md
//
// Every drawing is a list of polylines drawn on by arc length. The whole timeline (what is drawn when, where the
// pen is, which marker the hand holds) is one schedule built per size; paint(F) derives the frame from it alone.
// Optics: the incoming ray, the one reflection and the exit angles are traced; the colour spread INSIDE the drop
// is exaggerated so seven lines can be told apart (a note on the board says so), and each colour leaves at its
// true angle to the line back toward the sun (red about 42°, violet about 40°).
import PACK from "../../../brand/packs/studio/pack.json";
import type { Ctx, Env, Layer } from "../core";
import type { Film, Shot } from "../film";
import { clamp, ease, lerp, prog } from "../kit/motion";
import { usePack } from "../kit/pack";
import { beatScore } from "../kit/score";
import { layout, type Size } from "../kit/sizes";
import { measure, text, type TextOpts } from "../kit/type";

const P = usePack(PACK),
  C = P.palette("whiteboard"),
  F_ = P.face;
const FPS = 30,
  BPM = 90,
  N = 1020; // a beat is 20 frames
// the timeline, in frames (every cut on a beat)
const T = { hook: 0, step1: 100, step2: 240, step3: 360, step4: 480, big: 660, recap: 860 };
// the sound cues that mark drawings, on beats: the 42° label lands, the full bow completes, the marker is capped
const HIT42 = T.step4 + 100,
  BOW = T.big + 120,
  SIGN = T.recap + 100;
const WIPE = 20; // an erase-wipe takes one beat
/** the eraser accelerates and lands hard on the beat (slope 2.3 at the end), never easing to a stop */
const wipeEase = (q: number) => q * (0.35 + 0.65 * q * q);
const SPEC = ["s1", "s2", "s3", "s4", "s5", "s6", "s7"].map((k) => C[k]!);
const DEG = Math.PI / 180;

type Pt = [number, number];
type Geom = { pts: Pt[]; down: boolean[]; cum: number[]; len: number };
type Stroke = { g: Geom; color: string; w: number; dash?: number; alpha?: number };
type Draw = { kind: "draw"; start: number; end: number; strokes: Stroke[]; win: [number, number][] };
type Write = {
  kind: "write";
  start: number;
  end: number;
  s: string;
  x: number;
  y: number;
  o: TextOpts;
  w: number;
};
type Erase = { kind: "erase"; start: number; end: number; g: Geom };
type Item = Draw | Write | Erase;
type Scene = { start: number; items: Item[] };

// ---------------------------------------------------------------- geometry helpers
const geom = (paths: Pt[][]): Geom => {
  const pts: Pt[] = [],
    down: boolean[] = [],
    cum: number[] = [];
  let len = 0;
  for (const path of paths)
    path.forEach((p, i) => {
      if (pts.length) len += Math.hypot(p[0] - pts[pts.length - 1]![0], p[1] - pts[pts.length - 1]![1]);
      pts.push(p);
      down.push(i > 0);
      cum.push(len);
    });
  return { pts, down, cum, len };
};
const pointAt = (g: Geom, s: number): Pt => {
  if (s <= 0) return g.pts[0]!;
  for (let i = 1; i < g.pts.length; i++)
    if (g.cum[i]! >= s) {
      const a = g.pts[i - 1]!,
        b = g.pts[i]!,
        t = (s - g.cum[i - 1]!) / (g.cum[i]! - g.cum[i - 1]! || 1);
      return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
    }
  return g.pts[g.pts.length - 1]!;
};
const arcPts = (cx: number, cy: number, r: number, a0: number, a1: number, n = 40, r1 = r): Pt[] =>
  Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n,
      a = lerp(a0, a1, t),
      rr = lerp(r, r1, t);
    return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr];
  });
const seg = (a: Pt, b: Pt): Pt[] => [a, b];
const add = (a: Pt, b: Pt, k = 1): Pt => [a[0] + b[0] * k, a[1] + b[1] * k];
const hash = (n: number) => {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
};
/** an arrowhead (two short strokes) at tip, pointing along dir */
const chevron = (tip: Pt, dir: Pt, s: number): Pt[] => {
  const l = Math.hypot(dir[0], dir[1]) || 1,
    dx = dir[0] / l,
    dy = dir[1] / l;
  const back = (a: number): Pt => [
    tip[0] - s * (dx * Math.cos(a) - dy * Math.sin(a)),
    tip[1] - s * (dy * Math.cos(a) + dx * Math.sin(a)),
  ];
  return [back(0.5), tip, back(-0.5)];
};
/** marker hatching: parallel strokes at `deg`, `gap` apart, clipped to a polygon (even-odd) */
const hatch = (poly: Pt[], gap: number, deg: number): Pt[][] => {
  const a = deg * DEG,
    dx = Math.cos(a),
    dy = Math.sin(a),
    nx = -dy,
    ny = dx;
  const ds = poly.map((p) => p[0] * nx + p[1] * ny),
    lo = Math.min(...ds),
    hi = Math.max(...ds);
  const out: Pt[][] = [];
  let flip = false;
  for (let d = lo + gap / 2; d < hi; d += gap) {
    const ts: number[] = [];
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i]!,
        q = poly[(i + 1) % poly.length]!;
      const dp = p[0] * nx + p[1] * ny - d,
        dq = q[0] * nx + q[1] * ny - d;
      if (dp < 0 !== dq < 0) {
        const t = dp / (dp - dq),
          x = lerp(p[0], q[0], t),
          y = lerp(p[1], q[1], t);
        ts.push(x * dx + y * dy);
      }
    }
    ts.sort((m, n) => m - n);
    for (let k = 0; k + 1 < ts.length; k += 2) {
      const pa: Pt = [nx * d + dx * ts[k]!, ny * d + dy * ts[k]!],
        pb: Pt = [nx * d + dx * ts[k + 1]!, ny * d + dy * ts[k + 1]!];
      out.push(flip ? [pb, pa] : [pa, pb]);
    }
    flip = !flip;
  }
  return out;
};

// ---------------------------------------------------------------- the optics (one ray through one drop)
/** entry E, back-wall point B, exit X for a horizontal ray (travelling +x) at incidence i, drawn with index n */
const trace = (O: Pt, R: number, i: number, n: number) => {
  const E: Pt = [O[0] - R * Math.cos(i), O[1] - R * Math.sin(i)],
    r = Math.asin(Math.sin(i) / n),
    d1: Pt = [Math.cos(i - r), Math.sin(i - r)],
    chord = 2 * R * Math.cos(r),
    B = add(E, d1, chord);
  const nb: Pt = [(B[0] - O[0]) / R, (B[1] - O[1]) / R],
    k = 2 * (d1[0] * nb[0] + d1[1] * nb[1]),
    d2: Pt = [d1[0] - k * nb[0], d1[1] - k * nb[1]],
    X = add(B, d2, chord);
  return { E, B, X, d1 };
};
const INC = 59.5 * DEG; // red's incidence: 4r − 2i ≈ 42° with n = 1.331
const IDX = (k: number) => 1.331 + k * 0.022; // exaggerated spread for drawing (true violet is about 1.343)
const EXIT = (k: number) => (42 - (2 * k) / 6) * DEG; // the true exit angle to the line back toward the sun

// ---------------------------------------------------------------- the piece
export function make(size: Size, id: string): Film {
  const L = layout(size),
    { W, H, u, cx, cy } = L,
    V = L.tall;
  const INK = 7 * u,
    FINE = 4 * u;
  const REST: Pt = V ? [W - 200 * u, H - 330 * u] : [W - 230 * u, H - 150 * u],
    OUT: Pt = [W + 260 * u, H + 420 * u];
  const cap = (size_: number, color = C.ink): TextOpts => ({
    size: size_ * u,
    family: F_.sans,
    weight: 600,
    color,
    track: -0.01,
  });
  const monoO = (size_: number): TextOpts => ({ size: size_ * u, family: F_.mono, weight: 500, color: C.muted });

  // the schedule is built once per size, after the fonts are in (writes need their widths)
  let built: { scenes: Scene[]; all: Item[]; capAt: number; flashAt: number; flashPt: Pt } | null = null;
  const build = (ctx: Ctx) => {
    const scenes: Scene[] = [];
    let gap = 2,
      items: Item[] = [],
      t = 0;
    const scene = (start: number) => {
      items = [];
      scenes.push({ start, items });
      t = start;
    };
    const at = (f: number) => (t = f);
    const st = (paths: Pt[][], color = C.ink, w = INK, o: { dash?: number; alpha?: number } = {}): Stroke => ({
      g: geom(paths),
      color,
      w,
      ...o,
    });
    /** draw strokes one after another over `dur` frames (split by length), with a lift between strokes */
    const draw = (strokes: Stroke[], dur: number, lift = 2) => {
      const start = t,
        avail = dur - lift * (strokes.length - 1),
        wts = strokes.map((s) => Math.max(0.2, s.g.len) ** 0.6),
        sum = wts.reduce((a, b) => a + b, 0);
      let c = start;
      const win = strokes.map((_, k) => {
        const w: [number, number] = [c, c + (avail * wts[k]!) / sum];
        c = w[1] + lift;
        return w;
      });
      const it: Draw = { kind: "draw", start, end: start + dur, strokes, win };
      items.push(it);
      t = start + dur + gap;
      return it;
    };
    /** write a line of text left to right; returns its width */
    const write = (s: string, x: number, y: number, o: TextOpts, fpc = 0.7, min = 6) => {
      const w = measure(ctx, s, o),
        dur = Math.max(min, Math.round(s.length * fpc));
      items.push({ kind: "write", start: t, end: t + dur, s, x, y, o, w });
      t += dur + gap;
      return w;
    };
    /** a red underline under the word `word` of a line written at (x, y) */
    const underline = (line: string, word: string, x: number, y: number, o: TextOpts, dur = 6) => {
      const i = line.indexOf(word),
        x0 = x + measure(ctx, line.slice(0, i), o) - 4 * u,
        x1 = x + measure(ctx, line.slice(0, i + word.length), o) + 6 * u,
        yy = y + o.size * 0.2;
      draw(
        [
          st(
            [
              [
                [x0, yy + 2 * u],
                [lerp(x0, x1, 0.5), yy - 2 * u],
                [x1, yy + 3 * u],
              ],
            ],
            C.accent,
            6 * u,
          ),
        ],
        dur,
      );
    };
    /** a step number in a hand-drawn open circle, then its caption in two lines */
    const step = (n: number, lines: string[], key: string, x: number, y: number, sz: number, gap: number) => {
      const r = sz * 0.62,
        ccx = x + r,
        ccy = y - sz * 0.36;
      draw([st([arcPts(ccx, ccy, r, -100 * DEG, 230 * DEG, 36, r * 1.12)], C.ink, FINE)], 5);
      const no = cap(sz * 0.8);
      write(String(n), ccx - measure(ctx, String(n), no) / 2, y - sz * 0.07, no, 2);
      const tx = x + r * 2 + 22 * u;
      lines.forEach((ln, k) => write(ln, tx, y + k * gap, cap(sz), 0.55));
      const k = lines.findIndex((ln) => ln.includes(key));
      underline(lines[k]!, key, tx, y + k * gap, cap(sz), 5);
    };
    const sun = (x: number, y: number, r: number) => [
      st([arcPts(x, y, r, -80 * DEG, 285 * DEG, 30)], C.s2!),
      st(
        Array.from({ length: 8 }, (_, k) => {
          const a = (k / 8) * Math.PI * 2 - 0.3;
          return seg(
            [x + Math.cos(a) * r * 1.4, y + Math.sin(a) * r * 1.4],
            [x + Math.cos(a) * r * 1.85, y + Math.sin(a) * r * 1.85],
          );
        }),
        C.s2!,
        FINE + u,
      ),
    ];
    /** a stick figure standing on groundY, facing right; returns strokes and its eye */
    const viewer = (x: number, gy: number, h: number) => {
      const r = h * 0.13,
        hy = gy - h + r,
        neck: Pt = [x, hy + r],
        hip: Pt = [x, gy - h * 0.4],
        sh: Pt = [x, hy + r + h * 0.1],
        eye: Pt = [x + r * 0.45, hy - r * 0.12];
      return {
        eye,
        head: [x, hy] as Pt,
        strokes: [
          st([
            arcPts(x, hy, r, -90 * DEG, 275 * DEG, 24),
            [
              [x + r * 0.95, hy + r * 0.05],
              [x + r * 1.25, hy + r * 0.2],
              [x + r * 0.9, hy + r * 0.3],
            ],
          ]),
          st([
            [neck, hip, [x - h * 0.16, gy]],
            [hip, [x + h * 0.16, gy]],
          ]),
          st([[[x - h * 0.2, sh[1] + h * 0.2], sh, [x + h * 0.24, sh[1] - h * 0.06]]]),
        ],
      };
    };
    const rain = (x0: number, y0: number, x1: number, y1: number, n: number, len: number, seed: number) => {
      const out: Pt[][] = [];
      for (let k = 0; k < n; k++) {
        const col = k % 6,
          row = Math.floor(k / 6),
          rows = Math.ceil(n / 6);
        const x = lerp(x0, x1, (col + 0.5 + (hash(seed + k) - 0.5) * 0.5) / 6),
          y = lerp(y0, y1 - len, (row + (col % 2) * 0.5 + hash(seed + 40 + k) * 0.3) / rows);
        out.push(seg([x + len * 0.3, y], [x, y + len]));
      }
      return out;
    };
    const cloud = (x: number, y: number, w: number, h: number) => {
      const bumps: [number, number, number][] = [
        [-0.34, 0.1, 0.2],
        [-0.12, -0.12, 0.26],
        [0.16, -0.08, 0.22],
        [0.36, 0.12, 0.16],
      ];
      // the outline is the upper envelope of the bumps over a flat base, drawn as one closed stroke
      const base = y + h * 0.5,
        top = (px: number) =>
          Math.min(
            base,
            ...bumps.map(([bx, by, br]) => {
              const dx = px - (x + bx * w),
                r = br * w;
              return Math.abs(dx) < r ? y + by * h - Math.sqrt(r * r - dx * dx) : Infinity;
            }),
          );
      // rounded ends: a quadratic from the base up to where the bumps begin
      const corner = (sx: number): Pt[] => {
        const ex = x + sx * w * 0.5,
          ey = top(ex),
          bx = x + sx * w * 0.36;
        return Array.from({ length: 7 }, (_, i) => {
          const q = i / 6,
            m = 1 - q;
          return [m * m * bx + 2 * m * q * ex + q * q * ex, m * m * base + 2 * m * q * base + q * q * ey] as Pt;
        });
      };
      const outline: Pt[] = [[x + w * 0.36, base], ...corner(-1)];
      for (let k = 1; k < 48; k++) {
        const px = x + w * lerp(-0.5, 0.5, k / 48);
        outline.push([px, top(px)]);
      }
      outline.push(...corner(1).reverse());
      // hatching on the underside, clipped to the cloud
      const band = y + h * 0.16,
        under: Pt[] = outline.map(([px, py]) => [px, Math.max(py, band)] as Pt);
      return [st([outline]), st(hatch(under, 14 * u, 30), C.muted, FINE)];
    };
    const bow = (x: number, y: number, r0: number, a0 = 180 * DEG, a1 = 360 * DEG) =>
      SPEC.map((c, k) => st([arcPts(x, y, r0 - 18 * u * k, a0, a1, 48)], c, 18 * u));
    const zigzag = (seed: number): Geom => {
      const rows: Pt[] = [],
        gap = 138 * u;
      let k = 0;
      for (let y = H - 50 * u; y > -40 * u; y -= gap, k++) {
        const l = 60 * u + hash(seed + k) * 20 * u,
          r = W - 60 * u - hash(seed + 9 + k) * 20 * u;
        // every row slants the same way, so neighbouring passes stay one gap apart everywhere (no uncovered seams)
        if (k % 2) rows.push([r, y - gap * 0.3], [l, y]);
        else rows.push([l, y], [r, y - gap * 0.3]);
      }
      return geom([rows]);
    };
    const erase = (seed: number) => {
      items.push({ kind: "erase", start: t, end: t + WIPE, g: zigzag(seed) });
      t += WIPE + 6; // the eraser holds on its landing for a few frames before the marker comes back
    };

    // ======== 00 HOOK: the question first, big and fast; then sun, viewer, raincloud, bow
    scene(T.hook);
    const title = V ? ["How does a", "rainbow form?"] : ["How does a rainbow form?"],
      tO = cap(V ? 100 : 96),
      tx = (V ? 100 : 120) * u,
      ty = (V ? 320 : 170) * u,
      tLead = (V ? 108 : 0) * u;
    {
      const sx = (V ? 200 : 250) * u,
        sy = (V ? 600 : 400) * u,
        gy = (V ? 1380 : 950) * u;
      const vw = viewer((V ? 250 : 720) * u, gy, (V ? 250 : 230) * u);
      const cl: Pt = V ? [780 * u, 690 * u] : [1440 * u, 380 * u],
        cw = (V ? 440 : 470) * u,
        ch = (V ? 150 : 160) * u;
      const bx = (V ? 610 : 1430) * u,
        br = (V ? 360 : 400) * u;
      at(3);
      title.forEach((ln) => write(ln, tx, ty + title.indexOf(ln) * tLead, tO, 0.42));
      underline(title[title.length - 1]!, "rainbow", tx, ty + (title.length - 1) * tLead, tO, 5);
      draw(sun(sx, sy, 50 * u), 8);
      draw([...vw.strokes, st([seg([vw.head[0] - 150 * u, gy], [bx + br + 20 * u, gy])], C.ink, FINE)], 10);
      draw(cloud(cl[0], cl[1], cw, ch), 9);
      draw(
        [st(rain(cl[0] - cw * 0.42, cl[1] + ch * 0.6, cl[0] + cw * 0.42, gy - 30 * u, 24, 46 * u, 5), C.accent2, FINE)],
        6,
      );
      draw(bow(bx, gy, br), 24, 2);
    }

    // ======== 01–04 THE DROP: one board, four steps, captions accumulate
    scene(T.step1);
    erase(11);
    const O: Pt = V ? [560 * u, 1110 * u] : [610 * u, 500 * u],
      R = (V ? 360 : 280) * u;
    const rays = SPEC.map((_, k) => trace(O, R, INC, IDX(k))),
      E = rays[0]!.E,
      mid = rays[3]!;
    const capX = (V ? 100 : 1120) * u,
      capY = (k: number) => (V ? 262 + k * 128 : 250 + k * 172) * u,
      capS = V ? 44 : 48,
      capGap = (V ? 52 : 58) * u;
    const rayX0 = (V ? 40 : 90) * u;
    {
      // step 1: the drop, the sunlight, the bend at the surface
      draw(
        [
          st([arcPts(O[0], O[1], R, -95 * DEG, 268 * DEG, 64)], C.accent2),
          st([arcPts(O[0], O[1], R * 0.78, 200 * DEG, 232 * DEG, 8)], C.accent2, FINE),
        ],
        20,
      );
      const inStub = add(E, mid.d1, 80 * u);
      draw([st([[[rayX0, E[1]], E, inStub], chevron([lerp(rayX0, E[0], 0.55), E[1]], [1, 0], 22 * u)])], 13);
      write("sunlight", (V ? 100 : 125) * u, E[1] - 26 * u, cap(44), 0.9);
      const straight = add(E, [1, 0], 110 * u),
        ang = Math.atan2(mid.d1[1], mid.d1[0]);
      draw(
        [
          st([seg(E, straight)], C.muted, FINE, { dash: 9 * u }),
          st([arcPts(E[0], E[1], 70 * u, 0, ang, 10)], C.accent, FINE),
        ],
        9,
      );
      step(1, ["Light bends as it", "enters the drop"], "bends", capX, capY(0), capS, capGap);
    }
    {
      // step 2: the ray splits into seven colours (red bends least, violet most)
      at(T.step2 + 2);
      draw(
        rays.map((r, k) => st([seg(r.E, r.B)], SPEC[k]!, FINE)),
        30,
      );
      write("white light", (V ? 100 : 125) * u, E[1] + (V ? 50 : 56) * u, cap(V ? 32 : 34), 0.9);
      const nO = monoO(30);
      if (V) {
        write("colour spread", W - 80 * u - measure(ctx, "colour spread", nO), 786 * u, nO, 0.6);
        write("exaggerated", W - 80 * u - measure(ctx, "exaggerated", nO), 826 * u, nO, 0.6);
      } else write("colour spread exaggerated", 760 * u, 960 * u, nO, 0.45);
      step(2, ["Each colour bends", "a different amount"], "different", capX, capY(1), capS, capGap);
    }
    let flashPt: Pt = rays[0]!.B,
      flashAt = 0;
    {
      // step 3: one reflection off the back wall
      at(T.step3 + 2);
      draw(
        rays.map((r, k) => st([seg(r.B, r.X)], SPEC[k]!, FINE)),
        30,
      );
      const b = rays[3]!.B,
        nb: Pt = [(b[0] - O[0]) / R, (b[1] - O[1]) / R],
        sc: Pt = add(b, nb, 36 * u),
        star: Pt[] = Array.from({ length: 11 }, (_, k) => {
          const a = -Math.PI / 2 + (k * Math.PI * 4) / 5,
            rr = 16 * u;
          return [sc[0] + Math.cos(a) * rr, sc[1] + Math.sin(a) * rr];
        });
      flashPt = sc;
      const it = draw([st([star.slice(0, 6)], C.accent, FINE)], 7);
      flashAt = it.end;
      step(3, ["It reflects off the", "back of the drop"], "reflects", capX, capY(2), capS, capGap);
    }
    {
      // step 4: out again, kinked; the angle is measured toward the sun
      at(T.step4);
      const len = (V ? 180 : 250) * u;
      draw(
        rays.map((r, k) => st([seg(r.X, add(r.X, [-Math.cos(EXIT(k)), Math.sin(EXIT(k))], len))], SPEC[k]!, FINE + u)),
        28,
      );
      step(4, ["It bends again on", "the way out"], "again", capX, capY(3), capS, capGap);
      const X = rays[0]!.X,
        back: Pt = [(V ? 60 : 120) * u, X[1]];
      draw([st([seg(add(X, [30 * u, 0]), back), chevron(back, [-1, 0], 20 * u)], C.ink, FINE, { dash: 12 * u })], 7);
      const ar = (V ? 110 : 140) * u;
      draw(
        [
          st(
            [
              arcPts(X[0], X[1], ar, Math.PI, Math.PI - EXIT(0), 14),
              seg([X[0] - ar + 8 * u, X[1]], [X[0] - ar - 10 * u, X[1]]),
            ],
            C.accent,
            FINE + u,
          ),
        ],
        6,
      );
      const lx = (V ? 100 : 170) * u,
        l42 = cap(V ? 48 : 52, C.accent);
      at(Math.max(t, HIT42 - Math.max(6, Math.round("about 42°".length * 1.2))));
      write("about 42°", lx, X[1] + (V ? 64 : 76) * u, l42, 1.2);
      write("violet about 40°", lx, X[1] + (V ? 108 : 124) * u, cap(V ? 34 : 36, C.s7), 0.8);
    }

    // ======== 05 THE BIG PICTURE: sun behind, rain in front, the bow at 40–42° from the eye
    scene(T.big);
    erase(23);
    gap = 1;
    {
      // side view with the sun 26° up (under 42°, or there is no bow). The bow is centred on the ground; each
      // drop sits where its line from the eye first meets its band (red: outer band, violet: inner band).
      const s = 26 * DEG,
        dn: Pt = [Math.cos(s), Math.sin(s)];
      const gy = (V ? 1470 : 880) * u,
        vx = (V ? 193 : 420) * u,
        vw = viewer(vx, gy, (V ? 156 : 200) * u),
        eye = vw.eye;
      const sunP = add(eye, dn, -(V ? 123 : 260) * u),
        bc: Pt = V ? [631 * u, gy] : [1340 * u, gy], // the vertical bow ends inside the safe area (right edge 992)
        Rr = (V ? 361 : 500) * u,
        Rv = Rr - 108 * u;
      const hit = (d: Pt, rad: number): Pt => {
        const ox = eye[0] - bc[0],
          oy = eye[1] - bc[1],
          b = d[0] * ox + d[1] * oy,
          c = ox * ox + oy * oy - rad * rad,
          disc = Math.max(0, b * b - c);
        return add(eye, d, -b - Math.sqrt(disc));
      };
      const dR: Pt = [Math.cos(42 * DEG - s), -Math.sin(42 * DEG - s)],
        dV: Pt = [Math.cos(40 * DEG - s), -Math.sin(40 * DEG - s)],
        pR = hit(dR, Rr),
        pV = hit(dV, Rv);
      const A: Pt = V ? add(eye, dn, 1000 * u) : add(eye, dn, 600 * u);
      const c1 = "Sun behind you. Rain in front.",
        c2 = "Red outside, violet inside.",
        bs = V ? 44 : 52,
        bx0 = (V ? 88 : 110) * u,
        by0 = (V ? 540 : 150) * u,
        bgap = (V ? 64 : 72) * u;
      at(T.big + WIPE + 2);
      draw(sun(sunP[0], sunP[1], (V ? 34 : 46) * u), 7);
      draw([...vw.strokes, st([seg([vx - 130 * u, gy], [bc[0] + Rr + 40 * u, gy])], C.ink, FINE)], 9);
      const cw = (V ? 380 : 520) * u,
        ch = (V ? 130 : 150) * u,
        cl: Pt = [bc[0] - (V ? 80 : 0) * u, gy - Rr - (V ? 160 : 150) * u];
      draw(
        [
          ...cloud(cl[0], cl[1], cw, ch),
          st(
            rain(cl[0] - cw * 0.45, cl[1] + ch * 0.62, cl[0] + cw * 0.5, gy - 20 * u, 30, 50 * u, 31),
            C.accent2,
            FINE,
          ),
        ],
        11,
        1,
      );
      write(c1, bx0, by0, cap(bs), 0.4);
      // the dashed line from the sun, through the head, on to the point opposite the sun
      const lineEnd = V ? add(eye, dn, 560 * u) : A;
      draw([st([seg(add(sunP, dn, 70 * u), lineEnd)], C.ink, FINE, { dash: 12 * u })], 6);
      if (V) draw([st([chevron(lineEnd, dn, 24 * u)], C.ink, FINE)], 3);
      else
        draw(
          [
            st(
              [
                seg(add(A, [-14 * u, -14 * u]), add(A, [14 * u, 14 * u])),
                seg(add(A, [14 * u, -14 * u]), add(A, [-14 * u, 14 * u])),
              ],
              C.accent,
              FINE + u,
            ),
          ],
          3,
        );
      // the two lines: a drop on each sends one colour to the eye
      const drop = (p: Pt, color: string) =>
        st(
          [
            arcPts(p[0], p[1] - 4 * u, 13 * u, -90 * DEG, 270 * DEG, 14),
            seg(p, add(eye, [p[0] - eye[0], p[1] - eye[1]], 0.06)),
          ],
          color,
          FINE,
        );
      const drops = draw([drop(pR, C.s1!), drop(pV, C.s7!)], 8);
      draw([st([arcPts(eye[0], eye[1], 64 * u, s, s - 42 * DEG, 10)], C.accent, FINE)], 3);
      at(Math.max(t, BOW - 26));
      draw(bow(bc[0], bc[1], Rr), 26, 1);
      items.push(items.splice(items.indexOf(drops), 1)[0]!); // the drops sit on top of the bands
      write(c2, bx0, by0 + bgap, cap(bs), 0.5);
      const pl = "point opposite the sun",
        plO = cap(V ? 28 : 30, C.muted);
      if (V) {
        // two short lines up and to the right of the arrow, clear of the dashed line and above the bottom margin
        write("point opposite", lineEnd[0] + 26 * u, lineEnd[1] - 46 * u, plO, 0.4);
        write("the sun", lineEnd[0] + 26 * u, lineEnd[1] - 12 * u, plO, 0.4);
      } else write(pl, A[0] + 26 * u, A[1] + 12 * u, plO, 0.4);
    }

    // ======== 06 RECAP: four drops, four words, one line
    scene(T.recap);
    erase(37);
    let capAt = 0;
    {
      const words = ["bend", "split", "reflect", "bend"],
        ir = (V ? 110 : 88) * u;
      const centre = (k: number): Pt =>
        V ? [(k % 2 ? 750 : 330) * u, (k < 2 ? 820 : 1220) * u] : [(960 + (k - 1.5) * 390) * u, 590 * u];
      words.forEach((wd, k) => {
        const [x, y] = centre(k),
          circle = st([arcPts(x, y, ir, -95 * DEG, 262 * DEG, 32)], C.accent2, FINE + u);
        const a = 55 * DEG,
          e: Pt = [x - ir * Math.cos(a), y - ir * Math.sin(a)],
          start: Pt = [x - ir * 1.9, e[1]];
        let ray: Pt[][];
        if (k === 0) ray = [[start, e, add(e, [0.96, 0.28], ir * 0.9)]];
        else if (k === 1)
          ray = [
            [start, e, add(e, [0.98, 0.18], ir * 1.1)],
            [e, add(e, [0.93, 0.36], ir * 1.1)],
            [e, add(e, [0.86, 0.52], ir * 1.05)],
          ];
        else if (k === 2) ray = [[e, [x + ir * 0.93, y - ir * 0.35], [x + ir * 0.2, y + ir * 0.97]]];
        else ray = [[e, [x + ir * 0.2, y + ir * 0.97], add([x + ir * 0.2, y + ir * 0.97], [-0.74, 0.67], ir * 0.4)]];
        draw([circle, st(ray, k === 1 ? C.accent : C.ink, FINE + u)], 6, 1);
        const wo = cap(V ? 46 : 44);
        write(wd, x - measure(ctx, wd, wo) / 2, y + ir + (V ? 70 : 64) * u, wo, 0.4, 3);
      });
      const hl = V ? ["A rainbow:", "bend, split, reflect, bend."] : ["A rainbow: bend, split, reflect, bend."],
        hO = cap(V ? 56 : 62);
      const hy = (V ? 330 : 330) * u;
      hl.forEach((ln, k) => {
        const x = cx - measure(ctx, hl[hl.length - 1]!, hO) / 2;
        write(ln, x, hy + k * 76 * u, hO, 0.35);
      });
      const kl = hl.length - 1,
        hx = cx - measure(ctx, hl[kl]!, hO) / 2;
      underline(hl[kl]!, "reflect", hx, hy + kl * 76 * u, hO, 4);
      const ft = "a primary rainbow · angles approximate",
        fO = monoO(26);
      write(ft, cx - measure(ctx, ft, fO) / 2, (V ? 1560 : 975) * u, fO, 0.15);
      capAt = Math.max(SIGN, Math.round(t + 2)); // the marker is capped on the sign-off beat
    }
    const all = scenes.flatMap((sc) => sc.items).sort((a, b) => a.start - b.start);
    built = { scenes, all, capAt, flashAt, flashPt };
    return built;
  };

  // ---------------------------------------------------------------- the pen: where the hand's tip is at F
  const stateOf = (it: Item, F: number): { p: Pt; color: string } => {
    if (it.kind === "write") {
      const q = prog(F, it.start, it.end),
        n = it.s.length;
      return {
        p: [
          it.x + it.w * q + 3 * u,
          it.y - it.o.size * 0.3 + Math.sin(q * n * Math.PI * 2) * 10 * u * Math.min(1, it.o.size / (46 * u)),
        ],
        color: it.o.color ?? C.ink,
      };
    }
    if (it.kind === "erase") return { p: pointAt(it.g, it.g.len * wipeEase(prog(F, it.start, it.end))), color: C.ink };
    for (let k = 0; k < it.strokes.length; k++) {
      const [a, b] = it.win[k]!,
        s = it.strokes[k]!;
      if (F < b || k === it.strokes.length - 1)
        return { p: pointAt(s.g, s.g.len * ease.inOutCubic(prog(F, a, b))), color: s.color };
      const next = it.win[k + 1]!;
      if (F < next[0]) {
        const e = pointAt(s.g, s.g.len),
          n = it.strokes[k + 1]!.g.pts[0]!,
          q = ease.inOutCubic(prog(F, b, next[0]));
        return { p: [lerp(e[0], n[0], q), lerp(e[1], n[1], q)], color: it.strokes[k + 1]!.color };
      }
    }
    return { p: [0, 0], color: C.ink };
  };
  const startOf = (it: Item) => stateOf(it, it.start),
    endOf = (it: Item) => stateOf(it, it.end);
  const pen = (all: Item[], capAt: number, F: number) => {
    const active = all.find((it) => F >= it.start && F < it.end);
    if (active) return { ...stateOf(active, F), tool: active.kind === "erase" ? "eraser" : "marker", capped: false };
    const prev = [...all].reverse().find((it) => it.end <= F),
      next = all.find((it) => it.start > F);
    const lerpP = (a: Pt, b: Pt, q: number): Pt => [lerp(a[0], b[0], q), lerp(a[1], b[1], q)];
    const drift: Pt = [Math.sin(F / 9) * 7 * u, Math.cos(F / 11) * 5 * u];
    const rest = add(REST, drift);
    if (!next) {
      // cap the marker, then slide out
      const e = endOf(prev!).p,
        q1 = ease.inOutCubic(prog(F, prev!.end, capAt)),
        q2 = ease.inCubic(prog(F, capAt + 3, capAt + 16));
      const p = F < capAt + 3 ? lerpP(e, add(e, [40 * u, 60 * u]), q1) : lerpP(add(e, [40 * u, 60 * u]), OUT, q2);
      return { p, color: endOf(prev!).color, tool: "marker", capped: F >= capAt };
    }
    const b = startOf(next);
    if (!prev)
      return {
        p: lerpP(OUT, b.p, ease.outCubic(prog(F, -4, next.start))),
        color: b.color,
        tool: next.kind === "erase" ? "eraser" : "marker",
        capped: false,
      };
    const a = endOf(prev),
      g = next.start - prev.end,
      HOLD = 3;
    if (prev.kind === "erase" && F < prev.end + HOLD) {
      // the landing: the eraser stays put and recoils a little on the hit
      const k = F - prev.end;
      return {
        p: add(a.p, [0, 1], 10 * u * Math.exp(-k) * (k === 0 ? 1 : -0.5)),
        color: C.ink,
        tool: "eraser",
        capped: false,
      };
    }
    const tool = next.kind === "erase" && F >= next.start - 6 ? "eraser" : "marker";
    if (g <= 14)
      return {
        p: lerpP(a.p, b.p, ease.inOutCubic(prog(F, prev.end + (prev.kind === "erase" ? HOLD : 0), next.start))),
        color: b.color,
        tool,
        capped: false,
      };
    const m = 8;
    if (F < prev.end + m)
      return {
        p: lerpP(a.p, rest, ease.inOutCubic(prog(F, prev.end, prev.end + m))),
        color: a.color,
        tool: "marker",
        capped: false,
      };
    if (F > next.start - m)
      return {
        p: lerpP(rest, b.p, ease.inOutCubic(prog(F, next.start - m, next.start))),
        color: b.color,
        tool,
        capped: false,
      };
    return { p: rest, color: b.color, tool, capped: false };
  };

  // ---------------------------------------------------------------- drawing
  const strokeTo = (ctx: Ctx, s: Stroke, len: number) => {
    const g = s.g;
    if (len <= 0) return;
    const path = (dx: number) => {
      ctx.beginPath();
      ctx.moveTo(g.pts[0]![0] + dx, g.pts[0]![1] + dx);
      for (let i = 1; i < g.pts.length; i++) {
        const done = g.cum[i]! <= len,
          p = done ? g.pts[i]! : pointAt(g, len);
        if (g.down[i]) ctx.lineTo(p[0] + dx, p[1] + dx);
        else ctx.moveTo(p[0] + dx, p[1] + dx);
        if (!done) break;
      }
    };
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalAlpha *= s.alpha ?? 1;
    if (s.dash) ctx.setLineDash([s.dash, s.dash * 0.9]);
    path(0);
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.w;
    ctx.stroke();
    // the felt-tip streak: a second pass, a little narrower, offset, in the board colour
    path(1 * u);
    ctx.strokeStyle = C.ground;
    ctx.globalAlpha *= 0.25;
    ctx.lineWidth = Math.max(1, s.w - 1.5 * u);
    ctx.stroke();
    ctx.restore();
  };
  const drawItem = (ctx: Ctx, it: Item, F: number) => {
    if (F < it.start || it.kind === "erase") return;
    if (it.kind === "write") {
      const q = prog(F, it.start, it.end);
      ctx.save();
      ctx.beginPath();
      ctx.rect(it.x - 20 * u, it.y - it.o.size * 1.2, it.w * q + 20 * u, it.o.size * 1.7);
      ctx.clip();
      text(ctx, it.s, it.x, it.y, it.o);
      ctx.restore();
      return;
    }
    it.strokes.forEach((s, k) => {
      const [a, b] = it.win[k]!;
      if (F >= a) strokeTo(ctx, s, s.g.len * ease.inOutCubic(prog(F, a, b)));
    });
  };
  const drawScene = (ctx: Ctx, sc: Scene, F: number) => sc.items.forEach((it) => drawItem(ctx, it, F));

  // the arm's direction from the tip (degrees from +x, y down): 65° is the brief's 25° tilt. In the vertical the arm
  // swings toward the right edge (15°) while the pen is in the upper part, so the sleeve lies across empty board
  // beside the captions instead of down across the raindrop; a wide smooth ramp, so a rising eraser never snaps.
  const armDeg = (p: Pt) => (V ? lerp(15, 65, ease.inOutCubic(clamp((p[1] - 0.4 * H) / (0.22 * H), 0, 1))) : 65);
  // each erase-wipe lands on its beat: a camera kick and a puff of eraser dust
  const LANDS = [T.step1 + WIPE, T.big + WIPE, T.recap + WIPE];
  const landing = (F: number) => {
    const e = LANDS.find((l) => F >= l && F < l + 14);
    return e === undefined ? -1 : F - e;
  };
  const kick = (F: number) => {
    const k = landing(F);
    return k < 0 ? 1 : 1 + 0.03 * Math.exp(-k / 3) * Math.cos(k * 0.9);
  };
  const dust = (ctx: Ctx, at: Pt, k: number) => {
    const q = k / 14;
    ctx.save();
    ctx.strokeStyle = C.muted;
    ctx.lineCap = "round";
    ctx.globalAlpha = 0.9 * (1 - q) ** 1.5;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + hash(900 + i) * 0.5,
        r0 = (60 + 110 * ease.outCubic(q) + hash(950 + i) * 24) * u,
        r1 = r0 + (30 + hash(990 + i) * 24) * (1 - q) * u;
      ctx.lineWidth = (4 + (i % 3)) * u;
      ctx.beginPath();
      ctx.moveTo(at[0] + Math.cos(a) * r0, at[1] + Math.sin(a) * r0);
      ctx.lineTo(at[0] + Math.cos(a) * r1, at[1] + Math.sin(a) * r1);
      ctx.stroke();
    }
    ctx.restore();
  };
  // the drawn hand: tip at the origin, marker along +y, rotated 25°; palm, cuff and sleeve run off the frame
  const block = (ctx: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string, line = 4 * u) => {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = line;
    ctx.stroke();
  };
  const hand = (ctx: Ctx, p: Pt, color: string, tool: string, capped: boolean, F: number) => {
    const j = Math.floor(F / 2);
    ctx.save();
    ctx.translate(p[0] + (hash(j) - 0.5) * 4 * u, p[1] + (hash(j + 777) - 0.5) * 4 * u);
    ctx.rotate((armDeg(p) - 90) * DEG);
    ctx.scale(u, u); // design px from here on
    const eraser = tool === "eraser",
      dy = 0;
    ctx.translate(0, dy);
    block(ctx, -62, 330, 196, 3000, 10, C.surface, 4);
    block(ctx, -70, 296, 212, 72, 24, C.line, 4);
    // curled fingers behind the palm
    for (const [fx, fy] of [
      [104, 186],
      [114, 228],
      [108, 268],
    ] as Pt[])
      capsuleU(ctx, [fx - 30, fy], [fx + 4, fy + 4], 40, C.hand);
    block(ctx, -52, 150, 166, 170, 52, C.hand, 4);
    ctx.translate(0, -dy);
    if (eraser) {
      block(ctx, -78, -24, 156, 72, 14, C.muted, 4);
      block(ctx, -78, -24, 156, 20, 8, C.line, 3);
    } else {
      // the marker: nib, barrel, a cap band in the current colour
      ctx.beginPath();
      ctx.moveTo(-8, 14);
      ctx.lineTo(-4, 1);
      ctx.lineTo(4, 1);
      ctx.lineTo(8, 14);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      block(ctx, -13, 12, 26, 150, 8, C.surface, 3.5);
      block(ctx, -13, 116, 26, 30, 4, color, 3.5);
      if (capped) block(ctx, -15, -6, 30, 52, 10, color, 3.5);
    }
    ctx.translate(0, dy);
    // thumb and index finger pinch the marker; two knuckle creases
    capsuleU(ctx, [-34, 170], [-18, 84], 36, C.hand);
    capsuleU(ctx, [70, 176], [14, 62], 38, C.hand);
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    for (const t_ of [0.42, 0.66]) {
      const x = lerp(70, 14, t_),
        y = lerp(176, 62, t_);
      ctx.beginPath();
      ctx.moveTo(x - 9, y + 5);
      ctx.lineTo(x + 5, y - 2);
      ctx.stroke();
    }
    ctx.restore();
  };
  // capsule inside the hand's scaled space (widths are design px there)
  const capsuleU = (ctx: Ctx, a: Pt, b: Pt, w: number, fill: string) => {
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(...a);
    ctx.lineTo(...b);
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = w + 8;
    ctx.stroke();
    ctx.strokeStyle = fill;
    ctx.lineWidth = w;
    ctx.stroke();
  };

  // faint ghost marks of old drawings: the board has been used before
  const ghosts: Stroke[] = Array.from({ length: 7 }, (_, k) => {
    const x = (0.08 + hash(300 + k) * 0.84) * W,
      y = (0.08 + hash(400 + k) * 0.84) * H,
      r = (40 + hash(500 + k) * 90) * u,
      kind = k % 3;
    const pts: Pt[] =
      kind === 0
        ? arcPts(x, y, r, 0, 5.2, 30, r * 0.7)
        : kind === 1
          ? Array.from({ length: 6 }, (_, i) => [x + i * r * 0.4, y + (i % 2 ? -r * 0.25 : r * 0.25)] as Pt)
          : [
              [x - r, y],
              [x + r * 1.4, y - r * 0.2],
            ];
    return { g: geom([pts]), color: C.muted, w: (1 + (k % 2)) * u, alpha: 0.18 };
  });

  // the camera: a slow push-in through each hold; the big picture pulls back, pinned on its captions
  const pin: Pt = V ? [100 * u, 490 * u] : [110 * u, 100 * u];
  const zoomAt = (F: number): [number, number, number] => {
    const push = (a: number, b: number) => 1 + 0.04 * ease.inOutCubic(prog(F, a, b));
    const w = (s: number) => ease.inOutCubic(prog(F, s, s + WIPE));
    if (F < T.step1) return [push(10, T.step1), cx, cy];
    if (F < T.step1 + WIPE) return [lerp(1.04, 1, w(T.step1)), cx, cy];
    if (F < T.big) return [push(T.step1 + WIPE, T.big), cx, cy];
    if (F < T.big + WIPE) {
      const q = w(T.big);
      return [lerp(1.04, 1.1, q), lerp(cx, pin[0], q), lerp(cy, pin[1], q)];
    }
    if (F < T.recap)
      return [
        lerp(1.1, 1, ease.inOutCubic(prog(F, T.big + WIPE, T.big + 130))) + 0.012 * prog(F, T.big + 130, T.recap),
        pin[0],
        pin[1],
      ];
    if (F < T.recap + WIPE) {
      const q = w(T.recap);
      return [lerp(1.012, 1, q), lerp(pin[0], cx, q), lerp(pin[1], cy, q)];
    }
    // the end: a slow push through the recap, then a steady push-in (not easing to a stop) over the final hold
    return [push(T.recap + WIPE, SIGN + 16) + 0.07 * ease.inCubic(prog(F, SIGN, N)) ** 0.7, cx, cy];
  };

  const layerOf = (env: Env): Layer => {
    const k = `wbh-${size}-${env.scale}`;
    let ly = env.cache.get(k) as Layer | undefined;
    if (!ly) {
      ly = env.canvas(Math.round(W * env.scale), Math.round(H * env.scale));
      env.cache.set(k, ly);
    }
    return ly;
  };

  const paint = (ctx: Ctx, env: Env, F: number) => {
    F = clamp(F, 0, N - 1);
    const B = built ?? build(ctx);
    const [z0, ax, ay] = zoomAt(F),
      z = z0 * kick(F),
      cam = (c: Ctx) => {
        c.setTransform(env.scale, 0, 0, env.scale, 0, 0);
        c.translate(ax, ay);
        c.scale(z, z);
        c.translate(-ax, -ay);
      };
    ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
    ctx.fillStyle = C.ground;
    ctx.fillRect(0, 0, W, H);
    cam(ctx);
    for (const g of ghosts) strokeTo(ctx, g, g.g.len);
    const si = B.scenes.reduce((k, s_, i) => (F >= s_.start ? i : k), 0),
      sc = B.scenes[si]!,
      prev = B.scenes[si - 1];
    const wipe = sc.items.find((it): it is Erase => it.kind === "erase");
    if (prev && wipe) {
      // the outgoing board: a grey ghost that fades over the next beat, under what the eraser has not reached yet
      // ... and snaps to a fainter ghost on the landing beat, so the board visibly comes clean with the hit
      const ga = F < wipe.end ? 0.35 : 0.13 * (1 - prog(F, wipe.end, wipe.end + WIPE));
      if (ga > 0) {
        ctx.save();
        ctx.globalAlpha = ga;
        prev.items.forEach((it) => {
          if (it.kind === "draw") it.strokes.forEach((s) => strokeTo(ctx, { ...s, color: C.line }, s.g.len));
          if (it.kind === "write") text(ctx, it.s, it.x, it.y, { ...it.o, color: C.line });
        });
        ctx.restore();
      }
      if (F < wipe.end) {
        const ly = layerOf(env),
          lc = ly.ctx;
        lc.setTransform(1, 0, 0, 1, 0, 0);
        lc.globalCompositeOperation = "source-over";
        lc.clearRect(0, 0, ly.canvas.width, ly.canvas.height);
        cam(lc);
        drawScene(lc, prev, 1e9);
        lc.globalCompositeOperation = "destination-out";
        strokeTo(lc, { g: wipe.g, color: "#000", w: 160 * u }, wipe.g.len * wipeEase(prog(F, wipe.start, wipe.end)));
        lc.globalCompositeOperation = "source-over";
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(ly.canvas, 0, 0);
        ctx.restore();
        cam(ctx);
      }
    }
    drawScene(ctx, sc, F);
    // the star at the back wall flashes once when it lands
    if (F >= B.flashAt && F < T.big) {
      const q = prog(F, B.flashAt, B.flashAt + 12);
      if (q < 1) {
        ctx.save();
        ctx.strokeStyle = C.accent;
        ctx.lineWidth = 3 * u;
        ctx.lineCap = "round";
        ctx.globalAlpha = 1 - q;
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2,
            r0 = (24 + 26 * q) * u,
            r1 = r0 + 14 * u;
          ctx.beginPath();
          ctx.moveTo(B.flashPt[0] + Math.cos(a) * r0, B.flashPt[1] + Math.sin(a) * r0);
          ctx.lineTo(B.flashPt[0] + Math.cos(a) * r1, B.flashPt[1] + Math.sin(a) * r1);
          ctx.stroke();
        }
        ctx.restore();
      }
    }
    const lk = landing(F);
    if (lk >= 0) {
      const w = B.all.filter((it): it is Erase => it.kind === "erase").find((it) => it.end === F - lk)!;
      const e = w.g.pts[w.g.pts.length - 1]!;
      dust(ctx, [clamp(e[0], 120 * u, W - 120 * u), clamp(e[1], 110 * u, H - 110 * u)], lk);
    }
    const h = pen(B.all, B.capAt, F);
    hand(ctx, h.p, h.color, h.tool, h.capped, F);
  };

  // sound cues come from the schedule: squeaks while long strokes draw (one every 4 frames), whooshes on wipes
  const squeaks = (): number[] => {
    // the schedule needs text widths for positions only; timing is width-free, so a stub measure is enough here
    const out: number[] = [];
    const stub = {
      save() {},
      restore() {},
      measureText: (s: string) => ({ width: s.length * 20 }),
      set font(_: string) {},
      set letterSpacing(_: string) {},
    } as unknown as Ctx;
    const B = build(stub);
    built = null; // rebuild with real fonts at paint time
    for (const it of B.all) {
      if (it.kind === "erase") continue;
      const wins = it.kind === "write" ? [[it.start, it.end]] : it.win;
      for (const [a, b] of wins as [number, number][])
        if (b - a > 10) for (let f = Math.ceil(a); f < b; f += 4) out.push(f);
    }
    out.push(B.capAt);
    return out;
  };

  const cuts = [T.hook, T.step1, T.step2, T.step3, T.step4, T.big, T.recap, N],
    names = ["hook", "bend", "split", "reflect", "exit", "big-picture", "recap"];
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
      mood: "soft",
      hits: [T.step1 + WIPE, HIT42, T.big + WIPE, BOW, T.recap + WIPE],
      whooshes: [T.step1 + WIPE, T.big + WIPE, T.recap + WIPE],
      ticks: squeaks(),
      sign: SIGN,
      gain: 0.72,
    }),
  };
}

export const whiteboardHand = make("landscape", "whiteboardHand");
export const whiteboardHandVertical = make("vertical", "whiteboardHandVertical");
