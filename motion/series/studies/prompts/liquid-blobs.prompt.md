You are building ONE study for the open-source rotli studio: a piece that shows the studio works for ANY product,
style and size, not only Rotli. Work ONLY in ~/rotli-studio/motion (a Node/npm project; use `node`, not bun; `~` is
your home directory, expand it to an absolute path for file tools). In every shell command use absolute paths or
`cd ~/rotli-studio/motion && …` (the shell's cwd resets between commands).

YOUR STUDY: "Liquid Blobs" (study 32), brief at `series/studies/briefs/liquid-blobs.json` (read it first; it is the contract).
Pieces to export from `src/canvas-core/studies/liquidBlobs.ts`: `liquidBlobsVertical` (vertical), `liquidBlobs` (landscape). Primary size: vertical.

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
1. Create/modify ONLY `src/canvas-core/studies/liquidBlobs.ts` and its hosts `src/hosts/page-<pieceId>.ts` (one per piece, copy
   `src/hosts/page-motionResume.ts`). Do NOT edit the kit, the pack, tools, pieces.json, series.json, goldens or any other
   piece. If you need a helper, define it in your module. Do not register the pieces; the maintainer does.
2. Never import from `rotli/`, `studio/` or `brand/brand.json`: a study must not look or sound like Rotli. No quokka.
3. Follow the brief's story beats and timing (you may retime inside a beat; every shot must start on the beat grid:
   one beat = 60 / bpm × fps frames; `validate()` in film.ts refuses anything else). Frames: 720 at 30 fps.
4. Design EACH size (the brief's "sizes" note); a vertical re-stacks, it never just crops. Keep text inside `layout().safe`.
5. Quality bar: nothing overlaps unintentionally, no text under 22 px (at 1080 short side), flat colour, depth from
   shadow only where the style allows, every hold keeps moving (a slow push-in, drift or ambient motion).
6. Copy is invented for the fictional product; never claim anything about a real company or person.
7. Sound: beatScore soft at 120 bpm (pad and pluck), a drop-like tick pair on the splash (frame 30) and on each droplet landing (four, from frame 585), a whoosh ending on each merge (frames 270, 300 and 345), a hit when the card shape holds (frame 405), ticks on each tag pop, a whoosh ending on the liquid wipe (frame 660), and the sign-off at frame 675.

VERIFY BY LOOKING, and iterate until right:
- `node tools/frames.mjs <pieceId> <8–12 frames across the piece> --out /tmp/liquid-blobs --sheet /tmp/liquid-blobs.png --cols 6`,
  then READ the PNG (and full frames in /tmp/liquid-blobs/ where detail matters). Do this for EVERY size.
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

--- THE STUDY (from series/studies/briefs/liquid-blobs.json) ---
Liquid Blobs · study 32 · video · 720 frames at 30 fps, 120 bpm · palette "sunset"
Style: Four calendars as four drops of liquid that flow together into one shared time. The ground is the palette's pink ground, flat. The goo is ONE implicit surface: a field f(x, y) = Σ rᵢ² / ((x − xᵢ)² + (y − yᵢ)²) over a handful of balls, the surface is f = 1, and it is CONTOURED, not thresholded per pixel: sample f on a coarse grid (about 10 px at 1080), run marching squares with linear interpolation along each cell edge, join the segments into closed paths and fill them in one path with the palette's deep (violet) at full opacity, so the edge is crisp and anti-aliased. A second contour at f = 1.8, offset 8 px up and left and filled with deep mixed 18% toward white, is the only highlight (a flat gloss, no gradient); a third contour at f = 0.85 stroked 2 px in deep at 25% is a faint meniscus. Each blob is a main ball plus two or three small satellite balls orbiting inside it on slow closed-form circles, so its outline wobbles organically without any simulation; every position is a closed-form function of the frame (springs from kit/motion, sines, lerps). The tells of liquid, all to be shown: necks (as two blobs approach, a bridge thickens between them before they merge), a merged blob that overshoots and wobbles as it settles (a damped spring on its radius and aspect), and a pinch-off when a drop splits away (the neck thins, snaps, and a tiny satellite droplet is left behind for a moment before it is reabsorbed). Each person has a coloured CORE dot (22 px) floating inside their blob: Ana accent (orange), Kai accent2 (gold), Lena surface (white), Theo the pink ground colour (ink would vanish on deep); the cores drift with their blob, swirl together inside the merged one and line up as avatars later. To turn the liquid into a card, lerp the field toward a rounded-rectangle field (a smooth function that is 1 on the card's edge, larger inside) over one beat, so the goo visibly flows into the card shape and holds it. A LIQUID WIPE uses one huge ball that swells from off-frame to cover everything, then drains away. Type is Inter 800 for headlines (ink on ground, white on deep), Inter 600 for tags, Instrument Serif for the wordmark; keep readable text in ink or white: the palette's muted is too light on this pink for small type, use it only for hairlines.
Learns from: Metaballs, Jim Blinn's 1982 'blobby' surfaces (https://en.wikipedia.org/wiki/Metaballs), and Jamie Wong's walkthrough of drawing them with marching squares and linear interpolation (https://jamie-wong.com/2014/08/19/metaballs-and-marching-squares/): a summed field thresholded to a surface, contoured on a grid, with necks, merges and splits that come free from the maths. Their code, examples and colours are not used.
Beats (frames · what):
  - 0–90 · the hook: one big drop falls in from the top, lands in the centre with a squash, and splashes into four droplets that bounce apart to four spots; the headline builds at the top: 'Four calendars.'
  - 90–210 · four people: each blob wobbles in its own rhythm with its core dot inside; under each, a name tag and a free window pop in one per beat: 'Ana · free 1–4', 'Kai · free 3–5', 'Lena · free 2–4', 'Theo · free 3–6'; the headline changes to 'Four different schedules.'
  - 210–390 · Oriel pulls them together: the tags fade; the headline becomes 'Oriel finds the overlap.'; the blobs drift toward the centre; a neck forms and thickens between Ana and Kai, and they merge with a wobble; then Lena and Theo; then the two pairs become one big blob, the four cores swirling inside
  - 390–510 · the time: the big blob flows into a rounded card shape and holds it; on the card, in white, 'Thu · 3:00 pm' (large) and 'works for everyone' (smaller); the four cores line up at the bottom of the card as an avatar row
  - 510–630 · everyone gets it: four droplets bud from the card's lower edge, each neck thinning and pinching off with a tiny satellite droplet; they fly back to the four original spots and land with a squash, each becoming a small tag 'Ana · booked', 'Kai · booked', 'Lena · booked', 'Theo · booked'; the headline: 'One time. On every calendar.'
  - 630–720 · end: a liquid wipe (one ball swells from the bottom and covers the frame in deep, then drains downward) reveals the lockup: a small wobbling blob beside the wordmark 'Oriel', the line 'Find a time that works for everyone.' and 'oriel.example' in mono; the blob keeps a gentle wobble
Sizes: Vertical is primary: the headline sits in the top third of the safe area; the four blobs sit in a loose diamond in the middle third (top, left, right, bottom) with tags under each; the card is about 80% of the safe width; the lockup stacks the blob above the wordmark. Landscape re-stacks: the headline sits on the left third, the four blobs in a row across the right two thirds with tags under them, the merged blob and card centred in the right two thirds, and the lockup with the blob to the left of the wordmark, centred.
Teaches: An implicit surface does the animating for you: move a few balls on simple curves and the field produces necks, merges, wobbles and pinch-offs by itself, so one shape can believably become many and many can become one.

