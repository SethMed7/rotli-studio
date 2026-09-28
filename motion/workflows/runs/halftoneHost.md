# Build study 23 Halftone Host

- **Piece:** `halftoneHost`
- **Launched:** 2026-09-28 14:49 UTC · **model:** claude-opus-5-5[1m]
- **Cost:** 262,123 tokens · 67 tool calls · 23.8 min + 322,660 tokens · 29 tool calls · 5.8 min
- **Source:** `d919aee8-0829-4b05-988c-37e4e6bfb3d8.jsonl` (extracted by `tools/extract-runs.mjs`)

## Prompt

````markdown
Your full instructions are in the file ~/rotli-studio/motion/series/studies/prompts/halftone-host.prompt.md — read it first and follow it exactly (it is the contract; the brief it names is at ~/rotli-studio/motion/series/studies/briefs/halftone-host.json).

Extra context:
- Another agent is building study 22 (cardWall.ts) in the same checkout at the same time. Never touch its files. If `npx tsc --noEmit -p tsconfig.json` reports errors only in cardWall.ts / its hosts, ignore them; your own module must be clean.
- Use /tmp/halftone-host* for every output path so you don't collide with it.
- The visual reference is a public product film; a 24-frame contact sheet of it is at /tmp/xref/achxvi-sheet.png. Look at it for pacing, composition, the halftone texture and the editorial chrome ONLY: never copy its character (a curly-haired boy), its blue, its product or its copy. Our host is an original alarm-clock character, and our one colour is the "mono" palette's accent.
- Performance: halftoning per frame can be slow. Render the host's tone field into a small offscreen canvas (and cache anything that is a pure function of the pose, keyed by rounded parameters, if it helps) so a frame draws in well under a second; the render must still be a pure function of the frame.
- Quality matters more than speed: iterate on contact sheets until each scene looks designed at both sizes (landscape AND vertical). The host must read clearly as a cute alarm clock with a face. Text must never overlap other text or leave the safe area.
- Do not commit. Do not edit pieces.json, series.json, the kit, the pack, or anything outside your module and its two hosts.

Report back concisely: files created, sheet paths, still-frames and loudness results for both sizes, the tsc result, and any known weaknesses.
````

## Follow-ups (sent while or after it ran)

### 2026-09-28 15:18 · Round-2 fixes for Halftone Host

````text
Round 2 for Halftone Host: fix these problems from the maintainer's scored critique (round 1: hook 7, readability 8, motion 7, variety 8, composition 7, accuracy 10, sync 8; the bar is 8+ everywhere).

The critique used a new tool, `node tools/critique.mjs /tmp/halftoneHost.mp4` (it writes sheet.png, phone.png, fast-1.png, fast-2.png and pace.json to /tmp/critique-halftoneHost/). Use it after your fixes, for both sizes, and read all four images.

1. **Motion, 00:09.0–00:09.3, the 'One sentence.' slam:** the motion blur shows discrete ghost copies ("Ooooo"), not a smooth smear. Sample the shutter much more densely on that move (e.g. scale the sample count with the distance moved in the shutter, so no two copies sit more than about 2 px apart), or smear it analytically. Check fast-1.png: it must read as a continuous streak.
2. **Readability, the face at every size:** the two dial hands form a V between the eyes that reads as a beak or nose at small sizes. Keep the hands as a mood signal, but move them out of the face: short and thin, pivoting from a small centre boss below the mouth (or behind the face in a lighter tone), so the eyes and mouth read first. The bento tile and end-card sizes matter most.
3. **Hook, 00:00–00:01.5:** no words appear until about 1.5 s. The first words ('Got a') should land by about 0.5 s while the host is still hopping in, so the first two seconds show what the piece is about.
4. **Composition, vertical 00:12–00:14:** the 'Handled.' stamp covers the availability line ('Thu 11:00 · all free') and the invites label. Move or resize it so it covers no text (it may overlap a tile edge or the empty space between rows).
5. **Composition, vertical 00:07:** the phone is mostly empty white while the headline builds. Fill it with the Oriel screen earlier, or shorten the phone so it is not a big blank slab.

Same rules as before: only your module and its two hosts; render to /tmp/halftoneHost.mp4 and /tmp/halftoneHostVertical.mp4; still-frames must stay empty; loudness about −16; tsc clean; do not commit. Report what you changed per problem, and the new critique.mjs numbers for both sizes.
````

## Report (the agent's own summary, unedited)

### Report 1 · 2026-09-28 15:13

I built Halftone Host (study 23) in both sizes. Every check passes: no dead air, −15.8 LUFS, tsc clean. Nothing is committed and nothing is registered.

**Files created (only these three):**
- `~/rotli-studio/motion/src/canvas-core/studies/halftoneHost.ts` exports `halftoneHost` (landscape) and `halftoneHostVertical`
- `~/rotli-studio/motion/src/hosts/page-halftoneHost.ts`
- `~/rotli-studio/motion/src/hosts/page-halftoneHostVertical.ts`

**Contact sheets:** `/tmp/halftone-host.png` (landscape) and `/tmp/halftone-host-v.png` (vertical), 12 frames each; full frames are in `/tmp/halftone-host/` and `/tmp/halftone-host-v/`.

**Renders:** `/tmp/halftoneHost.mp4` and `/tmp/halftoneHostVertical.mp4`. These use the `&lt;pieceId&gt;.mp4` name the prompt gave, not the `/tmp/halftone-host*` prefix you asked for.

**Checks:**

| Check | Landscape | Vertical |
|---|---|---|
| still-frames | `windows:` empty, `identical: 0` | `windows:` empty, `identical: 0` |
| Loudness | I = −15.8 LUFS | I = −15.8 LUFS |
| Render determinism probe | 6/6 frames identical | 6/6 frames identical |

- **tsc:** `npx tsc --noEmit -p tsconfig.json` printed nothing and exited 0, even without filtering out cardWall.
- **Lint and format:** oxlint found nothing in my three files, and I ran oxfmt on those three files only.
- **Speed:** frames draw in about 6–45 ms, so no pose caching was needed.

**Determinism bug I found and fixed:** at first 2 of 6 probe frames came out differently depending on which frame was drawn before them. The offscreen plate is resampled when drawn, and that sampling reads a pixel or two past the region it copies, where old pixels from the previous frame sat. Clearing a small margin around the region before writing it fixed this.

**How it works, where it differs from the brief:**
- **Tone field:** each part is shaded per point as a sphere, torus or cylinder lit from the top left. The tones go into a number buffer that sets the dot sizes. The offscreen canvas holds only the host's white silhouette, so it stays white on the red and black scenes; the greys never go into that canvas.
- **Dot grid:** I wrote my own dot loop instead of core `halftone`, so the grid is anchored to the host's ground point. With core's version the dots crawl while the host hops.
- **The loop around the bento** is a squarish hand-drawn loop, not a true circle, because a circle big enough to enclose the bento would leave the frame. The bento pulls back to 82% while it draws, so all small text in the bento is enlarged to stay at least 22 px after the shrink.
- **Section labels:** the "One sentence." scene shows `// 04 — handled` and the end card shows `// 05 — flow`.
- **Wordmark:** it is set as `Orıel` with a dotless ı, and the peeking, winking host acts as its dot. For about 6 frames before the host rises, the ı has no dot.
- **Dial hands** print lighter than the eyes so the face reads first. In the bento the hands spin while Oriel works, then snap up with the "Handled." stamp.
- **Scene 05:** "decide" is off-white italic as the brief's scene text says, with an underline in the accent colour.

**Known weaknesses:**
- The "Handled." stamp is an opaque card, so it deliberately covers some bento text: tags, status lines, and in vertical part of "Thu 11:00 · all free". I placed it over the gap between rows so the big numbers and the host stay visible, but it does hide text.
- The hand-drawn loop crosses over some tile corners.
- At small sizes (the bento tile and the end card) the face gets busy, because the V of the hands sits close to the eyes. It reads, but not as crisply as the large host.
- The silhouette edge is slightly soft (about 2 px) on the red and black scenes.
- The vertical end card and the vertical problem scene have a fair amount of empty space.
- At the speech-bubble frames the talking mouth is just a small dark ellipse.

With more time I would improve the face at small sizes (dots a little finer or features a little bolder), give the host a proper speaking mouth, and add wrapping for the typed text on the phone screen.

### Report 2 · 2026-09-28 15:24

All five round-2 problems are fixed in both sizes, and every gate still passes. The critique tool still reports a 5-second "calm" stretch during the bento scene, which I did not fix.

**Gates, both sizes** (re-rendered to `/tmp/halftoneHost.mp4` and `/tmp/halftoneHostVertical.mp4`):
- still-frames: `windows:` is empty.
- Loudness: I = −15.8 LUFS.
- Determinism: 6/6 probe frames identical.
- tsc: my module and hosts are clean. The only errors come from the other agent's `page-fivePointFive*.ts` hosts, which import a module that doesn't exist yet.
- oxlint and oxfmt are clean on my files. Nothing is committed.

**critique.mjs numbers:**

| Size | Changes per 10 s | Longest calm | Near-still | Fastest moves |
|---|---|---|---|---|
| Landscape | 3 | 5 s from 00:10.0 | 39 % | 00:09.1, 00:17.9 |
| Vertical | 4 | 5 s from 00:10.0 | 39 % | 00:09.1, 00:17.9 |

I read all four images for both sizes, in `/tmp/critique-halftoneHost/` and `/tmp/critique-halftoneHostVertical/`.

**What changed, per problem:**

1. **Slam ghosting.** The word moves up to about 1,600 px in one frame, far too far for sampled blur, so I replaced it with a smear calculated from the exact distance moved (`smear()`). Copies now sit no more than 1.5 px apart. In `fast-1.png` it reads as one continuous streak that snaps sharp, in both sizes. The slam no longer uses `kit/blur.ts`, although the brief names it; the file header explains why.
2. **Face readability.**
   - The hands now pivot from a small centre knob below the mouth.
   - They are short and thin, and printed lighter than the eyes.
   - The 6 o'clock tick is gone so the hands have room there.
   - The mood poses still read: V up for happy, Λ down for the droop.

   In `phone.png` the eyes and mouth read first at every size. The hands still show as a faint grey mark under the smile.
3. **Hook.** "Got" lands at 0.2 s and "a" at 0.33 s, while the host is still hopping in. The whole headline and its underline finish by about 2 s.
4. **Vertical stamp over text.** The bento now shrinks toward its top edge instead of its centre, which frees space below it inside the loop. "Handled." lands there in both sizes, overlapping only the loop line, and covers no text. The stamp is smaller as a result (112 px vertical, 128 px landscape). I raised the bento's small text from 27 to 29 px so it still clears the 22 px minimum at the shrunk scale.
5. **Empty vertical phone.** The phone outline draws faster. The screen content now fills from about 0.3 s into the scene: typing, then the three slots, then the button. The content scales with the phone's width, so the vertical phone is full by 00:07 instead of a blank white block.

**Also fixed:** `fast-2.png` showed that the cut to the end card landed on an empty page for about 3 frames. The "Orıel" wordmark is now there on the cut frame, and the host starts rising immediately.

**Not fixed:** the 5-second calm from 00:10.0 is the whole bento scene. The widgets keep animating, but no single change is big enough to register with the tool. Adding a large mid-scene event, such as a quick punch-in at about 12 s, is the obvious next step if the pacing score falls below 8.
