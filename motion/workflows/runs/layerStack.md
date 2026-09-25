# Build study: Layer Stack

- **Piece:** `layerStack`
- **Launched:** 2026-09-25 19:58 UTC · **model:** claude-opus-5-5[1m]
- **Cost:** 204,860 tokens · 36 tool calls · 13.6 min
- **Source:** `6f834591-5513-4f19-a058-1af9a5cdd8f7.jsonl` (extracted by `tools/extract-runs.mjs`)

## Prompt

````markdown
Your complete instructions are in the file ~/rotli-studio/motion/series/studies/prompts/layer-stack.prompt.md. Read that file first and follow it exactly: it is the prompt this study is built from (other agents are building other studies in parallel in the same folder, so touch ONLY the files it allows, and keep full renders to the ones the prompt requires). Iterate on the contact sheets until the piece meets the quality bar of the reference study, then report as the file asks.
````

## Report (the agent's own summary, unedited)

Layer Stack (study 10) is built in both sizes, vertical and square, and passes every check the prompt asks for. The last `npx tsc --noEmit -p tsconfig.json` printed nothing. An earlier run failed on another agent's `numberedSteps.ts`, which has since been fixed; none of my files ever had errors.

**Files created** (nothing else touched, pieces not registered):
- `~/rotli-studio/motion/src/canvas-core/studies/layerStack.ts`: exports `layerStack` (vertical) and `layerStackSquare` (square). It is built like the reference study: a `make(size, id)` factory, one continuous `paint(F)`, and shots at `[0, 60, 180, 330, 480, 630, 720]`, all on the 15-frame beat grid.
- `~/rotli-studio/motion/src/hosts/page-layerStack.ts`
- `~/rotli-studio/motion/src/hosts/page-layerStackSquare.ts`

**Final contact sheets** (12 frames each, 0 to 700):
- `/tmp/layer-stack.png` (vertical)
- `/tmp/layer-stack-square.png` (square)
- The full frames are in `/tmp/layer-stack/` and `/tmp/layer-stack-square/`.

**Checks on the final renders:**

| Check | `/tmp/layerStack.mp4` | `/tmp/layerStackSquare.mp4` |
|---|---|---|
| still-frames | `identical: 0`, empty `windows:` | `identical: 0`, empty `windows:` |
| Loudness | −15.6 LUFS | −15.6 LUFS |
| Determinism | 6/6 probe frames identical | 6/6 probe frames identical |

The loop-seam check doesn't apply because this piece isn't a loop.

**What changed while iterating on the sheets:**
- **Slab shadows** were landing above the slabs, because the slow push-in scaled the shadow's position but not its offset. Fixed.
- **Scene 1:** the desk scene was too small on its slab, so I scaled it up.
- **Scene 2:** the diagonal links under a centred label are gone. The front node's label now hangs below the node. Node spacing and orbit sizes now scale with the slab, so the square cut isn't crowded.
- **Frames 456–476** showed a plain navy square with nothing moving on it. The memory starburst now fades while the square tilts back into a slab, so there is no dead moment.
- **Square cut:** the stack moved up a little so the `oriel.example` line clears it.

**What I'd improve with more time:**
- Frames 0–1 show only the rays; the first slab arrives at frame 1. A stronger opening thumbnail would help.
- In the hook, falling slabs pass behind the caption for a few frames, which is most visible in the square.
- The three memory labels sit on top of the starburst lines; placing them to avoid the lines would be cleaner.
- Nothing plays between 480 and 534 frames while the slabs fly home; a short caption could fill it.
- The sound ends with about 2.8 s of the sign-off chime alone. That comes from the kit's `beatScore` design and is the same in the reference study.

There was nothing I couldn't make work.
