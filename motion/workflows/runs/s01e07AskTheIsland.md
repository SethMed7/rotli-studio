# Build S01E07 Ask the Island

- **Piece:** `s01e07AskTheIsland`
- **Launched:** 2026-09-24 17:20 UTC · **model:** claude-opus-5-5[1m]
- **Cost:** 200,071 tokens · 43 tool calls · 7.3 min
- **Source:** `6f834591-5513-4f19-a058-1af9a5cdd8f7.jsonl` (extracted by `tools/extract-runs.mjs`)

## Prompt

````markdown
Your complete instructions are in ~/rotli-studio/motion/workflows/prompts/s01e07.prompt.md. Read that file first and follow it exactly: it is the contract, generated from the episode brief. Do not edit shared files. When done, report exactly what it asks for.
````

## Report (the agent's own summary, unedited)

Episode s01e07 "Ask the island." is built and all the contract checks pass. The film render shows no dead air (`still-frames` printed `identical: 0` and an empty `windows:` line), and `tsc | grep s01e07` prints nothing. I made no commits, didn't touch ~/rotli (apart from read-only greps), and didn't edit any shared file.

**Files created** (all under `~/rotli-studio/motion/`):
- `src/canvas-core/s01e07AskTheIsland.ts` is the episode and its derive spec. All helpers are defined locally.
- `src/hosts/page-s01e07AskTheIsland.ts` came from the scaffold.
- `derive-modules` generated `src/canvas-core/s01e07Vertical.ts`, `s01e07Carousel.ts` and `s01e07Single.ts`, plus their `src/hosts/page-*.ts` pages.
- `pieces.json`: `add-story` registered the episode and its three derivatives.

**The story, as built** (7 scenes, total 1800 frames, no retiming):
- **cold (210):** At dusk the quokka hops in with the Trip ideas card and holds it up to read. Two blank pages drift nearby as things it has forgotten. It thinks a question mark, then a chat bubble.
- **chapter (120):** chapter card with the `ai_chat` pose.
- **ask (450):** It types "What's left before the trip?" A panel listing the vault's notes shows six notes being read, and three light up. "Read" chips name Trip ideas, Ferry times and Packing list, then the answer types out. The model picker opens to show On this Mac, Claude Code, Codex and Cursor, then closes on On this Mac.
- **notes (390):** The Conversation notes panel fills with a rewritten badge. A file button then flips the window to Files → `chats/Trip chat.md`, shown as raw Markdown with the `## Conversation notes` section highlighted.
- **pdf (300):** It types "Make this a PDF." and `Trip plan.pdf` appears beside the chat. The page flies up to the celebrating quokka.
- **payoff (210):** the intertitle "Asked at dusk. / Answered from its own notes.", with the quokka, the token card and the PDF.
- **end (120):** end card with "Next: The Locked Box".

The derive spec has 4 vertical beats (870 frames), 4 slides and 1 single, with every crop aspect between 1.71 and 1.78.

**Final sheets:**
- `/tmp/s01e07.png` (episode)
- `/tmp/s01e07v.png` (vertical)
- `/tmp/s01e07c.png` (carousel)
- `/tmp/s01e07s.png` (single)
- The render is at `/tmp/s01e07.mp4`.

**Claims I was unsure of:**
- The "Flip the globe for a web lookup." claim is not captioned. The globe button is drawn switched off in the chat header, which fits "answers from its own notes".
- I kept "rotli rewrites" in lowercase exactly as the brief words it, even though the brand is written "Rotli" everywhere else.
- Claims 1 and 2 are split across the caption's headline and sub-line. The wording is not extended.
- The `## Conversation notes` heading with `###` topic headers and `-` bullets matches `~/rotli/src/chatMemory/model.ts`. The transcript lines above that section in the raw `.md` view are illustrative, because I didn't confirm the real transcript format.
- The reply text "Made Trip plan.pdf, beside this chat." and the "Ask the island…" placeholder are made-up UI copy, not product strings.

**Could not make work:** nothing is blocked. Two small layout notes:
- In the vertical cut, the full-window crops put UI text at roughly 17–20 px, the same trade-off earlier episodes made.
- In the ask scene the model-picker dropdown briefly covers the question bubble on purpose, since it's a menu.
