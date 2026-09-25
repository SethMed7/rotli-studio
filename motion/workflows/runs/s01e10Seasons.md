# Build S01E10 Seasons finale

- **Piece:** `s01e10Seasons`
- **Launched:** 2026-09-24 17:20 UTC · **model:** claude-opus-5-5[1m]
- **Cost:** 206,262 tokens · 50 tool calls · 14.9 min
- **Source:** `6f834591-5513-4f19-a058-1af9a5cdd8f7.jsonl` (extracted by `tools/extract-runs.mjs`)

## Prompt

````markdown
Your complete instructions are in ~/rotli-studio/motion/workflows/prompts/s01e10.prompt.md. Read that file first and follow it exactly: it is the contract, generated from the episode brief. Do not edit shared files. When done, report exactly what it asks for. Note for this finale: it may visit every atmosphere via each scene's `atm`, the Librarian and companion looks are available (pass the look ids you use in story({ looks: [...] }); existing looks are listed in brand/companions.json).
````

## Report (the agent's own summary, unedited)

The s01e10 "Seasons" episode is built and every check the prompt asks for passes. The video renders, the dead-air check prints an empty `windows:` line, and the type check prints nothing for s01e10.

**Files.** I created `src/canvas-core/s01e10Seasons.ts` and `src/hosts/page-s01e10Seasons.ts`. `derive-modules` then generated the vertical, carousel and single modules and their three hosts, and `add-story` registered the episode plus those three cuts in `pieces.json`. I edited no shared file. `git status` shows the whole `motion/` folder as untracked in the rotli-studio repo, so I can't check the change set against git. I cleaned nothing.

**What the episode shows.** The scenes add up to 1800 frames, all multiples of 15. The Librarian looks are passed through `story({ looks })`, along with the companion looks I used.
- **Cold open (sunset):** the quokka hops in with the Trip ideas note, sets it down, and thinks "sun". The card reads "One year on the island."
- **Chapter card:** "Seasons."
- **Seasons montage:** I split the 480 frames into six scenes (90+75+75+75+75+90), one per family, each in its own atmosphere, in the brief's visit order. Each season shows the same Trip ideas note in that family's light and dark theme, and its tasks get done as the year turns.
- **Looks (paper-studio):** a Companion panel where each click is a real look. It goes through the colours (the Line look included), glasses, bucket hat, and the waving and celebrating poses. Then the companion is switched off and leaves a dashed outline.
- **Welcome (Rotli Light):** a new Ocean-coloured friend opens the Welcome folder with its nine real lesson titles, ticks a task in "Tasks and progress" and picks a result. It then goes through Settings → General → Show me around. The tour lights up New, Main, Search and Aa, with the app's real step titles ("1 of 6" and so on).
- **Finale (sunset):** the quokka brings the note to the Librarian. Small lights in the six colours rise, and the card reads "Everything changes colour. / Everything is kept."
- **End:** the end card with no "Next", and the quokka and the Librarian both waving.

**Sheets**
- Landscape, the prompt's 10 frames: `/tmp/s01e10.png`
- Vertical: `/tmp/s01e10v.png`. This is a 5-frame sheet re-run after the last fixes, not the prompt's 10 frames.
- Carousel (frames 14 to 89): `/tmp/s01e10k.png`
- Single (frame 14): `/tmp/s01e10s.png`
- Video: `/tmp/s01e10.mp4`

**Still-frames result:** `identical: 16`, with an empty `windows:` line. The 16 single repeated frames are allowed by the checklist and are most likely where the wipes start.

**Claims I was unsure of**
- **Companion caption:** it reads "Pick a body colour, a mood and pose, / and glasses or a bucket hat." I cut "black or white linework" and "in any colour" from the middle of the claim, because the looks can't show white linework or other hat colours. The remaining words are the claim's own, in order, but it is a mid-sentence cut.
- **Welcome demo UI:** the tour step titles and lesson names come from the Rotli app. The Settings sheet's "Guided tour" and "Points at the real controls." are my own UI filler, not captions.

**What I couldn't make work cleanly**
- **Colours leaking into the short versions:** when the vertical, carousel and single re-render a frame, the last season's colours stayed active. The background of those cuts turned Grove green or Ocean blue. I added a local wrapper, `visiting`, that hands the colours back to Rotli after each non-Rotli scene. The side effect is that the midnight rain, the fade-in colour and the wipe line in those scenes now use Rotli colours. It's barely visible, but the proper fix belongs in the shared `studio/derive.ts`, which I wasn't allowed to change.
- **Tour callouts:** they sit over the editor heading, the way the real tour covers content. A flat dimming layer makes this read as deliberate.
