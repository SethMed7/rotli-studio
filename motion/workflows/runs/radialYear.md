# Build study 49 Radial Year

- **Piece:** `radialYear`
- **Launched:** 2026-09-29 01:12 UTC · **model:** claude-opus-5-5[1m]
- **Cost:** 255,955 tokens · 85 tool calls · 59 min
- **Source:** `c74bb602-6202-4ec5-8b02-3569895eeb14.jsonl` (extracted by `tools/extract-runs.mjs`)

## Prompt

````markdown
Your full task is in ~/rotli-studio/motion/series/studies/prompts/radial-year.prompt.md — read it and follow it exactly. Then read ~/rotli-studio/tmp/studies-27-50/builder-extra.md: extra rules for this build wave (other agents are building other studies in parallel). Build the study, verify it by looking, and report as both files ask.
````

## Report (the agent's own summary, unedited)

Radial Year (study 49) is built in both sizes, and both renders pass the dead-air and loudness checks. Nothing is registered or committed, and I recorded no goldens.

**Files created**
- `~/rotli-studio/motion/src/canvas-core/studies/radialYear.ts` (exports `radialYear` square and `radialYearVertical` vertical)
- `~/rotli-studio/motion/src/hosts/page-radialYear.ts`
- `~/rotli-studio/motion/src/hosts/page-radialYearVertical.ts`

**Final sheets**
- Square: `/tmp/radial-year-sq.png` (frames in `/tmp/radial-year-sq/`), critique sheets in `/tmp/critique-radialYear/`
- Vertical: `/tmp/radial-year-v.png` (frames in `/tmp/radial-year-v/`), critique sheets in `/tmp/critique-radialYearVertical/`
- Videos: `/tmp/radialYear.mp4`, `/tmp/radialYearVertical.mp4`

**Gates**

| Check | Square | Vertical |
|---|---|---|
| still-frames `windows:` | empty | empty |
| Loudness `I:` | −15.9 LUFS | −15.9 LUFS |

- **Loop seam:** not run, because the piece doesn't loop.
- **tsc:** my files are clean. The only error comes from another agent's `asciiCinema.ts`.
- **oxlint and oxfmt:** clean on my three files.
- **Critique record:** scores are here only; I did not write `critiques/radialYear.json`, since the rules limit me to my module and its two hosts.

**Self-critique** (same scores for both sizes):

| Criterion | Score | Why |
|---|---|---|
| Hook | 7 | The title and empty dial draw by about 1.5 s, but frame 0 shows only "A" and no data appears until 3 s. |
| Readability | 8 | Key lines are 44–46 px on phone. Axis, month, footer and centre-readout text is 22–32 px. |
| Motion | 8 | Spokes spring as the hand passes, the sweeps ease in and out, and the month name pops on each tick. |
| Variety | 6 | The tool counts 0 abrupt changes per 10 s and 96–98% near-still. The brief asks for one continuous chart with no cuts, so this comes from the form, not a fixable defect. |
| Composition | 8 | Nothing overlaps; each size has its own layout. |
| Accuracy | 9 | Every on-screen value matches the brief's facts, rounded and said with "about". The footer carries "approximate". |
| Sync | 8 | Every cue sits on its frame, but the drums never enter (see below). |

**Where I departed from the brief**
- **Drums:** `mood: "soft"` in the kit's `beatScore` has no drums at all, so `drop: 90` does nothing. The brief's "drums entering at 90" can't happen without editing the kit.
- **Dial size:** R is 300 px in the square and 380 px in the vertical, not about 430. A 430 dial doesn't fit under the square's title band.
- **Hand start:** the hand starts at the inner ring, not the centre, so it doesn't cross the readout.
- **Fill under spokes:** a 0.35-alpha amber fill of the same outline sits under the amber spokes to reduce moiré, and the faint teal spokes are 0.2 alpha. Length is still the only thing encoded.
- **Motion in holds:** idle drift plus a slow push-in didn't clear still-frames, so I added three things:
  - The hand glides to 21 Jun and 21 Dec as their callouts draw.
  - The vertical's hand also visits the Quito day and both crossings. The square skips these, because there the hand would lie along the callout lines.
  - The zoom pulls back a little during each sweep (to about 0.92) so the push-in can run steadily through every hold, ending at 1.06 (square) or 1.08 (vertical).
- **Crossing markers:** they sit on the labelled dates (20 Mar, 23 Sep), about 1–2 days from the model's actual crossings.
- **Ring labels:** they sit just right of the upward axis and just outside each ring, and the month labels moved out to R+50, to avoid clashing with the Jan label and the Quito line.
- **Type sizes (per the new phone-readability rule):**
  - Square: callout numbers 46 px, callout labels 30 px, title 72 px. The square end lines stay at 30 px because larger ones collide with the Dec month label.
  - Vertical: callout rows 44 px, end lines 48 px, title 92 px.
- **Quito callout timing:** it lands at frame 558 in the vertical and 570 in the square, each tuned to clear still-frames.

**Known problems remaining**
- In the vertical the hand is still gliding when callout 1 appears (the row lands at 336, the hand arrives at about 372).
- The centre readout can't reach 44 px inside the inner ring (72 px radius in the square).
- Faint moiré is still visible in the amber spokes near the inner ring.
- Still-frames passes on fairly thin margins; a future change to timing could reopen a window.
- With more time I'd give the first half-second a bolder opening and add a punchier moment at the Quito landing.
