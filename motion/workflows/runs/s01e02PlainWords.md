# Build S01E02 Plain Words

- **Piece:** `s01e02PlainWords`
- **Launched:** 2026-09-24 17:08 UTC · **model:** claude-opus-5-5[1m]
- **Cost:** 198,543 tokens · 48 tool calls · 11.5 min
- **Source:** `6f834591-5513-4f19-a058-1af9a5cdd8f7.jsonl` (extracted by `tools/extract-runs.mjs`)

## Prompt

````markdown
Your complete instructions are in ~/rotli-studio/motion/workflows/prompts/s01e02.prompt.md. Read that file first and follow it exactly: it is the contract, generated from the episode brief. Do not edit shared files. When done, report exactly what it asks for.
````

## Report (the agent's own summary, unedited)

Episode `s01e02PlainWords` is built, registered and passes every check the contract asks for. Nothing is committed, and I didn't run golden or `render all`.

**Files created** (all under `~/rotli-studio/motion/`):
- `src/canvas-core/s01e02PlainWords.ts`: the episode, its cue table and `s01e02Derive`. Every helper is defined locally in this file.
- `src/hosts/page-s01e02PlainWords.ts`: written by the scaffold, unchanged.
- The tools also wrote these: `derive-modules.mjs` made `src/canvas-core/s01e02Vertical.ts`, `s01e02Carousel.ts`, `s01e02Single.ts` and their `src/hosts/page-*` files. `add-story.mjs` added four entries to `pieces.json`. No other shared file was edited.

**What happens in the episode** (1800 frames; the brief's scene lengths are unchanged):
- **Cold open:** the quokka hops to a morning desk and thinks a note pictogram. It types raw `- [ ]` lines onto the Trip ideas page, and the camera pushes into the page.
- **Chapter card**, with the "notes" pose.
- **Tasks:** each line is typed raw and renders when the caret moves on. Two boxes tick. The caret goes back to line 1, which shows raw `- [x] book the ferry` again.
- **Choices:** a `[#]` radio gets picked, a `[|x]` switch flips green, a pipe table renders, and a cell fills with "Snorkel".
- **Diagram:** a Mermaid fence renders as Fremantle → Thomson Bay → Pink lake, with a small ferry sailing the first leg. Then a math fence renders as a fraction.
- **Raw:** the Aa popover shows "View · all notes" with Beautified / Raw markdown, the same labels as the app's `aaPanel.tsx`. Choosing Raw markdown flips every row to its source.
- **Payoff card:** "It was plain text / the whole time.", then the end card with "Next: The Workshop".
- The lower thirds use only the four brief claims, each split over two lines where it is long.

**Final sheet paths:**
- Main episode: `/tmp/s01e02.png`
- Vertical: `/tmp/s01e02v.png`
- Carousel: `/tmp/s01e02k.png`
- Single: `/tmp/s01e02s.png`
- Video: `/tmp/s01e02.mp4`

**Checks:**
- **Still frames:** `windows:` is empty. It also printed `identical: 1`, a single identical frame, which the checklist allows.
- **Types:** `npx tsc … | grep s01e02` prints nothing.

**Claims and details I was unsure of:**
- **Derivative captions** are shortened brief wording, not the full claims: "Hybrid Markdown." / "Raw syntax only on the line you are editing.", "Render in place." / "Choices, switches, tables.", "Diagrams draw themselves." / "Every one of them is plain text.", "Aa → Raw markdown." / "Switches views in place.". The single card's subtitle comes from the logline.
- **Choices lower third** uses the whole README claim, including "wikilinks, and Mermaid diagrams". Wikilinks never appear in that scene, and Mermaid only appears in the next one.
- **Syntax on screen** comes from `~/rotli/SYNTAX.md` and the source, which I read but didn't change: `[#]`/`[#x]` for choices, `[|x]`/`[x|]` for the compact switch, and a ```` ```math ```` fence.
- **The moving ferry** under the diagram is a storytelling touch. Rotli's real Mermaid render doesn't animate a boat.
- **I removed an invented detail:** the window title no longer changes to "Trip ideas.md" after the flip, because the real app doesn't do that.

**What I couldn't do or left out:**
- **Raw view is a subset:** it shows the heading, tasks, choices, switch and table. The Mermaid and math fences never appear as plain text there, because there isn't enough vertical room in the editor.
- **Sound** hasn't been checked; someone needs to listen to it once.
