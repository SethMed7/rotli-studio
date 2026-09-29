You are building ONE study for the open-source rotli studio: a piece that shows the studio works for ANY product,
style and size, not only Rotli. Work ONLY in ~/rotli-studio/motion (a Node/npm project; use `node`, not bun; `~` is
your home directory, expand it to an absolute path for file tools). In every shell command use absolute paths or
`cd ~/rotli-studio/motion && …` (the shell's cwd resets between commands).

YOUR STUDY: "Stained Glass" (study 48), brief at `series/studies/briefs/stained-glass.json` (read it first; it is the contract).
Pieces to export from `src/canvas-core/studies/stainedGlass.ts`: `stainedGlassVertical` (vertical), `stainedGlass` (landscape). Primary size: vertical.

REQUIRED READING, in order:
1. `series/studies/bible.md`: what a study is and the rules every study keeps.
2. `src/canvas-core/studies/motionResume.ts`: THE reference study. Match its structure: a `make(size, id)` factory
   returning a Film, one continuous `paint(ctx, env, F)` of a fractional frame, shots that only name the sections,
   `layout(size)` for per-size design, the pack for every colour and font, `beatScore` for sound.
3. The brand-neutral kit, `src/canvas-core/kit/`: `pack.ts` (usePack, palettes, faces), `sizes.ts` (SIZES, layout),
   `motion.ts` (clamp, lerp, prog, window01, ease, bezier, spring, track with loop, phase), `type.ts` (text, measure,
   letters, timed), `ui.ts` (rr, card, phone, toggle, check), `depth.ts` (iso, block, blockGrid, project, spiral),
   `blur.ts` (motionBlur), `score.ts` (beatScore), `captions.ts` (ladder: the explainer-reel caption, words stacked in
   mixed sizes with one accent italic key word, arriving one at a time).
4. The pack: `brand/packs/studio/pack.json` (Oriel is a FICTIONAL product; use the palette your brief names;
   faces Inter, Instrument Serif, Instrument Serif Italic, JetBrains Mono).
5. Only if your brief names them: `src/canvas-core/styles/` (riso, print, drafting, storybook…) and `src/canvas-core/core.ts`
   (Gfx, PENCIL/RISOLINE media, halftone, rng, fractal). Read their headers, not every line.

HARD RULES:
1. Create/modify ONLY `src/canvas-core/studies/stainedGlass.ts` and its hosts `src/hosts/page-<pieceId>.ts` (one per piece, copy
   `src/hosts/page-motionResume.ts`). Do NOT edit the kit, the pack, tools, pieces.json, series.json, goldens or any other
   piece. If you need a helper, define it in your module. Do not register the pieces; the maintainer does.
2. Never import from `rotli/`, `studio/` or `brand/brand.json`: a study must not look or sound like Rotli. No quokka.
3. Follow the brief's story beats and timing (you may retime inside a beat; every shot must start on the beat grid:
   one beat = 60 / bpm × fps frames; `validate()` in film.ts refuses anything else). Frames: 720 at 30 fps.
4. Design EACH size (the brief's "sizes" note); a vertical re-stacks, it never just crops. Keep text inside `layout().safe`.
5. Quality bar: nothing overlaps unintentionally, no text under 22 px (at 1080 short side), flat colour, depth from
   shadow only where the style allows, every hold keeps moving (a slow push-in, drift or ambient motion).
6. Copy is invented for the fictional product; never claim anything about a real company or person.
7. Sound: beatScore soft at 90 bpm (no drums): a tick every 20 frames as the lead draws (thinned), a tick per panel as it floods (frames 120, 160, 200, 240) and one for the roundel, a hit at 280 when the sun strikes, whooshes ending at 440 and 580 as the day turns, and the sign-off at 660.

VERIFY BY LOOKING, and iterate until right:
- `node tools/frames.mjs <pieceId> <8–12 frames across the piece> --out /tmp/stained-glass --sheet /tmp/stained-glass.png --cols 6`,
  then READ the PNG (and full frames in /tmp/stained-glass/ where detail matters). Do this for EVERY size.
- videos: `node tools/render.mjs <pieceId> --out /tmp/<pieceId>.mp4`, then `node tools/still-frames.mjs /tmp/<pieceId>.mp4`
  must print an EMPTY `windows:` line.
- loops: also `node tools/loop-seam.mjs /tmp/<pieceId>.mp4` must print SEAMLESS.
- loudness (videos): `ffmpeg -nostats -i /tmp/<pieceId>.mp4 -af ebur128 -f null - 2>&1 | grep " I:"` should be about −16 LUFS.
- `npx tsc --noEmit -p tsconfig.json` must print nothing.
- score it (videos): `node tools/critique.mjs /tmp/<pieceId>.mp4`, read all four sheets it writes, and score the piece
  against `workflows/critique.md` (hook, readability, motion, variety, composition, accuracy, sync; 1–10 each). Fix
  anything under 8 and re-score. Put your final scores and the problems you could not fix in your report.
- Do not commit, do not touch ~/rotli, do not run `studio.mjs render all` or golden.

Report back: files created, the final sheet paths, still-frames / loop-seam / loudness results, what you would improve
with more time, and anything you could not make work.

--- THE STUDY (from series/studies/briefs/stained-glass.json) ---
Stained Glass · study 48 · video · 720 frames at 30 fps, 90 bpm · palette "glass"
Style: A leaded stained-glass window of the four elements, built and then lit by one day of sun. THE WINDOW: a tall lancet (a rectangle under a pointed arch made of two circular arcs) set in a dark ashlar wall (stone blocks as thin line-coloured joints on the ground). Inside: a roundel at the top holding a sun (a ring of flame-like rays), then a 2×2 of panels, air top-left, fire top-right, earth bottom-left, water bottom-right, all framed by a border of small square panes alternating ruby and azure. Each panel is cut into 8–14 panes by its lead lines, and the cut lines ARE the drawing: earth is two mountain triangles and a round tree, water is three wave bands and a fish, air is two spirals and a bird, fire is three flame tongues over embers. THE LEAD: every pane edge is a came, drawn as a 9 px stroke in the lead colour with a 2 px lighter highlight line along it (the raised flange of the H-section), small solder blobs where cames meet, and two darker horizontal iron saddle bars across the whole window. THE GLASS: each pane is one jewel colour from the palette extras (ruby, emerald, azure, violet, the gold accent, the cobalt accent2) with a streaky variation (a seeded linear gradient of ±8% lightness across the pane, as mouth-blown glass is never even), a few tiny seed bubbles (lighter dots) and, on some panes, grisaille: dark brown painted detail lines (leaf veins, fish scales, feather strokes) at 60% alpha. LIGHT (closed-form in F): the sun's elevation e(F) rises from 0 at dawn to its peak at noon and back to 0 at dusk; the transmitted colour of every pane is its colour darkened to 25% plus e times the full colour, with a soft diagonal band of extra brightness sweeping across the window as the sun moves; at night a cool moon glow lights only the air panel faintly and the lead lines dominate. THE FLOOR: in front of the wall the stone floor (floor colour, slab joints in perspective) receives the window's light: the panes are drawn again, projected by a transform whose vertical stretch grows as the sun gets lower and whose shear follows its azimuth, with the 'lighter' composite at low alpha, softened by the downscale-upscale trick (no ctx.filter), and with a slow caustic ripple (a seeded sine wobble of the patch edges). The patches creep and stretch across the floor through the day and redden toward dusk. Build-on: the came lines draw themselves with a dash offset, top to bottom, then panes flood with colour from a seed point (a growing circle clipped to the pane). Labels are sparse: element names in Instrument Serif Italic ink on the sill, time-of-day chips in JetBrains Mono, the title in Instrument Serif.
Learns from: How leaded windows are made and look, from the V&A's introduction to stained glass (https://www.vam.ac.uk/articles/stained-glass-an-introduction) and the came technique (https://en.wikipedia.org/wiki/Came_glasswork): pot-metal colour, H-shaped lead cames soldered at the joints, iron bars, painted detail, and a picture that changes as daylight moves through it. No real window's design, figures or imagery is used; the four-elements window is original.
Beats (frames · what):
  - 0–120 · dawn: a dark stone wall with the empty lancet showing a pale dawn sky; the time chip 'dawn'; the lead lines draw themselves from the roundel down, solder blobs popping at the joints, the saddle bars last
  - 120–280 · the panes fill, one panel every two beats, each flooding from a seed point with its name landing on the sill: 'earth', 'water', 'air', 'fire'; the roundel's sun fills last
  - 280–440 · morning to noon: the time chip 'noon'; the sun strikes: the panes brighten from dark to full jewel colour, the bright band sweeps across the glass, coloured patches of light appear on the floor and creep across it
  - 440–580 · afternoon to dusk: the time chip 'dusk'; the patches stretch long and slide sideways, warming toward red; the fire panel is the last to blaze
  - 580–660 · night: the time chip 'night'; the glass dims to deep tones, the floor patches fade, a cool moon glow lights the air panel alone and the lead lines read as a drawing
  - 660–720 · end: the title 'Four Elements' with 'a window, one day' beneath, while the moon glow drifts slowly across the glass
Sizes: Vertical (primary): the lancet fills the upper 60% of the frame, centred, with the sill labels just under it; the floor plane fills the lower part above the bottom safe margin, and the light falls toward the viewer; the time chip sits in the top safe area; the title sits on the floor area at the end. Landscape: the lancet stands left of centre at full height inside the safe area; the floor becomes a band along the bottom, and the sun comes from the left so the patches are thrown to the right across the band; labels and title sit in the right half.
Teaches: Stained glass is the light, not the picture: build the window from lead and flat jewel colour, then animate only the sun, and the same panes change mood all day and throw their colour onto the floor.

