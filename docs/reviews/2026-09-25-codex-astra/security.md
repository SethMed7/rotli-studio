The static hosting model and subprocess handling are sensible, with significant gaps in file authorization, export privacy checks, and font licensing. I confirmed a local file-allowlist bypass and found ways that drafts or unscanned content could enter the public snapshot. Read-only inspection of 590 tracked text files found no confirmed credentials or personal-data matches beyond scanner examples; this was not a full history, binary-content, or live-deployment audit.

## Findings

No critical finding was confirmed.

### High — File allowlist can be bypassed with encoded traversal

**Files:** `src/motion/routes.ts:12–24,138–139`; `server.ts:23–30`.

`allowed()` checks the first segment **before** normalizing the path:

```ts
const top = clean.split("/")[0] ?? "";
if (!open.has(top) …) return null;
const file = normalize(join(base, clean));
```

The following path passes those checks and resolves to an expressly private file:

```text
/s/scripts/%2e%2e%2fdeploy/private-markers.local.txt
```

I verified that calculation in memory. The final containment check prevents leaving the repository but does not prevent leaving the permitted directory. The same mechanism reaches `.git/config` and other excluded repository files.

The allowlist also exposes ignored files inside permitted directories: `/s/films/...` includes local generated files and logs. Personal home paths were found in ignored `films/launch-film/hyperframes/assets/takes/full.txt:1–29` and `films/launch-film/hyperframes/review/codex-exec.log:3`; these are **local-server exposures, not confirmed public Git or snapshot leaks**.

**Suggested fix:** Decode and normalize first, then authorize the resulting relative path against an explicit public-file manifest. Reject dotfiles and private/generated directories. Check real paths or reject symlinks, since both serving helpers currently use lexical containment followed by filesystem operations that follow symlinks. Return 400 for malformed encoding.

### High — Snapshot publishes all editor exports, including drafts

**Files:** `scripts/export-site.ts:19,65–71,83`; `src/exporter.ts:18–26,40–56`; `.gitignore:2`.

The snapshot’s `studioText` list includes `"exports"`, and the recursive walker copies everything beneath it. The content editor writes every exported post there, including `captions.md`; there is no publication status or selection step.

Consequently, exporting a draft locally makes its images and captions eligible for the next public deployment—even though `exports/` is gitignored and the editor itself is excluded from hosting. The directory walker also admits unrelated files and dotfiles other than `.DS*`.

**Suggested fix:** Export only explicitly approved pieces and their enumerated assets. Separate editor drafts from publishable artifacts, and reject unexpected files instead of treating entire directories as public.

### High — Privacy scan does not cover the complete published artifact

**Files:** `scripts/export-site.ts:27–63,74–83,114–118`; `deploy/README.md:7–15`.

The scanner examines only the later `files` array and a limited extension list. Earlier writes bypass it, including:

- Bundled application JavaScript and styles.
- `sound/prompts`, `sound/catalog.json`, and sound files.
- Generated manifest, skills, and tools API responses.
- Fonts, patterns, and logo assets.

Its rules omit personal home paths and emails. The private-name list is optional, so its absence silently reduces protection. Finally, failure prints **“nothing exported”** despite already writing public files at lines 29–63.

The documented deployment sequence also has no independent artifact verification before `railway up`.

**Suggested fix:** Assemble an explicit export inventory, scan every text-bearing output with shared secret/privacy rules, and review approved binary assets separately. Build into staging and promote it only after verification. Require deployment to consume a verified artifact, and fail closed when the required private-marker configuration is unavailable.

### Medium — Loopback binding is the only request-access boundary

**Files:** `server.ts:64–67,85–99,117–150`; `src/motion/routes.ts:140,152–163`.

The server binds to `127.0.0.1`, but does not validate `Host`, `Origin`, Fetch Metadata, or an application token. Write and expensive execution routes therefore accept requests without establishing that they came from the studio UI.

For example, `/api/upload` accepts multipart requests, while `/api/export/:slug` treats an invalid or absent JSON body as `{}`. Cross-origin requests that a browser permits to loopback can cause side effects without reading the response; CORS alone would not prevent that. Missing Host validation also leaves a DNS-rebinding defense gap.

**Suggested fix:** Validate the expected Host, reject foreign origins on mutations, and require a per-session token for write/render operations. Apply concurrency limits to expensive jobs. Preserve the loopback binding.

### Medium — Uploaded SVGs can execute on the editor’s origin

**Files:** `server.ts:20,28–30,80,85–95`.

SVG is accepted based solely on its filename extension and stored unchanged:

```ts
if (!IMAGE_TYPES.has(ext)) continue;
await Bun.write(join(LIBRARY, "uploads", name), value);
```

It is subsequently served through `/library/*` without a restrictive CSP or attachment disposition. A malicious SVG opened as a document can execute script on the studio origin and access its APIs. Displaying an SVG through `<img>` is a different, more restricted case; the direct document URL remains available.

**Suggested fix:** Reject or rasterize uploaded SVGs, or sanitize them with a maintained SVG sanitizer. Serve untrusted originals as attachments or from a separate origin with scripts disabled. Validate content and generate unique filenames instead of silently overwriting existing uploads.

### Medium — Pre-push privacy checks inspect different bytes from those being pushed

**Files:** `scripts/check-public.ts:19–38`; `.githooks/pre-push:1–3`; `README.md:6–8`.

Gitleaks scans Git history, but the custom personal-data rules read **working-tree files** selected by `git ls-files`:

```ts
text = readFileSync(join(ROOT, f), "utf8")
```

A committed personal email can therefore be replaced with an uncommitted placeholder before pushing; the custom scan sees the placeholder while Git pushes the original commit. Removed historical personal data also escapes these custom rules.

Additional gaps:

- `.svg`, `.lock`, `.log`, and several other text formats are excluded.
- `scripts/check-public.ts` exempts itself.
- Read errors are silently skipped.
- The hook ignores the proposed ref updates supplied on stdin.

The hook is configured in this checkout, but that configuration is not inherited by fresh clones. It can also be skipped with `--no-verify`; no tracked CI workflow supplies another enforcement layer.

**Suggested fix:** Scan the actual outgoing commit objects and relevant historical additions with both secret and privacy rules. Inspect text by content rather than a narrow extension list, scan filenames, and fail on inspection errors. Document hook installation and add independent publication checks; a public-repository CI check detects a pushed leak after publication, so it cannot replace pre-publication protection.

### Medium — Font redistribution lacks complete licensing documentation

**Files:** `scripts/sync-library.ts:15–27`; `motion/brand/brand.json:14–34`; `scripts/export-site.ts:41`; `motion/third_party/anidoodle/README.md:9–10`; `NOTICE:1–13`.

Both font directories contain General Sans and Baloo 2 binaries, but no tracked font-specific licence files. The sync script copies only font binaries.

Baloo 2’s embedded metadata contains its copyright and an OFL reference, **not the full licence**. OFL condition 2 requires redistributed copies to carry the copyright notice and licence. [Baloo 2’s upstream OFL](https://raw.githubusercontent.com/google/fonts/main/ofl/baloo2/OFL.txt)

General Sans’s embedded metadata identifies Indian Type Foundry ownership and licensing conditions. The repository provides neither the applicable full terms nor evidence establishing redistribution rights. The anidoodle inventory’s statement that everything not listed is Rotli’s MIT-licensed work is consequently overbroad.

**Suggested fix:** Add Baloo 2’s complete OFL and font attribution. Record General Sans’s exact source and applicable licence, confirm repository redistribution is permitted, and document it as a licence exception. If redistribution is unavailable, provide an owner-authorized acquisition mechanism preserving the existing font hashes; do not silently change sealed-piece typography.

### Low — Owner-only posting is a URL-format check, not authorship verification

**Files:** `scripts/link-post.ts:19–29`; `motion/posts.json:3–6`; `scripts/export-site.ts:66`; `src/motion/app.ts:123–125`.

The helper accepts a URL when it matches the configured regular expression. It does not verify that the post exists or that its author is the owner. A syntactically valid invented status ID is accepted.

The exporter also copies `posts.json` without rerunning validation, and the UI escapes `p.url` but does not restrict its scheme. Direct JSON edits therefore bypass the helper entirely.

**Suggested fix:** Share a validator between the helper and exporter that parses HTTPS URLs, restricts hosts and paths, and validates the entry schema. If actual authorship is the requirement, verify the post’s author against a stable account ID. Otherwise describe the guarantee accurately as an owner-handle URL restriction.

### Low — Static host has useful headers but no CSP

**Files:** `deploy/Caddyfile:10–26`; `scripts/export-site.ts:28`.

The Caddy configuration sets `nosniff`, `DENY`, and `no-referrer`, but has no Content Security Policy. Accidental active HTML/SVG content or a future DOM injection would have no CSP containment. The exporter currently injects an inline script, which needs accommodation when adding a policy.

**Suggested fix:** Move the bootstrap flag into the hashed JavaScript bundle or authorize it with a hash. Add a tested policy with restricted script and connection sources, `object-src 'none'`, `base-uri 'none'`, and `frame-ancestors 'none'`.

The caching split is otherwise reasonable: documents/data use `no-store`, hashed application assets are immutable, and media cache for one hour. That media cache means removing an accidentally published image does not guarantee immediate disappearance.

### Low — Runtime tooling can escape the dependency locks

**Files:** `motion/tools/detect.mjs:15–33,39–50`; `deploy/Dockerfile:2`.

`findPlaywright()` falls back to globally installed packages, including dependencies inside `@playwright/mcp` and `agent-browser`. Browser selection can then fall back to a different cached Chromium or Remotion shell. These choices execute code outside the project’s lockfiles.

The deployment image also uses the mutable tag `caddy:2.10-alpine`.

**Suggested fix:** Make locked local packages and a specified browser revision mandatory for verification and publication; retain global fallbacks only as an explicit development option. Pin the deployment image by digest and update it deliberately. These are reproducibility and supply-chain gaps, not evidence of a compromised dependency.

## What is good

- Hosted production serves static files through Caddy and excludes editor APIs and the isolation audit.
- Reviewed request handlers use subprocess argument arrays rather than interpolated shell commands; motion identifiers and frame numbers are constrained.
- Anidoodle attribution includes an upstream commit, Apache licence, NOTICE, modified-file inventory, and source notices.
- Both inspected npm lockfiles have integrity hashes throughout and registry-only resolved URLs.
- Markdown rendering escapes input and restricts link schemes; the render iframe checks message origin.
- The Hyperframes wrapper explicitly limits inherited environment variables and disables telemetry and automatic installation.

## Top 5 changes I would make first

1. Fix canonical-path authorization and replace broad local serving directories with an explicit public-file inventory.
2. Publish only approved artifacts, then scan the complete staged snapshot before promotion or deployment.
3. Add local request-access checks and eliminate active SVG execution on the editor origin.
4. Make privacy checks inspect outgoing Git objects and enforce artifact verification independently of local hooks.
5. Complete font licensing and correct the blanket MIT attribution claim.

No repository files were modified. Builds, hooks, renders, installs, and live endpoint probes were not run.