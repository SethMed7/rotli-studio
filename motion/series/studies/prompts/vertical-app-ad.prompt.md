You are building ONE study for the open-source rotli studio: a piece that shows the studio works for ANY product,
style and size, not only Rotli. Work ONLY in ~/rotli-studio/motion (a Node/npm project; use `node`, not bun; `~` is
your home directory, expand it to an absolute path for file tools). In every shell command use absolute paths or
`cd ~/rotli-studio/motion && …` (the shell's cwd resets between commands).

YOUR STUDY: "Vertical App Ad" (study 02), brief at `series/studies/briefs/vertical-app-ad.json` (read it first; it is the contract).
Pieces to export from `src/canvas-core/studies/verticalAppAd.ts`: `verticalAppAd` (vertical), `verticalAppAdLandscape` (landscape). Primary size: vertical.

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
1. Create/modify ONLY `src/canvas-core/studies/verticalAppAd.ts` and its hosts `src/hosts/page-<pieceId>.ts` (one per piece, copy
   `src/hosts/page-motionResume.ts`). Do NOT edit the kit, the pack, tools, pieces.json, series.json, goldens or any other
   piece. If you need a helper, define it in your module. Do not register the pieces; the maintainer does.
2. Never import from `rotli/`, `studio/` or `brand/brand.json`: a study must not look or sound like Rotli. No quokka.
3. Follow the brief's story beats and timing (you may retime inside a beat; every shot must start on the beat grid:
   one beat = 60 / bpm × fps frames; `validate()` in film.ts refuses anything else). Frames: 900 at 30 fps.
4. Design EACH size (the brief's "sizes" note); a vertical re-stacks, it never just crops. Keep text inside `layout().safe`.
5. Quality bar: nothing overlaps unintentionally, no text under 22 px (at 1080 short side), flat colour, depth from
   shadow only where the style allows, every hold keeps moving (a slow push-in, drift or ambient motion).
6. Copy is invented for the fictional product; never claim anything about a real company or person.
7. Sound: beatScore soft at 100 bpm: ticks on every chat bubble and card landing, whooshes into the countdown and the payoff, a hit when the slot appears, the sign-off under the end card.

VERIFY BY LOOKING, and iterate until right:
- `node tools/frames.mjs <pieceId> <8–12 frames across the piece> --out /tmp/vertical-app-ad --sheet /tmp/vertical-app-ad.png --cols 6`,
  then READ the PNG (and full frames in /tmp/vertical-app-ad/ where detail matters). Do this for EVERY size.
- videos: `node tools/render.mjs <pieceId> --out /tmp/<pieceId>.mp4`, then `node tools/still-frames.mjs /tmp/<pieceId>.mp4`
  must print an EMPTY `windows:` line.
- loops: also `node tools/loop-seam.mjs /tmp/<pieceId>.mp4` must print SEAMLESS.
- loudness (videos): `ffmpeg -nostats -i /tmp/<pieceId>.mp4 -af ebur128 -f null - 2>&1 | grep " I:"` should be about −16 LUFS.
- `npx tsc --noEmit -p tsconfig.json` must print nothing.
- Do not commit, do not touch ~/rotli, do not run `studio.mjs render all` or golden.

Report back: files created, the final sheet paths, still-frames / loop-seam / loudness results, what you would improve
with more time, and anything you could not make work.

--- THE STUDY (from series/studies/briefs/vertical-app-ad.json) ---
Vertical App Ad · study 02 · video · 900 frames at 30 fps, 100 bpm · palette "sage"
Style: Floating UI on a soft stone ground: white cards with large soft shadows, a phone mockup, a deep-green countdown stack, concentric rings. Serif captions arrive word by word, mixed sizes, one key word in the accent green italic. No gradients; depth from shadow only.
Learns from: The creator-explainer app ad format (a presenter with floating UI and word-by-word captions). This study keeps the UI set and the caption rhythm and replaces the presenter with the product itself: no people, no real brands.
Beats (frames · what):
  - 0–72 · hook: 'Finding one hour' fills the screen in the serif, 'one hour' in accent italic; small calendar cards orbit on concentric rings
  - 72–216 · problem: a phone shows a group chat stacking up ('Tuesday?', 'Can't. Wed?', 'Thu after 3?' …); a counter ticks up to 12; caption: 'takes twelve messages.'
  - 216–360 · turn: a 3-2-1 stack of deep-green cards counts down and lifts away to reveal Oriel's app icon; a prompt card types 'Find an hour with Ana, Ben and Kai next week.'
  - 360–576 · work: three rows of availability (Mon–Fri) slide in as floating cards; the overlap lights up; a slot card pops: 'Thu 3:00–4:00'. Captions: 'It reads three calendars,' 'finds the overlap,' 'and holds the time.'
  - 576–720 · done: an invite card flies out; three avatars get a check one by one; a toast says 'Everyone's in.'
  - 720–828 · payoff: kinetic serif 'One message.' then 'Not twelve.' in mixed sizes, the second line in the accent
  - 828–900 · end card: the Oriel mark + wordmark, 'oriel.example' and a small line 'A fictional product, drawn in code.'
Sizes: Vertical is primary (captions top third, the UI centre, platform-safe margins). Landscape puts the phone and cards on the left half and the captions on the right.
Teaches: Captions that arrive with the rhythm carry a silent autoplay. UI as the set: cards with shadow read as depth without any 3D.

