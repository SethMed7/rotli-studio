# Build episode 07 Secure

- **Piece:** `ep07Secure`
- **Launched:** 2026-09-24 15:32 UTC · **model:** claude-opus-5-5[1m]
- **Cost:** 189,206 tokens · 37 tool calls · 12.9 min
- **Source:** `6f834591-5513-4f19-a058-1af9a5cdd8f7.jsonl` (extracted by `tools/extract-runs.mjs`)

## Prompt

````markdown
You are building ONE landscape episode for the "Rotli in 30 seconds" series in a code-drawn motion studio. Work ONLY in ~/rotli-studio/motion (a Node/npm project; use `node`, not bun). Always use absolute paths or `cd ~/rotli-studio/motion && ...` in every shell command (cwd resets).

YOUR EPISODE: `ep07Secure` — title card lines ["AI is invited in.", "It does not own the house."], DARK ground (series `ground(ctx, f, true)` / titleCard dark:true; UI in the DARK theme roles from studio/ui.ts), title pose: "stays_local".
Story (site's own claims — use this wording, invent NO other product claims):
- "No account, no tracking. Nothing to sign up for. No analytics, ads, or crash uploads."
- "Leave it off, run a model on your Mac, or connect the tools you already use."
- "Secure notes never reach a remote model; locked notes can't be edited by any." — Secure: a note marked secure (lock icon); remote model clouds are refused; an on-device model may read it. Lock: every model can still read a locked note, none can edit it (show an AI edit attempt refused on a locked note).
- (From the README, OK to show: Rotli also recognizes common secret shapes — API keys, private keys, card and identity numbers — and treats them the same way. Use obviously fake example values like sk-test-XXXX; never realistic secrets.)
Suggested beats: three choices (off / on your Mac / tools you use) → mark a note secure → a remote cloud is refused at the boundary, the on-device chip reads it → a pasted fake API key gets flagged secure → a locked note refuses an AI edit → end card.

REQUIRED READING FIRST (the reference implementation and the shared grammar — match its look and structure exactly):
- src/canvas-core/ep01Write.ts (THE reference episode: timeline 900 frames = 30 s; shots title 0–90 / demo 90–780 / end 780–900; camera push-in; pointer waypoints; lowerThird captions (pass dark=true on dark ground); makeScore; exported `epNNDerive` spec)
- src/canvas-core/studio/series.ts, studio/ui.ts, studio/derive.ts, studio/stage.ts, studio/brandmarks.ts
- src/canvas-core/rotli/kit.ts (C palette incl. night*, ink, text, fillRR, card, chip, cloud, lockIcon…), rotli/actor.ts, rotli/shotsNight.ts (the film's secure shot with the dome/clouds/on-device chip — reuse the look, do not import its shot functions)
- PoseName list: base, waving, notes, celebrating, ai_chat, searching, knowledge_system, stays_local, inbox, rest, walking, thoughtful, listening, attention (do NOT read quokka/poses.ts, it is huge path data)
- ../.claude/skills/motion-room/SKILL.md

HARD RULES:
1. Create ONLY: src/canvas-core/ep07Secure.ts (exporting `export const ep07Secure: Film` and `export const ep07Derive: DeriveSpec`) and src/hosts/page-ep07Secure.ts (3 lines, copy the ep01 host). Then run `node tools/derive-modules.mjs ep07Secure "AI is invited in.|It does not own the house." house`. Do NOT edit any other file (no shared kit/ui/series/derive changes, no pieces.json, no goldens). If you need a helper that doesn't exist, define it locally in your episode file. NOTE: derivatives render on a light paper ground with your dark frames inside them — intended.
2. Same grammar as ep01: titleCard/lowerThird/endCard from studio/series.ts, 900 frames, shots on multiples of 15, a camera push-in when UI text would otherwise be small (text must be readable at 1080p; body text ≥ 26px on screen), a pointer where something is clicked, 4–5 lowerThird caption beats, makeScore with pops on each on-screen event.
3. Flat Rotli look: no glows, gradients, blur or drop-shadow filters; nothing overlaps unintentionally; captions never cover the thing being shown.
4. ep07Derive: vertical beats (each `len` a multiple of 15, 4 beats, frames where the action is visible), 4 slides (settled frames), 1 single. Crops are in the RENDERED episode's screen coordinates and should be squarish (aspect between 0.9 and 1.8); keep crops above y≈860 so lower-third pills aren't captured.
5. VERIFY BY LOOKING: render review sheets with `node tools/frames.mjs ep07Secure 40,150,300,450,600,720,850 --out /tmp/ep07 --sheet /tmp/ep07.png --cols 4` and READ the PNG; iterate until it looks right. Do the same for ep07Vertical, ep07Carousel (frames 14,29,44,…) and ep07Single (frame 14). Then `node tools/render.mjs ep07Secure --out /tmp/ep07.mp4` and `node tools/still-frames.mjs /tmp/ep07.mp4` must print an empty line (no identical consecutive frames); add gentle motion if not.
6. Do not commit, do not touch ~/rotli, do not run `studio.mjs render all` or golden.

Report back: files created, the final review-sheet paths, the still-frames result, and anything you could not make work.
````

## Follow-ups (sent while or after it ran)

### 2026-09-24 15:41 · notify ep07 of drift/host/check changes

````text
Update from the director: the dead-air check changed, and two helpers now exist in studio/series.ts. (1) `tools/still-frames.mjs <mp4>` now prints two lines ("identical: N" and "windows: …") and exits 1 when any 15-frame window has every frame changing <0.5% of pixels. Your episode must print an EMPTY "windows:" line. (2) `drift(ctx, env, l)` from studio/series.ts: call it right after you set your camera transform (it composes onto the current transform) so UI holds keep a living camera. See ep01Write.ts's camera(). (3) `host(ctx, env, l, { pose, dark: true })` from studio/series.ts draws a small breathing and swaying quokka bottom-right. Use it during demos where no quokka is on screen, drawn in screen space (reset to the flat transform before calling, then restore your camera). The shared end card and vertical end card are handled by me. Do not edit series.ts or derive.ts yourself.
````

## Report (the agent's own summary, unedited)

Episode 07 (`ep07Secure`) is built and renders cleanly. The dead-air check prints `identical: 0` and an empty `windows:` line, and the episode files type-check. I departed from your instructions twice (the title card and the carousel cover split); both are described below.

**Files**
- Created: `~/rotli-studio/motion/src/canvas-core/ep07Secure.ts` (exports `ep07Secure` and `ep07Derive`) and `~/rotli-studio/motion/src/hosts/page-ep07Secure.ts`.
- Generated by `derive-modules.mjs`: `ep07Vertical.ts`, `ep07Carousel.ts`, `ep07Single.ts` and their three `page-*.ts` hosts.
- No shared files, `pieces.json` or goldens were touched.

**What the episode does**
- **Structure:** 900 frames on a dark ground, with the title, demo and end card at the same frames as ep01.
- **Layout:** a dark-theme app window sits inside a dashed "on this Mac" boundary. The on-device chip, with the quokka under it, is in a column to the right of the window, and remote-model clouds wait outside the boundary.
- **Beats, each with its own caption** in the site's wording:
  1. Three nag dialogs ("Create an account", "Allow tracking?", "Send crash report?") get struck through and fall away.
  2. The AI settings offer Off / On your Mac / Your tools. The pointer picks "On your Mac" and the chip pops in.
  3. The Health note is marked Secure. Two clouds bounce off the boundary ("refused") while the chip reads the note ("can read").
  4. A fake `sk-test-XXXXXXXXXXXX` is typed, highlighted, and flagged "Looks like an API key", and the note turns secure.
  5. The Trip plan note is locked. The chip reads it, its edit bounces back ("can't edit"), and the quokka celebrates.
- **Grammar:** the camera pushes in to 1.2× on the settings and the key, then pulls back wide for the boundary beats, with your `drift` added. `host` fills the corner until the quokka takes its place in the column at frame 356. `makeScore` has a pop on every event, typing clicks, and a thump when each cloud or the edit is refused.
- **Derive spec:** 4 vertical beats (105, 90, 90, 105 frames), 4 slides at settled frames, and 1 single. Every crop has an aspect between 0.9 and 1.8 and ends at or above y=860.

**Where I departed from your instructions**
1. **Title card:** the shared `titleCard` puts the quokka at x=1480, where it covers the end of "It does not own the house." at 100px. I copied `titleCard` into the episode with the quokka moved to x=1680 and a gentle sway added. The sway also cleared the 5 identical frames in the title hold. A small `x` option on `titleCard` would let me go back to the shared one.
2. **Carousel cover:** at the shared 96px size, "It does not own the house." runs past the 1080px frame. I re-ran the generator as `"AI is invited in.|It does not own|the house." house`, which only changes the cover to three lines.

**Review sheets (checked by eye)**
- `/tmp/ep07.png` (episode frames 40, 150, 300, 450, 600, 720, 850)
- `/tmp/ep07v.png` (vertical)
- `/tmp/ep07c.png` (carousel)
- `/tmp/ep07s.png` (single)
- Video: `/tmp/ep07.mp4`

**Left for you**
- The last vertical beat and the single use a wide crop, so their UI text is small, though still legible.
- The vertical end card's tagline is faded at frame 420; that's the shared end card, which you said you're handling.
- The shared end card shows a "Free" chip, but the motion-room SKILL rules say "Never say free".
