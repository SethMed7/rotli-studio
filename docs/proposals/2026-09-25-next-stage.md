# Proposal: the studio's next stage (2026-09-25)

Two asks: (1) a left menu that is calm and easy to use, with every title chosen on purpose; (2) parts of the
studio that are clearly **not only for Rotli**: other styles, other motion, other sizes (landscape and reels),
each with its prompt and its video, without dropping quality. Nothing here is built yet.

## What was evaluated

- **A 15 s motion-résumé reel** made by Opus 5.5 from one prompt (<https://x.com/darel023/status/2103424524297420829>):
  1920×1080 at 60 fps, a dark ground with one accent colour and small HUD labels. It runs an easing-curve hook,
  kinetic words (sans, then a serif italic), UI micro-interactions (a toggle, a "Render complete" toast), a bar
  chart, an isometric block wave, a particle spiral, and a logo lockup, all cut to the beat. What it teaches: one
  accent is enough, show *technique* as the content, and cut on the music.
- **A 54 s vertical app ad** (the attached reference): 720×1280. A presenter to camera alternates with floating UI
  cards and phone mockups on soft grounds with soft shadows; serif captions come in word by word, mixed sizes,
  one key word coloured, timed to the voice; there's a 3-2-1 stacked countdown and ring motifs. What it teaches:
  captions that follow the voice, UI as the set, and depth from shadow rather than 3D. It shows a real person and
  another company's product, so it stays a private reference and is never committed.
- **A second code-drawn studio on this Mac** (another brand's launch films, built the same way): 22 films in
  landscape, portrait **and** square from one source, 30 fps and 60 fps loops with subframe motion blur,
  closed-form springs, a floating-UI kit, voice-over rendered locally and **picture timed to the voice lines**,
  determinism and loop checks, a scored review of every film. It is hard-wired to its brand, has no formatter,
  linter or tests, and holds client material, so ideas port and files don't.

## 1. The left menu

Today: two rows highlight at once (a series and its episode), the open series pushes ten episodes into the
menu, "Films" holds carousels and stills, series titles follow three different patterns, and the top bar
repeats the sidebar.

Proposed: **flat, three short sections, one highlighted row, no inline trees.** Episodes are listed on their
series page, and a piece page gets "previous / next episode" plus a small "Season One · 05 of 10" line instead.

| Section | Row (proposed title) | Today | Goes to |
|---|---|---|---|
| — | **Home** | Home | the landing page |
| Watch | **Library** | Library | every piece, filterable by size: landscape, vertical, square, portrait |
| | **Series** | (the six series rows) | one page listing all series |
| | **Studies** *(new)* | — | the non-Rotli explorations below |
| Make | **Create** | top-bar button | the post editor (local only) |
| | **Brand kit** | Brand & atmospheres | brand, themes, atmospheres, the atmosphere reel |
| | **Sound** | Sound | unchanged |
| | **Prompts & briefs** | Workflows & prompts | process, preamble, checklist, every prompt and brief |
| | **Agent runs** | Agent runs | unchanged |
| | **Skills** | Skills | unchanged |
| | **Tools** | Tools | unchanged |
| Open source | **Use it for your product** *(new)* | — | the repurpose guide: brand packs, new studio, sizes |
| | **Published** | Posts | the owner's posts, as links |
| | **Docs & licences** | Docs & licences | unchanged, plus the architecture map |
| | **Isolation audit** | Isolation audit | local only (hidden on the hosted site) |

The top bar keeps only: the wordmark, Sound, Create (local), GitHub and rotli.co.

**Series titles** (one pattern: the name alone, with the shape as a subtitle):

| Today | Proposed | Subtitle |
|---|---|---|
| Season One: The Island Keeps Everything | **Season One: The Island Keeps Everything** | 10 story episodes · 60 s · with vertical, carousel and card |
| Rotli in 30 seconds | **Rotli in 30 Seconds** | 8 feature explainers · 30 s |
| The Rotli Story | **The Rotli Story** | the first film · 60 s · sealed |
| Make it yours | **Looks and Themes** | vertical shorts and stills |
| Explainers | **Carousels** | standalone carousels |
| Template library | (moves into Brand kit as "Atmosphere reel") | — |

## 2. Studies: the studio beyond Rotli

A new section, **Studies**: each study is an original piece in its own style, for a **fictional, neutral
product**. Each one is shipped in at least two sizes, and each has a brief, the exact prompt, the agent run, a
golden and a short "what this teaches" note. The subtitle on every study says which formats it ships in.

| Study | Style and motion | Sizes | Length |
|---|---|---|---|
| **Motion Résumé** | dark ground, one accent, HUD labels; easing curve, kinetic type, UI micro-interactions, chart, block wave, particle field, lockup, cut to the beat | 16:9 1920×1080 · 9:16 1080×1920 | 15 s · 60 fps |
| **Vertical App Ad** | floating UI cards, phone mockup, soft shadows, word-by-word serif captions timed to a (local, synthetic) voice, countdown stack | 9:16 · 16:9 | 30 s |
| **One-Shape Loop** | one UI shape morphing through five states on springs, seamless | 1:1 1440×1440 · 16:9 | 8 s · 60 fps loop |
| **Print Carousel** | riso and storybook textures (the anidoodle styles already here) | 4:5 1080×1350 · 1:1 | 6 slides |
| **Sketch Explainer** | pen-plotter line drawing, a diagram that assembles itself | 16:9 · 9:16 | 20 s |

What the engine needs for these (re-implemented here as MIT code, not copied from the other studio):

1. **Brand packs.** `motion/brand/packs/<id>/` (tokens, fonts, lockup) chosen per piece, so Rotli is one
   pack and the studies use a neutral one. This is what makes "use it for your product" true.
2. **Sizes as data.** One source, several sizes, each *designed* per size (not squeezed); the library filters by them.
3. **Springs** (closed form, loop-safe) and **subframe motion blur** for 60 fps.
4. **Voice-timed captions.** A lines file drives both the voice (local text-to-speech; optional, never a cloud
   call) and the caption timing, so changing the copy re-times the picture.
5. **Depth helpers:** a projected block grid and a particle field (Canvas2D, no new dependency).
6. **More verification:** order-independent determinism, loop seam check (frame 0 = frame N), loudness.

## 3. Quality and docs

- **oxc:** `oxlint` + `oxfmt` for the studio's own code, one mechanical formatting commit, with upstream anidoodle
  files and `archive/` excluded (formatting them would modify third-party files).
- `CONTRIBUTING.md`, a "Use it for your product" guide, and `ARCHITECTURE.md` rows for packs, sizes and studies.
- A one-command `bun run verify`: typecheck, lint, format check, public gate, third-party inventory, sound check,
  goldens.

## Order of work

1. Menu and titles (small, visible, independent).
2. oxc + `verify` (so everything after lands formatted and checked).
3. Brand packs + sizes as data (the foundation; Rotli's pieces must stay golden-SAME).
4. Studies, one at a time, each reviewed on its contact sheet before it is registered.

## Decisions for the owner

1. The menu and every proposed title above.
2. The five studies (add, drop or rename).
3. Porting: re-implement ideas from the other studio as new MIT code (proposed), never copy its files.
4. Local voice for the Vertical App Ad: add a local text-to-speech model as an optional tool, or captions only.
