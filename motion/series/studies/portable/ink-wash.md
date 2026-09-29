You are a world-class motion designer who works in code. Make "Ink Wash": 30 seconds of motion at 1080 × 1920, 30 fps, drawn in code.

WHAT TO BUILD
- One self-contained HTML file with a <canvas> of 1080 × 1920. Every frame is a pure function of time, draw(ctx, t) with t in seconds, carrying no state from frame to frame, so any moment renders on its own.
- A player: it autoplays muted on load; the first click turns the sound on, later clicks pause and play; ← and → step one frame at 30 fps; ?t=<seconds> opens paused on that moment.
- No libraries and no image files: every shape, letter and texture is drawn with Canvas 2D. Fonts: Instrument Serif Italic for the haiku, Inter (400) for the small season words, loaded from Google Fonts; wait for them to load before the first frame.

THE LOOK
Ink-wash brush painting made in code: black ink in five tones on warm paper, a lot of empty space, one short original haiku in that space per painting, and one small red seal at the end. Compute a faint paper-fibre texture once and reuse it. Every stroke is a centreline with a width profile (press, belly, taper) and an ink load that falls along it; the brush tip moves along it with a fast-in, slow-out ease. Draw the body as soft stamped ellipses; where the load runs low, split it into parallel bristle lanes that drop out to make dry-brush streaks; and for every painted point grow a wider, paler, unevenly edged bleed halo for about half a second after the brush passes, then stop it and darken its rim slightly as it dries. Washes are the same bleed at large scale. Snow is unpainted paper left between grey washes. Scenes on one hanging scroll the camera slides down: a plum branch in four strokes with five-dab blossoms and a falling petal; a heron in a few bold strokes standing in a pale wash with reeds; an old pine with snow left as bare paper. Each haiku soaks in word by word in an italic serif. At the end the camera pulls back to the whole scroll and a small vermilion seal with an invented geometric mark (a circle over a horizon line, no real script) presses down.
Palette: ground #f3eee3, surface #ebe4d5, ink #161412, muted #6b655c, line #d9d1c1, accent #c8322a, accent2 #8c877e, s1 #2b2825, s2 #5a5650, s3 #9a958c, s4 #cfc9bd. Use these colours, blends between them, and the ink colour at low opacity for shadows; nothing else.

THE BEATS (90 bpm, a beat every 0.67 s: every change of state starts on a beat; follow-through may start on a half-beat). Words in quotes are the exact copy.
- 0–3.3 s · the paper: blank washi at the top of a hanging scroll; one very wide, very pale stroke is laid across it and blooms into a mist of wash that dries, the fibres showing through; a small line in Inter muted fades up and away: 'three seasons, in ink'
- 3.3–11.3 s · spring: a plum branch painted in four strokes, the first dark and wet, the last dry and streaked; blossoms as clusters of five pale round dabs with dark dotted centres placed one per beat; one petal falls on a slow sway; 'SPRING' then the haiku word by word: 'spring rain —' / 'the plum branch lets go' / 'one petal at a time'
- 11.3–19.3 s · summer: the camera slides down the scroll; a heron built from a few bold strokes (an S-curved neck, a sharp beak, a wing in one wide dry stroke, a single thin leg) standing in a pale wash of water with three quick reeds; ripples as two thin broken strokes around the leg; 'SUMMER' then 'noon heat —' / 'the heron holds the river' / 'still on one leg'
- 19.3–27.3 s · winter: the camera slides down again; an old pine painted with a dry-brushed trunk and clusters of fast needle strokes, then a grey wash sky laid AROUND the branches so their tops stay unpainted paper and read as snow; a few flakes are left as tiny unpainted gaps in the wash; 'WINTER' then 'first snow —' / 'the old pine keeps' / 'what it can hold'
- 27.3–30 s · the seal: the haiku and season words fade out (so no text shrinks under 22 px) as the camera eases back to show the whole scroll with its three paintings; the vermilion seal presses down in the lower corner (a quick scale from 1.08 to 1.0 and a slight ink spread at its edges); hold on the scroll with a very slow drift

SIZES
- vertical: 1080 × 1920.
- Add ?size=landscape for 1920 × 1080. Design that layout for its shape: landscape: a handscroll instead of a hanging scroll: the paintings sit side by side, the camera slides from right to left, and each haiku sits beside its painting.

MOTION RULES
- Ease everything: ease-out for arrivals, ease-in for exits, a spring with a little overshoot for anything that lands. Ambient motion (a breath, a drift, a spin) may be a smooth repeating wave; nothing else moves linearly.
- Hook in the first second. No dead air: every hold keeps moving (a slow push-in, a drift, a breath).
- Nothing overlaps unless it is meant to. Keep text inside the safe margins and never smaller than 22 px at 1080 px on the short side.
- Emptiness is a material: when the paper is left bare on purpose (for mist, snow and a poem) a few timed strokes that bleed and dry say more than a filled frame.
- Sound (Web Audio, starts on the first click): a very soft, low loop at 90 bpm with no drums, a short brush-sweep whoosh on each stroke, soft ticks for blossoms and words, a whoosh as the camera reaches each painting, one soft hit for the seal and a three-note sign-off.

BEFORE YOU FINISH
Name 8 moments across the piece (as timestamps) and describe exactly what is on screen at each. Fix anything that overlaps, sits still for more than half a second, or is hard to read. Then give me the complete file.

There is no product in it; every name is invented. Build it exactly as written first; afterwards, make it yours.
