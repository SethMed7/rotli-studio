# Build episode 08 Web

- **Piece:** `ep08Web`
- **Launched:** 2026-09-24 15:32 UTC · **model:** claude-opus-5-5[1m]
- **Cost:** 161,719 tokens · 35 tool calls · 13 min
- **Source:** `6f834591-5513-4f19-a058-1af9a5cdd8f7.jsonl` (extracted by `tools/extract-runs.mjs`)

## Prompt

````markdown
You are building ONE landscape episode for the "Rotli in 30 seconds" series in a code-drawn motion studio. Work ONLY in ~/rotli-studio/motion (a Node/npm project; use `node`, not bun). Always use absolute paths or `cd ~/rotli-studio/motion && ...` in every shell command (cwd resets).

YOUR EPISODE: `ep08Web` — title card lines ["Your folder,", "in your browser."], light (paper) ground, title pose: "walking".
Story (site's own claims — use this wording, invent NO other product claims):
- "Rotli Web: The same editor, folders, tasks, and links in your browser, working in a real folder on your computer. Chrome, Edge, and Arc open the folder directly; Safari and phones aren't supported yet." — NEVER show or mention Safari or phones as working. Do not draw any real browser logos; a generic browser window (tabs + address bar reading a URL like "rotli.co/app") is fine; browser names as plain text are OK.
- "No Mac? Open Rotli Web: the same workspace with no account, and your notes stay in your folder unless you connect chat."
- "Rotli Helper: A small program for Mac, Windows, and Linux. It lets Firefox, Zen, and Brave use your folder, and lets Rotli Web chat through the AI tools already on your computer."
- Mac app: "The whole workspace: the editor, chat with on-device or connected AI, the Librarian, and ⌥Space from anywhere."
Suggested beats: a browser window opens Rotli Web → "Open folder" picks a real folder (a folder picker/sheet) → the same note with tasks and links, edited in the browser → the Helper as a small bridge for Firefox, Zen, Brave → Mac app vs Web side by side ("the same folder") → end card.

REQUIRED READING FIRST (the reference implementation and the shared grammar — match its look and structure exactly):
- src/canvas-core/ep01Write.ts (THE reference episode: timeline 900 frames = 30 s; shots title 0–90 / demo 90–780 / end 780–900; camera push-in; pointer waypoints; lowerThird captions; makeScore; exported `epNNDerive` spec)
- src/canvas-core/studio/series.ts, studio/ui.ts, studio/derive.ts, studio/stage.ts, studio/brandmarks.ts
- src/canvas-core/rotli/kit.ts (C palette, ink, text, fillRR, folder, chip…), rotli/actor.ts (actor, hopAlong, poseAt)
- PoseName list: base, waving, notes, celebrating, ai_chat, searching, knowledge_system, stays_local, inbox, rest, walking, thoughtful, listening, attention (do NOT read quokka/poses.ts, it is huge path data)
- ../.claude/skills/motion-room/SKILL.md

HARD RULES:
1. Create ONLY: src/canvas-core/ep08Web.ts (exporting `export const ep08Web: Film` and `export const ep08Derive: DeriveSpec`) and src/hosts/page-ep08Web.ts (3 lines, copy the ep01 host). Then run `node tools/derive-modules.mjs ep08Web "Your folder,|in your browser." browser`. Do NOT edit any other file (no shared kit/ui/series/derive changes, no pieces.json, no goldens). If you need a helper that doesn't exist, define it locally in your episode file.
2. Same grammar as ep01: titleCard/lowerThird/endCard from studio/series.ts, UI from studio/ui.ts using the LIGHT theme roles, 900 frames, shots on multiples of 15, a camera push-in when UI text would otherwise be small (text must be readable at 1080p; body text ≥ 26px on screen), a pointer for clicks, 4–5 lowerThird caption beats, makeScore with pops on each on-screen event.
3. Flat Rotli look: no glows, gradients, blur or drop-shadow filters; nothing overlaps unintentionally; captions never cover the thing being shown.
4. ep08Derive: vertical beats (each `len` a multiple of 15, 4 beats, frames where the action is visible), 4 slides (settled frames), 1 single. Crops are in the RENDERED episode's screen coordinates (after your camera) and should be squarish (aspect between 0.9 and 1.8); keep crops above y≈860 so lower-third pills aren't captured.
5. VERIFY BY LOOKING: render review sheets with `node tools/frames.mjs ep08Web 40,150,300,450,600,720,850 --out /tmp/ep08 --sheet /tmp/ep08.png --cols 4` and READ the PNG; iterate until it looks right. Do the same for ep08Vertical, ep08Carousel (frames 14,29,44,…) and ep08Single (frame 14). Then `node tools/render.mjs ep08Web --out /tmp/ep08.mp4` and `node tools/still-frames.mjs /tmp/ep08.mp4` must print an empty line (no identical consecutive frames); add gentle motion if not.
6. Do not commit, do not touch ~/rotli, do not run `studio.mjs render all` or golden.

Report back: files created, the final review-sheet paths, the still-frames result, and anything you could not make work.
````

## Follow-ups (sent while or after it ran)

### 2026-09-24 15:41 · notify ep08 of drift/host/check changes

````text
Update from the director: the dead-air check changed, and two helpers now exist in studio/series.ts. (1) `tools/still-frames.mjs <mp4>` now prints two lines ("identical: N" and "windows: …") and exits 1 when any 15-frame window has every frame changing <0.5% of pixels. Your episode must print an EMPTY "windows:" line. (2) `drift(ctx, env, l)` from studio/series.ts: call it right after you set your camera transform (it composes onto the current transform) so UI holds keep a living camera. See ep01Write.ts's camera(). (3) `host(ctx, env, l, { pose })` from studio/series.ts draws a small breathing and swaying quokka bottom-right. Use it during demos where no quokka is on screen, drawn in screen space (reset to the flat transform before calling, then restore your camera). The shared end card and vertical end card are handled by me. Do not edit series.ts or derive.ts yourself.
````

## Report (the agent's own summary, unedited)

Episode 08 ("Your folder, in your browser.") is built and its three derivatives render cleanly. The final video passes the dead-air check: `identical: 0`, an empty `windows:` line, exit 0.

**Files created** (nothing else touched, nothing committed):
- `~/rotli-studio/motion/src/canvas-core/ep08Web.ts` exports `ep08Web: Film` and `ep08Derive: DeriveSpec`.
- `~/rotli-studio/motion/src/hosts/page-ep08Web.ts` is the three-line host, copied from ep01.
- Running `derive-modules.mjs` also wrote `ep08Vertical.ts`, `ep08Carousel.ts` and `ep08Single.ts` in `src/canvas-core/`, plus a `page-*` host for each in `src/hosts/`.

**Structure:** same shape as ep01. Title 0–90 (no. 8, "walking" pose), demo 90–780, end card 780–900. One lower-third caption per beat, and each on-screen event gets a pop in the score, with typing clicks as well. All browser-building helpers are defined inside the episode file.

| Beat | Frames | What happens | Caption |
|---|---|---|---|
| 1 | 90–255 | A generic browser (tabs, address bar typing "rotli.co/app") opens Rotli Web. The pointer clicks "Open folder", a "Choose a folder" picker opens, it picks "Notes" and clicks "Open". | "No Mac? Open Rotli Web." / "Chrome, Edge, and Arc open your folder directly." |
| 2 | 255–435 | The camera pushes in 1.2× on the editor: "Trip plan", a task gets ticked, a task is typed and renders, and a `[[Ferry times]]` link is typed and renders. | "The same editor, in your browser." |
| 3 | 435–555 | The camera eases out. A "Notes, a folder on your computer" file list appears, with trip-plan.md lighting up as a task is ticked, then a "No account" chip. | "Your notes stay in your folder" / "unless you connect chat." |
| 4 | 555–670 | Firefox, Zen and Brave cards (names as plain text, no logos) connect to a "Rotli Helper" card (Mac · Windows · Linux), which connects to "Your folder" and "AI tools on your computer". | "Rotli Helper: Firefox, Zen, and Brave." |
| 5 | 670–780 | The Mac app and a browser window side by side, the same note in both, joined to one "Notes" folder. | "Mac app or web: the same folder." / "Mac app: chat, the Librarian, ⌥Space from anywhere." |

Safari and phones never appear.

**Your mid-task change is in:**
- `drift()` runs right after the camera transform.
- `host()` puts a quokka bottom-right from about frame 255 to 780, drawn with the camera reset; its pose changes with each beat. It replaced my original quokka hopping in at the end.

**Derive spec:** four vertical beats of 90, 105, 105 and 90 frames (open folder, editor, Helper, same folder). Four slides at frames 214, 425, 545 and 660, and one single at 425. Every crop is in rendered screen coordinates, with aspect ratios between 1.16 and 1.77 and bottoms at or above y=860, so no caption pills get captured.

**Review sheets (all checked by eye):**
- `/tmp/ep08.png` (frames 40, 150, 300, 450, 600, 720, 850)
- `/tmp/ep08v.png` (vertical)
- `/tmp/ep08c.png` (carousel, frames 14–89)
- `/tmp/ep08s/f0014.png` (single)
- The video is at `/tmp/ep08.mp4`.

**Things I couldn't fix without editing shared files:**
- The shared end card shows a "Free" chip and the single's footer reads "rotli.co · Free for Mac". Both come from `series.ts` and `derive.ts`, which you said you're handling. The skill rules say never to say free, so they need a look.
- The Mac window uses the shared `appFrame`, whose sidebar text is 24–25px, just under the 26px floor. ep01 has the same thing.
- In the Mac-app/browser beat the vertical crop covers 1320px, so task text comes out at about 21px in the 9:16 cut.
