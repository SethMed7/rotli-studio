You are building ONE study for the open-source rotli studio: a piece that shows the studio works for ANY product,
style and size, not only Rotli. Work ONLY in ~/rotli-studio/motion (a Node/npm project; use `node`, not bun; `~` is
your home directory, expand it to an absolute path for file tools). In every shell command use absolute paths or
`cd ~/rotli-studio/motion && …` (the shell's cwd resets between commands).

YOUR STUDY: "Pop" (study 64), brief at `series/studies/briefs/pop.json` (read it first; it is the contract).
Pieces to export from `src/canvas-core/studies/pop.ts`: `pop` (square), `popVertical` (vertical). Primary size: square.

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
   Only if your brief says three.js: `three.ts` (stage3, softRig), WebGL scenes drawn as a pure function of the frame,
   proved with `node tools/determinism.mjs <pieceId>`.
4. The pack: `brand/packs/studio/pack.json` (Oriel is a FICTIONAL product; use the palette your brief names;
   faces Inter, Instrument Serif, Instrument Serif Italic, JetBrains Mono).
5. Only if your brief names them: `src/canvas-core/styles/` (riso, print, drafting, storybook…) and `src/canvas-core/core.ts`
   (Gfx, PENCIL/RISOLINE media, halftone, rng, fractal). Read their headers, not every line.

HARD RULES:
1. Create/modify ONLY `src/canvas-core/studies/pop.ts` and its hosts `src/hosts/page-<pieceId>.ts` (one per piece, copy
   `src/hosts/page-motionResume.ts`). Do NOT edit the kit, the pack, tools, pieces.json, series.json, goldens or any other
   piece. If you need a helper, define it in your module. Do not register the pieces; the maintainer does.
2. Never import from `rotli/`, `studio/` or `brand/brand.json`: a study must not look or sound like Rotli. No quokka.
3. Follow the brief's story beats and timing (you may retime inside a beat; every shot must start on the beat grid:
   one beat = 60 / bpm × fps frames; `validate()` in film.ts refuses anything else). Frames: 240 at 60 fps.
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
7. Sound: beatScore soft with loop:true and key:3 at 120 bpm (tails wrap, so the audio loops with the picture), plus the piece's own cues on exact frames; about -16 LUFS; the seam must be inaudible. This piece: a soft rubbery boing for each hop and landing, a faint glassy shimmer as the bubble drifts, a bright wet POP on 120 (a short filtered noise burst with a sine blip), and a tiny synthesized giggle (three quick rising chirps) after the landing.

VERIFY BY LOOKING, and iterate until right:
- `node tools/frames.mjs <pieceId> <8–12 frames across the piece> --out /tmp/pop --sheet /tmp/pop.png --cols 6`,
  then READ the PNG (and full frames in /tmp/pop/ where detail matters). Do this for EVERY size.
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

--- THE STUDY (from series/studies/briefs/pop.json) ---
Pop · study 64 · video · 240 frames at 60 fps, 120 bpm · palette "pip"
Style: A SECONDS loop drawn in 3D with three.js: 4 s (240 frames) at 60 fps, 120 bpm (one beat = 30 frames, two bars), a seamless loop (frame 240 = frame 0, proved by tools/loop-seam.mjs), no words at all. Premium finish in the manner of a feature-animation short: an appealing invented character, soft filmic light, tactile materials, and animation that follows the principles (squash and stretch, anticipation, arcs, ease in and out, follow-through and overlapping action, the eyes leading the head). SECONDS RULES (follow them): (3) Pacing for a 4 s loop: land something on frame 0, the strongest moment on frame 120, and keep the picture evolving continuously between; critique.mjs's per-10-second counts do not apply to a single 4 s gesture. (4) Exactly periodic: every decay, flare or envelope must reach exactly its resting value before frame 240 (window it), or wrap around the loop. (5) Sound: run beatScore as a quieter bed (gain about 0.24) with this study's key, add any custom cue as your own pure, seeded samples in the module, wrap their tails around the loop, and re-normalise the mix to about -16 LUFS (see the audio in src/canvas-core/studies/flowField.ts); check a hit stands out with an unweighted RMS envelope, not LUFS. (7) Frame 0 must land in picture AND sound: a short event exactly at frame 0, with a cue on sample 0 whose tail wraps (write at negative indices). (8) No freeze after the hit: the half-second after frame 120 keeps visibly moving. (9) The first 1.5 s is not ambient drift: a small pre-pulse on beat 3 (frame 60) sets up the hit. (10) The hit stands clearly above the bed: about +6 dB in an unweighted RMS envelope. THREE.JS RULES (this is the first Seconds study drawn in 3D; learned from the spike that proved it): (T1) Draw with src/canvas-core/kit/three.ts: stage3() builds the scene ONCE (cached) and every frame sets EVERY animated property (positions, rotations, scales, eyelids, colours, light levels, camera) from the frame number before s.render(ctx). No THREE.Clock, AnimationMixer, physics, controls, Math.random or state carried between frames: seeking to any frame cold must draw what playing to it draws. Seeded randomness only through core.ts rng at build time. (T2) No image, model or HDR files: build everything from three's primitives (SphereGeometry, CapsuleGeometry, LatheGeometry, TubeGeometry, ExtrudeGeometry, TorusGeometry), reshaping vertices in code at build time if needed; light comes from softRig() plus the procedural RoomEnvironment stage3 sets up. (T3) Prove determinism for BOTH pieces: `node tools/determinism.mjs <pieceId>` must print SAME. Any post-processing (EffectComposer passes, bloom, depth of field, ambient occlusion) must pass it too; if a pass fails, drop it and fake the effect another way. (T4) Cost: aim under about 600 ms per frame at 1080x1920 (render.mjs's 150 ms budget line is a report for 2D pieces; 3D studies ship as MP4). One shadow-casting light; fit its shadow frustum to the set (softRig's shadowSpan). (T5) Motion blur: none by default; if one fast move strobes, render 3 to 5 sub-frames for those frames only and average them on the 2D canvas. (T6) Squash and stretch keep volume (scale y by s, x and z by 1/sqrt(s)). Secondary motion (the sprout, cheeks, the bubble's wobble) is a closed-form damped response to the main motion's known curve (e.g. a damped sine started at each landing), never a simulation. (T7) The character must read at 360 px: check a phone-size contact sheet; eyes need catchlights; the rim light keeps the silhouette clear of the set. THE STYLE: Pip, an invented little creature (about 1 unit tall): one rounded bean-shaped body that is also its head (a stretched sphere or a LatheGeometry profile), satin skin (MeshPhysicalMaterial in accent with a little sheen and clearcoat, roughness about 0.45), a cream belly patch (surface), two big glossy eyes set wide and LOW on the face (the appeal is in eyes in the lower half), each a white sphere with a dark iris and pupil (deep) and TWO catchlights (key and fill), eyelids that blink (a skin-coloured cap that rotates down over the eye), soft brows that lift and knit, a small mouth that is a dark curve and can open into an 'o', rosy cheek discs (s1, low opacity), two stubby feet and tiny nub arms, and a short sprout on top (two leaves on a stem, accent2-tinted green from a blend) that lags behind every move. It stands on a warm wooden tabletop (s2, a few darker plank seams, a soft sheen) in front of a softly out-of-focus wall (ground); fake depth of field by rendering the wall and any background props in a second WebGL pass and blurring it in 2D (draw small, scale back up, as Frost does), then composite the character pass, rendered with a transparent background, on top. A soap bubble (MeshPhysicalMaterial: transmission 1, roughness 0, ior about 1.1, thickness about 0.4, iridescence 1 with a thin-film range, tinted faintly accent2) drifts down, wobbling as a closed-form surface oscillation. The loop: Pip lands a small hop on frame 0 (squash, the sprout whips); it spots the bubble and its eyes lead its head up to it; on beat 3 (frame 60) it crouches in anticipation (squash, brows knit, a blink); it springs up (stretch) and boops the bubble with its sprout exactly on frame 120: the bubble POPS (a quick ring of tiny droplets flying out on arcs, a soft flash of light on Pip's face, its mouth an 'o') - the hit; it falls, lands with a big squash and a giggling double bounce (follow-through on the sprout and cheeks); a new bubble floats down from above, Pip notices and does a little excited hop timed to land exactly on frame 240 = frame 0. Light it like a feature short: softRig's warm key casting the only shadow (a soft contact shadow under the feet that tightens as Pip lands), a cool sky fill, and a warm rim from behind that outlines Pip against the wall; ACES or AgX tone mapping; a long lens (fov about 26 to 30) at Pip's eye height, a slow push-in through the anticipation and a small camera bump on the hit.
Learns from: The twelve basic principles of animation (https://en.wikipedia.org/wiki/Twelve_basic_principles_of_animation) and the way feature-animation studios light a character with a key, a fill and a rim. No film, character or design is reproduced; Pip is invented.
Beats (frames · what):
  - 0–60 · Pip lands a little hop, spots a soap bubble drifting down, and its eyes lead its head up to watch it
  - 60–120 · it crouches in anticipation on beat 3, then springs up and boops the bubble with its sprout: the bubble pops on 120 (hit)
  - 120–240 · it lands with a squash and a giggling double bounce; a new bubble floats down and Pip hops again to land on the loop
Sizes: Square (primary, 1080x1080) is the hero framing. Vertical (1080x1920) re-stacks: the motif is redesigned for the tall frame (a lower camera looking slightly up, so the jump and the bubble's fall from high above use the height; Pip centred a little low), never a crop; keep everything important clear of the 220 px top and 320 px bottom margins a feed covers.
Teaches: A character is a few primitives and a lot of timing: squash and stretch that keeps its volume, eyes that lead the head, anticipation before every move, and a soft key, fill and rim to make it feel touchable.

