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
| 04 | Print Carousel | risograph overprint, halftones, grain | portrait · square | 6 slides |
| 05 | Sketch Explainer | blueprint drawing that draws itself on | landscape · vertical | 20 s · 30 fps |

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
- Sources: `src/canvas-core/studies/<module>.ts`, hosts `src/hosts/page-<pieceId>.ts`.
- Make your own study: copy a brief, run `study-prompt.mjs`, build (yourself or with an agent), verify, then
  register the pieces in `pieces.json` and in the `studies` series in `series.json`.
