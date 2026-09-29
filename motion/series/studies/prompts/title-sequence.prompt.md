You are building ONE study for the open-source rotli studio: a piece that shows the studio works for ANY product,
style and size, not only Rotli. Work ONLY in ~/rotli-studio/motion (a Node/npm project; use `node`, not bun; `~` is
your home directory, expand it to an absolute path for file tools). In every shell command use absolute paths or
`cd ~/rotli-studio/motion && …` (the shell's cwd resets between commands).

YOUR STUDY: "Title Sequence" (study 35), brief at `series/studies/briefs/title-sequence.json` (read it first; it is the contract).
Pieces to export from `src/canvas-core/studies/titleSequence.ts`: `titleSequence` (landscape), `titleSequenceVertical` (vertical). Primary size: landscape.

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
1. Create/modify ONLY `src/canvas-core/studies/titleSequence.ts` and its hosts `src/hosts/page-<pieceId>.ts` (one per piece, copy
   `src/hosts/page-motionResume.ts`). Do NOT edit the kit, the pack, tools, pieces.json, series.json, goldens or any other
   piece. If you need a helper, define it in your module. Do not register the pieces; the maintainer does.
2. Never import from `rotli/`, `studio/` or `brand/brand.json`: a study must not look or sound like Rotli. No quokka.
3. Follow the brief's story beats and timing (you may retime inside a beat; every shot must start on the beat grid:
   one beat = 60 / bpm × fps frames; `validate()` in film.ts refuses anything else). Frames: 720 at 30 fps.
4. Design EACH size (the brief's "sizes" note); a vertical re-stacks, it never just crops. Keep text inside `layout().safe`.
5. Quality bar: nothing overlaps unintentionally, no text under 22 px (at 1080 short side), flat colour, depth from
   shadow only where the style allows, every hold keeps moving (a slow push-in, drift or ambient motion).
6. Copy is invented for the fictional product; never claim anything about a real company or person.
7. Sound: beatScore drive at 150 bpm (a fast, jazzy pulse; key −2), drums entering on the first hard cut (drop at frame 96); a hit on every hard colour cut (frames 96, 192, 288, 384, 480 and 576) and on the final bar slam (frame 672); soft ticks for each bar that stabs in, each chair, each cup, each clock notch and each title letter (thinned to every other one where they fall on consecutive beats); the three-note sign-off at frame 684.

VERIFY BY LOOKING, and iterate until right:
- `node tools/frames.mjs <pieceId> <8–12 frames across the piece> --out /tmp/title-sequence --sheet /tmp/title-sequence.png --cols 6`,
  then READ the PNG (and full frames in /tmp/title-sequence/ where detail matters). Do this for EVERY size.
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

--- THE STUDY (from series/studies/briefs/title-sequence.json) ---
Title Sequence · study 35 · video · 720 frames at 30 fps, 150 bpm · palette "bass"
Style: Opening titles for an invented film, 'The Long Meeting', in the mid-century cut-paper manner: flat fields of saturated colour, cut-paper shapes with slightly irregular edges, one stark symbol per scene, asymmetric composition, and credits set INTO the shapes, all moving on a jazz pulse. PAPER: every shape is a polygon whose vertices carry a small seeded jitter (1–3 px at 1080) so edges read as cut with scissors, never vector-perfect; bars are long thin quadrilaterals whose ends are cut at slightly different angles; circles are 48-gons with the same jitter. No outlines, no gradients, no shadows except an optional 2 px offset of the ground colour darkened 8% under a shape that has just landed, gone after 6 frames. A light static paper speckle (seeded, alpha 0.04) sits over everything. COLOUR is per scene, a full-bleed field on a hard cut on the beat: the deep ink (as a black field) with cream shapes, the accent (vermilion) field with ink shapes, the accent2 (mustard) field with ink shapes, the cream ground with ink and vermilion shapes. MOTION is cut-out animation: positions and angles step 'on twos' (quantise the time to every second frame) for the handmade feel, and every arrival lands on a beat with a hard stop and a 1–2 frame overshoot, never a soft ease; bars STAB in from the frame edges on the beat, slide, and stop dead; groups of bars rearrange on each bar of music. SYMBOLS (all cut paper, drawn in code): a long meeting table seen from above with chairs as small rounded rectangles; a clock face whose minute hand jumps a notch on every beat; a raised hand (a simple mitten silhouette with a thumb); a row of identical coffee cups; an agenda that keeps growing as stepped bars (a jagged staircase). TYPE: credits in Inter 600 UPPERCASE with wide tracking (0.18 em), 30–40 px at 1080, set along or inside a shape (on a bar, in the clock's centre, across the table) in the colour that contrasts with that shape; the role words ('starring', 'music by') in Instrument Serif Italic lowercase, a little larger. THE TITLE is Inter 800 at about 180 px, each letter cut as its own piece of paper: a per-letter rotation of ±2°, a per-letter baseline offset of ±6 px and letters that arrive one per beat. Every credit is an INVENTED role, not a person: the cast and crew are the parts of a meeting.
Learns from: Saul Bass's title sequences: the cut-paper, jazz-driven opening of The Man with the Golden Arm (1955), with white bars that stab in, form patterns and coalesce into a symbol, and the paper cut-outs on a flat ground of Anatomy of a Murder (1959), with credits set beside the pieces (Art of the Title, https://www.artofthetitle.com/title/the-man-with-the-golden-arm/ and https://www.artofthetitle.com/title/anatomy-of-a-murder/; overview at https://www.artofthetitle.com/designer/saul-bass/). Their symbols, lettering, colours, music and credits are not used; the film, its title and every credit here are invented.
Beats (frames · what):
  - 0–96 · the bars: a black field; cream bars stab in from the frame edges one per beat, stop dead, and on each bar of music slide into a new arrangement; a small credit rides in on one bar: 'A CONFERENCE ROOM PICTURE'
  - 96–192 · the table: hard cut to the cream field; the bars swing and snap into a long meeting table seen from above, chairs landing around it one per beat; along the table: '*starring* THE AGENDA'
  - 192–288 · the clock: hard cut to the vermilion field; a cut-paper clock face in ink with a cream centre; the minute hand jumps one notch every beat and the hour hand creeps; in the centre: '*and* ANY OTHER BUSINESS'
  - 288–384 · the hand: hard cut to the mustard field; an ink hand rises from the bottom edge in three stepped moves, waits, then drops; beside it: '*with* THE PROJECTOR *as itself*'
  - 384–480 · the cups: hard cut to the black field; cream coffee cups land in a row one per beat, eight of them, then the row slides left and more arrive; on the table line under them: '*screenplay by* THE MINUTES'
  - 480–576 · the agenda: hard cut to the cream field; vermilion bars stack into a jagged staircase that keeps growing to the right, a new step on every beat, each step labelled in JetBrains Mono 26 px ('item 1', 'item 2', 'item 7', 'item 12'); across the top step: '*music by* HOLD MUSIC'
  - 576–672 · the title: hard cut to the vermilion field; the staircase bars fly in and assemble into a frame; the title cuts in letter by letter, one per beat, each letter a separate piece of paper: 'THE LONG MEETING'; a thin ink bar underlines it
  - 672–720 · last card: one ink bar slams across the frame and the last credit sits on it: '*directed by* NOBODY IN PARTICULAR'; the minute hand from the clock scene ticks once in the corner; hold with a slight drift
Sizes: Vertical re-stacks: the table is seen from above running top to bottom, the bars stab in from the top and bottom edges as well as the sides, the clock sits in the upper half with its credit below it, the cups stack in two rows of four, the agenda staircase grows downward instead of to the right, and the title breaks onto three lines ('THE' / 'LONG' / 'MEETING') at about 150 px. Credits stay inside the safe area on or beside their shape.
Teaches: A title sequence sells a film's mood before a word of it is spoken: one stark symbol per scene, flat colour fields cut on the beat, and credits that live inside the shapes turn a list of names into a rhythm.

