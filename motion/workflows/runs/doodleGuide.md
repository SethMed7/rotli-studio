# Build study 24 Doodle Guide

- **Piece:** `doodleGuide`
- **Launched:** 2026-09-28 15:02 UTC · **model:** claude-opus-5-5[1m]
- **Cost:** 242,391 tokens · 93 tool calls · 24.9 min + 332,516 tokens · 130 tool calls · 35.6 min
- **Source:** `d919aee8-0829-4b05-988c-37e4e6bfb3d8.jsonl` (extracted by `tools/extract-runs.mjs`)

## Prompt

````markdown
Your full instructions are in ~/rotli-studio/motion/series/studies/prompts/doodle-guide.prompt.md — read it first and follow it exactly (the brief it names, ~/rotli-studio/motion/series/studies/briefs/doodle-guide.json, is the contract).

Extra context:
- This study is a sanctioned exception to "Oriel only": the host is the owner's own turtle mascot, and the topic is real (goldendoodle generations, coats, sizes, colours). Use EXACTLY the copy in the brief: every number is hedged on purpose ("about", "roughly", "usually"), and never write "hypoallergenic" except in the brief's "No dog is fully hypoallergenic." line. Do not add any other factual claims.
- The turtle PNGs are in motion/assets/turtle/ (head.png 640², wave.png, peek.png, laptop.png; true alpha). Embed them via the Film's `assets.images`, e.g. `images: { "turtle:head": "assets/turtle/head.png", ... }` (paths relative to motion/, like studio/stage.ts `lookAssets` uses "../library/…"), and read them in the frame with `env.image?.("turtle:head")` (see src/canvas-core/studio/look.ts line ~98 for the pattern; you may read it but must not import from studio/). Never redraw the turtle by hand: it is always the PNG, restyled by pixel passes.
- The styles: compute each (pose, style, target pixel size) ONCE with getImageData into an offscreen canvas cached at module level; frames only draw cached canvases. Check draw times in the frames.mjs output (aim well under 500 ms per frame after warm-up).
- The palette is the pack's new "doodle" palette (brand/packs/studio/pack.json): ground/surface/ink/muted/line/accent (apricot highlighter)/accent2 (turtle blue)/deep plus section roles s1…s6.
- Two other agents built studies 22 (cardWall.ts) and 23 (halftoneHost.ts) in this checkout; never touch their files; ignore tsc errors that are only in theirs. Use /tmp/doodle-guide* for every output path.
- The visual reference's contact sheet is /tmp/xref/styles-sheet.png: look at it for pacing, the per-section colour flips, the corner badge, highlighter boxes and confetti ONLY; never copy its fox, colours, product or copy.
- The dogs must be genuinely cute and readable, and the three coat types (straight / wavy / curly) must be clearly different at a glance: that is the lesson. Iterate on contact sheets at both sizes until each scene looks designed. Text never overlaps text and stays in the safe area; nothing under 22 px at 1080.
- Do not commit. Do not edit pieces.json, series.json, the kit, the pack, or anything outside your module and its two hosts.

Report back concisely: files created, sheet paths, still-frames and loudness results for both sizes, the tsc result, per-frame draw time, and any known weaknesses.
````

## Follow-ups (sent while or after it ran)

### 2026-09-28 15:27 · Round-2 fixes for Doodle Guide

````text
Round 2 for Doodle Guide: fix these problems from the maintainer's scored critique (round 1: hook 8, readability 6, motion 8, variety 6, composition 6, accuracy 10, sync 8; the bar is 8+ everywhere). The piece is charming and the badge restyles work; these are layout and pacing fixes, not a redesign.

A new tool, `node tools/critique.mjs /tmp/doodleGuide.mp4`, writes sheet.png (every 0.5 s), phone.png (12 frames at 360 px wide), fast-1/fast-2.png (12 consecutive frames around the fastest moves) and pace.json to /tmp/critique-doodleGuide/ (and -Vertical). Read all four, both sizes, after your fixes. Round 1 measured 1.4 changes per 10 s, a 10 s longest calm and 64 % near-still frames (landscape).

1. **Variety: dead openings after every flip** (00:03, 00:07, 00:13, 00:19, 00:24, 00:28). Each section opens on about 8–12 frames of an empty colour field before the headline starts rising (fast-2.png shows 9 empty frames after the 00:28 flip). Content must arrive ON the flip: the first headline word, or the section's first card, should already be moving on the cut frame. Carry something across the cut too: the badge could spin to its new style on the flip frame, or a card could slide in with the wipe.
2. **Variety: long static holds inside sections.** 64 % of frames are near-still. The generation cards sit about 3.5 s after the last one lands, and the coats about 3 s after the slider stops. Give each hold one more beat of life: the bars shimmer and refill once, the slider nudges back and forth, and a dog blinks or wags on the beat.
3. **Readability and composition, landscape:** content is small and clustered top-left, with half of every frame empty. At 360 px the card lines ('about half and half', 'about three-quarters Poodle', 'coats vary most', the coat labels, the size weights, the colour chips) can't be read. In landscape, scale the section content to use the frame: generation cards as a 2×2 grid filling the right two-thirds at about 1.6× size; coats three large cards across the width; sizes a row of four across the full width with larger labels; the colour dog larger with larger chips. Every secondary line should be at least 30 px at 1080 in landscape. Keep the vertical as it is; it's good.
4. **Composition, landscape, the honest bit:** the right half is empty. Put the sneezing doodle large on the right instead of small by the badge.
5. **Ink section:** the dog outline, badge ring and token outlines vanish on the ink ground (you noted this). Use cream outlines on that section.

Same rules: only your module and its two hosts; renders to /tmp/doodleGuide.mp4 and /tmp/doodleGuideVertical.mp4; still-frames empty; about −16 LUFS; tsc clean; no commit. Report what you changed per problem, the new critique.mjs numbers for both sizes, and your own 1–10 scores on the seven criteria in motion/workflows/critique.md.
````

## Report (the agent's own summary, unedited)

### Report 1 · 2026-09-28 15:27

I've built the Doodle Guide study (24) in both sizes and it passes every gate. Nothing is committed, and I didn't touch pieces.json, series.json, the kit, the pack or anything outside my three files.

**Files created**
- `~/rotli-studio/motion/src/canvas-core/studies/doodleGuide.ts`, which exports `doodleGuide` and `doodleGuideVertical`.
- `~/rotli-studio/motion/src/hosts/page-doodleGuide.ts`
- `~/rotli-studio/motion/src/hosts/page-doodleGuideVertical.ts`

The module embeds only `turtle:head`, `turtle:wave` and `turtle:peek` (laptop isn't used). All six badge styles are pixel passes computed once from the PNG and cached at module level, keyed by source, style and pixel size. Frames only draw cached canvases. The confetti tokens (paw and bone) go through the same passes, so they always match the badge's style.

**Contact sheets:** `/tmp/doodle-guide.png` (landscape, 16 frames) and `/tmp/doodle-guide-v.png` (vertical, 16 frames). Full frames are in `/tmp/doodle-guide/` and `/tmp/doodle-guide-v/`, and close-ups of the blinks, sneeze and badges are in `/tmp/doodle-guide-blink/`.

**Results**
| Check | Landscape | Vertical |
|---|---|---|
| Render | `/tmp/doodleGuide.mp4` | `/tmp/doodleGuideVertical.mp4` |
| still-frames | `identical: 0`, `windows:` empty | `identical: 0`, `windows:` empty |
| Loudness | −15.8 LUFS | −15.8 LUFS |

- **tsc:** no errors in my files. The only errors in the checkout are from another agent's work: `page-fivePointFive*.ts` can't find its module yet.
- **Lint and format:** `oxlint -c .oxlintrc.json --deny-warnings` exits 0 on my files, and oxfmt is applied.
- **Draw time:** 1–8 ms per frame after the page's warm-up pass, and 14 ms at worst in the final sheets. The first time a blink variant is used it's computed on that frame, still under 15 ms.
- **Loop-seam:** not applicable; this isn't a loop.

**Where I departed from the brief**
- **Badge cells are finer than the brief's 6 px.** Dither uses 3 px cells and halftone uses 4 px spacing, because a 150 px badge can't carry 6 px cells. The hook's large turtle uses 6 px.
- **Grey areas dither to ink and white only.** Otherwise the grey pants turned into apricot and blue noise.
- **Two added labels.**
  - The generations section has a small mono legend reading "golden" / "poodle".
  - The chip text on the colours card is the brief's colour names.
  - The merged basics card has no caption, because the headline "= goldendoodle." lands with the merge.
  - "hypoallergenic" appears only in the brief's line.
- **Some copy is split across lines, with no words changed.**
  - The `·` separators in the generation card lines are dropped: the title ("F1") sits above "Golden × Poodle" and "about half and half".
  - "doodle × doodle," and "several generations" are on separate lines.
  - Size labels show the name above the weight ("roughly 50–90 lb").
  - On vertical, the honest-bit line wraps to three lines, "Which doodle / is yours?" wraps to two, and the footnote wraps after "approximate;".
- **No badge or section label in the hook or on the end card,** since the turtle is large there.
- **Blink** comes from closed-eye variants made once from the native PNGs: the eye whites, iris and pupil are repainted in skin tone and a lash line is added. Each is shown for 4 frames.
- **F2's coat changes on every beat,** each change landing with a squash-pop so it reads as "varies".
- **The sign-off at frame 966 stops the music loop,** so the last ~3.8 s is the sign-off chime only.

**Known weaknesses**
- On the ink section, ink outlines disappear against the ink ground: the dog outline, the badge ring and shadow, and the token outlines. The paw confetti reads as apricot blobs there.
- During the peek blink a faint ring of the eye's outline stays inside the lens.
- The riso badge is fairly light and grainy at vertical scale.
- The honest bit's landscape frame leaves the right half mostly empty. The copy is larger to compensate.
- Each section's slow push-in (2%) can move a vertical card's edge about 9 px into the side margin at the end of a section. Text stays inside the safe area.
- The Golden Retriever is the same cute puppy shape as the doodles, so it's told apart by its straight coat and golden colour, not a breed silhouette.

### Report 2 · 2026-09-28 15:37

Round 2 is finished for both sizes and every gate passes. Changes per 10 s went from 1.4 to 4.2 and the longest calm from 10 s to 4.5 s. Near-still is 37 % in landscape and 47 % in vertical (round 1 measured 64 % in landscape). I scored 8 on every criterion except accuracy (10). The biggest change was adding one close-up per long section, which goes beyond your five fixes, so please check you're happy with it. Nothing is committed, and I only touched `doodleGuide.ts` and its two hosts.

**What changed, by problem**

1. **Dead openings.**
   - Content now arrives on the cut. In every section the first headline word starts rising one or two frames before the cut, so it's already moving on the cut frame.
   - The first card, dog or ruler also lands on the cut in basics, coats, sizes, colours, the honest bit and the end card.
   - Generations has no card on the cut, only the headline; its first card lands one beat in.
   - The corner badge now spins edge-on and comes round in its new style on every cut.
   - The highlighter box and its key word now arrive together; before, the box sat empty for about 8 frames.
2. **Long holds.**
   - **Generations:** the bars drain and refill in turn, and each card's dog hops as its bar does.
   - **Coats:** each dog hops when its coat finishes drawing. The slider nudges back twice on the beat, and the dogs hop again.
   - **Sizes:** the dogs hop in a wave, then back the other way.
   - **Basics and end card:** the merged doodle hops twice, and the end-card chips bounce once.
   - **Close-ups (new):** a close-up is a two-beat hard cut in to one card and back out. There's one per long section: the merged doodle, the F2 card, the curly dog, the Petite dog and the colour dog. The headline and section label are hidden during them. These cuts are what lifted changes per 10 s; the section flips barely register because the grounds are close in grey.
3. **Landscape layout and readability.** The vertical layouts are unchanged, apart from the new timing, hops and close-ups.
   - **Generations:** the headline is re-stacked into three lines on the left third, and the 2×2 cards fill the right two-thirds (565×380 each).
   - **Coats:** three 510×490 cards span the width.
   - **Sizes:** a full-width row of four dogs.
   - **Colours:** the dog is 600 px tall and the chips are 84 px high.
   - **Basics:** the cards are 440×560 and the merged card 500×620.
   - **Type sizes:** secondary lines are now at least 30 px. Card lines are 36 px, coat labels 46, weights 34, chips 38, the slider labels 38, the legend and footnotes 30, and the section label 28.
4. **Honest bit.** The sneezing doodle is now large (560 px) on the right in landscape. It sneezes and then shakes it off. In vertical it stays small by the badge.
5. **Ink section.** The dog outline, badge ring and token outlines are cream there. The badge shadow is muted.

**Results**
| Check | Landscape | Vertical |
|---|---|---|
| Changes per 10 s | 4.2 | 4.2 |
| Longest calm | 4.5 s from 00:06.5 | 4.5 s from 00:06.5 |
| Near-still | 37 % | 47 % |
| still-frames | `windows:` empty | `windows:` empty |
| Loudness | −15.8 LUFS | −15.8 LUFS |

- **tsc:** clean for my files. The only errors belong to another agent's in-progress `fivePointFive` hosts.
- **oxlint** with the project config passes.
- **Sound:** the whoosh now ends on the merge (frame 150). The ticks follow the new timings and every close-up cut.

**My scores (critique.md rubric)**
| Criterion | Score | Why |
|---|---|---|
| hook | 8 | The dithered turtle rises and waves, and the headline starts at frame 8. |
| readability | 8 | Landscape secondary lines are all 30 px or more and read on `phone.png`. Vertical card lines are still 28 px. |
| motion | 8 | Springs everywhere; no ghosting in `fast-1.png` or `fast-2.png`. |
| variety | 8 | Something new every 1–4 s, and the close-ups add punches. |
| composition | 8 | Landscape now uses the frame. The badge overlays zoomed content during close-ups, and the landscape basics headline fits to about 77 px beside the larger cards. |
| accuracy | 10 | Copy unchanged and hedged. |
| sync | 8 | Cuts on the beat grid, cues moved with the content, −15.8 LUFS. |

**Known weaknesses**
- Close-ups crop neighbouring cards at the frame edges, and the badge sits over the zoomed content.
- The critique's evenly spaced phone frames often land on words that are still rising.
- Near-still is higher in vertical (47 %) than in landscape.

Files are in `/tmp`:
- `doodleGuide.mp4`
- `doodleGuideVertical.mp4`
- `critique-doodleGuide/` (sheet.png, phone.png, fast-1.png, fast-2.png, pace.json)
- `critique-doodleGuideVertical/` (sheet.png, phone.png, fast-1.png, fast-2.png, pace.json)
