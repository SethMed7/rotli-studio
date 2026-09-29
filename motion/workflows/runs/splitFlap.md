# Build study 29 Split-Flap

- **Piece:** `splitFlap`
- **Launched:** 2026-09-29 01:12 UTC · **model:** claude-opus-5-5[1m]
- **Cost:** 218,363 tokens · 47 tool calls · 40.3 min
- **Source:** `c74bb602-6202-4ec5-8b02-3569895eeb14.jsonl` (extracted by `tools/extract-runs.mjs`)

## Prompt

````markdown
Your full task is in ~/rotli-studio/motion/series/studies/prompts/split-flap.prompt.md — read it and follow it exactly. Then read ~/rotli-studio/tmp/studies-27-50/builder-extra.md: extra rules for this build wave (other agents are building other studies in parallel). Build the study, verify it by looking, and report as both files ask.
````

## Report (the agent's own summary, unedited)

I built Split-Flap (study 29) in both sizes. Both renders pass still-frames with an empty `windows:` line and sit at −16.1 LUFS, and my files type-check, lint and format clean. I kept four deviations from the brief (listed below) because the drum timing or the dead-air check forced them. Nothing is registered or committed, and I touched nothing outside my three files.

**Files created**
- `~/rotli-studio/motion/src/canvas-core/studies/splitFlap.ts` (exports `splitFlap`, `splitFlapVertical`)
- `~/rotli-studio/motion/src/hosts/page-splitFlap.ts`
- `~/rotli-studio/motion/src/hosts/page-splitFlapVertical.ts`

**How it works:** it follows the reference study's structure: `make(size, id)`, six shots on beat cuts (0/120/480/720/960/1200), and the solari palette from the pack. Each cell holds a list of (frame, target) moves on the fixed 40-flap drum and only moves forward, so its state at any frame is computed in closed form. A new target waits for the flap already in flight to land. The flip is drawn in two halves as the brief describes. Clatter ticks are worked out from the cell data: one tick per 3-frame flap period while any cell flips, plus a second when more than 10 flip. The hits land exactly where the brief puts them: the first DELAYED at 510 and the last BOOKED at 1140, both solved backwards from the drum distances. The whoosh ends at 960 and the sign-off starts at 1260.

**Final sheets**
- Landscape: `/tmp/split-flap-final-L.png`; critique sheets in `/tmp/critique-splitFlap/`
- Vertical: `/tmp/split-flap-final-V.png`; critique sheets in `/tmp/critique-splitFlapVertical/`

**Checks**

| Check | Landscape | Vertical |
|---|---|---|
| still-frames `windows:` | empty | empty |
| Loudness (`I:`) | −16.1 LUFS | −16.1 LUFS |
| loop-seam | not run (not a loop) | not run (not a loop) |

- `npx tsc --noEmit` reports nothing for my files; oxlint is clean; oxfmt has been applied.

**Self-critique (1–10)**

| | Landscape | Vertical |
|---|---|---|
| hook | 7 | 7 |
| readability | 8 | 8 |
| motion | 8 | 8 |
| variety | 6 | 6 |
| composition | 8 | 8 |
| accuracy | 9 | 9 |
| sync | 8 | 8 |

I did not bring variety up to 8, and hook is also still under 8.
- **Variety:** critique.mjs counts 0 abrupt changes per 10 s and one 24 s "calm". A board seen straight on, changing letter by letter, has no slams or cuts by design; adding them would break the brief.
- **Hook:** the first two seconds are a mostly blank board with amber DEPARTURES flaps rattling. It is intriguing but quiet.

**Deviations from the brief**
- **DEPARTURES does not reach blank.** Clearing forward to blank takes up to 117 frames, so its letters rattle away from frame 92 and roll straight on into row 1's content at 120.
- **Row 6's DELAYED lands late.** It lands at 690 in landscape and 660 in vertical, not one beat after row 4, because its ON TIME only settles around 532. Rows 2–4 do land on consecutive beats (510, 540, 570).
- **The "hold for a beat" at 1140–1200 is not motionless.** A hold with only the colon blinking is flagged as dead air by still-frames. Instead, the message row finishes landing about 1178 and there is a quicker push-in over the last 44 frames.
- **The push-in resets on the cuts at 120, 960 and 1200.** Within each stretch it goes 1.00 to 1.03, slow first and faster on the closing hold. That extra speed is what clears the dead-air check; a single slow push across the whole film did not.

**Other choices**
- DEPARTURES, ALL MEETINGS BOOKED and the sign-off letters use coloured flaps (amber or green). Those colour landings are the only single-cell changes big enough to register as motion.
- Vertical copy is shortened to fit 16 cells:
  - DESIGN CRIT becomes "DESIGN", since 11 characters don't fit after the time.
  - The message rows read "FINDING TIME" and "MEETINGS BOOKED".
  - The ending reads ORIEL / ALL BOOKED.
- The "..." after the message is three amber dots drawn on blank flaps. A forward-only drum can't cycle a '.' back.

**Remaining problems / what I would improve with more time**
- Each re-flip takes about 2 s of drum travel, so the trouble section is long and fairly uniform.
- In landscape, row 6's ON TIME shows for only about 18 frames before it rattles to DELAYED.
- The printed ticker (34 px) is small on a phone.
- I'd add a stronger opening beat within the brief, such as a full-board power-on sweep.
- I did not write a `series/studies/critiques/*.json` record, because it is outside the files I was allowed to touch. The scores above are my record.
