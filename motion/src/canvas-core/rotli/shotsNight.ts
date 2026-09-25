// SHOTS 5 and 7: the vault at night, in Rotli's dark environment. The lighthouse is the Librarian's
// lamp; secure notes stay home under a dome the remote clouds bounce off.
import { rng, type Ctx, type Env, type P } from "../core";
import { actor, poseAt } from "./actor";
import { lighthouse } from "./island";
import {
  C,
  beatLabel,
  card,
  chip,
  cloud,
  easeIn,
  easeInOut,
  easeOut,
  fillRR,
  ink,
  lerp,
  nightGround,
  pop,
  seg,
  sparkle,
  text,
} from "./kit";

const flat = (ctx: Ctx, env: Env) => ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);

// ---------------------------------------------------------------- 5 · the librarian keeps it tidy (720-960)
const COLS = [
  { name: "People", x: 900 },
  { name: "Projects", x: 1240 },
  { name: "Research", x: 1580 },
];
const NOTES: { t: string; col: number; tag: string; token?: boolean }[] = [
  { t: "Trip ideas", col: 1, tag: "#travel", token: true },
  { t: "Mum's birthday", col: 0, tag: "#family" },
  { t: "Ferry times", col: 1, tag: "#travel" },
  { t: "Quokka facts", col: 2, tag: "#nature" },
  { t: "Call with Sam", col: 0, tag: "#work" },
  { t: "Salt lakes", col: 2, tag: "#nature" },
];
const LINKS: [number, number][] = [
  [0, 2],
  [0, 5],
  [3, 5],
  [1, 4],
];
export const shotLibrarian = (F0: number) => (ctx: Ctx, l: number, env: Env) => {
  const f = F0 + l;
  flat(ctx, env);
  nightGround(ctx, f);
  lighthouse(ctx, 170, 1080, 1.75, f, easeOut(seg(l, 0, 20)), "night");
  // the Librarian, lit where the beam lands
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = "#fbe7b0";
  ctx.beginPath();
  ctx.ellipse(520, 1000, 260, 60, 0, 0, 6.29);
  ctx.fill();
  ctx.restore();
  // shelf headers
  COLS.forEach((c, i) => {
    const k = seg(l, 6 + i * 5, 18 + i * 5);
    text(ctx, c.name, c.x + 140, 250, { size: 34, weight: 600, align: "center", color: C.nightText, alpha: k });
    ink(
      ctx,
      [
        [c.x + 20, 270],
        [c.x + 260, 268],
      ],
      { w: 4, color: C.clay, seed: 500 + i, frame: f, progress: k },
    );
  });
  // the inbox pile, then each note flies to its shelf and gets its tag
  const slot = (i: number): P => {
    const n = NOTES[i],
      row = NOTES.slice(0, i).filter((m) => m.col === n.col).length;
    return [COLS[n.col].x + 140, 380 + row * 230];
  };
  const pile: P = [790, 830];
  NOTES.forEach((n, i) => {
    const t0 = 24 + i * 18,
      k = easeInOut(seg(l, t0, t0 + 20)),
      [sx, sy] = slot(i);
    const x = lerp(pile[0] + i * 4, sx, k),
      y = lerp(pile[1] - i * 10, sy, k) - Math.sin(k * Math.PI) * 170;
    const landed = l >= t0 + 20;
    card(ctx, {
      x,
      y,
      rot: lerp(-0.1 + i * 0.05, 0, k),
      scale: lerp(0.8, 1, k),
      title: n.t,
      token: n.token,
      lines: 2,
      seed: 30 + i,
      frame: f,
      dark: true,
      tag: landed && l >= t0 + 24 ? n.tag : undefined,
    });
    if (landed) sparkle(ctx, sx + 100, sy - 60, 16 * (1 - seg(l, t0 + 20, t0 + 32)), C.clay, l / 5);
  });
  // [[links]] thread between related notes
  LINKS.forEach(([a, b], i) => {
    const t0 = 146 + i * 12,
      k = seg(l, t0, t0 + 18);
    if (k <= 0) return;
    const [ax, ay] = slot(a),
      [bx, by] = slot(b),
      mx = (ax + bx) / 2,
      my = Math.min(ay, by) - 110;
    const A: P = [ax + (bx > ax ? 95 : -95), ay],
      B: P = [bx + (bx > ax ? -95 : 95), by];
    ink(ctx, [A, [mx, my], B], { w: 4, color: C.clay, seed: 600 + i, frame: f, progress: k, dash: [12, 9] });
    ctx.fillStyle = C.clay;
    ctx.beginPath();
    ctx.arc(A[0], A[1], 7, 0, 6.29);
    ctx.fill();
    if (k >= 1) {
      ctx.beginPath();
      ctx.arc(B[0], B[1], 7, 0, 6.29);
      ctx.fill();
    }
  });
  if (l >= 150)
    text(ctx, "[[links]]", 1410, 175, {
      size: 26,
      weight: 600,
      color: C.clay,
      alpha: seg(l, 150, 162),
      font: "Menlo, monospace",
    });
  // what it never does, said plainly
  const s1 = pop(seg(l, 186, 198)),
    s2 = pop(seg(l, 196, 208));
  if (s1 > 0) {
    ctx.save();
    ctx.translate(900, 1000);
    ctx.scale(s1, s1);
    chip(ctx, 0, 0, "never rewrites your words", {
      size: 24,
      bg: C.nightSurface2,
      fg: C.nightText,
      border: C.nightBorder,
    });
    ctx.restore();
  }
  if (s2 > 0) {
    ctx.save();
    ctx.translate(1290, 1000);
    ctx.scale(s2, s2);
    chip(ctx, 0, 0, "↶ every move can be undone", {
      size: 24,
      bg: C.nightSurface2,
      fg: C.nightText,
      border: C.nightBorder,
    });
    ctx.restore();
  }
  const p = poseAt(l, [
    [0, "knowledge_system"],
    [132, "searching"],
    [178, "knowledge_system"],
  ]);
  actor(ctx, env, f, {
    pose: p.pose,
    x: 520,
    y: 1000,
    h: 440,
    squash: p.squash * (1 + 0.02 * Math.sin(l / 3) * (l > 24 && l < 132 ? 1 : 0)),
    shadowCol: "#000",
  });
  beatLabel(ctx, f, l, 5, "the librarian keeps it tidy", "files, tags and links, on-device by default", true);
};

// ---------------------------------------------------------------- 7 · secure stays home (1140-1350)
export const shotSecure = (F0: number) => (ctx: Ctx, l: number, env: Env) => {
  const f = F0 + l;
  flat(ctx, env);
  nightGround(ctx, f, 19);
  const CX = 960,
    CY = 1010,
    R = 470;
  // the dome: this Mac. Drawn in, then it holds
  const dome = easeOut(seg(l, 8, 40));
  ctx.save();
  ctx.globalAlpha = 0.1 * dome;
  ctx.fillStyle = C.oliveBright;
  ctx.beginPath();
  ctx.arc(CX, CY, R, Math.PI, 0);
  ctx.fill();
  ctx.restore();
  const pts: P[] = Array.from({ length: 19 }, (_, i) => {
    const a = Math.PI + (i / 18) * Math.PI;
    return [CX + Math.cos(a) * R, CY + Math.sin(a) * R];
  });
  ink(ctx, pts, { w: 5, color: C.oliveBright, seed: 700, frame: f, progress: dome, dash: [16, 12] });
  text(ctx, "on this Mac", CX, CY - R - 24, {
    size: 26,
    weight: 600,
    align: "center",
    color: C.oliveBright,
    alpha: seg(l, 30, 44),
  });
  // the secure note slides home and locks
  const k = easeOut(seg(l, 14, 44));
  card(ctx, {
    x: lerp(-200, 700, k),
    y: 800,
    rot: lerp(-0.3, -0.06, k),
    scale: 1.05,
    title: "passport.md",
    lock: l >= 46,
    lines: 2,
    seed: 71,
    frame: f,
    dark: true,
  });
  if (l >= 50) {
    const s = pop(seg(l, 50, 62));
    ctx.save();
    ctx.translate(610, 900);
    ctx.scale(s, s);
    chip(ctx, 0, 0, "wiki/_secure/", {
      size: 24,
      bg: C.nightSurface2,
      fg: C.nightText,
      border: C.nightBorder,
      mono: true,
    });
    ctx.restore();
  }
  if (l >= 44 && l < 60) sparkle(ctx, 780, 770, 20 * (1 - seg(l, 44, 60)), C.clay, l / 4);
  // the on-device model: a little chip friend inside the dome, who may read it
  const cx = 1230,
    cy = 860,
    cs = pop(seg(l, 60, 74));
  if (cs > 0) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(cs, cs);
    fillRR(ctx, -70, -60, 140, 120, 18, "#8d9a76", C.ink, 4);
    for (let i = -2; i <= 2; i++) {
      ctx.fillStyle = C.nightText;
      ctx.fillRect(i * 24 - 4, -76, 8, 16);
      ctx.fillRect(i * 24 - 4, 60, 8, 16);
    }
    ctx.fillStyle = C.ink;
    ctx.beginPath();
    ctx.arc(-24, -8, 8, 0, 6.29);
    ctx.arc(24, -8, 8, 0, 6.29);
    ctx.fill();
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 8, 16, 0.2, Math.PI - 0.2);
    ctx.stroke();
    ctx.restore();
    text(ctx, "on-device model", cx, cy + 118, {
      size: 22,
      weight: 600,
      align: "center",
      color: C.nightText,
      alpha: seg(l, 70, 82),
    });
    if (l >= 150) {
      const s = pop(seg(l, 150, 162));
      ctx.save();
      ctx.translate(cx + 70, cy - 70);
      ctx.scale(s, s);
      ctx.fillStyle = C.olive;
      ctx.beginPath();
      ctx.arc(0, 0, 24, 0, 6.29);
      ctx.fill();
      ink(
        ctx,
        [
          [-10, 0],
          [-3, 8],
          [11, -8],
        ],
        { w: 5, color: C.surface, wob: 0, boil: 0 },
      );
      ctx.restore();
    }
  }
  // remote clouds drift in, hit the dome, and bounce off
  const r = rng(91);
  for (let i = 0; i < 3; i++) {
    const t0 = 70 + i * 16,
      hit = t0 + 28;
    if (l < t0) continue;
    const edge: P = [CX + (i === 1 ? -1 : 1) * (R + 60) * [0.72, 0.55, 0.9][i], CY - (R + 60) * [0.7, 0.84, 0.44][i]];
    let x: number,
      y: number,
      face: "curious" | "dizzy" = "curious";
    if (l < hit) {
      const k = easeIn(seg(l, t0, hit));
      x = lerp(edge[0] + (i === 1 ? -500 : 500), edge[0], k);
      y = lerp(edge[1] - 300, edge[1], k);
    } else {
      const k = easeOut(seg(l, hit, hit + 24)),
        ox = edge[0] - CX,
        oy = edge[1] - CY,
        n = Math.hypot(ox, oy);
      x = edge[0] + (ox / n) * 180 * k;
      y = edge[1] + (oy / n) * 180 * k + Math.sin((l - hit) / 8) * 8;
      face = l < hit + 40 ? "dizzy" : "curious";
      if (l < hit + 12) {
        const b = 1 - (l - hit) / 12;
        ctx.save();
        ctx.globalAlpha = b;
        ctx.strokeStyle = C.badge;
        ctx.lineWidth = 6;
        for (let s = 0; s < 5; s++) {
          const a = s * 1.25 + r();
          ctx.beginPath();
          ctx.moveTo(edge[0] + Math.cos(a) * 30, edge[1] + Math.sin(a) * 30);
          ctx.lineTo(edge[0] + Math.cos(a) * (60 + 40 * (1 - b)), edge[1] + Math.sin(a) * (60 + 40 * (1 - b)));
          ctx.stroke();
        }
        ctx.restore();
      }
    }
    cloud(ctx, x, y, 0.95, { frame: f, seed: 60 + i, face });
    if (i === 0)
      text(ctx, "remote AI", x, y + 90, {
        size: 22,
        weight: 600,
        align: "center",
        color: C.nightMuted,
        alpha: seg(l, t0 + 10, t0 + 22),
      });
  }
  const s1 = pop(seg(l, 164, 176));
  if (s1 > 0) {
    ctx.save();
    ctx.translate(560, 150);
    ctx.scale(s1, s1);
    chip(ctx, 0, 0, "remote models never see secure notes", {
      size: 26,
      bg: C.nightSurface2,
      fg: C.nightText,
      border: C.nightBorder,
    });
    ctx.restore();
  }
  const p = poseAt(l, [
    [0, "stays_local"],
    [112, "listening"],
    [150, "stays_local"],
  ]);
  actor(ctx, env, f, {
    pose: p.pose,
    x: CX,
    y: CY,
    h: 440,
    squash: p.squash,
    shadowCol: "#000",
    lean: l > 98 && l < 130 ? Math.sin((l - 98) / 2) * 2 : 0,
  });
  beatLabel(ctx, f, l, 7, "secure stays home", "no cloud can look inside", true);
};
export { easeInOut };
