# Build study 39 Route Map

- **Piece:** `routeMap`
- **Launched:** 2026-09-29 01:53 UTC · **model:** claude-opus-5-5[1m]
- **Cost:** 225,520 tokens · 42 tool calls · 40.5 min
- **Source:** `c74bb602-6202-4ec5-8b02-3569895eeb14.jsonl` (extracted by `tools/extract-runs.mjs`)

## Prompt

````markdown
Your full task is in ~/rotli-studio/motion/series/studies/prompts/route-map.prompt.md — read it and follow it exactly. Then read ~/rotli-studio/tmp/studies-27-50/builder-extra.md: extra rules for this build wave (other agents are building other studies in parallel). Build the study, verify it by looking, and report as both files ask.
````

## Report (the agent's own summary, unedited)

Route Map (study 39) is built for both sizes and passes every check the prompt asks for. It's rendered and ready for you to register. The main compromise is that the map can't match the brief's projection numbers exactly (see "Changes from the brief").

**Files created** (nothing else was touched, and nothing is committed):
- `~/rotli-studio/motion/src/canvas-core/studies/routeMap.ts` (exports `routeMap` and `routeMapVertical`)
- `~/rotli-studio/motion/src/hosts/page-routeMap.ts`
- `~/rotli-studio/motion/src/hosts/page-routeMapVertical.ts`

**Final sheets**
- Landscape: `/tmp/route-map-L.png`; critique sheets in `/tmp/critique-routeMap/`
- Vertical: `/tmp/route-map-V.png`; critique sheets in `/tmp/critique-routeMapVertical/`
- Renders: `/tmp/routeMap.mp4`, `/tmp/routeMapVertical.mp4`

**Checks**
| Check | Landscape | Vertical |
|---|---|---|
| still-frames `windows:` | empty | empty |
| Loudness `I:` | −15.8 LUFS | −15.8 LUFS |
| `npx tsc --noEmit` | no errors in my files | same |

- I didn't run loop-seam: the brief makes this a video, not a loop.
- tsc does report errors in `page-isotype*.ts`, which belong to another agent's unfinished study.
- The first render had dead-air windows at about frames 64–88, 556–580, 957–973 and 1060–1080. I fixed them by starting the zoom-in earlier, adding a slow push-in during the winter stay, making the end push-in run to the last frame, and spreading the end pulse and footer across the end card.

**What's in it:** the map, route and tern are built as the brief describes, including both branches drawing at once after the fork. All sound cues sit on the frames the prompt lists (hits at 330 and 840, whooshes ending at 120, 420, 600 and 810). The on-screen copy is word for word from the brief, and the footer carries the "routes simplified" label. The only text I added is geographic: sea names, "Cape Verde", the circle labels, and "7 birds" / "4 birds" tags at the two branch heads.

**Changes from the brief**
1. **Wider map sheet (104° W to 62° E).** An Atlantic in this projection is taller than it is wide, so at 2.2× zoom a 16:9 frame is wider than the brief's 85° W to 45° E. Without the extra width the edges of the map would show while the camera follows. At full zoom the camera can therefore pan only slightly sideways in landscape and follows mostly up and down.
2. **The area beyond the map is dark ink with a thin border around the map.** At zoom 1.0, landscape shows dark bands left and right, and vertical shows the map between the headline panel and the counter card.
3. **Vertical follows at 2.0× zoom, not about 1.6×.** I shrank the vertical zoom-1.0 view so the whole route, Greenland included, sits between the top panel and the bottom card. The trade-off is that at zoom 1.0 the vertical doesn't show only 70° W to 20° E, and the map doesn't fill the frame until the camera zooms in. On screen, the following view works out to roughly the brief's 70° W to 20° E crop.
4. **I didn't write `series/studies/critiques/routeMap.json`**, because hard rule 1 limits me to the module and its two pages. The scores are below.

**Self-critique** (the same for both sizes)
| Criterion | Score |
|---|---|
| Hook | 8 |
| Readability | 8 |
| Motion | 9 |
| Variety | 7 |
| Composition | 8 |
| Accuracy | 9 |
| Sync | 9 |

**Known problems**
- **Variety scores below 8, and I couldn't fix it within the style.** critique.mjs reports 0 abrupt changes per 10 s because the piece is one continuous camera move. The pin drops, month changes, fork, landing total and end pulse give it beats, but a "hard change" like a flash would go against the brief's "flat, no glow".
- In each section the headline panel opens at full size a few frames before its text rises in.
- The wind arrows are thin and quiet, as briefed, and easy to miss at phone size.
- In vertical at zoom 1.0, the edge of the "Equator" and "Antarctic Circle" labels sometimes shows beside the counter card, and the vertical footer sits over the route lines.
- A few coastlines use more points than the brief's 25–60 range: Europe about 70, Africa about 65, South America about 57.

**With more time** I'd add stronger beats at the fork and the landing total, make the wind arrows easier to see, and let the vertical map fill the frame at zoom 1.0.
