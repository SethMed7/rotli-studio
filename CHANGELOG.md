# Changelog

Notable changes to the studio and to studio.rotli.co, newest first. Dates are when the change reached `main`.

## 2026-09-25

- **Prompt library:** a portable prompt for every study, written from its brief with no tie to this repository,
  ready to copy into Claude. Every prompt (agent and portable) and every document has a Copy button.
- **Four more studies:** Kinetic Poster, Particle Word, Data Story and Shape Morph.
- **Downloads:** every piece page can download its video, its poster, or all its slides as one zip named ready to
  post, and copy its caption. A new **Carousels** page lists every carousel and card, newest first.
- **Behind the Film:** a 7-slide carousel on how the 60-second film was drawn in code.
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
