# anidoodle (third-party, Apache-2.0)

The motion room's render engine began as the scaffold of **anidoodle**
(<https://github.com/alexgreensh/anidoodle>, Copyright 2026 Alex Greenshpun), licensed under the
**Apache License, Version 2.0**. This folder carries that licence (`LICENSE`) and anidoodle's `NOTICE`
unchanged (both byte-identical to upstream). Vendored from upstream commit
`9a1a762f6e0feb49c830ff73cad4cd9d60ea08dd` (2026-09-22) via anidoodle's own `tools/scaffold.mjs`. The upstream
files' hashes are recorded in `upstream.json`; the lists below are generated from them by
`node tools/third-party-inventory.mjs` (`--check` proves every modified file carries its change notice).

Everything in this repository that is not listed below is Rotli's work under the repository's MIT
licence (`/LICENSE`), except the brand fonts, which keep their own licences (see the root `NOTICE`). anidoodle's name is used here only to attribute its work; it does not endorse Rotli.

## How Apache-2.0 §4 is met

| Obligation | Where |
|---|---|
| 4(a) give recipients a copy of the License | `motion/third_party/anidoodle/LICENSE` (also in the hosted snapshot) |
| 4(b) modified files carry prominent change notices | a first-line `// Derived from anidoodle … modified by Rotli contributors.` in each modified source file; `package-lock.json` (no comments possible) is listed below |
| 4(c) keep upstream copyright/attribution notices | upstream source files carry no per-file notices; every file below is otherwise kept as distributed |
| 4(d) include the NOTICE attributions | this folder's `NOTICE` and the repository root `NOTICE` |

<!-- inventory:start (node motion/tools/third-party-inventory.mjs) -->

## Files from anidoodle in `motion/` (the live room)

Unchanged (byte-identical to upstream):

- `motion/package.json`
- `motion/src/canvas-core/core.ts`
- `motion/tools/adapters/README.md`
- `motion/tools/adapters/html-player.mjs`
- `motion/tools/adapters/hyperframes.mjs`
- `motion/tools/adapters/playwright.mjs`
- `motion/tools/adapters/remotion.mjs`
- `motion/tools/adapters/remotion/canvas.tsx`
- `motion/tools/deadair.mjs`
- `motion/tools/detect.mjs`
- `motion/tools/emit.mjs`
- `motion/tools/gate.mjs`
- `motion/tools/render.mjs`
- `motion/tools/scaffold.mjs`
- `motion/tools/snap.mjs`
- `motion/tools/still.mjs`
- `motion/tools/verify-frame-adapter.mjs`
- `motion/tsconfig.json`

Modified by Rotli contributors (a change notice on the first line; JSON files cannot carry one):

- `motion/package-lock.json`
- `motion/src/canvas-core/examples/balloon.ts` (moved from `src/canvas-core/balloon.ts`)
- `motion/src/canvas-core/examples/banner.ts` (moved from `src/canvas-core/banner.ts`)
- `motion/src/canvas-core/examples/fox.ts` (moved from `src/canvas-core/fox.ts`)
- `motion/src/canvas-core/examples/koi.ts` (moved from `src/canvas-core/koi.ts`)
- `motion/src/canvas-core/examples/lighthouse.ts` (moved from `src/canvas-core/lighthouse.ts`)
- `motion/src/canvas-core/examples/mellan.ts` (moved from `src/canvas-core/mellan.ts`)
- `motion/src/canvas-core/examples/mellanUnspool.ts` (moved from `src/canvas-core/mellanUnspool.ts`)
- `motion/src/canvas-core/examples/moonPhases.ts` (moved from `src/canvas-core/moonPhases.ts`)
- `motion/src/canvas-core/examples/pocketWatch.ts` (moved from `src/canvas-core/pocketWatch.ts`)
- `motion/src/canvas-core/examples/ranunculus.ts` (moved from `src/canvas-core/ranunculus.ts`)
- `motion/src/canvas-core/examples/score.ts` (moved from `src/canvas-core/score.ts`)
- `motion/src/canvas-core/examples/socialCard.ts` (moved from `src/canvas-core/socialCard.ts`)
- `motion/src/canvas-core/examples/styleGallery.ts` (moved from `src/canvas-core/styleGallery.ts`)
- `motion/src/canvas-core/examples/wren.ts` (moved from `src/canvas-core/wren.ts`)
- `motion/src/canvas-core/film.ts`
- `motion/src/canvas-core/styles/drafting.ts` (moved from `src/canvas-core/drafting.ts`)
- `motion/src/canvas-core/styles/gallery.ts` (moved from `src/canvas-core/gallery.ts`)
- `motion/src/canvas-core/styles/lettering.ts` (moved from `src/canvas-core/lettering.ts`)
- `motion/src/canvas-core/styles/print.ts` (moved from `src/canvas-core/print.ts`)
- `motion/src/canvas-core/styles/riso.ts` (moved from `src/canvas-core/riso.ts`)
- `motion/src/canvas-core/styles/storybook.ts` (moved from `src/canvas-core/storybook.ts`)
- `motion/src/hosts/page-balloon.ts`
- `motion/src/hosts/page-banner.ts`
- `motion/src/hosts/page-fox.ts`
- `motion/src/hosts/page-koi.ts`
- `motion/src/hosts/page-lighthouse.ts`
- `motion/src/hosts/page-mellan.ts`
- `motion/src/hosts/page-mellanUnspool.ts`
- `motion/src/hosts/page-moonPhases.ts`
- `motion/src/hosts/page-pocketWatch.ts`
- `motion/src/hosts/page-ranunculus.ts`
- `motion/src/hosts/page-socialCard.ts`
- `motion/src/hosts/page-styleGallery.ts`
- `motion/src/hosts/page-wren.ts`
- `motion/src/hosts/page.ts`
- `motion/tools/build-page.mjs`

## Files from anidoodle in `archive/films/quokka-film-original/` (frozen archive of the first film)

Unchanged (byte-identical to upstream):

- `archive/films/quokka-film-original/package.json`
- `archive/films/quokka-film-original/src/canvas-core/balloon.ts`
- `archive/films/quokka-film-original/src/canvas-core/banner.ts`
- `archive/films/quokka-film-original/src/canvas-core/core.ts`
- `archive/films/quokka-film-original/src/canvas-core/drafting.ts`
- `archive/films/quokka-film-original/src/canvas-core/film.ts`
- `archive/films/quokka-film-original/src/canvas-core/fox.ts`
- `archive/films/quokka-film-original/src/canvas-core/gallery.ts`
- `archive/films/quokka-film-original/src/canvas-core/koi.ts`
- `archive/films/quokka-film-original/src/canvas-core/lettering.ts`
- `archive/films/quokka-film-original/src/canvas-core/lighthouse.ts`
- `archive/films/quokka-film-original/src/canvas-core/mellan.ts`
- `archive/films/quokka-film-original/src/canvas-core/mellanUnspool.ts`
- `archive/films/quokka-film-original/src/canvas-core/moonPhases.ts`
- `archive/films/quokka-film-original/src/canvas-core/pocketWatch.ts`
- `archive/films/quokka-film-original/src/canvas-core/print.ts`
- `archive/films/quokka-film-original/src/canvas-core/ranunculus.ts`
- `archive/films/quokka-film-original/src/canvas-core/riso.ts`
- `archive/films/quokka-film-original/src/canvas-core/score.ts`
- `archive/films/quokka-film-original/src/canvas-core/socialCard.ts`
- `archive/films/quokka-film-original/src/canvas-core/storybook.ts`
- `archive/films/quokka-film-original/src/canvas-core/styleGallery.ts`
- `archive/films/quokka-film-original/src/canvas-core/wren.ts`
- `archive/films/quokka-film-original/src/hosts/page-balloon.ts`
- `archive/films/quokka-film-original/src/hosts/page-banner.ts`
- `archive/films/quokka-film-original/src/hosts/page-fox.ts`
- `archive/films/quokka-film-original/src/hosts/page-koi.ts`
- `archive/films/quokka-film-original/src/hosts/page-lighthouse.ts`
- `archive/films/quokka-film-original/src/hosts/page-mellan.ts`
- `archive/films/quokka-film-original/src/hosts/page-mellanUnspool.ts`
- `archive/films/quokka-film-original/src/hosts/page-moonPhases.ts`
- `archive/films/quokka-film-original/src/hosts/page-pocketWatch.ts`
- `archive/films/quokka-film-original/src/hosts/page-ranunculus.ts`
- `archive/films/quokka-film-original/src/hosts/page-socialCard.ts`
- `archive/films/quokka-film-original/src/hosts/page-styleGallery.ts`
- `archive/films/quokka-film-original/src/hosts/page-wren.ts`
- `archive/films/quokka-film-original/tools/adapters/README.md`
- `archive/films/quokka-film-original/tools/adapters/html-player.mjs`
- `archive/films/quokka-film-original/tools/adapters/hyperframes.mjs`
- `archive/films/quokka-film-original/tools/adapters/playwright.mjs`
- `archive/films/quokka-film-original/tools/adapters/remotion.mjs`
- `archive/films/quokka-film-original/tools/adapters/remotion/canvas.tsx`
- `archive/films/quokka-film-original/tools/deadair.mjs`
- `archive/films/quokka-film-original/tools/detect.mjs`
- `archive/films/quokka-film-original/tools/emit.mjs`
- `archive/films/quokka-film-original/tools/gate.mjs`
- `archive/films/quokka-film-original/tools/render.mjs`
- `archive/films/quokka-film-original/tools/scaffold.mjs`
- `archive/films/quokka-film-original/tools/snap.mjs`
- `archive/films/quokka-film-original/tools/still.mjs`
- `archive/films/quokka-film-original/tools/verify-frame-adapter.mjs`
- `archive/films/quokka-film-original/tsconfig.json`

Modified by Rotli contributors (a change notice on the first line; JSON files cannot carry one):

- `archive/films/quokka-film-original/package-lock.json`
- `archive/films/quokka-film-original/src/hosts/page.ts`
- `archive/films/quokka-film-original/tools/build-page.mjs`

<!-- inventory:end -->

## Rotli code that uses anidoodle

The rest of `motion/tools/` and `motion/src/` is Rotli's own code. Some of it imports the modules above
(`build-page.mjs`, `detect.mjs`, `adapters/playwright.mjs`), and `tools/frames.mjs`, `tools/discover.mjs`
and the archived `archive/films/quokka-film-original/tools/frames.mjs` reuse anidoodle's one-line `arg` helper
from `tools/render.mjs` (marked in place). Rendered films and images are output, not part of the Work.
