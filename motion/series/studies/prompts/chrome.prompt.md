You are building ONE study for the open-source rotli studio: a piece that shows the studio works for ANY product,
style and size, not only Rotli. Work ONLY in ~/rotli-studio/motion (a Node/npm project; use `node`, not bun; `~` is
your home directory, expand it to an absolute path for file tools). In every shell command use absolute paths or
`cd ~/rotli-studio/motion && …` (the shell's cwd resets between commands).

YOUR STUDY: "Chrome" (study 56), brief at `series/studies/briefs/chrome.json` (read it first; it is the contract).
Pieces to export from `src/canvas-core/studies/chrome.ts`: `chrome` (square), `chromeVertical` (vertical). Primary size: square.

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
1. Create/modify ONLY `src/canvas-core/studies/chrome.ts` and its hosts `src/hosts/page-<pieceId>.ts` (one per piece, copy
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
7. Sound: beatScore soft with loop:true and key:3 at 120 bpm (tails wrap, so the audio loops with the picture), plus the piece's own hits on exact beat frames; about -16 LUFS; the seam must be inaudible. This piece: pad and a soft sub; a metallic shimmer whoosh into frame 120 and a bright bell hit on 120.

VERIFY BY LOOKING, and iterate until right:
- `node tools/frames.mjs <pieceId> <8–12 frames across the piece> --out /tmp/chrome --sheet /tmp/chrome.png --cols 6`,
  then READ the PNG (and full frames in /tmp/chrome/ where detail matters). Do this for EVERY size.
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

--- THE STUDY (from series/studies/briefs/chrome.json) ---
Chrome · study 56 · video · 240 frames at 60 fps, 120 bpm · palette "chrome"
Style: A SECONDS loop: 4 s (240 frames) at 60 fps, 120 bpm (one beat = 30 frames, two bars), a seamless loop (frame 240 = frame 0, proved by tools/loop-seam.mjs), no words at all: the style is the whole piece. Premium finish: considered easing (springs, ease-in-out, no linear moves), sub-pixel smooth 60 fps motion, motion blur where things move fast (kit/blur.ts samples inside the shutter), a restrained palette from the pack, depth from scale, layering and light, a faint seeded grain where it helps. Something lands on frame 0 (a loop is met mid-motion), and the strongest moment lands on a downbeat. Everything is a closed-form function of the frame: no simulation state; anything that wanders (particles, strands, noise) is sampled from periodic functions of t = frame/240 (e.g. noise sampled on a circle in time: cos 2πt, sin 2πt) so the last frame meets the first. SECONDS RULES (learned building the pilot, Flow Field; follow them): (1) the kit's noise is 2D only: for a field that changes in time, write a small module-local 3D noise whose time axis wraps (copy the approach of noise3 in src/canvas-core/studies/flowField.ts). (2) Use motion blur only where solid forms move fast; never on fine lines or thin strokes (a few samples ghost them into copies). (3) Pacing for a 4 s loop: land something on frame 0, the strongest moment on frame 120, and keep the picture evolving continuously between; critique.mjs's per-10-second counts do not apply to a single 4 s gesture. (4) Exactly periodic: every decay, flare or envelope must reach exactly its resting value before frame 240 (window it), or wrap around the loop. (5) Sound: run beatScore as a quieter bed (gain about 0.24) with this study's key, add any custom cue (a hit, a texture) as your own pure, seeded samples in the module, wrap their tails around the loop, and re-normalise the mix to about -16 LUFS (see the audio in flowField.ts); check a hit stands out with an unweighted RMS envelope, not LUFS. (6) A shape revealed inside a field (a vortex, a lens) needs guards where the field stalls or turns sharply, and should linger near half strength as it fades rather than blink out. (7) Frame 0 must land in picture AND sound: a short pulse exactly at frame 0 (e.g. exp(-(wrapDist(F,0)/9)^2)), not a broad swell; beatScore's pad leaves a release/attack hole at each bar line, deepest at the wrap, so add a cue that lands on sample 0 with its tail wrapped (write at negative indices) or a module-local pad that crosses the bar line. (8) No freeze after the hit: the half-second after frame 120 keeps visibly moving (ease it down, never stop). (9) The first 1.5 s is not ambient drift: a small pre-pulse on beat 3 (frame 60) sets up the hit. (10) The hit stands clearly above the bed: about +6 dB in an unweighted RMS envelope. THE STYLE: Liquid chrome, the Y2K way: one thick, rounded ribbon (a torus-knot-like closed loop, or a fat bean that pinches into two and rejoins) made of polished chrome, turning slowly in space on a near-black ground. Chrome is drawn by REFLECTION MAPPING faked in 2D: the ribbon is built from many cross-sections along a closed 3D curve; each cross-section's surface normal picks a colour from an environment strip (a dark floor, a hot white horizon line, a sky band in accent, a warm sunset band in accent2), so the reflections slide across the metal as it turns. A sharp specular highlight (s1) rides the crest; a soft contact reflection on a glossy floor below; the edges catch a thin rim light. Depth sort the cross-sections. The turn is one full symmetric rotation in 240 frames so it loops. On the downbeat of bar 2 the ribbon pinches (a smooth squash) and springs back, a bright glint sweeping across it.
Learns from: Y2K liquid-chrome type and object design (https://en.wikipedia.org/wiki/Y2K_aesthetic) and reflection (environment) mapping, the classic way to draw chrome (https://en.wikipedia.org/wiki/Reflection_mapping). No artwork, logo or type from either is used.
Beats (frames · what):
  - 0–120 · the chrome ribbon turns, reflections sliding across it; a glint on frame 0
  - 120–150 · bar 2 downbeat: it pinches and springs back, a white glint sweeps the crest (hit)
  - 150–240 · it settles and turns on into the loop
Sizes: Square (primary, 1080x1080) is the hero framing. Vertical (1080x1920) re-stacks: the motif is redesigned for the tall frame (more of the field above and below, the hero element centred a little high), never a crop; keep it clear of the 220 px top and 320 px bottom margins a feed covers.
Teaches: Chrome is not grey: it is the world reflected. Map each surface normal to an environment strip and the metal reads at once.

