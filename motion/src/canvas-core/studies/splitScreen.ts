// STUDY 20 · BEFORE / AFTER (22 s, 30 fps, 120 bpm). One scene in two states behind a divider: BEFORE is warm,
// crowded and off-kilter, AFTER is cool, aligned and quiet. The two states share every object at the same place,
// so the divider is a comparison slider: it draws on, slides to reveal each side, tilts, and finally sweeps all
// the way across so AFTER takes the frame and settles with a spring. Captions are serif word ladders, one per
// side, set beside the panel. Landscape splits left | right; vertical splits top / bottom (a horizontal divider).
// Oriel is a fictional product. Palette "butter" from the neutral pack.
// Brief: series/studies/briefs/split-screen.json · prompt: series/studies/prompts/split-screen.prompt.md
//
// The whole film is one continuous function paint(F) of a (fractional) frame F; the shots only name the sections.
import PACK from "../../../brand/packs/studio/pack.json";
import type { Ctx, Env } from "../core";
import type { Film, Shot } from "../film";
import { motionBlur } from "../kit/blur";
import { ladder, w, type Word } from "../kit/captions";
import { clamp, ease, lerp, prog, spring, track } from "../kit/motion";
import { usePack } from "../kit/pack";
import { beatScore } from "../kit/score";
import { layout, type Size } from "../kit/sizes";
import { letters, measure, text } from "../kit/type";
import { card, check, rr } from "../kit/ui";

const P = usePack(PACK),
  C = P.palette("butter"),
  F_ = P.face;
const FPS = 30,
  BPM = 120,
  N = 660; // a beat is 15 frames, a bar 60
// the timeline, in frames (every cut on a beat)
const T = { week: 60, slider: 210, inbox: 345, sweep: 480, sign: 600 };
const SWEEP = { a: 495, b: 540 }; // the full sweep lands on a beat: the hit
const BEFORE = 0,
  AFTER = 1;
type State = typeof BEFORE | typeof AFTER;

// ---- the week: the same meetings in both states. [day, start hour, length, label, tilt°, dx, dy]
type Block = [number, number, number, string, number, number, number];
const MESSY: Block[] = [
  [0, 9, 1.5, "Sync", -4, -6, 0],
  [0, 9.5, 1, "Standup", 5, 22, 8],
  [0, 13, 2, "Review", -3, 6, 0],
  [1, 10, 1, "1:1", 4, -8, 0],
  [1, 10.5, 1.5, "Planning", -5, 20, 6],
  [2, 11, 1, "Catch-up", 3, -10, 4],
  [3, 14, 1.5, "Retro", -4, 0, 0],
  [3, 14.5, 1, "Vendor call", 6, 20, 10],
  [4, 9.5, 2, "All-hands", -3, -6, 0],
];
const CONFLICTS: [number, number][] = [
  [0, 9.6],
  [1, 10.6],
  [3, 14.6],
]; // where the double-bookings collide: [day, hour]
type Calm = [number, number, number, string, boolean];
const CALM: Calm[] = [
  [0, 9, 1, "Sync", false],
  [1, 10, 1, "1:1", false],
  [2, 14, 1, "Review", false],
  [4, 10, 1, "All-hands", false],
  [1, 13, 3, "Focus", true],
  [3, 9, 3, "Focus", true],
];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
// ---- the inbox: invented senders and subjects (no real people)
const WHO = ["Priya", "Tom", "Ana", "Jules", "Kofi", "Mara", "Sam", "Lena", "Ravi", "Noor", "Eli"];
const SUBJ = [
  "Re: Re: does Thu work?",
  "Fwd: moving our sync",
  "Re: can we do 15:00?",
  "Re: sorry, clash again",
  "Re: Re: Re: next week?",
  "Re: what about Fri?",
  "Re: one more option",
];

export function make(size: Size, id: string): Film {
  const L = layout(size),
    { W, H, u, tall } = L;

  // ---- per-size design. The split axis is x in landscape (divider vertical) and y in vertical (divider
  // horizontal). The panel is the same object in both sizes; the captions sit beside it on each side.
  const panel = { w: 920 * u, h: 760 * u, x: tall ? 80 * u : 500 * u, y: tall ? 530 * u : 160 * u };
  const pc = { x: panel.x + panel.w / 2, y: panel.y + panel.h / 2 };
  const rest = tall ? 910 * u : 960 * u; // the safe band's midline in vertical (220 top, 320 bottom)
  const extent = tall ? H : W;
  const cap = tall
    ? {
        before: { x: 80 * u, y: 236 * u },
        after: { x: 80 * u, y: 1316 * u },
        size: 58 * u,
        fin: { x: 80 * u, y: 1170 * u },
        finSize: 64 * u,
        shift: { x: 0, y: -170 * u },
      }
    : {
        before: { x: 80 * u, y: 330 * u },
        after: { x: 1480 * u, y: 330 * u },
        size: 64 * u,
        fin: { x: 1380 * u, y: 330 * u },
        finSize: 76 * u,
        shift: { x: -150 * u, y: 0 },
      };
  const LAD = { face: F_.serif, italic: F_.italic, ink: C.ink, fps: FPS, gap: 0.1 };

  // ---- the divider: a position along the split axis and a tilt. Pure functions of F.
  // the slider's far stops: nearly the whole panel, leaving room for its overshoot and drift before the captions
  const far = tall ? [panel.y + panel.h - 30 * u, panel.y + 30 * u] : [panel.x + panel.w - 40 * u, panel.x + 40 * u];
  const posRaw = (F: number) => {
    let v = track(
      F,
      FPS,
      [
        [0, rest],
        [T.slider, far[0]!],
        [T.slider + 40, far[1]!],
        [T.slider + 82, rest],
      ],
      { freq: 1.4, damp: 0.74 },
    );
    // the holds breathe: a slow drift that starts and ends at rest
    const hold = (a: number, b: number) => (F > a && F < b ? Math.sin((Math.PI * 2 * (F - a)) / (b - a)) : 0);
    v += 22 * u * hold(T.week, T.slider) + 26 * u * hold(T.slider, T.inbox) - 18 * u * hold(T.inbox, T.sweep);
    const gone = -0.16 * extent; // past the edge (the tilted line must clear the frame too)
    return lerp(v, gone, ease.inOutCubic(prog(F, SWEEP.a, SWEEP.b)));
  };
  const tilt = (F: number) => {
    const vel = (posRaw(F + 0.5) - posRaw(F - 0.5)) / u; // px per frame, design units
    const lean = clamp(vel * 0.0028, -0.15, 0.15),
      held = 0.07 * (spring((F - T.inbox) / FPS, { freq: 1.6, damp: 0.6 }) - spring((F - SWEEP.a) / FPS));
    return lean + held;
  };
  // the line as a function: for landscape x(y), for vertical y(x)
  const lineAt = (d: number, th: number, t: number) => d + (t - (tall ? W / 2 : pc.y)) * Math.tan(th);
  const E = 400 * u;
  const clipHalf = (ctx: Ctx, s: State, d: number, th: number) => {
    ctx.beginPath();
    if (!tall) {
      const x0 = lineAt(d, th, -E),
        x1 = lineAt(d, th, H + E);
      if (s === BEFORE) {
        ctx.moveTo(-E, -E);
        ctx.lineTo(x0, -E);
        ctx.lineTo(x1, H + E);
        ctx.lineTo(-E, H + E);
      } else {
        ctx.moveTo(x0, -E);
        ctx.lineTo(W + E, -E);
        ctx.lineTo(W + E, H + E);
        ctx.lineTo(x1, H + E);
      }
    } else {
      const y0 = lineAt(d, th, -E),
        y1 = lineAt(d, th, W + E);
      if (s === BEFORE) {
        ctx.moveTo(-E, -E);
        ctx.lineTo(W + E, -E);
        ctx.lineTo(W + E, y1);
        ctx.lineTo(-E, y0);
      } else {
        ctx.moveTo(-E, y0);
        ctx.lineTo(W + E, y1);
        ctx.lineTo(W + E, H + E);
        ctx.lineTo(-E, H + E);
      }
    }
    ctx.closePath();
    ctx.clip();
  };

  // ---- small parts
  const pill = (ctx: Ctx, F: number, s: State, x: number, y: number, at: number) => {
    const k = spring((F - at) / FPS, { freq: 2.8, damp: 0.5 });
    if (k <= 0) return;
    const label = s === BEFORE ? "Before" : "After",
      o = { size: 26 * u, family: F_.sans, weight: 600, track: 0.01 },
      tw = measure(ctx, label, o),
      pw = tw + 48 * u,
      ph = 50 * u;
    ctx.save();
    ctx.translate(x + pw / 2, y + ph / 2);
    ctx.scale(k, k);
    ctx.rotate(s === BEFORE ? -0.05 * (1 - prog(F, SWEEP.a, SWEEP.b)) : 0);
    card(ctx, -pw / 2, -ph / 2, pw, ph, { r: ph / 2, fill: s === BEFORE ? C.accent2 : C.accent });
    text(ctx, label, 0, 9 * u, { ...o, color: s === BEFORE ? C.ink : C.surface, align: "center" });
    ctx.restore();
  };
  // a ladder; on the BEFORE side the key word is ink italic on an alarm-colour marker (orange text on the warm
  // wash would not read), on the AFTER side it is the cool accent italic
  const caption = (ctx: Ctx, F: number, s: State, lines: Word[][], x: number, y: number, sz: number, out: number) => {
    if (s === BEFORE) {
      const leave = clamp((F - out) / 8);
      let by = y;
      for (const line of lines) {
        const sizes = line.map((wd) => sz * (wd.scale ?? 1)),
          lh = Math.max(...sizes);
        let cx = x;
        line.forEach((wd, i) => {
          const o = { size: sizes[i]!, family: wd.key ? F_.italic : F_.serif, track: -0.01 },
            ww = measure(ctx, wd.t, o);
          if (wd.key) {
            const g = spring((F - wd.at - 3) / FPS, { freq: 2.6, damp: 0.8 });
            if (g > 0) {
              ctx.save();
              ctx.globalAlpha *= 1 - leave;
              ctx.fillStyle = C.accent2;
              ctx.translate(0, -leave * sz * 0.4);
              rr(ctx, cx - 8 * u, by + lh - sizes[i]! * 0.66, (ww + 16 * u) * g, sizes[i]! * 0.84, 6 * u);
              ctx.fill();
              ctx.restore();
            }
          }
          cx += ww + sz * 0.24;
        });
        by += lh * (1 + LAD.gap);
      }
    }
    ladder(ctx, lines, x, y, F, { ...LAD, size: sz, accent: s === BEFORE ? C.ink : C.accent, out });
  };

  // ---- the panel: header + a body that holds the week or the inbox
  const HEAD = 78 * u;
  const body = { x: panel.x, y: panel.y + HEAD, w: panel.w, h: panel.h - HEAD };
  const grid = { x: body.x + 78 * u, y: body.y + 50 * u, w: body.w - 78 * u - 22 * u, h: body.h - 50 * u - 22 * u };
  const colW = grid.w / 5,
    hourH = grid.h / 8;
  const slot = (day: number, hr: number, len: number) => ({
    x: grid.x + day * colW + 6 * u,
    y: grid.y + (hr - 9) * hourH + 3 * u,
    w: colW - 12 * u,
    h: len * hourH - 6 * u,
  });
  const blockLabel = (ctx: Ctx, label: string, sub: string, x: number, y: number, h: number, ink: string) => {
    text(ctx, label, x + 14 * u, y + 32 * u, { size: 23 * u, family: F_.sans, weight: 600, color: ink, track: -0.01 });
    if (h > 66 * u)
      text(ctx, sub, x + 14 * u, y + 60 * u, { size: 22 * u, family: F_.mono, weight: 500, color: ink, alpha: 0.8 });
  };
  const hhmm = (h: number) => `${Math.floor(h)}:${h % 1 ? "30" : "00"}`;

  const week = (ctx: Ctx, F: number, s: State) => {
    // day heads and the hour grid (shared furniture)
    DAYS.forEach((d, i) =>
      text(ctx, d, grid.x + i * colW + colW / 2, body.y + 34 * u, {
        size: 23 * u,
        family: F_.sans,
        weight: 600,
        color: C.muted,
        align: "center",
      }),
    );
    ctx.fillStyle = C.line;
    for (let h = 0; h <= 8; h++) {
      ctx.fillRect(grid.x, grid.y + h * hourH - u, grid.w, 2 * u);
      if (h % 2 === 0 && h < 8)
        text(ctx, `${9 + h}`, grid.x - 16 * u, grid.y + h * hourH + 24 * u, {
          size: 22 * u,
          family: F_.mono,
          weight: 500,
          color: C.muted,
          align: "right",
        });
    }
    for (let i = 1; i < 5; i++) ctx.fillRect(grid.x + i * colW - u, grid.y, 2 * u, grid.h);
    // now: a line that creeps down Wednesday (the same object on both sides)
    const now = 11.4 + (F / N) * 2.2,
      ny = grid.y + (now - 9) * hourH;
    if (s === BEFORE) {
      MESSY.forEach(([day, hr, len, label, rot, dx, dy], i) => {
        const at = T.week + 4 + i * 6,
          p = spring((F - at) / FPS, { freq: 2.3, damp: 0.36 });
        if (p <= 0) return;
        const b = slot(day, hr, len),
          wob = Math.sin(F * 0.21 + i * 1.9) * 1.4 + Math.sin(F * 0.13 + i) * 0.7;
        ctx.save();
        ctx.globalAlpha *= clamp(p * 3);
        ctx.translate(b.x + b.w / 2 + dx * u, b.y + b.h / 2 + dy * u - (1 - p) * 90 * u);
        ctx.rotate(((rot + wob) * Math.PI) / 180);
        card(ctx, -b.w / 2, -b.h / 2, b.w, b.h, { r: 10 * u, fill: C.accent2, stroke: C.surface, lw: 4 * u });
        ctx.beginPath();
        rr(ctx, -b.w / 2, -b.h / 2, b.w, b.h, 10 * u);
        ctx.clip();
        blockLabel(ctx, label, hhmm(hr), -b.w / 2, -b.h / 2, b.h, C.ink);
        ctx.restore();
      });
      CONFLICTS.forEach(([day, hr], i) => {
        const k = spring((F - (T.week + 70 + i * 8)) / FPS, { freq: 3, damp: 0.4 });
        if (k <= 0) return;
        const x = grid.x + (day + 1) * colW - 10 * u,
          y = grid.y + (hr - 9) * hourH,
          r = 19 * u * k * (1 + 0.08 * Math.sin(F * 0.5 + i));
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = C.ink;
        ctx.fill();
        text(ctx, "!", x, y + 8 * u * k, {
          size: 24 * u * k,
          family: F_.sans,
          weight: 800,
          color: C.accent2,
          align: "center",
        });
      });
      ctx.save();
      ctx.translate(grid.x + 2 * colW, ny);
      ctx.rotate(-0.03);
      ctx.fillStyle = C.accent2;
      ctx.fillRect(0, -2 * u, colW, 4 * u);
      ctx.restore();
    } else {
      // calm: blocks slide into their slots; after the sweep they settle again with a spring
      const settle = (i: number) =>
        1 +
        0.07 *
          (spring((F - (SWEEP.b + 2 + i * 4)) / FPS, { freq: 2.6, damp: 0.35 }) -
            spring((F - (SWEEP.b + 7 + i * 4)) / FPS, { freq: 2.6, damp: 0.35 }));
      CALM.forEach(([day, hr, len, label, focus], i) => {
        const at = T.week + 30 + i * 8,
          p = spring((F - at) / FPS, { freq: 1.8, damp: 0.95 });
        if (p <= 0) return;
        const b = slot(day, hr, len),
          k = settle(i);
        ctx.save();
        ctx.globalAlpha *= clamp(p * 2);
        ctx.translate(b.x + b.w / 2 - (1 - p) * 50 * u, b.y + b.h / 2);
        ctx.scale(k, k);
        if (focus) {
          ctx.save();
          ctx.globalAlpha *= 0.14;
          card(ctx, -b.w / 2, -b.h / 2, b.w, b.h, { r: 10 * u, fill: C.accent });
          ctx.restore();
          ctx.fillStyle = C.accent;
          ctx.fillRect(-b.w / 2, -b.h / 2 + 8 * u, 5 * u, b.h - 16 * u);
          blockLabel(ctx, label, `${hr}–${hr + len}h`, -b.w / 2 + 4 * u, -b.h / 2, b.h, C.accent);
        } else {
          card(ctx, -b.w / 2, -b.h / 2, b.w, b.h, { r: 10 * u, fill: C.accent });
          blockLabel(ctx, label, hhmm(hr), -b.w / 2, -b.h / 2, b.h, C.surface);
        }
        ctx.restore();
      });
      // the booked slot from the inbox lands on Thursday 15:00 once AFTER has the frame
      const bk = spring((F - (SWEEP.b + 14)) / FPS, { freq: 2.2, damp: 0.5 });
      if (bk > 0) {
        const b = slot(3, 15, 1);
        ctx.save();
        ctx.globalAlpha *= clamp(bk * 3);
        ctx.translate(b.x + b.w / 2, b.y + b.h / 2 - (1 - bk) * 160 * u);
        card(ctx, -b.w / 2, -b.h / 2, b.w, b.h, {
          r: 10 * u,
          fill: C.accent,
          shadow: { blur: 24 * u, y: 8 * u, color: "rgba(0,71,255,0.25)" },
        });
        blockLabel(ctx, "Booked", "15:00", -b.w / 2, -b.h / 2, b.h, C.surface);
        check(ctx, b.w / 2 - 26 * u, -b.h / 2 + 24 * u, 22 * u, prog(F, SWEEP.b + 24, SWEEP.b + 36), C.surface, 4 * u);
        ctx.restore();
      }
      ctx.fillStyle = C.accent;
      ctx.fillRect(grid.x + 2 * colW, ny - 2 * u, colW, 4 * u);
      ctx.beginPath();
      ctx.arc(grid.x + 2 * colW, ny, 7 * u, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  // the booked card: where AFTER's answer sits inside the panel (on the AFTER side of the resting divider)
  const answer = tall
    ? { w: 460 * u, h: 220 * u, x: pc.x - 230 * u, y: panel.y + panel.h - 290 * u }
    : { w: 400 * u, h: 230 * u, x: panel.x + panel.w - 440 * u, y: pc.y - 115 * u };
  const ROW = 60 * u;
  const inbox = (ctx: Ctx, F: number, s: State) => {
    if (s === BEFORE) {
      // threads flood in at the top, each one a little crooked; the list keeps creeping
      // c counts arrivals fractionally, so the whole list scrolls down continuously (no per-arrival jumps)
      const c = clamp((F - (T.inbox + 4)) / 2.1 + 1, 0, 31),
        n = Math.ceil(c),
        creep = Math.max(0, F - (T.inbox + 70)) * 0.5 * u;
      for (let k = n - 1; k >= 0; k--) {
        const step = ROW * 0.8, // rows crowd: each one overlaps the next
          y = body.y + 12 * u + (c - 1 - k) * step - creep,
          jit = Math.sin(k * 2.7) * 16 * u;
        if (y > body.y + body.h || y < body.y - ROW) continue;
        ctx.save();
        ctx.translate(body.x + 24 * u + jit, y);
        ctx.rotate(Math.sin(k * 1.3 + F * 0.05) * 0.016);
        card(ctx, 0, 0, body.w - 48 * u, ROW - 8 * u, { r: 10 * u, fill: C.surface, stroke: C.line, lw: 2 * u });
        ctx.beginPath();
        ctx.arc(22 * u, (ROW - 8 * u) / 2, 7 * u, 0, Math.PI * 2);
        ctx.fillStyle = C.accent2;
        ctx.fill();
        text(ctx, WHO[k % WHO.length]!, 44 * u, 34 * u, { size: 23 * u, family: F_.sans, weight: 600, color: C.ink });
        text(ctx, SUBJ[(k * 3) % SUBJ.length]!, 170 * u, 34 * u, { size: 22 * u, family: F_.sans, color: C.muted });
        ctx.restore();
      }
    } else {
      // a few threads arrive, then fold into one answer
      const fold = ease.inOutCubic(prog(F, T.inbox + 30, T.inbox + 48));
      for (let k = 0; k < 5; k++) {
        const a = prog(F, T.inbox + 6 + k * 4, T.inbox + 14 + k * 4) * (1 - prog(fold, 0.6, 1));
        if (a <= 0) continue;
        const y0 = answer.y + answer.h / 2 + (k - 2) * ROW * 1.05 - (ROW - 8 * u) / 2,
          y = lerp(y0, answer.y + answer.h / 2 - (ROW - 8 * u) / 2, fold);
        ctx.save();
        ctx.globalAlpha *= a;
        card(ctx, answer.x, y, answer.w, ROW - 8 * u, { r: 10 * u, fill: C.surface, stroke: C.line, lw: 2 * u });
        ctx.fillStyle = C.line;
        ctx.fillRect(answer.x + 24 * u, y + 20 * u, answer.w * 0.5, 12 * u);
        ctx.restore();
      }
      const k = spring((F - (T.inbox + 44)) / FPS, { freq: 2.4, damp: 0.55 });
      if (k > 0) {
        ctx.save();
        ctx.translate(answer.x + answer.w / 2, answer.y + answer.h / 2);
        ctx.scale(0.6 + 0.4 * k, 0.6 + 0.4 * k);
        ctx.globalAlpha *= clamp(k * 2);
        const x = -answer.w / 2,
          y = -answer.h / 2;
        card(ctx, x, y, answer.w, answer.h, {
          r: 22 * u,
          fill: C.surface,
          stroke: C.accent,
          lw: 3 * u,
          shadow: { blur: 30 * u, y: 10 * u, color: "rgba(0,71,255,0.16)" },
        });
        ctx.beginPath();
        ctx.arc(x + 62 * u, y + 76 * u, 32 * u, 0, Math.PI * 2);
        ctx.fillStyle = C.accent;
        ctx.fill();
        check(ctx, x + 62 * u, y + 78 * u, 30 * u, prog(F, T.inbox + 54, T.inbox + 68), C.surface, 5 * u);
        text(ctx, "Thu 15:00", x + 114 * u, y + 92 * u, {
          size: 50 * u,
          family: F_.sans,
          weight: 800,
          color: C.ink,
          track: -0.03,
        });
        text(ctx, "booked", x + 114 * u, y + 150 * u, { size: 58 * u, family: F_.italic, color: C.accent });
        text(ctx, "6 people · 45 min", x + 116 * u, y + 196 * u, {
          size: 22 * u,
          family: F_.sans,
          color: C.muted,
        });
        ctx.restore();
      }
    }
  };

  // ---- the panel frame and its content; BEFORE sits a little crooked, AFTER is square
  const panelDraw = (ctx: Ctx, F: number, s: State) => {
    const rise = spring((F - 30) / FPS, { freq: 1.8, damp: 0.7 });
    if (rise <= 0) return;
    const swapA = ease.inOutCubic(prog(F, T.inbox - 2, T.inbox + 14)),
      swapB = ease.inOutCubic(prog(F, T.sweep - 2, T.sweep + 12)),
      showInbox = swapA > 0 && swapB < 1,
      showWeek = swapA < 1 || swapB > 0;
    ctx.save();
    ctx.globalAlpha *= clamp(rise * 2);
    ctx.translate(pc.x, pc.y + (1 - rise) * 80 * u);
    if (s === BEFORE) {
      ctx.rotate(-0.022 + Math.sin(F * 0.07) * 0.004);
      ctx.translate(10 * u, 6 * u);
    }
    ctx.translate(-pc.x, -pc.y);
    card(ctx, panel.x, panel.y, panel.w, panel.h, {
      r: 28 * u,
      fill: C.surface,
      stroke: C.line,
      lw: 2 * u,
      shadow: s === AFTER ? { blur: 40 * u, y: 14 * u, color: "rgba(0,71,255,0.10)" } : undefined,
    });
    // header: the title swaps with the content
    const head = (label: string, dy: number, a: number) =>
      text(ctx, label, panel.x + 34 * u, panel.y + 52 * u + dy, {
        size: 32 * u,
        family: F_.sans,
        weight: 600,
        color: C.ink,
        alpha: a,
        track: -0.02,
      });
    ctx.save();
    ctx.beginPath();
    ctx.rect(panel.x, panel.y, panel.w, HEAD);
    ctx.clip();
    const hA = swapA * (1 - swapB);
    head("Week 38", -hA * 60 * u, 1 - hA);
    head("Inbox", (1 - hA) * 60 * u, hA);
    // the header's right side: a status that says the state in one word
    const status =
      hA > 0.5
        ? s === BEFORE
          ? `${clamp(Math.floor((F - (T.inbox + 4)) / 2.1) + 1, 0, 31)} unread`
          : "0 unread"
        : s === BEFORE
          ? "3 clashes"
          : "2 focus blocks";
    const sa = hA > 0.5 ? prog(hA, 0.5, 1) : 1 - prog(hA, 0, 0.5);
    if (F > T.week + 70 || hA > 0.5) {
      const o = { size: 22 * u, family: F_.sans, weight: 600, track: 0.01 },
        tw = measure(ctx, status, o),
        bx = panel.x + panel.w - 34 * u - tw - 32 * u;
      ctx.save();
      ctx.globalAlpha *= sa * (hA > 0.5 ? 1 : prog(F, T.week + 70, T.week + 80));
      card(ctx, bx, panel.y + 22 * u, tw + 32 * u, 40 * u, { r: 20 * u, fill: s === BEFORE ? C.accent2 : C.accent });
      text(ctx, status, bx + 16 * u, panel.y + 49 * u, { ...o, color: s === BEFORE ? C.ink : C.surface });
      ctx.restore();
    }
    ctx.restore();
    ctx.fillStyle = C.line;
    ctx.fillRect(panel.x, panel.y + HEAD - u, panel.w, 2 * u);
    // body: the week and the inbox push past each other
    ctx.save();
    ctx.beginPath();
    ctx.rect(body.x, body.y, body.w, body.h);
    ctx.clip();
    const off = (swapA - swapB) * body.h;
    if (showWeek) {
      ctx.save();
      ctx.translate(0, swapB > 0 ? (1 - swapB) * body.h : -off);
      week(ctx, F, s);
      ctx.restore();
    }
    if (showInbox) {
      ctx.save();
      ctx.translate(0, swapB > 0 ? -swapB * body.h : (1 - swapA) * body.h);
      inbox(ctx, F, s);
      ctx.restore();
    }
    ctx.restore();
    ctx.restore();
  };

  // ---- the captions, one ladder per side, beside the panel
  const S = (at: number) => at; // readability: word times are absolute frames
  const captions = (ctx: Ctx, F: number, s: State) => {
    const c = s === BEFORE ? cap.before : cap.after,
      ly = c.y + 76 * u,
      fin = s === AFTER ? spring((F - SWEEP.b) / FPS, { freq: 1.5, damp: 0.55 }) : 0;
    // after the sweep the AFTER label travels with its side's final caption
    pill(ctx, F, s, lerp(c.x, cap.fin.x, fin), lerp(c.y, cap.fin.y, fin), s === BEFORE ? 22 : 30);
    if (F < T.inbox) {
      const lines =
        s === BEFORE
          ? tall
            ? [
                [w("Nine", S(66)), w("meetings,", S(71))],
                [w("no", S(80)), w("room", S(86), { key: true, scale: 1.5 })],
              ]
            : [
                [w("Nine", S(66))],
                [w("meetings,", S(71))],
                [w("no", S(80)), w("room", S(86), { key: true, scale: 1.5 })],
              ]
          : tall
            ? [
                [w("Four", S(120)), w("meetings,", S(125))],
                [w("two", S(134)), w("hours", S(139)), w("to", S(144)), w("think", S(150), { key: true, scale: 1.5 })],
              ]
            : [
                [w("Four", S(120))],
                [w("meetings,", S(125))],
                [w("two", S(134)), w("hours", S(139))],
                [w("to", S(144)), w("think", S(150), { key: true, scale: 1.5 })],
              ];
      caption(ctx, F, s, lines, c.x, ly, cap.size, T.inbox - 12);
    } else if (F < T.sweep) {
      const lines =
        s === BEFORE
          ? tall
            ? [
                [w("31", S(352)), w("threads", S(357)), w("to", S(362)), w("find", S(367))],
                [w("one", S(374), { key: true, scale: 1.5 }), w("hour", S(380))],
              ]
            : [
                [w("31", S(352)), w("threads", S(357))],
                [w("to", S(362)), w("find", S(367))],
                [w("one", S(374), { key: true, scale: 1.5 }), w("hour", S(380))],
              ]
          : tall
            ? [
                [w("Oriel", S(400)), w("found", S(405))],
                [w("one", S(412)), w("answer", S(418), { key: true, scale: 1.5 })],
              ]
            : [
                [w("Oriel", S(400))],
                [w("found", S(405))],
                [w("one", S(412)), w("answer", S(418), { key: true, scale: 1.5 })],
              ];
      caption(ctx, F, s, lines, c.x, ly, cap.size, T.sweep - 10);
    }
  };
  const finale = (ctx: Ctx, F: number) => {
    const lines = tall
      ? [[w("Everything", S(552)), w("in", S(558)), w("its", S(562))], [w("place", S(568), { key: true, scale: 1.5 })]]
      : [
          [w("Everything", S(552))],
          [w("in", S(558)), w("its", S(562))],
          [w("place", S(568), { key: true, scale: 1.5 })],
        ];
    ladder(ctx, lines, cap.fin.x, cap.fin.y + 76 * u, F, {
      ...LAD,
      size: cap.finSize,
      accent: C.accent,
      out: T.sign - 4,
    });
  };

  // ---- the sign-off: the panel steps back, the product name rises, the divider returns as its underline
  const signOff = (ctx: Ctx, F: number) => {
    const f = F - T.sign,
      o = { size: 200 * u, family: F_.sans, weight: 800, color: C.ink, align: "left" as const, track: -0.05 },
      wm = measure(ctx, P.product, o),
      mid = tall ? rest : H / 2,
      base = mid - 10 * u,
      x0 = W / 2 - wm / 2,
      push = 1 + 0.04 * ease.outCubic(prog(F, T.sign, N));
    ctx.save();
    ctx.translate(W / 2, mid);
    ctx.scale(push, push);
    ctx.translate(-W / 2, -mid);
    letters(ctx, P.product, x0, base, o, (i) => spring((f - 4 - i * 2.5) / FPS, { freq: 2.4, damp: 0.72 }), "rise");
    const rule = ease.outCubic(prog(F, T.sign + 10, T.sign + 30));
    ctx.fillStyle = C.accent;
    ctx.fillRect(x0, base + 30 * u, wm * rule, 8 * u);
    ladder(
      ctx,
      [[w("same", T.sign + 18), w("week,", T.sign + 22), w("calmer", T.sign + 28, { key: true, scale: 1.4 })]],
      W / 2,
      base + 60 * u,
      F,
      {
        ...LAD,
        size: 64 * u,
        accent: C.accent,
        align: "center",
      },
    );
    text(ctx, P.url, W / 2, base + 230 * u, {
      size: 22 * u,
      family: F_.mono,
      weight: 500,
      color: C.muted,
      align: "center",
      alpha: prog(F, T.sign + 34, T.sign + 46),
      track: 0.04,
    });
    ctx.restore();
  };

  // ---- the frame
  const paint = (ctx: Ctx, env: Env, F: number) => {
    F = clamp(F, 0, N - 1);
    ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
    ctx.fillStyle = C.ground;
    ctx.fillRect(0, 0, W, H);
    const d = posRaw(F),
      th = tilt(F),
      washIn = prog(F, 2, 24),
      // after the sweep the panel moves to its final place with a spring, then steps back for the sign-off
      fin = spring((F - SWEEP.b) / FPS, { freq: 1.5, damp: 0.55 }),
      out = ease.inCubic(prog(F, T.sign - 2, T.sign + 14));
    for (const s of [BEFORE, AFTER] as State[]) {
      ctx.save();
      clipHalf(ctx, s, d, th);
      ctx.save();
      ctx.globalAlpha = washIn * (s === BEFORE ? 0.16 : 1);
      ctx.fillStyle = s === BEFORE ? C.accent2 : C.surface;
      ctx.fillRect(0, 0, W, H);
      if (s === AFTER) {
        ctx.globalAlpha = washIn * 0.06;
        ctx.fillStyle = C.accent;
        ctx.fillRect(0, 0, W, H);
      }
      ctx.restore();
      if (F < T.sign + 16) {
        ctx.save();
        ctx.translate(cap.shift.x * fin, cap.shift.y * fin - out * 60 * u);
        ctx.globalAlpha *= 1 - out;
        // a slow push-in on the panel keeps every hold alive
        const z = 1 + 0.03 * Math.sin((Math.PI * F) / N);
        ctx.translate(pc.x, pc.y);
        ctx.scale(z * (1 - 0.08 * out), z * (1 - 0.08 * out));
        ctx.translate(-pc.x, -pc.y);
        panelDraw(ctx, F, s);
        ctx.restore();
        captions(ctx, F, s);
        if (s === AFTER && F >= SWEEP.b) finale(ctx, F);
      }
      if (s === AFTER && F >= T.sign) signOff(ctx, F);
      ctx.restore();
    }
    divider(ctx, F, d, th);
  };

  // ---- the divider: an ink rule with a slider handle while it moves
  const divider = (ctx: Ctx, F: number, d: number, th: number) => {
    const draw = ease.inOutCubic(prog(F, 0, 24));
    if (draw <= 0) return;
    const len = tall ? W : H;
    ctx.save();
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 5 * u;
    ctx.lineCap = "round";
    ctx.beginPath();
    const a = -E * 0.2,
      b = lerp(a, len + E * 0.2, draw);
    if (tall) {
      ctx.moveTo(a, lineAt(d, th, a));
      ctx.lineTo(b, lineAt(d, th, b));
    } else {
      ctx.moveTo(lineAt(d, th, a), a);
      ctx.lineTo(lineAt(d, th, b), b);
    }
    ctx.stroke();
    // the draw-on tip
    if (draw < 1) {
      const tx = tall ? b : lineAt(d, th, b),
        ty = tall ? lineAt(d, th, b) : b;
      ctx.beginPath();
      ctx.arc(tx, ty, 10 * u, 0, Math.PI * 2);
      ctx.fillStyle = C.ink;
      ctx.fill();
    }
    // the handle: on the line, at the panel's middle, while the divider is being dragged
    const hk =
      spring((F - (T.slider - 8)) / FPS, { freq: 2.6, damp: 0.55 }) -
      spring((F - (T.inbox - 12)) / FPS, { freq: 2.6, damp: 0.9 }) +
      spring((F - (SWEEP.a - 12)) / FPS, { freq: 2.6, damp: 0.55 });
    if (hk > 0.01) {
      const t = tall ? pc.x : pc.y,
        hx = tall ? t : lineAt(d, th, t),
        hy = tall ? lineAt(d, th, t) : t,
        r = 34 * u * hk;
      ctx.translate(hx, hy);
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = C.ink;
      ctx.fill();
      // two chevrons pointing along the split axis
      ctx.strokeStyle = C.surface;
      ctx.lineWidth = 4 * u;
      ctx.lineJoin = "round";
      const c = r * 0.32,
        g = r * 0.34;
      ctx.beginPath();
      if (tall) {
        ctx.moveTo(-c, -g + c * 0.6);
        ctx.lineTo(0, -g - c * 0.4);
        ctx.lineTo(c, -g + c * 0.6);
        ctx.moveTo(-c, g - c * 0.6);
        ctx.lineTo(0, g + c * 0.4);
        ctx.lineTo(c, g - c * 0.6);
      } else {
        ctx.moveTo(-g + c * 0.6, -c);
        ctx.lineTo(-g - c * 0.4, 0);
        ctx.lineTo(-g + c * 0.6, c);
        ctx.moveTo(g - c * 0.6, -c);
        ctx.lineTo(g + c * 0.4, 0);
        ctx.lineTo(g - c * 0.6, c);
      }
      ctx.stroke();
    }
    ctx.restore();
  };

  const cuts = [0, T.week, T.slider, T.inbox, T.sweep, T.sign, N],
    names = ["hook", "week", "slider", "inbox", "sweep", "signoff"];
  const shots: Shot[] = names.map((sid, i) => ({
    id: sid,
    start: cuts[i]!,
    end: cuts[i + 1]!,
    draw: (ctx, local, env) =>
      motionBlur(ctx, env, (c, dt) => paint(c, env, cuts[i]! + local + dt), { samples: 4, shutter: 0.5 }),
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
      // a slide on every divider move: the draw-on, the three slider moves, the tilt, the sweep
      whooshes: [22, T.slider + 14, T.slider + 54, T.slider + 96, T.inbox + 12, SWEEP.b],
      hits: [SWEEP.b, T.sign],
      ticks: [22, 30, T.week + 70, T.week + 78, T.week + 86, T.inbox + 44, T.inbox + 58, SWEEP.b + 18],
      sign: T.sign + 6,
      gain: 0.7,
    }),
  };
}

export const splitScreen = make("vertical", "splitScreen");
export const splitScreenLandscape = make("landscape", "splitScreenLandscape");
