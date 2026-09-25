You are building ONE study for the open-source rotli studio: a piece that shows the studio works for ANY product,
style and size, not only Rotli. Work ONLY in ~/rotli-studio/motion (a Node/npm project; use `node`, not bun; `~` is
your home directory, expand it to an absolute path for file tools). In every shell command use absolute paths or
`cd ~/rotli-studio/motion && …` (the shell's cwd resets between commands).

YOUR STUDY: "Motion Résumé" (study 01), brief at `series/studies/briefs/motion-resume.json` (read it first; it is the contract).
Pieces to export from `src/canvas-core/studies/motionResume.ts`: `motionResume` (landscape), `motionResumeVertical` (vertical). Primary size: landscape.

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
1. Create/modify ONLY `src/canvas-core/studies/motionResume.ts` and its hosts `src/hosts/page-<pieceId>.ts` (one per piece, copy
   `src/hosts/page-motionResume.ts`). Do NOT edit the kit, the pack, tools, pieces.json, series.json, goldens or any other
   piece. If you need a helper, define it in your module. Do not register the pieces; the maintainer does.
2. Never import from `rotli/`, `studio/` or `brand/brand.json`: a study must not look or sound like Rotli. No quokka.
3. Follow the brief's story beats and timing (you may retime inside a beat; every shot must start on the beat grid:
   one beat = 60 / bpm × fps frames; `validate()` in film.ts refuses anything else). Frames: 900 at 60 fps.
4. Design EACH size (the brief's "sizes" note); a vertical re-stacks, it never just crops. Keep text inside `layout().safe`.
5. Quality bar: nothing overlaps unintentionally, no text under 22 px (at 1080 short side), flat colour, depth from
   shadow only where the style allows, every hold keeps moving (a slow push-in, drift or ambient motion).
6. Copy is invented for the fictional product; never claim anything about a real company or person.
7. Sound: beatScore drive at 120 bpm: drums enter with the type; hits on type, interface and space; whooshes into type, particles and sign-off; ticks on the switch and the check; a three-note sign-off under the wordmark.

VERIFY BY LOOKING, and iterate until right:
- `node tools/frames.mjs <pieceId> <8–12 frames across the piece> --out /tmp/motion-resume --sheet /tmp/motion-resume.png --cols 6`,
  then READ the PNG (and full frames in /tmp/motion-resume/ where detail matters). Do this for EVERY size.
- videos: `node tools/render.mjs <pieceId> --out /tmp/<pieceId>.mp4`, then `node tools/still-frames.mjs /tmp/<pieceId>.mp4`
  must print an EMPTY `windows:` line.
- loops: also `node tools/loop-seam.mjs /tmp/<pieceId>.mp4` must print SEAMLESS.
- loudness (videos): `ffmpeg -nostats -i /tmp/<pieceId>.mp4 -af ebur128 -f null - 2>&1 | grep " I:"` should be about −16 LUFS.
- `npx tsc --noEmit -p tsconfig.json` must print nothing.
- Do not commit, do not touch ~/rotli, do not run `studio.mjs render all` or golden.

Report back: files created, the final sheet paths, still-frames / loop-seam / loudness results, what you would improve
with more time, and anything you could not make work.

--- THE STUDY (from series/studies/briefs/motion-resume.json) ---
Motion Résumé · study 01 · video · 900 frames at 60 fps, 120 bpm · palette "night"
Style: Dark ground, one accent (the pack's night palette), small mono HUD labels, a faint dot grid. Sans for statements, the serif italic for feeling. Motion blur (4 subframes, 180° shutter).
Learns from: A public 15 s reel Opus 5.5 made from one prompt (https://x.com/darel023/status/2103424524297420829): show technique as the content, one accent, cut on the music. Nothing from it is copied: every shape and word here is new.
Beats (frames · what):
  - 0–90 · hook: an accent dot lands with an overshoot and rings once, then slides to the start of a curve
  - 90–210 · easing: a cubic-bezier curve with live handles morphs linear → ease-out → overshoot; a dot rides it and a rail reads its value
  - 210–390 · type: motion (letters rise), timing (letters drop), feeling (serif italic scales in); every i is dotted with the accent; feeling folds into the dot
  - 390–510 · interface: the dot becomes a switch, the switch turns on and opens into a 'Render complete' toast with a drawn check
  - 510–630 · data: a velocity bell of 17 bars becomes a position curve; one bar carries the accent
  - 630–750 · space: an isometric block field with a wave and a ring of accent blocks, slow push-in
  - 750–840 · particles: a 3,200-point spiral tilts toward the camera and falls into one point
  - 840–900 · sign-off: the point becomes the full stop of the Oriel wordmark; 'Motion study 01 — designing the in-between'
Sizes: Vertical re-stacks: content scales up and each section is named large in the serif above the action.
Teaches: A reel is a list of techniques joined by one object (the dot). Continuity beats variety: every section is born from the last one's final shape.

