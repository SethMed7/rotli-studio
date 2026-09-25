# Build study: Morph Launch

- **Piece:** `morphLaunch`
- **Launched:** 2026-09-25 20:26 UTC · **model:** claude-opus-5-5[1m]
- **Cost:** 242,180 tokens · 41 tool calls · 27.5 min
- **Source:** `6f834591-5513-4f19-a058-1af9a5cdd8f7.jsonl` (extracted by `tools/extract-runs.mjs`)

## Prompt

````markdown
Read the file ~/rotli-studio/motion/series/studies/prompts/morph-launch.prompt.md and follow it exactly: it is your full task (build study 21 "Morph Launch" in ~/rotli-studio/motion, both sizes, verify by looking, report back).

Extra notes for this study:
- It runs at 60 fps (1440 frames, beat = 30 frames). Keep per-frame cost reasonable: blur via small offscreen canvases scaled back up (see the blur helper in src/canvas-core/core.ts; there is NO ctx.filter). Cache nothing across frames that depends on frame order; pure functions of the frame only (caching static assets like a pre-blurred blob sprite keyed by size is fine).
- The whole point is ONE CONTINUOUS TAKE: every transition is a morph of a shape into the next (interpolated rect x/y/w/h/radius/fill), never a cut or crossfade between unrelated frames. Check the contact sheet with frames every ~60 frames AND a few dense runs (e.g. 360–540 every 15 frames) to prove each morph reads.
- Colours only from the "sunset" palette in the pack; the mesh gradient uses accent, accent2, deep and ground as blobs. Do not use blue/cyan gradients.
- For still-frames: long typing / holds must keep moving (gradient drift, slow push-in, focus breathing).
- Do not edit anything outside your module and its two hosts. Do not commit.
````

## Report (the agent's own summary, unedited)

Study 21 "Morph Launch" is built in both sizes and passes every check. Nothing is committed or registered in `pieces.json`/`series.json`; that's left for the maintainer.

**Files created** (the only three I touched):
- `~/rotli-studio/motion/src/canvas-core/studies/morphLaunch.ts` exports `morphLaunch` (landscape) and `morphLaunchVertical`. It follows `motionResume`'s structure and uses only the "sunset" palette and Inter 400/600.
- `~/rotli-studio/motion/src/hosts/page-morphLaunch.ts`
- `~/rotli-studio/motion/src/hosts/page-morphLaunchVertical.ts`

**How the one take works:** there is no cut or crossfade anywhere. Each shape is built from the one before it, so the next step always starts exactly where the last one ended. The chain runs:

caption line → glass prompt field → pill → dot → hop onto a white page → mark (the name types in) → dark button → app window.

- The white page shrinks back into the window's edge, so the gradient returns without a cut.
- The calendar tile pops out of the Calendar row's own icon, spins in 3D and unfolds into the week panel.
- The week panel becomes the first notification card, and the last card becomes the end card's glass pill.
- The mesh gradient is drawn under every frame, so "back on the gradient" at 1080 isn't a transition.
- Blur uses a small offscreen canvas scaled back up (no `ctx.filter`). A blurred item inside another blurred item gets its own canvases.
- Depth of field: focus moves across the form as it fills, one toggle turns on per beat (720/750/780/810), and anything the camera isn't reading is blurred.
- Nothing is carried from one frame to the next; only the gradient's small canvas and the blur scratch canvases are reused. Frames take about 25–120 ms each, the heaviest inside the window section.

**Sizes:** vertical is re-stacked, not cropped: two-line captions, a taller phone-width field and window, the four tiles in one column, a taller notification stack, and the end words stacked above and below the pill.

**Checks (after the final change, both sizes):**

| Check | Landscape | Vertical |
|---|---|---|
| `still-frames` `windows:` | empty | empty |
| Loudness | −16.0 LUFS | −16.0 LUFS |
| Consecutive identical frames | 11 | 22 |

- The identical frames pass the gate; I think they come from the very slow gradient drift not changing between some consecutive frames.
- `npx tsc --noEmit -p tsconfig.json` prints nothing.
- Determinism probes: 6/6 hash-identical in both.
- `loop-seam` doesn't apply; this isn't a loop.

**Sheets I read:**
- `/tmp/morph-launch.png` and `/tmp/morph-launch-vertical.png` (whole film)
- `/tmp/morph-launch-dense.png` (the swell and 360–610, every 8–15 frames)
- `/tmp/morph-launch-dense2.png` (896–1400: tile, unfold, panel→card, card→pill)
- Full frames in `/tmp/morph-launch/`, `/tmp/morph-launch-v/` (vertical 0720 and 1200 checked at full size) and the other `/tmp/morph-launch-*` folders.
- Videos: `/tmp/morphLaunch.mp4`, `/tmp/morphLaunchVertical.mp4`

**Fixed while looking:**
- The Start button rendered white.
- The prompt text re-wrapped mid-squeeze.
- The card→pill morph passed over "Agenda drafted".
- The "12" in the Calendar icon was 21 px; it's now 22.9 px.
- The button-wrap morph had no whoosh.

**Liberties and gaps against the brief:**
- **Added motion:** holds initially failed the still-frame check, so I added a sheen that crosses the glass field while it types, two soft ripples as the pill collapses and the dot lifts off, and a slow beacon pulse from the end-card pill. The brief doesn't name these.
- **Key ticks:** they sound for every letter except the 83-character Instructions field, which types at under a frame per letter, so it ticks every other letter to avoid a buzz.
- **End-card layout:** I read "a pill between the words" as "find ⬭ a free hour", then "using ⬭ Oriel". The pill slides to re-centre as the words change.
- **Vertical safe area:** before the camera engages (about 548–600), the vertical window's Start button sits just past `safe.bottom`. Once the camera pans down the form, the title and status chip pass through the top margin. Shortening the vertical window to about 1360 u would fix it.

**With more time:**
- Blur on the out-of-focus UI looks a little blocky at mid radii; a second smoothing pass would help.
- True pitch tilt on the 3D tile (today it only turns about the vertical axis, plus a roll).
- Less empty space above the vertical notification stack.
- Busy blocks in the week panel could carry labels.

**Worktree note:** at the repo root, several files now show as modified that weren't in the session-start snapshot (`CHANGELOG.md`, `README.md`, `deploy/Caddyfile`, `motion/pieces.json`, `motion/series.json`, `scripts/export-site.ts`, `static/motion.html`). I didn't edit any of them, so they're presumably another agent's or the maintainer's concurrent work.
