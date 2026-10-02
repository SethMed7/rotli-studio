You are a world-class motion designer who works in code. Make "Pop": 4 seconds of motion at 1080 × 1080, 60 fps, drawn in code.

WHAT TO BUILD
- One self-contained HTML file with a <canvas> of 1080 × 1080. Every frame is a pure function of time, draw(ctx, t) with t in seconds, carrying no state from frame to frame, so any moment renders on its own.
- A player: it autoplays muted on load; the first click turns the sound on, later clicks pause and play; ← and → step one frame at 60 fps; ?t=<seconds> opens paused on that moment.
- One library only: three.js 0.186.1 as an ES module from a CDN (an import map: "three" -> https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js, "three/addons/" -> https://cdn.jsdelivr.net/npm/three@0.186.1/examples/jsm/). No image, model or HDR files: every shape is built from three's primitives and lit by its procedural RoomEnvironment. Fonts: no type, loaded from Google Fonts; wait for them to load before the first frame.

THE LOOK
A tiny invented creature in the manner of a feature-animation short, built from three.js primitives: Pip, a rounded bean-shaped body that is also its head (satin accent skin, a cream belly), two big glossy eyes set wide and low with dark pupils and two catchlights each, blinking eyelids, soft brows, a small mouth, rosy cheeks, stubby feet, nub arms and a sprout on top that lags behind every move. It stands on a warm wooden tabletop before a softly blurred wall. A soap bubble (physical material: transmission, iridescence) drifts down. Pip lands a hop on 0 s, watches the bubble, crouches on 1 s, springs up and pops it with its sprout on 2 s (a ring of droplets, a flash on its face, mouth an 'o'), lands with a squash and a giggling double bounce, and hops again as a new bubble arrives so the loop closes. Soft warm key light with the only shadow, a cool fill, a warm rim light from behind; ACES tone mapping; a long lens at eye height. Every frame is a pure function of time: set every animated property from t each frame; no clocks, mixers or physics.
Palette: ground #f3e3cf, surface #fff8ef, ink #2e2420, muted #a8968a, line #e8d6c0, accent #f2935f, accent2 #86c8ec, deep #33241d, s1 #ff9e9a, s2 #c88a5c. Use these colours, blends between them, and the ink colour at low opacity for shadows; nothing else.

THE BEATS (120 bpm, a beat every 0.50 s: every change of state starts on a beat; follow-through may start on a half-beat). Words in quotes are the exact copy.
- 0–1 s · Pip lands a little hop, spots a soap bubble drifting down, and its eyes lead its head up to watch it
- 1–2 s · it crouches in anticipation on beat 3, then springs up and boops the bubble with its sprout: the bubble pops on 120 (hit)
- 2–4 s · it lands with a squash and a giggling double bounce; a new bubble floats down and Pip hops again to land on the loop

SIZES
- square: 1080 × 1080.
- Add ?size=vertical for 1080 × 1920. Design that layout for its shape: square first; a vertical that redesigns the shot for the tall frame (a lower camera looking up at the jump), never a crop.

MOTION RULES
- Ease everything: ease-out for arrivals, ease-in for exits, a spring with a little overshoot for anything that lands. Ambient motion (a breath, a drift, a spin) may be a smooth repeating wave; nothing else moves linearly.
- Hook in the first second. No dead air: every hold keeps moving (a slow push-in, a drift, a breath).
- Nothing overlaps unless it is meant to. Keep text inside the safe margins and never smaller than 22 px at 1080 px on the short side.
- A character is a few primitives and a lot of timing: squash and stretch that keeps its volume, eyes that lead the head, anticipation before every move, and a soft key, fill and rim to make it feel touchable.
- Sound (Web Audio, starts on the first click): a 4-second seamless loop at 120 bpm: a soft rubbery boing for each hop, a faint glassy shimmer for the bubble, a bright wet pop on 2 s and a tiny giggle after the landing.

BEFORE YOU FINISH
Name 8 moments across the piece (as timestamps) and describe exactly what is on screen at each. Fix anything that overlaps, sits still for more than half a second, or is hard to read. Then give me the complete file.

There is no product in it; every name is invented. Build it exactly as written first; afterwards, make it yours.
