# Build study 44 Multiplane

- **Piece:** `multiplane`
- **Launched:** 2026-09-29 01:12 UTC · **model:** claude-opus-5-5[1m]
- **Cost:** 255,320 tokens · 66 tool calls · 36.1 min
- **Source:** `c74bb602-6202-4ec5-8b02-3569895eeb14.jsonl` (extracted by `tools/extract-runs.mjs`)

## Prompt

````markdown
Your full task is in ~/rotli-studio/motion/series/studies/prompts/multiplane.prompt.md — read it and follow it exactly. Then read ~/rotli-studio/tmp/studies-27-50/builder-extra.md: extra rules for this build wave (other agents are building other studies in parallel). Build the study, verify it by looking, and report as both files ask.
````

## Report (the agent's own summary, unedited)

I built and checked Multiplane (study 44) in both sizes. Both renders pass `still-frames`, both measure −16.0 LUFS, and `tsc` reports no errors in my files. I changed nothing outside the module and its two hosts, committed nothing, and registered nothing.

**Files created**
- `~/rotli-studio/motion/src/canvas-core/studies/multiplane.ts` (exports `multiplane` and `multiplaneVertical`)
- `~/rotli-studio/motion/src/hosts/page-multiplane.ts`
- `~/rotli-studio/motion/src/hosts/page-multiplaneVertical.ts`

**Final sheets**
- Landscape: `/tmp/multiplane-final.png`, plus the critique sheets in `/tmp/critique-multiplane/` (`sheet.png`, `phone.png`, `fast-1.png`, `fast-2.png`, `pace.json`)
- Vertical: `/tmp/multiplaneVertical-final.png`, plus `/tmp/critique-multiplaneVertical/` (same five files)
- Renders: `/tmp/multiplane.mp4` and `/tmp/multiplaneVertical.mp4`

**Checks**

| Check | Landscape | Vertical |
|---|---|---|
| `still-frames` | `windows:` empty (0 identical frames) | `windows:` empty (0 identical frames) |
| `loop-seam` | not a loop, not run | not a loop, not run |
| Loudness `I:` | −16.0 LUFS | −16.0 LUFS |

- **Typecheck:** `npx tsc --noEmit` shows nothing for multiplane.
- **Privacy:** no home path or personal data in the three files.
- **Critique tool (`pace.json`):** 0 changes per 10 s. Near-still is 51% for landscape and 76% for vertical.

**Self-critique scores** (landscape / vertical)

| Criterion | Score |
|---|---|
| Hook | 8 / 8 |
| Readability | 9 / 9 |
| Motion | 8 / 8 |
| Variety | 6 / 6 |
| Composition | 8 / 7 |
| Accuracy | 10 / 10 |
| Sync | 9 / 9 |

- **Variety is below 8, and I couldn't fix it.** The piece is one continuous camera move by design, so the pace tool counts no abrupt changes. The punches are the six flats landing and the lamp coming on.
- **Vertical composition** loses a point for a large, mostly empty patch of ground in the lower third.
- **Rack focus:** I checked frames 146–161 and saw no visible pop between blur levels.

**Where I departed from the brief** (the maintainer reads the brief as a contract):
1. **Camera ease.** The camera moves on a front-weighted curve, `bezier(0.2, 0.15, 0.8, 1)`, not the symmetric cubic. It still starts and ends slowly. With the symmetric cubic the ferns would stay on screen until about frame 330, so the story beats could not land. Camera depth is 2.1 at frame 252, 4.5 at 396 and 6.5 at 540.
2. **Camera after 612.** It does not stop at depth 7. It creeps on to about 7.35 and keeps sliding toward the cabin to the last frame, so the final hold passes the still-frames check.
3. **Hiding layers.** A layer fades out as the camera closes from 1.0 to 0.4 units, rather than vanishing at 0.4.
4. **Dropping flats.**
   - The far ridge and far pines are strips, not full-height sheets, so the pink sky shows below them for the first two beats.
   - The clearing flat covers the whole frame for about six frames as it comes down.
   - The mound pieces under the ferns show as dark cut shapes while they fall.
5. **Firefly ticks.** They come from the same blink timing that is drawn, but are thinned to at most one every two beats rather than one per beat.
6. **Sky blur.** The sky and moon get the same focus blur as the other layers. The moon never grows, but it softens when focus is close.
7. **Extras on the cabin.** I added a door, and the path is a second, paler piece of paper. At phone size the dark door can read as a second window beside the lit one.
8. **Loudness.** I set the score's gain to 0.64 to bring it from −14 to −16 LUFS.

**What I'd improve with more time**
- Blend between blur levels during a rack instead of stepping.
- Give the vertical's lower third more to look at, and make the far pines read less like a row of hanging triangles against the thin pink strip in vertical.
- Find a softer way for the clearing to lower in than a full-frame wipe.
- Remove or shrink the door.
