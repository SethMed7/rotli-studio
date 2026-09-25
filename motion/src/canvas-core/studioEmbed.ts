// STUDIO EMBED — the link preview of studio.rotli.co: a still card (og 1200x630) and a muted, looping teaser
// (og-video 1280x720). Setup: the film's sunset island. Turn: prints hang on a line across the bay, like a darkroom
// on the beach. Payoff: every print is a live frame of a real piece (the film, Season One, a study), so the
// preview IS the studio. Token: the clapperboard at the quokka's feet.
//
// Everything is drawn in the island's logical 1920x1080 units; each format is a camera onto that world. The
// teaser is a 240-frame (8 s, 16 beats) loop: every moving thing is a periodic function of f mod 240, so frame 0
// is the frame after 239.
//
// Cue table (teaser, frames; 15-frame beat):
//   0-240   world alive: clouds sway, water tiles by one period, glints, foam laps twice, beam sweeps once
//   15+30i  print i (0..3) develops its first clip; +120 its second (8 clips, never a swap on frame 0)
//   60-120  the quokka waves; 150-165 a hop on the spot; back to base by 180
import type { Ctx, Env } from "./core";
import type { Film } from "./film";
import { rotliStory } from "./rotliStory";
import { s01e01Arrival } from "./s01e01Arrival";
import { s01e05LighthouseKeeper } from "./s01e05LighthouseKeeper";
import { s01e09OtherShores } from "./s01e09OtherShores";
import { kineticPoster } from "./studies/kineticPoster";
import { actor, poseAt } from "./rotli/actor";
import { beach, farIsland, HORIZON, lighthouse, sun } from "./rotli/island";
import { C, FONT, ink, measure, text } from "./rotli/kit";
import { POSES } from "./quokka/poses";
import { blinkAt } from "./quokka/rig";
import { reframe } from "./studio/reframe";
import { makeScore } from "./studio/score2";
import { FONTS, FORMATS, type Format } from "./studio/stage";

const N = 240,
  TAU = Math.PI * 2,
  WW = 1920;
const wrap = (f: number) => ((Math.round(f) % N) + N) % N;
/** a phase that turns `k` whole times per loop */
const ph = (f: number, k = 1, o = 0) => TAU * ((k * f) / N + o);

// the island module's sunset palette (island.ts SUNSET + its cloud, glint and dash literals)
const SUNSET = {
  bands: ["#e9967a", "#eda683", "#f2b98f", "#f5cba4", "#f8dcbc"],
  sea: "#5fb2ae",
  seaDeep: "#3c8c90",
  dash: "#fde2c5",
  glint: "#f7d27e",
  cloud: "#fbe3cc",
  sun: "#f9d47f",
};
const SUN_X = 820,
  SHORE_X = 1060;

// ---------------------------------------------------------------- the world, looping
const skyLoop = (ctx: Ctx, f: number, top: number) => {
  const band = HORIZON / SUNSET.bands.length;
  SUNSET.bands.forEach((b, i) => {
    ctx.fillStyle = b;
    const y0 = i ? band * i : top;
    ctx.fillRect(0, y0, WW, band * (i + 1) - y0 + 1);
  });
  // three clouds that sway on the loop instead of crossing it (island.ts's puff + ink rim)
  const CLOUDS = [
    [1330, 118, 1],
    [1830, 300, 0.8],
    [90, 520, 0.7],
  ];
  CLOUDS.forEach(([cx, cy, s], i) => {
    const x = cx + Math.sin(ph(f, 1, i / 3)) * 46,
      y = cy + Math.sin(ph(f, 2, i / 5)) * 4;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.fillStyle = SUNSET.cloud;
    ctx.globalAlpha = 0.95;
    ctx.beginPath();
    ctx.ellipse(0, 0, 90, 26, 0, 0, 6.29);
    ctx.ellipse(-50, 4, 50, 20, 0, 0, 6.29);
    ctx.ellipse(40, -12, 56, 26, 0, 0, 6.29);
    ctx.fill();
    ctx.restore();
    ink(
      ctx,
      [
        [x - 100 * s, y + 16 * s],
        [x - 30 * s, y + 26 * s],
        [x + 80 * s, y + 22 * s],
        [x + 110 * s, y + 8 * s],
      ],
      { w: 3, seed: 300 + i, frame: f, alpha: 0.5, color: C.clayText },
    );
  });
};
/** the sea: wave dashes laid out on a repeating tile that slides exactly one tile per loop, and the sun's glints */
const seaLoop = (ctx: Ctx, f: number, bottom: number) => {
  ctx.fillStyle = SUNSET.sea;
  ctx.fillRect(0, HORIZON, WW, bottom - HORIZON);
  ctx.fillStyle = SUNSET.seaDeep;
  ctx.fillRect(0, HORIZON, WW, 26);
  for (let row = 0; row < 7; row++) {
    const T = row % 2 ? 240 : 320,
      y = HORIZON + 50 + row * 40,
      shift = (f / N) * T,
      marks = [
        [(row * 97) % T, 34 + ((row * 23) % 40)],
        [((row * 97) % T) + T * 0.55, 44 + ((row * 31) % 34)],
      ];
    for (let n = -1; n * T < WW + T; n++)
      marks.forEach(([x0, l], j) => {
        const x = x0 + shift + n * T;
        if (row % 2 && j) return;
        ink(
          ctx,
          [
            [x, y],
            [x + l * 0.5, y - 5],
            [x + l, y],
          ],
          { w: 3.5, color: SUNSET.dash, seed: row * 20 + j, frame: f, alpha: 0.8 },
        );
      });
  }
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = SUNSET.glint;
  for (let i = 0; i < 6; i++) {
    const w = 180 - i * 26 + Math.sin(ph(f, 4, i / 6)) * 12;
    ctx.fillRect(SUN_X - w / 2, HORIZON + 16 + i * 34, w, 8);
  }
  ctx.restore();
};
const world = (ctx: Ctx, f: number, top: number, bottom: number, beam: number) => {
  skyLoop(ctx, f, top);
  sun(ctx, SUN_X, HORIZON - 6, 84, SUNSET.sun);
  farIsland(ctx, f, "sunset", 0);
  // the lamp again, on its own clock: one sweep per loop (island.ts beam = sin(frame / 22))
  lighthouse(ctx, 1560, HORIZON - 146, 1, 22 * ph(f, 1, 0.08), beam, "sunset");
  seaLoop(ctx, f, bottom);
  // foam laps twice a loop (beach.ts lap = sin(frame / 20)); its boil rides the same clock
  beach(ctx, 20 * ph(f, 2), "sunset", SHORE_X);
};

// ---------------------------------------------------------------- the prints on the line
type Clip = { film: Film; at: number; label: string; crop?: { x: number; y: number; w: number; h: number } };
const FULL = { x: 0, y: 0, w: 1920, h: 1080 };
/** each print plays two clips a loop, 120 frames each, swapping on its own beat */
const PRINTS: { x: number; clips: [Clip, Clip] }[] = [
  {
    x: 380,
    clips: [
      { film: rotliStory, at: 20, label: "the rotli story" },
      { film: s01e05LighthouseKeeper, at: 440, label: "season one · 05" },
    ],
  },
  {
    x: 700,
    clips: [
      { film: rotliStory, at: 330, label: "the rotli story" },
      { film: s01e01Arrival, at: 440, label: "season one · 01" },
    ],
  },
  {
    x: 1020,
    clips: [
      { film: kineticPoster, at: 90, label: "study · kinetic poster" },
      { film: rotliStory, at: 1395, label: "the rotli story" },
    ],
  },
  {
    x: 1340,
    clips: [
      { film: s01e09OtherShores, at: 170, label: "season one · 09" },
      { film: rotliStory, at: 1180, label: "the rotli story" },
    ],
  },
];
const LINE = { x0: 200, x1: 1530, y: 640, sag: 46 };
const lineY = (x: number) => {
  const t = (x - LINE.x0) / (LINE.x1 - LINE.x0);
  return LINE.y + LINE.sag * 4 * t * (1 - t);
};
const IMG = { w: 272, h: 153 },
  BORDER = 14,
  CHIN = 50;

const post = (ctx: Ctx, f: number, x: number, top: number, bottom: number) => {
  ctx.fillStyle = "#8d6547";
  ctx.fillRect(x - 7, top, 14, bottom - top);
  ink(
    ctx,
    [
      [x - 7, top],
      [x - 7, bottom],
    ],
    { w: 3, seed: 51 + x, frame: f },
  );
  ink(
    ctx,
    [
      [x + 7, top],
      [x + 7, bottom],
    ],
    { w: 3, seed: 52 + x, frame: f },
  );
};
/** one print: a polaroid on a peg, swaying; `clip` + `local` choose what plays in it, `dev` 0..1 develops it */
const print = (
  ctx: Ctx,
  env: Env,
  f: number,
  i: number,
  x: number,
  clip: Clip,
  local: number,
  dev: number,
  sway: number,
) => {
  const y = lineY(x),
    PW = IMG.w + BORDER * 2,
    PH = IMG.h + BORDER + CHIN;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(sway);
  // shadow on the water, then the card
  ctx.fillStyle = "rgba(43,35,29,0.18)";
  ctx.fillRect(-PW / 2 + 8, 10, PW, PH);
  ctx.fillStyle = C.surface;
  ctx.fillRect(-PW / 2, 4, PW, PH);
  // the clip, re-rendered at this size (reframe works in device space: hand it the current transform's rect)
  const ix = -IMG.w / 2,
    iy = 4 + BORDER;
  ctx.save();
  ctx.beginPath();
  ctx.rect(ix, iy, IMG.w, IMG.h);
  ctx.clip();
  const m = ctx.getTransform();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const k = Math.hypot(m.a, m.b) / env.scale;
  ctx.setTransform(m.a / k, m.b / k, m.c / k, m.d / k, m.e, m.f);
  reframe(ctx, { ...env, W: clip.film.meta.W, H: clip.film.meta.H }, clip.film, clip.at + local, clip.crop ?? FULL, {
    x: ix * k,
    y: iy * k,
    w: IMG.w * k,
    h: IMG.h * k,
  });
  ctx.setTransform(m);
  // a fresh print develops out of the paper
  if (dev < 1) {
    ctx.globalAlpha = 1 - dev;
    ctx.fillStyle = C.linen;
    ctx.fillRect(ix, iy, IMG.w, IMG.h);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 3.5;
  ctx.strokeRect(-PW / 2, 4, PW, PH);
  ctx.lineWidth = 2.5;
  ctx.strokeRect(ix, iy, IMG.w, IMG.h);
  text(ctx, clip.label, 0, 4 + PH - 16, { size: 22, weight: 600, align: "center", color: C.cocoa, spacing: -0.4 });
  // the peg
  ctx.fillStyle = C.clay;
  ctx.fillRect(-9, -10, 18, 30);
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 3;
  ctx.strokeRect(-9, -10, 18, 30);
  ctx.restore();
  void f;
  void i;
};
const line = (ctx: Ctx, f: number) => {
  const pts: [number, number][] = [];
  for (let k = 0; k <= 8; k++) {
    const x = LINE.x0 + ((LINE.x1 - LINE.x0) * k) / 8;
    pts.push([x, lineY(x)]);
  }
  ink(ctx, pts, { w: 3, seed: 61, frame: f, color: C.cocoa });
};

// ---------------------------------------------------------------- props: the clapperboard
const clapper = (ctx: Ctx, f: number, x: number, y: number, open: number) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.08);
  // slate
  ctx.fillStyle = C.cocoa;
  ctx.fillRect(-90, -110, 180, 110);
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 4;
  ctx.strokeRect(-90, -110, 180, 110);
  ctx.fillStyle = C.nightText;
  ctx.fillRect(-78, -74, 156, 3);
  ctx.fillRect(-78, -40, 156, 3);
  text(ctx, "ROTLI STUDIO", -76, -82, { size: 17, weight: 600, color: C.nightText, spacing: 1.5 });
  text(ctx, "TAKE 21", -76, -48, { size: 17, weight: 600, color: C.nightText, spacing: 1.5 });
  text(ctx, "SCENE 1", -76, -14, { size: 17, weight: 600, color: C.nightText, spacing: 1.5 });
  // the clapstick, hinged at the top left
  ctx.translate(-90, -110);
  ctx.rotate(-open);
  ctx.fillStyle = C.surface;
  ctx.fillRect(0, -30, 180, 30);
  ctx.fillStyle = C.ink;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(10 + i * 36, -30);
    ctx.lineTo(28 + i * 36, -30);
    ctx.lineTo(18 + i * 36, 0);
    ctx.lineTo(0 + i * 36, 0);
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeRect(0, -30, 180, 30);
  ctx.restore();
  void f;
};

// ---------------------------------------------------------------- the lockup, left, over the sky
const LOCK = { x: 150, y: 250 };
const lockupStudio = (ctx: Ctx, f: number) => {
  const mk = POSES._logo,
    size = 190,
    m = size / mk.vb;
  ctx.save();
  ctx.translate(LOCK.x - 12, LOCK.y - 172);
  ctx.scale(m, m);
  ctx.fillStyle = C.ink;
  for (const d of mk.d) ctx.fill(new Path2D(d), mk.rule);
  ctx.restore();
  text(ctx, "rotli studio", LOCK.x + size + 8, LOCK.y, { size: 168, weight: 600, font: FONT.word, color: C.cocoa });
  const tag1 = "Films, stories and 21 studies,",
    tag2 = "drawn in code",
    ts = 62,
    sp = ts * -0.03;
  text(ctx, tag1, LOCK.x, LOCK.y + 110, { size: ts, weight: 600, color: C.cocoa, font: FONT.display, spacing: sp });
  text(ctx, tag2, LOCK.x, LOCK.y + 110 + ts * 1.14, {
    size: ts,
    weight: 600,
    color: C.cocoa,
    font: FONT.display,
    spacing: sp,
  });
  const w2 = measure(ctx, tag2, ts, 600, FONT.display, sp),
    uy = LOCK.y + 110 + ts * 1.14 + ts * 0.2;
  ink(
    ctx,
    [
      [LOCK.x, uy],
      [LOCK.x + w2, uy - 2],
    ],
    { w: 5, color: C.clay, seed: 909, frame: f },
  );
  text(ctx, "studio.rotli.co  ·  open source", LOCK.x + w2 + 36, LOCK.y + 110 + ts * 1.14, {
    size: 34,
    weight: 600,
    color: C.clayText,
  });
};

// ---------------------------------------------------------------- one scene, any loop frame
type Pick = (i: number) => { clip: Clip; local: number; dev: number };
const scene = (ctx: Ctx, env: Env, f: number, top: number, bottom: number, pick: Pick, o: { beam: number }) => {
  world(ctx, f, top, bottom, o.beam);
  post(ctx, f, LINE.x0, LINE.y - 40, 1000);
  post(ctx, f, LINE.x1, LINE.y - 40, 812);
  line(ctx, f);
  PRINTS.forEach((p, i) => {
    const { clip, local, dev } = pick(i);
    print(ctx, env, f, i, p.x, clip, local, dev, Math.sin(ph(f, 1, i * 0.23)) * 0.035);
  });
  // the quokka, on the beach beside the last post, with its slate
  const { pose, squash } = poseAt(f, [
    [-100, "base"],
    [60, "waving"],
    [120, "base"],
    [150, "celebrating"],
    [180, "base"],
  ]);
  const hop = f >= 150 && f < 166 ? Math.sin(((f - 150) / 16) * Math.PI) * 26 : 0;
  clapper(ctx, f, 1600, 1004, 0.18 + 0.1 * Math.max(0, Math.sin(ph(f, 4))));
  actor(ctx, env, f, {
    pose,
    x: 1790,
    y: 1010,
    h: 330,
    lift: hop,
    squash,
    lean: pose === "waving" ? Math.sin(ph(f, 12)) * 2.5 : Math.sin(ph(f, 2)) * 0.8,
    blink: blinkAt(f, 80, 1),
  });
  lockupStudio(ctx, f);
};

/** the format's camera onto the 1920x1080 island: full width, centred vertically */
const camera = (ctx: Ctx, env: Env, format: Format) => {
  const [w, h] = FORMATS[format],
    s = w / WW,
    oy = (h / s - 1080) / 2;
  ctx.setTransform(env.scale * s, 0, 0, env.scale * s, 0, env.scale * s * oy);
  return { top: -oy, bottom: 1080 - oy };
};

const SOURCES: Film[] = [rotliStory, s01e01Arrival, s01e05LighthouseKeeper, s01e09OtherShores, kineticPoster];
const ASSETS = {
  images: Object.assign({}, ...SOURCES.map((s) => s.assets.images)) as Record<string, string>,
  fonts: Object.assign({}, FONTS, ...SOURCES.map((s) => s.assets.fonts ?? {})) as Record<string, string>,
};

// ---------------------------------------------------------------- the teaser: 240-frame loop
const SWAP = (i: number) => 15 + 30 * i;
const teaserPick =
  (f: number): Pick =>
  (i) => {
    const since = wrap(f - SWAP(i)),
      which = since < 120 ? 0 : 1,
      local = since % 120;
    return { clip: PRINTS[i].clips[which], local, dev: Math.min(1, local / 14) };
  };
const fade = (a: [Float32Array, Float32Array], sr: number): [Float32Array, Float32Array] => {
  // 50 ms in and out so the wrap never clicks, and -2 dB so the bed sits near the studio's -16 LUFS
  const n = Math.floor(0.05 * sr),
    g = 0.79;
  for (const ch of a) {
    for (let k = 0; k < ch.length; k++) ch[k] *= g;
    for (let k = 0; k < n; k++) {
      ch[k] *= k / n;
      ch[ch.length - 1 - k] *= k / n;
    }
  }
  return a;
};
const score = makeScore({
  frames: N,
  melody: 2,
  pops: PRINTS.flatMap((_, i) => [
    [SWAP(i), [79, 81, 84, 86][i]] as [number, number],
    [SWAP(i) + 120, [84, 86, 88, 91][i]] as [number, number],
  ]),
});
const [TW, TH] = FORMATS["og-video"];
export const studioTeaser: Film = {
  meta: { title: "studioTeaser", W: TW, H: TH, fps: 30, bpm: 120, durationFrames: N, raster: "cpu" },
  assets: ASSETS,
  shots: [
    {
      id: "loop",
      start: 0,
      end: N,
      draw: (ctx, l, env) => {
        const f = wrap(l),
          { top, bottom } = camera(ctx, env, "og-video");
        scene(ctx, env, f, top, bottom, teaserPick(f), { beam: 1 });
      },
    },
  ],
  audio: (sr) => fade(score(sr), sr),
};

// ---------------------------------------------------------------- the card: one composed frame of the same world
const CARD_F = 84; // mid-wave, beam raised clear of the wordmark
const CARD: { clip: Clip; local: number }[] = [
  { clip: { film: rotliStory, at: 60, label: "the rotli story" }, local: 0 },
  { clip: { film: s01e05LighthouseKeeper, at: 500, label: "season one · 05" }, local: 0 },
  { clip: { film: kineticPoster, at: 160, label: "study · kinetic poster" }, local: 0 },
  { clip: { film: rotliStory, at: 1450, label: "the rotli story" }, local: 0 },
];
const [CW, CH] = FORMATS.og;
export const studioCard: Film = {
  meta: { title: "studioCard", W: CW, H: CH, fps: 30, bpm: 120, durationFrames: 15, raster: "cpu" },
  assets: ASSETS,
  shots: [
    {
      id: "og",
      start: 0,
      end: 15,
      draw: (ctx, l, env) => {
        const { top, bottom } = camera(ctx, env, "og");
        scene(ctx, env, CARD_F, top, bottom, (i) => ({ ...CARD[i], dev: 1 }), { beam: 0.7 });
        void l;
      },
    },
  ],
};
