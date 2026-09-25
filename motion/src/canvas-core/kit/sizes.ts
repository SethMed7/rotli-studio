// SIZES AS DATA: every platform shape a piece can ship in. One source draws them all, and it is DESIGNED per
// size (a vertical re-stacks, it never just crops the landscape): layout() gives the numbers to branch on.
export const SIZES = {
  landscape: [1920, 1080], // 16:9 · YouTube, X, LinkedIn, sites
  vertical: [1080, 1920], // 9:16 · Reels, Shorts, TikTok, Stories
  square: [1080, 1080], // 1:1 · feeds
  portrait: [1080, 1350], // 4:5 · Instagram feed, carousels
} as const;
export type Size = keyof typeof SIZES;

/** the pieces.json `format` each size registers as (the studio's existing format names) */
export const FORMAT_OF: Record<Size, string> = {
  landscape: "film",
  vertical: "story",
  square: "ig-square",
  portrait: "ig-portrait",
};

export type Layout = {
  size: Size;
  W: number;
  H: number;
  /** one design unit: 1 on the short side's 1080 px, so type and strokes read the same in every size */
  u: number;
  cx: number;
  cy: number;
  tall: boolean;
  wide: boolean;
  /** the margin platform UI leaves clear (vertical feeds cover the top and bottom) */
  safe: { x: number; top: number; bottom: number };
};

export function layout(size: Size): Layout {
  const [W, H] = SIZES[size],
    u = Math.min(W, H) / 1080,
    tall = H > W * 1.2;
  return {
    size,
    W,
    H,
    u,
    cx: W / 2,
    cy: H / 2,
    tall,
    wide: W > H * 1.2,
    safe: { x: 80 * u, top: (tall ? 220 : 70) * u, bottom: (tall ? 320 : 70) * u },
  };
}
