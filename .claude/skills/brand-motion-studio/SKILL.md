---
name: brand-motion-studio
description: Turn any product's website + assets into a reproducible motion room (films, story seasons, verticals, carousels, stills) using the engine proven on Rotli. A guided Q&A, not a CLI. Use when someone says "make launch videos / a content month / a story series for <product or URL>", "repurpose the motion studio for <brand>", or "set up a motion room for <site>".
---

# Brand motion studio: from a website to a season of films, by Q&A

The engine and every tool live in the **source room** `~/rotli-studio/motion/` (Rotli is the reference
product; its sealed film must never change). This skill is the *flow*: you (Opus) run the tools, read
their evidence, and ask the owner only the questions evidence can't answer. Each phase ends in a
file on disk and a picture the owner has approved, so the flow can stop and resume at any phase.

**Work dir:** `~/<product>-studio/` (ask if unsure). All commands run with Node/npm inside `motion/`.
Read `~/rotli-studio/motion/EVALUATION.md` once: it lists what ports cleanly and what doesn't.

## Laws (these hold in every phase)

1. **Evidence before taste.** Every colour, font, tracking value and claim traces back to a URL or a file
   (`evidence.md`). If you can't source something, ask; never make it up.
2. **Claims are quoted, never invented.** Captions use the site's own sentences (or the owner's
   words from the Q&A). Nothing unreleased, no competitor names, no numbers the site doesn't state.
3. **Fonts need the owner's licence confirmation** before files are copied in. Until then use the
   system fallbacks in `brand.json` and say so.
4. **Ask with AskUserQuestion**: 1–4 questions per call, the recommended option first, and a `preview`
   whenever the choice is visual (hex swatches, a crop path, a sample line). Don't ask what the
   evidence already settles; state it and move on.
5. **Gate on pictures.** The owner approves a rendered PNG (the look still, then the reference piece) before
   anything is made in volume. Show images with `Read`, and name the file.
6. **Never touch** the source room's Rotli pieces, goldens or `rotliStory`. New products get their own
   room (`tools/new-studio.mjs`).

## Phase 0: Intake (one AskUserQuestion call)

Ask for anything the prompt didn't give you:
- **Site:** the URL (plus extra pages if the nav hides them, such as /features, /privacy, /faq).
- **Goal:** launch month · a story season · evergreen explainers · just a look pack.
- **Channels:** X/LinkedIn landscape · Reels/TikTok/Shorts vertical · carousels · stills. Multi-select.
- **Character:** an existing mascot (they'll supply an SVG or PNG) · the mark animates · **none (typographic)** · design one later.

## Phase 1: Discover (tools, no questions)

```sh
node ~/rotli-studio/motion/tools/discover.mjs <url> --out ~/<p>-studio/discovery --pages 8
node ~/rotli-studio/motion/tools/propose-brand.mjs ~/<p>-studio/discovery/discovery.json --out ~/<p>-studio/brand.proposal
```

Read `discovery.json`, the full-page shots in `discovery/shots/` and `brand.proposal/evidence.md`.
Write a short **reading of the brand** for yourself: grounds (base/band/deep), accent, type pair,
headline tracking, voice (three adjectives, with example sentences), the 5–10 strongest claims with
their URLs, and what the site does with backgrounds (patterns, photos, gradients, plain).

## Phase 2: Confirm the brand (Q&A, gated on a picture)

Ask only where the heuristics were unsure (`evidence.md` lists candidates):
- **Accent:** the top 2–3 candidates as swatch previews.
- **Deep ground:** the darkest section colour, or a derived one.
- **Theme families:** does the product have alternative themes (the app's settings, dark mode)? If it
  does, one family per mood. If it doesn't, propose light + dark of the site's palette as the single family.
- **Fonts:** "<Display face> and <UI face> were found. Can we use the font files (licence), or should we use
  close system fallbacks?"
- **Mark and pattern:** the header SVG found (show its path) or none. Is there a background pattern the
  site uses (Rotli's file field)? If not, `pattern: null`.

Then:
```sh
node ~/rotli-studio/motion/tools/new-studio.mjs ~/<p>-studio --brand ~/<p>-studio/brand.proposal
cd ~/<p>-studio/motion && node tools/frames.mjs brandLook 14 --out /tmp/<p>-look
```
Edit `brand/brand.json` (`product`, `wordmark`, `tagline`, `url`, `platform`, `cta`, `promise`,
`voice`, `character`) and `brand/themes.json` from the answers. Show the look still. **Gate: the
owner says it looks like their site.** Loop on specific notes ("band too grey"). Never re-ask everything.

## Phase 3: Character

- **None (typographic):** set `"character": null`. Every template skips the mascot (`HAS_CHARACTER`),
  so story beats use intertitles, UI, props and pictogram bubbles. This works today (proven in a dry run on a second product).
- **Existing mascot:** vector line art imports the way the quokka did (`tools/import-quokka.py` turns a
  folder of pose SVGs into `quokka/poses.ts`), then set `character.poses`. Expect one focused
  session: hat and ear clipping, eye detection and fill leaks were each real bugs on the first
  character. Raster-only mascots use `drawLook` sprites (no hop/squash, sway and blink only).
- Ask: "What must the character **never** do?" (speak? appear in serious topics?) Write it into the bible.

## Phase 4: Messages (Q&A)

Show the claim list you extracted, grouped by feature, each with its URL. Ask:
- which 5–10 features matter most (multi-select),
- which words are forbidden or overused ("free", "AI", "secure", competitor names),
- what's **not shipped yet** (never shown as available),
- and the voice line to put in `brand.json`.

Write `claims.md` (feature → sentence → source URL). Every caption in every brief is drawn from it.

## Phase 5: Plan

Depending on the goal:
- **Season:** `season/bible.md` in the Rotli shape (three-sentence arc, a recurring token, cast and
  rules, world and places, atmospheres, styles, episode map where each episode owns *new* features),
  then one `season/episodes/<id>.json` brief per episode (copy the Rotli briefs' shape; scenes are
  multiples of 15 and sum to 1800).
- **Launch month:** a dated calendar (`launch/<p>-launch-month.md`, shaped like
  `~/rotli-studio/launch/rotli-launch-month.md`): what goes when and why, per channel, with the piece id.
- **Atmospheres:** re-skin the ones in `studio/atmospheres.ts`. Each is a family, a ground, ambient
  life and a music key. Rename island/lighthouse ones to the product's world, or drop them.

Ask **one** question about the plan: the arc and the episode map as a preview. Change it once, then build.

## Phase 6: Produce (reference first, then waves)

1. **The reference piece**, by you: episode 1 or the hero 30-second piece. Iterate until it's right, and
   get the owner's approval on the sheet (`node tools/frames.mjs <id> 40,200,…,1760 --sheet /tmp/x.png`).
2. **Waves** of 3–4 agents (Agent tool, background), each given `node tools/brief-to-prompt.mjs <brief>`
   output. The prompt tells it the reference piece to imitate, the claims file and the checks.
3. **Review every sheet** against `workflows/review-checklist.md`: claims match `claims.md`, nothing
   overlaps, style consistent, no dead air.
4. Register **serially** (`add-story.mjs` for every brief at the end, because parallel agents race on
   `pieces.json`), then `studio.mjs render all`, `check`, `golden all --record`, `catalog`.

## Phase 7: Handoff

Report: what's rendered (paths in `exports/`), what each piece claims and its source, what the owner still
needs to do (licences, the music listen: **no one has heard the audio**, so ask them to), and how to
re-make any piece (`workflows/README.md`). Offer the next wave; never publish anywhere yourself.
