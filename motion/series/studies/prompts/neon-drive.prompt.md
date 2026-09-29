You are building ONE study for the open-source rotli studio: a piece that shows the studio works for ANY product,
style and size, not only Rotli. Work ONLY in ~/rotli-studio/motion (a Node/npm project; use `node`, not bun; `~` is
your home directory, expand it to an absolute path for file tools). In every shell command use absolute paths or
`cd ~/rotli-studio/motion && …` (the shell's cwd resets between commands).

YOUR STUDY: "Neon Drive" (study 31), brief at `series/studies/briefs/neon-drive.json` (read it first; it is the contract).
Pieces to export from `src/canvas-core/studies/neonDrive.ts`: `neonDrive` (landscape), `neonDriveSquare` (square). Primary size: landscape.

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
1. Create/modify ONLY `src/canvas-core/studies/neonDrive.ts` and its hosts `src/hosts/page-<pieceId>.ts` (one per piece, copy
   `src/hosts/page-motionResume.ts`). Do NOT edit the kit, the pack, tools, pieces.json, series.json, goldens or any other
   piece. If you need a helper, define it in your module. Do not register the pieces; the maintainer does.
2. Never import from `rotli/`, `studio/` or `brand/brand.json`: a study must not look or sound like Rotli. No quokka.
3. Follow the brief's story beats and timing (you may retime inside a beat; every shot must start on the beat grid:
   one beat = 60 / bpm × fps frames; `validate()` in film.ts refuses anything else). Frames: 1440 at 60 fps.
4. Design EACH size (the brief's "sizes" note); a vertical re-stacks, it never just crops. Keep text inside `layout().safe`.
5. Quality bar: nothing overlaps unintentionally, no text under 22 px (at 1080 short side), flat colour, depth from
   shadow only where the style allows, every hold keeps moving (a slow push-in, drift or ambient motion).
6. Copy is invented for the fictional product; never claim anything about a real company or person.
7. Sound: beatScore drive at 100 bpm, drums entering with the title (drop at 432); ticks for each neon letter as it strikes (two ticks 2 frames apart, for the buzz of a tube catching) and for each tracklist line; a hit on the 'LANE' slam (frame 576); a whoosh ending at 720 as the drive speeds up; a tick on every 'PRESS PLAY' blink; the sign-off at frame 1296.

VERIFY BY LOOKING, and iterate until right:
- `node tools/frames.mjs <pieceId> <8–12 frames across the piece> --out /tmp/neon-drive --sheet /tmp/neon-drive.png --cols 6`,
  then READ the PNG (and full frames in /tmp/neon-drive/ where detail matters). Do this for EVERY size.
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

--- THE STUDY (from series/studies/briefs/neon-drive.json) ---
Neon Drive · study 31 · video · 1440 frames at 60 fps, 100 bpm · palette "neon"
Style: The opening card of an invented night-drive mixtape, 'Lumen Lane', in the synthwave (outrun) manner. The world: a sky that runs from ground (deep violet-black) at the top to s3 (violet) and then accent (hot pink) at the horizon, with a few seeded stars that twinkle; a STRIPED SUN, a disc filled with a vertical gradient from s1 (yellow) at the top to s2 (orange) and accent (pink) at the bottom, cut by horizontal gaps that get taller toward the bottom and drift slowly downward (the gaps are ground-coloured rectangles clipped to the disc, their y a closed-form function of the frame); low wireframe MOUNTAINS in front of the sun (flat surface-coloured polygons with accent2 edge lines); and a PERSPECTIVE GRID FLOOR below the horizon: horizontal lines at depths z_k = k + phase with screen y = horizon + focal / z (phase = frame × speed mod 1, so the grid scrolls forever and seamlessly), and vertical lines converging to the vanishing point, all in accent (pink) on a floor that fades from surface to ground. NEON is always drawn as layered strokes, never a blur filter: a wide stroke (14 px) at 12% alpha, a middle stroke (7 px) at 35%, and a thin core (2.5 px) in ink or a near-white tint of the tube colour at full alpha, all with round caps and joins, composited with 'lighter'. The neon TUBE LETTERING is Inter 800 drawn with strokeText only (no fill) through those three layers, in accent2 (cyan), with tiny dark gaps where a real tube would bend back (two short ground-coloured breaks per word); it ignites letter by letter with an IRREGULAR flicker: each letter's on/off pattern comes from a seeded hash of floor(F / 2), with uneven gaps (for example on, off, off, on, off, on-for-good), never metronomic, and after ignition one letter keeps a rare dropout. The CHROME word is Inter 800 filled with a hard-banded vertical gradient built from the palette: accent2 mixed 60% toward ink (pale cyan) at the top, ink just above the midline, a deep band exactly at the midline (the horizon reflection), then s2 (orange) to s1 (yellow) at the bottom, with a 2 px ink outline and a thin pink outer stroke; a white four-point star glint slides across it once. PALMS are silhouettes in deep: a segmented curved trunk and 6–8 drooping fronds, each frond a tapered polygon with notches; they pass on both sides during the drive with true parallax (x = vanishing x ± offset / z). Small type is JetBrains Mono in muted or ink. Everything else stays still or glides; the only fast things are the grid, the palms and the flicker. A thin scanline overlay (every 3rd row, 6% black) sits over everything.
Learns from: The synthwave / outrun aesthetic (https://en.wikipedia.org/wiki/Synthwave) and its namesake, Sega's 1986 driving game Out Run (https://en.wikipedia.org/wiki/Out_Run): a perspective grid rushing to a striped sunset, magenta and cyan neon, chrome lettering, palm silhouettes and scanlines. Their artwork, logos, music, colours and copy are not used; the tape, its title and its track names are invented.
Beats (frames · what):
  - 0–144 · ignition: black; a single cyan neon line draws out from the centre along the horizon with a stutter; stars fade in; the sky's gradient rises from below the horizon
  - 144–432 · the world rolls in: the striped sun rises from behind the horizon and its gaps start drifting down; the grid floor fades in and starts rushing toward the camera; the wireframe mountains slide up in front of the sun; a tiny mono line top-left: 'SIDE A · 00:00'
  - 432–720 · the title: 'LUMEN' ignites in cyan neon tube letters, one letter every half beat with an irregular flicker, then holds with a hum; on the downbeat at 576 'LANE' slams in underneath in chrome with a short scale-down from 1.15 and the star glint sweeps across it; a small mono line under both: 'a night-drive mixtape'
  - 720–1008 · the drive: the camera drops lower and the grid speeds up; palm silhouettes pass on both sides in parallax; the title shrinks to the upper left; a tracklist flickers on at the right, one line per two beats, in pink neon mono: 'A1  Tail Lights', 'A2  Overpass', 'A3  Coastline, 3 AM', 'A4  Last Exit'
  - 1008–1296 · the lockup: the tracklist switches off line by line; the title returns to the centre; a neon cassette draws itself below it (a rounded rectangle, a label window, two reels whose spokes turn), with an outlined 'SIDE A' pill beside it
  - 1296–1440 · end: the sun sinks behind the horizon, its last stripe flaring; the grid keeps scrolling; 'PRESS PLAY' blinks in neon on every beat under the cassette; the neon hum holds to the last frame
Sizes: Square re-stacks: the horizon sits a little below the middle so the grid floor takes the lower 45%; the sun is larger relative to the frame; 'LUMEN' and 'LANE' stack at a size that spans about 80% of the width; in the drive the tracklist moves under the title in the lower half, over the grid on a dark translucent band, and the palms pass closer to the edges; the cassette and 'SIDE A' pill stack centred.
Teaches: An era is a set of rules you can code: a perspective grid, a striped sun, layered-stroke neon that ignites irregularly and a banded chrome fill are enough to summon the whole aesthetic, and the irregular flicker is what makes it feel electric rather than animated.

