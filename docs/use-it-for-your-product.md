# Use it for your product

The studio draws video, carousels and stills in code: every frame is a pure function, so a piece can be rendered
again byte for byte, cut into other sizes, reviewed on a contact sheet and locked by a golden. Rotli's films are
one use of it. The **Studies** (`motion/series/studies/`) show five others, for a fictional product, and they are
the best place to start.

## Two ways in

**1. A brand pack and the brand-neutral kit (recommended).** Nothing of Rotli comes along.

1. Copy `motion/brand/packs/studio/` to `motion/brand/packs/<you>/`. Put your fonts in `fonts/` (with their
   licences), list them in `pack.json` with their sha256 (`shasum -a 256 fonts/*`), and write your palettes:
   `ground, surface, ink, muted, line, accent, accent2` plus any roles you want.
2. Start from the study closest to what you want (`motion/src/canvas-core/studies/`). Change the pack import to
   yours: `import PACK from "../../../brand/packs/<you>/pack.json"`.
3. Write a brief next to the others (`motion/series/studies/briefs/`), generate its prompt with
   `node tools/study-prompt.mjs <brief>`, and build it yourself or hand the prompt to an agent.
4. Verify, then register it (below).

**2. A whole second studio.** `node tools/new-studio.mjs <dir> --brand <proposal>` copies the engine, the Rotli kit
and the tools into a clean room with no Rotli pieces, and `tools/discover.mjs` + `tools/propose-brand.mjs` draft a
brand from your site. Use this when you want the Rotli-style story engine (atmospheres, chapter cards, derived
cuts) re-dressed as yours. See `.claude/skills/repurpose-brand/SKILL.md` and `docs/evaluation.md`.

## Sizes

`motion/src/canvas-core/kit/sizes.ts` holds every shape as data:

| Size | Pixels | For |
|---|---|---|
| landscape | 1920 × 1080 | YouTube, X, LinkedIn, sites |
| vertical | 1080 × 1920 | Reels, Shorts, TikTok, Stories |
| square | 1080 × 1080 | feeds |
| portrait | 1080 × 1350 | Instagram feed, carousels |

A study exports one Film per size from a `make(size, id)` factory. `layout(size)` gives one design unit `u` (so type
reads the same everywhere), the centre, `tall`/`wide`, and the safe margins platforms leave clear. Design each size:
a vertical re-stacks, it never just crops.

## The kit

| Module | What it gives you |
|---|---|
| `kit/pack.ts` | `usePack(json)`: palettes, font faces, the font assets a Film embeds |
| `kit/motion.ts` | easing, `bezier`, closed-form `spring`, keyed `track` (loop-safe), `phase` |
| `kit/type.ts` | exact text with tracking, per-letter entrances, words timed to a line of copy |
| `kit/ui.ts` | rounded cards with soft shadows, a phone, a switch, a drawn check |
| `kit/depth.ts` | isometric blocks and grids, a perspective projector, a particle spiral |
| `kit/blur.ts` | motion blur by subframes (deterministic) |
| `kit/score.ts` | a beat score with hits, whooshes, UI ticks and a sign-off on exact frames |

## Make, prove, register

```sh
cd motion
node tools/frames.mjs <pieceId> 30,120,240 --out /tmp/x --sheet /tmp/x.png --cols 3   # look at it
node tools/render.mjs <pieceId> --out /tmp/x.mp4                                       # render
node tools/still-frames.mjs /tmp/x.mp4                                                 # no dead air
node tools/loop-seam.mjs /tmp/x.mp4                                                    # loops only
```

Then add the piece to `pieces.json` (`kind`, `slug`, `format`), add it to a series in `series.json` (or name it in
a study brief's `pieces`), and run `node tools/studio.mjs render <id>` and `node tools/studio.mjs golden <id> --record`.
The site (`bun start`, http://127.0.0.1:4500/) picks it up.

## Rules that keep it honest

- Fonts and images you ship must be licensed for it; keep each licence next to the file.
- Claims in captions must be true for your product; the studies invent a product precisely so they claim nothing real.
- Sound is composed in code too (`kit/score.ts`, and `sound/` for the site's own music), so every sample is yours.
