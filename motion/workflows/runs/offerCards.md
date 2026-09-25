# Build study: Offer Cards

- **Piece:** `offerCards`
- **Launched:** 2026-09-25 20:16 UTC · **model:** claude-opus-5-5[1m]
- **Cost:** 201,335 tokens · 33 tool calls · 11.9 min
- **Source:** `6f834591-5513-4f19-a058-1af9a5cdd8f7.jsonl` (extracted by `tools/extract-runs.mjs`)

## Prompt

````markdown
Your complete instructions are in the file ~/rotli-studio/motion/series/studies/prompts/offer-cards.prompt.md. Read that file first and follow it exactly: it is the prompt this study is built from (other agents are building other studies in parallel in the same folder, so touch ONLY the files it allows, and keep full renders to the ones the prompt requires). Iterate on the contact sheets until the piece meets the quality bar of the reference study, then report as the file asks.
````

## Report (the agent's own summary, unedited)

Offer Cards (study 19) is finished in both sizes, and both renders pass every check the prompt asks for.

**Files created (only these three):**
- `~/rotli-studio/motion/src/canvas-core/studies/offerCards.ts` exports `offerCards` (vertical) and `offerCardsPortrait` (portrait). It follows the motionResume structure: a `make(size, id)` factory, one `paint(F)` and a design block per size. It uses the "plum" palette, the pack fonts and the kit's caption ladders, and imports nothing from Rotli.
- `~/rotli-studio/motion/src/hosts/page-offerCards.ts`
- `~/rotli-studio/motion/src/hosts/page-offerCardsPortrait.ts`

Nothing is registered, committed or golden'd. `git status` shows only these three as new from this study. The generated `dist/` and `.tmp/` files are gitignored.

**What it does:** all six shots start on the 15-frame beat grid (0, 60, 210, 360, 480, 570).
- **0–60:** the hook ladder "How do / you get / *paid?*".
- **60–210:** the dark Solo ($0) and Team ($8 / seat) cards rise as one hand and fan apart. Their features tick on one by one, and a "Most picked" tag pops onto Team.
- **210–360:** Team lifts forward with a heavier shadow while Solo recedes behind it. A violet "+" joins a white "Setup fee · $0" card, under the caption "No setup, cancel *anytime*".
- **360–480:** a third card, "Per booking · $0.50", rises and flips over from its violet back while the other two fan behind it under a light veil. Caption: "Only sometimes? pay *per booking*".
- **480–570:** the three cards stack and slide off. A reply bubble shows a typing indicator, then types "hour" letter by letter.
- **570–630:** the ladder "Comment “hour” for the guide" arrives, the bubble pulses with a ring on every beat, and "Oriel · a fictional product" appears small underneath.

**How the two sizes differ:**
- **Vertical:** everything stacks top to bottom (caption, cards, "+", setup card), with the call to action under the bubble.
- **Portrait:** 1350 tall still counts as "tall" to the kit, so its safe area is only y 220–1030. The cards are smaller and side by side. The setup fee sits beside the lifted card as a left-to-right equation, and the call to action is set as two lines low in the frame, ending at 1022.

A slow camera float, a drifting dot grid and a bob on every card keep each hold moving.

**Checks:**
- `npx tsc --noEmit -p tsconfig.json` prints nothing.
- `still-frames`: an empty `windows:` line for both `/tmp/offerCards.mp4` and `/tmp/offerCardsPortrait.mp4`.
- `loop-seam`: not run, because this piece doesn't loop.
- Loudness: −16.0 LUFS on both, with the score's `gain` set to 0.67.
- The render tool's frame-time budget and determinism checks both pass.
- No text is under 22 px; the smallest are the portrait tag at 22, "nothing up front" at 23 and "your reply" at 24.
- Sound: a soft beatScore with a whoosh for each card landing, ticks on every feature and every typed letter, and a hit plus closing chime on the call to action.

**Final sheets:** `/tmp/offer-cards.png` (vertical) and `/tmp/offer-cards-portrait.png` (portrait). Full frames are in `/tmp/offer-cards/` and `/tmp/offer-cards-p/`.

**What I'd improve with more time:**
- The 4-sample motion blur leaves visible ghosting on the fastest moves: the doubled "$0 / $8" as the cards fan in (around frame 75), the flipping third card (around 368), and the stack sliding away. More samples on those shots, or slower entrances, would fix it.
- The cards fanned behind the third card show cut-off text (for example "/ seat" and "illed monthly"). It reads as depth, but a tidier version would turn them further so less text shows.
- The vertical leaves roughly y 1400–1600 empty during the compare and third-card beats. A small extra element there could use that space.
- The portrait call to action is only partly in the literal lower third, because the kit's tall-size safe margin stops content at 1030.

Nothing failed to work.
