# Build study: One-Shape Loop

- **Piece:** `oneShapeLoop`
- **Launched:** 2026-09-25 15:26 UTC · **model:** claude-opus-5-5[1m]
- **Cost:** 156,207 tokens · 37 tool calls · 12.5 min
- **Source:** `6f834591-5513-4f19-a058-1af9a5cdd8f7.jsonl` (extracted by `tools/extract-runs.mjs`)

## Prompt

````markdown
Your complete instructions are in the file ~/rotli-studio/motion/series/studies/prompts/one-shape-loop.prompt.md. Read that file first and follow it exactly: it is the prompt this study is built from (other agents are building other studies in parallel in the same folder, so touch ONLY the files it allows). Iterate on the contact sheets until the piece meets the quality bar of the reference study, then report as the file asks.
````

## Report (the agent's own summary, unedited)

Study 03, One-Shape Loop, is built in both sizes and passes every check the prompt lists. Nothing is committed or registered, and I touched nothing outside my three files.

**Files created**
- `~/rotli-studio/motion/src/canvas-core/studies/oneShapeLoop.ts` exports `oneShapeLoop` (square 1080×1080) and `oneShapeLoopLandscape` (1920×1080). It follows the reference study's structure: a `make(size, id)` factory, one continuous `paint(F)` with motion blur, shots that only name the sections (pill 0 · spinner 120 · check 240 · card 330 · fold 420, all on the 30-frame beat grid), colours and fonts from the `loop` palette, and `beatScore` for sound.
- `~/rotli-studio/motion/src/hosts/page-oneShapeLoop.ts`
- `~/rotli-studio/motion/src/hosts/page-oneShapeLoopLandscape.ts`

**How it works**
- **One shape:** a single rounded rectangle whose width, height, radius, press dip, colour, ring hollowness and arc coverage are all kit `track(..., loop=480)` springs, each ending on its first key.
  - The pill breathes, the cursor glides in and presses at frame 90 (dip plus ripple), and the pill collapses to a circle.
  - The circle hollows into a ring, and an arc chases itself around it.
  - The ring closes into a solid disc that pops, a check draws itself at frame 262, and two soft rings spread out.
  - The disc stretches into a white card reading "Thu 3:00 · Booked" with a calendar glyph and "30 MIN · ALL 4 FREE", then folds back into the pill while the cursor leaves.
- **Landscape:** the shape stays centred. On the left, "STATE" sits over the state name in mono, rolling like an odometer. On the right, four dots where the active one stretches into a small indigo pill, with an "0N / 04" counter.
- **Text and sound:** the smallest text is 22 px and all text is inside `layout().safe`. The sound is a soft `beatScore` with `loop: true`, ticks at 90 and 262, and `gain: 0.36`.

**Final sheets**
- Square: `/tmp/one-shape-loop.png` (full frames in `/tmp/one-shape-loop/`)
- Landscape: `/tmp/one-shape-loop-landscape.png` (full frames in `/tmp/one-shape-loop-land/`)
- Seam, frames 477–2: `/tmp/seam.png`. Frames 479 and 0 look the same by eye.

**Results**

| Check | Square | Landscape |
|---|---|---|
| still-frames | `identical: 0`, `windows:` empty | `identical: 0`, `windows:` empty |
| loop-seam | seam 0.73% vs largest inner step 21.14%, SEAMLESS | seam 0.48% vs 12.00%, SEAMLESS |
| loudness | −16.1 LUFS | −16.1 LUFS |

- The first square render measured −9.1 LUFS, so I set `gain: 0.36` to bring it to −16.
- Both ticks show up as clear high-frequency spikes in the audio at frames 90 and 262.
- Both renders passed the draw budget and the determinism check (6/6), and `npx tsc --noEmit` prints nothing.
- The square seam read 0.38% on an earlier render and 0.73% on the final one. The later edits didn't touch the pill at the seam, so the difference is most likely video compression noise, not a real jump.

**Deliberate calls to review**
- The floor shadow is the only gradient in the piece: a radial fade drawn as a shadow, not a fill on the shape. I read the style's "soft floor shadow" as allowing it.
- The spinner's rotation and head/tail chase are a pure function of the frame, not springs. They only show while the ring is open and are hidden at both ends, so the seam is unaffected. Everything else is a spring.
- The landscape state ticker counts 0 to 4 and reads the value mod 4, so the step from "Booked" back to "Schedule" rolls forward instead of rewinding. The file has a comment explaining this.

**What I'd improve with more time**
- The spinner arc gets quite short (about 29°) at its tightest each second and reads thin there. The lavender track on the pale ground is quiet too.
- The check tick falls partway through the stroke. It would feel sharper if it started with the stroke.
- As the pill collapses, it briefly squashes into a slight oval (the spring overshoots). I reduced it, but a little is still visible.
- There is a short blank-white moment while the card stretches, before its content arrives.
- "ALL 4 FREE" could be misread as "all for free". Something like "4 of 4 free" would be clearer.
- The landscape has a lot of empty space around the edges. A faint floor line or slow ambient drift could fill it.

Nothing failed to work.
