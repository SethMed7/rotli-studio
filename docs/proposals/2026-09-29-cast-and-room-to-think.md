# Proposal: a cast library, a character builder, and "Room to Think" in three episodes (2026-09-29)

The ask: study a character-builder film shared on X, build a library of characters (a person inspired by the owner,
the owner's two dogs, a yellow-bellied slider), and plan a three-episode story in which that person uses Rotli to find
ideas, work and test things. The sound is precise foley, not voice-over. The whole thing becomes a study so visitors can
make their own story.

**Status (2026-09-29): the cast library and the foley kit are built. A character-builder study was built from them
and then deleted at the owner's request; it is not part of Studies. The three episodes are proposed, not built.**

**The owner's decisions (2026-09-29):** the episodes live in Studies as an exception to the bible's "nothing here
looks like Rotli" rule, the same kind of exception study 24 makes for the owner's turtle. The main character is based
on the owner. The turtle is a new code-drawn slider, not the existing light-blue mascot.

## 1. The reference, in detail

[Magnific on X](https://x.com/magnific/status/2104587476014964879), 2026-09-28: "Create your character builder with
Magnific + Claude Opus 5.5". It is 20.06 s long, 1920 × 1080 at 24 fps, stereo AAC at 32 kHz. The film and its
analysis stay in the gitignored `tmp/`. Nothing from it is committed.

**What is on screen.** One stylised 3D character (big head, oversized hoodie, cargo trousers, cap) stands on a
seamless paper sweep. On the right sits a sparse control column: three sliders, a row of light swatches, a row of
backdrop swatches and a reset button. There is no panel behind the controls; they sit straight on the backdrop. A
brand chip sits top-left and the wordmark top-right.

**What makes it work.** Every control change gets a reaction from the character, as if they felt it:

| t (s) | Control | The character's reaction | The camera |
|---|---|---|---|
| 0–3 | none | idles, blinks, one hand in a pocket | full figure |
| 3–7 | head to "bigger" | the head inflates, the eyes cross, the cheeks puff and turn red, both hands come up to the cheeks | cuts to a close-up while the head grows |
| 7–8 | head back | deflates, looks surprised, hands spread | pulls back |
| 8–11 | height to "taller" | the legs lengthen; they look down at their own feet and shuffle | full figure |
| 11–13 | orange light | the whole frame (backdrop, skin, clothes) goes amber; they squint, unimpressed | holds |
| 13–15 | violet, then blue light | a hand goes up to shield the face, head turned away | holds |
| 15–17 | cream, then teal backdrop | hands on hips, a weight shift and a toe tap | full figure |
| 17–20 | reset | cuts to a close-up: a slow smirk | close-up to the end |

**Rhythm.** A new change about every 1.5–2.5 s, so no hold is still. A reaction starts 3–6 frames after the control
moves, which is what sells cause and effect. The close-ups are cuts, not zooms.

**Sound.** It is nearly all foley and UI sound. Measured: −24.6 LUFS integrated, loudness range 18.3 LU, and one
silence of 0.27 s at 18.0 s before the end. The spectrogram shows sharp broadband clicks for slider grabs and swatch
taps, noise swells under each lighting change, and a low sustained bed only in the middle section. It has no voice
and almost no melody. That quiet is the texture the owner wants for the episodes.

**What we take:** the builder format as an idea, reactions over parameters, reaction latency, cut-to-close-up on big
changes, and a sparse foley bed. **What we don't:** the character, its clothes, the product, the UI copy ("Head size",
"Body shape", "Colour lighting", "Background", "Back to original" are its strings; ours are renamed), its colours and
its sound.

## 2. The cast library (built)

Each character is **data**, not a drawing: `motion/src/canvas-core/kit/cast.ts` holds one parametric rig per species
and one preset per character. Three dials change every character: `head` (small ↔ big), `build` (slim ↔ solid) and
`stature` (short ↔ tall), each 0..1 with 0.5 the default. Expressions and poses are numbers too (blink, smile, puff,
squint, gaze, brows, a hand to the chin, a wave). Any frame of any character is a pure function of those numbers, so
the builder and the episodes share one source.

| Character | Based on | Design notes (code-drawn, stylised) |
|---|---|---|
| **The Maker** | the owner | Dark, wavy, tousled hair with volume on top and a loose fringe; thin dark rectangular glasses; warm light-medium skin; dark brows; a crisp white button-up shirt with the collar open and a visible placket; charcoal trousers; white trainers. A big head (about 1 : 3.4) in the reference's stylised proportions, calm and a little wry. |
| **Red** | the owner's red doodle | Red-apricot; the body clipped short and smooth; a full, fluffy head and long feathered ears; a white chest blaze; a blue collar; a plumed tail carried high. Stands in profile. |
| **Parti** | the owner's parti doodle | White with apricot ears and apricot patches over both eyes; a curly white topknot; a clipped white body; a fluffy white plume of a tail; a blue collar with a silver tag; the tongue often out in a small blep. Sits facing the camera. |
| **Slider** | a yellow-bellied slider | An olive-brown domed shell with yellow scute markings, a yellow plastron edge, a yellow patch behind each eye and yellow neck and leg stripes. Basks on a flat stone. |

The dogs and the turtle are scenery in the episodes: they react, but never lead. On screen, the dogs use role names
("Red", "Parti") rather than their real names, and nothing personal appears (the photos the owner shared are only a
reference and are not committed).

**Rendering: soft vinyl, not 3D.** Canvas 2D can't match the reference's rendered 3D, so the look is a vinyl toy:
every form gets a key-light highlight (a radial gradient toward the light), a core shadow on the far side, a rim of
the key light's colour on the edge, and a soft contact shadow on the sweep. The whole scene takes the key light's
colour through one multiply pass, so a light change re-lights the character, the floor and the backdrop together, as
in the reference. It is all gradients: no `ctx.filter`, so every frame stays pure.

## 3. The foley kit (built)

`motion/src/canvas-core/kit/foley.ts` is additive; `beatScore` is unchanged. A piece writes a **cue table** (frame,
sound, parameters). `foley(cues, spec)` renders it into seeded, pure stereo, with a quiet room tone under everything,
and masters it to a target loudness. Each sound is designed from its physical source:

| Cue | What it is | How it is made |
|---|---|---|
| `grab` / `release` | a fingertip on a slider knob | 2 ms bright click + a 1.8 kHz body at 30 ms; the release sits a fifth lower |
| `detent` | the slider's notches | a 4 ms tick per notch crossed, pitched with the value (1.1 → 2.2 kHz) and panned with the knob's x |
| `tap` | a swatch or button | a glassy two-partial tap (3.1 and 7.4 kHz) at 60 ms |
| `lamp` | a light changing colour | a filament "tink", then a low swell of band-limited noise over 400 ms |
| `sweep` | a paper backdrop changing | a band-passed swoosh whose centre rises across 350 ms |
| `inflate` / `deflate` | a head growing or shrinking | a rubbery sine glide (180 → 420 Hz, or back) with a 7 Hz wobble |
| `puff` / `pop` | cheeks filling, lips releasing | breath noise shaped low; a 90 Hz thump with a short click |
| `glasses` | pushing glasses up | two tiny plastic ticks 22 ms apart |
| `rustle` | shirt fabric on a gesture | soft high-passed noise in two grains |
| `step` | a trainer on the floor | a low thump plus a rubber squeak |
| `think` | a thought forming | three soft sine "dots" rising a third each, 110 ms apart, and a faint air swell |
| `paw` | a paw pad | a very soft 140 Hz thump with a little grit |
| `jingle` | a collar tag | four to six inharmonic metal partials (2.8–7.9 kHz), seeded per cue so no two sound alike |
| `wag` | a tail plume through the air | band-passed swishes at the wag rate |
| `blep` | a small tongue flick | a short wet click |
| `shell` | a shell on stone | a hard tap plus a gritty scrape |
| `slide` | a turtle's head extending | a slow, dark, leathery noise glide |
| `type` | one key on a keyboard | a seeded key click with a lower thock; the spacebar is duller and longer |
| `pencil` | a pencil stroke | graphite grain whose brightness follows the stroke's speed |
| `chime` | the sign-off | one soft bell and its octave |

The reference sits at −24.6 LUFS and the bible asks for about −16. The studies keep the bible's target, so the room
tone and foley are balanced for −16. **The owner should listen:** at −16, sparse foley sounds more present than the
reference. If it feels too present, a quieter house target for foley studies (about −20) is a one-line change.

## 4. The character builder (built, then deleted)

A 30 s builder piece (landscape and vertical) proved the rig and the foley kit: sliders and swatches drove the cast and
every change got a reaction a few frames later. It passed the studio's checks, but the owner chose not to include it
in Studies, so its module, brief, prompts, critique and goldens were deleted on 2026-09-29. What it taught stays in
this plan: reaction latency of 3 to 6 frames, clicks low-passed so an AAC encode does not overshoot, a −4 dBFS soft
ceiling, and a handheld drift so holds never freeze.

## 5. "Room to Think": three episodes (proposed)

**The story in three sentences.** *Setup:* the Maker wants to make a short cartoon about the two dogs, and the idea
keeps slipping away. *Turn:* the Maker catches it in Rotli, then tests it (sketches, timings, a table of what worked) while
Red and Parti nap and Slider basks under its lamp. *Payoff:* the cartoon plays, and everything that made it is still
there, in plain files.

It is a story about making a story, so the study can end with "now make yours". **The recurring token** is a note
called *dogs cartoon*, caught in E1, tested against in E2 and kept in E3.

**Format.** 60 s, 1920 × 1080 at 30 fps (120 bpm grid, 15-frame beats), each with a 9:16 vertical re-stack. No music
and no voice. Every sound in the frame is foley from `kit/foley.ts`, plus a room tone that changes by location (a desk
at night, a sunlit afternoon, dusk). The Maker never speaks; thoughts arrive as `think` cues and small pictogram bubbles.
On-screen words are only Rotli's UI and a title card.

**Rotli on screen.** Drawn from `studio/ui.ts` theme roles, as the "Rotli in 30 seconds" series does. Every caption
uses rotli.co's wording. No Safari or phones, nothing from Experiments, never "sync".

| Ep | Title | Beats (≈ 60 s) | Rotli, in rotli.co's words | Signature sounds |
|---|---|---|---|---|
| E1 | **The Spark** | Night, a desk lamp. Red asleep on the rug, Parti in a small armchair, Slider under the heat lamp. The Maker sketches a dog, gives up and puffs out both cheeks, then the idea lands (`think`). ⌥Space opens Rotli, and the Maker types the idea fast and messy. The Markdown renders, and a task list appears. Parti's tag jingles mid-nap. The lamp clicks off, and the note is still there. | "⌥Space Open or hide rotli from anywhere on your Mac" · "Write in Markdown. See it rendered." · tasks | every keystroke (seeded, never repeating), pencil strokes that follow the line's speed, the lamp switch, Slider's shell shifting on the stone |
| E2 | **The Tests** | Afternoon. The Maker tests: three sketches of Red's ears, a table of timings, a choice between two endings, links the note to `[[dogs cartoon]]` and asks Chat "what did I try on Tuesday?", and it answers from the notes. One test fails; Parti bleps. Red brings a ball, and the Maker laughs and tries that bounce instead. | "More than notes." (tables, choices) · wikilinks `[[...]]` · "Chat that works inside your notes." · "Ask your notes." | pencil vs eraser, a ball on the floor, paws skittering, the tabs of the table, the send tap and a soft answer tone |
| E3 | **The Keep** | Dusk. The cartoon plays on the Maker's screen: our own cast, drawn in the same rig. The Librarian files the notes ("A Librarian that files, never rewrites."). One note is marked secure. The folder opens, and it's all plain Markdown. The dogs settle beside the desk, Slider slides into the water, and the camera pulls back through the window. End card: "Room to think. Files you keep." | "A Librarian that files, never rewrites." · "Secure notes never reach a remote model" · "Everything rotli does, in plain files." · "Free · No account · Works offline" | a folder opening, paper settling, Slider's plop and ripple, two dogs sighing, the sign-off chime |

**The exception in the bible** (added with the episodes, not before): a fourth subject, `rotli`, "a story about
Rotli, told only in rotli.co's wording; the owner's exception, like study 24's turtle". Only this series uses it. Its
portable prompt swaps Rotli for "your product" so visitors copy the structure, not our copy.

**How visitors make their own.** A portable prompt (`room-to-think.md`) turns a cast plus a product into three
episodes. The steps: three sentences, a token, a cue table
of foley, then one beat at a time.

## 6. Build order for the episodes (after sign-off)

1. Extend the cast with interior props (desk, lamp, rug, armchair, tank) and sitting and typing poses.
2. E1 as the pilot: contact sheets, `still-frames.mjs`, loudness, then the owner's ears on the foley.
3. E2 and E3 on E1's frame, then the verticals, the bible row, portable prompts and goldens.

**Effort:** about a day of agent time per episode with review. The owner's listening pass is the gate that can't be
automated.
