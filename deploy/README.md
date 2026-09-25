# Hosting the studio snapshot

The Motion room (`/motion` on the local server) can be published as a **static, read-only snapshot**
on its own Railway project, **rotli-studio**. It is unlisted (noindex, robots disallow, not linked from
rotli.co) and shares nothing with the rotli-site service: separate project, separate domain.

```sh
bun scripts/export-site.ts        # site-dist/: pages + web videos + thumbnails + Dockerfile + Caddyfile
cd site-dist && railway up --detach --service studio   # (linked once: railway link -p rotli-studio)
```

Left out of the snapshot on purpose: the posts editor and every write route, exact-frame renders,
golden verification and the isolation audit (they need this Mac). The export stops if a text file
carries a private marker (keys, SSN-shaped numbers, private memex paths, and the client names listed in
the gitignored `deploy/private-markers.local.txt`).

Live: https://studio-production-b4ce.up.railway.app (Railway project `rotli-studio`, service `studio`).
Custom domain: `studio.rotli.co` is attached in Railway; it goes live when its CNAME (and Railway's
`_railway-verify` TXT) exist in Cloudflare DNS.
