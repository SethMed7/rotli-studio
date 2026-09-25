# Build S01E09 Other Shores

- **Piece:** `s01e09OtherShores`
- **Launched:** 2026-09-24 17:20 UTC · **model:** claude-opus-5-5[1m]
- **Cost:** 223,596 tokens · 56 tool calls · 14.2 min + 246,455 tokens · 9 tool calls · 1.5 min
- **Source:** `6f834591-5513-4f19-a058-1af9a5cdd8f7.jsonl` (extracted by `tools/extract-runs.mjs`)

## Prompt

````markdown
Your complete instructions are in ~/rotli-studio/motion/workflows/prompts/s01e09.prompt.md. Read that file first and follow it exactly: it is the contract, generated from the episode brief. Do not edit shared files. When done, report exactly what it asks for.
````

## Follow-ups (sent while or after it ran)

### 2026-09-24 17:35 · Fix e09 import beat accuracy

````text
Fix request for s01e09: resolve the no-Mac/import contradiction you flagged. Keep every other scene as it is.
1. Brief `season/episodes/s01e09.json`:
   - logline → "The quokka's friend lives on another island, with a browser and an old folder of notes."
   - story.turn → "Rotli Web opens a real folder in Chrome, Edge or Arc; the Helper brings Firefox, Zen and Brave. Back home on its Mac, the quokka shows how Rotli's first run inspects an old folder without writing anything, then opens it in place or imports a copy."
   - features[2].claim → "Already have an Obsidian, ZenNotes, or plain Markdown folder? Rotli for Mac's first run can inspect it without writing anything, then open it in place or import a copy."
2. The import scenes (about 1200–1400):
   - Title the setup panel "Rotli for Mac" instead of "Rotli".
   - The clay quokka (the Mac user) is the one at the panel, with the magnifier thought; the friend watches, with the heart.
   - Lower third → "Rotli for Mac's first run inspects an old folder without writing anything," / sub "then opens it in place or imports a copy."
3. Derivatives: update any carousel/vertical title or sub line that repeats that claim so it says "Rotli for Mac". Then re-run `node tools/derive-modules.mjs` only if your derive spec needs it (don't overwrite hand edits).
4. Re-run `still-frames` and tsc for s01e09, re-render `/tmp/s01e09.png`, and reply with the changed lines. Don't touch shared files or pieces.json.
````

## Report (the agent's own summary, unedited)

### Report 1 · 2026-09-24 17:35

Episode 9, "Other shores.", is built and all the required checks pass. The render has no dead air, tsc is clean, and the three derivatives are registered.

**Files created or modified**
- `~/rotli-studio/motion/src/canvas-core/s01e09OtherShores.ts` — the episode, with a cue table, local helpers and `s01e09Derive`.
- `~/rotli-studio/motion/src/hosts/page-s01e09OtherShores.ts`, from the scaffold and left unchanged.
- The tools generated the rest:
  - `derive-modules.mjs` wrote `src/canvas-core/s01e09{Vertical,Carousel,Single}.ts` and their `src/hosts/page-*.ts` hosts.
  - `add-story.mjs` added the episode and 3 derivatives to `pieces.json`.
- I edited no shared files.

**Final sheets**
- `/tmp/s01e09.png` (episode)
- `/tmp/s01e09Vertical.png`
- `/tmp/s01e09Carousel.png`
- `/tmp/s01e09Single.png`

**Checks**
- `still-frames.mjs /tmp/s01e09.mp4`: `identical: 0`, and `windows:` is empty.
- `npx tsc --noEmit -p tsconfig.json | grep s01e09` prints nothing.
- Scene lengths are the brief's: 240/120/390/300/420/210/120, summing to 1800.
- Vertical beats are 180/225/210/150 frames (765 total). All crop aspects fall between 1.28 and 1.79.

**Claims and choices I wasn't sure of**
1. **Where the import scene happens.** "Inspect without writing, then open in place or import a copy" only exists in the Mac app's first-run setup. Rotli Web has no inspect or review step (its inspect call returns a stub outside the Mac app). So I drew that scene as a plain Rotli setup panel with no browser around it, using the app's real wording ("Reading the folder map…", "No files are being written.", "Obsidian vault", "Bring in Old notes.", "Open in place" / "Import a copy", "Open this vault"). The brief says the friend has no Mac, so whether the friend could actually run this setup is a question for the brief.
2. **Quokka colours.** The engine would paint both quokkas Ocean. To tell them apart, the quokka keeps its home Rotli clay and the friend is Ocean and flipped, as the brief's cast says. As a result, the blue quokka waving on the end card, the vertical's end card and the carousel close is the friend, not the quokka.
3. **Backgrounds.** The brief lists no other atmospheres (`visits: []`), but I put web, helper, import, payoff and end on `ocean-tide`: the same Ocean family on a plain background, so the app screens stay readable. Episode 1 did the same with `linen-morning`.
4. **Captions.** Lower thirds use only the brief's claim wording, shortened. I left out "Safari and phones aren't supported yet" on purpose. On-screen UI text in the web and import scenes is the app's own wording from `webVaultGate.tsx` and `vaultActivation.tsx`, shortened, never extended.

Nothing failed to work. I didn't commit, run golden or `studio.mjs render`, or change anything in `~/rotli` (I only read it to check wording). Nobody has listened to the audio yet; that needs a person.

### Report 2 · 2026-09-24 17:37

The fix is in. The import scene now takes place on the quokka's Mac, and the brief no longer says the friend has no Mac. The render still has no dead air and tsc is clean. The episode sheet is re-rendered at `/tmp/s01e09.png`; I also re-rendered `/tmp/s01e09Vertical.png` and `/tmp/s01e09Carousel.png`.

**Brief (`season/episodes/s01e09.json`), all three lines exactly as you asked:**
- `logline`: "The quokka's friend lives on another island, with a browser and an old folder of notes."
- `story.turn`: "Rotli Web opens a real folder in Chrome, Edge or Arc; the Helper brings Firefox, Zen and Brave. Back home on its Mac, the quokka shows how Rotli's first run inspects an old folder without writing anything, then opens it in place or imports a copy."
- `features[2].claim`: "Already have an Obsidian, ZenNotes, or plain Markdown folder? Rotli for Mac's first run can inspect it without writing anything, then open it in place or import a copy."

**Episode (`src/canvas-core/s01e09OtherShores.ts`):**
- The header "Turn:" comment now matches the new brief turn.
- `pair()` takes optional positions for the two quokkas (`qx = 1560, fx = 1770`). The web and helper scenes use the defaults, so they are unchanged.
- The setup panel's title reads `"Rotli for Mac"` instead of `"Rotli"`.
- In the import scene, the clay quokka works the panel, and the friend watches:
  ```ts
  pair(ctx, env, s, stage === "scan" ? "searching" : stage === "ws" ? "celebrating" : "notes", stage === "ws" ? "celebrating" : "listening", 1610, 1815);
  if (stage === "scan") thought(ctx, s, 1610, 830, "search", …)   // magnifier: the clay quokka
  if (l &gt;= I1.ws + 20) thought(ctx, s, 1815, 820, "heart", …)     // heart: the friend
  ```
  I moved the pair right (quokka x 1610, friend x 1815) because the longer caption covered the quokka at 1500.
- The lower third is now `"Rotli for Mac's first run inspects an old folder without writing anything,"` / `"then opens it in place or imports a copy."`
- Derivative captions:
  - Vertical beat 4 sub: `"Rotli for Mac inspects without writing anything."`
  - Carousel slide 4 sub: `"Or import a copy, in Rotli for Mac."`

The derivative modules import the derive spec from the episode file, so I didn't re-run `derive-modules.mjs`.

**Checks**
- `still-frames /tmp/s01e09.mp4`: `identical: 0`, and `windows:` is empty.
- `npx tsc --noEmit -p tsconfig.json | grep s01e09` prints nothing.

I didn't touch shared files and made no further changes to `pieces.json` (the only entry is the one `add-story` wrote earlier).

In the new derivative sheets, the background around each framed shot is Rotli linen, and the end-card quokka is clay; the earlier sheets had Ocean blue and a blue quokka. My derive spec only sets the frames, crops and captions. The colour depends on which family was applied last before the render, which is set in the shared `studio/derive.ts`. It's worth checking when the pieces are rendered for real.
