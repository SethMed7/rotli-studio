You are a world-class motion designer who works in code. Make "Truchet": 4 seconds of motion at 1080 × 1080, 60 fps, drawn in code.

WHAT TO BUILD
- One self-contained HTML file with a <canvas> of 1080 × 1080. Every frame is a pure function of time, draw(ctx, t) with t in seconds, carrying no state from frame to frame, so any moment renders on its own.
- A player: it autoplays muted on load; the first click turns the sound on, later clicks pause and play; ← and → step one frame at 60 fps; ?t=<seconds> opens paused on that moment.
- No libraries and no image files: every shape, letter and texture is drawn with Canvas 2D. Fonts: no type, loaded from Google Fonts; wait for them to load before the first frame.

THE LOOK
Truchet tiles in motion: a grid of square tiles, each carrying two quarter-circle arcs (Smith tiles) in cream on deep teal, so neighbouring tiles join into long continuous meandering paths. A wave sweeps the grid: each tile rotates 90 degrees with a spring (overshoot and settle), its start delayed by its distance from a moving origin, so the paths re-route themselves in a ripple. Arcs are thick, round-capped strokes; the paths that pass through the wave front glow in accent and accent2 for a moment. Seeded initial orientations. In 240 frames every tile turns a whole number of quarter turns (four over the loop, in two ripples) so the pattern returns exactly. On the bar-2 downbeat the wave starts from the centre and a single long path lights from end to end.
Palette: ground #10302b, surface #16403a, ink #f3e9d2, muted #6f8f87, line #1f4d45, accent #f2b134, accent2 #e8613c, deep #0a1f1c. Use these colours, blends between them, and the ink colour at low opacity for shadows; nothing else.

THE BEATS (120 bpm, a beat every 0.50 s: every change of state starts on a beat; follow-through may start on a half-beat). Words in quotes are the exact copy.
- 0–2 s · a ripple of turning tiles re-routes the paths across the grid
- 2–3 s · downbeat: a second ripple from the centre, one long path lighting end to end (hit)
- 3–4 s · the tiles settle into the starting pattern

SIZES
- square: 1080 × 1080.
- Add ?size=vertical for 1080 × 1920. Design that layout for its shape: square first; a vertical that redesigns the motif for the tall frame, never a crop.

MOTION RULES
- Ease everything: ease-out for arrivals, ease-in for exits, a spring with a little overshoot for anything that lands. Ambient motion (a breath, a drift, a spin) may be a smooth repeating wave; nothing else moves linearly.
- Hook in the first second. No dead air: every hold keeps moving (a slow push-in, a drift, a breath).
- Nothing overlaps unless it is meant to. Keep text inside the safe margins and never smaller than 22 px at 1080 px on the short side.
- Local rules make global patterns: rotate each tile by a delayed spring and whole paths appear to move, though nothing but tiles ever turns.
- Sound (Web Audio, starts on the first click): a 4-second seamless loop at 120 bpm: marimba-like plucks timed to the ripple (one per ring of tiles, quiet) inside the soft score; a warm hit on 120.

BEFORE YOU FINISH
Name 8 moments across the piece (as timestamps) and describe exactly what is on screen at each. Fix anything that overlaps, sits still for more than half a second, or is hard to read. Then give me the complete file.

There is no product in it; every name is invented. Build it exactly as written first; afterwards, make it yours.
