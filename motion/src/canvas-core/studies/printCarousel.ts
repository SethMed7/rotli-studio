// STUDY 04 · PRINT CAROUSEL (6 slides, 30 fps, 120 bpm). A risograph zine for a fictional scheduling product:
// "Five rules for calmer meetings", a cover and five rules, each slide one beat long. Two inks (blue and
// fluorescent pink, yellow as a rare third) print on their own drums, overprint with multiply, sit a hair out
// of register, and pick up the drum's pinholes and mottle; the sheet's grain goes over everything.
// One source, designed for portrait (words above, picture below) and square (picture beside the words).
// Brief: series/studies/briefs/print-carousel.json · prompt: series/studies/prompts/print-carousel.prompt.md
//
// The whole carousel is one continuous function paint(F) of a (fractional) frame F; the shots only name the
// slides. Each slide prints in (drums pull into register, screens rise, marks land) and RESTS by local frame
// 14, the frame a carousel exports (studio.mjs takes i * 15 + 14); a slow push-in keeps every hold alive.
import PACK from "../../../brand/packs/studio/pack.json";
import { Gfx, RISOLINE, halftone, oval, poly, type Ctx, type Env, type P } from "../core";
import type { Film, Shot } from "../film";
import { clamp, ease, lerp, prog, spring } from "../kit/motion";
import { usePack } from "../kit/pack";
import { layout, type Size } from "../kit/sizes";
import { letters, measure, text, type TextOpts } from "../kit/type";
import { rr } from "../kit/ui";
import { cut, smooth, straight } from "../styles/riso";

const P_ = usePack(PACK),
  C = P_.palette("riso"),
  F_ = P_.face;
const FPS = 30,
  BPM = 120,
  N = 90,
  BEAT = 15; // a beat is 15 frames: one slide per beat
// the inks, all from the pack: the key drum is blue, the screen drum pink, yellow the rare third
const INK = { blue: C.ink, pink: C.accent, yellow: C.accent2 },
  PAPER = C.ground;
// where each drum lands (a riso never quite registers) and where it starts on the pull
const REG = { yellow: [-5, 4] as P, pink: [5, -3] as P, blue: [0, 0] as P };
const PULL = { yellow: [-34, 22] as P, pink: [30, -20] as P, blue: [0, 14] as P };
const SX = 0.84; // the horizontal squeeze that makes Inter 800 read as a condensed poster face

type Art = {
  dy?: number;
  yellow?: (c: Ctx, t: number) => void;
  pink?: (c: Ctx, t: number) => void;
  blue?: (c: Ctx, t: number) => void;
};
type Slide = { id: string; no: string; title: string[]; note: string; art: Art };

// ---- the drawing helpers every slide shares (local art space is a 600 × 600 box around 0, 0)
const circle = (c: Ctx, x: number, y: number, r: number) => {
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
};
const fillPts = (c: Ctx, pts: P[], color: string) => {
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
  c.fillStyle = color;
  c.fill();
};
const disc = (c: Ctx, x: number, y: number, r: number, color: string) =>
  fillPts(c, smooth(oval(x, y, r, r, 16)), color);
const box = (c: Ctx, x0: number, y0: number, x1: number, y1: number, color: string) =>
  fillPts(
    c,
    straight([
      [x0, y0],
      [x1, y0],
      [x1, y1],
      [x0, y1],
    ]),
    color,
  );
/** a stroke as a filled, hand-cut ribbon (a riso prints shapes, not hairlines) */
const bar = (c: Ctx, a: P, b: P, w: number, color: string) => {
  const dx = b[0] - a[0],
    dy = b[1] - a[1],
    l = Math.hypot(dx, dy) || 1,
    nx = ((-dy / l) * w) / 2,
    ny = ((dx / l) * w) / 2;
  fillPts(
    c,
    cut(
      poly(
        [
          [a[0] + nx, a[1] + ny],
          [b[0] + nx, b[1] + ny],
          [b[0] - nx, b[1] - ny],
          [a[0] - nx, a[1] - ny],
        ],
        Math.max(3, Math.round(l / 14)),
      ),
    ),
    color,
  );
};
/** a halftone screen: dot size follows tone(x, y) in 0..1, clipped by the current path if `clip` is set */
const screen = (
  c: Ctx,
  b: [number, number, number, number],
  pitch: number,
  ang: number,
  tone: (x: number, y: number) => number,
  color: string,
  clip?: () => void,
) => {
  c.save();
  if (clip) {
    clip();
    c.clip();
  }
  c.fillStyle = color;
  c.beginPath();
  for (const [x, y, r] of halftone({ x0: b[0], y0: b[1], x1: b[2], y1: b[3] }, pitch, ang, tone)) {
    c.moveTo(x + r, y);
    c.arc(x, y, r, 0, Math.PI * 2);
  }
  c.fill();
  c.restore();
};
const land = (t: number, at = 0, freq = 3.2, damp = 0.72) => spring((t - at) / FPS, { freq, damp });

// ---- the slides' pictures, one per beat
const clockFace = (c: Ctx, t: number, R: number, color: string, min: number) => {
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2,
      big = i % 3 === 0,
      r0 = R * (big ? 0.72 : 0.8),
      r1 = R * 0.9;
    const k = land(t, 1 + i * 0.4, 3.4, 0.8);
    if (k > 0.01)
      bar(
        c,
        [Math.cos(a) * lerp(r1, r0, k), Math.sin(a) * lerp(r1, r0, k)],
        [Math.cos(a) * r1, Math.sin(a) * r1],
        big ? 22 : 10,
        color,
      );
  }
  const hr = -Math.PI / 2 + (10 / 12) * Math.PI * 2 + (min / 60) * (Math.PI / 6),
    mn = -Math.PI / 2 + (min / 60) * Math.PI * 2;
  bar(c, [0, 0], [Math.cos(hr) * R * 0.46, Math.sin(hr) * R * 0.46], 30, color);
  bar(c, [0, 0], [Math.cos(mn) * R * 0.68, Math.sin(mn) * R * 0.68], 18, color);
  disc(c, 0, 0, 26, color);
};

const cover: Art = {
  // the face: a yellow plate a touch off the pink screen, so the edge shows a crescent of the third ink
  yellow: (c, t) => {
    const k = land(t, 0, 2.6, 0.8);
    disc(c, 16, 14, 280 * k, INK.yellow);
  },
  pink: (c, t) => {
    const k = land(t, 1, 2.4, 0.85);
    screen(
      c,
      [-300, -300, 300, 300],
      12,
      15,
      (x, y) => (Math.hypot(x, y) > 282 ? 0 : k * (0.28 + 0.62 * clamp(((x + y) / 400 + 1) / 2))),
      INK.pink,
      () => circle(c, 0, 0, 282),
    );
  },
  // the hands sweep up to ten past ten and keep ticking on
  blue: (c, t) => clockFace(c, t, 280, INK.blue, lerp(-20, 8, land(t, 2, 2.2, 0.7)) + t * 0.08),
};

const target: Art = {
  pink: (c, t) => {
    const k = land(t, 0, 2.6, 0.8);
    screen(
      c,
      [-270, -270, 270, 270],
      11,
      15,
      (x, y) => {
        const d = Math.hypot(x, y);
        return d > 262 ? 0 : k * (0.2 + 0.7 * (1 - d / 262));
      },
      INK.pink,
      () => circle(c, 0, 0, 262),
    );
    disc(c, 0, 0, 62 * land(t, 5, 3.4, 0.5), INK.pink); // the bull, struck
  },
  blue: (c, t) => {
    for (const [i, r] of [260, 184, 110].entries()) {
      const k = land(t, i * 1.2, 3, 0.8);
      c.save();
      c.lineWidth = 16;
      c.strokeStyle = INK.blue;
      circle(c, 0, 0, r * k);
      if (k > 0.02) c.stroke();
      c.restore();
    }
    // the arrow flies in along its own line and lands at frame 6, then quivers out
    const d: P = [-0.74, -0.67],
      fly = 1 - ease.outCubic(prog(t, 0, 6)),
      ox = d[0] * fly * 560,
      oy = d[1] * fly * 560;
    const q = t > 6 ? 0.09 * Math.sin((t - 6) * 2.4) * Math.exp(-(t - 6) * 0.42) : 0;
    c.save();
    c.translate(ox, oy);
    c.rotate(q);
    const tail: P = [d[0] * 350, d[1] * 350];
    bar(c, [d[0] * 20, d[1] * 20], tail, 16, INK.blue);
    // fletching: three cut vanes
    for (let i = 0; i < 3; i++) {
      const s = 256 + i * 34,
        px = d[0] * s,
        py = d[1] * s,
        n: P = [-d[1], d[0]];
      fillPts(
        c,
        cut([
          [px, py],
          [px + d[0] * 36 + n[0] * 38, py + d[1] * 36 + n[1] * 38],
          [px + d[0] * 62 + n[0] * 38, py + d[1] * 62 + n[1] * 38],
          [px + d[0] * 26, py + d[1] * 26],
        ]),
        INK.blue,
      );
      fillPts(
        c,
        cut([
          [px, py],
          [px + d[0] * 36 - n[0] * 38, py + d[1] * 36 - n[1] * 38],
          [px + d[0] * 62 - n[0] * 38, py + d[1] * 62 - n[1] * 38],
          [px + d[0] * 26, py + d[1] * 26],
        ]),
        INK.blue,
      );
    }
    c.restore();
  },
};

// a figure: a head and a round-shouldered body, standing on the floor at y = 210
const figure =
  (x: number, lift = 0) =>
  (c: Ctx) => {
    const top = -38 - lift,
      bot = 210,
      r = 54;
    c.beginPath();
    c.arc(x, -96 - lift, 44, 0, Math.PI * 2);
    c.moveTo(x - 55, bot);
    c.lineTo(x - 55, top + r);
    c.arcTo(x - 55, top, x, top, r);
    c.arcTo(x + 55, top, x + 55, top + r, r);
    c.lineTo(x + 55, bot);
    c.closePath();
  };
const people: Art = {
  dy: -40, // the group is shorter than the box: centre it
  pink: (c, t) => {
    // one chair: a seat, a back and two legs, printed flat in pink
    const k = land(t, 2, 3, 0.62),
      dy = (1 - k) * -60;
    c.save();
    c.globalAlpha = clamp(k * 2);
    c.translate(0, dy);
    box(c, 112, 60, 262, 86, INK.pink);
    box(c, 236, -80, 262, 210, INK.pink);
    box(c, 120, 86, 142, 210, INK.pink);
    c.restore();
  },
  blue: (c, t) => {
    box(c, -290, 206, 290, 216, INK.blue); // the floor
    // the two left out: screened back to a tint, stepping aside
    const out = ease.outCubic(prog(t, 3, 12));
    for (const [i, x] of [-226, -96].entries()) {
      const fx = x - out * (46 - i * 16),
        tone = lerp(0.95, 0.22, out);
      screen(
        c,
        [fx - 64, -150, fx + 64, 212],
        10,
        45,
        () => tone,
        INK.blue,
        () => figure(fx)(c),
      );
    }
    // the one who needs to be there: solid, with a small hop
    const hop = Math.max(0, Math.sin(clamp((t - 4) / 7) * Math.PI)) * 26;
    c.save();
    figure(44, hop)(c);
    c.fillStyle = INK.blue;
    c.fill();
    c.restore();
  },
};

const halfClock: Art = {
  pink: (c, t) => {
    const cutp = ease.inOutCubic(prog(t, 2, 10)),
      R = 250;
    // the half you keep: solid ink, 00 to 30
    c.save();
    c.beginPath();
    c.moveTo(6, -R);
    c.arc(6, 0, R, -Math.PI / 2, Math.PI / 2);
    c.closePath();
    c.fillStyle = INK.pink;
    c.fill();
    c.restore();
    // the half you give back: slides off and fades to a screen
    c.save();
    c.translate(-cutp * 70, cutp * 26);
    c.rotate(-cutp * 0.16);
    screen(
      c,
      [-R - 10, -R - 10, 10, R + 10],
      11,
      15,
      () => lerp(1, 0.4, cutp),
      INK.pink,
      () => {
        c.beginPath();
        c.moveTo(-6, -R);
        c.arc(-6, 0, R, -Math.PI / 2, Math.PI / 2, true);
        c.closePath();
      },
    );
    c.restore();
  },
  blue: (c, t) => {
    const cutp = ease.inOutCubic(prog(t, 2, 10)),
      R = 250,
      sweep = land(t, 3, 1.8, 0.8);
    // the ticks travel with their half
    for (let i = 0; i < 12; i++) {
      if (i % 6 === 0) continue; // the cut takes 00 and 30; the labels keep them
      const a = (i / 12) * Math.PI * 2 - Math.PI / 2,
        left = Math.cos(a) < 0,
        big = i % 3 === 0;
      c.save();
      if (left) {
        c.translate(-cutp * 70, cutp * 26);
        c.rotate(-cutp * 0.16);
      }
      const ox = left ? -6 : 6,
        r0 = R * (big ? 0.7 : 0.8),
        r1 = R * 0.9;
      bar(
        c,
        [ox + Math.cos(a) * r0, Math.sin(a) * r0],
        [ox + Math.cos(a) * r1, Math.sin(a) * r1],
        big ? 22 : 10,
        INK.blue,
      );
      c.restore();
    }
    // the minute hand sweeps the kept half, 00 to 30, printing a screen of the time it covers
    const a = -Math.PI / 2 + sweep * (25 / 30) * Math.PI; // twenty-five minutes of the thirty
    if (sweep > 0.01)
      screen(
        c,
        [0, -R, R + 10, R],
        9,
        45,
        () => 0.42,
        INK.blue,
        () => {
          c.beginPath();
          c.moveTo(6, 0);
          c.arc(6, 0, R * 0.62, -Math.PI / 2, a);
          c.closePath();
        },
      );
    bar(c, [6, 0], [6 + Math.cos(a) * R * 0.74, Math.sin(a) * R * 0.74], 20, INK.blue);
    disc(c, 6, 0, 24, INK.blue);
    // the cut, and what it leaves
    c.save();
    c.setLineDash([22, 16]);
    c.lineWidth = 7;
    c.strokeStyle = INK.blue;
    c.beginPath();
    c.moveTo(-30 * cutp, -R - 40);
    c.lineTo(-30 * cutp, R + 40);
    c.stroke();
    c.restore();
    // one label, at the top of the cut (the portrait keeps its words above the lower margin)
    text(c, "00–25", 20, -R - 18, { size: 32, family: F_.mono, weight: 500, color: INK.blue, alpha: prog(t, 4, 9) });
  },
};

const doorway: Art = {
  pink: (c, t) => {
    // light through the doorway, and on the floor in front of it
    const open = ease.inOutCubic(prog(t, 1, 11));
    screen(
      c,
      [-20, -240, 230, 220],
      10,
      15,
      (_x, y) => open * (0.55 + (0.35 * (y + 240)) / 460),
      INK.pink,
      () => {
        c.beginPath();
        c.rect(-20, -240, 250, 460);
      },
    );
    screen(
      c,
      [-80, 220, 300, 290],
      10,
      15,
      (x, y) => open * clamp(0.75 - (y - 220) / 90 - Math.abs(x - 105) / 400),
      INK.pink,
      () => {
        c.beginPath();
        c.moveTo(-20, 220);
        c.lineTo(230, 220);
        c.lineTo(300, 290);
        c.lineTo(-90, 290);
        c.closePath();
      },
    );
    // a strip of tape on the note
    c.save();
    c.translate(-180, -60);
    c.rotate(-0.1);
    box(c, -44, -14, 44, 14, INK.pink);
    c.restore();
  },
  blue: (c, t) => {
    const open = ease.inOutCubic(prog(t, 1, 11)),
      th = open * 1.95; // the door swings toward us, past square
    // the frame
    box(c, -36, -258, 246, -238, INK.blue);
    box(c, -36, -258, -18, 222, INK.blue);
    box(c, 228, -258, 246, 222, INK.blue);
    box(c, -120, 220, 300, 230, INK.blue);
    // the leaf, hinged on the right post, in perspective as it opens
    const hx = 228,
      w = 248,
      fx = hx - w * Math.cos(th),
      grow = 26 * Math.sin(th);
    fillPts(
      c,
      straight([
        [hx, -238],
        [fx, -238 - grow],
        [fx, 220 + grow],
        [hx, 220],
      ]),
      INK.blue,
    );
    c.save();
    c.globalCompositeOperation = "destination-out";
    circle(c, lerp(hx, fx, 0.86), -10, 12);
    c.fill();
    c.restore();
    // the note, written as we watch
    c.save();
    c.translate(-180, 30);
    c.rotate(-0.06);
    c.lineWidth = 6;
    c.strokeStyle = INK.blue;
    rr(c, -96, -96, 192, 232, 8);
    c.stroke();
    [138, 150, 112, 144, 92].forEach((len, i) => {
      const k = ease.outCubic(prog(t, 1 + i * 1.6, 3 + i * 1.6));
      if (k > 0.01) bar(c, [-66, -52 + i * 36], [-66 + len * k, -52 + i * 36], 9, INK.blue);
    });
    c.restore();
  },
};

// the week: five days, six hours; one hour lights up (the only other place the third ink prints)
const CAL = { x0: -270, y0: -230, w: 540, h: 470, cols: 5, rows: 6, head: 64, days: 50 };
const cell = (col: number, row: number): [number, number, number, number] => {
  const cw = CAL.w / CAL.cols,
    rh = (CAL.h - CAL.head - CAL.days) / CAL.rows,
    x = CAL.x0 + col * cw,
    y = CAL.y0 + CAL.head + CAL.days + row * rh;
  return [x, y, x + cw, y + rh];
};
const BUSY: [number, number][] = [
  [0, 0],
  [0, 1],
  [1, 3],
  [1, 4],
  [2, 0],
  [3, 1],
  [3, 2],
  [3, 3],
  [4, 0],
  [4, 4],
  [4, 5],
  [0, 4],
  [2, 5],
];
const HOUR: [number, number] = [2, 2];
const calendar: Art = {
  yellow: (c, t) => {
    const k = land(t, 3, 3.2, 0.6),
      [x0, y0, x1, y1] = cell(...HOUR),
      cx = (x0 + x1) / 2,
      cy = (y0 + y1) / 2;
    c.save();
    c.translate(cx, cy);
    c.scale(k, k);
    box(c, x0 - cx + 4, y0 - cy + 4, x1 - cx - 4, y1 - cy - 4, INK.yellow);
    c.restore();
  },
  pink: (c, t) => {
    const k = land(t, 5, 3.2, 0.7),
      [x0, y0, x1, y1] = cell(...HOUR);
    screen(
      c,
      [x0, y0, x1, y1],
      9,
      15,
      () => 0.9 * k,
      INK.pink,
      () => {
        c.beginPath();
        c.rect(x0 + 4, y0 + 4, x1 - x0 - 8, y1 - y0 - 8);
      },
    );
    // the rings that hang it on the wall
    for (const x of [-150, 150]) {
      box(c, x - 9, CAL.y0 - 30, x + 9, CAL.y0 + 26, INK.pink);
    }
  },
  blue: (c, t) => {
    const { x0, y0, w, h, head, days } = CAL,
      draw = ease.outCubic(prog(t, 0, 7));
    box(c, x0, y0, x0 + w, y0 + head, INK.blue); // the header band
    c.save();
    c.lineWidth = 6;
    c.strokeStyle = INK.blue;
    rr(c, x0, y0, w, h, 6);
    c.stroke();
    c.restore();
    ["M", "T", "W", "T", "F"].forEach((d, i) =>
      text(c, d, x0 + (i + 0.5) * (w / 5), y0 + head + 38, {
        size: 32,
        family: F_.mono,
        weight: 500,
        color: INK.blue,
        align: "center",
      }),
    );
    for (let i = 1; i < CAL.cols; i++)
      box(
        c,
        x0 + i * (w / 5) - 2,
        y0 + head + days,
        x0 + i * (w / 5) + 2,
        y0 + head + days + (h - head - days) * draw,
        INK.blue,
      );
    for (let j = 0; j <= CAL.rows - 1; j++) {
      const [, y] = cell(0, j);
      box(c, x0, y - 2, x0 + w * draw, y + 2, INK.blue);
    }
    // the busy hours, screened
    BUSY.forEach(([i, j], n) => {
      const [a, b, cc, d] = cell(i, j),
        k = prog(t, 1 + n * 0.3, 4 + n * 0.3);
      if (k > 0)
        screen(
          c,
          [a, b, cc, d],
          9,
          45,
          () => 0.3 * k,
          INK.blue,
          () => {
            c.beginPath();
            c.rect(a + 6, b + 6, cc - a - 12, d - b - 12);
          },
        );
    });
    // the one that works for everyone, ticked
    const [a, b, cc, d] = cell(...HOUR),
      k = ease.outCubic(prog(t, 7, 12));
    if (k > 0) {
      const pts: P[] = [
          [-0.5, 0],
          [-0.12, 0.36],
          [0.55, -0.42],
        ],
        cx = (a + cc) / 2,
        cy = (b + d) / 2,
        s = (d - b) * 0.62;
      const seg1 = clamp(k * 2),
        seg2 = clamp(k * 2 - 1);
      bar(
        c,
        [cx + pts[0]![0] * s, cy + pts[0]![1] * s],
        [cx + lerp(pts[0]![0], pts[1]![0], seg1) * s, cy + lerp(pts[0]![1], pts[1]![1], seg1) * s],
        12,
        INK.blue,
      );
      if (seg2 > 0)
        bar(
          c,
          [cx + pts[1]![0] * s, cy + pts[1]![1] * s],
          [cx + lerp(pts[1]![0], pts[2]![0], seg2) * s, cy + lerp(pts[1]![1], pts[2]![1], seg2) * s],
          12,
          INK.blue,
        );
    }
  },
};

const SLIDES: Slide[] = [
  { id: "cover", no: "", title: ["Five rules", "for calmer", "meetings."], note: "", art: cover },
  {
    id: "outcome",
    no: "1",
    title: ["Start", "with the", "outcome."],
    note: "Put the decision in the invite.",
    art: target,
  },
  { id: "fewer", no: "2", title: ["Invite", "fewer", "people."], note: "Everyone else gets the notes.", art: people },
  {
    id: "half",
    no: "3",
    title: ["Half the", "time you", "planned."],
    note: "Book twenty-five. The work fits.",
    art: halfClock,
  },
  {
    id: "leave",
    no: "4",
    title: ["Write it", "down, then", "leave."],
    note: "Notes out before the chairs cool.",
    art: doorway,
  },
  {
    id: "calendar",
    no: "5",
    title: ["Let the", "calendar do", "the asking."],
    note: "Oriel finds the hour for everyone.",
    art: calendar,
  },
];

export function make(size: Size, id: string): Film {
  const L = layout(size),
    { W, H, u, safe } = L,
    tall = L.tall;
  // per-size design: portrait stacks the words over the picture (the picture may run into the lower margin,
  // the words never do); square sets the picture beside the words
  const D = tall
    ? {
        // portrait: numeral beside the words, the words over the picture (which may run into the lower margin)
        art: { x: W / 2, y: 1046 * u, k: 0.82 },
        num: { x: safe.x, size: 300 * u, beside: true },
        col: { x: safe.x + 196 * u, w: W - 2 * safe.x - 196 * u },
        head: 124 * u,
        note: 36 * u,
        folio: safe.top + 22 * u,
        top: safe.top + 72 * u,
        mid: 0,
        cover: {
          art: { x: W / 2 + 90 * u, y: 1048 * u, k: 0.86 },
          top: safe.top + 72 * u,
          size: 172 * u,
          w: W - 2 * safe.x,
          note: [] as string[],
        },
      }
    : {
        // square: the picture on the left, the numeral stacked over the words on the right
        art: { x: 300 * u, y: 560 * u, k: 0.76 },
        num: { x: 596 * u, size: 190 * u, beside: false },
        col: { x: 596 * u, w: W - safe.x - 596 * u },
        head: 96 * u,
        note: 30 * u,
        folio: safe.top + 40 * u,
        top: 0,
        mid: 560 * u,
        cover: {
          art: { x: 742 * u, y: 752 * u, k: 0.8 },
          top: 158 * u,
          size: 124 * u,
          w: W - 2 * safe.x,
          note: ["Five small habits", "that give the", "week back."],
        },
      };
  const mono =
    (s: string, x: number, y: number, align: CanvasTextAlign = "left", color = INK.blue) =>
    (c: Ctx) =>
      text(c, s, x, y, { size: 22 * u, family: F_.mono, weight: 500, color, align, track: 0.08 });
  /** condensed poster type: Inter 800, set tight and squeezed */
  const cond = (c: Ctx, s: string, x: number, y: number, o: TextOpts, p: number) => {
    c.save();
    c.translate(x, y);
    c.scale(SX, 1);
    letters(c, s, 0, 0, { ...o, align: "left" }, () => p, "rise");
    c.restore();
  };
  const headO = (sz: number): TextOpts => ({ size: sz, family: F_.sans, weight: 800, color: INK.blue, track: -0.035 });
  /** the largest size up to `max` at which every line fits the column */
  const fit = (c: Ctx, lines: string[], max: number, w: number) =>
    Math.min(max, ...lines.map((ln) => (w / (measure(c, ln, headO(100)) * SX)) * 100));

  // where the words sit: the numeral's baseline, the headline's first baseline and leading, the note's baseline
  const block = (c: Ctx, s: Slide) => {
    const size = fit(c, s.title, D.head, D.col.w),
      lead = size * 0.92,
      n = s.title.length - 1;
    // portrait hangs the words from the top of the safe area; square centres the stack beside the picture
    const tall_ =
      D.num.size * 0.72 + 34 * u + size * 0.72 + n * lead + D.note * 1.9 + (s.id === "calendar" ? D.note * 1.7 : 0);
    const top = D.num.beside ? D.top : D.mid - tall_ / 2,
      numBase = top + D.num.size * 0.72;
    const y0 = D.num.beside ? top + size * 0.72 : numBase + 34 * u + size * 0.72;
    return { size, lead, numBase, y0, note: y0 + n * lead + D.note * 1.9 };
  };

  // ---- the words of a slide (the blue drum; the numeral prints on the pink drum)
  const words = (c: Ctx, s: Slide, t: number, idx: number) => {
    // running head: what this is, and where you are in it
    mono(idx ? "FIVE RULES FOR CALMER MEETINGS" : "A FIELD GUIDE FROM ORIEL", safe.x, D.folio)(c);
    mono(idx ? `${idx} / 5` : "NO. 04", W - safe.x, D.folio, "right")(c);
    if (!idx) {
      // the cover: the title set big, 'Oriel' small at the foot of the words
      const size = fit(c, s.title, D.cover.size, D.cover.w),
        lead = size * 0.9,
        y0 = D.cover.top + size * 0.72;
      s.title.forEach((ln, i) => cond(c, ln, safe.x, y0 + i * lead, headO(size), land(t, i * 1.5, 3.4, 0.8)));
      D.cover.note.forEach((ln, i) =>
        text(c, ln, safe.x, y0 + 2 * lead + 110 * u + i * 44 * u, {
          size: 38 * u,
          family: F_.italic,
          color: INK.blue,
          alpha: prog(t, 4, 9),
        }),
      );
      text(c, P_.product, safe.x, H - safe.bottom - (tall ? 24 : 6) * u, {
        size: 30 * u,
        family: F_.sans,
        weight: 800,
        color: INK.blue,
        track: -0.02,
        alpha: prog(t, 4, 9),
      });
      return;
    }
    const b = block(c, s);
    s.title.forEach((ln, i) => cond(c, ln, D.col.x, b.y0 + i * b.lead, headO(b.size), land(t, 1 + i * 1.5, 3.4, 0.8)));
    text(c, s.note, D.col.x, b.note, { size: D.note, family: F_.italic, color: INK.blue, alpha: prog(t, 5, 10) });
    if (idx === 5)
      text(c, P_.url, D.col.x, b.note + D.note * 1.7, {
        size: 26 * u,
        family: F_.mono,
        weight: 500,
        color: INK.blue,
        track: 0.04,
        alpha: prog(t, 7, 12),
      });
  };
  const numeral = (c: Ctx, s: Slide, t: number) => {
    if (!s.no) return;
    cond(
      c,
      s.no,
      D.num.x,
      block(c, s).numBase,
      { size: D.num.size, family: F_.sans, weight: 800, color: INK.pink, track: -0.04 },
      land(t, 0, 3, 0.7),
    );
  };

  // printer's marks at the corners (not type: they may sit in the margin)
  const marks = (c: Ctx) => {
    c.save();
    c.strokeStyle = INK.blue;
    c.lineWidth = 2 * u;
    const m = 34 * u,
      l = 14 * u;
    for (const [x, y] of [
      [m, m],
      [W - m, m],
      [m, H - m],
      [W - m, H - m],
    ] as P[]) {
      c.beginPath();
      c.arc(x, y, 7 * u, 0, Math.PI * 2);
      c.moveTo(x - l, y);
      c.lineTo(x + l, y);
      c.moveTo(x, y - l);
      c.lineTo(x, y + l);
      c.stroke();
    }
    c.restore();
  };

  const paint = (ctx: Ctx, env: Env, F: number) => {
    F = clamp(F, 0, N - 1);
    const idx = Math.min(SLIDES.length - 1, Math.floor(F / BEAT)),
      s = SLIDES[idx]!,
      t = F - idx * BEAT;
    ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, W, H);
    const g = new Gfx(ctx, env, F, RISOLINE);
    // each ink on its own drum: pulled out of register, it springs to where this press always lands it
    const pull = land(t, 0, 2.8, 0.78);
    const off = (k: keyof typeof REG): P => [
      lerp(PULL[k][0], REG[k][0], pull) * u,
      lerp(PULL[k][1], REG[k][1], pull) * u,
    ];
    const A = idx ? D.art : D.cover.art,
      push = 1 + 0.035 * (t / BEAT); // a slow push-in on the picture
    const art = (c: Ctx, f?: (c: Ctx, t: number) => void) => {
      if (!f) return;
      c.save();
      c.translate(A.x, A.y);
      c.scale(A.k * u * push, A.k * u * push);
      c.translate(0, s.art.dy ?? 0);
      f(c, t);
      c.restore();
    };
    const drum = (k: keyof typeof REG, fn: (c: Ctx) => void) =>
      g.group(
        "plain",
        () => {
          g.touch(0, 0, W, H);
          fn(g.cur);
        },
        { blend: "multiply", off: off(k), textures: ["risoSpeck", "risoMottle"] },
      );
    if (s.art.yellow) drum("yellow", (c) => art(c, s.art.yellow));
    drum("pink", (c) => {
      art(c, s.art.pink);
      numeral(c, s, t);
    });
    drum("blue", (c) => {
      art(c, s.art.blue);
      words(c, s, t, idx);
      marks(c);
    });
    // the sheet: fibre and tooth over every ink
    g.paper("paper", 0.12);
    g.paper("coldpress", 0.08);
  };

  const shots: Shot[] = SLIDES.map((s, i) => ({
    id: s.id,
    start: i * BEAT,
    end: (i + 1) * BEAT,
    draw: (ctx, local, env) => paint(ctx, env, i * BEAT + local),
  }));
  return {
    meta: { title: id, W, H, fps: FPS, bpm: BPM, durationFrames: N, raster: "cpu" },
    assets: { images: {}, fonts: P_.assets },
    shots,
  };
}

export const printCarousel = make("portrait", "printCarousel");
export const printCarouselSquare = make("square", "printCarouselSquare");
