# Build study 28 Proof Without Words

- **Piece:** `proofWithoutWords`
- **Launched:** 2026-09-29 01:12 UTC · **model:** claude-opus-5-5[1m]
- **Cost:** 223,211 tokens · 51 tool calls · 33.8 min
- **Source:** `c74bb602-6202-4ec5-8b02-3569895eeb14.jsonl` (extracted by `tools/extract-runs.mjs`)

## Prompt

````markdown
Your full task is in ~/rotli-studio/motion/series/studies/prompts/proof-without-words.prompt.md — read it and follow it exactly. Then read ~/rotli-studio/tmp/studies-27-50/builder-extra.md: extra rules for this build wave (other agents are building other studies in parallel). Build the study, verify it by looking, and report as both files ask.
````

## Report (the agent's own summary, unedited)

I built Proof Without Words (study 28) in both sizes, and it passes every gate. Neither size shows dead air, both come out at −16.0 LUFS, and my own file typechecks clean. Nothing is committed, registered or golden-recorded.

**Files created**
- `~/rotli-studio/motion/src/canvas-core/studies/proofWithoutWords.ts` exports `proofWithoutWords` (landscape, the primary size) and `proofWithoutWordsVertical`.
- `~/rotli-studio/motion/src/hosts/page-proofWithoutWords.ts`
- `~/rotli-studio/motion/src/hosts/page-proofWithoutWordsVertical.ts`

**Final sheets**
- Landscape: `/tmp/proof-without-words.png` (frames in `/tmp/proof-without-words/`)
- Vertical: `/tmp/proof-without-words-vertical.png` (frames in `/tmp/proof-without-words-vertical/`)
- Critique sheets: `/tmp/proof-without-words-critique-proofWithoutWords/` and `/tmp/proof-without-words-critique-proofWithoutWordsVertical/`
- Renders: `/tmp/proofWithoutWords.mp4` and `/tmp/proofWithoutWordsVertical.mp4`

**Checks**

| Check | Landscape | Vertical |
|---|---|---|
| still-frames `windows:` line | empty | empty |
| Loudness `I:` | −16.0 LUFS | −16.0 LUFS |
| loop-seam | not a loop, so not run | not a loop, so not run |

- **Typecheck:** `npx tsc` reports nothing for my file. The only errors come from another agent's `broadcastPackage.ts`.
- **Lint and format:** oxlint exited 0 on my file, and I ran oxfmt on my three files.
- **Critique pacing:** 0 changes per 10 s and about 78% near-still. That is the style: the film glides from one S-curve to the next and never cuts or slams.

**Sound cues** all sit on the brief's frames:
- whooshes ending at 840 and 1320
- hits at 1320 and 1640
- sign-off at 1760
- a tick per equation term as it lands
- a tick per triangle landing at 640, 680, 720 and 760
- a tick on every third unit cell

**Self-critique scores (both sizes)**

| hook | readability | motion | variety | composition | accuracy | sync |
|---|---|---|---|---|---|---|
| 7 | 8 | 8 | 7 | 8 | 9 | 8 |

Hook and variety stay below 8. The opening is a quiet triangle writing itself on, and the film has no punches by design. I added more "point at it" flashes to fill the holds, but did not add cuts, because they would break the brief's look.

**Places I departed from the brief on purpose**
- **Triangle fill:** the triangles are filled with ink at 20%, not 45%. The triangle is not a quantity, and the lighter fill lets the coloured holes stand out. Its legs keep their blue and pink and its hypotenuse keeps its yellow everywhere, so every hole's edges come out in the right colour.
- **Rearrangement:** the triangles only slide; they do not rotate. They already face the right way, so sliding is the cleaner proof. The first beat moves two triangles and the second moves one, because one triangle never has to move.
- **Landscape comparison line:** it sits in the gap between the squares as two lines, "same square" / "same four triangles", without the "·". The vertical keeps the exact one-line wording.
- **Extra flashes and timing changes to keep every hold moving:**
  - the whole triangle flashes at frame 188
  - each square flashes as its label lifts off, and all three flash with the "?"
  - both squares flash once for "same square" and their triangles once for "same four triangles"
  - all three holes flash gently on the frame-1320 hit
  - the squares grow as outlines and then fill
  - the two squares close in slightly after the comparison line fades

**Known problems I left**
- For a moment in the numbers check, the flying 9, 16 and 25 overlap their own counters as they peel off.
- The flashes briefly make shapes bigger, so they touch nearby braces or outlines for a few frames.
- Landscape prose is 30 px: fine on a desktop, small in a phone feed.
- The copies' flights and 180° turns leave a visible three-sample blur trail.
- The vertical's setup and rearrangement leave the lower safe area fairly empty.

**What I'd improve with more time**
- Make the numbers transform tidier.
- Draw the right-angle mark on every triangle.
- Let the end equation's terms fly out of the side labels instead of writing in place.
- Make the landscape figures a little bigger.
