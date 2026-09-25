You are a world-class motion designer who works in code. Make "Particle Word": 12 seconds of motion at 1920 × 1080, 60 fps, drawn in code.

WHAT TO BUILD
- One self-contained HTML file with a <canvas> of 1920 × 1080. Every frame is a pure function of time, draw(ctx, t) with t in seconds, carrying no state from frame to frame, so any moment renders on its own.
- A player: it autoplays muted on load; the first click turns the sound on, later clicks pause and play; ← and → step one frame at 60 fps; ?t=<seconds> opens paused on that moment.
- No libraries and no image files: every shape, letter and texture is drawn with Canvas 2D. Fonts: Inter (300 and 600), loaded from Google Fonts; wait for them to load before the first frame.

THE LOOK
Generative: several thousand particles on a deep navy ground. Dust drifts in depth (near particles larger and brighter), finds its places inside the letters of a word (sample the word's pixels from an offscreen canvas), releases into a rotating 3D point-cloud sphere with two tilted orbit rings, becomes a rippling wave surface in perspective, and gathers into one bright point. One warm accent for a few particles and the rings. Seed the randomness so every render is identical.
Palette: ground #070b24, surface #101740, ink #e8ecff, muted #7c86b8, line #1d275e, accent #ff5a3c, accent2 #6f8cff. Use these colours, blends between them, and the ink colour at low opacity for shadows; nothing else.

THE BEATS (120 bpm, a beat every 0.50 s: every change of state starts on a beat; follow-through may start on a half-beat). Words in quotes are the exact copy.
- 0–2 s · hook: a field of drifting dust with depth (near particles larger and brighter); a single accent particle crosses the frame
- 2–4.5 s · the dust streams into the letters of 'ORIEL', each particle on its own delay, until the word is legible and softly shimmering
- 4.5–7 s · the word breaks apart into a rotating 3D point-cloud sphere; two thin accent orbit rings tilt around it
- 7–9.5 s · the sphere unrolls into a wave surface of points seen in perspective, rippling toward the viewer
- 9.5–11 s · the wave folds into a vortex and every particle collapses into one bright point
- 11–12 s · sign-off: the point opens into a small ring; 'Oriel' fades up beneath it with 'every hour, found'

SIZES
- landscape: 1920 × 1080.
- Add ?size=square for 1080 × 1080. Design that layout for its shape: set the word on two lines and keep the sphere and wave centred.

MOTION RULES
- Ease everything: ease-out for arrivals, ease-in for exits, a spring with a little overshoot for anything that lands. Ambient motion (a breath, a drift, a spin) may be a smooth repeating wave; nothing else moves linearly.
- Hook in the first second. No dead air: every hold keeps moving (a slow push-in, a drift, a breath).
- Nothing overlaps unless it is meant to. Keep text inside the safe margins and never smaller than 22 px at 1080 px on the short side.
- Give every particle a home in each form and one clock of its own; morphing is then just interpolation between homes with staggered springs.
- Sound (Web Audio, starts on the first click): a soft loop at 120 bpm with a whoosh into each change of form, a hit when the word is complete, and a short sign-off.

BEFORE YOU FINISH
Name 8 moments across the piece (as timestamps) and describe exactly what is on screen at each. Fix anything that overlaps, sits still for more than half a second, or is hard to read. Then give me the complete file.

The product in it is fictional ("Oriel"). Build it exactly as written first; afterwards, swap in your own name, colours and words.
