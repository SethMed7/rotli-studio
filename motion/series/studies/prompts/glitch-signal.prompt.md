You are building ONE study for the open-source rotli studio: a piece that shows the studio works for ANY product,
style and size, not only Rotli. Work ONLY in ~/rotli-studio/motion (a Node/npm project; use `node`, not bun; `~` is
your home directory, expand it to an absolute path for file tools). In every shell command use absolute paths or
`cd ~/rotli-studio/motion && …` (the shell's cwd resets between commands).

YOUR STUDY: "Glitch Signal" (study 30), brief at `series/studies/briefs/glitch-signal.json` (read it first; it is the contract).
Pieces to export from `src/canvas-core/studies/glitchSignal.ts`: `glitchSignalVertical` (vertical), `glitchSignal` (landscape). Primary size: vertical.

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
1. Create/modify ONLY `src/canvas-core/studies/glitchSignal.ts` and its hosts `src/hosts/page-<pieceId>.ts` (one per piece, copy
   `src/hosts/page-motionResume.ts`). Do NOT edit the kit, the pack, tools, pieces.json, series.json, goldens or any other
   piece. If you need a helper, define it in your module. Do not register the pieces; the maintainer does.
2. Never import from `rotli/`, `studio/` or `brand/brand.json`: a study must not look or sound like Rotli. No quokka.
3. Follow the brief's story beats and timing (you may retime inside a beat; every shot must start on the beat grid:
   one beat = 60 / bpm × fps frames; `validate()` in film.ts refuses anything else). Frames: 600 at 30 fps.
4. Design EACH size (the brief's "sizes" note); a vertical re-stacks, it never just crops. Keep text inside `layout().safe`.
5. Quality bar: nothing overlaps unintentionally, no text under 22 px (at 1080 short side), flat colour, depth from
   shadow only where the style allows, every hold keeps moving (a slow push-in, drift or ambient motion).
6. Copy is invented for the fictional product; never claim anything about a real company or person.
7. Sound: beatScore drive at 120 bpm with the drums entering at the breakup (drop at 180); hits on the big glitch spikes (frames 180, 240, 300) and on the hard cut to 'SIGNAL LOST' (frame 390); bursts of ticks every 2 frames during each stutter; a whoosh ending at 390 and one ending at 540; the sign-off at 540. Inside the module, add two things around the score (by post-processing its returned buffers, deterministically): a seeded white-noise static bed from frame 390 to 525 that fades as the picture locks, and a gain dropout (to zero for the length of each held glitch, 2–4 frames) at the three spikes, so the sound breaks when the picture does.

VERIFY BY LOOKING, and iterate until right:
- `node tools/frames.mjs <pieceId> <8–12 frames across the piece> --out /tmp/glitch-signal --sheet /tmp/glitch-signal.png --cols 6`,
  then READ the PNG (and full frames in /tmp/glitch-signal/ where detail matters). Do this for EVERY size.
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

--- THE STUDY (from series/studies/briefs/glitch-signal.json) ---
Glitch Signal · study 30 · video · 600 frames at 30 fps, 120 bpm · palette "glitch"
Style: A late-night transmission from an invented station, 'Relay 7', that breaks up and recovers. Two layers, always: a CLEAN SCENE and a GLITCH PASS. The clean scene is painted each frame into one offscreen canvas at full size: flat colour bars (seven vertical bars in ink, s2 yellow, accent2 cyan, s1 green, a magenta mixed from accent and s3, accent red and s3 blue, over a thin strip of reversed bars and a black pluge band), station chrome in JetBrains Mono (ink, 26–30 px: 'RELAY 7' top-left, a running timecode top-right counting real frames, 'CH 07' bottom-left), and big host lines in Inter 800 (ink, tight, left-aligned). The glitch pass redraws that offscreen onto the frame with operations that are ALL closed-form functions of the frame: every random choice comes from a seeded hash of a HELD index h = floor(F / hold) with hold 2–4 frames (never of raw F, so fractional motion-blur samples agree and glitches hold for a few frames like real ones), scaled by an intensity envelope g(F) set per story beat. The operations: (1) RGB SPLIT: the scene drawn three times through channel masks (multiply by pure red, green and blue, combined with 'lighter'), red offset left and blue right by up to 28 px × g; (2) SLICE DISPLACEMENT: 3–9 horizontal bands (8–140 px tall) copied from the offscreen with a horizontal offset of up to ±220 px × g, some wrapping around the edge; (3) SCANLINES: every third row darkened (20% black), plus a 1-row bright line every 6th row only when g is high; (4) VHS TRACKING: a 60–140 px band that rolls up the screen, inside it rows shifted by a sine of the row index plus hash noise, desaturated and brightened, with white dropout specks; (5) DATAMOSH SMEAR: the scene frozen at a key frame F0 is cut into 24 px macroblocks and each block is displaced by v(block) × (F − F0), where v is a smooth vector field (the motion of the next scene), while a growing, hash-chosen fraction of blocks switch to the new scene; nothing is simulated, the smear is a function of (F − F0); (6) PIXEL SORT: only in the melt beat, the scene is drawn at quarter resolution, read with getImageData, and in each column the runs of pixels brighter than a threshold are sorted by brightness so bright type melts into streaks, then scaled back up with smoothing off; (7) SNOW: per-pixel noise at quarter resolution from the hash of (x, y, h). Per-frame getImageData is allowed here because the result is deterministic; confine it to the pixel-sort and snow beats. Everything else is drawImage offsets of the clean offscreen. No blur filters. Type stays readable in the clean beats; in the heavy beats readability is deliberately lost and then won back.
Learns from: Glitch art as a practice (https://en.wikipedia.org/wiki/Glitch_art) and its theory in Rosa Menkman's Glitch Studies Manifesto (https://amodern.net/wp-content/uploads/2016/05/2010_Original_Rosa-Menkman-Glitch-Studies-Manifesto.pdf); pixel sorting after Kim Asendorf's open-source ASDFPixelSort (https://github.com/kimasendorf/ASDFPixelSort); datamoshing (removing keyframes so motion data smears old pixels). Their images, works, colours and copy are not used; the station, the host lines and the colour bars here are invented.
Beats (frames · what):
  - 0–90 · clean signal: the colour bars fill the frame with the station chrome ('RELAY 7', the timecode, 'CH 07') and a lower strip 'NIGHT TRANSMISSION' in mono; one single-frame slice glitch on the downbeat at frame 60, then the bars cut to the host scene
  - 90–180 · the host lines: on a near-black ground, 'Good evening.' builds large, then 'You are receiving us' / 'clearly.'; tiny glitches on the beats (a 2-frame slice offset at 105, 135 and 165), g about 0.1
  - 180–300 · breakup: g ramps from 0.3 to 0.9; the RGB split widens, slices tear across the words, scanlines deepen, and the tracking band starts rolling up the screen; the word 'clearly.' stutters on held frames ('cle', 'cle', 'clearly.') and the lines repeat and jump
  - 300–390 · melt: the picture freezes on the host lines; the colour bars try to return and their motion drags the frozen type in 24 px blocks (datamosh smear); the bright letters melt downward into pixel-sorted streaks; the timecode sticks on one number
  - 390–450 · signal lost: a hard cut to flat blue (s3) with mono 'NO INPUT' top-left and 'SIGNAL LOST' centred in Inter 800; it holds two beats, blinking; then snow fills the frame from the bottom up
  - 450–540 · searching: over the snow, a mono readout 'SEARCHING  CH 05 · 06 · 07' steps a number per beat and a signal meter fills; the bars fade up through the snow, rolling vertically (a lost vertical hold) and settling with a damped bounce at frame 525; g falls to 0.05
  - 540–600 · signal found: clean bars, then the host scene again, calm: 'Signal found.' / 'We never left.'; faint scanlines stay; the timecode runs again; one last one-frame RGB wink at frame 585
Sizes: Vertical is primary: the bars fill the full frame top to bottom with the chrome inside the safe area (station name and timecode under the top 220 px, channel above the bottom 320 px); host lines are left-aligned in the middle third at the largest size that keeps 'You are receiving us' on one or two lines. Landscape keeps the same scenes: the bars run full width with the reversed strip and pluge band beneath, host lines sit on the left two thirds at a larger size, the tracking band spans the full width and rolls a shorter distance, and the 'SIGNAL LOST' card centres.
Teaches: A glitch reads as real when it follows the machine's own logic: channel splits, displaced slices, blocks that smear along motion, scanlines and frames that hold for a beat look broken; random noise sprinkled on top only looks fake.

