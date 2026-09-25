You are building ONE study for the open-source rotli studio: a piece that shows the studio works for ANY product,
style and size, not only Rotli. Work ONLY in ~/rotli-studio/motion (a Node/npm project; use `node`, not bun; `~` is
your home directory, expand it to an absolute path for file tools). In every shell command use absolute paths or
`cd ~/rotli-studio/motion && …` (the shell's cwd resets between commands).

YOUR STUDY: "Layer Stack" (study 10), brief at `series/studies/briefs/layer-stack.json` (read it first; it is the contract).
Pieces to export from `src/canvas-core/studies/layerStack.ts`: `layerStack` (vertical), `layerStackSquare` (square). Primary size: vertical.

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
1. Create/modify ONLY `src/canvas-core/studies/layerStack.ts` and its hosts `src/hosts/page-<pieceId>.ts` (one per piece, copy
   `src/hosts/page-motionResume.ts`). Do NOT edit the kit, the pack, tools, pieces.json, series.json, goldens or any other
   piece. If you need a helper, define it in your module. Do not register the pieces; the maintainer does.
2. Never import from `rotli/`, `studio/` or `brand/brand.json`: a study must not look or sound like Rotli. No quokka.
3. Follow the brief's story beats and timing (you may retime inside a beat; every shot must start on the beat grid:
   one beat = 60 / bpm × fps frames; `validate()` in film.ts refuses anything else). Frames: 720 at 30 fps.
4. Design EACH size (the brief's "sizes" note); a vertical re-stacks, it never just crops. Keep text inside `layout().safe`.
5. Quality bar: nothing overlaps unintentionally, no text under 22 px (at 1080 short side), flat colour, depth from
   shadow only where the style allows, every hold keeps moving (a slow push-in, drift or ambient motion).
6. Copy is invented for the fictional product; never claim anything about a real company or person.
7. Sound: beatScore soft at 120 bpm with a thump when slabs land, ticks as lines draw, a hit when the stack locks, and the sign-off.

VERIFY BY LOOKING, and iterate until right:
- `node tools/frames.mjs <pieceId> <8–12 frames across the piece> --out /tmp/layer-stack --sheet /tmp/layer-stack.png --cols 6`,
  then READ the PNG (and full frames in /tmp/layer-stack/ where detail matters). Do this for EVERY size.
- videos: `node tools/render.mjs <pieceId> --out /tmp/<pieceId>.mp4`, then `node tools/still-frames.mjs /tmp/<pieceId>.mp4`
  must print an EMPTY `windows:` line.
- loops: also `node tools/loop-seam.mjs /tmp/<pieceId>.mp4` must print SEAMLESS.
- loudness (videos): `ffmpeg -nostats -i /tmp/<pieceId>.mp4 -af ebur128 -f null - 2>&1 | grep " I:"` should be about −16 LUFS.
- `npx tsc --noEmit -p tsconfig.json` must print nothing.
- Do not commit, do not touch ~/rotli, do not run `studio.mjs render all` or golden.

Report back: files created, the final sheet paths, still-frames / loop-seam / loudness results, what you would improve
with more time, and anything you could not make work.

--- THE STUDY (from series/studies/briefs/layer-stack.json) ---
Layer Stack · study 10 · video · 720 frames at 30 fps, 120 bpm · palette "cobalt"
Style: Isometric infographic: three thick isometric slabs, each with a question mark, float in a stack over a sunburst of thin rays; they separate, get named, and lock together. Each layer opens into its own small isometric scene. Flat colour, a soft shadow under each slab. Captions are serif word ladders (kit captions.ts): short stacks of mixed sizes, one key word in the accent italic, set beside the action and arriving word by word.
Learns from: Founder explainer reels (Instagram, @gregisenberg's team): isometric slabs that separate and assemble, sunburst rays behind the hero object, a node diagram with orbit ellipses, giant step numerals.
Beats (frames · what):
  - 0–60 · hook: three isometric slabs drop into a stack over a spinning sunburst; each shows a '?'. Caption: 'The three-layer calendar.'
  - 60–180 · layer 1 lifts out and turns into a small isometric desk with a calendar block; caption 'Layer 1 · the ask'; a cursor types 'an hour with Ana and Ben'
  - 180–330 · layer 2 becomes a node diagram: four agent nodes linked by dotted lines that draw on, two thin orbit ellipses wrap them; caption 'Layer 2 · the agents'
  - 330–480 · layer 3 becomes a dark square with a starburst of connected points (memory); caption 'Layer 3 · what they remember'
  - 480–630 · the three layers fly back into the stack and lock with a click; the '?' marks flip to ticks; the rays speed up
  - 630–720 · sign-off: 'Oriel' on the top slab, 'three layers, one calm week' as a caption ladder
Sizes: Square keeps the stack centred and moves captions above it; vertical stacks captions in the top third.
Teaches: An abstract idea reads as architecture: give each concept a solid object, then let the objects stack, separate and lock.

