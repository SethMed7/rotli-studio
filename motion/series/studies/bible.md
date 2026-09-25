# Studies

The rest of the studio is Rotli's. **Studies** show that the engine is not: each one is an original piece in a
different style, for a fictional product (**Oriel**, a scheduling assistant that finds a time that works for
everyone), shipped in at least two sizes. They are the place to learn the studio before pointing it at your own
product.

| # | Study | Style | Sizes | Length |
|---|---|---|---|---|
| 01 | Motion Résumé | dark, one accent, HUD, kinetic type, depth, particles, motion blur | landscape · vertical | 15 s · 60 fps |
| 02 | Vertical App Ad | floating UI, soft shadows, word-by-word serif captions | vertical · landscape | 30 s · 30 fps |
| 03 | One-Shape Loop | one shape morphing through an interaction, seamless | square · landscape | 8 s · 60 fps |
| 04 | Print Carousel | risograph overprint, halftones, grain | portrait · square | 4 slides |
| 05 | Sketch Explainer | blueprint drawing that draws itself on | landscape · vertical | 20 s · 30 fps |
| 06 | Kinetic Poster | type only: outline-to-fill words, marquees, colour-flash cards | landscape · vertical | 12 s · 60 fps |
| 07 | Particle Word | dust that becomes a word, a point-cloud sphere, a wave | landscape · square | 12 s · 60 fps |
| 08 | Data Story | a dark dashboard whose widgets animate their own data | landscape · vertical | 15 s · 30 fps |
| 09 | Shape Morph | one shape becomes every primitive over a reactive dot grid | square · landscape | 8 s · 60 fps loop |
| 10 | Layer Stack | isometric slabs over a sunburst, a node map, a memory starburst | vertical · square | 24 s |
| 11 | Pixel Parable | 8-bit characters, an icon swarm, a pixel serpent, crisp UI cut-ins | vertical · landscape | 25 s |
| 12 | Mascot Track | a robot mascot and one metaphor: build the track, race the road | vertical · square | 24 s |
| 13 | Annotated UI | hand-drawn circles, arrows and highlights on live UI | vertical · landscape | 23 s |
| 14 | Numbered Steps | giant morphing numerals, step scenes, a comment call to action | vertical · square | 24 s |
| 15 | Paper Collage | torn kraft paper, paper hands, stop-motion timing | vertical · landscape | 24 s |
| 16 | Agent Network | nodes, packets on dotted edges, orbit rings, a handoff log | landscape · vertical | 24 s |
| 17 | Dot Matrix | one dot grid: a filling calendar, dot lettering, a dot clock | square · vertical | 20 s |
| 18 | Feed Storm | a notification feed that floods, then folds into one decision | vertical · landscape | 23 s |
| 19 | Offer Cards | plan cards that fan and compare, a "Comment" call to action | vertical · portrait | 21 s |
| 20 | Before / After | one scene in two states behind a sweeping divider | vertical · landscape | 22 s |
| 21 | Morph Launch | a one-take morph chain: caption → glass prompt → dot → mark → app window, depth of field | landscape · vertical | 24 s · 60 fps |

Studies 10–20 learn from founder explainer reels on Instagram (@gregisenberg's team): serif caption ladders, one
metaphor per piece, a new visual on almost every phrase. Their colours, characters and brands are not used.
Study 21 learns from an agent-made product launch film shared on X: one continuous take of morphs, glass and depth
of field. Its colours, product and copy are not used.

## What every study keeps

- **The neutral pack.** Colours and fonts come from `brand/packs/studio/pack.json` through `kit/pack.ts`. Nothing is
  imported from Rotli's kit (`rotli/`, `studio/`) or `brand/brand.json`, so nothing here looks or sounds like Rotli.
- **The brand-neutral kit**, `src/canvas-core/kit/`: sizes, springs and easing, type, UI, depth, motion blur, score.
- **One source, every size.** A study exports one Film per size from a `make(size, id)` factory. Each size is
  designed: a vertical re-stacks, it never just crops.
- **Time is a function.** A study paints any fractional frame on its own (no simulation state), so motion blur can
  sample inside the shutter, renders run in parallel, and goldens hold.
- **Cuts on the beat.** Shots start on the beat grid (60 / bpm × fps frames); sound cues sit on exact frames.
- **Proof.** Contact sheets read by eye, no dead air (`tools/still-frames.mjs`), a seamless seam for loops
  (`tools/loop-seam.mjs`), about −16 LUFS, and a golden once approved.
- **Honest copy.** Oriel is invented. Studies never claim anything about a real company or person, and references
  (a public reel, an ad format) are credited by link, never copied or committed.

## Files

- `briefs/<id>.json`: the contract for each study (story beats, style, sizes, sound, what it teaches).
- `prompts/<id>.prompt.md`: the exact prompt an agent was given, from `node tools/study-prompt.mjs <brief>`
  (the rules are `workflows/study-preamble.md`).
- `portable/<id>.md`: a **portable prompt** anyone can paste into Claude (or any capable model) to get a piece in the
  same style with no tie to this repository: one self-contained HTML file, Canvas 2D, Google Fonts, the same beats
  and quality rules. Generated from the brief (its `portable` notes) by `node tools/portable-prompt.mjs --all`
  through `workflows/portable-template.md`; the site's Prompt library lists them with a Copy button.
- Sources: `src/canvas-core/studies/<module>.ts`, hosts `src/hosts/page-<pieceId>.ts`.
- Make your own study: copy a brief, run `study-prompt.mjs`, build (yourself or with an agent), verify, then
  register the pieces in `pieces.json` and in the `studies` series in `series.json`.
