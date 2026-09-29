You are building ONE study for the open-source rotli studio: a piece that shows the studio works for ANY product,
style and size, not only Rotli. Work ONLY in ~/rotli-studio/motion (a Node/npm project; use `node`, not bun; `~` is
your home directory, expand it to an absolute path for file tools). In every shell command use absolute paths or
`cd ~/rotli-studio/motion && …` (the shell's cwd resets between commands).

YOUR STUDY: "Ink Wash" (study 37), brief at `series/studies/briefs/ink-wash.json` (read it first; it is the contract).
Pieces to export from `src/canvas-core/studies/inkWash.ts`: `inkWashVertical` (vertical), `inkWash` (landscape). Primary size: vertical.

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
1. Create/modify ONLY `src/canvas-core/studies/inkWash.ts` and its hosts `src/hosts/page-<pieceId>.ts` (one per piece, copy
   `src/hosts/page-motionResume.ts`). Do NOT edit the kit, the pack, tools, pieces.json, series.json, goldens or any other
   piece. If you need a helper, define it in your module. Do not register the pieces; the maintainer does.
2. Never import from `rotli/`, `studio/` or `brand/brand.json`: a study must not look or sound like Rotli. No quokka.
3. Follow the brief's story beats and timing (you may retime inside a beat; every shot must start on the beat grid:
   one beat = 60 / bpm × fps frames; `validate()` in film.ts refuses anything else). Frames: 900 at 30 fps.
4. Design EACH size (the brief's "sizes" note); a vertical re-stacks, it never just crops. Keep text inside `layout().safe`.
5. Quality bar: nothing overlaps unintentionally, no text under 22 px (at 1080 short side), flat colour, depth from
   shadow only where the style allows, every hold keeps moving (a slow push-in, drift or ambient motion).
6. Copy is invented for the fictional product; never claim anything about a real company or person.
7. Sound: beatScore soft at 90 bpm (pad and a slow pluck, no drums), key −5 for a low, quiet colour; a short soft whoosh ending on each stroke's landing (the brush sweep; the branch strokes at frames 120, 140, 160 and 180, the heron's neck at 380 and wing at 420, the pine trunk at 620); soft ticks for each blossom dab and each haiku word (thinned); a whoosh ending as the camera arrives at each painting (frames 340 and 580); a single soft hit for the seal (frame 840) and the three-note sign-off at frame 860.

VERIFY BY LOOKING, and iterate until right:
- `node tools/frames.mjs <pieceId> <8–12 frames across the piece> --out /tmp/ink-wash --sheet /tmp/ink-wash.png --cols 6`,
  then READ the PNG (and full frames in /tmp/ink-wash/ where detail matters). Do this for EVERY size.
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

--- THE STUDY (from series/studies/briefs/ink-wash.json) ---
Ink Wash · study 37 · video · 900 frames at 30 fps, 90 bpm · palette "sumi"
Style: Ink-wash brush painting (sumi-e) made in code: black ink in five tones on warm paper, strokes that are laid down by a moving brush, bleed into the paper while wet and then dry, dry-brush streaks where the brush runs out of ink, a great deal of empty paper, one short original haiku written into that emptiness per painting, and ONE small red seal at the very end. THE PAPER: a washi texture computed once per size into an offscreen canvas (seeded: 1,500 short, faint fibres in surface and line tones, a very light mottling), never per frame; the ground colour everywhere else. THE BRUSH (every stroke is a pure function of the frame): a stroke is a centreline (cubic Béziers) with a start frame and a duration; the brush tip is at arc length s(F), eased fast-in slow-out like a real gesture. Each stroke has a WIDTH PROFILE (a quick press, a full belly, a taper to a point: w(u) over u = 0…1, 4–60 px at 1080) and an INK LOAD that falls along its length. Render in three layers. (1) The body: soft ellipses stamped every 2 px along the painted part, in the stroke's tone (s1 darkest, s2, s3, accent2, s4 palest), alpha 0.5–0.9. (2) Kasure, the dry brush: where the load drops below about 0.35, draw the body instead as 10–16 parallel bristle lanes across the width, each lane dropping out where a seeded hash of (lane, s) exceeds the remaining load, giving the white streaks of a dry brush. (3) Nijimi, the bleed: for a point painted at frame f0, a wider, paler halo (the same path, width w + b(F − f0), alpha about 0.12) grows for about 15 frames and then stops, its edge displaced by seeded low-frequency noise so it creeps unevenly into the fibres; once it stops, a thin rim 1–2 px darker than the halo marks the dried edge. Large washes (mist, water, sky) are the same bleed at large scale: a few very wide, very pale strokes whose halos merge. Negative space is part of the painting: snow is unpainted paper left between grey washes. THE HAIKU: Instrument Serif Italic, 48 px at 1080, ink at 0.85 alpha, three short lines set in the empty space away from the subject; each word appears as if soaking in: it fades from the palest wash tone to ink over 10 frames, one word every half beat. A small season word above it in Inter 400, 24 px, letter-spaced 0.3 em, muted ('SPRING', 'SUMMER', 'WINTER'). THE SEAL: a 64 px vermilion (accent) square with softly irregular edges and a speckled, slightly uneven fill (a seeded mask of tiny paper-coloured gaps), carved in paper colour with a simple geometric monogram: a circle over a single horizon line. It is abstract on purpose: no characters from any real script. The camera moves down a single hanging scroll that holds all three paintings (the vertical piece) and never cuts: it slides from painting to painting on a slow ease-in-out.
Learns from: East Asian ink-wash painting as described by Asian Brushpainter on the use of ink (https://www.asianbrushpainter.com/blogs/kb/the-use-of-ink: a palette of shades from the deepest black to pale grey, several tones in one stroke, the streaked 'flying white' of a fast, light brush) and by Wikipedia (https://en.wikipedia.org/wiki/Ink_wash_painting: tonal variation within a single stroke, economy of strokes, red seals, the hanging scroll and the handscroll); and the computational bleed of Chu and Tai's MoXi, 'Real-time ink dispersion in absorbent paper' (SIGGRAPH 2005, https://dl.acm.org/doi/10.1145/1073204.1073221), whose physics is approximated here by closed-form growth. No painting, calligraphy, seal or poem from any source is used; the haiku are original and the seal carries an invented geometric mark, not a character.
Beats (frames · what):
  - 0–100 · the paper: blank washi at the top of a hanging scroll; one very wide, very pale stroke is laid across it and blooms into a mist of wash that dries, the fibres showing through; a small line in Inter muted fades up and away: 'three seasons, in ink'
  - 100–340 · spring: a plum branch painted in four strokes, the first dark and wet, the last dry and streaked; blossoms as clusters of five pale round dabs with dark dotted centres placed one per beat; one petal falls on a slow sway; 'SPRING' then the haiku word by word: 'spring rain —' / 'the plum branch lets go' / 'one petal at a time'
  - 340–580 · summer: the camera slides down the scroll; a heron built from a few bold strokes (an S-curved neck, a sharp beak, a wing in one wide dry stroke, a single thin leg) standing in a pale wash of water with three quick reeds; ripples as two thin broken strokes around the leg; 'SUMMER' then 'noon heat —' / 'the heron holds the river' / 'still on one leg'
  - 580–820 · winter: the camera slides down again; an old pine painted with a dry-brushed trunk and clusters of fast needle strokes, then a grey wash sky laid AROUND the branches so their tops stay unpainted paper and read as snow; a few flakes are left as tiny unpainted gaps in the wash; 'WINTER' then 'first snow —' / 'the old pine keeps' / 'what it can hold'
  - 820–900 · the seal: the haiku and season words fade out (so no text shrinks under 22 px) as the camera eases back to show the whole scroll with its three paintings; the vermilion seal presses down in the lower corner (a quick scale from 1.08 to 1.0 and a slight ink spread at its edges); hold on the scroll with a very slow drift
Sizes: Vertical (primary) is a hanging scroll: the three paintings stack top to bottom and the camera slides down between them; each haiku sits in the empty paper beside or below its subject, left-aligned. Landscape re-stacks as a handscroll: the three paintings sit side by side and the camera slides sideways from right to left, the direction a handscroll is read; each haiku sits in the empty space to one side of its painting, and the final pull-back shows all three in a row with the seal at the far end.
Teaches: Emptiness is a material: when the paper is left bare on purpose (for mist, snow and a poem) a few timed strokes that bleed and dry say more than a filled frame.

