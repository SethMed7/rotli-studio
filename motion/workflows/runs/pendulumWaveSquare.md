# Build study 42 Pendulum Wave

- **Piece:** `pendulumWaveSquare`
- **Launched:** 2026-09-29 02:02 UTC · **model:** claude-opus-5-5[1m]
- **Cost:** 196,666 tokens · 54 tool calls · 32.8 min
- **Source:** `c74bb602-6202-4ec5-8b02-3569895eeb14.jsonl` (extracted by `tools/extract-runs.mjs`)

## Prompt

````markdown
Your full task is in ~/rotli-studio/motion/series/studies/prompts/pendulum-wave.prompt.md — read it and follow it exactly. Then read ~/rotli-studio/tmp/studies-27-50/builder-extra.md: extra rules for this build wave (other agents are building other studies in parallel). Build the study, verify it by looking, and report as both files ask.
````

## Report (the agent's own summary, unedited)

I built Pendulum Wave (study 42) in both sizes, and every gate passes on the final renders: no dead air, seamless loop, −16.0 LUFS, clean typecheck. The one criterion under 8 is variety: `critique.mjs` counts 0 changes per 10 s, because the piece is one continuous take with no cuts. Nothing is committed, registered or golden-recorded, and I wrote no critique JSON because hard rule 1 limits me to the module and its two hosts.

**Files created** (oxlint clean, oxfmt applied):
- `~/rotli-studio/motion/src/canvas-core/studies/pendulumWave.ts` (exports `pendulumWaveSquare` and `pendulumWave`)
- `~/rotli-studio/motion/src/hosts/page-pendulumWaveSquare.ts`
- `~/rotli-studio/motion/src/hosts/page-pendulumWave.ts`

**Final sheets:**
- Square: `/tmp/pendulum-wave-sq.png`
- Landscape: `/tmp/pendulum-wave-ls.png`
- Critique sheets: `/tmp/pendulum-wave-critique-pendulumWaveSquare/` and `/tmp/pendulum-wave-critique-pendulumWave/`
- Videos: `/tmp/pendulumWaveSquare.mp4`, `/tmp/pendulumWave.mp4`

**Results:**

| | still-frames | loop-seam | loudness |
|---|---|---|---|
| Square | `windows:` empty (0 identical) | seam 2.25% vs largest inner step 7.17%: SEAMLESS | I: −16.0 LUFS |
| Landscape | `windows:` empty (0 identical) | seam 1.46% vs 5.82%: SEAMLESS | I: −16.0 LUFS |

`npx tsc --noEmit` prints nothing.

**How it's built:**
- Every angle is the brief's closed form, theta_k = 12°·cos(2π(24+k)F/1920), with lengths from L = g(G/2πN)². The camera drift, captions, pills and ring all use the same cycle, and the opening caption is the closing one carried across the seam, so there is no cross-fade.
- Sound is beatScore soft with `loop: true` and no sign-off, a whoosh ending on frame 0, and ticks on 480, 640, 960, 1280 and 1440. On top, each pendulum plucks an A minor pentatonic note (longest lowest) at every right-hand turning point, wrapped so it loops cleanly.

**Self-critique scores:** hook 8, readability 8, motion 8, variety 7, composition 8, accuracy 9, sync 8.

**Choices and departures from the brief:**
- **Type raised for phones:** the muted line is 42 px (brief says 34), the formula 50 px (40), pill labels 34 px, and the card's second line 36 px (landscape) and 40 px (square). The timecode (26 / 34 px) and the "32 s" label inside the ring (22 px) stay small as chrome.
- **Drawn glyphs:** the pack's fonts have no π, √, ⅓ or ⅔. So π and √ are drawn in the module, and the radical has a bar over L/g instead of the brief's ASCII parentheses. All five fractions in the pills are drawn the same way.
- **The trace plots the normalised angle (θ/A), not L·sinθ.** That is what makes it a flat line at 0 and 32 s.
- **Bob radius** is 22 px (square) and 26 px (landscape), not the brief's 30 px, which I left ambiguous between radius and diameter. The floor grid is a little brighter than alpha 0.35, because the palette's line colour is nearly the ground colour.
- **Added, not in the brief, to meet builder-extra's punch rule:**
  - At each pattern frame, every q-th pendulum and its trace dot flash accent2 for two beats, alongside dashed lines at the group levels.
  - The same flash lights all fifteen around the seam, which is the first-1.5 s punch.
  - Landscape has a hairline between the two columns.
- **Square sequencing:** the formula card takes the caption's place, so the caption leaves at 318 and the card shows 336–434, then again 1230–1394. Landscape shows the card and caption together.
- **Pill timing:** the pill's spring starts 3 frames early so it is visible on its exact frame; the tick lands on the frame.

**Problems that remain:**
- **Variety (7):** with no cuts, the tool reads the whole 32 s as one calm stretch. The punches are the pills, the group flashes, caption arrivals and the card slide, none of which cross its threshold. Adding real cuts would break the brief's one-take lesson.
- **"In step" is short:** with this tuning, neighbouring phases drift apart by 2π·t/32, so the row is only truly in step within about ±1 s of the seam; the travelling wave has formed by about 2 s. The brief's 0–240 description is only literally true near frame 0, and I left the physics alone.
- **Far end moves little:** at 12° with true lengths and perspective, the far pendulums swing only a short way. The trace carries the pattern clearly, and the main view still reads as a wave.

**With more time:** I'd let the landscape trace fill the empty column space when no card is showing, and give the pentatonic layer a little more presence against the bed.
