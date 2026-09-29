You are building ONE study for the open-source rotli studio: a piece that shows the studio works for ANY product,
style and size, not only Rotli. Work ONLY in ~/rotli-studio/motion (a Node/npm project; use `node`, not bun; `~` is
your home directory, expand it to an absolute path for file tools). In every shell command use absolute paths or
`cd ~/rotli-studio/motion && …` (the shell's cwd resets between commands).

YOUR STUDY: "Multiplane" (study 44), brief at `series/studies/briefs/multiplane.json` (read it first; it is the contract).
Pieces to export from `src/canvas-core/studies/multiplane.ts`: `multiplane` (landscape), `multiplaneVertical` (vertical). Primary size: landscape.

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
1. Create/modify ONLY `src/canvas-core/studies/multiplane.ts` and its hosts `src/hosts/page-<pieceId>.ts` (one per piece, copy
   `src/hosts/page-motionResume.ts`). Do NOT edit the kit, the pack, tools, pieces.json, series.json, goldens or any other
   piece. If you need a helper, define it in your module. Do not register the pieces; the maintainer does.
2. Never import from `rotli/`, `studio/` or `brand/brand.json`: a study must not look or sound like Rotli. No quokka.
3. Follow the brief's story beats and timing (you may retime inside a beat; every shot must start on the beat grid:
   one beat = 60 / bpm × fps frames; `validate()` in film.ts refuses anything else). Frames: 720 at 30 fps.
4. Design EACH size (the brief's "sizes" note); a vertical re-stacks, it never just crops. Keep text inside `layout().safe`.
5. Quality bar: nothing overlaps unintentionally, no text under 22 px (at 1080 short side), flat colour, depth from
   shadow only where the style allows, every hold keeps moving (a slow push-in, drift or ambient motion).
6. Copy is invented for the fictional product; never claim anything about a real company or person.
7. Sound: beatScore soft at 100 bpm (no drums): a tick as each flat lands (frames 18, 36, 54, 72, 90 and 108), a whoosh ending at 108 into the walk, soft ticks for firefly blinks thinned to at most one per beat, a whoosh ending at 396 as the mid pines part, a hit at 540 when the window lights, and the sign-off at 648.

VERIFY BY LOOKING, and iterate until right:
- `node tools/frames.mjs <pieceId> <8–12 frames across the piece> --out /tmp/multiplane --sheet /tmp/multiplane.png --cols 6`,
  then READ the PNG (and full frames in /tmp/multiplane/ where detail matters). Do this for EVERY size.
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

--- THE STUDY (from series/studies/briefs/multiplane.json) ---
Multiplane · study 44 · video · 720 frames at 30 fps, 100 bpm · palette "dusk"
Style: A papercut diorama shot like a multiplane camera: seven flat layers of cut paper stand at real depths and a camera trucks in through them at dusk, so parallax is computed, never faked. THE CAMERA (closed-form): layer depths z = sky ∞, far ridge 40, far pines 20, cabin clearing 12, mid pines 9, near trunks 5, ferns 3 (units are arbitrary); the camera's depth zc(F) eases from 0 to 7 across frames 108–612 (a slow-in, slow-out cubic), with a gentle drift in x toward the cabin and a 3 px walking bob on the beat (two steps per beat, a sine). Each layer is drawn about the frame centre at scale s = z / (z − zc) and offset by its x drift times s, so near layers grow fast and slide past the frame edges while far ones barely move; the sky and the moon have infinite depth and never grow (the multiplane tell: the moon stays the same size while the trees rush past). A layer is hidden once z − zc < 0.4. RACK FOCUS: a focal depth zf(F) moves ferns → near trunks → mid pines → cabin on the beats below; each layer's blur is K·|1/(z − zc) − 1/(zf − zc)|, quantised to four levels (sharp, 2, 4 and 8 px); blur never uses ctx.filter: draw the layer into a small offscreen canvas at 1/2, 1/4 or 1/8 scale and draw it back up (a downscale-upscale soften), cached per layer per frame. PAPER: every layer is ONE flat colour silhouette with a slightly deckled edge (seeded jitter of 1–2 px along every cut) and a fine paper-fibre texture (a seeded noise tile generated once per size, multiplied at 6% alpha); atmospheric depth runs from the palette's pale s1 (far ridge) through s2, s3 to s4 and deep (the nearest ferns, nearly black); each layer casts a soft shadow on the layer behind it (the same silhouette in deep at 25% alpha, offset down-right by a few px that grow with the depth gap, softened the same downscale way), which is what makes it read as paper in a box, not a vector drawing. The sky is flat bands of ground and a sky-pink horizon strip, not a smooth gradient, with a paper moon (ink-coloured disc with two faint crater circles). LIGHT: moon shafts are long pale wedges in the sky colour at 8% alpha drawn with the 'screen' composite through the gaps in the pines; fireflies (about 30) live at their own depths between the layers so they parallax too, each on a closed-form Lissajous path, blinking on a per-fly sine (accent core dot with three concentric circles of falling alpha as the glow, no blur). The cabin is a cut-paper shape on the clearing layer with a pitched roof, a chimney and one window; when it lights, the window fills with accent, three glow rings bloom around it and a warm trapezoid of light (accent at 18% alpha) falls across the path; chimney smoke is three paper strips curling on sines. Type is sparse: the title in Instrument Serif and the last line in Instrument Serif Italic, both in ink, centred, no plates.
Learns from: The multiplane camera (https://en.wikipedia.org/wiki/Multiplane_camera) and PetaPixel's account of how it achieved depth (https://petapixel.com/2025/04/04/how-disneys-multiplane-camera-achieved-the-illusion-of-depth/): painted layers on glass at different distances, the far ones moving slower, a truck-in where the background does not grow, focus shifting between planes; with Lotte Reiniger's earlier layered, backlit planes as the ancestor. Their films, characters, paintings and scenes are not used; the forest, cabin and words are original.
Beats (frames · what):
  - 0–108 · the flats drop in: the sky and paper moon are there; one layer per beat lowers in from above on a spring with a tiny overshoot, its shadow landing with it: far ridge, far pines, the clearing with a dark cabin, mid pines, near trunks, ferns; the title 'The Lamp at Hollow End' fades up in the upper third
  - 108–252 · the walk begins: the title lifts away; the camera trucks in with its walking bob; the ferns part to both edges and leave frame; focus racks from the ferns to the near trunks; fireflies rise between the layers
  - 252–396 · through the trees: the near trunks slide past the frame edges; moon shafts fall through the pines; focus racks to the mid pines; the moon and the far ridge hold still while everything near rushes by
  - 396–540 · the clearing: the mid pines part like curtains; the dark cabin sits at the end of the path; focus racks to the cabin; fireflies drift toward it
  - 540–612 · the lamp: the cabin window fills with warm light, glow rings bloom, a warm trapezoid spills across the path, chimney smoke curls
  - 612–720 · arrival: the camera settles and keeps a slow drift; fireflies gather round the window; the last line 'home before dark.' fades up in the upper third
Sizes: Vertical re-stacks: every layer is authored taller than wide (trees reach the top, the ferns rise higher at the bottom), the cabin sits in the lower-middle third, and the camera adds a slight tilt up as it trucks in so the moon stays in the top third; the title and the last line sit in the top safe area, centred, on two lines. Landscape (primary): the cabin sits just right of centre, the moon upper left, the title and last line centred in the upper third.
Teaches: Depth is a speed, not a size: put flat layers at real distances, move the camera through them, and let the far things refuse to grow; paper shadows and a rack focus do the rest.

