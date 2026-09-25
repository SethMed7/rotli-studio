// ROTTNEST, AS HINTS. The island is the vault: one place, nothing leaves it. Its lighthouse
// (Wadjemup) is the Librarian's lamp, the ferry brings the quokka and the mainland's noise, the
// turquoise bay, limestone and pink salt lake are the palette beside Rotli's linen and clay.
import { rng, type Ctx } from "../core";
import { C, H, W, ink, fillRR, lerp, text } from "./kit";

export type Mode = "day" | "sunset";
export const HORIZON = 560,
  SHORE_Y = 812;

const SUNSET = {
  skyTop: "#e9967a",
  skyMid: "#f2b98f",
  skyLow: "#f8dcbc",
  sea: "#5fb2ae",
  seaDeep: "#3c8c90",
  sand: "#ecc9a0",
};

export const sky = (ctx: Ctx, frame: number, mode: Mode) => {
  if (mode === "day") {
    ctx.fillStyle = C.sky;
    ctx.fillRect(0, 0, W, HORIZON);
  } else {
    const bands = [SUNSET.skyTop, "#eda683", SUNSET.skyMid, "#f5cba4", SUNSET.skyLow];
    bands.forEach((b, i) => {
      ctx.fillStyle = b;
      ctx.fillRect(0, (HORIZON / bands.length) * i, W, HORIZON / bands.length + 1);
    });
  }
  // two drifting clouds, drawn as linen puffs with an ink rim
  for (let i = 0; i < 3; i++) {
    const x = ((i * 700 + frame * (0.5 + i * 0.2)) % (W + 400)) - 200,
      y = 150 + i * 90;
    ctx.save();
    ctx.fillStyle = mode === "day" ? C.surface : "#fbe3cc";
    ctx.globalAlpha = 0.95;
    ctx.beginPath();
    ctx.ellipse(x, y, 90, 26, 0, 0, 6.29);
    ctx.ellipse(x - 50, y + 4, 50, 20, 0, 0, 6.29);
    ctx.ellipse(x + 40, y - 12, 56, 26, 0, 0, 6.29);
    ctx.fill();
    ctx.restore();
    ink(
      ctx,
      [
        [x - 100, y + 16],
        [x - 30, y + 26],
        [x + 80, y + 22],
        [x + 110, y + 8],
      ],
      { w: 3, seed: 300 + i, frame, alpha: 0.5, color: mode === "day" ? C.muted : C.clayText },
    );
  }
};
export const sun = (ctx: Ctx, x: number, y: number, r: number, col = "#f7d27e") => {
  ctx.save();
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 6.29);
  ctx.fill();
  ctx.strokeStyle = C.clay;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.restore();
};

/** far island: a low limestone hill with the lighthouse, bush, and the pink salt lake */
export const farIsland = (ctx: Ctx, frame: number, mode: Mode, beam = 0) => {
  ctx.save();
  ctx.fillStyle = mode === "day" ? C.limestone : "#d9a883";
  ctx.beginPath();
  ctx.moveTo(1040, HORIZON + 4);
  ctx.bezierCurveTo(1200, HORIZON - 70, 1420, HORIZON - 150, 1560, HORIZON - 150);
  ctx.bezierCurveTo(1720, HORIZON - 150, 1860, HORIZON - 60, W + 20, HORIZON - 30);
  ctx.lineTo(W + 20, HORIZON + 4);
  ctx.closePath();
  ctx.fill();
  ink(
    ctx,
    [
      [1040, HORIZON + 2],
      [1200, HORIZON - 64],
      [1420, HORIZON - 146],
      [1560, HORIZON - 150],
      [1720, HORIZON - 146],
      [1860, HORIZON - 58],
      [W + 20, HORIZON - 30],
    ],
    { w: 4, seed: 11, frame },
  );
  // bush
  const r = rng(12);
  ctx.fillStyle = mode === "day" ? C.bush : "#8a7f5e";
  for (let i = 0; i < 14; i++) {
    const x = 1120 + r() * 760,
      y = HORIZON - 40 - Math.max(0, 110 - Math.abs(x - 1560) * 0.3) * r();
    ctx.beginPath();
    ctx.ellipse(x, y + 20, 24 + r() * 26, 14 + r() * 8, 0, 0, 6.29);
    ctx.fill();
  }
  ctx.restore();
  lighthouse(ctx, 1560, HORIZON - 146, 1, frame, beam, mode);
};

/** Wadjemup: a tapered limestone tower, a dark lantern room, a railing and a dome */
export const lighthouse = (
  ctx: Ctx,
  x: number,
  baseY: number,
  s: number,
  frame: number,
  beam = 0,
  mode: Mode | "night" = "day",
) => {
  ctx.save();
  ctx.translate(x, baseY);
  ctx.scale(s, s);
  if (beam > 0) {
    const a = Math.sin(frame / 22) * 0.9;
    ctx.save();
    ctx.translate(0, -214);
    ctx.rotate(a);
    ctx.globalAlpha = 0.28 * beam;
    ctx.fillStyle = "#fbe7b0";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(1400, -170);
    ctx.lineTo(1400, 170);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-1400, -170);
    ctx.lineTo(-1400, 170);
    ctx.closePath();
    ctx.globalAlpha = 0.12 * beam;
    ctx.fill();
    ctx.restore();
  }
  const tower = mode === "night" ? "#e8dcc6" : C.surface;
  ctx.fillStyle = tower;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 4;
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(-34, 0);
  ctx.lineTo(-24, -186);
  ctx.lineTo(24, -186);
  ctx.lineTo(34, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  [-60, -120].forEach((yy) => {
    ctx.beginPath();
    ctx.moveTo(-31, yy);
    ctx.lineTo(31, yy);
    ctx.globalAlpha = 0.35;
    ctx.stroke();
    ctx.globalAlpha = 1;
  });
  ctx.fillStyle = C.ink;
  ctx.fillRect(-34, -196, 68, 10); // gallery
  ctx.fillStyle = mode === "night" || beam > 0 ? "#f7d27e" : "#8fb9c9";
  ctx.fillRect(-18, -232, 36, 36);
  ctx.strokeRect(-18, -232, 36, 36);
  ctx.fillStyle = C.ink;
  ctx.beginPath();
  ctx.moveTo(-24, -232);
  ctx.quadraticCurveTo(0, -262, 24, -232);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, -252);
  ctx.lineTo(0, -270);
  ctx.stroke();
  ctx.fillStyle = C.clay;
  ctx.fillRect(-8, -40, 16, 26); // door
  ctx.restore();
};

export const sea = (ctx: Ctx, frame: number, mode: Mode, top = HORIZON, bottom = H) => {
  const deep = mode === "day" ? C.seaDeep : SUNSET.seaDeep,
    mid = mode === "day" ? C.sea : SUNSET.sea;
  ctx.fillStyle = mid;
  ctx.fillRect(0, top, W, bottom - top);
  ctx.fillStyle = deep;
  ctx.fillRect(0, top, W, 26);
  // wave dashes that travel; each row slides at its own speed
  const r = rng(21);
  for (let row = 0; row < 7; row++) {
    const y = top + 50 + row * 40,
      sp = 0.4 + row * 0.18;
    for (let i = 0; i < 9; i++) {
      const x = ((r() * W + frame * sp) % (W + 200)) - 100,
        l = 30 + r() * 50;
      ink(
        ctx,
        [
          [x, y],
          [x + l * 0.5, y - 5],
          [x + l, y],
        ],
        { w: 3.5, color: mode === "day" ? C.seaLine : "#fde2c5", seed: row * 20 + i, frame, alpha: 0.8 },
      );
    }
  }
  if (mode === "sunset") {
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = "#f7d27e";
    for (let i = 0; i < 6; i++) {
      const w = 180 - i * 26 + Math.sin(frame / 9 + i) * 12;
      ctx.fillRect(560 - w / 2, top + 16 + i * 34, w, 8);
    }
    ctx.restore();
  }
};

/** the beach: sand from the shoreline down, a limestone ledge, a few bush clumps and the pink lake glimpse */
export const beach = (ctx: Ctx, frame: number, mode: Mode, shoreX = 820) => {
  const sand = mode === "day" ? C.sand : SUNSET.sand;
  ctx.save();
  ctx.fillStyle = sand;
  ctx.beginPath();
  ctx.moveTo(shoreX, H);
  ctx.bezierCurveTo(shoreX + 40, SHORE_Y + 60, shoreX + 120, SHORE_Y - 90, shoreX + 330, SHORE_Y - 150);
  ctx.lineTo(W, SHORE_Y - 170);
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();
  ink(
    ctx,
    [
      [shoreX, H],
      [shoreX + 50, SHORE_Y + 40],
      [shoreX + 150, SHORE_Y - 100],
      [shoreX + 330, SHORE_Y - 150],
      [W, SHORE_Y - 170],
    ],
    { w: 4, seed: 31, frame },
  );
  // foam along the shoreline, lapping
  const lap = Math.sin(frame / 20) * 10;
  ink(
    ctx,
    [
      [shoreX - 20 + lap, H - 10],
      [shoreX + 30 + lap, SHORE_Y + 50],
      [shoreX + 130 + lap, SHORE_Y - 90],
    ],
    { w: 5, color: C.seaLine, seed: 32, frame },
  );
  // pink salt lake glimpse, mid-distance
  ctx.fillStyle = C.lake;
  ctx.beginPath();
  ctx.ellipse(1510, SHORE_Y - 120, 230, 26, -0.03, 0, 6.29);
  ctx.fill();
  ink(
    ctx,
    [
      [1290, SHORE_Y - 118],
      [1400, SHORE_Y - 142],
      [1600, SHORE_Y - 144],
      [1735, SHORE_Y - 120],
    ],
    { w: 3, seed: 33, frame, color: C.clayText, alpha: 0.6 },
  );
  // limestone ledge + bush clumps
  ctx.fillStyle = mode === "day" ? C.limestone : "#dcae84";
  ctx.beginPath();
  ctx.moveTo(1640, H);
  ctx.bezierCurveTo(1680, 900, 1800, 860, W, 850);
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();
  ink(
    ctx,
    [
      [1640, H],
      [1690, 905],
      [1800, 862],
      [W, 850],
    ],
    { w: 4, seed: 34, frame },
  );
  const r = rng(35);
  for (let i = 0; i < 6; i++) {
    const x = 1180 + i * 130 + r() * 40,
      y = SHORE_Y - 170 + r() * 12;
    ctx.fillStyle = i % 2 ? C.bush : C.bushDark;
    ctx.beginPath();
    ctx.ellipse(x, y, 40 + r() * 20, 22, 0, Math.PI, 0);
    ctx.fill();
  }
  ctx.restore();
};

/** a wooden jetty over the water, side on, from x0 to x1 at deck height y */
export const jetty = (ctx: Ctx, frame: number, x0: number, x1: number, y: number) => {
  ctx.save();
  ctx.fillStyle = "#b98b62";
  ctx.fillRect(x0, y, x1 - x0, 18);
  for (let x = x0 + 30; x < x1; x += 110) {
    ctx.fillStyle = "#8d6547";
    ctx.fillRect(x, y + 18, 14, 150);
  }
  ink(
    ctx,
    [
      [x0, y],
      [x1, y],
    ],
    { w: 4, seed: 41, frame },
  );
  ink(
    ctx,
    [
      [x0, y + 18],
      [x1, y + 18],
    ],
    { w: 4, seed: 42, frame },
  );
  ctx.restore();
};
export const sign = (ctx: Ctx, frame: number, x: number, y: number, label: string) => {
  ctx.fillStyle = "#8d6547";
  ctx.fillRect(x - 5, y - 120, 10, 120);
  fillRR(ctx, x - 120, y - 170, 240, 60, 10, "#f3e3c3", C.ink, 4);
  text(ctx, label, x, y - 131, { size: 24, weight: 600, align: "center", color: C.cocoa, spacing: 2 });
  void frame;
};
export const bike = (ctx: Ctx, frame: number, x: number, y: number, s = 1) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(-60, -36, 36, 0, 6.29);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(60, -36, 36, 0, 6.29);
  ctx.stroke();
  ctx.strokeStyle = C.clay;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(-60, -36);
  ctx.lineTo(-10, -36);
  ctx.lineTo(30, -90);
  ctx.lineTo(-24, -90);
  ctx.lineTo(-60, -36);
  ctx.moveTo(-10, -36);
  ctx.lineTo(-24, -98);
  ctx.moveTo(30, -90);
  ctx.lineTo(60, -36);
  ctx.moveTo(30, -90);
  ctx.lineTo(24, -112);
  ctx.stroke();
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(-36, -100);
  ctx.lineTo(-12, -100);
  ctx.moveTo(12, -114);
  ctx.lineTo(38, -118);
  ctx.stroke();
  ctx.restore();
  void frame;
};

/** the ferry: white hull, clay stripe, cabin windows, a funnel that puffs on the beat */
export const ferry = (ctx: Ctx, frame: number, x: number, y: number, s = 1) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.lineWidth = 4;
  ctx.strokeStyle = C.ink;
  ctx.lineJoin = "round";
  const bob = Math.sin(frame / 12) * 4;
  ctx.translate(0, bob);
  ctx.fillStyle = C.surface;
  ctx.beginPath();
  ctx.moveTo(-300, -40);
  ctx.lineTo(300, -40);
  ctx.lineTo(250, 40);
  ctx.lineTo(-270, 40);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = C.clay;
  ctx.fillRect(-285, -4, 570, 14);
  ctx.fillStyle = C.surface;
  fillRR(ctx, -200, -130, 330, 90, 18, C.surface, C.ink, 4);
  for (let i = 0; i < 5; i++) fillRR(ctx, -180 + i * 62, -110, 44, 34, 8, "#8fc9cf", C.ink, 3);
  fillRR(ctx, 150, -170, 50, 130, 8, C.cocoa, C.ink, 4);
  ctx.fillStyle = C.clay;
  ctx.fillRect(150, -150, 50, 14);
  for (let i = 0; i < 3; i++) {
    const t = ((frame + i * 20) % 60) / 60,
      r = 14 + t * 26;
    ctx.globalAlpha = 0.7 * (1 - t);
    ctx.fillStyle = C.surface;
    ctx.beginPath();
    ctx.arc(176 - t * 60, -186 - t * 110, r, 0, 6.29);
    ctx.fill();
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  text(ctx, "ROTTNEST", -60, 32, { size: 20, weight: 600, color: C.cocoa, spacing: 3, align: "center" });
  ctx.restore();
};
export const mix = lerp;
