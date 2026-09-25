You are building ONE study for the open-source rotli studio: a piece that shows the studio works for ANY product,
style and size, not only Rotli. Work ONLY in ~/rotli-studio/motion (a Node/npm project; use `node`, not bun; `~` is
your home directory, expand it to an absolute path for file tools). In every shell command use absolute paths or
`cd ~/rotli-studio/motion && …` (the shell's cwd resets between commands).

YOUR STUDY: "Particle Word" (study 07), brief at `series/studies/briefs/particle-word.json` (read it first; it is the contract).
Pieces to export from `src/canvas-core/studies/particleWord.ts`: `particleWord` (landscape), `particleWordSquare` (square). Primary size: landscape.

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
1. Create/modify ONLY `src/canvas-core/studies/particleWord.ts` and its hosts `src/hosts/page-<pieceId>.ts` (one per piece, copy
   `src/hosts/page-motionResume.ts`). Do NOT edit the kit, the pack, tools, pieces.json, series.json, goldens or any other
   piece. If you need a helper, define it in your module. Do not register the pieces; the maintainer does.
2. Never import from `rotli/`, `studio/` or `brand/brand.json`: a study must not look or sound like Rotli. No quokka.
3. Follow the brief's story beats and timing (you may retime inside a beat; every shot must start on the beat grid:
   one beat = 60 / bpm × fps frames; `validate()` in film.ts refuses anything else). Frames: 720 at 60 fps.
4. Design EACH size (the brief's "sizes" note); a vertical re-stacks, it never just crops. Keep text inside `layout().safe`.
5. Quality bar: nothing overlaps unintentionally, no text under 22 px (at 1080 short side), flat colour, depth from
   shadow only where the style allows, every hold keeps moving (a slow push-in, drift or ambient motion).
6. Copy is invented for the fictional product; never claim anything about a real company or person.
7. Sound: beatScore soft at 120 bpm with a whoosh into each change of form, a hit when the word is complete, and the sign-off under the ring.

VERIFY BY LOOKING, and iterate until right:
- `node tools/frames.mjs <pieceId> <8–12 frames across the piece> --out /tmp/particle-word --sheet /tmp/particle-word.png --cols 6`,
  then READ the PNG (and full frames in /tmp/particle-word/ where detail matters). Do this for EVERY size.
- videos: `node tools/render.mjs <pieceId> --out /tmp/<pieceId>.mp4`, then `node tools/still-frames.mjs /tmp/<pieceId>.mp4`
  must print an EMPTY `windows:` line.
- loops: also `node tools/loop-seam.mjs /tmp/<pieceId>.mp4` must print SEAMLESS.
- loudness (videos): `ffmpeg -nostats -i /tmp/<pieceId>.mp4 -af ebur128 -f null - 2>&1 | grep " I:"` should be about −16 LUFS.
- `npx tsc --noEmit -p tsconfig.json` must print nothing.
- Do not commit, do not touch ~/rotli, do not run `studio.mjs render all` or golden.

Report back: files created, the final sheet paths, still-frames / loop-seam / loudness results, what you would improve
with more time, and anything you could not make work.

--- THE STUDY (from series/studies/briefs/particle-word.json) ---
Particle Word · study 07 · video · 720 frames at 60 fps, 120 bpm · palette "deep"
Style: Generative: thousands of particles on a deep navy ground. Dust drifts, finds its places inside the letters of a word, releases into a 3D point-cloud sphere with orbit rings, becomes a flowing wave surface, and gathers into one bright point. One warm accent for a few particles and the rings.
Learns from: Particle systems in code-made reels: a word assembled from dust, point clouds with orbit rings, a wave surface.
Beats (frames · what):
  - 0–120 · hook: a field of drifting dust with depth (near particles larger and brighter); a single accent particle crosses the frame
  - 120–270 · the dust streams into the letters of 'ORIEL', each particle on its own delay, until the word is legible and softly shimmering
  - 270–420 · the word breaks apart into a rotating 3D point-cloud sphere; two thin accent orbit rings tilt around it
  - 420–570 · the sphere unrolls into a wave surface of points seen in perspective, rippling toward the viewer
  - 570–660 · the wave folds into a vortex and every particle collapses into one bright point
  - 660–720 · sign-off: the point opens into a small ring; 'Oriel' fades up beneath it with 'every hour, found'
Sizes: Square frames the word on two lines ('ORI' over 'EL') and keeps the sphere and wave centred.
Teaches: Give every particle a home in each form and one clock of its own; morphing is then just interpolation between homes with staggered springs.

