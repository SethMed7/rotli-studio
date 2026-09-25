// EPISODE 01 · WRITE — "Write in Markdown. See it rendered." (30 s, 1920x1080)
// Story: raw Markdown is typed and draws itself; results and choices are clicked and the file
// changes; a table is edited in place; Aa flips to the raw text underneath and back.
// Turn: frame 555, the Aa click (the magic was plain text all along). Token: trip-plan.md.
import type { Ctx, Env } from "./core";
import type { Film } from "./film";
import { actor, hopAlong } from "./rotli/actor";
import { C, easeInOut, fillRR, pop, seg, sparkle, text, typed } from "./rotli/kit";
import type { DeriveSpec } from "./studio/derive";
import { makeScore } from "./studio/score2";
import { drift, endCard, ground, host, lowerThird, titleCard, END, TITLE } from "./studio/series";
import { FONTS } from "./studio/stage";
import { LIGHT as T, appFrame, caret, choice, heading, pointer, raw, results, table, task } from "./studio/ui";
import { useFamilyUI } from "./studio/ui";

// this episode speaks the ROTLI theme family: grounds, UI, captions, accents and the quokka
useFamilyUI("rotli");

const TOTAL = 900,
  DEMO_END = TOTAL - END;
// cue table (frames)
const Q = {
  h1: [110, 128, 134],
  t1: [146, 164, 168],
  t2: [182, 196, 200],
  t3: [210, 226, 230],
  res: [256, 276, 280],
  clickRes: 312,
  clickChoice: 372,
  cell: 440,
  typeCell: [452, 480],
  aa: 555,
  back: 650,
  file: 690,
};
const ptr: [number, number, number][] = [
  [250, 1500, 980],
  [300, 1060, 546],
  [330, 1060, 546],
  [360, 555, 660],
  [400, 555, 660],
  [430, 1240, 742],
  [520, 1240, 742],
  [545, 1740, 214],
  [640, 1740, 214],
  [700, 1500, 980],
];
const ptrAt = (l: number) => {
  if (l <= ptr[0][0]) return { x: ptr[0][1], y: ptr[0][2] };
  for (let i = 1; i < ptr.length; i++)
    if (l < ptr[i][0]) {
      const [f0, x0, y0] = ptr[i - 1],
        [f1, x1, y1] = ptr[i],
        k = easeInOut((l - f0) / (f1 - f0));
      return { x: x0 + (x1 - x0) * k, y: y0 + (y1 - y0) * k };
    }
  const z = ptr[ptr.length - 1];
  return { x: z[1], y: z[2] };
};
const press = (l: number, at: number) => (l >= at && l < at + 12 ? (l - at) / 12 : 0);

/** camera: wide, then pushed in on the editor (1.3×) while we type, back out for the payoff */
const camera = (ctx: Ctx, env: Env, l: number) => {
  const z = easeInOut(seg(l, 100, 126)) * (1 - easeInOut(seg(l, 676, 704))),
    s = 1 + 0.3 * z,
    tx = (110 - 470 * 1.3) * z,
    ty = (60 - 170 * 1.3) * z;
  ctx.setTransform(env.scale * s, 0, 0, env.scale * s, env.scale * tx, env.scale * ty);
  drift(ctx, env, l);
};
const demo = (ctx: Ctx, l: number, env: Env) => {
  ground(ctx, l);
  camera(ctx, env, l);
  const E = appFrame(
    ctx,
    T,
    { x: 120, y: 110, w: 1680, h: 830 },
    { notes: ["Trip plan", "Ferry times", "Reading list"], active: 0, title: "trip-plan.md" },
  );
  const rawView = l >= Q.aa + 6 && l < Q.back + 6,
    x = E.x;
  // the Aa toggle, top right of the editor
  fillRR(ctx, 1690, 186, 84, 50, 12, rawView ? T.roles.tint : T.roles.surface, T.roles.border, 2);
  text(ctx, "Aa", 1732, 221, { size: 26, weight: 600, align: "center", color: T.roles["accent-text"] });
  let cur: [number, number] | null = null;
  const line = (y: number, rawS: string, syn: number, [t0, t1, r]: number[], rendered: (a: number) => void) => {
    if (l < t0) return;
    const m = rawView ? 0 : seg(l, r, r + 6);
    if (m < 1) {
      const e = raw(ctx, T, x, y, typed(rawS, seg(l, t0, t1)), syn, 1 - m);
      if (l < r) cur = [e, y];
    }
    if (m > 0) rendered(m);
  };
  line(250, "# Trip plan", 2, Q.h1, (a) => heading(ctx, T, x, 258 - 6 * (1 - a), "Trip plan", 58, a));
  line(340, "- [x] book the ferry", 6, Q.t1, (a) =>
    task(ctx, T, x, 340, "x", "book the ferry", { tick: seg(l, Q.t1[2] + 6, Q.t1[2] + 14), alpha: a }),
  );
  line(400, "- [/] pack a snorkel", 6, Q.t2, (a) => task(ctx, T, x, 400, "/", "pack a snorkel", { alpha: a }));
  line(460, "- [ ] find the pink lake", 6, Q.t3, (a) => task(ctx, T, x, 460, " ", "find the pink lake", { alpha: a }));
  line(550, "Weather: [Sunny][Windy][Rain]", 9, Q.res, (a) => {
    ctx.save();
    ctx.globalAlpha *= a;
    text(ctx, "Weather", x, 550, { size: 30, weight: 600, color: T.roles.text });
    results(ctx, T, x + 150, 550, ["Sunny", "Windy", "Rain"], l >= Q.clickRes + 3 ? 1 : -1, [
      "#d9a84c",
      "#6eabd4",
      "#8f4e37",
    ]);
    ctx.restore();
  });
  if (l >= 330) {
    if (rawView) {
      raw(ctx, T, x, 630, "- [#] Getting around", 5);
      raw(ctx, T, x, 680, "  - [x] Bike", 5);
      raw(ctx, T, x, 730, "  - [ ] Walk", 5);
    } else {
      const a = seg(l, 330, 340);
      ctx.save();
      ctx.globalAlpha *= a;
      text(ctx, "Getting around", x, 630, { size: 30, weight: 600, color: T.roles.text });
      choice(ctx, T, x, 690, ["Bike", "Walk"], l >= Q.clickChoice + 3 ? [0] : []);
      ctx.restore();
    }
  }
  if (l >= 405) {
    const cell = l < Q.typeCell[0] ? "" : typed("Snorkel", seg(l, Q.typeCell[0], Q.typeCell[1]));
    if (rawView) {
      ["| Day | Plan    | Who  |", "| Sat | Ferry   | Sam  |", `| Sun | ${(cell || "").padEnd(7)} | Maya |`].forEach(
        (s, i) => raw(ctx, T, x + 560, 640 + i * 46, s, 0, 1, 26),
      );
    } else {
      const a = seg(l, 405, 415);
      ctx.save();
      ctx.globalAlpha *= a;
      table(
        ctx,
        T,
        x + 560,
        610,
        [110, 190, 130],
        [
          ["Day", "Plan", "Who"],
          ["Sat", "Ferry", "Sam"],
          ["Sun", cell, "Maya"],
        ],
        l >= Q.cell && l < 520 ? [2, 1] : undefined,
      );
      ctx.restore();
      if (l >= Q.typeCell[0] && l < 520) caret(ctx, T, x + 560 + 110 + 16 + cell.length * 13.5, 743, l, 28);
    }
  }
  if (cur && !rawView) caret(ctx, T, cur[0], cur[1], l);
  // clicks land with a sparkle
  for (const at of [Q.clickRes, Q.clickChoice])
    if (l >= at && l < at + 14)
      sparkle(
        ctx,
        at === Q.clickRes ? 1080 : 580,
        at === Q.clickRes ? 520 : 650,
        18 * (1 - (l - at) / 14),
        C.clay,
        l / 5,
      );
  if (l >= 250 && l < 700) {
    const p = ptrAt(l);
    pointer(
      ctx,
      p.x,
      p.y,
      press(l, Q.clickRes) || press(l, Q.clickChoice) || press(l, Q.cell) || press(l, Q.aa) || press(l, Q.back),
    );
  }
  // the payoff: it is a file
  const fk = pop(seg(l, Q.file, Q.file + 14));
  if (fk > 0) {
    ctx.save();
    ctx.translate(1280, 190);
    ctx.scale(fk, fk);
    fillRR(ctx, -170, -34, 340, 60, 30, C.clay, C.ink, 3);
    text(ctx, "trip-plan.md", 0, 8, {
      size: 28,
      weight: 600,
      align: "center",
      color: C.surface,
      font: "Menlo, monospace",
    });
    ctx.restore();
  }
  ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
  if (l < Q.file - 20) host(ctx, env, l, { pose: l < 250 ? "notes" : l < 540 ? "base" : "thoughtful" });
  camera(ctx, env, l);
  const h = hopAlong(
    l,
    [
      [Q.file - 20, 2100, 1060],
      [Q.file, 1690, 1060],
    ],
    110,
  );
  if (l >= Q.file - 20)
    actor(ctx, env, l, {
      pose: l < Q.file ? "walking" : "notes",
      x: h.x,
      y: h.y,
      h: 330,
      lift: h.lift,
      squash: h.squash,
      flip: l < Q.file,
    });
  ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
  lowerThird(ctx, l, 110, 250, "Type Markdown.", "It renders as you go.");
  lowerThird(ctx, l, 260, 400, "Click a result or a choice.", "The file changes with it.");
  lowerThird(ctx, l, 410, 540, "Tables edit cell by cell.");
  lowerThird(ctx, l, 550, 680, "Aa shows the raw Markdown.", "Plain text underneath, always.");
  lowerThird(ctx, l, 690, DEMO_END, "Every note is a plain file.", "Open it in any editor.");
};

export const ep01Write: Film = {
  meta: { title: "ep01Write", W: 1920, H: 1080, fps: 30, bpm: 120, durationFrames: TOTAL, raster: "cpu" },
  assets: { images: {}, fonts: FONTS },
  shots: [
    {
      id: "title",
      start: 0,
      end: TITLE,
      draw: (c, l, e) => {
        c.setTransform(e.scale, 0, 0, e.scale, 0, 0);
        titleCard(c, e, l, l, { no: 1, title: ["Write in Markdown.", "See it rendered."], pose: "notes" });
      },
    },
    {
      id: "demo",
      start: TITLE,
      end: DEMO_END,
      draw: (c, l, e) => {
        c.setTransform(e.scale, 0, 0, e.scale, 0, 0);
        demo(c, l + TITLE, e);
      },
    },
    {
      id: "end",
      start: DEMO_END,
      end: TOTAL,
      draw: (c, l, e) => {
        c.setTransform(e.scale, 0, 0, e.scale, 0, 0);
        endCard(c, e, DEMO_END + l, l, { pose: "notes" });
      },
    },
  ],
  audio: makeScore({
    frames: TOTAL,
    energeticFrom: 120,
    endAt: 780,
    bellAt: [DEMO_END],
    pops: [
      [134, 84],
      [168, 86],
      [200, 88],
      [230, 91],
      [280, 88],
      [Q.clickRes, 91],
      [Q.clickChoice, 93],
      [Q.cell, 88],
      [Q.aa, 96],
      [Q.back, 91],
      [Q.file, 96],
    ],
    clicks: [
      ...[Q.h1, Q.t1, Q.t2, Q.t3, Q.res].flatMap(([a, b]) =>
        Array.from({ length: Math.floor((b - a) / 3) }, (_, i) => a + i * 3),
      ),
      ...Array.from({ length: 9 }, (_, i) => Q.typeCell[0] + i * 3),
    ],
  }),
};

export const ep01Derive: DeriveSpec = {
  no: 1,
  series: "write",
  vertical: [
    {
      frame: 110,
      len: 135,
      crop: { x: 80, y: 40, w: 960, h: 560 },
      title: "Type Markdown.",
      sub: "It renders as you go.",
      hi: "Markdown",
    },
    {
      frame: 270,
      len: 120,
      crop: { x: 80, y: 420, w: 960, h: 420 },
      title: "Click a result.",
      sub: "The file changes with it.",
      hi: "result",
    },
    {
      frame: 420,
      len: 105,
      crop: { x: 740, y: 560, w: 680, h: 300 },
      title: "Tables, cell by cell.",
      hi: "cell by cell",
    },
    {
      frame: 548,
      len: 120,
      crop: { x: 80, y: 40, w: 960, h: 800 },
      title: "Plain text underneath.",
      sub: "Aa flips to the raw Markdown.",
      hi: "Plain text",
    },
  ],
  slides: [
    {
      frame: 245,
      crop: { x: 80, y: 40, w: 960, h: 560 },
      title: "Type Markdown.",
      sub: "It renders as you go.",
      hi: "Markdown",
    },
    {
      frame: 395,
      crop: { x: 80, y: 420, w: 960, h: 420 },
      title: "Click a result or a choice.",
      sub: "The file changes with it.",
      hi: "result",
    },
    { frame: 520, crop: { x: 740, y: 560, w: 680, h: 300 }, title: "Tables, cell by cell.", hi: "cell by cell" },
    {
      frame: 620,
      crop: { x: 80, y: 40, w: 960, h: 800 },
      title: "Plain text underneath.",
      sub: "Aa flips to the raw Markdown.",
      hi: "Plain text",
    },
  ],
  single: {
    frame: 530,
    crop: { x: 60, y: 30, w: 1440, h: 830 },
    title: "Write in Markdown.",
    sub: "See it rendered.",
    hi: "rendered",
  },
};
