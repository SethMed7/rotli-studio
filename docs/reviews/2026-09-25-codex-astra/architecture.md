Rotli Studio has a strong creative core: explicit film contracts, recorded briefs and prompts, font locks, and a useful catalogue connecting pieces to their provenance. Its main architectural weakness is that rendering, verification, and publication depend too heavily on the current workstation’s files and implicit conventions. I would strengthen those contracts before reorganizing folders, especially the sealed-piece checks, snapshot publication boundary, cache invalidation, and product-repository isolation.

This was a read-only review; no repository files changed. Verification included source inspection, byte comparisons, regenerating prompts to stdout, and a synthetic in-memory check of golden comparison logic—not rendering or exporting.

## Findings, ordered by severity

No critical findings identified.

### High — 1. The public snapshot includes more than its catalogue declares

**Files:** `scripts/export-site.ts:49–51,65–83`; `scripts/check-public.ts:19–38`

The exporter recursively copies the entire `exports/` directory:

```ts
const studioText = [..., "scripts", "exports", ...];
```

That directory also contains local Create exports, not just Motion pieces. Consequently, an unrelated or obsolete editor export becomes public simply because it exists locally.

The publication scan also has incomplete coverage: sound prompts and catalogue data are copied at lines 49–51, while the scanner only examines the later `files` list. Its rules differ from `check-public.ts`, omitting the general home-path and email checks. The message “nothing exported” is inaccurate because files have already been written.

**Suggested fix:** Generate an explicit publication manifest from approved catalogue entries, scan every publishable text payload through one shared scanner, and reject undeclared artifacts. Build into a staging directory and promote it only after all checks succeed.

### High — 2. The sealed-piece lock can accept incomplete comparisons or be bypassed

**Files:** `motion/tools/golden.mjs:12–28`; `motion/tools/studio.mjs:31`; `motion/golden/rotliStory.json:2–7`

Comparison only examines baseline keys:

```js
Object.keys(g.hashes).filter((k) => g.hashes[k] !== now.hashes[k])
```

It does not compare `W`, `H`, duration, or the complete sample-key set; FPS is not recorded. An in-memory reproduction confirmed that extending the duration and adding a hash passes this comparison when existing hashes and audio remain unchanged.

The current sealed baseline contains 61 frame hashes, so newer sampling logic does not automatically increase its coverage. Additionally, the low-level `golden.mjs --record` command does not check whether a piece is sealed; only the wrapper suppresses that flag.

**Suggested fix:** Enforce sealing inside the golden writer, version the baseline schema, compare metadata and sample sets, and reject incompatible baselines explicitly. Document sampled coverage; if “never change pixels” is literal, use exhaustive frame verification for sealed releases.

### High — 3. Snapshot export is not a reliable clean-checkout build

**Files:** `scripts/export-site.ts:23–25,66–71,88–96`; `motion/tools/manifest.mjs:53,62–65,79–84`; `.gitignore:2,13–19`

The exporter calls `manifest.mjs`, which writes `motion/out/manifest.json` without first creating its ignored parent directory. On a clean checkout, that fails.

There is a second missing-directory failure: `studioText` contains ignored `exports/`, and line 70 calls `statSync()` without checking existence. Once those directories exist, missing videos are silently omitted through `manifest.pieces.filter((p) => p.video)`. Piece import errors are reported by the manifest generator without causing failure.

Thus the pipeline can either fail on ordinary clean state or successfully publish an incomplete snapshot. It also deletes the previous snapshot before validating prerequisites.

**Suggested fix:** Define explicit source-only and complete-media export modes. Preflight dependencies, validate every selected piece and required artifact, create output directories, and atomically replace the previous snapshot only after a successful build.

### High — 4. Companion generation violates the product read-only boundary

**Files:** `AGENTS.md:25–27`; `scripts/render-companions.ts:16–29,42–43`; `scripts/check-isolation.ts:28–38,63–68,157–158`

The stated rule is that product repositories are read-only, but companion generation creates and writes:

```ts
const harness = join(source, "tmp", "studio-companions");
```

It subsequently removes that directory recursively. A failed setup before the `try` block can leave residue, and a pre-existing directory at that fixed path is not protected.

The audit treats this script as a declared read source, then checks for residue under a different name: `tmp/companion-harness`.

**Suggested fix:** Put the harness and build caches under the studio’s own temporary-output directory, with read-only access to product source. Use unique run directories and cleanup covering the entire setup. Make the audit check actual write destinations rather than exempting whole files.

### Medium — 5. Cache invalidation can show outdated source and pixels

**Files:** `src/motion/routes.ts:49–55,87–90`; `motion/tools/manifest.mjs:21–65`

Manifest invalidation watches a handful of files and directory modification times. It does not watch piece source, imported dependencies, or brand inputs. Editing an existing brief, golden, or video also need not change its parent directory’s modification time.

Exact-frame caching is even weaker:

```ts
if (!existsSync(file)) { /* render */ }
```

Changing a piece can therefore leave both its displayed metadata and exact preview stale.

**Suggested fix:** Key generated artifacts by hashes of their relevant source graph, assets, tool recipe, and rendering environment. At minimum, enumerate actual dependency files and invalidate exact frames when their inputs change.

### Medium — 6. Golden rendering can silently use a different browser

**Files:** `motion/tools/detect.mjs:15–38`; `motion/tools/golden.mjs:15–22`; `motion/README.md:58–63`

Backend detection falls back to globally installed Playwright, the newest cached Chromium, or Remotion’s browser. The code itself acknowledges that these browser builds may produce different pixels.

Neither the golden file nor its comparison records or enforces the browser revision, platform, rendering configuration, or system-monospace font environment. “Same Mac” is insufficient when its browser cache changes.

**Suggested fix:** Separate permissive preview detection from strict golden verification. Record and enforce a rendering-environment fingerprint, use lockfile-based installation, and report an environment mismatch separately from a pixel regression. Document the supported reference environment.

### Medium — 7. Create and Motion share a destructive output namespace

**Files:** `src/exporter.ts:11,18–26`; `motion/tools/studio.mjs:12,16,24–26`; `motion/tools/manifest.mjs:64–65`

Both producers write to:

```text
exports/<slug>/<format>/
```

Create deletes that directory before exporting. A Create post and Motion piece sharing a slug and format would overwrite one another.

Motion has the opposite cleanup problem: it overwrites current slides without removing old ones. Reducing a carousel’s slide count leaves trailing PNGs, and the manifest includes every PNG it finds.

**Suggested fix:** Separate outputs into producer namespaces, such as `out/create/` and `out/motion/`. Render each piece into a staging directory, replace its previous artifact set atomically, and enumerate expected outputs rather than discovering arbitrary PNGs.

### Medium — 8. Verification commands do not consistently fail on failure

**Files:** `motion/tools/studio.mjs:13–15,31–33`; `motion/tools/render.mjs:64–71`; `scripts/check-isolation.ts:208–215`; `scripts/sync-library.ts:53–54`

Several command contracts can mislead automation:

- An unknown golden target produces an empty selection and reports `GOLDEN: all 0 piece(s) SAME`.
- Render determinism mismatches are printed without setting a failing exit status.
- The isolation audit can report `FAIL` while exiting successfully.
- Library synchronization ignores the theme-sync child’s exit status.
- Dead-air checking parses stdout without first validating subprocess success.

**Suggested fix:** Reject unknown commands and empty selections, check spawn errors and exit statuses, and return nonzero for failed verification. Provide structured result objects or JSON rather than parsing human-readable output. Preserve diagnostic reports when checks fail.

### Medium — 9. The moved launch-film project retains broken source-root assumptions

**Files:** `films/launch-film/hyperframes/prepare.mjs:20–33,50–57`; `films/launch-film/prepare.mjs:1–7`; `films/README.md:14–16`

HyperFrames computes:

```js
const repo = join(root, "..", "..");
```

From its current location, this resolves to `films/`, not the Rotli product checkout. It then looks for product assets under that directory and for GSAP under the old `marketing/hyperframes/node_modules` path.

The README suggests changing the working directory, but this script derives its root from `import.meta.url`, so that advice cannot fix it. The older Remotion preparation script also retains relative paths from its former location.

**Suggested fix:** Either declare these projects historical and unsupported, or introduce an explicit `--source-repo` contract with prerequisite validation. Resolve dependencies from the project that owns them and document which inputs cannot be reproduced from the public checkout.

### Medium — 10. Agent-run extraction overwrites historical runs

**Files:** `motion/tools/extract-runs.mjs:74–93`; `motion/tools/manifest.mjs:60`

Every run for a piece writes the same destination:

```js
writeFileSync(join(OUT, `${r.piece}.md`), redact(md));
```

Multiple runs for one piece overwrite one another, while the index retains multiple entries pointing at that same file. The manifest then selects the first matching entry, potentially showing first-run metadata beside last-run content.

Processing a new transcript alone also replaces the global index, requests, and reviews with only that invocation’s data.

**Suggested fix:** Store immutable records by run ID, with an explicit piece relationship and approved-run reference. Build aggregate indexes from those records, and distinguish incremental import from complete rebuild.

### Medium — 11. Sound artifacts have a generator but no verification contract

**Files:** `sound/tools/render.ts:19–29`; `sound/src/recipes.ts:4`; `scripts/export-site.ts:49–51`; `src/motion/routes.ts:100–103`

Sound generation stores a WAV-master hash, but the exporter simply copies committed AAC files and the catalogue. Nothing in that export path verifies whether the recipes, master hashes, and web files still agree.

A failed render can update some web files before the catalogue is rewritten. Sound also imports its motif directly from a film implementation file, and its render tool is omitted from the site’s “every command” tool inventory.

**Suggested fix:** Add a non-mutating sound verification command, explicit master/web hashes and encoder provenance, and atomic artifact replacement. Extract the shared motif into a dedicated brand-music data module. Include sound tooling in the common tool registry.

### Medium — 12. Automated checks miss the main integration boundaries

**Files:** `package.json:6–15`; `tsconfig.json:14`; `motion/package.json:7–11`; `src/motion/app.ts:8–22`; `scripts/export-site.ts:25`; `motion/tools/manifest.mjs:24,33–35`

The root `check` is only TypeScript checking for `server.ts`, `src/`, and `scripts/`; it does not directly cover Motion source or the sound generator. No tracked `.test.*`, `.spec.*`, or `.github/` workflow files were present, although useful manual verification tools do exist.

Manifest contracts are separately maintained in the generator, browser, and exporter. Module discovery depends on a particular import-line spelling, and episode relationships depend on ID regexes. There is no central validation guarding those conventions.

**Suggested fix:** Add shared catalogue/manifest schemas and focused tests for clean export, missing artifacts, invalid IDs, golden metadata, stale caches, and run imports. Add explicit Motion and sound typechecks, plus CI for inexpensive contract checks; keep expensive pixel checks in the pinned rendering environment.

### Low — 13. Historical, example, and production code are insufficiently separated

**Files:** `films/README.md:6–12`; `films/quokka-film-original/README.md:6–7`; `motion/README.md:9–12,44–56`; `motion/third_party/anidoodle/README.md:21–75`; `README.md:12–23`

The frozen original shares 67 byte-identical files with Motion, with nine additional same-path files differing. That archive is legitimate provenance, but the live `canvas-core` directory also mixes engine internals, reusable brand code, production pieces, and inherited examples.

Fifteen `page-*.ts` hosts are absent from the catalogue; these should be classified explicitly rather than assumed dead. Contributor instructions also retain misleading fragments: the archive says it lives under ignored `/marketing/`, and Motion’s quickstart presents alternatives as an executable shell pipeline:

```sh
node tools/studio.mjs list | render all | check | golden all | catalog
```

**Suggested fix:** Preserve the original as an explicitly frozen archive, move inherited demos into an examples area, and separate engine, kit, and piece modules. Replace the quickstart with literal commands, installation prerequisites, working directories, and expected outputs.

## Proposed target folder layout

This is a proposed layout, not a description of existing directories.

| Top-level folder | Purpose |
|---|---|
| `apps/` | Bun studio application, with separate Motion-viewer and Create-editor modules. |
| `motion/` | Active engine, Rotli kit, pieces, series, briefs, prompts, runs, goldens, and Motion tools. |
| `sound/` | Synth, recipes, sound prompts, verification metadata, and sound tools. |
| `library/` | Versioned brand-input snapshots and provenance shared by studio producers. |
| `posts/` | Editable Create post documents only. |
| `scripts/` | Thin repository-wide commands for synchronization, verification, export, and publication links. |
| `docs/` | Architecture, contributor setup, design guidance, launch planning, and deployment instructions. |
| `deploy/` | Hosting configuration and ignored machine-specific deployment configuration. |
| `archive/` | Frozen historical film projects, excluded from active build discovery. |
| `tests/` | Contract tests and synthetic integration fixtures. |
| `out/` | Ignored generated artifacts, separated by producer and build stage. |
| `local/` | Ignored private experiments and product-specific working material. |
| `.claude/` | Discoverable agent skills pointing to canonical workflow documentation. |
| `.githooks/` | Lightweight local verification hooks. |
| `.github/` | Automated repository checks. |

Keep `README.md`, `AGENTS.md`, `LICENSE`, `NOTICE`, package manifests, and lockfiles at the root.

Concrete moves:

1. Move `server.ts`, `src/`, and `static/` into `apps/studio/`; split editor code into `create/` and retain the viewer under `motion/`. Extract reusable catalogue, thumbnail, and publication logic from HTTP routes.
2. Split `motion/src/canvas-core/` into `engine/`, `kit/rotli/`, `pieces/`, and `examples/`. Move corresponding demo hosts with their examples; retain a common host implementation.
3. Move `motion/season/bible.md` and `season/episodes/` into `motion/series/season-one/`; colocate that series’ generated prompts. Keep shared workflow instructions under `motion/workflows/`.
4. Move run records into `motion/workflows/runs/<run-id>/`, with piece references in their metadata.
5. Rename `motion/posts.json` to `motion/publications/links.json` and move `motion/published.json` to `motion/publications/product-placements.json`; update `link-post.ts` and consumers.
6. Move `films/quokka-film-original/` and the historical launch-film variants under `archive/`, preserving their source and lockfiles.
7. Consolidate generated output into `out/motion/`, `out/create/`, `out/sound/`, and `out/site/`. If sound web files remain committed release artifacts, label and verify them explicitly.
8. Move launch planning and evaluation material into `docs/`; retain short entry-point links from relevant room READMEs.
9. Give duplicate font/theme snapshots explicit versions and hashes before consolidating storage. Preserve intentional sealed-piece inputs rather than replacing them with mutable “latest” assets.

Make these moves incrementally, updating imports, asset manifests, serving/export mappings, and attribution inventories together. Require sealed-piece verification after each relevant migration.

## What is good

- `Film`, shot validation, and the `renderFrame` boundary are a useful foundation (`motion/src/canvas-core/film.ts:6–35`).
- Embedded fonts are checked against SHA-256 locks before building (`motion/tools/build-page.mjs:15–18`).
- All ten stored Season One prompts exactly matched current generator output; all ten briefs total 1,800 frames.
- The two theme snapshots currently match byte-for-byte.
- The hosted application is static, with content-hashed JavaScript/CSS and separate hosting configuration.
- The frozen original and documented upstream commit provide valuable provenance.

## Top 5 changes I would make first

1. **Make publication explicit and atomic:** catalogue-selected artifacts, complete scanning, prerequisite checks, and staging.
2. **Strengthen golden verification:** enforce sealing in the writer, validate metadata and coverage, and pin the rendering environment.
3. **Enforce product isolation:** move companion harnesses outside product checkouts and fix audit coverage and exit statuses.
4. **Fix artifact lifecycle:** separate output namespaces, remove obsolete slides, and invalidate caches by input identity.
5. **Establish a contributor contract:** reproducible setup, shared schemas, focused CI checks, then incremental folder migration.