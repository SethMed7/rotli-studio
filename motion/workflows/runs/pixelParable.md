# Build study: Pixel Parable

- **Piece:** `pixelParable`
- **Launched:** 2026-09-25 19:58 UTC · **model:** claude-opus-5-5[1m]
- **Cost:** 199,744 tokens · 37 tool calls · 16.9 min
- **Source:** `6f834591-5513-4f19-a058-1af9a5cdd8f7.jsonl` (extracted by `tools/extract-runs.mjs`)

## Prompt

````markdown
Your complete instructions are in the file ~/rotli-studio/motion/series/studies/prompts/pixel-parable.prompt.md. Read that file first and follow it exactly: it is the prompt this study is built from (other agents are building other studies in parallel in the same folder, so touch ONLY the files it allows, and keep full renders to the ones the prompt requires). Iterate on the contact sheets until the piece meets the quality bar of the reference study, then report as the file asks.
````

## Report (the agent's own summary, unedited)

"Pixel Parable" (study 11) is built in both sizes, and every check the prompt asks for passes on the final code. Nothing is committed or registered.

**Files created** (the only ones I touched):
- `~/rotli-studio/motion/src/canvas-core/studies/pixelParable.ts`, exporting `pixelParable` (vertical, the primary size) and `pixelParableLandscape`
- `~/rotli-studio/motion/src/hosts/page-pixelParable.ts`
- `~/rotli-studio/motion/src/hosts/page-pixelParableLandscape.ts`

It is built the same way as `motionResume`: a `make(size, id)` factory, one `paint(F)` for the whole film, and shots that only name the six sections. The six cuts (0, 75, 210, 345, 480, 630) all fall on the 15-frame beat grid. Colours come only from the "arcade" palette, plus flat tints mixed from it; fonts come from the pack. Nothing is imported from Rotli and there is no quokka. Every scene pixel is a whole 6 px cell, and only the cards, the no-shows chip and the captions are drawn smooth on top.

**What happens, beat by beat:**
- **Hook (0–75):** the manager stands beside three desks with a speech bubble showing calendar = star. The caption reads "We rewarded meetings booked."
- **Booking (75–210):** 48 calendar icons pop out of the monitors and swarm the sky, faster and faster. A crisp card counts 12 → 240 and fills a bonus bar ("BONUS UNLOCKED").
- **No-shows (210–345):** the icons settle into a tower that wobbles most at the top. 36 of them flip teal → magenta one at a time, with a "no-shows" count chip. Faces turn to frowns.
- **Serpent (345–480):** the ground strip is laid out as the working day, hour tiles 9…5 on a dotted track. A magenta serpent winds across and back along it, eating each hour and growing.
- **Fix (480–630):** a card shows "meetings held" and "decisions made" with rising sparklines. The icons flip back to teal and the hour tiles come back.
- **Sign-off (630–750):** the tower pops into sparks, the desks sink into the floor, and the team hops out to high-five on the beat. An "Oriel" marquee sign rises and the last caption is "measure the outcome, not the count".
- **Vertical vs landscape:** the vertical stacks captions and cards at the top, the scene in the middle and the path lower down. The landscape spreads the office out, with captions and cards top left and the chip to the right of the tower.

**Checks:**

| Check | Vertical | Landscape |
|---|---|---|
| still-frames `windows:` | empty | empty |
| identical frames | 32 | 30 |
| loudness | −16.1 LUFS | −16.1 LUFS |

- **Loudness:** both films use the same sound setup, so the two readings are really one result. I set the score's gain to 0.72; before that it measured −15.1.
- **Loop seam:** doesn't apply, because this piece isn't a loop.
- **Type check:** `npx tsc --noEmit -p tsconfig.json` prints nothing.

**Final contact sheets** (12 frames each, from frame 20 to 745):
- `/tmp/pixel-parable.png` (vertical)
- `/tmp/pixel-parable-landscape.png` (landscape)

Full-size frames are in `/tmp/pixel-parable/` and `/tmp/pixel-parable-l/`, and the videos are `/tmp/pixelParable.mp4` and `/tmp/pixelParableLandscape.mp4`.

**What I would improve with more time:**
- **Counter:** the number jumps about 5 at each icon pop instead of rolling between values.
- **Hook:** this is the quietest beat, moving only through the bubble, head bobs on the beat, blinks and monitor flicker.
- **Landscape:** the captions could sit closer to the manager, to match "beside the action". The characters are small in that frame, and the right third is mostly skyline.
- **Vertical:** the dark floor under the path (about y 1600–1920, inside the bottom safe area) is empty.
- **Sign-off:** the raised arms in the cheer read as a crowd more than as clearly separate people.
- **Sound:** the kit's pluck is sine-based, so the music only leans 8-bit. I set the key up 3 semitones for brightness and didn't change the kit, as the rules require.

Nothing failed to work.
