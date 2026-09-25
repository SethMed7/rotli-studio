You are building ONE study for the open-source rotli studio: a piece that shows the studio works for ANY product,
style and size, not only Rotli. Work ONLY in ~/rotli-studio/motion (a Node/npm project; use `node`, not bun; `~` is
your home directory, expand it to an absolute path for file tools). In every shell command use absolute paths or
`cd ~/rotli-studio/motion && …` (the shell's cwd resets between commands).

YOUR STUDY: "Kinetic Poster" (study 06), brief at `series/studies/briefs/kinetic-poster.json` (read it first; it is the contract).
Pieces to export from `src/canvas-core/studies/kineticPoster.ts`: `kineticPoster` (landscape), `kineticPosterVertical` (vertical). Primary size: landscape.

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
1. Create/modify ONLY `src/canvas-core/studies/kineticPoster.ts` and its hosts `src/hosts/page-<pieceId>.ts` (one per piece, copy
   `src/hosts/page-motionResume.ts`). Do NOT edit the kit, the pack, tools, pieces.json, series.json, goldens or any other
   piece. If you need a helper, define it in your module. Do not register the pieces; the maintainer does.
2. Never import from `rotli/`, `studio/` or `brand/brand.json`: a study must not look or sound like Rotli. No quokka.
3. Follow the brief's story beats and timing (you may retime inside a beat; every shot must start on the beat grid:
   one beat = 60 / bpm × fps frames; `validate()` in film.ts refuses anything else). Frames: 720 at 60 fps.
4. Design EACH size (the brief's "sizes" note); a vertical re-stacks, it never just crops. Keep text inside `layout().safe`.
5. Quality bar: nothing overlaps unintentionally, no text under 22 px (at 1080 short side), flat colour, depth from
   shadow only where the style allows, every hold keeps moving (a slow push-in, drift or ambient motion).
6. Copy is invented for the fictional product; never claim anything about a real company or person.
7. Sound: beatScore drive at 120 bpm: a hit on every slam and colour card, whooshes into the stack and the marquee, the sign-off under the name.

VERIFY BY LOOKING, and iterate until right:
- `node tools/frames.mjs <pieceId> <8–12 frames across the piece> --out /tmp/kinetic-poster --sheet /tmp/kinetic-poster.png --cols 6`,
  then READ the PNG (and full frames in /tmp/kinetic-poster/ where detail matters). Do this for EVERY size.
- videos: `node tools/render.mjs <pieceId> --out /tmp/<pieceId>.mp4`, then `node tools/still-frames.mjs /tmp/<pieceId>.mp4`
  must print an EMPTY `windows:` line.
- loops: also `node tools/loop-seam.mjs /tmp/<pieceId>.mp4` must print SEAMLESS.
- loudness (videos): `ffmpeg -nostats -i /tmp/<pieceId>.mp4 -af ebur128 -f null - 2>&1 | grep " I:"` should be about −16 LUFS.
- `npx tsc --noEmit -p tsconfig.json` must print nothing.
- Do not commit, do not touch ~/rotli, do not run `studio.mjs render all` or golden.

Report back: files created, the final sheet paths, still-frames / loop-seam / loudness results, what you would improve
with more time, and anything you could not make work.

--- THE STUDY (from series/studies/briefs/kinetic-poster.json) ---
Kinetic Poster · study 06 · video · 720 frames at 60 fps, 120 bpm · palette "signal"
Style: Type only, full bleed. A saturated signal-orange ground, near-black type set huge and tight, outline letters that fill solid as they land, an italic word for emphasis, a marquee of repeating rows, and hard colour-flash title cards (blue, black, paper). Motion blur on fast moves.
Learns from: Kinetic-type reels made with code: big words as the whole picture, outline-to-fill reveals, marquee rows, colour-flash cards cut on the beat.
Beats (frames · what):
  - 0–60 · hook: 'FIND' slams in from the left, letters overshooting into place, a thin rule draws under it
  - 60–180 · 'ONE' drops in as outline letters that fill solid one by one; 'HOUR.' follows in italic, the full stop in the accent blue
  - 180–300 · the three words shear and stack into a tight block; the block scales past the frame, leaving only the full stop
  - 300–420 · a marquee: five rows of 'NO MORE BACK AND FORTH' scroll in alternating directions, outline and solid rows interleaved
  - 420–540 · colour-flash cards on each beat: blue 'ASK', black 'MATCH', paper 'BOOK', each word landing with a squash
  - 540–660 · all three words fly into a line 'ASK · MATCH · BOOK.' that settles; a counter ticks 12 → 1 beside it
  - 660–720 · sign-off: 'Oriel.' in the huge type on the orange, 'find a time that works for everyone' in small italic under it
Sizes: Vertical stacks the words one per line at a larger size and runs the marquee rows taller.
Teaches: Type can be the whole picture: size, weight, outline and colour changes carry the story, and every change lands on a beat.

