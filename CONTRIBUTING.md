# Contributing

Thanks for looking. The studio is open source under the MIT licence (the engine began as anidoodle, Apache-2.0;
see `NOTICE`). Where everything lives is `ARCHITECTURE.md`; how to use the studio for your own product is
`docs/use-it-for-your-product.md`; agent rules are `AGENTS.md`.

## Setup

```sh
bun install                 # the studio (server, scripts, Create)
cd motion && npm install    # the motion room (engine and tools run on Node)
bun start                   # http://127.0.0.1:4500/
```

Rendering needs `ffmpeg` and a Playwright Chromium (`npx playwright install chromium`). The privacy gate needs
`gitleaks`. Install the pre-push hook once: `git config core.hooksPath .githooks`.

## Before you open a pull request

```sh
bun run verify
```

It runs the typechecks, lint and format checks, the public-repo privacy gate, the anidoodle inventory, the sound
check and every golden. If you changed a piece's pixels on purpose, re-record its golden
(`node motion/tools/studio.mjs golden <id> --record`) and say why in the pull request. Sealed pieces cannot change.

## What we look for

- One home per thing (add a row to `ARCHITECTURE.md` if you create a new kind of thing).
- Pure frames: a piece paints any frame on its own, with no hidden state.
- Real, licensed assets only, with their licences beside them. Synthetic data only: no personal paths, emails,
  private notes or real screenshots.
- Claims match the product (Rotli's come from rotli.co; studies use the fictional Oriel).
- The site follows `DESIGN.md`: flat, calm, readable, rows before cards.
