You are a world-class motion designer who works in code. Make "ASCII Cinema": 24 seconds of motion at 1920 × 1080, 30 fps, drawn in code.

WHAT TO BUILD
- One self-contained HTML file with a <canvas> of 1920 × 1080. Every frame is a pure function of time, draw(ctx, t) with t in seconds, carrying no state from frame to frame, so any moment renders on its own.
- A player: it autoplays muted on load; the first click turns the sound on, later clicks pause and play; ← and → step one frame at 30 fps; ?t=<seconds> opens paused on that moment.
- No libraries and no image files: every shape, letter and texture is drawn with Canvas 2D. Fonts: JetBrains Mono (500) for everything, loaded from Google Fonts; wait for them to load before the first frame.

THE LOOK
ASCII art animation: every picture is made of characters on one fixed monospace grid used as pixels (24 px type, about 133 columns by 45 rows in landscape), amber on a near-black ground, flat: no bezel, scanlines or curvature. Brightness maps to the ramp ' .:-=+*#%@', dim amber for the faint levels and bright amber-orange for the top two. Pre-render the characters once into a glyph atlas and draw cells from it; every cell is a pure function of its column, row and time, with randomness from a seeded hash. Scenes: a block cursor types a line and the grid floods with noise; the classic spinning doughnut (a torus rotated about two axes, projected with a 1/z depth buffer per cell, shaded by its normal against a light, mapped onto the ramp, corrected for the cells being taller than wide); a waterfall of falling columns with bright heads and fading tails whose characters re-roll every few frames, with a line of words locking in as the rain passes through; an invented face built from signed-distance shapes that resolves out of flickering noise, each cell settling at its own seeded time from the centre outward; and an end with the ramp laid out big, a title built from a 5×7 bitmap font of '#' blocks, and one closing line. Captions are characters in the same grid.
Palette: ground #120c06, surface #1f160b, ink #ffcf7a, muted #b98f4f, line #3a2a14, accent #ffb000, accent2 #ff7b29, dim #6b4d22, deep #080502. Use these colours, blends between them, and the ink colour at low opacity for shadows; nothing else.

THE BEATS (120 bpm, a beat every 0.50 s: every change of state starts on a beat; follow-through may start on a half-beat). Words in quotes are the exact copy.
- 0–3 s · hello: a block cursor blinks, then types 'hello.' and on the next line 'everything you see here is text.'; the grid floods with ramp noise that drains away row by row
- 3–9 s · the doughnut: a torus of characters fades up and spins, its lit side in '#', '%' and '@', its shadowed side in '.' and ':'; the caption 'ten characters, one light' types in the bottom rows
- 9–14 s · the rain: the torus dissolves downward into falling columns; the waterfall fills the screen; in the middle rows 'every glyph is a pixel' locks in letter by letter as the rain passes through it, then lets go
- 14–20 s · the portrait: the rain slows into flickering noise and an invented face resolves out of it from the centre outward; once complete it blinks once (the eye cells swap to '-' for four frames) and the caption 'a portrait of nobody in particular' types in the bottom rows
- 20–24 s · end: the face breaks back into noise that sorts itself into the ramp ' .:-=+*#%@' laid out big across the middle; above it 'TEXT MODE' builds from '#' blocks in the bitmap font; below it 'a love letter to text mode'; the cursor blinks after the last word

SIZES
- landscape: 1920 × 1080.
- Add ?size=vertical for 1080 × 1920. Design that layout for its shape: re-stack it on a narrow grid about 75 columns wide: wrap the typed lines, put the doughnut in the upper half with its caption below, break the locked-in line onto two rows, make the portrait head-and-shoulders, and stack the title's two words.

MOTION RULES
- Ease everything: ease-out for arrivals, ease-in for exits, a spring with a little overshoot for anything that lands. Ambient motion (a breath, a drift, a spin) may be a smooth repeating wave; nothing else moves linearly.
- Hook in the first second. No dead air: every hold keeps moving (a slow push-in, a drift, a breath).
- Nothing overlaps unless it is meant to. Keep text inside the safe margins and never smaller than 22 px at 1080 px on the short side.
- Ten characters are enough for a picture: map brightness to a ramp, keep one grid and a glyph atlas, make every cell a pure function of its position and time, and a spinning doughnut, rain and a face all come out of the same text.
- Sound (Web Audio, starts on the first click): a driving loop at 120 bpm whose drums enter with the doughnut, ticks for typed letters, whooshes as the noise clears and into the rain, soft ticks as letters lock in, a hit when the face completes, and a three-note sign-off.

BEFORE YOU FINISH
Name 8 moments across the piece (as timestamps) and describe exactly what is on screen at each. Fix anything that overlaps, sits still for more than half a second, or is hard to read. Then give me the complete file.

There is no product in it; every name is invented. Build it exactly as written first; afterwards, make it yours.
