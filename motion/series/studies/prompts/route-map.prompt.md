You are building ONE study for the open-source rotli studio: a piece that shows the studio works for ANY product,
style and size, not only Rotli. Work ONLY in ~/rotli-studio/motion (a Node/npm project; use `node`, not bun; `~` is
your home directory, expand it to an absolute path for file tools). In every shell command use absolute paths or
`cd ~/rotli-studio/motion && …` (the shell's cwd resets between commands).

YOUR STUDY: "Route Map" (study 39), brief at `series/studies/briefs/route-map.json` (read it first; it is the contract).
Pieces to export from `src/canvas-core/studies/routeMap.ts`: `routeMap` (landscape), `routeMapVertical` (vertical). Primary size: landscape.

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
1. Create/modify ONLY `src/canvas-core/studies/routeMap.ts` and its hosts `src/hosts/page-<pieceId>.ts` (one per piece, copy
   `src/hosts/page-motionResume.ts`). Do NOT edit the kit, the pack, tools, pieces.json, series.json, goldens or any other
   piece. If you need a helper, define it in your module. Do not register the pieces; the maintainer does.
2. Never import from `rotli/`, `studio/` or `brand/brand.json`: a study must not look or sound like Rotli. No quokka.
3. Follow the brief's story beats and timing (you may retime inside a beat; every shot must start on the beat grid:
   one beat = 60 / bpm × fps frames; `validate()` in film.ts refuses anything else). Frames: 1080 at 30 fps.
4. Design EACH size (the brief's "sizes" note); a vertical re-stacks, it never just crops. Keep text inside `layout().safe`.
5. Quality bar: nothing overlaps unintentionally, no text under 22 px (at 1080 short side), flat colour, depth from
   shadow only where the style allows, every hold keeps moving (a slow push-in, drift or ambient motion).
6. Copy is invented for the fictional product; never claim anything about a real company or person.
7. Sound: beatScore drive at 120 bpm with the drums entering as the tern leaves Greenland (drop at frame 120); a soft tick for each pin drop and each date-chip change; ticks from the counter every 5,000 km (thinned); a whoosh ending on each big camera move (frames 120, 420, 600 and 810); a hit at the fork (frame 330) and on the landing total (frame 840); the three-note sign-off at frame 960.

VERIFY BY LOOKING, and iterate until right:
- `node tools/frames.mjs <pieceId> <8–12 frames across the piece> --out /tmp/route-map --sheet /tmp/route-map.png --cols 6`,
  then READ the PNG (and full frames in /tmp/route-map/ where detail matters). Do this for EVERY size.
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

--- THE STUDY (from series/studies/briefs/route-map.json) ---
Route Map · study 39 · video · 1080 frames at 30 fps, 120 bpm · palette "atlas"
Style: An animated travel map in the adventure-film manner: a dotted route that draws itself across a stylised map while a camera follows the traveller, pins drop, and a distance counter ticks. THE MAP is the Atlantic from about 80° N to 75° S and 85° W to 45° E in an equirectangular projection (x = longitude, y = latitude, one function in the module), on a paper-coloured sea (ground) with land in surface colour and a 2 px ink coastline. Coastlines are HAND-AUTHORED low-poly outlines (25–60 lon/lat points each for Greenland, Iceland, North America, South America, Europe, Africa and Antarctica, rounded with quadratic curves), stylised, never traced from a copyrighted map. A 1 px line-colour graticule every 15°, the equator and the two polar circles dashed and labelled in JetBrains Mono muted 24 px ('Equator', 'Arctic Circle', 'Antarctic Circle'), each label on a small ground-colour pill so it stays readable where it crosses land (muted on land is only 3.8:1); sea names in Instrument Serif Italic muted ('North Atlantic', 'Southern Ocean', 'Weddell Sea'); a small compass rose in ink; a static paper grain of seeded speckles (alpha 0.05) drawn once. THE ROUTE: an ordered list of lon/lat waypoints resampled by arc length; the part already flown is a dotted accent line (5 px round dots every 14 px at 1080), the last 60 px a solid accent stroke; the head is the TRAVELLER, a small tern silhouette drawn in code (narrow swept wings, a deeply forked tail, a pointed bill; 46 px wingspan) heading along the route's tangent with wings flapping by a closed-form sine. At the fork both branches draw at once (the African and Brazilian routes). PINS drop from above on a spring with a short squash on landing and a soft ink ellipse shadow: an accent teardrop with a surface dot, and a label card (surface fill, 1.5 px ink border, radius 10 px) with Inter 600 34 px text and a muted Inter 400 26 px line. THE CAMERA is a pure function of the frame: its centre follows the traveller's position a few frames behind (evaluate the route at t − lag, so it trails smoothly without simulation) and its zoom eases between 1.0 (whole map) and about 2.2 (following); every move uses an ease-in-out. THE COUNTER sits top-right in a surface card: 'km' in muted mono and the number in JetBrains Mono 52 px, ticking with the route's arc length and scaled so it lands on exactly 70,900 when the loop closes; under it a date chip ('Aug', 'Sep', 'Nov', 'Apr', 'May') changing as the traveller passes each stage. Headlines are Inter 600 56 px ink, top-left inside the safe area on a surface panel at 0.9 alpha so they read over the map. Everything flat: no satellite imagery, no blur, no glow.
Learns from: The animated route-map sequence from classic adventure cinema and its motion-design tutorials: PremiumBeat's map-path breakdown (https://www.premiumbeat.com/blog/create-animated-map-after-effects/) and CreativePro's 'Making an Animated Route Map' (https://creativepro.com/making-an-animated-route-map/): a line that grows along a masked path, pins that drop at stops, a camera that follows. The route and every figure come from Egevang et al., 'Tracking of Arctic terns Sterna paradisaea reveals longest animal migration', PNAS 2010 (https://www.pnas.org/doi/10.1073/pnas.0909493107). No film footage, map artwork, font or music from any of them is used.
Beats (frames · what):
  - 0–120 · hook: the whole map settles (coastlines draw on, the graticule fades up); the tern flies in from the edge to northeast Greenland and a pin drops: 'Greenland' / 'nests here in the Arctic summer'; headline 'A bird under 125 g' then 'flies pole to pole and back.'
  - 120–240 · the stopover: date chip 'Aug'; the camera zooms to follow as the route draws southwest over the ocean; a pin drops in the open North Atlantic: 'Stopover' / 'about 25 days of feeding at sea'; the counter starts ticking
  - 240–420 · the fork: date chip 'Sep'; the route runs southeast toward West Africa and, south of the Cape Verde islands, splits into two dotted branches that draw at the same time, one hugging Africa, one crossing to Brazil; headline 'Then the tracked birds split:' with the line '7 followed Africa, 4 crossed to Brazil.'
  - 420–600 · the far south: the branches rejoin in the Southern Ocean; date chip 'Nov'; a pin drops near the Weddell Sea: 'Winter by Antarctica' / 'about 5 months'; headline 'It swaps one summer for another.' with the line 'Arctic in June, Antarctic from December to March.'
  - 600–810 · the way home: date chip 'Apr'; the camera follows a long S-shaped route north up the middle of the Atlantic, crossing from east to west near the equator; thin muted arrows sweep across the sea for the prevailing winds; headline 'Home in an S-curve, riding the winds,' then 'in about 40 days.'; date chip 'May'
  - 810–960 · the total: the tern lands back in Greenland; the camera pulls out to the whole map with the full route drawn; the counter lands on '70,900' and a pill pops: 'on average, in one year'; the line 'Some flew more than 80,000 km.'
  - 960–1080 · end card: the route pulses once along its length; headline 'Over a 30-year life:' / 'maybe 2.4 million km.' then the line 'About three trips to the Moon and back.'; mono footer 'routes simplified · 11 tracked birds, 2007–08 · Egevang et al., PNAS 2010'; slow push-in holds
Sizes: Vertical is the natural shape for a pole-to-pole route: the map is cropped to about 70° W to 20° E so the Atlantic fills the tall frame, the whole route fits at zoom 1.0, and the following camera zooms less (about 1.6) and moves mostly vertically; headlines sit in a panel across the top safe area and the counter in a card across the bottom safe area; pin labels flip to the side with more room. Landscape keeps the wider map, the headline top-left and the counter top-right.
Teaches: A map route turns numbers into a journey: a line that draws at the traveller's pace, a camera that follows and a counter that ticks with the line make a distance felt before it is read.

