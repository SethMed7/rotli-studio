// STUDY 01 · MOTION RÉSUMÉ (15 s, 60 fps). A motion designer's reel for a fictional studio, in one accent on
// a dark ground: an easing curve, kinetic type, a UI moment, a chart, a block wave, a particle spiral and a
// lockup, each cut on the beat. One source, designed for landscape and vertical. Brand: the neutral pack.
// Brief: series/studies/briefs/motion-resume.json · prompt: series/studies/prompts/motion-resume.prompt.md
//
// The whole film is one continuous function paint(F) of a (fractional) frame F, so motion blur can sample
// inside the shutter; the shots only name the sections on the timeline.
import PACK from "../../../brand/packs/studio/pack.json";
import type { Ctx, Env } from "../core";
import type { Film, Shot } from "../film";
import { motionBlur } from "../kit/blur";
import { blockGrid, project, spiral } from "../kit/depth";
import { bezier, clamp, ease, lerp, prog, spring, track } from "../kit/motion";
import { usePack } from "../kit/pack";
import { beatScore } from "../kit/score";
import { layout, type Size } from "../kit/sizes";
import { letters, measure, text } from "../kit/type";
import { card, check, toggle } from "../kit/ui";

const P = usePack(PACK),
  C = P.palette("night"),
  F_ = P.face;
const FPS = 60,
  BPM = 120,
  N = 900; // a beat is 30 frames, a bar 120
// the timeline, in frames (every cut on a beat)
const T = {
  curve: 90,
  type: 210,
  timing: 270,
  feeling: 330,
  ui: 390,
  chart: 510,
  blocks: 630,
  galaxy: 750,
  lockup: 840,
};
const SECTIONS: [number, string][] = [
  [0, "00 HOOK"],
  [T.curve, "01 EASING"],
  [T.type, "02 TYPE"],
  [T.ui, "03 INTERFACE"],
  [T.chart, "04 DATA"],
  [T.blocks, "05 SPACE"],
  [T.galaxy, "06 PARTICLES"],
  [T.lockup, "07 SIGN-OFF"],
];
const STARS = spiral(11, 3200, 3);

export function make(size: Size, id: string): Film {
  const L = layout(size),
    { W, H, u, cx, cy } = L;
  const mono =
    (s: string, x: number, y: number, align: CanvasTextAlign = "left", color = C.muted) =>
    (ctx: Ctx) =>
      text(ctx, s, x, y, { size: 19 * u, family: F_.mono, weight: 500, color, align, track: 0.06 });

  // ---- the HUD: corner labels, a timecode and a progress rule (quiet; it frames every section)
  const hud = (ctx: Ctx, F: number) => {
    const a = prog(F, 10, 40),
      m = 56 * u,
      top = (L.tall ? 150 : 54) * u,
      bot = H - (L.tall ? 170 : 50) * u;
    const section = [...SECTIONS].reverse().find(([s]) => F >= s)![1],
      secs = Math.floor(F / FPS),
      fr = Math.floor(F % FPS);
    ctx.save();
    ctx.globalAlpha = a;
    mono("MOTION RÉSUMÉ", m, top)(ctx);
    mono(`${W} × ${H} · 60 FPS`, W - m, top, "right")(ctx);
    mono(`00:${String(secs).padStart(2, "0")}:${String(fr).padStart(2, "0")}`, m, bot)(ctx);
    mono(section, W - m, bot, "right", C.ink)(ctx);
    ctx.fillStyle = C.line;
    ctx.fillRect(m, bot + 18 * u, W - 2 * m, 2 * u);
    ctx.fillStyle = C.accent;
    ctx.fillRect(m, bot + 18 * u, (W - 2 * m) * clamp(F / (N - 1)), 2 * u);
    ctx.restore();
  };
  const dot = (ctx: Ctx, x: number, y: number, r: number, color = C.accent) => {
    if (r <= 0) return;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  };

  // ---- 00 hook + 01 easing: a dot, then the curve it moves on
  const box = { w: 760 * u, h: 430 * u },
    bx = cx - box.w / 2,
    by = cy + box.h / 2; // curve origin (bottom left)
  const handles = (F: number) => ({
    x1: track(
      F,
      FPS,
      [
        [0, 0.25],
        [T.curve + 20, 0.2],
        [T.curve + 70, 0.3],
      ],
      { freq: 2, damp: 0.6 },
    ),
    y1: track(
      F,
      FPS,
      [
        [0, 0.25],
        [T.curve + 20, 0.9],
        [T.curve + 70, 1.45],
      ],
      { freq: 2, damp: 0.6 },
    ),
    x2: track(
      F,
      FPS,
      [
        [0, 0.75],
        [T.curve + 20, 0.2],
        [T.curve + 70, 0.35],
      ],
      { freq: 2, damp: 0.6 },
    ),
    y2: track(
      F,
      FPS,
      [
        [0, 0.75],
        [T.curve + 20, 1],
        [T.curve + 70, 1],
      ],
      { freq: 2, damp: 0.6 },
    ),
  });
  const pt = (x: number, y: number): [number, number] => [bx + x * box.w, by - y * box.h];
  const curve = (ctx: Ctx, F: number) => {
    const h = handles(F),
      draw = F < T.curve ? ease.outCubic(prog(F, 40, T.curve)) : 1,
      out = 1 - prog(F, T.type - 16, T.type);
    ctx.save();
    ctx.globalAlpha = out;
    // the frame of the graph
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 2 * u;
    ctx.setLineDash([6 * u, 10 * u]);
    ctx.strokeRect(bx, by - box.h, box.w, box.h);
    ctx.setLineDash([]);
    const p0 = pt(0, 0),
      p1 = pt(h.x1, h.y1),
      p2 = pt(h.x2, h.y2),
      p3 = pt(1, 1),
      ha = prog(F, T.curve - 20, T.curve + 10);
    // handles
    ctx.globalAlpha = out * ha;
    ctx.strokeStyle = C.muted;
    ctx.lineWidth = 2 * u;
    ctx.beginPath();
    ctx.moveTo(...p0);
    ctx.lineTo(...p1);
    ctx.moveTo(...p3);
    ctx.lineTo(...p2);
    ctx.stroke();
    for (const [x, y] of [p1, p2]) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.PI / 4);
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 2.5 * u;
      ctx.strokeRect(-9 * u, -9 * u, 18 * u, 18 * u);
      ctx.restore();
    }
    // the curve, drawn on
    ctx.globalAlpha = out;
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 4 * u;
    ctx.lineCap = "round";
    ctx.beginPath();
    const at = (t: number): [number, number] => {
      const m = 1 - t;
      return [
        m * m * m * p0[0] + 3 * m * m * t * p1[0] + 3 * m * t * t * p2[0] + t * t * t * p3[0],
        m * m * m * p0[1] + 3 * m * m * t * p1[1] + 3 * m * t * t * p2[1] + t * t * t * p3[1],
      ];
    };
    for (let i = 0; i <= 80 * draw; i++) {
      const [x, y] = at(i / 80);
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.stroke();
    // the live value: a dot riding the curve + its readout
    if (F >= T.curve) {
      const t = ((F - T.curve) % 60) / 60,
        [x, y] = at(t),
        yv = bezier(h.x1, h.y1, h.x2, h.y2)(t);
      dot(ctx, x, y, 11 * u);
      ctx.fillStyle = C.line;
      ctx.fillRect(bx + box.w + 50 * u, by - box.h, 6 * u, box.h);
      dot(ctx, bx + box.w + 53 * u, by - clamp(yv, -0.2, 1.6) * box.h, 9 * u, C.ink);
      mono(
        `cubic-bezier(${h.x1.toFixed(2)}, ${h.y1.toFixed(2)}, ${h.x2.toFixed(2)}, ${h.y2.toFixed(2)})`,
        bx,
        by + 44 * u,
        "left",
        C.ink,
      )(ctx);
    }
    ctx.restore();
  };
  const hook = (ctx: Ctx, F: number) => {
    // the dot lands at frame 0 with an overshoot, rings once, then slides to the curve's start
    const s = spring(F / FPS, { freq: 2.8, damp: 0.42 }),
      slide = ease.inOutCubic(prog(F, 44, 84)),
      [sx, sy] = pt(0, 0);
    const x = lerp(cx, sx, slide),
      y = lerp(cy, sy, slide);
    const ring = prog(F, 2, 46);
    if (ring < 1) {
      ctx.save();
      ctx.globalAlpha = (1 - ring) * 0.8;
      ctx.strokeStyle = C.accent;
      ctx.lineWidth = 3 * u;
      ctx.beginPath();
      ctx.arc(cx, cy, 30 * u + ring * 320 * u, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    if (F < T.curve + 1) dot(ctx, x, y, (6 + 16 * s) * u * (1 - 0.4 * slide));
  };

  // ---- 02 type: three words cut on the beat; every i is dotted with the accent
  const word = (
    ctx: Ctx,
    F: number,
    s: string,
    start: number,
    family: string,
    weight: number,
    sz: number,
    how: "rise" | "drop" | "scale",
  ) => {
    const o = {
        size: sz * u,
        family,
        weight,
        color: C.ink,
        align: "center" as const,
        track: family === F_.sans ? -0.045 : -0.01,
      },
      base = cy + sz * 0.33 * u;
    const f = F - start,
      push = 1 + 0.06 * ease.outCubic(prog(f, 0, 60)); // a slow push-in keeps every hold alive
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(push, push);
    ctx.translate(-cx, -cy);
    letters(
      ctx,
      s,
      cx,
      base,
      o,
      (i) => spring((f - i * (how === "drop" ? 4 : 2)) / FPS, { freq: 2.6, damp: how === "drop" ? 0.5 : 0.75 }),
      how,
    );
    // accent tittles on the dotless ı
    const total = measure(ctx, s, o),
      left = cx - total / 2;
    [...s].forEach((ch, i) => {
      if (ch !== "ı") return;
      // the glyph starts one tracking step after its prefix; an italic's tittle sits up the slant, to the right
      const sans = family === F_.sans,
        k = spring((f - i * 2 - 8) / FPS, { freq: 3, damp: 0.45 });
      const x =
        left +
        measure(ctx, s.slice(0, i), o) +
        (i ? o.track * o.size : 0) +
        measure(ctx, "ı", o) / 2 +
        (sans ? 0 : 0.06 * o.size);
      dot(ctx, x, base - o.size * (sans ? 0.7 : 0.61), o.size * (sans ? 0.075 : 0.05) * k);
    });
    ctx.restore();
  };
  const typeSection = (ctx: Ctx, F: number) => {
    if (F < T.timing) word(ctx, F, "motıon", T.type, F_.sans, 800, 250, "rise");
    else if (F < T.feeling) word(ctx, F, "tımıng", T.timing, F_.sans, 800, 250, "drop");
    else {
      // "feeling" holds, then folds into one dot that becomes the switch
      const fold = ease.inCubic(prog(F, T.ui - 22, T.ui));
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(1 - fold, 1 - fold);
      ctx.translate(-cx, -cy);
      word(ctx, F, "feelıng", T.feeling, F_.italic, 400, 300, "scale");
      ctx.restore();
      if (fold > 0) dot(ctx, cx, cy, 18 * u * fold);
    }
  };

  // ---- 03 interface: the dot becomes a switch, the switch turns on and opens into a toast
  const uiSection = (ctx: Ctx, F: number) => {
    const grow = spring((F - T.ui) / FPS, { freq: 2.4, damp: 0.6 }),
      on = spring((F - (T.ui + 30)) / FPS, { freq: 3, damp: 0.7 });
    const open = ease.inOutExpo(prog(F, T.ui + 52, T.ui + 82)),
      leave = ease.inCubic(prog(F, T.chart - 18, T.chart));
    const tw = 170 * u;
    if (open <= 0) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(grow, grow);
      toggle(ctx, -tw / 2, -tw * 0.28, tw, on, { off: C.line, on: C.accent, knob: C.ink });
      ctx.restore();
      return;
    }
    const w = lerp(tw, 640 * u, open),
      h = lerp(tw * 0.56, 132 * u, open),
      y = cy - h / 2 + leave * 260 * u;
    ctx.save();
    ctx.globalAlpha = 1 - leave;
    card(ctx, cx - w / 2, y, w, h, {
      r: (h / 2) * (1 - open) + 26 * u * open,
      fill: C.accent,
      shadow: { blur: 60 * u, y: 20 * u, color: "rgba(255,75,43,0.35)" },
    });
    const ca = prog(F, T.ui + 74, T.ui + 92);
    if (ca > 0) {
      ctx.globalAlpha = (1 - leave) * ca;
      text(ctx, "Render complete", cx - w / 2 + 44 * u, y + 60 * u, {
        size: 36 * u,
        family: F_.sans,
        weight: 600,
        color: C.ink,
        track: -0.02,
      });
      text(ctx, "900 frames · 0 dropped · 60 fps", cx - w / 2 + 44 * u, y + 98 * u, {
        size: 20 * u,
        family: F_.mono,
        weight: 500,
        color: "rgba(243,239,232,0.75)",
      });
      const kx = cx + w / 2 - 70 * u,
        ky = y + h / 2;
      ctx.beginPath();
      ctx.arc(kx, ky, 34 * u, 0, Math.PI * 2);
      ctx.fillStyle = C.ink;
      ctx.fill();
      check(ctx, kx, ky, 34 * u, prog(F, T.ui + 84, T.ui + 104), C.accent, 6 * u);
    }
    ctx.restore();
  };

  // ---- 04 data: a velocity bell becomes a position curve; one bar carries the accent
  const NB = 17,
    chartW = (L.tall ? 880 : 1000) * u,
    bw = (chartW / NB) * 0.62,
    base = cy + 170 * u;
  const chartSection = (ctx: Ctx, F: number) => {
    const morph = (i: number) => spring((F - (T.chart + 58) - i * 1.5) / FPS, { freq: 2.2, damp: 0.7 }),
      flat = ease.inCubic(prog(F, T.blocks - 20, T.blocks));
    const vel = (i: number) => Math.exp(-(((i - 8) / 3.2) ** 2)),
      pos = (i: number) => {
        let s = 0;
        for (let k = 0; k <= i; k++) s += vel(k);
        return s / 5.67;
      };
    ctx.fillStyle = C.line;
    ctx.fillRect(cx - chartW / 2, base, chartW * (1 - flat), 2 * u);
    for (let i = 0; i < NB; i++) {
      const rise = spring((F - T.chart - 6 - i * 2) / FPS, { freq: 2.4, damp: 0.62 }),
        m = morph(i);
      const hgt = lerp(vel(i), pos(i), m) * (L.tall ? 480 : 360) * u * rise * (1 - flat),
        x = cx - chartW / 2 + (i + 0.5) * (chartW / NB) - bw / 2;
      const accent = m < 0.5 ? i === 8 : i === NB - 1;
      ctx.fillStyle = accent ? C.accent : C.ink;
      ctx.fillRect(x, base - hgt, bw, hgt);
    }
    const label = (s: string, a: number) => {
      if (a > 0)
        text(ctx, s, cx - chartW / 2, base - (L.tall ? 540 : 400) * u, {
          size: 64 * u,
          family: F_.italic,
          color: C.ink,
          alpha: a * (1 - flat),
        });
    };
    const swap = prog(F, T.chart + 52, T.chart + 66);
    label("velocity", prog(F, T.chart + 8, T.chart + 24) * (1 - swap));
    label("position", swap);
  };

  // ---- 05 space: a block field with a wave running through it and a ring of accent blocks
  const blocksSection = (ctx: Ctx, F: number) => {
    const t = (F - T.blocks) / FPS,
      n = 14,
      zoom = lerp(0.9, 1.12, ease.inOutCubic(prog(F, T.blocks, T.galaxy))),
      out = ease.inCubic(prog(F, T.galaxy - 24, T.galaxy));
    const s = 34 * u * zoom * (L.tall ? 1.3 : 1);
    ctx.save();
    ctx.globalAlpha = 1 - out;
    blockGrid(
      ctx,
      cx,
      cy + 40 * u,
      n,
      n,
      s,
      (i, j) => {
        const d = Math.hypot(i - (n - 1) / 2, j - (n - 1) / 2),
          up = spring(t - d * 0.035, { freq: 2, damp: 0.7 });
        return (0.35 + 0.9 * (0.5 + 0.5 * Math.sin(d * 0.9 - t * 5.5)) * clamp(t * 1.5)) * up * (1 - out);
      },
      (i, j) => (Math.abs(Math.hypot(i - (n - 1) / 2, j - (n - 1) / 2) - 3.4) < 0.55 ? C.accent : "#e8e3da"),
    );
    ctx.restore();
  };

  // ---- 06 particles: a spiral galaxy tilts toward us, then falls into one point
  const galaxySection = (ctx: Ctx, F: number) => {
    const t = (F - T.galaxy) / FPS,
      born = ease.outCubic(prog(F, T.galaxy - 10, T.galaxy + 20)),
      fall = ease.inCubic(prog(F, T.lockup - 34, T.lockup));
    const cam = {
      yaw: 0,
      pitch: lerp(1.15, 0.55, ease.inOutCubic(prog(F, T.galaxy, T.lockup))),
      dist: 3.2,
      focal: (L.tall ? 1300 : 1000) * u,
      cx,
      cy,
    };
    for (const p of STARS) {
      const r = p.r * 1.7 * born * (1 - fall),
        a = p.a + t * p.speed * 1.4 + fall * 3;
      const q = project([Math.cos(a) * r, p.y, Math.sin(a) * r], cam),
        sz = p.size * q.k * 0.0036 * u * (1 + 1.4 * (1 - p.r));
      ctx.globalAlpha = clamp(0.25 + 0.75 * (1 - p.r)) * born;
      ctx.fillStyle = p.hot ? C.accent : C.ink;
      ctx.fillRect(q.x - sz, q.y - sz * 0.6, sz * 2.4, sz * 1.2);
    }
    ctx.globalAlpha = 1;
    if (fall > 0.6) dot(ctx, cx, cy, 16 * u * prog(fall, 0.6, 1));
  };

  // ---- 07 sign-off: the point becomes the full stop of the wordmark
  const lockupSection = (ctx: Ctx, F: number) => {
    const o = { size: 190 * u, family: F_.sans, weight: 800, color: C.ink, align: "left" as const, track: -0.05 },
      w = measure(ctx, P.product, o),
      dr = 22 * u;
    const x0 = cx - (w + dr * 2.4) / 2,
      base = cy + 60 * u,
      f = F - T.lockup;
    const land = ease.outCubic(prog(F, T.lockup, T.lockup + 16)),
      dx = lerp(cx, x0 + w + dr * 1.4, land),
      dy = lerp(cy, base - dr, land);
    letters(ctx, P.product, x0, base, o, (i) => spring((f - 6 - i * 2.5) / FPS, { freq: 2.4, damp: 0.75 }), "rise");
    dot(ctx, dx, dy, dr * (0.8 + 0.2 * spring(f / FPS, { freq: 3, damp: 0.4 })));
    const a = prog(F, T.lockup + 24, T.lockup + 40);
    text(ctx, "Motion study 01", x0 + 6 * u, base + 64 * u, {
      size: 30 * u,
      family: F_.sans,
      weight: 600,
      color: C.ink,
      alpha: a,
      track: -0.01,
    });
    text(
      ctx,
      "designing the in-between",
      x0 +
        6 * u +
        measure(ctx, "Motion study 01", { size: 30 * u, family: F_.sans, weight: 600, track: -0.01 }) +
        22 * u,
      base + 64 * u,
      { size: 32 * u, family: F_.italic, color: C.muted, alpha: a },
    );
  };

  const paint = (ctx: Ctx, env: Env, F: number) => {
    F = clamp(F, 0, N - 1);
    ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
    ctx.fillStyle = C.ground;
    ctx.fillRect(0, 0, W, H);
    // a faint grid gives the dark ground a surface to move over
    ctx.fillStyle = "rgba(255,255,255,0.028)";
    for (let x = (W / 2) % (60 * u); x < W; x += 60 * u)
      for (let y = (H / 2) % (60 * u); y < H; y += 60 * u) ctx.fillRect(x - u, y - u, 2 * u, 2 * u);
    if (F < T.type) {
      curve(ctx, F);
      hook(ctx, F);
    } else if (F < T.ui) typeSection(ctx, F);
    else if (F < T.chart) uiSection(ctx, F);
    else if (F < T.blocks) chartSection(ctx, F);
    else if (F < T.galaxy) blocksSection(ctx, F);
    else if (F < T.lockup) galaxySection(ctx, F);
    else lockupSection(ctx, F);
    if (L.tall) chapter(ctx, F);
  };
  // the vertical cut uses its height: each section is named large, in the serif, above the action
  const CHAPTERS: [number, number, string][] = [
    [T.curve, T.type, "easing"],
    [T.ui, T.chart, "interface"],
    [T.blocks, T.galaxy, "space"],
    [T.galaxy, T.lockup - 30, "particles"],
  ];
  const chapter = (ctx: Ctx, F: number) => {
    const c = CHAPTERS.find(([a, b]) => F >= a && F < b);
    if (!c) return;
    const a = Math.min(prog(F, c[0], c[0] + 14), 1 - prog(F, c[1] - 14, c[1]));
    ctx.save();
    ctx.translate(0, (1 - ease.outCubic(prog(F, c[0], c[0] + 20))) * 30 * u);
    text(ctx, c[2], cx, cy - 610 * u, { size: 96 * u, family: F_.italic, color: C.ink, align: "center", alpha: a });
    text(ctx, SECTIONS.find(([s]) => s === c[0])![1].slice(0, 2), cx, cy - 720 * u, {
      size: 22 * u,
      family: F_.mono,
      weight: 500,
      color: C.accent,
      align: "center",
      alpha: a,
      track: 0.1,
    });
    ctx.restore();
  };
  const cuts = [0, T.curve, T.type, T.ui, T.chart, T.blocks, T.galaxy, T.lockup, N],
    names = ["hook", "easing", "type", "interface", "data", "space", "particles", "signoff"];
  const shots: Shot[] = names.map((sid, i) => ({
    id: sid,
    start: cuts[i]!,
    end: cuts[i + 1]!,
    draw: (ctx, local, env) => {
      motionBlur(ctx, env, (c, dt) => paint(c, env, cuts[i]! + local + dt), { samples: 4, shutter: 0.5 });
      // the HUD is read, not watched: drawn once, sharp, on top of the blurred frame
      ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
      hud(ctx, cuts[i]! + local);
    },
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
      drop: T.type,
      hits: [T.type, T.ui, T.blocks],
      whooshes: [T.type, T.galaxy, T.lockup],
      ticks: [T.ui + 30, T.ui + 84, T.timing, T.feeling],
      sign: T.lockup + 6,
    }),
  };
}

export const motionResume = make("landscape", "motionResume");
export const motionResumeVertical = make("vertical", "motionResumeVertical");
