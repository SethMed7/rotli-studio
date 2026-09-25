# rotli studio design

<!-- The studio is a sibling surface of Rotli. It FOLLOWS Rotli's canon (~/rotli/DESIGN.md and rotli.co)
     rather than re-deriving it; on any conflict Rotli's canon wins. Tokens live in static/app.css :root. -->

## Overview
The studio shows Rotli's code-drawn films and everything that made them, in rotli.co's language: a linen
ground, the faint file pattern behind the hero, General Sans 600 headlines at -0.045em with a clay
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
- **The Sidebar Tree:** Home, Library, then groups (Films, How it's made, About) separated by a hairline and
  named in sentence case. The open series lists its episodes as an indented tree; the current item is a
  `--tint` row, never a checkmark.
- **Rows, not cards:** series, episodes, tools and audit findings are rows divided by hairlines.
- **Where a border is allowed:** media (posters, frames, the player), swatches, and the segmented tab control.
  Nothing else gets a box.
- **Buttons:** dark (`--text` fill) for the primary action, ghost (hairline) for the secondary.

## Do's and Don'ts
- Do use rotli.co's wording for any claim about Rotli; never name a private or client product.
- Do check 1440, 1280 and 390 px for overlap and horizontal overflow (`motion/.ui-check.mjs` pattern) before
  shipping UI.
- Don't add cards, eyebrows (tiny caps labels above headings), shadows, or a second accent.
- Don't loop motion behind text; the landing film only plays when asked.
