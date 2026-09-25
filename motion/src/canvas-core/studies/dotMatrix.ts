// STUDY 17 · DOT MATRIX (20 s, 30 fps, 120 bpm). One dot grid is the whole language: a wave spells WEEK, the
// grid becomes a month whose days fill with amber meetings, the crowded days pulse and empty until a few blue
// focus blocks remain, the dots swirl into a clock whose hour hand trails dots and stops on 3, then the grid
// spells ORIEL and settles into one ring of dots. Dots never move: they only grow, shrink and change colour, so
// every shape is a mask over the same cells. Captions are serif word ladders beside the action. Flat colour.
// Oriel is a fictional product. Designed for square and vertical (the month runs as two stacked blocks and the
// lettering sets on two lines).
// Brief: series/studies/briefs/dot-matrix.json · prompt: series/studies/prompts/dot-matrix.prompt.md
//
// The whole film is one continuous function paint(F) of a (fractional) frame F; the shots only name the sections.
import PACK from "../../../brand/packs/studio/pack.json";
import type { Ctx, Env } from "../core";
import type { Film, Shot } from "../film";
import { motionBlur } from "../kit/blur";
import { ladder, w, type Word } from "../kit/captions";
import { clamp, ease, lerp, prog, spring, window01 } from "../kit/motion";
import { usePack } from "../kit/pack";
import { beatScore } from "../kit/score";
import { layout, type Size } from "../kit/sizes";
import { text } from "../kit/type";

const P = usePack(PACK),
  C = P.palette("cobalt"),
  F_ = P.face;
const FPS = 30,
  BPM = 120,
  N = 600; // a beat is 15 frames, a bar 60
// the timeline, in frames (every cut on a beat)
const T = { month: 60, fill: 90, empty: 210, clock: 345, sweep: 399, stop: 435, sign: 480, ring: 540, done: 586 };
const TAU = Math.PI * 2;

// ---- colour as numbers, so a dot can blend between roles (flat fills only; no alpha)
type RGB = [number, number, number];
const hex = (s: string): RGB => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
const mix = (a: RGB, b: RGB, t: number): RGB => {
  const k = clamp(t);
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
};
const css = (c: RGB) => `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`;
const INK = hex(C.ink),
  MUTED = hex(C.muted),
  LINE = hex(C.line),
  AMBER = hex(C.accent),
  BLUE = hex(C.accent2);
const BG = mix(LINE, MUTED, 0.12), // the resting grid
  EMPTY = mix(LINE, MUTED, 0.5), // an empty hour in the calendar, a minute on the clock
  BG_CSS = css(BG);
const hash = (i: number, j: number) => {
  const s = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453;
  return s - Math.floor(s);
};

// ---- dot-matrix lettering: 7 rows, one grid cell per pixel, one empty column between glyphs
const GLYPH: Record<string, string[]> = {
  W: ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  I: ["111", "010", "010", "010", "010", "010", "111"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  "1": ["00100", "01100", "10100", "00100", "00100", "00100", "11111"],
  "+": ["00000", "00100", "00100", "11111", "00100", "00100", "00000"],
  " ": ["000", "000", "000", "000", "000", "000", "000"],
};
type Pixel = { i: number; j: number; col: number; line: number };
/** lines of lettering as grid cells, each line centred on column 0, the block centred on row 0 */
const lettering = (lines: string[], gap = 3): Pixel[] => {
  const out: Pixel[] = [],
    tall = lines.length * 7 + (lines.length - 1) * gap,
    top = -Math.floor(tall / 2);
  lines.forEach((s, line) => {
    const widths = [...s].map((ch) => GLYPH[ch]![0]!.length),
      total = widths.reduce((a, b) => a + b, 0) + widths.length - 1;
    let x = -Math.floor(total / 2);
    [...s].forEach((ch, k) => {
      GLYPH[ch]!.forEach((row, r) =>
        [...row].forEach((bit, c) => {
          if (bit === "1")
            out.push({ i: x + c, j: top + line * (7 + gap) + r, col: x + c + Math.floor(total / 2), line });
        }),
      );
      x += widths[k]! + 1;
    });
  });
  return out;
};

type Design = {
  G: number; // grid pitch
  hook: string[];
  sign: string[];
  zoom: [number, number, boolean][]; // [frame, zoom, eased into this key]
  cal: { x0: number; y0: number; split: number }; // top-left cell; extra rows before week 4 (the second block)
  clock: { y: number; R: number }; // centre row and radius, in cells
  ring: { R: number };
  cap: { size: number; x: number; y: number; clockY: number };
};

export function make(size: Size, id: string): Film {
  const L = layout(size),
    { W, H, u, cx, cy, tall } = L;
  const D: Design = tall
    ? {
        G: 24 * u,
        hook: ["YOUR", "WEEK"],
        sign: ["ORIEL", "+1 HR"],
        zoom: [
          [0, 1.5, false],
          [60, 1.56, false],
          [106, 1.26, true],
          [210, 1.32, false],
          [345, 1.35, false],
          [480, 1.37, false],
          [600, 1.41, false],
        ],
        cal: { x0: -13, y0: -4, split: 3 },
        clock: { y: 5, R: 13 },
        ring: { R: 13 },
        cap: { size: 84 * u, x: 136 * u, y: 400 * u, clockY: 400 * u },
      }
    : {
        G: 24 * u,
        hook: ["WEEK"],
        sign: ["ORIEL"],
        zoom: [
          [0, 1.34, false],
          [60, 1.4, false],
          [98, 1.0, true],
          [345, 1.06, false],
          [480, 1.09, false],
          [508, 1.28, true],
          [600, 1.36, false],
        ],
        cal: { x0: -13, y0: -5, split: 0 },
        clock: { y: 3, R: 11 },
        ring: { R: 11 },
        cap: { size: 72 * u, x: 206 * u, y: 100 * u, clockY: 80 * u },
      };
  const { G } = D;
  // dot sizes, as fractions of the pitch
  const R_BG = 0.1 * G,
    R_EMPTY = 0.2 * G,
    R_MEET = 0.43 * G,
    R_FOCUS = 0.47 * G,
    R_LET = 0.44 * G,
    R_MIN = 0.2 * G,
    R_MARK = 0.42 * G,
    R_HAND = 0.42 * G;

  // ---- the camera: a slow push that never stops, with eased moves between scenes
  const zoomAt = (F: number) => {
    const k = D.zoom;
    for (let n = 1; n < k.length; n++) {
      const [f1, z1, eased] = k[n]!,
        [f0, z0] = k[n - 1]!;
      if (F <= f1) {
        const t = prog(F, f0, f1);
        return lerp(z0, z1, eased ? ease.inOutCubic(t) : t);
      }
    }
    return k[k.length - 1]![1];
  };

  // ---- THE GRID, decided first: every cell knows which shapes it belongs to
  type Cell = {
    i: number;
    j: number;
    x: number;
    y: number;
    h: number;
    hook: Pixel | null;
    sign: Pixel | null;
    day: number; // -1 when the cell is not an hour of the month
    wd: number;
    week: number;
    sx: number;
    sy: number;
    meet: number; // the frame this hour fills with a meeting (-1: stays free)
    focus: boolean;
  };
  const ci = Math.ceil(W / 2 / G) + 1,
    cj = Math.ceil(H / 2 / G) + 1;
  const cells: Cell[] = [],
    at = new Map<string, Cell>();
  for (let j = -cj; j <= cj; j++)
    for (let i = -ci; i <= ci; i++) {
      const c: Cell = {
        i,
        j,
        x: i * G,
        y: j * G,
        h: hash(i, j),
        hook: null,
        sign: null,
        day: -1,
        wd: 0,
        week: 0,
        sx: 0,
        sy: 0,
        meet: -1,
        focus: false,
      };
      cells.push(c);
      at.set(`${i},${j}`, c);
    }
  for (const p of lettering(D.hook)) at.get(`${p.i},${p.j}`)!.hook = p;
  for (const p of lettering(D.sign)) at.get(`${p.i},${p.j}`)!.sign = p;
  const hookCols = Math.max(...lettering(D.hook).map((p) => p.col)),
    signCols = Math.max(...lettering(D.sign).map((p) => p.col));

  // the month: 31 days starting on a Wednesday, each day a 3×3 block of hours with one empty cell between days
  const START = 2,
    DAYS = 31,
    FOCUS = new Set(["0,3", "1,1", "2,4", "3,2"]); // [week, weekday] of the blue focus blocks
  const dayT = (k: number) => T.fill - 4 + 106 * (k / (DAYS - 1)) ** 0.8; // fills slowly, then crowds
  for (let k = 0; k < DAYS; k++) {
    const pos = k + START,
      week = Math.floor(pos / 7),
      wd = pos % 7,
      x = D.cal.x0 + wd * 4,
      y = D.cal.y0 + week * 4 + (week >= 3 ? D.cal.split : 0),
      focus = FOCUS.has(`${week},${wd}`);
    // later days hold more meetings; the focus column is always booked first, then set free
    const count = Math.min(9, 4 + Math.floor(k / 5) + Math.floor(hash(k, 3) * 3)),
      order = Array.from({ length: 9 }, (_, s) => s).sort((a, b) => hash(k, a + 11) - hash(k, b + 11));
    const booked = new Set(order.slice(0, count));
    if (focus) [1, 4, 7].forEach((s) => booked.add(s));
    let n = 0;
    for (let s = 0; s < 9; s++) {
      const c = at.get(`${x + (s % 3)},${y + Math.floor(s / 3)}`)!;
      Object.assign(c, { day: k, wd, week, sx: s % 3, sy: Math.floor(s / 3), focus: focus && s % 3 === 1 });
    }
    for (const s of order.filter((s) => booked.has(s)))
      at.get(`${x + (s % 3)},${y + Math.floor(s / 3)}`)!.meet = dayT(k) + n++ * 1.3;
  }
  const calTop = D.cal.y0,
    calLeft = D.cal.x0;

  // ---- the clock: centre, radius and the hour hand's one sweep from 12 to 3
  const OX = 0,
    OY = D.clock.y * G,
    R = D.clock.R * G,
    RR = D.ring.R * G;
  const hourAt = (F: number) => {
    if (F < T.sweep) return 0;
    if (F < T.stop) return (Math.PI / 2) * prog(F, T.sweep, T.stop) ** 1.8;
    const t = (F - T.stop) / FPS; // it lands on 3 and rocks once, like a real hand
    return Math.PI / 2 + 0.07 * Math.sin(t * TAU * 2.2) * Math.exp(-t * 6);
  };
  const minuteAt = (F: number) => {
    const h = hourAt(F);
    return F < T.stop ? h * 12 : TAU * 3 + (h - Math.PI / 2) * 3;
  };
  const segDist = (dx: number, dy: number, th: number, len: number) => {
    const ux = Math.sin(th),
      uy = -Math.cos(th),
      t = clamp(dx * ux + dy * uy, 0, len);
    return Math.hypot(dx - t * ux, dy - t * uy);
  };
  // a ring on a square grid: every cell within ~¾ of a pitch of the circle is on it, the nearest ones fullest
  const ringAA = (d: number, rad: number) => {
    const e = Math.abs(d - rad) / G;
    return e < 0.74 ? 1 - 0.5 * clamp((e - 0.3) / 0.44) : 0;
  };
  const angle = (dx: number, dy: number) => {
    const a = Math.atan2(dx, -dy);
    return a < 0 ? a + TAU : a;
  };

  // ---- one cell at one instant: the biggest dot any shape asks for wins
  let r = 0,
    col: RGB = BG;
  const put = (rr: number, cc: RGB) => {
    if (rr > r) {
      r = rr;
      col = cc;
    }
  };
  const front = (F: number) => -19 + F * 1.7; // the hook's diagonal wave
  const waveKey = (c: Cell) => c.i * 0.8 + c.j * 0.5;
  const ripples = [
    { t0: T.stop, x: OX + R, y: OY },
    { t0: T.done, x: 0, y: 0 },
  ];
  const bgFlash = (c: Cell, F: number) => {
    let f = 0;
    if (F < 50) f = Math.exp(-(((waveKey(c) - front(F)) / 2.6) ** 2)) * (1 - prog(F, 30, 50));
    for (const rp of ripples)
      if (F >= rp.t0) {
        const d = Math.hypot(c.x - rp.x, c.y - rp.y);
        f = Math.max(
          f,
          Math.exp(-(((d - (F - rp.t0) * 30 * u) / (0.9 * G)) ** 2)) * (1 - prog(F, rp.t0, rp.t0 + 20)) ** 2,
        );
      }
    return f;
  };

  const cell = (c: Cell, F: number) => {
    r = 0;
    col = BG;
    // 00 hook: the wave passes and the letters stay lit
    if (c.hook && F < T.month + 30) {
      const tp = (waveKey(c) + 19) / 1.7,
        g = spring((F - tp - 1) / FPS, { freq: 2.4, damp: 0.5 }),
        to = T.month + (c.hook.col / hookCols) * 10 + c.hook.line * 3,
        o = 1 - ease.inOutCubic(prog(F, to, to + 10));
      put(R_LET * g * o, mix(BLUE, INK, prog(F, tp + 2, tp + 14)));
    }
    // 01–02 the month: hours appear, fill with meetings, pulse, empty; focus blocks stay blue
    if (c.day >= 0 && F >= T.month && F < T.clock + 30) {
      const tg = T.month + 2 + (c.i - calLeft + (c.j - calTop) * 0.8) * 0.75,
        rE = R_EMPTY * spring((F - tg) / FPS, { freq: 2.6, damp: 0.7 });
      let rr = rE,
        cc = EMPTY;
      if (c.meet >= 0) {
        const p = spring((F - c.meet) / FPS, { freq: 3.2, damp: 0.45 });
        rr = lerp(rE, R_MEET, p);
        cc = mix(EMPTY, AMBER, p * 1.6);
        let pk = 0;
        for (const b of [T.empty, T.empty + 15, T.empty + 30]) if (F >= b) pk += Math.exp(-(F - b) / 3.5);
        rr *= 1 + 0.2 * pk * (1 - prog(F, 244, 250));
        const te = 246 + (c.wd + c.week) * 2.4 + (c.sx + c.sy) * 0.6,
          e = ease.inOutCubic(prog(F, te, te + 9));
        if (c.focus) {
          rr = lerp(rr, R_FOCUS, e);
          cc = mix(cc, BLUE, e);
        } else {
          rr = lerp(rr, rE, e) * (1 - 0.55 * Math.sin(Math.PI * e));
          cc = mix(cc, EMPTY, e);
        }
      }
      // the swirl takes the month away, sweeping round the clock's centre
      const dx = c.x - OX,
        dy = c.y - OY,
        te = T.clock + (angle(dx, dy) / TAU) * 14 + (1 - clamp(Math.hypot(dx, dy) / (R * 1.8))) * 6;
      rr *= 1 - ease.inCubic(prog(F, te, te + 8));
      put(rr, cc);
    }
    // 03 the clock
    if (F >= T.clock && F < T.sign + 24) {
      const dx = c.x - OX,
        dy = c.y - OY,
        d = Math.hypot(dx, dy),
        a = angle(dx, dy),
        fa = a / TAU,
        leave = 1 - ease.inCubic(prog(F, T.sign + (d / R) * 10, T.sign + (d / R) * 10 + 8));
      // the swirl: three spiral arms that wind in onto the rim
      if (F < 396) {
        const sp = (0.5 + 0.5 * Math.cos(3 * a - d / (2.4 * G) + F * 0.42)) ** 4,
          wd = lerp(9 * G, 0.9 * G, ease.inCubic(prog(F, 350, 392))),
          env = Math.exp(-(((d - R) / wd) ** 2)),
          I = window01(F, 347, 358, 380, 395);
        put(0.36 * G * sp * env * I, mix(BLUE, INK, prog(F, 362, 392)));
      }
      // the rim: small minute dots, heavy hour marks, lit blue behind the hour hand
      const aa = ringAA(d, R);
      if (aa > 0) {
        const on = spring((F - (374 + fa * 10)) / FPS, { freq: 2.8, damp: 0.6 }),
          ka = Math.round(a / (TAU / 12)) * (TAU / 12),
          mark = c.i === Math.round((R * Math.sin(ka)) / G) && c.j === D.clock.y + Math.round((-R * Math.cos(ka)) / G),
          th = hourAt(F),
          lit = a > 0.02 && a < Math.PI / 2 + 0.05 ? clamp((th - a) / 0.18 + 0.4) : 0,
          three = mark && Math.abs(ka - Math.PI / 2) < 0.01;
        let rr = (mark ? R_MARK : R_MIN * aa) * on,
          cc = mark ? INK : EMPTY;
        if (lit > 0) {
          rr = Math.max(rr, R_MARK * 0.72 * aa * lit);
          cc = mix(cc, BLUE, lit);
        }
        if (three && F >= T.stop) {
          rr *= 1 + 0.45 * spring((F - T.stop) / FPS, { freq: 2.6, damp: 0.35 });
          cc = BLUE;
        }
        put(rr * leave, cc);
      }
      // the hands grow out of the centre, then sweep; the hour hand trails dots behind it
      const grow = ease.outCubic(prog(F, 384, 398));
      if (grow > 0 && d < R * 0.9) {
        const hl = R * 0.55 * grow,
          ml = R * 0.8 * grow;
        for (let k = 8; k >= 1; k--) {
          const tr = segDist(dx, dy, hourAt(F - k * 1.6), hl),
            v = clamp(1 - (tr - 0.3 * G) / (0.55 * G)) * (1 - k / 9);
          if (v > 0) put(R_HAND * 0.9 * v, mix(BLUE, EMPTY, k / 10));
        }
        for (let k = 3; k >= 1; k--) {
          const tr = segDist(dx, dy, minuteAt(F - k * 0.8), ml),
            v = clamp(1 - (tr - 0.1 * G) / (0.5 * G)) * (1 - k / 4) * 0.8;
          if (v > 0) put(R_MIN * 1.4 * v, mix(INK, EMPTY, 0.5 + k / 8));
        }
        const hv = clamp(1 - (segDist(dx, dy, hourAt(F), hl) - 0.35 * G) / (0.5 * G)),
          mv = clamp(1 - (segDist(dx, dy, minuteAt(F), ml) - 0.12 * G) / (0.5 * G));
        put(R_HAND * hv * leave, INK);
        put(R_HAND * 0.7 * mv * leave, INK);
      }
      if (d < 0.5 * G) put(R_MARK * 1.15 * spring((F - 380) / FPS, { freq: 2.6, damp: 0.5 }) * leave, INK);
    }
    // 04 sign-off: the grid spells the name, then the name settles into one ring
    if (c.sign && F >= T.sign) {
      const tl = T.sign + 4 + (c.sign.col / signCols) * 16 + c.sign.line * 6,
        g = spring((F - tl) / FPS, { freq: 2.6, damp: 0.55 }),
        to = T.ring - 6 + Math.abs(c.sign.col / signCols - 0.5) * 18 + c.sign.line * 3,
        o = 1 - ease.inOutCubic(prog(F, to, to + 9)),
        tone = c.sign.line ? BLUE : INK;
      put(R_LET * g * o, mix(BLUE, tone, prog(F, tl + 3, tl + 14)));
    }
    if (F >= T.ring) {
      const d = Math.hypot(c.x, c.y),
        aa = ringAA(d, RR);
      if (aa > 0) {
        const fa = angle(c.x, c.y) / TAU,
          on = spring((F - (T.ring - 2 + fa * 12)) / FPS, { freq: 2.8, damp: 0.6 }),
          pf = spring((F - (T.ring + 12 + fa * 30)) / FPS, { freq: 3, damp: 0.5 }),
          kick = F >= T.done ? Math.exp(-(F - T.done) / 6) * Math.sin(((F - T.done) / 12) * Math.PI) : 0;
        put(lerp(R_MIN * 1.2, R_MARK, pf) * aa * on * (1 + 0.35 * kick), mix(EMPTY, BLUE, pf * 1.4));
      }
    }
    // everything breathes a little, so no hold is ever still
    r *= 1 + 0.05 * Math.sin(F * 0.19 - (c.x + c.y) / (9 * G));
  };

  // ---- captions: serif ladders beside the action, word by word, one key word in the blue italic
  const X = D.cap.x,
    S = D.cap.size;
  const LADDERS: { lines: Word[][]; x: number; y: number; out: number; align?: "left" | "center" }[] = [
    {
      lines: [
        [w("every", 118, { scale: 0.8 }), w("week", 122, { scale: 0.8 })],
        [w("fills up", 130, { key: true, scale: 1.3 })],
      ],
      x: X,
      y: D.cap.y,
      out: 200,
    },
    {
      lines: [
        [w("take", 252, { scale: 0.8 }), w("back", 257, { scale: 0.8 })],
        [w("the", 264, { scale: 0.8 }), w("week", 270, { key: true, scale: 1.3 })],
      ],
      x: X,
      y: D.cap.y,
      out: 334,
    },
    {
      lines: [
        [w("and", 402, { scale: 0.8 }), w("time", 408, { scale: 0.8 })],
        [w("comes", 416, { scale: 0.8 }), w("back", T.stop, { key: true, scale: 1.3 })],
      ],
      x: X,
      y: D.cap.clockY,
      out: 470,
    },
  ];
  const signCap: Word[][] = [
    [w("one", 551, { scale: 0.8 }), w("hour,", 556, { scale: 0.8 })],
    [w("found", 566, { key: true, scale: 1.45 })],
  ];

  const paint = (ctx: Ctx, env: Env, F: number) => {
    F = clamp(F, 0, N - 1);
    ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
    ctx.fillStyle = C.ground;
    ctx.fillRect(0, 0, W, H);
    const z = zoomAt(F),
      hw = W / 2 / z + G,
      hh = H / 2 / z + G;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(z, z);
    // the resting grid in one path; any dot that is doing something is drawn on its own, on top
    const live: [number, number, number, RGB][] = [];
    const clearIn = F >= T.ring + 6 ? ease.inOutCubic(prog(F, T.ring + 6, T.ring + 24)) : 0;
    ctx.beginPath();
    for (const c of cells) {
      if (Math.abs(c.x) > hw || Math.abs(c.y) > hh) continue;
      cell(c, F);
      const fl = bgFlash(c, F);
      // inside the final ring the grid clears, so the caption sits on open ground
      const quiet = clearIn > 0 && Math.hypot(c.x, c.y) < RR - 1.5 * G ? 1 - 0.8 * clearIn : 1,
        rb = R_BG * (1 + 1.6 * fl) * quiet;
      if (r > rb) live.push([c.x, c.y, r, col]);
      else if (fl > 0.03) live.push([c.x, c.y, rb, mix(BG, BLUE, fl * 0.8)]);
      else if (rb > 0.2) {
        ctx.moveTo(c.x + rb, c.y);
        ctx.arc(c.x, c.y, rb, 0, TAU);
      }
    }
    ctx.fillStyle = BG_CSS;
    ctx.fill();
    for (const [x, y, rr, cc] of live) {
      ctx.beginPath();
      ctx.arc(x, y, rr, 0, TAU);
      ctx.fillStyle = css(cc);
      ctx.fill();
    }
    ctx.restore();

    const opts = { size: S, face: F_.serif, italic: F_.italic, ink: C.ink, accent: C.accent2, fps: FPS, gap: 0.04 };
    for (const lad of LADDERS)
      if (F >= lad.lines[0]![0]!.at - 1 && F < lad.out + 10)
        ladder(ctx, lad.lines, lad.x, lad.y - (F - lad.lines[0]![0]!.at) * 0.1 * u, F, { ...opts, out: lad.out });
    if (F >= 550) {
      const rz = RR * z,
        k = tall ? 1.1 : 1;
      ladder(ctx, signCap, cx, cy - 96 * u * k, F, { ...opts, size: S * 1.05, align: "center" });
      text(ctx, P.url, cx, cy + rz + 70 * u, {
        size: 24 * u,
        family: F_.mono,
        weight: 500,
        color: C.muted,
        align: "center",
        track: 0.08,
        alpha: prog(F, 580, 592),
      });
    }
  };

  const cuts = [0, T.month, T.empty, T.clock, T.sign, N],
    names = ["hook", "month", "empty", "clock", "signoff"];
  const shots: Shot[] = names.map((sid, i) => ({
    id: sid,
    start: cuts[i]!,
    end: cuts[i + 1]!,
    draw: (ctx, local, env) =>
      motionBlur(ctx, env, (c, dt) => paint(c, env, cuts[i]! + local + dt), { samples: 4, shutter: 0.5 }),
  }));
  // a soft tick per filled day, thinned to the beat so it never buzzes
  const ticks: number[] = [];
  for (let b = T.fill; b < T.empty; b += 15)
    if (Array.from({ length: DAYS }, (_, k) => dayT(k)).some((t) => t >= b - 7.5 && t < b + 7.5)) ticks.push(b);
  return {
    meta: { title: id, W, H, fps: FPS, bpm: BPM, durationFrames: N, raster: "cpu" },
    assets: { images: {}, fonts: P.assets },
    shots,
    audio: beatScore({
      frames: N,
      fps: FPS,
      bpm: BPM,
      mood: "soft",
      hits: [T.stop],
      whooshes: [T.month + 36, 392, T.sign + 20],
      ticks: [...ticks, 255, 270, T.done],
      sign: T.ring,
      gain: 0.68,
    }),
  };
}

export const dotMatrix = make("square", "dotMatrix");
export const dotMatrixVertical = make("vertical", "dotMatrixVertical");
