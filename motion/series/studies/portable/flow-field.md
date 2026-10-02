You are a world-class motion designer who works in code. Make "Flow Field": 4 seconds of motion at 1080 × 1080, 60 fps, drawn in code.

WHAT TO BUILD
- One self-contained HTML file with a <canvas> of 1080 × 1080. Every frame is a pure function of time, draw(ctx, t) with t in seconds, carrying no state from frame to frame, so any moment renders on its own.
- A player: it autoplays muted on load; the first click turns the sound on, later clicks pause and play; ← and → step one frame at 60 fps; ?t=<seconds> opens paused on that moment.
- No libraries and no image files: every shape, letter and texture is drawn with Canvas 2D. Fonts: no type, loaded from Google Fonts; wait for them to load before the first frame.

THE LOOK
A generative flow field on warm paper: a few thousand fine strands (0.8–2 px lines, ink with a minority in accent and accent2 and a few in s1) follow an angle field made from layered smooth noise, like ink drawn by a plotter. The field itself evolves in a loop: sample the noise with time on a circle (cos 2πt, sin 2πt as two extra noise coordinates) so frame 240 equals frame 0. Each strand is traced fresh every frame from a seeded start point for a fixed number of steps (closed form, no state), with its length growing and shrinking on a periodic schedule so strands appear to draw on and fade. Inside a hidden shape (a circle, or a soft star) the field turns into a vortex so the strands reveal the shape by their flow, densest on the bar-2 downbeat, then let it dissolve. Paper texture: a faint seeded fibre speckle; strands slightly translucent so crossings darken like real ink.
Palette: ground #f4efe6, surface #fffaf2, ink #1b1d24, muted #8a857b, line #e4dccd, accent #e4572e, accent2 #2a6f97, deep #0f1115, s1 #f2a541. Use these colours, blends between them, and the ink colour at low opacity for shadows; nothing else.

THE BEATS (120 bpm, a beat every 0.50 s: every change of state starts on a beat; follow-through may start on a half-beat). Words in quotes are the exact copy.
- 0–1.5 s · strands pour across the paper along the field
- 1.5–2.5 s · they curl into a vortex that reveals a circle, fullest on the bar-2 downbeat (hit on 120)
- 2.5–4 s · the vortex relaxes and the strands flow on into the loop

SIZES
- square: 1080 × 1080.
- Add ?size=vertical for 1080 × 1920. Design that layout for its shape: square first; a vertical that redesigns the motif for the tall frame, never a crop.

MOTION RULES
- Ease everything: ease-out for arrivals, ease-in for exits, a spring with a little overshoot for anything that lands. Ambient motion (a breath, a drift, a spin) may be a smooth repeating wave; nothing else moves linearly.
- Hook in the first second. No dead air: every hold keeps moving (a slow push-in, a drift, a breath).
- Nothing overlaps unless it is meant to. Keep text inside the safe margins and never smaller than 22 px at 1080 px on the short side.
- A flow field is drawn, not simulated: trace every strand fresh from a seeded start through a field that loops in time, and the piece is both organic and exact.
- Sound (Web Audio, starts on the first click): a 4-second seamless loop at 120 bpm: soft plucks and a pad; a pencil-like scratch texture rising into 120 and a low hit on 120.

BEFORE YOU FINISH
Name 8 moments across the piece (as timestamps) and describe exactly what is on screen at each. Fix anything that overlaps, sits still for more than half a second, or is hard to read. Then give me the complete file.

There is no product in it; every name is invented. Build it exactly as written first; afterwards, make it yours.
