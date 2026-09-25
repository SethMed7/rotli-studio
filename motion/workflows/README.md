# Workflows: how any piece is made, and made again

Everything below is a command. The data (briefs) and the instructions (the preamble) are files, so an
episode can be rebuilt byte for byte, or re-made by a new agent from the same prompt.

## Make a story episode (Season One shape)

```sh
# 1. the brief is the contract: story, atmosphere, style, cast, feature claims (sourced), scene list
$EDITOR season/episodes/s01eNN.json            # copy an existing one; scenes must sum to 1800 frames
# 2. the prompt: the preamble that worked, plus the brief (deterministic)
node tools/brief-to-prompt.mjs season/episodes/s01eNN.json > workflows/prompts/s01eNN.prompt.md
# 3. build: hand that prompt to an agent (Claude Code Agent tool, `codex exec` with the prompt on stdin), or follow it yourself.
#    The first step it takes: node tools/new-episode.mjs season/episodes/s01eNN.json  (a runnable stub)
# 4. review: workflows/review-checklist.md
# 5. ship
node tools/derive-modules.mjs <id> "Title line|Second line" <word-to-underline>
node tools/add-story.mjs season/episodes/s01eNN.json
node tools/studio.mjs render <id>  && node tools/studio.mjs check <id>  && node tools/studio.mjs golden <id> --record
node tools/studio.mjs catalog
```

## Make a new season

1. Write `season/bible.md` for it: three-sentence arc, token, cast, feature map (each episode owns *new* features).
2. One brief per episode (the Season One briefs are the template).
3. Pick atmospheres from `src/canvas-core/studio/atmospheres.ts`, or add one there (a family, a ground, ambient life, a music
   preset). Adding one is additive: run `golden all` after.
4. Fan out in waves of 4–5 agents with the generated prompts; review every sheet yourself before registering.

## The building blocks (where a new need usually already has an answer)

| Need | Use |
|---|---|
| a mood / place | `studio/atmospheres.ts` (`island-dawn` … `island-sunset`) |
| a scene sequence with transitions | `story({ scenes })` in `studio/story.ts` (`cut`, `dip`, `wipe`) |
| words on screen | `intertitle` (story), `lowerThird` (claims), `chapterCard`, `storyEnd` |
| the quokka's thoughts | `thought(ctx, s, x, y, glyph, t)`: glyphs note, folder, lock, link, search, chat, board, doc, lighthouse, cloud, heart, sun, moon, key, question, check, globe, palette, tag, trash |
| the cast | `actor` (the quokka, family colour), `librarian` (Fern + glasses, app-rendered), `cloud`, `lineQuokka` (line style) |
| app UI | `studio/ui.ts`: appFrame, task, results, choice, table, codeBlock, link, tagChip, fileList, keys, pointer |
| Rottnest props | `rotli/island.ts`: ferry, jetty, sign, bike, lighthouse, sea, beach |
| a vertical / carousel / card from any episode | `DeriveSpec` + `tools/derive-modules.mjs` |
| a new companion look | add to `brand/companions.json`, `bun scripts/render-companions.ts --only-missing` |
| themes from the app | `bun scripts/sync-themes.ts` → `library/themes.json` → copy to `brand/themes.json` deliberately |

## Other shapes

- **30 s explainer ("Rotli in 30 seconds"):** `ep01Write.ts` is the reference. Use `titleCard`, `lowerThird`, `endCard` from
  `studio/series.ts`, 900 frames, `add-episode.mjs` to register.
- **Short from the film:** `teaser15.ts` (reframe any film's frames under captions).
- **Looks/themes shorts:** `dressUp.ts`, `themesLoop.ts`. **Stills:** `stills.ts`. **Carousel from scratch:** `howRotliWorks.ts`.
