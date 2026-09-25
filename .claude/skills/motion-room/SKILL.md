---
name: motion-room
description: Make or change code-drawn content in rotli studio's motion room (motion/): films, vertical shorts, carousels, stills, all drawn by JavaScript with the real Rotli quokka. Use when asked for a new video/short/reel/carousel/social image/poster, a change to an existing piece, or a re-render.
---

# Motion room

Everything in `motion/` is drawn by code on the anidoodle engine: one pure `renderFrame`
per piece, one pure `audio(sampleRate)`. The same source gives the same pixels and samples
on this Mac every time. `motion/pieces.json` is the catalogue; `motion/tools/studio.mjs` is
the one command.

## Commands (run from `motion/`, Node + npm, not Bun)

```sh
node tools/studio.mjs list                     # every piece, 🔒 = sealed
node tools/studio.mjs render <id|all>          # videos -> out/video/<slug>.mp4 (+jpg); images -> ../exports/<slug>/<format>/NN.png
node tools/studio.mjs golden all               # sealed pieces MUST print SAME; run after touching anything shared
node tools/studio.mjs golden <id> --record     # re-baseline a non-sealed piece AFTER its change is approved
node tools/studio.mjs check                    # no identical consecutive frames in any video
node tools/studio.mjs catalog                  # out/index.html, every piece playable
node tools/frames.mjs <id> 0,120,300 --sheet /tmp/s.png --cols 3   # fast review sheet (aspect kept)
```

## Laws

1. **Never break a sealed piece.** `rotliStory` is 🔒. Any change to `src/canvas-core/rotli/*`,
   `quokka/*`, `studio/*`, the engine or `brand/` needs `golden all` to print `SAME` for it.
   Additive params with 1920×1080 defaults are how the kit grew without drift.
2. **Story first.** Before code: three sentences (setup, turn, payoff), the turn frame, a token.
   Cue table in the piece file. 120 bpm at 30 fps = 15-frame beat; shots start on multiples of 15.
3. **Claims match the product.** Use rotli.co's own wording (site `/features`, `/privacy`):
   "Secure notes never reach a remote model", "A Librarian that files, never rewrites",
   "Chat reads the vault you are in … answers from what is actually there", and the proof strip
   "Free · No account · Works offline" (the FAQ: free, no account, MIT). Never market Safari or phones,
   never present an Experiments item (site /features) as shipped, never say "sync".
4. **The quokka is the app's quokka.** Line art = `src/canvas-core/quokka/poses.ts` (vector rig:
   fill, blink, hop). Colors/hats/glasses = `library/companion-looks/*.png` rendered from the
   app's real `<Character>` by `bun scripts/render-companions.ts`; add a look by adding a row to
   `motion/brand/companions.json` and re-running it. Never hand-draw an accessory: the hat/ear
   clip laws live in the app.
5. **Themes come from the app's CSS.** `bun scripts/sync-themes.ts` writes `library/themes.json`;
   copy it to `motion/brand/themes.json` deliberately (it is a pixel input).
6. **Fonts are locked.** `motion/brand/brand.json` holds each font's sha256; `build-page.mjs`
   refuses a mismatch. The mono is the macOS system mono, as in the app.
7. **No dead air.** `check` must print ok for every video. Holds get `drift`, a `host`, a push-in or a sway.
8. **Formats** come from `studio/stage.ts` FORMATS (story 1080×1920, ig-portrait 1080×1350,
   ig-square, x-post 1600×900, linkedin 1200×627, film 1920×1080).

## The look (from rotli.co; do not regress to stripes)

- Grounds come from `studio/grounds.ts`: `envGround(ctx, f, "base" | "band" | "deep")`, with the site's file
  field (`fileField`, the exact hero-pattern.svg glyphs) on hero-like surfaces. `kit.paperGround` (diagonal
  stripes) exists only for the sealed film; new pieces never use it.
- A piece picks ONE theme family at module load: `useFamilyUI("ocean")` from `studio/ui.ts`. It re-points
  the kit palette `C`, the UI's LIGHT/DARK themes and the quokka colour (`LOOK.quokka`) at that family. It is
  never called per frame, and pieces that don't call it are Rotli.
- Headlines use the site's tight tracking (titleCard −0.045em, captions −0.04em); `measure(..., spacing)` keeps
  underlines exact.

## Making a new piece

1. `src/canvas-core/<id>.ts` exporting `export const <id>: Film` (copy the nearest existing piece:
   `dressUp` = looks, `themesLoop` = themes, `teaser15` = recut of the film via `studio/reframe`,
   `howRotliWorks` = carousel, `stills.ts` = single images).
2. `src/hosts/page-<id>.ts` (three lines; copy one).
3. Add it to `pieces.json` (kind, slug, format, about, caption for images).
4. Review with `frames.mjs` sheets, then `render`, `check`, `golden <id> --record`, `catalog`.
5. Music: `studio/score2.ts` `makeScore({...})` uses the film's melody so every piece sounds
   like Rotli; put a `pops` entry on each on-screen event.

## The series: "Rotli in 30 seconds" (landscape episodes + automatic derivatives)

- An episode is `src/canvas-core/epNN<Name>.ts`: 900 frames (title 0–90 · demo 90–780 · end 780–900),
  `titleCard` / `lowerThird` / `endCard` / `host` / `drift` from `studio/series.ts`, app UI from
  `studio/ui.ts` (every colour from a theme's roles), a camera push-in so body text is ≥ 26 px on
  screen, a pointer for clicks, and `export const epNNDerive: DeriveSpec` (vertical beats, four
  slides, one single; crops in rendered screen space, squarish, above y≈860).
- `node tools/derive-modules.mjs epNN<Name> "Title line|Second line" <hi-word>` writes the vertical,
  carousel and single modules; `node tools/add-episode.mjs NN <name> "about" "caption"` registers
  all four in pieces.json (slugs `epNN-<name>`, `-vertical`, `-card`). Then `render`, `check`, `golden --record`.
- `check` fails on dead air: any 15-frame window where every frame changes < 0.5 % of pixels
  (anidoodle's standard). UI holds pass because of `drift` (the living camera) and `host` (the corner
  quokka); single identical frames are reported but allowed.
- The launch calendar that schedules all of this: `launch/rotli-launch-month.md`.

## Season One: story episodes (60 s, `studio/story.ts`)

- The bible is `season/bible.md`, the briefs are `season/episodes/s01eNN.json` (story, atmosphere, style, cast,
  sourced claims, scenes summing to 1800), and the prompts are `workflows/prompts/` (from `tools/brief-to-prompt.mjs`).
  The process is in `workflows/README.md` and review is `workflows/review-checklist.md`.
- Templates: `intertitle`, `chapterCard` (`line` for the line style), `thought` (pictograms; the quokka never
  speaks), `librarian`, `lineQuokka`, `storyEnd`. Moods: `studio/atmospheres.ts`.
- Line-style episodes set `line: true` in their `DeriveSpec` (vertical end uses the line art).
- `reframe()` restores the host's colours after re-rendering a frame (`ui.saveLook`), so a
  derivative never inherits a family its episode visited.
- **Register serially:** parallel agents race on `pieces.json`, so re-run `add-story.mjs` for every brief at the end.

## The studio site and the audit

- `http://127.0.0.1:4500/motion` shows everything read-only. After adding pieces, runs or series, rebuild
  its data: `node tools/manifest.mjs` (the site also rebuilds when `pieces.json`/`series.json`/renders change).
- Every new piece belongs to a series in `series.json` (the manifest lists unassigned ones).
- After agent waves, copy their prompts and reports into the studio:
  `node tools/extract-runs.mjs ~/.claude/projects/<project>/<session>.jsonl`.
- `bun ../scripts/check-isolation.ts` before handing off: the studio writes only inside `~/rotli-studio`.

## Other products

`repurpose-brand` → the global `brand-motion-studio` Q&A skill. `EVALUATION.md` says what ports.

## Known traps

- `gemini` CLI is retired for Seth's tier; `agy -p "…" --mode plan --sandbox --dangerously-skip-permissions`
  reviews video FRAMES only (no audio). Nobody but Seth can judge the sound.
- `gate.mjs` fails "no embedded binary asset" by design (brand fonts + look PNGs).
- `hopAlong` treats identical consecutive waypoints as a hold, not a hop.
- `render-companions.ts` needs `--host 127.0.0.1` for rotli's Vite; its harness lives in the
  rotli checkout's gitignored `tmp/` and is deleted after.
- The original first film project is archived at `films/quokka-film-original/` (moved out of the rotli
  repo 2026-09-24); the motion room is canonical and its `out/video/rotli-story.mp4` is byte-identical.
- Nothing the studio makes may land in a product repo: `bun scripts/check-isolation.ts` proves it.
