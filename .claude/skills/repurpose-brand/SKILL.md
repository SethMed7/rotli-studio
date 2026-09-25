---
name: repurpose-brand
description: Take the rotli studio motion room as a foundation for ANOTHER product (Myela, a client, a new app): swap the brand seam, character, themes and copy while keeping the engine, tools, formats and piece templates. Use when asked to reuse this content system for a different brand.
---

# Repurpose the motion room for another product

**Run the guided flow: the global `brand-motion-studio` skill** (`~/.claude/skills/brand-motion-studio/SKILL.md`).
It asks the owner questions (Opus plus AskUserQuestion) around these deterministic tools. Why it's
shaped that way, and what is still Rotli-shaped: `docs/evaluation.md`.

The short version, if you are doing it by hand:

1. `node motion/tools/discover.mjs <url> --out <dir>/discovery`: computed type, CSS tokens, section grounds,
   fonts, marks, claims, FAQ, full-page shots.
2. `node motion/tools/propose-brand.mjs <dir>/discovery/discovery.json --out <dir>/brand.proposal`: a draft
   `brand.json` + `themes.json` + `evidence.md`. Every value is sourced; accent/deep list candidates.
3. `node motion/tools/new-studio.mjs <dir> --brand <dir>/brand.proposal`: a clean room (engine, templates, tools;
   no Rotli pieces, goldens or season). Then `node tools/frames.mjs brandLook 14` is the look gate.
4. **Brand seam fields** the templates read: `product` (chapter-card label), `url`, `cta` (carousel close),
   `promise` (end-card chips, split on " · "), `tagline`, `platform`, `fonts` (+ `display`, `tracking`),
   `palette`, `mark`/`pattern` (null = none), `character` (**null = typographic**: actor, looks and line art
   draw nothing).
5. Font files only with the owner's licence confirmation. Captions only from the product's own site.
6. Still Rotli-specific: `rotli/island.ts` and the `island-*`/`harbour-day`/`night-vault` atmospheres, the
   quokka rig, and `studio/ui.ts`'s notes-app window. Replace per product (see `docs/evaluation.md`).
