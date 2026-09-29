# Build study 35 Title Sequence

- **Piece:** `titleSequence`
- **Launched:** 2026-09-29 01:41 UTC · **model:** claude-opus-5-5[1m]
- **Cost:** 189,074 tokens · 45 tool calls · 25.9 min
- **Source:** `c74bb602-6202-4ec5-8b02-3569895eeb14.jsonl` (extracted by `tools/extract-runs.mjs`)

## Prompt

````markdown
Your full task is in ~/rotli-studio/motion/series/studies/prompts/title-sequence.prompt.md — read it and follow it exactly. Then read ~/rotli-studio/tmp/studies-27-50/builder-extra.md: extra rules for this build wave (other agents are building other studies in parallel). Build the study, verify it by looking, and report as both files ask.
````

## Report (the agent's own summary, unedited)

I built study 35 (Title Sequence) in both sizes. Every required check passes: no dead air, loudness is right, and my file typechecks clean. I did not register the pieces, record goldens, write a critique record or commit.

**Files created** (nothing else touched):
- `~/rotli-studio/motion/src/canvas-core/studies/titleSequence.ts`, which exports `titleSequence` (landscape) and `titleSequenceVertical`
- `~/rotli-studio/motion/src/hosts/page-titleSequence.ts`
- `~/rotli-studio/motion/src/hosts/page-titleSequenceVertical.ts`

**Final sheets:**
- Landscape: `/tmp/title-sequence-final-landscape.png` (critique sheets in `/tmp/critique-titleSequence/`)
- Vertical: `/tmp/title-sequence-final-vertical.png` (critique sheets in `/tmp/critique-titleSequenceVertical/`)
- Renders: `/tmp/titleSequence.mp4` and `/tmp/titleSequenceVertical.mp4`

**Checks:**

| | Landscape | Vertical |
|---|---|---|
| still-frames | `windows:` (empty) | `windows:` (empty) |
| Loudness | I: −15.4 LUFS | I: −15.4 LUFS |
| Changes per 10 s | 3.8 | 3.8 |
| Longest calm | 3.3 s | 4.9 s |

- **Typecheck:** `npx tsc` prints nothing for my file. The only error in the tree is in `multiplane.ts` (`ease.inQuad` doesn't exist), which another agent is still building.
- **Loop seam:** not run; this piece isn't a loop.

**Self-critique scores** (landscape and vertical, from reading all four critique sheets):

| Hook | Readability | Motion | Variety | Composition | Accuracy | Sync |
|---|---|---|---|---|---|---|
| 8 | 8 | 8 | 8 | 8 | 9 | 8 |

**Fixes made while looking:**
- **Vertical overlap:** a bar crossed the "A CONFERENCE ROOM PICTURE" credit. I moved it, and now draw the credit bar last.
- **Empty frames after a cut:** the mustard scene opened on an empty field for 12 frames. Its credit bar now lands on the cut.
- **Slam too weak:** the pace tool didn't count the final slam. I made it thicker and near-instant, which brought the landscape's longest calm from 4.9 s to 3.3 s.
- **Clock:** the hour hand now clears the big centre disc.

**Where I departed from the brief:**
- **Type sizes:** the updated build rules say lines that matter must be about 44 px or more, so I raised them:
  - Credits: 46 px, up from the brief's 30–40. The role words are 1.32× that.
  - Agenda step labels: 32 px, up from 26.
- **The brief's own timing clashes:**
  - The 14 title letters can't arrive one per beat in the 8 beats the scene has. They arrive on eighth notes, every 6 frames, and only the letters on the beat get a tick.
  - The cups can't land one per beat and still have eight arrive, slide and be joined by more within 8 beats. They also land on eighth notes. Cut, slide and step timing stays on the beat.
- **Six chairs:** there are six chairs, one per beat from frame 120 to 180. The two bars before that are taken by the table snapping together.
- **Hook:** the credit bar now lands on frame 0, so the first thing on screen is bold and readable.

**Known problems remaining:**
- **Vertical final calm:** the tool still reports 4.9 s for the vertical. The slam bar only covers about 13% of that tall frame, so it doesn't register, even though it clearly lands on screen. That's still under the 5 s guideline.
- **Frames 568–576:** as the agenda steps fly into the title frame, those frames are busy. It lasts only four on-twos images.
- **Empty lower areas:** some vertical scenes (clock, agenda, title) leave the lower third fairly empty.
- **Letter edges:** the title letters are smooth font glyphs; only the shapes get scissor-cut edges.
- **Landing shadow:** the optional 2 px shadow on a fresh landing is invisible on the black fields, because darkening black does nothing.

**With more time**, I would:
- Give the title glyphs jittered outlines.
- Make the vertical slam bar bigger.
- Put a small second element into the empty vertical lower thirds.
- Let the steps fly into the frame over a full beat.
