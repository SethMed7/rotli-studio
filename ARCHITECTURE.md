# Architecture: where everything lives

The studio is one repository: the **Motion room**, a **sound** kit, and the
tooling that publishes a read-only snapshot. Every kind of thing has exactly one home; if you are adding
something, find its row below. If no row fits, add a row here in the same change.

## The map

| What | Where | Notes |
|---|---|---|
| **The studio site (server)** | `server.ts` | Bun, `127.0.0.1:4500`, Host-checked. `/` = the Motion room. |
| Motion room site: pages | `src/motion/app.ts`, `player.ts`, `sound.ts`, `md.ts`, `paths.ts` | Pages at real paths (`/piece/<id>`, `/series/studies`), routed with the History API; `paths.ts` lists them for the app, `server.ts` and the Caddyfile. Old `#/…` links are rewritten on load. Bundled by `server.ts`. |
| "Make one for your product" | `src/motion/wizard.ts` | `/use`: eight steps of questions with pointers; the result is a prompt that has any model interview the visitor, fetch their assets, write a brief, build and review. Calls no model; answers stay in localStorage. |
| The studio's hero pattern | `library/patterns/studio-pattern.svg` | Studio-owned (cameras, film, keyframes). `hero-pattern.svg` beside it is Rotli's, synced by `scripts/sync-library.ts`; never edit that one. |
| Motion room site: server side | `src/motion/routes.ts` | Manifest, files (`/m/*`, `/s/*` = git-tracked allowlist), posters, verify. |
| Site HTML and CSS | `static/motion.*`, with the shared tokens and base rules in `static/app.css` | UI rules: `DESIGN.md`. |
| Rendered stills and carousel slides | `exports/<slug>/<format>/` (gitignored) | Local output of `studio.mjs render`. |
| **Motion room** (the engine) | `motion/src/canvas-core/core.ts`, `film.ts`, `studio/` | Pure `renderFrame(frame)` + `audio()`. |
| Rotli-specific building blocks | `motion/src/canvas-core/rotli/`, `quokka/`, `studio/` | Island props, score, the quokka rig, the story engine and atmospheres. Read `brand/`. |
| **Brand-neutral kit** | `motion/src/canvas-core/kit/` | Sizes, springs and easing, type, caption ladders, UI, depth, motion blur, a beat score. Reads only a brand pack, never Rotli's. |
| The cast library | `motion/src/canvas-core/kit/cast.ts` | Characters as data: one parametric rig per species (a person, a standing and a sitting doodle, a slider turtle), one preset per character, three dials (head, build, stature) and numbered poses, in a soft-vinyl look (gradients, no filters). The Maker, Red and Parti are inspired by the owner and the owner's dogs; used by nothing yet (see `docs/proposals/2026-09-29-cast-and-room-to-think.md`). |
| Foley | `motion/src/canvas-core/kit/foley.ts` | Sound designed from its source (knobs, taps, lamps, paper, fabric, steps, collar tags, paws, shells, keys, pencil): a piece writes a cue table and `foley()` renders it over a room tone, mastered to a loudness target. `beatScore` is the kit's music; this is its foley. |
| **Brand packs** | `motion/brand/packs/<id>/` | `pack.json` (product, palettes, fonts with sha256) + `fonts/` with their licences. `studio` is the neutral pack. |
| **Wallpapers** | `motion/src/canvas-core/wallpapers.ts` (+ one shim and host per screen) | The maker's one source: screens (`WALLPAPER_SCREENS`: exact output pixels), backgrounds (plain theme grounds and scenes), quokka placement, presets, and `paintWallpaper`, drawn with the short side at 1080 and scaled to the device. Not pieces. |
| The wallpaper maker (site page) | `motion/src/site/wallpaperMaker.ts` | `/wallpapers`: screen → background (any colour: a flat ground, or a scene graded to its hue) → quokka (dragged into place on the preview, sized by hand) → download, drawn in the visitor's browser. Its own bundle (`/build/wallpapers.js`), loaded only on that page. |
| Wallpaper quokka looks | `motion/brand/wallpaper-looks.json` → `library/wallpaper-looks/*.webp` | Every emotion × colour × accessory, rendered from the app's real `<Character>` by `scripts/render-companions.ts --spec`; lossless WebP. Filled accessories are white with a `tint-<pose>-<accessory>` colour mask beside them, so the maker colours them. |
| Wallpaper golden | `motion/tools/wallpapers.mjs`, `motion/golden/wallpapers.json` | Every preset on every screen through `paintWallpaper`; `--check` proves nothing moved. |
| **Thumbnails** (the designed posters of Rotli's videos) | `motion/src/canvas-core/thumbnails.ts`, `motion/brand/thumbnails.json`, `motion/tools/thumbnails.mjs` → `motion/out/thumbnails/<slug>.jpg` (gitignored), `motion/golden/thumbnails.json` | One per Rotli video (not the studies): the piece's own frame pushed in on the quokka beside a title panel, 1280×720 for landscape, a 1080×1920 cover for vertical. The per-piece picks (frame, focus, zoom, title, key word, label) are data in the JSON; the tool builds one page per thumbnail and `--check` proves nothing moved. The site uses them as posters; `scripts/media.ts` publishes them. |
| **Studies** (non-Rotli pieces) | `motion/src/canvas-core/studies/` | One module per study, one Film per size; briefs and prompts in `motion/series/studies/`. Each brief names its `family` (how the site groups it) and `subject`: `oriel` (the imaginary product), `learn` (a real topic, with a `facts` list of claims and sources) or `fun` (no product). |
| **Portable prompts** (copy into any model) | `motion/series/studies/portable/` | Generated from each brief by `motion/tools/portable-prompt.mjs` via `motion/workflows/portable-template.md`; no repository ties. |
| Render styles (from anidoodle) | `motion/src/canvas-core/styles/` | gallery, drafting, print, riso, storybook, lettering. |
| Engine examples (from anidoodle) | `motion/src/canvas-core/examples/` | Reference pieces; not part of any series. |
| **Piece sources** | `motion/src/canvas-core/<pieceId>.ts` + `motion/src/hosts/page-<pieceId>.ts` | The host's import line is the piece's module. |
| The catalogue | `motion/pieces.json` | Every piece: id, kind, slug, format, caption. |
| **Series** | `motion/series.json` + `motion/series/<series-id>/` | One folder per series: `bible.md`, `episodes/*.json` (briefs), `prompts/*.prompt.md`, and any series notes (e.g. `the-film/story.md`, `score.txt`). |
| How pieces are made | `motion/workflows/` | `README.md` (process), `agent-preamble.md`, `review-checklist.md`, `critique.md` (the scored critique: seven criteria, 8+ to ship). |
| Critique records | `motion/series/studies/critiques/<pieceId>.json` | One file per piece, a round per critique: pacing numbers, scores, problems with timestamps, what the building agent saw and missed. Sheets come from `motion/tools/critique.mjs`. |
| **Field notes** (the Journal) | `motion/series/studies/notes/<yyyy-mm-dd>-<slug>.md` | Long-form, sourced write-ups of what we tried and measured. Title = the first `# ` line, summary = the first `> ` line; the manifest lists them at `/journal`, newest first; each opens at `/note/<file>`. |
| Agent runs (what built each piece) | `motion/workflows/runs/` | Recovered by `motion/tools/extract-runs.mjs`; redacted. |
| Goldens (pixel/audio fingerprints) | `motion/golden/<pieceId>.json` | `node motion/tools/studio.mjs golden all` must print SAME. |
| Rotli's brand data | `motion/brand/` (`brand.json`, `themes.json`, `companions.json`) | Rotli's own pack, synced from the rotli app on purpose, never hand-edited. |
| Brand fonts for renders | `motion/assets/fonts/` | See the licence notes in `NOTICE`. |
| The owner's turtle | `motion/assets/turtle/` | Four poses of the maintainer's personal mascot, downscaled from their portfolio, used only by the Doodle Guide study. All rights reserved, not MIT (`NOTICE`). |
| Motion tools | `motion/tools/*.mjs` | Run with Node from `motion/`. Each has a usage header. |
| Motion renders | `motion/out/` (gitignored) | Videos, posters, thumbnails, the manifest. |
| **Sound** | `sound/` | `src/` (synth + recipes), `prompts/` (one per sound), `tools/render.ts`, `web/` (committed AAC), `catalog.json`, `out/` (gitignored WAV masters). Music with a `playlist` entry (family, theme, key, bpm) is a track of the studio's playlist, one per theme family, all mastered to −21 LUFS; `src/motion/sound.ts` plays it through. |
| **Library** (shared assets) | `library/` | Logo + favicons, fonts, patterns, themes, companion looks, captures, uploads. |
| Studio scripts | `scripts/*.ts` (+ `scripts/lib/`) | Run with Bun from the root: sync, export, audits, link-post. |
| **Publishing records** | `publish/` | `posts.json` (the owner's published posts, links only, via `scripts/link-post.ts`) and `placements.json` (studio pieces placed in a product on purpose). |
| Hosting | `deploy/` | Caddy + Dockerfile + `README.md`; `*.local.txt` are private and gitignored. |
| Continuous deployment | `.github/workflows/deploy.yml`, `scripts/media.ts`, `scripts/split-site.ts` | Push to `main` → gates → fetch the published renders → build → move heavy media to the `studio-site` release → Railway builds an image that fetches them. Renders are release assets (`studio-media`), not git. Full-size wallpapers are assets of their own release, `studio-wallpapers`, which the Wallpapers page links; only their previews are in the snapshot. |
| Skills (agent instructions) | `.claude/skills/<name>/SKILL.md` | `motion-room`, `repurpose-brand`, `brand-motion-studio`. |
| Front door and project docs | `README.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `CHANGELOG.md`, `docs/media/` | The README's images live in `docs/media/`. |
| Agent rules | `AGENTS.md` (+ `CLAUDE.md`, which imports it) | Read first. |
| Editor project icon | `t3.json` | Points T3 Code at `library/logo/favicon-192.png`, the studio's favicon, so the project shows the quokka. |
| Repository settings in files | `.github/` (`CODEOWNERS`, `pull_request_template.md`, `ISSUE_TEMPLATE/`, `rulesets/`, `workflows/`) | Owner-only review; the deploy workflow. `rulesets/` records the live GitHub rulesets (only the owner deletes or force-pushes any branch, moves or deletes any tag, or updates `main`); change them on GitHub and here together. |
| Contributing and quality gates | `CONTRIBUTING.md`, `scripts/verify.ts`, `.oxlintrc.json`, `.oxfmtrc.json` | `bun run verify` runs every gate; `bun run lint`, `bun run fmt`. |
| Design rules for the site | `DESIGN.md` | |
| Docs | `docs/` | `use-it-for-your-product.md` (start here to adapt the studio), `evaluation.md` (what ports to other products), `launch/` (the launch calendar), `reviews/<date>-<reviewer>/` (external reviews, their prompts and the triage), `proposals/` (plans awaiting the owner). |
| Licences | `LICENSE` (MIT), `NOTICE`, `motion/third_party/anidoodle/` | Apache-2.0 attribution for the engine. |
| Archive | `archive/` | Frozen earlier projects (`films/`); read-only history, never built. |
| Local-only material | `local/`, `tmp/` (gitignored) | Nothing here is ever published. |

## Boundaries

- **The public boundary.** The repository is public. `bun run check:public` (the pre-push hook) scans the committed
  bytes of every pushed commit; the site snapshot (`scripts/export-site.ts`) scans what it writes with the same
  rules (`scripts/lib/privacy.ts`).
- **The product boundary.** The studio reads product repos (brand sources) and never writes to them;
  `bun scripts/check-isolation.ts` proves it. Anything placed in a product on purpose is declared in
  `publish/placements.json`.
- **The local boundary.** The server serves only git-tracked files under an allowlist (plus generated renders), on
  loopback, to the studio's own Host. Create and the isolation audit never ship in the hosted snapshot.
- **Sealed pieces.** A piece is sealed by `"sealed": true` on it in `pieces.json` or on its series in `series.json`.
  Its goldens must stay SAME, and `golden.mjs --record` refuses it unless `--unseal` says the owner decided otherwise.

## Adding things

- **A piece:** source + host in `motion/src/`, register it in `pieces.json`, assign it to a series in
  `series.json`, render, check, record its golden. See `motion/workflows/README.md`. A Rotli video (any video that is
  not a study) also gets a row in `motion/brand/thumbnails.json`, then `node motion/tools/thumbnails.mjs --only <slug>`.
- **A series:** a `series.json` entry plus `motion/series/<series-id>/` for its bible, briefs and prompts.
- **A study** (or any brand-neutral piece): a brief in `motion/series/studies/briefs/`, its prompt from
  `node motion/tools/study-prompt.mjs <brief>`, a module in `motion/src/canvas-core/studies/` built on `kit/` and a
  pack; register each size in `pieces.json`. See `docs/use-it-for-your-product.md`.
- **A brand pack:** copy `motion/brand/packs/studio/`, replace fonts (with licences), hashes and palettes.
- **A sound:** a recipe in `sound/src/recipes.ts`, its prompt in `sound/prompts/<id>.md`, then
  `bun sound/tools/render.ts`.
- **A skill:** `.claude/skills/<name>/SKILL.md`; it appears on the site's Skills page automatically.
- **A tool:** `motion/tools/` (Node, for the engine) or `scripts/` (Bun, for the studio), with a usage header; it
  appears on the Tools page automatically.
- **A doc:** `docs/` (or next to what it documents, if it belongs to one folder), and link it from the site's
  Docs page in `src/motion/app.ts`.
