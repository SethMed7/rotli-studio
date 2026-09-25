# Architecture: where everything lives

The studio is one repository with two rooms (**Create** and the **Motion room**), a **sound** kit, and the
tooling that publishes a read-only snapshot. Every kind of thing has exactly one home; if you are adding
something, find its row below. If no row fits, add a row here in the same change.

## The map

| What | Where | Notes |
|---|---|---|
| **The studio site (server)** | `server.ts` | Bun, `127.0.0.1:4500`, Host-checked. `/` = Motion room, `/create` = Create. |
| Motion room site: pages | `src/motion/app.ts`, `player.ts`, `sound.ts`, `md.ts` | Hash routes; bundled by `server.ts`. |
| Motion room site: server side | `src/motion/routes.ts` | Manifest, files (`/m/*`, `/s/*` = git-tracked allowlist), posters, verify. |
| Site HTML and CSS | `static/motion.*` (Motion room), `static/app.*` + `slide.css` (Create) | UI rules: `DESIGN.md`. |
| **Create** (the content editor) | `src/app.ts`, `src/model.ts`, `src/templates.ts`, `src/exporter.ts` | HTML social templates → PNG. |
| Create's saved posts (drafts) | `posts/<slug>.json` | Editable content, never published by the snapshot. |
| Create's PNG exports | `exports/` (gitignored) | Local output only. |
| **Motion room** (the engine) | `motion/src/canvas-core/core.ts`, `film.ts`, `studio/` | Pure `renderFrame(frame)` + `audio()`. |
| Rotli-specific building blocks | `motion/src/canvas-core/rotli/`, `quokka/`, `studio/` | Island props, score, the quokka rig, the story engine and atmospheres. Read `brand/`. |
| **Brand-neutral kit** | `motion/src/canvas-core/kit/` | Sizes, springs and easing, type, UI, depth, motion blur, a beat score. Reads only a brand pack, never Rotli's. |
| **Brand packs** | `motion/brand/packs/<id>/` | `pack.json` (product, palettes, fonts with sha256) + `fonts/` with their licences. `studio` is the neutral pack. |
| **Studies** (non-Rotli pieces) | `motion/src/canvas-core/studies/` | One module per study, one Film per size; briefs and prompts in `motion/series/studies/`. |
| Render styles (from anidoodle) | `motion/src/canvas-core/styles/` | gallery, drafting, print, riso, storybook, lettering. |
| Engine examples (from anidoodle) | `motion/src/canvas-core/examples/` | Reference pieces; not part of any series. |
| **Piece sources** | `motion/src/canvas-core/<pieceId>.ts` + `motion/src/hosts/page-<pieceId>.ts` | The host's import line is the piece's module. |
| The catalogue | `motion/pieces.json` | Every piece: id, kind, slug, format, caption. |
| **Series** | `motion/series.json` + `motion/series/<series-id>/` | One folder per series: `bible.md`, `episodes/*.json` (briefs), `prompts/*.prompt.md`, and any series notes (e.g. `the-film/story.md`, `score.txt`). |
| How pieces are made | `motion/workflows/` | `README.md` (process), `agent-preamble.md`, `review-checklist.md`. |
| Agent runs (what built each piece) | `motion/workflows/runs/` | Recovered by `motion/tools/extract-runs.mjs`; redacted. |
| Goldens (pixel/audio fingerprints) | `motion/golden/<pieceId>.json` | `node motion/tools/studio.mjs golden all` must print SAME. |
| Rotli's brand data | `motion/brand/` (`brand.json`, `themes.json`, `companions.json`) | Rotli's own pack, synced from the rotli app on purpose, never hand-edited. |
| Brand fonts for renders | `motion/assets/fonts/` | See the licence notes in `NOTICE`. |
| Motion tools | `motion/tools/*.mjs` | Run with Node from `motion/`. Each has a usage header. |
| Motion renders | `motion/out/` (gitignored) | Videos, posters, thumbnails, the manifest. |
| **Sound** | `sound/` | `src/` (synth + recipes), `prompts/` (one per sound), `tools/render.ts`, `web/` (committed AAC), `catalog.json`, `out/` (gitignored WAV masters). |
| **Library** (shared assets) | `library/` | Logo + favicons, fonts, patterns, themes, companion looks, captures, uploads. |
| Studio scripts | `scripts/*.ts` (+ `scripts/lib/`) | Run with Bun from the root: sync, export, audits, link-post. |
| **Publishing records** | `publish/` | `posts.json` (the owner's published posts, links only, via `scripts/link-post.ts`) and `placements.json` (studio pieces placed in a product on purpose). |
| Hosting | `deploy/` | Caddy + Dockerfile + `README.md`; `*.local.txt` are private and gitignored. |
| Continuous deployment | `.github/workflows/deploy.yml`, `scripts/media.ts` | Push to `main` → gates → fetch the published renders → build → Railway. Renders are release assets (`studio-media`), not git. |
| Skills (agent instructions) | `.claude/skills/<name>/SKILL.md` | `motion-room`, `repurpose-brand`, `brand-motion-studio`. |
| Agent rules | `AGENTS.md` | Read first. |
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
  `series.json`, render, check, record its golden. See `motion/workflows/README.md`.
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
