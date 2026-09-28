# The harness is the studio: a field study of making motion with Opus 5.5

> Four agent-made films and two write-ups from the week Opus 5.5 shipped, read frame by frame and measured; six experiments that answer them with this studio's own engine, including a scored critique of our own agents' work; what held, what broke, and every number behind it.

*Field note 01 · 2026-09-28 · rotli studio. Everything here can be re-run from this repository; the commands are at the end.*

## Why this study

In the week after Anthropic shipped Claude Opus 5.5 (2026-09-22), the timeline filled with motion pieces rendered
from code: launch films, explainers, music videos. Their captions said "one prompt". A course that collected them
([0xMovez, *How to build motion design studio with Opus 5.5*](https://x.com/0xMovez/status/2104216919033192746))
put the counter-claim in one line: *the prompt is 10% of the video, the other 90% is the harness.*

This studio is a harness. It was built for Rotli's films and later opened up with studies for a fictional product,
so it is a fair place to test that claim. We asked three questions:

1. **What are the viral pieces actually made of?** Not their captions: their pacing, cuts, holds, loudness and
   type, measured from the files.
2. **Can the studio's own pipeline reproduce the ideas, not the pixels, of each one**, as a new study that
   passes every gate this repository has?
3. **Where is the harness still thin?** What did the agents need that the studio did not give them?

It is also meant to be useful on its own: if you are building motion with a model, the method, the numbers and the
failure notes below are the parts we wish we had read first.

## The short answer

Yes: the harness is most of it, and it is measurable. All four reference ideas became passing studies from a brief
of a few thousand characters, with no footage, no voice model and no samples, and a fifth experiment turned one
melody into a six-track playlist mastered to within 0.04 LU. But **none of the four studies was good enough on the
first pass**: every building agent passed every gate it could run on itself, and every one still left behind two to
four problems that only a separate, scored critique found, most often an empty first two seconds, text too small to
read on a phone, and long stretches where nothing lands. One round of critique fixed them. The cheapest improvement
this studio can make is not a better prompt; it is a second reader with a rubric.

## Method

### The harness, in one paragraph

Every piece here is a module that exports a `Film`: metadata, shots, and one pure function,
`renderFrame(film, ctx, frame, env)` (`motion/src/canvas-core/film.ts`), which paints any frame on its own from
data. A second pure function, `audio(sampleRate)`, returns the whole soundtrack as samples. A headless Chromium
(Playwright) calls the frame function once per frame and ffmpeg stitches the frames and the samples into a video.
Nothing depends on a clock, so the same source gives the same pixels on this Mac every time, and a **golden**
(sampled frame hashes plus the audio hash, `motion/golden/<id>.json`) proves it.

### How a study is made

1. **A brief** (`motion/series/studies/briefs/<id>.json`) is the contract: frames, fps, bpm, palette, a style
   paragraph, story beats with frame ranges, a per-size note, the sound, and what the study teaches. It also says
   what it learns from, credited by link, and what it does not take.
2. **A prompt** is generated from the brief, never hand-written:
   `node tools/study-prompt.mjs <brief>` = the shared rules (`motion/workflows/study-preamble.md`) + the brief.
   The generator refuses a tempo whose beat is not a whole number of frames.
3. **An agent** (Claude Code on Opus 5.5, one agent per study, run in the background, in parallel) builds the
   module and its hosts, and nothing else. It may not touch the kit, the pack, the catalogue or another piece.
4. **Critique by looking.** The agent renders contact sheets (`tools/frames.mjs … --sheet`) and reads them as
   images, for every size, and iterates. Then it renders the video and runs `tools/still-frames.mjs` (no half-second
   window of dead air) and an EBU R128 loudness measurement (target about −16 LUFS).
5. **A scored critique** (new in this study, E6): a separate session makes review sheets from the rendered video
   (`tools/critique.mjs`), scores seven criteria from 1 to 10 (`workflows/critique.md`), and sends the problems back to
   the same agent until every score is 8 or more. Each round is recorded in `series/studies/critiques/`.
6. **Registration and gates** are done by the maintainer, serially: `pieces.json`, `series.json`, the manifest,
   `golden <id> --record`, then `golden all` (every other piece must still print SAME) and `bun run verify`.

### How we read the references

Each reference was downloaded once to a temporary folder (never committed: references are credited by link, never
copied). For each we made a contact sheet of evenly spaced frames and measured, with ffmpeg and a short Python
script:

- **duration, frame rate and size** (ffprobe);
- **integrated loudness** (ffmpeg `ebur128`, LUFS);
- **hard cuts**: frames where ffmpeg's scene score passes 0.32;
- **big-change events**: peaks in the mean absolute difference between consecutive frames (96 × 54 greyscale at
  30 fps) above 18 grey levels, merged when closer than 6 frames. This catches wipes, flips and slams that are not
  hard cuts;
- **near-still frames**: the share of frames whose mean difference from the previous frame is under 0.4 grey levels;
- **tempo**: the autocorrelation of an onset envelope from the soundtrack (a rough estimate; it can land on half or
  double time).

## What the references are made of

| | [Launch film](https://x.com/samongaro_/status/2104511685029507390) | [Halftone product film](https://x.com/achxvi/status/2103918792845963545) | [Style-per-section explainer](https://x.com/achxvi/status/2104294892944097513) | [Lyric video](https://x.com/minchoi/status/2104227722377757031) |
|---|---|---|---|---|
| Length | 30.2 s | 15.1 s | 38.5 s | 156.7 s |
| Frame rate, size | 30 fps, 1920 × 1080 | 60 fps, 1920 × 1080 | 60 fps, 1920 × 1080 | 60 fps, 1280 × 720 |
| Loudness | −11.4 LUFS | −14.3 LUFS | −14.2 LUFS | −15.5 LUFS |
| Hard cuts | 5 | 2 | 0 | 60 |
| Big-change events per 10 s | 5.0 | 4.7 | 2.3 | 7.1 |
| Near-still frames | 13 % | 17 % | 37 % | 16 % |
| Tempo (estimate) | 120 bpm (measured 60, half time) | about 144 bpm | n/a | about 66 bpm (or 132) |

**What the numbers say.**

- **Cuts are rare; changes are not.** The three product films change what is on screen every two to four seconds
  but almost never with a hard cut: they wipe, flip, slam, morph or rack focus. Only the lyric video cuts hard, and it
  does so on the lyric (60 cuts in 157 s, one every 2.6 s on average).
- **Holds are part of the design.** The style-per-section explainer spends 37 % of its frames almost still: a line
  lands, then the frame rests while you read it. Our own gate (`still-frames.mjs`) would reject that film: it allows no
  half-second window where under 0.5 % of the frame changes. That is a deliberate difference, not an oversight
  (see *Findings*).
- **They are loud.** All four sit between −11.4 and −15.5 LUFS; the launch film is almost 5 LU louder than the
  studio's −16 target. Social feeds normalise loudness down, so being louder than about −14 buys nothing on most
  platforms and costs dynamics.

### 1 · The launch film: one object, repeated

A consumer launch film for a photo app. Its world is built from **one object**, a rounded portrait card, used six
ways: a coverflow ("+65 trends"), a three-step row ("Pick · Add · Done") joined by a curved line with a travelling
dot, a cloud of tilted cards behind word slams ("No prompts.", "Just you."), a depth-of-field pull where the whole
wall blurs and one card comes into focus beside a two-line headline, a row of four glassy feature tiles filling on
the beat, and an end card over the faded wall. Type: a heavy sans with one word per headline in an italic, gradient
accent. Ground: a purple-magenta aurora with star specks.

**Why it works.** Because every scene is the same card, the film feels designed even though almost nothing in it is
"footage". **What we did not take:** its colours, its product, its photographs of real people, its copy.

### 2 · The halftone product film: a texture as a brand

A 15-second film for a payments product, hosted by a 3D-looking mascot that is rendered through a **dot screen**, so
it reads like a newspaper photo of a toy. Around it, everything is flat and crisp: white pages, ink type, one
electric blue for a full-bleed scene flip and a handwritten key word, and editorial chrome in a mono face (a
`// 01 · hook` section label, a running timecode). Scenes: a hook with a "psst…" bubble, product cards holding
halftone objects, a phone mockup building, a one-second word smeared by motion blur on black, a bento of live
widgets stamped "Handled.", and a wordmark end card with the mascot peeking over it.

**Why it works.** One texture (the dot screen) carries a cheap 3D look into print; the timecode makes a short
piece read as *edited*. The course reports that its maker voiced the character through a voice API and now sells
the format as a service. **What we did not take:** the character, the blue, the product, the copy, the voice.

### 3 · The style-per-section explainer: one character, many surfaces

The same maker's next film, for a ticketing product: 38.5 seconds, zero hard cuts. Every section **flips to its own
full-bleed colour** (peach, black, periwinkle, yellow, mint, sky, lilac, black, cream), and a round **badge in the
bottom-left corner** holds the mascot's head on every scene. Key words sit on a **highlighter box**, a solid
rectangle behind the word. Content cards look like stickers (thick outlines, hard offset shadows) and hold bars that
fill, fee lists, phone screens and a bank balance. Coins and tokens tumble at the edges.

**Why it works.** The colour flips mark chapters without cuts, and the badge keeps the host present in every scene
at almost no cost. **What we did not take:** the fox, the colours, the product, the copy.

### 4 · The lyric video: a new idea per line

A 2.5-minute music video for an existing song about AI risk, *I'm Upping My P(doom)*. Its public repository,
[JohnHeibel/PDoomVideo](https://github.com/JohnHeibel/PDoomVideo), says everything in it was generated by Opus 5.5 in
Claude Code over two generations, and that no scene ideas were specified; the song itself predates the video. Black
ground, one orange
accent, and **a different visual idea for every lyric line**: a typing prompt field, wireframe topographies, a
Chinese-room box, a shoggoth, an official form with a stamp ("SAFE ENOUGH"), huge rolling numerals ("P(doom) 0.8 →
1.00 → ∞"), and a final "Regenerate" button. HUD fragments in mono sit at the edges. The only reference here that
cuts hard, and it cuts on the words.

**Why it works.** Two and a half minutes of words stay watchable because the picture never repeats an idea.
**What we did not take:** the song, the lyrics, the imagery, the palette.

### 5 · The pipeline write-up: stills first, score everything

[Raphael Aubry's write-up](https://x.com/RaphaelAubryy/status/2104502744010629269) of ten-plus videos made in three
days, packaged as an open Claude Code skill ([howseen-ai/claude-motion-design](https://github.com/howseen-ai/claude-motion-design)),
reaches the same "10 % prompt, 90 % harness" line and adds four habits this studio did not have in writing:

- **Four stills before any full render.** A blurry send animation, found on a still, cost him 2 minutes; found on a
  full render, 10. (Our contact sheets do the same job.)
- **Motion blur by subframes**, eight per output frame averaged by ffmpeg: four leave visible ghost copies on fast
  moves. (Our `kit/blur.ts` samples inside the shutter; E6 found exactly this ghosting in two of our studies.)
- **Sound on measured peaks**, not file starts; find the drop by bass energy in 20 ms windows rather than trusting a
  beat detector; loudness-normalise to −14 LUFS "because that's what X and LinkedIn normalize to".
- **A scored critique:** a contact sheet at 2 frames per second, a strip of 12 frames around each fast move, a
  phone-size sheet at 360 px; score hook, readability at phone size, motion, variety, composition, data accuracy and
  sound sync from 1 to 10; list the three worst problems with timestamps; fix; repeat until every score is 8+.

He is also explicit about honesty: *real data or a label* ("Example data"), *real integrations only*, and his own
launch video took five versions, not one prompt. We took the critique whole (E6).

### 6 · The course: the harness in twelve steps

The course's twelve steps map almost one to one onto files that already exist here. Where they differ is where this
study is useful.

| Course step | This studio | Where |
|---|---|---|
| 01 · the model writes a program, not a video; `seek(t)` | `renderFrame(film, ctx, frame, env)`, a pure function of the frame | `motion/src/canvas-core/film.ts` |
| 02 · Claude Code, a house-rules file, effort | `AGENTS.md` (read through `CLAUDE.md`), the `motion-room` skill | repository root, `.claude/skills/` |
| 03 · the one-liner showreel | Study 01, Motion Résumé, learned from the same prompt | `series/studies/briefs/motion-resume.json` |
| 04 · point it at your product | Rotli's own pieces read its brand pack; `repurpose-brand` for others | `motion/brand/`, `docs/use-it-for-your-product.md` |
| 05 · reference: name a look, feed a frame | every study's `learnsFrom`, credited by link; contact sheets of the reference | the briefs |
| 06 · spec: the state list, not the vibe | the brief's `story` beats with frame ranges | the briefs |
| 07 · engine | Playwright + ffmpeg, frame by frame | `motion/tools/render.mjs` |
| 08 · closed-form springs; `track()` for many targets | `spring()` and `track()`, closed form | `motion/src/canvas-core/kit/motion.ts` |
| 09 · sound on the beat | `beatScore` (cues on exact frames); the studio's own synth | `kit/score.ts`, `sound/` |
| 10 · the director's brief, workflow gates | brief → generated prompt → agent → gates | `motion/workflows/` |
| 11 · critique: make it watch its own frames | contact sheets read by the agent; `still-frames`, `loop-seam`, loudness; goldens | `motion/tools/` |
| 12 · every format from one timeline; a skill | `layout(size)`: one source, each size designed; skills | `kit/sizes.ts`, `.claude/skills/` |

Three places where this studio goes further than the course:

- **Goldens.** The course relies on determinism; the studio *proves* it. `golden all` re-renders sampled frames and
  the audio of all pieces and compares their hashes, so a change to a shared file cannot silently move a finished
  piece.
- **Dead air is a gate, not a taste.** `still-frames.mjs` fails the render.
- **Sound never leaves the code.** The course's examples add voices through an API; here there are no samples and
  no AI audio model, anywhere (`sound/catalog.json` says so, and the recipes prove it).

And one place where it is thinner: **the critique loop is not scored.** The course asks the model to score its
stills and fix the three worst problems until every score is 8 or more. Here the agent looks and iterates, but
nothing records what it saw or why it changed something. See *Next*.

## The experiments

Each reference became one new study, built by one agent from one generated prompt, in parallel; a fifth experiment
answers the sound side. The agents ran on Opus 5.5 in Claude Code.

### E1 · Card Wall (study 22), from the launch film

- **Hypothesis.** A film built from one repeated object holds up without photographs: a code-drawn card with a
  flat illustration can carry a coverflow, a step row, a word-slam cloud and a focus pull.
- **Setup.** Brief `card-wall.json`: 900 frames at 30 fps, 120 bpm, the `deep` palette, landscape and vertical.
- **Build.** One agent, 29.1 minutes and 254k tokens. Both sizes passed `still-frames` (after the agent fixed its own
  first-render dead air with beat pings and slow push-ins) and loudness (it measured −14.7 LUFS, cut the score's
  gain to 0.69, and landed on −16.0).
- **What held.** The idea transfers completely: a code-drawn card with a flat illustration (a coffee cup, a clock, a
  plane over clouds) carries a coverflow, a step row, a word-slam cloud, a focus pull and an end-card wall, with no
  photograph anywhere. The coverflow's perspective is faked by slicing each card into 44 vertical strips.
- **What broke.** The critique scored the hook 5 (2.5 s of dark rings and dots before any word), readability 6
  (secondary lines unreadable at phone width) and motion 6: text ghosted in 3–4 stacked copies wherever a card moved,
  because the card crossfaded between a texted and a text-free version *under* motion blur. The agent had seen the
  ghosting; it had not seen the empty hook or the phone-size text.
- **The fix worth copying.** Draw text once per frame, sharp, from the middle of the shutter, on top of a blurred card
  body; show text only on cards that have settled; blur big type with its own dense samples. Round 2 (45.6 minutes,
  the same agent) shipped every score at 8 or more, at a cost: a slam frame now takes about 2 s to draw.
- **A measurement lesson.** The pacing tool counted 0.7 abrupt changes per 10 s and a 16 s calm, where the eye sees
  something new every 2–4 s. A contrast-relative version of the measure gave the same answer, and the reference,
  at the same contrast, scores 4.6–10.3: Card Wall's changes *glide* (crossfades, slides, word-by-word builds) where
  its reference *punctuates*. The agent's own answer in round 2 was to turn four section changes into hard cuts on
  the beat.

### E2 · Halftone Host (study 23), from the halftone product film

- **Hypothesis.** A halftone pass over a *computed* 3D host (spheres and cylinders lit per point, then screened)
  gives the print-toy look with no model or photo.
- **Setup.** Brief `halftone-host.json`: 600 frames at 30 fps, 120 bpm, the `mono` palette; the host is an original
  alarm clock.
- **Build.** One agent, 23.8 minutes and 262k tokens for the first pass (the earlier twenty study runs: median 16.9
  minutes, 206k tokens). Both sizes passed `still-frames` and measured −15.8 LUFS; frames draw in 6–45 ms, so the
  per-point shading and the dot screen needed no caching at all.
- **What held.** The dot screen over computed shading reads as print at every size, including a 150 px bento tile.
  The agent found and fixed a real determinism bug on its own: two of six probe frames differed depending on which
  frame had been drawn before, because resampling an offscreen plate read a pixel or two past its edge, where the
  previous frame's pixels still sat. It also wrote its own dot loop, anchored to the host's feet, because a grid fixed
  to the frame made the dots crawl across the host as it hopped.
- **What broke.** The scored critique (E6) found three problems the agent had not reported: the motion-blurred slam
  left discrete ghost copies, the first 1.5 s had no words, and the vertical phone was an empty slab. It had reported
  two others itself (the stamp covering text, the face busy at small sizes). The ghosting fix is worth copying: the
  word moves up to about 1,600 px in one frame, far past what shutter sampling can hide, so the agent replaced it with
  a smear computed from the exact distance moved.
- **Result.** Round 2 (5.8 more minutes, same agent): every score 8 or more, shipped.

### E3 · Doodle Guide (study 24), from the style-per-section explainer

- **Hypothesis.** One character survives any rendering style if the style is a *pass over the same image*, not a
  redraw: the owner's turtle, redrawn in the corner badge in six styles computed from one PNG (pixel dither,
  halftone, riso two-tone, ink line, flat poster, original).
- **Setup.** Brief `doodle-guide.json`: 1,080 frames at 30 fps, 120 bpm, the new `doodle` palette. This is the first
  study about a real topic (goldendoodle generations, coats, sizes and colours), so every fact is hedged ("about",
  "roughly", "usually") and it never calls a dog hypoallergenic.
- **Build.** One agent, 24.9 minutes and 242k tokens. Six styles are computed once per pose, style and size and
  cached; a frame draws in 1–8 ms. The agent chose finer cells than the brief (3 px dither and 4 px halftone in a
  150 px badge, where 6 px would have erased the face), dithered greys to ink and white only (four inks turned the
  turtle's grey trousers into apricot-and-blue noise), and made the blinks by repainting the eyes of the real PNG
  once, rather than drawing a new eye.
- **What held.** The hypothesis, fully: the same PNG through six passes is always recognisably the same character,
  and the confetti run through the same pass so they always match the badge. The copy stayed exactly as briefed;
  every hedge survived.
- **What broke.** Round 1 scored readability, variety and composition 6. Every section opened on 8–12 frames of empty
  colour before anything arrived, and 64 % of all frames were near-still; the landscape layout put small content in the
  top-left third, unreadable at phone width. The agent had seen the ink-on-ink outlines and the empty right half of one
  scene, not the empty openings, the holds or the phone-size text.
- **Result.** Round 2 (35.6 minutes, the same agent) shipped: 4.2 abrupt changes per 10 s (from 1.4), a longest calm
  of 4.5 s (from 10), near-still 37 % (from 64). The agent added something it was not asked for, a two-beat close-up
  cut in each long section, and that is what moved the pacing numbers most.

### E4 · Five Point Five (study 25), from the lyric video

- **Hypothesis.** A song can be data: one syllable table drives a formant-synthesized voice, the lit lyric and the
  cuts, so a lyric video is in sync by construction, with no samples and no voice model.
- **Setup.** Brief `five-point-five.json`: 1,920 frames at 30 fps, 90 bpm (a 20-frame beat, an 80-frame bar), the
  new `clay` palette; the lyric is about how this studio was made. Every line is true of it except the first, "One
  prompt, one link, a blinking line", which quotes the trend's caption on purpose: the song opens on the claim this
  study tests.
- **Build.** One agent, 35.6 minutes and 274k tokens. One table of syllables `[bar, beat, length, midi, vowel,
  consonant, text]` drives three things: the voice, the lit syllable on screen and the HUD level meter. The verse sits
  in A minor (A3–F4); the chorus lifts to C major and hooks "five point five" on G–A–G–D, doubled a diatonic third above.
  The voice is a band-limited sawtooth with a short pitch glide and late vibrato, through three parallel formant
  filters that glide between eleven vowel targets, with seeded noise bursts for consonants. `audio(sr)` returns
  identical samples on every call, and it measures its own loudness (the same BS.1770 method as the playlist) to land
  on −15.9 LUFS.
- **What held.** Sync by construction: the voice stem's energy rises exactly on each syllable's frame, because the
  picture and the sound read the same row. The spectrogram of the chorus shows each vowel's second formant in a
  different place (about 1.45 kHz for "-tion" up to 2.3–2.5 kHz for "-ery").
- **What is uncertain.** Whether a listener can follow the words without the screen. By the agent's own analysis the
  vowels of "five", "one" and "draw" sit close together, consonants are short bursts that may read as clicks, and the
  harmonics stay strong to about 4 kHz, so the voice is buzzy. Nobody has listened yet.
- **What broke.** Round 1 held one composition for each 5.3 s lyric line (63 % near-still, a 16 s calm). Round 2
  (56.9 minutes, the same agent) cut to a second, closer framing of each line's idea on its inner bar line and
  shipped every score at 8 or more.
- **A Goodhart moment.** The agent reported that its first second beats, cut on the dark ground, did not register
  with the pacing tool, so it rebuilt each one around a large bright area arriving. Read by eye, those areas are real
  content (a sheet of paper, a lit surface, a clay flood under "tonight"), and the film and the number improved
  together. It is still the clearest sign in this study that a metric in an agent's loop becomes a target.

### E5 · The Rotli playlist, from the question "what does each theme sound like?"

- **Hypothesis.** One melody can become an album: the films' phrase and music-box melody, re-voiced per theme family
  (key, tempo, instruments, room), mastered to one loudness so a playlist has no jumps.
- **Setup.** Five new tracks beside Linen, in `sound/src/recipes.ts`. The synth grew a felt piano, a marimba, a
  two-operator FM electric piano, a bass, filtered seeded noise (shaker, brushes, surf, a pencil), a soft kick, bird
  chirps, vinyl dust, and an ITU-R BS.1770 loudness meter with a mastering step.
- **Results.**

| Track | Family | Key, tempo | Length | Loudness (ours) | Loudness (ffmpeg) | Peak | Render |
|---|---|---|---|---|---|---|---|
| Linen | Rotli | C major, 66 bpm | 58.2 s | −20.96 LUFS | −21.0 LUFS | −9.0 dBFS | 0.7 s |
| Graphite | Paper & Charcoal | F major, 72 bpm | 53.3 s | −21.00 | −21.0 | −10.1 | 1.4 s |
| Tide | Ocean | D major, 60 bpm | 64.0 s | −21.00 | −21.0 | −9.7 | 2.6 s |
| Canopy | Grove | G major, 88 bpm | 65.5 s | −21.00 | −21.0 | −7.6 | 0.8 s |
| Dusk | Iris | E-flat major, 76 bpm | 50.5 s | −21.00 | −21.0 | −7.2 | 1.6 s |
| Lamplight | Midnight | A-flat major, 54 bpm | 71.1 s | −21.00 | −21.0 | −8.0 | 1.1 s |

- **What held.** The in-code loudness meter agrees with ffmpeg to 0.04 LU, so mastering needs no second tool.
  Every loop seam is continuous (the largest sample step across the seam is 0.0038, below each track's median step),
  DC offset is under 0.0002, and the five existing sounds stayed byte-identical (the new synth options are additive).
- **What broke first.** The felt piano was the slowest voice by far (3.4 s for one track) because it called `sin` and
  `exp` for six partials on every sample of ten-second notes. Rotating phasors with a multiplying decay cut it to
  1.4 s with the same sound; `bun run verify` pays for every recipe on every run, so this matters.
- **What we could not verify.** Nobody has listened yet. The spectrograms show each design (Graphite's pencil
  strokes, Tide's surf swells, the band entering in Canopy's second pass, Dusk's swung groove, Lamplight's sparse
  bells), but whether the pencil and the birds are charming or tiresome on the fifth loop is a question for ears.

### E6 · The scored critique, run on our own agents

- **Hypothesis.** The building agents already look at their own contact sheets; a second, *scored* pass against a
  fixed rubric, on sheets made the same way for every piece, still finds problems they left behind.
- **Setup.** A new tool, `motion/tools/critique.mjs`, makes the four sheets from the rendered video alone (so it
  works the same on a reference) and the pacing numbers used above; the rubric is `motion/workflows/critique.md`;
  every round is recorded in `motion/series/studies/critiques/<pieceId>.json`, including what the building agent had
  already reported (`agentSaw`) and what only the critique found (`agentMissed`). The critic is a separate Opus 5.5
  session (the maintainer's), not the building agent. Problems go back to the same agent, which keeps its context.

- **Result.** Round 1 passed none of the four studies; round 2 passed all four. Scores are hook,
  readability, motion, variety, composition, accuracy, sync:

| Study | Round 1 | Only the critique found | Round 2 |
|---|---|---|---|
| Card Wall | 5 · 6 · 6 · 7 · 7 · 10 · 8 | an empty 2.5 s hook; unreadable secondary text at phone width; an overlap; empty frames | all 8+ (ship) |
| Halftone Host | 7 · 8 · 7 · 8 · 7 · 10 · 8 | ghosting in the motion blur; a 1.5 s hook without words; an empty phone | all 8+ (ship) |
| Doodle Guide | 8 · 6 · 8 · 6 · 6 · 10 · 8 | an empty colour field after every section flip; long static holds; landscape text unreadable at phone width | all 8+ (ship) |
| Five Point Five | 6 · 8 · 8 · 6 · 7 · 9 · 8 | one composition per 5.3 s lyric line; a weak visual hook; a static tag | all 8+, accuracy 9 (ship) |

- **What the agents did see.** Each agent reported some weaknesses honestly (stamps covering text, ink outlines on
  ink, text ghosting), and each fixed a real problem unprompted (a determinism bug, first-render dead air, loudness).
  What they missed is consistent: the things no gate measures.

## Measurements

Agent time and tokens are as reported by Claude Code for each background agent; a resumed agent's token count
includes the context it carried from round 1. The twenty earlier study runs (studies 02–21) had a median of 206k tokens
(156k–262k) and 16.9 minutes (11.9–27.5), and none had a follow-up round.

| Study | Length | Round 1: minutes, tokens | Round 2: minutes, tokens | Abrupt changes per 10 s (r1 → r2, landscape) | Near-still (r1 → r2) | Loudness | Draw per frame | Golden |
|---|---|---|---|---|---|---|---|---|
| Card Wall | 30 s | 29.1, 254k | 45.6, 346k | 0.7 → 1.7 | 37 % → 37 % | −16.0 LUFS | 80 ms – 2.2 s | SAME |
| Halftone Host | 20 s | 23.8, 262k | 5.8, 323k | 3.0 → 3.0 | 34 % → 39 % | −15.8 LUFS | 6–45 ms | SAME |
| Doodle Guide | 36 s | 24.9, 242k | 35.6, 333k | 1.4 → 4.2 | 64 % → 37 % | −15.8 LUFS | 1–8 ms | SAME |
| Five Point Five | 64 s | 35.6, 274k | 56.9, 435k | 1.1 → 3.8 | 63 % → 52 % | −15.9 LUFS | 6–33 ms | SAME |

For comparison, the references: 5.0, 4.7, 2.3 and 7.1 abrupt changes per 10 s; 13 %, 17 %, 37 % and 16 % near-still.
All 128 pieces that existed before this study still print SAME: the two new palettes and the synth's new voices
moved nothing.

## Findings

1. **One pass is not enough, even with a good harness.** 0 of 4 studies met the 8+ bar on the first pass; one scored
   round fixed all four. The fix rounds cost from 6 minutes (small, local fixes) to 46
   (a layout rework), so budget a second round as part of making a piece, not as a failure.
2. **Agents catch what their gates measure.** Every agent ran `still-frames`, loudness and `tsc` on itself and passed.
   What they missed is exactly what no gate measured: the first two seconds, text at phone width, and punctuation.
   That argues for measuring more of the rubric, not for longer prompts.
3. **The hook is the most-missed criterion.** Three of four first passes spent 1.5–2.5 s before the first word. Every
   brief said "hook"; none said "a word on screen by 0.5 s". Put the number in the brief.
4. **"No dead air" is not "something lands".** The dead-air gate passed pieces that were 63–64 % near-still: slow
   drifts and push-ins keep the pixels moving without anything happening. The product references punctuate (a flip,
   a slam, a cut) 2.3–5 times per 10 s. Doodle Guide went from 1.4 to 4.2 by adding content on every cut and one
   close-up per section; drift did not help.
5. **Sampled motion blur fails on big moves.** Two of four studies left visible ghost copies, the same failure the
   pipeline write-up reports for four subframes. When something moves hundreds of pixels in a frame, draw the smear
   analytically, or draw text once, sharp, over a blurred body.
6. **Measure punctuation and read the sheet.** A frame-difference count is a good, cheap proxy for punctuation, and it
   reproduces exactly across runs, but it reads a gliding film as calm; Card Wall's first count said "16 s of
   nothing" where the eye saw a new card every few seconds. Numbers first, then eyes.
7. **Deliberate holds are a design choice the studio cannot yet express.** The style-per-section explainer rests on 37 %
   near-still frames and reads well; our gate forbids a half-second rest. A brief should be able to declare a reading
   hold.
8. **Code-only sound scales to an album.** One melody, six recipes, one loudness meter written in 60 lines, and the
   playlist matches to 0.04 LU with no second tool. What code cannot yet do well is a voice: Five Point Five's
   formant singer is intelligible mainly with the lit lyric on screen, by the building agent's own account.

## Limits of this study

- **Four references are an anecdote, not a sample.** They were chosen by the owner because they were good, which is
  survivorship; the course's own list is nine posts.
- **The reference measurements are coarse.** Thresholds (scene 0.32, 18 grey levels, 0.4 for "still") were chosen by
  looking at the plots, not tuned; the tempo estimates can land on half or double time.
- **The numbers the course quotes (views, bookmarks, hours) are the course's**, not re-measured here.
- **One agent per study, one run each.** We did not re-run a brief to see how much the result varies.
- **Nobody listened.** Every sound claim above is measured, not heard.

## Next

1. **Measure more of the rubric.** Two of the most-missed problems are measurable: the time of the first word on
   screen (a hook check) and the smallest text at phone width (a readability check). Both belong in `critique.mjs`,
   so the building agent sees them before a reviewer does.
2. **Let a brief declare reading holds** (frame ranges) that `still-frames.mjs` accepts, so an editorial piece can
   rest the way the style-per-section explainer does, on purpose.
3. **Critique the older studies.** Studies 01–21 were made before the rubric; scoring them would say whether the
   problems found here are new or were always there.
4. **Variance.** Re-run one brief three times and compare, to learn how much of a study is the brief and how much is
   the run.
5. **Listen.** Every sound claim here is measured, not heard: the playlist and the song need the owner's ears.

## Reproduce it

```sh
# the studies (from motion/)
node tools/study-prompt.mjs series/studies/briefs/<id>.json      # the exact prompt an agent got
node tools/frames.mjs <pieceId> 0,90,180,270 --sheet /tmp/s.png   # a contact sheet
node tools/render.mjs <pieceId> --out /tmp/<pieceId>.mp4          # the video
node tools/still-frames.mjs /tmp/<pieceId>.mp4                    # dead air: "windows:" must be empty
node tools/critique.mjs /tmp/<pieceId>.mp4                         # review sheets + pacing (also works on any video)
ffmpeg -nostats -i /tmp/<pieceId>.mp4 -af ebur128 -f null - 2>&1 | grep " I:"   # loudness
node tools/studio.mjs golden all                                   # every piece still SAME

# the playlist (from the repository root)
bun sound/tools/render.ts            # renders every sound, writes sound/catalog.json
bun sound/tools/render.ts --check    # proves the committed files match the recipes
```

## Sources

- 0xMovez, *How to build motion design studio with Opus 5.5 (Full-course)*, X article, 2026-09-27:
  <https://x.com/0xMovez/status/2104216919033192746>
- The launch film: <https://x.com/samongaro_/status/2104511685029507390> (2026-09-28)
- The halftone product film: <https://x.com/achxvi/status/2103918792845963545> (2026-09-26)
- The style-per-section explainer: <https://x.com/achxvi/status/2104294892944097513> (2026-09-27)
- The lyric video: <https://x.com/minchoi/status/2104227722377757031> (2026-09-27); source repository
  <https://github.com/JohnHeibel/PDoomVideo>
- Raphael Aubry, *i made 10+ motion videos with opus 5.5 in 3 days. here's the whole pipeline (open source)*, X
  article, 2026-09-28: <https://x.com/RaphaelAubryy/status/2104502744010629269>; the skill:
  <https://github.com/howseen-ai/claude-motion-design>
- ITU-R BS.1770, *Algorithms to measure audio programme loudness and true-peak audio level* (the K-weighting and
  gating the playlist's meter implements).
