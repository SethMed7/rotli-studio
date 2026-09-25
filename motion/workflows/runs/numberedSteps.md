# Build study: Numbered Steps

- **Piece:** `numberedSteps`
- **Launched:** 2026-09-25 19:58 UTC · **model:** claude-opus-5-5[1m]
- **Cost:** 207,300 tokens · 42 tool calls · 14.4 min
- **Source:** `6f834591-5513-4f19-a058-1af9a5cdd8f7.jsonl` (extracted by `tools/extract-runs.mjs`)

## Prompt

````markdown
Your complete instructions are in the file ~/rotli-studio/motion/series/studies/prompts/numbered-steps.prompt.md. Read that file first and follow it exactly: it is the prompt this study is built from (other agents are building other studies in parallel in the same folder, so touch ONLY the files it allows, and keep full renders to the ones the prompt requires). Iterate on the contact sheets until the piece meets the quality bar of the reference study, then report as the file asks.
````

## Report (the agent's own summary, unedited)

The Numbered Steps study (study 14) is built in both sizes, vertical and square, and passes every check the prompt asks for. Nothing is registered or committed.

**Files created** (nothing else was touched):
- `~/rotli-studio/motion/src/canvas-core/studies/numberedSteps.ts`: exports `numberedSteps` (vertical) and `numberedStepsSquare` (square). It has the same structure as motionResume and uses the "butter" palette.
- `~/rotli-studio/motion/src/hosts/page-numberedSteps.ts`
- `~/rotli-studio/motion/src/hosts/page-numberedStepsSquare.ts`

`brand/packs/studio/pack.json` and `workflows/study-preamble.md` were already modified in the working tree before I started; those changes aren't from this study.

**How the piece works:**
- **The numeral** is one thick blue line whose shape blends from digit to digit, so it genuinely morphs rather than cross-fading. It slams in as a 1 at frame 60, becomes the 2 at 240 and the 3 at 420, then shrinks into row 3 of the summary card.
- **The calendar** carries through all three steps:
  - Step 1: three blue "Focus" blocks drop into the mornings, one per beat.
  - Step 2: four meeting chips pop up scattered, then gather into Thursday afternoon, which gets a moving dashed outline.
  - Step 3: "find an hour" is typed into a chat bubble, which flies into Tuesday afternoon and becomes a "Booked" chip.
- **Every hold keeps moving:** a slow push-in on the numeral, a "now" line sliding down the calendar, blocks that breathe slightly, a blinking cursor and a marching dashed outline.
- **The ending:** the summary card falls in from above as the calendar falls out below. Its three rows tick on the beat, then the CTA "Comment "calm" for the checklist" arrives with "Oriel" small underneath.
- **Sizes:** vertical puts the numeral with the words beside it on top, and the calendar below. Square puts the numeral on the left and, on the right, the smaller words above the calendar. All text is 22 px or larger, and a clip keeps dropping blocks from painting over the calendar's day row.
- **Sound:** beatScore drive at 120 bpm. Drums come in at 60, hits land on the three numeral slams (60, 240, 420), ticks mark the icon moves and the checklist ticks, and the sign-off plays at 675 under the CTA.

**Final contact sheets:** `/tmp/numbered-steps.png` (vertical) and `/tmp/numbered-steps-square.png` (square). Both use frames 0, 45, 58, 100, 150, 237, 280, 330, 390, 460, 500, 540, 598, 610, 640, 675, 700 and 719, and the full-size frames are in `/tmp/numbered-steps/` and `/tmp/numbered-steps-sq/`. I re-rendered both videos after the last fix and read the square sheet again. The vertical sheet I last read was from before that fix, which was the clip; I checked the clip separately on frames 99 to 131 and 280.

**Checks** (on the final renders `/tmp/numberedSteps.mp4` and `/tmp/numberedStepsSquare.mp4`):

| Check | Vertical | Square |
|---|---|---|
| still-frames `windows:` | empty (4 identical frames) | empty (2 identical frames) |
| Loudness | −16.1 LUFS | −16.1 LUFS |
| loop-seam | not run: the piece isn't a loop | not run: the piece isn't a loop |

`npx tsc --noEmit -p tsconfig.json` prints nothing.

**What I'd improve with more time:**
- The 1→2 and 2→3 morphs are a straight point-by-point blend, so around frames 232–238 the 2 passes through a slightly lopsided in-between shape.
- The 3 has a small rounded knob where its diagonal meets the bowl.
- The last ~20 frames of the summary move only by a 3% push-in. That passes the dead-air check, but only just.
- All three step captions arrive with the same word rhythm (+6, +12, +18 frames); each step could have its own.
- The hook leaves the lower half of the vertical frame fairly empty.
- For about 10 frames around 606 the card shows only the 3 before the row text arrives.

Nothing failed to work.
