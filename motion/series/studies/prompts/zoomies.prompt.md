You are building ONE study for the open-source rotli studio: a piece that shows the studio works for ANY product,
style and size, not only Rotli. Work ONLY in ~/rotli-studio/motion (a Node/npm project; use `node`, not bun; `~` is
your home directory, expand it to an absolute path for file tools). In every shell command use absolute paths or
`cd ~/rotli-studio/motion && …` (the shell's cwd resets between commands).

YOUR STUDY: "Zoomies" (study 55), brief at `series/studies/briefs/zoomies.json` (read it first; it is the contract).
Pieces to export from `src/canvas-core/studies/zoomies.ts`: `zoomies` (landscape), `zoomiesVertical` (vertical). Primary size: landscape.

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
1. Create/modify ONLY `src/canvas-core/studies/zoomies.ts` and its hosts `src/hosts/page-<pieceId>.ts` (one per piece, copy
   `src/hosts/page-motionResume.ts`). Do NOT edit the kit, the pack, tools, pieces.json, series.json, goldens or any other
   piece. If you need a helper, define it in your module. Do not register the pieces; the maintainer does.
2. Never import from `rotli/`, `studio/` or `brand/brand.json`: a study must not look or sound like Rotli. No quokka.
3. Follow the brief's story beats and timing (you may retime inside a beat; every shot must start on the beat grid:
   one beat = 60 / bpm × fps frames; `validate()` in film.ts refuses anything else). Frames: 900 at 30 fps.
4. Design EACH size (the brief's "sizes" note); a vertical re-stacks, it never just crops. Keep text inside `layout().safe`.
5. Quality bar: nothing overlaps unintentionally, no text under 22 px (at 1080 short side), flat colour, depth from
   shadow only where the style allows, every hold keeps moving (a slow push-in, drift or ambient motion).
   Readable on a phone beats the brief's type sizes: a line that matters (caption, key number, call to action) is
   about 44 px or more at 1080 on the short side; say so if you enlarge one. Land something bold in the first 1.5 s,
   and give any calm longer than about 4 s a moment that lands (a snap, a pop, a hit, a cut) in the style's own terms.
   The pack's fonts lack some glyphs (no box-drawing or block characters in JetBrains Mono, no ¼ ½ ¾ in Instrument
   Serif, no π or √ anywhere): draw those as shapes. beatScore's only mood with drums is "drive".
6. Copy follows the brief's `subject`: `oriel` is invented for the imaginary product; `learn` states only the brief's
   `facts`, hedged as they are; `fun` names nothing real. Never claim anything about a real company or person.
7. Sound: Foley-led, synthesised in the module (not beatScore): a four-footfall gallop patter on every run, band-passed noise whooshes that end on the cuts, formant barks and yips, crunches for nibbling and leaves, a cartoon spring for the head-snaps and the bunny, bells for the glints, a bonk and a crash on the impact frame, a whistle riser into it, a scuffle with barks and tweeting birds, a skid, panting, a garden wind bed with birdsong in the quiet shots, and a pizzicato bed in F at 120 bpm that drops out for the slow motion and the impact and pitches down on the skid; a four-note pluck sting on the title. About −16 LUFS.

VERIFY BY LOOKING, and iterate until right:
- `node tools/frames.mjs <pieceId> <8–12 frames across the piece> --out /tmp/zoomies --sheet /tmp/zoomies.png --cols 6`,
  then READ the PNG (and full frames in /tmp/zoomies/ where detail matters). Do this for EVERY size.
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

--- THE STUDY (from series/studies/briefs/zoomies.json) ---
Zoomies · study 55 · video · 900 frames at 30 fps, 120 bpm · palette "yard (local: the cast and the yard are colour constants in the module; the pack gives only the type)"
Style: An anime-style action short drawn entirely by code: flat cel colour, one shadow tone per shape, no outlines, a camera that lives down in the grass. THE CAST is two small curly-coated dogs on one rig with two looks, drawn from the owner's reference photos (the photos are not in the repository): the red one (apricot-red, shaved smooth body and legs, a fluffy mop of a head, long wavy ears, a lighter beard, a white bib, a blue collar) and the parti one (white, apricot ears and eye patches, a curly white topknot, a pink tongue that is always a little out, a silver tag). What makes them read as these dogs is the silhouette: smooth shaved bodies against fluffy heads, long curly ears and plume tails. Curls are unions of small circles round an ellipse (never spikes). The rig has four views: a profile whose rotary gallop is closed-form in the stride phase (spine flex e = cos 2πp sets every leg angle, the body stretch and the bob; the far legs trail the near ones), a run straight at the lens (one paw reaching up at the lens while the other plants), a face-on sit, and a face-on head for close-ups (locked-on eyes: a warm iris ring round a wide pupil and a big shine). The bunnies are cottontails in profile (squash and stretch in the hop, ears back in the air) and sitting face on (nose twitch, chew). THE CAMERA borrows the reference's action grammar, never its content: a low lens in the grass with foreground blades, shots that look down the lawn in closed-form perspective (scale = k / Z), a side-on tracking shot with parallax layers, a 180-degree shutter by subframes on the fast shots, speed lines, manga focus lines, a whip pan, a slow-motion burst (time remapped inside the shot), a two-frame black-and-cream impact frame that inverts, a face-filling close-up, and a comedy freeze. Holds keep breathing (a push-in, blinks, panting, a wagging tail). Type is one word at the end, 'zoomies.' in Instrument Serif Italic, in ink, centred in the sky.
Learns from: An AI-generated anime cat 'Zoomies' short shared on X by Kōda (https://x.com/aimikoda/status/2104474150215578011, made with Midjourney and Seedance): about forty cuts in 30 s, a low lens, fur smears across the frame, a knocked-over object in slow motion, a face-filling close-up, a scramble through a room and an innocent sit at the end, all carried by foley rather than music. Its cat, rooms, colours, gags and footage are not used; the dogs, the yard, the bunnies, the leaf pile and the collision are original.
Beats (frames · what):
  - 0–75 · peek: a low lens in the grass; a bunny nibbles clover big in the foreground; on the wicker bench behind it two dozy dogs sit; at 30 both heads snap round, ears up; at 45 a glint in all four eyes; at 60 a cut to the bunny's face as it freezes, ears straight up; a push-in throughout
  - 75–105 · lock-on: both faces fill the frame over manga focus lines on a sunny ground, pupils going wide, a glint at 90
  - 105–165 · launch: the bunny bolts across the foreground; the dogs leap off the bench and run straight at the lens until a paw fills the frame; white fur smears across the lens into the next shot
  - 165–285 · chase: side on, the camera racing with them over parallax layers; the bunny leads, then vaults straight over their heads; they skid in a cloud of dust, turn with a hop and bolt back as the frame whips round
  - 285–375 · leaves: a tidy leaf pile under a tree; the bunny dives in; the dogs go straight through at full speed and the burst plays in slow motion (closed-form ballistics with drag, in remapped time); the bunny is left sitting in the flattened heap wearing a leaf, then hops off
  - 375–450 · split: two bunnies run at the lens, split left and right and cut back across each other; each dog takes one, and the two dogs converge in the middle, eyes widening as they see each other
  - 450–510 · tumble: a four-frame impact frame (silhouettes, focus lines, a star, the palette inverting), then a cartoon scuffle cloud rolling across the lawn with legs, ears and tails poking out on threes and stars orbiting; two bunnies watch from the foreground, chewing; the cloud bursts
  - 510–555 · face: the parti one fills the frame, shakes off the dust with her eyes squeezed shut, then pops them wide, tongue flapping, ears flying, and bolts out of frame
  - 555–690 · laps: the bunnies forgotten, the dogs chase each other round the yard on a closed-form ellipse (the red one overtakes halfway), leaving a dust trail, the bunnies now the audience on the bench; at 615 a cut down into the grass where each dog tears past the lens at full size, one each way, then back to the laps at 645
  - 690–735 · skid: both run at the lens and brake, grass and dirt fanning up from the planted paws, stopping with a bounce right at the camera
  - 735–900 · sit: both dogs sit side by side in the wreckage (scattered leaves, divots, the rake knocked flat, a leaf stuck on the red one's head), panting then innocent; a bunny hops in and sits right between them; their eyes slide towards it; a glint; the bunny bolts at 853 and both heads snap after it; 'zoomies.' lands at 861; they are gone at 881, leaving dust and the title
Sizes: Vertical re-stacks: horizons sit higher and the ground drops further, so the cast lands in the middle third with tall foreground grass framing the bottom; the lock-on stacks the two faces one above the other; the side-on chase keeps both dogs large across the lower middle; the laps use a narrower ellipse; the sit puts the dogs at the frame's edges with the bunny between them and the title in the top safe area. Landscape (primary): a wide low frame, characters large, the title centred in the sky.
Teaches: A character film is a rig plus a camera: two looks on one closed-form rig give you a cast, and the energy comes from where you put the lens (low, close, moving) and when you cut, not from how much you draw.

