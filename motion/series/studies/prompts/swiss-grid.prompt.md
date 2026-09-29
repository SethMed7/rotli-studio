You are building ONE study for the open-source rotli studio: a piece that shows the studio works for ANY product,
style and size, not only Rotli. Work ONLY in ~/rotli-studio/motion (a Node/npm project; use `node`, not bun; `~` is
your home directory, expand it to an absolute path for file tools). In every shell command use absolute paths or
`cd ~/rotli-studio/motion && …` (the shell's cwd resets between commands).

YOUR STUDY: "Swiss Grid" (study 33), brief at `series/studies/briefs/swiss-grid.json` (read it first; it is the contract).
Pieces to export from `src/canvas-core/studies/swissGrid.ts`: `swissGridPortrait` (portrait), `swissGrid` (landscape). Primary size: portrait.

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
1. Create/modify ONLY `src/canvas-core/studies/swissGrid.ts` and its hosts `src/hosts/page-<pieceId>.ts` (one per piece, copy
   `src/hosts/page-motionResume.ts`). Do NOT edit the kit, the pack, tools, pieces.json, series.json, goldens or any other
   piece. If you need a helper, define it in your module. Do not register the pieces; the maintainer does.
2. Never import from `rotli/`, `studio/` or `brand/brand.json`: a study must not look or sound like Rotli. No quokka.
3. Follow the brief's story beats and timing (you may retime inside a beat; every shot must start on the beat grid:
   one beat = 60 / bpm × fps frames; `validate()` in film.ts refuses anything else). Frames: 660 at 30 fps.
4. Design EACH size (the brief's "sizes" note); a vertical re-stacks, it never just crops. Keep text inside `layout().safe`.
5. Quality bar: nothing overlaps unintentionally, no text under 22 px (at 1080 short side), flat colour, depth from
   shadow only where the style allows, every hold keeps moving (a slow push-in, drift or ambient motion).
6. Copy is invented for the fictional product; never claim anything about a real company or person.
7. Sound: beatScore drive at 120 bpm with the drums entering at the title (drop at 60); a tick on every snap (thinned so snaps closer than 3 frames share one tick); a hit on each numeral change (frames 150, 210, 270, 330 and 390) and on the start of the recompose (frame 450); the sign-off at frame 570.

VERIFY BY LOOKING, and iterate until right:
- `node tools/frames.mjs <pieceId> <8–12 frames across the piece> --out /tmp/swiss-grid --sheet /tmp/swiss-grid.png --cols 6`,
  then READ the PNG (and full frames in /tmp/swiss-grid/ where detail matters). Do this for EVERY size.
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

--- THE STUDY (from series/studies/briefs/swiss-grid.json) ---
Swiss Grid · study 33 · video · 660 frames at 30 fps, 120 bpm · palette "mono"
Style: A poster-film for an invented lecture series, 'Grid Week', in the International Typographic Style. Strictly three colours: ground (off-white paper), ink (black) and accent (red). The palette's accent2 (blue) is NOT used anywhere, and neither is any tint, gradient or shadow. THE GRID IS VISIBLE and everything obeys it: portrait uses 6 columns × 8 rows of modules inside 64 px margins with 16 px gutters and a 12 px baseline grid; landscape uses 12 columns × 6 rows. Grid lines are 1 px hairlines in the line colour (baseline lines at half that alpha), with small ink crop marks outside the four corners of the type area. Every element's resting edges sit exactly on module or gutter edges, and its text sits on baselines. MOTION RULES: things move only horizontally or vertically, never diagonally, one axis at a time (a move that needs both goes x first, then y, as two snaps); each snap is fast and final, 6–9 frames on a strong ease-out (exponential), no overshoot, no bounce, no rotation; widths grow in whole-module steps (each step its own little snap, 3 frames apart); arrivals are cuts or snaps, never fades. TYPE: Inter only; the title and giant numerals in Inter 800 set tight (tracking about −4%, leading 0.9), all text flush left and ragged right, never centred, never justified; headings sentence case; small info lines Inter 400 at 26–30 px; the day names Inter 600. The giant numeral is about 560 px tall in portrait (it spans four row modules), ink. Red is used for exactly two things: one solid red rectangle (a whole number of modules) and the active day's small index square. The composition is asymmetric: heavy black numeral on one side, a column of text on the other, a lot of empty paper. A tiny ink page number and an Inter 400 caption 'Grid Week · 5 evenings' sit at the top-left margin like a running head; all readable text is ink (the palette's muted is too light on this paper for small type). Holds keep a very slow, straight push-in (1.00 to 1.015).
Learns from: The International Typographic Style (https://en.wikipedia.org/wiki/International_Typographic_Style) and Josef Müller-Brockmann's 'Grid Systems in Graphic Design' and concert posters (https://en.wikipedia.org/wiki/Josef_M%C3%BCller-Brockmann): a mathematical grid, flush-left ragged-right sans-serif type, asymmetric layouts, giant numerals, restrained colour. Their posters, typefaces, layouts and copy are not used; the series, its sessions and its hall are invented.
Beats (frames · what):
  - 0–60 · the grid: column hairlines slide down from the top edge one after another (2 frames apart), then row lines slide in from the left, then the baselines; the crop marks tick into the four corners
  - 60–150 · the title: a red module appears top-left and grows to the right in whole-module snaps until it spans four columns; 'Grid Week' drops onto its baseline beneath it, flush left, in Inter 800; the line 'Five evenings on order' snaps in under it
  - 150–210 · evening 1: the giant numeral '1' snaps in along its column from the left edge; at the lower right, flush left on the grid, 'Mon' then 'The Module'; a small grid diagram beside it lights ONE module red
  - 210–270 · evening 2: the numeral slides out left along its row and '2' snaps in from the right; 'Tue' / 'The Margin'; the diagram's margin band turns red and the modules step inward
  - 270–330 · evening 3: '3' snaps in; 'Wed' / 'The Gutter'; the diagram's gutters flash red one after another
  - 330–390 · evening 4: '4' snaps in; 'Thu' / 'The Baseline'; the diagram's baselines rule in, and the text beside it visibly drops onto them
  - 390–450 · evening 5: '5' snaps in; 'Fri' / 'The White Space'; the diagram clears every module except one, and the empty paper around the numeral widens as the text column snaps one column further right
  - 450–570 · recompose: every element snaps along grid lines into the final poster, one move per half beat: the numeral shrinks into a column of small numerals '1 2 3 4 5' beside the five session titles (a flush-left list), 'Grid Week' grows to span five columns at the top, the red rectangle moves down to the bottom row and stretches across four columns
  - 570–660 · the poster holds: an info block snaps in at the bottom right: 'Hall 2 · every evening at 19:00' and 'Free entry'; the grid hairlines fall back to a quarter of their strength but stay; the active-day square steps down the list once per beat; a slow straight push-in
Sizes: Portrait (4:5) is primary: 6 × 8 modules; the numeral occupies columns 1–4 of rows 3–6, the day and title sit in columns 5–6 lower down, the diagram in columns 5–6 above them; the final poster stacks title, list and info block top to bottom. Landscape (16:9) uses 12 × 6 modules: the numeral sits in columns 1–5, the day text in columns 7–9 and the diagram in columns 10–12; the final poster puts the title across columns 1–8 of the top two rows, the list in columns 1–6 below and the info block in columns 9–12, with the red rectangle along the bottom row.
Teaches: A visible grid turns layout into choreography: when every element can only snap along the same lines, even a five-item list feels composed, and the empty space the grid leaves becomes part of the design.

