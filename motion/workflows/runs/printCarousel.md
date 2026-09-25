# Build study: Print Carousel

- **Piece:** `printCarousel`
- **Launched:** 2026-09-25 15:26 UTC · **model:** claude-opus-5-5[1m]
- **Cost:** 195,751 tokens · 53 tool calls · 12.6 min
- **Source:** `6f834591-5513-4f19-a058-1af9a5cdd8f7.jsonl` (extracted by `tools/extract-runs.mjs`)

## Prompt

````markdown
Your complete instructions are in the file ~/rotli-studio/motion/series/studies/prompts/print-carousel.prompt.md. Read that file first and follow it exactly: it is the prompt this study is built from (other agents are building other studies in parallel in the same folder, so touch ONLY the files it allows). A carousel exports one PNG per slide (frame i*15+14), so the render/still-frames/loudness checks for videos do not apply; verify every slide on the contact sheet at full size instead. Iterate until the piece meets the quality bar of the reference study, then report as the file asks.
````

## Report (the agent's own summary, unedited)

Study 04, Print Carousel, is built in both sizes, portrait and square. I checked all six exported slides at full size in each. `npx tsc --noEmit -p tsconfig.json` prints nothing. Nothing is committed or registered, and I didn't touch the kit, the pack, tools, pieces.json, series.json, goldens or ~/rotli.

**Files created** (the only three):
- `~/rotli-studio/motion/src/canvas-core/studies/printCarousel.ts`: exports `printCarousel` (portrait) and `printCarouselSquare` (square).
- `~/rotli-studio/motion/src/hosts/page-printCarousel.ts`
- `~/rotli-studio/motion/src/hosts/page-printCarouselSquare.ts`

**Contact sheets** (the exported frames 14, 29, 44, 59, 74, 89):
- Portrait: `/tmp/print-carousel.png`, full frames in `/tmp/print-carousel/`
- Square: `/tmp/print-carousel-square.png`, full frames in `/tmp/print-carousel-square/`
- A mid-slide motion check: `/tmp/print-carousel-mid.png`

**How it's built**
- **Structure:** it follows the reference study (`make(size, id)`, one `paint` of a fractional frame). There are six shots of 15 frames each, cut on the 120 bpm grid. There is no audio, since the brief says none.
- **Colour:** every colour comes from the pack's "riso" palette: blue is `ink`, pink is `accent`, yellow is `accent2`, paper is `ground`. I didn't use the hardcoded inks in `styles/riso.ts`; I only use its `cut`, `smooth` and `straight` helpers for the hand-cut edges.
- **Print look:** each ink prints on its own layer, overprinted with multiply and a slight misregistration, with the pinhole and mottle textures. Paper grain goes on last. Blue over pink prints purple, pink over yellow prints orange. Yellow appears only on the cover's clock plate and the final slide's highlighted hour.
- **Motion:** the ink layers spring into register, the halftones and type rise, and each picture's action plays out (arrow lands, figures step aside, clock splits, door swings, hour lights up). Everything settles by frame 14 of each slide, which is the exported frame. A slow push-in keeps every slide moving.
- **Portrait vs square:** portrait puts a big pink numeral beside a condensed headline, a serif italic line under it, and the picture below. Square puts the picture on the left and stacks the numeral, headline and note on the right, centred vertically. The cover is designed separately for each size, and the square cover gets a short extra line.
- **Type:** the headline is Inter 800 squeezed horizontally to read as condensed, and it is sized to fit its column. The smallest text is the 22 px running head. Labels inside the pictures are about 24 px in square and 26 px in portrait.

**Verification results**
- The still-frames, loop-seam and loudness checks don't apply: it's a carousel with no sound.
- **Safe-area rule:** portrait's safe area is 220 px at the top and 320 px at the bottom. All text stays inside it; only illustration runs into the lower margin. Because of that I dropped a "30" label under the split clock and use a single "00–25" label at the top.

**What I would improve with more time**
- The portrait's safe area leaves a plain 220 px band at the top, holding only the registration marks.
- On the cover, "Oriel" sits at the foot of the words (about y 1000 in portrait), not at the very bottom of the page, again because of the safe area.
- The door slide has no wall or room around it.
- On the half-clock, the minute hand at 25 lines up with the 25-minute tick.
- In square, the swung door leaf is only about 46 px from the text column.

**Anything I could not make work:** none.

**Note for the maintainer**
- Every ink layer is marked as covering the full canvas. This is deliberate: without it, text drawn with the kit's `text()` would be clipped out, because the layer only composites the area its shapes marked. The cost is that the layer engine's partial-redraw speedup is off, but each frame still draws in about 20–27 ms.
