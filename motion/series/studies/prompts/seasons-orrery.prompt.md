You are building ONE study for the open-source rotli studio: a piece that shows the studio works for ANY product,
style and size, not only Rotli. Work ONLY in ~/rotli-studio/motion (a Node/npm project; use `node`, not bun; `~` is
your home directory, expand it to an absolute path for file tools). In every shell command use absolute paths or
`cd ~/rotli-studio/motion && …` (the shell's cwd resets between commands).

YOUR STUDY: "Seasons Orrery" (study 41), brief at `series/studies/briefs/seasons-orrery.json` (read it first; it is the contract).
Pieces to export from `src/canvas-core/studies/seasonsOrrery.ts`: `seasonsOrrery` (landscape), `seasonsOrreryVertical` (vertical). Primary size: landscape.

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
1. Create/modify ONLY `src/canvas-core/studies/seasonsOrrery.ts` and its hosts `src/hosts/page-<pieceId>.ts` (one per piece, copy
   `src/hosts/page-motionResume.ts`). Do NOT edit the kit, the pack, tools, pieces.json, series.json, goldens or any other
   piece. If you need a helper, define it in your module. Do not register the pieces; the maintainer does.
2. Never import from `rotli/`, `studio/` or `brand/brand.json`: a study must not look or sound like Rotli. No quokka.
3. Follow the brief's story beats and timing (you may retime inside a beat; every shot must start on the beat grid:
   one beat = 60 / bpm × fps frames; `validate()` in film.ts refuses anything else). Frames: 1020 at 30 fps.
4. Design EACH size (the brief's "sizes" note); a vertical re-stacks, it never just crops. Keep text inside `layout().safe`.
5. Quality bar: nothing overlaps unintentionally, no text under 22 px (at 1080 short side), flat colour, depth from
   shadow only where the style allows, every hold keeps moving (a slow push-in, drift or ambient motion).
6. Copy is invented for the fictional product; never claim anything about a real company or person.
7. Sound: beatScore soft at 120 bpm (a thoughtful pad and pluck, no drums), key +3; a hit on the hook's answer (frame 90); whooshes ending where the arm arrives at a season (frames 255, 630 and 810); soft ticks each time the protractor label, the ghost Earths and the lit-square counter change (thinned so they never buzz); a gentle hit at the end card (frame 930) and the three-note sign-off at frame 960.

VERIFY BY LOOKING, and iterate until right:
- `node tools/frames.mjs <pieceId> <8–12 frames across the piece> --out /tmp/seasons-orrery --sheet /tmp/seasons-orrery.png --cols 6`,
  then READ the PNG (and full frames in /tmp/seasons-orrery/ where detail matters). Do this for EVERY size.
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

--- THE STUDY (from series/studies/briefs/seasons-orrery.json) ---
Seasons Orrery · study 41 · video · 1020 frames at 30 fps, 120 bpm · palette "deep"
Style: A science diagram built as a mechanical tellurion (a seasons orrery) on the deep navy ground, drawn like an instrument plate: hairlines, flat fills, no photographs, no glow. THE MACHINE: a tabletop orbit seen from above at about 25° (the orbit is a flat ellipse, 1300 × 420 px at 1080, drawn as a 1.5 px line-colour ring with small tick marks for the twelve months and the labels 'Mar', 'Jun', 'Sep', 'Dec' in JetBrains Mono muted 24 px). The Sun sits on a central pillar: a flat accent disc (radius 90 px) with three concentric flat rings in accent at falling alpha (0.25, 0.12, 0.06) instead of a blur. A brass-like arm (surface fill, 2 px ink outline, two small ink gear wheels at the hub whose teeth turn with the arm) carries the Earth around the orbit. THE TELL of a tellurion: the Earth's axis is a 3 px ink rod tilted 23.4° and it stays PARALLEL to itself all the way round (it never turns toward the Sun); show it with faint ghost Earths at the four season points whose rods are all parallel. THE EARTH (radius 70 px, larger in close-ups): an accent2 disc with the NIGHT side computed, not painted: the terminator is the great circle facing the Sun, projected orthographically as a half-ellipse, filled in ground colour at 0.75 alpha; latitude lines (equator, the two tropics, the two polar circles) are thin ink ellipses tilted with the axis; one small accent marker sits at 40° N and is labelled 'a place at 40° N' when first shown. Everything the Earth does is a function of one orbital angle a(F) that eases between the beat's positions (never simulated). THE BEAM INSET (a flat card, surface fill, 1 px line border, radius 16 px): a torch-shaped ink beam of FIXED width hits a flat strip of ground (a row of 1 px line-colour squares) at the sun's noon elevation for 40° N; the lit patch on the ground is width / sin(elevation), so a low sun lights more squares with the same beam; the patch is accent at 0.6 alpha and a small counter shows the squares lit. THE DAY DIAL (a 24-hour clock face, 180 px, ink hairline): the day arc in accent2 and the night arc in surface, from the sunrise equation cos H = −tan(40°) · tan(δ), with δ = 23.4° · sin(a − a_March); hour ticks but no hour numbers (the dial is a computed illustration, not a quoted figure, so it makes no numeric claim on screen). Captions: Inter 600 headlines (58 px at 1080) in ink with one key word in Instrument Serif Italic in accent (the 'tilt', 'direct', 'south'), a muted Inter 400 second line (34 px), arriving word by word on springs. Holds keep a slow orbit drift of the arm and a slow 2% camera push; the gears always turn with the arm.
Learns from: The tellurion, the orrery variant made to show day, night and the seasons (History of Science Museum, Oxford, https://www.hsm.ox.ac.uk/orrery; https://en.wikipedia.org/wiki/Orrery), and the standard classroom explanation of the seasons: NASA Space Place (https://spaceplace.nasa.gov/seasons/en/), the U.S. Naval Observatory (https://aa.usno.navy.mil/faq/seasons_orbit) and UCAR's Center for Science Education on sun angle (https://scied.ucar.edu/learning-zone/earth-system/energy-from-sun). Their diagrams, photographs and instrument designs are not copied; the machine here is drawn new in code.
Beats (frames · what):
  - 0–120 · hook: the orrery settles out of the dark (the ring draws on, the Sun's rings pop, the arm swings in); headline 'Is summer when we're *closest* to the Sun?'; the arm sweeps to early January and a small accent tag reads 'closest: early January'; the second line lands: 'No. We're closest in early January.'
  - 120–255 · the tilt: the camera pushes toward the Earth; a protractor arc draws between the axis rod and the upright, labelled '23.4°'; headline 'Earth is *tilted* about 23.4°.'; then the camera pulls back as the arm makes a quick half turn and the four ghost Earths appear with parallel rods: 'And the tilt points the same way all year.'
  - 255–450 · June: the arm eases to June; the north end of the rod leans toward the Sun; the 40° N marker sits in daylight longer and the day dial's day arc grows past half; headline 'June: the north leans *toward* the Sun.' with the second line 'Longer days, more direct light: northern summer.'
  - 450–630 · the beam: the beam inset takes over half the frame; the same fixed-width beam tilts from the June noon angle to the December noon angle and its lit patch stretches across more squares (the counter climbs); headline 'Low sun spreads the *same* light over more ground.' with the second line 'So each patch gets less.'
  - 630–810 · December: the orbit arm carries the Earth half way round (a whoosh); the rod has not turned, so now the south end leans toward the Sun; the day dial shrinks under half for the 40° N marker; headline 'December: the *south* gets its turn.' with the second line 'Short days up north, summer down south.'
  - 810–930 · equinoxes: the arm pauses at March and then at September; a thin accent line from the Sun meets the Earth at the equator; the day dial sits near half and half; headline 'March and September: the Sun is overhead at the equator.'
  - 930–1020 · end card: the arm keeps turning slowly behind; headline 'Seasons come from the *tilt*,' / 'not the distance.'; a small mono line 'the distance changes by only about 3% over a year'; mono footer 'not to scale · sizes and distances exaggerated'; slow push-in holds
Sizes: Vertical re-stacks: the headline and second line sit in the top third of the safe area; the orbit becomes a narrower ellipse (900 × 360 px) in the middle with the Sun centred; the beam inset and the day dial sit side by side in the lower third (they stack if the inset needs more width during the beam beat, where the inset takes the whole lower half); the month labels stay outside the ring. Landscape keeps the orbit on the left two thirds and a right column for the inset and dial, with captions across the top.
Teaches: A mechanical diagram teaches by what it holds still: an orrery whose axis never turns makes the cause of the seasons visible without a word, and a fixed-width beam turns 'direct light' into something you can count.

