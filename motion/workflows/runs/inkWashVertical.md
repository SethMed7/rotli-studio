# Build study 37 Ink Wash

- **Piece:** `inkWashVertical`
- **Launched:** 2026-09-29 01:46 UTC · **model:** claude-opus-5-5[1m]
- **Cost:** 271,839 tokens · 71 tool calls · 52.6 min
- **Source:** `c74bb602-6202-4ec5-8b02-3569895eeb14.jsonl` (extracted by `tools/extract-runs.mjs`)

## Prompt

````markdown
Your full task is in ~/rotli-studio/motion/series/studies/prompts/ink-wash.prompt.md — read it and follow it exactly. Then read ~/rotli-studio/tmp/studies-27-50/builder-extra.md: extra rules for this build wave (other agents are building other studies in parallel). Build the study, verify it by looking, and report as both files ask.
````

## Report (the agent's own summary, unedited)

I built Ink Wash (study 37) in both sizes. Every gate the prompt asks for passes. I did not commit, register the pieces, record goldens or write a critique file, and I didn't touch `~/rotli`, the kit, the pack, the tools or `pieces.json`.

**Files created**
- `~/rotli-studio/motion/src/canvas-core/studies/inkWash.ts` (exports `inkWash` for landscape and `inkWashVertical`)
- `~/rotli-studio/motion/src/hosts/page-inkWash.ts`
- `~/rotli-studio/motion/src/hosts/page-inkWashVertical.ts`

**Final sheets**
- Vertical: `/tmp/ink-wash-v.png` (full frames in `/tmp/ink-wash-v/`)
- Landscape: `/tmp/ink-wash-l.png` (full frames in `/tmp/ink-wash-l/`)
- Critique sheets: `/tmp/critique-inkWashVertical/` and `/tmp/critique-inkWash/`
- Videos: `/tmp/inkWashVertical.mp4` and `/tmp/inkWash.mp4`

**Results**

| Check | Vertical | Landscape |
|---|---|---|
| still-frames | `windows:` (empty) | `windows:` (empty) |
| loudness | I: −16.2 LUFS | I: −16.2 LUFS |
| render determinism | 6/6 frames identical | 6/6 frames identical |

- It isn't a loop, so there is no loop-seam check.
- `npx tsc --noEmit` shows nothing for my files, and `oxlint` is clean. I formatted the three files with `oxfmt`.
- All five sections start on the 20-frame beat. The sound cues are on the frames the brief lists: whooshes ending at 120, 140, 160, 180, 340, 380, 420, 580 and 620; a tick per blossom and a tick for every other haiku word; the seal hit at 840; the sign-off at 860.

**What changes from the brief**
- **Weather, added to pass the dead-air check.** The brush strokes and the words fading in changed too few pixels, and a camera push-in alone didn't either. So each painting now has one gentle ambient motion:
  - light spring rain (it fits "spring rain —")
  - ripple rings spreading from the heron's leg
  - falling snow
- **Earlier starts.** The water wash and the winter ground wash now begin during the camera slide, so you never arrive at blank paper.
- **Wider washes.** The mist, water and sky washes have rounded ends and uneven widths, so they don't read as flat bars.
- **The pine.** The trunk has moss dots, and I added a pale belly stroke under the heron's wing.
- **The paper.** The paper runs a little past the paintings so the camera doesn't see the scroll's border during the last hold. That margin is where the seal presses: bottom-left in vertical, the far left end in landscape.
- **Build note.** The film is also built in Node, which has no `Path2D`, so the snow mask is created the first time it's drawn.

**Self-critique (both sizes)**

| hook | readability | motion | variety | composition | accuracy | sync |
|---|---|---|---|---|---|---|
| 8 | 8 | 8 | 8 | 8 | 9 | 9 |

- **Hook:** frame 0 is blank washi, as the brief asks, with the mist stroke and rain starting at once.
- **Motion:** slides and the pull-back use adaptive motion blur, and the fast-move sheets look smooth.
- **Variety:** `critique.mjs` reports 0 abrupt changes per 10 s and "longest calm 30 s", because the piece only glides. I'm scoring it by eye: a new stroke, word or blossom arrives roughly every 1–3 s.
- **Accuracy:** the haiku and the seal mark are original, no product is named, and there is one red element.

**Problems I know remain**
1. The sky and mist washes still look like a few stacked horizontal bands with visible halo layers. They read as stylised clouds rather than a truly merged wash.
2. The heron's neck and branch bodies look a bit like smooth vector ribbons. The hair streaks help but don't fully give a real brush feel.
3. The falling snow on bare paper is drawn as faint outlined circles, which can read as small bubbles; it's only clearly snow over the grey sky.
4. During the fast pull-back (around 27.5 s) the heron's thin beak smears into a pale bar. That is correct blur, but it looks odd.
5. In landscape the whole-scroll view is a thin strip about 280 px tall, so each painting is small.
6. About 110 blurred frames per size take up to about 800 ms each against a 150 ms budget. A full render still takes about 2 minutes.

**With more time** I'd merge the wash bands into one continuous side-to-side stroke, draw flakes on bare paper differently, and give strokes wetter edges.
