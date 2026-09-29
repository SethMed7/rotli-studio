You are a world-class motion designer who works in code. Make "Bauhaus Beat": 24 seconds of motion at 1080 × 1080, 30 fps, drawn in code.

WHAT TO BUILD
- One self-contained HTML file with a <canvas> of 1080 × 1080. Every frame is a pure function of time, draw(ctx, t) with t in seconds, carrying no state from frame to frame, so any moment renders on its own.
- A player: it autoplays muted on load; the first click turns the sound on, later clicks pause and play; ← and → step one frame at 30 fps; ?t=<seconds> opens paused on that moment.
- No libraries and no image files: every shape, letter and texture is drawn with Canvas 2D. Fonts: Inter (800) for the lowercase title, loaded from Google Fonts; wait for them to load before the first frame.

THE LOOK
A seamless music visual in the Bauhaus manner on cream paper: one blue circle, one red square, one yellow triangle, black bars, arcs and thin rules, flat fills only, on a module grid. The shapes play the music, computed from the same beat grid as the soundtrack rather than from audio analysis: the circle pulses on each kick, the triangle steps half a module on each bass note, a large black quarter-disc rotates 90° with each chord change, a row of eight short bars flicks on the hi-hats, a row of sixteen dots traces the arpeggio with the current step in red, and the square turns 90° on each accent hit. On every bar the whole composition glides to the next of six hand-authored layouts during the last few frames and lands on the downbeat; the second half plays the layouts mirrored; the last bar glides back into the first so the loop is seamless. The only words are a lowercase title, 'three shapes', set large into the composition twice and small in the margin the rest of the time.
Palette: ground #efe7d6, surface #f8f3e8, ink #171717, muted #5e594f, line #d7cdb8, accent #d7262c, accent2 #1d4e9e, s1 #f2b400, deep #171717. Use these colours, blends between them, and the ink colour at low opacity for shadows; nothing else.

THE BEATS (120 bpm, a beat every 0.50 s: every change of state starts on a beat; follow-through may start on a half-beat). Words in quotes are the exact copy.
- 0–6 s · bars 1–3: layout A lands on the first downbeat with the title 'three shapes' set large along a black bar; the circle pulses on every kick, the triangle steps on the bass, the hats bar row and the arpeggio dots run along the bottom; the red square turns 90° on the hit at frame 0; bars 2 and 3 recompose into layouts B and C, the title shrinking to the bottom-left margin
- 6–12 s · bars 4–6: a hit at frame 180 turns the square; layouts D, E and F land one per bar; the quarter-disc rotates with each chord; in layout E the circle grows to fill a third of the frame and the other shapes orbit its edge
- 12–18 s · bars 7–9: the mirrored pass begins; layout A mirrored lands with 'three shapes' set large again, this time reading upward along a vertical bar; a hit turns the square at frame 360; the ground elements have swapped sides (the quarter-disc now anchors the opposite corner)
- 18–24 s · bars 10–12: a hit at frame 540; mirrored D, E and F; during the last 6 frames of bar 12 everything glides into layout A, landing exactly as the loop restarts

SIZES
- square: 1080 × 1080.
- Add ?size=landscape for 1920 × 1080. Design that layout for its shape: square first on a 6 × 6 grid; landscape re-authors the layouts on a 10 × 6 grid with the bar and dot rows in a band along the bottom.

MOTION RULES
- Ease everything: ease-out for arrivals, ease-in for exits, a spring with a little overshoot for anything that lands. Ambient motion (a breath, a drift, a spin) may be a smooth repeating wave; nothing else moves linearly.
- Hook in the first second. No dead air: every hold keeps moving (a slow push-in, a drift, a breath).
- Nothing overlaps unless it is meant to. Keep text inside the safe margins and never smaller than 22 px at 1080 px on the short side.
- When picture and sound are computed from the same numbers, every hit can move something: give each instrument one shape and one kind of motion, recompose on the bar, and a still composition becomes a piece of music you can watch.
- Sound (Web Audio, starts on the first click): a driving four-chord synth loop at 120 bpm with kick on every beat, bass on beats 1 and 3, hi-hats and an arpeggio, plus four accent hits; it loops seamlessly with no sign-off.

BEFORE YOU FINISH
Name 8 moments across the piece (as timestamps) and describe exactly what is on screen at each. Fix anything that overlaps, sits still for more than half a second, or is hard to read. Then give me the complete file.

There is no product in it; every name is invented. Build it exactly as written first; afterwards, make it yours.
