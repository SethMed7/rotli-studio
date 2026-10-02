You are a world-class motion designer who works in code. Make "Frost": 4 seconds of motion at 1080 × 1080, 60 fps, drawn in code.

WHAT TO BUILD
- One self-contained HTML file with a <canvas> of 1080 × 1080. Every frame is a pure function of time, draw(ctx, t) with t in seconds, carrying no state from frame to frame, so any moment renders on its own.
- A player: it autoplays muted on load; the first click turns the sound on, later clicks pause and play; ← and → step one frame at 60 fps; ?t=<seconds> opens paused on that moment.
- No libraries and no image files: every shape, letter and texture is drawn with Canvas 2D. Fonts: no type, loaded from Google Fonts; wait for them to load before the first frame.

THE LOOK
Glassmorphism done properly: three frosted-glass panes (rounded rectangles with different radii and sizes) float and slowly drift in depth over a living gradient made of five soft colour orbs (accent, accent2, s1, s2, a deep violet) moving on closed periodic paths. Each pane shows the orbs behind it BLURRED and slightly refracted (offset toward the pane's edge): draw the orb field into a small offscreen canvas and scale it back up inside each pane's clip (no ctx.filter), add a 1 px bright edge highlight on the top-left and a darker edge bottom-right, an inner glow, a faint noise grain on the glass, and a soft shadow on the panes beneath. As panes overlap, the blur compounds (the farther pane is seen through the nearer). On the bar-2 downbeat the front pane tilts toward camera (a perspective skew), a light streak crossing its surface.
Palette: ground #0e1020, surface #1a1d33, ink #f6f7ff, muted #8b90b8, line #2a2e4d, accent #ff6b9a, accent2 #5ee6d0, deep #070816, s1 #ffc35c, s2 #7a7cff. Use these colours, blends between them, and the ink colour at low opacity for shadows; nothing else.

THE BEATS (120 bpm, a beat every 0.50 s: every change of state starts on a beat; follow-through may start on a half-beat). Words in quotes are the exact copy.
- 0–2 s · panes drift over the moving colour field, each blurring what is behind it
- 2–2.5 s · downbeat: the front pane tilts to camera, a light streak crossing it (hit)
- 2.5–4 s · it eases back into the loop

SIZES
- square: 1080 × 1080.
- Add ?size=vertical for 1080 × 1920. Design that layout for its shape: square first; a vertical that redesigns the motif for the tall frame, never a crop.

MOTION RULES
- Ease everything: ease-out for arrivals, ease-in for exits, a spring with a little overshoot for anything that lands. Ambient motion (a breath, a drift, a spin) may be a smooth repeating wave; nothing else moves linearly.
- Hook in the first second. No dead air: every hold keeps moving (a slow push-in, a drift, a breath).
- Nothing overlaps unless it is meant to. Keep text inside the safe margins and never smaller than 22 px at 1080 px on the short side.
- Glass is what it does to what is behind it: blur the background inside the pane, add an edge light, and the flat rectangle becomes a material.
- Sound (Web Audio, starts on the first click): a 4-second seamless loop at 120 bpm: airy pad; a glassy chime on 120 and a soft high whoosh into it.

BEFORE YOU FINISH
Name 8 moments across the piece (as timestamps) and describe exactly what is on screen at each. Fix anything that overlaps, sits still for more than half a second, or is hard to read. Then give me the complete file.

There is no product in it; every name is invented. Build it exactly as written first; afterwards, make it yours.
