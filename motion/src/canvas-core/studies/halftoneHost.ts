// STUDY 23 · HALFTONE HOST (20 s, 30 fps). An editorial explainer for the fictional Oriel, hosted by an original
// mascot: a round alarm clock with two bells, a hammer, stubby feet, blinking eyes and dial hands that show its
// mood. The host (and every object in the product cards) is modelled as shaded 3D forms, spheres, a torus bezel
// and cylinders lit from the top left and computed per point, then printed THROUGH one dot screen, so the film
// reads like newspaper photos of toys on a flat, crisp page. Everything else is flat: an off-white page, ink type,
// one accent for the full-bleed flip, the key words and the call to action, and mono chrome with a running
// timecode on every scene. One source, designed for landscape and vertical. Brand: the neutral pack, "mono".
// Brief: series/studies/briefs/halftone-host.json · prompt: series/studies/prompts/halftone-host.prompt.md
//
// The film is one continuous function paint(F) of a (fractional) frame F; the shots only name the sections on
// the timeline. The one blurred moment (the slam) is smeared analytically, by exactly the distance the word
// moves inside the shutter, instead of sampled (see smear()).
import PACK from "../../../brand/packs/studio/pack.json";
import { rng, type Ctx, type Env, type Layer } from "../core";
import type { Film, Shot } from "../film";
import { clamp, ease, lerp, prog, spring } from "../kit/motion";
import { usePack } from "../kit/pack";
import { beatScore } from "../kit/score";
import { layout, type Size } from "../kit/sizes";
import { measure, text } from "../kit/type";
import { card, check, rr } from "../kit/ui";

const P = usePack(PACK),
  C = P.palette("mono"),
  F_ = P.face;
const FPS = 30,
  BPM = 120,
  N = 600; // a beat is 15 frames, a bar 60
// the timeline, in frames (every cut on a beat)
const T = { problem: 90, product: 180, slam: 270, handled: 300, flow: 450, end: 540 };
const SECTIONS: [number, string][] = [
  [0, "// 01 — hook"],
  [T.problem, "// 02 — problem"],
  [T.product, "// 03 — product"],
  [T.slam, "// 04 — handled"],
  [T.flow, "// 05 — flow"],
];
const TAU = Math.PI * 2;
const BLACK = C.ink,
  PAPER = C.surface;
// the bento: when things happen
const B = {
  type0: 316,
  typeEvery: 1.5,
  dots0: 326,
  dotEvery: 2.2,
  count0: 346,
  inv0: 356,
  invEvery: 9,
  bars0: 366,
  circle0: 392,
  circle1: 414,
  stamp: 420,
};
const REQUEST = "find 45 min with Ana and Kai";

// ================================================================ THE DOT SCREEN
// A sampler returns the ink tone at a point: −1 outside the object, 0..1 on it (paper under ink), 2 + t for
// ink only (a cast shadow printed on the page).
type Sampler = (x: number, y: number) => number;

// a reusable scratch canvas for the paper plate (the object's silhouette, from the same per-point field)
const plateLayer = (env: Env): Layer => {
  const k = `halftoneHost:plate:${env.scale}`;
  let L = env.cache.get(k) as Layer | undefined;
  if (!L) {
    L = env.canvas(1024, 1024);
    env.cache.set(k, L);
  }
  return L;
};

// full-frame scratch canvases for the slam's smear (nothing in them outlives the frame that uses them)
const scratch = (env: Env, k: string): Layer => {
  const w = Math.round(env.W * env.scale),
    h = Math.round(env.H * env.scale),
    key = `halftoneHost:smear:${k}:${w}x${h}`;
  let L = env.cache.get(key) as Layer | undefined;
  if (!L) {
    L = env.canvas(w, h);
    env.cache.set(key, L);
  }
  return L;
};

/**
 * Print a shaded form through the screen. The tone field is computed per point (cell = pitch / 3) into a buffer;
 * its coverage becomes a paper plate in an offscreen canvas (so the form stays white on any ground); then ink
 * dots are laid on a rotated grid anchored at (ox, oy) with radius following the tone.
 */
function print(
  ctx: Ctx,
  env: Env,
  box: { x0: number; y0: number; x1: number; y1: number },
  pitch: number,
  ox: number,
  oy: number,
  tone: Sampler,
  ink: string,
  paper: string | null = PAPER,
  angle = 45,
) {
  let cell = pitch / 3;
  const bw = box.x1 - box.x0,
    bh = box.y1 - box.y0;
  cell = Math.max(cell, bw / 1024, bh / 1024);
  const fw = Math.ceil(bw / cell),
    fh = Math.ceil(bh / cell);
  if (fw <= 0 || fh <= 0) return;
  const field = new Float32Array(fw * fh),
    L = plateLayer(env),
    img = L.ctx.createImageData(fw, fh),
    d = img.data;
  const pr = paper ? parseInt(paper.slice(1, 3), 16) : 0,
    pg = paper ? parseInt(paper.slice(3, 5), 16) : 0,
    pb = paper ? parseInt(paper.slice(5, 7), 16) : 0;
  for (let j = 0; j < fh; j++)
    for (let i = 0; i < fw; i++) {
      const v = tone(box.x0 + (i + 0.5) * cell, box.y0 + (j + 0.5) * cell),
        k = j * fw + i;
      field[k] = v;
      if (v >= 0 && v < 2) {
        d[k * 4] = pr;
        d[k * 4 + 1] = pg;
        d[k * 4 + 2] = pb;
        d[k * 4 + 3] = 255;
      }
    }
  if (paper) {
    L.ctx.setTransform(1, 0, 0, 1, 0, 0);
    // clear a margin too: smoothing samples just past the source rect, and stale pixels there would make the
    // frame depend on the frame drawn before it
    L.ctx.clearRect(0, 0, fw + 4, fh + 4);
    L.ctx.putImageData(img, 0, 0);
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(L.canvas, 0, 0, fw, fh, box.x0, box.y0, fw * cell, fh * cell);
    ctx.restore();
  }
  // the screen: a rotated grid anchored to the form, so dots travel with it instead of crawling
  const a = (angle * Math.PI) / 180,
    c = Math.cos(a),
    s = Math.sin(a);
  let umin = Infinity,
    umax = -Infinity,
    vmin = Infinity,
    vmax = -Infinity;
  for (const [x, y] of [
    [box.x0, box.y0],
    [box.x1, box.y0],
    [box.x0, box.y1],
    [box.x1, box.y1],
  ] as const) {
    const u = (x - ox) * c + (y - oy) * s,
      v = -(x - ox) * s + (y - oy) * c;
    umin = Math.min(umin, u);
    umax = Math.max(umax, u);
    vmin = Math.min(vmin, v);
    vmax = Math.max(vmax, v);
  }
  ctx.save();
  ctx.fillStyle = ink;
  ctx.beginPath();
  for (let i = Math.floor(umin / pitch); i <= Math.ceil(umax / pitch); i++)
    for (let j = Math.floor(vmin / pitch); j <= Math.ceil(vmax / pitch); j++) {
      const x = ox + i * pitch * c - j * pitch * s,
        y = oy + i * pitch * s + j * pitch * c;
      const fi = Math.floor((x - box.x0) / cell),
        fj = Math.floor((y - box.y0) / cell);
      if (fi < 0 || fj < 0 || fi >= fw || fj >= fh) continue;
      let t = field[fj * fw + fi]!;
      if (t < 0) continue;
      if (t >= 2) t -= 2;
      if (t < 0.035) continue;
      const r = pitch * 0.74 * Math.sqrt(Math.min(1, t));
      ctx.moveTo(x + r, y);
      ctx.arc(x, y, r, 0, TAU);
    }
  ctx.fill();
  ctx.restore();
}

// ---- light: from the top left, a little in front. Lambert + a Blinn highlight + a touch of rim darkening.
const nrm = (x: number, y: number, z: number): [number, number, number] => {
  const l = Math.hypot(x, y, z) || 1;
  return [x / l, y / l, z / l];
};
const [LX, LY, LZ] = nrm(-0.52, -0.68, 0.52),
  [HX, HY, HZ] = nrm(LX, LY, LZ + 1);
const shade = (nx: number, ny: number, nz: number, alb = 1, spec = 0.45, sh = 26) => {
  const d = Math.max(0, nx * LX + ny * LY + nz * LZ),
    h = Math.max(0, nx * HX + ny * HY + nz * HZ);
  const b = 0.16 + 1.0 * d * alb + spec * h ** sh;
  return clamp(1 - b + 0.2 * (1 - Math.max(0, nz)) ** 3);
};
const sphereAt = (dx: number, dy: number, r: number, alb = 1, spec = 0.45, sh = 26) => {
  const x = dx / r,
    y = dy / r,
    q = 1 - x * x - y * y;
  return q < 0 ? -1 : shade(x, y, Math.sqrt(q), alb, spec, sh);
};
const capsule = (x: number, y: number, ax: number, ay: number, bx: number, by: number) => {
  const vx = bx - ax,
    vy = by - ay,
    t = clamp(((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy || 1));
  return Math.hypot(x - ax - vx * t, y - ay - vy * t);
};

// ================================================================ THE HOST
// Local units: the body's radius is 1, origin at the dial's centre, y down. The feet touch the ground at GY.
export type Pose = {
  tilt: number; // radians, about the ground point
  sx: number;
  sy: number; // squash and stretch
  hands: [number, number]; // hour hand (left) and minute hand (right), radians clockwise from 12
  blink: number; // 0 open … 1 shut
  wink: number; // the right eye only
  smile: number; // −1 frown … 1 smile
  open: number; // mouth open 0..1
  look: [number, number];
  ring: number; // bell shake amplitude 0..1
  t: number; // seconds (the ringing phase)
  shadow: number;
};
const GY = 1.13,
  PIV: [number, number] = [0, 0.6], // the hands' boss sits below the mouth, out of the face
  EYE_Y = -0.16,
  EYE_X = 0.33,
  MOUTH_Y = 0.36;
export const MOOD = {
  up: [-0.62, 0.62] as [number, number],
  rest: [-0.9, 0.35] as [number, number],
  droop: [-2.3, 2.3] as [number, number],
};
const pose0: Pose = {
  tilt: 0,
  sx: 1,
  sy: 1,
  hands: MOOD.rest,
  blink: 0,
  wink: 0,
  smile: 0.7,
  open: 0,
  look: [0, 0],
  ring: 0,
  t: 0,
  shadow: 1,
};

function hostSampler(p: Pose): Sampler {
  const ring = (i: number) => p.ring * 0.2 * Math.sin(p.t * TAU * 9 + i * Math.PI);
  const bells = [-1, 1].map((i) => {
    const a = i * 0.55 + ring(i);
    return { cx: i * 0.56, cy: -0.9, c: Math.cos(a), s: Math.sin(a) };
  });
  const hA = p.ring * 0.5 * Math.sin(p.t * TAU * 9),
    hdx = Math.sin(hA),
    hdy = -Math.cos(hA),
    hp: [number, number] = [0, -0.93];
  const lx = p.look[0] * 0.03,
    ly = p.look[1] * 0.03;
  const eyes = [
    { x: -EYE_X + lx, y: EYE_Y + ly, o: 1 - p.blink, arc: false },
    { x: EYE_X + lx, y: EYE_Y + ly, o: 1 - Math.max(p.blink, p.wink), arc: p.wink > 0.55 },
  ];
  const hands = p.hands.map((a, i) => {
    const len = i ? 0.17 : 0.13;
    return { bx: PIV[0] + Math.sin(a) * len, by: PIV[1] - Math.cos(a) * len, w: i ? 0.019 : 0.023 };
  });
  return (x, y) => {
    const r = Math.hypot(x, y);
    if (r <= 0.78) {
      // ---- the face on the dial (flat print on the enamel)
      const pc = Math.hypot(x - PIV[0], y - PIV[1]);
      if (pc < 0.034) return 0.55;
      // short, thin hands printed a step lighter than the eyes: a mood signal that never competes with the face
      for (const h of hands) if (capsule(x, y, PIV[0], PIV[1], h.bx, h.by) < h.w) return 0.36;
      for (const e of eyes) {
        const dx = x - e.x,
          dy = y - e.y;
        if (e.arc) {
          const yc = e.y + 0.01 - (0.012 - 3.4 * dx * dx);
          if (Math.abs(dx) < 0.1 && Math.abs(dy - (yc - e.y)) < 0.026) return 1;
          continue;
        }
        const ry = 0.13 * Math.max(0.18, e.o),
          rx = 0.1;
        if ((dx / rx) ** 2 + (dy / ry) ** 2 <= 1) {
          if (e.o > 0.6 && Math.hypot(dx + 0.034, dy + 0.05) < 0.036) return 0;
          return 1;
        }
      }
      // mouth: a smile band, or an open "o"
      if (p.open > 0.05) {
        const ry = 0.02 + 0.06 * p.open;
        if ((x / 0.07) ** 2 + ((y - MOUTH_Y - 0.01) / ry) ** 2 <= 1) return 1;
      } else {
        const w = 0.115;
        if (Math.abs(x) <= w) {
          const yc = MOUTH_Y - 0.03 * p.smile + 0.075 * p.smile * (1 - (x / w) ** 2);
          if (Math.abs(y - yc) < 0.027) return 1;
        }
      }
      // hour ticks
      if (r > 0.6) {
        const th = Math.atan2(x, -y),
          k = Math.round(th / (Math.PI / 6)),
          ta = k * (Math.PI / 6),
          tx = Math.sin(ta),
          ty = -Math.cos(ta);
        if (Math.abs(k) === 6) {
          // no tick at six: the hands live there
        } else if (k % 3 === 0) {
          if (capsule(x, y, tx * 0.63, ty * 0.63, tx * 0.7, ty * 0.7) < 0.026) return 0.7;
        } else if (Math.hypot(x - tx * 0.67, y - ty * 0.67) < 0.02) return 0.5;
      }
      // the enamel under a glass dome: a soft gradient, darker where the bezel shades it
      const [nx, ny, nz] = nrm(x * 0.22, y * 0.22, 1);
      let t = shade(nx, ny, nz, 1.55, 0.9, 60) * 0.8;
      const qs = Math.hypot(x - 0.045, y - 0.058);
      t += 0.32 * clamp((qs - 0.72) / 0.07) + 0.08 * clamp((r - 0.62) / 0.16);
      return clamp(t);
    }
    if (r <= 1) {
      // the bezel: a torus
      const dr = clamp((r - 0.89) / 0.11, -1, 1),
        nz = Math.sqrt(1 - dr * dr);
      return shade((dr * x) / r, (dr * y) / r, nz, 0.95, 0.7, 30);
    }
    // the drum behind the bezel (the body's side, turned a little away from us)
    if (Math.hypot(x - 0.07, y - 0.065) <= 1) {
      const [nx, ny, nz] = nrm(x - 0.035, y - 0.03, 0.08);
      return shade(nx, ny, nz, 0.9, 0.2);
    }
    // the hammer (between the bells, behind the body)
    if (capsule(x, y, hp[0], hp[1], hp[0] + hdx * 0.3, hp[1] + hdy * 0.3) < 0.036) {
      const s = ((x - hp[0]) * -hdy + (y - hp[1]) * hdx) / 0.036;
      return shade(clamp(s, -1, 1) * -hdy, clamp(s, -1, 1) * hdx, Math.sqrt(Math.max(0, 1 - s * s)), 0.9);
    }
    const hs = sphereAt(x - (hp[0] + hdx * 0.36), y - (hp[1] + hdy * 0.36), 0.085, 1, 0.8, 40);
    if (hs >= 0) return hs;
    // the bells: domes, tipped outward
    for (const b of bells) {
      const dx = x - b.cx,
        dy = y - b.cy,
        qx = dx * b.c + dy * b.s,
        qy = -dx * b.s + dy * b.c,
        br = 0.31;
      const knob = Math.hypot(qx, qy + br + 0.02);
      if (knob < 0.05) {
        const [nx, ny, nz] = nrm(qx / 0.05, (qy + br + 0.02) / 0.05, 0.6);
        return shade(nx * b.c - ny * b.s, nx * b.s + ny * b.c, nz, 1, 0.6);
      }
      if (qy < 0.06 && qx * qx + qy * qy <= br * br) {
        const nx = qx / br,
          ny = qy / br,
          nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
        let t = shade(nx * b.c - ny * b.s, nx * b.s + ny * b.c, nz, 1.05, 0.9, 40);
        if (qy > -0.015) t = clamp(t + 0.35);
        return t;
      }
    }
    // the feet
    for (const i of [-1, 1]) {
      const ex = (x - i * 0.5) / 0.21,
        ey = (y - 0.99) / 0.14,
        q = 1 - ex * ex - ey * ey;
      if (q >= 0) {
        const [nx, ny, nz] = nrm(ex, ey, Math.sqrt(q));
        return shade(nx, ny, nz, 0.85, 0.3);
      }
    }
    // the cast shadow, printed on the page
    if (p.shadow > 0) {
      const e = (x / 0.95) ** 2 + ((y - GY) / 0.085) ** 2;
      if (e < 1) return 2 + 0.55 * p.shadow * (1 - e);
    }
    return -1;
  };
}

/**
 * Draw the host with its ground point at (gx, gy) and body radius R. The dot grid is anchored at the ground
 * point (translation only), so the screen travels with the host rather than crawling over it.
 */
function drawHost(
  ctx: Ctx,
  env: Env,
  gx: number,
  gy: number,
  R: number,
  pitch: number,
  pose: Partial<Pose>,
  o: { ink?: string; lines?: string | null } = {},
) {
  const p = { ...pose0, ...pose },
    tone = hostSampler(p),
    c = Math.cos(p.tilt),
    s = Math.sin(p.tilt);
  const toLocal = (X: number, Y: number): [number, number] => {
    const dx = X - gx,
      dy = Y - gy,
      rx = dx * c + dy * s,
      ry = -dx * s + dy * c;
    return [rx / (R * p.sx), ry / (R * p.sy) + GY];
  };
  const toWorld = (x: number, y: number): [number, number] => {
    const rx = x * R * p.sx,
      ry = (y - GY) * R * p.sy;
    return [gx + rx * c - ry * s, gy + rx * s + ry * c];
  };
  const corners = [toWorld(-1.25, -1.42), toWorld(1.25, -1.42), toWorld(-1.25, 1.26), toWorld(1.25, 1.26)];
  const box = {
    x0: Math.min(...corners.map((q) => q[0])),
    y0: Math.min(...corners.map((q) => q[1])),
    x1: Math.max(...corners.map((q) => q[0])),
    y1: Math.max(...corners.map((q) => q[1])),
  };
  print(ctx, env, box, pitch, gx, gy, (X, Y) => tone(...toLocal(X, Y)), o.ink ?? BLACK);
  // ringing: little motion lines beside each bell (crisp vector, not printed)
  if (p.ring > 0.05 && o.lines !== null) {
    ctx.save();
    ctx.strokeStyle = o.lines ?? BLACK;
    ctx.lineWidth = Math.max(3, R * 0.03);
    ctx.lineCap = "round";
    for (const i of [-1, 1])
      for (let k = 0; k < 3; k++) {
        const ph = (p.t * 3 + k / 3) % 1,
          a0 = i < 0 ? Math.PI + 0.55 : -0.55,
          rad = 0.42 + 0.1 * k + 0.05 * ph;
        ctx.globalAlpha = p.ring * (1 - Math.abs(ph - 0.5) * 1.2);
        ctx.beginPath();
        for (let q = 0; q <= 8; q++) {
          const aa = a0 + (q / 8 - 0.5) * 0.9 - i * 0.2;
          const [X, Y] = toWorld(i * 0.56 + Math.cos(aa) * rad, -0.95 + Math.sin(aa) * rad);
          if (q) ctx.lineTo(X, Y);
          else ctx.moveTo(X, Y);
        }
        ctx.stroke();
      }
    ctx.restore();
  }
}

// ================================================================ THE CARD OBJECTS (the same screen)
// Each spans about [−1, 1]; oblique boxes for the calendar and suitcase, a torus arc and ellipsoids for the
// headphones. Flat faces take their tone from their normal, so they print as three clean greys.
const objCalendar: Sampler = (x, y) => {
  const DX = 0.3,
    DY = -0.24,
    x0 = -0.78,
    x1 = 0.42,
    y0 = -0.42,
    y1 = 0.72;
  // front face
  if (x >= x0 && x <= x1 && y >= y0 && y <= y1) {
    if (y < y0 + 0.24) {
      // the binding band, with two rings
      for (const rx of [-0.42, 0.06]) if (Math.abs(x - rx) < 0.045 && y < y0 + 0.12) return 0.15;
      return 0.86;
    }
    // date grid 4 × 3
    const gx = (x - (x0 + 0.1)) / 0.26,
      gy = (y - (y0 + 0.36)) / 0.25,
      ix = Math.floor(gx),
      iy = Math.floor(gy);
    if (ix >= 0 && ix < 4 && iy >= 0 && iy < 3 && gx - ix < 0.72 && gy - iy < 0.68)
      return ix === 2 && iy === 1 ? 1 : 0.42;
    return clamp(0.12 + 0.12 * ((x - x0) / (x1 - x0)) + 0.1 * ((y - y0) / (y1 - y0)));
  }
  // top face
  if (y < y0) {
    const k = (y0 - y) / -DY;
    if (k <= 1 && x - DX * k >= x0 && x - DX * k <= x1) {
      for (const rx of [-0.42, 0.06]) if (Math.abs(x - DX * k - rx) < 0.045 && k < 0.6) return 0.75;
      return 0.04;
    }
  }
  // right face: stacked pages
  if (x > x1) {
    const k = (x - x1) / DX;
    if (k <= 1 && y + DY * -k >= y0 && y - DY * k <= y1 + 0.001) {
      const yy = y + DY * -k;
      if (yy >= y0 && yy <= y1) return Math.sin(yy * 70) > 0.6 ? 0.85 : 0.62;
    }
  }
  const e = (x / 1.05) ** 2 + ((y - 0.8) / 0.08) ** 2;
  return e < 1 ? 2 + 0.45 * (1 - e) : -1;
};
const objHeadphones: Sampler = (x, y) => {
  // the ear cups: ellipsoids with a darker cushion toward the middle
  for (const i of [-1, 1]) {
    const cx = i * 0.64,
      cy = 0.3,
      ex = (x - cx) / 0.24,
      ey = (y - cy) / 0.36,
      q = 1 - ex * ex - ey * ey;
    if (q >= 0) {
      const [nx, ny, nz] = nrm(ex, ey, Math.sqrt(q));
      const t = shade(nx, ny, nz, 0.95, 0.7, 30);
      return ex * i < -0.45 ? clamp(t + 0.4) : t;
    }
  }
  // the sliders
  for (const i of [-1, 1]) if (Math.abs(x - i * 0.64) < 0.05 && y > -0.12 && y < 0.02) return 0.6;
  // the band: a tube along an arc
  const cy = 0.08,
    rr_ = Math.hypot(x, y - cy),
    tub = 0.1;
  if (y < cy && Math.abs(rr_ - 0.66) < tub) {
    const dr = (rr_ - 0.66) / tub,
      nz = Math.sqrt(1 - dr * dr);
    return shade((dr * x) / rr_, (dr * (y - cy)) / rr_, nz, 1, 0.8, 34);
  }
  const e = (x / 1.0) ** 2 + ((y - 0.78) / 0.08) ** 2;
  return e < 1 ? 2 + 0.45 * (1 - e) : -1;
};
const objSuitcase: Sampler = (x, y) => {
  const DX = 0.24,
    DY = -0.18,
    x0 = -0.74,
    x1 = 0.5,
    y0 = -0.3,
    y1 = 0.66,
    rad = 0.1;
  // wheels
  for (const wx of [x0 + 0.16, x1 - 0.1]) {
    const t = sphereAt(x - wx, y - (y1 + 0.06), 0.08, 0.6, 0.3);
    if (t >= 0) return t;
  }
  // front face (rounded corners), with raised vertical ribs
  const inX = x >= x0 && x <= x1,
    inY = y >= y0 && y <= y1;
  if (inX && inY) {
    const cx = clamp(x, x0 + rad, x1 - rad),
      cy = clamp(y, y0 + rad, y1 - rad);
    if (Math.hypot(x - cx, y - cy) <= rad) {
      for (const rx of [-0.42, -0.12, 0.18]) {
        const d = (x - rx) / 0.06;
        if (Math.abs(d) < 1) return clamp(0.26 + 0.5 * d);
      }
      if (Math.abs(y - (y0 + 0.14)) < 0.02) return 0.7;
      return clamp(0.14 + 0.14 * ((x - x0) / (x1 - x0)) + 0.1 * ((y - y0) / (y1 - y0)));
    }
  }
  // top face
  if (y < y0) {
    const k = (y0 - y) / -DY;
    if (k <= 1 && x - DX * k >= x0 + rad * 0.5 && x - DX * k <= x1) return 0.05;
  }
  // side
  if (x > x1) {
    const k = (x - x1) / DX,
      yy = y - DY * k;
    if (k <= 1 && yy >= y0 && yy <= y1 - rad * 0.5) return 0.66;
  }
  // the handle: a tube bent into an arch above the top face
  const hx = x - (-0.12 + DX * 0.5),
    hy = y - (y0 + DY * 0.5),
    hr = Math.hypot(hx / 1.5, hy);
  if (hy < 0 && Math.abs(hr - 0.16) < 0.045) {
    const dr = (hr - 0.16) / 0.045;
    return shade((dr * hx) / (hr * 1.5 || 1), (dr * hy) / (hr || 1), Math.sqrt(1 - dr * dr), 0.9, 0.6);
  }
  const e = (x / 1.05) ** 2 + ((y - 0.8) / 0.08) ** 2;
  return e < 1 ? 2 + 0.45 * (1 - e) : -1;
};
const OBJECTS = { calendar: objCalendar, headphones: objHeadphones, suitcase: objSuitcase };
function drawObject(
  ctx: Ctx,
  env: Env,
  kind: keyof typeof OBJECTS,
  cx: number,
  cy: number,
  s: number,
  pitch: number,
  spin = 0,
) {
  const f = OBJECTS[kind],
    c = Math.cos(spin),
    sn = Math.sin(spin);
  print(
    ctx,
    env,
    { x0: cx - s * 1.2, y0: cy - s * 1.1, x1: cx + s * 1.2, y1: cy + s * 1.0 },
    pitch,
    cx,
    cy,
    (X, Y) => {
      const dx = (X - cx) / s,
        dy = (Y - cy) / s;
      return f(dx * c + dy * sn, -dx * sn + dy * c);
    },
    BLACK,
  );
}

// ================================================================ HAND-DRAWN STROKES
/** a hand-drawn underline that draws itself (p 0..1), ending in a small upward flick */
function scribble(ctx: Ctx, x0: number, x1: number, y: number, p: number, lw: number, color: string, seed: number) {
  if (p <= 0) return;
  const r = rng(seed),
    n = 28,
    pts: [number, number][] = [],
    ph = r() * 6,
    w = x1 - x0;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push([
      x0 - w * 0.03 + t * w * 1.08,
      y + Math.sin(t * 5.2 + ph) * lw * 0.32 + (t - 0.5) * lw * 0.5 - t ** 8 * lw * 1.4,
    ]);
  }
  strokeTo(ctx, pts, p, lw, color);
}
function strokeTo(ctx: Ctx, pts: [number, number][], p: number, lw: number, color: string) {
  const n = pts.length - 1,
    upto = p * n;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(pts[0]![0], pts[0]![1]);
  for (let i = 1; i <= Math.ceil(upto); i++) {
    const a = pts[i - 1]!,
      b = pts[i]!,
      k = Math.min(1, upto - (i - 1));
    ctx.lineTo(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k);
  }
  ctx.stroke();
  ctx.restore();
}

// ================================================================ THE FILM
export function make(size: Size, id: string): Film {
  const L = layout(size),
    { W, H, u, cx, cy, tall } = L;
  const S = L.safe;
  const DOT = 5.2 * u; // the one screen pitch
  const sans = (sz: number, color: string, weight = 600, track = -0.03) => ({
    size: sz * u,
    family: F_.sans,
    weight,
    color,
    track,
  });
  const monoO = (sz: number, color: string) => ({ size: sz * u, family: F_.mono, weight: 500, color, track: 0.04 });

  // ---- chrome: the section top left, a running timecode top right (drawn sharp, on top of everything)
  const chrome = (ctx: Ctx, F: number) => {
    const f = Math.floor(F),
      ground = groundAt(f);
    const color = ground === "accent" ? "rgba(18,18,18,0.62)" : ground === "black" ? C.muted : C.muted;
    const sec = [...SECTIONS].reverse().find(([s]) => f >= s)![1];
    const tc = `ORIEL  00:00:${String(Math.floor(f / FPS)).padStart(2, "0")}:${String(f % FPS).padStart(2, "0")}`;
    const y = S.top + 22 * u;
    text(ctx, sec, S.x, y, monoO(22, color));
    text(ctx, tc, W - S.x, y, { ...monoO(22, color), align: "right" });
  };
  const groundAt = (f: number): "page" | "accent" | "black" =>
    f >= T.problem && f < T.product
      ? "accent"
      : (f >= T.slam && f < T.handled) || (f >= T.flow && f < T.end)
        ? "black"
        : "page";

  // ---- headlines: Inter 600, tight, with one larger serif-italic key word and a hand-drawn underline
  type Wd = { t: string; at: number; key?: boolean };
  type HeadO = {
    x: number;
    y: number;
    size: number;
    color: string;
    keyColor?: string;
    keyScale?: number;
    gap?: number;
    align?: "left" | "center";
    under?: [number, number];
    scale?: number[]; // per line
    lines: Wd[][];
  };
  const head = (ctx: Ctx, F: number, o: HeadO) => {
    let by = o.y;
    o.lines.forEach((line, li) => {
      const ls = o.scale?.[li] ?? 1;
      const opts = line.map((w) =>
        w.key
          ? {
              size: o.size * ls * (o.keyScale ?? 1.42) * u,
              family: F_.italic,
              weight: 400,
              color: o.keyColor ?? C.accent,
              track: -0.01,
            }
          : sans(o.size * ls, o.color, 600, -0.035),
      );
      const lh = Math.max(...opts.map((q) => q.size));
      if (li > 0) by += lh * (o.gap ?? 1.02);
      const widths = line.map((w, i) => measure(ctx, w.t, opts[i]!)),
        sp = o.size * u * 0.26,
        total = widths.reduce((a, b) => a + b, 0) + sp * (line.length - 1);
      let x = o.align === "center" ? o.x - total / 2 : o.x;
      line.forEach((w, i) => {
        const q = opts[i]!,
          p = spring((F - w.at) / FPS, { freq: 2.8, damp: 0.82 });
        if (p > 0.001) {
          ctx.save();
          ctx.globalAlpha *= clamp(p * 1.6);
          text(ctx, w.t, x, by + (1 - p) * q.size * 0.4, q);
          ctx.restore();
          if (w.key && o.under) {
            const core = w.t.replace(/[.?!,]+$/, ""),
              cw = measure(ctx, core, q);
            scribble(
              ctx,
              x + q.size * 0.04,
              x + cw,
              by + q.size * 0.13,
              ease.inOutCubic(prog(F, o.under[0], o.under[1])),
              Math.max(5, q.size * 0.05),
              C.accent,
              li * 7 + i + 3,
            );
          }
        }
        x += widths[i]! + sp;
      });
    });
  };

  // the push-in that keeps every hold moving (content only; the chrome stays put)
  const push = (ctx: Ctx, F: number, a: number, b: number, k = 0.035, ox = cx, oy = cy) => {
    const s = 1 + k * ease.inOutCubic(prog(F, a, b));
    ctx.translate(ox, oy);
    ctx.scale(s, s);
    ctx.translate(-ox, -oy);
  };
  const blinkAt = (F: number, at: number[]) => Math.max(0, ...at.map((b) => clamp(1 - Math.abs(F - b) / 3.2)));
  const idle = (F: number) => ({
    sy: 1 + 0.014 * Math.sin((F / 40) * TAU),
    sx: 1 - 0.01 * Math.sin((F / 40) * TAU),
    tilt: 0.02 * Math.sin((F / 75) * TAU),
  });

  // ================================================================ 01 HOOK (0–90)
  const hk = tall
    ? { gx: 560 * u, gy: 1590 * u, R: 300 * u, hx: S.x + 20 * u, hy: 480 * u, size: 104, bub: [130, 820] }
    : { gx: 1400 * u, gy: 950 * u, R: 238 * u, hx: 150 * u, hy: 470 * u, size: 104, bub: [1000, 440] };
  const hook = (ctx: Ctx, env: Env, F: number) => {
    ctx.fillStyle = C.ground;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    push(ctx, F, 26, T.problem, 0.03);
    // the host hops in from the right: two hops, a squash on each landing, then it settles
    const x0 = W + hk.R * 1.6,
      xm = lerp(x0, hk.gx, 0.58);
    let gx = hk.gx,
      lift = 0,
      sy = 1,
      tilt = 0;
    if (F < 12) {
      const s = F / 12;
      gx = lerp(x0, xm, s);
      lift = 4 * s * (1 - s) * 150 * u;
      sy = 1.08;
      tilt = -0.16;
    } else if (F < 24) {
      const s = (F - 12) / 12;
      gx = lerp(xm, hk.gx, ease.outCubic(s));
      lift = 4 * s * (1 - s) * 70 * u;
      sy = s < 0.2 ? 1 - 0.16 * (1 - s / 0.2) : 1.05;
      tilt = -0.1;
    } else {
      const k = F - 24;
      sy = 1 - 0.2 * Math.exp(-k / 4) * Math.cos(k * 0.55);
      tilt = -0.1 * Math.exp(-k / 6) * Math.cos(k * 0.4);
    }
    const id = idle(F),
      talk = prog(F, 26, 30) * (1 - prog(F, 44, 48));
    drawHost(ctx, env, gx, hk.gy - lift, hk.R, DOT, {
      sy: sy * id.sy,
      sx: (1 / sy) * id.sx,
      tilt: tilt + (F > 30 ? id.tilt : 0),
      blink: blinkAt(F, [36, 72]),
      look: [F < 50 ? -0.4 : -0.9, F < 50 ? 0 : 0.2],
      open: talk * 0.7,
      smile: 0.8,
      hands: [MOOD.up[0] + 0.25 * Math.sin(F * 0.5) * prog(F, 58, 64) * (1 - prog(F, 70, 80)), MOOD.up[1]],
    });
    // 'psst…': a small bubble pops beside the host and goes
    const bp = spring((F - 26) / FPS, { freq: 3.2, damp: 0.55 }) * (1 - ease.inCubic(prog(F, 46, 52)));
    if (bp > 0.01) {
      const [bx, by] = hk.bub as [number, number],
        o = monoO(26, BLACK),
        tw = measure(ctx, "psst…", o),
        w = tw + 44 * u,
        h = 58 * u;
      ctx.save();
      ctx.translate(bx + w, by);
      ctx.scale(bp, bp);
      ctx.translate(-(bx + w), -by);
      card(ctx, bx, by - h / 2, w, h, { r: h / 2, fill: PAPER, stroke: BLACK, lw: 2.5 * u });
      ctx.beginPath();
      ctx.moveTo(bx + w - 18 * u, by + h / 2 - 3 * u);
      ctx.lineTo(bx + w + 22 * u, by + h / 2 + 18 * u);
      ctx.lineTo(bx + w - 2 * u, by + h / 2 - 12 * u);
      ctx.fillStyle = PAPER;
      ctx.fill();
      ctx.strokeStyle = BLACK;
      ctx.lineWidth = 2.5 * u;
      ctx.stroke();
      text(ctx, "psst…", bx + 22 * u, by + 9 * u, o);
      ctx.restore();
    }
    // the headline
    head(ctx, F, {
      x: hk.hx,
      y: hk.hy,
      size: hk.size,
      color: BLACK,
      under: [44, 58],
      lines: [
        [
          { t: "Got", at: 6 },
          { t: "a", at: 10 },
          { t: "week", at: 20 },
          { t: "that", at: 24 },
        ],
        [
          { t: "won't", at: 34 },
          { t: "fit?", at: 39, key: true },
        ],
      ],
    });
    ctx.restore();
  };

  // ================================================================ 02 PROBLEM (90–180)
  const CARDS = [
    { tag: "// meetings", no: "01", title: "Meetings", line: "14 this week", obj: "calendar" as const },
    { tag: "// focus", no: "02", title: "Focus", line: "2 hours left", obj: "headphones" as const },
    { tag: "// travel", no: "03", title: "Travel", line: "Thu to Mon", obj: "suitcase" as const },
  ];
  const problem = (ctx: Ctx, env: Env, F: number) => {
    ctx.fillStyle = C.accent;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    push(ctx, F, T.problem, T.product, 0.035);
    const id = idle(F),
      f = F - T.problem;
    // the host, bottom left, hands drooping
    const [gx, gy, R] = tall ? [330 * u, 2010 * u, 290 * u] : [330 * u, 1150 * u, 240 * u];
    drawHost(ctx, env, gx, gy, R, DOT, {
      sy: id.sy * (1 - 0.03 * Math.exp(-f / 6)),
      sx: id.sx,
      tilt: 0.05 + id.tilt,
      hands: [
        lerp(MOOD.up[0], MOOD.droop[0], ease.outCubic(prog(f, 0, 14))),
        lerp(MOOD.up[1], MOOD.droop[1], ease.outCubic(prog(f, 2, 16))),
      ],
      blink: 0.35 + 0.65 * blinkAt(F, [150]),
      smile: -0.7,
      look: [0.9, -0.5],
      shadow: 0,
    });
    // three white cards, one per beat
    CARDS.forEach((c, i) => {
      const at = T.problem + 15 + i * 15,
        p = spring((F - at) / FPS, { freq: 2.6, damp: 0.62 });
      if (p <= 0.001) return;
      let x: number, y: number, w: number, h: number;
      if (tall) {
        w = 920 * u;
        h = 250 * u;
        x = S.x;
        y = 330 * u + i * (h + 28 * u);
      } else {
        w = 330 * u;
        h = 430 * u;
        x = 740 * u + i * (w + 26 * u);
        y = 300 * u;
      }
      ctx.save();
      const ccx = x + w / 2,
        ccy = y + h / 2;
      ctx.translate(ccx, ccy + (1 - p) * 60 * u);
      ctx.rotate((1 - p) * (i % 2 ? 0.12 : -0.12));
      ctx.scale(0.7 + 0.3 * p, 0.7 + 0.3 * p);
      ctx.translate(-ccx, -ccy);
      ctx.globalAlpha = clamp(p * 2);
      card(ctx, x, y, w, h, { r: 22 * u, fill: PAPER });
      text(ctx, c.tag, x + 26 * u, y + 46 * u, monoO(22, C.muted));
      text(ctx, c.no, x + w - 26 * u, y + 46 * u, { ...monoO(22, C.muted), align: "right" });
      const spin = 0.04 * Math.sin(((F - at) / 60) * TAU);
      if (tall) {
        drawObject(ctx, env, c.obj, x + 150 * u, y + h / 2 + 14 * u, 88 * u, DOT, spin);
        text(ctx, c.title, x + 300 * u, y + 138 * u, sans(52, BLACK));
        text(ctx, c.line, x + 300 * u, y + 190 * u, sans(30, C.muted, 400, -0.01));
      } else {
        drawObject(ctx, env, c.obj, x + w / 2, y + 190 * u, 108 * u, DOT, spin);
        text(ctx, c.title, x + 26 * u, y + h - 76 * u, sans(44, BLACK));
        text(ctx, c.line, x + 26 * u, y + h - 34 * u, sans(26, C.muted, 400, -0.01));
      }
      ctx.restore();
    });
    ctx.restore();
  };

  // ================================================================ 03 PRODUCT (180–270)
  const ph = tall
    ? {
        x: 540 * u,
        y: 690 * u,
        w: 460 * u,
        hx: S.x + 20 * u,
        hy: 340 * u,
        size: 104,
        gx: 520 * u,
        gy: 1640 * u,
        R: 175 * u,
      }
    : {
        x: 1300 * u,
        y: 150 * u,
        w: 380 * u,
        hx: 150 * u,
        hy: 380 * u,
        size: 124,
        gx: 1280 * u,
        gy: 1010 * u,
        R: 155 * u,
      };
  const phoneShape = (ctx: Ctx) => rr(ctx, ph.x, ph.y, ph.w, ph.w * 2.05, ph.w * 0.16);
  const product = (ctx: Ctx, env: Env, F: number) => {
    ctx.fillStyle = C.ground;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    push(ctx, F, T.product, T.slam, 0.03);
    const f = F - T.product,
      id = idle(F);
    const pw = ph.w,
      phh = pw * 2.05;
    // the host peeks out from behind the phone
    const peek = ease.outBack(clamp((f - 36) / 16), 1.4);
    if (f >= 34)
      drawHost(ctx, env, lerp(ph.gx + ph.R * 1.3, ph.gx, peek), ph.gy, ph.R, DOT, {
        tilt: lerp(0, -0.32, peek) + id.tilt,
        sy: id.sy,
        sx: id.sx,
        blink: blinkAt(F, [240]),
        look: [0.8, -0.6],
        hands: MOOD.up,
        smile: 0.9,
        shadow: 0,
      });
    // the phone outline draws itself, then fills with the Oriel screen
    const draw = ease.inOutCubic(prog(f, 0, 14)),
      fill = ease.outCubic(prog(f, 10, 20));
    ctx.save();
    phoneShape(ctx);
    ctx.fillStyle = PAPER;
    ctx.globalAlpha = fill;
    ctx.fill();
    ctx.restore();
    const perim = 2 * (pw + phh);
    ctx.save();
    phoneShape(ctx);
    if (draw < 1) ctx.setLineDash([perim * draw, perim * 2]);
    ctx.strokeStyle = BLACK;
    ctx.lineWidth = 5 * u;
    ctx.stroke();
    ctx.restore();
    if (fill > 0) {
      // the screen is laid out for a 380-wide phone and scaled to fit, so a bigger phone is not a blank slab
      const k = pw / (380 * u),
        cw = pw / k,
        chh = phh / k;
      ctx.save();
      ctx.translate(ph.x, ph.y);
      ctx.scale(k, k);
      ctx.translate(-ph.x, -ph.y);
      ctx.globalAlpha = fill;
      // island
      card(ctx, ph.x + cw / 2 - 52 * u, ph.y + 20 * u, 104 * u, 30 * u, { r: 15 * u, fill: BLACK });
      text(ctx, "9:41", ph.x + 40 * u, ph.y + 44 * u, monoO(22, BLACK));
      const ix = ph.x + 30 * u,
        iw = cw - 60 * u;
      text(ctx, "Oriel", ix, ph.y + 130 * u, { size: 46 * u, family: F_.serif, weight: 400, color: BLACK });
      // the request field, typing
      const req = "lunch with Sam",
        n = Math.floor(clamp((f - 12) / 1.2, 0, req.length));
      card(ctx, ix, ph.y + 160 * u, iw, 76 * u, { r: 38 * u, fill: C.ground, stroke: C.line, lw: 2 * u });
      text(
        ctx,
        n ? req.slice(0, n) : "Ask for a time…",
        ix + 26 * u,
        ph.y + 207 * u,
        sans(26, n ? BLACK : C.muted, n ? 600 : 400, -0.01),
      );
      if (n < req.length || Math.floor(f / 8) % 2)
        if (n)
          ctx.fillRect(
            ix + 26 * u + measure(ctx, req.slice(0, n), sans(26, BLACK, 600, -0.01)) + 4 * u,
            ph.y + 184 * u,
            3 * u,
            30 * u,
          );
      text(ctx, "3 times that work", ix, ph.y + 292 * u, monoO(22, C.muted));
      const slots = [
        ["Tue", "12:30", "Café Lune"],
        ["Wed", "13:00", "Your desk"],
        ["Thu", "12:00", "Park Row"],
      ];
      slots.forEach(([d, t, where], i) => {
        const a = spring((f - 22 - i * 4) / FPS, { freq: 3, damp: 0.75 });
        if (a <= 0) return;
        const y = ph.y + 316 * u + i * 118 * u;
        ctx.save();
        ctx.globalAlpha *= clamp(a * 1.5);
        ctx.translate(0, (1 - a) * 30 * u);
        card(ctx, ix, y, iw, 100 * u, {
          r: 20 * u,
          fill: PAPER,
          stroke: i === 0 ? BLACK : C.line,
          lw: (i === 0 ? 3 : 2) * u,
        });
        text(ctx, d!, ix + 22 * u, y + 44 * u, monoO(22, C.muted));
        text(ctx, t!, ix + 22 * u, y + 80 * u, sans(30, BLACK));
        text(ctx, where!, ix + iw - 22 * u, y + 80 * u, { ...sans(24, C.muted, 400, -0.01), align: "right" });
        if (i === 0) {
          ctx.beginPath();
          ctx.arc(ix + iw - 36 * u, y + 36 * u, 15 * u, 0, TAU);
          ctx.fillStyle = BLACK;
          ctx.fill();
          check(ctx, ix + iw - 36 * u, y + 36 * u, 15 * u, prog(f, 38, 46), PAPER, 3.5 * u);
        }
        ctx.restore();
      });
      const bk = spring((f - 34) / FPS, { freq: 3, damp: 0.7 });
      if (bk > 0) {
        const by = ph.y + chh - 118 * u;
        ctx.save();
        ctx.globalAlpha *= clamp(bk * 1.5);
        card(ctx, ix, by + (1 - bk) * 20 * u, iw, 72 * u, { r: 36 * u, fill: BLACK });
        text(ctx, "Book Tue 12:30", ix + iw / 2, by + 46 * u + (1 - bk) * 20 * u, {
          ...sans(26, PAPER),
          align: "center",
        });
        ctx.restore();
      }
      ctx.restore();
    }
    head(ctx, F, {
      x: ph.hx,
      y: ph.hy,
      size: ph.size,
      color: BLACK,
      under: [T.product + 60, T.product + 76],
      scale: [0.5, 1, 1],
      gap: 0.98,
      lines: [
        [
          { t: "Oriel", at: T.product + 18 },
          { t: "turns", at: T.product + 21 },
          { t: "it", at: T.product + 23 },
          { t: "into", at: T.product + 25 },
        ],
        [
          { t: "a", at: T.product + 34 },
          { t: "plan", at: T.product + 37 },
        ],
        [
          { t: "in", at: T.product + 48 },
          { t: "minutes.", at: T.product + 52, key: true },
        ],
      ],
    });
    ctx.restore();
  };

  // ================================================================ THE SLAM (270–300)
  // where the word sits: it flies in from the right (10 frames, ease-out-expo), then drifts a little
  const slamDx = (F: number) =>
    (1 - ease.outExpo(clamp((F - T.slam) / 9))) * W * 1.1 - ease.inOutCubic(prog(F - T.slam, 8, 30)) * 24 * u;
  const slam = (ctx: Ctx, F: number) => {
    ctx.fillStyle = BLACK;
    ctx.fillRect(0, 0, W, H);
    const f = F - T.slam,
      drift = ease.inOutCubic(prog(f, 8, 30));
    const words = tall ? ["One", "sentence."] : ["One sentence."];
    const base = sans(tall ? 180 : 210, C.ground, 600, -0.045);
    let sz = base.size;
    for (const w of words) sz = Math.min(sz, (base.size * (W - 2 * S.x)) / measure(ctx, w, base));
    const o = { ...base, size: sz };
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1 + 0.04 * drift, 1 + 0.04 * drift);
    ctx.translate(-cx, -cy);
    const dx = slamDx(F);
    words.forEach((w, i) => {
      const y = cy + sz * 0.36 + (i - (words.length - 1) / 2) * sz * 1.02;
      text(ctx, w, cx + dx, y, { ...o, align: "center" });
    });
    ctx.restore();
  };

  // ================================================================ 04 HANDLED: THE BENTO (300–450)
  // how far the bento pulls back (its smallest text, 29 px, still clears 22 px at this scale)
  const BACK = tall ? 0.76 : 0.74;
  const bento = (() => {
    const cols = tall ? 2 : 3,
      rows = tall ? 3 : 2,
      gap = 24 * u;
    const x0 = tall ? S.x : 110 * u,
      x1 = tall ? W - S.x : W - 110 * u,
      y0 = tall ? 300 * u : 150 * u,
      y1 = tall ? 1560 * u : 990 * u;
    const tw = (x1 - x0 - gap * (cols - 1)) / cols,
      th = (y1 - y0 - gap * (rows - 1)) / rows;
    const order = tall ? [0, 1, 2, 3, 4, 5] : [0, 1, 2, 3, 4, 5];
    const tiles = order.map((k, i) => ({
      k,
      x: x0 + (i % cols) * (tw + gap),
      y: y0 + Math.floor(i / cols) * (th + gap),
      w: tw,
      h: th,
    }));
    // the pull-back keeps the top edge where a 0.82 pull about the centre would put it, and frees the space
    // under the bento (inside the loop, inside the safe area) for the stamp
    const ey = (y0 + y1) / 2,
      top = y0 + (ey - y0) * 0.18,
      anchor = (top - BACK * y0) / (1 - BACK),
      bottom = anchor + (y1 - anchor) * BACK,
      loopBottom = ey + ((y1 - y0) / 2) * 0.82 * (tall ? 1.24 : 1.3);
    return { x0, x1, y0, y1, tiles, anchor, stampY: (bottom + Math.min(loopBottom, H - S.bottom)) / 2 };
  })();
  const handled = (ctx: Ctx, env: Env, F: number) => {
    ctx.fillStyle = C.ground;
    ctx.fillRect(0, 0, W, H);
    // a faint grid
    ctx.fillStyle = "rgba(18,18,18,0.06)";
    const g = 60 * u;
    for (let x = (cx % g) - g; x < W; x += g) ctx.fillRect(x, 0, 1.5 * u, H);
    for (let y = (cy % g) - g; y < H; y += g) ctx.fillRect(0, y, W, 1.5 * u);
    ctx.save();
    push(ctx, F, T.handled, T.flow, 0.035);
    const f = F - T.handled;
    // the bento pulls back toward its top: room for the loop around it and, below it, for the stamp
    const ex = (bento.x0 + bento.x1) / 2,
      ey = (bento.y0 + bento.y1) / 2,
      back = 1 - (1 - BACK) * ease.inOutCubic(prog(F, B.circle0 - 6, B.circle0 + 4));
    ctx.save();
    ctx.translate(ex, bento.anchor);
    ctx.scale(back, back);
    ctx.translate(-ex, -bento.anchor);
    bento.tiles.forEach((t, i) => {
      const p = spring((f - i * 2.5) / FPS, { freq: 2.6, damp: 0.7 });
      if (p <= 0.001) return;
      ctx.save();
      const tcx = t.x + t.w / 2,
        tcy = t.y + t.h / 2;
      ctx.translate(tcx, tcy + (1 - p) * 40 * u);
      ctx.scale(0.85 + 0.15 * p, 0.85 + 0.15 * p);
      ctx.translate(-tcx, -tcy);
      ctx.globalAlpha = clamp(p * 2);
      card(ctx, t.x, t.y, t.w, t.h, { r: 20 * u, fill: PAPER, stroke: C.line, lw: 2 * u });
      tile(ctx, env, F, t);
      ctx.restore();
    });
    ctx.restore();
    // the hand-drawn loop sweeps round the whole bento (a squarish superellipse, so it clears the tiles),
    // then the stamp slams in
    const cp = ease.inOutCubic(prog(F, B.circle0, B.circle1));
    if (cp > 0) {
      const rx = ((bento.x1 - bento.x0) / 2) * 0.82 * 1.27,
        ry = ((bento.y1 - bento.y0) / 2) * 0.82 * (tall ? 1.24 : 1.3),
        ph = rng(23)() * 6,
        pts: [number, number][] = [];
      const n = 120,
        a0 = -2.3;
      for (let i = 0; i <= n; i++) {
        const t = i / n,
          a = a0 + t * TAU * 1.06,
          c = Math.cos(a),
          sn = Math.sin(a),
          wob = 1 + 0.008 * Math.sin(a * 3 + ph) - 0.035 * t;
        pts.push([
          ex + Math.sign(c) * Math.abs(c) ** 0.66 * rx * wob,
          ey + Math.sign(sn) * Math.abs(sn) ** 0.66 * ry * wob,
        ]);
      }
      strokeTo(ctx, pts, cp, 8 * u, C.accent);
    }
    const sp = F >= B.stamp ? spring((F - B.stamp) / FPS, { freq: 3.4, damp: 0.55 }) : 0;
    if (sp > 0) {
      const o = { size: (tall ? 112 : 128) * u, family: F_.italic, weight: 400, color: C.accent, track: -0.01 },
        tw = measure(ctx, "Handled.", o),
        bw = tw + 90 * u,
        bh = o.size * 1.05;
      // it lands on the gutter between two rows, over tags and status lines, clear of the big numbers
      const sx = cx,
        sy = bento.stampY;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(-0.05);
      const k = 1 + 1.6 * (1 - sp);
      ctx.scale(k, k);
      ctx.globalAlpha = clamp(sp * 3);
      card(ctx, -bw / 2, -bh / 2, bw, bh, { r: 18 * u, fill: PAPER, stroke: C.accent, lw: 6 * u });
      ctx.strokeStyle = C.accent;
      ctx.lineWidth = 2.5 * u;
      rr(ctx, -bw / 2 + 12 * u, -bh / 2 + 12 * u, bw - 24 * u, bh - 24 * u, 10 * u);
      ctx.stroke();
      text(ctx, "Handled.", 0, o.size * 0.3, { ...o, align: "center" });
      ctx.restore();
    }
    ctx.restore();
  };
  type Tile = { k: number; x: number; y: number; w: number; h: number };
  const tile = (ctx: Ctx, env: Env, F: number, t: Tile) => {
    const pad = 26 * u,
      tagY = t.y + 48 * u;
    const tag = (s: string) => text(ctx, s, t.x + pad, tagY, monoO(29, C.muted));
    if (t.k === 0) {
      // the request typing
      tag("// request");
      const n = Math.floor(clamp((F - B.type0) / B.typeEvery, 0, REQUEST.length)),
        typed = REQUEST.slice(0, n);
      const fy = t.y + 78 * u,
        fh = t.h - 190 * u;
      card(ctx, t.x + pad, fy, t.w - 2 * pad, fh, { r: 16 * u, fill: C.ground });
      const o = sans(tall ? 32 : 36, BLACK, 600, -0.02),
        maxW = t.w - 2 * pad - 48 * u;
      // wrap by words
      const lines: string[] = [];
      let cur = "";
      for (const w of typed.split(" ")) {
        const tryS = cur ? `${cur} ${w}` : w;
        if (measure(ctx, tryS, o) > maxW && cur) {
          lines.push(cur);
          cur = w;
        } else cur = tryS;
      }
      lines.push(cur);
      lines.forEach((l, i) => text(ctx, l, t.x + pad + 24 * u, fy + 56 * u + i * o.size * 1.2, o));
      const last = lines[lines.length - 1]!;
      if (Math.floor(F / 8) % 2 || n < REQUEST.length) {
        ctx.fillStyle = C.accent;
        ctx.fillRect(
          t.x + pad + 24 * u + measure(ctx, last, o) + 4 * u,
          fy + 56 * u + (lines.length - 1) * o.size * 1.2 - o.size * 0.78,
          3.5 * u,
          o.size * 0.95,
        );
      }
      const done = prog(F, B.type0 + REQUEST.length * B.typeEvery + 4, B.type0 + REQUEST.length * B.typeEvery + 12);
      text(ctx, "45 min · 2 people", t.x + pad, t.y + t.h - 40 * u, { ...monoO(29, BLACK), alpha: done });
    } else if (t.k === 1) {
      // the host, on air, blinking
      text(ctx, "●", t.x + pad, tagY, { ...monoO(29, C.accent) });
      text(ctx, "on air", t.x + pad + 30 * u, tagY, monoO(29, C.muted));
      ctx.save();
      rr(ctx, t.x, t.y, t.w, t.h, 20 * u);
      ctx.clip();
      const id = idle(F),
        up = ease.outCubic(prog(F, B.stamp, B.stamp + 10));
      const R = Math.min(t.w, t.h) * 0.3,
        spin = ease.inOutCubic(prog(F, B.type0, B.stamp - 2));
      drawHost(ctx, env, t.x + t.w / 2, t.y + t.h - 22 * u, R, DOT * 0.85, {
        sy: id.sy,
        sx: id.sx,
        tilt: id.tilt,
        blink: blinkAt(F, [334, 372, 404]),
        look: [Math.sin(F / 20) * 0.6, 0],
        // while Oriel works the hands spin (time passing), then snap up with the stamp
        hands: [lerp(MOOD.rest[0] + spin * 0.4, MOOD.up[0], up), lerp(MOOD.rest[1] + spin * 4.8, MOOD.up[1] + TAU, up)],
        smile: 0.8,
        ring: up * (1 - prog(F, B.stamp + 14, B.stamp + 24)),
        t: F / FPS,
      });
      ctx.restore();
    } else if (t.k === 2) {
      // Mon–Fri availability filling dot by dot
      tag("// availability");
      const days = ["M", "T", "W", "T", "F"],
        rows = 4,
        gx0 = t.x + pad + 20 * u,
        gw = t.w - 2 * pad - 40 * u,
        top = t.y + 108 * u,
        step = Math.min((t.h - 190 * u) / (rows - 1), 58 * u);
      days.forEach((d, i) => {
        const x = gx0 + (i + 0.5) * (gw / 5);
        text(ctx, d, x, top, { ...monoO(29, C.muted), align: "center" });
        for (let r = 0; r < rows; r++) {
          const k = i * rows + r,
            at = B.dots0 + k * B.dotEvery,
            p = spring((F - at) / FPS, { freq: 3.4, damp: 0.6 }),
            y = top + 36 * u + r * step,
            busy = [1, 4, 6, 9, 10, 15, 18].includes(k),
            pick = i === 3 && r === 1;
          ctx.beginPath();
          ctx.arc(x, y, 13 * u, 0, TAU);
          ctx.strokeStyle = C.line;
          ctx.lineWidth = 2.5 * u;
          ctx.stroke();
          if (p > 0) {
            ctx.beginPath();
            ctx.arc(x, y, 13 * u * clamp(p, 0, 1.3), 0, TAU);
            ctx.fillStyle = busy ? C.line : BLACK;
            ctx.fill();
          }
          if (pick) {
            const q = prog(F, B.dots0 + 20 * B.dotEvery + 6, B.dots0 + 20 * B.dotEvery + 14);
            if (q > 0) {
              ctx.beginPath();
              ctx.arc(x, y, 22 * u, -Math.PI / 2, -Math.PI / 2 + TAU * q);
              ctx.strokeStyle = BLACK;
              ctx.lineWidth = 3 * u;
              ctx.stroke();
            }
          }
        }
      });
      const q = prog(F, B.dots0 + 20 * B.dotEvery + 10, B.dots0 + 20 * B.dotEvery + 18);
      text(ctx, "Thu 11:00 · all free", t.x + pad, t.y + t.h - 40 * u, { ...monoO(29, BLACK), alpha: q });
    } else if (t.k === 3) {
      // conflicts 3 → 0
      tag("// conflicts");
      const n = 3 - Math.min(3, Math.max(0, Math.floor((F - B.count0) / 12) + 1) * (F >= B.count0 ? 1 : 0));
      const since = F - (B.count0 + (3 - n - 1) * 12),
        bump = n < 3 ? 1 + 0.12 * Math.exp(-since / 4) * Math.cos(since * 0.6) : 1;
      const big = sans(tall ? 170 : 190, BLACK, 600, -0.05);
      ctx.save();
      const bx = t.x + pad,
        by = t.y + t.h - 96 * u;
      ctx.translate(bx, by);
      ctx.scale(bump, bump);
      text(ctx, String(n), 0, 0, big);
      ctx.restore();
      text(ctx, "Conflicts", t.x + pad + measure(ctx, "0", big) + 26 * u, by - 70 * u, sans(34, BLACK));
      text(
        ctx,
        n === 0 ? "all cleared" : `${n} to move`,
        t.x + pad + measure(ctx, "0", big) + 26 * u,
        by - 26 * u,
        sans(30, C.muted, 400, -0.01),
      );
      text(ctx, "moved 2 · declined 1", t.x + pad, t.y + t.h - 40 * u, {
        ...monoO(29, BLACK),
        alpha: n === 0 ? 1 : 0.35,
      });
    } else if (t.k === 4) {
      // invites 0/4 → 4/4 with ticks
      tag("// invites");
      const names = ["Ana", "Kai", "You", "Room 3B"];
      const sent = names.filter((_, i) => F >= B.inv0 + i * B.invEvery).length;
      const big = sans(tall ? 96 : 110, BLACK, 600, -0.04);
      text(ctx, `${sent}/4`, t.x + pad, t.y + (tall ? 170 : 180) * u, big);
      text(
        ctx,
        "Invites",
        t.x + pad + measure(ctx, "4/4", big) + 22 * u,
        t.y + (tall ? 170 : 180) * u,
        sans(30, C.muted, 400, -0.01),
      );
      const cols = 2,
        cw = (t.w - 2 * pad) / cols;
      names.forEach((nm, i) => {
        const x = t.x + pad + (i % cols) * cw,
          y = t.y + (tall ? 240 : 270) * u + Math.floor(i / cols) * 70 * u,
          at = B.inv0 + i * B.invEvery,
          q = prog(F, at, at + 7);
        ctx.beginPath();
        ctx.arc(x + 22 * u, y, 22 * u, 0, TAU);
        ctx.fillStyle = q > 0 ? BLACK : C.line;
        ctx.fill();
        if (q > 0) check(ctx, x + 22 * u, y, 22 * u * 0.9, q, PAPER, 4 * u);
        text(ctx, nm, x + 54 * u, y + 9 * u, sans(30, BLACK, 600, -0.01));
      });
    } else {
      // hours back: a small bar chart rising
      tag("// hours back");
      const vals = [0.35, 0.6, 0.45, 0.9, 0.7];
      const hrs = 6.5 * ease.outCubic(prog(F, B.bars0, B.bars0 + 30));
      const big = sans(tall ? 96 : 110, BLACK, 600, -0.04);
      text(ctx, `+${hrs.toFixed(1)}`, t.x + pad, t.y + (tall ? 170 : 180) * u, big);
      text(
        ctx,
        "hours",
        t.x + pad + measure(ctx, "+6.5", big) + 20 * u,
        t.y + (tall ? 170 : 180) * u,
        sans(30, C.muted, 400, -0.01),
      );
      const bx0 = t.x + pad,
        bw = t.w - 2 * pad,
        base = t.y + t.h - 34 * u,
        hmax = t.h - (tall ? 250 : 260) * u;
      vals.forEach((v, i) => {
        const p = spring((F - B.bars0 - i * 3) / FPS, { freq: 2.4, damp: 0.7 }),
          w = (bw / 5) * 0.62,
          x = bx0 + i * (bw / 5) + (bw / 5 - w) / 2,
          h = hmax * v * p;
        ctx.fillStyle = i === 3 ? BLACK : "#b9b7b1";
        ctx.fillRect(x, base - h, w, h);
      });
      ctx.fillStyle = C.line;
      ctx.fillRect(bx0, base, bw, 2 * u);
    }
  };

  // ================================================================ 05 FLOW (450–540)
  const flow = (ctx: Ctx, env: Env, F: number) => {
    ctx.fillStyle = BLACK;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    push(ctx, F, T.flow, T.end, 0.035);
    const f = F - T.flow,
      id = idle(F);
    const [gx, gy, R] = tall ? [540 * u, 1590 * u, 270 * u] : [1450 * u, 960 * u, 215 * u];
    const ringing = prog(f, 20, 26);
    drawHost(
      ctx,
      env,
      gx,
      gy,
      R,
      DOT,
      {
        sy: id.sy,
        sx: id.sx,
        tilt: id.tilt + 0.03 * ringing * Math.sin(F * 1.7),
        hands: MOOD.up,
        smile: 1,
        blink: blinkAt(F, [505]),
        ring: ringing,
        t: F / FPS,
        look: [-0.6, -0.3],
        shadow: 0,
      },
      { lines: C.ground },
    );
    const x = tall ? S.x + 20 * u : 150 * u,
      y = tall ? 520 * u : 470 * u,
      size = tall ? 128 : 150;
    head(ctx, F, {
      x,
      y,
      size,
      color: C.ground,
      keyColor: C.ground,
      under: [T.flow + 22, T.flow + 38],
      lines: [
        [
          { t: "You", at: T.flow + 4 },
          { t: "decide.", at: T.flow + 12, key: true },
        ],
      ],
    });
    head(ctx, F, {
      x,
      y: y + size * u * (tall ? 1.25 : 1.3),
      size,
      color: C.muted,
      lines: [
        [
          { t: "We", at: T.flow + 36 },
          { t: "arrange.", at: T.flow + 40 },
        ],
      ],
    });
    ctx.restore();
  };

  // ================================================================ END CARD (540–600)
  const endCard = (ctx: Ctx, env: Env, F: number) => {
    ctx.fillStyle = C.ground;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    push(ctx, F, T.end, N, 0.03);
    const f = F - T.end;
    // the wordmark's i is dotless: the host, peeking over the letters, is its dot
    const WORD = "Or\u0131el",
      wm = { size: (tall ? 310 : 330) * u, family: F_.serif, weight: 400, color: BLACK, track: -0.02 },
      base = tall ? 1010 * u : 620 * u,
      ww = measure(ctx, WORD, wm),
      ix = cx - ww / 2 + measure(ctx, "Or", wm) + wm.track * wm.size + measure(ctx, "\u0131", wm) / 2;
    const rise = ease.outBack(clamp(f / 12), 1.3),
      R = (tall ? 108 : 118) * u,
      clipY = base - wm.size * 0.43;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, clipY);
    ctx.clip();
    drawHost(ctx, env, ix, clipY + R * 0.5 + (1 - rise) * R * 2.2, R, DOT * 0.9, {
      wink: prog(f, 26, 30) * (1 - prog(f, 44, 48)),
      smile: 1,
      hands: MOOD.up,
      tilt: 0.06 * Math.sin((F / 40) * TAU),
      shadow: 0,
      look: [0, -0.3],
    });
    ctx.restore();
    // the wordmark is there on the cut (a hard cut never lands on an empty page) and settles from a touch large
    const a = spring(f / FPS, { freq: 2.6, damp: 0.7 }),
      k = 1.1 - 0.1 * a;
    ctx.save();
    ctx.translate(cx, base - wm.size * 0.3);
    ctx.scale(k, k);
    ctx.translate(-cx, -(base - wm.size * 0.3));
    text(ctx, WORD, cx, base, { ...wm, align: "center" });
    ctx.restore();
    // tagline, CTA, footer
    head(ctx, F, {
      x: cx,
      y: base + (tall ? 120 : 110) * u,
      size: tall ? 40 : 40,
      color: BLACK,
      align: "center",
      keyScale: 1.35,
      under: [T.end + 20, T.end + 34],
      lines: [
        [
          { t: "The", at: T.end + 8 },
          { t: "calendar", at: T.end + 9 },
          { t: "that", at: T.end + 10 },
          { t: "meets", at: T.end + 11 },
          { t: "you", at: T.end + 12 },
          { t: "halfway.", at: T.end + 14, key: true },
        ],
      ],
    });
    const cp = spring((f - 18) / FPS, { freq: 2.8, damp: 0.7 });
    if (cp > 0) {
      const po = sans(30, PAPER, 600, -0.01),
        pw = measure(ctx, "Start free", po) + 64 * u,
        phh = 68 * u,
        uo = monoO(24, C.muted),
        uw = measure(ctx, "oriel.example", uo);
      ctx.save();
      ctx.globalAlpha = clamp(cp * 1.6);
      ctx.translate(0, (1 - cp) * 24 * u);
      let px: number, py: number, ux: number, uy: number;
      if (tall) {
        px = cx - pw / 2;
        py = base + 200 * u;
        ux = cx - uw / 2;
        uy = py + phh + 60 * u;
      } else {
        const total = pw + 30 * u + uw;
        px = cx - total / 2;
        py = base + 180 * u;
        ux = px + pw + 30 * u;
        uy = py + phh / 2 + 8 * u;
      }
      card(ctx, px, py, pw, phh, { r: phh / 2, fill: C.accent });
      text(ctx, "Start free", px + pw / 2, py + phh / 2 + 10 * u, { ...po, align: "center" });
      text(ctx, "oriel.example", ux, uy, uo);
      ctx.restore();
    }
    text(ctx, "free to start · any calendar · no install", cx, H - S.bottom - 6 * u, {
      ...monoO(22, C.muted),
      align: "center",
      alpha: prog(f, 24, 36),
    });
    ctx.restore();
  };

  const paint = (ctx: Ctx, env: Env, F: number) => {
    F = clamp(F, 0, N - 1);
    ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
    if (F < T.problem) hook(ctx, env, F);
    else if (F < T.product) problem(ctx, env, F);
    else if (F < T.slam) product(ctx, env, F);
    else if (F < T.handled) slam(ctx, F);
    else if (F < T.flow) handled(ctx, env, F);
    else if (F < T.end) flow(ctx, env, F);
    else endCard(ctx, env, F);
  };
  const cuts = [0, T.problem, T.product, T.slam, T.handled, T.flow, T.end, N],
    names = ["hook", "problem", "product", "slam", "handled", "flow", "signoff"];
  // The one blurred moment. The word moves up to ~1600 px inside a one-frame shutter, far too far for sampled
  // motion blur (it shows ghost copies), so the smear is analytic: the sharp frame is box-filtered along x by
  // exactly the distance moved in the shutter, as log2(L) doubling passes (2^n copies ≤ 1.5 px apart).
  // The ground is opaque black, so each 50/50 pass is a true average.
  const smear = (ctx: Ctx, env: Env, F: number) => {
    const L = Math.abs(slamDx(F + 0.5) - slamDx(Math.max(T.slam, F - 0.5))) * env.scale;
    let cur = scratch(env, "a"),
      nxt = scratch(env, "b");
    cur.ctx.setTransform(1, 0, 0, 1, 0, 0);
    cur.ctx.globalAlpha = 1;
    paint(cur.ctx, env, F);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = BLACK;
    ctx.fillRect(0, 0, W * env.scale, H * env.scale);
    if (L < 1.5) {
      ctx.drawImage(cur.canvas, 0, 0);
      ctx.restore();
      return;
    }
    const n = Math.ceil(Math.log2(L / 1.5)),
      step = L / 2 ** n;
    for (let i = 0; i < n; i++) {
      const c = nxt.ctx;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.globalAlpha = 1;
      c.fillStyle = BLACK;
      c.fillRect(0, 0, W * env.scale, H * env.scale);
      c.drawImage(cur.canvas, 0, 0);
      c.globalAlpha = 0.5;
      c.drawImage(cur.canvas, step * 2 ** i, 0);
      [cur, nxt] = [nxt, cur];
    }
    ctx.drawImage(cur.canvas, -(L - step) / 2, 0);
    ctx.restore();
  };
  const shots: Shot[] = names.map((sid, i) => ({
    id: sid,
    start: cuts[i]!,
    end: cuts[i + 1]!,
    draw: (ctx, local, env) => {
      const F = cuts[i]! + local;
      if (sid === "slam") smear(ctx, env, F);
      else paint(ctx, env, F);
      ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
      chrome(ctx, F);
    },
  }));

  // ---- sound: drums enter at the first flip; hits on the hard flips and the stamp; ticks for the small things
  const typed = Array.from({ length: REQUEST.length }, (_, i) => Math.round(B.type0 + (i + 1) * B.typeEvery)).filter(
    (_, i) => i % 2 === 0,
  );
  const dots = Array.from({ length: 20 }, (_, k) => Math.round(B.dots0 + k * B.dotEvery));
  return {
    meta: { title: id, W, H, fps: FPS, bpm: BPM, durationFrames: N, raster: "cpu" },
    assets: { images: {}, fonts: P.assets },
    shots,
    audio: beatScore({
      frames: N,
      fps: FPS,
      bpm: BPM,
      mood: "drive",
      drop: T.problem,
      hits: [T.problem, T.product, T.slam, T.handled, B.stamp, T.flow],
      whooshes: [T.slam + 8],
      ticks: [
        27,
        47,
        T.problem + 15,
        T.problem + 30,
        T.problem + 45,
        ...typed,
        ...dots,
        ...[0, 1, 2, 3].map((i) => B.inv0 + i * B.invEvery),
      ],
      sign: T.end + 4,
    }),
  };
}

export const halftoneHost = make("landscape", "halftoneHost");
export const halftoneHostVertical = make("vertical", "halftoneHostVertical");
