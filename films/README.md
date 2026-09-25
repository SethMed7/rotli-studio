# Films

Local-only film projects (they used to live in the public rotli repo under
`marketing/`, moved here 2026-09-23 so media work stays on this Mac).

- `quokka-film-original/` — the first code-drawn film's original project (built 2026-09-24 in the
  rotli repo's ignored `marketing/`, moved here the same day). Frozen: `motion/` is canonical and its
  golden `rotliStory` was recorded from this project's render.
- `launch-film/` — the 79-second launch promo and 15-second teaser: the
  HyperFrames edit (`hyperframes/`: `edl.json`, `index.html`, `prepare.mjs`,
  scripts, review notes) and the older Remotion cut (`src/`). See
  `launch-film/HYPERFRAMES.md` for the creative and audit record.

Source footage stays in the rotli checkout's ignored `_review/promo-v5/rec/`;
`edl.json` paths are relative to the rotli repository root, so run the film
tooling with that checkout as the working directory, or update the paths.
The published film lives in the site at `site/public/media/rotli-promo.*`.
