# Build study 30 Glitch Signal

- **Piece:** `glitchSignalVertical`
- **Launched:** 2026-09-29 01:12 UTC · **model:** claude-opus-5-5[1m]
- **Cost:** 193,435 tokens · 31 tool calls · 14.4 min
- **Source:** `c74bb602-6202-4ec5-8b02-3569895eeb14.jsonl` (extracted by `tools/extract-runs.mjs`)

## Prompt

````markdown
Your full task is in ~/rotli-studio/motion/series/studies/prompts/glitch-signal.prompt.md — read it and follow it exactly. Then read ~/rotli-studio/tmp/studies-27-50/builder-extra.md: extra rules for this build wave (other agents are building other studies in parallel). Build the study, verify it by looking, and report as both files ask.
````

## Report (the agent's own summary, unedited)

I built Glitch Signal (study 30) in both sizes. Both renders pass every gate the prompt asks for: no dead air, about −16 LUFS, deterministic, and my own files typecheck, lint and format clean.

**Files created**
- `~/rotli-studio/motion/src/canvas-core/studies/glitchSignal.ts`, which exports `glitchSignalVertical` and `glitchSignal`.
- `~/rotli-studio/motion/src/hosts/page-glitchSignal.ts`
- `~/rotli-studio/motion/src/hosts/page-glitchSignalVertical.ts`

Nothing else was touched: not the kit, pack, `pieces.json`, `series.json` or goldens. Nothing is registered or committed.

**Sheets**
- Vertical: `/tmp/glitch-signal-v.png`, `/tmp/glitch-signal-v2.png`, and the critique sheets in `/tmp/critique-glitchSignalVertical/` (sheet, phone, fast-1, fast-2).
- Landscape: `/tmp/glitch-signal-l.png` and the critique sheets in `/tmp/critique-glitchSignal/`.
- Renders: `/tmp/glitchSignalVertical.mp4` and `/tmp/glitchSignal.mp4`.

**Gate results**

| Check | Vertical | Landscape |
|---|---|---|
| still-frames `windows:` line | empty | empty |
| Frames identical to the one before (intended holds) | 16 | 17 |
| Loudness `I:` | −15.9 LUFS | −15.9 LUFS |
| Determinism probe | 6/6 identical | 6/6 identical |
| Pace | 5 changes per 10 s, longest calm 5.5 s | 8.5 changes per 10 s, longest calm 3.9 s |

- **Loop seam:** not run; the piece is not a loop.
- **Typecheck:** `npx tsc` reports one error, in another agent's `stainedGlass.ts`, and none in my files.
- **Render speed:** 42 fps end to end; the vertical render went over the 150 ms draw budget on 2 frames.

**Two choices you should know about**
- **Dropouts:** the picture holds a heavily glitched frame for 3 frames before each spike, and the sound is gated to zero on exactly those frames (177–180, 237–240, 297–300). The hit then lands on the spike itself. If the dropout sat on the spike frames instead, it would cut off the hit. I checked the WAV: RMS is 0 on those frames.
- **Pluge patches:** the near-black steps use the pack's `ground` and `surface` colours. The magenta bar is mixed in code from `accent` and `s3`. The only other hard-coded colours are the pure red, green and blue channel masks and the grey and white used for the VHS effects.

**Self-critique** (my own scores, 1–10; I wrote no critiques file because the hard rules limit me to the three files above)

| Hook | Readability | Motion | Variety | Composition | Accuracy | Sync |
|---|---|---|---|---|---|---|
| 8 | 8 | 8 | 8 | 8 | 9 | 8 |

**Known problems that remain**
- **Signal found is short.** "Signal found. / We never left." has only 45 frames (555–600), so the final read after the RGB wink at 585 is about half a second.
- **Vertical middle stretch is slow on paper.** The vertical's longest calm is 5.5 s, over the signal-lost card, snow and search (13.0–18.5 s). It's a deliberate hold with blinking, snow and channel steps, but the pace tool counts few abrupt changes there.
- **Landscape leaves the right third empty.** The brief puts the host lines on the left two thirds, and I added nothing on the right.
- **Search readout is small.** It is mono at 34 px; readable, but small against the landscape frame.
- **Chrome is illegible in the heavy beats.** During breakup and melt the RGB split and scanlines make the mono chrome unreadable. That is intended by the brief, but it's still lost text.
- **Sound was not listened to.** The ticks, whooshes and static bed are placed by code and checked by numbers only.

**With more time** I would give "Signal found" a longer hold, add a subtle element to the landscape's right third in the host scenes, and make the channel steps in the search readout land with more punch.
