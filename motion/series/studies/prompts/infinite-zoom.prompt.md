You are building ONE study for the open-source rotli studio: a piece that shows the studio works for ANY product,
style and size, not only Rotli. Work ONLY in ~/rotli-studio/motion (a Node/npm project; use `node`, not bun; `~` is
your home directory, expand it to an absolute path for file tools). In every shell command use absolute paths or
`cd ~/rotli-studio/motion && …` (the shell's cwd resets between commands).

YOUR STUDY: "Infinite Zoom" (study 43), brief at `series/studies/briefs/infinite-zoom.json` (read it first; it is the contract).
Pieces to export from `src/canvas-core/studies/infiniteZoom.ts`: `infiniteZoomVertical` (vertical), `infiniteZoom` (landscape). Primary size: vertical.

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
1. Create/modify ONLY `src/canvas-core/studies/infiniteZoom.ts` and its hosts `src/hosts/page-<pieceId>.ts` (one per piece, copy
   `src/hosts/page-motionResume.ts`). Do NOT edit the kit, the pack, tools, pieces.json, series.json, goldens or any other
   piece. If you need a helper, define it in your module. Do not register the pieces; the maintainer does.
2. Never import from `rotli/`, `studio/` or `brand/brand.json`: a study must not look or sound like Rotli. No quokka.
3. Follow the brief's story beats and timing (you may retime inside a beat; every shot must start on the beat grid:
   one beat = 60 / bpm × fps frames; `validate()` in film.ts refuses anything else). Frames: 600 at 30 fps.
4. Design EACH size (the brief's "sizes" note); a vertical re-stacks, it never just crops. Keep text inside `layout().safe`.
5. Quality bar: nothing overlaps unintentionally, no text under 22 px (at 1080 short side), flat colour, depth from
   shadow only where the style allows, every hold keeps moving (a slow push-in, drift or ambient motion).
6. Copy is invented for the fictional product; never claim anything about a real company or person.
7. Sound: beatScore soft at 120 bpm with loop: true so the tails wrap and the audio seam matches the picture: a soft whoosh that ends on each hand-off (frames 120, 240, 360, 480 and 600, which wraps to 0), a tick as each caption's key word lands (one per level, a beat after each hand-off), and no sign-off (it is a loop).

VERIFY BY LOOKING, and iterate until right:
- `node tools/frames.mjs <pieceId> <8–12 frames across the piece> --out /tmp/infinite-zoom --sheet /tmp/infinite-zoom.png --cols 6`,
  then READ the PNG (and full frames in /tmp/infinite-zoom/ where detail matters). Do this for EVERY size.
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

--- THE STUDY (from series/studies/briefs/infinite-zoom.json) ---
Infinite Zoom · study 43 · video · 600 frames at 30 fps, 120 bpm · palette "plum"
Style: An endless Droste zoom, a seamless 20 s loop: the camera pushes forever into five nested scenes, each hidden inside a detail of the last, and the fifth contains the first. THE MATH (all closed-form, no state): N = 5 levels, ratio k = 6 per level, L = 120 frames (8 beats) per level, frames = N·L = 600. Loop phase p = (F mod 600) / 120; level i = floor(p) mod 5; f = p − floor(p). Every scene is authored in its own unit square (centre 0,0, side 1) and each scene's PORTAL, the square that holds the next scene, is exactly centred at (0,0) with side 1/6, so the zoom's fixed point is the frame centre at every level. The current level is drawn as a square of side C·6^f centred on the frame, where C = max(W, H) (the square that covers the frame), the next level inside its portal at side C·6^f/6, the one after at C·6^f/36 and so on, each clipped to its portal square, until a level's side falls under 4 px (fade each level in between 4 and 8 px so nothing pops; at 1920 that is four or five levels). The cutoff depends only on on-screen size, so both sides of a hand-off draw exactly the same levels. The scale is exponential in time (6^f), so the push has a constant speed; never ease per level (that makes the zoom pulse). At f = 1 the portal exactly covers the frame and the next level takes over at f = 0 with identical pixels, so the hand-off is invisible, and level 5 is level 0, so the loop closes. Any ambient motion inside a scene (steam, a blinking cursor, a drifting cloud) must have a period that divides 600 frames and be a function of global F, because each scene is on screen at three scales at once. THE FIVE SCENES, flat vector illustration in the plum palette (warm off-white ground, deep plum ink silhouettes, violet accent, orange accent2), key content inside the central 56% of each square (the part both sizes show) with the rest as bleed: (0) CITY at dusk: plum tower silhouettes against the pale sky, a low orange sun disc, rows of tiny muted windows; the central tower fills the middle third and its ONE lit orange square window is the portal. (1) WINDOW: a window frame with a plum mullion cross seen from outside, a warm room behind it (a lamp, a shelf, a hanging plant), a desk seen from above in the centre; the portal is the middle of the desk top. (2) DESK, top-down flat-lay: a notebook, a mug whose steam curls on a 120-frame period, a pen, a plant, the corner of a keyboard; a phone lies at the centre and the portal is the middle of its screen. (3) PHONE: the Oriel app, a week grid of seven columns and hour rows with booked blocks in line and accent2, a header 'Thu 14' in Inter 600; the centre cell glows violet (the free hour) and is the portal. (4) CELL: the violet event chip fills the square, 'Everyone free' in white Inter 600 and a tiny postcard skyline in its middle, which IS scene 0. A small persistent mono tag 'ORIEL · oriel.example' sits in the top-left of the safe area, still. Captions sit on a flat white rounded plate (no shadow) so they read over any scene: Inter 600 ink with one Instrument Serif Italic key word in the accent; each caption fades and rises in over the first beat of its level and fades out over its last beat, crossfading into the next, and the wrap (frame 585 to 600) crossfades into the city caption so frame 600 equals frame 0. The palette's muted role is below 4.5:1 on the ground, so it is used only for the tiny window grid, never for text.
Learns from: The Droste effect as a technique (https://en.wikipedia.org/wiki/Droste_effect), Escher's Print Gallery and Lenstra and de Smit's analysis of its self-similar zoom (https://en.wikipedia.org/wiki/Print_Gallery_(M._C._Escher)), the collaborative infinitely zooming painting Zoomquilt (https://zoomquilt.org/) and the constant-rate scale journey of Powers of Ten (https://en.wikipedia.org/wiki/Powers_of_Ten_(film_series)): exponential zoom at a constant speed, each scene hidden in a detail of the last, the last scene containing the first. Their images, spiral transform, paintings and narration are not used.
Beats (frames · what):
  - 0–120 · the city: the camera already pushing into the dusk skyline toward the one lit window at the centre tower; caption 'Somewhere in the *city*,' (key word italic)
  - 120–240 · the window fills the frame and the room behind it opens; the lamp flickers once; the push continues into the desk; caption 'behind one *window*,'
  - 240–360 · the desk flat-lay: steam curls off the mug, the phone at the centre grows; caption 'on one *desk*,'
  - 360–480 · the phone: the Oriel week fills the frame, booked blocks all around, the centre cell pulses violet as it nears; caption 'Oriel looks at the *week*'
  - 480–600 · the cell: the violet chip 'Everyone free' fills the frame and its tiny skyline grows into the city, the loop closes on frame 0; caption 'and finds the hour for *everyone*.'
Sizes: Vertical (primary): every scene's square is 1920 px (it covers the frame's height) and the 1080-wide centre column is the composed part; the caption plate sits low in the frame, centred, above the bottom safe margin, one or two lines. Landscape: the same squares cover 1920 px of width, the composed centre band is the 1080 px of height; the caption plate moves to the lower left inside the safe area and each caption stays on one line. The scenes themselves are identical in both sizes (the zoom is the design), only the caption and tag positions re-stack.
Teaches: An infinite zoom is arithmetic, not animation: centre every portal, scale by a constant ratio per level so the speed never changes, and make the last scene contain the first, and the push never ends.

