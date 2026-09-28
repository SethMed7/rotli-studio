# Proposal: what to improve next, and anidoodle 0.4 (2026-09-27)

Two asks: an audit of the studio, and a look back at anidoodle (the engine the motion room began from) for what
else the studio could take. Wallpapers, asked for at the same time, are built (see `CHANGELOG.md`).

**Status (2026-09-27): proposed. Nothing below is built.** Each item is independent; the owner picks.

## Studio: ten improvements, most value for the effort first

| # | Change | Value / effort | Where |
|---|---|---|---|
| 1 | **Blossom, the seventh theme family.** `motion/brand/themes.json` still has six families (twelve environments) while the app has seven. Syncing it changes `themeGrid` (a fixed 4×3 grid) and `themesLoop` (its length is count × time per theme), so both goldens are re-recorded on purpose; neither is sealed. Copy that says "six themes" or "twelve environments" follows rotli.co's wording. Then a Blossom wallpaper. | High / S | `scripts/sync-themes.ts`, `motion/src/canvas-core/stills.ts`, `themesLoop.ts`, `src/motion/app.ts` |
| 2 | **A pull-request CI lane.** Only `deploy.yml` runs, and only on `main`, so a contributor's PR shows no checks. `verify --fast` needs no browser, ffmpeg or secrets (the private-name list is optional), so it can run on `pull_request` for forks. Goldens stay local (CI's Chromium draws text differently). | High / S | `.github/workflows/` |
| 3 | **The Cloudflare beacon.** Cloudflare injects its analytics script, the CSP blocks it, and every page logs an error (`ui-check` against studio.rotli.co shows it at every width). Turn off Web Analytics' automatic injection for the zone, or allow it in the CSP. | Med / XS | Cloudflare dashboard, or `deploy/Caddyfile` |
| 4 | **A link preview per piece.** Routes are `#/piece/x`; preview bots ignore the fragment, so every shared link shows the studio card. The export can write `/p/<slug>/` pages carrying that piece's `og:image`/`og:video` that forward to the app. | High / M | `scripts/export-site.ts`, `static/motion.html` |
| 5 | **Master-quality downloads.** "Download video" serves the CRF 33 web copy; the masters exist only inside `video.tar`. Publish each master as its own release asset (as the slide zips are) and offer it beside the web copy. | Med / S | `scripts/media.ts`, `src/motion/app.ts` |
| 6 | **Lighter grid images.** Stills and carousels use the full PNG (~400 KB) as their grid image; the Carousels page loads 112. 640 px JPGs, as the wallpapers do. | Med / S | `src/motion/app.ts` `poster()`, `scripts/export-site.ts` |
| 7 | **Stale copy.** The landing says "five other styles" (there are 21 studies), a single image reads "1 slides", and the Library opens on the link card and teaser. | Med / XS | `src/motion/app.ts` |
| 8 | **High-resolution stills from `studio.mjs render`.** It renders stills at scale 1 only; `still.mjs --scale` is the only way past 1920 px. A per-piece scale (the wallpaper tool shows the pattern) would make print-size posters routine. | Med / S | `motion/tools/studio.mjs` |
| 9 | **Goldens pin the browser.** A golden can pass on a different Chromium, since the global Playwright fallback is on by default. Record the browser build with each golden and refuse a mismatch. | Med / M | `motion/tools/golden.mjs`, `adapters/playwright.mjs` |
| 10 | **A claims check.** Compare every caption about Rotli with rotli.co's wording in `verify`; item 1's stale copy is the kind of drift it would catch. | Med / M | `motion/tools/`, `scripts/verify.ts` |

## anidoodle 0.4: what is new upstream

The studio vendored anidoodle 0.3.0 (`9a1a762f`, 2026-09-22). Upstream is now 0.4.0 (`5e431ee`, 757 files changed;
the engine moved to `skills/anidoodle/engine/`, and the project is packaged as a Claude Code and Codex plugin).

- **31 styles** (the studio has 6): new since 0.3.0 are blueprint, broken colour, charcoal erasure, coloured pencil,
  embroidery, flat vector, folk tale, halftone, isometric, low poly, mid-century, painted oil, paper craft, pixel art,
  rubber hose, scrapbook, scratchboard, stipple, sumi-e, toy brick and woodcut. Each also draws itself as a film.
- **A music engine:** notes as data, sixteen instruments, a room and mastering, with loudness measured.
- **Interactive web art:** input recorded as a log so a replay draws the same frames; emitted as a
  `<ani-doodle>` web component.
- **Style from a reference image** and **recreating a photo** (the photo steers the marks and is never shown).
- **Drawing lessons** (a timelapse and a step sheet), and **a 2.5D character rig** for people, in ten styles.

What the studio could take, in order of value:

| Upstream | Studio today | Value | Effort |
|---|---|---|---|
| The 20 new styles | 6 styles | High: new looks for studies, stills and wallpapers | Low per style (new files) |
| Style from reference | `discover.mjs` reads websites, not images | Medium: "make it look like this" for a brand | Low |
| Interactive web component | none | Medium: live art for rotli.co | Medium |
| Music engine | `kit/score.ts`, `studio/score2.ts`, `sound/` | Medium: more instruments, loudness metering | Medium (overlaps ours) |
| Lessons, character rig | the quokka rig | Low to medium | Medium to high |

Where we built our own version of something upstream now has (pixel parable, isometric depth, paper collage, the
print carousel, `still-frames.mjs`), keep ours and reconcile names rather than carry both.

### How to take it (tested in a scratch copy: all 128 goldens SAME)

1. Point `third-party-inventory.mjs --record` at `skills/anidoodle/engine` (it reads `engine/`, which no longer
   exists upstream) and ignore the `plugins/` mirror.
2. Take `core.ts`, `drafting.ts` and `storybook.ts` as they are (additive: `core.ts` only records where things were
   drawn; `drafting.ts` adds eight characters and a `slant` whose default matches today), re-applying our import paths
   and change notices. Merge upstream's new optional film fields into `film.ts` beside our `family?`.
3. **Do not take `page.ts`'s audio change** (16-bit PCM to float32): all 82 goldens with sound hash the 16-bit
   buffer, as do `gate.mjs` and `render.mjs`. Either keep our `page.ts` or convert float32 back to 16-bit before
   hashing.
4. Upstream's tools depend on each other (`render.mjs` and `gate.mjs` need `names.mjs`, `audio.mjs`, `motion.mjs`
   and the new page's shot list): take them all or none.
5. Add new styles as new vendored files, then run the inventory, `--check` and `golden all`.

**Watch for:** Chromium draws a canvas larger than 16384 px a side (or 268 million pixels) silently blank. The
wallpaper tool guards against it; the other tools do not. Upstream's `render.mjs` also no longer caps GIFs at
640 px wide.
