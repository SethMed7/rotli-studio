You are building ONE study for the open-source rotli studio: a piece that shows the studio works for ANY product,
style and size, not only Rotli. Work ONLY in ~/rotli-studio/motion (a Node/npm project; use `node`, not bun; `~` is
your home directory, expand it to an absolute path for file tools). In every shell command use absolute paths or
`cd ~/rotli-studio/motion && …` (the shell's cwd resets between commands).

YOUR STUDY: "One Line" (study 38), brief at `series/studies/briefs/one-line.json` (read it first; it is the contract).
Pieces to export from `src/canvas-core/studies/oneLine.ts`: `oneLine` (landscape), `oneLineVertical` (vertical). Primary size: landscape.

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
1. Create/modify ONLY `src/canvas-core/studies/oneLine.ts` and its hosts `src/hosts/page-<pieceId>.ts` (one per piece, copy
   `src/hosts/page-motionResume.ts`). Do NOT edit the kit, the pack, tools, pieces.json, series.json, goldens or any other
   piece. If you need a helper, define it in your module. Do not register the pieces; the maintainer does.
2. Never import from `rotli/`, `studio/` or `brand/brand.json`: a study must not look or sound like Rotli. No quokka.
3. Follow the brief's story beats and timing (you may retime inside a beat; every shot must start on the beat grid:
   one beat = 60 / bpm × fps frames; `validate()` in film.ts refuses anything else). Frames: 900 at 30 fps.
4. Design EACH size (the brief's "sizes" note); a vertical re-stacks, it never just crops. Keep text inside `layout().safe`.
5. Quality bar: nothing overlaps unintentionally, no text under 22 px (at 1080 short side), flat colour, depth from
   shadow only where the style allows, every hold keeps moving (a slow push-in, drift or ambient motion).
6. Copy is invented for the fictional product; never claim anything about a real company or person.
7. Sound: beatScore soft at 120 bpm (pad and a light pluck, no drums), key +5 for a bright, open feel; a soft continuous pen scratch made from ticks spaced every 3 frames while the line is actively drawing (thinned so it never buzzes); a whoosh ending on each morph's arrival (frames 240, 375, 510, 645 and 780); a small drip tick for each water droplet; the three-note sign-off at frame 840.

VERIFY BY LOOKING, and iterate until right:
- `node tools/frames.mjs <pieceId> <8–12 frames across the piece> --out /tmp/one-line --sheet /tmp/one-line.png --cols 6`,
  then READ the PNG (and full frames in /tmp/one-line/ where detail matters). Do this for EVERY size.
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

--- THE STUDY (from series/studies/briefs/one-line.json) ---
One Line · study 38 · video · 900 frames at 30 fps, 120 bpm · palette "meadow"
Style: A continuous single-line drawing that never lifts: ONE unbroken ink stroke (4 px at 1080, round caps and joins, ink colour on the pale meadow ground) draws every subject of the film and morphs from one drawing into the next. As in the classic one-line cartoon, the ground is part of the character: the stroke enters from the left edge as the soil line, dips down to draw the subject, comes back up and leaves at the right edge, so there is always exactly one line on screen. IMPLEMENTATION (pure functions): every drawing is authored in the module as ONE open path (a list of cubic Bézier segments from the left edge to the right edge) and resampled by arc length to the same number of points (e.g. 900); the frame draws the path as a single polyline. A drawing appears by a trim (draw the first p · N points, with a small ink nib dot, 9 px, at the leading end while the pen is moving); a morph interpolates the two resampled point lists point-for-point with an ease-in-out, so the line flows from drawing to drawing without ever breaking; a 1–2 px sinusoidal wobble along the normal (seeded phase, very slow) keeps a held line alive and hand-made. Authoring rule: consecutive drawings keep their points in the same order (the soil line first, the subject in the middle, the soil line last) so morphs do not tangle. THE SUBJECTS, all drawn by the one stroke: (1) a bean seed below the soil line, with the small scar on its side; (2) the same seed, rounder and larger (it has taken up water), with three short water ticks; (3) a root coming out of the seed and curving down; (4) a stem bent into a hook pushing up through the soil line; (5) the hook straightening, lifting two round seed leaves into the air; (6) a small plant with the seed leaves and a pair of true leaves (pointed, veined with one inner line that is part of the same stroke) and a sun drawn as a spiral loop at the end of the line before it leaves the frame. Two colours besides ink are allowed, and only as small flat fills that sit BEHIND the line and fade in after the line has drawn their outline: accent2 (water blue) in the soaked seed's three droplets, accent (sun yellow-orange) inside the sun loop. The soil below the line is a flat s1 (soil brown) band at 0.18 alpha. Captions: Inter 600 headline (56 px at 1080) in ink, one key word in Instrument Serif Italic, and a muted Inter 400 line (32 px), arriving word by word on springs; a small mono step counter '1/6' … '6/6' in muted top-right. Holds keep the wobble and a slow 2% drift of the camera toward the subject.
Learns from: Continuous single-line drawing: the one-line animated character of Osvaldo Cavandoli's La Linea (https://en.wikipedia.org/wiki/La_Linea_(TV_series)), whose figure is part of the same infinite line he walks on, and the contour line drawing tradition of Matisse and Picasso (https://mymodernmet.com/line-art-history/). Their characters, drawings and gags are not used. The biology follows Penn State Extension's 'Seed and Seedling Biology' (https://extension.psu.edu/seed-and-seedling-biology) and Wikipedia's article on germination (https://en.wikipedia.org/wiki/Germination).
Beats (frames · what):
  - 0–120 · the line arrives: the stroke draws on from the left edge as the soil line, dips to draw the bean seed and leaves at the right; headline 'A seed is a *tiny plant*' then the line 'packed with its own food.'; step '1/6'
  - 120–240 · what it needs: three short marks for water, a wavy line for air and a small thermometer morph briefly out of the soil line and back (all the same stroke); headline 'It needs *water*, air and the right warmth.'
  - 240–375 · water: the seed morphs rounder and larger; the three water ticks appear beside it and their droplets fill accent2; headline 'First it *drinks*.' with the line 'The seed swells and its coat splits.'; step '2/6'
  - 375–510 · root: the seed outline opens and the line runs down out of it as a root that curves and branches once; headline 'The *root* comes out first.' with the muted line 'It's called the radicle.'; step '3/6'
  - 510–645 · hook: the line rises from the seed as a stem bent into a hook and pushes the hook through the soil line; headline 'In a bean, the stem *hooks*' then 'and pulls the seed leaves up through the soil.'; step '4/6'
  - 645–780 · leaves: the hook straightens and lifts two round seed leaves; then a pair of pointed true leaves unfolds above them; headline '*Seed leaves* first, then true leaves.'; step '5/6'
  - 780–900 · light: before leaving the frame, the line loops into a spiral sun that fills accent; headline 'When the stored food runs out,' then '*light* takes over.'; step '6/6'; the whole single line holds, wobbling gently, with a slow push-in
Sizes: Vertical re-stacks: the soil line runs across the frame at about 62% height (the line still enters at the left edge and leaves at the right), the subject is drawn larger and taller (the root runs deeper, the plant grows higher), captions sit in the top third of the safe area and the step counter top-right; the sun loop sits above the plant rather than to its right. Landscape keeps the soil line at about 66% height, the subject left of centre and captions top-left.
Teaches: One unbroken line can carry a whole explanation: when every drawing is the same resampled path, each step visibly grows out of the last, which is exactly how a seedling grows.

