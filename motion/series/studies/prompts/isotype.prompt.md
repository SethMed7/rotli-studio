You are building ONE study for the open-source rotli studio: a piece that shows the studio works for ANY product,
style and size, not only Rotli. Work ONLY in ~/rotli-studio/motion (a Node/npm project; use `node`, not bun; `~` is
your home directory, expand it to an absolute path for file tools). In every shell command use absolute paths or
`cd ~/rotli-studio/motion && …` (the shell's cwd resets between commands).

YOUR STUDY: "Isotype" (study 40), brief at `series/studies/briefs/isotype.json` (read it first; it is the contract).
Pieces to export from `src/canvas-core/studies/isotype.ts`: `isotypeSquare` (square), `isotype` (landscape). Primary size: square.

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
1. Create/modify ONLY `src/canvas-core/studies/isotype.ts` and its hosts `src/hosts/page-<pieceId>.ts` (one per piece, copy
   `src/hosts/page-motionResume.ts`). Do NOT edit the kit, the pack, tools, pieces.json, series.json, goldens or any other
   piece. If you need a helper, define it in your module. Do not register the pieces; the maintainer does.
2. Never import from `rotli/`, `studio/` or `brand/brand.json`: a study must not look or sound like Rotli. No quokka.
3. Follow the brief's story beats and timing (you may retime inside a beat; every shot must start on the beat grid:
   one beat = 60 / bpm × fps frames; `validate()` in film.ts refuses anything else). Frames: 900 at 30 fps.
4. Design EACH size (the brief's "sizes" note); a vertical re-stacks, it never just crops. Keep text inside `layout().safe`.
5. Quality bar: nothing overlaps unintentionally, no text under 22 px (at 1080 short side), flat colour, depth from
   shadow only where the style allows, every hold keeps moving (a slow push-in, drift or ambient motion).
6. Copy is invented for the fictional product; never claim anything about a real company or person.
7. Sound: beatScore drive at 120 bpm with the drums held back until the ocean starts counting (drop at frame 90); a whoosh into the break-up of the big drop (ending at frame 60); ticks on the counting drops, thinned to every third drop so they patter like rain without buzzing; a hit when each new category starts (frames 90, 330, 450, 570) and when the fresh drops lift out (frame 660); the three-note sign-off at frame 810.

VERIFY BY LOOKING, and iterate until right:
- `node tools/frames.mjs <pieceId> <8–12 frames across the piece> --out /tmp/isotype --sheet /tmp/isotype.png --cols 6`,
  then READ the PNG (and full frames in /tmp/isotype/ where detail matters). Do this for EVERY size.
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

--- THE STUDY (from series/studies/briefs/isotype.json) ---
Isotype · study 40 · video · 900 frames at 30 fps, 120 bpm · palette "isotype"
Style: A statistics chart in the Isotype manner, animated: quantities are COUNTED in identical pictograms, never drawn bigger. The unit is ONE WATER DROP = 1% of all the water on Earth, and the whole film is a chart of drop pictograms in rows of ten on the cream ground. As in Isotype charts, EACH CATEGORY GETS ITS OWN ROWS, starting at the left edge, with its label aligned to its rows: the oceans are a block of nine full rows and a tenth of six and a half drops, then one short row each for ice, groundwater and everything else. The drop is a flat Arntz-style silhouette with no outline, no gradient and no perspective: a teardrop built from a circle (radius 18 px at 1080) and two tangent lines to a point, 48 px tall, on a 56 px pitch at 1080 (radius scaled to match). Colour is category, never decoration: oceans s1 (deep blue), ice caps and glaciers s2 (pale ice blue), groundwater s3 (earth brown), everything else s4 (green); grey-out uses line colour. At the head of each category's legend line sits a small category glyph in the same flat style (a three-crest wave, a mountain with a white cap, three stacked earth strata, a winding river), 44 px. Remainders are shown the Isotype way, by CUTTING the last symbol with a vertical cut (a half or a quarter of a drop, clipped with a rectangle), never by shrinking it. Rows COUNT THEMSELVES IN: drops arrive in reading order (left to right, top to bottom), each popping from 0 to full size on a short spring (overshoot 8%) with a 2-frame stagger, so a row reads as a tally; a JetBrains Mono counter under the headline ticks with them. Type: Inter 800 headline (64 px at 1080), ink, left-aligned; Inter 600 legend labels (34 px) with the number in Inter 800 (e.g. 'about 96.5%'); JetBrains Mono footnotes in muted (24 px). Layout is strict like a printed chart: generous margins, the headline, the rule and the drop rows aligned to one left edge, labels on a second column edge, a 2 px ink rule under the headline. No shadows, no glow, no 3D; the only motion beyond the counting is a slow 2% push-in on holds and a gentle 1 px breathing bob of the newest row. The 'transform' beats (the big drop breaking into a hundred, the fresh drops lifting out) move drops along straight lines with an ease-in-out, keeping each drop the same size.
Learns from: Isotype, the picture-statistics method of Otto Neurath's Vienna museum with pictograms by Gerd Arntz and charts transformed by Marie Neurath: its rule that a greater quantity is shown by more pictograms of the same size, not a larger one (Isotype Revisited, University of Reading, https://isotyperevisited.org/2012/08/introduction.php; https://en.wikipedia.org/wiki/Isotype_(picture_language)), and its practice of cutting a symbol, normally at a half and seldom at a quarter, for a remainder (Nightingale, https://nightingaledvs.com/exploring-isotype-charts-our-two-democracies-at-work-lessons-of-isotype-part-3/). Arntz's actual pictograms, the museum's charts and their colours are not used; the drop and glyphs are drawn new in code.
Beats (frames · what):
  - 0–90 · the rule: one very large drop swells in the centre while the headline 'All the water on Earth' builds; a red strike (accent2) crosses it with the small mono note 'not bigger…'; the big drop breaks into same-size grey outline drops (line colour) that fly into the rows the chart will fill, with the note '…more'; the line 'One drop = 1% of it.' lands under the headline
  - 90–330 · oceans: the ocean block fills in blue (s1) in reading order, about six drops per beat, the counter ticking; the tenth row ends in six whole drops and a HALF drop cut vertically; label beside the block with the wave glyph: 'Oceans' / 'about 96.5%'
  - 330–450 · ice: a new short row under the block fills pale ice blue (s2): one whole drop and a three-quarter drop (a quarter cut off); label beside the row with the mountain glyph: 'Ice caps and glaciers · about 1.7%'
  - 450–570 · underground: the next short row fills earth brown (s3), one whole and three-quarters; label with the strata glyph: 'Groundwater · about 1.7%'; the chart now holds a hundred drops' worth (96.5 + 1.75 + 1.75)
  - 570–660 · the rest: a last row holds only a small magnifier ring (2 px ink circle) with a green (s4) speck inside it, far smaller than one drop; label with the river glyph: 'Everything else · less than a tenth of one drop' and a mono line under it 'lakes, rivers, swamps, soil, air, living things, permafrost'
  - 660–810 · fresh water: the headline changes to 'Only about 2.5% is fresh.'; every salty drop (the oceans and the salty part of the groundwater, about one drop of the brown row) greys out to line colour; the fresh drops lift out and re-count into a new chart of their own, one drop = 1% of FRESH water, again one block per category: 69 ice drops (s2, six full rows and nine), 30 groundwater drops (s3, three rows), 1 green drop (s4), counting in by rows; labels: 'Ice · about 69', 'Groundwater · about 30', 'Everything else · about 1 (all lakes and rivers included)'
  - 810–900 · end card: the two charts sit side by side, small; headline 'Most of it is salty.' then 'Most of the rest is frozen.'; mono footer 'figures rounded · USGS Water Science School, after Shiklomanov (1993)'; slow push-in holds
Sizes: Square (primary): the headline and rule in the top band; the drop chart left-aligned under it (rows of ten on a 56 px pitch, about 560 px wide), with each category's label to the right of its rows (the ocean label beside its block, the short-row labels beside the short rows); mono footnotes at the bottom. In the fresh-water beat the first chart shrinks to a small thumbnail at the top right and the new chart takes its place. Landscape re-stacks into a chart spread: the first chart on the left half at a 64 px pitch with its labels, the headline and rule across the top, and in the fresh-water beat the second chart builds on the right half beside the first instead of replacing it; the end card keeps both charts with the two headline lines above them.
Teaches: Counting beats scaling: showing a quantity as many identical symbols (and a remainder as a cut symbol) lets the eye compare 96.5 with 1.7 honestly, where a bigger symbol would exaggerate by area.

