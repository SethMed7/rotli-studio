You are building ONE study for the open-source rotli studio: a piece that shows the studio works for ANY product,
style and size, not only Rotli. Work ONLY in ~/rotli-studio/motion (a Node/npm project; use `node`, not bun; `~` is
your home directory, expand it to an absolute path for file tools). In every shell command use absolute paths or
`cd ~/rotli-studio/motion && …` (the shell's cwd resets between commands).

YOUR STUDY: "Whiteboard Hand" (study 27), brief at `series/studies/briefs/whiteboard-hand.json` (read it first; it is the contract).
Pieces to export from `src/canvas-core/studies/whiteboardHand.ts`: `whiteboardHand` (landscape), `whiteboardHandVertical` (vertical). Primary size: landscape.

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
1. Create/modify ONLY `src/canvas-core/studies/whiteboardHand.ts` and its hosts `src/hosts/page-<pieceId>.ts` (one per piece, copy
   `src/hosts/page-motionResume.ts`). Do NOT edit the kit, the pack, tools, pieces.json, series.json, goldens or any other
   piece. If you need a helper, define it in your module. Do not register the pieces; the maintainer does.
2. Never import from `rotli/`, `studio/` or `brand/brand.json`: a study must not look or sound like Rotli. No quokka.
3. Follow the brief's story beats and timing (you may retime inside a beat; every shot must start on the beat grid:
   one beat = 60 / bpm × fps frames; `validate()` in film.ts refuses anything else). Frames: 1020 at 30 fps.
4. Design EACH size (the brief's "sizes" note); a vertical re-stacks, it never just crops. Keep text inside `layout().safe`.
5. Quality bar: nothing overlaps unintentionally, no text under 22 px (at 1080 short side), flat colour, depth from
   shadow only where the style allows, every hold keeps moving (a slow push-in, drift or ambient motion).
6. Copy is invented for the fictional product; never claim anything about a real company or person.
7. Sound: beatScore soft at 90 bpm (pad and pluck, no drums), marker squeaks as ticks while strokes draw (thinned to one tick every 4 frames, and only on strokes longer than 10 frames, so it never buzzes), a whoosh ending on each erase-wipe (frames 140, 760 and 920), a hit when 'about 42°' is written (frame 680) and when the full bow completes (frame 860), and the sign-off at frame 960.

VERIFY BY LOOKING, and iterate until right:
- `node tools/frames.mjs <pieceId> <8–12 frames across the piece> --out /tmp/whiteboard-hand --sheet /tmp/whiteboard-hand.png --cols 6`,
  then READ the PNG (and full frames in /tmp/whiteboard-hand/ where detail matters). Do this for EVERY size.
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

--- THE STUDY (from series/studies/briefs/whiteboard-hand.json) ---
Whiteboard Hand · study 27 · video · 1020 frames at 30 fps, 90 bpm · palette "whiteboard"
Style: A whiteboard explainer, speed-drawn on a clean board by a drawn hand. The ground is the board (ground, a warm white) with a few faint ghost marks of old drawings (line colour, 1–2 px scribbles at fixed seeded positions, 40% alpha), so it reads as a used whiteboard, never a blank screen. Every drawing is a list of polylines authored in unit coordinates (each object 1–6 strokes) and drawn ON by arc length: a stroke is visible from 0 to s(F) and the pen tip sits at s(F); strokes run fast on an ease-in-out (a simple object in 8–14 frames, a complex one in 20–30), one after another, with a 2–3 frame lift between strokes. The marker look: round caps and joins, ink lines 7 px at 1080 (details 4 px), and a felt-tip streak: a second pass 1.5 px narrower, offset 1 px, in the ground colour at 25% alpha. Colour markers are only accent (red), accent2 (blue) and the seven spectrum roles s1–s7 (red to violet) for light; shading is marker hatching (parallel strokes at 30°, 14 px apart), never a flat fill, except the rainbow bands, which are thick 18 px marker arcs. THE HAND is drawn, not a photo: a right hand in the hand colour with a 4 px ink outline, a palm block and a rounded cuff that run off the bottom-right edge, thumb and index finger pinching a marker (a rounded rectangle about 26×150 px at 1080, body in surface, a cap band in the current marker's colour), two short knuckle creases; about 420 px long, rotated about 25°. Its marker tip is locked to the current pen point every frame, plus a small tremor from a seeded hash of floor(F / 2) (±2 px, stepping on twos so it feels time-lapsed). Between drawings the hand lifts away toward the bottom-right (60% out of frame) and returns for the next object; route it so it never covers a caption while that caption is being read. Text is WRITTEN, not typed: each caption is Inter 600 in ink, revealed left to right under a clip whose edge the marker tip rides, the tip bobbing ±10 px at letter rate so it reads as handwriting; step numbers sit in a hand-drawn circle (an open 330° loop); key words get a red underline stroke that draws on after the caption. ERASE-WIPES between ideas: the hand swaps its marker for a felt eraser (a dark grey rounded block about 150×70 px with a lighter felt strip) and sweeps a zigzag across the board in one beat; everything under the swept path is painted out by a 160 px ground-coloured stroke drawn to progress p, leaving a grey ghost (line colour, 35%) that fades over the next beat. The optics diagram is physically honest: violet bends more than red at each surface, the ray reflects once off the back of the drop, and the exiting red ray makes the larger angle (about 42°) with a line drawn back toward the sun, violet the smaller (about 40°); the angle is always measured on the sun side, never against the forward extension of the sunlight (that would be about 138°). Camera: a slow push-in (1.00 to 1.04) through each hold and one pull-back for the big picture. Any frame is the drawn-so-far state computed from the frame alone.
Learns from: Whiteboard animation as a genre (https://en.wikipedia.org/wiki/Whiteboard_animation): the RSA Animate lecture series drawn by Cognitive Media (https://www.thersa.org/people/andrew-park/) and the VideoScribe software (https://www.videoscribe.co/): a visible hand speed-drawing marker lines in time-lapse, captions written on, erase-and-redraw between ideas, one idea per drawing. Their drawings, characters, voices, colours and copy are not used; the lesson here is original.
Beats (frames · what):
  - 0–120 · hook: the hand swoops in from the bottom right and speed-draws a small sun in the upper left, a stick-figure viewer facing right in the lower middle, and a raincloud with slanted rain streaks on the right; it swaps to colour markers and sweeps the rainbow over the rain, seven thick bands, red outermost; then it writes the title top-left: 'How a rainbow forms' with 'rainbow' underlined in red
  - 120–300 · step 1: an erase-wipe clears the board in one beat; the hand draws one huge raindrop (a circle about 560 px across at 1080, blue marker, a small highlight tick); a single ink ray labelled 'sunlight' draws in from the left, hits the upper part of the drop and kinks inward; a small angle arc marks the bend; caption in a circled '1': 'Light bends as it enters the drop'
  - 300–440 · step 2: inside the drop the ink ray fans into seven thin coloured lines (s1 red bending least, s7 violet bending most), each drawing on in a quick stagger; caption '2': 'Each colour bends a different amount'; 'white light' is written small beside the incoming ray
  - 440–580 · step 3: the seven lines reach the back of the drop and bounce once, drawing on toward the lower left; a tiny red marker star flashes at the back wall; caption '3': 'It reflects off the back of the drop'
  - 580–740 · step 4: the lines cross the lower surface and kink again as they leave, heading down to the left; the hand draws a dashed line through the exit point parallel to the incoming sunlight, pointing back toward the sun, and a red protractor arc for the small angle between that line and the exiting red ray, then writes 'about 42°' beside it in red, and a smaller 'violet about 40°' under it; caption '4': 'It bends again on the way out'
  - 740–900 · the big picture: an erase-wipe, then a pull-back as the hand speed-draws the whole scene: the sun behind the viewer, a dashed line from the sun through the viewer's head down to a small cross labelled 'point opposite the sun'; two thin lines leave the viewer's eye and fan up at about 40° and 42° from that dashed line (the angle sits at the eye; the cross only marks the direction opposite the sun), and a drop on each line sends one colour to the eye: red from the higher line, violet from the lower; then the full bow draws on over the rain band by band, red on the outside to violet on the inside; captions write on in two lines: 'Sun behind you. Rain in front.' then 'Red outside, violet inside.'
  - 900–1020 · recap and end: an erase-wipe; four tiny drop icons draw in a row, each with its ray drawn in one quick stroke and a word under it: 'bend', 'split', 'reflect', 'bend'; the headline writes above them: 'A rainbow: bend, split, reflect, bend.' with 'reflect' underlined in red; a small mono footer 'a primary rainbow · angles approximate'; the hand caps its marker (a click) and slides out; a slow push-in holds
Sizes: Vertical re-stacks: the title and captions sit in the top third of the safe area and wrap to two lines; the raindrop sits in the middle third at nearly the full safe width, with the incoming sunlight entering from the left edge and the exit rays leaving toward the lower left, where the 42° arc and its labels sit under the drop; the big picture turns portrait: the sun at the top left, the viewer at the bottom left, the bow arcing across the upper middle over a rain band, the point opposite the sun off the lower edge (show the dashed line leaving the frame with a small arrow and label); the recap icons become a 2×2 grid. The hand keeps entering from the bottom right, above the bottom safe margin.
Teaches: Showing the drawing happen is the explanation: when a hand builds each idea line by line and wipes the board before the next, the viewer follows the reasoning at the speed it is drawn.

