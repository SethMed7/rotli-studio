# Evaluation: can this room make motion for other products?

Written 2026-09-24, after Rotli's film, the "Rotli in 30 seconds" series (ep01–ep08), Season One
(ten one-minute story episodes) and one cross-product dry run on a second product's live marketing site
(kept private). The runnable flow is the Q&A skill
`~/.claude/skills/brand-motion-studio/SKILL.md`. This file explains why it's shaped that way.

## Verdict

**Yes, for everything except the character.** Brand, type, grounds, themes, atmospheres, story
structure, derivatives, audio and QA all come from data (`brand/*.json`, briefs) and port with
**no code changes**. That was proven in the dry run: discovery found the site's serif, palette and FAQ,
the proposal rendered a faithful look still, and the story templates rendered its chapter cards,
intertitles and night end cards with no mascot. A mascot is the one part that costs real work, and it's
optional (`"character": null` runs typographic).

**Q&A skill, not a CLI.** A CLI would have to hard-code the judgment calls that made the Rotli work
good: which section colour is the "band", which claims are strong, whether the character may speak,
what's unreleased. Those are the questions the skill asks. Everything deterministic is already a CLI
(`tools/*.mjs`), and the skill calls them. Opus supplies the reading and the owner supplies the approvals.

## The flow (what each phase produces)

| Phase | Tool / step | Output | Ported in the dry run? |
|---|---|---|---|
| Discover | `tools/discover.mjs <url>` | `discovery.json` (computed type, CSS tokens, section grounds, fonts, marks, claims, FAQ) + full-page shots | ✅ |
| Propose | `tools/propose-brand.mjs` | draft `brand.json`, `themes.json`, `evidence.md` (every value, its source) | ✅ accent needed the `--accent` rule |
| Confirm | Q&A + `brandLook` still | approved brand pack | ✅ look matched the site |
| New room | `tools/new-studio.mjs <dir> --brand …` | clean room: engine + templates, no Rotli pieces | ✅ byte-identical look still |
| Character | `import-quokka.py` / sprites / none | `quokka/poses.ts` or `character: null` | ✅ none (typographic) |
| Plan | bible + briefs + calendar | `season/`, `launch/` | not run: needs the product's owner |
| Produce | reference piece → `brief-to-prompt.mjs` waves → review | pieces, derivatives, goldens | engine proven, no episodes made |

## What ported cleanly (and why)

- **Brand seam.** One file (`brand/brand.json`) holds palette, fonts (sha-locked), tracking, mark,
  pattern, product, url, cta, promise and character. The shared templates read it: after this pass
  no studio template hard-codes "Rotli", "rotli.co" or "Free · No account · Works offline"
  (the Rotli goldens stayed SAME through the refactor).
- **Theme families.** `useFamily` takes any family name in `themes.json`. If a brand's ids aren't
  Rotli's `light`/`dark`, the UI falls back to its first family.
- **Story engine.** Scenes, transitions, intertitles, chapter and end cards, thought pictograms and
  atmospheres are all theme-driven. The line style falls back cleanly without a character.
- **Derivatives.** Vertical, carousel and single come from the episode's own frames, so every
  landscape episode ships three more formats for free (`DeriveSpec`).
- **Reproducibility.** A brief (JSON) plus a fixed preamble makes the agent prompt deterministic (`brief-to-prompt.mjs`).
  Goldens hash frames and audio; the dead-air window check catches still stretches.

## What's still Rotli-shaped (the honest list)

| Thing | Where | Cost to adapt |
|---|---|---|
| **The quokka rig** | `quokka/rig.ts`, `poses.ts`, `rotli/actor.ts` | A new vector mascot is one focused session (import, clip, eyes, fill leaks were all real bugs the first time). Sprites via `drawLook` are cheaper but only sway and blink. |
| **Rottnest scenery** | `rotli/island.ts`; `island-*`, `harbour-day`, `night-vault` atmospheres | Rename or replace per product world. The non-island atmospheres (`linen-morning`, `paper-studio`, `ocean-tide`, `iris-dusk`, `midnight-rain`, `night-sky`) are generic already. |
| **Family names** | atmospheres reference `rotli`, `paper`, `grove`, `ocean`, `iris`, `midnight` | Unknown families fall back to the brand's first. For variety, map them in the Q&A (Phase 5). |
| **App UI** | `studio/ui.ts` draws a *Rotli-like* window (sidebar Home/Main/Files) | Fine for a notes app. A web product needs its own `appFrame` built from site screenshots: the biggest per-product code job after the character. |
| **Pictogram glyphs** | `thought()` glyph set | Generic (note, lock, heart, question…), but add product ones. |
| **Motes** | paper-note glyphs in `linen-morning`/`island-dawn` | Swap for the brand's pattern glyph. |

## Costs we measured (Season One)

- **Agents:** about 200–230k tokens and 40–50 tool calls per one-minute episode, 12–13 minutes wall clock,
  with 4 running in parallel. The reference episode (E01) was hand-built and took longer.
- **Review is the bottleneck,** not generation. Every episode needed a human-eye pass on its sheet. That pass
  caught a double lighthouse, low-contrast thought bubbles, line-style cards drawn in the flat style, a wrong
  folder name (`notes/` for `wiki/`), a dead-air vertical, and a filled quokka where the line art belonged.
- **Code size:** each episode is 240–380 lines; the shared studio layer is about 700.

## Risks and gaps

1. **Nobody has listened to the audio.** It's generated, deterministic and golden-hashed, but the
   golden only proves it didn't change, not that it sounds good. Add a listening pass before publishing.
2. **Invented UI.** Agents draw plausible app UI (view switchers, toggles) that may not match the
   real product. The review checklist asks, but the only real fix is **app screenshots as reference in
   the brief**, or (for Rotli) the real component harness the companion looks already use.
3. **Claims drift.** Captions are sourced in the brief, but agents shorten them. The rule: a
   shortening may drop words, never add a claim. Automate it next: a `check-claims` tool that diffs
   caption strings against `claims.md`.
4. **`pieces.json` race.** Parallel agents register at the same time. Today we re-run `add-story` for all
   briefs at the end. Better: agents never register; the orchestrator does, serially.
5. **Font licences.** discovery finds font URLs but the skill never downloads them without the
   owner's confirmation. Until then fallbacks render, which is close but not exact.
6. **Discovery heuristics** (accent, band, deep) are guesses with candidate lists. The look-still gate is
   what makes them safe; don't skip it.

## Recommendations (in order)

1. **Keep the skill as the product.** Don't build a monolithic CLI; add small deterministic tools as
   the skill finds repeated work: `check-claims` (item 3) first, then `import-mascot` (the
   `import-quokka.py` path made generic).
2. **Screenshots in briefs.** Put `reference: [png…]` in the brief schema, have discovery save
   per-section crops, and have agents draw the product's UI from them.
3. **Rename the Rotli-world atmospheres** behind a `world` layer (`island.ts` becomes one world), so a new
   product adds a world file instead of editing atmospheres.
4. **A listening checklist** in the review step (levels, the key per atmosphere, silence at the ends).
5. **Next real test:** run the whole skill for one owner end-to-end (a second product) and
   measure time to the first approved episode.
