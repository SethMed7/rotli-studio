You are building ONE study for the open-source rotli studio: a piece that shows the studio works for ANY product,
style and size, not only Rotli. Work ONLY in ~/rotli-studio/motion (a Node/npm project; use `node`, not bun; `~` is
your home directory, expand it to an absolute path for file tools). In every shell command use absolute paths or
`cd ~/rotli-studio/motion && …` (the shell's cwd resets between commands).

YOUR STUDY: "Broadcast Package" (study 46), brief at `series/studies/briefs/broadcast-package.json` (read it first; it is the contract).
Pieces to export from `src/canvas-core/studies/broadcastPackage.ts`: `broadcastPackage` (landscape), `broadcastPackageVertical` (vertical). Primary size: landscape.

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
1. Create/modify ONLY `src/canvas-core/studies/broadcastPackage.ts` and its hosts `src/hosts/page-<pieceId>.ts` (one per piece, copy
   `src/hosts/page-motionResume.ts`). Do NOT edit the kit, the pack, tools, pieces.json, series.json, goldens or any other
   piece. If you need a helper, define it in your module. Do not register the pieces; the maintainer does.
2. Never import from `rotli/`, `studio/` or `brand/brand.json`: a study must not look or sound like Rotli. No quokka.
3. Follow the brief's story beats and timing (you may retime inside a beat; every shot must start on the beat grid:
   one beat = 60 / bpm × fps frames; `validate()` in film.ts refuses anything else). Frames: 720 at 30 fps.
4. Design EACH size (the brief's "sizes" note); a vertical re-stacks, it never just crops. Keep text inside `layout().safe`.
5. Quality bar: nothing overlaps unintentionally, no text under 22 px (at 1080 short side), flat colour, depth from
   shadow only where the style allows, every hold keeps moving (a slow push-in, drift or ambient motion).
6. Copy is invented for the fictional product; never claim anything about a real company or person.
7. Sound: beatScore drive at 120 bpm with the drums entering after the open (drop at 60): whooshes ending at 30 and 570 for the stinger sweeps, a hit at 60 when the live picture lands, a tick for each layer as the bug and the lower third build, soft ticks for the ball's bounces (on the rally's closed-form bounce frames, thinned so they never buzz), hits at 330 for match point and 570 for the winning point, and the sign-off at 660.

VERIFY BY LOOKING, and iterate until right:
- `node tools/frames.mjs <pieceId> <8–12 frames across the piece> --out /tmp/broadcast-package --sheet /tmp/broadcast-package.png --cols 6`,
  then READ the PNG (and full frames in /tmp/broadcast-package/ where detail matters). Do this for EVERY size.
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

--- THE STUDY (from series/studies/briefs/broadcast-package.json) ---
Broadcast Package · study 46 · video · 720 frames at 30 fps, 120 bpm · palette "broadcast"
Style: A TV sports graphics package for an invented office ping-pong final, played dead straight. ONE HOUSE DIRECTION: every element enters from the left and builds in layers (base plate, then colour, then text, then detail), each layer 3–4 frames after the one below, on fast ease-out curves (an expo out, no bounce) and leaves by a quick reverse wipe to the left; nothing flies in from another side. ONE HOUSE ANGLE: every plate, bar and wipe is a parallelogram skewed 12°. Type: names and labels in Inter 800 uppercase with slight tracking, secondary lines in Inter 600 uppercase, every number (scores, clock, stats) in JetBrains Mono so digits never jitter. Colours: the navy ground, deep for plates, white ink, player one (LUND) in the accent red-orange, player two (MARSH) in the cyan accent2, gold for 'MATCH POINT' and the win, the table in the table blue with white lines. THE TABLE (the live picture): a flat top-down ping-pong table with a white centre line and net, two round paddles (one per player colour) at the ends; the ball is a white dot on a closed-form rally (x as a triangle wave between the ends, height a parabola per crossing, drawn as a shadow ellipse whose offset and softness follow the height), the paddles slide to meet each return; a slow push-in. STINGER: five skewed bars (accent, accent2, gold, white, deep) sweep across the frame left to right on staggered expo curves, fully covering it for 2 frames at the midpoint, when the picture underneath cuts, then clear off to the right revealing the new picture, with the event mark (a ring around a paddle and 'T2') snapping in the middle for a beat. SCORE BUG (top-left, persistent after it builds): a deep base plate; two rows, each a colour chip, a surname and a score box; a strip below with the game and a running match clock ('G5' and a mm:ss that counts real frames); when a score changes the old digit slides up out of its box and the new one slides in from below with a one-beat flash of the chip colour. LOWER THIRD: an accent bar wipes in, a white name plate slides out from behind it through a mask, the surname lands, then the first name, then a deep strip with the second line, then a small stat tag at the right end; it holds four seconds unchanged (a lower third must not change mid-hold). STATS BOARD: a full-frame deep panel with the two names as headers and rows of diverging bars growing out from a centre spine on staggered springs while the mono numbers count up. TICKER: a bottom band with a fixed accent label block and text crawling at a constant speed (x = x0 − v·F, wrapped), items separated by small drawn diamonds. Nothing is glossy: flat fills only, no gradients, no glows, no shadows except the ball's.
Learns from: Sports broadcast graphics as a genre: the persistent score bug (https://en.wikipedia.org/wiki/Score_bug), the lower third (https://en.wikipedia.org/wiki/Lower_third) and LIGR's rules for it (https://www.ligrsystems.com/blog/lower-thirds-explained: one direction for the whole package, a hold long enough to read twice, content that never changes mid-hold), and the news ticker (https://en.wikipedia.org/wiki/News_ticker). No network's package, logo, typeface, colours or layout is used; the event, players and headlines are invented.
Beats (frames · what):
  - 0–60 · the open: the stinger's five bars sweep across; the event mark 'T2' snaps in; the title plate builds from the left: 'TABLE TWO OPEN' over 'THE FINAL'
  - 60–180 · live: the stinger clears to the table; a rally runs; the score bug builds in layers top-left: 'LUND' 9 over 'MARSH' 9, the strip 'G5' with the clock counting
  - 180–300 · the lower third builds and holds: 'LUND' then 'PIA', the strip 'ACCOUNTS · 3RD YEAR ON TABLE TWO', the tag 'SERVE WIN 71%'; the ticker band slides in at the bottom and starts to crawl: 'COFFEE MACHINE ON 3 IS FIXED', 'FOOSBALL SEMIS FRIDAY AT 4', 'LOST: ONE ORANGE BALL', 'TABLE ONE CLOSED FOR RE-TAPING'
  - 300–420 · match point: the lower third wipes out; a long rally; LUND's score rolls 9 → 10 with a flash; a gold tab 'MATCH POINT' slides out beneath the bug
  - 420–540 · the stats board fills the frame (the bug and ticker stay): headers 'LUND' and 'MARSH', rows with diverging bars and counting numbers: 'ACES 4 · 2', 'LONGEST RALLY 23 · 23', 'EDGE BALLS 1 · 5', 'SNACKS ON THE BENCH 3 · 0'
  - 540–630 · the winner: back to the table for one fast point; the score rolls 10 → 11; the stinger sweeps; a gold plate builds: 'LUND WINS' over '11–9 · GAME 5'
  - 630–720 · the bumper: the event mark centred with 'TABLE TWO OPEN' and 'CHAMPION · PIA LUND', the ticker still crawling beneath; the plate holds with a slow push-in until the frame's end
Sizes: Vertical re-stacks: the table is rotated so the players are at the top and bottom of the frame; the score bug sits top-left just below the 220 px top safe margin; the lower third sits above the ticker, both above the 320 px bottom safe margin; the stats rows keep their diverging bars but the names become stacked headers; the title and win plates break onto two lines; the stinger bars are taller but still sweep left to right (the house direction does not change with the shape).
Teaches: A broadcast package is a grammar, not a set of pictures: one entry direction, one angle, layers that build in the same order every time, and numbers that never jitter make every graphic read as part of one show.

