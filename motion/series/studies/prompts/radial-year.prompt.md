You are building ONE study for the open-source rotli studio: a piece that shows the studio works for ANY product,
style and size, not only Rotli. Work ONLY in ~/rotli-studio/motion (a Node/npm project; use `node`, not bun; `~` is
your home directory, expand it to an absolute path for file tools). In every shell command use absolute paths or
`cd ~/rotli-studio/motion && …` (the shell's cwd resets between commands).

YOUR STUDY: "Radial Year" (study 49), brief at `series/studies/briefs/radial-year.json` (read it first; it is the contract).
Pieces to export from `src/canvas-core/studies/radialYear.ts`: `radialYear` (square), `radialYearVertical` (vertical). Primary size: square.

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
1. Create/modify ONLY `src/canvas-core/studies/radialYear.ts` and its hosts `src/hosts/page-<pieceId>.ts` (one per piece, copy
   `src/hosts/page-motionResume.ts`). Do NOT edit the kit, the pack, tools, pieces.json, series.json, goldens or any other
   piece. If you need a helper, define it in your module. Do not register the pieces; the maintainer does.
2. Never import from `rotli/`, `studio/` or `brand/brand.json`: a study must not look or sound like Rotli. No quokka.
3. Follow the brief's story beats and timing (you may retime inside a beat; every shot must start on the beat grid:
   one beat = 60 / bpm × fps frames; `validate()` in film.ts refuses anything else). Frames: 900 at 30 fps.
4. Design EACH size (the brief's "sizes" note); a vertical re-stacks, it never just crops. Keep text inside `layout().safe`.
5. Quality bar: nothing overlaps unintentionally, no text under 22 px (at 1080 short side), flat colour, depth from
   shadow only where the style allows, every hold keeps moving (a slow push-in, drift or ambient motion).
6. Copy is invented for the fictional product; never claim anything about a real company or person.
7. Sound: beatScore soft at 120 bpm with the drums entering at the Reykjavík sweep (drop at 90): a whoosh ending at 90 as the hand starts, a tick at each month the hand passes (12 per sweep, thinned for the faster Quito sweep), a hit at 330 and 390 for the two extreme callouts, a whoosh ending at 450 for Quito, a hit at 630 for the crossings, and the sign-off at 810.

VERIFY BY LOOKING, and iterate until right:
- `node tools/frames.mjs <pieceId> <8–12 frames across the piece> --out /tmp/radial-year --sheet /tmp/radial-year.png --cols 6`,
  then READ the PNG (and full frames in /tmp/radial-year/ where detail matters). Do this for EVERY size.
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

--- THE STUDY (from series/studies/briefs/radial-year.json) ---
Radial Year · study 49 · video · 900 frames at 30 fps, 120 bpm · palette "daylight"
Style: A radial data visualisation: one year drawn as a circle, 365 spokes whose LENGTH is the hours of daylight, for two cities overlaid, Reykjavík (64° N) and Quito (near the equator), on a dark night ground. THE DIAL: Jan 1 at the top, running clockwise, day d at angle −90° + 360°·d/365. A spoke starts at an inner radius r0 = 0.24·R (the hole keeps short winter days visible) and its length is proportional to hours: r(h) = r0 + (h/24)·(R − r0), with R about 430 px at 1080. Reference rings at 6, 12, 18 and 24 h in the line colour, the 12 h ring dashed, each labelled once along the upward axis in JetBrains Mono ('6 h', '12 h', '18 h', '24 h'); twelve month ticks outside the 24 h ring with three-letter month labels in JetBrains Mono (at least 24 px). Encode by length, never by area or colour intensity. Reykjavík is drawn as spokes in the accent (sun amber), each about 60% of its angular slot wide; Quito as one smooth closed line in the teal accent2, 4 px, with faint teal spokes under it. THE DATA is closed-form and labelled approximate: the sunrise equation cos H0 = (sin(−0.833°) − sin φ·sin δ) / (cos φ·cos δ), clamped to [−1, 1], daylight = 2·H0 / 15 hours, with the declination δ(d) = 23.44°·sin(2π(d − 79)/365) (d = 0 on 1 Jan) and φ = 64.15° for Reykjavík and −0.22° for Quito. Checked against the US Naval Observatory's sunrise and sunset for 2026, it gives Reykjavík 21 h 09 m on 21 Jun (USNO about 21 h 09 m) and 4 h 07 m on 21 Dec (USNO 4 h 07 m), is within about 20 minutes at the equinoxes (its worst case is late September), and gives Quito 12 h 07–08 m all year (USNO 12 h 06–08 m); on screen every value is rounded to whole hours and said with 'about'. THE HAND: a thin ink line from the centre to beyond the 24 h ring with a small dot at its tip, sweeping clockwise on an ease-in-out; each spoke grows to its length on a short spring (10 frames) once the hand passes it, so the year draws itself. At the centre (inside r0) a readout in JetBrains Mono shows the hand's month and the city's hours ('Jan' over 'about 4 h'). CALLOUTS: a leader line from a spoke tip to a label, drawn on, with the label in Inter 600 ink and the key number in the city's colour. Type: the title in Instrument Serif, labels in Inter 600, numbers and axes in JetBrains Mono. Flat, no glows; the only motion in holds is the hand's small idle drift and a slow push-in. A footer on every frame after the dial draws: 'approximate · sunrise to sunset · data: US Naval Observatory'.
Learns from: The polar area diagram as Florence Nightingale used it for seasonal data (https://en.wikipedia.org/wiki/Pie_chart#Polar_area_diagram) and the radial bar chart's known pitfalls (https://www.domo.com/learn/charts/radial-bar-chart: outer bars look longer, curved length is hard to compare), answered here by encoding hours as spoke length from a fixed inner ring with labelled hour rings; the sunrise equation (https://en.wikipedia.org/wiki/Sunrise_equation) for the curve, checked against the US Naval Observatory's published sunrise and sunset (https://aa.usno.navy.mil/data/RS_OneDay). Nightingale's data and diagrams are not used.
Beats (frames · what):
  - 0–90 · title: 'A year of daylight' in Instrument Serif with 'two cities, one year' beneath; the empty dial draws: the 24 h ring, the dashed 12 h ring, the month ticks and labels clockwise from the top
  - 90–330 · Reykjavík: the legend 'Reykjavík · 64° N' lands in amber; the hand sweeps once round the year and the amber spokes grow behind it, short in winter, long in summer; the centre readout counts with the hand ('Jan' 'about 4 h' … 'Jun' 'about 21 h' …)
  - 330–450 · the extremes: callouts draw on: '21 Jun · about 21 h of daylight', then '21 Dec · about 4 h'; a smaller line under the June callout: 'twilight lasts all night'
  - 450–630 · Quito: the legend 'Quito · near the equator' lands in teal; the hand sweeps again, faster, and the teal line draws a near-perfect circle on the 12 h ring; callout 'about 12 h, every day of the year'
  - 630–780 · where they meet: the two shapes cross twice; markers pulse at the crossings with the callout '20 Mar & 23 Sep · about 12 h in both'
  - 780–900 · end: the complete chart holds with a slow push-in; the line 'Far north: big swings.' then 'The equator: steady.' lands beneath the title; the footer stays
Sizes: Square (primary): the dial is centred slightly low, the title and legend in the top band, callouts placed around the dial on leader lines, the footer along the bottom. Vertical re-stacks: the title sits in the top safe area, the dial (about 900 px across) in the upper-middle, and below it everything that sat around the dial becomes stacked rows: the two legends side by side, then the current callout as a text row with a small numbered marker on the dial instead of a long leader line, then the end lines; the footer stays above the 320 px bottom safe margin.
Teaches: A radial chart earns its circle only when the data is a cycle: put time on the angle, encode the value as length from a fixed inner ring, label the rings, and a year of daylight becomes one shape you can read at a glance.

