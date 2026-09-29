You are building ONE study for the open-source rotli studio: a piece that shows the studio works for ANY product,
style and size, not only Rotli. Work ONLY in ~/rotli-studio/motion (a Node/npm project; use `node`, not bun; `~` is
your home directory, expand it to an absolute path for file tools). In every shell command use absolute paths or
`cd ~/rotli-studio/motion && …` (the shell's cwd resets between commands).

YOUR STUDY: "Terminal Boot" (study 45), brief at `series/studies/briefs/terminal-boot.json` (read it first; it is the contract).
Pieces to export from `src/canvas-core/studies/terminalBoot.ts`: `terminalBoot` (landscape), `terminalBootVertical` (vertical). Primary size: landscape.

REQUIRED READING, in order:
1. `series/studies/bible.md`: what a study is and the rules every study keeps.
2. `src/canvas-core/studies/motionResume.ts`: THE reference study. Match its structure: a `make(size, id)` factory
   returning a Film, one continuous `paint(ctx, env, F)` of a fractional frame, shots that only name the sections,
   `layout(size)` for per-size design, the pack for every colour and font, `beatScore` for sound.
3. The brand-neutral kit, `src/canvas-core/kit/`: `pack.ts` (usePack, palettes, faces), `sizes.ts` (SIZES, layout),
   `motion.ts` (clamp, lerp, prog, window01, ease, bezier, spring, track with loop, phase), `type.ts` (text, measure,
   letters, timed), `ui.ts` (rr, card, phone, toggle, check), `depth.ts` (iso, block, blockGrid, project, spiral),
   `blur.ts` (motionBlur), `score.ts` (beatScore), `captions.ts` (ladder: the explainer-reel caption, words stacked in
   mixed sizes with one accent italic key word, arriving one at a time).
4. The pack: `brand/packs/studio/pack.json` (Oriel is a FICTIONAL product; use the palette your brief names;
   faces Inter, Instrument Serif, Instrument Serif Italic, JetBrains Mono).
5. Only if your brief names them: `src/canvas-core/styles/` (riso, print, drafting, storybook…) and `src/canvas-core/core.ts`
   (Gfx, PENCIL/RISOLINE media, halftone, rng, fractal). Read their headers, not every line.

HARD RULES:
1. Create/modify ONLY `src/canvas-core/studies/terminalBoot.ts` and its hosts `src/hosts/page-<pieceId>.ts` (one per piece, copy
   `src/hosts/page-motionResume.ts`). Do NOT edit the kit, the pack, tools, pieces.json, series.json, goldens or any other
   piece. If you need a helper, define it in your module. Do not register the pieces; the maintainer does.
2. Never import from `rotli/`, `studio/` or `brand/brand.json`: a study must not look or sound like Rotli. No quokka.
3. Follow the brief's story beats and timing (you may retime inside a beat; every shot must start on the beat grid:
   one beat = 60 / bpm × fps frames; `validate()` in film.ts refuses anything else). Frames: 720 at 30 fps.
4. Design EACH size (the brief's "sizes" note); a vertical re-stacks, it never just crops. Keep text inside `layout().safe`.
5. Quality bar: nothing overlaps unintentionally, no text under 22 px (at 1080 short side), flat colour, depth from
   shadow only where the style allows, every hold keeps moving (a slow push-in, drift or ambient motion).
6. Copy is invented for the fictional product; never claim anything about a real company or person.
7. Sound: beatScore soft at 120 bpm with the drums entering at the week UI (drop at 330): a hit at 0 for the power-on, a tick per boot-log line, a tick for every second typed key, a hit on Enter (frame 285), a whoosh ending at 330 as the UI box opens, a tick per scan step, a hit at 480 for 'booked', a tick per accepted line, and the sign-off at 630.

VERIFY BY LOOKING, and iterate until right:
- `node tools/frames.mjs <pieceId> <8–12 frames across the piece> --out /tmp/terminal-boot --sheet /tmp/terminal-boot.png --cols 6`,
  then READ the PNG (and full frames in /tmp/terminal-boot/ where detail matters). Do this for EVERY size.
- videos: `node tools/render.mjs <pieceId> --out /tmp/<pieceId>.mp4`, then `node tools/still-frames.mjs /tmp/<pieceId>.mp4`
  must print an EMPTY `windows:` line.
- loops: also `node tools/loop-seam.mjs /tmp/<pieceId>.mp4` must print SEAMLESS.
- loudness (videos): `ffmpeg -nostats -i /tmp/<pieceId>.mp4 -af ebur128 -f null - 2>&1 | grep " I:"` should be about −16 LUFS.
- `npx tsc --noEmit -p tsconfig.json` must print nothing.
- score it (videos): `node tools/critique.mjs /tmp/<pieceId>.mp4`, read all four sheets it writes, and score the piece
  against `workflows/critique.md` (hook, readability, motion, variety, composition, accuracy, sync; 1–10 each). Fix
  anything under 8 and re-score. Put your final scores and the problems you could not fix in your report.
- Do not commit, do not touch ~/rotli, do not run `studio.mjs render all` or golden.

Report back: files created, the final sheet paths, still-frames / loop-seam / loudness results, what you would improve
with more time, and anything you could not make work.

--- THE STUDY (from series/studies/briefs/terminal-boot.json) ---
Terminal Boot · study 45 · video · 720 frames at 30 fps, 120 bpm · palette "terminal"
Style: A green-phosphor CRT terminal that boots and books a meeting from the command line. Everything is JetBrains Mono 500 on a strict character grid: 30 px type (18 px advance, 34 px rows) at 1080, so the landscape screen is about 80 columns by 26 rows and every element snaps to a cell. The SCREEN is a rounded rectangle (about 40 px radius) inside a flat dark bezel in the surface colour; everything drawn on it goes through one offscreen canvas and then these passes, all closed-form: (1) PHOSPHOR GLOW drawn as layered strokes, never a blur filter or shadowBlur: each text run is stroked twice under its fill, once wide (8 px line, accent at 6% alpha) and once narrower (3 px, accent at 15%), then filled in ink (or accent for highlights); (2) PERSISTENCE: while text scrolls, the same text is also drawn at its position two frames earlier at 25% alpha, a pure function of F; (3) SCANLINES: 1 px ground-coloured lines every 3 px at 18% alpha over the whole screen, plus a soft brighter refresh band (about 120 px tall, +4% ink) rolling down on a 90-frame period; (4) CURVATURE: a radial vignette darkening the corners and an optional barrel bulge made by redrawing the screen canvas in 8 px horizontal strips whose x-scale falls off by 3% toward the top and bottom; (5) FLICKER: global brightness 0.96–1.0 from a seeded hash of the frame number. Cursor: a solid block rectangle the size of one cell, blinking on for 8 frames and off for 7 (one beat). Typing is human: seeded per-key intervals of 2–5 frames with a longer pause before flags. GLYPH LAW: the pack's JetBrains Mono is subset to Latin, so box-drawing (─│┌┐└┘├┤┬┴┼), block (█▓▒░) and tick (✓) glyphs do not exist in it: every frame line, progress-bar fill, busy or free cell and tick is a vector stroke or rect snapped to the character grid (a 2 px line through the cell centre for box edges, a full-cell rect for blocks, three vertical densities of 1 px stripes for ░▒▓), and ticks are the word 'ok' or a drawn check path. Colour roles: ink for text, accent (bright green) for highlights, prompts and success, accent2 (amber) for warnings; the palette's muted is below 4.5:1 on the ground, so it is used only for scanlines, grid rules and decoration, never for text. Power-on: a single bright dot flashes, stretches into a horizontal line, then opens vertically to the full raster with a slight overshoot, the whole screen overexposed for a few frames before it settles.
Learns from: The CRT terminal look as recreated by cool-retro-term (https://github.com/Swordfish90/cool-retro-term), the VT100-era video terminal (https://en.wikipedia.org/wiki/VT100) and box-drawing text interfaces (https://en.wikipedia.org/wiki/Box_Drawing): phosphor glow and persistence, scanlines, curved glass, a boot log, a typed command and a character-cell UI. Their code, shaders, fonts and screens are not used; the boot log, the command and the interface are invented.
Beats (frames · what):
  - 0–60 · power on: a dot flashes, stretches into a line and opens into the green raster; the block cursor blinks twice top-left
  - 60–180 · the boot log scrolls in one line per half-beat with persistence trails: 'ORIEL/TTY 0.9', '[ ok ] calendars mounted: 4', '[ ok ] time zones: 3', '[ ok ] working hours loaded', '[warn] kai: out Friday' (amber), '[ ok ] ready'; then a prompt '~ $'
  - 180–330 · the command types at a human cadence: 'oriel book --everyone --len 45m "design review"' and Enter; output 'reading 4 calendars' with a drawn progress bar filling cell by cell 0% → 100%, then '26 busy blocks · 3 time zones'
  - 330–480 · the character-cell UI: a drawn box titled 'WEEK 14' opens; five day columns 'Mon' to 'Fri' and four rows 'ana', 'kai', 'mo', 'lee' fill with busy cells (dense stripes) and free cells (empty); an inverse-video scan column sweeps across the week and stops on the only column free for all four, which flips to accent with a drawn arrow and 'Thu 14:00 · everyone free'
  - 480–600 · booked: the box closes; lines type in: 'booked  Thu 14:00–14:45  design review', then 'ana ok', 'kai ok', 'mo ok', 'lee ok' one per beat in accent, then '4/4 accepted · invites sent'
  - 600–720 · end: the screen clears to a large glowing 'oriel' (JetBrains Mono, about 120 px) with 'find a time from the command line' and 'oriel.example' beneath, a fresh '~ $' prompt with the block cursor blinking; the scanline band keeps rolling
Sizes: Vertical re-stacks to about 48 columns by 40 rows in the same 30 px type: the bezel fills the frame inside the safe area; the boot log wraps its long lines; the command wraps onto two lines after '--everyone'; the week UI is transposed, days as rows and the four people as columns, so it fits the narrow grid; the end lockup stacks 'oriel' over its two lines in the upper-middle of the screen.
Teaches: A CRT is a stack of cheap passes, not a filter: glow from layered strokes, persistence from a second draw a few frames back, scanlines, a vignette and a flicker, all over a strict character grid, make flat text feel like light on glass.

