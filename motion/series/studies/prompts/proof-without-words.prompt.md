You are building ONE study for the open-source rotli studio: a piece that shows the studio works for ANY product,
style and size, not only Rotli. Work ONLY in ~/rotli-studio/motion (a Node/npm project; use `node`, not bun; `~` is
your home directory, expand it to an absolute path for file tools). In every shell command use absolute paths or
`cd ~/rotli-studio/motion && …` (the shell's cwd resets between commands).

YOUR STUDY: "Proof Without Words" (study 28), brief at `series/studies/briefs/proof-without-words.json` (read it first; it is the contract).
Pieces to export from `src/canvas-core/studies/proofWithoutWords.ts`: `proofWithoutWords` (landscape), `proofWithoutWordsVertical` (vertical). Primary size: landscape.

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
1. Create/modify ONLY `src/canvas-core/studies/proofWithoutWords.ts` and its hosts `src/hosts/page-<pieceId>.ts` (one per piece, copy
   `src/hosts/page-motionResume.ts`). Do NOT edit the kit, the pack, tools, pieces.json, series.json, goldens or any other
   piece. If you need a helper, define it in your module. Do not register the pieces; the maintainer does.
2. Never import from `rotli/`, `studio/` or `brand/brand.json`: a study must not look or sound like Rotli. No quokka.
3. Follow the brief's story beats and timing (you may retime inside a beat; every shot must start on the beat grid:
   one beat = 60 / bpm × fps frames; `validate()` in film.ts refuses anything else). Frames: 1920 at 60 fps.
4. Design EACH size (the brief's "sizes" note); a vertical re-stacks, it never just crops. Keep text inside `layout().safe`.
5. Quality bar: nothing overlaps unintentionally, no text under 22 px (at 1080 short side), flat colour, depth from
   shadow only where the style allows, every hold keeps moving (a slow push-in, drift or ambient motion).
6. Copy is invented for the fictional product; never claim anything about a real company or person.
7. Sound: beatScore soft at 90 bpm (pad and pluck), a tick as each equation term lands and as each triangle lands in the square (four ticks, one per beat), a whoosh ending on the copy slide (frame 840) and on the side swap (frame 1320), a hit when 'a² + b² = c²' completes after the swap (frame 1320), soft ticks thinned to every third cell while the unit cells count, a hit on '9 + 16 = 25' (frame 1640), and the sign-off at frame 1760.

VERIFY BY LOOKING, and iterate until right:
- `node tools/frames.mjs <pieceId> <8–12 frames across the piece> --out /tmp/proof-without-words --sheet /tmp/proof-without-words.png --cols 6`,
  then READ the PNG (and full frames in /tmp/proof-without-words/ where detail matters). Do this for EVERY size.
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

--- THE STUDY (from series/studies/briefs/proof-without-words.json) ---
Proof Without Words · study 28 · video · 1920 frames at 60 fps, 90 bpm · palette "chalk"
Style: A math explainer in which the shapes do the arguing. A dark slate ground (ground), crisp vector geometry, no texture, no chalk grain, no shadows. Every quantity has ONE colour for the whole film and keeps it wherever it goes: side a and its square are accent2 (blue), side b and its square are s1 (pink), side c and its square are accent (yellow); ink is for neutral outlines and the equals sign, muted for braces and ghosts. Shapes are drawn as a 4 px stroke in their colour at full opacity with a fill of the same colour at 45% opacity, so overlaps and holes read. The film's vocabulary: (1) WRITE: a shape appears by tracing its outline (stroke drawn by arc length over about 0.6 of a beat) and only then its fill fades in; text and symbols write the same way (outline then fill), never pop; (2) TRANSFORM: a shape moves to its new place by interpolating position and rotation together on one smooth S-curve (slow start, fast middle, slow finish; a symmetric sigmoid-shaped ease), one motion per beat (40 frames at 60 fps), several objects staggered by 6–8 frames (a lag, not a simultaneous jump); (3) COPY: a duplicate peels off its original as a ghost outline and slides away before it fills; (4) INDICATE: to point at something, it scales to 1.15 and flashes toward white and back in half a beat; (5) EQUATIONS ASSEMBLE TERM BY TERM: every symbol in an equation arrives from a shape on screen: the label 'a²' lifts off the blue square and flies on a gentle arc into its slot, then '+', then 'b²' from the pink square, then '=' writes, then 'c²' from the yellow square; when an equation rearranges, matching terms slide past each other on arcs rather than cross-fading. Variables are Instrument Serif Italic (like printed maths), exponents at 60% size raised by 40%, numbers and operators in Inter 400; the few words are Inter 400 in muted, small. The triangle is a 3:4:5 right triangle (a = 3, b = 4, c = 5 units) so the numeric check reuses it, and a small square marks the right angle. The geometry is closed-form in (a, b): corner positions of the big square of side a + b, the four triangles and the holes are functions of a and b, so the figure can be re-solved live when the legs change. The camera is still; the composition re-centres by translating groups on the same S-curve.
Learns from: The proof-without-words tradition (Roger B. Nelsen's collection for the Mathematical Association of America, https://bookstore.ams.org/view?ProductCode=CLRM%2F1; the Wikipedia overview, https://en.wikipedia.org/wiki/Proof_without_words), the rearrangement proofs catalogued at cut-the-knot (https://www.cut-the-knot.org/pythagoras/), and the animated maths explainer as practised by 3Blue1Brown with its open-source engine (https://github.com/3b1b/manim): dark ground, one colour per quantity, outlines that write on before they fill, shapes that transform on a smooth S-curve, equations assembled from the shapes. Their colours, scenes, voice and copy are not used.
Beats (frames · what):
  - 0–240 · the triangle: a right triangle writes itself on in the centre (outline, then fill), its right-angle square appears, then each side lights in its colour and its label writes beside it: 'a' (blue), 'b' (pink), 'c' (yellow) on the hypotenuse; above it, small and muted, 'a right triangle' writes and fades
  - 240–480 · the claim: squares grow outward from each side (blue on a, pink on b, yellow on c), each labelled 'a²', 'b²', 'c²' at its centre; the labels lift off one at a time and assemble below the figure as 'a² + b² = c²', with a small '?' written above the '='; the '?' pulses once
  - 480–800 · setup: the side squares fade to ghosts and go; the triangle is copied three times (ghost outlines peel off and fill); an ink square outline of side a + b writes on, with muted braces reading 'a' and 'b' along each edge; the four triangles fly in one per beat, each rotating 90° more than the last, and land in the four corners; the tilted square left in the middle fills yellow and gets its label 'c²'
  - 800–1120 · rearrange: the whole square slides left and a copy peels off to the right; on the right copy the four triangles slide and rotate, two at a time, into two a × b rectangles in opposite corners; the two empty squares they leave fill blue ('a²') and pink ('b²'); under both squares a muted brace reads 'a + b' and the small line 'same square · same four triangles' writes between them
  - 1120–1440 · so: the triangles in both squares dim to ghosts; the yellow hole on the left and the blue and pink holes on the right indicate (scale and flash); their labels lift out and assemble centred below as 'c² = a² + b²', then the two sides swap on arcs into 'a² + b² = c²'; for the last two beats the legs a and b stretch and shrink (the triangle gets taller, then wider) and both figures re-solve live, the holes changing shape while the equation stays true
  - 1440–1680 · a check with numbers: the figures clear back to the 3:4:5 triangle with its three squares, now ruled into unit cells; the cells count in fast (9 blue, 16 pink, 25 yellow) with small counters; the equation assembles term by term as '3² + 4² = 5²' and transforms into '9 + 16 = 25'
  - 1680–1920 · end: the triangle alone with 'a² + b² = c²' beneath it; one muted line writes under it: 'Named for Pythagoras. Known to the Babylonians about 1,000 years earlier.'; a small yellow square (the end-of-proof mark) writes on at the right of the equation and indicates once; a slow drift holds
Sizes: Vertical re-stacks: the triangle and its squares sit in the upper half of the safe area, equations below them at a larger size; in the rearrangement the two big squares stack one above the other (the c² square on top, the a² + b² square below) with the 'same square · same four triangles' line between them and the equation under both; the unit-cell check shows the three squares stacked by size; the end line breaks into two lines. Nothing sits in the top 220 px or the bottom 320 px.
Teaches: Move the shapes and the proof explains itself: when each quantity keeps one colour and every symbol in the equation flies out of a shape on screen, the viewer sees why it is true, not just that it is.

