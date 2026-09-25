# Review checklist: what "done" means for a story episode

Run in order. Every item is a command or a look; nothing is judged from the code alone.

1. **Sheet:** `node tools/frames.mjs <id> 40,200,400,600,800,1000,1200,1400,1600,1760 --out /tmp/x --sheet /tmp/x.png --cols 5`.
   Read it and check:
   - Is the story legible without sound: hook, turn, payoff?
   - Does the quokka stay mute (pictograms only)?
   - Is every caption a brief claim?
   - Is UI text readable?
   - Is nothing overlapping, and no caption covering its subject?
   - Is everything in theme colours?
   - Is the ground the site's (no stripes)?
2. **Motion:** `node tools/render.mjs <id> --out /tmp/x.mp4` then `node tools/still-frames.mjs /tmp/x.mp4` must print an empty
   `windows:` line (anidoodle's dead-air standard: no 15-frame window changing under 0.5%).
3. **Derivatives:** sheets of `<base>Vertical`, `<base>Carousel` (14, 29, 44, …) and `<base>Single` (14). Check that each crop frames its
   subject, no lower-third pill is captured, the cover title fits, and the close is the deep band.
4. **Types:** `npx tsc --noEmit -p tsconfig.json 2>&1 | grep <base>` prints nothing.
5. **Register and ship:** `node tools/add-story.mjs season/episodes/<base>.json`, then `node tools/studio.mjs render <id>` (and the three
   derivatives), `check`, and `golden <id> --record` once approved.
6. **Never regress:** `node tools/studio.mjs golden rotliStory` prints SAME.
7. **Sound:** a person listens once. The machine can't.
