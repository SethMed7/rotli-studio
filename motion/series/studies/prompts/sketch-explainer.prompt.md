You are building ONE study for the open-source rotli studio: a piece that shows the studio works for ANY product,
style and size, not only Rotli. Work ONLY in ~/rotli-studio/motion (a Node/npm project; use `node`, not bun; `~` is
your home directory, expand it to an absolute path for file tools). In every shell command use absolute paths or
`cd ~/rotli-studio/motion && …` (the shell's cwd resets between commands).

YOUR STUDY: "Sketch Explainer" (study 05), brief at `series/studies/briefs/sketch-explainer.json` (read it first; it is the contract).
Pieces to export from `src/canvas-core/studies/sketchExplainer.ts`: `sketchExplainer` (landscape), `sketchExplainerVertical` (vertical). Primary size: landscape.

REQUIRED READING, in order:
1. `series/studies/bible.md`: what a study is and the rules every study keeps.
2. `src/canvas-core/studies/motionResume.ts`: THE reference study. Match its structure: a `make(size, id)` factory
   returning a Film, one continuous `paint(ctx, env, F)` of a fractional frame, shots that only name the sections,
   `layout(size)` for per-size design, the pack for every colour and font, `beatScore` for sound.
3. The brand-neutral kit, `src/canvas-core/kit/`: `pack.ts` (usePack, palettes, faces), `sizes.ts` (SIZES, layout),
   `motion.ts` (clamp, lerp, prog, window01, ease, bezier, spring, track with loop, phase), `type.ts` (text, measure,
   letters, timed), `ui.ts` (rr, card, phone, toggle, check), `depth.ts` (iso, block, blockGrid, project, spiral),
   `blur.ts` (motionBlur), `score.ts` (beatScore).
4. The pack: `brand/packs/studio/pack.json` (Oriel is a FICTIONAL product; palettes night, sage, loop, riso, blueprint;
   faces Inter, Instrument Serif, Instrument Serif Italic, JetBrains Mono).
5. Only if your brief names them: `src/canvas-core/styles/` (riso, print, drafting, storybook…) and `src/canvas-core/core.ts`
   (Gfx, PENCIL/RISOLINE media, halftone, rng, fractal). Read their headers, not every line.

HARD RULES:
1. Create/modify ONLY `src/canvas-core/studies/sketchExplainer.ts` and its hosts `src/hosts/page-<pieceId>.ts` (one per piece, copy
   `src/hosts/page-motionResume.ts`). Do NOT edit the kit, the pack, tools, pieces.json, series.json, goldens or any other
   piece. If you need a helper, define it in your module. Do not register the pieces; the maintainer does.
2. Never import from `rotli/`, `studio/` or `brand/brand.json`: a study must not look or sound like Rotli. No quokka.
3. Follow the brief's story beats and timing (you may retime inside a beat; every shot must start on the beat grid:
   one beat = 60 / bpm × fps frames; `validate()` in film.ts refuses anything else). Frames: 600 at 30 fps.
4. Design EACH size (the brief's "sizes" note); a vertical re-stacks, it never just crops. Keep text inside `layout().safe`.
5. Quality bar: nothing overlaps unintentionally, no text under 22 px (at 1080 short side), flat colour, depth from
   shadow only where the style allows, every hold keeps moving (a slow push-in, drift or ambient motion).
6. Copy is invented for the fictional product; never claim anything about a real company or person.
7. Sound: beatScore soft at 90 bpm: pencil scratches as ticks while strokes draw, a hit when the answer box lands, the sign-off with the stamp.

VERIFY BY LOOKING, and iterate until right:
- `node tools/frames.mjs <pieceId> <8–12 frames across the piece> --out /tmp/sketch-explainer --sheet /tmp/sketch-explainer.png --cols 6`,
  then READ the PNG (and full frames in /tmp/sketch-explainer/ where detail matters). Do this for EVERY size.
- videos: `node tools/render.mjs <pieceId> --out /tmp/<pieceId>.mp4`, then `node tools/still-frames.mjs /tmp/<pieceId>.mp4`
  must print an EMPTY `windows:` line.
- loops: also `node tools/loop-seam.mjs /tmp/<pieceId>.mp4` must print SEAMLESS.
- loudness (videos): `ffmpeg -nostats -i /tmp/<pieceId>.mp4 -af ebur128 -f null - 2>&1 | grep " I:"` should be about −16 LUFS.
- `npx tsc --noEmit -p tsconfig.json` must print nothing.
- Do not commit, do not touch ~/rotli, do not run `studio.mjs render all` or golden.

Report back: files created, the final sheet paths, still-frames / loop-seam / loudness results, what you would improve
with more time, and anything you could not make work.

--- THE STUDY (from series/studies/briefs/sketch-explainer.json) ---
Sketch Explainer · study 05 · video · 600 frames at 30 fps, 90 bpm · palette "blueprint"
Style: A blueprint: pale lines on deep blue, a fine grid, hand-drawn strokes that draw themselves on (use the engine's pencil/Gfx strokes or stroke-dash reveals), mono hand labels, one warm accent for the answer. The camera pans across one large drawing.
Learns from: Technical explainer sketches and pen-plotter drawings.
Beats (frames · what):
  - 0–80 · title draws itself: 'How a meeting finds its time' with an underline
  - 80–200 · three people are sketched (Ana, Ben, Kai), each with a lane
  - 200–340 · each lane fills with busy blocks (hatched) across Mon–Fri; the camera pans along the week
  - 340–460 · a vertical scan line sweeps; where all three lanes are free it leaves an accent box: Thu 3:00
  - 460–560 · the box lifts into an invite drawn in line: 'Thu 3:00–4:00 · Ana, Ben, Kai'; arrows to the three people, each gets a check
  - 560–600 · pull back to the whole sheet; stamp 'ORIEL · fictional · drawn in code'
Sizes: Landscape is primary (lanes run left to right). Vertical turns the week to run top to bottom and stacks the people across the top.
Teaches: Drawing-on is its own motion language: stroke order is the story.

