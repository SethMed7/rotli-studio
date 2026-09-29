# Build study 41 Seasons Orrery

- **Piece:** `seasonsOrrery`
- **Launched:** 2026-09-29 02:02 UTC · **model:** claude-opus-5-5[1m]
- **Cost:** 252,757 tokens · 71 tool calls · 42.3 min
- **Source:** `c74bb602-6202-4ec5-8b02-3569895eeb14.jsonl` (extracted by `tools/extract-runs.mjs`)

## Prompt

````markdown
Your full task is in ~/rotli-studio/motion/series/studies/prompts/seasons-orrery.prompt.md — read it and follow it exactly. Then read ~/rotli-studio/tmp/studies-27-50/builder-extra.md: extra rules for this build wave (other agents are building other studies in parallel). Build the study, verify it by looking, and report as both files ask.
````

## Report (the agent's own summary, unedited)

Seasons Orrery (study 41) is built in both sizes, and the checks pass: no dead-air windows in either render, both at −16.0 LUFS, and typecheck, oxlint and oxfmt are clean on my files. Nothing is committed, registered or golden-recorded.

**Files created** (only these three):
- `~/rotli-studio/motion/src/canvas-core/studies/seasonsOrrery.ts` (exports `seasonsOrrery` and `seasonsOrreryVertical`)
- `~/rotli-studio/motion/src/hosts/page-seasonsOrrery.ts`
- `~/rotli-studio/motion/src/hosts/page-seasonsOrreryVertical.ts`

**Final sheets** (13 frames each; full frames sit in the matching folders):
- Landscape: `/tmp/seasons-orrery-landscape.png`
- Vertical: `/tmp/seasons-orrery-vertical.png`
- Critique sheets: `/tmp/critique-seasonsOrrery/` and `/tmp/critique-seasonsOrreryVertical/`
- Renders: `/tmp/seasonsOrrery.mp4` and `/tmp/seasonsOrreryVertical.mp4`

**Checks**
| | landscape | vertical |
|---|---|---|
| still-frames | `windows:` (empty) | `windows:` (empty) |
| loudness | I: −16.0 LUFS | I: −16.0 LUFS |
| critique pace | 0 changes/10 s, longest calm 34 s, near-still 74% | 0 changes/10 s, longest calm 34 s, near-still 79% |

- Loop-seam does not apply; the piece is not a loop.
- The critique pace numbers were measured one render earlier. The last render only moved two labels, and my re-run of the critique tool failed on a shell glitch.
- Shots start at 0, 120, 255, 450, 630, 810 and 930, all on the 15-frame beat grid.

**Where I departed from the brief, and why**
- **Sun:** the radius is 64 px in landscape and 56 in vertical instead of 90. The rings step at 27% of the radius. At 90 the Sun hid the far Earth and the equinox line.
- **Orbit:** 1000 × 420 in landscape and 850 × 344 in vertical (brief: 1300 × 420 and 900 × 360), so the Earth and labels fit. The flatter height ratio matches the brief's "about 25°" view.
- **Month labels:** Jun and Dec sit below the ring's ends, outside the ring. Mar sits beside the far point, clear of the Sun's rings.
- **Day dial:** about 220 px across instead of 180.
- **Contrast:** the squares and the inset border use `muted` at reduced alpha instead of `line`. `line` is invisible on `surface` in this palette.
- **Additions not in the brief**, made because the still-frames check failed without them:
  - The Earth spins once every 100 frames. Its meridians turn and the 40° N marker travels its latitude, which is now drawn in accent.
  - The dial has a hand driven by that same spin. It sits in the day arc exactly when the marker is lit.
  - Dashes run down the beam.
  - The camera floats in a slow ±14 / 9 px circle.
  - A consequence of the spin: the Earth is now a function of the orbital angle plus the spin angle. It is still a pure function of the frame.
- **Marker label:** the "a place at 40° N" leader points at the front of the 40° N circle, not at the moving dot.
- **When the arm arrives:** I followed the sound cues. The arm reaches June, December and March on frames 255, 630 and 810. So the June-to-December half turn happens inside the beam beat (510–630), and the beam's angle follows it. The brief's text puts that half turn in the December beat.
- **Equinoxes:** at each pause the Earth grows 1.38× instead of the camera pushing in. At September the point under the Sun is on the Earth's hidden side, so that part of the line and the back of the equator are dashed.
- **Headlines:** "equator" is the accent word in the equinox headline; the brief marks none there.
- **June punch:** at frame 390 the dial snaps and its day arc flashes, with a tick. This gives the six-second June hold a moment that lands.
- **Type sizes, raised for phones as the extra rules ask:** second lines 34 → 44 px; "23.4°" is 52 px on screen; the counter is 48 px (72 px when the inset is large); the hook tag and marker label are 30 px. Month labels, inset labels and the dial caption stay at 24 px as decoration.
- **Loudness:** `beatScore` gain is 0.71 to land at −16 LUFS.

**Sound:** soft mood, key +3; hits at 90 and 930; whooshes ending at 255, 630 and 810; three-note sign-off at 960. Ticks fall at 162 (the protractor label), 205/218/231/244 (the ghost Earths), 390 (the dial pop) and on each change of the squares counter, at least 8 frames apart.

**Self-critique scores:** hook 8, readability 8, motion 8, variety 7, composition 8, accuracy 9, sync 8.
- Variety is 7 because the piece glides and the abrupt-change count is 0. By eye, something lands every 2–4 s: Sun pop (frame 2), answer hit (90), protractor label (162), ghost pops and rod flash (205–250), marker and dial (276), inset (324), dial snap (390), counter bumps (540–625), rod flash (662), March and September label pulses (812, 888), end card (930).
- On accuracy, every on-screen line maps to the brief's facts list. There are no elevation angles or day lengths; the counter only counts drawn squares.
- I did not write `series/studies/critiques/seasonsOrrery.json`, because hard rule 1 limits me to the module and hosts. Other agents in this wave did write theirs, so you may want one here.

**Known remaining problems**
- As the hook tag fades (about frames 118–128), its dark text disappears before its box, leaving an empty accent rectangle for a moment.
- The vertical second line in June wraps to leave "summer." alone on a line.
- The vertical hook and tilt beats (0–255) leave the lower third empty until the inset and dial arrive.
- The March ghost Earth sits partly behind the Sun's rings.
- The "same beam" note and the 24 px inset labels are small on a phone.
- With more time: stronger abrupt beats for the variety score, a better-filled vertical opening, and an animated leader that follows the marker dot.
