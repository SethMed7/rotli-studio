# Build study 32 Liquid Blobs

- **Piece:** `liquidBlobsVertical`
- **Launched:** 2026-09-29 01:33 UTC · **model:** claude-opus-5-5[1m]
- **Cost:** 204,208 tokens · 39 tool calls · 24.9 min
- **Source:** `c74bb602-6202-4ec5-8b02-3569895eeb14.jsonl` (extracted by `tools/extract-runs.mjs`)

## Prompt

````markdown
Your full task is in ~/rotli-studio/motion/series/studies/prompts/liquid-blobs.prompt.md — read it and follow it exactly. Then read ~/rotli-studio/tmp/studies-27-50/builder-extra.md: extra rules for this build wave (other agents are building other studies in parallel). Build the study, verify it by looking, and report as both files ask.
````

## Report (the agent's own summary, unedited)

I built Liquid Blobs (study 32) in both sizes. Both renders pass the dead-air check and sit at −15.9 LUFS, and the typecheck is clean on my files.

**Files created (nothing else touched)**
- `~/rotli-studio/motion/src/canvas-core/studies/liquidBlobs.ts`
- `~/rotli-studio/motion/src/hosts/page-liquidBlobs.ts`
- `~/rotli-studio/motion/src/hosts/page-liquidBlobsVertical.ts`

The goo is built the way the brief says:
- **The surface:** one implicit field (r²/d² balls plus rounded-rectangle fields for the card and tags), sampled every 10 px. It is traced with marching squares (saddle cells resolved) and filled in one path.
- **Gloss and meniscus:** a flat gloss at f = 1.8, offset up-left and clipped to the fill, and a faint 2 px meniscus at f = 0.85.
- **Motion:** every position is a closed-form function of the frame.
- **Liquid tells:** necks before each merge, wobbles after, and pinch-offs that leave small droplets behind.
- **The card:** the field blends into a rounded-rectangle field over one beat (390–405), then drains down into four buds.
- **Timing and sound:** shots are cut at 0/90/210/390/510/630, all on the 15-frame beat. The score is soft pad and pluck, with every sound cue on the frames the brief lists. Paint takes about 3 ms per frame and a full render about 30 s.

**Sheets**
- Vertical: `/tmp/liquid-blobs-vertical-sheet.png` (critique sheets in `/tmp/critique-liquidBlobsVertical/`)
- Landscape: `/tmp/liquid-blobs-landscape-sheet.png` (critique sheets in `/tmp/critique-liquidBlobs/`)

**Checks**

| | still-frames | loudness | loop-seam |
|---|---|---|---|
| vertical | `windows:` (empty) | I: −15.9 LUFS | not run (not a loop) |
| landscape | `windows:` (empty) | I: −15.9 LUFS | not run (not a loop) |

**Self-critique scores** (hook, readability, motion, variety, composition, accuracy, sync)
- **Vertical:** 7, 8, 8, 8, 8, 9, 9.
- **Landscape:** 7, 7, 8, 8, 8, 9, 9.

On the scores:
- **Pace number:** the critique tool reports 0.8 changes per 10 s and about 50% near-still. That is by design: the piece is one continuous morph with no cuts. By eye something new arrives every 2–3 s: splash, tags, headline swaps, three merges, card, drain, flights, tags, wipe, lockup.
- **Hook (7):** frame 0 is mostly empty pink with only the bottom of the falling drop showing, and the headline arrives at 1.2 s.
- **Landscape readability (7):** the 26 px tags are small on a 16:9 frame seen at phone width.

I did not write the critique record file, since my rules limit me to the module and the two hosts. Nothing was registered or committed.

**Problems that remain**
- **Wipe colour:** when the wipe covers the frame (frames 660–665) it reads mostly as the lighter gloss violet with a deep band, not solid deep. The gloss contour of such a huge ball covers most of the frame. Fixing it means leaving the wipe ball out of the gloss pass.
- **Pinch droplets:** the tiny droplets left at each neck (r ≈ 10 px) show up as light dots, because the gloss covers most of something that small.
- **Tag morph:** as each droplet turns into a tag it passes through a pointed lemon shape for a few frames (around 596–604).
- **Long necks:** blobs start necking before the merge snaps (about 30 frames for Ana and Kai, and longer for the two pairs from about 274 to 337). It reads as liquid, but the merges could be snappier.
- **Brief merge in the drain:** at the end the lockup blob briefly overlaps the wordmark while the liquid drains past (under 10 frames).

**What I'd improve with more time**
- A stronger first second: start the drop already in frame and bring the headline in sooner.
- Leave the wipe ball out of the gloss so the cover reads deep.
- Larger tags and a lower blob row in landscape.
- A small free-window bar on each person's tag.
- Motion blur on the fast splash and flights.
