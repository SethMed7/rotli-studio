You are building ONE study for the open-source rotli studio: a piece that shows the studio works for ANY product,
style and size, not only Rotli. Work ONLY in ~/rotli-studio/motion (a Node/npm project; use `node`, not bun; `~` is
your home directory, expand it to an absolute path for file tools). In every shell command use absolute paths or
`cd ~/rotli-studio/motion && …` (the shell's cwd resets between commands).

YOUR STUDY: "Shadow Puppet" (study 36), brief at `series/studies/briefs/shadow-puppet.json` (read it first; it is the contract).
Pieces to export from `src/canvas-core/studies/shadowPuppet.ts`: `shadowPuppet` (landscape), `shadowPuppetVertical` (vertical). Primary size: landscape.

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
1. Create/modify ONLY `src/canvas-core/studies/shadowPuppet.ts` and its hosts `src/hosts/page-<pieceId>.ts` (one per piece, copy
   `src/hosts/page-motionResume.ts`). Do NOT edit the kit, the pack, tools, pieces.json, series.json, goldens or any other
   piece. If you need a helper, define it in your module. Do not register the pieces; the maintainer does.
2. Never import from `rotli/`, `studio/` or `brand/brand.json`: a study must not look or sound like Rotli. No quokka.
3. Follow the brief's story beats and timing (you may retime inside a beat; every shot must start on the beat grid:
   one beat = 60 / bpm × fps frames; `validate()` in film.ts refuses anything else). Frames: 900 at 30 fps.
4. Design EACH size (the brief's "sizes" note); a vertical re-stacks, it never just crops. Keep text inside `layout().safe`.
5. Quality bar: nothing overlaps unintentionally, no text under 22 px (at 1080 short side), flat colour, depth from
   shadow only where the style allows, every hold keeps moving (a slow push-in, drift or ambient motion).
6. Copy is invented for the fictional product; never claim anything about a real company or person.
7. Sound: beatScore soft at 90 bpm (a slow music-box pluck over a pad), key −3 for dusk; a soft tick for each footstep (thinned to every other one) and each leap up the tree; a whoosh ending as the reflection slides into the lantern (frame 300) and as the moon rises back (frame 660); a hit when the wood goes dark (frame 400) and a gentler one when the glow returns (frame 680); the three-note sign-off at frame 840.

VERIFY BY LOOKING, and iterate until right:
- `node tools/frames.mjs <pieceId> <8–12 frames across the piece> --out /tmp/shadow-puppet --sheet /tmp/shadow-puppet.png --cols 6`,
  then READ the PNG (and full frames in /tmp/shadow-puppet/ where detail matters). Do this for EVERY size.
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

--- THE STUDY (from series/studies/briefs/shadow-puppet.json) ---
Shadow Puppet · study 36 · video · 900 frames at 30 fps, 90 bpm · palette "lantern"
Style: A silhouette film in the 1920s cut-out manner: black articulated paper figures and lacy black scenery against a glowing, backlit, colour-tinted ground, telling an original fable. THE GLOW: the ground is a radial gradient from the surface colour (hot centre, slightly above middle) through the scene's tint to the tint darkened 35% at the corners, as if a lamp shone up through glass and paper; each scene has its own tint (s1 amber for dusk, s2 blue for night, s3 rose for dawn), changed on a slow 20-frame cross-dissolve, never a hard cut. A soft film life sits on top: a global brightness flicker of ±2% and a 1 px gate weave, both stepped every second frame from a seeded hash of the frame, never random at render time. THE PUPPETS are rigs, not drawings: each figure (a fox, an owl, a hare) is a tree of separate ink parts (body, head, jaw, ears, a three-segment tail, four legs of two segments each for the fox and hare, wings of two segments for the owl), each part a filled path with its own pivot, joined at HINGES that only ROTATE; draw each part with ctx.save/translate/rotate from its parent. All joint angles are closed-form functions of time (a walk cycle is thigh = 24° · sin(ωt + φ), shin = 20° · max(0, sin(ωt + φ + 0.6)), with φ offset per leg; a head turn is an eased angle between two poses). Puppets move 'on twos' (quantise time for the rigs to every second frame) for the hand-animated feel; the glow and flicker run every frame. THE LACE: the silhouettes carry cut-out detail made with even-odd fills: an eye hole, a row of small crescents along the fox's tail, a filigree of leaf holes in every tree, a zig-zag grass fringe along the bottom edge, curling tendrils on the frame corners. Scenery sits on three planes: a far plane in ink at 0.35 alpha (the shaded tracing-paper look), a middle plane at 0.7 and the near plane in pure ink; planes drift at different speeds when the view pans, so the flat scene has depth. THE MOON is the one light object: a disc in surface colour with a 1 px accent2 ring. Captions are silent-film cards inside the picture: a band at the bottom (surface colour at 0.92 alpha, an ornamental cut-paper ink border with small curls) holding Instrument Serif 44 px ink text, one sentence per scene, fading in over 10 frames; opening and closing intertitles are full cards with the same ornamental border. No colour but the tints, ink and the moon.
Learns from: Lotte Reiniger's silhouette films, above all The Adventures of Prince Achmed (1926): figures cut from card and paper in many separate pieces joined with lead wire, animated frame by frame on backlit planes of glass, silhouettes placed on stacked planes for depth, and colour-tinted film stock (https://en.wikipedia.org/wiki/Lotte_Reiniger; The Conversation, https://theconversation.com/before-walt-disney-there-was-lotte-reiniger-the-story-of-the-worlds-first-animated-feature-125091). Her characters, stories, designs and intertitles are not used; the fable is original.
Beats (frames · what):
  - 0–100 · opening card: an ornamental cut-paper border draws itself around the amber glow; the title card reads 'The Fox Who Borrowed the Moon'; the glow flickers gently
  - 100–240 · dusk (s1 amber): a lacy wood on three planes; the view pans slowly right; the fox trots in on a walk cycle, stops at a pond and turns her head up at the moon, then down at its reflection; card: 'A fox wanted a light of her own.'
  - 240–400 · the borrowing: the fox lifts a jointed lantern on a pole and dips it in the pond; the reflection slides into the lantern, which now glows, and the moon in the sky shrinks to nothing; she trots off swinging it; card: 'So she borrowed the moon.'
  - 400–560 · the dark (the tint dissolves to s2 night blue and the glow dims): an owl misjudges its branch and flaps; a hare hops, stops and turns in circles; only the fox's lantern makes a small warm circle; she stops, and her ears droop; card: 'But the wood went dark for everyone else.'
  - 560–720 · the giving back: the fox climbs the tallest tree in three stepped leaps, branch by branch; at the top she tips the lantern and the moon rises out of it back into the sky, growing to full; the glow returns; card: 'So she climbed the tallest tree and gave it back.'
  - 720–820 · dawn (the tint dissolves to s3 rose): the fox, the owl and the hare sit together on a hill as the moon sets behind them; the owl bows its head; card: 'A light kept is small. A light shared lights the wood.'
  - 820–900 · closing card: the ornamental border again, 'The End', and a tiny fox silhouette curled asleep under the words; the glow slowly fades
Sizes: Vertical re-stacks: the scenery becomes a tall wood (trees taller, the pond smaller and lower), the view pans vertically instead of horizontally (up the tree in the giving-back scene, which suits the tall frame), the fox and friends are larger in the lower half, the moon sits in the upper third, and the caption band sits above the bottom safe margin with the text wrapped to two lines at 40 px. Cards centre with the border inset to the safe area.
Teaches: Silhouette makes a character pure gesture: with no face or colour to lean on, a fox reads only through the hinge angles of its joints, so the whole performance is in how each part rotates.

