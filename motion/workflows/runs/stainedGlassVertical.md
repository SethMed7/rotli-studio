# Build study 48 Stained Glass

- **Piece:** `stainedGlassVertical`
- **Launched:** 2026-09-29 01:12 UTC · **model:** claude-opus-5-5[1m]
- **Cost:** 286,832 tokens · 66 tool calls · 67.4 min
- **Source:** `c74bb602-6202-4ec5-8b02-3569895eeb14.jsonl` (extracted by `tools/extract-runs.mjs`)

## Prompt

````markdown
Your full task is in ~/rotli-studio/motion/series/studies/prompts/stained-glass.prompt.md — read it and follow it exactly. Then read ~/rotli-studio/tmp/studies-27-50/builder-extra.md: extra rules for this build wave (other agents are building other studies in parallel). Build the study, verify it by looking, and report as both files ask.
````

## Report (the agent's own summary, unedited)

I built the Stained Glass study (study 48) in both sizes. Both renders pass the dead-air check and land at −15.9 LUFS, and the typecheck is clean for my files. Nothing is registered, committed or golden-recorded.

**Files created** (the only files I touched)
- `~/rotli-studio/motion/src/canvas-core/studies/stainedGlass.ts`: exports `stainedGlassVertical` and `stainedGlass` from one `make(size, id)` factory.
- `~/rotli-studio/motion/src/hosts/page-stainedGlassVertical.ts`
- `~/rotli-studio/motion/src/hosts/page-stainedGlass.ts`

**Final sheets**
- Vertical: `/tmp/stained-glass-v.png` (frames in `/tmp/stained-glass-v/`), critique sheets in `/tmp/critique-stainedGlassVertical/`
- Landscape: `/tmp/stained-glass-l.png` (frames in `/tmp/stained-glass-l/`), critique sheets in `/tmp/critique-stainedGlass/`
- Videos: `/tmp/stainedGlassVertical.mp4`, `/tmp/stainedGlass.mp4`

**Checks**
| | still-frames | loudness | typecheck |
|---|---|---|---|
| vertical | `windows:` (empty), identical 0 | I: −15.9 LUFS | nothing for stainedGlass |
| landscape | `windows:` (empty), identical 0 | I: −15.9 LUFS | nothing for stainedGlass |

There is no loop-seam result because the piece is not a loop.

**What I added beyond the brief**
The first renders failed the dead-air check badly, especially in landscape, where the window fills only about 14% of the check's thumbnail. To fix that I added motion that stays in the style:
- **First light:** at the start the sky in the empty opening pales from the bottom up.
- **Dawn floor patch:** the empty window throws a pale patch on the floor from frame 0, and the panes show up in it as they fill.
- **Moving patches:** the floor patches creep from frame 0. In landscape they also slide right through the day.
- **Light sweeps:** one band of light passes down the window in each section. It brightens the glass and catches the lead: warm at dawn, gold by day, cool moonlight at night.
- **Punches:** the roundel's sun flares at frame 400 (noon), and the fire panel catches at 500 and flickers as the others go dark. These answer the extra rule that every calm stretch needs a punch.
- **Time chip:** it pops in at frame 4 and shows a running invented clock with a small sun dial.

**Sizes and readability**
- **Vertical:** the lancet is centred in the upper part and the four names sit on one row under the sill. The floor patches fall toward the viewer, and the title sits on the floor at the end.
- **Landscape:** the lancet stands left of centre at full safe height. The patches are thrown right along a floor band, and the names form a 2×2 grid in the right half laid out like the panels. The title also sits in the right half.
- **Type sizes:** the time-of-day word is 40 px, the sill names are 52 px in vertical and 60 px in landscape, the title is 112–124 px and the subtitle 44–48 px. The brief left the chip size open, so I made it larger under the new 44 px rule.

**Sound**
`beatScore` in soft mode at 90 bpm uses exactly the brief's cues. My only change was the gain, set to 0.66 to bring loudness down from −14.2 to about −16. The noon and dusk flares have no sound of their own.

**Self-critique scores**
| hook | readability | motion | variety | composition | accuracy | sync |
|---|---|---|---|---|---|---|
| 7 | 8 | 8 | 7 | 8 | 10 | 8 |

**Known problems**
- **Hook (7):** the first 1.5 s is a dark window lighting up while the lead starts to draw. It reads, but it is quiet rather than bold.
- **Variety (7):** the pace tool counts 0 abrupt changes per 10 s, because the whole piece glides. The punches are the flood fronts, the sun striking at 280, the two flares and the chip word rolling over.
- **Landscape floor:** the band is only about 190 px tall, so the thrown patches are thin and the right half is quite empty until the title arrives.
- **Moon patch:** at night the air panel's patch on the floor is a small, blocky rectangle.
- **Night glare:** the moonlit sweep on the lead makes the lower border read almost white near the end. That fits "the lead lines read as a drawing" but is a little glary.
- **No critique file:** I did not write `series/studies/critiques/*.json`, because the rules limit me to the module and its two hosts. The scores are only in this report.

With more time I would make the patches softer (a real two-step blur), give the landscape floor more height and more patch presence, and make the opening beat stronger.
