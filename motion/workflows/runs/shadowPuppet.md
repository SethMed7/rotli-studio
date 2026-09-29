# Build study 36 Shadow Puppet

- **Piece:** `shadowPuppet`
- **Launched:** 2026-09-29 01:42 UTC · **model:** claude-opus-5-5[1m]
- **Cost:** 241,909 tokens · 58 tool calls · 43.8 min
- **Source:** `c74bb602-6202-4ec5-8b02-3569895eeb14.jsonl` (extracted by `tools/extract-runs.mjs`)

## Prompt

````markdown
Your full task is in ~/rotli-studio/motion/series/studies/prompts/shadow-puppet.prompt.md — read it and follow it exactly. Then read ~/rotli-studio/tmp/studies-27-50/builder-extra.md: extra rules for this build wave (other agents are building other studies in parallel). Build the study, verify it by looking, and report as both files ask.
````

## Report (the agent's own summary, unedited)

Study 36, "Shadow Puppet", is built in both sizes, and every check the prompt asked for passes. I rendered both sizes and looked at them: no dead air, both at −16.2 LUFS, and my files typecheck clean. It is not registered and nothing is committed.

**Files created (only these):**
- `~/rotli-studio/motion/src/canvas-core/studies/shadowPuppet.ts`, which exports `shadowPuppet` (landscape, the main size) and `shadowPuppetVertical`
- `~/rotli-studio/motion/src/hosts/page-shadowPuppet.ts`
- `~/rotli-studio/motion/src/hosts/page-shadowPuppetVertical.ts`

I did not touch the pack, `pieces.json`, `series.json`, goldens or the kit. I also did not write a `critiques/*.json` record, because hard rule 1 limits me to my module and hosts; the scores are below instead. `series/studies/portable/shadow-puppet.md` shows up in `git status` but is not mine.

**What it contains:**
- **The glow:** the tinted backlight dissolves amber, then blue, then rose over 20 frames each. It dims in the dark scene and fades at the end. The flicker and 1 px gate weave step every second frame from a fixed hash of the frame number, so nothing is random at render time.
- **The puppets:** the fox, owl and hare are jointed rigs whose joints only rotate, and all three move on twos.
  - The fox's walk uses the brief's formulas.
  - The owl misses the thin branch tip and flaps to recover.
  - The hare turns over like a card each time it changes direction.
  - The lantern is found by tracing the joint chain, so the reflection flies into it at 280–300 and the moon rises out of it at 660–706.
- **The fox between scenes:** she stays one continuous performance: she keeps trotting through the dusk-to-night change, and turns over through the night-to-tree change.
- **Scenery:** trees are cut with leaf holes, the tail with crescents, the ground edge with a zig-zag grass fringe, and the corners carry curling tendrils. The far, middle and near layers sit at 35%, 70% and full ink and drift at different speeds as the view pans.
- **Captions and cards:** Instrument Serif at 44 px (landscape) and 40 px on two lines (vertical), in bands with cut-paper borders.
  - The title card's border draws itself, and a small fox with an unlit lantern trots out and looks up at the moon, which makes the opening frames catch the eye.
  - The closing card has "The End" over a breathing fox, asleep and curled.
- **Vertical:** it tilts down from the canopy at dusk and pans up the tree as she climbs, with the moon in the upper third.
- **Sound:** soft music-box at 90 bpm, key −3. The prompt's cues are all in, including two whooshes ending at 300 and 660.
  - Footstep ticks are thinned to one per stride; leap ticks land at 612, 632 and 652.
  - The hit at 400 is the kit's standard one. The gentler hit at 680 is my own soft thump and bell, because the kit's hits all have the same strength.
  - The three-note sign-off comes in at 840.

**Final sheets:**
- Landscape: `/tmp/shadow-puppet-land.png`
- Vertical: `/tmp/shadow-puppet-vert.png`
- Critique folders: `/tmp/critique-shadowPuppet/` and `/tmp/critique-shadowPuppetVertical/` (both made from the final renders)

**Checks:**

| Check | Landscape | Vertical |
|---|---|---|
| still-frames | `windows:` empty (46 identical frames, from moving on twos) | `windows:` empty (6 identical) |
| loop-seam | not a loop | not a loop |
| loudness | `I: -16.2 LUFS` | `I: -16.2 LUFS` |

`npx tsc --noEmit` shows no errors in my files. I also ran oxlint and oxfmt on my three files only. I did not run `bun run verify`, because other agents are mid-build.

**Self-critique, landscape and vertical scored the same:**

| hook | readability | motion | variety | composition | accuracy | sync |
|---|---|---|---|---|---|---|
| 8 | 8 | 8 | 7 | 8 | 10 | 9 |

- Variety stays at 7 on purpose. The critique tool counts 0 abrupt changes per 10 s because the brief forbids hard cuts and asks for 20-frame dissolves on twos. Adding cuts to raise the number would break the brief.
- Readability: the 44/40 px captions are what the brief specifies. They are small on a phone-width sheet but still legible.

**Problems that remain:**
- On the trot-in (104–200) the paws slide somewhat against the ground, because she crosses the screen faster than the fixed 24° leg swing can carry her.
- In the scene-1 pan the pond drifts slowly left while the fox stands still (world-correct, but it pulls her toward the left third around 280–320).
- The owl, and the hare at times, read against the 70% middle trees rather than the glow (430–540).
- Each scene has about 20 frames with no caption band (for example 560–582), because each band fades out at the end of its scene and back in after the next begins.
- As the closing glow dims (870–899), its centre turns a slightly muddy olive-rose.
- The sleeping fox on the end card is small and a bit blobby at phone size.
- When the vertical camera climbs the tree (640–720), the area below the band becomes a flat dark field (it is under the platform's UI zone, but it is plain).

**With more time** I would:
- Match the trot speed to the stride.
- Thin the middle trees behind the owl.
- Overlap the caption fades across scene changes.
- Give the closing card a cleaner warm fade.
- Carve more detail into the sleeping fox.
