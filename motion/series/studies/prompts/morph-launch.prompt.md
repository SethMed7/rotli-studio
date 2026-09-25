You are building ONE study for the open-source rotli studio: a piece that shows the studio works for ANY product,
style and size, not only Rotli. Work ONLY in ~/rotli-studio/motion (a Node/npm project; use `node`, not bun; `~` is
your home directory, expand it to an absolute path for file tools). In every shell command use absolute paths or
`cd ~/rotli-studio/motion && …` (the shell's cwd resets between commands).

YOUR STUDY: "Morph Launch" (study 21), brief at `series/studies/briefs/morph-launch.json` (read it first; it is the contract).
Pieces to export from `src/canvas-core/studies/morphLaunch.ts`: `morphLaunch` (landscape), `morphLaunchVertical` (vertical). Primary size: landscape.

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
1. Create/modify ONLY `src/canvas-core/studies/morphLaunch.ts` and its hosts `src/hosts/page-<pieceId>.ts` (one per piece, copy
   `src/hosts/page-motionResume.ts`). Do NOT edit the kit, the pack, tools, pieces.json, series.json, goldens or any other
   piece. If you need a helper, define it in your module. Do not register the pieces; the maintainer does.
2. Never import from `rotli/`, `studio/` or `brand/brand.json`: a study must not look or sound like Rotli. No quokka.
3. Follow the brief's story beats and timing (you may retime inside a beat; every shot must start on the beat grid:
   one beat = 60 / bpm × fps frames; `validate()` in film.ts refuses anything else). Frames: 1440 at 60 fps.
4. Design EACH size (the brief's "sizes" note); a vertical re-stacks, it never just crops. Keep text inside `layout().safe`.
5. Quality bar: nothing overlaps unintentionally, no text under 22 px (at 1080 short side), flat colour, depth from
   shadow only where the style allows, every hold keeps moving (a slow push-in, drift or ambient motion).
6. Copy is invented for the fictional product; never claim anything about a real company or person.
7. Sound: beatScore soft at 120 bpm with a key-tick for each typed letter (quiet, humanised), a soft whoosh on every morph, a click on each toggle and on the pressed buttons, a gentle chime per notification card, a warm hit on the end card.

VERIFY BY LOOKING, and iterate until right:
- `node tools/frames.mjs <pieceId> <8–12 frames across the piece> --out /tmp/morph-launch --sheet /tmp/morph-launch.png --cols 6`,
  then READ the PNG (and full frames in /tmp/morph-launch/ where detail matters). Do this for EVERY size.
- videos: `node tools/render.mjs <pieceId> --out /tmp/<pieceId>.mp4`, then `node tools/still-frames.mjs /tmp/<pieceId>.mp4`
  must print an EMPTY `windows:` line.
- loops: also `node tools/loop-seam.mjs /tmp/<pieceId>.mp4` must print SEAMLESS.
- loudness (videos): `ffmpeg -nostats -i /tmp/<pieceId>.mp4 -af ebur128 -f null - 2>&1 | grep " I:"` should be about −16 LUFS.
- `npx tsc --noEmit -p tsconfig.json` must print nothing.
- Do not commit, do not touch ~/rotli, do not run `studio.mjs render all` or golden.

Report back: files created, the final sheet paths, still-frames / loop-seam / loudness results, what you would improve
with more time, and anything you could not make work.

--- THE STUDY (from series/studies/briefs/morph-launch.json) ---
Morph Launch · study 21 · video · 1440 frames at 60 fps, 120 bpm · palette "sunset"
Style: A product launch in one continuous take: nothing cuts, everything MORPHS into the next thing. A soft mesh gradient (four large blurred colour blobs drifting slowly, built from the palette's accent, accent2, deep and ground) sits behind light type. Type is one centred line of Inter 400 in white, words arriving with a blur-to-sharp fade and a small scale settle, the old words blurring out as new ones take their place (a word can stay while its neighbours change). Then the chain: the caption line becomes a frosted glass prompt field; the field squeezes to a pill, the pill to a dot; the dot drops onto a white page and becomes the product mark, the name types in beside it; a dark pill wraps mark and name like a button, and the button grows into a dark app window. Inside the window a camera with depth of field reads the UI: whatever is not in focus is blurred, focus racks from field to field as they fill in, toggles flip on one by one on the beat, connection rows turn 'connected'. An app tile pops out of the window in 3D (perspective tilt, soft shadow, slow spin), grows, and unfolds into a white calendar panel that flies in at an angle and settles flat. Results arrive as notification cards stacking over the gradient on springs, the oldest scrolling up under a blurred edge. The end card puts a small glass pill holding the mark between two words. Motion is smooth, 60 fps, everything eased with springs; depth comes from blur and soft shadow, never outlines. Blur without ctx.filter: draw into a small offscreen canvas and scale it back up (see the blur helper in core.ts).
Learns from: Product launch reels made with AI video agents (a public X post of an agent-made launch film for a lead-finding agent): one-take morph chains, glass prompt fields, depth-of-field UI reading, a 3D app tile, stacked notifications. Its colours, product and copy are not used.
Beats (frames · what):
  - 0–180 · hook: mesh gradient drifting; a huge 'find' blurs in letter by letter, then shrinks into one small centred line 'find a free hour'; its words blur out to 'with one sentence', then 'using Oriel' with the mark after the name
  - 180–360 · the caption line swells into a frosted glass prompt field; a sentence types in ('Oriel, find an hour for Ana, Ben and Kai next week'); the round send button pulses and is pressed
  - 360–540 · the one-take morph chain: field squeezes to a pill, pill to a dot; the dot drops onto a white page and becomes the mark; 'Scheduler' types in beside it; a dark pill wraps mark and word like a button, and the button grows to fill the frame as a dark app window
  - 540–900 · inside the window, depth of field: focus racks down the form as Name and Instructions fill in; four capability tiles (Read calendars, Hold rooms, Draft agendas, Send invites) flip their toggles on, one per beat; two connection rows (Calendar, Chat) turn to an accent 'connected'; the 'Start' button is pressed
  - 900–1080 · a calendar app tile pops out of the window in 3D (tilted, shadowed, slowly turning), fills the centre, then unfolds into a white week panel that flies in at an angle and settles flat with Thursday 3:00 glowing free
  - 1080–1290 · back on the gradient: notification cards stack in on springs ('Found · Thu 3:00 · 4 of 4 free', 'Room 4B held', 'Agenda drafted', 'Invites sent'); the oldest scroll up under a blurred edge
  - 1290–1440 · end card: 'find a free hour' with an empty glass pill between the words that fills with the mark; the words blur to 'using Oriel' around the same pill; a slow drift holds
Sizes: Vertical re-stacks: the caption line wraps to two lines, the prompt field and app window are phone-width and taller, the capability tiles become one column, the notification stack is taller.
Teaches: A one-take morph chain keeps attention without cuts: each shape becomes the next, so the eye never has to find its place again; depth of field tells the viewer where to read.

