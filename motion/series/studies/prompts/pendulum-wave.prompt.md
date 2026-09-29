You are building ONE study for the open-source rotli studio: a piece that shows the studio works for ANY product,
style and size, not only Rotli. Work ONLY in ~/rotli-studio/motion (a Node/npm project; use `node`, not bun; `~` is
your home directory, expand it to an absolute path for file tools). In every shell command use absolute paths or
`cd ~/rotli-studio/motion && …` (the shell's cwd resets between commands).

YOUR STUDY: "Pendulum Wave" (study 42), brief at `series/studies/briefs/pendulum-wave.json` (read it first; it is the contract).
Pieces to export from `src/canvas-core/studies/pendulumWave.ts`: `pendulumWaveSquare` (square), `pendulumWave` (landscape). Primary size: square.

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
1. Create/modify ONLY `src/canvas-core/studies/pendulumWave.ts` and its hosts `src/hosts/page-<pieceId>.ts` (one per piece, copy
   `src/hosts/page-motionResume.ts`). Do NOT edit the kit, the pack, tools, pieces.json, series.json, goldens or any other
   piece. If you need a helper, define it in your module. Do not register the pieces; the maintainer does.
2. Never import from `rotli/`, `studio/` or `brand/brand.json`: a study must not look or sound like Rotli. No quokka.
3. Follow the brief's story beats and timing (you may retime inside a beat; every shot must start on the beat grid:
   one beat = 60 / bpm × fps frames; `validate()` in film.ts refuses anything else). Frames: 1920 at 60 fps.
4. Design EACH size (the brief's "sizes" note); a vertical re-stacks, it never just crops. Keep text inside `layout().safe`.
5. Quality bar: nothing overlaps unintentionally, no text under 22 px (at 1080 short side), flat colour, depth from
   shadow only where the style allows, every hold keeps moving (a slow push-in, drift or ambient motion).
6. Copy is invented for the fictional product; never claim anything about a real company or person.
7. Sound: beatScore soft at 120 bpm with loop:true and NO sign-off (a sign-off stops the loop and breaks the seam); 1920 frames is 64 beats, exactly four turns of the 16-beat chord cycle, so the music loops as cleanly as the picture: do not retime it. A whoosh that ends on frame 0 (its tail wraps to the end of the file) lands the realignment; ticks on the pattern frames 480, 640, 960, 1280 and 1440. On top, a module-local layer makes the phasing audible: each pendulum plays a very quiet pluck from a pentatonic scale (longest lowest) at each right-hand turning point, at the exact sample t = G · m / N_k, wrapped so the loop is seamless: a single chord when they align, a shimmer between.

VERIFY BY LOOKING, and iterate until right:
- `node tools/frames.mjs <pieceId> <8–12 frames across the piece> --out /tmp/pendulum-wave --sheet /tmp/pendulum-wave.png --cols 6`,
  then READ the PNG (and full frames in /tmp/pendulum-wave/ where detail matters). Do this for EVERY size.
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

--- THE STUDY (from series/studies/briefs/pendulum-wave.json) ---
Pendulum Wave · study 42 · video · 1920 frames at 60 fps, 120 bpm · palette "graphite"
Style: A calm physics-lab demonstration on the graphite ground, drawn as a clean instrument, not a cartoon. FIFTEEN uncoupled pendulums hang from one horizontal bar; the whole piece is ONE closed-form system and the seamless loop is the lesson. Let the cycle be G = 32 s (the whole piece, 1920 frames). Pendulum k (k = 0 … 14, longest first) makes N_k = 24 + k full swings per cycle, so its angle is theta_k(t) = A · cos(2π · N_k · t / G) with A = 12° (inside the small-angle range where the simple formula holds) and t = F / 60. Every theta is therefore identical at F = 0 and F = 1920: the loop is exact, with no easing or cross-fade. Lengths follow from the period, L_k = g · (G / (2π · N_k))² with g = 9.81 m/s²: 44.2 cm for the longest down to 17.6 cm for the shortest (pendulum 8 has a period of exactly 1.000 s); draw them to true relative scale. Because 24 is divisible by 2, 3, 4 and 6, at t = G/q the phase of pendulum k is exactly 2πk/q, so the row splits into q interleaved groups (every q-th pendulum swings in step with the others of its group) and the trace repeats every q dots; note that at that instant two groups can share a position while moving in opposite directions, so show the groups a few frames either side of the exact frame too: four groups at 8 s (frame 480), three at 10.67 s (frame 640), two opposite rows at 16 s (frame 960), three again at 21.33 s (frame 1280), four at 24 s (frame 1440), all aligned at 0 and 32 s. MAIN VIEW: an oblique three-quarter view looking along the bar from one end and slightly below, as the demonstration is usually filmed: the bar is a 6 px surface-coloured rail with a 1 px ink highlight, receding in simple perspective (a one-point projection written in the module; nearer pendulums larger), each pendulum a 1.5 px ink string (muted alpha 0.7) and a bob (a sphere: radial gradient from ink at the upper left to surface at the rim, 30 px at 1080 for the nearest, scaled by depth). Each bob swings across the screen (perpendicular to the bar), displacement L_k · sin(theta_k). The longest pendulum's bob is the accent colour so the eye can follow one; the rest are ink. A faint floor plane (line colour, 1 px grid, alpha 0.35) sits under the bobs and each bob casts a small soft ellipse shadow (black, alpha 0.35) whose x follows the bob: the only shadow in the piece. SECOND VIEW, the trace: a flat 'from above' strip where the 15 bobs are 14 px dots evenly spaced left to right and their displacement is drawn vertically, joined by a 3 px accent2 polyline, so the travelling waves, the zig-zag at half time and the clean groups read as shapes; behind it a 1 px line-colour centre axis and faint tick marks. A thin progress ring (1 px line colour, with a 3 px accent2 arc that sweeps from 0 to 360° over the cycle and a small dot at the tip) sits beside the trace with the elapsed time in JetBrains Mono ('t = 16.0 s', counting real time, wrapping to 0.0 at the loop). Pattern moments are called out by a small outlined pill in JetBrains Mono that pops on a spring exactly on the frame ('¼ · four groups', '⅓ · three groups', '½ · two rows', '⅔ · three groups', '¾ · four groups') and fades after two beats. Captions: Inter 600 headline (60 px at 1080) in ink, left-aligned, with a single muted Inter 400 line under it (34 px); they arrive word by word on springs and leave by fading up 12 px. A small formula card (surface fill, 1 px line border, radius 14 px) shows 'T = 2π√(L/g)' in JetBrains Mono (40 px) with the line 'four times the length, twice the time'. Everything is flat and quiet: no glow, no blur. The camera makes a very slow sinusoidal drift of ±1.5° in yaw with period G, so it too returns to the same place at the loop. Nothing is simulated: every caption, pill and ring value is a function of F on the same cycle.
Learns from: The pendulum-wave demonstration: Harvard's Natural Sciences Lecture Demonstrations page (https://sciencedemonstrations.fas.harvard.edu/presentations/pendulum-waves) and the Wikipedia article (https://en.wikipedia.org/wiki/Pendulum_wave), which describe fifteen uncoupled pendulums whose lengths are tuned so each completes one more oscillation than the last in a fixed time and all realign at the end of the cycle; and the simple-pendulum period T = 2π√(L/g) as taught in OpenStax University Physics (https://openstax.org/books/university-physics-volume-1/pages/15-4-pendulums). Their apparatus, footage, photos and 60-second tuning are not used; the 32-second tuning here is the module's own.
Beats (frames · what):
  - 0–240 · in step (this is also the state the loop returns to): all fifteen pendulums swing together so they read as one; the trace is a flat line swinging up and down as a whole; the headline 'Fifteen pendulums.' with the muted line 'Each one swings on its own.' is already on screen at frame 0 and fades up and out by frame 210; the progress ring is at its start
  - 240–450 · the rule: they begin to drift apart and a gentle travelling wave (a snake) runs along the row; the formula card slides in from the side on a spring: 'T = 2π√(L/g)' and 'four times the length, twice the time'; the headline 'Shorter string, faster swing.'
  - 450–600 · the tuning: the trace becomes a tighter wave and at frame 480 falls into four clean groups; the pill '¼ · four groups' pops exactly at 480; the headline 'Tuned to fit one more swing' with the muted line 'The longest: 24 swings in 32 s. The shortest: 38.'
  - 600–870 · at frame 640 the row splits into three groups ('⅓ · three groups' pops on that frame); then the motion looks tangled; the headline 'It only looks random.' with the muted line 'Every swing is set by a length.'
  - 870–1050 · half time: at frame 960 the pendulums form two perfectly opposite rows, the trace a sharp zig-zag; the pill '½ · two rows' pops; no headline, only a slow push of 4% on the main view so the zig-zag is the picture
  - 1050–1410 · the way back: three groups again at frame 1280 ('⅔ · three groups'); the headline 'Same lengths, same dance.' with the muted line 'Small swings, no friction: an ideal model.'; the formula card returns briefly beside the trace
  - 1410–1680 · four groups at frame 1440 ('¾ · four groups'); the waves lengthen as the phases close up; the headline 'Every one finishes whole swings…'
  - 1680–1920 · realign: '…so at 32 s they line up again.' holds until frame 1830 and fades; the trace flattens into one line; the progress ring completes; from frame 1860 the opening headline 'Fifteen pendulums.' / 'Each one swings on its own.' fades back in so that frame 1920 is exactly frame 0
Sizes: Square (primary): captions sit in the top quarter of the safe area; the oblique main view fills the middle; the trace strip runs full width under it with the progress ring and timecode at its right end; the formula card overlaps nothing (it takes the caption's place when shown). Landscape re-stacks into two columns: the main view takes the left 60% at full height, and the right column stacks the caption, the formula card, the trace strip (narrower, dots closer) and the progress ring. Pills sit above the trace in both.
Teaches: A loop can be exact rather than faked: when every moving part is a closed-form function whose periods all divide the length of the piece, the last frame is the first frame and no cross-fade is needed.

