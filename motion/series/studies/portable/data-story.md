You are a world-class motion designer who works in code. Make "Data Story": 15 seconds of motion at 1920 × 1080, 30 fps, drawn in code.

WHAT TO BUILD
- One self-contained HTML file with a <canvas> of 1920 × 1080. Every frame is a pure function of time, draw(ctx, t) with t in seconds, carrying no state from frame to frame, so any moment renders on its own.
- A player: it autoplays muted on load; the first click turns the sound on, later clicks pause and play; ← and → step one frame at 30 fps; ?t=<seconds> opens paused on that moment.
- No libraries and no image files: every shape, letter and texture is drawn with Canvas 2D. Fonts: Inter (400, 600, 800 with tabular numbers) and JetBrains Mono, loaded from Google Fonts; wait for them to load before the first frame.

THE LOOK
A dark dashboard: a grid of rounded widgets on graphite, each animating its own data (a switch, a bar chart that re-sorts, a count-up percentage, a donut, a line chart that draws on, a live blob). Numbers roll like odometers. A coral accent for the headline figure and mint for good news. All data is invented and fixed, so every render is the same.
Palette: ground #101114, surface #1a1c21, ink #eceef2, muted #7d828c, line #2a2d34, accent #ff5a36, accent2 #3ddc97. Use these colours, blends between them, and the ink colour at low opacity for shadows; nothing else.

THE BEATS (120 bpm, a beat every 0.50 s: every change of state starts on a beat; follow-through may start on a half-beat). Words in quotes are the exact copy.
- 0–2 s · hook: the grid assembles, each widget springing in from its corner on a stagger; the big number reads 0%
- 2–5 s · 'Meetings found this week': the headline figure counts up to 92% while a bar chart of the weekdays rises
- 5–8 s · a switch turns on ('Auto-book'), the bars re-sort from most to least free, and the figure climbs to 98%
- 8–11 s · a line chart of 'hours saved' draws on with a dot riding its head; a donut fills to 3 of 4 teams
- 11–13 s · the camera pushes into the headline widget until 98% fills the frame
- 13–15 s · sign-off: 'Oriel' with 'hours given back' and the figure '14 h' in mint

SIZES
- landscape: 1920 × 1080.
- Add ?size=vertical for 1080 × 1920. Design that layout for its shape: stack the widgets in one column with the headline figure on top, larger.

MOTION RULES
- Ease everything: ease-out for arrivals, ease-in for exits, a spring with a little overshoot for anything that lands. Ambient motion (a breath, a drift, a spin) may be a smooth repeating wave; nothing else moves linearly.
- Hook in the first second. No dead air: every hold keeps moving (a slow push-in, a drift, a breath).
- Nothing overlaps unless it is meant to. Keep text inside the safe margins and never smaller than 22 px at 1080 px on the short side.
- Data motion is honest when numbers move with the shapes that show them: every figure tweens from the same clock as its chart.
- Sound (Web Audio, starts on the first click): a driving loop at 120 bpm with ticks as numbers roll, a hit on the switch and on the top figure, and a short sign-off.

BEFORE YOU FINISH
Name 8 moments across the piece (as timestamps) and describe exactly what is on screen at each. Fix anything that overlaps, sits still for more than half a second, or is hard to read. Then give me the complete file.

The product in it is fictional ("Oriel"). Build it exactly as written first; afterwards, swap in your own name, colours and words.
