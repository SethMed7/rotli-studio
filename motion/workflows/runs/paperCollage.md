# Build study: Paper Collage

- **Piece:** `paperCollage`
- **Launched:** 2026-09-25 19:58 UTC · **model:** claude-opus-5-5[1m]
- **Cost:** 261,924 tokens · 55 tool calls · 21.5 min
- **Source:** `6f834591-5513-4f19-a058-1af9a5cdd8f7.jsonl` (extracted by `tools/extract-runs.mjs`)

## Prompt

````markdown
Your complete instructions are in the file ~/rotli-studio/motion/series/studies/prompts/paper-collage.prompt.md. Read that file first and follow it exactly: it is the prompt this study is built from (other agents are building other studies in parallel in the same folder, so touch ONLY the files it allows, and keep full renders to the ones the prompt requires). Iterate on the contact sheets until the piece meets the quality bar of the reference study, then report as the file asks.
````

## Report (the agent's own summary, unedited)

I built study 15, Paper Collage, in both sizes (vertical and landscape), and both passed every check the prompt asks for.

**Files** (only these three; I didn't touch the kit, pack, `pieces.json`, `series.json` or goldens, and didn't commit or register anything):
- `~/rotli-studio/motion/src/canvas-core/studies/paperCollage.ts`
- `~/rotli-studio/motion/src/hosts/page-paperCollage.ts`
- `~/rotli-studio/motion/src/hosts/page-paperCollageLandscape.ts`

**What's in it**
- **Structure:** it follows the reference study. Colours come only from the pack's kraft palette.
- **Shots:** six, cut at frames 0, 75, 225, 375, 525 and 645. The film is 720 frames at 30 fps, and every cut is on the 15-frame beat.
- **Stop motion:** each pose is held 2 frames. On every new pose, each piece shifts by a tiny random amount, as if re-placed by hand, and there is a slow push-in the whole way through. There is no motion blur, on purpose.
- **Paper look:**
  - Edges are torn once and reused, so they don't change shape while a piece moves.
  - Each piece has a white torn rim, and its shadow grows while it is lifted and shrinks when it lands.
  - There are halftone patches on the circle, the portraits, the screen and the page.
  - A grain layer covers everything and shifts once when the piece clicks in.
- **Story, beat by beat:**
  - The hook pastes "The missing piece" on letter by letter, in mixed-paper letter scraps.
  - A calendar with a jigsaw-shaped hole appears. The left hand holds its corner (fingers behind the sheet, thumb on the red band), and the right hand brings the red piece labelled "Thu 3:00".
  - A retro paper computer sits beside a big red circle, and scraps on its screen sort themselves into "Thu 3:00".
  - Three portraits (Ana, Ben, Kai) each get a paper check mark on the beat.
  - The hand presses the piece into the hole at frame 585: the sheet jolts, the grain shifts and confetti bursts.
  - The sign-off shows "Oriel" in cut letters with the piece as its mark, then "the piece your week was *missing*" and the URL.
- **Captions:** the kit's word ladders, one accent italic key word each. In the vertical they sit above the action; in the landscape the calendar stays on the left and the computer, portraits and captions change on the right.
- **Sound:** the kit's soft score at 120 bpm plus a short paper rustle on each paste. There is a hit at the click and at the sign-off, then the closing notes.

**Checks** (all run on the final version):

| Check | Vertical (`paperCollage`) | Landscape (`paperCollageLandscape`) |
|---|---|---|
| `still-frames` | `windows:` empty (327 identical frames, expected with 2-frame holds) | `windows:` empty (342 identical) |
| Loudness | −15.5 LUFS | −15.5 LUFS |
| Determinism | 6/6 frames identical | 6/6 frames identical |

- `npx tsc --noEmit -p tsconfig.json` prints nothing.
- `loop-seam` doesn't apply, since this piece doesn't loop.
- All text is inside the safe area. The smallest type is 22 px (calendar times) and 23 px (the piece label in landscape), right at the limit.
- Nothing overlaps by accident. The check marks overlapping the cards and the computer sitting over the circle are intended.

**Where to look**
- Contact sheets: `/tmp/paper-collage.png`, `/tmp/paper-collage-landscape.png`, plus `/tmp/paper-collage-hook.png` (vertical hook and sign-off, from just before the last small layout fixes).
- Full frames: `/tmp/paper-collage/` and `/tmp/paper-collage-landscape/`.
- Videos: `/tmp/paperCollage.mp4`, `/tmp/paperCollageLandscape.mp4`.

**With more time I would:**
- Tie the rustle sounds to the paste moments automatically. Right now they are a hand-kept list of frames that match to within a frame or two.
- Draw better hands, especially the left one, which only holds the sheet rather than making a gesture.
- In the vertical, move the circle more clearly "beside" the computer; the stacked layout puts it partly behind.
- Tidy two small things: `calendar()` takes an argument it doesn't use, and the confetti pieces don't record which size they belong to. That is harmless for these two sizes but would break if a size with a different short side were added.

Nothing failed or had to be left out.
