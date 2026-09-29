# Build study 47 Recipe Flat-lay

- **Piece:** `recipeFlatlayVertical`
- **Launched:** 2026-09-29 01:12 UTC · **model:** claude-opus-5-5[1m]
- **Cost:** 212,413 tokens · 44 tool calls · 28.9 min
- **Source:** `c74bb602-6202-4ec5-8b02-3569895eeb14.jsonl` (extracted by `tools/extract-runs.mjs`)

## Prompt

````markdown
Your full task is in ~/rotli-studio/motion/series/studies/prompts/recipe-flatlay.prompt.md — read it and follow it exactly. Then read ~/rotli-studio/tmp/studies-27-50/builder-extra.md: extra rules for this build wave (other agents are building other studies in parallel). Build the study, verify it by looking, and report as both files ask.
````

## Report (the agent's own summary, unedited)

Study 47, Recipe Flat-lay, is built in both sizes and passes the prompt's gates: no dead air, −16.0 LUFS for each size, and a clean typecheck. The one thing I could not get to 8 is variety: the critique's pace number reads very low. That comes from the style the brief asks for, as explained under "What remains" below.

**Files created (nothing else was touched)**
- `~/rotli-studio/motion/src/canvas-core/studies/recipeFlatlay.ts` exports `recipeFlatlayVertical` (primary) and `recipeFlatlay` (square). It follows `motionResume.ts`: a `make(size, id)` factory, one `paint` per frame, shots that only name the steps and all start on the beat, the kitchen palette and the pack fonts, and `beatScore` for sound.
- `~/rotli-studio/motion/src/hosts/page-recipeFlatlayVertical.ts`
- `~/rotli-studio/motion/src/hosts/page-recipeFlatlay.ts`

**How it works**
- **Stop-motion clock:** everything is drawn from the pose number (the frame divided by 5, rounded down), so each pose holds 5 frames and a beat is 6 poses.
- **Easing in the spacing:** moves use fixed step tables, with big steps first and one pose of overshoot. Liquids and batter grow in 4–5 steps. There is no tweening and no motion blur.
- **Boil:** every object, card and tag shifts by a seeded ±1 px and ±0.3° on each pose.
- **Shadows:** one hard shadow at 18% alpha, offset 6 px down-right. It grows while a pancake flips or hops.
- **The recipe:** all the brief's beats are in, from cracking eggs to the pancake stack. Pour-stops, whooshes, hits and the sign-off sit on the brief's frames.
- **Copy:** every tag matches the brief's facts. All text is ink on linen or on white labels, gold and teal are used only as fills, and the fraction quantities are set in Inter.
- **The ending:** I added a stepped camera push-in over the last beats (cards stay put) so the plate reads as the sign-off shot.

**Final sheets**
- Vertical: `/tmp/recipe-flatlay-final-vertical.png`
- Square: `/tmp/recipe-flatlay-final-square.png`
- Critique sheets: `/tmp/recipe-flatlay-critique-recipeFlatlayVertical/` and `/tmp/recipe-flatlay-critique-recipeFlatlay/`
- Renders: `/tmp/recipeFlatlayVertical.mp4` and `/tmp/recipeFlatlay.mp4`

**Gates**

| Check | Vertical | Square |
|---|---|---|
| still-frames `windows:` | empty | empty |
| loop-seam | not run (the piece is not a loop) | not run |
| Loudness `I:` | −16.0 LUFS | −16.0 LUFS |
| Critique pace (changes per 10 s) | 0.3 | 0.7 |

`npx tsc --noEmit` shows no errors in my files. oxlint and oxfmt are clean on my three files. The final sheets were rendered after the last change, which was only formatting and one unused variable, so the pixels match the renders.

**Self-critique scores:** hook 8, readability 8, motion 9, variety 7, composition 8, accuracy 9, sync 9.

**What remains**
- **Variety (7):** the critique counts full-frame slams and cuts. This brief forbids those, since every object is hand-placed on twos, so the metric is blind to this style. On the sheets something new happens every 1–2 s. Adding slams to raise the number would break the brief, so I left it.
- **Step 03 in vertical:** for about 4 s the board holds only the bowl, the timer and two tags, and the bottom of the board is empty.
- **Passing under tags:** in the square, the spoons slide under the dry-ingredient tag column on their way to the bowl. It is brief, but you can see it.
- **Square ending:** the footer sits over a wood-grain knot once the camera pushes in.
- **Stack size:** the final stack is still modest even with the push-in.

**With more time:** give step 03 more to look at (a second whisk pass or the shells coming back), make the plate and stack bigger at the end, and give the bubbles a clearer rise before they pop.

**Not done, per the rules:** no `bun run verify`, no goldens, no registration in `pieces.json` or `series.json`, no commit. I also did not write the critique record in `series/studies/critiques/`, because hard rule 1 limits me to the module and its two hosts, so the scores are only in this report.
