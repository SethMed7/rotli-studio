You are building ONE study for the open-source rotli studio: a piece that shows the studio works for ANY product,
style and size, not only Rotli. Work ONLY in ~/rotli-studio/motion (a Node/npm project; use `node`, not bun; `~` is
your home directory, expand it to an absolute path for file tools). In every shell command use absolute paths or
`cd ~/rotli-studio/motion && …` (the shell's cwd resets between commands).

YOUR STUDY: "Recipe Flat-lay" (study 47), brief at `series/studies/briefs/recipe-flatlay.json` (read it first; it is the contract).
Pieces to export from `src/canvas-core/studies/recipeFlatlay.ts`: `recipeFlatlayVertical` (vertical), `recipeFlatlay` (square). Primary size: vertical.

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
1. Create/modify ONLY `src/canvas-core/studies/recipeFlatlay.ts` and its hosts `src/hosts/page-<pieceId>.ts` (one per piece, copy
   `src/hosts/page-motionResume.ts`). Do NOT edit the kit, the pack, tools, pieces.json, series.json, goldens or any other
   piece. If you need a helper, define it in your module. Do not register the pieces; the maintainer does.
2. Never import from `rotli/`, `studio/` or `brand/brand.json`: a study must not look or sound like Rotli. No quokka.
3. Follow the brief's story beats and timing (you may retime inside a beat; every shot must start on the beat grid:
   one beat = 60 / bpm × fps frames; `validate()` in film.ts refuses anything else). Frames: 1800 at 60 fps.
4. Design EACH size (the brief's "sizes" note); a vertical re-stacks, it never just crops. Keep text inside `layout().safe`.
5. Quality bar: nothing overlaps unintentionally, no text under 22 px (at 1080 short side), flat colour, depth from
   shadow only where the style allows, every hold keeps moving (a slow push-in, drift or ambient motion).
6. Copy is invented for the fictional product; never claim anything about a real company or person.
7. Sound: beatScore soft at 120 bpm (the 60 fps film keeps a whole 30-frame beat): a tick as each object lands (on its landing pose, thinned to at most one per 10 frames), a whoosh ending as each pour stops (the milk at 330, the batter circles at 1200), a hit at each step change (150, 480, 780, 1050, 1380), tiny ticks for bubble pops (thinned) and the timer, and the sign-off at 1680.

VERIFY BY LOOKING, and iterate until right:
- `node tools/frames.mjs <pieceId> <8–12 frames across the piece> --out /tmp/recipe-flatlay --sheet /tmp/recipe-flatlay.png --cols 6`,
  then READ the PNG (and full frames in /tmp/recipe-flatlay/ where detail matters). Do this for EVERY size.
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

--- THE STUDY (from series/studies/briefs/recipe-flatlay.json) ---
Recipe Flat-lay · study 47 · video · 1800 frames at 60 fps, 120 bpm · palette "kitchen"
Style: A top-down stop-motion recipe on a kitchen table, hands-free: the objects move themselves, one pose at a time. THE STOP-MOTION CLOCK: the film runs at 60 fps but every pose is held exactly 5 frames, so it animates at 12 poses a second ('on twos' at film rate): compute the pose index P = floor(F / 5) and draw everything from P, never from F; the beat is 30 frames, so every beat is exactly 6 poses. Easing lives in the SPACING of poses (big steps, then smaller as an object settles, one pose of overshoot back), never in smooth tweening, and there is no motion blur. BOIL: every object shifts by a seeded ±1 px and rotates ±0.3° per pose (a hash of P and the object's id), so a held shot is never frozen, the way hand-placed objects never sit exactly still. CAMERA: straight overhead, no perspective; one overhead light, so every object casts the same short hard drop shadow (deep at 18% alpha, offset 6 px down-right). THE TABLE: a warm linen ground with a faint woven texture (a seeded pattern of fine lines generated once per size) and a wooden board (board colour with a few grain strokes) under the work area. OBJECTS, flat and slightly rounded, drawn in code: a mixing bowl (surface-white circle with a line-coloured rim and an inner ellipse whose liquid disc grows as it fills), a second smaller bowl, two eggs that crack into halves (a zigzag split) and drop yolks, a milk jug that tilts and pours (the stream is a tapered stroke held for a few poses), a butter dish, a flour sack whose flour lands as a soft heap, small spoons with little mounds (baking powder, sugar, salt), a whisk that spins in stepped quarter turns, a pan (a deep circle with a handle) on a hob ring, a ladle, a kitchen timer, a plate. Batter is the batter colour, cooked faces the accent gold with crust-coloured edges. Liquids and batter fill in poses: a disc that grows in 4–6 steps, never a smooth scale. PANCAKES: ladled circles that grow in steps; bubbles appear as small rings on the surface, a few per pose, and pop (ring, dot, gone) over three poses; the flip is a top-down flip: the pancake's vertical scale steps 1 → 0.5 → 0 → −0.5 → −1 over five poses while its shadow grows and shrinks, and the underside shows the gold side; the stack grows one pancake per pose-step on a plate, each slightly offset. TYPE: each step is a card in the top area: a big step number in Inter 800 ink ('01'), a title in Instrument Serif Italic ink, and quantity tags beside their objects on small white rounded labels in Inter 600 ink (all quantities with ¼, ½ or ¾ are in Inter or JetBrains Mono, because the serif has no fraction glyphs); cards and tags step in on poses too. The accent gold (2.2:1) and the teal accent2 (3.9:1) are below 4.5:1 on the linen, so they are fill colours only, never text; all text is ink on the linen or on white labels. No health, diet or nutrition words anywhere.
Learns from: Stop-motion cooking films as a genre, credited to PES's Western Spaghetti (https://en.wikipedia.org/wiki/Western_Spaghetti), and animating on twos (https://en.wikipedia.org/wiki/Inbetweening, https://www.stopmotionstudio.com/help/stopmotion/en/shooting-on-twos.html): objects that move themselves on a tabletop, each pose held for more than one frame, easing carried by the spacing between poses, a camera straight overhead. PES's object substitutions, sets and footage are not used; the recipe's quantities and steps follow a standard home recipe from King Arthur Baking (https://www.kingarthurbaking.com/recipes/simply-perfect-pancakes-recipe), cited in the facts, with its wording not copied.
Beats (frames · what):
  - 0–150 · title: the empty board; the ingredients step in from the frame edges one per beat around an empty bowl (eggs, milk jug, butter dish, flour sack, spoons); the title card lands: 'Pancakes' in large Instrument Serif and 'a simple batter · makes about 12'
  - 150–480 · step 01 'Whisk the wet': two eggs crack into the big bowl, the milk jug tilts and pours in poses, melted butter drips in, the whisk spins in stepped quarter turns and the liquid turns pale; tags pop by each object: '2 eggs', '1¼ cups milk', '3 tbsp melted butter'
  - 480–780 · step 02 'Whisk the dry': a second bowl slides in; flour lands as a heap and the three spoons tip their mounds in; tags: '1½ cups flour', '2 tsp baking powder', '2 tbsp sugar', '¾ tsp salt'
  - 780–1050 · step 03 'Stir dry into wet': the small bowl tips into the big one in poses; the whisk makes a few turns and leaves a few lumps; a tag 'a few lumps are fine'; a kitchen timer steps in and its dial ticks round: 'rest 15 min'
  - 1050–1380 · step 04 'Medium heat': the pan slides onto the hob ring; the ladle pours three circles that grow in steps; tag '¼ cup each'; bubbles rise and pop across the surfaces; tag 'flip when bubbles form and pop · about 2 min'
  - 1380–1650 · step 05 'Flip once': the three pancakes flip one per beat showing their gold side; tag '1½–2 min more'; then they hop one by one onto the plate and the stack grows
  - 1650–1800 · end: the stack on the plate at the centre, a butter pat lands on top; the card 'Pancakes.' with 'makes about 12'; a small mono footer 'quantities from a standard home recipe'; the boil keeps every object alive
Sizes: Vertical (primary): the step card sits in the top safe area (number left, title beside it), the work area (board, bowls, pan) fills the middle, tags sit beside their objects and never below the 320 px bottom safe margin. Square: the step card moves to the top-left corner and shrinks (title at least 44 px), the board fills the rest with the work shifted right and down, tags keep at least 26 px type, and the four dry-ingredient tags stack in one column beside the bowl instead of around it.
Teaches: Stop motion is a clock, not a style filter: hold every pose the same number of frames, put the easing in the spacing between poses, and let a one-pixel boil keep the held shots alive.

