# anidoodle (third-party, Apache-2.0)

The motion room's render engine began as the scaffold of **anidoodle**
(<https://github.com/alexgreensh/anidoodle>, Copyright 2026 Alex Greenshpun), licensed under the
**Apache License, Version 2.0**. This folder carries that licence (`LICENSE`) and anidoodle's `NOTICE`
unchanged (both byte-identical to upstream). Vendored from upstream commit
`9a1a762f6e0feb49c830ff73cad4cd9d60ea08dd` (2026-09-22) via anidoodle's own `tools/scaffold.mjs`.

Everything in this repository that is not listed below is Rotli's work under the repository's MIT
licence (`/LICENSE`). anidoodle's name is used here only to attribute its work; it does not endorse Rotli.

## How Apache-2.0 §4 is met

| Obligation | Where |
|---|---|
| 4(a) give recipients a copy of the License | `motion/third_party/anidoodle/LICENSE` (also in the hosted snapshot) |
| 4(b) modified files carry prominent change notices | a first-line `// Derived from anidoodle … modified by Rotli contributors.` in each modified source file; `package-lock.json` (no comments possible) is listed below |
| 4(c) keep upstream copyright/attribution notices | upstream source files carry no per-file notices; every file below is otherwise kept as distributed |
| 4(d) include the NOTICE attributions | this folder's `NOTICE` and the repository root `NOTICE` |

## Files from anidoodle in `motion/` (the live room)

Unchanged:

- `motion/package.json`
- `motion/src/canvas-core/balloon.ts`
- `motion/src/canvas-core/banner.ts`
- `motion/src/canvas-core/core.ts`
- `motion/src/canvas-core/drafting.ts`
- `motion/src/canvas-core/fox.ts`
- `motion/src/canvas-core/gallery.ts`
- `motion/src/canvas-core/koi.ts`
- `motion/src/canvas-core/lettering.ts`
- `motion/src/canvas-core/lighthouse.ts`
- `motion/src/canvas-core/mellan.ts`
- `motion/src/canvas-core/mellanUnspool.ts`
- `motion/src/canvas-core/moonPhases.ts`
- `motion/src/canvas-core/pocketWatch.ts`
- `motion/src/canvas-core/print.ts`
- `motion/src/canvas-core/ranunculus.ts`
- `motion/src/canvas-core/riso.ts`
- `motion/src/canvas-core/score.ts`
- `motion/src/canvas-core/socialCard.ts`
- `motion/src/canvas-core/storybook.ts`
- `motion/src/canvas-core/styleGallery.ts`
- `motion/src/canvas-core/wren.ts`
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

Modified by Rotli contributors (brand-font sha256 lock, film meta `family`, page host, dependencies):

- `motion/package-lock.json`
- `motion/src/canvas-core/film.ts`
- `motion/src/hosts/page.ts`
- `motion/tools/build-page.mjs`

## Files from anidoodle in `films/quokka-film-original/` (frozen archive of the first film)

Unchanged:

- `films/quokka-film-original/package.json`
- `films/quokka-film-original/src/canvas-core/balloon.ts`
- `films/quokka-film-original/src/canvas-core/banner.ts`
- `films/quokka-film-original/src/canvas-core/core.ts`
- `films/quokka-film-original/src/canvas-core/drafting.ts`
- `films/quokka-film-original/src/canvas-core/film.ts`
- `films/quokka-film-original/src/canvas-core/fox.ts`
- `films/quokka-film-original/src/canvas-core/gallery.ts`
- `films/quokka-film-original/src/canvas-core/koi.ts`
- `films/quokka-film-original/src/canvas-core/lettering.ts`
- `films/quokka-film-original/src/canvas-core/lighthouse.ts`
- `films/quokka-film-original/src/canvas-core/mellan.ts`
- `films/quokka-film-original/src/canvas-core/mellanUnspool.ts`
- `films/quokka-film-original/src/canvas-core/moonPhases.ts`
- `films/quokka-film-original/src/canvas-core/pocketWatch.ts`
- `films/quokka-film-original/src/canvas-core/print.ts`
- `films/quokka-film-original/src/canvas-core/ranunculus.ts`
- `films/quokka-film-original/src/canvas-core/riso.ts`
- `films/quokka-film-original/src/canvas-core/score.ts`
- `films/quokka-film-original/src/canvas-core/socialCard.ts`
- `films/quokka-film-original/src/canvas-core/storybook.ts`
- `films/quokka-film-original/src/canvas-core/styleGallery.ts`
- `films/quokka-film-original/src/canvas-core/wren.ts`
- `films/quokka-film-original/src/hosts/page-balloon.ts`
- `films/quokka-film-original/src/hosts/page-banner.ts`
- `films/quokka-film-original/src/hosts/page-fox.ts`
- `films/quokka-film-original/src/hosts/page-koi.ts`
- `films/quokka-film-original/src/hosts/page-lighthouse.ts`
- `films/quokka-film-original/src/hosts/page-mellan.ts`
- `films/quokka-film-original/src/hosts/page-mellanUnspool.ts`
- `films/quokka-film-original/src/hosts/page-moonPhases.ts`
- `films/quokka-film-original/src/hosts/page-pocketWatch.ts`
- `films/quokka-film-original/src/hosts/page-ranunculus.ts`
- `films/quokka-film-original/src/hosts/page-socialCard.ts`
- `films/quokka-film-original/src/hosts/page-styleGallery.ts`
- `films/quokka-film-original/src/hosts/page-wren.ts`
- `films/quokka-film-original/tools/adapters/README.md`
- `films/quokka-film-original/tools/adapters/html-player.mjs`
- `films/quokka-film-original/tools/adapters/hyperframes.mjs`
- `films/quokka-film-original/tools/adapters/playwright.mjs`
- `films/quokka-film-original/tools/adapters/remotion.mjs`
- `films/quokka-film-original/tools/adapters/remotion/canvas.tsx`
- `films/quokka-film-original/tools/deadair.mjs`
- `films/quokka-film-original/tools/detect.mjs`
- `films/quokka-film-original/tools/emit.mjs`
- `films/quokka-film-original/tools/gate.mjs`
- `films/quokka-film-original/tools/render.mjs`
- `films/quokka-film-original/tools/scaffold.mjs`
- `films/quokka-film-original/tools/snap.mjs`
- `films/quokka-film-original/tools/still.mjs`
- `films/quokka-film-original/tools/verify-frame-adapter.mjs`
- `films/quokka-film-original/tsconfig.json`

Modified by Rotli contributors:

- `films/quokka-film-original/package-lock.json`
- `films/quokka-film-original/src/hosts/page.ts`
- `films/quokka-film-original/tools/build-page.mjs`

## Rotli code that uses anidoodle

The rest of `motion/tools/` and `motion/src/` is Rotli's own code. Some of it imports the modules above
(`build-page.mjs`, `detect.mjs`, `adapters/playwright.mjs`), and `tools/frames.mjs`, `tools/discover.mjs`
and the archived `films/quokka-film-original/tools/frames.mjs` reuse anidoodle's one-line `arg` helper
from `tools/render.mjs` (marked in place). Rendered films and images are output, not part of the Work.
