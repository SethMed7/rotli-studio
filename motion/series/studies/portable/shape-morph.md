You are a world-class motion designer who works in code. Make "Shape Morph": 8 seconds of motion at 1080 × 1080, 60 fps, a seamless loop, drawn in code.

WHAT TO BUILD
- One self-contained HTML file with a <canvas> of 1080 × 1080. Every frame is a pure function of time, draw(ctx, t) with t in seconds, carrying no state from frame to frame, so any moment renders on its own.
- A player: it autoplays muted on load; the first click turns the sound on, later clicks pause and play; ← and → step one frame at 60 fps; ?t=<seconds> opens paused on that moment.
- It loops: the last frame must flow into the first with no jump. End every animated value where it began, and give every repeating motion a period that divides the loop's length.
- No libraries and no image files: every shape, letter and texture is drawn with Canvas 2D. Fonts: JetBrains Mono, loaded from Google Fonts; wait for them to load before the first frame.

THE LOOK
Geometry on a pale ground with a dot grid: one solid near-black shape morphs circle → square → triangle → star → circle, rotating a little on each change, with three small coloured satellites orbiting it and a soft shadow beneath. Sample every outline at the same number of points and interpolate point by point with a spring. The dot grid ripples outward on each morph.
Palette: ground #f2f1ed, surface #ffffff, ink #121212, muted #8b8a86, line #dcdad4, accent #ff3d2e, accent2 #2f6bff. Use these colours, blends between them, and the ink colour at low opacity for shadows; nothing else.

THE BEATS (120 bpm, a beat every 0.50 s: every change of state starts on a beat; follow-through may start on a half-beat). Words in quotes are the exact copy.
- 0–2 s · a circle breathes at the centre; three satellites (accent red, blue, ink) orbit it; the dot grid pulses once
- 2–4 s · the circle snaps into a square with a quarter turn and an overshoot; the grid ripples outward from it
- 4–5.5 s · the square folds into a triangle; the satellites change orbit direction
- 5.5–7 s · the triangle bursts into a five-point star, the satellites flung wider, then pulled back
- 7–8 s · the star softens back into the circle; everything returns to its first position so frame 479 flows into frame 0

SIZES
- square: 1080 × 1080.
- Add ?size=landscape for 1920 × 1080. Design that layout for its shape: keep the shape centred, name the current shape in small mono on the left and show a four-step indicator on the right.

MOTION RULES
- Ease everything: ease-out for arrivals, ease-in for exits, a spring with a little overshoot for anything that lands. Ambient motion (a breath, a drift, a spin) may be a smooth repeating wave; nothing else moves linearly.
- Hook in the first second. No dead air: every hold keeps moving (a slow push-in, a drift, a breath).
- Nothing overlaps unless it is meant to. Keep text inside the safe margins and never smaller than 22 px at 1080 px on the short side.
- Morph between shapes by sampling each outline at the same number of points and interpolating point by point; spring the interpolation, not the points.
- Sound (Web Audio, starts on the first click): a soft loop at 120 bpm whose tails wrap around the end, with a tick on each morph.

BEFORE YOU FINISH
Name 8 moments across the piece (as timestamps) and describe exactly what is on screen at each. Fix anything that overlaps, sits still for more than half a second, or is hard to read. Then give me the complete file.

The product in it is fictional ("Oriel"). Build it exactly as written first; afterwards, swap in your own name, colours and words.
