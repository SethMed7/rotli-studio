# Build study: Before / After

- **Piece:** `splitScreen`
- **Launched:** 2026-09-25 20:18 UTC · **model:** claude-opus-5-5[1m]
- **Cost:** 219,363 tokens · 44 tool calls · 19 min
- **Source:** `6f834591-5513-4f19-a058-1af9a5cdd8f7.jsonl` (extracted by `tools/extract-runs.mjs`)

## Prompt

````markdown
Your complete instructions are in the file ~/rotli-studio/motion/series/studies/prompts/split-screen.prompt.md. Read that file first and follow it exactly: it is the prompt this study is built from (other agents are building other studies in parallel in the same folder, so touch ONLY the files it allows, and keep full renders to the ones the prompt requires). Iterate on the contact sheets until the piece meets the quality bar of the reference study, then report as the file asks.
````

## Report (the agent's own summary, unedited)

I've built study 20 (Before / After) in both sizes, and it passes all of the prompt's checks. Both videos rendered and I looked at every contact sheet. Nothing is committed and the pieces are not registered.

**Files created (only these three):**
- `~/rotli-studio/motion/src/canvas-core/studies/splitScreen.ts` exports `splitScreen` (vertical, the primary) and `splitScreenLandscape`. It follows the reference study's structure. Colours come only from the butter palette and fonts only from the pack; nothing is imported from `rotli/`, `studio/` or `brand.json`.
- `~/rotli-studio/motion/src/hosts/page-splitScreen.ts`
- `~/rotli-studio/motion/src/hosts/page-splitScreenLandscape.ts`

The other `split-screen` files that show in `git status` (the brief, portable and prompt files, and `scripts/split-site.ts`) were there before I started.

**How it's built:** the piece is one scene drawn in two states, with each state clipped to its side of the divider. Before is warm orange, crooked, crowded and wobbling. After is cool blue, square and calm. Every shared object sits in the same place in both states, so the divider works as a real comparison slider: blocks visibly change state as the line crosses them.
- **Divider:** it draws on, drifts slowly while holding, slides to each end and back, leans with its speed, and tilts on purpose during the inbox beat. Then it sweeps past the edge and lands on beat 36 (frame 540).
- **Finale:** the calm week springs into its final place, a "Booked Thu 15:00" block drops in (a callback to the inbox card), and the sign-off shows "Oriel" with the divider coming back as its underline.
- **Captions:** one kit word ladder per side, beside the panel. On the Before side the key word is ink italic on an orange highlight bar, because orange text on the warm background doesn't meet contrast. On the After side it's the blue italic.
- **Sizes:** landscape splits left and right with the captions in side columns. Vertical splits top and bottom; the divider rests at y 910, the middle of the safe area, with captions above and below the panel.
- **Timing:** shots cut at 0, 60, 210, 345, 480 and 600, all on the beat grid.

**Results:**
- **Final sheets:** `/tmp/split-screen.png` (vertical) and `/tmp/split-screen-landscape.png`.
- **Videos:** `/tmp/splitScreen.mp4` and `/tmp/splitScreenLandscape.mp4`.
- **Still frames:** `windows:` is empty for both. An earlier dead-air window at frames 240–255 was fixed by retiming the slider and adding drift.
- **Loop seam:** not run, because this piece isn't a loop.
- **Loudness:** −16.3 LUFS for both (`gain: 0.7`).
- **Type check:** `npx tsc --noEmit -p tsconfig.json` prints nothing.

**What I would improve with more time:**
- The Before panel is rotated slightly while the After panel is square, so there's a visible step in the panel edge at the divider. That's deliberate (the brief's "off-kilter"), but it could be tuned.
- The inbox flood scrolls fast, so it reads as a motion-blurred rush rather than readable rows while it runs (about frames 350–412). A slower flood would keep the rows readable.
- In landscape, the "31 unread" badge sits in the After half of the panel header, so on the Before side the count comes only from the caption. In vertical only about 6 of the 31 threads show above the divider; the caption and badge carry the number.
- The vertical finale leaves some empty space under the "Everything in its place" caption.
- The divider moves are voiced with the kit's rising noise sweep, since `beatScore` has no dedicated slide sound.

There's nothing I couldn't make work.
