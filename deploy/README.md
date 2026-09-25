# Hosting the studio snapshot

The Motion room (`/` on the local server) is published as a **static, read-only snapshot** on its own
Railway project, **rotli-studio**, at https://studio.rotli.co. It is unlisted (noindex, robots disallow, not
linked from rotli.co) and shares nothing with the rotli-site service: separate project, separate domain.
Deploying is the owner's call, each time.

```sh
bun scripts/export-site.ts        # site-dist/: pages + web videos + thumbnails + Dockerfile + Caddyfile
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
