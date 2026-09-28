You are building ONE study for the open-source rotli studio: a piece that shows the studio works for ANY product,
style and size, not only Rotli. Work ONLY in ~/rotli-studio/motion (a Node/npm project; use `node`, not bun; `~` is
your home directory, expand it to an absolute path for file tools). In every shell command use absolute paths or
`cd ~/rotli-studio/motion && …` (the shell's cwd resets between commands).

YOUR STUDY: "Orb Guide" (study 26), brief at `series/studies/briefs/orb-guide.json` (read it first; it is the contract).
Pieces to export from `src/canvas-core/studies/orbGuide.ts`: `orbGuide` (landscape), `orbGuideVertical` (vertical). Primary size: landscape.

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
1. Create/modify ONLY `src/canvas-core/studies/orbGuide.ts` and its hosts `src/hosts/page-<pieceId>.ts` (one per piece, copy
   `src/hosts/page-motionResume.ts`). Do NOT edit the kit, the pack, tools, pieces.json, series.json, goldens or any other
   piece. If you need a helper, define it in your module. Do not register the pieces; the maintainer does.
2. Never import from `rotli/`, `studio/` or `brand/brand.json`: a study must not look or sound like Rotli. No quokka.
3. Follow the brief's story beats and timing (you may retime inside a beat; every shot must start on the beat grid:
   one beat = 60 / bpm × fps frames; `validate()` in film.ts refuses anything else). Frames: 780 at 30 fps.
4. Design EACH size (the brief's "sizes" note); a vertical re-stacks, it never just crops. Keep text inside `layout().safe`.
5. Quality bar: nothing overlaps unintentionally, no text under 22 px (at 1080 short side), flat colour, depth from
   shadow only where the style allows, every hold keeps moving (a slow push-in, drift or ambient motion).
6. Copy is invented for the fictional product; never claim anything about a real company or person.
7. Sound: beatScore at 120 bpm, soft and sparse (pad and a light pluck; a gentle kick enters at the tile ring, frame 210), a tiny tick on each typed letter group (not every letter: every second or third), a soft whoosh for each orb flight and for the tile burst, a pop when the orb becomes the checkbox, a tick on each roller word, and a three-note sign-off at the end card.

VERIFY BY LOOKING, and iterate until right:
- `node tools/frames.mjs <pieceId> <8–12 frames across the piece> --out /tmp/orb-guide --sheet /tmp/orb-guide.png --cols 6`,
  then READ the PNG (and full frames in /tmp/orb-guide/ where detail matters). Do this for EVERY size.
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

--- THE STUDY (from series/studies/briefs/orb-guide.json) ---
Orb Guide · study 26 · video · 780 frames at 30 fps, 120 bpm · palette "loop"
Style: A quiet, airy product launch film on a warm off-white ground where ONE small glossy orb guides the eye through every scene. The orb is the palette's accent as a sphere: a radial gradient from a light highlight (upper left, accent2 toward white) to the accent at the rim, with a soft contact shadow only when it lands; it is the only saturated thing on screen. The ground carries a hairline construction grid: a few long 1 px lines in the palette's line colour that frame the subject as a square cell, with tiny ink dots at the four intersections; the cell tightens, widens and re-centres on springs as its content changes, and the lines always run off the frame edges. Type is small and calm: Inter 400/600 in ink at modest sizes (never a slam), centred, with generous letter-spacing only on the small-caps pill. The vocabulary: (1) typewriter reveals where the NEXT letter is already visible in muted grey before it turns ink, so words resolve left to right; (2) the orb flying on a smooth arc and leaving a thin, fading comet line (1–2 px, accent2, alpha falling along its length) that sweeps through or past the type; (3) the orb growing into a square picture tile inside the grid cell (radius morphing from round to 18 px), and a tile shrinking back into a mark; (4) an outlined pill that draws itself empty, then types a small-caps label, then collapses; (5) a stack of square picture tiles that bursts into a loose ring around a centred line of text and drifts in gentle parallax, then gathers back into a stack; (6) a sentence slot where a checkbox pops in (accent square, white tick drawn on) and a vertical word roller changes the last word: the old word slides up and fades while the new one slides in from below, one per beat. Picture tiles are flat code-drawn scenes in two or three pack colours (a moon over hills, a paper plane over a sun, a mug with steam, a clock, a stack of books, a lamp, two chat bubbles, a calendar page, a leaf), never photos or faces. Everything arrives on springs; holds keep a slow push-in or drift.
Learns from: A public motion-design reel by @amnxnet (https://x.com/amnxnet/status/2104476481154093134): a warm light ground with a hairline grid, one glossy orb that becomes a picture, a logo and a comet trail, typewriter lines with the next letter pre-shown in grey, an outlined pill label, a picture-tile scatter around a centred line, and a checkbox word roller. Its product, photos, logo, colours and copy are not used.
Beats (frames · what):
  - 0–90 · the orb is born: the hairline grid settles from wide to a centred square cell; a tiny orb appears at the centre and swells; the cell tightens around it; the orb morphs into a rounded square picture tile (the moon over hills) that fills the cell, which pushes in, then shrinks away into the Oriel mark
  - 90–150 · the lockup: the grid fades; the Oriel mark sits alone; 'Oriel' types beside it with the next letter shown grey before it turns ink; the lockup drifts slightly
  - 150–210 · the pill: the lockup clears; an empty outlined pill draws itself from the centre; 'INTRODUCING ORIEL TEAMS' types inside in small caps; the pill shrinks to a point
  - 210–360 · the tile ring: one small tile appears, becomes a stack of three, then bursts into nine tiles in a loose ring; 'From ask to booked' types at the centre (next letter grey); the tiles drift in parallax at different depths (far ones smaller and slower); on the last beat they gather back into a stack at the centre
  - 360–420 · the stack becomes the orb again, which breathes large and settles small
  - 420–540 · comet lines: 'Ask. Pick. Get it booked.' types while the orb flies in on an arc from the lower left, its comet line sweeping past the words, and lifts away to the upper right; then 'With everyone, from invite to calendar.' types while the orb crosses again the other way
  - 540–690 · the roller: 'Plan' types, then grows to 'Plan your own'; the orb drops in on a short arc and lands where the slot begins, becoming the accent checkbox with a white tick drawn on; the word roller changes one word per beat: 'Polls', 'Rotations', 'Office hours', 'And more'
  - 690–750 · the product: the grid returns with a wide landscape cell; an Oriel app window (a flat week grid with a few booked slots in accent2 and one in the accent, a small sidebar) scales up to fill the cell and the cell widens with it, one slot pulsing as it books
  - 750–780 · end: the window shrinks into the mark; 'Oriel' types beside it; hold with a slow push-in
Sizes: Vertical re-stacks: the grid cell sits in the upper-middle of the frame and is taller than wide for the app window (which becomes a phone-width day list instead of a week grid); the tile ring becomes an oval taller than wide around the centred line; long lines ('With everyone, from invite to calendar.') break onto two centred lines; the roller sentence stacks 'Plan your own' over the checkbox and rolling word; the orb's arcs run top to bottom instead of left to right.
Teaches: One small moving element can carry a whole film: when the orb connects every scene (it becomes the picture, the mark, the comet and the checkbox), cuts disappear and the eye always knows where to look.

