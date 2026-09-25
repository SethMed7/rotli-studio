You are a world-class motion designer who works in code. Make "Dot Matrix": 20 seconds of motion at 1080 × 1080, 30 fps, drawn in code.

WHAT TO BUILD
- One self-contained HTML file with a <canvas> of 1080 × 1080. Every frame is a pure function of time, draw(ctx, t) with t in seconds, carrying no state from frame to frame, so any moment renders on its own.
- A player: it autoplays muted on load; the first click turns the sound on, later clicks pause and play; ← and → step one frame at 30 fps; ?t=<seconds> opens paused on that moment.
- No libraries and no image files: every shape, letter and texture is drawn with Canvas 2D. Fonts: none for the dot lettering (draw it on the grid); Instrument Serif and Instrument Serif Italic for captions, loaded from Google Fonts; wait for them to load before the first frame.

THE LOOK
Everything is made of dots on one grid: a month calendar whose days fill as dots, numerals and words rendered as dot-matrix lettering, a clock whose hands are dot trails, a progress ring of dots. Dots grow, shrink and change colour; nothing else is drawn. Captions are serif word stacks in mixed sizes, one key word in an accent italic, placed beside the action and arriving word by word.
Palette: ground #f1f4fb, surface #ffffff, ink #0f1b3d, muted #6b7797, line #d6ddee, accent #ffb000, accent2 #3d6bff, deep #0f1b3d. Use these colours, blends between them, and the ink colour at low opacity for shadows; nothing else.

THE BEATS (120 bpm, a beat every 0.50 s: every change of state starts on a beat; follow-through may start on a half-beat). Words in quotes are the exact copy.
- 0–2 s · hook: a grid of faint dots; a wave of dots lights up and spells 'WEEK' in dot-matrix
- 2–7 s · the dots form a month; days fill one by one as meetings (amber), quickly crowding the grid
- 7–11.5 s · the crowded days pulse and empty; a few blue focus blocks remain; caption 'take back the week'
- 11.5–16 s · the dots swirl into a clock face; the hour hand trails dots and stops on 3
- 16–20 s · the dots spell 'ORIEL' then settle into a single ring; caption 'one hour, found'

SIZES
- square: 1080 × 1080.
- Add ?size=vertical for 1080 × 1920. Design that layout for its shape: make the grid taller: run the month as two stacked blocks and set the lettering on two lines.

MOTION RULES
- Ease everything: ease-out for arrivals, ease-in for exits, a spring with a little overshoot for anything that lands. Ambient motion (a breath, a drift, a spin) may be a smooth repeating wave; nothing else moves linearly.
- Hook in the first second. No dead air: every hold keeps moving (a slow push-in, a drift, a breath).
- Nothing overlaps unless it is meant to. Keep text inside the safe margins and never smaller than 22 px at 1080 px on the short side.
- One primitive, repeated, can be the whole language: decide the grid first and let every shape emerge from it.
- Sound (Web Audio, starts on the first click): a soft loop at 120 bpm with a soft tick for each filled day (never faster than the beat), a hit when the clock stops and a short sign-off.

BEFORE YOU FINISH
Name 8 moments across the piece (as timestamps) and describe exactly what is on screen at each. Fix anything that overlaps, sits still for more than half a second, or is hard to read. Then give me the complete file.

The product in it is fictional ("Oriel"). Build it exactly as written first; afterwards, swap in your own name, colours and words.
