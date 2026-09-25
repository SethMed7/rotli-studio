# Changelog

Notable changes to the studio and to studio.rotli.co, newest first. Dates are when the change reached `main`.

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
