# Build study 45 Terminal Boot

- **Piece:** `terminalBoot`
- **Launched:** 2026-09-29 01:12 UTC · **model:** claude-opus-5-5[1m]
- **Cost:** 214,622 tokens · 50 tool calls · 40.6 min
- **Source:** `c74bb602-6202-4ec5-8b02-3569895eeb14.jsonl` (extracted by `tools/extract-runs.mjs`)

## Prompt

````markdown
Your full task is in ~/rotli-studio/motion/series/studies/prompts/terminal-boot.prompt.md — read it and follow it exactly. Then read ~/rotli-studio/tmp/studies-27-50/builder-extra.md: extra rules for this build wave (other agents are building other studies in parallel). Build the study, verify it by looking, and report as both files ask.
````

## Report (the agent's own summary, unedited)

Study 45, Terminal Boot, is built in both sizes and passes every check. Nothing is committed or registered, and nothing outside `~/rotli-studio/motion` was touched.

**Files created** (all in `~/rotli-studio/motion/`):
- `src/canvas-core/studies/terminalBoot.ts`, which exports `terminalBoot` and `terminalBootVertical` from one `make(size, id)` factory.
- `src/hosts/page-terminalBoot.ts`
- `src/hosts/page-terminalBootVertical.ts`

**Checks, final renders** (`/tmp/terminalBoot.mp4`, `/tmp/terminalBootVertical.mp4`):

| Check | Landscape | Vertical |
|---|---|---|
| still-frames `windows:` | empty | empty |
| loudness `I:` | −16.1 LUFS | −16.1 LUFS |
| critique pace | 2.1 changes per 10 s, longest calm 9.1 s from 00:00.4 | the same |

- `npx tsc`: my file is clean. The only errors come from other agents' hosts whose modules don't exist yet (broadcastPackage, multiplane, recipeFlatlay).
- The loop-seam check doesn't apply (not a loop).

**Sheets:**
- Landscape: `/tmp/terminal-boot-land.png`
- Vertical: `/tmp/terminal-boot-vert.png`
- Critique sheets: `/tmp/critique-terminalBoot/` and `/tmp/critique-terminalBootVertical/`

**What it does:**
- All six story beats are in, with cuts at 0/60/180/330/480/600, every one on the 15-frame beat.
- Text is drawn one glyph per cell. This stops JetBrains Mono from joining `--` into one long dash.
- Box edges, the progress bar, busy cells (drawn as dense stripes), the cursor and the arrow are strokes and rects snapped to the grid. Ticks are the word "ok". Muted green is never used for text.
- The week data is checked when the module loads. The build fails if there aren't exactly 26 busy blocks, if Thu 14:00 isn't the only slot free for all four, or if kai's Friday isn't fully busy.
- In the vertical, the command breaks after `--everyone`, the week is transposed (days × hours as rows, people as columns, so the scan is a row sweeping down), and the end lockup sits in the upper middle.

**Where I departed from the brief:**
1. **Sound:** I used `mood: "drive"` with `drop: 330`, not "soft". The kit's soft mood has no drums, so "drums enter at 330" can't happen with it. Every cue listed in the brief is in the score.
2. **Typing:** a Tab completes `--ev` to `--everyone `. Without it, 47 keys at 2–5 frames each plus pauses before the flags can't fit before Enter at frame 285. The final command string is exact, and the timing is seeded, checked at load, and the same in both sizes.
3. **Camera:** I added a push-in on the monitor with slow drift in every section, for readability on a phone and so holds keep moving. Zoom is about 1.4–1.45× on the boot and command, 1.1× on the week, 1.3× on the booking and 1.2× at the end; the vertical stays near 1× because it has no spare width.
4. **Flashes:** short screen flashes on Enter, at 330, 480 and 600, each landing on a sound hit.
5. **Refresh band:** +5% instead of about +4%, with a crisp leading edge and a fading tail. At +4% soft, the dark holds failed the still-frames check.
6. **Smaller choices:**
   - The amber `[warn]` line glows amber, not green.
   - The two-frame trail is drawn on every frame, not only while text scrolls.
   - The week is shown as a full-screen app: the terminal comes back when it closes, and a status line runs along the bottom.

**Self-critique** (both sizes): hook 8, readability 7, motion 8, variety 7, composition 8, accuracy 9, sync 8.

**Problems that remain:**
- **Readability (7):** 30 px type on an 80-column grid is the brief's spec. With the push-in it is still only about 8–10 px on a 360 px phone feed, and the vertical can't zoom further.
- **Variety (7):** the critique tool counts only abrupt changes, and the boot and typing glide by design. The longest calm, 0:00.4–0:09.5, is continuous typing and boot lines. I chose not to add more flashes.
- **Composition:** the terminal fills from the top, so there is empty space low on the screen from the boot through the booking, most noticeably in the vertical.
- **Vertical detail:** the arrow pointing at Thu 14:00 is small, one cell in the margin.

**With more time**, I would add a second, softer line of scan ticks for the sound, and a small drawn check after each "ok".
