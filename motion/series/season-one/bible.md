# Rotli · Season One: "The Island Keeps Everything"

Ten one-minute story episodes. Each tells a small story on Rottnest and teaches one cluster of
Rotli features. Each has its own theme family, atmosphere and style, and they are all built from
one engine (`src/canvas-core/studio/story.ts`) so they read as one series. Episode data lives in
`series/season-one/episodes/s01eNN.json`; how to build or rebuild one is in `workflows/README.md`.

## The season in three sentences

1. **Setup:** a quokka arrives on a quiet island with its thoughts blowing everywhere.
2. **Turn:** it learns to keep them. It catches thoughts (⌥C), writes plainly, makes boards and
   documents, digs a burrow of files, meets the Librarian who files by lighthouse light, ties notes
   together, asks the island questions, and locks away what must stay home.
3. **Payoff:** as the seasons turn, everything the quokka made is still there, in its own folder,
   in plain files.

**Recurring token:** the *Trip ideas* note (a paper card with a clay folded corner). It is caught in
E01, written in E02, filed in E05, linked in E06, asked about in E07, and back at sunset in E10.
**The island is the vault:** one place, nothing leaves it. **The lighthouse is the Librarian's office.**

## Cast

| Who | Drawn with | Rules |
|---|---|---|
| **The quokka** (protagonist) | the vector rig (`actor`): brand line art, fill, blink, hop, squash | Its body colour follows the episode's family (`LOOK.quokka`). **It never speaks in words**; it thinks in **pictograms** (`thought(ctx, s, x, y, "folder", t)`). |
| **The Librarian** | the app's real `<Character>` looks: the Fern quokka in glasses (`librarian(...)`, looks `*-green-glasses`) | Older, calm, precise. Appears at night (E05) and at the finale (E10). Never hops (sprites don't); sways and blinks. |
| **The clouds** (remote models) | `cloud()` from the kit | Curious and harmless, always *outside* the boundary; dizzy when turned away. |
| **The chip** (on-device model) | the green chip with a face (see `rotli/shotsNight.ts`) | Lives inside the house; may read secure notes. |
| **A friend** (E09) | the vector rig in Ocean colour, flipped | Lives on another island; has a browser and an old folder. |

## World and places

The ferry and jetty (Thomson Bay), the beach and the tide line, the pink salt lake, the lighthouse
on the hill (Wadjemup), the hut (the app window), and the burrow (the vault folder).
Scenery comes from `rotli/island.ts` through the `island-*` atmospheres. Rotli's app UI is drawn
from theme roles (`studio/ui.ts`).

## Words: how the story is told

- **Intertitles** (`intertitle`) carry the narrative, in the style of silent-film cards: short, present
  tense, and the key word underlined in the accent.
- **Lower thirds** (`lowerThird`) carry the feature claim during app demos.
- **Thought bubbles** carry the quokka's feelings and intentions as pictograms only.
- Every claim in a caption comes from the episode brief's `features[].claim`, which is sourced to the
  README, rotli.co /features, /privacy or the FAQ. Never: Safari or phones for the web, anything on
  the Experiments list presented as shipped, "sync", real personal data.

## Atmospheres (`studio/atmospheres.ts`)

| id | Family | Ground and ambient life | Music | Used for |
|---|---|---|---|---|
| `island-dawn` | Rotli | Rottnest by day + drifting paper motes | C, tune 0 | arrivals, beginnings |
| `linen-morning` | Rotli | base + file field + rising paper motes | C, walking | writing |
| `paper-studio` | Paper | base + drafting grid + faint file field | F, walking | boards, documents |
| `grove-burrow` | Grove | warm band + drifting leaves | G, tune 0 | the folder, the storm |
| `night-vault` | Rotli (deep) | deep + stars + the lighthouse beam | D, lilting | the Librarian at night |
| `night-sky` | Rotli (deep) | deep + stars (no lighthouse: for scenes that bring their own) | D, lilting | night scenes with props |
| `ocean-tide` | Ocean | base + a moving tide line | G, walking | links, search, views |
| `iris-dusk` | Iris | base + first stars + a crescent moon | F, lilting | conversation, chat |
| `midnight-rain` | Midnight (deep) | deep + rain | D, tune 0 | privacy, secure notes |
| `harbour-day` | Ocean | Rottnest by day | G, tune 0 | other shores, the web |
| `island-sunset` | Rotli | Rottnest at sunset | D, lilting | endings |

## Styles (how marks are made)

- **flat:** the brand default. Filled quokka, flat props, the site's grounds.
- **line:** the site's privacy-band look. The line-art quokka (`lineQuokka`) in one colour on a deep
  or gridded ground, with thin outlines and no fills. Used in E03 (drafting) and E08 (privacy).
- **paper:** the linen page and its paper props, with motes of paper in the air (E02).

## Episode map

| # | Title | Features (the cluster it owns) | Atmosphere | Style | Next |
|---|---|---|---|---|---|
| 01 | Arrival | ⌥C quick capture → Captures; ⌥Space open/hide | island-dawn | flat | Plain Words |
| 02 | Plain Words | hybrid Markdown; tasks, choices, switches, tables, Mermaid, math; Aa → raw | linen-morning | paper | The Workshop |
| 03 | The Workshop | Excalidraw boards and Word (.docx) documents, saved in their own formats | paper-studio | line | The Burrow |
| 04 | The Burrow | one folder; Files like Finder; Remove from Main; Trash; delete-the-app | grove-burrow | flat | The Lighthouse Keeper |
| 05 | The Lighthouse Keeper | the Librarian: areas, summaries, tags, guarded undo, never the words; raw vault | night-vault | flat | Threads |
| 06 | Threads | wikilinks (inert when missing); ⌘K; ⌘T/⌘N; panes; views; rebindable hotkeys | ocean-tide | flat | Ask the Island |
| 07 | Ask the Island | Chat: on-device or your installed client; grounded answers; Conversation notes; files a PDF | iris-dusk | flat | The Locked Box |
| 08 | The Locked Box | secure notes; secret shapes; remote never; on-device may; lock | midnight-rain | line | Other Shores |
| 09 | Other Shores | Rotli Web; the Helper; import or open an Obsidian/ZenNotes/Markdown folder | harbour-day | flat | Seasons |
| 10 | Seasons | six families, light and dark; the companion; the Welcome folder and the tour | island-sunset + every family | flat | (season end) |

## Episode shape (60 s = 1800 frames, 120 bpm, 15-frame beat)

A cold open (a story hook in the first 3 s), then the chapter card (`chapterCard`), then two or three
feature beats (story scenes, app demos, diagrams), then a payoff intertitle, then the end card
(`storyEnd` with "Next: …"). Scene lengths are multiples of 15 and sum to 1800. Every scene keeps
moving (the atmosphere's ambient life, drift, the quokka breathing); `check` enforces it.
