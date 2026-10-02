You are a world-class motion designer who works in code. Make "Op Art": 4 seconds of motion at 1080 × 1080, 60 fps, drawn in code.

WHAT TO BUILD
- One self-contained HTML file with a <canvas> of 1080 × 1080. Every frame is a pure function of time, draw(ctx, t) with t in seconds, carrying no state from frame to frame, so any moment renders on its own.
- A player: it autoplays muted on load; the first click turns the sound on, later clicks pause and play; ← and → step one frame at 60 fps; ?t=<seconds> opens paused on that moment.
- No libraries and no image files: every shape, letter and texture is drawn with Canvas 2D. Fonts: no type, loaded from Google Fonts; wait for them to load before the first frame.

THE LOOK
Op art after Bridget Riley: a field of fine parallel black stripes on off-white that a travelling bulge warps into a convex lens, so the flat page seems to breathe. The stripes are drawn as many thin filled bands whose vertical position is displaced by a smooth warp field (a moving gaussian bulge plus a slow sine), so they thicken where they crowd and thin where they spread, the way Riley's paintings do. Over half the frame a second grating at a slightly different angle crosses the first and makes moiré interference that slides as the bulge moves. One red stripe (accent) runs through the field, and on the bar-2 downbeat the bulge snaps to the centre and the moiré blooms into concentric rings for a beat before relaxing. Strict black, white and one red; crisp edges; nothing else.
Palette: ground #f7f5f0, surface #ffffff, ink #0d0d0d, muted #8c8a86, line #e2dfd8, accent #ff3b2f, accent2 #1e40ff, deep #050505. Use these colours, blends between them, and the ink colour at low opacity for shadows; nothing else.

THE BEATS (120 bpm, a beat every 0.50 s: every change of state starts on a beat; follow-through may start on a half-beat). Words in quotes are the exact copy.
- 0–2 s · the stripe field breathes as a bulge travels across it, moiré sliding where the gratings cross
- 2–2.5 s · downbeat: the bulge snaps to centre, the moiré blooms into rings (hit)
- 2.5–4 s · it relaxes and travels on into the loop

SIZES
- square: 1080 × 1080.
- Add ?size=vertical for 1080 × 1920. Design that layout for its shape: square first; a vertical that redesigns the motif for the tall frame, never a crop.

MOTION RULES
- Ease everything: ease-out for arrivals, ease-in for exits, a spring with a little overshoot for anything that lands. Ambient motion (a breath, a drift, a spin) may be a smooth repeating wave; nothing else moves linearly.
- Hook in the first second. No dead air: every hold keeps moving (a slow push-in, a drift, a breath).
- Nothing overlaps unless it is meant to. Keep text inside the safe margins and never smaller than 22 px at 1080 px on the short side.
- Op art is geometry plus a warp: displace a regular grating by one smooth field, add a second grating, and the eye does the motion.
- Sound (Web Audio, starts on the first click): a 4-second seamless loop at 120 bpm: a tight, minimal pulse: kick-like low tick on each beat inside the soft score, a sharp hit on 120.

BEFORE YOU FINISH
Name 8 moments across the piece (as timestamps) and describe exactly what is on screen at each. Fix anything that overlaps, sits still for more than half a second, or is hard to read. Then give me the complete file.

There is no product in it; every name is invented. Build it exactly as written first; afterwards, make it yours.
