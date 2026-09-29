// STUDY 36 · SHADOW PUPPET (30 s, 30 fps, 90 bpm). A silhouette film in the 1920s cut-out manner: black jointed
// paper puppets and lacy black scenery on a backlit, tinted glow, telling an original fable (a fox borrows the
// moon, the wood goes dark, she climbs the tallest tree and gives it back). No product: every name is invented.
// Brief: series/studies/briefs/shadow-puppet.json · prompt: series/studies/prompts/shadow-puppet.prompt.md
//
// The whole film is one continuous function paint(F) of a (fractional) frame F; the shots only name the scenes.
// The puppets are RIGS: trees of ink parts joined at hinges that only rotate, every angle a closed-form function
// of time quantised to twos. The glow, its tint dissolves, the flicker and the gate weave run every frame.
import PACK from "../../../brand/packs/studio/pack.json";
import { rng, type Ctx, type Env, type Layer } from "../core";
import type { Film, Shot } from "../film";
import { clamp, ease, lerp, prog } from "../kit/motion";
import { usePack } from "../kit/pack";
import { beatScore } from "../kit/score";
import { layout, type Size } from "../kit/sizes";
import { measure, text } from "../kit/type";

const P = usePack(PACK),
  C = P.palette("lantern"),
  F_ = P.face;
const FPS = 30,
  BPM = 90,
  N = 900; // a beat is 20 frames
// the timeline, in frames (every scene starts on a beat)
const T = { dusk: 100, borrow: 240, dark: 400, give: 560, dawn: 720, end: 820 };
const CARDS: [number, number, string][] = [
  [T.dusk, T.borrow, "A fox wanted a light of her own."],
  [T.borrow, T.dark, "So she borrowed the moon."],
  [T.dark, T.give, "But the wood went dark for everyone else."],
  [T.give, T.dawn, "So she climbed the tallest tree and gave it back."],
  [T.dawn, T.end - 4, "A light kept is small. A light shared lights the wood."],
];
const TAU = Math.PI * 2,
  DEG = Math.PI / 180;

// ---------------------------------------------------------------- colour
type RGB = [number, number, number];
const rgbOf = (h: string): RGB => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];
const mixC = (a: RGB, b: RGB, t: number): RGB => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const css = (c: RGB, k = 1, a = 1) =>
  `rgba(${Math.round(clamp(c[0] * k, 0, 255))},${Math.round(clamp(c[1] * k, 0, 255))},${Math.round(clamp(c[2] * k, 0, 255))},${a})`;
const SURF = rgbOf(C.surface),
  S1 = rgbOf(C.s1),
  S2 = rgbOf(C.s2),
  S3 = rgbOf(C.s3),
  INK = C.ink;

/** a pure hash of an integer (the film life is seeded, never random at render time) */
const hash = (n: number, s: number) => {
  const x = Math.sin(n * 127.1 + s * 311.7) * 43758.5453;
  return x - Math.floor(x);
};
/** keyed angles: eased between consecutive [frame, value] keys, holding outside them */
const kv = (f: number, ks: [number, number][], ez: (t: number) => number = ease.inOutCubic) => {
  if (f <= ks[0]![0]) return ks[0]![1];
  for (let i = 0; i < ks.length - 1; i++) {
    const [a, va] = ks[i]!,
      [b, vb] = ks[i + 1]!;
    if (f < b) return lerp(va, vb, ez(prog(f, a, b)));
  }
  return ks[ks.length - 1]![1];
};

// ---------------------------------------------------------------- a tiny affine, for forward kinematics
type M = [number, number, number, number, number, number];
const mul = (m: M, n: M): M => [
  m[0] * n[0] + m[2] * n[1],
  m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3],
  m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4],
  m[1] * n[4] + m[3] * n[5] + m[5],
];
const Tm = (x: number, y: number): M => [1, 0, 0, 1, x, y];
const Rm = (a: number): M => [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0];
const Sm = (x: number, y: number): M => [x, 0, 0, y, 0, 0];

// ---------------------------------------------------------------- cut-paper shapes (all added to the current path)
const part = (c: Ctx, x: number, y: number, a: number, draw: () => void) => {
  c.save();
  c.translate(x, y);
  c.rotate(a);
  draw();
  c.restore();
};
/** one ink part: its outline plus its lace holes in one path, filled even-odd */
const ink = (c: Ctx, build: () => void, color = INK) => {
  c.beginPath();
  build();
  c.fillStyle = color;
  c.fill("evenodd");
};
/** a group of limbs (all wound the same way) that may cross: non-zero, so crossings stay solid */
const limbs = (c: Ctx, build: () => void) => {
  c.beginPath();
  build();
  c.fillStyle = INK;
  c.fill("nonzero");
};
const ellipseSub = (c: Ctx, x: number, y: number, rx: number, ry: number, rot = 0) => {
  c.moveTo(x + Math.cos(rot) * rx, y + Math.sin(rot) * rx);
  c.ellipse(x, y, rx, ry, rot, 0, TAU);
};
/** a crescent as ONE closed subpath (outer arc, inner arc back), so even-odd cuts a crescent and not a lens */
const crescent = (c: Ctx, x: number, y: number, r: number, a: number) => {
  c.save();
  c.translate(x, y);
  c.rotate(a);
  c.moveTo(0, -r);
  c.arc(0, 0, r, -Math.PI / 2, Math.PI / 2);
  c.ellipse(0, 0, r * 0.42, r, 0, Math.PI / 2, -Math.PI / 2, true);
  c.closePath();
  c.restore();
};
/** a leaf (vesica) centred at x, y, pointing along a */
const leaf = (c: Ctx, x: number, y: number, len: number, a: number, wid = 0.36) => {
  const dx = Math.cos(a) * len,
    dy = Math.sin(a) * len,
    nx = -dy * wid,
    ny = dx * wid;
  c.moveTo(x + dx, y + dy);
  c.quadraticCurveTo(x + nx, y + ny, x - dx, y - dy);
  c.quadraticCurveTo(x - nx, y - ny, x + dx, y + dy);
  c.closePath();
};
/** a tapered, bowed limb from (x0,y0) to (x1,y1) with a round end */
const limb = (c: Ctx, x0: number, y0: number, x1: number, y1: number, w0: number, w1: number, bow = 0) => {
  const dx = x1 - x0,
    dy = y1 - y0,
    l = Math.hypot(dx, dy) || 1,
    nx = -dy / l,
    ny = dx / l,
    mx = (x0 + x1) / 2 + nx * bow,
    my = (y0 + y1) / 2 + ny * bow,
    wm = (w0 + w1) / 4;
  c.moveTo(x0 + (nx * w0) / 2, y0 + (ny * w0) / 2);
  c.quadraticCurveTo(mx + nx * wm, my + ny * wm, x1 + (nx * w1) / 2, y1 + (ny * w1) / 2);
  c.arc(x1, y1, w1 / 2, Math.atan2(ny, nx), Math.atan2(ny, nx) + Math.PI);
  c.quadraticCurveTo(mx - nx * wm, my - ny * wm, x0 - (nx * w0) / 2, y0 - (ny * w0) / 2);
  c.closePath();
};
/** a cut-paper curl: a tapering spiral, stroked */
const curl = (c: Ctx, x: number, y: number, R: number, dir: number, rot: number, lw: number, turns = 1.6) => {
  c.beginPath();
  const n = 40;
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * turns * TAU,
      r = R * (1 - t / (turns * TAU * 1.12)),
      px = x + dir * r * Math.cos(t + rot),
      py = y + r * Math.sin(t + rot);
    if (i) c.lineTo(px, py);
    else c.moveTo(px, py);
  }
  c.strokeStyle = INK;
  c.lineWidth = lw;
  c.lineCap = "round";
  c.lineJoin = "round";
  c.stroke();
};

// ---------------------------------------------------------------- scenery: lacy trees, grass, reeds
type Limb = [number, number, number, number, number, number, number];
type Crown = { x: number; y: number; r: number; ph: number; lobes: number; holes: [number, number, number, number][] };
type Tree = { limbs: Limb[]; crowns: Crown[] };
const crownOf = (x: number, y: number, r: number, seed: number, lace = true): Crown => {
  const holes: [number, number, number, number][] = [],
    ph = hash(seed, 3) * TAU;
  if (lace)
    [0.3, 0.56, 0.8].forEach((k, ring) => {
      const rr = r * k,
        n = Math.max(4, Math.floor((TAU * rr) / (r * 0.3)));
      for (let i = 0; i < n; i++) {
        const a = ph + (i / n) * TAU + ring * 0.4;
        holes.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr, r * (ring === 0 ? 0.07 : 0.095), a]);
      }
    });
  return { x, y, r, ph, lobes: 9 + Math.floor(hash(seed, 5) * 5), holes };
};
const makeTree = (seed: number, x: number, base: number, h: number, lace = true, branches = 3, ck = 1): Tree => {
  const r = rng(seed),
    lean = (r() - 0.5) * h * 0.08,
    tx = x + lean,
    ty = base - h * 0.8,
    w0 = h * 0.06;
  const limbs: Limb[] = [[x, base + 20, tx, ty, w0, w0 * 0.3, (r() - 0.5) * h * 0.04]],
    crowns: Crown[] = [crownOf(tx, ty - h * 0.04, h * 0.19 * ck, seed * 7 + 1, lace)];
  let side = r() < 0.5 ? -1 : 1;
  for (let i = 0; i < branches; i++) {
    const t = 0.36 + i * (0.4 / Math.max(1, branches - 1)) + r() * 0.05,
      sx = lerp(x, tx, t),
      sy = lerp(base, ty, t),
      ex = sx + side * h * (0.2 + r() * 0.08) * Math.sqrt(ck),
      ey = sy - h * (0.1 + r() * 0.06);
    limbs.push([sx, sy, ex, ey, w0 * 0.45, w0 * 0.16, -side * h * 0.03]);
    crowns.push(crownOf(ex, ey - h * 0.02, h * (0.1 + r() * 0.03) * ck, seed * 7 + 2 + i, lace));
    side = -side;
  }
  // root flares
  limbs.push([x, base - h * 0.05, x - w0 * 1.3, base + 12, w0 * 0.5, w0 * 0.15, 0]);
  limbs.push([x, base - h * 0.05, x + w0 * 1.3, base + 12, w0 * 0.5, w0 * 0.15, 0]);
  return { limbs, crowns };
};
const drawCrown = (c: Ctx, k: Crown) => {
  ink(c, () => {
    const n = 90;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * TAU,
        rr = k.r * (0.84 + 0.16 * Math.abs(Math.sin((a * k.lobes) / 2 + k.ph))),
        px = k.x + Math.cos(a) * rr,
        py = k.y + Math.sin(a) * rr * 0.92;
      if (i) c.lineTo(px, py);
      else c.moveTo(px, py);
    }
    c.closePath();
    for (const [hx, hy, len, a] of k.holes) leaf(c, hx, hy, len, a);
  });
};
const drawTree = (c: Ctx, t: Tree) => {
  // each limb is its own fill: overlapping limbs in one even-odd path would cut holes where they cross
  for (const l of t.limbs) ink(c, () => limb(c, ...l));
  for (const k of t.crowns) drawCrown(c, k);
};
/** the ground: ink below a contour, its top edge a zig-zag grass fringe on a fixed world grid (it never swims) */
const groundInk = (
  c: Ctx,
  x0: number,
  x1: number,
  yAt: (x: number) => number,
  bottom: number,
  step: number,
  tooth: number,
  hole?: (c: Ctx) => void,
) => {
  ink(c, () => {
    const i0 = Math.floor(x0 / step) - 1,
      i1 = Math.ceil(x1 / step) + 1;
    c.moveTo(i0 * step, bottom);
    for (let i = i0; i <= i1; i++) {
      const x = i * step;
      c.lineTo(x, yAt(x) - (i % 2 ? 0 : tooth * (0.7 + 0.6 * hash(i, 9))));
    }
    c.lineTo(i1 * step, bottom);
    c.closePath();
    hole?.(c);
  });
};

// ---------------------------------------------------------------- THE PUPPETS
type Fox = {
  x: number;
  y: number; // paw line
  s: number;
  fx: number; // facing: +1 right, −1 left, between = the card turning over
  lift: number; // body raise (units)
  body: number;
  head: number;
  jaw: number;
  ear: number;
  tail: [number, number, number];
  legs: [number, number][]; // [thigh, shin]: front near, front far, hind near, hind far
  pole?: { a: number; swing: number; lit: number };
};
const FOX = {
  hip: 71,
  neck: [50, -20] as [number, number],
  mouth: [44, 3] as [number, number],
  poleL: 150,
  legs: [
    [40, 10],
    [30, 8],
    [-44, 6],
    [-54, 4],
  ] as [number, number][],
};
/** the walk cycle: thigh = 24° · sin(ωt + φ), shin = 20° · max(0, sin(ωt + φ + 0.6)); diagonal pairs (a trot) */
const walk = (t: number, T: number, w: number): [number, number][] =>
  [0, Math.PI, Math.PI, 0].map((ph) => {
    const a = (TAU / T) * t + ph;
    return [24 * DEG * Math.sin(a) * w, 20 * DEG * Math.max(0, Math.sin(a + 0.6)) * w] as [number, number];
  });
const STILL: [number, number][] = [
  [0, 0],
  [0, 0],
  [0, 0],
  [0, 0],
];

/** forward kinematics for the lantern window (the same chain drawFox walks) */
const lanternAt = (f: Fox): [number, number] | null => {
  if (!f.pole) return null;
  let m = mul(Tm(f.x, f.y), Sm(f.fx * f.s, f.s));
  m = mul(m, Tm(0, -FOX.hip + f.lift));
  m = mul(m, Rm(f.body));
  m = mul(m, Tm(...FOX.neck));
  m = mul(m, Rm(f.head));
  m = mul(m, Tm(...FOX.mouth));
  m = mul(m, Rm(f.pole.a));
  m = mul(m, Tm(FOX.poleL, 0));
  m = mul(m, Rm(-(f.body + f.head + f.pole.a) + f.pole.swing));
  m = mul(m, Tm(0, 30));
  return [m[4], m[5]];
};

const drawLantern = (c: Ctx, lit: number, moonRing: string) => {
  // hook ring, cap, cage with a window, base: one piece of card with its window cut out
  ink(c, () => {
    ellipseSub(c, 0, 4, 5, 5);
    ellipseSub(c, 0, 4, 2.2, 2.2);
    c.moveTo(-6, 9);
    c.lineTo(6, 9);
    c.lineTo(15, 17);
    c.lineTo(-15, 17);
    c.closePath();
    c.rect(-12, 17, 24, 30);
    c.rect(-7, 21, 14, 22); // the window
    c.moveTo(-15, 47);
    c.lineTo(15, 47);
    c.lineTo(10, 53);
    c.lineTo(-10, 53);
    c.closePath();
  });
  if (lit > 0) {
    c.save();
    c.globalAlpha *= lit;
    c.fillStyle = C.surface;
    c.fillRect(-7, 21, 14, 22);
    c.strokeStyle = moonRing;
    c.lineWidth = 1;
    c.beginPath();
    c.arc(0, 32, 5.5, 0, TAU);
    c.stroke();
    c.restore();
  }
  // the window's cross bars
  ink(c, () => {
    c.rect(-7, 31, 14, 2);
    c.rect(-1, 21, 2, 22);
  });
};

const drawFox = (c: Ctx, f: Fox) => {
  c.save();
  c.translate(f.x, f.y);
  c.scale(f.fx * f.s, f.s);
  c.translate(0, -FOX.hip + f.lift);
  c.rotate(f.body);
  const leg = (i: number) => {
    const [px, py] = FOX.legs[i]!,
      hind = i >= 2,
      [th, sh] = f.legs[i]!;
    part(c, px, py, th, () => {
      ink(c, () => {
        if (hind) {
          c.moveTo(-14, -12);
          c.quadraticCurveTo(0, -18, 12, -8);
          c.lineTo(5, 30);
          c.lineTo(-4, 30);
          c.closePath();
        } else {
          c.moveTo(-8, -6);
          c.lineTo(8, -6);
          c.lineTo(5, 30);
          c.lineTo(-4, 30);
          c.closePath();
        }
      });
      ink(c, () => ellipseSub(c, 0.5, 29, 5, 5)); // the knee: its own piece, so it doesn't cut the thigh
      part(c, 0.5, 29, sh, () =>
        ink(c, () => {
          c.moveTo(-4, 0);
          c.lineTo(4, 0);
          c.lineTo(3.5, 26);
          c.quadraticCurveTo(12, 25, 12, 30);
          c.lineTo(-4.5, 31);
          c.closePath();
        }),
      );
    });
  };
  // far legs first (all ink, so order only matters for the lace)
  leg(1);
  leg(3);
  // the tail: three segments, each hinged at the end of the last, with crescents cut along it
  part(c, -60, -8, f.tail[0], () => {
    const seg = (i: number) => {
      const L = [34, 32, 30][i]!,
        w = [13, 17, 12][i]!,
        tip = i === 2;
      ink(c, () => {
        c.moveTo(6, 0);
        c.bezierCurveTo(2, -w, -L + 4, -w * 1.05, -L - (tip ? 16 : 6), tip ? -3 : 0);
        c.bezierCurveTo(-L + 4, w * 1.05, 2, w, 6, 0);
        c.closePath();
        {
          crescent(c, -L * 0.3, 0, w * 0.34, Math.PI);
          if (i < 2) crescent(c, -L * 0.72, 0, w * 0.34, Math.PI);
        }
      });
      if (i < 2) part(c, -L, 0, f.tail[i + 1]!, () => seg(i + 1));
    };
    seg(0);
  });
  // the body, with a line of small cut marks along the flank
  ink(c, () => {
    c.moveTo(-64, -4);
    c.bezierCurveTo(-50, -30, 20, -34, 56, -22);
    c.bezierCurveTo(72, -14, 70, 12, 50, 18);
    c.bezierCurveTo(20, 24, -30, 22, -56, 16);
    c.bezierCurveTo(-70, 12, -72, 2, -64, -4);
    c.closePath();
  });
  leg(0);
  leg(2);
  // the head, hinged at the neck: far ear, skull with its eye hole, jaw, near ear, and the pole in the mouth
  part(c, FOX.neck[0], FOX.neck[1], f.head, () => {
    const ear = (x: number, y: number, a: number) =>
      part(c, x, y, a, () =>
        ink(c, () => {
          c.moveTo(-8, 2);
          c.lineTo(-1, -27);
          c.lineTo(9, 2);
          c.closePath();
          c.moveTo(-3, -2);
          c.lineTo(-1, -16);
          c.lineTo(4, -2);
          c.closePath();
        }),
      );
    ear(20, -22, -0.1 + f.ear);
    ink(c, () => {
      c.moveTo(-6, 8);
      c.bezierCurveTo(-12, -16, 12, -32, 30, -20);
      c.lineTo(62, -6);
      c.bezierCurveTo(67, -4, 65, 2, 58, 2);
      c.lineTo(30, 6);
      c.bezierCurveTo(18, 16, 0, 16, -6, 8);
      c.closePath();
      ellipseSub(c, 27, -13, 4.6, 2.8, -0.35);
    });
    part(c, 28, 4, f.jaw, () =>
      ink(c, () => {
        c.moveTo(-2, -3);
        c.lineTo(28, -3);
        c.bezierCurveTo(26, 4, 8, 9, -2, 7);
        c.closePath();
      }),
    );
    ear(8, -18, -0.25 + f.ear);
    if (f.pole) {
      const pl = f.pole;
      part(c, FOX.mouth[0], FOX.mouth[1], pl.a, () => {
        ink(c, () => {
          limb(c, -8, 0, FOX.poleL, 0, 5, 3.5);
        });
        // the lantern hangs from a hinge at the tip: undo the chain so it hangs plumb, then swing
        part(c, FOX.poleL, 0, -(f.body + f.head + pl.a) + pl.swing, () => drawLantern(c, pl.lit, C.accent2));
      });
    }
  });
  c.restore();
};

type Hare = {
  x: number;
  y: number;
  s: number;
  fx: number;
  lift: number;
  body: number;
  head: number;
  ear: number;
  tail: [number, number, number];
  legs: [number, number][];
  sit: number;
};
const HARE_HIP = 50;
const drawHare = (c: Ctx, h: Hare) => {
  c.save();
  c.translate(h.x, h.y);
  c.scale(h.fx * h.s, h.s);
  c.translate(0, -HARE_HIP + h.lift);
  c.rotate(h.body);
  const PIV: [number, number][] = [
    [26, 12],
    [18, 12],
    [-24, 4],
    [-32, 2],
  ];
  const leg = (i: number) => {
    const [px, py] = PIV[i]!,
      hind = i >= 2,
      [th, sh] = h.legs[i]!;
    part(c, px, py, th, () => {
      ink(c, () => {
        if (hind) {
          ellipseSub(c, 2, 4, 20, 17, 0.3);
        } else {
          c.moveTo(-5, -4);
          c.lineTo(5, -4);
          c.lineTo(3.5, 22);
          c.lineTo(-3.5, 22);
          c.closePath();
        }
      });
      if (hind)
        part(c, 6, 18, sh, () =>
          ink(c, () => {
            c.moveTo(-6, -2);
            c.lineTo(4, -2);
            c.lineTo(4, 26);
            c.lineTo(26, 28);
            c.lineTo(26, 32);
            c.lineTo(-6, 32);
            c.closePath();
          }),
        );
      else
        part(c, 0, 21, sh, () =>
          ink(c, () => {
            c.moveTo(-3.5, 0);
            c.lineTo(3.5, 0);
            c.lineTo(3, 12);
            c.lineTo(9, 13);
            c.lineTo(9, 16);
            c.lineTo(-3.5, 16);
            c.closePath();
          }),
        );
    });
  };
  leg(1);
  leg(3);
  // pompom tail: three tiny hinged puffs
  part(c, -44, -10, h.tail[0], () => {
    ink(c, () => ellipseSub(c, -4, 0, 8, 7));
    part(c, -7, 0, h.tail[1], () => {
      ink(c, () => ellipseSub(c, -4, 0, 6.5, 6));
      part(c, -6, 0, h.tail[2], () => ink(c, () => ellipseSub(c, -3, 0, 5, 4.5)));
    });
  });
  ink(c, () => {
    c.moveTo(-46, 0);
    c.bezierCurveTo(-46, -30, -10, -36, 18, -26);
    c.bezierCurveTo(38, -18, 38, 16, 22, 20);
    c.bezierCurveTo(0, 26, -40, 24, -46, 0);
    c.closePath();
    for (let i = 0; i < 3; i++) crescent(c, -22 + i * 12, -12, 3, -Math.PI / 2);
  });
  leg(0);
  leg(2);
  part(c, 30, -20, h.head, () => {
    const ear = (x: number, a: number) =>
      part(c, x, -8, a, () =>
        ink(c, () => {
          c.moveTo(-5, 0);
          c.bezierCurveTo(-9, -20, -6, -44, 0, -50);
          c.bezierCurveTo(6, -44, 8, -20, 5, 0);
          c.closePath();
          c.moveTo(-1.5, -10);
          c.bezierCurveTo(-3, -22, -2, -34, 0, -40);
          c.bezierCurveTo(2, -34, 3, -22, 1.5, -10);
          c.closePath();
        }),
      );
    ear(4, -0.5 + h.ear);
    ink(c, () => {
      c.moveTo(-6, 4);
      c.bezierCurveTo(-8, -14, 14, -20, 26, -8);
      c.bezierCurveTo(32, -2, 32, 6, 26, 8);
      c.bezierCurveTo(14, 14, -2, 14, -6, 4);
      c.closePath();
      ellipseSub(c, 14, -5, 3.4, 3.4);
    });
    ear(-2, -0.75 + h.ear * 1.2);
  });
  c.restore();
};

type Owl = {
  x: number;
  y: number; // feet
  s: number;
  body: number;
  head: number;
  bow: number;
  wing: [number, number]; // shoulder, wrist (both wings mirror)
  beak: number;
};
const drawOwl = (c: Ctx, o: Owl) => {
  c.save();
  c.translate(o.x, o.y);
  c.scale(o.s, o.s);
  c.rotate(o.body);
  c.translate(0, -36);
  // wings behind the body: two segments each, the hand fringed like primaries
  for (const side of [-1, 1]) {
    c.save();
    c.scale(side, 1);
    part(c, 18, -18, -0.15 - o.wing[0], () => {
      ink(c, () => limb(c, 0, 0, 0, 30, 16, 12, -4));
      part(c, 0, 28, -o.wing[1], () =>
        ink(c, () => {
          c.moveTo(-7, -2);
          c.lineTo(7, -2);
          for (let k = 0; k < 4; k++) {
            c.lineTo(7 - k * 3.5, 26 + k * 3);
            c.lineTo(5 - k * 3.5, 20 + k * 3);
          }
          c.lineTo(-8, 34);
          c.closePath();
        }),
      );
    });
    c.restore();
  }
  // tail fan and feet
  ink(c, () => {
    c.moveTo(-10, 26);
    c.lineTo(10, 26);
    c.lineTo(14, 42);
    c.lineTo(-14, 42);
    c.closePath();
    for (const fx of [-8, 8]) {
      c.moveTo(fx - 6, 33);
      c.lineTo(fx + 6, 33);
      c.lineTo(fx + 7, 38);
      c.lineTo(fx - 7, 38);
      c.closePath();
    }
  });
  // body: an egg with rows of feather crescents cut in the breast
  ink(c, () => {
    ellipseSub(c, 0, 4, 24, 33);
    for (let row = 0; row < 3; row++)
      for (let k = -1; k <= 1; k++) {
        if (row === 2 && k !== 0) continue;
        crescent(c, k * 10 + (row % 2 ? 5 : 0) - (row % 2 && k === 1 ? 20 : 0), -2 + row * 10, 3.6, Math.PI / 2);
      }
  });
  // head: ear tufts, two ringed eye holes, a hinged beak
  part(c, 0, -26, o.head + o.bow, () => {
    ink(c, () => {
      c.moveTo(-20, 2);
      c.bezierCurveTo(-24, -10, -24, -20, -20, -26);
      c.lineTo(-24, -40);
      c.lineTo(-10, -30);
      c.quadraticCurveTo(0, -33, 10, -30);
      c.lineTo(24, -40);
      c.lineTo(20, -26);
      c.bezierCurveTo(24, -20, 24, -10, 20, 2);
      c.bezierCurveTo(12, 10, -12, 10, -20, 2);
      c.closePath();
      const shut = o.bow > 0.25 ? 0.35 : 1; // eyes close as it bows
      for (const ex of [-9, 9]) {
        ellipseSub(c, ex, -14, 7, 7 * shut);
        if (shut === 1) ellipseSub(c, ex, -14, 2.6, 2.6);
      }
    });
    part(c, 0, -8, o.beak, () =>
      ink(c, () => {
        c.moveTo(-3.5, -1);
        c.lineTo(3.5, -1);
        c.lineTo(0, 8);
        c.closePath();
      }),
    );
  });
  c.restore();
};

// ---------------------------------------------------------------- the film
type Cam = { x: number; y: number };
type SetDef = {
  cam: (F: number) => Cam;
  far: (c: Ctx, F: number) => void;
  mid: (c: Ctx, F: number) => void;
  near: (c: Ctx, F: number) => void;
};

export function make(size: Size, id: string): Film {
  const L = layout(size),
    { W, H, u, cx, cy } = L,
    V = L.tall;
  const gy = (V ? 1390 : 858) * u,
    S = (V ? 1.4 : 1.35) * u, // hero fox scale
    q2 = (F: number) => Math.floor(F / 2) * 2; // puppets move on twos
  // the vertical wood is taller, so its crowns are smaller for their height
  const tree = (seed: number, x: number, base: number, h: number, lace = true, br = 3) =>
    makeTree(seed, x, base, h, lace, br, V ? 0.6 : 1);

  // ---------------- the glow: tint per scene on 20-frame dissolves, dim in the dark, flicker + weave on twos
  const tintAt = (F: number) => mixC(mixC(S1, S2, prog(F, T.dark, T.dark + 20)), S3, prog(F, T.dawn, T.dawn + 20));
  const dimAt = (F: number) =>
    (1 - 0.42 * ease.outCubic(prog(F, T.dark, T.dark + 6)) + 0.42 * ease.outCubic(prog(F, 676, 684))) *
    (1 - 0.12 * prog(F, 842, 900));
  // [frame, brightness kick, decay (frames), weave kick (px)]: every story beat lands with a snap of the glow
  const SNAPS: [number, number, number, number][] = [
    [300, 0.3, 8, 0], // the reflection drops into the lantern and it lights
    [T.dark, -0.3, 6, 0], // the lamp gutters: the wood goes dark
    [460, -0.2, 5, 5], // the owl misses its branch
    [600, 0.1, 4, 3], // three leaps, each landing on the beat
    [620, 0.12, 4, 3],
    [640, 0.16, 4, 4],
    [660, 0.55, 9, 0], // the moon bursts out of the lantern
    [680, 0.22, 10, 0], // the glow returns
  ];
  const snapAt = (F: number) => {
    let b = 0,
      w = 0;
    for (const [f, k, d, wk] of SNAPS)
      if (F >= f) {
        const e = Math.exp(-(F - f) / d);
        b += k * e;
        w += wk * e;
      }
    return { b, w };
  };
  const film = (F: number) => {
    const k = Math.floor(F / 2),
      sn = snapAt(F);
    return {
      flick: (1 + 0.02 * (2 * hash(k, 1) - 1)) * (1 + sn.b),
      wx: Math.round(hash(k, 2) * 2.999 - 1) * u,
      wy: (Math.round(hash(k, 3) * 2.999 - 1) + Math.round(sn.w * (F % 2 ? -1 : 1))) * u,
    };
  };
  const glow = (ctx: Ctx, F: number, b: number) => {
    const tint = tintAt(F),
      gx = cx,
      gyC = cy - H * 0.1,
      R = Math.hypot(Math.max(gx, W - gx), Math.max(gyC, H - gyC));
    const g = ctx.createRadialGradient(gx, gyC, 0, gx, gyC, R);
    g.addColorStop(0, css(SURF, b));
    g.addColorStop(0.45 - 0.25 * ease.inOutCubic(prog(F, 842, 900)), css(tint, b));
    g.addColorStop(1, css(tint, 0.65 * b));
    ctx.fillStyle = g;
    ctx.fillRect(-4 * u, -4 * u, W + 8 * u, H + 8 * u);
  };

  // ---------------- offscreen planes (a plane at 0.35 alpha must not darken where its own parts overlap)
  const layerOf = (env: Env, k: string): Layer => {
    const w = Math.round(env.W * env.scale),
      h = Math.round(env.H * env.scale),
      key = `shadowPuppet:${k}:${w}x${h}`;
    let Lr = env.cache.get(key) as Layer | undefined;
    if (!Lr) {
      Lr = env.canvas(w, h);
      env.cache.set(key, Lr);
    }
    return Lr;
  };
  const plane = (ctx: Ctx, env: Env, k: string, alpha: number, draw: (c: Ctx) => void) => {
    if (alpha <= 0.002) return;
    if (alpha >= 0.998) {
      ctx.save();
      draw(ctx);
      ctx.restore();
      return;
    }
    const Lr = layerOf(env, k),
      c = Lr.ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = 1;
    c.globalCompositeOperation = "source-over";
    c.clearRect(0, 0, Lr.canvas.width, Lr.canvas.height);
    c.setTransform(env.scale, 0, 0, env.scale, 0, 0);
    draw(c);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(Lr.canvas as CanvasImageSource, 0, 0, W, H);
    ctx.restore();
  };

  // ---------------- the moon: the one light object (surface disc, 1 px accent2 ring)
  const moon = (ctx: Ctx, x: number, y: number, r: number, a = 1) => {
    if (r <= 0.5 || a <= 0) return;
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fillStyle = C.surface;
    ctx.fill();
    ctx.strokeStyle = C.accent2;
    ctx.lineWidth = 1 * u;
    ctx.stroke();
    ctx.restore();
  };
  const MOON_R = (V ? 66 : 62) * u;

  // ================================================================ SET A · the pond wood (dusk, the borrowing)
  const pondX = (V ? 790 : 1150) * u,
    pondRx = (V ? 120 : 190) * u,
    pondRy = (V ? 12 : 13) * u,
    pondY = gy + (V ? 26 : 22) * u,
    reflX = pondX - (V ? 50 : 55) * u;
  const farA: Tree[] = [],
    midA: Tree[] = [];
  for (let i = 0; i < (V ? 7 : 10); i++)
    farA.push(
      tree(
        100 + i,
        (-120 + i * (V ? 190 : 290)) * u,
        gy - (V ? 150 : 80) * u,
        (V ? 700 : 380) * u + hash(i, 11) * 120 * u,
        true,
        2,
      ),
    );
  // the mid plane leaves a clearing round the moon
  for (const [i, x] of (V ? [40, 330, 1060] : [-60, 460, 940, 1680, 2150]).entries())
    midA.push(tree(200 + i, x * u, gy - (V ? 60 : 36) * u, (V ? 960 : 600) * u + hash(i, 13) * 140 * u, true, 3));
  const nearA: Tree[] = V
    ? [tree(301, -40 * u, gy, 1500 * u, true, 3), tree(302, 1180 * u, gy, 1400 * u, true, 3)]
    : [
        tree(301, 40 * u, gy, 980 * u, true, 3),
        tree(302, 1880 * u, gy, 900 * u, true, 3),
        tree(303, 2500 * u, gy, 940 * u),
      ];
  const reeds = (c: Ctx, F: number, x: number, n: number, seed: number) => {
    const heads: [number, number, number][] = [];
    limbs(c, () => {
      for (let i = 0; i < n; i++) {
        const h = (60 + hash(i, seed) * 70) * u,
          bx = x + (i - n / 2) * 9 * u,
          sway = 0.08 * Math.sin(q2(F) / 14 + i * 1.7 + seed);
        limb(c, bx, gy + 6 * u, bx + Math.sin(sway + (i - n / 2) * 0.06) * h, gy - h, 5 * u, 1.4 * u, 6 * u);
        if (i % 2 === 0) {
          const tx = bx + Math.sin(sway + (i - n / 2) * 0.06) * h * 0.9,
            ty = gy - h * 0.9;
          heads.push([tx, ty, sway]);
        }
      }
    });
    ink(c, () => heads.forEach(([tx, ty, sw]) => ellipseSub(c, tx, ty, 3.4 * u, 10 * u, sw)));
  };
  const farGround = (
    c: Ctx,
    x0: number,
    x1: number,
    lift: number,
    amp: number,
    per: number,
    ph: number,
    bottom = H + 2000 * u,
  ) => groundInk(c, x0, x1, (x) => gy - lift + amp * Math.sin(x / per + ph), bottom, 9 * u, 6 * u);

  const camA = (F: number): Cam =>
    V
      ? { x: 100 * u * ease.inOutCubic(prog(F, 180, 420)), y: -560 * u * (1 - ease.inOutCubic(prog(F, 90, 140))) }
      : { x: 380 * u * ease.inOutCubic(prog(F, 100, 420)), y: 0 };
  const setA: SetDef = {
    cam: camA,
    far: (c, F) => {
      const k = camA(F);
      c.translate(-k.x * 0.3, -k.y * 0.3);
      farGround(c, k.x * 0.3 - 40 * u, k.x * 0.3 + W + 40 * u, (V ? 150 : 80) * u, 14 * u, 260 * u, 0.5, gy + 14 * u);
      for (const t of farA) drawTree(c, t);
    },
    mid: (c, F) => {
      const k = camA(F);
      c.translate(-k.x * 0.6, -k.y * 0.6);
      farGround(c, k.x * 0.6 - 40 * u, k.x * 0.6 + W + 40 * u, (V ? 60 : 36) * u, 10 * u, 180 * u, 2, gy + 14 * u);
      for (const t of midA) drawTree(c, t);
    },
    near: (c, F) => {
      const k = camA(F);
      c.translate(-k.x, -k.y);
      for (const t of nearA) drawTree(c, t);
      groundInk(
        c,
        k.x - 40 * u,
        k.x + W + 40 * u,
        (x) => gy + (Math.abs(x - pondX) < pondRx * 1.05 ? 7 * u : 0),
        H + k.y + 60 * u + 600 * u,
        7 * u,
        12 * u,
        (cc) => ellipseSub(cc, pondX, pondY, pondRx, pondRy),
      );
      reeds(c, F, pondX - pondRx - 6 * u, 7, 1);
      reeds(c, F, pondX + pondRx + 10 * u, 5, 2);
      // the moon's reflection lies in the pond until the fox scoops it up
      if (F < 280) {
        const wob = 1 + 0.08 * Math.sin(q2(F) / 5);
        c.save();
        c.beginPath();
        c.ellipse(reflX, pondY, 30 * u * wob, 7 * u, 0, 0, TAU);
        c.fillStyle = C.surface;
        c.fill();
        c.strokeStyle = C.accent2;
        c.lineWidth = u;
        c.stroke();
        c.restore();
      }
    },
  };

  // ================================================================ SET B · the dark wood (owl, hare)
  const farB: Tree[] = [],
    midB: Tree[] = [];
  for (let i = 0; i < (V ? 7 : 10); i++)
    farB.push(
      tree(
        400 + i,
        (-100 + i * (V ? 190 : 280)) * u,
        gy - (V ? 150 : 80) * u,
        (V ? 720 : 400) * u + hash(i, 21) * 110 * u,
        true,
        2,
      ),
    );
  // the mid plane leaves clearings behind the owl's branch and the hare's path, so both read against the glow
  for (const [i, x] of (V ? [-160, 960] : [-40, 980]).entries())
    midB.push(tree(500 + i, x * u, gy - (V ? 24 : 16) * u, (V ? 950 : 600) * u + hash(i, 23) * 120 * u, true, 3));
  // the owl's tree: a trunk with a sturdy branch and a thin one whose tip is hinged (it dips when the owl lands)
  const owlTree = V
    ? { x: 70 * u, top: 380 * u, b1: [70, 820, 360, 790], b2: [70, 690, 470, 650], tip: 150 }
    : { x: 280 * u, top: 110 * u, b1: [280, 440, 540, 410], b2: [280, 330, 620, 290], tip: 140 };
  const owlTreeCrown = crownOf(owlTree.x, owlTree.top, (V ? 170 : 150) * u, 77);
  const tipAng = (F: number) => {
    const q = q2(F);
    return q < 460 ? 0 : 0.55 * Math.exp(-(q - 460) / 26) * Math.cos((q - 460) / 5) + 0.12 * prog(q, 460, 468);
  };
  const b2Tip = (F: number) => {
    const [x0, y0, x1, y1] = owlTree.b2,
      a = Math.atan2(y1 - y0, x1 - x0) + tipAng(F);
    return {
      jx: x1 * u,
      jy: y1 * u,
      ex: x1 * u + Math.cos(a) * owlTree.tip * u,
      ey: y1 * u + Math.sin(a) * owlTree.tip * u,
      a,
    };
  };
  const nearBTrees: Tree[] = V
    ? [tree(611, 1120 * u, gy, 1300 * u, true, 3)]
    : [tree(611, 1960 * u, gy, 950 * u, true, 3)];
  const owlAt = (F: number): Owl => {
    const q = q2(F),
      [, , b1x, b1y] = owlTree.b1,
      perchX = (b1x - 60) * u,
      perchY = (b1y + 12) * u - 10 * u,
      tip = b2Tip(F),
      landX = tip.ex - 18 * u,
      landY = tip.ey - 6 * u;
    const s = (V ? 1.5 : 1.3) * u;
    const fly = prog(q, 440, 460),
      flying = q >= 440 && q < 460;
    // the miss: it lands on the beat, the tip gives way and it slips before it flaps back up
    const slip = q >= 460 ? 40 * u * Math.min(1, (q - 460) / 4) * Math.exp(-(q - 460) / 16) : 0;
    const x = q < 440 ? perchX : q < 460 ? lerp(perchX, landX, fly) : landX,
      y = q < 440 ? perchY : q < 460 ? lerp(perchY, landY, fly) - 70 * u * Math.sin(Math.PI * fly) : landY + slip;
    // it lands on the dipping tip and tips forward; flaps hard; rights itself on a damped rock
    const tipOver = q >= 460 ? 0.85 * Math.exp(-(q - 460) / 22) * Math.cos((q - 460) / 7) : 0,
      flapHard = q >= 460 && q < 522,
      flap = flying || flapHard,
      w = flap ? (flapHard ? 1 : 0.8) : 0,
      om = flapHard ? TAU / 6 : TAU / 8;
    return {
      x,
      y,
      s,
      body: q < 440 ? 0.03 * Math.sin(q / 9) : flying ? 0.25 * fly : tipOver,
      head: q < 440 ? 0.15 * Math.sin(q / 11) : q > 522 ? 0.12 * Math.sin(q / 5) * Math.exp(-(q - 522) / 20) : 0,
      bow: 0,
      wing: [w * (1.2 + 0.9 * Math.sin(om * q)), w * (0.2 + 0.8 * Math.max(0, Math.sin(om * q - 0.8)))],
      beak: flapHard ? 0.3 : 0,
    };
  };
  const hareAt = (F: number): Hare => {
    const q = q2(F),
      s = (V ? 1.35 : 1.3) * u,
      x0 = (V ? -80 : 2060) * u,
      x1 = (V ? 250 : 1720) * u,
      dir = V ? 1 : -1;
    // three hops, then a stop, then two circles (the card turns over each time it changes direction)
    const hops: [number, number][] = [
      [420, 438],
      [442, 460],
      [464, 482],
    ];
    let x = x0,
      lift = 0,
      body = 0,
      fx = dir,
      legs = STILL.map((l) => [...l] as [number, number]);
    hops.forEach(([a, b]) => {
      const p = prog(q, a, b);
      x += ((x1 - x0) / 3) * p;
      if (q >= a && q < b) {
        const arc = Math.sin(Math.PI * p);
        lift = -34 * arc;
        body = -0.35 * Math.cos(Math.PI * p);
        legs = [
          [-0.9 * arc, 0.4 * arc],
          [-0.8 * arc, 0.5 * arc],
          [0.9 * arc * (p < 0.5 ? 1 : -0.4), -0.6 * arc],
          [0.8 * arc * (p < 0.5 ? 1 : -0.4), -0.5 * arc],
        ];
      }
    });
    let head = 0.1 * Math.sin(q / 6) * prog(q, 482, 488);
    if (q >= 488) {
      const th = TAU * 2 * ease.inOutCubic(prog(q, 488, 552)),
        R = 60 * u;
      x = x1 + dir * R * Math.sin(th);
      const vx = Math.cos(th); // direction of travel along the circle
      fx = dir * Math.sign(vx || 1) * Math.max(0.1, Math.abs(vx));
      lift = -10 * Math.abs(Math.sin(th * 3)) * (q < 552 ? 1 : 0);
      head = -0.15;
    }
    return { x, y: gy, s, fx, lift, body, head, ear: 0.15 * Math.sin(q / 4), tail: [0.2, 0.2, 0.2], legs, sit: 0 };
  };
  const camB = (F: number): Cam => ({ x: 70 * u * prog(F, 400, 580), y: 0 });
  const setB: SetDef = {
    cam: camB,
    far: (c, F) => {
      const k = camB(F);
      c.translate(-k.x * 0.3, 0);
      farGround(c, -40 * u, W + 80 * u, (V ? 150 : 80) * u, 16 * u, 230 * u, 1.3);
      for (const t of farB) drawTree(c, t);
    },
    mid: (c, F) => {
      const k = camB(F);
      c.translate(-k.x * 0.6, 0);
      farGround(c, -40 * u, W + 80 * u, (V ? 24 : 16) * u, 8 * u, 170 * u, 0.2);
      for (const t of midB) drawTree(c, t);
    },
    near: (c, F) => {
      for (const t of nearBTrees) drawTree(c, t);
      const [bx0, by0, bx1, by1] = owlTree.b1,
        [cx0, cy0] = owlTree.b2,
        tip = b2Tip(F);
      limbs(c, () => {
        limb(c, owlTree.x, gy + 20 * u, owlTree.x + 10 * u, owlTree.top + 60 * u, 70 * u, 24 * u, 6 * u);
        limb(c, bx0 * u, by0 * u, bx1 * u, by1 * u, 22 * u, 9 * u, 8 * u);
        limb(c, cx0 * u, cy0 * u, tip.jx, tip.jy, 18 * u, 7 * u, 6 * u);
        limb(c, tip.jx, tip.jy, tip.ex, tip.ey, 7 * u, 3 * u, 3 * u);
      });
      drawCrown(c, owlTreeCrown);
      ink(c, () => leaf(c, tip.ex + 8 * u, tip.ey - 6 * u, 14 * u, tip.a - 0.6, 0.4));
      groundInk(c, -40 * u, W + 40 * u, () => gy, H + 60 * u, 7 * u, 12 * u);
      // ferns at the foot of the wood
      limbs(c, () => {
        for (const [fx0, n] of [
          [V ? 960 : 820, 5],
          [V ? 60 : 1500, 4],
        ] as [number, number][])
          for (let i = 0; i < n; i++) {
            const a = -Math.PI / 2 + (i - (n - 1) / 2) * 0.35 + 0.04 * Math.sin(q2(F) / 12 + i),
              len = (46 + 10 * hash(i, fx0)) * u;
            limb(c, fx0 * u, gy + 4 * u, fx0 * u + Math.cos(a) * len, gy + Math.sin(a) * len, 5 * u, 1.5 * u, 6 * u);
          }
      });
      drawOwl(c, owlAt(F));
      drawHare(c, hareAt(F));
    },
  };

  // ================================================================ SET C · the tallest tree (the giving back)
  const Pc: [number, number][] = V
    ? [
        [620, 0],
        [500, 320],
        [420, 640],
        [350, 960],
      ]
    : [
        [1100, 0],
        [990, 215],
        [880, 430],
        [770, 640],
      ];
  const trunkC = { x: (V ? 740 : 1330) * u, top: gy - (V ? 1330 : 860) * u };
  const tipsC = V ? [380, 300, 230] : [860, 750, 640];
  const crownC = crownOf(trunkC.x + 10 * u, trunkC.top, (V ? 200 : 170) * u, 91);
  const farC: Tree[] = [],
    midC: Tree[] = [];
  for (let i = 0; i < (V ? 7 : 10); i++)
    farC.push(
      tree(
        700 + i,
        (-100 + i * (V ? 190 : 270)) * u,
        gy - (V ? 150 : 80) * u,
        (V ? 900 : 420) * u + hash(i, 31) * 120 * u,
        true,
        2,
      ),
    );
  // the mid plane keeps clear of the climb, so the fox always reads against the glow
  for (const [i, x] of (V ? [-60, 1020] : [120, 1700, 2050]).entries())
    midC.push(tree(800 + i, x * u, gy - (V ? 60 : 36) * u, (V ? 1250 : 640) * u + hash(i, 33) * 120 * u, true, 3));
  const makeTreeCache = { c1: tree(911, 1840 * u, gy, 820 * u, true, 3) };
  const camC = (F: number): Cam =>
    V
      ? {
          x: 0,
          y: kv(F, [
            [586, 0],
            [604, -300 * u],
            [624, -600 * u],
            [644, -890 * u],
            [720, -930 * u],
          ]),
        }
      : {
          x: 0,
          y: kv(F, [
            [586, 0],
            [604, -110 * u],
            [624, -230 * u],
            [644, -350 * u],
            [720, -380 * u],
          ]),
        };
  const setC: SetDef = {
    cam: camC,
    far: (c, F) => {
      const k = camC(F);
      c.translate(0, -k.y * 0.3);
      farGround(c, -40 * u, W + 40 * u, (V ? 150 : 80) * u, 16 * u, 240 * u, 2.2);
      for (const t of farC) drawTree(c, t);
    },
    mid: (c, F) => {
      const k = camC(F);
      c.translate(0, -k.y * 0.6);
      farGround(c, -40 * u, W + 40 * u, (V ? 60 : 36) * u, 10 * u, 160 * u, 0.9);
      for (const t of midC) drawTree(c, t);
    },
    near: (c, F) => {
      const k = camC(F);
      c.translate(0, -k.y);
      ink(c, () => {
        limb(c, trunkC.x, gy + 30 * u, trunkC.x + 12 * u, trunkC.top + 40 * u, (V ? 80 : 70) * u, 22 * u, -10 * u);
      });
      tipsC.forEach((tx, i) => {
        const by = gy - Pc[i + 1]![1] * u,
          ex = tx * u,
          ey = by - 4 * u;
        ink(c, () => limb(c, trunkC.x, by + 14 * u, ex, ey, 30 * u, 9 * u, -8 * u));
        // a spray of cut leaves at the tip and a twig with its own
        ink(c, () => {
          limb(c, ex + 40 * u, by, ex + 6 * u, by - 56 * u, 7 * u, 2 * u, 6 * u);
          for (let j = 0; j < 5; j++) {
            const a = Math.PI + (j - 2) * 0.45,
              l = 18 * u;
            leaf(c, ex + Math.cos(a) * (l + 4 * u), ey + Math.sin(a) * (l + 4 * u), l, a, 0.34);
          }
          for (let j = 0; j < 3; j++) {
            const a = -Math.PI / 2 - 0.7 + j * 0.7;
            leaf(c, ex + 6 * u + Math.cos(a) * 16 * u, by - 56 * u + Math.sin(a) * 16 * u, 13 * u, a, 0.34);
          }
        });
      });
      limbs(c, () => {
        // roots
        limb(c, trunkC.x, gy - 30 * u, trunkC.x - 70 * u, gy + 16 * u, 30 * u, 6 * u, 0);
        limb(c, trunkC.x, gy - 30 * u, trunkC.x + 70 * u, gy + 16 * u, 30 * u, 6 * u, 0);
      });
      drawCrown(c, crownC);
      groundInk(c, -40 * u, W + 40 * u, () => gy, H + 60 * u + 1000 * u, 7 * u, 12 * u);
      if (!V) drawTree(c, makeTreeCache.c1);
    },
  };

  // ================================================================ SET D · the hill at dawn
  const hx = (V ? 540 : 960) * u;
  const hill = (x: number) =>
    gy + (V ? 50 : 36) * u - (V ? 190 : 150) * u * Math.exp(-(((x - hx) / ((V ? 430 : 560) * u)) ** 2));
  const farD: Tree[] = [];
  for (let i = 0; i < 12; i++)
    farD.push(
      tree(
        1000 + i,
        (-80 + i * (V ? 110 : 180)) * u,
        gy - (V ? 100 : 60) * u,
        (V ? 380 : 260) * u + hash(i, 41) * 90 * u,
        true,
        2,
      ),
    );
  const nearD: Tree[] = V
    ? [tree(1101, 1060 * u, gy + 40 * u, 1200 * u, true, 3)]
    : [tree(1101, 90 * u, gy + 30 * u, 900 * u, true, 3), tree(1102, 1880 * u, gy + 30 * u, 820 * u)];
  const camD = (F: number): Cam => ({ x: 40 * u * prog(F, 700, 830), y: 0 });
  const sitters = (F: number) => {
    const q = q2(F),
      s = (V ? 1.35 : 1.3) * u,
      spread = (V ? 265 : 290) * u;
    const fxX = hx - spread,
      hrX = hx + spread;
    const fox: Fox = {
      x: fxX,
      y: hill(fxX) + 2 * u,
      s,
      fx: 1,
      lift: 18,
      body: -0.5,
      head: 0.35 + 0.05 * Math.sin(q / 14),
      jaw: 0,
      ear: 0.05 * Math.sin(q / 9),
      tail: [-0.55 + 0.08 * Math.sin(q / 10), -0.5, -0.6],
      legs: [
        [0.5, 0],
        [0.45, 0],
        [-0.95, 1.9],
        [-0.9, 1.9],
      ],
    };
    const hare: Hare = {
      x: hrX,
      y: hill(hrX) + 2 * u,
      s: s * 1.02,
      fx: -1,
      lift: 6,
      body: -0.45,
      head: 0.3,
      ear: 0.12 * Math.sin(q / 7) + 0.1,
      tail: [0.1, 0.1, 0.1],
      legs: [
        [0.45, 0],
        [0.4, 0],
        [-0.2, 0.2],
        [-0.2, 0.2],
      ],
      sit: 1,
    };
    const bow = kv(q, [
      [768, 0],
      [786, 0.5],
      [800, 0.5],
      [814, 0],
    ]);
    const owl: Owl = {
      x: hx,
      y: hill(hx) + 4 * u,
      s: (V ? 1.5 : 1.35) * u,
      body: bow * 0.25,
      head: 0.06 * Math.sin(q / 12),
      bow,
      wing: [0, 0],
      beak: 0,
    };
    return { fox, hare, owl };
  };
  const setD: SetDef = {
    cam: camD,
    far: (c, F) => {
      const k = camD(F);
      c.translate(-k.x * 0.3, 0);
      farGround(c, -40 * u, W + 80 * u, (V ? 100 : 60) * u, 22 * u, 300 * u, 0.4);
      for (const t of farD) drawTree(c, t);
    },
    mid: (c, F) => {
      const k = camD(F);
      c.translate(-k.x * 0.6, 0);
      groundInk(
        c,
        -40 * u,
        W + 80 * u,
        (x) => gy - (V ? 20 : 10) * u + 40 * u * Math.sin(x / (240 * u) + 0.7),
        H + 60 * u,
        9 * u,
        8 * u,
      );
    },
    near: (c, F) => {
      const k = camD(F);
      c.translate(-k.x, 0);
      for (const t of nearD) drawTree(c, t);
      groundInk(c, -40 * u + k.x, W + 80 * u + k.x, hill, H + 60 * u, 7 * u, 12 * u);
      const a = sitters(F);
      drawFox(c, a.fox);
      drawHare(c, a.hare);
      drawOwl(c, a.owl);
    },
  };

  // ================================================================ the hero fox (scenes 1–4), one continuous track
  const A_START = (V ? -420 : -420) * u,
    A_STOP = (V ? 400 : 780) * u,
    vOff = (V ? 2.6 : 7) * u,
    TW = 10, // trot period (frames)
    POLE_UP = V ? -1.05 : -0.6;
  const xA = (q: number) =>
    q < 104 ? A_START : q < 200 ? lerp(A_START, A_STOP, (q - 104) / 96) : q < 334 ? A_STOP : A_STOP + vOff * (q - 334);
  const BSTOP = V ? 470 : 452;
  const x400 = xA(400) - camA(400).x,
    xB = (q: number) => x400 + vOff * (Math.min(q, BSTOP) - 400),
    xC0 = xB(560);
  const foxAt = (F: number): Fox => {
    const q = q2(F);
    let x = 0,
      y = gy,
      fx = 1,
      lift = 0,
      body = 0,
      walkW = 0,
      tailBase = 0.35;
    let legs: [number, number][] = STILL;
    // position and gait, by scene
    if (q < T.dark) {
      const k = camA(q);
      x = xA(q) - k.x;
      y = gy - k.y;
      walkW = q < 200 ? 1 - prog(q, 194, 200) : q >= 334 ? prog(q, 334, 340) : 0;
    } else if (q < T.give) {
      x = xB(q);
      walkW = 1 - prog(q, BSTOP - 6, BSTOP);
    } else {
      const k = camC(q);
      fx = Math.cos(Math.PI * prog(q, 562, 570)); // she turns over, like a card, to face the tree
      if (Math.abs(fx) < 0.08) fx = fx < 0 ? -0.08 : 0.08;
      if (q < 586) {
        x = lerp(xC0, Pc[0]![0] * u, prog(q, 570, 582));
        walkW = q >= 570 ? 1 - prog(q, 578, 582) : 0;
        if (q >= 582) {
          const cr = prog(q, 582, 586); // a crouch before the first spring
          lift = 10 * cr;
          body = 0.08 * cr;
        }
      } else {
        // three stepped leaps, branch by branch
        const leaps: [number, number][] = [
          [586, 600],
          [606, 620],
          [626, 640],
        ];
        let li = 0;
        while (li < 2 && q >= leaps[li]![1] + 2) li++;
        const [a, b] = leaps[li]!,
          p = prog(q, a, b),
          from = Pc[li]!,
          to = Pc[li + 1]!;
        x = lerp(from[0], to[0], p) * u;
        const baseY = gy - lerp(from[1], to[1], p) * u,
          arc = (V ? 150 : 90) * u * Math.sin(Math.PI * p);
        y = baseY - arc;
        if (q >= a && q < b) {
          body = -0.45 * Math.cos(Math.PI * p) * Math.sin(Math.PI * Math.min(1, p * 1.4));
          const t = Math.sin(Math.PI * p);
          legs = [
            [-0.9 * t, 0.9 * t],
            [-0.8 * t, 1.0 * t],
            [0.9 * t, -0.3 * t],
            [0.8 * t, -0.2 * t],
          ];
          tailBase = 0.35 - 0.5 * t;
        } else if (q < a) {
          // a crouch before the spring
          const cr = prog(q, a - 4, a);
          lift = 10 * cr;
          body = 0.08 * cr;
        }
      }
      y -= k.y;
    }
    const walkT = q;
    if (walkW > 0) legs = walk(walkT, TW, walkW);
    const bob = walkW * 3 * Math.abs(Math.sin((Math.PI / TW) * 2 * walkT));
    // the performance: head, ears, jaw and pole as eased angles between poses
    const head = kv(q, [
      [202, 0],
      [214, -0.55],
      [222, -0.55],
      [234, 0.4],
      [242, 0.4],
      [256, -0.1],
      [274, 0.3],
      [302, 0.3],
      [322, 0.02],
      [480, 0.02],
      [494, -0.45],
      [502, -0.45],
      [510, 0.05],
      [516, 0.05],
      [532, 0.34],
      [564, 0.34],
      [576, 0],
      [642, 0],
      [652, -0.45],
      [700, -0.45],
      [714, -0.1],
    ]);
    const ear = kv(q, [
      [506, 0],
      [526, -1.05],
      [566, -1.05],
      [578, 0.1],
      [584, 0],
    ]);
    const droop = prog(q, 508, 530) * (1 - prog(q, 564, 580));
    const poleA = kv(q, [
      [240, -0.28],
      [254, -0.95],
      [274, 0.12],
      [302, 0.12],
      [322, -0.28],
      [642, -0.28],
      [652, POLE_UP],
      [700, POLE_UP],
      [716, -0.5],
    ]);
    const walkSwing = 0.28 * Math.sin((TAU / TW) * walkT + 1) * walkW,
      settle = (from: number) => (q >= from ? 0.3 * Math.exp(-(q - from) / 14) * Math.sin((q - from) / 3) : 0),
      tip = kv(q, [
        [648, 0],
        [658, 2.3],
        [688, 2.3],
        [704, 0],
      ]);
    return {
      x,
      y,
      s: S,
      fx,
      lift: lift - bob + droop * 3,
      body: body + droop * 0.06,
      head,
      jaw: kv(q, [
        [300, 0],
        [304, 0.1],
        [312, 0],
      ]),
      ear,
      tail: [
        tailBase - droop * 0.75 + 0.1 * Math.sin(q / 9 + 0.5) + walkW * 0.1 * Math.sin((TAU / TW) * q),
        0.12 * Math.sin(q / 9) - droop * 0.2,
        0.16 * Math.sin(q / 9 - 0.6),
      ],
      legs,
      pole: {
        a: poleA,
        swing: walkSwing + settle(200) + settle(322) + settle(470) + settle(640) + tip,
        lit: q >= 300 && q < 660 ? 1 : 0,
      },
    };
  };

  // ================================================================ cards and bands (cut-paper borders)
  const serif = (sz: number) => ({ size: sz * u, family: F_.serif, color: INK });
  const wrap2 = (ctx: Ctx, s: string, sz: number, max: number) => {
    if (!V && measure(ctx, s, serif(sz)) <= max) return [s];
    const words = s.split(" ");
    let best: [string, string] = [s, ""],
      bestD = Infinity;
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(" "),
        b = words.slice(i).join(" "),
        d = Math.abs(measure(ctx, a, serif(sz)) - measure(ctx, b, serif(sz)));
      if (d < bestD) {
        bestD = d;
        best = [a, b];
      }
    }
    return best;
  };
  const band = (ctx: Ctx, F: number) => {
    const card = CARDS.find(([a, b]) => F >= a && F < b);
    if (!card) return;
    const [a, b, line] = card,
      al = Math.min(prog(F, a + 6, a + 16), 1 - prog(F, b - 10, b));
    if (al <= 0) return;
    // captions at 56 px (landscape) and 52 px (vertical), above the brief's 44/40 so they read on a phone
    const x0 = (V ? 70 : 200) * u,
      x1 = W - x0,
      sz = V ? 52 : 56,
      lines = wrap2(ctx, line, sz, x1 - x0 - 140 * u),
      lh = sz * 1.22 * u,
      y1 = V ? H - L.safe.bottom : H - 64 * u,
      y0 = y1 - lines.length * lh - 52 * u;
    ctx.save();
    ctx.globalAlpha = al;
    ctx.fillStyle = css(SURF, 1, 0.92);
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    // the cut-paper border: a rule, scallops along the long edges, a curl at each end
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3 * u;
    ctx.strokeRect(x0 + 7 * u, y0 + 7 * u, x1 - x0 - 14 * u, y1 - y0 - 14 * u);
    ink(ctx, () => {
      for (let x = x0 + 26 * u; x < x1 - 20 * u; x += 22 * u) {
        ctx.moveTo(x + 5 * u, y0);
        ctx.arc(x, y0, 5 * u, 0, Math.PI, true);
        ctx.closePath();
        ctx.moveTo(x - 5 * u, y1);
        ctx.arc(x, y1, 5 * u, Math.PI, 0, true);
        ctx.closePath();
      }
    });
    const ym = (y0 + y1) / 2;
    curl(ctx, x0 + 30 * u, ym, 14 * u, 1, 0, 2.5 * u);
    curl(ctx, x1 - 30 * u, ym, 14 * u, -1, 0, 2.5 * u);
    const base = ym + sz * 0.3 * u - ((lines.length - 1) * lh) / 2;
    lines.forEach((s, i) => text(ctx, s, cx, base + i * lh, { ...serif(sz), align: "center" }));
    ctx.restore();
  };
  // the full card border: double rule, a dot row between, scallops outside, rosettes in the corners; it draws
  // itself from the top centre both ways round and meets at the bottom
  const cardBox = V
    ? { x: L.safe.x + 20 * u, y: L.safe.top + 10 * u, x1: W - L.safe.x - 20 * u, y1: H - L.safe.bottom - 10 * u }
    : { x: 100 * u, y: 80 * u, x1: W - 100 * u, y1: H - 80 * u };
  const cardBorder = (ctx: Ctx, p: number, al: number) => {
    if (al <= 0 || p <= 0) return;
    const { x, y, x1, y1 } = cardBox,
      w = x1 - x,
      h = y1 - y,
      Pm = 2 * (w + h);
    const at = (d: number): [number, number, number, number] => {
      d = ((d % Pm) + Pm) % Pm;
      if (d < w) return [x + d, y, 0, -1];
      if (d < w + h) return [x1, y + d - w, 1, 0];
      if (d < 2 * w + h) return [x1 - (d - w - h), y1, 0, 1];
      return [x, y1 - (d - 2 * w - h), -1, 0];
    };
    const shown = (d: number) => {
      const dd = Math.abs((((d - w / 2) % Pm) + Pm) % Pm);
      return Math.min(dd, Pm - dd) <= (p * Pm) / 2;
    };
    ctx.save();
    ctx.globalAlpha *= al;
    ctx.strokeStyle = INK;
    ctx.lineCap = "round";
    for (const [inset, lw] of [
      [0, 7],
      [18, 2.5],
    ] as [number, number][]) {
      ctx.beginPath();
      let on = false;
      for (let d = 0; d <= Pm; d += 6 * u) {
        const [px, py, nx, ny] = at(d),
          vis = shown(d);
        const X = px - nx * inset * u,
          Y = py - ny * inset * u;
        if (vis && !on) ctx.moveTo(X, Y);
        else if (vis) ctx.lineTo(X, Y);
        on = vis;
      }
      ctx.lineWidth = lw * u;
      ctx.stroke();
    }
    ink(ctx, () => {
      for (let d = 17 * u; d < Pm; d += 34 * u) {
        if (!shown(d)) continue;
        const [px, py, nx, ny] = at(d);
        // scallop outside, a dot between the rules
        const sx = px + nx * 3 * u,
          sy = py + ny * 3 * u,
          ang = Math.atan2(ny, nx);
        ctx.moveTo(sx + Math.cos(ang - Math.PI / 2) * 8 * u, sy + Math.sin(ang - Math.PI / 2) * 8 * u);
        ctx.arc(sx, sy, 8 * u, ang - Math.PI / 2, ang + Math.PI / 2);
        ctx.closePath();
        ellipseSub(ctx, px - nx * 9 * u, py - ny * 9 * u, 2.6 * u, 2.6 * u);
      }
    });
    // corner rosettes with curls, each springing in when the border reaches it
    const corners: [number, number, number, number, number][] = [
      [x, y, 1, 1, 0],
      [x1, y, -1, 1, w],
      [x1, y1, -1, -1, w + h],
      [x, y1, 1, -1, 2 * w + h],
    ];
    for (const [kx, ky, sx, sy, d] of corners) {
      if (!shown(d)) continue;
      ctx.save();
      ctx.translate(kx, ky);
      ctx.scale(sx, sy);
      ink(ctx, () => {
        ellipseSub(ctx, 0, 0, 24 * u, 24 * u);
        for (let i = 0; i < 6; i++)
          leaf(ctx, Math.cos((i * TAU) / 6) * 13 * u, Math.sin((i * TAU) / 6) * 13 * u, 7 * u, (i * TAU) / 6, 0.45);
      });
      curl(ctx, 58 * u, 30 * u, 18 * u, 1, Math.PI, 3 * u);
      curl(ctx, 30 * u, 58 * u, 18 * u, -1, Math.PI / 2, 3 * u);
      ctx.restore();
    }
    ctx.restore();
  };
  const titleCard = (ctx: Ctx, F: number) => {
    const al = 1 - prog(F, 88, 106);
    if (al <= 0) return;
    const push = 1 + 0.03 * prog(F, 0, 106);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(push, push);
    ctx.translate(-cx, -cy);
    ctx.globalAlpha = al;
    cardBorder(ctx, ease.outCubic(prog(F, -4, 20)), 1);
    const ta = ease.outCubic(prog(F, -3, 12)),
      rise = (1 - ta) * 24 * u,
      mid = cy - (V ? 40 : 10) * u;
    // the moon as an ornament above the title, between two curls
    const ma = ease.outBack(prog(F, 4, 16));
    moon(ctx, cx, mid - (V ? 230 : 170) * u, 26 * u * ma, 1);
    if (ma > 0) {
      ctx.save();
      ctx.globalAlpha *= clamp(ma);
      curl(ctx, cx - 64 * u, mid - (V ? 230 : 170) * u, 16 * u, -1, 0, 2.5 * u);
      curl(ctx, cx + 64 * u, mid - (V ? 230 : 170) * u, 16 * u, 1, 0, 2.5 * u);
      ctx.restore();
    }
    ctx.globalAlpha = al * ta;
    if (V) {
      text(ctx, "The Fox Who", cx, mid - 50 * u + rise, { ...serif(96), align: "center" });
      text(ctx, "Borrowed the Moon", cx, mid + 50 * u + rise, { ...serif(96), align: "center" });
    } else text(ctx, "The Fox Who Borrowed the Moon", cx, mid + 30 * u + rise, { ...serif(100), align: "center" });
    ctx.globalAlpha = al * ease.outCubic(prog(F, 10, 22));
    text(ctx, "a fable in cut paper", cx, mid + (V ? 150 : 120) * u, {
      size: 38 * u,
      family: F_.italic,
      color: INK,
      align: "center",
    });
    // the heroine already on stage: she trots out from behind the border, stops under the title, looks up at the moon
    ctx.globalAlpha = al;
    const { x: bx0, x1: bx1, y1: by1 } = cardBox,
      q = q2(F),
      ts = (V ? 0.95 : 0.8) * u,
      walkW = 1 - prog(q, 40, 46);
    ctx.save();
    ctx.beginPath();
    ctx.rect(bx0 + 24 * u, 0, bx1 - bx0 - 48 * u, H);
    ctx.clip();
    drawFox(ctx, {
      x: lerp(bx0 + (V ? 20 : 60) * u, cx - (V ? 60 : 140) * u, ease.outCubic(prog(q, 0, 46))),
      y: by1 - (V ? 50 : 34) * u,
      s: ts,
      fx: 1,
      lift: -walkW * 3 * Math.abs(Math.sin((Math.PI / 8) * 2 * q)),
      body: 0,
      head: kv(q, [
        [48, 0],
        [60, -0.5],
      ]),
      jaw: 0,
      ear: 0.06 * Math.sin(q / 7),
      tail: [0.35 + 0.1 * Math.sin(q / 9), 0.12 * Math.sin(q / 9 - 0.4), 0.16 * Math.sin(q / 9 - 0.9)],
      legs: walkW > 0 ? walk(q, 8, walkW) : STILL,
      pole: {
        a: -0.28,
        swing:
          0.28 * Math.sin((TAU / 8) * q + 1) * walkW +
          (q >= 46 ? 0.3 * Math.exp(-(q - 46) / 14) * Math.sin((q - 46) / 3) : 0),
        lit: 0,
      },
    });
    ctx.restore();
    ctx.restore();
  };
  // the fox asleep under 'The End': body, a tail wrapped round in front, the head resting on it; thin cut lines in
  // the card's colour separate the parts, as a paper cutter would leave them
  const sleepingFox = (ctx: Ctx, x: number, y: number, s: number, F: number) => {
    const br = 1 + 0.035 * Math.sin((q2(F) / 40) * TAU),
      cut = css(mixC(SURF, tintAt(F), 0.45), dimAt(F));
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    const cutLine = (build: () => void) => {
      ctx.beginPath();
      build();
      ctx.strokeStyle = cut;
      ctx.lineWidth = 3.2;
      ctx.lineJoin = "round";
      ctx.stroke();
    };
    // the body, breathing
    ink(ctx, () => {
      ctx.save();
      ctx.translate(0, 12);
      ctx.scale(1, br);
      ctx.translate(0, -12);
      ctx.moveTo(-64, 12);
      ctx.bezierCurveTo(-70, -36, 18, -48, 46, -16);
      ctx.bezierCurveTo(56, -2, 44, 12, 22, 12);
      ctx.closePath();
      ctx.restore();
    });
    // the tail, wrapped round the front, with its crescents
    const tail = () => {
      ctx.moveTo(-62, 6);
      ctx.bezierCurveTo(-84, 30, -10, 38, 52, 26);
      ctx.bezierCurveTo(82, 20, 92, 6, 86, -8);
      ctx.bezierCurveTo(76, 8, 42, 14, -10, 14);
      ctx.bezierCurveTo(-40, 14, -54, 10, -62, 6);
      ctx.closePath();
    };
    cutLine(tail);
    ink(ctx, () => {
      tail();
      for (let i = 0; i < 4; i++) crescent(ctx, -30 + i * 22, 22 - i * 0.5, 4.2, Math.PI);
    });
    // the head resting on the tail: long muzzle, a closed eye, two ears
    const head = () => {
      ctx.moveTo(14, 10);
      ctx.bezierCurveTo(6, -14, 30, -32, 48, -20);
      ctx.lineTo(84, 0);
      ctx.bezierCurveTo(78, 10, 44, 16, 14, 10);
      ctx.closePath();
    };
    cutLine(head);
    ink(ctx, () => {
      head();
      crescent(ctx, 44, -8, 4.5, -Math.PI / 2); // a closed eye
    });
    ink(ctx, () => {
      ctx.moveTo(20, -10);
      ctx.lineTo(18, -48);
      ctx.lineTo(36, -22);
      ctx.closePath();
      ctx.moveTo(32, -20);
      ctx.lineTo(38, -50);
      ctx.lineTo(48, -20);
      ctx.closePath();
    });
    ctx.restore();
  };
  const endCard = (ctx: Ctx, F: number) => {
    const al = prog(F, T.end, T.end + 12);
    if (al <= 0) return;
    const push = 1 + 0.03 * prog(F, T.end, N);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(push, push);
    ctx.translate(-cx, -cy);
    ctx.globalAlpha = al;
    cardBorder(ctx, ease.inOutCubic(prog(F, T.end, T.end + 34)), 1);
    const ta = ease.outCubic(prog(F, 834, 852));
    ctx.globalAlpha = ta;
    text(ctx, "The End", cx, cy + (V ? -20 : 0) * u + (1 - ta) * 20 * u, { ...serif(V ? 150 : 140), align: "center" });
    ctx.globalAlpha = ease.outCubic(prog(F, 846, 862));
    sleepingFox(ctx, cx - 16 * u, cy + (V ? 190 : 175) * u, (V ? 2.3 : 2.1) * u, F);
    ctx.restore();
  };

  // corner tendrils frame the picture during the scenes
  const tendrils = (ctx: Ctx, F: number, al: number) => {
    if (al <= 0) return;
    const sw = 0.02 * Math.sin(q2(F) / 20);
    const corners: [number, number, number, number][] = [
      [0, 0, 1, 1],
      [W, 0, -1, 1],
      [W, H, -1, -1],
      [0, H, 1, -1],
    ];
    ctx.save();
    ctx.globalAlpha = al;
    for (const [kx, ky, sx, sy] of corners) {
      ctx.save();
      ctx.translate(kx, ky);
      ctx.scale(sx * u, sy * u);
      ctx.rotate(sw * sx * sy);
      ink(ctx, () => {
        ctx.moveTo(0, 0);
        ctx.lineTo(70, 0);
        ctx.quadraticCurveTo(30, 12, 12, 30);
        ctx.quadraticCurveTo(10, 50, 0, 70);
        ctx.closePath();
        leaf(ctx, 92, 14, 14, 0.4, 0.4);
        leaf(ctx, 16, 94, 14, 1.2, 0.4);
        leaf(ctx, 60, 50, 11, 0.8, 0.45);
      });
      curl(ctx, 120, 26, 16, 1, Math.PI, 3);
      curl(ctx, 26, 120, 16, -1, 0, 3);
      ctx.restore();
    }
    ctx.restore();
  };

  // ================================================================ paint
  const SETS: [SetDef, (F: number) => number, string][] = [
    [setA, (F) => Math.min(prog(F, 90, 110), 1 - prog(F, T.dark, T.dark + 20)), "A"],
    [setB, (F) => Math.min(prog(F, T.dark, T.dark + 20), 1 - prog(F, T.give, T.give + 20)), "B"],
    [setC, (F) => Math.min(prog(F, T.give, T.give + 20), 1 - prog(F, T.dawn, T.dawn + 20)), "C"],
    [setD, (F) => Math.min(prog(F, T.dawn, T.dawn + 20), 1 - prog(F, 810, 830)), "D"],
  ];
  const moonA = (F: number): [number, number] => {
    const k = camA(F);
    return V ? [720 * u - k.x * 0.08, 470 * u - k.y * 0.08] : [1180 * u - k.x * 0.08, 210 * u];
  };
  const moonC = (F: number): [number, number] => {
    const k = camC(F);
    return V ? [640 * u, 470 * u - (k.y + 930 * u) * 0.08] : [440 * u, 180 * u - (k.y + 380 * u) * 0.08];
  };

  const paint = (ctx: Ctx, env: Env, F: number) => {
    F = clamp(F, 0, N - 1);
    const life = film(F),
      b = dimAt(F) * life.flick;
    ctx.setTransform(env.scale, 0, 0, env.scale, life.wx * env.scale, life.wy * env.scale);
    glow(ctx, F, b);
    const fox = F >= 100 && F < T.dawn + 20 ? foxAt(F) : null,
      lan = fox ? lanternAt(fox) : null,
      lit = fox?.pole?.lit ?? 0;
    // the lantern's small warm circle, light on the backing glass
    if (lan && (lit > 0 || (F >= 660 && F < 670))) {
      const night = prog(F, T.dark, T.dark + 20) * (1 - prog(F, 668, 688)),
        r = (V ? 300 : 240) * u * (1 + 0.5 * prog(F, 656, 662) - 1.3 * prog(F, 662, 670) * 0.9),
        g = ctx.createRadialGradient(lan[0], lan[1], 0, lan[0], lan[1], r);
      const a = Math.min(1, (0.35 + 0.6 * night) * (1 + snapAt(F).b)) * (1 - prog(F, 660, 670));
      g.addColorStop(0, css(SURF, 1, a));
      g.addColorStop(0.45, css(S1, 1, a * 0.7));
      g.addColorStop(1, css(S1, 1, 0));
      ctx.fillStyle = g;
      ctx.fillRect(lan[0] - r, lan[1] - r, 2 * r, 2 * r);
    }
    // the moon behind the scenery
    if (F >= 90 && F < 330) {
      const [mx, my] = moonA(F),
        shrink = 1 - ease.inCubic(prog(F, 300, 330));
      moon(ctx, mx, my, MOON_R * shrink, prog(F, 90, 110));
    }
    const rise = prog(F, 660, 688);
    if (F >= 688 && F < 740) {
      const [mx, my] = moonC(F);
      moon(ctx, mx, my, MOON_R, 1 - prog(F, T.dawn, T.dawn + 20));
    }
    if (F >= T.dawn) {
      const my = lerp((V ? 820 : 300) * u, (V ? 1240 : 800) * u, ease.inOutCubic(prog(F, 720, 830)));
      moon(ctx, hx, my, MOON_R * 1.35, prog(F, T.dawn, T.dawn + 20) * (1 - prog(F, 810, 830)));
    }
    // the sets on their planes, each dissolving as a whole
    for (const [set, alphaOf, k] of SETS) {
      const a = alphaOf(F);
      if (a <= 0) continue;
      plane(ctx, env, `${k}far`, 0.35 * a, (c) => set.far(c, F));
      plane(ctx, env, `${k}mid`, 0.7 * a, (c) => set.mid(c, F));
      plane(ctx, env, `${k}near`, a, (c) => set.near(c, F));
    }
    // the lantern dips into the pond: rings spread across the water
    if (F >= 270 && F < 316) {
      const k = camA(F);
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(pondX - k.x, pondY - k.y, pondRx, pondRy, 0, 0, TAU);
      ctx.clip();
      ctx.strokeStyle = C.surface;
      for (let i = 0; i < 3; i++) {
        const p = prog(F, 270 + i * 6, 306 + i * 6);
        if (p <= 0 || p >= 1) continue;
        const rx = lerp(12, V ? 110 : 170, ease.outCubic(p)) * u;
        ctx.globalAlpha = 0.9 * (1 - p);
        ctx.lineWidth = 2.5 * u;
        ctx.beginPath();
        ctx.ellipse(reflX - k.x, pondY - k.y, rx, rx * 0.075, 0, 0, TAU);
        ctx.stroke();
      }
      ctx.restore();
    }
    // the hero fox, on the near plane, one continuous performance across four scenes
    if (fox) plane(ctx, env, "fox", Math.min(1, 1 - prog(F, T.dawn, T.dawn + 20)), (c) => drawFox(c, fox));
    // the reflection slides out of the pond into the lantern
    if (F >= 280 && F < 300 && lan) {
      const k = camA(F),
        p = ease.inOutCubic(prog(F, 280, 300)),
        sx = reflX - k.x,
        sy = pondY - k.y,
        x = lerp(sx, lan[0], p),
        y = lerp(sy, lan[1], p) - 30 * u * Math.sin(Math.PI * p);
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(x, y, lerp(30 * u, 6 * u * S, p), lerp(7 * u, 6 * u * S, p), 0, 0, TAU);
      ctx.fillStyle = C.surface;
      ctx.fill();
      ctx.strokeStyle = C.accent2;
      ctx.lineWidth = u;
      ctx.stroke();
      ctx.restore();
    }
    // the moon rises out of the lantern back into the sky, growing to full
    if (F >= 660 && F < 688 && lan) {
      // it bursts out of the lantern on the hit, then sails up and settles to full
      const [mx, my] = moonC(F),
        p = ease.outCubic(rise);
      moon(
        ctx,
        lerp(lan[0], mx, p),
        lerp(lan[1], my, p) - 60 * u * Math.sin(Math.PI * p),
        lerp(6 * u, MOON_R, ease.outBack(prog(F, 660, 676))),
      );
    }
    tendrils(ctx, F, Math.min(prog(F, 96, 116), 1 - prog(F, 812, 826)));
    band(ctx, F);
    if (F < 110) titleCard(ctx, F);
    if (F >= T.end) endCard(ctx, F);
  };

  const cuts = [0, T.dusk, T.borrow, T.dark, T.give, T.dawn, T.end, N],
    names = ["title", "dusk", "borrowing", "dark", "giving-back", "dawn", "the-end"];
  const shots: Shot[] = names.map((sid, i) => ({
    id: sid,
    start: cuts[i]!,
    end: cuts[i + 1]!,
    draw: (ctx, local, env) => paint(ctx, env, cuts[i]! + local),
  }));

  // ---------------- sound: footsteps (every other footfall), leaps, whooshes, the dark and the return
  const steps = (a: number, b: number) => {
    const out: number[] = [];
    for (let f = a; f < b; f += TW) out.push(f);
    return out;
  };
  const ticks = [...steps(106, 196), 270, ...steps(336, V ? 470 : 452), ...steps(570, 582), 600, 620, 640];
  const score = beatScore({
    frames: N,
    fps: FPS,
    bpm: BPM,
    mood: "soft",
    key: -3,
    hits: [T.dark, 460, 660],
    whooshes: [300, 660],
    ticks,
    sign: 840,
    gain: 0.78,
  });
  const audio = (sr: number): [Float32Array, Float32Array] => {
    const [Lc, Rc] = score(sr);
    // gentle hits, mixed under the score: a low soft thump and a quiet bell, for each leap landing and the glow's return
    const thump = (frame: number, g: number, bell: number) => {
      const i0 = Math.round((frame / FPS) * sr),
        len = Math.round(1.6 * sr);
      let ph = 0;
      for (let k = 0; k < len && i0 + k < Lc.length; k++) {
        const t = k / sr;
        ph += (60 + 50 * Math.exp(-t / 0.05)) / sr;
        const v =
          g * Math.sin(TAU * ph) * Math.exp(-t / 0.12) +
          bell *
            (Math.sin(TAU * 440 * 2 ** (-3 / 12) * t) + 0.4 * Math.sin(TAU * 880 * 2 ** (-3 / 12) * 2.76 * 0.5 * t)) *
            Math.exp(-t * 2.2) *
            Math.min(1, t / 0.004);
        Lc[i0 + k] = Math.tanh(Lc[i0 + k]! + v);
        Rc[i0 + k] = Math.tanh(Rc[i0 + k]! + v);
      }
    };
    thump(600, 0.14, 0);
    thump(620, 0.16, 0);
    thump(640, 0.2, 0);
    thump(680, 0.22, 0.07);
    return [Lc, Rc];
  };

  return {
    meta: { title: id, W, H, fps: FPS, bpm: BPM, durationFrames: N, raster: "cpu" },
    assets: { images: {}, fonts: P.assets },
    shots,
    audio,
  };
}

export const shadowPuppet = make("landscape", "shadowPuppet");
export const shadowPuppetVertical = make("vertical", "shadowPuppetVertical");
