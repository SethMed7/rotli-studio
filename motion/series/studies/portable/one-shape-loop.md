You are a world-class motion designer who works in code. Make "One-Shape Loop": 8 seconds of motion at 1080 × 1080, 60 fps, a seamless loop, drawn in code.

WHAT TO BUILD
- One self-contained HTML file with a <canvas> of 1080 × 1080. Every frame is a pure function of time, draw(ctx, t) with t in seconds, carrying no state from frame to frame, so any moment renders on its own.
- A player: it autoplays muted on load; the first click turns the sound on, later clicks pause and play; ← and → step one frame at 60 fps; ?t=<seconds> opens paused on that moment.
- It loops: the last frame must flow into the first with no jump. End every animated value where it began, and give every repeating motion a period that divides the loop's length.
- No libraries and no image files: every shape, letter and texture is drawn with Canvas 2D. Fonts: Inter (600) and JetBrains Mono, loaded from Google Fonts; wait for them to load before the first frame.

THE LOOK
One rounded shape on a pale ground, an indigo accent, a soft floor shadow and a cursor. Every property of the shape (width, height, corner radius, colour, fill) is keyed on springs, and the last key equals the first so the loop closes.
Palette: ground #f3f1ee, surface #ffffff, ink #15151a, muted #8a8791, line #e2dfe8, accent #5146e5, accent2 #e5e2ff. Use these colours, blends between them, and the ink colour at low opacity for shadows; nothing else.

THE BEATS (120 bpm, a beat every 0.50 s: every change of state starts on a beat; follow-through may start on a half-beat). Words in quotes are the exact copy.
- 0–2 s · a 'Schedule' pill button breathes; a cursor glides in and presses it (scale dips, a ripple)
- 2–4 s · the pill collapses into a circle and becomes a spinner (an arc chasing itself)
- 4–5.5 s · the spinner closes into a solid circle and a check draws itself
- 5.5–7 s · the circle stretches into a card: 'Thu 3:00 · Booked' with a small calendar glyph
- 7–8 s · the card folds back into the pill; the cursor leaves: frame 479 flows into frame 0

SIZES
- square: 1080 × 1080.
- Add ?size=landscape for 1920 × 1080. Design that layout for its shape: the shape stays centred; the current state is named in small mono on the left and a four-dot state indicator sits on the right.

MOTION RULES
- Ease everything: ease-out for arrivals, ease-in for exits, a spring with a little overshoot for anything that lands. Ambient motion (a breath, a drift, a spin) may be a smooth repeating wave; nothing else moves linearly.
- Hook in the first second. No dead air: every hold keeps moving (a slow push-in, a drift, a breath).
- Nothing overlaps unless it is meant to. Keep text inside the safe margins and never smaller than 22 px at 1080 px on the short side.
- A loop is a closed path in state space: key every property on springs, end on the first key, and prove the seam.
- Sound (Web Audio, starts on the first click): a soft loop at 120 bpm whose tails wrap around the end, with ticks on the press and the check.

BEFORE YOU FINISH
Name 8 moments across the piece (as timestamps) and describe exactly what is on screen at each. Fix anything that overlaps, sits still for more than half a second, or is hard to read. Then give me the complete file.

The product in it is fictional ("Oriel"). Build it exactly as written first; afterwards, swap in your own name, colours and words.
