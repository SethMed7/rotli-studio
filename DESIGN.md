# rotli studio design

<!-- The studio is a sibling surface of Rotli. It FOLLOWS Rotli's canon (~/rotli/DESIGN.md and rotli.co)
     rather than re-deriving it; on any conflict Rotli's canon wins. Tokens live in static/app.css :root (shared tokens and base rules; the pages are static/motion.css). -->

## Overview
The studio shows Rotli's code-drawn films, the studies that take the same engine past Rotli, and everything that made
them, in rotli.co's language: a linen ground, the faint studio pattern behind the hero (cameras, a clapperboard, film,
keyframes on a motion curve; `library/patterns/studio-pattern.svg`, studio-owned, drawn in the same hairline as
Rotli's synced file pattern), which fades out behind the headline and intro so it frames the words and never sits
under them, General Sans 600 headlines at -0.045em with a clay
underline on the key words, deep bands for emphasis, and hairline-separated lists. Home (`#/`) is a landing
page; every other route is the app shell (top bar, one sidebar tree, content).

## Colors
Rotli Light only (`--ground` #f8f2e9, `--surface-2` #f1e7d8, `--tint` #f2d6c2, `--text` #3a3028, `--muted`
#6e6155, `--accent` #c97e62, `--accent-text` #8f4e37) plus the deep band (`--deep` #241d18, `--deep-text`
#f1e7da, `--deep-muted` #b7a593) and status tokens (`--ok`, `--warn`, `--bad` with `-bg`/`-border`). No raw hex
in `motion.css` except the video letterbox. Measured: every text/background pair is at least 4.5:1; muted text
never sits on `--tint` (active rows switch it to `--text`).

## Typography
General Sans (UI and headlines), Baloo 2 for the wordmark only, system mono for code. Landing h1 up to 5.6rem,
page h1 up to 2.75rem, both 600 with tight tracking; body 14-16px.

## Elevation
Flat, per Rotli: no shadows, glows or blur anywhere. Depth is surface contrast and one-pixel hairlines.

## Components
- **The Sidebar:** flat. Home and Library, then four sections under a hairline and a small muted name, which keep
  Rotli's own work apart from everything else: **Studies** (Studies, Journal, Prompt library), **Rotli** (Series,
  Carousels, Wallpapers, Brand kit), **Make your own** (Make one for your product, Prompts & briefs, Agent runs, Sound,
  Skills, Tools) and **About** (Published, Docs & licences, Isolation audit). Exactly one row is highlighted
  (tinted, never a checkmark); nothing expands inline. Episodes and study sizes live on their own pages, with a
  pager ("5 of 10", previous / next) and a segmented control for cuts or sizes. The top bar carries section links
  only on the landing, where there is no sidebar. Titles are short nouns, the same in the menu, the crumb and the h1.
- **Rows, not cards:** series, episodes, tools and audit findings are rows divided by hairlines. Studies are a grid of
  posters (media carries the border), grouped under their family's heading, each tile a title, a subject dot (accent:
  Oriel; ok: a real topic; warn: just for fun) and its sizes. Hovering a tile plays its render muted (never on touch,
  under reduced motion or Save-Data).
- **Subject notes:** "Oriel is imaginary", "A real topic" and "Made for fun" are a paragraph behind a 3 px rule in the
  subject's colour, never a box. The Studies page and every study page carry one.
- **Reading:** journal notes are set at a 42rem measure, 1.07rem/1.75, with an "On this page" rail of their h2s beside
  them on wide windows and older/newer links at the end.
- **The questionnaire** (Make one for your product): the steps are a segmented control, options are hairline rows with
  native radios and checkboxes, and pointers sit beside the form behind a hairline.
- **Where a border is allowed:** media (posters, frames, the player), swatches, and the segmented tab control.
  Nothing else gets a box.
- **Buttons:** dark (`--text` fill) for the primary action, ghost (hairline) for the secondary.

## Do's and Don'ts
- Do use rotli.co's wording for any claim about Rotli; never name a private or client product.
- Do check 1440, 1280 and 390 px for overlap and horizontal overflow (`motion/tools/ui-check.mjs`) before
  shipping UI.
- Don't add cards, eyebrows (tiny caps labels above headings), shadows, or a second accent.
- Don't loop motion behind text; the landing film plays once, muted, only when it is on screen (never under reduced motion or Save-Data), and sound is always the visitor's click.
