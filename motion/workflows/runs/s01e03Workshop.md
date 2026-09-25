# Build S01E03 The Workshop

- **Piece:** `s01e03Workshop`
- **Launched:** 2026-09-24 17:08 UTC · **model:** claude-opus-5-5[1m]
- **Cost:** 161,167 tokens · 32 tool calls · 6.6 min
- **Source:** `6f834591-5513-4f19-a058-1af9a5cdd8f7.jsonl` (extracted by `tools/extract-runs.mjs`)

## Prompt

````markdown
Your complete instructions are in ~/rotli-studio/motion/workflows/prompts/s01e03.prompt.md. Read that file first and follow it exactly: it is the contract, generated from the episode brief. Do not edit shared files. When done, report exactly what it asks for.
````

## Report (the agent's own summary, unedited)

S01E03 "The Workshop" is built, and every check in the brief passes: the render shows no dead air, `tsc` prints nothing for s01e03, and all four sheets look right. I did not commit, did not touch `~/rotli`, and did not run `render all` or `golden`.

**Files created**
- `~/rotli-studio/motion/src/canvas-core/s01e03Workshop.ts` and `~/rotli-studio/motion/src/hosts/page-s01e03Workshop.ts` (scaffolded, then all stub scenes replaced; derive spec filled in).
- `derive-modules.mjs` generated `src/canvas-core/s01e03Vertical.ts`, `s01e03Carousel.ts`, `s01e03Single.ts` and their three `src/hosts/page-s01e03*.ts` pages.
- `add-story.mjs` registered s01e03Workshop and its three derivatives in `pieces.json`. At that moment `pieces.json` held only s01e01 and s01e03 entries.

**What the episode does** (scene lengths unchanged from the brief, total 1800 frames, paper-studio, line style)
- **cold (210):** the line-art quokka hops in (drawn facing its direction of travel) to an outline drafting table with the Trip ideas card pinned to it. It thinks a board glyph, then a doc glyph. Two intertitle lines: "It needs a map of the island, / and a letter for the ferry office."
- **chapter (120):** "The workshop."
- **board (450, wipe transition):** a Rotli window with Trip ideas, Island map and Ferry letter in the sidebar, and an Excalidraw tool strip. The island map is drawn stroke by stroke with the pointer riding the pen: coast, lighthouse, three salt lakes, jetty, a dashed ferry route arrow, then typed labels. The camera pushes in slowly so UI text stays at least 26px on screen.
- **doc (420):** a Word page and toolbar. The pointer clicks Bold, the letter is typed with a caret, and it is signed with a paw print.
- **files (390):** under a "Rottnest trip" header, three file tiles side by side: `.md` (the Trip ideas token), `.excalidraw` (a mini map) and `.docx` (a mini letter), labelled Markdown / Excalidraw / Word. The pointer opens each one in turn.
- **payoff (90):** "A map. A letter. / Ordinary files."
- **end (120):** "Next: The Burrow".

**Final sheets**
- `/tmp/s01e03.png` (main, the 10 prescribed frames)
- `/tmp/s01e03Vertical.png`
- `/tmp/s01e03Carousel.png` (frames 14–89)
- `/tmp/s01e03Single.png`
- `/tmp/s01e03x.png` (extra check of the transition frames)

**Still-frames on `/tmp/s01e03.mp4`:** `identical: 3`, and the `windows:` line is empty.

**Claims I was unsure of**
- **Board caption:** "Sketch on an Excalidraw canvas," / "saved as an ordinary .excalidraw file." This is the exact claim, split over two lines.
- **Doc caption:** the full README claim, split over two lines.
- **Files caption:** "Open and save in their own formats," / "alongside your notes." This is a shortened form of the README claim.
- **Derivative captions** paraphrase slightly: "Sketch on Excalidraw." and "Word documents (.docx)." They also use two story lines that are not claims: "A map and a letter." / "The quokka has things to make."
- **Invented app UI:** the Excalidraw tool strip and the Word toolbar (B, I, U, H1, H2, list) are my own drawings, not copies of Rotli's real controls.
- **Tile labels:** "Markdown / Excalidraw / Word" under the file tiles are diagram text, not captions. I dropped an extra "one folder, three ordinary files" label to stay safe.

**What I could not make fully match the line style**
- **Chapter and end cards:** these shared templates always draw the filled quokka, so those two cards break the line style. I left them alone because the rules forbid editing shared files.
- **Carousel close:** the shared carousel closing card draws its own line quokka, which happens to be the lock-belly pose. I avoided that pose in my own scenes.
- **Frame 1200:** this sampled frame is blank because it is the first frame of the dip into the files scene (normal for that transition).
