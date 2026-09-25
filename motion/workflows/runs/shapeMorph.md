# Build study: Shape Morph

- **Piece:** `shapeMorph`
- **Launched:** 2026-09-25 18:52 UTC · **model:** claude-opus-5-5[1m]
- **Cost:** 158,853 tokens · 34 tool calls · 12.6 min
- **Source:** `6f834591-5513-4f19-a058-1af9a5cdd8f7.jsonl` (extracted by `tools/extract-runs.mjs`)

## Prompt

````markdown
Your complete instructions are in the file ~/rotli-studio/motion/series/studies/prompts/shape-morph.prompt.md. Read that file first and follow it exactly: it is the prompt this study is built from (other agents are building other studies in parallel in the same folder, so touch ONLY the files it allows). Iterate on the contact sheets until the piece meets the quality bar of the reference study, then report as the file asks.
````

## Report (the agent's own summary, unedited)

Study 09, Shape Morph, is built in both sizes (square is the primary, landscape the second), and every check passes on both. Nothing was committed or registered, and I touched no other file.

**One dependency first:** the study uses the `"mono"` palette, and that palette exists only in the uncommitted change to `brand/packs/studio/pack.json`. That change was already in the worktree when I started and I didn't edit it. It has to land with or before these pieces, or `palette("mono")` throws.

**Files created (only these three):**
- `~/rotli-studio/motion/src/canvas-core/studies/shapeMorph.ts`, which exports `shapeMorph` (square) and `shapeMorphLandscape`
- `~/rotli-studio/motion/src/hosts/page-shapeMorph.ts`
- `~/rotli-studio/motion/src/hosts/page-shapeMorphLandscape.ts`

**How it's built:**
- **Timeline:** shots are circle 0, square 120, triangle 240, star 330, soften 420 (each on the 30-frame beat grid), and the grid pulses at frame 60.
- **The morph (what the study teaches):** every outline is sampled at the same 240 angles as one radius per angle, so a sample lands exactly on every corner. Each shape change has its own spring weight, and the outline is the first shape plus each weight times the step to the next shape. Weights that overshoot push past the new shape, which gives the square's pinched snap and the star's burst.
  - Each change has its own spring (snap, fold, burst, soften). They use a small helper in the module that works like the kit's looping `track` but with one spring per key; the kit itself is untouched.
- **Turning:** the turns are 90, 90, 72 and 108 degrees, adding up to exactly one full turn. Each shape is pre-rotated so it lands upright.
- **Satellites:** three coloured satellites (red, blue, ink) on tilted, flattened orbits, passing behind and in front of the shape. They reverse direction at the fold, are flung wider and pulled back at the star, and make whole turns per loop.
- **Dot grid:** it has a slow travelling wave all the time, and ripples go out from the centre on each morph. The ripple launched at 420 carries on through frame 0.
- **Landscape:** the shape name rolls on the left in small mono, with an `0n / 04` counter. On the right, four small shapes show the active step, with a sliding bar underneath. The grid leaves a clear panel behind both, so no dots sit under the text.
- **Sound:** `beatScore` soft, loop on, gain 0.36, with a tick on each of the four morphs.

**Checks (both sizes):**

| Check | Square | Landscape |
|---|---|---|
| still-frames `windows:` | empty | empty |
| loop-seam | seam 0.78% vs largest inner 9.93%, SEAMLESS | seam 0.58% vs 6.01%, SEAMLESS |
| loudness | −16.1 LUFS | −16.1 LUFS |

`npx tsc --noEmit` prints nothing.

**Final sheets:** `/tmp/shape-morph.png` (square) and `/tmp/shape-morph-landscape.png` (landscape). The full frames are in `/tmp/shape-morph/` and `/tmp/shape-morph-l/`, and the videos are `/tmp/shapeMorph.mp4` and `/tmp/shapeMorphLandscape.mp4`.

**Fixed along the way:**
- **Star outline:** the formula that turns corner points into radii had its two radii swapped. The star came out points-down, and the star-to-circle blend looked lumpy. After the fix, an offline check puts the star's points at 18/90/162/234/306 degrees, and the sheets show it upright.
- **Colour mix:** it was returning `rgb()` strings that were then mixed again, which gave invalid colours on the ripple dots. It now returns hex.
- **Satellite speed:** the first speeds were about 65 px per frame, which showed as stacked copies under motion blur. I slowed them down and dropped the light outline on all but the ink satellite when it's in front.

**What I'd improve with more time:**
- At the star's fling peak the outer satellites come fairly close to the frame edge. A slightly smaller fling would give them more room.
- Satellites are layered against the shape but not against each other, so where two orbits cross, the wrong one can sit on top for a frame or two.
- In the middle of a roll, the landscape name shows clipped letters top and bottom, as the reference's name roller does. A taller window would read softer.
- The square-to-triangle and star-to-circle in-betweens are a little lopsided, because the shape turns while it blends. Spreading the turn over the blend more evenly would make them more symmetric.

Nothing failed to work.
