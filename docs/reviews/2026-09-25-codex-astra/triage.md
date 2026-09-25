# Triage: Codex (gpt-6-astra) review, 2026-09-25

Three read-only reviews of the whole studio, each with its own prompt in this folder: **security**
(`security.md`), **architecture** (`architecture.md`) and **product / UX** (`product.md`). The reviewer changed
nothing. This is what was done with each finding: **Fixed**, **Partly fixed**, **Disagree** (with the reason),
**Deferred** (agreed, not done yet) or **Owner** (needs the owner's decision).

## Security

| # | Finding | Verdict | What changed |
|---|---|---|---|
| S1 | Encoded `..` bypasses the file allowlist (confirmed: `/s/scripts/%2e%2e%2f…` reached a private file) | Fixed | `routes.ts allowed()` decodes and normalizes first, authorizes the resolved path, rejects dotfiles, `node_modules`, NUL and symlink escapes, and serves only git-tracked files (plus renders). The probe now returns 404. |
| S2 | Snapshot publishes every editor export, drafts included | Fixed | The export publishes only the stills and slides the manifest references; Create's drafts in `exports/` never ship. |
| S3 | Privacy scan misses most of the published artifact | Fixed | The export builds into `site-dist.staging/`, scans every staged file (bundle, CSS, API JSON, docs, file names) with the pre-push gate's rules (`scripts/lib/privacy.ts`, now including home paths and personal emails), requires the private-name list, and replaces `site-dist/` only when clean. Tested with a planted name: it stopped and left `site-dist/` untouched. |
| S4 | Loopback is the only access boundary (no Host/Origin check) | Partly fixed | Every route checks `Host` against `127.0.0.1:PORT` / `localhost:PORT` (a foreign Host gets 403), which closes DNS rebinding and cross-site requests with a foreign Host. **Disagree** with per-session tokens: a browser cannot forge `Host`, and the server is loopback-only, so a token would add friction without closing a remaining hole. |
| S5 | Uploaded SVGs execute on the editor's origin | Fixed | Uploads are raster only (no SVG), and `/library/uploads/*` is served with `Content-Security-Policy: sandbox; default-src 'none'`. |
| S6 | Pre-push check scans the working tree, not the pushed bytes | Fixed | `check-public.ts` reads committed blobs (`git ls-tree` + `git cat-file`) for exactly the SHAs the hook receives, scans every text file (NUL sniff, including itself) and file names, and fails on errors. |
| S7 | Font licensing incomplete | Partly fixed · Owner | Baloo 2's full OFL now ships beside both copies and `NOTICE` has a fonts section; the anidoodle README no longer claims everything else is MIT. **Owner:** General Sans is ITF's, under Fontshare's terms; whether those terms allow redistributing the font files in a public repo needs the owner's check (removing it would change sealed pixels). |
| S8 | Owner-only posting is a URL pattern, not authorship proof | Fixed (reworded) | One shared validator (`scripts/lib/posts.ts`) is used by `link-post.ts` **and** the export (https only, anchored account patterns, dates, real piece ids). **Disagree** with network authorship checks: the docs now state the exact guarantee (a pattern on the owner's handle), and owner-only pushes keep strangers out. |
| S9 | No CSP on the hosted snapshot | Fixed | The inline bootstrap script became a `<meta name="studio-static">` tag; inline `onclick` handlers were removed; Caddy sends a CSP allowing only the snapshot's own files and no inline script. |
| S10 | Tooling can escape the lockfiles; mutable Caddy tag | Partly fixed · Deferred | The Caddy image is pinned by digest. Making the global Playwright/Chromium fallbacks opt-in is deferred with A6 (it changes which browser renders goldens). |

## Architecture

| # | Finding | Verdict | What changed |
|---|---|---|---|
| A1 | Snapshot includes more than the catalogue declares | Fixed | See S2/S3: an explicit inventory of git-tracked paths plus manifest-referenced media. |
| A2 | Sealed-piece lock accepts incomplete comparisons or bypass | Fixed | `golden.mjs` refuses `--record` on a sealed piece unless `--unseal`, fails on a size/length change, and counts a frame missing from the render as a difference. `studio.mjs golden` prints one final `GOLDEN: all N SAME` or `k of N DIFFER` line. |
| A3 | Export is not a clean-checkout build | Fixed | `manifest.mjs` creates `out/`; the export fails on pieces that do not load or videos not rendered, and swaps in the new snapshot atomically. |
| A4 | Companion harness writes inside the product checkout | Partly fixed · Disagree | It must: Vite has to serve the product's own source to render the real `<Character>`. It now writes only its gitignored `tmp/studio-companions/`, refuses to touch a folder that already exists, cleans up even when setup fails, and the audit now checks the right path. |
| A5 | Cache invalidation shows stale source and pixels | Fixed | Manifest staleness includes piece source, brand and briefs; exact frames re-render when the source or brand is newer. |
| A6 | Goldens can silently use a different browser | Deferred | Agreed. Recording and enforcing a browser fingerprint changes every golden file; planned together with S10. |
| A7 | Create and Motion share `exports/` | Fixed | Create refuses a slug that belongs to a Motion piece; a Motion render clears its old slides first, so a shorter carousel keeps no stale ones. |
| A8 | Commands do not fail on failure | Fixed | Unknown piece selections exit 2; the isolation audit exits 1 on FAIL; `sync-library` fails when theme sync fails. The engine's `render.mjs` is unchanged anidoodle code and keeps its behaviour. |
| A9 | Archived launch film has broken paths | Fixed (declared) | `archive/README.md` states it is a frozen record, not runnable as is. |
| A10 | Run extraction overwrites earlier runs | Fixed | `extract-runs.mjs` refuses to rebuild without every transcript that built the current runs (`--replace` drops them knowingly). |
| A11 | Sound has no verification contract | Fixed | `bun run check:sound` re-renders in memory and compares with `catalog.json`; renders write atomically; the web copies stay byte-identical. |
| A12 | Checks miss the integration boundaries | Partly fixed · Owner | New checks: `check:third-party` (the anidoodle inventory and change notices), `check:sound`, and the export's own gates. **Owner:** a CI workflow on the public repo (it runs after publication, so it complements the pre-push gate rather than replacing it). |
| A13 | History, examples and production code are mixed | Fixed · Partly deferred | Done: anidoodle's styles → `canvas-core/styles/`, examples → `canvas-core/examples/`, old films → `archive/`, series material → `motion/series/<id>/`, publishing records → `publish/`, docs → `docs/`, and `ARCHITECTURE.md` maps it all. **Disagree for now** with moving the app into `apps/studio/` and splitting every piece into `pieces/`: large blast radius (every host import, the manifest's module lookup, goldens) for a tidier tree. Proposed as a separate change. |

## Product and UX

| # | Finding | Verdict | What changed |
|---|---|---|---|
| P1 | Create can discard unsaved work or mark it saved wrongly | Fixed | Saves track a revision; `dirty` clears only when the saved revision is still current; replacing the post asks first. |
| P2 | Export continues after a failed save | Fixed | Export aborts if the save fails, disables its button while running, and shows fetch errors. |
| P3 | Late responses show another piece's content | Fixed | Each navigation has a generation id; stale results are dropped. |
| P4 | "Skip to content" destroys the page | Fixed | The skip link focuses `#main` without routing; focus moves to the heading after a page turn. |
| P5 | Media lacks text alternatives | Fixed | Slide alt text and named scene buttons ("Seek to …"). |
| P6 | Loading failures become permanent | Fixed | Section errors with Retry, a recoverable boot state, and storage access that never throws. |
| P7 | Autoplay contradicts DESIGN.md; reduced motion incomplete | Disagree (rule fixed) | The muted, on-screen-only autoplay was an owner request (match rotli.co's film). `DESIGN.md` now states that rule. Reduced motion and Save-Data get the poster only; smooth scrolling respects the preference. |
| P8 | A remembered "Sound on" does the opposite | Fixed | Choice and playback are separate states; a click always flips the choice. |
| P9 | Previews compete with the music | Fixed | Any playing media with sound ducks the music; previews pause each other. |
| P10 | Tab and current-page semantics | Fixed | Format links are navigation with `aria-current="page"`. |
| P11 | Editor keyboard gaps | Deferred | Create's upload button, slide-row buttons and dialog labelling. |
| P12 | Create has no narrow layout | Disagree | Create is a desktop tool on the owner's Mac; a phone layout isn't worth its complexity now. |
| P13 | Docs list before the document on narrow screens | Deferred | Folded into the next stage's navigation redesign. |
| P14 | Selected rows fail contrast | Fixed | Selected-row foregrounds corrected in both rooms. |
| P15 | Hosted video metadata describes the master | Fixed | The export records the served web copy's size and fingerprint. |
| P16 | Fonts and thumbnails heavier than needed | Deferred | Responsive thumbnail sizes and a subset wordmark font. |
| P17 | Heading levels drift | Partly fixed | Embedded documents step their headings down a level; the rest goes with the navigation redesign. |
| P18 | Public copy assumes the local setup | Fixed | Skill path corrected; maintainer commands moved into a disclosure. |

## Needs the owner

1. **General Sans:** confirm that Fontshare's terms allow redistributing the font files in a public repo (S7).
2. **`apps/` and `pieces/` restructure:** do it as its own change, or not at all (A13).
3. **CI** on the public repo (A12).
4. **Posting by an agent** (Grok) to the owner's accounts: the design is a separate, owner-only decision; for now only the owner adds links, with `link-post.ts`.
