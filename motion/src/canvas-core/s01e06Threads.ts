// SEASON ONE · 06 — THREADS (60 s). Brief: series/season-one/episodes/s01e06.json
// Setup: notes sit like huts along the tide line, unconnected; the quokka pins Trip ideas (the token) on the
// middle hut and thinks: link. Turn (links): it strings [[links]] as ropes between the huts; each tied rope pulls
// taut and lights up; the rope to a hut that doesn't exist yet (Snorkel spots) hangs slack in the sand: inert.
// In the app, ⌘K ranks every note, file, chat and action. Payoff (views): a named view arranges the same notes
// another way without moving a file, and ⌘D puts two notes side by side.
// Cue table (local frames):
//   cold    0–210  huts pop 0–30, the quokka hops in 8–92 carrying Trip ideas, pins it 100–116, looks 124/144, thought: link 150
//   links   0–420  rope 1 picked 20, tied to Ferry times 110 · rope 2 picked 150, tied to Salt lakes 225 ·
//                  rope 3 picked 255, thrown 320, falls slack 340 (the ghost hut appears 290), thought: question 350
//   search  0–360  ⌘K 30, "trip" 50–74, ranked rows 78–102, down 128/148, "split" 170–190, action rows 194–206, Esc 290
//   views   0–360  click the Trip view 60, rows rearrange 62–92, ⌘D 210, the panes split 214–236
//   payoff  0–210  intertitle, the tied huts, the quokka hops
//   end     0–120  end card, Next: Ask the Island
import type { Ctx } from "./core";
import type { Film } from "./film";
import { hopAlong, poseAt } from "./rotli/actor";
import { FONT, card, ink, rr } from "./rotli/kit";
import type { DeriveSpec } from "./studio/derive";
import { lowerThird } from "./studio/series";
import {
  C,
  LIGHT,
  actor,
  chapterCard,
  easeInOut,
  easeOut,
  fillRR,
  glyph,
  intertitle,
  measure,
  pop,
  seg,
  sceneStart,
  story,
  storyEnd,
  text,
  thought,
  type Scene,
  type S,
} from "./studio/story";
import { caret, heading, keys, link, para, pointer } from "./studio/ui";

const T = LIGHT;
type Pt = [number, number];

// ---------------------------------------------------------------- local props (flat marks; every colour read per frame)
const HW = 260,
  HH = 240,
  RH = 100,
  POST = 40; // hut wall, wall height, roof height, the tying post on the peak
/** the post top of a hut standing at (x, gy), scaled by `sc` */
const postOf = (x: number, gy: number, sc = 1): Pt => [x, gy - (HH + RH + POST) * sc];
/** a note as a hut on the tide line: walls, a pitched roof, a door, a tying post, and its note card as the sign.
 *  `sign` 0..1 pops the card in; `ghost` = a hut that doesn't exist yet (dashed outline, muted name) */
const hut = (
  ctx: Ctx,
  f: number,
  x: number,
  gy: number,
  o: { name: string; token?: boolean; ghost?: number; sign?: number; k?: number; sc?: number; seed?: number },
) => {
  const k = o.k ?? 1;
  if (k <= 0) return;
  const sc = (o.sc ?? 1) * pop(k),
    sign = o.sign ?? 1;
  ctx.save();
  ctx.translate(x, gy);
  ctx.scale(sc, sc);
  ctx.lineJoin = "round";
  const roof = () => {
    ctx.beginPath();
    ctx.moveTo(-HW / 2 - 24, -HH);
    ctx.lineTo(0, -HH - RH);
    ctx.lineTo(HW / 2 + 24, -HH);
    ctx.closePath();
  };
  if (o.ghost !== undefined) {
    ctx.globalAlpha *= o.ghost;
    ctx.setLineDash([14, 11]);
    ctx.strokeStyle = C.muted;
    ctx.lineWidth = 4;
    rr(ctx, -HW / 2, -HH, HW, HH, 6);
    ctx.stroke();
    roof();
    ctx.stroke();
    rr(ctx, -30, -58, 60, 58, 4);
    ctx.stroke();
    ctx.setLineDash([]);
    text(ctx, o.name, 0, -HH + 92, { size: 30, weight: 600, align: "center", color: C.muted });
    text(ctx, "not yet", 0, -HH + 134, { size: 26, weight: 500, align: "center", color: C.muted });
    ctx.restore();
    return;
  }
  ctx.save();
  ctx.globalAlpha = 0.14;
  ctx.fillStyle = C.ink;
  ctx.beginPath();
  ctx.ellipse(8, 4, HW * 0.62, 14, 0, 0, 6.29);
  ctx.fill();
  ctx.restore();
  fillRR(ctx, -HW / 2, -HH, HW, HH, 6, C.surface2, C.ink, 4);
  fillRR(ctx, -30, -58, 60, 58, 4, C.peach, C.ink, 3);
  ctx.fillStyle = C.ink;
  ctx.beginPath();
  ctx.arc(16, -28, 4, 0, 6.29);
  ctx.fill();
  roof();
  ctx.fillStyle = C.clay;
  ctx.fill();
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = C.ink;
  ctx.fillRect(-3, -HH - RH - POST, 6, POST);
  ctx.beginPath();
  ctx.arc(0, -HH - RH - POST, 8, 0, 6.29);
  ctx.fill();
  if (sign > 0)
    card(ctx, {
      x: 0,
      y: -HH + 90,
      scale: 1.25 * pop(sign),
      rot: Math.sin(f / 23 + (o.seed ?? 0)) * 0.012,
      title: o.name,
      token: o.token,
      lines: 1,
      seed: o.seed ?? 3,
      frame: f,
    });
  ctx.restore();
};
/** a hanging rope from a to b with a mid sag, drawn on with `progress` */
const rope = (
  ctx: Ctx,
  f: number,
  a: Pt,
  b: Pt,
  sag: number,
  o: { col?: string; w?: number; seed?: number; progress?: number } = {},
) => {
  const pts: Pt[] = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + 4 * sag * t * (1 - t)]);
  }
  ink(ctx, pts, {
    w: o.w ?? 6,
    color: o.col ?? C.clay,
    seed: o.seed ?? 3,
    frame: f,
    wob: 0.8,
    boil: 0.4,
    progress: o.progress,
  });
};
/** a rope's label: the wikilink it is, `live` 1 = accent + underline (a link), 0 = muted, dashed (a link to nothing) */
const linkChip = (ctx: Ctx, cx: number, cy: number, label: string, live: boolean, k: number) => {
  if (k <= 0) return;
  const s = pop(k),
    size = 28,
    w = measure(ctx, label, size, 600, FONT.mono) + 36,
    h = 48;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  fillRR(ctx, -w / 2, -h / 2, w, h, h / 2, C.surface, live ? C.clay : undefined, 3);
  if (!live) {
    ctx.setLineDash([9, 7]);
    rr(ctx, -w / 2, -h / 2, w, h, h / 2);
    ctx.strokeStyle = C.muted;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.setLineDash([]);
  }
  text(ctx, label, 0, 10, { size, weight: 600, align: "center", font: FONT.mono, color: live ? C.clayText : C.muted });
  if (live) {
    const iw = measure(ctx, label.slice(2, -2), size, 600, FONT.mono),
      bw = measure(ctx, "[[", size, 600, FONT.mono);
    ctx.fillStyle = C.clay;
    ctx.fillRect(-w / 2 + 18 + bw, 16, iw, 3);
  }
  ctx.restore();
};
/** a pointer path through [frame, x, y] waypoints */
const path = (l: number, w: [number, number, number][]) => {
  if (l <= w[0][0]) return { x: w[0][1], y: w[0][2] };
  for (let i = 1; i < w.length; i++) {
    const [f0, x0, y0] = w[i - 1],
      [f1, x1, y1] = w[i];
    if (l < f1) {
      const k = easeInOut((l - f0) / (f1 - f0));
      return { x: x0 + (x1 - x0) * k, y: y0 + (y1 - y0) * k };
    }
  }
  const e = w[w.length - 1];
  return { x: e[1], y: e[2] };
};
/** a keypress bump: 1 at `at`, easing off over a few frames either side */
const press = (l: number, ats: number[]) =>
  ats.reduce((a, c) => Math.max(a, l >= c - 6 && l < c + 8 ? 1 - Math.abs(l - c) / 8 : 0), 0);

// ---------------------------------------------------------------- cold: huts on the tide line, unconnected
const CG = 880,
  CH = [
    { x: 360, name: "Ferry times" },
    { x: 960, name: "Trip ideas", token: true },
    { x: 1560, name: "Salt lakes" },
  ];
const PIN = 108;
const cold: Scene = {
  id: "cold",
  len: 210,
  draw: (ctx, env, s) => {
    CH.forEach((h, i) =>
      hut(ctx, s.f, h.x, CG, {
        name: h.name,
        token: h.token,
        k: s.t(i * 8, i * 8 + 22),
        sign: h.token ? seg(s.l, PIN, PIN + 12) : 1,
        seed: 11 + i,
      }),
    );
    // the quokka hops in from the left carrying the Trip ideas card and pins it on the middle hut
    const q = hopAlong(
      s.l,
      [
        [8, -160, CG],
        [30, 120, CG],
        [52, 400, CG],
        [74, 660, CG],
        [92, 760, CG],
      ],
      90,
    );
    const pz = poseAt(s.l, [
      [0, "walking"],
      [92, "notes"],
      [PIN + 10, "attention"],
      [124, "base"],
      [150, "thoughtful"],
    ]);
    const look = s.l >= 124 && s.l < 144 ? true : false;
    actor(ctx, env, s.f, {
      pose: pz.pose,
      x: q.x,
      y: q.y,
      h: 260,
      lift: q.lift,
      squash: q.squash * pz.squash,
      flip: look,
      lean: Math.sin(s.f / 9) * 2 + (q.moving ? 5 : 0),
    });
    if (s.l < PIN) {
      const fly = easeInOut(seg(s.l, 96, PIN)),
        hx = q.x + 90,
        hy = q.y - q.lift - 170,
        tx = 960,
        ty = CG - HH + 90;
      card(ctx, {
        x: hx + (tx - hx) * fly,
        y: hy + (ty - hy) * fly - Math.sin(fly * Math.PI) * 60,
        rot: -0.1 * (1 - fly) + Math.sin(s.f / 8) * 0.04 * (1 - fly),
        scale: 1 + 0.25 * fly,
        title: "Trip ideas",
        token: true,
        lines: 1,
        seed: 12,
        frame: s.f,
      });
    }
    thought(ctx, s, 760, CG - 250, "link", s.t(152, 172));
  },
};
const chapter: Scene = {
  id: "chapter",
  len: 120,
  draw: (ctx, env, s) => chapterCard(ctx, env, s, { no: 6, title: ["Threads."], pose: "thoughtful" }),
};

// ---------------------------------------------------------------- links: ropes between huts; the slack one is inert
const GY = 800,
  LX = { ferry: 260, trip: 740, salt: 1220, ghost: 1680 };
const TIE1 = 110,
  TIE2 = 225,
  THROW = 320,
  LAND = 340;
const links: Scene = {
  id: "links",
  len: 420,
  draw: (ctx, env, s) => {
    const l = s.l,
      pT = postOf(LX.trip, GY),
      pF = postOf(LX.ferry, GY),
      pS = postOf(LX.salt, GY),
      pG = postOf(LX.ghost, GY);
    hut(ctx, s.f, LX.ferry, GY, { name: "Ferry times", seed: 11 });
    hut(ctx, s.f, LX.trip, GY, { name: "Trip ideas", token: true, seed: 12 });
    hut(ctx, s.f, LX.salt, GY, { name: "Salt lakes", seed: 13 });
    hut(ctx, s.f, LX.ghost, GY, { name: "Snorkel spots", ghost: easeOut(seg(l, 286, 306)) });
    // the quokka: rope 1 to Ferry times, rope 2 to Salt lakes, rope 3 toward the hut that isn't there
    const q = hopAlong(
      l,
      [
        [20, 980, GY],
        [44, 740, GY],
        [68, 500, GY],
        [150, 500, GY],
        [172, 740, GY],
        [194, 980, GY],
        [256, 980, GY],
        [280, 1220, GY],
        [304, 1450, GY],
      ],
      80,
    );
    const pz = poseAt(l, [
      [0, "attention"],
      [20, "walking"],
      [92, "celebrating"],
      [122, "base"],
      [150, "walking"],
      [208, "celebrating"],
      [236, "base"],
      [256, "walking"],
      [312, "celebrating"],
      [LAND, "thoughtful"],
    ]);
    const paw: Pt = [q.x + (q.dir < 0 ? -40 : 40), q.y - q.lift - 150];
    // tied ropes: snap taut (the sag overshoots once) and light up
    const tied = (at: number, a: Pt, b: Pt, seed: number) => {
      if (l < at) return;
      const k = pop(seg(l, at, at + 16));
      rope(ctx, s.f, a, b, 60 - 40 * k, { col: C.clay, w: 6, seed });
    };
    tied(TIE1, pT, pF, 3);
    tied(TIE2, pT, pS, 4);
    // a rope being carried from its post to the paw, then thrown to a post
    const carry = (from: Pt, to: Pt, t0: number, t1: number, seed: number) => {
      if (l < t0 || l >= t1) return;
      const th = easeOut(seg(l, t1 - 12, t1)),
        end: Pt = [paw[0] + (to[0] - paw[0]) * th, paw[1] + (to[1] - paw[1]) * th - Math.sin(th * Math.PI) * 60];
      rope(ctx, s.f, from, end, 70, { col: C.muted, w: 5, seed });
    };
    carry(pT, pF, 20, TIE1, 3);
    carry(pT, pS, 150, TIE2, 4);
    // rope 3: carried, thrown toward the ghost's post, falls short and lies slack in the sand
    if (l >= 256 && l < THROW) rope(ctx, s.f, pS, paw, 70, { col: C.muted, w: 5, seed: 5 });
    const drape: Pt[] = [
      pS,
      [1262, pS[1] + 58],
      [1330, 512],
      [1392, 566],
      [1418, 700],
      [1440, GY + 2],
      [1492, GY + 6],
      [1530, GY + 2],
    ];
    if (l >= THROW && l < LAND) {
      const th = seg(l, THROW, LAND),
        rise = Math.min(1, th / 0.55),
        fall = seg(th, 0.55, 1);
      const end: Pt =
        fall <= 0
          ? [paw[0] + (pG[0] - 60 - paw[0]) * easeOut(rise), paw[1] + (pG[1] + 40 - paw[1]) * easeOut(rise)]
          : [pG[0] - 60 + (1530 - pG[0] + 60) * fall, pG[1] + 40 + (GY + 2 - pG[1] - 40) * fall * fall];
      rope(ctx, s.f, pS, end, 90 * (1 - th) + 40, { col: C.muted, w: 5, seed: 5 });
    }
    if (l >= LAND) ink(ctx, drape, { w: 5, color: C.muted, seed: 5, frame: s.f, wob: 0.8, boil: 0.4 });
    actor(ctx, env, s.f, {
      pose: pz.pose,
      x: q.x,
      y: q.y,
      h: 230,
      lift: q.lift,
      squash: q.squash * pz.squash,
      flip: q.moving ? q.dir < 0 : l >= 20 && l < 150,
      lean: Math.sin(s.f / 9) * 2,
    });
    // the wikilinks each rope is
    linkChip(ctx, (pT[0] + pF[0]) / 2, pT[1] - 44, "[[Ferry times]]", true, seg(l, TIE1 + 4, TIE1 + 20));
    linkChip(ctx, (pT[0] + pS[0]) / 2, pT[1] - 44, "[[Salt lakes]]", true, seg(l, TIE2 + 4, TIE2 + 20));
    linkChip(ctx, 1640, GY + 52, "[[Snorkel spots]]", false, seg(l, LAND + 4, LAND + 20));
    thought(ctx, s, 1450, GY - 216, "question", s.t(350, 368), { side: -1, scale: 0.85 });
    lowerThird(ctx, l, 128, s.len, "Wikilinks connect notes.", "A link to nothing looks inert, never live.");
  },
};

// ---------------------------------------------------------------- the app window (both demos): Trip ideas, as Rotli renders its links
const WIN = { x: 90, y: 40, k: 1.2, w: 1380, h: 650 },
  SIDE = 300;
const inWindow = (ctx: Ctx, s: S, fn: () => void) => {
  const k = pop(s.t(0, 16)),
    z = WIN.k * (0.94 + 0.06 * k);
  ctx.save();
  ctx.translate(WIN.x + (WIN.w * WIN.k) / 2, WIN.y + (WIN.h * WIN.k) / 2);
  ctx.scale(z, z);
  ctx.translate(-WIN.w / 2, -WIN.h / 2);
  ctx.globalAlpha = Math.min(1, k * 1.4);
  fn();
  ctx.restore();
};
/** the window shell: surface, traffic lights, a sidebar ground; returns nothing, callers draw the sidebar */
const shell = (ctx: Ctx, title: string) => {
  const R = T.roles;
  ctx.save();
  ctx.globalAlpha *= 0.12;
  fillRR(ctx, 10, 16, WIN.w, WIN.h, 26, R.text);
  ctx.restore();
  fillRR(ctx, 0, 0, WIN.w, WIN.h, 26, R.surface, R.text, 4);
  ctx.save();
  rr(ctx, 0, 0, WIN.w, WIN.h, 26);
  ctx.clip();
  ctx.fillStyle = R.ground;
  ctx.fillRect(0, 0, SIDE, WIN.h);
  ctx.fillStyle = R.border;
  ctx.fillRect(SIDE, 0, 2, WIN.h);
  ctx.restore();
  ["#e8836f", "#e8c46f", "#9cc27e"].forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(32 + i * 28, 32, 9, 0, 6.29);
    ctx.fill();
  });
  text(ctx, title, SIDE + (WIN.w - SIDE) / 2, 40, { size: 22, weight: 500, align: "center", color: R["text-muted"] });
};
/** the Trip ideas note: two live links and one to a note that doesn't exist (inert: muted, never underlined) */
const tripNote = (ctx: Ctx, x: number, y: number, hover = 0) => {
  heading(ctx, T, x, y + 60, "Trip ideas", 54);
  link(ctx, T, x, y + 140, "Take the ferry: ", "Ferry times");
  link(ctx, T, x, y + 200, "Walk to the ", "Salt lakes");
  para(ctx, T, x, y + 260, "Maybe ");
  text(ctx, "Snorkel spots", x + measure(ctx, "Maybe ", 30), y + 260, {
    size: 30,
    weight: 500,
    color: T.roles["text-muted"],
  });
  if (hover > 0) {
    const lx = x + measure(ctx, "Take the ferry: ", 30);
    ctx.save();
    ctx.globalAlpha *= hover;
    fillRR(ctx, lx - 8, y + 104, measure(ctx, "Ferry times", 30, 600) + 16, 50, 8, T.roles.tint);
    ctx.restore();
    link(ctx, T, x, y + 140, "Take the ferry: ", "Ferry times");
  }
};
/** a small kind icon for a palette row */
const kindIcon = (ctx: Ctx, kind: string, x: number, y: number) => {
  const R = T.roles;
  ctx.save();
  ctx.translate(x, y);
  if (kind === "Action") {
    fillRR(ctx, -18, -18, 36, 36, 8, R.tint);
    text(ctx, "⌘", 0, 9, { size: 24, weight: 600, align: "center", color: R["accent-text"] });
  } else if (kind === "File") {
    fillRR(ctx, -14, -18, 28, 36, 4, R.surface, R.failure, 3);
    ctx.fillStyle = R.failure;
    ctx.fillRect(-8, -6, 16, 3);
    ctx.fillRect(-8, 2, 12, 3);
  } else {
    ctx.scale(0.62, 0.62);
    glyph(ctx, kind === "Chat" ? "chat" : "note", R["text-muted"], kind === "Chat" ? R.tint : R["surface-2"]);
  }
  ctx.restore();
};
/** the ⌘K palette: a query, ranked rows (the matched prefix in the accent), the selected row tinted */
const palette = (
  ctx: Ctx,
  s: S,
  q: string,
  rows: { name: string; kind: string; keys?: string; k: number }[],
  sel: number,
  qs: number,
  k: number,
) => {
  if (k <= 0) return;
  const R = T.roles,
    X = 250,
    Y = 84,
    Wp = 930,
    rowH = 70,
    Hp = 118 + Math.max(1, rows.length) * rowH + 18;
  ctx.save();
  ctx.globalAlpha *= Math.min(1, k * 1.5);
  ctx.translate(X + Wp / 2, Y);
  ctx.scale(0.96 + 0.04 * k, 0.96 + 0.04 * k);
  ctx.translate(-Wp / 2, 0);
  ctx.save();
  ctx.globalAlpha *= 0.12;
  fillRR(ctx, 8, 12, Wp, Hp, 20, R.text);
  ctx.restore();
  fillRR(ctx, 0, 0, Wp, Hp, 20, R.surface, R.border, 3);
  ctx.save();
  ctx.translate(46, 50);
  ctx.scale(0.62, 0.62);
  glyph(ctx, "search", R["text-muted"], R.tint);
  ctx.restore();
  text(ctx, q, 92, 62, { size: 34, weight: 500, color: R.text });
  caret(ctx, T, 92 + measure(ctx, q, 34), 62, s.f, 34);
  if (!q) text(ctx, "Search notes, files, chats and actions", 92, 62, { size: 30, color: R["text-muted"] });
  ctx.fillStyle = R.border;
  ctx.fillRect(0, 100, Wp, 2);
  rows.forEach((r, i) => {
    if (r.k <= 0) return;
    const y = 118 + i * rowH;
    ctx.save();
    ctx.globalAlpha *= Math.min(1, r.k * 1.4);
    ctx.translate(0, (1 - easeOut(r.k)) * 14);
    if (i === sel) fillRR(ctx, 12, y, Wp - 24, rowH - 8, 12, R.tint);
    kindIcon(ctx, r.kind, 52, y + 31);
    const m = r.name.toLowerCase().startsWith(q.toLowerCase()) ? q.length : 0,
      a = r.name.slice(0, m),
      b = r.name.slice(m);
    text(ctx, a, 90, y + 42, { size: 30, weight: 700, color: R["accent-text"] });
    text(ctx, b, 90 + measure(ctx, a, 30, 700), y + 42, { size: 30, weight: 500, color: R.text });
    let rx = Wp - 34;
    text(ctx, r.kind, rx, y + 41, { size: 24, align: "right", color: R["text-muted"] });
    rx -= measure(ctx, r.kind, 24) + 22;
    if (r.keys) {
      const w = measure(ctx, r.keys, 24, 600) + 22;
      fillRR(ctx, rx - w, y + 13, w, 38, 8, R["surface-2"], R.border, 2);
      text(ctx, r.keys, rx - w / 2, y + 41, { size: 24, weight: 600, align: "center", color: R.text });
    }
    ctx.restore();
  });
  ctx.restore();
  void qs;
};

// ---------------------------------------------------------------- search: ⌘K ranks every kind of thing
const K_AT = 30,
  ESC = 290;
const TRIP_ROWS = [
  { name: "Trip ideas", kind: "Note" },
  { name: "Trip chat", kind: "Chat" },
  { name: "trip-map.pdf", kind: "File" },
  { name: "Trip packing list", kind: "Note" },
];
const SPLIT_ROWS = [
  { name: "Split right", kind: "Action", keys: "⌘D" },
  { name: "Split down", kind: "Action", keys: "⌘⇧D" },
];
const search: Scene = {
  id: "search",
  len: 360,
  draw: (ctx, env, s) => {
    const l = s.l,
      R = T.roles,
      open = l >= K_AT + 4 && l < ESC + 10,
      pk = l < ESC ? pop(seg(l, K_AT + 4, K_AT + 18)) : 1 - easeOut(seg(l, ESC, ESC + 10));
    const second = l >= 164,
      q = second ? "split".slice(0, Math.round(5 * seg(l, 170, 190))) : "trip".slice(0, Math.round(4 * seg(l, 50, 74)));
    const rows = second
      ? SPLIT_ROWS.map((r, i) => ({ ...r, k: seg(l, 194 + i * 6, 206 + i * 6) }))
      : TRIP_ROWS.map((r, i) => ({ ...r, k: seg(l, 78 + i * 6, 90 + i * 6) }));
    const sel = second ? 0 : l >= 148 ? 2 : l >= 128 ? 1 : 0;
    inWindow(ctx, s, () => {
      shell(ctx, "Trip ideas.md");
      text(ctx, "Home", 34, 104, { size: 25, color: R["text-muted"] });
      text(ctx, "Main", 34, 150, { size: 25, weight: 600, color: R.text });
      ["Trip ideas", "Ferry times", "Salt lakes", "Call Sam"].forEach((n, i) => {
        const y = 192 + i * 46;
        if (!i) fillRR(ctx, 18, y - 30, SIDE - 36, 44, 10, R.tint);
        text(ctx, n, 52, y, { size: 24, weight: i ? 500 : 600, color: i ? R["text-muted"] : R.text });
      });
      text(ctx, "Files", 34, WIN.h - 34, { size: 24, color: R["text-muted"] });
      const hover = seg(l, ESC + 24, ESC + 34);
      tripNote(ctx, SIDE + 64, 80, hover);
      if (open) {
        ctx.save();
        ctx.globalAlpha = 0.1 * Math.min(1, pk);
        ctx.fillStyle = R.text;
        rr(ctx, 0, 0, WIN.w, WIN.h, 26);
        ctx.fill();
        ctx.restore();
        palette(ctx, s, q, rows, sel, 0, pk);
      }
      const p = path(l, [
        [0, 1180, 560],
        [ESC + 6, 1180, 560],
        [ESC + 30, SIDE + 64 + measure(ctx, "Take the ferry: ", 30) + 70, 244],
      ]);
      pointer(ctx, p.x, p.y);
    });
    keys(ctx, 1300, 880, ["⌘", "K"], press(l, [K_AT]), 56);
    actor(ctx, env, s.f, {
      pose: l < K_AT ? "attention" : "searching",
      x: 1810,
      y: 1050,
      h: 220,
      lean: Math.sin(s.f / 10) * 3 + Math.sin(s.f / 4.1) * 0.8,
    });
    lowerThird(
      ctx,
      l,
      40,
      s.len,
      "⌘K finds every note, file, chat, and action.",
      "⌘T starts a note and ⌘N chooses what a new tab becomes.",
    );
  },
};

// ---------------------------------------------------------------- views: Main and a named view arrange the same notes; ⌘D splits
const SWITCH = 60,
  D_AT = 210;
// each note keeps its identity; only its slot changes between Main and the Trip view (Call Sam isn't in the Trip view)
const ROWS = [
  { n: "Trip ideas", main: 0, trip: 2 },
  { n: "Ferry times", main: 1, trip: 1 },
  { n: "Salt lakes", main: 2, trip: 4 },
  { n: "Call Sam", main: 3, trip: -1 },
];
const views: Scene = {
  id: "views",
  len: 360,
  draw: (ctx, env, s) => {
    const l = s.l,
      R = T.roles,
      v = easeInOut(seg(l, SWITCH + 2, SWITCH + 32)),
      sp = easeInOut(seg(l, D_AT + 4, D_AT + 26));
    inWindow(ctx, s, () => {
      shell(ctx, sp > 0.5 ? "Trip ideas.md · Ferry times.md" : "Trip ideas.md");
      text(ctx, "Home", 34, 104, { size: 25, color: R["text-muted"] });
      // the view switcher: Main | Trip
      fillRR(ctx, 18, 124, SIDE - 36, 50, 12, R.surface, R.border, 2);
      const half = (SIDE - 44) / 2;
      fillRR(ctx, 22 + v * half, 128, half, 42, 9, R.tint);
      text(ctx, "Main", 22 + half / 2, 159, {
        size: 24,
        weight: 600,
        align: "center",
        color: v < 0.5 ? R.text : R["text-muted"],
      });
      text(ctx, "Trip", 22 + half * 1.5, 159, {
        size: 24,
        weight: 600,
        align: "center",
        color: v >= 0.5 ? R.text : R["text-muted"],
      });
      // group headers of the Trip view
      const slotY = (i: number) => 226 + i * 46;
      text(ctx, "Getting there", 34, slotY(0), { size: 22, weight: 600, color: R["accent-text"], alpha: v });
      text(ctx, "On the island", 34, slotY(3), { size: 22, weight: 600, color: R["accent-text"], alpha: v });
      ROWS.forEach((r) => {
        const gone = r.trip < 0,
          y = gone ? slotY(r.main) : slotY(r.main) + (slotY(r.trip) - slotY(r.main)) * v,
          x = 52 + (gone ? 0 : 12 * v),
          a = gone ? 1 - v : 1;
        if (a <= 0) return;
        ctx.save();
        ctx.globalAlpha *= a;
        if (r.n === "Trip ideas") fillRR(ctx, 18, y - 30, SIDE - 36, 44, 10, R.tint);
        text(ctx, r.n, x, y, {
          size: 24,
          weight: r.n === "Trip ideas" ? 600 : 500,
          color: r.n === "Trip ideas" ? R.text : R["text-muted"],
        });
        ctx.restore();
      });
      text(ctx, "Files", 34, WIN.h - 34, { size: 24, color: R["text-muted"] });
      // the editor: one pane, then two
      const EX = SIDE + 64,
        EW = WIN.w - SIDE - 110,
        lw = EW - (EW / 2 + 10) * sp;
      ctx.save();
      ctx.beginPath();
      ctx.rect(SIDE + 2, 60, SIDE + 40 + lw - SIDE, WIN.h - 60);
      ctx.clip();
      tripNote(ctx, EX, 80);
      ctx.restore();
      if (sp > 0) {
        const dx = SIDE + 64 + lw + 20;
        ctx.fillStyle = R.border;
        ctx.fillRect(dx - 20 + 18, 60, 2, WIN.h - 60);
        ctx.save();
        ctx.globalAlpha *= sp;
        ctx.translate((1 - sp) * 60, 0);
        const x = dx + 40;
        heading(ctx, T, x, 140, "Ferry times", 54);
        para(ctx, T, x, 220, "Leaves at 9:30");
        para(ctx, T, x, 280, "Back by 4:30");
        link(ctx, T, x, 340, "Linked from ", "Trip ideas");
        ctx.restore();
      }
      const p = path(l, [
        [0, 900, 520],
        [SWITCH - 18, 22 + half * 1.5 + 10, 152],
        [SWITCH + 40, 22 + half * 1.5 + 10, 152],
        [D_AT - 30, 1000, 480],
        [s.len, 1060, 470],
      ]);
      pointer(ctx, p.x, p.y, seg(l, SWITCH, SWITCH + 14));
    });
    keys(ctx, 1300, 880, ["⌘", "D"], press(l, [D_AT]), 56);
    actor(ctx, env, s.f, {
      pose: l < D_AT + 20 ? "knowledge_system" : "celebrating",
      x: 1810,
      y: 1050,
      h: 220,
      lean: Math.sin(s.f / 10) * 3 + Math.sin(s.f / 4.1) * 0.8,
    });
    lowerThird(ctx, l, 24, 200, "Main and named views arrange the same files", "without copying them.");
    lowerThird(ctx, l, 206, s.len, "Panes and tabs split with ⌘D and ⌘⇧D;", "every hotkey can be rebound.");
  },
};

// ---------------------------------------------------------------- payoff: tied together, nothing moved
const PG = 960,
  PS = 0.62,
  PX = { ferry: 560, trip: 960, salt: 1360 };
const payoff: Scene = {
  id: "payoff",
  len: 210,
  draw: (ctx, env, s) => {
    intertitle(ctx, s, ["Nothing moved.", "Everything is tied together."], { hi: "tied", y: 250 });
    const pF = postOf(PX.ferry, PG, PS),
      pT = postOf(PX.trip, PG, PS),
      pS = postOf(PX.salt, PG, PS);
    hut(ctx, s.f, PX.ferry, PG, { name: "Ferry times", sc: PS, seed: 11 });
    hut(ctx, s.f, PX.trip, PG, { name: "Trip ideas", token: true, sc: PS, seed: 12 });
    hut(ctx, s.f, PX.salt, PG, { name: "Salt lakes", sc: PS, seed: 13 });
    rope(ctx, s.f, pT, pF, 14 + Math.sin(s.f / 17) * 3, { col: C.clay, w: 5, seed: 3 });
    rope(ctx, s.f, pT, pS, 14 + Math.sin(s.f / 19 + 1) * 3, { col: C.clay, w: 5, seed: 4 });
    const bounce = [40, 100, 160].reduce(
      (a, c) => Math.max(a, s.l >= c && s.l < c + 20 ? Math.sin(((s.l - c) / 20) * Math.PI) : 0),
      0,
    );
    actor(ctx, env, s.f, {
      pose: "celebrating",
      x: 1160,
      y: PG,
      h: 180,
      lift: bounce * 46,
      squash: 1 + 0.05 * bounce,
      lean: Math.sin(s.f / 9) * 3,
    });
  },
};
const end: Scene = {
  id: "end",
  len: 120,
  draw: (ctx, env, s) => storyEnd(ctx, env, s, { next: "Ask the Island", pose: "waving" }),
};

const SCENES = [cold, chapter, links, search, views, payoff, end];
const LI = sceneStart(SCENES, "links"),
  SE = sceneStart(SCENES, "search"),
  VI = sceneStart(SCENES, "views"),
  PA = sceneStart(SCENES, "payoff");
export const s01e06Threads: Film = story({
  id: "s01e06Threads",
  no: 6,
  title: "Threads.",
  atmosphere: "ocean-tide",
  scenes: SCENES,
  score: {
    key: 7,
    melody: 1,
    pops: [
      [PIN, 84],
      [LI + TIE1, 79],
      [LI + TIE2, 84],
      [SE + K_AT, 88],
      [SE + 78, 81],
      [SE + 194, 86],
      [VI + SWITCH, 84],
      [VI + D_AT, 88],
      [PA + 40, 91],
      [PA + 100, 91],
    ],
    thumps: [30, 52, 74, 92, LI + LAND],
  },
});

export const s01e06Derive: DeriveSpec = {
  no: 6,
  series: "season-one",
  label: "Rotli · Season One · 06",
  vertical: [
    {
      frame: 60,
      len: 150,
      crop: { x: 180, y: 213, w: 1560, h: 867 },
      title: "Notes, like huts.",
      sub: "Each one on its own.",
      hi: "huts",
    },
    {
      frame: LI + 150,
      len: 240,
      crop: { x: 336, y: 200, w: 1584, h: 880 },
      title: "Tie them with [[links]].",
      sub: "A link to nothing looks inert.",
      hi: "links",
    },
    {
      frame: SE + 40,
      len: 210,
      crop: { x: 330, y: 90, w: 1240, h: 720 },
      title: "⌘K finds it.",
      sub: "Every note, file, chat, and action.",
      hi: "⌘K",
    },
    {
      frame: VI + 40,
      len: 240,
      crop: { x: 90, y: 20, w: 1600, h: 889 },
      title: "Views and panes.",
      sub: "The same files, arranged. Split with ⌘D.",
      hi: "Views",
    },
  ],
  slides: [
    {
      frame: 200,
      crop: { x: 180, y: 213, w: 1560, h: 867 },
      title: "Notes, like huts.",
      sub: "Each one on its own.",
      hi: "huts",
    },
    {
      frame: LI + 400,
      crop: { x: 336, y: 200, w: 1584, h: 880 },
      title: "Tie them with [[links]].",
      sub: "A link to nothing looks inert.",
      hi: "links",
    },
    {
      frame: SE + 110,
      crop: { x: 330, y: 90, w: 1240, h: 720 },
      title: "⌘K finds it.",
      sub: "Every note, file, chat, and action.",
      hi: "⌘K",
    },
    {
      frame: VI + 300,
      crop: { x: 90, y: 20, w: 1600, h: 889 },
      title: "Views and panes.",
      sub: "The same files, arranged. Split with ⌘D.",
      hi: "Views",
    },
  ],
  single: {
    frame: LI + 400,
    crop: { x: 100, y: 124, w: 1720, h: 956 },
    title: "Threads.",
    sub: "Wikilinks connect notes.",
    hi: "Threads",
  },
};
