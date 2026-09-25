# Build study: Feed Storm

- **Piece:** `feedStorm`
- **Launched:** 2026-09-25 20:15 UTC · **model:** claude-opus-5-5[1m]
- **Cost:** 220,912 tokens · 49 tool calls · 20 min
- **Source:** `6f834591-5513-4f19-a058-1af9a5cdd8f7.jsonl` (extracted by `tools/extract-runs.mjs`)

## Prompt

````markdown
Your complete instructions are in the file ~/rotli-studio/motion/series/studies/prompts/feed-storm.prompt.md. Read that file first and follow it exactly: it is the prompt this study is built from (other agents are building other studies in parallel in the same folder, so touch ONLY the files it allows, and keep full renders to the ones the prompt requires). Iterate on the contact sheets until the piece meets the quality bar of the reference study, then report as the file asks.
````

## Report (the agent's own summary, unedited)

Feed Storm (study 18) is built in both sizes and both videos pass every check the prompt asks for: no dead-air windows, loudness −15.5 LUFS, and `tsc` prints nothing.

**Files created (nothing else touched, nothing registered or committed):**
- `~/rotli-studio/motion/src/canvas-core/studies/feedStorm.ts` exports `feedStorm` (vertical, primary) and `feedStormLandscape`.
- `~/rotli-studio/motion/src/hosts/page-feedStorm.ts`
- `~/rotli-studio/motion/src/hosts/page-feedStormLandscape.ts`

**The piece.** It follows the reference structure: a `make(size, id)` factory, one continuous `paint(F)`, and six shots at 0/60/240/390/540/630, all on the 15-frame beat grid. Colours come from the slate palette: pink-red is the alarm colour, teal the calm one. Each bubble's position is computed directly from the frame number.
- **Hook (0–60):** a ping falls onto the counter, "Ada: can we move it?" drops in, then a typing indicator. Caption "*47* messages".
- **Storm (60–240):** arrivals speed up from one per beat to about one every 2 frames, with 10-sample motion blur on the scroll. Red pings rain in lanes kept clear of the captions. The counter climbs to 47 and the caption reads "about one meeting."
- **Sweep (240–390):** the rain freezes and a cursor enters. It folds the bubbles in view one by one, slowing down as it goes. The bubbles further down were folded out of sight and rise in already folded, so the column relaxes instead of racing. The counter runs 47 → 3, a "HANDLED 44 ✓" stack forms, and the three kept bubbles get a teal outline. Caption "Most of it sorts *itself.*"
- **Gather (390–540):** the three kept bubbles lift out, slide together and become the card "Decide: Thu 15:00 or Fri 10:00?" with two buttons. The counter goes 3 → 1. Caption "Three people, two *times.*" The cursor hovers Fri, then Thu.
- **Decide (540–630):** the cursor taps Thu 15:00 with a teal ripple. The card, the tag ("DECIDED") and the counter all turn teal. Caption "one *decision.*"
- **Sign-off (630–690):** the counter badge (now "1", teal) flies onto the "Oriel" wordmark, with the tagline ladder underneath.
- **Sizes:** the vertical stacks captions, then the inbox (which shrinks after the sweep), then the card. The landscape keeps the inbox on the left third, with an "Nothing else needs you." empty state once the three leave, and puts the captions and card on the right.
- **Sound:** 120 bpm drive with drums from frame 60 and a pop per arrival, thinned to at least 5 frames apart. Whooshes land on the sweep (258) and the card (426); hits on the tap (570) and the sign-off (630); the sign-off chime starts at 636.

**Results:**
- **Contact sheets:** `/tmp/feed-storm.png` (vertical) and `/tmp/feed-storm-landscape.png`. Detail sheets are `/tmp/feed-storm-sweep.png` and `/tmp/feed-storm-ends.png`; full frames are in `/tmp/feed-storm/` and `/tmp/feed-storm-l/`.
- **Videos:** `/tmp/feedStorm.mp4` and `/tmp/feedStormLandscape.mp4`.
- **still-frames:** `windows:` is empty for both. The vertical has 0 unchanged frames and the landscape 2 (isolated, not a run).
- **loop-seam:** not run, because the piece isn't a loop.
- **Loudness:** −15.5 LUFS for both; the prompt says "about −16".
- **Other:** 6 of 6 sample frames came out identical across repeat renders, and every frame renders well inside the per-frame time limit.

**Deviations and caveats:**
- **Counter numbers:** they change on whole frames only, so digits don't smear inside the blur. To do that, the current frame is stored in a variable before each frame is drawn, which departs slightly from the pure `paint(F)` rule. It is still deterministic.
- **"Handled" count:** the counter runs on its own even schedule, so it doesn't match one-for-one the bubbles you see fold.
- **Vertical panel:** its bottom sits exactly on the safe margin and the slow push-in carries it about 8 px past by mid-film. That is the panel's edge, never text; setting `h: 940 * u` would remove it.
- **Render cost:** the storm and sweep use 10 blur samples, about 60 ms per frame against about 25 ms elsewhere.

**What I'd improve with more time:**
- The finished "handled" stack reads as a flat grey block in small thumbnails; something that looks more like a stack of paper would be better.
- The kept bubbles blur heavily while they gather into the card.
- The landscape's right side is fairly empty during the storm.
- The first landscape frame shows only the empty inbox, because the falling ping starts above the top edge.

Nothing failed to work.
