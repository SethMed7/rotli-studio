You are building ONE study for the open-source rotli studio: a piece that shows the studio works for ANY product,
style and size, not only Rotli. Work ONLY in ~/rotli-studio/motion (a Node/npm project; use `node`, not bun; `~` is
your home directory, expand it to an absolute path for file tools). In every shell command use absolute paths or
`cd ~/rotli-studio/motion && …` (the shell's cwd resets between commands).

YOUR STUDY: "Data Story" (study 08), brief at `series/studies/briefs/data-story.json` (read it first; it is the contract).
Pieces to export from `src/canvas-core/studies/dataStory.ts`: `dataStory` (landscape), `dataStoryVertical` (vertical). Primary size: landscape.

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
1. Create/modify ONLY `src/canvas-core/studies/dataStory.ts` and its hosts `src/hosts/page-<pieceId>.ts` (one per piece, copy
   `src/hosts/page-motionResume.ts`). Do NOT edit the kit, the pack, tools, pieces.json, series.json, goldens or any other
   piece. If you need a helper, define it in your module. Do not register the pieces; the maintainer does.
2. Never import from `rotli/`, `studio/` or `brand/brand.json`: a study must not look or sound like Rotli. No quokka.
3. Follow the brief's story beats and timing (you may retime inside a beat; every shot must start on the beat grid:
   one beat = 60 / bpm × fps frames; `validate()` in film.ts refuses anything else). Frames: 450 at 30 fps.
4. Design EACH size (the brief's "sizes" note); a vertical re-stacks, it never just crops. Keep text inside `layout().safe`.
5. Quality bar: nothing overlaps unintentionally, no text under 22 px (at 1080 short side), flat colour, depth from
   shadow only where the style allows, every hold keeps moving (a slow push-in, drift or ambient motion).
6. Copy is invented for the fictional product; never claim anything about a real company or person.
7. Sound: beatScore drive at 120 bpm with ticks as numbers roll, a hit on the switch and on 98%, and the sign-off under the name.

VERIFY BY LOOKING, and iterate until right:
- `node tools/frames.mjs <pieceId> <8–12 frames across the piece> --out /tmp/data-story --sheet /tmp/data-story.png --cols 6`,
  then READ the PNG (and full frames in /tmp/data-story/ where detail matters). Do this for EVERY size.
- videos: `node tools/render.mjs <pieceId> --out /tmp/<pieceId>.mp4`, then `node tools/still-frames.mjs /tmp/<pieceId>.mp4`
  must print an EMPTY `windows:` line.
- loops: also `node tools/loop-seam.mjs /tmp/<pieceId>.mp4` must print SEAMLESS.
- loudness (videos): `ffmpeg -nostats -i /tmp/<pieceId>.mp4 -af ebur128 -f null - 2>&1 | grep " I:"` should be about −16 LUFS.
- `npx tsc --noEmit -p tsconfig.json` must print nothing.
- Do not commit, do not touch ~/rotli, do not run `studio.mjs render all` or golden.

Report back: files created, the final sheet paths, still-frames / loop-seam / loudness results, what you would improve
with more time, and anything you could not make work.

--- THE STUDY (from series/studies/briefs/data-story.json) ---
Data Story · study 08 · video · 450 frames at 30 fps, 120 bpm · palette "graphite"
Style: A dark dashboard: a grid of rounded widgets on graphite, each animating its own data (a switch, a bar chart that re-sorts, a count-up percentage, a donut, a line chart that draws on, a live blob). Numbers roll like odometers. Coral accent for the headline figure, mint for good news.
Learns from: UI and data-viz moments in code-made reels: a grid of widgets that animate together, numbers that count up, charts that draw on.
Beats (frames · what):
  - 0–60 · hook: the grid assembles, each widget springing in from its corner on a stagger; the big number reads 0%
  - 60–150 · 'Meetings found this week': the headline figure counts up to 92% while a bar chart of the weekdays rises
  - 150–240 · a switch turns on ('Auto-book'), the bars re-sort from most to least free, and the figure climbs to 98%
  - 240–330 · a line chart of 'hours saved' draws on with a dot riding its head; a donut fills to 3 of 4 teams
  - 330–390 · the camera pushes into the headline widget until 98% fills the frame
  - 390–450 · sign-off: 'Oriel' with 'hours given back' and the figure '14 h' in mint
Sizes: Vertical stacks the widgets in one column with the headline figure on top, larger.
Teaches: Data motion is honest when numbers move with the shapes that show them: every figure tweens from the same clock as its chart.

