# Build episode 03 Habits

- **Piece:** `ep03Habits`
- **Launched:** 2026-09-24 15:31 UTC · **model:** claude-opus-5-5[1m]
- **Cost:** 206,896 tokens · 53 tool calls · 23.1 min
- **Source:** `6f834591-5513-4f19-a058-1af9a5cdd8f7.jsonl` (extracted by `tools/extract-runs.mjs`)

## Prompt

````markdown
You are building ONE landscape episode for the "Rotli in 30 seconds" series in a code-drawn motion studio. Work ONLY in ~/rotli-studio/motion (a Node/npm project; use `node`, not bun). Always use absolute paths or `cd ~/rotli-studio/motion && ...` in every shell command (cwd resets).

YOUR EPISODE: `ep03Habits` — title card lines ["Small habits.", "Big calm."], light (paper) ground, title pose: "searching".
Story (site's own claims — use this wording, invent NO other product claims):
- "Open or hide rotli from anywhere on your Mac." — ⌥Space (use `keys()` from studio/ui.ts to show the chord; show some other generic app window behind, Rotli appears over it, then hides)
- "Search titles and text across the whole vault, best match first." — ⌘K palette with a query being typed and ranked results (best match on top, matched letters in the accent)
- "Wikilinks connect notes. A link to nothing looks inert, never live." — show [[Ferry times]] as a live accent link and [[Someday]] (no note) rendered inert/muted
- "Main and named views arrange the same files without copying them." — Main list and a named view "Trip" showing the same note; a small "same file" indicator
Suggested beats in that order, then end card.

REQUIRED READING FIRST (the reference implementation and the shared grammar — match its look and structure exactly):
- src/canvas-core/ep01Write.ts (THE reference episode: timeline 900 frames = 30 s; shots title 0–90 / demo 90–780 / end 780–900; camera push-in; pointer waypoints; lowerThird captions; makeScore; exported `epNNDerive` spec)
- src/canvas-core/studio/series.ts, studio/ui.ts, studio/derive.ts, studio/stage.ts, studio/brandmarks.ts
- src/canvas-core/rotli/kit.ts (C palette, ink, text, fillRR, chip…), rotli/actor.ts (actor, hopAlong, poseAt)
- PoseName list: base, waving, notes, celebrating, ai_chat, searching, knowledge_system, stays_local, inbox, rest, walking, thoughtful, listening, attention (do NOT read quokka/poses.ts, it is huge path data)
- ../.claude/skills/motion-room/SKILL.md

HARD RULES:
1. Create ONLY: src/canvas-core/ep03Habits.ts (exporting `export const ep03Habits: Film` and `export const ep03Derive: DeriveSpec`) and src/hosts/page-ep03Habits.ts (3 lines, copy the ep01 host). Then run `node tools/derive-modules.mjs ep03Habits "Small habits.|Big calm." calm`. Do NOT edit any other file (no shared kit/ui/series/derive changes, no pieces.json, no goldens). If you need a helper that doesn't exist, define it locally in your episode file.
2. Same grammar as ep01: titleCard/lowerThird/endCard from studio/series.ts, UI from studio/ui.ts using the LIGHT theme roles, 900 frames, shots on multiples of 15, a camera push-in when UI text would otherwise be small (text must be readable at 1080p; body text ≥ 26px on screen), a pointer for clicks, 4–5 lowerThird caption beats, makeScore with pops on each on-screen event and `clicks` for typing.
3. Flat Rotli look: no glows, gradients, blur or drop-shadow filters; nothing overlaps unintentionally; captions never cover the thing being shown.
4. ep03Derive: vertical beats (each `len` a multiple of 15, 4 beats, frames where the action is visible), 4 slides (settled frames), 1 single. Crops are in the RENDERED episode's screen coordinates (after your camera) and should be squarish (aspect between 0.9 and 1.8) so they fill 4:5 and 9:16 frames; keep crops above y≈860 so lower-third pills aren't captured.
5. VERIFY BY LOOKING: render review sheets with `node tools/frames.mjs ep03Habits 40,150,300,450,600,720,850 --out /tmp/ep03 --sheet /tmp/ep03.png --cols 4` and READ the PNG; iterate until it looks right. Do the same for ep03Vertical, ep03Carousel (frames 14,29,44,…) and ep03Single (frame 14). Then `node tools/render.mjs ep03Habits --out /tmp/ep03.mp4` and `node tools/still-frames.mjs /tmp/ep03.mp4` must print an empty line (no identical consecutive frames); add gentle motion if not.
6. Do not commit, do not touch ~/rotli, do not run `studio.mjs render all` or golden.

Report back: files created, the final review-sheet paths, the still-frames result, and anything you could not make work.
````

## Follow-ups (sent while or after it ran)

### 2026-09-24 15:40 · notify ep03 of drift/host/check changes

````text
Update from the director: the dead-air check changed, and two helpers now exist in studio/series.ts. (1) `tools/still-frames.mjs <mp4>` now prints two lines ("identical: N" and "windows: …") and exits 1 when any 15-frame window has every frame changing <0.5% of pixels. Your episode must print an EMPTY "windows:" line. (2) `drift(ctx, env, l)` from studio/series.ts: call it right after you set your camera transform (it composes onto the current transform) so UI holds keep a living camera. See ep01Write.ts's camera(). (3) `host(ctx, env, l, { pose, dark? })` from studio/series.ts draws a small breathing and swaying quokka bottom-right. Use it during demos where no quokka is on screen, drawn in screen space (reset to the flat transform before calling, then restore your camera). The shared end card and vertical end card are handled by me. Do not edit series.ts or derive.ts yourself.
````

## Report (the agent's own summary, unedited)

Episode 03 (`ep03Habits`) is built and renders, and the dead-air check passes: `identical: 0`, an empty `windows:` line, exit 0 on the final `/tmp/ep03.mp4`. I looked at every review sheet and fixed what they showed.

**Files created**
- `~/rotli-studio/motion/src/canvas-core/ep03Habits.ts` exports `ep03Habits: Film` and `ep03Derive: DeriveSpec`.
- `~/rotli-studio/motion/src/hosts/page-ep03Habits.ts` is the 3-line host, copied from ep01.
- `derive-modules.mjs` generated the other six: `src/canvas-core/ep03Vertical.ts`, `ep03Carousel.ts` and `ep03Single.ts`, plus their `src/hosts/page-*.ts`.
- No other file was touched: nothing shared, no `pieces.json`, no goldens, no commit.

**The episode** (900 frames: title 0–90, demo 90–780, end 780–900)
- **Title card:** "Small habits. / Big calm.", `searching` pose, paper ground.
- **⌥Space (90–255):** a grey "other app" window with no name. The ⌥ Space keycaps press three times: Rotli pops in over the app, hides, comes back, then grows to full size.
- **⌘K (255–400):** the ⌘ K keycaps press, then the palette opens and "trip" is typed. Results are ranked: "Trip plan" is on top with a "Best match" tag, and two text matches follow. Matched letters show in the accent colour. The pointer clicks the top result and "Trip plan" opens. Camera is pushed in to about 1.4×.
- **Wikilinks (400–600):** `[[Ferry times]]` is typed raw and becomes a live accent link with a hover state and a "links to ferry-times.md" chip. `[[Someday]]` renders muted with no underline, plus a "no note yet · stays inert" chip. Camera is pushed in to about 1.75×, with the sidebar visible.
- **Views (600–780):** "Main" and a "Trip" view list the same notes. The pointer drags Ferry times to the top of Trip while Main stays unchanged. A clay line with a "same file" chip then joins the two rows and a `ferry-times.md` pill pops in. The camera pulls back out for the finish.
- **Captions:** four lower thirds, using the site's wording.
- **Score:** `makeScore` has a pop on each on-screen event and clicks on the typing.

**Your mid-task update is in:** `drift()` runs right after every camera transform. `host()` draws the quokka in screen space throughout the demo (attention → searching → thoughtful → base → knowledge_system when the file pill lands). Because of that, I dropped my own hop-in quokka.

**Derive spec:** the vertical has 4 beats of 135, 90, 180 and 105 frames. There are 4 slides at frames 170, 355, 585 and 718, and the single is frame 355, the ⌘K palette. Every crop's aspect is between 1.3 and 1.79 and every crop ends at or above y 860. Each vertical crop was checked on its last frame, because of the 5% push-in in `derive.ts` plus drift.

**Final review sheets**
- Landscape: `/tmp/ep03.png`, plus event close-ups in `/tmp/ep03b.png`, `/tmp/ep03d.png` and `/tmp/ep03f.png`
- Vertical: `/tmp/ep03v.png`, and the end frame of each beat in `/tmp/ep03vend.png` and `/tmp/ep03vend2.png`
- Carousel: `/tmp/ep03car.png`
- Single: `/tmp/ep03s.png`

**Things you should know**
- **"Free" on the end card:** the shared `endCard` (yours) shows a "Free" chip. The motion-room skill says "Never say free", so you may want to change it.
- **Typecheck:** `tsc` reports no errors in the ep03 files. The only errors are 3 that already exist in `src/hosts/page.ts` (`Event.key`).
- **Wide crops:** the vertical crops are still fairly wide (1.3–1.79) because the palette and the Main/Trip pair are wide shapes. In 9:16 they fill the full width, not the height.
- **Small sidebar text:** in the wide ⌥Space shot the sidebar labels are about 25px on screen, the same as ep01's wide shots. The camera is pushed in whenever body text matters.
- **Not done yet:** the pieces aren't in `pieces.json` and have no goldens, as you instructed.
