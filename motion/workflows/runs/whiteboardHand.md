# Build study 27 Whiteboard Hand

- **Piece:** `whiteboardHand`
- **Launched:** 2026-09-29 01:12 UTC · **model:** claude-opus-5-5[1m]
- **Cost:** 252,738 tokens · 59 tool calls · 44.8 min
- **Source:** `c74bb602-6202-4ec5-8b02-3569895eeb14.jsonl` (extracted by `tools/extract-runs.mjs`)

## Prompt

````markdown
Your full task is in ~/rotli-studio/motion/series/studies/prompts/whiteboard-hand.prompt.md — read it and follow it exactly. Then read ~/rotli-studio/tmp/studies-27-50/builder-extra.md: extra rules for this build wave (other agents are building other studies in parallel). Build the study, verify it by looking, and report as both files ask.
````

## Report (the agent's own summary, unedited)

Whiteboard Hand (study 27) is built in both sizes and passes every check the two files ask for. I did not commit it, register it or record goldens. I did not touch the kit, the pack, ~/rotli or any other study.

**Files I created**
- `~/rotli-studio/motion/src/canvas-core/studies/whiteboardHand.ts` (exports `whiteboardHand` and `whiteboardHandVertical`)
- `~/rotli-studio/motion/src/hosts/page-whiteboardHand.ts`
- `~/rotli-studio/motion/src/hosts/page-whiteboardHandVertical.ts`

**Final sheets**
- Landscape: `/tmp/whiteboard-hand.png` and `/tmp/critique-whiteboardHand/` (sheet, phone, fast-1, fast-2, pace.json)
- Vertical: `/tmp/whiteboard-hand-vertical.png` and `/tmp/critique-whiteboardHandVertical/`
- Renders: `/tmp/whiteboardHand.mp4` and `/tmp/whiteboardHandVertical.mp4`

**Checks**

| Check | Landscape | Vertical |
|---|---|---|
| still-frames `windows:` line | empty | empty |
| identical frames | 1 | 3 |
| loudness | I: −16.0 LUFS | I: −16.0 LUFS |
| `npx tsc --noEmit` on my files | no errors | no errors |

- **Loop seam:** not run, because this piece isn't a loop.
- **Lint:** oxlint printed nothing on my three files, but I didn't see an explicit "0 warnings" line.
- **Beat grid:** all shots start on the 20-frame beat (0, 120, 300, 440, 580, 740, 900).
- **Sound cues:** they are placed as the brief asks:
  - whooshes end on 140, 760 and 920;
  - hits land on 680 ("about 42°" finishes writing) and 860 (the bow finishes);
  - the sign-off is at 960;
  - marker squeaks tick every 4 frames on strokes longer than 10 frames, plus a click when the marker is capped.

**Where I departed from the brief (please review)**
1. **Colour spread inside the drop is exaggerated.** With true refractive indices the seven lines would sit well under 10 px apart and read as one line. I traced the paths with a wider spread but kept each colour's exit angle true (red about 42°, violet about 40°, measured on the sun side). To stay honest I added a small mono note, "colour spread exaggerated": beside the drop in vertical, bottom-centre in landscape. It is extra text on the board, but it describes the drawing, not the world.
2. **The bow in the big picture is not centred on the "point opposite the sun" cross.** I relied on the brief's line that the cross only marks the direction. Each drop sits where its line from the eye first meets its band (red on the outer band, violet on the inner). Violet's line is lower, but its drop is further along, so the violet drop sits higher on screen than the red one.
3. **The vertical big picture can't follow the sizes note.** With true angles, the lines from the eye rise at 42° minus the sun's height. A sun at the top left means the sun is high, and above 42° there is no rainbow at all. So in both sizes the sun sits about 26° up, beside and above the viewer. In vertical the bow sits in the middle and its right leg runs off the frame. The dashed line still leaves the frame with an arrow and its label, but it leaves at the lower right.
4. **Smaller changes:**
   - I added a raincloud to the big picture so the rain has a source.
   - The ghost marks use the muted colour at 18% instead of the line colour at 40%, because the specified values were invisible.
   - The eraser uses the pack's muted and line colours.
5. **Type is bigger than the brief's sizes**, following the new readability rule in builder-extra.md:

   | Line | Landscape | Vertical |
   |---|---|---|
   | Step captions | 48 px | 44 px |
   | "sunlight" label | 44 px | 44 px |
   | "about 42°" | 52 px | 48 px |
   | Headlines | 52–80 px | 44–78 px |
   | Secondary labels ("white light", "violet about 40°", "point opposite the sun") | 28–32 px | 28–32 px |
   | Mono notes | 24–26 px | 24–26 px |

**Self-critique (both sizes, 1–10)**

| Hook | Readability | Motion | Variety | Composition | Accuracy | Sync |
|---|---|---|---|---|---|---|
| 7 | 8 | 8 | 7 | 8 | 9 | 9 |

**Problems that remain**
- **Variety (7):** the pace tool reports 0 changes per 10 s and a 34 s "longest calm", because the piece is one continuously drawn board and the tool doesn't count the eraser sweeps as changes. The real change points are the three wipes, the star flash, the two hits and a new drawing every 2–4 s. Raising the number would mean cutting, which breaks the brief's continuous board.
- **Hook (7):** the first 1.5 s shows only the hand swooping in and drawing the sun. The title isn't written until about 3.5 s, because the brief orders it last. A bolder opening would need that order changed.
- **The hand covers the drop:** in vertical, the arm and sleeve cover much of the drop while captions 3 and 4 are being written. Captions themselves are never covered while being read.
- **Tight timing:**
  - The big-picture caption "Red outside, violet inside." is readable for only about 1.3 s before the wipe reaches it. The wipe runs bottom to top so captions go last.
  - The recap ends drawing at about frame 995, leaving roughly 25 frames of final hold.
- **Readability:** the weakest text is the 24 px mono "colour spread exaggerated" note.

With more time I'd give the hand a translucent or shorter sleeve in vertical, hatch-shade the drop, and write the big-picture captions earlier.
