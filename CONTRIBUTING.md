# Contributing

Thanks for looking. The studio is open source under the MIT licence; the render engine began as
[anidoodle](https://github.com/alexgreensh/anidoodle) (Apache-2.0, see `NOTICE`). Start with `README.md`, find
where things live in `ARCHITECTURE.md`, and read `docs/use-it-for-your-product.md` if you want to adapt the
studio to your own brand. AI agents follow `AGENTS.md`.

Everyone who takes part follows the [Code of Conduct](CODE_OF_CONDUCT.md).

## How a contribution works

You work in your own fork and send a pull request; the owner reviews it and merges it.

1. **Start with an issue** for anything bigger than a small fix
   ([templates](https://github.com/SethMed7/rotli-studio/issues/new/choose)), so we agree on the approach first. A
   leak or a security problem is reported privately (see `SECURITY.md`), never in an issue.
2. **Fork** `SethMed7/rotli-studio` and clone your fork. Only the owner can push branches to this repository; your
   branch lives in your fork, so only you can change it.
3. **Branch from `main`** with a short descriptive name (`fix-carousel-crop`, `study-tide-chart`), make the change
   and run the checks below.
4. **Open a pull request into `main`** and fill in the template. Write "Fixes #12" to close the matching issue.
   Keep "Allow edits by maintainers" ticked if you are happy for the owner to push small fixes to your branch.
5. **Review:** answer comments on the thread and push fixes to the same branch. The owner approves and merges, and
   the merge deploys studio.rotli.co.

Small, focused pull requests are reviewed fastest.

## Setup

```sh
bun install                                   # the studio: server, scripts, Create
(cd motion && npm install)                    # the motion room: engine and tools run on Node
bun start                                     # http://127.0.0.1:4500
git config core.hooksPath .githooks           # the pre-push privacy gate
```

You also need `ffmpeg` (renders, thumbnails), a Playwright Chromium (`npx playwright install chromium`) and
`gitleaks` (the privacy gate).

## Making a change

- **A piece or a study:** follow `motion/workflows/README.md` (Rotli series) or `motion/series/studies/bible.md`
  (studies): brief, prompt, build, review on contact sheets, then render and record its golden.
- **The site:** keep to `DESIGN.md` (flat, calm, rows before cards, one highlighted menu row) and check it with
  `node motion/tools/ui-check.mjs http://127.0.0.1:4501` against a server on another port.
- **Tools and scripts:** each has a usage header; the Tools page lists them from it.

## Before you open a pull request

```sh
bun run fmt
bun run verify
```

`verify` runs the typechecks, oxlint, oxfmt, the public-repo privacy gate, the anidoodle inventory, the sound
check and every golden. If you changed a piece's pixels on purpose, re-record its golden
(`node motion/tools/studio.mjs golden <id> --record`) and say why in the pull request. Sealed pieces cannot change.

Pull requests target `main`. The deploy workflow runs on `main`, not on pull requests, so `bun run verify` on your
machine is the check: say in the pull request what ran. Only the owner can merge, and a merge deploys studio.rotli.co.

## What we look for

- One home per thing: a new kind of thing adds a row to `ARCHITECTURE.md`.
- Pure frames: a piece paints any frame on its own, with no hidden state.
- Licensed assets only, each licence next to its file. Synthetic data only: no personal paths, emails, private
  notes or real screenshots.
- Claims that are true: Rotli's from rotli.co, studies for the fictional Oriel.
- Docs updated in the same change, and a line in `CHANGELOG.md` for anything someone would notice.

## For the owner: renders and deploys

Renders are not in git. After rendering new or changed pieces, publish them so the deploy can use them:

```sh
bun scripts/media.ts status      # what changed since the last publish
bun scripts/media.ts publish     # build the snapshot here and upload the changed parts
```

Then push or merge to `main`; `.github/workflows/deploy.yml` runs the gates, builds the site from the published
renders and deploys it (see `deploy/README.md`).
