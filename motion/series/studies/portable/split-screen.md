You are a world-class motion designer who works in code. Make "Before / After": 22 seconds of motion at 1080 × 1920, 30 fps, drawn in code.

WHAT TO BUILD
- One self-contained HTML file with a <canvas> of 1080 × 1920. Every frame is a pure function of time, draw(ctx, t) with t in seconds, carrying no state from frame to frame, so any moment renders on its own.
- A player: it autoplays muted on load; the first click turns the sound on, later clicks pause and play; ← and → step one frame at 30 fps; ?t=<seconds> opens paused on that moment.
- No libraries and no image files: every shape, letter and texture is drawn with Canvas 2D. Fonts: Instrument Serif and Instrument Serif Italic for captions, Inter for labels, loaded from Google Fonts; wait for them to load before the first frame.

THE LOOK
Split screen: the same scene shown twice, BEFORE (cluttered, off-kilter, a warm alarm colour) and AFTER (calm, aligned, a cool colour), divided by a line that wipes, tilts and finally sweeps all the way across so AFTER takes the whole frame. The same objects exist on both sides, so the change is obvious. Captions are serif word stacks in mixed sizes, one key word in an accent italic, placed beside the action and arriving word by word.
Palette: ground #fff3d1, surface #fffaf0, ink #1d1d1b, muted #7a7466, line #ecdcae, accent #0047ff, accent2 #ff7a1a, deep #1d1d1b. Use these colours, blends between them, and the ink colour at low opacity for shadows; nothing else.

THE BEATS (120 bpm, a beat every 0.50 s: every change of state starts on a beat; follow-through may start on a half-beat). Words in quotes are the exact copy.
- 0–2 s · hook: a vertical divider draws down the middle; labels 'Before' and 'After' pop in
- 2–7 s · BEFORE: a desk with a messy week, 9 meeting blocks overlapping; AFTER: the same week with 4 blocks and 2 focus blocks
- 7–11.5 s · the divider slides left and right like a comparison slider, revealing each side in turn
- 11.5–16 s · BEFORE: an inbox with 31 threads; AFTER: one card 'Thu 15:00 booked'
- 16–20 s · the divider sweeps fully across; AFTER takes the frame; everything settles into place with a spring
- 20–22 s · sign-off: 'Oriel' with the caption 'same week, calmer'

SIZES
- vertical: 1080 × 1920.
- Add ?size=landscape for 1920 × 1080. Design that layout for its shape: split top and bottom instead of left and right (the divider is horizontal).

MOTION RULES
- Ease everything: ease-out for arrivals, ease-in for exits, a spring with a little overshoot for anything that lands. Ambient motion (a breath, a drift, a spin) may be a smooth repeating wave; nothing else moves linearly.
- Hook in the first second. No dead air: every hold keeps moving (a slow push-in, a drift, a breath).
- Nothing overlaps unless it is meant to. Keep text inside the safe margins and never smaller than 22 px at 1080 px on the short side.
- A before/after works when both sides share objects: the eye compares the same thing in two states.
- Sound (Web Audio, starts on the first click): a soft loop at 120 bpm with a slide sound on each divider move, a hit on the full sweep and a short sign-off.

BEFORE YOU FINISH
Name 8 moments across the piece (as timestamps) and describe exactly what is on screen at each. Fix anything that overlaps, sits still for more than half a second, or is hard to read. Then give me the complete file.

The product in it is fictional ("Oriel"). Build it exactly as written first; afterwards, swap in your own name, colours and words.
