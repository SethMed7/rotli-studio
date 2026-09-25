# Build episode 06 Chat

- **Piece:** `ep06Chat`
- **Launched:** 2026-09-24 15:31 UTC · **model:** claude-opus-5-5[1m]
- **Cost:** 170,619 tokens · 35 tool calls · 12.2 min + 179,327 tokens · 6 tool calls · 0.8 min
- **Source:** `6f834591-5513-4f19-a058-1af9a5cdd8f7.jsonl` (extracted by `tools/extract-runs.mjs`)

## Prompt

````markdown
You are building ONE landscape episode for the "Rotli in 30 seconds" series in a code-drawn motion studio. Work ONLY in ~/rotli-studio/motion (a Node/npm project; use `node`, not bun). Always use absolute paths or `cd ~/rotli-studio/motion && ...` in every shell command (cwd resets).

YOUR EPISODE: `ep06Chat` — title card lines ["Ask your notes."], light (paper) ground, title pose: "ai_chat".
Story (site's own claims — use this wording, invent NO other product claims):
- "Chat reads the vault you are in, or the note you started it from, and answers from what is actually there."
- "After every reply, rotli rewrites a short 'Conversation notes' section: decisions, facts worth keeping, action items, open questions. The chat itself is saved as Markdown too." (site example lines: "Mac beta shipped; pricing page in progress." / "Decision: record the demo before launch day." / "Action: Maya records the demo." / "Open: who reviews the pricing copy?" — you may use a trip-planning version instead, e.g. about Rottnest)
- "In the Mac app, ask for a new note or an edit and it makes the change in your folder. It can also make a Word document, a PDF, or a board, filed beside the chat."
- "Want AI to stop touching a note? Lock it. Every model can still read it; none can edit it." (optional short beat)
- Models: "A model that runs on your Mac, or the tools you already use, like Claude Code and Codex." (text only, no logos)
Suggested beats: a question typed into Chat → answer streams, grounded in named notes → Conversation notes section fills (Decisions / Facts / Actions / Open) → ask "make this a PDF" → a PDF file appears filed beside the chat (in a small file list) → end card.

REQUIRED READING FIRST (the reference implementation and the shared grammar — match its look and structure exactly):
- src/canvas-core/ep01Write.ts (THE reference episode: timeline 900 frames = 30 s; shots title 0–90 / demo 90–780 / end 780–900; camera push-in; pointer waypoints; lowerThird captions; makeScore; exported `epNNDerive` spec)
- src/canvas-core/studio/series.ts, studio/ui.ts (fileList, pointer, para, heading…), studio/derive.ts, studio/stage.ts, studio/brandmarks.ts
- src/canvas-core/rotli/kit.ts (C palette, ink, text, fillRR, chip…), rotli/actor.ts, rotli/shotsApp.ts (the film's chat shot, for the look — do not import its shot functions)
- PoseName list: base, waving, notes, celebrating, ai_chat, searching, knowledge_system, stays_local, inbox, rest, walking, thoughtful, listening, attention (do NOT read quokka/poses.ts, it is huge path data)
- ../.claude/skills/motion-room/SKILL.md

HARD RULES:
1. Create ONLY: src/canvas-core/ep06Chat.ts (exporting `export const ep06Chat: Film` and `export const ep06Derive: DeriveSpec`) and src/hosts/page-ep06Chat.ts (3 lines, copy the ep01 host). Then run `node tools/derive-modules.mjs ep06Chat "Ask your notes." notes`. Do NOT edit any other file (no shared kit/ui/series/derive changes, no pieces.json, no goldens). If you need a helper that doesn't exist, define it locally in your episode file.
2. Same grammar as ep01: titleCard/lowerThird/endCard from studio/series.ts, UI from studio/ui.ts using the LIGHT theme roles, 900 frames, shots on multiples of 15, a camera push-in when UI text would otherwise be small (text must be readable at 1080p; body text ≥ 26px on screen), a pointer for clicks, 4–5 lowerThird caption beats, makeScore with pops on each on-screen event and `clicks` for typing.
3. Flat Rotli look: no glows, gradients, blur or drop-shadow filters; nothing overlaps unintentionally; captions never cover the thing being shown.
4. ep06Derive: vertical beats (each `len` a multiple of 15, 4 beats, frames where the action is visible), 4 slides (settled frames), 1 single. Crops are in the RENDERED episode's screen coordinates (after your camera) and should be squarish (aspect between 0.9 and 1.8); keep crops above y≈860 so lower-third pills aren't captured.
5. VERIFY BY LOOKING: render review sheets with `node tools/frames.mjs ep06Chat 40,150,300,450,600,720,850 --out /tmp/ep06 --sheet /tmp/ep06.png --cols 4` and READ the PNG; iterate until it looks right. Do the same for ep06Vertical, ep06Carousel (frames 14,29,44,…) and ep06Single (frame 14). Then `node tools/render.mjs ep06Chat --out /tmp/ep06.mp4` and `node tools/still-frames.mjs /tmp/ep06.mp4` must print an empty line (no identical consecutive frames); add gentle motion if not.
6. Do not commit, do not touch ~/rotli, do not run `studio.mjs render all` or golden.

Report back: files created, the final review-sheet paths, the still-frames result, and anything you could not make work.
````

## Follow-ups (sent while or after it ran)

### 2026-09-24 15:41 · notify ep06 of drift/host/check changes

````text
Update from the director: the dead-air check changed, and two helpers now exist in studio/series.ts. (1) `tools/still-frames.mjs <mp4>` now prints two lines ("identical: N" and "windows: …") and exits 1 when any 15-frame window has every frame changing <0.5% of pixels. Your episode must print an EMPTY "windows:" line. (2) `drift(ctx, env, l)` from studio/series.ts: call it right after you set your camera transform (it composes onto the current transform) so UI holds keep a living camera. See ep01Write.ts's camera(). (3) `host(ctx, env, l, { pose })` from studio/series.ts draws a small breathing and swaying quokka bottom-right. Use it during demos where no quokka is on screen, drawn in screen space (reset to the flat transform before calling, then restore your camera). The shared end card and vertical end card are handled by me. Do not edit series.ts or derive.ts yourself.
````

### 2026-09-24 15:44 · ep06 polish: clipped sidebar fragments

````text
One polish fix for ep06Chat: while the camera is pushed in (roughly frames 150–720), clipped sidebar words such as "es" and "list" peek in at the far-left edge of the frame (x≈0–30). They read as artifacts. Either hide the sidebar text during the push-in, or adjust the camera x-anchor so the window's left edge sits either fully on screen or cleanly off it with no partial words. Keep everything else the same. Re-render the sheet, re-run still-frames on a fresh mp4 (the windows: line must stay empty), and make sure the ep06Derive crops still frame their content. Report back briefly.
````

## Report (the agent's own summary, unedited)

### Report 1 · 2026-09-24 15:44

I built `ep06Chat` ("Ask your notes.", light ground, `ai_chat` pose) and all three derivatives, and every review sheet looks right. The 30-second render passes the new dead-air check: it printed `identical: 0` and an empty `windows:` line, exit 0. It typechecks, and I committed nothing.

**Files created** (no other file touched):
- `~/rotli-studio/motion/src/canvas-core/ep06Chat.ts`, which exports `ep06Chat: Film` and `ep06Derive: DeriveSpec`
- `~/rotli-studio/motion/src/hosts/page-ep06Chat.ts`
- Six files generated by `node tools/derive-modules.mjs ep06Chat "Ask your notes." notes`: `ep06Vertical.ts`, `ep06Carousel.ts` and `ep06Single.ts` in `src/canvas-core/`, plus a `page-ep06*.ts` host for each in `src/hosts/`.

**How it plays:** the grammar matches ep01: 900 frames, title 0–90, demo 90–780, end 780–900.
1. The question "What's left before Rottnest?" is typed and the pointer clicks send.
2. "Read" chips appear for the three notes it used (Trip plan, Ferry times, Packing list), then the answer streams in.
3. A Conversation notes panel fills in: Decision, Fact, Action, Open.
4. The file list shows `chats/rottnest-trip.md` ("this chat").
5. "Make this a PDF." is sent, and `rottnest-plan.pdf` pops in beside the chat file (the turn, frame 556). The notes panel shows an "updated" badge.
6. The model picker opens: On this Mac (current, tinted row), Claude Code, Codex.
7. The camera pulls back and the pointer selects the chat's `.md` file.

The camera pushes in to 1.15× with your new `drift`, and the `host` quokka stays bottom-right throughout. There are five captions, reworded from the site claims only. Pops and typing clicks are in `makeScore`. The message box sits above the caption zone, so captions never cover it.

**Deviations from the brief:**
- **Lock beat dropped:** it was optional, and 30 seconds was already full with five captions.
- **Derive crops:** vertical beats 1 and 4 share the same crop over the chat column. Vertical beat 3 is 720×770 (aspect 0.94), which is fine for 9:16 but too tall for the carousel, so carousel slide 3 uses a separate crop (aspect 1.45). The single is frame 624 (aspect 1.8). I moved it from 600 because at 600 the drift pushed the message box half out of the crop. 624 is a caption-free gap, so the crop can run to y=880 without catching a caption pill.

**Review sheets:**
- Landscape: `/tmp/ep06.png`, with extra event-frame sheets at `/tmp/ep06b.png` and `/tmp/ep06c.png`
- Vertical: `/tmp/ep06v.png`
- Carousel: `/tmp/ep06k.png`
- Single: `/tmp/ep06s/f0014.png` (sheet `/tmp/ep06s.png`)
- Video: `/tmp/ep06.mp4`

**Things to know:**
- In the first 3 frames of vertical beat 1, the chat is still empty; the question bubble pops at frame 168 of the episode.
- The model dropdown briefly covers part of the first question bubble. That's the menu opening over the chat, as intended.
- I didn't run `golden` or `studio.mjs render all`, and I didn't add anything to `pieces.json`, as instructed.

### Report 2 · 2026-09-24 15:45

The clipped sidebar words ("es", "list") no longer show at the left edge while the camera is pushed in (frames 126–715). The dead-air check on a fresh `/tmp/ep06.mp4` still passes: `identical: 0`, an empty `windows:` line, exit 0.

- **Fix:** in `~/rotli-studio/motion/src/canvas-core/ep06Chat.ts`, I moved the camera's x-anchor from 275 to 335. That puts the whole sidebar off screen during the push-in, even with the drift. Only the sidebar's divider line shows at the left edge (screen x≈98), as a clean line. The window's right edge stays on screen. The wide shots are unchanged.
- **Crops:** every `ep06Derive` crop on a pushed-in frame moved left by about 69px (the same shift). Reading the vertical, carousel and single sheets, each still frames its content: the chat column, the Conversation notes panel, the notes and file list, the model picker, and the whole single view.
- **Everything else** is the same: timing, captions, score and layout.

Sheets are re-rendered at `/tmp/ep06.png`, `/tmp/ep06v.png`, `/tmp/ep06k.png` and `/tmp/ep06s/f0014.png`. Nothing is committed, and no other file changed.
