You are a world-class motion designer who works in code. Make "Annotated UI": 23 seconds of motion at 1080 × 1920, 30 fps, drawn in code.

WHAT TO BUILD
- One self-contained HTML file with a <canvas> of 1080 × 1920. Every frame is a pure function of time, draw(ctx, t) with t in seconds, carrying no state from frame to frame, so any moment renders on its own.
- A player: it autoplays muted on load; the first click turns the sound on, later clicks pause and play; ← and → step one frame at 30 fps; ?t=<seconds> opens paused on that moment.
- No libraries and no image files: every shape, letter and texture is drawn with Canvas 2D. Fonts: Instrument Serif and Instrument Serif Italic for captions, Inter for labels, loaded from Google Fonts; wait for them to load before the first frame.

THE LOOK
Annotated product UI: crisp interface cards (an invite, a message thread, a settings panel) get marked up live with hand-drawn annotations: a wobbly red circle that draws itself around the problem, an arrow that swoops in, a highlighter swipe, a scribbled note. The camera pushes into each annotated detail. Captions are serif word stacks in mixed sizes, one key word in an accent italic, placed beside the action and arriving word by word.
Palette: ground #e8ebef, surface #ffffff, ink #16202a, muted #6d7985, line #d2d8df, accent #ff2e63, accent2 #08b6b3, deep #16202a. Use these colours, blends between them, and the ink colour at low opacity for shadows; nothing else.

THE BEATS (120 bpm, a beat every 0.50 s: every change of state starts on a beat; follow-through may start on a half-beat). Words in quotes are the exact copy.
- 0–2.5 s · hook: a calendar invite card slides in; a red hand-drawn circle loops around '3:00 AM'; caption 'Sent at 3 a.m.?'
- 2.5–7 s · zoom into the time zone line; a highlighter swipes 'UTC'; an arrow swoops to 'Ana is in Lisbon'
- 7–12 s · complaint bubbles stack up and scroll ('who moved it?', 'I can't make it', 'wrong time again'); caption 'Every team has one.'
- 12–17 s · the fix: the same invite rebuilds itself with 'Tue 10:00 · your time' for each person; ticks draw next to three names
- 17–20.5 s · the annotations change colour from red to teal and tidy into a clean checklist
- 20.5–23 s · sign-off: 'Oriel' with a hand-drawn underline; caption 'times that make sense to everyone'

SIZES
- vertical: 1080 × 1920.
- Add ?size=landscape for 1920 × 1080. Design that layout for its shape: show the invite on the left and the annotations and captions on the right.

MOTION RULES
- Ease everything: ease-out for arrivals, ease-in for exits, a spring with a little overshoot for anything that lands. Ambient motion (a breath, a drift, a spin) may be a smooth repeating wave; nothing else moves linearly.
- Hook in the first second. No dead air: every hold keeps moving (a slow push-in, a drift, a breath).
- Nothing overlaps unless it is meant to. Keep text inside the safe margins and never smaller than 22 px at 1080 px on the short side.
- Annotation turns a screenshot into an argument: draw the eye first (circle, arrow, highlight), then show the fix in the same frame.
- Sound (Web Audio, starts on the first click): a soft loop at 120 bpm with a marker squeak as each annotation draws, pops for bubbles, a hit on the fix and a short sign-off.

BEFORE YOU FINISH
Name 8 moments across the piece (as timestamps) and describe exactly what is on screen at each. Fix anything that overlaps, sits still for more than half a second, or is hard to read. Then give me the complete file.

The product in it is fictional ("Oriel"). Build it exactly as written first; afterwards, swap in your own name, colours and words.
