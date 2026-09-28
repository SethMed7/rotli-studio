You are building ONE study for the open-source rotli studio: a piece that shows the studio works for ANY product,
style and size, not only Rotli. Work ONLY in ~/rotli-studio/motion (a Node/npm project; use `node`, not bun; `~` is
your home directory, expand it to an absolute path for file tools). In every shell command use absolute paths or
`cd ~/rotli-studio/motion && …` (the shell's cwd resets between commands).

YOUR STUDY: "Five Point Five" (study 25), brief at `series/studies/briefs/five-point-five.json` (read it first; it is the contract).
Pieces to export from `src/canvas-core/studies/fivePointFive.ts`: `fivePointFive` (landscape), `fivePointFiveVertical` (vertical). Primary size: landscape.

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
1. Create/modify ONLY `src/canvas-core/studies/fivePointFive.ts` and its hosts `src/hosts/page-<pieceId>.ts` (one per piece, copy
   `src/hosts/page-motionResume.ts`). Do NOT edit the kit, the pack, tools, pieces.json, series.json, goldens or any other
   piece. If you need a helper, define it in your module. Do not register the pieces; the maintainer does.
2. Never import from `rotli/`, `studio/` or `brand/brand.json`: a study must not look or sound like Rotli. No quokka.
3. Follow the brief's story beats and timing (you may retime inside a beat; every shot must start on the beat grid:
   one beat = 60 / bpm × fps frames; `validate()` in film.ts refuses anything else). Frames: 1920 at 30 fps.
4. Design EACH size (the brief's "sizes" note); a vertical re-stacks, it never just crops. Keep text inside `layout().safe`.
5. Quality bar: nothing overlaps unintentionally, no text under 22 px (at 1080 short side), flat colour, depth from
   shadow only where the style allows, every hold keeps moving (a slow push-in, drift or ambient motion).
6. Copy is invented for the fictional product; never claim anything about a real company or person.
7. Sound: NOT beatScore: this piece writes its own audio(sr) in the module (a backing track plus a formant-synthesized sung voice driven by the syllable table; see the style). Picture cuts sit on bar lines (every 80 frames), stamps and the numeral lock land on exact beat frames with a hit, about −16 LUFS integrated.

VERIFY BY LOOKING, and iterate until right:
- `node tools/frames.mjs <pieceId> <8–12 frames across the piece> --out /tmp/five-point-five --sheet /tmp/five-point-five.png --cols 6`,
  then READ the PNG (and full frames in /tmp/five-point-five/ where detail matters). Do this for EVERY size.
- videos: `node tools/render.mjs <pieceId> --out /tmp/<pieceId>.mp4`, then `node tools/still-frames.mjs /tmp/<pieceId>.mp4`
  must print an EMPTY `windows:` line.
- loops: also `node tools/loop-seam.mjs /tmp/<pieceId>.mp4` must print SEAMLESS.
- loudness (videos): `ffmpeg -nostats -i /tmp/<pieceId>.mp4 -af ebur128 -f null - 2>&1 | grep " I:"` should be about −16 LUFS.
- `npx tsc --noEmit -p tsconfig.json` must print nothing.
- Do not commit, do not touch ~/rotli, do not run `studio.mjs render all` or golden.

Report back: files created, the final sheet paths, still-frames / loop-seam / loudness results, what you would improve
with more time, and anything you could not make work.

--- THE STUDY (from series/studies/briefs/five-point-five.json) ---
Five Point Five · study 25 · video · 1920 frames at 30 fps, 90 bpm · palette "clay"
Style: A lyric video for a short song about Opus 5.5 making this studio, and the song itself is made in code too. Warm ink-black ground, cream type, ONE clay accent, and every lyric line gets its own visual idea, cut on the bar: a prompt field with a blinking caret, a brief document scanned by a highlight, a wireframe topography that warps like a plotted function, a line drawing that assembles itself, huge numerals that roll like an odometer, streaming code lines, a contact strip of frames with a running counter, an official-looking form stamped by a rubber stamp. Type treatments change per line too (heavy condensed caps, tracked mono, a large serif italic, words set on a curve), but the lyric is always the hero and always readable; the sung syllable is lit in the accent as it is sung (karaoke-style, exact to the syllable's frame). Thin HUD fragments in JetBrains Mono (tiny labels, a bar meter that follows the song's loudness envelope, a frame counter) sit at the edges, muted. Light: a soft vignette and one warm glow behind the hero element; grain as a faint seeded speck field. Depth from scale and blur (offscreen canvas scaled back up; no ctx.filter). THE SOUND IS PART OF THE PIECE and lives in the module's audio(sr), pure and seeded: a backing track (kick, a snappy noise snare on 2 and 4, closed hats, a warm sine-and-saw bass, a pad, a plucked arpeggio) at 90 bpm in A minor for the verse, lifting to C major for the chorus; and a SUNG VOICE by formant synthesis: a glottal-pulse source (a band-limited sawtooth or Rosenberg pulse) at each syllable's pitch with gentle vibrato and a short portamento, through three parallel formant resonators (two-pole band-passes) set per vowel (use standard values: a ≈ 800/1150/2900 Hz, e ≈ 400/1600/2700, i ≈ 300/2300/3000, o ≈ 450/800/2800, u ≈ 325/700/2500), gliding between vowels, with short filtered-noise bursts for consonants (s, sh, f, t, k, p) at syllable onsets. Double the voice in the chorus (a third above, quieter) and give it a plate-like reverb. It WILL sound like a robot singing: embrace it. The song is data: a syllable table [bar, beat, lengthInBeats, midi, vowel, consonant, text] that drives both the voice and the lit syllables, so picture and sound can never drift. Mix: voice clearly on top; about −16 LUFS.
Learns from: A public AI-made lyric video shared on X (https://x.com/minchoi/status/2104227722377757031): a new visual idea for every lyric line, one accent on black, HUD fragments, forms and stamps, rolling numerals, a closing 'Regenerate' button. Its song, lyrics, colours and imagery are not used; ours is an original song about how this studio was made.
Beats (frames · what):
  - 0–160 · intro (bars 1–2): black; a prompt field fades up with a blinking caret and types 'write a song about you'; the Enter key glyph lights; the voice hums 'five point five' low; HUD fragments flicker on at the edges
  - 160–320 · verse line 1 (bars 3–4), sung: 'One prompt, one link, a blinking line': the prompt field grows huge and the words land in heavy caps across it, the caret blinking at the end of the line
  - 320–480 · verse line 2 (bars 5–6): 'It read the brief, then it read the rules': a brief document (JSON-like lines, drawn, no real content) slides in at an angle; a clay highlight scans down it line by line; small mono ticks 'read' pop in the margin
  - 480–640 · verse line 3 (bars 7–8): 'Every frame a function, no hidden state': a wireframe topography (a grid of lines displaced by a smooth function of x, y and the frame) warps under the words; the label 'f(frame) → pixels' in tracked mono
  - 640–800 · verse line 4 (bars 9–10): 'It drew the whole thing out of code': a line drawing of a small film camera assembles itself stroke by stroke (strokes draw on with dash offsets) while the words set on a gentle curve around it
  - 800–960 · chorus line 1 (bars 11–12), key lifts to C major, drums full: 'Oh, Opus, five point five': huge numerals roll like an odometer from 0.0 to 5.5 and lock on the downbeat with a flash; the words set above in a large serif italic
  - 960–1120 · chorus line 2 (bars 13–14): 'Draw it in code tonight': columns of drawn code lines (abstract bars of varying length, a few readable tokens like 'ctx.arc', 'spring(', 'frame') stream upward; from them one clay curve draws across the frame
  - 1120–1280 · chorus line 3 (bars 15–16): 'Every frame a function': a contact strip of small frames slides sideways under a running frame counter 'FRAME 0001 → 1920'; each frame thumbnail is a tiny version of an earlier scene
  - 1280–1440 · chorus line 4 (bars 17–18): 'Same pixels every time': the ground flips to cream; an official form 'GOLDEN CHECK · FORM 5.5' with checkboxes fills in by hand; a rubber stamp 'SAME' slams on the last beat (clay ink, slightly rotated, with speckled edges)
  - 1440–1600 · bridge (bars 19–20), drums drop to kick only: 'It checked its work' / 'it checked it twice': back to black; two more 'SAME' stamps land one per line on a stack of forms, each with its own thud
  - 1600–1920 · tag (bars 21–24): the voice sings 'five point five' twice (the numerals return small and glowing), then 'made in code' on the last two bars as the music thins to the pad and one pluck; the prompt field returns, empty, caret blinking, with a small 'Regenerate' button that is NOT pressed; the credit fades in beneath in mono: 'a song drawn and sung in code · no samples, no voice model'
Sizes: Vertical re-stacks: every lyric line wraps to two or three lines in the upper half of the safe area, the hero element (field, document, topography, drawing, numerals, code, strip, form) sits below it, the HUD fragments move to the top and bottom margins inside the safe area.
Teaches: A song can be data: one syllable table drives the voice, the lit lyric and the cuts, so a lyric video stays in sync by construction, and a new visual idea per line keeps two minutes of words from feeling long.

