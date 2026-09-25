// DEPTH WITHOUT A 3D ENGINE: an isometric block grid and a small perspective projector, on Canvas2D. Enough for
// block waves, orbiting points and particle fields, with no new dependency.
import type { Ctx } from "../core";
import { rng } from "../core";

const C30 = Math.cos(Math.PI / 6),
  S30 = Math.sin(Math.PI / 6);
/** isometric screen offset of a grid point (x, y on the floor, z up), s = one cell */
export const iso = (x: number, y: number, z: number, s: number): [number, number] => [
  (x - y) * C30 * s,
  (x + y) * S30 * s - z * s,
];

const shade = (hex: string, k: number) => {
  const n = parseInt(hex.slice(1), 16),
    c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(Math.max(0, Math.min(255, v * k))));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
};
/** one isometric block: top at its colour, left and right faces darker (the light comes from the top left) */
export function block(ctx: Ctx, x: number, y: number, s: number, h: number, color: string) {
  const top = [iso(0, 0, h, s), iso(1, 0, h, s), iso(1, 1, h, s), iso(0, 1, h, s)],
    base = [iso(1, 0, 0, s), iso(1, 1, 0, s), iso(0, 1, 0, s)];
  const poly = (pts: [number, number][], fill: string) => {
    ctx.beginPath();
    pts.forEach(([px, py], i) => (i ? ctx.lineTo(x + px, y + py) : ctx.moveTo(x + px, y + py)));
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  };
  poly([top[3]!, top[2]!, base[1]!, base[2]!], shade(color, 0.62)); // left face
  poly([top[1]!, top[2]!, base[1]!, base[0]!], shade(color, 0.8)); // right face
  poly(top, color);
}
/**
 * an n×m grid of blocks, drawn back to front. height(i, j) and color(i, j) decide each block; (cx, cy) is where
 * the grid's centre lands on screen.
 */
export function blockGrid(
  ctx: Ctx,
  cx: number,
  cy: number,
  n: number,
  m: number,
  s: number,
  height: (i: number, j: number) => number,
  color: (i: number, j: number) => string,
) {
  const [ox, oy] = iso(n / 2, m / 2, 0, s);
  for (let d = 0; d <= n + m - 2; d++)
    for (let i = Math.max(0, d - m + 1); i <= Math.min(n - 1, d); i++) {
      const j = d - i,
        [px, py] = iso(i, j, 0, s);
      block(ctx, cx - ox + px, cy - oy + py, s, height(i, j), color(i, j));
    }
}

export type Camera = { yaw: number; pitch: number; dist: number; focal: number; cx: number; cy: number };
/** perspective projection of a 3D point: screen x, y, the size factor k, and depth z (for sorting) */
export function project([x, y, z]: [number, number, number], c: Camera) {
  const cy = Math.cos(c.yaw),
    sy = Math.sin(c.yaw),
    cp = Math.cos(c.pitch),
    sp = Math.sin(c.pitch);
  const x1 = x * cy - z * sy,
    z1 = x * sy + z * cy,
    y2 = y * cp - z1 * sp,
    z2 = y * sp + z1 * cp + c.dist,
    k = c.focal / Math.max(1e-3, z2);
  return { x: c.cx + x1 * k, y: c.cy + y2 * k, k, z: z2 };
}

export type Particle = { r: number; a: number; y: number; size: number; hot: boolean; speed: number };
/** a spiral galaxy's particles (seeded): radius, angle on an arm, a little height, a few accent "hot" stars */
export function spiral(seed: number, count: number, arms = 3): Particle[] {
  const R = rng(seed);
  return Array.from({ length: count }, (_, i) => {
    const r = Math.pow(R(), 0.62),
      arm = i % arms;
    return {
      r,
      a: (arm / arms) * Math.PI * 2 + r * 5.2 + (R() - 0.5) * (0.35 + 0.9 * (1 - r) ** 2),
      y: (R() - 0.5) * 0.06 * (1 - r),
      size: 0.6 + R() * 1.6,
      hot: R() < 0.08,
      speed: 0.6 + (1 - r) * 0.9,
    };
  });
}
