// THE CAST: characters as data. One parametric rig per species (a person, a doodle standing, a doodle sitting, a
// slider turtle), one preset per character, and three dials every character answers to: head (small ↔ big), build
// (slim ↔ solid) and stature (short ↔ tall), each 0..1 with 0.5 the default. Expressions and poses are numbers too,
// so any frame of any character is a pure function of (dials, pose, light), and a builder, a story and a still all
// share one source.
//
// The look is SOFT VINYL: every form is filled flat, then lit with gradients (a highlight toward the key light, a
// core shadow away from it, a rim on the far edge) and grounded by a contact shadow. No ctx.filter, no images.
// A scene takes the key light's colour afterwards with one multiply pass (see `keyLight`).
//
// The cast (docs/proposals/2026-09-29-cast-and-room-to-think.md): the Maker (inspired by the studio's owner), Red and
// Parti (the owner's two doodles, by role name), and Slider (a yellow-bellied slider). Nothing here is traced from
// a photo; the likenesses are a few design choices (hair, glasses, a white shirt; coats and markings).
import type { Ctx } from "../core";

export type Dials = { head: number; build: number; stature: number };
export const DEFAULT_DIALS: Dials = { head: 0.5, build: 0.5, stature: 0.5 };
/** the light, as a unit vector pointing TOWARD it (screen space, y down) */
export type Light = { ax: number; ay: number };
export const KEY: Light = { ax: -0.55, ay: -0.83 };

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
/** a dial 0..1 → a factor, 1 at 0.5 */
const dial = (v: number, lo: number, hi: number) => (v < 0.5 ? lerp(lo, 1, v * 2) : lerp(1, hi, (v - 0.5) * 2));

// ------------------------------------------------------------------ colour and shading
const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
};
export const mix = (a: string, b: string, t: number) => {
  const A = rgb(a),
    B = rgb(b);
  const c = A.map((v, i) => Math.round(lerp(v, B[i]!, clamp(t))));
  return `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
};
const rgba = (hex: string, a: number) => {
  const [r, g, b] = rgb(hex);
  return `rgba(${r},${g},${b},${a})`;
};

type Shade = { hi?: number; lo?: number; rim?: number; shadow?: string };
/**
 * Fill the path `path()` builds with `base`, then light it inside its own clip: a core shadow away from the light,
 * a soft highlight toward it and a thin rim on the far edge. (x, y, w, h) is the form's box.
 */
function soft(
  ctx: Ctx,
  path: () => void,
  base: string,
  lt: Light,
  x: number,
  y: number,
  w: number,
  h: number,
  o: Shade = {},
) {
  const cx = x + w / 2,
    cy = y + h / 2,
    R = Math.max(w, h) * 0.62,
    dark = o.shadow ?? "#241a2e";
  ctx.save();
  ctx.beginPath();
  path();
  ctx.fillStyle = base;
  ctx.fill();
  ctx.clip();
  const g = ctx.createLinearGradient(cx + lt.ax * R, cy + lt.ay * R, cx - lt.ax * R, cy - lt.ay * R);
  g.addColorStop(0, rgba(dark, 0));
  g.addColorStop(0.5, rgba(dark, 0));
  g.addColorStop(0.9, rgba(dark, o.lo ?? 0.26));
  g.addColorStop(1, rgba(dark, (o.lo ?? 0.26) * 0.7));
  ctx.fillStyle = g;
  ctx.fillRect(x - R, y - R, w + 2 * R, h + 2 * R);
  const hx = cx + lt.ax * R * 0.42,
    hy = cy + lt.ay * R * 0.42,
    hg = ctx.createRadialGradient(hx, hy, 0, hx, hy, R * 0.85);
  hg.addColorStop(0, `rgba(255,255,255,${o.hi ?? 0.3})`);
  hg.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = hg;
  ctx.fillRect(x - R, y - R, w + 2 * R, h + 2 * R);
  if ((o.rim ?? 0.22) > 0) {
    const rg = ctx.createLinearGradient(cx - lt.ax * R * 0.78, cy - lt.ay * R * 0.78, cx - lt.ax * R, cy - lt.ay * R);
    rg.addColorStop(0, "rgba(255,255,255,0)");
    rg.addColorStop(1, `rgba(255,255,255,${o.rim ?? 0.22})`);
    ctx.fillStyle = rg;
    ctx.fillRect(x - R, y - R, w + 2 * R, h + 2 * R);
  }
  ctx.restore();
}

// ------------------------------------------------------------------ paths
/** a capsule from (x0, y0) to (x1, y1), radius r0 → r1, added to the current path */
function capsule(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, r0: number, r1: number) {
  const a = Math.atan2(y1 - y0, x1 - x0),
    h = Math.PI / 2;
  ctx.moveTo(x0 + Math.cos(a - h) * r0, y0 + Math.sin(a - h) * r0);
  ctx.lineTo(x1 + Math.cos(a - h) * r1, y1 + Math.sin(a - h) * r1);
  ctx.arc(x1, y1, r1, a - h, a + h);
  ctx.lineTo(x0 + Math.cos(a + h) * r0, y0 + Math.sin(a + h) * r0);
  ctx.arc(x0, y0, r0, a + h, a + 3 * h);
  ctx.closePath();
}
/** a smooth closed curve through points (quadratic through midpoints) */
function smooth(ctx: Ctx, pts: [number, number][]) {
  const n = pts.length,
    mid = (i: number) => {
      const a = pts[i % n]!,
        b = pts[(i + 1) % n]!;
      return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] as const;
    };
  const m0 = mid(0);
  ctx.moveTo(m0[0], m0[1]);
  for (let i = 1; i <= n; i++) {
    const p = pts[i % n]!,
      m = mid(i);
    ctx.quadraticCurveTo(p[0], p[1], m[0], m[1]);
  }
  ctx.closePath();
}
/** a fluffy ellipse: scalloped curls round the rim (bumps, depth amp as a fraction of the radius) */
function fluffPts(cx: number, cy: number, rx: number, ry: number, bumps: number, amp: number, rot = 0, seed = 0) {
  const pts: [number, number][] = [],
    n = bumps * 4;
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2,
      k = 1 + amp * (i % 4 === 0 ? 1 : i % 4 === 2 ? -0.35 : 0.45) * (0.8 + 0.4 * Math.sin(seed + i * 1.7)),
      x = Math.cos(t) * rx * k,
      y = Math.sin(t) * ry * k;
    pts.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]);
  }
  return pts;
}
const ellipse = (ctx: Ctx, x: number, y: number, rx: number, ry: number, rot = 0) =>
  ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, Math.PI * 2);
const circle = (ctx: Ctx, x: number, y: number, r: number) => ctx.arc(x, y, Math.max(0.01, r), 0, Math.PI * 2);

/** two-bone IK: the elbow for a shoulder S reaching a hand T; of the two solutions, `pick` chooses one */
function elbow(
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  a: number,
  b: number,
  pick: (e1: [number, number], e2: [number, number]) => boolean,
) {
  let dx = tx - sx,
    dy = ty - sy,
    d = Math.hypot(dx, dy);
  const dMax = a + b - 1e-4,
    dMin = Math.abs(a - b) + 1e-4;
  if (d > dMax) {
    dx *= dMax / d;
    dy *= dMax / d;
    d = dMax;
  }
  if (d < dMin) d = dMin;
  const base = Math.atan2(dy, dx),
    A = Math.acos(clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1)),
    e1: [number, number] = [sx + Math.cos(base + A) * a, sy + Math.sin(base + A) * a],
    e2: [number, number] = [sx + Math.cos(base - A) * a, sy + Math.sin(base - A) * a],
    [ex, ey] = pick(e1, e2) ? e1 : e2;
  return { ex, ey, hx: sx + dx, hy: sy + dy };
}

/** a soft contact shadow on the floor under a character (drawn before it) */
export function contact(ctx: Ctx, x: number, y: number, w: number, alpha = 0.22) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, w);
  g.addColorStop(0, `rgba(30,22,40,${alpha})`);
  g.addColorStop(0.55, `rgba(30,22,40,${alpha * 0.45})`);
  g.addColorStop(1, "rgba(30,22,40,0)");
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, 0.16);
  ctx.translate(-x, -y);
  ctx.fillStyle = g;
  ctx.fillRect(x - w, y - w, w * 2, w * 2);
  ctx.restore();
}

// ================================================================== THE MAKER (a person, front view)
export const MAKER = {
  skin: "#e0b08a",
  skinDark: "#c48e6a",
  hair: "#2a201b",
  hairHi: "#4a3a31",
  shirt: "#f6f4f0",
  shirtLine: "#d9d5ce",
  trousers: "#3a3e46",
  shoe: "#f3f2ee",
  sole: "#c9c5bd",
  glasses: "#1d1b1b",
  iris: "#3a291f",
  brow: "#2a201b",
  lip: "#b87866",
  blush: "#e8907f",
};

export type MakerPose = {
  blink?: number; // 0..1 lids closed
  smile?: number; // −1 (frown) .. 1 (grin)
  puff?: number; // cheeks full of air
  mouthO?: number; // a small round "oh"
  squint?: number; // lower lids up, from bright light
  wide?: number; // eyes wide open
  brow?: number; // −1 (frown) .. 1 (raised)
  gazeX?: number; // −1..1
  gazeY?: number; // −1..1
  cross?: number; // eyes crossing
  blush?: number;
  tilt?: number; // head roll, radians
  lean?: number; // body lean, radians
  bob?: number; // units, up is negative
  cheeks?: number; // both hands to the cheeks
  chin?: number; // right hand to the chin (thinking)
  shield?: number; // left hand up shading the eyes
  glassesPush?: number; // right forefinger to the bridge
  wave?: number; // right arm up, waving
  wavePhase?: number; // radians
  hips?: number; // hands on hips
  lookDown?: number; // head down to the feet
  stepL?: number; // left foot lifted 0..1
  stepR?: number;
};

/**
 * The Maker, feet on the ground at (x, y), `s` pixels per unit (a unit ≈ one head height at the default dials;
 * the whole figure is about 3.4 units tall).
 */
export function drawMaker(ctx: Ctx, x: number, y: number, s: number, d: Dials, p: MakerPose = {}, lt: Light = KEY) {
  const hk = dial(d.head, 0.78, 1.6),
    bk = dial(d.build, 0.82, 1.32),
    st = dial(d.stature, 0.84, 1.24);
  const C = MAKER;
  const legLen = 1.0 * st,
    shoeH = 0.13,
    hipY = -(shoeH + legLen),
    torsoH = 0.95 * Math.pow(st, 0.6),
    shY = hipY - torsoH,
    neckH = 0.12,
    headH = 1.0 * hk,
    headW = 0.86 * hk,
    shW = 0.98 * bk,
    hipW = 0.76 * bk,
    legR = 0.135 * bk,
    armR = 0.1 * Math.pow(bk, 0.8);
  const lookDown = p.lookDown ?? 0,
    tilt = (p.tilt ?? 0) + lookDown * 0.05,
    neckX = 0,
    neckY = shY - neckH * 0.3,
    headCY = shY - neckH - headH * 0.47 + lookDown * 0.06;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.rotate(p.lean ?? 0);
  ctx.translate(0, p.bob ?? 0);

  // ---- legs and shoes
  const leg = (side: -1 | 1, lift: number) => {
    const hx = side * hipW * 0.24,
      ax = side * hipW * 0.27,
      ay = -shoeH - lift * 0.12;
    soft(
      ctx,
      () => capsule(ctx, hx, hipY + 0.05, ax, ay - 0.02, legR, legR * 0.84),
      C.trousers,
      lt,
      hx - legR,
      hipY,
      legR * 2,
      legLen,
      {
        hi: 0.14,
        lo: 0.34,
      },
    );
    const sx = ax + side * 0.03;
    soft(
      ctx,
      () => {
        ctx.moveTo(sx - 0.15, ay + 0.1);
        ctx.bezierCurveTo(sx - 0.17, ay - 0.06, sx - 0.06, ay - 0.1, sx + 0.02, ay - 0.08);
        ctx.bezierCurveTo(sx + 0.14, ay - 0.06, sx + 0.18, ay + 0.02, sx + 0.17, ay + 0.1);
        ctx.closePath();
      },
      C.shoe,
      lt,
      sx - 0.17,
      ay - 0.1,
      0.34,
      0.2,
      { hi: 0.2, lo: 0.2 },
    );
    ctx.fillStyle = C.sole;
    ctx.fillRect(sx - 0.16, ay + 0.075, 0.33, 0.035);
  };
  leg(-1, p.stepL ?? 0);
  leg(1, p.stepR ?? 0);
  // the seat of the trousers, under the shirt hem
  soft(
    ctx,
    () => ctx.roundRect(-hipW / 2, hipY - 0.08, hipW, 0.28, 0.1),
    C.trousers,
    lt,
    -hipW / 2,
    hipY - 0.08,
    hipW,
    0.28,
    { hi: 0.1, lo: 0.3 },
  );

  // ---- neck
  soft(
    ctx,
    () => ctx.roundRect(-0.11 * hk ** 0.3, shY - neckH - 0.1, 0.22 * hk ** 0.3, neckH + 0.2, 0.06),
    C.skin,
    lt,
    -0.12,
    shY - neckH,
    0.24,
    neckH + 0.2,
    {
      hi: 0.05,
      lo: 0.4,
    },
  );

  // ---- the shirt
  const hem = hipY + 0.1;
  const torso = () => {
    ctx.moveTo(-0.14, shY - 0.02);
    ctx.bezierCurveTo(-shW * 0.36, shY - 0.03, -shW / 2, shY + 0.0, -shW / 2, shY + 0.16);
    ctx.bezierCurveTo(-shW / 2 + 0.02, shY + torsoH * 0.55, -hipW / 2 - 0.02, hem - 0.2, -hipW / 2 - 0.03, hem);
    ctx.quadraticCurveTo(0, hem + 0.05, hipW / 2 + 0.03, hem);
    ctx.bezierCurveTo(hipW / 2 + 0.02, hem - 0.2, shW / 2 - 0.02, shY + torsoH * 0.55, shW / 2, shY + 0.16);
    ctx.bezierCurveTo(shW / 2, shY + 0.0, shW * 0.36, shY - 0.03, 0.14, shY - 0.02);
    ctx.closePath();
  };
  soft(ctx, torso, C.shirt, lt, -shW / 2, shY, shW, hem - shY, { hi: 0.25, lo: 0.2, shadow: "#3a3550" });
  // folds: two soft creases from the chest to the waist
  ctx.strokeStyle = rgba(C.shirtLine, 0.8);
  ctx.lineWidth = 0.012;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-shW * 0.28, shY + 0.3);
  ctx.quadraticCurveTo(-shW * 0.2, shY + torsoH * 0.6, -hipW * 0.3, hem - 0.06);
  ctx.moveTo(shW * 0.3, shY + 0.34);
  ctx.quadraticCurveTo(shW * 0.22, shY + torsoH * 0.62, hipW * 0.32, hem - 0.08);
  ctx.stroke();
  // the V of the open collar (skin), the placket and its buttons
  soft(
    ctx,
    () => {
      ctx.moveTo(-0.11, shY - 0.02);
      ctx.lineTo(0.11, shY - 0.02);
      ctx.lineTo(0, shY + 0.2);
      ctx.closePath();
    },
    C.skin,
    lt,
    -0.11,
    shY - 0.02,
    0.22,
    0.22,
    { hi: 0.0, lo: 0.4 },
  );
  {
    // the chin's shadow on the neck and collar
    const g = ctx.createRadialGradient(0, shY - 0.04, 0, 0, shY - 0.04, 0.26);
    g.addColorStop(0, "rgba(60,30,30,0.28)");
    g.addColorStop(1, "rgba(60,30,30,0)");
    ctx.fillStyle = g;
    ctx.fillRect(-0.3, shY - 0.3, 0.6, 0.5);
  }
  ctx.strokeStyle = C.shirtLine;
  ctx.lineWidth = 0.014;
  ctx.beginPath();
  ctx.moveTo(0.02, shY + 0.2);
  ctx.lineTo(0.02, hem);
  ctx.stroke();
  for (let i = 0; i < 4; i++) {
    const by = shY + 0.3 + i * ((hem - shY - 0.38) / 3);
    ctx.fillStyle = "#e4e0da";
    ctx.beginPath();
    circle(ctx, 0.045, by, 0.018);
    ctx.fill();
  }
  // collar points
  for (const side of [-1, 1] as const) {
    soft(
      ctx,
      () => {
        ctx.moveTo(side * 0.1, shY - 0.07);
        ctx.lineTo(side * 0.24, shY + 0.04);
        ctx.lineTo(side * 0.13, shY + 0.14);
        ctx.lineTo(side * 0.015, shY + 0.21);
        ctx.closePath();
      },
      "#fbfaf7",
      lt,
      side < 0 ? -0.24 : 0,
      shY - 0.07,
      0.24,
      0.28,
      { hi: 0.15, lo: 0.18, shadow: "#3a3550" },
    );
  }

  // ---- arms (IK to a hand target blended from the pose)
  const shX = shW / 2 - armR * 0.7,
    shYa = shY + 0.12,
    ua = 0.5 * Math.pow(st, 0.5),
    fa = 0.48 * Math.pow(st, 0.5);
  const arm = (side: -1 | 1) => {
    let tx = side * (hipW / 2 + 0.09),
      ty = hipY + 0.14;
    const pull = (w: number, px: number, py: number) => {
      if (w <= 0) return;
      tx = lerp(tx, px, w);
      ty = lerp(ty, py, w);
    };
    const faceY = headCY + lookDown * 0.1;
    pull(p.hips ?? 0, side * (hipW / 2 + 0.02), hipY - 0.02);
    pull(p.cheeks ?? 0, side * (headW * 0.5 + (p.puff ?? 0) * 0.08 + 0.04), faceY + headH * 0.16);
    if (side > 0) {
      pull(p.chin ?? 0, 0.06, faceY + headH * 0.5);
      pull(p.glassesPush ?? 0, headW * 0.3, faceY - headH * 0.04);
      const wv = p.wave ?? 0;
      pull(wv, shW / 2 + 0.22 + Math.sin(p.wavePhase ?? 0) * 0.12, shY - 0.62);
    } else pull(p.shield ?? 0, -headW * 0.34, faceY - headH * 0.26);
    const sx = side * shX,
      // raised hands keep the elbow low; hanging arms keep it out to the side
      e = elbow(sx, shYa, tx, ty, ua, fa, (e1, e2) =>
        ty < shYa - 0.05 ? e1[1] + side * e1[0] * 0.4 > e2[1] + side * e2[0] * 0.4 : side * e1[0] > side * e2[0],
      );
    soft(
      ctx,
      () => capsule(ctx, sx, shYa, e.ex, e.ey, armR * 1.15, armR),
      C.shirt,
      lt,
      Math.min(sx, e.ex) - armR,
      Math.min(shYa, e.ey) - armR,
      Math.abs(e.ex - sx) + 2 * armR,
      Math.abs(e.ey - shYa) + 2 * armR,
      {
        hi: 0.2,
        lo: 0.24,
        shadow: "#3a3550",
      },
    );
    soft(
      ctx,
      () => capsule(ctx, e.ex, e.ey, e.hx, e.hy, armR, armR * 0.86),
      C.shirt,
      lt,
      Math.min(e.ex, e.hx) - armR,
      Math.min(e.ey, e.hy) - armR,
      Math.abs(e.hx - e.ex) + 2 * armR,
      Math.abs(e.hy - e.ey) + 2 * armR,
      {
        hi: 0.2,
        lo: 0.24,
        shadow: "#3a3550",
      },
    );
    // the cuff, then the hand
    const ca = Math.atan2(e.hy - e.ey, e.hx - e.ex),
      cx = e.hx - Math.cos(ca) * 0.04,
      cy = e.hy - Math.sin(ca) * 0.04;
    ctx.strokeStyle = C.shirtLine;
    ctx.lineWidth = 0.014;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(ca + 1.57) * armR * 0.9, cy + Math.sin(ca + 1.57) * armR * 0.9);
    ctx.lineTo(cx - Math.cos(ca + 1.57) * armR * 0.9, cy - Math.sin(ca + 1.57) * armR * 0.9);
    ctx.stroke();
    const hr = 0.085 * Math.pow(bk, 0.4),
      hx = e.hx + Math.cos(ca) * hr * 0.6,
      hy = e.hy + Math.sin(ca) * hr * 0.6;
    soft(
      ctx,
      () => {
        ellipse(ctx, hx, hy, hr, hr * 1.12, ca - Math.PI / 2);
      },
      C.skin,
      lt,
      hx - hr,
      hy - hr,
      hr * 2,
      hr * 2,
      { hi: 0.18, lo: 0.24 },
    );
    // the thumb
    ctx.fillStyle = C.skin;
    ctx.beginPath();
    ellipse(ctx, hx - side * hr * 0.75 * Math.cos(ca), hy - hr * 0.2, hr * 0.38, hr * 0.26, ca);
    ctx.fill();
  };

  // ---- the head
  const puff = p.puff ?? 0;
  const head = () => {
    ctx.save();
    ctx.translate(neckX, neckY);
    ctx.rotate(tilt);
    ctx.translate(-neckX, -neckY);
    ctx.translate(0, headCY);
    const w = headW,
      h = headH;
    // back hair (behind the face)
    soft(
      ctx,
      () => ellipse(ctx, 0, -h * 0.2, w * 0.56, h * 0.42),
      C.hair,
      lt,
      -w * 0.56,
      -h * 0.62,
      w * 1.12,
      h * 0.84,
      { hi: 0.06, lo: 0.3, rim: 0.1 },
    );
    // ears
    for (const side of [-1, 1]) {
      soft(
        ctx,
        () => ellipse(ctx, side * w * 0.5, h * 0.04, w * 0.1, h * 0.12),
        C.skin,
        lt,
        side * w * 0.5 - w * 0.1,
        -h * 0.08,
        w * 0.2,
        h * 0.24,
        { hi: 0.12, lo: 0.3 },
      );
    }
    // the face: a soft squircle with a gentle jaw; puffed cheeks bulge the lower half
    const cw = w / 2 + puff * w * 0.2,
      jaw = w * (0.3 + puff * 0.14);
    const face = () => {
      ctx.moveTo(-w / 2, -h * 0.05);
      ctx.bezierCurveTo(-w / 2, -h * 0.5, w / 2, -h * 0.5, w / 2, -h * 0.05);
      ctx.bezierCurveTo(cw * 1.02, h * 0.18, jaw * 1.3, h * 0.44, 0, h * 0.5);
      ctx.bezierCurveTo(-jaw * 1.3, h * 0.44, -cw * 1.02, h * 0.18, -w / 2, -h * 0.05);
      ctx.closePath();
    };
    soft(ctx, face, C.skin, lt, -cw, -h / 2, cw * 2, h, { hi: 0.26, lo: 0.22 });
    // cheeks
    const bl = clamp((p.blush ?? 0.25) + puff * 0.8);
    for (const side of [-1, 1]) {
      const bx = side * (w * 0.26 + puff * w * 0.06),
        by = h * 0.2,
        br = w * (0.1 + puff * 0.08),
        g = ctx.createRadialGradient(bx, by, 0, bx, by, br);
      g.addColorStop(0, rgba(C.blush, 0.55 * bl));
      g.addColorStop(1, rgba(C.blush, 0));
      ctx.fillStyle = g;
      ctx.fillRect(bx - br, by - br, br * 2, br * 2);
    }
    // eyes
    const ex = w * 0.2,
      ey = h * 0.03,
      erx = w * 0.085 * (1 + (p.wide ?? 0) * 0.25),
      ery = h * 0.095 * (1 + (p.wide ?? 0) * 0.3),
      blink = clamp(p.blink ?? 0),
      squint = clamp(p.squint ?? 0);
    for (const side of [-1, 1]) {
      const cx = side * ex;
      ctx.save();
      ctx.beginPath();
      ellipse(ctx, cx, ey, erx, ery);
      ctx.clip();
      ctx.fillStyle = "#fbf8f3";
      ctx.fillRect(cx - erx, ey - ery, erx * 2, ery * 2);
      const cross = (p.cross ?? 0) * -side * erx * 0.5,
        ix = cx + (p.gazeX ?? 0) * erx * 0.45 + cross,
        iy = ey + (p.gazeY ?? 0) * ery * 0.4 + ery * 0.08,
        ir = erx * 0.78;
      ctx.fillStyle = C.iris;
      ctx.beginPath();
      circle(ctx, ix, iy, ir);
      ctx.fill();
      ctx.fillStyle = "#140e0b";
      ctx.beginPath();
      circle(ctx, ix, iy, ir * 0.5);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.beginPath();
      circle(ctx, ix - ir * 0.35, iy - ir * 0.38, ir * 0.28);
      ctx.fill();
      // lids: the top one closes for a blink, the bottom one rises for a squint
      ctx.fillStyle = C.skin;
      const top = ey - ery + ery * 2 * blink * 1.05 + squint * ery * 0.35;
      ctx.fillRect(cx - erx, ey - ery * 1.2, erx * 2, top - (ey - ery * 1.2));
      ctx.fillRect(cx - erx, ey + ery - squint * ery * 0.8, erx * 2, ery);
      ctx.restore();
      // lash line
      ctx.strokeStyle = C.hair;
      ctx.lineWidth = 0.018;
      ctx.lineCap = "round";
      ctx.beginPath();
      if (blink > 0.85) {
        ctx.moveTo(cx - erx, ey + ery * 0.1);
        ctx.quadraticCurveTo(cx, ey + ery * 0.45, cx + erx, ey + ery * 0.1);
      } else {
        const ty = Math.min(ey + ery * 0.9, ey - ery + ery * 2 * blink * 1.05 + squint * ery * 0.35);
        ctx.moveTo(cx - erx * 1.02, ty + ery * 0.25);
        ctx.quadraticCurveTo(cx, ty - ery * 0.12, cx + erx * 1.02, ty + ery * 0.25);
      }
      ctx.stroke();
    }
    // brows
    const brow = p.brow ?? 0;
    ctx.strokeStyle = C.brow;
    ctx.lineWidth = 0.042;
    for (const side of [-1, 1]) {
      const bx = side * ex,
        by = ey - ery - h * 0.1 - brow * h * 0.05 - (p.wide ?? 0) * h * 0.03;
      ctx.beginPath();
      ctx.moveTo(bx - side * erx * 1.05, by + (brow < 0 ? -brow * h * 0.04 : 0) + h * 0.01);
      ctx.quadraticCurveTo(
        bx,
        by - h * 0.03,
        bx + side * erx * 1.25,
        by + h * 0.015 + (brow < 0 ? brow * h * 0.02 : 0),
      );
      ctx.stroke();
    }
    // glasses: thin dark rounded rectangles, a bridge, a glint
    ctx.strokeStyle = C.glasses;
    ctx.lineWidth = 0.017;
    const gw = w * 0.33,
      gh = h * 0.23;
    for (const side of [-1, 1]) {
      const gx = side * ex - gw / 2,
        gy = ey - gh / 2 - h * 0.005;
      ctx.fillStyle = "rgba(210,225,240,0.10)";
      ctx.beginPath();
      ctx.roundRect(gx, gy, gw, gh, gh * 0.4);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.45)";
      ctx.lineWidth = 0.012;
      ctx.beginPath();
      ctx.moveTo(gx + gw * 0.2, gy + gh * 0.75);
      ctx.lineTo(gx + gw * 0.42, gy + gh * 0.2);
      ctx.stroke();
      ctx.strokeStyle = C.glasses;
      ctx.lineWidth = 0.017;
      ctx.beginPath();
      ctx.moveTo(side * (ex + gw / 2), gy + gh * 0.3);
      ctx.lineTo(side * w * 0.5, gy + gh * 0.35);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(-ex + gw / 2, ey - gh * 0.1);
    ctx.quadraticCurveTo(0, ey - gh * 0.3, ex - gw / 2, ey - gh * 0.1);
    ctx.stroke();
    // nose
    {
      const ng = ctx.createRadialGradient(w * 0.02, h * 0.2, 0, w * 0.02, h * 0.2, w * 0.07);
      ng.addColorStop(0, rgba(C.skinDark, 0.75));
      ng.addColorStop(1, rgba(C.skinDark, 0));
      ctx.fillStyle = ng;
      ctx.fillRect(-w * 0.1, h * 0.1, w * 0.2, h * 0.2);
      ctx.fillStyle = "rgba(255,240,225,0.55)";
      ctx.beginPath();
      ellipse(ctx, -w * 0.012, h * 0.155, w * 0.018, h * 0.024);
      ctx.fill();
    }
    // mouth: a smile curve, an "oh", or pursed lips when puffed
    const my = h * 0.31,
      sm = p.smile ?? 0.25,
      o = Math.max(p.mouthO ?? 0, puff * 0.6);
    if (o > 0.05) {
      ctx.fillStyle = mix(C.lip, "#5a2a26", 0.5);
      ctx.beginPath();
      ellipse(ctx, 0, my, w * (0.035 + 0.02 * (1 - puff)) * (0.6 + o * 0.6), h * 0.04 * (0.5 + o * 0.7));
      ctx.fill();
      ctx.strokeStyle = C.lip;
      ctx.lineWidth = 0.018;
      ctx.stroke();
    } else {
      ctx.strokeStyle = mix(C.lip, "#4a2320", 0.35);
      ctx.lineWidth = 0.024;
      ctx.beginPath();
      const mw = w * (0.1 + 0.05 * Math.max(0, sm));
      ctx.moveTo(-mw, my - sm * h * 0.025);
      ctx.quadraticCurveTo(0, my + sm * h * 0.06, mw, my - sm * h * 0.025);
      ctx.stroke();
    }
    // front hair: a tousled, wavy cap with volume on top and a fringe swept to one side
    // (clumps break the silhouette on top; the sides stay short above the ears; two locks fall on the forehead)
    const hairPath = () => {
      const pts: [number, number][] = [
        [-w * 0.52, -h * 0.02],
        [-w * 0.57, -h * 0.22],
        [-w * 0.6, -h * 0.4],
        [-w * 0.5, -h * 0.56],
        [-w * 0.44, -h * 0.66],
        [-w * 0.28, -h * 0.7],
        [-w * 0.18, -h * 0.8],
        [-w * 0.02, -h * 0.76],
        [w * 0.1, -h * 0.84],
        [w * 0.28, -h * 0.76],
        [w * 0.42, -h * 0.72],
        [w * 0.54, -h * 0.58],
        [w * 0.6, -h * 0.4],
        [w * 0.58, -h * 0.2],
        [w * 0.5, -h * 0.04],
        [w * 0.46, -h * 0.2],
        [w * 0.36, -h * 0.28],
        [w * 0.22, -h * 0.24],
        [w * 0.12, -h * 0.3],
        [w * 0.02, -h * 0.2], // a lock curling down onto the forehead
        [-w * 0.06, -h * 0.13],
        [-w * 0.1, -h * 0.26],
        [-w * 0.22, -h * 0.22],
        [-w * 0.34, -h * 0.3],
        [-w * 0.44, -h * 0.2],
        [-w * 0.48, -h * 0.02],
      ];
      smooth(ctx, pts);
    };
    soft(ctx, hairPath, C.hair, lt, -w * 0.6, -h * 0.84, w * 1.2, h * 0.84, { hi: 0.14, lo: 0.34, rim: 0.14 });
    // waves: sheen strokes following the curls, lighter toward the light
    ctx.lineCap = "round";
    const locks: [number, number, number, number, number, number, number][] = [
      [-w * 0.46, -h * 0.34, -w * 0.4, -h * 0.58, -w * 0.2, -h * 0.66, 0.9],
      [-w * 0.26, -h * 0.4, -w * 0.18, -h * 0.66, w * 0.04, -h * 0.7, 1],
      [-w * 0.02, -h * 0.4, w * 0.1, -h * 0.72, w * 0.3, -h * 0.66, 0.8],
      [w * 0.2, -h * 0.38, w * 0.36, -h * 0.6, w * 0.5, -h * 0.48, 0.55],
      [-w * 0.16, -h * 0.3, -w * 0.02, -h * 0.44, w * 0.06, -h * 0.26, 0.7],
      [w * 0.14, -h * 0.34, w * 0.3, -h * 0.44, w * 0.4, -h * 0.3, 0.5],
    ];
    for (const [x0, y0, x1, y1, x2, y2, a] of locks) {
      ctx.strokeStyle = rgba(C.hairHi, a);
      ctx.lineWidth = 0.034;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo(x1, y1, x2, y2);
      ctx.stroke();
      ctx.strokeStyle = rgba("#6b5648", a * 0.5);
      ctx.lineWidth = 0.012;
      ctx.beginPath();
      ctx.moveTo(x0 + 0.01, y0 - 0.02);
      ctx.quadraticCurveTo(x1 + 0.01, y1 - 0.02, x2, y2 - 0.02);
      ctx.stroke();
    }
    // the hair's shadow on the forehead
    ctx.save();
    ctx.beginPath();
    face();
    ctx.clip();
    const fg = ctx.createLinearGradient(0, -h * 0.3, 0, -h * 0.12);
    fg.addColorStop(0, "rgba(60,30,30,0.22)");
    fg.addColorStop(1, "rgba(60,30,30,0)");
    ctx.fillStyle = fg;
    ctx.fillRect(-w, -h * 0.4, w * 2, h * 0.3);
    ctx.restore();
    ctx.restore();
  };

  // arms at rest go behind the head; raised arms (face, wave) go in front
  const raised = Math.max(p.cheeks ?? 0, p.chin ?? 0, p.shield ?? 0, p.glassesPush ?? 0, p.wave ?? 0) > 0.3;
  if (!raised) {
    arm(-1);
    arm(1);
    head();
  } else {
    head();
    arm(-1);
    arm(1);
  }
  ctx.restore();
}

// ================================================================== DOODLES
export type Coat = {
  coat: string;
  fluff: string;
  chest: string;
  ears: string;
  patch?: string;
  collar: string;
  nose: string;
};
export const RED: Coat = {
  coat: "#b4633a",
  fluff: "#c97c4d",
  chest: "#f0e3d3",
  ears: "#a95a33",
  collar: "#4f7fb8",
  nose: "#2a1c1a",
};
export const PARTI: Coat = {
  coat: "#f4eee6",
  fluff: "#fbf7f1",
  chest: "#f4eee6",
  ears: "#d2915c",
  patch: "#c98150",
  collar: "#4a77b3",
  nose: "#3b2b29",
};

export type DogPose = {
  blink?: number;
  tilt?: number; // head tilt, radians
  wag?: number; // tail angle offset −1..1
  ear?: number; // ear swing −1..1
  tongue?: number; // 0..1 blep
  gazeX?: number;
  bob?: number;
  sniff?: number; // nose lift 0..1
  lift?: number; // one front paw lifted 0..1
  tag?: number; // tag swing −1..1
};

/** a doodle's head (front-facing, three-quarter by `turn` −1..1), centred at (0, 0) in head units (≈ 1 wide) */
function dogHead(ctx: Ctx, c: Coat, p: DogPose, lt: Light, turn: number, curly: boolean) {
  const ear = p.ear ?? 0,
    tx = turn * 0.08;
  // ears hang behind and beside the head
  for (const side of [-1, 1]) {
    const ex = side * 0.42 + tx * 0.5,
      ey = 0.18,
      rot = side * (0.18 + ear * 0.25);
    const pts = fluffPts(ex, ey + 0.1, 0.19, 0.36, curly ? 7 : 5, curly ? 0.16 : 0.1, rot, side * 3);
    soft(ctx, () => smooth(ctx, pts), c.ears, lt, ex - 0.22, ey - 0.3, 0.44, 0.8, { hi: 0.16, lo: 0.3 });
  }
  // the head: a fluffy round with a topknot
  const headPts = fluffPts(tx * 0.3, 0, 0.44, 0.42, curly ? 9 : 8, curly ? 0.1 : 0.06, 0, 1);
  soft(ctx, () => smooth(ctx, headPts), c.fluff, lt, -0.46, -0.44, 0.92, 0.88, { hi: 0.24, lo: 0.22 });
  const top = fluffPts(tx * 0.2, -0.36, 0.3, 0.2, curly ? 8 : 6, curly ? 0.22 : 0.14, 0, 2);
  soft(ctx, () => smooth(ctx, top), c.fluff, lt, -0.3, -0.56, 0.6, 0.4, { hi: 0.3, lo: 0.14 });
  if (curly) {
    // the topknot is a pile of little curls, each its own lit ball
    const balls: [number, number, number][] = [
      [-0.22, -0.38, 0.075],
      [-0.1, -0.46, 0.08],
      [0.04, -0.49, 0.08],
      [0.17, -0.44, 0.075],
      [0.26, -0.34, 0.065],
      [-0.28, -0.26, 0.06],
      [-0.14, -0.32, 0.07],
      [0.02, -0.36, 0.075],
      [0.15, -0.3, 0.07],
      [-0.04, -0.58, 0.06],
      [0.12, -0.57, 0.055],
    ];
    for (const [bx, by, r] of balls)
      soft(ctx, () => circle(ctx, bx + tx * 0.2, by, r), c.fluff, lt, bx - r, by - r, r * 2, r * 2, {
        hi: 0.4,
        lo: 0.3,
        shadow: "#6a5a60",
        rim: 0.1,
      });
  }
  // eye patches (parti), eyes
  const eyeX = 0.17,
    eyeY = 0.02;
  for (const side of [-1, 1]) {
    const x = side * eyeX + tx;
    if (c.patch) {
      ctx.fillStyle = c.patch;
      ctx.beginPath();
      smooth(ctx, fluffPts(x + side * 0.03, eyeY - 0.02, 0.13, 0.11, 5, 0.1, side * 0.3, side));
      ctx.fill();
    }
    const bl = clamp(p.blink ?? 0);
    ctx.fillStyle = "#1b1311";
    ctx.beginPath();
    ellipse(ctx, x + (p.gazeX ?? 0) * 0.02, eyeY, 0.058, 0.066 * (1 - bl * 0.9));
    ctx.fill();
    if (bl < 0.6) {
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.beginPath();
      circle(ctx, x - 0.018, eyeY - 0.024, 0.017);
      ctx.fill();
    }
  }
  // muzzle, nose, beard, tongue
  const mz = fluffPts(tx * 1.4, 0.22, 0.2, 0.15, 6, 0.1, 0, 5);
  soft(ctx, () => smooth(ctx, mz), mix(c.fluff, "#ffffff", 0.25), lt, -0.2, 0.08, 0.4, 0.3, { hi: 0.2, lo: 0.18 });
  const nx = tx * 1.6,
    ny = 0.17 - (p.sniff ?? 0) * 0.03;
  soft(
    ctx,
    () => {
      ctx.moveTo(nx - 0.075, ny - 0.03);
      ctx.bezierCurveTo(nx - 0.07, ny - 0.07, nx + 0.07, ny - 0.07, nx + 0.075, ny - 0.03);
      ctx.bezierCurveTo(nx + 0.07, ny + 0.03, nx + 0.02, ny + 0.06, nx, ny + 0.06);
      ctx.bezierCurveTo(nx - 0.02, ny + 0.06, nx - 0.07, ny + 0.03, nx - 0.075, ny - 0.03);
      ctx.closePath();
    },
    c.nose,
    lt,
    nx - 0.075,
    ny - 0.07,
    0.15,
    0.13,
    { hi: 0.35, lo: 0.2 },
  );
  ctx.strokeStyle = mix(c.nose, c.fluff, 0.4);
  ctx.lineWidth = 0.014;
  ctx.beginPath();
  ctx.moveTo(nx, ny + 0.06);
  ctx.lineTo(nx, ny + 0.1);
  ctx.quadraticCurveTo(nx - 0.05, ny + 0.13, nx - 0.08, ny + 0.1);
  ctx.moveTo(nx, ny + 0.1);
  ctx.quadraticCurveTo(nx + 0.05, ny + 0.13, nx + 0.08, ny + 0.1);
  ctx.stroke();
  const tg = clamp(p.tongue ?? 0);
  if (tg > 0.02) {
    soft(
      ctx,
      () => ctx.roundRect(nx - 0.035, ny + 0.1, 0.07, 0.07 * tg + 0.01, 0.035),
      "#e7848d",
      lt,
      nx - 0.035,
      ny + 0.1,
      0.07,
      0.08,
      { hi: 0.3, lo: 0.15 },
    );
  }
}

/** a collar band across the neck with an optional tag that swings */
function collar(ctx: Ctx, c: Coat, x: number, y: number, w: number, tagSwing: number, tag: boolean) {
  ctx.strokeStyle = c.collar;
  ctx.lineWidth = 0.055;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y - 0.02);
  ctx.quadraticCurveTo(x, y + 0.06, x + w / 2, y - 0.02);
  ctx.stroke();
  if (tag) {
    const a = tagSwing * 0.5,
      tx = x + Math.sin(a) * 0.1,
      ty = y + 0.03 + Math.cos(a) * 0.1;
    ctx.strokeStyle = "#9ea3aa";
    ctx.lineWidth = 0.012;
    ctx.beginPath();
    ctx.moveTo(x, y + 0.04);
    ctx.lineTo(tx, ty - 0.03);
    ctx.stroke();
    ctx.fillStyle = "#c8ccd2";
    ctx.beginPath();
    ctx.moveTo(tx, ty - 0.035);
    ctx.lineTo(tx + 0.03, ty + 0.03);
    ctx.lineTo(tx, ty + 0.07);
    ctx.lineTo(tx - 0.03, ty + 0.03);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillRect(tx - 0.008, ty - 0.01, 0.01, 0.04);
  }
}

/** a fluffy tail plume from (x0, y0) along an arc, angle `a` (radians, 0 = straight up) */
function plume(ctx: Ctx, c: Coat, x0: number, y0: number, a: number, len: number, lt: Light, flip = 1) {
  const x1 = x0 + Math.sin(a) * len,
    y1 = y0 - Math.cos(a) * len;
  ctx.strokeStyle = c.coat;
  ctx.lineWidth = 0.07;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo(x0 + flip * 0.05, (y0 + y1) / 2, x1, y1);
  ctx.stroke();
  const pts = fluffPts(x1 + flip * 0.08, y1 + 0.04, 0.2, 0.15, 7, 0.18, a + flip * 0.5, 9);
  soft(ctx, () => smooth(ctx, pts), c.fluff, lt, x1 - 0.2, y1 - 0.2, 0.44, 0.4, { hi: 0.26, lo: 0.2 });
}

/** Red: a doodle standing in profile (facing left), head turned to camera; feet on the ground at (x, y) */
export function drawRed(
  ctx: Ctx,
  x: number,
  y: number,
  s: number,
  d: Dials,
  p: DogPose = {},
  lt: Light = KEY,
  c: Coat = RED,
) {
  const hk = dial(d.head, 0.8, 1.55),
    bk = dial(d.build, 0.82, 1.3),
    st = dial(d.stature, 0.8, 1.28);
  const legH = 0.6 * st,
    by = -legH - 0.2, // the body's midline
    th = 0.22 * bk; // half its depth
  const far = (col: string) => mix(col, "#2a1a14", 0.28);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.translate(0, p.bob ?? 0);
  // a leg: a thigh or shoulder, a lower leg (angled at the hock for hind legs) and a fluffy paw
  const leg = (lx: number, hind: boolean, col: string, lift = 0) => {
    const kneeX = lx + (hind ? 0.08 : 0.01),
      kneeY = by + th * 0.6 + legH * 0.42,
      hockX = lx + (hind ? 0.1 : 0.0) - lift * 0.1,
      hockY = -0.2 - lift * 0.2,
      pawX = lx + (hind ? 0.04 : -0.03) - lift * 0.12,
      pawY = -0.06 - lift * 0.22;
    soft(
      ctx,
      () => capsule(ctx, lx, by + th * 0.3, kneeX, kneeY, (hind ? 0.14 : 0.1) * bk, 0.07 * bk),
      col,
      lt,
      lx - 0.15,
      by,
      0.3,
      legH,
      { hi: 0.14, lo: 0.3 },
    );
    soft(
      ctx,
      () => capsule(ctx, kneeX, kneeY, hockX, hockY, 0.07 * bk, 0.058 * bk),
      col,
      lt,
      lx - 0.1,
      kneeY,
      0.2,
      -kneeY,
      { hi: 0.12, lo: 0.3 },
    );
    soft(
      ctx,
      () => capsule(ctx, hockX, hockY, pawX, pawY, 0.058 * bk, 0.062 * bk),
      col,
      lt,
      lx - 0.1,
      hockY,
      0.2,
      0.2,
      { hi: 0.12, lo: 0.3 },
    );
    soft(
      ctx,
      () => smooth(ctx, fluffPts(pawX - 0.03, pawY + 0.01, 0.1, 0.055, 4, 0.12, 0, lx * 9)),
      mix(col, c.fluff, 0.5),
      lt,
      pawX - 0.13,
      pawY - 0.06,
      0.2,
      0.12,
      { hi: 0.2, lo: 0.25 },
    );
  };
  // the tail plume, then the far legs
  plume(ctx, c, 0.56, by - th * 0.7, 0.3 + (p.wag ?? 0) * 0.45, 0.42, lt);
  leg(-0.44, false, far(c.coat));
  leg(0.44, true, far(c.coat));
  // the body: a deep chest, a level back, a tucked-up belly and a round rump (clipped short and smooth)
  const body = () => {
    ctx.moveTo(-0.66, by - 0.02);
    ctx.bezierCurveTo(-0.66, by - th * 1.1, -0.5, by - th * 1.15, -0.36, by - th * 1.05);
    ctx.bezierCurveTo(0.0, by - th * 0.95, 0.4, by - th * 1.1, 0.56, by - th * 0.8);
    ctx.bezierCurveTo(0.7, by - th * 0.45, 0.7, by + th * 0.5, 0.52, by + th * 0.75);
    ctx.bezierCurveTo(0.36, by + th * 0.95, 0.2, by + th * 0.55, 0.05, by + th * 0.7);
    ctx.bezierCurveTo(-0.15, by + th * 0.85, -0.35, by + th * 1.35, -0.5, by + th * 1.05);
    ctx.bezierCurveTo(-0.64, by + th * 0.8, -0.67, by + th * 0.3, -0.66, by - 0.02);
    ctx.closePath();
  };
  soft(ctx, body, c.coat, lt, -0.7, by - th * 1.2, 1.4, th * 2.6, { hi: 0.22, lo: 0.28 });
  // the white chest blaze
  ctx.save();
  ctx.beginPath();
  body();
  ctx.clip();
  ctx.fillStyle = c.chest;
  ctx.beginPath();
  smooth(ctx, fluffPts(-0.58, by + th * 0.5, 0.12, th * 0.75, 5, 0.1, 0.25, 4));
  ctx.fill();
  ctx.restore();
  leg(-0.38, false, c.coat, p.lift ?? 0);
  leg(0.5, true, c.coat);
  // the neck, collar and head (up and forward, turned to camera)
  soft(
    ctx,
    () => capsule(ctx, -0.46, by - th * 0.3, -0.6, by - th - 0.22, 0.17 * bk, 0.15),
    c.coat,
    lt,
    -0.8,
    by - th - 0.5,
    0.5,
    0.7,
    { hi: 0.08, lo: 0.2, rim: 0.08 },
  );
  collar(ctx, c, -0.57, by - th - 0.1, 0.32, p.tag ?? 0, false);
  ctx.save();
  ctx.translate(-0.62, by - th - 0.44);
  ctx.rotate(p.tilt ?? 0);
  ctx.scale(0.76 * hk, 0.76 * hk);
  dogHead(ctx, c, p, lt, -0.6, false);
  ctx.restore();
  ctx.restore();
}

/** Parti: a doodle sitting, facing the camera; its seat on the ground at (x, y) */
export function drawParti(
  ctx: Ctx,
  x: number,
  y: number,
  s: number,
  d: Dials,
  p: DogPose = {},
  lt: Light = KEY,
  c: Coat = PARTI,
) {
  const hk = dial(d.head, 0.8, 1.55),
    bk = dial(d.build, 0.82, 1.3),
    st = dial(d.stature, 0.82, 1.25);
  const chestY = -0.72 * st;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.translate(0, p.bob ?? 0);
  // tail plume curling round beside the hip
  plume(ctx, c, 0.26 * bk, -0.12, 1.05 + (p.wag ?? 0) * 0.35, 0.3, lt, 1);
  // haunches and body
  for (const side of [-1, 1]) {
    soft(
      ctx,
      () => ellipse(ctx, side * 0.22 * bk, -0.17, 0.2 * bk, 0.17),
      c.coat,
      lt,
      side * 0.22 * bk - 0.2,
      -0.34,
      0.4,
      0.34,
      { hi: 0.2, lo: 0.24, shadow: "#4a3a48" },
    );
  }
  soft(
    ctx,
    () => {
      ctx.moveTo(-0.17 * bk, chestY);
      ctx.bezierCurveTo(-0.3 * bk, chestY + 0.25, -0.34 * bk, -0.2, -0.24 * bk, -0.06);
      ctx.lineTo(0.24 * bk, -0.06);
      ctx.bezierCurveTo(0.34 * bk, -0.2, 0.3 * bk, chestY + 0.25, 0.17 * bk, chestY);
      ctx.closePath();
    },
    c.coat,
    lt,
    -0.34 * bk,
    chestY,
    0.68 * bk,
    -chestY,
    { hi: 0.24, lo: 0.24, shadow: "#4a3a48" },
  );
  // front legs, paws
  for (const side of [-1, 1]) {
    const lx = side * 0.1 * bk,
      lift = side < 0 ? (p.lift ?? 0) : 0;
    soft(
      ctx,
      () => capsule(ctx, lx, chestY + 0.18, lx + side * 0.01, -0.07 - lift * 0.14, 0.065 * bk, 0.058 * bk),
      c.coat,
      lt,
      lx - 0.07,
      chestY + 0.1,
      0.14,
      -chestY,
      { hi: 0.2, lo: 0.22, shadow: "#4a3a48" },
    );
    soft(
      ctx,
      () => ellipse(ctx, lx + side * 0.015, -0.045 - lift * 0.14, 0.085, 0.05),
      c.fluff,
      lt,
      lx - 0.09,
      -0.1,
      0.18,
      0.1,
      { hi: 0.2, lo: 0.2, shadow: "#4a3a48" },
    );
  }
  collar(ctx, c, 0, chestY + 0.03, 0.32 * bk, p.tag ?? 0, true);
  ctx.save();
  ctx.translate(0, chestY - 0.22 * hk);
  ctx.rotate(p.tilt ?? 0);
  ctx.scale(0.66 * hk, 0.66 * hk);
  dogHead(ctx, c, p, lt, 0, true);
  ctx.restore();
  ctx.restore();
}

// ================================================================== SLIDER (a yellow-bellied slider on its stone)
export const SLIDER = {
  shell: "#5a5a31",
  shellDark: "#34331c",
  mark: "#dcc446",
  skin: "#56603a",
  stripe: "#e6cf4c",
  belly: "#ecd35a",
  eye: "#dcc446",
  stone: "#9b968c",
};
export type TurtlePose = { neck?: number; blink?: number; tilt?: number; bob?: number; legs?: number };

/** Slider in profile (facing left) on a flat stone; the stone's base on the ground at (x, y) */
export function drawSlider(ctx: Ctx, x: number, y: number, s: number, d: Dials, p: TurtlePose = {}, lt: Light = KEY) {
  const hk = dial(d.head, 0.8, 1.6),
    bk = dial(d.build, 0.8, 1.35),
    st = dial(d.stature, 0.85, 1.25);
  const T = SLIDER,
    neck = clamp(p.neck ?? 1),
    stoneTop = -0.2,
    baseY = stoneTop - 0.06 * st - (p.bob ?? 0),
    shellL = 1.0,
    domeH = 0.36 * bk;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  // the stone
  const stone: [number, number][] = [
    [-0.95, 0],
    [-0.9, stoneTop + 0.06],
    [-0.6, stoneTop - 0.01],
    [-0.1, stoneTop - 0.03],
    [0.45, stoneTop - 0.01],
    [0.85, stoneTop + 0.04],
    [0.98, -0.02],
    [0.4, 0.01],
    [-0.4, 0.01],
  ];
  soft(ctx, () => smooth(ctx, stone), T.stone, lt, -0.98, stoneTop - 0.03, 1.96, 0.24, { hi: 0.25, lo: 0.35 });
  ctx.strokeStyle = "rgba(60,55,50,0.25)";
  ctx.lineWidth = 0.012;
  ctx.beginPath();
  ctx.moveTo(-0.6, stoneTop + 0.07);
  ctx.quadraticCurveTo(-0.3, stoneTop + 0.1, 0.1, stoneTop + 0.06);
  ctx.moveTo(0.3, stoneTop + 0.12);
  ctx.quadraticCurveTo(0.5, stoneTop + 0.1, 0.75, stoneTop + 0.13);
  ctx.stroke();
  // legs (splayed, striped)
  const leg = (lx: number, back: boolean) => {
    const col = back ? mix(T.skin, "#1e2012", 0.3) : T.skin;
    soft(
      ctx,
      () => capsule(ctx, lx, baseY - 0.02, lx - 0.08, stoneTop + 0.005, 0.07 * st, 0.05),
      col,
      lt,
      lx - 0.15,
      baseY - 0.08,
      0.2,
      0.16,
      { hi: 0.15, lo: 0.25 },
    );
    ctx.strokeStyle = back ? mix(T.stripe, "#1e2012", 0.3) : T.stripe;
    ctx.lineWidth = 0.012;
    ctx.beginPath();
    ctx.moveTo(lx - 0.02, baseY);
    ctx.lineTo(lx - 0.07, stoneTop - 0.005);
    ctx.stroke();
  };
  leg(-shellL * 0.3, true);
  leg(shellL * 0.3, true);
  // tail
  ctx.fillStyle = T.skin;
  ctx.beginPath();
  ctx.moveTo(shellL / 2 - 0.04, baseY - 0.02);
  ctx.quadraticCurveTo(shellL / 2 + 0.12, baseY + 0.01, shellL / 2 + 0.16, baseY + 0.03);
  ctx.quadraticCurveTo(shellL / 2 + 0.08, baseY + 0.04, shellL / 2 - 0.04, baseY + 0.04);
  ctx.fill();
  // the neck and head, sliding out of the shell
  const hx = -shellL / 2 - 0.02 - neck * 0.26,
    hy = baseY - 0.1 - neck * 0.06;
  soft(
    ctx,
    () => capsule(ctx, -shellL / 2 + 0.12, baseY - 0.08, hx + 0.06, hy + 0.01, 0.085, 0.07),
    T.skin,
    lt,
    hx,
    hy - 0.1,
    shellL / 2,
    0.2,
    { hi: 0.16, lo: 0.25 },
  );
  ctx.strokeStyle = T.stripe;
  ctx.lineWidth = 0.014;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(-shellL / 2 + 0.1, baseY - 0.11 + i * 0.035);
    ctx.lineTo(hx + 0.1, hy - 0.02 + i * 0.03);
    ctx.stroke();
  }
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(p.tilt ?? 0);
  ctx.scale(1.45 * hk, 1.45 * hk);
  soft(
    ctx,
    () => {
      ctx.moveTo(0.1, -0.07);
      ctx.bezierCurveTo(0.02, -0.11, -0.12, -0.1, -0.15, -0.02);
      ctx.bezierCurveTo(-0.16, 0.03, -0.1, 0.07, 0.0, 0.07);
      ctx.lineTo(0.1, 0.07);
      ctx.closePath();
    },
    T.skin,
    lt,
    -0.16,
    -0.11,
    0.26,
    0.18,
    { hi: 0.22, lo: 0.22 },
  );
  // the yellow patch behind the eye, the eye with its yellow ring, the mouth line
  ctx.fillStyle = T.stripe;
  ctx.beginPath();
  ellipse(ctx, 0.04, -0.02, 0.05, 0.028, -0.2);
  ctx.fill();
  ctx.fillStyle = T.eye;
  ctx.beginPath();
  circle(ctx, -0.07, -0.04, 0.03);
  ctx.fill();
  const bl = clamp(p.blink ?? 0);
  ctx.fillStyle = "#15130c";
  ctx.beginPath();
  ellipse(ctx, -0.072, -0.04, 0.018, 0.02 * (1 - bl * 0.9));
  ctx.fill();
  if (bl < 0.5) {
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath();
    circle(ctx, -0.078, -0.047, 0.006);
    ctx.fill();
  }
  ctx.strokeStyle = "#2c3019";
  ctx.lineWidth = 0.01;
  ctx.beginPath();
  ctx.moveTo(-0.15, 0.01);
  ctx.quadraticCurveTo(-0.08, 0.035, 0.0, 0.03);
  ctx.stroke();
  ctx.strokeStyle = T.stripe;
  ctx.lineWidth = 0.011;
  ctx.beginPath();
  ctx.moveTo(-0.1, 0.045);
  ctx.lineTo(0.08, 0.05);
  ctx.stroke();
  ctx.restore();
  // plastron edge (yellow) and the domed carapace
  soft(
    ctx,
    () => ctx.roundRect(-shellL / 2 + 0.02, baseY - 0.07, shellL - 0.04, 0.08, 0.04),
    T.belly,
    lt,
    -shellL / 2,
    baseY - 0.07,
    shellL,
    0.08,
    { hi: 0.2, lo: 0.2 },
  );
  const dome = () => {
    ctx.moveTo(-shellL / 2, baseY - 0.06);
    ctx.bezierCurveTo(
      -shellL / 2 + 0.02,
      baseY - 0.06 - domeH * 1.25,
      shellL / 2 - 0.02,
      baseY - 0.06 - domeH * 1.3,
      shellL / 2,
      baseY - 0.06,
    );
    ctx.quadraticCurveTo(0, baseY - 0.02, -shellL / 2, baseY - 0.06);
    ctx.closePath();
  };
  soft(ctx, dome, T.shell, lt, -shellL / 2, baseY - 0.06 - domeH, shellL, domeH, { hi: 0.28, lo: 0.3 });
  // scutes and their yellow markings, clipped to the dome
  ctx.save();
  ctx.beginPath();
  dome();
  ctx.clip();
  ctx.strokeStyle = rgba(T.shellDark, 0.8);
  ctx.lineWidth = 0.014;
  const top = baseY - 0.06 - domeH * 0.94;
  for (let i = -2; i <= 2; i++) {
    const sx = i * 0.2;
    ctx.beginPath();
    ctx.moveTo(sx, top + Math.abs(i) * 0.05);
    ctx.lineTo(sx * 1.25, baseY - 0.06);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(-shellL / 2, baseY - 0.06 - domeH * 0.45);
  ctx.bezierCurveTo(-0.2, top + domeH * 0.2, 0.2, top + domeH * 0.2, shellL / 2, baseY - 0.06 - domeH * 0.45);
  ctx.stroke();
  // marginal scutes along the rim with a yellow bar each
  for (let i = 0; i < 9; i++) {
    const mx = -shellL / 2 + 0.06 + i * ((shellL - 0.12) / 8);
    ctx.strokeStyle = rgba(T.shellDark, 0.7);
    ctx.lineWidth = 0.01;
    ctx.beginPath();
    ctx.moveTo(mx, baseY - 0.06);
    ctx.lineTo(mx, baseY - 0.12);
    ctx.stroke();
    ctx.strokeStyle = T.mark;
    ctx.lineWidth = 0.016;
    ctx.beginPath();
    ctx.moveTo(mx + 0.03, baseY - 0.075);
    ctx.lineTo(mx + 0.045, baseY - 0.11);
    ctx.stroke();
  }
  // the markings on the big scutes: thin yellow curves
  ctx.strokeStyle = rgba(T.mark, 0.85);
  ctx.lineWidth = 0.014;
  for (let i = -2; i <= 1; i++) {
    const sx = i * 0.2 + 0.1;
    ctx.beginPath();
    ctx.moveTo(sx - 0.06, baseY - 0.14);
    ctx.quadraticCurveTo(sx, baseY - 0.06 - domeH * 0.6, sx + 0.05, baseY - 0.16);
    ctx.stroke();
  }
  ctx.restore();
  // front legs in front of the shell's rim
  leg(-shellL * 0.36, false);
  leg(shellL * 0.36, false);
  ctx.restore();
}

// ================================================================== the scene's light
/**
 * Tint everything drawn so far by a key light colour (multiply), with a glow on the lit side (screen).
 * `k` 0..1 is how strong the colour is; white at any k leaves the frame as it was.
 */
export function keyLight(ctx: Ctx, W: number, H: number, color: string, k: number, lt: Light = KEY) {
  if (k <= 0.001) return;
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = mix("#ffffff", color, k);
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = "screen";
  const gx = W / 2 + lt.ax * W * 0.4,
    gy = H / 2 + lt.ay * H * 0.5,
    g = ctx.createRadialGradient(gx, gy, 0, gx, gy, Math.max(W, H) * 0.8);
  g.addColorStop(0, rgba(color, 0.22 * k));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/** a seamless paper sweep: wall to floor with a soft horizon and a pool of light where the cast stands */
export function sweep(ctx: Ctx, W: number, H: number, color: string, floorY: number, poolX: number) {
  const wall = ctx.createLinearGradient(0, 0, 0, floorY);
  wall.addColorStop(0, mix(color, "#000000", 0.1));
  wall.addColorStop(1, mix(color, "#ffffff", 0.08));
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, W, floorY);
  const floor = ctx.createLinearGradient(0, floorY - H * 0.08, 0, H);
  floor.addColorStop(0, mix(color, "#ffffff", 0.08));
  floor.addColorStop(1, mix(color, "#ffffff", 0.2));
  ctx.fillStyle = floor;
  ctx.fillRect(0, floorY - 1, W, H - floorY + 1);
  const pool = ctx.createRadialGradient(poolX, floorY, 0, poolX, floorY, Math.max(W, H) * 0.45);
  pool.addColorStop(0, "rgba(255,255,255,0.22)");
  pool.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = pool;
  ctx.fillRect(0, 0, W, H);
  // vignette
  const v = ctx.createRadialGradient(W / 2, H * 0.55, Math.min(W, H) * 0.35, W / 2, H * 0.55, Math.max(W, H) * 0.8);
  v.addColorStop(0, "rgba(20,15,30,0)");
  v.addColorStop(1, "rgba(20,15,30,0.16)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}
