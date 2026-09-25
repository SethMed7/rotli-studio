You are a world-class motion designer who works in code. Make "Sketch Explainer": 20 seconds of motion at 1920 × 1080, 30 fps, drawn in code.

WHAT TO BUILD
- One self-contained HTML file with a <canvas> of 1920 × 1080. Every frame is a pure function of time, draw(ctx, t) with t in seconds, carrying no state from frame to frame, so any moment renders on its own.
- A player: it autoplays muted on load; the first click turns the sound on, later clicks pause and play; ← and → step one frame at 30 fps; ?t=<seconds> opens paused on that moment.
- No libraries and no image files: every shape, letter and texture is drawn with Canvas 2D. Fonts: JetBrains Mono for labels; draw the headings as single-stroke capitals, loaded from Google Fonts; wait for them to load before the first frame.

THE LOOK
A blueprint: pale lines on deep blue, a fine grid, hand-drawn strokes that draw themselves on in the order a hand would make them, mono labels and one warm accent for the answer. The camera pans across one large drawing.
Palette: ground #0f2b4c, surface #143760, ink #eaf2ff, muted #8fb0d6, line #3d6a9e, accent #ffd166, accent2 #7fd1ff. Use these colours, blends between them, and the ink colour at low opacity for shadows; nothing else.

THE BEATS (90 bpm, a beat every 0.67 s: every change of state starts on a beat; follow-through may start on a half-beat). Words in quotes are the exact copy.
- 0–2.7 s · title draws itself: 'How a meeting finds its time' with an underline
- 2.7–6.7 s · three people are sketched (Ana, Ben, Kai), each with a lane
- 6.7–11.3 s · each lane fills with busy blocks (hatched) across Mon–Fri; the camera pans along the week
- 11.3–15.3 s · a vertical scan line sweeps; where all three lanes are free it leaves an accent box: Thu 3:00
- 15.3–18.7 s · the box lifts into an invite drawn in line: 'Thu 3:00–4:00 · Ana, Ben, Kai'; arrows to the three people, each gets a check
- 18.7–20 s · pull back to the whole sheet; stamp 'ORIEL · fictional · drawn in code'

SIZES
- landscape: 1920 × 1080.
- Add ?size=vertical for 1080 × 1920. Design that layout for its shape: the week runs top to bottom and the people stand across the top.

MOTION RULES
- Ease everything: ease-out for arrivals, ease-in for exits, a spring with a little overshoot for anything that lands. Ambient motion (a breath, a drift, a spin) may be a smooth repeating wave; nothing else moves linearly.
- Hook in the first second. No dead air: every hold keeps moving (a slow push-in, a drift, a breath).
- Nothing overlaps unless it is meant to. Keep text inside the safe margins and never smaller than 22 px at 1080 px on the short side.
- Drawing-on is its own motion language: stroke order is the story.
- Sound (Web Audio, starts on the first click): a soft loop at 90 bpm with pencil-scratch ticks as strokes draw, a hit when the answer box lands, and a sign-off with the stamp.

BEFORE YOU FINISH
Name 8 moments across the piece (as timestamps) and describe exactly what is on screen at each. Fix anything that overlaps, sits still for more than half a second, or is hard to read. Then give me the complete file.

The product in it is fictional ("Oriel"). Build it exactly as written first; afterwards, swap in your own name, colours and words.
