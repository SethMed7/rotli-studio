You are building ONE study for the open-source rotli studio: a piece that shows the studio works for ANY product,
style and size, not only Rotli. Work ONLY in ~/rotli-studio/motion (a Node/npm project; use `node`, not bun; `~` is
your home directory, expand it to an absolute path for file tools). In every shell command use absolute paths or
`cd ~/rotli-studio/motion && …` (the shell's cwd resets between commands).

YOUR STUDY: "Feed Storm" (study 18), brief at `series/studies/briefs/feed-storm.json` (read it first; it is the contract).
Pieces to export from `src/canvas-core/studies/feedStorm.ts`: `feedStorm` (vertical), `feedStormLandscape` (landscape). Primary size: vertical.

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
1. Create/modify ONLY `src/canvas-core/studies/feedStorm.ts` and its hosts `src/hosts/page-<pieceId>.ts` (one per piece, copy
   `src/hosts/page-motionResume.ts`). Do NOT edit the kit, the pack, tools, pieces.json, series.json, goldens or any other
   piece. If you need a helper, define it in your module. Do not register the pieces; the maintainer does.
2. Never import from `rotli/`, `studio/` or `brand/brand.json`: a study must not look or sound like Rotli. No quokka.
3. Follow the brief's story beats and timing (you may retime inside a beat; every shot must start on the beat grid:
   one beat = 60 / bpm × fps frames; `validate()` in film.ts refuses anything else). Frames: 690 at 30 fps.
4. Design EACH size (the brief's "sizes" note); a vertical re-stacks, it never just crops. Keep text inside `layout().safe`.
5. Quality bar: nothing overlaps unintentionally, no text under 22 px (at 1080 short side), flat colour, depth from
   shadow only where the style allows, every hold keeps moving (a slow push-in, drift or ambient motion).
6. Copy is invented for the fictional product; never claim anything about a real company or person.
7. Sound: beatScore drive at 120 bpm with pops for each ping (thinned as they speed up), a whoosh on the sweep, a hit on the decision and the sign-off.

VERIFY BY LOOKING, and iterate until right:
- `node tools/frames.mjs <pieceId> <8–12 frames across the piece> --out /tmp/feed-storm --sheet /tmp/feed-storm.png --cols 6`,
  then READ the PNG (and full frames in /tmp/feed-storm/ where detail matters). Do this for EVERY size.
- videos: `node tools/render.mjs <pieceId> --out /tmp/<pieceId>.mp4`, then `node tools/still-frames.mjs /tmp/<pieceId>.mp4`
  must print an EMPTY `windows:` line.
- loops: also `node tools/loop-seam.mjs /tmp/<pieceId>.mp4` must print SEAMLESS.
- loudness (videos): `ffmpeg -nostats -i /tmp/<pieceId>.mp4 -af ebur128 -f null - 2>&1 | grep " I:"` should be about −16 LUFS.
- `npx tsc --noEmit -p tsconfig.json` must print nothing.
- Do not commit, do not touch ~/rotli, do not run `studio.mjs render all` or golden.

Report back: files created, the final sheet paths, still-frames / loop-seam / loudness results, what you would improve
with more time, and anything you could not make work.

--- THE STUDY (from series/studies/briefs/feed-storm.json) ---
Feed Storm · study 18 · video · 690 frames at 30 fps, 120 bpm · palette "slate"
Style: A notification feed as weather: message bubbles and pings rain in and stack into a scrolling column, faster and faster, with motion blur on the scroll; then one calm hand (a cursor) sorts them: most fold away, three are grouped into one decision card. Clean UI, one alarm colour, one calm colour. Captions are serif word ladders (kit captions.ts): short stacks of mixed sizes, one key word in the accent italic, set beside the action and arriving word by word.
Learns from: Founder explainer reels (Instagram, @gregisenberg's team): complaint bubbles stacking and scrolling, a feed that overwhelms, then gets sorted into a single decision.
Beats (frames · what):
  - 0–60 · hook: a single ping drops in: 'can we move it?'; caption '47 messages'
  - 60–240 · pings rain in and stack ('what time works?', 'I'm out Tue', 'sorry, conflict'), the column scrolling faster with motion blur; a counter climbs to 47
  - 240–390 · everything freezes; a cursor sweeps: 44 bubbles fold away into a thin stack labelled 'handled'
  - 390–540 · the remaining 3 slide together into one card: 'Decide: Thu 15:00 or Fri 10:00?' with two buttons
  - 540–630 · the cursor taps 'Thu 15:00'; the card turns calm; caption 'one decision'
  - 630–690 · sign-off: 'Oriel' with the counter now at 1
Sizes: Landscape runs the feed on the left third and the decision card and captions on the right.
Teaches: Overwhelm is speed plus density; relief is the same objects slowing down and collapsing into one.

