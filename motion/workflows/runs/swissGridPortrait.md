# Build study 33 Swiss Grid

- **Piece:** `swissGridPortrait`
- **Launched:** 2026-09-29 01:35 UTC · **model:** claude-opus-5-5[1m]
- **Cost:** 242,009 tokens · 60 tool calls · 36.2 min
- **Source:** `c74bb602-6202-4ec5-8b02-3569895eeb14.jsonl` (extracted by `tools/extract-runs.mjs`)

## Prompt

````markdown
Your full task is in ~/rotli-studio/motion/series/studies/prompts/swiss-grid.prompt.md — read it and follow it exactly. Then read ~/rotli-studio/tmp/studies-27-50/builder-extra.md: extra rules for this build wave (other agents are building other studies in parallel). Build the study, verify it by looking, and report as both files ask.
````

## Report (the agent's own summary, unedited)

I've built Study 33, Swiss Grid, in both sizes and checked it by eye. Both renders pass the dead-air check, loudness is −15.7 LUFS, and the typecheck, lint and format checks are clean for my files. Nothing is registered, committed or recorded as a golden, and I did not write a critique record file (only my module and two hosts were allowed).

**Files created**
- `~/rotli-studio/motion/src/canvas-core/studies/swissGrid.ts` (exports `swissGridPortrait`, the primary, and `swissGrid`)
- `~/rotli-studio/motion/src/hosts/page-swissGridPortrait.ts`
- `~/rotli-studio/motion/src/hosts/page-swissGrid.ts`

**Final sheets**
- Portrait: `/tmp/swiss-grid-portrait.png`
- Landscape: `/tmp/swiss-grid-landscape.png`
- Critique sheets: `/tmp/critique-swissGridPortrait/` and `/tmp/critique-swissGrid/`. I read the portrait sheet, phone and fast-2 sheets, and the landscape sheet and fast-1. I did not read portrait fast-1, landscape phone or landscape fast-2.

**Checks**

| | Portrait | Landscape |
|---|---|---|
| still-frames | `windows:` (empty) | `windows:` (empty) |
| loudness | I: −15.7 LUFS | I: −15.7 LUFS |
| changes per 10 s | 4.5 | 3.6 |
| longest calm | 5.8 s, from 0:01.3 | 5.5 s, from 0:01.5 |

The piece is not a loop, so there is no seam check.

**How it plays**
- **Opening:** the columns fall as solid ink bars and cut to hairlines, then the rows do the same, then the baselines wipe down. This puts something bold on screen in the first second.
- **Evenings:** each giant numeral pushes along its row or column inside its own area. Each diagram shows its idea, with only one red highlight at a time.
- **Recompose:** one move per half beat. The numeral shrinks and rises into the list, and the red bar shrinks, drops and regrows in whole-column steps. The title grows column by column.
- **Sound:** every snap and tick comes from one list of moves, so picture and sound can't drift apart. Hits land at 150, 210, 270, 330, 390 and 450, and the sign-off at 570.

**Self-critique scores (hook, readability, motion, variety, composition, accuracy, sync)**
- Portrait: 9, 8, 8, 7, 8, 9, 9
- Landscape: 9, 7, 8, 7, 8, 9, 9

**Where I departed from the brief**
- **Type sizes:** raised for phone readability, as the extra rules ask. The subtitle and day names went from 30 to 40 px, the info block from 26–30 to 40 px, and the list day names to 36 px. The running head stays at 22/26 px because it is decoration.
- **Portrait safe area:** the kit treats 4:5 as a tall format (safe area x 80, top 220, bottom 320). With the brief's 64 px margins, flush-left text starts 16 px outside the safe x. The running head sits above the safe top and the final red bar below the safe bottom. All other text keeps its baselines between 220 and 1030.
- **Landscape margins:** 104 px, since the brief gives none. This keeps the running head in the safe area and makes every module a whole pixel.
- **Push-in:** one continuous 1.00 → 1.015 over the whole film, not restarted per hold.
- **Evening 5 in portrait:** "The White Space" moves one column right into column 6 and restacks one word per line, because there is no room further right.
- **Numeral pushes:** numerals 3 and 5 push vertically, 2 and 4 horizontally, for variety.
- **Poster wipe (not in the brief):** at 570 the row bars sweep across and off to give the poster a punch. The hairlines drop to a quarter strength under the bars, so the info block now snaps in at 585 instead of 570.
- **Subtitle:** it leaves at the recompose, because the brief's final poster doesn't list it.
- **Extra ticks:** a few cuts also tick (the two bar-to-hairline cuts, the gutter flash ending, the evening-4 guide lines turning off), not only snaps.

**Problems that remain**
- **Variety is 7:** the calm stretch from about 1.3 s to 7 s is full of small snaps, but none are big enough to count as a punch. The title drop and the "1" arriving are too small against the whole frame.
- **Landscape readability is 7:** 40 px lines are about 7.5 px tall at phone width.
- **Tight title:** in both sizes the title baseline sits about 20 px above the top of the numeral. It is exact to the grid but reads cramped.
- **Landscape frame 392:** for about two frames of the numeral 5 push, the bottom of the outgoing 4 shows just under "Week".
- **Hairlines:** at the brief's line colour they are faint at phone size.

**With more time** I'd add a bolder moment around the title (1.5–5 s), give the title more room above the numeral, and try a 2-frame ink flash on each grid line as it lands so the grid reads better on a phone.
