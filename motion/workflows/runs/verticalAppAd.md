# Build study: Vertical App Ad

- **Piece:** `verticalAppAd`
- **Launched:** 2026-09-25 15:26 UTC · **model:** claude-opus-5-5[1m]
- **Cost:** 217,576 tokens · 57 tool calls · 20.7 min
- **Source:** `6f834591-5513-4f19-a058-1af9a5cdd8f7.jsonl` (extracted by `tools/extract-runs.mjs`)

## Prompt

````markdown
Your complete instructions are in the file ~/rotli-studio/motion/series/studies/prompts/vertical-app-ad.prompt.md. Read that file first and follow it exactly: it is the prompt this study is built from (other agents are building other studies in parallel in the same folder, so touch ONLY the files it allows). Iterate on the contact sheets until the piece meets the quality bar of the reference study, then report as the file asks.
````

## Report (the agent's own summary, unedited)

Study 02, Vertical App Ad, is built in both sizes, and every check the prompt asks for passes on the final renders of both. Nothing was committed, and the pieces are not registered.

**Files created (only these three):**
- `~/rotli-studio/motion/src/canvas-core/studies/verticalAppAd.ts` exports `verticalAppAd` (vertical) and `verticalAppAdLandscape`. It follows the reference study's structure and uses the "sage" palette.
- `~/rotli-studio/motion/src/hosts/page-verticalAppAd.ts`
- `~/rotli-studio/motion/src/hosts/page-verticalAppAdLandscape.ts`

**What it does:** the cuts sit exactly on the brief's frames (0, 72, 216, 360, 576, 720, 828, 900), which are all on the 18-frame beat grid.
- **Hook:** "Finding / *one hour*" fills the screen while calendar cards orbit the rings. The words then shrink into the first line of the problem caption.
- **Problem:** twelve chat bubbles, a counter that ticks to 12, and "takes *twelve* messages."
- **Turn:** a 3-2-1 deep-green stack lifts away to reveal the app icon (an arched bay window with one lit pane), then the prompt types.
- **Work:** three rows of availability, a scan that stops on Thursday, the 3–4 slot lighting up, and a slot card that pops with "Held".
- **Done:** the card turns into the invite and flies out, then the three avatars get a check each and a toast says "Everyone's in."
- **Payoff:** "One message." / "*Not twelve.*"
- **End card:** the mark, "Oriel", `oriel.example` and "A fictional product, drawn in code."

The vertical keeps captions in the top third with the UI in the centre. The landscape puts the UI on the left half and the captions on the right. Both hook layouts were adjusted so the orbiting cards never cross the words.

**Checks (final renders):**

| Check | Vertical | Landscape |
|---|---|---|
| `still-frames` `windows:` line | empty (identical: 0) | empty (identical: 0) |
| Loudness | −16.1 LUFS | −16.1 LUFS |
| `render.mjs` determinism check | 6/6 identical | 6/6 identical |

- `loop-seam` does not apply, because this piece is not a loop.
- `npx tsc --noEmit -p tsconfig.json` prints nothing.
- Sound uses the soft score at 100 bpm: whooshes ending on 216 and 720, a hit at 504 when the slot appears, and ticks on each bubble, countdown lift, prompt, row landing, "Held" chip, check and toast. The sign-off starts at 832, just after the end card.

**Final sheets:** `/tmp/vertical-app-ad.png` and `/tmp/vertical-app-ad-landscape.png` (frames are in `/tmp/vertical-app-ad/` and `/tmp/vertical-app-ad-land/`). The videos are `/tmp/verticalAppAd.mp4` and `/tmp/verticalAppAdLandscape.mp4`.

**Choices of mine that aren't in the brief:**
- **Motion blur:** 6 samples with a half-frame shutter, so the countdown lift, card fling and invite flight smear like a camera would see them.
- **Extra captions:** the brief gives no captions for the turn and done beats, so I wrote "Or just *ask*." and "It sends the *invite*." The teammate lines in the chat are also invented.
- **Ring dots:** the small dots on the rings fade out while full-screen type holds the frame, and near the day and name labels, so they never cross text.

**What I would improve with more time:**
- Make the countdown count with a flip rather than a lift.
- Have the chat scroll once the screen is full, instead of only stacking.
- Use the landscape's extra height for a taller availability grid; the busy blocks and the one-hour slot are small.
- Fill the empty caption zone during the countdown (216–270).
- Give the done beat a little more going on than three avatars and a toast.

**Could not make work:** nothing is outstanding.
