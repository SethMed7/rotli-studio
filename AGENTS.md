# rotli studio: agent guide

The canonical rules for every AI agent working here (Claude Code reads it through `CLAUDE.md`). Humans start at
`CONTRIBUTING.md`. Where every kind of thing lives is `ARCHITECTURE.md`; read the row before you create anything.

## Start

1. Read this file, then `ARCHITECTURE.md`, then the owning doc for your task:
   `.claude/skills/motion-room/SKILL.md` (anything in `motion/`), `motion/series/studies/bible.md` (studies),
   `DESIGN.md` (the site), `deploy/README.md` (hosting).
2. Look at the code and `git status --short` before changing anything. Preserve unrelated work.
3. Prove what you did with the gates below. Report exactly what ran and what did not.

## Laws

- **The repository is public** (MIT, github.com/SethMed7/rotli-studio). Synthetic data only: never a home path
  (write `~` or `/Users/example`), personal email, device name, vault content, Keychain value or real screenshot.
  Client and private names live only in the gitignored `deploy/private-markers.local.txt`, and the privacy gate
  refuses any commit that contains one.
- **Every frame is a pure function.** A piece paints any frame on its own, from data, with no hidden state. That is
  what makes renders reproducible and goldens meaningful.
- **Sealed pieces never change.** `node motion/tools/studio.mjs golden all` must print `GOLDEN: all N piece(s) SAME`.
  Re-record a golden only when a piece's pixels changed on purpose, and never a sealed one without the owner.
- **Claims are true.** Rotli's captions use rotli.co's wording (its /features and /privacy pages). Studies use the
  fictional Oriel precisely so they claim nothing real. References are credited by link, never copied or committed.
- **Rotli's look comes from the app.** The quokka, its looks and the theme tokens are synced from the rotli
  checkout, never hand-drawn. Studies never import Rotli's kit (`rotli/`, `studio/`) or `brand/brand.json`; they
  use `motion/src/canvas-core/kit/` and a pack in `motion/brand/packs/`.
- **The studio writes only inside itself.** Product repos (~/rotli and the gitignored `deploy/products.local.txt`)
  are read for brand sources, never written. A piece published into a product on purpose is declared in
  `publish/placements.json`. `bun scripts/check-isolation.ts` proves it.
- **Only the owner's posts.** `publish/posts.json` holds links to the owner's own accounts, added with
  `bun scripts/link-post.ts <url>`, which validates them.

## Safety

- Do not commit, push, deploy or publish media unless the owner asked for that change. Pushing to `main` deploys
  studio.rotli.co (`.github/workflows/deploy.yml`), so a push is a release.
- Only the owner can update `main`, `dev` and `release*` (GitHub rulesets). Agents act as the owner and never edit
  rulesets, secrets or the Railway project.
- Do not start, stop or restart the owner's studio server (`127.0.0.1:4500`) or other long-running processes
  unless asked; use another port (`PORT=4501 bun server.ts`) for your own checks.
- Never write into ~/rotli or any product checkout, except the one gitignored harness `render-companions.ts` owns.

## Work and proof

```sh
bun run verify            # typechecks, oxlint, oxfmt, privacy gate, anidoodle inventory, sound, every golden
bun run verify --fast     # the same without goldens
bun run fmt               # format before committing code
```

For pieces: look at contact sheets (`node motion/tools/frames.mjs <id> <frames> --sheet /tmp/x.png`), render, then
`node motion/tools/still-frames.mjs` (no dead air), `node motion/tools/loop-seam.mjs` (loops), and a loudness check
around −16 LUFS. For the site: `node motion/tools/ui-check.mjs http://127.0.0.1:4501` (overlap, overflow, errors at
1440, 1280 and 390 px). New renders reach the hosted site through `bun scripts/media.ts publish`.

## The two rooms

- **Motion room** (`motion/`, the site's pages in `src/motion/`): code-drawn films, episodes, shorts, carousels
  and stills, grouped into series (`motion/series.json`, `motion/series/<id>/`). Agent runs are recovered from a
  session transcript by `node motion/tools/extract-runs.mjs <session.jsonl>` (it redacts local paths).
- **Create** (`server.ts`, `src/`, `posts/`, `static/app.*`): the post editor at `/create`, local only. Its
  templates keep Rotli Light tokens, General Sans and the Baloo 2 wordmark (lowercase "rotli"), flat surfaces with
  no shadows or glows, and captures of real app UI on synthetic demo data.
