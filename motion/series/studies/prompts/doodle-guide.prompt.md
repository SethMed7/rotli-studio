You are building ONE study for the open-source rotli studio: a piece that shows the studio works for ANY product,
style and size, not only Rotli. Work ONLY in ~/rotli-studio/motion (a Node/npm project; use `node`, not bun; `~` is
your home directory, expand it to an absolute path for file tools). In every shell command use absolute paths or
`cd ~/rotli-studio/motion && …` (the shell's cwd resets between commands).

YOUR STUDY: "Doodle Guide" (study 24), brief at `series/studies/briefs/doodle-guide.json` (read it first; it is the contract).
Pieces to export from `src/canvas-core/studies/doodleGuide.ts`: `doodleGuide` (landscape), `doodleGuideVertical` (vertical). Primary size: landscape.

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
1. Create/modify ONLY `src/canvas-core/studies/doodleGuide.ts` and its hosts `src/hosts/page-<pieceId>.ts` (one per piece, copy
   `src/hosts/page-motionResume.ts`). Do NOT edit the kit, the pack, tools, pieces.json, series.json, goldens or any other
   piece. If you need a helper, define it in your module. Do not register the pieces; the maintainer does.
2. Never import from `rotli/`, `studio/` or `brand/brand.json`: a study must not look or sound like Rotli. No quokka.
3. Follow the brief's story beats and timing (you may retime inside a beat; every shot must start on the beat grid:
   one beat = 60 / bpm × fps frames; `validate()` in film.ts refuses anything else). Frames: 1080 at 30 fps.
4. Design EACH size (the brief's "sizes" note); a vertical re-stacks, it never just crops. Keep text inside `layout().safe`.
5. Quality bar: nothing overlaps unintentionally, no text under 22 px (at 1080 short side), flat colour, depth from
   shadow only where the style allows, every hold keeps moving (a slow push-in, drift or ambient motion).
6. Copy is invented for the fictional product; never claim anything about a real company or person.
7. Sound: beatScore drive at 120 bpm with the drums entering at the first flip (drop at frame 90), a hit on every section flip, a whoosh into the 'Golden + Poodle' merge, soft ticks for each card, chip, bar fill and coat stroke burst (thinned so they never buzz), and the sign-off at the end card.

VERIFY BY LOOKING, and iterate until right:
- `node tools/frames.mjs <pieceId> <8–12 frames across the piece> --out /tmp/doodle-guide --sheet /tmp/doodle-guide.png --cols 6`,
  then READ the PNG (and full frames in /tmp/doodle-guide/ where detail matters). Do this for EVERY size.
- videos: `node tools/render.mjs <pieceId> --out /tmp/<pieceId>.mp4`, then `node tools/still-frames.mjs /tmp/<pieceId>.mp4`
  must print an EMPTY `windows:` line.
- loops: also `node tools/loop-seam.mjs /tmp/<pieceId>.mp4` must print SEAMLESS.
- loudness (videos): `ffmpeg -nostats -i /tmp/<pieceId>.mp4 -af ebur128 -f null - 2>&1 | grep " I:"` should be about −16 LUFS.
- `npx tsc --noEmit -p tsconfig.json` must print nothing.
- Do not commit, do not touch ~/rotli, do not run `studio.mjs render all` or golden.

Report back: files created, the final sheet paths, still-frames / loop-seam / loudness results, what you would improve
with more time, and anything you could not make work.

--- THE STUDY (from series/studies/briefs/doodle-guide.json) ---
Doodle Guide · study 24 · video · 1080 frames at 30 fps, 120 bpm · palette "doodle"
Style: A fun explainer hosted by the owner's own mascot, a light-blue turtle in black glasses (PNGs in assets/turtle/: head, wave, peek, laptop; embed them through the Film's assets.images, as dressUp.ts embeds its look PNGs). The spine of the piece: ONE character survives many rendering styles. A round badge in the bottom-left corner (ink outline, cream fill, about 150 px at 1080) holds the turtle's head, and every section redraws it in a DIFFERENT style computed in code from the PNG: (1) pixel dither (an ordered Bayer dither to four inks, chunky 6 px cells), (2) halftone dots on a rotated grid, (3) riso two-tone (the palette's accent and accent2 as two misregistered layers with a speckle), (4) ink line (edges found from the image's luminance and alpha, drawn as black strokes on cream), (5) flat poster (three flat tones and an outline), (6) the original colours. Styles are computed from each PNG ONCE per (pose, style, size) with getImageData into offscreen canvases cached at module level, never per frame; the frame only draws the cached canvases, so it stays a pure function of the frame. The hook and the end card show the turtle large on the cream ground (the hook in pixel dither, the end card in its original colours). Each section flips to its own full-bleed colour (the palette's s1…s6 roles) on a hard cut. Headlines are Inter 600, tight, left-aligned, and the key word sits on a HIGHLIGHTER BOX: a solid rectangle in the accent behind the word, which wipes in from the left just before the word lands (on the ink section, the box is the accent and the word ink). A small JetBrains Mono section label sits top-left ('// 01 · the basics'); there is no timecode. Small token confetti (paw prints and bones, drawn in the current badge style's look) float and tumble at the edges. The dogs are drawn in code, cute and simple: a rounded body, a round head, floppy ears, a dark nose and eyes, and the COAT is the lesson: straight coats are long smooth strands, wavy coats are soft S-strokes, curly coats are tight little loops; coat colour from a small set of named doodle colours defined in the module (cream, apricot, red, chocolate, and parti as white with patches). Cards (white surface, ink 3 px outline, a hard offset shadow in ink, like a sticker) hold dogs, bars and labels. Springs on every arrival; the turtle bobs and blinks (swap between poses only at cuts; for life inside a shot, bob, tilt and squash the image slightly).
Learns from: A public product explainer Opus 5.5 made from one prompt (https://x.com/achxvi/status/2104294892944097513): a dithered mascot hosting, a full-bleed colour flip for every section, the mascot's head in a round corner badge on every scene, highlighter boxes behind key words, token confetti, UI cards with bars that fill. Its character, colours, product and copy are not used; the host here is the owner's own turtle, used on the owner's request.
Beats (frames · what):
  - 0–90 · hook (cream): the turtle (wave pose, pixel dither, large, right of centre) bobs up into frame and waves; confetti drifts; a small bubble 'psst…' pops beside it and goes; the headline builds on the left: 'Thinking about' / 'a [goldendoodle]?' (the bracketed word on the highlighter box)
  - 90–210 · // 01 · the basics (s1): badge in HALFTONE; two sticker cards pop in, a Golden Retriever (straight golden coat, 'Golden Retriever') and a Poodle (tight curls, 'Poodle'); a '+' pops between them, then both slide together and become one doodle card (wavy apricot coat); headline 'Golden + Poodle' / '= [goldendoodle].'
  - 210–390 · // 02 · generations (s2): badge in PIXEL DITHER; headline 'The letters are the' / '[family tree].'; four generation cards land one per two beats, each with a two-colour bar filling (golden share vs poodle share) and a line: 'F1 · Golden × Poodle · about half and half', 'F1B · F1 × Poodle · about three-quarters Poodle', 'F2 · F1 × F1 · coats vary most', 'Multigen · doodle × doodle, several generations'; a small doodle on each card shows the likely coat
  - 390–570 · // 03 · coats (s3): badge in RISO; three doodles stand in a row and their coats draw on stroke by stroke: 'Straight', 'Wavy', 'Curly'; a slider under them moves from 'more Golden' to 'more Poodle' as the coats curl; headline 'More Poodle usually means' / '[curlier].' then a small line 'and, often, less shedding.'
  - 570–720 · // 04 · sizes (s4): badge in INK LINE; four doodles line up largest to smallest against a height ruler and pop in one per beat: 'Standard · roughly 50–90 lb', 'Medium · roughly 30–45 lb', 'Mini · roughly 15–30 lb', 'Petite · under about 15 lb'; headline 'Pick a [size].'; a mono footnote 'ranges are approximate; breeders' vary'
  - 720–840 · // 05 · colours (s5): badge in FLAT POSTER; one big doodle in the centre whose coat changes colour on each beat while named swatch chips light up in turn: 'Cream', 'Apricot', 'Red', 'Chocolate', 'Parti'; headline 'From cream to' / '[chocolate].'
  - 840–960 · // 06 · the honest bit (s6, ink ground, cream type): badge in ORIGINAL colours; headline 'No dog is fully' / '[hypoallergenic].' then the line 'More Poodle usually means less shedding. Meet the dog first.'; a small doodle sits by the badge and sneezes once (a tiny puff)
  - 960–1080 · end card (cream): the turtle peeks over the top of a big white sticker card (peek pose, original colours); on the card 'Which [doodle] is yours?' and a recap strip of four small chips 'F1 · F1B · F2 · Multigen'; confetti settles; a mono footer 'sizes are approximate · every dog is its own dog'; a slow push-in holds
Sizes: Vertical re-stacks: the headline sits in the top third of the safe area, the turtle below it and larger in the hook; the two basics cards stack with the '+' between them; the generation cards become one column of four; the three coats stay in a row (smaller) with the slider under them; the sizes line becomes a 2×2 grid with the ruler on each; the colour chips wrap to two rows under the dog; the badge stays bottom-left above the bottom safe margin.
Teaches: One character can survive any rendering style: redrawing the same host's head in a new style every section keeps the piece consistent while every scene looks new, and the same idea (one dog, many coats) is the lesson itself.

