# Build study: Kinetic Poster

- **Piece:** `kineticPoster`
- **Launched:** 2026-09-25 18:52 UTC · **model:** claude-opus-5-5[1m]
- **Cost:** 211,302 tokens · 40 tool calls · 16.9 min
- **Source:** `6f834591-5513-4f19-a058-1af9a5cdd8f7.jsonl` (extracted by `tools/extract-runs.mjs`)

## Prompt

````markdown
Your complete instructions are in the file ~/rotli-studio/motion/series/studies/prompts/kinetic-poster.prompt.md. Read that file first and follow it exactly: it is the prompt this study is built from (other agents are building other studies in parallel in the same folder, so touch ONLY the files it allows). Iterate on the contact sheets until the piece meets the quality bar of the reference study, then report as the file asks.
````

## Report (the agent's own summary, unedited)

Kinetic Poster (study 06) is built and verified in both sizes: landscape `kineticPoster` and vertical `kineticPosterVertical`. Both pass still-frames with an empty `windows:` line, and loudness is −16.1 LUFS for each. `npx tsc --noEmit` prints nothing.

**Files created** (nothing else touched; pieces not registered, nothing committed):
- `~/rotli-studio/motion/src/canvas-core/studies/kineticPoster.ts`
- `~/rotli-studio/motion/src/hosts/page-kineticPoster.ts`
- `~/rotli-studio/motion/src/hosts/page-kineticPosterVertical.ts`

It follows the reference study's structure: a `make(size, id)` factory, one continuous `paint(ctx, env, F)`, shots that only name the sections, all colours and fonts from the pack's `signal` palette, and `beatScore` drive at 120 bpm. There are nine shots, all on the 30-frame beat grid: find, one-hour, stack, marquee, ask, match, book, line, signoff. Each colour card is its own shot so the motion blur never mixes one card's colour into the next.

**Final sheets**
- Landscape: `/tmp/kinetic-poster.png` (22 frames)
- Vertical: `/tmp/kinetic-poster-vertical.png` (20 frames)
- Videos: `/tmp/kineticPoster.mp4` and `/tmp/kineticPosterVertical.mp4`

**Checks**
| | still-frames | loudness | tsc |
|---|---|---|---|
| landscape | identical 0, `windows:` empty | −16.1 LUFS | clean |
| vertical | identical 1 (frames 0→1, before FIND enters), `windows:` empty | −16.1 LUFS | clean |

I didn't run loop-seam because this piece is a video, not a loop.

**Changes from the brief** (all within its beats):
- **Counter position (landscape):** the counter sits under the "ASK · MATCH · BOOK." line with a thin rule between them, not beside it. The line takes the full safe width, so there was no room beside it at a readable size. In vertical the words stack one per line and the counter sits below them.
- **Beat 510–540:** the brief names three cards across four beats. I used the fourth beat for a recap: the three words slam back in on the orange, in their card colours, and then fly into the line at 540.
- **Italic:** "HOUR." is in Instrument Serif Italic, sized so its capitals match Inter 800. The pack has no Inter italic.
- **Invented copy:** I added a small mono label in each corner (product, study number, section, timecode) and an italic line under each card ("ask everyone once", "match every calendar", "book the hour that fits"). The counter's label reads "back-and-forth emails" and switches to "invite, booked." at 1. The corner labels hide while the marquee runs.

**Quality-bar details**
- All type is fitted from the font's own metrics to a content box inside the safe area, shrunk by the largest push-in (5%), so the slow push-ins never carry type outside it.
- The smallest text is 22 px (the corner labels).
- Every hold has a push-in, a breathing dot or scrolling rows.

**With more time**
- The vertical colour cards leave a lot of empty orange above and below the word, because the word is limited by the frame's width. A size-specific idea, such as repeating the word down the frame, would make better use of the height.
- Near the start of the "stack" beat (around frame 200), "ONE" and "HOUR" briefly touch while shearing.
- The marquee could vary speed from row to row.
- The ticks around the counter are fast (1–3 frames apart at first), so they sound more like a buzz than separate clicks.

Nothing failed to work.
