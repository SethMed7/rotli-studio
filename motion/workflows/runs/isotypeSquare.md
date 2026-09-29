# Build study 40 Isotype

- **Piece:** `isotypeSquare`
- **Launched:** 2026-09-29 01:58 UTC · **model:** claude-opus-5-5[1m]
- **Cost:** 221,734 tokens · 55 tool calls · 41.5 min
- **Source:** `c74bb602-6202-4ec5-8b02-3569895eeb14.jsonl` (extracted by `tools/extract-runs.mjs`)

## Prompt

````markdown
Your full task is in ~/rotli-studio/motion/series/studies/prompts/isotype.prompt.md — read it and follow it exactly. Then read ~/rotli-studio/tmp/studies-27-50/builder-extra.md: extra rules for this build wave (other agents are building other studies in parallel). Build the study, verify it by looking, and report as both files ask.
````

## Report (the agent's own summary, unedited)

I built Isotype (study 40) in both sizes. Both renders pass the dead-air check and sit at about −16 LUFS, and my own file typechecks and lints clean. Nothing is registered, committed or golden-recorded.

**Files created** (only these three):
- `~/rotli-studio/motion/src/canvas-core/studies/isotype.ts` exports `isotypeSquare` (primary) and `isotype` (landscape) from one `make(size, id)`.
- `~/rotli-studio/motion/src/hosts/page-isotypeSquare.ts`
- `~/rotli-studio/motion/src/hosts/page-isotype.ts`

**Final sheets**
- Square: `/tmp/isotype-sq.png` (frames in `/tmp/isotype-sq/`)
- Landscape: `/tmp/isotype-ls.png` (frames in `/tmp/isotype-ls/`)
- Critique sheets: `/tmp/critique-isotypeSquare/` and `/tmp/critique-isotype/`
- Renders: `/tmp/isotypeSquare.mp4` and `/tmp/isotype.mp4`

**Gates**

| | Square | Landscape |
|---|---|---|
| `still-frames` | `windows:` empty (1 identical frame) | `windows:` empty (1 identical frame) |
| Loudness | I: −16.1 LUFS | I: −16.1 LUFS |

- **Loop seam:** not run, because the piece is not a loop.
- **Typecheck:** `npx tsc --noEmit` shows nothing for this study.
- **Lint and privacy:** oxlint is clean after one fix and oxfmt has been applied. There are no home paths in the files.
- **Critique record:** I did not write `series/studies/critiques/isotype*.json`, because the build rules only let me touch my module and its two hosts. The scores are below.

**Self-critique** (the same for both sizes):

| Hook | Readability | Motion | Variety | Composition | Accuracy | Sync |
|---|---|---|---|---|---|---|
| 8 | 8 | 8 | 7 | 8 | 10 | 8 |

- **Hook:** the big blue drop is on screen from frame 0 and swells, then the red strike and "not bigger…" land before 1.5 s.
- **Variety is 7:** `pace.json` finds 0 abrupt changes per 10 s and 81–89% near-still. The piece is a printed chart and the brief limits motion to counting and the push-in. Its punches are the animated cuts (the cut-off piece falls away with a red flash), the counter flashing blue at 100, and a hit on each category.

**Changes from the brief** (please check before registering):
- **Landscape pitch is 60 px, not 64.** At 64, thirteen rows plus the headline plus the push-in's drift don't fit inside the safe area.
- **Type is bigger for phones:**
  - the unit line is 40 px;
  - "about 96.5%" is 56 px in square and 112 px in landscape;
  - the hook notes are 38 px mono;
  - the short-row labels are 38–46 px;
  - the fresh chart's numbers are about 52–56 px.
- **Some lines are still under 44 px:**
  - the square's short-row labels (about 38–40 px);
  - "less than a tenth of one drop" (36 px, on a second line in square);
  - "(all lakes and rivers included)" (34 px);
  - the counter (30 px);
  - the mono footnotes (24–28 px).
- **Labels sit on two edges.** The ocean label is in a right-hand column beside its block. The short-row labels sit beside their own two drops, because the long labels can't fit in the right column.
- **Counting is a little slower:** the oceans use a 2.3-frame stagger ("about six a beat") instead of 2, so the counting fills the section.
- **Push-in:**
  - Each category section pushes in 2% and cuts back on the next section's hit (330, 450, 570, 660). This is what clears the dead-air gate; one continuous 2% push was too slow to register.
  - I also enlarged the big drop's swell so the opening beat moves.
- **Ghost outline drops** (the empty slots before counting) use the line colour mixed 25% toward muted at 3 px, because the pure line colour was nearly invisible on the cream. Greyed-out salty drops use the pure line colour, and a "grey = salty" note explains them.
- **Square end card:** the fresh chart is on the left and the all-water chart on the right, so the two don't cross while they move. On the end card the fresh drops go back into the all-water chart in colour.
- **Landscape fresh-water beat:** the first chart's text labels fade and its glyphs stay as a legend, which gives the right-hand chart room.
- **The speck** for "everything else" is drawn at its true share, 0.04 of one drop's area.

**What I'd improve with more time:**
- In the square, about half a second (roughly frames 690–708) is mostly empty: the first chart has shrunk, the fresh chart hasn't started, and three drops are in flight.
- When the big drop breaks up at frame 60, the outline drops are densely tangled for about 5 frames.
- At 44 px the wave glyph reads more like a crown than a wave.
- The "everything else" label and footnote at the bottom of the square are tight.

Nothing failed to work.
