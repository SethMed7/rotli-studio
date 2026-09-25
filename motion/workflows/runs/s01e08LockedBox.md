# Build S01E08 The Locked Box

- **Piece:** `s01e08LockedBox`
- **Launched:** 2026-09-24 17:20 UTC · **model:** claude-opus-5-5[1m]
- **Cost:** 228,781 tokens · 50 tool calls · 13.3 min
- **Source:** `6f834591-5513-4f19-a058-1af9a5cdd8f7.jsonl` (extracted by `tools/extract-runs.mjs`)

## Prompt

````markdown
Your complete instructions are in ~/rotli-studio/motion/workflows/prompts/s01e08.prompt.md. Read that file first and follow it exactly: it is the contract, generated from the episode brief. Do not edit shared files. When done, report exactly what it asks for.
````

## Report (the agent's own summary, unedited)

Episode s01e08 "The Locked Box" is built and every required check passes: the type check prints nothing for s01e08, and still-frames prints an empty `windows:` line with `identical: 0`.

**Files created:**
- `~/rotli-studio/motion/src/canvas-core/s01e08LockedBox.ts` (the episode, its derive spec, and its helpers all defined locally)
- `~/rotli-studio/motion/src/hosts/page-s01e08LockedBox.ts` (the scaffold's host, not changed)
- From `derive-modules`: `src/canvas-core/s01e08Vertical.ts`, `s01e08Carousel.ts`, `s01e08Single.ts`, plus their three page hosts
- `add-story` registered `s01e08LockedBox` and its 3 derivatives in `pieces.json`. No other shared file was edited.

**The episode:** scene lengths are as briefed (240/120/420/330/330/240/120 = 1800), in the midnight-rain atmosphere and line style.
- **Cold open:** we look in through the quokka's window in the rain. The quokka holds the Passport note and thinks "lock". It only intends here; the note is marked secure at the turn.
- **Secure:** the Passport note locks and a `wiki/_secure/` chip appears. Three clouds knock at the door, get a red burst and ✕, go dizzy and float off. The on-device chip reads the note and gets a ✓.
- **Shapes:** ⌘V pastes the fake key `sk-test-XXXXXXXXXXXX` into a "Ferry booking" note. Rotli catches it with no click: the key is highlighted, lock icons appear on the heading and in the sidebar, and the `wiki/_secure/` chip shows. A cloud bounces off the window edge and the chip still reads.
- **Lock:** the Trip ideas note (the token) is locked with a Lock toggle. The chip and a cloud both read it (✓), and both of their pencil edits are refused (✕).
- **Payoff:** back at the window, the quokka rests with Passport and Trip ideas. The card reads "Warm inside. / The weather stays outside."
- **End:** the end card, with "Next: Other Shores".

The story scenes are shot from outside the house on purpose. The atmosphere's rain is drawn over the whole frame, so from outside it falls on the glass, not inside the room. In the two app demos the rain also crosses the app window; I checked that the text is still readable.

**Sheets:**
- `/tmp/s01e08.png`: the landscape sheet (frames 40, 200, 300 chapter, 400, 600, 800, 1000, 1200, 1400, 1600, 1760)
- `/tmp/s01e08v.png`: vertical, 4 beats of 180+240+210+240 = 870 frames
- `/tmp/s01e08k.png`: carousel, frames 14–89
- `/tmp/s01e08s.png`: single
- `/tmp/s01e08.mp4`: the render

**Claims:** the four lower thirds use the brief's wording, verbatim or shortened.
- Claim 1 is split over two lines and drops "the Librarian leaves it alone", so no Librarian appears.
- Claims 2, 3 and 4 are word-for-word, split over two lines.
- The derivative titles are shortenings too: "Mark a note secure.", "Common secret shapes.", "Lock it."
- The on-screen labels are only "on-device model", "remote model", "Booking key:", `wiki/_secure/` and "Lock".
- The Lock toggle and the lock/no-edit sidebar icons follow the earlier ep07Secure piece; they may not match Rotli's exact UI.

Nothing failed to work. Two things are limited by shared code I couldn't edit:
- Midnight's accent colour (a dark slate) makes the Trip ideas card's folded corner and the lower-third accent bar dim on the dark ground.
- The vertical cut's end card shows the filled quokka rather than the line-art one.
