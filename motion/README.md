# Motion room

Rotli content drawn by JavaScript: films, vertical shorts, carousels and stills. One engine
(anidoodle, Apache-2.0: `src/canvas-core/core.ts`, `film.ts`, `tools/`), one brand seam
(`brand/`), one catalogue (`pieces.json`), one command (`tools/studio.mjs`). Rules and workflow:
`../.claude/skills/motion-room/SKILL.md`. Reusing it for another product:
`../.claude/skills/repurpose-brand/SKILL.md`.

```sh
npm install && npx playwright-core install chromium   # once (Node 20+). Importer extras: python3 + Pillow, brew install potrace
node tools/studio.mjs list | render all | check | golden all | catalog
open out/index.html                                    # the room: every piece, playable
```

## What is here

| piece | kind | size | |
|---|---|---|---|
| 🔒 `rotliStory` | long-form video | 1920×1080, 60 s | the quokka on Rottnest: ⌥Space, one folder, Librarian, secure, chat, sunset |
| `teaser15` | short | 1080×1920, 15 s | vertical recut of the film under big captions |
| `dressUp` | short | 1080×1920, 16 s | seven colors, glasses, bucket hat, a parade of looks |
| `themesLoop` | short | 1080×1920, 20 s | the frame becomes each of the twelve theme environments |
| `howRotliWorks` | carousel | 1080×1350 × 7 | meet Rotli → make it yours |
| `posterLineup` · `themeGrid` · `linkedinCard` · `xCard` · `heroFilm` | stills | platform sizes | lineup, theme grid, cards, hero |

**The series "Rotli in 30 seconds"** (landscape, 1920×1080, 30 s each), and for every episode a
9:16 vertical cut (`-vertical`), a 4:5 carousel (four slides, one X post) and a 4:5 card (`-card`), all cut from
the episode's own frames by `studio/derive.ts`: `ep01Write` (Markdown renders as you type) ·
`ep02Folder` (one folder, every way out) · `ep03Habits` (⌥Space, ⌘K, wikilinks, views) · `ep04Yours`
(themes + companion) · `ep05Librarian` · `ep06Chat` · `ep07Secure` · `ep08Web`. The month-long launch
calendar that schedules all of it is `../docs/launch/rotli-launch-month.md`; the one-glance sheet is
`out/series-overview.png`.

**Season One: "The Island Keeps Everything"** (ten 60 s story episodes, `s01e01Arrival` …
`s01e10Seasons`, each with a vertical, carousel and card). The bible is `series/season-one/bible.md`, the briefs are
`series/season-one/episodes/`, the reproducible prompts are `series/season-one/prompts/`, and
the process is `workflows/`. The sheet is `out/season-one-overview.png`.

**Other products:** `../docs/evaluation.md` (what ports, what doesn't) and the `brand-motion-studio` Q&A skill,
driving `tools/discover.mjs` → `propose-brand.mjs` → `new-studio.mjs`.

Videos land in `out/video/`; images land in the studio's `../exports/<slug>/<format>/NN.png`
(with `captions.md`), next to Create's exports.

## Layout

- `brand/brand.json`: product copy, palette (the kit's `C`), fonts with sha256 (the lock),
  character sources. `brand/themes.json`: the twelve environments (from the app's CSS).
  `brand/companions.json`: which looks to render from the app's real `<Character>`.
- `src/canvas-core/quokka/`: the vector rig (imported brand line art: fill, blink, hop).
- `src/canvas-core/rotli/`: the Rotli kit (palette, props, Rottnest scenery, actor, the film's score).
- `src/canvas-core/studio/`: grounds (the site's base/band/deep + file field), theme families (`useFamilyUI`), formats, sprite looks, `reframe` (re-render any film frame crisp inside
  another format), `score2` (the brand melody for any length), lockup + captions.
- `src/canvas-core/<piece>.ts` + `src/hosts/page-<piece>.ts`: the pieces.
- `golden/`: frame + audio hashes. `rotliStory` was recorded from the ORIGINAL project and still
  matches 61/61 + audio; the studio's `out/video/rotli-story.mp4` is byte-identical to the
  delivered first cut.

## Reproducibility

Same Mac, same pixels: pure frame functions, seeded randomness, pinned esbuild 0.25.12 and
playwright-core 1.63.0 (package-lock), fonts locked by sha256, mono = macOS system mono (as in
the app). Brand inputs (looks, themes) change only when you re-sync on purpose; goldens tell you
what moved. Not verifiable by machine: how it sounds and how it feels at speed.
