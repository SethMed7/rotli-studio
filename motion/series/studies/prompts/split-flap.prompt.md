You are building ONE study for the open-source rotli studio: a piece that shows the studio works for ANY product,
style and size, not only Rotli. Work ONLY in ~/rotli-studio/motion (a Node/npm project; use `node`, not bun; `~` is
your home directory, expand it to an absolute path for file tools). In every shell command use absolute paths or
`cd ~/rotli-studio/motion && …` (the shell's cwd resets between commands).

YOUR STUDY: "Split-Flap" (study 29), brief at `series/studies/briefs/split-flap.json` (read it first; it is the contract).
Pieces to export from `src/canvas-core/studies/splitFlap.ts`: `splitFlap` (landscape), `splitFlapVertical` (vertical). Primary size: landscape.

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
1. Create/modify ONLY `src/canvas-core/studies/splitFlap.ts` and its hosts `src/hosts/page-<pieceId>.ts` (one per piece, copy
   `src/hosts/page-motionResume.ts`). Do NOT edit the kit, the pack, tools, pieces.json, series.json, goldens or any other
   piece. If you need a helper, define it in your module. Do not register the pieces; the maintainer does.
2. Never import from `rotli/`, `studio/` or `brand/brand.json`: a study must not look or sound like Rotli. No quokka.
3. Follow the brief's story beats and timing (you may retime inside a beat; every shot must start on the beat grid:
   one beat = 60 / bpm × fps frames; `validate()` in film.ts refuses anything else). Frames: 1440 at 60 fps.
4. Design EACH size (the brief's "sizes" note); a vertical re-stacks, it never just crops. Keep text inside `layout().safe`.
5. Quality bar: nothing overlaps unintentionally, no text under 22 px (at 1080 short side), flat colour, depth from
   shadow only where the style allows, every hold keeps moving (a slow push-in, drift or ambient motion).
6. Copy is invented for the fictional product; never claim anything about a real company or person.
7. Sound: beatScore soft at 120 bpm with no drums until frame 480, then drive (drop at 480); the clatter is ticks: while any cell is flipping, one tick every 3 frames (one per flap period, never one per cell), with a second tick 1 frame later when more than ten cells flip at once, so a big cascade sounds denser, not louder; a hit when the first DELAYED lands (frame 510) and when the last BOOKED lands (frame 1140); a whoosh ending at frame 960; and the sign-off at frame 1260.

VERIFY BY LOOKING, and iterate until right:
- `node tools/frames.mjs <pieceId> <8–12 frames across the piece> --out /tmp/split-flap --sheet /tmp/split-flap.png --cols 6`,
  then READ the PNG (and full frames in /tmp/split-flap/ where detail matters). Do this for EVERY size.
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

--- THE STUDY (from series/studies/briefs/split-flap.json) ---
Split-Flap · study 29 · video · 1440 frames at 60 fps, 120 bpm · palette "solari"
Style: A mechanical departures board, seen straight on, that fills the frame. The housing is the ground (near-black) with a thin muted frame and a printed header strip above the board (Inter 600, ink, not flaps): the small Oriel mark and 'Departures' on the left, column heads 'TIME', 'MEETING', 'ROOM', 'STATUS' in small muted Inter 600 caps above their columns. The board is a grid of flap CELLS (landscape: 6 rows × 31 cells, each about 50×76 px at 1080 on a 54 px pitch, rows 96 px apart): each cell is a surface-coloured rounded rectangle (radius 4) split across the middle by a 2 px line-coloured gap with two tiny hinge pins at its ends; the character is Inter 600, ink, about 54 px, centred, and its top and bottom halves are drawn clipped to the two half-cells. Every cell carries one DRUM, fixed for the whole film: ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:.-' (40 flaps), and a cell ONLY moves forward through it, flap by flap, until it reaches its target; it never jumps. A cell's state at frame F is closed-form: given (start char, target char, start frame, flap period P = 3 frames), steps n = forward distance on the drum, k = clamp(floor((F − start) / P), 0, n), phase = the fraction inside the current flap. Draw one flip in two halves: first half of the period, the upper flap (showing the top half of the OLD character) falls toward the viewer around the hinge, drawn as the top half scaled vertically by cos(θ) from 1 to 0 and darkened by up to 45% as it tips, while the top half of the NEW character is already visible behind it; second half, the falling flap (now showing the bottom half of the NEW character) unfolds downward from the hinge, scaleY 0 to 1, over the old bottom half, and lands with a one-frame 4% overshoot. Because cells start from different characters, a row settles letter by letter at uneven moments; that raggedness is the tell, keep it. Rows cascade: a row's cells start 2 frames apart left to right. Status cells are coloured flaps: the whole flap takes the status colour when the status settles (BOARDING in accent amber with ground-coloured text and a 1 Hz blink on its lamp, DELAYED in accent2 red, BOOKED in s1 green, ON TIME plain). A small flap clock in the header top-right shows the time and flips its minute once. The light is flat, with one soft top-to-bottom gradient on each flap face (5% lighter at the top) and nothing else; no bloom, no reflections. Motion outside the flaps is minimal: a very slow push-in on holds (1.00 to 1.03).
Learns from: The split-flap display (https://en.wikipedia.org/wiki/Split-flap_display) as made famous by Solari di Udine's station and airport boards (https://en.wikipedia.org/wiki/Solari_di_Udine) and Gino Valle's Cifra 3 clock (https://www.cifra3.com/en/): flaps on a drum that flip forward one by one through every intermediate character, rows that settle unevenly, colour status flaps, and the clatter that tells a station something changed. Their typefaces, liveries, layouts and copy are not used.
Beats (frames · what):
  - 0–120 · power on: the board is all blank flaps; the header strip fades up; the clock cells rattle from blank to '09:41'; the first row flips 'DEPARTURES' across its cells and then clears again
  - 120–480 · the day boards: six rows settle one every two beats, each row rattling through the drum and landing letter by letter: '09:30  STANDUP       A1  BOARDING', '10:00  DESIGN CRIT   B4  ON TIME', '11:15  1:1 WITH ANA  A2  ON TIME', '13:00  ROADMAP       C1  ON TIME', '14:30  HIRING SYNC   B2  ON TIME', '16:00  RETRO         A3  ON TIME'; BOARDING turns amber and its lamp blinks
  - 480–720 · the trouble: the clock flips to '09:42'; four statuses re-flip to red 'DELAYED' one per beat down the board (rows 2, 3, 4 and 6); a printed ticker line under the board types 'Four meetings need a new time.'
  - 720–960 · Oriel works: a message row appears under the board and flips 'ORIEL IS FINDING A TIME' with a trailing '...' that cycles; the TIME cells of the delayed rows re-flip, one row per beat, to new times ('10:30', '11:45', '13:30', '16:30'); the ticker changes to 'New times found for everyone.'
  - 960–1200 · all booked: from the top down, every status flips to green 'BOOKED', a row every half beat, the clatter rising as the cascade runs; the message row flips 'ALL MEETINGS BOOKED'; the whole board holds for a beat with only the clock's colon blinking
  - 1200–1440 · end: the rows flip back to blank from the top; the middle two rows flip a big message across the board: 'ORIEL' and 'EVERYONE BOOKED'; under the board, printed in Inter: 'Find a time that works for everyone.' and 'oriel.example' in mono; a slow push-in holds
Sizes: Vertical re-stacks: the board becomes 16 cells wide (cells about 52×80 px on a 56 px pitch, so the board fits the 920 px safe width) and each meeting takes TWO flap rows: the first 'TIME MEETING' ('09:30 STANDUP'), the second 'ROOM STATUS' indented ('A1 BOARDING'), with a thin gap between meetings; the six meetings make a board of twelve rows that fills the middle of the safe area; the header strip sits above it and the ticker and end lines below it, both inside the safe margins; meeting names shorten where needed ('DESIGN CRIT', '1:1 ANA', 'HIRING'). The end message flips across two rows: 'ORIEL' and 'ALL BOOKED'.
Teaches: A mechanism is a timing system: when every change must travel forward through the same drum, the delays themselves (uneven, audible, one letter at a time) become the drama, and a board settling reads as news.

