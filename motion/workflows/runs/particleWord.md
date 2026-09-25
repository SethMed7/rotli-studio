# Build study: Particle Word

- **Piece:** `particleWord`
- **Launched:** 2026-09-25 18:52 UTC · **model:** claude-opus-5-5[1m]
- **Cost:** 194,240 tokens · 45 tool calls · 12.7 min
- **Source:** `6f834591-5513-4f19-a058-1af9a5cdd8f7.jsonl` (extracted by `tools/extract-runs.mjs`)

## Prompt

````markdown
Your complete instructions are in the file ~/rotli-studio/motion/series/studies/prompts/particle-word.prompt.md. Read that file first and follow it exactly: it is the prompt this study is built from (other agents are building other studies in parallel in the same folder, so touch ONLY the files it allows). Iterate on the contact sheets until the piece meets the quality bar of the reference study, then report as the file asks.
````

## Report (the agent's own summary, unedited)

Particle Word (study 07) is built in both sizes and passes every check. The one thing I couldn't follow literally is the tempo: 110 bpm at 60 fps gives a beat of 32.73 frames, and `validate()` refuses anything that isn't a whole number of frames, so the piece wouldn't even load. The brief's own cut frames (0, 120, 270, 420, 570, 660) all fall on a 30-frame beat, which is 120 bpm. So the timeline declares 120 bpm, and `beatScore` still plays its soft loop at 110. Every sound cue is placed by exact frame:
- **Whooshes** end on the five changes of form (120, 270, 420, 570, 660).
- **Hit** at 240, when the word is complete.
- **Sign-off** at 664, under the ring.

The catch is that the loop's notes don't line up with the cuts, though the cues do.

**Files created** (nothing else touched; not registered, not committed):
- `~/rotli-studio/motion/src/canvas-core/studies/particleWord.ts`: exports `particleWord` (landscape) and `particleWordSquare` (square).
- `~/rotli-studio/motion/src/hosts/page-particleWord.ts`
- `~/rotli-studio/motion/src/hosts/page-particleWordSquare.ts`

**Final contact sheets:**
- Landscape: `/tmp/particle-word.png` (full frames in `/tmp/particle-word/`)
- Square: `/tmp/particle-word-square.png` (full frames in `/tmp/particle-word-square/`). Ignore `/tmp/particle-word-sq.png`; that was an earlier pass.

**Checks:**

| Check | Landscape | Square |
|---|---|---|
| `still-frames` | `windows:` empty | `windows:` empty |
| Loudness | −16.1 LUFS | −16.1 LUFS |
| Same frames on every render | 6/6 | 6/6 |
| Draw time (150 ms per frame limit) | pass, about 9–23 ms | pass |

- **loop-seam:** doesn't apply, since this piece isn't a loop.
- **tsc:** `npx tsc --noEmit -p tsconfig.json` prints nothing.

**How it's built:** it follows the reference study's structure. The piece has 3,200 particles, and each one has a home in each form plus its own delay:
- **Dust:** it drifts, and near motes are larger and brighter.
- **Word:** the word's pixels are sampled from an offscreen canvas. The last letters land at 240, then a glint runs through the word. The square sets it as ORI over EL.
- **Sphere:** a rotating point cloud with two tilted accent orbit rings that draw on and each carry a bead.
- **Wave:** the sphere unrolls into a flat surface, front first, and ripples toward the viewer.

A morph is a staggered spring between two homes. The last phase spirals every particle into the point, which opens into the ring, and "Oriel" / *every hour, found* fades up beneath it.

**Three choices you may want to reverse:**
- **Corner labels:** "ORIEL · PARTICLE STUDY", "3 200 POINTS", the name of the current form and a progress line aren't in the brief. I added them to match the reference study. Particles fade out near them so nothing crosses the text, and they're easy to remove.
- **Accent in the hook:** accent particles only turn orange once they're part of a form, so the crosser is the only accent in the opening. It's drawn sharp as a head with a tapering tail, because a 7 px dot averaged out to almost nothing under motion blur.
- **Fonts:** the brief asks for Inter 300, which isn't in the pack, so I used Inter 800 for the word and 600 for the name.

**What I'd improve with more time:**
- The vortex spirals points in on screen after the wave instead of being a fifth 3D form. That's a small departure from the brief's "every particle has a home" lesson.
- The rings are split into a front and back half by depth rather than sorted against the cloud, so a crossing can look slightly off.
- The transition from word to sphere passes through a fairly shapeless cloud for about half a second.
- The word is a little dim next to the sphere at thumbnail size.

Everything else worked.
