# Build study: Data Story

- **Piece:** `dataStory`
- **Launched:** 2026-09-25 18:52 UTC · **model:** claude-opus-5-5[1m]
- **Cost:** 199,203 tokens · 45 tool calls · 14.9 min
- **Source:** `6f834591-5513-4f19-a058-1af9a5cdd8f7.jsonl` (extracted by `tools/extract-runs.mjs`)

## Prompt

````markdown
Your complete instructions are in the file ~/rotli-studio/motion/series/studies/prompts/data-story.prompt.md. Read that file first and follow it exactly: it is the prompt this study is built from (other agents are building other studies in parallel in the same folder, so touch ONLY the files it allows). Iterate on the contact sheets until the piece meets the quality bar of the reference study, then report as the file asks.
````

## Report (the agent's own summary, unedited)

The Data Story study (08) is built in both sizes and passes every check the prompt asks for. I compared the contact sheets against the Motion Résumé reference and iterated until they held up.

**Files created** (nothing else touched; not registered, not committed):
- `~/rotli-studio/motion/src/canvas-core/studies/dataStory.ts`, which exports `dataStory` (landscape) and `dataStoryVertical`
- `~/rotli-studio/motion/src/hosts/page-dataStory.ts`
- `~/rotli-studio/motion/src/hosts/page-dataStoryVertical.ts`

The other dirty files in the repo (the pack, briefs, prompts, portable/, tools, and the other studies) belong to the maintainer or the parallel agents, not to me. The generated `dist/dataStory*.html` is gitignored.

**Final sheets and videos:**
- Sheets: `/tmp/data-story.png` (landscape) and `/tmp/data-story-vertical.png`. Full frames are in `/tmp/data-story/` and `/tmp/data-story-v/`.
- Videos: `/tmp/dataStory.mp4` and `/tmp/dataStoryVertical.mp4`.

**Check results:**

| Check | Landscape | Vertical |
|---|---|---|
| `tsc --noEmit` | nothing printed | nothing printed |
| `still-frames` `windows:` | empty | empty |
| Loudness | −15.7 LUFS | −15.7 LUFS |
| Determinism probe (render tool) | 6/6 identical | 6/6 identical |
| Draw-time budget (render tool) | pass | pass |

`still-frames` also reports "identical: 6" (landscape) and "identical: 5" (vertical). I didn't check which frames those are; the `windows:` line, which is the gate, is empty for both. `loop-seam` doesn't apply because the piece isn't a loop.

**Decisions to know before registering it:**
- **Timing:** the brief's frame 400 isn't on the 15-frame beat grid, so the sign-off now starts at 390. That gives it two full bars. The other cuts are 0, 60, 150, 240 and 330.
- **Same clock:** each figure is driven by the same timer as its shape: the headline 92→98 with its meter, the re-sort and the "+6 pts" chip; each bar label with its bar; the "Hours saved" readout with the line's head; "3/4" with the donut arc. In the sign-off, "14 h" rolls from 0 (in the dashboard, the line's readout also lands on 14.0 h).
- **Pointer (my addition, not in the brief):** a cursor clicks Auto-book on the switch beat, then drifts toward the charts. Without it, 147–165 and 225–241 counted as still frames. The 98% also gets a small pop and a coral ring on its sound hit. Cut the pointer if you don't want it; you'd then need other motion in those two gaps.
- **Vertical:** the headline card is pinned on top, larger, above a clipped column. The column scrolls to the line and donut widgets over frames 230–276. For the push-in, the headline card grows to cover the frame. A wide "98%" can only fill a tall frame's width, so this is how it gets full-frame.
- **Kit bug:** `toggle()` in `kit/ui.ts` sets `ctx.globalAlpha` outright instead of multiplying it, so it ignores a parent fade. It left a mint pill floating while the rest of the dashboard dimmed. I drew the switch inside the study instead of editing the kit; the kit should be fixed.
- **Fast numbers:** when a digit changes faster than half a step per frame, it now shows sharp digits changing each frame instead of a smeared strip. The value at rest is still exact.

**What I'd improve with more time:**
- The vertical donut card has empty space on its right; the donut could be bigger or the list wider.
- During the re-sort, narrowed bars briefly cross and their labels fade. A cleaner route, like lifting bars as they pass, would read better.
- The sign-off is plain centred text; the "Oriel" name could get more of a lockup treatment.
- The vertical leaves the platform-unsafe top (220 px) and bottom (320 px) as bare ground, which is correct but plain.

Everything I set out to do works.
