You are building ONE study for the open-source rotli studio: a piece that shows the studio works for ANY product,
style and size, not only Rotli. Work ONLY in ~/rotli-studio/motion (a Node/npm project; use `node`, not bun; `~` is
your home directory, expand it to an absolute path for file tools). In every shell command use absolute paths or
`cd ~/rotli-studio/motion && …` (the shell's cwd resets between commands).

YOUR STUDY: "Card Wall" (study 22), brief at `series/studies/briefs/card-wall.json` (read it first; it is the contract).
Pieces to export from `src/canvas-core/studies/cardWall.ts`: `cardWall` (landscape), `cardWallVertical` (vertical). Primary size: landscape.

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
1. Create/modify ONLY `src/canvas-core/studies/cardWall.ts` and its hosts `src/hosts/page-<pieceId>.ts` (one per piece, copy
   `src/hosts/page-motionResume.ts`). Do NOT edit the kit, the pack, tools, pieces.json, series.json, goldens or any other
   piece. If you need a helper, define it in your module. Do not register the pieces; the maintainer does.
2. Never import from `rotli/`, `studio/` or `brand/brand.json`: a study must not look or sound like Rotli. No quokka.
3. Follow the brief's story beats and timing (you may retime inside a beat; every shot must start on the beat grid:
   one beat = 60 / bpm × fps frames; `validate()` in film.ts refuses anything else). Frames: 900 at 30 fps.
4. Design EACH size (the brief's "sizes" note); a vertical re-stacks, it never just crops. Keep text inside `layout().safe`.
5. Quality bar: nothing overlaps unintentionally, no text under 22 px (at 1080 short side), flat colour, depth from
   shadow only where the style allows, every hold keeps moving (a slow push-in, drift or ambient motion).
6. Copy is invented for the fictional product; never claim anything about a real company or person.
7. Sound: beatScore drive at 120 bpm with the drums entering at the coverflow (drop at frame 180; pad and pluck only before it), a whoosh into the coverflow and into each word slam, a hit on each slam and on 'Done.', a soft tick on every coverflow step, check and feature tile, and the sign-off at the end card.

VERIFY BY LOOKING, and iterate until right:
- `node tools/frames.mjs <pieceId> <8–12 frames across the piece> --out /tmp/card-wall --sheet /tmp/card-wall.png --cols 6`,
  then READ the PNG (and full frames in /tmp/card-wall/ where detail matters). Do this for EVERY size.
- videos: `node tools/render.mjs <pieceId> --out /tmp/<pieceId>.mp4`, then `node tools/still-frames.mjs /tmp/<pieceId>.mp4`
  must print an EMPTY `windows:` line.
- loops: also `node tools/loop-seam.mjs /tmp/<pieceId>.mp4` must print SEAMLESS.
- loudness (videos): `ffmpeg -nostats -i /tmp/<pieceId>.mp4 -af ebur128 -f null - 2>&1 | grep " I:"` should be about −16 LUFS.
- `npx tsc --noEmit -p tsconfig.json` must print nothing.
- Do not commit, do not touch ~/rotli, do not run `studio.mjs render all` or golden.

Report back: files created, the final sheet paths, still-frames / loop-seam / loudness results, what you would improve
with more time, and anything you could not make work.

--- THE STUDY (from series/studies/briefs/card-wall.json) ---
Card Wall · study 22 · video · 900 frames at 30 fps, 120 bpm · palette "deep"
Style: A consumer launch film built from ONE object: a tall rounded card (a meeting template: a flat code-drawn illustration on top, a small tag chip in the top-left corner, a title strip at the bottom) repeated into a whole world. The ground is a slow aurora: three or four huge soft colour fields (the palette's accent2, accent at low alpha, surface and ground) drifting and breathing, with a faint field of tiny star specks that twinkle. Headlines are big, tight Inter 600 with ONE word per line set in Instrument Serif Italic in the accent, gradient-free. The vocabulary: (1) a mark that assembles itself from orbiting dots inside two thin concentric rings, then the name tracks out letter-spaced beside it; (2) a 3D coverflow of cards (perspective by scaling and skewing each card toward the edges, the centre card lifted, larger and tagged), sliding one card per beat; (3) a connected step row, Pick → Add → Done, where a curved line with a travelling dot links three cards and a spark burst marks the last; (4) word slams, one word scaling down from huge to size over a cloud of tilted cards scattered in depth (far cards smaller and blurred); (5) a depth-of-field pull, where the whole wall goes heavily blurred and one card racks into focus beside a two-line headline; (6) a row of four glassy feature tiles (a rounded icon square in the accent, a bold line, a small muted line) filling in one per beat; (7) an end card where the mark and the headline return over the card wall faded to 25 %, with a pill call to action. The cards' illustrations are simple flat scenes drawn in code (a coffee cup with steam, a sun over a desk, a clock face, two chat bubbles, a whiteboard, a plane over clouds, a candle and a cake, a stack of books), each in two or three pack colours, never photos or faces. Blur without ctx.filter: draw into a small offscreen canvas and scale it back up. Springs on every arrival; nothing sits still.
Learns from: A public launch film Opus 5.5 made from one prompt and one link (https://x.com/samongaro_/status/2104511685029507390): one card object repeated into a coverflow, a connected three-step row, word slams over a scattered card cloud, a depth-of-field pull, feature tiles filling on the beat, an aurora ground. Its colours, product, photos and copy are not used.
Beats (frames · what):
  - 0–90 · the mark: two thin rings breathe on the aurora; three dots orbit inside and gather into the Oriel mark; the rings dissolve outward; 'ORIEL' tracks out letter-spaced beside it
  - 90–180 · the headline: mark and name rise to the top; 'Book what's *easy*.' lands word by word (the italic word in the accent); small chips float around it on springs ('Popular', 'New', 'Tonight'); the sub-line 'Pick a template. Add your people. Done in seconds.'
  - 180–330 · the coverflow: seven cards slide in from the right as a 3D coverflow and step one card per beat; the headline above counts '+40 templates', then changes to 'More every *week*.'; the centre card's tag reads 'Popular' or 'New'
  - 330–480 · Pick → Add → Done: 'Pick' over a template card that a pointer taps (a check pops on its corner); a curved line draws to 'Add' and a card of three stacked avatar circles ('3 people added'); the line draws on to 'Done.' in the accent and a result card (the week grid with one slot lit) with a spark burst; labels under each: 'a template', 'your people', 'in seconds'
  - 480–600 · word slams over the card cloud: tilted cards scatter in depth and drift; 'No back-and-forth.' slams in huge and settles; the cloud swirls and 'Just *ask*.' slams in the same way
  - 600–720 · the depth-of-field pull: the whole wall blurs heavily; one card racks into sharp focus on the right, tilting gently; the headline on the left builds 'That meeting,' then 'with *everyone* in it.'
  - 720–810 · four feature tiles fill in one per beat under 'Yours, and only *yours*.': 'Private by default · Your calendar stays yours', 'Only you see it · No shared feed', 'Nothing to install · Works in the browser', 'Cancel anytime · Keep what you booked'; a line under them: 'Free to start. Pay only when your team grows.'
  - 810–900 · end card: the card wall drifts faded behind; the mark and 'ORIEL' return, 'Book what's *easy*.' and a pill 'Start free at oriel.example'; a slow push-in holds
Sizes: Vertical re-stacks: the headline wraps to two or three lines near the top of the safe area, the coverflow shows three cards (the centre one larger), Pick → Add → Done becomes a vertical column with the curved line running down between the cards, the depth-of-field pull puts the headline above the focused card, the four feature tiles become a 2×2 grid, the end card's pill sits above the bottom safe margin.
Teaches: One object, repeated, becomes a whole visual world: when every scene is made of the same card (a coverflow, a step, a cloud, a focused hero), the film feels designed even with no footage. Depth of field decides what to read.

