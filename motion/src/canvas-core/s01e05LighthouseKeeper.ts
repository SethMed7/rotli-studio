// SEASON ONE · 05 — THE LIGHTHOUSE KEEPER. (60 s). Brief: series/season-one/episodes/s01e05.json
// Setup: night falls; the quokka arrives with a satchel full of Captures, yawns, sets the pile down and sleeps.
// Turn (keeper 215 → filing 20): the Librarian (the Fern quokka in glasses) gathers the pile, climbs to the
// lighthouse balcony, and files each note into an area of the Library with a tag, a summary and links.
// Payoff: morning, in the app: everything is in place, every word exactly as the quokka wrote it, and a move
// is undone (guarded: it checks the note is unchanged first). Token: the Trip ideas note, filed to Projects.
//
// Cue table (global frames): cold 0 · chapter 240 · keeper 360 (climb 575) · filing 660 (notes 680–856,
// detail 900–1050, on-device 1045) · morning 1140 (undo click 1366, raw vault 1485) · end 1560.
import type { Ctx, P } from "./core";
import type { Film } from "./film";
import { hopAlong, poseAt } from "./rotli/actor";
import { lighthouse } from "./rotli/island";
import { card, chip, lerp, sparkle } from "./rotli/kit";
import { moon } from "./studio/atmospheres";
import type { DeriveSpec } from "./studio/derive";
import { lowerThird } from "./studio/series";
import {
  C,
  LIBRARIAN_LOOKS,
  LIGHT,
  actor,
  backOut,
  chapterCard,
  easeInOut,
  easeOut,
  fillRR,
  ink,
  intertitle,
  librarian,
  measure,
  pop,
  sceneStart,
  seg,
  story,
  storyEnd,
  text,
  thought,
  type Scene,
  type S,
} from "./studio/story";
import { appFrame, choice, pointer, tagChip } from "./studio/ui";

// ---------------------------------------------------------------- the day's Captures (the token first)
const NOTES: { t: string; col: number; tag: string; token?: boolean }[] = [
  { t: "Trip ideas", col: 1, tag: "#travel", token: true },
  { t: "Call with Sam", col: 0, tag: "#work" },
  { t: "Quokka facts", col: 2, tag: "#nature" },
  { t: "Ferry times", col: 1, tag: "#travel" },
  { t: "Mum's birthday", col: 0, tag: "#family" },
  { t: "Salt lakes", col: 2, tag: "#nature" },
];
const QX = 560,
  QY = 990,
  PILE: P = [760, 972]; // the sleeping quokka and the pile it sets down (cold + keeper)
/** a scene hold that fades a drawing out between two local frames */
const fading = (ctx: Ctx, a: number, draw: () => void) => {
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha *= a;
  draw();
  ctx.restore();
};

// ---------------------------------------------------------------- cold: night falls, a satchel full of Captures
const cold: Scene = {
  id: "cold",
  len: 240,
  draw: (ctx, env, s) => {
    moon(ctx, 1380, 260 - 80 * easeOut(s.t(0, 220)), 56, C.nightText, C.night);
    fading(ctx, 1 - s.t(84, 98), () => intertitle(ctx, s, ["Night falls."], { y: 200, size: 72, t0: 4 }));
    const h = hopAlong(
      s.l,
      [
        [0, -170, QY],
        [24, 90, QY],
        [48, 340, QY],
        [72, QX, QY],
      ],
      70,
    );
    const p = poseAt(s.l, [
      [0, "walking"],
      [74, "inbox"],
      [102, "rest"],
      [130, "inbox"],
      [184, "rest"],
    ]);
    const yawn = s.l >= 102 && s.l < 130 ? 1 + 0.1 * Math.sin(seg(s.l, 102, 130) * Math.PI) : 1,
      sleep = s.l >= 184 ? 1 + 0.02 * Math.sin(s.l / 11) : 1;
    // the bundle of caught thoughts rides on its back, then comes down into a pile
    const drop = easeInOut(s.t(168, 192));
    for (let i = 0; i < 6; i++) {
      const bx = h.x + 70 + i * 5,
        by = h.y - h.lift - 250 - i * 8 + Math.sin(s.f / 9 + i) * 3;
      const x = lerp(bx, PILE[0] + i * 5, drop),
        y = lerp(by, PILE[1] - i * 9, drop) - Math.sin(drop * Math.PI) * 60;
      card(ctx, {
        x,
        y,
        rot: lerp(-0.35 + i * 0.12, -0.12 + ((i * 7) % 5) * 0.05, drop),
        scale: 0.62,
        token: NOTES[5 - i]?.token,
        lines: 2,
        seed: 30 + i,
        frame: s.f,
        dark: true,
      });
    }
    actor(ctx, env, s.f, {
      pose: h.moving ? "walking" : p.pose,
      x: h.x,
      y: h.y,
      h: 320,
      lift: h.lift,
      squash: h.squash * p.squash * yawn * sleep,
      lean: s.l >= 184 ? Math.sin(s.f / 13) * 2 : 0,
      shadowCol: "#000",
    });
    // the Captures count, carried
    fading(ctx, seg(s.l, 76, 88) * (1 - s.t(184, 200)), () => {
      fillRR(ctx, QX - 420, QY - 420, 250, 70, 35, C.nightSurface2, C.nightBorder, 3);
      text(ctx, "Captures  6", QX - 295, QY - 374, { size: 32, weight: 600, align: "center", color: C.nightText });
    });
    // a yawn, and a thought of the moon
    fading(ctx, 1 - s.t(206, 220), () => thought(ctx, s, QX + 20, QY - 280, "moon", s.t(134, 150)));
  },
};

const chapter: Scene = {
  id: "chapter",
  len: 120,
  draw: (ctx, env, s) =>
    chapterCard(ctx, env, s, { no: 5, title: ["The lighthouse", "keeper."], pose: "knowledge_system" }),
};

// ---------------------------------------------------------------- keeper: the Librarian gathers the pile and climbs
const LX = 1760,
  LS = 2.2,
  GAL = 1040 - 196 * LS,
  LAD = LX - 124; // the lighthouse sits over the atmosphere's own
const ladder = (ctx: Ctx, f: number) => {
  // a wooden ladder up to a little balcony off the gallery: the keeper's way up
  fillRR(ctx, LX - 190, GAL - 12, 130, 14, 4, C.ink);
  ink(
    ctx,
    [
      [LAD - 34, 1004],
      [LAD - 34, GAL],
    ],
    { w: 6, color: C.clay, seed: 71, frame: f, wob: 0.3 },
  );
  ink(
    ctx,
    [
      [LAD + 34, 1004],
      [LAD + 34, GAL],
    ],
    { w: 6, color: C.clay, seed: 72, frame: f, wob: 0.3 },
  );
  for (let y = GAL + 34; y < 1000; y += 44)
    ink(
      ctx,
      [
        [LAD - 34, y],
        [LAD + 34, y],
      ],
      { w: 5, color: C.clay, seed: 73 + y, frame: f, wob: 0.3 },
    );
};
const keeperPath = (l: number) => {
  // [x, y, walking]: out of the door, left to the pile, back, up the ladder rung by rung
  if (l < 40) return { x: LX - 130, y: 1000, walk: false };
  if (l < 110) {
    const k = easeInOut(seg(l, 40, 110));
    return { x: lerp(LX - 130, PILE[0] + 170, k), y: 1000, walk: true };
  }
  if (l < 160) return { x: PILE[0] + 170, y: 1000, walk: false };
  if (l < 212) {
    const k = easeInOut(seg(l, 160, 212));
    return { x: lerp(PILE[0] + 170, LAD, k), y: 1000, walk: true };
  }
  const N = 7,
    k = seg(l, 215, 268) * N,
    step = Math.min(N, Math.floor(k) + easeInOut(k - Math.floor(k)));
  return { x: LAD, y: lerp(1000, GAL - 12, step / N), walk: false };
};
const keeper: Scene = {
  id: "keeper",
  len: 300,
  atm: "night-sky",
  draw: (ctx, env, s) => {
    const lit = lerp(0.35, 1, easeOut(s.t(266, 290)));
    lighthouse(ctx, LX, 1040, LS, s.f, lit, "night");
    ladder(ctx, s.f);
    fading(ctx, 1 - s.t(138, 152), () =>
      intertitle(ctx, s, ["While it sleeps,", "someone files the day away."], {
        y: 160,
        size: 64,
        hi: "files",
        t0: 24,
      }),
    );
    // the quokka, asleep beside its pile
    actor(ctx, env, s.f, {
      pose: "rest",
      x: QX,
      y: QY,
      h: 320,
      squash: 1 + 0.02 * Math.sin(s.f / 11),
      lean: Math.sin(s.f / 13) * 2,
      shadowCol: "#000",
    });
    const lift = easeInOut(s.t(128, 156)),
      p = keeperPath(s.l),
      bob = p.walk ? -Math.abs(Math.sin(s.l / 4)) * 10 : 0;
    // the Librarian: out of the door (a pop), across, gathers, back, up
    const appear = backOut(s.t(18, 36)),
      pose = s.l < 110 ? "base" : s.l < 128 ? "thoughtful" : s.l < 160 ? "listening" : s.l < 268 ? "base" : "knowledge";
    const hh = 300,
      carry = (x: number, y: number) => {
        for (let i = 0; i < 6; i++)
          card(ctx, {
            x: x - 96 + i * 4,
            y: y - hh * 0.36 - i * 8 + Math.sin(s.f / 8 + i) * 2,
            rot: -0.2 + i * 0.05,
            scale: 0.55,
            token: NOTES[5 - i]?.token,
            lines: 2,
            seed: 30 + i,
            frame: s.f,
            dark: true,
          });
      };
    for (let i = 0; i < 6; i++) {
      if (lift >= 1) break;
      const t = easeInOut(seg(lift * 1.2 - i * 0.04, 0, 1));
      card(ctx, {
        x: lerp(PILE[0] + i * 5, p.x - 96 + i * 4, t),
        y: lerp(PILE[1] - i * 9, p.y - hh * 0.36 - i * 8, t) - Math.sin(t * Math.PI) * 50,
        rot: lerp(-0.12 + ((i * 7) % 5) * 0.05, -0.2 + i * 0.05, t),
        scale: lerp(0.62, 0.55, t),
        token: NOTES[5 - i]?.token,
        lines: 2,
        seed: 30 + i,
        frame: s.f,
        dark: true,
      });
    }
    if (appear > 0) {
      ctx.save();
      ctx.translate(p.x, p.y + bob);
      ctx.scale(appear, appear);
      ctx.translate(-p.x, -(p.y + bob));
      librarian(ctx, env, s, { x: p.x, y: p.y + bob, h: hh, pose, flip: s.l >= 160 && s.l < 212 });
      ctx.restore();
    }
    if (lift >= 1 && s.l < 268) carry(p.x, p.y + bob); // at the top her own pose holds the notes
    if (s.l >= 266 && s.l < 284)
      sparkle(ctx, LX, 1040 - 214 * LS, 30 * (1 - seg(s.l, 266, 284)), C.oliveBright, s.l / 4);
  },
};

// ---------------------------------------------------------------- filing: into the Library, with tags, summaries and links
const COLX = [330, 720, 1110],
  ROWY = [370, 640],
  AREAS = ["People", "Projects", "Research"],
  LIB: P = [1660, 1010],
  FP: P = [1400, 930];
const FLY = (i: number) => 20 + i * 28; // each note leaves the pile here and lands 22 frames later
const slot = (i: number): P => {
  const n = NOTES[i],
    row = NOTES.slice(0, i).filter((m) => m.col === n.col).length;
  return [COLX[n.col], ROWY[row]];
};
const LINKS: [number, number, P][] = [
  [0, 3, [890, 505]],
  [0, 2, [915, 318]],
  [2, 5, [1290, 505]],
];
const DETAIL = { in: 240, out: 372 },
  PANEL = { x: 250, y: 250, w: 980, h: 540 };
/** the on-device model: the little green chip with a face (as in the film), working while it files */
const deviceChip = (ctx: Ctx, x: number, y: number, sc: number, f: number, busy: boolean) => {
  ctx.save();
  ctx.translate(x, y + (busy ? Math.sin(f / 3) * 2 : 0));
  ctx.scale(sc, sc);
  fillRR(ctx, -70, -60, 140, 120, 18, C.olive, C.ink, 4);
  for (let i = -2; i <= 2; i++) {
    ctx.fillStyle = C.nightText;
    ctx.fillRect(i * 24 - 4, -76, 8, 16);
    ctx.fillRect(i * 24 - 4, 60, 8, 16);
  }
  const blink = f % 96 < 4;
  ctx.fillStyle = C.ink;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 4;
  if (blink) {
    ctx.beginPath();
    ctx.moveTo(-32, -8);
    ctx.lineTo(-16, -8);
    ctx.moveTo(16, -8);
    ctx.lineTo(32, -8);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(-24, -8, 8, 0, 6.29);
    ctx.arc(24, -8, 8, 0, 6.29);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(0, 8, 16, 0.2, Math.PI - 0.2);
  ctx.stroke();
  ctx.restore();
};
const filing: Scene = {
  id: "filing",
  len: 480,
  atm: "night-sky",
  draw: (ctx, env, s) => {
    const detail = easeInOut(s.t(DETAIL.in, DETAIL.in + 22)) * (1 - easeInOut(s.t(DETAIL.out, DETAIL.out + 20))),
      dim = 1 - 0.7 * detail;
    // the areas of the Library
    AREAS.forEach((a, i) => {
      const k = s.t(i * 5, 16 + i * 5);
      fading(ctx, dim, () => {
        text(ctx, a, COLX[i], 200, {
          size: 42,
          weight: 600,
          align: "center",
          color: C.nightText,
          alpha: k,
          spacing: -1.2,
        });
        ink(
          ctx,
          [
            [COLX[i] - 120, 222],
            [COLX[i] + 120, 220],
          ],
          { w: 5, color: C.clay, seed: 500 + i, frame: s.f, progress: k },
        );
      });
    });
    // the pile, taken from the top; each note flies to its shelf and gets its tag
    NOTES.forEach((n, i) => {
      const t0 = FLY(i),
        k = easeInOut(s.t(t0, t0 + 22)),
        [sx, sy] = slot(i),
        landed = s.l >= t0 + 22;
      if (k <= 0) {
        card(ctx, {
          x: FP[0] + (5 - i) * 5,
          y: FP[1] - (5 - i) * 9,
          rot: -0.12 + (((5 - i) * 7) % 5) * 0.05,
          scale: 0.8,
          token: n.token,
          lines: 2,
          seed: 30 + i,
          frame: s.f,
          dark: true,
        });
        return;
      }
      const x = lerp(FP[0], sx, k),
        y = lerp(FP[1], sy, k) - Math.sin(k * Math.PI) * 170,
        a = i === 0 ? 1 - detail : dim;
      card(ctx, {
        x,
        y,
        rot: lerp(-0.1, 0, k),
        scale: lerp(0.8, 1.25, k),
        title: k > 0.5 ? n.t : "",
        token: n.token,
        lines: 2,
        seed: 30 + i,
        frame: s.f,
        dark: true,
        alpha: a,
      });
      if (landed) {
        const c = pop(s.t(t0 + 24, t0 + 36));
        if (c > 0)
          fading(ctx, dim, () => {
            ctx.save();
            ctx.translate(sx - 112, sy + 92);
            ctx.scale(c, c);
            chip(ctx, 0, 0, n.tag, { size: 26, bg: C.nightSurface, fg: C.nightText, border: C.nightBorder });
            ctx.restore();
          });
        sparkle(ctx, sx + 110, sy - 70, 18 * (1 - s.t(t0 + 22, t0 + 34)), C.clay, s.l / 5);
      }
    });
    // [[links]] thread related notes together
    fading(ctx, dim, () =>
      LINKS.forEach(([a, b, m], i) => {
        const k = s.t(200 + i * 10, 222 + i * 10);
        if (k <= 0) return;
        const [ax, ay] = slot(a),
          [bx, by] = slot(b);
        const A: P = ax === bx ? [ax + 120, ay + 30] : [ax + 120, ay - 20],
          B: P = ax === bx ? [bx + 120, by - 30] : [bx - 120, by - 20];
        ink(ctx, [A, m, B], { w: 4, color: C.clay, seed: 600 + i, frame: s.f, progress: k, dash: [12, 9] });
        ctx.fillStyle = C.clay;
        ctx.beginPath();
        ctx.arc(A[0], A[1], 7, 0, 6.29);
        ctx.fill();
        if (k >= 1) {
          ctx.beginPath();
          ctx.arc(B[0], B[1], 7, 0, 6.29);
          ctx.fill();
        }
      }),
    );
    // the token's filing, up close: an area, a summary, tags, links, and the record of the move
    if (detail > 0) {
      const [sx, sy] = slot(0),
        cw = 238,
        ch = 155,
        x = lerp(sx - cw / 2, PANEL.x, detail),
        y = lerp(sy - ch / 2, PANEL.y, detail),
        w = lerp(cw, PANEL.w, detail),
        h = lerp(ch, PANEL.h, detail);
      fillRR(ctx, x + 6, y + 10, w, h, 22, "rgba(0,0,0,0.35)");
      fillRR(ctx, x, y, w, h, 22, C.nightSurface2, C.nightBorder, 3);
      ctx.fillStyle = C.clay;
      ctx.fillRect(x + w - 44, y, 44, 10);
      if (detail > 0.98) {
        const X = PANEL.x + 50,
          V = PANEL.x + 250,
          row = (i: number) => PANEL.y + 190 + i * 76,
          rk = (i: number) => easeOut(s.t(DETAIL.in + 26 + i * 16, DETAIL.in + 40 + i * 16));
        text(ctx, "Trip ideas", X, PANEL.y + 96, { size: 56, weight: 600, color: C.nightText, spacing: -2 });
        const label = (i: number, t: string) =>
          text(ctx, t, X, row(i), { size: 26, weight: 600, color: C.nightMuted, alpha: rk(i) });
        label(0, "Area");
        fading(ctx, rk(0), () =>
          chip(ctx, V, row(0) - 34, "Library  ›  Projects", {
            size: 28,
            bg: C.night,
            fg: C.nightText,
            border: C.nightBorder,
          }),
        );
        label(1, "Summary");
        text(ctx, "Island plans: the ferry, a snorkel, the pink lake.", V, row(1), {
          size: 28,
          color: C.nightText,
          alpha: rk(1),
        });
        label(2, "Tags");
        fading(ctx, rk(2), () => {
          let cx = V;
          for (const t of ["#travel", "#island"])
            cx +=
              chip(ctx, cx, row(2) - 34, t, { size: 26, bg: C.nightSurface, fg: C.nightText, border: C.nightBorder }) +
              14;
        });
        label(3, "Links");
        fading(ctx, rk(3), () => {
          let cx = V;
          for (const t of ["Ferry times", "Quokka facts"]) {
            text(ctx, t, cx, row(3), { size: 28, weight: 600, color: C.nightText });
            const tw = measure(ctx, t, 28, 600);
            ctx.fillStyle = C.clay;
            ctx.fillRect(cx, row(3) + 8, tw, 3);
            cx += tw + 36;
          }
        });
        label(4, "Recorded");
        text(ctx, "Moved from Captures to Projects  ·  ↶ undo", V, row(4), {
          size: 26,
          color: C.nightMuted,
          alpha: rk(4),
        });
      }
    }
    // the Librarian at the lighthouse, her on-device model humming beside her
    const busy = s.l >= 20 && s.l < 200,
      cs = s.l < 385 ? backOut(s.t(4, 18)) * 0.8 : 0.8 + 0.2 * pop(s.t(385, 400));
    if (cs > 0) {
      deviceChip(ctx, 1420, 560, cs, s.f, busy);
      text(ctx, "on-device model", 1420, 668 + (cs - 0.8) * 60, {
        size: 26,
        weight: 600,
        align: "center",
        color: C.nightText,
        alpha: s.t(10, 22),
      });
    }
    if (s.l >= 385 && s.l < 405) sparkle(ctx, 1500, 480, 22 * (1 - s.t(385, 405)), C.oliveBright, s.l / 4);
    const throwing = NOTES.some((_, i) => s.l >= FLY(i) - 4 && s.l < FLY(i) + 4);
    librarian(ctx, env, s, {
      x: LIB[0],
      y: LIB[1],
      h: 440,
      pose: s.l < 200 ? "knowledge" : s.l < DETAIL.in ? "thoughtful" : s.l < 385 ? "listening" : "celebrating",
      squash: throwing ? 0.96 : 1,
    });
    lowerThird(
      ctx,
      s.l,
      24,
      380,
      "The Librarian files each note into an area of the Library,",
      "adds a summary and tags, and records what it did with a guarded undo.",
      true,
    );
    lowerThird(
      ctx,
      s.l,
      388,
      s.len,
      "It uses an on-device model by default,",
      "or a Claude, ChatGPT, or Gemini client you have already signed in to.",
      true,
    );
  },
};

// ---------------------------------------------------------------- morning: the app, the words untouched, a guarded undo, a raw vault
const T = LIGHT,
  K = 1.1,
  OX = 90,
  OY = 48,
  WIN = { x: 0, y: 0, w: 1400, h: 680 },
  SIDE = 280,
  BX = 344,
  PX = 942,
  PY = 104,
  PW = 420,
  PH = 480;
const ACT = [
    { n: "Trip ideas", a: "Projects" },
    { n: "Call with Sam", a: "People" },
    { n: "Salt lakes", a: "Research" },
  ],
  ROW = (i: number) => PY + 116 + i * 96;
const UNDO: P = [PX + PW - 74, ROW(2) + 6],
  RAW: P = [PX + 39, PY + 170 - 11];
const M = { panel: 150, click: 226, undone: 252, raw: 300, pick: 345, never: 352 };
const PTR: [number, number, number][] = [
  [168, 1260, 640],
  [214, UNDO[0], UNDO[1]],
  [246, UNDO[0], UNDO[1]],
  [300, 1240, 560],
  [336, RAW[0], RAW[1]],
  [362, RAW[0], RAW[1]],
  [404, 1300, 640],
];
const ptrAt = (l: number): P => {
  for (let i = 1; i < PTR.length; i++)
    if (l < PTR[i][0]) {
      const [f0, x0, y0] = PTR[i - 1],
        [f1, x1, y1] = PTR[i],
        k = easeInOut(seg(l, f0, f1));
      return [lerp(x0, x1, k), lerp(y0, y1, k)];
    }
  const z = PTR[PTR.length - 1];
  return [z[1], z[2]];
};
const press = (l: number, at: number) => (l >= at && l < at + 12 ? (l - at) / 12 : 0);
const morning: Scene = {
  id: "morning",
  len: 420,
  atm: "linen-morning",
  draw: (ctx, env, s) => {
    const R = T.roles,
      open = pop(s.t(0, 18)),
      undone = s.l >= M.undone;
    ctx.save();
    ctx.translate(OX + (WIN.w * K) / 2, OY + (WIN.h * K) / 2);
    ctx.scale(K * open, K * open);
    ctx.translate(-WIN.w / 2, -WIN.h / 2);
    appFrame(ctx, T, WIN, {
      notes: ["Trip ideas", "Ferry times", "Call with Sam"],
      active: 0,
      side: SIDE,
      title: "trip-ideas.md",
    });
    // the Library in the sidebar: every area in place; the undone move returns a note to Captures
    const LY = 404,
      lib = [
        ["Captures", undone ? "1" : "0"],
        ["People", "2"],
        ["Projects", "2"],
        ["Research", undone ? "1" : "2"],
      ];
    text(ctx, "Library", 34, LY, { size: 25, weight: 600, color: R.text });
    lib.forEach(([n, c], i) => {
      const y = LY + 46 + i * 44,
        hot = undone && s.l < M.undone + 40 && (i === 0 || i === 3);
      if (hot) fillRR(ctx, 18, y - 30, SIDE - 36, 42, 10, R.tint);
      text(ctx, n, 52, y, { size: 24, color: hot ? R.text : R["text-muted"], weight: hot ? 600 : 500 });
      text(ctx, c, SIDE - 34, y, { size: 24, align: "right", color: R["text-muted"] });
    });
    // what the Librarian added overnight, around the words: tags, the area, a summary
    const meta = easeOut(s.t(20, 40));
    fading(ctx, meta, () => {
      let x = BX;
      for (const t of ["#travel", "#island"]) x += tagChip(ctx, T, x, 138, t, 26) + 12;
      const a = "Library  ›  Projects",
        aw = measure(ctx, a, 26, 600) + 30;
      fillRR(ctx, x, 102, aw, 46, 23, R["surface-2"], R.border, 2);
      text(ctx, a, x + 15, 136, { size: 26, weight: 600, color: R.text });
    });
    text(ctx, "Summary  ·  ferry, snorkel, pink lake.", BX, 194, { size: 26, color: R["text-muted"], alpha: meta });
    // the words, exactly as the quokka wrote them
    text(ctx, "Trip ideas", BX, 292, { size: 58, weight: 600, color: R.text, spacing: -2 });
    ["book the ferry", "pack a snorkel", "find the pink lake"].forEach((t, i) => {
      const y = 362 + i * 60;
      fillRR(ctx, BX, y - 26, 32, 32, 8, R.surface, R["text-muted"], 3);
      text(ctx, t, BX + 50, y, { size: 30, color: R.text });
    });
    const ok = easeOut(s.t(58, 76));
    if (ok > 0) {
      ctx.save();
      ctx.globalAlpha *= ok;
      ctx.setLineDash([12, 9]);
      ctx.lineDashOffset = -s.l * 0.5;
      ctx.beginPath();
      ctx.roundRect(BX - 24, 226, 560, 290, 18);
      ctx.strokeStyle = R.success;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    }
    const sk = pop(s.t(80, 94));
    if (sk > 0) {
      const w = measure(ctx, "words unchanged", 26, 600) + 84;
      ctx.save();
      ctx.translate(BX + w / 2, 566);
      ctx.scale(sk, sk);
      ctx.translate(-w / 2, 0);
      fillRR(ctx, 0, -28, w, 56, 28, R["surface-2"], R.success, 2);
      ctx.fillStyle = R.success;
      ctx.beginPath();
      ctx.arc(30, 0, 15, 0, 6.29);
      ctx.fill();
      ink(
        ctx,
        [
          [23, 0],
          [28, 6],
          [37, -6],
        ],
        { w: 4, color: R.surface, wob: 0, boil: 0 },
      );
      text(ctx, "words unchanged", 56, 9, { size: 26, weight: 600, color: R.text });
      ctx.restore();
    }
    // the Librarian's record of last night, each move with its undo; then the choice of a raw vault
    const pa = easeOut(s.t(M.panel, M.panel + 16)) * (1 - s.t(M.raw - 12, M.raw)),
      pb = easeOut(s.t(M.raw, M.raw + 16));
    if (pa > 0)
      fading(ctx, pa, () => {
        ctx.save();
        ctx.translate((1 - pa) * 40, 0);
        fillRR(ctx, PX, PY, PW, PH, 18, R["surface-2"], R.border, 2);
        text(ctx, "Librarian  ·  last night", PX + 26, PY + 52, { size: 28, weight: 600, color: R.text });
        ACT.forEach((r, i) => {
          const y = ROW(i),
            back = i === 2 && undone;
          text(ctx, r.n, PX + 26, y, { size: 26, weight: 600, color: R.text });
          text(ctx, `→ ${back ? "Captures" : r.a}`, PX + 26, y + 36, {
            size: 26,
            color: back ? R["accent-text"] : R["text-muted"],
          });
          const bw = 100,
            bx = PX + PW - bw - 24;
          if (back) {
            text(ctx, "undone", bx + bw, y + 20, { size: 26, weight: 600, align: "right", color: R["text-muted"] });
            return;
          }
          const hover = i === 2 && s.l >= 208 && s.l < M.undone;
          fillRR(ctx, bx, y - 18, bw, 46, 12, hover ? R.tint : R.surface, hover ? R.accent : R.border, 2);
          text(ctx, "Undo", bx + bw / 2, y + 14, { size: 26, weight: 600, align: "center", color: R["accent-text"] });
        });
        // the guard: undo only moves a note back if it is unchanged since the Librarian filed it
        const g = easeOut(s.t(M.click + 6, M.click + 18));
        if (g > 0) {
          const gy = ROW(2) + 100;
          ctx.fillStyle = R.success;
          ctx.globalAlpha *= g;
          ctx.beginPath();
          ctx.arc(PX + 40, gy - 9, 13, 0, 6.29);
          ctx.fill();
          ink(
            ctx,
            [
              [PX + 33, gy - 9],
              [PX + 38, gy - 3],
              [PX + 47, gy - 15],
            ],
            { w: 3.5, color: R.surface, wob: 0, boil: 0 },
          );
          text(ctx, "unchanged since it was filed", PX + 64, gy, { size: 26, color: R.text });
        }
        ctx.restore();
      });
    if (pb > 0)
      fading(ctx, pb, () => {
        fillRR(ctx, PX, PY, PW, PH, 18, R["surface-2"], R.border, 2);
        text(ctx, "New vault", PX + 26, PY + 52, { size: 28, weight: 600, color: R.text });
        choice(ctx, T, PX + 24, PY + 170, ["With the Librarian", "Raw vault  ·  no AI"], [s.l >= M.pick ? 1 : 0]);
        text(ctx, "The Librarian never runs.", PX + 26, PY + 300, {
          size: 26,
          color: R["text-muted"],
          alpha: easeOut(s.t(M.never, M.never + 14)),
        });
      });
    if (s.l >= PTR[0][0] && s.l < 404) {
      const [x, y] = ptrAt(s.l);
      pointer(ctx, x, y, press(s.l, M.click) || press(s.l, M.pick));
    }
    ctx.restore();
    // the quokka wakes to find it all in place
    const p = poseAt(s.l, [
      [0, "rest"],
      [40, "attention"],
      [96, "celebrating"],
      [150, "base"],
      [M.undone + 4, "celebrating"],
      [300, "thoughtful"],
      [M.never + 6, "base"],
    ]);
    actor(ctx, env, s.f, { pose: p.pose, x: 1812, y: 1050, h: 250, squash: p.squash, lean: Math.sin(s.f / 10) * 2 });
    fading(ctx, 1 - s.t(108, 120), () => thought(ctx, s, 1812, 835, "sun", s.t(44, 58), { side: -1 }));
    fading(ctx, 1 - s.t(330, 342), () =>
      thought(ctx, s, 1812, 835, "check", s.t(M.undone + 6, M.undone + 20), { side: -1 }),
    );
    lowerThird(ctx, s.l, 20, 146, "It changes a note's location and metadata only,", "never the words you wrote.");
    lowerThird(ctx, s.l, 156, 296, "The Librarian records what it did", "with a guarded undo.");
    lowerThird(ctx, s.l, 306, s.len, "Prefer no AI at all? Choose a raw vault,", "and the Librarian never runs.");
  },
};

// ---------------------------------------------------------------- end: the payoff, then the next episode
const end: Scene = {
  id: "end",
  len: 240,
  atm: "linen-morning",
  draw: (ctx, env, s) => {
    fading(ctx, 1 - s.t(96, 108), () =>
      intertitle(ctx, s, ["Filed by morning.", "Every word, as written."], { hi: "as written" }),
    );
    if (s.l >= 100) {
      const l = s.l - 100,
        e: S = { ...s, l, t: (a, b) => seg(l, a, b) };
      storyEnd(ctx, env, e, { next: "Threads", pose: "waving" });
    }
  },
};

const SCENES = [cold, chapter, keeper, filing, morning, end];
const KE = sceneStart(SCENES, "keeper"),
  FI = sceneStart(SCENES, "filing"),
  MO = sceneStart(SCENES, "morning");
export const s01e05LighthouseKeeper: Film = story({
  id: "s01e05LighthouseKeeper",
  no: 5,
  title: "The lighthouse keeper.",
  atmosphere: "night-vault",
  scenes: SCENES,
  looks: LIBRARIAN_LOOKS,
  score: {
    key: 2,
    melody: 2,
    pops: [
      [KE + 36, 81],
      [KE + 268, 88],
      ...NOTES.map((_, i) => [FI + FLY(i) + 22, [79, 81, 84, 86, 88, 91][i]] as [number, number]),
      [FI + 385, 93],
      [MO + M.click, 84],
      [MO + M.undone, 88],
      [MO + M.pick, 91],
    ],
    thumps: [24, 48, 72],
  },
});

export const s01e05Derive: DeriveSpec = {
  no: 5,
  series: "season-one",
  label: "Rotli · Season One · 05",
  vertical: [
    {
      frame: 60,
      len: 150,
      crop: { x: 100, y: 330, w: 1120, h: 740 },
      title: "Night falls.",
      sub: "A satchel full of Captures.",
      hi: "Night",
    },
    {
      frame: KE + 150,
      len: 150,
      crop: { x: 820, y: 360, w: 1100, h: 700 },
      title: "The keeper climbs.",
      sub: "The Librarian takes the day's notes.",
      hi: "keeper",
    },
    {
      frame: FI + 20,
      len: 240,
      crop: { x: 120, y: 110, w: 1680, h: 950 },
      title: "Filed by lighthouse light.",
      sub: "An area, a summary, tags, links.",
      hi: "Filed",
    },
    {
      frame: MO + 50,
      len: 210,
      crop: { x: 60, y: 30, w: 1600, h: 900 },
      title: "Every word, as written.",
      sub: "Any move can be undone.",
      hi: "word",
    },
  ],
  slides: [
    {
      frame: 200,
      crop: { x: 100, y: 330, w: 1120, h: 740 },
      title: "Night falls.",
      sub: "A satchel full of Captures.",
      hi: "Night",
    },
    {
      frame: FI + 230,
      crop: { x: 120, y: 110, w: 1680, h: 950 },
      title: "Filed by lighthouse light.",
      sub: "An area, tags, links.",
      hi: "Filed",
    },
    {
      frame: FI + 340,
      crop: { x: 220, y: 232, w: 1060, h: 590 },
      title: "A summary, a record.",
      sub: "It records what it did.",
      hi: "record",
    },
    {
      frame: MO + 270,
      crop: { x: 60, y: 30, w: 1600, h: 900 },
      title: "Every word, as written.",
      sub: "Any move can be undone.",
      hi: "word",
    },
  ],
  single: {
    frame: FI + 230,
    crop: { x: 120, y: 110, w: 1680, h: 950 },
    title: "The lighthouse keeper.",
    sub: "Filed while you sleep.",
    hi: "keeper",
  },
};
