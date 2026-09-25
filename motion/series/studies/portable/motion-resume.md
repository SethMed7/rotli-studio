You are a world-class motion designer who works in code. Make "Motion Résumé": 15 seconds of motion at 1920 × 1080, 60 fps, drawn in code.

WHAT TO BUILD
- One self-contained HTML file with a <canvas> of 1920 × 1080. Every frame is a pure function of time, draw(ctx, t) with t in seconds, carrying no state from frame to frame, so any moment renders on its own.
- A player: it autoplays muted on load; the first click turns the sound on, later clicks pause and play; ← and → step one frame at 60 fps; ?t=<seconds> opens paused on that moment.
- No libraries and no image files: every shape, letter and texture is drawn with Canvas 2D. Fonts: Inter (800), Instrument Serif Italic, JetBrains Mono, loaded from Google Fonts; wait for them to load before the first frame.

THE LOOK
A dark ground with one accent colour, small mono labels in the corners (a title, the size, a running timecode, the section name) and a faint dot grid. Sans-serif for statements, a serif italic for feeling. Add motion blur by drawing each frame several times inside the shutter and averaging.
Palette: ground #0d0d10, surface #17171c, ink #f3efe8, muted #77746f, line #2b2b33, accent #ff4b2b, accent2 #ffb199. Use these colours, blends between them, and the ink colour at low opacity for shadows; nothing else.

THE BEATS (120 bpm, a beat every 0.50 s: every change of state starts on a beat; follow-through may start on a half-beat). Words in quotes are the exact copy.
- 0–1.5 s · hook: an accent dot lands with an overshoot and rings once, then slides to the start of a curve
- 1.5–3.5 s · easing: a cubic-bezier curve with live handles morphs linear → ease-out → overshoot; a dot rides it and a rail reads its value
- 3.5–6.5 s · type: motion (letters rise), timing (letters drop), feeling (serif italic scales in); every i is dotted with the accent; feeling folds into the dot
- 6.5–8.5 s · interface: the dot becomes a switch, the switch turns on and opens into a 'Render complete' toast with a drawn check
- 8.5–10.5 s · data: a velocity bell of 17 bars becomes a position curve; one bar carries the accent
- 10.5–12.5 s · space: an isometric block field with a wave and a ring of accent blocks, slow push-in
- 12.5–14 s · particles: a 3,200-point spiral tilts toward the camera and falls into one point
- 14–15 s · sign-off: the point becomes the full stop of the Oriel wordmark; 'Motion study 01 — designing the in-between'

SIZES
- landscape: 1920 × 1080.
- Add ?size=vertical for 1080 × 1920. Design that layout for its shape: the content scales up and each section is named large in the serif above the action.

MOTION RULES
- Ease everything: ease-out for arrivals, ease-in for exits, a spring with a little overshoot for anything that lands. Ambient motion (a breath, a drift, a spin) may be a smooth repeating wave; nothing else moves linearly.
- Hook in the first second. No dead air: every hold keeps moving (a slow push-in, a drift, a breath).
- Nothing overlaps unless it is meant to. Keep text inside the safe margins and never smaller than 22 px at 1080 px on the short side.
- A reel is a list of techniques joined by one object (the dot). Continuity beats variety: every section is born from the last one's final shape.
- Sound (Web Audio, starts on the first click): a four-chord minor loop at 120 bpm (pad, bass, plucked arpeggio, kick and hats from the type section), hits on the big cuts, rising noise into sections, soft ticks on the switch and the check, and a three-note bell sign-off under the lockup.

BEFORE YOU FINISH
Name 8 moments across the piece (as timestamps) and describe exactly what is on screen at each. Fix anything that overlaps, sits still for more than half a second, or is hard to read. Then give me the complete file.

The product in it is fictional ("Oriel"). Build it exactly as written first; afterwards, swap in your own name, colours and words.
