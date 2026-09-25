# Hosting the studio snapshot

The Motion room (`/` on the local server) is published as a **static, read-only snapshot** on its own
Railway project, **rotli-studio**, at https://studio.rotli.co. It is unlisted for search (noindex, robots disallow
for every crawler except link-preview bots, so a shared link still shows its card and loop; not linked from rotli.co) and shares nothing with the rotli-site service: separate project, separate domain.
## How it deploys

**Automatically, on every push to `main`** (`.github/workflows/deploy.yml`): the gates run (`bun run verify --fast`),
then the job fetches the published renders, builds the snapshot exactly as below and uploads it to Railway, then
waits until studio.rotli.co serves the new build. Only the owner can push to `main` (branch rules), so only the owner
deploys. Secrets: `RAILWAY_TOKEN` (a project token scoped to `rotli-studio` production) and `PRIVATE_MARKERS` (the
private-name list, the same text as the gitignored `deploy/private-markers.local.txt`) and `STUDIO_MAINTAINER`
(the maintainer's user name, which the privacy rules refuse; a CI runner's own home and name are not the maintainer's).

**The upload stays small.** Railway (behind Cloudflare) refuses uploads around 250 MB, so after the export
`scripts/split-site.ts` moves the snapshot's heavy files (videos, images, zips) into one tar, attaches it to the
`studio-site` release (named by its hash; the three newest are kept), and rewrites `site-dist/Dockerfile` to download
that tar during the Docker build and check its sha256 before unpacking. Railway receives only pages, scripts, data and
fonts (a few MB).

**Renders live outside git.** Videos, web copies, thumbnails and slides are published as assets of the `studio-media`
GitHub release by `scripts/media.ts`, from the Mac that renders:

```sh
node motion/tools/studio.mjs render <id>   # render new or changed pieces
bun scripts/media.ts status                # what changed since the last publish
bun scripts/media.ts publish               # builds the snapshot, uploads only the parts that changed
git push origin main                       # the workflow deploys
```

The slide zips the pages offer (one per carousel) are release assets too (`<slug>.zip`), not part of the snapshot:
that keeps the upload under Railway's limit (Cloudflare refuses around 250 MB). The local server builds them on the fly.

If piece sources change without a media publish, the workflow warns and deploys the published renders. A piece with no
published render fails the build (the export refuses an incomplete snapshot).

**By hand** (the same build, from this Mac):

```sh
bun scripts/export-site.ts        # site-dist/: pages + web videos + thumbnails + Dockerfile + Caddyfile
bun scripts/split-site.ts          # heavy media to the studio-site release; Dockerfile fetches them
cd site-dist && railway up --ci --no-gitignore --service studio   # (linked once: railway link -p rotli-studio)
```

What the export publishes is an explicit inventory: git-tracked text under the paths listed in
`scripts/export-site.ts`, only the stills and slides the manifest references (never Create's drafts in
`exports/`), web copies of the videos and the thumbnails the pages use. It builds into
`site-dist.staging/`, scans **every** staged file (script bundle, styles, API answers, docs, file names)
with the pre-push gate's rules (`scripts/lib/privacy.ts`: keys, tokens, SSN-shaped numbers, home paths,
personal emails, private memex paths and the names in the gitignored `deploy/private-markers.local.txt`),
validates `publish/posts.json`, and only then replaces `site-dist/`. A failed export changes nothing. Without
the private-name list it refuses to build (`--no-markers` overrides it knowingly).

Left out on purpose: the Create editor and every write route, exact-frame renders, golden verification and
the isolation audit (they need this Mac).

The host is Caddy (`Dockerfile`, image pinned by digest; `Caddyfile`): a Content-Security-Policy that allows
only the snapshot's own files and no inline script, `nosniff`, `DENY` framing, no referrer. Pages and data are
`no-store`, hashed scripts and styles are immutable, media caches for an hour, and errors are never cached
(Cloudflare fronts the domain and once kept a 404 for hours).

Railway project `rotli-studio`, service `studio`; `studio.rotli.co` is a Cloudflare-proxied CNAME to Railway
plus Railway's `_railway-verify.studio` TXT record.
