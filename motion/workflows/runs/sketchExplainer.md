# Build study: Sketch Explainer

- **Piece:** `sketchExplainer`
- **Launched:** 2026-09-25 15:26 UTC · **model:** claude-opus-5-5[1m]
- **Cost:** 225,599 tokens · 48 tool calls · 20.2 min
- **Source:** `6f834591-5513-4f19-a058-1af9a5cdd8f7.jsonl` (extracted by `tools/extract-runs.mjs`)

## Prompt

````markdown
Your complete instructions are in the file ~/rotli-studio/motion/series/studies/prompts/sketch-explainer.prompt.md. Read that file first and follow it exactly: it is the prompt this study is built from (other agents are building other studies in parallel in the same folder, so touch ONLY the files it allows). Iterate on the contact sheets until the piece meets the quality bar of the reference study, then report as the file asks.
````

## Report (the agent's own summary, unedited)

Study 05, Sketch Explainer, is built in both sizes and passes every check the prompt asks for: the type check, no still windows, and −16.0 LUFS on each size. Nothing is committed or registered.

**Files created (only these three):**
- `~/rotli-studio/motion/src/canvas-core/studies/sketchExplainer.ts` exports `sketchExplainer` (landscape) and `sketchExplainerVertical`.
- `~/rotli-studio/motion/src/hosts/page-sketchExplainer.ts`
- `~/rotli-studio/motion/src/hosts/page-sketchExplainerVertical.ts`

**How it's built:** it follows `motionResume.ts`: a `make(size, id)` factory, one continuous `paint(ctx, env, F)`, and six shots at the brief's cuts (0/80/200/340/460/560, all on the 20-frame beat). There is no motion blur.
- **Camera:** the whole sheet is one world drawn through a single `Gfx.push` transform. Eased camera keys move the view from the title close-up to the people, then along the week, out to the scan and in to the invite, and finally pull back to the whole sheet.
- **Drawing:** every line draws itself on in the order a hand would make it. Lettering uses the engine's single-stroke draftsman capitals (`styles/drafting`) and the lines use a custom technical-pen setting on `Gfx`, with a light bloom under the ink.
- **The answer:** the three calendars are data, and Thu 3:00 is worked out from them, not typed in. The scan line marks each lane with a ring (free) or a cross (busy) as it passes, and the accent box lands on frame 420. The box lifts into the invite card, arrows go to Ana, Ben and Kai, each gets a warm check, and the stamp lands at frame 580.
- **Vertical:** it is re-stacked, not cropped: the people stand across the top, the days run down the left, and the scan sweeps downward.
- **Sound:** `beatScore` in soft mood at 90 bpm. Ticks follow the stroke starts, there is a hit at 420, and the sign-off sounds with the stamp.

**Results:**

| Check | Landscape | Vertical |
|---|---|---|
| `still-frames` | `windows:` empty (6 identical frames) | `windows:` empty (11 identical frames) |
| Loudness | −16.0 LUFS | −16.0 LUFS |
| `npx tsc --noEmit -p tsconfig.json` | clean | clean |

loop-seam doesn't apply because this isn't a loop. A frame draws in about 30 ms.

**Final sheets:** `/tmp/sketch-explainer.png` (landscape) and `/tmp/sketch-explainer-vertical.png` (vertical). Full frames are in `/tmp/sketch-explainer/` and `/tmp/sketch-explainer-v/`; videos are `/tmp/sketchExplainer.mp4` and `/tmp/sketchExplainerVertical.mp4`.

**Where it falls short of the rules:**
- **Safe area during camera moves:** the sheet fits the safe area only when seen whole. When the camera is close in or panning, labels at the sheet's edges (day row, title, the vertical's day column) cross the safe margins as the camera travels. I kept the text each shot is about inside the safe area and faded out the "SHEET 05" line during the invite close-up. Everything is inside at the final view.
- **Arrows over the week:** in landscape, the invite arrows cross Monday's busy blocks, which are dimmed to about 34% at that point. It reads as a note laid over the drawing, but it is the one debatable "nothing overlaps unintentionally" spot.
- **Dash instead of en dash:** the draftsman lettering has no `–` or `·`, so the card reads `THU 3:00-4:00`. The middle dots appear only in the mono text.
- **Vertical answer label:** it reads `3:00` in the Thu row, and the THU day label turns warm when the box lands. There was no room for `THU 3:00` without colliding with the hour labels.
- **Not hand-drawn:** the stamp and the background grid are plain canvas drawing.

**With more time I would:**
- Show a visible pen tip riding the drawing head, to make "stroke order is the story" even more literal.
- Give the vertical a bigger pan. Its width keeps the zoom at about 1.1, so the week "pan" is mostly vertical drift.
- Route the landscape arrows around the lanes, or move the card right.
- Add a stamp-ink texture pass.
- Hunt down the identical frames. They aren't a failure, but they probably sit in the slow tail of the ease at 580–599.

Nothing failed to work.
