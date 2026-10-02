You are a world-class motion designer who works in code. Make "Fold": 4 seconds of motion at 1080 × 1080, 60 fps, drawn in code.

WHAT TO BUILD
- One self-contained HTML file with a <canvas> of 1080 × 1080. Every frame is a pure function of time, draw(ctx, t) with t in seconds, carrying no state from frame to frame, so any moment renders on its own.
- A player: it autoplays muted on load; the first click turns the sound on, later clicks pause and play; ← and → step one frame at 60 fps; ?t=<seconds> opens paused on that moment.
- No libraries and no image files: every shape, letter and texture is drawn with Canvas 2D. Fonts: no type, loaded from Google Fonts; wait for them to load before the first frame.

THE LOOK
Paper folding in flat-shaded 3D: a square sheet of red paper (accent, its back side s1) on a pale table folds itself into a classic paper dart (corners to the centre line, the new edges to the centre line again, in half, then the wings down along a crease from nose to tail, so the wings are long triangles and the plane reads as an arrow from every angle), lifts, glides a short arc, lands and unfolds back to the flat sheet by frame 240. Model the sheet as flat polygons (flaps) that each rotate about their crease line in 3D with a spring ease, projected with gentle perspective; shade each facet by its normal against one key light (lighter faces toward the light, s2 for faces turned away), draw crease lines as thin darker strokes that stay after a fold, and a soft contact shadow under the sheet that tightens as it lands. Keep the folds believable (no flap passes through another): order flaps back to front each frame. The glide peaks on the bar-2 downbeat.
Palette: ground #f2ede4, surface #ffffff, ink #23211e, muted #a39e94, line #e3dccf, accent #d9573b, accent2 #2f5d8a, deep #1a1917, s1 #f6c9b8, s2 #b8442b. Use these colours, blends between them, and the ink colour at low opacity for shadows; nothing else.

THE BEATS (120 bpm, a beat every 0.50 s: every change of state starts on a beat; follow-through may start on a half-beat). Words in quotes are the exact copy.
- 0–1.5 s · the flat red sheet folds itself in crisp creases into a plane
- 1.5–2.5 s · it lifts and glides, peaking on the bar-2 downbeat (hit on 120)
- 2.5–4 s · it lands softly and unfolds flat into the loop

SIZES
- square: 1080 × 1080.
- Add ?size=vertical for 1080 × 1920. Design that layout for its shape: square first; a vertical that redesigns the motif for the tall frame, never a crop.

MOTION RULES
- Ease everything: ease-out for arrivals, ease-in for exits, a spring with a little overshoot for anything that lands. Ambient motion (a breath, a drift, a spin) may be a smooth repeating wave; nothing else moves linearly.
- Hook in the first second. No dead air: every hold keeps moving (a slow push-in, a drift, a breath).
- Nothing overlaps unless it is meant to. Keep text inside the safe margins and never smaller than 22 px at 1080 px on the short side.
- Folding is rotation about a line: give every flap its crease axis and a spring, shade by the normal, and paper reads as paper.
- Sound (Web Audio, starts on the first click): a 4-second seamless loop at 120 bpm: paper-like crisp ticks on each fold (filtered noise, gentle), a soft whoosh for the glide, a warm hit on 120.

BEFORE YOU FINISH
Name 8 moments across the piece (as timestamps) and describe exactly what is on screen at each. Fix anything that overlaps, sits still for more than half a second, or is hard to read. Then give me the complete file.

There is no product in it; every name is invented. Build it exactly as written first; afterwards, make it yours.
