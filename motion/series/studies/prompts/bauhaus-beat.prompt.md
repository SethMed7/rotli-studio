You are building ONE study for the open-source rotli studio: a piece that shows the studio works for ANY product,
style and size, not only Rotli. Work ONLY in ~/rotli-studio/motion (a Node/npm project; use `node`, not bun; `~` is
your home directory, expand it to an absolute path for file tools). In every shell command use absolute paths or
`cd ~/rotli-studio/motion && …` (the shell's cwd resets between commands).

YOUR STUDY: "Bauhaus Beat" (study 34), brief at `series/studies/briefs/bauhaus-beat.json` (read it first; it is the contract).
Pieces to export from `src/canvas-core/studies/bauhausBeat.ts`: `bauhausBeatSquare` (square), `bauhausBeat` (landscape). Primary size: square.

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
1. Create/modify ONLY `src/canvas-core/studies/bauhausBeat.ts` and its hosts `src/hosts/page-<pieceId>.ts` (one per piece, copy
   `src/hosts/page-motionResume.ts`). Do NOT edit the kit, the pack, tools, pieces.json, series.json, goldens or any other
   piece. If you need a helper, define it in your module. Do not register the pieces; the maintainer does.
2. Never import from `rotli/`, `studio/` or `brand/brand.json`: a study must not look or sound like Rotli. No quokka.
3. Follow the brief's story beats and timing (you may retime inside a beat; every shot must start on the beat grid:
   one beat = 60 / bpm × fps frames; `validate()` in film.ts refuses anything else). Frames: 720 at 30 fps.
4. Design EACH size (the brief's "sizes" note); a vertical re-stacks, it never just crops. Keep text inside `layout().safe`.
5. Quality bar: nothing overlaps unintentionally, no text under 22 px (at 1080 short side), flat colour, depth from
   shadow only where the style allows, every hold keeps moving (a slow push-in, drift or ambient motion).
6. Copy is invented for the fictional product; never claim anything about a real company or person.
7. Sound: beatScore drive at 120 bpm with loop: true (tails wrap), drums from frame 0 (no drop), added hits at frames 0, 180, 360 and 540 (they turn the red square), no whooshes, no sign-off (it is a loop), and no ticks: the score's own kick, bass, chords, hats and arpeggio are what the shapes play, computed from the same beat grid.

VERIFY BY LOOKING, and iterate until right:
- `node tools/frames.mjs <pieceId> <8–12 frames across the piece> --out /tmp/bauhaus-beat --sheet /tmp/bauhaus-beat.png --cols 6`,
  then READ the PNG (and full frames in /tmp/bauhaus-beat/ where detail matters). Do this for EVERY size.
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

--- THE STUDY (from series/studies/briefs/bauhaus-beat.json) ---
Bauhaus Beat · study 34 · video · 720 frames at 30 fps, 120 bpm · palette "bauhaus"
Style: A pure music visual, a seamless 12-bar loop, in the Bauhaus and constructivist manner: flat geometric composition on cream paper where the shapes PLAY the score. The cast, each always in its own colour: one blue circle (accent2), one red square (accent), one yellow triangle (s1), black bars and arcs (ink), and thin black rules. Flat fills only, no outlines, no gradients, no shadows, no texture beyond a very faint paper speckle (seeded, static). Shapes may overlap; where they do, the later one simply covers the earlier (flat print). The composition lives on a module grid (square: 6 × 6; landscape: 10 × 6) and every resting position is on it. THE MUSIC DRIVES THE PICTURE from the same numbers the score uses (beatScore drive at 120 bpm: a kick on every beat, bass on beats 1 and 3, a four-chord cycle that changes every bar, hats on the off-sixteenths and a sixteenth-note arpeggio whose pattern of chord tones is 0, 1, 2, 1, 0, 2, 1, 2): compute beat, bar and sixteenth positions from the frame (one beat = 15 frames, a sixteenth = 3.75 frames, fractional), never from audio analysis. The mapping: the KICK pulses the blue circle (scale 1 + 0.08 × exp(−t / 4 frames) after each beat); the BASS on beats 1 and 3 moves the yellow triangle one half-module along its current path, landing exactly on the note in 3 frames; the CHORD sets the angle of a large black quarter-disc anchored to a corner (0°, 90°, 180°, 270° for the four chords, so it returns to its start every four bars); the HATS flick a row of eight short black bars at the bottom edge (the bar for the current off-sixteenth jumps up and decays); the ARPEGGIO is a row of sixteen small dots whose heights follow the chord-tone pattern, the current step red; each added HIT (bars 1, 4, 7 and 10) turns the red square 90° with a hard ease-out. RECOMPOSITION on every bar: the whole composition (positions and sizes of circle, square, triangle, bars and arcs) glides to the next of six authored layouts during the last 6 frames of the bar and LANDS on the downbeat; bars 1–6 play layouts A–F, bars 7–12 play them mirrored left to right with the ground elements swapped, and bar 12 glides into layout A so frame 720 equals frame 0. The only words are a title in the Bauhaus spirit, all lowercase, Inter 800: 'three shapes' set large as part of the composition in bars 1 and 7 (along a black bar, reading upward in one of them), and small in the bottom-left margin for the rest of the loop, always present so the loop is seamless.
Learns from: Wassily Kandinsky's Bauhaus colour-form teaching (yellow triangle, red square, blue circle; https://artsandculture.google.com/story/bauhaus-the-importance-of-shapes-the-centre-pompidou/OwURAJwcVUkTow) and Oskar Fischinger's visual music, abstract shapes cut to a score (https://www.centerforvisualmusic.org/Fischinger/OFBio.htm): flat primary geometry, compositions that rebalance, shapes that move on the music's events. Their paintings, films, music and compositions are not used; the six layouts here are original.
Beats (frames · what):
  - 0–180 · bars 1–3: layout A lands on the first downbeat with the title 'three shapes' set large along a black bar; the circle pulses on every kick, the triangle steps on the bass, the hats bar row and the arpeggio dots run along the bottom; the red square turns 90° on the hit at frame 0; bars 2 and 3 recompose into layouts B and C, the title shrinking to the bottom-left margin
  - 180–360 · bars 4–6: a hit at frame 180 turns the square; layouts D, E and F land one per bar; the quarter-disc rotates with each chord; in layout E the circle grows to fill a third of the frame and the other shapes orbit its edge
  - 360–540 · bars 7–9: the mirrored pass begins; layout A mirrored lands with 'three shapes' set large again, this time reading upward along a vertical bar; a hit turns the square at frame 360; the ground elements have swapped sides (the quarter-disc now anchors the opposite corner)
  - 540–720 · bars 10–12: a hit at frame 540; mirrored D, E and F; during the last 6 frames of bar 12 everything glides into layout A, landing exactly as the loop restarts
Sizes: Square (1:1) is primary on a 6 × 6 module grid with the hats row and the arpeggio dots along the bottom margin. Landscape (16:9) re-authors the six layouts on a 10 × 6 grid: the circle and square sit apart on the wide axis, the triangle travels the long horizontal paths, the quarter-disc anchors the right edge, the hats row and arpeggio dots run in a band across the bottom, and the title sits at the left margin; the mirrored pass mirrors across the vertical centre line.
Teaches: When picture and sound are computed from the same numbers, every hit can move something: give each instrument one shape and one kind of motion, recompose on the bar, and a still composition becomes a piece of music you can watch.

