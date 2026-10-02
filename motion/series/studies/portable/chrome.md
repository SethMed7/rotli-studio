You are a world-class motion designer who works in code. Make "Chrome": 4 seconds of motion at 1080 × 1080, 60 fps, drawn in code.

WHAT TO BUILD
- One self-contained HTML file with a <canvas> of 1080 × 1080. Every frame is a pure function of time, draw(ctx, t) with t in seconds, carrying no state from frame to frame, so any moment renders on its own.
- A player: it autoplays muted on load; the first click turns the sound on, later clicks pause and play; ← and → step one frame at 60 fps; ?t=<seconds> opens paused on that moment.
- No libraries and no image files: every shape, letter and texture is drawn with Canvas 2D. Fonts: no type, loaded from Google Fonts; wait for them to load before the first frame.

THE LOOK
Liquid chrome, the Y2K way: one thick, rounded ribbon (a torus-knot-like closed loop, or a fat bean that pinches into two and rejoins) made of polished chrome, turning slowly in space on a near-black ground. Chrome is drawn by REFLECTION MAPPING faked in 2D: the ribbon is built from many cross-sections along a closed 3D curve; each cross-section's surface normal picks a colour from an environment strip (a dark floor, a hot white horizon line, a sky band in accent, a warm sunset band in accent2), so the reflections slide across the metal as it turns. A sharp specular highlight (s1) rides the crest; a soft contact reflection on a glossy floor below; the edges catch a thin rim light. Depth sort the cross-sections. The turn is one full symmetric rotation in 240 frames so it loops. On the downbeat of bar 2 the ribbon pinches (a smooth squash) and springs back, a bright glint sweeping across it.
Palette: ground #0b0c10, surface #15171d, ink #eef1f6, muted #6b7280, line #22252d, accent #9fd3ff, accent2 #ffb38a, deep #050608, s1 #ffffff, s2 #3a4152. Use these colours, blends between them, and the ink colour at low opacity for shadows; nothing else.

THE BEATS (120 bpm, a beat every 0.50 s: every change of state starts on a beat; follow-through may start on a half-beat). Words in quotes are the exact copy.
- 0–2 s · the chrome ribbon turns, reflections sliding across it; a glint on frame 0
- 2–2.5 s · bar 2 downbeat: it pinches and springs back, a white glint sweeps the crest (hit)
- 2.5–4 s · it settles and turns on into the loop

SIZES
- square: 1080 × 1080.
- Add ?size=vertical for 1080 × 1920. Design that layout for its shape: square first; a vertical that redesigns the motif for the tall frame, never a crop.

MOTION RULES
- Ease everything: ease-out for arrivals, ease-in for exits, a spring with a little overshoot for anything that lands. Ambient motion (a breath, a drift, a spin) may be a smooth repeating wave; nothing else moves linearly.
- Hook in the first second. No dead air: every hold keeps moving (a slow push-in, a drift, a breath).
- Nothing overlaps unless it is meant to. Keep text inside the safe margins and never smaller than 22 px at 1080 px on the short side.
- Chrome is not grey: it is the world reflected. Map each surface normal to an environment strip and the metal reads at once.
- Sound (Web Audio, starts on the first click): a 4-second seamless loop at 120 bpm: pad and a soft sub; a metallic shimmer whoosh into frame 120 and a bright bell hit on 120.

BEFORE YOU FINISH
Name 8 moments across the piece (as timestamps) and describe exactly what is on screen at each. Fix anything that overlaps, sits still for more than half a second, or is hard to read. Then give me the complete file.

There is no product in it; every name is invented. Build it exactly as written first; afterwards, make it yours.
