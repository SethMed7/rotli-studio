# Build study 38 One Line

- **Piece:** `oneLine`
- **Launched:** 2026-09-29 01:48 UTC · **model:** claude-opus-5-5[1m]
- **Cost:** 271,203 tokens · 60 tool calls · 50.4 min
- **Source:** `c74bb602-6202-4ec5-8b02-3569895eeb14.jsonl` (extracted by `tools/extract-runs.mjs`)

## Prompt

````markdown
Your full task is in ~/rotli-studio/motion/series/studies/prompts/one-line.prompt.md — read it and follow it exactly. Then read ~/rotli-studio/tmp/studies-27-50/builder-extra.md: extra rules for this build wave (other agents are building other studies in parallel). Build the study, verify it by looking, and report as both files ask.
````

## Report (the agent's own summary, unedited)

I built study 38, One Line, in both sizes. Both pass still-frames with no dead air and land at −16.1 LUFS, and typecheck is clean. It is not registered, has no goldens and is not committed; the maintainer does all three.

**Files created (nothing else touched):**
- `~/rotli-studio/motion/src/canvas-core/studies/oneLine.ts` (exports `oneLine`, `oneLineVertical`)
- `~/rotli-studio/motion/src/hosts/page-oneLine.ts`
- `~/rotli-studio/motion/src/hosts/page-oneLineVertical.ts`

**How it works:** each drawing is one open path of cubic Béziers from the left edge to the right, cut into 20 named sections. Every section is resampled by arc length to a fixed point budget (2,660 points in total), so any two drawings morph point-for-point. There are nine drawings: seed, needs, swollen seed with drops, coat split, root, hook, seed leaves, true leaves, sun. A part that is missing is collapsed to the point it will grow from, so it grows out of the line. The retraced root reuses the stem's and seed's own points, and the wobble is computed from position and time, so a retraced stroke never splits into two lines. Shots start at 0, 120, 240, 375, 510, 645 and 780, and each morph lands on its section's start.

**Final sheets (from the final code):**
- Landscape: `/tmp/one-line-l.png`, frames in `/tmp/one-line-l/`, critique in `/tmp/one-line-critique-oneLine/`
- Vertical: `/tmp/one-line-v.png`, frames in `/tmp/one-line-v/`, critique in `/tmp/one-line-critique-oneLineVertical/`

**Gates:**

| | still-frames `windows:` | loudness `I:` |
|---|---|---|
| `oneLine` | empty | −16.1 LUFS |
| `oneLineVertical` | empty | −16.1 LUFS |

- `npx tsc --noEmit` prints nothing.
- It is not a loop, so I did not run loop-seam.
- critique.mjs reports 0 changes per 10 s, 96% near-still and a longest calm of 30 s for both sizes.

**Self-critique scores (both sizes):**

| Hook | Readability | Motion | Variety | Composition | Accuracy | Sync |
|---|---|---|---|---|---|---|
| 7 | 8 | 8 | 7 | 8 | 9 | 8 |

Hook and variety are under 8 and I did not fully fix them:
- **Hook:** frame 0 is still bare ground with only the pen dot at the left edge. The headline now starts at frame 2 and the line is moving from the first frame, but the first cell of the sheet is sparse.
- **Variety:** the piece glides by nature, so the tool counts no abrupt changes. There is a new drawing every 2–4 s, and the drop fills, sun fill and sign-off pulse spring in as small punches, but none of that registers as a cut.

**Where I departed from the brief:**
- **Line boil:** on top of the brief's slow sinusoidal wobble, the line steps through three takes of the wobble every 5 frames, a hand-drawn-cel boil already used in annotatedUi. The slow wobble and the 2% drift alone left 15 dead windows in the holds.
- **Framing:** besides the 2% drift in holds, the camera sits closer on the seed stages (1.25× landscape, 1.35× vertical) and eases out as the plant grows. It pivots on the soil so the soil stays at 66% / 62% of the height, and the stroke stays 4 px on screen.
- **Sun:** it is the end of the line. The soil runs almost to the right edge, one leg rises to the spiral, and the line leaves the frame through the sky. As a result the last ~40 px of soil band at the right edge has no ink over it in the last section.
- **Labels:** I added three small labels, "water / air / warmth" (Inter 24 px, muted), under the needs marks. They match the brief's third fact and claim nothing more.
- **Critique file:** I did not write `series/studies/critiques/oneLine*.json`, because the hard rule allows only the module and its hosts.

**Remaining problems:**
- During the hook morph (480–510) a faint ghost of the seed outline peels off for about half a second. I made it faster, but it is still visible.
- The bean reads a little apple-like because of the dip at the top and the hilum dent below.
- The air gust is the weakest icon; it is recognisable only with its label.

**With more time:**
- A stronger first second, such as an opening move that shows the whole line at once.
- A kidney-shaped bean.
- A cleaner route from seed to hook so no ghost appears.
- Short sun rays drawn by the same line.
