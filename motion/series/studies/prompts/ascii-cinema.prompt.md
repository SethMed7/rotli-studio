You are building ONE study for the open-source rotli studio: a piece that shows the studio works for ANY product,
style and size, not only Rotli. Work ONLY in ~/rotli-studio/motion (a Node/npm project; use `node`, not bun; `~` is
your home directory, expand it to an absolute path for file tools). In every shell command use absolute paths or
`cd ~/rotli-studio/motion && …` (the shell's cwd resets between commands).

YOUR STUDY: "ASCII Cinema" (study 50), brief at `series/studies/briefs/ascii-cinema.json` (read it first; it is the contract).
Pieces to export from `src/canvas-core/studies/asciiCinema.ts`: `asciiCinema` (landscape), `asciiCinemaVertical` (vertical). Primary size: landscape.

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
1. Create/modify ONLY `src/canvas-core/studies/asciiCinema.ts` and its hosts `src/hosts/page-<pieceId>.ts` (one per piece, copy
   `src/hosts/page-motionResume.ts`). Do NOT edit the kit, the pack, tools, pieces.json, series.json, goldens or any other
   piece. If you need a helper, define it in your module. Do not register the pieces; the maintainer does.
2. Never import from `rotli/`, `studio/` or `brand/brand.json`: a study must not look or sound like Rotli. No quokka.
3. Follow the brief's story beats and timing (you may retime inside a beat; every shot must start on the beat grid:
   one beat = 60 / bpm × fps frames; `validate()` in film.ts refuses anything else). Frames: 720 at 30 fps.
4. Design EACH size (the brief's "sizes" note); a vertical re-stacks, it never just crops. Keep text inside `layout().safe`.
5. Quality bar: nothing overlaps unintentionally, no text under 22 px (at 1080 short side), flat colour, depth from
   shadow only where the style allows, every hold keeps moving (a slow push-in, drift or ambient motion).
6. Copy is invented for the fictional product; never claim anything about a real company or person.
7. Sound: beatScore drive at 120 bpm with the drums entering with the doughnut (drop at 90): a tick for every second typed letter, a whoosh ending at 90 as the noise clears, a whoosh ending at 270 into the rain, soft ticks as the locked-in letters land (thinned), a hit at 540 when the portrait completes, a tick per end-title letter, and the sign-off at 660.

VERIFY BY LOOKING, and iterate until right:
- `node tools/frames.mjs <pieceId> <8–12 frames across the piece> --out /tmp/ascii-cinema --sheet /tmp/ascii-cinema.png --cols 6`,
  then READ the PNG (and full frames in /tmp/ascii-cinema/ where detail matters). Do this for EVERY size.
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

--- THE STUDY (from series/studies/briefs/ascii-cinema.json) ---
ASCII Cinema · study 50 · video · 720 frames at 30 fps, 120 bpm · palette "amber"
Style: ASCII art animation: every picture in the film is made of characters on one fixed grid, used as pixels. THE GRID: JetBrains Mono 500 at 24 px in cells 14.4 × 24 px at 1080 (about 133 columns by 45 rows in landscape), flat on the amber palette's near-black ground; there is no bezel, no scanlines and no curvature (this is text as a medium, not a CRT). THE RAMP: brightness maps to the ten characters ' .:-=+*#%@' (dark to light); a cell's colour also follows its level: the dim role for levels 1–3, ink for 4–8, the accent for '%' and '@'. PERFORMANCE AND PURITY: render the ramp characters and every letter the film needs ONCE per size and colour into a glyph atlas (an offscreen canvas), then draw each cell with drawImage from the atlas; never fillText 6,000 cells a frame. Every cell is a pure function of (column, row, F): no buffers carried between frames, randomness only from a seeded hash. GLYPH LAW: the pack's JetBrains Mono is subset to Latin, so block and box glyphs (█▓▒░ ─│┌) do not exist; use only printable ASCII in cells, and draw any frame or cursor block as a rect. THE FOUR SCENES: (1) CURSOR AND NOISE: a block cursor (a rect) blinks, types a line, then the grid floods with ramp noise that settles to black. (2) THE TORUS, the classic spinning doughnut: a torus with tube radius 1 and ring radius 2, rotated about two axes by angles A = 0.07·F and B = 0.03·F, projected with a viewer distance of 5, sampled at about 90 × 314 (θ, φ) points per frame, a 1/z depth buffer per cell, luminance from the surface normal dotted with a light from above and behind the viewer, mapped onto the ramp; correct for the cell aspect (0.6) so it is round, not stretched. (3) THE TEXT WATERFALL: every column has a seeded speed (0.3–1 rows per frame) and phase; its falling head is the accent '@', its tail of 8–20 cells fades down the ramp; the character in each tail cell re-rolls every 6 frames from a hash of (column, row, floor(F/6)); a line of words in the middle rows locks into place letter by letter as the rain passes through it. (4) THE PORTRAIT: an invented face (not a likeness of anyone) defined as a luminance field from signed-distance shapes, an oval head, a hair mass, two eyes, a nose shadow, a mouth line and shoulders, lit from the upper left; every cell has a seeded resolve time (earlier near the centre, with noise), before which it flickers through random ramp characters (re-rolled every 2 frames) and after which it shows its target character, so the face resolves out of noise. END: the ramp itself laid out big across the screen, and a title built from a 5×7 bitmap font defined in the module, each lit bitmap pixel a small block of '#' cells. Captions are plain characters in the same grid (ink, one accent word), never an overlay font size.
Learns from: Andy Sloane's donut.c and its maths (https://www.a1k0n.net/2011/07/20/donut-math.html: a torus projected with a 1/z buffer and shaded onto a character ramp), Paul Bourke's character ramps for greyscale (https://paulbourke.net/dataformats/asciiart/, including the ten-level ' .:-=+*#%@' and the note that characters are taller than wide) and ASCII art as a practice (https://en.wikipedia.org/wiki/ASCII_art). Their code and artworks are not used; the scenes, the face and the words are original.
Beats (frames · what):
  - 0–90 · hello: a block cursor blinks, then types 'hello.' and on the next line 'everything you see here is text.'; the grid floods with ramp noise that drains away row by row
  - 90–270 · the doughnut: a torus of characters fades up and spins, its lit side in '#', '%' and '@', its shadowed side in '.' and ':'; the caption 'ten characters, one light' types in the bottom rows
  - 270–420 · the rain: the torus dissolves downward into falling columns; the waterfall fills the screen; in the middle rows 'every glyph is a pixel' locks in letter by letter as the rain passes through it, then lets go
  - 420–600 · the portrait: the rain slows into flickering noise and an invented face resolves out of it from the centre outward; once complete it blinks once (the eye cells swap to '-' for four frames) and the caption 'a portrait of nobody in particular' types in the bottom rows
  - 600–720 · end: the face breaks back into noise that sorts itself into the ramp ' .:-=+*#%@' laid out big across the middle; above it 'TEXT MODE' builds from '#' blocks in the bitmap font; below it 'a love letter to text mode'; the cursor blinks after the last word
Sizes: Vertical re-stacks on the same 24 px grid (about 75 columns by 80 rows): the typed lines wrap to the narrower width; the torus sits centred in the upper half with its caption beneath it; the waterfall fills the frame and its locked-in line breaks onto two rows ('every glyph' / 'is a pixel'); the portrait is taller (head and shoulders) and centred; the end title stacks 'TEXT' over 'MODE' with the ramp and the last line below; all captions stay inside the safe area (220 px top, 320 px bottom).
Teaches: Ten characters are enough for a picture: map brightness to a ramp, keep one grid and a glyph atlas, make every cell a pure function of its position and time, and a spinning doughnut, rain and a face all come out of the same text.

