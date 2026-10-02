You are a world-class motion designer who works in code. Make "Light Trails": 4 seconds of motion at 1080 × 1080, 60 fps, drawn in code.

WHAT TO BUILD
- One self-contained HTML file with a <canvas> of 1080 × 1080. Every frame is a pure function of time, draw(ctx, t) with t in seconds, carrying no state from frame to frame, so any moment renders on its own.
- A player: it autoplays muted on load; the first click turns the sound on, later clicks pause and play; ← and → step one frame at 60 fps; ?t=<seconds> opens paused on that moment.
- No libraries and no image files: every shape, letter and texture is drawn with Canvas 2D. Fonts: no type, loaded from Google Fonts; wait for them to load before the first frame.

THE LOOK
Long-exposure light painting on black: four or five points of light (accent, accent2, s1, s2, ink) trace harmonograph and Lissajous curves (sums of damped-free sines with integer frequency ratios so they close in 240 frames), and each leaves a glowing trail of the last ~0.8 s of its path, drawn fresh every frame (closed form: sample the path backwards in time) as a tapered line whose alpha and width fade along it. Glow by drawing the trails into a small offscreen canvas and adding it back scaled up (no ctx.filter), plus a hot white core. Where trails cross, light adds (globalCompositeOperation 'lighter'). A faint camera drift. On the bar-2 downbeat the curves converge to one point in the centre, flare, and spring apart.
Palette: ground #05060a, surface #0d0f16, ink #f5f3ee, muted #5b6070, line #171a24, accent #ff7a45, accent2 #4fd1ff, deep #000000, s1 #ffd166, s2 #c77dff. Use these colours, blends between them, and the ink colour at low opacity for shadows; nothing else.

THE BEATS (120 bpm, a beat every 0.50 s: every change of state starts on a beat; follow-through may start on a half-beat). Words in quotes are the exact copy.
- 0–2 s · points of light weave Lissajous curves, their trails glowing behind them
- 2–2.5 s · downbeat: they converge to the centre and flare (hit)
- 2.5–4 s · they spring apart and weave on into the loop

SIZES
- square: 1080 × 1080.
- Add ?size=vertical for 1080 × 1920. Design that layout for its shape: square first; a vertical that redesigns the motif for the tall frame, never a crop.

MOTION RULES
- Ease everything: ease-out for arrivals, ease-in for exits, a spring with a little overshoot for anything that lands. Ambient motion (a breath, a drift, a spin) may be a smooth repeating wave; nothing else moves linearly.
- Hook in the first second. No dead air: every hold keeps moving (a slow push-in, a drift, a breath).
- Nothing overlaps unless it is meant to. Keep text inside the safe margins and never smaller than 22 px at 1080 px on the short side.
- A trail is a path sampled backwards: draw the last moment of every curve fresh each frame, add the light, and long exposure needs no history.
- Sound (Web Audio, starts on the first click): a 4-second seamless loop at 120 bpm: a warm pad with a slow filter; a soft riser into 120 and a bright, airy hit on 120.

BEFORE YOU FINISH
Name 8 moments across the piece (as timestamps) and describe exactly what is on screen at each. Fix anything that overlaps, sits still for more than half a second, or is hard to read. Then give me the complete file.

There is no product in it; every name is invented. Build it exactly as written first; afterwards, make it yours.
