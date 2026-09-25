# Build study: Annotated UI

- **Piece:** `annotatedUi`
- **Launched:** 2026-09-25 19:58 UTC · **model:** claude-opus-5-5[1m]
- **Cost:** 220,571 tokens · 37 tool calls · 18.5 min
- **Source:** `6f834591-5513-4f19-a058-1af9a5cdd8f7.jsonl` (extracted by `tools/extract-runs.mjs`)

## Prompt

````markdown
Your complete instructions are in the file ~/rotli-studio/motion/series/studies/prompts/annotated-ui.prompt.md. Read that file first and follow it exactly: it is the prompt this study is built from (other agents are building other studies in parallel in the same folder, so touch ONLY the files it allows, and keep full renders to the ones the prompt requires). Iterate on the contact sheets until the piece meets the quality bar of the reference study, then report as the file asks.
````

## Report (the agent's own summary, unedited)

Study 13 ("Annotated UI") is built in both sizes. I reviewed contact sheets of each and adjusted until everything passed: dead-air check clean, −15.9 LUFS, and the type check prints nothing.

**Files created (only these three):**
- `~/rotli-studio/motion/src/canvas-core/studies/annotatedUi.ts` exports `annotatedUi` (vertical, the primary size) and `annotatedUiLandscape`.
- `~/rotli-studio/motion/src/hosts/page-annotatedUi.ts`
- `~/rotli-studio/motion/src/hosts/page-annotatedUiLandscape.ts`

It is built like the reference study: a `make(size, id)` factory, one continuous paint of a fractional frame with motion blur, and shots named at cuts 0/75/210/360/510/615/690, all on the 15-frame beat. Colours are the pack's "slate" palette plus mixes of its own colours. Fonts are Inter, Instrument Serif and Italic, and JetBrains Mono. Nothing is imported from Rotli. The pieces are not registered; `brand/packs/studio/pack.json` and `workflows/study-preamble.md` were already modified before I started, and I didn't touch them.

**The six beats:**
1. The invite slides in and a red marker loop draws around "3:00 AM"; caption "Sent at *3 a.m.?*"
2. The camera pushes in; a highlighter swipes "UTC", an arrow swoops to a scribbled note "Ana is in Lisbon"; caption "Nobody lives in *UTC.*"
3. The team thread fills with complaint bubbles that scroll, a "typing…" bubble appears, and a red loop circles the unread badge; caption "Every team has *one.*"
4. The same invite rebuilds row by row into "Tue 10:00 · your time" with each guest's local time. The red marks stay on the fixed values, the camera pushes into the guest list, and ticks draw next to Ana, Ben and Kai.
5. The marks turn red → teal and reshape into three checkboxes beside the card, and a checklist writes in under "Draw the eye, then the *fix.*"
6. The card lifts away, "Oriel" rises with a hand-drawn teal underline, and the caption reads "times that make sense to *everyone*".

**Sizes:** landscape keeps the invite on the left with captions and the checklist on the right. The vertical re-stacks with the card above and captions and checklist below, inside the safe area. The camera never pushes the card into the captions.

**Final contact sheets:** `/tmp/annotated-ui.png` (vertical) and `/tmp/annotated-ui-landscape.png`. Full frames are in `/tmp/annotated-ui/` and `/tmp/annotated-ui-landscape/`.

**Checks on the final code:**

| | annotatedUi (vertical) | annotatedUiLandscape |
|---|---|---|
| `still-frames.mjs` | `identical: 7`, `windows:` empty | `identical: 8`, `windows:` empty |
| Loudness | −15.9 LUFS | −15.9 LUFS |
| `loop-seam.mjs` | not run: this piece is not a loop | not run: this piece is not a loop |

- The type check prints nothing.
- Videos are at `/tmp/annotatedUi.mp4` and `/tmp/annotatedUiLandscape.mp4`.
- Landscape at first had two stretches of dead air (frames 334–352 and 597–612). The bouncing "typing…" bubble and an underline under the last checklist row fixed both.

**Sound:** the kit's score has no squeak or pop, so the module mixes its own on top of the soft 120 bpm score. There is a marker squeak as each mark draws, a pop for each bubble, hits at the fix (360) and the sign-off (615), and the score's sign-off chime. A single fixed gain keeps peaks under 0.97, so renders stay identical run to run.

**What I'd improve with more time:**
- The scribbled note is italic serif, slightly rotated and wiped on. The pack has no handwriting face, so it reads more "serif note" than true marker writing.
- The squeak is synthesised and I haven't listened to it; its sound and level may need tuning.
- The landscape sign-off is sparse; the wordmark and caption could fill more of the frame.
- The right column in landscape is still fairly empty from about 150 to 210, after the zone caption has landed.

**Could not make work:** nothing blocking.
