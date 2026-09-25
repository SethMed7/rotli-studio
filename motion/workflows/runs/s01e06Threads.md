# Build S01E06 Threads

- **Piece:** `s01e06Threads`
- **Launched:** 2026-09-24 17:20 UTC · **model:** claude-opus-5-5[1m]
- **Cost:** 197,891 tokens · 41 tool calls · 12.4 min
- **Source:** `6f834591-5513-4f19-a058-1af9a5cdd8f7.jsonl` (extracted by `tools/extract-runs.mjs`)

## Prompt

````markdown
Your complete instructions are in ~/rotli-studio/motion/workflows/prompts/s01e06.prompt.md. Read that file first and follow it exactly: it is the contract, generated from the episode brief. Do not edit shared files. When done, report exactly what it asks for.
````

## Report (the agent's own summary, unedited)

Episode 06, "Threads.", is built and every check the prompt requires passes. I didn't commit, and I didn't run `render all` or golden.

**Checks:**
- `node tools/still-frames.mjs /tmp/s01e06.mp4` printed `identical: 0` and an empty `windows:` line.
- `npx tsc --noEmit -p tsconfig.json 2&gt;&amp;1 | grep s01e06` printed nothing.
- Scaffold, `derive-modules.mjs s01e06Threads "Threads." Threads` and `add-story.mjs` all ran. add-story printed "registered s01e06Threads + 3 derivatives".

**Files I wrote:**
- `~/rotli-studio/motion/src/canvas-core/s01e06Threads.ts` — the full episode, the derive spec, and the local helpers `hut`, `rope`, `linkChip`, `palette`, `path` and `press`.
- `~/rotli-studio/motion/src/hosts/page-s01e06Threads.ts` — the host, as scaffolded.

**Files the tools wrote:**
- `derive-modules.mjs` wrote `s01e06Vertical`, `s01e06Carousel` and `s01e06Single`, plus their hosts.
- `add-story.mjs` registered the episode and its three derivatives in `pieces.json`.

**Final sheets:**
- `/tmp/s01e06.png` (the main episode)
- `/tmp/s01e06-vertical.png`
- `/tmp/s01e06-carousel.png`
- `/tmp/s01e06-single.png`
- `/tmp/s01e06.mp4` (the rendered film)

**The episode.** It uses ocean-tide, the flat style, and scene lengths 210/120/420/360/360/210/120:
- **Cold open:** three note-huts stand on the tide line. The quokka hops in with the Trip ideas card, pins it on the middle hut, and thinks a "link" pictogram.
- **Links:** ropes tied to Ferry times and Salt lakes snap tight and turn the accent colour, each labelled with a `[[…]]` chip. The rope to the dashed "Snorkel spots" hut that isn't there yet hangs slack in the sand, with a muted dashed chip. The quokka then thinks a "?".
- **Search:** ⌘K ranks a note, a chat, a file and another note for "trip". Then "split" brings up the actions Split right ⌘D and Split down ⌘⇧D.
- **Views:** the sidebar switches from Main to a named "Trip" view, and the same rows move into groups. Then ⌘D splits the editor into Trip ideas and Ferry times side by side.
- **Payoff:** the intertitle "Nothing moved. / Everything is tied together." sits over the tied huts.
- **End:** the end card with "Next: Ask the Island".

**Claims I'm unsure of:**
- The search caption uses the brief's full wording, including the sub-line "⌘T starts a note and ⌘N chooses what a new tab becomes." Nothing on screen shows ⌘T or ⌘N; drop that line if every caption should be shown on screen.
- The action names "Split right" and "Split down" come from a read-only grep of `~/rotli/src`. I'm assuming they are ⌘D and ⌘⇧D, going by the README claim.
- These on-screen UI details are my own illustration, not taken from the real app: the "Main | Trip" view switcher, its group headers, and the palette's placeholder text.

**Minor imperfections I left:**
- The quokka passes in front of a hut's sign while it hops; this lasts only a few frames.
- The slack rope's last stretch on the sand is partly behind the quokka.
- In the search scene, the text cursor sits over the first letter of the empty search box's placeholder for about 16 frames.
- The links carousel slide and vertical beat show a sliver of the Ferry times hut at the left edge. I positioned that crop so the `[[Ferry times]]` chip isn't cut off.

Nothing failed to work.
