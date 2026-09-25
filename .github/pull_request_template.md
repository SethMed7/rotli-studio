## What changes

What someone will see or be able to do, and why.

## Checks

- [ ] `bun run fmt` and `bun run verify` pass (list anything that failed or did not run)
- [ ] New or changed pieces: contact sheets reviewed, no dead air, loops seamless, loudness about −16 LUFS
- [ ] Goldens re-recorded only for pixels that changed on purpose (sealed pieces untouched)
- [ ] Site changes: `node motion/tools/ui-check.mjs` clean at 1440, 1280 and 390 px
- [ ] Synthetic data only: no personal paths, emails, private names, notes or real screenshots
- [ ] Assets are licensed, with the licence beside the file
- [ ] Docs and `CHANGELOG.md` updated where someone would notice

## Renders and deploy

A merge to `main` deploys studio.rotli.co from the published renders. New renders published with
`bun scripts/media.ts publish`? Write "none" if no render changed.
