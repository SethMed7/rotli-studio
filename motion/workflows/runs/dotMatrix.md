# Build study: Dot Matrix

- **Piece:** `dotMatrix`
- **Launched:** 2026-09-25 20:12 UTC · **model:** claude-opus-5-5[1m]
- **Cost:** 194,940 tokens · 36 tool calls · 17.7 min
- **Source:** `6f834591-5513-4f19-a058-1af9a5cdd8f7.jsonl` (extracted by `tools/extract-runs.mjs`)

## Prompt

````markdown
Your complete instructions are in the file ~/rotli-studio/motion/series/studies/prompts/dot-matrix.prompt.md. Read that file first and follow it exactly: it is the prompt this study is built from (other agents are building other studies in parallel in the same folder, so touch ONLY the files it allows, and keep full renders to the ones the prompt requires). Iterate on the contact sheets until the piece meets the quality bar of the reference study, then report as the file asks.
````

## Report (the agent's own summary, unedited)

Study 17 "Dot Matrix" is built in both sizes (square and vertical) and passes every check the prompt asks for. I stopped iterating when the contact sheets met the reference study's bar. Nothing was committed and nothing was registered.

**Checks**

| Check | Square (`dotMatrix`) | Vertical (`dotMatrixVertical`) |
|---|---|---|
| `tsc --noEmit` | prints nothing | prints nothing |
| still-frames | `identical: 0`, `windows:` empty | `identical: 6`, `windows:` empty |
| Loudness | −16.0 LUFS | −16.0 LUFS |
| loop-seam | skipped: the piece is not a loop | skipped: the piece is not a loop |

The 6 identical frames in the vertical are three pairs between frames 221 and 239, during the pulse hold. That is well under the 15-frame dead-air window. The first renders did have dead air, at frames 98–119 (square) and 96–119 (vertical). I fixed that by starting the day fills sooner and making the vertical camera push steeper through the month.

**How it works:** the dots never move; they only grow, shrink and change colour. Every shape (the lettering, the month, the clock, the ring) is a mask over the same fixed grid, so the "one primitive" lesson is literal. Every cut sits on the 15-frame beat.

**Changes from the brief you may want to accept or veto:**
- **Two-line lettering in the vertical:** neither WEEK nor ORIEL splits well, so I added a word to each: `YOUR / WEEK` for the hook and `ORIEL / +1 HR` for the sign-off. "+1 HR" is invented copy for the fictional product. The square keeps the single words.
- **Two extra captions:** "every week *fills up*" in the month beat and "and time comes *back*" in the clock beat, on top of the brief's "take back the *week*" and "one hour, *found*".
- **A minute hand:** there is one as well as the hour hand, turning three times while the hour hand sweeps from 12 to 3.
- **Extra sound:**
  - Three whooshes and a few extra ticks for the focus blocks and the ring finishing.
  - The day ticks fall only on the beat, 8 in total.
  - The hit is at frame 435, when the clock stops.
  - The sign-off chime starts at frame 540, so the last 2 s are chime only.
- **Key words in blue, not amber:** amber is too faint on this ground to read as italic text.

**What I'd improve with more time:**
- Frame 0 already shows the wave starting in a corner. I traded a moment of plain faint grid for having no dead air at the start.
- The ORIEL-to-ring change is a crossfade on the grid, and frame 550 is fairly bare (grey ring, caption not yet in). An ordering that visibly passes the letters into the ring would sell "settle" better.
- A slightly stronger breathing motion around frames 210–246 in the vertical would remove the identical frames.
- The month-to-clock hand-off (swirl) and the clock-to-ORIEL hand-off are brief and busy in single frames, though they read fine in motion.
- The vertical leaves some unused height below the month and the clock.

There was nothing I couldn't get working.

Files are in ~/rotli-studio/motion/src/:
- canvas-core/studies/dotMatrix.ts
- hosts/page-dotMatrix.ts
- hosts/page-dotMatrixVertical.ts

Outputs are in /tmp:
- dot-matrix.png (square sheet)
- dot-matrix-vertical.png (vertical sheet)
- dot-matrix/ (square full frames)
- dot-matrix-v/ (vertical full frames)
- dotMatrix.mp4
- dotMatrixVertical.mp4
