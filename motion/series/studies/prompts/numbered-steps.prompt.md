You are building ONE study for the open-source rotli studio: a piece that shows the studio works for ANY product,
style and size, not only Rotli. Work ONLY in ~/rotli-studio/motion (a Node/npm project; use `node`, not bun; `~` is
your home directory, expand it to an absolute path for file tools). In every shell command use absolute paths or
`cd ~/rotli-studio/motion && …` (the shell's cwd resets between commands).

YOUR STUDY: "Numbered Steps" (study 14), brief at `series/studies/briefs/numbered-steps.json` (read it first; it is the contract).
Pieces to export from `src/canvas-core/studies/numberedSteps.ts`: `numberedSteps` (vertical), `numberedStepsSquare` (square). Primary size: vertical.

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
1. Create/modify ONLY `src/canvas-core/studies/numberedSteps.ts` and its hosts `src/hosts/page-<pieceId>.ts` (one per piece, copy
   `src/hosts/page-motionResume.ts`). Do NOT edit the kit, the pack, tools, pieces.json, series.json, goldens or any other
   piece. If you need a helper, define it in your module. Do not register the pieces; the maintainer does.
2. Never import from `rotli/`, `studio/` or `brand/brand.json`: a study must not look or sound like Rotli. No quokka.
3. Follow the brief's story beats and timing (you may retime inside a beat; every shot must start on the beat grid:
   one beat = 60 / bpm × fps frames; `validate()` in film.ts refuses anything else). Frames: 720 at 30 fps.
4. Design EACH size (the brief's "sizes" note); a vertical re-stacks, it never just crops. Keep text inside `layout().safe`.
5. Quality bar: nothing overlaps unintentionally, no text under 22 px (at 1080 short side), flat colour, depth from
   shadow only where the style allows, every hold keeps moving (a slow push-in, drift or ambient motion).
6. Copy is invented for the fictional product; never claim anything about a real company or person.
7. Sound: beatScore drive at 120 bpm with a hit on each numeral slam, ticks on icon moves and the sign-off under the CTA.

VERIFY BY LOOKING, and iterate until right:
- `node tools/frames.mjs <pieceId> <8–12 frames across the piece> --out /tmp/numbered-steps --sheet /tmp/numbered-steps.png --cols 6`,
  then READ the PNG (and full frames in /tmp/numbered-steps/ where detail matters). Do this for EVERY size.
- videos: `node tools/render.mjs <pieceId> --out /tmp/<pieceId>.mp4`, then `node tools/still-frames.mjs /tmp/<pieceId>.mp4`
  must print an EMPTY `windows:` line.
- loops: also `node tools/loop-seam.mjs /tmp/<pieceId>.mp4` must print SEAMLESS.
- loudness (videos): `ffmpeg -nostats -i /tmp/<pieceId>.mp4 -af ebur128 -f null - 2>&1 | grep " I:"` should be about −16 LUFS.
- `npx tsc --noEmit -p tsconfig.json` must print nothing.
- Do not commit, do not touch ~/rotli, do not run `studio.mjs render all` or golden.

Report back: files created, the final sheet paths, still-frames / loop-seam / loudness results, what you would improve
with more time, and anything you could not make work.

--- THE STUDY (from series/studies/briefs/numbered-steps.json) ---
Numbered Steps · study 14 · video · 720 frames at 30 fps, 120 bpm · palette "butter"
Style: A listicle reel: giant numerals (1, 2, 3) fill the frame on a solid colour field, each step's words stack beside the numeral, and a small illustrated icon scene demonstrates it. The numeral morphs from one to the next. Bold, flat, poster-like. Captions are serif word ladders (kit captions.ts): short stacks of mixed sizes, one key word in the accent italic, set beside the action and arriving word by word.
Learns from: Founder explainer reels (Instagram, @gregisenberg's team): giant step numerals with the words stacked beside them, a numbered card (1-2-3) summary, a call to action at the end.
Beats (frames · what):
  - 0–60 · hook: '3 steps to a calmer week' in a ladder; three dots count 1-2-3
  - 60–240 · a giant '1' slams in; beside it 'Block your deep work'; an icon of a calendar gets three blue blocks
  - 240–420 · the 1 morphs into a '2'; 'Batch your meetings'; scattered meeting chips gather into one afternoon
  - 420–600 · the 2 morphs into a '3'; 'Let the calendar ask'; a chat bubble 'find an hour' turns into a booked chip
  - 600–720 · summary card lists 1-2-3 with ticks; CTA: 'Comment "calm" for the checklist'; 'Oriel' small underneath
Sizes: Square puts the numeral left and the words right at a smaller size.
Teaches: A listicle's structure is its animation: the numeral is the transition, so every step feels like one more beat of the same idea.

