# Changelog

Notable changes to the studio and to studio.rotli.co, newest first. Dates are when the change reached `main`.

## Unreleased

- **Removed: Create.** The local post editor at `/create` is gone: its templates, exporter, saved drafts
  (`posts/`), the posts and upload APIs, and its styles. `static/app.css` keeps only the shared tokens and base rules.
  Rendered stills and carousel slides still land in `exports/`.
- **Study 26, Orb Guide:** a quiet launch film for Oriel in the style of a motion-design reel shared on X. One
  small glossy orb guides every scene over a hairline grid: it becomes a picture tile, the mark, a comet line past
  typewriter sentences (the next letter shown grey first) and the checkbox of a word roller. Landscape and vertical.
- **Studies 22–25:** four studies that answer four agent-made films shared on X the week Opus 5.5 shipped. Card
  Wall (one card object repeated into a whole world), Halftone Host (an original alarm-clock host rendered through a
  dot screen, with mono chrome and a running timecode), Doodle Guide (the owner's turtle explains goldendoodle
  generations, coats, sizes and colours, its corner badge redrawn in a new rendering style every section) and Five
  Point Five (a lyric video for a short song about Opus 5.5 making this studio, the voice formant-synthesized in
  code from the same syllable table that lights the lyric). Two new palettes in the studio pack, `doodle` and `clay`.
  Studies 24 and 25 are the first exceptions to "Oriel only", on the owner's decision; the turtle is all rights
  reserved (`NOTICE`).
- **Field notes:** the Studies page now opens with long-form write-ups (`motion/series/studies/notes/`), each at
  `#/note/<file>`. The first, *The harness is the studio*, measures the references frame by frame and reports the
  experiments with every number behind them.
- **The scored critique:** `motion/tools/critique.mjs` makes review sheets from any rendered video (every half
  second, phone size at 360 px, strips around the fastest moves) and its pacing numbers; `motion/workflows/critique.md`
  scores seven criteria from 1 to 10, 8+ to ship; rounds are recorded in `motion/series/studies/critiques/`. The
  study preamble now asks every building agent to score its own piece.
- **Agent runs, recovered more faithfully:** `extract-runs.mjs` now maps "Build study 22 <title>" as well as "Build
  study: <title>", keeps the owner's requests that came with a screenshot (they were silently dropped; the image itself
  is never kept), and redacts every name on the private-marker list before anything is written.
- **The studio no longer says "five other styles":** the landing and the Series page count the studies.

- **The Rotli playlist:** the studio's music is now six tracks, one for each theme family, all built on the films'
  phrase and melody: Linen (Rotli), Graphite (Paper & Charcoal, a felt piano alone), Tide (Ocean, breathing pads
  and surf), Canopy (Grove, marimba, shaker and birds), Dusk (Iris, a lo-fi electric-piano groove) and Lamplight
  (Midnight, low pads and bells). With sound on, each plays twice and the next fades in; the Sound page plays any
  of them in the studio and remembers the choice. The synth gains a felt piano, marimba, electric piano, bass,
  filtered noise, a soft kick, birds, vinyl dust and a BS.1770 loudness meter, so every track is mastered to
  Linen's −21 LUFS. Only the playing track and the next one load.
- **Project icon:** `t3.json` gives the repository the studio's favicon in T3 Code.

- **Wallpapers, made your own:** a wallpaper maker on the Wallpapers page (Watch → Wallpapers). Pick a screen (Mac
  5120 × 3200, Display 6016 × 3384, iPad 2752 × 2752, iPhone 1320 × 2868, Android 1440 × 3200), then a background
  (the app's twelve theme grounds, plain, or one of ten scenes: the island at morning and sunset, the lighthouse at
  night, files in flight by day and by night, Ocean, Grove, Iris, Midnight and Paper), then a quokka if you want one:
  seven colours, seven emotions, glasses, a bucket hat or goggles in any of eight colours (the app's own accessory
  hue), where it stands and how big. Eleven presets to start from. The download is drawn in the
  browser at full size by `paintWallpaper`, the same function `node tools/wallpapers.mjs --check` (part of the full
  `verify`) holds to `golden/wallpapers.json`. The 224 quokka looks are rendered from the app's real character by
  `scripts/render-companions.ts --spec motion/brand/wallpaper-looks.json` as lossless WebP, with filled accessories in
  white plus 21 colour masks, so the maker multiplies in the accessory colour (`oklch(70% 0.15 hue)`, as the app does).

## 2026-09-25

- **Studies 10–21:** twelve more studies, 21 in all. Eleven learn from founder explainer reels (serif caption
  ladders, one metaphor per piece): Layer Stack, Pixel Parable, Mascot Track, Annotated UI, Numbered Steps, Paper
  Collage, Agent Network, Dot Matrix, Feed Storm, Offer Cards and Before / After. Morph Launch learns from an
  agent-made launch film: one continuous take of morphs, glass and depth of field. Each has its brief, prompt,
  portable prompt, two sizes and goldens; eight new palettes in the studio pack.
- **Link preview:** a shared studio.rotli.co link shows a card of the island at sunset (1200 × 630) and, where the
  platform plays `og:video` (Discord does; X shows the card only), a seamless looping teaser. Both are drawn in code (`studioCard`,
  `studioTeaser`). robots.txt admits link-preview bots only; the snapshot stays unlisted for search.
- **Carousels fit an X post:** every carousel is now at most four images, the most X takes in one post. The
  derived episode carousels keep all four beats (the cover carries the first, the last carries the sign-off);
  How Rotli Works, Behind the Film and the Print Carousel study are re-cut to four slides.
- **Caption ladders** (`kit/captions.ts`): the explainer-reel caption, words stacked in mixed sizes with one
  accent italic key word, arriving one at a time.
- **Small deploys however large the library grows:** `scripts/split-site.ts` moves the heavy media of the hosted
  snapshot into one sha256-checked tar on the `studio-site` release, fetched by the Docker build, so Railway
  receives only a few MB.
- **Prompt library:** a portable prompt for every study, written from its brief with no tie to this repository,
  ready to copy into Claude. Every prompt (agent and portable) and every document has a Copy button.
- **Four more studies:** Kinetic Poster, Particle Word, Data Story and Shape Morph.
- **Downloads:** every piece page can download its video, its poster, or all its slides as one zip named ready to
  post, and copy its caption. A new **Carousels** page lists every carousel and card, newest first.
- **Behind the Film:** a carousel on how the 60-second film was drawn in code.
- **Published** now includes posts from @RotliCo; standalone pieces have real titles.
- **Studies:** five brand-neutral pieces for a fictional product (Oriel), each in two sizes: Motion Résumé
  (60 fps, motion blur), Vertical App Ad, One-Shape Loop (seamless), Print Carousel (riso) and Sketch Explainer
  (blueprint). Each keeps its brief, exact prompt, agent run and golden.
- **Brand-neutral kit and brand packs:** sizes as data, springs, kinetic type, UI, depth, motion blur and a beat
  score; a neutral pack with OFL fonts. A guide for using the studio for your own product.
- **The site:** a flat menu (Watch, Make, Open source) with one highlighted row, a series index, a pager on every
  piece, size tabs for studies and a size filter in the Library.
- **Sound:** calm music and soft effects composed in code, toggled from the top bar; the music gives way to any
  video playing with sound.
- **Hardening from an external review:** file authorization on the local server, an explicit inventory and a full
  privacy scan for the hosted snapshot, a Content-Security-Policy, sealed goldens that refuse re-recording, and
  commands that fail loudly. Triage in `docs/reviews/2026-09-25-codex-astra/`.
- **Organization:** one home per kind of thing (`ARCHITECTURE.md`); oxlint and oxfmt; `bun run verify` runs every
  gate.
- **Deploys:** every push to `main` runs the gates and deploys studio.rotli.co; renders are published as release
  assets by `scripts/media.ts`.

## 2026-09-24

- The studio is public under the MIT licence, with anidoodle credited under Apache-2.0.
- studio.rotli.co goes live: a static, read-only snapshot of the Motion room.
