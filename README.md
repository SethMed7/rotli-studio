# rotli studio

A **local-only** social media studio for rotli: the brand asset library,
templates that fit every social format, posts you can edit and save, and PNG
export at exact platform sizes. It is not a product: the editor server listens on `127.0.0.1` only.
This repository is **open source (MIT)** and public, under the same rules as the rotli repo: synthetic
data only, no personal paths or emails, and `bun run check:public` before every push (it is the pre-push
hook). The motion room vendors the anidoodle engine (Copyright 2026 Alex Greenshpun) under Apache-2.0:
its licence, NOTICE and the list of files we changed are in `motion/third_party/anidoodle/`; see `NOTICE`.
The hosted, read-only Motion room lives at <https://studio.rotli.co>; see `deploy/README.md`.

## Open it

Double-click **`Open rotli studio.command`**, or:

```sh
cd ~/rotli-studio
bun start              # http://127.0.0.1:4500
```

## Make a post

1. **New post** (or **Duplicate** an existing one) and pick a **Format**.
2. Add slides. Each slide has a **template** and a **background**:
   - **Statement:** a big line over the icon pattern, with an optional quokka.
   - **Product shot:** a headline over a real capture.
   - **Chat:** a question and answer drawn in rotli's chat style (legible at any size).
   - **Note:** a note drawn the way rotli renders tasks and headings.
   - **Markdown ↔ rendered:** the same lines as raw Markdown and as rotli draws them.
   - **Points:** up to four short titled points.
   - **Quokka:** a character with one line.
   - **Call to action:** the closing card with the ways in.
3. Write the captions (Instagram, X, and LinkedIn, with live character counts).
4. **Save** (⌘S) writes `posts/<slug>.json`. **Export PNGs** renders every
   slide into `exports/<slug>/<format>/NN.png` plus `captions.md`.

Every template adapts to every format, so one post exports as an Instagram
carousel, a story, an X image, and a LinkedIn image. From the terminal:
`bun run export <slug> [ig-portrait ig-square story x-post linkedin]`.

| Format | Size |
| --- | --- |
| Instagram portrait (4:5) | 1080 × 1350 |
| Instagram square | 1080 × 1080 |
| Story / Reel cover | 1080 × 1920 |
| X landscape | 1600 × 900 |
| LinkedIn | 1200 × 627 |

## The library

`library/` is a snapshot of rotli's brand: the line-art and filled quokkas,
companion looks, logos, product and theme captures, the icon pattern, fonts,
and colors. Refresh it from a rotli checkout with `bun run sync [path]`
(default `~/rotli`; pull `dev` there first so the current site captures are present). Images you drop on the Library view (or upload)
land in `library/uploads/`.

## Rules the templates keep

- Brand: Rotli Light tokens, General Sans, the Baloo 2 wordmark (lowercase
  "rotli"), flat surfaces with no shadows or glows.
- Claims match the product: check a slide's wording against the site's
  /features and /privacy pages before posting.
- Captures are real app UI on synthetic demo data, never a live vault.

## Motion room

`motion/` makes content by code instead of templates: the film, two episode series (Season One,
Rotli in 30 seconds) with their vertical/carousel/card cuts, shorts, carousels and stills, with the
real Rotli quokka and the app's twelve themes. **The studio's home is <http://127.0.0.1:4500/>** (the
content editor is at `/create`; **Posts** (`/#/posts`) lists published posts as links, added with
`bun scripts/link-post.ts <url> [--piece <id>]` for the owner's accounts only; `/motion` still works): every series and episode, each piece broken down to its
scenes, cuts (source frame + crop), brief, prompt, the agent run that built it (prompt, follow-ups,
report, cost), source and golden; plus the brand, atmospheres, workflows, skills, tools, docs and the
**isolation audit**. It is read-only; the Motion room's server side is `src/motion/routes.ts`.

- Series are defined in `motion/series.json`; `node motion/tools/manifest.mjs` builds
  `motion/out/manifest.json` (the site rebuilds it when inputs change).
- Agent runs are recovered from a Claude Code transcript into `motion/workflows/runs/` by
  `node motion/tools/extract-runs.mjs <session.jsonl>`.
- `bun scripts/check-isolation.ts` proves nothing the studio makes sits in a product repo, worktree,
  branch or live site (read-only; `--json`, `--offline`). Pieces published on purpose go in
  `motion/published.json`.

`bun run motion list` (or `cd motion && node tools/studio.mjs …`). Details: `motion/README.md` and
`.claude/skills/motion-room/SKILL.md`. `bun run sync:themes` / `bun run sync:companions`
refresh the theme table and the companion looks from the rotli checkout.

## Files

`server.ts` (routes, library, posts, export) · `src/model.ts` (formats,
themes, templates, post schema) · `src/templates.ts` + `static/slide.css`
(slide rendering) · `src/app.ts` + `static/app.*` (the editor) ·
`src/exporter.ts` (Playwright PNG export) · `posts/` · `library/` · `exports/`
(ignored by git).
