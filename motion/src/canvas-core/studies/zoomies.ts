// STUDY 55 · ZOOMIES (30 s, 30 fps). Two dogs spot a bunny from the patio bench and lose their minds: a
// low-camera anime chase through a backyard, cut like an action film (smears, whip pans, an impact frame, a
// face-filling close-up), that ends with both dogs sitting in the wreckage looking like they did nothing.
// Brief: series/studies/briefs/zoomies.json · prompt: series/studies/prompts/zoomies.prompt.md
//
// The cast is drawn by code from two looks (colours and markings on one rig): the red one (apricot-red, shaved
// body, fluffy head and long wavy ears, white bib) and the parti one (white, apricot ears and eye patches, a
// curly white topknot, tongue out). The whole film is one continuous paint(F) of a fractional frame F, so motion
// blur samples inside the shutter; the shots only name the sections. The sound is foley synthesised here
// (patter, whooshes, barks, squeaks, a leaf burst, a bonk) over a light pizzicato bed.
import PACK from "../../../brand/packs/studio/pack.json";
import { rng, type Ctx, type Env } from "../core";
import type { Film, Shot } from "../film";
import { motionBlur } from "../kit/blur";
import { clamp, ease, lerp, prog, spring, window01 } from "../kit/motion";
import { usePack } from "../kit/pack";
import { layout, type Size } from "../kit/sizes";
import { text } from "../kit/type";

const P = usePack(PACK),
  F_ = P.face;
const FPS = 30,
  BPM = 120,
  N = 900; // a beat is 15 frames
const TAU = Math.PI * 2;

// ---------------------------------------------------------------------------------------------- the cast
type Look = {
  coat: string; // the shaved body and legs
  shade: string; // the body's cel shadow
  far: string; // far-side legs
  mop: string; // head fluff
  mopShade: string;
  ear: string;
  earShade: string;
  muzzle: string;
  beard: string;
  bib: string;
  patch: string | null; // eye patches (the parti one)
  nose: string;
  paw: string;
  tail: string;
  tailShade: string;
  collar: string;
  tag: boolean;
  tongue: number; // how far the tongue shows at rest (0..1)
  seed: number;
};
const RED: Look = {
  coat: "#b96d40",
  shade: "#96522e",
  far: "#8a4a29",
  mop: "#bb743f",
  mopShade: "#98562d",
  ear: "#a55a2c",
  earShade: "#824221",
  muzzle: "#c88a57",
  beard: "#d8b28c",
  bib: "#f6efe6",
  patch: null,
  nose: "#3b2320",
  paw: "#d49a6a",
  tail: "#c47f48",
  tailShade: "#9c5a2f",
  collar: "#3f7fc2",
  tag: false,
  tongue: 0,
  seed: 11,
};
const PARTI: Look = {
  coat: "#f5eee8",
  shade: "#dccbc4",
  far: "#d2c0b8",
  mop: "#fbf7f2",
  mopShade: "#e2d8cf",
  ear: "#d48b4f",
  earShade: "#b06d38",
  muzzle: "#fbf6f1",
  beard: "#f1e8e0",
  bib: "#fbf7f2",
  patch: "#c9783f",
  nose: "#4a3a3b",
  paw: "#f3e7de",
  tail: "#fbf7f2",
  tailShade: "#e0d4cb",
  collar: "#4d77b8",
  tag: true,
  tongue: 0.6,
  seed: 23,
};
const BUN = {
  fur: "#9a7b5e",
  shade: "#7a5d44",
  belly: "#d9c3a5",
  ear: "#c89a86",
  tail: "#f7f1e8",
  eye: "#1d1410",
  nose: "#c9867c",
};
// the yard (a late-summer morning): every colour of the set lives here
const Y = {
  sky: "#cfe3ea",
  skyLow: "#eef0e0",
  treeFar: "#8fae8a",
  treeMid: "#5f8a5a",
  treeNear: "#3f6a44",
  fence: "#e9dcc4",
  fenceShade: "#cbb898",
  lawn: "#7fb24a",
  lawnStripe: "#8cbd53",
  lawnDark: "#5e9437",
  blade: "#4d7f2c",
  bladeLit: "#a7cf5e",
  soil: "#6b4a30",
  patio: "#c9b9a2",
  patioLine: "#b3a28a",
  bench: "#23262a",
  weave: "#3a3f45",
  weaveLit: "#8d949c",
  leaf: ["#e0a73a", "#d9812f", "#c6602a", "#e8c25a", "#b8732e"],
  shadow: "rgba(40,52,24,0.28)",
  ink: "#1f2a1c",
  paper: "#fbf7ef",
  flash: "#fff8ea",
};

// ---------------------------------------------------------------------------------------------- drawing helpers
/** a seeded hash in [0,1) (pure: the same inputs give the same number anywhere) */
const hash = (a: number, b = 0) => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
};
/** adds a fluffy blob to the current path: a core ellipse ringed by round curls (a union under nonzero fill) */
function fluffPath(
  ctx: Ctx,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  tufts: number,
  depth: number,
  seed: number,
  rot = 0,
  wob = 0,
) {
  const per = Math.PI * (rx + ry),
    br = (per / tufts) * 0.62,
    ix = Math.max(1, rx - br * 0.9),
    iy = Math.max(1, ry - br * 0.9);
  ctx.moveTo(cx + ix + br * 0.4, cy);
  ctx.ellipse(cx, cy, ix + br * 0.4, iy + br * 0.4, 0, 0, TAU);
  for (let i = 0; i < tufts; i++) {
    const a = rot + (i / tufts) * TAU,
      r = br * (1 + (hash(seed, i) - 0.5) * depth * 0.8 + Math.sin(wob + i * 1.7) * 0.05),
      x = cx + Math.cos(a) * ix,
      y = cy + Math.sin(a) * iy;
    ctx.moveTo(x + r, y);
    ctx.arc(x, y, r, 0, TAU);
  }
}
/** a fluffy blob on its own path */
function fluff(
  ctx: Ctx,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  tufts: number,
  depth: number,
  seed: number,
  rot = 0,
  wob = 0,
) {
  ctx.beginPath();
  fluffPath(ctx, cx, cy, rx, ry, tufts, depth, seed, rot, wob);
}
const fill = (ctx: Ctx, c: string) => {
  ctx.fillStyle = c;
  ctx.fill();
};
const ellipse = (ctx: Ctx, x: number, y: number, rx: number, ry: number, rot = 0) => {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU);
};
/** a limb: two tapered segments from a root, angles from straight down (+ swings toward +x) */
function limb(
  ctx: Ctx,
  x: number,
  y: number,
  a1: number,
  l1: number,
  a2: number,
  l2: number,
  w1: number,
  w2: number,
  col: string,
  paw: string,
  pawR: number,
) {
  const kx = x + Math.sin(a1) * l1,
    ky = y + Math.cos(a1) * l1,
    px = kx + Math.sin(a2) * l2,
    py = ky + Math.cos(a2) * l2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = col;
  ctx.lineWidth = w1;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(kx, ky);
  ctx.stroke();
  ctx.lineWidth = w2;
  ctx.beginPath();
  ctx.moveTo(kx, ky);
  ctx.lineTo(px, py);
  ctx.stroke();
  ellipse(ctx, px + Math.cos(a2) * pawR * 0.35, py - pawR * 0.1, pawR * 1.15, pawR * 0.8, a2 * 0.3);
  fill(ctx, paw);
  return [px, py] as const;
}
/** a long wavy ear hanging from (x, y): a chain of curls, swung by `ang` (0 = straight down, + swings toward −x) */
function ear(ctx: Ctx, look: Look, x: number, y: number, len: number, wid: number, ang: number, seed: number, wob = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  const n = 6;
  for (let pass = 0; pass < 2; pass++) {
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1),
        w = wid * (0.5 + 0.5 * Math.sin(Math.PI * (0.2 + t * 0.7))) * (pass ? 0.86 : 1),
        sway = Math.sin(wob + t * 2.4) * wid * 0.14 * t;
      fluffPath(ctx, sway + (pass ? -wid * 0.04 : 0), t * len, w * 0.55, w * 0.5, 8, 0.5, seed + i, i, wob * 0.3);
    }
    fill(ctx, pass ? look.ear : look.earShade);
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------- the dog, side on
export type Gait = {
  p: number; // gallop phase 0..1 (a whole stride)
  run: number; // 0 standing .. 1 full gallop
  crouch?: number; // 0..1 a stalk / skid crouch
  jaw?: number; // mouth open 0..1
  earLift?: number; // ears streaming back (0..1, defaults to run)
  look?: number; // head tilt, radians (+ = nose up)
  wag?: number; // tail wag phase
  blink?: number; // 1 = shut
};
/**
 * One dog in profile, facing +x, feet on y = 0, about 250 wide and 230 tall at scale 1. The rotary gallop is
 * closed-form in the stride phase: spine flex e = cos(2πp) (1 extended, −1 gathered) sets every leg angle,
 * the body length and the bob, with the far legs a little behind the near ones.
 */
export function dogSide(ctx: Ctx, look: Look, g: Gait) {
  const run = g.run,
    e = Math.cos(TAU * g.p),
    s = Math.sin(TAU * g.p),
    crouch = g.crouch ?? 0,
    lift = g.earLift ?? run,
    wob = g.p * TAU;
  const bob = run * (-10 - 12 * Math.cos(TAU * (g.p - 0.12))) + crouch * 26,
    pitch = run * 0.07 * s - crouch * 0.06,
    stretch = run * 14 * e;
  ctx.save();
  ctx.translate(0, bob);
  ctx.rotate(pitch);
  // leg angles: standing pose blended with the gallop
  const legs = (off: number) => {
    const ee = Math.cos(TAU * (g.p + off)),
      gg = Math.sin(TAU * (g.p + off));
    return {
      fu: lerp(0.05, 0.85 * ee - 0.05, run) - crouch * 0.5,
      fl: lerp(0.0, 0.85 * ee + (gg > 0 ? -0.9 * gg : -0.2 * gg) - 0.1, run) - crouch * 0.2,
      hu: lerp(0.18, -0.75 * ee + 0.25, run) + crouch * 0.9,
      hl: lerp(-0.25, -0.75 * ee - 0.35 + (gg < 0 ? 0.6 * -gg : 0), run) - crouch * 0.6,
    };
  };
  const near = legs(0),
    far = legs(0.07);
  const shX = 58 + stretch * 0.5,
    hipX = -64 - stretch * 0.5,
    legY = -104 + crouch * 10;
  const legLen = (1 - crouch * 0.25) * 56;
  // far legs (darker, behind the body)
  limb(ctx, shX - 6, legY, far.fu, legLen, far.fl, legLen, 17, 13, look.far, look.far, 8);
  limb(ctx, hipX + 6, legY - 4, far.hu, legLen * 0.95, far.hl, legLen * 1.05, 24, 13, look.far, look.far, 8);
  // tail plume: rises and curls; in a gallop it streams back
  const tailA = lerp(-0.9, -1.75, run) + Math.sin(g.wag ?? wob) * lerp(0.35, 0.12, run);
  ctx.save();
  ctx.translate(hipX - 30, -136);
  ctx.rotate(tailA);
  for (let i = 0; i < 6; i++) {
    const t = i / 5,
      x = t * 64,
      y = -Math.sin(t * 2) * 14 * (1 - run * 0.6) + Math.sin(wob * 2 + t * 3) * 5 * run;
    fluff(ctx, x, y, 12 + t * 12, 9 + t * 10, 7, 0.5, look.seed + 40 + i, i, wob);
    fill(ctx, i % 2 ? look.tail : look.tailShade);
  }
  ctx.restore();
  // torso: chest and rump joined by a tucked belly line
  ctx.beginPath();
  ctx.moveTo(hipX - 36, -128);
  ctx.bezierCurveTo(hipX - 10, -158, shX - 30, -160, shX + 10, -150); // back line
  ctx.bezierCurveTo(shX + 44, -140, shX + 46, -96, shX + 22, -84); // chest
  ctx.bezierCurveTo(shX - 10, -76, 0, -96, hipX + 26, -96); // belly tuck
  ctx.bezierCurveTo(hipX - 6, -92, hipX - 44, -100, hipX - 36, -128); // rump
  ctx.closePath();
  fill(ctx, look.coat);
  ctx.save();
  ctx.clip();
  ellipse(ctx, 0, -70, 200, 34);
  fill(ctx, look.shade); // cel shadow along the belly
  ellipse(ctx, shX + 20, -110, 30, 30);
  fill(ctx, look.bib); // the bib on the chest
  ctx.restore();
  // near legs
  limb(ctx, hipX, legY - 2, near.hu, legLen * 0.95, near.hl, legLen * 1.05, 28, 15, look.coat, look.paw, 9);
  limb(ctx, shX, legY, near.fu, legLen, near.fl, legLen, 19, 14, look.coat, look.paw, 9);
  // neck + head
  const hx = shX + 44,
    hy = -178 + crouch * 30,
    tilt = (g.look ?? 0) + run * 0.05 * s;
  ctx.beginPath();
  ctx.moveTo(shX - 14, -150);
  ctx.quadraticCurveTo(hx - 10, hy - 8, hx + 8, hy + 6);
  ctx.lineTo(shX + 30, -110);
  ctx.closePath();
  fill(ctx, look.coat);
  ellipse(ctx, shX + 22, -128, 18, 22, -0.4);
  fill(ctx, look.bib); // throat
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(-tilt);
  ctx.scale(1.15, 1.15);
  headSide(ctx, look, { jaw: g.jaw ?? run * 0.35, lift, blink: g.blink ?? 0, wob });
  ctx.restore();
  // collar
  ctx.strokeStyle = look.collar;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(shX + 6, hy + 30);
  ctx.quadraticCurveTo(shX + 22, hy + 42, shX + 36, hy + 34);
  ctx.stroke();
  ctx.restore();
}
type HeadExpr = { jaw: number; lift: number; blink: number; wob: number };
/** the head in profile, centred on the skull, facing +x */
function headSide(ctx: Ctx, look: Look, x: HeadExpr) {
  const { jaw, lift, wob } = x;
  // far ear peeks behind
  ear(ctx, look, -8, -18, 60, 30, 0.35 + lift * 0.8, look.seed + 60, wob + 1);
  // lower jaw + tongue
  ctx.save();
  ctx.translate(18, 14);
  ctx.rotate(jaw * 0.35);
  ctx.beginPath();
  ctx.roundRect(0, -6, 40, 16, 8);
  fill(ctx, look.muzzle);
  if (look.tongue > 0 || jaw > 0.2) {
    const tl = 10 + (look.tongue + jaw) * 16 + Math.sin(wob * 2) * 4 * jaw;
    ctx.beginPath();
    ctx.roundRect(14, 4, 20, tl, 9);
    fill(ctx, "#e98a93");
  }
  ctx.restore();
  // skull mop
  fluff(ctx, 0, -6, 40, 36, 9, 0.28, look.seed, 0.2, wob * 0.5);
  fill(ctx, look.mop);
  // muzzle + beard
  ctx.beginPath();
  ctx.roundRect(14, -8, 50, 28, 14);
  fill(ctx, look.muzzle);
  fluff(ctx, 34, 16, 26, 12, 6, 0.4, look.seed + 5, 0, wob);
  fill(ctx, look.beard);
  ellipse(ctx, 62, -2, 10, 9);
  fill(ctx, look.nose);
  ellipse(ctx, 59, -5, 3, 2);
  fill(ctx, "rgba(255,255,255,0.45)");
  // eye patch + eye
  if (look.patch) {
    ellipse(ctx, 18, -14, 16, 13, -0.2);
    fill(ctx, look.patch);
  }
  const bl = clamp(x.blink);
  ellipse(ctx, 20, -14, 6.5, 6.5 * (1 - bl) + 0.8);
  fill(ctx, "#241612");
  if (bl < 0.6) {
    ellipse(ctx, 22, -16, 2, 2);
    fill(ctx, "#ffffff");
  }
  // the mop's fringe over the brow
  fluff(ctx, 4, -30, 30, 16, 7, 0.4, look.seed + 9, 0.4, wob * 0.5);
  fill(ctx, look.mop);
  // near ear, streaming back as the dog runs
  ear(ctx, look, -10, -18, 68, 34, 0.3 + lift * 0.85 + Math.sin(wob) * 0.15 * lift, look.seed + 70, wob);
}

// ---------------------------------------------------------------------------------------------- the dog, face on
export type FrontExpr = {
  eye?: number; // eye size multiplier
  pupil?: number; // 0 = normal, 1 = locked-on (huge shine)
  jaw?: number;
  tongue?: number; // extra tongue
  earUp?: number; // ears lifted outward (running / alert)
  blink?: number;
  wob?: number;
  lookX?: number; // pupils slide sideways (-1..1)
  tilt?: number; // head tilt, radians
};
/** the head face on, centred on the skull, radius ~ 60 at scale 1 */
export function headFront(ctx: Ctx, look: Look, x: FrontExpr) {
  const eye = x.eye ?? 1,
    jaw = x.jaw ?? 0,
    up = x.earUp ?? 0,
    wob = x.wob ?? 0,
    lx = x.lookX ?? 0;
  ctx.save();
  ctx.rotate(x.tilt ?? 0);
  // ears first (behind): hang beside the face, lift outward when alert or running
  ear(ctx, look, -44, -26, 92, 42, 0.12 + up * 0.8, look.seed + 80, wob);
  ctx.save();
  ctx.scale(-1, 1);
  ear(ctx, look, -44, -26, 92, 42, 0.12 + up * 0.8, look.seed + 90, wob + 2);
  ctx.restore();
  // skull + cheeks
  fluff(ctx, 0, -4, 60, 58, 12, 0.18, look.seed + 1, 0, wob * 0.4);
  fill(ctx, look.mop);
  ctx.save();
  fluff(ctx, 0, -4, 60, 58, 12, 0.18, look.seed + 1, 0, wob * 0.4);
  ctx.clip();
  ellipse(ctx, 0, 70, 80, 40);
  fill(ctx, look.mopShade);
  ctx.restore();
  // eye patches (parti)
  if (look.patch) {
    for (const sx of [-1, 1]) {
      fluff(ctx, sx * 25, -12, 21, 17, 7, 0.25, look.seed + 3 + sx, 0, wob * 0.3);
      fill(ctx, look.patch);
    }
  }
  // eyes
  for (const sx of [-1, 1]) {
    const ex = sx * 24,
      ey = -10,
      r = 9 * eye,
      bl = clamp(x.blink ?? 0);
    ctx.save();
    ellipse(ctx, ex, ey, r, r * (1 - bl) + 0.6);
    fill(ctx, "#2a1712");
    ctx.clip();
    if ((x.pupil ?? 0) > 0) {
      // locked on: a warm iris ring round a wide pupil, and a big shine
      const pu = x.pupil ?? 0;
      ellipse(ctx, ex + lx * r * 0.2, ey, r * 0.95, r * 0.95);
      fill(ctx, "#6a3a22");
      ellipse(ctx, ex + lx * r * 0.2, ey, r * lerp(0.6, 0.78, pu), r * lerp(0.6, 0.78, pu));
      fill(ctx, "#140b08");
    }
    ctx.restore();
    if (bl < 0.6) {
      ellipse(ctx, ex + r * 0.3 + lx * r * 0.25, ey - r * 0.35, r * 0.3, r * 0.3);
      fill(ctx, "#ffffff");
      ellipse(ctx, ex - r * 0.3 + lx * r * 0.25, ey + r * 0.3, r * 0.12, r * 0.12);
      fill(ctx, "#ffffff");
    }
  }
  // fringe over the brow
  fluff(ctx, 0, -46, 48, 22, 9, 0.4, look.seed + 4, 0.3, wob * 0.5);
  fill(ctx, look.mop);
  // muzzle, mouth, tongue
  const my = 22;
  if (jaw > 0.05 || look.tongue > 0 || (x.tongue ?? 0) > 0) {
    const open = jaw * 26;
    ctx.beginPath();
    ctx.ellipse(0, my + 14, 16, 4 + open * 0.6, 0, 0, TAU);
    fill(ctx, "#5a2a28");
    const tl = (look.tongue + (x.tongue ?? 0)) * 22 + open * 0.8,
      sw = Math.sin(wob * 2) * 3 * ((x.tongue ?? 0) + jaw);
    ctx.beginPath();
    ctx.roundRect(-9 + sw, my + 10, 18, 6 + tl, 9);
    fill(ctx, "#ec8d97");
    ctx.strokeStyle = "rgba(160,60,70,0.4)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(sw, my + 14);
    ctx.lineTo(sw, my + 10 + tl);
    ctx.stroke();
  }
  fluff(ctx, -12, my + 4, 18, 13, 6, 0.35, look.seed + 6, 0, wob);
  fill(ctx, look.muzzle);
  fluff(ctx, 12, my + 4, 18, 13, 6, 0.35, look.seed + 7, 0, wob);
  fill(ctx, look.muzzle);
  fluff(ctx, 0, my + 16, 16, 9 + jaw * 4, 6, 0.4, look.seed + 8, 0, wob);
  fill(ctx, look.beard);
  ctx.beginPath();
  ctx.ellipse(0, my - 4, 11, 8.5, 0, 0, TAU);
  fill(ctx, look.nose);
  ellipse(ctx, -3, my - 7, 3.5, 2);
  fill(ctx, "rgba(255,255,255,0.45)");
  ctx.restore();
}
/** sitting face on (the pose from the armchair photo): feet on y = 0, head ~ 250 up */
export function dogSit(ctx: Ctx, look: Look, x: FrontExpr & { wag?: number; breathe?: number }) {
  const wob = x.wob ?? 0,
    br = x.breathe ?? 0;
  // tail plume curling out to the side
  ctx.save();
  ctx.translate(38, -30);
  ctx.rotate(-0.4 + Math.sin(x.wag ?? 0) * 0.35);
  for (let i = 0; i < 6; i++) {
    const t = i / 5;
    fluff(ctx, 20 + t * 55, -t * 30 + t * t * 14, 11 + t * 12, 9 + t * 12, 7, 0.55, look.seed + 50 + i, i, wob);
    fill(ctx, i % 2 ? look.tail : look.tailShade);
  }
  ctx.restore();
  // haunches
  for (const sx of [-1, 1]) {
    ellipse(ctx, sx * 30, -34, 34, 34);
    fill(ctx, look.shade);
  }
  // body
  ctx.beginPath();
  ctx.moveTo(-40, -30);
  ctx.bezierCurveTo(-46, -110, -34, -150 - br, 0, -160 - br);
  ctx.bezierCurveTo(34, -150 - br, 46, -110, 40, -30);
  ctx.closePath();
  fill(ctx, look.coat);
  ctx.save();
  ctx.clip();
  ellipse(ctx, 0, -138 - br, 28, 36);
  fill(ctx, look.bib);
  ctx.restore();
  // front legs
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.roundRect(sx * 15 - 8, -104, 16, 98, 8);
    fill(ctx, look.coat);
    ellipse(ctx, sx * 16, -6, 12, 7);
    fill(ctx, look.paw);
  }
  ctx.strokeStyle = look.collar;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(-26, -172 - br);
  ctx.quadraticCurveTo(0, -160 - br, 26, -172 - br);
  ctx.stroke();
  if (look.tag) {
    ellipse(ctx, 0, -155 - br + Math.sin(wob) * 1.5, 5, 8);
    fill(ctx, "#b9bcc2");
  }
  ctx.save();
  ctx.translate(0, -212 - br);
  headFront(ctx, look, x);
  ctx.restore();
}
/**
 * Running straight at the camera: a foreshortened body behind a big head, front paws reaching toward the lens
 * one after the other. `p` is the stride phase.
 */
export function dogRunAt(ctx: Ctx, look: Look, p: number, x: FrontExpr = {}) {
  const s = Math.sin(TAU * p),
    c = Math.cos(TAU * p),
    bob = -8 * c;
  ctx.save();
  ctx.translate(0, bob);
  // back: the plume tail waving above the rump
  ctx.save();
  ctx.translate(10, -150);
  ctx.rotate(-0.2 + s * 0.3);
  for (let i = 0; i < 5; i++) {
    const t = i / 4;
    fluff(ctx, t * 18, -t * 46, 12 + t * 8, 10 + t * 8, 7, 0.5, look.seed + 30 + i, i, p * TAU);
    fill(ctx, i % 2 ? look.tail : look.tailShade);
  }
  ctx.restore();
  // hind legs peek out behind
  for (const sx of [-1, 1]) {
    const k = sx > 0 ? s : -s;
    ctx.beginPath();
    ctx.roundRect(sx * (34 + 8 * k) - 9, -76 - k * 16, 18, 70 + k * 10, 9);
    fill(ctx, look.far);
    ellipse(ctx, sx * (34 + 8 * k), -6 - k * 10, 11, 7);
    fill(ctx, look.far);
  }
  // chest
  ellipse(ctx, 0, -100, 50, 58);
  fill(ctx, look.coat);
  ellipse(ctx, 0, -104, 30, 42);
  fill(ctx, look.bib);
  // front legs reaching: the near paw swells as it comes at the lens
  for (const sx of [-1, 1]) {
    const k = sx > 0 ? s : -s,
      reach = Math.max(0, k),
      px = sx * (26 + reach * 6),
      py = -4 - reach * 64;
    ctx.strokeStyle = look.coat;
    ctx.lineCap = "round";
    ctx.lineWidth = 18 + reach * 8;
    ctx.beginPath();
    ctx.moveTo(sx * 22, -110);
    ctx.lineTo(px, py);
    ctx.stroke();
    ellipse(ctx, px, py + 4, 13 + reach * 12, 10 + reach * 10);
    fill(ctx, look.paw);
    if (reach > 0.5) {
      // pads toward the lens
      ellipse(ctx, px, py + 8, (6 + reach * 6) * 0.8, (5 + reach * 5) * 0.8);
      fill(ctx, "#6c4a44");
      for (let i = -1; i <= 1; i++) {
        ellipse(ctx, px + i * (6 + reach * 5), py - 4, 3 + reach * 2, 3 + reach * 2);
        fill(ctx, "#6c4a44");
      }
    }
  }
  ctx.strokeStyle = look.collar;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(-30, -150);
  ctx.quadraticCurveTo(0, -136, 30, -150);
  ctx.stroke();
  ctx.save();
  ctx.translate(0, -190);
  headFront(ctx, look, { earUp: 0.45 + 0.25 * c, jaw: 0.5, tongue: 0.4, wob: p * TAU, ...x });
  ctx.restore();
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------- bunnies
/** a cottontail in profile facing +x, feet on y = 0; `h` is the hop phase 0..1 (0 = crouched on the ground) */
export function bunnySide(ctx: Ctx, h: number, x: { alert?: number; nibble?: number; wob?: number } = {}) {
  const air = Math.sin(Math.PI * clamp(h)),
    st = air, // stretch in the air
    alert = x.alert ?? 0;
  ctx.save();
  ctx.rotate(-0.25 * Math.sin(TAU * clamp(h)) * (h > 0 ? 1 : 0));
  // hind leg
  ctx.save();
  ctx.translate(-26, -18);
  ctx.rotate(st * 0.9);
  ellipse(ctx, -4 - st * 10, 10, 22 + st * 8, 9);
  fill(ctx, BUN.shade);
  ctx.restore();
  // body
  ellipse(ctx, -6 + st * 4, -30, 38 + st * 12, 26 - st * 4, -0.1 * st);
  fill(ctx, BUN.fur);
  ellipse(ctx, 4, -18, 24, 12);
  fill(ctx, BUN.belly);
  // tail
  fluff(ctx, -44 - st * 10, -40, 11, 10, 6, 0.4, 5);
  fill(ctx, BUN.tail);
  // front paw
  ellipse(ctx, 22 + st * 14, -6 - st * 6, 9, 5, st);
  fill(ctx, BUN.fur);
  // head
  const hx = 30 + st * 8,
    hy = -50 + alert * -6;
  // ears: up when alert, laid back in a hop
  for (const k of [0, 1]) {
    ctx.save();
    ctx.translate(hx - 6 - k * 6, hy - 12);
    ctx.rotate(lerp(-0.35 + k * 0.2, -1.25, st) + (1 - alert) * 0.3 * (1 - st) - k * 0.1);
    ellipse(ctx, 0, -24, 7, 26);
    fill(ctx, k ? BUN.shade : BUN.fur);
    ellipse(ctx, 0, -22, 3.5, 18);
    fill(ctx, BUN.ear);
    ctx.restore();
  }
  ellipse(ctx, hx, hy, 20, 16, 0.2);
  fill(ctx, BUN.fur);
  const nib = Math.sin((x.wob ?? 0) * 6) * (x.nibble ?? 0);
  ellipse(ctx, hx + 18, hy + 3 + nib, 3.5, 2.5);
  fill(ctx, BUN.nose);
  ellipse(ctx, hx + 6, hy - 4, 4, 4.4 + alert);
  fill(ctx, BUN.eye);
  ellipse(ctx, hx + 7.5, hy - 5.5, 1.3, 1.3);
  fill(ctx, "#ffffff");
  ctx.restore();
}
/** a cottontail sitting face on, feet on y = 0 */
export function bunnyFront(ctx: Ctx, x: { twitch?: number; earTilt?: number; chew?: number } = {}) {
  const tw = x.twitch ?? 0;
  ellipse(ctx, 0, -32, 30, 32);
  fill(ctx, BUN.fur);
  ellipse(ctx, 0, -26, 18, 22);
  fill(ctx, BUN.belly);
  for (const sx of [-1, 1]) {
    ellipse(ctx, sx * 12, -4, 10, 6);
    fill(ctx, BUN.shade);
  }
  for (const sx of [-1, 1]) {
    ctx.save();
    ctx.translate(sx * 10, -84);
    ctx.rotate(sx * (0.15 + (x.earTilt ?? 0) * (sx > 0 ? 1 : 0.3)));
    ellipse(ctx, 0, -24, 8, 27);
    fill(ctx, BUN.fur);
    ellipse(ctx, 0, -22, 4, 19);
    fill(ctx, BUN.ear);
    ctx.restore();
  }
  ellipse(ctx, 0, -72, 24, 20);
  fill(ctx, BUN.fur);
  for (const sx of [-1, 1]) {
    ellipse(ctx, sx * 11, -76, 4, 4.5);
    fill(ctx, BUN.eye);
    ellipse(ctx, sx * 11 + 1.5, -77.5, 1.3, 1.3);
    fill(ctx, "#ffffff");
  }
  const ch = Math.sin(x.chew ?? 0) * 1.2;
  ellipse(ctx, 0, -64 + tw, 3.5, 2.6);
  fill(ctx, BUN.nose);
  ellipse(ctx, 0, -58 + ch, 6, 3);
  fill(ctx, BUN.belly);
}

// ---------------------------------------------------------------------------------------------- the set
/** the impact frame's silhouette: the rig drawn in one flat colour */
const sil = (c: string): Look => ({
  ...RED,
  coat: c,
  shade: c,
  far: c,
  mop: c,
  mopShade: c,
  ear: c,
  earShade: c,
  muzzle: c,
  beard: c,
  bib: c,
  patch: null,
  nose: c,
  paw: c,
  tail: c,
  tailShade: c,
  collar: c,
  tongue: 0,
});
/** draw fn about (x, y) at scale s, mirrored when facing −x */
const put = (ctx: Ctx, x: number, y: number, s: number, fn: () => void, flip = false, rot = 0) => {
  ctx.save();
  ctx.translate(x, y);
  if (rot) ctx.rotate(rot);
  ctx.scale(flip ? -s : s, s);
  fn();
  ctx.restore();
};
const wrap = (x: number, p: number) => ((x % p) + p) % p;

function sky(ctx: Ctx, W: number, bottom: number, off = 0) {
  const bands = [Y.sky, "#d9e8e6", "#e4ede2", Y.skyLow];
  bands.forEach((c, i) => {
    ctx.fillStyle = c;
    const y0 = (bottom * i) / bands.length - 1;
    ctx.fillRect(0, y0 + (i ? bottom * 0.25 : 0), W, bottom - y0 + 2);
  });
  // flat cream clouds drifting
  for (let i = 0; i < 4; i++) {
    const x = wrap(i * 620 + 120 - off * 0.05 + i * 37, W + 700) - 350,
      y = bottom * (0.18 + 0.14 * hash(i, 3));
    fluff(ctx, x, y, 150 + 60 * hash(i, 4), 34, 9, 0.6, 300 + i);
    fill(ctx, "#f7f4ea");
  }
}
function treeLine(
  ctx: Ctx,
  W: number,
  baseY: number,
  off: number,
  col: string,
  h: number,
  period: number,
  seed: number,
) {
  const n = Math.ceil(W / period) + 3,
    o = wrap(off, period);
  ctx.beginPath();
  for (let i = -1; i < n; i++) {
    const k = Math.floor(off / period) + i,
      x = i * period - o,
      r = h * (0.55 + 0.45 * hash(k, seed));
    fluffPath(ctx, x, baseY - r * 0.8, r * 0.9, r, 11, 0.6, seed + k);
  }
  ctx.rect(-10, baseY - h * 0.3, W + 20, h * 0.3 + 4);
  fill(ctx, col);
}
function fence(ctx: Ctx, W: number, baseY: number, off: number, h: number, pw = 34) {
  const gap = pw * 1.25,
    o = wrap(off, gap);
  ctx.fillStyle = Y.fenceShade;
  ctx.fillRect(0, baseY - h * 0.8, W, h * 0.08);
  ctx.fillRect(0, baseY - h * 0.3, W, h * 0.08);
  ctx.fillStyle = Y.fence;
  for (let x = -o - gap; x < W + gap; x += gap) {
    ctx.beginPath();
    ctx.moveTo(x, baseY);
    ctx.lineTo(x, baseY - h + pw * 0.4);
    ctx.lineTo(x + pw / 2, baseY - h);
    ctx.lineTo(x + pw, baseY - h + pw * 0.4);
    ctx.lineTo(x + pw, baseY);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = Y.fenceShade;
  for (let x = -o - gap; x < W + gap; x += gap)
    ctx.fillRect(x + pw * 0.72, baseY - h + pw * 0.5, pw * 0.28, h - pw * 0.5);
}
/** lawn seen side on: mowing stripes that scroll with the camera */
function lawnSide(ctx: Ctx, W: number, H: number, top: number, off: number) {
  ctx.fillStyle = Y.lawn;
  ctx.fillRect(0, top, W, H - top);
  const p = 360,
    o = wrap(off, p);
  ctx.fillStyle = Y.lawnStripe;
  for (let x = -o - p; x < W + p; x += p) {
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x + p / 2, top);
    ctx.lineTo(x + p / 2 - (H - top) * 0.5, H);
    ctx.lineTo(x - (H - top) * 0.5, H);
    ctx.closePath();
    ctx.fill();
  }
}
/** lawn seen down its length: stripes converging on a vanishing point */
function lawnDeep(ctx: Ctx, W: number, H: number, horizon: number, vpx: number) {
  ctx.fillStyle = Y.lawn;
  ctx.fillRect(0, horizon, W, H - horizon);
  ctx.fillStyle = Y.lawnStripe;
  for (let i = -10; i < 10; i += 2) {
    ctx.beginPath();
    ctx.moveTo(vpx + i * 60, horizon);
    ctx.lineTo(vpx + (i + 1) * 60, horizon);
    ctx.lineTo(vpx + (i + 1) * 520, H + 400);
    ctx.lineTo(vpx + i * 520, H + 400);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = "rgba(94,148,55,0.35)";
  ctx.fillRect(0, horizon, W, 10);
}
/** tall grass blades along a baseline (the lens is down in the lawn) */
function blades(
  ctx: Ctx,
  W: number,
  baseY: number,
  off: number,
  h: number,
  count: number,
  col: string,
  seed: number,
  sway: number,
) {
  const p = W / count + 0,
    o = wrap(off, p * count);
  ctx.fillStyle = col;
  ctx.beginPath();
  for (let i = 0; i < count + 2; i++) {
    const x = wrap(i * p - o, p * (count + 2)) - p,
      hh = h * (0.45 + 0.55 * hash(i, seed)),
      lean = (hash(i, seed + 1) - 0.5) * 0.5 + sway * (0.6 + 0.4 * hash(i, seed + 2)),
      w = 7 + 9 * hash(i, seed + 3);
    ctx.moveTo(x - w, baseY);
    ctx.quadraticCurveTo(x + lean * hh * 0.4, baseY - hh * 0.6, x + lean * hh, baseY - hh);
    ctx.quadraticCurveTo(x + lean * hh * 0.4 + w * 0.3, baseY - hh * 0.5, x + w, baseY);
  }
  ctx.fill();
}
/** the wicker-topped patio bench: seat top centred on (x, y), w wide */
function bench(ctx: Ctx, x: number, y: number, w: number) {
  const d = w * 0.22,
    legH = w * 0.34,
    x0 = x - w / 2;
  ctx.fillStyle = Y.bench;
  ctx.fillRect(x0 + 6, y, 10, legH);
  ctx.fillRect(x0 + w - 16, y, 10, legH);
  ctx.fillRect(x0 + d * 0.6, y - d * 0.4, 8, legH * 0.9);
  ctx.fillRect(x0 + w - d * 0.6 - 8, y - d * 0.4, 8, legH * 0.9);
  // the seat: a woven top in perspective
  ctx.beginPath();
  ctx.moveTo(x0, y);
  ctx.lineTo(x0 + w, y);
  ctx.lineTo(x0 + w - d * 0.5, y - d * 0.5);
  ctx.lineTo(x0 + d * 0.5, y - d * 0.5);
  ctx.closePath();
  fill(ctx, Y.weave);
  ctx.save();
  ctx.clip();
  ctx.fillStyle = Y.weaveLit;
  const cell = w / 26;
  for (let r = 0; r < 6; r++)
    for (let c = 0; c < 28; c++)
      if ((r + c) % 2 === 0)
        ctx.fillRect(x0 + c * cell + r * cell * 0.3, y - (r + 1) * cell * 0.6, cell * 0.55, cell * 0.28);
  ctx.restore();
  ctx.fillStyle = Y.bench;
  ctx.fillRect(x0, y, w, 9);
  ctx.fillRect(x0, y + legH * 0.72, w, 6);
}
function leafShape(ctx: Ctx, x: number, y: number, sz: number, rot: number, col: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  ctx.moveTo(-sz, 0);
  ctx.quadraticCurveTo(0, -sz * 0.62, sz, 0);
  ctx.quadraticCurveTo(0, sz * 0.62, -sz, 0);
  fill(ctx, col);
  ctx.strokeStyle = "rgba(90,50,20,0.35)";
  ctx.lineWidth = Math.max(1, sz * 0.08);
  ctx.beginPath();
  ctx.moveTo(-sz * 0.8, 0);
  ctx.lineTo(sz * 0.8, 0);
  ctx.stroke();
  ctx.restore();
}
function puff(ctx: Ctx, x: number, y: number, r: number, a: number, seed: number) {
  if (a <= 0.01 || r <= 1) return;
  ctx.save();
  ctx.globalAlpha = clamp(a);
  fluff(ctx, x, y, r, r * 0.7, 8, 0.7, seed);
  fill(ctx, "#eadfc6");
  fluff(ctx, x + r * 0.15, y + r * 0.18, r * 0.7, r * 0.42, 7, 0.6, seed + 1);
  fill(ctx, "#d9c9a8");
  ctx.restore();
}
/** anime speed lines: thin streaks racing across (dir 1 = toward −x) */
function speedLines(ctx: Ctx, W: number, H: number, F: number, a: number, dir = 1, col = "#ffffff") {
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = col;
  for (let i = 0; i < 26; i++) {
    const len = 180 + 420 * hash(i, 71),
      y = H * hash(i, 72),
      sp = 90 + 60 * hash(i, 73),
      x = wrap(-dir * F * sp + i * 997, W + len * 2) - len;
    ctx.fillRect(dir > 0 ? x : W - x - len, y, len, 2 + 3 * hash(i, 74));
  }
  ctx.restore();
}
/**
 * an anime smear trail: tapered streaks left behind something fast. (x, y) is the back of the body, dir the way
 * it runs (+1 = toward +x), h the band the streaks spread over, len how far they trail.
 */
function streaks(ctx: Ctx, x: number, y: number, len: number, h: number, dir: number, cols: string[], seed: number) {
  if (len < 4) return;
  ctx.save();
  ctx.lineCap = "round";
  for (let i = 0; i < 9; i++) {
    const yy = y + (hash(i, seed) - 0.5) * h,
      l = len * (0.45 + 0.55 * hash(i, seed + 1)),
      x0 = x + dir * h * 0.08 * hash(i, seed + 2);
    ctx.globalAlpha = 0.5 + 0.4 * hash(i, seed + 3);
    ctx.strokeStyle = cols[i % cols.length]!;
    ctx.lineWidth = Math.max(2, h * (0.05 + 0.09 * hash(i, seed + 4)));
    ctx.beginPath();
    ctx.moveTo(x0, yy);
    ctx.lineTo(x0 - dir * l, yy);
    ctx.stroke();
  }
  ctx.restore();
}
/**
 * white fur rushing across the lens: a mass of coat whose edge (x) is a column of curls, streaked along the
 * direction of travel. dir +1 fills everything left of x (entering from the left); −1 fills everything right of x.
 */
function furWipe(ctx: Ctx, W: number, H: number, x: number, dir: number, look: Look, seed: number) {
  const R = Math.min(W, H) / 9;
  ctx.beginPath();
  if (dir > 0) ctx.rect(-40, -40, x - R * 0.6 + 40, H + 80);
  else ctx.rect(x + R * 0.6, -40, W - x + 40, H + 80);
  for (let i = 0; i <= 11; i++) {
    const y = (i / 11) * H,
      r = R * (0.75 + 0.5 * hash(i, seed)),
      cx = x - dir * R * (0.2 + 0.8 * hash(i, seed + 1));
    ctx.moveTo(cx + r, y);
    ctx.arc(cx, y, r, 0, TAU);
  }
  fill(ctx, look.coat);
  // curls inside the mass, then streaks running with it
  ctx.beginPath();
  for (let i = 0; i < 16; i++) {
    const cx = x - dir * (R * 1.2 + hash(i, seed + 3) * W * 0.9),
      cy = hash(i, seed + 4) * H;
    fluffPath(ctx, cx, cy, R * 0.9, R * 0.55, 8, 0.5, seed + i);
  }
  fill(ctx, look.mopShade);
  ctx.save();
  ctx.lineCap = "round";
  for (let i = 0; i < 18; i++) {
    const y = hash(i, seed + 6) * H,
      l = W * (0.2 + 0.5 * hash(i, seed + 7)),
      x1 = x - dir * R * (0.6 + 2 * hash(i, seed + 8));
    const col = i % 5 === 0 ? look.ear : i % 2 ? look.shade : look.mop,
      lw = R * (0.08 + 0.3 * hash(i, seed + 9));
    ctx.strokeStyle = col;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(x1, y);
    ctx.lineTo(x1 - dir * l, y);
    ctx.stroke();
    // the trailing end frays into curls instead of stopping square
    fluff(ctx, x1 - dir * l, y, lw * 1.1, lw * 0.8, 6, 0.6, seed + 20 + i);
    fill(ctx, col);
  }
  ctx.restore();
}
/**
 * a camera move inside one painter: world point (wx, wy) lands on screen (sx, sy) at zoom z (z >= 1). The point
 * is clamped so the view never leaves the painted W×H world (no unpainted canvas at an edge).
 */
function cam(ctx: Ctx, W: number, H: number, wx: number, wy: number, sx: number, sy: number, z: number) {
  const x = clamp(wx, sx / z, W - (W - sx) / z),
    y = clamp(wy, sy / z, H - (H - sy) / z);
  ctx.translate(sx, sy);
  ctx.scale(z, z);
  ctx.translate(-x, -y);
}
/** manga focus lines: wedges from the frame edge toward a point, redrawn on twos */
function focusLines(ctx: Ctx, W: number, H: number, cx: number, cy: number, F: number, col: string, inner: number) {
  const k = Math.floor(F / 2),
    R = Math.hypot(W, H);
  ctx.fillStyle = col;
  ctx.beginPath();
  for (let i = 0; i < 90; i++) {
    const a = (i / 90) * TAU + (hash(k, i) - 0.5) * 0.05,
      w = 0.004 + 0.012 * hash(i, k + 5),
      r0 = inner * (0.8 + 0.6 * hash(i, k + 9));
    ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
    ctx.lineTo(cx + Math.cos(a - w) * R, cy + Math.sin(a - w) * R);
    ctx.lineTo(cx + Math.cos(a + w) * R, cy + Math.sin(a + w) * R);
    ctx.closePath();
  }
  ctx.fill();
}
/** a four-point glint */
function glint(ctx: Ctx, x: number, y: number, r: number, rot = 0) {
  if (r <= 0.5) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU,
      rr = i % 2 ? r * 0.18 : r;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  fill(ctx, "#ffffff");
  ctx.restore();
}
function star5(ctx: Ctx, x: number, y: number, r: number, rot: number, col: string) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = rot + (i / 10) * TAU - Math.PI / 2,
      rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  fill(ctx, col);
}
/** fallen leaves and scuffs scattered in perspective (the aftermath) */
function wreck(ctx: Ctx, W: number, H: number, horizon: number, amt: number, seed = 5) {
  if (amt <= 0) return;
  for (let i = 0; i < 70; i++) {
    const d = hash(i, seed),
      y = horizon + (H - horizon) * (0.06 + 0.94 * d * d),
      s = 0.25 + 1.4 * ((y - horizon) / (H - horizon)),
      x = W * (hash(i, seed + 1) * 1.2 - 0.1);
    if (hash(i, seed + 2) > amt) continue;
    if (i % 9 === 0) {
      ellipse(ctx, x, y, 34 * s, 9 * s);
      fill(ctx, Y.soil);
    } else leafShape(ctx, x, y, 13 * s, hash(i, seed + 3) * 6, Y.leaf[i % 5]!);
  }
}
/** the deep yard: sky, trees, the fence at the horizon and a striped lawn running at the lens */
function yardDeep(ctx: Ctx, W: number, H: number, horizon: number, pan = 0, wreckAmt = 0) {
  sky(ctx, W, horizon - 40, pan);
  treeLine(ctx, W, horizon - 30, pan * 0.2 + 40, Y.treeFar, 150, 210, 11);
  treeLine(ctx, W, horizon - 10, pan * 0.35 + 90, Y.treeMid, 95, 170, 29);
  fence(ctx, W, horizon + 12, pan * 0.5, 84, 26);
  lawnDeep(ctx, W, H, horizon + 12, W / 2 - pan * 0.6);
  wreck(ctx, W, H, horizon + 12, wreckAmt);
}
/** a keyed path through the yard: [t, X, Z] eased between keys */
function path(keys: [number, number, number][], t: number) {
  let i = 0;
  while (i < keys.length - 2 && t > keys[i + 1]![0]) i++;
  const a = keys[i]!,
    b = keys[i + 1]!,
    u = ease.inOutCubic(prog(t, a[0], b[0]));
  return { X: lerp(a[1], b[1], u), Z: lerp(a[2], b[2], u) };
}

// ---------------------------------------------------------------------------------------------- the film
// the cut sheet, in frames (a beat is 15; every cut on the grid)
const T = {
  peek: 0, // low in the grass: the bunny nibbles big in the foreground, two dozy dogs on the bench
  snap: 30, // crash in on the bench: both heads snap round, a glint at 45
  freeze: 60, // the bunny's face: it freezes, ears straight up
  lock: 75, // eyes lock on (both faces, focus lines)
  launch: 105, // off the bench (the hop, near-crisp)
  run: 120, // straight at the lens, paw fills the frame, fur smear (12-sample blur from here)
  chase: 165, // side-on gallop, the camera racing along with them
  vault: 225, // riding up with the bunny as it vaults straight over their heads
  chase2: 240, // side on again: skid, turn, whip pan
  leaves: 285, // through the leaf pile, slow motion; the bunny was in it
  leafHat: 330, // close on the bunny sitting in the flattened heap, wearing a leaf
  hopOff: 360, // back wide: it hops off
  split: 375, // two bunnies split and cross; the dogs follow and converge
  tumble: 450, // impact frame, then a cartoon scuffle cloud; the bunnies watch
  face: 510, // the parti one shakes it off and goes feral: a face-filling close-up
  loop: 555, // laps of the yard, now chasing each other; the bunnies watch from the bench
  pass: 615, // down in the grass: each dog tears past the lens, one each way
  loop2: 645, // back to the laps
  skid: 690, // a skid stop at the lens
  sit: 735, // butter wouldn't melt: sitting in the wreckage; a bunny hops in between them
  sitClose: 795, // two faces and the bunny between: the eyes slide, a glint
  sitWide: 840, // wide again: the bunny bolts, the title, they're gone
};
const SUN = "#f3d98b";

export function make(size: Size, id: string): Film {
  const L = layout(size),
    { W, H, u } = L,
    V = L.tall;

  // ---- S1 · peek (0–75): one low set, three framings cut on the grid (wide in the grass, a crash in on the
  // bench for the head snap and glint, then the bunny's face as it freezes)
  const peek = (ctx: Ctx, t: number) => {
    const horizon = V ? H * 0.36 : H * 0.4,
      bx = V ? W * 0.5 : W * 0.3,
      seatY = V ? H * 0.5 : H * 0.56,
      bw = V ? 900 : 1000,
      ds = V ? 1.5 : 1.6,
      bxn = V ? W * 0.68 : W * 0.76,
      by = V ? H * 0.83 : H * 0.97,
      bs = V ? 4.4 : 5.4;
    const snap = spring((t - T.snap) / FPS, { freq: 3.2, damp: 0.45 }),
      hit = spring((t - T.snap) / FPS, { freq: 2.2, damp: 0.5 }),
      alert = spring((t - T.freeze) / FPS, { freq: 3, damp: 0.5 });
    ctx.save();
    if (t < T.snap) {
      // a steady push down the lawn
      const z = 1 + 0.12 * ease.inOutCubic(prog(t, 0, 30));
      cam(ctx, W, H, W * 0.55, H * 0.62, W * 0.55, H * 0.62, z);
    } else if (t < T.freeze) {
      // crash zoom onto the two heads, overshooting and settling, then creeping in
      const z = (V ? 1.6 : 2.0) * (1 + 0.14 * (1 - hit) + 0.05 * prog(t, 30, 60));
      cam(ctx, W, H, bx, seatY - (V ? 290 : 310), W / 2, H * 0.45, z);
    } else {
      // the bunny's own shot: its whole body centred (the camera has swung off the bench, so nothing is cropped)
      const z = (V ? 1.5 : 1.7) * (1 + 0.06 * (1 - alert) + 0.05 * prog(t, 60, 75));
      if (V) cam(ctx, W, H, bxn + 3 * bs, by - 50 * bs, W * 0.55, H * 0.6, z);
      else cam(ctx, W, H, bxn - 30 * bs, by - 50 * bs, W / 2, H * 0.62, z);
    }
    const onBunny = t >= T.freeze,
      onBench = t >= T.snap && t < T.freeze;
    yardDeep(ctx, W, H, horizon, t * 0.4);
    if (!onBunny) {
      ellipse(ctx, bx, seatY + bw * 0.34 + 4, bw * 0.55, 16);
      fill(ctx, Y.shadow);
      bench(ctx, bx, seatY, bw);
    }
    const dozy = t < T.snap ? 0.45 + 0.55 * window01(t, 12, 14, 16, 18) : 0;
    const dogs: [Look, number, number][] = [
      [PARTI, bx - bw * 0.2, 0],
      [RED, bx + bw * 0.2, 1],
    ];
    for (const [look, x, k] of dogs) {
      if (onBunny) break;
      const o = { eye: 1 + 0.28 * snap, lookX: snap, tilt: 0.1 * snap * (k ? -1 : 1), earUp: 0.3 * snap };
      put(ctx, x, seatY - 4, ds, () =>
        dogSit(ctx, look, {
          ...o,
          blink: dozy,
          wob: t * 0.2,
          wag: t * (t < T.snap ? 0.25 : 0.6) + k,
          breathe: 12 * snap + Math.sin(t * 0.25) * 2,
        }),
      );
      // the glint: a star in each eye when the idea lands
      const g = window01(t, 44, 47, 54, 60);
      for (const sx of [-1, 1])
        glint(ctx, x + (sx * 24 + 9 + 3 * snap) * ds, seatY - 4 - (230 + 12 * snap) * ds, 24 * ds * g);
    }
    // the bunny, big in the foreground, nibbling clover (out of the bench shot, so no stray ear at its edge)
    const k = bs / 3.6;
    for (let i = 0; i < 5 && !onBench; i++) {
      const cx = bxn - (78 + i * 22) * bs * 0.6,
        cy = by - (4 + (i % 2) * 10) * k;
      ctx.strokeStyle = Y.blade;
      ctx.lineWidth = 4 * k;
      ctx.beginPath();
      ctx.moveTo(cx, by + 10);
      ctx.lineTo(cx, cy - 18 * k);
      ctx.stroke();
      for (let l = 0; l < 3; l++) {
        const a = (l / 3) * TAU + i;
        ellipse(ctx, cx + Math.cos(a) * 11 * k, cy - 18 * k + Math.sin(a) * 9 * k, 11 * k, 9 * k, a);
        fill(ctx, i % 2 ? "#6fae45" : "#5f9e3b");
      }
    }
    if (!onBench) {
      ellipse(ctx, bxn, by + 6, 60 * bs, 10 * bs);
      fill(ctx, Y.shadow);
      put(ctx, bxn, by, bs, () => bunnySide(ctx, 0, { nibble: t < T.freeze ? 1 : 0, wob: t * 0.5, alert }), true);
    }
    blades(ctx, W, H + 20, t * 0.4, V ? 300 : 170, 70, Y.blade, 3, Math.sin(t / 14) * 0.15);
    ctx.restore();
  };

  // ---- S2 · lock on (75–105)
  const lock = (ctx: Ctx, t: number) => {
    const pop = spring(t / FPS, { freq: 2.6, damp: 0.5 }),
      z = 1 + 0.1 * (t / 30);
    ctx.fillStyle = SUN;
    ctx.fillRect(0, 0, W, H);
    focusLines(ctx, W, H, W / 2, H / 2, t, Y.flash, V ? 420 : 460);
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(z, z);
    ctx.translate(-W / 2, -H / 2);
    const heads: [Look, number, number][] = V
      ? [
          [PARTI, W * 0.5, H * 0.33],
          [RED, W * 0.5, H * 0.7],
        ]
      : [
          [PARTI, W * 0.29, H * 0.6],
          [RED, W * 0.71, H * 0.6],
        ];
    const sc = (V ? 2.6 : 3.1) * (0.88 + 0.12 * pop);
    heads.forEach(([look, x, y], k) =>
      put(ctx, x, y, sc, () =>
        headFront(ctx, look, {
          pupil: 1,
          eye: 1 + 0.5 * pop,
          lookX: 0.5,
          earUp: 0.3 + 0.08 * Math.sin(t * 0.7 + k),
          wob: t * 0.3 + k,
          jaw: 0.08,
        }),
      ),
    );
    const g = window01(t, 12, 15, 20, 26);
    heads.forEach(([, x, y]) => {
      for (const sx of [-1, 1]) glint(ctx, x + (sx * 24 + 6) * sc, y - 18 * sc, 24 * sc * g);
    });
    ctx.restore();
  };

  // projection for the shots that look down the lawn: depth Z in yard units -> screen
  const proj = (X: number, Z: number, horizon: number, spread: number, drop: number, k = 6.4) => {
    const f = k / Math.max(0.3, Z);
    return { x: W / 2 + X * spread * f, y: horizon + drop * f, f };
  };

  // ---- S3 · launch (105–165)
  const launch = (ctx: Ctx, t: number) => {
    const horizon = V ? H * 0.46 : H * 0.54,
      spread = V ? 150 : 240,
      drop = V ? 150 : 110;
    yardDeep(ctx, W, H, horizon, 0);
    const bp = proj(0, 7, horizon, spread, drop),
      bw = 900 * bp.f * 0.55,
      seatY = bp.y - bw * 0.34;
    ellipse(ctx, bp.x, bp.y + 4, bw * 0.55, 12 * bp.f);
    fill(ctx, Y.shadow);
    bench(ctx, bp.x, seatY, bw);
    // the parti one leads and comes all the way to the lens; the red one peels off past the camera
    const dogs: [Look, number, number][] = [
      [PARTI, V ? -0.35 : -0.55, 0],
      [RED, V ? 0.42 : 0.7, 3],
    ];
    const drawn = dogs
      .map(([look, X0, lag]) => {
        const tt = t - lag,
          lead = lag === 0,
          jump = prog(tt, 4, 14),
          close = ease.inCubic(prog(tt, 40, 50)),
          Z =
            tt < 14
              ? lerp(7, 6, jump)
              : tt < 40
                ? 1.05 + 4.95 * (1 - prog(tt, 14, 40)) ** 1.5
                : lead
                  ? lerp(1.05, 0.35, close)
                  : 1.05,
          X =
            X0 * (tt < 14 ? lerp(0.35, 1, jump) : 1) * (lead ? 1 - ease.inOutCubic(prog(tt, 30, 46)) : 1) +
            (lead ? 0 : 3.2 * ease.inCubic(prog(tt, 38, 52)));
        // the stride: in the fill it settles on the phase where the near paw reaches for the lens
        const p = lead && tt > 40 ? 40 / 9 + (5.25 - 40 / 9) * ease.outCubic(prog(tt, 40, 48)) : tt / 9;
        return { look, X, Z, tt, jump, lead, p };
      })
      .sort((a, b) => b.Z - a.Z);
    for (const d of drawn) {
      const p = proj(d.X, d.Z, horizon, spread, drop),
        s = p.f * 0.72;
      if (d.tt < 3.5) {
        put(ctx, p.x, seatY - 3, s * 1.05, () =>
          dogSit(ctx, d.look, { eye: 1.28, lookX: 0.6, earUp: 0.35, breathe: 12, wob: d.tt }),
        );
        continue;
      }
      const hop = d.tt < 14 ? Math.sin(Math.PI * d.jump) * 90 * s + (seatY - p.y) * (1 - d.jump) : 0;
      // at the lens the camera keeps the reaching paw (local (32, −64)) in the middle of the frame, not the feet
      const w = d.lead ? ease.inOutCubic(prog(d.tt, 36, 48)) : 0,
        x = lerp(p.x, W / 2 - 32 * s, w),
        y = lerp(p.y - hop, (V ? H * 0.5 : H * 0.52) + 64 * s, w);
      if (w < 0.5) {
        ellipse(ctx, p.x, p.y + 4, 70 * s, 14 * s);
        fill(ctx, Y.shadow);
      }
      put(ctx, x, y, s, () => dogRunAt(ctx, d.look, d.p, { eye: 1.3, pupil: 1 }));
    }
    // the bunny bolts across the foreground, a smear trailing it
    if (t < 16) {
      const u2 = t / 15,
        x = lerp(W * 0.95, -300, u2),
        bs = V ? 2.1 : 2.3;
      streaks(
        ctx,
        x + 40 * bs,
        H * 0.97 - 30 * bs,
        ((W + 300) / 15) * 1.6,
        50 * bs,
        -1,
        [BUN.fur, BUN.shade, BUN.belly],
        3,
      );
      put(ctx, x, H * 0.97, bs, () => bunnySide(ctx, wrap(t / 7, 1), { alert: 1 }), true);
    }
    blades(ctx, W, H + 20, 0, V ? 140 : 120, 64, Y.blade, 7, Math.sin(t / 5) * 0.2);
    speedLines(ctx, W, H, t, 0.5 * prog(t, 40, 48), -1, "#fffaf0");
    // the smear: white fur rushes across the lens into the next shot
    const sm = prog(Math.round(t), 49, 60); // on whole frames: the wipe is its own drawn smear, never subframe-stacked
    if (sm > 0) furWipe(ctx, W, H, lerp(-W * 0.15, W * 1.35, ease.inCubic(sm)), 1, PARTI, 5);
  };

  // ---- S4 · chase (165–285): side on, the camera racing along with them
  const chase = (ctx: Ctx, tIn: number) => {
    // 60–75 (f225–240) is its own shot: a low medium on the take-off, time slowed to 0.55 inside it
    const vault = tIn >= T.vault - T.chase && tIn < T.chase2 - T.chase,
      t = vault ? 60 + (tIn - 60) * 0.55 : tIn;
    const v = 26;
    const off =
      t <= 78
        ? v * t
        : t <= 100
          ? v * 78 + ((v * 22) / 3) * (1 - (1 - (t - 78) / 22) ** 3)
          : v * 78 + (v * 22) / 3 - (1.6 * (t - 100) ** 3) / 3;
    const horizon = V ? H * 0.42 : H * 0.4;
    ctx.save();
    if (vault) {
      // a fixed low medium over the parti one's head (both look up); the bunny springs up out of the grass
      const z = (V ? 1.29 : 1.35) * (1 + 0.05 * prog(tIn, 60, 75));
      cam(ctx, W, H, V ? W * 0.585 : W * 0.46, V ? H * 0.5 : H * 0.52, W / 2, H / 2, z);
    }
    sky(ctx, W, horizon, off);
    treeLine(ctx, W, horizon + 10, off * 0.15, Y.treeFar, 170, 230, 11);
    treeLine(ctx, W, horizon + 40, off * 0.3, Y.treeMid, 110, 190, 29);
    fence(ctx, W, horizon + 70, off * 0.55, 110, 30);
    lawnSide(ctx, W, H, horizon + 70, off);
    const gFar = V ? H * 0.64 : H * 0.8,
      gNear = V ? H * 0.76 : H * 0.95,
      running = 1 - prog(t, 78, 86) + prog(t, 104, 108),
      crouch = window01(t, 78, 82, 96, 102) * 0.9,
      skidX = 110 * ease.outCubic(prog(t, 78, 96)),
      flip = t >= 102,
      dash = t > 106 ? 2.4 * (t - 106) ** 2 : 0,
      lookUp = 0.5 * window01(t, 60, 66, 76, 84);
    speedLines(ctx, W, H * 0.9, t, 0.55 * clamp(running) * (t < 100 ? 1 : 0), 1);
    // dust kicked up in the skid
    for (let i = 0; i < 8; i++) {
      const t0 = 80 + i * 2;
      if (t < t0 || t > t0 + 26) continue;
      const a = (t - t0) / 26;
      for (const [gx, sc] of [
        [W * 0.3, 1.1],
        [W * 0.46, 1.3],
      ] as const)
        puff(
          ctx,
          gx + skidX + 60 * sc + i * 16 - a * 60,
          (sc > 1.2 ? gNear : gFar) - 10 - a * 40,
          (30 + a * 70) * sc,
          0.9 * (1 - a),
          i,
        );
    }
    const dogs: [Look, number, number, number, number][] = V
      ? [
          [RED, W * 0.34, gFar, 1.4, 0.35],
          [PARTI, W * 0.56, gNear, 1.65, 0],
        ]
      : [
          [RED, W * 0.2, gFar, 1.45, 0.35],
          [PARTI, W * 0.47, gNear, 1.7, 0],
        ];
    for (const [look, x0, gy, sc, ph] of dogs) {
      const x = x0 + Math.sin(t / 13 + ph * 5) * 26 + skidX - dash,
        turnHop = Math.sin(Math.PI * prog(t, 100, 106)) * 60;
      ellipse(ctx, x, gy + 4, 120 * sc, 12 * sc);
      fill(ctx, Y.shadow);
      put(
        ctx,
        x,
        gy - turnHop,
        sc,
        () => dogSide(ctx, look, { p: t / 11 + ph, run: clamp(running), crouch, look: lookUp, jaw: 0.5 }),
        flip,
      );
    }
    // the bunny: ahead of them, then a vault straight over their heads
    const jink = prog(t, 60, 86),
      bs = V ? 1.5 : 1.8;
    if (t < 60) {
      const x = (V ? W * 0.82 : W * 0.76) + Math.sin(t / 9) * 24,
        h = wrap(t / 12, 1);
      put(ctx, x, gNear - Math.sin(Math.PI * h) * 70, bs, () => bunnySide(ctx, h, { alert: 1 }));
    } else if (jink < 1) {
      const x = lerp(V ? W * 0.82 : W * 0.76, -W * 0.2, ease.inOutCubic(jink)),
        y = gNear - Math.sin(Math.PI * jink) * (V ? H * 0.42 : H * 0.62);
      // in the vault shot the bunny springs from just inside the frame (a step left and up the lawn)
      const big = vault ? 1.35 : 1,
        vx = vault && !V ? -60 : 0,
        vy = vault && !V ? -140 : 0;
      put(ctx, x + vx, y + vy, bs * big, () => bunnySide(ctx, 0.5, { alert: 1 }), true, Math.sin(TAU * jink) * 0.4);
    }
    blades(ctx, W, H + 10, off * 1.5, V ? 260 : 110, 60, Y.blade, 13, -0.25 * clamp(running));
    ctx.restore();
    // the launch's fur smear clears the lens to the right
    if (t < 6.5) furWipe(ctx, W, H, lerp(-W * 0.1, W * 1.25, ease.outCubic(Math.round(t) / 7)), -1, PARTI, 5);
    // the whip: the whole frame smears as the camera swings round
    speedLines(ctx, W, H, t * 2, 0.8 * prog(t, 108, 118), -1, "#f4f1e6");
  };

  // ---- S5 · the leaf pile (285–375): through it at full tilt, the burst in slow motion
  const leaves = (ctx: Ctx, t: number) => {
    const hit = 18,
      tau = t < hit ? t : hit + 0.35 * (t - hit) + 0.65 * 5 * (1 - Math.exp(-(t - hit) / 5)),
      horizon = V ? H * 0.46 : H * 0.48,
      gY = V ? H * 0.76 : H * 0.86,
      cx = W * 0.5,
      mw = V ? 700 : 860,
      mh = V ? 210 : 240;
    // 45–75 is its own shot: close on the bunny in the flattened heap, the leaves still falling in slow time
    const hat = t >= T.leafHat - T.leaves && t < T.hopOff - T.leaves;
    ctx.save();
    if (hat) cam(ctx, W, H, cx, gY - 175, W / 2, H * 0.56, (V ? 2.2 : 2.4) * (1 + 0.06 * prog(t, 45, 75)));
    sky(ctx, W, horizon, t);
    treeLine(ctx, W, horizon + 10, 80, Y.treeFar, 160, 220, 11);
    fence(ctx, W, horizon + 60, 0, 104, 30);
    lawnSide(ctx, W, H, horizon + 60, 0);
    // the tree that made the pile
    const tx = V ? W * 0.9 : W * 0.84;
    ctx.fillStyle = "#6a4a33";
    ctx.fillRect(tx - 26, 0, 52, gY - 60);
    ctx.beginPath();
    fluffPath(ctx, tx - 60, V ? 170 : 90, 280, 190, 16, 0.7, 41);
    fill(ctx, Y.treeMid);
    fluff(ctx, tx - 150, V ? 250 : 170, 150, 90, 11, 0.6, 43);
    fill(ctx, "#d9a441");
    // the rake against the fence
    const rx = V ? W * 0.12 : W * 0.13;
    ctx.save();
    ctx.translate(rx, horizon + 60);
    ctx.rotate(-0.25);
    ctx.fillStyle = "#8a6a45";
    ctx.fillRect(-4, -170, 8, 250);
    ctx.fillStyle = "#4b5157";
    ctx.fillRect(-40, -176, 80, 10);
    for (let i = 0; i < 9; i++) ctx.fillRect(-38 + i * 9.5, -196, 3, 22);
    ctx.restore();
    // one leaf drifts down the whole time (the calm before)
    const fl = wrap(t / 70, 1);
    leafShape(ctx, tx - 200 + Math.sin(t / 9) * 50, lerp(V ? 300 : 200, gY, fl), 14, t * 0.1, Y.leaf[1]!);
    const bunnyIn = prog(t, 2, 12);
    // the pile: a heap of leaves, jiggling once the bunny is inside
    const leafN = 150;
    const jig = t > 12 && t < hit ? Math.sin((t - 12) * 2.2) * 0.06 : 0;
    const pileLeaf = (i: number) => {
      const a = hash(i, 1),
        r = Math.sqrt(hash(i, 2));
      const x0 = cx + (a * 2 - 1) * mw * 0.5 * Math.sqrt(1 - (r * 0.6) ** 2),
        y0 = gY - r * mh * (1 - Math.abs(a * 2 - 1) ** 2) * (1 + jig);
      return [x0, y0] as const;
    };
    if (t < hit) {
      ctx.beginPath();
      ctx.ellipse(cx, gY, mw / 2, mh * (1 + jig), 0, Math.PI, TAU);
      fill(ctx, "#c9812f");
      for (let i = 0; i < leafN; i++) {
        const [x0, y0] = pileLeaf(i);
        leafShape(ctx, x0, y0, 30, hash(i, 3) * 6, Y.leaf[i % 5]!);
      }
    } else {
      // the flattened heap left behind
      ctx.beginPath();
      ctx.ellipse(cx, gY, mw * 0.42, mh * 0.22, 0, Math.PI, TAU);
      fill(ctx, "#c9812f");
    }
    // the bunny: hops in and dives under, then is revealed sitting in the flattened heap wearing a leaf
    if (bunnyIn < 1 && t < 12) {
      const x = lerp(-120, cx - mw * 0.25, bunnyIn);
      put(ctx, x, gY - Math.sin(Math.PI * wrap(t / 5, 1)) * 80, 2, () => bunnySide(ctx, wrap(t / 5, 1), { alert: 1 }));
    }
    const reveal = t >= 40;
    if (reveal) {
      const out = prog(t, 80, 90),
        sit = t < 80;
      if (sit) {
        put(ctx, cx, gY + 2, 2.3, () =>
          bunnyFront(ctx, { twitch: Math.sin(t * 1.3) * 1.2, earTilt: window01(t, 60, 64, 70, 74) * 0.5, chew: t }),
        );
        leafShape(ctx, cx + 4, gY - 118 * 2.3 - 4 + Math.sin(t / 3) * 2, 32, 0.3, Y.leaf[0]!);
      } else {
        put(ctx, lerp(cx, W + 150, out), gY - Math.sin(Math.PI * wrap(out * 2, 1)) * 80, 2.1, () =>
          bunnySide(ctx, wrap(out * 2, 1), { alert: 1 }),
        );
      }
    }
    // the dogs: straight through at full speed (real time; only the leaves go slow), each dragging a fur smear
    for (const [look, lag, gy, sc] of [
      [RED, 0, gY + 20, 1.9],
      [PARTI, 3, gY + 50, 2.1],
    ] as const) {
      const u2 = prog(t, 11 + lag, 23 + lag);
      if (u2 <= 0 || u2 >= 1) continue;
      const x = lerp(-W * 0.25, W * 1.25, u2);
      streaks(
        ctx,
        x - 80 * sc,
        gy - 120 * sc,
        ((W * 1.5) / 12) * 2.2,
        110 * sc,
        1,
        [look.coat, look.shade, look.ear],
        lag + 7,
      );
      put(ctx, x, gy, sc, () => dogSide(ctx, look, { p: t / 9 + lag, run: 1, jaw: 0.6 }));
    }
    // the burst: closed-form ballistics with drag, in slow time
    if (t >= hit) {
      const k = 0.07,
        g = 1.4,
        tt = tau - hit,
        e = (1 - Math.exp(-k * tt)) / k;
      for (let i = 0; i < leafN; i++) {
        const [x0, y0] = pileLeaf(i),
          vx = (hash(i, 11) - 0.35) * 30 + (x0 - cx) * 0.06,
          vy = -(12 + hash(i, 12) * 26),
          land = gY - 10 + hash(i, 13) * 80;
        let x = x0 + vx * e + Math.sin(tt * 0.35 + i) * 26 * (1 - Math.exp(-0.06 * tt)),
          y = y0 + (vy + g / k) * e - (g / k) * tt;
        const down = y >= land && tt > 4;
        if (down) y = land;
        x = clamp(x, -40, W + 40);
        const rot = hash(i, 3) * 6 + (down ? 0 : tt * 0.25 * (hash(i, 14) - 0.5) * 2),
          sq = down ? 1 : 0.55 + 0.45 * Math.abs(Math.sin(tt * 0.3 + i));
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1, sq);
        leafShape(ctx, 0, 0, 28 + 10 * hash(i, 15), rot, Y.leaf[i % 5]!);
        ctx.restore();
      }
    }
    blades(ctx, W, H + 10, 0, V ? 280 : 100, 60, Y.blade, 17, Math.sin(t / 11) * 0.12);
    ctx.restore();
  };

  // ---- S6 · split (375–450): two bunnies split and cut back; the dogs follow and meet in the middle
  const split = (ctx: Ctx, t: number) => {
    const horizon = V ? H * 0.38 : H * 0.5,
      spread = V ? 150 : 240,
      drop = V ? 230 : 120;
    yardDeep(ctx, W, H, horizon, 0, 0.35);
    type Actor = { kind: "bunny" | Look; X: number; Z: number; vx: number; ph: number };
    const B1: [number, number, number][] = [
        [0, -0.1, 3.22],
        [28, -1.15, 2.31],
        [58, 0.15, 1.68],
        [75, 1.8, 1.33],
      ],
      B2: [number, number, number][] = [
        [0, 0.1, 3.36],
        [28, 1.15, 2.45],
        [58, -0.15, 1.75],
        [75, -1.8, 1.4],
      ],
      D1: [number, number, number][] = [
        [0, -0.15, 4.62],
        [36, -1.4, 3.22],
        [62, -0.5, 2.24],
        [75, -0.12, 1.96],
      ],
      D2: [number, number, number][] = [
        [0, 0.15, 4.83],
        [36, 1.4, 3.36],
        [62, 0.5, 2.31],
        [75, 0.12, 1.99],
      ];
    const at2 = (keys: [number, number, number][], kind: Actor["kind"], ph: number): Actor => {
      const a = path(keys, t),
        b = path(keys, t + 1);
      return { kind, X: a.X, Z: a.Z, vx: b.X - a.X, ph };
    };
    const cast = [at2(B1, "bunny", 0), at2(B2, "bunny", 0.4), at2(D1, PARTI, 0), at2(D2, RED, 0.5)].sort(
      (a, b) => b.Z - a.Z,
    );
    for (const a of cast) {
      const p = proj(a.X, a.Z, horizon, spread, drop, 6);
      ellipse(ctx, p.x, p.y + 3, 60 * p.f * 0.7, 10 * p.f * 0.7);
      fill(ctx, Y.shadow);
      if (a.kind === "bunny") {
        const h = wrap(t / 9 + a.ph, 1),
          dir = a.vx < 0 ? -1 : 1,
          sp = Math.abs(a.vx) * spread * p.f;
        if (sp > 20)
          streaks(
            ctx,
            p.x - dir * 40 * p.f,
            p.y - 40 * p.f,
            sp * 1.8,
            44 * p.f,
            dir,
            [BUN.fur, BUN.shade, BUN.belly],
            9,
          );
        put(
          ctx,
          p.x,
          p.y - Math.sin(Math.PI * h) * 50 * p.f,
          p.f * 0.9,
          () => bunnySide(ctx, h, { alert: 1 }),
          a.vx < 0,
        );
      } else {
        const look = a.kind,
          spot = window01(t, 62, 68, 80, 90);
        put(
          ctx,
          p.x,
          p.y,
          p.f * 0.62,
          () =>
            dogRunAt(ctx, look, t / 9 + a.ph, {
              eye: 1.2 + 0.4 * spot,
              pupil: 1,
              lookX: look === PARTI ? spot : -spot,
            }),
          false,
          clamp(a.vx * 0.6, -0.35, 0.35),
        );
      }
    }
    blades(ctx, W, H + 10, 0, V ? 240 : 110, 64, Y.blade, 19, Math.sin(t / 6) * 0.15);
  };

  // ---- S7 · tumble (450–510): an impact frame, then a scuffle cloud
  const tumble = (ctx: Ctx, t: number) => {
    if (t < 5) {
      const inv = t === 2 || t === 3,
        bg = inv ? Y.flash : Y.ink,
        fg = inv ? Y.ink : Y.flash;
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);
      focusLines(ctx, W, H, W / 2, H * 0.5, t * 2, fg, V ? 260 : 300);
      const s = V ? 1.5 : 1.8,
        y = H * 0.62;
      put(ctx, W / 2 - 150 * s, y, s, () => dogSide(ctx, sil(fg), { p: 0.05, run: 1, jaw: 0.8 }), false, -0.15);
      put(ctx, W / 2 + 150 * s, y, s, () => dogSide(ctx, sil(fg), { p: 0.45, run: 1, jaw: 0.8 }), true, 0.15);
      star5(ctx, W / 2, y - 200 * s, 110 * s, t * 0.3, fg);
      star5(ctx, W / 2, y - 200 * s, 60 * s, t * 0.3, bg);
      return;
    }
    const horizon = V ? H * 0.44 : H * 0.5,
      gY = V ? H * 0.68 : H * 0.84;
    yardDeep(ctx, W, H, horizon, 0, 0.5);
    const poof = prog(t, 48, 60),
      bx = W / 2 + Math.sin(t * 0.21) * (V ? W * 0.16 : W * 0.14),
      r = ((V ? 230 : 270) + Math.sin(t * 1.3) * 16) * (1 + poof * 1.6),
      by = gY - r * 0.8;
    ellipse(ctx, bx, gY + 6, r * 1.05, 22);
    fill(ctx, Y.shadow);
    // limbs, ears and tails poke out of the cloud on threes
    if (poof < 0.3) {
      const k = Math.floor(t / 3);
      for (let j = 0; j < 6; j++) {
        const a = hash(k, j) * TAU,
          look = j % 2 ? RED : PARTI,
          ex = bx + Math.cos(a) * r * 0.92,
          ey = by + Math.sin(a) * r * 0.75;
        ctx.save();
        ctx.translate(ex, ey);
        ctx.rotate(a - Math.PI / 2);
        if (j < 3) {
          ctx.fillStyle = look.coat;
          ctx.beginPath();
          ctx.roundRect(-18, -40, 36, 130, 18);
          ctx.fill();
          ellipse(ctx, 0, 90, 26, 19);
          fill(ctx, look.paw);
        } else if (j < 5) {
          ear(ctx, look, 0, -20, 120, 54, 0, look.seed + k, t);
        } else {
          fluff(ctx, 0, 56, 38, 54, 9, 0.6, k);
          fill(ctx, look.tail);
        }
        ctx.restore();
      }
    }
    ctx.save();
    ctx.globalAlpha = 1 - poof;
    fluff(ctx, bx, by, r, r * 0.78, 14, 0.8, Math.floor(t / 2), t * 0.2, t * 0.5);
    fill(ctx, "#eadfc6");
    fluff(ctx, bx + r * 0.12, by + r * 0.2, r * 0.7, r * 0.45, 11, 0.7, Math.floor(t / 2) + 3, t * 0.2);
    fill(ctx, "#d9c9a8");
    ctx.restore();
    for (let i = 0; i < 4; i++) {
      const a = t * 0.35 + (i / 4) * TAU;
      star5(ctx, bx + Math.cos(a) * r * 0.8, by - r * 0.95 + Math.sin(a) * 26, 22, t * 0.2 + i, "#f6cf45");
    }
    for (let i = 0; i < 6; i++) {
      const a = wrap(t / 20 + i / 6, 1);
      puff(ctx, bx + (i - 2.5) * r * 0.45, gY - a * 60, 30 + a * 60, 0.8 * (1 - a) * (1 - poof), i + 90);
    }
    // the audience: two bunnies in the foreground, chewing, heads following the ball
    const bunnies: [number, number][] = V
      ? [
          [W * 0.22, H * 0.9],
          [W * 0.78, H * 0.9],
        ]
      : [
          [W * 0.1, H * 0.96],
          [W * 0.2, H * 0.96],
        ];
    bunnies.forEach(([x, y], i) =>
      put(ctx, x, y, V ? 2.2 : 2.3, () =>
        bunnyFront(ctx, { chew: t * 0.9 + i, twitch: Math.sin(t * 1.1 + i) * 1.2, earTilt: Math.sin(t * 0.21) * 0.4 }),
      ),
    );
  };

  // ---- S8 · the face (510–555): shakes it off, then pure feral joy, tongue in the wind
  const face = (ctx: Ctx, t: number) => {
    const go = spring((t - 12) / FPS, { freq: 2.4, damp: 0.45 }),
      streak = prog(t, 12, 16),
      exit = prog(t, 38, 45);
    ctx.fillStyle = Y.sky;
    ctx.fillRect(0, 0, W, H * 0.55);
    ctx.fillStyle = Y.lawn;
    ctx.fillRect(0, H * 0.55, W, H * 0.45);
    ctx.fillStyle = Y.treeMid;
    ctx.fillRect(0, H * 0.46, W, H * 0.09);
    speedLines(ctx, W, H, t, 0.9 * streak, 1, "#eef4e4");
    speedLines(ctx, W, H, t + 50, 0.6 * streak, 1, Y.lawnDark);
    const shake = t < 12 ? Math.sin(t * 2.6) * 0.3 * (1 - t / 12) : Math.sin(t * 3.1) * 0.03 * go,
      sc = (V ? 3.5 : 3.9) * (1 + 0.1 * go),
      x = W / 2 + exit * exit * W * 1.1 + Math.sin(t * 4.2) * 6 * go,
      y = (V ? H * 0.5 : H * 0.54) + Math.cos(t * 3.7) * 6 * go;
    // dust flung off the coat by the shake
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * TAU,
        d = prog(t, 0, 14) * (260 + 120 * hash(i, 2)) * sc * 0.25;
      puff(ctx, x + Math.cos(a) * (180 + d), y + Math.sin(a) * (150 + d), 26 + d * 0.1, 0.8 * (1 - prog(t, 6, 16)), i);
    }
    put(
      ctx,
      x,
      y,
      sc,
      () =>
        headFront(ctx, PARTI, {
          blink: t < 11 ? 0.92 : 0,
          eye: 1 + 0.8 * go,
          pupil: go,
          jaw: 0.75 * go,
          tongue: 1.4 * go,
          earUp: t < 12 ? 0.9 * Math.abs(Math.sin(t * 1.3)) : 0.85 + 0.25 * Math.sin(t * 1.9),
          wob: t * 1.6,
        }),
      false,
      shake,
    );
    const g = window01(t, 13, 15, 18, 22);
    for (const sx of [-1, 1]) glint(ctx, x + (sx * 24 + 6) * sc, y - 20 * sc, 22 * sc * g);
  };

  // ---- S9 · laps (555–690): they forget the bunnies and chase each other round the yard
  const loop = (ctx: Ctx, t: number) => {
    const horizon = V ? H * 0.38 : H * 0.46,
      spread = V ? 130 : 220,
      drop = V ? 250 : 110;
    yardDeep(ctx, W, H, horizon, 0, 0.6);
    // the bench at the back, the two bunnies on it as the audience now
    const bp = proj(V ? -1.2 : -2.8, 10.5, horizon, spread, drop),
      bw = 480 * bp.f * 0.6;
    bench(ctx, bp.x, bp.y - bw * 0.34, bw);
    const theta = Math.PI + (t * TAU) / 64,
      Rx = V ? 1.2 : 1.4,
      Zc = V ? 4.0 : 3.8,
      Rz = V ? 1.6 : 2.0;
    for (const [i, dx] of [
      [0, -0.9],
      [1, 0.9],
    ] as const)
      put(ctx, bp.x + dx * bw * 0.18, bp.y - bw * 0.34, bp.f * 0.55, () =>
        bunnyFront(ctx, { earTilt: Math.sin(theta) * 0.4, chew: t + i, twitch: Math.sin(t + i) }),
      );
    const d = 0.6 * Math.cos(Math.PI * prog(t, 50, 85));
    const pos = (th: number, lane = 0) => ({ X: Rx * Math.cos(th), Z: Zc + lane - Rz * Math.sin(th) });
    // the parti one: a lane further out, and the gap between them opens as they come past the lens
    const lane = V ? 0.95 : 0.7,
      thP = (th: number) => th - d * (1 + 0.5 * Math.max(0, Math.sin(th)) ** 4);
    // the dust trail: puffs dropped every three frames along each dog's path
    for (let k = 0; k < 14; k++) {
      const te = Math.floor(t / 3) * 3 - k * 3,
        age = (t - te) / 42;
      if (te < 0 || age >= 1) continue;
      const th0 = Math.PI + (te * TAU) / 64;
      for (const [th, ln] of [
        [th0, 0],
        [thP(th0), lane],
      ] as const) {
        const q = pos(th, ln),
          p = proj(q.X, q.Z, horizon, spread, drop);
        puff(ctx, p.x, p.y - 10 * p.f, (16 + age * 50) * p.f * 0.6, 0.75 * (1 - age), k);
      }
    }
    const dogs = [
      { look: RED, th: theta, ln: 0 },
      { look: PARTI, th: thP(theta), ln: lane },
    ]
      .map((o) => ({ ...o, ...pos(o.th, o.ln) }))
      .sort((a, b) => b.Z - a.Z);
    for (const o of dogs) {
      const p = proj(o.X, o.Z, horizon, spread, drop),
        s = p.f * (V ? 0.75 : 0.86),
        movingLeft = Math.sin(o.th) > 0,
        // keep the head (≈176 in front) and the tail (≈130 behind) inside the frame with a margin
        m = 50,
        x = movingLeft
          ? clamp(p.x, m + 176 * s, Math.max(m + 176 * s, W - m - 130 * s))
          : clamp(p.x, Math.min(W - m - 176 * s, m + 130 * s), W - m - 176 * s);
      ellipse(ctx, x, p.y + 3, 110 * s, 12 * s);
      fill(ctx, Y.shadow);
      put(
        ctx,
        x,
        p.y,
        s,
        () => dogSide(ctx, o.look, { p: t / 10 + (o.look === RED ? 0.3 : 0), run: 1, jaw: 0.6 }),
        movingLeft,
      );
    }
    blades(ctx, W, H + 10, 0, V ? 240 : 100, 64, Y.blade, 23, Math.sin(t / 7) * 0.15);
  };

  // ---- S9b · the near pass (615–645): lens in the grass, each dog tears past at full size, one each way; each
  // run eases so the dog hangs in mid-frame for a few frames, and the second run starts as the first ends
  const pass = (ctx: Ctx, t: number) => {
    const horizon = V ? H * 0.5 : H * 0.5,
      gy = V ? H * 0.8 : H * 1.0,
      sc = V ? 2.5 : 3.1,
      x0 = V ? -0.4 * W : -0.3 * W,
      x1 = V ? 1.4 * W : 1.3 * W;
    sky(ctx, W, horizon, t * 3);
    treeLine(ctx, W, horizon + 10, 200 + t * 2, Y.treeFar, 190, 240, 11);
    treeLine(ctx, W, horizon + 50, 300 + t * 3, Y.treeMid, 130, 200, 29);
    fence(ctx, W, horizon + 90, t * 4, 140, 38);
    lawnSide(ctx, W, H, horizon + 90, t * 4);
    wreck(ctx, W, H, horizon + 90, 0.5, 9);
    // fast at the edges, slow through the middle: s(u) = ½ + ½(0.18v + 0.82v³), v = 2u − 1
    const xAt = (u: number, left: boolean) => {
      const v = 2 * clamp(u) - 1,
        e = 0.5 + 0.5 * (0.18 * v + 0.82 * v * v * v);
      return left ? lerp(x1, x0, e) : lerp(x0, x1, e);
    };
    const runs: [Look, number, number, boolean][] = [
      [RED, 2, 16, false],
      [PARTI, 16, 30, true],
    ];
    let bend = 0;
    for (const [look, a, b, left] of runs) {
      const u2 = prog(t, a, b),
        dir = left ? -1 : 1;
      if (t > b) bend += dir * 0.5 * Math.exp(-(t - b) / 6);
      else if (t > a) bend += dir * 0.5 * u2;
      // the wake: dust left hanging where it passed
      for (let i = 0; i < 6; i++) {
        const te = a + 1.5 + i * 2.2;
        if (t < te) continue;
        const age = (t - te) / 24;
        puff(
          ctx,
          xAt(prog(te, a, b), left),
          gy - 50,
          (40 + age * 110) * (V ? 0.8 : 1),
          0.85 * (1 - clamp(age)),
          i + (left ? 10 : 0),
        );
      }
      if (u2 > 0 && u2 < 1) {
        const x = xAt(u2, left),
          sp = Math.abs(xAt(prog(t + 1, a, b), left) - x);
        speedLines(ctx, W, H, t, 0.25 + 0.4 * clamp(sp / 300), dir, "#f4f1e6");
        streaks(ctx, x - dir * 90 * sc, gy - 125 * sc, sp * 1.5, 100 * sc, dir, [look.coat, look.shade, look.ear], a);
        put(ctx, x, gy, sc, () => dogSide(ctx, look, { p: t / 6, run: 1, jaw: 0.7 }), left);
      }
    }
    // a leaf kicked up by the second pass spirals down
    const lf = prog(t, 20, 30);
    if (lf > 0) leafShape(ctx, W * 0.6 + Math.sin(lf * 9) * 90, lerp(H * 0.3, gy - 40, lf), 34, lf * 12, Y.leaf[3]!);
    blades(ctx, W, H + 10, 0, V ? 300 : 180, 56, Y.blade, 37, bend);
  };

  // ---- S10 · skid (690–735): brakes on, right at the lens
  const skid = (ctx: Ctx, t: number) => {
    const horizon = V ? H * 0.3 : H * 0.5,
      spread = V ? 150 : 250,
      drop = V ? 220 : 110;
    const skidZ = (pr: number) => 1.7 + 3.3 * (1 - pr) ** 2;
    // the stop lands with a comedy snap zoom onto the two faces (clamped so the yard always fills the frame)
    ctx.save();
    if (t >= 30) {
      const z = (V ? 1.2 : 1.25) * (1 + 0.04 * prog(t, 30, 45)),
        stop = proj(0, 1.7, horizon, spread, drop),
        sy = H * 0.5,
        wy = Math.min(stop.y - 200 * stop.f * 0.5, H - (H - sy) / z);
      cam(ctx, W, H, W / 2, wy, W / 2, sy, z);
    }
    yardDeep(ctx, W, H, horizon, 0, 0.7);
    const shake = window01(t, 28, 30, 32, 38) * Math.sin(t * 5) * 8;
    ctx.save();
    ctx.translate(shake, shake * 0.5);
    const dogs = [
      { look: PARTI, X: V ? -0.42 : -0.55, lag: 0 },
      { look: RED, X: V ? 0.44 : 0.57, lag: 2 },
    ]
      .map((o) => {
        const tt = t - o.lag,
          pr = prog(tt, 0, 30);
        return { ...o, tt, Z: skidZ(pr), braking: prog(tt, 12, 16) };
      })
      .sort((a, b) => b.Z - a.Z);
    for (const o of dogs) {
      const p = proj(o.X, o.Z, horizon, spread, drop),
        s = p.f * 0.5,
        stop = o.tt >= 30,
        bounce = stop ? spring((o.tt - 30) / FPS, { freq: 3, damp: 0.35 }) : 0,
        sq = stop ? 1 + 0.08 * (1 - bounce) : 1;
      // the spray: grass and dirt fanning up from the planted paws
      for (let k = 0; k < 16; k++) {
        const te = 14 + k;
        if (o.tt < te) continue;
        for (let j = 0; j < 5; j++) {
          const id = k * 5 + j,
            age = o.tt - te,
            vx = (hash(id, 1) - 0.5) * 26,
            vy = -(10 + 16 * hash(id, 2)),
            q = proj(o.X, skidZ(prog(te, 0, 30)), horizon, spread, drop),
            x = q.x + vx * age * q.f * 0.5,
            y = q.y + (vy * age + 0.9 * age * age) * q.f * 0.5,
            sz = (2.5 + 3 * hash(id, 3)) * q.f * (1 + age * 0.05);
          if (y > H + 40 || age > 26) continue;
          if (j !== 0) leafShape(ctx, x, y, sz * 2.2, id + age * 0.3, j % 2 ? Y.bladeLit : Y.blade);
          else {
            ellipse(ctx, x, y, sz, sz * 0.8);
            fill(ctx, "#9a7a55");
          }
        }
      }
      ellipse(ctx, p.x, p.y + 4, 80 * s, 14 * s);
      fill(ctx, Y.shadow);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.scale(sq, 2 - sq);
      put(ctx, 0, 0, s, () =>
        dogRunAt(ctx, o.look, o.braking > 0 ? 0.25 : o.tt / 9, {
          eye: stop ? 1.15 : 1.3,
          pupil: stop ? 0 : 1,
          jaw: stop ? 0.3 : 0.5,
          earUp: stop ? 0.2 * (1 - bounce) : 0.6,
          tilt: stop ? (o.look === RED ? -0.1 : 0.1) * bounce : 0,
        }),
      );
      ctx.restore();
    }
    ctx.restore();
    blades(ctx, W, H + 10, 0, V ? 220 : 110, 64, Y.blade, 29, Math.sin(t / 6) * 0.2);
    ctx.restore();
  };

  // ---- S11 · sit (735–900): butter wouldn't melt. Three framings of one set, cut on the grid: wide (panting,
  // the bunny hops in), close on the two faces with the bunny between (the eyes slide, a glint), wide for the bolt
  const sit = (ctx: Ctx, t: number) => {
    const horizon = V ? H * 0.42 : H * 0.46,
      gy = V ? H * 0.8 : H * 0.93,
      sc = V ? 1.5 : 1.95,
      xs = V ? [W * 0.3, W * 0.7] : [W * 0.34, W * 0.66],
      close = t >= T.sitClose - T.sit && t < T.sitWide - T.sit;
    ctx.save();
    if (close)
      cam(ctx, W, H, W / 2, gy - (V ? 300 : 330), W / 2, H * 0.45, (V ? 1.2 : 1.55) * (1 + 0.05 * prog(t, 60, 105)));
    else {
      const z = t < 60 ? 1 + 0.05 * ease.inOutCubic(prog(t, 0, 60)) : 1.03 + 0.04 * prog(t, 105, 165);
      cam(ctx, W, H, W / 2, H * 0.75, W / 2, H * 0.75, z);
    }
    yardDeep(ctx, W, H, horizon, 0, 0.9);
    // the bench, pushed back and small: clear of the dogs' heads and ears
    const bw = V ? 380 : 340,
      seatY = horizon + 40;
    if (!close || V) bench(ctx, V ? W * 0.5 : W * 0.13, seatY, bw);
    // the rake, knocked flat on the ground line behind the paws
    ctx.save();
    ctx.translate(V ? W * 0.06 : W * 0.06, gy - 12);
    ctx.rotate(-0.02);
    ctx.fillStyle = "#8a6a45";
    ctx.beginPath();
    ctx.roundRect(0, -5, V ? W * 0.86 : W * 0.43, 10, 5);
    ctx.fill();
    ctx.fillStyle = "#4b5157";
    ctx.fillRect(-6, -34, 12, 50);
    for (let i = 0; i < 6; i++) ctx.fillRect(-20, -30 + i * 9, 16, 3);
    ctx.restore();
    const pant = (1 - prog(t, 40, 100)) * 0.5 + 0.2;
    const blinkAt = (list: number[]) => Math.max(...list.map((b) => window01(t, b, b + 2, b + 3, b + 6)));
    const slide = ease.inOutCubic(prog(t, 78, 96)),
      bolt = t >= 118,
      snap = spring((t - 121) / FPS, { freq: 3, damp: 0.4 }),
      dash = prog(t, 146, 156);
    const cast: [Look, number, number, number[]][] = [
      [PARTI, xs[0]!, 1, [20, 70]],
      [RED, xs[1]!, -1, [44, 96]],
    ];
    // the bunny hops in and bolts out behind the dogs (a step back from their ground line), never across them
    const mid = W / 2,
      bs = V ? 1.7 : 2.1;
    if (t >= 40 && t < 62) {
      const u2 = prog(t, 40, 62);
      put(
        ctx,
        lerp(W + 120, mid, u2),
        gy - 30 * (1 - u2) - Math.sin(Math.PI * wrap(u2 * 3, 1)) * 60,
        bs,
        () => bunnySide(ctx, wrap(u2 * 3, 1), {}),
        true,
      );
    } else if (t >= 118) {
      const u2 = prog(t, 118, 128);
      if (u2 < 1)
        put(
          ctx,
          lerp(mid, W + 160, ease.inCubic(u2)),
          gy - 30 * u2 - Math.sin(Math.PI * wrap(u2 * 2, 1)) * 50,
          bs,
          () => bunnySide(ctx, wrap(u2 * 2, 1), { alert: 1 }),
        );
    }
    for (const [look, x, dir, bl] of cast) {
      const jit = bolt ? Math.sin(t * 5 + dir) * 3 * (1 - dash) : 0,
        dx = dash * dash * W * 1.2;
      ellipse(ctx, x + dx, gy + 4, 70 * sc, 12 * sc);
      fill(ctx, Y.shadow);
      put(ctx, x + dx + jit, gy, sc, () =>
        dogSit(ctx, look, {
          jaw: bolt ? 0.2 : pant * (0.5 + 0.5 * Math.abs(Math.sin(t * 0.9 + dir))),
          tongue: bolt ? 0 : pant * 0.5,
          blink: blinkAt(bl),
          lookX: bolt ? snap : dir * slide * (t < 118 ? 1 : 0),
          tilt: (bolt ? -0.08 * snap : 0.12 * dir * window01(t, 30, 40, 80, 90)) + (bolt ? 0 : 0),
          earUp: bolt ? 0.45 * snap : 0.05,
          eye: 1 + 0.25 * slide + 0.2 * snap,
          wag: t * (bolt ? 1.4 : 0.35) + dir,
          wob: t * 0.3,
          breathe: bolt ? 10 * snap : Math.sin(t * 0.9) * 2 * pant,
        }),
      );
      // the glint as the idea lands again
      const gl = window01(t, 97, 100, 103, 108);
      for (const sx of [-1, 1]) glint(ctx, x + dx + jit + (sx * 24 + 8 + 3 * dir) * sc, gy - 232 * sc, 22 * sc * gl);
      // a leaf stuck to the red one's head: the evidence
      if (look === RED)
        leafShape(ctx, x + dx + jit + 14 * sc, gy - 268 * sc, 16 * sc, -0.5 + Math.sin(t / 8) * 0.05, Y.leaf[2]!);
    }
    // the bunny sits right between them
    if (t >= 62 && t < 118)
      put(ctx, mid, gy, bs, () =>
        bunnyFront(ctx, {
          twitch: Math.sin(t * 1.4) * 1.3,
          chew: t * 0.8,
          earTilt: window01(t, 106, 110, 114, 118) * -0.3,
        }),
      );
    // dust where the dogs were, once they are gone
    if (dash > 0) for (const x of xs) puff(ctx, x + 40, gy - 30, 60 + 90 * dash, 0.9 * (1 - prog(t, 150, 165)), 7);
    blades(ctx, W, H + 20, 0, V ? 200 : 90, 64, Y.blade, 31, Math.sin(t / 16) * 0.12);
    ctx.restore();
    // the title, set after the bolt
    const ta = prog(t, 126, 136);
    if (ta > 0) {
      const ty = V ? L.safe.top + 150 * u : H * 0.2,
        rise = (1 - ease.outCubic(ta)) * 30 * u;
      text(ctx, "zoomies.", W / 2 + (t - 126) * 0.4 * u, ty + rise, {
        size: (V ? 170 : 190) * u,
        family: F_.italic,
        color: Y.ink,
        align: "center",
        alpha: ta,
        track: -0.02,
      });
    }
  };

  const paint = (ctx: Ctx, env: Env, F: number) => {
    ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    if (F < T.lock) peek(ctx, F - T.peek);
    else if (F < T.launch) lock(ctx, F - T.lock);
    else if (F < T.chase) launch(ctx, F - T.launch);
    else if (F < T.leaves) chase(ctx, F - T.chase);
    else if (F < T.split) leaves(ctx, F - T.leaves);
    else if (F < T.tumble) split(ctx, F - T.split);
    else if (F < T.face) tumble(ctx, F - T.tumble);
    else if (F < T.loop) face(ctx, F - T.face);
    else if (F < T.pass) loop(ctx, F - T.loop);
    else if (F < T.loop2) pass(ctx, F - T.pass);
    else if (F < T.skid) loop(ctx, F - T.loop);
    else if (F < T.sit) skid(ctx, F - T.skid);
    else sit(ctx, F - T.sit);
  };
  // fast shots integrate a 180° shutter; holds, the close-ups and the impact frame stay crisp
  // [start, id, blur samples, shutter]: the fast crossings take more samples (plus drawn smears) so they streak
  // instead of strobing; the camera moves inside peek, leaves and sit are their own shots, cut on the grid
  const cuts: [number, string, number, number][] = [
    [T.peek, "peek", 1, 0.5],
    [T.snap, "head-snap", 1, 0.5],
    [T.freeze, "freeze", 1, 0.5],
    [T.lock, "lock-on", 1, 0.5],
    [T.launch, "launch", 4, 0.15],
    [T.run, "run-at-lens", 12, 0.35],
    [T.chase, "chase", 6, 0.5],
    [T.vault, "vault", 6, 0.3],
    [T.chase2, "skid-turn", 6, 0.5],
    [T.leaves, "leaves", 12, 0.5],
    [T.leafHat, "leaf-hat", 3, 0.5],
    [T.hopOff, "hop-off", 8, 0.5],
    [T.split, "split", 10, 0.5],
    [T.tumble, "tumble", 1, 0.5],
    [T.face, "face", 3, 0.5],
    [T.loop, "laps", 8, 0.5],
    [T.pass, "near-pass", 8, 0.3],
    [T.loop2, "laps-2", 8, 0.5],
    [T.skid, "skid", 5, 0.5],
    [T.sit, "sit", 1, 0.5],
    [T.sitClose, "sit-close", 1, 0.5],
    [T.sitWide, "sit-bolt", 1, 0.5],
  ];
  const shots: Shot[] = cuts.map(([start, sid, samples, shutter], i) => ({
    id: sid,
    start,
    end: cuts[i + 1]?.[0] ?? N,
    // subframes stay inside the shot, so a blurred first frame never samples the previous scene
    draw: (ctx, local, env) =>
      motionBlur(ctx, env, (c, dt) => paint(c, env, clamp(start + local + dt, start, (cuts[i + 1]?.[0] ?? N) - 0.01)), {
        samples,
        shutter,
      }),
  }));
  return {
    meta: { title: id, W, H, fps: FPS, bpm: BPM, durationFrames: N, raster: "cpu" },
    assets: { images: {}, fonts: P.assets },
    shots,
    audio: foley,
  };
}

// ---------------------------------------------------------------------------------------------- the sound
// Foley first, like the reference: every footfall, whoosh, bark, crunch and bonk is synthesised on an exact frame,
// over a light pizzicato bed at 120 bpm that drops out for the slow motion and the impact. Pure and seeded.
function foley(sr: number): [Float32Array, Float32Array] {
  const n = Math.ceil((N / FPS) * sr),
    L = new Float32Array(n),
    R = new Float32Array(n),
    at = (f: number) => Math.round((f / FPS) * sr),
    noise = rng(53);
  const add = (i: number, v: number, pan = 0.5) => {
    if (i < 0 || i >= n) return;
    L[i] += v * (1 - pan);
    R[i] += v * pan;
  };
  const hz = (m: number) => 440 * 2 ** ((m - 69) / 12);
  /** an RBJ band-pass whose centre can move every sample */
  const bandpass = () => {
    let x1 = 0,
      x2 = 0,
      y1 = 0,
      y2 = 0;
    return (x: number, fc: number, q: number) => {
      const w = (TAU * Math.min(fc, sr * 0.45)) / sr,
        al = Math.sin(w) / (2 * q),
        a0 = 1 + al,
        y = (al * x - al * x2 + 2 * Math.cos(w) * y1 - (1 - al) * y2) / a0;
      x2 = x1;
      x1 = x;
      y2 = y1;
      y1 = y;
      return y;
    };
  };
  const whoosh = (endF: number, dur: number, vel: number, f0: number, f1: number, p0 = 0.3, p1 = 0.7) => {
    const len = Math.round(dur * sr),
      i0 = at(endF) - len,
      bp = bandpass(),
      tail = Math.round(0.12 * sr);
    for (let k = 0; k < len + tail; k++) {
      const u = Math.min(1, k / len),
        env = k < len ? u * u : Math.exp(-(k - len) / (0.03 * sr)),
        y = bp(noise() * 2 - 1, lerp(f0, f1, u), 1.4);
      add(i0 + k, y * env * vel, lerp(p0, p1, u));
    }
  };
  const thump = (f: number, vel: number, f0 = 110, pan = 0.5) => {
    const i0 = at(f);
    let ph = 0,
      lp = 0;
    for (let k = 0; k < 0.12 * sr; k++) {
      const t = k / sr;
      ph += (f0 * (0.55 + 0.45 * Math.exp(-t / 0.02))) / sr;
      lp += 0.07 * (noise() * 2 - 1 - lp);
      add(i0 + k, (Math.sin(TAU * ph) * 0.8 + lp * 0.5) * Math.exp(-t / 0.035) * vel, pan);
    }
  };
  /** a gallop: four footfalls a stride (the rotary gallop's rhythm), from f0 to f1 */
  const patter = (f0: number, f1: number, stride: number, vel: number, pan = 0.5) => {
    for (let s = f0; s < f1; s += stride)
      [0, 0.14, 0.5, 0.62].forEach((o, j) => thump(s + o * stride, vel * (j % 2 ? 0.7 : 1), 95 + j * 12, pan));
  };
  /** a bark: a buzzy source through two formants, pitch falling ("ruff") */
  const bark = (f: number, pitch: number, dur: number, vel: number, pan = 0.5, formants = [650, 1500]) => {
    const i0 = at(f),
      len = Math.round(dur * sr),
      bps = formants.map(() => bandpass());
    let ph = 0;
    for (let k = 0; k < len; k++) {
      const t = k / sr,
        u = k / len,
        fr = pitch * (1 + 0.3 * Math.exp(-t / 0.018)) * (1 - 0.3 * u);
      ph += fr / sr;
      const src = (ph % 1) * 2 - 1 + (noise() * 2 - 1) * 0.35,
        env = Math.min(1, t / 0.004) * (1 - u) ** 1.4;
      const y = bps.reduce((a, b, j) => a + b(src, formants[j]! * (1 - 0.1 * u), 5) * (j ? 0.6 : 1), 0);
      add(i0 + k, y * env * vel, pan);
    }
  };
  const bell = (f: number, midi: number, vel: number, dur = 1.2, pan = 0.5) => {
    const i0 = at(f),
      fr = hz(midi);
    for (let k = 0; k < dur * sr; k++) {
      const t = k / sr;
      add(
        i0 + k,
        (Math.sin(TAU * fr * t) + 0.35 * Math.sin(TAU * fr * 2.76 * t) * Math.exp(-t * 6)) *
          Math.exp(-t * (3 / dur)) *
          Math.min(1, t / 0.002) *
          vel,
        pan,
      );
    }
  };
  /** the cartoon spring: a pitch that wobbles and rises */
  const boing = (f: number, base: number, vel: number, pan = 0.5) => {
    const i0 = at(f);
    let ph = 0;
    for (let k = 0; k < 0.45 * sr; k++) {
      const t = k / sr;
      ph += (base * (1 + 0.8 * t) * (1 + 0.25 * Math.exp(-t * 5) * Math.sin(TAU * 16 * t))) / sr;
      add(i0 + k, Math.sin(TAU * ph) * Math.exp(-t * 6) * Math.min(1, t / 0.003) * vel, pan);
    }
  };
  const bonk = (f: number, vel: number) => {
    const i0 = at(f),
      bp = bandpass();
    let ph = 0,
      ph2 = 0;
    for (let k = 0; k < 0.5 * sr; k++) {
      const t = k / sr;
      ph += (230 * (0.5 + 0.5 * Math.exp(-t / 0.05))) / sr;
      ph2 += (55 * (1 + Math.exp(-t / 0.02))) / sr;
      const click = bp(noise() * 2 - 1, 1900, 3) * Math.exp(-t / 0.012);
      add(
        i0 + k,
        (Math.sin(TAU * ph) * Math.exp(-t / 0.09) + Math.sin(TAU * ph2) * Math.exp(-t / 0.12) + click * 2) * vel,
      );
    }
  };
  /** leaves, grass, gravel: a crackle of tiny band-passed clicks */
  const crackle = (f0: number, dur: number, rate: number, vel: number, fc = 3200, pan = 0.5, fade = true) => {
    const i0 = at(f0),
      len = Math.round(dur * sr),
      bp = bandpass();
    let c = 0;
    for (let k = 0; k < len; k++) {
      if (noise() < rate / sr) c = 1;
      c *= 0.994;
      const env = fade ? (1 - k / len) ** 1.5 : Math.min(1, k / (0.05 * sr), (len - k) / (0.05 * sr));
      add(i0 + k, bp((noise() * 2 - 1) * c, fc * (0.7 + 0.6 * noise()), 2) * env * vel, pan);
    }
  };
  const skidSnd = (f0: number, dur: number, vel: number) => {
    const i0 = at(f0),
      len = Math.round(dur * sr),
      bp = bandpass();
    let ph = 0;
    for (let k = 0; k < len; k++) {
      const t = k / sr,
        u = k / len;
      ph += (1500 - 400 * u + Math.sin(TAU * 7 * t) * 30) / sr;
      const env = Math.min(1, t / 0.03) * (1 - u) ** 0.7;
      add(i0 + k, (bp(noise() * 2 - 1, 2400 - 900 * u, 2) * 1.2 + Math.sin(TAU * ph) * 0.12) * env * vel);
    }
  };
  const chirp = (f: number, vel: number, pan: number) => {
    const i0 = at(f);
    let ph = 0;
    for (let k = 0; k < 0.07 * sr; k++) {
      const t = k / sr;
      ph += (3200 + 1600 * (t / 0.07)) / sr;
      add(i0 + k, Math.sin(TAU * ph) * Math.sin((Math.PI * t) / 0.07) * vel, pan);
    }
  };
  /** a pant: two breathy "hah"s */
  const pant = (f: number, vel: number, pan: number) => {
    for (const o of [0, 5]) {
      const i0 = at(f + o),
        bp = bandpass(),
        len = Math.round(0.11 * sr);
      for (let k = 0; k < len; k++) {
        const u = k / len;
        add(i0 + k, bp(noise() * 2 - 1, 1300 - 300 * u, 1.2) * Math.sin(Math.PI * u) * vel * (o ? 0.7 : 1), pan);
      }
    }
  };
  const brrr = (f0: number, dur: number, vel: number) => {
    const i0 = at(f0),
      bp = bandpass();
    for (let k = 0; k < dur * sr; k++) {
      const t = k / sr;
      add(i0 + k, bp(noise() * 2 - 1, 900, 1.5) * Math.abs(Math.sin(TAU * 13 * t)) * (1 - t / dur) * vel);
    }
  };

  // ---- the bed: pizzicato bass and off-beat plucks in F (F Dm Bb C), a celesta for the quiet parts
  const beat = 15,
    pluck = (f: number, midi: number, vel: number, pan = 0.5, decay = 9) => {
      const i0 = at(f),
        fr = hz(midi);
      for (let k = 0; k < 0.5 * sr; k++) {
        const t = k / sr;
        add(
          i0 + k,
          (Math.sin(TAU * fr * t) + 0.3 * Math.sin(TAU * 2 * fr * t) + 0.12 * Math.sin(TAU * 3 * fr * t)) *
            Math.exp(-t * decay) *
            Math.min(1, t / 0.002) *
            vel,
          pan,
        );
      }
    };
  const CH = [
    [53, 57, 60],
    [50, 53, 57],
    [46, 50, 53],
    [48, 52, 55],
  ];
  const groove = (f: number) =>
    (f >= T.launch && f < T.vault) ||
    (f >= T.chase2 && f < T.leaves + 18) ||
    (f >= T.split && f < T.tumble) ||
    (f >= T.tumble + 6 && f < T.skid + 30);
  for (let f = 0; f < N; f += beat / 2) {
    const b = Math.round(f / beat),
      bar = Math.floor(b / 4),
      ch = CH[bar % 4]!,
      off = Math.round(f / (beat / 2)) % 2 === 1;
    if (groove(f)) {
      if (!off) pluck(f, ch[0]! - 12 + (b % 2 ? 7 : 0), 0.34, 0.5, 7);
      else ch.forEach((m, j) => pluck(f, m + 12, 0.07, 0.3 + j * 0.2, 12));
      if (b % 4 === 3 && off) pluck(f, ch[2]! + 24, 0.08, 0.7, 10);
    }
  }
  // the quiet parts: a celesta figure over the opening and the sit
  const cel = [77, 81, 84, 81, 79, 76, 72, 76];
  for (let k = 0; k < 10; k++) bell(k * beat * 0.5, cel[k % 8]!, 0.07, 0.9, 0.35 + 0.3 * (k % 2));
  for (let k = 0; k < 16; k++)
    bell(T.sit + 6 + k * beat * 0.5, cel[(k + 2) % 8]! - (k > 7 ? 2 : 0), 0.055, 0.9, 0.35 + 0.3 * (k % 2));
  // the slow motion: a held low chord under the leaves
  for (const m of [41, 48, 53, 57]) {
    const i0 = at(T.leaves + 18),
      len = Math.round(2.4 * sr),
      fr = hz(m);
    for (let k = 0; k < len; k++) {
      const t = k / sr;
      add(i0 + k, Math.sin(TAU * fr * t) * Math.min(1, t / 0.3, (len - k) / (0.6 * sr)) * 0.05, 0.3 + (m % 5) * 0.1);
    }
  }

  // ---- S1 peek: nibbling, the heads snap round, a glint, the bunny freezes
  [3, 10, 17, 24].forEach((f) => crackle(f, 0.1, 900, 0.5, 4200, 0.7));
  boing(30, 380, 0.3, 0.3);
  boing(32, 460, 0.26, 0.35);
  bell(45, 96, 0.14, 0.6, 0.3);
  bell(46, 101, 0.1, 0.6, 0.35);
  thump(T.freeze, 0.7, 180, 0.7);
  boing(T.freeze, 900, 0.14, 0.7);
  // ---- S2 lock-on
  whoosh(T.lock, 0.45, 0.5, 300, 2200);
  thump(T.lock, 0.8, 60);
  bell(T.lock + 1, 57, 0.12, 1.4);
  bell(T.lock + 15, 98, 0.16, 0.7, 0.3);
  bell(T.lock + 16, 103, 0.12, 0.7, 0.7);
  // ---- S3 launch
  whoosh(T.launch, 0.3, 0.5, 600, 3500);
  for (let k = 0; k < 3; k++) thump(T.launch + 1 + k * 5, 0.5, 170, 0.3 - k * 0.1);
  bark(T.launch + 6, 330, 0.17, 0.9, 0.62);
  bark(T.launch + 9, 560, 0.1, 0.6, 0.38, [1100, 2600]);
  patter(T.launch + 18, T.launch + 48, 9, 0.35, 0.45);
  whoosh(T.chase, 0.5, 0.8, 400, 5000, 0.1, 0.9);
  // ---- S4 chase
  // the vault shot (f225–240) runs at 0.55 speed: picture time p maps to film frame vault + (p − 60) / 0.55
  const slow = (p: number) => T.vault + (p - 60) / 0.55;
  patter(T.chase, T.vault, 11, 0.4, 0.4);
  patter(T.chase + 4, T.vault, 11, 0.28, 0.6);
  patter(T.vault, T.chase2, 11 / 0.55, 0.22, 0.4); // half-rate footfalls, ducked, in the slow motion
  patter(T.chase2, T.chase + 80, 11, 0.4, 0.4);
  patter(T.chase2 + 4, T.chase + 80, 11, 0.28, 0.6);
  boing(T.vault, 300, 0.3, 0.7);
  bark(slow(66), 560, 0.1, 0.5, 0.45, [1100, 2600]); // the dogs look up as the bunny clears their noses
  whoosh(T.chase2, 0.5, 0.5, 900, 2600, 0.8, 0.1); // the vault whoosh ends on the cut back to side on
  skidSnd(T.chase + 79, 0.7, 0.55);
  thump(T.chase + 103, 0.6, 120);
  patter(T.chase + 106, T.chase + 120, 8, 0.4);
  whoosh(T.leaves, 0.45, 0.9, 5000, 400, 0.9, 0.1);
  // ---- S5 leaves
  crackle(T.leaves + 7, 0.5, 400, 0.4, 3000, 0.4);
  whoosh(T.leaves + 17, 0.25, 0.8, 500, 3000, 0.1, 0.9);
  crackle(T.leaves + 18, 1.4, 5000, 0.8, 2800, 0.5);
  thump(T.leaves + 18, 0.8, 80);
  whoosh(T.leaves + 60, 1.4, 0.25, 180, 500, 0.4, 0.6);
  crackle(T.leaves + 30, 2.2, 60, 0.35, 3800, 0.55, false);
  boing(T.leaves + 44, 700, 0.18, 0.5);
  bell(T.leaves + 64, 93, 0.06, 0.4, 0.4);
  for (let k = 0; k < 3; k++) thump(T.leaves + 80 + k * 4, 0.35, 190, 0.6 + k * 0.1);
  // ---- S6 split
  patter(T.split, T.split + 75, 9, 0.35, 0.35);
  patter(T.split + 3, T.split + 75, 9, 0.3, 0.65);
  for (let k = 0; k < 8; k++) thump(T.split + k * 9, 0.18, 220, k % 2 ? 0.2 : 0.8);
  // the riser: a whistle climbing to the crash
  {
    const i0 = at(T.split + 40),
      len = at(T.tumble) - i0;
    let ph = 0;
    for (let k = 0; k < len; k++) {
      const u = k / len;
      ph += (500 * 2 ** (u * 2)) / sr;
      add(i0 + k, Math.sin(TAU * ph) * u * u * 0.1);
    }
  }
  // ---- S7 tumble
  bonk(T.tumble, 0.7);
  crackle(T.tumble, 0.4, 3000, 0.7, 1500);
  thump(T.tumble, 0.6, 55);
  brrr(T.tumble + 5, 1.5, 0.4);
  crackle(T.tumble + 5, 1.5, 700, 0.35, 900, 0.5, false);
  [9, 16, 24, 31, 40].forEach((o, k) =>
    bark(T.tumble + o, k % 2 ? 560 : 340, 0.09, 0.45, k % 2 ? 0.4 : 0.6, k % 2 ? [1100, 2600] : [650, 1500]),
  );
  [12, 20, 28, 36, 44].forEach((o, k) => chirp(T.tumble + o, 0.1, 0.3 + (k % 3) * 0.2));
  whoosh(T.tumble + 50, 0.3, 0.5, 300, 1200);
  thump(T.tumble + 50, 0.6, 90);
  // ---- S8 face
  brrr(T.face, 0.4, 0.6);
  boing(T.face + 12, 520, 0.35, 0.5);
  thump(T.face + 12, 0.8, 70);
  whoosh(T.face + 38, 0.9, 0.3, 300, 900, 0.5, 0.5);
  bark(T.face + 16, 600, 0.12, 0.7, 0.5, [1150, 2700]);
  whoosh(T.loop, 0.3, 0.8, 800, 4500, 0.4, 1);
  // ---- S9 laps: patter all the way, a whoosh each time a dog passes the lens
  patter(T.loop, T.pass, 10, 0.3, 0.45);
  patter(T.loop + 3, T.pass, 10, 0.25, 0.55);
  patter(T.loop2, T.skid, 10, 0.3, 0.45);
  patter(T.loop2 + 3, T.skid, 10, 0.25, 0.55);
  // θ = π + t·2π/64 reaches the near side (sin θ = 1) at t = 48 + 64k
  for (let tn = T.loop + 48; tn < T.skid; tn += 64) {
    if (tn >= T.pass - 8 && tn < T.loop2) continue;
    whoosh(tn, 0.4, 0.6, 400, 2800, 0.9, 0.1);
    whoosh(tn + 8, 0.4, 0.45, 400, 2400, 0.9, 0.1);
  }
  // each dog hangs mid-frame at about pass + 9 and pass + 23
  whoosh(T.pass + 9, 0.4, 0.9, 300, 3800, 0.05, 0.95);
  whoosh(T.pass + 23, 0.4, 0.9, 300, 3800, 0.95, 0.05);
  patter(T.pass + 3, T.pass + 15, 6, 0.6, 0.5);
  patter(T.pass + 17, T.pass + 29, 6, 0.6, 0.5);
  crackle(T.pass + 9, 0.5, 900, 0.35, 3400, 0.7);
  crackle(T.pass + 23, 0.5, 900, 0.35, 3400, 0.3);
  bark(T.loop + 30, 340, 0.14, 0.6, 0.35);
  bark(T.pass + 21, 560, 0.1, 0.6, 0.7, [1100, 2600]);
  bark(T.loop + 105, 340, 0.12, 0.55, 0.4);
  // ---- S10 skid
  patter(T.skid, T.skid + 14, 9, 0.45);
  skidSnd(T.skid + 14, 0.55, 0.7);
  crackle(T.skid + 14, 0.6, 2500, 0.5, 2200);
  thump(T.skid + 30, 0.9, 80);
  // the record stops: the bed pitches down
  {
    const i0 = at(T.skid + 28),
      len = Math.round(0.4 * sr);
    let ph = 0;
    for (let k = 0; k < len; k++) {
      const u = k / len;
      ph += (hz(53) * (1 - 0.8 * u)) / sr;
      add(i0 + k, Math.sin(TAU * ph) * (1 - u) * 0.2);
    }
  }
  // ---- S11 sit
  for (let k = 0; k < 7; k++) pant(T.sit + 4 + k * 14, 0.22 - k * 0.02, k % 2 ? 0.35 : 0.65);
  for (let k = 0; k < 3; k++) thump(T.sit + 44 + k * 7, 0.3, 200, 0.8 - k * 0.1);
  boing(T.sit + 62, 800, 0.12, 0.5);
  bell(T.sit + 100, 96, 0.12, 0.6, 0.3);
  bell(T.sit + 101, 101, 0.09, 0.6, 0.7);
  thump(T.sit + 110, 0.4, 200, 0.5);
  whoosh(T.sit + 124, 0.3, 0.5, 700, 3000, 0.5, 0.95);
  boing(T.sit + 121, 420, 0.3, 0.35);
  boing(T.sit + 123, 520, 0.26, 0.65);
  // the sting on the title, then they're gone
  [65, 69, 72, 77].forEach((m, k) => pluck(T.sit + 126 + k * 2, m + 12, 0.16, 0.3 + k * 0.13, 5));
  bark(T.sit + 140, 340, 0.15, 0.8, 0.45);
  bark(T.sit + 143, 580, 0.1, 0.6, 0.6, [1100, 2600]);
  whoosh(T.sit + 152, 0.35, 0.8, 500, 4500, 0.4, 1);
  patter(T.sit + 146, T.sit + 158, 8, 0.35, 0.7);

  // the garden under everything: a soft wind and birds in the quiet shots
  {
    let a = 0,
      b = 0;
    for (let i = 0; i < n; i++) {
      a += 0.012 * (noise() * 2 - 1 - a);
      b += 0.012 * (noise() * 2 - 1 - b);
      add(i, a * 0.22, 0.2);
      add(i, b * 0.22, 0.8);
    }
  }
  [6, 38, 62, T.sit + 10, T.sit + 52, T.sit + 88, T.sit + 150].forEach((f, k) => {
    chirp(f, 0.05, 0.2 + (k % 3) * 0.3);
    chirp(f + 4, 0.04, 0.2 + (k % 3) * 0.3);
  });

  // loudness: peak-normalise, then a gentle tanh (deterministic, no limiter pumping)
  let peak = 1e-9;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(L[i]!), Math.abs(R[i]!));
  const g = 1 / peak,
    sat = 2.6,
    out = 0.7 / Math.tanh(sat);
  for (let i = 0; i < n; i++) {
    L[i] = Math.tanh(L[i]! * g * sat) * out;
    R[i] = Math.tanh(R[i]! * g * sat) * out;
  }
  return [L, R];
}

export const zoomies = make("landscape", "zoomies");
export const zoomiesVertical = make("vertical", "zoomiesVertical");
