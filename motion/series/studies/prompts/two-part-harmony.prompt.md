You are building ONE study for the open-source rotli studio: a piece that shows the studio works for ANY product,
style and size, not only Rotli. Work ONLY in ~/rotli-studio/motion (a Node/npm project; use `node`, not bun; `~` is
your home directory, expand it to an absolute path for file tools). In every shell command use absolute paths or
`cd ~/rotli-studio/motion && …` (the shell's cwd resets between commands).

YOUR STUDY: "Two-Part Harmony" (study 54), brief at `series/studies/briefs/two-part-harmony.json` (read it first; it is the contract).
Pieces to export from `src/canvas-core/studies/twoPartHarmony.ts`: `twoPartHarmony` (landscape), `twoPartHarmonyVertical` (vertical). Primary size: landscape.

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
1. Create/modify ONLY `src/canvas-core/studies/twoPartHarmony.ts` and its hosts `src/hosts/page-<pieceId>.ts` (one per piece, copy
   `src/hosts/page-motionResume.ts`). Do NOT edit the kit, the pack, tools, pieces.json, series.json, goldens or any other
   piece. If you need a helper, define it in your module. Do not register the pieces; the maintainer does.
2. Never import from `rotli/`, `studio/` or `brand/brand.json`: a study must not look or sound like Rotli. No quokka.
3. Follow the brief's story beats and timing (you may retime inside a beat; every shot must start on the beat grid:
   one beat = 60 / bpm × fps frames; `validate()` in film.ts refuses anything else). Frames: 3600 at 30 fps.
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
7. Sound: NOT beatScore: this piece writes its own audio(sr) (a 120 bpm pop band plus two formant-synthesized voices driven by one syllable table with a singer column). Cuts sit on bar lines (every 60 frames); the thud of each prop, the checks, the chant slams, the advisor call, the envelope, the seal, the bulb, the fact slams, the key change and the high five land on exact beat frames. About -16 LUFS integrated.

VERIFY BY LOOKING, and iterate until right:
- `node tools/frames.mjs <pieceId> <8–12 frames across the piece> --out /tmp/two-part-harmony --sheet /tmp/two-part-harmony.png --cols 6`,
  then READ the PNG (and full frames in /tmp/two-part-harmony/ where detail matters). Do this for EVERY size.
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

--- THE STUDY (from series/studies/briefs/two-part-harmony.json) ---
Two-Part Harmony · study 54 · video · 3600 frames at 30 fps, 120 bpm · palette "ivory"
Style: A two-minute music video for an original duet that teaches how Claude Opus 5.5 and Claude Sonnet 5.5 work together. Two pixel critters, drawn from scratch as a 14 x 8 grid in code after the Claude Code mascot, are the band: Opus wears glasses and sings the low part, Sonnet wears blue headphones and sings the high part; they sing together (Sonnet on the tune, Opus a tenth below) in the choruses. Warm ivory ground, ink, and three accents that mean something: clay is Opus, blue is Sonnet, green is both, so the karaoke lyric teaches who sings what (the sung syllable pops and underlines as it is sung, exact to its frame, and a line keeps its singer's colour). The critters dance on the beat (squash on every landing, alternating legs, arm poses, jumps, spins), open their mouths on every sung syllable (from the same table the voices read), and every two bars a new prop acts out the line: a crate stamped THE HARDEST PROBLEM, a long road to a tangle, a balance, a plan written line by line, a spec card, four checks going green, 30% on an odometer beside a trailing ghost of Sonnet 5, a coin stack shedding tokens. Choruses go dark and loud: a sunburst in the singer's colour, then a concert (LED bars, sweeping spotlights, a bobbing crowd), then every colour a whole step up; PLAN / BUILD / CHECK / SHIP cards slam on the chant. The advisor verse is the lesson: Sonnet at a laptop presses an advisor button, a dotted beam reaches Opus on a cloud, the whole thread scrolls past Opus, a sealed envelope (a lock on its clay seal) rides the beam back, and a code window shows advisor_redacted_result with scrambling encrypted_content while Sonnet opens it and a bulb lights. The bridge is four slammed fact cards (1M tokens, Sonnet's effort dial, the two price tags with a HALF stamp, a token bar at executor rates). A mono fact strip under the stage states each claim with its hedge; a quiet mono HUD names the section, bar and beat. Flat surfaces, a contact shadow under each critter, a slow push-in per section and a kick of zoom on chorus downbeats. THE SOUND IS PART OF THE PIECE: the module's audio(sr) is pure and seeded, a 120 bpm pop band in G (A for the last chorus) and two formant voices (Study 25's engine with a second timbre) driven by one syllable table [bar, beat, length, midi, vowel, consonants, text, singer], so picture and sound cannot drift.
Learns from: Two posts from 28 Sep 2026: Anthropic's 'Building with Claude Sonnet 5.5' by Addy Osmani (https://claude.dev/blog/building-with-claude-sonnet-5-5/), the source of the model facts; and a music video by @LLMJunky on X (https://x.com/LLMJunky/status/2104659862663618566), a Claude Code mascot parody of a famous music video that its maker says Opus 5.5 storyboarded and Sonnet 5.5 animated, timed to a measured beat grid. From it we take only the idea: the mascot as a band, choreography locked to the beat, a video about the two models made by the two models. Its song, choreography, scenes, jokes and the 'Clawd Animation Base' it was built on are not used; our song and moves are original. The critters are drawn from scratch in code; the character they are based on is Anthropic's (NOTICE), not MIT.
Beats (frames · what):
  - 0–240 · intro (bars 1-4): '5.5' slams in ink on frame 0 with a crash; Opus drops in on beat 2 (a thud), Sonnet on beat 3 (a boing); name tags pop; the title 'Two-Part Harmony' letters in on 16ths; bar 4 the ground flashes ink, blue, green, ink (never clay, where Opus would vanish) under huge numerals as Sonnet counts 'One, two, three, four!'
  - 240–720 · verse 1, Opus sings (bars 5-12): 'Hand me the hardest problem, / the long road, the tangled kind, / I think it through with judgment, / I plan it all, line by line.' A crate THE HARDEST PROBLEM drops on the downbeat; a road draws to a tangle at the horizon; a balance tips each beat and settles; a plan sheet writes eight lines, one per beat, with a pencil
  - 720–1200 · verse 2, Sonnet sings (bars 13-20): 'Hand me a clear spec, / and a way to check it's right, / thirty percent faster than my last, / fewer tokens, feather light!' A spec card flies in and is caught; four checks turn green on four beats; 30% rolls up and locks beside a ghost of Sonnet 5; a coin stack sheds tokens on 8ths as a feather falls
  - 1200–1680 · chorus 1 (bars 21-28), dark sunburst: 'One to make the plan, (Opus) / one to make it go! (Sonnet) / Plan it! Build it! Check it! Ship it! / Opus and Sonnet, oh oh oh!' PLAN / BUILD / CHECK / SHIP cards slam on the half bars, both jump on the last 'oh!' with confetti
  - 1680–2160 · the advisor (bars 29-36): Sonnet 'When I need a plan, I make the call.' (presses advisor; a dotted beam reaches Opus on a cloud) / Opus 'I read the whole thread, I read it all.' (the thread scrolls past) / Opus 'My advice comes back sealed up tight.' (a sealed envelope rides the beam down; label advisor_redacted_result) / Sonnet 'Your code can't read it, I can, alright!' (a code window scrambles encrypted_content; Sonnet opens the envelope, a bulb lights)
  - 2160–2640 · chorus 2 (bars 37-44): the same words as a concert: LED bars, sweeping spotlights, a crowd of little silhouettes bobbing in front
  - 2640–2880 · bridge (bars 45-48), half time, one card a bar: Sonnet 'A million tokens,' (1M) / Sonnet 'effort, low to max,' (a blue dial steps low to max; the source states these levels for Sonnet 5.5) / Sonnet 'half the price per token,' ($2/$10 vs $4/$20, a HALF stamp) / Opus 'most tokens at Sonnet's rates!' (a token bar, mostly blue, labelled illustrative); a snare roll and riser into
  - 2880–3360 · chorus 3 (bars 49-56): up a whole step with a flash; the critters swap sides, rays cycle every colour, confetti rains, the chant cards drop in from above (chorus 2 flips them, chorus 1 slams them)
  - 3360–3600 · outro (bars 57-60): both sing 'Five point five, five point five!' as a smaller '5.5' returns above them; they walk in a step per 'five' with a zoom kick on each, meet for a high five on 3480 (a clap, a flash, confetti); the end card: 'Opus 5.5 advises. Sonnet 5.5 executes.' hedged beneath: 'with the advisor tool, Opus 5.5 can advise a Sonnet 5.5 executor · sung and drawn in code · fan-made, not affiliated with Anthropic · facts: claude.dev/blog · platform.claude.com/docs'
Sizes: Landscape (primary): lyric band across the top, the stage below; in the verses the soloist stands large on one side and the props act beside them (the back-up singer small on the far side), the choruses centre both with the props above their heads. Vertical re-stacks: the lyric wraps to two or three rows in the upper third, the props stack above the critters in the middle, the critters stand on a floor at about 1400 px (about 1520 px on the choruses' deeper stage, where the fact strip is left out), the fact strip wraps to two lines above the 320 px bottom margin; the chant cards become a 2 x 2 grid; the advisor puts Opus's cloud upper left and Sonnet's desk lower right with the thread and the code window between them.
Teaches: A song can teach: give each idea a singer, a colour and a prop, keep one syllable table as the only source of words, pitches, mouths and cuts, and two models' division of labour becomes something you can hum.

