// STUDY 57 · FROST (4 s, 60 fps, a seamless loop). A SECONDS piece: no words, the style is the whole piece.
// Glassmorphism done properly: three frosted-glass panes float and drift in depth over a living field of five
// colour orbs. Each pane shows what is behind it blurred and slightly refracted, with a 1 px edge light, an inner
// glow, a faint grain and a soft shadow on whatever lies beneath; where panes overlap the blur compounds. On the
// bar-2 downbeat the front pane tilts to camera in perspective and a light streak crosses it.
// One source, designed for square (the hero) and vertical (the panes re-stack down the tall frame).
// Brief: series/studies/briefs/frost.json · prompt: series/studies/prompts/frost.prompt.md
// Learns from Glassmorphism, the frosted-glass interface style (https://en.wikipedia.org/wiki/Glassmorphism).
//
// Glass is what it does to what is behind it. The scene is painted into an offscreen layer back to front; before
// each pane is laid down, the layer as it stands is read back into a chain of small canvases (halved down to 1/32,
// then doubled back up to 1/4, so the scale-up never shows bilinear diamonds) and that blurred copy is drawn back
// inside the pane's clip, magnified a little about its centre (refraction: the image bends toward the edge) and
// more in a thin rim band (the glass's thickness). A nearer pane reads back the farther panes too, so the blur
// compounds. No ctx.filter. Everything is a closed-form function of t = frame/240: orbs and panes move on
// sin/cos paths with whole-number frequencies, and every envelope (tilt, streak, flare, pulses) is windowed to
// exactly zero or wraps round the loop, so frame 240 is frame 0.
import PACK from "../../../brand/packs/studio/pack.json";
import { rng, type Ctx, type Env, type Layer } from "../core";
import type { Film, Shot } from "../film";
import { bezier, ease, lerp, prog, spring } from "../kit/motion";
import { usePack } from "../kit/pack";
import { beatScore } from "../kit/score";
import { layout, type Size } from "../kit/sizes";

const P = usePack(PACK),
  C = P.palette("frost");
const FPS = 60,
  BPM = 120,
  N = 240, // two bars: a beat is 30 frames, bar 2's downbeat is frame 120
  TAU = Math.PI * 2;
// the story, in frames (each on the beat grid)
const T = { drift: 0, pre: 60, hit: 120, settle: 150, echo: 180 };

// ---- colour: every hue is a pack role; the brief's "deep violet" has no role, so it is mixed from two of them
type RGB = [number, number, number];
const rgb = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a: RGB, b: RGB, t: number): RGB => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const css = (c: RGB, a = 1) => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`;
const GROUND = rgb(C.ground),
  DEEP = rgb(C.deep!),
  WHITE = rgb(C.ink),
  VIOLET = mix(mix(rgb(C.s2!), rgb(C.accent), 0.3), GROUND, 0.42); // periwinkle warmed toward pink, then deepened

// ---- time
/** frames from F to the nearest frame `at`, measured round the loop */
const wrapDist = (F: number, at: number) => {
  const d = (((F - at) % N) + N) % N;
  return Math.min(d, N - d);
};
const pulse = (F: number, at: number, w: number) => Math.exp(-((wrapDist(F, at) / w) ** 2));
const RELEASE = bezier(0.5, 0, 0.3, 1);
/** the front pane's tilt: a small lean away, a spring that peaks on the downbeat, a slow ease back (0 before 92
 *  and from 228, so the loop meets itself untouched) */
const tilt = (F: number) => {
  if (F < 92 || F >= 228) return 0;
  const lean = -0.14 * Math.sin(Math.PI * prog(F, 92, 112)) ** 2;
  // spring step from 107: its first peak lands on frame 120
  const snap = spring((F - 107) / FPS, { freq: 2.6, damp: 0.5 });
  // the release starts while the spring still rings, so the half second after the hit keeps moving
  // and it swings a little past rest on the way back (a small negative lobe round frame 193)
  const swing = -0.1 * Math.sin(Math.PI * prog(F, 165, 222)) ** 2;
  return (lean + snap) * (1 - RELEASE(prog(F, 128, 226))) + swing;
};
/** the impact on the downbeat: a near-instant rise and a soft decay, windowed to 0 well before the wrap */
const punch = (F: number) => {
  const d = (F - T.hit + 1) / FPS; // one frame early, so frame 120 itself carries the hit
  return d > 0 ? (1 - Math.exp(-d * 45)) * Math.exp(-d * 5) * (1 - ease.inOutCubic(prog(F, 170, 222))) : 0;
};
/** the beat-3 pre-pulse: the front pane dips and its edge catches the light (sets the hit up) */
const prePulse = (F: number) => {
  const d = (F - T.pre + 1) / FPS;
  return d > 0 ? (1 - Math.exp(-d * 40)) * Math.exp(-d * 9) * (1 - ease.inOutCubic(prog(F, 84, 104))) : 0;
};
const sine01 = (x: number) => 0.5 - 0.5 * Math.cos(Math.PI * x);
/** frame 0's landing: the whole stack answers the loop point */
const land = (F: number) => pulse(F, 0, 6);
/** beat 3 of bar 2: the middle pane's answer to the hit */
const echo = (F: number) => pulse(F, T.echo, 8);

type Orb = {
  c: RGB;
  r: number;
  x: number;
  y: number;
  ax: number;
  ay: number;
  kx: number;
  ky: number;
  px: number;
  py: number;
};
type Pane = {
  w: number;
  h: number;
  r: number;
  x: number;
  y: number;
  z: number; // depth 0 (far) .. 1 (near); fixed ranges, so the order never changes
  ph: number; // phase of its drift
};

export function make(size: Size, id: string): Film {
  const L = layout(size),
    { W, H, u } = L,
    tall = L.tall;
  const F0 = 1400 * u; // focal length for the perspective tilt

  // ---- per-size design. Square: a loose cluster round the centre, the front pane low and wide. Vertical: the
  // panes re-stack as layered glass down the frame (the tall pill above and behind, the hero a little high, the
  // wide back pane half behind it), orbs fill the extra field above and below, and every pane stays clear of the
  // feed's 220 px top and 320 px bottom bands.
  const orbs: Orb[] = tall
    ? [
        { c: VIOLET, r: 330, x: 800, y: 1450, ax: 110, ay: 120, kx: 1, ky: 1, px: 0, py: 1.6 },
        { c: rgb(C.s2!), r: 270, x: 240, y: 1240, ax: 90, ay: 160, kx: 1, ky: 1, px: 2, py: 3.6 },
        { c: rgb(C.accent), r: 290, x: 300, y: 380, ax: 120, ay: 120, kx: 1, ky: 1, px: 4.2, py: 5.6 },
        { c: rgb(C.accent2), r: 210, x: 760, y: 840, ax: 100, ay: 240, kx: -1, ky: 1, px: 1.1, py: 2.8 },
        { c: rgb(C.s1!), r: 150, x: 560, y: 900, ax: 200, ay: 190, kx: 1, ky: 2, px: 0.4, py: 4.4 },
      ]
    : [
        { c: VIOLET, r: 310, x: 850, y: 870, ax: 90, ay: 70, kx: 1, ky: 1, px: 0, py: 1.6 },
        { c: rgb(C.s2!), r: 250, x: 220, y: 820, ax: 80, ay: 110, kx: 1, ky: 1, px: 2, py: 3.6 },
        { c: rgb(C.accent), r: 225, x: 320, y: 290, ax: 110, ay: 80, kx: 1, ky: 1, px: 4.2, py: 5.6 },
        { c: rgb(C.accent2), r: 190, x: 830, y: 270, ax: 90, ay: 120, kx: -1, ky: 1, px: 1.1, py: 2.8 },
        { c: rgb(C.s1!), r: 140, x: 590, y: 620, ax: 210, ay: 120, kx: 1, ky: 2, px: 0.4, py: 4.4 },
      ];
  for (const o of orbs) for (const k of ["r", "x", "y", "ax", "ay"] as const) o[k] *= u;
  const panes: Pane[] = (
    tall
      ? [
          { w: 640, h: 500, r: 28, x: 430, y: 1060, z: 0.1, ph: 0.15 },
          { w: 380, h: 620, r: 92, x: 745, y: 640, z: 0.5, ph: 0.55 },
          { w: 660, h: 400, r: 52, x: 540, y: 880, z: 0.9, ph: 0.8 },
        ]
      : [
          { w: 560, h: 420, r: 26, x: 400, y: 400, z: 0.1, ph: 0.15 },
          { w: 340, h: 500, r: 86, x: 765, y: 470, z: 0.5, ph: 0.55 },
          { w: 600, h: 350, r: 48, x: 520, y: 690, z: 0.9, ph: 0.8 },
        ]
  ).map((p) => ({ ...p, w: p.w * u, h: p.h * u, r: p.r * u, x: p.x * u, y: p.y * u }));
  const front = panes[2]!,
    CX = front.x,
    CY = tall ? 860 * u : 560 * u,
    GLINT = tall ? 2 : 1; // the pane whose rim lands frame 0 (the vertical's hero, clear of the top band) // the camera's push centres on the cluster, a touch above the hero

  // ---- layers (cached per device size): the scene, the blur chain and a seeded grain tile
  const dims = (env: Env) => [Math.round(W * env.scale), Math.round(H * env.scale)] as const;
  const layer = (env: Env, name: string, w: number, h: number) => {
    const key = `frost:${name}:${w}x${h}`;
    let lay = env.cache.get(key) as Layer | undefined;
    if (!lay) {
      lay = env.canvas(w, h);
      env.cache.set(key, lay);
    }
    return lay;
  };
  const grain = (env: Env): Layer => {
    const key = `frost:grain`;
    let lay = env.cache.get(key) as Layer | undefined;
    if (lay) return lay;
    const S = 160;
    lay = env.canvas(S, S);
    const img = lay.ctx.createImageData(S, S),
      q = rng(5757);
    for (let i = 0; i < S * S; i++) {
      const v = q(),
        light = v > 0.5;
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = light ? 255 : 0;
      img.data[i * 4 + 3] = Math.round(Math.abs(v - 0.5) * 2 * 255);
    }
    lay.ctx.putImageData(img, 0, 0);
    env.cache.set(key, lay);
    return lay;
  };
  // read the scene back and blur it: halve down to 1/32, double back up to 1/4 (each step bilinear, smooth)
  const LEVELS = [4, 8, 16, 32];
  const blur = (env: Env, scene: Layer): Layer => {
    const [w, h] = dims(env);
    const down = LEVELS.map((d) => layer(env, `d${d}`, Math.ceil(w / d), Math.ceil(h / d))),
      up = LEVELS.slice(0, -1).map((d) => layer(env, `u${d}`, Math.ceil(w / d), Math.ceil(h / d)));
    let src: Layer = scene;
    const step = (dst: Layer) => {
      const c = dst.ctx;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.globalAlpha = 1;
      c.globalCompositeOperation = "copy";
      c.imageSmoothingEnabled = true;
      c.imageSmoothingQuality = "high";
      c.drawImage(src.canvas, 0, 0, src.canvas.width, src.canvas.height, 0, 0, dst.canvas.width, dst.canvas.height);
      c.globalCompositeOperation = "source-over";
      src = dst;
    };
    for (const d of down) step(d);
    for (let i = up.length - 1; i >= 0; i--) step(up[i]!);
    return src;
  };

  // ---- pane geometry: the rounded rectangle sampled as points, rotated about its centre and projected
  type Geo = {
    pts: number[]; // projected outline, x/y pairs (logical px)
    cx: number;
    cy: number;
    proj: (x: number, y: number) => [number, number];
    tl: [number, number];
    br: [number, number];
    p: Pane;
    lift: number;
    s: number;
  };
  const ARC = 14;
  const outline = (w: number, h: number, r: number, proj: Geo["proj"]) => {
    const out: number[] = [],
      cs: [number, number, number][] = [
        [-w / 2 + r, -h / 2 + r, Math.PI],
        [w / 2 - r, -h / 2 + r, Math.PI * 1.5],
        [w / 2 - r, h / 2 - r, 0],
        [-w / 2 + r, h / 2 - r, Math.PI * 0.5],
      ];
    for (const [ox, oy, a0] of cs)
      for (let i = 0; i <= ARC; i++) {
        const a = a0 + (i / ARC) * Math.PI * 0.5,
          [X, Y] = proj(ox + r * Math.cos(a), oy + r * Math.sin(a));
        out.push(X, Y);
      }
    return out;
  };
  const geo = (p: Pane, F: number, t: number, front: boolean): Geo => {
    const a = TAU * (t + p.ph);
    // drift: a closed figure per pane, parallax from a shared sway (nearer panes swing farther), and a slow
    // breathing in depth (scale) out of phase between panes
    const sway = 0.25 + p.z;
    let x = p.x + 16 * u * Math.sin(a) + 20 * u * sway * Math.sin(TAU * t),
      y = p.y + 12 * u * Math.sin(2 * a + 0.7) + 12 * u * sway * Math.cos(TAU * t);
    let s = 1 + 0.035 * Math.sin(a + 1.9);
    let ax = 0.05 * Math.sin(a + 0.4),
      ay = 0.06 * Math.cos(a),
      lift = 0;
    if (front) {
      const k = tilt(F),
        pre = prePulse(F);
      ax += 0.2 * k - 0.1 * pre;
      ay += 0.5 * k - 0.12 * pre;
      lift = -220 * u * k + 60 * u * pre; // toward camera on the hit; a small dip on the pre-pulse
      x += 14 * u * k;
      y -= 10 * u * k;
    } else {
      // the panes behind give way as the front one rises: a small counter-parallax on the hit
      const kick = punch(F);
      y += 10 * u * kick * (1 - p.z);
      s *= 1 - 0.01 * kick;
    }
    const ca = Math.cos(ax),
      sa = Math.sin(ax),
      cb = Math.cos(ay),
      sb = Math.sin(ay);
    const proj = (lx: number, ly: number): [number, number] => {
      const x1 = lx * cb,
        z1 = lx * sb,
        y2 = ly * ca - z1 * sa,
        z2 = ly * sa + z1 * ca + lift,
        k = (F0 / (F0 + z2)) * s;
      return [x + x1 * k, y + y2 * k];
    };
    return {
      pts: outline(p.w, p.h, p.r, proj),
      cx: x,
      cy: y,
      proj,
      tl: proj(-p.w / 2, -p.h / 2),
      br: proj(p.w / 2, p.h / 2),
      p,
      lift,
      s,
    };
  };
  const trace = (c: Ctx, pts: number[]) => {
    c.moveTo(pts[0]!, pts[1]!);
    for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i]!, pts[i + 1]!);
    c.closePath();
  };

  // ---- the living field: a deep ground and five orbs, each a soft halo round a glossy core
  const field = (c: Ctx, t: number, F: number) => {
    const swell = 0.15 * punch(F); // the orbs brighten on the downbeat, so the whole frame answers the hit
    const g = c.createLinearGradient(0, 0, W * 0.3, H);
    g.addColorStop(0, css(mix(GROUND, VIOLET, 0.22)));
    g.addColorStop(0.55, css(GROUND));
    g.addColorStop(1, css(DEEP));
    c.fillStyle = g;
    c.fillRect(-W * 0.1, -H * 0.1, W * 1.2, H * 1.2);
    const at = orbs.map((o, i) => {
      const x = o.x + o.ax * Math.sin(TAU * o.kx * t + o.px),
        y = o.y + o.ay * Math.sin(TAU * o.ky * t + o.py),
        r = o.r * (1 + 0.05 * Math.sin(TAU * t + i * 1.7));
      return { o, x, y, r };
    });
    c.globalCompositeOperation = "screen";
    for (const { o, x, y, r } of at) {
      const h = c.createRadialGradient(x, y, 0, x, y, r * 2);
      h.addColorStop(0, css(o.c, 0.22));
      h.addColorStop(0.45, css(o.c, 0.08));
      h.addColorStop(1, css(o.c, 0));
      c.fillStyle = h;
      c.fillRect(x - r * 2, y - r * 2, r * 4, r * 4);
    }
    c.globalCompositeOperation = "source-over";
    for (const { o, x, y, r } of at) {
      const k = c.createRadialGradient(x - r * 0.32, y - r * 0.38, 0, x, y, r);
      const oc = mix(o.c, WHITE, swell);
      k.addColorStop(0, css(mix(oc, WHITE, 0.38)));
      k.addColorStop(0.5, css(oc));
      k.addColorStop(0.95, css(mix(oc, DEEP, 0.3)));
      k.addColorStop(1, css(mix(o.c, DEEP, 0.36), 0));
      c.fillStyle = k;
      c.beginPath();
      c.arc(x, y, r, 0, TAU);
      c.fill();
    }
  };

  // ---- one pane of glass, laid over the scene as it stands
  const glass = (
    sc: Ctx,
    env: Env,
    g: Geo,
    back: Layer,
    m: { S: number; ox: number; oy: number },
    F: number,
    i: number,
  ) => {
    const [w, h] = dims(env),
      { p } = g,
      depth = p.z - g.lift / (200 * u);
    const kick = i === 2 ? punch(F) : 0,
      pre = i === 2 ? prePulse(F) : 0,
      k = i === 2 ? Math.max(0, tilt(F)) : 0;
    // the shadow on whatever lies beneath (its fill is covered by the glass; only the blur spills out)
    sc.save();
    sc.shadowColor = css(DEEP, 0.3 + 0.14 * p.z);
    sc.shadowBlur = (34 + 50 * depth) * u * m.S;
    sc.shadowOffsetY = (14 + 34 * depth) * u * m.S;
    sc.shadowOffsetX = 6 * depth * u * m.S;
    sc.fillStyle = css(DEEP);
    sc.beginPath();
    trace(sc, g.pts);
    sc.fill();
    sc.restore();

    // the backdrop, blurred and refracted: magnified about the pane's centre in device space
    const dcx = m.S * g.cx + m.ox,
      dcy = m.S * g.cy + m.oy;
    // the interior is painted on its own layer, then masked by the pane's shape; all of it inside the pane's
    // whole-pixel bounding box (a rectangle clip on pixel edges is exact, and it keeps the work to the pane)
    let x0 = Infinity,
      y0 = Infinity,
      x1 = -Infinity,
      y1 = -Infinity;
    for (let j = 0; j < g.pts.length; j += 2) {
      const X = m.S * g.pts[j]! + m.ox,
        Y = m.S * g.pts[j + 1]! + m.oy;
      x0 = Math.min(x0, X);
      x1 = Math.max(x1, X);
      y0 = Math.min(y0, Y);
      y1 = Math.max(y1, Y);
    }
    x0 = Math.max(0, Math.floor(x0) - 3);
    y0 = Math.max(0, Math.floor(y0) - 3);
    x1 = Math.min(w, Math.ceil(x1) + 3);
    y1 = Math.min(h, Math.ceil(y1) + 3);
    const bw = x1 - x0,
      bh = y1 - y0;
    if (bw <= 0 || bh <= 0) return;
    const lay = layer(env, "pane", w, h),
      c = lay.ctx;
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = 1;
    c.globalCompositeOperation = "source-over";
    c.clearRect(x0, y0, bw, bh);
    c.beginPath();
    c.rect(x0, y0, bw, bh);
    c.clip();
    const backdrop = (mag: number, alpha = 1, op: GlobalCompositeOperation = "source-over") => {
      c.setTransform(mag, 0, 0, mag, dcx * (1 - mag), dcy * (1 - mag));
      c.globalAlpha = alpha;
      c.globalCompositeOperation = op;
      c.drawImage(back.canvas, 0, 0, back.canvas.width, back.canvas.height, 0, 0, w, h);
      c.globalAlpha = 1;
      c.globalCompositeOperation = "source-over";
    };
    const logical = () => c.setTransform(m.S, 0, 0, m.S, m.ox, m.oy);
    c.imageSmoothingEnabled = true;
    c.imageSmoothingQuality = "high";
    backdrop(1.06);
    // more colour, not more white: the orbs tint the frost (like a saturate() on the backdrop)
    backdrop(1.06, 0.5, "overlay");
    backdrop(1.06, 0.18, "screen");
    // the rim: the glass's thickness bends the image harder toward the edge, in two graded bands. Each band is a
    // wide stroke of the outline (the pane mask keeps its inner half) painted with the backdrop as a pattern, so its
    // inner boundary is antialiased; a clip there would show stair-steps on a tilted pane
    const toUser = new DOMMatrix([m.S, 0, 0, m.S, m.ox, m.oy]).inverse();
    for (const [band, mag] of [
      [9, 1.1],
      [4, 1.16],
    ] as const) {
      const pat = c.createPattern(back.canvas as CanvasImageSource, "no-repeat");
      if (!pat) continue;
      pat.setTransform(
        toUser.multiply(
          new DOMMatrix([
            (mag * w) / back.canvas.width,
            0,
            0,
            (mag * h) / back.canvas.height,
            dcx * (1 - mag),
            dcy * (1 - mag),
          ]),
        ),
      );
      logical();
      c.lineJoin = "round";
      c.lineWidth = 2 * band * u;
      c.beginPath();
      trace(c, g.pts);
      c.strokeStyle = pat;
      c.stroke();
      c.strokeStyle = css(WHITE, 0.03);
      c.stroke();
    }
    logical();
    // the frost itself: a milky lift, brighter toward the light (top left), more when the pane faces it
    const [tx, ty] = g.tl,
      [bx, by] = g.br;
    const sheen = c.createLinearGradient(tx, ty, bx, by);
    sheen.addColorStop(
      0,
      css(WHITE, (tall ? 0.13 : 0.1) + 0.08 * k + 0.06 * kick + 0.1 * land(F) + (i === 1 ? 0.06 * echo(F) : 0)),
    );
    sheen.addColorStop(0.5, css(WHITE, 0.03 + 0.04 * k));
    sheen.addColorStop(1, css(WHITE, 0));
    c.fillStyle = sheen;
    c.fillRect(g.cx - p.w, g.cy - p.h, p.w * 2, p.h * 2);
    // grain on the glass, riding with the pane
    const pat = c.createPattern(grain(env).canvas as CanvasImageSource, "repeat");
    if (pat) {
      pat.setTransform(new DOMMatrix([g.s, 0, 0, g.s, g.cx, g.cy]));
      c.globalAlpha = 0.07;
      c.fillStyle = pat;
      c.fillRect(g.cx - p.w, g.cy - p.h, p.w * 2, p.h * 2);
      c.globalAlpha = 1;
    }
    // inner glow: soft bands of light just inside the edge (the mask keeps the inner half of each stroke)
    const glow = c.createLinearGradient(tx, ty, bx, by);
    glow.addColorStop(0, css(WHITE, 1));
    glow.addColorStop(1, css(WHITE, 0.25));
    c.strokeStyle = glow;
    c.lineJoin = "round";
    for (const [lw, a] of [
      [64, 0.015],
      [38, 0.021],
      [20, 0.027],
      [8, 0.036],
    ] as const) {
      c.lineWidth = lw * u;
      c.globalAlpha = a * (1 + 0.6 * k);
      c.beginPath();
      trace(c, g.pts);
      c.stroke();
    }
    c.globalAlpha = 1;
    if (i === 2) {
      streak(c, g, prog(F, 105, 135), 1);
      streak(c, g, prog(F, 50, 70), 0.38); // beat 3: a faint, quicker pass that sets the hit up
    }
    if (i === 1) streak(c, g, prog(F, 168, 192), 0.5); // bar 2, beat 3: the middle pane echoes the hit
    if (i === GLINT) glint(c, g, F, "inside");
    // the pane's shape cuts the interior out with an antialiased fill (a ctx.clip() would alias a tilted edge)
    logical();
    c.globalCompositeOperation = "destination-in";
    c.fillStyle = css(DEEP);
    c.beginPath();
    trace(c, g.pts);
    c.fill();
    c.globalCompositeOperation = "source-over";
    c.restore();
    sc.save();
    sc.setTransform(1, 0, 0, 1, 0, 0);
    sc.globalAlpha = 1;
    sc.drawImage(lay.canvas, x0, y0, bw, bh, x0, y0, bw, bh);
    sc.restore();

    // the edge: 1 px of light on the top-left, a darker line bottom-right
    sc.setTransform(m.S, 0, 0, m.S, m.ox, m.oy);
    const e =
      1 +
      1.6 * kick +
      1.6 * pre +
      0.5 * k +
      1.1 * land(F) +
      (i === GLINT ? 0.8 * land(F) : 0) +
      (i === 1 ? 1.2 * echo(F) : 0);
    const edge = sc.createLinearGradient(tx, ty, bx, by);
    edge.addColorStop(0, css(WHITE, Math.min(1, 0.7 * e)));
    edge.addColorStop(0.4, css(WHITE, Math.min(1, 0.2 * e)));
    edge.addColorStop(0.7, css(WHITE, 0.18)); // never 0: the edge reads all the way round
    edge.addColorStop(1, css(DEEP, 0.45));
    sc.beginPath();
    trace(sc, g.pts);
    sc.strokeStyle = edge;
    sc.lineWidth = 1.4 * u;
    sc.stroke();
    if (i === GLINT) glint(sc, g, F, "edge");
  };

  // the light streak: a wide soft band round a brighter core, swept TL → BR in the pane's own (tilted) plane,
  // centred on the front pane at the downbeat
  const streak = (c: Ctx, g: Geo, q: number, gain: number) => {
    if (q <= 0 || q >= 1) return;
    const { p } = g,
      th = 0.62,
      dx = Math.cos(th),
      dy = Math.sin(th),
      ex = -dy,
      ey = dx,
      E = (p.w / 2) * dx + (p.h / 2) * dy, // centre to the far corner, along the sweep
      D = E + 40 * u,
      s = lerp(-D, D, sine01(q)),
      // brightest mid-pane and dark by the time the band reaches a corner, so it never exits as a sliver
      I = gain * Math.sin(Math.PI * q) ** 2 * Math.max(0, 1 - (s / E) ** 2) ** 3,
      Lh = p.w + p.h;
    c.globalCompositeOperation = "screen";
    for (const [off, bw, a] of [
      [0, 120, 0.2],
      [0, 36, 0.35],
    ] as const) {
      const cx = (s + off * u) * dx,
        cy = (s + off * u) * dy,
        b = bw * u;
      const corner = (sd: number, se: number) =>
        g.proj(cx + dx * b * sd + ex * Lh * se, cy + dy * b * sd + ey * Lh * se);
      const [ax, ay] = g.proj(cx - dx * b, cy - dy * b),
        [bx, by] = g.proj(cx + dx * b, cy + dy * b);
      const grad = c.createLinearGradient(ax, ay, bx, by);
      grad.addColorStop(0, css(WHITE, 0));
      grad.addColorStop(0.5, css(WHITE, a * I));
      grad.addColorStop(1, css(WHITE, 0));
      c.fillStyle = grad;
      c.beginPath();
      const pts = [corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)];
      c.moveTo(pts[0]![0], pts[0]![1]);
      for (const [x, y] of pts.slice(1)) c.lineTo(x, y);
      c.closePath();
      c.fill();
    }
    c.globalCompositeOperation = "source-over";
  };

  // frame 0's accent: a glint slides along a pane's top edge and flares exactly on the loop point
  const glint = (c: Ctx, g: Geo, F: number, where: "inside" | "edge") => {
    const d = ((((F + N / 2) % N) + N) % N) - N / 2; // signed frames from 0, round the loop
    if (Math.abs(d) > 40) return;
    const I = pulse(F, 0, 9) * 0.85 + 0.15 * Math.cos((Math.PI * d) / 80) ** 2,
      { p } = g,
      along = lerp(-p.w / 2 + p.r * 0.6, p.w / 2 - p.r * 0.6, 0.5 + d / 80),
      [gx, gy] = g.proj(along, -p.h / 2);
    const R = (where === "edge" ? 300 : 240) * u,
      rg = c.createRadialGradient(gx, gy, 0, gx, gy, R);
    rg.addColorStop(0, css(WHITE, (where === "edge" ? 1 : 0.6) * I));
    rg.addColorStop(0.35, css(WHITE, (where === "edge" ? 0.6 : 0.14) * I));
    rg.addColorStop(1, css(WHITE, 0));
    c.globalCompositeOperation = "screen";
    if (where === "edge") {
      c.strokeStyle = rg;
      c.lineWidth = 2.6 * u;
      c.beginPath();
      trace(c, g.pts);
      c.stroke();
      // the specular hot spot where the light meets the rim
      const hs = 80 * u * (0.6 + 0.4 * I),
        hg = c.createRadialGradient(gx, gy, 0, gx, gy, hs);
      hg.addColorStop(0, css(WHITE, I));
      hg.addColorStop(1, css(WHITE, 0));
      // drawn as a wide stroke along the outline, so the light hugs the rim instead of floating off it
      c.strokeStyle = hg;
      c.lineWidth = 24 * u;
      c.beginPath();
      trace(c, g.pts);
      c.stroke();
    } else {
      c.fillStyle = rg;
      c.fillRect(gx - R, gy - R, R * 2, R * 2);
    }
    c.globalCompositeOperation = "source-over";
  };

  const paint = (ctx: Ctx, env: Env, F: number) => {
    F = ((F % N) + N) % N; // the shutter may sample either side of the seam
    const t = F / N,
      [w, h] = dims(env),
      scene = layer(env, "scene", w, h),
      c = scene.ctx;
    // camera: a slow breath that peaks on the downbeat, a snap on the hit, small nods on frame 0 and the pre-pulse
    const cam = 1 + 0.014 * (0.5 - 0.5 * Math.cos(TAU * t)) + 0.03 * punch(F) + 0.006 * prePulse(F) + 0.008 * land(F),
      S = env.scale * cam,
      m = { S, ox: env.scale * CX * (1 - cam), oy: env.scale * CY * (1 - cam) };
    c.setTransform(m.S, 0, 0, m.S, m.ox, m.oy);
    c.globalAlpha = 1;
    c.globalCompositeOperation = "source-over";
    field(c, t, F);
    panes.forEach((p, i) => {
      const g = geo(p, F, t, i === 2),
        back = blur(env, scene);
      c.setTransform(m.S, 0, 0, m.S, m.ox, m.oy);
      glass(c, env, g, back, m, F, i);
    });
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.drawImage(scene.canvas, 0, 0);
    // a faint seeded grain over everything (it also keeps the dark gradients from banding in the encode)
    const pat = ctx.createPattern(grain(env).canvas as CanvasImageSource, "repeat");
    if (pat) {
      ctx.globalAlpha = 0.035;
      ctx.fillStyle = pat;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
    }
  };

  const cuts = [T.drift, T.hit, T.settle, N],
    names = ["drift", "tilt", "settle"];
  const shots: Shot[] = names.map((sid, i) => ({
    id: sid,
    start: cuts[i]!,
    end: cuts[i + 1]!,
    // no motion blur: the fastest solid move (the tilt's spring) shifts the pane a few px a frame, smooth at
    // 60 fps, and the 1.4 px edge lines and thin streak would ghost into copies under a few shutter samples
    draw: (ctx, local, env) => paint(ctx, env, cuts[i]! + local),
  }));
  return {
    meta: { title: id, W, H, fps: FPS, bpm: BPM, durationFrames: N, raster: "cpu" },
    assets: { images: {}, fonts: P.assets },
    shots,
    audio: score,
  };
}

// ---- sound: the soft beat score in E minor as a quiet bed (its tails wrap), an airy module pad on E that
// crosses every bar line (so the wrap has no hole), a glass tick on frame 0 and beat 3, a soft high whoosh that
// ends on the downbeat, and a glassy chime (E, G, C over the bar-2 C chord) on frame 120
const BED = 0.24,
  OUT = 0.665;
const hz = (m: number) => 440 * 2 ** ((m - 69) / 12);
function score(sr: number): [Float32Array, Float32Array] {
  const [Lc, Rc] = beatScore({ frames: N, fps: FPS, bpm: BPM, mood: "soft", key: 7, loop: true, gain: BED })(sr);
  const n = Lc.length,
    at = (f: number) => Math.round((f / FPS) * sr),
    noise = rng(5701),
    h0 = at(T.hit);
  const add = (i: number, v: number, pan: number) => {
    i = ((i % n) + n) % n;
    Lc[i] = Lc[i]! + v * (1 - pan);
    Rc[i] = Rc[i]! + v * pan;
  };
  // a circular moving average (the loop has no edges)
  const smooth = (x: Float32Array, w: number) => {
    const o = new Float32Array(n);
    let acc = 0;
    for (let k = -w; k <= w; k++) acc += x[((k % n) + n) % n]!;
    for (let i = 0; i < n; i++) {
      o[i] = acc / (2 * w + 1);
      acc += x[(i + w + 1) % n]! - x[(((i - w) % n) + n) % n]!;
    }
    return o;
  };
  const pow = new Float32Array(n);
  for (let i = 0; i < n; i++) pow[i] = (Lc[i]! ** 2 + Rc[i]! ** 2) / 2;
  const rms = smooth(pow, Math.round(0.03 * sr)).map(Math.sqrt);
  const ref = rms.reduce((a, b) => a + b, 0) / n,
    fill = smooth(
      rms.map((r) => Math.min(1, Math.max(0, (ref - r) / ref))),
      Math.round(0.03 * sr),
    );
  // the bed ducks under the chime and breathes back in (10 ms in, so the duck itself does not click)
  for (let i = h0; i < n; i++) {
    const k = (i - h0) / sr,
      d = 1 - 0.45 * (1 - Math.exp(-k / 0.01)) * Math.exp(-k / 0.35);
    Lc[i] = Lc[i]! * d;
    Rc[i] = Rc[i]! * d;
  }
  // the air pad: E4, B4 and E5 over E3 (E sits in both Em and C; not E2, which the bed's bass doubles and cancels), at whole cycles per loop so sample n
  // meets sample 0. It fills the bed's gaps: its level follows how far the bed's own (circular, smoothed) RMS
  // falls below its mean, so it swells exactly where the bed's pad releases and re-attacks at each bar line
  const cyc = n / sr,
    f1 = Math.round(hz(64) * cyc) / cyc,
    f2 = Math.round(hz(71) * cyc) / cyc,
    f3 = Math.round(hz(76) * cyc) / cyc,
    f0 = Math.round(hz(52) * cyc) / cyc;
  for (let i = 0; i < n; i++) {
    const t = i / sr,
      p = i / n,
      // and it swells into the downbeat (from 1.2 s), where the bed sags under the whoosh, then lets go
      into = p < 0.3 ? 0 : p < 0.5 ? sine01((p - 0.3) / 0.2) : Math.exp(-(p - 0.5) * 40),
      tr = 0.3 + 3.6 * fill[i]! + 2 * into + 0.06 * Math.sin(TAU * 4 * p);
    const v =
      (Math.sin(TAU * f1 * t) + 0.6 * Math.sin(TAU * f2 * t) + 0.25 * Math.sin(TAU * f3 * t)) * tr * 0.06 +
      Math.sin(TAU * f0 * t) * tr * 0.05;
    Lc[i] = Lc[i]! + v * (0.55 + 0.1 * Math.sin(TAU * p));
    Rc[i] = Rc[i]! + v * (0.55 - 0.1 * Math.sin(TAU * p));
  }
  // a glass bell: a near-sine with a detuned twin (the shimmer) and two inharmonic partials that die fast
  const bell = (i0: number, f: number, g: number, pan: number, tau = 0.75) => {
    for (let k = 0, len = Math.round(2.4 * sr); k < len; k++) {
      const t = k / sr,
        a = Math.min(1, t / 0.0015);
      const v =
        (Math.sin(TAU * f * t) + 0.5 * Math.sin(TAU * (f + 1.4) * t)) * Math.exp(-t / tau) +
        0.32 * Math.sin(TAU * f * 2.756 * t) * Math.exp(-t / 0.2) +
        0.15 * Math.sin(TAU * f * 5.404 * t) * Math.exp(-t / 0.06);
      add(i0 + k, v * a * g, pan);
    }
  };
  // a strike: a few ms of bright noise under each bell, so the attack reads as glass and not a synth
  const tink = (i0: number, g: number, pan: number) => {
    let lp = 0;
    for (let k = 0, len = Math.round(0.012 * sr); k < len; k++) {
      const x = noise() * 2 - 1;
      lp += 0.5 * (x - lp);
      add(i0 + k, (x - lp) * Math.exp(-k / (0.003 * sr)) * g, pan);
    }
  };
  // air into the loop point: a softer, shorter swell written before sample 0 (it wraps to the loop's end)
  {
    let lo2 = 0,
      bd2 = 0;
    const len = at(24);
    for (let k = -len; k < 0; k++) {
      const p = (k + len) / len,
        f = Math.min(0.9, 2 * Math.sin((Math.PI * (2400 + 4000 * p * p)) / sr)),
        x = noise() * 2 - 1;
      lo2 += f * bd2;
      bd2 += f * (x - lo2 - 0.8 * bd2);
      add(k, bd2 * p ** 2.4 * Math.min(1, -k / (0.006 * sr)) * 0.09, 0.7 - 0.3 * p);
    }
  }
  // the whoosh: noise through a band-pass whose centre rises (1.6 to 7 kHz), swelling into the downbeat and
  // stopping on it, travelling left to right like the streak
  const w0 = at(84);
  let lo = 0,
    bd = 0;
  for (let i = w0; i < h0; i++) {
    const p = (i - w0) / (h0 - w0),
      f = Math.min(0.9, 2 * Math.sin((Math.PI * (1600 + 5400 * p * p)) / sr)),
      x = noise() * 2 - 1;
    lo += f * bd;
    const hi = x - lo - 0.8 * bd;
    bd += f * hi;
    add(i, bd * p ** 2.4 * Math.min(1, (h0 - i) / (0.006 * sr)) * 0.35, 0.25 + 0.5 * p);
  }
  // the downbeat: a three-note glass strum and a soft low body under it
  bell(h0, hz(88), 0.4, 0.42, 0.9);
  bell(h0 + Math.round(0.024 * sr), hz(91), 0.29, 0.57, 0.8);
  bell(h0 + Math.round(0.052 * sr), hz(96), 0.2, 0.66, 0.7);
  tink(h0, 0.35, 0.45);
  let ph = 0;
  for (let k = 0, len = Math.round(0.9 * sr); k < len; k++) {
    const t = k / sr;
    ph += (hz(36) * (1 + 0.6 * Math.exp(-t / 0.04))) / sr;
    add(h0 + k, Math.sin(TAU * ph) * Math.exp(-t / 0.28) * Math.min(1, t / 0.004) * 0.95, 0.5);
  }
  // frame 0 (sample 0, tail wrapping round) and beat 3: smaller glass ticks for the glint and the pre-pulse
  // (each with a soft knock under it, so it reads in the body of the mix and not only as a high tick)
  const knock = (i0: number, f: number, g: number) => {
    for (let k = 0, len = Math.round(0.35 * sr); k < len; k++) {
      const t = k / sr;
      add(i0 + k, Math.sin(TAU * f * t) * Math.exp(-t / 0.07) * Math.min(1, t / 0.003) * g, 0.5);
    }
  };
  bell(0, hz(95), 0.15, 0.6, 0.45);
  tink(0, 0.3, 0.6);
  knock(0, hz(40), 0.7);
  bell(at(T.pre), hz(91), 0.1, 0.38, 0.35);
  tink(at(T.pre), 0.2, 0.4);
  knock(at(T.pre), hz(40), 0.32);
  // bar 2, beat 3: a soft answer for the middle pane's echo
  bell(at(T.echo), hz(88), 0.06, 0.6, 0.4);
  knock(at(T.echo), hz(36), 0.22);
  // one gentle saturation over the sum: louder without a limiter, and still deterministic
  let peak = 1e-9;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(Lc[i]!), Math.abs(Rc[i]!));
  const g = 1.25 / peak;
  for (let i = 0; i < n; i++) {
    Lc[i] = (Math.tanh(Lc[i]! * g) / Math.tanh(1.25)) * OUT;
    Rc[i] = (Math.tanh(Rc[i]! * g) / Math.tanh(1.25)) * OUT;
  }
  return [Lc, Rc];
}

export const frost = make("square", "frost");
export const frostVertical = make("vertical", "frostVertical");
